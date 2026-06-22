import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createRuntimeWsClient, type FetchHandler } from "./runtimeWsClient";

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
    constructor(public url: string) {
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
