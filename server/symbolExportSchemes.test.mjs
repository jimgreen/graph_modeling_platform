// 图元 Symbol 导出方案：归一化契约 + 空间路径读写 + 建目录守卫注入。
import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spacePathsFor } from "./spaceStore.mjs";
import {
  MAX_SYMBOL_EXPORT_SCHEMES,
  MAX_SYMBOL_EXPORT_SCHEME_KINDS,
  MAX_SYMBOL_EXPORT_SCHEME_NAME_LENGTH,
  SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION,
  SymbolExportSchemeValidationError,
  normalizeSymbolExportSchemes,
  readSymbolExportSchemes,
  validateSymbolExportSchemesPayload,
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

  test("★ 名称按 60 字截断（上限常量与实现同源，改一处必转红）", () => {
    expect(MAX_SYMBOL_EXPORT_SCHEME_NAME_LENGTH).toBe(60);
    const longName = "名".repeat(80);
    const normalized = normalizeSymbolExportSchemes({ schemes: [{ name: longName }] });
    expect(normalized.schemes[0].name).toBe("名".repeat(60));
    // 恰好 60 不截断
    const exact = "名".repeat(60);
    expect(normalizeSymbolExportSchemes({ schemes: [{ name: exact }] }).schemes[0].name).toBe(exact);
  });

  test("★ templateKinds 按 5000 上限截断，并去空白 / 去重（保序）", () => {
    expect(MAX_SYMBOL_EXPORT_SCHEME_KINDS).toBe(5000);
    const kinds = [];
    for (let index = 0; index < MAX_SYMBOL_EXPORT_SCHEME_KINDS + 10; index += 1) {
      kinds.push(`kind-${index}`);
    }
    const normalized = normalizeSymbolExportSchemes({ schemes: [{ name: "上限", templateKinds: kinds }] });
    expect(normalized.schemes[0].templateKinds).toHaveLength(MAX_SYMBOL_EXPORT_SCHEME_KINDS);
    expect(normalized.schemes[0].templateKinds[0]).toBe("kind-0");
    expect(normalized.schemes[0].templateKinds.at(-1)).toBe(`kind-${MAX_SYMBOL_EXPORT_SCHEME_KINDS - 1}`);
    // 去空白 / 去重：重复项只留第一处，且计数不占额度
    const deduped = normalizeSymbolExportSchemes({
      schemes: [{ name: "去重", templateKinds: ["a", " a ", "a", "  ", "b", 1, null, {}] }]
    });
    expect(deduped.schemes[0].templateKinds).toEqual(["a", "b"]);
    // 非数组的 templateKinds 视作没给
    expect(normalizeSymbolExportSchemes({ schemes: [{ name: "非数组", templateKinds: "a" }] }).schemes[0].templateKinds)
      .toEqual([]);
  });

  test("★ id 派生：slug 化（中文保留、其余非字母数字折成连字符、首尾连字符去掉）", () => {
    const ids = (names) => normalizeSymbolExportSchemes({ schemes: names.map((name) => ({ name })) })
      .schemes.map((scheme) => scheme.id);
    expect(ids(["Hello World!"])).toEqual(["scheme-hello-world"]);
    expect(ids(["A/B"])).toEqual(["scheme-a-b"]);
    // 名称先 trim 再派生
    expect(ids(["  开关  "])).toEqual(["scheme-开关"]);
    // 全是非字母数字 → slug 为空 → 回落 scheme-unnamed（不是空 id）
    expect(ids(["!!!"])).toEqual(["scheme-unnamed"]);
    // 显式 id 优先于派生，且同样 trim
    expect(normalizeSymbolExportSchemes({ schemes: [{ id: "  fixed  ", name: "母线" }] }).schemes[0].id).toBe("fixed");
    // 已证明 `if (!id) return null` 这道守卫**不可达**，不构成覆盖：id 要么是显式值，
    // 要么是 schemeIdFromName 的返回值，而后者恒为非空的 `scheme-…`（把判据换成
    // 永不成立的条件，用例仍全绿）。留着它是因为源文件如此，此处只做记录。
  });

  test("★ updatedAt：给了就 trim 后保留，没给填当前 ISO 串", () => {
    const withStamp = normalizeSymbolExportSchemes({ schemes: [{ name: "有时间", updatedAt: "  2026-01-02T03:04:05.000Z  " }] });
    expect(withStamp.schemes[0].updatedAt).toBe("2026-01-02T03:04:05.000Z");
    const without = normalizeSymbolExportSchemes({ schemes: [{ name: "无时间" }] });
    expect(without.schemes[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    expect(Number.isNaN(Date.parse(without.schemes[0].updatedAt))).toBe(false);
    // 非字符串的 updatedAt 视作没给
    expect(normalizeSymbolExportSchemes({ schemes: [{ name: "脏时间", updatedAt: 123 }] }).schemes[0].updatedAt)
      .not.toBe(123);
  });

  test("非对象的条目整条丢弃（不抛错，保证历史文件可读）", () => {
    const normalized = normalizeSymbolExportSchemes({
      schemes: ["字符串", 42, null, ["数组"], { name: "留我" }]
    });
    expect(normalized.schemes.map((scheme) => scheme.name)).toEqual(["留我"]);
    // ★ 数组即使带着 name 也必须丢弃 —— 去掉 Array.isArray 拦截后它会被当成合法方案收下
    const namedArray = Object.assign([], { name: "数组带名" });
    expect(normalizeSymbolExportSchemes({ schemes: [namedArray] }).schemes).toEqual([]);
  });

  test("过滤键：上限 32 字符、非字母开头丢弃、大写化后去重", () => {
    // 33 个字符超出 `^[a-z][a-z0-9-]{0,31}$` 的长度上限
    const longKey = `k${"a".repeat(32)}`;
    const normalized = normalizeSymbolExportSchemes({
      schemes: [{ name: "键", filterKeys: [longKey, "ok-1", "0abc", "-abc", "A-B", "a-b"] }]
    });
    expect(normalized.schemes[0].filterKeys).toEqual(["ok-1", "a-b"]);
    // ★ 纯大写的键靠 toLowerCase 才进得了正则（去掉它就会整条被丢）
    expect(normalizeSymbolExportSchemes({ schemes: [{ name: "大写", filterKeys: ["STATIC"] }] }).schemes[0].filterKeys)
      .toEqual(["static"]);
  });
});

describe("validateSymbolExportSchemesPayload：写侧显式超限即报错", () => {
  test("非对象载荷（null / 字符串 / 数组 / 数字）抛 400 级错误", () => {
    for (const payload of [null, "文本", [], 42]) {
      let caught = null;
      try {
        validateSymbolExportSchemesPayload(payload);
      } catch (error) {
        caught = error;
      }
      expect(caught, JSON.stringify(payload)).toBeInstanceOf(SymbolExportSchemeValidationError);
      expect(caught.name, JSON.stringify(payload)).toBe("SymbolExportSchemeValidationError");
      expect(caught.statusCode, JSON.stringify(payload)).toBe(400);
      expect(caught.message, JSON.stringify(payload)).toBe("方案载荷必须是对象。");
    }
  });

  test("缺 schemes 数组（含 schemes 非数组）抛错，消息与前者不同", () => {
    for (const payload of [{}, { schemes: null }, { schemes: {} }, { schemes: "x" }]) {
      expect(() => validateSymbolExportSchemesPayload(payload), JSON.stringify(payload))
        .toThrow("方案载荷缺少 schemes 数组。");
    }
    // 只有历史字段名 symbolExportSchemes 也算缺 —— 写侧不接受旧字段
    expect(() => validateSymbolExportSchemesPayload({ symbolExportSchemes: [{ name: "旧字段" }] }))
      .toThrow("方案载荷缺少 schemes 数组。");
  });

  test("★ 数量上限判据是「严格大于」：恰好 200 条放行、201 条报错", () => {
    const build = (count) => ({
      schemes: Array.from({ length: count }, (_, index) => ({ id: `s-${index}`, name: `方案${index}` }))
    });
    expect(validateSymbolExportSchemesPayload(build(MAX_SYMBOL_EXPORT_SCHEMES)).schemes)
      .toHaveLength(MAX_SYMBOL_EXPORT_SCHEMES);
    expect(() => validateSymbolExportSchemesPayload(build(MAX_SYMBOL_EXPORT_SCHEMES + 1)))
      .toThrow(`方案数量超出上限（${MAX_SYMBOL_EXPORT_SCHEMES}）。`);
    // 报错也带 400
    let caught = null;
    try {
      validateSymbolExportSchemesPayload(build(MAX_SYMBOL_EXPORT_SCHEMES + 1));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(SymbolExportSchemeValidationError);
    expect(caught.statusCode).toBe(400);
  });

  test("返回的是**归一化后的结果**（同名覆盖等读侧规则在写侧同样生效）", () => {
    const payload = {
      schemes: [
        { id: "a", name: "开关" },
        { id: "b", name: "开关" }
      ]
    };
    const validated = validateSymbolExportSchemesPayload(payload);
    expect(validated.schemaVersion).toBe(SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION);
    // 同名后者胜 —— 写侧返回的已是覆盖后的单条，不是入参引用
    expect(validated.schemes).toHaveLength(1);
    expect(validated.schemes[0].id).toBe("b");
    expect(validated).not.toBe(payload);
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
