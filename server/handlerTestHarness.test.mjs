import { describe, expect, test } from "vitest";
import { handleControlDevicesGroup } from "./apiV1Control.mjs";
import {
  expectNoCall,
  fakeCtx,
  fakeRequest,
  fakeResponse,
  fakeUrl,
  firstCallName,
  firstCallParams
} from "./handlerTestHarness.mjs";

describe("fakeRequest", () => {
  test("字符串 body 按单个 Buffer chunk 异步迭代", async () => {
    const request = fakeRequest({ body: "模型内容" });
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);

    expect(chunks).toHaveLength(1);
    expect(Buffer.isBuffer(chunks[0])).toBe(true);
    expect(Buffer.concat(chunks).toString("utf-8")).toBe("模型内容");
  });

  test("无 body 时保持空可迭代流并提供默认 headers/method", async () => {
    const request = fakeRequest();
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);

    expect(chunks).toEqual([]);
    expect(request.headers).toEqual({ "content-type": "application/json" });
    expect(request.method).toBe("POST");
  });

  test("headers 覆盖默认值并保留额外 header", () => {
    const request = fakeRequest({
      headers: { "content-type": "text/plain", "x-test": "yes" }
    });

    expect(request.headers).toEqual({
      "content-type": "text/plain",
      "x-test": "yes"
    });
  });

  test("对象和 Uint8Array body 分别按 JSON 与原始字节读取", async () => {
    const objectRequest = fakeRequest({ body: { name: "模型1" } });
    const objectChunks = [];
    for await (const chunk of objectRequest) objectChunks.push(chunk);
    expect(JSON.parse(Buffer.concat(objectChunks).toString("utf-8"))).toEqual({ name: "模型1" });

    const bytes = new Uint8Array([0, 1, 255]);
    const bytesRequest = fakeRequest({ body: bytes });
    const byteChunks = [];
    for await (const chunk of bytesRequest) byteChunks.push(chunk);
    expect(Buffer.concat(byteChunks)).toEqual(Buffer.from(bytes));
  });
});

describe("fakeResponse", () => {
  test("writeHead 记录状态和 headers，重复调用覆盖记录", () => {
    const response = fakeResponse();

    expect(response.writeHead(201, { "x-first": "one" })).toBe(response);
    expect(response.statusCode).toBe(201);
    expect(response.headers).toEqual({ "x-first": "one" });
    expect(response.headersSent).toBe(true);

    response.writeHead(204, { "x-second": "two" });
    expect(response.statusCode).toBe(204);
    expect(response.headers).toEqual({ "x-second": "two" });
  });

  test("end 可回读字符串、Buffer 和 JSON", () => {
    const response = fakeResponse();
    response.end('{"ok":true}');
    expect(response.headersSent).toBe(true);
    expect(response.text()).toBe('{"ok":true}');
    expect(response.json()).toEqual({ ok: true });

    response.end(Buffer.from("内容", "utf-8"));
    expect(response.text()).toBe("内容");
    expect(response.json()).toBeNull();
  });

  test("尚未 end 时 json 返回 null，缺省 headers 为对象", () => {
    const response = fakeResponse();
    response.writeHead(200);

    expect(response.headers).toEqual({});
    expect(response.json()).toBeNull();
    expect(response.text()).toBe("");
  });
});

describe("fakeUrl", () => {
  test("空查询串生成固定 pathname 且无 search", () => {
    const url = fakeUrl();

    expect(url.pathname).toBe("/webgrp/v1/x");
    expect(url.search).toBe("");
    expect(url.searchParams.toString()).toBe("");
  });

  test("查询参数可通过 URL searchParams 解析", () => {
    const url = fakeUrl("a=b&c=d");

    expect(url.search).toBe("?a=b&c=d");
    expect(url.searchParams.get("a")).toBe("b");
    expect(url.searchParams.get("c")).toBe("d");
  });
});

describe("fakeCtx", () => {
  test("默认 result、覆盖 result 与 calls 记录", async () => {
    const defaultCtx = fakeCtx();
    expect(await defaultCtx.sendCommandToClient("C1", "control.test", { value: 1 })).toEqual({ ok: true });
    expect(defaultCtx.calls).toEqual([
      { kind: "command", clientId: "C1", name: "control.test", params: { value: 1 } }
    ]);

    const customCtx = fakeCtx({ result: { value: 2 } });
    await expect(customCtx.fetchFromClient("C2", "runtime.test", { include: true })).resolves.toEqual({ value: 2 });
    expect(customCtx.calls).toEqual([
      { kind: "fetch", clientId: "C2", name: "runtime.test", params: { include: true } }
    ]);
  });

  test("error 作为 reject 值返回，implement 优先并收到 name/params", async () => {
    const error = new Error("失败");
    const errorCtx = fakeCtx({ error });
    await expect(errorCtx.sendCommandToClient("C1", "control.test", {})).rejects.toBe(error);

    const seen = [];
    const implementCtx = fakeCtx({
      result: "ignored",
      error,
      implement: (name, params) => {
        seen.push({ name, params });
        return Promise.resolve({ handled: true });
      }
    });
    await expect(implementCtx.fetchFromClient("C3", "runtime.test", { id: 3 })).resolves.toEqual({ handled: true });
    expect(seen).toEqual([{ name: "runtime.test", params: { id: 3 } }]);
    expect(implementCtx.calls).toEqual([
      { kind: "fetch", clientId: "C3", name: "runtime.test", params: { id: 3 } }
    ]);
  });

  test("辅助函数读取首条调用，未调用时为空且 expectNoCall 不抛错", async () => {
    const ctx = fakeCtx();
    expect(firstCallName(ctx)).toBeUndefined();
    expect(firstCallParams(ctx)).toBeUndefined();
    expect(() => expectNoCall(ctx)).not.toThrow();

    await ctx.sendCommandToClient("C1", "control.test", { value: 1 });
    expect(firstCallName(ctx)).toBe("control.test");
    expect(firstCallParams(ctx)).toEqual({ value: 1 });
    expect(() => expectNoCall(ctx)).toThrow(/实际下发了/);
  });
});

describe("handlerTestHarness 端到端适配", () => {
  test("fakeRequest + fakeResponse + fakeCtx 可直呼 v1 handler 并得到信封", async () => {
    const response = fakeResponse();
    const ctx = fakeCtx({ result: { groupId: "G1" } });

    await handleControlDevicesGroup(
      { request: fakeRequest({ body: { ignored: true } }), url: fakeUrl("clientId=C1"), response },
      ctx
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: { groupId: "G1" } });
    expect(ctx.calls).toEqual([
      { kind: "command", clientId: "C1", name: "control.devices.group", params: {} }
    ]);
  });
});
