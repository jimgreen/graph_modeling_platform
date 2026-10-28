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
// 地址栏写入记录：token 现在靠 URL 承载（MCP 用它指定目标页面），
// 故「有没有写回地址栏」是要断言的契约，不只是副作用。
let writtenUrls: string[] = [];

function installMockWindow(href = "http://127.0.0.1:5173/") {
  writtenUrls = [];
  (globalThis as any).window = {
    location: { protocol: "http:", host: "127.0.0.1:5173", href },
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        writtenUrls.push(url);
      }
    }
  };
}

beforeEach(() => {
  originalWebSocket = (globalThis as any).WebSocket;
  originalLocalStorage = (globalThis as any).localStorage;
  mockWs = installMockWebSocket();
  installMockLocalStorage();
  installMockWindow();
});

afterEach(() => {
  (globalThis as any).WebSocket = originalWebSocket;
  (globalThis as any).localStorage = originalLocalStorage;
  vi.useRealTimers();
});

describe("runtimeWsClient 连接与注册", () => {
  test("connect 后 onopen 发 register（clientId 即页面 token）", () => {
    vi.useFakeTimers();
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    expect(ws.sent).toHaveLength(1);
    const msg = JSON.parse(ws.sent[0]);
    expect(msg.type).toBe("register");
    expect(msg.clientId).toBe(client.clientId);
    expect(msg.clientId).toMatch(/^page-/u);
    expect(client.getStatus()).toBe("open");
    client.close();
  });

  test("地址栏已有 ?token= → 直接用它（刷新/切空间 reload 后身份不变）", () => {
    installMockWindow("http://127.0.0.1:5173/?token=page-abc123#space=default&model=13");
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    expect(client.clientId).toBe("page-abc123");
    // 已一致就不该再写地址栏（避免每次挂载塞一条无变化的历史记录）
    expect(writtenUrls).toHaveLength(0);
  });

  test("地址栏没有 token → 生成一个并写回地址栏（MCP 靠它指定页面）", () => {
    installMockWindow("http://127.0.0.1:5173/#space=default");
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    expect(client.clientId).toMatch(/^page-/u);
    expect(writtenUrls).toHaveLength(1);
    expect(writtenUrls[0]).toContain(`token=${client.clientId}`);
    // hash 必须保留：里面装着空间/模型标识，丢了等于换工作空间
    expect(writtenUrls[0]).toContain("#space=default");
  });

  test("qiankun 下不写宿主地址栏（token 只在本次会话有效）", () => {
    installMockWindow("http://host/app/#/");
    (globalThis as any).window.__POWERED_BY_QIANKUN__ = true;
    try {
      const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
      expect(client.clientId).toMatch(/^page-/u);
      expect(writtenUrls).toHaveLength(0);
    } finally {
      delete (globalThis as any).window.__POWERED_BY_QIANKUN__;
    }
  });

  test("显式 clientId 优先于地址栏（测试/嵌入方可注入）", () => {
    installMockWindow("http://127.0.0.1:5173/?token=page-fromurl");
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), { clientId: "page-explicit" });
    expect(client.clientId).toBe("page-explicit");
  });

  test("★ 服务端给了新 token（复制标签页去重）→ 采纳、写回地址栏、并通知界面", () => {
    vi.useFakeTimers();
    installMockWindow("http://127.0.0.1:5173/?token=page-shared#space=default");
    const changed: string[] = [];
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), {
      onClientIdChange: (id) => changed.push(id)
    });
    expect(client.clientId).toBe("page-shared");
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    // 服务端仲裁后回执：这个页面的 token 被换成带后缀的那个
    ws.triggerMessage({ type: "registered", clientId: "page-shared-2", renamed: true });
    expect(client.clientId).toBe("page-shared-2");
    expect(changed).toEqual(["page-shared-2"]);
    // 必须写回**本页**地址栏，否则刷新后又撞回旧 token，仲裁白做
    expect(writtenUrls).toHaveLength(1);
    expect(writtenUrls[0]).toContain("token=page-shared-2");
    expect(writtenUrls[0]).toContain("#space=default");
    client.close();
  });

  test("★ 回执里的 token 与本地一致时不做任何事（不重复写历史）", () => {
    vi.useFakeTimers();
    installMockWindow("http://127.0.0.1:5173/?token=page-same");
    const changed: string[] = [];
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }), {
      onClientIdChange: (id) => changed.push(id)
    });
    client.connect();
    const ws = mockWs.instances[0];
    ws.triggerOpen();
    ws.triggerMessage({ type: "registered", clientId: "page-same" });
    expect(changed).toHaveLength(0);
    expect(writtenUrls).toHaveLength(0);
    client.close();
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

describe("runtimeWsClient 的 token 降级", () => {
  test("★ 地址栏写不进去（replaceState 抛错）时照常出 token，不阻断启动", () => {
    installMockWindow("http://127.0.0.1:5173/");
    (globalThis as any).window.history = {
      replaceState: () => {
        throw new Error("SecurityError: 历史记录被禁用");
      }
    };
    let clientId: string | undefined;
    expect(() => {
      clientId = createRuntimeWsClient(async () => ({ ok: true, data: {} })).clientId;
    }).not.toThrow();
    // token 仍然有效（本次会话内可用），只是地址栏里看不到 —— 不能因为写失败就不连
    expect(clientId).toMatch(/^page-/u);
  });

  test("★ 地址栏里是非法 token 时当作没有，重新生成并覆盖", () => {
    // `%20` 解码后是空格：非法 token 不能带进注册链路（抄错 / 被别处污染）
    installMockWindow("http://127.0.0.1:5173/?token=a%20b");
    const client = createRuntimeWsClient(async () => ({ ok: true, data: {} }));
    expect(client.clientId).toMatch(/^page-/u);
    expect(client.clientId).not.toContain(" ");
    expect(writtenUrls).toHaveLength(1);
    expect(writtenUrls[0]).toContain(`token=${client.clientId}`);
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