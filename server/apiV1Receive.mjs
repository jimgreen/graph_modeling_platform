// /webgrp/v1/receive —— 联调用的接收端：接收「发送模型」等 POST 过来的请求，
// 解析 multipart/form-data（也接受其它 content-type），把最近一次的摘要留在内存。
// 用途：在 /swigger 里把「发送模型」的目标 URL 指向本端点，即可自测整条发送链路。
// 只读内存、不落盘、不鉴权：仅用于本地联调，记录随进程重启清空。
import iconv from "iconv-lite";
import { sendV1Json, sendV1JsonNoStore, sendV1Error, sendV1PayloadTooLarge } from "./v1Response.mjs";
import { apiPattern } from "./config.mjs";

// 内存保留最近 N 次接收（最新在末尾）
const MAX_RECORDS = 5;
// 单次接收上限：超过直接截断报错，避免大文件全读进内存
const MAX_RECEIVE_BYTES = 32 * 1024 * 1024;
// 文本字段与文件内容回显上限
const PREVIEW_BYTES = 512;
const TEXT_FIELD_PREVIEW_CHARS = 200;

const records = [];

// 从 content-type 的 charset 参数取编码名（缺省按 utf-8 处理）
function charsetOf(contentTypeText) {
  const matched = /charset\s*=\s*"?([^";]+)"?/iu.exec(String(contentTypeText ?? ""));
  const name = matched?.[1]?.trim().toLowerCase() ?? "";
  if (name === "gbk" || name === "gb2312" || name === "gb18030") {
    return "gbk";
  }
  return "utf-8";
}

// 按字节上限截断后，把截点回退到**合法字符边界**，否则尾巴上会挂半个多字节字符。
//
// 为什么必须回退：`.toString("utf-8")` 遇到残缺序列会吐 U+FFFD，而 iconv 解 GBK 会
// 吐替换字形 —— 回显里凭空多出一个乱码字符，联调者会误判成「对端发错了字节」，
// 而这恰是本端点唯一要避免的事（回显必须如实）。
//
// 为什么回退发生在**解码之前**（而不是解完再洗文本）：解完再洗就只能删 U+FFFD 之类的
// 替换字形，而 GBK 残缺尾字节可能被解成「恰好合法的另一个字」（0xD6 后接 0x00 会成
// 「中」），删字符救不回来。回退只动字节，不动解码路径。
//
// 与 sendModel.mjs 的 `trimIncompleteUtf8Tail` 是同一份实现（刻意各写一份，见该文件
// 同名函数的注释：不能放第三个文件，也不宜让一个端点 import 另一个端点）。
function trimIncompleteUtf8Tail(bytes) {
  const end = bytes.length;
  // 最长字符 4 字节 ⇒ 末尾至多 4 字节可能是被切一半的那个字符（含它的前导字节）。
  const window = Math.min(4, end);
  let index = end - 1;
  // 续字节形如 0b10xxxxxx（& 0xC0 === 0x80）：向前跳过，直到前导字节。
  while (index >= end - window && (bytes[index] & 0xc0) === 0x80) {
    index -= 1;
  }
  if (index < end - window) {
    // 窗口内全是续字节：这段字节开头就没有前导字节，无合法前缀可保，整段丢弃。
    return 0;
  }
  // 由前导位推出该字符的总字节数：0xF0-0xF7 → 4，0xE0-0xEF → 3，0xC0-0xDF → 2，其余 1。
  const lead = bytes[index];
  const need = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1;
  // 字符装不下（末尾只剩残缺字节）⇒ 从它的前导字节起整段丢弃；装得下 ⇒ 一个字节都不动。
  return index + need > end ? index : end;
}

// GBK 版的同一件事：单字节区（0x00-0x7F、0x80）不存在「半个」，双字节字符是
// 0x81-0xFE 前导 + 下一个字节作续字节。所以截点切在两者之间时，末尾只会剩一个
// **没有续字节的前导字节**，丢掉那 1 字节即可（GBK 字符上限 2 字节，回退恒 ≤1 字节）。
//
// 必须**从前导字节起正向走双字节奇偶**，不能只看「末字节是否落在前导区间」：
// GBK 续字节本身就是 0x40-0x7E / 0x80-0xFE，「中」= D6 D0，其续字节 0xD0 同样
// 落在前导区间内 —— 只看末字节会把「恰好 512 字节、末字符完整」的那次截断也砍掉，
// 即回退过头。反向看不出 0xD0 是前导还是续，只能正向数奇偶。
//
// 前置条件：bytes 必须从字符边界开始（调用点传的是 `subarray(0, PREVIEW_BYTES)`，
// 即字节 0 起，故恒满足）。若字节流本身就错位，奇偶也会跟着错位，但那种数据
// 解出来本就是乱码，不靠这里兜。
function trimIncompleteGbkTail(bytes) {
  let index = 0;
  while (index < bytes.length) {
    const byte = bytes[index];
    if (byte >= 0x81 && byte <= 0xfe) {
      index += 2;
      continue;
    }
    index += 1;
  }
  // index 越过末尾 ⇒ 末尾那 1 字节是没有续字节的前导字节（半个字符），丢掉它
  return index > bytes.length ? bytes.length - 1 : bytes.length;
}

