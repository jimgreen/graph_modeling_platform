import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { apiPath } from "./config.mjs";

let dataDir;
let server;
let baseUrl;
let schemeId;

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "v1-scheme-number-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const initialized = await fetch(`${baseUrl}${apiPath("/spaces/initialize")}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "测试空间" })
  });
  if (initialized.status !== 200) {
    throw new Error(`测试空间初始化失败：${initialized.status}`);
  }

  const createdScheme = await fetch(`${baseUrl}${apiPath("/schemes/scheme")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemePath: ["编号方案"] })
  });
  const created = await createdScheme.json();
  schemeId = created.schemeId;

  const savedModel = await fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schemeId,
      record: {
        name: "编号模型",
        project: { version: 1, name: "编号模型", nodes: [], edges: [] }
      }
    })
  });
  if (savedModel.status !== 200) {
    throw new Error(`测试模型保存失败：${savedModel.status}`);
  }
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(dataDir, { recursive: true, force: true });
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

async function fetchJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  return { response, payload: await response.json() };
}

describe("v1 schemeId selectors", () => {
  test("scheme list and hierarchy expose each node's schemeId", async () => {
    const list = await fetchJson(apiPath("/v1/schemes"));
    const hierarchy = await fetchJson(apiPath("/v1/schemes?view=hierarchy"));

    expect(list.response.status).toBe(200);
    expect(list.payload.data.schemes[0].schemeId).toBe(schemeId);
    expect(hierarchy.response.status).toBe(200);
    expect(hierarchy.payload.data.nodes[0].schemeId).toBe(schemeId);
  });

  test("model list and JSON accept schemeId instead of schemePath", async () => {
    const models = await fetchJson(`${apiPath("/v1/schemes")}?view=models&schemeId=${schemeId}`);
    const project = await fetchJson(`${apiPath("/v1/schemes/model/export")}?format=json&schemeId=${schemeId}&name=${encodeURIComponent("编号模型")}`);

    expect(models.response.status).toBe(200);
    expect(models.payload.data.schemeId).toBe(schemeId);
    expect(models.payload.data.models.map((model) => model.name)).toContain("编号模型");
    expect(project.response.status).toBe(200);
    expect(project.payload.data.project.name).toBe("编号模型");
  });
});
