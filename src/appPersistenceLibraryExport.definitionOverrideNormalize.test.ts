// 元件定义覆盖值的归一：外部存的是 unknown，要收敛成「能安全写回模型」的形状。
// 统一口径：**非法一律返回 undefined（表示「没配」），而不是塞一个勉强能用的默认值** ——
// 塞默认值会让「用户没配过」和「用户配错了」在 UI 上长得一模一样。
import { describe, expect, test } from "vitest";

import {
  normalizeDefinitionOverrideSize,
  normalizeDefinitionOverrideTerminalAnchors,
  normalizeDefinitionOverrideTerminalType,
  normalizeDefinitionOverrideTerminalTypes,
  normalizeDefinitionResizePermission
} from "./appExtracted/appPersistenceLibraryExport";

describe("normalizeDefinitionResizePermission", () => {
  test("布尔原样返回", () => {
    expect(normalizeDefinitionResizePermission(true)).toBe(true);
    expect(normalizeDefinitionResizePermission(false)).toBe(false);
  });

  test("undefined / null / 空串 → undefined（视为没配）", () => {
    expect(normalizeDefinitionResizePermission(undefined)).toBeUndefined();
    expect(normalizeDefinitionResizePermission(null)).toBeUndefined();
    expect(normalizeDefinitionResizePermission("")).toBeUndefined();
  });

  test("常见真值写法都认", () => {
    for (const value of ["1", "true", "TRUE", "yes", "允许", "是"]) {
      expect(normalizeDefinitionResizePermission(value)).toBe(true);
    }
  });

  test("常见假值写法归为 false", () => {
    for (const value of ["0", "false", "no", "禁止", "否"]) {
      expect(normalizeDefinitionResizePermission(value)).toBe(false);
    }
  });

  test("无法识别的字符串归为 false（而不是 undefined）", () => {
    expect(normalizeDefinitionResizePermission("随便写的")).toBe(false);
  });

  test("数字 0 / 1 按字符串判定", () => {
    expect(normalizeDefinitionResizePermission(0)).toBe(false);
    expect(normalizeDefinitionResizePermission(1)).toBe(true);
  });

  test("前后空白被裁掉", () => {
    expect(normalizeDefinitionResizePermission("  true  ")).toBe(true);
  });

  test("纯空白串不是空串判定路径，按内容归一为 false", () => {
    expect(normalizeDefinitionResizePermission("   ")).toBe(false);
  });
});

describe("normalizeDefinitionOverrideSize", () => {
  test("合法尺寸取整返回", () => {
    expect(normalizeDefinitionOverrideSize({ width: 40.4, height: 30.6 })).toEqual({ width: 40, height: 31 });
  });

  test("字符串数字也能解析", () => {
    expect(normalizeDefinitionOverrideSize({ width: "40", height: "30" })).toEqual({ width: 40, height: 30 });
  });

  test("非对象 / 数组 / 空值 → undefined", () => {
    expect(normalizeDefinitionOverrideSize(null)).toBeUndefined();
    expect(normalizeDefinitionOverrideSize(undefined)).toBeUndefined();
    expect(normalizeDefinitionOverrideSize(0)).toBeUndefined();
    expect(normalizeDefinitionOverrideSize([])).toBeUndefined();
  });

  test("宽高缺一即视为无效", () => {
    expect(normalizeDefinitionOverrideSize({ width: 40 })).toBeUndefined();
    expect(normalizeDefinitionOverrideSize({ height: 30 })).toBeUndefined();
  });

  test("非数值 → undefined", () => {
    expect(normalizeDefinitionOverrideSize({ width: "宽", height: "高" })).toBeUndefined();
    expect(normalizeDefinitionOverrideSize({ width: NaN, height: 30 })).toBeUndefined();
  });

  test("零或负尺寸 → undefined", () => {
    expect(normalizeDefinitionOverrideSize({ width: 0, height: 30 })).toBeUndefined();
    expect(normalizeDefinitionOverrideSize({ width: 40, height: -1 })).toBeUndefined();
  });

  test("极小正尺寸被抬到 1", () => {
    expect(normalizeDefinitionOverrideSize({ width: 0.1, height: 0.1 })).toEqual({ width: 1, height: 1 });
  });
});

describe("normalizeDefinitionOverrideTerminalType", () => {
  test("已知的交流端子类型原样返回", () => {
    expect(normalizeDefinitionOverrideTerminalType("ac")).toBe("ac");
  });

  test("未知类型 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalType("未知")).toBeUndefined();
  });

  test("前后空白被裁掉", () => {
    expect(normalizeDefinitionOverrideTerminalType("  dc  ")).toBe("dc");
  });

  test("空值 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalType(null)).toBeUndefined();
    expect(normalizeDefinitionOverrideTerminalType(undefined)).toBeUndefined();
  });
});

describe("normalizeDefinitionOverrideTerminalTypes", () => {
  test("按 count 截断后归一", () => {
    expect(normalizeDefinitionOverrideTerminalTypes(["ac", "dc", "ac"], 2)).toEqual(["ac", "dc"]);
  });

  test("非数组 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalTypes("ac", 1)).toBeUndefined();
    expect(normalizeDefinitionOverrideTerminalTypes(null, 1)).toBeUndefined();
  });

  test("非法项被剔除，其余保留", () => {
    expect(normalizeDefinitionOverrideTerminalTypes(["ac", "未知", "dc"], 3)).toEqual(["ac", "dc"]);
  });

  test("全部非法 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalTypes(["未知"], 1)).toBeUndefined();
  });

  test("空数组 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalTypes([], 2)).toBeUndefined();
  });

  test("count 为 0 时用数组长度", () => {
    expect(normalizeDefinitionOverrideTerminalTypes(["ac", "dc"], 0)).toEqual(["ac", "dc"]);
  });

  test("count 为负时截到空 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalTypes(["ac"], -1)).toBeUndefined();
  });
});

describe("normalizeDefinitionOverrideTerminalAnchors", () => {
  test("合法锚点被投影到边界", () => {
    const result = normalizeDefinitionOverrideTerminalAnchors([{ x: 0, y: 0.5 }], 1);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ x: 0, y: 0.5 });
  });

  test("非数组 → undefined", () => {
    expect(normalizeDefinitionOverrideTerminalAnchors("x", 1)).toBeUndefined();
  });

  test("非对象的项被剔除", () => {
    expect(normalizeDefinitionOverrideTerminalAnchors([{ x: 0, y: 0 }, "x", null], 3)).toHaveLength(1);
  });

  test("坐标非数值的项被剔除", () => {
    expect(normalizeDefinitionOverrideTerminalAnchors([{ x: NaN, y: 0 }, { x: "a", y: 0 }], 2)).toBeUndefined();
  });

  test("超出 -1..1 的坐标被投影回边界", () => {
    const result = normalizeDefinitionOverrideTerminalAnchors([{ x: 5, y: -5 }], 1);

    expect(result![0].x).toBeLessThanOrEqual(1);
    expect(result![0].y).toBeGreaterThanOrEqual(-1);
  });

  test("空数组返回 undefined（与端子类型那条口径一致）", () => {
    expect(normalizeDefinitionOverrideTerminalAnchors([], 2)).toBeUndefined();
  });

  test("按 count 截断", () => {
    expect(normalizeDefinitionOverrideTerminalAnchors([{ x: 0, y: 0 }, { x: 1, y: 0 }], 1)).toHaveLength(1);
  });
});
