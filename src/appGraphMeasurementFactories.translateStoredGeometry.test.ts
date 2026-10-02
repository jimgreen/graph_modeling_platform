// 画布原点位移时把已存的几何整体平移。
// 三条契约：① 位移为零时整段短路、返回同一个边对象；
// ② 边里没有任何可平移的点时也返回原对象（不造空壳副本）；
// ③ sourcePoint / manualPoints 缺省时保持 undefined，不被补成 {0,0}。
import { describe, expect, test, vi } from "vitest";

import {
  createLeftTopCanvasOriginShiftForContent,
  createShiftCachedRoutesForCanvasOrigin,
  createTranslateStoredEdgeGeometryBy
} from "./appExtracted/appGraphMeasurementFactories";

const shift = (x: number, y: number) => ({ x, y });
const add = (a: { x: number; y: number }, s: { x: number; y: number }) => ({ x: a.x + s.x, y: a.y + s.y });

function createScope(hasShift = true) {
  return {
    hasCanvasOriginShift: vi.fn(() => hasShift),
    translatePointBy: vi.fn(add)
  };
}

describe("createTranslateStoredEdgeGeometryBy", () => {
  test("位移为零时返回同一个边对象", () => {
    const scope = createScope(false);
    const edge: any = { id: "e1", sourcePoint: { x: 1, y: 1 } };

    expect(createTranslateStoredEdgeGeometryBy(scope)(edge, shift(0, 0))).toBe(edge);
  });

  test("平移源点、目标点、手工点与路由点", () => {
    const scope = createScope();
    const edge: any = {
      id: "e1",
      sourcePoint: { x: 0, y: 0 },
      targetPoint: { x: 10, y: 10 },
      manualPoints: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
      routePoints: [{ x: 3, y: 3 }]
    };

    const next = createTranslateStoredEdgeGeometryBy(scope)(edge, shift(5, -5));

    expect(next.sourcePoint).toEqual({ x: 5, y: -5 });
    expect(next.targetPoint).toEqual({ x: 15, y: 5 });
    expect(next.manualPoints).toEqual([{ x: 6, y: -4 }, { x: 7, y: -3 }]);
    expect(next.routePoints).toEqual([{ x: 8, y: -2 }]);
  });

  test("缺省的点字段保持 undefined", () => {
    const scope = createScope();
    const edge: any = { id: "e1", sourcePoint: { x: 0, y: 0 } };

    const next = createTranslateStoredEdgeGeometryBy(scope)(edge, shift(5, 5));

    expect(next.targetPoint).toBeUndefined();
    expect(next.manualPoints).toBeUndefined();
    expect(next.routePoints).toBeUndefined();
  });

  test("空数组的点集不被当成「有内容」：仍返回原对象", () => {
    const scope = createScope();
    const edge: any = { id: "e1", manualPoints: [], routePoints: [] };

    expect(createTranslateStoredEdgeGeometryBy(scope)(edge, shift(5, 5))).toBe(edge);
  });

  test("平移不改动原边", () => {
    const scope = createScope();
    const edge: any = { id: "e1", sourcePoint: { x: 0, y: 0 } };

    createTranslateStoredEdgeGeometryBy(scope)(edge, shift(5, 5));

    expect(edge.sourcePoint).toEqual({ x: 0, y: 0 });
  });
});

describe("createShiftCachedRoutesForCanvasOrigin", () => {
  function createScope(options: { hasShift?: boolean; routes?: any[] } = {}) {
    const store = { routes: [] as any[] };
    const scope: Record<string, any> = {
      hasCanvasOriginShift: vi.fn(() => options.hasShift ?? true),
      translateRouteBy: vi.fn((route: any, s: any) => ({ ...route, points: route.points.map((p: any) => add(p, s)) })),
      cachedRoutedEdgesRef: { current: options.routes ?? [{ id: "r1", points: [{ x: 0, y: 0 }] }] },
      cachedRouteStoreRef: { current: store },
      routeStoreSetRoutes: vi.fn((current: any, routes: any[]) => ({ ...current, routes }))
    };
    scope.shiftCachedRoutesForCanvasOrigin = createShiftCachedRoutesForCanvasOrigin(scope);
    return { scope, store };
  }

  test("平移缓存路由并写回 routeStore", () => {
    const h = createScope();

    h.scope.shiftCachedRoutesForCanvasOrigin(shift(3, 4));

    expect(h.scope.cachedRoutedEdgesRef.current[0].points).toEqual([{ x: 3, y: 4 }]);
    expect(h.scope.routeStoreSetRoutes).toHaveBeenCalled();
    expect(h.scope.cachedRouteStoreRef.current.routes).toEqual([{ id: "r1", points: [{ x: 3, y: 4 }] }]);
  });

  test("位移为零时不动缓存", () => {
    const h = createScope({ hasShift: false });
    const before = h.scope.cachedRoutedEdgesRef.current;

    h.scope.shiftCachedRoutesForCanvasOrigin(shift(0, 0));

    expect(h.scope.cachedRoutedEdgesRef.current).toBe(before);
    expect(h.scope.routeStoreSetRoutes).not.toHaveBeenCalled();
  });

  test("缓存为空时不动 routeStore", () => {
    const h = createScope({ routes: [] });

    h.scope.shiftCachedRoutesForCanvasOrigin(shift(3, 4));

    expect(h.scope.routeStoreSetRoutes).not.toHaveBeenCalled();
  });
});

describe("createLeftTopCanvasOriginShiftForContent", () => {
  function createScope(bounds: any) {
    return {
      calculateModelGeometryBounds: vi.fn(() => bounds),
      edgeRoutesForGeometryBounds: vi.fn((edges: any[]) => edges.map((e) => ({ id: `r-${e.id}`, points: e.points ?? [] })))
    };
  }

  test("内容越过左/上边界时给出补偿位移", () => {
    const scope = createScope({ left: -30.2, top: -7, right: 10, bottom: 10 });

    expect(createLeftTopCanvasOriginShiftForContent(scope)([])).toEqual({ x: 31, y: 7 });
  });

  test("内容全在正半区时位移为零", () => {
    const scope = createScope({ left: 0, top: 5, right: 10, bottom: 10 });

    expect(createLeftTopCanvasOriginShiftForContent(scope)([])).toEqual({ x: 0, y: 0 });
  });

  test("无几何边界时位移为零", () => {
    expect(createLeftTopCanvasOriginShiftForContent(createScope(null))([])).toEqual({ x: 0, y: 0 });
  });

  test("只在左边界为负时不动 y", () => {
    const scope = createScope({ left: -5, top: 3, right: 10, bottom: 10 });

    expect(createLeftTopCanvasOriginShiftForContent(scope)([])).toEqual({ x: 5, y: 0 });
  });

  test("padding 透传给几何边界计算，且边自己的路由被并入", () => {
    const scope = createScope({ left: 0, top: 0, right: 0, bottom: 0 });
    const edges = [{ id: "e1" }];

    createLeftTopCanvasOriginShiftForContent(scope)([], edges, [], 12);

    expect(scope.calculateModelGeometryBounds).toHaveBeenCalledWith([], [{ id: "r-e1", points: [] }], 12);
  });
});
