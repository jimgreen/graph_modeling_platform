// /webgrp/v1/receive —— 联调用的接收端：接收「发送模型」等 POST 过来的请求，
// 解析 multipart/form-data（也接受其它 content-type），把最近一次的摘要留在内存。
// 用途：在 /swigger 里把「发送模型」的目标 URL 指向本端点，即可自测整条发送链路。
// 只读内存、不落盘、不鉴权：仅用于本地联调，记录随进程重启清空。
import iconv from "iconv-lite";
import { sendV1Json, sendV1JsonNoStore, sendV1Error } from "./v1Response.mjs";
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

function decodePreview(bytes, contentTypeText) {
  const slice = bytes.subarray(0, PREVIEW_BYTES);
  return charsetOf(contentTypeText) === "gbk" ? iconv.decode(slice, "gbk") : slice.toString("utf-8");
}

// 收原始字节并限长（Content-Length 不参与判断，直接按实际读取量截断）
async function readRawBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_RECEIVE_BYTES) {
      throw Object.assign(new Error(`请求体超过接收上限 ${MAX_RECEIVE_BYTES} 字节。`), { code: "payload-too-large" });
    }
    chunks.push(chunk);
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
    if (error?.code === "payload-too-large") {
      sendV1Error(response, "payload-too-large", error.message);
      return;
    }
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
