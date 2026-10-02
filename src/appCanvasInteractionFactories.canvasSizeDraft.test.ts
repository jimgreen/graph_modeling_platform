// 画布尺寸：直接改尺寸 与 从输入框草稿提交。
// 草稿提交的核心是「不能把图上已有内容裁掉」——按新尺寸现算一遍路由，
// 取「当前内容尺寸」与「新尺寸下内容尺寸」的较大者，再落到输入框上。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createCommitCanvasSizeDraft,
  createResetCanvasSizeDraft,
  createUpdateCanvasSize
} from "./appExtracted/appCanvasInteractionFactories";

const clamp = (value: number, min: number, max: number, fallback: number) => {
  const number = Number.isFinite(value) ? value : fallback;
  return Math.min(Math.max(number, min), max);
};

describe("createUpdateCanvasSize", () => {
  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      DEFAULT_CANVAS_WIDTH: 800,
      DEFAULT_CANVAS_HEIGHT: 600,
      MIN_CANVAS_WIDTH: 100,
      MIN_CANVAS_HEIGHT: 100,
      MAX_CANVAS_WIDTH: 5000,
      MAX_CANVAS_HEIGHT: 5000,
      canvasBoundsRef: { current: { width: 800, height: 600 } },
      clampCanvasDimension: clamp,
      canvasBoundsChangeIsMeaningful: vi.fn(() => true),
      requireEditMode: vi.fn(() => true),
      pushUndoSnapshot: vi.fn(),
      applyCanvasBounds: vi.fn(),
      nodes: [{ id: "n1" }],
      edges: [{ id: "e1" }],
      clampNodePositionToBounds: vi.fn((node: any, _b: any) => ({ x: node.position?.x ?? 0, y: node.position?.y ?? 0, clamped: true })),
      clampEdgeGeometryToBounds: vi.fn((edge: any) => ({ ...edge, clamped: true })),
      setGraphArrays: vi.fn(),
      ...over
    };
    scope.updateCanvasSize = createUpdateCanvasSize(scope);
    return scope;
  }

  test("尺寸夹到上下限后应用", () => {
    const scope = createScope();

    scope.updateCanvasSize(50, 99999);

    expect(scope.applyCanvasBounds).toHaveBeenCalledWith({ width: 100, height: 5000 });
  });

  test("非数值落回默认尺寸", () => {
    const scope = createScope();

    scope.updateCanvasSize(NaN, NaN);

    expect(scope.applyCanvasBounds).toHaveBeenCalledWith({ width: 800, height: 600 });
  });

  test("只读模式下什么都不做", () => {
    const scope = createScope({ requireEditMode: vi.fn(() => false) });

    scope.updateCanvasSize(300, 300);

    expect(scope.applyCanvasBounds).not.toHaveBeenCalled();
    expect(scope.pushUndoSnapshot).not.toHaveBeenCalled();
  });

  test("尺寸没变化时整段短路", () => {
    const scope = createScope({ canvasBoundsChangeIsMeaningful: vi.fn(() => false) });

    scope.updateCanvasSize(300, 300);

    expect(scope.applyCanvasBounds).not.toHaveBeenCalled();
    expect(scope.setGraphArrays).not.toHaveBeenCalled();
  });

  test("提交前压一次撤销快照", () => {
    const scope = createScope();

    scope.updateCanvasSize(300, 300);

    expect(scope.pushUndoSnapshot).toHaveBeenCalledWith(true, false, undefined, "修改画布尺寸");
  });

  test("缩小画布时节点位置与连线几何一起被夹住", () => {
    const scope = createScope();

    scope.updateCanvasSize(300, 300);

    expect(scope.clampNodePositionToBounds).toHaveBeenCalled();
    expect(scope.clampEdgeGeometryToBounds).toHaveBeenCalled();
    // 节点只取钳制结果的 position，其余字段原样带出
    expect(scope.setGraphArrays.mock.calls[0][0][0]).toMatchObject({ id: "n1", position: { clamped: true } });
    expect(scope.setGraphArrays.mock.calls[0][1][0]).toMatchObject({ id: "e1", clamped: true });
  });

  test("夹取用的是新尺寸而不是旧尺寸", () => {
    const scope = createScope();

    scope.updateCanvasSize(300, 250);

    expect(scope.clampNodePositionToBounds.mock.calls[0][1]).toEqual({ width: 300, height: 250 });
  });
});

