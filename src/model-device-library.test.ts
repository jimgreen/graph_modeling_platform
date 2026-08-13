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
  containerAssociatedDeviceIdentityForTerminal,
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


describe("deviceLibrary", () => {
test("creates electric generation parameters with shared rated defaults but without generic control defaults", () => {
  const acWind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
  const dcPv = createDefaultNode("dc-pv-source", { x: 240, y: 100 });

  expect(isGeneratorNode(acWind)).toBe(true);
  expect(acWind.nodeNumber).toMatch(/^N\d+$/);
  expect(acWind.params.rated_capacity).toBe("50");
  expect(acWind.params.rated_voltage).toBe("35");
  expect(acWind.params.rated_power).toBeUndefined();
  expect(acWind.params.control_type).toBeUndefined();
  expect(acWind.params.vbase).toBeUndefined();
  expect(acWind.params.cut_in_wind_speed).toBe("3");
  expect(acWind.params.rated_wind_speed).toBe("12");
  expect(acWind.params.cut_out_wind_speed).toBe("25");

  expect(dcPv.params.rated_capacity).toBe("5");
  expect(dcPv.params.rated_voltage).toBe("1500");
  expect(dcPv.params.rated_power).toBeUndefined();
  expect(dcPv.params.control_type).toBeUndefined();
  expect(dcPv.params.vbase).toBeUndefined();
});

test("keeps required AC and DC wind parameters when legacy visual overrides contain an empty definition list", () => {
  const expectedWindFields = [
    "cut_in_wind_speed",
    "rated_wind_speed",
    "cut_out_wind_speed"
  ];

  for (const kind of ["ac-wind-source", "dc-wind-source"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const overridden = applyDeviceTemplateDefinitionOverride(template, {
      kind,
      params: { backgroundImageFit: "fixed" },
      parameterDefinitions: []
    });
    const fieldNames = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);

    expect(fieldNames).toEqual(expect.arrayContaining(expectedWindFields));
    expect(fieldNames).not.toContain("rated_power");
    expect(fieldNames).not.toContain("rated_capacity");
    expect(fieldNames).not.toContain("rated_voltage");
    expect(fieldNames).not.toContain("unit_rated_power");
  }

  for (const kind of ["ac-source", "dc-source"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const overridden = applyDeviceTemplateDefinitionOverride(template, {
      kind,
      params: { backgroundImageFit: "fixed" },
      parameterDefinitions: []
    });
    const fieldNames = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);

    expect(fieldNames).toEqual(expect.arrayContaining(["rated_capacity", "rated_voltage"]));
    expect(fieldNames).not.toContain("rated_power");
  }
});

test("merges canonical hydrogen endpoint parameters into persisted visual overrides", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "hydrogen-source")!;
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: "HydroSource",
    params: {
      backgroundImage: "data:image/svg+xml,<svg />",
      bb: "7"
    },
    size: { width: 132, height: 76 },
    terminalType: "h2",
    terminalCount: 1,
    terminalTypes: ["h2"],
    terminalLabels: ["自定义氢端"],
    terminalAnchors: [{ x: 0.5, y: 0 }],
    parameterDefinitions: [
      { cnName: "自定义参数", enName: "bb", valueType: "float", typicalValue: "7", readonly: false }
    ]
  } as DeviceTemplateDefinitionOverride & Partial<DeviceTemplate>);
  const definitions = getTemplateParameterDefinitions(overridden);
  const definitionNames = definitions.map((definition) => definition.enName);

  expect(overridden).toMatchObject({
    size: { width: 132, height: 76 },
    terminalLabels: ["自定义氢端"],
    terminalAnchors: [{ x: 0.5, y: 0 }],
    params: expect.objectContaining({
      backgroundImage: "data:image/svg+xml,<svg />",
      bb: "7"
    })
  });
  expect(definitionNames).toEqual(expect.arrayContaining([
    "rated_capacity", "control_type", "pressure_set", "pressure_max", "pressure_min",
    "flow_set", "flow_max", "flow_min", "pressure", "flow", "bb"
  ]));
  expect(definitions.find((definition) => definition.enName === "control_type")).toMatchObject({
    valueType: "stringEnum",
    typicalValue: "FLOW",
    enumValues: ["FLOW", "PRESSURE"]
  });
});

describe("AC reactive compensation device library", () => {
  test("defines parallel and series capacitor/reactor devices with canonical parameters", () => {
    const cases = [
      { kind: "ac-capacitor", label: "并联电容器", section: "ACCompensator", devType: "CAPACITOR", terminals: 1, glyph: "ac-shunt-capacitor" },
      { kind: "ac-reactor", label: "并联电抗器", section: "ACCompensator", devType: "REACTOR", terminals: 1, glyph: "ac-shunt-reactor" },
      { kind: "ac-series-capacitor", label: "串联电容器", section: "ACSeriCompensator", devType: "CAPACITOR", terminals: 2, glyph: "ac-series-capacitor" },
      { kind: "ac-series-reactor", label: "串联电抗器", section: "ACSeriCompensator", devType: "REACTOR", terminals: 2, glyph: "ac-series-reactor" }
    ] as const;

    for (const expected of cases) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
      const definitions = getTemplateParameterDefinitions(template);
      const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
      expect(template).toMatchObject({
        label: expected.label,
        categoryLibrary: "交流设备",
        terminalType: "ac",
        terminalCount: expected.terminals,
        params: {
          dev_type: expected.devType,
          rated_voltage: "10",
          rated_reactive_power: "1",
          reactance: "100"
        }
      });
      expect(node.terminals).toHaveLength(expected.terminals);
      expect(node.terminals.every((terminal) => terminal.type === "ac")).toBe(true);
      expect(inferESection(expected.kind, node.params)).toBe(expected.section);
      expect(getDeviceGlyphVariant(expected.kind)).toBe(expected.glyph);
      for (const field of ["rated_voltage", "rated_reactive_power", "reactance"]) {
        expect(definitions.find((definition) => definition.enName === field)).toMatchObject({ valueType: "float", readonly: false });
      }
      expect(definitions.find((definition) => definition.enName === "dev_type")).toMatchObject({
        valueType: "string",
        typicalValue: expected.devType,
        readonly: true
      });
    }
  });

  test("creates vertical variants only for the two-terminal series devices", () => {
    expect(DEVICE_LIBRARY.some((item) => item.kind === "ac-capacitor-vertical")).toBe(false);
    expect(DEVICE_LIBRARY.some((item) => item.kind === "ac-reactor-vertical")).toBe(false);
    for (const kind of ["ac-series-capacitor", "ac-series-reactor"] as const) {
      const vertical = DEVICE_LIBRARY.find((item) => item.kind === `${kind}-vertical`);
      expect(vertical).toMatchObject({ terminalCount: 2, rotation: 90 });
      expect(createDefaultNode(`${kind}-vertical`, { x: 100, y: 100 }).terminals).toHaveLength(2);
    }
  });
});

test("adds AC and DC diesel generators as derived generator classes", () => {
  const cases = [
    { kind: "ac-diesel-source", terminalType: "ac", componentLibrary: "ACGenerator", derivedComponentLibrary: "ACDieselGen" },
    { kind: "dc-diesel-source", terminalType: "dc", componentLibrary: "DCGenerator", derivedComponentLibrary: "DCDieselGen" }
  ] as const;

  for (const expected of cases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind);
    expect(template).toMatchObject({
      label: expected.terminalType === "ac" ? "交流柴油发电机" : "直流柴油发电机",
      categoryLibrary: expected.terminalType === "ac" ? "交流设备" : "直流设备",
      terminalType: expected.terminalType,
      terminalCount: 1,
      params: expect.objectContaining({
        rated_capacity: "5",
        source_type: "柴油",
        diesel_unit_model: "DG-2500"
      })
    });
    expect(templateDerivedComponentLibraryInfo(template!)).toMatchObject({
      componentLibrary: expected.componentLibrary,
      derivedComponentLibrary: expected.derivedComponentLibrary,
      baseComponentLibrary: expected.componentLibrary
    });

    const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
    expect(node.terminals).toMatchObject([{
      type: expected.terminalType,
      label: expected.terminalType === "ac" ? "交流发电机端" : "直流发电机端"
    }]);
    expect(node.params.rated_capacity).toBe("5");
    expect(node.params.rated_power).toBeUndefined();
    expect(node.params.control_type).toBeUndefined();
    expect(node.params.source_type).toBe("柴油");
    expect(inferESection(expected.kind, node.params)).toBe(expected.componentLibrary);
    expect(getDeviceGlyphVariant(expected.kind)).toBe("diesel-source");
  }
});

test("defines template device status states separately from run_stat", () => {
  const switchTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-switch")!;
  const states = getTemplateStateDefinitions(switchTemplate);

  expect(states.map((state) => ({ value: state.value, name: state.name }))).toEqual([
    { value: "0", name: "打开/开断" },
    { value: "1", name: "闭合" }
  ]);

  const switchNode = createDefaultNode("ac-switch", { x: 100, y: 100 });
  expect(switchNode.params.status).toBe("1");
  expect(switchNode.params.run_stat).toBe("运行");
  expect(switchNode.params).not.toHaveProperty("_stateDefinitions");

  expect(normalizeDeviceStatusForE("0")).toBe("0");
  expect(normalizeDeviceStatusForE("1")).toBe("1");
  expect(normalizeDeviceStatusForE("2")).toBe("1");
  expect(normalizeDeviceStatusForE("打开/开断")).toBe("0");
  expect(normalizeDeviceStatusForE("闭合")).toBe("1");

  const exportedOpen = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "开关状态导出",
    nodes: [{ ...switchNode, name: "交流开关1", params: { ...switchNode.params, status: "0", run_stat: "停运" } }],
    edges: []
  }));

  expect(exportedOpen.ACSwitch.rows).toEqual([
    expect.objectContaining({
      status: "0",
      run_stat: "0"
    })
  ]);
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

