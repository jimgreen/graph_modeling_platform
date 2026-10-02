// 移动时哪些边要「同步」重算（拖拽过程中就更新），哪些可以推迟到松手。
// 判定是或关系：被选中 / 两端都动 / 有手工点 / 挨着被移动的母线 / 原本就有已存路由。
import { describe, expect, test, vi } from "vitest";

import {
  createMergeAdjustedCandidateEdges,
  createShouldAdjustEdgeSynchronouslyAfterMove,
  createSynchronousEdgeAdjustmentCandidates,
  createTerminalReconcileNodeScope
} from "./appExtracted/appSelectionDragFactories";

/** 取第 index 次调用的参数数组：vi.fn() 的元组推断挡不住下标取值，统一走这里。 */
const callArgs = (mock: any, index = 0): any[] => (mock.mock.calls[index] ?? []) as any[];


const edge = (id: string, sourceId: string, targetId: string, over: Record<string, any> = {}) => ({
  id,
  sourceId,
  targetId,
  ...over
});

function createScope(shouldAdjust?: (e: any) => boolean) {
  const scope: Record<string, any> = {
    reuseSetOrCreate: (value: Iterable<string>) => (value instanceof Set ? value : new Set(value)),
    MOVE_ROUTE_LOCAL_SEARCH_PADDING: 24,
    boundsForNodeSet: vi.fn(() => null),
    orderedNodesForIds: vi.fn((nodes: any[], ids: Iterable<string>) => {
      const idList = [...ids];
      return nodes.filter((n: any) => idList.includes(n.id) || idList.some((id: string) => id.startsWith(n.id)));
    }),
    queryNodeSpatialIndex: vi.fn(() => []),
    visibleNodeSpatialIndex: { sentinel: true }
  };
  scope.shouldAdjustEdgeSynchronouslyAfterMove = createShouldAdjustEdgeSynchronouslyAfterMove(scope);
  scope.synchronousEdgeAdjustmentCandidates = createSynchronousEdgeAdjustmentCandidates({
    ...scope,
    shouldAdjustEdgeSynchronouslyAfterMove: shouldAdjust ?? scope.shouldAdjustEdgeSynchronouslyAfterMove
  });
  return scope;
}

describe("createShouldAdjustEdgeSynchronouslyAfterMove", () => {
  const should = createScope().shouldAdjustEdgeSynchronouslyAfterMove;
  const none = new Set<string>();

  test("两端都被移动时同步重算", () => {
    expect(should(edge("e1", "n1", "n2"), new Set(["n1", "n2"]), none, none)).toBe(true);
  });

  test("只动一端时不同步", () => {
    expect(should(edge("e1", "n1", "n2"), new Set(["n1"]), none, none)).toBe(false);
  });

  test("被显式选中时同步", () => {
    expect(should(edge("e1", "n1", "n2"), none, new Set(["e1"]), none)).toBe(true);
  });

  test("有手工点时同步", () => {
    expect(should(edge("e1", "n1", "n2", { manualPoints: [{ x: 0, y: 0 }] }), none, none, none)).toBe(true);
  });

  test("空手工点数组不算", () => {
    expect(should(edge("e1", "n1", "n2", { manualPoints: [] }), none, none, none)).toBe(false);
  });

  test("端点是被移动的母线时同步", () => {
    expect(should(edge("e1", "b1", "n2"), none, none, new Set(["b1"]))).toBe(true);
  });

  test("目标端是被移动的母线时也同步", () => {
    expect(should(edge("e1", "n1", "b1"), none, none, new Set(["b1"]))).toBe(true);
  });

  test("原本就有已存路由时同步", () => {
    expect(should(edge("e1", "n1", "n2"), none, none, none, { e1: [{ x: 0, y: 0 }] })).toBe(true);
  });

  test("已存路由是空数组时不同步", () => {
    expect(should(edge("e1", "n1", "n2"), none, none, none, { e1: [] })).toBe(false);
  });

  test("什么都不满足时不同步", () => {
    expect(should(edge("e1", "n1", "n2"), new Set(["n9"]), none, new Set(["b9"]), {})).toBe(false);
  });
});

describe("createSynchronousEdgeAdjustmentCandidates", () => {
  test("按判定过滤候选边", () => {
    const scope = createScope();
    const candidates = [edge("e1", "n1", "n2"), edge("e2", "n2", "n3")];

    const result = scope.synchronousEdgeAdjustmentCandidates(candidates, ["n1", "n2"]);

    expect(result.map((e: any) => e.id)).toEqual(["e1"]);
  });

  test("没有移动节点时返回空数组", () => {
    const scope = createScope();

    expect(scope.synchronousEdgeAdjustmentCandidates([edge("e1", "n1", "n2")], [])).toEqual([]);
  });

  test("被移动的母线与已存路由也参与判定", () => {
    const scope = createScope();
    const candidates = [edge("e1", "b1", "n2")];

    expect(scope.synchronousEdgeAdjustmentCandidates(candidates, ["n1"], [], ["b1"]).map((e: any) => e.id)).toEqual(["e1"]);
    expect(scope.synchronousEdgeAdjustmentCandidates(candidates, ["n1"], [], [], { e1: [{ x: 0, y: 0 }] }).map((e: any) => e.id)).toEqual(["e1"]);
  });

  test("判定函数收到的是四个集合", () => {
    const shouldAdjust = vi.fn(() => true);
    const scope = createScope(shouldAdjust);

    scope.synchronousEdgeAdjustmentCandidates([edge("e1", "n1", "n2")], ["n1"], ["e1"], ["b1"], { e1: [] });

    expect(callArgs(shouldAdjust, 0)[1]).toEqual(new Set(["n1"]));
    expect(callArgs(shouldAdjust, 0)[2]).toEqual(new Set(["e1"]));
    expect(callArgs(shouldAdjust, 0)[3]).toEqual(new Set(["b1"]));
  });
});

