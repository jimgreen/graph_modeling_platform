import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeviceGlyph } from "./DeviceGlyph";
import { createRenderStaticBoxDrawingPreview } from "./appExtracted/appCanvasInteractionFactories";
import { apiPath } from "./config";
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
import { degreesToRadians } from "./formatUtils";

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

function eFileVisualWidthForTest(value: string) {
  let width = 0;
  for (const char of value) {
    width += /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u.test(char)
      ? 5 / 3
      : 1;
  }
  return width;
}

function eFileTokenVisualColumns(line: string) {
  return Array.from(line.matchAll(/\S+/gu), (match) => eFileVisualWidthForTest(line.slice(0, match.index ?? 0)));
}

function expectEFileSectionColumnsAligned(text: string, section: string) {
  const match = new RegExp(`<${section}>\\r?\\n([\\s\\S]*?)\\r?\\n<\\/${section}>`, "u").exec(text);
  expect(match, `Missing E section ${section}`).toBeTruthy();
  const lines = (match?.[1] ?? "").split(/\r?\n/u);
  const header = lines.find((line) => line.startsWith("@"));
  const rows = lines.filter((line) => line.startsWith("#"));
  expect(header).toBeTruthy();
  expect(rows.length).toBeGreaterThan(0);
  const expectedColumns = eFileTokenVisualColumns(header ?? "").slice(1);
  for (const row of rows) {
    const rowColumns = eFileTokenVisualColumns(row).slice(1);
    expect(rowColumns).toHaveLength(expectedColumns.length);
    rowColumns.forEach((column, index) => expect(column).toBeCloseTo(expectedColumns[index], 0));
  }
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

const templates = [
  {
    kind: "customAcLoad",
    label: "交流负荷",
    categoryLibrary: "交流设备",
    size: { width: 100, height: 60 },
    params: { component_type: "ACLoad" },
    terminalType: "ac",
    terminalCount: 2,
    parameterDefinitions: [
      { cnName: "有功功率", enName: "p_load", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "p_load" },
      { cnName: "无功功率", enName: "q_load", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "q_load" },
      { cnName: "未导出", enName: "skip_me", valueType: "float", typicalValue: "0", exportEnabled: false }
    ]
  },
  {
    kind: "customNoExport",
    label: "无勾选",
    categoryLibrary: "交流设备",
    size: { width: 100, height: 60 },
    params: { component_type: "X" },
    terminalType: "ac",
    terminalCount: 2,
    parameterDefinitions: [
      { cnName: "未导出", enName: "skip", valueType: "float", typicalValue: "0", exportEnabled: false }
    ]
  }
] as unknown as DeviceTemplate[];

const electricGenerationCases = [
  { kind: "ac-wind-source", family: "wind", label: "交流风力发电机", source_type: "风力", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "35", rated_power: "50", derivedComponentType: "ACWindGen" },
  { kind: "dc-wind-source", family: "wind", label: "直流风力发电机", source_type: "风力", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "1500", rated_power: "10", derivedComponentType: "DCWindGen" },
  { kind: "ac-pv-source", family: "pv", label: "交流光伏发电机", source_type: "光伏", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "10", rated_power: "20", derivedComponentType: "ACPVGen" },
  { kind: "dc-pv-source", family: "pv", label: "直流光伏发电机", source_type: "光伏", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "1500", rated_power: "5", derivedComponentType: "DCPVGen" },
  { kind: "ac-thermal-source", family: "thermal", label: "交流火力发电机", source_type: "火力", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "220", rated_power: "600", derivedComponentType: "ACThermalGen" },
  { kind: "dc-thermal-source", family: "thermal", label: "直流火力发电机", source_type: "火力", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "1500", rated_power: "600", derivedComponentType: "DCThermalGen" },
  { kind: "ac-diesel-source", family: "diesel", label: "交流柴油发电机", source_type: "柴油", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "10", rated_power: "5", derivedComponentType: "ACDieselGen" },
  { kind: "dc-diesel-source", family: "diesel", label: "直流柴油发电机", source_type: "柴油", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "750", rated_power: "5", derivedComponentType: "DCDieselGen" },
  { kind: "ac-hydro-source", family: "hydro", label: "交流水力发电机", source_type: "水力", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "220", rated_power: "300", derivedComponentType: "ACHydroGen" },
  { kind: "dc-hydro-source", family: "hydro", label: "直流水力发电机", source_type: "水力", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "1500", rated_power: "300", derivedComponentType: "DCHydroGen" },
  { kind: "ac-nuclear-source", family: "nuclear", label: "交流核能发电机", source_type: "核能", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "500", rated_power: "1000", derivedComponentType: "ACNuclearGen" },
  { kind: "dc-nuclear-source", family: "nuclear", label: "直流核能发电机", source_type: "核能", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "1500", rated_power: "1000", derivedComponentType: "DCNuclearGen" },
  { kind: "ac-storage", family: "storage", label: "交流电化学储能", source_type: "储能", terminalType: "ac", terminalLabel: "交流发电机端", association: "ac-generator", relationKey: "idx_acgenerator", rated_voltage: "10", rated_power: "5", derivedComponentType: "ACStorageGen" },
  { kind: "dc-storage", family: "storage", label: "直流电化学储能", source_type: "储能", terminalType: "dc", terminalLabel: "直流发电机端", association: "dc-generator", relationKey: "idx_dcgenerator", rated_voltage: "750", rated_power: "5", derivedComponentType: "DCStorageGen" }
] as const;

const legacyElectricGenerationKinds = new Set<string>([
  "ac-wind-source",
  "dc-wind-source",
  "ac-pv-source",
  "dc-pv-source",
  "ac-thermal-source",
  "ac-hydro-source",
  "ac-nuclear-source"
]);


describe("routing", () => {
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
