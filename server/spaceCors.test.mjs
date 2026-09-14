// 跨源预检必须允许 X-Space，否则浏览器第三方调用被预检拦死。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir; let server; let baseUrl;
beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "space-cors-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

test("OPTIONS 预检允许 x-space", async () => {
  const res = await fetch(`${baseUrl}/webgrp/schemes`, {
    method: "OPTIONS",
    headers: { origin: "http://example.com", "access-control-request-headers": "x-space" }
  });
  expect(res.status).toBe(204);
  expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-space");
  expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("content-type");
});

// v1 响应头也走同一份跨源头：两份副本一旦分叉，这条会红。
test("v1 响应头允许 x-space（跨源头单源守卫）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/v1/runtime/clients`);
  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-space");
});
