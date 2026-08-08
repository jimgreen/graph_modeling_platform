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


describe("topology", () => {
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

test("builds adjacency topology from directly overlapping device terminals", () => {
  const generator = {
    ...createDefaultNode("ac-source", { x: 399, y: 710 }),
    id: "connected-generator",
    rotation: 270
  };
  const generatorBreaker = {
    ...createDefaultNode("ac-box-breaker-vertical", { x: 399, y: 552 }),
    id: "generator-breaker",
    rotation: 90
  };
  const loadSwitch = {
    ...createDefaultNode("ac-switch-vertical", { x: 1516, y: 497 }),
    id: "load-switch",
    rotation: 90
  };
  const load = {
    ...createDefaultNode("ac-load", { x: 1516, y: 631 }),
    id: "connected-load"
  };

  expect(getTerminalPoint(generator, generator.terminals[0].id)).toEqual(
    getTerminalPoint(generatorBreaker, generatorBreaker.terminals[1].id)
  );
  expect(getTerminalPoint(loadSwitch, loadSwitch.terminals[1].id)).toEqual(
    getTerminalPoint(load, load.terminals[0].id)
  );

  const topology = buildTopology([generator, generatorBreaker, loadSwitch, load], []);

  expect(topology.nodes[generator.id].degree).toBe(1);
  expect(topology.nodes[generator.id].neighbors).toEqual([generatorBreaker.id]);
  expect(topology.nodes[generatorBreaker.id].neighbors).toEqual([generator.id]);
  expect(topology.nodes[load.id].degree).toBe(1);
  expect(topology.nodes[load.id].neighbors).toEqual([loadSwitch.id]);
  expect(topology.nodes[loadSwitch.id].neighbors).toEqual([load.id]);
});

test("does not double count an overlapping terminal connection that also has an edge", () => {
  const source = { ...createDefaultNode("ac-source", { x: 200, y: 300 }), id: "overlap-source" };
  const target = { ...createDefaultNode("ac-load", { x: 200, y: 300 }), id: "overlap-load" };
  const sourcePoint = getTerminalPoint(source, source.terminals[0].id);
  const targetPoint = getTerminalPoint(target, target.terminals[0].id);
  target.position = {
    x: target.position.x + sourcePoint.x - targetPoint.x,
    y: target.position.y + sourcePoint.y - targetPoint.y
  };
  const edge: Edge = {
    id: "overlap-edge",
    sourceId: source.id,
    targetId: target.id,
    sourceTerminalId: source.terminals[0].id,
    targetTerminalId: target.terminals[0].id
  };

  const topology = buildTopology([source, target], [edge]);

  expect(topology.nodes[source.id].degree).toBe(1);
  expect(topology.nodes[source.id].neighbors).toEqual([target.id]);
  expect(topology.nodes[source.id].edgeIds).toEqual([edge.id]);
});

test("builds adjacency topology from a terminal touching a bus", () => {
  const bus = { ...createDefaultNode("ac-bus", { x: 320, y: 120 }), id: "contact-bus" };
  const source = { ...createDefaultNode("ac-source", { x: 200, y: 260 }), id: "contact-source" };
  const terminalPoint = getTerminalPoint(source, source.terminals[0].id);
  source.position = {
    x: source.position.x + bus.position.x - terminalPoint.x,
    y: source.position.y + bus.position.y - terminalPoint.y
  };

  expect(getTerminalBusContactGroups([bus, source])).toHaveLength(1);

  const topology = buildTopology([bus, source], []);

  expect(topology.nodes[source.id].degree).toBe(1);
  expect(topology.nodes[source.id].neighbors).toEqual([bus.id]);
  expect(topology.nodes[bus.id].neighbors).toEqual([source.id]);
});

test("builds adjacency topology from routable line device endpoint refs", () => {
  const source = createDefaultNode("ac-source", { x: 100, y: 100 });
  const bus = createDefaultNode("ac-bus", { x: 420, y: 100 });
  const line = createRoutableLineDeviceFromEndpoints(
    DEVICE_LIBRARY.find((template) => template.kind === "ac-routable-line")!,
    { x: 160, y: 100 },
    { x: 360, y: 100 },
    undefined,
    {
      source: { nodeId: source.id, terminalId: source.terminals[0].id },
      target: { nodeId: bus.id, terminalId: "t1" }
    }
  );

  const topology = buildTopology([source, line, bus], []);

  expect(topology.nodes[source.id].degree).toBe(1);
  expect(topology.nodes[source.id].neighbors).toEqual([line.id]);
  expect(topology.nodes[line.id].degree).toBe(2);
  expect(topology.nodes[line.id].neighbors).toEqual([source.id, bus.id]);
  expect(topology.nodes[bus.id].degree).toBe(1);
  expect(topology.connectedComponents).toEqual([[source.id, line.id, bus.id]]);
});

test("builds adjacency topology from routable line device endpoints touching buses", () => {
  const bus = { ...createDefaultNode("ac-bus", { x: 420, y: 100 }), id: "selected-bus" };
  const switchNode = { ...createDefaultNode("ac-switch", { x: 420, y: 220 }), id: "connected-switch" };
  const line = {
    ...createRoutableLineDeviceFromEndpoints(
      DEVICE_LIBRARY.find((template) => template.kind === "ac-routable-line")!,
      { x: 180, y: 100 },
      { x: 420, y: 100 }
    ),
    id: "touching-routable-line"
  };
  const edges: Edge[] = [
    {
      id: "switch-to-bus",
      sourceId: switchNode.id,
      targetId: bus.id,
      sourceTerminalId: switchNode.terminals[0].id,
      targetTerminalId: "t1"
    }
  ];

  const topology = buildTopology([bus, switchNode, line], edges);

  expect(topology.nodes[bus.id].degree).toBe(2);
  expect(topology.nodes[bus.id].neighbors).toEqual([switchNode.id, line.id]);
  expect(topology.nodes[line.id].degree).toBe(1);
});

test("builds adjacency topology for a U-shaped routable line device between two buses", () => {
  const sourceBus = { ...createDefaultNode("ac-bus", { x: 260, y: 220 }), id: "source-bus" };
  const targetBus = { ...createDefaultNode("ac-bus", { x: 640, y: 220 }), id: "target-bus" };
  const line = setRoutableLineDeviceCanvasPoints(
    {
      ...createRoutableLineDeviceFromEndpoints(
        DEVICE_LIBRARY.find((template) => template.kind === "ac-routable-line")!,
        { x: 320, y: 220 },
        { x: 580, y: 220 }
      ),
      id: "selected-routable-line"
    },
    [
      { x: 320, y: 220 },
      { x: 320, y: 120 },
      { x: 580, y: 120 },
      { x: 580, y: 220 }
    ]
  );

  const topology = buildTopology([sourceBus, line, targetBus], []);

  expect(topology.nodes[line.id].degree).toBe(2);
  expect(topology.nodes[line.id].neighbors).toEqual([sourceBus.id, targetBus.id]);
  expect(topology.nodes[sourceBus.id].neighbors).toEqual([line.id]);
  expect(topology.nodes[targetBus.id].neighbors).toEqual([line.id]);
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

  expect(payload.ACNode.columns).toEqual(["idx", "name", "vbase", "run_stat"]);
  expect(payload.ACNode.columns).not.toEqual(expect.arrayContaining(["voltage", "angle", "isl"]));
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

test("keeps two-winding node numbers on terminals and three-winding node numbers in model parameters", () => {
  const twoWinding = createDefaultNode("ac-transformer", { x: 100, y: 100 });
  const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });

  const calculated = calculateElectricalTopology([twoWinding, threeWinding], []);
  const calculatedTwoWinding = calculated.find((node) => node.id === twoWinding.id)!;
  const calculatedThreeWinding = calculated.find((node) => node.id === threeWinding.id)!;

  expect(calculatedTwoWinding.params.t1_node).toBeUndefined();
  expect(calculatedTwoWinding.params.t2_node).toBeUndefined();
  expect([getEParamValue("i_node", calculatedTwoWinding), getEParamValue("j_node", calculatedTwoWinding)]).toEqual(
    calculatedTwoWinding.terminals.map((terminal) => terminal.nodeNumber)
  );
  expect([
    calculatedThreeWinding.params.t1_node,
    calculatedThreeWinding.params.t2_node,
    calculatedThreeWinding.params.t3_node
  ]).toEqual(calculatedThreeWinding.terminals.map((terminal) => terminal.nodeNumber));
});

test("resolves persisted transformer model node parameters from terminal topology numbers", () => {
  const twoWinding = createDefaultNode("ac-transformer", { x: 100, y: 100 });
  const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });
  twoWinding.terminals[0].nodeNumber = "11";
  twoWinding.terminals[1].nodeNumber = "12";
  threeWinding.terminals[0].nodeNumber = "21";
  threeWinding.terminals[1].nodeNumber = "22";
  threeWinding.terminals[2].nodeNumber = "23";

  expect([getEParamValue("i_node", twoWinding), getEParamValue("j_node", twoWinding)]).toEqual(["11", "12"]);
  expect([
    getEParamValue("t1_node", threeWinding),
    getEParamValue("t2_node", threeWinding),
    getEParamValue("t3_node", threeWinding)
  ]).toEqual(["21", "22", "23"]);
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
  expect(calculatedTransformer.terminals).toHaveLength(4);
  expect(calculatedTransformer.params.neutral_node).toBe(neutralNode);
  expect(calculatedTransformer.params.neutral_vbase).toBe("0.4");
  expect(transformer.params.idx_xf_t1).toBeUndefined();
  expect(transformer.params.idx_xf_t2).toBeUndefined();
  expect(transformer.params.idx_xf_t3).toBeUndefined();
  expect(payload.ACTransfomer3.rows.find((row) => row.name === "T3N")).toMatchObject({
    idx: transformer.params.idx,
    t1_node: "1",
    t2_node: "2",
    t3_node: "3",
    neutral_node: neutralNode
  });
  expect(payload.ACTransformer).toBeUndefined();
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
    categoryLibrary: "交流设备",
    terminalCount: 4,
    isContainer: false
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
  expect(describeContainerTerminalAssociations(template!)).toEqual([]);
});