test("adds terminal transformer load as a single-terminal ACLoad device", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-terminal-transformer-load");
  expect(template).toMatchObject({
    label: "终端变负荷",
    categoryLibrary: "交流设备",
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
      categoryLibrary: baseTemplate.categoryLibrary,
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

  expect(regularDevice.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBeUndefined();
  expect(nodeAllowsResizeTransform(regularDevice)).toBe(false);
  expect(staticGraphic.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBeUndefined();
  expect(nodeAllowsResizeTransform(staticGraphic)).toBe(true);
  expect(bus.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBeUndefined();
  expect(nodeAllowsResizeTransform(bus)).toBe(true);
  expect(tankContainer.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBeUndefined();
  expect(nodeAllowsResizeTransform(tankContainer)).toBe(true);
  expect(routableBranch.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBeUndefined();
  expect(nodeAllowsResizeTransform(routableBranch)).toBe(true);

  const regularDeviceWithLegacyParam: ModelNode = {
    ...regularDevice,
    params: { ...regularDevice.params, [ALLOW_RESIZE_TRANSFORM_PARAM]: "1" }
  };
  const busWithLegacyParam: ModelNode = {
    ...bus,
    params: { ...bus.params, [ALLOW_RESIZE_TRANSFORM_PARAM]: "0" }
  };
  expect(nodeAllowsResizeTransform(regularDeviceWithLegacyParam)).toBe(false);
  expect(nodeAllowsResizeTransform(busWithLegacyParam)).toBe(true);
  expect(buildDefaultDeviceParameterDefinitions(["ac"]).map((definition) => definition.enName)).not.toContain(ALLOW_RESIZE_TRANSFORM_PARAM);
  expect(getTemplateParameterDefinitions(DEVICE_LIBRARY.find((item) => item.kind === "ac-line")!).map((definition) => definition.enName)).not.toContain(ALLOW_RESIZE_TRANSFORM_PARAM);
});

test("keeps custom template resize permission when definition overrides omit it", () => {
  const template: DeviceTemplate = {
    kind: "custom-resize-device",
    label: "可变形自定义设备",
    categoryLibrary: "交流设备",
    size: { width: 104, height: 64 },
    allowResizeTransform: true,
    params: {
      component_type: "CustomResizeDevice",
      backgroundImage: "data:image/svg+xml,<svg />"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "ac"],
    terminalLabels: ["端1", "端2"],
    custom: true,
    parameterDefinitions: [
      { cnName: "工作状态", enName: "run_stat", valueType: "enum", typicalValue: "运行" }
    ]
  };
  const overriddenTemplate = applyDeviceTemplateDefinitionOverride(template, {
    kind: "CustomResizeDevice",
    params: {
      component_type: "CustomResizeDevice",
      run_stat: "运行"
    },
    parameterDefinitions: [
      { cnName: "工作状态", enName: "run_stat", valueType: "enum", typicalValue: "运行" }
    ],
    updatedAt: "2026-06-07T00:00:00.000Z"
  });
  const node = createNodeFromTemplate(overriddenTemplate, { x: 0, y: 0 });

  expect(overriddenTemplate.allowResizeTransform).toBe(true);
  expect(getTemplateParameterDefinitions(overriddenTemplate).map((definition) => definition.enName)).not.toContain(ALLOW_RESIZE_TRANSFORM_PARAM);
  expect(node.params[ALLOW_RESIZE_TRANSFORM_PARAM]).toBeUndefined();
});

test("applies visual and terminal definition overrides to templates", () => {
  const template: DeviceTemplate = {
    kind: "custom-visual-override-device",
    label: "图标覆盖设备",
    categoryLibrary: "交流设备",
    size: { width: 104, height: 64 },
    params: {
      component_type: "CustomVisualOverrideDevice",
      backgroundImage: ""
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "ac"],
    terminalLabels: ["左端", "右端"],
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 }
    ],
    parameterDefinitions: [
      { cnName: "工作状态", enName: "run_stat", valueType: "enum", typicalValue: "运行" }
    ]
  };
  const overriddenTemplate = applyDeviceTemplateDefinitionOverride(template, {
    kind: "CustomVisualOverrideDevice",
    params: {
      component_type: "CustomVisualOverrideDevice",
      backgroundImage: "data:image/svg+xml,<svg />",
      backgroundImageAssetId: ""
    },
    size: { width: 150, height: 90 },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "dc"],
    terminalLabels: ["上端", "下端"],
    terminalAnchors: [
      { x: 0, y: -0.5 },
      { x: 0, y: 0.5 }
    ],
    parameterDefinitions: [
      { cnName: "工作状态", enName: "run_stat", valueType: "enum", typicalValue: "运行" }
    ],
    updatedAt: "2026-06-07T00:00:00.000Z"
  } as DeviceTemplateDefinitionOverride & Partial<DeviceTemplate>);
  const node = createNodeFromTemplate(overriddenTemplate, { x: 0, y: 0 });

  expect(overriddenTemplate.size).toEqual({ width: 150, height: 90 });
  expect(overriddenTemplate.params.backgroundImage).toBe("data:image/svg+xml,<svg />");
  expect(overriddenTemplate.terminalTypes).toEqual(["ac", "dc"]);
  expect(overriddenTemplate.terminalLabels).toEqual(["上端", "下端"]);
  expect(overriddenTemplate.terminalAnchors).toEqual([
    { x: 0, y: -0.5 },
    { x: 0, y: 0.5 }
  ]);
  expect(node.terminals.map((terminal) => terminal.anchor)).toEqual([
    { x: 0, y: -0.5 },
    { x: 0, y: 0.5 }
  ]);
});

test("normalizes saved nodes by trimming terminals that exceed the template count", () => {
  const template = DEVICE_LIBRARY.find((item) => item.terminalCount === 2 && !isRoutableLineDeviceKind(item.kind))!;
  const node = createNodeFromTemplate(template, { x: 0, y: 0 });
  const staleNode = {
    ...node,
    terminals: [
      ...node.terminals,
      { ...node.terminals[0], id: "t3", label: "旧端3", anchor: { x: 0, y: -0.5 } },
      { ...node.terminals[1], id: "t4", label: "旧端4", anchor: { x: 0, y: 0.5 } }
    ]
  };

  const normalized = normalizeNodeTerminalsByTemplate(staleNode);

  expect(normalized.terminals).toHaveLength(template.terminalCount);
  expect(normalized.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
});

test("normalizes saved nodes against a custom template instead of keeping stale terminal slots", () => {
  const template: DeviceTemplate = {
    kind: "custom-template-with-stale-saved-node",
    label: "自定义端子裁剪设备",
    categoryLibrary: "交流设备",
    size: { width: 104, height: 64 },
    params: {
      component_type: "CustomTemplateWithStaleSavedNode"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "dc"],
    terminalLabels: ["左端", "右端"],
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 }
    ]
  };
  const node = createNodeFromTemplate({
    ...template,
    terminalCount: 8,
    terminalTypes: ["ac", "dc", "heat", "h2", "ac", "dc", "heat", "h2"]
  }, { x: 0, y: 0 });

  const normalized = normalizeNodeTerminalsWithTemplate(node, template);

  expect(node.terminals).toHaveLength(8);
  expect(normalized.terminals).toHaveLength(2);
  expect(normalized.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
  expect(normalized.terminals.map((terminal) => terminal.label)).toEqual(["左端", "右端"]);
});

test("places converter elements under AC/DC device library groups", () => {
  expect(DEVICE_LIBRARY.find((item) => item.kind === "acac-converter")).toMatchObject({ categoryLibrary: "交流设备" });
  expect(DEVICE_LIBRARY.find((item) => item.kind === "acdc-converter")).toMatchObject({ categoryLibrary: "直流设备" });
  expect(DEVICE_LIBRARY.find((item) => item.kind === "dcac-converter")).toMatchObject({ categoryLibrary: "直流设备" });
  expect(DEVICE_LIBRARY.find((item) => item.kind === "dcdc-converter")).toMatchObject({ categoryLibrary: "直流设备" });
});

test("adds an AC grounding disconnector as a single-terminal grounding device", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-ground-disconnector");
  const verticalTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-ground-disconnector-vertical");
  expect(template).toMatchObject({
    label: "接地刀闸",
    categoryLibrary: "交流设备",
    terminalType: "ac",
    terminalCount: 1,
    params: expect.objectContaining({ status: "0" })
  });
  expect(verticalTemplate).toMatchObject({
    label: "竖向接地刀闸",
    categoryLibrary: "交流设备",
    terminalType: "ac",
    terminalCount: 1,
    params: expect.objectContaining({ status: "0" })
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

test("动态反向映射：国网模板的'交流电化学储能'解析为 ACStorageGen", () => {
  const text = `<estore 中文名="储能" 类别库="交流设备" 元件库="交流电化学储能">
@    idx    name
//   序号   名称
</estore>`;
  const sections = parseEDeviceDefinitionFile(text);
  expect(sections).toHaveLength(1);
  expect(sections[0].componentLibrary).toBe("ACStorageGen");
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

  for (const [kind, label, categoryLibrary, terminalType, section] of cases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
    expect(template).toMatchObject({ label, categoryLibrary, terminalType, terminalCount: 2 });
    const node = createDefaultNode(kind, { x: 300, y: 160 });
    const points = routableLineDeviceLocalPoints(node);

    expect(isRoutableLineDeviceKind(kind)).toBe(true);
    expect(node.params[ROUTABLE_LINE_POINTS_PARAM]).toBeTruthy();
    expect(points).toHaveLength(2);
    expect(points[0].x).toBeLessThan(points[1].x);
    expect(getDeviceGlyphVariant(kind)).toBe("routable-line");
    expect(node.params.line_width).toBe(String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH));
    expect(getDeviceStrokeWidth(node)).toBe(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH);
    expect(inferESection(kind, node.params)).toBe(section);
  }
});

test("connects custom device terminals back to the inner three-quarter drawing frame", () => {
  const size = { width: 160, height: 120 };

  expect(terminalStubSegment({ anchor: { x: -0.5, y: 0 } }, 1, 1, 24, "custom-test" as DeviceKind, size)).toEqual({
    from: { x: 24, y: 0 },
    to: { x: 0, y: 0 }
  });
  expect(terminalStubSegment({ anchor: { x: 0.5, y: 0 } }, 1, 1, 24, "custom-test" as DeviceKind, size)).toEqual({
    from: { x: -24, y: 0 },
    to: { x: 0, y: 0 }
  });
  expect(terminalStubSegment({ anchor: { x: 0, y: -0.5 } }, 1, 1, 24, "custom-test" as DeviceKind, size)).toEqual({
    from: { x: 0, y: 19 },
    to: { x: 0, y: 0 }
  });
  expect(terminalStubSegment({ anchor: { x: 0, y: 0.5 } }, 1, 1, 24, "custom-test" as DeviceKind, size)).toEqual({
    from: { x: 0, y: -19 },
    to: { x: 0, y: 0 }
  });
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

test("renames pasted user-named device copies with the component label and newly allocated idx", () => {
  const copiedLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
  copiedLoad.name = "用户命名负荷 副本";
  copiedLoad.params = { ...copiedLoad.params, idx: "2" };

  const resetLoad = resetDeviceIndexesForPaste(copiedLoad);
  const { node: pastedLoad } = assignPermanentDeviceIndex(resetLoad, { ACLoad: 4 });

  expect(pastedLoad.params.idx).toBe("5");
  expect(pastedLoad.name).toBe("交流负荷-5");
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

test("creates load, line, and transformer electrical parameter defaults", () => {
  const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
  const dcLoad = createDefaultNode("dc-load", { x: 200, y: 100 });
  const acLine = createDefaultNode("ac-line", { x: 300, y: 100 });
  const twoWinding = createDefaultNode("ac-transformer", { x: 400, y: 100 });
  const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 500, y: 100 });

  expect(acLoad.nodeNumber).toMatch(/^N\d+$/);
  expect(acLoad.params.rated_active_power).toBe("5 MW");
  expect(acLoad.params.pv0).toBe("1.0");
  expect(acLoad.params.pv1).toBe("0.0");
  expect(acLoad.params.pv2).toBe("0.0");
  expect(acLoad.params.rated_reactive_power).toBe("1.2 Mvar");
  expect(acLoad.params.qv0).toBe("1.0");
  expect(acLoad.params.qv1).toBe("0.0");
  expect(acLoad.params.qv2).toBe("0.0");
  expect(dcLoad.params.rated_reactive_power).toBeUndefined();

  expect(acLine.terminals[0].nodeNumber).toMatch(/^N\d+$/);
  expect(acLine.terminals[1].nodeNumber).toMatch(/^N\d+$/);
  expect(acLine.params.r).toBe("0.1");
  expect(acLine.params.x).toBe("1.0");
  expect(acLine.params.b).toBe("0.0");

  expect(twoWinding.terminals).toHaveLength(2);
  expect(twoWinding.params.high_vbase).toBe("0");
  expect(twoWinding.params.low_vbase).toBe("0");
  expect(twoWinding.params.rated_capacity).toBe("50");
  expect(twoWinding.params.r).toBe("0.0");
  expect(twoWinding.params.x).toBe("0.1");
  expect(twoWinding.params.gt).toBe("0.0");
  expect(twoWinding.params.bt).toBe("0.0");
  expect(twoWinding.params.tap).toBe("1.0");

  expect(threeWinding.terminals).toHaveLength(3);
  expect(threeWinding.params.high_vbase).toBe("0");
  expect(threeWinding.params.medium_vbase).toBe("0");
  expect(threeWinding.params.low_vbase).toBe("0");
  expect(threeWinding.params.high_rated_capacity).toBe("90");
  expect(threeWinding.params.medium_rated_capacity).toBe("90");
  expect(threeWinding.params.low_rated_capacity).toBe("90");
  expect(threeWinding.params.tap1).toBe("1.0");
  expect(threeWinding.params.tap2).toBe("1.0");
  expect(threeWinding.params.tap3).toBe("1.0");
  expect(threeWinding.params.is_container).toBeUndefined();
  expect(threeWinding.params.neutral_node).toBe("");
  expect(threeWinding.params.neutral_vbase).toBe("1.0");
  expect(threeWinding.params.idx_xf_t1).toBeUndefined();
  expect(threeWinding.params.idx_xf_t2).toBeUndefined();
  expect(threeWinding.params.idx_xf_t3).toBeUndefined();
  expect(threeWinding.params.idx_ac_transformer_t1).toBeUndefined();

  const twoWindingDefinitions = new Map(
    getTemplateParameterDefinitions(DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer")!)
      .map((definition) => [definition.enName, definition])
  );
  for (const fieldName of ["high_vbase", "low_vbase", "rated_capacity"]) {
    expect(twoWindingDefinitions.get(fieldName)?.valueType, fieldName).toBe("float");
  }
  const threeWindingDefinitions = new Map(
    getTemplateParameterDefinitions(DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!)
      .map((definition) => [definition.enName, definition])
  );
  for (const fieldName of [
    "high_vbase",
    "medium_vbase",
    "low_vbase",
    "high_rated_capacity",
    "medium_rated_capacity",
    "low_rated_capacity"
  ]) {
    expect(threeWindingDefinitions.get(fieldName)?.valueType, fieldName).toBe("float");
  }

  const dcdc = createDefaultNode("dcdc-converter", { x: 600, y: 100 });
  expect(dcdc.terminals[0].nodeNumber).toMatch(/^N\d+$/);
  expect(dcdc.terminals[1].nodeNumber).toMatch(/^N\d+$/);
  expect(dcdc.params.source_equivalent_resistance).toBe("0.0");
  expect(dcdc.params.target_equivalent_resistance).toBe("0.0");
  expect(dcdc.params).toMatchObject({
    rated_capacity: "5",
    i_p_max: "5",
    i_p_min: "-5",
    i_i_max: "0",
    i_v_max: "1.1",
    i_v_min: "0.9",
    j_p_max: "5",
    j_p_min: "-5",
    j_i_max: "0",
    j_v_max: "1.1",
    j_v_min: "0.9"
  });
  expect(dcdc.params.i_control_type).toBe("P");
  expect(dcdc.params.j_control_type).toBe("NONE");
  expect(dcdc.params.control_type).toBeUndefined();

  const acdc = createDefaultNode("acdc-converter", { x: 700, y: 100 });
  expect(acdc.terminals.map((terminal) => terminal.type)).toEqual(["ac", "dc"]);
  expect(acdc.terminals.map((terminal) => terminal.vbase)).toEqual(["0", "0"]);
  expect(acdc.params.source_equivalent_resistance).toBe("0.0");
  expect(acdc.params.target_equivalent_resistance).toBe("0.0");
  expect(acdc.params).toMatchObject({
    rated_capacity: "10",
    ac_p_max: "10",
    ac_p_min: "-10",
    ac_q_max: "10",
    ac_q_min: "-10",
    ac_i_max: "0",
    ac_v_max: "1.1",
    ac_v_min: "0.9",
    dc_p_max: "10",
    dc_p_min: "-10",
    dc_i_max: "0",
    dc_v_max: "1.1",
    dc_v_min: "0.9"
  });
  expect(acdc.params.control_type).toBeUndefined();
  expect(acdc.params.ac_control_type).toBe("PQ");
  expect(acdc.params.dc_control_type).toBe("V");

  const acac = createDefaultNode("acac-converter", { x: 800, y: 100 });
  expect(acac.params.source_equivalent_resistance).toBe("0.0");
  expect(acac.params.target_equivalent_resistance).toBe("0.0");
  expect(acac.params).toMatchObject({
    rated_capacity: "10",
    i_p_max: "10",
    i_p_min: "-10",
    i_q_max: "10",
    i_q_min: "-10",
    i_i_max: "0",
    i_v_max: "1.1",
    i_v_min: "0.9",
    j_p_max: "10",
    j_p_min: "-10",
    j_q_max: "10",
    j_q_min: "-10",
    j_i_max: "0",
    j_v_max: "1.1",
    j_v_min: "0.9"
  });
  expect(acac.params.i_control_type).toBe("PQ");
  expect(acac.params.j_control_type).toBe("PQ");
  expect(acac.params.control_type).toBeUndefined();
  expect(acac.params.source_control_type).toBeUndefined();
  expect(acac.params.target_control_type).toBeUndefined();

  const dcLine = createDefaultNode("dc-line", { x: 900, y: 100 });
  expect(dcLine.params.r).toBe("1.0");
  expect(dcLine.params.x).toBeUndefined();
  expect(dcLine.params.b).toBeUndefined();

  const acSwitch = createDefaultNode("ac-switch", { x: 1000, y: 100 });
  const dcBreaker = createDefaultNode("dc-breaker", { x: 1100, y: 100 });
  expect(acSwitch.terminals[0].nodeNumber).toMatch(/^N\d+$/);
  expect(acSwitch.terminals[1].nodeNumber).toMatch(/^N\d+$/);
  expect(acSwitch.params.rated_capacity).toBe("1250");
  expect(acSwitch.params.status).toBe("1");
  expect(acSwitch.params.closed_status).toBeUndefined();
  expect(getSwitchVisualState(acSwitch)).toBe("closed");
  acSwitch.params.status = "0";
  expect(getSwitchVisualState(acSwitch)).toBe("open");
  acSwitch.params.status = "1";
  expect(getSwitchVisualState(acSwitch)).toBe("closed");
  delete dcBreaker.params.status;
  dcBreaker.params.closed_status = "打开";
  expect(getSwitchVisualState(dcBreaker)).toBe("open");
  dcBreaker.params.status = "1";
  expect(getSwitchVisualState(dcBreaker)).toBe("closed");
});

test("migrates saved transformer engineering fields to float definitions and numeric defaults", () => {
  const twoWindingTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer")!;
  const twoWinding = applyDeviceTemplateDefinitionOverride(twoWindingTemplate, {
    kind: twoWindingTemplate.kind,
    params: {
      high_vbase: "110 kV",
      low_vbase: "10 kV",
      rated_capacity: "50 MVA"
    },
    parameterDefinitions: [
      { cnName: "高压侧电压等级", enName: "high_vbase", valueType: "string", typicalValue: "110 kV" },
      { cnName: "低压侧电压等级", enName: "low_vbase", valueType: "string", typicalValue: "10 kV" },
      { cnName: "额定容量", enName: "rated_capacity", valueType: "string", typicalValue: "50 MVA" }
    ]
  });
  const twoWindingDefinitions = new Map(
    getTemplateParameterDefinitions(twoWinding).map((definition) => [definition.enName, definition])
  );

  expect(twoWinding.params).toMatchObject({
    high_vbase: "110",
    low_vbase: "10",
    rated_capacity: "50"
  });
  for (const fieldName of ["high_vbase", "low_vbase", "rated_capacity"]) {
    expect(twoWindingDefinitions.get(fieldName), fieldName).toMatchObject({
      valueType: "float",
      typicalValue: twoWinding.params[fieldName]
    });
  }

  const threeWindingTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;
  const legacyThreeWindingValues = {
    high_vbase: "220 kV",
    high_rated_capacity: "90 MVA",
    medium_vbase: "110 kV",
    medium_rated_capacity: "90 MVA",
    low_vbase: "10 kV",
    low_rated_capacity: "90 MVA"
  };
  const threeWinding = applyDeviceTemplateDefinitionOverride(threeWindingTemplate, {
    kind: threeWindingTemplate.kind,
    params: legacyThreeWindingValues,
    parameterDefinitions: Object.entries(legacyThreeWindingValues).map(([enName, typicalValue]) => ({
      cnName: enName,
      enName,
      valueType: "string",
      typicalValue
    }))
  });
  const threeWindingDefinitions = new Map(
    getTemplateParameterDefinitions(threeWinding).map((definition) => [definition.enName, definition])
  );

  expect(threeWinding.params).toMatchObject({
    high_vbase: "220",
    high_rated_capacity: "90",
    medium_vbase: "110",
    medium_rated_capacity: "90",
    low_vbase: "10",
    low_rated_capacity: "90"
  });
  for (const fieldName of Object.keys(legacyThreeWindingValues)) {
    expect(threeWindingDefinitions.get(fieldName), fieldName).toMatchObject({
      valueType: "float",
      typicalValue: threeWinding.params[fieldName]
    });
  }
});

test("formats load base power display values without units", () => {
  expect(formatPowerBaseDisplayValue("pbase", "5 MW")).toBe("5");
  expect(formatPowerBaseDisplayValue("qbase", "1.2 Mvar")).toBe("1.2");
  expect(formatPowerBaseDisplayValue("pbase", "5 kW")).toBe("5");
  expect(formatPowerBaseDisplayValue("qbase", "1.2 kvar")).toBe("1.2");
  expect(formatPowerBaseDisplayValue("pbase", "5")).toBe("5");
  expect(formatPowerBaseDisplayValue("qbase", "1.2")).toBe("1.2");
  expect(formatPowerBaseDisplayValue("pv0", "1.0 kW")).toBe("1.0 kW");
});

test("formats SOC and efficiency values as percentages while storing decimal ratios", () => {
  expect(formatPowerBaseDisplayValue("state_of_charge", "0.5")).toBe("50%");
  expect(formatPowerBaseDisplayValue("soc_upper_limit", "0.99")).toBe("99%");
  expect(formatPowerBaseDisplayValue("module_efficiency", "0.213")).toBe("21.3%");
  expect(formatPowerBaseDisplayValue("generator_efficiency", "98.5")).toBe("98.5%");
  expect(formatPowerBaseDisplayValue("rated_voltage", "10")).toBe("10");

  expect(normalizeRatioParameterInputValue("state_of_charge", "99%")).toBe("0.99");
  expect(normalizeRatioParameterInputValue("state_of_charge", "99")).toBe("0.99");
  expect(normalizeRatioParameterInputValue("state_of_charge", "0.99")).toBe("0.99");
  expect(normalizeRatioParameterInputValue("charge_discharge_efficiency", "100%")).toBe("1");
  expect(normalizeRatioParameterInputValue("charge_discharge_efficiency", "101%")).toBeNull();
  expect(normalizeRatioParameterInputValue("rated_voltage", "99%")).toBe("99%");
  expect(formatPowerBaseDisplayValue("e2h_coeff", "0.2")).toBe("0.2");
  expect(formatPowerBaseDisplayValue("h2e_coeff", "1.5")).toBe("1.5");
  expect(normalizeRatioParameterInputValue("e2h_coeff", "0.1")).toBe("0.1");
  expect(normalizeRatioParameterInputValue("e2h_coeff", "0.5")).toBe("0.5");
  expect(normalizeRatioParameterInputValue("e2h_coeff", "0.09")).toBeNull();
  expect(normalizeRatioParameterInputValue("e2h_coeff", "0.51")).toBeNull();
  expect(normalizeRatioParameterInputValue("e2h_coeff", "0.5", "AcE2Heat")).toBe("0.5");
  expect(normalizeRatioParameterInputValue("e2h_coeff", "5.0", "DcE2Heat2")).toBe("5");
  expect(normalizeRatioParameterInputValue("e2h_coeff", "0.49", "AcE2Heat2")).toBeNull();
  expect(normalizeRatioParameterInputValue("e2h_coeff", "5.01", "DcE2Heat")).toBeNull();
  expect(normalizeRatioParameterInputValue("h2e_coeff", "1.0")).toBe("1");
  expect(normalizeRatioParameterInputValue("h2e_coeff", "2.0")).toBe("2");
  expect(normalizeRatioParameterInputValue("h2e_coeff", "0.99")).toBeNull();
  expect(normalizeRatioParameterInputValue("h2e_coeff", "2.01")).toBeNull();
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

test("inherits generator rated defaults in derived sources and migrates legacy rated power values", () => {
  const acWind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
  const dcPv = createDefaultNode("dc-pv-source", { x: 240, y: 100 });

  expect(acWind.params).toMatchObject({ rated_capacity: "50", rated_voltage: "35" });
  expect(dcPv.params).toMatchObject({ rated_capacity: "5", rated_voltage: "1500" });
  expect(acWind.params).not.toHaveProperty("rated_power");
  expect(dcPv.params).not.toHaveProperty("rated_power");

  const legacyWind: ModelNode = {
    ...acWind,
    params: {
      ...acWind.params,
      rated_power: "42 MW"
    }
  };
  delete legacyWind.params.rated_capacity;

  const normalized = normalizeNodeTerminalsByTemplate(legacyWind);
  expect(normalized.params.rated_capacity).toBe("42");
  expect(normalized.params.rated_voltage).toBe("35");
  expect(normalized.params).not.toHaveProperty("rated_power");

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "旧派生电源额定参数导出测试",
    nodes: [legacyWind],
    edges: []
  }));
  expect(payload.ACGenerator.rows[0]).toMatchObject({
    rated_capacity: "42",
    rated_voltage: "35"
  });
});

test("omits equipment-count fields from generation derived classes and historical overrides", () => {
  const retiredCountFieldByFamily = {
    wind: "wind_turbine_count",
    pv: "pv_module_count",
    diesel: "diesel_unit_count",
    hydro: "turbine_count",
    nuclear: "reactor_count"
  } as const;

  for (const expected of electricGenerationCases) {
    const retiredField = retiredCountFieldByFamily[expected.family as keyof typeof retiredCountFieldByFamily];
    if (!retiredField) {
      continue;
    }
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
    const retiredDefinition = {
      cnName: "历史台数字段",
      enName: retiredField,
      valueType: "integer" as const,
      typicalValue: "99"
    };
    const overridden = applyDeviceTemplateDefinitionOverride(template, {
      kind: expected.kind,
      params: {
        [retiredField]: "99",
        legacy_note: "keep"
      },
      parameterDefinitions: [
        ...getTemplateParameterDefinitions(template),
        retiredDefinition,
        { cnName: "历史备注", enName: "legacy_note", valueType: "string", typicalValue: "keep" }
      ]
    });
    const reconciledLegacyNode = reconcileNodeParamsWithTemplateDefinitions({
      ...node,
      params: {
        ...node.params,
        [retiredField]: "99",
        [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify([
          ...getTemplateParameterDefinitions(template),
          retiredDefinition
        ])
      }
    }, template);
    const overriddenFieldNames = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);

    expect(getTemplateParameterDefinitions(template).map((definition) => definition.enName), expected.kind).not.toContain(retiredField);
    expect(node.params, expected.kind).not.toHaveProperty(retiredField);
    expect(overriddenFieldNames, expected.kind).not.toContain(retiredField);
    expect(overridden.params, expected.kind).not.toHaveProperty(retiredField);
    expect(reconciledLegacyNode.params, expected.kind).not.toHaveProperty(retiredField);
    expect(overriddenFieldNames, expected.kind).toContain("legacy_note");
    expect(overridden.params.legacy_note, expected.kind).toBe("keep");
  }
});

test("omits per-unit and per-component rated power fields from generation derived classes", () => {
  const retiredPowerFieldByFamily = {
    wind: "unit_rated_power",
    pv: "module_rated_power",
    diesel: "unit_rated_power",
    hydro: "unit_rated_power",
    nuclear: "unit_rated_power"
  } as const;

  for (const expected of electricGenerationCases) {
    const retiredField = retiredPowerFieldByFamily[expected.family as keyof typeof retiredPowerFieldByFamily];
    if (!retiredField) {
      continue;
    }
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
    const retiredDefinition = {
      cnName: retiredField === "module_rated_power" ? "单组件额定功率" : "单机额定功率",
      enName: retiredField,
      valueType: "string" as const,
      typicalValue: "999 MW"
    };
    const overridden = applyDeviceTemplateDefinitionOverride(template, {
      kind: expected.kind,
      params: { [retiredField]: "999 MW" },
      parameterDefinitions: [
        ...getTemplateParameterDefinitions(template),
        retiredDefinition
      ]
    });
    const reconciledLegacyNode = reconcileNodeParamsWithTemplateDefinitions({
      ...node,
      params: {
        ...node.params,
        [retiredField]: "999 MW",
        [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify([
          ...getTemplateParameterDefinitions(template),
          retiredDefinition
        ])
      }
    }, template);

    expect(getTemplateParameterDefinitions(template).map((definition) => definition.enName), expected.kind).not.toContain(retiredField);
    expect(node.params, expected.kind).not.toHaveProperty(retiredField);
    expect(getTemplateParameterDefinitions(overridden).map((definition) => definition.enName), expected.kind).not.toContain(retiredField);
    expect(overridden.params, expected.kind).not.toHaveProperty(retiredField);
    expect(reconciledLegacyNode.params, expected.kind).not.toHaveProperty(retiredField);
  }
});

test("defines 0-1 SOC defaults and limits for AC and DC storage", () => {
  for (const kind of ["ac-storage", "dc-storage"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const definitions = new Map(getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition]));

    expect(definitions.get("soc_upper_limit")).toMatchObject({
      cnName: "SOC上限",
      valueType: "float",
      readonly: false
    });
    expect(definitions.get("soc_lower_limit")).toMatchObject({
      cnName: "SOC下限",
      valueType: "float",
      readonly: false
    });
    expect(node.params.state_of_charge).toBe("0.5");
    expect(node.params.soc_upper_limit).toBe("0.9");
    expect(node.params.soc_lower_limit).toBe("0.1");
  }
});

test("removes inherited rated fields from legacy electric generation definition overrides", () => {
  for (const expected of electricGenerationCases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const overridden = applyDeviceTemplateDefinitionOverride(template, {
      kind: expected.kind,
      params: {
        rated_power: expected.rated_power,
        rated_voltage: expected.rated_voltage,
        ...(expected.family === "wind" ? { unit_rated_power: "5 MW" } : {})
      },
      parameterDefinitions: [
        ...getTemplateParameterDefinitions(template),
        { cnName: "额定功率", enName: "rated_power", valueType: "string", typicalValue: expected.rated_power },
        { cnName: "额定电压", enName: "rated_voltage", valueType: "string", typicalValue: expected.rated_voltage },
        ...(expected.family === "wind"
          ? [{ cnName: "单机额定功率", enName: "unit_rated_power", valueType: "string" as const, typicalValue: "5 MW" }]
          : [])
      ]
    });
    const fieldNames = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);

    expect(fieldNames).not.toContain("rated_power");
    expect(fieldNames).not.toContain("rated_capacity");
    expect(fieldNames).not.toContain("rated_voltage");
    expect(overridden.params.rated_capacity).toBe(expected.rated_power);
    expect(overridden.params).not.toHaveProperty("rated_power");
    expect(overridden.params.rated_voltage).toBe(expected.rated_voltage);
    if (expected.family === "wind") {
      expect(fieldNames).not.toContain("unit_rated_power");
      expect(overridden.params).not.toHaveProperty("unit_rated_power");
    }
  }
});

test("defines electric generation derived classes within the base power-source libraries without making them containers", () => {
  for (const expected of electricGenerationCases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
    const definitions = new Map(getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition]));

    expect(template.isContainer).toBeFalsy();
    expect(node.params).not.toHaveProperty("is_container");
    expect(definitions.has("deriveNewClass")).toBe(false);
    expect(definitions.has("derivedClassCnName")).toBe(false);
    expect(definitions.has("derivedComponentType")).toBe(false);
    expect(node.params).not.toHaveProperty("deriveNewClass");
    expect(node.params).not.toHaveProperty("derivedClassCnName");
    expect(node.params).not.toHaveProperty("derivedComponentType");

    const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === (expected.terminalType === "ac" ? "ac-source" : "dc-source"))!;
    const file = buildEDeviceDefinitionFile([baseTemplate, template]);
    const sections = parseEDeviceDefinitionFile(file.text);
    expect(sections).toHaveLength(2);
    const expectedComponentLibrary = expected.terminalType === "ac" ? "ACGenerator" : "DCGenerator";
    const baseSection = sections.find((section) => section.kind === expectedComponentLibrary);
    const derivedSection = sections.find((section) => section.kind === expected.derivedComponentType);
    expect(baseSection).toMatchObject({
      kind: expectedComponentLibrary,
      label: expected.terminalType === "ac" ? "交流电源" : "直流电源",
      categoryLibrary: expected.terminalType === "ac" ? "交流设备" : "直流设备",
      componentLibrary: expectedComponentLibrary,
      originalComponentLibrary: undefined,
      derivedFromComponentLibrary: undefined,
      isDerivedComponentLibrary: undefined,
      isContainerComponentLibrary: undefined
    });
    expect(derivedSection).toMatchObject({
      kind: expected.derivedComponentType,
      label: expected.label,
      categoryLibrary: expected.terminalType === "ac" ? "交流设备" : "直流设备",
      componentLibrary: expected.derivedComponentType,
      derivedFromComponentLibrary: expectedComponentLibrary,
      isDerivedComponentLibrary: true,
      isContainerComponentLibrary: undefined
    });
    expect(derivedSection?.fields.map((field) => field.exportName).slice(0, 2)).toEqual(["idx", expected.relationKey]);
    expect(derivedSection?.fields.map((field) => field.exportName)).not.toContain("name");
    expect(derivedSection?.fields.map((field) => field.exportName)).not.toContain("dev_type");
    expect(derivedSection?.fields.map((field) => field.exportName)).not.toContain("rated_power");
    expect(derivedSection?.fields.map((field) => field.exportName)).not.toContain("rated_voltage");
    const baseFieldNames = new Set(baseSection?.fields.map((field) => field.exportName));
    for (const field of derivedSection?.fields ?? []) {
      if (field.exportName !== "idx" && field.exportName !== expected.relationKey) {
        expect(baseFieldNames.has(field.exportName)).toBe(false);
      }
    }
    expect(file.text).toContain(`是否派生新类="是"`);
    expect(file.text).toContain(`派生基类="${expectedComponentLibrary}"`);
    expect(file.text).not.toContain(`是否容器="是"`);
  }
});

test("defines family-specific electric generation parameters and engineering defaults", () => {
  const familyDefinitions = {
    wind: {
      wind_turbine_model: "string",
      cut_in_wind_speed: "float",
      rated_wind_speed: "float",
      cut_out_wind_speed: "float",
      rotor_diameter: "float",
      hub_height: "float"
    },
    pv: {
      pv_module_model: "string",
      module_efficiency: "float",
      array_area: "float",
      mppt_count: "integer",
      reference_irradiance: "float",
      reference_temperature: "float",
      temperature_coefficient: "float"
    },
    thermal: {
      thermal_unit_model: "string",
      fuel_type: "stringEnum",
      thermal_efficiency: "float",
      heat_rate: "float",
      main_steam_pressure: "float",
      main_steam_temperature: "float"
    },
    diesel: {
      diesel_unit_model: "string",
      fuel_grade: "string",
      specific_fuel_consumption: "float",
      fuel_tank_capacity: "float",
      rated_speed: "float",
      start_time: "float"
    },
    hydro: {
      hydro_unit_model: "string",
      turbine_type: "stringEnum",
      design_head: "float",
      design_flow: "float",
      rated_speed: "float",
      generator_efficiency: "float"
    },
    nuclear: {
      nuclear_unit_model: "string",
      reactor_type: "stringEnum",
      reactor_thermal_power: "float",
      thermal_efficiency: "float",
      primary_loop_pressure: "float",
      main_steam_pressure: "float",
      main_steam_temperature: "float",
      capacity_factor: "float"
    },
    storage: {
      storage_technology: "stringEnum",
      battery_rack_count: "integer",
      energy_capacity: "float",
      charge_discharge_efficiency: "float",
      max_charge_power: "float",
      max_discharge_power: "float",
      state_of_charge: "float",
      soc_upper_limit: "float",
      soc_lower_limit: "float"
    }
  } as const;

  for (const expected of electricGenerationCases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
    const definitions = new Map(getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition]));
    for (const [fieldName, valueType] of Object.entries(familyDefinitions[expected.family])) {
      expect(definitions.get(fieldName)?.valueType).toBe(valueType);
      expect(node.params[fieldName]?.trim(), `${expected.kind}.${fieldName}`).not.toBe("");
    }
  }

  const wind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
  expect(wind.params).toMatchObject({
    cut_in_wind_speed: "3",
    rated_wind_speed: "12",
    cut_out_wind_speed: "25",
    rotor_diameter: "170",
    hub_height: "110"
  });
  const thermal = createDefaultNode("ac-thermal-source", { x: 100, y: 100 });
  expect(thermal.params).toMatchObject({
    thermal_efficiency: "0.45",
    heat_rate: "8000",
    main_steam_pressure: "25",
    main_steam_temperature: "600"
  });
  for (const [kind, expectedArea] of [
    ["ac-pv-source", "100000"],
    ["dc-pv-source", "25000"]
  ] as const) {
    const pv = createDefaultNode(kind, { x: 100, y: 100 });
    expect(pv.params).toMatchObject({
      module_efficiency: "0.213",
      array_area: expectedArea,
      reference_irradiance: "1000",
      reference_temperature: "25",
      temperature_coefficient: "-0.004"
    });
  }
  const diesel = createDefaultNode("ac-diesel-source", { x: 100, y: 100 });
  expect(diesel.params).toMatchObject({
    specific_fuel_consumption: "200",
    fuel_tank_capacity: "20",
    rated_speed: "1500",
    start_time: "10"
  });
  const hydro = createDefaultNode("ac-hydro-source", { x: 100, y: 100 });
  expect(hydro.params).toMatchObject({
    design_head: "120",
    design_flow: "280",
    rated_speed: "150",
    generator_efficiency: "0.985"
  });
  const nuclear = createDefaultNode("ac-nuclear-source", { x: 100, y: 100 });
  expect(nuclear.params).toMatchObject({
    reactor_thermal_power: "2900",
    thermal_efficiency: "0.345",
    primary_loop_pressure: "15.5",
    main_steam_pressure: "6.8",
    main_steam_temperature: "285",
    capacity_factor: "90"
  });
  const storage = createDefaultNode("ac-storage", { x: 100, y: 100 });
  expect(storage.params).toMatchObject({
    energy_capacity: "20",
    charge_discharge_efficiency: "0.9",
    max_charge_power: "5",
    max_discharge_power: "5",
    state_of_charge: "0.5",
    soc_upper_limit: "0.9",
    soc_lower_limit: "0.1"
  });

  const legacyThermalTemplate = {
    ...DEVICE_LIBRARY.find((item) => item.kind === "ac-thermal-source")!,
    parameterDefinitions: DEVICE_LIBRARY.find((item) => item.kind === "ac-thermal-source")!.parameterDefinitions?.map((definition) => (
      definition.enName === "thermal_efficiency"
        ? { ...definition, valueType: "string" as const }
        : definition
    ))
  };
  expect(
    getTemplateParameterDefinitions(legacyThermalTemplate)
      .find((definition) => definition.enName === "thermal_efficiency")?.valueType
  ).toBe("float");

  const enumOptions = (kind: DeviceKind, fieldName: string) => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    return getTemplateParameterDefinitions(template).find((definition) => definition.enName === fieldName)?.enumOptions;
  };
  expect(enumOptions("ac-thermal-source", "fuel_type")).toEqual([
    { value: "coal", label: "煤" },
    { value: "gas", label: "天然气" },
    { value: "oil", label: "燃油" },
    { value: "biomass", label: "生物质" }
  ]);
  expect(enumOptions("ac-hydro-source", "turbine_type")).toEqual([
    { value: "francis", label: "混流式" },
    { value: "kaplan", label: "轴流式" },
    { value: "pelton", label: "冲击式" },
    { value: "bulb", label: "贯流式" }
  ]);
  expect(enumOptions("ac-nuclear-source", "reactor_type")).toEqual([
    { value: "pwr", label: "压水堆" },
    { value: "bwr", label: "沸水堆" },
    { value: "phwr", label: "重水堆" },
    { value: "htgr", label: "高温气冷堆" },
    { value: "fbr", label: "快中子增殖堆" }
  ]);
});

