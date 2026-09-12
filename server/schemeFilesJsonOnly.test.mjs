// files 不变量：保存后目录内只留 .json；同名旧 .e/.svg 被归档进 trash；
// 旧客户端仍带 svg/eFile 入参时被忽略且正常 200。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";

installDomShim();

let dataDir;
let server;
let baseUrl;

const schemeDir = () => join(dataDir, "schemes", "files", "测试方案");

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "json-only-"));
  mkdirSync(schemeDir(), { recursive: true });
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.GRAPH_MODEL_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

const project = {
  version: 1,
  name: "厂站",
  canvasWidth: 800,
  canvasHeight: 400,
  layers: [{ id: "default", name: "默认图层", visible: true }],
  activeLayerId: "default",
  nodes: [],
  edges: []
};

async function saveModel(body) {
  return fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemePath: ["测试方案"], name: "厂站", project: { ...project }, ...body })
  });
}

// 递归收集 trash 下每个归档目录内的文件，返回相对该归档目录的路径
// （archiveSchemeStoreEntry 保留相对 filesRoot 的路径结构 → 测试方案/厂站.e）
function collectArchived(root) {
  const found = [];
  const walk = (dir, prefix) => {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix ? join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else found.push(rel);
    }
  };
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(join(root, entry.name), "");
  }
  return found;
}

test("保存后目录内只留 .json", async () => {
  const response = await saveModel({});
  expect(response.status).toBe(200);
  const names = readdirSync(schemeDir()).sort();
  expect(names).toEqual(["厂站.json"]);
});

test("保存时同名旧 .e/.svg 被归档进 trash", async () => {
  // 预置派生物（模拟改造前的存量）
  writeFileSync(join(schemeDir(), "厂站.e"), "stale", "utf-8");
  writeFileSync(join(schemeDir(), "厂站.svg"), "<svg/>", "utf-8");
  const response = await saveModel({});
  expect(response.status).toBe(200);
  expect(readdirSync(schemeDir()).sort()).toEqual(["厂站.json"]);

  // 归档保留相对路径结构：trash/<archiveId>/测试方案/厂站.e
  const archived = collectArchived(join(dataDir, "schemes", "trash"));
  expect(archived).toContain(join("测试方案", "厂站.e"));
  expect(archived).toContain(join("测试方案", "厂站.svg"));
});

test("旧客户端带 svg/eFile 入参时被忽略且返回 200", async () => {
  const response = await saveModel({ svg: "<svg/>", eFile: "x" });
  expect(response.status).toBe(200);
  expect(readdirSync(schemeDir()).sort()).toEqual(["厂站.json"]);
});
