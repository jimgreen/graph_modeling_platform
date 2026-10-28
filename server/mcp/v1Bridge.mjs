// MCP → v1 handler 的桥。
//
// ## 为什么要有这一层
//
// MCP 工具**不重发 HTTP**，而是直接调用 server/apiV1*.mjs 里已导出的 handler。
// 于是空间隔离、参数校验、错误码映射、WS 客户端选择全部沿用 v1 的同一份实现，
// MCP 侧只做「参数翻译 + 信封搬运」。
//
// 但 v1 handler 的签名是 Node 原生 HTTP 形状（`({request, response, url, paths})`），
// 直接调用需要三样东西：
//   1. 一个**可异步迭代**的 request（body 以 chunk 形式被 for await 读走）；
//   2. 一个**记录 writeHead/end** 的假 response；
//   3. 一个 URL（handler 只读 searchParams）。
//
// 本文件提供这三样，并把结果折成 MCP 侧好用的形状。
//
// ## 为什么不直接复用 server/handlerTestHarness.mjs
//
// 那份是**测试**基建（文件名不带 .test.，但语义是 fixture）：它的 fakeRequest
// 固定 method=POST、fakeUrl 固定 base 路径，且 fakeResponse 不保留原始字节。
// MCP 侧需要的是「保留原始字节 + 保留 content-type + 保留 status」的**生产**件
// —— 二进制导出（ZIP / PNG / E 文件）的类型判定全靠 content-type 与字节，
// 用测试 fixture 承载生产逻辑会让测试与生产互相污染。故此处另起一份，
// 两边各自单一职责：harness 服务断言，本桥服务运行时。
import { Readable } from "node:stream";
import { apiPath } from "../config.mjs";

/**
 * 记录型 response —— 只实现 v1 handler 用到的三个成员。
 *
 * `headersSent` 必须真实：v1 的 sendV1Error 靠它决定「还能不能写错误响应」
 * （头已发出时二次 writeHead 会抛 "Cannot set headers after they are sent"）。
 */
export function createCaptureResponse() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    headersSent: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers ?? {};
      this.headersSent = true;
      return this;
    },
    end(body) {
      this.body = body === undefined || body === null ? null : body;
      this.headersSent = true;
      return this;
    }
  };
}

/**
 * 构造可异步迭代的假 request。
 *
 * @param {object} options
 * @param {string} [options.method="GET"]
 * @param {string|Buffer|Uint8Array|object} [options.body] 对象按 JSON 序列化
 * @param {Record<string,string>} [options.headers]
 */
export function createBridgeRequest({ method = "GET", body, headers = {} } = {}) {
  const chunks = [];
  if (body !== undefined && body !== null) {
    let buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (ArrayBuffer.isView(body)) {
      buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof body === "string") {
      buffer = Buffer.from(body, "utf-8");
    } else {
      buffer = Buffer.from(JSON.stringify(body), "utf-8");
    }
    chunks.push(buffer);
  }
  const stream = Readable.from(chunks);
  // 刻意**不带** accept-encoding 与 if-none-match：
  //   - 带 accept-encoding:gzip → sendV1Json 走 gzip 分支，捕获到的 body 是压缩字节，
  //     解析信封会失败（且这个失败只在 body ≥1KB 时出现 —— 小响应不压缩，更难查）；
  //   - 带 if-none-match → 可能命中 304 空 body。
  // 两者都由调用方显式传入时也会被剔除：捕获必须是**确定的明文**。
  const finalHeaders = { "content-type": "application/json", ...headers };
  delete finalHeaders["accept-encoding"];
  delete finalHeaders["if-none-match"];
  stream.headers = finalHeaders;
  stream.method = method;
  return stream;
}

/**
 * 构造 handler 用的 URL。
 *
 * ## query 值的口径：**已解码形态**
 *
 * 传入的每个值都应当是「`url.searchParams.get(key)` 会返回的那个形态」，
 * 由本函数在写进 URL 时补上百分号编码。
 *
 * 为什么不反过来（传原始 URL 形态、由本函数原样拼接）？那样每个调用方都得自己
 * 判断「这个值到底编没编过」，而两种形态混在一起时**症状是静默的**：多编一层
 * → v1 收到 `["%E6%96%B9..."]` 这样的字符串 → JSON.parse 失败 → 400「缺少或非法
 * schemePath」。错误信息完全指不到真正的原因（多编了一层）。
 *
 * 对 schemePath 而言，「已解码形态」就是 JSON 数组文本 `["方案A"]`：
 * `URLSearchParams` 对它施加的百分号编码与 `encodeSchemePath()`
 * （= `encodeURIComponent(JSON.stringify(parts))`）产出的**同形** ——
 * 于是桥这一侧不必再引入第二套编码规则，也不会出现双重编码。
 *
 * ⚠ 因此调用方**不要**先 `encodeSchemePath()` 再传给本函数：那是「已编码形态」，
 *   会被再编一层，v1 侧 `JSON.parse` 拿到 `["%E6%96%B9..."]` 而失败（400）。
 *   正确写法：传 `JSON.stringify(parts)`。
 *
 * @param {string} path v1 路径（如 "/v1/schemes/models"），已带 apiPrefix 的原样使用
 * @param {Record<string, string|number|boolean|Array<string|number|boolean>|null|undefined>} [query]
 */
