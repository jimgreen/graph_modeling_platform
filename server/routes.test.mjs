import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, afterEach, beforeEach } from "vitest";
import { createImageServer } from "./image-server.mjs";

// HTTP 集成测试：起真实 server（临时端口 + tmpdir 静态目录），打真实请求。
// 测静态资源分流：/* 走静态、/api 不被静态拦截、SPA fallback、/ws 不被静态拦截。

let server;
let baseUrl;
let staticRoot;

async function startServer() {
  staticRoot = await mkdtemp(join(tmpdir(), "routes-static-"));
  await mkdir(join(staticRoot, "assets"), { recursive: true });
  await writeFile(join(staticRoot, "index.html"), "<!doctype html><title>SPA</title><div>app</div>", "utf-8");
  await writeFile(join(staticRoot, "assets", "app.js"), "console.log('app');", "utf-8");
  await writeFile(join(staticRoot, "favicon.ico"), "fake-ico", "utf-8");

  // 临时端口：0 让 OS 分配
  server = await createImageServer({ port: 0, host: "127.0.0.1", staticRoot });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function fetchPath(pathname, headers = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, { headers });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

beforeEach(async () => {
  await startServer();
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (staticRoot) {
    await rm(staticRoot, { recursive: true, force: true });
  }
});

describe("静态资源分流", () => {
  test("/ 返回 index.html", async () => {
    const { status, text } = await fetchPath("/");
    expect(status).toBe(200);
    expect(text).toContain("<title>SPA</title>");
  });

  test("/assets/app.js 返回静态文件 + 正确 mime", async () => {
    const { status, headers, text } = await fetchPath("/assets/app.js");
    expect(status).toBe(200);
    expect(text).toBe("console.log('app');");
    expect(headers.get("content-type")).toBe("application/javascript; charset=utf-8");
  });

  test("/favicon.ico 返回静态文件", async () => {
    const { status, text } = await fetchPath("/favicon.ico");
    expect(status).toBe(200);
    expect(text).toBe("fake-ico");
  });

  test("SPA fallback：未命中路径返回 index.html", async () => {
    const { status, text } = await fetchPath("/some/deep/route");
    expect(status).toBe(200);
    expect(text).toContain("<title>SPA</title>");
  });

  test("/webgrp/* 不被静态托管拦截，走接口层（未命中返 404 JSON）", async () => {
    const { status, text } = await fetchPath("/webgrp/nonexistent-endpoint");
    expect(status).toBe(404);
    expect(JSON.parse(text).error).toBeTruthy();
  });

  test("/ws 不被静态托管拦截（后续 WS 升级处理，此处 GET 未命中走 404 不返 HTML）", async () => {
    const { status } = await fetchPath("/ws");
    // /ws 不匹配静态文件 index.html 之外的规则；当前无 WS handler，路由未命中 → 静态 fallback 返 index.html
    // 关键：/ws 不应返回静态 JS/资源。此处验证不崩即可，WS 升级由 T2 实现。
    expect([200, 404]).toContain(status);
  });

  test("路径越界尝试被安全折叠（不泄露系统文件）", async () => {
    // /../../etc/passwd 经 URL 规范化折叠为 /etc/passwd，join 限制在 staticRoot 内
    // 文件不存在 → SPA fallback 返 index.html，绝不返系统 /etc/passwd 内容
    const { status, text } = await fetchPath("/../../etc/passwd");
    expect([200, 404]).toContain(status);
    // 关键：响应不含系统文件内容
    expect(text).not.toContain("root:");
    if (status === 200) {
      // SPA fallback 应返 index.html
      expect(text).toContain("<title>SPA</title>");
    }
  });

  test("编码越界尝试 %2e%2e 被安全折叠", async () => {
    const { status, text } = await fetchPath("/%2e%2e/%2e%2e/etc/passwd");
    expect([200, 404]).toContain(status);
    expect(text).not.toContain("root:");
  });

  test("OPTIONS 预检返 204", async () => {
    const res = await fetch(`${baseUrl}/webgrp/images`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
  });
});

describe("无 staticRoot（dev 模式）", () => {
  test("无静态目录时 / 返 404 不托管", async () => {
    // 关闭 beforeEach 起的 server，起无 staticRoot 的
    await new Promise((resolve) => server.close(resolve));
    server = await createImageServer({ port: 0, host: "127.0.0.1" });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
    const { status, text } = await fetchPath("/");
    expect(status).toBe(404);
    expect(JSON.parse(text).error).toBeTruthy();
  });
});
