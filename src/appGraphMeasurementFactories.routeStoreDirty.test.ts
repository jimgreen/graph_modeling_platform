// 路由脏标记：两个 pending 集合各自累积，代数只在「真的新增了 id」时 +1。
// 代数用于下游判断「有没有新脏」，空转调用不该推进它（否则每帧都触发重算）。
import { describe, expect, test, vi } from "vitest";

import {
  createMarkRouteEdgesDirty,
  createPatchStoredRouteStoreForEdgeIds,
  createMarkStoredRouteEdgesDirty
} from "./appExtracted/appGraphMeasurementFactories";

function createScope() {
  return {
    pendingRouteEdgeIdsRef: { current: new Set<string>() },
    pendingStoredRouteEdgeIdsRef: { current: new Set<string>() },
    routeDirtyGenerationRef: { current: 0 }
  };
}

describe("createMarkRouteEdgesDirty", () => {
  test("新增 id 并推进一代", () => {
    const scope = createScope();

    createMarkRouteEdgesDirty(scope)(["e1"]);

    expect([...scope.pendingRouteEdgeIdsRef.current]).toEqual(["e1"]);
    expect(scope.routeDirtyGenerationRef.current).toBe(1);
  });

  test("每次带非空 id 的调用都推进一代（Set.add 恒真，重复 id 也算）", () => {
    const scope = createScope();
    const mark = createMarkRouteEdgesDirty(scope);

    mark(["e1"]);
    mark(["e1"]);

    expect(scope.routeDirtyGenerationRef.current).toBe(2);
  });

  test("并入已有集合而不是覆盖", () => {
    const scope = createScope();
    const mark = createMarkRouteEdgesDirty(scope);

    mark(["e1"]);
    mark(["e2"]);

    expect([...scope.pendingRouteEdgeIdsRef.current].sort()).toEqual(["e1", "e2"]);
  });

  test("空串与 undefined 被忽略且不推进代数", () => {
    const scope = createScope();

    createMarkRouteEdgesDirty(scope)(["", undefined as any, null as any]);

    expect(scope.pendingRouteEdgeIdsRef.current.size).toBe(0);
    expect(scope.routeDirtyGenerationRef.current).toBe(0);
  });

  test("不碰已存的路由脏集合", () => {
    const scope = createScope();

    createMarkRouteEdgesDirty(scope)(["e1"]);

    expect(scope.pendingStoredRouteEdgeIdsRef.current.size).toBe(0);
  });

  test("接受任意 Iterable", () => {
    const scope = createScope();

    createMarkRouteEdgesDirty(scope)(new Set(["e1", "e2"]));

    expect(scope.pendingRouteEdgeIdsRef.current.size).toBe(2);
  });
});

describe("createMarkStoredRouteEdgesDirty", () => {
  test("写进已存路由脏集合并推进同一个代数", () => {
    const scope = createScope();

    createMarkStoredRouteEdgesDirty(scope)(["e1"]);

    expect([...scope.pendingStoredRouteEdgeIdsRef.current]).toEqual(["e1"]);
    expect(scope.routeDirtyGenerationRef.current).toBe(1);
  });

  test("与实时脏共用代数（两处都标则代数 +2）", () => {
    const scope = createScope();
    const markRoute = createMarkRouteEdgesDirty(scope);
    const markStored = createMarkStoredRouteEdgesDirty(scope);

    markRoute(["e1"]);
    markStored(["e2"]);

    expect(scope.routeDirtyGenerationRef.current).toBe(2);
  });

  test("空转不推进代数", () => {
    const scope = createScope();
    const mark = createMarkStoredRouteEdgesDirty(scope);

    mark([]);
    mark([undefined as any]);

    expect(scope.routeDirtyGenerationRef.current).toBe(0);
  });

  test("不碰实时路由脏集合", () => {
    const scope = createScope();

    createMarkStoredRouteEdgesDirty(scope)(["e1"]);

    expect(scope.pendingRouteEdgeIdsRef.current.size).toBe(0);
  });
});

