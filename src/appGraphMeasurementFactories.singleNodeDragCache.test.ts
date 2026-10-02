// createBuildSingleNodeDragCache：单节点拖拽预览的缓存构建。
// 三条最容易被改坏的契约：
//  ① nodeIds 不是恰好 1 个时直接放弃（返回 undefined），不产半截缓存；
//  ② relevantEdges 要同时过「可见」与「相关」两道闸，且 preview/snap 各自按上限截断；
//  ③ 端点预览里整条边被拖、端点是母线、端点节点查不到 —— 三种情况都要跳过。
import { describe, expect, test, vi } from "vitest";

import { createBuildSingleNodeDragCache } from "./appExtracted/appGraphMeasurementFactories";

const node = (id: string) => ({ id, name: id, position: { x: 0, y: 0 }, terminals: [] });
const edge = (id: string, sourceId: string, targetId: string) => ({ id, sourceId, targetId, sourcePoint: null, targetPoint: null });

function createScope(options: { previewLimit?: number; snapLimit?: number; busIds?: string[]; visibleIds?: string[] } = {}) {
  const nodes = [node("moved"), node("a"), node("b"), node("far")];
  const busIds = new Set(options.busIds ?? []);
  return {
    CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT: options.previewLimit ?? 10,
    CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT: options.snapLimit ?? 10,
    colorDisplayMode: "voltage",
    colorPalette: {},
    nodeById: new Map(nodes.map((n) => [n.id, n])),
    visibleEdgeIdSet: new Set(options.visibleIds ?? ["e1", "e2", "e3", "e4"]),
    isBusNode: vi.fn((n: any) => busIds.has(n.id)),
    currentStoredRoutePointsForEdge: vi.fn(() => [{ x: 0, y: 0 }, { x: 10, y: 10 }]),
    edgeWithFrozenBusEndpointPoints: vi.fn((e: any, points: any) => ({ ...e, frozen: points })),
    getModelEdgeEndpointPoint: vi.fn((_n: any, p: any) => p ?? { x: 0, y: 0 }),
    getConnectionStrokeColor: vi.fn(() => "#fff"),
    getRouteEndpointNormal: vi.fn(() => ({ x: 1, y: 0 }))
  };
}

describe("createBuildSingleNodeDragCache", () => {
  test("nodeIds 不是 1 个时返回 undefined", () => {
    const scope = createScope();
    const build = createBuildSingleNodeDragCache(scope);

    expect(build([], [], [])).toBeUndefined();
    expect(build(["moved", "a"], [], [])).toBeUndefined();
  });

  test("只收可见且相关的边", () => {
    const scope = createScope({ visibleIds: ["e1"] });
    const build = createBuildSingleNodeDragCache(scope);
    const affected = [edge("e1", "moved", "a"), edge("e2", "moved", "a"), edge("e3", "far", "a")];

    const cache = build(["moved"], [], affected)!;

    // e2 不可见、e3 与 moved 无关（也不在被拖边集合里）→ 只剩 e1
    expect(cache.relevantEdges.map((e: any) => e.id)).toEqual(["e1"]);
  });

  test("被显式拖拽的边即使两端都不动也算相关", () => {
    const scope = createScope();
    const build = createBuildSingleNodeDragCache(scope);

    const cache = build(["moved"], ["e3"], [edge("e3", "far", "a")])!;

    expect(cache.relevantEdges.map((e: any) => e.id)).toEqual(["e3"]);
    expect(cache.draggedEdgeIds.has("e3")).toBe(true);
  });

  test("preview 与 snap 各自按自己的上限截断", () => {
    const scope = createScope({ previewLimit: 1, snapLimit: 3 });
    const build = createBuildSingleNodeDragCache(scope);
    const affected = [edge("e1", "moved", "a"), edge("e2", "moved", "a"), edge("e3", "moved", "a"), edge("e4", "moved", "a")];

    const cache = build(["moved"], [], affected)!;

    expect(cache.relevantEdges).toHaveLength(4);
    expect(cache.previewEdges.map((e: any) => e.id)).toEqual(["e1"]);
    expect(cache.snapEdges).toHaveLength(3);
  });

  test("端点预览含起终点、法线与路由点", () => {
    const scope = createScope();
    const build = createBuildSingleNodeDragCache(scope);
    const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    scope.currentStoredRoutePointsForEdge = vi.fn(() => points);

    const cache = build(["moved"], [], [edge("e1", "moved", "a")])!;
    const endpoint = cache.previewEndpointByEdgeId.get("e1")!;

    expect(endpoint.edgeId).toBe("e1");
    expect(endpoint.startMoves).toBe(true);
    expect(endpoint.endMoves).toBe(false);
    expect(endpoint.routePoints).toBe(points);
    expect(scope.getRouteEndpointNormal).toHaveBeenCalledTimes(2);
  });

  test("整条边被拖时不出端点预览（两端都不动）", () => {
    const scope = createScope();
    const build = createBuildSingleNodeDragCache(scope);

    const cache = build(["moved"], ["e3"], [edge("e3", "far", "a")])!;

    expect(cache.previewEndpointByEdgeId.size).toBe(0);
  });

  test("端点是母线时不出端点预览，并记进 movedBusNodeIds", () => {
    const scope = createScope({ busIds: ["moved"] });
    const build = createBuildSingleNodeDragCache(scope);

    const cache = build(["moved"], [], [edge("e1", "moved", "a")])!;

    expect([...cache.movedBusNodeIds]).toEqual(["moved"]);
    expect(cache.previewEndpointByEdgeId.size).toBe(0);
  });

  test("端点节点查不到时跳过该条，其余照常", () => {
    const scope = createScope();
    // a 从 nodeById 里消失，b 还在
    scope.nodeById = new Map([["moved", node("moved")], ["b", node("b")]]);
    const build = createBuildSingleNodeDragCache(scope);

    const cache = build(["moved"], [], [edge("e1", "moved", "a"), edge("e2", "moved", "b")])!;

    expect([...cache.previewEndpointByEdgeId.keys()]).toEqual(["e2"]);
  });

  test("movedNodeIds 为只含被拖节点的 Set", () => {
    const scope = createScope();
    const build = createBuildSingleNodeDragCache(scope);

    expect([...build(["moved"], [], [])!.movedNodeIds]).toEqual(["moved"]);
  });
});
