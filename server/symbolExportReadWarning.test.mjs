// 导出方案读失败要留痕（symbolExportSchemes.readSymbolExportSchemes）。
//
// 该函数**绕过了** readJsonStoreFile 自行读盘，于是丢了那里的告警：任何失败都归
// parsed = null，与「没配置过」完全同形，两者都回 exists:false —— 界面上都显示
// 「还没有导出方案」。
//
// 于是：文件读不到（权限丢失 / 文件被占用 / 内容坏掉）→ 用户看着一份空列表，
// 改点别的再保存 → PUT /symbol-export-schemes 把空配置写回去，磁盘上的原配置被
// **永久覆盖**。全程无报错、无日志。
//
// ENOENT 才是「没配置过」，静默即可，不刷屏。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

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

const { readSymbolExportSchemes, writeSymbolExportSchemes } = await import("./symbolExportSchemes.mjs");

const warnings = [];
let originalWarn;

const makePaths = (dataDir) => {
  const settingsDir = join(dataDir, "settings");
  mkdirSync(settingsDir, { recursive: true });
  return { symbolExportSchemes: join(settingsDir, "symbol-export-schemes.json"), settingsDir };
};

beforeAll(() => {
  originalWarn = console.warn;
  console.warn = (...args) => {
    warnings.push(args.map(String).join(" "));
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

describe("导出方案读取失败", () => {
  test("★ 非 ENOENT 读失败会告警，并点明「保存会覆盖原配置」", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "symbol-read-"));
    try {
      const paths = makePaths(dataDir);
      await writeSymbolExportSchemes({ schemes: [{ name: "方案甲" }] }, { paths, ensureDirectory: () => {} });

      warnings.length = 0;
      failReadFor = paths.symbolExportSchemes;
      const result = await readSymbolExportSchemes({ paths });
      failReadFor = "";

      const hit = warnings.filter((line) => line.includes("[存储]") && line.includes("读取导出方案失败"));
      expect(hit.length, "读失败没有留痕").toBeGreaterThan(0);
      expect(hit[0]).toContain("EACCES");
      expect(hit[0]).toContain("覆盖");
      // 降级本身不变：仍按「未配置」返回
      expect(result.exists).toBe(false);
    } finally {
      failReadFor = "";
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("★ 文件不存在（ENOENT）时不刷屏", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "symbol-read-enoent-"));
    try {
      const paths = makePaths(dataDir);
      warnings.length = 0;
      const result = await readSymbolExportSchemes({ paths });
      expect(result.exists).toBe(false);
      expect(warnings.filter((line) => line.includes("读取导出方案失败"))).toEqual([]);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("对照组：正常读不产生告警，配置原样回来", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "symbol-read-ok-"));
    try {
      const paths = makePaths(dataDir);
      await writeSymbolExportSchemes({ schemes: [{ name: "方案甲" }] }, { paths, ensureDirectory: () => {} });

      warnings.length = 0;
      const result = await readSymbolExportSchemes({ paths });
      expect(result.exists).toBe(true);
      expect(warnings.filter((line) => line.includes("读取导出方案失败"))).toEqual([]);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});