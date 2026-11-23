import { beforeEach, describe, expect, test, vi } from "vitest";
import { createDefaultNode } from "../../src/model.ts";
import { createV1TopologyRoutes } from "../apiV1Topology.mjs";

function fakeRequest(body) {
  const bytes = Buffer.from(JSON.stringify(body));
  return Object.assign([bytes], { headers: { "content-type": "application/json" } });
}

function fakeResponse() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    headersSent: false,
    writeHead(status, headers = {}) {
      this.statusCode = status;
      this.headers = headers;
      this.headersSent = true;
      return this;
    },
    end(body) {
      this.body = body;
      this.headersSent = true;
    },
    json() {
      return this.body ? JSON.parse(String(this.body)) : null;
    }
  };
}

function createLoad() {
  const node = createDefaultNode("ac-load", { x: 100, y: 100 });
  node.name = "负荷";
  node.params.rated_capacity = "0";
  node.params.rated_voltage = "10";
  node.terminals[0].vbase = "10 kV";
  return node;
}

function createRecord(nodes = [createLoad()]) {
  return {
    name: "模型A",
    updatedAt: "2026-01-01T00:00:00.000Z",
    project: {
      version: 1,
      name: "模型A",
      modelType: "厂站",
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "A",
      nodes,
      edges: []
    }
  };
}

function harness({ record = createRecord(), missing = false } = {}) {
  const resolveSchemePathForSelector = vi.fn(async ({ schemePath }) => schemePath ?? ["方案A"]);
  const readSchemeProjectRecord = vi.fn(async (options) => {
    expect(options).toMatchObject({ schemePath: ["方案A"], name: "模型A" });
    return missing ? null : record;
  });
  const readSchemes = vi.fn(async () => []);
  const saveSchemeProjectRecord = vi.fn(async ({ record: savedRecord }) => savedRecord);
  const updateSchemeProjectRecordIfUnchanged = vi.fn(async ({ expectedUpdatedAt, expectedContentHash, ...options }) => {
    const latestRecord = await readSchemeProjectRecord(options);
    if (!latestRecord || latestRecord.updatedAt !== expectedUpdatedAt || latestRecord.contentHash !== expectedContentHash) return { conflict: true };
    const record = await saveSchemeProjectRecord({ ...options, record: options.record });
    return { conflict: false, record };
  });
  const sendCommandToClient = vi.fn(async (clientId, name, params, spaceId) => ({ clientId, name, params, spaceId }));
  return {
    record,
    readSchemeProjectRecord,
    readSchemes,
    saveSchemeProjectRecord,
    updateSchemeProjectRecordIfUnchanged,
    sendCommandToClient,
    resolveSchemePathForSelector,
    services: { resolveSchemePathForSelector, readSchemeProjectRecord, readSchemes, saveSchemeProjectRecord, updateSchemeProjectRecordIfUnchanged },
    ctx: { sendCommandToClient },
    paths: { root: "workspace-root", schemeFiles: "workspace-schemes" }
  };
}

async function call(handler, { body, query = "", paths, spaceId, ctx } = {}) {
  const response = fakeResponse();
  await handler({
    request: fakeRequest(body),
    response,
    url: new URL(`http://127.0.0.1/webgrp/v1/topology${query ? `?${query}` : ""}`),
    paths,
    spaceId
  }, ctx);
  return response;
}

