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

export type RuntimeWsClientOptions = {
  url?: string;
  onStatusChange?: (status: "connecting" | "open" | "closed") => void;
};

export function createRuntimeWsClient(fetchHandler: FetchHandler, options: RuntimeWsClientOptions = {}) {
  const clientId = getOrCreateClientId();
  let ws: WebSocket | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  const statusChange = options.onStatusChange ?? (() => {});

  function resolveUrl(): string {
    if (options.url) {
      return options.url;
    }
    // 同源同端口：当前页面 host + /ws
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
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
      }
    } catch (error) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "fetch-response",
          requestId: message.requestId,
          ok: false,
          error: { code: "fetch-failed", message: error instanceof Error ? error.message : "前端拉取失败。" }
        }));
      }
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
      startPing();
    };

    ws.onmessage = (event) => {
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
