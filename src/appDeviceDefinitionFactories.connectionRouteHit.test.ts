// 连线命中：先把屏幕容差换算成画布单位，再按「距离最近 → 路由靠后 → 段靠前」三级排序取第一条。
// 容差换算取两轴较大值：缩放非等比时用小的那个会让某一轴完全点不中。
import { describe, expect, test, vi } from "vitest";

import {
  createConnectionHitTolerance,
  createFindConnectionRouteHitAtPoint
} from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("createConnectionHitTolerance", () => {
  const TOLERANCE = 10;

  function scope(rect: any, viewBox: any) {
    return {
      CONNECTION_HIT_SCREEN_TOLERANCE: TOLERANCE,
      svgRef: { current: rect === null ? null : { getBoundingClientRect: () => rect, viewBox: { baseVal: viewBox } } }
    };
  }

  test("SVG 未挂载时用固定兜底 16", () => {
    expect(createConnectionHitTolerance(scope(null, null))()).toBe(16);
  });

  test("矩形尺寸为 0 时用兜底（避免除零产生 Infinity）", () => {
    expect(createConnectionHitTolerance(scope({ width: 0, height: 100 }, { width: 100, height: 100 }))()).toBe(16);
  });

  test("等比缩放：容差 = 屏幕容差 × 缩放比", () => {
    // viewBox 240 / rect 120 = 2 → 10 * 2 = 20
    expect(createConnectionHitTolerance(scope({ width: 120, height: 120 }, { width: 240, height: 240 }))()).toBe(20);
  });

  test("非等比缩放取两轴较大值", () => {
    // x: 240/120 = 2 → 20；y: 240/40 = 6 → 60
    expect(createConnectionHitTolerance(scope({ width: 120, height: 40 }, { width: 240, height: 240 }))()).toBe(60);
  });

  test("缩小视图时容差变小", () => {
    expect(createConnectionHitTolerance(scope({ width: 480, height: 480 }, { width: 240, height: 240 }))()).toBe(5);
  });
});

describe("createFindConnectionRouteHitAtPoint", () => {
  const route = (edgeId: string, points: any[]) => ({ edgeId, points });

  function createScope(options: { routes?: any[]; activeIds?: string[]; tolerance?: number } = {}) {
    // 点到线段的垂距（退化时退化为点到端点距离）
    const segmentDistance = (p: any, a: any, b: any) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared === 0) {
        return Math.hypot(p.x - a.x, p.y - a.y);
      }
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    };
    const scope: Record<string, any> = {
      activeLayerEdgeIdSet: new Set(options.activeIds ?? ["e1", "e2"]),
      connectionHitTolerance: vi.fn(() => options.tolerance ?? 5),
      routedEdgeSpatialIndex: { sentinel: true },
      routedEdgeIndexById: new Map([["e1", 0], ["e2", 1]]),
      queryRouteSpatialIndex: vi.fn(() => options.routes ?? []),
      routeSegmentPointerDistance: vi.fn(segmentDistance)
    };
    scope.findConnectionRouteHitAtPoint = createFindConnectionRouteHitAtPoint(scope);
    return scope;
  }

  test("没有命中时返回 null", () => {
    expect(createFindConnectionRouteHitAtPoint(createScope({ routes: [] }))(pt(0, 0))).toBeNull();
  });

  test("超出容差的段不算命中", () => {
    const scope = createScope({ routes: [route("e1", [pt(0, 0), pt(100, 0)])], tolerance: 5 });

    expect(scope.findConnectionRouteHitAtPoint(pt(0, 50))).toBeNull();
  });

  test("命中时返回边 id、路径、距离与段序号", () => {
    const points = [pt(0, 0), pt(100, 0), pt(100, 100)];
    const scope = createScope({ routes: [route("e1", points)], tolerance: 5 });

    const hit = scope.findConnectionRouteHitAtPoint(pt(50, 1));

    expect(hit).toMatchObject({ edgeId: "e1", routePoints: points, segmentIndex: 0, routeOrder: 0 });
  });

  test("非活动图层的边被排除", () => {
    const scope = createScope({ routes: [route("e9", [pt(0, 0), pt(100, 0)])], activeIds: ["e1"], tolerance: 5 });

    expect(scope.findConnectionRouteHitAtPoint(pt(50, 0))).toBeNull();
  });

  test("距离相同时取路由靠后的一条", () => {
    const scope = createScope({
      routes: [route("e1", [pt(0, 0), pt(100, 0)]), route("e2", [pt(0, 0), pt(100, 0)])],
      tolerance: 5
    });

    expect(scope.findConnectionRouteHitAtPoint(pt(50, 0)).edgeId).toBe("e2");
  });

  test("同一路由内距离相同时取段序号靠前的", () => {
    const scope = createScope({ routes: [route("e1", [pt(0, 0), pt(100, 0), pt(100, 100)])], tolerance: 5 });

    expect(scope.findConnectionRouteHitAtPoint(pt(100, 0)).segmentIndex).toBe(0);
  });

  test("距离更近的优先于路由顺序", () => {
    const scope = createScope({
      routes: [route("e1", [pt(0, 0), pt(100, 0)]), route("e2", [pt(49, 0), pt(51, 0)])],
      tolerance: 5
    });

    expect(scope.findConnectionRouteHitAtPoint(pt(50, 0)).edgeId).toBe("e2");
  });

  test("单点路径不产生线段", () => {
    const scope = createScope({ routes: [route("e1", [pt(0, 0)])], tolerance: 5 });

    expect(scope.findConnectionRouteHitAtPoint(pt(0, 0))).toBeNull();
  });

  test("索引里没有的路由 routeOrder 为 -1", () => {
    const scope = createScope({ routes: [route("e7", [pt(0, 0), pt(100, 0)])], activeIds: ["e7"], tolerance: 5 });

    expect(scope.findConnectionRouteHitAtPoint(pt(50, 0)).routeOrder).toBe(-1);
  });

  test("查询范围按容差外扩", () => {
    const scope = createScope({ routes: [], tolerance: 8 });

    scope.findConnectionRouteHitAtPoint(pt(100, 200));

    expect(scope.queryRouteSpatialIndex.mock.calls[0][1]).toEqual({ left: 92, right: 108, top: 192, bottom: 208 });
  });
});
