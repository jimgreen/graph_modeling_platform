// 状态图标拖拽的位移收敛：选区必须整体留在画布内。
// 两条容易写错的：① 选区比画布还大时该轴直接锁死为 0（区间反向，夹会夹反）；
// ② frameRect 字段缺失/为 NaN 时按 0 处理，不让一个坏矩形毁掉整个拖拽。
import { describe, expect, test } from "vitest";

import { clampStateIconDrawingMovementDelta } from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });
const frame = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const element = (id: string, x: number, y: number, width = 20, height = 20) => ({
  id,
  kind: "polyline",
  x,
  y,
  width,
  height,
  rotation: 0
});

describe("clampStateIconDrawingMovementDelta", () => {
  test("没有选中元素时位移归零", () => {
    expect(clampStateIconDrawingMovementDelta([], pt(50, 50), frame(0, 0, 240, 160))).toEqual(pt(0, 0));
  });

  test("未越界时原样返回", () => {
    const result = clampStateIconDrawingMovementDelta([element("e1", 100, 100)], pt(10, 10), frame(0, 0, 240, 160));

    expect(result).toEqual(pt(10, 10));
  });

  test("越过右边界时夹住", () => {
    // 元素 x=100 宽 20 → 选区 [90,110]；画布右边界 240 → 最多右移 130
    const result = clampStateIconDrawingMovementDelta([element("e1", 100, 100)], pt(999, 0), frame(0, 0, 240, 160));

    expect(result.x).toBe(130);
  });

  test("越过左边界时夹住", () => {
    const result = clampStateIconDrawingMovementDelta([element("e1", 100, 100)], pt(-999, 0), frame(0, 0, 240, 160));

    expect(result.x).toBe(-90);
  });

  test("越过下边界时夹住", () => {
    const result = clampStateIconDrawingMovementDelta([element("e1", 100, 100)], pt(0, 999), frame(0, 0, 240, 160));

    expect(result.y).toBe(50);
  });

  test("多元素取并集后收敛", () => {
    const elements = [element("e1", 10, 10), element("e2", 200, 10)];
    const result = clampStateIconDrawingMovementDelta(elements, pt(999, 0), frame(0, 0, 240, 160));

    // 选区 [0, 210] → 最多右移 30
    expect(result.x).toBe(30);
  });

  test("选区比画布还宽时该轴锁死为 0，另一轴照常收敛", () => {
    const result = clampStateIconDrawingMovementDelta([element("e1", 0, 0, 300, 20)], pt(50, 5), frame(0, 0, 240, 160));

    // 选区 x 跨 [-150,150]，可走区间 [150,90] 反向 → 锁 0
    expect(result.x).toBe(0);
    // 选区 y 跨 [-10,10]，可走区间 [10,150] → 5 被抬到下限 10
    expect(result.y).toBe(10);
  });

  test("画布矩形带偏移时按偏移后的边界算", () => {
    // 画布 [20, 260]；元素选区 [90,110] → 最多右移 150
    const result = clampStateIconDrawingMovementDelta([element("e1", 100, 100)], pt(999, 0), frame(20, 0, 240, 160));

    expect(result.x).toBe(150);
  });

  test("画布矩形字段缺失时按 0 处理", () => {
    expect(() => clampStateIconDrawingMovementDelta([element("e1", 0, 0)], pt(5, 5), {})).not.toThrow();
  });

  test("画布宽高为负时按 0 处理（不产生反向区间）", () => {
    const result = clampStateIconDrawingMovementDelta([element("e1", 0, 0)], pt(5, 5), frame(0, 0, -100, -100));

    expect(result).toEqual(pt(0, 0));
  });

  test("旋转后的元素按旋转包围盒算", () => {
    const rotated = { ...element("e1", 100, 100, 20, 20), rotation: 45 };
    const result = clampStateIconDrawingMovementDelta([rotated], pt(999, 0), frame(0, 0, 240, 160));

    // 45° 旋转后半宽约 14.14，右边界比不旋转时更靠右 → 可位移量更小
    expect(result.x).toBeLessThan(130);
    expect(result.x).toBeGreaterThan(120);
  });

  test("元素宽高为 0 时按 1 兜底", () => {
    const result = clampStateIconDrawingMovementDelta([element("e1", 100, 100, 0, 0)], pt(999, 0), frame(0, 0, 240, 160));

    expect(Number.isFinite(result.x)).toBe(true);
  });
});
