import { describe, expect, test } from "vitest";
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
  modelInteractionTerminalConnectionLocalPointsByNodeId,
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
  projectPointToModelInteractionBoundary,
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
function expectOrthogonalSegments(points: Point[]) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    expect(previous.x === point.x || previous.y === point.y).toBe(true);
  }
}

describe("routing", () => {
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
      line_width: "7"
    }
  };
  const customLine = {
    ...legacyLine,
    params: {
      ...legacyLine.params,
      line_width: "5"
    }
  };

  expect(getDeviceStrokeWidth(legacyLine)).toBe(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH);
  expect(normalizeNodeTerminalsByTemplate(legacyLine).params.line_width).toBe(String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH));
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


test("inserts a manual bend into a routable line-like device at the pointer position", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    { x: 80, y: 120 },
    { x: 520, y: 120 },
    "layer-a"
  );

  const bent = insertRoutableLineDeviceBend(line, 0, { x: 260, y: 190 }, { width: 700, height: 360 });
  const points = routableLineDeviceCanvasPoints(bent);

  expect(bent).not.toBe(line);
  expect(points).toContainEqual({ x: 260, y: 190 });
  expect(points[0]).toEqual({ x: 80, y: 120 });
  expect(points[points.length - 1]).toEqual({ x: 520, y: 120 });
  expectOrthogonalSegments(points);
});


test("moves any middle segment of a routable line-like device without moving its endpoints", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    { x: 80, y: 120 },
    { x: 520, y: 120 },
    "layer-a"
  );
  const bent = insertRoutableLineDeviceBend(line, 0, { x: 260, y: 190 }, { width: 700, height: 360 });
  const bendPoints = routableLineDeviceCanvasPoints(bent);
  const verticalSegmentIndex = bendPoints.findIndex((point, index) => {
    const next = bendPoints[index + 1];
    return Boolean(next && point.x === next.x && point.y !== next.y);
  });
  expect(verticalSegmentIndex).toBeGreaterThan(0);

  const moved = moveRoutableLineDeviceSegment(
    bent,
    verticalSegmentIndex,
    "vertical",
    { x: 320, y: 170 },
    { width: 700, height: 360 }
  );
  const movedPoints = routableLineDeviceCanvasPoints(moved);

  expect(moved).not.toBe(bent);
  expect(movedPoints[0]).toEqual({ x: 80, y: 120 });
  expect(movedPoints[movedPoints.length - 1]).toEqual({ x: 520, y: 120 });
  expect(movedPoints).toContainEqual({ x: 320, y: 120 });
  expect(movedPoints).toContainEqual({ x: 320, y: 190 });
  expectOrthogonalSegments(movedPoints);
});


test("moves endpoint-adjacent routable line-like device segments while keeping the route orthogonal", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    { x: 80, y: 120 },
    { x: 520, y: 120 },
    "layer-a"
  );
  const bent = insertRoutableLineDeviceBend(line, 0, { x: 260, y: 190 }, { width: 700, height: 360 });

  const moved = moveRoutableLineDeviceSegment(
    bent,
    0,
    "horizontal",
    { x: 170, y: 90 },
    { width: 700, height: 360 }
  );
  const movedPoints = routableLineDeviceCanvasPoints(moved);

  expect(movedPoints[0]).toEqual({ x: 80, y: 120 });
  expect(movedPoints[movedPoints.length - 1]).toEqual({ x: 520, y: 120 });
  expect(movedPoints).toContainEqual({ x: 260, y: 90 });
  expectOrthogonalSegments(movedPoints);
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


test("preserves routable line-like manual bends when only the device endpoint moves against a bus", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 260 }), id: "manual-line-source" };
  const movedSource = { ...source, position: { x: 180, y: 340 } };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 560, y: 120 }),
    id: "manual-line-bus",
    size: { width: 420, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const movedSourcePoint = getTerminalPoint(movedSource, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: 520, y: bus.position.y });
  const preservedLanePoint = { x: busPoint.x - 120, y: sourcePoint.y - 80 };
  const manualRoutePoints = [
    sourcePoint,
    { x: sourcePoint.x + 64, y: sourcePoint.y },
    { x: sourcePoint.x + 64, y: preservedLanePoint.y },
    preservedLanePoint,
    { x: preservedLanePoint.x, y: busPoint.y },
    busPoint
  ];
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
  const manualLine = setRoutableLineDeviceCanvasPoints(line, manualRoutePoints);

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [movedSource, bus, manualLine],
    [manualLine.id],
    { width: 900, height: 560 },
    [source, bus, manualLine],
    { movedNodeIds: [source.id] }
  );
  const routePoints = routableLineDeviceCanvasPoints(updates[0]);

  expect(updates.map((node) => node.id)).toEqual([manualLine.id]);
  expect(routePoints[0]).toEqual(movedSourcePoint);
  expect(routePoints[routePoints.length - 1]).toEqual(busPoint);
  expect(routePoints.some((point) => point.y === preservedLanePoint.y)).toBe(true);
  expect(routeBendCountForTest(routePoints)).toBeGreaterThan(1);
});


