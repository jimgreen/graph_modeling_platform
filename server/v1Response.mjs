// v1 第三方接口专用响应函数：信封格式 {ok,data} / {ok:false,error:{code,message}}
// 不碰旧 /api 的 sendJson，避免前端回归。

import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { accessControlHeaders } from "./cors.mjs";

const gzipAsync = promisify(gzip);
const GZIP_MIN_BYTES = 1024;

// v1 成功响应头：no-cache 允许客户端缓存但须重新校验，命中 304。
const v1CacheableJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-cache",
  ...accessControlHeaders
};

// v1 运行时态响应头：实时数据不缓存。
const v1NoStoreJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...accessControlHeaders
};

// v1 错误码 → HTTP 状态映射
const errorCodeStatus = {
  "bad-request": 400,
  "payload-too-large": 413,
  "not-found": 404,
  "no-online-client": 503,
  "no-active-model": 404,
  "no-selection": 404,
  "ws-timeout": 503,
  "internal": 500
};

function httpStatusForError(code) {
  return errorCodeStatus[code] ?? 500;
}

// Accept-Encoding 里 gzip 的 q 权重。缺省等价 q=1；无法解析按 0（不支持）处理。
function gzipQualityFromParams(params) {
  for (const param of params) {
    const eq = param.indexOf("=");
    if (eq < 0) continue;
    if (param.slice(0, eq).trim().toLowerCase() !== "q") continue;
    const q = Number.parseFloat(param.slice(eq + 1).trim());
    return Number.isFinite(q) ? q : 0;
  }
  return 1;
}

/**
 * 客户端是否接受 gzip 响应。
 *
 * **此前这里是 `/\bgzip\b/iu.test(...)`，把 `;q=` 整个丢掉**，于是
 * `Accept-Encoding: gzip;q=0`（RFC 9110 里明确表示「不接受 gzip」）照样被压缩，
 * 客户端拿到解不开的字节流。
 *
 * 只改这一条判定，其余语义（阈值、`x-gzip` 别名、`Vary`、ETag/304）保持原样：
 * - 按逗号分段，逐段取首个 token 精确匹配 `gzip` / `x-gzip`（不靠子串命中，
 *   `gzip2` 这类仍不算）；
 * - `q > 0` 即接受（`q=0.001` 也压缩）；
 * - 头里重复出现 gzip 时，任一段 q>0 即接受。
 */
function acceptsGzipEncoding(headerValue) {
  for (const part of String(headerValue ?? "").split(",")) {
    const segments = part.split(";");
    if (!/^(?:x-)?gzip$/i.test(segments[0].trim())) continue;
    if (gzipQualityFromParams(segments.slice(1)) > 0) return true;
  }
  return false;
}

function prepareV1Payload(data, noStore) {
  const body = { ok: true, data };
  const raw = Buffer.from(JSON.stringify(body), "utf-8");
  const etag = `"${createHash("sha1").update(raw).digest("base64")}"`;
  return { raw, etag, noStore };
}

async function sendPreparedV1(request, response, prepared) {
  // noStore 响应不参与 304/ETag 校验
  if (prepared.noStore) {
    response.writeHead(200, v1NoStoreJsonHeaders);
    response.end(prepared.raw);
    return;
  }
  const ifNoneMatch = request.headers["if-none-match"];
  if (ifNoneMatch && ifNoneMatch === prepared.etag) {
    response.writeHead(304, { ...v1CacheableJsonHeaders, etag: prepared.etag });
    response.end();
    return;
  }
  const acceptsGzip = acceptsGzipEncoding(request.headers["accept-encoding"]);
  if (acceptsGzip && prepared.raw.length >= GZIP_MIN_BYTES) {
    if (!prepared.gzip) {
      prepared.gzip = await gzipAsync(prepared.raw);
    }
    response.writeHead(200, {
      ...v1CacheableJsonHeaders,
      etag: prepared.etag,
      "content-encoding": "gzip",
      vary: "Accept-Encoding",
      "content-length": prepared.gzip.length
    });
    response.end(prepared.gzip);
    return;
  }
  response.writeHead(200, { ...v1CacheableJsonHeaders, etag: prepared.etag, "content-length": prepared.raw.length });
  response.end(prepared.raw);
}

// 发送 v1 成功响应（可缓存：gzip + ETag/304）
export async function sendV1Json(request, response, data) {
  await sendPreparedV1(request, response, prepareV1Payload(data, false));
}

// 发送 v1 成功响应（运行时态：no-store，不缓存）
export async function sendV1JsonNoStore(response, data) {
  const prepared = prepareV1Payload(data, true);
  response.writeHead(200, v1NoStoreJsonHeaders);
  response.end(prepared.raw);
}

// 发送 v1 错误响应
export function sendV1Error(response, code, message, statusOverride) {
  // 审查 B-P0-3/B-P1-5：headers 已发出（如成功路径 writeHead 后再抛错）时无法再写错误头，
  // 二次 writeHead 会抛 "Cannot set headers after they are sent" 导致 unhandled rejection 崩进程。
  if (response.headersSent) {
    console.error("[v1] 响应头已发送，放弃错误响应:", code, message);
    return;
  }
  const status = statusOverride ?? httpStatusForError(code);
  const body = { ok: false, error: { code, message } };
  response.writeHead(status, v1NoStoreJsonHeaders);
  response.end(JSON.stringify(body));
}

/**
 * 读请求体时的「体积超限」分支 —— **全仓唯一一份**。
 *
 * 此前 13 个调用点各抄一份**逐字节相同**的三行：
 *
 *   if (error?.code === "payload-too-large") {
 *     sendV1Error(response, "payload-too-large", error.message);
 *     return;
 *   }
 *
 * 抽出来的理由：这一分支**必须**在所有端点一致（413 + 上游给的原始 message），
 * 漏改一处就会出现「同一个超限错误在不同端点返回不同状态码」。
 *
 * **为什么只抽这一段、不抽 bad-request 分支**：那半段各文件文案**故意不同** ——
 * apiV1Control 用「请求体须为合法 JSON。」、apiV1Receive 用
 * `error.message : "请求体解析失败。"`、sendModel / eFileExport / apiV1Runtime
 * 用「请求体不是合法 JSON。」并额外区分 `SyntaxError`。合并它们属行为变更。
 *
 * 返回 true 表示「已应答，调用点应立即 return」：
 *
 *   } catch (error) {
 *     if (sendV1PayloadTooLarge(response, error)) return;
 *     …各文件自己的 bad-request 分支…
 *   }
 */
export function sendV1PayloadTooLarge(response, error) {
  if (error?.code !== "payload-too-large") return false;
  sendV1Error(response, "payload-too-large", error.message);
  return true;
}

// 旧 /api 结果包装入 v1 信封（复用旧 handler 产出时用）
export async function sendV1Wrapped(request, response, produce, { noStore = false } = {}) {
  try {
    const data = await produce();
    if (noStore) {
      await sendV1JsonNoStore(response, data);
    } else {
      await sendV1Json(request, response, data);
    }
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