describe("createPatchStoredRouteStoreForEdgeIds", () => {
  const route = (edgeId: string, points: any[] = [{ x: 0, y: 0 }]) => ({ edgeId, points });

  function createStore(routes: any[]) {
    return {
      routes,
      routeMap: new Map(routes.map((r) => [r.edgeId, r])),
      routeIndexById: new Map(routes.map((r, i) => [r.edgeId, i])),
      routeSpatialIndex: { hits: routes }
    };
  }

  function createScope(over: Record<string, any> = {}) {
    return {
      edgeById: new Map([["e1", { id: "e1", sourceId: "n1", targetId: "n2" }]]),
      visibleEdgeIdSet: new Set(["e1"]),
      routingNodesForConnectionEdge: vi.fn(() => []),
      routeEdgesForStoredRendering: vi.fn(() => [route("e1", [{ x: 5, y: 5 }])]),
      routeStorePatchRoutes: vi.fn((store: any, refreshed: any[], deleted: string[]) => ({
        ...store,
        routes: refreshed,
        deleted
      })),
      routeRenderBounds: vi.fn(() => ({ left: 0, right: 10, top: 0, bottom: 10 })),
      queryRouteSpatialIndex: vi.fn(() => []),
      refreshCrossingArcPaths: vi.fn((routes: any[]) => routes),
      editModeRouteRenderOptions: { keep: true },
      ...over
    };
  }

  test("store 为空 / 无脏边 / store 里没路由时返回 null", () => {
    const build = createPatchStoredRouteStoreForEdgeIds(createScope());
    expect(build(null, new Set(["e1"]), { width: 1, height: 1 }, [])).toBeNull();
    expect(build(createStore([route("e1")]), new Set(), { width: 1, height: 1 }, [])).toBeNull();
    expect(build(createStore([]), new Set(["e1"]), { width: 1, height: 1 }, [])).toBeNull();
  });

  test("重算后的路由经 patch 写回 store", () => {
    const scope = createScope();
    const store = createStore([route("e1", [{ x: 0, y: 0 }])]);

    const next = createPatchStoredRouteStoreForEdgeIds(scope)(store, new Set(["e1"]), { width: 100, height: 100 }, []);

    expect(scope.routeStorePatchRoutes).toHaveBeenCalled();
    expect(next.routes).toEqual([route("e1", [{ x: 5, y: 5 }])]);
  });

  test("边不可见时按删除处理", () => {
    const scope = createScope({ visibleEdgeIdSet: new Set<string>() });
    const store = createStore([route("e1")]);

    const next = createPatchStoredRouteStoreForEdgeIds(scope)(store, new Set(["e1"]), { width: 1, height: 1 }, []);

    expect(next.deleted).toEqual(["e1"]);
  });

  test("边查不到时按删除处理", () => {
    const scope = createScope({ edgeById: new Map() });
    const store = createStore([route("e1")]);

    const next = createPatchStoredRouteStoreForEdgeIds(scope)(store, new Set(["e1"]), { width: 1, height: 1 }, []);

    expect(next.deleted).toEqual(["e1"]);
  });

  test("路由算不出来时按删除处理", () => {
    const scope = createScope({ routeEdgesForStoredRendering: vi.fn(() => []) });
    const store = createStore([route("e1")]);

    expect(createPatchStoredRouteStoreForEdgeIds(scope)(store, new Set(["e1"]), { width: 1, height: 1 }, []).deleted).toEqual(["e1"]);
  });

  test("重算路由走的是该边自己的布线节点集合", () => {
    const scope = createScope();
    const nodes = [{ id: "n1" }];

    createPatchStoredRouteStoreForEdgeIds(scope)(createStore([route("e1")]), new Set(["e1"]), { width: 1, height: 1 }, nodes);

    expect(scope.routingNodesForConnectionEdge).toHaveBeenCalledWith(scope.edgeById.get("e1"), nodes);
  });

  test("重算后的路由按 store 内原下标排序（与传入的脏边顺序无关）", () => {
    const store = createStore([route("e2"), route("e1")]);
    const scope = createScope({
      edgeById: new Map([
        ["e1", { id: "e1", sourceId: "n1", targetId: "n2" }],
        ["e2", { id: "e2", sourceId: "n2", targetId: "n3" }]
      ]),
      visibleEdgeIdSet: new Set(["e1", "e2"]),
      routeEdgesForStoredRendering: vi.fn((_nodes: any, edges: any[]) => [route(edges[0].id, [{ x: 9, y: 9 }])]),
      refreshCrossingArcPaths: vi.fn((routes: any[]) => routes)
    });

    const next = createPatchStoredRouteStoreForEdgeIds(scope)(store, new Set(["e1", "e2"]), { width: 1, height: 1 }, []);

    // store 里 e2 在前，传入顺序是 e1 先 —— 输出必须按 store 下标
    expect(next.routes.map((r: any) => r.edgeId)).toEqual(["e2", "e1"]);
  });

  test("交叉弧重算拿到「本次局部路由」与「改动前的局部路由」两份", () => {
    const previous = route("e1", [{ x: 0, y: 0 }]);
    const store = createStore([previous]);
    const scope = createScope();

    createPatchStoredRouteStoreForEdgeIds(scope)(store, new Set(["e1"]), { width: 1, height: 1 }, []);

    const args = (scope.refreshCrossingArcPaths.mock.calls[0] ?? []) as any[];
    const changedIds = args[1] as Set<string>;
    const previousRoutes = args[2] as any[];
    expect([...changedIds]).toEqual(["e1"]);
    expect(previousRoutes).toEqual([previous]);
  });
});
