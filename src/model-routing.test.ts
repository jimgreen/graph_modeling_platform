import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeviceGlyph } from "./DeviceGlyph";
import { createRenderStaticBoxDrawingPreview } from "./appExtracted/appCanvasInteractionFactories";
import {
  alignNodes,
  buildTopology,
  buildElementTree,
  buildEFileExport,
  buildEDeviceParameterFile,
  buildEDeviceDefinitionFile,
  buildEDeviceDefinitionFileFromInterfaceDefinitions,
  parseEDeviceDefinitionFile,
  calculateElectricalTopology,
  clearVoltageBaseValuesForScope,
  DeviceParameterDefinition,
  DeviceTemplateDefinitionOverride,
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
  assignMissingDeviceIndexes,
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
  pointsToOrthogonalPath,
  ACAC_CONVERTER_CONTROL_TYPES,
  AC_GENERATOR_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  E_SECTION_COLUMNS,
  tidyOrthogonalRoute,
  renameSavedProject,
  renameSavedScheme,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  moveProjectToScheme,
  moveSavedSchemeToParent,
  nextSavedProjectAfterProjectBatchDeletion,
  nextSavedProjectAfterProjectDeletion,
  nextSavedProjectAfterSchemeDeletion,
  savedProjectPathOptions,
  moveOrthogonalRouteSegment,
  modelGeometryInsideCanvasBounds,
  insertOrthogonalRouteBend,
  preserveConnectionEdgeRouteShape,
  preserveDraggedRouteShape,
  rebuildConnectionRoutesForNodes,
  rebuildExternalConnectionRoutesForMovedNodes,
  rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes,
  rebuildSingleConnectionRoute,
  alignBusEndpointPointToRouteSegmentExtension,
  redrawConnectionRoutesForEdges,
  redrawRoutableLineDeviceRoutes,
  realignConnectionEdgeBusEndpointPoints,
  realignRoutableLineDeviceBusEndpointPoints,
  upsertSavedProject,
  rerouteEdgesAroundMovedNodes,
  routeIntersectsEndpointNodeBodies,
  routeIntersectsSpecificNodes,
  buildManualConnectionPreviewRoute,
  validateConnectionEdgeRoute,
  validateConnectionEndpointRules,
  voltageBaseSettingModeForNode,
  validateTopology,
  validateTwoTerminalVoltageBaseConsistency,
  validateVoltageSetpointDeviations,
  getTerminalPoint,
  getRouteEndpointNormal,
  getBusTerminalType,
  isBusNode,
  getMovableRouteSegmentIndexes,
  getNodeScaleX,
  getNodeScaleY,
  getDeviceGlyphVariant,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getTemplateStateDefinitions,
  normalizeDeviceStateDefinitions,
  normalizeDeviceStatusForE,
  resolveDeviceStateVisual,
  nodeAllowsResizeTransform,
  ALLOW_RESIZE_TRANSFORM_PARAM,
  isCanvasNodeMovable,
  isRoutableLineDeviceKind,
  getConnectionStrokeColor,
  getTerminalDisplayColor,
  reconcileNodeParamsWithTemplateDefinitions,
  rebuildRoutableLineDeviceRouteUpdates,
  repairUnsafeRoutableLineDeviceRoutes,
  routeRoutableLineDevice,
  createRoutableLineDeviceFromEndpoints,
  insertRoutableLineDeviceBend,
  moveRoutableLineDeviceSegment,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  setRoutableLineDeviceEndpoints,
  setRoutableLineDeviceEndpointsPreservingRoute,
  setRoutableLineDeviceCanvasPoints,
  routableLineDeviceCanvasPoints,
  routableLineDeviceLocalPoints,
  ROUTABLE_LINE_POINTS_PARAM,
  ROUTABLE_LINE_DEFAULT_STROKE_WIDTH,
  createStaticBoxNodeFromDrawing,
  createInteractiveStaticDrawingNode,
  getElementFocusPoint,
  getRouteBlockingCandidateNodes,
  applyDeviceTemplateDefinitionOverride,
  segmentIntersectsNodeBody,
  isInteractiveStaticDrawingKind,
  isStaticBoxLikeKind,
  isStaticBoxLikeNode,
  isStaticButtonCapableNode,
  isStaticButtonCapableKind,
  isStaticGraphicNode,
  staticRenderKindForNode,
  isStaticLineLikeKind,
  isBlockingTopologyValidationError,
  isRepeatedEdgePointerClick,
  parseStaticDrawPoints,
  getContainerAssociationRelationKey,
  getContainerRelationKey,
  getEExportWarnings,
  getEParamValue,
  getEParameterKeys,
  resolveDeviceParameterDefinitionExportSettings,
  inferESection,
  getTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo,
  getOverlappingTerminalGroups,
  getTerminalBusContactGroups,
  validateContainerTerminalAssociations,
  validateContainerTerminalRoles,
  isGeneratorNode,
  isElectricGenerationContainerKind,
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
  mergeSavedSchemesForStartup,
  normalizeModelGroups,
  normalizeSavedProjectRecordNames,
  normalizeProjectLayers,
  resolveActiveModelLayerId,
  normalizeScaleValue,
  normalizeNodeTerminalsByTemplate,
  normalizeNodeTerminalsWithTemplate,
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
  formatPowerBaseDisplayValue,
  normalizeRatioParameterInputValue,
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
import { degreesToRadians } from "./formatUtils";

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
function pointLiesOnRouteSegments(point: Point, route: Point[]) {
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    if (
      previous.y === current.y &&
      point.y === previous.y &&
      point.x >= Math.min(previous.x, current.x) &&
      point.x <= Math.max(previous.x, current.x)
    ) {
      return true;
    }
    if (
      previous.x === current.x &&
      point.x === previous.x &&
      point.y >= Math.min(previous.y, current.y) &&
      point.y <= Math.max(previous.y, current.y)
    ) {
      return true;
    }
  }
  return false;
}
function expectOrthogonalSegments(points: Point[]) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    expect(previous.x === point.x || previous.y === point.y).toBe(true);
  }
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

