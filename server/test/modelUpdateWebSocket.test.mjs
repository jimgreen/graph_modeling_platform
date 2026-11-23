import { afterEach, describe, expect, test } from "vitest";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { apiPath } from "../config.mjs";
import { createModelUpdateService } from "../modelUpdateService.mjs";
import { createRuntimeRegistry } from "../runtimeRegistry.mjs";
import { attachRuntimeWebSocket } from "../runtimeWs.mjs";
import { attachModelUpdateWebSocket } from "../modelUpdateWebSocket.mjs";
import { createSpaceStore } from "../spaceStore.mjs";

const subscriptionPath = apiPath("/v1/subscriptions/ws");
const knownSpaces = new Set(["space-a", "space-b"]);
let server;
let baseUrl;
let clients;
let service;
let dataDir;

function openSocket(path, origin) {
  return new Promise((resolve, reject) => {
    const options = origin ? { headers: { Origin: origin } } : undefined;
    const ws = new WebSocket(`${baseUrl}${path}`, options);
    ws.once("open", () => {
      clients.add(ws);
      resolve(ws);
    });
    ws.once("error", reject);
  });
}

function nextMessage(ws) {
  return new Promise((resolve, reject) => {
    ws.once("message", (raw) => {
      try {
        resolve(JSON.parse(String(raw)));
      } catch (error) {
        reject(error);
      }
    });
    ws.once("error", reject);
  });
}

async function expectHandshakeRejected(path, origin, status) {
  const error = await new Promise((resolve) => {
    const options = origin ? { headers: { Origin: origin } } : undefined;
    const ws = new WebSocket(`${baseUrl}${path}`, options);
    ws.once("open", () => {
      clients.add(ws);
      ws.close();
      resolve(new Error("WebSocket handshake unexpectedly succeeded"));
    });
    ws.once("error", resolve);
  });
  expect(error).toBeInstanceOf(Error);
  if (status !== undefined) expect(error.message).toContain(String(status));
}

async function closeClient(ws) {
  if (ws.readyState === WebSocket.CLOSED) return;
  await new Promise((resolve) => {
    ws.once("close", resolve);
    ws.close();
  });
}

async function startServer() {
  clients = new Set();
  server = http.createServer();
  const store = { has: (id) => knownSpaces.has(id), firstId: () => "space-a" };
  service = createModelUpdateService({
    buildPayload: async ({ record, schemePath, files }) => ({
      model_id: String(record.project.idx),
      model_name: record.name,
      scheme_path: JSON.stringify(schemePath),
      files
    }),
    sendMessage: () => undefined
  });
  attachRuntimeWebSocket(server, createRuntimeRegistry(), () => store, {
    passThroughPaths: [subscriptionPath]
  });
  attachModelUpdateWebSocket(server, { service, getSpaceStore: () => store });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

afterEach(async () => {
  await Promise.all([...clients].map(closeClient));
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = undefined;
  }
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true });
    dataDir = undefined;
  }
});

describe("model update WebSocket protocol", () => {
  test("accepts subscription and sends multipart-compatible model update frame", async () => {
    await startServer();
    const ws = await openSocket(`${subscriptionPath}?space=space-a`, "https://remote-client.example");
    ws.send(JSON.stringify({
      type: "subscribe",
      scope: { type: "space" },
      files: [{ kind: "json" }, { kind: "xml" }, { kind: "e", encoding: "gbk" }]
    }));
    const subscribed = await nextMessage(ws);
    expect(subscribed).toMatchObject({
      type: "subscribed",
      ok: true,
      data: {
        scope: { type: "space" },
        files: [
          { kind: "json", encoding: "utf-8" },
          { kind: "xml", encoding: "utf-8" },
          { kind: "e", encoding: "gbk" }
        ]
      }
    });
    expect(subscribed.data.subscriptionId).toEqual(expect.any(String));

    const updatePromise = nextMessage(ws);
    await service.publishModelChanged({
      spaceId: "space-a",
      schemePath: ["方案"],
      record: { name: "模型一", project: { idx: 12 } }
    });
    expect(await updatePromise).toMatchObject({
      type: "model.updated",
      data: {
        model_id: "12",
        model_name: "模型一",
        scheme_path: "[\"方案\"]",
        files: [
          { kind: "json", encoding: "utf-8" },
          { kind: "xml", encoding: "utf-8" },
          { kind: "e", encoding: "gbk" }
        ]
      }
    });

    const unsubscribePromise = nextMessage(ws);
    ws.send(JSON.stringify({ type: "unsubscribe", subscriptionId: subscribed.data.subscriptionId }));
    expect(await unsubscribePromise).toMatchObject({
      type: "unsubscribed",
      ok: true,
      data: { subscriptionId: subscribed.data.subscriptionId }
    });
  });

  test("echoes optional requestId on subscription, unsubscribe, and error frames", async () => {
    await startServer();
    const ws = await openSocket(`${subscriptionPath}?space=space-a`);

    ws.send(JSON.stringify({
      type: "subscribe",
      requestId: "req-subscribe-1",
      scope: { type: "space" },
      files: [{ kind: "json" }]
    }));
    const subscribed = await nextMessage(ws);
    expect(subscribed).toMatchObject({
      type: "subscribed",
      requestId: "req-subscribe-1",
      ok: true
    });

    ws.send(JSON.stringify({
      type: "unsubscribe",
      requestId: "req-unsubscribe-1",
      subscriptionId: subscribed.data.subscriptionId
    }));
    expect(await nextMessage(ws)).toMatchObject({
      type: "unsubscribed",
      requestId: "req-unsubscribe-1",
      ok: true
    });

    ws.send(JSON.stringify({
      type: "subscribe",
      requestId: "req-error-1",
      scope: { type: "space" },
      files: [{ kind: "svg" }]
    }));
    expect(await nextMessage(ws)).toMatchObject({
      type: "error",
      requestId: "req-error-1",
      error: { code: "bad-request" }
    });
  });

  test("accepts native clients and remote browser origins, rejects unknown spaces and unrelated upgrades", async () => {
    await startServer();
    const native = await openSocket(`${subscriptionPath}?space=space-a`);
    const browser = await openSocket(`${subscriptionPath}?space=space-b`, "http://remote-client.example");
    expect(native.readyState).toBe(WebSocket.OPEN);
    expect(browser.readyState).toBe(WebSocket.OPEN);

    await expectHandshakeRejected(`${subscriptionPath}?space=missing`, undefined, 404);
    await expectHandshakeRejected(apiPath("/ws"), "https://remote-client.example");
    await expectHandshakeRejected("/unrecognized");
  });

  test("createImageServer mounts the subscription channel on its existing listener", async () => {
    clients = new Set();
    dataDir = mkdtempSync(join(tmpdir(), "model-update-websocket-server-"));
    const store = createSpaceStore(dataDir);
    const { createImageServer } = await import("../server.mjs");
    server = await createImageServer({ port: 0, host: "127.0.0.1", spaceStore: store });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const initialize = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "默认空间" })
    });
    expect(initialize.status).toBe(200);

    const ws = await openSocket(`${subscriptionPath}?space=default`);
    ws.send(JSON.stringify({ type: "subscribe", scope: { type: "space" }, files: [{ kind: "json" }] }));
    expect(await nextMessage(ws)).toMatchObject({
      type: "subscribed",
      ok: true,
      data: { scope: { type: "space" }, files: [{ kind: "json", encoding: "utf-8" }] }
    });
  });
});
