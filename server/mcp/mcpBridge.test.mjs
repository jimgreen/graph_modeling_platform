// server/mcp/v1Bridge.mjs 的单测。
//
// 这里断言的是**桥的契约**，不是 v1 handler 的契约（后者由 server/apiV1*.test.mjs 负责）：
//   · 假 request/response 足够驱动真实 v1 handler；
//   · 捕获到的响应能被解析成 v1 信封；
//   · 二进制响应不被误当成 JSON；
//   · 错误码能翻成可执行建议。
//
// ⚠ 本文件必须是纯 JavaScript —— 写成 TS 语法会 RollupError，表现为「no tests」，
//   绝不能当成通过（见 根 AGENTS.md「分域规则 · server」 的测试约定）。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "../domShim.mjs";

installDomShim();

import { handleV1SchemeModels, handleV1Schemes } from "../apiV1Schemes.mjs";
import { spacePathsFor } from "../spaceStore.mjs";
import {
  createCaptureResponse,
  createBridgeRequest,
  buildBridgeUrl,
  invokeV1Handler,
  parseV1Envelope,
  errorHint
} from "./v1Bridge.mjs";

let dataDir;
let paths;

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "mcp-bridge-"));
  // 预置一个方案 + 一个模型：与 spaceDispatch.test.mjs 同一套目录约定
  const schemeDir = join(dataDir, "workspaces", "zhangsan", "schemes", "files", "方案A");
  mkdirSync(schemeDir, { recursive: true });
  writeFileSync(
    join(schemeDir, "模型1.json"),
    JSON.stringify({ name: "模型1", idx: 1, nodes: [], edges: [] }),
    "utf-8"
  );
  paths = spacePathsFor(dataDir, "zhangsan");
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

test("createCaptureResponse 记录 writeHead/end 并如实反映 headersSent", () => {
  const res = createCaptureResponse();
  expect(res.headersSent).toBe(false);
  res.writeHead(201, { "content-type": "application/json" });
  expect(res.headersSent).toBe(true);
  expect(res.statusCode).toBe(201);
  expect(res.headers["content-type"]).toBe("application/json");
  res.end("hi");
  expect(res.body).toBe("hi");
});

test("createBridgeRequest 的 body 可被 for await 读走（对象按 JSON 序列化）", async () => {
  const request = createBridgeRequest({ method: "POST", body: { a: 1 } });
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  expect(Buffer.concat(chunks).toString("utf-8")).toBe('{"a":1}');
  expect(request.method).toBe("POST");
  // 不得带 accept-encoding / if-none-match：否则 sendV1Json 会走 gzip / 304 分支，
  // 捕获到的 body 就不是明文 JSON（且只在 body ≥1KB 时暴露 —— 更难查）。
  expect(request.headers["accept-encoding"]).toBeUndefined();
  expect(request.headers["if-none-match"]).toBeUndefined();
});

test("createBridgeRequest 显式传入 accept-encoding 也会被剔除", () => {
  const request = createBridgeRequest({ headers: { "accept-encoding": "gzip" } });
  expect(request.headers["accept-encoding"]).toBeUndefined();
});

test("buildBridgeUrl 自动补 apiPrefix 并正确编码 query", () => {
  const url = buildBridgeUrl("/v1/schemes/models", { schemePath: "a%b", name: "模型 1" });
  expect(url.pathname).toBe("/webgrp/v1/schemes/models");
  expect(url.searchParams.get("schemePath")).toBe("a%b");
  expect(url.searchParams.get("name")).toBe("模型 1");
  // null / undefined 的 query 项直接略过，不拼成 "null" 字符串
  const url2 = buildBridgeUrl("/v1/schemes", { a: null, b: undefined, c: 1 });
  expect(url2.searchParams.has("a")).toBe(false);
  expect(url2.searchParams.has("b")).toBe(false);
  expect(url2.searchParams.get("c")).toBe("1");
});

test("invokeV1Handler 能驱动真实 v1 handler：缺 schemePath → 400 bad-request", async () => {
  const result = await invokeV1Handler(handleV1SchemeModels, {
    method: "GET",
    path: "/v1/schemes/models",
    paths
  });
  expect(result.status).toBe(400);
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(false);
  expect(envelope.error.code).toBe("bad-request");
  expect(envelope.error.message).toContain("schemePath");
});

