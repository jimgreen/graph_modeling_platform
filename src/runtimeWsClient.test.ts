import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createRuntimeWsClient, type FetchHandler } from "./runtimeWsClient";
import { apiPath } from "./config";

// 前端 WS 客户端测试：mock WebSocket / localStorage / window。
// 环境为 node（vitest.config 默认），手动注入全局 mock。

type MockWs = {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  sent: string[];
  close: ReturnType<typeof vi.fn>;
  triggerOpen: () => void;
  triggerMessage: (data: unknown) => void;
  triggerClose: () => void;
};

const OPEN = 1;

function installMockWebSocket() {
  const instances: MockWs[] = [];
  class MockWebSocket {
    static OPEN = 1;
    static CONNECTING = 0;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 0;
    onopen: MockWs["onopen"] = null;
    onmessage: MockWs["onmessage"] = null;
    onclose: MockWs["onclose"] = null;
    onerror: MockWs["onerror"] = null;
    sent: string[] = [];
    close = vi.fn(() => {
      this.readyState = 3;
    });
    url: string;
    constructor(url: string) {
      this.url = url;
      const self = this as unknown as MockWs;
      self.triggerOpen = () => {
        self.readyState = OPEN;
        self.onopen?.();
      };
      self.triggerMessage = (data: unknown) => {
        self.onmessage?.({ data: JSON.stringify(data) });
      };
      self.triggerClose = () => {
        self.readyState = 3;
        self.onclose?.();
      };
      instances.push(self);
    }
    send(data: string) {
      this.sent.push(data);
    }
  }
  (globalThis as any).WebSocket = MockWebSocket;
  return {
    instances,
    MockWebSocket
  };
}

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  };
  (globalThis as any).localStorage = mock;
  return mock;
}

let originalWebSocket: any;
let originalLocalStorage: any;
let mockWs: ReturnType<typeof installMockWebSocket>;

beforeEach(() => {
  originalWebSocket = (globalThis as any).WebSocket;
  originalLocalStorage = (globalThis as any).localStorage;
  mockWs = installMockWebSocket();
  installMockLocalStorage();
  (globalThis as any).window = { location: { protocol: "http:", host: "127.0.0.1:5173" } };
});

afterEach(() => {
  (globalThis as any).WebSocket = originalWebSocket;
  (globalThis as any).localStorage = originalLocalStorage;
  vi.useRealTimers();
});

describe("runtimeWsClient 连接与注册", () => {
  test("connect 后 onopen 发 register + clientId 持久化", () => {
    vi.useFakeTimers();
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    expect(ws.sent).toHaveLength(1);
    const msg = JSON.parse(ws.sent[0]);
    expect(msg.type).toBe("register");
    expect(msg.clientId).toBeTruthy();
    expect(client.getStatus()).toBe("open");
    client.close();
  });

  test("clientId 复用 localStorage", () => {
    localStorage.setItem("runtimeWsClientId", "persisted-id");
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    expect(client.clientId).toBe("persisted-id");
  });
});

describe("runtimeWsClient 心跳", () => {
  test("onopen 后定时 ping", () => {
    vi.useFakeTimers();
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.sent.length = 0; // 清 register
    vi.advanceTimersByTime(15000);
    expect(ws.sent.some((s) => JSON.parse(s).type === "ping")).toBe(true);
    client.close();
  });

  test("close 后停止 ping", () => {
    vi.useFakeTimers();
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    client.close();
    ws.sent.length = 0;
    vi.advanceTimersByTime(15000);
    expect(ws.sent).toHaveLength(0);
  });
});

