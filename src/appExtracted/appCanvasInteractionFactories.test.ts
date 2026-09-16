// createMoveSelection(方向键单击 / 检查器改坐标)的容器接入:
// 该路径从 __appScope 解构了 30+ 个键,任何「解构遮蔽模块 import」都会在这里炸成
// `nodes.some(undefined)` 这类 TypeError —— 而 @ts-nocheck + audit:names 都拦不住,只能靠真跑一次。
import { describe, expect, test, vi } from "vitest";
import { createFinishNodeDrag, createMoveSelection, createPlaceLibraryDeviceAtPoint } from "./appCanvasInteractionFactories";
import { bareNode as sharedBareNode } from "./testFixtures";
import { DEVICE_LIBRARY_BY_KIND, createNodeFromTemplate } from "../model";

// 本文件按「本体包围盒」口径断言容器几何(成员包围盒 + CONTAINER_PADDING),故默认关掉标签
const bareNode = (id: string, kind: string, x: number, y: number, extra: Record<string, unknown> = {}) =>
  sharedBareNode(id, kind, x, y, { params: { _labelVisible: "0" }, ...extra });

describe("createMoveSelection 容器接入", () => {
  const container = bareNode("c1", "ac-vpp-box", 0, 0, { size: { width: 180, height: 112 } });
  const member = bareNode("m1", "ac-load", 0, 0, { containerId: "c1" });
  const nodes = [container, member];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const makeScope = () => {
    const commitFastMovedGraphPatches = vi.fn();
    return {
      activeSelectedEdgeIds: [],
      activeSelectedNodeIds: ["c1", "m1"],
      displaySelectedEdgeIds: [],
      displaySelectedNodeIds: [],
      canvasSelectionScope: "group",
      requireEditMode: () => true,
      movableCanvasNodeIds: (ids: string[]) => ids,
      nodes,
      nodeById,
      // 平台语义:更新 = 原节点 + 位移(成员位置变了,容器随后按成员重算)
      buildMovedNodeUpdates: (ids: string[], positions: Record<string, { x: number; y: number }>, delta: { x: number; y: number }) =>
        ids.flatMap((id) => {
          const node = nodeById.get(id);
          const origin = positions[id];
          return node && origin ? [{ ...node, position: { x: origin.x + delta.x, y: origin.y + delta.y } }] : [];
        }),
      mergeNodeUpdateLists: (base: any[], extra: any[]) => (extra.length > 0 ? [...base, ...extra] : base),
      edgeListForNodeIds: () => [],
      snapshotEdgePoints: () => ({}),
      routePointsSnapshotForMove: () => ({}),
      isWholeActiveLayerMove: () => false,
      canvasBoundsForMoveDelta: () => ({ width: 800, height: 400 }),
      boundedDeltaForNodes: (_ids: string[], _positions: unknown, dx: number, dy: number) => ({ x: dx, y: dy }),
      boundedDeltaForMoveGeometry: (_ids: string[], _edgeIds: unknown, _edges: unknown, _positions: unknown, _points: unknown, _routes: unknown, dx: number, dy: number) => ({ x: dx, y: dy }),
      applyCanvasBounds: vi.fn(),
      nextNodesForMovedGraphCommit: () => nodes,
      busNodeIdSet: new Set<string>(),
      synchronousEdgeAdjustmentCandidates: () => [],
      internalMoveEdgeIdsForMovedNodes: () => new Set<string>(),
      externalMoveCandidateEdges: () => [],
      routePreserveEdgeIdsForMovedNodes: () => new Set<string>(),
      mergeAdjustedCandidateEdges: (edges: unknown[]) => edges,
      translateInternalMoveCandidateEdges: () => [],
      translateWholeMoveCandidateEdges: () => [],
      adjustEdgesAfterNodeMove: (edges: unknown[]) => edges,
      shouldFinalizeMovedNodeEdgesSynchronously: () => false,
      finalizeMovedNodeEdgesFast: (edges: unknown[]) => edges,
      graphStore: {},
      pushUndoSnapshot: vi.fn(),
      undoScopeForGraphPatch: () => ({ nodeIds: [], edgeIds: [] }),
      updateSmartAlignmentGuides: vi.fn(),
      writeOperationLog: vi.fn(),
      commitFastMovedGraphPatches,
    };
  };

  test("方向键移动容器成员:不抛错,且容器重算并入同一次提交", () => {
    const scope = makeScope();
    expect(() => createMoveSelection(scope as any)(10, 0)).not.toThrow();
    expect(scope.commitFastMovedGraphPatches).toHaveBeenCalledTimes(1);
    const updates = scope.commitFastMovedGraphPatches.mock.calls[0][0] as any[];
    expect(updates.map((n) => n.id)).toContain("m1");
    expect(updates.map((n) => n.id)).toContain("c1"); // 容器几何(拖动集之外)一并提交
  });

  test("有容器时撤销作用域让位:pushUndoSnapshot 收到 undefined", () => {
    const scope = makeScope();
    createMoveSelection(scope as any)(10, 0);
    expect(scope.pushUndoSnapshot).toHaveBeenCalledWith(true, false, undefined, "移动设备", expect.any(String));
  });
});

