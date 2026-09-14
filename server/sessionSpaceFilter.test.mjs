// 会话类端点（runtime 10 + control 11）按空间筛目标前端：
// `?space=`（显式）与「调用方自身解析出的空间」（隐式，通常 default）都必须打到**该空间**的
// 在线前端，不得跨空间打靶；指名 clientId 时空间也要相符。
//
// 真实两空间环境：dataRoot 下建出「李四」，两个前端各带自己的 gmp_space Cookie 上线。
// 鉴别力来源逐例说明：用例 2/3（跨空间筛选）靠「前提自检 + 反转活跃度」——先证明不筛空间时
// 会取到**另一个**前端，断言才有意义；用例 1（无 Cookie 归位）靠「取消归位即 503」取得区分度；
// 用例 4 用显式 clientId，不依赖活跃度。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";

installDomShim();

const LI_SI = "李四";
// 非 ASCII 空间名在 Cookie / 头里必须 percent-encode（ByteString 限制），服务端解一次
const LI_SI_ENC = encodeURIComponent(LI_SI);
const COOKIE_DEFAULT = `gmp_space=${encodeURIComponent("default")}`;
const COOKIE_LI_SI = `gmp_space=${LI_SI_ENC}`;

let dataDir;
let server;
let baseUrl;
let wsUrl;
const opened = [];

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "session-space-"));
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
      // 已断开
    }
  }
  if (server) await new Promise((r) => server.close(r));
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

// 连一个前端并注册 clientId；Cookie 决定它被归位到哪个空间。
// 同时响应 fetch（运行时态）与 command（写指令），都回 { who: clientId } 供断言目标是谁。
//
// 本文件多处依赖「谁最近活跃」来制造鉴别力，而 lastActiveAt 是 Date.now() 毫秒精度：
// loopback 上两次握手常常落在同一毫秒，不显式隔开就会随机红（评审连跑 7 次红 3 次）。
// 故所有「先连 A 再连 B，要求 B 更活跃」的编排都必须经过 connectGap()。
const ACTIVITY_GAP_MS = 20; // > 1ms 计时精度，确保 lastActiveAt 严格不等

const connectGap = () => new Promise((r) => setTimeout(r, ACTIVITY_GAP_MS));

function connectFrontend(clientId, cookie) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { headers: { cookie } });
    const frontend = { ws, clientId, onPong: null };
    opened.push(frontend);
    ws.on("open", () => ws.send(JSON.stringify({ type: "register", clientId })));
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "registered") {
        resolve(frontend);
        return;
      }
      if (msg.type === "pong") {
        frontend.onPong?.();
        return;
      }
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({
          type: "fetch-response",
          requestId: msg.requestId,
          ok: true,
          data: { who: clientId, resource: msg.resource }
        }));
        return;
      }
      if (msg.type === "command") {
        ws.send(JSON.stringify({
          type: "command-response",
          requestId: msg.requestId,
          ok: true,
          data: { who: clientId, name: msg.name }
        }));
      }
    });
    ws.on("error", reject);
  });
}

// 让该前端成为「最近活跃」者：任何消息都会让服务端 touch 它（选默认客户端看 lastActiveAt）
async function makeMostRecent(frontend) {
  await connectGap(); // 与上一次注册隔开，否则 touch 可能与注册同毫秒
  return new Promise((resolve) => {
    frontend.onPong = resolve;
    frontend.ws.send(JSON.stringify({ type: "ping" }));
  });
}

async function fetchV1(pathname, init) {
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const json = await res.json();
  return { status: res.status, data: json?.data, code: json?.error?.code };
}

// 运行时态端点：谁是目标前端由 data.who 观测
const runtimeWho = (query = "") => fetchV1(`${apiPath("/v1/runtime/devices")}${query}`);

