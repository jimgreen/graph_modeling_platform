import { createServer } from "node:http";
import { describe, expect, test, afterEach, beforeEach, vi } from "vitest";
import { WebSocket } from "ws";
import { createRuntimeRegistry } from "./runtimeRegistry.mjs";
import { attachRuntimeWebSocket } from "./runtimeWs.mjs";
import { apiPath } from "./config.mjs";

// WS 集成测试：起真实 http server + WS 升级，用真实 ws 客户端连接。
let httpServer;
let runtime;
let baseUrl;
let wsUrl;

async function startRuntimeServer() {
  httpServer = createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  const registry = createRuntimeRegistry();
  runtime = attachRuntimeWebSocket(httpServer, registry);
  await new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  const port = httpServer.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}/webgrp/ws`;
}

function connectClient(clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const received = [];
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "register", clientId }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      received.push(msg);
      if (msg.type === "registered") {
        resolve({ ws, received, clientId });
      }
    });
    ws.on("error", reject);
  });
}

// 只连不注册：用于「未 register 就发消息」这类分支
function connectRaw() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const received = [];
    ws.on("open", () => resolve({ ws, received }));
    ws.on("message", (raw) => received.push(JSON.parse(String(raw))));
    ws.on("error", reject);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 把 registry 的可观测入口包一层调用计数。
// 「静默分支」的判别力全靠它：断言「计数器没涨」必须配一条对照（「合法消息会涨」），
// 否则就退化成废断言（没抛错本来就恒成立）。
// runtimeWs 每处都是 registry.touch(...) 的属性查找，包一层即可被观测到。
function spyRegistry(registry) {
  const counters = {};
  for (const name of ["register", "unregister", "touch", "resolveFetch", "resolveCommand"]) {
    counters[name] = [];
    const original = registry[name].bind(registry);
    registry[name] = (...args) => {
      counters[name].push(args);
      return original(...args);
    };
  }
  return counters;
}

/**
 * 装一套「假时钟下的」attachRuntimeWebSocket。
 *
 * 为什么要另起一个 server：sweepTimer 是在 attachRuntimeWebSocket 内部、
 * 用模块作用域的 setInterval 建的（周期 15s，源码未 unref）。
 * beforeEach 里那套已经用真定时器建好了，vi.useFakeTimers() 装得太晚就驱动不了它。
 * 所以这里先装假定时器、再 attach，让 sweepTimer 本身落在假时钟上。
 *
 * 返回 { registry, seedStaleClient, close, unregisterCalls }。
 * unregisterCalls 是清理次数计数器 —— 本测试全部断言都挂在它上面，
 * 因为「定时器不再触发」只能通过「清理不再发生」来观测。
 */
async function withFakeTimersOnFreshServer() {
  vi.useFakeTimers();
  const scopedServer = createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  const scopedRegistry = createRuntimeRegistry();
  const unregisterCalls = [];
  const originalUnregister = scopedRegistry.unregister.bind(scopedRegistry);
  scopedRegistry.unregister = (...args) => {
    unregisterCalls.push(args);
    return originalUnregister(...args);
  };
  attachRuntimeWebSocket(scopedServer, scopedRegistry);

  await new Promise((resolve) => scopedServer.listen(0, "127.0.0.1", resolve));

  // 假时钟下 Date.now 也被冻结/可推进；lastActiveAt=0 保证恒早于 60s 截止线。
  // 直接写 _clients 而不是 register()：register 会把 lastActiveAt 设为 now()，
  // 而推进假时钟 15s 远不到 60s 阈值，那样种进去就永远不会被清理，测不到东西。
  function seedStaleClient(clientId) {
    scopedRegistry._clients.set(clientId, {
      clientId,
      workspaceId: "",
      send: () => {},
      registeredAt: 0,
      lastActiveAt: 0,
      pendingFetches: new Map(),
      pendingCommands: new Map()
    });
  }

  async function close() {
    await new Promise((resolve) => scopedServer.close(resolve));
  }

  function restore() {
    vi.useRealTimers();
  }

  return { server: scopedServer, registry: scopedRegistry, seedStaleClient, close, restore, unregisterCalls };
}

beforeEach(async () => {
  await startRuntimeServer();
});

afterEach(async () => {
  // 假时钟必须复位：否则后续用例会继承被冻结的 Date 与被吞掉的定时器
  vi.useRealTimers();
  if (runtime?.wss) {
    // 先关所有 WS 连接，释放 server.close 阻塞
    for (const client of runtime.wss.clients) {
      client.terminate();
    }
    runtime.wss.close();
  }
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

describe("runtimeWs 连接与注册", () => {
  test("客户端连接并发 register，收到 registered", async () => {
    const { received } = await connectClient("c1");
    expect(received.some((m) => m.type === "registered" && m.clientId === "c1")).toBe(true);
    expect(runtime.listClients()).toHaveLength(1);
  });

  test("未带 clientId 的 register 被关闭", async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.on("open", resolve));
    ws.send(JSON.stringify({ type: "register", clientId: "" }));
    const code = await new Promise((resolve) => ws.on("close", (c) => resolve(c)));
    expect(code).toBe(4001);
  });

  test("客户端断开后从注册表移除", async () => {
    const { ws } = await connectClient("c1");
    expect(runtime.listClients()).toHaveLength(1);
    ws.close();
    await new Promise((resolve) => ws.on("close", resolve));
    // 等待 server 端 close 事件处理
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(runtime.listClients()).toHaveLength(0);
  });
});

describe("runtimeWs 心跳", () => {
  test("ping 收到 pong", async () => {
    const { ws, received } = await connectClient("c1");
    ws.send(JSON.stringify({ type: "ping" }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received.some((m) => m.type === "pong")).toBe(true);
    ws.close();
  });
});

describe("runtimeWs fetch 拉取", () => {
  test("server 向客户端 fetch，客户端响应 data 透传", async () => {
    const { ws } = await connectClient("c1");
    // 客户端监听 fetch 并响应
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: true, data: { model: "m1" } }));
      }
    });
    const data = await runtime.fetchFromClient("c1", "runtime.snapshot");
    expect(data).toEqual({ model: "m1" });
    ws.close();
  });

  test("客户端响应 error 透传", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: false, error: { code: "no-selection", message: "未选中" } }));
      }
    });
    await expect(runtime.fetchFromClient("c1", "runtime.selection")).rejects.toMatchObject({ code: "no-selection" });
    ws.close();
  });

  test("无在线客户端抛 NoOnlineClientError", async () => {
    await expect(runtime.fetchFromClient("nope", "runtime.snapshot")).rejects.toMatchObject({ code: "no-online-client" });
  });

  test("默认客户端选择（不指定 clientId）", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        ws.send(JSON.stringify({ type: "fetch-response", requestId: msg.requestId, ok: true, data: { ok: true } }));
      }
    });
    const data = await runtime.fetchFromClient(undefined, "runtime.snapshot");
    expect(data).toEqual({ ok: true });
    ws.close();
  });

  test("超时无响应 reject", async () => {
    const { ws } = await connectClient("c1");
    // 客户端不响应 fetch
    await expect(runtime.fetchFromClient("c1", "runtime.snapshot")).rejects.toMatchObject({ code: "ws-timeout" });
    ws.close();
  }, 10000);
});

describe("runtimeWs command 指令通道", () => {
  test("server 下发 command，客户端响应 data 透传", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "command") {
        expect(msg.name).toBe("control.device.add");
        expect(msg.params).toEqual({ kind: "busbar" });
        ws.send(JSON.stringify({ type: "command-response", requestId: msg.requestId, ok: true, data: { id: "n1" } }));
      }
    });
    const data = await runtime.sendCommandToClient("c1", "control.device.add", { kind: "busbar" });
    expect(data).toEqual({ id: "n1" });
    ws.close();
  });

  test("客户端响应失败透传带 code", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "command") {
        ws.send(JSON.stringify({ type: "command-response", requestId: msg.requestId, ok: false, error: { code: "bad-request", message: "kind 必填" } }));
      }
    });
    await expect(runtime.sendCommandToClient("c1", "control.device.add", {})).rejects.toMatchObject({ code: "bad-request", message: "kind 必填" });
    ws.close();
  });

  test("无在线客户端抛 NoOnlineClientError", async () => {
    await expect(runtime.sendCommandToClient("nope", "control.device.add", {})).rejects.toMatchObject({ code: "no-online-client" });
  });

  test("默认客户端选择（不指定 clientId）", async () => {
    const { ws } = await connectClient("c1");
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "command") {
        ws.send(JSON.stringify({ type: "command-response", requestId: msg.requestId, ok: true, data: { ok: true } }));
      }
    });
    const data = await runtime.sendCommandToClient(undefined, "control.device.add", {});
    expect(data).toEqual({ ok: true });
    ws.close();
  });

  test("超时无响应 reject", async () => {
    const { ws } = await connectClient("c1");
    // 客户端不响应 command
    await expect(runtime.sendCommandToClient("c1", "control.device.add", {})).rejects.toMatchObject({ code: "ws-timeout" });
    ws.close();
  }, 10000);
});

describe("runtimeWs 非 /ws 升级", () => {
  test("/other WS 升级被拒绝", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${httpServer.address().port}/other`);
    await expect(new Promise((_, reject) => {
      ws.on("error", reject);
    })).rejects.toBeTruthy();
  });
});

