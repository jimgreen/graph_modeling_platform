// 母线吸附：锚点投影、命中判定。
// 关键契约：非母线一律 undefined / false —— 判定函数不能只看几何，
// 否则普通设备离得近也会被当成母线吸附。
import { describe, expect, test, vi } from "vitest";

import {
  createBusAnchorFromEvent,
  createBusAnchorFromPoint,
  createIsPointNearBus,
  createIsPointOnBus
} from "./appExtracted/appCanvasInteractionFactories";

const pt = (x: number, y: number) => ({ x, y });
const bus = { id: "bus1", kind: "ac-bus" };
const load = { id: "n1", kind: "ac-load" };

function createScope(over: Record<string, any> = {}) {
  const scope: Record<string, any> = {
    isBusNode: vi.fn((n: any) => n?.kind === "ac-bus"),
    projectPointToBusCenterline: vi.fn(() => pt(50, 0)),
    pointOnBusForSnap: vi.fn(() => ({ x: 50, y: 0 })),
    screenToSvgPoint: vi.fn(() => pt(10, 20)),
    clampPointToCanvas: vi.fn((p: any) => p),
    svgRef: { current: { id: "svg" } },
    ...over
  };
  // 模块内这三个函数互相调用，必须先把工厂装进 scope，否则一调就 ReferenceError
  scope.busAnchorFromPoint = createBusAnchorFromPoint(scope);
  scope.isPointNearBus = createIsPointNearBus(scope);
  scope.isPointOnBus = createIsPointOnBus(scope);
  scope.busAnchorFromEvent = createBusAnchorFromEvent(scope);
  return scope;
}

describe("createBusAnchorFromPoint", () => {
  test("母线返回投影后的锚点", () => {
    const scope = createScope();

    expect(createBusAnchorFromPoint(scope)(bus as any, pt(80, 30))).toEqual(pt(50, 0));
    expect(scope.projectPointToBusCenterline).toHaveBeenCalledWith(bus, pt(80, 30));
  });

  test("非母线返回 undefined 且不投影", () => {
    const scope = createScope();

    expect(createBusAnchorFromPoint(scope)(load as any, pt(0, 0))).toBeUndefined();
    expect(scope.projectPointToBusCenterline).not.toHaveBeenCalled();
  });
});

describe("createBusAnchorFromEvent", () => {
  test("母线：屏幕坐标先转 SVG 再夹到画布，最后投影", () => {
    const scope = createScope();
    const svg = scope.svgRef.current;

    const anchor = createBusAnchorFromEvent(scope)(bus as any, { clientX: 7, clientY: 8 } as any);

    expect(scope.screenToSvgPoint).toHaveBeenCalledWith(svg, 7, 8);
    expect(scope.clampPointToCanvas).toHaveBeenCalledWith(pt(10, 20));
    expect(anchor).toEqual(pt(50, 0));
  });

  test("非母线：连坐标换算都不做", () => {
    const scope = createScope();

    expect(createBusAnchorFromEvent(scope)(load as any, { clientX: 7, clientY: 8 } as any)).toBeUndefined();
    expect(scope.screenToSvgPoint).not.toHaveBeenCalled();
  });

  test("SVG 尚未挂载时返回 undefined", () => {
    const scope = createScope({ svgRef: { current: null } });

    expect(createBusAnchorFromEvent(scope)(bus as any, { clientX: 7, clientY: 8 } as any)).toBeUndefined();
  });
});

describe("命中判定", () => {
  test("isPointOnBus 用零容差", () => {
    const scope = createScope();

    createIsPointOnBus(scope)(bus as any, pt(50, 0));

    expect(scope.pointOnBusForSnap).toHaveBeenCalledWith(bus, pt(50, 0), 0);
  });

  test("isPointOnBus 命中时为真", () => {
    expect(createIsPointOnBus(createScope())(bus as any, pt(50, 0))).toBe(true);
  });

  test("isPointNearBus 透传自定义容差", () => {
    const scope = createScope();

    createIsPointNearBus(scope)(bus as any, pt(0, 0), 8);

    expect(scope.pointOnBusForSnap).toHaveBeenCalledWith(bus, pt(0, 0), 8);
  });

  test("isPointNearBus 不传容差时默认为 0", () => {
    const scope = createScope();

    createIsPointNearBus(scope)(bus as any, pt(0, 0));

    expect(scope.pointOnBusForSnap).toHaveBeenCalledWith(bus, pt(0, 0), 0);
  });

  test("底层返回空值时判否（不靠真值强转 undefined）", () => {
    const scope = createScope({ pointOnBusForSnap: vi.fn(() => null) });

    expect(scope.isPointOnBus(bus as any, pt(0, 0))).toBe(false);
    expect(scope.isPointNearBus(bus as any, pt(0, 0), 5)).toBe(false);
  });
});
