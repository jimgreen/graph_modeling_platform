// 前端 WS 客户端：连入 server /ws，register clientId，定时 ping 心跳。
// 收到 server 的 fetch 请求时，调用注入的 fetchHandler 生成响应并回传。
// clientId 持久化于 localStorage，重连复用。

const CLIENT_ID_KEY = "runtimeWsClientId";
const PING_INTERVAL_MS = 15_000;
const RECONNECT_DELAY_MS = 3_000;

function getOrCreateClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) {
      return existing;
    }
  } catch {
    // localStorage 不可用，生成临时 id
  }
  const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(CLIENT_ID_KEY, id);
  } catch {
    // 忽略写入失败
  }
  return id;
}

export type FetchHandler = (
  resource: string,
  params: Record<string, unknown>
) => Promise<{ ok: true; data: unknown } | { ok: false; error: { code: string; message: string } }>;

// 写指令处理器：name 分发到 __appScope 程序化方法。返回 data 或抛错。
export type CommandHandler = (
  name: string,
  params: Record<string, unknown>
) => Promise<unknown> | unknown;

export type RuntimeWsClientOptions = {
  url?: string;
  onStatusChange?: (status: "connecting" | "open" | "closed") => void;
  // 收发任意消息时触发（用于指示灯闪烁）
  onActivity?: () => void;
  // 写指令处理器（可选）。未提供时所有指令回执 unknown-command。
  commandHandler?: CommandHandler;
};

export function createRuntimeWsClient(fetchHandler: FetchHandler, options: RuntimeWsClientOptions = {}) {
  const commandHandler = options.commandHandler;
  const clientId = getOrCreateClientId();
  let ws: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  const statusChange = options.onStatusChange ?? (() => {});
  const activity = options.onActivity ?? (() => {});

  function resolveUrl(): string {
    if (options.url) {
      return options.url;
    }
    // dev：vite (5173) 的 /ws WS 代理不稳定（升级常 pending），直连 image-server。
    // prod：同源同端口走 /ws。
    if (import.meta.env && import.meta.env.DEV) {
      const devPort = (import.meta.env as any).VITE_IMAGE_SERVER_PORT ?? "5174";
      const devHost = window.location.hostname || "127.0.0.1";
      return `ws://${devHost}:${devPort}/ws`;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
        activity();
      }
    }, PING_INTERVAL_MS);
  }

  function stopPing() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  async function handleFetch(message: { requestId: string; resource: string; params: Record<string, unknown> }) {
    try {
      const result = await fetchHandler(message.resource, message.params ?? {});
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "fetch-response",
          requestId: message.requestId,
          ok: result.ok,
          data: result.ok ? result.data : undefined,
          error: result.ok ? undefined : result.error
        }));
        activity();
      }
    } catch (error) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "fetch-response",
          requestId: message.requestId,
          ok: false,
          error: { code: "fetch-failed", message: error instanceof Error ? error.message : "前端拉取失败。" }
        }));
        activity();
      }
    }
  }

  async function handleCommand(message: { requestId: string; name: string; params: Record<string, unknown> }) {
    const sendResponse = (ok: boolean, data?: unknown, error?: { code: string; message: string }) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "command-response",
          requestId: message.requestId,
          ok,
          data: ok ? data : undefined,
          error: ok ? undefined : error
        }));
        activity();
      }
    };
    try {
      if (!commandHandler) {
        sendResponse(false, undefined, { code: "unknown-command", message: "未注册指令处理器。" });
        return;
      }
      const data = await commandHandler(message.name, message.params ?? {});
      sendResponse(true, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "前端指令失败。";
      const code = (error as any)?.code ?? "control-failed";
      sendResponse(false, undefined, { code, message: errorMessage });
    }
  }

  function connect() {
    if (closed) {
      return;
    }
    statusChange("connecting");
    ws = new WebSocket(resolveUrl());

    ws.onopen = () => {
      statusChange("open");
      ws?.send(JSON.stringify({ type: "register", clientId }));
      activity();
      startPing();
    };

    ws.onmessage = (event) => {
      activity();
      let message: any;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!message || typeof message !== "object") {
        return;
      }
      if (message.type === "fetch") {
        void handleFetch(message);
      }
      if (message.type === "command") {
        void handleCommand(message);
      }
      // registered / pong / 其他忽略
    };

    ws.onclose = () => {
      statusChange("closed");
      stopPing();
      ws = null;
      if (!closed) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // onclose 会跟进重连
    };
  }

  function close() {
    closed = true;
    stopPing();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    statusChange("closed");
  }

  return {
    clientId,
    connect,
    close,
    getStatus: () => (closed ? "closed" : ws ? (ws.readyState === WebSocket.OPEN ? "open" : "connecting") : "closed")
  };
}