/**
 * Origin 校验 —— WebSocket 不受同源策略约束，这是经典 CSWSH（跨站 WebSocket 劫持）。
 *
 * 服务只听 127.0.0.1，但「本机可达」不等于「只有本机页面能连」：诱导用户打开一个
 * 恶意网页后，其中的脚本就能连上 /webgrp/ws，注册成客户端 ——
 *   - 读到运行时态（模型 / 图元 / 量测 / 截图 / E 文件）
 *   - 把伪造的 fetch-response 回给 v1 接口的调用方（WS 桥接信任已注册客户端的应答）
 * 所以升级时按 isAllowedNativeExportOrigin 的同一份策略校验 Origin。
 */
describe("runtimeWs Origin 校验（CSWSH 防护）", () => {
  async function connectWithOrigin(origin) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, { origin });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error("超时：连接既未建立也未失败"));
      }, 5000);
      ws.on("open", () => {
        clearTimeout(timer);
        resolve(ws);
      });
      ws.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  test("恶意站点 origin 被拒（连接直接断开，连不上）", async () => {
    await expect(connectWithOrigin("https://evil.example.com")).rejects.toBeTruthy();
  });

  test("非 http/https 协议的 origin 被拒（如 file://、null）", async () => {
    await expect(connectWithOrigin("file:///C:/evil.html")).rejects.toBeTruthy();
    await expect(connectWithOrigin("null")).rejects.toBeTruthy();
  });

  test("本机 origin 被放行（开发时 Vite 在 5173、后端在 5174，属正常路径）", async () => {
    for (const origin of ["http://127.0.0.1:5173", "http://localhost:5173"]) {
      const ws = await connectWithOrigin(origin);
      expect(ws.readyState, `${origin} 应连接成功`).toBe(WebSocket.OPEN);
      ws.close();
    }
  });

  test("无 Origin 头放行（非浏览器客户端：Node ws / 集成脚本）", async () => {
    // Node 的 ws 客户端默认不发 Origin；既有测试与外部集成脚本依赖这条路径
    const ws = await connectWithOrigin(undefined);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });
});

