// 前端 WS 客户端：连入 server /ws，register clientId，定时 ping 心跳。
// 收到 server 的 fetch 请求时，调用注入的 fetchHandler 生成响应并回传。
//
// ## clientId = 地址栏里的 token
//
// clientId 决定「后端把这些指令发给哪一个页面」。此前它存在 localStorage 里，
// 同浏览器多标签页会共用同一个 id → 注册表去重后只剩一条，调用方**无法指定**目标页面。
// 现在改为：`?token=` 在地址栏里，**它就是 clientId**。
//
// 解析顺序（见 src/runtimeToken.ts）：
//   1. 地址栏已有合法 `?token=` → 直接用它（刷新 / 切空间 reload 后身份不变）；
//   2. 没有 → 生成一个并写回地址栏（`history.replaceState`，不重载）。
//
// qiankun 下**不写**地址栏：那个 URL 属于主应用，子应用去改会污染宿主路由。
// 此时 token 只活在本次页面生命周期内（重新加载会换一个新的），这是有意的取舍。

import { apiPath } from "./config";
import { randomId } from "../shared/randomId.mjs";
import { createPageToken, readTokenFromUrl, withTokenInUrl } from "./runtimeToken";

const PING_INTERVAL_MS = 15_000;
const RECONNECT_DELAY_MS = 3_000;

/**
 * 解析本次页面的 token（= WS clientId），必要时写回地址栏。
 *
 * @param href 当前地址（默认取 `window.location.href`，测试可注入）
 * @param locale 可注入的副作用（写地址栏 / 生成 id），便于单测
 */
export function resolvePageToken(
  href?: string,
  deps: {
    href?: string;
    randomId?: (prefix?: string) => string;
    writeUrl?: (next: string) => void;
  } = {}
): string {
  const currentHref = deps.href ?? href ?? (typeof window === "undefined" ? "" : String(window.location?.href ?? ""));
  const existing = readTokenFromUrl(currentHref);
  if (existing) {
    return existing;
  }
  const token = createPageToken(deps.randomId ?? randomId);
  try {
    const writeUrl = deps.writeUrl ?? defaultWriteUrl;
    const next = withTokenInUrl(currentHref, token);
    // 地址栏没变（写不进去 / 已一致）就不动历史记录
    if (next !== currentHref) {
      writeUrl(next);
    }
  } catch {
    // 写失败不影响 WS：token 仍然在本次会话内有效，只是地址栏里看不到
  }
  return token;
}

/** 默认的地址栏写入：qiankun 下不写（URL 属于主应用）。 */
function defaultWriteUrl(next: string): void {
  if (window.__POWERED_BY_QIANKUN__) {
    return;
  }
  window.history.replaceState(null, "", next);
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
  // 显式指定 clientId（= 页面 token）。缺省从地址栏 ?token= 取，没有则生成并写回地址栏。
  clientId?: string;
  onStatusChange?: (status: "connecting" | "open" | "closed") => void;
  // 收发任意消息时触发（用于指示灯闪烁）
  onActivity?: () => void;
  // 写指令处理器（可选）。未提供时所有指令回执 unknown-command。
  commandHandler?: CommandHandler;
  // 服务端把 token 改了（复制标签页时自动去重）→ 通知调用方刷新界面上的 token 显示。
  onClientIdChange?: (clientId: string) => void;
};

export function createRuntimeWsClient(fetchHandler: FetchHandler, options: RuntimeWsClientOptions = {}) {
  const commandHandler = options.commandHandler;
  let clientId = options.clientId ?? resolvePageToken();
  const clientIdChange = options.onClientIdChange ?? (() => {});

  /**
   * 采纳服务端下发的 token（复制标签页时它会给一个后缀去重）。
   *
   * 服务端在注册阶段仲裁：两个页面带着同一个 `?token=` 上来时，只有先到的那个留用，
   * 后到的等一轮（确认不是「刷新后旧 socket 还没断」）再拿一个新 token。这里把新值
   * 落到内存并写回**本页**地址栏 —— 否则刷新后又会撞回旧 token，仲裁白做。
   */
  function adoptClientId(next: string): void {
    const value = String(next ?? "").trim();
    if (!value || value === clientId) {
      return;
    }
    clientId = value;
    try {
      const href = typeof window === "undefined" ? "" : String(window.location?.href ?? "");
      const nextHref = withTokenInUrl(href, value);
      if (nextHref !== href) {
        defaultWriteUrl(nextHref);
      }
    } catch {
      // 写不进地址栏不影响本次会话：token 已在内存里
    }
    clientIdChange(value);
  }
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
    // qiankun 环境：使用主应用传入的后端地址
    const inQiankun = window.__POWERED_BY_QIANKUN__;
    if (inQiankun) {
      const qiankunProps = (window as any).__QIANKUN_PROPS__;
      const apiBaseUrl = qiankunProps?.apiBaseUrl;
      if (apiBaseUrl) {
        // 将 http(s) 替换为 ws(s)
        const wsUrl = apiBaseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
        return `${wsUrl}${apiPath("/ws")}`;
      }
      // 兜底：使用当前 host
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}${apiPath("/ws")}`;
    }
    // dev：vite (5173) 的 /ws WS 代理不稳定（升级常 pending），直连 image-server。
    // prod：同源同端口走 /ws。WS 路径带前端 base（如 /app/ws），后端剥前缀匹配 /ws。
    if (import.meta.env && import.meta.env.DEV) {
      const devPort = import.meta.env.VITE_IMAGE_SERVER_PORT ?? "5174";
      const devHost = window.location.hostname || "127.0.0.1";
      return `ws://${devHost}:${devPort}${apiPath("/ws")}`;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${apiPath("/ws")}`;
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
      // 注册回执：服务端可能给了新 token（复制标签页去重），采纳并写回地址栏
      if (message.type === "registered" && message.clientId) {
        adoptClientId(message.clientId);
      }
      // token-conflict：服务端在等旧连接断掉（刷新场景），或准备给新 token。
      // 这里什么都不做 —— 改 token 由服务端的 registered 回执决定，不在客户端猜。
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
    // getter 而非快照：服务端可能在注册阶段换掉 token（复制标签页去重），
    // 调用方任何时候读到的都该是**当前**值。
    get clientId() {
      return clientId;
    },
    connect,
    close,
    getStatus: () => (closed ? "closed" : ws ? (ws.readyState === WebSocket.OPEN ? "open" : "connecting") : "closed")
  };
}
