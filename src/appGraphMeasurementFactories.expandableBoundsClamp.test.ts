// 「可自动扩容画布」下的钳制：只允许把点往左/往上推回（扩容方向），
// 往右/往下超出的部分不再回拉 —— 这是自动扩容与固定画布两种模式的唯一差别。
// 固定画布模式（allowAutoExpandCanvas=false）直接用底层钳制结果。
import { describe, expect, test, vi } from "vitest";

import {
  createCanvasNoScrollOffsetForCanvasResizeAnchor,
  createClampEdgeGeometryToExpandableBounds,
  createClampNodePositionToExpandableBounds,
  createClampPointToExpandableBounds,
  createMinimumCanvasBoundsForResizeEdge
} from "./appExtracted/appGraphMeasurementFactories";

const bounds = { width: 100, height: 100 };

function createScope(allow: boolean, clampResult: { x: number; y: number }) {
  const scope: Record<string, any> = {
    allowAutoExpandCanvas: allow,
    clampNodePositionToBounds: vi.fn(() => clampResult),
    clampPointToBounds: vi.fn(() => clampResult)
  };
  scope.clampPointToExpandableBounds = createClampPointToExpandableBounds(scope);
  scope.clampEdgeGeometryToExpandableBounds = createClampEdgeGeometryToExpandableBounds(scope);
  return scope;
}

describe("createClampPointToExpandableBounds", () => {
  test("固定画布：直接用底层钳制结果", () => {
    const scope = createScope(false, { x: 10, y: 20 });

    expect(scope.clampPointToExpandableBounds({ x: 5, y: 5 }, bounds)).toEqual({ x: 10, y: 20 });
  });

  test("自动扩容：原点被钳到正侧时放行原始值（往左扩）", () => {
    const scope = createScope(true, { x: 10, y: 20 });

    expect(scope.clampPointToExpandableBounds({ x: 5.4, y: 5.6 }, bounds)).toEqual({ x: 5, y: 6 });
  });

  test("自动扩容：原值不小于钳制值时用钳制值", () => {
    const scope = createScope(true, { x: 10, y: 20 });

    expect(scope.clampPointToExpandableBounds({ x: 50, y: 50 }, bounds)).toEqual({ x: 10, y: 20 });
  });

  test("两个轴各自独立判断", () => {
    const scope = createScope(true, { x: 10, y: 20 });

    expect(scope.clampPointToExpandableBounds({ x: 5, y: 50 }, bounds)).toEqual({ x: 5, y: 20 });
  });
});

describe("createClampNodePositionToExpandableBounds", () => {
  const node = { id: "n1", position: { x: 0, y: 0 } };

  test("不传 position 时默认用节点自身位置", () => {
    const scope = createScope(false, { x: 1, y: 2 });
    const clamp = createClampNodePositionToExpandableBounds(scope);

    clamp(node as any, bounds);

    expect(scope.clampNodePositionToBounds).toHaveBeenCalledWith(node, bounds, node.position);
  });

  test("显式传入 position 时用传入值", () => {
    const scope = createScope(false, { x: 1, y: 2 });
    const next = { x: 3, y: 4 };

    createClampNodePositionToExpandableBounds(scope)(node as any, bounds, next);

    expect(scope.clampNodePositionToBounds).toHaveBeenCalledWith(node, bounds, next);
  });

  test("自动扩容：往左的位移被放行并取整", () => {
    const scope = createScope(true, { x: 10, y: 10 });

    expect(createClampNodePositionToExpandableBounds(scope)(node as any, bounds, { x: -7.2, y: 90 })).toEqual({ x: -7, y: 10 });
  });
});

