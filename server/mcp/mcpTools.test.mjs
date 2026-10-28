// server/mcp/tools.mjs + server/mcp/mcpServer.mjs 的单测。
//
// 这里断言的是**工具层与 MCP 装配层**的契约：
//   · 29 个工具齐备、命名统一 gmp_ 前缀、各有描述与 annotations；
//   · 声明了 outputSchema 的工具**每次都回 structuredContent**（SDK 服务端与客户端都强制）；
//   · v1 的错误码被翻成可执行建议，且以 isError 回报（而不是抛异常）；
//   · 写操作缺前端在线会话时，错误码是 no-online-client 且文案给出下一步。
//
// 走**官方 Client + InMemoryTransport**：直接测「注册 → tools/list → tools/call」这条真实链路，
// 顺带覆盖 SDK 的输入校验与输出校验（客户端侧也会校验 structuredContent）。
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
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMcpServer } from "./mcpServer.mjs";
import { createMcpToolRegistry } from "./tools.mjs";
import { spacePathsFor } from "../spaceStore.mjs";
import { NoOnlineClientError } from "../runtimeRegistry.mjs";

const EXPECTED_TOOL_COUNT = 29;

let dataDir;
let paths;
let client;
let server;

/**
 * 假 runtimeWs：若干在线会话（回固定数据）+ 一个能拒绝的 sendCommandToClient。
 *
 * 空间必须焊在 workspaceId 上 —— v1 的 runtimeRegistry 靠它筛空间，
 * 这里模拟「本空间的在线前端」。
 *
 * @param {object} [options]
 * @param {boolean} [options.online] false 时任何 fetch/command 都抛 NoOnlineClientError
 * @param {string[]} [options.clientIds] 在线的页面 token（= WS clientId），默认一个
 */
