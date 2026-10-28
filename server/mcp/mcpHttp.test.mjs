// /webgrp/mcp 的端到端测试：真起一个后端进程，用**官方 MCP 客户端**走 streamable HTTP 连上来。
//
// 与 server/mcp/mcpTools.test.mjs（进程内 InMemoryTransport）的分工：
// 那份测「工具层与装配层」，这份测「HTTP 入口 + 派发层 + 空间隔离 + 协议级拒绝」。
//
// 覆盖：
//   · 官方客户端能 initialize → tools/list → tools/call（29 个工具，读得到当前空间的数据）；
//   · GET / DELETE /webgrp/mcp → 405（带 Allow: POST），不挂 SSE 长连接；
//   · Accept 缺 text/event-stream → 406（SDK 的协议要求）；
//   · 非本机 Origin → 403（写操作暴露在端口上，必须挡住网页发起的跨源调用）；
//   · 未知空间 → 400 SPACE_UNKNOWN（MCP 走的是与 v1 同一套空间隔离）；
//   · 空间隔离：A 空间读不到 B 空间的方案。
//
// ⚠ 本文件必须是纯 JavaScript —— 写成 TS 语法会 RollupError，表现为「no tests」，
//   绝不能当成通过（见 根 AGENTS.md「分域规则 · server」 的测试约定）。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "../domShim.mjs";

installDomShim();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WebSocket } from "ws";

const EXPECTED_TOOL_COUNT = 29;

let dataDir;
let server;
let baseUrl;

/** 给某个空间预置一个方案 + 模型（读类工具要真的读到东西）。 */
function seedScheme(spaceId, schemeName, modelName) {
  const schemeDir = join(dataDir, "workspaces", spaceId, "schemes", "files", schemeName);
  mkdirSync(schemeDir, { recursive: true });
  writeFileSync(
    join(schemeDir, `${modelName}.json`),
    JSON.stringify({ name: modelName, idx: 1, nodes: [], edges: [] }),
    "utf-8"
  );
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "mcp-http-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("../server.mjs");
  const { createSpaceStore } = await import("../spaceStore.mjs");
  // 必须把自己建的 store 注入：否则服务端会另建第二个实例，同进程两个写者各持注册表快照
  const store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create("zhangsan");
  await store.create("lisi");
  seedScheme("zhangsan", "方案A", "模型1");
  seedScheme("lisi", "方案B", "模型2");
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

/** 用官方客户端连一次 MCP 并跑一段回调。 */
async function withMcpClient(spaceId, fn) {
  const transport = new StreamableHTTPClientTransport(
    new URL(`${baseUrl}/webgrp/mcp?space=${spaceId}`)
  );
  const client = new Client({ name: "e2e-client", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

test("官方客户端能 initialize 并列出 29 个工具", async () => {
  await withMcpClient("zhangsan", async (client) => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
    expect(tools.map((tool) => tool.name)).toContain("gmp_list_schemes");
  });
});

test("tools/call 读到的是**当前空间**的方案（空间隔离与 v1 同源）", async () => {
  await withMcpClient("zhangsan", async (client) => {
    const result = await client.callTool({ name: "gmp_list_schemes", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.ok).toBe(true);
    const text = JSON.stringify(result.structuredContent.data);
    expect(text).toContain("方案A");
    expect(text).not.toContain("方案B");
  });
});

test("换一个空间读到的就是另一个空间的方案", async () => {
  await withMcpClient("lisi", async (client) => {
    const result = await client.callTool({ name: "gmp_list_schemes", arguments: {} });
    const text = JSON.stringify(result.structuredContent.data);
    expect(text).toContain("方案B");
    expect(text).not.toContain("方案A");
  });
});

test("GET /webgrp/mcp 回 405（带 Allow: POST），不挂 SSE 长连接", async () => {
  const res = await fetch(`${baseUrl}/webgrp/mcp`, { method: "GET" });
  expect(res.status).toBe(405);
  expect(res.headers.get("allow")).toBe("POST");
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("DELETE /webgrp/mcp 回 405（无状态模式没有会话可关）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/mcp`, { method: "DELETE" });
  expect(res.status).toBe(405);
  expect(res.headers.get("allow")).toBe("POST");
});

test("POST 缺 Accept: text/event-stream 回 406（SDK 的协议要求）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } }
    })
  });
  expect(res.status).toBe(406);
});

