// 图元 Symbol 导出方案：归一化契约 + 空间路径读写 + 建目录守卫注入。
import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spacePathsFor } from "./spaceStore.mjs";
import {
  MAX_SYMBOL_EXPORT_SCHEMES,
  SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION,
  normalizeSymbolExportSchemes,
  readSymbolExportSchemes,
  writeSymbolExportSchemes
} from "./symbolExportSchemes.mjs";

let dataDir;
beforeAll(() => { dataDir = mkdtempSync(join(tmpdir(), "symbol-schemes-")); });
afterAll(() => { rmSync(dataDir, { recursive: true, force: true }); });

describe("normalizeSymbolExportSchemes", () => {
  test("丢弃无名方案，按 id 与名称双重去重（同名后者胜）", () => {
    const normalized = normalizeSymbolExportSchemes({
      schemes: [
        { id: "a", name: "开关", templateKinds: ["ac-breaker"] },
        { id: "b", name: "   " },
        { id: "c", name: "开关", templateKinds: ["ac-switch", "ac-switch"] },
        { name: "母线" }
      ]
    });

    expect(normalized.schemaVersion).toBe(SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION);
    expect(normalized.schemes.map((scheme) => scheme.name)).toEqual(["开关", "母线"]);
    // 同名覆盖后保留的是后一条
    expect(normalized.schemes[0]).toMatchObject({ id: "c", templateKinds: ["ac-switch"] });
    // 缺 id 时按名称派生，保证前端「按 id 加载」总有键可用
    expect(normalized.schemes[1].id).toBe("scheme-母线");
  });

  test("过滤键只保留合法形态并去重，未知键静默丢弃", () => {
    const normalized = normalizeSymbolExportSchemes({
      schemes: [{
        id: "s",
        name: "全量",
        filterKeys: ["vertical", "Vertical", "static", "Bad Key", "", "3d", "adaptable"]
      }]
    });

    expect(normalized.schemes[0].filterKeys).toEqual(["vertical", "static", "adaptable"]);
  });

  test("非对象载荷与超长列表按上限截断", () => {
    expect(normalizeSymbolExportSchemes(null).schemes).toEqual([]);
    expect(normalizeSymbolExportSchemes([]).schemes).toEqual([]);
    const many = { schemes: Array.from({ length: MAX_SYMBOL_EXPORT_SCHEMES + 20 }, (_, index) => ({
      id: `s-${index}`,
      name: `方案${index}`,
      templateKinds: []
    })) };
    expect(normalizeSymbolExportSchemes(many).schemes).toHaveLength(MAX_SYMBOL_EXPORT_SCHEMES);
  });

  test("兼容历史字段名 symbolExportSchemes", () => {
    const normalized = normalizeSymbolExportSchemes({
      symbolExportSchemes: [{ id: "legacy", name: "旧字段", templateKinds: ["ac-bus"] }]
    });
    expect(normalized.schemes.map((scheme) => scheme.id)).toEqual(["legacy"]);
  });
});

describe("读写空间路径", () => {
  test("文件缺失时返回空方案集且不建目录", async () => {
    const paths = spacePathsFor(dataDir, "缺席");
    const result = await readSymbolExportSchemes({ paths });

    expect(result.exists).toBe(false);
    expect(result.schemes).toEqual([]);
    expect(existsSync(paths.settings)).toBe(false);
  });

  test("写入后回读，只落在注入的 paths 上", async () => {
    const paths = spacePathsFor(dataDir, "甲空间");
    const written = await writeSymbolExportSchemes({
      schemes: [{ id: "s1", name: "开关族", templateKinds: ["ac-breaker", "ac-breaker-vertical"], filterKeys: ["stateful"] }]
    }, { paths });

    expect(written.schemes).toHaveLength(1);
    expect(existsSync(paths.symbolExportSchemes)).toBe(true);
    const reread = await readSymbolExportSchemes({ paths });
    expect(reread.exists).toBe(true);
    expect(reread.schemes[0]).toMatchObject({ id: "s1", templateKinds: ["ac-breaker", "ac-breaker-vertical"] });
    // 落盘为可读 JSON（非压缩/非二进制），便于人工排查
    expect(JSON.parse(readFileSync(paths.symbolExportSchemes, "utf-8")).schemes).toHaveLength(1);
    expect(existsSync(spacePathsFor(dataDir, "乙空间").symbolExportSchemes)).toBe(false);
  });

  test("建目录走注入的 ensureDirectory（供退休空间守卫复用）", async () => {
    const paths = spacePathsFor(dataDir, "守卫");
    const calls = [];
    await writeSymbolExportSchemes({ schemes: [] }, {
      paths,
      ensureDirectory: async (target) => { calls.push(target); }
    });

    expect(calls).toEqual([paths.settings]);
  });

  test("缺 paths 显式抛错，不静默落回默认空间", async () => {
    await expect(readSymbolExportSchemes({})).rejects.toThrow(/paths/u);
    await expect(writeSymbolExportSchemes({ schemes: [] }, {})).rejects.toThrow(/paths/u);
  });

  test("写侧校验：非对象载荷与缺 schemes 是 400 级错误", async () => {
    const paths = spacePathsFor(dataDir, "校验");
    await expect(writeSymbolExportSchemes(null, { paths })).rejects.toMatchObject({ statusCode: 400 });
    await expect(writeSymbolExportSchemes({}, { paths })).rejects.toMatchObject({ statusCode: 400 });
  });
});
