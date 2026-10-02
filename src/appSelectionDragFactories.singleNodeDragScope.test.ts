// 单节点拖拽预览的作用域：相关边过多时只保留视口附近的，否则整层边都进预览会卡。
// 三条降级路径：① 有缓存直接用缓存；② 相关边没超上限就全要；
// ③ 超上限才按视口扫描，扫不到任何边时退回全量（宁可多画也不能一条不画）。
import { describe, expect, test, vi } from "vitest";

import {
  createSingleNodeDragEdgeTouchesBounds,
  createSingleNodeDragPreviewBounds,
  createSingleNodeDragScopedEdges
} from "./appExtracted/appSelectionDragFactories";

/** 取第 index 次调用的参数数组：vi.fn() 的元组推断挡不住下标取值，统一走这里。 */
const callArgs = (mock: any, index = 0): any[] => (mock.mock.calls[index] ?? []) as any[];


const pt = (x: number, y: number) => ({ x, y });
const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
const edge = (id: string, sourceId = "n1", targetId = "n2") => ({ id, sourceId, targetId });

describe("createSingleNodeDragScopedEdges", () => {
  function createScope(relevant: any[], viewportLocal: any[] = []) {
    return {
      CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT: 3,
      CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT: 2,
      singleNodeDragRelevantEdges: vi.fn(() => relevant),
      singleNodeDragPreviewBounds: vi.fn(() => box(0, 0, 100, 100)),
      singleNodeDragViewportLocalEdgesByScan: vi.fn(() => viewportLocal)
    };
  }

  const dragState = { nodeIds: ["n1"], originalRouteBounds: {} };

  test("有缓存时直接用缓存的 preview / snap 列表", () => {
    const scope = createScope([]);
    const previewEdges = [edge("p1")];
    const snapEdges = [edge("s1")];

    const result = createSingleNodeDragScopedEdges(scope)({ ...dragState, singleNodeDragCache: { previewEdges, snapEdges } } as any, pt(1, 1));

    expect(result).toEqual({ previewEdges, snapEdges });
    expect(scope.singleNodeDragRelevantEdges).not.toHaveBeenCalled();
  });

  test("相关边未超上限时全要，preview 与 snap 相同", () => {
    const relevant = [edge("e1"), edge("e2")];
    const scope = createScope(relevant);

    const result = createSingleNodeDragScopedEdges(scope)(dragState as any, pt(1, 1));

    expect(result).toEqual({ previewEdges: relevant, snapEdges: relevant });
    expect(scope.singleNodeDragViewportLocalEdgesByScan).not.toHaveBeenCalled();
  });

  test("相关边超过上限时按视口扫描并各自截断", () => {
    const relevant = [edge("e1"), edge("e2"), edge("e3"), edge("e4"), edge("e5")];
    const local = [edge("l1"), edge("l2"), edge("l3"), edge("l4")];
    const scope = createScope(relevant, local);

    const result = createSingleNodeDragScopedEdges(scope)(dragState as any, pt(1, 1));

    expect(result.previewEdges).toHaveLength(3);
    expect(result.snapEdges).toHaveLength(2);
  });

  test("扫描上限取 preview 与 snap 两个阈值的较大者", () => {
    const relevant = [edge("e1"), edge("e2"), edge("e3"), edge("e4")];
    const scope = createScope(relevant, []);

    createSingleNodeDragScopedEdges(scope)(dragState as any, pt(1, 1));

    expect(callArgs(scope.singleNodeDragViewportLocalEdgesByScan, 0)[4]).toBe(3);
  });

  test("视口扫描一条都没扫到时退回全量相关边", () => {
    const relevant = [edge("e1"), edge("e2"), edge("e3"), edge("e4")];
    const scope = createScope(relevant, []);

    const result = createSingleNodeDragScopedEdges(scope)(dragState as any, pt(1, 1));

    expect(result.previewEdges).toEqual(relevant.slice(0, 3));
    expect(result.snapEdges).toEqual(relevant.slice(0, 2));
  });

  test("只有相关边、没有边时返回空列表", () => {
    const result = createSingleNodeDragScopedEdges(createScope([]))(dragState as any, pt(1, 1));

    expect(result).toEqual({ previewEdges: [], snapEdges: [] });
  });
});

