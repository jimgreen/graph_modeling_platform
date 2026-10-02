// 移动提交：节点更新构造、图补丁新鲜度校验、是否需要同步修复阻塞边、提交统计日志。
import { describe, expect, test, vi } from "vitest";

import {
  createBuildMovedNodeUpdates,
  createEdgeListsHaveSameOrder,
  createEdgePatchFromCandidateEdges,
  createGraphStorePatchStillCurrent,
  createLogBulkMoveCommitStats,
  createMarkGraphDirtyForInteractiveCommit,
  createNextNodesForMovedGraphCommit,
  createShouldRunSynchronousMoveBlockerRepair
} from "./appExtracted/appGraphMeasurementFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("createBuildMovedNodeUpdates", () => {
  function createScope(over: Record<string, any> = {}) {
    return {
      canvasBounds: { width: 1000, height: 800 },
      nodeById: new Map([
        ["n1", { id: "n1", kind: "ac-load", position: pt(0, 0) }],
        ["n2", { id: "n2", kind: "ac-load", position: pt(0, 0) }],
        ["n3", { id: "n3", kind: "ac-bus", position: pt(0, 0) }]
      ]),
      isCanvasNodeMovable: vi.fn((kind: string) => kind !== "ac-bus"),
      clampNodePositionToExpandableBounds: vi.fn((_n: any, _b: any, position: any) => position),
      ...over
    };
  }

  test("按原始位置加位移构造新位置", () => {
    const scope = createScope();

    const updates = createBuildMovedNodeUpdates(scope)(["n1"], { n1: pt(10, 20) }, pt(5, -5));

    expect(updates[0].position).toEqual(pt(15, 15));
  });

  test("不可移动的节点被跳过", () => {
    const scope = createScope();

    expect(createBuildMovedNodeUpdates(scope)(["n3"], { n3: pt(0, 0) }, pt(5, 5))).toEqual([]);
  });

  test("节点查不到或没有原始位置时跳过", () => {
    const scope = createScope();

    expect(createBuildMovedNodeUpdates(scope)(["查无此节点"], {}, pt(1, 1))).toEqual([]);
    expect(createBuildMovedNodeUpdates(scope)(["n1"], {}, pt(1, 1))).toEqual([]);
  });

  test("位置经可扩容钳制后才落库", () => {
    const scope = createScope({ clampNodePositionToExpandableBounds: vi.fn(() => pt(-3, -4)) });

    expect(createBuildMovedNodeUpdates(scope)(["n1"], { n1: pt(0, 0) }, pt(1, 1))[0].position).toEqual(pt(-3, -4));
  });

  test("不传 bounds 时用 scope 上的画布尺寸", () => {
    const scope = createScope();

    createBuildMovedNodeUpdates(scope)(["n1"], { n1: pt(0, 0) }, pt(1, 1));

    expect(scope.clampNodePositionToExpandableBounds).toHaveBeenCalledWith(
      scope.nodeById.get("n1"),
      { width: 1000, height: 800 },
      pt(1, 1)
    );
  });

  test("显式 bounds 覆盖默认", () => {
    const scope = createScope();
    const bounds = { width: 5, height: 5 };

    createBuildMovedNodeUpdates(scope)(["n1"], { n1: pt(0, 0) }, pt(1, 1), bounds);

    expect(scope.clampNodePositionToExpandableBounds.mock.calls[0][1]).toBe(bounds);
  });

  test("不改动原节点对象", () => {
    const scope = createScope();

    createBuildMovedNodeUpdates(scope)(["n1"], { n1: pt(0, 0) }, pt(9, 9));

    expect((scope.nodeById.get("n1") as any).position).toEqual(pt(0, 0));
  });
});

describe("createNextNodesForMovedGraphCommit", () => {
  const store = { nodes: [{}, {}, {}] } as any;

  function createScope() {
    return {
      reuseSetOrCreate: (value: Iterable<string>) => (value instanceof Set ? value : new Set(value)),
      overlayGraphStoreNodes: vi.fn((_s: any, updates: any[]) => [...store.nodes, ...updates])
    };
  }

  test("有移动且只更新了部分节点时直接用更新列表（快路径）", () => {
    const scope = createScope();

    expect(createNextNodesForMovedGraphCommit(scope)(store, [{}], ["n1"])).toEqual([{}]);
    expect(scope.overlayGraphStoreNodes).not.toHaveBeenCalled();
  });

  test("没移动任何节点时走全量覆盖", () => {
    const scope = createScope();

    createNextNodesForMovedGraphCommit(scope)(store, [], []);

    expect(scope.overlayGraphStoreNodes).toHaveBeenCalled();
  });

  test("更新数等于全量节点数时也走全量覆盖（快路径无收益）", () => {
    const scope = createScope();

    createNextNodesForMovedGraphCommit(scope)(store, [{}, {}, {}], ["n1"]);

    expect(scope.overlayGraphStoreNodes).toHaveBeenCalled();
  });
});

describe("createEdgePatchFromCandidateEdges", () => {
  const patch = createEdgePatchFromCandidateEdges({
    edgeListsHaveSameOrder: createEdgeListsHaveSameOrder({})
  });

  test("同序时只 upsert 被替换的边，删除列表为空", () => {
    const a = { id: "e1" };
    const b = { id: "e2" };
    const b2 = { ...b };

    expect(patch([a, b], [a, b2])).toEqual({ edgeUpserts: [b2], edgeDeleteIds: [] });
  });

  test("异序时删除消失的边", () => {
    const result = patch([{ id: "e1" }, { id: "e2" }], [{ id: "e1" }]);

    expect(result.edgeDeleteIds).toEqual(["e2"]);
  });

  test("异序时 upsert 新增与被替换的边", () => {
    const a = { id: "e1" };
    const result = patch([], [a]);

    expect(result.edgeUpserts).toEqual([a]);
  });

  test("两侧都空时得到空补丁", () => {
    expect(patch([], [])).toEqual({ edgeUpserts: [], edgeDeleteIds: [] });
  });
});

