// handler 级测试的共用基建。
//
// ## 为什么需要它
//
// v1 handler 的签名是 `({ request, url, response }, ctx)` —— 纯函数式，没有框架依赖。
// 但要直呼仍需三样东西：
//   1. 一个**可异步迭代**的 request（body 以 chunk 形式被 for await 读走）；
//   2. 一个**记录 writeHead/end** 的假 response；
//   3. 一个记录 `sendCommandToClient` / `fetchFromClient` 调用参数的假 ctx。
//
// 过去没有这层，是因为测试都经 `createImageServer` 走真实 HTTP —— 覆盖的是**成功路径**，
// 而「参数不合法时回什么错、**是否误下发指令**」这条分支链没有直呼入口。
//
// ## 命名约定
//
// 文件名不带 `.test.`（本文件是构造器，不是测试；否则 vitest 会当空套件收集）。
import { Readable } from "node:stream";

/**
 * 构造一个可异步迭代的假 request。
 *
 * @param {object} options
 * @param {string|Buffer|Uint8Array|object} [options.body] 请求体；字符串按 utf-8 编码；
 *   任何 TypedArray/Buffer 按原始字节；其余按 JSON 序列化
 * @param {Record<string,string>} [options.headers]
 */
export function fakeRequest({ body, headers = {} } = {}) {
  const chunks = [];
  if (body !== undefined && body !== null) {
    let buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (ArrayBuffer.isView(body)) {
      // 必须是这一支在前：TextEncoder().encode() 给的是**普通** Uint8Array，
      // 不是 Buffer。漏了它会被下面的 JSON 分支序列化成一长串 {"0":49,"1":229,…}，
      // 于是「发送 26 字节中文」变成「发送 223 字节的索引表」——症状是回显乱码，
      // 而根因在测试基建里，很容易被误判成被测代码的编码 bug。
      buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof body === "string") {
      buffer = Buffer.from(body, "utf-8");
    } else {
      buffer = Buffer.from(JSON.stringify(body), "utf-8");
    }
    chunks.push(buffer);
  }
  const stream = Readable.from(chunks);
  // handler 只读 headers 与异步迭代，不碰 method/URL —— 但 method 会进回执，补上更真实
  stream.headers = { "content-type": "application/json", ...headers };
  stream.method = "POST";
  return stream;
}

/** 构造一个只带 searchParams 的假 URL（handler 只读 searchParams / pathname / search）。 */
export function fakeUrl(search = "") {
  return new URL(`http://127.0.0.1/webgrp/v1/x${search ? `?${search}` : ""}`);
}

/**
 * 构造记录型假 response。
 *
 * 记录 writeHead 的 (status, headers) 与 end(body)，并维护 headersSent ——
 * sendV1Error 靠它决定「还能不能写错误响应」，这个标志必须真实。
 */
export function fakeResponse() {
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
      this.body = body;
      this.headersSent = true;
      return this;
    },
    /** 解析 JSON 响应体；非 JSON 时返回 null（便于断言「没写错误响应」）。 */
    json() {
      if (this.body === null || this.body === undefined) return null;
      try {
        return JSON.parse(Buffer.isBuffer(this.body) ? this.body.toString("utf-8") : String(this.body));
      } catch {
        return null;
      }
    },
    text() {
      if (this.body === null || this.body === undefined) return "";
      return Buffer.isBuffer(this.body) ? this.body.toString("utf-8") : String(this.body);
    }
  };
}

/**
 * 构造记录型 ctx。
 *
 * @param {object} options
 * @param {unknown} [options.result] sendCommandToClient / fetchFromClient 的 resolve 值
 * @param {Error} [options.error]   要 reject 的错误（优先于 result）
 * @param {Function} [options.implement] 自定义实现 (fnName, params) => unknown
 */
export function fakeCtx({ result = { ok: true }, error = null, implement = null } = {}) {
  const calls = [];
  const invoke = (kind, clientId, name, params) => {
    calls.push({ kind, clientId, name, params });
    if (implement) return implement(name, params);
    if (error) return Promise.reject(error);
    return Promise.resolve(result);
  };
  return {
    calls,
    sendCommandToClient: (clientId, name, params) => invoke("command", clientId, name, params),
    fetchFromClient: (clientId, resource, params) => invoke("fetch", clientId, resource, params),
    listClients: () => []
  };
}

/** 断言「未下发任何指令」—— 校验分支最关键的一条：参数不合法绝不能漏发。 */
export function expectNoCall(ctx) {
  if (ctx.calls.length > 0) {
    throw new Error(`期望不下发指令，实际下发了 ${JSON.stringify(ctx.calls)}`);
  }
}

/** 取第一条指令的 name。 */
export function firstCallName(ctx) {
  return ctx.calls[0]?.name;
}

/** 取第一条指令的 params。 */
export function firstCallParams(ctx) {
  return ctx.calls[0]?.params;
}
