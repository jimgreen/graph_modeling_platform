import http from "node:http";
import { afterEach, describe, expect, test, vi } from "vitest";
import { WebSocketServer } from "ws";
import { ModelUpdateClient } from "../src/model-update-client.mjs";

const subscriptionPath = "/webgrp/v1/subscriptions/ws";
const runningServers = new Set();

async function startSubscriptionServer({ port = 0, onSubscribe, onConnection } = {}) {
  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer, path: subscriptionPath });
  const sockets = new Set();
  let connectionCount = 0;
  wss.on("connection", (ws) => {
    sockets.add(ws);
    const connectionId = ++connectionCount;
    onConnection?.({ ws, connectionId });
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "subscribe") {
        onSubscribe?.({ ws, connectionId, message });
      }
    });
    ws.once("close", () => sockets.delete(ws));
  });
  await new Promise((resolve) => httpServer.listen(port, "127.0.0.1", resolve));
  const address = httpServer.address();
  const server = {
    port: address.port,
    connectionCount: () => connectionCount,
    close: async (code = 1001, reason = "server restart") => {
      for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) ws.close(code, reason);
      }
      await new Promise((resolve) => httpServer.close(resolve));
      wss.close();
      runningServers.delete(server);
    }
  };
  runningServers.add(server);
  return server;
}

async function waitFor(predicate, timeoutMs = 2_000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeoutMs) throw new Error("等待条件超时。");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const server of [...runningServers]) await server.close();
});