/**
 * 消息入口的静默分支。
 *
 * 这几条分支的共同形态是「什么都没发生」，因此只断言「没抛错」是废断言：
 * 删掉任何一条 return，测试照样全绿。判别力必须来自**一个可观测的正向结果没发生**，
 * 所以下面每条都断言计数器 / 注册表状态 / 收到的消息列表保持不变，
 * 并且在同一用例里配一条「合法消息会改变它」的对照 —— 没有对照，
 * 「计数器为 0」和「计数器测错了」看起来一模一样。
 */
describe("runtimeWs 消息入口静默分支", () => {
  test("非 JSON 文本消息被忽略：不 touch 注册表、不回任何消息、连接保持", async () => {
    const counters = spyRegistry(runtime.registry);
    const { ws, received } = await connectClient("c1");
    expect(runtime.listClients()).toHaveLength(1);
    const touchAfterRegister = counters.touch.length;
    expect(touchAfterRegister, "对照：register 本身不 touch，但下面合法 ping 会 touch").toBe(0);

    // 三种典型的坏载荷：纯文本、截断 JSON、空串
    for (const junk of ["这不是 JSON", '{"type":', ""]) {
      ws.send(junk);
    }
    await delay(80);

    // 正向可观测结果 1：safeParseMessage 在 touch 之前就 return 了
    expect(counters.touch.length).toBe(touchAfterRegister);
    // 正向可观测结果 2：没有任何消息被回发（既没有 pong，也没有意外分支）
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("registered");
    // 正向可观测结果 3：注册表状态未变，连接没被踢
    expect(runtime.listClients()).toHaveLength(1);
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // 对照：同一连接上合法 ping 会真的推进 touch 并回 pong
    ws.send(JSON.stringify({ type: "ping" }));
    await delay(80);
    expect(counters.touch.length).toBeGreaterThan(touchAfterRegister);
    expect(received.some((m) => m.type === "pong")).toBe(true);
    ws.close();
  });

  test("合法 JSON 但不是普通对象的载荷：数组会推进 touch，字符串与数字在 parse 关就被打回", async () => {
    const counters = spyRegistry(runtime.registry);
    const { ws, received } = await connectClient("c1");
    // 对照：register 本身不调用 touch，故起点为 0
    expect(counters.touch).toHaveLength(0);
    expect(counters.register).toHaveLength(1);

    // safeParseMessage 的闸门是 `parsed && typeof parsed === "object"`，
    // 数组的 typeof 正是 object —— 故数组**能过这一关**，继续走到 registry.touch；
    // 而字符串 / 数字 / 布尔在 parse 关就被打回 null，压根到不了 touch。
    // 断言 touch 恰好被推进一次（只有数组那条），这条断言对
    // 「把 typeof 关改成只判真值」是红的（那样字符串也会推进 touch）。
    ws.send("[]");
    await delay(80);
    expect(counters.touch).toHaveLength(1);

    for (const payload of ['"hello"', "42", "true", "false"]) {
      ws.send(payload);
    }
    await delay(80);
    expect(counters.touch).toHaveLength(1);

    // null 走的是 `parsed` 为假那条，同样在 parse 关被打回
    ws.send("null");
    await delay(80);
    expect(counters.touch).toHaveLength(1);

    // 正向结果：无一注册、无一派发、无一回发，连接未被动过
    expect(counters.register).toHaveLength(1);
    expect(runtime.listClients()).toHaveLength(1);
    expect(counters.resolveFetch).toHaveLength(0);
    expect(counters.resolveCommand).toHaveLength(0);
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("registered");
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // 对照：真正的 ping 一定回 pong，且 touch 继续推进
    ws.send(JSON.stringify({ type: "ping" }));
    await delay(80);
    expect(counters.touch).toHaveLength(2);
    expect(received.some((m) => m.type === "pong")).toBe(true);
    ws.close();
  });

  test("未 register 就发消息被忽略：ping 与 fetch-response 都不生效", async () => {
    const counters = spyRegistry(runtime.registry);
    const { ws, received } = await connectRaw();

    // 未注册时发 ping：若 `if (!registeredEntry) return` 被删，
    // 这里的 clientId 为 null，touch 会以 null 入参被调用并被计数器看到。
    ws.send(JSON.stringify({ type: "ping" }));
    await delay(80);
    expect(counters.touch).toHaveLength(0);
    expect(received).toHaveLength(0);

    // 未注册时发 fetch-response：若守卫被删，registry.resolveFetch 会被调用
    ws.send(JSON.stringify({ type: "fetch-response", requestId: "req-x", ok: true, data: { model: "m" } }));
    ws.send(JSON.stringify({ type: "command-response", requestId: "req-y", ok: true, data: { id: "n" } }));
    await delay(80);
    expect(counters.resolveFetch).toHaveLength(0);
    expect(counters.resolveCommand).toHaveLength(0);
    expect(runtime.listClients()).toHaveLength(0);
    expect(received).toHaveLength(0);
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // 对照：先 register 再发同样的 ping，pong 立刻回来、touch 计数推进
    ws.send(JSON.stringify({ type: "register", clientId: "late" }));
    await delay(80);
    expect(runtime.listClients()).toHaveLength(1);
    ws.send(JSON.stringify({ type: "ping" }));
    await delay(80);
    expect(counters.touch.length).toBe(1);
    expect(received.some((m) => m.type === "pong")).toBe(true);
    ws.close();
  });

  test("已注册但 type 未知时被忽略：不结算挂起的 fetch 与 command", async () => {
    const counters = spyRegistry(runtime.registry);
    const { ws, received } = await connectClient("c1");

    // 真发一次 fetch，让服务端挂起一个 pending
    let fetchRequestId;
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "fetch") {
        fetchRequestId = msg.requestId;
      }
    });
    const pending = runtime.fetchFromClient("c1", "runtime.snapshot");
    pending.catch(() => {});
    await delay(80);
    expect(typeof fetchRequestId).toBe("string");

    // 未知 type —— 若末尾的「忽略」被换成兜底派发，这里就会误结算 pending
    ws.send(JSON.stringify({ type: "fetch-response-x", requestId: fetchRequestId, ok: true, data: { model: "wrong" } }));
    ws.send(JSON.stringify({ type: "", requestId: fetchRequestId, ok: true, data: { model: "wrong" } }));
    ws.send(JSON.stringify({ type: 123, ok: true }));
    await delay(120);

    expect(counters.resolveFetch).toHaveLength(0);
    expect(counters.resolveCommand).toHaveLength(0);
    // 未知 type 会走到 registry.touch（它在 type 分派之前），所以 touch 会涨——
    // 这条是「被忽略」与「被丢弃在 touch 之前」两条分支的边界：
    // 只有 message 为 null（非 JSON / 非对象）才在 touch 之前 return。
    expect(counters.touch.length).toBeGreaterThan(0);

    // 对照：真 fetch-response 立刻结算，pending 得到正确的 data
    ws.send(JSON.stringify({ type: "fetch-response", requestId: fetchRequestId, ok: true, data: { model: "right" } }));
    await expect(pending).resolves.toEqual({ model: "right" });
    expect(counters.resolveFetch).toHaveLength(1);
    ws.close();
  }, 10000);

  test("server close 后清理定时器不再触发：超时条目不再被 unregister", async () => {
    // sweepTimer 在 attachRuntimeWebSocket 里由 setInterval 建立，
    // 周期 HEARTBEAT_CHECK_INTERVAL_MS = 15s，且源码未 unref()。
    // 真实等待 30s 太慢且易抖动，故改为：直接驱动那条回调所依赖的定时器语义 ——
    // 用假定时器重放一次「close 之前会清理、close 之后不再清理」。
    // 但 attachRuntimeWebSocket 已在 beforeEach 用真 setInterval 建好定时器，
    // 故这里另起一套 http server + registry，在装上假定时器之后再 attach，
    // 这样 sweepTimer 本身就走假时钟，可被 vi.advanceTimersByTime 驱动。
    const scoped = await withFakeTimersOnFreshServer();

    // 超时条目：lastActiveAt 远早于 60s 阈值
    scoped.seedStaleClient("stale");
    expect(scoped.registry._clients.has("stale")).toBe(true);

    // 对照：close 之前推进一个清理周期，超时条目确实被清掉
    // （若这条不成立，下面的「不再清理」就是恒真的废断言）
    await vi.advanceTimersByTimeAsync(15_000);
    expect(scoped.unregisterCalls).toHaveLength(1);
    expect(scoped.registry._clients.has("stale")).toBe(false);

    // 再种一个超时条目，随后关闭 server → 触发 clearInterval(sweepTimer)
    scoped.seedStaleClient("stale2");
    expect(scoped.registry._clients.has("stale2")).toBe(true);
    await scoped.close();

    // 推进 4 个清理周期：close 之后定时器已清，超时条目应纹丝不动
    await vi.advanceTimersByTimeAsync(60_000);
    expect(scoped.unregisterCalls).toHaveLength(1);
    expect(scoped.registry._clients.has("stale2")).toBe(true);
  }, 20_000);
});