describe("routing", () => {
  test("recognizes custom bus and storage nodes by component-library identity", () => {
    const cases = [
      ["ACRealBs", "ac"],
      ["DCRealBs", "dc"],
      ["HydroBus", "h2"],
      ["HydroStorage", "h2"],
      ["HeatBus", "heat"],
      ["HeatStorage", "heat"]
    ] as const;
    for (const [componentLibrary, expectedType] of cases) {
      const node = createNodeFromTemplate({
        kind: `custom-${componentLibrary}`,
        label: componentLibrary,
        categoryLibrary: "自定义设备",
        size: { width: 120, height: 40 },
        params: { component_type: componentLibrary },
        terminalType: expectedType,
        terminalCount: 0,
        custom: true
      }, { x: 200, y: 200 });
      expect(isBusNode(node), componentLibrary).toBe(true);
      expect(getBusTerminalType(node), componentLibrary).toBe(expectedType);
    }

    const derivedHydrogenBus = createNodeFromTemplate({
      kind: "custom-PlantHydrogenBus",
      label: "派生氢母线",
      categoryLibrary: "氢能设备",
      size: { width: 120, height: 40 },
      params: {
        component_type: "PlantHydrogenBus",
        derived_from_component_type: "HydroBus",
        derived_component_type: "PlantHydrogenBus"
      },
      terminalType: "h2",
      terminalCount: 0,
      custom: true
    }, { x: 200, y: 200 });
    expect(isBusNode(derivedHydrogenBus)).toBe(true);
    expect(getBusTerminalType(derivedHydrogenBus)).toBe("h2");

    const ordinaryDevice = createNodeFromTemplate({
      kind: "custom-OrdinaryDevice",
      label: "普通自定义设备",
      categoryLibrary: "交流设备",
      size: { width: 120, height: 40 },
      params: { component_type: "ACGenerator" },
      terminalType: "ac",
      terminalCount: 0,
      custom: true
    }, { x: 200, y: 200 });
    expect(isBusNode(ordinaryDevice)).toBe(false);
  });

  test("projects custom storage connections to the tank boundary", () => {
    const storage = createNodeFromTemplate({
      kind: "custom-HydroStorage",
      label: "自定义储氢罐",
      categoryLibrary: "氢能设备",
      size: { width: 120, height: 60 },
      params: { component_type: "HydroStorage" },
      terminalType: "h2",
      terminalCount: 0,
      custom: true
    }, { x: 200, y: 200 });

    expect(projectPointToBusCenterline(storage, { x: 200, y: 150 })).toEqual({
      x: storage.position.x,
      y: storage.position.y - storage.size.height / 2
    });
  });

  test("projects custom bus anchors to the outer frame and keeps built-in buses on their centerline", () => {
    const customBus = createNodeFromTemplate({
      kind: "custom-ACRealBs",
      label: "自定义交流母线",
      categoryLibrary: "交流设备",
      size: { width: 120, height: 60 },
      params: {
        component_type: "PlantBus",
        derived_from_component_type: "ACRealBs",
        derived_component_type: "PlantBus"
      },
      terminalType: "ac",
      terminalCount: 0,
      custom: true
    }, { x: 200, y: 200 });

    const halfWidth = customBus.size.width * Math.abs(getNodeScaleX(customBus)) / 2;
    const halfHeight = customBus.size.height * Math.abs(getNodeScaleY(customBus)) / 2;
    const left = projectPointToBusCenterline(customBus, { x: customBus.position.x - halfWidth / 2, y: customBus.position.y });
    const right = projectPointToBusCenterline(customBus, { x: customBus.position.x + halfWidth / 2, y: customBus.position.y });
    const top = projectPointToBusCenterline(customBus, { x: customBus.position.x, y: customBus.position.y - halfHeight / 2 });
    const bottom = projectPointToBusCenterline(customBus, { x: customBus.position.x, y: customBus.position.y + halfHeight / 2 });
    expect(left).toEqual({ x: Math.round(customBus.position.x - halfWidth), y: customBus.position.y });
    expect(right).toEqual({ x: Math.round(customBus.position.x + halfWidth), y: customBus.position.y });
    expect(top).toEqual({ x: customBus.position.x, y: Math.round(customBus.position.y - halfHeight) });
    expect(bottom).toEqual({ x: customBus.position.x, y: Math.round(customBus.position.y + halfHeight) });
    expect(getRouteEndpointNormal(customBus, left, { x: 80, y: 200 })).toEqual({ x: -1, y: 0 });
    expect(getRouteEndpointNormal(customBus, right, { x: 320, y: 200 })).toEqual({ x: 1, y: 0 });
    expect(getRouteEndpointNormal(customBus, top, { x: 200, y: 100 })).toEqual({ x: 0, y: -1 });
    expect(getRouteEndpointNormal(customBus, bottom, { x: 200, y: 300 })).toEqual({ x: 0, y: 1 });

    const rotatedBus = { ...customBus, id: "rotated-custom-bus", rotation: 90 };
    const rotatedTop = projectPointToBusCenterline(rotatedBus, { x: rotatedBus.position.x, y: rotatedBus.position.y - halfWidth / 2 });
    expect(rotatedTop).toEqual({ x: rotatedBus.position.x, y: Math.round(rotatedBus.position.y - halfWidth) });
    const rotatedNormal = getRouteEndpointNormal(rotatedBus, rotatedTop, { x: 200, y: 80 });
    expect(rotatedNormal.x === 0).toBe(true);
    expect(rotatedNormal.y).toBe(-1);

    const builtInBus = createDefaultNode("ac-bus", { x: 420, y: 200 });
    expect(projectPointToBusCenterline(builtInBus, { x: 420, y: 150 })).toEqual({ x: 420, y: 200 });
  });

  test("routes a custom bus connection away from the contacted outer face", () => {
    const customBus = createNodeFromTemplate({
      kind: "custom-ACRealBs",
      label: "自定义交流母线",
      categoryLibrary: "交流设备",
      size: { width: 180, height: 80 },
      params: { component_type: "ACRealBs" },
      terminalType: "ac",
      terminalCount: 0,
      custom: true
    }, { x: 480, y: 260 });
    const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-switch", { x: 140, y: 120 }), id: "custom-bus-source" });
    const targetPoint = projectPointToBusCenterline(customBus, { x: 360, y: 260 });
    const edge: Edge = {
      id: "custom-bus-boundary-route",
      sourceId: source.id,
      targetId: customBus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint
    };

    const route = routeEdgesForStoredRendering([source, customBus], [edge], { width: 900, height: 600 })[0];
    const endpoint = route.points[route.points.length - 1];
    const adjacent = route.points[route.points.length - 2];
    expect(endpoint).toEqual({ x: customBus.position.x - customBus.size.width / 2, y: customBus.position.y });
    expect(adjacent.y).toBe(endpoint.y);
    expect(adjacent.x).toBeLessThan(endpoint.x);
  });

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


test("opens saved manual route points without orthogonalizing or rerouting around blockers", () => {
  const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 100, y: 120 }));
  const target = withHiddenDeviceLabel(createDefaultNode("ac-load", { x: 420, y: 220 }));
  const blocker = {
    ...createDefaultNode("static-rect", { x: 260, y: 160 }),
    id: "startup-blocker",
    size: { width: 180, height: 140 }
  };
  const manualPoints = [
    { x: 190, y: 177 },
    { x: 300, y: 161 }
  ];
  const edge: Edge = {
    id: "saved-manual-through-blocker",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: source.terminals[0].id,
    targetTerminalId: target.terminals[0].id,
    manualPoints
  };

  const route = routeEdgesForSavedPathRendering([source, target, blocker], [edge], { width: 560, height: 360 })[0];

  expect(route.points).toEqual([
    getTerminalPoint(source, edge.sourceTerminalId),
    ...manualPoints,
    getTerminalPoint(target, edge.targetTerminalId)
  ]);
  expect(route.path).toBe(pointsToOrthogonalPath(route.points));
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


test("renders axis-locked floating connection previews as direct straight segments", () => {
  const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 160, y: 120 }));
  const sourcePoint = getTerminalPoint(source, "t1");
  const targetPoint = { x: sourcePoint.x + 360, y: sourcePoint.y };
  const edge: Edge = {
    id: "axis-locked-preview",
    sourceId: source.id,
    targetId: "floating-connect-preview-target",
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    sourcePoint,
    targetPoint
  };

  const route = routeEdgesForStoredRendering([source], [edge], { width: 720, height: 320 })[0];

  expect(route.points).toEqual([sourcePoint, targetPoint]);
  expect(route.path).toBe(`M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`);
});


