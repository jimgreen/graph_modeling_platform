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


test("preserves manually clicked bends when committing a newly drawn connection", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-line", { x: 100, y: 120 }), id: "source" });
  const target = withHiddenDeviceLabel({ ...createDefaultNode("ac-switch", { x: 460, y: 120 }), id: "target" });
  const sourceTerminal = getTerminalPoint(source, "t2");
  const targetTerminal = getTerminalPoint(target, "t1");
  const manualPoints = [
    { x: sourceTerminal.x + 64, y: sourceTerminal.y },
    { x: sourceTerminal.x + 64, y: sourceTerminal.y + 72 },
    { x: targetTerminal.x - 64, y: sourceTerminal.y + 72 },
    { x: targetTerminal.x - 64, y: targetTerminal.y }
  ];
  const edge: Edge = {
    id: "manual-clicked-bends",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: "t2",
    targetTerminalId: "t1",
    manualPoints
  };

  const prepared = prepareConnectionEdgeForCommit(
    [source, target],
    [edge],
    edge.id,
    { width: 720, height: 320 },
    [],
    { preserveManualRouteDisplay: true }
  );
  const savedRoute = prepared.edge
    ? routeEdgesForSavedPathRendering([source, target], [prepared.edge], { width: 720, height: 320 })[0]
    : undefined;

  expect(sourceTerminal.y).toBe(targetTerminal.y);
  expect(prepared.ok).toBe(true);
  expect(prepared.issues).toEqual([]);
  expect(savedRoute?.points[0]).toEqual(sourceTerminal);
  expect(savedRoute?.points[savedRoute.points.length - 1]).toEqual(targetTerminal);
  expect(savedRoute?.points).toEqual(expect.arrayContaining(manualPoints));
  expect(routeBendCountForTest(savedRoute?.points ?? [])).toBeGreaterThan(0);
  expect(new Set(savedRoute?.points.map((point) => point.y))).toContain(sourceTerminal.y + 72);
});


test("preserves manually clicked bends when committing a newly drawn device-to-bus connection", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 120, y: 320 }), id: "source" });
  const bus = withHiddenDeviceLabel({
    ...createDefaultNode("ac-bus", { x: 360, y: 120 }),
    id: "target-bus",
    size: { width: 360, height: 16 }
  });
  const sourceTerminal = getTerminalPoint(source, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: sourceTerminal.x + 240, y: bus.position.y });
  const manualPoints = [
    { x: sourceTerminal.x + 80, y: sourceTerminal.y },
    { x: sourceTerminal.x + 80, y: busPoint.y + 120 },
    { x: busPoint.x, y: busPoint.y + 120 }
  ];
  const edge: Edge = {
    id: "manual-clicked-device-to-bus",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint,
    manualPoints
  };

  const prepared = prepareConnectionEdgeForCommit(
    [source, bus],
    [edge],
    edge.id,
    { width: 900, height: 520 },
    [],
    { preserveManualRouteDisplay: true }
  );
  const savedRoute = prepared.edge
    ? routeEdgesForSavedPathRendering([source, bus], [prepared.edge], { width: 900, height: 520 })[0]
    : undefined;
  const liveRoute = prepared.edge
    ? routeEdgesForStoredRendering(
        [source, bus],
        [prepared.edge],
        { width: 900, height: 520 },
        { preserveManualRouteDisplay: true }
      )[0]
    : undefined;

  expect(prepared.ok).toBe(true);
  expect(prepared.issues).toEqual([]);
  expect(savedRoute?.points[0]).toEqual(sourceTerminal);
  expect(savedRoute?.points[savedRoute.points.length - 1]).toEqual(busPoint);
  expect(savedRoute?.points).toEqual(expect.arrayContaining(manualPoints));
  expect(liveRoute?.points).toEqual(expect.arrayContaining(manualPoints));
  expect(routeBendCountForTest(savedRoute?.points ?? [])).toBeGreaterThan(0);
});