// ─── 拖动落地的归属 toast 接线(createFinishNodeDrag) ─────────────────────────
// judge 只回报 enterContainerId / exitContainerId,是否弹、弹什么由本节验证。
// 归属变更只在 Alt 拖动下发生(Alt = 双向归属变更键);非 Alt 落入容器 = 排斥弹出,不弹 toast。
describe("拖动落地 toast 接线", () => {
  const makeDragScope = (nodes: any[], movedId: string, delta: { x: number; y: number }) => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const grabbed = [movedId];
    return {
      scope: {
        adjustEdgesAfterNodeMove: (edges: unknown[]) => edges,
        applyCanvasBounds: vi.fn(),
        applyNodeTerminalSnap: (d: any) => d,
        boundedDeltaForMoveGeometry: (_a: unknown, _b: unknown, _c: unknown, _d: unknown, _e: unknown, _f: unknown, dx: number, dy: number) => ({ x: dx, y: dy }),
        buildMovedNodeUpdates: (ids: string[], positions: Record<string, { x: number; y: number }>, d: { x: number; y: number }) =>
          ids.flatMap((id) => {
            const node = nodeById.get(id);
            const origin = positions[id];
            return node && origin ? [{ ...node, position: { x: origin.x + d.x, y: origin.y + d.y } }] : [];
          }),
        canvasBoundsForMoveDelta: () => ({ width: 800, height: 400 }),
        canvasInteractionRef: { current: false },
        clearNodeDragMoveSchedule: vi.fn(),
        commitFastMovedGraphPatches: vi.fn(),
        commitSafeDeltaForDraggingState: () => delta,
        dragDraggedEdgeIdSet: () => new Set<string>(),
        dragMovedBusNodeIdSet: () => new Set<string>(),
        dragMovedNodeIdSet: (state: any) => new Set<string>(state.nodeIds),
        dragUndoCapturedRef: { current: true },
        draggingRef: { current: { nodeIds: grabbed, grabbedNodeIds: grabbed, edgeIds: [], affectedEdges: [], originalPositions: { [movedId]: nodeById.get(movedId)!.position }, originalEdgePoints: {}, originalRoutePoints: {}, selection: null } },
        ensureDraggingUndoSnapshot: vi.fn(),
        externalMoveCandidateEdges: () => [],
        finalizeMovedNodeEdgesFast: (edges: unknown[]) => edges,
        findMultiNodeDragSnapTargetAtDelta: () => null,
        findSingleNodeDragSnapTargetAtDelta: () => null,
        flushPendingNodeDragMove: vi.fn(),
        graphStore: {},
        hideImperativeMultiNodeDragOverlay: vi.fn(),
        hideImperativeSingleNodeDragPreview: vi.fn(),
        internalMoveEdgeIdsForMovedNodes: () => new Set<string>(),
        isMultiNodeMoveState: () => false,
        mergeAdjustedCandidateEdges: (edges: unknown[]) => edges,
        mergeNodeUpdateLists: (base: any[], extra: any[]) => (extra.length > 0 ? [...base, ...extra] : base),
        nextNodesForMovedGraphCommit: () => nodes,
        nodeTerminalSnapTargetRef: { current: null },
        nodes,
        normalizeProjectMeasurements: (m: unknown) => m,
        projectListPointerInsideRef: { current: false },
        resetMultiNodeDragOverlayTransform: vi.fn(),
        restoreCanvasSelectionSnapshotWithInspector: vi.fn(),
        routePreserveEdgeIdsForMovedNodes: () => new Set<string>(),
        setDragging: vi.fn(),
        setProjectMeasurements: vi.fn(),
        shouldFinalizeMovedNodeEdgesSynchronously: () => false,
        showGlobalMessage: vi.fn(),
        synchronousEdgeAdjustmentCandidates: () => [],
        translateInternalMoveCandidateEdges: () => [],
        translateWholeMoveCandidateEdges: () => [],
        updateSmartAlignmentGuides: vi.fn(),
        writeOperationLog: vi.fn()
      }
    };
  };
  const container = () => bareNode("c1", "ac-vpp-box", 0, 0, { size: { width: 200, height: 200 } });

  test("Alt 拖出成员 → toast「已移出容器 <名称>」", () => {
    const member = bareNode("m1", "ac-load", 50, 50, { containerId: "c1" });
    const { scope } = makeDragScope([container(), member], "m1", { x: 300, y: 300 });
    createFinishNodeDrag(scope as any)(true);
    expect(scope.showGlobalMessage.mock.calls.map((call) => call[0])).toEqual(["已移出容器 c1"]);
  });

  test("Alt 拖出绑定设备 → 一条 toast 同时报「已移出容器」与解绑(globalMessage 单槽不叠弹)", () => {
    const gateway = {
      ...bareNode("c1", "ac-vpp-box", 0, 0, { size: { width: 200, height: 200 } }),
      params: { _labelVisible: "0", is_gateway: "1", bound_device_id: "m1" },
    };
    const bound = bareNode("m1", "ac-load", 50, 50, { containerId: "c1" });
    const { scope } = makeDragScope([gateway, bound], "m1", { x: 300, y: 300 });
    createFinishNodeDrag(scope as any)(true);
    expect(scope.showGlobalMessage.mock.calls.map((call) => call[0]))
      .toEqual(["已移出容器 c1，已解绑关口设备 m1，关口已关闭"]);
  });

  test("Alt 拖入成员 → toast「已移入容器 <名称>」(移入侧接线断言)", () => {
    const outsider = bareNode("o1", "ac-load", 300, 300);
    const { scope } = makeDragScope([container(), outsider], "o1", { x: -250, y: -250 });
    createFinishNodeDrag(scope as any)(true);
    expect(scope.showGlobalMessage.mock.calls.map((call) => call[0])).toEqual(["已移入容器 c1"]);
  });

  test("非 Alt 拖入 → 排斥:不弹 toast,提交里节点被弹回容器矩形外且不写归属", () => {
    const outsider = bareNode("o1", "ac-load", 300, 300);
    const { scope } = makeDragScope([container(), outsider], "o1", { x: -250, y: -250 }); // 松手落在 (50,50),容器内
    createFinishNodeDrag(scope as any)(false);
    expect(scope.showGlobalMessage).not.toHaveBeenCalled();
    const updates = scope.commitFastMovedGraphPatches.mock.calls[0][0] as any[];
    // 拖动更新在前、容器更新在后(同 id 后者胜):取最后一条才是落地位置
    const placed = [...updates].reverse().find((node: any) => node.id === "o1")!;
    expect(placed.containerId).toBeUndefined();
    // 容器矩形 [-100,100]²;口径 = 包围盒间距(不是中心):本体 [30,70]×[35,65] → 下移 115 最近,弹到间隙 50
    expect(placed.position).toEqual({ x: 50, y: 50 + 115 });
  });

  test("对照组:普通拖动(不进出容器)不弹 toast", () => {
    const outsider = bareNode("o1", "ac-load", 900, 900);
    const { scope } = makeDragScope([container(), outsider], "o1", { x: 10, y: 10 });
    createFinishNodeDrag(scope as any)(false);
    expect(scope.showGlobalMessage).not.toHaveBeenCalled();
  });
});

