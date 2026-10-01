// 展示类降级要留痕：fileUpdatedAt / readLegacySchemeDirectoryMeta。
//
// 这两处退回默认值是**既有语义**（改它会动行为：文件确已不在、legacy scheme.json
// 早已迁移到目录名），但此前一个 catch 到底，「磁盘读不动 / 内容坏了」与「本来就不在」
// 完全同形：
//   · fileUpdatedAt → 方案树里整片模型显示成 1970-01-01，日志里一个字都没有；
//   · readLegacySchemeDirectoryMeta → 方案顶着目录名显示，与真实名字不符且无从察觉。
//
// 复用既有的 warnStoreReadFallback：非 ENOENT 留痕并说清「按什么显示」，ENOENT 不刷屏。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { apiPath } from "./config.mjs";

const BROKEN_SCHEME = "坏元数据方案";
const GOOD_SCHEME = "好方案";
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  // 归一分隔符再比对：Windows 上路径是 `坏元数据方案\scheme.json`，
  // 用 endsWith("坏元数据方案/scheme.json") 永远不匹配 —— 探针首版就栽在这里，
  // 表现为「注入没生效、方案仍顶着真实名字」，看起来像修复没起作用。
  const isBrokenMeta = (path) => String(path).replace(/\\/gu, "/").endsWith(`${BROKEN_SCHEME}/scheme.json`);
  return {
    ...actual,
    // 只对坏方案目录下的 scheme.json 让读盘失败；正常路径透传真实实现。
    readFile: async (path, ...rest) => {
      if (isBrokenMeta(path)) {
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

const warnings = [];
let originalWarn;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "display-fallback-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer, defaultPaths } = await import("./server.mjs");

  const seed = (scheme, metaText) => {
    const dir = join(defaultPaths.schemeFiles, scheme);
    mkdirSync(dir, { recursive: true });
    if (metaText !== null) {
      writeFileSync(join(dir, "scheme.json"), metaText, "utf-8");
    }
    writeFileSync(
      join(dir, "模型一.json"),
      JSON.stringify({ version: 1, name: "模型一", idx: 1, modelType: "厂站", nodes: [], edges: [] }),
      "utf-8"
    );
  };
  seed(GOOD_SCHEME, JSON.stringify({ name: "真实方案名", updatedAt: "2024-05-05T00:00:00.000Z" }));
  seed(BROKEN_SCHEME, JSON.stringify({ name: "读不到的名字" }));

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

describe("方案元数据读不到时留痕", () => {
  test("★ 非 ENOENT 读失败会告警，并说清是按目录名显示", async () => {
    warnings.length = 0;
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    expect(response.status).toBe(200);

    const hit = warnings.filter((line) => line.includes(BROKEN_SCHEME) && line.includes("按目录名显示方案"));
    expect(hit.length, "读不到 scheme.json 没有留痕").toBeGreaterThan(0);
  });

  test("★ 正常方案的 scheme.json 不产生告警", async () => {
    warnings.length = 0;
    await fetch(`${baseUrl}${apiPath("/schemes")}`);
    // 断言的是「好方案那条路径没被点名」，不是「零告警」——同一次请求也会读坏方案，
    // 那条本来就该告警（首版断言成零条，于是被自己注入的坏方案打红）。
    const forGoodScheme = warnings.filter((line) => line.includes("按目录名显示方案") && line.includes(GOOD_SCHEME));
    expect(forGoodScheme).toEqual([]);
    // 对照：坏方案那条确实点了名
    expect(warnings.some((line) => line.includes("按目录名显示方案") && line.includes(BROKEN_SCHEME))).toBe(true);
  });

  test("读不到的那一半照常出现在方案树里（降级是局部的）", async () => {
    const response = await fetch(`${baseUrl}${apiPath("/schemes")}`);
    const json = await response.json();
    const names = json.schemes.map((scheme) => scheme.name);
    expect(names).toContain("真实方案名");
    // 读不到元数据的方案按目录名显示，而不是消失
    expect(names).toContain(BROKEN_SCHEME);
  });
});