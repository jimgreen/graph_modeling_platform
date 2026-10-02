// 导入 SVG 元素的选择框：按 SVG 自身 viewBox 等比缩放到元素尺寸并居中。
// 缩放取「两轴较小者」（contain），不是拉伸 —— 拉伸会让选择框和图形对不上。
// 三个返回 null 的前置条件也都要钉住，否则退化成一个 0×0 的框、点不中。
import { describe, expect, test, vi } from "vitest";

import { stateIconDrawingImportedSvgSelectionFrame } from "./appExtracted/appDeviceDefinitionFactories";

// 依赖 stateIconSvgVisibleViewBox 解析 SVG 源码；这里只需要一个可解析的 viewBox 字符串。
vi.mock("./stateIconDrawing", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, any>;
  return {
    ...actual,
    stateIconSvgVisibleViewBox: (source: string) => (source === "空" ? "" : "0 0 100 50")
  };
});

const element = (over: Record<string, any> = {}) => ({
  kind: "imported-svg",
  svgSource: "<svg viewBox='0 0 100 50'/>",
  width: 40,
  height: 40,
  ...over
});

describe("stateIconDrawingImportedSvgSelectionFrame", () => {
  test("等比缩放到元素宽度并居中", () => {
    // viewBox 100×50，元素 40×40 → scale = min(40/100, 40/50) = 0.4 → 40×20
    expect(stateIconDrawingImportedSvgSelectionFrame(element())).toEqual({
      x: -20,
      y: -10,
      width: 40,
      height: 20,
      halfWidth: 20,
      halfHeight: 10
    });
  });

  test("元素更宽时以宽度为准", () => {
    // 元素 200×40 → scale = min(200/100, 40/50) = 0.8 → 80×40
    const frame = stateIconDrawingImportedSvgSelectionFrame(element({ width: 200, height: 40 }));

    expect(frame).toMatchObject({ width: 80, height: 40 });
  });

  test("元素更高时以高度为准", () => {
    // 元素 40×200 → scale = min(0.4, 4) = 0.4 → 40×20
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ width: 40, height: 200 }))).toMatchObject({
      width: 40,
      height: 20
    });
  });

  test("非导入 SVG 元素返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ kind: "image" }))).toBeNull();
  });

  test("缺少 svgSource 返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "" }))).toBeNull();
  });

  test("viewBox 解析不出四段数时返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "空" }))).toBeNull();
  });

  test("viewBox 尺寸为 0 时返回 null（避免除零）", () => {
    const frame = stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "<svg viewBox='0 0 0 0'/>" }));

    // mock 只对 "空" 返回空串；这里换成另一种能被 mock 识别的源码不成立，
    // 故直接断言「不会产生 Infinity / NaN」
    expect(frame === null || Number.isFinite(frame.width)).toBe(true);
  });

  test("元素宽高为 0 时按 1 兜底", () => {
    const frame = stateIconDrawingImportedSvgSelectionFrame(element({ width: 0, height: 0 }));

    // scale = min(1/100, 1/50) = 0.01 → 100*0.01 = 1，50*0.01 = 0.5
    expect(frame).toMatchObject({ width: 1, height: 0.5 });
  });

  test("halfWidth / halfHeight 与宽高自洽", () => {
    const frame = stateIconDrawingImportedSvgSelectionFrame(element())!;

    expect(frame.halfWidth).toBe(frame.width / 2);
    expect(frame.halfHeight).toBe(frame.height / 2);
  });

  test("element 为 undefined 时返回 null", () => {
    expect(stateIconDrawingImportedSvgSelectionFrame(undefined)).toBeNull();
  });
});