function createFakeRuntimeWs({ online = true, clientIds = ["client-1"] } = {}) {
  const clients = online
    ? clientIds.map((clientId, index) => ({
        clientId,
        workspaceId: "zhangsan",
        role: "editor",
        registeredAt: 1700000000000,
        lastActiveAt: 1700000001000 + index
      }))
    : [];
  return {
    fetchFromClient: async (clientId, resource, params) => {
      if (!online) {
        throw new NoOnlineClientError();
      }
      if (resource === "runtime.model") {
        return { name: "模型1", modelType: "微网", nodeCount: 2 };
      }
      if (resource === "runtime.devices") {
        return [{ id: "n1", kind: "ACLoad" }];
      }
      if (resource === "runtime.selection") {
        return [];
      }
      if (resource === "runtime.snapshot") {
        return { model: {}, tree: {}, graph: {} };
      }
      if (resource === "runtime.tab") {
        return { tab: "model" };
      }
      // 页面 DOM：按 format 分派，与前端 serializeDom 同语义
      if (resource === "runtime.dom") {
        return params?.format === "html"
          ? { format: "html", title: "t", url: "u", html: "<html></html>", nodeCount: 1, totalChars: 13, truncated: false }
          : { format: "outline", title: "t", url: "u", root: { tag: "html", children: [{ tag: "body" }] }, nodeCount: 2, truncated: false };
      }
      return {};
    },
    sendCommandToClient: async (clientId, name, params) => {
      if (!online) {
        throw new NoOnlineClientError();
      }
      // 把 params 摊进回执：切空间/切模型用例要能断言「下发的是哪个 spaceId / modelId」
      return { ...(params ?? {}), id: "dev-1", command: name, clientId };
    },
    listClients: () => clients
  };
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "mcp-tools-"));
  // 预置一个方案 + 一个模型：读类工具要真的读到东西，才算测到「桥 → v1」的通路
  const schemeDir = join(dataDir, "workspaces", "zhangsan", "schemes", "files", "方案A");
  mkdirSync(schemeDir, { recursive: true });
  writeFileSync(
    join(schemeDir, "模型1.json"),
    JSON.stringify({ name: "模型1", idx: 1, nodes: [], edges: [] }),
    "utf-8"
  );
  paths = spacePathsFor(dataDir, "zhangsan");

  server = createMcpServer({
    spaceId: "zhangsan",
    paths,
    runtimeWs: createFakeRuntimeWs()
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

afterAll(async () => {
  if (client) await client.close();
  if (server) await server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test("工具清单齐备：29 个 gmp_* 工具，命名唯一，各有标题、描述与 annotations", async () => {
  const { tools } = await client.listTools();
  expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
  const names = tools.map((tool) => tool.name);
  expect(new Set(names).size).toBe(names.length);
  for (const name of names) {
    expect(name.startsWith("gmp_")).toBe(true);
  }
  for (const tool of tools) {
    expect(typeof tool.description).toBe("string");
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.annotations).toBeTruthy();
    expect(typeof tool.annotations.readOnlyHint).toBe("boolean");
  }
});

test("读工具的 outputSchema 是 { ok, data?, error? } 形状", async () => {
  const { tools } = await client.listTools();
  const listSchemes = tools.find((tool) => tool.name === "gmp_list_schemes");
  expect(listSchemes.outputSchema).toBeTruthy();
  expect(listSchemes.outputSchema.type).toBe("object");
  expect(listSchemes.outputSchema.required).toEqual(["ok"]);
  expect(Object.keys(listSchemes.outputSchema.properties).sort()).toEqual(["data", "error", "ok"]);
  // 二进制工具不声明 outputSchema（字节不是 JSON，声明了就必须每次回 structuredContent）
  const archive = tools.find((tool) => tool.name === "gmp_export_scheme_archive");
  expect(archive.outputSchema).toBeFalsy();
});

test("gmp_list_schemes 读当前空间的方案并回 structuredContent.ok=true", async () => {
  const result = await client.callTool({ name: "gmp_list_schemes", arguments: {} });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.ok).toBe(true);
  expect(result.structuredContent.data).toBeTruthy();
  expect(result.content[0].type).toBe("text");
});

test("gmp_list_scheme_models 按方案路径列出模型（数组入参 → v1 的 schemePath）", async () => {
  const result = await client.callTool({
    name: "gmp_list_scheme_models",
    arguments: { schemePath: ["方案A"] }
  });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.ok).toBe(true);
  const models = result.structuredContent.data.models;
  expect(Array.isArray(models)).toBe(true);
  expect(models.some((model) => model.name === "模型1")).toBe(true);
});

test("方案不存在时回 bad-request 语义的错误信封，且带「下一步」建议", async () => {
  const result = await client.callTool({
    name: "gmp_list_scheme_models",
    arguments: { schemePath: ["不存在的方案"] }
  });
  expect(result.isError).toBe(true);
  expect(result.structuredContent.ok).toBe(false);
  expect(result.structuredContent.error.code).toBe("not-found");
  expect(result.content[0].text).toContain("建议：");
});

test("入参不合法被 SDK 拦下（不进入 handler）", async () => {
  const result = await client.callTool({
    name: "gmp_select_devices",
    arguments: { ids: "不是数组" }
  });
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain("Invalid arguments");
});

test("gmp_export_model 在 format 不接受该参数时报错（不静默丢弃）", async () => {
  const result = await client.callTool({
    name: "gmp_export_model",
    arguments: { schemePath: ["方案A"], name: "模型1", format: "svg", templateName: "国网E格式" }
  });
  expect(result.isError).toBe(true);
  expect(result.structuredContent.error.code).toBe("bad-request");
  expect(result.structuredContent.error.message).toContain("templateName");
});

test("运行时态读工具能拿到前端会话的数据", async () => {
  const result = await client.callTool({ name: "gmp_get_runtime_model", arguments: {} });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.ok).toBe(true);
  expect(result.structuredContent.data.name).toBe("模型1");
});

test("gmp_list_runtime_clients 列出在线页面（token / workspaceId / ISO 时间）", async () => {
  const result = await client.callTool({ name: "gmp_list_runtime_clients", arguments: {} });
  expect(result.isError).toBeFalsy();
  const clients = result.structuredContent.data.clients;
  expect(clients).toHaveLength(1);
  // 出参也叫 token（与入参同词汇），v1 的 clientId 不外泄到 MCP 面
  expect(clients[0].token).toBe("client-1");
  expect(clients[0].clientId).toBeUndefined();
  expect(clients[0].workspaceId).toBe("zhangsan");
  expect(clients[0].role).toBe("editor");
  expect(typeof clients[0].registeredAt).toBe("string");
  // 文本块与结构化数据必须同源（改名后重算，否则两处不一致）
  expect(result.content[0].text).toContain("\"token\"");
  expect(result.content[0].text).not.toContain("\"clientId\"");
});