// 控制台写指令端点：data.who 为收到指令的前端
const controlWho = (query = "") =>
  fetchV1(`${apiPath("/v1/control/device/add")}${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "busbar" })
  });

// 前提自检：不做空间筛选时「谁最活跃」，即会被选中的那个
async function lastActive(clientId) {
  const { data } = await fetchV1(apiPath("/v1/runtime/clients"));
  return Date.parse(data.clients.find((c) => c.clientId === clientId)?.lastActiveAt);
}

test("无 Cookie 的前端归位到首个空间，无空间的调用方仍能选中它", async () => {
  const anon = await connectFrontend("c-anon", "");
  // 不归位（存空串）时：调用方解析成 default、客户端是 "" → 503 no-online-client
  expect(await runtimeWho()).toMatchObject({ status: 200, data: { who: "c-anon" } });
});

test("runtime：?space= 只打到该空间的前端（两个方向各一次）", async () => {
  const lisi = await connectFrontend("c-lisi", COOKIE_LI_SI);
  await connectGap();
  const def = await connectFrontend("c-def", COOKIE_DEFAULT); // 更晚注册 → 更活跃
  expect(await lastActive("c-def")).toBeGreaterThan(await lastActive("c-lisi"));

  // 不筛空间时必然取 c-def，故这条只在「筛到了李四空间」时通过
  expect(await runtimeWho(`?space=${LI_SI_ENC}`)).toMatchObject({ status: 200, data: { who: "c-lisi" } });

  await makeMostRecent(lisi); // 反转活跃度：不筛空间时必然取 c-lisi
  expect(await lastActive("c-lisi")).toBeGreaterThan(await lastActive("c-def"));
  expect(await runtimeWho("?space=default")).toMatchObject({ status: 200, data: { who: "c-def" } });
  // 两者都没带 → 按调用方自身空间（无 Cookie/头 → default）
  expect(await runtimeWho()).toMatchObject({ status: 200, data: { who: "c-def" } });
});

test("control：?space= 只打到该空间的前端（两个方向各一次）", async () => {
  const lisi = await connectFrontend("c-lisi", COOKIE_LI_SI);
  await connectGap();
  const def = await connectFrontend("c-def", COOKIE_DEFAULT); // 更晚注册 → 更活跃
  expect(await lastActive("c-def")).toBeGreaterThan(await lastActive("c-lisi"));

  expect(await controlWho(`?space=${LI_SI_ENC}`)).toMatchObject({ status: 200, data: { who: "c-lisi" } });

  await makeMostRecent(lisi);
  expect(await lastActive("c-lisi")).toBeGreaterThan(await lastActive("c-def"));
  expect(await controlWho("?space=default")).toMatchObject({ status: 200, data: { who: "c-def" } });
  expect(await controlWho()).toMatchObject({ status: 200, data: { who: "c-def" } });
});

test("指名 clientId 时空间必须相符：跨空间指名 503", async () => {
  const lisi = await connectFrontend("c-lisi", COOKIE_LI_SI);
  const def = await connectFrontend("c-def", COOKIE_DEFAULT);
  // c-def 属 default，却要李四空间 → 拒绝（不做空间校验时会打到 c-def 并返 200）
  expect(await runtimeWho(`?space=${LI_SI_ENC}&clientId=c-def`)).toMatchObject({
    status: 503,
    code: "no-online-client"
  });
  expect(await controlWho(`?space=${LI_SI_ENC}&clientId=c-def`)).toMatchObject({
    status: 503,
    code: "no-online-client"
  });
  // 空间相符时照样命中（证明上面不是因为别的成因）
  expect(await controlWho("?space=default&clientId=c-def")).toMatchObject({ status: 200, data: { who: "c-def" } });
  expect(await runtimeWho(`?space=${LI_SI_ENC}&clientId=c-lisi`)).toMatchObject({
    status: 200,
    data: { who: "c-lisi" }
  });
});

test("/v1/runtime/clients 条目在 HTTP 层带 workspaceId（取自该前端的空间 Cookie）", async () => {
  // 鉴别力：workspaceId 只可能来自 WS 握手 Cookie —— handler 若再把它从白名单里丢回去，
  // 或换成一个常量（如恒 "default"），本条即红。
  // 断言必须打在 HTTP 响应上：注册表层 listClients 的单测覆盖不到白名单重映射这一层，
  // 而"文档承诺了、HTTP 契约却没有"的漏洞正是出在那里。
  await connectFrontend("c-lisi", COOKIE_LI_SI);
  await connectFrontend("c-def", COOKIE_DEFAULT);
  const { status, data } = await fetchV1(apiPath("/v1/runtime/clients"));
  expect(status).toBe(200);
  const byId = new Map(data.clients.map((c) => [c.clientId, c]));
  // 顺带钉住 swigger 文档承诺的整个条目形状：少任一键即契约与文档不符
  expect(byId.get("c-lisi")).toMatchObject({ clientId: "c-lisi", workspaceId: LI_SI, role: "editor" });
  expect(typeof byId.get("c-lisi").registeredAt).toBe("string");
  expect(typeof byId.get("c-lisi").lastActiveAt).toBe("string");
  expect(byId.get("c-def").workspaceId).toBe("default");
});
