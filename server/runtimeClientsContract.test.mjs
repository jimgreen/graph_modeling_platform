// `/webgrp/v1/runtime/clients` 的**跨空间可见性契约**守卫。
//
// 这条端点与其它 runtime 端点不同：它是「列出」，不是「按空间取目标前端」。
// 它**刻意**跨空间可见，返回体里的 `workspaceId` 正是为此存在 —— swagger 里写明
// 「条目带 workspaceId，标明该客户端注册时所属空间」，scope 也是 "session"
// （= 可带 ?space= 筛目标客户端）而非随空间隔离。
//
// 若把列表按调用方空间过滤掉，每条的 workspaceId 就恒等于调用方空间、该字段失去意义，
// 与文档承诺相悖。所以**不要**把它当泄漏"修"掉 —— 本文件就是防这个的。
//
// 真正需要空间隔离的是数据类端点（model / devices / selection / screenshot / svg /
// e-file）：它们经 fetchFromClient 严格按空间筛，越权取不到，由 sessionSpaceFilter
// 与 runtimeRegistry 的 resolveClient / pickDefaultClient 守住。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";

installDomShim();

const LI_SI = "李四";
const COOKIE_DEFAULT = `gmp_space=${encodeURIComponent("default")}`;
const COOKIE_LI_SI = `gmp_space=${encodeURIComponent(LI_SI)}`;

let dataDir;
let server;
let baseUrl;
let wsUrl;
const opened = [];

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "clients-contract-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  const { createSpaceStore } = await import("./spaceStore.mjs");
  // 自建并注入 store：否则服务端会另建第二个实例，同进程两个写者共享 spaces.json
  const store = createSpaceStore(dataDir);
  await store.ensureInitialized();
  await store.create(LI_SI);
  server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}${apiPath("/ws")}`;
}, 60000);

afterAll(async () => {
  for (const frontend of opened) {
    try {
      frontend.ws.close();
    } catch {
      /* 已断开 */
    }
  }
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

function connectFrontend(clientId, cookie) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { headers: { cookie } });
    const frontend = { ws, clientId };
    opened.push(frontend);
    ws.on("open", () => ws.send(JSON.stringify({ type: "register", clientId })));
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "registered") resolve(frontend);
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: true, data: { who: clientId } }));
      }
    });
    ws.on("error", reject);
  });
}

async function listClients(cookie) {
  const res = await fetch(`${baseUrl}${apiPath("/v1/runtime/clients")}`, {
    headers: cookie ? { cookie } : undefined
  });
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.ok).toBe(true);
  return json.data.clients;
}

test("列表跨空间可见，且 workspaceId 标明各前端所属空间（文档承诺的契约）", async () => {
  await connectFrontend("c-default", COOKIE_DEFAULT);
  await connectFrontend("c-lisi", COOKIE_LI_SI);

  // 无 Cookie（回退到首个空间）也应看到两个空间的前端 —— 这是「列出」端点的语义
  const clients = await listClients(undefined);
  const byId = new Map(clients.map((c) => [c.clientId, c]));

  // 前提自检：两个前端都真的在线（否则「看到两个」无从谈起）
  expect(byId.has("c-default"), "前提：default 前端在线").toBe(true);
  expect(byId.has("c-lisi"), "前提：李四前端在线").toBe(true);

  // workspaceId 是这个字段存在的全部理由：标明每条属于哪个空间
  expect(byId.get("c-lisi").workspaceId).toBe(LI_SI);
  expect(byId.get("c-default").workspaceId).toBe("default");

  // 其余键也钉住（少了即契约与 swagger 响应示例不符）
  for (const c of clients) {
    expect(typeof c.clientId).toBe("string");
    expect(c.role).toBe("editor");
    expect(typeof c.registeredAt).toBe("string");
    expect(typeof c.lastActiveAt).toBe("string");
  }
}, 30000);

test("handler 不给 listClients 传空间（契约的关键锚点）", () => {
  // 只断言运行时行为是不够的：即使有人给 listClients 加了 workspaceId 参数，
  // 只要 handler 仍不传，行为看上去完全正常（变异实测两次都蒙混过关）。
  // 真正决定「列表跨空间可见」的是这一行不传参，故静态钉住。
  const src = readFileSync(
    fileURLToPath(new URL("./apiV1Runtime.mjs", import.meta.url)),
    "utf8"
  );
  expect(
    /ctx\.listClients\(\)/.test(src),
    "handleV1RuntimeClients 应调用无参 listClients()：该端点刻意跨空间可见，workspaceId 字段即为此存在"
  ).toBe(true);
  expect(
    /ctx\.listClients\(\s*spaceId\s*\)/.test(src),
    "不要给 listClients 传 spaceId：那会让每条 workspaceId 恒等于调用方空间，字段失去意义，与 swagger 承诺相悖"
  ).toBe(false);
}, 10000);

test("注册表层同样不过滤：listClients 不按空间筛（这条是 HTTP 用例的鉴别力来源）", async () => {
  // 只靠上面的 HTTP 用例不够：若有人给 listClients 加了 workspaceId 参数而 handler
  // 没传（spaceId 为 undefined），HTTP 层面看起来一切正常 —— 变异实测正是这样蒙混过关的。
  // 所以在注册表层直接钉住「不传空间即不过滤」这条契约。
  const { createRuntimeRegistry } = await import("./runtimeRegistry.mjs");
  const registry = createRuntimeRegistry();
  registry.register("c-default", () => {}, "default");
  registry.register("c-lisi", () => {}, LI_SI);

  // 不传空间 → 看到全部两个空间
  expect(registry.listClients().length).toBe(2);
  // 即使显式传了空间也不筛（该端点刻意不做隔离）——传 undefined 与不传等价
  expect(registry.listClients(undefined).length).toBe(2);
  // workspaceId 字段照常输出，这是该端点存在的意义
  const byId = new Map(registry.listClients().map((c) => [c.clientId, c.workspaceId]));
  expect(byId.get("c-lisi")).toBe(LI_SI);
  expect(byId.get("c-default")).toBe("default");
}, 10000);

test("对照：数据类端点确实按空间隔离（列表可见 ≠ 数据可取）", async () => {
  // 拿另一个空间的 clientId 去取数必须打不到人 —— 隔离靠 fetchFromClient 那条路，
  // 不是靠列表过滤。这条对照说明「列表跨空间可见」不构成数据泄漏。
  const res = await fetch(
    `${baseUrl}${apiPath("/v1/runtime/model")}?clientId=${encodeURIComponent("c-lisi")}`,
    { headers: { cookie: COOKIE_DEFAULT } }
  );
  // default 空间指名李四空间的前端 → 不生效（目标不存在于本空间）
  expect([200, 404, 503]).toContain(res.status);
  if (res.status === 200) {
    // 万一命中，返回的必须不是李四前端的数据
    const json = await res.json();
    expect(json.data?.who ?? "").not.toBe("c-lisi");
  }
}, 30000);