test("removes unnecessary preserved doglegs when a routable line endpoint moves to a simpler path", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const loadBase = createDefaultNode("ac-load", { x: 335, y: 666 });
  const load = {
    ...loadBase,
    id: "dogleg-line-load",
    terminals: [
      { ...loadBase.terminals[0], anchor: { x: 0.5, y: 0 } },
      ...loadBase.terminals.slice(1)
    ]
  };
  const breaker = { ...createDefaultNode("ac-box-breaker", { x: 860, y: 168 }), id: "dogleg-line-breaker" };
  const start = getTerminalPoint(load, "t1");
  const oldEnd = { x: 733, y: 168 };
  const end = getTerminalPoint(breaker, "t1");
  const preservedLaneY = 392;
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    oldEnd,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(load, "t1"),
      target: { nodeId: "old-target", terminalId: "t1" }
    }
  );
  const doglegLine = setRoutableLineDeviceCanvasPoints(line, [
    start,
    { x: 556, y: start.y },
    { x: 556, y: preservedLaneY },
    { x: 652, y: preservedLaneY },
    { x: 652, y: oldEnd.y },
    oldEnd
  ]);

  const updated = setRoutableLineDeviceEndpointsPreservingRoute(
    doglegLine,
    start,
    end,
    {
      source: routableLineDeviceEndpointRefForNode(load, "t1"),
      target: routableLineDeviceEndpointRefForNode(breaker, "t1")
    },
    new Map([
      [load.id, load],
      [breaker.id, breaker]
    ]),
    { width: 1600, height: 900 }
  );
  const routePoints = routableLineDeviceCanvasPoints(updated);

  expect(routePoints[0]).toEqual(start);
  expect(routePoints[routePoints.length - 1]).toEqual(end);
  expect(routePoints.some((point) => point.y === preservedLaneY)).toBe(false);
  expect(routeBendCountForTest(routePoints)).toBeLessThanOrEqual(2);
  expectOrthogonalSegments(routePoints);
});


test("adds endpoint stubs when a two-point routable line moves against a bus", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 260 }), id: "short-line-source" };
  const movedSource = { ...source, position: { x: 180, y: 420 } };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 560, y: 260 }),
    id: "short-line-bus",
    size: { width: 420, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const movedSourcePoint = getTerminalPoint(movedSource, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: 520, y: bus.position.y });
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

  const updated = setRoutableLineDeviceEndpointsPreservingRoute(
    line,
    movedSourcePoint,
    busPoint,
    routableLineDeviceEndpointRefs(line),
    new Map([
      [movedSource.id, movedSource],
      [bus.id, bus]
    ]),
    { width: 900, height: 640 }
  );
  const updatedPoints = routableLineDeviceCanvasPoints(updated);

  expect(updatedPoints.length).toBeGreaterThan(2);
  expect(updatedPoints[0]).toEqual(movedSourcePoint);
  expect(updatedPoints[1]).toEqual({ x: movedSourcePoint.x + 28, y: movedSourcePoint.y });
  expect(updatedPoints[updatedPoints.length - 2]).toEqual({ x: busPoint.x, y: busPoint.y + 28 });
  expect(updatedPoints[updatedPoints.length - 1]).toEqual(busPoint);
  expectOrthogonalSegments(updatedPoints);
});