/**
 * 假连接对象注入 —— 覆盖「真实 WS 客户端根本发不出来」的那些分支。
 *
 * 为什么要注入桩：既有测试全部走真实 http server + 真实 ws 客户端，帧格式由 ws 库
 * 决定，能造出来的载荷只有「合法 JSON 对象」。于是这些分支真实客户端一条也走不到：
 *   · clientId / requestId **键完全不存在**（既有那条只发了 clientId: ""，
 *     那是 falsy 但**非 nullish**，?? 短路取左值，右臂从未被求值）
 *   · upgrade 请求缺 url / host 头（真实握手一定会带 Host）
 * 而这些恰恰是 4001 关闭与 requestId 兜底的唯一入口。
 *
 * 桩的形状照 runtimeWs.mjs 里被用到的方法对齐：OPEN/readyState、send、close、on。
 * 注入方式：wss 是 EventEmitter（ws 8.x 的 WebSocketServer 没有覆写 emit），
 * 故 `runtime.wss.emit("connection", 假连接, 假握手)` 即可直接跑那条 connection 处理器。
 * 不起真服务器、不真连 socket、不依赖任何定时器。
 */
function createFakeWs() {
  const handlers = new Map();
  const sent = [];
  const closes = [];
  const ws = {
    OPEN: 1,
    readyState: 1,
    sent,
    closes,
    on(event, handler) {
      handlers.set(event, handler);
    },
    // 触发生产代码注册的处理函数（message / close / error）
    fire(event, ...args) {
      const handler = handlers.get(event);
      if (!handler) {
        throw new Error(`假连接未注册 ${event} 处理器`);
      }
      return handler(...args);
    },
    // 生产代码恒传 JSON 字符串，这里解析回来便于断言值而非仅计数
    send(payload) {
      sent.push(JSON.parse(payload));
    },
    close(code, reason) {
      closes.push({ code, reason });
      ws.readyState = 3;
    }
  };
  return ws;
}

