// 连线布线时的作用域节点收集：端点必收、按 512 padding 扩框收空间索引命中项、收不满就退回全量。
// 退回全量是「宁可多算不可漏算」的关键兜底，必须盖住。
import { describe, expect, test, vi } from "vitest";

import {
  createAddRoutingNodesForConnectionEdge,
  createRoutingNodesForConnectionEdge,
  createRoutingNodesForConnectionEdges
} from "./appExtracted/appGraphMeasurementFactories";

const node = (id: string, x = 0, y = 0) => ({ id, name: id, position: { x, y }, terminals: [] });
const edge = (id: string, sourceId: string, targetId: string) => ({ id, sourceId, targetId, sourcePoint: null, targetPoint: null });

/** queryNodeSpatialIndex 固定返回 candidates，模拟「扩框内命中的节点」。 */
function createScope(options: { visibleNodes?: any[]; spatialHits?: any[] } = {}) {
  const nodeForRoutingList = vi.fn((list: any[], id: string) => list.find((n) => n.id === id));
  const queryNodeSpatialIndex = vi.fn(() => options.spatialHits ?? []);
  const getModelEdgeEndpointPoint = vi.fn((n: any) => ({ x: n.position.x, y: n.position.y }));
  const addRoutingNodesForConnectionEdge = createAddRoutingNodesForConnectionEdge({
    nodeForRoutingList,
    queryNodeSpatialIndex,
    getModelEdgeEndpointPoint,
    visibleNodeSpatialIndex: { sentinel: true }
  });
  return { addRoutingNodesForConnectionEdge, nodeForRoutingList, queryNodeSpatialIndex, getModelEdgeEndpointPoint, visibleNodes: options.visibleNodes ?? [] };
}

describe("createAddRoutingNodesForConnectionEdge", () => {
  test("两个端点都进作用域", () => {
    const scope = createScope();
    const scoped = new Map();
    const a = node("a", 0, 0);
    const b = node("b", 100, 0);

    scope.addRoutingNodesForConnectionEdge(edge("e1", "a", "b"), [a, b], scoped);

    expect([...scoped.keys()].sort()).toEqual(["a", "b"]);
  });

  test("空间索引命中的旁路节点也进作用域（不覆盖已收的端点）", () => {
    const a = node("a", 0, 0);
    const b = node("b", 100, 0);
    const near = node("near", 50, 10);
    const scope = createScope({ spatialHits: [near, node("a2")] });
    const scoped = new Map();

    scope.addRoutingNodesForConnectionEdge(edge("e1", "a", "b"), [a, b], scoped);

    expect([...scoped.keys()].sort()).toEqual(["a", "a2", "b", "near"]);
  });

  test("扩框按两端点外扩 512", () => {
    const scope = createScope();
    const scoped = new Map();

    scope.addRoutingNodesForConnectionEdge(edge("e1", "a", "b"), [node("a", 0, 0), node("b", 100, 0)], scoped);

    expect(scope.queryNodeSpatialIndex).toHaveBeenCalledWith(
      { sentinel: true },
      { left: -512, right: 612, top: -512, bottom: 512 }
    );
  });

  test("端点缺失时什么都不收，也不查空间索引", () => {
    const scope = createScope();
    const scoped = new Map();

    scope.addRoutingNodesForConnectionEdge(edge("e1", "a", "缺失"), [node("a")], scoped);

    expect(scoped.size).toBe(0);
    expect(scope.queryNodeSpatialIndex).not.toHaveBeenCalled();
  });
});

describe("createRoutingNodesForConnectionEdge", () => {
  test("默认用 visibleNodes 作为源列表", () => {
    const visible = [node("a", 0, 0), node("b", 100, 0)];
    const scope = createScope({ visibleNodes: visible });
    const result = createRoutingNodesForConnectionEdge({
      addRoutingNodesForConnectionEdge: scope.addRoutingNodesForConnectionEdge,
      visibleNodes: visible
    })(edge("e1", "a", "b"));

    expect(result!.map((n: any) => n.id).sort()).toEqual(["a", "b"]);
  });

  test("一个都没收到时退回传入的源列表", () => {
    const visible = [node("a")];
    const scope = createScope({ visibleNodes: visible });

    const result = createRoutingNodesForConnectionEdge({
      addRoutingNodesForConnectionEdge: scope.addRoutingNodesForConnectionEdge,
      visibleNodes: visible
    })(edge("e1", "a", "缺失"));

    expect(result).toBe(visible);
  });
});

describe("createRoutingNodesForConnectionEdges", () => {
  const full = [node("a", 0, 0), node("b", 100, 0), node("extra", 50, 0)];

  function scopeWith(spatialHits: any[] = []) {
    const scope = createScope({ spatialHits });
    return {
      addRoutingNodesForConnectionEdge: scope.addRoutingNodesForConnectionEdge,
      nodeById: new Map(full.map((n) => [n.id, n])),
      orderedNodeFromList: (list: any[], id: string) => list.find((n) => n.id === id)
    };
  }

  test("空候选边直接返回空数组，不退回全量", () => {
    expect(createRoutingNodesForConnectionEdges(scopeWith())([], full)).toEqual([]);
  });

  test("额外节点 id 并入作用域", () => {
    const result = createRoutingNodesForConnectionEdges(scopeWith())([edge("e1", "a", "b")], full, ["extra"]);

    expect(result.map((n) => n.id).sort()).toEqual(["a", "b", "extra"]);
  });

  test("查不到的额外 id 被忽略", () => {
    const result = createRoutingNodesForConnectionEdges(scopeWith())([edge("e1", "a", "b")], full, ["不存在"]);

    expect(result!.map((n: any) => n.id).sort()).toEqual(["a", "b"]);
  });

  test("作用域为空时退回源列表", () => {
    const result = createRoutingNodesForConnectionEdges(scopeWith())([edge("e1", "缺失1", "缺失2")], full) as any;

    expect(result).toBe(full);
  });
});
