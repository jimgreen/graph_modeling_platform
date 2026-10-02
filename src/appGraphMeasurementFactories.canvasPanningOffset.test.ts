// createApplyCanvasPanningVisualOffset：把平移后的显示位置同步写进三个 DOM 元素
// （画布 svg、缩放热区层、刻度尺锚点容器）。三者共用同一组 left/top，
// 且都要容忍 ref 为空（元素尚未挂载）。
import { describe, expect, test, vi } from "vitest";

import { createApplyCanvasPanningVisualOffset } from "./appExtracted/appGraphMeasurementFactories";

function createScope() {
  return {
    canvasBaseDisplayOffsetX: 10,
    canvasBaseDisplayOffsetY: 20,
    canvasDisplayWidth: 800,
    canvasDisplayHeight: 600,
    canvasResizeDrag: null,
    // 固定返回入参，方便断言「四舍五入后 + 锚定修正」的顺序
    canvasResizeAnchoredDisplayOffset: vi.fn((value: number) => value),
    svgRef: { current: { style: {} as any } },
    canvasResizeHotzonesRef: { current: { style: {} as any } },
    canvasRulersRef: { current: { style: {} as any } }
  };
}

describe("createApplyCanvasPanningVisualOffset", () => {
  test("基础偏移加上本次平移并取整", () => {
    const scope = createScope();

    createApplyCanvasPanningVisualOffset(scope)({ x: 5.4, y: -3.6 });

    expect(scope.svgRef.current.style.left).toBe("15px");
    expect(scope.svgRef.current.style.top).toBe("16px");
  });

  test("svg、热区层、刻度尺三者拿到同一组 left/top", () => {
    const scope = createScope();

    createApplyCanvasPanningVisualOffset(scope)({ x: 30, y: 40 });

    const positions = [scope.svgRef.current.style, scope.canvasResizeHotzonesRef.current.style, scope.canvasRulersRef.current.style];
    for (const style of positions) {
      expect(style.left).toBe("40px");
      expect(style.top).toBe("60px");
    }
  });

  test("锚定修正收到取整后的值与对应轴", () => {
    const scope = createScope();
    scope.canvasResizeAnchoredDisplayOffset = vi.fn((value: number, _drag: any, axis: string) => value * (axis === "x" ? 1 : 10));

    createApplyCanvasPanningVisualOffset(scope)({ x: 5.4, y: -3.6 });

    expect(scope.canvasResizeAnchoredDisplayOffset.mock.calls[0]).toEqual([15, null, "x", 800]);
    expect(scope.canvasResizeAnchoredDisplayOffset.mock.calls[1]).toEqual([16, null, "y", 600]);
  });

  test("svg 未挂载时不抛，其余元素照常写", () => {
    const scope = createScope();
    scope.svgRef.current = null as any;

    expect(() => createApplyCanvasPanningVisualOffset(scope)({ x: 1, y: 1 })).not.toThrow();
    expect(scope.canvasResizeHotzonesRef.current.style.left).toBe("11px");
  });

  test("热区层未挂载时不抛", () => {
    const scope = createScope();
    scope.canvasResizeHotzonesRef.current = null as any;

    expect(() => createApplyCanvasPanningVisualOffset(scope)({ x: 1, y: 1 })).not.toThrow();
    expect(scope.svgRef.current.style.left).toBe("11px");
  });

  test("刻度尺 ref 缺省（整个字段不存在）时不抛", () => {
    const scope = createScope();
    delete (scope as any).canvasRulersRef;

    expect(() => createApplyCanvasPanningVisualOffset(scope)({ x: 1, y: 1 })).not.toThrow();
  });

  test("零偏移也会写一遍（保证与上一次状态一致）", () => {
    const scope = createScope();

    createApplyCanvasPanningVisualOffset(scope)({ x: 0, y: 0 });

    expect(scope.svgRef.current.style.left).toBe("10px");
    expect(scope.svgRef.current.style.top).toBe("20px");
  });
});