describe("runtimeWsClient fetch 响应", () => {
  test("收到 fetch 调 handler 并回 fetch-response(data)", async () => {
    const handler = vi.fn<FetchHandler>(async () => ({ ok: true, data: { model: "m1" } }));
    const client = createRuntimeWsClient(handler);
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "fetch", requestId: "r1", resource: "runtime.snapshot", params: {} });
    // 等 async handler
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "fetch-response");
    expect(response).toMatchObject({ type: "fetch-response", requestId: "r1", ok: true, data: { model: "m1" } });
    expect(handler).toHaveBeenCalledWith("runtime.snapshot", {});
    client.close();
  });

  test("handler 返 error 回传 error", async () => {
    const handler = vi.fn<FetchHandler>(async () => ({ ok: false, error: { code: "no-selection", message: "未选中" } }));
    const client = createRuntimeWsClient(handler);
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "fetch", requestId: "r2", resource: "runtime.selection", params: {} });
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "fetch-response");
    expect(response).toMatchObject({ ok: false, error: { code: "no-selection" } });
    client.close();
  });

  test("handler 抛错回传 fetch-failed", async () => {
    const handler = vi.fn<FetchHandler>(async () => {
      throw new Error("boom");
    });
    const client = createRuntimeWsClient(handler);
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "fetch", requestId: "r3", resource: "runtime.snapshot", params: {} });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "fetch-response");
    expect(response).toMatchObject({ ok: false, error: { code: "fetch-failed", message: "boom" } });
    client.close();
  });
});

describe("runtimeWsClient command 指令响应", () => {
  test("收到 command 调 commandHandler 并回 command-response(data)", async () => {
    const commandHandler = vi.fn(async () => ({ id: "n1" }));
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { commandHandler });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c1", name: "control.device.add", params: { kind: "busbar" } });
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({ type: "command-response", requestId: "c1", ok: true, data: { id: "n1" } });
    expect(commandHandler).toHaveBeenCalledWith("control.device.add", { kind: "busbar" });
    client.close();
  });

  test("commandHandler 抛错回传 control-failed", async () => {
    const commandHandler = vi.fn(async () => {
      throw new Error("kind 必填");
    });
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { commandHandler });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c2", name: "control.device.add", params: {} });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({ ok: false, error: { code: "control-failed", message: "kind 必填" } });
    client.close();
  });

  test("commandHandler 抛带 code 的错回传该 code", async () => {
    const commandHandler = vi.fn(async () => {
      const e: any = new Error("重复");
      e.code = "bad-request";
      throw e;
    });
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { commandHandler });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c3", name: "control.scheme.create", params: {} });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({ ok: false, error: { code: "bad-request" } });
    client.close();
  });

  test("未注册 commandHandler 回传 unknown-command", async () => {
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c4", name: "control.device.add", params: {} });
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({ ok: false, error: { code: "unknown-command" } });
    client.close();
  });

  test("commandHandler 同步返回也正常回执", async () => {
    const commandHandler = vi.fn(() => ({ id: "sync" }));
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { commandHandler });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c5", name: "control.devices.select", params: {} });
    await Promise.resolve();
    await Promise.resolve();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({ ok: true, data: { id: "sync" } });
    client.close();
  });
});

describe("runtimeWsClient 重连", () => {
  test("onclose 后定时重连", () => {
    vi.useFakeTimers();
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    const ws1 = mockWs.instances[0];
    ws1.triggerOpen();
    ws1.triggerClose();
    expect(mockWs.instances).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(mockWs.instances).toHaveLength(2);
    client.close();
  });

  test("close() 后不再重连", () => {
    vi.useFakeTimers();
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    mockWs.instances[0].triggerOpen();
    client.close();
    vi.advanceTimersByTime(3000);
    expect(mockWs.instances).toHaveLength(1);
  });
});

// ── getStatus 的取值口径（记录现状）─────────────────────────
//
// `getStatus` 是 `closed ? "closed" : ws ? (readyState === OPEN ? "open" : "connecting") : "closed"`：
// readyState 只要**不是** OPEN 就报 "connecting"。于是 CLOSING(2) / CLOSED(3)
// 在「onclose 尚未回调」的窗口里也显示 connecting —— 第三方据此判定「在线」，
// 紧接着的请求却拿到 no-online-client 503。
//
// 只记录现状、不改：status 的取值集合是对外的（/api/v1/runtime 会透出它），
// 引入新值（如 "closing"）要先确认第三方是否已穷举这三种。