describe("createClampEdgeGeometryToExpandableBounds", () => {
  /** 恒等钳制：所有点都在界内，用来验证「没变化就返回原对象」。 */
  function noChangeScope() {
    const scope = createScope(true, { x: 0, y: 0 });
    scope.clampPointToBounds = vi.fn((p: any) => p);
    scope.clampPointToExpandableBounds = createClampPointToExpandableBounds(scope);
    scope.clampEdgeGeometryToExpandableBounds = createClampEdgeGeometryToExpandableBounds(scope);
    return scope;
  }

  test("所有点都在界内时返回同一个边对象", () => {
    const edge: any = { id: "e1", sourcePoint: { x: 5, y: 5 }, targetPoint: { x: 6, y: 6 }, manualPoints: [{ x: 1, y: 1 }] };

    expect(noChangeScope().clampEdgeGeometryToExpandableBounds(edge, bounds)).toBe(edge);
  });

  test("源点被改动时返回新边并带上钳制后的点", () => {
    const scope = createScope(true, { x: 0, y: 0 });
    const edge: any = { id: "e1", sourcePoint: { x: 5, y: 5 }, targetPoint: { x: 6, y: 6 } };

    const next = scope.clampEdgeGeometryToExpandableBounds(edge, bounds);

    expect(next).not.toBe(edge);
    expect(next.sourcePoint).toEqual({ x: 0, y: 0 });
  });

  test("手工点被改动时也产出新边", () => {
    const scope = createScope(true, { x: 0, y: 0 });
    const edge: any = { id: "e1", manualPoints: [{ x: 5, y: 5 }] };

    expect(scope.clampEdgeGeometryToExpandableBounds(edge, bounds)).not.toBe(edge);
  });

  test("缺省点字段不会被凭空补出来", () => {
    const scope = createScope(true, { x: 0, y: 0 });
    const edge: any = { id: "e1", sourcePoint: { x: 5, y: 5 } };

    const next = scope.clampEdgeGeometryToExpandableBounds(edge, bounds);

    expect(next.manualPoints).toBeUndefined();
    expect(next.targetPoint).toBeUndefined();
  });
});

describe("createMinimumCanvasBoundsForResizeEdge", () => {
  function createScope() {
    const scope: Record<string, any> = {
      MIN_CANVAS_WIDTH: 400,
      MIN_CANVAS_HEIGHT: 300,
      MOVE_BOUNDARY_GUARD: 20,
      canvasBounds: { width: 800, height: 600 },
      nodes: [],
      edges: [{ id: "e1" }],
      routedEdges: [{ id: "r1", points: [] }],
      calculateModelGeometryBounds: vi.fn(() => ({ left: 0, top: 0, right: 100, bottom: 100 })),
      edgeRoutesForGeometryBounds: vi.fn(() => [{ id: "rg", points: [] }]),
      canvasResizeMinimumBoundsForGeometry: vi.fn(() => ({ width: 640, height: 480 })),
      clampCanvasBounds: vi.fn((b: any) => b)
    };
    scope.minimumCanvasBoundsForResizeEdge = createMinimumCanvasBoundsForResizeEdge(scope);
    return scope;
  }

  test("委托给 canvasResizeMinimumBoundsForGeometry 并过一道钳制", () => {
    const scope = createScope();

    expect(scope.minimumCanvasBoundsForResizeEdge("right" as any)).toEqual({ width: 640, height: 480 });
    expect(scope.clampCanvasBounds).toHaveBeenCalledWith({ width: 640, height: 480 });
  });

  test("几何边界计算带上护栏 padding，路由与边的几何路由合并", () => {
    const scope = createScope();

    scope.minimumCanvasBoundsForResizeEdge("left" as any);

    expect(scope.calculateModelGeometryBounds).toHaveBeenCalledWith([], [{ id: "r1", points: [] }, { id: "rg", points: [] }], 20);
  });

  test("当前画布尺寸与最小尺寸一起透传", () => {
    const scope = createScope();

    scope.minimumCanvasBoundsForResizeEdge("top" as any);

    expect(scope.canvasResizeMinimumBoundsForGeometry).toHaveBeenCalledWith(
      "top",
      { width: 800, height: 600 },
      { left: 0, top: 0, right: 100, bottom: 100 },
      { width: 400, height: 300 }
    );
  });
});