export function buildBridgeUrl(path, query = {}) {
  const raw = String(path ?? "");
  const withPrefix = raw.startsWith(apiPath("")) ? raw : apiPath(raw);
  const url = new URL(withPrefix, "http://127.0.0.1");
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) {
          continue;
        }
        url.searchParams.append(key, String(item));
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url;
}

/**
 * 调用一个 v1 handler，捕获它的响应。
 *
 * @param {Function} handler v1 handler（`({request,response,url,paths}, ctx, pathTab)`）
 * @param {object} options
 * @param {string} [options.method="GET"]
 * @param {string} [options.path] v1 路径
 * @param {object} [options.query]
 * @param {*} [options.body]
 * @param {object} [options.headers]
 * @param {object} [options.paths] 空间路径集合（派发层注入）
 * @param {string} [options.spaceId]
 * @param {object} [options.ctx] runtime/control 域的会话上下文（须已绑定 spaceId）
 * @param {string} [options.pathTab] runtime tab（model|tree|graph）
 * @returns {Promise<{status:number, headers:object, body:*}>}
 */
export async function invokeV1Handler(handler, options = {}) {
  const {
    method = "GET",
    path = "/",
    query = {},
    body,
    headers = {},
    paths,
    spaceId,
    ctx,
    pathTab
  } = options;

  const url = buildBridgeUrl(path, query);
  const request = createBridgeRequest({ method, body, headers });
  const response = createCaptureResponse();
  const route = { request, response, url, paths, spaceId };
  try {
    await handler(route, ctx, pathTab);
  } catch (error) {
    // handler 自己已 try/catch 的走不到这里；漏网的（接线 bug、导入异常）在此兜底，
    // 折成与 v1 错误信封同构的 body，让上层只有一条解析路径。
    const message = error instanceof Error ? error.message : "后端处理失败。";
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: { code: "internal", message } }));
  }
  return {
    status: response.statusCode ?? 200,
    headers: response.headers ?? {},
    body: response.body
  };
}

/**
 * 把捕获到的响应折成 v1 信封。
 *
 * @param {{status:number, headers:object, body:*}} result
 * @returns {{ok:boolean, data?:unknown, error?:{code:string,message:string}, contentType:string, bytes:Buffer, isJson:boolean}}
 */
export function parseV1Envelope(result) {
  const status = Number.isInteger(result?.status) ? result.status : 200;
  const headers = result?.headers ?? {};
  const contentType = String(headers["content-type"] ?? "");
  const bytes = toBuffer(result?.body);
  const isJson = contentType.includes("application/json");

  if (isJson) {
    const text = bytes.toString("utf-8");
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        error: { code: "internal", message: "后端返回了非预期的响应内容。" },
        contentType,
        bytes,
        isJson
      };
    }
    if (payload.ok === false) {
      return {
        ok: false,
        error: {
          code: payload?.error?.code ?? "internal",
          message: payload?.error?.message ?? "后端处理失败。"
        },
        contentType,
        bytes,
        isJson
      };
    }
    if (status >= 400) {
      return {
        ok: false,
        error: { code: "internal", message: `后端返回 HTTP ${status}。` },
        contentType,
        bytes,
        isJson
      };
    }
    return { ok: true, data: payload.data, contentType, bytes, isJson };
  }

  // 非 JSON：二进制（ZIP / PNG）或文本（SVG / E 文件 / CIM XML）
  if (status >= 400) {
    return {
      ok: false,
      error: { code: "internal", message: `后端返回 HTTP ${status}：${bytes.toString("utf-8").slice(0, 200)}` },
      contentType,
      bytes,
      isJson
    };
  }
  return { ok: true, data: undefined, contentType, bytes, isJson: false };
}

function toBuffer(body) {
  if (body === undefined || body === null) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  return Buffer.from(String(body), "utf-8");
}

// v1 错误码 → 「下一步做什么」的可执行建议。
// 目的：MCP 客户端（多为 LLM）拿到错误后能自己纠正，而不是把 HTTP 码原样复述给用户。
const ERROR_HINTS = {
  "no-online-client": "请先在浏览器打开本平台并保持页面在线（运行时态与写操作都需前端在线），再重试。",
  "token-required": "本空间有多个在线页面：请把目标页面地址栏里的 ?token= 的值作为 token 参数传给工具；或先关掉多余的页面。",
  "ws-timeout": "前端未在超时内响应，请确认页面未卡死后重试。",
  "no-active-model": "当前前端没有打开的模型，请先打开一个模型再重试。",
  "no-selection": "当前没有选中任何图元，请先在画布上选中目标再重试。",
  "not-found": "目标不存在，请先调用列表类工具确认方案/模型/空间的名称。",
  "bad-request": "参数不合法，请按工具描述修正参数后重试。",
  "payload-too-large": "内容过大，请缩小后重试。",
  "internal": "后端处理失败，请查看后端日志定位。"
};

/**
 * 错误码 → 可执行建议（无对应时返回空串）。
 * @param {string} code
 * @returns {string}
 */
export function errorHint(code) {
  return Object.hasOwn(ERROR_HINTS, code) ? ERROR_HINTS[code] : "";
}
