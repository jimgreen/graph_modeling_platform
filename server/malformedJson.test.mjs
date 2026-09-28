// 「请求体不是合法 JSON」的状态码契约守卫。
//
// **实测缺陷（已修）**：`readJsonBody` 直接 `JSON.parse(body || "{}")`，
// SyntaxError 没有 statusCode → 派发层外层 catch 按「其余仍是 500」处理。
// 结果：客户端一个拼写错误被报成**服务端故障**，且错误体直接透出 Node 的原始
// 英文 SyntaxError 文本（"Expected property name or '}' in JSON at position 1 …"）。
//
// 受影响端点（实测 4 个内部域全部 500）：
//   PUT /webgrp/color-config、PUT /webgrp/measurement-config、
//   PUT /webgrp/device-library、POST /webgrp/image-folders
//
// 后果：① 监控上客户端错误混进 5xx 告警；② 调用方无法判断是自己的问题；
// ③ 内部实现措辞泄露给外部。v1 域一直是对的（400 bad-request），内部域此前是漏的。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let dataDir;
let server;
let baseUrl;

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "gmp-json-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

/** 内部域 JSON 端点：畸形 JSON 必须回 400，不能是 500。 */
const INTERNAL_JSON_ENDPOINTS = [
  ["PUT", "/webgrp/color-config"],
  ["PUT", "/webgrp/measurement-config"],
  ["PUT", "/webgrp/device-library"],
  ["POST", "/webgrp/image-folders"]
];

describe("请求体不是合法 JSON", () => {
  for (const [method, endpoint] of INTERNAL_JSON_ENDPOINTS) {
    test(`${method} ${endpoint} 回 400 而非 500（回归：曾恒为 500）`, async () => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "content-type": "application/json" },
        body: "{not valid json"
      });
      expect(res.status, `${method} ${endpoint} 把客户端错误报成了 5xx`).toBe(400);
      const json = await res.json();
      expect(typeof json.error).toBe("string");
      // 固定中文文案，与 v1 域一致
      expect(json.error).toContain("合法 JSON");
    });
  }

  test("错误体不透出 Node 原始 SyntaxError 文本（不泄露解析器内部措辞）", async () => {
    const res = await fetch(`${baseUrl}/webgrp/color-config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{not valid json"
    });
    const text = await res.text();
    expect(text).not.toMatch(/SyntaxError|Expected property name|position \d+|in JSON at/u);
  });

  test("v1 域同样回 400（本就正确，此处钉住两侧一致）", async () => {
    const res = await fetch(`${baseUrl}/webgrp/v1/control/device/add`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json"
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("bad-request");
  });

  test("空 body 仍按 {} 处理（不是错误）", async () => {
    // readJsonBody 的 `body || "{}"` 语义：POST 空体应走正常业务流程，
    // 而不是被新加的 try/catch 误判成畸形 JSON。
    const res = await fetch(`${baseUrl}/webgrp/v1/control/device/add`, {
      method: "POST",
      headers: { "content-type": "application/json" }
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    // 是「缺参数」而非「JSON 非法」
    expect(json.error.message).not.toContain("合法 JSON");
  });

  test("合法 JSON 不受影响（回归：别把正常路径也拦下）", async () => {
    const res = await fetch(`${baseUrl}/webgrp/measurement-config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupDefaults: {}, measurementTypes: [], deviceProfiles: [] })
    });
    expect(res.status).toBe(200);
  });
});