describe("createMergeAdjustedCandidateEdges", () => {
  const merge = createMergeAdjustedCandidateEdges({});

  test("没有调整过的边时原样返回候选", () => {
    const candidates = [edge("e1", "n1", "n2")];

    expect(merge(candidates, [])).toBe(candidates);
  });

  test("调整过的边覆盖同 id 的原边", () => {
    const candidates = [edge("e1", "n1", "n2")];
    const adjusted = { ...edge("e1", "n1", "n2"), fixed: true };

    expect(merge(candidates, [adjusted])[0]).toBe(adjusted);
  });

  test("调整列表里有候选中不存在的边时被忽略", () => {
    const candidates = [edge("e1", "n1", "n2")];
    const adjusted = edge("e9", "n1", "n2");

    expect(merge(candidates, [adjusted])).toEqual(candidates);
  });

  test("调整结果与原边是同一对象时返回原数组引用", () => {
    const candidates = [edge("e1", "n1", "n2")];

    expect(merge(candidates, [candidates[0]])).toBe(candidates);
  });

  test("多个边一起调整时按候选顺序输出", () => {
    const candidates = [edge("e1", "n1", "n2"), edge("e2", "n2", "n3")];
    const adjusted = [{ ...candidates[1], fixed: true }, { ...candidates[0], fixed: true }];

    expect(merge(candidates, adjusted).map((e: any) => e.id)).toEqual(["e1", "e2"]);
  });
});

describe("createTerminalReconcileNodeScope", () => {
  function createReconcileScope(nearby: any[] = []): any {
    return {
      MOVE_ROUTE_LOCAL_SEARCH_PADDING: 24,
      boundsForNodeSet: vi.fn(() => ({ left: 0, top: 0, right: 10, bottom: 10 })),
      queryNodeSpatialIndex: vi.fn(() => nearby),
      visibleNodeSpatialIndex: { sentinel: true },
      orderedNodesForIds: vi.fn((nodes: any[], ids: Iterable<string>) => {
        const idList = [...ids];
        return nodes.filter((n: any) => idList.includes(n.id));
      })
    };
  }

  test("作用域至少含被移动的节点", () => {
    const previous = [edge("n1", "n1", "n1")];
    const scope = createReconcileScope();

    const result = createTerminalReconcileNodeScope(scope)(previous as any, previous as any, new Set(["n1"]));

    expect(result.previous).toEqual(previous);
  });

  test("前后两份节点分别按同一作用域求值", () => {
    const scope = createReconcileScope();
    const previous = [edge("n1", "n1", "n1")];
    const next = [edge("n1", "n1", "n1")];

    const result = createTerminalReconcileNodeScope(scope)(previous as any, next as any, new Set(["n1"]));

    expect(scope.orderedNodesForIds).toHaveBeenCalledTimes(2);
    expect(result.previous).toEqual(previous);
    expect(result.next).toEqual(next);
  });

  test("前后各查一次空间索引，把邻近节点并进作用域", () => {
    const near = [edge("n5", "n5", "n5")];
    const scope = createReconcileScope(near);

    createTerminalReconcileNodeScope(scope)([], [], new Set(["n1"]));

    expect(scope.queryNodeSpatialIndex).toHaveBeenCalledTimes(2);
    expect(callArgs(scope.queryNodeSpatialIndex, 0)[1]).toEqual({ left: 0, top: 0, right: 10, bottom: 10 });
  });

  test("算不出包围盒时跳过空间查询（但仍按移动集合求值）", () => {
    const scope = createReconcileScope();
    scope.boundsForNodeSet = vi.fn(() => null);
    const previous = [edge("n1", "n1", "n1")];

    expect(createTerminalReconcileNodeScope(scope)(previous as any, previous as any, new Set(["n1"])).previous).toEqual(previous);
    expect(scope.queryNodeSpatialIndex).not.toHaveBeenCalled();
  });

  test("padding 透传给包围盒计算", () => {
    const scope = createReconcileScope();

    createTerminalReconcileNodeScope(scope)([], [], new Set(["n1"]));

    expect(callArgs(scope.boundsForNodeSet, 0)[3]).toBe(24);
  });
});
