// 连线重绘的三种作用域：selected（只重画选中的）/ all（当前图层全部）/ viewport（视口附近）。
// 三条都要过「属于当前活动图层」这道闸；viewport 还要去重 ——
// 空间索引对同一条边的多段路由会返回多条记录。
import { describe, expect, test, vi } from "vitest";

import {
  createConnectionRedrawEdgeIdsForScope,
  createConnectionRedrawLineNodeIdsForScope,
  createConnectionRedrawTargetsForScope,
  createConnectionRedrawViewportBounds
} from "./appExtracted/appProjectCanvasFactories";

const edge = (id: string) => ({ id, sourceId: "n1", targetId: "n2" });
const lineNode = (id: string) => ({ id, kind: "dc-line" });
const plainNode = (id: string) => ({ id, kind: "ac-load" });

describe("createConnectionRedrawViewportBounds", () => {
  test("可见 viewBox 有效时用它换算成左右上下", () => {
    const scope = {
      canvasVisibleViewBoxRef: { current: { x: 10, y: 20, width: 100, height: 50 } },
      viewBox: { x: 0, y: 0, width: 999, height: 999 }
    };

    expect(createConnectionRedrawViewportBounds(scope)()).toEqual({ left: 10, right: 110, top: 20, bottom: 70 });
  });

  test("可见 viewBox 宽或高为 0 时退回全量 viewBox", () => {
    const scope = {
      canvasVisibleViewBoxRef: { current: { x: 10, y: 20, width: 0, height: 50 } },
      viewBox: { x: 0, y: 0, width: 200, height: 100 }
    };

    expect(createConnectionRedrawViewportBounds(scope)()).toEqual({ left: 0, right: 200, top: 0, bottom: 100 });
  });

  test("宽高都有效时忽略全量 viewBox", () => {
    const scope = {
      canvasVisibleViewBoxRef: { current: { x: 1, y: 2, width: 3, height: 4 } },
      viewBox: { x: 0, y: 0, width: 200, height: 100 }
    };

    expect(createConnectionRedrawViewportBounds(scope)()).toMatchObject({ left: 1, top: 2, right: 4, bottom: 6 });
  });
});

describe("createConnectionRedrawEdgeIdsForScope", () => {
  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      activeLayerEdgeIdSet: new Set(["e1", "e2"]),
      activeLayerEdges: [edge("e1"), edge("e2")],
      activeSelectedEdgeIds: ["e1", "e1", "e9"],
      connectionRedrawViewportBounds: vi.fn(() => ({ left: 0, right: 10, top: 0, bottom: 10 })),
      routedEdgeSpatialIndex: { sentinel: true },
      queryRouteSpatialIndex: vi.fn(() => [{ edgeId: "e1" }, { edgeId: "e1" }, { edgeId: "e2" }, { edgeId: "e9" }]),
      ...over
    };
    scope.connectionRedrawEdgeIdsForScope = createConnectionRedrawEdgeIdsForScope(scope);
    return scope;
  }

  test("selected：只取选中且属于活动图层的边，并去重", () => {
    expect(createScope().connectionRedrawEdgeIdsForScope("selected")).toEqual(["e1"]);
  });

  test("all：取活动图层的全部边", () => {
    expect(createScope().connectionRedrawEdgeIdsForScope("all")).toEqual(["e1", "e2"]);
  });

  test("viewport：只取空间索引命中且属于活动图层的边，并去重", () => {
    expect(createScope().connectionRedrawEdgeIdsForScope("viewport")).toEqual(["e1", "e2"]);
  });

  test("viewport：按视口矩形查询", () => {
    const scope = createScope();

    scope.connectionRedrawEdgeIdsForScope("viewport");

    expect(scope.queryRouteSpatialIndex.mock.calls[0][1]).toEqual({ left: 0, right: 10, top: 0, bottom: 10 });
  });

  test("selected 不查空间索引", () => {
    const scope = createScope();

    scope.connectionRedrawEdgeIdsForScope("selected");

    expect(scope.queryRouteSpatialIndex).not.toHaveBeenCalled();
  });
});

