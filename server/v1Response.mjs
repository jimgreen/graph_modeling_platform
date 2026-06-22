// v1 第三方接口专用响应函数：信封格式 {ok,data} / {ok:false,error:{code,message}}
// 不碰旧 /api 的 sendJson，避免前端回归。

import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const gzipAsync = promisify(gzip);
const GZIP_MIN_BYTES = 1024;

const accessControlHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type"
};

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
  const acceptsGzip = /\bgzip\b/iu.test(String(request.headers["accept-encoding"] ?? ""));
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
  const status = statusOverride ?? httpStatusForError(code);
  const body = { ok: false, error: { code, message } };
  response.writeHead(status, v1NoStoreJsonHeaders);
  response.end(JSON.stringify(body));
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
