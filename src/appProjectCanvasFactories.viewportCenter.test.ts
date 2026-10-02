// 视口居中：把某个点挪到视口中心。
// 两个「用哪套尺寸」的决定最容易写错：宽度用当前 viewBox 的（缩放级别不变），
// 高度/宽度为 0 时才回落到可见区。锚点固定在视口中心（偏移是画布框的一半）。
import { describe, expect, test, vi } from "vitest";

import {
  createCenterViewBoxOnPoint,
  createRouteManualPoints,
  createViewportCenterAnchorForPoint
} from "./appExtracted/appProjectCanvasFactories";

const pt = (x: number, y: number) => ({ x, y });
const frameRect = { left: 0, top: 0, width: 400, height: 300 };

describe("createViewportCenterAnchorForPoint", () => {
  function createScope(over: Record<string, any> = {}) {
    return {
      canvasFrameRef: { current: { getBoundingClientRect: () => frameRect } },
      canvasBoundsRef: { current: { width: 1000, height: 800 } },
      clampPointToBounds: vi.fn((p: any) => p),
      ...over
    };
  }

  test("画布框未挂载时返回 null", () => {
    expect(createViewportCenterAnchorForPoint(createScope({ canvasFrameRef: { current: null } }))(pt(0, 0))).toBeNull();
  });

  test("画布框尺寸为 0 时返回 null（无从算中心）", () => {
    const scope = createScope({ canvasFrameRef: { current: { getBoundingClientRect: () => ({ ...frameRect, width: 0 }) } } });

    expect(createViewportCenterAnchorForPoint(scope)(pt(0, 0))).toBeNull();
  });

  test("锚点偏移固定为画布框中心", () => {
    expect(createViewportCenterAnchorForPoint(createScope())(pt(50, 60))).toEqual({
      point: pt(50, 60),
      cursorOffsetX: 200,
      cursorOffsetY: 150
    });
  });

  test("目标点被夹进画布边界", () => {
    const scope = createScope();

    createViewportCenterAnchorForPoint(scope)(pt(50, 60));

    expect(scope.clampPointToBounds).toHaveBeenCalledWith(pt(50, 60), { width: 1000, height: 800 });
  });
});

describe("createCenterViewBoxOnPoint", () => {
  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      viewBoxRef: { current: { x: 0, y: 0, width: 200, height: 100 } },
      canvasVisibleViewBoxRef: { current: { x: 0, y: 0, width: 400, height: 300 } },
      clampViewBoxToCanvas: vi.fn((v: any) => v),
      setViewBoxAtViewportCenter: vi.fn(),
      ...over
    };
    scope.centerViewBoxOnPoint = createCenterViewBoxOnPoint(scope);
    return scope;
  }

  test("按可见区尺寸把目标点摆到中心，尺寸取当前 viewBox", () => {
    const scope = createScope();

    scope.centerViewBoxOnPoint(pt(500, 400));

    // 居中偏移按可见区（400×300）算；结果尺寸取当前 viewBox（200×100）
    expect(scope.setViewBoxAtViewportCenter).toHaveBeenCalledWith({ x: 300, y: 250, width: 200, height: 100 }, pt(500, 400));
  });

  test("可见区宽高为 0 时用当前 viewBox 的尺寸算居中偏移", () => {
    const scope = createScope({ canvasVisibleViewBoxRef: { current: { x: 0, y: 0, width: 0, height: 0 } } });

    scope.centerViewBoxOnPoint(pt(500, 400));

    expect(scope.setViewBoxAtViewportCenter.mock.calls[0][0]).toMatchObject({ x: 400, y: 350, width: 200, height: 100 });
  });

  test("结果尺寸始终取当前 viewBox（不因可见区变化而改缩放级别）", () => {
    const scope = createScope();

    scope.centerViewBoxOnPoint(pt(500, 400));

    expect(scope.setViewBoxAtViewportCenter.mock.calls[0][0]).toMatchObject({ width: 200, height: 100 });
  });

  test("结果先经 clampViewBoxToCanvas", () => {
    const scope = createScope();

    scope.centerViewBoxOnPoint(pt(500, 400));

    expect(scope.clampViewBoxToCanvas).toHaveBeenCalledWith({ x: 300, y: 250, width: 200, height: 100 });
  });

  test("目标点同时透传给居中提交器（用于算锚点）", () => {
    const scope = createScope();

    scope.centerViewBoxOnPoint(pt(500, 400));

    expect(scope.setViewBoxAtViewportCenter.mock.calls[0][1]).toEqual(pt(500, 400));
  });

  test("目标点在原点时左上角为负（不额外纠正）", () => {
    const scope = createScope();

    scope.centerViewBoxOnPoint(pt(0, 0));

    expect(scope.setViewBoxAtViewportCenter.mock.calls[0][0]).toMatchObject({ x: -200, y: -150 });
  });
});

describe("createRouteManualPoints", () => {
  const build = createRouteManualPoints({});
  const pts = (n: number) => Array.from({ length: n }, (_, i) => pt(i, i * 10));

  test("短路径去掉首尾两点（贴着两端节点）", () => {
    expect(build(pts(4))).toEqual([pt(1, 10), pt(2, 20)]);
  });

  test("长路径去掉首尾各两点（避开正交引出段）", () => {
    expect(build(pts(6))).toEqual([pt(2, 20), pt(3, 30)]);
  });

  test("恰好 5 点按长路径处理（去掉首尾各两点后只剩 1 点）", () => {
    expect(build(pts(5))).toEqual([pt(2, 20)]);
  });

  test("3 点时只剩中间一点", () => {
    expect(build(pts(3))).toEqual([pt(1, 10)]);
  });

  test("2 点时得到空数组", () => {
    expect(build(pts(2))).toEqual([]);
  });

  test("点集被深拷贝，改返回值不影响原数组", () => {
    const source = pts(4);

    const result = build(source);
    result[0].x = 999;

    expect(source[1].x).toBe(1);
  });

  test("空数组返回空数组", () => {
    expect(build([])).toEqual([]);
  });

  test("单点数组按 slice(1,-1) 得空", () => {
    expect(build(pts(1))).toEqual([]);
  });
});
