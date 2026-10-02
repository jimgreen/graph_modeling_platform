// 连线/可布线路径预览：手工点优先走手工路径；否则交给路由器，
// 路由失败才退回「两点直连」。目标点是母线时用外部给的目标点而不是端子点。
import { describe, expect, test, vi } from "vitest";

import {
  createBuildConnectPreviewPath,
  createBuildRoutableLinePreviewPath
} from "./appExtracted/appGraphMeasurementFactories";

/** 取第 index 次调用的参数数组：vi.fn() 的元组推断挡不住下标取值，统一走这里。 */
const callArgs = (mock: any, index = 0): any[] => (mock.mock.calls[index] ?? []) as any[];


const pt = (x: number, y: number) => ({ x, y });

function createConnectScope(over: Record<string, any> = {}) {
  return {
    canvasBounds: { width: 100, height: 100 },
    visibleNodeById: new Map([["n1", { id: "n1", kind: "ac-load" }]]),
    getModelEdgeEndpointPoint: vi.fn(() => pt(1, 1)),
    isBusNode: vi.fn(() => false),
    buildManualConnectionPreviewPath: vi.fn(() => "手工路径"),
    routeEdgesForStoredRendering: vi.fn(() => [{ path: "路由路径" }]),
    ...over
  };
}

describe("createBuildConnectPreviewPath", () => {
  const build = (scope: any) => createBuildConnectPreviewPath(scope);

  test("无源节点时返回空串", () => {
    expect(build(createConnectScope())(null, pt(0, 0))).toBe("");
  });

  test("无终点时返回空串", () => {
    expect(build(createConnectScope())({ nodeId: "n1", terminalId: "t1" }, null)).toBe("");
  });

  test("源节点不可见时返回空串", () => {
    expect(build(createConnectScope())({ nodeId: "查无此节点", terminalId: "t1" }, pt(0, 0))).toBe("");
  });

  test("有手工点时走手工路径，不调路由器", () => {
    const scope = createConnectScope();
    const manual = [pt(5, 5)];

    const path = build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2), manualPoints: manual }, pt(9, 9));

    expect(path).toBe("手工路径");
    expect(scope.routeEdgesForStoredRendering).not.toHaveBeenCalled();
    expect(scope.buildManualConnectionPreviewPath).toHaveBeenCalledWith(pt(2, 2), manual, pt(9, 9), scope.canvasBounds);
  });

  test("无手工点时用路由结果", () => {
    const scope = createConnectScope();

    expect(build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2) }, pt(9, 9))).toBe("路由路径");
  });

  test("源点缺省时按端子取模型端点", () => {
    const scope = createConnectScope();

    build(scope)({ nodeId: "n1", terminalId: "t1" }, pt(9, 9));

    expect(scope.getModelEdgeEndpointPoint).toHaveBeenCalledWith(scope.visibleNodeById.get("n1"), undefined, "t1");
  });

  test("路由没产出路径时退回空串", () => {
    const scope = createConnectScope({ routeEdgesForStoredRendering: vi.fn(() => []) });

    expect(build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2) }, pt(9, 9))).toBe("");
  });

  test("目标节点是母线时目标点取外部给的点", () => {
    const scope = createConnectScope();
    const bus = { id: "bus1", kind: "ac-bus" };

    build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2) }, pt(9, 9), null, { node: bus, terminalId: "t1", point: pt(50, 50) });

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[1][0].targetPoint).toEqual(pt(50, 50));
  });

  test("目标节点不是母线时目标点原样透传（缺省即 undefined，交给路由器按端子解析）", () => {
    const scope = createConnectScope();
    const dev = { id: "n2", kind: "ac-load" };

    build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2) }, pt(9, 9), null, { node: dev, terminalId: "t1" });

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[1][0].targetPoint).toBeUndefined();
  });

  test("无目标节点时目标点退回当前鼠标点", () => {
    const scope = createConnectScope();

    build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2) }, pt(9, 9));

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[1][0].targetPoint).toEqual(pt(9, 9));
  });

  test("显式 targetPoint 优先于鼠标点", () => {
    const scope = createConnectScope();

    build(scope)({ nodeId: "n1", terminalId: "t1", point: pt(2, 2) }, pt(9, 9), pt(7, 7));

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[1][0].targetPoint).toEqual(pt(7, 7));
  });
});

describe("createBuildRoutableLinePreviewPath", () => {
  function createScope(over: Record<string, any> = {}) {
    return {
      canvasBounds: { width: 100, height: 100 },
      connectTargetPoint: vi.fn((t: any) => t.point ?? pt(0, 0)),
      compactPreviewNodes: vi.fn(() => [{ id: "n1" }]),
      pointsToPreviewPath: vi.fn((points: any[]) => `直连${points.length}点`),
      buildManualConnectionPreviewPath: vi.fn(() => "手工路径"),
      routeEdgesForStoredRendering: vi.fn(() => [{ path: "路由路径" }]),
      ...over
    };
  }

  const placement = (over: Record<string, any> = {}) => ({ source: { node: { id: "n1" }, terminalId: "t1", point: pt(2, 2) }, ...over });

  test("无放置状态或无鼠标点时返回空串", () => {
    const build = createBuildRoutableLinePreviewPath(createScope());
    expect(build(null as any, pt(0, 0))).toBe("");
    expect(build(placement(), null)).toBe("");
  });

  test("有手工点时走手工路径", () => {
    const scope = createScope();
    const manual = [pt(3, 3)];

    const path = createBuildRoutableLinePreviewPath(scope)(placement({ manualPoints: manual }), pt(9, 9));

    expect(path).toBe("手工路径");
    expect(scope.routeEdgesForStoredRendering).not.toHaveBeenCalled();
  });

  test("有路由结果时用路由路径", () => {
    expect(createBuildRoutableLinePreviewPath(createScope())(placement(), pt(9, 9))).toBe("路由路径");
  });

  test("路由无结果时退回两点直连", () => {
    const scope = createScope({ routeEdgesForStoredRendering: vi.fn(() => []) });

    expect(createBuildRoutableLinePreviewPath(scope)(placement(), pt(9, 9))).toBe("直连2点");
  });

  test("有目标节点时目标点按端子解析", () => {
    const scope = createScope();

    createBuildRoutableLinePreviewPath(scope)(placement(), pt(9, 9), null, { node: { id: "n2" }, terminalId: "t1", point: pt(50, 50) });

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[1][0].targetPoint).toEqual(pt(50, 50));
  });

  test("无目标节点时目标点用鼠标点", () => {
    const scope = createScope();

    createBuildRoutableLinePreviewPath(scope)(placement(), pt(9, 9));

    expect(callArgs(scope.routeEdgesForStoredRendering, 0)[1][0].targetPoint).toEqual(pt(9, 9));
  });
});
