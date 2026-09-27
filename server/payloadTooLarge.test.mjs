// 请求体超限的契约：必须回 413，不能只把连接掐掉。
//
// 背景（实测缺陷）：`readBody` / `readRawBody` 超限时先 `request.destroy()` 再 reject。
// destroy 立刻切断 socket，响应再也发不出去 —— 客户端只看到 ECONNRESET
// （`fetch` 抛 "fetch failed"），拿不到任何状态码。派发层虽有外层 catch 能写
// 413/500（见 server.mjs 的 `error.statusCode` 分支），但连接已死，那条路走不到，
// 于是 `payload-too-large` 实际是不可达的死代码。
//
// 修复：改为 `request.pause()`（停止收数据但保持连接可写），由派发层正常回 413。
// 本测试钉住「客户端能读到状态码」这个对外契约。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

let dataDir;
let server;
let baseUrl;

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "gmp-oversize-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

describe("请求体超限", () => {
  // /webgrp/measurement-config 的上限是 1MB（maxMeasurementConfigBodyBytes）
  test("超过上限时回 413 + 可读原因，而不是把连接掐掉（回归：曾恒为 ECONNRESET）", async () => {
    const oversized = "x".repeat(2 * 1024 * 1024);
    const res = await fetch(`${baseUrl}/webgrp/measurement-config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: oversized })
    });
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(typeof json.error).toBe("string");
    expect(json.error).toContain("过大");
  });

  test("未超限时照常 200（确认上限判定没写死成「总是 413」）", async () => {
    const res = await fetch(`${baseUrl}/webgrp/measurement-config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupDefaults: {}, measurementTypes: [], deviceProfiles: [] })
    });
    expect(res.status).toBe(200);
  });

  test("v1 域的 2MB 上限同样回 413（确认修复不是只对内部端点生效）", async () => {
    // /webgrp/v1/runtime/e-file 走 v1 自己的信封通路（{ok:false,error:{code}}），
    // 与内部端点的 {error:"..."} 形状不同，但状态码语义必须一致。
    const res = await fetch(`${baseUrl}/webgrp/v1/runtime/e-file`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateText: "x".repeat(3 * 1024 * 1024) })
    });
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("payload-too-large");
  });

  test("三个 readJsonBody/readBody 实现都不再提前中断流（静态断言实现形状）", () => {
    // 二进制路径的上限高达 64MB/256MB，实际构造这么大的 body 不适合放进单测；
    // 这里改为静态断言「读完整个流、不再累积 chunk」这个修法没有回退。
    // 曾经的两种坏写法：request.destroy()（连接被掐，客户端只见 ECONNRESET）
    // 与 pause() + 早退（只撑到约 3MB，再大照样重置）。
    const cases = [
      { file: "./server.mjs", fn: "function readBody(" },
      { file: "./server.mjs", fn: "function readRawBody(" },
      { file: "./apiV1Runtime.mjs", fn: "async function readJsonBody(" },
      { file: "./apiV1Control.mjs", fn: "async function readJsonBody(" }
    ];
    for (const { file, fn } of cases) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      const start = source.indexOf(fn);
      expect(start, `未找到 ${file} 的 ${fn}`).toBeGreaterThan(-1);
      const body = source.slice(start, start + 1400);
      expect(body, `${file} ${fn} 仍在 request.destroy()，会把 413 变成 ECONNRESET`).not.toContain(
        "request.destroy()"
      );
      expect(body, `${file} ${fn} 应在超限后读完剩余流（oversize 标记 + continue）`).toContain(
        "oversize"
      );
    }
  });
});