describe("createCommitCanvasSizeDraft", () => {
  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      MIN_CANVAS_WIDTH: 100,
      MIN_CANVAS_HEIGHT: 100,
      MAX_CANVAS_WIDTH: 5000,
      MAX_CANVAS_HEIGHT: 5000,
      canvasWidth: 800,
      canvasHeight: 600,
      canvasSizeDraft: { width: "", height: "" },
      clampCanvasDimension: clamp,
      calculateModelContentSize: vi.fn((_n: any, _e: any, routes: any[]) => ({ width: routes.length > 0 ? 900 : 200, height: 100 })),
      routeEdgesForStoredRendering: vi.fn(() => [{ id: "r1" }]),
      nodes: [],
      edges: [],
      routedEdges: [],
      setCanvasSizeDraft: vi.fn(),
      updateCanvasSize: vi.fn(),
      writeOperationLog: vi.fn(),
      ...over
    };
    scope.commitCanvasSizeDraft = createCommitCanvasSizeDraft(scope);
    return scope;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("空输入沿用当前画布尺寸", () => {
    const scope = createScope({ calculateModelContentSize: vi.fn(() => ({ width: 10, height: 10 })) });

    scope.commitCanvasSizeDraft({ width: "   ", height: "" });

    expect(scope.setCanvasSizeDraft).toHaveBeenCalledWith({ width: "800", height: "600" });
  });

  test("内容放不下时自动放大并提示", () => {
    const scope = createScope();
    vi.stubGlobal("showGlobalMessage", vi.fn());

    scope.commitCanvasSizeDraft({ width: "300", height: "300" });

    expect(scope.setCanvasSizeDraft).toHaveBeenCalledWith({ width: "900", height: "300" });
    expect(scope.writeOperationLog).toHaveBeenCalled();
  });

  test("内容放得下时按输入值提交", () => {
    const scope = createScope({ calculateModelContentSize: vi.fn(() => ({ width: 10, height: 10 })) });
    vi.stubGlobal("showGlobalMessage", vi.fn());

    scope.commitCanvasSizeDraft({ width: "1200", height: "900" });

    expect(scope.setCanvasSizeDraft).toHaveBeenCalledWith({ width: "1200", height: "900" });
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
  });

  test("提交后调用 updateCanvasSize", () => {
    const scope = createScope({ calculateModelContentSize: vi.fn(() => ({ width: 10, height: 10 })) });

    scope.commitCanvasSizeDraft({ width: "1200", height: "900" });

    expect(scope.updateCanvasSize).toHaveBeenCalledWith(1200, 900);
  });

  test("不传草稿时用 scope 上的当前草稿", () => {
    const scope = createScope({ canvasSizeDraft: { width: "1111", height: "777" } });

    scope.commitCanvasSizeDraft();

    expect(scope.updateCanvasSize).toHaveBeenCalledWith(1111, 777);
  });

  test("输入超上限时先夹到上限再谈内容", () => {
    const scope = createScope({ calculateModelContentSize: vi.fn(() => ({ width: 10, height: 10 })) });
    vi.stubGlobal("showGlobalMessage", vi.fn());

    scope.commitCanvasSizeDraft({ width: "99999", height: "99999" });

    expect(scope.updateCanvasSize).toHaveBeenCalledWith(5000, 5000);
  });

  test("内容所需的最小尺寸也会被夹到上限（不无限撑大）", () => {
    const scope = createScope({ calculateModelContentSize: vi.fn(() => ({ width: 99999, height: 10 })) });
    vi.stubGlobal("showGlobalMessage", vi.fn());

    scope.commitCanvasSizeDraft({ width: "300", height: "300" });

    expect(scope.updateCanvasSize).toHaveBeenCalledWith(5000, 300);
  });
});

describe("createResetCanvasSizeDraft", () => {
  test("按当前画布尺寸回填草稿", () => {
    const setCanvasSizeDraft = vi.fn();

    createResetCanvasSizeDraft({ canvasWidth: 800, canvasHeight: 600, setCanvasSizeDraft })();

    expect(setCanvasSizeDraft).toHaveBeenCalledWith({ width: "800", height: "600" });
  });
});