describe("runtimeWsClient getStatus 的 readyState 口径", () => {
  const buildClient = () => createRuntimeWsClient(async () => ({ ok: true, data: {} }));

  test("未连接 → closed", () => {
    const client = buildClient();
    expect(client.getStatus()).toBe("closed");
  });

  test("已连上 → open", () => {
    vi.useFakeTimers();
    const client = buildClient();
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    expect(client.getStatus()).toBe("open");
    client.close();
  });

  test("★ 连接中（readyState=CONNECTING）→ connecting", () => {
    vi.useFakeTimers();
    const client = buildClient();
    client.connect();
    expect(client.getStatus()).toBe("connecting");
    client.close();
  });

  test("★ 关闭中（readyState=CLOSING，onclose 未回调）也报 connecting 而不是 closed", () => {
    // 这是最容易误判的窗口：第三方看到 connecting 就认为在线，
    // 但服务端此时已经没有这条连接了。
    vi.useFakeTimers();
    const client = buildClient();
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.readyState = 2; // CLOSING
    expect(client.getStatus()).toBe("connecting");
    client.close();
  });

  test("★ readyState=CLOSED 但 onclose 未回调时同样报 connecting", () => {
    vi.useFakeTimers();
    const client = buildClient();
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.readyState = 3; // CLOSED，但没触发 onclose
    expect(client.getStatus()).toBe("connecting");
    client.close();
  });

  test("onclose 回调之后才是 closed", () => {
    vi.useFakeTimers();
    const client = buildClient();
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerClose();
    expect(client.getStatus()).toBe("closed");
    client.close();
  });

  test("close() 之后一律 closed（close 内部会置 closed 标志并把 ws 置 null）", () => {
    vi.useFakeTimers();
    const client = buildClient();
    client.connect();
    mockWs.instances[0].triggerOpen();
    client.close();
    expect(client.getStatus()).toBe("closed");
  });
});

// ── 追加：未覆盖分支补测 ──────────────────────────────────────
//
// 覆盖点：L18/L24（localStorage 读/写各自抛错的降级）、L61（options.url 优先）、
// L66（qiankun 分支，含 apiBaseUrl 换协议与无 apiBaseUrl 兜底）、
// L84/L85（非 DEV 的 prod 同源分支 + ws/wss 两侧）、
// L108/L150（message.params 缺省时补 {}）、L125/L153（抛非 Error 时用固定文案）。
//
// 取值器：`MockWs` 类型上没有 `url` 字段（只声明了 sent/close 等），
// 直接 `instances[i].url` 过不了 tsc，故统一走这里取。
const urlOf = (index: number): string => (mockWs.instances[index] as unknown as { url: string }).url;

// onmessage → async handler → send 的微任务链有几层，统一抽干若干轮。
// 不用 setTimeout：开了 fake timers 的用例里真实等待不会推进。
async function flushMicrotasks(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await Promise.resolve();
  }
}

// `import.meta.env.DEV` 决定 resolveUrl 走 dev 直连分支还是 prod 同源分支。
// vitest 3.2.7 的 vi.stubEnv 只写 process.env、不写 import.meta.env
// （见 node_modules/vitest/dist/chunks/vi.*.js 里 stubEnv 的实现），
// 所以这里直接改 import.meta.env，并在 finally 里原样还原：
// 改与还原都在同一个同步块内完成，不给同 worker 里后续用例留观察窗口。
function connectWithDevFlag(
  dev: boolean,
  options: Parameters<typeof createRuntimeWsClient>[1] = {}
) {
  const env = import.meta.env as any;
  const before = env.DEV;
  env.DEV = dev;
  try {
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), options);
    client.connect(); // resolveUrl 在这里同步求值
    return client;
  } finally {
    env.DEV = before;
  }
}

describe("runtimeWsClient clientId 的 localStorage 降级", () => {
  test("★ getItem 抛错时降级为临时 id，且仍把新 id 写回（L18 catch）", () => {
    const writes: Array<[string, string]> = [];
    (globalThis as any).localStorage = {
      getItem: () => {
        throw new Error("SecurityError: 隐私模式禁用存储");
      },
      setItem: (key: string, value: string) => {
        writes.push([key, value]);
      },
      removeItem: () => {}
    };
    let clientId: string | undefined;
    expect(() => {
      clientId = createRuntimeWsClient(async () => ({ ok: true, data: {} })).clientId;
    }).not.toThrow();
    expect(clientId).toMatch(/^client-/);
    // 读失败不等于写失败：不写回的话每次刷新都换一个 clientId，
    // server 侧会话也跟着丢。所以读失败后仍必须尝试落盘。
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe("runtimeWsClientId");
    expect(writes[0][1]).toBe(clientId);
  });

  test("★ setItem 抛错时忽略写入失败，仍照常返回临时 id（L24 catch）", () => {
    const getItem = vi.fn(() => null);
    (globalThis as any).localStorage = {
      getItem,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {}
    };
    let clientId: string | undefined;
    expect(() => {
      clientId = createRuntimeWsClient(async () => ({ ok: true, data: {} })).clientId;
    }).not.toThrow();
    expect(getItem).toHaveBeenCalledWith("runtimeWsClientId");
    expect(clientId).toMatch(/^client-/);
    // 写失败 ⇒ 没落盘 ⇒ 下一个实例拿到的是另一个临时 id（不是同一个）
    const nextId = createRuntimeWsClient(async () => ({ ok: true, data: {} })).clientId;
    expect(nextId).not.toBe(clientId);
  });
});