describe("createCanvasNoScrollOffsetForCanvasResizeAnchor", () => {
  /**
   * 固定化所有外部换算，只保留本函数自己的编排逻辑：
   * 下一 viewBox → 缩放 → 显示尺寸（至少 1px）→ 滚动条判定 → 锚定期望偏移 → 减去基准偏移 → 钳制。
   */
  function createScope(viewport = { width: 1000, height: 800 }) {
    const scope: Record<string, any> = {
      CANVAS_FRAME_INSET: 4,
      CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE: 2,
      canvasBoundsRef: { current: { width: 1000, height: 800 } },
      viewBoxRef: { current: { x: 0, y: 0, width: 1000, height: 800 } },
      canvasFrameViewportSize: viewport,
      canvasRenderViewBoxAfterBoundsDraft: vi.fn((current: any, _from: any, to: any) => ({ ...current, width: to.width, height: to.height })),
      canvasScrollScaleFromViewBox: vi.fn(() => ({ x: 1, y: 1 })),
      canvasScrollSurfaceSize: vi.fn((display: number) => display),
      canvasDisplayOffset: vi.fn(() => 0),
      canvasResizeEdgeAnchorsStart: vi.fn((_edge: string, axis: string) => axis === "x"),
      clampCanvasNoScrollOffset: vi.fn((value: number) => value)
    };
    scope.canvasNoScrollOffsetForCanvasResizeAnchor = createCanvasNoScrollOffsetForCanvasResizeAnchor(scope);
    return scope;
  }

  const drag = (over: Record<string, any> = {}) => ({
    edge: "right",
    startDisplayOffsetX: 20,
    startDisplayOffsetY: 30,
    startDisplayWidth: 1000,
    startDisplayHeight: 800,
    ...over
  });

  test("右边缘拖拽时 x 锚定在右端：起点 + 起点宽 - 新宽，再减基准偏移", () => {
    const scope = createScope();

    const result = scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 600, height: 800 });

    expect(result.x).toBe(20 + 1000 - 600);
  });

  test("基准偏移从结果里扣掉", () => {
    const scope = createScope();
    scope.canvasDisplayOffset = vi.fn(() => 15);

    const result = scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 600, height: 800 });

    expect(result.x).toBe(20 + 1000 - 600 - 15);
  });

  test("非锚定轴保持起始偏移", () => {
    const scope = createScope();
    scope.canvasResizeEdgeAnchorsStart = vi.fn((_edge: string, axis: string) => axis === "x");

    const result = scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 600, height: 400 });

    expect(result.y).toBe(30 - 0);
  });

  test("显示尺寸至少 1px，画布被拖到 0 宽也不给 0", () => {
    const scope = createScope();

    scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 0, height: 0 });

    expect(scope.clampCanvasNoScrollOffset.mock.calls[0][1]).toBe(1);
    expect(scope.clampCanvasNoScrollOffset.mock.calls[1][1]).toBe(1);
  });

  test("显示尺寸超出视口时滚动条被判定为出现", () => {
    const scope = createScope();

    scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 5000, height: 5000 });

    expect(scope.canvasScrollSurfaceSize.mock.calls[0][2]).toBe(true);
    expect(scope.canvasScrollSurfaceSize.mock.calls[1][2]).toBe(true);
  });

  test("显示尺寸加内边距仍在视口内时不判定滚动条", () => {
    const scope = createScope();

    scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 900, height: 700 });

    expect(scope.canvasScrollSurfaceSize.mock.calls[0][2]).toBe(false);
    expect(scope.canvasScrollSurfaceSize.mock.calls[1][2]).toBe(false);
  });

  test("视口尺寸为 0 时不判定任何方向的滚动条（避免除零/误判）", () => {
    const scope = createScope({ width: 0, height: 0 });

    scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 5000, height: 5000 });

    expect(scope.canvasScrollSurfaceSize.mock.calls[0][2]).toBe(false);
    expect(scope.canvasScrollSurfaceSize.mock.calls[1][2]).toBe(false);
  });

  test("新 viewBox 由「当前 viewBox + 旧尺寸 + 新尺寸」推导", () => {
    const scope = createScope();

    scope.canvasNoScrollOffsetForCanvasResizeAnchor(drag(), { width: 600, height: 400 });

    expect(scope.canvasRenderViewBoxAfterBoundsDraft).toHaveBeenCalledWith(
      { x: 0, y: 0, width: 1000, height: 800 },
      { width: 1000, height: 800 },
      { width: 600, height: 400 }
    );
  });
});
