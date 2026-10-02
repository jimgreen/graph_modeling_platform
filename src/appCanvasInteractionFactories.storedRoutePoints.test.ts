// createCurrentStoredRoutePointsForEdge：拖拽预览要用的「当前路径」。
// 四级回退，顺序不能换：存盘路由 → 未标脏的缓存路由 → 按新画布现算 → 快照兜底。
// 关键：这条边被标脏时**不能用**缓存路由（那就是正在被作废的旧路径）。
import { describe, expect, test, vi } from "vitest";

import { createCurrentStoredRoutePointsForEdge } from "./appExtracted/appCanvasInteractionFactories";

/** 取第 index 次调用的参数数组：vi.fn() 的元组推断挡不住下标取值，统一走这里。 */
const callArgs = (mock: any, index = 0): any[] => (mock.mock.calls[index] ?? []) as any[];


const pt = (x: number, y: number) => ({ x, y });
const edge = (id = "e1") => ({ id, sourceId: "n1", targetId: "n2" });

function createScope(over: Record<string, any> = {}) {
  return {
    canvasBounds: { width: 1000, height: 800 },
    pendingRouteEdgeIdsRef: { current: new Set<string>() },
    pendingStoredRouteEdgeIdsRef: { current: new Set<string>() },
    endpointMatchedStoredRoutePoints: vi.fn(() => []),
    endpointMatchedRoutePointsForEdge: vi.fn((_e: any, points: any) => points ?? []),
    routedEdgeById: new Map<string, any>(),
    nodeById: new Map([
      ["n1", { id: "n1" }],
      ["n2", { id: "n2" }]
    ]),
    compactPreviewNodes: vi.fn(() => [{ id: "n1" }, { id: "n2" }]),
    routeEdgesForStoredRendering: vi.fn(() => []),
    edgeSnapshotFallbackPoints: vi.fn(() => [pt(-1, -1)]),
    ...over
  };
}

describe("createCurrentStoredRoutePointsForEdge", () => {
  test("边为 undefined 时返回空数组", () => {
    const scope = createScope();

    expect(createCurrentStoredRoutePointsForEdge(scope)(undefined)).toEqual([]);
    expect(scope.endpointMatchedStoredRoutePoints).not.toHaveBeenCalled();
  });

  test("有存盘路由时直接用", () => {
    const stored = [pt(1, 1)];
    const scope = createScope({ endpointMatchedStoredRoutePoints: vi.fn(() => stored) });

    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toBe(stored);
    expect(scope.routeEdgesForStoredRendering).not.toHaveBeenCalled();
  });

  test("无存盘路由时用未标脏的缓存路由", () => {
    const cached = [pt(2, 2)];
    const scope = createScope({ routedEdgeById: new Map([["e1", { points: cached }]]) });

    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toEqual(cached);
  });

  test("边被标为待重算时跳过缓存的端点匹配，但仍可作最后兜底", () => {
    const scope = createScope({
      routedEdgeById: new Map([["e1", { points: [pt(2, 2)] }]]),
      pendingRouteEdgeIdsRef: { current: new Set(["e1"]) },
      nodeById: new Map()
    });

    // 标脏只让「端点匹配缓存」这一步失效；最终兜底仍读缓存的原始点
    expect(scope.endpointMatchedRoutePointsForEdge).toBeDefined();
    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toEqual([pt(2, 2)]);
  });

  test("边被标为待重算（已存路由那条）时同样跳过端点匹配", () => {
    const scope = createScope({
      routedEdgeById: new Map([["e1", { points: [pt(2, 2)] }]]),
      pendingStoredRouteEdgeIdsRef: { current: new Set(["e1"]) },
      nodeById: new Map(),
      endpointMatchedRoutePointsForEdge: vi.fn(() => [])
    });

    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toEqual([pt(2, 2)]);
  });

  test("缓存端点对不上时不走端点匹配，转现算 / 兜底", () => {
    const scope = createScope({
      routedEdgeById: new Map([["e1", { points: [pt(2, 2)] }]]),
      nodeById: new Map(),
      endpointMatchedRoutePointsForEdge: vi.fn(() => [])
    });

    // 端点匹配返回空 → 跳过现算（节点缺失）→ 最终兜底取缓存原始点
    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toEqual([pt(2, 2)]);
  });

  test("两端节点都在时按当前画布现算", () => {
    const scope = createScope({ routeEdgesForStoredRendering: vi.fn(() => [{ points: [pt(3, 3)] }]) });

    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toEqual([pt(3, 3)]);
    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[2]).toEqual({ width: 1000, height: 800 });
  });

  test("现算结果被复制，改返回值不影响内部对象", () => {
    const shared = [pt(3, 3)];
    const scope = createScope({ routeEdgesForStoredRendering: vi.fn(() => [{ points: shared }]) });

    const result = createCurrentStoredRoutePointsForEdge(scope)(edge());

    expect(result[0]).not.toBe(shared[0]);
  });

  test("显式 bounds 覆盖画布尺寸", () => {
    const scope = createScope({ routeEdgesForStoredRendering: vi.fn(() => [{ points: [pt(3, 3)] }]) });

    createCurrentStoredRoutePointsForEdge(scope)(edge(), { width: 10, height: 10 });

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[2]).toEqual({ width: 10, height: 10 });
  });

  test("端点节点缺失时不现算", () => {
    const scope = createScope({ nodeById: new Map() });

    createCurrentStoredRoutePointsForEdge(scope)(edge());

    expect(scope.routeEdgesForStoredRendering).not.toHaveBeenCalled();
  });

  test("现算为空时退回缓存原始点", () => {
    const scope = createScope({
      routedEdgeById: new Map([["e1", { points: [pt(9, 9)] }]]),
      endpointMatchedRoutePointsForEdge: vi.fn(() => [])
    });

    expect(createCurrentStoredRoutePointsForEdge(scope)(edge())).toEqual([pt(9, 9)]);
  });

  test("什么都没有时退回边快照兜底点", () => {
    expect(createCurrentStoredRoutePointsForEdge(createScope({ nodeById: new Map() }))(edge())).toEqual([pt(-1, -1)]);
  });
});
