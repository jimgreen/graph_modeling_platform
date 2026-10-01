// 元件类名归一：非字符串不得抛错。
//
// 元件库来自导入包与后端 payload，而 normalizeDeviceLibraryPersistencePayload 不收敛
// section 的类型——探针实测数字 / null / 对象 / 数组都原样穿过。随后渲染元件库树时
// normalizeComponentLibraryName 直接 .trim() 抛错，用户看到的是「导入一个包，元件库树
// 整个渲染不出来」，且看不出跟哪个字段有关。
//
// 守卫走完整条链：畸形 section 过元件库边界归一，再进显示名——只在最后一层断言，
// 免得测成「边界把它挡住了」，而边界按设计并不管这个字段的类型。
import { describe, expect, test } from "vitest";
import {
  normalizeComponentLibraryName,
  componentLibraryDisplayName,
  normalizeDeviceLibraryPersistencePayload,
  defaultCategoryLibraryForComponentLibrary
} from "./appExtracted/appPersistenceLibraryExport";

const NON_STRINGS: [string, unknown][] = [
  ["数字", 42],
  ["null", null],
  ["undefined", undefined],
  ["对象", { a: 1 }],
  ["数组", ["x"]],
  ["布尔", true]
];

describe("normalizeComponentLibraryName：非字符串归空串而不是抛错", () => {
  for (const [label, value] of NON_STRINGS) {
    test(label, () => {
      expect(normalizeComponentLibraryName(value as never), label).toBe("");
    });
  }

  test("正常字符串照旧只去首尾空白", () => {
    expect(normalizeComponentLibraryName("  Electrical  ")).toBe("Electrical");
  });
});

describe("畸形 section 走完整条链不炸", () => {
  for (const [label, section] of NON_STRINGS) {
    test(label, () => {
      const payload = normalizeDeviceLibraryPersistencePayload({
        customDeviceTemplates: [
          { kind: "ac-bus", label: "母线", section, params: {}, terminals: [] }
        ]
      } as never);
      const normalized = (payload.customDeviceTemplates[0] as { section?: unknown }).section;

      expect(() => componentLibraryDisplayName(normalized as string), label).not.toThrow();
      expect(typeof componentLibraryDisplayName(normalized as string)).toBe("string");
      expect(() => defaultCategoryLibraryForComponentLibrary(normalized as string), label).not.toThrow();
    });
  }
});

describe("正常 section 的显示名不被改变", () => {
  test("已知类名仍走标签表", () => {
    expect(componentLibraryDisplayName("Electrical")).toContain("Electrical");
  });

  test("未知类名按「自定义类」显示而不是空串", () => {
    expect(componentLibraryDisplayName("NoSuchSection")).toContain("自定义类");
  });

  test("Static 类仍映射到「静态图元」分类", () => {
    expect(defaultCategoryLibraryForComponentLibrary("Static")).toBe("静态图元");
  });
});