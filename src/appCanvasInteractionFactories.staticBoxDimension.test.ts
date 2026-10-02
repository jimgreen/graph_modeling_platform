// createNormalizeStaticBoxDimension：静态图元绘制尺寸归一。
// 三步顺序不能换：非有限值先落回退值 → 夹到 [4, max] → 保留一位小数。
// 先取整再夹会让 4.04 变成 4.0（被下限吃掉），先夹再取整才对。
import { describe, expect, test } from "vitest";

import { createNormalizeStaticBoxDimension } from "./appExtracted/appCanvasInteractionFactories";

const normalize = createNormalizeStaticBoxDimension({
  clampNumber: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
});

describe("createNormalizeStaticBoxDimension", () => {
  test("正常值原样返回", () => {
    expect(normalize(50, 20, 400)).toBe(50);
  });

  test("小于下限时夹到下限", () => {
    expect(normalize(1, 20, 400)).toBe(4);
  });

  test("大于上限时夹到上限", () => {
    expect(normalize(9999, 20, 400)).toBe(400);
  });

  test("保留一位小数", () => {
    expect(normalize(50.44, 20, 400)).toBe(50.4);
    expect(normalize(50.46, 20, 400)).toBe(50.5);
  });

  test("NaN 落回退值", () => {
    expect(normalize(NaN, 20, 400)).toBe(20);
  });

  test("Infinity 落回退值（不是夹到上限）", () => {
    expect(normalize(Infinity, 20, 400)).toBe(20);
    expect(normalize(-Infinity, 20, 400)).toBe(20);
  });

  test("回退值本身也会被夹与取整", () => {
    expect(normalize(NaN, 1, 400)).toBe(4);
    expect(normalize(NaN, 20.44, 400)).toBe(20.4);
  });

  test("恰好等于上下限时原样返回", () => {
    expect(normalize(4, 20, 400)).toBe(4);
    expect(normalize(400, 20, 400)).toBe(400);
  });

  test("负值夹到下限而不是被接受", () => {
    expect(normalize(-100, 20, 400)).toBe(4);
  });
});
