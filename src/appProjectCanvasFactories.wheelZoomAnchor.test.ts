// 滚轮缩放锚点：光标在画布框内就锚在光标处，框外就锚在可视区中心。
// 锚点坐标要夹进画布边界，否则缩放后锚点会跑到画布外、视口跟着跑偏。
import { describe, expect, test, vi } from "vitest";

import {
  createClientPointInsideRenderedCanvas,
  createWheelZoomAnchorFromClient
} from "./appExtracted/appProjectCanvasFactories";

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom, width: right - left, height: bottom - top });
const pt = (x: number, y: number) => ({ x, y });

describe("createClientPointInsideRenderedCanvas", () => {
  function createScope(frameRect: any, svgRect: any) {
    return {
      canvasFrameRef: { current: frameRect ? { getBoundingClientRect: () => frameRect } : null },
      svgRef: { current: svgRect ? { getBoundingClientRect: () => svgRect } : null }
    };
  }

  test("同时在画布框与 SVG 内时为真", () => {
    const scope = createScope(rect(0, 0, 200, 200), rect(0, 0, 200, 200));

    expect(createClientPointInsideRenderedCanvas(scope)(100, 100)).toBe(true);
  });

  test("画布框未挂载时为假", () => {
    expect(createClientPointInsideRenderedCanvas(createScope(null, rect(0, 0, 200, 200)))(10, 10)).toBe(false);
  });

  test("SVG 未挂载时为假", () => {
    expect(createClientPointInsideRenderedCanvas(createScope(rect(0, 0, 200, 200), null))(10, 10)).toBe(false);
  });

  test("在画布框内但 SVG 更小（超出 SVG）时为假", () => {
    const scope = createScope(rect(0, 0, 200, 200), rect(0, 0, 100, 100));

    expect(createClientPointInsideRenderedCanvas(scope)(150, 50)).toBe(false);
  });

  test("SVG 内但超出画布框时为假", () => {
    const scope = createScope(rect(0, 0, 100, 100), rect(0, 0, 200, 200));

    expect(createClientPointInsideRenderedCanvas(scope)(150, 50)).toBe(false);
  });

  test("正好落在边界上算在内", () => {
    const scope = createScope(rect(0, 0, 200, 200), rect(0, 0, 200, 200));

    expect(createClientPointInsideRenderedCanvas(scope)(200, 200)).toBe(true);
  });
});

describe("createWheelZoomAnchorFromClient", () => {
  const frameRect = rect(0, 0, 400, 300);

  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      canvasFrameRef: { current: { getBoundingClientRect: () => frameRect } },
      svgRef: { current: { id: "svg" } },
      canvasBoundsRef: { current: { width: 1000, height: 800 } },
      canvasVisibleViewBoxRef: { current: { x: 100, y: 200, width: 400, height: 200 } },
      viewBoxRef: { current: { x: 0, y: 0, width: 1000, height: 800 } },
      screenToSvgPoint: vi.fn(() => pt(50, 60)),
      clampPointToBounds: vi.fn((p: any) => p),
      clampNumber: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
      ...over
    };
    scope.wheelZoomAnchorFromClient = createWheelZoomAnchorFromClient(scope);
    return scope;
  }

  test("光标在框内时锚在光标处", () => {
    const scope = createScope();

    expect(scope.wheelZoomAnchorFromClient(100, 100)).toEqual({
      point: pt(50, 60),
      cursorOffsetX: 100,
      cursorOffsetY: 100
    });
  });

  test("锚点经屏幕坐标换算并夹进画布边界", () => {
    const scope = createScope();

    scope.wheelZoomAnchorFromClient(100, 100);

    expect(scope.screenToSvgPoint).toHaveBeenCalledWith(scope.svgRef.current, 100, 100);
    expect(scope.clampPointToBounds).toHaveBeenCalledWith(pt(50, 60), { width: 1000, height: 800 });
  });

  test("光标在框外时锚在可视区中心", () => {
    const scope = createScope();

    expect(scope.wheelZoomAnchorFromClient(999, 999)).toEqual({
      point: pt(300, 300),
      cursorOffsetX: 200,
      cursorOffsetY: 150
    });
  });

  test("可视区宽高为 0 时退回当前 viewBox 中心", () => {
    const scope = createScope({ canvasVisibleViewBoxRef: { current: { x: 0, y: 0, width: 0, height: 0 } } });

    expect(scope.wheelZoomAnchorFromClient(999, 999).point).toEqual(pt(500, 400));
  });

  test("光标在框外时偏移固定为画布框中心（不按光标位置算）", () => {
    const scope = createScope();

    const anchor = scope.wheelZoomAnchorFromClient(999, 999);

    expect(anchor.cursorOffsetX).toBe(200);
    expect(anchor.cursorOffsetY).toBe(150);
  });

  test("画布框未挂载时返回 null", () => {
    const scope = createScope({ canvasFrameRef: { current: null } });

    expect(scope.wheelZoomAnchorFromClient(10, 10)).toBeNull();
  });

  test("SVG 未挂载时返回 null", () => {
    const scope = createScope({ svgRef: { current: null } });

    expect(scope.wheelZoomAnchorFromClient(10, 10)).toBeNull();
  });

  test("框外分支不查屏幕坐标（无从查起）", () => {
    const scope = createScope();

    scope.wheelZoomAnchorFromClient(999, 999);

    expect(scope.screenToSvgPoint).not.toHaveBeenCalled();
  });
});