test("invokeV1Handler 能驱动真实 v1 handler：正常返回 → 200 + 完整信封", async () => {
  const result = await invokeV1Handler(handleV1SchemeModels, {
    method: "GET",
    path: "/v1/schemes/models",
    // query 值传**已解码形态**：JSON 数组文本。桥用 URLSearchParams 写进 URL，
    // 施加的百分号编码与 encodeSchemePath 同形。传 encodeSchemePath 的产物会双重编码。
    query: { schemePath: JSON.stringify(["方案A"]) },
    paths
  });
  expect(result.status).toBe(200);
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(true);
  expect(envelope.data.models.map((m) => m.name)).toEqual(["模型1"]);
});

test("invokeV1Handler 读 body：POST 的 JSON body 能被 v1 handler 读到", async () => {
  let seen = null;
  const handler = async ({ request, response }) => {
    const { readJsonBody } = await import("../readJsonBody.mjs");
    seen = await readJsonBody(request);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, data: seen }));
  };
  const result = await invokeV1Handler(handler, {
    method: "POST",
    path: "/v1/echo",
    body: { kind: "AC" }
  });
  expect(seen).toEqual({ kind: "AC" });
  expect(parseV1Envelope(result).ok).toBe(true);
});

test("invokeV1Handler 把漏网的异常折成 internal 错误信封（不抛给上层）", async () => {
  const result = await invokeV1Handler(async () => {
    throw new Error("桥接炸了");
  }, { method: "GET", path: "/v1/boom", paths });
  expect(result.status).toBe(500);
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(false);
  expect(envelope.error.code).toBe("internal");
  expect(envelope.error.message).toContain("桥接炸了");
});

test("parseV1Envelope 把二进制响应判为非 JSON 且不误报错误", async () => {
  const result = await invokeV1Handler(async ({ response }) => {
    response.writeHead(200, { "content-type": "application/zip" });
    response.end(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  }, { method: "GET", path: "/v1/zip", paths });
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(true);
  expect(envelope.isJson).toBe(false);
  expect(envelope.contentType).toBe("application/zip");
  expect(envelope.bytes).toHaveLength(4);
});

test("parseV1Envelope 把非 JSON 的 4xx 判成错误", async () => {
  const result = await invokeV1Handler(async ({ response }) => {
    response.writeHead(400, { "content-type": "text/plain" });
    response.end("参数不对");
  }, { method: "GET", path: "/v1/text-error", paths });
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(false);
  expect(envelope.error.code).toBe("internal");
  expect(envelope.error.message).toContain("400");
});

test("parseV1Envelope 面对声明为 JSON 却不是合法 JSON 的响应不静默通过", async () => {
  const result = await invokeV1Handler(async ({ response }) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{不是 JSON");
  }, { method: "GET", path: "/v1/bad-json", paths });
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(false);
  expect(envelope.error.code).toBe("internal");
});

test("query 值传已编码形态会被双重编码 → v1 报非法 schemePath（钉住这条契约）", async () => {
  const { encodeSchemePath } = await import("../schemePath.mjs");
  // encodeSchemePath 的产物是「URL 形态」；桥再编一层 → v1 收到 JSON 字符串里的
  // 百分号序列 → JSON.parse 仍成功但元素是 "%E6%96%B9..." → 查不到方案 → 400。
  const result = await invokeV1Handler(handleV1SchemeModels, {
    method: "GET",
    path: "/v1/schemes/models",
    query: { schemePath: encodeSchemePath(["方案A"]) },
    paths
  });
  expect(result.status).toBe(400);
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(false);
});

test("handleV1Schemes 经桥驱动后能看到空间内的方案", async () => {
  const result = await invokeV1Handler(handleV1Schemes, {
    method: "GET",
    path: "/v1/schemes",
    paths
  });
  const envelope = parseV1Envelope(result);
  expect(envelope.ok).toBe(true);
  expect(envelope.data.schemes.map((s) => s.name)).toEqual(["方案A"]);
});
