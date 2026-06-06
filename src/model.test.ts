import { describe, expect, test } from "vitest";
import {
  alignNodes,
  buildTopology,
  buildElementTree,
  buildEFileExport,
  buildEDeviceParameterFile,
  calculateElectricalTopology,
  clearVoltageBaseValuesForScope,
  setVoltageBaseTerminalValuesForScope,
  setVoltageBaseValuesForScope,
  calculateModelContentSize,
  canConnectTerminals,
  buildDefaultDeviceParameterDefinitions,
  buildContainerDeviceParameterViews,
  describeContainerTerminalAssociations,
  calculateNodeVisualBounds,
  calculateModelGeometryBounds,
  canvasResizeMinimumBoundsForGeometry,
  clampNodePositionToBounds,
  canvasResizeBoundsFromPointerDrag,
  canvasResizeOriginShiftFromPointerDrag,
  clampViewBoxDimensionsForZoom,
  geometryBoundsInsideCanvas,
  assignPermanentDeviceIndex,
  createSavedProject,
  createSavedScheme,
  copySavedProjectWithUniqueName,
  copySavedSchemeWithUniqueName,
  findSavedSchemeById,
  flattenSavedProjects,
  flattenSavedSchemes,
  insertChildSavedScheme,
  createDefaultNode,
  createNodeFromTemplate,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  deriveDeviceIndexCounters,
  deleteNodesWithConnectedEdges,
  deleteSavedScheme,
  deleteSavedProject,
  DEVICE_LIBRARY,
  distributeNodes,
  duplicateSavedProject,
  routeOrthogonalEdge,
  routeEdgesForRendering,
  routeEdgesForCachedStoredRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForSavedPathRendering,
  routeEdgesForStoredRendering,
  ACAC_CONVERTER_CONTROL_TYPES,
  AC_GENERATOR_CONTROL_TYPES,
  DCAC_CONVERTER_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  E_SECTION_COLUMNS,
  tidyOrthogonalRoute,
  renameSavedProject,
  renameSavedScheme,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  moveProjectToScheme,
  moveSavedSchemeToParent,
  savedProjectPathOptions,
  moveOrthogonalRouteSegment,
  modelGeometryInsideCanvasBounds,
  insertOrthogonalRouteBend,
  preserveDraggedRouteShape,
  rebuildConnectionRoutesForNodes,
  rebuildExternalConnectionRoutesForMovedNodes,
  rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes,
  rebuildSingleConnectionRoute,
  redrawConnectionRoutesForEdges,
  upsertSavedProject,
  rerouteEdgesAroundMovedNodes,
  routeIntersectsSpecificNodes,
  validateConnectionEdgeRoute,
  validateConnectionEndpointRules,
  voltageBaseSettingModeForNode,
  validateTopology,
  validateTwoTerminalVoltageBaseConsistency,
  validateVoltageSetpointDeviations,
  getTerminalNormal,
  getTerminalPoint,
  getRouteEndpointNormal,
  getBusTerminalType,
  getMovableRouteSegmentIndexes,
  getNodeScaleX,
  getNodeScaleY,
  getDeviceGlyphVariant,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  nodeAllowsResizeTransform,
  ALLOW_RESIZE_TRANSFORM_PARAM,
  isCanvasNodeMovable,
  isRoutableLineDeviceKind,
  getConnectionStrokeColor,
  getTerminalDisplayColor,
  rebuildRoutableLineDeviceRouteUpdates,
  repairUnsafeRoutableLineDeviceRoutes,
  routeRoutableLineDevice,
  createRoutableLineDeviceFromEndpoints,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  setRoutableLineDeviceEndpoints,
  routableLineDeviceCanvasPoints,
  routableLineDeviceLocalPoints,
  ROUTABLE_LINE_POINTS_PARAM,
  ROUTABLE_LINE_DEFAULT_STROKE_WIDTH,
  createStaticBoxNodeFromDrawing,
  createInteractiveStaticDrawingNode,
  getElementFocusPoint,
  getRouteBlockingCandidateNodes,
  segmentIntersectsNodeBody,
  isInteractiveStaticDrawingKind,
  isStaticBoxLikeKind,
  isStaticButtonCapableKind,
  isStaticLineLikeKind,
  isBlockingTopologyValidationError,
  isRepeatedEdgePointerClick,
  parseStaticDrawPoints,
  getContainerAssociationRelationKey,
  getContainerRelationKey,
  getEExportWarnings,
  getEParameterKeys,
  inferESection,
  getTemplateParameterDefinitions,
  getOverlappingTerminalGroups,
  getTerminalBusContactGroups,
  validateContainerTerminalAssociations,
  validateContainerTerminalRoles,
  isGeneratorNode,
  isStaticKind,
  isStaticNode,
  keyboardMoveStepForViewBox,
  viewBoxZoomPercent,
  getSwitchVisualState,
  lockProjectEdgeTerminals,
  mirrorNodes,
  createModelLayer,
  DEFAULT_MODEL_LAYER_ID,
  filterProjectByVisibleLayers,
  hydrateSavedSchemeRuntimeIds,
  normalizeModelGroups,
  normalizeSavedProjectRecordNames,
  normalizeProjectLayers,
  resolveActiveModelLayerId,
  normalizeScaleValue,
  normalizeNodeTerminalsByTemplate,
  normalizeVoltageBaseInput,
  normalizeViewBoxToCanvas,
  prepareConnectionEdgeForCommit,
  projectPointToBusCenterline,
  reconcileOverlappingTerminalConnections,
  resetDeviceIndexesForPaste,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth,
  terminalVoltageBaseNumber,
  topologyCalculationMessage,
  voltageLevelColor,
  boundaryBusInternalConnectorSegment,
  boundaryBusInternalConnectorStrokeWidth,
  DEFAULT_COLOR_PALETTE,
  STATIC_DRAW_POINTS_PARAM,
  STATIC_ROUTE_AVOIDANCE_PARAM,
  serializeProject,
  stripSavedSchemeRuntimeIds,
  synchronizeBusTerminalsWithEdges,
  deserializeProject,
  edgeWithSavedRouteGeometry,
  type Edge,
  type DeviceKind,
  type DeviceTemplate,
  type ModelNode,
  type Point,
  type ProjectFile
} from "./model";

type ParsedESection = {
  columns: string[];
  rows: Record<string, string>[];
};

function parseESections(text: string): Record<string, ParsedESection> {
  const sections: Record<string, ParsedESection> = {};
  const sectionPattern = /<([^/][^>]*)>\s*\r?\n@ ([^\r\n]+)\r?\n([\s\S]*?)<\/\1>/g;
  for (const match of text.matchAll(sectionPattern)) {
    const [, sectionName, header, body] = match;
    const columns = header.trim().split(/\s+/);
    const rows = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("#"))
      .map((line) => {
        const values = line.replace(/^#\s*/, "").trim().split(/\s+/);
        return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
      });
    sections[sectionName] = { columns, rows };
  }
  return sections;
}

function hasImmediateRouteReversal(points: Point[]) {
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const first = { x: current.x - previous.x, y: current.y - previous.y };
    const second = { x: next.x - current.x, y: next.y - current.y };
    if (first.x === 0 && first.y === 0) {
      continue;
    }
    if (second.x === 0 && second.y === 0) {
      continue;
    }
    if (first.y === 0 && second.y === 0 && first.x * second.x < 0) {
      return true;
    }
    if (first.x === 0 && second.x === 0 && first.y * second.y < 0) {
      return true;
    }
  }
  return false;
}

function routeBendCountForTest(points: Point[]) {
  let bends = 0;
  let previousOrientation: "horizontal" | "vertical" | null = null;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const orientation = previous.y === point.y
      ? "horizontal"
      : previous.x === point.x
        ? "vertical"
        : null;
    if (!orientation) {
      continue;
    }
    if (previousOrientation && previousOrientation !== orientation) {
      bends += 1;
    }
    previousOrientation = orientation;
  }
  return bends;
}

function withHiddenDeviceLabel(node: ModelNode): ModelNode {
  return { ...node, params: { ...node.params, _labelVisible: "0", _labelDisplayMode: "hidden" } };
}

function createRightTerminalLoad(position: Point, overrides: Partial<ModelNode> = {}): ModelNode {
  const node = { ...createDefaultNode("ac-load", position), ...overrides };
  return {
    ...node,
    terminals: [{ ...node.terminals[0], anchor: { x: 0.5, y: 0 } }, ...node.terminals.slice(1)]
  };
}

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

describe("power system model", () => {
  test("renders large saved model paths without opening-time rerouting", () => {
    const nodes: ModelNode[] = [];
    const edges: Edge[] = [];
    for (let index = 0; index < 1200; index += 1) {
      const row = Math.floor(index / 40);
      const column = index % 40;
      const kind = index % 5 === 0 ? "ac-bus" : index % 2 === 0 ? "ac-source" : "ac-load";
      const node = {
        ...createDefaultNode(kind, { x: 120 + column * 180, y: 100 + row * 130 }),
        id: `n-${index}`,
        name: `设备-${index}`
      };
      nodes.push(node);
    }
    for (let index = 0; index < 1000; index += 1) {
      const source = nodes[index];
      const target = nodes[index + 80];
      if (!source || !target) {
        continue;
      }
      const midX = Math.round((source.position.x + target.position.x) / 2);
      const midY = Math.round((source.position.y + target.position.y) / 2);
      edges.push({
        id: `e-${index}`,
        sourceId: source.id,
        targetId: target.id,
        manualPoints: [
          { x: midX, y: source.position.y },
          { x: midX, y: midY },
          { x: target.position.x, y: midY }
        ]
      });
    }

    const routes = routeEdgesForSavedPathRendering(nodes, edges, { width: 50000, height: 50000 });

    expect(routes).toHaveLength(edges.length);
    expect(routes.every((route) => route.path.startsWith("M "))).toBe(true);
    expect(Math.max(...routes.map((route) => route.points.length))).toBeLessThanOrEqual(12);
  });

  test("keeps saved manual route points on the model-open render path", () => {
    const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 100, y: 100 }));
    const target = withHiddenDeviceLabel(createRightTerminalLoad({ x: 360, y: 180 }));
    const manualPoints = [
      { x: 207, y: 72 },
      { x: 467, y: 72 }
    ];
    const edge: Edge = {
      id: "saved-manual",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: source.terminals[0].id,
      targetTerminalId: target.terminals[0].id,
      manualPoints
    };

    const route = routeEdgesForSavedPathRendering([source, target], [edge], { width: 520, height: 320 })[0];

    expect(route.points).toEqual(expect.arrayContaining(manualPoints));
  });

  test("persists the current rendered route geometry for saved-path reopening", () => {
    const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 120, y: 120 }));
    const target = withHiddenDeviceLabel(createDefaultNode("ac-load", { x: 420, y: 260 }));
    const edge: Edge = {
      id: "visible-route",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: source.terminals[0].id,
      targetTerminalId: target.terminals[0].id
    };
    const defaultRoute = routeEdgesForSavedPathRendering([source, target], [edge], { width: 800, height: 600 })[0];
    const targetStub = defaultRoute.points[defaultRoute.points.length - 2];
    const renderedRoute = {
      ...defaultRoute,
      points: [
        defaultRoute.points[0],
        defaultRoute.points[1],
        { x: 210, y: 92 },
        { x: targetStub.x, y: 92 },
        targetStub,
        defaultRoute.points[defaultRoute.points.length - 1]
      ]
    };

    const persisted = lockProjectEdgeTerminals({
      version: 1,
      name: "saved-route",
      canvasWidth: 800,
      canvasHeight: 600,
      nodes: [source, target],
      edges: [edgeWithSavedRouteGeometry(edge, renderedRoute, source, target)]
    });
    const reopenedRoute = routeEdgesForSavedPathRendering(persisted.nodes, persisted.edges, { width: 800, height: 600 }, { refreshCrossingArcs: false })[0];

    expect(persisted.edges[0].sourcePoint).toBeUndefined();
    expect(persisted.edges[0].targetPoint).toBeUndefined();
    expect(persisted.edges[0].manualPoints).toEqual([
      { x: 210, y: 92 },
      { x: targetStub.x, y: 92 }
    ]);
    expect(persisted.edges[0].routePoints).toEqual(renderedRoute.points);
    expect(reopenedRoute.points).toEqual(renderedRoute.points);
  });

  test("persists bus endpoint landing points from the current rendered route", () => {
    const bus = withHiddenDeviceLabel(createDefaultNode("ac-bus", { x: 280, y: 120 }));
    const load = withHiddenDeviceLabel(createDefaultNode("ac-load", { x: 480, y: 260 }));
    const edge: Edge = {
      id: "visible-bus-route",
      sourceId: bus.id,
      targetId: load.id,
      targetTerminalId: load.terminals[0].id
    };
    const busLanding = { x: 310, y: 120 };
    const defaultRoute = routeEdgesForSavedPathRendering([bus, load], [edge], { width: 800, height: 600 })[0];
    const renderedRoute = {
      ...defaultRoute,
      points: [
        busLanding,
        { x: 310, y: 152 },
        { x: 390, y: 152 },
        { x: 390, y: 228 },
        defaultRoute.points[defaultRoute.points.length - 2],
        defaultRoute.points[defaultRoute.points.length - 1]
      ]
    };

    const persisted = lockProjectEdgeTerminals({
      version: 1,
      name: "saved-bus-route",
      canvasWidth: 800,
      canvasHeight: 600,
      nodes: [bus, load],
      edges: [edgeWithSavedRouteGeometry(edge, renderedRoute, bus, load)]
    });

    expect(persisted.edges[0].sourcePoint).toEqual(busLanding);
    expect(persisted.edges[0].targetPoint).toBeUndefined();
    expect(persisted.edges[0].routePoints).toEqual(renderedRoute.points);
    expect(persisted.edges[0].manualPoints).toEqual([
      { x: 390, y: 152 },
      { x: 390, y: 228 }
    ]);
  });

  test("does not scan node or edge arrays when there are no model groups", () => {
    const nodes = [] as ModelNode[];
    const edges = [] as Edge[];
    nodes.map = () => {
      throw new Error("node scan should be skipped for empty groups");
    };
    edges.map = () => {
      throw new Error("edge scan should be skipped for empty groups");
    };

    expect(normalizeModelGroups([], nodes, edges)).toEqual([]);
    expect(normalizeModelGroups(undefined, nodes, edges)).toEqual([]);
  });

  test("builds adjacency topology from connection lines", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-bus", { x: 100, y: 100 }),
      createDefaultNode("ac-line", { x: 220, y: 100 }),
      createDefaultNode("ac-load", { x: 340, y: 100 })
    ];
    const edges: Edge[] = [
      { id: "e1", sourceId: nodes[0].id, targetId: nodes[1].id },
      { id: "e2", sourceId: nodes[1].id, targetId: nodes[2].id }
    ];

    const topology = buildTopology(nodes, edges);

    expect(topology.nodes[nodes[1].id].degree).toBe(2);
    expect(topology.nodes[nodes[0].id].neighbors).toEqual([nodes[1].id]);
    expect(topology.connectedComponents).toEqual([[nodes[0].id, nodes[1].id, nodes[2].id]]);
  });

  test("can render saved connection geometry without full obstacle-aware rerouting", () => {
    const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 100, y: 100 }));
    const target = withHiddenDeviceLabel(createRightTerminalLoad({ x: 360, y: 180 }));
    const blocker = withHiddenDeviceLabel(createRightTerminalLoad({ x: 210, y: 180 }));
    const manualPoints = [
      { x: 207, y: 263 },
      { x: 300, y: 263 }
    ];
    const edge: Edge = {
      id: "e1",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: source.terminals[0].id,
      targetTerminalId: target.terminals[0].id,
      manualPoints
    };

    const route = routeEdgesForStoredRendering([source, target, blocker], [edge], { width: 520, height: 320 })[0];

    expect(route.points).toContainEqual(manualPoints[0]);
    expect(route.points.some((point) => point.y === 263)).toBe(true);
    expect(route.path).toContain("M");
    expect(route.path).toContain("L");
  });

  test("renders unstored bus endpoint connections without folded backtracking", () => {
    const switchNode = { ...createDefaultNode("ac-switch", { x: 360, y: 210 }), id: "switch" };
    const bus = { ...createDefaultNode("ac-bus", { x: 540, y: 210 }), id: "bus" };
    const edge: Edge = {
      id: "switch-to-bus-without-stored-point",
      sourceId: switchNode.id,
      targetId: bus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForStoredRendering([switchNode, bus], [edge], { width: 900, height: 420 })[0];

    expect(route.points[0]).toEqual(getTerminalPoint(switchNode, "t2"));
    expect(route.points[route.points.length - 1]).toEqual(projectPointToBusCenterline(bus, getTerminalPoint(switchNode, "t2")));
    expect(hasImmediateRouteReversal(route.points)).toBe(false);
    expect(route.points.length).toBeLessThanOrEqual(5);
  });

  test("incremental rendering reroutes only affected connections and keeps others stored", () => {
    const unaffectedSource = createDefaultNode("ac-source", { x: 100, y: 220 });
    const unaffectedTarget = createDefaultNode("ac-load", { x: 360, y: 220 });
    const affectedSource = createDefaultNode("ac-line", { x: 50, y: 100 });
    const affectedTarget = createDefaultNode("ac-line", { x: 450, y: 100 });
    const blocker = createDefaultNode("ac-load", { x: 250, y: 100 });
    const unaffectedManualPoints = [
      { x: 160, y: 100 },
      { x: 160, y: 220 },
      { x: 300, y: 220 }
    ];
    const unaffected: Edge = {
      id: "unaffected",
      sourceId: unaffectedSource.id,
      targetId: unaffectedTarget.id,
      sourceTerminalId: unaffectedSource.terminals[0].id,
      targetTerminalId: unaffectedTarget.terminals[0].id,
      manualPoints: unaffectedManualPoints
    };
    const affected: Edge = {
      id: "affected",
      sourceId: affectedSource.id,
      targetId: affectedTarget.id,
      sourceTerminalId: affectedSource.terminals[1].id,
      targetTerminalId: affectedTarget.terminals[0].id
    };
    const nodes = [unaffectedSource, unaffectedTarget, affectedSource, affectedTarget, blocker];
    const edges = [unaffected, affected];

    const stored = routeEdgesForStoredRendering(nodes, edges, { width: 520, height: 360 });
    const incremental = routeEdgesForIncrementalRendering(nodes, edges, new Set(["affected"]), { width: 520, height: 360 });

    expect(incremental.find((route) => route.edgeId === "unaffected")?.points).toEqual(
      stored.find((route) => route.edgeId === "unaffected")?.points
    );
    const affectedRoute = incremental.find((route) => route.edgeId === "affected");
    const blockerBox = {
      left: blocker.position.x - blocker.size.width / 2 - 8,
      right: blocker.position.x + blocker.size.width / 2 + 8,
      top: blocker.position.y - blocker.size.height / 2 - 8,
      bottom: blocker.position.y + blocker.size.height / 2 + 8
    };
    expect(affectedRoute).toBeDefined();
    expect(routeIntersectsTestBox(affectedRoute?.points ?? [], blockerBox)).toBe(false);
  });

  test("incremental rendering refreshes cached paths only for crossing neighbors", () => {
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const edges: Edge[] = [
      {
        id: "cached",
        sourceId: top.id,
        targetId: bottom.id,
        sourceTerminalId: "t4",
        targetTerminalId: "t3"
      },
      {
        id: "dirty",
        sourceId: left.id,
        targetId: right.id,
        sourceTerminalId: "t2",
        targetTerminalId: "t1"
      }
    ];
    const previousRoutes = routeEdgesForRendering([top, bottom, left, right], edges, { width: 700, height: 520 })
      .map((route) =>
        route.edgeId === "cached"
          ? { ...route, path: "cached-path" }
          : route.edgeId === "dirty"
            ? { ...route, path: "dirty-old-path" }
            : route
      );

    const incremental = routeEdgesForIncrementalRendering(
      [top, bottom, left, right],
      edges,
      new Set(["dirty"]),
      { width: 700, height: 520 },
      previousRoutes
    );

    const previousCached = previousRoutes.find((route) => route.edgeId === "cached");
    const nextCached = incremental.find((route) => route.edgeId === "cached");
    expect(nextCached?.points).toEqual(previousCached?.points);
    expect(nextCached?.path).not.toBe("cached-path");
    expect(nextCached?.path).toContain("M");
    expect(incremental.find((route) => route.edgeId === "dirty")?.path).not.toBe(
      previousRoutes.find((route) => route.edgeId === "dirty")?.path
    );
  });

  test("incremental rendering refreshes crossing arcs near removed routes", () => {
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const cached: Edge = {
      id: "cached",
      sourceId: top.id,
      targetId: bottom.id,
      sourceTerminalId: "t4",
      targetTerminalId: "t3"
    };
    const removed: Edge = {
      id: "removed",
      sourceId: left.id,
      targetId: right.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };
    const previousRoutes = routeEdgesForRendering([top, bottom, left, right], [cached, removed], { width: 700, height: 520 })
      .map((route) => route.edgeId === "cached" ? { ...route, path: "cached-path" } : route);

    const incremental = routeEdgesForIncrementalRendering(
      [top, bottom, left, right],
      [cached],
      new Set(["removed"]),
      { width: 700, height: 520 },
      previousRoutes
    );

    const previousCached = previousRoutes.find((route) => route.edgeId === "cached");
    const nextCached = incremental.find((route) => route.edgeId === "cached");
    expect(nextCached?.points).toEqual(previousCached?.points);
    expect(nextCached?.path).not.toBe("cached-path");
    expect(nextCached?.path).not.toContain("Q");
  });

  test("incremental rendering keeps distant cached routes untouched after a local edit", () => {
    const distantSource = createDefaultNode("ac-source", { x: 100, y: 120 });
    const distantTarget = createDefaultNode("ac-load", { x: 360, y: 120 });
    const dirtySource = createDefaultNode("ac-line", { x: 900, y: 720 });
    const dirtyTarget = createDefaultNode("ac-line", { x: 1160, y: 720 });
    const edges: Edge[] = [
      {
        id: "distant",
        sourceId: distantSource.id,
        targetId: distantTarget.id,
        sourceTerminalId: distantSource.terminals[0].id,
        targetTerminalId: distantTarget.terminals[0].id
      },
      {
        id: "dirty",
        sourceId: dirtySource.id,
        targetId: dirtyTarget.id,
        sourceTerminalId: dirtySource.terminals[1].id,
        targetTerminalId: dirtyTarget.terminals[0].id
      }
    ];
    const previousRoutes = routeEdgesForStoredRendering(
      [distantSource, distantTarget, dirtySource, dirtyTarget],
      edges,
      { width: 1400, height: 920 }
    );

    const incremental = routeEdgesForIncrementalRendering(
      [distantSource, distantTarget, dirtySource, dirtyTarget],
      edges,
      new Set(["dirty"]),
      { width: 1400, height: 920 },
      previousRoutes
    );

    expect(incremental.find((route) => route.edgeId === "distant")).toBe(
      previousRoutes.find((route) => route.edgeId === "distant")
    );
    expect(incremental.find((route) => route.edgeId === "dirty")).not.toBe(
      previousRoutes.find((route) => route.edgeId === "dirty")
    );
  });

  test("incremental rendering reuses cached routes when deferred rendering catches up with no dirty connections", () => {
    const sourceA = createDefaultNode("ac-source", { x: 100, y: 120 });
    const targetA = createDefaultNode("ac-load", { x: 360, y: 120 });
    const sourceB = createDefaultNode("ac-line", { x: 100, y: 240 });
    const targetB = createDefaultNode("ac-line", { x: 360, y: 240 });
    const edges: Edge[] = [
      {
        id: "cached-a",
        sourceId: sourceA.id,
        targetId: targetA.id,
        sourceTerminalId: sourceA.terminals[0].id,
        targetTerminalId: targetA.terminals[0].id
      },
      {
        id: "cached-b",
        sourceId: sourceB.id,
        targetId: targetB.id,
        sourceTerminalId: sourceB.terminals[0].id,
        targetTerminalId: targetB.terminals[0].id
      }
    ];
    const previousRoutes = routeEdgesForStoredRendering([sourceA, targetA, sourceB, targetB], edges, { width: 520, height: 360 })
      .map((route) => ({ ...route, path: `cached-${route.edgeId}` }));

    const incremental = routeEdgesForIncrementalRendering(
      [sourceA, targetA, sourceB, targetB],
      edges,
      new Set(),
      { width: 520, height: 360 },
      previousRoutes
    );

    expect(incremental).toBe(previousRoutes);
    expect(incremental.map((route) => route.path)).toEqual(["cached-cached-a", "cached-cached-b"]);
  });

  test("cached stored rendering refreshes crossing-neighbor paths after a move commit", () => {
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const edges: Edge[] = [
      {
        id: "cached",
        sourceId: top.id,
        targetId: bottom.id,
        sourceTerminalId: "t4",
        targetTerminalId: "t3"
      },
      {
        id: "moved",
        sourceId: left.id,
        targetId: right.id,
        sourceTerminalId: "t2",
        targetTerminalId: "t1"
      }
    ];
    const previousRoutes = routeEdgesForRendering([top, bottom, left, right], edges, { width: 700, height: 520 })
      .map((route) => route.edgeId === "cached" ? { ...route, path: "cached-path" } : route);
    const movedLeft = { ...left, position: { ...left.position, y: 470 } };
    const movedRight = { ...right, position: { ...right.position, y: 470 } };

    const nextRoutes = routeEdgesForCachedStoredRendering(
      [top, bottom, movedLeft, movedRight],
      edges,
      new Set(["moved"]),
      { width: 700, height: 520 },
      previousRoutes
    );

    const previousCached = previousRoutes.find((route) => route.edgeId === "cached");
    const nextCached = nextRoutes.find((route) => route.edgeId === "cached");
    expect(nextCached?.points).toEqual(previousCached?.points);
    expect(nextCached?.path).not.toBe("cached-path");
    expect(nextCached?.path).toContain("M");
    expect(nextRoutes.find((route) => route.edgeId === "moved")?.points[0]).toEqual(getTerminalPoint(movedLeft, "t2"));
  });

  test("round-trips project files without losing device parameters", () => {
    const node = createDefaultNode("ac-transformer", { x: 160, y: 180 });
    node.name = "1号主变";
    node.params.ratedCapacity = "50 MVA";
    node.params.voltageRatio = "110/10 kV";

    const json = serializeProject({
      version: 1,
      name: "测试模型",
      canvasBackgroundColor: "#f1f5f9",
      canvasBackgroundImage: "/api/images/background",
      canvasBackgroundImageAssetId: "background",
      powerUnit: "MW",
      voltageUnit: "kV",
      currentUnit: "kA",
      powerBaseValue: 100,
      measurements: {
        version: 1,
        groups: [
          {
            id: "measurement-keep",
            nodeId: node.id,
            visible: true,
            anchor: "bottom",
            offset: { x: 0, y: 80 },
            layout: "vertical",
            items: [{ id: "item-p", measurementTypeId: "activePower", sourcePoint: `${node.id}.activePower` }]
          },
          {
            id: "measurement-drop",
            nodeId: "missing-node",
            visible: true,
            anchor: "bottom",
            offset: { x: 0, y: 80 },
            layout: "vertical",
            items: [{ id: "item-q", measurementTypeId: "reactivePower", sourcePoint: "missing.reactivePower" }]
          }
        ]
      },
      nodes: [node],
      edges: []
    });
    const loaded = deserializeProject(json);

    expect(loaded.name).toBe("测试模型");
    expect(loaded.canvasBackgroundColor).toBe("#f1f5f9");
    expect(loaded.canvasBackgroundImage).toBe("/api/images/background");
    expect(loaded.canvasBackgroundImageAssetId).toBe("background");
    expect(loaded.powerUnit).toBe("MW");
    expect(loaded.voltageUnit).toBe("kV");
    expect(loaded.currentUnit).toBe("kA");
    expect(loaded.powerBaseValue).toBe(100);
    expect(loaded.nodes[0].name).toBe("1号主变");
    expect(loaded.nodes[0].params.voltageRatio).toBe("110/10 kV");
    expect(loaded.measurements?.groups.map((group) => group.id)).toEqual(["measurement-keep"]);
    expect(loaded.measurements?.groups[0].items[0]).toMatchObject({ measurementTypeId: "activePower" });
  });

  test("normalizes legacy projects onto a default visible layer", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const normalized = normalizeProjectLayers({
      version: 1,
      name: "legacy",
      nodes: [{ ...node, layerId: undefined }],
      edges: []
    });

    expect(normalized.layers).toEqual([{ id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true }]);
    expect(normalized.nodes[0].layerId).toBe(DEFAULT_MODEL_LAYER_ID);
  });

  test("filters visible graph content by active layer stack", () => {
    const primary = { ...createDefaultNode("ac-source", { x: 100, y: 100 }), id: "primary", layerId: DEFAULT_MODEL_LAYER_ID };
    const hidden = { ...createDefaultNode("ac-load", { x: 300, y: 100 }), id: "hidden", layerId: "layer-hidden" };
    const visibleExtra = { ...createDefaultNode("ac-load", { x: 500, y: 100 }), id: "visible-extra", layerId: "layer-extra" };
    const layers = [
      { id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true },
      { id: "layer-hidden", name: "隐藏图层", visible: false },
      { id: "layer-extra", name: "叠加图层", visible: true }
    ];
    const filtered = filterProjectByVisibleLayers(
      [primary, hidden, visibleExtra],
      [
        { id: "edge-hidden", sourceId: primary.id, targetId: hidden.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "edge-visible", sourceId: primary.id, targetId: visibleExtra.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ],
      layers
    );

    expect(filtered.nodes.map((item) => item.id)).toEqual(["primary", "visible-extra"]);
    expect(filtered.edges.map((item) => item.id)).toEqual(["edge-visible"]);
  });

  test("reuses graph arrays when every layer is visible and already ordered", () => {
    const primary = { ...createDefaultNode("ac-source", { x: 100, y: 100 }), id: "primary", layerId: DEFAULT_MODEL_LAYER_ID };
    const visibleExtra = { ...createDefaultNode("ac-load", { x: 500, y: 100 }), id: "visible-extra", layerId: "layer-extra" };
    const nodes = [primary, visibleExtra];
    const edges = [
      { id: "edge-visible", sourceId: primary.id, targetId: visibleExtra.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];
    const layers = [
      { id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true },
      { id: "layer-extra", name: "叠加图层", visible: true }
    ];

    const filtered = filterProjectByVisibleLayers(nodes, edges, layers);

    expect(filtered.nodes).toBe(nodes);
    expect(filtered.edges).toBe(edges);
  });

  test("orders graph content by layer even when every layer is visible", () => {
    const primary = { ...createDefaultNode("ac-source", { x: 100, y: 100 }), id: "primary", layerId: DEFAULT_MODEL_LAYER_ID };
    const visibleExtra = { ...createDefaultNode("ac-load", { x: 500, y: 100 }), id: "visible-extra", layerId: "layer-extra" };
    const nodes = [visibleExtra, primary];
    const edges = [
      { id: "edge-visible", sourceId: primary.id, targetId: visibleExtra.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];
    const layers = [
      { id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true },
      { id: "layer-extra", name: "叠加图层", visible: true }
    ];

    const filtered = filterProjectByVisibleLayers(nodes, edges, layers);

    expect(filtered.nodes).not.toBe(nodes);
    expect(filtered.edges).toBe(edges);
    expect(filtered.nodes.map((item) => item.id)).toEqual(["primary", "visible-extra"]);
  });

  test("creates uniquely named model layers", () => {
    const existing = [
      { id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true },
      createModelLayer("二次系统", [])
    ];
    const layer = createModelLayer("二次系统", existing);

    expect(layer.name).toBe("二次系统 (2)");
    expect(layer.visible).toBe(true);
    expect(existing.some((item) => item.id === layer.id)).toBe(false);
  });

  test("keeps the active layer visible when normalizing projects", () => {
    const normalized = normalizeProjectLayers({
      version: 1,
      name: "layered",
      activeLayerId: "layer-secondary",
      layers: [
        { id: DEFAULT_MODEL_LAYER_ID, name: "默认图层", visible: true },
        { id: "layer-secondary", name: "二次系统", visible: false }
      ],
      nodes: [],
      edges: []
    });

    expect(resolveActiveModelLayerId(normalized.layers ?? [], normalized.activeLayerId)).toBe("layer-secondary");
    expect(normalized.layers?.find((layer) => layer.id === "layer-secondary")?.visible).toBe(true);
  });

  test("locks connection endpoints to explicit terminals for non-bus devices", () => {
    const source = createDefaultNode("ac-switch", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 240, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 360, y: 100 });

    const locked = lockProjectEdgeTerminals({
      version: 1,
      name: "端子锁定",
      nodes: [source, target, bus],
      edges: [
        {
          id: "non-bus-edge",
          sourceId: source.id,
          targetId: target.id,
          sourcePoint: { x: 123, y: 456 },
          targetPoint: { x: 222, y: 333 }
        },
        {
          id: "bus-edge",
          sourceId: source.id,
          targetId: bus.id,
          sourceTerminalId: "t2",
          targetPoint: { x: 350, y: 100 }
        },
        {
          id: "floating-edge",
          sourceId: source.id,
          targetId: "",
          sourceTerminalId: "t1",
          targetPoint: { x: 500, y: 100 }
        }
      ]
    });

    expect(locked.edges).toHaveLength(2);
    expect(locked.edges[0].sourceTerminalId).toBe("t1");
    expect(locked.edges[0].targetTerminalId).toBe("t1");
    expect(locked.edges[0].sourcePoint).toBeUndefined();
    expect(locked.edges[0].targetPoint).toBeUndefined();
    expect(locked.edges[1].sourceTerminalId).toBe("t2");
    expect(locked.edges[1].targetTerminalId).toBe("t1");
    expect(locked.edges[1].targetPoint).toEqual({ x: 350, y: 100 });
  });

  test("creates buses without default terminals while still allowing compatible line drops", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 240, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 220 });
    const dcLoad = createDefaultNode("dc-load", { x: 240, y: 220 });

    expect(acBus.terminals).toHaveLength(0);
    expect(dcBus.terminals).toHaveLength(0);
    expect(canConnectTerminals(acBus, "t1", acLoad, "t1")).toBe(true);
    expect(canConnectTerminals(acBus, "t1", dcLoad, "t1")).toBe(false);
    expect(canConnectTerminals(dcBus, "t1", dcLoad, "t1")).toBe(true);
  });

  test("rejects duplicate direct terminal and terminal-to-bus connections", () => {
    const source = createDefaultNode("ac-load", { x: 80, y: 100 });
    const target = createDefaultNode("ac-load", { x: 260, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 440, y: 100 });
    const directEdge: Edge = {
      id: "direct",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const busEdge: Edge = {
      id: "bus",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    expect(validateConnectionEndpointRules([source, target, bus], [directEdge], {
      id: "direct-duplicate",
      sourceId: target.id,
      targetId: source.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    }).map((issue) => issue.type)).toEqual(["duplicate-terminal-pair"]);

    expect(validateConnectionEndpointRules([source, target, bus], [busEdge], {
      id: "bus-duplicate",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t2",
      targetPoint: { x: 440, y: 120 }
    }).map((issue) => issue.type)).toEqual(["duplicate-terminal-bus"]);
  });

  test("rejects same-device terminal links and multi-terminal devices sharing one external terminal", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 160, y: 100 });
    const load = createDefaultNode("ac-load", { x: 360, y: 100 });
    const existing: Edge = {
      id: "existing",
      sourceId: transformer.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    expect(validateConnectionEndpointRules([transformer, load], [], {
      id: "self-link",
      sourceId: transformer.id,
      targetId: transformer.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t2"
    }).map((issue) => issue.type)).toEqual(["same-device-terminals"]);

    expect(validateConnectionEndpointRules([transformer, load], [existing], {
      id: "shared-external-terminal",
      sourceId: transformer.id,
      targetId: load.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    }).map((issue) => issue.type)).toEqual(["shared-opposite-terminal"]);
  });

  test("sizes each bus terminal list from the number of connected line endpoints", () => {
    const bus = createDefaultNode("ac-bus", { x: 500, y: 100 });
    const loadA = createDefaultNode("ac-load", { x: 180, y: 100 });
    const loadB = createDefaultNode("ac-load", { x: 820, y: 100 });
    const loadC = createDefaultNode("ac-load", { x: 1140, y: 100 });

    const locked = lockProjectEdgeTerminals({
      version: 1,
      name: "母线动态端子",
      nodes: [bus, loadA, loadB, loadC],
      edges: [
        { id: "a", sourceId: loadA.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 440, y: 100 } },
        { id: "b", sourceId: loadB.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 500, y: 100 } },
        { id: "c", sourceId: bus.id, targetId: loadC.id, sourceTerminalId: "t1", targetTerminalId: "t1", sourcePoint: { x: 560, y: 100 } }
      ]
    });
    const lockedBus = locked.nodes.find((node) => node.id === bus.id)!;

    expect(lockedBus.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2", "t3"]);
    expect(locked.edges.map((edge) => (edge.targetId === bus.id ? edge.targetTerminalId : edge.sourceTerminalId))).toEqual(["t1", "t2", "t3"]);

    const afterDelete = lockProjectEdgeTerminals({
      ...locked,
      edges: locked.edges.filter((edge) => edge.id !== "b")
    });
    expect(afterDelete.nodes.find((node) => node.id === bus.id)?.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
  });

  test("synchronizes bus terminals only around affected moved nodes", () => {
    const busA = createDefaultNode("ac-bus", { x: 500, y: 100 });
    const busB = createDefaultNode("ac-bus", { x: 1100, y: 100 });
    const loadA = createDefaultNode("ac-load", { x: 180, y: 100 });
    const loadB = createDefaultNode("ac-load", { x: 1420, y: 100 });
    const nodes = [busA, busB, loadA, loadB];
    const edges: Edge[] = [
      { id: "edge-a", sourceId: loadA.id, targetId: busA.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "edge-b", sourceId: loadB.id, targetId: busB.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges, new Set([loadA.id]));
    const nextBusA = synchronized.nodes.find((node) => node.id === busA.id)!;
    const nextBusB = synchronized.nodes.find((node) => node.id === busB.id)!;

    expect(nextBusA.terminals.map((terminal) => terminal.id)).toEqual(["t1"]);
    expect(nextBusB).toBe(busB);
    expect(nextBusB.terminals).toHaveLength(0);
    expect(synchronized.edges).toBe(edges);
  });

  test("creates generator parameters with readonly node numbers and control types", () => {
    const acWind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const dcPv = createDefaultNode("dc-pv-source", { x: 240, y: 100 });

    expect(isGeneratorNode(acWind)).toBe(true);
    expect(acWind.nodeNumber).toMatch(/^N\d+$/);
    expect(acWind.params.ratedCapacity).toBe("50 MW");
    expect(acWind.params.controlType).toBe("PV");
    expect(acWind.params.cutInWindSpeed).toBe("3 m/s");
    expect(acWind.params.ratedWindSpeed).toBe("12 m/s");
    expect(acWind.params.cutOutWindSpeed).toBe("25 m/s");

    expect(dcPv.params.controlType).toBe("P");
    expect(dcPv.params.ratedCapacity).toBe("5 MW");
  });

  test("creates DC source with exactly one DC terminal and one DC node number", () => {
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 100 });

    expect(dcSource.terminals).toHaveLength(1);
    expect(dcSource.terminals[0].id).toBe("t1");
    expect(dcSource.terminals[0].type).toBe("dc");
    expect(dcSource.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(dcSource.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates AC source with exactly one AC terminal and one AC node number", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });

    expect(acSource.terminals).toHaveLength(1);
    expect(acSource.terminals[0].id).toBe("t1");
    expect(acSource.terminals[0].type).toBe("ac");
    expect(acSource.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(acSource.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("labels terminals with the same library names used by terminal energy attributes", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acdcConverter = createDefaultNode("acdc-converter", { x: 240, y: 100 });
    const legacyElectrolyzer = createDefaultNode("ac-electrolyzer", { x: 380, y: 100 });
    legacyElectrolyzer.terminals[0].label = "交流端";
    legacyElectrolyzer.terminals[1].label = "氢能端";

    expect(acSource.terminals.map((terminal) => terminal.label)).toEqual(["交流设备端1"]);
    expect(acdcConverter.terminals.map((terminal) => terminal.label)).toEqual(["交流设备端1", "直流设备端2"]);
    expect(normalizeNodeTerminalsByTemplate(legacyElectrolyzer).terminals.map((terminal) => terminal.label)).toEqual(["交流设备端", "氢能设备端"]);
  });

  test("creates load devices with one terminal and one node number", () => {
    const dcLoad = createDefaultNode("dc-load", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 220, y: 100 });

    expect(dcLoad.terminals).toHaveLength(1);
    expect(dcLoad.terminals[0].type).toBe("dc");
    expect(dcLoad.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(dcLoad.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);

    expect(acLoad.terminals).toHaveLength(1);
    expect(acLoad.terminals[0].type).toBe("ac");
    expect(acLoad.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(acLoad.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("adds terminal transformer load as a single-terminal ACLoad device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-terminal-transformer-load");
    expect(template).toMatchObject({
      label: "终端变负荷",
      attributeLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 1,
      terminalAnchors: [{ x: -0.5, y: 0 }]
    });

    const node = createDefaultNode("ac-terminal-transformer-load", { x: 100, y: 100 });
    node.name = "终端变负荷1";

    expect(node.terminals).toHaveLength(1);
    expect(node.terminals[0]).toMatchObject({ type: "ac", label: "交流设备端1", anchor: { x: -0.5, y: 0 } });
    expect(getDeviceGlyphVariant("ac-terminal-transformer-load")).toBe("terminal-transformer-load");
    expect(getEParameterKeys("ac-terminal-transformer-load", node.params)).toEqual(E_SECTION_COLUMNS.ACLoad);

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "终端变负荷测试",
      nodes: [node],
      edges: []
    }));

    expect(exported.ACLoad.rows).toEqual([
      expect.objectContaining({
        idx: "1",
        name: "终端变负荷1",
        node: "1",
        pbase: "5",
        pv0: "1.0",
        qbase: "1.2",
        qv0: "1.0",
        run_stat: "1"
      })
    ]);
  });

  test("creates DC branch devices with two DC terminals and two DC node numbers", () => {
    const dcKinds = ["dc-switch", "dc-breaker", "dc-line"] as const;

    for (const kind of dcKinds) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals).toHaveLength(2);
      expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
      expect(node.terminals.every((terminal) => terminal.type === "dc")).toBe(true);
      expect(node.terminals[0].nodeNumber).toMatch(/^N\d+$/);
      expect(node.terminals[1].nodeNumber).toMatch(/^N\d+$/);
      expect(new Set(node.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(2);
    }
  });

  test("creates AC branch devices with two AC terminals and two AC node numbers", () => {
    const acKinds = ["ac-switch", "ac-breaker", "ac-box-breaker", "ac-line"] as const;

    for (const kind of acKinds) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals).toHaveLength(2);
      expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
      expect(node.terminals.every((terminal) => terminal.type === "ac")).toBe(true);
      expect(node.terminals[0].nodeNumber).toMatch(/^N\d+$/);
      expect(node.terminals[1].nodeNumber).toMatch(/^N\d+$/);
      expect(new Set(node.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(2);
    }
  });

  test("adds box breaker as an ACBreak device with two AC terminals", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-box-breaker");
    expect(template).toMatchObject({
      label: "盒型开关",
      attributeLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 2,
      params: expect.objectContaining({ status: "合闸" })
    });

    const node = createDefaultNode("ac-box-breaker", { x: 100, y: 100 });
    node.name = "盒型开关1";

    expect(node.terminals).toHaveLength(2);
    expect(node.terminals.map((terminal) => terminal.type)).toEqual(["ac", "ac"]);
    expect(node.terminals.map((terminal) => terminal.anchor)).toEqual([{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }]);
    expect(getDeviceGlyphVariant("ac-box-breaker")).toBe("box-breaker");
    expect(getEParameterKeys("ac-box-breaker", node.params)).toEqual(E_SECTION_COLUMNS.ACBreak);

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "盒型开关测试",
      nodes: [node],
      edges: []
    }));

    expect(exported.ACBreak.rows).toEqual([
      expect.objectContaining({ idx: "1", name: "盒型开关1", i_node: "1", j_node: "2", status: "1", run_stat: "1" })
    ]);
  });

  test("includes AC and DC zero-impedance branch elements in the library and E export", () => {
    const acTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-zero-branch");
    const dcTemplate = DEVICE_LIBRARY.find((item) => item.kind === "dc-zero-branch");
    expect(acTemplate).toMatchObject({ label: "交流零阻抗支路", attributeLibrary: "交流设备", terminalType: "ac", terminalCount: 2 });
    expect(dcTemplate).toMatchObject({ label: "直流零阻抗支路", attributeLibrary: "直流设备", terminalType: "dc", terminalCount: 2 });

    const acZeroBranch = createDefaultNode("ac-zero-branch", { x: 100, y: 100 });
    const dcZeroBranch = createDefaultNode("dc-zero-branch", { x: 260, y: 100 });
    expect(acZeroBranch.terminals.map((terminal) => terminal.type)).toEqual(["ac", "ac"]);
    expect(dcZeroBranch.terminals.map((terminal) => terminal.type)).toEqual(["dc", "dc"]);
    expect(getDeviceGlyphVariant("ac-zero-branch")).toBe("line");
    expect(getDeviceGlyphVariant("dc-zero-branch")).toBe("line");

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "零阻抗支路测试",
      nodes: [acZeroBranch, dcZeroBranch],
      edges: []
    }));
    expect(exported.ACZeroBranch.rows).toHaveLength(1);
    expect(exported.DCZeroBranch.rows).toHaveLength(1);
  });

  test("adds vertical library variants for buses and non-routable two-terminal devices", () => {
    const baseTemplates = DEVICE_LIBRARY.filter((template) => !template.kind.endsWith("-vertical"));
    const baseByKind = new Map(baseTemplates.map((template) => [template.kind, template]));
    const busKinds = ["ac-bus", "dc-bus", "hydrogen-bus", "heat-bus"];
    const routableLineKinds = baseTemplates
      .filter((template) => isRoutableLineDeviceKind(template.kind))
      .map((template) => template.kind);
    const twoTerminalKinds = baseTemplates
      .filter((template) => template.terminalCount === 2 && !isRoutableLineDeviceKind(template.kind))
      .map((template) => template.kind);

    for (const kind of routableLineKinds) {
      expect(DEVICE_LIBRARY.some((template) => template.kind === `${kind}-vertical`)).toBe(false);
    }

    for (const kind of [...busKinds, ...twoTerminalKinds]) {
      const baseTemplate = baseByKind.get(kind)!;
      const verticalKind = `${kind}-vertical`;
      const verticalTemplate = DEVICE_LIBRARY.find((template) => template.kind === verticalKind);
      expect(verticalTemplate).toMatchObject({
        label: `${baseTemplate.label}（竖向）`,
        attributeLibrary: baseTemplate.attributeLibrary,
        terminalType: baseTemplate.terminalType,
        terminalCount: baseTemplate.terminalCount,
        rotation: 90
      });
      expect(inferESection(verticalKind, verticalTemplate?.params ?? {})).toBe(inferESection(kind, baseTemplate.params));

      const node = createDefaultNode(verticalKind, { x: 200, y: 200 });
      expect(node.rotation).toBe(90);
      if (busKinds.includes(kind)) {
        expect(getBusTerminalType(node)).toBe(getBusTerminalType(createDefaultNode(kind, { x: 200, y: 200 })));
        expect(projectPointToBusCenterline(node, { x: 210, y: node.position.y - node.size.width })).toEqual({
          x: node.position.x,
          y: node.position.y - node.size.width / 2
        });
      } else {
        expect(node.terminals).toHaveLength(2);
        expect(node.terminals.map((terminal) => terminal.anchor)).toEqual(createDefaultNode(kind, { x: 200, y: 200 }).terminals.map((terminal) => terminal.anchor));
        const firstPoint = getTerminalPoint(node, "t1");
        const secondPoint = getTerminalPoint(node, "t2");
        expect(firstPoint.x).toBe(200);
        expect(secondPoint.x).toBe(200);
        expect(firstPoint.y).toBeLessThan(200);
        expect(secondPoint.y).toBeGreaterThan(200);
      }
    }
  });

  test("keeps fixed and adaptive line-like entries available in the device library", () => {
    const fixedKinds = [
      "ac-line",
      "dc-line",
      "hydrogen-pipeline",
      "heat-pipeline",
      "ac-zero-branch",
      "dc-zero-branch"
    ];
    const visibleAdaptiveKinds = [
      "ac-routable-line",
      "dc-routable-line",
      "hydrogen-routable-pipeline",
      "heat-routable-line",
      "ac-zero-routable-branch",
      "dc-zero-routable-branch"
    ];

    for (const kind of fixedKinds) {
      const baseTemplate = DEVICE_LIBRARY.find((template) => template.kind === kind);
      const verticalTemplate = DEVICE_LIBRARY.find((template) => template.kind === `${kind}-vertical`);
      expect(baseTemplate).toBeTruthy();
      expect(verticalTemplate).toBeTruthy();
    }

    for (const kind of visibleAdaptiveKinds) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toBeTruthy();
    }
  });

  test("normalizes non-static device default sizes to a 150px longest side", () => {
    const nonStaticTemplates = DEVICE_LIBRARY.filter((template) => !isStaticKind(template.kind));

    expect(nonStaticTemplates.length).toBeGreaterThan(0);
    for (const template of nonStaticTemplates) {
      expect(Math.max(template.size.width, template.size.height)).toBe(150);
      expect(createDefaultNode(template.kind, { x: 100, y: 100 }).size).toEqual(template.size);
    }

    const baseTemplate = DEVICE_LIBRARY.find((template) => template.kind === "ac-source")!;
    const customSizedTemplate: DeviceTemplate = {
      ...baseTemplate,
      size: { width: 50, height: 20 }
    };

    expect(createNodeFromTemplate(customSizedTemplate, { x: 0, y: 0 }).size).toEqual({ width: 150, height: 60 });
    expect(createDefaultNode("ac-source", { x: 0, y: 0 }).params._labelFontSize).toBe("14");
  });

  test("defaults resize transform permission by element category", () => {
    const regularDevice = createDefaultNode("ac-load", { x: 0, y: 0 });
    const staticGraphic = createDefaultNode("static-image", { x: 0, y: 0 });
    const bus = createDefaultNode("ac-bus", { x: 0, y: 0 });
    const tankContainer = createDefaultNode("hydrogen-tank-container", { x: 0, y: 0 });
    const routableBranch = createDefaultNode("ac-routable-line", { x: 0, y: 0 });

    expect(regularDevice.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBe("0");
    expect(nodeAllowsResizeTransform(regularDevice)).toBe(false);
    expect(staticGraphic.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBe("1");
    expect(nodeAllowsResizeTransform(staticGraphic)).toBe(true);
    expect(bus.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBe("1");
    expect(nodeAllowsResizeTransform(bus)).toBe(true);
    expect(tankContainer.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBe("1");
    expect(nodeAllowsResizeTransform(tankContainer)).toBe(true);
    expect(routableBranch.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBe("1");
    expect(nodeAllowsResizeTransform(routableBranch)).toBe(true);

    expect(nodeAllowsResizeTransform({ ...regularDevice, params: { ...regularDevice.params, [ALLOW_RESIZE_TRANSFORM_PARAM]: "1" } })).toBe(true);
    expect(nodeAllowsResizeTransform({ ...bus, params: { ...bus.params, [ALLOW_RESIZE_TRANSFORM_PARAM]: "0" } })).toBe(false);
  });

  test("places converter elements under AC/DC device library groups", () => {
    expect(DEVICE_LIBRARY.find((item) => item.kind === "acac-converter")).toMatchObject({ attributeLibrary: "交流设备" });
    expect(DEVICE_LIBRARY.find((item) => item.kind === "acdc-converter")).toMatchObject({ attributeLibrary: "直流设备" });
    expect(DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")).toMatchObject({ attributeLibrary: "直流设备" });
  });

  test("adds an AC grounding disconnector as a single-terminal grounding device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-ground-disconnector");
    const verticalTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-ground-disconnector-vertical");
    expect(template).toMatchObject({
      label: "接地刀闸",
      attributeLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 1,
      params: expect.objectContaining({ status: "分闸" })
    });
    expect(verticalTemplate).toMatchObject({
      label: "竖向接地刀闸",
      attributeLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 1,
      params: expect.objectContaining({ status: "分闸" })
    });

    const node = createDefaultNode("ac-ground-disconnector", { x: 100, y: 100 });
    const verticalNode = createDefaultNode("ac-ground-disconnector-vertical", { x: 200, y: 100 });
    node.name = "接地刀闸1";
    verticalNode.name = "竖向接地刀闸1";

    expect(node.terminals).toHaveLength(1);
    expect(node.terminals[0]).toMatchObject({ type: "ac", label: "交流系统端", anchor: { x: -0.5, y: 0 } });
    expect(getDeviceGlyphVariant("ac-ground-disconnector")).toBe("ground-disconnector");
    expect(getEParameterKeys("ac-ground-disconnector", node.params)).toEqual(E_SECTION_COLUMNS.GroundDisconnector);
    expect(verticalNode.terminals).toHaveLength(1);
    expect(verticalNode.terminals[0]).toMatchObject({ type: "ac", label: "交流系统端", anchor: { x: 0, y: -0.5 } });
    expect(getDeviceGlyphVariant("ac-ground-disconnector-vertical")).toBe("ground-disconnector-vertical");
    expect(getEParameterKeys("ac-ground-disconnector-vertical", verticalNode.params)).toEqual(E_SECTION_COLUMNS.GroundDisconnector);

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "接地刀闸测试",
      nodes: [node, verticalNode],
      edges: []
    }));

    expect(exported.GroundDisconnector.rows).toEqual([
      expect.objectContaining({ idx: "1", name: "接地刀闸1", node: "1", status: "0", run_stat: "1" }),
      expect.objectContaining({ idx: "2", name: "竖向接地刀闸1", node: "2", status: "0", run_stat: "1" })
    ]);
  });

  test("preserves manually rotated single-terminal anchors during template normalization", () => {
    const groundingDisconnector = createDefaultNode("ac-ground-disconnector", { x: 100, y: 100 });
    const terminalTransformerLoad = createDefaultNode("ac-terminal-transformer-load", { x: 240, y: 100 });
    groundingDisconnector.terminals[0] = {
      ...groundingDisconnector.terminals[0],
      anchor: { x: 0, y: 0.5 }
    };
    terminalTransformerLoad.terminals[0] = {
      ...terminalTransformerLoad.terminals[0],
      anchor: { x: 0.5, y: 0 }
    };

    const normalizedGroundingDisconnector = normalizeNodeTerminalsByTemplate(groundingDisconnector);
    const normalizedTerminalTransformerLoad = normalizeNodeTerminalsByTemplate(terminalTransformerLoad);

    expect(normalizedGroundingDisconnector.terminals[0].anchor).toEqual({ x: 0, y: 0.5 });
    expect(normalizedTerminalTransformerLoad.terminals[0].anchor).toEqual({ x: 0.5, y: 0 });
    expect(normalizedGroundingDisconnector.terminals[0].label).toBe("交流系统端");
    expect(normalizedTerminalTransformerLoad.terminals[0].label).toBe("交流设备端1");
  });

  test("builds a downloadable E file export for the current model", () => {
    const node = createDefaultNode("ac-source", { x: 100, y: 100 });
    const project: ProjectFile = {
      version: 1,
      name: "混合/能源:模型",
      nodes: [node],
      edges: []
    };

    const file = buildEFileExport(project);

    expect(file.filename).toBe("混合_能源_模型.e");
    expect(file.mime).toBe("text/plain");
    expect(file.text).toContain("<PowerBase>");
    expect(file.text).toContain("@ p_base u_unit p_unit i_unit");
    expect(file.text).toContain("<ACGenerator>");
    expect(() => JSON.parse(file.text)).toThrow();
  });

  test("preserves the per-model automatic canvas expansion setting", () => {
    const project: ProjectFile = {
      version: 1,
      name: "固定边界模型",
      allowAutoExpandCanvas: false,
      nodes: [createDefaultNode("ac-source", { x: 100, y: 100 })],
      edges: []
    };

    const restored = deserializeProject(serializeProject(project));

    expect(restored.allowAutoExpandCanvas).toBe(false);
  });

  test("exports hydrogen, heat, and cross-energy devices to E sections and reports unsupported devices", () => {
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    const hydrogenPipe = assignPermanentDeviceIndex(createDefaultNode("hydrogen-pipeline", { x: 240, y: 100 }), {}).node;
    const hydrogenTank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank", { x: 380, y: 100 }), {}).node;
    const horizontalHydrogenTank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank-horizontal", { x: 520, y: 100 }), {}).node;
    const containerHydrogenTank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank-container", { x: 660, y: 100 }), {}).node;
    const heatTank = assignPermanentDeviceIndex(createDefaultNode("thermal-storage-tank", { x: 800, y: 100 }), {}).node;
    const custom: ModelNode = {
      ...createDefaultNode("ac-load", { x: 940, y: 100 }),
      kind: "unknown-device-kind",
      name: "未支持设备",
      params: {}
    };
    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "综合能源导出",
      nodes: [electrolyzer, hydrogenPipe, hydrogenTank, horizontalHydrogenTank, containerHydrogenTank, heatTank, custom],
      edges: []
    }));

    expect(Object.keys(E_SECTION_COLUMNS)).not.toContain("Hydro" + "Tank");
    expect(Object.keys(E_SECTION_COLUMNS)).not.toContain("Heat" + "Tank");
    expect(E_SECTION_COLUMNS.HydroStorage).toEqual(["idx", "name", "node", "run_stat"]);
    expect(E_SECTION_COLUMNS.HeatStorage).toEqual(["idx", "name", "node", "run_stat"]);
    expect(exported.AcE2Hydro.rows).toHaveLength(1);
    expect(exported.ACLoad.rows).toHaveLength(1);
    expect(exported.HydroSource.rows).toHaveLength(1);
    expect(exported.HydroPipe.rows).toHaveLength(1);
    expect(exported.HydroStorage.rows).toHaveLength(3);
    expect(exported.HeatStorage.rows).toHaveLength(1);
    expect(Object.keys(exported)).not.toContain("Hydro" + "Tank");
    expect(Object.keys(exported)).not.toContain("Heat" + "Tank");
    expect(inferESection("hydrogen-tank")).toBe("HydroStorage");
    expect(inferESection("hydrogen-tank-horizontal")).toBe("HydroStorage");
    expect(inferESection("hydrogen-tank-container")).toBe("HydroStorage");
    expect(inferESection("thermal-storage-tank")).toBe("HeatStorage");
    expect(getEExportWarnings({
      version: 1,
      name: "综合能源导出",
      nodes: [electrolyzer, hydrogenPipe, hydrogenTank, horizontalHydrogenTank, containerHydrogenTank, heatTank, custom],
      edges: []
    })).toEqual([
      expect.objectContaining({
        nodeId: custom.id,
        reason: "元件类型没有对应的 E 文件段定义。"
      })
    ]);
  });

  test("exports electric heat containers to AC and DC specific E sections", () => {
    const acHeater = assignPermanentDeviceIndex(createDefaultNode("ac-heater", { x: 100, y: 100 }), {}).node;
    const dcHeater = assignPermanentDeviceIndex(createDefaultNode("dc-heater", { x: 240, y: 100 }), {}).node;
    const acTwoPortHeater = assignPermanentDeviceIndex(createDefaultNode("ac-two-port-heater", { x: 380, y: 100 }), {}).node;
    const dcTwoPortHeater = assignPermanentDeviceIndex(createDefaultNode("dc-two-port-heater", { x: 520, y: 100 }), {}).node;
    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "电制热导出",
      nodes: [acHeater, dcHeater, acTwoPortHeater, dcTwoPortHeater],
      edges: []
    }));

    expect(exported.AcElec2Heat.columns).toEqual(["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"]);
    expect(exported.DcElec2Heat.columns).toEqual(["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"]);
    expect(exported.AcElec2Heat2.columns).toEqual(["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat2_unit_t2"]);
    expect(exported.DcElec2Heat2.columns).toEqual(["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat2_unit_t2"]);
    expect(exported.Elec2Heat).toBeUndefined();
    expect(exported.Elec2Heat2).toBeUndefined();
    expect(inferESection("ac-heater", acHeater.params)).toBe("AcElec2Heat");
    expect(inferESection("dc-heater", dcHeater.params)).toBe("DcElec2Heat");
    expect(inferESection("ac-two-port-heater", acTwoPortHeater.params)).toBe("AcElec2Heat2");
    expect(inferESection("dc-two-port-heater", dcTwoPortHeater.params)).toBe("DcElec2Heat2");
  });

  test("uses impedance glyphs for AC lines and resistance-only glyphs for DC lines", () => {
    expect(getDeviceGlyphVariant("ac-line")).toBe("ac-line");
    expect(getDeviceGlyphVariant("dc-line")).toBe("dc-line");
    expect(getDeviceGlyphVariant("ac-zero-branch")).toBe("line");
    expect(getDeviceGlyphVariant("dc-zero-branch")).toBe("line");
  });

  test("adds routable line-like device variants for electric, hydrogen, and heat networks", () => {
    const cases = [
      ["ac-routable-line", "交流线路（自适应）", "交流设备", "ac", "ACBranch"],
      ["ac-zero-routable-branch", "交流零阻抗支路（自适应）", "交流设备", "ac", "ACZeroBranch"],
      ["dc-routable-line", "直流线路（自适应）", "直流设备", "dc", "DCBranch"],
      ["dc-zero-routable-branch", "直流零阻抗支路（自适应）", "直流设备", "dc", "DCZeroBranch"],
      ["hydrogen-routable-pipeline", "输氢管道（自适应）", "氢能设备", "h2", "HydroPipe"],
      ["heat-routable-line", "热力线路（自适应）", "热能设备", "heat", "HeatPipe"]
    ] as const;

    for (const [kind, label, attributeLibrary, terminalType, section] of cases) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toMatchObject({ label, attributeLibrary, terminalType, terminalCount: 2 });
      const node = createDefaultNode(kind, { x: 300, y: 160 });
      const points = routableLineDeviceLocalPoints(node);

      expect(isRoutableLineDeviceKind(kind)).toBe(true);
      expect(node.params[ROUTABLE_LINE_POINTS_PARAM]).toBeTruthy();
      expect(points).toHaveLength(2);
      expect(points[0].x).toBeLessThan(points[1].x);
      expect(getDeviceGlyphVariant(kind)).toBe("routable-line");
      expect(node.params.lineWidth).toBe(String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH));
      expect(getDeviceStrokeWidth(node)).toBe(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH);
      expect(inferESection(kind, node.params)).toBe(section);
    }
  });

  test("treats routable line-like devices as endpoint-retargeted graphics instead of movable canvas nodes", () => {
    const routableLineKinds = DEVICE_LIBRARY
      .filter((template) => isRoutableLineDeviceKind(template.kind))
      .map((template) => template.kind);

    expect(routableLineKinds).not.toHaveLength(0);
    for (const kind of routableLineKinds) {
      expect(isCanvasNodeMovable(kind)).toBe(false);
    }
    expect(isCanvasNodeMovable("ac-source")).toBe(true);
    expect(isCanvasNodeMovable("static-rect")).toBe(true);
  });

  test("renders legacy routable line-like device widths only slightly thicker than connection lines", () => {
    const legacyLine = {
      ...createDefaultNode("ac-routable-line", { x: 300, y: 160 }),
      params: {
        ...createDefaultNode("ac-routable-line", { x: 300, y: 160 }).params,
        lineWidth: "7"
      }
    };
    const customLine = {
      ...legacyLine,
      params: {
        ...legacyLine.params,
        lineWidth: "5"
      }
    };

    expect(getDeviceStrokeWidth(legacyLine)).toBe(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH);
    expect(normalizeNodeTerminalsByTemplate(legacyLine).params.lineWidth).toBe(String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH));
    expect(getDeviceStrokeWidth(customLine)).toBe(5);
  });

  test("routes routable line-like devices around blockers and stores local path points", () => {
    const line = createDefaultNode("ac-routable-line", { x: 300, y: 180 });
    line.params = {
      ...line.params,
      [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify([{ x: -260, y: 0 }, { x: 260, y: 0 }])
    };
    const blocker = createDefaultNode("ac-load", { x: 300, y: 180 });

    const routed = routeRoutableLineDevice(line, [line, blocker], { width: 700, height: 420 });
    const points = routableLineDeviceCanvasPoints(routed);

    expect(routed).not.toBe(line);
    expect(points.length).toBeGreaterThan(2);
    expect(points[0].x).toBeLessThan(blocker.position.x);
    expect(points[points.length - 1].x).toBeGreaterThan(blocker.position.x);
    for (let index = 1; index < points.length; index += 1) {
      expect(segmentIntersectsNodeBody(points[index - 1], points[index], blocker)).toBe(false);
    }
  });

  test("creates routable line-like devices from snapped endpoint terminal points", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    expect(template).toBeTruthy();
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "source-node" };
    const target = { ...createDefaultNode("ac-load", { x: 420, y: 260 }), id: "target-node" };
    const sourcePoint = getTerminalPoint(source, "t1");
    const targetPoint = getTerminalPoint(target, "t1");

    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      sourcePoint,
      targetPoint,
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(target, "t1")
      }
    );
    const points = routableLineDeviceCanvasPoints(line);
    const refs = routableLineDeviceEndpointRefs(line);

    expect(line.layerId).toBe("layer-a");
    expect(line.terminals).toHaveLength(2);
    expect(getTerminalPoint(line, "t1")).toEqual(sourcePoint);
    expect(getTerminalPoint(line, "t2")).toEqual(targetPoint);
    expect(points[0]).toEqual(sourcePoint);
    expect(points[points.length - 1]).toEqual(targetPoint);
    expect(Math.abs(line.terminals[0].anchor.x)).toBeLessThan(0.499);
    expect(Math.abs(line.terminals[1].anchor.y)).toBeLessThan(0.499);
    expect(refs.source).toMatchObject({ nodeId: "source-node", terminalId: "t1" });
    expect(refs.target).toMatchObject({ nodeId: "target-node", terminalId: "t1" });
  });

  test("retargets routable line-like device endpoints without changing its device identity", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line");
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      { x: 80, y: 100 },
      { x: 360, y: 100 },
      "layer-a"
    );

    const retargeted = setRoutableLineDeviceEndpoints(line, { x: 120, y: 160 }, { x: 500, y: 280 });
    const points = routableLineDeviceCanvasPoints(retargeted);

    expect(retargeted.id).toBe(line.id);
    expect(retargeted.name).toBe(line.name);
    expect(retargeted.layerId).toBe(line.layerId);
    expect(getTerminalPoint(retargeted, "t1")).toEqual({ x: 120, y: 160 });
    expect(getTerminalPoint(retargeted, "t2")).toEqual({ x: 500, y: 280 });
    expect(points[0]).toEqual({ x: 120, y: 160 });
    expect(points[points.length - 1]).toEqual({ x: 500, y: 280 });
  });

  test("syncs routable line-like device endpoints to attached terminals before rerouting", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "source-node" };
    const target = { ...createDefaultNode("ac-load", { x: 420, y: 120 }), id: "target-node" };
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      getTerminalPoint(source, "t1"),
      getTerminalPoint(target, "t1"),
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(target, "t1")
      }
    );
    const movedTarget = { ...target, position: { x: 520, y: 180 } };

    const updates = rebuildRoutableLineDeviceRouteUpdates(
      [source, movedTarget, line],
      [line.id],
      { width: 760, height: 480 },
      [source, target, line]
    );

    expect(updates.map((node) => node.id)).toEqual([line.id]);
    expect(getTerminalPoint(updates[0], "t1")).toEqual(getTerminalPoint(source, "t1"));
    expect(getTerminalPoint(updates[0], "t2")).toEqual(getTerminalPoint(movedTarget, "t1"));
  });

  test("syncs routable line-like device endpoints when both attached devices move", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line");
    const source = { ...createDefaultNode("dc-source", { x: 120, y: 140 }), id: "source-node" };
    const target = { ...createDefaultNode("dc-load", { x: 520, y: 260 }), id: "target-node" };
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      getTerminalPoint(source, "t1"),
      getTerminalPoint(target, "t1"),
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(target, "t1")
      }
    );
    const movedSource = { ...source, position: { x: source.position.x + 80, y: source.position.y + 40 } };
    const movedTarget = { ...target, position: { x: target.position.x - 70, y: target.position.y + 90 } };

    const updates = rebuildRoutableLineDeviceRouteUpdates(
      [movedSource, movedTarget, line],
      [line.id],
      { width: 900, height: 640 },
      [source, target, line]
    );

    expect(updates.map((node) => node.id)).toEqual([line.id]);
    expect(getTerminalPoint(updates[0], "t1")).toEqual(getTerminalPoint(movedSource, "t1"));
    expect(getTerminalPoint(updates[0], "t2")).toEqual(getTerminalPoint(movedTarget, "t1"));
    const points = routableLineDeviceCanvasPoints(updates[0]);
    expect(points[0]).toEqual(getTerminalPoint(movedSource, "t1"));
    expect(points[points.length - 1]).toEqual(getTerminalPoint(movedTarget, "t1"));
  });

  test("infers missing routable line-like device endpoint refs before syncing moved terminals", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line");
    const source = { ...createDefaultNode("dc-source", { x: 100, y: 120 }), id: "source-node" };
    const target = { ...createDefaultNode("dc-load", { x: 420, y: 120 }), id: "target-node" };
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      getTerminalPoint(source, "t1"),
      getTerminalPoint(target, "t1"),
      "layer-a"
    );
    const movedTarget = { ...target, position: { x: 520, y: 180 } };

    expect(routableLineDeviceEndpointRefs(line)).toEqual({});

    const updates = rebuildRoutableLineDeviceRouteUpdates(
      [source, movedTarget, line],
      [line.id],
      { width: 760, height: 480 },
      [source, target, line]
    );

    expect(updates.map((node) => node.id)).toEqual([line.id]);
    expect(getTerminalPoint(updates[0], "t1")).toEqual(getTerminalPoint(source, "t1"));
    expect(getTerminalPoint(updates[0], "t2")).toEqual(getTerminalPoint(movedTarget, "t1"));
    expect(routableLineDeviceEndpointRefs(updates[0]).target).toMatchObject({ nodeId: "target-node", terminalId: "t1" });
  });

  test("routes routable line-like device endpoints along attached terminal directions", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "source-node" };
    const bus = { ...createDefaultNode("ac-bus", { x: 520, y: 80 }), id: "target-bus" };
    const sourcePoint = getTerminalPoint(source, "t1");
    const targetPoint = projectPointToBusCenterline(bus, { x: 480, y: 80 });
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      sourcePoint,
      targetPoint,
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(bus, "t1", targetPoint)
      }
    );

    const routed = routeRoutableLineDevice(line, [source, bus, line], { width: 760, height: 480 });
    const points = routableLineDeviceCanvasPoints(routed);
    const firstSegmentNormal = {
      x: Math.sign(points[1].x - points[0].x),
      y: Math.sign(points[1].y - points[0].y)
    };
    const expectedNormal = getRouteEndpointNormal(source, points[0], points[points.length - 1], "t1");

    expect(points.length).toBeGreaterThan(2);
    expect(points[0]).toEqual(sourcePoint);
    expect(firstSegmentNormal).toEqual(expectedNormal);
  });

  test("routes routable line-like devices around attached endpoint device bodies", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    const bus = { ...createDefaultNode("ac-bus", { x: 260, y: 140 }), id: "source-bus" };
    const source = { ...createDefaultNode("ac-source", { x: 700, y: 420 }), id: "target-source" };
    const busPoint = projectPointToBusCenterline(bus, { x: 170, y: 140 });
    const sourcePoint = getTerminalPoint(source, "t1");
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      busPoint,
      sourcePoint,
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(bus, "t1", busPoint),
        target: routableLineDeviceEndpointRefForNode(source, "t1")
      }
    );

    const routed = routeRoutableLineDevice(line, [bus, source, line], { width: 980, height: 680 });
    const points = routableLineDeviceCanvasPoints(routed);

    expect(points.length).toBeGreaterThan(2);
    for (let index = 1; index < points.length - 1; index += 1) {
      expect(segmentIntersectsNodeBody(points[index - 1], points[index], source)).toBe(false);
    }
  });

  test("routes routable line-like devices outward from a source terminal before returning to a bus", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    const source = { ...createDefaultNode("ac-source", { x: 700, y: 420 }), id: "source-node" };
    const bus = { ...createDefaultNode("ac-bus", { x: 260, y: 140 }), id: "target-bus" };
    const sourcePoint = getTerminalPoint(source, "t1");
    const busPoint = projectPointToBusCenterline(bus, { x: 170, y: 140 });
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      sourcePoint,
      busPoint,
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(bus, "t1", busPoint)
      }
    );

    const routed = routeRoutableLineDevice(line, [source, bus, line], { width: 980, height: 680 });
    const points = routableLineDeviceCanvasPoints(routed);

    expect(points.length).toBeGreaterThan(2);
    for (let index = 2; index < points.length; index += 1) {
      expect(segmentIntersectsNodeBody(points[index - 1], points[index], source)).toBe(false);
    }
  });

  test("reroutes screenshot-like routable line devices away from the source device body", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    const source = {
      ...createDefaultNode("ac-source", { x: 1163, y: 468 }),
      id: "source-node",
      size: { width: 150, height: 100 }
    };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 790, y: 241 }),
      id: "target-bus",
      size: { width: 150, height: 36 }
    };
    const sourcePoint = getTerminalPoint(source, "t1");
    const busPoint = projectPointToBusCenterline(bus, { x: 751, y: 241 });
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      sourcePoint,
      busPoint,
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(bus, "t1", busPoint)
      }
    );

    const routed = routeRoutableLineDevice(line, [source, bus, line], { width: 1400, height: 820 });
    const points = routableLineDeviceCanvasPoints(routed);

    expect(points.length).toBeGreaterThan(2);
    for (let index = 2; index < points.length; index += 1) {
      expect(segmentIntersectsNodeBody(points[index - 1], points[index], source)).toBe(false);
    }
  });

  test("repairs unsafe stored routable line-like device paths on model load", () => {
    const source = {
      ...createDefaultNode("ac-source", { x: 1163, y: 468 }),
      id: "ac-source-z23vius",
      name: "交流电源-2",
      size: { width: 150, height: 100 },
      terminals: [
        {
          id: "t1",
          label: "交流设备端1",
          type: "ac" as const,
          anchor: { x: 0.5, y: 0 },
          nodeNumber: "N2038",
          vbase: "0"
        }
      ]
    };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 790, y: 241 }),
      id: "ac-bus-lnkvr4n",
      name: "交流母线-1",
      size: { width: 150, height: 36 },
      terminals: [
        {
          id: "t1",
          label: "交流设备端1",
          type: "ac" as const,
          anchor: { x: -0.5, y: 0 },
          nodeNumber: "N1957",
          vbase: "0"
        },
        {
          id: "t2",
          label: "交流设备端2",
          type: "ac" as const,
          anchor: { x: 0.5, y: 0 },
          nodeNumber: "N1957",
          vbase: "0"
        }
      ]
    };
    const baseLine = createDefaultNode("ac-routable-line", { x: 996.5, y: 354.5 });
    const unsafeLine = {
      ...baseLine,
      id: "ac-routable-line-vertical-dv06kpa",
      kind: "ac-routable-line-vertical",
      name: "交流线路（自适应）（竖向）-6",
      rotation: 0,
      size: { width: 150, height: 36 },
      terminals: [
        {
          id: "t1",
          label: "交流设备端1",
          type: "ac" as const,
          anchor: { x: 0.48, y: 0.48 },
          nodeNumber: "N1958",
          vbase: "0"
        },
        {
          id: "t2",
          label: "交流设备端2",
          type: "ac" as const,
          anchor: { x: -0.48, y: -0.48 },
          nodeNumber: "N1959",
          vbase: "0"
        }
      ],
      params: {
        ...baseLine.params,
        [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify([
          { x: 245.5, y: 113.5 },
          { x: 273.5, y: 113.5 },
          { x: 273.5, y: 92.5 },
          { x: -245.5, y: 92.5 },
          { x: -245.5, y: -81.5 },
          { x: -245.5, y: -113.5 }
        ]),
        _routableLineSourceNodeId: source.id,
        _routableLineSourceTerminalId: "t1",
        _routableLineTargetNodeId: bus.id,
        _routableLineTargetTerminalId: "t1",
        _routableLineTargetLocalPoint: JSON.stringify([{ x: -39, y: 0 }])
      }
    };
    const unsafePoints = routableLineDeviceCanvasPoints(unsafeLine);
    expect(unsafePoints.some((point, index) =>
      index > 0 && segmentIntersectsNodeBody(unsafePoints[index - 1], point, source)
    )).toBe(true);

    const repairedNodes = repairUnsafeRoutableLineDeviceRoutes([source, bus, unsafeLine], { width: 1400, height: 820 });
    const repairedLine = repairedNodes.find((node) => node.id === unsafeLine.id)!;
    const repairedPoints = routableLineDeviceCanvasPoints(repairedLine);

    expect(repairedLine).not.toBe(unsafeLine);
    for (let index = 2; index < repairedPoints.length; index += 1) {
      expect(segmentIntersectsNodeBody(repairedPoints[index - 1], repairedPoints[index], source)).toBe(false);
    }
  });

  test("rebuilds only requested routable line-like device routes", () => {
    const line = { ...createDefaultNode("heat-routable-line", { x: 320, y: 180 }), id: "heat-route" };
    line.params = {
      ...line.params,
      [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify([{ x: -260, y: 0 }, { x: 260, y: 0 }])
    };
    const untouched = { ...createDefaultNode("dc-routable-line", { x: 320, y: 300 }), id: "dc-route" };
    const blocker = createDefaultNode("single-port-heat-load", { x: 320, y: 180 });

    const updates = rebuildRoutableLineDeviceRouteUpdates([line, untouched, blocker], [line.id], { width: 760, height: 480 });

    expect(updates.map((node) => node.id)).toEqual([line.id]);
    expect(routableLineDeviceCanvasPoints(updates[0]).length).toBeGreaterThan(2);
  });

  test("initializes editable terminal voltage bases to zero", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    const dcLine = createDefaultNode("dc-line", { x: 220, y: 100 });

    expect(acLine.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
    expect(dcLine.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
  });

  test("normalizes terminal voltage base values to numeric-only input text", () => {
    expect(terminalVoltageBaseNumber("10 kV")).toBe("10");
    expect(terminalVoltageBaseNumber("750 V")).toBe("750");
    expect(terminalVoltageBaseNumber("1.05")).toBe("1.05");
    expect(normalizeVoltageBaseInput("abc10.5kV")).toBe("10.5");
    expect(normalizeVoltageBaseInput("12..34 V")).toBe("12.34");
    expect(normalizeVoltageBaseInput("kV")).toBe("");
  });

  test("scales terminal stubs from the visible device boundary toward terminals", () => {
    const converter = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 100, y: 100 });

    expect(terminalStubSegment(converter.terminals[0], 1, 1, 24, converter.kind, converter.size)).toEqual({
      from: { x: 24, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment(converter.terminals[1], 1, 1, 24, converter.kind, converter.size)).toEqual({
      from: { x: -24, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment(line.terminals[0], 1, 1, 24, line.kind, line.size)).toEqual({
      from: { x: 16, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment(line.terminals[1], 1, 1, 24, line.kind, line.size)).toEqual({
      from: { x: -16, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment(converter.terminals[1], -1, 1, 24, converter.kind, converter.size)).toEqual({
      from: { x: 24, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment(converter.terminals[1], 2, 0.5, 24, converter.kind, converter.size)).toEqual({
      from: { x: -36, y: 0 },
      to: { x: 0, y: 0 }
    });
    expect(terminalStubSegment({ anchor: { x: 0.25, y: 0 } })).toEqual({
      from: { x: -24, y: 0 },
      to: { x: 0, y: 0 }
    });
  });

  test("extends electric load terminal stubs to the smaller vertical load body", () => {
    const stubStartPoint = (node: ModelNode, terminal = node.terminals[0]) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, 1, 1, node.kind);
      const stub = terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size);
      return {
        x: renderPoint.x + stub.from.x,
        y: renderPoint.y + stub.from.y
      };
    };
    const withOnlyTerminal = (node: ModelNode, anchor: Point): ModelNode => ({
      ...node,
      terminals: [{ ...node.terminals[0], anchor }]
    });

    for (const node of [createDefaultNode("ac-load", { x: 100, y: 100 }), createDefaultNode("dc-load", { x: 220, y: 100 })]) {
      expect(stubStartPoint(node).y).toBeCloseTo(-node.size.height * 2 / 9);
      expect(stubStartPoint(withOnlyTerminal(node, { x: 0.5, y: 0 })).x).toBeCloseTo(node.size.width / 9);
      expect(node.size).toEqual({ width: 150, height: 102 });
    }
  });

  test("stops border terminal stubs at visible arcs and borders", () => {
    const stubStartPoint = (node: ModelNode, terminal = node.terminals[0]) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, 1, 1, node.kind);
      const stub = terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size);
      return {
        x: renderPoint.x + stub.from.x,
        y: renderPoint.y + stub.from.y
      };
    };

    const acSource = createDefaultNode("ac-source", { x: 200, y: 120 });
    expect(stubStartPoint(acSource).x).toBeCloseTo(Math.min(acSource.size.width, acSource.size.height) * 0.37);

    const withTerminalAnchor = (node: ModelNode, anchor: Point): ModelNode => ({
      ...node,
      terminals: [{ ...node.terminals[0], anchor }]
    });
    const glyphScale = (node: ModelNode) => Math.max(1, Math.max(node.size.width, node.size.height) / 100);
    const pvSource = createDefaultNode("ac-pv-source", { x: 200, y: 120 });
    const windSource = createDefaultNode("ac-wind-source", { x: 200, y: 120 });
    const thermalSource = createDefaultNode("ac-thermal-source", { x: 200, y: 120 });
    const hydroSource = createDefaultNode("ac-hydro-source", { x: 200, y: 120 });
    const nuclearSource = createDefaultNode("ac-nuclear-source", { x: 200, y: 120 });
    expect(stubStartPoint(withTerminalAnchor(pvSource, { x: 0, y: -0.5 })).y).toBeCloseTo(-22 * glyphScale(pvSource));
    expect(stubStartPoint(withTerminalAnchor(windSource, { x: 0, y: -0.5 })).y).toBeCloseTo(-18 * glyphScale(windSource));
    expect(stubStartPoint(withTerminalAnchor(thermalSource, { x: 0, y: -0.5 })).y).toBeCloseTo(-32 * glyphScale(thermalSource));
    expect(stubStartPoint(withTerminalAnchor(hydroSource, { x: 0, y: -0.5 })).y).toBeCloseTo(-24 * glyphScale(hydroSource));
    expect(stubStartPoint(withTerminalAnchor(nuclearSource, { x: 0, y: -0.5 })).y).toBeCloseTo(-22 * glyphScale(nuclearSource));

    const converter = createDefaultNode("acac-converter", { x: 200, y: 120 });
    const converterGlyphScale = Math.max(1, Math.max(converter.size.width, converter.size.height) / 100);
    expect(stubStartPoint(converter, converter.terminals[0]).x).toBeCloseTo(-converter.size.width / 2 + 8 * converterGlyphScale);
    expect(stubStartPoint(converter, converter.terminals[1]).x).toBeCloseTo(converter.size.width / 2 - 8 * converterGlyphScale);

    const transformer = createDefaultNode("ac-three-winding-transformer", { x: 200, y: 120 });
    const transformerGlyphScale = Math.max(1, Math.max(transformer.size.width, transformer.size.height) / 100);
    expect(stubStartPoint(transformer, transformer.terminals[0]).x).toBeCloseTo(-(16 + 15 + 8) * transformerGlyphScale);
    expect(stubStartPoint(transformer, transformer.terminals[1]).x).toBeCloseTo((16 + 15 + 8) * transformerGlyphScale);

    const pipeline = createDefaultNode("hydrogen-pipeline", { x: 200, y: 120 });
    const pipelineGlyphScale = Math.max(1, Math.max(pipeline.size.width, pipeline.size.height) / 100);
    expect(stubStartPoint(pipeline, pipeline.terminals[0]).x).toBeCloseTo((-pipeline.size.width / 2) + 8 * pipelineGlyphScale);
  });

  test("connects heat source and boiler terminal stubs to the visible body", () => {
    const stubStartPoint = (node: ModelNode, terminal = node.terminals[0]) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, 1, 1, node.kind);
      const stub = terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size);
      return {
        x: renderPoint.x + stub.from.x,
        y: renderPoint.y + stub.from.y
      };
    };
    const glyphScale = (node: ModelNode) => Math.max(1, Math.max(node.size.width, node.size.height) / 100);
    const designSize = (node: ModelNode) => {
      const scale = glyphScale(node);
      return { width: node.size.width / scale, height: node.size.height / scale, scale };
    };
    const withOnlyTerminal = (node: ModelNode, anchor: Point): ModelNode => ({
      ...node,
      terminals: [{ ...node.terminals[0], anchor }]
    });

    const boiler = createDefaultNode("heat-boiler", { x: 200, y: 120 });
    const boilerDesign = designSize(boiler);
    const boilerBodyHalfWidth = Math.min(boilerDesign.width * 0.66, 58) * boilerDesign.scale / 2;
    expect(stubStartPoint(boiler).x).toBeCloseTo(boilerBodyHalfWidth);

    const twoPortBoiler = createDefaultNode("two-port-heat-boiler", { x: 200, y: 120 });
    const twoPortBoilerDesign = designSize(twoPortBoiler);
    const twoPortBoilerBodyHalfWidth = Math.min(twoPortBoilerDesign.width * 0.66, 58) * twoPortBoilerDesign.scale / 2;
    expect(stubStartPoint(twoPortBoiler, twoPortBoiler.terminals[0]).x).toBeCloseTo(-twoPortBoilerBodyHalfWidth);
    expect(stubStartPoint(twoPortBoiler, twoPortBoiler.terminals[1]).x).toBeCloseTo(twoPortBoilerBodyHalfWidth);

    const verticalBoiler = withOnlyTerminal(boiler, { x: 0, y: -0.5 });
    expect(stubStartPoint(verticalBoiler).y).toBeCloseTo(-24 * boilerDesign.scale);
    const verticalBoilerBottom = withOnlyTerminal(boiler, { x: 0, y: 0.5 });
    expect(stubStartPoint(verticalBoilerBottom).y).toBeCloseTo(25 * boilerDesign.scale);

    const heatSource = createDefaultNode("heat-source", { x: 200, y: 120 });
    const heatSourceDesign = designSize(heatSource);
    const sourceRadius = Math.min(heatSourceDesign.width, heatSourceDesign.height) * 0.27;
    const verticalSourceTop = withOnlyTerminal(heatSource, { x: 0, y: -0.5 });
    expect(stubStartPoint(verticalSourceTop).y).toBeCloseTo(-24 * heatSourceDesign.scale);
    const verticalSourceBottom = withOnlyTerminal(heatSource, { x: 0, y: 0.5 });
    expect(stubStartPoint(verticalSourceBottom).y).toBeCloseTo((sourceRadius + 2) * heatSourceDesign.scale);
  });

  test("connects vertical terminal stubs for compact body devices", () => {
    const stubStartPoint = (node: ModelNode) => {
      const terminal = node.terminals[0];
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, 1, 1, node.kind);
      const stub = terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size);
      return {
        x: renderPoint.x + stub.from.x,
        y: renderPoint.y + stub.from.y
      };
    };
    const withTopTerminal = (kind: DeviceKind): ModelNode => {
      const node = createDefaultNode(kind, { x: 200, y: 120 });
      return {
        ...node,
        terminals: [{ ...node.terminals[0], anchor: { x: 0, y: -0.5 } }]
      };
    };
    const designSize = (node: ModelNode) => {
      const scale = Math.max(1, Math.max(node.size.width, node.size.height) / 100);
      return { width: node.size.width / scale, height: node.size.height / scale, scale };
    };

    const storage = withTopTerminal("ac-storage");
    const storageDesign = designSize(storage);
    expect(stubStartPoint(storage).y).toBeCloseTo(-Math.min(storageDesign.height * 0.58, 32) * storageDesign.scale / 2);

    const electrolyzer = withTopTerminal("ac-electrolyzer");
    const electrolyzerDesign = designSize(electrolyzer);
    expect(stubStartPoint(electrolyzer).y).toBeCloseTo(-(electrolyzerDesign.height / 2 - 5) * electrolyzerDesign.scale);

    const fuelCell = withTopTerminal("dc-fuel-cell");
    const fuelCellDesign = designSize(fuelCell);
    expect(stubStartPoint(fuelCell).y).toBeCloseTo(-(fuelCellDesign.height / 2 - 6) * fuelCellDesign.scale);

    const heater = withTopTerminal("ac-heater");
    const heaterDesign = designSize(heater);
    expect(stubStartPoint(heater).y).toBeCloseTo(-(heaterDesign.height / 2 - 6) * heaterDesign.scale);

    const heatPump = withTopTerminal("heat-pump");
    const heatPumpDesign = designSize(heatPump);
    expect(stubStartPoint(heatPump).y).toBeCloseTo(-20 * heatPumpDesign.scale);
  });

  test("moves terminals on device borders outward by four pixels", () => {
    const line = createDefaultNode("ac-line", { x: 200, y: 120 });
    const insideTerminal = {
      ...line,
      terminals: [{ ...line.terminals[0], anchor: { x: 0.25, y: 0 } }]
    };
    const scaledLine = { ...createDefaultNode("ac-line", { x: 160, y: 120 }), scaleX: 2, scaleY: 0.5 };

    expect(getTerminalPoint(line, "t1")).toEqual({ x: line.position.x - line.size.width / 2 - 4, y: 120 });
    expect(getTerminalPoint(line, "t2")).toEqual({ x: line.position.x + line.size.width / 2 + 4, y: 120 });
    expect(getTerminalPoint(insideTerminal, "t1")).toEqual({ x: Math.round(line.position.x + line.size.width * 0.25), y: 120 });
    expect(terminalRenderLocalPoint(line.terminals[0], line.size, 1, 1)).toEqual({ x: -line.size.width / 2 - 4, y: 0 });
    expect(terminalRenderLocalPoint(line.terminals[1], line.size, 1, 1)).toEqual({ x: line.size.width / 2 + 4, y: 0 });
    expect(terminalRenderLocalPoint(scaledLine.terminals[1], scaledLine.size, 2, 0.5)).toEqual({ x: scaledLine.size.width / 2 + 4 / 2, y: 0 });
  });

  test("moves converter terminals twelve pixels away from the device border", () => {
    const dcdc = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
    const dcac = createDefaultNode("acdc-converter", { x: 260, y: 100 });
    const acac = createDefaultNode("acac-converter", { x: 420, y: 100 });
    const scaled = { ...createDefaultNode("dcdc-converter", { x: 100, y: 200 }), scaleX: 2, scaleY: 0.5 };

    expect(getTerminalPoint(dcdc, "t1")).toEqual({ x: dcdc.position.x - dcdc.size.width / 2 - 12, y: 100 });
    expect(getTerminalPoint(dcdc, "t2")).toEqual({ x: dcdc.position.x + dcdc.size.width / 2 + 12, y: 100 });
    expect(getTerminalPoint(dcac, "t1")).toEqual({ x: dcac.position.x - dcac.size.width / 2 - 12, y: 100 });
    expect(getTerminalPoint(dcac, "t2")).toEqual({ x: dcac.position.x + dcac.size.width / 2 + 12, y: 100 });
    expect(getTerminalPoint(acac, "t1")).toEqual({ x: acac.position.x - acac.size.width / 2 - 12, y: 100 });
    expect(getTerminalPoint(acac, "t2")).toEqual({ x: acac.position.x + acac.size.width / 2 + 12, y: 100 });
    expect(terminalRenderLocalPoint(dcdc.terminals[0], dcdc.size, 1, 1, dcdc.kind)).toEqual({ x: -dcdc.size.width / 2 - 12, y: 0 });
    expect(terminalRenderLocalPoint(dcdc.terminals[1], dcdc.size, 1, 1, dcdc.kind)).toEqual({ x: dcdc.size.width / 2 + 12, y: 0 });
    expect(terminalRenderLocalPoint(scaled.terminals[1], scaled.size, 2, 0.5, scaled.kind)).toEqual({ x: scaled.size.width / 2 + 12 / 2, y: 0 });
    expect(terminalStubSegment(dcdc.terminals[0], 1, 1, 24, dcdc.kind, dcdc.size)).toEqual({
      from: { x: 24, y: 0 },
      to: { x: 0, y: 0 }
    });
  });

  test("moves close-border cross-energy terminals twelve pixels away from the device border", () => {
    const kinds = [
      "ac-electrolyzer",
      "dc-electrolyzer",
      "ac-fuel-cell",
      "dc-fuel-cell",
      "ac-heater",
      "dc-heater",
      "ac-two-port-heater",
      "dc-two-port-heater"
    ] as const;

    for (const kind of kinds) {
      const node = createDefaultNode(kind, { x: 200, y: 120 });
      expect(getTerminalPoint(node, "t1").x).toBe(200 - node.size.width / 2 - 12);
      expect(terminalRenderLocalPoint(node.terminals[0], node.size, 1, 1, node.kind).x).toBe(-node.size.width / 2 - 12);
      const expectedStubLength = kind.includes("electrolyzer") ? 21 : 22.5;
      expect(terminalStubSegment(node.terminals[0], 1, 1, 24, node.kind, node.size).from.x).toBeCloseTo(expectedStubLength);
    }
  });

  test("moves hydrogen and heat pipeline terminals sixteen pixels away from the device border", () => {
    const kinds = ["hydrogen-pipeline", "heat-pipeline"] as const;

    for (const kind of kinds) {
      const node = createDefaultNode(kind, { x: 200, y: 120 });
      expect(getTerminalPoint(node, "t1")).toEqual({ x: 200 - node.size.width / 2 - 16, y: 120 });
      expect(getTerminalPoint(node, "t2")).toEqual({ x: 200 + node.size.width / 2 + 16, y: 120 });
      expect(terminalRenderLocalPoint(node.terminals[0], node.size, 1, 1, node.kind).x).toBe(-node.size.width / 2 - 16);
      expect(terminalRenderLocalPoint(node.terminals[1], node.size, 1, 1, node.kind).x).toBe(node.size.width / 2 + 16);
      expect(terminalStubSegment(node.terminals[0], 1, 1, 24, node.kind, node.size).from.x).toBe(28);
      expect(terminalStubSegment(node.terminals[1], 1, 1, 24, node.kind, node.size).from.x).toBe(-28);
    }
  });

  test("resolves device glyph line color and width from variant and params", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    expect(getDeviceStrokeColor(acLine)).toBe("#2563eb");
    expect(getDeviceStrokeWidth(acLine)).toBe(4);

    const customColored = { ...acLine, params: { ...acLine.params, foregroundColor: "#123456", lineWidth: "3.5" } };
    expect(getDeviceStrokeColor(customColored)).toBe("#123456");
    expect(getDeviceStrokeWidth(customColored)).toBe(3.5);

    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 100 });
    expect(getDeviceStrokeColor(dcLoad)).toBe("#0f766e");
    expect(getDeviceStrokeWidth(dcLoad)).toBe(2.5);

    const electrolyzer = createDefaultNode("ac-electrolyzer", { x: 340, y: 100 });
    expect(getDeviceStrokeColor(electrolyzer)).toBe("#7c3aed");
    expect(getDeviceStrokeWidth(electrolyzer)).toBe(2.3);
  });

  test("scales terminal stub stroke width across the stub direction", () => {
    const scaledLine = { ...createDefaultNode("ac-line", { x: 100, y: 100 }), scaleX: 2, scaleY: 0.5 };

    expect(terminalStubStrokeWidth(scaledLine, { anchor: { x: 0.5, y: 0 } })).toBe(2);
    expect(terminalStubStrokeWidth(scaledLine, { anchor: { x: 0, y: 0.5 } })).toBe(8);
  });

  test("builds shortest internal connectors from storage tank boundary endpoints to the tank body", () => {
    const thermalTank = createDefaultNode("thermal-storage-tank", { x: 200, y: 120 });
    const hydrogenTank = createDefaultNode("hydrogen-tank", { x: 360, y: 120 });
    const heatBus = createDefaultNode("heat-bus", { x: 520, y: 120 });

    const thermalEndpoint = projectPointToBusCenterline(thermalTank, { x: 100, y: 120 });
    const thermalSegment = boundaryBusInternalConnectorSegment(thermalTank, thermalEndpoint);
    expect(thermalSegment).toEqual({
      from: thermalEndpoint,
      to: { x: thermalEndpoint.x + 10, y: thermalEndpoint.y }
    });

    const movedThermalEndpoint = projectPointToBusCenterline(thermalTank, { x: 300, y: 128 });
    const movedThermalSegment = boundaryBusInternalConnectorSegment(thermalTank, movedThermalEndpoint);
    expect(movedThermalSegment).toEqual({
      from: movedThermalEndpoint,
      to: { x: movedThermalEndpoint.x - 10, y: movedThermalEndpoint.y }
    });

    const hydrogenEndpoint = projectPointToBusCenterline(hydrogenTank, { x: 300, y: 120 });
    const hydrogenSegment = boundaryBusInternalConnectorSegment(hydrogenTank, hydrogenEndpoint);
    expect(hydrogenSegment).toEqual({
      from: hydrogenEndpoint,
      to: { x: hydrogenEndpoint.x + 10, y: hydrogenEndpoint.y }
    });

    expect(boundaryBusInternalConnectorSegment(heatBus, projectPointToBusCenterline(heatBus, { x: 470, y: 120 }))).toBeNull();
  });

  test("scales storage tank internal connector stroke width with the connector cross axis", () => {
    const tank = { ...createDefaultNode("thermal-storage-tank", { x: 200, y: 120 }), scaleX: 2, scaleY: 0.5 };
    const endpoint = projectPointToBusCenterline(tank, { x: 80, y: 120 });
    const segment = boundaryBusInternalConnectorSegment(tank, endpoint);

    expect(segment).not.toBeNull();
    expect(boundaryBusInternalConnectorStrokeWidth(tank, segment!)).toBe(1.2);
  });

  test("allocates permanent device idx by E section without reusing deleted gaps", () => {
    const firstLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const fourthLoad = createDefaultNode("ac-load", { x: 220, y: 100 });
    firstLoad.params = { ...firstLoad.params, idx: "1" };
    fourthLoad.params = { ...fourthLoad.params, idx: "4" };

    const counters = deriveDeviceIndexCounters([firstLoad, fourthLoad]);
    const { node: nextLoad, counters: nextCounters } = assignPermanentDeviceIndex(
      createDefaultNode("ac-load", { x: 340, y: 100 }),
      counters
    );

    expect(nextLoad.params.idx).toBe("5");
    expect(nextLoad.name).toBe("交流负荷-5");
    expect(nextCounters.ACLoad).toBe(5);
  });

  test("renames pasted generated device copies with the newly allocated idx", () => {
    const copiedLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    copiedLoad.name = "交流负荷 副本";

    const { node: pastedLoad } = assignPermanentDeviceIndex(copiedLoad, { ACLoad: 4 });

    expect(pastedLoad.params.idx).toBe("5");
    expect(pastedLoad.name).toBe("交流负荷-5");
  });

  test("renames pasted user-named device copies with the component label and newly allocated idx", () => {
    const copiedLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    copiedLoad.name = "用户命名负荷 副本";
    copiedLoad.params = { ...copiedLoad.params, idx: "2" };

    const resetLoad = resetDeviceIndexesForPaste(copiedLoad);
    const { node: pastedLoad } = assignPermanentDeviceIndex(resetLoad, { ACLoad: 4 });

    expect(pastedLoad.params.idx).toBe("5");
    expect(pastedLoad.name).toBe("交流负荷-5");
  });

  test("renames pasted legacy device copies without an old idx using the component label and new idx", () => {
    const copiedLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    copiedLoad.name = "老模型负荷 副本";
    delete copiedLoad.params.idx;

    const resetLoad = resetDeviceIndexesForPaste(copiedLoad);
    const { node: pastedLoad } = assignPermanentDeviceIndex(resetLoad, { ACLoad: 4 });

    expect(pastedLoad.params.idx).toBe("5");
    expect(pastedLoad.name).toBe("交流负荷-5");
  });

  test("preserves user edited device names when allocating a missing idx", () => {
    const userNamedLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    userNamedLoad.name = "用户命名负荷";

    const { node: indexedLoad } = assignPermanentDeviceIndex(userNamedLoad, {});

    expect(indexedLoad.params.idx).toBe("1");
    expect(indexedLoad.name).toBe("用户命名负荷");
  });

  test("keeps idx counters independent for each E device section and skips static graphics", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const acGenerator = createDefaultNode("ac-source", { x: 220, y: 100 });
    const text = createDefaultNode("static-text", { x: 340, y: 100 });
    acLoad.params = { ...acLoad.params, idx: "8" };
    acGenerator.params = { ...acGenerator.params, idx: "2" };

    const counters = deriveDeviceIndexCounters([acLoad, acGenerator, text]);
    const { node: nextGenerator, counters: generatorCounters } = assignPermanentDeviceIndex(
      createDefaultNode("ac-source", { x: 460, y: 100 }),
      counters
    );
    const { node: staticNode, counters: staticCounters } = assignPermanentDeviceIndex(
      createDefaultNode("static-rect", { x: 580, y: 100 }),
      generatorCounters
    );

    expect(counters).toMatchObject({ ACLoad: 8, ACGenerator: 2 });
    expect(counters).not.toHaveProperty("static-text");
    expect(nextGenerator.params.idx).toBe("3");
    expect(staticNode.params.idx).toBeUndefined();
    expect(staticCounters).toEqual(generatorCounters);
  });

  test("builds E parameter files without platform-only device fields", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const staticText = createDefaultNode("static-text", { x: 200, y: 100 });
    acLoad.name = "load_1";
    acLoad.params = {
      ...acLoad.params,
      component_type: "ACLoad",
      idx: "7",
      node: "3",
      pbase: "9.5",
      ratedActivePower: "不要导出",
      backgroundImage: "/api/images/asset"
    };

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "E导出模型",
        powerUnit: "MW",
        voltageUnit: "kV",
        currentUnit: "A",
        powerBaseValue: 100,
        nodes: [acLoad, staticText],
        edges: []
      })
    );

    const exportedLoad = payload.ACLoad.rows.find((row) => row.name === "load_1");
    expect(payload.ACNode.rows).toHaveLength(1);
    expect(exportedLoad).toMatchObject({
      idx: "7",
      name: "load_1",
      node: "1",
      pbase: "9.5",
      run_stat: "1"
    });
    expect(payload.ACLoad.columns).not.toContain("ratedActivePower");
    expect(payload.ACLoad.columns).not.toContain("backgroundImage");
    expect(buildEDeviceParameterFile({
      version: 1,
      name: "E导出模型",
      nodes: [acLoad, staticText],
      edges: []
    })).not.toContain("ratedActivePower");
  });

  test("sorts E section rows by numeric idx before exporting", () => {
    const load10 = createDefaultNode("ac-load", { x: 100, y: 100 });
    const load2 = createDefaultNode("ac-load", { x: 220, y: 100 });
    const load1 = createDefaultNode("ac-load", { x: 340, y: 100 });
    load10.name = "load10";
    load2.name = "load2";
    load1.name = "load1";
    load10.params = { ...load10.params, idx: "10" };
    load2.params = { ...load2.params, idx: "2" };
    load1.params = { ...load1.params, idx: "1" };

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "idx排序测试",
        nodes: [load10, load2, load1],
        edges: []
      })
    );

    expect(payload.ACLoad.rows.map((row) => row.idx)).toEqual(["1", "2", "10"]);
    expect(payload.ACLoad.rows.map((row) => row.name)).toEqual(["load1", "load2", "load10"]);
  });

  test("uses requested default impedance values for new AC and DC lines", () => {
    const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
    const dcLine = createDefaultNode("dc-line", { x: 240, y: 100 });

    expect(acLine.params).toMatchObject({ r: "0.1", x: "1.0", b: "0.0" });
    expect(dcLine.params).toMatchObject({ r: "1.0" });

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "线路默认参数测试",
      nodes: [acLine, dcLine],
      edges: []
    }));

    expect(payload.ACBranch.rows[0]).toMatchObject({ r: "0.1", x: "1.0", b: "0.0" });
    expect(payload.DCBranch.rows[0]).toMatchObject({ r: "1.0" });
  });

  test("maps graphical AC and DC buses to real bus sections in E parameter files", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 220 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 220 });
    acBus.name = "ac_bus";
    dcBus.name = "dc_bus";
    acBus.params = { ...acBus.params, component_type: "ACNode", idx: "21", vbase: "380", run_stat: "1" };
    dcBus.params = { ...dcBus.params, component_type: "DCNode", idx: "1", vbase: "720", run_stat: "1" };
    acLoad.terminals[0].vbase = "380";
    dcLoad.terminals[0].vbase = "720";

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "母线分组",
        nodes: [acBus, dcBus, acLoad, dcLoad],
        edges: [
          { id: "ac-bus-load", sourceId: acBus.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
          { id: "dc-bus-load", sourceId: dcBus.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
        ]
      })
    );

    const acRealBus = payload.ACRealBs.rows[0];
    const dcRealBus = payload.DCRealBs.rows[0];
    expect(payload.ACNode.rows).toHaveLength(1);
    expect(payload.DCNode.rows).toHaveLength(1);
    expect(acRealBus).toEqual({
      idx: "21",
      name: "ac_bus",
      node: "1",
      run_stat: "1"
    });
    expect(dcRealBus).toEqual({
      idx: "1",
      name: "dc_bus",
      node: "1",
      run_stat: "1"
    });
  });

  test("exports ACNode and DCNode records from calculated graph topology", () => {
    const acSource = createDefaultNode("ac-source", { x: 80, y: 100 });
    const acLine = createDefaultNode("ac-line", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 360, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 80, y: 240 });
    const dcLine = createDefaultNode("dc-line", { x: 220, y: 240 });
    const dcLoad = createDefaultNode("dc-load", { x: 360, y: 240 });
    acSource.name = "ac_src";
    acLoad.name = "ac_load";
    dcSource.name = "dc_src";
    dcLoad.name = "dc_load";
    acSource.terminals[0].vbase = "10 kV";
    acLine.terminals[0].vbase = "10 kV";
    acLine.terminals[1].vbase = "10 kV";
    acLoad.terminals[0].vbase = "10 kV";
    dcSource.terminals[0].vbase = "750 V";
    dcLine.terminals[0].vbase = "750 V";
    dcLine.terminals[1].vbase = "750 V";
    dcLoad.terminals[0].vbase = "750 V";
    acLine.params = { ...acLine.params, idx: "1", i_node: "99", j_node: "100" };
    acLoad.params = { ...acLoad.params, idx: "1", node: "100" };
    dcLine.params = { ...dcLine.params, idx: "1", i_node: "88", j_node: "89" };
    dcLoad.params = { ...dcLoad.params, idx: "1", node: "89" };

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "拓扑节点导出",
        nodes: [acSource, acLine, acLoad, dcSource, dcLine, dcLoad],
        edges: [
          { id: "ac-source-line", sourceId: acSource.id, targetId: acLine.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
          { id: "ac-line-load", sourceId: acLine.id, targetId: acLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
          { id: "dc-source-line", sourceId: dcSource.id, targetId: dcLine.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
          { id: "dc-line-load", sourceId: dcLine.id, targetId: dcLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
        ]
      })
    );

    const acNodes = payload.ACNode.rows;
    const dcNodes = payload.DCNode.rows;
    const acBranch = payload.ACBranch.rows[0];
    const dcBranch = payload.DCBranch.rows[0];
    const exportedAcLoad = payload.ACLoad.rows.find((row) => row.name === "ac_load");
    const exportedDcLoad = payload.DCLoad.rows.find((row) => row.name === "dc_load");

    expect(acNodes.map((row) => row.idx)).toEqual(["1", "2"]);
    expect(acNodes.map((row) => row.name)).toEqual(["ac_src", "ac_load"]);
    expect(acNodes.map((row) => row.vbase)).toEqual(["10", "10"]);
    expect(dcNodes.map((row) => row.idx)).toEqual(["1", "2"]);
    expect(dcNodes.map((row) => row.name)).toEqual(["dc_src", "dc_load"]);
    expect(dcNodes.map((row) => row.vbase)).toEqual(["750", "750"]);
    expect(acBranch).toMatchObject({ i_node: "1", j_node: "2" });
    expect(dcBranch).toMatchObject({ i_node: "1", j_node: "2" });
    expect(exportedAcLoad?.node).toBe("2");
    expect(exportedDcLoad?.node).toBe("2");
  });

  test("expands three-winding transformers into three ACTransformer branches with an auto neutral node", () => {
    const highBus = createDefaultNode("ac-bus", { x: 80, y: 80 });
    const mediumBus = createDefaultNode("ac-bus", { x: 80, y: 260 });
    const lowBus = createDefaultNode("ac-bus", { x: 80, y: 440 });
    const transformer = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 460, y: 260 }), {}).node;
    transformer.name = "T3";
    transformer.terminals[0].vbase = "220 kV";
    transformer.terminals[1].vbase = "110 kV";
    transformer.terminals[2].vbase = "10 kV";
    highBus.terminals.forEach((terminal) => { terminal.vbase = "220 kV"; });
    mediumBus.terminals.forEach((terminal) => { terminal.vbase = "110 kV"; });
    lowBus.terminals.forEach((terminal) => { terminal.vbase = "10 kV"; });

    const edges: Edge[] = [
      { id: "high", sourceId: highBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "medium", sourceId: mediumBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
      { id: "low", sourceId: lowBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t3" }
    ];

    const calculated = calculateElectricalTopology([highBus, mediumBus, lowBus, transformer], edges);
    const calculatedTransformer = calculated.find((node) => node.id === transformer.id)!;

    expect(calculatedTransformer.terminals.map((terminal) => terminal.nodeNumber)).toEqual(["1", "2", "3"]);
    expect(calculatedTransformer.params.neutral_node).toBe("4");
    expect(calculatedTransformer.params.neutral_vbase).toBe("1.0");

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "三绕组主变导出",
        nodes: [highBus, mediumBus, lowBus, transformer],
        edges
      })
    );
    const acNodes = payload.ACNode.rows;
    const neutralNode = acNodes.find((row) => row.idx === "4");
    const transformerBranches = payload.ACTransformer.rows.filter((row) => row.name.startsWith("T3_"));
    const acTransfomer3 = payload.ACTransfomer3.rows.find((row) => row.name === "T3");

    expect(acNodes.map((row) => row.idx)).toEqual(["1", "2", "3", "4"]);
    expect(neutralNode).toMatchObject({ name: "T3_neutral", vbase: "1.0", voltage: "1.0" });
    expect(acTransfomer3).toEqual({
      idx: "1",
      name: "T3",
      run_stat: "1",
      idx_xf_t1: "1",
      idx_xf_t2: "2",
      idx_xf_t3: "3"
    });
    expect(transformerBranches).toEqual([
      expect.objectContaining({ idx: "1", name: "T3_高压绕组", i_node: "1", j_node: "4", r: "0.0", x: "0.1", tap: "1.0" }),
      expect.objectContaining({ idx: "2", name: "T3_中压绕组", i_node: "2", j_node: "4", r: "0.0", x: "0.1", tap: "1.0" }),
      expect.objectContaining({ idx: "3", name: "T3_低压绕组", i_node: "3", j_node: "4", r: "0.0", x: "0.1", tap: "1.0" })
    ]);
  });

  test("uses the fourth terminal of a neutral-point three-winding transformer as the neutral node", () => {
    const highBus = createDefaultNode("ac-bus", { x: 80, y: 100 });
    const mediumBus = createDefaultNode("ac-bus", { x: 80, y: 220 });
    const lowBus = createDefaultNode("ac-bus", { x: 80, y: 340 });
    const groundSwitch = assignPermanentDeviceIndex(createDefaultNode("ac-ground-disconnector", { x: 260, y: 40 }), {}).node;
    const transformer = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer-neutral", { x: 260, y: 220 }), {}).node;
    transformer.name = "T3N";
    transformer.terminals[0].vbase = "220 kV";
    transformer.terminals[1].vbase = "110 kV";
    transformer.terminals[2].vbase = "10 kV";
    transformer.terminals[3].vbase = "0.4 kV";
    highBus.terminals.forEach((terminal) => { terminal.vbase = "220 kV"; });
    mediumBus.terminals.forEach((terminal) => { terminal.vbase = "110 kV"; });
    lowBus.terminals.forEach((terminal) => { terminal.vbase = "10 kV"; });

    const edges: Edge[] = [
      { id: "high", sourceId: highBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "medium", sourceId: mediumBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
      { id: "low", sourceId: lowBus.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t3" },
      { id: "neutral", sourceId: transformer.id, targetId: groundSwitch.id, sourceTerminalId: "t4", targetTerminalId: "t1" }
    ];

    const calculated = calculateElectricalTopology([highBus, mediumBus, lowBus, groundSwitch, transformer], edges);
    const calculatedTransformer = calculated.find((node) => node.id === transformer.id)!;
    const neutralNode = calculatedTransformer.terminals[3].nodeNumber;
    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "带中性点三绕组主变导出",
        nodes: [highBus, mediumBus, lowBus, groundSwitch, transformer],
        edges
      })
    );
    const transformerBranches = payload.ACTransformer.rows.filter((row) => row.name.startsWith("T3N_"));

    expect(calculatedTransformer.terminals).toHaveLength(4);
    expect(calculatedTransformer.params.neutral_node).toBe(neutralNode);
    expect(calculatedTransformer.params.neutral_vbase).toBe("0.4");
    expect(payload.ACTransfomer3.rows.find((row) => row.name === "T3N")).toMatchObject({
      idx: transformer.params.idx,
      idx_xf_t1: transformer.params.idx_xf_t1,
      idx_xf_t2: transformer.params.idx_xf_t2,
      idx_xf_t3: transformer.params.idx_xf_t3
    });
    expect(transformerBranches.map((row) => row.j_node)).toEqual([neutralNode, neutralNode, neutralNode]);
  });

  test("creates load, line, and transformer electrical parameter defaults", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 200, y: 100 });
    const acLine = createDefaultNode("ac-line", { x: 300, y: 100 });
    const twoWinding = createDefaultNode("ac-transformer", { x: 400, y: 100 });
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 500, y: 100 });

    expect(acLoad.nodeNumber).toMatch(/^N\d+$/);
    expect(acLoad.params.ratedActivePower).toBe("5 MW");
    expect(acLoad.params.pv0).toBe("1.0");
    expect(acLoad.params.pv1).toBe("0.0");
    expect(acLoad.params.pv2).toBe("0.0");
    expect(acLoad.params.ratedReactivePower).toBe("1.2 Mvar");
    expect(acLoad.params.qv0).toBe("1.0");
    expect(acLoad.params.qv1).toBe("0.0");
    expect(acLoad.params.qv2).toBe("0.0");
    expect(dcLoad.params.ratedReactivePower).toBeUndefined();

    expect(acLine.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(acLine.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(acLine.params.r).toBe("0.1");
    expect(acLine.params.x).toBe("1.0");
    expect(acLine.params.b).toBe("0.0");

    expect(twoWinding.terminals).toHaveLength(2);
    expect(twoWinding.params.ratedCapacity).toBe("50 MVA");
    expect(twoWinding.params.resistancePu).toBe("0.0");
    expect(twoWinding.params.reactancePu).toBe("0.1");
    expect(twoWinding.params.magnetizingConductancePu).toBe("0.0");
    expect(twoWinding.params.magnetizingSusceptancePu).toBe("0.0");
    expect(twoWinding.params.tapRatio).toBe("1.0");

    expect(threeWinding.terminals).toHaveLength(3);
    expect(threeWinding.params.highRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.mediumRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.lowRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.highTapRatio).toBe("1.0");
    expect(threeWinding.params.mediumTapRatio).toBe("1.0");
    expect(threeWinding.params.lowTapRatio).toBe("1.0");
    expect(threeWinding.params.is_container).toBe("1");
    expect(threeWinding.params.neutral_node).toBe("");
    expect(threeWinding.params.neutral_vbase).toBe("1.0");
    expect(threeWinding.params.idx_xf_t1).toBe("");
    expect(threeWinding.params.idx_xf_t2).toBe("");
    expect(threeWinding.params.idx_xf_t3).toBe("");
    expect(threeWinding.params.idx_ac_transformer_t1).toBeUndefined();

    const dcdc = createDefaultNode("dcdc-converter", { x: 600, y: 100 });
    expect(dcdc.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(dcdc.params.targetEquivalentResistance).toBe("0.0");
    expect(dcdc.params.i_control_type).toBe("CTRL_P");
    expect(dcdc.params.j_control_type).toBe("SLACK");
    expect(dcdc.params.control_type).toBeUndefined();

    const acdc = createDefaultNode("acdc-converter", { x: 700, y: 100 });
    expect(acdc.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
    expect(acdc.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
    expect(acdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(acdc.params.targetEquivalentResistance).toBe("0.0");
    expect(acdc.params.control_type).toBe("DCV");
    expect(acdc.params.acControlType).toBe("定PQ");
    expect(acdc.params.dcControlType).toBe("不定");

    const acac = createDefaultNode("acac-converter", { x: 800, y: 100 });
    expect(acac.params.sourceEquivalentResistance).toBe("0.0");
    expect(acac.params.targetEquivalentResistance).toBe("0.0");
    expect(acac.params.control_type).toBe("PQQ");
    expect(acac.params.sourceControlType).toBe("定PQ");
    expect(acac.params.targetControlType).toBe("不定");

    const dcLine = createDefaultNode("dc-line", { x: 900, y: 100 });
    expect(dcLine.params.r).toBe("1.0");
    expect(dcLine.params.x).toBeUndefined();
    expect(dcLine.params.b).toBeUndefined();

    const acSwitch = createDefaultNode("ac-switch", { x: 1000, y: 100 });
    const dcBreaker = createDefaultNode("dc-breaker", { x: 1100, y: 100 });
    expect(acSwitch.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(acSwitch.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(acSwitch.params.ratedCapacity).toBe("1250 A");
    expect(acSwitch.params.closedStatus).toBe("闭合");
    expect(getSwitchVisualState(acSwitch)).toBe("closed");
    acSwitch.params.status = "0";
    expect(getSwitchVisualState(acSwitch)).toBe("open");
    acSwitch.params.status = "1";
    expect(getSwitchVisualState(acSwitch)).toBe("closed");
    delete dcBreaker.params.status;
    dcBreaker.params.closedStatus = "打开";
    expect(getSwitchVisualState(dcBreaker)).toBe("open");
    dcBreaker.params.status = "1";
    expect(getSwitchVisualState(dcBreaker)).toBe("closed");
  });

  test("places three-winding transformer terminals on visible winding lead exits", () => {
    const node = createDefaultNode("ac-three-winding-transformer", { x: 500, y: 100 });
    const terminalPoints = node.terminals.map((terminal) => ({
      x: terminal.anchor.x * node.size.width,
      y: terminal.anchor.y * node.size.height
    }));

    expect(terminalPoints[0].x).toBeCloseTo(-node.size.width / 2);
    expect(terminalPoints[0].y).toBeCloseTo((-8 / 76) * node.size.height);
    expect(terminalPoints[1].x).toBeCloseTo(node.size.width / 2);
    expect(terminalPoints[1].y).toBeCloseTo((-8 / 76) * node.size.height);
    expect(terminalPoints[2]).toEqual({ x: 0, y: node.size.height / 2 });
    const terminalStubs = node.terminals.map((terminal) => terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size));
    expect(terminalStubs[0].from.x).toBeCloseTo(20.5);
    expect(terminalStubs[1].from.x).toBeCloseTo(-20.5);
    expect(terminalStubs[2].from.y).toBeCloseTo(-0.5);
  });

  test("normalizes legacy three-winding transformer terminal anchors to winding lead exits", () => {
    const legacy = createDefaultNode("ac-three-winding-transformer", { x: 500, y: 100 });
    legacy.terminals = [
      { ...legacy.terminals[0], anchor: { x: -0.5, y: 0 } },
      { ...legacy.terminals[1], anchor: { x: 0.5, y: 0 } },
      { ...legacy.terminals[2], anchor: { x: 0, y: -0.5 } }
    ];

    const normalized = normalizeNodeTerminalsByTemplate(legacy);

    const normalizedTerminalPoints = normalized.terminals.map((terminal) => ({
      x: terminal.anchor.x * normalized.size.width,
      y: terminal.anchor.y * normalized.size.height
    }));
    expect(normalizedTerminalPoints[0].x).toBeCloseTo(-normalized.size.width / 2);
    expect(normalizedTerminalPoints[0].y).toBeCloseTo((-8 / 76) * normalized.size.height);
    expect(normalizedTerminalPoints[1].x).toBeCloseTo(normalized.size.width / 2);
    expect(normalizedTerminalPoints[1].y).toBeCloseTo((-8 / 76) * normalized.size.height);
    expect(normalizedTerminalPoints[2]).toEqual({ x: 0, y: normalized.size.height / 2 });
  });

  test("adds a four-terminal three-winding transformer with a visible neutral point", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer-neutral");
    const node = createDefaultNode("ac-three-winding-transformer-neutral", { x: 500, y: 100 });
    const terminalPoints = node.terminals.map((terminal) => ({
      x: terminal.anchor.x * node.size.width,
      y: terminal.anchor.y * node.size.height
    }));

    expect(template).toMatchObject({
      label: "三绕组主变(中性点)",
      attributeLibrary: "交流设备",
      terminalCount: 4,
      isContainer: true
    });
    expect(node.terminals.map((terminal) => terminal.label)).toEqual(["高压绕组端", "中压绕组端", "低压绕组端", "中性点"]);
    expect(node.terminals.map((terminal) => terminal.type)).toEqual(["ac", "ac", "ac", "ac"]);
    expect(terminalPoints[0].x).toBeCloseTo(-node.size.width / 2);
    expect(terminalPoints[0].y).toBeCloseTo((-8 / 92) * node.size.height);
    expect(terminalPoints[1].x).toBeCloseTo(node.size.width / 2);
    expect(terminalPoints[1].y).toBeCloseTo((-8 / 92) * node.size.height);
    expect(terminalPoints[2]).toEqual({ x: 0, y: node.size.height / 2 });
    expect(terminalPoints[3]).toEqual({ x: 0, y: -node.size.height / 2 });
    const terminalStubs = node.terminals.map((terminal) => terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size));
    expect(terminalStubs[0].from.x).toBeCloseTo(20.5);
    expect(terminalStubs[1].from.x).toBeCloseTo(-20.5);
    expect(terminalStubs[2].from.y).toBeCloseTo(-6);
    expect(terminalStubs[3].from.y).toBeCloseTo(3);
    expect(describeContainerTerminalAssociations(template!)).toHaveLength(3);
  });

  test("routes orthogonal connection around interfering devices", () => {
    const source = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 420, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 260, y: 100 });

    const points = routeOrthogonalEdge(source, target, [source, target, blocker]);

    expect(points.length).toBeGreaterThan(2);
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
    }
    const blockerBox = {
      left: blocker.position.x - blocker.size.width / 2 - 8,
      right: blocker.position.x + blocker.size.width / 2 + 8,
      top: blocker.position.y - blocker.size.height / 2 - 8,
      bottom: blocker.position.y + blocker.size.height / 2 + 8
    };
    expect(
      points.some(
        (point) =>
          point.x > blockerBox.left &&
          point.x < blockerBox.right &&
          point.y > blockerBox.top &&
          point.y < blockerBox.bottom
      )
    ).toBe(false);
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > blockerBox.left && prev.x < blockerBox.right && yMax > blockerBox.top && yMin < blockerBox.bottom).toBe(false);
      }
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > blockerBox.top && prev.y < blockerBox.bottom && xMax > blockerBox.left && xMin < blockerBox.right).toBe(false);
      }
    }
  });

  test("repairs manual connection paths that would be covered by a device", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 700, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 400, y: 100 });
    const edge: Edge = {
      id: "manual-covered",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 280, y: 100 },
        { x: 520, y: 100 }
      ]
    };
    const blockerBox = {
      left: blocker.position.x - blocker.size.width / 2 - 8,
      right: blocker.position.x + blocker.size.width / 2 + 8,
      top: blocker.position.y - blocker.size.height / 2 - 8,
      bottom: blocker.position.y + blocker.size.height / 2 + 8
    };

    const route = routeEdgesForRendering([source, target, blocker], [edge], { width: 640, height: 260 })[0];

    for (let index = 1; index < route.points.length; index += 1) {
      const prev = route.points[index - 1];
      const point = route.points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > blockerBox.left && prev.x < blockerBox.right && yMax > blockerBox.top && yMin < blockerBox.bottom).toBe(false);
      }
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > blockerBox.top && prev.y < blockerBox.bottom && xMax > blockerBox.left && xMin < blockerBox.right).toBe(false);
      }
    }
  });

  test("keeps terminal stubs perpendicular after local obstacle repair", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createRightTerminalLoad({ x: 420, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 190, y: 100 });
    const edge: Edge = {
      id: "near-terminal-obstacle",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, target, blocker], [edge], { width: 640, height: 260 })[0];
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(route.points[0]).toEqual(sourceTerminal);
    expect(route.points[1].y).toBe(sourceTerminal.y);
    expect(route.points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(route.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(route.points[route.points.length - 2].y).toBe(targetTerminal.y);
    expect(route.points[route.points.length - 2].x).toBeGreaterThan(targetTerminal.x);
  });

  test("keeps automatic obstacle detours local instead of routing to canvas edges", () => {
    const source = withHiddenDeviceLabel(createDefaultNode("ac-bus", { x: 100, y: 100 }));
    const target = withHiddenDeviceLabel(createDefaultNode("ac-load", { x: 420, y: 100 }));
    const blocker = withHiddenDeviceLabel(createDefaultNode("ac-switch", { x: 260, y: 100 }));
    const route = routeEdgesForRendering(
      [source, target, blocker],
      [{ id: "local-detour", sourceId: source.id, targetId: target.id, sourceTerminalId: "t1", targetTerminalId: "t1" }],
      { width: 640, height: 260 }
    )[0];

    const yValues = route.points.map((point) => point.y);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(blocker.position.y + blocker.size.height / 2 + 40);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(blocker.position.y - blocker.size.height / 2 - 40);
  });

  test("routes connection lines around visible device labels and the device-label gap", () => {
    const source = createDefaultNode("ac-line", { x: 160, y: 160 });
    const target = createDefaultNode("ac-line", { x: 840, y: 160 });
    const blockerBase = createDefaultNode("ac-switch", { x: 500, y: 120 });
    const blocker = {
      ...blockerBase,
      params: {
        ...blockerBase.params,
        _labelText: "交流开关",
        _labelX: "0",
        _labelY: "90",
        _labelFontSize: "14",
        _labelTextAnchor: "middle",
        _labelRotation: "0"
      }
    };
    const route = routeEdgesForRendering(
      [source, target, blocker],
      [{ id: "label-detour", sourceId: source.id, targetId: target.id, sourceTerminalId: "t2", targetTerminalId: "t1" }],
      { width: 1000, height: 420 }
    )[0];
    const bodyBox = {
      left: blocker.position.x - blocker.size.width / 2,
      right: blocker.position.x + blocker.size.width / 2,
      top: blocker.position.y - blocker.size.height / 2,
      bottom: blocker.position.y + blocker.size.height / 2
    };
    const labelWidth = 14 * 4;
    const labelHeight = 14 * 1.35;
    const labelCenter = { x: blocker.position.x, y: blocker.position.y + 90 };
    const labelBox = {
      left: labelCenter.x - labelWidth / 2,
      right: labelCenter.x + labelWidth / 2,
      top: labelCenter.y - labelHeight / 2,
      bottom: labelCenter.y + labelHeight / 2
    };
    const bridgeBox = {
      left: Math.min(bodyBox.left, labelBox.left),
      right: Math.max(bodyBox.right, labelBox.right),
      top: bodyBox.bottom,
      bottom: labelBox.top
    };

    expect(routeIntersectsTestBox(route.points, bodyBox)).toBe(false);
    expect(routeIntersectsTestBox(route.points, labelBox)).toBe(false);
    expect(routeIntersectsTestBox(route.points, bridgeBox)).toBe(false);
  });

  test("avoids canvas-edge lanes when a safe local reroute is available", () => {
    const bounds = { width: 1200, height: 900 };
    const source = { ...createDefaultNode("ac-line", { x: 500, y: 120 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 500, y: 760 }), id: "target" };
    const blockers = [
      { ...createDefaultNode("ac-switch", { x: 520, y: 560 }), id: "blocker-a" },
      { ...createDefaultNode("ac-switch", { x: 480, y: 720 }), id: "blocker-b" },
      { ...createDefaultNode("ac-switch", { x: 720, y: 700 }), id: "blocker-c" }
    ];
    const route = routeEdgesForRendering(
      [source, target, ...blockers],
      [{ id: "edge-overextended", sourceId: source.id, targetId: target.id, sourceTerminalId: "t2", targetTerminalId: "t1" }],
      bounds
    )[0];
    const innerPoints = route.points.slice(1, -1);

    expect(innerPoints.some((point) => point.x <= 6 || point.x >= bounds.width - 6 || point.y <= 6 || point.y >= bounds.height - 6)).toBe(false);
  });

  test("accepts a newly drawn connection only when the final route satisfies connection constraints", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    const target = createDefaultNode("ac-load", { x: 420, y: 120 });
    const edge: Edge = {
      id: "new-clear-connection",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const result = validateConnectionEdgeRoute([source, target], [edge], edge.id, { width: 640, height: 260 });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.route?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(result.route?.points[result.route.points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
  });

  test("rejects a newly drawn connection when the final route still crosses a graphic", () => {
    const source = createDefaultNode("ac-source", { x: 80, y: 60 });
    const target = createDefaultNode("ac-load", { x: 330, y: 60 });
    const blocker = {
      ...createDefaultNode("static-rect", { x: 205, y: 60 }),
      size: { width: 90, height: 260 }
    };
    const edge: Edge = {
      id: "new-blocked-connection",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const result = validateConnectionEdgeRoute([source, target, blocker], [edge], edge.id, { width: 400, height: 120 });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.type === "blocked-by-node" && issue.nodeId === blocker.id)).toBe(true);
  });

  test("redesigns a connection to the fewest safe bends before committing it", () => {
    const source = createDefaultNode("ac-line", { x: 100, y: 120 });
    const target = createDefaultNode("ac-line", { x: 460, y: 120 });
    const edge: Edge = {
      id: "over-bent-connection",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 180, y: 120 },
        { x: 180, y: 220 },
        { x: 280, y: 220 },
        { x: 280, y: 80 },
        { x: 380, y: 80 },
        { x: 380, y: 120 }
      ]
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 640, height: 320 });
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 640, height: 320 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(prepared.issues).toEqual([]);
    expect(prepared.edge?.manualPoints ?? []).toHaveLength(2);
    expect(route?.points).toHaveLength(4);
    expect(route?.points[1].y).toBe(route?.points[2].y);
    expect(new Set(route?.points.map((point) => point.y))).toEqual(new Set([120]));
  });

  test("commits aligned opposed terminals as a zero-bend route when unobstructed", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 100, y: 120 }), id: "source" });
    const target = withHiddenDeviceLabel({ ...createDefaultNode("ac-switch", { x: 460, y: 120 }), id: "target" });
    const sourceTerminal = getTerminalPoint(source, "t2");
    const targetTerminal = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "aligned-opposed-zero-bend",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: sourceTerminal.x + 44, y: sourceTerminal.y },
        { x: sourceTerminal.x + 44, y: sourceTerminal.y + 64 },
        { x: targetTerminal.x - 44, y: sourceTerminal.y + 64 },
        { x: targetTerminal.x - 44, y: targetTerminal.y }
      ]
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 720, height: 320 });
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 720, height: 320 })[0]
      : undefined;

    expect(sourceTerminal.y).toBe(targetTerminal.y);
    expect(prepared.ok).toBe(true);
    expect(prepared.issues).toEqual([]);
    expect(route).toBeDefined();
    expect(route?.points[0]).toEqual(sourceTerminal);
    expect(route?.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(routeBendCountForTest(route?.points ?? [])).toBe(0);
    expect(new Set(route?.points.map((point) => point.y))).toEqual(new Set([sourceTerminal.y]));
  });

  test("commits nearby aligned opposed terminals as a direct zero-bend route when endpoint stubs would overlap", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 100, y: 120 }), id: "source" });
    const sourceTerminal = getTerminalPoint(source, "t2");
    const targetProbe = withHiddenDeviceLabel({ ...createDefaultNode("ac-switch", { x: 300, y: 120 }), id: "target" });
    const targetProbeTerminal = getTerminalPoint(targetProbe, "t1");
    const target = {
      ...targetProbe,
      position: {
        x: targetProbe.position.x + sourceTerminal.x + 40 - targetProbeTerminal.x,
        y: targetProbe.position.y
      }
    };
    const targetTerminal = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "nearby-aligned-opposed-zero-bend",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 720, height: 320 });
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 720, height: 320 })[0]
      : undefined;

    expect(sourceTerminal.y).toBe(targetTerminal.y);
    expect(targetTerminal.x - sourceTerminal.x).toBeLessThan(56);
    expect(prepared.ok).toBe(true);
    expect(prepared.issues).toEqual([]);
    expect(prepared.edge?.manualPoints).toBeUndefined();
    expect(route?.points).toEqual([sourceTerminal, targetTerminal]);
    expect(routeBendCountForTest(route?.points ?? [])).toBe(0);
  });

  test("renders stored aligned opposed terminals as a zero-bend route when unobstructed", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 100, y: 120 }), id: "source" });
    const target = withHiddenDeviceLabel({ ...createDefaultNode("ac-switch", { x: 460, y: 120 }), id: "target" });
    const sourceTerminal = getTerminalPoint(source, "t2");
    const targetTerminal = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "stored-aligned-opposed-zero-bend",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: sourceTerminal.x + 44, y: sourceTerminal.y },
        { x: sourceTerminal.x + 44, y: sourceTerminal.y + 64 },
        { x: targetTerminal.x - 44, y: sourceTerminal.y + 64 },
        { x: targetTerminal.x - 44, y: targetTerminal.y }
      ]
    };

    const route = routeEdgesForRendering([source, target], [edge], { width: 720, height: 320 })[0];

    expect(sourceTerminal.y).toBe(targetTerminal.y);
    expect(route).toBeDefined();
    expect(route.points[0]).toEqual(sourceTerminal);
    expect(route.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(routeBendCountForTest(route.points)).toBe(0);
    expect(new Set(route.points.map((point) => point.y))).toEqual(new Set([sourceTerminal.y]));
  });

  test("reroutes committed connection endpoints around nearby graphics instead of surfacing blocker failures", () => {
    const source = { ...createDefaultNode("ac-source", { x: 160, y: 120 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 900, y: 120 }), id: "target" };
    const blocker = {
      ...createDefaultNode("ac-pv-source", { x: 380, y: 220 }),
      id: "pv-blocker",
      name: "交流光伏"
    };
    const edge: Edge = {
      id: "rewired-near-pv",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const prepared = prepareConnectionEdgeForCommit([source, target, blocker], [edge], edge.id, { width: 1100, height: 500 });
    const validation = prepared.edge
      ? validateConnectionEdgeRoute([source, target, blocker], [prepared.edge], prepared.edge.id, { width: 1100, height: 500 })
      : prepared;

    expect(prepared.ok).toBe(true);
    expect(prepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.route?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(validation.route?.points[validation.route.points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
  });

  test("commits a connection endpoint snapped to a tall bus without treating the bus body as blocked space", () => {
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 180 }), id: "source" };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 360, y: 180 }),
      id: "tall-bus",
      size: { width: 260, height: 160 }
    };
    const edge: Edge = {
      id: "tall-bus-snap",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: projectPointToBusCenterline(bus, { x: 300, y: 240 })
    };

    const prepared = prepareConnectionEdgeForCommit([source, bus], [edge], edge.id, { width: 640, height: 360 });
    const validation = prepared.edge
      ? validateConnectionEdgeRoute([source, bus], [prepared.edge], edge.id, { width: 640, height: 360 })
      : prepared;
    const route = prepared.edge
      ? routeEdgesForRendering([source, bus], [prepared.edge], { width: 640, height: 360 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(route?.points[route.points.length - 2].y).toBeGreaterThan(bus.position.y + bus.size.height / 2);
  });

  test("branches a second connection from the same terminal without treating the shared endpoint stub as impossible", () => {
    const source = { ...createDefaultNode("ac-source", { x: 120, y: 140 }), id: "source" };
    const loadA = createRightTerminalLoad({ x: 420, y: 80 }, { id: "load-a" });
    const loadB = createRightTerminalLoad({ x: 420, y: 220 }, { id: "load-b" });
    const firstEdge: Edge = {
      id: "first-branch",
      sourceId: source.id,
      targetId: loadA.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const firstPrepared = prepareConnectionEdgeForCommit([source, loadA, loadB], [firstEdge], firstEdge.id, { width: 700, height: 320 });
    const secondEdge: Edge = {
      id: "second-branch",
      sourceId: source.id,
      targetId: loadB.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const secondPrepared = prepareConnectionEdgeForCommit(
      [source, loadA, loadB],
      [firstPrepared.edge!, secondEdge],
      secondEdge.id,
      { width: 700, height: 320 }
    );
    const routes = secondPrepared.edge
      ? routeEdgesForRendering([source, loadA, loadB], [firstPrepared.edge!, secondPrepared.edge], { width: 700, height: 320 })
      : [];
    const secondRoute = routes.find((route) => route.edgeId === secondEdge.id);
    const validation = secondPrepared.edge
      ? validateConnectionEdgeRoute([source, loadA, loadB], [firstPrepared.edge!, secondPrepared.edge], secondEdge.id, { width: 700, height: 320 })
      : secondPrepared;

    expect(secondPrepared.ok).toBe(true);
    expect(secondPrepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(secondRoute?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(secondRoute?.points[secondRoute.points.length - 1]).toEqual(getTerminalPoint(loadB, "t1"));
  });

  test("allows a committed connection to share an existing connection lane when no graphic is blocked", () => {
    const source = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "target" };
    const existingEdge: Edge = {
      id: "existing-lane",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 280, y: 140 },
        { x: 360, y: 140 }
      ]
    };
    const newEdge: Edge = {
      id: "new-lane",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 280, y: 140 },
        { x: 360, y: 140 }
      ]
    };

    const validation = validateConnectionEdgeRoute([source, target], [existingEdge, newEdge], newEdge.id, { width: 700, height: 320 });

    expect(validation.ok).toBe(true);
    expect(validation.issues.some((issue) => issue.type === "overlaps-connection")).toBe(false);
  });

  test("redesigns a new connection from scratch without adding detours only to avoid existing connections", () => {
    const source = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "target" };
    const existingEdge: Edge = {
      id: "existing-direct",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };
    const newEdge: Edge = {
      id: "new-direct",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const previousRoutes = routeEdgesForRendering([source, target], [existingEdge], { width: 700, height: 320 });
    const prepared = prepareConnectionEdgeForCommit(
      [source, target],
      [existingEdge, newEdge],
      newEdge.id,
      { width: 700, height: 320 },
      previousRoutes
    );
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 700, height: 320 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(prepared.edge).toBeDefined();
    expect(new Set(route?.points.map((point) => point.y))).toEqual(new Set([140]));
  });

  test("renders an aligned opposed connection without doglegs only to avoid another connection lane", () => {
    const existingSource = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 80, y: 140 }), id: "existing-source" });
    const existingTarget = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 620, y: 140 }), id: "existing-target" });
    const newSource = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 180, y: 140 }), id: "new-source" });
    const newTarget = withHiddenDeviceLabel({ ...createDefaultNode("ac-switch", { x: 520, y: 140 }), id: "new-target" });
    const existingEdge: Edge = {
      id: "existing-direct-lane",
      sourceId: existingSource.id,
      targetId: existingTarget.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };
    const newEdge: Edge = {
      id: "new-aligned-lane",
      sourceId: newSource.id,
      targetId: newTarget.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const routes = routeEdgesForRendering(
      [existingSource, existingTarget, newSource, newTarget],
      [existingEdge, newEdge],
      { width: 800, height: 320 }
    );
    const route = routes.find((item) => item.edgeId === newEdge.id);

    expect(getTerminalPoint(newSource, "t2").y).toBe(getTerminalPoint(newTarget, "t1").y);
    expect(route).toBeDefined();
    expect(routeBendCountForTest(route?.points ?? [])).toBe(0);
    expect(new Set(route?.points.map((point) => point.y))).toEqual(new Set([getTerminalPoint(newSource, "t2").y]));
  });

  test("routes same-facing terminals without an immediate 180 degree reversal at endpoint stubs", () => {
    const source = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "target" };
    const edge: Edge = {
      id: "same-facing-terminals",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t2"
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 700, height: 320 });
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 700, height: 320 })[0]
      : undefined;
    const validation = prepared.edge
      ? validateConnectionEdgeRoute([source, target], [prepared.edge], edge.id, { width: 700, height: 320 })
      : prepared;

    expect(prepared.ok).toBe(true);
    expect(validation.ok).toBe(true);
    expect(route).toBeDefined();
    expect(hasImmediateRouteReversal(route?.points ?? [])).toBe(false);
  });

  test("routes left-to-right same-facing terminals by approaching the target from its outward side", () => {
    const source = { ...createDefaultNode("ac-load", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 460, y: 140 }), id: "target" };
    const edge: Edge = {
      id: "left-to-right-same-facing-terminals",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 700, height: 320 });
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 700, height: 320 })[0]
      : undefined;
    const validation = prepared.edge
      ? validateConnectionEdgeRoute([source, target], [prepared.edge], edge.id, { width: 700, height: 320 })
      : prepared;

    expect(prepared.ok).toBe(true);
    expect(prepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(route).toBeDefined();
    expect(route?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(route?.points[route.points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
    expect(hasImmediateRouteReversal(route?.points ?? [])).toBe(false);
  });

  test("repairs stored endpoint paths that would approach a right-side terminal through the device body", () => {
    const source = { ...createDefaultNode("ac-load", { x: 120, y: 160 }), id: "source" };
    const target = { ...createDefaultNode("ac-source", { x: 460, y: 160 }), id: "target" };
    const targetTerminal = getTerminalPoint(target, "t1");
    const targetBodyBox = {
      left: target.position.x - target.size.width / 2,
      right: target.position.x + target.size.width / 2,
      top: target.position.y - target.size.height / 2,
      bottom: target.position.y + target.size.height / 2
    };
    const edge: Edge = {
      id: "stored-back-approach-to-right-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: targetBodyBox.left - 24, y: targetTerminal.y }
      ]
    };

    const route = routeEdgesForStoredRendering([source, target], [edge], { width: 720, height: 320 })[0];

    expect(route.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(route.points[route.points.length - 2].x).toBeGreaterThan(targetTerminal.x);
    expect(routeIntersectsTestBox(route.points, targetBodyBox)).toBe(false);
    expect(hasImmediateRouteReversal(route.points)).toBe(false);
  });

  test("refreshes cached routes that approach a right-side terminal through the device body", () => {
    const source = { ...createDefaultNode("ac-source", { x: 270, y: 360 }), id: "source" };
    const target = { ...createDefaultNode("ac-source", { x: 695, y: 160 }), id: "target" };
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "cached-back-approach-to-right-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const badCachedRoute = {
      edgeId: edge.id,
      points: [
        sourceTerminal,
        { x: sourceTerminal.x + 28, y: sourceTerminal.y },
        { x: sourceTerminal.x + 28, y: targetTerminal.y },
        { x: target.position.x - target.size.width / 2 - 24, y: targetTerminal.y },
        targetTerminal
      ],
      path: ""
    };
    const targetBodyBox = {
      left: target.position.x - target.size.width / 2,
      right: target.position.x + target.size.width / 2,
      top: target.position.y - target.size.height / 2,
      bottom: target.position.y + target.size.height / 2
    };

    const [route] = routeEdgesForIncrementalRendering(
      [source, target],
      [edge],
      new Set(),
      { width: 1100, height: 650 },
      [badCachedRoute]
    );

    expect(route.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(route.points[route.points.length - 2].x).toBeGreaterThan(targetTerminal.x);
    expect(routeIntersectsTestBox(route.points, targetBodyBox)).toBe(false);
  });

  test("keeps bus-move preserved routes attached through the stationary device terminal side", () => {
    const bus = {
      ...createDefaultNode("ac-bus", { x: 360, y: 240 }),
      id: "bus",
      size: { width: 420, height: 24 }
    };
    const source = { ...createDefaultNode("ac-source", { x: 360, y: 120 }), id: "source" };
    const initialEdge: Edge = {
      id: "bus-to-source-after-bus-move",
      sourceId: bus.id,
      targetId: source.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint: projectPointToBusCenterline(bus, getTerminalPoint(source, "t1"))
    };
    const prepared = prepareConnectionEdgeForCommit([bus, source], [initialEdge], initialEdge.id, { width: 720, height: 420 });
    const initialRoute = prepared.edge
      ? routeEdgesForStoredRendering([bus, source], [prepared.edge], { width: 720, height: 420 })[0]
      : undefined;
    const movedBus = { ...bus, position: { x: bus.position.x, y: bus.position.y + 80 } };
    const movedEdge = prepared.edge && initialRoute
      ? {
          ...prepared.edge,
          sourcePoint: prepared.edge.sourcePoint
            ? { x: prepared.edge.sourcePoint.x, y: prepared.edge.sourcePoint.y + 80 }
            : prepared.edge.sourcePoint,
          manualPoints: preserveDraggedRouteShape({
            routePoints: initialRoute.points,
            nextStart: {
              x: initialRoute.points[0].x,
              y: initialRoute.points[0].y + 80
            },
            nextEnd: initialRoute.points[initialRoute.points.length - 1],
            sourceDelta: { x: 0, y: 80 },
            targetDelta: { x: 0, y: 0 },
            sourceNormal: getRouteEndpointNormal(
              movedBus,
              { x: initialRoute.points[0].x, y: initialRoute.points[0].y + 80 },
              initialRoute.points[initialRoute.points.length - 1],
              prepared.edge.sourceTerminalId
            ),
            targetNormal: getRouteEndpointNormal(
              source,
              initialRoute.points[initialRoute.points.length - 1],
              { x: initialRoute.points[0].x, y: initialRoute.points[0].y + 80 },
              prepared.edge.targetTerminalId
            )
          }).slice(1, -1)
        }
      : undefined;
    const targetTerminal = getTerminalPoint(source, "t1");
    const targetBodyBox = {
      left: source.position.x - source.size.width / 2,
      right: source.position.x + source.size.width / 2,
      top: source.position.y - source.size.height / 2,
      bottom: source.position.y + source.size.height / 2
    };

    const route = movedEdge
      ? routeEdgesForStoredRendering([movedBus, source], [movedEdge], { width: 720, height: 420 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(route).toBeDefined();
    expect(route?.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(route?.points[route.points.length - 2].x).toBeGreaterThan(targetTerminal.x);
    expect(routeIntersectsTestBox(route?.points ?? [], targetBodyBox)).toBe(false);
    expect(hasImmediateRouteReversal(route?.points ?? [])).toBe(false);
  });

  test("repairs stored bus-move routes that immediately reverse near the moved bus endpoint", () => {
    const bus = {
      ...createDefaultNode("ac-bus", { x: 360, y: 260 }),
      id: "bus",
      size: { width: 420, height: 24 }
    };
    const source = { ...createDefaultNode("ac-source", { x: 360, y: 120 }), id: "source" };
    const sourceTerminal = getTerminalPoint(source, "t1");
    const busPoint = projectPointToBusCenterline(bus, sourceTerminal);
    const edge: Edge = {
      id: "stored-bus-endpoint-backtrack",
      sourceId: bus.id,
      targetId: source.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint: busPoint,
      manualPoints: [
        { x: busPoint.x, y: busPoint.y - 28 },
        { x: busPoint.x, y: busPoint.y },
        { x: sourceTerminal.x + 28, y: busPoint.y }
      ]
    };

    const route = routeEdgesForStoredRendering([bus, source], [edge], { width: 720, height: 420 })[0];

    expect(route.points[0]).toEqual(busPoint);
    expect(route.points[route.points.length - 1]).toEqual(sourceTerminal);
    expect(route.points[route.points.length - 2].x).toBeGreaterThan(sourceTerminal.x);
    expect(hasImmediateRouteReversal(route.points)).toBe(false);
  });

  test("connects heater and heat exchanger right-side heat terminals without false space exhaustion", () => {
    const source = { ...createDefaultNode("ac-two-port-heater", { x: 545, y: 333 }), id: "heater" };
    const target = { ...createDefaultNode("four-port-heat-exchanger", { x: 1013, y: 366 }), id: "heat-exchanger" };
    const edge: Edge = {
      id: "heater-to-exchanger-right-side-terminals",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t3",
      targetTerminalId: "t3"
    };

    const prepared = prepareConnectionEdgeForCommit([source, target], [edge], edge.id, { width: 1400, height: 800 });
    const validation = prepared.edge
      ? validateConnectionEdgeRoute([source, target], [prepared.edge], edge.id, { width: 1400, height: 800 })
      : prepared;
    const route = prepared.edge
      ? routeEdgesForRendering([source, target], [prepared.edge], { width: 1400, height: 800 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(prepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(route?.points[0]).toEqual(getTerminalPoint(source, "t3"));
    expect(route?.points[route.points.length - 1]).toEqual(getTerminalPoint(target, "t3"));
    expect(hasImmediateRouteReversal(route?.points ?? [])).toBe(false);
  });

  test("routes a box breaker right terminal to a vertical ACAC converter bottom terminal with one visible bend", () => {
    const source = { ...createDefaultNode("ac-box-breaker", { x: 420, y: 520 }), id: "box-breaker" };
    const target = { ...createDefaultNode("acac-converter-vertical", { x: 720, y: 360 }), id: "vertical-acac" };
    const edge: Edge = {
      id: "box-breaker-to-vertical-acac-bottom",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t2"
    };
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(target, "t2");

    const route = routeOrthogonalEdge(source, target, [source, target], edge, [], { width: 1200, height: 900 });

    expect(route).toEqual([
      sourcePoint,
      { x: targetPoint.x, y: sourcePoint.y },
      targetPoint
    ]);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stale box breaker dogleg routes when nearby graphics do not block the one-bend route", () => {
    const source = { ...createDefaultNode("ac-box-breaker", { x: 420, y: 520 }), id: "box-breaker" };
    const target = { ...createDefaultNode("acac-converter-vertical", { x: 720, y: 360 }), id: "vertical-acac" };
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(target, "t2");
    const nearbyGraphic = withHiddenDeviceLabel({
      ...createDefaultNode("ac-load", {
        x: Math.round((sourcePoint.x + targetPoint.x) / 2),
        y: targetPoint.y - 7
      }),
      id: "nearby-graphic"
    });
    const staleLaneX = Math.round((sourcePoint.x + targetPoint.x) / 2);
    const staleLaneY = targetPoint.y - 70;
    const edge: Edge = {
      id: "box-breaker-to-vertical-acac-bottom-stale-dogleg",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t2",
      manualPoints: [
        { x: sourcePoint.x + 28, y: staleLaneY },
        { x: staleLaneX, y: staleLaneY },
        { x: staleLaneX, y: targetPoint.y + 28 }
      ]
    };

    const route = routeEdgesForStoredRendering([source, target, nearbyGraphic], [edge], { width: 1200, height: 900 })[0].points;

    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(targetPoint);
    expect(routeBendCountForTest(route)).toBe(1);
    expect(route.some((point) => point.y === staleLaneY)).toBe(false);
    expect(route.some((point) => point.x === staleLaneX && point.y === targetPoint.y + 28)).toBe(false);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("routes a line right terminal to a vertical ACAC converter top terminal with one visible bend", () => {
    const source = { ...createDefaultNode("ac-line", { x: 520, y: 260 }), id: "ac-line" };
    const target = { ...createDefaultNode("acac-converter-vertical", { x: 720, y: 360 }), id: "vertical-acac" };
    const edge: Edge = {
      id: "line-to-vertical-acac-top",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(target, "t1");

    const route = routeOrthogonalEdge(source, target, [source, target], edge, [], { width: 1200, height: 900 });
    const maxRouteX = Math.max(...route.map((point) => point.x));

    expect(route).toEqual([
      sourcePoint,
      { x: targetPoint.x, y: sourcePoint.y },
      targetPoint
    ]);
    expect(maxRouteX).toBeLessThanOrEqual(targetPoint.x);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stale dogleg manual routes when a line right terminal connects to a vertical ACAC converter top terminal", () => {
    const source = { ...createDefaultNode("ac-line", { x: 520, y: 260 }), id: "ac-line" };
    const target = { ...createDefaultNode("acac-converter-vertical", { x: 720, y: 520 }), id: "vertical-acac" };
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "line-to-vertical-acac-top-stale-dogleg",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: Math.round((sourcePoint.x + targetPoint.x) / 2), y: sourcePoint.y + 80 },
        { x: targetPoint.x, y: sourcePoint.y + 80 },
        { x: targetPoint.x, y: targetPoint.y - 28 }
      ]
    };

    const route = routeEdgesForStoredRendering([source, target], [edge], { width: 1200, height: 900 })[0].points;
    const maxRouteX = Math.max(...route.map((point) => point.x));

    expect(route).toHaveLength(5);
    expect(route[0]).toEqual(sourcePoint);
    expect(route[1].y).toBe(sourcePoint.y);
    expect(route[2]).toEqual({ x: targetPoint.x, y: sourcePoint.y });
    expect(route[3].x).toBe(targetPoint.x);
    expect(route[route.length - 1]).toEqual(targetPoint);
    expect(maxRouteX).toBeLessThanOrEqual(targetPoint.x);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stale rectangular manual loops when opposed terminals are already aligned", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("acac-converter-vertical", { x: 420, y: 180 }), id: "upper-acac" });
    const target = withHiddenDeviceLabel({ ...createDefaultNode("acac-converter-vertical", { x: 420, y: 520 }), id: "lower-acac" });
    const sourcePoint = getTerminalPoint(source, "t2");
    const targetPoint = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "stale-rectangular-loop",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: sourcePoint.x - 140, y: sourcePoint.y + 28 },
        { x: sourcePoint.x - 140, y: targetPoint.y - 28 },
        { x: sourcePoint.x + 220, y: targetPoint.y - 28 }
      ]
    };

    const route = routeOrthogonalEdge(source, target, [source, target], edge, [], { width: 900, height: 760 });

    expect(route.every((point) => point.x === sourcePoint.x)).toBe(true);
    expect(route).toHaveLength(4);
    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(targetPoint);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stale downward manual loops when a right-side terminal connects to an upper bus", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 560, y: 440 }), id: "ac-source" });
    const bus = withHiddenDeviceLabel({
      ...createDefaultNode("ac-bus", { x: 650, y: 100 }),
      id: "upper-bus",
      size: { width: 1000, height: 34 }
    });
    const sourcePoint = getTerminalPoint(source, "t1");
    const busPoint = projectPointToBusCenterline(bus, { x: 270, y: 100 });
    const edge: Edge = {
      id: "source-to-upper-bus-stale-loop",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: busPoint,
      manualPoints: [
        { x: sourcePoint.x + 28, y: 700 },
        { x: busPoint.x, y: 700 }
      ]
    };

    const route = routeOrthogonalEdge(source, bus, [source, bus], edge, [], { width: 1200, height: 760 });
    const maxY = Math.max(...route.map((point) => point.y));
    const minX = Math.min(...route.map((point) => point.x));

    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(busPoint);
    expect(maxY).toBeLessThanOrEqual(sourcePoint.y + 32);
    expect(minX).toBeGreaterThanOrEqual(busPoint.x);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stored upward manual loops when a right-side terminal connects to a lower line terminal", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 1180, y: 540 }), id: "ac-source" });
    const line = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 1760, y: 660 }), id: "ac-line" });
    const sourcePoint = getTerminalPoint(source, "t1");
    const targetPoint = getTerminalPoint(line, "t1");
    const edge: Edge = {
      id: "source-to-line-stored-stale-loop",
      sourceId: source.id,
      targetId: line.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: sourcePoint.x + 28, y: sourcePoint.y - 400 },
        { x: targetPoint.x - 28, y: sourcePoint.y - 400 },
        { x: targetPoint.x - 28, y: targetPoint.y }
      ]
    };

    const route = routeEdgesForStoredRendering([source, line], [edge], { width: 2200, height: 900 })[0].points;
    const minY = Math.min(...route.map((point) => point.y));
    const maxX = Math.max(...route.map((point) => point.x));

    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(targetPoint);
    expect(minY).toBeGreaterThanOrEqual(Math.min(sourcePoint.y, targetPoint.y) - 32);
    expect(maxX).toBeLessThanOrEqual(targetPoint.x + 32);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stored stair-step routes between opposed horizontal terminals", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 600, y: 420 }), id: "stair-source" });
    const line = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 980, y: 300 }), id: "stair-line" });
    const sourcePoint = getTerminalPoint(source, "t1");
    const targetPoint = getTerminalPoint(line, "t1");
    const staleLaneY = Math.round((sourcePoint.y + targetPoint.y) / 2);
    const edge: Edge = {
      id: "source-to-line-stored-stair-step",
      sourceId: source.id,
      targetId: line.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: sourcePoint.x + 28, y: staleLaneY },
        { x: targetPoint.x - 28, y: staleLaneY },
        { x: targetPoint.x - 28, y: targetPoint.y }
      ]
    };

    const route = routeEdgesForStoredRendering([source, line], [edge], { width: 1400, height: 760 })[0].points;

    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(targetPoint);
    expect(route.some((point) => point.y === staleLaneY)).toBe(false);
    expect(routeBendCountForTest(route)).toBeLessThanOrEqual(2);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("collapses stored far-side loops between same-facing right-side terminals when a shorter side lane is clear", () => {
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 360, y: 620 }), id: "same-facing-source" });
    const target = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 1180, y: 360 }), id: "same-facing-target" });
    const nearbyGraphic = withHiddenDeviceLabel({
      ...createDefaultNode("ac-source", { x: 760, y: 460 }),
      id: "nearby-but-not-blocking"
    });
    const sourcePoint = getTerminalPoint(source, "t1");
    const targetPoint = getTerminalPoint(target, "t1");
    const targetOutX = targetPoint.x + 28;
    const farLeftX = sourcePoint.x - 360;
    const farTopY = targetPoint.y - 160;
    const edge: Edge = {
      id: "source-to-source-stored-far-side-loop",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: sourcePoint.x + 28, y: sourcePoint.y - 90 },
        { x: farLeftX, y: sourcePoint.y - 90 },
        { x: farLeftX, y: farTopY },
        { x: targetOutX, y: farTopY },
        { x: targetOutX, y: targetPoint.y }
      ]
    };

    const route = routeEdgesForStoredRendering([source, target, nearbyGraphic], [edge], { width: 1600, height: 900 })[0].points;

    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(targetPoint);
    expect(Math.min(...route.map((point) => point.x))).toBeGreaterThanOrEqual(sourcePoint.x - 1);
    expect(Math.max(...route.map((point) => point.y))).toBeLessThanOrEqual(sourcePoint.y + 1);
    expect(route.some((point) => point.x === farLeftX || point.y === farTopY)).toBe(false);
    expect(routeBendCountForTest(route)).toBeLessThanOrEqual(2);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("routes same-facing source terminals around endpoint device labels", () => {
    const source = { ...createDefaultNode("ac-source", { x: 240, y: 220 }), id: "source", name: "交流电源-288" };
    const target = { ...createDefaultNode("ac-source", { x: 620, y: 220 }), id: "target", name: "交流电源-276" };
    const edge: Edge = {
      id: "source-to-target-around-label",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const targetVisualBounds = calculateNodeVisualBounds(target, 0);

    const route = routeOrthogonalEdge(source, target, [source, target], edge, [], { width: 1000, height: 520 });

    expect(routeIntersectsTestBox(route, targetVisualBounds)).toBe(false);
    expect(hasImmediateRouteReversal(route)).toBe(false);
  });

  test("expands route search when initial local lanes are blocked outside the narrow endpoint corridor", () => {
    const source = { ...createDefaultNode("ac-load", { x: 120, y: 300 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 720, y: 300 }), id: "target" };
    const blockers = [
      { id: "blocker-a", position: { x: 230.74561725370586, y: 177.01327556278557 }, size: { width: 84.7533918172121, height: 46.15832384908572 } },
      { id: "blocker-b", position: { x: 564.3622669298202, y: 367.36799396108836 }, size: { width: 43.22975908406079, height: 147.82731029437855 } },
      { id: "blocker-c", position: { x: 479.41824986599386, y: 235.935955545865 }, size: { width: 193.3681787736714, height: 124.03364772209898 } },
      { id: "blocker-d", position: { x: 350.07750363089144, y: 514.5349732367322 }, size: { width: 130.51322533749044, height: 96.35568381519988 } },
      { id: "blocker-e", position: { x: 454.0355362277478, y: 409.6202348312363 }, size: { width: 62.164204977452755, height: 40.66616170341149 } },
      { id: "blocker-f", position: { x: 309.0147874224931, y: 100.86706667672843 }, size: { width: 162.97332459129393, height: 146.39430492417887 } },
      { id: "blocker-g", position: { x: 554.2795213218778, y: 145.98416609223932 }, size: { width: 111.19893884286284, height: 32.18438675859943 } }
    ].map((blocker) => ({
      ...createDefaultNode("static-rect", blocker.position),
      id: blocker.id,
      size: blocker.size
    }));
    const edge: Edge = {
      id: "expanded-search-route",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const nodes = [source, target, ...blockers];

    const prepared = prepareConnectionEdgeForCommit(nodes, [edge], edge.id, { width: 900, height: 680 });
    const validation = prepared.edge
      ? validateConnectionEdgeRoute(nodes, [prepared.edge], edge.id, { width: 900, height: 680 })
      : prepared;
    const route = prepared.edge
      ? routeEdgesForRendering(nodes, [prepared.edge], { width: 900, height: 680 })[0]
      : undefined;

    expect(prepared.ok).toBe(true);
    expect(prepared.edge).toBeDefined();
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(route?.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(route?.points[route.points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
    expect(hasImmediateRouteReversal(route?.points ?? [])).toBe(false);
  });

  test("repairs connection routes that immediately reverse 180 degrees after leaving a terminal", () => {
    const source = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "target" };
    const edge: Edge = {
      id: "endpoint-backtrack",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 190, y: 140 },
        { x: 190, y: 180 },
        { x: 438, y: 180 }
      ]
    };

    const validation = validateConnectionEdgeRoute([source, target], [edge], edge.id, { width: 700, height: 320 });

    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(hasImmediateRouteReversal(validation.route?.points ?? [])).toBe(false);
  });

  test("repairs stored target endpoint paths before they turn back into the terminal", () => {
    const source = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "target" };
    const targetTerminal = getTerminalPoint(target, "t1");
    const edge: Edge = {
      id: "stored-target-backtrack",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 260, y: 140 },
        { ...targetTerminal }
      ]
    };

    const route = routeEdgesForStoredRendering([source, target], [edge], { width: 700, height: 320 })[0];
    const beforeTarget = route.points[route.points.length - 2];

    expect(route.points[route.points.length - 1]).toEqual(targetTerminal);
    expect(beforeTarget.y).toBe(targetTerminal.y);
    expect(beforeTarget.x).toBeLessThan(targetTerminal.x);
    expect(hasImmediateRouteReversal(route.points)).toBe(false);
  });

  test("clamps a moved device inside the display area", () => {
    const node = createDefaultNode("ac-source", { x: -100, y: 900 });
    const position = clampNodePositionToBounds(node, { width: 1980, height: 1024 });

    expect(position.x).toBeGreaterThanOrEqual((node.size.width * Math.abs(node.scaleX ?? node.scale)) / 2);
    expect(position.y).toBeLessThanOrEqual(1024 - (node.size.height * Math.abs(node.scaleY ?? node.scale)) / 2);
  });

  test("keeps keyboard move step independent from the old 5px canvas grid", () => {
    const bounds = { width: 1000, height: 800 };

    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 1000, height: 800 }, bounds, 1)).toBe(1);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 500, height: 400 }, bounds, 1)).toBe(0.5);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 2000, height: 1600 }, bounds, 1)).toBe(2);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 1000, height: 800 }, bounds, 25)).toBe(25);
  });

  test("allows canvas edges to be panned to the center of the SVG view box", () => {
    const bounds = { width: 1980, height: 1024 };

    expect(normalizeViewBoxToCanvas({ x: -900, y: -700, width: 1200, height: 800 }, bounds)).toMatchObject({
      x: -600,
      y: -400
    });
    expect(normalizeViewBoxToCanvas({ x: 1600, y: 900, width: 1200, height: 800 }, bounds)).toMatchObject({
      x: 1380,
      y: 624
    });
    expect(normalizeViewBoxToCanvas({ x: -2000, y: 1000, width: 3000, height: 1800 }, bounds)).toMatchObject({
      x: -1500,
      y: 124
    });
  });

  test("calculates canvas resize from the drag-start screen scale instead of the changing SVG size", () => {
    const drag = {
      edge: "right" as const,
      startClientX: 1000,
      startClientY: 500,
      startWidth: 1000,
      startHeight: 800,
      unitsPerCssX: 1,
      unitsPerCssY: 1
    };

    expect(canvasResizeBoundsFromPointerDrag(drag, { clientX: 1100, clientY: 500 }, { width: 640, height: 360 })).toEqual({
      width: 1100,
      height: 800
    });
    expect(canvasResizeBoundsFromPointerDrag({ ...drag, unitsPerCssX: 2 }, { clientX: 1100, clientY: 500 }, { width: 640, height: 360 })).toEqual({
      width: 1200,
      height: 800
    });
    expect(canvasResizeBoundsFromPointerDrag({ ...drag, edge: "corner" }, { clientX: 1060, clientY: 540 }, { width: 640, height: 360 })).toEqual({
      width: 1060,
      height: 840
    });
    expect(canvasResizeBoundsFromPointerDrag(drag, { clientX: 100, clientY: 500 }, { width: 960, height: 360 })).toEqual({
      width: 960,
      height: 800
    });
  });

  test("calculates canvas resize origin shift for left and top edges", () => {
    const drag = {
      edge: "left" as const,
      startClientX: 1000,
      startClientY: 500,
      startWidth: 1000,
      startHeight: 800,
      unitsPerCssX: 1,
      unitsPerCssY: 1
    };

    expect(canvasResizeBoundsFromPointerDrag(drag, { clientX: 900, clientY: 500 }, { width: 640, height: 360 })).toEqual({
      width: 1100,
      height: 800
    });
    expect(canvasResizeOriginShiftFromPointerDrag(drag, { clientX: 900, clientY: 500 }, { width: 640, height: 360 })).toEqual({
      x: 100,
      y: 0
    });
    expect(canvasResizeBoundsFromPointerDrag({ ...drag, edge: "top" }, { clientX: 1000, clientY: 450 }, { width: 640, height: 360 })).toEqual({
      width: 1000,
      height: 850
    });
    expect(canvasResizeOriginShiftFromPointerDrag({ ...drag, edge: "top" }, { clientX: 1000, clientY: 450 }, { width: 640, height: 360 })).toEqual({
      x: 0,
      y: 50
    });
    expect(canvasResizeBoundsFromPointerDrag({ ...drag, edge: "top-left" }, { clientX: 900, clientY: 450 }, { width: 640, height: 360 })).toEqual({
      width: 1100,
      height: 850
    });
    expect(canvasResizeOriginShiftFromPointerDrag({ ...drag, edge: "top-left" }, { clientX: 900, clientY: 450 }, { width: 640, height: 360 })).toEqual({
      x: 100,
      y: 50
    });
    expect(canvasResizeBoundsFromPointerDrag({ ...drag, edge: "top-right" }, { clientX: 1050, clientY: 450 }, { width: 640, height: 360 })).toEqual({
      width: 1050,
      height: 850
    });
    expect(canvasResizeOriginShiftFromPointerDrag({ ...drag, edge: "top-right" }, { clientX: 1050, clientY: 450 }, { width: 640, height: 360 })).toEqual({
      x: 0,
      y: 50
    });
    expect(canvasResizeBoundsFromPointerDrag({ ...drag, edge: "bottom-left" }, { clientX: 900, clientY: 540 }, { width: 640, height: 360 })).toEqual({
      width: 1100,
      height: 840
    });
    expect(canvasResizeOriginShiftFromPointerDrag({ ...drag, edge: "bottom-left" }, { clientX: 900, clientY: 540 }, { width: 640, height: 360 })).toEqual({
      x: 100,
      y: 0
    });
  });

  test("does not let right-edge content lock left-edge canvas shrink", () => {
    const startBounds = { width: 2000, height: 1000 };
    const rightAndBottomEdgeContent = { left: 1900, right: 2000, top: 900, bottom: 1000 };
    const absoluteMinBounds = { width: 640, height: 360 };

    const leftMinBounds = canvasResizeMinimumBoundsForGeometry("left", startBounds, rightAndBottomEdgeContent, absoluteMinBounds);
    expect(leftMinBounds.width).toBe(640);
    expect(canvasResizeBoundsFromPointerDrag(
      {
        edge: "left",
        startClientX: 1000,
        startClientY: 500,
        startWidth: startBounds.width,
        startHeight: startBounds.height,
        unitsPerCssX: 1,
        unitsPerCssY: 1
      },
      { clientX: 1100, clientY: 500 },
      leftMinBounds
    )).toEqual({ width: 1900, height: 1000 });

    const rightMinBounds = canvasResizeMinimumBoundsForGeometry("right", startBounds, rightAndBottomEdgeContent, absoluteMinBounds);
    expect(rightMinBounds.width).toBe(2000);

    const topMinBounds = canvasResizeMinimumBoundsForGeometry("top", startBounds, rightAndBottomEdgeContent, absoluteMinBounds);
    expect(topMinBounds.height).toBe(360);
    expect(canvasResizeBoundsFromPointerDrag(
      {
        edge: "top",
        startClientX: 1000,
        startClientY: 500,
        startWidth: startBounds.width,
        startHeight: startBounds.height,
        unitsPerCssX: 1,
        unitsPerCssY: 1
      },
      { clientX: 1000, clientY: 600 },
      topMinBounds
    )).toEqual({ width: 2000, height: 900 });

    const bottomMinBounds = canvasResizeMinimumBoundsForGeometry("bottom", startBounds, rightAndBottomEdgeContent, absoluteMinBounds);
    expect(bottomMinBounds.height).toBe(1000);
  });

  test("scales keyboard move steps with the current view box zoom", () => {
    const bounds = { width: 1980, height: 1024 };

    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 1980, height: 1024 }, bounds)).toBe(6);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 990, height: 512 }, bounds)).toBe(3);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 3960, height: 2048 }, bounds)).toBe(12);
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 120, height: 80 }, bounds)).toBeCloseTo(
      6 * Math.sqrt((120 / bounds.width) * (80 / bounds.height)),
      10
    );
    expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 990, height: 512 }, bounds, 25)).toBe(12.5);
  });

  test("reports the current view box zoom as a percentage", () => {
    const bounds = { width: 1980, height: 1024 };

    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 1980, height: 1024 }, bounds)).toBe(100);
    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 990, height: 512 }, bounds)).toBe(200);
    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 3960, height: 2048 }, bounds)).toBe(50);
  });

  test("clamps wheel zoom dimensions between 5 percent and 2000 percent", () => {
    const bounds = { width: 1980, height: 1024 };

    const maximumZoom = clampViewBoxDimensionsForZoom({ width: 10, height: 10 }, bounds);
    expect(maximumZoom.width).toBeCloseTo(99);
    expect(maximumZoom.height).toBeCloseTo(51.2);
    expect(viewBoxZoomPercent({ x: 0, y: 0, ...maximumZoom }, bounds)).toBe(2000);

    const minimumZoom = clampViewBoxDimensionsForZoom({ width: 100000, height: 100000 }, bounds);
    expect(minimumZoom.width).toBeCloseTo(39600);
    expect(minimumZoom.height).toBeCloseTo(20480);
    expect(viewBoxZoomPercent({ x: 0, y: 0, ...minimumZoom }, bounds)).toBe(5);
  });

  test("measures the displayed model content size from nodes and connection paths", () => {
    const node: ModelNode = {
      id: "node-1",
      kind: "static-rect",
      name: "图元1",
      nodeNumber: "",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 100, y: 80 },
      size: { width: 60, height: 40 },
      rotation: 0,
      scale: 1,
      terminals: [],
      params: {}
    };
    const edge: Edge = {
      id: "edge-1",
      sourceId: "missing-source",
      targetId: "missing-target",
      sourcePoint: { x: 250, y: 180 },
      targetPoint: { x: 270, y: 190 },
      manualPoints: [{ x: 320, y: 210 }]
    };

    expect(
      calculateModelContentSize(
        [node],
        [edge],
        [{ edgeId: "edge-1", points: [{ x: 10, y: 10 }, { x: 430, y: 220 }], path: "" }]
      )
    ).toEqual({ width: 430, height: 220 });
  });

  test("checks display boundary clearance with both graphics and connection paths", () => {
    const node = createDefaultNode("ac-source", { x: 120, y: 90 });
    const routeNearBoundary = [{ edgeId: "edge-near", points: [{ x: 4, y: 80 }, { x: 160, y: 80 }], path: "" }];
    const routeClear = [{ edgeId: "edge-clear", points: [{ x: 24, y: 80 }, { x: 160, y: 80 }], path: "" }];
    const bounds = calculateModelGeometryBounds([node], routeNearBoundary);

    expect(bounds?.left).toBe(4);
    expect(geometryBoundsInsideCanvas(bounds, { width: 360, height: 240 }, 8)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node], routeNearBoundary, { width: 360, height: 240 }, 8)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node], routeClear, { width: 360, height: 240 }, 8)).toBe(true);
  });

  test("includes visible device labels in display geometry and content size", () => {
    const base = createDefaultNode("ac-switch", { x: 120, y: 90 });
    const labeled = {
      ...base,
      params: {
        ...base.params,
        _labelText: "交流开关220/35",
        _labelX: "150",
        _labelY: "0",
        _labelFontSize: "18",
        _labelTextAnchor: "middle",
        _labelRotation: "0"
      }
    };
    const bodyRight = labeled.position.x + (labeled.size.width * Math.abs(getNodeScaleX(labeled))) / 2;
    const bounds = calculateModelGeometryBounds([labeled], [], 0);
    const contentSize = calculateModelContentSize([labeled], [], [], 0);

    expect(bounds?.right).toBeGreaterThan(bodyRight + 80);
    expect(contentSize.width).toBe(Math.ceil(bounds?.right ?? 0));
  });

  test("keeps a visual safety margin around device labels for text strokes and focus styles", () => {
    const base = createDefaultNode("ac-switch", { x: 120, y: 90 });
    const labeled = {
      ...base,
      params: {
        ...base.params,
        _labelText: "AB",
        _labelX: "220",
        _labelY: "0",
        _labelFontSize: "20",
        _labelTextAnchor: "start",
        _labelRotation: "0"
      }
    };
    const labelCenterX = labeled.position.x + 220;
    const estimatedTextRight = labelCenterX + 20 * 0.62 * 2;
    const bounds = calculateModelGeometryBounds([labeled], [], 0);

    expect(bounds?.right).toBeGreaterThan(estimatedTextRight + 4);
  });

  test("clamps device movement by visible label bounds as part of the device boundary", () => {
    const base = createDefaultNode("ac-switch", { x: 120, y: 90 });
    const labeled = {
      ...base,
      params: {
        ...base.params,
        _labelText: "开关标识",
        _labelX: "96",
        _labelY: "0",
        _labelFontSize: "16",
        _labelTextAnchor: "middle",
        _labelRotation: "0"
      }
    };
    const nextPosition = clampNodePositionToBounds(labeled, { width: 260, height: 220 }, { x: 240, y: 90 });
    const bodyOnlyMaxX = 260 - (labeled.size.width * Math.abs(getNodeScaleX(labeled))) / 2;
    const moved = { ...labeled, position: nextPosition };
    const bounds = calculateModelGeometryBounds([moved], [], 0);

    expect(nextPosition.x).toBeLessThan(bodyOnlyMaxX - 20);
    expect(bounds?.right).toBeLessThanOrEqual(260);
  });

  test("normalizes scale values without enforcing user-facing min or max ratios", () => {
    expect(normalizeScaleValue(0)).toBe(0);
    expect(normalizeScaleValue(0.05)).toBe(0.05);
    expect(normalizeScaleValue(8)).toBe(8);
    expect(normalizeScaleValue(-2)).toBe(-2);
    expect(normalizeScaleValue(Number.NaN, 1.5)).toBe(1.5);
  });

  test("keeps routed connection points inside the display area", () => {
    const source = createDefaultNode("ac-source", { x: 42, y: 120 });
    const target = createDefaultNode("ac-load", { x: 330, y: 120 });
    const edge: Edge = {
      id: "bounded-route",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, target], [edge], { width: 360, height: 240 })[0];

    for (const point of route.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(360);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(240);
    }
    for (let index = 1; index < route.points.length; index += 1) {
      expect(route.points[index - 1].x === route.points[index].x || route.points[index - 1].y === route.points[index].y).toBe(true);
    }
  });

  test("keeps every routed segment orthogonal without diagonal fallbacks", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const load = createDefaultNode("ac-load", { x: 620, y: 160 });
    const routes = routeEdgesForRendering(
      [left, right, top, bottom, load],
      [
        { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" },
        { id: "mixed", sourceId: right.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    for (const route of routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        const previous = route.points[index - 1];
        const point = route.points[index];
        expect(previous.x === point.x || previous.y === point.y).toBe(true);
      }
    }
  });

  test("keeps endpoint stub points so a straight connection exposes a draggable middle segment", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const branch = createDefaultNode("ac-line", { x: 360, y: 100 });
    const edge: Edge = {
      id: "straight",
      sourceId: source.id,
      targetId: branch.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, branch], [edge], { width: 640, height: 260 })[0];

    expect(route.points.length).toBeGreaterThanOrEqual(4);
    expect(route.points[1].y).toBe(route.points[2].y);
    expect(route.points[1].x).not.toBe(route.points[2].x);
  });

  test("removes redundant collinear middle points while preserving endpoint stubs", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const branch = createDefaultNode("ac-line", { x: 420, y: 100 });
    const edge: Edge = {
      id: "redundant-collinear",
      sourceId: source.id,
      targetId: branch.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 180, y: 100 },
        { x: 260, y: 100 },
        { x: 340, y: 100 }
      ]
    };

    const route = routeEdgesForRendering([source, branch], [edge], { width: 640, height: 260 })[0];

    expect(route.points).toHaveLength(4);
    expect(route.points[0]).toEqual(getTerminalPoint(source, "t1"));
    expect(route.points[1].y).toBe(route.points[2].y);
    expect(route.points[3]).toEqual(getTerminalPoint(branch, "t1"));
  });

  test("tidies tiny dogleg bends while preserving endpoint stubs", () => {
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 86 },
      { x: 180, y: 86 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints);

    expect(tidied).toEqual([
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ]);
  });

  test("removes redundant large dogleg bends when the direct segment is clear", () => {
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 150 },
      { x: 180, y: 150 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints);

    expect(tidied).toEqual([
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ]);
  });

  test("keeps large dogleg bends when the direct segment would hit a blocker", () => {
    const blocker = {
      ...createDefaultNode("static-rect", { x: 120, y: 80 }),
      size: { width: 90, height: 18 }
    };
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 150 },
      { x: 180, y: 150 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints, { blockers: [blocker] });

    expect(tidied).toEqual(routePoints);
  });

  test("does not tidy tiny doglegs when the simplified path would hit a blocker", () => {
    const blocker = {
      ...createDefaultNode("static-rect", { x: 120, y: 80 }),
      size: { width: 80, height: 12 }
    };
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 96 },
      { x: 180, y: 96 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    const tidied = tidyOrthogonalRoute(routePoints, { blockers: [blocker] });

    expect(tidied).toEqual(routePoints);
  });

  test("ignores tiny internal route segments as drag targets when longer segments are available", () => {
    const routePoints: Point[] = [
      { x: 20, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 86 },
      { x: 180, y: 86 },
      { x: 180, y: 80 },
      { x: 240, y: 80 }
    ];

    expect(getMovableRouteSegmentIndexes(routePoints)).toEqual([2]);
  });

  test("moves a manual horizontal or vertical segment directly to the pointer coordinate", () => {
    const routePoints: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 20 },
      { x: 280, y: 20 }
    ];

    const movedVertical = moveOrthogonalRouteSegment(routePoints, 1, "vertical", { x: 140, y: 74 }, { width: 320, height: 180 });
    expect(movedVertical[1]).toEqual({ x: 140, y: 20 });
    expect(movedVertical[2]).toEqual({ x: 140, y: 120 });

    const movedHorizontal = moveOrthogonalRouteSegment(routePoints, 2, "horizontal", { x: 150, y: 88 }, { width: 320, height: 180 });
    expect(movedHorizontal[2]).toEqual({ x: 80, y: 88 });
    expect(movedHorizontal[3]).toEqual({ x: 220, y: 88 });
  });

  test("inserts an orthogonal manual bend into a horizontal or vertical segment", () => {
    const routePoints: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 20 },
      { x: 280, y: 20 }
    ];

    const horizontalBend = insertOrthogonalRouteBend(routePoints, 2, { x: 150, y: 160 }, { width: 320, height: 220 });
    expect(horizontalBend.slice(2, 6)).toEqual([
      { x: 80, y: 120 },
      { x: 150, y: 120 },
      { x: 150, y: 152 },
      { x: 182, y: 152 }
    ]);

    const verticalBend = insertOrthogonalRouteBend(routePoints, 1, { x: 120, y: 72 }, { width: 320, height: 220 });
    expect(verticalBend.slice(1, 5)).toEqual([
      { x: 80, y: 20 },
      { x: 80, y: 72 },
      { x: 112, y: 72 },
      { x: 112, y: 104 }
    ]);

    for (const route of [horizontalBend, verticalBend]) {
      for (let index = 1; index < route.length; index += 1) {
        expect(route[index - 1].x === route[index].x || route[index - 1].y === route[index].y).toBe(true);
      }
    }
  });

  test("recognizes repeated connection-line pointer clicks across rerendered path elements", () => {
    const firstClick = { edgeId: "edge-1", clientX: 120, clientY: 80, at: 1000 };

    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-1", clientX: 124, clientY: 82, at: 1300 })).toBe(true);
    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-2", clientX: 124, clientY: 82, at: 1300 })).toBe(false);
    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-1", clientX: 150, clientY: 82, at: 1300 })).toBe(false);
    expect(isRepeatedEdgePointerClick(firstClick, { edgeId: "edge-1", clientX: 124, clientY: 82, at: 1600 })).toBe(false);
  });

  test("inserts a visible bend on short segments away from adjacent turns", () => {
    const shortHorizontalNearTurn: Point[] = [
      { x: 498, y: 455 },
      { x: 526, y: 455 },
      { x: 548, y: 455 },
      { x: 548, y: 487 },
      { x: 648, y: 487 }
    ];
    const horizontalBend = insertOrthogonalRouteBend(
      shortHorizontalNearTurn,
      1,
      { x: 537, y: 455 },
      { width: 1980, height: 1024 }
    );
    expect(horizontalBend.slice(1, 7)).toEqual([
      { x: 526, y: 455 },
      { x: 537, y: 455 },
      { x: 537, y: 423 },
      { x: 548, y: 423 },
      { x: 548, y: 455 },
      { x: 548, y: 487 }
    ]);

    const shortVerticalNearTurn: Point[] = [
      { x: 100, y: 100 },
      { x: 100, y: 128 },
      { x: 100, y: 150 },
      { x: 132, y: 150 }
    ];
    const verticalBend = insertOrthogonalRouteBend(
      shortVerticalNearTurn,
      1,
      { x: 100, y: 139 },
      { width: 400, height: 400 }
    );
    expect(verticalBend.slice(1, 7)).toEqual([
      { x: 100, y: 128 },
      { x: 100, y: 139 },
      { x: 68, y: 139 },
      { x: 68, y: 150 },
      { x: 100, y: 150 },
      { x: 132, y: 150 }
    ]);
  });

  test("keeps endpoint stubs perpendicular after routing through inserted manual bends", () => {
    const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 120, y: 120 }));
    const target = withHiddenDeviceLabel(createRightTerminalLoad({ x: 520, y: 120 }));
    const edge: Edge = {
      id: "manual-bend-perpendicular",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const baseRoute = routeOrthogonalEdge(source, target, [source, target], edge);
    const bendRoute = insertOrthogonalRouteBend(baseRoute, 1, { x: 230, y: 190 }, { width: 700, height: 320 });
    const manualEdge = { ...edge, manualPoints: bendRoute.slice(2, -2) };
    const rerouted = routeOrthogonalEdge(source, target, [source, target], manualEdge, [], { width: 700, height: 320 });
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(rerouted.some((point) => point.y > sourceTerminal.y)).toBe(true);
    expect(rerouted[0]).toEqual(sourceTerminal);
    expect(rerouted[1].y).toBe(sourceTerminal.y);
    expect(rerouted[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(rerouted[rerouted.length - 1]).toEqual(targetTerminal);
    expect(rerouted[rerouted.length - 2].y).toBe(targetTerminal.y);
    expect(rerouted[rerouted.length - 2].x).toBeGreaterThan(targetTerminal.x);
  });

  test("repairs a manual bend path around blockers instead of discarding the manual route", () => {
    const source = createDefaultNode("ac-source", { x: 120, y: 120 });
    const target = createDefaultNode("ac-load", { x: 520, y: 120 });
    const blocker = createDefaultNode("ac-switch", { x: 330, y: 190 });
    const edge: Edge = {
      id: "manual-bend-repair",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const baseRoute = routeOrthogonalEdge(source, target, [source, target], edge);
    const bendRoute = insertOrthogonalRouteBend(baseRoute, 1, { x: 260, y: 190 }, { width: 700, height: 320 });
    const manualEdge = { ...edge, manualPoints: bendRoute.slice(2, -2) };

    const rerouted = routeOrthogonalEdge(source, target, [source, target, blocker], manualEdge, [], { width: 700, height: 320 });

    expect(rerouted.some((point) => point.y !== 120)).toBe(true);
    expect(rerouted.length).toBeGreaterThan(4);
    for (let index = 1; index < rerouted.length; index += 1) {
      expect(rerouted[index - 1].x === rerouted[index].x || rerouted[index - 1].y === rerouted[index].y).toBe(true);
    }
  });

  test("keeps the stationary side of a dragged connection from forming a protruding dogleg", () => {
    const routePoints: Point[] = [
      { x: 100, y: 100 },
      { x: 128, y: 100 },
      { x: 128, y: 168 },
      { x: 240, y: 168 },
      { x: 300, y: 168 },
      { x: 300, y: 140 }
    ];

    const preserved = preserveDraggedRouteShape({
      routePoints,
      nextStart: { x: 140, y: 140 },
      nextEnd: { x: 300, y: 140 },
      sourceDelta: { x: 40, y: 40 },
      targetDelta: { x: 0, y: 0 },
      sourceNormal: { x: 1, y: 0 },
      targetNormal: { x: 0, y: 1 }
    });

    expect(preserved).toEqual([
      { x: 140, y: 140 },
      { x: 168, y: 140 },
      { x: 168, y: 168 },
      { x: 240, y: 168 },
      { x: 300, y: 168 },
      { x: 300, y: 140 }
    ]);
    for (let index = 1; index < preserved.length; index += 1) {
      expect(preserved[index - 1].x === preserved[index].x || preserved[index - 1].y === preserved[index].y).toBe(true);
    }
  });

  test("keeps a dragged bus endpoint stub perpendicular instead of extending along the bus", () => {
    const options = {
      routePoints: [
        { x: 100, y: 80 },
        { x: 128, y: 80 },
        { x: 240, y: 80 },
        { x: 240, y: 100 },
        { x: 200, y: 100 }
      ],
      nextStart: { x: 260, y: 80 },
      nextEnd: { x: 200, y: 100 },
      sourceDelta: { x: 160, y: 0 },
      targetDelta: { x: 0, y: 0 },
      targetNormal: { x: 0, y: -1 }
    } as Parameters<typeof preserveDraggedRouteShape>[0] & { targetNormal: Point };

    const preserved = preserveDraggedRouteShape(options);
    const targetStub = preserved[preserved.length - 2];

    expect(targetStub).toEqual({ x: 200, y: 72 });
    expect(preserved[preserved.length - 1]).toEqual({ x: 200, y: 100 });
  });

  test("marks every non-end route segment as movable", () => {
    const routePoints: Point[] = [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 120 },
      { x: 220, y: 120 },
      { x: 220, y: 20 },
      { x: 280, y: 20 }
    ];

    expect(getMovableRouteSegmentIndexes(routePoints)).toEqual([1, 2, 3]);
  });

  test("keeps routed connection segments from overlapping previous routed lines", () => {
    const leftA = createDefaultNode("ac-source", { x: 120, y: 120 });
    const rightA = createDefaultNode("ac-load", { x: 520, y: 120 });
    const leftB = createDefaultNode("ac-source", { x: 120, y: 220 });
    const rightB = createDefaultNode("ac-load", { x: 520, y: 220 });

    const routes = routeEdgesForRendering(
      [leftA, rightA, leftB, rightB],
      [
        { id: "edge-a", sourceId: leftA.id, targetId: rightA.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "edge-b", sourceId: leftB.id, targetId: rightB.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );

    const segments = routes.map((route) =>
      route.points.slice(1).map((point, index) => ({ a: route.points[index], b: point }))
    );
    const overlapAmount = (first: { a: Point; b: Point }, second: { a: Point; b: Point }) => {
      if (first.a.y === first.b.y && second.a.y === second.b.y && first.a.y === second.a.y) {
        const left = Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x));
        const right = Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x));
        return Math.max(0, right - left);
      }
      if (first.a.x === first.b.x && second.a.x === second.b.x && first.a.x === second.a.x) {
        const top = Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y));
        const bottom = Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y));
        return Math.max(0, bottom - top);
      }
      return 0;
    };

    expect(segments[1].some((segment) => segments[0].some((previous) => overlapAmount(segment, previous) > 2))).toBe(false);
  });

  test("does not reroute unrelated lines when a far non-interfering device moves", () => {
    const source = createDefaultNode("ac-source", { x: 120, y: 140 });
    const target = createDefaultNode("ac-load", { x: 420, y: 140 });
    const unrelated = createDefaultNode("ac-switch", { x: 1200, y: 840 });
    const movedUnrelated = { ...unrelated, position: { x: 1400, y: 980 } };
    const edge: Edge = {
      id: "stable-line",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const before = routeEdgesForRendering([source, target, unrelated], [edge])[0].points;
    const after = routeEdgesForRendering([source, target, movedUnrelated], [edge])[0].points;

    expect(after).toEqual(before);
  });

  test("reroutes unrelated connection lines when a moved graphic blocks their previous path", () => {
    const source = { ...createDefaultNode("ac-source", { x: 160, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 900, y: 140 }), id: "target" };
    const blocker = { ...createDefaultNode("ac-pv-source", { x: 1000, y: 140 }), id: "moved-pv", name: "交流光伏" };
    const edge: Edge = {
      id: "blocked-after-move",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const beforeRoutes = routeEdgesForRendering([source, target, blocker], [edge], { width: 1100, height: 420 });
    const beforePoints = beforeRoutes[0]?.points ?? [];
    const blockingSegment =
      beforePoints
        .slice(1, -1)
        .map((point, index) => ({ a: beforePoints[index + 1], b: beforePoints[index + 2] }))
        .find(({ a, b }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 160) ??
      { a: { x: 480, y: 140 }, b: { x: 640, y: 140 } };
    const movedBlocker = {
      ...blocker,
      position: {
        x: Math.round((blockingSegment.a.x + blockingSegment.b.x) / 2),
        y: Math.round((blockingSegment.a.y + blockingSegment.b.y) / 2)
      }
    };

    const nextEdges = rerouteEdgesAroundMovedNodes(
      [source, target, movedBlocker],
      [edge],
      [movedBlocker.id],
      beforeRoutes,
      { width: 1100, height: 420 }
    );
    const validation = validateConnectionEdgeRoute(
      [source, target, movedBlocker],
      nextEdges,
      edge.id,
      { width: 1100, height: 420 }
    );

    expect(nextEdges[0].manualPoints?.length).toBeGreaterThan(0);
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.route?.points).not.toEqual(beforeRoutes[0].points);
  });

  test("moves unrelated connection lines into and out of local obstacle avoidance", () => {
    const bounds = { width: 1100, height: 460 };
    const source = { ...createDefaultNode("ac-source", { x: 160, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-source", { x: 900, y: 140 }), id: "target" };
    const blocker = { ...createDefaultNode("ac-source", { x: 560, y: 360 }), id: "moved-source", name: "交流电源-中间" };
    const edge: Edge = {
      id: "auto-avoid-line",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const beforeRoutes = routeEdgesForRendering([source, target, blocker], [edge], bounds);
    const beforeRoute = beforeRoutes[0];
    const longMiddleSegment = beforeRoute.points
      .slice(1, -1)
      .map((_point, index) => ({ a: beforeRoute.points[index + 1], b: beforeRoute.points[index + 2] }))
      .find(({ a, b }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 180);
    expect(longMiddleSegment).toBeTruthy();
    const movedBlocker = {
      ...blocker,
      position: {
        x: Math.round((longMiddleSegment!.a.x + longMiddleSegment!.b.x) / 2),
        y: Math.round((longMiddleSegment!.a.y + longMiddleSegment!.b.y) / 2)
      }
    };

    const avoidedEdges = rerouteEdgesAroundMovedNodes(
      [source, target, movedBlocker],
      [edge],
      [movedBlocker.id],
      beforeRoutes,
      bounds
    );
    const avoidedRoute = routeEdgesForStoredRendering([source, target, movedBlocker], avoidedEdges, bounds)[0];
    const avoidedValidation = validateConnectionEdgeRoute([source, target, movedBlocker], avoidedEdges, edge.id, bounds);

    expect(avoidedEdges[0]).not.toBe(edge);
    expect(avoidedEdges[0].manualPoints?.length ?? 0).toBeGreaterThan(0);
    expect(avoidedValidation.ok).toBe(true);
    expect(routeIntersectsSpecificNodes(avoidedRoute.points, avoidedEdges[0], [movedBlocker])).toBe(false);

    const restoredEdges = rerouteEdgesAroundMovedNodes(
      [source, target, blocker],
      avoidedEdges,
      [blocker.id],
      [avoidedRoute],
      bounds,
      [edge.id],
      avoidedEdges
    );
    const restoredRoute = routeEdgesForStoredRendering([source, target, blocker], restoredEdges, bounds)[0];
    const restoredValidation = validateConnectionEdgeRoute([source, target, blocker], restoredEdges, edge.id, bounds);

    expect(restoredValidation.ok).toBe(true);
    expect(routeIntersectsSpecificNodes(restoredRoute.points, restoredEdges[0], [blocker])).toBe(false);
    expect(restoredRoute.points).toEqual(beforeRoute.points);
    expect(restoredRoute.points).not.toEqual(avoidedRoute.points);
  });

  test("filters moved node blockers by route bounds before reroute collision checks", () => {
    const source = { ...createDefaultNode("ac-source", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-load", { x: 520, y: 140 }), id: "target" };
    const nearBlocker = { ...createDefaultNode("ac-pv-source", { x: 300, y: 140 }), id: "near-blocker" };
    const farBlocker = { ...createDefaultNode("ac-pv-source", { x: 300, y: 440 }), id: "far-blocker" };
    const endpointNode = { ...source, position: { x: 120, y: 141 } };
    const edge: Edge = {
      id: "candidate-filter-line",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const candidates = getRouteBlockingCandidateNodes(
      [{ x: 120, y: 140 }, { x: 520, y: 140 }],
      edge,
      [nearBlocker, farBlocker, endpointNode]
    );

    expect(candidates.map((node) => node.id)).toEqual([nearBlocker.id]);
  });

  test("rebuilds a single affected connection from scratch instead of preserving old manual doglegs", () => {
    const source = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "target" };
    const edge: Edge = {
      id: "single-affected-edge",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 200, y: 80 },
        { x: 320, y: 80 },
        { x: 320, y: 220 },
        { x: 460, y: 220 }
      ]
    };

    const rebuiltEdges = rebuildSingleConnectionRoute(
      [source, target],
      [edge],
      edge.id,
      { width: 700, height: 320 }
    );
    const rebuiltEdge = rebuiltEdges[0];
    const validation = validateConnectionEdgeRoute([source, target], rebuiltEdges, edge.id, { width: 700, height: 320 });
    const route = routeEdgesForRendering([source, target], rebuiltEdges, { width: 700, height: 320 })[0];

    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(rebuiltEdge.manualPoints?.length ?? 0).toBeLessThan(edge.manualPoints!.length);
    expect(new Set(route.points.map((point) => point.y))).toEqual(new Set([140]));
  });

  test("redraws only requested connection routes from scratch", () => {
    const leftA = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "left-a" };
    const rightA = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "right-a" };
    const leftB = { ...createDefaultNode("ac-line", { x: 120, y: 260 }), id: "left-b" };
    const rightB = { ...createDefaultNode("ac-line", { x: 520, y: 260 }), id: "right-b" };
    const staleEdge: Edge = {
      id: "stale-edge",
      sourceId: leftA.id,
      targetId: rightA.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 200, y: 80 },
        { x: 320, y: 80 },
        { x: 320, y: 220 },
        { x: 460, y: 220 }
      ]
    };
    const untouchedEdge: Edge = {
      id: "untouched-edge",
      sourceId: leftB.id,
      targetId: rightB.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 220, y: 320 },
        { x: 420, y: 320 }
      ]
    };

    const nodes = [leftA, rightA, leftB, rightB];
    const redrawn = redrawConnectionRoutesForEdges(nodes, [staleEdge, untouchedEdge], [staleEdge.id], { width: 700, height: 420 });
    const redrawnRoute = routeEdgesForRendering(nodes, redrawn, { width: 700, height: 420 }).find((route) => route.edgeId === staleEdge.id);

    expect(redrawn[0]).not.toBe(staleEdge);
    expect(redrawn[1]).toBe(untouchedEdge);
    expect(redrawn[0].manualPoints?.length ?? 0).toBeLessThan(staleEdge.manualPoints!.length);
    expect(new Set(redrawnRoute?.points.map((point) => point.y))).toEqual(new Set([140]));
  });

  test("redraws connection routes by releasing stale bus endpoint points", () => {
    const source = { ...createDefaultNode("ac-load", { x: 220, y: 160 }), id: "source-load" };
    const bus = { ...createDefaultNode("ac-bus", { x: 520, y: 160 }), id: "target-bus" };
    const edge: Edge = {
      id: "bus-redraw-edge",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 640, y: 160 },
      manualPoints: [
        { x: 220, y: 300 },
        { x: 640, y: 300 }
      ]
    };

    const redrawn = redrawConnectionRoutesForEdges([source, bus], [edge], [edge.id], { width: 760, height: 360 });
    const redrawnEdge = redrawn[0];
    const route = routeEdgesForRendering([source, bus], redrawn, { width: 760, height: 360 })[0];

    expect(redrawnEdge).not.toBe(edge);
    expect(redrawnEdge.targetPoint?.x).toBeLessThan(edge.targetPoint!.x);
    expect(redrawnEdge.manualPoints?.length ?? 0).toBeLessThan(edge.manualPoints!.length);
    expect(route.points[route.points.length - 1]).toEqual(redrawnEdge.targetPoint);
  });

  test("rebuilds every moved-to-stationary connection without rebuilding moved-to-moved connections", () => {
    const left = { ...createDefaultNode("ac-line", { x: 160, y: 200 }), id: "left" };
    const movedA = { ...createDefaultNode("ac-line", { x: 460, y: 200 }), id: "moved-a" };
    const movedB = { ...createDefaultNode("ac-line", { x: 760, y: 200 }), id: "moved-b" };
    const right = { ...createDefaultNode("ac-line", { x: 1060, y: 200 }), id: "right" };
    const leftEdge: Edge = {
      id: "left-external",
      sourceId: left.id,
      targetId: movedA.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 280, y: 110 },
        { x: 380, y: 110 },
        { x: 380, y: 300 }
      ]
    };
    const internalEdge: Edge = {
      id: "internal",
      sourceId: movedA.id,
      targetId: movedB.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 540, y: 110 },
        { x: 680, y: 110 }
      ]
    };
    const rightEdge: Edge = {
      id: "right-external",
      sourceId: movedB.id,
      targetId: right.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 840, y: 300 },
        { x: 940, y: 300 },
        { x: 940, y: 110 }
      ]
    };

    const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
      [left, movedA, movedB, right],
      [leftEdge, internalEdge, rightEdge],
      [movedA.id, movedB.id],
      { width: 1220, height: 520 }
    );

    expect(rebuilt[0]).not.toBe(leftEdge);
    expect(rebuilt[1]).toBe(internalEdge);
    expect(rebuilt[2]).not.toBe(rightEdge);
    expect(rebuilt[0].manualPoints).not.toEqual(leftEdge.manualPoints);
    expect(rebuilt[2].manualPoints).not.toEqual(rightEdge.manualPoints);
    expect(validateConnectionEdgeRoute([left, movedA, movedB, right], rebuilt, leftEdge.id, { width: 1220, height: 520 }).ok).toBe(true);
    expect(validateConnectionEdgeRoute([left, movedA, movedB, right], rebuilt, rightEdge.id, { width: 1220, height: 520 }).ok).toBe(true);
  });

  test("limits moved-to-stationary route rebuild discovery to supplied candidate edges", () => {
    const left = { ...createDefaultNode("ac-line", { x: 80, y: 140 }), id: "left" };
    const moved = { ...createDefaultNode("ac-line", { x: 280, y: 140 }), id: "moved" };
    const right = { ...createDefaultNode("ac-line", { x: 480, y: 140 }), id: "right" };
    const connectedEdge: Edge = {
      id: "connected",
      sourceId: left.id,
      targetId: moved.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [{ x: 180, y: 80 }]
    };
    const unrelatedCandidate: Edge = {
      id: "unrelated",
      sourceId: left.id,
      targetId: right.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
      [left, moved, right],
      [connectedEdge, unrelatedCandidate],
      [moved.id],
      { width: 700, height: 320 },
      [unrelatedCandidate]
    );

    expect(rebuilt[0]).toBe(connectedEdge);
    expect(rebuilt[1]).toBe(unrelatedCandidate);
  });

  test("rebuilds moved-to-moved connection routes when they interfere with stationary devices", () => {
    const movedA = { ...createDefaultNode("ac-line", { x: 180, y: 180 }), id: "moved-a" };
    const movedB = { ...createDefaultNode("ac-line", { x: 780, y: 180 }), id: "moved-b" };
    const blocker = { ...createDefaultNode("ac-line", { x: 480, y: 180 }), id: "stationary-blocker" };
    const edge: Edge = {
      id: "blocked-internal",
      sourceId: movedA.id,
      targetId: movedB.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const rebuilt = rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(
      [movedA, movedB, blocker],
      [edge],
      [movedA.id, movedB.id],
      { width: 1000, height: 420 }
    );
    const route = routeEdgesForRendering([movedA, movedB, blocker], rebuilt, { width: 1000, height: 420 })[0];
    const validation = validateConnectionEdgeRoute([movedA, movedB, blocker], rebuilt, edge.id, { width: 1000, height: 420 });

    expect(rebuilt[0]).not.toBe(edge);
    expect(rebuilt[0].manualPoints?.length ?? 0).toBeGreaterThan(0);
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(new Set(route.points.map((point) => point.y))).not.toEqual(new Set([140]));
  });

  test("rebuilds connected routes after a node geometry transform", () => {
    const source = { ...createDefaultNode("ac-line", { x: 120, y: 140 }), id: "source" };
    const target = { ...createDefaultNode("ac-line", { x: 520, y: 140 }), id: "target" };
    const unrelated = { ...createDefaultNode("ac-line", { x: 120, y: 280 }), id: "unrelated" };
    const transformedTarget = { ...target, rotation: 90, scaleX: -1.6, scaleY: 1.2 };
    const edge: Edge = {
      id: "transform-connected-edge",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [
        { x: 190, y: 80 },
        { x: 340, y: 80 },
        { x: 340, y: 220 },
        { x: 470, y: 220 }
      ]
    };
    const unrelatedEdge: Edge = {
      id: "unrelated-edge",
      sourceId: unrelated.id,
      targetId: source.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [{ x: 200, y: 320 }]
    };

    const rebuilt = rebuildConnectionRoutesForNodes(
      [source, transformedTarget, unrelated],
      [edge, unrelatedEdge],
      [target.id],
      { width: 800, height: 420 }
    );

    expect(rebuilt[0]).not.toBe(edge);
    expect(rebuilt[0].manualPoints?.length ?? 0).toBeLessThan(edge.manualPoints!.length);
    expect(rebuilt[1]).toBe(unrelatedEdge);
    const validation = validateConnectionEdgeRoute(
      [source, transformedTarget, unrelated],
      rebuilt,
      edge.id,
      { width: 800, height: 420 }
    );
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  test("anchors route endpoints on terminals and leaves terminals perpendicularly", () => {
    const source = createDefaultNode("ac-line", { x: 120, y: 120 });
    const target = createDefaultNode("ac-line", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t2");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(points[points.length - 2].y).toBe(targetTerminal.y);
    expect(points[points.length - 2].x).toBeLessThan(targetTerminal.x);
  });

  test("keeps same-side endpoint stubs outside device bodies", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    const target = createRightTerminalLoad({ x: 420, y: 120 });
    const edge: Edge = {
      id: "same-side-terminals",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t1");
    const targetTerminal = getTerminalPoint(target, "t1");
    const targetBox = {
      left: target.position.x - target.size.width / 2 - 8,
      right: target.position.x + target.size.width / 2 + 8,
      top: target.position.y - target.size.height / 2 - 8,
      bottom: target.position.y + target.size.height / 2 + 8
    };

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(points[1].x - sourceTerminal.x).toBeLessThanOrEqual(40);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[points.length - 2].y).toBe(targetTerminal.y);
    expect(points[points.length - 2].x).toBeGreaterThan(targetTerminal.x);
    expect(points[points.length - 2].x - targetTerminal.x).toBeLessThanOrEqual(40);

    const yValues = points.map((point) => point.y);
    expect(Math.min(...yValues)).toBeGreaterThanOrEqual(Math.min(source.position.y - source.size.height / 2, target.position.y - target.size.height / 2) - 48);
    expect(Math.max(...yValues)).toBeLessThanOrEqual(Math.max(source.position.y + source.size.height / 2, target.position.y + target.size.height / 2) + 48);

    for (let index = 2; index < points.length - 1; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > targetBox.top && prev.y < targetBox.bottom && xMax > targetBox.left && xMin < targetBox.right).toBe(false);
      }
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > targetBox.left && prev.x < targetBox.right && yMax > targetBox.top && yMin < targetBox.bottom).toBe(false);
      }
    }
  });

  test("routes around rotated device structure when rotation changes terminals and glyphs", () => {
    const source = createDefaultNode("ac-line", { x: 100, y: 150 });
    const target = createDefaultNode("ac-line", { x: 420, y: 150 });
    const blocker = { ...createDefaultNode("ac-line", { x: 260, y: 100 }), rotation: 90 };
    const edge: Edge = {
      id: "rotated-blocker",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const route = routeEdgesForRendering([source, target, blocker], [edge], { width: 900, height: 360 })[0];
    const blockerHalfWidth = (blocker.size.width * Math.abs(getNodeScaleX(blocker))) / 2;
    const blockerHalfHeight = (blocker.size.height * Math.abs(getNodeScaleY(blocker))) / 2;
    const blockerRadians = (blocker.rotation * Math.PI) / 180;
    const blockerVisualHalfWidth = blockerHalfWidth * Math.abs(Math.cos(blockerRadians)) + blockerHalfHeight * Math.abs(Math.sin(blockerRadians));
    const blockerVisualHalfHeight = blockerHalfWidth * Math.abs(Math.sin(blockerRadians)) + blockerHalfHeight * Math.abs(Math.cos(blockerRadians));
    const blockerBox = {
      left: blocker.position.x - blockerVisualHalfWidth - 8,
      right: blocker.position.x + blockerVisualHalfWidth + 8,
      top: blocker.position.y - blockerVisualHalfHeight - 8,
      bottom: blocker.position.y + blockerVisualHalfHeight + 8
    };

    for (let index = 1; index < route.points.length; index += 1) {
      const prev = route.points[index - 1];
      const point = route.points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
      if (prev.x === point.x) {
        const yMin = Math.min(prev.y, point.y);
        const yMax = Math.max(prev.y, point.y);
        expect(prev.x > blockerBox.left && prev.x < blockerBox.right && yMax > blockerBox.top && yMin < blockerBox.bottom).toBe(false);
      }
      if (prev.y === point.y) {
        const xMin = Math.min(prev.x, point.x);
        const xMax = Math.max(prev.x, point.x);
        expect(prev.y > blockerBox.top && prev.y < blockerBox.bottom && xMax > blockerBox.left && xMin < blockerBox.right).toBe(false);
      }
    }
  });

  test("uses rotated device body bounds while rotation also moves terminals", () => {
    const base = createDefaultNode("ac-line", { x: 260, y: 120 });
    const node = { ...base, rotation: 90, params: { ...base.params, _labelVisible: "0" } };
    const bounds = calculateModelGeometryBounds([node], [], 0);
    const terminal = getTerminalPoint(node, "t2");
    const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
    const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;

    expect(bounds).toEqual({
      left: node.position.x - halfHeight,
      right: node.position.x + halfHeight,
      top: node.position.y - halfWidth,
      bottom: node.position.y + halfWidth
    });
    expect(terminal.x).toBe(node.position.x);
    expect(terminal.y).toBeGreaterThan(node.position.y);
  });

  test("uses mirrored terminal normals after horizontal flips", () => {
    const source = { ...createDefaultNode("ac-source", { x: 200, y: 120 }), scaleX: -1 };
    const target = createDefaultNode("ac-line", { x: 80, y: 120 });
    const edge: Edge = {
      id: "mirrored-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t2"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t1");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeLessThan(sourceTerminal.x);
  });

  test("mirrors selected graphical nodes by flipping the requested scale axis and mirrored rotation", () => {
    const selected = {
      ...createDefaultNode("ac-source", { x: 200, y: 120 }),
      rotation: 90,
      scale: 1.5,
      scaleX: 1.5,
      scaleY: 1.5
    };
    const other = createDefaultNode("static-rect", { x: 320, y: 120 });

    const horizontallyMirrored = mirrorNodes([selected, other], [selected.id], "horizontal");
    expect(getNodeScaleX(horizontallyMirrored[0])).toBe(-1.5);
    expect(getNodeScaleY(horizontallyMirrored[0])).toBe(1.5);
    expect(horizontallyMirrored[0].rotation).toBe(270);
    expect(horizontallyMirrored[0].position).toEqual(selected.position);
    expect(getNodeScaleX(horizontallyMirrored[1])).toBe(getNodeScaleX(other));

    const verticallyMirrored = mirrorNodes(horizontallyMirrored, [selected.id], "vertical");
    expect(getNodeScaleX(verticallyMirrored[0])).toBe(-1.5);
    expect(getNodeScaleY(verticallyMirrored[0])).toBe(-1.5);
    expect(verticallyMirrored[0].rotation).toBe(90);

    const restoredHorizontal = mirrorNodes(verticallyMirrored, [selected.id], "horizontal");
    expect(getNodeScaleX(restoredHorizontal[0])).toBe(1.5);
    expect(getNodeScaleY(restoredHorizontal[0])).toBe(-1.5);
    expect(restoredHorizontal[0].rotation).toBe(270);
  });

  test("uses vertical terminal normals for top and bottom terminals", () => {
    const source = createDefaultNode("ac-bus", { x: 200, y: 220 });
    const target = createDefaultNode("ac-bus", { x: 200, y: 520 });
    const edge: Edge = {
      id: "e-vertical-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t4",
      targetTerminalId: "t3"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t4");
    const targetTerminal = getTerminalPoint(target, "t3");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].x).toBe(sourceTerminal.x);
    expect(points[1].y).toBeGreaterThan(sourceTerminal.y);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[points.length - 2].x).toBe(targetTerminal.x);
    expect(points[points.length - 2].y).toBeLessThan(targetTerminal.y);
  });

  test("connects buses perpendicularly even when legacy terminal ids are present", () => {
    const source = createDefaultNode("ac-bus", { x: 200, y: 220 });
    const target = createDefaultNode("ac-line", { x: 520, y: 220 });
    const edge: Edge = {
      id: "e-mixed-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t3",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t3");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].x).toBe(sourceTerminal.x);
    expect(points[1].y).not.toBe(sourceTerminal.y);
  });

  test("connects to arbitrary bus points with a perpendicular final segment", () => {
    const source = createDefaultNode("ac-line", { x: 160, y: 120 });
    const bus = createDefaultNode("ac-bus", { x: 420, y: 220 });
    const busPoint = { x: 380, y: 220 };
    const edge: Edge = {
      id: "e-bus-point",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint: busPoint
    };

    const points = routeOrthogonalEdge(source, bus, [source, bus], edge);
    const finalPoint = points[points.length - 1];
    const beforeFinal = points[points.length - 2];

    expect(finalPoint).toEqual(busPoint);
    expect(beforeFinal.x).toBe(busPoint.x);
    expect(beforeFinal.y).not.toBe(busPoint.y);
  });

  test("optimizes a committed bus endpoint to reduce bends and total length", () => {
    const source = createDefaultNode("ac-line", { x: 160, y: 120 });
    const bus = createDefaultNode("ac-bus", { x: 420, y: 220 });
    const initialBusPoint = { x: 480, y: 220 };
    const edge: Edge = {
      id: "optimize-bus-endpoint",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint: initialBusPoint
    };
    const nodes = [source, bus];
    const beforeRoute = routeEdgesForRendering(nodes, [edge], { width: 700, height: 320 })[0].points;
    const lengthOf = (points: Point[]) =>
      points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
    const bendsOf = (points: Point[]) =>
      points.slice(2).filter((point, index) => {
        const previous = points[index + 1];
        const beforePrevious = points[index];
        return (beforePrevious.x === previous.x) !== (previous.x === point.x);
      }).length;

    const prepared = prepareConnectionEdgeForCommit(nodes, [edge], edge.id, { width: 700, height: 320 });

    expect(prepared.ok).toBe(true);
    expect(prepared.edge?.targetPoint).toEqual(projectPointToBusCenterline(bus, getTerminalPoint(source, "t2")));
    const afterRoute = routeEdgesForRendering(nodes, [prepared.edge!], { width: 700, height: 320 })[0].points;
    expect(bendsOf(afterRoute)).toBeLessThanOrEqual(bendsOf(beforeRoute));
    expect(lengthOf(afterRoute)).toBeLessThan(lengthOf(beforeRoute));
  });

  test("optimizes a lower bus endpoint under a single-terminal source outward stub", () => {
    const source = { ...createDefaultNode("ac-source", { x: 400, y: 260 }), id: "source" };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 620, y: 680 }),
      id: "lower-bus",
      size: { width: 900, height: 28 }
    };
    const sourcePoint = getTerminalPoint(source, "t1");
    const initialBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x - 80, y: bus.position.y });
    const edge: Edge = {
      id: "source-to-lower-bus-folded",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: initialBusPoint
    };

    const prepared = prepareConnectionEdgeForCommit([source, bus], [edge], edge.id, { width: 1200, height: 900 });
    const route = prepared.edge
      ? routeEdgesForStoredRendering([source, bus], [prepared.edge], { width: 1200, height: 900 })[0].points
      : [];

    expect(prepared.ok).toBe(true);
    expect(prepared.edge?.targetPoint).toEqual(projectPointToBusCenterline(bus, { x: sourcePoint.x + 28, y: bus.position.y }));
    expect(routeBendCountForTest(route)).toBe(1);
    expect(route[0]).toEqual(sourcePoint);
    expect(route[route.length - 1]).toEqual(prepared.edge?.targetPoint);
  });

  test("slides the bus endpoint when the opposite device moves so a straight line remains straight", () => {
    const load = createRightTerminalLoad({ x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 260, y: 100 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "slide-straight-bus",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 }
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    expect(patch).toEqual({ targetPoint: projectPointToBusCenterline(bus, getTerminalPoint(movedLoad, "t1")) });
  });

  test("slides bus endpoints for manual routes when the terminal segment stays outward", () => {
    const load = createRightTerminalLoad({ x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 260, y: 100 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "slide-manual-bus",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 },
      manualPoints: [
        { x: 260, y: 130 },
        { x: 320, y: 130 }
      ]
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    expect(patch).toEqual({ targetPoint: projectPointToBusCenterline(bus, getTerminalPoint(movedLoad, "t1")) });
  });

  test("slides a lower bus endpoint to a moved single-terminal source outward stub", () => {
    const source = { ...createDefaultNode("ac-source", { x: 400, y: 260 }), id: "source" };
    const movedSource = { ...source, position: { x: 470, y: 260 } };
    const bus = {
      ...createDefaultNode("ac-bus", { x: 620, y: 680 }),
      id: "lower-bus",
      size: { width: 900, height: 28 }
    };
    const originalSourcePoint = getTerminalPoint(source, "t1");
    const movedSourcePoint = getTerminalPoint(movedSource, "t1");
    const edge: Edge = {
      id: "slide-single-source-lower-bus",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: projectPointToBusCenterline(bus, { x: originalSourcePoint.x + 28, y: bus.position.y })
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: source,
      targetNode: bus,
      nextSourceNode: movedSource,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [source, bus],
      nextNodes: [movedSource, bus]
    });

    expect(patch).toEqual({
      targetPoint: projectPointToBusCenterline(bus, { x: movedSourcePoint.x + 28, y: bus.position.y })
    });
    const nextEdge = { ...edge, ...patch };
    const route = routeEdgesForStoredRendering([movedSource, bus], [nextEdge], { width: 1200, height: 900 })[0].points;
    expect(routeBendCountForTest(route)).toBe(1);
  });

  test("slides a bus endpoint through an outward stub when the direct terminal segment would be sideways", () => {
    const load = createRightTerminalLoad({ x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 260, y: 140 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "sideways-bus-slide",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 }
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    const movedLoadPoint = getTerminalPoint(movedLoad, "t1");
    expect(patch).toEqual({
      targetPoint: projectPointToBusCenterline(bus, { x: movedLoadPoint.x + 28, y: bus.position.y })
    });
  });

  test("does not clamp a bus endpoint behind the moved device terminal", () => {
    const load = createDefaultNode("ac-load", { x: 200, y: 100 });
    const movedLoad = { ...load, position: { x: 520, y: 100 } };
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const edge: Edge = {
      id: "slide-clamped-bus",
      sourceId: load.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 243, y: 100 }
    };

    const patch = resolveStraightBusSlideEndpoint({
      edge,
      sourceNode: load,
      targetNode: bus,
      nextSourceNode: movedLoad,
      nextTargetNode: bus,
      movingEndpoint: "source",
      nodes: [load, bus],
      nextNodes: [movedLoad, bus]
    });

    expect(patch).toBeNull();
  });

  test("slides both bus endpoints for a moved two-terminal device connected through outward stubs", () => {
    const upperBus = {
      ...createDefaultNode("ac-bus", { x: 300, y: 100 }),
      id: "upper-bus",
      size: { width: 420, height: 28 }
    };
    const lowerBus = {
      ...createDefaultNode("ac-bus", { x: 300, y: 300 }),
      id: "lower-bus",
      size: { width: 420, height: 28 }
    };
    const branch = {
      ...createDefaultNode("ac-line", { x: 300, y: 200 }),
      id: "branch"
    };
    const movedBranch = { ...branch, position: { x: 340, y: 200 } };
    const upperEdge: Edge = {
      id: "upper-bus-edge",
      sourceId: upperBus.id,
      targetId: branch.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      sourcePoint: { x: 246, y: 100 }
    };
    const lowerEdge: Edge = {
      id: "lower-bus-edge",
      sourceId: branch.id,
      targetId: lowerBus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint: { x: 354, y: 300 }
    };
    const nodes = [upperBus, lowerBus, branch];
    const nextNodes = [upperBus, lowerBus, movedBranch];
    const projectedEndpointStubPoint = (bus: ModelNode, node: ModelNode, terminalId: string) => {
      const terminalPoint = getTerminalPoint(node, terminalId);
      const normal = getTerminalNormal(node, terminalId);
      return projectPointToBusCenterline(bus, {
        x: Math.round(terminalPoint.x + normal.x * 28),
        y: Math.round(terminalPoint.y + normal.y * 28)
      });
    };

    const upperPatch = resolveStraightBusSlideEndpoint({
      edge: upperEdge,
      sourceNode: upperBus,
      targetNode: branch,
      nextSourceNode: upperBus,
      nextTargetNode: movedBranch,
      movingEndpoint: "target",
      nodes,
      nextNodes
    });
    const lowerPatch = resolveStraightBusSlideEndpoint({
      edge: lowerEdge,
      sourceNode: branch,
      targetNode: lowerBus,
      nextSourceNode: movedBranch,
      nextTargetNode: lowerBus,
      movingEndpoint: "source",
      nodes,
      nextNodes
    });

    expect(upperPatch).toEqual({ sourcePoint: projectedEndpointStubPoint(upperBus, movedBranch, "t1") });
    expect(lowerPatch).toEqual({ targetPoint: projectedEndpointStubPoint(lowerBus, movedBranch, "t2") });
  });

  test("slides the opposite bus endpoint while a connection endpoint is being rewired or dragged", () => {
    const bus = createDefaultNode("ac-bus", { x: 300, y: 100 });
    const load = createDefaultNode("ac-load", { x: 460, y: 180 });
    const edge: Edge = {
      id: "slide-rewire-bus",
      sourceId: bus.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      sourcePoint: { x: 260, y: 100 },
      targetTerminalId: "t1",
      manualPoints: [
        { x: 300, y: 150 },
        { x: 420, y: 150 }
      ]
    };

    const patch = resolveStraightBusSlideEndpointToPoint({
      edge,
      sourceNode: bus,
      targetNode: load,
      movingEndpoint: "target",
      movingPoint: { x: 330, y: 190 },
      nodes: [bus, load]
    });

    expect(patch).toEqual({ sourcePoint: { x: 330, y: 100 } });
  });

  test("connects to thermal storage tank boundary with a perpendicular movable middle segment", () => {
    const source = createDefaultNode("heat-pipeline", { x: 160, y: 120 });
    const tank = createDefaultNode("thermal-storage-tank", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-thermal-storage",
      sourceId: source.id,
      targetId: tank.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, tank, [source, tank], edge);
    const targetPoint = points[points.length - 1];
    const beforeTarget = points[points.length - 2];

    expect(targetPoint).toEqual({ x: tank.position.x - tank.size.width / 2, y: tank.position.y });
    expect(beforeTarget.y).toBe(targetPoint.y);
    expect(beforeTarget.x).toBeLessThan(targetPoint.x);
    expect(getMovableRouteSegmentIndexes(points)).toContain(1);
  });

  test("connects to hydrogen tank boundary with a perpendicular movable middle segment", () => {
    const source = createDefaultNode("hydrogen-pipeline", { x: 160, y: 120 });
    const tank = createDefaultNode("hydrogen-tank", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-hydrogen-tank",
      sourceId: source.id,
      targetId: tank.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, tank, [source, tank], edge);
    const targetPoint = points[points.length - 1];
    const beforeTarget = points[points.length - 2];

    expect(targetPoint).toEqual({ x: tank.position.x - tank.size.width / 2, y: tank.position.y });
    expect(beforeTarget.y).toBe(targetPoint.y);
    expect(beforeTarget.x).toBeLessThan(targetPoint.x);
    expect(getMovableRouteSegmentIndexes(points)).toContain(1);
  });

  test("uses storage tank visual borders as route blocker boundaries without outward padding", () => {
    const tank = createDefaultNode("hydrogen-tank", { x: 300, y: 120 });
    const load = createDefaultNode("hydrogen-load", { x: 300, y: 260 });
    const outsideTankBorder = {
      x: tank.position.x - tank.size.width / 2 - 4,
      y: tank.position.y
    };
    const insideTankBorder = {
      x: tank.position.x - tank.size.width / 2 + 1,
      y: tank.position.y
    };
    const outsideRegularNodePaddedBorder = {
      x: load.position.x - load.size.width / 2 - 4,
      y: load.position.y
    };

    expect(segmentIntersectsNodeBody(outsideTankBorder, { ...outsideTankBorder, y: outsideTankBorder.y + 18 }, tank)).toBe(false);
    expect(segmentIntersectsNodeBody(insideTankBorder, { ...insideTankBorder, y: insideTankBorder.y + 18 }, tank)).toBe(true);
    expect(segmentIntersectsNodeBody(
      outsideRegularNodePaddedBorder,
      { ...outsideRegularNodePaddedBorder, y: outsideRegularNodePaddedBorder.y + 18 },
      load
    )).toBe(true);
  });

  test("allows only terminals with the same electrical type to connect", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });

    expect(canConnectTerminals(acBus, "t1", acLoad, acLoad.terminals[0].id)).toBe(true);
    expect(canConnectTerminals(acBus, "t1", dcLoad, dcLoad.terminals[0].id)).toBe(false);
  });

  test("aligns selected nodes horizontally and vertically without moving unselected nodes", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 260, y: 180 }),
      createDefaultNode("ac-load", { x: 420, y: 260 })
    ];
    const selectedIds = [nodes[0].id, nodes[2].id];

    const horizontal = alignNodes(nodes, selectedIds, "horizontal");
    expect(horizontal.find((node) => node.id === nodes[0].id)?.position.y).toBe(180);
    expect(horizontal.find((node) => node.id === nodes[2].id)?.position.y).toBe(180);
    expect(horizontal.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 260, y: 180 });

    const vertical = alignNodes(nodes, selectedIds, "vertical");
    expect(vertical.find((node) => node.id === nodes[0].id)?.position.x).toBe(260);
    expect(vertical.find((node) => node.id === nodes[2].id)?.position.x).toBe(260);
    expect(vertical.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 260, y: 180 });
  });

  test("aligns selected nodes to left, right, top, and bottom edges", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 280, y: 220 }),
      createDefaultNode("ac-load", { x: 440, y: 320 })
    ];
    const selectedIds = [nodes[0].id, nodes[2].id];
    const firstHalfWidth = nodes[0].size.width / 2;
    const thirdHalfWidth = nodes[2].size.width / 2;
    const firstHalfHeight = nodes[0].size.height / 2;
    const thirdHalfHeight = nodes[2].size.height / 2;

    const left = alignNodes(nodes, selectedIds, "left");
    expect(left.find((node) => node.id === nodes[0].id)?.position.x).toBe(100);
    expect(left.find((node) => node.id === nodes[2].id)?.position.x).toBe(100 - firstHalfWidth + thirdHalfWidth);
    expect(left.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 280, y: 220 });

    const right = alignNodes(nodes, selectedIds, "right");
    expect(right.find((node) => node.id === nodes[0].id)?.position.x).toBe(440 + thirdHalfWidth - firstHalfWidth);
    expect(right.find((node) => node.id === nodes[2].id)?.position.x).toBe(440);

    const top = alignNodes(nodes, selectedIds, "top");
    expect(top.find((node) => node.id === nodes[0].id)?.position.y).toBe(100);
    expect(top.find((node) => node.id === nodes[2].id)?.position.y).toBe(100 - firstHalfHeight + thirdHalfHeight);

    const bottom = alignNodes(nodes, selectedIds, "bottom");
    expect(bottom.find((node) => node.id === nodes[0].id)?.position.y).toBe(320 + thirdHalfHeight - firstHalfHeight);
    expect(bottom.find((node) => node.id === nodes[2].id)?.position.y).toBe(320);
  });

  test("distributes selected nodes horizontally and vertically while keeping edge nodes fixed", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 80 }),
      createDefaultNode("ac-switch", { x: 430, y: 360 }),
      createDefaultNode("ac-load", { x: 220, y: 220 }),
      createDefaultNode("dc-load", { x: 800, y: 800 })
    ];
    const selectedIds = [nodes[0].id, nodes[1].id, nodes[2].id];

    const horizontal = distributeNodes(nodes, selectedIds, "horizontal");
    expect(horizontal.find((node) => node.id === nodes[0].id)?.position.x).toBe(100);
    expect(horizontal.find((node) => node.id === nodes[2].id)?.position.x).toBe(265);
    expect(horizontal.find((node) => node.id === nodes[1].id)?.position.x).toBe(430);
    expect(horizontal.find((node) => node.id === nodes[3].id)?.position).toEqual({ x: 800, y: 800 });

    const vertical = distributeNodes(nodes, selectedIds, "vertical");
    expect(vertical.find((node) => node.id === nodes[0].id)?.position.y).toBe(80);
    expect(vertical.find((node) => node.id === nodes[2].id)?.position.y).toBe(220);
    expect(vertical.find((node) => node.id === nodes[1].id)?.position.y).toBe(360);
    expect(vertical.find((node) => node.id === nodes[3].id)?.position).toEqual({ x: 800, y: 800 });
  });

  test("includes specialized AC and DC source device types with matching terminal types", () => {
    const expected = [
      ["ac-wind-source", "ac"],
      ["dc-wind-source", "dc"],
      ["ac-pv-source", "ac"],
      ["dc-pv-source", "dc"],
      ["ac-thermal-source", "ac"],
      ["ac-hydro-source", "ac"],
      ["ac-nuclear-source", "ac"]
    ];

    for (const [kind, terminalType] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template?.terminalType).toBe(terminalType);
    }
  });

  test("includes DC electrochemical storage as a single-port DC device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-storage");
    expect(template).toMatchObject({
      label: "电化学储能",
      attributeLibrary: "直流设备",
      terminalType: "dc",
      terminalCount: 1
    });

    const node = createDefaultNode("dc-storage", { x: 100, y: 100 });
    expect(node.terminals).toHaveLength(1);
    expect(node.terminals[0].type).toBe("dc");
    expect(node.params.vbase).toBe("0");
    expect(getDeviceGlyphVariant("dc-storage")).toBe("battery-storage");
  });

  test("includes AC electrochemical storage as a single-port AC device", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-storage");
    expect(template).toMatchObject({
      label: "电化学储能",
      attributeLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 1
    });

    const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
    expect(node.terminals).toHaveLength(1);
    expect(node.terminals[0].type).toBe("ac");
    expect(node.params.vbase).toBe("0");
    expect(getDeviceGlyphVariant("ac-storage")).toBe("battery-storage");
  });

  test("includes hydrogen equipment library with mixed electric-hydrogen ports", () => {
    const expected = [
      ["ac-electrolyzer", "交流电制氢", ["ac", "h2"], "ac-hydrogen-electrolyzer"],
      ["dc-electrolyzer", "直流电制氢", ["dc", "h2"], "dc-hydrogen-electrolyzer"],
      ["hydrogen-source", "氢源", ["h2"], "hydrogen-source"],
      ["hydrogen-tank", "储氢罐", [], "hydrogen-storage"],
      ["hydrogen-tank-horizontal", "横卧式储氢罐", [], "hydrogen-storage-horizontal"],
      ["hydrogen-tank-container", "集装格式储氢罐", [], "hydrogen-storage-container"],
      ["hydrogen-load", "氢荷", ["h2"], "hydrogen-load"],
      ["ac-fuel-cell", "交流燃料电池", ["ac", "h2"], "ac-hydrogen-fuel-cell"],
      ["dc-fuel-cell", "直流燃料电池", ["dc", "h2"], "dc-hydrogen-fuel-cell"],
      ["hydrogen-bus", "氢能母线", [], "hydrogen-bus"],
      ["hydrogen-compressor", "氢压机", ["h2", "h2"], "hydrogen-compressor"],
      ["hydrogen-pressure-reducer", "减压阀", ["h2", "h2"], "hydrogen-regulator"],
      ["hydrogen-shutoff-valve", "截止阀", ["h2", "h2"], "hydrogen-valve"],
      ["hydrogen-pipeline", "输氢管道", ["h2", "h2"], "hydrogen-pipeline"]
    ] as const;

    for (const [kind, label, terminalTypes, glyphVariant] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toMatchObject({ label, attributeLibrary: "氢能设备", terminalCount: terminalTypes.length });
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals.map((terminal) => terminal.type)).toEqual([...terminalTypes]);
      expect(getDeviceGlyphVariant(kind)).toBe(glyphVariant);
      if (kind.includes("tank")) {
        expect(getBusTerminalType(node)).toBe("h2");
      }
    }

    const acElectrolyzer = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });
    const dcElectrolyzer = createDefaultNode("dc-electrolyzer", { x: 240, y: 100 });
    const hydrogenBus = createDefaultNode("hydrogen-bus", { x: 380, y: 100 });
    const hydrogenPipeline = createDefaultNode("hydrogen-pipeline", { x: 520, y: 100 });
    expect(canConnectTerminals(acElectrolyzer, "t1", dcElectrolyzer, "t1")).toBe(false);
    expect(canConnectTerminals(acElectrolyzer, "t2", hydrogenPipeline, "t1")).toBe(true);
    expect(canConnectTerminals(hydrogenBus, "t1", hydrogenPipeline, "t1")).toBe(true);

    const calculated = calculateElectricalTopology(
      [acElectrolyzer, hydrogenBus, hydrogenPipeline],
      [
        { id: "h2-bus", sourceId: acElectrolyzer.id, targetId: hydrogenBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "h2-pipe", sourceId: hydrogenBus.id, targetId: hydrogenPipeline.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const calculatedElectrolyzer = calculated.find((node) => node.id === acElectrolyzer.id)!;
    const calculatedPipeline = calculated.find((node) => node.id === hydrogenPipeline.id)!;
    expect(calculatedElectrolyzer.terminals[1].nodeNumber).toBe(calculatedPipeline.terminals[0].nodeNumber);
  });

  test("includes thermal equipment library with heat network and mixed electric-thermal ports", () => {
    const expected = [
      ["heat-boiler", "供热锅炉", ["heat"], "single-heat-boiler"],
      ["two-port-heat-boiler", "供热锅炉2", ["heat", "heat"], "two-port-heat-boiler"],
      ["heat-source", "单端热源", ["heat"], "single-heat-source"],
      ["two-port-heat-source", "双端热源", ["heat", "heat"], "two-port-heat-source"],
      ["heat-exchanger", "双端热交换器", ["heat", "heat"], "heat-exchanger-two"],
      ["three-port-heat-exchanger", "三端热交换器", ["heat", "heat", "heat"], "heat-exchanger-three"],
      ["four-port-heat-exchanger", "四端热交换器", ["heat", "heat", "heat", "heat"], "heat-exchanger-four"],
      ["ac-heater", "交流电制热", ["ac", "heat"], "ac-heat-electric-heater"],
      ["ac-two-port-heater", "交流电制热2", ["ac", "heat", "heat"], "ac-two-port-heat-electric-heater"],
      ["dc-heater", "直流电制热", ["dc", "heat"], "dc-heat-electric-heater"],
      ["dc-two-port-heater", "直流电制热2", ["dc", "heat", "heat"], "dc-two-port-heat-electric-heater"],
      ["thermal-storage-tank", "储热罐", [], "heat-storage"],
      ["single-port-heat-load", "单端热荷", ["heat"], "single-heat-load"],
      ["two-port-heat-load", "双端热荷", ["heat", "heat"], "two-port-heat-load"],
      ["heat-bus", "热力母线", [], "heat-bus"],
      ["heat-pipeline", "输热管道", ["heat", "heat"], "heat-pipeline"],
      ["heat-pump", "循环水泵", ["heat", "heat"], "heat-pump"],
      ["heat-shutoff-valve", "截止阀", ["heat", "heat"], "heat-valve"]
    ] as const;

    for (const [kind, label, terminalTypes, glyphVariant] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toMatchObject({ label, attributeLibrary: "热能设备", terminalCount: terminalTypes.length });
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals.map((terminal) => terminal.type)).toEqual([...terminalTypes]);
      expect(getDeviceGlyphVariant(kind)).toBe(glyphVariant);
    }
    expect(DEVICE_LIBRARY.some((item) => item.kind === "heat-load")).toBe(false);

    const threePort = createDefaultNode("three-port-heat-exchanger", { x: 100, y: 100 });
    expect(threePort.terminals.map((terminal) => terminal.label)).toEqual(["热能设备单端侧", "热能设备双端侧供水", "热能设备双端侧回水"]);
    expect(threePort.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const fourPort = createDefaultNode("four-port-heat-exchanger", { x: 100, y: 100 });
    expect(fourPort.terminals.map((terminal) => terminal.label)).toEqual(["热能设备一侧供水", "热能设备一侧回水", "热能设备二侧供水", "热能设备二侧回水"]);
    expect(fourPort.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: -0.25 },
      { x: -0.5, y: 0.25 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const twoPortBoiler = createDefaultNode("two-port-heat-boiler", { x: 100, y: 100 });
    expect(twoPortBoiler.terminals.map((terminal) => terminal.label)).toEqual(["热能设备供水端", "热能设备回水端"]);
    expect(twoPortBoiler.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 }
    ]);

    const acTwoPortHeater = createDefaultNode("ac-two-port-heater", { x: 100, y: 100 });
    expect(acTwoPortHeater.terminals.map((terminal) => terminal.label)).toEqual(["交流设备端", "热能设备供水端", "热能设备回水端"]);
    expect(acTwoPortHeater.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const dcTwoPortHeater = createDefaultNode("dc-two-port-heater", { x: 100, y: 100 });
    expect(dcTwoPortHeater.terminals.map((terminal) => terminal.label)).toEqual(["直流设备端", "热能设备供水端", "热能设备回水端"]);
    expect(dcTwoPortHeater.terminals.map((terminal) => terminal.anchor)).toEqual([
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]);

    const acHeater = createDefaultNode("ac-heater", { x: 100, y: 100 });
    const dcHeater = createDefaultNode("dc-heater", { x: 240, y: 100 });
    const heatBus = createDefaultNode("heat-bus", { x: 380, y: 100 });
    const heatPipeline = createDefaultNode("heat-pipeline", { x: 520, y: 100 });
    expect(canConnectTerminals(acHeater, "t1", dcHeater, "t1")).toBe(false);
    expect(canConnectTerminals(acHeater, "t2", heatPipeline, "t1")).toBe(true);
    expect(canConnectTerminals(heatBus, "t1", heatPipeline, "t1")).toBe(true);

    const calculated = calculateElectricalTopology(
      [acHeater, heatBus, heatPipeline],
      [
        { id: "heat-bus-edge", sourceId: acHeater.id, targetId: heatBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "heat-pipeline-edge", sourceId: heatBus.id, targetId: heatPipeline.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const calculatedHeater = calculated.find((node) => node.id === acHeater.id)!;
    const calculatedPipeline = calculated.find((node) => node.id === heatPipeline.id)!;
    expect(calculatedHeater.terminals[1].nodeNumber).toBe(calculatedPipeline.terminals[0].nodeNumber);
  });

  test("creates user-defined device templates with custom terminal energy types and default parameters", () => {
    const template: DeviceTemplate = {
      kind: "ACUnit",
      label: "ACUnit",
      attributeLibrary: "自定义属性库",
      size: { width: 104, height: 64 },
      params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "ac",
      terminalCount: 4,
      terminalTypes: ["ac", "dc", "h2", "heat"],
      terminalLabels: ["交流设备端", "直流设备端", "氢能设备端", "热能设备端"],
      custom: true,
      parameterDefinitions: [
        { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
        { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
        { cnName: "运行状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
        { cnName: "额定效率", enName: "eta", valueType: "float", typicalValue: "0.95" }
      ]
    };

    const node = createNodeFromTemplate(template, { x: 100, y: 120 });
    expect(node.kind).toBe("ACUnit");
    expect(node.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc", "h2", "heat"]);
    expect(node.terminals.map((terminal) => terminal.label)).toEqual(["交流设备端", "直流设备端", "氢能设备端", "热能设备端"]);
    expect(node.params[CUSTOM_DEVICE_TEMPLATE_KEY]).toBe("1");
    expect(JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY])).toHaveLength(4);
    expect(node.params.eta).toBe("0.95");
    expect(node.params.strokeColor).toBe("transparent");
    expect(canConnectTerminals(node, "t3", createDefaultNode("hydrogen-pipeline", { x: 240, y: 120 }), "t1")).toBe(true);
    expect(canConnectTerminals(node, "t4", createDefaultNode("hydrogen-pipeline", { x: 300, y: 120 }), "t1")).toBe(false);

    const firstIndexed = assignPermanentDeviceIndex(node, {});
    const secondIndexed = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 180, y: 120 }), firstIndexed.counters);
    expect(firstIndexed.node.params.idx).toBe("1");
    expect(secondIndexed.node.params.idx).toBe("2");
  });

  test("exports user-defined English device types as custom E sections", () => {
    const template: DeviceTemplate = {
      kind: "custom-CustomEnergyUnit",
      label: "CustomEnergyUnit",
      attributeLibrary: "自定义属性库",
      size: { width: 104, height: 64 },
      params: { component_type: "CustomEnergyUnit", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "ac",
      terminalCount: 1,
      custom: true,
      parameterDefinitions: [
        { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
        { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
        { cnName: "节点", enName: "node", valueType: "integer", typicalValue: "", readonly: true },
        { cnName: "运行状态", enName: "run_stat", valueType: "enum", typicalValue: "1", readonly: true },
        { cnName: "设定值", enName: "p_set", valueType: "float", typicalValue: "3.5" }
      ]
    };
    const node = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 100, y: 100 }), {}).node;
    node.name = "custom_unit_1";
    node.terminals[0].nodeNumber = "8";

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "自定义元件类型导出测试",
      nodes: [node],
      edges: []
    }));

    expect(exported.CustomEnergyUnit.columns).toEqual(["idx", "name", "node", "run_stat", "p_set"]);
    expect(exported.CustomEnergyUnit.rows[0]).toMatchObject({
      idx: "1",
      name: "custom_unit_1",
      node: "1",
      run_stat: "1",
      p_set: "3.5"
    });
    expect(getEExportWarnings({ version: 1, name: "自定义元件类型导出测试", nodes: [node], edges: [] })).toEqual([]);
  });

  test("creates container device definitions with association idx fields instead of topology node fields", () => {
    const terminalTypes = ["ac", "dc", "heat", "heat"] as const;
    const terminalRoles = ["single-load", "single-source", "double-source", "single-load"] as const;
    const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, {
      isContainer: true,
      terminalRoles
    });

    expect(getContainerRelationKey("ac", "single-load", 0)).toBe("idx_ac_load_t1");
    expect(getContainerRelationKey("dc", "single-source", 1)).toBe("idx_dc_unit_t2");
    expect(getContainerRelationKey("heat", "double-source", 2)).toBe("idx_heat2_unit_t3");
    expect(getContainerRelationKey("heat", "single-load", 3)).toBe("idx_heat_load_t4");
    expect(definitions.map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "idx_ac_load_t1",
      "idx_dc_unit_t2",
      "idx_heat2_unit_t3"
    ]);
    expect(definitions.some((definition) => definition.enName.includes("node"))).toBe(false);

    const template: DeviceTemplate = {
      kind: "CustomContainer",
      label: "CustomContainer",
      attributeLibrary: "自定义属性库",
      size: { width: 104, height: 64 },
      params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "ac",
      terminalCount: terminalTypes.length,
      terminalTypes: [...terminalTypes],
      terminalRoles: [...terminalRoles],
      isContainer: true,
      custom: true,
      parameterDefinitions: definitions
    };
    const node = createNodeFromTemplate(template, { x: 100, y: 100 });

    expect(node.params.is_container).toBe("1");
    expect(node.params.idx_ac_load_t1).toBe("");
    expect(node.params.idx_dc_unit_t2).toBe("");
    expect(node.params.idx_heat2_unit_t3).toBe("");
    expect(node.params.idx_heat2_unit_t4).toBeUndefined();
    expect(node.params.t1_node).toBeUndefined();
    expect(node.params.t2_node).toBeUndefined();
  });

  test("creates container definitions from explicit terminal association choices", () => {
    const terminalTypes = ["ac", "dc", "h2", "heat", "heat"] as const;
    const terminalAssociations = ["ac-generator", "dc-load", "h2-source", "heat2-load", ""] as const;
    const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, {
      isContainer: true,
      terminalAssociations
    });

    expect(getContainerAssociationRelationKey("ac-generator", 0)).toBe("idx_ac_unit_t1");
    expect(getContainerAssociationRelationKey("dc-load", 1)).toBe("idx_dc_load_t2");
    expect(getContainerAssociationRelationKey("h2-source", 2)).toBe("idx_h2_unit_t3");
    expect(getContainerAssociationRelationKey("heat2-load", 3)).toBe("idx_heat2_load_t4");
    expect(definitions.map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "idx_ac_unit_t1",
      "idx_dc_load_t2",
      "idx_h2_unit_t3",
      "idx_heat2_load_t4"
    ]);
    expect(definitions.find((definition) => definition.enName === "idx_ac_unit_t1")?.cnName).toContain("交流电源");
    expect(definitions.find((definition) => definition.enName === "idx_heat2_load_t4")?.cnName).toContain("双端热荷");
    expect(definitions.some((definition) => definition.enName.includes("node"))).toBe(false);

    const template: DeviceTemplate = {
      kind: "CustomAssociationDeviceModel",
      label: "CustomAssociationDeviceModel",
      attributeLibrary: "自定义属性库",
      size: { width: 104, height: 64 },
      params: {},
      terminalType: "ac",
      terminalCount: 2,
      terminalTypes: ["ac", "dc"],
      terminalAssociations: ["ac-generator", "dc-generator"],
      isContainer: true,
      custom: true,
      parameterDefinitions: buildDefaultDeviceParameterDefinitions(["ac", "dc"], {
        isContainer: true,
        terminalAssociations: ["ac-generator", "dc-generator"]
      })
    };
    expect(describeContainerTerminalAssociations(template)).toEqual([
      expect.objectContaining({
        relationKey: "idx_ac_unit_t1",
        roleLabel: "交流电源",
        deviceModel: "ACGenerator"
      }),
      expect.objectContaining({
        relationKey: "idx_dc_unit_t2",
        roleLabel: "直流电源",
        deviceModel: "DCGenerator"
      })
    ]);
  });

  test("validates explicit container associations against terminal energy types", () => {
    const wrongEnergy = validateContainerTerminalAssociations(["ac"], ["dc-load"]);
    expect(wrongEnergy.valid).toBe(false);
    expect(wrongEnergy.message).toContain("交流设备");

    const invalidLast = validateContainerTerminalAssociations(["heat"], ["heat2-source"]);
    expect(invalidLast.valid).toBe(false);
    expect(invalidLast.message).toContain("最后一个端子");

    const invalidDependentValue = validateContainerTerminalAssociations(["heat", "heat"], ["heat2-source", "heat2-source"]);
    expect(invalidDependentValue.valid).toBe(false);
    expect(invalidDependentValue.message).toContain("关联属性应为空");

    const valid = validateContainerTerminalAssociations(["heat", "heat"], ["heat2-source", ""]);
    expect(valid.valid).toBe(true);
  });

  test("describes container terminal association metadata for definition dialogs", () => {
    const template: DeviceTemplate = {
      kind: "CustomContainerAssociations",
      label: "CustomContainerAssociations",
      attributeLibrary: "自定义属性库",
      size: { width: 104, height: 64 },
      params: {},
      terminalType: "heat",
      terminalCount: 3,
      terminalTypes: ["heat", "heat", "ac"],
      terminalLabels: ["热能设备供水端", "热能设备回水端", "交流设备端"],
      terminalRoles: ["double-source", "single-load", "single-load"],
      isContainer: true,
      custom: true,
      parameterDefinitions: buildDefaultDeviceParameterDefinitions(["heat", "heat", "ac"], {
        isContainer: true,
        terminalRoles: ["double-source", "single-load", "single-load"]
      })
    };

    expect(describeContainerTerminalAssociations(template)).toEqual([
      expect.objectContaining({
        terminalIndex: 0,
        terminalLabel: "热能设备供水端",
        terminalType: "heat",
        relationKey: "idx_heat2_unit_t1",
        relationName: "热能设备供水端双端源关联idx",
        roleLabel: "双端源",
        sourceTerminalIndex: 0,
        dependent: false
      }),
      expect.objectContaining({
        terminalIndex: 1,
        terminalLabel: "热能设备回水端",
        terminalType: "heat",
        relationKey: "",
        relationName: "随端子1关联双端源",
        roleLabel: "双端源",
        sourceTerminalIndex: 0,
        dependent: true
      }),
      expect.objectContaining({
        terminalIndex: 2,
        terminalLabel: "交流设备端",
        terminalType: "ac",
        relationKey: "idx_ac_load_t3",
        relationName: "交流设备端单端荷关联idx",
        roleLabel: "单端荷",
        sourceTerminalIndex: 2,
        dependent: false
      })
    ]);
  });

  test("describes three-winding transformer terminal associations as internal two-winding transformers", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    expect(describeContainerTerminalAssociations(template)).toEqual([
      expect.objectContaining({
        terminalIndex: 0,
        terminalType: "ac",
        relationKey: "idx_xf_t1",
        relationName: "高压绕组双绕组主变idx",
        roleLabel: "双绕组主变首端",
        deviceModel: "ACTransformer"
      }),
      expect.objectContaining({
        terminalIndex: 1,
        terminalType: "ac",
        relationKey: "idx_xf_t2",
        relationName: "中压绕组双绕组主变idx",
        roleLabel: "双绕组主变首端",
        deviceModel: "ACTransformer"
      }),
      expect.objectContaining({
        terminalIndex: 2,
        terminalType: "ac",
        relationKey: "idx_xf_t3",
        relationName: "低压绕组双绕组主变idx",
        roleLabel: "双绕组主变首端",
        deviceModel: "ACTransformer"
      })
    ]);
  });

  test("builds one body view plus associated device views for container parameters", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    node.name = "EL1";
    node.terminals[0].nodeNumber = "5";
    node.terminals[1].nodeNumber = "2";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-electrolyzer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views.map((view) => view.label)).toEqual(["容器本体", "交流设备端交流电负荷", "氢能设备端氢源"]);
    expect(views[0]).toMatchObject({ id: "container", kind: "container" });
    expect(views[1]).toMatchObject({
      kind: "associated",
      componentType: "ACLoad",
      relationKeys: ["idx_ac_load_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: "1" }),
      expect.objectContaining({ key: "node", value: "5" }),
      expect.objectContaining({ key: "pbase", value: "0" }),
      expect.objectContaining({ key: "pv0", value: "1.0" }),
      expect.objectContaining({ key: "qbase", value: "0" }),
      expect.objectContaining({ key: "qv0", value: "1.0" })
    ]));
    expect(views[2]).toMatchObject({
      kind: "associated",
      componentType: "HydroSource",
      relationKeys: ["idx_h2_unit_t2"],
      terminalIndexes: [1]
    });
  });

  test("shows container-associated electric port parameters using the associated E section columns", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    node.name = "EL1";
    node.terminals[0].nodeNumber = "5";
    node.params.pbase_ac_load_t1 = "6.5";
    node.params.pv0_ac_load_t1 = "1.0";
    node.params.qbase_ac_load_t1 = "1.2";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-electrolyzer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views[1]).toMatchObject({
      kind: "associated",
      componentType: "ACLoad",
      relationKeys: ["idx_ac_load_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows.map((row) => row.key)).toEqual(E_SECTION_COLUMNS.ACLoad);
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: node.params.idx_ac_load_t1, readonly: true }),
      expect.objectContaining({ key: "name", value: "EL1_交流设备端交流电负荷", readonly: false }),
      expect.objectContaining({ key: "node", value: "5", readonly: true }),
      expect.objectContaining({ key: "pbase", value: "6.5", readonly: false }),
      expect.objectContaining({ key: "pv0", value: "1.0", readonly: false }),
      expect.objectContaining({ key: "qbase", value: "1.2", readonly: false })
    ]));
  });

  test("shows DC fuel-cell electric port parameters using DCGenerator columns", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("dc-fuel-cell", { x: 100, y: 100 }), {}).node;
    node.name = "FC1";
    node.terminals[0].nodeNumber = "7";
    node.params.control_type_dc_unit_t1 = "V";
    node.params.v_set_dc_unit_t1 = "750";
    node.params.p_set_dc_unit_t1 = "3.2";
    node.params.i_set_dc_unit_t1 = "4.5";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-fuel-cell")!;

    const views = buildContainerDeviceParameterViews(node, template);
    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "直流燃料电池参数测试",
      nodes: [node],
      edges: []
    }));

    expect(views[1]).toMatchObject({
      kind: "associated",
      componentType: "DCGenerator",
      relationKeys: ["idx_dc_unit_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows.map((row) => row.key)).toEqual(E_SECTION_COLUMNS.DCGenerator);
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: node.params.idx_dc_unit_t1, readonly: true }),
      expect.objectContaining({ key: "name", value: "FC1_直流设备端直流电源", readonly: false }),
      expect.objectContaining({ key: "node", value: "7", readonly: true }),
      expect.objectContaining({ key: "control_type", value: "V", readonly: false }),
      expect.objectContaining({ key: "v_set", value: "750", readonly: false }),
      expect.objectContaining({ key: "p_set", value: "3.2", readonly: false }),
      expect.objectContaining({ key: "i_set", value: "4.5", readonly: false })
    ]));
    expect(exported.DCGenerator.rows[0]).toMatchObject({
      idx: node.params.idx_dc_unit_t1,
      name: "FC1_直流设备端直流电源",
      node: "1",
      control_type: "V",
      v_set: "750",
      p_set: "3.2",
      i_set: "4.5"
    });
  });

  test("uses associated E section columns for every built-in container-associated device view", () => {
    for (const template of DEVICE_LIBRARY.filter((item) => item.isContainer)) {
      const node = assignPermanentDeviceIndex(createDefaultNode(template.kind, { x: 100, y: 100 }), {}).node;
      const views = buildContainerDeviceParameterViews(node, template).filter((view) => view.kind === "associated");

      expect(views.length, template.kind).toBeGreaterThan(0);
      for (const view of views) {
        expect(view.componentType, `${template.kind}:${view.label}`).toBeTruthy();
        const columns = E_SECTION_COLUMNS[view.componentType ?? ""];
        expect(columns, `${template.kind}:${view.label}:${view.componentType}`).toBeDefined();
        expect(view.rows.map((row) => row.key), `${template.kind}:${view.label}`).toEqual(columns);
      }
    }
  });

  test("filters container body parameters to the current container variant", () => {
    const expected = [
      ["ac-electrolyzer", ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_h2_unit_t2"], ["idx_dc_load_t1", "is_container"]],
      ["dc-electrolyzer", ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_h2_unit_t2"], ["idx_ac_load_t1", "is_container"]],
      ["ac-fuel-cell", ["idx", "name", "run_stat", "idx_ac_unit_t1", "idx_h2_load_t2"], ["idx_dc_unit_t1", "is_container"]],
      ["dc-fuel-cell", ["idx", "name", "run_stat", "idx_dc_unit_t1", "idx_h2_load_t2"], ["idx_ac_unit_t1", "is_container"]],
      ["ac-heater", ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"], ["idx_dc_load_t1", "is_container"]],
      ["dc-heater", ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"], ["idx_ac_load_t1", "is_container"]]
    ] as const;

    for (const [kind, includedKeys, excludedKeys] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
      const bodyView = buildContainerDeviceParameterViews(node, template)[0];
      const keys = bodyView.rows.map((row) => row.key);

      expect(bodyView).toMatchObject({ id: "container", kind: "container" });
      expect(keys, kind).toEqual(expect.arrayContaining([...includedKeys]));
      for (const excludedKey of excludedKeys) {
        expect(keys, `${kind}:${excludedKey}`).not.toContain(excludedKey);
      }
    }
  });

  test("shows three-winding transformer associated branches with ACTransformer side parameters", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }), {}).node;
    node.name = "T3";
    node.terminals[0].nodeNumber = "11";
    node.params.neutral_node = "99";
    node.params.highResistancePu = "0.01";
    node.params.highReactancePu = "0.11";
    node.params.highMagnetizingConductancePu = "0.001";
    node.params.highMagnetizingSusceptancePu = "0.002";
    node.params.highTapRatio = "1.03";
    node.params.highShift = "2.5";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views[1]).toMatchObject({
      kind: "associated",
      componentType: "ACTransformer",
      relationKeys: ["idx_xf_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows.map((row) => row.key)).toEqual(E_SECTION_COLUMNS.ACTransformer);
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: node.params.idx_xf_t1, readonly: true }),
      expect.objectContaining({ key: "name", value: "T3_高压绕组", readonly: false }),
      expect.objectContaining({ key: "i_node", value: "11", readonly: true }),
      expect.objectContaining({ key: "j_node", value: "99", readonly: true }),
      expect.objectContaining({ key: "r", value: "0.01", readonly: false }),
      expect.objectContaining({ key: "x", value: "0.11", readonly: false }),
      expect.objectContaining({ key: "gt", value: "0.001", readonly: false }),
      expect.objectContaining({ key: "bt", value: "0.002", readonly: false }),
      expect.objectContaining({ key: "tap", value: "1.03", readonly: false }),
      expect.objectContaining({ key: "shift", value: "2.5", readonly: false })
    ]));
  });

  test("maps electrolysis electric terminals to loads and fuel-cell electric terminals to generators", () => {
    const expected = [
      ["ac-electrolyzer", "idx_ac_load_t1", "ACLoad", "ACLoad", "idx_h2_unit_t2", "HydroSource"],
      ["dc-electrolyzer", "idx_dc_load_t1", "DCLoad", "DCLoad", "idx_h2_unit_t2", "HydroSource"],
      ["ac-fuel-cell", "idx_ac_unit_t1", "ACGenerator", "ACGenerator", "idx_h2_load_t2", "HydroLoad"],
      ["dc-fuel-cell", "idx_dc_unit_t1", "DCGenerator", "DCGenerator", "idx_h2_load_t2", "HydroLoad"]
    ] as const;

    for (const [kind, electricRelationKey, electricComponentType, electricSection, hydrogenRelationKey, hydrogenSection] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
      const associations = describeContainerTerminalAssociations(template);
      const views = buildContainerDeviceParameterViews(node, template);
      const exported = parseESections(buildEDeviceParameterFile({
        version: 1,
        name: `${kind}-关联测试`,
        nodes: [node],
        edges: []
      }));

      expect(associations[0]).toMatchObject({
        terminalIndex: 0,
        relationKey: electricRelationKey,
        deviceModel: electricComponentType
      });
      expect(associations[1]).toMatchObject({
        terminalIndex: 1,
        relationKey: hydrogenRelationKey,
        deviceModel: hydrogenSection
      });
      expect(views[1]).toMatchObject({
        kind: "associated",
        componentType: electricComponentType,
        relationKeys: [electricRelationKey],
        terminalIndexes: [0]
      });
      expect(exported[electricSection].rows[0].idx).toBe(node.params[electricRelationKey]);
      expect(exported[hydrogenSection].rows[0].idx).toBe(node.params[hydrogenRelationKey]);
    }
  });

  test("deduplicates double-port container associations into one associated device view", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-two-port-heater", { x: 100, y: 100 }), {}).node;
    node.terminals[0].nodeNumber = "1";
    node.terminals[1].nodeNumber = "2";
    node.terminals[2].nodeNumber = "3";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-port-heater")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views.map((view) => view.label)).toEqual(["容器本体", "交流设备端交流电负荷", "热能设备供水端双端热源"]);
    expect(views[2]).toMatchObject({
      kind: "associated",
      componentType: "HeatSource2",
      relationKeys: ["idx_heat2_unit_t2"],
      terminalIndexes: [1, 2]
    });
    expect(views[2].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: "1" }),
      expect.objectContaining({ key: "i_node", value: "2" }),
      expect.objectContaining({ key: "j_node", value: "3" })
    ]));
  });

  test("builds associated device parameter views for three-winding transformer branches", () => {
    const node = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }), {}).node;
    node.name = "T3";
    node.terminals[0].nodeNumber = "1";
    node.terminals[1].nodeNumber = "2";
    node.terminals[2].nodeNumber = "3";
    node.params.neutral_node = "4";
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    const views = buildContainerDeviceParameterViews(node, template);

    expect(views.map((view) => view.label)).toEqual(["容器本体", "交流设备端1双绕组主变首端", "交流设备端2双绕组主变首端", "交流设备端3双绕组主变首端"]);
    expect(views[1]).toMatchObject({
      kind: "associated",
      componentType: "ACTransformer",
      relationKeys: ["idx_xf_t1"],
      terminalIndexes: [0]
    });
    expect(views[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "idx", value: "1" }),
      expect.objectContaining({ key: "i_node", value: "1" }),
      expect.objectContaining({ key: "j_node", value: "4" })
    ]));
  });

  test("pairs the next terminal with a double-port container association", () => {
    const terminalTypes = ["heat", "heat", "heat", "heat"] as const;
    const terminalRoles = ["double-source", "single-load", "double-source", "single-load"] as const;
    const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, {
      isContainer: true,
      terminalRoles
    });

    expect(definitions.map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "idx_heat2_unit_t1",
      "idx_heat2_unit_t3"
    ]);

    const template: DeviceTemplate = {
      kind: "CustomDoubleContainer",
      label: "CustomDoubleContainer",
      attributeLibrary: "自定义属性库",
      size: { width: 104, height: 64 },
      params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", lineWidth: "0" },
      terminalType: "heat",
      terminalCount: terminalTypes.length,
      terminalTypes: [...terminalTypes],
      terminalRoles: [...terminalRoles],
      isContainer: true,
      custom: true,
      parameterDefinitions: definitions
    };
    const indexed = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 100, y: 100 }), {});

    expect(indexed.node.params.idx_heat2_unit_t1).toBe("1");
    expect(indexed.node.params.idx_heat2_unit_t2).toBeUndefined();
    expect(indexed.node.params.idx_heat2_unit_t3).toBe("2");
    expect(indexed.node.params.idx_heat2_unit_t4).toBeUndefined();
    expect(indexed.counters.HeatSource2).toBe(2);
  });

  test("rejects double-port container association on the last terminal", () => {
    const invalid = validateContainerTerminalRoles(["heat"], ["double-source"]);
    expect(invalid.valid).toBe(false);
    expect(invalid.message).toContain("最后一个端子");

    const validDependentLast = validateContainerTerminalRoles(["heat", "heat"], ["double-source", "double-load"]);
    expect(validDependentLast.valid).toBe(true);
  });

  test("marks built-in cross-energy devices as containers with clarified source-load associations", () => {
    const expected = [
      ["ac-fuel-cell", ["idx_ac_unit_t1", "idx_h2_load_t2"]],
      ["dc-fuel-cell", ["idx_dc_unit_t1", "idx_h2_load_t2"]],
      ["ac-electrolyzer", ["idx_ac_load_t1", "idx_h2_unit_t2"]],
      ["dc-electrolyzer", ["idx_dc_load_t1", "idx_h2_unit_t2"]],
      ["ac-heater", ["idx_ac_load_t1", "idx_heat_unit_t2"]],
      ["dc-heater", ["idx_dc_load_t1", "idx_heat_unit_t2"]],
      ["ac-two-port-heater", ["idx_ac_load_t1", "idx_heat2_unit_t2"]],
      ["dc-two-port-heater", ["idx_dc_load_t1", "idx_heat2_unit_t2"]],
      ["heat-boiler", ["idx_heat_unit_t1"]],
      ["two-port-heat-boiler", ["idx_heat2_unit_t1"]]
    ] as const;

    for (const [kind, relationKeys] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template?.isContainer).toBe(true);
      const definitions = getTemplateParameterDefinitions(template!);
      expect(definitions.map((definition) => definition.enName)).toEqual(expect.arrayContaining([...relationKeys]));
      expect(definitions.map((definition) => definition.enName)).not.toContain("is_container");
      expect(definitions.some((definition) => definition.enName === "node" || definition.enName.endsWith("_node"))).toBe(false);
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.params.is_container).toBe("1");
      for (const relationKey of relationKeys) {
        expect(node.params[relationKey]).toBe("");
      }
      expect(getEParameterKeys(kind, node.params)).toEqual(expect.arrayContaining(["idx", "name", "run_stat"]));
    }
  });

  test("allocates permanent idx values for container-associated child devices", () => {
    const electrolyzer = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });
    const indexedElectrolyzer = assignPermanentDeviceIndex(electrolyzer, {});
    expect(indexedElectrolyzer.node.params.idx).toBe("1");
    expect(indexedElectrolyzer.node.params.idx_ac_load_t1).toBe("1");
    expect(indexedElectrolyzer.node.params.idx_h2_unit_t2).toBe("1");
    expect(indexedElectrolyzer.counters).toMatchObject({
      "ac-electrolyzer": 1,
      ACLoad: 1,
      HydroSource: 1
    });

    const heater = createDefaultNode("ac-two-port-heater", { x: 100, y: 100 });
    const indexedHeater = assignPermanentDeviceIndex(heater, indexedElectrolyzer.counters);
    expect(indexedHeater.node.params.idx).toBe("1");
    expect(indexedHeater.node.params.idx_ac_load_t1).toBe("2");
    expect(indexedHeater.node.params.idx_heat2_unit_t2).toBe("1");
    expect(indexedHeater.node.params.idx_heat2_unit_t3).toBeUndefined();
    expect(indexedHeater.counters).toMatchObject({
      "ac-two-port-heater": 1,
      ACLoad: 2,
      HeatSource2: 1
    });

    const derived = deriveDeviceIndexCounters([indexedElectrolyzer.node, indexedHeater.node]);
    expect(derived).toMatchObject({
      "ac-electrolyzer": 1,
      "ac-two-port-heater": 1,
      ACLoad: 2,
      HydroSource: 1,
      HeatSource2: 1
    });

    const boiler = createDefaultNode("two-port-heat-boiler", { x: 100, y: 100 });
    const indexedBoiler = assignPermanentDeviceIndex(boiler, indexedHeater.counters);
    expect(indexedBoiler.node.params.idx_heat2_unit_t1).toBe("2");
    expect(indexedBoiler.node.params.idx_heat2_unit_t2).toBeUndefined();
    expect(indexedBoiler.counters.HeatSource2).toBe(2);
  });

  test("applies edited built-in template definitions when creating new nodes", () => {
    const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-line");
    expect(baseTemplate).toBeDefined();
    const template: DeviceTemplate = {
      ...baseTemplate!,
      params: { ...baseTemplate!.params, owner: "运维班" },
      parameterDefinitions: [
        {
          cnName: "巡视单位",
          enName: "owner",
          valueType: "enum",
          typicalValue: "运维班"
        }
      ]
    };

    const node = createNodeFromTemplate(template, { x: 100, y: 100 });

    expect(node.params.owner).toBe("运维班");
    expect(JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY])).toEqual(template.parameterDefinitions);
  });

  test("infers expected value types for built-in component definitions", () => {
    const definitionTypes = (kind: string) => {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toBeDefined();
      return Object.fromEntries(getTemplateParameterDefinitions(template!).map((definition) => [definition.enName, definition.valueType]));
    };

    expect(definitionTypes("ac-source")).toMatchObject({
      idx: "integer",
      node: "integer",
      p_set: "float",
      q_set: "float",
      v_set: "float"
    });
    expect(definitionTypes("dc-source")).toMatchObject({
      idx: "integer",
      node: "integer",
      p_set: "float",
      i_set: "float",
      v_set: "float"
    });
    expect(definitionTypes("ac-load")).toMatchObject({
      pbase: "float",
      qbase: "float",
      pv0: "float",
      pv1: "float",
      pv2: "float",
      qv0: "float",
      qv1: "float",
      qv2: "float"
    });
    expect(definitionTypes("ac-line")).toMatchObject({
      i_node: "integer",
      j_node: "integer",
      r: "float",
      x: "float",
      b: "float"
    });
    expect(definitionTypes("ac-transformer")).toMatchObject({
      gt: "float",
      bt: "float",
      r: "float",
      x: "float"
    });
    expect(definitionTypes("dcdc-converter")).toMatchObject({
      i_node: "integer",
      j_node: "integer",
      r1: "float",
      r2: "float",
      i_control_type: "enum",
      j_control_type: "enum"
    });
  });

  test("builds a two-level element tree and focus points for canvas elements", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const text = createDefaultNode("static-text", { x: 180, y: 180 });
    source.name = "电源A";
    load.name = "负荷A";
    text.name = "说明文字";
    const edge: Edge = {
      id: "edge-a",
      sourceId: source.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      manualPoints: [{ x: 180, y: 140 }]
    };

    const tree = buildElementTree([source, load, text], [edge]);

    expect(tree.map((group) => group.typeLabel)).toEqual(["交流电源", "交流负荷", "文字", "联络线"]);
    expect(tree.map((group) => group.typeEnglishLabel)).toEqual(["ACGenerator", "ACLoad", "StaticTextSymbol", "ConnectionLine"]);
    expect(tree.find((group) => group.typeLabel === "交流电源")?.items).toEqual([
      { kind: "node", id: source.id, name: "电源A", idx: "", editableDevice: true }
    ]);
    expect(tree.find((group) => group.typeLabel === "文字")?.items).toEqual([
      { kind: "node", id: text.id, name: "说明文字", idx: "", editableDevice: false }
    ]);
    expect(tree.find((group) => group.typeLabel === "联络线")?.items[0]).toMatchObject({
      kind: "edge",
      id: "edge-a",
      name: "电源A -> 负荷A"
    });
    const edgeFocusPoints = [getTerminalPoint(source, "t1"), ...edge.manualPoints!, getTerminalPoint(load, "t1")];
    const expectedEdgeFocus = {
      x: Math.round((Math.min(...edgeFocusPoints.map((point) => point.x)) + Math.max(...edgeFocusPoints.map((point) => point.x))) / 2),
      y: Math.round((Math.min(...edgeFocusPoints.map((point) => point.y)) + Math.max(...edgeFocusPoints.map((point) => point.y))) / 2)
    };
    expect(getElementFocusPoint({ kind: "node", id: text.id }, [source, load, text], [edge])).toEqual(text.position);
    expect(getElementFocusPoint({ kind: "edge", id: "edge-a" }, [source, load, text], [edge])).toEqual(expectedEdgeFocus);
  });

  test("colors connection lines by their connected terminal energy type", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 180 });
    const dcLoad = createDefaultNode("dc-load", { x: 240, y: 180 });
    const hydrogenSource = createDefaultNode("hydrogen-source", { x: 100, y: 260 });
    const hydrogenLoad = createDefaultNode("hydrogen-load", { x: 240, y: 260 });
    const heatSource = createDefaultNode("heat-source", { x: 100, y: 340 });
    const heatLoad = createDefaultNode("single-port-heat-load", { x: 240, y: 340 });
    const nodeById = new Map([acSource, acLoad, dcSource, dcLoad, hydrogenSource, hydrogenLoad, heatSource, heatLoad].map((node) => [node.id, node]));

    expect(getConnectionStrokeColor({ id: "ac", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#2563eb");
    expect(getConnectionStrokeColor({ id: "dc", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#0f766e");
    expect(getConnectionStrokeColor({ id: "h2", sourceId: hydrogenSource.id, targetId: hydrogenLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#7c3aed");
    expect(getConnectionStrokeColor({ id: "heat", sourceId: heatSource.id, targetId: heatLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById)).toBe("#dc2626");
    expect(getConnectionStrokeColor({ id: "floating", sourceId: "missing", targetId: "missing" }, nodeById)).toBe("#334155");
  });

  test("colors only AC and DC electric graphics by voltage level in voltage color mode", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 180 });
    const dcLoad = createDefaultNode("dc-load", { x: 240, y: 180 });
    const hydrogenSource = createDefaultNode("hydrogen-source", { x: 100, y: 260 });
    const hydrogenLoad = createDefaultNode("hydrogen-load", { x: 240, y: 260 });
    const heatSource = createDefaultNode("heat-source", { x: 100, y: 340 });
    const heatLoad = createDefaultNode("single-port-heat-load", { x: 240, y: 340 });
    acSource.terminals[0].vbase = "10";
    acLoad.terminals[0].vbase = "10";
    dcSource.terminals[0].vbase = "750";
    dcLoad.terminals[0].vbase = "750";
    hydrogenSource.terminals[0].vbase = "30";
    heatSource.terminals[0].vbase = "95";
    const nodeById = new Map([acSource, acLoad, dcSource, dcLoad, hydrogenSource, hydrogenLoad, heatSource, heatLoad].map((node) => [node.id, node]));

    expect(voltageLevelColor("10")).toBe("#f97316");
    expect(voltageLevelColor("750")).toBe("#0891b2");
    expect(getDeviceStrokeColor(acSource, "voltage")).toBe("#f97316");
    expect(getTerminalDisplayColor(acSource, acSource.terminals[0], "voltage")).toBe("#f97316");
    expect(getConnectionStrokeColor({ id: "ac", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#f97316");
    expect(getDeviceStrokeColor(dcSource, "voltage")).toBe("#0891b2");
    expect(getTerminalDisplayColor(dcSource, dcSource.terminals[0], "voltage")).toBe("#0891b2");
    expect(getConnectionStrokeColor({ id: "dc", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#0891b2");
    expect(getDeviceStrokeColor(hydrogenSource, "voltage")).toBe("#7c3aed");
    expect(getTerminalDisplayColor(hydrogenSource, hydrogenSource.terminals[0], "voltage")).toBe("#7c3aed");
    expect(getConnectionStrokeColor({ id: "h2", sourceId: hydrogenSource.id, targetId: hydrogenLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#7c3aed");
    expect(getDeviceStrokeColor(heatSource, "voltage")).toBe("#dc2626");
    expect(getTerminalDisplayColor(heatSource, heatSource.terminals[0], "voltage")).toBe("#dc2626");
    expect(getConnectionStrokeColor({ id: "heat", sourceId: heatSource.id, targetId: heatLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#dc2626");
  });

  test("uses configurable energy colors for terminals, devices, and connection lines", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 220, y: 100 });
    const hydrogenSource = createDefaultNode("hydrogen-source", { x: 340, y: 100 });
    const palette = {
      ...DEFAULT_COLOR_PALETTE,
      energy: {
        ...DEFAULT_COLOR_PALETTE.energy,
        ac: "#111111",
        dc: "#222222",
        h2: "#333333",
        heat: "#444444"
      }
    };
    const nodeById = new Map([acSource, dcSource, hydrogenSource].map((node) => [node.id, node]));

    expect(getTerminalDisplayColor(acSource, acSource.terminals[0], "energy", palette)).toBe("#111111");
    expect(getDeviceStrokeColor(dcSource, "energy", palette)).toBe("#222222");
    expect(getDeviceStrokeColor(hydrogenSource, "voltage", palette)).toBe("#333333");
    expect(getConnectionStrokeColor({ id: "ac", sourceId: acSource.id, targetId: dcSource.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "energy", palette)).toBe("#111111");
  });

  test("keys voltage colors by both AC/DC type and voltage base", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 220, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 200 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 200 });
    acSource.terminals[0].vbase = "10";
    acLoad.terminals[0].vbase = "10";
    dcSource.terminals[0].vbase = "10";
    dcLoad.terminals[0].vbase = "10";
    const palette = {
      ...DEFAULT_COLOR_PALETTE,
      voltage: {
        ...DEFAULT_COLOR_PALETTE.voltage,
        "ac:10": "#ff0000",
        "dc:10": "#00ff00"
      }
    };
    const nodeById = new Map([acSource, acLoad, dcSource, dcLoad].map((node) => [node.id, node]));

    expect(voltageLevelColor("10", "ac", palette)).toBe("#ff0000");
    expect(voltageLevelColor("10", "dc", palette)).toBe("#00ff00");
    expect(getTerminalDisplayColor(acSource, acSource.terminals[0], "voltage", palette)).toBe("#ff0000");
    expect(getTerminalDisplayColor(dcSource, dcSource.terminals[0], "voltage", palette)).toBe("#00ff00");
    expect(getDeviceStrokeColor(acSource, "voltage", palette)).toBe("#ff0000");
    expect(getDeviceStrokeColor(dcSource, "voltage", palette)).toBe("#00ff00");
    expect(getConnectionStrokeColor({ id: "ac", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage", palette)).toBe("#ff0000");
    expect(getConnectionStrokeColor({ id: "dc", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage", palette)).toBe("#00ff00");
  });

  test("validates equal voltage base on two-terminal conductive devices", () => {
    const branch = createDefaultNode("ac-line", { x: 100, y: 100 });
    branch.name = "线路1";
    branch.terminals[0].vbase = "10";
    branch.terminals[1].vbase = "35";
    const switchNode = createDefaultNode("ac-switch", { x: 220, y: 100 });
    switchNode.name = "开关1";
    switchNode.terminals[0].vbase = "110";
    switchNode.terminals[1].vbase = "110.0";
    const transformer = createDefaultNode("ac-transformer", { x: 340, y: 100 });
    transformer.name = "变压器1";
    transformer.terminals[0].vbase = "110";
    transformer.terminals[1].vbase = "10";

    const mismatches = validateTwoTerminalVoltageBaseConsistency([branch, switchNode, transformer]);

    expect(mismatches).toEqual([
      expect.objectContaining({
        nodeId: branch.id,
        nodeName: "线路1",
        section: "ACBranch",
        sourceVoltageBase: "10",
        targetVoltageBase: "35"
      })
    ]);
  });

  test("limits voltage base setting mode by electrical device type", () => {
    expect(voltageBaseSettingModeForNode(createDefaultNode("ac-transformer", { x: 100, y: 100 }))).toBe("terminal");
    expect(voltageBaseSettingModeForNode(createDefaultNode("ac-three-winding-transformer", { x: 220, y: 100 }))).toBe("terminal");
    expect(voltageBaseSettingModeForNode(createDefaultNode("dcdc-converter", { x: 340, y: 100 }))).toBe("terminal");
    expect(voltageBaseSettingModeForNode(createDefaultNode("acdc-converter", { x: 460, y: 100 }))).toBe("terminal");
    expect(voltageBaseSettingModeForNode(createDefaultNode("acac-converter", { x: 580, y: 100 }))).toBe("terminal");
    expect(voltageBaseSettingModeForNode(createDefaultNode("ac-line", { x: 100, y: 220 }))).toBe("uniform");
    expect(voltageBaseSettingModeForNode(createDefaultNode("ac-switch", { x: 220, y: 220 }))).toBe("uniform");
    expect(voltageBaseSettingModeForNode(createDefaultNode("ac-load", { x: 340, y: 220 }))).toBe("uniform");
  });

  test("shows associated container devices as child rows in the element tree", () => {
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    electrolyzer.name = "EL1";
    electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";

    const tree = buildElementTree([electrolyzer], [], DEVICE_LIBRARY);
    const item = tree.find((group) => group.typeLabel === "交流电制氢")?.items[0];

    expect(item).toMatchObject({
      kind: "node",
      id: electrolyzer.id,
      name: "EL1",
      idx: electrolyzer.params.idx,
      editableDevice: true
    });
    expect(item?.children).toEqual([
      expect.objectContaining({
        componentType: "ACLoad",
        idx: electrolyzer.params.idx_ac_load_t1,
        name: "自定义交流负荷",
        nameKey: "name_ac_load_t1",
        relationKeys: ["idx_ac_load_t1"],
        terminalLabels: "交流设备端"
      }),
      expect.objectContaining({
        componentType: "HydroSource",
        idx: electrolyzer.params.idx_h2_unit_t2,
        name: "EL1_氢能设备端氢源",
        nameKey: "name_h2_unit_t2",
        relationKeys: ["idx_h2_unit_t2"],
        terminalLabels: "氢能设备端"
      })
    ]);
  });

  test("omits retired disconnectors and DC transformer from the element library", () => {
    const retiredKinds = ["ac-disconnector", "dc-disconnector", "dc-transformer"];
    const libraryKinds = DEVICE_LIBRARY.map((item) => item.kind);
    const libraryLabels = DEVICE_LIBRARY.map((item) => item.label);

    for (const kind of retiredKinds) {
      expect(libraryKinds).not.toContain(kind);
    }
    expect(libraryLabels).not.toContain("交流刀闸");
    expect(libraryLabels).not.toContain("直流刀闸");
    expect(libraryLabels).not.toContain("直流主变");
    expect(libraryLabels).not.toContain("直流变压器");
  });

  test("uses distinct glyph variants for switches, breakers, and converter families", () => {
    expect(getDeviceGlyphVariant("ac-source")).toBe("ac-generator");
    expect(getDeviceGlyphVariant("dc-source")).toBe("dc-generator");
    expect(getDeviceGlyphVariant("ac-wind-source")).toBe("wind-source");
    expect(getDeviceGlyphVariant("dc-pv-source")).toBe("pv-source");

    expect(getDeviceGlyphVariant("ac-switch")).toBe("switch");
    expect(getDeviceGlyphVariant("dc-switch")).toBe("switch");
    expect(getDeviceGlyphVariant("ac-breaker")).toBe("breaker");
    expect(getDeviceGlyphVariant("dc-breaker")).toBe("breaker");
    expect(getDeviceGlyphVariant("ac-switch")).not.toBe(getDeviceGlyphVariant("ac-breaker"));

    const converterVariants = new Set([
      getDeviceGlyphVariant("dcdc-converter"),
      getDeviceGlyphVariant("acdc-converter"),
      getDeviceGlyphVariant("acac-converter")
    ]);
    expect(converterVariants).toEqual(new Set(["dcdc-converter", "acdc-converter", "acac-converter"]));
  });

  test("creates static drawing primitives without electrical terminals", () => {
    const expectedComponentTypes = {
      "static-text": "StaticTextSymbol",
      "static-line": "StaticConnectorSymbol",
      "static-polyline": "StaticConnectorSymbol",
      "static-circle": "StaticBasicShape",
      "static-ellipse": "StaticBasicShape",
      "static-rect": "StaticBasicShape",
      "static-image": "StaticMediaSymbol",
      "static-rounded-rect": "StaticFlowNode",
      "static-diamond": "StaticFlowNode",
      "static-pill": "StaticFlowNode",
      "static-database": "StaticFlowNode",
      "static-document": "StaticFlowNode",
      "static-note": "StaticFlowNode",
      "static-group-box": "StaticContainerSymbol",
      "static-swimlane": "StaticContainerSymbol",
      "static-point": "StaticBasicShape",
      "static-ring": "StaticBasicShape",
      "static-circle-node": "StaticFlowNode",
      "static-straight-connector": "StaticConnectorSymbol",
      "static-arrow-connector": "StaticConnectorSymbol",
      "static-double-arrow-connector": "StaticConnectorSymbol",
      "static-elbow-connector": "StaticConnectorSymbol",
      "static-hexagon": "StaticBasicShape",
      "static-parallelogram": "StaticBasicShape",
      "static-triangle": "StaticBasicShape",
      "static-callout": "StaticAnnotationSymbol",
      "static-default-node": "StaticFlowNode",
      "static-input-node": "StaticFlowNode",
      "static-output-node": "StaticFlowNode",
      "static-port-node": "StaticFlowNode",
      "static-card-node": "StaticFlowNode",
      "static-toolbar-node": "StaticFlowNode",
      "static-button": "StaticButton",
      "static-resizer-frame": "StaticContainerSymbol",
      "static-subflow-box": "StaticContainerSymbol",
      "static-bezier-connector": "StaticConnectorSymbol",
      "static-smoothstep-connector": "StaticConnectorSymbol",
      "static-self-loop": "StaticConnectorSymbol",
      "static-edge-label": "StaticAnnotationSymbol"
    } as const;
    const expected = Object.keys(expectedComponentTypes);
    const removedControlKinds = [
      "static-web",
      "static-date",
      "static-time",
      "static-datetime",
      "static-input"
    ];

    expect(new Set(Object.values(expectedComponentTypes))).toEqual(new Set([
      "StaticTextSymbol",
      "StaticMediaSymbol",
      "StaticBasicShape",
      "StaticFlowNode",
      "StaticButton",
      "StaticContainerSymbol",
      "StaticConnectorSymbol",
      "StaticAnnotationSymbol"
    ]));

    for (const kind of expected) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      const componentType = expectedComponentTypes[kind as keyof typeof expectedComponentTypes];
      expect(isStaticNode(node)).toBe(true);
      expect(node.terminals).toEqual([]);
      expect(node.params.component_type).toBe(componentType);
      expect(inferESection(kind, node.params)).toBe(componentType);
      expect(inferESection(kind, {})).toBe(componentType);
      expect(getEParameterKeys(kind, node.params)).toEqual([]);
      expect(node.params.fillColor).toBeDefined();
      expect(node.params.strokeColor).toBeDefined();
      if (isStaticButtonCapableKind(kind)) {
        expect(node.params.buttonEnabled).toBe(kind === "static-button" ? "1" : "0");
        expect(node.params.buttonActionType).toBe("none");
      } else {
        expect(node.params.buttonEnabled).toBeUndefined();
      }
    }

    expect(DEVICE_LIBRARY.filter((template) => removedControlKinds.includes(template.kind)).map((template) => template.kind)).toEqual([]);
    expect(DEVICE_LIBRARY.filter((template) => template.attributeLibrary === "静态图元").map((template) => template.kind)).toEqual([...expected]);

    const errors = validateTopology([createDefaultNode("static-text", { x: 100, y: 100 })], []);
    expect(errors).toEqual([]);
  });

  test("creates React-Flow-style static symbols with editable visual style defaults", () => {
    const expected = [
      ["static-rounded-rect", "圆角节点", "StaticFlowNode"],
      ["static-diamond", "判断节点", "StaticFlowNode"],
      ["static-pill", "起止节点", "StaticFlowNode"],
      ["static-database", "数据库", "StaticFlowNode"],
      ["static-document", "文档", "StaticFlowNode"],
      ["static-note", "便签", "StaticFlowNode"],
      ["static-group-box", "分组框", "StaticContainerSymbol"],
      ["static-swimlane", "泳道", "StaticContainerSymbol"],
      ["static-point", "连接点", "StaticBasicShape"],
      ["static-ring", "圆环点", "StaticBasicShape"],
      ["static-circle-node", "圆形节点", "StaticFlowNode"],
      ["static-straight-connector", "直线连接", "StaticConnectorSymbol"],
      ["static-arrow-connector", "箭头连接", "StaticConnectorSymbol"],
      ["static-double-arrow-connector", "双向箭头", "StaticConnectorSymbol"],
      ["static-elbow-connector", "折线连接", "StaticConnectorSymbol"],
      ["static-hexagon", "六边形", "StaticBasicShape"],
      ["static-parallelogram", "平行四边形", "StaticBasicShape"],
      ["static-triangle", "三角形", "StaticBasicShape"],
      ["static-callout", "标注气泡", "StaticAnnotationSymbol"],
      ["static-default-node", "默认节点", "StaticFlowNode"],
      ["static-input-node", "输入节点", "StaticFlowNode"],
      ["static-output-node", "输出节点", "StaticFlowNode"],
      ["static-port-node", "端口节点", "StaticFlowNode"],
      ["static-card-node", "卡片节点", "StaticFlowNode"],
      ["static-toolbar-node", "工具条节点", "StaticFlowNode"],
      ["static-button", "按钮", "StaticButton"],
      ["static-resizer-frame", "缩放框", "StaticContainerSymbol"],
      ["static-subflow-box", "子流程框", "StaticContainerSymbol"],
      ["static-bezier-connector", "贝塞尔连接", "StaticConnectorSymbol"],
      ["static-smoothstep-connector", "平滑折线", "StaticConnectorSymbol"],
      ["static-self-loop", "自环连接", "StaticConnectorSymbol"],
      ["static-edge-label", "边标签", "StaticAnnotationSymbol"]
    ] as const;

    for (const [kind, label, componentType] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template).toMatchObject({
        label,
        attributeLibrary: "静态图元",
        terminalCount: 0,
        terminalType: "ac",
        params: expect.objectContaining({
          component_type: componentType,
          text: expect.any(String),
          fillColor: expect.any(String),
          strokeColor: expect.any(String),
          textColor: expect.any(String),
          lineWidth: expect.any(String),
          strokeStyle: expect.any(String),
          cornerRadius: expect.any(String),
          accentColor: expect.any(String),
          shadowEnabled: expect.any(String),
          padding: expect.any(String),
          textAlign: expect.any(String),
          verticalAlign: expect.any(String),
          markerStart: expect.any(String),
          markerEnd: expect.any(String),
          arrowSize: expect.any(String),
          handleColor: expect.any(String),
          handleSize: expect.any(String)
        })
      });

      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(isStaticNode(node)).toBe(true);
      expect(node.terminals).toEqual([]);
      expect(inferESection(kind, node.params)).toBe(componentType);
      expect(getEParameterKeys(kind, node.params)).toEqual([]);
      expect(isStaticButtonCapableKind(kind)).toBe(!isStaticLineLikeKind(kind));
    }
  });

  test("creates saved static drawing geometry from canvas click points", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "static-polyline");
    expect(template).toBeDefined();

    const node = createInteractiveStaticDrawingNode(
      template!,
      [
        { x: 100, y: 80 },
        { x: 150, y: 80 },
        { x: 150, y: 130 }
      ],
      "layer-user"
    );

    expect(isInteractiveStaticDrawingKind("static-polyline")).toBe(true);
    expect(isInteractiveStaticDrawingKind("static-rect")).toBe(false);
    expect(node.kind).toBe("static-polyline");
    expect(node.layerId).toBe("layer-user");
    expect(node.position).toEqual({ x: 125, y: 105 });
    expect(node.size).toEqual({ width: 66, height: 66 });
    expect(node.params[STATIC_DRAW_POINTS_PARAM]).toBeDefined();
    expect(parseStaticDrawPoints(node.params[STATIC_DRAW_POINTS_PARAM])).toEqual([
      { x: -25, y: -25 },
      { x: 25, y: -25 },
      { x: 25, y: 25 }
    ]);
  });

  test("creates box-like static symbols from two rectangle corners", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "static-text");
    expect(template).toBeDefined();

    const node = createStaticBoxNodeFromDrawing(
      template!,
      [
        { x: 300, y: 200 },
        { x: 100, y: 120 }
      ],
      "layer-user"
    );

    expect(isStaticBoxLikeKind("static-text")).toBe(true);
    expect(isStaticBoxLikeKind("static-rect")).toBe(true);
    expect(isStaticBoxLikeKind("static-polyline")).toBe(false);
    expect(isStaticBoxLikeKind("static-point")).toBe(false);
    expect(node.kind).toBe("static-text");
    expect(node.layerId).toBe("layer-user");
    expect(node.position).toEqual({ x: 200, y: 160 });
    expect(node.size).toEqual({ width: 200, height: 80 });
    expect(node.params[STATIC_DRAW_POINTS_PARAM]).toBeUndefined();
  });

  test("lets static graphics opt in or out of connection route avoidance", () => {
    const edge: Edge = {
      id: "static-avoidance-edge",
      sourceId: "source",
      targetId: "target",
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const route = [
      { x: 100, y: 160 },
      { x: 320, y: 160 }
    ];
    const ordinaryStatic = {
      ...createDefaultNode("static-rect", { x: 200, y: 160 }),
      id: "ordinary-static",
      size: { width: 80, height: 80 }
    };
    const containerStatic = {
      ...createDefaultNode("static-group-box", { x: 200, y: 160 }),
      id: "container-static",
      size: { width: 80, height: 80 }
    };
    const ignoredOrdinaryStatic = {
      ...ordinaryStatic,
      id: "ignored-ordinary-static",
      params: { ...ordinaryStatic.params, [STATIC_ROUTE_AVOIDANCE_PARAM]: "0" }
    };
    const activeContainerStatic = {
      ...containerStatic,
      id: "active-container-static",
      params: { ...containerStatic.params, [STATIC_ROUTE_AVOIDANCE_PARAM]: "1" }
    };

    expect(ordinaryStatic.params[STATIC_ROUTE_AVOIDANCE_PARAM]).toBe("1");
    expect(containerStatic.params[STATIC_ROUTE_AVOIDANCE_PARAM]).toBe("0");
    expect(
      getRouteBlockingCandidateNodes(route, edge, [
        ordinaryStatic,
        containerStatic,
        ignoredOrdinaryStatic,
        activeContainerStatic
      ]).map((node) => node.id)
    ).toEqual(["ordinary-static", "active-container-static"]);
    expect(routeIntersectsSpecificNodes(route, edge, [ordinaryStatic])).toBe(true);
    expect(routeIntersectsSpecificNodes(route, edge, [ignoredOrdinaryStatic])).toBe(false);
    expect(routeIntersectsSpecificNodes(route, edge, [containerStatic])).toBe(false);
    expect(routeIntersectsSpecificNodes(route, edge, [activeContainerStatic])).toBe(true);
  });

  test("adds run_stat operating status to every device type", () => {
    for (const template of DEVICE_LIBRARY.filter((item) => !item.kind.startsWith("static-"))) {
      const node = createDefaultNode(template.kind, { x: 100, y: 100 });
      expect(node.params.run_stat).toBe("运行");
    }
  });

  test("adds voltage base parameters to devices, transformers, and converters", () => {
    expect(createDefaultNode("ac-load", { x: 100, y: 100 }).params.vbase).toBe("0");
    const twoWinding = createDefaultNode("ac-transformer", { x: 200, y: 100 });
    expect(twoWinding.params.highVbase).toBe("0");
    expect(twoWinding.params.lowVbase).toBe("0");
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });
    expect(threeWinding.params.highVbase).toBe("0");
    expect(threeWinding.params.mediumVbase).toBe("0");
    expect(threeWinding.params.lowVbase).toBe("0");
    const converter = createDefaultNode("acdc-converter", { x: 400, y: 100 });
    expect(converter.params.sourceVbase).toBe("0");
    expect(converter.params.targetVbase).toBe("0");
    expect(converter.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
    expect(converter.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
  });

  test("keeps ACDC converter terminal 1 as AC and terminal 2 as DC for connection rules and legacy nodes", () => {
    const converter = createDefaultNode("acdc-converter", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 220, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 340, y: 100 });

    expect(canConnectTerminals(converter, "t1", acLoad, "t1")).toBe(true);
    expect(canConnectTerminals(converter, "t2", dcLoad, "t1")).toBe(true);
    expect(canConnectTerminals(converter, "t1", dcLoad, "t1")).toBe(false);
    expect(canConnectTerminals(converter, "t2", acLoad, "t1")).toBe(false);

    const legacyConverter: ModelNode = {
      ...converter,
      terminals: converter.terminals.map((terminal) => ({ ...terminal, type: "ac", vbase: "10 kV" }))
    };
    const normalized = normalizeNodeTerminalsByTemplate(legacyConverter);
    expect(normalized.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
    expect(normalized.terminals.map((terminal) => terminal.vbase)).toEqual(["10 kV", "0"]);
  });

  test("exports DCDC converter endpoint control types with supported values", () => {
    const defaultConverter = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
    const legacyConverter = createDefaultNode("dcdc-converter", { x: 240, y: 100 });
    const invalidConverter = createDefaultNode("dcdc-converter", { x: 380, y: 100 });
    defaultConverter.params.i_control_type = "CTRL_V";
    defaultConverter.params.j_control_type = "CTRL_I";
    legacyConverter.params.i_control_type = "";
    legacyConverter.params.j_control_type = "";
    legacyConverter.params.sourceControlType = "定P";
    legacyConverter.params.targetControlType = "不定";
    invalidConverter.params.i_control_type = "BAD";
    invalidConverter.params.j_control_type = "V";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "DCDC控制类型测试",
      nodes: [defaultConverter, legacyConverter, invalidConverter],
      edges: []
    }));

    expect(payload.DCDCConverter.columns).toContain("i_control_type");
    expect(payload.DCDCConverter.columns).toContain("j_control_type");
    expect(payload.DCDCConverter.columns).not.toContain("control_type");
    expect(payload.DCDCConverter.rows.map((row) => row.i_control_type)).toEqual(["CTRL_V", "CTRL_P", "SLACK"]);
    expect(payload.DCDCConverter.rows.map((row) => row.j_control_type)).toEqual(["CTRL_I", "SLACK", "CTRL_V"]);
  });

  test("exports AC generator control_type with only PV PQ PH values", () => {
    const voltageControlledGenerator = createDefaultNode("ac-source", { x: 100, y: 100 });
    const powerControlledGenerator = createDefaultNode("ac-source", { x: 240, y: 100 });
    const phaseControlledGenerator = createDefaultNode("ac-source", { x: 380, y: 100 });
    const invalidGenerator = createDefaultNode("ac-source", { x: 520, y: 100 });
    voltageControlledGenerator.params.control_type = "PV";
    powerControlledGenerator.params.control_type = "定PQ";
    phaseControlledGenerator.params.control_type = "PH";
    invalidGenerator.params.control_type = "P";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "交流电源控制类型测试",
      nodes: [voltageControlledGenerator, powerControlledGenerator, phaseControlledGenerator, invalidGenerator],
      edges: []
    }));
    const values = payload.ACGenerator.rows.map((row) => row.control_type);

    expect(values).toEqual(["PV", "PQ", "PH", "PV"]);
    expect(values.every((value) => (AC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("exports DC generator control_type with only P V I values", () => {
    const powerControlledGenerator = createDefaultNode("dc-source", { x: 100, y: 100 });
    const voltageControlledGenerator = createDefaultNode("dc-source", { x: 240, y: 100 });
    const currentControlledGenerator = createDefaultNode("dc-source", { x: 380, y: 100 });
    const invalidGenerator = createDefaultNode("dc-source", { x: 520, y: 100 });
    powerControlledGenerator.params.control_type = "P";
    voltageControlledGenerator.params.control_type = "定V";
    currentControlledGenerator.params.control_type = "I";
    invalidGenerator.params.control_type = "PQ";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "直流电源控制类型测试",
      nodes: [powerControlledGenerator, voltageControlledGenerator, currentControlledGenerator, invalidGenerator],
      edges: []
    }));
    const values = payload.DCGenerator.rows.map((row) => row.control_type);

    expect(values).toEqual(["P", "V", "I", "P"]);
    expect(values.every((value) => (DC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("exports DCAC converter control_type with only supported values", () => {
    const defaultConverter = createDefaultNode("acdc-converter", { x: 100, y: 100 });
    const invalidConverter = createDefaultNode("acdc-converter", { x: 240, y: 100 });
    const acVoltageConverter = createDefaultNode("acdc-converter", { x: 380, y: 100 });
    defaultConverter.params.control_type = "DCV";
    invalidConverter.params.control_type = "PQ";
    invalidConverter.params.acControlType = "定PQ";
    acVoltageConverter.params.control_type = "ACV";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "DCAC控制类型测试",
      nodes: [defaultConverter, invalidConverter, acVoltageConverter],
      edges: []
    }));
    const values = payload.DCACConverter.rows.map((row) => row.control_type);

    expect(values).toEqual(["DCV", "ACP", "ACV"]);
    expect(values.every((value) => (DCAC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("exports ACAC converter control_type with only supported values", () => {
    const defaultConverter = createDefaultNode("acac-converter", { x: 100, y: 100 });
    const sourceVoltageConverter = createDefaultNode("acac-converter", { x: 240, y: 100 });
    const targetVoltageConverter = createDefaultNode("acac-converter", { x: 380, y: 100 });
    const bothVoltageConverter = createDefaultNode("acac-converter", { x: 520, y: 100 });
    defaultConverter.params.control_type = "PQQ";
    sourceVoltageConverter.params.control_type = "PQ";
    sourceVoltageConverter.params.sourceControlType = "定PV";
    targetVoltageConverter.params.control_type = "PQ";
    targetVoltageConverter.params.targetControlType = "定PV";
    bothVoltageConverter.params.control_type = "PVV";

    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: "ACAC控制类型测试",
      nodes: [defaultConverter, sourceVoltageConverter, targetVoltageConverter, bothVoltageConverter],
      edges: []
    }));
    const values = payload.ACACConverter.rows.map((row) => row.control_type);

    expect(values).toEqual(["PQQ", "PVQ", "PQV", "PVV"]);
    expect(values.every((value) => (ACAC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(value))).toBe(true);
  });

  test("removes the explicit two-winding transformer glyph and keeps the three-winding container definition", () => {
    const acTransformer = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer");
    const twoWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-winding-transformer");
    const threeWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer");

    expect(acTransformer?.label).toBe("双绕组主变");
    expect(twoWinding).toBeUndefined();
    expect(threeWinding?.terminalType).toBe("ac");
    expect(threeWinding?.terminalCount).toBe(3);
    expect(threeWinding?.isContainer).toBe(true);
    expect(getTemplateParameterDefinitions(threeWinding!).map((definition) => definition.enName)).toEqual([
      "idx",
      "name",
      "run_stat",
      "idx_xf_t1",
      "idx_xf_t2",
      "idx_xf_t3"
    ]);
    expect(getEParameterKeys("ac-three-winding-transformer", createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }).params)).toEqual([]);
  });

  test("renders crossing connection lines with local arc transitions", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const edges: Edge[] = [
      { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
      { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" }
    ];

    const routes = routeEdgesForRendering([left, right, top, bottom], edges);

    expect(routes[0].path).not.toContain("Q");
    expect(routes[1].path).toContain("Q");
  });

  test("always renders crossing arcs on vertical connection segments regardless of edge order", () => {
    const edges: Edge[] = [
      {
        id: "vertical",
        sourceId: "vertical-source",
        targetId: "vertical-target",
        sourcePoint: { x: 300, y: 80 },
        targetPoint: { x: 300, y: 400 }
      },
      {
        id: "horizontal",
        sourceId: "horizontal-source",
        targetId: "horizontal-target",
        sourcePoint: { x: 100, y: 240 },
        targetPoint: { x: 500, y: 240 }
      }
    ];

    const routes = routeEdgesForStoredRendering([], edges, { width: 700, height: 520 });

    expect(routes.find((route) => route.edgeId === "vertical")?.path).toContain("Q");
    expect(routes.find((route) => route.edgeId === "horizontal")?.path).not.toContain("Q");
  });

  test("can skip crossing arc refresh on the saved-path startup render", () => {
    const edges: Edge[] = [
      {
        id: "vertical",
        sourceId: "vertical-source",
        targetId: "vertical-target",
        sourcePoint: { x: 300, y: 80 },
        targetPoint: { x: 300, y: 400 }
      },
      {
        id: "horizontal",
        sourceId: "horizontal-source",
        targetId: "horizontal-target",
        sourcePoint: { x: 100, y: 240 },
        targetPoint: { x: 500, y: 240 }
      }
    ];

    const refreshedRoutes = routeEdgesForSavedPathRendering([], edges, { width: 700, height: 520 });
    const startupRoutes = routeEdgesForSavedPathRendering([], edges, { width: 700, height: 520 }, {
      refreshCrossingArcs: false
    });

    expect(refreshedRoutes.find((route) => route.edgeId === "vertical")?.path).toContain("Q");
    expect(startupRoutes.find((route) => route.edgeId === "vertical")?.path).not.toContain("Q");
    expect(startupRoutes.find((route) => route.edgeId === "horizontal")?.path).not.toContain("Q");
  });

  test("opens complete saved route points directly without scanning nodes", () => {
    const nodes = [] as ModelNode[];
    nodes.map = () => {
      throw new Error("node scan should be skipped when every edge has complete saved route points");
    };
    const edge: Edge = {
      id: "saved-direct-route",
      sourceId: "source",
      targetId: "target",
      routePoints: [
        { x: 40, y: 60 },
        { x: 160, y: 60 },
        { x: 160, y: 240 }
      ]
    };

    const routes = routeEdgesForSavedPathRendering(nodes, [edge], { width: 400, height: 300 }, {
      refreshCrossingArcs: false
    });

    expect(routes).toEqual([{
      edgeId: edge.id,
      points: edge.routePoints,
      path: "M 40 60 L 160 60 L 160 240"
    }]);
    expect(routes[0].points).toBe(edge.routePoints);
  });

  test("only copies saved route points on open when canvas bounds would change them", () => {
    const reusableEdge: Edge = {
      id: "inside-saved-direct-route",
      sourceId: "source",
      targetId: "target",
      routePoints: [
        { x: 40, y: 60 },
        { x: 160, y: 60 }
      ]
    };
    const clampedEdge: Edge = {
      id: "clamped-saved-direct-route",
      sourceId: "source",
      targetId: "target",
      routePoints: [
        { x: -4, y: 60.4 },
        { x: 460, y: 340 }
      ]
    };

    const reusableRoute = routeEdgesForSavedPathRendering([], [reusableEdge], { width: 400, height: 300 }, {
      refreshCrossingArcs: false
    })[0];
    const clampedRoute = routeEdgesForSavedPathRendering([], [clampedEdge], { width: 400, height: 300 }, {
      refreshCrossingArcs: false
    })[0];

    expect(reusableRoute.points).toBe(reusableEdge.routePoints);
    expect(clampedRoute.points).not.toBe(clampedEdge.routePoints);
    expect(clampedRoute.points).toEqual([
      { x: 0, y: 60 },
      { x: 400, y: 300 }
    ]);
  });

  test("renders vertical crossing arcs near ordinary bend points", () => {
    const edges: Edge[] = [
      {
        id: "vertical-bent",
        sourceId: "vertical-source",
        targetId: "vertical-target",
        sourcePoint: { x: 300, y: 100 },
        targetPoint: { x: 340, y: 400 },
        manualPoints: [
          { x: 300, y: 241 },
          { x: 340, y: 241 }
        ]
      },
      {
        id: "horizontal",
        sourceId: "horizontal-source",
        targetId: "horizontal-target",
        sourcePoint: { x: 100, y: 240 },
        targetPoint: { x: 500, y: 240 }
      }
    ];

    const routes = routeEdgesForStoredRendering([], edges, { width: 700, height: 520 });

    expect(routes.find((route) => route.edgeId === "vertical-bent")?.path).toContain("Q");
    expect(routes.find((route) => route.edgeId === "horizontal")?.path).not.toContain("Q");
  });

  test("does not render crossing arcs near connection terminals", () => {
    const edges: Edge[] = [
      {
        id: "vertical",
        sourceId: "vertical-source",
        targetId: "vertical-target",
        sourcePoint: { x: 300, y: 80 },
        targetPoint: { x: 300, y: 400 }
      },
      {
        id: "terminal-near-horizontal",
        sourceId: "horizontal-source",
        targetId: "horizontal-target",
        sourcePoint: { x: 100, y: 62 },
        targetPoint: { x: 500, y: 62 }
      }
    ];

    const routes = routeEdgesForStoredRendering([], edges, { width: 700, height: 520 });

    expect(routes.find((route) => route.edgeId === "vertical")?.path).not.toContain("Q");
    expect(routes.find((route) => route.edgeId === "terminal-near-horizontal")?.path).not.toContain("Q");
  });

  test("updates crossing arc paths when a different connection line moves", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const edges: Edge[] = [
      { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
      { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" }
    ];
    const previousRoutes = routeEdgesForRendering([left, right, top, bottom], edges);
    expect(previousRoutes.find((route) => route.edgeId === "vertical")?.path).toContain("Q");

    const movedLeft = { ...left, position: { ...left.position, y: 470 } };
    const movedRight = { ...right, position: { ...right.position, y: 470 } };
    const nextRoutes = routeEdgesForIncrementalRendering(
      [movedLeft, movedRight, top, bottom],
      edges,
      new Set(["horizontal"]),
      { width: 700, height: 520 },
      previousRoutes
    );

    expect(nextRoutes.find((route) => route.edgeId === "vertical")?.path).not.toContain("Q");
  });

  test("manages saved drawing model records", () => {
    const project = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      nodes: [createDefaultNode("ac-bus", { x: 100, y: 100 })],
      edges: []
    });

    const saved = upsertSavedProject([], project);
    expect(saved).toHaveLength(1);

    const renamed = renameSavedProject(saved, project.id, "模型B");
    expect(renamed[0].name).toBe("模型B");
    expect(renamed[0].project.name).toBe("模型B");

    const copied = duplicateSavedProject(renamed, project.id);
    expect(copied).toHaveLength(2);
    expect(copied[1].name).toBe("模型B 副本");
    expect(copied[1].id).not.toBe(project.id);

    const deleted = deleteSavedProject(copied, project.id);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].name).toBe("模型B 副本");
  });

  test("merges duplicate project names instead of creating hidden same-name records", () => {
    const first = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      canvasWidth: 1200,
      nodes: [],
      edges: []
    });
    const second = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      canvasWidth: 1800,
      nodes: [],
      edges: []
    });

    const saved = upsertSavedProject(upsertSavedProject([], first), second);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(first.id);
    expect(saved[0].name).toBe("模型A");
    expect(saved[0].project.name).toBe("模型A");
    expect(saved[0].project.canvasWidth).toBe(1800);

    const other = createSavedProject("模型B", { version: 1, name: "模型B", nodes: [], edges: [] });
    const renamed = renameSavedProject([...saved, other], other.id, "模型A");
    expect(renamed.map((project) => project.name)).toEqual(["模型A", "模型B"]);
  });

  test("normalizes duplicate saved project base names by keeping the latest backend record", () => {
    const records = [
      { ...createSavedProject("模型A", { version: 1, name: "模型A", canvasWidth: 1000, nodes: [], edges: [] }), id: "project-a", updatedAt: "2026-06-01T00:00:00.000Z" },
      { ...createSavedProject("模型A (2)", { version: 1, name: "模型A (2)", canvasWidth: 1200, nodes: [], edges: [] }), id: "project-a2", updatedAt: "2026-06-02T00:00:00.000Z" },
      { ...createSavedProject("模型A", { version: 1, name: "模型A", canvasWidth: 1400, nodes: [], edges: [] }), id: "project-b", updatedAt: "2026-06-03T00:00:00.000Z" },
      { ...createSavedProject("模型A", { version: 1, name: "模型A", canvasWidth: 1600, nodes: [], edges: [] }), id: "project-c", updatedAt: "2026-06-04T00:00:00.000Z" }
    ];

    const normalized = normalizeSavedProjectRecordNames(records);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe("project-c");
    expect(normalized[0].name).toBe("模型A");
    expect(normalized[0].project.name).toBe("模型A");
    expect(normalized[0].project.canvasWidth).toBe(1600);
  });

  test("rejects duplicate scheme names and renames moved projects on conflict", () => {
    const sourceProject = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const targetProject = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const firstScheme = createSavedScheme("方案A", [sourceProject]);
    const secondScheme = createSavedScheme("方案B", upsertSavedProject([], targetProject));
    const renamedSchemes = renameSavedScheme([firstScheme, secondScheme], secondScheme.id, "方案A");

    expect(renamedSchemes.map((scheme) => scheme.name)).toEqual(["方案A", "方案B"]);

    const moved = moveProjectToScheme([firstScheme, secondScheme], sourceProject.id, secondScheme.id);
    const target = moved.find((scheme) => scheme.id === secondScheme.id);
    expect(target?.projects.map((project) => project.name)).toEqual(["模型A"]);
  });

  test("manages nested saved schemes as a recursive tree", () => {
    const nestedProject = createSavedProject("子模型", { version: 1, name: "子模型", nodes: [], edges: [] });
    const root = createSavedScheme("父方案");
    const child = createSavedScheme("子方案", [nestedProject]);
    const tree = insertChildSavedScheme([root], root.id, child);

    expect(findSavedSchemeById(tree, child.id)?.name).toBe("子方案");
    expect(flattenSavedSchemes(tree).map((scheme) => scheme.name)).toEqual(["父方案", "子方案"]);
    expect(flattenSavedProjects(tree).map((project) => project.name)).toEqual(["子模型"]);

    const renamed = renameSavedScheme(tree, child.id, "子方案重命名");
    expect(findSavedSchemeById(renamed, child.id)?.name).toBe("子方案重命名");

    const deleted = deleteSavedScheme(renamed, child.id);
    expect(findSavedSchemeById(deleted, child.id)).toBeUndefined();
    expect(deleted[0].children).toEqual([]);
  });

  test("moves saved projects into nested schemes", () => {
    const project = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const root = createSavedScheme("父方案", [project]);
    const child = createSavedScheme("子方案");
    const tree = insertChildSavedScheme([root], root.id, child);

    const moved = moveProjectToScheme(tree, project.id, child.id);

    expect(findSavedSchemeById(moved, root.id)?.projects).toEqual([]);
    expect(findSavedSchemeById(moved, child.id)?.projects.map((item) => item.name)).toEqual(["模型A"]);
  });

  test("builds saved project options with full nested scheme paths", () => {
    const rootProject = createSavedProject("根模型", { version: 1, name: "根模型", nodes: [], edges: [] });
    const childProject = createSavedProject("子模型", { version: 1, name: "子模型", nodes: [], edges: [] });
    const grandChildProject = createSavedProject("孙模型", { version: 1, name: "孙模型", nodes: [], edges: [] });
    const grandChild = createSavedScheme("孙方案", [grandChildProject]);
    const child = createSavedScheme("子方案", [childProject], [grandChild]);
    const root = createSavedScheme("父方案", [rootProject], [child]);

    const options = savedProjectPathOptions([root], rootProject.id);

    expect(options.map((option) => option.label)).toEqual([
      "父方案 / 子方案 / 子模型",
      "父方案 / 子方案 / 孙方案 / 孙模型"
    ]);
    expect(options.map((option) => option.schemePath)).toEqual([
      ["父方案", "子方案"],
      ["父方案", "子方案", "孙方案"]
    ]);
    expect(options.map((option) => option.project.id)).toEqual([childProject.id, grandChildProject.id]);
  });

  test("moves saved schemes under another scheme without allowing cycles", () => {
    const first = createSavedScheme("方案A", [
      createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] })
    ]);
    const second = createSavedScheme("方案B");
    const child = createSavedScheme("子方案");
    const tree = insertChildSavedScheme([first, second], first.id, child);

    const moved = moveSavedSchemeToParent(tree, first.id, second.id);

    expect(moved.map((scheme) => scheme.name)).toEqual(["方案B"]);
    expect(findSavedSchemeById(moved, second.id)?.children?.map((scheme) => scheme.name)).toEqual(["方案A"]);
    expect(findSavedSchemeById(moved, first.id)?.projects.map((project) => project.name)).toEqual(["模型A"]);
    expect(findSavedSchemeById(moved, first.id)?.children?.map((scheme) => scheme.name)).toEqual(["子方案"]);

    const cycleAttempt = moveSavedSchemeToParent(tree, first.id, child.id);

    expect(cycleAttempt).toBe(tree);
  });

  test("moves saved schemes with explicit rename or overwrite conflict handling", () => {
    const source = createSavedScheme("同名方案", [
      createSavedProject("源模型", { version: 1, name: "源模型", nodes: [], edges: [] })
    ]);
    const duplicate = createSavedScheme("同名方案", [
      createSavedProject("旧模型", { version: 1, name: "旧模型", nodes: [], edges: [] })
    ]);
    const target = createSavedScheme("目标方案", [], [duplicate]);
    const tree = [source, target];

    const renamed = moveSavedSchemeToParent(tree, source.id, target.id, { targetName: "同名方案 新" });

    expect(findSavedSchemeById(renamed, target.id)?.children?.map((scheme) => scheme.name)).toEqual(["同名方案", "同名方案 新"]);
    expect(findSavedSchemeById(renamed, source.id)?.projects.map((project) => project.name)).toEqual(["源模型"]);

    const overwritten = moveSavedSchemeToParent(tree, source.id, target.id, {
      targetName: duplicate.name,
      overwriteSchemeId: duplicate.id
    });

    expect(findSavedSchemeById(overwritten, target.id)?.children?.map((scheme) => scheme.name)).toEqual(["同名方案"]);
    expect(findSavedSchemeById(overwritten, duplicate.id)).toBeUndefined();
    expect(findSavedSchemeById(overwritten, source.id)?.projects.map((project) => project.name)).toEqual(["源模型"]);
  });

  test("uses scheme and model names as runtime keys while stripping ids from persisted records", () => {
    const legacyProject = {
      ...createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] }),
      id: "project-legacy"
    };
    const legacyChild = {
      ...createSavedScheme("子方案", [legacyProject]),
      id: "scheme-child-legacy"
    };
    const legacyRoot = {
      ...createSavedScheme("父方案", [], [legacyChild]),
      id: "scheme-root-legacy"
    };

    const hydrated = hydrateSavedSchemeRuntimeIds([legacyRoot]);

    expect(hydrated[0].id).not.toBe("scheme-root-legacy");
    expect(hydrated[0].children?.[0]?.id).not.toBe("scheme-child-legacy");
    expect(hydrated[0].children?.[0]?.projects[0]?.id).not.toBe("project-legacy");
    expect(hydrated[0].id).toContain(encodeURIComponent("父方案"));
    expect(hydrated[0].children?.[0]?.projects[0]?.id).toContain(encodeURIComponent("模型A"));

    const persisted = stripSavedSchemeRuntimeIds(hydrated);
    const persistedText = JSON.stringify(persisted);

    expect(persisted[0]).not.toHaveProperty("id");
    expect(persisted[0].children?.[0]).not.toHaveProperty("id");
    expect(persisted[0].children?.[0]?.projects[0]).not.toHaveProperty("id");
    expect(persistedText).not.toContain("scheme-root-legacy");
    expect(persistedText).not.toContain("scheme-child-legacy");
    expect(persistedText).not.toContain("project-legacy");
  });

  test("copies saved project and scheme records with automatic unique names", () => {
    const project = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const copiedProject = copySavedProjectWithUniqueName(project, ["模型A", "模型A 副本"]);

    expect(copiedProject.name).toBe("模型A 副本 (2)");
    expect(copiedProject.project.name).toBe("模型A 副本 (2)");

    const scheme = createSavedScheme("方案A", [
      createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] }),
      createSavedProject("模型A 副本", { version: 1, name: "模型A 副本", nodes: [], edges: [] })
    ]);
    const copiedScheme = copySavedSchemeWithUniqueName(scheme, ["方案A", "方案A 副本"]);

    expect(copiedScheme.name).toBe("方案A 副本 (2)");
    expect(copiedScheme.projects.map((item) => item.name)).toEqual(["模型A 副本", "模型A 副本 副本"]);

    const childScheme = createSavedScheme("子方案", [
      createSavedProject("子模型", { version: 1, name: "子模型", nodes: [], edges: [] })
    ]);
    const nestedScheme = createSavedScheme("父方案", [], [childScheme]);
    const copiedNestedScheme = copySavedSchemeWithUniqueName(nestedScheme, ["父方案"]);

    expect(copiedNestedScheme.children?.map((item) => item.name)).toEqual(["子方案"]);
    expect(copiedNestedScheme.children?.[0]?.projects.map((item) => item.name)).toEqual(["子模型 副本"]);
  });

  test("deletes selected devices and automatically removes their connected lines", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 240, y: 100 }),
      createDefaultNode("ac-load", { x: 380, y: 100 })
    ];
    const edges: Edge[] = [
      { id: "e1", sourceId: nodes[0].id, targetId: nodes[1].id },
      { id: "e2", sourceId: nodes[1].id, targetId: nodes[2].id }
    ];

    const result = deleteNodesWithConnectedEdges(nodes, edges, [nodes[1].id]);

    expect(result.nodes.map((node) => node.id)).toEqual([nodes[0].id, nodes[2].id]);
    expect(result.edges).toEqual([]);
  });

  test("calculates terminal topology node numbers by contracting connection lines and buses", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 240, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 380, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 520, y: 100 });
    const edges: Edge[] = [
      { id: "ac", sourceId: acSource.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "dc", sourceId: dcBus.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const calculated = calculateElectricalTopology([acSource, acBus, dcBus, dcLoad], edges);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acSource.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acBus.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acSource.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(acBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
    expect(byId.get(dcBus.id)?.dcTopologyNode).toBe(1);
    expect(byId.get(dcLoad.id)?.dcTopologyNode).toBe(1);
    expect(byId.get(dcLoad.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(dcLoad.id)?.acTopologyNode).toBe(0);
  });

  test("contracts overlapping same-type device terminals into one topology node", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const sourceTerminalPoint = getTerminalPoint(source, "t1");
    const loadTerminalPoint = getTerminalPoint(load, "t1");
    load.position = {
      x: load.position.x + sourceTerminalPoint.x - loadTerminalPoint.x,
      y: load.position.y + sourceTerminalPoint.y - loadTerminalPoint.y
    };

    const calculated = calculateElectricalTopology([source, load], []);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(getTerminalPoint(source, "t1")).toEqual(getTerminalPoint(load, "t1"));
    expect(byId.get(source.id)?.terminals[0].nodeNumber).toBe(byId.get(load.id)?.terminals[0].nodeNumber);
    expect(byId.get(source.id)?.acTopologyNode).toBe(1);
    expect(byId.get(load.id)?.acTopologyNode).toBe(1);
  });

  test("reports same-type overlapping device terminals for special canvas styling", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 420, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    const loadPoint = getTerminalPoint(load, "t1");
    const dcPoint = getTerminalPoint(dcLoad, "t1");
    load.position = { x: load.position.x + sourcePoint.x - loadPoint.x, y: load.position.y + sourcePoint.y - loadPoint.y };
    dcLoad.position = { x: dcLoad.position.x + sourcePoint.x - dcPoint.x, y: dcLoad.position.y + sourcePoint.y - dcPoint.y };

    const groups = getOverlappingTerminalGroups([source, load, dcLoad]);

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("ac");
    expect(groups[0].terminals.map((terminal) => terminal.nodeId).sort()).toEqual([load.id, source.id].sort());
  });

  test("filters overlapping terminal groups to affected moved nodes when requested", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const otherSource = createDefaultNode("ac-source", { x: 500, y: 100 });
    const otherLoad = createDefaultNode("ac-load", { x: 660, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    const loadPoint = getTerminalPoint(load, "t1");
    const otherSourcePoint = getTerminalPoint(otherSource, "t1");
    const otherLoadPoint = getTerminalPoint(otherLoad, "t1");
    load.position = { x: load.position.x + sourcePoint.x - loadPoint.x, y: load.position.y + sourcePoint.y - loadPoint.y };
    otherLoad.position = {
      x: otherLoad.position.x + otherSourcePoint.x - otherLoadPoint.x,
      y: otherLoad.position.y + otherSourcePoint.y - otherLoadPoint.y
    };

    const groups = getOverlappingTerminalGroups([source, load, otherSource, otherLoad], new Set([source.id]));

    expect(groups).toHaveLength(1);
    expect(groups[0].terminals.map((terminal) => terminal.nodeId).sort()).toEqual([load.id, source.id].sort());
  });

  test("adds an explicit same-type connection when previously overlapping terminals are moved apart", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    const loadPoint = getTerminalPoint(load, "t1");
    load.position = { x: load.position.x + sourcePoint.x - loadPoint.x, y: load.position.y + sourcePoint.y - loadPoint.y };
    const nextLoad = { ...load, position: { x: load.position.x + 120, y: load.position.y } };

    const result = reconcileOverlappingTerminalConnections(
      [source, load],
      [source, nextLoad],
      [],
      () => "auto-edge"
    );

    expect(result.addedEdgeIds).toEqual(["auto-edge"]);
    expect(result.removedEdgeIds).toEqual([]);
    expect(result.edges).toEqual([
      expect.objectContaining({
        id: "auto-edge",
        sourceId: source.id,
        targetId: nextLoad.id,
        sourceTerminalId: "t1",
        targetTerminalId: "t1"
      })
    ]);
  });

  test("does not add ordinary connections when routable line-like device endpoints separate from moved devices", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
    const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "source-node" };
    const target = { ...createDefaultNode("ac-load", { x: 460, y: 120 }), id: "target-node" };
    const line = createRoutableLineDeviceFromEndpoints(
      template!,
      getTerminalPoint(source, "t1"),
      getTerminalPoint(target, "t1"),
      "layer-a",
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(target, "t1")
      }
    );
    const movedSource = { ...source, position: { x: source.position.x + 80, y: source.position.y + 40 } };
    const movedTarget = { ...target, position: { x: target.position.x - 60, y: target.position.y + 80 } };

    const result = reconcileOverlappingTerminalConnections(
      [source, target, line],
      [movedSource, movedTarget, line],
      [],
      (_first, _second, index) => `unexpected-edge-${index}`,
      new Set([source.id, target.id])
    );

    expect(result.addedEdgeIds).toEqual([]);
    expect(result.removedEdgeIds).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  test("limits overlap reconciliation to affected moved nodes when provided", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    const loadPoint = getTerminalPoint(load, "t1");
    load.position = { x: load.position.x + sourcePoint.x - loadPoint.x, y: load.position.y + sourcePoint.y - loadPoint.y };
    const nextLoad = { ...load, position: { x: load.position.x + 120, y: load.position.y } };

    const skipped = reconcileOverlappingTerminalConnections(
      [source, load],
      [source, nextLoad],
      [],
      () => "auto-edge",
      new Set(["unrelated-node"])
    );
    const reconciled = reconcileOverlappingTerminalConnections(
      [source, load],
      [source, nextLoad],
      [],
      () => "auto-edge",
      new Set([nextLoad.id])
    );

    expect(skipped.addedEdgeIds).toEqual([]);
    expect(skipped.edges).toEqual([]);
    expect(reconciled.addedEdgeIds).toEqual(["auto-edge"]);
  });

  test("removes an explicit connection when its same-type endpoints are moved onto the same coordinate", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const edge: Edge = {
      id: "connected-overlap",
      sourceId: source.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const sourcePoint = getTerminalPoint(source, "t1");
    const loadPoint = getTerminalPoint(load, "t1");
    const nextLoad = {
      ...load,
      position: { x: load.position.x + sourcePoint.x - loadPoint.x, y: load.position.y + sourcePoint.y - loadPoint.y }
    };

    const result = reconcileOverlappingTerminalConnections([source, load], [source, nextLoad], [edge], () => "unused");

    expect(result.addedEdgeIds).toEqual([]);
    expect(result.removedEdgeIds).toEqual(["connected-overlap"]);
    expect(result.edges).toEqual([]);
  });

  test("limits overlap edge removal checks to supplied candidate edges", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const edge: Edge = {
      id: "connected-overlap",
      sourceId: source.id,
      targetId: load.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const sourcePoint = getTerminalPoint(source, "t1");
    const loadPoint = getTerminalPoint(load, "t1");
    const nextLoad = {
      ...load,
      position: { x: load.position.x + sourcePoint.x - loadPoint.x, y: load.position.y + sourcePoint.y - loadPoint.y }
    };

    const skipped = reconcileOverlappingTerminalConnections(
      [source, load],
      [source, nextLoad],
      [edge],
      () => "unused",
      new Set([load.id]),
      []
    );
    const reconciled = reconcileOverlappingTerminalConnections(
      [source, load],
      [source, nextLoad],
      [edge],
      () => "unused",
      new Set([load.id]),
      [edge]
    );

    expect(skipped.removedEdgeIds).toEqual([]);
    expect(skipped.edges).toBeDefined();
    expect(skipped.edges[0]).toBe(edge);
    expect(reconciled.removedEdgeIds).toEqual(["connected-overlap"]);
    expect(reconciled.edges).toEqual([]);
  });

  test("contracts device terminals touching a same-type bus into one topology node", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 220, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    source.position = { x: source.position.x + 180 - sourcePoint.x, y: source.position.y };

    const contacts = getTerminalBusContactGroups([source, bus]);
    const calculated = calculateElectricalTopology([source, bus], []);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(contacts).toHaveLength(1);
    expect(contacts[0].contacts[0]).toEqual(expect.objectContaining({ nodeId: source.id, terminalId: "t1", busId: bus.id }));
    expect(byId.get(source.id)?.terminals[0].nodeNumber).toBe(byId.get(bus.id)?.terminals[0].nodeNumber);
  });

  test("adds an explicit same-type connection when a bus-terminal contact is moved apart", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 220, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    source.position = { x: source.position.x + 180 - sourcePoint.x, y: source.position.y };
    const movedBus = { ...bus, position: { x: bus.position.x + 160, y: bus.position.y } };
    const expectedBusPoint = projectPointToBusCenterline(movedBus, getTerminalPoint(source, "t1"));

    const result = reconcileOverlappingTerminalConnections([source, bus], [source, movedBus], [], () => "bus-edge");

    expect(result.addedEdgeIds).toEqual(["bus-edge"]);
    expect(result.edges).toEqual([
      expect.objectContaining({
        id: "bus-edge",
        sourceId: source.id,
        targetId: bus.id,
        sourceTerminalId: "t1",
        targetTerminalId: "t1",
        targetPoint: expectedBusPoint
      })
    ]);
  });

  test("places the generated bus endpoint opposite the moved device terminal when device-bus contact separates", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 220, y: 100 });
    const sourcePoint = getTerminalPoint(source, "t1");
    source.position = { x: source.position.x + 180 - sourcePoint.x, y: source.position.y };
    const movedSource = { ...source, position: { x: source.position.x, y: source.position.y - 120 } };
    const expectedBusPoint = projectPointToBusCenterline(bus, getTerminalPoint(movedSource, "t1"));

    const result = reconcileOverlappingTerminalConnections([source, bus], [movedSource, bus], [], () => "bus-edge");

    expect(result.addedEdgeIds).toEqual(["bus-edge"]);
    expect(result.edges[0]).toEqual(expect.objectContaining({
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: expectedBusPoint
    }));
  });

  test("removes an explicit bus connection when the device terminal touches the bus again", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 380, y: 100 });
    const edge: Edge = {
      id: "bus-explicit",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const sourcePoint = getTerminalPoint(source, "t1");
    const nextSource = { ...source, position: { x: source.position.x + 340 - sourcePoint.x, y: source.position.y } };

    const result = reconcileOverlappingTerminalConnections([source, bus], [nextSource, bus], [edge], () => "unused");

    expect(result.removedEdgeIds).toEqual(["bus-explicit"]);
    expect(result.edges).toEqual([]);
  });

  test("does not contract overlapping terminals with different energy types", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 260, y: 100 });
    const acTerminalPoint = getTerminalPoint(acSource, "t1");
    const dcTerminalPoint = getTerminalPoint(dcLoad, "t1");
    dcLoad.position = {
      x: dcLoad.position.x + acTerminalPoint.x - dcTerminalPoint.x,
      y: dcLoad.position.y + acTerminalPoint.y - dcTerminalPoint.y
    };

    const calculated = calculateElectricalTopology([acSource, dcLoad], []);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(getTerminalPoint(acSource, "t1")).toEqual(getTerminalPoint(dcLoad, "t1"));
    expect(byId.get(acSource.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(dcLoad.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(acSource.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acSource.id)?.dcTopologyNode).toBe(0);
    expect(byId.get(dcLoad.id)?.acTopologyNode).toBe(0);
    expect(byId.get(dcLoad.id)?.dcTopologyNode).toBe(1);
  });

  test("fills zero generator voltage setpoints from the topology node rated voltage", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 240, y: 100 });
    const dcFuelCell = assignPermanentDeviceIndex(createDefaultNode("dc-fuel-cell", { x: 100, y: 240 }), {}).node;
    const dcBus = createDefaultNode("dc-bus", { x: 240, y: 240 });
    acSource.params.v_set = "0.0";
    acSource.terminals[0].vbase = "35 kV";
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    dcFuelCell.params.v_set_dc_unit_t1 = "0.0";
    dcFuelCell.terminals[0].vbase = "1500 V";
    dcBus.terminals.forEach((terminal) => {
      terminal.vbase = "1500 V";
    });

    const calculated = calculateElectricalTopology(
      [acSource, acBus, dcFuelCell, dcBus],
      [
        { id: "ac", sourceId: acSource.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "dc", sourceId: dcFuelCell.id, targetId: dcBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acSource.id)?.params.v_set).toBe("35");
    expect(byId.get(dcFuelCell.id)?.params.v_set_dc_unit_t1).toBe("1500");
  });

  test("clears selected device voltage base and voltage setpoint values without touching other parameters", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    source.terminals[0].vbase = "35 kV";
    load.terminals[0].vbase = "10 kV";
    source.params = {
      ...source.params,
      vbase: "35",
      v_base: "35",
      highVbase: "35",
      v_set: "35",
      ac_v_set: "35",
      v_set_ac_unit_t1: "35",
      voltage: "35",
      ratedVoltage: "35"
    };
    load.params = { ...load.params, vbase: "10", v_set: "10", voltage: "10", ratedVoltage: "10" };

    const result = clearVoltageBaseValuesForScope([source, load], [], [source.id], "selected");
    const byId = new Map(result.nodes.map((node) => [node.id, node]));

    expect(result.changedNodeIds).toEqual([source.id]);
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("0.0");
    expect(byId.get(source.id)?.params).toMatchObject({
      vbase: "0.0",
      v_base: "0.0",
      highVbase: "0.0",
      v_set: "0.0",
      ac_v_set: "0.0",
      v_set_ac_unit_t1: "0.0",
      voltage: "0.0",
      ratedVoltage: "35"
    });
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10 kV");
    expect(byId.get(load.id)?.params.vbase).toBe("10");
  });

  test("clears voltage base values for the topology island containing the selected device", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 220, y: 100 });
    const load = createDefaultNode("ac-load", { x: 340, y: 100 });
    const other = createDefaultNode("dc-source", { x: 100, y: 240 });
    for (const node of [source, line, load, other]) {
      node.terminals.forEach((terminal) => {
        terminal.vbase = node.kind.startsWith("dc") ? "750 V" : "35 kV";
      });
      node.params = { ...node.params, vbase: node.kind.startsWith("dc") ? "750" : "35", v_set: node.kind.startsWith("dc") ? "750" : "35" };
    }
    const edges = [
      { id: "e-source-line", sourceId: source.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "e-line-load", sourceId: line.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const result = clearVoltageBaseValuesForScope([source, line, load, other], edges, [source.id], "island");
    const byId = new Map(result.nodes.map((node) => [node.id, node]));

    expect(new Set(result.changedNodeIds)).toEqual(new Set([source.id, line.id, load.id]));
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("0.0");
    expect(byId.get(line.id)?.terminals.map((terminal) => terminal.vbase)).toEqual(["0.0", "0.0"]);
    expect(byId.get(load.id)?.params.vbase).toBe("0.0");
    expect(byId.get(other.id)?.terminals[0].vbase).toBe("750 V");
    expect(byId.get(other.id)?.params.vbase).toBe("750");
  });

  test("clears only matching terminal voltage fields on a multi-island transformer", () => {
    const highSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const lowLoad = createDefaultNode("ac-load", { x: 500, y: 100 });
    const transformer = createDefaultNode("ac-transformer", { x: 300, y: 100 });
    highSource.terminals[0].vbase = "110";
    lowLoad.terminals[0].vbase = "10";
    transformer.terminals[0].vbase = "110";
    transformer.terminals[1].vbase = "10";
    highSource.params = { ...highSource.params, vbase: "110", v_set: "110" };
    lowLoad.params = { ...lowLoad.params, vbase: "10", v_set: "10" };
    transformer.params = {
      ...transformer.params,
      vbase: "110",
      highVbase: "110",
      lowVbase: "10",
      sourceVbase: "110",
      targetVbase: "10",
      i_vbase: "110",
      j_vbase: "10"
    };
    const edges = [
      { id: "high-transformer", sourceId: highSource.id, targetId: transformer.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "transformer-low", sourceId: transformer.id, targetId: lowLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const result = clearVoltageBaseValuesForScope([highSource, transformer, lowLoad], edges, [highSource.id], "island");
    const byId = new Map(result.nodes.map((node) => [node.id, node]));
    const nextTransformer = byId.get(transformer.id);

    expect(new Set(result.changedNodeIds)).toEqual(new Set([highSource.id, transformer.id]));
    expect(nextTransformer?.terminals.map((terminal) => terminal.vbase)).toEqual(["0.0", "10"]);
    expect(nextTransformer?.params.highVbase).toBe("0.0");
    expect(nextTransformer?.params.sourceVbase).toBe("0.0");
    expect(nextTransformer?.params.i_vbase).toBe("0.0");
    expect(nextTransformer?.params.lowVbase).toBe("10");
    expect(nextTransformer?.params.targetVbase).toBe("10");
    expect(nextTransformer?.params.j_vbase).toBe("10");
    expect(nextTransformer?.params.vbase).toBe("110");
    expect(byId.get(lowLoad.id)?.terminals[0].vbase).toBe("10");
    expect(byId.get(lowLoad.id)?.params.vbase).toBe("10");
  });

  test("clears voltage base values across the whole model", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcSource = createDefaultNode("dc-source", { x: 260, y: 100 });
    acSource.terminals[0].vbase = "10";
    dcSource.terminals[0].vbase = "750";
    acSource.params = { ...acSource.params, vbase: "10", v_set: "10" };
    dcSource.params = { ...dcSource.params, vbase: "750", v_set: "750" };

    const result = clearVoltageBaseValuesForScope([acSource, dcSource], [], [], "all");

    expect(new Set(result.changedNodeIds)).toEqual(new Set([acSource.id, dcSource.id]));
    expect(result.nodes.flatMap((node) => node.terminals.map((terminal) => terminal.vbase))).toEqual(["0.0", "0.0"]);
    expect(result.nodes.map((node) => node.params.vbase)).toEqual(["0.0", "0.0"]);
    expect(result.nodes.map((node) => node.params.v_set)).toEqual(["0.0", "0.0"]);
  });

  test("sets selected device voltage base and voltage setpoint values without touching other parameters", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    source.terminals[0].vbase = "35";
    load.terminals[0].vbase = "10";
    source.params = {
      ...source.params,
      vbase: "35",
      v_base: "35",
      highVbase: "35",
      sourceVbase: "35",
      i_vbase: "35",
      v_set: "35",
      i_v_set: "35",
      ac_v_set: "35",
      voltage: "35",
      ratedVoltage: "35"
    };
    load.params = { ...load.params, vbase: "10", v_set: "10", voltage: "10", ratedVoltage: "10" };

    const result = setVoltageBaseValuesForScope([source, load], [], [source.id], "selected", "110");
    const byId = new Map(result.nodes.map((node) => [node.id, node]));

    expect(result.changedNodeIds).toEqual([source.id]);
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("110");
    expect(byId.get(source.id)?.params).toMatchObject({
      vbase: "110",
      v_base: "110",
      highVbase: "110",
      sourceVbase: "110",
      i_vbase: "110",
      v_set: "110",
      i_v_set: "110",
      ac_v_set: "110",
      voltage: "110",
      ratedVoltage: "35"
    });
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10");
    expect(byId.get(load.id)?.params.vbase).toBe("10");
  });

  test("sets voltage base values for the topology island containing the selected device", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 220, y: 100 });
    const load = createDefaultNode("ac-load", { x: 340, y: 100 });
    const other = createDefaultNode("dc-source", { x: 100, y: 240 });
    for (const node of [source, line, load, other]) {
      node.terminals.forEach((terminal) => {
        terminal.vbase = node.kind.startsWith("dc") ? "750" : "35";
      });
      node.params = { ...node.params, vbase: node.kind.startsWith("dc") ? "750" : "35", v_set: node.kind.startsWith("dc") ? "750" : "35" };
    }
    const edges = [
      { id: "e-source-line", sourceId: source.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "e-line-load", sourceId: line.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const result = setVoltageBaseValuesForScope([source, line, load, other], edges, [source.id], "island", "220");
    const byId = new Map(result.nodes.map((node) => [node.id, node]));

    expect(new Set(result.changedNodeIds)).toEqual(new Set([source.id, line.id, load.id]));
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("220");
    expect(byId.get(line.id)?.terminals.map((terminal) => terminal.vbase)).toEqual(["220", "220"]);
    expect(byId.get(load.id)?.params.vbase).toBe("220");
    expect(byId.get(other.id)?.terminals[0].vbase).toBe("750");
    expect(byId.get(other.id)?.params.vbase).toBe("750");
  });

  test("sets connected converter terminals through uniform topology island setting without crossing converter sides", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 500, y: 100 });
    const converter = createDefaultNode("acac-converter", { x: 300, y: 100 });
    source.terminals[0].vbase = "110";
    load.terminals[0].vbase = "10";
    converter.terminals[0].vbase = "110";
    converter.terminals[1].vbase = "10";
    source.params = { ...source.params, vbase: "110", v_set: "110" };
    load.params = { ...load.params, vbase: "10", v_set: "10" };
    converter.params = {
      ...converter.params,
      vbase: "110",
      i_vbase: "110",
      j_vbase: "10",
      i_v_set: "110",
      j_v_set: "10",
      v_set: "110"
    };
    const edges = [
      { id: "source-converter", sourceId: source.id, targetId: converter.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "converter-load", sourceId: converter.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const result = setVoltageBaseValuesForScope([source, converter, load], edges, [load.id], "island", "35");
    const byId = new Map(result.nodes.map((node) => [node.id, node]));
    const nextConverter = byId.get(converter.id);

    expect(new Set(result.changedNodeIds)).toEqual(new Set([converter.id, load.id]));
    expect(new Set(result.targetNodeIds)).toEqual(new Set([converter.id, load.id]));
    expect(nextConverter?.terminals.map((terminal) => terminal.vbase)).toEqual(["110", "35"]);
    expect(nextConverter?.params.i_vbase).toBe("110");
    expect(nextConverter?.params.i_v_set).toBe("110");
    expect(nextConverter?.params.v_set).toBe("110");
    expect(nextConverter?.params.j_vbase).toBe("35");
    expect(nextConverter?.params.j_v_set).toBe("35");
    expect(nextConverter?.params.vbase).toBe("110");
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("110");
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("35");
    expect(byId.get(load.id)?.params.vbase).toBe("35");
  });

  test("sets selected multi-terminal device voltage bases per terminal", () => {
    const transformer = createDefaultNode("ac-three-winding-transformer-neutral", { x: 100, y: 100 });
    transformer.terminals.forEach((terminal, index) => {
      terminal.vbase = ["110", "35", "10", "0.4"][index];
    });
    transformer.params = {
      ...transformer.params,
      highVbase: "110",
      mediumVbase: "35",
      lowVbase: "10",
      neutral_vbase: "0.4",
      vbase: "110"
    };

    const result = setVoltageBaseTerminalValuesForScope(
      [transformer],
      [],
      {
        [transformer.id]: {
          t1: "220",
          t2: "66",
          t3: "20",
          t4: "0.8"
        }
      },
      "selected"
    );
    const nextTransformer = result.nodes[0];

    expect(result.changedNodeIds).toEqual([transformer.id]);
    expect(nextTransformer.terminals.map((terminal) => terminal.vbase)).toEqual(["220", "66", "20", "0.8"]);
    expect(nextTransformer.params.highVbase).toBe("220");
    expect(nextTransformer.params.mediumVbase).toBe("66");
    expect(nextTransformer.params.lowVbase).toBe("20");
    expect(nextTransformer.params.neutral_vbase).toBe("0.8");
    expect(nextTransformer.params.vbase).toBe("110");
  });

  test("sets terminal voltage base through each transformer or converter terminal topology island", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 500, y: 100 });
    const converter = createDefaultNode("acac-converter", { x: 300, y: 100 });
    source.terminals[0].vbase = "110";
    load.terminals[0].vbase = "10";
    converter.terminals[0].vbase = "110";
    converter.terminals[1].vbase = "10";
    source.params = { ...source.params, vbase: "110", v_set: "110" };
    load.params = { ...load.params, vbase: "10", v_set: "10" };
    converter.params = {
      ...converter.params,
      i_vbase: "110",
      j_vbase: "10",
      i_v_set: "110",
      j_v_set: "10",
      v_set: "110"
    };
    const edges = [
      { id: "source-converter", sourceId: source.id, targetId: converter.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "converter-load", sourceId: converter.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
    ];

    const result = setVoltageBaseTerminalValuesForScope(
      [source, converter, load],
      edges,
      { [converter.id]: { t1: "220", t2: "35" } },
      "island"
    );
    const byId = new Map(result.nodes.map((node) => [node.id, node]));
    const nextConverter = byId.get(converter.id);

    expect(new Set(result.changedNodeIds)).toEqual(new Set([source.id, converter.id, load.id]));
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("220");
    expect(byId.get(source.id)?.params.vbase).toBe("220");
    expect(nextConverter?.terminals.map((terminal) => terminal.vbase)).toEqual(["220", "35"]);
    expect(nextConverter?.params.i_vbase).toBe("220");
    expect(nextConverter?.params.i_v_set).toBe("220");
    expect(nextConverter?.params.v_set).toBe("220");
    expect(nextConverter?.params.j_vbase).toBe("35");
    expect(nextConverter?.params.j_v_set).toBe("35");
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("35");
    expect(byId.get(load.id)?.params.vbase).toBe("35");
  });

  test("fills zero converter voltage setpoints from the related topology node rated voltage", () => {
    const dcdc = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
    dcdc.params.v_set = "0.0";
    dcdc.params.i_control_type = "CTRL_P";
    dcdc.params.j_control_type = "CTRL_V";
    dcdc.terminals[0].vbase = "1500 V";
    dcdc.terminals[1].vbase = "750 V";
    const acdc = createDefaultNode("acdc-converter", { x: 260, y: 100 });
    acdc.params.v_set = "0.0";
    acdc.params.v_ac_set = "0.0";
    acdc.params.v_dc_set = "0.0";
    acdc.terminals[0].vbase = "35 kV";
    acdc.terminals[1].vbase = "800 V";
    const acac = createDefaultNode("acac-converter", { x: 420, y: 100 });
    acac.params.i_v_set = "0.0";
    acac.params.j_v_set = "0.0";
    acac.terminals[0].vbase = "110 kV";
    acac.terminals[1].vbase = "10 kV";

    const calculated = calculateElectricalTopology([dcdc, acdc, acac], []);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(dcdc.id)?.params.v_set).toBe("750");
    expect(byId.get(acdc.id)?.params.v_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_ac_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_dc_set).toBe("800");
    expect(byId.get(acac.id)?.params.i_v_set).toBe("110");
    expect(byId.get(acac.id)?.params.j_v_set).toBe("10");
  });

  test("checks voltage setpoint deviations after topology fills zero defaults", () => {
    const acBus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 100 });
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    acdc.terminals[0].vbase = "35 kV";
    acdc.terminals[1].vbase = "800 V";
    acdc.params.v_set = "0.0";
    acdc.params.v_ac_set = "0.0";

    const calculated = calculateElectricalTopology(
      [acBus, acdc],
      [{ id: "acdc-ac", sourceId: acdc.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acdc.id)?.params.v_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_ac_set).toBe("35");
    expect(validateVoltageSetpointDeviations(calculated, []).some((error) => error.type === "voltage-setpoint-deviation")).toBe(false);
  });

  test("fills missing AC/DC converter voltage setpoints from topology rated voltages", () => {
    const acBus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 160, y: 260 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 180 });
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "35 kV";
    });
    dcBus.terminals.forEach((terminal) => {
      terminal.vbase = "800 V";
    });
    acdc.terminals[0].vbase = "35 kV";
    acdc.terminals[1].vbase = "800 V";
    delete acdc.params.v_ac_set;
    acdc.params.v_dc_set = "";

    const calculated = calculateElectricalTopology(
      [acBus, dcBus, acdc],
      [
        { id: "acdc-ac", sourceId: acdc.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "acdc-dc", sourceId: acdc.id, targetId: dcBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acdc.id)?.params.v_ac_set).toBe("35");
    expect(byId.get(acdc.id)?.params.v_dc_set).toBe("800");
  });

  test("builds topology calculation success and failure prompts", () => {
    expect(topologyCalculationMessage(0)).toBe("图上拓扑成功。");
    expect(topologyCalculationMessage(2)).toBe("图上拓扑失败：发现 2 条错误，已定位到第一条错误。");
  });

  test("contracts all lines connected to the same bus and numbers AC and DC independently", () => {
    const acBus = createDefaultNode("ac-bus", { x: 200, y: 100 });
    const acLoadA = createDefaultNode("ac-load", { x: 80, y: 100 });
    const acLoadB = createDefaultNode("ac-load", { x: 320, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 200, y: 260 });
    const dcLoadA = createDefaultNode("dc-load", { x: 80, y: 260 });
    const dcLoadB = createDefaultNode("dc-load", { x: 320, y: 260 });

    const calculated = calculateElectricalTopology(
      [acBus, acLoadA, acLoadB, dcBus, dcLoadA, dcLoadB],
      [
        { id: "ac-a", sourceId: acLoadA.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 160, y: 100 } },
        { id: "ac-b", sourceId: acLoadB.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 240, y: 100 } },
        { id: "dc-a", sourceId: dcLoadA.id, targetId: dcBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 160, y: 260 } },
        { id: "dc-b", sourceId: dcLoadB.id, targetId: dcBus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 240, y: 260 } }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acBus.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acLoadA.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(acLoadB.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(acBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
    expect(byId.get(dcBus.id)?.dcTopologyNode).toBe(1);
    expect(byId.get(dcLoadA.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(dcLoadB.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(dcBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
  });

  test("keeps two-terminal branch device endpoint node numbers separate unless connected", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const load = createDefaultNode("ac-load", { x: 380, y: 100 });

    const calculated = calculateElectricalTopology(
      [source, line, load],
      [
        { id: "source-line", sourceId: source.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "line-load", sourceId: line.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(source.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[1].nodeNumber).toBe("2");
    expect(byId.get(load.id)?.terminals[0].nodeNumber).toBe("2");
  });

  test("rejects two-terminal devices whose endpoints fall on the same topology node", () => {
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 240, y: 220 });
    line.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });

    const errors = validateTopology(
      [line, bus],
      [
        { id: "line-i-bus", sourceId: line.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1", targetPoint: { x: 180, y: 220 } },
        { id: "line-j-bus", sourceId: line.id, targetId: bus.id, sourceTerminalId: "t2", targetTerminalId: "t2", targetPoint: { x: 300, y: 220 } }
      ],
      { includeVoltageSetpointDeviations: false }
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "same-topology-node-endpoints",
        nodeId: line.id,
        relatedNodeIds: [line.id],
        message: expect.stringContaining("首末端不能位于同一个拓扑节点")
      })
    ]));
  });

  test("fills zero voltage bases across topology islands without merging topology node numbers", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const load = createDefaultNode("ac-load", { x: 380, y: 100 });
    source.terminals[0].vbase = "10 kV";
    source.params.v_set = "0.0";

    const calculated = calculateElectricalTopology(
      [source, line, load],
      [
        { id: "source-line", sourceId: source.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "line-load", sourceId: line.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(source.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[1].nodeNumber).toBe("2");
    expect(byId.get(load.id)?.terminals[0].nodeNumber).toBe("2");
    expect(byId.get(source.id)?.terminals[0].vbase).toBe("10");
    expect(byId.get(line.id)?.terminals.map((terminal) => terminal.vbase)).toEqual(["10", "10"]);
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10");
    expect(byId.get(load.id)?.params.vbase).toBe("10");
    expect(byId.get(source.id)?.params.v_set).toBe("10");
  });

  test("reports topology islands with missing or conflicting non-zero voltage bases", () => {
    const zeroSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const zeroLine = createDefaultNode("ac-line", { x: 240, y: 100 });
    const zeroLoad = createDefaultNode("ac-load", { x: 380, y: 100 });
    const missingErrors = validateTopology(
      [zeroSource, zeroLine, zeroLoad],
      [
        { id: "zero-source-line", sourceId: zeroSource.id, targetId: zeroLine.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "zero-line-load", sourceId: zeroLine.id, targetId: zeroLoad.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ],
      { includeVoltageSetpointDeviations: false }
    );
    expect(missingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "missing-island-voltage", relatedNodeIds: expect.arrayContaining([zeroSource.id, zeroLine.id, zeroLoad.id]) })
    ]));

    const source10 = createDefaultNode("ac-source", { x: 100, y: 260 });
    const zeroBranch = createDefaultNode("ac-zero-branch", { x: 240, y: 260 });
    const load35 = createDefaultNode("ac-load", { x: 380, y: 260 });
    source10.terminals[0].vbase = "10 kV";
    load35.terminals[0].vbase = "35 kV";
    const conflictingErrors = validateTopology(
      [source10, zeroBranch, load35],
      [
        { id: "source-zero", sourceId: source10.id, targetId: zeroBranch.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "zero-load", sourceId: zeroBranch.id, targetId: load35.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ],
      { includeVoltageSetpointDeviations: false }
    );
    expect(conflictingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "island-voltage-mismatch", relatedNodeIds: expect.arrayContaining([source10.id, zeroBranch.id, load35.id]) })
    ]));
  });

  test("uses routable line endpoint refs as topology connections", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const branchTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-zero-routable-branch");
    expect(branchTemplate).toBeDefined();
    const load = createDefaultNode("ac-load", { x: 460, y: 100 });
    const branch = createRoutableLineDeviceFromEndpoints(
      branchTemplate!,
      getTerminalPoint(source, "t1"),
      getTerminalPoint(load, "t1"),
      DEFAULT_MODEL_LAYER_ID,
      {
        source: routableLineDeviceEndpointRefForNode(source, "t1"),
        target: routableLineDeviceEndpointRefForNode(load, "t1")
      }
    );
    source.terminals[0].vbase = "10 kV";

    const errors = validateTopology([source, branch, load], [], { includeVoltageSetpointDeviations: false });
    const calculated = calculateElectricalTopology([source, branch, load], []);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(errors.some((error) => error.type === "floating-terminal")).toBe(false);
    expect(errors.some((error) => error.type === "missing-island-voltage")).toBe(false);
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10");
  });

  test("reports transformer terminals that fall inside the same topology island", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    transformer.terminals[0].vbase = "10 kV";
    transformer.terminals[1].vbase = "10 kV";

    const errors = validateTopology(
      [transformer, line],
      [
        { id: "xf-i-line", sourceId: transformer.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "xf-j-line", sourceId: transformer.id, targetId: line.id, sourceTerminalId: "t2", targetTerminalId: "t2" }
      ],
      { includeVoltageSetpointDeviations: false }
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "transformer-island-short", nodeId: transformer.id })
    ]));

    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 100, y: 260 });
    const zeroBranch = createDefaultNode("ac-zero-branch", { x: 240, y: 260 });
    threeWinding.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    const threeWindingErrors = validateTopology(
      [threeWinding, zeroBranch],
      [
        { id: "t3-i-zero", sourceId: threeWinding.id, targetId: zeroBranch.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "t3-j-zero", sourceId: threeWinding.id, targetId: zeroBranch.id, sourceTerminalId: "t2", targetTerminalId: "t2" }
      ],
      { includeVoltageSetpointDeviations: false }
    );
    expect(threeWindingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "transformer-island-short", nodeId: threeWinding.id })
    ]));
  });

  test("validates floating terminals, mixed terminal types, and voltage mismatch before topology", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 340, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 220 });
    acSource.params.vbase = "10 kV";
    acSource.terminals[0].vbase = "10 kV";
    acLoad.params.vbase = "35 kV";
    acLoad.terminals[0].vbase = "35 kV";
    const errors = validateTopology(
      [acSource, dcLoad, acLoad, acBus],
      [
        { id: "mixed", sourceId: acSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "voltage", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "same-bus", sourceId: acBus.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t2" }
      ]
    );

    expect(errors.some((error) => error.type === "terminal-type-mismatch" && error.edgeId === "mixed")).toBe(true);
    expect(errors.some((error) => error.type === "voltage-mismatch" && error.edgeId === "voltage")).toBe(true);
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "same-bus-endpoints",
        edgeId: "same-bus",
        nodeId: acBus.id,
        message: expect.stringContaining("首末端不能位于同一个母线")
      })
    ]));

    const loneLoad = createDefaultNode("ac-load", { x: 460, y: 100 });
    const floatingErrors = validateTopology([loneLoad], []);
    expect(floatingErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "floating-terminal",
        nodeId: loneLoad.id,
        message: expect.stringContaining("悬空")
      })
    ]));

    const floatingEdgeErrors = validateTopology(
      [acSource],
      [{ id: "floating-edge", sourceId: acSource.id, targetId: "", sourceTerminalId: "t1", targetPoint: { x: 500, y: 100 } }]
    );
    expect(floatingEdgeErrors.some((error) => error.type === "floating-terminal" && error.edgeId === "floating-edge")).toBe(true);
  });

  test("validates voltage mismatch from the connected terminal voltage bases", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 240, y: 100 });
    source.params.vbase = "10 kV";
    load.params.vbase = "10 kV";
    source.terminals[0].vbase = "10 kV";
    load.terminals[0].vbase = "35 kV";

    const errors = validateTopology(
      [source, load],
      [{ id: "e-terminal-vbase", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    );

    expect(errors.some((error) => error.type === "voltage-mismatch" && error.edgeId === "e-terminal-vbase")).toBe(true);
  });

  test("ignores zero terminal voltage bases during validation and fills them after topology", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 240, y: 100 });
    source.terminals[0].vbase = "10 kV";
    load.terminals[0].vbase = "0";

    const edges: Edge[] = [
      { id: "zero-vbase", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];
    const errors = validateTopology([source, load], edges, { includeVoltageSetpointDeviations: false });
    const calculated = calculateElectricalTopology([source, load], edges);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(errors.some((error) => error.type === "voltage-mismatch")).toBe(false);
    expect(byId.get(load.id)?.terminals[0].vbase).toBe("10");
  });

  test("warns when voltage setpoints deviate more than 30 percent from rated topology voltage", () => {
    const acBus10 = createDefaultNode("ac-bus", { x: 260, y: 120 });
    const acBus10B = createDefaultNode("ac-bus", { x: 260, y: 360 });
    const dcBus750 = createDefaultNode("dc-bus", { x: 260, y: 600 });
    const dcBus750B = createDefaultNode("dc-bus", { x: 820, y: 600 });
    const source = createDefaultNode("ac-source", { x: 40, y: 120 });
    const dcdc = createDefaultNode("dcdc-converter", { x: 540, y: 600 });
    const acdc = createDefaultNode("acdc-converter", { x: 540, y: 120 });
    const acac = createDefaultNode("acac-converter", { x: 540, y: 360 });
    acBus10.name = "交流母线10";
    acBus10B.name = "交流母线10B";
    dcBus750.name = "直流母线750A";
    dcBus750B.name = "直流母线750B";
    acBus10.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    acBus10B.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    dcBus750.terminals.forEach((terminal) => {
      terminal.vbase = "750 V";
    });
    dcBus750B.terminals.forEach((terminal) => {
      terminal.vbase = "750 V";
    });
    source.terminals[0].vbase = "10 kV";
    source.params.v_set = "14";
    dcdc.terminals[0].vbase = "750 V";
    dcdc.terminals[1].vbase = "750 V";
    dcdc.params.v_set = "1000";
    acdc.terminals[0].vbase = "10 kV";
    acdc.terminals[1].vbase = "750 V";
    acdc.params.v_ac_set = "12";
    acdc.params.v_dc_set = "1000";
    acac.terminals[0].vbase = "10 kV";
    acac.terminals[1].vbase = "10 kV";
    acac.params.i_v_set = "14";
    acac.params.j_v_set = "12";

    const errors = validateTopology(
      [acBus10, acBus10B, dcBus750, dcBus750B, source, dcdc, acdc, acac],
      [
        { id: "source-ac", sourceId: source.id, targetId: acBus10.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "dcdc-i", sourceId: dcdc.id, targetId: dcBus750.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
        { id: "dcdc-j", sourceId: dcdc.id, targetId: dcBus750B.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "acdc-ac", sourceId: acdc.id, targetId: acBus10.id, sourceTerminalId: "t1", targetTerminalId: "t2" },
        { id: "acdc-dc", sourceId: acdc.id, targetId: dcBus750.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "acac-i", sourceId: acac.id, targetId: acBus10.id, sourceTerminalId: "t1", targetTerminalId: "t3" },
        { id: "acac-j", sourceId: acac.id, targetId: acBus10B.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: source.id, message: expect.stringContaining("v_set=14") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: dcdc.id, message: expect.stringContaining("v_set=1000") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acdc.id, message: expect.stringContaining("v_dc_set=1000") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acac.id, message: expect.stringContaining("i_v_set=14") })
    ]));
    expect(errors.some((error) => error.message.includes("v_ac_set=12"))).toBe(false);
    expect(errors.some((error) => error.message.includes("j_v_set=12"))).toBe(false);
  });

  test("does not warn zero voltage setpoints before topology can fill them", () => {
    const bus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const source = createDefaultNode("ac-source", { x: 40, y: 100 });
    bus.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    source.terminals[0].vbase = "10 kV";
    source.params.v_set = "0.0";

    const errors = validateTopology(
      [bus, source],
      [{ id: "source-bus", sourceId: source.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }]
    );

    expect(errors.some((error) => error.type === "voltage-setpoint-deviation")).toBe(false);
  });

  test("checks legacy ac_v_set and dc_v_set converter voltage setpoint aliases", () => {
    const acBus = createDefaultNode("ac-bus", { x: 160, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 160, y: 260 });
    const acdc = createDefaultNode("acdc-converter", { x: 360, y: 180 });
    acBus.terminals.forEach((terminal) => {
      terminal.vbase = "10 kV";
    });
    dcBus.terminals.forEach((terminal) => {
      terminal.vbase = "750 V";
    });
    acdc.terminals[0].vbase = "10 kV";
    acdc.terminals[1].vbase = "750 V";
    acdc.params.ac_v_set = "14";
    acdc.params.dc_v_set = "1000";

    const errors = validateTopology(
      [acBus, dcBus, acdc],
      [
        { id: "acdc-ac", sourceId: acdc.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "acdc-dc", sourceId: acdc.id, targetId: dcBus.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acdc.id, message: expect.stringContaining("ac_v_set=14") }),
      expect.objectContaining({ type: "voltage-setpoint-deviation", nodeId: acdc.id, message: expect.stringContaining("dc_v_set=1000") })
    ]));
  });

  test("validates duplicate idx and names within the same device type", () => {
    const firstLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const secondLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });
    firstLoad.name = "重复负荷";
    secondLoad.name = "重复负荷";
    dcLoad.name = "重复负荷";
    firstLoad.params = { ...firstLoad.params, idx: "3" };
    secondLoad.params = { ...secondLoad.params, idx: "3" };
    dcLoad.params = { ...dcLoad.params, idx: "3" };

    const errors = validateTopology([firstLoad, secondLoad, dcLoad], []);

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "duplicate-device-idx",
        relatedNodeIds: expect.arrayContaining([firstLoad.id, secondLoad.id]),
        message: expect.stringContaining("ACLoad")
      }),
      expect.objectContaining({
        type: "duplicate-device-name",
        relatedNodeIds: expect.arrayContaining([firstLoad.id, secondLoad.id]),
        message: expect.stringContaining("重复负荷")
      })
    ]));
    expect(errors.some((error) => error.type === "duplicate-device-idx" && error.relatedNodeIds.includes(dcLoad.id))).toBe(false);
    expect(errors.some((error) => error.type === "duplicate-device-name" && error.relatedNodeIds.includes(dcLoad.id))).toBe(false);
  });

  test("treats duplicate identity and voltage setpoint deviations as non-blocking topology warnings", () => {
    expect(isBlockingTopologyValidationError({ type: "floating-terminal" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "terminal-type-mismatch" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "same-bus-endpoints" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "same-topology-node-endpoints" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "voltage-mismatch" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "missing-island-voltage" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "island-voltage-mismatch" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "transformer-island-short" })).toBe(true);
    expect(isBlockingTopologyValidationError({ type: "duplicate-device-idx" })).toBe(false);
    expect(isBlockingTopologyValidationError({ type: "duplicate-device-name" })).toBe(false);
    expect(isBlockingTopologyValidationError({ type: "voltage-setpoint-deviation" })).toBe(false);
  });

  test("validates duplicate idx and names between container-associated devices and ordinary devices", () => {
    const load = createDefaultNode("ac-load", { x: 100, y: 100 });
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 260, y: 100 }), {}).node;
    electrolyzer.name = "EL1";
    electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";
    load.name = "自定义交流负荷";
    load.params = { ...load.params, idx: electrolyzer.params.idx_ac_load_t1 ?? "1" };

    const errors = validateTopology([load, electrolyzer], []);

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "duplicate-device-idx",
        relatedNodeIds: expect.arrayContaining([load.id, electrolyzer.id]),
        message: expect.stringContaining("ACLoad")
      }),
      expect.objectContaining({
        type: "duplicate-device-name",
        relatedNodeIds: expect.arrayContaining([load.id, electrolyzer.id]),
        message: expect.stringContaining("自定义交流负荷")
      })
    ]));
  });

  test("exports edited container-associated device names to E sections", () => {
    const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
    electrolyzer.name = "EL1";
    electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";
    electrolyzer.params.name_h2_unit_t2 = "自定义氢源";

    const payload = parseESections(
      buildEDeviceParameterFile({
        version: 1,
        name: "容器子设备导出",
        nodes: [electrolyzer],
        edges: []
      })
    );

    expect(payload.ACLoad.rows[0]).toMatchObject({
      idx: electrolyzer.params.idx_ac_load_t1,
      name: "自定义交流负荷"
    });
    expect(payload.HydroSource.rows[0]).toMatchObject({
      idx: electrolyzer.params.idx_h2_unit_t2,
      name: "自定义氢源"
    });
  });

  test("validates voltage mismatch across terminals contracted through the same bus", () => {
    const bus = createDefaultNode("ac-bus", { x: 200, y: 100 });
    const load10 = createDefaultNode("ac-load", { x: 80, y: 100 });
    const load35 = createDefaultNode("ac-load", { x: 320, y: 100 });
    bus.params.vbase = "";
    bus.terminals = bus.terminals.map((terminal) => ({ ...terminal, vbase: "" }));
    load10.terminals[0].vbase = "10 kV";
    load35.terminals[0].vbase = "35 kV";

    const errors = validateTopology(
      [bus, load10, load35],
      [
        { id: "load10-bus", sourceId: load10.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "load35-bus", sourceId: load35.id, targetId: bus.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );

    expect(errors.some((error) => error.type === "voltage-mismatch" && error.relatedNodeIds.includes(load10.id) && error.relatedNodeIds.includes(load35.id))).toBe(true);
  });
});
