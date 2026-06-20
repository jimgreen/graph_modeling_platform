import { describe, expect, test } from "vitest";
import {
  createDeleteGraphTemplate,
  createDeleteGraphTemplateType,
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
  rebuildRoutableLineDeviceRouteUpdates,
  projectPointToBusCenterline,
  routeEdgesForStoredRendering,
  routeIntersectsEndpointNodeBodies,
  type Edge,
  type ModelNode,
  type Point,
  routableLineDeviceCanvasPoints,
  routeIntersectsSpecificNodes,
  type RoutedEdge,
  setRoutableLineDeviceCanvasPoints,
  setRoutableLineDeviceEndpoints
} from "./model";

type TestBox = { left: number; right: number; top: number; bottom: number };

const sampleGraphTemplate = (id: string, name: string, typeName = "常用模板") => ({
  id,
  typeName,
  name,
  sourceSize: { width: 120, height: 80 },
  clipboard: { nodes: [], edges: [], groups: [] },
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z"
});

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

describe("graph template library actions", () => {
  test("deletes a graph template and persists the template library", () => {
    const remaining = sampleGraphTemplate("template-keep", "保留模板");
    const deleted = sampleGraphTemplate("template-delete", "删除模板");
    const setCustomGraphTemplatesCalls: any[] = [];
    const persistTemplateLibraryChangeCalls: any[] = [];
    const operationLogs: string[] = [];
    let templateMenu: any = { templateId: deleted.id };
    const deleteGraphTemplate = createDeleteGraphTemplate({
      customGraphTemplateTypes: ["常用模板"],
      customGraphTemplates: [remaining, deleted],
      persistTemplateLibraryChange: (payload: any) => persistTemplateLibraryChangeCalls.push(payload),
      setCustomGraphTemplates: (templates: any[]) => setCustomGraphTemplatesCalls.push(templates),
      setTemplateMenu: (next: any) => { templateMenu = next; },
      writeOperationLog: (message: string) => operationLogs.push(message)
    });

    deleteGraphTemplate(deleted);

    expect(setCustomGraphTemplatesCalls).toEqual([[remaining]]);
    expect(persistTemplateLibraryChangeCalls).toEqual([{
      customGraphTemplateTypes: ["常用模板"],
      customGraphTemplates: [remaining]
    }]);
    expect(templateMenu).toBeNull();
    expect(operationLogs).toContain("删除模板：常用模板 / 删除模板");
  });

  test("deletes a graph template type and all templates under it", () => {
    const firstDeleted = sampleGraphTemplate("template-delete-1", "删除模板1", "自定义类型");
    const secondDeleted = sampleGraphTemplate("template-delete-2", "删除模板2", "自定义类型");
    const remaining = sampleGraphTemplate("template-keep", "保留模板", "其他类型");
    const setCustomGraphTemplateTypesCalls: any[] = [];
    const setCustomGraphTemplatesCalls: any[] = [];
    const persistTemplateLibraryChangeCalls: any[] = [];
    const operationLogs: string[] = [];
    let templateMenu: any = { typeName: "自定义类型" };
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      ...(originalWindow ?? {}),
      confirm: (message: string) => {
        expect(message).toContain("自定义类型");
        expect(message).toContain("2");
        return true;
      }
    };
    const deleteGraphTemplateType = createDeleteGraphTemplateType({
      customGraphTemplateTypes: ["自定义类型", "其他类型"],
      customGraphTemplates: [firstDeleted, remaining, secondDeleted],
      persistTemplateLibraryChange: (payload: any) => persistTemplateLibraryChangeCalls.push(payload),
      requireEditMode: () => true,
      setCustomGraphTemplateTypes: (types: string[]) => setCustomGraphTemplateTypesCalls.push(types),
      setCustomGraphTemplates: (templates: any[]) => setCustomGraphTemplatesCalls.push(templates),
      setTemplateMenu: (next: any) => { templateMenu = next; },
      writeOperationLog: (message: string) => operationLogs.push(message)
    });

    try {
      deleteGraphTemplateType("自定义类型");
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }

    expect(setCustomGraphTemplateTypesCalls).toEqual([["其他类型"]]);
    expect(setCustomGraphTemplatesCalls).toEqual([[remaining]]);
    expect(persistTemplateLibraryChangeCalls).toEqual([{
      customGraphTemplateTypes: ["其他类型"],
      customGraphTemplates: [remaining]
    }]);
    expect(templateMenu).toBeNull();
    expect(operationLogs).toContain("删除模板类型：自定义类型（2 个模板）");
  });
});

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
      getRouteBlockingCandidateNodesFromBoxes,
      getRouteBlockingCandidates,
      getRouteEndpointNormal,
      isBusNode,
      nodeForRoutingList,
      pointsToOrthogonalPath,
      preserveDraggedRouteShape,
      routeEdgesForStoredRendering,
      routeIntersectsEndpointNodeBodies,
      routeIntersectsSpecificNodes,
      sameOptionalPointList
    });

    const route = lightweightMovedEndpointRoute(
      edge,
      previousRoute,
      [bus, movedSource],
      new Set([movedSource.id]),
      { width: 900, height: 620 }
    );

    expect(route === null || !routeIntersectsTestBox(route.points, calculateNodeBodyBounds(movedSource))).toBe(true);
  });

  test("skips lightweight moved endpoint cache patches that still cross nearby device blockers", () => {
    const source = {
      ...createDefaultNode("ac-box-breaker", { x: 160, y: 220 }),
      id: "moved-source-for-unsafe-cache"
    };
    const target = {
      ...createDefaultNode("ac-box-breaker", { x: 420, y: 220 }),
      id: "stationary-target-for-unsafe-cache"
    };
    const blocker = {
      ...createDefaultNode("ac-box-breaker", { x: 280, y: 220 }),
      id: "nearby-blocker-for-unsafe-cache"
    };
    const unsafeRoutePoints = [
      { x: 180, y: 220 },
      { x: 280, y: 220 },
      { x: 400, y: 220 }
    ];
    const previousRoute: RoutedEdge = {
      edgeId: "unsafe-cache-route",
      points: [
        { x: 140, y: 220 },
        { x: 260, y: 220 },
        { x: 400, y: 220 }
      ],
      path: ""
    };
    const edge: Edge = {
      id: "unsafe-cache-route",
      sourceId: source.id,
      targetId: target.id
    };
    const lightweightMovedEndpointRoute = createLightweightMovedEndpointRoute({
      clampPointToBounds,
      getModelEdgeEndpointPoint: (node: ModelNode) => node.id === source.id ? unsafeRoutePoints[0] : unsafeRoutePoints[unsafeRoutePoints.length - 1],
      getRouteBlockingCandidateNodesFromBoxes,
      getRouteBlockingCandidates,
      getRouteEndpointNormal: () => ({ x: 1, y: 0 }),
      isBusNode: () => false,
      nodeForRoutingList,
      pointsToOrthogonalPath,
      preserveDraggedRouteShape: () => unsafeRoutePoints,
      routeEdgesForStoredRendering: () => [{
        edgeId: edge.id,
        points: unsafeRoutePoints,
        path: pointsToOrthogonalPath(unsafeRoutePoints)
      }],
      routeIntersectsEndpointNodeBodies,
      routeIntersectsSpecificNodes,
      sameOptionalPointList
    });

    expect(routeIntersectsSpecificNodes(unsafeRoutePoints, edge, [blocker])).toBe(true);

    const route = lightweightMovedEndpointRoute(
      edge,
      previousRoute,
      [source, target, blocker],
      new Set([source.id]),
      { width: 640, height: 480 }
    );

    expect(route).toBeNull();
  });

  test("repairs routable line routes that turn back through a moved endpoint device body", () => {
    const source = {
      ...createDefaultNode("ac-box-breaker", { x: 180, y: 260 }),
      id: "moved-routable-source"
    };
    const target = {
      ...createDefaultNode("ac-box-breaker", { x: 460, y: 260 }),
      id: "stationary-routable-target"
    };
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(target, "t1");
    const baseLine = setRoutableLineDeviceEndpoints(
      {
        ...createDefaultNode("ac-zero-routable-branch", { x: 320, y: 260 }),
        id: "endpoint-body-routable-line"
      },
      sourcePoint,
      targetPoint,
      {
        source: { nodeId: source.id, terminalId: "t2" },
        target: { nodeId: target.id, terminalId: "t1" }
      }
    );
    const unsafeLine = setRoutableLineDeviceCanvasPoints(baseLine, [
      sourcePoint,
      { x: source.position.x, y: sourcePoint.y },
      { x: targetPoint.x, y: sourcePoint.y },
      targetPoint
    ]);
    const unsafePoints = routableLineDeviceCanvasPoints(unsafeLine);
    const routeEdge: Edge = {
      id: "endpoint-body-routable-line-route",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    expect(routeIntersectsEndpointNodeBodies(unsafePoints, routeEdge, [source, target])).toBe(true);

    const updates = rebuildRoutableLineDeviceRouteUpdates(
      [source, target, unsafeLine],
      [unsafeLine.id],
      { width: 760, height: 520 },
      [source, target, unsafeLine],
      { movedNodeIds: [source.id] }
    );

    expect(updates.some((node) => node.id === unsafeLine.id)).toBe(true);
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
