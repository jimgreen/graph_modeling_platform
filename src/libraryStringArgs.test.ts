// 一批「首参标注 : string」的共享原语，对非字符串必须收口而不是抛。
//
// 依据是实测：元件库边界 normalizeDeviceLibraryPersistencePayload 会把某些字段归一成
// undefined（探针：customGraphTemplates 里 name 写成数字，边界回 undefined），随后这些
// 原语直接 .trim() 抛错——一个字段类型不对被放大成「元件库整个渲染不出来」。
//
// 与 normalizeComponentLibraryName 同一判据：非字符串归空串，**不**写 String(x)，
// 那会把 {a:1} 变成字面量 [object Object] 直接进界面标签。
import { describe, expect, test } from "vitest";
import {
  filterSelectionTreeLabel,
  normalizeGraphTemplateTypeName,
  uniqueGraphTemplateName
} from "./appExtracted/appPersistenceLibraryExport";

// 同批扫描里发现的 normalizeLibrarySearchText **不在此列**：它有 22 个调用点且在搜索
// 热路径上，兜底等于每次取值多一个分支，项目已明确决定不兜（savedNameKeyAndRouteBounds.test.ts
// 有守卫钉住并写了理由）。首版连它一起改了，全量跑红后撤回——尊重既有决定，不重复表态。

const NON_STRINGS: [string, unknown][] = [
  ["数字", 42],
  ["null", null],
  ["undefined", undefined],
  ["对象", { a: 1 }],
  ["数组", ["x"]]
];

describe("filterSelectionTreeLabel", () => {
  for (const [label, value] of NON_STRINGS) {
    test(`两个实参都是 ${label} 时不抛`, () => {
      expect(() => filterSelectionTreeLabel(value as never, value as never), label).not.toThrow();
    });
  }

  test("一边缺席时回退到另一边", () => {
    expect(filterSelectionTreeLabel("", "交流设备")).toBe("交流设备");
    expect(filterSelectionTreeLabel("母线", "")).toBe("母线");
  });
});

describe("normalizeGraphTemplateTypeName", () => {
  for (const [label, value] of NON_STRINGS) {
    test(`${label} → 空串`, () => {
      expect(normalizeGraphTemplateTypeName(value as never), label).toBe("");
    });
  }

  test("正常字符串照旧只去首尾空白", () => {
    expect(normalizeGraphTemplateTypeName("  线路  ")).toBe("线路");
  });
});

describe("uniqueGraphTemplateName", () => {
  for (const [label, value] of NON_STRINGS) {
    test(`baseName / typeName / 既有模板的 name 与 typeName 都是 ${label} 时不抛`, () => {
      const templates = [{ id: "t1", name: value, typeName: value, shapes: [] }];
      expect(() => uniqueGraphTemplateName(value as never, value as never, templates as never), label).not.toThrow();
    });
  }

  test("baseName 缺席时仍回落「自定义模板」", () => {
    expect(uniqueGraphTemplateName(undefined as never, "线路" as never, [])).toBe("自定义模板");
  });

  test("重名时照旧加序号", () => {
    const templates = [{ id: "t1", name: "线路", typeName: "line", shapes: [] }];
    // 序号分隔符是 `-`（探针实测；不是 ` (2)`）
    expect(uniqueGraphTemplateName("线路", "line", templates as never)).toBe("线路-2");
  });
});