import { describe, expect, test } from "vitest";
import { createLightweightMovedEndpointRoute } from "./appExtracted/appSelectionDragFactories";
import {
  calculateNodeBodyBounds,
  clampPointToBounds,
  createDefaultNode,
  getEdgeEndpointPoint,
  getRouteEndpointNormal,
  getTerminalPoint,
  isBusNode,
  pointsToOrthogonalPath,
  preserveDraggedRouteShape,
  projectPointToBusCenterline,
  routeEdgesForStoredRendering,
  type Edge,
  type ModelNode,
  type Point,
  type RoutedEdge
} from "./model";

type TestBox = { left: number; right: number; top: number; bottom: number };

function routeIntersectsTestBox(points: Point[], box: TestBox) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (previous.x === point.x) {
      const yMin = Math.min(previous.y, point.y);
      const yMax = Math.max(previous.y, point.y);
      if (previous.x > box.left && previous.x < box.right && yMax > box.top && yMin < box.bottom) {
        return true;
      }
    }
    if (previous.y === point.y) {
      const xMin = Math.min(previous.x, point.x);
      const xMax = Math.max(previous.x, point.x);
      if (previous.y > box.top && previous.y < box.bottom && xMax > box.left && xMin < box.right) {
        return true;
      }
    }
  }
  return false;
}

function sameOptionalPointList(first: Point[] | undefined, second: Point[] | undefined) {
  if (first === second) {
    return true;
  }
  if (!first || !second || first.length !== second.length) {
    return false;
  }
  return first.every((point, index) => point.x === second[index].x && point.y === second[index].y);
}

function nodeForRoutingList(nodes: ModelNode[], nodeId: string) {
  return nodes.find((node) => node.id === nodeId);
}

describe("selection drag route cache patches", () => {
  test("keeps lightweight moved endpoint cache routes out of the endpoint device body", () => {
    const oldSource = {
      ...createDefaultNode("ac-source", { x: 340, y: 420 }),
      id: "moved-ac-source"
    };
    const movedSource = {
      ...oldSource,
      position: { x: 360, y: 420 }
    };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 360, y: 120 }),
      id: "top-bus",
      size: { width: 720, height: 16 }
    };
    const oldSourceTerminal = getTerminalPoint(oldSource, "t1");
    const busPoint = projectPointToBusCenterline(bus, { x: 360, y: 120 });
    const previousRoute: RoutedEdge = {
      edgeId: "bus-to-source",
      points: [
        busPoint,
        { x: busPoint.x, y: oldSourceTerminal.y },
        oldSourceTerminal
      ],
      path: ""
    };
    const edge: Edge = {
      id: "bus-to-source",
      sourceId: bus.id,
      targetId: movedSource.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint: busPoint
    };
    const lightweightMovedEndpointRoute = createLightweightMovedEndpointRoute({
      clampPointToBounds,
      getModelEdgeEndpointPoint: getEdgeEndpointPoint,
      getRouteEndpointNormal,
      isBusNode,
      nodeForRoutingList,
      pointsToOrthogonalPath,
      preserveDraggedRouteShape,
      routeEdgesForStoredRendering,
      sameOptionalPointList
    });

    const route = lightweightMovedEndpointRoute(
      edge,
      previousRoute,
      [bus, movedSource],
      new Set([movedSource.id]),
      { width: 900, height: 620 }
    );

    expect(route).not.toBeNull();
    expect(routeIntersectsTestBox(route?.points ?? [], calculateNodeBodyBounds(movedSource))).toBe(false);
  });
});
