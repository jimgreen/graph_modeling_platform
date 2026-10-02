// 拖拽位移的边界收敛。三层，从便宜到贵：
//  ① 逐节点钳制（createBoundedDeltaForNodes）——便宜，��被后续钳制推翻；
//  ② 几何整体是否安全（createNearestBoundarySafeDelta）——不安全就在「安全落点 ↔ 请求位移」之间二分；
//  ③ 整条连线几何再兜一层（createBoundedDeltaForMoveGeometry / createNodeMoveGeometryInsideCanvas）。
// 二分的次数固定 12 轮：再多只是更精确，成本线性上升而收益已饱和。
import { describe, expect, test, vi } from "vitest";

import {
  createBoundedDeltaForMoveGeometry,
  createBoundedDeltaForMultiNodeInteractiveMove,
  createBoundedDeltaForNodes,
  createCanvasBoundsForMovedNodeDelta,
  createCommitSafeDeltaForDraggingState,
  createNearestBoundarySafeDelta
} from "./appExtracted/appCanvasInteractionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("createBoundedDeltaForNodes", () => {
  function createScope(clamp: (node: any, bounds: any, position: any) => any) {
    return {
      canvasBounds: { width: 100, height: 100 },
      nodes: [{ id: "n1" }, { id: "n2" }],
      orderedNodesForIds: vi.fn((_nodes: any, ids: Iterable<string>) => [...ids].map((id) => ({ id }))),
      clampNodePositionToExpandableBounds: vi.fn(clamp)
    };
  }

  test("无钳制需求时原样返回请求位移", () => {
    const scope = createScope((_n, _b, p) => p);
    const delta = createBoundedDeltaForNodes(scope)(["n1"], { n1: pt(0, 0) }, 10, 20);

    expect(delta).toEqual(pt(10, 20));
  });

  test("钳制后的位移反推回增量", () => {
    const scope = createScope((_n, _b, p) => ({ x: Math.min(p.x, 5), y: p.y }));
    const delta = createBoundedDeltaForNodes(scope)(["n1"], { n1: pt(0, 0) }, 10, 20);

    expect(delta).toEqual(pt(5, 20));
  });

  test("逐个节点收敛：后一个节点只会继续收紧，不会放宽", () => {
    const scope = createScope((_n, _b, p) => ({ x: Math.min(p.x, 5), y: p.y }));

    expect(createBoundedDeltaForNodes(scope)(["n1", "n2"], { n1: pt(0, 0), n2: pt(0, 0) }, 10, 0)).toEqual(pt(5, 0));
  });

  test("没有原始位置的节点被跳过，不影响结果", () => {
    const scope = createScope((_n, _b, p) => p);

    expect(createBoundedDeltaForNodes(scope)(["n1"], {}, 10, 20)).toEqual(pt(10, 20));
  });

  test("未选中的节点被跳过", () => {
    const scope = createScope((_n, _b, p) => p);
    const bounded = createBoundedDeltaForNodes(scope);

    bounded(["n1"], { n1: pt(0, 0), n2: pt(0, 0) }, 10, 20);

    expect(scope.clampNodePositionToExpandableBounds).toHaveBeenCalledTimes(1);
  });

  test("不传 bounds 时用画布尺寸", () => {
    const scope = createScope((_n, _b, p) => p);

    createBoundedDeltaForNodes(scope)(["n1"], { n1: pt(0, 0) }, 1, 1);

    expect(scope.clampNodePositionToExpandableBounds.mock.calls[0][1]).toEqual({ width: 100, height: 100 });
  });
});

