// swigger 页面所有示例的自动化验证：遍历 SWIGGER_ENDPOINTS 的每个 example，
// 构建请求发送，按接口语义断言 HTTP 状态 + 响应关键字段。
// 数据隔离：GRAPH_MODEL_DATA_DIR 指向 tmpdir（写操作不污染 repo）。
// runtime 域需前端在线：起 WS 客户端注册并响应 fetch。

import { mkdtemp, rm, mkdir, writeFile, cp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { WebSocket } from "ws";
import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { SWIGGER_ENDPOINTS } from "./swaggerPage.mjs";

let dataDir;
let createImageServer;
let server;
let baseUrl;
let wsUrl;
let wsClient;

// 复刻 swaggerPage.buildUrl 逻辑（示例值原始未编码，这里统一 encodeURIComponent）
function buildUrl(ep, params) {
  let path = ep.path;
  for (const p of ep.pathParams || []) {
    path = path.replace("{" + p.name + "}", encodeURIComponent(params[p.name] || ""));
  }
  const qs = (ep.query || []).map((q) => {
    const v = params["q_" + q.name];
    if (v === undefined || v === "") return "";
    return encodeURIComponent(q.name) + "=" + encodeURIComponent(v);
  }).filter(Boolean).join("&");
  return path + (qs ? "?" + qs : "");
}

// 构建请求选项 + body
function buildOpts(ep, params) {
  const opts = { method: ep.method };
  if (ep.body && (ep.method === "POST" || ep.method === "PUT" || ep.method === "DELETE")) {
    const bodyRaw = params.__body__;
    if (bodyRaw !== undefined && bodyRaw !== "") {
      const bodyText = typeof bodyRaw === "string" ? bodyRaw : JSON.stringify(bodyRaw);
      if (bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[")) {
        opts.headers = { "content-type": "application/json" };
        opts.body = bodyText;
      } else {
        opts.body = bodyText;
      }
    }
  }
  return opts;
}

async function fetchExample(ep, ex) {
  const params = ex.params || {};
  const url = buildUrl(ep, params);
  const opts = buildOpts(ep, params);
  const res = await fetch(`${baseUrl}${url}`, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: res.status, headers: res.headers, text, json, url };
}

// ---- runtime WS 客户端：注册并响应 fetch + command ----
// 按 resource 返回最小可序列化 data，满足各 runtime 接口断言
function runtimeResponder(resource, params) {
  switch (resource) {
    case "runtime.model":
      return { ok: true, data: { modelName: "测试模型", modelId: "k1", schemePath: "默认方案", updatedAt: "2026-01-01T00:00:00Z" } };
    case "runtime.devices":
      return { ok: true, data: { nodes: [{ id: "n1" }], edges: [] } };
    case "runtime.selection":
      return { ok: true, data: { selectedNodeIds: ["n1"], selectedNode: null } };
    case "runtime.tab":
      return { ok: true, data: { tab: params.tab || "model", title: "t", rows: [] } };
    case "runtime.snapshot":
      return { ok: true, data: { model: {}, devices: { nodes: [], edges: [] }, selection: {}, tabs: {} } };
    case "runtime.screenshot":
      return { ok: true, data: { base64: "iVBORw0KGgo=", width: 10, height: 5, mime: "image/png" } };
    case "runtime.svg":
      return { ok: true, data: "<svg></svg>" };
    case "runtime.e-file":
      return { ok: true, data: { filename: "model.e", text: "<Section>", mime: "text/plain" } };
    default:
      return { ok: false, error: { code: "fetch-failed", message: "unknown resource" } };
  }
}

// command 响应：按 name 返回最小回执，满足控制域示例断言
function commandResponder(name, params) {
  switch (name) {
    case "control.device.add":
      return { ok: true, data: { id: "n-test" } };
    case "control.scheme.create":
      return { ok: true, data: { id: "s-test", name: params.name || "新方案", path: [params.name || "新方案"] } };
    case "control.model.create":
      return { ok: true, data: { id: "m-test", name: params.name || "新模型", schemeId: "s1" } };
    case "control.devices.select":
      return { ok: true, data: { selectedIds: params.ids || [] } };
    case "control.devices.group":
      return { ok: true, data: { groupId: "g-test", name: "组合1" } };
    case "control.device.delete":
      return { ok: true, data: { deletedIds: params.ids || ["n1"] } };
    case "control.device.property.update":
      return { ok: true, data: { id: params.id, category: params.category, patched: Object.keys(params.patch || {}) } };
    case "control.save":
      return { ok: true, data: { saved: true, scope: params.scope } };
    default:
      return { ok: false, error: { code: "unknown-command", message: `unknown command: ${name}` } };
  }
}

function connectRuntimeClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "register", clientId: "swigger-test-client" }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "registered") {
        resolve(ws);
        return;
      }
      if (msg.type === "fetch") {
        const env = runtimeResponder(msg.resource, msg.params || {});
        ws.send(JSON.stringify({
          type: "fetch-response",
          requestId: msg.requestId,
          ok: env.ok,
          data: env.ok ? env.data : undefined,
          error: env.ok ? undefined : env.error
        }));
      }
      if (msg.type === "command") {
        const env = commandResponder(msg.name, msg.params || {});
        ws.send(JSON.stringify({
          type: "command-response",
          requestId: msg.requestId,
          ok: env.ok,
          data: env.ok ? env.data : undefined,
          error: env.ok ? undefined : env.error
        }));
      }
    });
    ws.on("error", reject);
  });
}

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "swigger-examples-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  // 复制 repo schemes 数据到 tmpdir，使方案域示例有真实数据可读（写操作在副本上，不污染 repo）
  const repoSchemes = resolve(process.cwd(), "data", "schemes");
  try {
    await cp(repoSchemes, join(dataDir, "schemes"), { recursive: true });
  } catch {
    // repo 无 schemes 数据则空（方案域示例可能 404，期望表相应处理）
  }
  ({ createImageServer } = await import("./image-server.mjs"));
});