test("reroutes a preserved routable line route when the moved endpoint path hits a stationary device", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 260 }), id: "blocked-manual-line-source" };
  const movedSource = { ...source, position: { x: 180, y: 340 } };
  const blocker = { ...createDefaultNode("ac-source", { x: 360, y: 250 }), id: "blocked-manual-line-stationary" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 560, y: 120 }),
    id: "blocked-manual-line-bus",
    size: { width: 420, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: 520, y: bus.position.y });
  const blockedLanePoint = { x: busPoint.x - 120, y: sourcePoint.y - 80 };
  const manualRoutePoints = [
    sourcePoint,
    { x: sourcePoint.x + 64, y: sourcePoint.y },
    { x: sourcePoint.x + 64, y: blockedLanePoint.y },
    blockedLanePoint,
    { x: blockedLanePoint.x, y: busPoint.y },
    busPoint
  ];
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
  const manualLine = setRoutableLineDeviceCanvasPoints(line, manualRoutePoints);

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [movedSource, bus, blocker, manualLine],
    [manualLine.id],
    { width: 900, height: 560 },
    [source, bus, blocker, manualLine],
    { movedNodeIds: [source.id] }
  );
  const routePoints = routableLineDeviceCanvasPoints(updates[0]);

  expect(updates.map((node) => node.id)).toEqual([manualLine.id]);
  expect(routePoints[0]).toEqual(getTerminalPoint(movedSource, "t1"));
  expect(routePoints[routePoints.length - 1]).toEqual(busPoint);
  expect(routeIntersectsSpecificNodes(routePoints, {
    id: "blocked-routable-line-route",
    sourceId: source.id,
    targetId: bus.id
  }, [blocker])).toBe(false);
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


test("keeps routable line-like device routes orthogonal after attached devices are scaled and rotated", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-box-breaker", { x: 180, y: 120 }), id: "source-node" };
  const target = { ...createDefaultNode("ac-load", { x: 620, y: 320 }), id: "target-node" };
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    getTerminalPoint(source, "t2"),
    getTerminalPoint(target, "t1"),
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t2"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );
  const scaledSource = { ...source, rotation: 30, scale: 1.6, scaleX: 1.6, scaleY: 0.7 };
  const scaledTarget = { ...target, rotation: -45, scale: 1.4, scaleX: 0.8, scaleY: 1.4 };

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [scaledSource, scaledTarget, line],
    [line.id],
    { width: 900, height: 640 },
    [source, target, line]
  );

  expect(updates.map((node) => node.id)).toEqual([line.id]);
  expect(getTerminalPoint(updates[0], "t1")).toEqual(getTerminalPoint(scaledSource, "t2"));
  expect(getTerminalPoint(updates[0], "t2")).toEqual(getTerminalPoint(scaledTarget, "t1"));
  expectOrthogonalSegments(routableLineDeviceCanvasPoints(updates[0]));
});


test("routes routable line-like devices around endpoint device bodies", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-box-breaker", { x: 180, y: 200 }), id: "source-node" };
  const target = { ...createDefaultNode("ac-source", { x: 520, y: 200 }), id: "target-node" };
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    getTerminalPoint(source, "t2"),
    getTerminalPoint(target, "t1"),
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t2"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );

  const routed = routeRoutableLineDevice(line, [source, target, line], { width: 760, height: 420 });
  const points = routableLineDeviceCanvasPoints(routed);

  expectOrthogonalSegments(points);
  expect(points[0]).toEqual(getTerminalPoint(source, "t2"));
  expect(points[points.length - 1]).toEqual(getTerminalPoint(target, "t1"));
  for (let index = 1; index < points.length - 1; index += 1) {
    expect(segmentIntersectsNodeBody(points[index - 1], points[index], target)).toBe(false);
  }
});


test("routes routable line-like devices around non-endpoint blockers", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-box-breaker", { x: 100, y: 200 }), id: "source-node" };
  const target = { ...createDefaultNode("ac-box-breaker", { x: 700, y: 200 }), id: "target-node" };
  const blocker = { ...createDefaultNode("ac-source", { x: 400, y: 200 }), id: "middle-blocker" };
  const start = getTerminalPoint(source, "t2");
  const end = getTerminalPoint(target, "t1");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t2"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );
  const directPoints = routableLineDeviceCanvasPoints(line);

  expect(directPoints.some((point, index) =>
    index > 0 && segmentIntersectsNodeBody(directPoints[index - 1], point, blocker)
  )).toBe(true);

  const routed = routeRoutableLineDevice(line, [source, blocker, target, line], { width: 900, height: 520 });
  const points = routableLineDeviceCanvasPoints(routed);

  expectOrthogonalSegments(points);
  expect(points[0]).toEqual(start);
  expect(points[points.length - 1]).toEqual(end);
  for (let index = 1; index < points.length; index += 1) {
    expect(segmentIntersectsNodeBody(points[index - 1], points[index], blocker)).toBe(false);
  }
});


test("does not detour routable line-like devices around non-endpoint wire-like devices", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line");
  const source = { ...createDefaultNode("dc-breaker", { x: 120, y: 200 }), id: "source-node" };
  const target = { ...createDefaultNode("dc-breaker", { x: 680, y: 200 }), id: "target-node" };
  const wireLikeDevice = { ...createDefaultNode("dc-line", { x: 400, y: 200 }), id: "wire-like-device" };
  const start = getTerminalPoint(source, "t2");
  const end = getTerminalPoint(target, "t1");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t2"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );

  const routed = routeRoutableLineDevice(line, [source, wireLikeDevice, target, line], { width: 900, height: 500 });
  const points = routableLineDeviceCanvasPoints(routed);

  expect(points[0]).toEqual(start);
  expect(points[points.length - 1]).toEqual(end);
  expect(new Set(points.map((point) => point.y))).toEqual(new Set([start.y]));
});