test("does not recognize electric generation derived kinds as container kinds", () => {
  for (const expected of electricGenerationCases) {
    expect(isElectricGenerationContainerKind(expected.kind)).toBe(false);
    expect(isElectricGenerationContainerKind(`${expected.kind}-vertical`)).toBe(false);
  }
  for (const kind of ["ac-source", "dc-source"]) {
    expect(isElectricGenerationContainerKind(kind)).toBe(false);
    expect(isElectricGenerationContainerKind(`${kind}-vertical`)).toBe(false);
  }
});

test("migrates legacy electric generation nodes without replacing existing values or geometry", () => {
  for (const expected of electricGenerationCases.filter(({ kind }) => legacyElectricGenerationKinds.has(kind))) {
    const donor = createDefaultNode(expected.terminalType === "ac" ? "ac-source" : "dc-source", { x: 12, y: 34 });
    const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    for (const kind of [expected.kind, `${expected.kind}-vertical`]) {
      const legacy: ModelNode = {
        ...donor,
        id: `legacy-${kind}`,
        kind,
        name: `保留-${expected.label}`,
        nodeNumber: `legacy-${expected.terminalType}-node`,
        position: { x: 321, y: 654 },
        size: { width: 137, height: 89 },
        rotation: 17,
        scale: 1.25,
        scaleX: -1,
        scaleY: 1,
        params: {
          rated_voltage: "保留电压",
          rated_power: "保留容量",
          rated_capacity: "保留通用额定容量",
          control_type: "保留通用控制类型",
          vbase: "保留通用电压基准",
          status: "0",
          is_container: "0",
          legacyCustomValue: "保留自定义值"
        },
        terminals: [{
          ...donor.terminals[0],
          label: "旧发电端",
          type: expected.terminalType,
          anchor: { x: 0.25, y: -0.25 },
          nodeNumber: "986",
          vbase: "保留端子电压"
        }]
      };
      const template = kind === expected.kind ? baseTemplate : { ...baseTemplate, kind };

      const normalized = normalizeNodeTerminalsWithTemplate(legacy, template);

      expect(normalized).toMatchObject({
        id: legacy.id,
        kind,
        name: legacy.name,
        nodeNumber: legacy.nodeNumber,
        position: legacy.position,
        size: legacy.size,
        rotation: legacy.rotation,
        scale: legacy.scale,
        scaleX: legacy.scaleX,
        scaleY: legacy.scaleY
      });
      expect(normalized.params).toMatchObject({
        rated_voltage: "保留电压",
        rated_capacity: "保留通用额定容量",
        control_type: "保留通用控制类型",
        vbase: "保留通用电压基准",
        status: "0",
        is_container: "0",
        legacyCustomValue: "保留自定义值"
      });
      expect(normalized.params).not.toHaveProperty("rated_power");
      expect(normalized.params).not.toHaveProperty(expected.relationKey);
      expect(normalized.terminals).toMatchObject([{
        id: "t1",
        label: expected.terminalLabel,
        type: expected.terminalType,
        anchor: { x: 0.25, y: -0.25 },
        nodeNumber: "986",
        vbase: "保留端子电压"
      }]);

      const normalizedAgain = normalizeNodeTerminalsWithTemplate(normalized, template);
      expect(normalizedAgain).toBe(normalized);

      const indexed = assignMissingDeviceIndexes([normalized]);
      expect(indexed.nodes[0].params[expected.relationKey]).toBeUndefined();
    }
  }
});

