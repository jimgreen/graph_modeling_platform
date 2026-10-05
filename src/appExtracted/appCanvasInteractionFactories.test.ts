// createMoveSelection(方向键单击 / 检查器改坐标)的容器接入:
// 该路径从 __appScope 解构了 30+ 个键,任何「解构遮蔽模块 import」都会在这里炸成
// `nodes.some(undefined)` 这类 TypeError —— 而 @ts-nocheck + audit:names 都拦不住,只能靠真跑一次。
import { describe, expect, test, vi } from "vitest";
import { createComputeSmartAlignmentGeometrySnap, createFinishNodeDrag, createMoveSelection, createPlaceLibraryDeviceAtPoint } from "./appCanvasInteractionFactories";
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

  // 松手吸附目标的查找按「是否多节点移动」分流:多节点走 findMultiNode…,单节点走 findSingleNode…
  test("多节点移动 → 只查多节点吸附目标(单节点查找器一次都不许被调)", () => {
    const node = bareNode("n1", "ac-load", 0, 0);
    const { scope } = makeDragScope([node], "n1", { x: 120, y: 80 });
    const findMultiNodeDragSnapTargetAtDelta = vi.fn(() => null);
    const findSingleNodeDragSnapTargetAtDelta = vi.fn(() => null);
    scope.isMultiNodeMoveState = () => true;
    scope.findMultiNodeDragSnapTargetAtDelta = findMultiNodeDragSnapTargetAtDelta;
    scope.findSingleNodeDragSnapTargetAtDelta = findSingleNodeDragSnapTargetAtDelta;
    createFinishNodeDrag(scope as any)(false);
    expect(findMultiNodeDragSnapTargetAtDelta).toHaveBeenCalledTimes(1);
    expect(findSingleNodeDragSnapTargetAtDelta).not.toHaveBeenCalled();
  });

  test("单节点移动 → 只查单节点吸附目标(上条的对照组,否则那条断言无鉴别力)", () => {
    const node = bareNode("n1", "ac-load", 0, 0);
    const { scope } = makeDragScope([node], "n1", { x: 120, y: 80 });
    const findMultiNodeDragSnapTargetAtDelta = vi.fn(() => null);
    const findSingleNodeDragSnapTargetAtDelta = vi.fn(() => null);
    scope.isMultiNodeMoveState = () => false;
    scope.findMultiNodeDragSnapTargetAtDelta = findMultiNodeDragSnapTargetAtDelta;
    scope.findSingleNodeDragSnapTargetAtDelta = findSingleNodeDragSnapTargetAtDelta;
    createFinishNodeDrag(scope as any)(false);
    expect(findSingleNodeDragSnapTargetAtDelta).toHaveBeenCalledTimes(1);
    expect(findMultiNodeDragSnapTargetAtDelta).not.toHaveBeenCalled();
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

// ─── createComputeSmartAlignmentGeometrySnap：可见视口选取 + 空候选早退 + 两轴 ?? 兜底 ──
// 这里的夹具刻意让 canvasVisibleViewBoxRef 与 viewBoxRef 取**完全不同**的值
// (11,22,300×400) vs (-1000,-2000,5000×6000):只有这样,检索窗坐标才分辨得出走了哪条臂。
describe("createComputeSmartAlignmentGeometrySnap 检索视口与轴向兜底", () => {
  const draggedBounds = { left: 0, right: 40, top: 0, bottom: 40 };
  const draggedAnchors = { x: [], y: [] } as any;
  // snapThreshold = SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE(6) / max(0.2, max(1,1)) = 6
  const TOLERANCE = 6;
  const candidate = { id: "c1", position: { x: 10, y: 20 } };

  const makeSnapScope = (overrides: Record<string, any> = {}) => {
    const scope: Record<string, any> = {
      SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE: 6,
      bestSmartAlignmentAxisSnap: vi.fn(() => null),
      canvasScrollScaleRef: { current: { x: 1, y: 1 } },
      // 可见视口有面积 → 走真值臂
      canvasVisibleViewBoxRef: { current: { x: 11, y: 22, width: 300, height: 400 } },
      isEditMode: true,
      nodeHasUprightBoundsContent: () => false,
      nodeSmartAlignmentBounds: (n: any) => ({
        left: n.position.x,
        right: n.position.x + 10,
        top: n.position.y,
        bottom: n.position.y + 10
      }),
      nodeTerminalOutflowSmartAlignmentAnchors: () => ({ x: [], y: [] }),
      queryNodeSpatialIndex: vi.fn(() => []),
      smartAlignmentEnabled: true,
      viewBoxRef: { current: { x: -1000, y: -2000, width: 5000, height: 6000 } },
      visibleNodeSpatialIndex: {},
      ...overrides
    };
    return scope;
  };

  test("可见视口有面积 → 两个检索窗都按可见视口裁剪(不是全量 viewBox)", () => {
    const scope = makeSnapScope();
    createComputeSmartAlignmentGeometrySnap(scope as any)(draggedBounds, draggedAnchors, new Set<string>());
    const queryNodeSpatialIndex = scope.queryNodeSpatialIndex;
    // 纵向检索窗:上下沿来自 visible.y / visible.y + visible.height
    expect(queryNodeSpatialIndex.mock.calls[0][1]).toEqual({
      left: draggedBounds.left - TOLERANCE,
      right: draggedBounds.right + TOLERANCE,
      top: 22,
      bottom: 22 + 400
    });
    // 横向检索窗:左右沿来自 visible.x / visible.x + visible.width
    expect(queryNodeSpatialIndex.mock.calls[1][1]).toEqual({
      left: 11,
      right: 11 + 300,
      top: draggedBounds.top - TOLERANCE,
      bottom: draggedBounds.bottom + TOLERANCE
    });
  });

  // 对照组:可见视口宽/高任一为 0 → 退回全量 viewBox(上一条只钉住了真值臂)。
  // 两个 case 分别对应 && 的左操作数与右操作数为假,少一个就有一条恒绿。
  test.each([
    ["可见视口宽度为 0", { x: 11, y: 22, width: 0, height: 400 }],
    ["可见视口高度为 0", { x: 11, y: 22, width: 300, height: 0 }]
  ])("%s → 两个检索窗退回全量 viewBox 的范围", (_label, current) => {
    const scope = makeSnapScope({ canvasVisibleViewBoxRef: { current } });
    createComputeSmartAlignmentGeometrySnap(scope as any)(draggedBounds, draggedAnchors, new Set<string>());
    const queryNodeSpatialIndex = scope.queryNodeSpatialIndex;
    expect(queryNodeSpatialIndex.mock.calls[0][1]).toEqual({
      left: draggedBounds.left - TOLERANCE,
      right: draggedBounds.right + TOLERANCE,
      top: -2000,
      bottom: -2000 + 6000
    });
    expect(queryNodeSpatialIndex.mock.calls[1][1]).toEqual({
      left: -1000,
      right: -1000 + 5000,
      top: draggedBounds.top - TOLERANCE,
      bottom: draggedBounds.bottom + TOLERANCE
    });
  });

  test("候选为空 → 不进入轴吸附计算,直接返回零调整", () => {
    const scope = makeSnapScope();
    const result: any = createComputeSmartAlignmentGeometrySnap(scope as any)(
      draggedBounds,
      draggedAnchors,
      new Set<string>()
    );
    expect(scope.bestSmartAlignmentAxisSnap).not.toHaveBeenCalled();
    expect(result).toEqual({ adjustment: { x: 0, y: 0 }, guides: [] });
  });

  test("对照组:候选非空时才会调用轴吸附(否则上面两条恒绿)", () => {
    const scope = makeSnapScope({ queryNodeSpatialIndex: vi.fn(() => [candidate]) });
    createComputeSmartAlignmentGeometrySnap(scope as any)(draggedBounds, draggedAnchors, new Set<string>());
    expect(scope.bestSmartAlignmentAxisSnap).toHaveBeenCalledTimes(2);
  });

  // 口径(SmartAlignmentAxisSnap.adjustment 是 number,见 appCoreCanvasUtilities 的类型声明):
  // bestSmartAlignmentAxisSnap(axis, …) 返回的是**该轴**的标量吸附量。本函数把 x 轴量装进
  // adjustment.x、y 轴量装进 adjustment.y,供 L847 / L3614 / L3772 三处 movementDelta ± adjustment 使用。
  // `?? 0` 右臂只在 xSnap / ySnap 为 nullish(可选链取到 undefined)时才求值。
  test("x 轴无命中(xSnap 为 null)→ adjustment.x 走 ?? 0 兜底,y 轴保留 y 轴标量量", () => {
    const yGuide = { orientation: "horizontal", id: "horizontal:c1:start:end" };
    const scope = makeSnapScope({
      queryNodeSpatialIndex: vi.fn(() => [candidate]),
      bestSmartAlignmentAxisSnap: vi.fn((axis: string) =>
        axis === "y" ? { adjustment: -33, distance: 2, priority: 1, guide: yGuide } : null
      )
    });
    const result: any = createComputeSmartAlignmentGeometrySnap(scope as any)(
      draggedBounds,
      draggedAnchors,
      new Set<string>()
    );
    expect(result.adjustment).toEqual({ x: 0, y: -33 });
    expect(result.guides).toEqual([yGuide]);
  });

  test("y 轴无命中(ySnap 为 null)→ adjustment.y 走 ?? 0 兜底,x 轴保留 x 轴标量量", () => {
    const xGuide = { orientation: "vertical", id: "vertical:c1:start:end" };
    const scope = makeSnapScope({
      queryNodeSpatialIndex: vi.fn(() => [candidate]),
      bestSmartAlignmentAxisSnap: vi.fn((axis: string) =>
        axis === "x" ? { adjustment: -19, distance: 4, priority: 1, guide: xGuide } : null
      )
    });
    const result: any = createComputeSmartAlignmentGeometrySnap(scope as any)(
      draggedBounds,
      draggedAnchors,
      new Set<string>()
    );
    expect(result.adjustment).toEqual({ x: -19, y: 0 });
    expect(result.guides).toEqual([xGuide]);
  });

  // 不串轴:两轴量取显著不同的值(x 轴 +7 / y 轴 −33)。写错槽位(如 x 槽去取 ySnap.adjustment)
  // 会立刻串成 −33 / +7,与本断言冲突。两轴同为 0 或同为某个值时这条断言没有鉴别力。
  test("两轴都命中 → x 槽拿 x 轴量、y 槽拿 y 轴量(不串轴)", () => {
    const xGuide = { orientation: "vertical", id: "vertical:c1:start:end" };
    const yGuide = { orientation: "horizontal", id: "horizontal:c1:start:end" };
    const scope = makeSnapScope({
      queryNodeSpatialIndex: vi.fn(() => [candidate]),
      bestSmartAlignmentAxisSnap: vi.fn((axis: string) =>
        axis === "x"
          ? { adjustment: 7, distance: 3, priority: 1, guide: xGuide }
          : { adjustment: -33, distance: 2, priority: 1, guide: yGuide }
      )
    });
    const result: any = createComputeSmartAlignmentGeometrySnap(scope as any)(
      draggedBounds,
      draggedAnchors,
      new Set<string>()
    );
    expect(result.adjustment).toEqual({ x: 7, y: -33 });
    expect(result.guides).toEqual([xGuide, yGuide]);
  });
});

// ─── createFinishNodeDrag：两条「提交前早退」(无拖动态 / 无有效位移) ──────────
describe("createFinishNodeDrag 提交前早退", () => {
  const makeDraggingState = () => {
    const nodeIds = ["n1"];
    return {
      nodeIds,
      grabbedNodeIds: nodeIds,
      edgeIds: [],
      affectedEdges: [],
      originalPositions: { n1: { x: 0, y: 0 } },
      originalEdgePoints: {},
      originalRoutePoints: {},
      selection: { nodeIds }
    };
  };

  // 早退块只用到前面那批键;但这批「越权续跑」用的键也必须给齐 ——
  // 否则「删掉零位移判定」这类变异会崩在 dragMovedNodeIdSet is not a function,
  // 变成一条指名不到契约的劣质 RED。给齐之后越权续跑会落到 L1303 的零位移早退块
  // (与 L1262 那块逐行相同),于是变异与断言的差异只剩「有没有建撤销快照」。
  const makeGuardScope = (dragging: any, delta: any) => ({
    applyNodeTerminalSnap: (d: any) => d,
    canvasInteractionRef: { current: false },
    clearNodeDragMoveSchedule: vi.fn(),
    commitSafeDeltaForDraggingState: vi.fn(() => delta),
    dragDraggedEdgeIdSet: () => new Set<string>(),
    dragMovedBusNodeIdSet: () => new Set<string>(),
    dragMovedNodeIdSet: (state: any) => new Set<string>(state.nodeIds),
    draggingRef: { current: dragging },
    ensureDraggingUndoSnapshot: vi.fn(),
    findSingleNodeDragSnapTargetAtDelta: () => null,
    flushPendingNodeDragMove: vi.fn(),
    hideImperativeMultiNodeDragOverlay: vi.fn(),
    hideImperativeSingleNodeDragPreview: vi.fn(),
    isMultiNodeMoveState: () => false,
    nodeTerminalSnapTargetRef: { current: null },
    projectListPointerInsideRef: { current: false },
    resetMultiNodeDragOverlayTransform: vi.fn(),
    restoreCanvasSelectionSnapshotWithInspector: vi.fn(),
    setDragging: vi.fn(),
    updateSmartAlignmentGuides: vi.fn(),
    writeOperationLog: vi.fn()
  });

  test("无拖动态 → flush 掉待处理位移后立即返回,不进提交流程", () => {
    const scope = makeGuardScope(null, { x: 5, y: 5 });
    // 这里吞掉异常是刻意的:守卫一旦被删,函数会在 null 拖动态上崩,
    // 但那处崩溃排在 commitSafeDeltaForDraggingState **之后**。把它吞掉,
    // 承重断言才能是指名得到的那条(这个探针到底被调了没),而不是一条 TypeError。
    // 探测输入(draggingRef.current = null)在整个窗口内始终有效,没被 setup 消掉。
    let thrown: unknown = null;
    try {
      createFinishNodeDrag(scope as any)();
    } catch (error) {
      thrown = error;
    }
    expect(scope.flushPendingNodeDragMove).toHaveBeenCalledWith(false);
    expect(scope.commitSafeDeltaForDraggingState).not.toHaveBeenCalled();
    expect(scope.ensureDraggingUndoSnapshot).not.toHaveBeenCalled();
    expect(scope.setDragging).not.toHaveBeenCalled();
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
    expect(thrown).toBeNull();
  });

  // 两条输入走的是同一段复位代码块(可观测行为一致),差别只在 || 的短路位置。
  // 实测分诊:去掉「零位移」那半截条件(3换条件)在第二行**转红**、第一行仍绿 ——
  // 机制是越权续跑会落到 L1303 那块逐行相同的零位移早退块,两者可观测差异只剩
  // 「有没有建撤销快照」,故承重断言是下面这条 ensureDraggingUndoSnapshot 未被调用。
  // 第一行(delta=null)对这条变异恒绿:`!delta` 已短路,零位移那半截根本没参与求值。
  test.each([
    ["安全位移为 null", null],
    ["位移为零", { x: 0, y: 0 }]
  ])("%s → 复位拖动态并早退,不建撤销快照", (_label, delta) => {
    const dragging = makeDraggingState();
    const scope = makeGuardScope(dragging, delta);
    createFinishNodeDrag(scope as any)();
    expect(scope.restoreCanvasSelectionSnapshotWithInspector).toHaveBeenCalledWith(dragging.selection);
    expect(scope.setDragging).toHaveBeenCalledWith(null);
    expect(scope.draggingRef.current).toBeNull();
    expect(scope.canvasInteractionRef.current).toBe(true);
    expect(scope.projectListPointerInsideRef.current).toBe(false);
    expect(scope.clearNodeDragMoveSchedule).toHaveBeenCalledTimes(1);
    expect(scope.ensureDraggingUndoSnapshot).not.toHaveBeenCalled();
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
  });

  // 吸附改写了位移 → L1289 真值臂把结果交给 boundedDeltaForMoveGeometry 夹回画布;
  // 本例把它夹成零位移,于是落到 L1303 的复位早退(与 L1262 那块逐行相同),不进提交。
  // 断言直接盯「夹取函数收到的是吸附后的位移,而不是原位移」——那是 L1289 唯一产出。
  test("吸附改写位移 → 夹取函数收到吸附后的坐标;夹回零位移后复位,不提交", () => {
    const dragging = makeDraggingState();
    const scope = makeGuardScope(dragging, { x: 40, y: 25 });
    const boundedDeltaForMoveGeometry = vi.fn((..._args: any[]) => ({ x: 0, y: 0 }));
    const canvasBoundsForMoveDelta = vi.fn((..._args: any[]) => ({ width: 800, height: 400 }));
    const commitFastMovedGraphPatches = vi.fn();
    Object.assign(scope, {
      applyNodeTerminalSnap: () => ({ x: 39, y: 25 }), // 只有 x 被吸附改写 → 走真值臂
      boundedDeltaForMoveGeometry,
      canvasBoundsForMoveDelta,
      commitFastMovedGraphPatches
    });

    createFinishNodeDrag(scope as any)();

    expect(scope.ensureDraggingUndoSnapshot).toHaveBeenCalledTimes(1); // 越过了 L1262
    expect(boundedDeltaForMoveGeometry).toHaveBeenCalledTimes(1);
    const call = boundedDeltaForMoveGeometry.mock.calls[0];
    expect(call[6]).toBe(39); // snappedDelta.x
    expect(call[7]).toBe(25); // snappedDelta.y
    expect(call[8]).toEqual({ x: 40, y: 25 }); // 第 9 个参数仍是原 delta
    expect(canvasBoundsForMoveDelta).toHaveBeenCalledWith(dragging.nodeIds, dragging.originalPositions, 39, 25);
    // 夹回零位移 → L1303 复位,提交与操作日志都不该发生
    expect(commitFastMovedGraphPatches).not.toHaveBeenCalled();
    expect(scope.setDragging).toHaveBeenCalledWith(null);
    expect(scope.draggingRef.current).toBeNull();
    expect(scope.writeOperationLog).not.toHaveBeenCalled();
  });

  // L1340:只有「存在同步候选边」才去算保路由边集合,否则直接 new Set()。
  // 空候选那一侧由既有用例「对照组:普通拖动」钉住(synchronousEdgeAdjustmentCandidates 返回 [])。
  // 哨兵异常抛在被测行**之后**(L1362),只为停下来观察 L1340 的产出。
  test("有同步候选边 → 走 routePreserveEdgeIdsForMovedNodes,拿到受影响边 + 拖动集", () => {
    const STOP = new Error("stop@1362");
    const dragging = { ...makeDraggingState(), affectedEdges: [{ id: "e1" }] };
    const scope = makeGuardScope(dragging, { x: 40, y: 25 });
    const routePreserveEdgeIdsForMovedNodes = vi.fn(() => new Set<string>(["e1"]));
    Object.assign(scope, {
      applyCanvasBounds: vi.fn(),
      buildMovedNodeUpdates: () => [],
      canvasBoundsForMoveDelta: () => ({ width: 800, height: 400 }),
      externalMoveCandidateEdges: () => [],
      graphStore: {},
      internalMoveEdgeIdsForMovedNodes: () => new Set<string>(),
      mergeAdjustedCandidateEdges: () => {
        throw STOP;
      },
      mergeNodeUpdateLists: (base: any[]) => base,
      nextNodesForMovedGraphCommit: () => [],
      nodes: [],
      routePreserveEdgeIdsForMovedNodes,
      synchronousEdgeAdjustmentCandidates: () => [{ id: "e1" }],
      translateInternalMoveCandidateEdges: (edges: unknown[]) => edges
    });

    expect(() => createFinishNodeDrag(scope as any)()).toThrow(STOP);
    expect(routePreserveEdgeIdsForMovedNodes).toHaveBeenCalledTimes(1);
    expect(routePreserveEdgeIdsForMovedNodes).toHaveBeenCalledWith(
      dragging.affectedEdges,
      new Set<string>(["n1"]),
      new Set<string>()
    );
  });
});
