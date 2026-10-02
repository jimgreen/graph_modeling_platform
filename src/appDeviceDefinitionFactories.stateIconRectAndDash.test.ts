// 状态图标的框选矩形与虚线样式。
// 框选矩形要能处理「反向拖拽」（右下 → 左上），否则框选区会是负尺寸。
// 虚线：dotted 与 dashed 两套比例不同，solid 不画 dash。
import { describe, expect, test } from "vitest";

import {
  stateIconDrawingFrameDashArray,
  stateIconDrawingRectFromPoints
} from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("stateIconDrawingRectFromPoints", () => {
  test("正向拖拽给出起止点构成的矩形", () => {
    expect(stateIconDrawingRectFromPoints(pt(10, 20), pt(110, 80))).toEqual({
      left: 10,
      right: 110,
      top: 20,
      bottom: 80
    });
  });

  test("反向拖拽（右下到左上）也给出正尺寸矩形", () => {
    expect(stateIconDrawingRectFromPoints(pt(110, 80), pt(10, 20))).toEqual({
      left: 10,
      right: 110,
      top: 20,
      bottom: 80
    });
  });

  test("只反向拖 x 时左右仍归位", () => {
    expect(stateIconDrawingRectFromPoints(pt(100, 0), pt(0, 0))).toMatchObject({ left: 0, right: 100 });
  });

  test("只反向拖 y 时上下仍归位", () => {
    expect(stateIconDrawingRectFromPoints(pt(0, 100), pt(0, 0))).toMatchObject({ top: 0, bottom: 100 });
  });

  test("起点终点相同时得到零尺寸矩形", () => {
    expect(stateIconDrawingRectFromPoints(pt(5, 5), pt(5, 5))).toEqual({ left: 5, right: 5, top: 5, bottom: 5 });
  });

  test("负坐标照常处理", () => {
    expect(stateIconDrawingRectFromPoints(pt(-50, -30), pt(-10, -5))).toEqual({
      left: -50,
      right: -10,
      top: -30,
      bottom: -5
    });
  });
});

describe("stateIconDrawingFrameDashArray", () => {
  test("dotted 用短划 + 长间隔", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dotted", strokeWidth: 10 })).toBe("2 20");
  });

  test("dashed 用长划 + 短间隔", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dashed", strokeWidth: 10 })).toBe("50 30");
  });

  test("线宽缺省按 1 算", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dotted" })).toBe("0.2 2");
  });

  test("线宽为 0 时兜底为 1，不产生全零 dash", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dashed", strokeWidth: 0 })).toBe("5 3");
  });

  test("线宽为负时也按 1 兜底", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dotted", strokeWidth: -8 })).toBe("0.2 2");
  });

  test("线宽为 NaN 时按 1 兜底", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dashed", strokeWidth: NaN })).toBe("5 3");
  });

  test("实线不返回 dash", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "solid", strokeWidth: 4 })).toBeUndefined();
  });

  test("线宽为小数时按比例缩放", () => {
    expect(stateIconDrawingFrameDashArray({ strokeStyle: "dashed", strokeWidth: 2.5 })).toBe("12.5 7.5");
  });

  test("传入 undefined 时不返回 dash", () => {
    expect(stateIconDrawingFrameDashArray(undefined)).toBeUndefined();
  });
});
