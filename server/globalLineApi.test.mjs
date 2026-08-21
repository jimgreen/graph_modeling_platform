import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { apiPath } from "./config.mjs";

let dataDir;
let createImageServer;
let server;
let baseUrl;

function boundaryLine(id, boundaryId, name = "全局交流一号线", boundaryEndpoint = "target") {
  return {
    id,
    kind: "ac-routable-line",
    name,
    params: {
      rated_capacity: "220",
      i_max: "199",
      r: "0.1",
      x: "1.0",
      b: "0",
      run_stat: "1",
      _routableLineSourceNodeId: boundaryEndpoint === "source" ? boundaryId : `bus-${id}`,
      _routableLineTargetNodeId: boundaryEndpoint === "target" ? boundaryId : `bus-${id}`,
      [boundaryEndpoint === "source" ? "_routableLineSourceTerminalId" : "_routableLineTargetTerminalId"]: "t1"
    },
    terminals: []
  };
}

async function fetchJson(pathname, init) {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function jsonRequest(method, body) {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "global-line-api-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  ({ createImageServer } = await import("./server.mjs"));
});

afterAll(async () => {
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe("/webgrp/global-lines", () => {
  test("DELETE /record 仅允许删除首末端均为空的全局线路", async () => {
    const lineNode = boundaryLine("line-delete-empty", "station-delete-empty", "待删除空线路", "source");
    const reference = {
      projectIdx: 51,
      schemePath: ["主方案"],
      projectName: "厂站五十一",
      nodeId: lineNode.id,
      boundaryEndpoint: "source",
      boundaryNodeId: "station-delete-empty",
      boundaryTerminalId: "t1"
    };
    const attached = await fetchJson(apiPath("/global-lines/attach"), jsonRequest("POST", {
      energyType: "ac",
      name: lineNode.name,
      node: lineNode,
      reference
    }));
    expect(attached.status).toBe(201);

    const occupiedDelete = await fetchJson(apiPath("/global-lines/record"), jsonRequest("DELETE", {
      id: attached.payload.record.id
    }));
    expect(occupiedDelete.status).toBe(409);

    const detached = await fetchJson(apiPath("/global-lines/detach"), jsonRequest("POST", {
      globalLineId: attached.payload.record.id,
      reference
    }));
    expect(detached.status).toBe(200);
    expect(detached.payload.record.degree).toBe(0);

    const deleted = await fetchJson(apiPath("/global-lines/record"), jsonRequest("DELETE", {
      id: attached.payload.record.id
    }));
    expect(deleted.status).toBe(200);
    expect(deleted.payload.record).toMatchObject({ id: attached.payload.record.id, degree: 0 });
    const list = await fetchJson(apiPath("/global-lines"));
    expect(list.payload.records.some((record) => record.id === attached.payload.record.id)).toBe(false);
  });

  test("首末端互补时允许复用，同向挂接返回409，删除某图线路只清空对应方向槽", async () => {
    const firstNode = boundaryLine("line-a", "station-a");
    const first = await fetchJson(apiPath("/global-lines/attach"), jsonRequest("POST", {
      energyType: "ac",
      name: firstNode.name,
      node: firstNode,
      reference: {
        projectIdx: 1,
        schemePath: ["主方案"],
        projectName: "厂站A",
        nodeId: firstNode.id,
        boundaryEndpoint: "target",
        boundaryNodeId: "station-a",
        boundaryTerminalId: "t1"
      }
    }));
    expect(first.status).toBe(201);
    expect(first.payload.record).toMatchObject({ degree: 1, endpointSlots: { source: null, target: { nodeId: "line-a" } } });

    const conflictNode = boundaryLine("line-conflict", "feeder-conflict");
    const conflict = await fetchJson(apiPath("/global-lines/attach"), jsonRequest("POST", {
      globalLineId: first.payload.record.id,
      energyType: "ac",
      node: conflictNode,
      reference: {
        projectIdx: 2,
        schemePath: ["主方案"],
        projectName: "馈线冲突",
        nodeId: conflictNode.id,
        boundaryEndpoint: "target",
        boundaryNodeId: "feeder-conflict",
        boundaryTerminalId: "t1"
      }
    }));
    expect(conflict.status).toBe(409);

    const secondNode = boundaryLine("line-b", "feeder-b", "全局交流一号线", "source");
    const second = await fetchJson(apiPath("/global-lines/attach"), jsonRequest("POST", {
      globalLineId: first.payload.record.id,
      energyType: "ac",
      node: secondNode,
      reference: {
        projectIdx: 2,
        schemePath: ["主方案"],
        projectName: "馈线B",
        nodeId: secondNode.id,
        boundaryEndpoint: "source",
        boundaryNodeId: "feeder-b",
        boundaryTerminalId: "t1"
      }
    }));
    expect(second.status).toBe(201);
    expect(second.payload.record).toMatchObject({ degree: 2, endpointSlots: { source: { nodeId: "line-b" }, target: { nodeId: "line-a" } } });

    const detached = await fetchJson(apiPath("/global-lines/sync-project"), jsonRequest("POST", {
      projectIdx: 2,
      schemePath: ["主方案"],
      projectName: "馈线B",
      modelType: "馈线",
      nodes: []
    }));
    expect(detached.status).toBe(200);
    const retained = detached.payload.records.find((record) => record.id === first.payload.record.id);
    expect(retained).toMatchObject({ id: first.payload.record.id, idx: first.payload.record.idx, degree: 1, endpointSlots: { source: null, target: { nodeId: "line-a" } } });
  });

  test("保存厂站模型时全局表独占名称和参数，读取接口按idx投影完整运行态", async () => {
    const boundary = { id: "station-x", kind: "static-model-interaction-station", name: "厂站X", params: {}, terminals: [] };
    const bus = { id: "bus-x", kind: "ac-bus", name: "母线X", params: {}, terminals: [] };
    const line = boundaryLine("line-x", boundary.id, "厂站X出线");
    const saved = await fetchJson(apiPath("/schemes/project"), jsonRequest("PUT", {
      schemePath: ["主方案"],
      name: "厂站X",
      project: { version: 1, name: "厂站X", modelType: "厂站", nodes: [boundary, bus, line], edges: [] }
    }));

    expect(saved.status).toBe(200);
    const storedLine = saved.payload.project.project.nodes.find((node) => node.id === line.id);
    expect(storedLine.params._globalLineId).toMatch(/^global-line-/u);
    expect(Number(storedLine.params.idx)).toBeGreaterThan(0);
    expect(storedLine).toMatchObject({
      name: "厂站X出线",
      params: expect.objectContaining({ rated_capacity: "220", r: "0.1" })
    });

    const storedProject = JSON.parse(await readFile(
      join(dataDir, "schemes", "files", "主方案", "厂站X.json"),
      "utf-8"
    ));
    const persistedLine = storedProject.nodes.find((node) => node.id === line.id);
    expect(persistedLine).not.toHaveProperty("name");
    expect(persistedLine.params).toMatchObject({
      idx: storedLine.params.idx,
      _routableLineSourceNodeId: line.params._routableLineSourceNodeId,
      _routableLineTargetNodeId: line.params._routableLineTargetNodeId
    });
    expect(persistedLine.params).not.toHaveProperty("_globalLineId");
    expect(persistedLine.params).not.toHaveProperty("rated_capacity");
    expect(persistedLine.params).not.toHaveProperty("r");

    const loaded = await fetchJson(
      `${apiPath("/schemes/project")}?schemePath=${encodeURIComponent(JSON.stringify(["主方案"]))}&name=${encodeURIComponent("厂站X")}`
    );
    expect(loaded.status).toBe(200);
    expect(loaded.payload.project.project.nodes.find((node) => node.id === line.id)).toMatchObject({
      name: "厂站X出线",
      params: expect.objectContaining({
        _globalLineId: storedLine.params._globalLineId,
        idx: storedLine.params.idx,
        rated_capacity: "220",
        r: "0.1"
      })
    });

    const list = await fetchJson(apiPath("/global-lines"));
    expect(list.status).toBe(200);
    expect(list.payload.records).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: storedLine.params._globalLineId, name: "厂站X出线", degree: 1 })
    ]));

    const storedTextBeforeTableUpdate = await readFile(
      join(dataDir, "schemes", "files", "主方案", "厂站X.json"),
      "utf-8"
    );
    const updated = await fetchJson(apiPath("/global-lines/record"), jsonRequest("PUT", {
      id: storedLine.params._globalLineId,
      name: "厂站X出线-仅改全局表",
      params: { rated_capacity: "500", r: "0.25" }
    }));
    expect(updated.status).toBe(200);
    expect(updated.payload.record).toMatchObject({
      name: "厂站X出线-仅改全局表",
      params: { rated_capacity: "500", r: "0.25" }
    });
    expect(await readFile(
      join(dataDir, "schemes", "files", "主方案", "厂站X.json"),
      "utf-8"
    )).toBe(storedTextBeforeTableUpdate);

    const reloaded = await fetchJson(
      `${apiPath("/schemes/project")}?schemePath=${encodeURIComponent(JSON.stringify(["主方案"]))}&name=${encodeURIComponent("厂站X")}`
    );
    expect(reloaded.payload.project.project.nodes.find((node) => node.id === line.id)).toMatchObject({
      name: "厂站X出线-仅改全局表",
      params: expect.objectContaining({ rated_capacity: "500", r: "0.25" })
    });
  });
});