test("repairs saved routable line-like device paths that cross endpoint device bodies", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-box-breaker", { x: 180, y: 200 }), id: "source-node" };
  const target = { ...createDefaultNode("ac-source", { x: 520, y: 200 }), id: "target-node" };
  const start = getTerminalPoint(source, "t2");
  const end = getTerminalPoint(target, "t1");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t2"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );
  const crossingCanvasPoints = [
    start,
    { x: start.x + 28, y: start.y },
    { x: end.x + 28, y: end.y },
    end
  ];
  const crossingLine = {
    ...line,
    params: {
      ...line.params,
      [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify(
        crossingCanvasPoints.map((point) => ({
          x: point.x - line.position.x,
          y: point.y - line.position.y
        }))
      )
    }
  };

  expect(
    routableLineDeviceCanvasPoints(crossingLine)
      .slice(1, -1)
      .some((point, index, middlePoints) => {
        const previous = index === 0 ? start : middlePoints[index - 1];
        return segmentIntersectsNodeBody(previous, point, target);
      })
  ).toBe(true);

  const repairedNodes = repairUnsafeRoutableLineDeviceRoutes([source, target, crossingLine], { width: 760, height: 420 });
  const repairedLine = repairedNodes.find((node) => node.id === line.id);
  expect(repairedLine).toBeDefined();
  expect(repairedLine).not.toBe(crossingLine);
  const points = routableLineDeviceCanvasPoints(repairedLine!);

  expectOrthogonalSegments(points);
  expect(points[0]).toEqual(start);
  expect(points[points.length - 1]).toEqual(end);
  for (let index = 1; index < points.length - 1; index += 1) {
    expect(segmentIntersectsNodeBody(points[index - 1], points[index], target)).toBe(false);
  }
});


test("does not bulk-reroute stored routable lines solely for endpoint stub direction", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line");
  const source = { ...createDefaultNode("dc-source", { x: 100, y: 160 }), id: "source-node" };
  const target = { ...createDefaultNode("dc-load", { x: 480, y: 160 }), id: "target-node" };
  const start = getTerminalPoint(source, "t1");
  const end = getTerminalPoint(target, "t1");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );
  const yLane = Math.max(start.y, end.y) + 220;
  const storedCanvasPoints = [
    start,
    { x: start.x, y: yLane },
    { x: end.x, y: yLane },
    end
  ];
  const storedLine = {
    ...line,
    params: {
      ...line.params,
      [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify(
        storedCanvasPoints.map((point) => ({
          x: point.x - line.position.x,
          y: point.y - line.position.y
        }))
      )
    }
  };

  const repairedNodes = repairUnsafeRoutableLineDeviceRoutes([source, target, storedLine], { width: 760, height: 420 });
  const repairedLine = repairedNodes.find((node) => node.id === storedLine.id)!;

  expect(repairedLine).toBe(storedLine);
  expect(routableLineDeviceCanvasPoints(repairedLine)).toEqual(storedCanvasPoints);
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


test("keeps vertical routable lines between parallel buses from detouring around the bus ends", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const topBus = {
    ...createDefaultNode("ac-bus", { x: 620, y: 120 }),
    id: "top-bus",
    size: { width: 720, height: 14 }
  };
  const bottomBus = {
    ...createDefaultNode("ac-bus", { x: 620, y: 420 }),
    id: "bottom-bus",
    size: { width: 360, height: 14 }
  };
  const topPoint = projectPointToBusCenterline(topBus, { x: 560, y: 120 });
  const bottomPoint = projectPointToBusCenterline(bottomBus, { x: 560, y: 420 });
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    topPoint,
    bottomPoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(topBus, "t1", topPoint),
      target: routableLineDeviceEndpointRefForNode(bottomBus, "t1", bottomPoint)
    }
  );

  const routed = routeRoutableLineDevice(line, [topBus, bottomBus, line], { width: 1200, height: 760 });
  const points = routableLineDeviceCanvasPoints(routed);

  expectOrthogonalSegments(points);
  expect(points[0]).toEqual(topPoint);
  expect(points[points.length - 1]).toEqual(bottomPoint);
  expect(routeBendCountForTest(points)).toBeLessThanOrEqual(2);
  expect(Math.max(...points.map((point) => point.x))).toBeLessThanOrEqual(topPoint.x + 32);
  expect(Math.min(...points.map((point) => point.x))).toBeGreaterThanOrEqual(topPoint.x - 32);
});