test("allows only terminals with the same electrical type to connect", () => {
  const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
  const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
  const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });

  expect(canConnectTerminals(acBus, "t1", acLoad, acLoad.terminals[0].id)).toBe(true);
  expect(canConnectTerminals(acBus, "t1", dcLoad, dcLoad.terminals[0].id)).toBe(false);
});

test("defines rated capacity and rated voltage as AC and DC generator defaults and exports them to E", () => {
  const baseCases = [
    { kind: "ac-source", section: "ACGenerator", ratedCapacity: "10", ratedVoltage: "10", exportedVoltage: "10" },
    { kind: "dc-source", section: "DCGenerator", ratedCapacity: "10", ratedVoltage: "750", exportedVoltage: "750" }
  ] as const;

  for (const expected of baseCases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const definitions = new Map(getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition]));
    const node = assignPermanentDeviceIndex(createDefaultNode(expected.kind, { x: 100, y: 100 }), {}).node;
    const payload = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: `${expected.kind}额定参数导出测试`,
      nodes: [node],
      edges: []
    }));

    expect(template.params).toMatchObject({
      rated_capacity: expected.ratedCapacity,
      rated_voltage: expected.ratedVoltage
    });
    expect(template.params).not.toHaveProperty("rated_power");
    expect(node.params).toMatchObject({
      rated_capacity: expected.ratedCapacity,
      rated_voltage: expected.ratedVoltage
    });
    expect(node.params).not.toHaveProperty("rated_power");
    expect(definitions.get("rated_capacity")).toMatchObject({ cnName: "额定容量", valueType: "float", readonly: false });
    expect(definitions.get("rated_voltage")).toMatchObject({ cnName: "额定电压", valueType: "float", readonly: false });
    expect(definitions.has("rated_power")).toBe(false);
    expect(payload[expected.section].columns).toEqual(expect.arrayContaining(["rated_capacity", "rated_voltage"]));
    expect(payload[expected.section].rows[0]).toMatchObject({
      rated_capacity: "10",
      rated_voltage: expected.exportedVoltage
    });
  }
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
    "status",
    "run_stat",
    "idx_ac_load_t1",
    "idx_dc_unit_t2",
    "idx_heat2_unit_t3"
  ]);
  expect(definitions.some((definition) => definition.enName.includes("node"))).toBe(false);

  const template: DeviceTemplate = {
    kind: "CustomContainer",
    label: "CustomContainer",
    categoryLibrary: "自定义类别库",
    size: { width: 104, height: 64 },
    params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", line_width: "0" },
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
  expect(voltageBaseSettingModeForNode(createDefaultNode("dcac-converter", { x: 520, y: 100 }))).toBe("terminal");
  expect(voltageBaseSettingModeForNode(createDefaultNode("dcac-converter-vertical", { x: 560, y: 100 }))).toBe("terminal");
  expect(voltageBaseSettingModeForNode(createDefaultNode("acac-converter", { x: 580, y: 100 }))).toBe("terminal");
  expect(voltageBaseSettingModeForNode(createDefaultNode("ac-line", { x: 100, y: 220 }))).toBe("uniform");
  expect(voltageBaseSettingModeForNode(createDefaultNode("ac-switch", { x: 220, y: 220 }))).toBe("uniform");
  expect(voltageBaseSettingModeForNode(createDefaultNode("ac-load", { x: 340, y: 220 }))).toBe("uniform");
});

