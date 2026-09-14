// settings / device-library 域读指定空间根。
import { expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDomShim } from "./domShim.mjs";
import { spacePathsFor } from "./spaceStore.mjs";

installDomShim();

let dataDir;
// 用 beforeAll 而非 beforeEach：server.mjs 在每个测试文件内只加载一次，
// 其 dataRoot 在首次 import 时求值并缓存。若每个用例换 dataDir，
// 第二个用例起 defaultPaths 会指向被 afterEach 删掉的旧目录 —— 测试会
// 「碰巧通过」而非「因为对而通过」。
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "space-config-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

test("readColorConfig 按 paths 读指定根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readColorConfig } = await import("./server.mjs");
  // 用生产同款构造器拿全 13 个字段。手写 {...defaultPaths, 需要的几个} 只覆盖当前
  // 用例用到的字段，其余会静默指向 default 空间根 —— 后续任务照抄模板就会写错空间。
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.settings, { recursive: true });
  writeFileSync(paths.colorConfig,
    JSON.stringify({ colorDisplayMode: "voltage", colorPalette: { voltage: { a: "#111111" } } }), "utf-8");

  expect((await readColorConfig({ paths })).colorDisplayMode).toBe("voltage");
  expect((await readColorConfig()).exists).toBe(false);   // 默认根下没有
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("readDeviceLibraryConfig 按 paths 读指定根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readDeviceLibraryConfig } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.deviceLibraryDir, { recursive: true });
  writeFileSync(paths.deviceLibrary,
    JSON.stringify({ schemaVersion: 1, customDeviceTemplates: [{ kind: "VPP母线" }] }), "utf-8");

  const spaceLib = await readDeviceLibraryConfig({ paths });
  expect(spaceLib.exists).toBe(true);
  expect(JSON.stringify(spaceLib)).toContain("VPP母线");
  // 落盘的是 schemaVersion 1（当前为 4），读取会触发规范化回写。回写若仍走模块级常量，
  // 就会在默认根造出 device-library/library.json，下面这行随之变红 —— 即回写必须同根。
  expect((await readDeviceLibraryConfig()).exists).toBe(false);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});

test("readMeasurementConfig 按 paths 读指定根", async () => {
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { readMeasurementConfig } = await import("./server.mjs");
  const paths = spacePathsFor(dataDir, "张三");
  mkdirSync(paths.settings, { recursive: true });
  // 用「空间探针」标记：忽略参数时会读到默认根（该文件不存在），下面断言必红。
  writeFileSync(paths.measurementConfig,
    JSON.stringify({ measurementTypes: [{ id: "spaceProbe", key: "spaceProbe", name: "空间探针" }] }), "utf-8");

  const config = await readMeasurementConfig({ paths });
  expect(config).toHaveProperty("groupDefaults");
  expect(JSON.stringify(config)).toContain("空间探针");
  expect((await readMeasurementConfig()).exists).toBe(false);
  delete process.env.GRAPH_MODEL_DATA_DIR;
});
