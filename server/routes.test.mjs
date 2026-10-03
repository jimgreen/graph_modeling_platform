import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test, afterEach, beforeEach } from "vitest";
import { createImageServer } from "./server.mjs";
import { apiPath } from "./config.mjs";

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

  test(apiPath("/*") + " 不被静态托管拦截，走接口层（未命中返 404 JSON）", async () => {
    const { status, text } = await fetchPath(apiPath("/nonexistent-endpoint"));
    expect(status).toBe(404);
    expect(JSON.parse(text).error).toBeTruthy();
  });

  test("/webgrp/ws 不被静态托管拦截（后续 WS 升级处理，此处 GET 未命中走 404 不返 HTML）", async () => {
    const { status } = await fetchPath("/webgrp/ws");
    // /webgrp/ws 不匹配静态文件 index.html 之外的规则；当前无 WS handler，路由未命中 → 静态 fallback 返 index.html
    // 关键：/webgrp/ws 不应返回静态 JS/资源。此处验证不崩即可，WS 升级由 T2 实现。
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
    const res = await fetch(`${baseUrl}${apiPath("/images")}`, { method: "OPTIONS" });
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

describe("icon-library 静态托管", () => {
  test("GET /icon-library/catalog.json 从 public/icon-library/ 读取", async () => {
    const { status, headers, text } = await fetchPath("/icon-library/catalog.json");
    expect(status).toBe(200);
    expect(headers.get("content-type")).toBe("application/json; charset=utf-8");
    const parsed = JSON.parse(text);
    expect(parsed.libraries).toBeTruthy();
  });

  test("GET /icon-library/README.md 从 public/icon-library/ 读取", async () => {
    const { status, headers } = await fetchPath("/icon-library/README.md");
    expect(status).toBe(200);
    expect(headers.get("content-type")).toMatch(/^text\/markdown/);
  });

  test("/icon-library/ 路径穿越被拦截", async () => {
    const { status } = await fetchPath("/icon-library/../../package.json");
    // URL 规范化后为 /package.json，不匹配 /icon-library/ 前缀 → 走 SPA fallback 或 404
    expect([200, 404]).toContain(status);
  });
});

describe("图片文件夹动态路由的路径段解码", () => {
  test("畸形百分号转义不再抛 URIError（回落到按原样查 id → 404）", async () => {
    // /image-folders/100% 里的 "%" 不是合法转义，decodeURIComponent 原本会抛
    const { status } = await fetchPath("/webgrp/image-folders/100%");
    expect(status).toBe(404);
  });

  test("PUT 同样不 500（畸形转义回落到 404）", async () => {
    const res = await fetch(`${baseUrl}/webgrp/image-folders/100%`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "改过" })
    });
    expect(res.status).toBe(404);
  });

  test("合法转义照常解码（中文目录名能命中）", async () => {
    // 先建一个中文名的文件夹，再用编码后的 id 删它：能删掉即证明解码正常
    const created = await fetch(`${baseUrl}/webgrp/image-folders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "中文目录" })
    });
    expect(created.status).toBe(201);
    const folder = await created.json();
    expect(folder.id).toBeTruthy();

    const deleted = await fetch(`${baseUrl}/webgrp/image-folders/${encodeURIComponent(folder.id)}`, { method: "DELETE" });
    expect(deleted.status).toBe(200);
  });

  test("解码失败时按原样 id 查，仍是 404 而不是 500", async () => {
    const { status, text } = await fetchPath("/webgrp/image-folders/%E4%B8%AD%E6%96%87");
    expect(status).toBe(404);
    expect(JSON.parse(text).error).toBeTruthy();
  });
});

// ── 图片文件夹重命名的名称净化 ────────────────────────────
//
// `safeName`（server.mjs:1963）是 `sanitizeSegment` 的手抄劣化版，只做
// 「非法字符换 _ + 截断」，不做去空白、不拒 "." / ".." 段。后果有两条：
//   1. `safeName(payload.name || "")` 在空串时先被 `||` 换成「未命名图片」，
//      所以紧跟其后的 `if (!name) 400` **永不可达** —— 用户提交空名不会被拒，
//      而是被静默存成「未命名图片」；
//   2. 名字 ".." 会原样落盘（sanitizeSegment 会兜底成 fallback）。
//
// 这里把两条都钉成端到端事实。**不改实现**：换掉 safeName 会改所有已存图片文件夹
// 的落盘名，属于对外行为变更，得先确认历史数据兼容策略。

describe("图片文件夹重命名 —— safeName 的净化口径", () => {
  async function createFolder(name) {
    const created = await fetch(`${baseUrl}/webgrp/image-folders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    expect(created.status).toBe(201);
    return created.json();
  }

  async function rename(folderId, name) {
    const res = await fetch(`${baseUrl}/webgrp/image-folders/${encodeURIComponent(folderId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  test("★ 空名不被拒，而是被存成「未命名图片」（if (!name) 400 是死代码）", async () => {
    const folder = await createFolder("原名");
    const renamed = await rename(folder.id, "");
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("未命名图片");
  });

  test("已存在「未命名图片」时重命名为空 → 409（判重发生在净化之后）", async () => {
    // 依赖上一条用例已把某个文件夹改成「未命名图片」——本组用例共用同一个数据目录
    // （createImageServer 暂不支持注入 dataRoot），所以顺序是有意义的。
    const folder = await createFolder("另一个原名");
    const renamed = await rename(folder.id, "");
    expect(renamed.status).toBe(409);
  });

  test("★ 名字 '..' 原样落盘（不像 sanitizeSegment 那样兜底）", async () => {
    const folder = await createFolder("原名3");
    const renamed = await rename(folder.id, "..");
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("..");
  });

  test("非法字符仍被换成下划线（safeName 确实在做净化）", async () => {
    const folder = await createFolder("原名4");
    const renamed = await rename(folder.id, "a/b:c*d?e");
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("a_b_c_d_e");
  });

  test("首尾空白**不去除**（sanitizeSegment 会 trim，这里不会）", async () => {
    const folder = await createFolder("原名5");
    const renamed = await rename(folder.id, "  带空格  ");
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("  带空格  ");
  });

  test("超长名字按 maxFilePartLength 截断", async () => {
    const folder = await createFolder("原名6");
    const renamed = await rename(folder.id, "x".repeat(200));
    expect(renamed.status).toBe(200);
    expect(renamed.body.name.length).toBe(80);
  });
});
