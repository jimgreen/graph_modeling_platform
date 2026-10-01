// 模型保存时读不到既有模型文件，必须报错，不能悄悄给模型换一个 idx。
//
// allocateStableProjectIndex 的第一步是 existingStoredProjectIndex：读出模型已有的 idx
// 并原样带回，让模型在改名/重存后 model_id 不变（跨方案、跨文件名的稳定身份）。
// 该函数此前把「读盘」与「JSON 解析」裹在一个 try 里，任何失败都当「这个模型还没有 idx」。
// 于是磁盘读不动（权限丢失 / 文件被占用 / IO 错误）时，保存照常返回 200，只是 idx 变成
// 了新分配的那个 —— 旧 idx 上挂着的全局线路引用（projectIdx）全部对不上，导出的
// model_id 也跟着变。全程无报错、无日志，是静默的数据损坏。
//
// 与 projectJsonFileForName / readSchemeProjectFile 同一口径：只有 ENOENT 继续，
// JSON 非法（真读不出 idx）沿用既有语义「一次性重新分配」。
//
// 断言一律落在**磁盘上的模型文件**（落盘的是 storageProject，见 saveSchemeProjectRecord
// 末段 writeTextIfChanged），不依赖响应体的字段形状。
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { apiPath } from "./config.mjs";

const SCHEME = "索引方案";

let failReadFor = "";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (path, ...rest) => {
      if (failReadFor && String(path) === failReadFor) {
        const error = new Error(`EACCES: permission denied, open '${path}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readFile(path, ...rest);
    }
  };
});

let server;
let baseUrl;
let dataDir;
let schemeDir;

const modelJson = (name) => JSON.stringify({
  version: 1, name, idx: 0, modelType: "厂站", canvasWidth: 800, canvasHeight: 600, nodes: [], edges: []
});

const seedModel = (name, idx) => {
  writeFileSync(join(schemeDir, `${name}.json`), JSON.stringify({ ...JSON.parse(modelJson(name)), idx }), "utf-8");
};

const storedIdx = (name) => JSON.parse(readFileSync(join(schemeDir, `${name}.json`), "utf-8")).idx;

const renameModel = (previousName, name) =>
  fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schemePath: [SCHEME],
      record: { name, project: JSON.parse(modelJson(name)) },
      previousName
    })
  });

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "model-index-read-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  schemeDir = join(dataDir, "schemes", "files", SCHEME);
  mkdirSync(schemeDir, { recursive: true });
});

afterAll(async () => {
  failReadFor = "";
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

// 每个用例自带种子模型：用例之间不共享改名状态（previousName 指向已被改掉的文件时，
// 定位根本走不到被注入的那一步，用例会假绿 —— 探针踩过）。
describe("模型 idx 的稳定身份", () => {
  test("★ 改名重存后 idx 原样保留（对照组：这条本来就该成立）", async () => {
    seedModel("控制模型", 7);
    const response = await renameModel("控制模型", "控制改名");
    expect(response.status).toBe(200);
    expect(storedIdx("控制改名")).toBe(7);
  });

  test("★ 既有模型文件读不动时保存失败，而不是给它换一个新 idx", async () => {
    seedModel("故障模型", 9);
    failReadFor = join(schemeDir, "故障模型.json");
    const response = await renameModel("故障模型", "故障改名");
    failReadFor = "";

    expect(response.status, "读不到既有模型却保存成功，等于静默换了模型身份").not.toBe(200);
    expect(await response.text()).toContain("读取失败");
    // 磁盘上原模型的 idx 没被动过
    expect(storedIdx("故障模型")).toBe(9);
  });

  test("★ 恢复后同一请求照常 200 且 idx 仍是原值", async () => {
    const response = await renameModel("故障模型", "故障改名");
    expect(response.status).toBe(200);
    expect(storedIdx("故障改名")).toBe(9);
  });

  test("新建模型（无既有文件）仍照常分配新 idx（回归：别把正常路径也拦下）", async () => {
    const response = await renameModel("", "全新模型");
    expect(response.status).toBe(200);
    expect(storedIdx("全新模型")).toBeGreaterThan(0);
  });
});