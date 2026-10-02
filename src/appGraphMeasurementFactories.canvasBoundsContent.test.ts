// 画布边界与内容尺寸：撑大到内容外接尺寸、被钳制器收敛；自动扩容开关与固定画布拒绝。
import { describe, expect, test, vi } from "vitest";

import {
  createApplyCanvasBounds,
  createCanvasBoundsForAutoExpandedGraphContent,
  createCanvasBoundsForGraphContent,
  createRejectAutoCanvasExpansionForContent
} from "./appExtracted/appGraphMeasurementFactories";

describe("createCanvasBoundsForGraphContent", () => {
  function createScope(contentSize: { width: number; height: number }) {
    return {
      MOVE_BOUNDARY_GUARD: 40,
      nodes: [],
      edges: [],
      routedEdges: [],
      calculateModelContentSize: vi.fn(() => contentSize),
      clampCanvasBounds: vi.fn((b: any) => b)
    };
  }

  test("内容比画布大时取内容尺寸", () => {
    const scope = createScope({ width: 900, height: 800 });

    expect(createCanvasBoundsForGraphContent(scope)({ width: 100, height: 100 })).toEqual({ width: 900, height: 800 });
  });

  test("内容比画布小时保持原尺寸", () => {
    const scope = createScope({ width: 50, height: 50 });

    expect(createCanvasBoundsForGraphContent(scope)({ width: 100, height: 100 })).toEqual({ width: 100, height: 100 });
  });

  test("未显式传内容时用 scope 里的全量图并套默认 padding", () => {
    const nodes = [{ id: "n" }];
    const scope = createScope({ width: 10, height: 10 });
    scope.nodes = nodes;

    createCanvasBoundsForGraphContent(scope)({ width: 1, height: 1 });

    expect(scope.calculateModelContentSize).toHaveBeenCalledWith(nodes, [], [], 40);
  });

  test("显式传入的内容与 padding 覆盖默认", () => {
    const nodes = [{ id: "n" }];
    const routes = [{ points: [] }];
    const scope = createScope({ width: 10, height: 10 });

    createCanvasBoundsForGraphContent(scope)({ width: 1, height: 1 }, nodes, [], routes, 5);

    expect(scope.calculateModelContentSize).toHaveBeenCalledWith(nodes, [], routes, 5);
  });

  test("结果经 clampCanvasBounds 过一道", () => {
    const scope = createScope({ width: 10, height: 10 });

    createCanvasBoundsForGraphContent(scope)({ width: 1, height: 1 });

    expect(scope.clampCanvasBounds).toHaveBeenCalledWith({ width: 10, height: 10 });
  });
});

describe("createApplyCanvasBounds", () => {
  function createScope(meaningful = true) {
    // setViewBox 接收函数式更新，桩要真的把它作用在某个 viewBox 上，否则换算函数永远不被调用
    let viewBox: any = { x: 0, y: 0, width: 100, height: 100 };
    const setViewBox = vi.fn((updater: (current: any) => any) => {
      viewBox = updater(viewBox);
    });
    const scope: Record<string, any> = {
      canvasBoundsRef: { current: { width: 100, height: 100 } },
      clampCanvasBounds: vi.fn((b: any) => b),
      canvasBoundsChangeIsMeaningful: vi.fn(() => meaningful),
      markCanvasBoundsScrollSyncPending: vi.fn(),
      setCanvasWidth: vi.fn(),
      setCanvasHeight: vi.fn(),
      setCanvasSizeDraft: vi.fn(),
      setViewBox,
      viewBoxAfterCanvasBoundsChange: vi.fn((current: any) => ({ ...current, touched: true }))
    };
    scope.applyCanvasBounds = createApplyCanvasBounds(scope);
    return { scope, setViewBox };
  }

  test("有意义的变更写回尺寸、草稿与 viewBox 并返回 true", () => {
    const { scope } = createScope();

    expect(scope.applyCanvasBounds({ width: 200, height: 300 })).toBe(true);
    expect(scope.canvasBoundsRef.current).toEqual({ width: 200, height: 300 });
    expect(scope.setCanvasWidth).toHaveBeenCalledWith(200);
    expect(scope.setCanvasHeight).toHaveBeenCalledWith(300);
    expect(scope.setCanvasSizeDraft).toHaveBeenCalledWith({ width: "200", height: "300" });
    expect(scope.setViewBox).toHaveBeenCalled();
  });

  test("无意义的变更整段短路，返回 false 且不动 ref", () => {
    const { scope } = createScope(false);
    const before = scope.canvasBoundsRef.current;

    expect(scope.applyCanvasBounds({ width: 200, height: 300 })).toBe(false);
    expect(scope.canvasBoundsRef.current).toBe(before);
    expect(scope.setCanvasWidth).not.toHaveBeenCalled();
  });

  test("默认会标脏滚动同步", () => {
    const { scope } = createScope();

    scope.applyCanvasBounds({ width: 200, height: 300 });

    expect(scope.markCanvasBoundsScrollSyncPending).toHaveBeenCalled();
  });

  test("preserveScrollAnchor:false 时不标脏", () => {
    const { scope } = createScope();

    scope.applyCanvasBounds({ width: 200, height: 300 }, { x: 0, y: 0 }, { preserveScrollAnchor: false });

    expect(scope.markCanvasBoundsScrollSyncPending).not.toHaveBeenCalled();
  });

  test("原点位移被透传给 viewBox 换算，并带上变更前的尺寸", () => {
    const { scope } = createScope();
    const shift = { x: 10, y: 20 };

    scope.applyCanvasBounds({ width: 200, height: 300 }, shift);

    expect(scope.viewBoxAfterCanvasBoundsChange).toHaveBeenCalledWith(
      expect.anything(),
      { width: 200, height: 300 },
      shift,
      { width: 100, height: 100 }
    );
  });
});