test("adds shared rated defaults to newer electric generation kinds without legacy container metadata", () => {
  for (const expected of electricGenerationCases.filter(({ kind }) => !legacyElectricGenerationKinds.has(kind))) {
    const donor = createDefaultNode(expected.terminalType === "ac" ? "ac-source" : "dc-source", { x: 12, y: 34 });
    const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    for (const kind of [expected.kind, `${expected.kind}-vertical`]) {
      const params = { is_container: "0", legacyCustomValue: "保持原值" };
      const node: ModelNode = {
        ...donor,
        id: `new-kind-${kind}`,
        kind,
        params,
        terminals: [{ ...donor.terminals[0], type: expected.terminalType }]
      };
      const template = kind === expected.kind ? baseTemplate : { ...baseTemplate, kind };

      const normalized = normalizeNodeTerminalsWithTemplate(node, template);

      expect(normalized.params).toMatchObject({
        is_container: "0",
        legacyCustomValue: "保持原值",
        rated_capacity: expected.rated_power,
        rated_voltage: expected.rated_voltage
      });
      expect(normalized.params).not.toHaveProperty("rated_power");
      expect(normalized.params[expected.relationKey]).toBeUndefined();
      expect(normalized.params.source_type).toBeUndefined();
    }
  }
});

test("includes DC electrochemical storage as a single-port DC device", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "dc-storage");
  expect(template).toMatchObject({
    label: "直流电化学储能",
    categoryLibrary: "直流设备",
    terminalType: "dc",
    terminalCount: 1
  });

  const node = createDefaultNode("dc-storage", { x: 100, y: 100 });
  expect(node.name).toBe("直流电化学储能");
  expect(node.terminals).toHaveLength(1);
  expect(node.terminals[0].type).toBe("dc");
  expect(node.params).toMatchObject({
    source_type: "储能",
    energy_capacity: "20",
    state_of_charge: "0.5"
  });
  expect(node.params.vbase).toBe("0");
  expect(getDeviceGlyphVariant("dc-storage")).toBe("battery-storage");
});

