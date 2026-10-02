// createSynchronizePendingBusTerminalsWithGraphStore：把「待同步母线」收敛成一次最小作用域的同步。
// 关键契约：① 母线集合为空直接返回 null（不产生任何一次同步调用）；
// ② 只有作用域节点/边被 synchronizeBusTerminalsWithEdges 真正改过时才产出 updates/upserts；
// ③ 作用域内元素按 store 的下标顺序返回，不受 Set 插入顺序影响。
import { describe, expect, test, vi } from "vitest";

import { createSynchronizePendingBusTerminalsWithGraphStore } from "./appExtracted/appGraphMeasurementFactories";

const bus = (id: string) => ({ id, kind: "ac-bus" });
const dev = (id: string) => ({ id, kind: "ac-load" });
const edge = (id: string, sourceId: string, targetId: string) => ({ id, sourceId, targetId });

function createStore(options: { bounds?: Record<string, any>; neighbours?: any[] } = {}) {
  const nodes = [bus("bus1"), dev("dev1"), dev("dev2")];
  const edges = [edge("e1", "bus1", "dev1")];
  return {
    nodeMap: new Map(nodes.map((n) => [n.id, n])),
    edgeMap: new Map(edges.map((e) => [e.id, e])),
    edgesByNodeId: new Map([["bus1", edges]]),
    nodeIndexById: new Map(nodes.map((n, i) => [n.id, i])),
    edgeIndexById: new Map(edges.map((e, i) => [e.id, i])),
    nodeSpatialIndex: { nodeBoundsById: new Map(Object.entries(options.bounds ?? { bus1: { left: 0, right: 10, top: 0, bottom: 10 } })) },
    __options: options
  } as any;
}

function createScope(syncResult?: { nodes: any[]; edges: any[] }) {
  const synchronizeBusTerminalsWithEdges = vi.fn(() => syncResult ?? { nodes: [], edges: [] });
  return {
    synchronizeBusTerminalsWithEdges,
    scope: {
      isBusNode: (n: any) => n?.kind === "ac-bus",
      queryGraphStoreNodeSpatialIndex: vi.fn(() => []),
      synchronizeBusTerminalsWithEdges
    }
  };
}

describe("createSynchronizePendingBusTerminalsWithGraphStore", () => {
  test("母线集合为空时返回 null 且不同步", () => {
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    expect(sync(createStore(), new Set())).toBeNull();
    expect(h.synchronizeBusTerminalsWithEdges).not.toHaveBeenCalled();
  });

  test("母线 id 查不到节点时返回 null", () => {
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    expect(sync(createStore(), new Set(["查无此母线"]))).toBeNull();
  });

  test("命中的节点不是母线时返回 null", () => {
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    expect(sync(createStore(), new Set(["dev1"]))).toBeNull();
  });

  test("作用域包含母线本身与它的边两端", () => {
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    const result = sync(createStore(), new Set(["bus1"]))!;

    expect(result.scopedNodes.map((n: any) => n.id)).toEqual(["bus1", "dev1"]);
    expect(result.scopedEdges.map((e: any) => e.id)).toEqual(["e1"]);
  });

  test("同步未改动任何东西时 updates/upserts 为空", () => {
    const store = createStore();
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    const result = sync(store, new Set(["bus1"]))!;

    expect(result.nodeUpdates).toEqual([]);
    expect(result.edgeUpserts).toEqual([]);
  });

  test("同步换了节点对象时该节点进 nodeUpdates", () => {
    const store = createStore();
    const replaced = { id: "bus1", kind: "ac-bus", params: { terminals: [] } };
    const h = createScope({ nodes: [replaced, store.nodeMap.get("dev1")], edges: [] });
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    const result = sync(store, new Set(["bus1"]))!;

    expect(result.nodeUpdates).toEqual([replaced]);
  });

  test("有包围盒时按 padding 16 扩框查邻近节点", () => {
    const store = createStore();
    const h = createScope();
    h.scope.queryGraphStoreNodeSpatialIndex = vi.fn(() => [store.nodeMap.get("dev2")]);
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    const result = sync(store, new Set(["bus1"]))!;

    expect(h.scope.queryGraphStoreNodeSpatialIndex).toHaveBeenCalledWith(store, {
      left: -16,
      right: 26,
      top: -16,
      bottom: 26
    });
    expect(result.scopedNodes.map((n: any) => n.id)).toEqual(["bus1", "dev1", "dev2"]);
  });

  test("没有包围盒就不做空间查询", () => {
    const store = createStore({ bounds: {} });
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    sync(store, new Set(["bus1"]));

    expect(h.scope.queryGraphStoreNodeSpatialIndex).not.toHaveBeenCalled();
  });

  test("母线不接任何边时作用域只有母线自身", () => {
    const store = createStore();
    store.edgesByNodeId = new Map();
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    const result = sync(store, new Set(["bus1"]))!;

    expect(result.scopedNodes.map((n: any) => n.id)).toEqual(["bus1"]);
    expect(result.scopedEdges).toEqual([]);
  });

  test("多个母线的作用域合并后按 store 下标排序", () => {
    const store = createStore();
    store.nodeMap.set("bus2", bus("bus2"));
    store.nodeIndexById.set("bus2", 3);
    store.edgesByNodeId.set("bus2", [edge("e2", "bus2", "dev2")]);
    store.edgeMap.set("e2", edge("e2", "bus2", "dev2"));
    store.edgeIndexById.set("e2", 1);
    const h = createScope();
    const sync = createSynchronizePendingBusTerminalsWithGraphStore(h.scope);

    const result = sync(store, new Set(["bus2", "bus1"]))!;

    expect(result.scopedNodes.map((n: any) => n.id)).toEqual(["bus1", "dev1", "dev2", "bus2"]);
    expect(result.scopedEdges.map((e: any) => e.id)).toEqual(["e1", "e2"]);
  });
});