describe("createRejectAutoCanvasExpansionForContent", () => {
  const nodes = [{ id: "n" }];

  function createScope(allow: boolean, fits: boolean) {
    const writeOperationLog = vi.fn();
    return {
      writeOperationLog,
      scope: {
        allowAutoExpandCanvas: allow,
        autoCanvasExpansionBlockedMessage: "内容超出画布",
        canvasBounds: { width: 100, height: 100 },
        graphContentFitsFixedCanvasBounds: vi.fn(() => fits),
        writeOperationLog
      }
    };
  }

  test("允许自动扩容时一律不拒绝", () => {
    const h = createScope(true, false);

    expect(createRejectAutoCanvasExpansionForContent(h.scope)(nodes)).toBe(false);
    expect(h.writeOperationLog).not.toHaveBeenCalled();
  });

  test("不允许扩容且内容放不下 → 拒绝并写操作日志", () => {
    const h = createScope(false, false);

    expect(createRejectAutoCanvasExpansionForContent(h.scope)(nodes)).toBe(true);
    expect(h.writeOperationLog).toHaveBeenCalledWith("内容超出画布");
  });

  test("不允许扩容但内容放得下 → 不拒绝", () => {
    const h = createScope(false, true);

    expect(createRejectAutoCanvasExpansionForContent(h.scope)(nodes)).toBe(false);
    expect(h.writeOperationLog).not.toHaveBeenCalled();
  });

  test("显式传入的 bounds 覆盖 scope 上的画布尺寸", () => {
    const h = createScope(false, true);
    const bounds = { width: 5, height: 5 };

    createRejectAutoCanvasExpansionForContent(h.scope)(nodes, [], [], bounds);

    expect(h.scope.graphContentFitsFixedCanvasBounds).toHaveBeenCalledWith(nodes, [], [], bounds);
  });
});

describe("createCanvasBoundsForAutoExpandedGraphContent", () => {
  function createScope(allow: boolean) {
    return {
      CANVAS_AUTO_EXPAND_PADDING: 80,
      allowAutoExpandCanvas: allow,
      nodes: [],
      edges: [],
      routedEdges: [],
      canvasBoundsForGraphContent: vi.fn((base: any) => ({ ...base, expanded: true }))
    };
  }

  test("允许扩容时委托给 canvasBoundsForGraphContent", () => {
    const scope = createScope(true);
    const base = { width: 10, height: 10 };

    expect(createCanvasBoundsForAutoExpandedGraphContent(scope)(base)).toEqual({ width: 10, height: 10, expanded: true });
  });

  test("不允许扩容时原样返回 base", () => {
    const scope = createScope(false);
    const base = { width: 10, height: 10 };

    expect(createCanvasBoundsForAutoExpandedGraphContent(scope)(base)).toBe(base);
    expect(scope.canvasBoundsForGraphContent).not.toHaveBeenCalled();
  });

  test("默认 padding 用 CANVAS_AUTO_EXPAND_PADDING", () => {
    const scope = createScope(true);
    const nodes = [{ id: "n" }];
    scope.nodes = nodes;

    createCanvasBoundsForAutoExpandedGraphContent(scope)({ width: 1, height: 1 });

    expect(scope.canvasBoundsForGraphContent).toHaveBeenCalledWith({ width: 1, height: 1 }, nodes, [], [], 80);
  });
});
