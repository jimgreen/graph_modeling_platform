// createSetEdges / createPatchGraphEdges / createUpdateGraphNodeById 的契约：
// 三者都只做「把 scope 里的 graphStore* 纯函数接到 setGraphStore 上」这一件事，
// 本测试用记录调用的假 scope 锁住「传了谁、什么时候调、updater 拿到什么」。
import { describe, expect, test, vi } from "vitest";

import {
  createPatchGraphEdges,
  createSetEdges,
  createUpdateGraphNodeById
} from "./appExtracted/appGraphMeasurementFactories";

type Edge = { id: string; source: string; target: string };
type ModelNode = { id: string; name: string };

/** 造一个只记录调用的 scope；setGraphStore 立即把 updater 作用在 store 上并落盘。 */
function createScope(initial: { nodes: ModelNode[]; edges: Edge[]; nodeMap?: Map<string, ModelNode> }) {
  const calls: { fn: string; args: unknown[] }[] = [];
  let store: any = {
    nodes: initial.nodes,
    edges: initial.edges,
    nodeMap: initial.nodeMap ?? new Map(initial.nodes.map((n) => [n.id, n]))
  };
  const scope: Record<string, any> = {
    setGraphStore: (updater: (current: any) => any) => {
      store = updater(store);
      return store;
    },
    graphStoreSetEdges: (current: any, next: Edge[]) => {
      calls.push({ fn: "graphStoreSetEdges", args: [next] });
      return { ...current, edges: next };
    },
    graphStorePatchEdges: (current: any, updates: Iterable<Edge>) => {
      const list = Array.from(updates);
      calls.push({ fn: "graphStorePatchEdges", args: [list] });
      return { ...current, edges: current.edges };
    },
    graphStorePatchNodes: (current: any, updates: Iterable<ModelNode>) => {
      const list = Array.from(updates);
      calls.push({ fn: "graphStorePatchNodes", args: [list] });
      return { ...current, nodes: list };
    }
  };
  return {
    scope,
    calls,
    get store() {
      return store;
    }
  };
}

describe("createSetEdges", () => {
  test("直接值原样交给 graphStoreSetEdges", () => {
    const harness = createScope({ nodes: [], edges: [] });
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];

    createSetEdges(harness.scope)(edges);

    expect(harness.calls).toEqual([{ fn: "graphStoreSetEdges", args: [edges] }]);
    expect(harness.store.edges).toBe(edges);
  });

  test("函数式更新拿到的是当前 store 的 edges", () => {
    const existing: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    const harness = createScope({ nodes: [], edges: existing });
    const seen: unknown[] = [];

    createSetEdges(harness.scope)((current: any) => {
      seen.push(current);
      return [...current, { id: "e2", source: "b", target: "c" }];
    });

    expect(seen).toEqual([existing]);
    expect(harness.store.edges).toHaveLength(2);
  });
});

describe("createPatchGraphEdges", () => {
  test("迭代器被物化成数组后交给 graphStorePatchEdges", () => {
    const harness = createScope({ nodes: [], edges: [] });
    const updates = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "b", target: "c" }
    ];

    createPatchGraphEdges(harness.scope)(updates.values());

    expect(harness.calls).toEqual([{ fn: "graphStorePatchEdges", args: [updates] }]);
  });

  test("空迭代器也照样调一次（不做无谓短路）", () => {
    const harness = createScope({ nodes: [], edges: [] });

    createPatchGraphEdges(harness.scope)([]);

    expect(harness.calls).toHaveLength(1);
    expect(harness.calls[0].args[0]).toEqual([]);
  });
});

describe("createUpdateGraphNodeById", () => {
  test("命中时把 updater 结果交给 graphStorePatchNodes", () => {
    const node: ModelNode = { id: "n1", name: "旧名" };
    const harness = createScope({ nodes: [node], edges: [] });

    createUpdateGraphNodeById(harness.scope)("n1", (current: any) => ({ ...current, name: "新名" }));

    expect(harness.calls).toEqual([{ fn: "graphStorePatchNodes", args: [[{ id: "n1", name: "新名" }]] }]);
  });

  test("未命中时短路返回原 store，不调 patch", () => {
    const harness = createScope({ nodes: [{ id: "n1", name: "a" }], edges: [] });
    const before = harness.store;
    const updater = vi.fn((n: ModelNode) => n);

    createUpdateGraphNodeById(harness.scope)("不存在", updater);

    expect(updater).not.toHaveBeenCalled();
    expect(harness.calls).toEqual([]);
    expect(harness.store).toBe(before);
  });

  test("updater 原样返回同一对象时短路（引用未变即视为无更新）", () => {
    const node: ModelNode = { id: "n1", name: "同名" };
    const harness = createScope({ nodes: [node], edges: [] });
    const before = harness.store;

    createUpdateGraphNodeById(harness.scope)("n1", (current: any) => current);

    expect(harness.calls).toEqual([]);
    expect(harness.store).toBe(before);
  });
});