test("keeps offset routable line endpoints between parallel buses on a local middle lane", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const topBus = {
    ...createDefaultNode("ac-bus", { x: 760, y: 120 }),
    id: "top-bus",
    size: { width: 900, height: 14 }
  };
  const bottomBus = {
    ...createDefaultNode("ac-bus", { x: 720, y: 420 }),
    id: "bottom-bus",
    size: { width: 360, height: 14 }
  };
  const topPoint = projectPointToBusCenterline(topBus, { x: 850, y: 120 });
  const bottomPoint = projectPointToBusCenterline(bottomBus, { x: 620, y: 420 });
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    topPoint,
    bottomPoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(topBus, "t1", topPoint),
      target: routableLineDeviceEndpointRefForNode(bottomBus, "t1", bottomPoint)
    }
  );

  const routed = routeRoutableLineDevice(line, [topBus, bottomBus, line], { width: 1400, height: 760 });
  const points = routableLineDeviceCanvasPoints(routed);
  const minEndpointX = Math.min(topPoint.x, bottomPoint.x);
  const maxEndpointX = Math.max(topPoint.x, bottomPoint.x);

  expectOrthogonalSegments(points);
  expect(points[0]).toEqual(topPoint);
  expect(points[points.length - 1]).toEqual(bottomPoint);
  expect(routeBendCountForTest(points)).toBeLessThanOrEqual(4);
  expect(Math.max(...points.map((point) => point.x))).toBeLessThanOrEqual(maxEndpointX + 32);
  expect(Math.min(...points.map((point) => point.x))).toBeGreaterThanOrEqual(minEndpointX - 32);
});


test("keeps routable line-like bus endpoint fixed when rerouting after the opposite device moves", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "source-node" };
  const movedSource = { ...source, position: { x: 180, y: 220 } };
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
  const originalTargetRef = routableLineDeviceEndpointRefs(line).target;

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [movedSource, bus, line],
    [line.id],
    { width: 760, height: 480 },
    [source, bus, line]
  );

  expect(updates.map((node) => node.id)).toEqual([line.id]);
  expect(getTerminalPoint(updates[0], "t1")).toEqual(getTerminalPoint(movedSource, "t1"));
  expect(getTerminalPoint(updates[0], "t2")).toEqual(targetPoint);
  expect(routableLineDeviceEndpointRefs(updates[0]).target).toEqual(originalTargetRef);
});


test("keeps legacy routable line-like bus endpoints fixed when the bus ref has no local point", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 100, y: 120 }), id: "legacy-ref-source" };
  const movedSource = { ...source, position: { x: 180, y: 220 } };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 520, y: 80 }),
    id: "legacy-ref-bus",
    size: { width: 420, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const targetPoint = projectPointToBusCenterline(bus, { x: 430, y: 80 });
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    sourcePoint,
    targetPoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: {
        nodeId: bus.id,
        terminalId: "t1"
      }
    }
  );

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [movedSource, bus, line],
    [line.id],
    { width: 760, height: 480 },
    [source, bus, line]
  );
  const routePoints = routableLineDeviceCanvasPoints(updates[0]);

  expect(updates.map((node) => node.id)).toEqual([line.id]);
  expect(routePoints[0]).toEqual(getTerminalPoint(movedSource, "t1"));
  expect(routePoints[routePoints.length - 1]).toEqual(targetPoint);
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


test("keeps routable line-like bus endpoint routes on the endpoint normal when avoiding nearby blockers", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const bus = {
    ...createDefaultNode("ac-bus", { x: 1000, y: 1080 }),
    id: "source-bus",
    size: { width: 520, height: 16 }
  };
  const target = {
    ...createDefaultNode("ac-three-winding-transformer", { x: 1240, y: 430 }),
    id: "target-transformer"
  };
  const blocker = {
    ...createDefaultNode("static-rect", { x: 1190, y: 1052 }),
    id: "nearby-route-blocker",
    size: { width: 360, height: 90 }
  };
  const start = projectPointToBusCenterline(bus, { x: 1040, y: bus.position.y });
  const end = getTerminalPoint(target, "t2");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(bus, "t1", start),
      target: routableLineDeviceEndpointRefForNode(target, "t2")
    }
  );

  const routed = routeRoutableLineDevice(line, [bus, target, blocker, line], { width: 1800, height: 1300 });
  const points = routableLineDeviceCanvasPoints(routed);
  const firstSegmentNormal = {
    x: Math.sign(points[1].x - points[0].x),
    y: Math.sign(points[1].y - points[0].y)
  };

  expectOrthogonalSegments(points);
  expect(firstSegmentNormal).toEqual(getRouteEndpointNormal(bus, start, end, "t1"));
  expect(Math.max(...points.map((point) => point.y))).toBeLessThanOrEqual(start.y);
  expect(routeBendCountForTest(points)).toBeLessThanOrEqual(4);
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


