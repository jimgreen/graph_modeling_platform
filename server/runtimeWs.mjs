// WebSocket 桥接：把 /ws 升级挂到现有 http server，前端客户端连入注册到 runtimeRegistry。
// 收发消息：register / ping / fetch-response。server→前端的 fetch 由 registry.fetchFromClient 触发。

import { WebSocketServer } from "ws";
import { apiPath } from "./config.mjs";
import { parseSpaceCookie } from "./spaceStore.mjs";
import { randomId } from "../shared/randomId.mjs";

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
  return randomId("req-");
}

// 挂载 WS 到现有 http server。registry 由 runtimeRegistry.createRuntimeRegistry() 创建。
// spaceStore：空间注册表，用于把客户端的空间归位（见 workspaceIdForRequest）。
// 返回 { wss, registry } 供 v1 运行时态 handler 使用。
export function attachRuntimeWebSocket(server, registry, spaceStore = null) {
  const wss = new WebSocketServer({ noServer: true });

  // 客户端所属空间：只能从 WS 握手的 Cookie 取——浏览器同源 WS 会自动带上 Cookie，
  // 而自定义头在浏览器 WS 握手里不可设置。
  // 缺 Cookie 或 Cookie 指向的空间已不存在时**归位到首个空间**：与派发层「隐式来源未知
  // 则回退 spaces[0]」同一语义。于是「无 Cookie 的前端」与「无空间的调用方」同属首个空间，
  // 严格按空间筛选也能互相选中；反过来别的空间的调用方则选不到它（不会跨空间打靶）。
  function workspaceIdForRequest(request) {
    const cookie = parseSpaceCookie(request?.headers?.cookie);
    if (!spaceStore) {
      // 未注入 store（纯逻辑单测）：只存 Cookie 原值，无归位可言
      return cookie;
    }
    return spaceStore.has(cookie) ? cookie : spaceStore.firstId();
  }

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    // WS 在 apiPrefix 下：/webgrp/ws
    if (url.pathname !== apiPath("/ws")) {
      // 非 /webgrp/ws 升级，交还（实际无其他 WS，直接销毁）
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws, request) => {
    const workspaceId = workspaceIdForRequest(request);
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
        registeredEntry = registry.register(clientId, send, workspaceId);
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
      if (message.type === "command-response") {
        const requestId = String(message.requestId ?? "");
        const ok = Boolean(message.ok);
        registry.resolveCommand(
          clientId,
          requestId,
          ok,
          ok ? message.data : null,
          ok ? null : { code: message.error?.code ?? "control-failed", message: message.error?.message }
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

  // 供 v1 handler 调用：向客户端拉取运行时态。
  // workspaceId：调用方所在空间，未指定 clientId 时用它筛出目标客户端。
  async function fetchFromClient(clientId, resource, params = {}, workspaceId) {
    const requestId = generateRequestId();
    return registry.fetchFromClient(clientId, requestId, resource, params, (entry, message) => {
      entry.send(message);
    }, workspaceId);
  }

  function listClients() {
    return registry.listClients();
  }

  // 供 v1 control handler 调用：向客户端下发写指令并等待 command-response。
  // workspaceId：调用方所在空间，未指定 clientId 时用它筛出目标客户端。
  async function sendCommandToClient(clientId, name, params = {}, workspaceId) {
    const requestId = generateRequestId();
    return registry.commandFromClient(clientId, requestId, name, params, (entry, message) => {
      entry.send(message);
    }, workspaceId);
  }

  return { wss, registry, fetchFromClient, sendCommandToClient, listClients };
}