test("renders floating connection previews through manually clicked bend points", () => {
  const source = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 160, y: 180 }));
  const sourcePoint = getTerminalPoint(source, "t1");
  const manualPoints = [
    { x: sourcePoint.x + 120, y: sourcePoint.y },
    { x: sourcePoint.x + 120, y: sourcePoint.y - 92 },
    { x: sourcePoint.x + 320, y: sourcePoint.y - 92 }
  ];
  const targetPoint = { x: sourcePoint.x + 420, y: sourcePoint.y + 56 };
  const route = buildManualConnectionPreviewRoute(sourcePoint, manualPoints, targetPoint, { width: 900, height: 420 });

  expectOrthogonalSegments(route);
  expect(manualPoints.every((point) => pointLiesOnRouteSegments(point, route))).toBe(true);
  expect(pointsToOrthogonalPath(route)).toContain(`L ${manualPoints[1].x} ${manualPoints[1].y}`);
  expect(new Set(route.map((point) => point.y))).toContain(sourcePoint.y - 92);
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

test("rejects ordinary link edges connected to station feeder district source/load devices", () => {
  const target = createDefaultNode("ac-load", { x: 420, y: 100 });
  for (const kind of [
    "ac-station-source",
    "ac-feeder-source",
    "ac-district-source",
    "dc-station-source",
    "dc-feeder-source",
    "dc-district-source",
    "ac-station-load",
    "ac-feeder-load",
    "ac-district-load",
    "dc-station-load",
    "dc-feeder-load",
    "dc-district-load"
  ] as const) {
    const boundaryDevice = createDefaultNode(kind, { x: 100, y: 100 });
    const issues = validateConnectionEndpointRules([boundaryDevice, target], [], {
      id: `${kind}-ordinary-link`,
      sourceId: boundaryDevice.id,
      targetId: target.id,
      sourceTerminalId: boundaryDevice.terminals[0].id,
      targetTerminalId: target.terminals[0].id
    });

    expect(issues, kind).toEqual([expect.objectContaining({
      type: "model-association-link-forbidden",
      message: "厂站/馈线/台区电源负荷只能连接线路类设备，不能使用普通连接线。"
    })]);
  }
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


test("uses impedance glyphs for AC lines and resistance-only glyphs for DC lines", () => {
  expect(getDeviceGlyphVariant("ac-line")).toBe("ac-line");
  expect(getDeviceGlyphVariant("dc-line")).toBe("dc-line");
  expect(getDeviceGlyphVariant("ac-zero-branch")).toBe("line");
  expect(getDeviceGlyphVariant("dc-zero-branch")).toBe("line");
});


test("clamps a moved device inside the display area", () => {
  const node = createDefaultNode("ac-source", { x: -100, y: 900 });
  const position = clampNodePositionToBounds(node, { width: 1980, height: 1024 });

  expect(position.x).toBeGreaterThanOrEqual((node.size.width * Math.abs(node.scaleX ?? node.scale)) / 2);
  expect(position.y).toBeLessThanOrEqual(1024 - (node.size.height * Math.abs(node.scaleY ?? node.scale)) / 2);
});


test("allows canvas to be freely dragged without position clamping", () => {
  const bounds = { width: 1980, height: 1024 };

  expect(normalizeViewBoxToCanvas({ x: -900, y: -700, width: 1200, height: 800 }, bounds)).toMatchObject({
    x: -900,
    y: -700
  });
  expect(normalizeViewBoxToCanvas({ x: 1600, y: 900, width: 1200, height: 800 }, bounds)).toMatchObject({
    x: 1600,
    y: 900
  });
  expect(normalizeViewBoxToCanvas({ x: -2000, y: 1000, width: 3000, height: 1800 }, bounds)).toMatchObject({
    x: -2000,
    y: 1000
  });
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


test("builds visual bounds before a persisted global-line name is hydrated", () => {
  const base = createDefaultNode("ac-source", { x: 160, y: 120 });
  const persistedGlobalLineProjection = {
    ...base,
    name: undefined as unknown as string,
    params: {
      ...base.params,
      idx: "11"
    }
  };

  const bounds = calculateNodeVisualBounds(persistedGlobalLineProjection);

  expect(bounds.left).toBeLessThan(bounds.right);
  expect(bounds.top).toBeLessThan(bounds.bottom);
  expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
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
      .map((_, index) => ({ a: beforePoints[index + 1], b: beforePoints[index + 2] }))
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


test("reroutes saved manual connection lines when a moved graphic blocks their preserved path", () => {
  const source = { ...createDefaultNode("ac-source", { x: 160, y: 140 }), id: "manual-source" };
  const target = { ...createDefaultNode("ac-load", { x: 900, y: 140 }), id: "manual-target" };
  const blocker = { ...createDefaultNode("ac-pv-source", { x: 1000, y: 140 }), id: "manual-moved-pv", name: "交流光伏" };
  const edge: Edge = {
    id: "manual-blocked-after-move",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1"
  };
  const beforeRoutes = routeEdgesForRendering([source, target, blocker], [edge], { width: 1100, height: 420 });
  const savedEdge = edgeWithSavedRouteGeometry(edge, beforeRoutes[0], source, target);
  const longMiddleSegment = beforeRoutes[0].points
    .slice(1, -1)
    .map((_point, index) => ({ a: beforeRoutes[0].points[index + 1], b: beforeRoutes[0].points[index + 2] }))
    .find(({ a, b }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 160);
  expect(savedEdge.manualPoints?.length ?? 0).toBeGreaterThan(0);
  expect(longMiddleSegment).toBeTruthy();
  const movedBlocker = {
    ...blocker,
    position: {
      x: Math.round((longMiddleSegment!.a.x + longMiddleSegment!.b.x) / 2),
      y: Math.round((longMiddleSegment!.a.y + longMiddleSegment!.b.y) / 2)
    }
  };

  const nextEdges = rerouteEdgesAroundMovedNodes(
    [source, target, movedBlocker],
    [savedEdge],
    [movedBlocker.id],
    beforeRoutes,
    { width: 1100, height: 420 },
    [],
    [savedEdge],
    { preserveManualPoints: true }
  );
  const route = routeEdgesForStoredRendering([source, target, movedBlocker], nextEdges, { width: 1100, height: 420 })[0];
  const validation = validateConnectionEdgeRoute(
    [source, target, movedBlocker],
    nextEdges,
    edge.id,
    { width: 1100, height: 420 }
  );

  expect(nextEdges[0]).not.toBe(savedEdge);
  expect(validation.ok).toBe(true);
  expect(routeIntersectsSpecificNodes(route.points, nextEdges[0], [movedBlocker])).toBe(false);
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


test("preserves existing manual route points when automatic edit-mode rebuilds are protected", () => {
  const left = { ...createDefaultNode("ac-line", { x: 160, y: 200 }), id: "left-preserve" };
  const moved = { ...createDefaultNode("ac-line", { x: 560, y: 200 }), id: "moved-preserve" };
  const manualPoints = [
    { x: 280, y: 110 },
    { x: 420, y: 110 },
    { x: 420, y: 300 }
  ];
  const edge = {
    id: "preserve-manual-edit-route",
    sourceId: left.id,
    targetId: moved.id,
    sourceTerminalId: "t2",
    targetTerminalId: "t1",
    manualPoints
  };

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [left, moved],
    [edge],
    [moved.id],
    { width: 820, height: 440 },
    [edge],
    { preserveManualPoints: true }
  );

  expect(rebuilt[0]).toBe(edge);
  expect(rebuilt[0].manualPoints).toEqual(manualPoints);
});


test("removes stale U-shaped connection pockets after a connected device moves", () => {
  const loadBase = withHiddenDeviceLabel(createDefaultNode("ac-load", { x: 300, y: 300 }));
  const load = {
    ...loadBase,
    id: "u-pocket-load",
    terminals: [
      { ...loadBase.terminals[0], anchor: { x: 1, y: 0.5 } },
      ...loadBase.terminals.slice(1)
    ]
  };
  const breaker = withHiddenDeviceLabel({ ...createDefaultNode("ac-box-breaker", { x: 900, y: 300 }), id: "u-pocket-breaker" });
  const movedBreaker = { ...breaker, position: { x: 880, y: 300 } };
  const sourcePoint = getTerminalPoint(load, "t1");
  const oldTargetPoint = getTerminalPoint(breaker, "t1");
  const movedTargetPoint = getTerminalPoint(movedBreaker, "t1");
  const stalePocketY = sourcePoint.y + 280;
  const routePoints = [
    sourcePoint,
    { x: sourcePoint.x + 80, y: sourcePoint.y },
    { x: sourcePoint.x + 80, y: stalePocketY },
    { x: oldTargetPoint.x - 80, y: stalePocketY },
    { x: oldTargetPoint.x - 80, y: oldTargetPoint.y },
    oldTargetPoint
  ];
  const edge: Edge = {
    id: "stale-u-pocket-connection",
    sourceId: load.id,
    targetId: breaker.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    manualPoints: routePoints.slice(1, -1).map((point) => ({ ...point })),
    routePoints: routePoints.map((point) => ({ ...point }))
  };

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [load, movedBreaker],
    [edge],
    [breaker.id],
    { width: 1400, height: 700 },
    [edge],
    { preserveManualPoints: true }
  );
  const rebuiltRoutePoints = rebuilt[0].routePoints ?? [];

  expect(rebuilt[0]).not.toBe(edge);
  expect(rebuiltRoutePoints[0]).toEqual(sourcePoint);
  expect(rebuiltRoutePoints[rebuiltRoutePoints.length - 1]).toEqual(movedTargetPoint);
  expect(rebuiltRoutePoints.some((point) => point.y === stalePocketY)).toBe(false);
  expect(routeBendCountForTest(rebuiltRoutePoints)).toBeLessThanOrEqual(2);
  expectOrthogonalSegments(rebuiltRoutePoints);
});


test("preserves connection manual route geometry when only the device endpoint moves against a bus", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 140, y: 340 }), id: "manual-edge-source" });
  const movedSource = withHiddenDeviceLabel({ ...source, position: { x: 220, y: 420 } });
  const bus = withHiddenDeviceLabel({
    ...createDefaultNode("ac-bus", { x: 560, y: 140 }),
    id: "manual-edge-bus",
    size: { width: 440, height: 16 }
  });
  const sourcePoint = getTerminalPoint(source, "t1");
  const movedSourcePoint = getTerminalPoint(movedSource, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: 520, y: bus.position.y });
  const preservedLanePoint = { x: busPoint.x - 120, y: sourcePoint.y - 150 };
  const routePoints = [
    sourcePoint,
    { x: sourcePoint.x + 64, y: sourcePoint.y },
    { x: sourcePoint.x + 64, y: preservedLanePoint.y },
    preservedLanePoint,
    { x: preservedLanePoint.x, y: busPoint.y },
    busPoint
  ];
  const edge: Edge = {
    id: "manual-device-to-bus-move",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint,
    manualPoints: routePoints.slice(1, -1).map((point) => ({ ...point })),
    routePoints: routePoints.map((point) => ({ ...point }))
  };

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [movedSource, bus],
    [edge],
    [source.id],
    { width: 920, height: 620 },
    [edge],
    { preserveManualPoints: true }
  );
  const rebuiltRoutePoints = rebuilt[0].routePoints;

  expect(rebuilt[0].id).toBe(edge.id);
  expect(rebuiltRoutePoints?.[0]).toEqual(movedSourcePoint);
  expect(rebuiltRoutePoints?.[rebuiltRoutePoints.length - 1]).toEqual(busPoint);
  expect(rebuiltRoutePoints?.some((point) => point.y === preservedLanePoint.y)).toBe(true);
  expect(rebuilt[0].manualPoints?.some((point) => point.y === preservedLanePoint.y)).toBe(true);
});


