// idx 分配的两处静默归零要留痕（readPersistedModelIndex / maxStoredProjectIndex）。
//
// 归 0 都是**既有降级**：计数器与扫盘互为兜底，真值在两者之一。但此前一个 catch 到底，
// 「磁盘读不动 / 内容坏了」与「确实没有 idx」完全同形：
//   · 计数器读不到 → 每次保存都被重置成 0，idx 分配退化成「全靠扫盘」，无日志；
//   · 目录扫不到 → 该子树的模型 idx 不可见，计数器一旦也偏低就会分配出**重复 idx**，
//     而重复 idx 会让全局线路引用与导出的 model_id 全线对不上。
//
// 刻意不告警的一处：maxStoredProjectIndex 里「损坏的历史模型文件」——它每次保存都会走到，
// 告警等于每存一次模型刷一串。该分支保持原有的静默忽略。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { apiPath } from "./config.mjs";

const SCHEME = "序号方案";
// 计数器路径是 filesRoot 的上一级：<schemes>/model-index.json
let counterPath = "";
// 扫不动的方案目录
let unscannableDir = "";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: async (path, ...rest) => {
      if (counterPath && String(path) === counterPath) {
        const error = new Error(`EACCES: permission denied, open '${path}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readFile(path, ...rest);
    },
    readdir: async (dir, options) => {
      if (unscannableDir && String(dir).endsWith(unscannableDir)) {
        const error = new Error(`EACCES: permission denied, scandir '${dir}'`);
        error.code = "EACCES";
        throw error;
      }
      return actual.readdir(dir, options);
    }
  };
});

let server;
let baseUrl;
let dataDir;

const warnings = [];
let originalWarn;

const saveModel = (name) =>
  fetch(`${baseUrl}${apiPath("/schemes/project")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      schemePath: [SCHEME],
      record: { name, project: { version: 1, name, idx: 0, modelType: "厂站", nodes: [], edges: [] } }
    })
  });

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "model-index-warn-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, defaultPaths } = await import("./server.mjs");
  counterPath = join(dataDir, "schemes", "model-index.json");
  unscannableDir = "扫不动的方案";

  const okDir = join(defaultPaths.schemeFiles, SCHEME);
  mkdirSync(okDir, { recursive: true });
  mkdirSync(join(defaultPaths.schemeFiles, unscannableDir), { recursive: true });
  writeFileSync(
    join(okDir, "已有模型.json"),
    JSON.stringify({ version: 1, name: "已有模型", idx: 5, modelType: "厂站", nodes: [], edges: [] }),
    "utf-8"
  );

  originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };

  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  console.warn = originalWarn;
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dataDir, { recursive: true, force: true });
});

describe("idx 分配链上的静默归零", () => {
  test("★ 计数器读不到时告警，并说明改由全量扫盘决定", async () => {
    warnings.length = 0;
    const response = await saveModel("新模型甲");
    expect(response.status).toBe(200);

    const hit = warnings.filter((line) => line.includes("[模型序号]") && line.includes("读取计数器失败"));
    expect(hit.length, "计数器读不到没有留痕").toBeGreaterThan(0);
    expect(hit[0]).toContain("EACCES");
    expect(hit[0]).toContain("全量扫盘");
  });

  test("★ 目录扫不到时告警，并说明该目录的 idx 本次不算", async () => {
    warnings.length = 0;
    const response = await saveModel("新模型乙");
    expect(response.status).toBe(200);

    const hit = warnings.filter((line) => line.includes("[模型序号]") && line.includes("扫描目录失败"));
    expect(hit.length, "目录扫不到没有留痕").toBeGreaterThan(0);
    expect(hit.some((line) => line.includes(unscannableDir))).toBe(true);
  });

  test("一切正常时不产生 [模型序号] 告警", async () => {
    counterPath = "";
    unscannableDir = "";
    warnings.length = 0;
    const response = await saveModel("新模型丙");
    expect(response.status).toBe(200);
    expect(warnings.filter((line) => line.includes("[模型序号]"))).toEqual([]);
  });
});