describe("ModelUpdateClient", () => {
  test("reconnects after a server restart and re-subscribes in creation order", async () => {
    const generations = [];
    let generation = 0;
    let port = 0;
    const start = async () => {
      generation += 1;
      const messages = [];
      generations.push(messages);
      const server = await startSubscriptionServer({
        port,
        onSubscribe: ({ ws, message }) => {
          messages.push(message);
          ws.send(JSON.stringify({
            type: "subscribed",
            ok: true,
            requestId: message.requestId,
            data: {
              subscriptionId: `sub-${generation}-${messages.length}`,
              scope: message.scope,
              files: message.files.map((file) => ({ kind: file.kind, encoding: file.encoding ?? "utf-8" }))
            }
          }));
          if (generation === 2 && messages.length === 2) {
            ws.send(JSON.stringify({
              type: "model.updated",
              data: { model_id: "12", model_name: "模型一", files: [] }
            }));
          }
        }
      });
      port = server.port;
      return server;
    };

    let server = await start();
    const updates = [];
    const client = new ModelUpdateClient({
      url: `ws://127.0.0.1:${server.port}${subscriptionPath}`,
      space: "space-a",
      reconnectMinDelayMs: 10,
      reconnectMaxDelayMs: 20,
      reconnectJitter: 0
    });
    client.on("model.updated", (data) => updates.push(data));

    const first = await client.subscribe({ scope: { type: "space" }, files: [{ kind: "json" }] });
    const second = await client.subscribe({ scope: { type: "model", modelId: 12 }, files: [{ kind: "e", encoding: "gbk" }] });
    expect(first.subscriptionId).toBe("sub-1-1");
    expect(second.subscriptionId).toBe("sub-1-2");

    await server.close();
    server = await start();
    await waitFor(() => first.subscriptionId === "sub-2-1" && second.subscriptionId === "sub-2-2");

    expect(generations[1].map((message) => message.scope.type)).toEqual(["space", "model"]);
    expect(updates).toEqual([{ model_id: "12", model_name: "模型一", files: [] }]);
    client.close();
  });

  test("accepts a legacy ack without requestId when only one request is pending", async () => {
    const server = await startSubscriptionServer({
      onSubscribe: ({ ws, message }) => ws.send(JSON.stringify({
        type: "subscribed",
        ok: true,
        data: {
          subscriptionId: "legacy-sub-1",
          scope: message.scope,
          files: message.files
        }
      }))
    });
    const client = new ModelUpdateClient({
      url: `ws://127.0.0.1:${server.port}${subscriptionPath}`,
      reconnect: false
    });

    const handle = await client.subscribe({ scope: { type: "space" }, files: [{ kind: "json" }] });

    expect(handle.subscriptionId).toBe("legacy-sub-1");
    client.close();
  });

  test("reports a protocol error instead of guessing among multiple request-less acks", () => {
    const client = new ModelUpdateClient({ url: "ws://127.0.0.1:1/webgrp/v1/subscriptions/ws" });
    const errors = [];
    client.on("error", (error) => errors.push(error));
    const record = (id) => ({ id, subscriptionId: null, handle: { id } });
    client.addPending("request-1", { type: "subscribe", record: record("handle-1") });
    client.addPending("request-2", { type: "subscribe", record: record("handle-2") });

    client.handleMessage(JSON.stringify({
      type: "subscribed",
      ok: true,
      data: { subscriptionId: "ambiguous-subscription" }
    }));

    expect(errors.at(-1)?.code).toBe("bad-response");
    expect(client.pending.size).toBe(2);
  });

  test("does not reconnect after an explicit close", async () => {
    const server = await startSubscriptionServer({
      onSubscribe: ({ ws, message }) => ws.send(JSON.stringify({
        type: "subscribed",
        ok: true,
        requestId: message.requestId,
        data: { subscriptionId: "sub-1", scope: message.scope, files: message.files }
      }))
    });
    const client = new ModelUpdateClient({
      url: `ws://127.0.0.1:${server.port}${subscriptionPath}`,
      reconnectMinDelayMs: 10,
      reconnectMaxDelayMs: 10,
      reconnectJitter: 0
    });
    await client.subscribe({ scope: { type: "space" }, files: [{ kind: "json" }] });
    client.close();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(server.connectionCount()).toBe(1);
  });

  test("treats space deletion close code as permanent", async () => {
    const server = await startSubscriptionServer({
      onConnection: ({ ws }) => setTimeout(() => ws.close(4003, "空间已删除"), 10)
    });
    const errors = [];
    const client = new ModelUpdateClient({
      url: `ws://127.0.0.1:${server.port}${subscriptionPath}`,
      reconnectMinDelayMs: 10,
      reconnectMaxDelayMs: 10,
      reconnectJitter: 0
    });
    client.on("error", (error) => errors.push(error));
    await expect(client.connect()).resolves.toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.connectionCount()).toBe(1);
    expect(errors.at(-1)?.code).toBe("space-deleted");
    client.close();
  });

  test("rejects subscribe when the WebSocket factory fails synchronously", async () => {
    const client = new ModelUpdateClient({
      url: "ws://127.0.0.1:1/webgrp/v1/subscriptions/ws",
      reconnect: false,
      webSocketFactory: () => {
        throw new Error("factory failed");
      }
    });

    await expect(Promise.race([
      client.subscribe({ scope: { type: "space" }, files: [{ kind: "json" }] }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("subscribe timed out")), 200))
    ])).rejects.toMatchObject({ code: "connection-failed" });
  });

  test("rejects subscribe when the socket closes before opening", async () => {
    const listeners = new Map();
    const socket = {
      readyState: 0,
      once(event, listener) {
        listeners.set(event, listener);
        return this;
      },
      on(event, listener) {
        listeners.set(event, listener);
        return this;
      },
      close() {}
    };
    const client = new ModelUpdateClient({
      url: "ws://127.0.0.1:1/webgrp/v1/subscriptions/ws",
      reconnect: false,
      webSocketFactory: () => socket
    });

    const pending = client.subscribe({ scope: { type: "space" }, files: [{ kind: "json" }] });
    setTimeout(() => listeners.get("close")?.(1006, "dropped before open"), 0);

    await expect(pending).rejects.toMatchObject({ code: "connection-closed" });
  });

  test("rejects the first subscribe when an open socket closes before its ACK", async () => {
    const listeners = new Map();
    const socket = {
      readyState: 0,
      once(event, listener) {
        listeners.set(event, listener);
        return this;
      },
      on(event, listener) {
        listeners.set(event, listener);
        return this;
      },
      send() {},
      close() {}
    };
    const client = new ModelUpdateClient({
      url: "ws://127.0.0.1:1/webgrp/v1/subscriptions/ws",
      reconnectMinDelayMs: 10,
      reconnectMaxDelayMs: 10,
      reconnectJitter: 0,
      webSocketFactory: () => socket
    });

    const pending = client.subscribe({ scope: { type: "space" }, files: [{ kind: "json" }] });
    socket.readyState = 1;
    listeners.get("open")?.();
    listeners.get("close")?.(1006, "dropped after open");

    await expect(pending).rejects.toMatchObject({ code: "connection-closed" });
  });
});
