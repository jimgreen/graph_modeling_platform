// 方案域函数接受 options.paths，可指向任意数据根（空间）。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";

installDomShim();

let dataDir;
beforeEach(() => { dataDir = mkdtempSync(join(tmpdir(), "scheme-paths-")); });
afterEach(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("readSchemes 按 paths 读指定根的模型", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readSchemes, defaultPaths } = await import("./server.mjs");
  const spaceDir = join(dataDir, "workspaces", "张三");
  const filesDir = join(spaceDir, "schemes", "files", "测试方案");
  mkdirSync(filesDir, { recursive: true });
  writeFileSync(join(filesDir, "模型A.json"), JSON.stringify({
    version: 1, name: "模型A", canvasWidth: 800, canvasHeight: 400,
    layers: [{ id: "default", name: "默认图层", visible: true }],
    activeLayerId: "default", nodes: [], edges: []
  }), "utf-8");

  const paths = { ...defaultPaths, root: spaceDir, schemes: join(spaceDir, "schemes"), schemeFiles: join(spaceDir, "schemes", "files") };
  const spaceSchemes = await readSchemes({ paths, includeProjects: true });
  const flatSchemes = await readSchemes({ includeProjects: true });
  expect(JSON.stringify(spaceSchemes)).toContain("模型A");
  expect(JSON.stringify(flatSchemes)).not.toContain("模型A");
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

// 此处原有「默认根守卫不随 options.paths 漂移」用例（Task 4 修复轮加入）。
// 该守卫按计划在 Task 5 拆除，断言的守卫主体已不存在。
// 「不产出混根 ZIP」这一意图现由 schemeArchiveRealtime.test.mjs 的
// 「自定义 paths 下的方案 ZIP 成功生成，json 与派生格式同源」承担，
// 不在两处重复同一断言。
