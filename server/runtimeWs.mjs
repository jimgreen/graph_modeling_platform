// WebSocket 桥接：把 /ws 升级挂到现有 http server，前端客户端连入注册到 runtimeRegistry。
// 收发消息：register / ping / fetch-response。server→前端的 fetch 由 registry.fetchFromClient 触发。

import { WebSocketServer } from "ws";

const HEARTBEAT_CHECK_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;

function safeParseMessage(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // 非 JSON，忽略
  }
  return null;
}

function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// 挂载 WS 到现有 http server。registry 由 runtimeRegistry.createRuntimeRegistry() 创建。
// 返回 { wss, registry } 供 v1 运行时态 handler 使用。
export function attachRuntimeWebSocket(server, registry) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (url.pathname !== "/ws") {
      // 非 /ws 升级，交还（实际无其他 WS，直接销毁）
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    let clientId = null;
    let registeredEntry = null;

    const send = (message) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    ws.on("message", (raw) => {
      const message = safeParseMessage(String(raw));
      if (!message) {
        return;
      }
      if (message.type === "register") {
        clientId = String(message.clientId ?? "").trim();
        if (!clientId) {
          ws.close(4001, "缺少 clientId");
          return;
        }
        registeredEntry = registry.register(clientId, send);
        send({ type: "registered", clientId });
        return;
      }
      if (!registeredEntry) {
        // 未注册先发消息，忽略
        return;
      }
      registry.touch(clientId);
      if (message.type === "ping") {
        send({ type: "pong" });
        return;
      }
      if (message.type === "fetch-response") {
        const requestId = String(message.requestId ?? "");
        const ok = Boolean(message.ok);
        registry.resolveFetch(
          clientId,
          requestId,
          ok ? message.data : null,
          ok ? null : { code: message.error?.code ?? "fetch-failed", message: message.error?.message }
        );
        return;
      }
      // 未知消息类型忽略
    });

    ws.on("close", () => {
      if (clientId) {
        registry.unregister(clientId);
      }
    });

    ws.on("error", () => {
      if (clientId) {
        registry.unregister(clientId);
      }
    });
  });

  // 定期清理超时客户端（registry 查询时已按 60s 过滤，此处主动 unregister 释放内存）
  const sweepTimer = setInterval(() => {
    const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
    for (const entry of registry._clients.values()) {
      if (entry.lastActiveAt < cutoff) {
        registry.unregister(entry.clientId);
      }
    }
  }, HEARTBEAT_CHECK_INTERVAL_MS);

  // server.close 时清理
  server.on("close", () => {
    clearInterval(sweepTimer);
    wss.close();
  });

  // 供 v1 handler 调用：向客户端拉取运行时态
  async function fetchFromClient(clientId, resource, params = {}) {
    const requestId = generateRequestId();
    return registry.fetchFromClient(clientId, requestId, resource, params, (entry, message) => {
      entry.send(message);
    });
  }

  function listClients() {
    return registry.listClients();
  }

  return { wss, registry, fetchFromClient, listClients };
}