test("非本机 Origin 回 403（挡掉网页发起的跨源写操作）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      origin: "https://evil.example"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    })
  });
  expect(res.status).toBe(403);
  const body = await res.json();
  expect(body.error.message).toContain("非本机来源");
});

test("本机 Origin 放行（前端页面同源访问不被误伤）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      origin: "http://127.0.0.1:5173"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    })
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.result.tools).toHaveLength(EXPECTED_TOOL_COUNT);
});

test("未知空间回 400 SPACE_UNKNOWN（MCP 不豁免空间隔离）", async () => {
  const res = await fetch(`${baseUrl}/webgrp/mcp?space=nosuchspace`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    })
  });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("SPACE_UNKNOWN");
});

// ───────────── 多页面 token 语义（真实 WS + 真实注册表 + 真实空间解析）─────────────
//
// 这一组是本次改动最值得端到端验的地方：token 的**空间筛选**依赖 WS 注册时
// 由握手 Cookie 归位出来的 workspaceId，用假 runtimeWs 测不出来。

/**
 * 连一个真实 WS 客户端并注册指定 clientId（= 页面 token）。
 * 用 Cookie 指定空间，避免「缺 Cookie 归位到首个空间」把用例变成依赖建库顺序。
 */
function connectRuntimePage(clientId, spaceId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${baseUrl.replace(/^http/u, "ws")}/webgrp/ws`, {
      headers: { cookie: `gmp_space=${encodeURIComponent(spaceId)}` }
    });
    ws.on("open", () => ws.send(JSON.stringify({ type: "register", clientId })));
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "registered") {
        resolve(ws);
        return;
      }
      if (msg.type === "fetch") {
        // 回执里带上自己的 token：用来断言「指令真的打到了指定那一页」
        ws.send(JSON.stringify({
          type: "fetch-response",
          requestId: msg.requestId,
          ok: true,
          data: { modelName: `来自 ${clientId}`, servedBy: clientId }
        }));
      }
    });
    ws.on("error", reject);
  });
}

test("多个页面在线：不传 token 被拒（token-required 且列出可选），传了才打到指定页面", async () => {
  const pageA = await connectRuntimePage("page-aaa", "zhangsan");
  const pageB = await connectRuntimePage("page-bbb", "zhangsan");
  try {
    await withMcpClient("zhangsan", async (client) => {
      const rejected = await client.callTool({ name: "gmp_get_runtime_model", arguments: {} });
      expect(rejected.isError).toBe(true);
      expect(rejected.structuredContent.error.code).toBe("token-required");
      expect(rejected.content[0].text).toContain("page-aaa");
      expect(rejected.content[0].text).toContain("page-bbb");

      const routed = await client.callTool({
        name: "gmp_get_runtime_model",
        arguments: { token: "page-bbb" }
      });
      expect(routed.isError).toBeFalsy();
      // 真的打到了 bbb，而不是「最近活跃的那个」
      expect(routed.structuredContent.data.servedBy).toBe("page-bbb");

      const unknown = await client.callTool({
        name: "gmp_get_runtime_model",
        arguments: { token: "page-zzz" }
      });
      expect(unknown.isError).toBe(true);
      expect(unknown.structuredContent.error.code).toBe("not-found");
    });
  } finally {
    pageA.close();
    pageB.close();
  }
});

test("只有一个页面在线：不传 token 也能用（自动选中那一个）", async () => {
  const only = await connectRuntimePage("page-solo", "lisi");
  try {
    await withMcpClient("lisi", async (client) => {
      const result = await client.callTool({ name: "gmp_get_runtime_model", arguments: {} });
      expect(result.isError).toBeFalsy();
      expect(result.structuredContent.data.servedBy).toBe("page-solo");
    });
  } finally {
    only.close();
  }
});

test("别空间的 token 用不了：按空间筛选，回 not-found 而不是打到别人的页面", async () => {
  const other = await connectRuntimePage("page-other", "lisi");
  try {
    await withMcpClient("zhangsan", async (client) => {
      const result = await client.callTool({
        name: "gmp_get_runtime_model",
        arguments: { token: "page-other" }
      });
      expect(result.isError).toBe(true);
      expect(result.structuredContent.error.code).toBe("not-found");
    });
  } finally {
    other.close();
  }
});
