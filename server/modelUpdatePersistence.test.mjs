import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import AdmZip from "adm-zip";
import { apiPath } from "./config.mjs";
import { createSpaceStore } from "./spaceStore.mjs";

let dataDir;
let server;
let baseUrl;
let ws;
let savedModelId;
const additionalSockets = new Set();

function nextMessage(target = ws, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket 更新帧超时。")), timeoutMs);
    target.once("message", (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(String(raw)));
    });
    target.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function expectNoMessageFor(target, durationMs = 80) {
  return new Promise((resolve, reject) => {
    const onMessage = (raw) => {
      clearTimeout(timer);
      reject(new Error(`收到不应发布的更新帧：${String(raw)}`));
    };
    const timer = setTimeout(() => {
      target.off("message", onMessage);
      resolve();
    }, durationMs);
    target.once("message", onMessage);
  });
}

function modelProject(name, vbase = "10") {
  return {
    name,
    modelType: "厂站",
    canvasWidth: 800,
    canvasHeight: 400,
    nodes: [{
      id: "bus1",
      kind: "ac-bus",
      name: "母线一",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 40 },
      terminals: [],
      params: { vbase }
    }],
    edges: []
  };
}

async function openSpaceSubscription(spaceId) {
  const socket = new WebSocket(
    `ws://127.0.0.1:${server.address().port}${apiPath("/v1/subscriptions/ws")}?space=${encodeURIComponent(spaceId)}`
  );
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.send(JSON.stringify({ type: "subscribe", scope: { type: "space" }, files: [{ kind: "json" }] }));
  const ack = await nextMessage(socket);
  expect(ack).toMatchObject({ type: "subscribed", ok: true });
  additionalSockets.add(socket);
  return socket;
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "model-update-persistence-"));
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({
    port: 0,
    host: "127.0.0.1",
    spaceStore: createSpaceStore(dataDir)
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const initialize = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "默认空间" })
  });
  expect(initialize.status).toBe(200);

  ws = new WebSocket(`ws://127.0.0.1:${server.address().port}${apiPath("/v1/subscriptions/ws")}?space=default`);
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  ws.send(JSON.stringify({
    type: "subscribe",
    scope: { type: "space" },
    files: [{ kind: "json" }]
  }));
  const ack = await nextMessage();
  expect(ack).toMatchObject({ type: "subscribed", ok: true });
});