describe("v1 topology handlers", () => {
  let createV1TopologyHandlers;

  beforeEach(async () => {
    ({ createV1TopologyHandlers } = await import("../apiV1Topology.mjs"));
  });

  test("rejects missing, mixed, and malformed target without reading or writing models", async () => {
    const h = harness();
    const handlers = createV1TopologyHandlers(h.services);

    for (const body of [
      {},
      { target: "current", schemePath: ["方案A"], name: "模型A" },
      { target: "current", schemeId: 42, name: "模型A" },
      { target: "current", clientId: "page-1" },
      { target: "saved", schemePath: [], name: "模型A" },
      { target: "saved", schemePath: ["方案A"], name: "模型A", clientId: "page-1" },
      { target: "saved", schemePath: ["方案A"], name: "模型A", extra: true },
      { target: "saved", schemePath: [".."], name: "模型A" },
      { target: "saved", schemePath: ["."], name: "模型A" }
    ]) {
      const response = await call(handlers.handleTopologyCheck, { body, paths: h.paths, spaceId: "space-1", ctx: h.ctx });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("bad-request");
    }
    expect(h.readSchemeProjectRecord).not.toHaveBeenCalled();
    expect(h.sendCommandToClient).not.toHaveBeenCalled();
    expect(h.saveSchemeProjectRecord).not.toHaveBeenCalled();
  });

  test("JSON null body returns bad-request instead of leaving the response empty", async () => {
    const h = harness();
    const handlers = createV1TopologyHandlers(h.services);
    const response = await call(handlers.handleTopologyCheck, {
      body: null,
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
    expect(h.readSchemeProjectRecord).not.toHaveBeenCalled();
    expect(h.sendCommandToClient).not.toHaveBeenCalled();
  });

  test("current page response omits full graph nodes and topology", async () => {
    const h = harness();
    h.sendCommandToClient.mockResolvedValueOnce({
      target: "current",
      status: "success",
      errors: [],
      warnings: [],
      corrections: [],
      topologyIslandCount: 1,
      modified: false,
      nodes: Array.from({ length: 2000 }, (_, index) => ({ id: `node-${index}` })),
      topology: { connectedComponents: Array.from({ length: 2000 }, (_, index) => [`node-${index}`]) }
    });
    const handlers = createV1TopologyHandlers(h.services);
    const response = await call(handlers.handleTopologyCheck, {
      body: { target: "current" },
      query: "clientId=page-1",
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ target: "current", modified: false, saved: false });
    expect(response.json().data).not.toHaveProperty("nodes");
    expect(response.json().data).not.toHaveProperty("topology");
    expect(h.sendCommandToClient).toHaveBeenCalledWith("page-1", "topology.check", {});
    expect(h.readSchemeProjectRecord).not.toHaveBeenCalled();
    expect(h.saveSchemeProjectRecord).not.toHaveBeenCalled();
  });

  test("checks saved model with shared algorithm and returns preview without saving", async () => {
    const h = harness();
    const handlers = createV1TopologyHandlers(h.services);
    const response = await call(handlers.handleTopologyCheck, {
      body: { target: "saved", schemePath: ["方案A"], name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ target: "saved", modified: false, saved: false });
    expect(response.json().data.corrections).toContainEqual({
      nodeId: h.record.project.nodes[0].id,
      paramKey: "rated_capacity",
      value: "5 MW"
    });
    expect(h.readSchemeProjectRecord).toHaveBeenCalledWith({ paths: h.paths, schemePath: ["方案A"], name: "模型A" });
    expect(h.readSchemes).toHaveBeenCalledWith({ paths: h.paths, includeProjects: true });
    expect(h.saveSchemeProjectRecord).not.toHaveBeenCalled();
  });

  test("saved target accepts schemeId + name and resolves the canonical path", async () => {
    const h = harness();
    const handlers = createV1TopologyHandlers(h.services);
    const response = await call(handlers.handleTopologyCheck, {
      body: { target: "saved", schemeId: 42, name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(200);
    expect(h.resolveSchemePathForSelector).toHaveBeenCalledWith({ paths: h.paths, schemePath: undefined, schemeId: 42 });
    expect(h.readSchemeProjectRecord).toHaveBeenCalledWith({ paths: h.paths, schemePath: ["方案A"], name: "模型A" });
  });

  test("saved target rejects conflicting or unknown schemeId before reading the model", async () => {
    for (const [errorCode, query] of [
      ["bad-request", { target: "saved", schemePath: ["方案A"], schemeId: 42, name: "模型A" }],
      ["not-found", { target: "saved", schemeId: 99, name: "模型A" }]
    ]) {
      const h = harness();
      h.resolveSchemePathForSelector.mockRejectedValueOnce(Object.assign(new Error("selector error"), { code: errorCode }));
      const handlers = createV1TopologyHandlers(h.services);
      const response = await call(handlers.handleTopologyCheck, {
        body: query,
        paths: h.paths,
        spaceId: "space-1",
        ctx: h.ctx
      });
      expect(response.statusCode).toBe(errorCode === "not-found" ? 404 : 400);
      expect(response.json().error.code).toBe(errorCode);
      expect(h.readSchemeProjectRecord).not.toHaveBeenCalled();
    }
  });

  test("repairs and saves changed saved model once using the same workspace paths", async () => {
    const h = harness();
    const publishModelChanged = vi.fn(async () => undefined);
    const handlers = createV1TopologyHandlers(h.services);
    const response = await call(handlers.handleTopologyRepair, {
      body: { target: "saved", schemePath: ["方案A"], name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: { ...h.ctx, publishModelChanged }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ target: "saved", modified: true, saved: true });
    expect(h.updateSchemeProjectRecordIfUnchanged).toHaveBeenCalledOnce();
    const saveOptions = h.saveSchemeProjectRecord.mock.calls[0][0];
    expect(saveOptions).toMatchObject({ paths: h.paths, schemePath: ["方案A"], record: { name: "模型A" } });
    expect(saveOptions.record.project.nodes[0].params.rated_capacity).toBe("5 MW");
    expect(publishModelChanged).toHaveBeenCalledOnce();
    expect(publishModelChanged).toHaveBeenCalledWith({ schemePath: ["方案A"], record: saveOptions.record });
  });

  test("route wrapper requires workspace context and binds its space to current-page WS command", async () => {
    const calls = [];
    const routes = createV1TopologyRoutes({
      sendCommandToClient: async (...args) => {
        calls.push(args);
        return { status: "success", errors: [], warnings: [], corrections: [], topologyIslandCount: 1 };
      }
    });
    const route = routes.find((item) => item.pattern.test("/webgrp/v1/topology"));
    const response = fakeResponse();
    await route.handle({
      request: fakeRequest({ action: "check", target: "current" }),
      response,
      url: new URL("http://127.0.0.1/webgrp/v1/topology"),
      paths: { root: "workspace-root" },
      spaceId: "space-1"
    });
    expect(response.statusCode).toBe(200);
    expect(calls).toEqual([[null, "topology.check", {}, "space-1"]]);

    expect(() => route.handle({ request: fakeRequest({ action: "check", target: "current" }), response: fakeResponse(), url: new URL("http://127.0.0.1"), paths: { root: "workspace-root" } }))
      .toThrow(/spaceId/);
  });

  test("persists calculated topology node changes even when no parameter corrections were reported", async () => {
    const node = createDefaultNode("static-text", { x: 100, y: 100 });
    node.acTopologyNode = 999;
    const record = createRecord([node]);
    const h = harness({ record });
    const handlers = createV1TopologyHandlers(h.services);

    const response = await call(handlers.handleTopologyRepair, {
      body: { target: "saved", schemePath: ["方案A"], name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.modified).toBe(true);
    expect(response.json().data.corrections).toEqual([]);
    expect(h.updateSchemeProjectRecordIfUnchanged).toHaveBeenCalledOnce();
    const saveOptions = h.saveSchemeProjectRecord.mock.calls[0][0];
    const savedNodes = saveOptions.record.project.nodes;
    expect(savedNodes[0].acTopologyNode).not.toBe(999);
  });

  test("refuses to save repair when an intervening write changes the model contents", async () => {
    const h = harness();
    const initialRecord = { ...h.record, contentHash: "initial-content" };
    const readSchemeProjectRecord = vi.fn()
      .mockResolvedValueOnce(initialRecord)
      .mockResolvedValueOnce({ ...initialRecord, contentHash: "concurrent-content" });
    const updateSchemeProjectRecordIfUnchanged = vi.fn(async ({ expectedUpdatedAt, expectedContentHash, ...options }) => {
      const latestRecord = await readSchemeProjectRecord(options);
      if (!latestRecord || latestRecord.updatedAt !== expectedUpdatedAt || latestRecord.contentHash !== expectedContentHash) return { conflict: true };
      return { conflict: false };
    });
    const handlers = createV1TopologyHandlers({
      ...h.services,
      readSchemeProjectRecord,
      updateSchemeProjectRecordIfUnchanged
    });
    const response = await call(handlers.handleTopologyRepair, {
      body: { target: "saved", schemePath: ["方案A"], name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
    expect(h.saveSchemeProjectRecord).not.toHaveBeenCalled();
  });

  test("refuses to save repair when atomic update detects a concurrent save", async () => {
    const h = harness({ record: { ...createRecord(), contentHash: "fixture-content" } });
    const updateSchemeProjectRecordIfUnchanged = vi.fn(async () => ({ conflict: true }));
    const handlers = createV1TopologyHandlers({
      ...h.services,
      updateSchemeProjectRecordIfUnchanged
    });
    const response = await call(handlers.handleTopologyRepair, {
      body: { target: "saved", schemePath: ["方案A"], name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad-request");
    expect(updateSchemeProjectRecordIfUnchanged).toHaveBeenCalledOnce();
    expect(h.saveSchemeProjectRecord).not.toHaveBeenCalled();
  });

  test("returns not-found for absent saved model and does not create it", async () => {
    const h = harness({ missing: true });
    const handlers = createV1TopologyHandlers(h.services);
    const response = await call(handlers.handleTopologyRepair, {
      body: { target: "saved", schemePath: ["方案A"], name: "模型A" },
      paths: h.paths,
      spaceId: "space-1",
      ctx: h.ctx
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("not-found");
    expect(h.saveSchemeProjectRecord).not.toHaveBeenCalled();
  });
});