describe("createSingleNodeDragPreviewBounds", () => {
  function createScope(previewNode: any) {
    return {
      CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING: 16,
      renderViewportBounds: box(0, 0, 100, 100),
      expandRouteBox: vi.fn((b: any, padding: number) => ({
        left: b.left - padding,
        right: b.right + padding,
        top: b.top - padding,
        bottom: b.bottom + padding
      })),
      singleNodeDragPreviewNodeFor: vi.fn(() => previewNode),
      nodeHasUprightBoundsContent: vi.fn(() => true),
      nodeVisualInteractionBounds: vi.fn(() => box(200, 200, 240, 240)),
      mergeRenderViewportBounds: vi.fn((a: any, b: any) => ({
        left: Math.min(a.left, b.left),
        right: Math.max(a.right, b.right),
        top: Math.min(a.top, b.top),
        bottom: Math.max(a.bottom, b.bottom)
      }))
    };
  }

  test("基础视口按 padding 外扩后与节点包围盒合并", () => {
    const scope = createScope({ id: "n1", position: pt(220, 220) });

    const bounds = createSingleNodeDragPreviewBounds(scope)({ nodeIds: ["n1"] } as any, pt(1, 1));

    expect(bounds).toEqual({ left: -16, right: 240, top: -16, bottom: 240 });
  });

  test("没有可预览节点时只返回外扩后的视口", () => {
    const scope = createScope(undefined);

    expect(createSingleNodeDragPreviewBounds(scope)({ nodeIds: [] } as any, pt(1, 1))).toEqual(box(-16, -16, 116, 116));
  });

  test("padding 同时用于视口外扩与节点包围盒", () => {
    const scope = createScope({ id: "n1", position: pt(0, 0) });

    createSingleNodeDragPreviewBounds(scope)({ nodeIds: ["n1"] } as any, pt(0, 0));

    expect(scope.expandRouteBox).toHaveBeenCalledWith(box(0, 0, 100, 100), 16);
    expect(callArgs(scope.nodeVisualInteractionBounds, 0)[2]).toBe(16);
  });
});

describe("createSingleNodeDragEdgeTouchesBounds", () => {
  const bounds = box(0, 0, 100, 100);

  function createScope(previewById: Record<string, any>, intersects: (node: any, b: any) => boolean) {
    return {
      boxesOverlap: (a: any, b: any) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom),
      nodeIntersectsRenderViewport: vi.fn(intersects),
      singleNodeDragPreviewNodeFor: vi.fn((_d: any, nodeId: string) => previewById[nodeId])
    };
  }

  test("原路由包围盒与预览视口相交即为真", () => {
    const scope = createScope({}, () => false);
    const dragState = { nodeIds: ["n1"], originalRouteBounds: { e1: box(50, 50, 150, 150) } };

    expect(createSingleNodeDragEdgeTouchesBounds(scope)(dragState as any, edge("e1"), pt(0, 0), bounds)).toBe(true);
  });

  test("原路由包围盒不相交时看静止端点是否进入视口", () => {
    const scope = createScope({ n2: { id: "n2" } }, () => true);
    const dragState = { nodeIds: ["n1"], originalRouteBounds: {} };

    expect(createSingleNodeDragEdgeTouchesBounds(scope)(dragState as any, edge("e1", "n1", "n2"), pt(0, 0), bounds)).toBe(true);
  });

  test("源端在动时检查目标端（源端会跟着走，挡不住视口）", () => {
    const checked: string[] = [];
    const scope = createScope({ n1: { id: "n1" }, n2: { id: "n2" } }, (node: any) => {
      checked.push(node.id);
      return true;
    });
    const dragState = { nodeIds: ["n1", "n2"], originalRouteBounds: {} };

    expect(createSingleNodeDragEdgeTouchesBounds(scope)(dragState as any, edge("e1", "n1", "n2"), pt(0, 0), bounds)).toBe(true);
    expect(checked).toEqual(["n2"]);
  });

  test("两端都不在移动时没有静止端点，判否", () => {
    const scope = createScope({ n3: { id: "n3" } }, () => true);
    const dragState = { nodeIds: ["n9"], originalRouteBounds: {} };

    expect(createSingleNodeDragEdgeTouchesBounds(scope)(dragState as any, edge("e1", "n1", "n2"), pt(0, 0), bounds)).toBe(false);
  });

  test("只有目标端在移动时检查源端", () => {
    const checked: string[] = [];
    const scope = createScope({ n1: { id: "n1" } }, (node: any) => {
      checked.push(node.id);
      return true;
    });
    const dragState = { nodeIds: ["n2"], originalRouteBounds: {} };

    createSingleNodeDragEdgeTouchesBounds(scope)(dragState as any, edge("e1", "n1", "n2"), pt(0, 0), bounds);

    expect(checked).toEqual(["n1"]);
  });

  test("静止端点预览节点取不到时判否", () => {
    const scope = createScope({}, () => true);
    const dragState = { nodeIds: ["n1"], originalRouteBounds: {} };

    expect(createSingleNodeDragEdgeTouchesBounds(scope)(dragState as any, edge("e1", "n1", "n2"), pt(0, 0), bounds)).toBe(false);
  });
});