test("includes AC electrochemical storage as a single-port AC device", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-storage");
  expect(template).toMatchObject({
    label: "交流电化学储能",
    categoryLibrary: "交流设备",
    terminalType: "ac",
    terminalCount: 1
  });

  const node = createDefaultNode("ac-storage", { x: 100, y: 100 });
  expect(node.name).toBe("交流电化学储能");
  expect(node.terminals).toHaveLength(1);
  expect(node.terminals[0].type).toBe("ac");
  expect(node.params).toMatchObject({
    source_type: "储能",
    energy_capacity: "20",
    state_of_charge: "0.5"
  });
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
    expect(template).toMatchObject({ label, categoryLibrary: "氢能设备", terminalCount: terminalTypes.length });
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

test("defines electric-hydrogen coupling controls and directional coefficients", () => {
  const expected = [
    ["ac-electrolyzer", "FLOW", "e2h_coeff", "0.2", "h2e_coeff"],
    ["dc-electrolyzer", "FLOW", "e2h_coeff", "0.2", "h2e_coeff"],
    ["ac-fuel-cell", "P", "h2e_coeff", "1.5", "e2h_coeff"],
    ["dc-fuel-cell", "P", "h2e_coeff", "1.5", "e2h_coeff"]
  ] as const;

  for (const [kind, controlType, coefficientKey, coefficientValue, excludedCoefficientKey] of expected) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const definitionByName = new Map(
      getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition])
    );

    expect(node.params.control_type, kind).toBe(controlType);
    expect(node.params[coefficientKey], kind).toBe(coefficientValue);
    expect(node.params[excludedCoefficientKey], kind).toBeUndefined();
    expect(node.params.p_set, kind).toBeUndefined();
    expect(node.params.flow_set, kind).toBeUndefined();
    expect(definitionByName.get("control_type"), kind).toMatchObject({ valueType: "stringEnum", typicalValue: controlType });
    expect(definitionByName.get(coefficientKey), kind).toMatchObject({ valueType: "float", typicalValue: coefficientValue });
  }
});

test("defines electric-heat coupling controls and conversion coefficients", () => {
  for (const kind of ["ac-heater", "dc-heater", "ac-two-port-heater", "dc-two-port-heater"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const definitionByName = new Map(
      getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition])
    );

    expect(node.params.control_type, kind).toBe("P");
    expect(node.params.e2h_coeff, kind).toBe("1.0");
    expect(definitionByName.get("control_type"), kind).toMatchObject({
      cnName: "控制类型",
      valueType: "stringEnum",
      typicalValue: "P",
      enumOptions: [
        { value: "P", label: "定电功率" },
        { value: "T", label: "定出口温度" }
      ]
    });
    expect(definitionByName.get("e2h_coeff"), kind).toMatchObject({
      cnName: "电转热效率(kWh/kWh)",
      valueType: "float",
      typicalValue: "1.0"
    });
  }
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
    expect(template).toMatchObject({ label, categoryLibrary: "热能设备", terminalCount: terminalTypes.length });
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
    categoryLibrary: "自定义类别库",
    size: { width: 104, height: 64 },
    params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", line_width: "0" },
    terminalType: "ac",
    terminalCount: 4,
    terminalTypes: ["ac", "dc", "h2", "heat"],
    terminalLabels: ["交流设备端", "直流设备端", "氢能设备端", "热能设备端"],
    custom: true,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "工作状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
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
  expect(node.params.stroke_color).toBe("transparent");
  expect(canConnectTerminals(node, "t3", createDefaultNode("hydrogen-pipeline", { x: 240, y: 120 }), "t1")).toBe(true);
  expect(canConnectTerminals(node, "t4", createDefaultNode("hydrogen-pipeline", { x: 300, y: 120 }), "t1")).toBe(false);

  const firstIndexed = assignPermanentDeviceIndex(node, {});
  const secondIndexed = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 180, y: 120 }), firstIndexed.counters);
  expect(firstIndexed.node.params.idx).toBe("1");
  expect(secondIndexed.node.params.idx).toBe("2");
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
    "status",
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
    categoryLibrary: "自定义类别库",
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
    categoryLibrary: "自定义类别库",
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