// 注入一条假连接，返回它；wsUrl / 真实服务器一概不碰。
function connectFakeConnection({ headers = {} } = {}) {
  const ws = createFakeWs();
  runtime.wss.emit("connection", ws, { headers });
  return ws;
}

// 已注册（clientId 已锁定）的假连接 + 注册调用计数，供消息分派类断言复用
function connectRegisteredFake(clientId = "c1") {
  const counters = spyRegistry(runtime.registry);
  const ws = connectFakeConnection();
  ws.fire("message", JSON.stringify({ type: "register", clientId }));
  // 断言只看分派调用，register 本身先清零，避免与注册路径混在一起
  counters.touch.length = 0;
  counters.resolveFetch.length = 0;
  counters.resolveCommand.length = 0;
  return { ws, counters };
}

describe("runtimeWs register 的 clientId 归一（假连接注入）", () => {
  test("clientId 键不存在或为 null：?? 右臂兜底空串，连接被 4001 关闭", () => {
    const counters = spyRegistry(runtime.registry);

    // 对照：合法 register 会进注册表并回 registered —— 没有这条，
    // 后面「closes 为空」既可能是兜底被改坏，也可能是桩根本没跑
    const okWs = connectFakeConnection();
    okWs.fire("message", JSON.stringify({ type: "register", clientId: "c1" }));
    expect(counters.register).toHaveLength(1);
    expect(okWs.sent).toEqual([{ type: "registered", clientId: "c1" }]);
    expect(okWs.closes).toEqual([]);

    // ① 键完全不存在 → clientId 为 undefined，?? 右臂被求值 → trim 后为空 → 关闭
    const missingWs = connectFakeConnection();
    missingWs.fire("message", JSON.stringify({ type: "register" }));
    expect(missingWs.closes).toEqual([{ code: 4001, reason: "缺少 clientId" }]);
    expect(missingWs.sent).toEqual([]);

    // ② clientId 显式为 null：null 也是 nullish，同走右臂
    const nullWs = connectFakeConnection();
    nullWs.fire("message", JSON.stringify({ type: "register", clientId: null }));
    expect(nullWs.closes).toEqual([{ code: 4001, reason: "缺少 clientId" }]);

    // ③ 只有空白：这里 ?? 取的是左值（非 nullish），空是 trim 出来的 —— 与 ①② 分开断
    const blankWs = connectFakeConnection();
    blankWs.fire("message", JSON.stringify({ type: "register", clientId: "   \t " }));
    expect(blankWs.closes).toEqual([{ code: 4001, reason: "缺少 clientId" }]);

    // 四次都不该有任何注册发生
    expect(counters.register).toHaveLength(1);
    expect(runtime.listClients().map((c) => c.clientId)).toEqual(["c1"]);
  });

  test("clientId 两侧空白被 trim 后才注册（回包与注册表都是 trim 后的值）", () => {
    const counters = spyRegistry(runtime.registry);
    const ws = connectFakeConnection();
    ws.fire("message", JSON.stringify({ type: "register", clientId: "  padded-id \t" }));

    expect(ws.sent).toEqual([{ type: "registered", clientId: "padded-id" }]);
    expect(counters.register).toHaveLength(1);
    expect(counters.register[0][0]).toBe("padded-id");
    expect(runtime.listClients().map((c) => c.clientId)).toEqual(["padded-id"]);
    ws.close();
  });
});

