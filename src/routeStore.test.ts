import { describe, expect, test } from "vitest";
import type { RoutedEdge } from "./model";
import {
  createRouteStore,
  queryRouteSpatialIndex,
  routeStorePatchRoutes,
  routeStoreSetRoutes
} from "./routeStore";

const route = (edgeId: string, x: number, y: number): RoutedEdge => ({
  edgeId,
  points: [
    { x, y },
    { x: x + 120, y }
  ],
  path: `M ${x} ${y} L ${x + 120} ${y}`
});

describe("normalized route store", () => {
  test("keeps routed edges in a map with stable order and a spatial index", () => {
    const first = route("edge-1", 40, 40);
    const second = route("edge-2", 640, 640);

    const store = createRouteStore([first, second]);

    expect(store.routeOrder).toEqual(["edge-1", "edge-2"]);
    expect(store.routeMap.get("edge-1")).toBe(first);
    expect(store.routeIndexById.get("edge-2")).toBe(1);
    expect(queryRouteSpatialIndex(store.routeSpatialIndex, { left: 0, right: 220, top: 0, bottom: 120 })).toEqual([first]);
  });

  test("patches changed routes without rebuilding unchanged route references", () => {
    const first = route("edge-1", 40, 40);
    const second = route("edge-2", 640, 640);
    const store = createRouteStore([first, second]);
    const movedFirst = route("edge-1", 300, 80);

    const patched = routeStorePatchRoutes(store, [movedFirst]);

    expect(patched).not.toBe(store);
    expect(patched.routeMap.get("edge-1")).toBe(movedFirst);
    expect(patched.routeMap.get("edge-2")).toBe(second);
    expect(patched.routes).toEqual([movedFirst, second]);
    expect(patched.routeOrder).toBe(store.routeOrder);
    expect(patched.routeIndexById).toBe(store.routeIndexById);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, { left: 0, right: 220, top: 0, bottom: 120 })).toEqual([]);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, { left: 260, right: 460, top: 40, bottom: 130 })).toEqual([movedFirst]);
  });

  test("returns the existing route store when route references and order do not change", () => {
    const first = route("edge-1", 40, 40);
    const second = route("edge-2", 640, 640);
    const store = createRouteStore([first, second]);

    expect(routeStoreSetRoutes(store, [first, second])).toBe(store);
    expect(routeStorePatchRoutes(store, [first])).toBe(store);
  });

  test("patches changed routes when setRoutes keeps the same edge order", () => {
    const first = route("edge-1", 40, 40);
    const second = route("edge-2", 640, 640);
    const store = createRouteStore([first, second]);
    const movedSecond = route("edge-2", 700, 700);

    const patched = routeStoreSetRoutes(store, [first, movedSecond]);

    expect(patched).not.toBe(store);
    expect(patched.routeOrder).toBe(store.routeOrder);
    expect(patched.routeIndexById).toBe(store.routeIndexById);
    expect(patched.routeMap.get("edge-1")).toBe(first);
    expect(patched.routeMap.get("edge-2")).toBe(movedSecond);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, { left: 620, right: 780, top: 620, bottom: 660 })).toEqual([]);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, { left: 680, right: 840, top: 680, bottom: 760 })).toEqual([movedSecond]);
  });
});