describe("runtimeWsClient 的 WS 地址推导", () => {
  const build = (options: Parameters<typeof createRuntimeWsClient>[1] = {}) =>
    createRuntimeWsClient(async () => ({ ok: true, data: {} }), options);

  test("★ 显式 options.url 压过 qiankun 环境推导（L61）", () => {
    vi.useFakeTimers();
    // 故意把 qiankun 全局也布上：只有「url 分支排最前」才压得住，
    // 否则这里会走到 wss://qiankun.example 而红。
    (globalThis as any).window.__POWERED_BY_QIANKUN__ = true;
    (globalThis as any).window.__QIANKUN_PROPS__ = { apiBaseUrl: "https://qiankun.example" };
    const client = build({ url: "ws://explicit.example:9000/custom/ws" });
    client.connect();
    expect(urlOf(0)).toBe("ws://explicit.example:9000/custom/ws");
    client.close();
  });

  test("qiankun 环境用主应用 apiBaseUrl，https 转 wss（L66 + 协议替换）", () => {
    vi.useFakeTimers();
    (globalThis as any).window.__POWERED_BY_QIANKUN__ = true;
    (globalThis as any).window.__QIANKUN_PROPS__ = { apiBaseUrl: "https://qiankun.example" };
    const client = build();
    client.connect();
    expect(urlOf(0)).toBe(`wss://qiankun.example${apiPath("/ws")}`);
    client.close();
  });

  test("qiankun 环境 apiBaseUrl 是 http 时换 ws（不牵连 https 那一侧）", () => {
    vi.useFakeTimers();
    (globalThis as any).window.__POWERED_BY_QIANKUN__ = true;
    (globalThis as any).window.__QIANKUN_PROPS__ = { apiBaseUrl: "http://qiankun.example:8080" };
    const client = build();
    client.connect();
    expect(urlOf(0)).toBe(`ws://qiankun.example:8080${apiPath("/ws")}`);
    client.close();
  });

  test("qiankun 环境无 apiBaseUrl 时兜底当前 host 的 http 页面", () => {
    vi.useFakeTimers();
    (globalThis as any).window.__POWERED_BY_QIANKUN__ = true;
    (globalThis as any).window.__QIANKUN_PROPS__ = {};
    const client = build();
    client.connect();
    expect(urlOf(0)).toBe(`ws://127.0.0.1:5173${apiPath("/ws")}`);
    client.close();
  });

  test("qiankun 兜底且页面本身是 https 时用 wss", () => {
    vi.useFakeTimers();
    (globalThis as any).window.location = { protocol: "https:", host: "app.example.com", hostname: "app.example.com" };
    (globalThis as any).window.__POWERED_BY_QIANKUN__ = true;
    const client = build();
    client.connect();
    expect(urlOf(0)).toBe(`wss://app.example.com${apiPath("/ws")}`);
    client.close();
  });

  // ↓↓↓ dev 与 prod 两条分支各有两侧断言：只断其中一侧的话，
  // 把另一侧硬编码成同样的字面量会绿（§2：断言值不能恰好等于 fallback）。
  test("dev 分支：location.hostname 缺省时兜底 127.0.0.1，端口取 5174", () => {
    vi.useFakeTimers();
    const client = connectWithDevFlag(true);
    expect(urlOf(0)).toBe(`ws://127.0.0.1:5174${apiPath("/ws")}`);
    client.close();
  });

  test("dev 分支：location.hostname 有值时用它，不用兜底值", () => {
    vi.useFakeTimers();
    (globalThis as any).window.location = { protocol: "http:", host: "devbox:5173", hostname: "devbox" };
    const client = connectWithDevFlag(true);
    expect(urlOf(0)).toBe(`ws://devbox:5174${apiPath("/ws")}`);
    client.close();
  });

  test("★ prod 分支（非 DEV）走同源 /ws，http 页面用 ws（L84/L85）", () => {
    vi.useFakeTimers();
    const client = connectWithDevFlag(false);
    expect(urlOf(0)).toBe(`ws://127.0.0.1:5173${apiPath("/ws")}`);
    client.close();
  });

  test("★ prod 分支（非 DEV）且页面是 https 时同源 wss（L84/L85 的另一侧）", () => {
    vi.useFakeTimers();
    (globalThis as any).window.location = { protocol: "https:", host: "app.example.com", hostname: "app.example.com" };
    const client = connectWithDevFlag(false);
    expect(urlOf(0)).toBe(`wss://app.example.com${apiPath("/ws")}`);
    client.close();
  });
});

