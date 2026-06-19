import { describe, expect, test } from "vitest";
import {
  createLightweightMovedEndpointRoute,
  createRoutePointsForMovedEdgesBlockedByStationaryNodes,
  createShouldRunDeferredMoveOptimization
} from "./appExtracted/appSelectionDragFactories";
import {
  calculateNodeBodyBounds,
  clampPointToBounds,
  createDefaultNode,
  getEdgeEndpointPoint,
  getRouteBlockingCandidateNodesFromBoxes,
  getRouteBlockingCandidates,
  getRouteEndpointNormal,
  getTerminalPoint,
  isBusNode,
  pointsToOrthogonalPath,
  preserveDraggedRouteShape,
  projectPointToBusCenterline,
  routeEdgesForStoredRendering,
  routeIntersectsEndpointNodeBodies,
  type Edge,
  type ModelNode,
  type Point,
  routeIntersectsSpecificNodes,
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

  test("keeps deferred blocker repair enabled for nearby unrelated routes after multi-connection moves", () => {
    const shouldRunDeferredMoveOptimization = createShouldRunDeferredMoveOptimization({});
    const connectedA: Edge = {
      id: "connected-a",
      sourceId: "left",
      targetId: "moved"
    };
    const connectedB: Edge = {
      id: "connected-b",
      sourceId: "moved",
      targetId: "right"
    };
    const nearbyUnrelated: Edge = {
      id: "nearby-unrelated",
      sourceId: "top",
      targetId: "bottom"
    };

    expect(
      shouldRunDeferredMoveOptimization([connectedA, connectedB], ["moved"], new Set())
    ).toBe(false);
    expect(
      shouldRunDeferredMoveOptimization([connectedA, connectedB, nearbyUnrelated], ["moved"], new Set())
    ).toBe(true);
  });

  test("marks moved endpoint routes that cross the moved endpoint device body for repair", () => {
    const bus = {
      ...createDefaultNode("ac-bus", { x: 340, y: 120 }),
      id: "endpoint-body-bus",
      size: { width: 520, height: 16 }
    };
    const groundDisconnectorBase = createDefaultNode("ac-ground-disconnector", { x: 340, y: 300 });
    const groundDisconnector = {
      ...groundDisconnectorBase,
      id: "moved-ground-disconnector",
      params: {
        ...groundDisconnectorBase.params,
        _labelVisible: "0",
        _labelDisplayMode: "hidden"
      }
    };
    const targetPoint = getTerminalPoint(groundDisconnector, "t1");
    const sourcePoint = projectPointToBusCenterline(bus, { x: groundDisconnector.position.x + 84, y: bus.position.y });
    const crossingRoute = [
      sourcePoint,
      { x: sourcePoint.x, y: targetPoint.y },
      targetPoint
    ];
    const edge: Edge = {
      id: "bus-to-moved-ground-disconnector",
      sourceId: bus.id,
      targetId: groundDisconnector.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint,
      targetPoint,
      routePoints: crossingRoute,
      manualPoints: crossingRoute.slice(1, -1)
    };
    const routePointsForMovedEdgesBlockedByStationaryNodes = createRoutePointsForMovedEdgesBlockedByStationaryNodes({
      canvasBounds: { width: 720, height: 480 },
      getRouteBlockingCandidateNodesFromBoxes,
      getRouteBlockingCandidates,
      routeEdgesForStoredRendering,
      routeIntersectsEndpointNodeBodies,
      routeIntersectsSpecificNodes,
      routingNodesForConnectionEdges: (_candidateEdges: Edge[], nextNodes: ModelNode[]) => nextNodes
    });

    expect(routeIntersectsTestBox(crossingRoute, calculateNodeBodyBounds(groundDisconnector))).toBe(true);
    expect(routeIntersectsEndpointNodeBodies(crossingRoute, edge, [groundDisconnector])).toBe(true);
    expect(routeEdgesForStoredRendering(
      [bus, groundDisconnector],
      [edge],
      { width: 720, height: 480 },
      { preserveManualRouteDisplay: true }
    )[0]?.points).toEqual(crossingRoute);

    const blockedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
      [bus, groundDisconnector],
      [edge],
      [groundDisconnector.id],
      {},
      { width: 720, height: 480 }
    );

    expect(blockedRoutePoints[edge.id]).toEqual(crossingRoute);
  });

  test("marks moved endpoint routes that cross the stationary endpoint device body for repair", () => {
    const sourceBase = createDefaultNode("ac-box-breaker", { x: 120, y: 220 });
    const source = {
      ...sourceBase,
      id: "moved-box-breaker",
      params: {
        ...sourceBase.params,
        _labelVisible: "0",
        _labelDisplayMode: "hidden"
      }
    };
    const breakerBase = createDefaultNode("ac-breaker", { x: 360, y: 300 });
    const breaker = {
      ...breakerBase,
      id: "stationary-vertical-breaker",
      rotation: 90,
      params: {
        ...breakerBase.params,
        _labelVisible: "0",
        _labelDisplayMode: "hidden"
      }
    };
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(breaker, "t2");
    const crossingRoute = [
      sourcePoint,
      { x: breaker.position.x, y: sourcePoint.y },
      targetPoint
    ];
    const edge: Edge = {
      id: "moved-source-to-stationary-breaker",
      sourceId: source.id,
      targetId: breaker.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t2",
      routePoints: crossingRoute,
      manualPoints: crossingRoute.slice(1, -1)
    };
    const routePointsForMovedEdgesBlockedByStationaryNodes = createRoutePointsForMovedEdgesBlockedByStationaryNodes({
      canvasBounds: { width: 800, height: 600 },
      getRouteBlockingCandidateNodesFromBoxes,
      getRouteBlockingCandidates,
      routeEdgesForStoredRendering,
      routeIntersectsEndpointNodeBodies,
      routeIntersectsSpecificNodes,
      routingNodesForConnectionEdges: (_candidateEdges: Edge[], nextNodes: ModelNode[]) => nextNodes
    });

    expect(routeIntersectsEndpointNodeBodies(crossingRoute, edge, [breaker])).toBe(true);
    expect(routeEdgesForStoredRendering(
      [source, breaker],
      [edge],
      { width: 800, height: 600 },
      { preserveManualRouteDisplay: true }
    )[0]?.points).toEqual(crossingRoute);

    const blockedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
      [source, breaker],
      [edge],
      [source.id],
      {},
      { width: 800, height: 600 }
    );

    expect(blockedRoutePoints[edge.id]).toEqual(crossingRoute);
  });
});