function decodePreview(bytes, contentTypeText) {
  const slice = bytes.subarray(0, PREVIEW_BYTES);
  return charsetOf(contentTypeText) === "gbk"
    ? iconv.decode(slice.subarray(0, trimIncompleteGbkTail(slice)), "gbk")
    : slice.subarray(0, trimIncompleteUtf8Tail(slice)).toString("utf-8");
}

// 收原始字节并限长（Content-Length 不参与判断，直接按实际读取量截断）
//
// 超限时读完整个流但不再累积 —— 提前中断会让 Node 在响应写出前重置连接，
// 客户端只见 ECONNRESET 而非 413（详见 server.mjs 的 PayloadTooLargeError 注释）。
async function readRawBody(request) {
  const chunks = [];
  let total = 0;
  let oversize = false;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_RECEIVE_BYTES) {
      oversize = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (oversize) {
    throw Object.assign(new Error(`请求体超过接收上限 ${MAX_RECEIVE_BYTES} 字节。`), {
      code: "payload-too-large"
    });
  }
  return Buffer.concat(chunks);
}

// multipart 与普通 body 统一归一成 fields 列表
async function describeFields(raw, contentTypeText) {
  if (/multipart\/form-data/iu.test(contentTypeText)) {
    const form = await new Response(raw, { headers: { "content-type": contentTypeText } }).formData();
    const fields = [];
    for (const [name, value] of form.entries()) {
      if (typeof value === "string") {
        fields.push({ name, kind: "text", bytes: Buffer.byteLength(value, "utf-8"), text: value.slice(0, TEXT_FIELD_PREVIEW_CHARS) });
        continue;
      }
      const bytes = Buffer.from(await value.arrayBuffer());
      fields.push({
        name,
        kind: "file",
        filename: value.name,
        contentType: value.type,
        bytes: bytes.length,
        preview: decodePreview(bytes, value.type)
      });
    }
    return fields;
  }
  const text = decodePreview(raw, contentTypeText);
  return text ? [{ name: "(raw)", kind: "raw", bytes: raw.length, text: text.slice(0, TEXT_FIELD_PREVIEW_CHARS) }] : [];
}

// POST /webgrp/v1/receive —— 收下一次转发（发送模型的目标 URL 可指向这里），回摘要
export async function handleV1ReceivePost({ request, response, url }) {
  try {
    const contentType = String(request.headers["content-type"] ?? "");
    const raw = await readRawBody(request);
    const fields = await describeFields(raw, contentType);
    const record = {
      receivedAt: new Date().toISOString(),
      method: request.method,
      path: url.pathname + url.search,
      contentType,
      totalBytes: raw.length,
      fields
    };
    records.push(record);
    if (records.length > MAX_RECORDS) {
      records.splice(0, records.length - MAX_RECORDS);
    }
    // 接收摘要随接收即返回，调用方可直接看到解析结果
    sendV1JsonNoStore(response, { received: record, kept: records.length });
  } catch (error) {
    if (sendV1PayloadTooLarge(response, error)) return;
    sendV1Error(response, "bad-request", error instanceof Error ? error.message : "请求体解析失败。");
  }
}

// GET /webgrp/v1/receive —— 回看最近一次（无记录时 latest 为 null）
export async function handleV1ReceiveGet({ request, response }) {
  await sendV1Json(request, response, {
    latest: records.at(-1) ?? null,
    count: records.length,
    receivedAtList: records.map((item) => item.receivedAt)
  });
}

// DELETE /webgrp/v1/receive —— 清空已存记录（便于重复联调）
export async function handleV1ReceiveDelete({ request, response }) {
  const cleared = records.length;
  records.length = 0;
  await sendV1Json(request, response, { cleared });
}

// v1 接收域路由表：{ method, pattern, handle }
export const v1ReceiveRoutes = [
  { method: "POST", pattern: apiPattern("/v1/receive", "/?$"), handle: handleV1ReceivePost },
  { method: "GET", pattern: apiPattern("/v1/receive", "/?$"), handle: handleV1ReceiveGet },
  { method: "DELETE", pattern: apiPattern("/v1/receive", "/?$"), handle: handleV1ReceiveDelete }
];