test("allows terminal-free electrical buses to use uniform voltage base settings", () => {
  const acBus = createDefaultNode("ac-bus-vertical", { x: 100, y: 100 });
  const dcBus = createDefaultNode("dc-bus", { x: 220, y: 100 });
  dcBus.params = { ...dcBus.params, vbase: "750" };

  expect(acBus.terminals).toHaveLength(0);
  expect(dcBus.terminals).toHaveLength(0);
  expect(voltageBaseSettingModeForNode(acBus)).toBe("uniform");
  expect(voltageBaseSettingModeForNode(dcBus)).toBe("uniform");
  expect(voltageBaseSettingModeForNode(createDefaultNode("hydrogen-bus", { x: 340, y: 100 }))).toBeNull();
  expect(voltageBaseSettingModeForNode(createDefaultNode("heat-bus", { x: 460, y: 100 }))).toBeNull();

  const result = setVoltageBaseValuesForScope([acBus, dcBus], [], [acBus.id], "selected", "110");
  const byId = new Map(result.nodes.map((node) => [node.id, node]));

  expect(result.changedNodeIds).toEqual([acBus.id]);
  expect(byId.get(acBus.id)?.params.vbase).toBe("110");
  expect(byId.get(dcBus.id)?.params.vbase).toBe("750");
});