test("redraws requested routable line-like devices from endpoints", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 260 }), id: "redraw-line-source" };
  const target = { ...createDefaultNode("ac-load", { x: 820, y: 260 }), id: "redraw-line-target" };
  const blocker = { ...createDefaultNode("ac-box-breaker", { x: 470, y: 190 }), id: "redraw-line-blocker" };
  const untouched = { ...createDefaultNode("dc-routable-line", { x: 320, y: 420 }), id: "untouched-routable-line" };
  const start = getTerminalPoint(source, "t1");
  const end = getTerminalPoint(target, "t1");
  const oldManualLane = { x: 360, y: 420 };
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );
  const manualLine = setRoutableLineDeviceCanvasPoints(line, [
    start,
    { x: 260, y: start.y },
    { x: 260, y: oldManualLane.y },
    oldManualLane,
    { x: end.x - 140, y: oldManualLane.y },
    { x: end.x - 140, y: end.y },
    end
  ]);

  const updates = redrawRoutableLineDeviceRoutes(
    [source, target, blocker, manualLine, untouched],
    [manualLine.id],
    { width: 1000, height: 560 }
  );
  const routePoints = routableLineDeviceCanvasPoints(updates[0]);

  expect(updates.map((node) => node.id)).toEqual([manualLine.id]);
  expect(routableLineDeviceEndpointRefs(updates[0])).toEqual(routableLineDeviceEndpointRefs(manualLine));
  expect(routePoints[0]).toEqual(start);
  expect(routePoints[routePoints.length - 1]).toEqual(end);
  expect(routePoints).not.toContainEqual(oldManualLane);
  expect(routeIntersectsSpecificNodes(routePoints, {
    id: "redrawn-routable-line-route",
    sourceId: source.id,
    targetId: target.id
  }, [blocker])).toBe(false);
  expectOrthogonalSegments(routePoints);
});


test("does not reroute stationary routable line-like devices around stationary blockers during a move repair", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 180 }), id: "stationary-source" };
  const target = { ...createDefaultNode("ac-load", { x: 820, y: 180 }), id: "stationary-target" };
  const stationaryBlocker = { ...createDefaultNode("ac-box-breaker", { x: 470, y: 98 }), id: "stationary-blocker" };
  const movedUnrelated = { ...createDefaultNode("ac-pv-source", { x: 470, y: 360 }), id: "moved-unrelated" };
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

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [source, target, stationaryBlocker, movedUnrelated, line],
    [line.id],
    { width: 1000, height: 520 },
    [source, target, stationaryBlocker, movedUnrelated, line],
    { movedNodeIds: [movedUnrelated.id] }
  );
  const updatesWithoutStationaryBlocker = rebuildRoutableLineDeviceRouteUpdates(
    [source, target, movedUnrelated, line],
    [line.id],
    { width: 1000, height: 520 },
    [source, target, movedUnrelated, line],
    { movedNodeIds: [movedUnrelated.id] }
  );
  const fullBlockerUpdates = rebuildRoutableLineDeviceRouteUpdates(
    [source, target, stationaryBlocker, movedUnrelated, line],
    [line.id],
    { width: 1000, height: 520 },
    [source, target, stationaryBlocker, movedUnrelated, line]
  );

  expect(routableLineDeviceCanvasPoints(updates[0] ?? line)).toEqual(
    routableLineDeviceCanvasPoints(updatesWithoutStationaryBlocker[0] ?? line)
  );
  expect(routableLineDeviceCanvasPoints(updates[0] ?? line)).not.toEqual(
    routableLineDeviceCanvasPoints(fullBlockerUpdates[0] ?? line)
  );
});