test("preserves a single manually clicked bend when committing a newly drawn device-to-bus connection", () => {
  const source = withHiddenDeviceLabel({ ...createDefaultNode("ac-source", { x: 120, y: 360 }), id: "single-bend-source" });
  const bus = withHiddenDeviceLabel({
    ...createDefaultNode("ac-bus", { x: 360, y: 120 }),
    id: "single-bend-bus",
    size: { width: 360, height: 16 }
  });
  const sourceTerminal = getTerminalPoint(source, "t1");
  const busPoint = projectPointToBusCenterline(bus, { x: sourceTerminal.x + 260, y: bus.position.y });
  const manualPoint = { x: sourceTerminal.x + 96, y: busPoint.y + 110 };
  const previewRoute = buildManualConnectionPreviewRoute(sourceTerminal, [manualPoint], busPoint, { width: 900, height: 560 });
  const edge: Edge = {
    id: "single-manual-clicked-device-to-bus",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint,
    manualPoints: [manualPoint],
    routePoints: previewRoute
  };

  const prepared = prepareConnectionEdgeForCommit(
    [source, bus],
    [edge],
    edge.id,
    { width: 900, height: 560 },
    [],
    { preserveManualRouteDisplay: true }
  );
  const liveRoute = prepared.edge
    ? routeEdgesForStoredRendering(
        [source, bus],
        [prepared.edge],
        { width: 900, height: 560 },
        { preserveManualRouteDisplay: true }
      )[0]
    : undefined;

  expect(previewRoute).toContainEqual(manualPoint);
  expect(prepared.ok).toBe(true);
  expect(prepared.issues).toEqual([]);
  expect(prepared.edge?.manualPoints ?? []).toContainEqual(manualPoint);
  expect(liveRoute?.points).toContainEqual(manualPoint);
  expect(liveRoute?.points).toEqual(previewRoute);
  expect(routeBendCountForTest(liveRoute?.points ?? [])).toBeGreaterThan(0);
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


test("commits a clear vertical load-to-bus connection without treating the endpoint label as a blocker", () => {
  const load = {
    ...createDefaultNode("ac-load", { x: 260, y: 120 }),
    id: "load-33",
    name: "Load @ Bus 33",
    params: {
      ...createDefaultNode("ac-load", { x: 260, y: 120 }).params,
      _labelVisible: "1",
      _labelX: "0",
      _labelY: "50",
      _labelText: "Load @ Bus 33"
    }
  };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 260, y: 320 }),
    id: "bus-33",
    name: "Bus 33",
    scaleX: 1.25
  };
  const busPoint = projectPointToBusCenterline(bus, getTerminalPoint(load, "t1"));
  const edge: Edge = {
    id: "load-33-to-bus-33",
    sourceId: load.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint
  };

  const prepared = prepareConnectionEdgeForCommit([load, bus], [edge], edge.id, { width: 640, height: 520 });
  const validation = prepared.edge
    ? validateConnectionEdgeRoute([load, bus], [prepared.edge], edge.id, { width: 640, height: 520 })
    : prepared;

  expect(prepared.ok).toBe(true);
  expect(prepared.issues).toEqual([]);
  expect(validation.ok).toBe(true);
  expect(validation.issues).toEqual([]);
});