describe("createGraphStorePatchStillCurrent", () => {
  const a = { id: "e1" };
  const b = { id: "e2" };
  const n1 = { id: "n1" };

  const stillCurrent = createGraphStorePatchStillCurrent({});
  const store = { nodeMap: new Map([["n1", n1]]), edgeMap: new Map([["e1", a]]) } as any;

  test("补丁里的对象都还是 store 里那一份时为真", () => {
    expect(stillCurrent(store, [n1], [a], [])).toBe(true);
  });

  test("节点对象已被换掉时为假", () => {
    expect(stillCurrent(store, [{ ...n1 }], [], [])).toBe(false);
  });

  test("边对象已被换掉时为假", () => {
    expect(stillCurrent(store, [], [{ ...a }], [])).toBe(false);
  });

  test("待删的边其实还在 store 里时为假", () => {
    expect(stillCurrent(store, [], [], ["e1"])).toBe(false);
  });

  test("待删的边确实已不在 store 里时为真", () => {
    expect(stillCurrent(store, [], [], ["e2"])).toBe(true);
  });

  test("空补丁恒为真", () => {
    expect(stillCurrent(store, [], [], [])).toBe(true);
  });
});

describe("createShouldRunSynchronousMoveBlockerRepair", () => {
  const should = createShouldRunSynchronousMoveBlockerRepair({ MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES: 10 });
  const edges = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}` }));

  test("没移动任何节点时不修复", () => {
    expect(should([], edges, edges)).toBe(false);
  });

  test("多节点移动时总是同步修复", () => {
    expect(should(["n1", "n2"], edges, edges)).toBe(true);
  });

  test("候选边未超阈值时同步修复", () => {
    expect(should(["n1"], edges.slice(0, 5), edges.slice(0, 5))).toBe(true);
  });

  test("候选边超阈值且内容未变时推迟修复", () => {
    expect(should(["n1"], edges, edges)).toBe(false);
  });

  test("候选边超阈值但内容变了时同步修复", () => {
    const changed = edges.map((e, i) => (i === 0 ? { ...e } : e));

    expect(should(["n1"], edges, changed)).toBe(true);
  });
});

describe("createMarkGraphDirtyForInteractiveCommit", () => {
  test("抑制计数 +1，并置未保存与路由就绪", () => {
    const setHasUnsavedChanges = vi.fn();
    const setRouteRenderingReady = vi.fn();
    const scope = { setHasUnsavedChanges, setRouteRenderingReady, suppressNextGraphDirtyRef: { current: 3 } };

    createMarkGraphDirtyForInteractiveCommit(scope)();

    expect(scope.suppressNextGraphDirtyRef.current).toBe(4);
    expect(setHasUnsavedChanges).toHaveBeenCalledWith(true);
    expect(setRouteRenderingReady).toHaveBeenCalledWith(true);
  });
});

describe("createLogBulkMoveCommitStats", () => {
  const stats = (over: Record<string, any> = {}) => ({
    kind: "bulk",
    movedNodeCount: 2,
    candidateEdgeCount: 1,
    internalEdgeCount: 1,
    boundaryEdgeCount: 0,
    deferredRepairCandidateCount: 1,
    legacyDeferredRepairCandidateCount: 4,
    routeCachePatchedCount: 1,
    legacyRouteDirtyCount: 5,
    routeDirtyCount: 2,
    storedRouteDirtyCount: 1,
    routableLineUpdateCount: 0,
    durationMs: 1,
    bulkPlanMs: 0.1,
    canvasBoundsMs: 0.1,
    edgePatchMs: 0.1,
    dirtyMs: 0.1,
    markDirtyMs: 0.1,
    busSyncMs: 0.1,
    syncRepairMs: 0.1,
    routeCacheMs: 0.1,
    graphPatchMs: 0.1,
    ...over
  });

  const scope = { BULK_MOVE_PERF_LOG_THRESHOLD_MS: 16, CANVAS_BULK_MOVE_EDGE_THRESHOLD: 100 };

  test("又快又小：不打日志", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});

    createLogBulkMoveCommitStats(scope)(stats() as any);

    expect(table).not.toHaveBeenCalled();
    table.mockRestore();
  });

  test("耗时超阈值：打日志", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});

    createLogBulkMoveCommitStats(scope)(stats({ durationMs: 20 }) as any);

    expect(table).toHaveBeenCalledTimes(1);
    table.mockRestore();
  });

  test("边数超阈值：打日志", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});

    createLogBulkMoveCommitStats(scope)(stats({ candidateEdgeCount: 200 }) as any);

    expect(table).toHaveBeenCalledTimes(1);
    table.mockRestore();
  });

  test("新旧脏数之差即「省下多少」，且不会被算成负数", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});

    createLogBulkMoveCommitStats(scope)(stats({ durationMs: 20, legacyRouteDirtyCount: 1, routeDirtyCount: 5, legacyDeferredRepairCandidateCount: 9, deferredRepairCandidateCount: 1 }) as any);

    const row = table.mock.calls[0][0] as any;
    expect(row.savedRouteDirty).toBe(0);
    expect(row.savedDeferredRepairCandidates).toBe(8);
    table.mockRestore();
  });

  test("耗时按两位小数记录", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => {});

    createLogBulkMoveCommitStats(scope)(stats({ durationMs: 20.567 }) as any);

    expect((table.mock.calls[0][0] as any).totalMs).toBe(20.57);
    table.mockRestore();
  });
});