test("reroutes stationary routable line-like devices when a moved blocker crosses their stored route", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 180 }), id: "blocked-stationary-source" };
  const target = { ...createDefaultNode("ac-load", { x: 820, y: 180 }), id: "blocked-stationary-target" };
  const movedBlocker = { ...createDefaultNode("ac-box-breaker", { x: 470, y: 300 }), id: "moved-routable-blocker" };
  const start = getTerminalPoint(source, "t1");
  const end = getTerminalPoint(target, "t1");
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(target, "t1")
    }
  );
  const storedLine = setRoutableLineDeviceCanvasPoints(line, [
    start,
    { x: start.x, y: 300 },
    { x: end.x, y: 300 },
    end
  ]);

  const updates = rebuildRoutableLineDeviceRouteUpdates(
    [source, target, movedBlocker, storedLine],
    [storedLine.id],
    { width: 1000, height: 520 },
    [source, target, movedBlocker, storedLine],
    { movedNodeIds: [movedBlocker.id] }
  );
  const routePoints = routableLineDeviceCanvasPoints(updates[0]);

  expect(updates.map((node) => node.id)).toEqual([storedLine.id]);
  expect(routePoints).not.toEqual(routableLineDeviceCanvasPoints(storedLine));
  expect(routeIntersectsSpecificNodes(routePoints, {
    id: "blocked-stationary-routable-line-route",
    sourceId: source.id,
    targetId: target.id
  }, [movedBlocker])).toBe(false);
});


test("realigns a routable line bus endpoint to the previous segment extension before automatic alignment redraw", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 280, y: 320 }), id: "aligned-line-source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 560, y: 120 }),
    id: "aligned-line-bus",
    size: { width: 560, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const staleBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x + 140, y: bus.position.y });
  const extensionX = sourcePoint.x - 90;
  const expectedBusPoint = projectPointToBusCenterline(bus, { x: extensionX, y: bus.position.y });
  const routePoints = [
    sourcePoint,
    { x: extensionX, y: sourcePoint.y },
    { x: extensionX, y: bus.position.y + 70 },
    { x: staleBusPoint.x, y: bus.position.y + 70 },
    staleBusPoint
  ];
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    sourcePoint,
    staleBusPoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(bus, "t1", staleBusPoint)
    }
  );
  const routedLine = setRoutableLineDeviceCanvasPoints(line, routePoints);

  const realigned = realignRoutableLineDeviceBusEndpointPoints(routedLine, [source, bus, routedLine]);
  const redrawn = redrawRoutableLineDeviceRoutes([source, bus, realigned], [line.id], { width: 940, height: 500 });
  const finalRoutePoints = routableLineDeviceCanvasPoints(redrawn[0] ?? realigned);

  expect(finalRoutePoints[0]).toEqual(sourcePoint);
  expect(finalRoutePoints[finalRoutePoints.length - 1]).toEqual(expectedBusPoint);
  expect(finalRoutePoints).not.toContainEqual(staleBusPoint);
  expect(Math.abs(expectedBusPoint.x - sourcePoint.x)).toBeLessThan(Math.abs(staleBusPoint.x - sourcePoint.x));
  expect(routableLineDeviceEndpointRefs(redrawn[0] ?? realigned).target?.localPoint).toEqual(
    routableLineDeviceEndpointRefForNode(bus, "t1", expectedBusPoint).localPoint
  );
  expectOrthogonalSegments(finalRoutePoints);
});


test("redraws routable line routes and realigns bus endpoints to previous segment extensions", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 280, y: 320 }), id: "redraw-align-line-source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 560, y: 120 }),
    id: "redraw-align-line-bus",
    size: { width: 560, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const staleBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x + 140, y: bus.position.y });
  const extensionX = sourcePoint.x - 90;
  const expectedBusPoint = projectPointToBusCenterline(bus, { x: extensionX, y: bus.position.y });
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    sourcePoint,
    staleBusPoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(bus, "t1", staleBusPoint)
    }
  );
  const routedLine = setRoutableLineDeviceCanvasPoints(line, [
    sourcePoint,
    { x: extensionX, y: sourcePoint.y },
    { x: extensionX, y: bus.position.y + 70 },
    { x: staleBusPoint.x, y: bus.position.y + 70 },
    staleBusPoint
  ]);

  const redrawn = redrawRoutableLineDeviceRoutes([source, bus, routedLine], [line.id], { width: 940, height: 500 });
  const finalRoutePoints = routableLineDeviceCanvasPoints(redrawn[0] ?? routedLine);

  expect(finalRoutePoints[0]).toEqual(sourcePoint);
  expect(finalRoutePoints[finalRoutePoints.length - 1]).toEqual(expectedBusPoint);
  expect(finalRoutePoints).not.toContainEqual(staleBusPoint);
  expect(routableLineDeviceEndpointRefs(redrawn[0] ?? routedLine).target?.localPoint).toEqual(
    routableLineDeviceEndpointRefForNode(bus, "t1", expectedBusPoint).localPoint
  );
  expectOrthogonalSegments(finalRoutePoints);
});