describe("runtimeWsClient 消息容错", () => {
  test("★ fetch 消息缺 params 时 handler 收到空对象（L108 的 ?? {}）", async () => {
    const handler = vi.fn<FetchHandler>(async () => ({ ok: true, data: { model: "m" } }));
    const client = createRuntimeWsClient(handler);
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    // 故意不带 params 字段（老版本 server / 手写报文都可能这样）
    ws.triggerMessage({ type: "fetch", requestId: "r-nop", resource: "runtime.snapshot" });
    await flushMicrotasks();
    expect(handler).toHaveBeenCalledWith("runtime.snapshot", {});
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "fetch-response");
    expect(response).toMatchObject({ requestId: "r-nop", ok: true, data: { model: "m" } });
    client.close();
  });

  test("★ command 消息缺 params 时 handler 收到空对象（L150 的 ?? {}）", async () => {
    const commandHandler = vi.fn(async () => ({ id: "n" }));
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { commandHandler });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c-nop", name: "control.scheme.load" });
    await flushMicrotasks();
    expect(commandHandler).toHaveBeenCalledWith("control.scheme.load", {});
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({ requestId: "c-nop", ok: true, data: { id: "n" } });
    client.close();
  });

  test("★ fetchHandler 抛非 Error 时用固定文案而非 undefined（L125）", async () => {
    // 抛字符串：Error 实例那一侧已被既有的「handler 抛错回传 fetch-failed」覆盖，
    // 这里只断非 Error 侧。
    const handler = vi.fn<FetchHandler>(async () => {
      throw "字符串炸了";
    });
    const client = createRuntimeWsClient(handler);
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "fetch", requestId: "r-str", resource: "runtime.selection", params: {} });
    await flushMicrotasks();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "fetch-response");
    expect(response).toMatchObject({
      ok: false,
      error: { code: "fetch-failed", message: "前端拉取失败。" }
    });
    client.close();
  });

  test("★ commandHandler 抛非 Error 且无 code 时用固定文案 + 兜底 code（L153/L154）", async () => {
    const commandHandler = vi.fn(async () => {
      throw { detail: "后端返回的不是 Error" };
    });
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { commandHandler });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "command", requestId: "c-str", name: "control.device.add", params: {} });
    await flushMicrotasks();
    const response = ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === "command-response");
    expect(response).toMatchObject({
      ok: false,
      error: { code: "control-failed", message: "前端指令失败。" }
    });
    client.close();
  });

  test("非 JSON / 非对象报文被忽略，不回任何回执", () => {
    vi.useFakeTimers();
    const handler = vi.fn<FetchHandler>(async () => ({ ok: true, data: {} }));
    const client = createRuntimeWsClient(handler);
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.sent.length = 0; // 清 register
    ws.onmessage?.({ data: "这不是 JSON" }); // JSON.parse 抛错 → catch
    ws.onmessage?.({ data: "123" }); // parse 得数字：非对象，但解引用不炸
    ws.onmessage?.({ data: "null" }); // parse 得 null：删掉 `!message` 守卫就会在这里炸
    ws.onmessage?.({ data: JSON.stringify({ type: "pong" }) }); // 未知 type
    expect(ws.sent).toHaveLength(0);
    expect(handler).not.toHaveBeenCalled();
    client.close();
  });
});