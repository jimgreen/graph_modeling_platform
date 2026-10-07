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
// 单文件读盘失败里「刚好被删掉」的那一类：readdir 已列出该文件，随后的 readFile 才报
// ENOENT。它必须与 EACCES 分开对待，否则每次保存都会对着自己刚删的文件刷告警。
let failReadWithEnoentFor = "";
// 记录 readFile 真实被调到的路径：用来证明注入点真的走到了（否则 ENOENT 那条断言可能
// 因为压根没调用而恒绿）。
const readAttempts = [];
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (path, ...rest) => {
      // 先记账再决定放不放行：注入分支自身也必须留下「这里确实被调用过」的证据，
      // 否则下面那条 ENOENT 不告警的断言可能只是因为探针压根没走到。
      readAttempts.push(String(path));
      if (failReadFor && String(path) === failReadFor) {
        const error = new Error(`EACCES: permission denied, open '${path}'`);
        error.code = "EACCES";
        throw error;
      }
      if (failReadWithEnoentFor && String(path) === failReadWithEnoentFor) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        error.code = "ENOENT";
        throw error;
      }
      return actual.readFile(path, ...rest);
    }
  };
});

const captureWarnings = async (run) => {
  const original = console.warn;
  const collected = [];
  console.warn = (...args) => {
    collected.push(args.map(String).join(" "));
  };
  try {
    await run();
  } finally {
    console.warn = original;
  }
  return collected;
};

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
  failReadWithEnoentFor = "";
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

// maxStoredProjectIndex 遍历全量模型文件求最大 idx。单个文件读盘失败时它**继续忽略**
// （既有降级：读不到的最大值当它不存在，idx 分配仍可用其余文件推进），但静默与「确实
// 没有这个 idx」同形 —— 计数器一旦也偏低就会分配出重复 idx，而日志里一个字都没有。
// 与同函数 readdir 失败处（及 readPersistedModelIndex）保持同一纪律：按 error.code 区分，
// 非 ENOENT 留一句。
describe("全量扫盘时单个模型文件读盘失败", () => {
  const blocked = () => join(schemeDir, "被占用的模型.json");

  test("★ 非 ENOENT（EACCES）时告警，并说明该模型的 idx 本次不算", async () => {
    seedModel("被占用的模型", 12);
    failReadFor = blocked();
    readAttempts.length = 0;
    let status;
    const warnings = await captureWarnings(async () => {
      const response = await renameModel("", "扫盘保存甲");
      status = response.status;
    });
    failReadFor = "";

    expect(status, "扫盘读盘失败不该改变保存接口的响应码").toBe(200);
    expect(readAttempts, "注入点没被走到，下面的告警断言会假绿").toContain(blocked());

    const hit = warnings.filter((line) => line.includes("[模型序号]") && line.includes("读取模型文件失败"));
    expect(hit.length, "单个模型文件读不动没有留痕").toBeGreaterThan(0);
    expect(hit.some((line) => line.includes("EACCES"))).toBe(true);
    expect(hit.some((line) => line.includes(blocked()))).toBe(true);
  });

  test("★ ENOENT（文件刚被删）不告警（否则每次保存都对着刚删的文件刷屏）", async () => {
    seedModel("刚被删的模型", 13);
    failReadWithEnoentFor = join(schemeDir, "刚被删的模型.json");
    readAttempts.length = 0;
    let status;
    const warnings = await captureWarnings(async () => {
      const response = await renameModel("", "扫盘保存乙");
      status = response.status;
    });
    failReadWithEnoentFor = "";

    expect(status).toBe(200);
    expect(readAttempts, "ENOENT 注入点没被走到，本用例什么都没证明").toContain(join(schemeDir, "刚被删的模型.json"));
    expect(warnings.filter((line) => line.includes("读取模型文件失败")), "ENOENT 属于正常路径，不该刷屏").toEqual([]);
  });

  test("一切正常时不产生读取模型文件失败的告警", async () => {
    const warnings = await captureWarnings(async () => {
      const response = await renameModel("", "扫盘保存丙");
      expect(response.status).toBe(200);
    });
    expect(warnings.filter((line) => line.includes("读取模型文件失败"))).toEqual([]);
  });
});