test("redraws manually stored routable line routes by realigning bus endpoints to the main extension", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 280, y: 360 }), id: "manual-redraw-align-line-source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 560, y: 120 }),
    id: "manual-redraw-align-line-bus",
    size: { width: 560, height: 16 }
  };
  const sourcePoint = getTerminalPoint(source, "t1");
  const staleBusPoint = projectPointToBusCenterline(bus, { x: sourcePoint.x + 170, y: bus.position.y });
  const extensionX = sourcePoint.x;
  const expectedBusPoint = projectPointToBusCenterline(bus, { x: extensionX, y: bus.position.y });
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    sourcePoint,
    staleBusPoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(bus, "t1", staleBusPoint)
    }
  );
  const routedLine = setRoutableLineDeviceCanvasPoints(line, [
    sourcePoint,
    { x: extensionX, y: bus.position.y + 180 },
    { x: staleBusPoint.x, y: bus.position.y + 180 },
    staleBusPoint
  ]);

  const redrawn = redrawRoutableLineDeviceRoutes([source, bus, routedLine], [line.id], { width: 940, height: 520 });
  const finalRoutePoints = routableLineDeviceCanvasPoints(redrawn[0] ?? routedLine);

  expect(finalRoutePoints[0]).toEqual(sourcePoint);
  expect(finalRoutePoints[finalRoutePoints.length - 1]).toEqual(expectedBusPoint);
  expect(finalRoutePoints).not.toContainEqual(staleBusPoint);
  expect(routableLineDeviceEndpointRefs(redrawn[0] ?? routedLine).target?.localPoint).toEqual(
    routableLineDeviceEndpointRefForNode(bus, "t1", expectedBusPoint).localPoint
  );
  expectOrthogonalSegments(finalRoutePoints);
});

});


test("projects legacy model interaction terminal points onto the button boundary", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 120, y: 220 }), id: "boundary-source" };
  const interaction = {
    ...createDefaultNode("static-model-interaction-station", { x: 520, y: 220 }),
    id: "station-button",
    rotation: 90,
    scaleX: 1.4,
    scaleY: 0.8
  };
  const start = getTerminalPoint(source, "t1");
  const legacyOutsidePoint = { x: interaction.position.x - 120, y: interaction.position.y + 18 };
  const boundaryPoint = projectPointToModelInteractionBoundary(interaction, legacyOutsidePoint);
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    legacyOutsidePoint,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(interaction, "t1", legacyOutsidePoint)
    }
  );

  const localPoints = modelInteractionTerminalConnectionLocalPointsByNodeId([source, interaction, line]);

  expect(localPoints.get(interaction.id)?.get("t1")).toEqual(
    routableLineDeviceEndpointRefForNode(interaction, "t1", boundaryPoint).localPoint
  );
});


test("repairs a model interaction endpoint route that enters through the opposite side of the button", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-routable-line");
  const source = { ...createDefaultNode("ac-source", { x: 360, y: 80 }), id: "approach-source" };
  const interaction = {
    ...createDefaultNode("static-model-interaction-station", { x: 520, y: 300 }),
    id: "approach-station"
  };
  const start = getTerminalPoint(source, "t1");
  const end = projectPointToModelInteractionBoundary(interaction, {
    x: interaction.position.x,
    y: interaction.position.y + 180
  });
  const line = createRoutableLineDeviceFromEndpoints(
    template!,
    start,
    end,
    "layer-a",
    {
      source: routableLineDeviceEndpointRefForNode(source, "t1"),
      target: routableLineDeviceEndpointRefForNode(interaction, "t1", end)
    }
  );
  const crossingLine = setRoutableLineDeviceCanvasPoints(line, [
    start,
    { x: end.x, y: start.y },
    end
  ]);

  const routed = routeRoutableLineDevice(
    crossingLine,
    [source, interaction, crossingLine],
    { width: 820, height: 560 }
  );
  const points = routableLineDeviceCanvasPoints(routed);
  const adjacent = points[points.length - 2];
  const expectedTargetNormal = getRouteEndpointNormal(interaction, end, start, "t1");

  expect(points[points.length - 1]).toEqual(end);
  expect({
    x: Math.sign(adjacent.x - end.x),
    y: Math.sign(adjacent.y - end.y)
  }).toEqual(expectedTargetNormal);
  expect(adjacent.y).toBeGreaterThan(end.y);
  for (let index = 1; index < points.length - 1; index += 1) {
    expect(segmentIntersectsNodeBody(points[index - 1], points[index], interaction)).toBe(false);
  }
});