test("commits a connection through empty space inside a routable line bounding box", () => {
  const source = withHiddenDeviceLabel({
    ...createDefaultNode("ac-source", { x: 200, y: 300 }),
    id: "source",
    size: { width: 40, height: 40 },
    terminals: [
      {
        ...createDefaultNode("ac-source", { x: 200, y: 300 }).terminals[0],
        id: "t1",
        anchor: { x: 0, y: -0.5 }
      }
    ]
  });
  const target = withHiddenDeviceLabel({
    ...createDefaultNode("ac-load", { x: 200, y: 100 }),
    id: "target",
    size: { width: 40, height: 40 },
    terminals: [
      {
        ...createDefaultNode("ac-load", { x: 200, y: 100 }).terminals[0],
        id: "t1",
        anchor: { x: 0, y: 0.5 }
      }
    ]
  });
  const blocker = withHiddenDeviceLabel({
    ...createDefaultNode("ac-routable-line", { x: 0, y: 0 }),
    id: "routable-line-blocker",
    name: "Line 15-33",
    position: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
    params: {
      ...createDefaultNode("ac-routable-line", { x: 0, y: 0 }).params,
      line_width: "4",
      [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify([
        { x: 0, y: 300 },
        { x: 0, y: 100 },
        { x: 400, y: 100 },
        { x: 400, y: 300 }
      ])
    }
  });
  const edge: Edge = {
    id: "clear-inside-routable-line-bounds",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1"
  };

  const prepared = prepareConnectionEdgeForCommit([source, target, blocker], [edge], edge.id, { width: 480, height: 360 });
  const validation = prepared.edge
    ? validateConnectionEdgeRoute([source, target, blocker], [prepared.edge], edge.id, { width: 480, height: 360 })
    : prepared;

  expect(prepared.ok).toBe(true);
  expect(prepared.issues).toEqual([]);
  expect(validation.ok).toBe(true);
  expect(validation.issues).toEqual([]);
});


test("commits a clear horizontal connection from a vertical dc bus to a breaker terminal", () => {
  const bus = {
    ...createDefaultNode("dc-bus-vertical", { x: 659, y: 948 }),
    id: "dc-bus",
    name: "直流母线（竖向）-1",
    scaleX: 11.666666666666668,
    scaleY: 1
  };
  const breaker = { ...createDefaultNode("dc-breaker", { x: 872, y: 850 }), id: "dc-breaker", name: "直流断路器-21" };
  const busPoint = projectPointToBusCenterline(bus, getTerminalPoint(breaker, "t1"));
  const edge: Edge = {
    id: "clear-dc-bus-breaker",
    sourceId: bus.id,
    targetId: breaker.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    sourcePoint: busPoint
  };

  const prepared = prepareConnectionEdgeForCommit([bus, breaker], [edge], edge.id, { width: 1920, height: 1800 });
  const validation = prepared.edge
    ? validateConnectionEdgeRoute([bus, breaker], [prepared.edge], edge.id, { width: 1920, height: 1800 })
    : prepared;
  const route = prepared.edge
    ? routeEdgesForRendering([bus, breaker], [prepared.edge], { width: 1920, height: 1800 })[0]
    : undefined;
  expect(prepared.issues).toEqual([]);
  expect(prepared.ok).toBe(true);
  expect(validation.ok).toBe(true);
  expect(validation.issues).toEqual([]);
  expect(route?.points[0]).toEqual(busPoint);
  expect(route?.points[route.points.length - 1]).toEqual(getTerminalPoint(breaker, "t1"));
  expect(routeBendCountForTest(route?.points ?? [])).toBe(0);
});


test("commits a clear connection from a breaker left terminal to a stretched vertical dc bus on the right", () => {
  const breaker = { ...createDefaultNode("dc-breaker", { x: 545, y: 236 }), id: "dc-breaker", name: "直流断路器-2" };
  const bus = {
    ...createDefaultNode("dc-bus-vertical", { x: 716, y: 899 }),
    id: "right-dc-bus",
    name: "直流母线（竖向）-1",
    rotation: 90,
    scale: 11.666666666666668,
    scaleX: 11.666666666666668,
    scaleY: 1,
    params: {
      ...createDefaultNode("dc-bus-vertical", { x: 716, y: 899 }).params,
      _labelX: "3.5",
      _labelY: "957",
      _labelRotation: "0"
    }
  };
  const sourceSideConverter = {
    ...createDefaultNode("acdc-converter", { x: 379, y: 236 }),
    id: "source-side-converter",
    name: "ACDC变流器-2"
  };
  const upperBreaker = {
    ...createDefaultNode("dc-breaker", { x: 545, y: 121 }),
    id: "upper-breaker",
    name: "直流断路器-1"
  };
  const lowerBreaker = {
    ...createDefaultNode("dc-breaker", { x: 545, y: 340 }),
    id: "lower-breaker",
    name: "直流断路器-3"
  };
  const busPoint = projectPointToBusCenterline(bus, getTerminalPoint(breaker, "t1"));
  const edge: Edge = {
    id: "breaker-left-to-right-bus",
    sourceId: breaker.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: busPoint
  };
  const nodes = [breaker, bus, sourceSideConverter, upperBreaker, lowerBreaker];

  const prepared = prepareConnectionEdgeForCommit(nodes, [edge], edge.id, { width: 2019, height: 3639 });
  const validation = prepared.edge
    ? validateConnectionEdgeRoute(nodes, [prepared.edge], edge.id, { width: 2019, height: 3639 })
    : prepared;
  const route = prepared.edge
    ? routeEdgesForRendering(nodes, [prepared.edge], { width: 2019, height: 3639 })[0]
    : undefined;

  expect(prepared.issues).toEqual([]);
  expect(prepared.ok).toBe(true);
  expect(validation.ok).toBe(true);
  expect(validation.issues).toEqual([]);
  expect(route?.points[0]).toEqual(getTerminalPoint(breaker, "t1"));
  expect(route?.points[route.points.length - 1]).toEqual(busPoint);
});


test("commits through empty space beside a stretched bus with a distant label", () => {
  const breaker = {
    ...createDefaultNode("dc-breaker", { x: 837, y: 1673 }),
    id: "dc-breaker-33",
    name: "直流断路器-33"
  };
  const load = {
    ...createDefaultNode("dc-load", { x: 1006, y: 1805 }),
    id: "dc-load-1",
    name: "直流负荷-1"
  };
  const busTemplate = createDefaultNode("dc-bus-vertical", { x: 765, y: 953 });
  const distantBus = {
    ...busTemplate,
    id: "distant-vertical-bus",
    name: "直流母线（竖向）-1",
    size: { width: 150, height: 36 },
    rotation: 90,
    scale: 1,
    scaleX: 11.66667,
    scaleY: 1,
    params: {
      ...busTemplate.params,
      _labelVisible: "1",
      _labelX: "1.6",
      _labelY: "947",
      _labelFontSize: "14",
      _labelRotation: "0"
    }
  };
  const sourcePoint = getTerminalPoint(breaker, "t2");
  const targetPoint = getTerminalPoint(load, "t1");
  const elbow = { x: targetPoint.x, y: sourcePoint.y };
  const edge: Edge = {
    id: "breaker-33-to-load-1",
    sourceId: breaker.id,
    targetId: load.id,
    sourceTerminalId: "t2",
    sourcePoint,
    targetTerminalId: "t1",
    targetPoint
  };
  const nodes = [breaker, load, distantBus];

  expect(segmentIntersectsNodeBody(sourcePoint, elbow, distantBus)).toBe(false);
  expect(segmentIntersectsNodeBody(elbow, targetPoint, distantBus)).toBe(false);

  const prepared = prepareConnectionEdgeForCommit(nodes, [edge], edge.id, { width: 2457, height: 2143 });

  expect(prepared.ok).toBe(true);
  expect(prepared.issues).toEqual([]);
  expect(prepared.edge).toBeDefined();
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


test("keeps the stationary device endpoint fixed while rewiring a bus endpoint preview", () => {
  const source = { ...createDefaultNode("ac-source", { x: 164, y: 500 }), id: "source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 720, y: 138 }),
    id: "bus",
    size: { width: 980, height: 24 }
  };
  const sourceTerminal = getTerminalPoint(source, "t1");
  const initialBusPoint = projectPointToBusCenterline(bus, sourceTerminal);
  const initialEdge = {
    id: "device-to-bus-rewire-preview",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: initialBusPoint
  };
  const initialRoute = routeEdgesForStoredRendering([source, bus], [initialEdge], { width: 1400, height: 900 })[0];
  const draggedBusPoint = projectPointToBusCenterline(bus, { x: 965, y: 663 });
  const previewEdge = {
    ...initialEdge,
    targetPoint: draggedBusPoint
  };

  const preserved = preserveConnectionEdgeRouteShape([source, bus], previewEdge, initialRoute.points, { width: 1400, height: 900 });
  const previewPoints = preserved.routePoints ?? [];

  expect(previewPoints[0]).toEqual(sourceTerminal);
  expect(previewPoints[previewPoints.length - 1]).toEqual(draggedBusPoint);
  expect(previewPoints.some((point) => point.x === sourceTerminal.x && point.y === sourceTerminal.y)).toBe(true);
});


test("keeps the stationary device endpoint fixed while dragging a bus endpoint into blank preview space", () => {
  const source = { ...createDefaultNode("ac-source", { x: 164, y: 500 }), id: "source" };
  const bus = {
    ...createDefaultNode("ac-bus", { x: 720, y: 138 }),
    id: "bus",
    size: { width: 980, height: 24 }
  };
  const sourceTerminal = getTerminalPoint(source, "t1");
  const initialBusPoint = projectPointToBusCenterline(bus, sourceTerminal);
  const initialEdge = {
    id: "device-to-floating-rewire-preview",
    sourceId: source.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: initialBusPoint
  };
  const initialRoute = routeEdgesForStoredRendering([source, bus], [initialEdge], { width: 1400, height: 900 })[0];
  const floatingPreviewPoint = { x: 965, y: 663 };
  const previewEdge = {
    ...initialEdge,
    targetId: "floating-rewire-target",
    targetPoint: floatingPreviewPoint
  };

  const preserved = preserveConnectionEdgeRouteShape([source], previewEdge, initialRoute.points, { width: 1400, height: 900 });
  const previewPoints = preserved.routePoints ?? [];

  expect(previewPoints[0]).toEqual(sourceTerminal);
  expect(previewPoints[previewPoints.length - 1]).toEqual(floatingPreviewPoint);
  expect(previewPoints.some((point) => point.x === sourceTerminal.x && point.y === sourceTerminal.y)).toBe(true);
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
    { x: 150, y: 160 },
    { x: 182, y: 160 }
  ]);

  const verticalBend = insertOrthogonalRouteBend(routePoints, 1, { x: 120, y: 72 }, { width: 320, height: 220 });
  expect(verticalBend.slice(1, 5)).toEqual([
    { x: 80, y: 20 },
    { x: 80, y: 72 },
    { x: 120, y: 72 },
    { x: 120, y: 104 }
  ]);

  for (const route of [horizontalBend, verticalBend]) {
    for (let index = 1; index < route.length; index += 1) {
      expect(route[index - 1].x === route[index].x || route[index - 1].y === route[index].y).toBe(true);
    }
  }
});


test("routes an inserted manual bend through an off-segment pointer position", () => {
  const routePoints: Point[] = [
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 80, y: 120 },
    { x: 220, y: 120 },
    { x: 220, y: 20 },
    { x: 280, y: 20 }
  ];

  const horizontalBend = insertOrthogonalRouteBend(routePoints, 2, { x: 150, y: 147 }, { width: 320, height: 220 });
  const verticalBend = insertOrthogonalRouteBend(routePoints, 1, { x: 113, y: 72 }, { width: 320, height: 220 });

  expect(horizontalBend).toContainEqual({ x: 150, y: 147 });
  expect(verticalBend).toContainEqual({ x: 113, y: 72 });
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


test("keeps an inserted manual bend visible on a straight vertical stored rendering path", () => {
  const sourceBase = withHiddenDeviceLabel(createDefaultNode("ac-source", { x: 240, y: 360 }));
  const targetBase = withHiddenDeviceLabel(createDefaultNode("ac-load", { x: 240, y: 120 }));
  const source = {
    ...sourceBase,
    terminals: [{ ...sourceBase.terminals[0], anchor: { x: 0, y: -0.5 } }]
  };
  const target = {
    ...targetBase,
    terminals: [{ ...targetBase.terminals[0], anchor: { x: 0, y: 0.5 } }]
  };
  const edge: Edge = {
    id: "manual-bend-stored-rendering",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1"
  };
  const baseRoute = routeOrthogonalEdge(source, target, [source, target], edge, [], { width: 700, height: 320 });
  const insertSegmentIndex = Math.max(0, Math.floor((baseRoute.length - 2) / 2));
  const middleFrom = baseRoute[insertSegmentIndex];
  const middleTo = baseRoute[insertSegmentIndex + 1];
  const clickPoint = {
    x: middleFrom.x,
    y: Math.round((middleFrom.y + middleTo.y) / 2)
  };
  const bendRoute = insertOrthogonalRouteBend(baseRoute, insertSegmentIndex, clickPoint, { width: 700, height: 420 });
  const manualEdge = { ...edge, manualPoints: bendRoute.slice(2, -2) };

  const rendered = routeEdgesForStoredRendering([source, target], [manualEdge], { width: 700, height: 420 })[0];

  expect(baseRoute.every((point) => point.x === baseRoute[0].x)).toBe(true);
  expect(bendRoute.some((point) => point.x !== baseRoute[0].x)).toBe(true);
  expect(rendered.points.some((point) => point.x !== baseRoute[0].x)).toBe(true);
  expect(rendered.points.length).toBeGreaterThan(baseRoute.length);
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


test("adds endpoint stubs when preserving a two-point device-to-bus drag preview", () => {
  const preserved = preserveDraggedRouteShape({
    routePoints: [
      { x: 180, y: 260 },
      { x: 340, y: 260 }
    ],
    nextStart: { x: 220, y: 420 },
    nextEnd: { x: 340, y: 260 },
    sourceDelta: { x: 40, y: 160 },
    targetDelta: { x: 0, y: 0 },
    sourceNormal: { x: 1, y: 0 },
    targetNormal: { x: 0, y: 1 }
  });

  expect(preserved[1]).toEqual({ x: 248, y: 420 });
  expect(preserved[preserved.length - 2]).toEqual({ x: 340, y: 288 });
  expectOrthogonalSegments(preserved);
});


test("turns immediately after the source stub for a two-point device-to-bus drag preview", () => {
  const preserved = preserveDraggedRouteShape({
    routePoints: [
      { x: 1380, y: 560 },
      { x: 1650, y: 210 }
    ],
    nextStart: { x: 1480, y: 555 },
    nextEnd: { x: 1650, y: 210 },
    sourceDelta: { x: 100, y: -5 },
    targetDelta: { x: 0, y: 0 },
    sourceNormal: { x: 1, y: 0 },
    targetNormal: { x: 0, y: 1 }
  });

  expect(preserved).toEqual([
    { x: 1480, y: 555 },
    { x: 1508, y: 555 },
    { x: 1508, y: 238 },
    { x: 1650, y: 238 },
    { x: 1650, y: 210 }
  ]);
  expectOrthogonalSegments(preserved);
});


test("preserves a three-point single-corner drag preview without endpoint-stub rerouting", () => {
  const preserved = preserveDraggedRouteShape({
    routePoints: [
      { x: 248.3, y: 255 },
      { x: 268.5, y: 255 },
      { x: 268.5, y: 373 }
    ],
    nextStart: { x: 288.3, y: 295 },
    nextEnd: { x: 268.5, y: 373 },
    sourceDelta: { x: 40, y: 40 },
    targetDelta: { x: 0, y: 0 },
    sourceNormal: { x: 0, y: 1 },
    targetNormal: { x: 0, y: -1 }
  });

  expect(preserved).toEqual([
    { x: 288, y: 295 },
    { x: 269, y: 295 },
    { x: 269, y: 373 }
  ]);
  expectOrthogonalSegments(preserved);
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

});