test("freezes an implicit bus endpoint from the stored route when the opposite device endpoint moves", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 140, y: 340 }), id: "implicit-bus-source" });
  const movedSource = withHiddenDeviceLabel({ ...source, position: { x: 260, y: 420 } });
  const bus = withHiddenDeviceLabel({
    ...createDefaultNode("ac-bus", { x: 560, y: 140 }),
    id: "implicit-target-bus",
    size: { width: 440, height: 16 }
  });
  const sourcePoint = getTerminalPoint(source, "t1");
  const movedSourcePoint = getTerminalPoint(movedSource, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: 480, y: bus.position.y });
  const routePoints = [
    sourcePoint,
    { x: sourcePoint.x + 64, y: sourcePoint.y },
    { x: sourcePoint.x + 64, y: busPoint.y },
    busPoint
  ];
  const edge: Edge = {
    id: "implicit-device-to-bus-move",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1"
  };

  const preserved = preserveConnectionEdgeRouteShape(
    [movedSource, bus],
    edge,
    routePoints,
    { width: 920, height: 620 }
  );
  const preservedRoutePoints = preserved.routePoints ?? [];

  expect(preserved.targetPoint).toEqual(busPoint);
  expect(preservedRoutePoints[0]).toEqual(movedSourcePoint);
  expect(preservedRoutePoints[preservedRoutePoints.length - 1]).toEqual(busPoint);
});