test("adds voltage base parameters to devices, transformers, and converters", () => {
  expect(createDefaultNode("ac-load", { x: 100, y: 100 }).params.vbase).toBe("0");
  const twoWinding = createDefaultNode("ac-transformer", { x: 200, y: 100 });
  expect(twoWinding.params.high_vbase).toBe("0");
  expect(twoWinding.params.low_vbase).toBe("0");
  const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });
  expect(threeWinding.params.high_vbase).toBe("0");
  expect(threeWinding.params.medium_vbase).toBe("0");
  expect(threeWinding.params.low_vbase).toBe("0");
  const converter = createDefaultNode("acdc-converter", { x: 400, y: 100 });
  expect(converter.params.source_vbase).toBe("0");
  expect(converter.params.target_vbase).toBe("0");
  expect(converter.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
  expect(converter.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
  const dcacConverter = createDefaultNode("dcac-converter", { x: 500, y: 100 });
  expect(dcacConverter.params.source_vbase).toBe("0");
  expect(dcacConverter.params.target_vbase).toBe("0");
  expect(dcacConverter.terminals.map((terminal) => terminal.type)).toEqual(["dc", "ac"]);
  expect(dcacConverter.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
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

test("uses calculated terminal topology numbers when stored E node fields are blank", () => {
  const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
  const acBreaker = createDefaultNode("ac-breaker", { x: 240, y: 100 });
  const dcBreaker = createDefaultNode("dc-breaker", { x: 380, y: 100 });
  const converter = createDefaultNode("dcac-converter", { x: 520, y: 100 });

  acLoad.params.node = "";
  acBreaker.params.i_node = "";
  acBreaker.params.j_node = "";
  dcBreaker.params.i_node = "";
  dcBreaker.params.j_node = "";
  converter.params.ac_node = "";
  converter.params.dc_node = "";

  const calculated = calculateElectricalTopology([acLoad, acBreaker, dcBreaker, converter], []);
  const byId = new Map(calculated.map((node) => [node.id, node]));
  const calculatedAcLoad = byId.get(acLoad.id)!;
  const calculatedAcBreaker = byId.get(acBreaker.id)!;
  const calculatedDcBreaker = byId.get(dcBreaker.id)!;
  const calculatedConverter = byId.get(converter.id)!;

  expect(getEParamValue("node", calculatedAcLoad)).toBe(calculatedAcLoad.terminals[0].nodeNumber);
  expect([
    getEParamValue("i_node", calculatedAcBreaker),
    getEParamValue("j_node", calculatedAcBreaker)
  ]).toEqual(calculatedAcBreaker.terminals.map((terminal) => terminal.nodeNumber));
  expect([
    getEParamValue("i_node", calculatedDcBreaker),
    getEParamValue("j_node", calculatedDcBreaker)
  ]).toEqual(calculatedDcBreaker.terminals.map((terminal) => terminal.nodeNumber));
  expect(getEParamValue("ac_node", calculatedConverter)).toBe(
    calculatedConverter.terminals.find((terminal) => terminal.type === "ac")?.nodeNumber
  );
  expect(getEParamValue("dc_node", calculatedConverter)).toBe(
    calculatedConverter.terminals.find((terminal) => terminal.type === "dc")?.nodeNumber
  );
});

test("writes numeric topology node numbers to every E node reference field instead of stored node names", () => {
  const singleTerminal = createDefaultNode("ac-load", { x: 100, y: 100 });
  const branch = createDefaultNode("ac-line", { x: 260, y: 100 });
  const converter = createDefaultNode("dcac-converter", { x: 420, y: 100 });
  const transformer = createDefaultNode("ac-three-winding-transformer", { x: 580, y: 100 });
  const exchanger = createDefaultNode("four-port-heat-exchanger", { x: 740, y: 100 });

  singleTerminal.params.node = "N_SINGLE";
  branch.params.i_node = "N_BRANCH_I";
  branch.params.j_node = "N_BRANCH_J";
  converter.params.ac_node = "N_CONVERTER_AC";
  converter.params.dc_node = "N_CONVERTER_DC";
  transformer.params.t1_node = "N_TRANSFORMER_1";
  transformer.params.t2_node = "N_TRANSFORMER_2";
  transformer.params.t3_node = "N_TRANSFORMER_3";
  transformer.params.neutral_node = "N_TRANSFORMER_NEUTRAL";
  exchanger.params.node1 = "N_EXCHANGER_1";
  exchanger.params.node2 = "N_EXCHANGER_2";
  exchanger.params.node3 = "N_EXCHANGER_3";
  exchanger.params.node4 = "N_EXCHANGER_4";

  const calculated = calculateElectricalTopology(
    [singleTerminal, branch, converter, transformer, exchanger],
    []
  );
  const byId = new Map(calculated.map((node) => [node.id, node]));
  const calculatedSingle = byId.get(singleTerminal.id)!;
  const calculatedBranch = byId.get(branch.id)!;
  const calculatedConverter = byId.get(converter.id)!;
  const calculatedTransformer = byId.get(transformer.id)!;
  const calculatedExchanger = byId.get(exchanger.id)!;

  const expectNumericNodeValues = (values: Array<string | undefined>) => {
    values.forEach((value) => expect(value).toMatch(/^\d+$/));
  };

  expect(calculatedSingle.params.node).toBe(calculatedSingle.terminals[0].nodeNumber);
  expect([calculatedBranch.params.i_node, calculatedBranch.params.j_node]).toEqual(
    calculatedBranch.terminals.map((terminal) => terminal.nodeNumber)
  );
  expect(calculatedConverter.params.ac_node).toBe(
    calculatedConverter.terminals.find((terminal) => terminal.type === "ac")?.nodeNumber
  );
  expect(calculatedConverter.params.dc_node).toBe(
    calculatedConverter.terminals.find((terminal) => terminal.type === "dc")?.nodeNumber
  );
  expect([
    calculatedTransformer.params.t1_node,
    calculatedTransformer.params.t2_node,
    calculatedTransformer.params.t3_node
  ]).toEqual(calculatedTransformer.terminals.slice(0, 3).map((terminal) => terminal.nodeNumber));
  expect([
    calculatedExchanger.params.node1,
    calculatedExchanger.params.node2,
    calculatedExchanger.params.node3,
    calculatedExchanger.params.node4
  ]).toEqual(calculatedExchanger.terminals.map((terminal) => terminal.nodeNumber));
  expectNumericNodeValues([
    calculatedSingle.params.node,
    calculatedBranch.params.i_node,
    calculatedBranch.params.j_node,
    calculatedConverter.params.ac_node,
    calculatedConverter.params.dc_node,
    calculatedTransformer.params.t1_node,
    calculatedTransformer.params.t2_node,
    calculatedTransformer.params.t3_node,
    calculatedTransformer.params.neutral_node,
    calculatedExchanger.params.node1,
    calculatedExchanger.params.node2,
    calculatedExchanger.params.node3,
    calculatedExchanger.params.node4
  ]);

  calculatedSingle.params.node = "N_STALE_SINGLE";
  calculatedBranch.params.i_node = "N_STALE_I";
  calculatedBranch.params.j_node = "N_STALE_J";
  calculatedConverter.params.ac_node = "N_STALE_AC";
  calculatedConverter.params.dc_node = "N_STALE_DC";
  expect(getEParamValue("node", calculatedSingle)).toBe(calculatedSingle.terminals[0].nodeNumber);
  expect([getEParamValue("i_node", calculatedBranch), getEParamValue("j_node", calculatedBranch)]).toEqual(
    calculatedBranch.terminals.map((terminal) => terminal.nodeNumber)
  );
  expect(getEParamValue("ac_node", calculatedConverter)).toBe(
    calculatedConverter.terminals.find((terminal) => terminal.type === "ac")?.nodeNumber
  );
  expect(getEParamValue("dc_node", calculatedConverter)).toBe(
    calculatedConverter.terminals.find((terminal) => terminal.type === "dc")?.nodeNumber
  );

  const legacyNamedNode = createDefaultNode("ac-load", { x: 900, y: 100 });
  legacyNamedNode.params.node = "N2236";
  legacyNamedNode.terminals[0].nodeNumber = "N2236";
  expect(getEParamValue("node", legacyNamedNode)).toBe("2236");
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

test("does not create an implicit bus edge when another terminal of the same device already lands on that bus", () => {
  const branch = createDefaultNode("ac-line", { x: 240, y: 100 });
  const branchEndPoint = getTerminalPoint(branch, "t2");
  const bus = createDefaultNode("ac-bus", branchEndPoint);
  const movedBus = { ...bus, position: { x: bus.position.x, y: bus.position.y + 160 } };
  const existing: Edge = {
    id: "existing-bus-edge",
    sourceId: branch.id,
    targetId: bus.id,
    sourceTerminalId: "t1",
    targetTerminalId: "t1",
    targetPoint: { x: bus.position.x - 40, y: bus.position.y }
  };

  const result = reconcileOverlappingTerminalConnections(
    [branch, bus],
    [branch, movedBus],
    [existing],
    () => "invalid-second-bus-edge"
  );

  expect(result.addedEdgeIds).toEqual([]);
  expect(result.edges).toEqual([existing]);
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
    high_vbase: "35",
    v_set: "35",
    ac_v_set: "35",
    v_set_ac_unit_t1: "35",
    voltage: "35",
    rated_voltage: "35"
  };
  load.params = { ...load.params, vbase: "10", v_set: "10", voltage: "10", rated_voltage: "10" };

  const result = clearVoltageBaseValuesForScope([source, load], [], [source.id], "selected");
  const byId = new Map(result.nodes.map((node) => [node.id, node]));

  expect(result.changedNodeIds).toEqual([source.id]);
  expect(byId.get(source.id)?.terminals[0].vbase).toBe("0.0");
  expect(byId.get(source.id)?.params).toMatchObject({
    vbase: "0.0",
    v_base: "0.0",
    high_vbase: "0.0",
    v_set: "0.0",
    ac_v_set: "0.0",
    v_set_ac_unit_t1: "0.0",
    voltage: "0.0",
    rated_voltage: "35"
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
    high_vbase: "110",
    low_vbase: "10",
    source_vbase: "110",
    target_vbase: "10",
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
  expect(nextTransformer?.params.high_vbase).toBe("0.0");
  expect(nextTransformer?.params.source_vbase).toBe("0.0");
  expect(nextTransformer?.params.i_vbase).toBe("0.0");
  expect(nextTransformer?.params.low_vbase).toBe("10");
  expect(nextTransformer?.params.target_vbase).toBe("10");
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
    high_vbase: "35",
    source_vbase: "35",
    i_vbase: "35",
    v_set: "35",
    i_v_set: "35",
    ac_v_set: "35",
    voltage: "35",
    rated_voltage: "35"
  };
  load.params = { ...load.params, vbase: "10", v_set: "10", voltage: "10", rated_voltage: "10" };

  const result = setVoltageBaseValuesForScope([source, load], [], [source.id], "selected", "110");
  const byId = new Map(result.nodes.map((node) => [node.id, node]));

  expect(result.changedNodeIds).toEqual([source.id]);
  expect(byId.get(source.id)?.terminals[0].vbase).toBe("110");
  expect(byId.get(source.id)?.params).toMatchObject({
    vbase: "110",
    v_base: "110",
    high_vbase: "110",
    source_vbase: "110",
    i_vbase: "110",
    v_set: "110",
    i_v_set: "110",
    ac_v_set: "110",
    voltage: "110",
    rated_voltage: "35"
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
    high_vbase: "110",
    medium_vbase: "35",
    low_vbase: "10",
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
  expect(nextTransformer.params.high_vbase).toBe("220");
  expect(nextTransformer.params.medium_vbase).toBe("66");
  expect(nextTransformer.params.low_vbase).toBe("20");
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
  dcdc.params.i_control_type = "P";
  dcdc.params.j_control_type = "V";
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

test("does not report floating terminals for overlapping wind source and converter terminals", () => {
  const wind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
  const converter = createDefaultNode("acdc-converter", { x: 320, y: 100 });
  const load = createDefaultNode("dc-load", { x: 560, y: 100 });
  wind.name = "交流风机";
  converter.name = "AC/DC变流器";
  load.name = "直流负荷";
  wind.terminals[0].vbase = "10";
  converter.terminals[0].vbase = "10";
  converter.terminals[1].vbase = "750";
  load.terminals[0].vbase = "750";

  const moveTerminalOnto = (node: ModelNode, terminalId: string, point: Point) => {
    const current = getTerminalPoint(node, terminalId);
    node.position = {
      x: node.position.x + point.x - current.x,
      y: node.position.y + point.y - current.y
    };
  };
  moveTerminalOnto(converter, "t1", getTerminalPoint(wind, "t1"));
  moveTerminalOnto(load, "t1", getTerminalPoint(converter, "t2"));

  const calculated = calculateElectricalTopology([wind, converter, load], []);
  const byId = new Map(calculated.map((node) => [node.id, node]));
  const errors = validateTopology([wind, converter, load], [], { includeVoltageSetpointDeviations: false });

  expect(getTerminalPoint(wind, "t1")).toEqual(getTerminalPoint(converter, "t1"));
  expect(getTerminalPoint(converter, "t2")).toEqual(getTerminalPoint(load, "t1"));
  expect(byId.get(wind.id)?.terminals[0].nodeNumber).toBe(byId.get(converter.id)?.terminals[0].nodeNumber);
  expect(byId.get(converter.id)?.terminals[1].nodeNumber).toBe(byId.get(load.id)?.terminals[0].nodeNumber);
  expect(errors.filter((error) => error.type === "floating-terminal")).toEqual([]);
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

test("allows converter endpoints to use different side voltage bases from params", () => {
  const cases = [
    {
      kind: "acac-converter" as const,
      sourceKind: "ac-source" as const,
      targetKind: "ac-load" as const,
      sourceVoltage: "110",
      targetVoltage: "35"
    },
    {
      kind: "acdc-converter" as const,
      sourceKind: "ac-source" as const,
      targetKind: "dc-load" as const,
      sourceVoltage: "10",
      targetVoltage: "750"
    },
    {
      kind: "dcdc-converter" as const,
      sourceKind: "dc-source" as const,
      targetKind: "dc-load" as const,
      sourceVoltage: "1500",
      targetVoltage: "750"
    }
  ];

  for (const item of cases) {
    const source = createDefaultNode(item.sourceKind, { x: 100, y: 100 });
    const converter = createDefaultNode(item.kind, { x: 300, y: 100 });
    const target = createDefaultNode(item.targetKind, { x: 500, y: 100 });
    source.name = `${item.kind}-source`;
    converter.name = item.kind;
    target.name = `${item.kind}-target`;
    source.terminals[0].vbase = item.sourceVoltage;
    target.terminals[0].vbase = item.targetVoltage;
    converter.terminals = converter.terminals.map((terminal) => {
      const { vbase: _vbase, ...terminalWithoutVoltageBase } = terminal;
      return terminalWithoutVoltageBase;
    });
    converter.params = {
      ...converter.params,
      source_vbase: item.sourceVoltage,
      target_vbase: item.targetVoltage
    };

    const errors = validateTopology(
      [source, converter, target],
      [
        { id: `${item.kind}-source`, sourceId: source.id, targetId: converter.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: `${item.kind}-target`, sourceId: converter.id, targetId: target.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ],
      { includeVoltageSetpointDeviations: false }
    );

    expect(errors.filter((error) => error.type === "voltage-mismatch" || error.type === "island-voltage-mismatch")).toEqual([]);
  }
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
