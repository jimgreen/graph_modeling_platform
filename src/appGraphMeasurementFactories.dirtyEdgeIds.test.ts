// 移动后脏边计算。两套算法按「边列表顺序是否变化」分叉：
//  顺序没变 → 逐位比对对象引用；
//  顺序变了 → 按 id 建表比对，并把「消失的边」也算脏（否则删边不会触发重算）。
import { describe, expect, test, vi } from "vitest";

import {
  createDirtyEdgeIdsAfterBulkMove,
  createDirtyEdgeIdsAfterMove,
  createDirtyEdgeIdsForMovedLocalRoutes,
  createEdgeListsHaveSameOrder,
  createEdgeReferenceDiffIds
} from "./appExtracted/appGraphMeasurementFactories";

const edge = (id: string, sourceId = "n1", targetId = "n2") => ({ id, sourceId, targetId });

function createScope() {
  const scope: Record<string, any> = {
    reuseSetOrCreate: (value: Iterable<string>) => (value instanceof Set ? value : new Set(value))
  };
  scope.edgeListsHaveSameOrder = createEdgeListsHaveSameOrder(scope);
  scope.edgeReferenceDiffIds = createEdgeReferenceDiffIds(scope);
  scope.dirtyEdgeIdsAfterMove = createDirtyEdgeIdsAfterMove(scope);
  scope.dirtyEdgeIdsForMovedLocalRoutes = createDirtyEdgeIdsForMovedLocalRoutes(scope);
  scope.dirtyEdgeIdsAfterBulkMove = createDirtyEdgeIdsAfterBulkMove(scope);
  return scope;
}

describe("createEdgeListsHaveSameOrder", () => {
  const same = createEdgeListsHaveSameOrder({});

  test("长度不同即不同序", () => {
    expect(same([edge("e1")], [edge("e1"), edge("e2")])).toBe(false);
  });

  test("同序同长为 true", () => {
    expect(same([edge("e1"), edge("e2")], [edge("e1"), edge("e2")])).toBe(true);
  });

  test("同长但 id 顺序不同为 false", () => {
    expect(same([edge("e1"), edge("e2")], [edge("e2"), edge("e1")])).toBe(false);
  });

  test("两个空列表为 true", () => {
    expect(same([], [])).toBe(true);
  });
});

describe("createEdgeReferenceDiffIds", () => {
  const diff = createScope().edgeReferenceDiffIds;

  test("同序时只报「对象被替换」的边", () => {
    const a = edge("e1");
    const b = edge("e2");
    const b2 = { ...b };

    expect([...diff([a, b], [a, b2])]).toEqual(["e2"]);
  });

  test("同序且完全没变时为空", () => {
    const a = edge("e1");

    expect(diff([a], [a]).size).toBe(0);
  });

  test("异序时按 id 比对：被替换的边算脏", () => {
    const a = edge("e1");
    const a2 = { ...a };

    expect([...diff([a], [a2])]).toEqual(["e1"]);
  });

  test("异序时消失的边也算脏（保留下来的边用同一对象，不算脏）", () => {
    const kept = edge("e1");
    expect([...diff([kept, edge("e2")], [kept])].sort()).toEqual(["e2"]);
  });

  test("异序时新增的边算脏（原有边用同一对象，不算脏）", () => {
    const kept = edge("e1");
    expect([...diff([kept], [kept, edge("e2")])]).toEqual(["e2"]);
  });
});