// 从图元库放置设备是「新增节点进图」的 UI 主路径(与 control.addDevice 同类):
// 落点在**已有**容器矩形内走与拖动同一出口 = 排斥弹回,不写归属。
describe("createPlaceLibraryDeviceAtPoint 容器接入", () => {
  const makePlaceScope = (nodes: any[]) => {
    const capture: { placed?: any[] } = {};
    return {
      capture,
      scope: {
        CANVAS_AUTO_EXPAND_PADDING: 40,
        activateInspectorFromCanvas: vi.fn(),
        activeLayerId: "default",
        applyCanvasBounds: vi.fn(),
        assignPermanentDeviceIndex: (node: any) => ({ node, counters: {} }),
        canvasBounds: { width: 1000, height: 800 },
        canvasBoundsForAutoExpandedGraphContent: () => ({ width: 1000, height: 800 }),
        canvasBoundsWithOriginShift: (bounds: any) => bounds,
        clampNodePositionToBounds: (_node: any, _bounds: any, position: any) => position,
        clampPointToBounds: (point: any) => point,
        createNodeFromTemplate,
        deviceIndexCounters: {},
        edges: [],
        hasCanvasOriginShift: () => false,
        isInteractiveStaticDrawingKind: () => false,
        isRoutableLineDeviceKind: () => false,
        isStaticBoxLikeTemplate: () => false,
        lastCanvasPointerRef: { current: null },
        lastRawCanvasPointerRef: { current: null },
        leftTopCanvasOriginShiftForContent: () => ({ x: 0, y: 0 }),
        markBusTerminalSyncDirtyForEdges: vi.fn(),
        modelType: "ac",
        nodes,
        pushRecentGlyph: (prev: any[]) => prev,
        pushUndoSnapshot: vi.fn(),
        rebuildRoutableLineDeviceRouteUpdates: () => [],
        rejectAutoCanvasExpansionForContent: () => false,
        requireEditMode: () => true,
        routeRoutableLineDevice: (node: any) => node,
        setCanvasSelectionScope: vi.fn(),
        setDeviceIndexCounters: vi.fn(),
        setGraphArrays: (nextNodes: any[]) => { capture.placed = nextNodes; },
        setLibraryPlacement: vi.fn(),
        setMode: vi.fn(),
        setRecentGlyphKinds: vi.fn(),
        setSelectedEdgeId: vi.fn(),
        setSelectedEdgeIds: vi.fn(),
        setSelectedNodeIds: vi.fn(),
        shiftCachedRoutesForCanvasOrigin: vi.fn(),
        startInteractiveStaticDrawing: vi.fn(),
        startLibraryDevicePlacement: vi.fn(),
        translateEdgeBy: (edge: any) => edge,
        translateNodeBy: (node: any) => node,
        translatePointBy: (point: any) => point,
        writeOperationLog: vi.fn()
      }
    };
  };

  test("落点在已有容器矩形内 → 排斥:弹回框外、不写归属(与拖动同口径)", () => {
    const container = bareNode("c1", "ac-vpp-box", 0, 0, { size: { width: 200, height: 200 } });
    const { scope, capture } = makePlaceScope([container]);

    createPlaceLibraryDeviceAtPoint(scope as any)(DEVICE_LIBRARY_BY_KIND.get("ac-load") as any, { x: 30, y: 30 });

    const placed = capture.placed!.find((node: any) => node.id !== "c1")!;
    expect(placed.containerId).toBeUndefined();
    // 容器无成员 → 收缩回最小尺寸;新图元被弹到最终矩形之外
    const nextContainer = capture.placed!.find((node: any) => node.id === "c1")!;
    expect(nextContainer.size).toEqual({ width: 180, height: 112 });
    const inside =
      Math.abs(placed.position.x - nextContainer.position.x) <= nextContainer.size.width / 2 &&
      Math.abs(placed.position.y - nextContainer.position.y) <= nextContainer.size.height / 2;
    expect(inside).toBe(false);
  });

  test("落点在容器外 → 不写归属;无容器时提交原样", () => {
    const container = bareNode("c1", "ac-vpp-box", 0, 0, { size: { width: 200, height: 200 } });
    const outside = makePlaceScope([container]);
    createPlaceLibraryDeviceAtPoint(outside.scope as any)(DEVICE_LIBRARY_BY_KIND.get("ac-load") as any, { x: 600, y: 600 });
    expect(outside.capture.placed!.find((node: any) => node.id !== "c1").containerId).toBeUndefined();
  });
});