describe("runtimeWs fetch-response 结算的入参兜底（假连接注入）", () => {
  test("requestId 键不存在：兜底空串被当作 requestId 传给 resolveFetch", () => {
    const { ws, counters } = connectRegisteredFake("c1");

    ws.fire("message", JSON.stringify({ type: "fetch-response", ok: true, data: { model: "m1" } }));

    expect(counters.resolveFetch).toHaveLength(1);
    const [clientId, requestId, data, error] = counters.resolveFetch[0];
    expect(clientId).toBe("c1");
    // 兜底值是空串：这里期望值**不能**取任何有意义的 id，否则「硬编码某个 id」的变异抓不到
    expect(requestId).toBe("");
    expect(data).toEqual({ model: "m1" });
    expect(error).toBeNull();

    // 对照一：requestId 显式给数字时按 String() 归一，不受兜底影响
    ws.fire("message", JSON.stringify({ type: "fetch-response", requestId: 42, ok: true, data: 1 }));
    expect(counters.resolveFetch).toHaveLength(2);
    expect(counters.resolveFetch[1][1]).toBe("42");

    // 对照二：requestId 为 null 时同样走右臂，产出仍是空串
    ws.fire("message", JSON.stringify({ type: "fetch-response", requestId: null, ok: true, data: 2 }));
    expect(counters.resolveFetch[2][1]).toBe("");
  });

  test("ok 为假值且不带 error：兜底 code fetch-failed 被传给 resolveFetch", () => {
    const { ws, counters } = connectRegisteredFake("c1");

    // ① error 键完全不存在 → message.error?.code 为 undefined，?? 右臂
    ws.fire("message", JSON.stringify({ type: "fetch-response", requestId: "r1", ok: false }));
    expect(counters.resolveFetch).toHaveLength(1);
    const [, , data1, error1] = counters.resolveFetch[0];
    expect(data1).toBeNull();
    expect(error1.code).toBe("fetch-failed");
    expect(error1.message).toBeUndefined();

    // ② error 对象存在但没有 code 子键 → 右臂；message 仍照传
    ws.fire("message", JSON.stringify({ type: "fetch-response", requestId: "r2", ok: 0, error: { message: "炸了" } }));
    expect(counters.resolveFetch[1][2]).toBeNull();
    expect(counters.resolveFetch[1][3].code).toBe("fetch-failed");
    expect(counters.resolveFetch[1][3].message).toBe("炸了");

    // ③ 对照：error 带 code 时不走兜底
    ws.fire("message", JSON.stringify({ type: "fetch-response", requestId: "r3", ok: false, error: { code: "no-selection", message: "未选中" } }));
    expect(counters.resolveFetch[2][3].code).toBe("no-selection");

    // ④ 对照：ok 为真值时整条错误侧不参与，data 原样透传
    ws.fire("message", JSON.stringify({ type: "fetch-response", requestId: "r4", ok: "yes", data: { ok: 1 } }));
    expect(counters.resolveFetch[3][2]).toEqual({ ok: 1 });
    expect(counters.resolveFetch[3][3]).toBeNull();
  });
});

