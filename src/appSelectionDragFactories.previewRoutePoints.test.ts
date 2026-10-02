// 拖拽预览的折线：已水平/垂直时直连，否则插一个拐点。
// 拐点插哪一侧由「哪个方向位移更大」决定 —— 插错侧会让预览在拐一下时反向抽搐。
import { describe, expect, test, vi } from "vitest";

import {
  createConnectionEndpointPreviewRoutePoints,
  createSimpleOrthogonalDragPreviewPoints
} from "./appExtracted/appSelectionDragFactories";

/** 取第 index 次调用的参数数组：vi.fn() 的元组推断挡不住下标取值，统一走这里。 */
const callArgs = (mock: any, index = 0): any[] => (mock.mock.calls[index] ?? []) as any[];


const pt = (x: number, y: number) => ({ x, y });

describe("createSimpleOrthogonalDragPreviewPoints", () => {
  const build = createSimpleOrthogonalDragPreviewPoints({});

  test("水平同轴时直连两点", () => {
    const start = pt(0, 10);
    const end = pt(100, 10);

    expect(build(start, end)).toEqual([start, end]);
  });

  test("垂直同轴时直连两点", () => {
    const start = pt(10, 0);
    const end = pt(10, 100);

    expect(build(start, end)).toEqual([start, end]);
  });

  test("x 位移更大时拐点取终点 x", () => {
    const start = pt(0, 0);
    const end = pt(100, 20);

    expect(build(start, end)).toEqual([start, pt(100, 0), end]);
  });

  test("y 位移更大时拐点取终点 y", () => {
    const start = pt(0, 0);
    const end = pt(20, 100);

    expect(build(start, end)).toEqual([start, pt(0, 100), end]);
  });

  test("位移相等时走 x 分支（>= 而非 >）", () => {
    expect(build(pt(0, 0), pt(50, 50))).toEqual([pt(0, 0), pt(50, 0), pt(50, 50)]);
  });

  test("亚像素差异按取整后判同轴", () => {
    const start = pt(0, 0);
    const end = pt(0.2, 0.3);

    expect(build(start, end)).toEqual([start, end]);
  });

  test("反向拖拽同样取位移较大的一侧", () => {
    expect(build(pt(100, 100), pt(0, 80))).toEqual([pt(100, 100), pt(0, 100), pt(0, 80)]);
  });

  test("起终点重合时直连两点", () => {
    const p = pt(5, 5);

    expect(build(p, p)).toEqual([p, p]);
  });
});

describe("createConnectionEndpointPreviewRoutePoints", () => {
  const edge = { id: "e1", sourceId: "n1", targetId: "n2", sourcePoint: null, targetPoint: null };
  const endpoints = (start = pt(0, 0), end = pt(90, 40), source: any = { id: "n1" }, target: any = { id: "n2" }) => ({
    start,
    end,
    source,
    target
  });

  function createScope(routePoints: any[] | null = [{ x: 0, y: 0 }, { x: 10, y: 0 }]) {
    return {
      canvasBounds: { width: 1000, height: 800 },
      compactPreviewNodes: vi.fn(() => [{ id: "n1" }, { id: "n2" }]),
      isBusNode: vi.fn(() => false),
      routeEdgesForStoredRendering: vi.fn(() => (routePoints === null ? [] : [{ points: routePoints }])),
      simpleOrthogonalDragPreviewPoints: vi.fn(() => [pt(-1, -1)])
    };
  }

  test("路由有结果时直接用它的点", () => {
    const scope = createScope();

    expect(createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints() as any)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  test("路由没产出结果时退回正交折线", () => {
    const scope = createScope(null);

    expect(createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints() as any)).toEqual([pt(-1, -1)]);
    expect(scope.simpleOrthogonalDragPreviewPoints).toHaveBeenCalledWith(pt(0, 0), pt(90, 40));
  });

  test("路由产出空点集时同样退回正交折线", () => {
    const scope = createScope([]);

    expect(createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints() as any)).toEqual([pt(-1, -1)]);
  });

  test("非母线端点保留边自带的端点", () => {
    const scope = createScope();
    const withPoints = { ...edge, sourcePoint: pt(1, 1), targetPoint: pt(2, 2) } as any;

    createConnectionEndpointPreviewRoutePoints(scope)(withPoints, endpoints() as any);

    const previewEdge = callArgs(scope.routeEdgesForStoredRendering, 0)[1][0];
    expect(previewEdge.sourcePoint).toEqual(pt(1, 1));
    expect(previewEdge.targetPoint).toEqual(pt(2, 2));
  });

  test("母线端点改用外部拖拽点（母线随拖动整体平移）", () => {
    const scope = createScope();
    scope.isBusNode = vi.fn(() => true);

    createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints(pt(3, 3), pt(9, 9)) as any);

    const previewEdge = callArgs(scope.routeEdgesForStoredRendering, 0)[1][0];
    expect(previewEdge.sourcePoint).toEqual(pt(3, 3));
    expect(previewEdge.targetPoint).toEqual(pt(9, 9));
  });

  test("只有源端是母线时只改源端点", () => {
    const scope = createScope();
    scope.isBusNode = vi.fn((n: any) => n?.id === "n1");

    createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints(pt(3, 3), pt(9, 9)) as any);

    const previewEdge = callArgs(scope.routeEdgesForStoredRendering, 0)[1][0];
    expect(previewEdge.sourcePoint).toEqual(pt(3, 3));
    expect(previewEdge.targetPoint).toBeNull();
  });

  test("其余边字段原样带出", () => {
    const scope = createScope();

    createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints() as any);

    const previewEdge = callArgs(scope.routeEdgesForStoredRendering, 0)[1][0];
    expect(previewEdge.id).toBe("e1");
    expect(previewEdge.sourceId).toBe("n1");
  });

  test("画布尺寸透传给路由器", () => {
    const scope = createScope();

    createConnectionEndpointPreviewRoutePoints(scope)(edge as any, endpoints() as any);

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[2]).toEqual({ width: 1000, height: 800 });
  });
});