test("builds one body view plus associated device views for container parameters", () => {
  const node = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
  node.name = "EL1";
  node.terminals[0].nodeNumber = "5";
  node.terminals[1].nodeNumber = "2";
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-electrolyzer")!;

  const views = buildContainerDeviceParameterViews(node, template);

  expect(views.map((view) => view.label)).toEqual(["设备本体", "交流设备端交流电负荷", "氢能设备端氢源"]);
  expect(views[0]).toMatchObject({ id: "container", kind: "container" });
  expect(views[1]).toMatchObject({
    kind: "associated",
    componentLibrary: "ACLoad",
    relationKeys: ["idx_ac_load_t1"],
    terminalIndexes: [0]
  });
  expect(views[1].rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "idx", value: "1" }),
    expect.objectContaining({ key: "node", value: "5" }),
    expect.objectContaining({ key: "pbase", value: "0" }),
    expect.objectContaining({ key: "p_set", value: "0" }),
    expect.objectContaining({ key: "pv0", value: "1.0" }),
    expect.objectContaining({ key: "qbase", value: "0" }),
    expect.objectContaining({ key: "qv0", value: "1.0" })
  ]));
  expect(views[2]).toMatchObject({
    kind: "associated",
    componentLibrary: "HydroSource",
    relationKeys: ["idx_h2_unit_t2"],
    terminalIndexes: [1]
  });
  expect(views[2].rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "rated_capacity", value: "1000", readonly: false }),
    expect.objectContaining({ key: "control_type", value: "FLOW", readonly: false }),
    expect.objectContaining({ key: "pressure_max", value: "25", readonly: false }),
    expect.objectContaining({ key: "pressure_min", value: "1", readonly: false }),
    expect.objectContaining({ key: "flow_set", value: "1000", readonly: false }),
    expect.objectContaining({ key: "flow_max", value: "1000", readonly: false }),
    expect.objectContaining({ key: "flow_min", value: "0", readonly: false })
  ]));
});

test("defines hydrogen source and load capacities, control modes, limits, and measurements", () => {
  const expectedOrder = [
    "idx", "name", "dev_type", "node", "rated_capacity", "control_type",
    "pressure_set", "pressure_max", "pressure_min",
    "flow_set", "flow_max", "flow_min", "pressure", "flow", "run_stat"
  ];
  for (const kind of ["hydrogen-source", "hydrogen-load"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const definitions = getTemplateParameterDefinitions(template);
    const byName = new Map(definitions.map((definition) => [definition.enName, definition]));

    expect(definitions.map((definition) => definition.enName)).toEqual(expectedOrder);
    expect(byName.get("control_type")).toMatchObject({
      valueType: "stringEnum",
      typicalValue: "FLOW",
      enumValues: ["FLOW", "PRESSURE"]
    });
    for (const field of ["rated_capacity", "pressure_set", "pressure_max", "pressure_min", "flow_set", "flow_max", "flow_min", "pressure", "flow"]) {
      expect(byName.get(field), `${kind}.${field}`).toMatchObject({ valueType: "float", readonly: false });
    }
  }
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
    componentLibrary: "ACLoad",
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
    componentLibrary: "DCGenerator",
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

test("filters container body parameters to the current container variant", () => {
  const expected = [
    ["ac-electrolyzer", ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_h2_unit_t2"], ["h2e_coeff", "idx_dc_load_t1", "is_container", "p_set", "flow_set"]],
    ["dc-electrolyzer", ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_h2_unit_t2"], ["h2e_coeff", "idx_ac_load_t1", "is_container", "p_set", "flow_set"]],
    ["ac-fuel-cell", ["idx", "name", "control_type", "h2e_coeff", "run_stat", "idx_ac_unit_t1", "idx_h2_load_t2"], ["e2h_coeff", "idx_dc_unit_t1", "is_container", "p_set", "flow_set"]],
    ["dc-fuel-cell", ["idx", "name", "control_type", "h2e_coeff", "run_stat", "idx_dc_unit_t1", "idx_h2_load_t2"], ["e2h_coeff", "idx_ac_unit_t1", "is_container", "p_set", "flow_set"]],
    ["ac-heater", ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"], ["idx_dc_load_t1", "is_container"]],
    ["dc-heater", ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"], ["idx_ac_load_t1", "is_container"]]
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

test("defines static limits and measurement parameters for every hydrogen tank variant", () => {
  for (const kind of ["hydrogen-tank", "hydrogen-tank-horizontal", "hydrogen-tank-container"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const node = createDefaultNode(kind, { x: 0, y: 0 });
    const definitionByName = new Map(
      getTemplateParameterDefinitions(template).map((definition) => [definition.enName, definition])
    );

    expect(node.params).toMatchObject({
      control_type: "PRESSURE",
      pressure_set: "1",
      flow_set: "0",
      alpha: "1",
      flow_min: "-10",
      flow_max: "10",
      water_volume: "50",
      pressure_max: "45",
      pressure_min: "0.1",
      initial_soc: "0.5",
      pressure: "1",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5"
    });
    expect(definitionByName.get("water_volume")).toMatchObject({ valueType: "float", readonly: false });
    expect(definitionByName.get("pressure_max")).toMatchObject({ valueType: "float", typicalValue: "45" });
    expect(definitionByName.get("pressure_min")).toMatchObject({ valueType: "float", typicalValue: "0.1" });
    expect(definitionByName.get("pressure")).toMatchObject({ cnName: "储气压(MPa)", valueType: "float", typicalValue: "1" });
    expect(definitionByName.get("flow")).toMatchObject({ cnName: "流量(Nm3/h)", valueType: "float", typicalValue: "0" });
    expect(definitionByName.get("gas_quantity")).toMatchObject({ cnName: "储气量(Nm3)", valueType: "float", typicalValue: "500" });
    expect(definitionByName.get("soc")).toMatchObject({ cnName: "soc", valueType: "float", typicalValue: "0.5" });
  }
});

test("keeps associated endpoint definitions out of hydrogen coupling device bodies", () => {
  const expectedEndpointFields = [
    "rated_capacity",
    "control_type",
    "p_set",
    "p_max",
    "p_min",
    "q_set",
    "q_max",
    "q_min",
    "pressure_set",
    "pressure_max",
    "pressure_min",
    "flow_set",
    "flow_max",
    "flow_min"
  ];

  for (const kind of ["ac-electrolyzer", "dc-electrolyzer", "ac-fuel-cell", "dc-fuel-cell"] as const) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const relationSuffixes = describeContainerTerminalAssociations(template)
      .map((association) => association.relationKey.replace(/^idx_/, ""))
      .filter(Boolean);
    const bodyDefinitions = getTemplateParameterDefinitions(template);
    const bodyKeys = bodyDefinitions.map((definition) => definition.enName);
    const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;

    for (const bodyField of ["rated_voltage", "rated_power", "rated_capacity", "hydrogen_flow", "vbase", "p", "q", "u", "voltage", "flow"]) {
      expect(bodyKeys, `${kind}:${bodyField}`).not.toContain(bodyField);
      expect(node.params, `${kind}:${bodyField}`).not.toHaveProperty(bodyField);
    }

    const associatedFieldNames = relationSuffixes.flatMap((suffix) =>
      expectedEndpointFields.map((field) => `${field}_${suffix}`)
    );
    for (const fieldName of associatedFieldNames) {
      expect(bodyKeys, `${kind}:${fieldName}`).not.toContain(fieldName);
    }
    expect(new Set(bodyKeys).size, kind).toBe(bodyKeys.length);

    const associatedViews = buildContainerDeviceParameterViews(node, template).filter((view) => view.kind === "associated");
    expect(associatedViews, kind).toHaveLength(2);
    for (const view of associatedViews) {
      const keys = view.rows.map((row) => row.key);
      expect(new Set(keys).size, `${kind}:${view.componentLibrary}`).toBe(keys.length);
      expect(keys, `${kind}:${view.componentLibrary}`).toEqual(E_SECTION_COLUMNS[view.componentLibrary!]);
    }
  }
});

test("resolves coupling terminals to stable associated device identities", () => {
  const expected = [
    ["ac-electrolyzer", "ACLoad", "HydroSource"],
    ["dc-electrolyzer", "DCLoad", "HydroSource"],
    ["ac-fuel-cell", "ACGenerator", "HydroLoad"],
    ["dc-fuel-cell", "DCGenerator", "HydroLoad"]
  ] as const;

  for (const [kind, electricModel, hydrogenModel] of expected) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
    const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
    const electric = containerAssociatedDeviceIdentityForTerminal(node, template, "t1");
    const hydrogen = containerAssociatedDeviceIdentityForTerminal(node, template, "t2");

    expect(electric, `${kind}:t1`).toMatchObject({
      terminalId: "t1",
      deviceModel: electricModel,
      deviceId: `${electricModel}-${electric?.index}`
    });
    expect(hydrogen, `${kind}:t2`).toMatchObject({
      terminalId: "t2",
      deviceModel: hydrogenModel,
      deviceId: `${hydrogenModel}-${hydrogen?.index}`
    });
  }
});

test("merges legacy associated endpoint overrides without restoring duplicate body definitions", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-electrolyzer")!;
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: template.kind,
    params: {
      rated_capacity_ac_load_t1: "8",
      p_max_ac_load_t1: "8"
    },
    parameterDefinitions: [
      { cnName: "控制类型", enName: "control_type", valueType: "stringEnum", typicalValue: "P", readonly: false },
      { cnName: "关联负荷额定容量", enName: "rated_capacity_ac_load_t1", valueType: "float", typicalValue: "8", readonly: false },
      { cnName: "关联负荷有功上限", enName: "p_max_ac_load_t1", valueType: "float", typicalValue: "8", readonly: false }
    ]
  });
  const bodyKeys = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);
  const node = assignPermanentDeviceIndex(createNodeFromTemplate(overridden, { x: 100, y: 100 }), {}).node;
  const acLoadView = buildContainerDeviceParameterViews(node, overridden)
    .find((view) => view.componentLibrary === "ACLoad");

  expect(bodyKeys).toContain("control_type");
  expect(bodyKeys).not.toContain("rated_capacity_ac_load_t1");
  expect(bodyKeys).not.toContain("p_max_ac_load_t1");
  expect(acLoadView?.rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "rated_capacity", value: "8" }),
    expect.objectContaining({ key: "p_max", value: "8" })
  ]));
});

test("keeps persisted three-winding transformer overrides structurally non-container", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: template.kind,
    params: { component_type: "ACTransfomer3" },
    terminalCount: 3,
    terminalTypes: ["ac", "ac", "ac"],
    terminalAssociations: ["ac-generator", "ac-generator", "ac-generator"],
    isContainer: true,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "高压绕组双绕组主变idx", enName: "idx_xf_t1", valueType: "integer", typicalValue: "", readonly: true }
    ],
    updatedAt: "2026-07-12T00:00:00.000Z"
  });
  const node = createNodeFromTemplate(overridden, { x: 100, y: 100 });
  const fieldNames = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);

  expect(overridden.isContainer).toBe(false);
  expect(overridden.terminalAssociations).toBeUndefined();
  expect(fieldNames).toContain("r1");
  expect(fieldNames).not.toContain("high_resistance_pu");
  expect(fieldNames).not.toContain("idx_xf_t1");
  expect(node.params.is_container).toBeUndefined();
  expect(node.params.idx_xf_t1).toBeUndefined();
});

test("maps electrolysis electric terminals to loads and fuel-cell electric terminals to generators", () => {
  const expected = [
    ["ac-electrolyzer", "idx_ac_load_t1", "ACLoad", "ACLoad", "idx_h2_unit_t2", "HydroSource"],
    ["dc-electrolyzer", "idx_dc_load_t1", "DCLoad", "DCLoad", "idx_h2_unit_t2", "HydroSource"],
    ["ac-fuel-cell", "idx_ac_unit_t1", "ACGenerator", "ACGenerator", "idx_h2_load_t2", "HydroLoad"],
    ["dc-fuel-cell", "idx_dc_unit_t1", "DCGenerator", "DCGenerator", "idx_h2_load_t2", "HydroLoad"]
  ] as const;

  for (const [kind, electricRelationKey, electricComponentLibrary, electricSection, hydrogenRelationKey, hydrogenSection] of expected) {
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
      deviceModel: electricComponentLibrary
    });
    expect(associations[1]).toMatchObject({
      terminalIndex: 1,
      relationKey: hydrogenRelationKey,
      deviceModel: hydrogenSection
    });
    expect(views[1]).toMatchObject({
      kind: "associated",
      componentLibrary: electricComponentLibrary,
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

  expect(views.map((view) => view.label)).toEqual(["设备本体", "交流设备端交流电负荷", "热能设备供水端双端热源"]);
  expect(views[2]).toMatchObject({
    kind: "associated",
    componentLibrary: "HeatSource2",
    relationKeys: ["idx_heat2_unit_t2"],
    terminalIndexes: [1, 2]
  });
  expect(views[2].rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: "idx", value: "1" }),
    expect.objectContaining({ key: "i_node", value: "2" }),
    expect.objectContaining({ key: "j_node", value: "3" })
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
    "status",
    "run_stat",
    "idx_heat2_unit_t1",
    "idx_heat2_unit_t3"
  ]);

  const template: DeviceTemplate = {
    kind: "CustomDoubleContainer",
    label: "CustomDoubleContainer",
    categoryLibrary: "自定义类别库",
    size: { width: 104, height: 64 },
    params: { backgroundImage: "data:image/svg+xml,custom", fillColor: "transparent", strokeColor: "transparent", line_width: "0" },
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
  // parameterDefinitions 合并 eKeys，验证 owner 在 definitions
  const definitions = JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY]);
  expect(definitions.find((d: any) => d.enName === "owner")).toBeDefined();
});