describe("runtimeWs command-response 结算的入参兜底（假连接注入）", () => {
  test("requestId 键不存在：兜底空串被当作 requestId 传给 resolveCommand", () => {
    const { ws, counters } = connectRegisteredFake("c1");

    ws.fire("message", JSON.stringify({ type: "command-response", ok: true, data: { id: "n1" } }));

    expect(counters.resolveCommand).toHaveLength(1);
    const [clientId, requestId, ok, data, error] = counters.resolveCommand[0];
    expect(clientId).toBe("c1");
    expect(requestId).toBe("");
    expect(ok).toBe(true);
    expect(data).toEqual({ id: "n1" });
    expect(error).toBeNull();

    // 对照：requestId 显式给数字时按 String() 归一
    ws.fire("message", JSON.stringify({ type: "command-response", requestId: 7, ok: false, error: { code: "bad-request" } }));
    expect(counters.resolveCommand[1][1]).toBe("7");

    // requestId 为 null：同样走右臂，产出仍是空串
    ws.fire("message", JSON.stringify({ type: "command-response", requestId: null, ok: true, data: 3 }));
    expect(counters.resolveCommand[2][1]).toBe("");
  });

  test("ok 为假值且不带 error：兜底 code control-failed 被传给 resolveCommand", () => {
    const { ws, counters } = connectRegisteredFake("c1");

    // ① error 键完全不存在
    ws.fire("message", JSON.stringify({ type: "command-response", requestId: "r1", ok: false }));
    const [, , ok1, data1, error1] = counters.resolveCommand[0];
    expect(ok1).toBe(false);
    expect(data1).toBeNull();
    expect(error1.code).toBe("control-failed");
    expect(error1.message).toBeUndefined();

    // ② error 存在但没有 code 子键：ok 用 0（falsy 但非 nullish）验证 Boolean 归一
    ws.fire("message", JSON.stringify({ type: "command-response", requestId: "r2", ok: 0, error: { message: "boom" } }));
    expect(counters.resolveCommand[1][2]).toBe(false);
    expect(counters.resolveCommand[1][4].code).toBe("control-failed");
    expect(counters.resolveCommand[1][4].message).toBe("boom");

    // ③ 对照：error 带 code 时不走兜底
    ws.fire("message", JSON.stringify({ type: "command-response", requestId: "r3", ok: false, error: { code: "bad-request", message: "kind 必填" } }));
    expect(counters.resolveCommand[2][4].code).toBe("bad-request");

    // ④ 对照：ok 为真值时错误侧整条不参与
    ws.fire("message", JSON.stringify({ type: "command-response", requestId: "r4", ok: "yes", data: { ok: 1 } }));
    expect(counters.resolveCommand[3][2]).toBe(true);
    expect(counters.resolveCommand[3][3]).toEqual({ ok: 1 });
    expect(counters.resolveCommand[3][4]).toBeNull();
  });
});