describe("createConnectionRedrawLineNodeIdsForScope", () => {
  function createScope(over: Record<string, any> = {}) {
    const scope: Record<string, any> = {
      activeLayerNodeIdSet: new Set(["l1", "l2", "p1"]),
      activeLayerNodes: [lineNode("l1"), lineNode("l2"), plainNode("p1")],
      activeSelectedNodeIds: ["l1", "l1", "p1", "不在活动层"],
      nodeById: new Map([
        ["l1", lineNode("l1")],
        ["l2", lineNode("l2")],
        ["p1", plainNode("p1")]
      ]),
      isRoutableLineDeviceKind: vi.fn((kind: string) => kind === "dc-line"),
      connectionRedrawViewportBounds: vi.fn(() => ({ left: 0, right: 10, top: 0, bottom: 10 })),
      visibleNodeSpatialIndex: { sentinel: true },
      queryNodeSpatialIndex: vi.fn(() => [lineNode("l1"), lineNode("l1"), lineNode("l2"), plainNode("p1"), lineNode("l9")]),
      ...over
    };
    scope.connectionRedrawLineNodeIdsForScope = createConnectionRedrawLineNodeIdsForScope(scope);
    return scope;
  }

  test("selected：只取选中的可布线路径元件并去重", () => {
    expect(createScope().connectionRedrawLineNodeIdsForScope("selected")).toEqual(["l1"]);
  });

  test("all：取活动图层全部可布线路径元件（普通设备被排除）", () => {
    expect(createScope().connectionRedrawLineNodeIdsForScope("all")).toEqual(["l1", "l2"]);
  });

  test("viewport：只取视口附近且属于活动图层的可布线路径元件", () => {
    expect(createScope().connectionRedrawLineNodeIdsForScope("viewport")).toEqual(["l1", "l2"]);
  });

  test("查不到的节点被跳过", () => {
    const scope = createScope({ nodeById: new Map() });

    expect(scope.connectionRedrawLineNodeIdsForScope("selected")).toEqual([]);
  });

  test("按视口矩形查询", () => {
    const scope = createScope();

    scope.connectionRedrawLineNodeIdsForScope("viewport");

    expect(scope.queryNodeSpatialIndex.mock.calls[0][1]).toEqual({ left: 0, right: 10, top: 0, bottom: 10 });
  });
});

describe("createConnectionRedrawTargetsForScope", () => {
  test("合并两批 id 并给出总数", () => {
    const scope = {
      connectionRedrawEdgeIdsForScope: vi.fn(() => ["e1", "e2"]),
      connectionRedrawLineNodeIdsForScope: vi.fn(() => ["l1"])
    };

    expect(createConnectionRedrawTargetsForScope(scope)("all")).toEqual({
      edgeIds: ["e1", "e2"],
      lineNodeIds: ["l1"],
      total: 3
    });
  });

  test("两批都空时总数为 0", () => {
    const scope = {
      connectionRedrawEdgeIdsForScope: vi.fn(() => []),
      connectionRedrawLineNodeIdsForScope: vi.fn(() => [])
    };

    expect(createConnectionRedrawTargetsForScope(scope)("selected").total).toBe(0);
  });

  test("作用域原样透传给两个子查询", () => {
    const scope = {
      connectionRedrawEdgeIdsForScope: vi.fn(() => []),
      connectionRedrawLineNodeIdsForScope: vi.fn(() => [])
    };

    createConnectionRedrawTargetsForScope(scope)("viewport");

    expect(scope.connectionRedrawEdgeIdsForScope).toHaveBeenCalledWith("viewport");
    expect(scope.connectionRedrawLineNodeIdsForScope).toHaveBeenCalledWith("viewport");
  });
});