describe("createBoundedDeltaForMultiNodeInteractiveMove", () => {
  function createScope(over: Record<string, any> = {}) {
    return {
      allowAutoExpandCanvas: false,
      canvasBounds: { width: 100, height: 100 },
      nodes: [],
      boundsForNodeSet: vi.fn(() => ({ left: 10, top: 20, right: 80, bottom: 60 })),
      clampNumber: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
      ...over
    };
  }

  test("允许自动扩容时不做任何收敛", () => {
    const scope = createScope({ allowAutoExpandCanvas: true });

    expect(createBoundedDeltaForMultiNodeInteractiveMove(scope)({ nodeIds: ["n1"] }, pt(999, 999))).toEqual(pt(999, 999));
  });

  test("固定画布下按节点集合包围盒收敛", () => {
    const scope = createScope();

    // 左可走 -10、右可走 100-80=20、上 -20、下 100-60=40
    expect(createBoundedDeltaForMultiNodeInteractiveMove(scope)({ nodeIds: ["n1"] }, pt(999, 999))).toEqual(pt(20, 40));
  });

  test("超出左/上边界时收到边界值", () => {
    const scope = createScope();

    expect(createBoundedDeltaForMultiNodeInteractiveMove(scope)({ nodeIds: ["n1"] }, pt(-999, -999))).toEqual(pt(-10, -20));
  });

  test("预览自带包围盒时优先用它", () => {
    const scope = createScope();
    const dragState = { nodeIds: ["n1"], overlayPreview: { bounds: { left: 0, top: 0, right: 10, bottom: 10 } } };

    expect(createBoundedDeltaForMultiNodeInteractiveMove(scope)(dragState as any, pt(999, 999))).toEqual(pt(90, 90));
    expect(scope.boundsForNodeSet).not.toHaveBeenCalled();
  });

  test("算不出包围盒时原样返回", () => {
    const scope = createScope({ boundsForNodeSet: vi.fn(() => null) });

    expect(createBoundedDeltaForMultiNodeInteractiveMove(scope)({ nodeIds: ["n1"] }, pt(50, 50))).toEqual(pt(50, 50));
  });

  test("包围盒本身比画布还宽（区间反向）时不收敛，避免夹反", () => {
    // left=0 → 可走 0；right=200 > 画布宽 100 → 上限 -100。区间反向就不夹
    const scope = createScope({ boundsForNodeSet: vi.fn(() => ({ left: 0, top: 0, right: 200, bottom: 200 })) });

    expect(createBoundedDeltaForMultiNodeInteractiveMove(scope)({ nodeIds: ["n1"] }, pt(999, 999))).toEqual(pt(999, 999));
  });
});

describe("createNearestBoundarySafeDelta", () => {
  const build = createNearestBoundarySafeDelta({});

  test("请求位移本身安全时原样返回", () => {
    expect(build(pt(10, 10), () => true, pt(0, 0))).toEqual(pt(10, 10));
  });

  test("请求不安全、落点安全时走二分逼近", () => {
    // 只接受 x ≤ 5 的位移
    const isSafe = (d: any) => d.x <= 5;
    const result = build(pt(100, 0), isSafe, pt(0, 0));

    expect(result.x).toBe(5);
  });

  test("二分结果取整", () => {
    const isSafe = (d: any) => d.x <= 5.4;
    const result = build(pt(100, 0), isSafe, pt(0, 0));

    expect(Number.isInteger(result.x)).toBe(true);
  });

  test("落点也不安全时直接返回零位移", () => {
    expect(build(pt(100, 100), () => false, pt(50, 50))).toEqual(pt(0, 0));
  });

  test("不给落点时按零位移起算", () => {
    const isSafe = (d: any) => d.x <= 5;

    expect(build(pt(100, 0), isSafe)).toEqual(pt(5, 0));
  });

  test("只有请求位移不安全但落点安全到原地时返回原地", () => {
    const isSafe = (d: any) => d.x === 0;

    expect(build(pt(100, 100), isSafe, pt(0, 0))).toEqual(pt(0, 0));
  });
});

describe("createBoundedDeltaForMoveGeometry", () => {
  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      canvasBounds: { width: 100, height: 100 },
      boundedDeltaForNodes: vi.fn(() => pt(10, 10)),
      nodeMoveGeometryInsideCanvas: vi.fn(() => true),
      nearestBoundarySafeDelta: createNearestBoundarySafeDelta({}),
      ...over
    };
    scope.boundedDeltaForMoveGeometry = createBoundedDeltaForMoveGeometry(scope);
    return scope;
  }

  test("先逐节点钳制，再过几何安全检查", () => {
    const scope = createScope();

    const result = scope.boundedDeltaForMoveGeometry(["n1"], [], [], { n1: pt(0, 0) }, {}, {}, 10, 10);

    expect(scope.boundedDeltaForNodes).toHaveBeenCalledWith(["n1"], { n1: pt(0, 0) }, 10, 10, { width: 100, height: 100 });
    expect(result).toEqual(pt(10, 10));
  });

  test("几何检查不通过时进一步二分收敛（两个轴一起收敛）", () => {
    // 判据只看 x，但二分同时推进 x/y，故 y 也被带到同一个比例
    const scope = createScope({ nodeMoveGeometryInsideCanvas: vi.fn((_a: any, _b: any, _c: any, _d: any, _e: any, _f: any, delta: any) => delta.x <= 4) });

    expect(scope.boundedDeltaForMoveGeometry(["n1"], [], [], { n1: pt(0, 0) }, {}, {}, 10, 0)).toEqual(pt(4, 4));
  });

  test("显式回退位移被透传给二分", () => {
    const scope = createScope({ nodeMoveGeometryInsideCanvas: vi.fn(() => false) });

    const result = scope.boundedDeltaForMoveGeometry(["n1"], [], [], {}, {}, {}, 10, 0, pt(2, 0));

    expect(result).toEqual(pt(0, 0));
  });
});