describe("createDirtyEdgeIdsAfterMove", () => {
  const scope = createScope();

  test("两端之一被移动的边算脏", () => {
    const previous = [edge("e1", "moved", "n2"), edge("e2", "n3", "n4")];

    expect([...scope.dirtyEdgeIdsAfterMove(previous, previous, ["moved"])]).toEqual(["e1"]);
  });

  test("引用发生变化的边即使没被移动也算脏", () => {
    const a = edge("e1", "n3", "n4");

    expect([...scope.dirtyEdgeIdsAfterMove([a], [{ ...a }], [])]).toEqual(["e1"]);
  });

  test("额外指定的边无条件算脏", () => {
    const a = edge("e1", "n3", "n4");

    expect([...scope.dirtyEdgeIdsAfterMove([a], [a], [], ["额外"])]).toEqual(["额外"]);
  });

  test("没动也没变时为空", () => {
    const a = edge("e1", "n3", "n4");

    expect(scope.dirtyEdgeIdsAfterMove([a], [a], ["moved"]).size).toBe(0);
  });
});

describe("createDirtyEdgeIdsForMovedLocalRoutes", () => {
  const build = createScope().dirtyEdgeIdsForMovedLocalRoutes;

  test("原有路由点的边与选中边合并", () => {
    const dirty = build(["选中"], { 原路由: [] });

    expect([...dirty].sort()).toEqual(["原路由", "选中"]);
  });

  test("两者都为空时返回空集合", () => {
    expect(build([], {}).size).toBe(0);
  });

  test("不给参数时用空默认值", () => {
    expect(createScope().dirtyEdgeIdsForMovedLocalRoutes().size).toBe(0);
  });
});

describe("createDirtyEdgeIdsAfterBulkMove", () => {
  const scope = createScope();

  test("缓存已平移的边（routeCachePatchedEdgeIds）时走新算法", () => {
    const a = edge("e1", "moved", "n2");
    const b = edge("e2", "moved", "n2");

    const result = scope.dirtyEdgeIdsAfterBulkMove([a, b], [a, b], ["moved"], ["e1"]);

    // e1 已被缓存平移过 → 不再算脏；e2 仍需重算
    expect([...result.dirtyIds]).toEqual(["e2"]);
    // 旧口径仍然把两条都算上，供日志对比
    expect(result.legacyDirtyCount).toBe(2);
  });

  test("无缓存平移时退回旧算法，计数等于集合大小", () => {
    const a = edge("e1", "moved", "n2");

    const result = scope.dirtyEdgeIdsAfterBulkMove([a], [a], ["moved"], []);

    expect([...result.dirtyIds]).toEqual(["e1"]);
    expect(result.legacyDirtyCount).toBe(1);
  });

  test("异序时按 id 差集算脏", () => {
    const a = edge("e1", "n3", "n4");
    const b = edge("e2", "n3", "n4");

    const result = scope.dirtyEdgeIdsAfterBulkMove([a, b], [b], [], []);

    expect([...result.dirtyIds].sort()).toEqual(["e1"]);
  });

  test("额外边无条件算脏（未被缓存平移覆盖时）", () => {
    const a = edge("e1", "n3", "n4");

    expect([...scope.dirtyEdgeIdsAfterBulkMove([a], [a], [], [], ["额外"]).dirtyIds]).toEqual(["额外"]);
  });

  test("已被缓存平移的边即使额外指定也不进 dirtyIds（只进旧计数）", () => {
    const a = edge("e1", "n3", "n4");

    const result = scope.dirtyEdgeIdsAfterBulkMove([a], [a], [], ["e1"], ["e1"]);

    expect(result.dirtyIds.size).toBe(0);
    expect(result.legacyDirtyCount).toBe(1);
  });

  test("集合运算走 reuseSetOrCreate（接受任意 Iterable）", () => {
    const reuseSetOrCreate = vi.fn((v: any) => new Set(v));
    const local: Record<string, any> = { reuseSetOrCreate };
    local.edgeListsHaveSameOrder = createEdgeListsHaveSameOrder(local);
    local.edgeReferenceDiffIds = createEdgeReferenceDiffIds(local);
    local.dirtyEdgeIdsAfterMove = createDirtyEdgeIdsAfterMove(local);
    const bulk = createDirtyEdgeIdsAfterBulkMove(local);

    bulk([], [], new Set(["n1"]), new Set<string>(), []);

    expect(reuseSetOrCreate).toHaveBeenCalled();
  });
});