describe("runtimeWs upgrade 路径的 URL 兜底（假 http server 注入）", () => {
  test("请求缺 url 与 host 头：兜底路径 / 与 127.0.0.1 生效，非 /ws 升级被销毁", () => {
    // 假 http server：只提供 on()，不 listen；handler 由本用例手动触发，
    // 于是 request.url / request.headers.host 想缺就缺 —— 真实握手不可能造出这种请求。
    const handlers = new Map();
    const fakeServer = {
      on(event, handler) {
        handlers.set(event, handler);
      }
    };
    const attached = attachRuntimeWebSocket(fakeServer, createRuntimeRegistry());
    const upgrades = [];
    attached.wss.handleUpgrade = (request, socket, head, done) => {
      upgrades.push({ request, socket, head, done });
    };

    try {
      // ① url 与 host 全缺：new URL("/", "http://127.0.0.1") → pathname 为 "/"，非 /ws → 销毁
      const socketA = { destroy: vi.fn() };
      handlers.get("upgrade")({ headers: {} }, socketA, Buffer.alloc(0));
      expect(socketA.destroy).toHaveBeenCalledTimes(1);
      expect(upgrades).toHaveLength(0);

      // 对照：url 正确时确实走 handleUpgrade —— 没有这条，
      // 上面「被销毁」就分不清是兜底生效还是整个 handler 没跑
      const socketB = { destroy: vi.fn() };
      handlers.get("upgrade")({ url: apiPath("/ws"), headers: {} }, socketB, Buffer.alloc(0));
      expect(upgrades).toHaveLength(1);
      expect(upgrades[0].socket).toBe(socketB);
      expect(socketB.destroy).not.toHaveBeenCalled();

      // 对照：/webgrp 前缀不在时仍被销毁
      const socketC = { destroy: vi.fn() };
      handlers.get("upgrade")({ url: "/ws", headers: {} }, socketC, Buffer.alloc(0));
      expect(socketC.destroy).toHaveBeenCalledTimes(1);
      expect(upgrades).toHaveLength(1);
    } finally {
      // 清掉 attachRuntimeWebSocket 建的 sweepTimer 与 wss
      handlers.get("close")();
    }
  });
});