describe("createCommitSafeDeltaForDraggingState", () => {
  function createScope(over: Record<string, any> = {}) {
    return {
      isMultiNodeMoveState: vi.fn(() => false),
      canvasBoundsForMoveDelta: vi.fn(() => ({ width: 50, height: 50 })),
      boundedDeltaForMoveGeometry: vi.fn(() => pt(3, 4)),
      ...over
    };
  }

  const dragState = {
    nodeIds: ["n1"],
    edgeIds: [],
    affectedEdges: [],
    originalPositions: { n1: pt(0, 0) },
    originalEdgePoints: {},
    originalRoutePoints: {},
    currentDelta: pt(10, 10)
  };

  test("单节点拖拽走安全收敛", () => {
    const scope = createScope();

    expect(createCommitSafeDeltaForDraggingState(scope)(dragState as any)).toEqual(pt(3, 4));
    expect(scope.boundedDeltaForMoveGeometry).toHaveBeenCalledWith(
      ["n1"],
      [],
      [],
      { n1: pt(0, 0) },
      {},
      {},
      10,
      10,
      pt(10, 10),
      { width: 50, height: 50 }
    );
  });

  test("没有当前位移时原样返回（不收敛）", () => {
    const scope = createScope();

    expect(createCommitSafeDeltaForDraggingState(scope)({ ...dragState, currentDelta: null } as any)).toBeNull();
    expect(scope.boundedDeltaForMoveGeometry).not.toHaveBeenCalled();
  });

  test("多节点拖拽走各自的快路径，直接返回当前位移", () => {
    const scope = createScope({ isMultiNodeMoveState: vi.fn(() => true) });

    expect(createCommitSafeDeltaForDraggingState(scope)(dragState as any)).toEqual(pt(10, 10));
    expect(scope.boundedDeltaForMoveGeometry).not.toHaveBeenCalled();
  });
});

describe("createCanvasBoundsForMovedNodeDelta", () => {
  function createScope(over: Record<string, any> = {}) {
    return {
      CANVAS_AUTO_EXPAND_PADDING: 80,
      allowAutoExpandCanvas: true,
      canvasBounds: { width: 100, height: 100 },
      nodeById: new Map([["n1", { id: "n1" }]]),
      canvasBoundsForGraphContent: vi.fn((base: any) => ({ ...base, expanded: true })),
      ...over
    };
  }

  test("不移动任何节点时返回当前画布", () => {
    const scope = createScope();

    expect(createCanvasBoundsForMovedNodeDelta(scope)([], {}, 0, 0)).toEqual({ width: 100, height: 100 });
    expect(scope.canvasBoundsForGraphContent).not.toHaveBeenCalled();
  });

  test("不允许自动扩容时返回当前画布", () => {
    const scope = createScope({ allowAutoExpandCanvas: false });

    expect(createCanvasBoundsForMovedNodeDelta(scope)(["n1"], { n1: pt(0, 0) }, 5, 5)).toEqual({ width: 100, height: 100 });
  });

  test("按移动后的位置撑开画布", () => {
    const scope = createScope();

    expect(createCanvasBoundsForMovedNodeDelta(scope)(["n1"], { n1: pt(0, 0) }, 500, 0)).toEqual({ width: 100, height: 100, expanded: true });
  });

  test("移动后位置取整", () => {
    const scope = createScope();

    createCanvasBoundsForMovedNodeDelta(scope)(["n1"], { n1: pt(0, 0) }, 5.6, 0);

    expect(scope.canvasBoundsForGraphContent.mock.calls[0][1][0].position).toEqual(pt(6, 0));
  });

  test("重复 id 只算一次", () => {
    const scope = createScope();

    createCanvasBoundsForMovedNodeDelta(scope)(["n1", "n1"], { n1: pt(0, 0) }, 5, 0);

    expect(scope.canvasBoundsForGraphContent.mock.calls[0][1]).toHaveLength(1);
  });

  test("节点或原始位置缺失时该节点被跳过", () => {
    const scope = createScope();

    expect(createCanvasBoundsForMovedNodeDelta(scope)(["n1"], {}, 5, 0)).toEqual({ width: 100, height: 100 });
  });

  test("透传自动扩容 padding", () => {
    const scope = createScope();

    createCanvasBoundsForMovedNodeDelta(scope)(["n1"], { n1: pt(0, 0) }, 5, 0);

    expect(scope.canvasBoundsForGraphContent.mock.calls[0][4]).toBe(80);
  });
});