afterAll(async () => {
  if (dataDir) {
    await rm(dataDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  // 每用例重置 dataDir：清空后重新复制 schemes，避免写操作（PUT/DELETE 空方案树等）污染后续只读示例
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dataDir, { recursive: true });
  const repoSchemes = resolve(process.cwd(), "data", "schemes");
  try {
    await cp(repoSchemes, join(dataDir, "schemes"), { recursive: true });
  } catch {
    // repo 无 schemes 数据则空
  }
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}/ws`;
  wsClient = await connectRuntimeClient();
});

afterEach(async () => {
  if (wsClient) {
    wsClient.close();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---- 期望表：按 path + 示例 label 断言 ----
// 每条返回 { status, check: (r) => void }
function expectFor(ep, ex) {
  const p = ep.path;
  const label = ex.label;

  // runtime 域：均需前端在线，状态 200（clients 直返，其余经 WS 透传成功）
  if (p === "/api/v1/runtime/clients") return { status: 200, check: (r) => expect(r.json.data.clients).toBeInstanceOf(Array) };
  if (p === "/api/v1/runtime/model") return { status: 200, check: (r) => expect(r.json.data.modelName).toBe("测试模型") };
  if (p === "/api/v1/runtime/devices") return { status: 200, check: (r) => expect(r.json.data.nodes).toBeInstanceOf(Array) };
  if (p === "/api/v1/runtime/selection") return { status: 200, check: (r) => expect(r.json.data.selectedNodeIds).toBeInstanceOf(Array) };
  if (p === "/api/v1/runtime/tabs") return { status: 200, check: (r) => expect(r.json.data.tabs).toBeTruthy() };
  if (p === "/api/v1/runtime/tabs/{tab}") return { status: 200, check: (r) => expect(r.json.data.tab).toBeTruthy() };
  if (p === "/api/v1/runtime/screenshot") return { status: 200, check: (r) => expect(r.headers.get("content-type")).toContain("image/png") };
  if (p === "/api/v1/runtime/svg") return { status: 200, check: (r) => expect(r.headers.get("content-type")).toContain("image/svg") };
  if (p === "/api/v1/runtime/e-file") return { status: 200, check: (r) => expect(r.headers.get("content-type")).toContain("text/plain") };

  // 图片域
  if (p === "/api/images" && ep.method === "GET") return { status: 200, check: (r) => expect(Array.isArray(r.json)).toBe(true) };
  if (p === "/api/images" && ep.method === "POST") return { status: 201, check: (r) => { expect(r.json.id).toBeTruthy(); expect(r.json.url).toContain("/api/images/"); } };
  if (p === "/api/image-folders" && ep.method === "GET") return { status: 200, check: (r) => expect(Array.isArray(r.json)).toBe(true) };
  if (p === "/api/image-folders" && ep.method === "POST") return { status: 201, check: (r) => expect(r.json.id).toBeTruthy() };
  if (p === "/api/image-folders/{folderId}" && ep.method === "PUT") {
    // root 不可重命名 → 400
    return { status: 400, check: (r) => expect(r.json.error).toBeTruthy() };
  }
  if (p === "/api/image-folders/{folderId}" && ep.method === "DELETE") {
    // root 不可删 → 400
    return { status: 400, check: (r) => expect(r.json.error).toBeTruthy() };
  }
  if (p === "/api/images/{id}") {
    // 示例 id 为空 → 不存在 → 404
    return { status: 404, check: (r) => expect(r.json.error).toBeTruthy() };
  }

  // 方案域（内部）
  if (p === "/api/schemes" && ep.method === "GET") return { status: 200, check: (r) => expect(r.json.schemes).toBeInstanceOf(Array) };
  if (p === "/api/schemes" && ep.method === "PUT") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/schemes/export") return { status: 200, check: (r) => expect(r.headers.get("content-type")).toContain("application/zip") };
  if (p === "/api/schemes/import") {
    // 非 zip body → 400
    return { status: 400, check: (r) => expect(r.json.error).toBeTruthy() };
  }
  if (p === "/api/schemes/project" && ep.method === "GET") {
    // 复制了 repo schemes 数据，模型存在 → 200
    return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  }
  if (p === "/api/schemes/project" && ep.method === "PUT") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/schemes/project" && ep.method === "DELETE") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/schemes/scheme" && ep.method === "PUT") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/schemes/scheme" && ep.method === "DELETE") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };

  // 配置域
  if (p === "/api/color-config" && ep.method === "GET") return { status: 200, check: (r) => expect(r.json).toBeTruthy() };
  if (p === "/api/color-config" && ep.method === "PUT") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/measurement-config" && ep.method === "GET") return { status: 200, check: (r) => expect(r.json).toBeTruthy() };
  if (p === "/api/measurement-config" && ep.method === "PUT") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/device-library" && ep.method === "GET") return { status: 200, check: (r) => expect(r.json).toBeTruthy() };
  if (p === "/api/device-library" && ep.method === "PUT") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };

  // v1 方案域
  if (p === "/api/v1/schemes" && ep.method === "GET") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/v1/schemes/hierarchy") return { status: 200, check: (r) => expect(r.json.data.nodes).toBeInstanceOf(Array) };
  if (p === "/api/v1/schemes/models") return { status: 200, check: (r) => expect(r.json.data.models).toBeInstanceOf(Array) };
  if (p === "/api/v1/schemes/export") return { status: 200, check: (r) => expect(r.headers.get("content-type")).toContain("application/zip") };
  if (p === "/api/v1/schemes/model/json") return { status: 200, check: (r) => expect(r.json.ok).toBe(true) };
  if (p === "/api/v1/schemes/model/svg") return { status: 200, check: (r) => expect(r.headers.get("content-type")).toContain("image/svg") };

  // v1 图元库域
  if (p === "/api/v1/library") return { status: 200, check: (r) => expect(r.json.data.categories).toBeInstanceOf(Array) };
  if (p === "/api/v1/library/categories") return { status: 200, check: (r) => expect(r.json.data.categories).toBeInstanceOf(Array) };
  if (p === "/api/v1/library/devices") return { status: 200, check: (r) => expect(r.json.data.eSections).toBeInstanceOf(Array) };
  if (p === "/api/v1/library/measurements") return { status: 200, check: (r) => expect(r.json.data.measurementTypes).toBeInstanceOf(Array) };
  if (p === "/api/v1/library/device-definitions") return { status: 200, check: (r) => expect(r.json.data).toBeTruthy() };
  if (p === "/api/v1/library/templates") return { status: 200, check: (r) => expect(r.json.data).toBeTruthy() };

  // v1 控制台域（经 WS 下发前端，测试 WS 客户端模拟回执）
  if (p === "/api/v1/control/device/add") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.id).toBeTruthy(); } };
  if (p === "/api/v1/control/scheme/create") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.id).toBeTruthy(); } };
  if (p === "/api/v1/control/model/create") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.id).toBeTruthy(); } };
  if (p === "/api/v1/control/devices/select") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.selectedIds).toBeInstanceOf(Array); } };
  if (p === "/api/v1/control/devices/group") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.groupId).toBeTruthy(); } };
  if (p === "/api/v1/control/device/delete") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.deletedIds).toBeInstanceOf(Array); } };
  if (p === "/api/v1/control/device/property/update") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.id).toBeTruthy(); } };
  if (p === "/api/v1/control/save") return { status: 200, check: (r) => { expect(r.json.ok).toBe(true); expect(r.json.data.saved).toBe(true); } };

  throw new Error(`未定义期望: ${ep.method} ${p} (示例: ${label})`);
}

// 动态生成测试：每个接口的每个示例一个 test
describe("swigger 所有示例自动化验证", () => {
  for (const ep of SWIGGER_ENDPOINTS) {
    describe(`${ep.method} ${ep.path}`, () => {
      for (const ex of ep.examples || []) {
        test(`示例「${ex.label}」`, async () => {
          const exp = expectFor(ep, ex);
          const r = await fetchExample(ep, ex);
          expect(r.status).toBe(exp.status);
          exp.check(r);
        });
      }
    });
  }
});
