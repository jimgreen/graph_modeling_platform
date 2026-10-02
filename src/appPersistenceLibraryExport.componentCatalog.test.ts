// 组件目录树是「只读描述」，导入时只校验不入状态 —— 所以这个函数的职责是「挑刺」：
// 缺字段、类型不对、目录项不完整，一律抛同一个错，绝不返回半成品。
import { describe, expect, test } from "vitest";

import { normalizeComponentCatalog } from "./appExtracted/appPersistenceLibraryExport";

const classNode = (over: Record<string, any> = {}) => ({ className: "元件", ...over });
const library = (over: Record<string, any> = {}) => ({ name: "交流", classes: [classNode()], ...over });
const catalog = (over: Record<string, any> = {}) => ({
  energyFlows: [],
  categoryLibraries: [library()],
  ...over
});

describe("normalizeComponentCatalog", () => {
  test("合法目录原样返回", () => {
    const source = catalog();

    expect(normalizeComponentCatalog(source)).toBe(source);
  });

  test("非对象输入抛错", () => {
    expect(() => normalizeComponentCatalog(null)).toThrow();
    expect(() => normalizeComponentCatalog("字符串")).toThrow();
  });

  test("数组输入抛错", () => {
    expect(() => normalizeComponentCatalog([])).toThrow();
  });

  test("缺 energyFlows 抛错", () => {
    expect(() => normalizeComponentCatalog({ categoryLibraries: [library()] })).toThrow();
  });

  test("energyFlows 不是数组抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ energyFlows: {} }))).toThrow();
  });

  test("缺 categoryLibraries 抛错", () => {
    expect(() => normalizeComponentCatalog({ energyFlows: [] })).toThrow();
  });

  test("categoryLibraries 不是数组抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: {} }))).toThrow();
  });

  test("目录项不是对象抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: ["不是对象"] }))).toThrow();
  });

  test("目录项缺 name 抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ classes: [] }] }))).toThrow();
  });

  test("目录项 name 为空白串抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "   ", classes: [] }] }))).toThrow();
  });

  test("目录项缺 classes 抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流" }] }))).toThrow();
  });

  test("classes 不是数组抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: {} }] }))).toThrow();
  });

  test("class 节点缺 className 时抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [{}] }] }))).toThrow();
  });

  test("className 为空白串时抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [{ className: "  " }] }] }))).toThrow();
  });

  test("derivedClasses 缺省时按空数组处理（合法）", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [{ className: "元件" }] }] }))).not.toThrow();
  });

  test("derivedClasses 不是数组时抛错", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [{ className: "元件", derivedClasses: {} }] }] }))).toThrow();
  });

  test("derivedClasses 递归校验：内层不合法也抛错", () => {
    const nested = { className: "派生", derivedClasses: [{ className: "" }] };

    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [nested] }] }))).toThrow();
  });

  test("derivedClasses 合法时通过", () => {
    const nested = { className: "派生", derivedClasses: [{ className: "更深" }] };

    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [nested] }] }))).not.toThrow();
  });

  test("空的 classes 数组是合法的", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [{ name: "交流", classes: [] }] }))).not.toThrow();
  });

  test("空的 categoryLibraries 数组是合法的", () => {
    expect(() => normalizeComponentCatalog(catalog({ categoryLibraries: [] }))).not.toThrow();
  });

  test("任一目录项不合法即整体抛错（不做部分接受）", () => {
    const mixed = catalog({ categoryLibraries: [library(), { name: "" }] });

    expect(() => normalizeComponentCatalog(mixed)).toThrow();
  });

  test("错误信息在各分支一致（下游只按文案提示）", () => {
    const messages = [
      (() => {
        try {
          normalizeComponentCatalog(null);
          return null;
        } catch (e: any) {
          return e.message;
        }
      })(),
      (() => {
        try {
          normalizeComponentCatalog({ energyFlows: [] });
          return null;
        } catch (e: any) {
          return e.message;
        }
      })()
    ];

    expect(messages[0]).toBeTruthy();
    expect(messages[1]).toBe(messages[0]);
  });
});
