import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { apiPath } from "./config.mjs";
import { resolveSpaceFromRequest } from "./spaceStore.mjs";

const SUBSCRIPTION_PATH = apiPath("/v1/subscriptions/ws");
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 30 * 60 * 1000;
const ORIGIN_HTTP_STATUS = new Map([
  [400, "Bad Request"],
  [403, "Forbidden"],
  [404, "Not Found"],
  [503, "Service Unavailable"]
]);

function originAllowed(request) {
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  if (typeof origin !== "string" || !origin) return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.origin === origin
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

function rejectUpgrade(socket, status) {
  if (socket.destroyed) return;
  const reason = ORIGIN_HTTP_STATUS.get(status) ?? "Bad Request";
  try {
    socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  } catch {
    // The peer may close while the handshake is being rejected.
  } finally {
    socket.destroy();
  }
}

function sendJson(ws, message) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function errorFrame(error, subscriptionId) {
  return {
    type: "error",
    error: {
      code: error?.code ?? "internal",
      message: error instanceof Error ? error.message : "订阅请求失败。",
      ...(subscriptionId ? { subscriptionId } : {})
    }
  };
}

export function attachModelUpdateWebSocket(server, { service, getSpaceStore }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  const resolveStore = typeof getSpaceStore === "function" ? getSpaceStore : () => getSpaceStore;
  const connections = new Map();
  const cleanupConnection = (connectionId, connection) => {
    if (connections.get(connectionId) !== connection) return false;
    connections.delete(connectionId);
    service.removeConnection(connectionId);
    return true;
  };

  server.on("upgrade", (request, socket, head) => {
    let url;
    try {
      url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    } catch {
      rejectUpgrade(socket, 400);
      return;
    }
    if (url.pathname !== SUBSCRIPTION_PATH) return;
    if (!originAllowed(request)) {
      rejectUpgrade(socket, 403);
      return;
    }

    const store = resolveStore();
    if (!store) {
      rejectUpgrade(socket, 503);
      return;
    }
    const resolution = resolveSpaceFromRequest(request, url, store);
    if (resolution.unknown || !resolution.id || !store.has(resolution.id)) {
      rejectUpgrade(socket, 404);
      return;
    }
    const spaceId = resolution.id;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, spaceId);
    });
  });

  wss.on("connection", (ws, _request, spaceId) => {
    const connectionId = randomUUID();
    const connection = { ws, spaceId, lastPongAt: Date.now() };
    connections.set(connectionId, connection);
    service.addConnection(connectionId, spaceId, (_id, message) => sendJson(ws, message));
    ws.on("pong", () => {
      if (connections.get(connectionId) === connection) connection.lastPongAt = Date.now();
    });

    ws.on("message", async (raw, isBinary) => {
      if (isBinary) {
        sendJson(ws, errorFrame(Object.assign(new Error("订阅协议只接受 JSON 文本帧。"), { code: "bad-request" })));
        return;
      }
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        sendJson(ws, errorFrame(Object.assign(new Error("消息不是合法 JSON。"), { code: "bad-request" })));
        return;
      }
      if (!message || typeof message !== "object" || Array.isArray(message)) {
        sendJson(ws, errorFrame(Object.assign(new Error("订阅消息必须是 JSON 对象。"), { code: "bad-request" })));
        return;
      }

      if (message.type === "subscribe") {
        try {
          const subscriptionId = await service.subscribe(connectionId, spaceId, message.scope, message.files);
          const subscription = service.getSubscription(connectionId, subscriptionId);
          if (!subscription) throw Object.assign(new Error("订阅创建后已失效。"), { code: "connection-closed" });
          sendJson(ws, { type: "subscribed", ok: true, data: subscription });
        } catch (error) {
          sendJson(ws, errorFrame(error));
        }
        return;
      }

      if (message.type === "unsubscribe") {
        const subscriptionId = String(message.subscriptionId ?? "");
        if (service.unsubscribe(connectionId, subscriptionId)) {
          sendJson(ws, { type: "unsubscribed", ok: true, data: { subscriptionId } });
        } else {
          sendJson(ws, errorFrame(
            Object.assign(new Error("订阅不存在或不属于当前连接。"), { code: "not-found" }),
            subscriptionId
          ));
        }
        return;
      }

      sendJson(ws, errorFrame(Object.assign(new Error("未知订阅消息类型。"), { code: "bad-request" })));
    });

    const cleanup = () => cleanupConnection(connectionId, connection);
    ws.once("close", cleanup);
    ws.once("error", cleanup);
  });

  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    for (const [connectionId, connection] of connections) {
      const { ws } = connection;
      if (ws.readyState !== WebSocket.OPEN) {
        cleanupConnection(connectionId, connection);
        continue;
      }
      if (now - connection.lastPongAt >= HEARTBEAT_TIMEOUT_MS) {
        cleanupConnection(connectionId, connection);
        ws.terminate();
        continue;
      }
      try {
        ws.ping();
      } catch {
        cleanupConnection(connectionId, connection);
        ws.terminate();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();

  function closeSpace(spaceId) {
    const target = String(spaceId ?? "");
    service.removeSpace(target);
    let closed = 0;
    for (const [connectionId, connection] of connections) {
      if (connection.spaceId !== target) continue;
      cleanupConnection(connectionId, connection);
      if (connection.ws.readyState === WebSocket.OPEN) connection.ws.close(4003, "空间已删除");
      closed += 1;
    }
    return closed;
  }

  function removeModel(spaceId, modelId) {
    return service.removeModel(spaceId, modelId);
  }

  server.once("close", () => {
    clearInterval(heartbeatTimer);
    for (const [connectionId, connection] of connections) {
      cleanupConnection(connectionId, connection);
      if (connection.ws.readyState === WebSocket.OPEN) connection.ws.close(1001, "服务器已关闭");
    }
    wss.close();
  });

  return { wss, closeSpace, removeModel };
}