test("reroutes a preserved device-to-bus manual route when the moved endpoint path hits a stationary device", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 140, y: 340 }), id: "blocked-manual-source" });
  const movedSource = withHiddenDeviceLabel({ ...source, position: { x: 220, y: 420 } });
  const blocker = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 284, y: 270 }), id: "stationary-route-blocker" });
  const bus = withHiddenDeviceLabel({
    ...createDefaultNode("ac-bus", { x: 560, y: 140 }),
    id: "blocked-manual-bus",
    size: { width: 440, height: 16 }
  });
  const sourcePoint = getTerminalPoint(source, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: 520, y: bus.position.y });
  const routePoints = [
    sourcePoint,
    { x: sourcePoint.x + 64, y: sourcePoint.y },
    { x: sourcePoint.x + 64, y: sourcePoint.y - 150 },
    { x: busPoint.x - 120, y: sourcePoint.y - 150 },
    { x: busPoint.x - 120, y: busPoint.y },
    busPoint
  ];
  const edge: Edge = {
    id: "blocked-preserved-device-to-bus",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint,
    manualPoints: routePoints.slice(1, -1).map((point) => ({ ...point })),
    routePoints: routePoints.map((point) => ({ ...point }))
  };

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [movedSource, bus, blocker],
    [edge],
    [source.id],
    { width: 920, height: 620 },
    [edge],
    { preserveManualPoints: true }
  );
  const route = routeEdgesForStoredRendering(
    [movedSource, bus, blocker],
    rebuilt,
    { width: 920, height: 620 },
    { preserveManualRouteDisplay: true }
  )[0];
  const validation = validateConnectionEdgeRoute([movedSource, bus, blocker], rebuilt, edge.id, { width: 920, height: 620 });

  expect(rebuilt[0]).not.toBe(edge);
  expect(validation.ok).toBe(true);
  expect(routeIntersectsSpecificNodes(route.points, rebuilt[0], [blocker])).toBe(false);
});


test("preserves manual route display when automatic edit-mode rendering is protected", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 120, y: 120 }), id: "display-source" });
  const target = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 520, y: 120 }), id: "display-target" });
  const edge: Edge = {
    id: "preserve-manual-display",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: "t2",
    targetTerminalId: "t1"
  };
  const bounds = { width: 700, height: 320 };
  const baseRoute = routeOrthogonalEdge(source, target, [source, target], edge, [], bounds);
  const insertSegmentIndex = getMovableRouteSegmentIndexes(baseRoute).find((index) => {
    const from = baseRoute[index];
    const to = baseRoute[index + 1];
    return Boolean(from && to && (from.x === to.x || from.y === to.y) && Math.abs(from.x - to.x) + Math.abs(from.y - to.y) > 80);
  });
  expect(insertSegmentIndex).toBeDefined();
  const from = baseRoute[insertSegmentIndex!];
  const to = baseRoute[insertSegmentIndex! + 1];
  const pointer = from.y === to.y
    ? { x: Math.round((from.x + to.x) / 2), y: from.y + 70 }
    : { x: from.x + 70, y: Math.round((from.y + to.y) / 2) };
  const bendRoute = insertOrthogonalRouteBend(baseRoute, insertSegmentIndex!, pointer, bounds);
  const manualPoints = bendRoute.length > 4 ? bendRoute.slice(2, -2) : bendRoute.slice(1, -1);
  const manualEdge = { ...edge, manualPoints };

  const simplifiedRoute = routeEdgesForStoredRendering([source, target], [manualEdge], bounds)[0];
  const preservedRoute = routeEdgesForStoredRendering(
    [source, target],
    [manualEdge],
    bounds,
    { preserveManualRouteDisplay: true }
  )[0];

  expect(bendRoute).toContainEqual(pointer);
  expect(simplifiedRoute.points).not.toContainEqual(pointer);
  expect(preservedRoute.points).toContainEqual(pointer);
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


