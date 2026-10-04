// 导入 SVG 元素的选择框：按 SVG 自身 viewBox 等比缩放到元素尺寸并居中。
// 缩放取「两轴较小者」（contain），不是拉伸 —— 拉伸会让选择框和图形对不上。
// 三个返回 null 的前置条件也都要钉住，否则退化成一个 0×0 的框、点不中。
import { describe, expect, test } from "vitest";

import { stateIconDrawingImportedSvgSelectionFrame } from "./appExtracted/appDeviceDefinitionFactories";

// 本文件**刻意不 vi.mock stateIconDrawing**，直接跑真实的 stateIconSvgVisibleViewBox。
//
// 早先这里 mock 掉了 viewBox 解析（只认 "空" 与固定的 "0 0 100 50"），它把两个前提
// 藏了起来：① 顶层 vi.mock 只在「本文件的模块注册表里还没求值过该模块」时才接管；
// ② 自闭合的 <svg .../> 走不通真实解析（见下）。关掉 isolate 后共享注册表里
// 别的文件已把 stateIconDrawing / appDeviceDefinitionFactories 求值过，mock 直接失效，
// 真实实现被调用，而自闭合源码解析不出 viewBox，于是**整条被测路径返回 null** ——
// 不是数值偏差，是 5 条断言同时塌成 "expected null"。
//
// 现在改用**闭合写法** `<svg viewBox='0 0 100 50'></svg>`：真实解析在无 DOM 环境
// （本仓 test.environment = "node"，既无 DOMParser 也无 document）下走
// stateIconSvgFallbackParts 的正则分支，能读出 "0 0 100 50"，与原先 mock 注入的值一致，
// 故下面所有期望数字一条不改，两种模式下都成立，且不再依赖「注册表是干净的」。
// ⚠ 别再把 mock 加回来：那正是跨文件泄漏的入口，而它并不能让断言更严。
const VIEW_BOX_SOURCE = "<svg viewBox='0 0 100 50'></svg>";

const element = (over: Record<string, any> = {}) => ({
  kind: "imported-svg",
  svgSource: VIEW_BOX_SOURCE,
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
    // 非 SVG 源码：真实解析走 stateIconSvgFallbackParts，认不出 <svg…> 开标签 → viewBox 为空串
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "空" }))).toBeNull();
  });

  test("viewBox 尺寸为 0 时返回 null（避免除零）", () => {
    // 闭合写法让真实解析确实读出 "0 0 0 0"，于是真正走到 width <= 0 那条除零守卫上。
    // 早先的写法是 `frame === null || Number.isFinite(frame.width)` —— mock 让本用例
    // 恒真，等于什么都没验；去掉 mock 后才有资格断言「必须返回 null」。
    expect(stateIconDrawingImportedSvgSelectionFrame(element({ svgSource: "<svg viewBox='0 0 0 0'></svg>" }))).toBeNull();
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