afterAll(async () => {
  await Promise.all([...additionalSockets].map((socket) => new Promise((resolve) => {
    if (socket.readyState === WebSocket.CLOSED) return resolve();
    socket.once("close", resolve);
    socket.close();
  })));
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    await new Promise((resolve) => {
      ws.once("close", resolve);
      ws.close();
    });
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

describe("model update persistence notifications", () => {
  test("publishes only after a model record is saved", async () => {
    const updatePromise = nextMessage();
    const response = await fetch(`${baseUrl}${apiPath("/schemes/project")}?space=default`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemePath: ["通知方案"],
        record: {
          name: "保存模型",
          project: modelProject("保存模型")
        }
      })
    });
    expect(response.status).toBe(200);
    const saved = await response.json();
    savedModelId = saved.project.project.idx;
    const update = await updatePromise;
    expect(update.type).toBe("model.updated");
    expect(update.data.model_name).toBe("保存模型");
    expect(update.data.scheme_path).toBe("[\"通知方案\"]");
    const jsonFile = update.data.files.find((file) => file.field === "json_file");
    expect(JSON.parse(Buffer.from(jsonFile.contentBase64, "base64").toString("utf-8")))
      .toEqual(saved.project.project);
  });

  test("schemeId-only model saves publish from the resolved scheme", async () => {
    const schemeResponse = await fetch(`${baseUrl}${apiPath("/schemes/scheme")}?space=default`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["编号通知方案"] })
    });
    expect(schemeResponse.status).toBe(200);
    const scheme = await schemeResponse.json();
    expect(Number.isSafeInteger(scheme.schemeId)).toBe(true);

    const updatePromise = nextMessage();
    const response = await fetch(`${baseUrl}${apiPath("/schemes/project")}?space=default`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemeId: scheme.schemeId,
        record: {
          name: "编号通知模型",
          project: modelProject("编号通知模型")
        }
      })
    });
    expect(response.status).toBe(200);
    expect(await updatePromise).toMatchObject({
      type: "model.updated",
      data: { model_name: "编号通知模型", scheme_path: "[\"编号通知方案\"]" }
    });
  });

  test("does not publish a rejected model save", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/schemes/project")}?space=default`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["通知方案"], record: { name: "坏模型", project: null } })
    });
    expect(response.status).toBe(400);
    await expectNoMessageFor(ws);
  });

  test("model deletion sends no delete frame, removes model subscriptions, and space deletion closes its sockets", async () => {
    const scopedModelSocket = new WebSocket(
      `ws://127.0.0.1:${server.address().port}${apiPath("/v1/subscriptions/ws")}?space=default`
    );
    await new Promise((resolve, reject) => {
      scopedModelSocket.once("open", resolve);
      scopedModelSocket.once("error", reject);
    });
    scopedModelSocket.send(JSON.stringify({
      type: "subscribe",
      scope: { type: "model", modelId: savedModelId },
      files: [{ kind: "json" }]
    }));
    expect(await nextMessage(scopedModelSocket)).toMatchObject({ type: "subscribed", ok: true });
    additionalSockets.add(scopedModelSocket);

    const deletion = await fetch(`${baseUrl}${apiPath("/schemes/project")}?space=default`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["通知方案"], name: "保存模型" })
    });
    expect(deletion.status).toBe(200);
    await expectNoMessageFor(ws);
    await expectNoMessageFor(scopedModelSocket);

    const createSpace = await fetch(`${baseUrl}${apiPath("/spaces")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "即将删除空间" })
    });
    const temporarySpace = await createSpace.json();
    const temporarySocket = await openSpaceSubscription(temporarySpace.id);
    const closePromise = new Promise((resolve) => {
      temporarySocket.once("close", (code) => resolve(code));
    });
    const removeSpace = await fetch(`${baseUrl}${apiPath("/spaces")}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: temporarySpace.id })
    });
    expect(removeSpace.status).toBe(200);
    expect(await closePromise).toBe(4003);
  });

  test("publishes newly persisted models after a successful batch write", async () => {
    const updatePromise = nextMessage();
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}?space=default`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemes: [{
          id: "batch-scheme",
          name: "批量方案",
          updatedAt: "2026-11-21T10:00:00.000Z",
          projects: [{
            id: "batch-project",
            name: "批量模型",
            updatedAt: "2026-11-21T10:00:00.000Z",
            project: modelProject("批量模型", "35")
          }],
          children: []
        }]
      })
    });
    expect(response.status).toBe(200);
    expect(await updatePromise).toMatchObject({
      type: "model.updated",
      data: { model_name: "批量模型", scheme_path: "[\"批量方案\"]" }
    });
    const rejected = await fetch(`${baseUrl}${apiPath("/schemes")}?space=default`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemes: "invalid" })
    });
    expect(rejected.status).toBe(400);
    await expectNoMessageFor(ws);
  });

  test("publishes newly imported scheme models only after the archive is committed", async () => {
    const zip = new AdmZip();
    zip.addFile("导入方案/导入模型.json", Buffer.from(JSON.stringify(modelProject("导入模型")), "utf-8"));
    const archive = zip.toBuffer();
    const updatePromise = nextMessage();
    const response = await fetch(`${baseUrl}${apiPath("/schemes/import")}?fileName=${encodeURIComponent("导入方案.zip")}&space=default`, {
      method: "POST",
      headers: { "content-type": "application/zip" },
      body: archive
    });
    expect(response.status).toBe(200);
    expect(await updatePromise).toMatchObject({
      type: "model.updated",
      data: { model_name: "导入模型", scheme_path: "[\"导入方案\"]" }
    });
    const conflict = await fetch(`${baseUrl}${apiPath("/schemes/import")}?fileName=${encodeURIComponent("导入方案.zip")}&space=default`, {
      method: "POST",
      headers: { "content-type": "application/zip" },
      body: archive
    });
    expect(conflict.status).toBe(409);
    await expectNoMessageFor(ws);
  });

  test("preserves a same-id subscriber and publishes models after successful space overwrite import", async () => {
    const createResponse = await fetch(`${baseUrl}${apiPath("/spaces")}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "订阅覆盖空间" })
    });
    expect(createResponse.status).toBe(200);
    const space = await createResponse.json();
    const saveResponse = await fetch(`${baseUrl}${apiPath("/schemes/project")}?space=${encodeURIComponent(space.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schemePath: ["方案"], record: { name: "覆写模型", project: modelProject("覆写模型") } })
    });
    expect(saveResponse.status).toBe(200);
    const subscriber = await openSpaceSubscription(space.id);

    const archiveResponse = await fetch(`${baseUrl}${apiPath("/spaces/export")}?space=${encodeURIComponent(space.id)}`);
    expect(archiveResponse.status).toBe(200);
    const archive = new AdmZip(Buffer.from(await archiveResponse.arrayBuffer()));
    const modelEntry = archive.getEntries().find((entry) => entry.entryName.endsWith("/覆写模型.json"));
    expect(modelEntry).toBeTruthy();
    const importedProject = JSON.parse(modelEntry.getData().toString("utf-8"));
    importedProject.nodes[0].params.vbase = "35";
    archive.updateFile(modelEntry.entryName, Buffer.from(JSON.stringify(importedProject), "utf-8"));
    const updatePromise = nextMessage(subscriber);
    const importResponse = await fetch(`${baseUrl}${apiPath("/spaces/import")}?space=default&mode=overwrite`, {
      method: "POST",
      headers: { "content-type": "application/zip" },
      body: archive.toBuffer()
    });
    expect(importResponse.status).toBe(200);
    expect((await importResponse.json()).space.id).toBe(space.id);
    expect(subscriber.readyState).toBe(WebSocket.OPEN);
    expect(await updatePromise).toMatchObject({
      type: "model.updated",
      data: { model_name: "覆写模型", scheme_path: "[\"方案\"]" }
    });
    const conflictImport = await fetch(`${baseUrl}${apiPath("/spaces/import")}?space=default`, {
      method: "POST",
      headers: { "content-type": "application/zip" },
      body: archive.toBuffer()
    });
    expect(conflictImport.status).toBe(409);
    await expectNoMessageFor(subscriber);
  });
});