test("rebuilds a moved endpoint connection when the preserved route crosses the endpoint device body", () => {
  const source = withHiddenDeviceLabel({
    ...createDefaultNode("ac-source", { x: 360, y: 420 }),
    id: "moved-source-body-cross"
  });
  const bus = {
    ...createDefaultNode("ac-bus", { x: 360, y: 120 }),
    id: "bus-for-body-cross",
    size: { width: 720, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const busPoint = projectPointToBusCenterline(bus, sourcePoint);
  const crossingRoute = [
    sourcePoint,
    { x: sourcePoint.x, y: busPoint.y },
    busPoint
  ];
  const edge: Edge = {
    id: "moved-source-crossing-route",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint,
    routePoints: crossingRoute,
    manualPoints: crossingRoute.slice(1, -1)
  };

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [source, bus],
    [edge],
    [source.id],
    { width: 900, height: 620 },
    [edge],
    { preserveManualPoints: true }
  );
  const route = routeEdgesForStoredRendering(
    [source, bus],
    rebuilt,
    { width: 900, height: 620 },
    { preserveManualRouteDisplay: true }
  )[0];

  expect(rebuilt[0]).not.toBe(edge);
  expect(route?.points.length ?? 0).toBeGreaterThanOrEqual(2);
  expect(validateConnectionEdgeRoute([source, bus], rebuilt, edge.id, { width: 900, height: 620 }).ok).toBe(true);
});


test("reroutes a moved endpoint connection when the second source segment crosses the endpoint device body", () => {
  const source = withHiddenDeviceLabel({
    ...createDefaultNode("ac-line", { x: 360, y: 420 }),
    id: "moved-line-body-cross"
  });
  const bus = {
    ...createDefaultNode("ac-bus", { x: 360, y: 120 }),
    id: "bus-for-moved-line-body-cross",
    size: { width: 720, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const leftLane = { x: sourcePoint.x - 80, y: sourcePoint.y };
  const rightLane = { x: source.position.x + source.size.width / 2 + 120, y: sourcePoint.y };
  const busPoint = projectPointToBusCenterline(bus, { x: rightLane.x, y: bus.position.y });
  const crossingRoute = [
    sourcePoint,
    leftLane,
    rightLane,
    busPoint
  ];
  const edge: Edge = {
    id: "moved-line-second-segment-crossing-route",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint,
    routePoints: crossingRoute,
    manualPoints: crossingRoute.slice(1, -1)
  };

  expect(routeIntersectsSpecificNodes(crossingRoute, edge, [source])).toBe(true);

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [source, bus],
    [edge],
    [source.id],
    { width: 900, height: 620 },
    [edge],
    { preserveManualPoints: true }
  );
  const route = routeEdgesForStoredRendering(
    [source, bus],
    rebuilt,
    { width: 900, height: 620 },
    { preserveManualRouteDisplay: true }
  )[0];

  expect(rebuilt[0]).not.toBe(edge);
  expect(routeIntersectsSpecificNodes(route.points, rebuilt[0], [source])).toBe(false);
  expect(validateConnectionEdgeRoute([source, bus], rebuilt, edge.id, { width: 900, height: 620 }).ok).toBe(true);
});


test("reroutes a moved target endpoint connection when the route enters the endpoint device body", () => {
  const bus = {
    ...createDefaultNode("ac-bus", { x: 340, y: 120 }),
    id: "bus-for-ground-disconnector-body-cross",
    size: { width: 520, height: 16 }
  };
  const target = withHiddenDeviceLabel({
    ...createDefaultNode("ac-ground-disconnector", { x: 340, y: 300 }),
    id: "moved-ground-disconnector-body-cross"
  });
  const targetPoint = getTerminalPoint(target, "t1");
  const sourcePoint = projectPointToBusCenterline(bus, { x: target.position.x + 84, y: bus.position.y });
  const crossingRoute = [
    sourcePoint,
    { x: sourcePoint.x, y: targetPoint.y },
    targetPoint
  ];
  const edge: Edge = {
    id: "bus-to-moved-ground-disconnector-body-cross",
    sourceId: bus.id,
    targetId: target.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    sourcePoint,
    targetPoint,
    routePoints: crossingRoute,
    manualPoints: crossingRoute.slice(1, -1)
  };

  expect(routeIntersectsEndpointNodeBodies(crossingRoute, edge, [target])).toBe(true);

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [bus, target],
    [edge],
    [target.id],
    { width: 720, height: 480 },
    [edge],
    { preserveManualPoints: true }
  );
  const route = routeEdgesForStoredRendering(
    [bus, target],
    rebuilt,
    { width: 720, height: 480 },
    { preserveManualRouteDisplay: true }
  )[0];

  expect(rebuilt[0]).not.toBe(edge);
  expect(routeIntersectsEndpointNodeBodies(route.points, rebuilt[0], [target])).toBe(false);
  expect(validateConnectionEdgeRoute([bus, target], rebuilt, edge.id, { width: 720, height: 480 }).ok).toBe(true);
});


test("redraws connection routes by replacing stale explicit bus endpoint points", () => {
  const source = { ...createDefaultNode("ac-load", { x: 220, y: 160 }), id: "source-load" };
  const bus = { ...createDefaultNode("ac-bus", { x: 520, y: 160 }), id: "target-bus" };
  const expectedBusPoint = projectPointToBusCenterline(bus, {
    x: getTerminalPoint(source, "t1").x,
    y: bus.position.y
  });
  const edge: Edge = {
    id: "bus-redraw-edge",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: { x: 560, y: 160 },
    manualPoints: [
      { x: 220, y: 300 },
      { x: 560, y: 300 }
    ]
  };

  const redrawn = redrawConnectionRoutesForEdges([source, bus], [edge], [edge.id], { width: 760, height: 360 });
  const redrawnEdge = redrawn[0];
  const route = routeEdgesForRendering([source, bus], redrawn, { width: 760, height: 360 })[0];

  expect(redrawnEdge).not.toBe(edge);
  expect(redrawnEdge.targetPoint).toEqual(expectedBusPoint);
  expect(redrawnEdge.targetPoint).not.toEqual(edge.targetPoint);
  expect(redrawnEdge.manualPoints?.length ?? 0).toBeLessThan(edge.manualPoints!.length);
  expect(route.points[route.points.length - 1]).toEqual(redrawnEdge.targetPoint);
});


test("realigns a connection bus landing point to the previous segment extension before automatic alignment redraw", () => {
  const source = { ...createDefaultNode("ac-source", { x: 280, y: 300 }), id: "aligned-source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 520, y: 120 }),
    id: "aligned-bus",
    size: { width: 520, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const staleBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x + 120, y: bus.position.y });
  const extensionX = sourcePoint.x - 80;
  const expectedBusPoint = projectPointToBusCenterline(bus, { x: extensionX, y: bus.position.y });
  const routePoints = [
    sourcePoint,
    { x: extensionX, y: sourcePoint.y },
    { x: extensionX, y: bus.position.y + 60 },
    { x: staleBusPoint.x, y: bus.position.y + 60 },
    staleBusPoint
  ];
  const edge: Edge = {
    id: "auto-align-bus-landing",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: staleBusPoint,
    routePoints
  };

  const realigned = realignConnectionEdgeBusEndpointPoints([source, bus], edge);
  const redrawn = redrawConnectionRoutesForEdges([source, bus], [realigned], [edge.id], { width: 900, height: 460 });
  const route = routeEdgesForRendering([source, bus], redrawn, { width: 900, height: 460 })[0];

  expect(realigned.targetPoint).toEqual(expectedBusPoint);
  expect(redrawn[0].targetPoint).toEqual(expectedBusPoint);
  expect(route.points[route.points.length - 1]).toEqual(expectedBusPoint);
  expect(route.points).not.toContainEqual(staleBusPoint);
  expect(Math.abs(expectedBusPoint.x - sourcePoint.x)).toBeLessThan(Math.abs(staleBusPoint.x - sourcePoint.x));
  expectOrthogonalSegments(route.points);
});


test("redraws connection routes and realigns bus landing points to previous segment extensions", () => {
  const source = { ...createDefaultNode("ac-source", { x: 280, y: 300 }), id: "redraw-align-source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 520, y: 120 }),
    id: "redraw-align-bus",
    size: { width: 520, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const staleBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x + 120, y: bus.position.y });
  const extensionX = sourcePoint.x - 80;
  const expectedBusPoint = projectPointToBusCenterline(bus, { x: extensionX, y: bus.position.y });
  const edge: Edge = {
    id: "redraw-align-bus-landing",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: staleBusPoint,
    routePoints: [
      sourcePoint,
      { x: extensionX, y: sourcePoint.y },
      { x: extensionX, y: bus.position.y + 60 },
      { x: staleBusPoint.x, y: bus.position.y + 60 },
      staleBusPoint
    ]
  };

  const redrawn = redrawConnectionRoutesForEdges([source, bus], [edge], [edge.id], { width: 900, height: 460 });
  const route = routeEdgesForRendering([source, bus], redrawn, { width: 900, height: 460 })[0];

  expect(redrawn[0].targetPoint).toEqual(expectedBusPoint);
  expect(route.points[route.points.length - 1]).toEqual(expectedBusPoint);
  expect(route.points).not.toContainEqual(staleBusPoint);
  expectOrthogonalSegments(route.points);
});


test("redraws manually stored connection routes by realigning bus landing points to the main extension", () => {
  const source = { ...createDefaultNode("ac-source", { x: 280, y: 360 }), id: "manual-redraw-align-source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 520, y: 120 }),
    id: "manual-redraw-align-bus",
    size: { width: 560, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const staleBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x + 170, y: bus.position.y });
  const extensionX = sourcePoint.x;
  const expectedBusPoint = projectPointToBusCenterline(bus, { x: extensionX, y: bus.position.y });
  const edge: Edge = {
    id: "manual-redraw-align-bus-landing",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: staleBusPoint,
    manualPoints: [
      { x: extensionX, y: bus.position.y + 180 },
      { x: staleBusPoint.x, y: bus.position.y + 180 }
    ]
  };

  const redrawn = redrawConnectionRoutesForEdges([source, bus], [edge], [edge.id], { width: 900, height: 520 });
  const route = routeEdgesForRendering([source, bus], redrawn, { width: 900, height: 520 })[0];

  expect(redrawn[0].targetPoint).toEqual(expectedBusPoint);
  expect(route.points[route.points.length - 1]).toEqual(expectedBusPoint);
  expect(route.points).not.toContainEqual(staleBusPoint);
  expectOrthogonalSegments(route.points);
});


test("aligns a dragged bus endpoint to the previous route segment extension", () => {
  const bus = {
    ...createDefaultNode("ac-bus", { x: 320, y: 120 }),
    id: "ctrl-drag-bus",
    size: { width: 420, height: 16 }
  };
  const routePoints = [
    { x: 180, y: 640 },
    { x: 180, y: 180 },
    { x: 310, y: 180 },
    { x: 310, y: 120 }
  ];

  expect(alignBusEndpointPointToRouteSegmentExtension(bus, routePoints, "target")).toEqual({
    x: 180,
    y: 120
  });
});


test("aligns a target bus endpoint past endpoint-side dogleg segments", () => {
  const bus = {
    ...createDefaultNode("ac-bus", { x: 600, y: 120 }),
    id: "target-dogleg-bus",
    size: { width: 680, height: 16 }
  };
  const routePoints = [
    { x: 480, y: 430 },
    { x: 590, y: 430 },
    { x: 590, y: 170 },
    { x: 820, y: 170 },
    { x: 820, y: 120 },
    { x: 820, y: 120 }
  ];

  expect(alignBusEndpointPointToRouteSegmentExtension(bus, routePoints, "target")).toEqual({
    x: 590,
    y: 120
  });
});


test("aligns a source bus endpoint past endpoint-side dogleg segments", () => {
  const bus = {
    ...createDefaultNode("ac-bus", { x: 600, y: 720 }),
    id: "source-dogleg-bus",
    size: { width: 680, height: 16 }
  };
  const routePoints = [
    { x: 820, y: 720 },
    { x: 820, y: 770 },
    { x: 590, y: 770 },
    { x: 590, y: 1040 },
    { x: 480, y: 1040 },
    { x: 480, y: 1120 }
  ];

  expect(alignBusEndpointPointToRouteSegmentExtension(bus, routePoints, "source")).toEqual({
    x: 590,
    y: 720
  });
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


test("does not route moved-to-stationary connections around other moved devices", () => {
  const movedSource = { ...createDefaultNode("ac-line", { x: 180, y: 180 }), id: "moved-source" };
  const stationaryTarget = { ...createDefaultNode("ac-line", { x: 780, y: 180 }), id: "stationary-target" };
  const movedBlocker = { ...createDefaultNode("ac-line", { x: 480, y: 180 }), id: "moved-blocker" };
  const edge: Edge = {
    id: "moved-to-stationary",
    sourceId: movedSource.id,
    targetId: stationaryTarget.id,
    sourceTerminalId: "t2",
    targetTerminalId: "t1"
  };

  const rebuilt = rebuildExternalConnectionRoutesForMovedNodes(
    [movedSource, stationaryTarget, movedBlocker],
    [edge],
    [movedSource.id, movedBlocker.id],
    { width: 1000, height: 420 }
  );
  const routePoints = rebuilt[0].routePoints ?? routeEdgesForStoredRendering([movedSource, stationaryTarget, movedBlocker], rebuilt, { width: 1000, height: 420 })[0].points;

  expect(routePoints.some((point, index) =>
    index > 0 && segmentIntersectsNodeBody(routePoints[index - 1], point, movedBlocker)
  )).toBe(true);
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
  const blockerRadians = degreesToRadians(blocker.rotation);
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


test("preserves an explicit bus endpoint when committing an optimized route", () => {
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
  const prepared = prepareConnectionEdgeForCommit(nodes, [edge], edge.id, { width: 700, height: 320 });

  expect(prepared.ok).toBe(true);
  expect(prepared.edge?.targetPoint).toEqual(initialBusPoint);
  const afterRoute = routeEdgesForRendering(nodes, [prepared.edge!], { width: 700, height: 320 })[0].points;
  expect(afterRoute[afterRoute.length - 1]).toEqual(initialBusPoint);
  expectOrthogonalSegments(afterRoute);
});


test("preserves a lower explicit bus endpoint under a single-terminal source", () => {
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
  expect(prepared.edge?.targetPoint).toEqual(initialBusPoint);
  expect(route[0]).toEqual(sourcePoint);
  expect(route[route.length - 1]).toEqual(prepared.edge?.targetPoint);
  expectOrthogonalSegments(route);
});


test("does not slide the bus endpoint when the opposite device moves", () => {
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

  expect(patch).toBeNull();
});


test("does not slide bus endpoints for manual routes when the opposite device moves", () => {
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

  expect(patch).toBeNull();
});


test("does not slide a lower bus endpoint to a moved single-terminal source outward stub", () => {
  const source = { ...createDefaultNode("ac-source", { x: 400, y: 260 }), id: "source" };
  const movedSource = { ...source, position: { x: 470, y: 260 } };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 620, y: 680 }),
    id: "lower-bus",
    size: { width: 900, height: 28 }
  };
  const originalSourcePoint = getTerminalPoint(source, "t1");
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

  expect(patch).toBeNull();
});


test("does not slide a bus endpoint through an outward stub when the direct terminal segment would be sideways", () => {
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

  expect(patch).toBeNull();
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


test("does not slide either bus endpoint for a moved two-terminal device connected through outward stubs", () => {
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

  expect(upperPatch).toBeNull();
  expect(lowerPatch).toBeNull();
});


test("does not slide the opposite bus endpoint while a connection endpoint is being rewired or dragged", () => {
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

  expect(patch).toBeNull();
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


test("renders custom static button graphics during drawing previews", () => {
  const template: DeviceTemplate = {
    kind: "custom-StaticButton-3",
    label: "操作按钮",
    categoryLibrary: "静态图元",
    size: { width: 128, height: 54 },
    params: {
      text: "操作按钮",
      fillColor: "#ffffff",
      strokeColor: "#0f172a",
      textColor: "#111827",
      line_width: "2",
      cornerRadius: "6"
    },
    terminalType: "ac",
    terminalCount: 0,
    terminalTypes: [],
    custom: true,
    parameterDefinitions: [],
    stateDefinitions: []
  };
  const node = createStaticBoxNodeFromDrawing(
    template,
    [
      { x: 40, y: 40 },
      { x: 200, y: 108 }
    ],
    "layer-user"
  );

  const geometryMarkup = renderToStaticMarkup(createElement("svg", null, createElement(DeviceGlyph, { node, mode: "geometry" })));
  const textMarkup = renderToStaticMarkup(createElement("svg", null, createElement(DeviceGlyph, { node, mode: "text" })));

  expect(geometryMarkup).toContain('stroke="#0f172a"');
  expect(geometryMarkup).toContain('width="160"');
  expect(geometryMarkup).toContain('height="68"');
  expect(geometryMarkup).not.toContain('stroke="none"');
  expect(textMarkup).toContain("操作按钮");
});


test("renders custom static graphics in box drawing previews with dragged dimensions", () => {
  const template: DeviceTemplate = {
    kind: "custom-StaticButton-4",
    label: "操作按钮",
    categoryLibrary: "静态图元",
    size: { width: 128, height: 54 },
    params: {
      text: "操作按钮",
      fillColor: "#ffffff",
      strokeColor: "#0f172a",
      textColor: "#111827",
      line_width: "2",
      cornerRadius: "6"
    },
    terminalType: "ac",
    terminalCount: 0,
    terminalTypes: [],
    custom: true,
    parameterDefinitions: [],
    stateDefinitions: []
  };
  const points = [
    { x: 40, y: 50 },
    { x: 240, y: 130 }
  ];
  const renderPreview = createRenderStaticBoxDrawingPreview({
    MemoDeviceGlyph: DeviceGlyph,
    activeLayerId: "layer-user",
    circle: "circle",
    colorDisplayMode: "energy",
    colorPalette: DEFAULT_COLOR_PALETTE,
    createStaticBoxNodeFromDrawing,
    formatSvgNumber: (value: number) => String(Number(value.toFixed(3))),
    g: "g",
    nodeGeometryTransform: () => "",
    rect: "rect",
    renderNodePreviewImageContent: (node: ReturnType<typeof createStaticBoxNodeFromDrawing>, clipId: string) =>
      createElement("g", { "data-preview-image": clipId }, createElement("rect", { width: node.size.width, height: node.size.height })),
    resolveNodeStateVisual: () => null,
    staticDrawing: {
      kind: template.kind,
      template,
      points: [points[0]],
      previewPoint: points[1]
    },
    staticDrawingPreviewPoints: () => points
  });

  const markup = renderToStaticMarkup(createElement("svg", null, renderPreview()));

  expect(markup).toContain("static-drawing-preview-box");
  expect(markup).toContain('stroke="#0f172a"');
  expect(markup).toContain('width="200"');
  expect(markup).toContain('height="80"');
  expect(markup).toContain("操作按钮");
  expect(markup).toContain("data-preview-image");
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


test("does not refresh crossing arcs on the saved-path startup render unless requested", () => {
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

  const startupRoutes = routeEdgesForSavedPathRendering([], edges, { width: 700, height: 520 });
  const refreshedRoutes = routeEdgesForSavedPathRendering([], edges, { width: 700, height: 520 }, {
    refreshCrossingArcs: true
  });

  expect(startupRoutes.find((route) => route.edgeId === "vertical")?.path).not.toContain("Q");
  expect(startupRoutes.find((route) => route.edgeId === "horizontal")?.path).not.toContain("Q");
  expect(refreshedRoutes.find((route) => route.edgeId === "vertical")?.path).toContain("Q");
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


test("reuses saved route points on open without clamping or copying them", () => {
  const reusableEdge: Edge = {
    id: "inside-saved-direct-route",
    sourceId: "source",
    targetId: "target",
    routePoints: [
      { x: 40, y: 60 },
      { x: 160, y: 60 }
    ]
  };
  const outsideEdge: Edge = {
    id: "outside-saved-direct-route",
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
  const outsideRoute = routeEdgesForSavedPathRendering([], [outsideEdge], { width: 400, height: 300 }, {
    refreshCrossingArcs: false
  })[0];

  expect(reusableRoute.points).toBe(reusableEdge.routePoints);
  expect(outsideRoute.points).toBe(outsideEdge.routePoints);
  expect(outsideRoute.points).toEqual([
    { x: -4, y: 60.4 },
    { x: 460, y: 340 }
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
});