test("builds a three-level element tree grouped by component library, device, and graphic instance", () => {
  const source = createDefaultNode("ac-source", { x: 100, y: 100 });
  const wind = createDefaultNode("ac-wind-source", { x: 180, y: 100 });
  const load = createDefaultNode("ac-load", { x: 260, y: 100 });
  const text = createDefaultNode("static-text", { x: 180, y: 180 });
  source.name = "电源A";
  wind.name = "风电A";
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

  const tree = buildElementTree([source, wind, load, text], [edge]);

  expect(tree.map((group) => group.typeLabel)).toEqual(["交流电源", "交流负荷", "静态文本", "联络线"]);
  expect(tree.map((group) => group.typeEnglishLabel)).toEqual(["ACGenerator", "ACLoad", "StaticTextSymbol", "ConnectionLine"]);
  const generatorGroup = tree.find((group) => group.typeEnglishLabel === "ACGenerator");
  expect(generatorGroup?.items.map((item) => item.name)).toEqual(["电源A", "风电A"]);
  expect(generatorGroup?.deviceGroups?.map((deviceGroup) => ({
    label: deviceGroup.deviceLabel,
    english: deviceGroup.deviceEnglishLabel,
    items: deviceGroup.items.map((item) => item.name)
  }))).toEqual([
    { label: "交流电源", english: "ac-source", items: ["电源A"] },
    { label: "交流风力发电机", english: "ac-wind-source", items: ["风电A"] }
  ]);
  expect(generatorGroup?.deviceGroups?.[0]?.items).toEqual([
    { kind: "node", id: source.id, name: "电源A", idx: "", editableDevice: true }
  ]);
  expect(generatorGroup?.deviceGroups?.[1]?.items).toEqual([
    { kind: "node", id: wind.id, name: "风电A", idx: "", editableDevice: true }
  ]);
  expect(tree.find((group) => group.typeEnglishLabel === "StaticTextSymbol")?.deviceGroups?.[0]?.items).toEqual([
    { kind: "node", id: text.id, name: "说明文字", idx: "", editableDevice: false }
  ]);
  expect(tree.find((group) => group.typeLabel === "联络线")?.deviceGroups?.[0]?.items[0]).toMatchObject({
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

test("colors only AC and DC electric graphics by voltage level in voltage color mode", () => {
  const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
  const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
  const acBus = createDefaultNode("ac-bus", { x: 380, y: 100 });
  const dcSource = createDefaultNode("dc-source", { x: 100, y: 180 });
  const dcLoad = createDefaultNode("dc-load", { x: 240, y: 180 });
  const dcBus = createDefaultNode("dc-bus", { x: 380, y: 180 });
  const hydrogenSource = createDefaultNode("hydrogen-source", { x: 100, y: 260 });
  const hydrogenLoad = createDefaultNode("hydrogen-load", { x: 240, y: 260 });
  const heatSource = createDefaultNode("heat-source", { x: 100, y: 340 });
  const heatLoad = createDefaultNode("single-port-heat-load", { x: 240, y: 340 });
  acSource.terminals[0].vbase = "10";
  acLoad.terminals[0].vbase = "10";
  acBus.params.voltage_level = "10 kV";
  dcSource.terminals[0].vbase = "750";
  dcLoad.terminals[0].vbase = "750";
  dcBus.params.voltage_level = "750 V";
  hydrogenSource.terminals[0].vbase = "30";
  heatSource.terminals[0].vbase = "95";
  const nodeById = new Map([acSource, acLoad, dcSource, dcLoad, hydrogenSource, hydrogenLoad, heatSource, heatLoad].map((node) => [node.id, node]));

  expect(voltageLevelColor("10")).toBe("#f97316");
  expect(voltageLevelColor("750")).toBe("#0891b2");
  expect(getDeviceStrokeColor(acSource, "voltage")).toBe("#f97316");
  expect(getDeviceStrokeColor(acBus, "voltage")).toBe("#f97316");
  expect(getTerminalDisplayColor(acSource, acSource.terminals[0], "voltage")).toBe("#f97316");
  expect(getConnectionStrokeColor({ id: "ac", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#f97316");
  expect(getDeviceStrokeColor(dcSource, "voltage")).toBe("#0891b2");
  expect(getDeviceStrokeColor(dcBus, "voltage")).toBe("#0891b2");
  expect(getTerminalDisplayColor(dcSource, dcSource.terminals[0], "voltage")).toBe("#0891b2");
  expect(getConnectionStrokeColor({ id: "dc", sourceId: dcSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#0891b2");
  expect(getDeviceStrokeColor(hydrogenSource, "voltage")).toBe("#7c3aed");
  expect(getTerminalDisplayColor(hydrogenSource, hydrogenSource.terminals[0], "voltage")).toBe("#7c3aed");
  expect(getConnectionStrokeColor({ id: "h2", sourceId: hydrogenSource.id, targetId: hydrogenLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#7c3aed");
  expect(getDeviceStrokeColor(heatSource, "voltage")).toBe("#dc2626");
  expect(getTerminalDisplayColor(heatSource, heatSource.terminals[0], "voltage")).toBe("#dc2626");
  expect(getConnectionStrokeColor({ id: "heat", sourceId: heatSource.id, targetId: heatLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }, nodeById, "voltage")).toBe("#dc2626");
});

test("shows associated container devices as child rows in the element tree", () => {
  const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
  electrolyzer.name = "EL1";
  electrolyzer.params.name_ac_load_t1 = "自定义交流负荷";

  const tree = buildElementTree([electrolyzer], [], DEVICE_LIBRARY);
  const typeGroup = tree.find((group) => group.typeEnglishLabel === "AcE2Hydro");
  const deviceGroup = typeGroup?.deviceGroups?.find((group) => group.deviceEnglishLabel === "ac-electrolyzer");
  const item = deviceGroup?.items[0];

  expect(typeGroup?.items[0]).toBe(item);
  expect(deviceGroup?.deviceLabel).toBe("交流电制氢");
  expect(item).toMatchObject({
    kind: "node",
    id: electrolyzer.id,
    name: "EL1",
    idx: electrolyzer.params.idx,
    editableDevice: true
  });
  expect(item?.children).toEqual([
    expect.objectContaining({
      componentLibrary: "ACLoad",
      idx: electrolyzer.params.idx_ac_load_t1,
      name: "自定义交流负荷",
      nameKey: "name_ac_load_t1",
      relationKeys: ["idx_ac_load_t1"],
      terminalLabels: "交流设备端"
    }),
    expect.objectContaining({
      componentLibrary: "HydroSource",
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
    getDeviceGlyphVariant("dcac-converter"),
    getDeviceGlyphVariant("acac-converter")
  ]);
  expect(converterVariants).toEqual(new Set(["dcdc-converter", "acdc-converter", "dcac-converter", "acac-converter"]));
});

test("creates static drawing primitives without electrical terminals", () => {
  const expectedComponentLibraries = {
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
  const expected = Object.keys(expectedComponentLibraries);
  const removedControlKinds = [
    "static-web",
    "static-date",
    "static-time",
    "static-datetime",
    "static-input"
  ];

  expect(new Set(Object.values(expectedComponentLibraries))).toEqual(new Set([
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
    const componentLibrary = expectedComponentLibraries[kind as keyof typeof expectedComponentLibraries];
    expect(isStaticNode(node)).toBe(true);
    expect(node.terminals).toEqual([]);
    expect(node.params.component_type).toBe(componentLibrary);
    expect(inferESection(kind, node.params)).toBe(componentLibrary);
    expect(inferESection(kind, {})).toBe(componentLibrary);
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
  expect(DEVICE_LIBRARY.filter((template) => template.categoryLibrary === "静态图元").map((template) => template.kind)).toEqual([...expected]);

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

  for (const [kind, label, componentLibrary] of expected) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
    expect(template).toMatchObject({
      label,
      categoryLibrary: "静态图元",
      terminalCount: 0,
      terminalType: "ac",
      params: expect.objectContaining({
        component_type: componentLibrary,
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
    expect(inferESection(kind, node.params)).toBe(componentLibrary);
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

test("enables button behavior for drawn static templates assigned to the StaticButton library", () => {
  const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === "static-hexagon");
  expect(baseTemplate).toBeDefined();
  const template: DeviceTemplate = {
    ...baseTemplate!,
    label: "自定义按钮",
    params: {
      ...baseTemplate!.params,
      component_type: "StaticButton"
    },
    custom: true
  };

  const node = createStaticBoxNodeFromDrawing(
    template,
    [
      { x: 80, y: 60 },
      { x: 180, y: 120 }
    ],
    "layer-user"
  );

  expect(node.kind).toBe("static-hexagon");
  expect(node.params.component_type).toBe("StaticButton");
  expect(node.params.buttonEnabled).toBe("1");
  expect(node.params.buttonActionType).toBe("none");
});

test("infers static button identity from custom static kinds without stored component type", () => {
  const template: DeviceTemplate = {
    kind: "custom-StaticButton-2",
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
      { x: 100, y: 90 },
      { x: 260, y: 150 }
    ],
    "layer-user"
  );

  expect(isStaticNode(node)).toBe(true);
  expect(isStaticGraphicNode(node)).toBe(true);
  expect(isStaticButtonCapableNode(node)).toBe(true);
  expect(isStaticBoxLikeNode(node)).toBe(true);
  expect(staticRenderKindForNode(node)).toBe("static-button");
  expect(inferESection(node.kind, node.params)).toBe("StaticButton");
  expect(node.params.component_type).toBe("StaticButton");
  expect(node.params.buttonEnabled).toBe("1");
  expect(node.params.buttonActionType).toBe("none");
  expect(node.params[CUSTOM_DEVICE_TEMPLATE_KEY]).toBeUndefined();
  expect(node.params.run_stat).toBeUndefined();
  expect(node.params._labelVisible).toBeUndefined();
  expect(node.position).toEqual({ x: 180, y: 120 });
  expect(node.size).toEqual({ width: 160, height: 60 });
});

test("adds status as the default graphic running-state property", () => {
  expect(buildDefaultDeviceParameterDefinitions(["ac"]).find((definition) => definition.enName === "status")).toMatchObject({
    cnName: "运行状态",
    valueType: "numberEnum",
    typicalValue: "1",
    readonly: false
  });
  for (const template of DEVICE_LIBRARY.filter((item) => !item.kind.startsWith("static-"))) {
    const node = createDefaultNode(template.kind, { x: 100, y: 100 });
    expect(node.params.status, template.kind).toBeTruthy();
  }
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

test("adds DCAC converter variants with DC first and AC second terminals", () => {
  const horizontal = createDefaultNode("dcac-converter", { x: 100, y: 100 });
  const vertical = createDefaultNode("dcac-converter-vertical", { x: 300, y: 300 });
  const acLoad = createDefaultNode("ac-load", { x: 500, y: 100 });
  const dcLoad = createDefaultNode("dc-load", { x: 500, y: 240 });

  expect(DEVICE_LIBRARY.find((item) => item.kind === "dcac-converter")).toMatchObject({
    label: "DCAC变流器",
    categoryLibrary: "直流设备",
    terminalTypes: ["dc", "ac"]
  });
  expect(DEVICE_LIBRARY.find((item) => item.kind === "dcac-converter-vertical")).toMatchObject({
    label: "DCAC变流器（竖向）",
    terminalTypes: ["dc", "ac"],
    rotation: 90
  });
  expect(inferESection("dcac-converter", horizontal.params)).toBe("DCACConverter");
  expect(inferESection("dcac-converter-vertical", vertical.params)).toBe("DCACConverter");
  expect(horizontal.terminals.map((terminal) => terminal.type)).toEqual(["dc", "ac"]);
  expect(getTerminalPoint(horizontal, "t1")).toEqual({ x: horizontal.position.x - horizontal.size.width / 2 - 12, y: horizontal.position.y });
  expect(getTerminalPoint(horizontal, "t2")).toEqual({ x: horizontal.position.x + horizontal.size.width / 2 + 12, y: horizontal.position.y });
  expect(vertical.terminals.map((terminal) => terminal.type)).toEqual(["dc", "ac"]);
  expect(getTerminalPoint(vertical, "t1")).toEqual({ x: vertical.position.x, y: vertical.position.y - vertical.size.width / 2 - 12 });
  expect(getTerminalPoint(vertical, "t2")).toEqual({ x: vertical.position.x, y: vertical.position.y + vertical.size.width / 2 + 12 });
  expect(canConnectTerminals(horizontal, "t1", dcLoad, "t1")).toBe(true);
  expect(canConnectTerminals(horizontal, "t2", acLoad, "t1")).toBe(true);
  expect(canConnectTerminals(horizontal, "t1", acLoad, "t1")).toBe(false);
  expect(canConnectTerminals(horizontal, "t2", dcLoad, "t1")).toBe(false);
});

test("keeps only canonical DCAC converter control fields without legacy migration", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "acdc-converter");
  expect(template).toBeTruthy();
  const legacyOnly = createDefaultNode("acdc-converter", { x: 100, y: 100 });
  legacyOnly.params.control_type = "ACV";
  legacyOnly.params.controlType = "ACP";
  legacyOnly.params.acControlType = "PV";
  legacyOnly.params.dcControlType = "I";
  delete legacyOnly.params.ac_control_type;
  delete legacyOnly.params.dc_control_type;

  const normalizedLegacyOnly = normalizeNodeTerminalsWithTemplate(legacyOnly, template);
  expect(normalizedLegacyOnly.params.ac_control_type).toBe("PQ");
  expect(normalizedLegacyOnly.params.dc_control_type).toBe("V");
  expect(normalizedLegacyOnly.params).not.toHaveProperty("control_type");
  expect(normalizedLegacyOnly.params).not.toHaveProperty("controlType");
  expect(normalizedLegacyOnly.params).not.toHaveProperty("acControlType");
  expect(normalizedLegacyOnly.params).not.toHaveProperty("dcControlType");

  const canonical = createDefaultNode("acdc-converter", { x: 240, y: 100 });
  canonical.params.ac_control_type = "PV";
  canonical.params.dc_control_type = "I";
  canonical.params.control_type = "DCV";
  canonical.params.acControlType = "PH";
  canonical.params.dcControlType = "P";
  const normalizedCanonical = normalizeNodeTerminalsWithTemplate(canonical, template);
  expect(normalizedCanonical.params.ac_control_type).toBe("PV");
  expect(normalizedCanonical.params.dc_control_type).toBe("I");
  expect(normalizedCanonical.params.p_dc_set).toBe("0.0");

  const definitions = getTemplateParameterDefinitions(template!);
  const definitionByName = new Map(definitions.map((definition) => [definition.enName, definition]));
  expect(definitionByName.get("ac_control_type")?.valueType).toBe("stringEnum");
  expect(definitionByName.get("dc_control_type")?.valueType).toBe("stringEnum");
  expect(definitionByName.get("p_dc_set")?.valueType).toBe("float");
  expect(definitionByName.has("control_type")).toBe(false);
});

test("migrates legacy ACAC and DCDC converter controls to endpoint fields", () => {
  const cases = [
    {
      kind: "dcdc-converter" as const,
      params: { control_type: "V", source_control_type: "定P", target_control_type: "不定" },
      expected: { i_control_type: "V", j_control_type: "NONE" }
    },
    {
      kind: "acac-converter" as const,
      params: { control_type: "PVQ", source_control_type: "定PQ", target_control_type: "定PQ" },
      expected: { i_control_type: "PV", j_control_type: "PQ" }
    }
  ];

  for (const item of cases) {
    const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === item.kind)!;
    const node = createDefaultNode(item.kind, { x: 100, y: 100 });
    delete node.params.i_control_type;
    delete node.params.j_control_type;
    Object.assign(node.params, item.params, {
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify([
        { cnName: "旧控制类型", enName: "control_type", valueType: "stringEnum", typicalValue: item.params.control_type },
        { cnName: "首端控制类型", enName: "source_control_type", valueType: "stringEnum", typicalValue: item.params.source_control_type },
        { cnName: "末端控制类型", enName: "target_control_type", valueType: "stringEnum", typicalValue: item.params.target_control_type }
      ])
    });

    const normalized = normalizeNodeTerminalsWithTemplate(node, template);
    const fieldNames = getTemplateParameterDefinitions(template).map((definition) => definition.enName);
    const storedFieldNames = (JSON.parse(normalized.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[])
      .map((definition) => definition.enName);

    expect(normalized.params).toMatchObject(item.expected);
    expect(normalized.params).not.toHaveProperty("control_type");
    expect(normalized.params).not.toHaveProperty("source_control_type");
    expect(normalized.params).not.toHaveProperty("target_control_type");
    expect(fieldNames).toEqual(expect.arrayContaining(["i_control_type", "j_control_type"]));
    expect(fieldNames).not.toContain("control_type");
    expect(storedFieldNames).toEqual(expect.arrayContaining(["i_control_type", "j_control_type"]));
    expect(storedFieldNames).not.toContain("control_type");
    expect(storedFieldNames).not.toContain("source_control_type");
    expect(storedFieldNames).not.toContain("target_control_type");
  }
});

test("treats persisted converter parameter definitions as a complete table", () => {
  const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === "dcdc-converter")!;
  const retainedDefinitions = getTemplateParameterDefinitions(template).filter((definition) => (
    !["p_set", "i_set", "v_set", "i_p_set", "i_i_set", "i_v_set", "j_p_set", "j_i_set", "j_v_set"].includes(definition.enName)
  ));
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: "shared:DCDCConverter",
    parameterDefinitions: retainedDefinitions,
    updatedAt: "2026-08-13T00:00:00.000Z"
  });
  const reopenedFields = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);

  expect(reopenedFields).toEqual(retainedDefinitions.map((definition) => definition.enName));
  expect(reopenedFields).not.toEqual(expect.arrayContaining(["p_set", "i_set", "v_set"]));
});

test("keeps two-winding and three-winding transformers as separate non-container device types", () => {
  const acTransformer = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer");
  const twoWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-winding-transformer");
  const threeWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer");

  expect(acTransformer?.label).toBe("双绕组主变");
  expect(acTransformer?.terminalCount).toBe(2);
  expect(acTransformer?.isContainer).not.toBe(true);
  expect(getTemplateParameterDefinitions(acTransformer!).map((definition) => definition.enName)).toEqual(expect.arrayContaining([
    "idx",
    "name",
    "status",
    "run_stat",
    "i_node",
    "j_node",
    "high_vbase",
    "low_vbase",
    "rated_capacity",
    "r",
    "x",
    "gt",
    "bt",
    "tap",
    "shift"
  ]));
  expect(twoWinding).toBeUndefined();
  expect(threeWinding?.terminalType).toBe("ac");
  expect(threeWinding?.terminalCount).toBe(3);
  expect(threeWinding?.isContainer).toBe(false);
  const fieldNames = getTemplateParameterDefinitions(threeWinding!).map((definition) => definition.enName);
  const canonicalSideFields = [
    "r1", "x1", "gt1", "bt1", "tap1", "shift1",
    "r2", "x2", "gt2", "bt2", "tap2", "shift2",
    "r3", "x3", "gt3", "bt3", "tap3", "shift3"
  ];
  const retiredSideFields = [
    "high_resistance_pu",
    "high_reactance_pu",
    "high_magnetizing_conductance_pu",
    "high_magnetizing_susceptance_pu",
    "high_tap_ratio",
    "high_shift",
    "medium_resistance_pu",
    "medium_reactance_pu",
    "medium_magnetizing_conductance_pu",
    "medium_magnetizing_susceptance_pu",
    "medium_tap_ratio",
    "medium_shift",
    "low_resistance_pu",
    "low_reactance_pu",
    "low_magnetizing_conductance_pu",
    "low_magnetizing_susceptance_pu",
    "low_tap_ratio",
    "low_shift"
  ];
  expect(fieldNames).toEqual(expect.arrayContaining([
    "idx",
    "name",
    "run_stat",
    ...canonicalSideFields
  ]));
  expect(fieldNames).not.toEqual(expect.arrayContaining(retiredSideFields));
  expect(fieldNames).not.toContain("idx_xf_t1");
  expect(fieldNames).not.toContain("idx_xf_t2");
  expect(fieldNames).not.toContain("idx_xf_t3");
  expect(getEParameterKeys("ac-three-winding-transformer", createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 }).params)).toEqual(
    E_SECTION_COLUMNS.ACTransfomer3
  );
});

test("removes duplicate legacy parameter fields from two-winding transformers", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer")!;
  const fieldNames = getTemplateParameterDefinitions(template).map((definition) => definition.enName);
  const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });

  expect(fieldNames).toEqual(expect.arrayContaining(["i_node", "j_node", "r", "x", "gt", "bt", "tap"]));
  expect(fieldNames).not.toEqual(expect.arrayContaining([
    "t1_node",
    "t2_node",
    "resistance_pu",
    "reactance_pu",
    "magnetizing_conductance_pu",
    "magnetizing_susceptance_pu",
    "tap_ratio"
  ]));
  expect(transformer.params).toMatchObject({
    r: "0.0",
    x: "0.1",
    gt: "0.0",
    bt: "0.0",
    tap: "1.0"
  });
  expect(transformer.params).not.toHaveProperty("t1_node");
  expect(transformer.params).not.toHaveProperty("t2_node");
  expect(transformer.params).not.toHaveProperty("resistance_pu");
  expect(transformer.params).not.toHaveProperty("reactance_pu");
  expect(transformer.params).not.toHaveProperty("magnetizing_conductance_pu");
  expect(transformer.params).not.toHaveProperty("magnetizing_susceptance_pu");
  expect(transformer.params).not.toHaveProperty("tap_ratio");
});

test("keeps persisted two-winding transformer overrides aligned with the built-in parameter model", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer")!;
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: "ACTransformer",
    params: { component_type: "ACTransformer" },
    isContainer: false,
    parameterDefinitions: buildDefaultDeviceParameterDefinitions(["ac", "ac"]),
    updatedAt: "2026-07-12T00:00:00.000Z"
  });
  const fieldNames = getTemplateParameterDefinitions(overridden).map((definition) => definition.enName);
  const node = createNodeFromTemplate(overridden, { x: 100, y: 100 });

  expect(fieldNames).toContain("rated_capacity");
  expect(fieldNames).toContain("r");
  expect(fieldNames).toContain("tap");
  expect(fieldNames).toContain("shift");
  expect(fieldNames).not.toContain("t1_node");
  expect(fieldNames).not.toContain("t2_node");
  expect(fieldNames).not.toContain("resistance_pu");
  expect(fieldNames).not.toContain("tap_ratio");
  expect(node.params.rated_capacity).toBe("50");
  expect(node.params.x).toBe("0.1");
  expect(node.params.shift).toBe("0");

  delete node.params.r;
  delete node.params.x;
  delete node.params.gt;
  delete node.params.bt;
  delete node.params.tap;
  node.params.t1_node = "11";
  node.params.t2_node = "12";
  node.params.resistance_pu = "0.025";
  node.params.reactance_pu = "0.2";
  node.params.magnetizing_conductance_pu = "0.003";
  node.params.magnetizing_susceptance_pu = "0.004";
  node.params.tap_ratio = "1.05";
  const normalized = normalizeNodeTerminalsWithTemplate(node, overridden);
  expect(normalized.params).toMatchObject({
    r: "0.025",
    x: "0.2",
    gt: "0.003",
    bt: "0.004",
    tap: "1.05"
  });
  expect(normalized.params.t1_node).toBeUndefined();
  expect(normalized.params.t2_node).toBeUndefined();
  expect(normalized.params.resistance_pu).toBeUndefined();
  expect(normalized.params.reactance_pu).toBeUndefined();
  expect(normalized.params.magnetizing_conductance_pu).toBeUndefined();
  expect(normalized.params.magnetizing_susceptance_pu).toBeUndefined();
  expect(normalized.params.tap_ratio).toBeUndefined();
  expect(normalized.params.shift).toBe("0");
});
});