test("写操作下发到前端并回执", async () => {
  const result = await client.callTool({
    name: "gmp_add_device",
    arguments: { kind: "ACLoad", x: 10, y: 20 }
  });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.ok).toBe(true);
  expect(result.structuredContent.data.command).toBe("control.device.add");
});

test("删除类工具标了 destructiveHint（提示宿主这是破坏性操作）", async () => {
  const { tools } = await client.listTools();
  const del = tools.find((tool) => tool.name === "gmp_delete_devices");
  expect(del.annotations.readOnlyHint).toBe(false);
  expect(del.annotations.destructiveHint).toBe(true);
  const add = tools.find((tool) => tool.name === "gmp_add_device");
  expect(add.annotations.destructiveHint).toBe(false);
});

test("没有前端在线会话时，写操作回 no-online-client 且给出可执行建议", async () => {
  const offline = createMcpServer({
    spaceId: "zhangsan",
    paths,
    runtimeWs: createFakeRuntimeWs({ online: false })
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const offlineClient = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([offlineClient.connect(clientTransport), offline.connect(serverTransport)]);
  try {
    const result = await offlineClient.callTool({
      name: "gmp_add_device",
      arguments: { kind: "ACLoad" }
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe("no-online-client");
    expect(result.content[0].text).toContain("无在线客户端");
    expect(result.content[0].text).toContain("建议：");

    // 读页面 DOM 同样需要前端在线：不能因为没有会话就回一个空结构冒充「页面是空的」
    const dom = await offlineClient.callTool({ name: "gmp_get_page_dom", arguments: {} });
    expect(dom.isError).toBe(true);
    expect(dom.structuredContent.error.code).toBe("no-online-client");
  } finally {
    await offlineClient.close();
    await offline.close();
  }
});

test("缺空间上下文时工具直接拒（不静默退回默认空间）", async () => {
  const noSpace = createMcpServer({ spaceId: "", paths: null, runtimeWs: createFakeRuntimeWs() });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const noSpaceClient = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([noSpaceClient.connect(clientTransport), noSpace.connect(serverTransport)]);
  try {
    const result = await noSpaceClient.callTool({ name: "gmp_list_schemes", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.message).toContain("缺少空间上下文");
  } finally {
    await noSpaceClient.close();
    await noSpace.close();
  }
});

test("gmp_get_page_dom 默认回 outline 元素树，format=html 回整页标记", async () => {
  const outline = await client.callTool({ name: "gmp_get_page_dom", arguments: {} });
  expect(outline.isError).toBeFalsy();
  expect(outline.structuredContent.ok).toBe(true);
  expect(outline.structuredContent.data.format).toBe("outline");
  expect(outline.structuredContent.data.root.tag).toBe("html");

  const html = await client.callTool({
    name: "gmp_get_page_dom",
    arguments: { format: "html", maxChars: 20000 }
  });
  expect(html.isError).toBeFalsy();
  expect(html.structuredContent.data.format).toBe("html");
  expect(typeof html.structuredContent.data.html).toBe("string");
});

test("gmp_switch_space 把 spaceId 经 control.space.switch 下发", async () => {
  const result = await client.callTool({
    name: "gmp_switch_space",
    arguments: { spaceId: "zhangsan" }
  });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.ok).toBe(true);
  expect(result.structuredContent.data.command).toBe("control.space.switch");
  // 回执里能看到目标空间：调用方据此确认「排的是哪个空间」
  expect(result.structuredContent.data.spaceId).toBe("zhangsan");
});

test("gmp_switch_model 按 modelId 经 control.model.switch 下发", async () => {
  const result = await client.callTool({
    name: "gmp_switch_model",
    arguments: { modelId: 1 }
  });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.data.command).toBe("control.model.switch");
  expect(result.structuredContent.data.modelId).toBe(1);
});

test("gmp_switch_model 不给任何定位参数时回 bad-request（不猜模型）", async () => {
  const result = await client.callTool({ name: "gmp_switch_model", arguments: {} });
  expect(result.isError).toBe(true);
  expect(result.structuredContent.error.code).toBe("bad-request");
  expect(result.structuredContent.error.message).toContain("modelId");
});

test("gmp_switch_model 的 modelId 必须是正整数（0 与负数被拒）", async () => {
  const result = await client.callTool({
    name: "gmp_switch_model",
    arguments: { modelId: 0 }
  });
  // 0 被 zod 的 positive() 拦在 SDK 层，不会进入 handler
  expect(result.isError).toBe(true);
});

// ───────────────── 多页面 token 语义 ─────────────────

/** 起一个带指定在线页面的 server/client 对，用完即关。 */
async function withClient(onlineIds, run) {
  const server = createMcpServer({
    spaceId: "zhangsan",
    paths,
    runtimeWs: createFakeRuntimeWs({ clientIds: onlineIds })
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const scoped = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([scoped.connect(clientTransport), server.connect(serverTransport)]);
  try {
    return await run(scoped);
  } finally {
    await scoped.close();
    await server.close();
  }
}

test("会话类工具的入参是 token，不再是 clientId（对外契约改名）", async () => {
  const { tools } = await client.listTools();
  const sessionTools = tools.filter((tool) => tool.inputSchema?.properties?.token);
  expect(sessionTools.length).toBeGreaterThan(0);
  for (const tool of sessionTools) {
    expect(tool.inputSchema.properties.clientId, tool.name).toBeUndefined();
    expect(tool.inputSchema.properties.token).toBeTruthy();
  }
  // 方案/图元库这类不针对某个页面的工具不该多出 token
  const schemes = tools.find((tool) => tool.name === "gmp_list_schemes");
  expect(schemes.inputSchema.properties?.token).toBeUndefined();
});

test("本空间只有一个在线页面：不传 token 也能用（自动选那一个）", async () => {
  const result = await client.callTool({ name: "gmp_get_runtime_model", arguments: {} });
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.ok).toBe(true);
  expect(result.structuredContent.data.name).toBe("模型1");
});

test("本空间多个在线页面 + 不传 token → token-required，并列出可选 token", async () => {
  await withClient(["page-aaa", "page-bbb"], async (multi) => {
    const result = await multi.callTool({ name: "gmp_get_runtime_model", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe("token-required");
    expect(result.content[0].text).toContain("page-aaa");
    expect(result.content[0].text).toContain("page-bbb");
    expect(result.content[0].text).toContain("建议：");
  });
});

test("本空间多个在线页面 + 传对 token → 打到指定页面", async () => {
  await withClient(["page-aaa", "page-bbb"], async (multi) => {
    const result = await multi.callTool({
      name: "gmp_get_runtime_model",
      arguments: { token: "page-bbb" }
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.ok).toBe(true);
  });
});

test("传了不存在的 token → not-found（不退回最近活跃）", async () => {
  await withClient(["page-aaa", "page-bbb"], async (multi) => {
    const result = await multi.callTool({
      name: "gmp_get_runtime_model",
      arguments: { token: "page-nope" }
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe("not-found");
    expect(result.content[0].text).toContain("page-aaa");
  });
});

test("写操作同样按 token 选目标：多页面不传 token 被拒，传了才下发", async () => {
  await withClient(["page-aaa", "page-bbb"], async (multi) => {
    const rejected = await multi.callTool({
      name: "gmp_add_device",
      arguments: { kind: "ACLoad" }
    });
    expect(rejected.isError).toBe(true);
    expect(rejected.structuredContent.error.code).toBe("token-required");

    const accepted = await multi.callTool({
      name: "gmp_add_device",
      arguments: { kind: "ACLoad", token: "page-aaa" }
    });
    expect(accepted.isError).toBeFalsy();
    expect(accepted.structuredContent.data.command).toBe("control.device.add");
    expect(accepted.structuredContent.data.clientId).toBe("page-aaa");
  });
});

test("工具注册表本身返回 29 个定义，且每个都有 handler", () => {  const registry = createMcpToolRegistry({
    spaceId: "zhangsan",
    paths,
    runtimeWs: createFakeRuntimeWs()
  });
  expect(registry).toHaveLength(EXPECTED_TOOL_COUNT);
  for (const tool of registry) {
    expect(typeof tool.handler).toBe("function");
    expect(tool.title).toBeTruthy();
  }
});
