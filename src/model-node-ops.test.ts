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


describe("nodeOps", () => {
test("creates node terminals from terminalCount instead of stale terminalTypes slots", () => {
  const template: DeviceTemplate = {
    kind: "custom-stale-terminal-slots",
    label: "旧端子槽位设备",
    categoryLibrary: "交流设备",
    size: { width: 104, height: 64 },
    params: {
      component_type: "CustomStaleTerminalSlots"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "dc", "heat", "h2", "ac", "dc", "heat", "h2"],
    terminalLabels: ["左端", "右端", "旧端3", "旧端4"],
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0, y: -0.5 },
      { x: 0, y: 0.5 }
    ]
  };

  const node = createNodeFromTemplate(template, { x: 0, y: 0 });

  expect(node.terminals).toHaveLength(2);
  expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
  expect(node.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
  expect(node.terminals.map((terminal) => terminal.label)).toEqual(["左端", "右端"]);
  expect(node.terminals.map((terminal) => terminal.anchor)).toEqual([
    { x: -0.5, y: 0 },
    { x: 0.5, y: 0 }
  ]);
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

test("connects model-association source and load terminals to the visible hierarchy pictogram", () => {
  const kinds = [
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
  ] as const;

  for (const kind of kinds) {
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const terminal = node.terminals[0];
    const renderPoint = terminalRenderLocalPoint(terminal, node.size, 1, 1, node.kind);
    const stub = terminalStubSegment(terminal, 1, 1, 24, node.kind, node.size);
    const bodyPoint = {
      x: renderPoint.x + stub.from.x,
      y: renderPoint.y + stub.from.y
    };

    if (Math.abs(terminal.anchor.x) >= Math.abs(terminal.anchor.y)) {
      expect(Math.abs(bodyPoint.x), kind).toBeCloseTo(18);
      expect(bodyPoint.y, kind).toBeCloseTo(0);
    } else {
      expect(bodyPoint.x, kind).toBeCloseTo(0);
      expect(Math.abs(bodyPoint.y), kind).toBeCloseTo(18);
    }
  }
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

test("resolves device glyph line color and width from variant and params", () => {
  const acLine = createDefaultNode("ac-line", { x: 100, y: 100 });
  expect(getDeviceStrokeColor(acLine)).toBe("#2563eb");
  expect(getDeviceStrokeWidth(acLine)).toBe(4);

  const customColored = { ...acLine, params: { ...acLine.params, foregroundColor: "#123456", line_width: "3.5" } };
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

test("keeps keyboard move step independent from the old 5px canvas grid", () => {
  const bounds = { width: 1000, height: 800 };

  expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 1000, height: 800 }, bounds, 1)).toBe(1);
  expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 500, height: 400 }, bounds, 1)).toBe(0.5);
  expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 2000, height: 1600 }, bounds, 1)).toBe(2);
  expect(keyboardMoveStepForViewBox({ x: 0, y: 0, width: 1000, height: 800 }, bounds, 25)).toBe(25);
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

test("normalizes legacy three-winding container metadata on existing nodes", () => {
  const node = createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 });
  delete node.params.i_r;
  node.params = {
    ...node.params,
    is_container: "1",
    idx_xf_t1: "11",
    idx_xf_t2: "12",
    idx_xf_t3: "13",
    idx_ac_unit_t1: "21",
    name_ac_unit_t1: "旧关联设备",
    control_type_ac_unit_t1: "PV",
    status: "0",
    high_resistance_pu: "0.02",
    [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify([
      { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"] },
      { cnName: "高压绕组双绕组主变idx", enName: "idx_xf_t1", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "交流设备端1交流电源关联idx", enName: "idx_ac_unit_t1", valueType: "integer", typicalValue: "", readonly: true }
    ])
  };
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

  const normalized = normalizeNodeTerminalsWithTemplate(node, { ...template, isContainer: false, terminalAssociations: undefined });

  expect(normalized.params.is_container).toBeUndefined();
  expect(normalized.params.idx_xf_t1).toBeUndefined();
  expect(normalized.params.idx_xf_t2).toBeUndefined();
  expect(normalized.params.idx_xf_t3).toBeUndefined();
  expect(normalized.params.idx_ac_unit_t1).toBeUndefined();
  expect(normalized.params.name_ac_unit_t1).toBeUndefined();
  expect(normalized.params.control_type_ac_unit_t1).toBeUndefined();
  expect(normalized.params.status).toBe("0");
  expect(normalized.params.i_r).toBe("0.02");
  expect(normalized.params.r1).toBeUndefined();
  expect(normalized.params.high_resistance_pu).toBeUndefined();
});

test("migrates numbered three-winding side parameters without overwriting i j k values", () => {
  const node = createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 });
  for (const fieldName of ["i_x", "k_gt", "k_bt", "j_tap", "j_shift"]) {
    delete node.params[fieldName];
  }
  node.params = {
    ...node.params,
    i_r: "0.09",
    r1: "0.01",
    x1: "0.11",
    gt2: "0.02",
    bt2: "0.03",
    tap3: "1.03",
    shift3: "3"
  };
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

  const normalized = normalizeNodeTerminalsWithTemplate(node, template);

  expect(normalized.params).toMatchObject({
    i_r: "0.09",
    i_x: "0.11",
    k_gt: "0.02",
    k_bt: "0.03",
    j_tap: "1.03",
    j_shift: "3"
  });
  for (const fieldName of ["r1", "x1", "gt2", "bt2", "tap3", "shift3"]) {
    expect(normalized.params[fieldName]).toBeUndefined();
  }
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
});
