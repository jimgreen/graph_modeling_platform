import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeviceGlyph } from "./DeviceGlyph";
import { createRenderStaticBoxDrawingPreview } from "./appExtracted/appCanvasInteractionFactories";
import { apiPath } from "./config";
import { DEVICE_VISUAL_PARAM_KEYS } from "./deviceVisualParams";
import {
  alignNodes,
  buildTopology,
  buildElementTree,
  buildEFileExport,
  buildMultiModelEFileExport,
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
  DEVICE_LIBRARY_BY_KIND,
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
  HYDROGEN_COUPLING_CONTROL_TYPES,
  HYDROGEN_ENDPOINT_CONTROL_TYPES,
  HYDROGEN_STORAGE_CONTROL_TYPES,
  ELECTRIC_HEAT_COUPLING_CONTROL_TYPES,
  E_SECTION_COLUMNS,
  ELEMENT_TREE_COMPONENT_LIBRARY_LABELS,
  COMPONENT_LIBRARY_REVERSE_MAPPING,
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
  associatedNodeColumnValue,
  getEParamValue,
  getEParameterKeys,
  resolveDeviceParameterDefinitionExportSettings,
  inferESection,
  AC_CONTAINER_KINDS,
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
  modelAssociationModelTypeForKind,
  MODEL_TYPES,
  nextGlobalProjectIndex,
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
  toSnakeCaseDeviceParamName,
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
  buildEDeviceRecords,
  formatEDeviceRecordColumnValue,
  type Edge,
  type DeviceKind,
  type DeviceTemplate,
  type ModelNode,
  type Point,
  type ProjectFile,
  type Terminal,
  type TerminalType
} from "./model";
import { terminalVoltageDisplay, transformGraphForGateways } from "./model-eexport";
import { applyRemoveFromAcContainer, withNodeUpdates } from "./acContainer";

test("keeps electrical measurement and setpoint columns aligned with the device contracts", () => {
  expect(E_SECTION_COLUMNS.ACBranch).toEqual(expect.arrayContaining([
    "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"
  ]));
  expect(E_SECTION_COLUMNS.ACBranch).not.toEqual(expect.arrayContaining(["p", "q", "u", "i"]));
  expect(E_SECTION_COLUMNS.DCBranch).toEqual(expect.arrayContaining([
    "i_p", "i_u", "i_i", "j_p", "j_u", "j_i"
  ]));
  expect(E_SECTION_COLUMNS.DCBranch).not.toEqual(expect.arrayContaining(["p", "q", "u", "i"]));
  for (const section of ["ACSwitch", "ACBreak"] as const) {
    expect(E_SECTION_COLUMNS[section], section).toEqual(expect.arrayContaining(["status", "closed_status", "closed_status_set", "p", "q", "u", "i"]));
    expect(E_SECTION_COLUMNS[section], section).not.toContain("status_set");
  }
  for (const section of ["DCSwitch", "DCBreak"] as const) {
    expect(E_SECTION_COLUMNS[section], section).toEqual(expect.arrayContaining(["status", "closed_status", "closed_status_set", "p", "u", "i"]));
    expect(E_SECTION_COLUMNS[section], section).not.toContain("status_set");
  }
  expect(E_SECTION_COLUMNS.ACLoad).toContain("q_set");
  expect(E_SECTION_COLUMNS.ACTransformer).toEqual(expect.arrayContaining(["tap", "tap_set"]));
});
import { degreesToRadians } from "./formatUtils";
import type { GlobalLineRecord } from "./global-lines";
import { readFileSync } from "node:fs";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "./appExtracted/appDeviceDefinitionFactories";

/** 加载真实预定义模板(public/e-templates/*.e)为导出选项:与库状态应用、后端模板导出同一管线 */
function eExportOptionsForTemplateFile(file: string, classExportEnabled?: Record<string, boolean>) {
  const sections = parseEDeviceDefinitionFile(readFileSync(new URL(`../public/e-templates/${file}`, import.meta.url), "utf8"));
  const libraryState = applyEDeviceDefinitionSectionsToLibraryState({
    sections,
    libraryTemplates: DEVICE_LIBRARY as any
  });
  return buildEFileExportOptionsFromLibrary({
    libraryTemplates: DEVICE_LIBRARY as any,
    eDeviceDefinitionLabels: libraryState.eDeviceDefinitionLabels,
    eDeviceDefinitionFieldOrder: libraryState.eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields: libraryState.eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds: libraryState.eDeviceDefinitionTableIds,
    eDeviceDefinitionClassExportEnabled: classExportEnabled
  });
}

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


describe("eexport", () => {
test("round-trips project files without losing device parameters", () => {
  const node = createDefaultNode("ac-transformer", { x: 160, y: 180 });
  node.name = "1号主变";
  node.params.rated_capacity = "50 MVA";
  node.params.voltage_ratio = "110/10 kV";

  const json = serializeProject({
    version: 1,
    name: "测试模型",
    canvasBackgroundColor: "#f1f5f9",
    canvasBackgroundImage: apiPath("/images/background"),
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
          items: [{ id: "item-p", measurementTypeId: "active_power", sourcePoint: `${node.id}.active_power` }]
        },
        {
          id: "measurement-drop",
          nodeId: "missing-node",
          visible: true,
          anchor: "bottom",
          offset: { x: 0, y: 80 },
          layout: "vertical",
          items: [{ id: "item-q", measurementTypeId: "reactive_power", sourcePoint: "missing.reactive_power" }]
        }
      ]
    },
    nodes: [node],
    edges: []
  });
  const loaded = deserializeProject(json);

  expect(loaded.name).toBe("测试模型");
  expect(loaded.canvasBackgroundColor).toBe("#f1f5f9");
  expect(loaded.canvasBackgroundImage).toBe(apiPath("/images/background"));
  expect(loaded.canvasBackgroundImageAssetId).toBe("background");
  expect(loaded.powerUnit).toBe("MW");
  expect(loaded.voltageUnit).toBe("kV");
  expect(loaded.currentUnit).toBe("kA");
  expect(loaded.powerBaseValue).toBe(100);
  expect(loaded.nodes[0].name).toBe("1号主变");
  expect(loaded.nodes[0].params.voltage_ratio).toBe("110/10 kV");
  expect(loaded.measurements?.groups.map((group) => group.id)).toEqual(["measurement-keep"]);
  expect(loaded.measurements?.groups[0].items[0]).toMatchObject({ measurementTypeId: "active_power" });
});

test("exports separate high and low side measurements for two-winding transformers", () => {
  const transformer = createDefaultNode("ac-transformer", { x: 160, y: 180 });
  transformer.name = "双绕组主变-1";
  Object.assign(transformer.params, {
    i_p: "10.1",
    i_q: "2.1",
    i_u: "110",
    i_i: "52",
    j_p: "9.8",
    j_q: "1.9",
    j_u: "10",
    j_i: "515"
  });

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "双绕组分侧量测",
    nodes: [transformer],
    edges: []
  }));

  expect(payload.ACTransformer.columns).toEqual(expect.arrayContaining([
    "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"
  ]));
  expect(payload.ACTransformer.columns).not.toEqual(expect.arrayContaining(["p", "q", "u", "i"]));
  expect(payload.ACTransformer.rows[0]).toMatchObject({
    i_p: "10.1",
    i_q: "2.1",
    i_u: "110",
    i_i: "52",
    j_p: "9.8",
    j_q: "1.9",
    j_u: "10",
    j_i: "515"
  });
});

test("uses legacy unqualified two-winding measurements as high-side export fallbacks", () => {
  const transformer = createDefaultNode("ac-transformer", { x: 160, y: 180 });
  for (const field of ["i_p", "i_q", "i_u", "i_i"]) {
    delete transformer.params[field];
  }
  Object.assign(transformer.params, { p: "8.5", q: "1.5", u: "110", i: "44" });

  expect(getEParamValue("i_p", transformer)).toBe("8.5");
  expect(getEParamValue("i_q", transformer)).toBe("1.5");
  expect(getEParamValue("i_u", transformer)).toBe("110");
  expect(getEParamValue("i_i", transformer)).toBe("44");
  expect(getEParamValue("j_p", transformer)).toBe("0");
});

test("uses snake_case names for every built-in business parameter", () => {
  const snakeCasePattern = /^[a-z0-9_]+$/;
  const violations: string[] = [];
  for (const template of DEVICE_LIBRARY) {
    if (isStaticNode({ kind: template.kind } as ModelNode)) {
      continue;
    }
    for (const key of Object.keys(template.params ?? {})) {
      if (DEVICE_VISUAL_PARAM_KEYS.has(key)) {
        continue;
      }
      if (!snakeCasePattern.test(key)) {
        violations.push(`${template.kind}.params.${key}`);
      }
    }
    for (const definition of getTemplateParameterDefinitions(template)) {
      if (!snakeCasePattern.test(definition.enName)) {
        violations.push(`${template.kind}.definition.${definition.enName}`);
      }
      if (definition.exportName && !snakeCasePattern.test(definition.exportName)) {
        violations.push(`${template.kind}.export.${definition.exportName}`);
      }
    }
  }

  expect(violations).toEqual([]);
});

test("creates built-in device defaults with snake_case business params", () => {
  const snakeCasePattern = /^[a-z0-9_]+$/;
  const violations: string[] = [];
  for (const template of DEVICE_LIBRARY) {
    if (isStaticNode({ kind: template.kind } as ModelNode)) {
      continue;
    }
    const node = createDefaultNode(template.kind, { x: 0, y: 0 });
    for (const key of Object.keys(node.params ?? {})) {
      if (key.startsWith("_") || DEVICE_VISUAL_PARAM_KEYS.has(key)) {
        continue;
      }
      if (!snakeCasePattern.test(key)) {
        violations.push(`${template.kind}.node.${key}`);
      }
    }
  }

  expect(violations).toEqual([]);
});

test("resolves custom multi-state visual overrides without changing E export shape", () => {
  const template: DeviceTemplate = {
    ...DEVICE_LIBRARY.find((item) => item.kind === "ac-switch")!,
    kind: "custom-state-switch" as DeviceKind,
    label: "多状态开关",
    custom: true,
    params: {
      component_type: "ACSwitch",
      foregroundColor: "#111827"
    },
    stateDefinitions: [
      { value: "0", name: "打开", text: "OFF", color: "#ef4444", image: "open.svg" },
      { value: "1", name: "闭合", text: "ON", color: "#22c55e", image: "closed.svg" },
      { value: "2", name: "检修", text: "M", color: "#f59e0b", image: "maint.svg" }
    ]
  };

  const node = createNodeFromTemplate(template, { x: 100, y: 100 });
  expect(node.params.status).toBe("1");
  expect(node.params.closed_status).toBe("1");
  expect(node.params.run_stat).toBe("1");
  expect(resolveDeviceStateVisual(template, node)).toMatchObject({
    value: "1",
    name: "闭合",
    text: "ON"
  });
  expect(resolveDeviceStateVisual({
    ...template,
    params: { ...template.params, status: "0", closed_status: "1" }
  }, { params: {} })).toMatchObject({
    value: "1",
    name: "闭合",
    text: "ON"
  });

  const explicitIndependentStateNode = createNodeFromTemplate(template, { x: 200, y: 100 });
  explicitIndependentStateNode.params.status = "0";
  explicitIndependentStateNode.params.closed_status = "1";
  expect(explicitIndependentStateNode.params).toMatchObject({ status: "0", closed_status: "1" });
  expect(resolveDeviceStateVisual(template, explicitIndependentStateNode)).toMatchObject({ value: "1", name: "闭合" });

  const visual = resolveDeviceStateVisual(template, { ...node, params: { ...node.params, closed_status: "2" } });
  expect(visual).toMatchObject({
    value: "2",
    name: "检修",
    text: "M",
    color: "#f59e0b",
    image: "maint.svg"
  });
  expect(resolveDeviceStateVisual(template, { ...node, params: { ...node.params, closed_status: "未知" } })).toBeNull();
  expect(resolveDeviceStateVisual({
    ...template,
    stateDefinitions: template.stateDefinitions?.filter((state) => state.value !== "2")
  }, { ...node, params: { ...node.params, closed_status: "2" } })).toBeNull();
  expect(resolveDeviceStateVisual(template, { ...node, params: { ...node.params, closed_status: "闭合" } })).toMatchObject({
    value: "闭合",
    name: "闭合",
    text: "ON"
  });

  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "多状态开关导出",
    nodes: [{ ...node, name: "多状态开关1", params: { ...node.params, status: "0", closed_status: "2" } }],
    edges: []
  }));

  expect(exported.ACSwitch.rows).toHaveLength(1);
  expect(exported.ACSwitch.rows[0]).toEqual(expect.objectContaining({ status: "0", closed_status: "1", run_stat: "1" }));
});

test("exports the owning class name as dev_type for base and vertical device variants", () => {
  const baseNode = createDefaultNode("ac-series-capacitor", { x: 100, y: 100 });
  const verticalNode = createDefaultNode("ac-series-capacitor-vertical", { x: 260, y: 100 });
  baseNode.params.dev_type = "ac-series-capacitor";
  verticalNode.params.dev_type = "ac-series-capacitor-vertical";
  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "竖向补偿元件测试",
    nodes: [baseNode, verticalNode],
    edges: []
  }));
  expect(exported.ACSeriCompensator.rows).toHaveLength(2);
  expect(exported.ACSeriCompensator.rows[0].dev_type).toBe("ACSeriCompensator");
  expect(exported.ACSeriCompensator.rows[1].dev_type).toBe("ACSeriCompensator");
});

test("exports the interface dev_type for vertical variants from the owning class", () => {
  const verticalNode = createDefaultNode("ac-series-capacitor-vertical", { x: 100, y: 100 });
  verticalNode.params.dev_type = "ac-series-capacitor-vertical";
  const payload = parseESections(buildEFileExport({
    version: 1,
    name: "竖向接口测试",
    nodes: [verticalNode],
    edges: []
  }, ["默认方案"], {
    interfaceDefinitions: [{
      componentLibrary: "ACSeriCompensator",
      exportEnabled: true,
      exportName: "ACSeriCompensator",
      fields: [
        { sourceName: "idx", exportEnabled: true, exportName: "idx" },
        { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
      ]
    }]
  }).text);
  expect(payload.ACSeriCompensator.rows[0].dev_type).toBe("ACSeriCompensator");
});

test("exports class names for dev_type in container-associated heat source records", () => {
  let counters = {};
  const kinds = [
    "heat-boiler",
    "ac-heater",
    "dc-heater",
    "two-port-heat-boiler",
    "ac-two-port-heater",
    "dc-two-port-heater"
  ] as const;
  const nodes = kinds.map((kind, index) => {
    const result = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100 + index * 120, y: 100 }), counters);
    counters = result.counters;
    result.node.params.dev_type = kind;
    return result.node;
  });
  const classFields = (doublePort: boolean) => [
    { sourceName: "idx", exportEnabled: true, exportName: "idx" },
    { sourceName: "name", exportEnabled: true, exportName: "name" },
    { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" },
    ...(doublePort
      ? [
          { sourceName: "i_node", exportEnabled: true, exportName: "i_node" },
          { sourceName: "j_node", exportEnabled: true, exportName: "j_node" }
        ]
      : [{ sourceName: "node", exportEnabled: true, exportName: "node" }]),
    { sourceName: "supply_temperature_set", exportEnabled: true, exportName: "supply_temperature_set" },
    { sourceName: "run_stat", exportEnabled: true, exportName: "run_stat" }
  ];
  const payload = parseESections(buildEFileExport({
    version: 1,
    name: "供热关联设备类名导出测试",
    nodes,
    edges: []
  }, ["默认方案"], {
    eDeviceDefinitionLabels: {
      HeatSource: "HeatSource",
      HeatSource2: "HeatSource2"
    },
    interfaceDefinitions: [
      {
        componentLibrary: "HeatSource",
        exportEnabled: true,
        exportName: "HeatSource",
        fields: classFields(false)
      },
      {
        componentLibrary: "HeatSource2",
        exportEnabled: true,
        exportName: "HeatSource2",
        fields: classFields(true)
      }
    ]
  }).text);

  expect(payload.HeatSource.rows).toHaveLength(3);
  expect(payload.HeatSource.rows.map((row) => row.dev_type)).toEqual([
    "HeatSource",
    "HeatSource",
    "HeatSource"
  ]);
  expect(payload.HeatSource2.rows).toHaveLength(3);
  expect(payload.HeatSource2.rows.map((row) => row.dev_type)).toEqual([
    "HeatSource2",
    "HeatSource2",
    "HeatSource2"
  ]);
});

test("exports owning class names for dev_type across every built-in E device class", () => {
  let counters = {};
  const supportedSections = new Set(Object.keys(E_SECTION_COLUMNS));
  const knownClassNames = new Set([
    ...supportedSections,
    ...DEVICE_LIBRARY.flatMap((template) => {
      const derivedInfo = templateDerivedComponentLibraryInfo(template);
      return derivedInfo ? [derivedInfo.derivedComponentLibrary] : [];
    })
  ]);
  const nodes = DEVICE_LIBRARY
    .filter((template) => {
      if (isStaticKind(template.kind)) {
        return false;
      }
      return supportedSections.has(inferESection(template.kind, template.params));
    })
    .map((template, index) => {
      const indexed = assignPermanentDeviceIndex(
        createDefaultNode(template.kind, { x: 100 + (index % 12) * 140, y: 100 + Math.floor(index / 12) * 120 }),
        counters
      );
      counters = indexed.counters;
      indexed.node.params.dev_type = `legacy-${template.kind}`;
      return indexed.node;
    });
  const interfaceDefinitions = [...supportedSections].map((section) => ({
    componentLibrary: section,
    exportEnabled: true,
    exportName: section,
    fields: [
      { sourceName: "idx", exportEnabled: true, exportName: "idx" },
      { sourceName: "name", exportEnabled: true, exportName: "name" },
      { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
    ]
  }));
  const exported = parseESections(buildEFileExport({
    version: 1,
    name: "全内置类设备类型导出测试",
    nodes,
    edges: []
  }, ["默认方案"], {
    eDeviceDefinitionLabels: Object.fromEntries([...supportedSections].map((section) => [section, section])),
    interfaceDefinitions
  }).text);

  let checkedRows = 0;
  const checkedSections: string[] = [];
  const checkedClassNames = new Set<string>();
  for (const [section, payload] of Object.entries(exported)) {
    if (!payload.columns.includes("dev_type")) {
      continue;
    }
    checkedSections.push(section);
    checkedRows += payload.rows.length;
    for (const row of payload.rows) {
      checkedClassNames.add(row.dev_type);
      // 容器例外:容器段的 dev_type 必须是容器元件英文名 —— 段名 ACContainer 也在 knownClassNames 里,
      // 故容器段单列判据,否则「容器退化成段名」这条错法会被 has() 静默放过
      const known = section === "ACContainer"
        ? (AC_CONTAINER_KINDS as readonly string[]).includes(row.dev_type)
        : knownClassNames.has(row.dev_type);
      expect(known, `${section}: ${row.dev_type}`).toBe(true);
      expect(row.dev_type).not.toMatch(/^legacy-/u);
    }
  }
  // 精确条数：两个 kind 之间「对调映射」换成另一个合法类名时 has() 成员断言抓不到，计数能立刻失败
  // 375 = 371(既有设备类) + 3(3 个交流容器 kind 入「容器表」段) + 1(容器入列后其后图元网格位置右移，
  // 氢能端子重叠分组随之多出一组 —— 本用例按 i % 12 布点，条数对布点敏感，属既有耦合)
  expect(checkedRows).toBe(375);
  expect(checkedSections).toEqual(expect.arrayContaining([
    "ACCompensator",
    "ACSeriCompensator",
    "ACContainer",
    "HeatSource",
    "HeatSource2"
  ]));
  expect([...checkedClassNames]).toEqual(expect.arrayContaining([
    "ACWindGen",
    "DCPVGen"
  ]));
});

test("includes AC and DC zero-impedance branch elements in the library and E export", () => {
  const acTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-zero-branch");
  const dcTemplate = DEVICE_LIBRARY.find((item) => item.kind === "dc-zero-branch");
  expect(acTemplate).toMatchObject({ label: "交流零阻抗支路", categoryLibrary: "交流设备", terminalType: "ac", terminalCount: 2 });
  expect(dcTemplate).toMatchObject({ label: "直流零阻抗支路", categoryLibrary: "直流设备", terminalType: "dc", terminalCount: 2 });

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

test("builds a downloadable E file export for the current model", () => {
  const node = createDefaultNode("ac-source", { x: 100, y: 100 });
  node.name = "交流发电机-1";
  const project: ProjectFile = {
    version: 1,
    name: "混合/能源:模型",
    nodes: [node],
    edges: []
  };

  const file = buildEFileExport(project, ["主方案", "子方案"]);

  expect(file.filename).toBe("混合_能源_模型.e");
  expect(file.mime).toBe("text/plain");
  expect(file.text).toContain("<Model>");
  expect(file.text).not.toContain("<PowerBase>");
  const sections = parseESections(file.text);
  expect(sections.Model.columns).toEqual(["path", "name", "p_base", "u_unit", "p_unit", "i_unit"]);
  expect(sections.Model.rows[0]).toEqual({
    path: "主方案/子方案",
    name: "混合/能源:模型",
    p_base: "100",
    u_unit: "kV",
    p_unit: "MW",
    i_unit: "A"
  });
  expect(file.text).toContain("<ACGenerator>");
  expectEFileSectionColumnsAligned(file.text, "Model");
  expectEFileSectionColumnsAligned(file.text, "ACGenerator");
  expect(() => JSON.parse(file.text)).toThrow();
});

test("exports only devices with exported params and skips others", () => {
  const file = buildEDeviceDefinitionFile(templates);
  expect(file.filename).toBe("图元E文件定义.e");
  expect(file.mime).toBe("text/plain");
  expect(file.text).toContain("<ACLoad 中文名=\"交流负荷\" 类别库=\"交流设备\">");
  expect(file.text).toContain("p_load");
  expect(file.text).toContain("q_load");
  expect(file.text).toContain("有功功率");
  expect(file.text).toContain("无功功率");
  expect(file.text).toContain("dev_type");
  expect(file.text).not.toContain("customNoExport");
  expect(file.text.endsWith("\n")).toBe(true);
});

test("omits device classes disabled by E interface definition settings", () => {
  const file = buildEDeviceDefinitionFile(templates, undefined, undefined, { ACLoad: false });

  expect(file.text).not.toContain("<ACLoad ");
  expect(file.text).toBe("");
});

test("exports params whose export flag is inferred from E section when exportEnabled is undefined", () => {
  // 自定义元件默认参数行未显式设置 exportEnabled，界面按 E 分区推导显示"是"，导出需与之保持一致
  const template = {
    kind: "customMyLoad",
    label: "自定义负荷",
    categoryLibrary: "交流设备",
    params: { component_type: "MyCustomLoad" },
    parameterDefinitions: [
      { cnName: "有功功率", enName: "p_load", valueType: "float", typicalValue: "0" }
    ]
  } as unknown as DeviceTemplate;
  const file = buildEDeviceDefinitionFile([template]);
  expect(file.text).toContain("p_load");
  expect(file.text).toContain("有功功率");
});

test("exports built-in E columns for devices without parameterDefinitions (e.g. ac-source)", () => {
  // 交流电源参数仅在 params 里、无 parameterDefinitions，应按 E 分区内置列导出，避免整类图元丢失
  const template = {
    kind: "ac-source",
    label: "交流电源",
    categoryLibrary: "交流设备",
    params: { rated_voltage: "10 kV", frequency: "50 Hz", short_circuit_capacity: "500 MVA" },
    terminalType: "ac",
    terminalCount: 1
  } as unknown as DeviceTemplate;
  const file = buildEDeviceDefinitionFile([template]);
  expect(file.text).toContain("<ACGenerator ");
  expect(file.text).toContain("p_set");
  expect(file.text).toContain("交流电源");
  expect(file.text).toContain("dev_type");
});

test("exports parallel and series AC compensators with the defined columns and topology node numbers", () => {
  const shunt = createDefaultNode("ac-capacitor", { x: 100, y: 100 });
  shunt.name = "并联电容器1";
  shunt.params.idx = "1";
  shunt.terminals[0].nodeNumber = "11";
  const series = createDefaultNode("ac-series-reactor", { x: 240, y: 100 });
  series.name = "串联电抗器1";
  series.params.idx = "1";
  series.terminals[0].nodeNumber = "12";
  series.terminals[1].nodeNumber = "13";

  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "无功补偿设备",
    nodes: [shunt, series],
    edges: []
  }));

  expect(E_SECTION_COLUMNS.ACCompensator).toEqual([
    "idx", "name", "dev_type", "node", "rated_voltage", "rated_reactive_power", "reactance", "run_stat"
  ]);
  expect(E_SECTION_COLUMNS.ACSeriCompensator).toEqual([
    "idx", "name", "dev_type", "i_node", "j_node", "rated_voltage", "rated_reactive_power", "reactance", "run_stat"
  ]);
  expect(exported.ACCompensator.columns).toEqual([
    "idx", "name", "parent", ...E_SECTION_COLUMNS.ACCompensator.slice(2),
    "q",
    "current"
  ]);
  expect(exported.ACCompensator.rows).toEqual([expect.objectContaining({
    idx: "1",
    name: "并联电容器1",
    dev_type: "ACCompensator",
    rated_voltage: "0",
    rated_reactive_power: "1",
    reactance: "100"
  })]);
  expect(exported.ACCompensator.rows[0].node).toMatch(/^\d+$/);
  expect(exported.ACSeriCompensator.columns).toEqual([
    "idx", "name", "parent", ...E_SECTION_COLUMNS.ACSeriCompensator.slice(2),
    "p",
    "q",
    "current"
  ]);
  expect(exported.ACSeriCompensator.rows).toEqual([expect.objectContaining({
    idx: "1",
    name: "串联电抗器1",
    dev_type: "ACSeriCompensator",
    rated_voltage: "0",
    rated_reactive_power: "1",
    reactance: "100"
  })]);
  expect(exported.ACSeriCompensator.rows[0].i_node).toMatch(/^\d+$/);
  expect(exported.ACSeriCompensator.rows[0].j_node).toMatch(/^\d+$/);
  expect(Object.keys(exported)).not.toContain("ACShuntCompensator");
});

test("normalizes legacy AC shunt component metadata to ACCompensator", () => {
  expect(inferESection("ac-shunt", { component_type: "ACShuntCompensator" })).toBe("ACCompensator");
});

test("uses fixed cnName for idx/name and filters enName-only cnName in union", () => {
  // ac-source 无 parameterDefinitions（idx cnName=enName="idx"），ac-storage 有 parameterDefinitions（idx cnName="序号"）
  // 两者同属 ACGenerator，idx/name 应固定为"序号"/"名称"，p_set 过滤英文后保留"有功设定"
  const templates = [
    {
      kind: "ac-source",
      label: "交流电源",
      categoryLibrary: "交流设备",
      params: { rated_voltage: "10 kV" },
      terminalType: "ac",
      terminalCount: 1
    },
    {
      kind: "ac-storage",
      label: "储能",
      categoryLibrary: "交流设备",
      params: { component_type: "ACGenerator" },
      parameterDefinitions: [
        { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
        { cnName: "名称", enName: "name", valueType: "string", typicalValue: "" },
        { cnName: "有功设定", enName: "p_set", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "p_set" }
      ]
    }
  ] as unknown as DeviceTemplate[];
  const file = buildEDeviceDefinitionFile(templates);
  const sections = parseEDeviceDefinitionFile(file.text);
  const acGen = sections.find((s) => s.kind === "ACGenerator");
  expect(acGen).toBeDefined();
  expect(acGen!.fields.find((f) => f.exportName === "idx")?.cnName).toBe("序号");
  expect(acGen!.fields.find((f) => f.exportName === "name")?.cnName).toBe("名称");
  expect(acGen!.fields.find((f) => f.exportName === "parent")?.cnName).toBe("所属模型");
  expect(acGen!.fields.find((f) => f.exportName === "dev_type")?.cnName).toBe("设备类型");
  expect(acGen!.fields.slice(0, 4).map((field) => field.exportName)).toEqual([
    "idx", "name", "parent", "dev_type"
  ]);
  expect(acGen!.fields.find((f) => f.exportName === "p_set")?.cnName).toBe("有功设定值");
});

test("uses fixed cnName for node/i_node/j_node/run_stat columns", () => {
  const templates = [
    {
      kind: "ac-bus",
      label: "交流母线",
      categoryLibrary: "交流设备",
      params: {},
      terminalType: "ac",
      terminalCount: 1
    },
    {
      kind: "ac-line",
      label: "交流线路",
      categoryLibrary: "交流设备",
      params: { resistance: "1", reactance: "2" },
      terminalType: "ac",
      terminalCount: 2
    },
    {
      kind: "ac-switch",
      label: "交流开关",
      categoryLibrary: "交流设备",
      params: {},
      terminalType: "ac",
      terminalCount: 2
    }
  ] as unknown as DeviceTemplate[];
  const file = buildEDeviceDefinitionFile(templates);
  const sections = parseEDeviceDefinitionFile(file.text);
  const bus = sections.find((s) => s.kind === "ACRealBs");
  expect(bus).toBeDefined();
  expect(bus!.fields.find((f) => f.exportName === "node")?.cnName).toBe("节点");
  expect(bus!.fields.find((f) => f.exportName === "run_stat")?.cnName).toBe("工作状态（0:停运，1:运行）");
  const branch = sections.find((s) => s.kind === "ACBranch");
  expect(branch).toBeDefined();
  expect(branch!.fields.find((f) => f.exportName === "i_node")?.cnName).toBe("首节点");
  expect(branch!.fields.find((f) => f.exportName === "j_node")?.cnName).toBe("末节点");
  const sw = sections.find((s) => s.kind === "ACSwitch");
  expect(sw).toBeDefined();
  expect(sw!.fields.find((f) => f.exportName === "status")?.cnName).toBe("运行状态");
});

test("round trips fields through export and parse", () => {
  const file = buildEDeviceDefinitionFile(templates);
  const sections = parseEDeviceDefinitionFile(file.text);
  expect(sections).toHaveLength(1);
  expect(sections[0].kind).toBe("ACLoad");
  expect(sections[0].label).toBe("交流负荷");
  expect(sections[0].categoryLibrary).toBe("交流设备");
  // 合并 parameterDefinitions + eKeys + dev_type，验证关键字段存在
  expect(sections[0].fields.length).toBeGreaterThanOrEqual(5);
  expect(sections[0].fields.find((f) => f.exportName === "p_load")?.cnName).toBe("有功功率");
  expect(sections[0].fields.find((f) => f.exportName === "dev_type")?.cnName).toBe("设备类型");
  expect(sections[0].fields.find((f) => f.exportName === "idx")).toBeDefined();
});

test("round trips the complete configured field order through an interface definition file", () => {
  const file = buildEDeviceDefinitionFileFromInterfaceDefinitions([{
    componentLibrary: "ACGenerator",
    categoryLibrary: "交流设备",
    label: "交流电源",
    exportEnabled: true,
    exportName: "GeneratorTable",
    fields: [
      { sourceName: "control_type", cnName: "控制类型", exportEnabled: true, exportName: "mode" },
      { sourceName: "dev_type", cnName: "设备类型", exportEnabled: true, exportName: "dev_type" },
      { sourceName: "rated_voltage", cnName: "额定电压", exportEnabled: false, exportName: "rated_voltage" },
      { sourceName: "idx", cnName: "序号", exportEnabled: true, exportName: "idx" },
      { sourceName: "name", cnName: "名称", exportEnabled: true, exportName: "name" }
    ]
  }]);

  expect(file.text).toContain('类="ACGenerator"');
  const [section] = parseEDeviceDefinitionFile(file.text);

  expect(section.kind).toBe("GeneratorTable");
  expect(section.componentLibrary).toBe("ACGenerator");
  expect(section.exportEnabled).toBe(true);
  expect(section.fields.map((field) => field.sourceName)).toEqual([
    "control_type",
    "dev_type",
    "rated_voltage",
    "idx",
    "name"
  ]);
  expect(section.fields.map((field) => field.exportEnabled)).toEqual([true, true, false, true, true]);
  expect(section.fields.map((field) => field.exportName)).toEqual([
    "mode",
    "dev_type",
    "rated_voltage",
    "idx",
    "name"
  ]);
});

test("removes base-only parent and dev_type fields from historical derived interface definitions", () => {
  const file = buildEDeviceDefinitionFileFromInterfaceDefinitions([{
    componentLibrary: "ACFeederGen",
    categoryLibrary: "交流设备",
    label: "交流馈线电源",
    derivedFromComponentLibrary: "ACGenerator",
    isDerivedComponentLibrary: true,
    exportEnabled: true,
    exportName: "ACFeederGen",
    fields: [
      { sourceName: "idx", cnName: "序号", exportEnabled: true, exportName: "idx" },
      { sourceName: "parent", cnName: "所属模型", exportEnabled: true, exportName: "parent" },
      { sourceName: "dev_type", cnName: "设备类型", exportEnabled: true, exportName: "dev_type" },
      { sourceName: "idx_acgenerator", cnName: "原类关联idx", exportEnabled: true, exportName: "idx_acgenerator" },
      { sourceName: "model_id", cnName: "关联模型", exportEnabled: true, exportName: "model_id" }
    ]
  }]);

  const [section] = parseEDeviceDefinitionFile(file.text);
  expect(section.fields.map((field) => field.exportName)).toEqual([
    "idx",
    "idx_acgenerator",
    "model_id"
  ]);
});

test("normalizes legacy gas quantity names across E interface definition import and runtime export", () => {
  const tank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank", { x: 100, y: 100 }), {}).node;
  tank.params.gas_quantity = "321";

  for (const legacyName of ["gasQuantity", "gasquantity"]) {
    const interfaceDefinitions = [{
      componentLibrary: "HydroStorage",
      categoryLibrary: "氢能设备",
      label: "储氢罐",
      exportEnabled: true,
      exportName: "HydroStorage",
      fields: [
        { sourceName: "idx", cnName: "序号", exportEnabled: true, exportName: "idx" },
        { sourceName: legacyName, cnName: "储气量", exportEnabled: true, exportName: legacyName },
        { sourceName: "gas_quantity", cnName: "自定义储气量", exportEnabled: true, exportName: "customGasQuantity" }
      ]
    }];
    const definitionFile = buildEDeviceDefinitionFileFromInterfaceDefinitions(interfaceDefinitions);
    const [parsedDefinition] = parseEDeviceDefinitionFile(definitionFile.text);
    const payload = parseESections(buildEFileExport({
      version: 1,
      name: `储气量接口迁移-${legacyName}`,
      nodes: [tank],
      edges: []
    }, ["默认方案"], { interfaceDefinitions }).text);

    expect(parsedDefinition.fields.map((field) => field.sourceName)).toEqual([
      "idx",
      "gas_quantity",
      "gas_quantity"
    ]);
    expect(parsedDefinition.fields.map((field) => field.exportName)).toEqual([
      "idx",
      "gas_quantity",
      "customGasQuantity"
    ]);
    expect(payload.HydroStorage.columns).toEqual(["idx", "gas_quantity", "customGasQuantity"]);
    expect(payload.HydroStorage.rows[0]).toMatchObject({
      gas_quantity: "321",
      customGasQuantity: "321"
    });
  }

  const [handWritten] = parseEDeviceDefinitionFile(`<HydroStorage 中文名="储氢罐" 类别库="氢能设备">
@  gasquantity  my_gasQuantity_field
// 储气量       自定义字段
</HydroStorage>`);
  expect(handWritten.fields.map((field) => field.exportName)).toEqual(["gas_quantity", "my_gasQuantity_field"]);

  const templatePayload = parseESections(buildEFileExport({
    version: 1,
    name: "储气量历史模板导出",
    nodes: [tank],
    edges: []
  }, ["默认方案"], {
    eDeviceDefinitionTemplateFields: {
      HydroStorage: [
        { sourceName: "idx", exportName: "idx", cnName: "序号" },
        { sourceName: "gasquantity", exportName: "gasQuantity", cnName: "储气量" }
      ]
    }
  }).text);
  expect(templatePayload.HydroStorage.columns).toEqual(["idx", "gas_quantity"]);
  expect(templatePayload.HydroStorage.rows[0].gas_quantity).toBe("321");
});

test("normalizes legacy HydroStorage capacity interface fields to rated_capacity", () => {
  const tank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank", { x: 100, y: 100 }), {}).node;
  tank.params.rated_capacity = "1234";

  const payload = parseESections(buildEFileExport({
    version: 1,
    name: "储氢罐额定容量接口迁移",
    nodes: [tank],
    edges: []
  }, ["默认方案"], {
    interfaceDefinitions: [{
      componentLibrary: "HydroStorage",
      exportEnabled: true,
      exportName: "HydroStorage",
      fields: [
        { sourceName: "idx", cnName: "序号", exportEnabled: true, exportName: "idx" },
        { sourceName: "capacity", cnName: "旧额定储气量", exportEnabled: true, exportName: "capacity" }
      ]
    }]
  }).text);

  expect(payload.HydroStorage.columns).toEqual(["idx", "rated_capacity"]);
  expect(payload.HydroStorage.rows[0].rated_capacity).toBe("1234");
  expect(payload.HydroStorage.rows[0]).not.toHaveProperty("capacity");

  const definitionFile = buildEDeviceDefinitionFileFromInterfaceDefinitions([{
    componentLibrary: "HydroStorage",
    categoryLibrary: "氢能设备",
    label: "储氢罐",
    exportEnabled: true,
    exportName: "HydroStorage",
    fields: [
      { sourceName: "idx", cnName: "序号", exportEnabled: true, exportName: "idx" },
      { sourceName: "capacity", cnName: "旧额定储气量", exportEnabled: true, exportName: "capacity" }
    ]
  }]);
  const [parsedDefinition] = parseEDeviceDefinitionFile(definitionFile.text);
  expect(parsedDefinition.fields.map((field) => field.sourceName)).toEqual(["idx", "rated_capacity"]);
  expect(parsedDefinition.fields.map((field) => field.exportName)).toEqual(["idx", "rated_capacity"]);
});

test("exports and parses custom derived component library metadata", () => {
  const template = {
    kind: "custom-user-wind",
    label: "用户风电机组",
    categoryLibrary: "交流设备",
    size: { width: 96, height: 64 },
    params: {
      component_type: "ACGenerator",
      derived_from_component_type: "ACGenerator",
      derived_component_type: "UserWindGen",
      derived_component_library_label: "用户风电"
    },
    terminalType: "ac",
    terminalCount: 1,
    terminalTypes: ["ac"],
    isContainer: false,
    isDerivedComponentLibrary: true,
    derivedFromComponentLibrary: "ACGenerator",
    derivedComponentLibrary: "UserWindGen",
    derivedComponentLibraryLabel: "用户风电",
    parameterDefinitions: [
      { cnName: "有功功率", enName: "p_set", valueType: "float", typicalValue: "0", exportEnabled: true, exportName: "p_set" },
      { cnName: "装机容量", enName: "installedCapacity", valueType: "float", typicalValue: "120", exportEnabled: true, exportName: "installed_capacity" }
    ]
  } as unknown as DeviceTemplate;

  const file = buildEDeviceDefinitionFile([template]);

  expect(file.text).toContain("<ACGenerator 中文名=\"交流电源\" 类别库=\"交流设备\">");
  expect(file.text).toContain("p_set");
  expect(file.text).toContain("<UserWindGen 中文名=\"用户风电\" 类别库=\"交流设备\" 是否派生新类=\"是\" 派生基类=\"ACGenerator\">");
  expect(file.text).toContain("idx_acgenerator");
  expect(file.text).toContain("installed_capacity");
  const sections = parseEDeviceDefinitionFile(file.text);
  expect(sections).toHaveLength(2);
  const baseSection = sections.find((section) => section.kind === "ACGenerator");
  const derivedSection = sections.find((section) => section.kind === "UserWindGen");
  expect(baseSection).toMatchObject({
    kind: "ACGenerator",
    label: "交流电源",
    categoryLibrary: "交流设备",
    componentLibrary: "ACGenerator",
    derivedFromComponentLibrary: undefined,
    isDerivedComponentLibrary: undefined,
    isContainerComponentLibrary: undefined
  });
  expect(derivedSection).toMatchObject({
    kind: "UserWindGen",
    label: "用户风电",
    categoryLibrary: "交流设备",
    componentLibrary: "UserWindGen",
    derivedFromComponentLibrary: "ACGenerator",
    isDerivedComponentLibrary: true,
    isContainerComponentLibrary: undefined
  });
  expect(derivedSection?.fields.map((field) => field.exportName)).toEqual([
    "idx",
    "idx_acgenerator",
    "installed_capacity"
  ]);
});

test("parses a hand-written section with attributes", () => {
  const text = `<customDcGen 中文名="直流电源" 类别库="直流设备">
@    v_out      i_out
//   输出电压   输出电流
</customDcGen>`;
  const sections = parseEDeviceDefinitionFile(text);
  expect(sections).toHaveLength(1);
  expect(sections[0].kind).toBe("customDcGen");
  expect(sections[0].label).toBe("直流电源");
  expect(sections[0].fields).toEqual([
    { exportName: "v_out", cnName: "输出电压" },
    { exportName: "i_out", cnName: "输出电流" }
  ]);
});

test("exports hydrogen, heat, and cross-energy devices to E sections and reports unsupported devices", () => {
  const electrolyzer = assignPermanentDeviceIndex(createDefaultNode("ac-electrolyzer", { x: 100, y: 100 }), {}).node;
  const hydrogenPipe = assignPermanentDeviceIndex(createDefaultNode("hydrogen-pipeline", { x: 240, y: 100 }), {}).node;
  const hydrogenTank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank", { x: 380, y: 100 }), {}).node;
  const horizontalHydrogenTank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank-horizontal", { x: 520, y: 100 }), {}).node;
  const containerHydrogenTank = assignPermanentDeviceIndex(createDefaultNode("hydrogen-tank-container", { x: 660, y: 100 }), {}).node;
  hydrogenTank.params.water_volume = "10";
  horizontalHydrogenTank.params.water_volume = "50";
  containerHydrogenTank.params.water_volume = "80";
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
  expect(E_SECTION_COLUMNS.HydroStorage).toEqual([
    "idx",
    "name",
    "node",
    "control_type",
    "pressure_set",
    "flow_set",
    "alpha",
    "flow_min",
    "flow_max",
    "run_stat",
    "pressure",
    "rated_capacity",
    "water_volume",
    "initial_soc",
    "soc",
    "soc_upper_limit",
    "soc_lower_limit",
    "pressure_max",
    "pressure_min"
  ]);
  expect(E_SECTION_COLUMNS.HeatStorage).toEqual([
    "idx", "name", "node", "capacity", "temperature", "soc", "soc_upper_limit", "soc_lower_limit", "run_stat"
  ]);
  expect(exported.AcE2Hydro.rows).toHaveLength(1);
  expect(exported.ACLoad.rows).toHaveLength(1);
  expect(exported.HydroSource.rows).toHaveLength(1);
  expect(exported.HydroPipe.rows).toHaveLength(1);
  expect(exported.HydroStorage.rows).toHaveLength(3);
  for (const row of exported.HydroStorage.rows) {
    expect(row).toMatchObject({
      control_type: "PRESSURE",
      pressure_set: "1",
      flow_set: "0",
      alpha: "1",
      flow_min: "-10",
      flow_max: "10",
      pressure: "1",
      rated_capacity: "1000",
      initial_soc: "0.5",
      soc: "0.5",
      soc_upper_limit: "0.9",
      soc_lower_limit: "0.1",
      pressure_max: "45",
      pressure_min: "0.1"
    });
  }
  expect(exported.HydroStorage.rows.map((row) => row.water_volume)).toEqual(["10", "50", "80"]);
  expect(exported.HeatStorage.rows).toHaveLength(1);
  expect(exported.HeatStorage.rows[0]).toMatchObject({
    capacity: "100",
    temperature: "90",
    soc: "0.5",
    soc_upper_limit: "0.9",
    soc_lower_limit: "0.1"
  });
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
      reason: "类没有对应的 E 文件段定义。"
    })
  ]);
});

test("migrates legacy gas quantity parameter names without overriding the canonical value", () => {
  expect(toSnakeCaseDeviceParamName("gasQuantity")).toBe("gas_quantity");
  expect(toSnakeCaseDeviceParamName("gasquantity")).toBe("gas_quantity");

  const createLegacyTank = (id: string, params: Record<string, string>) => {
    const tank = createDefaultNode("hydrogen-tank", { x: 100, y: 100 });
    tank.id = id;
    delete tank.params.gas_quantity;
    Object.assign(tank.params, params);
    return tank;
  };
  const camel = createLegacyTank("tank-camel", {
    gasQuantity: "21",
    [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify([{
      cnName: "储气量",
      enName: "gasQuantity",
      valueType: "float",
      typicalValue: "0",
      exportEnabled: true,
      exportName: "gasQuantity"
    }])
  });
  const lower = createLegacyTank("tank-lower", { gasquantity: "22" });
  const canonical = createLegacyTank("tank-canonical", {
    gas_quantity: "23",
    gasQuantity: "24",
    gasquantity: "25"
  });

  const loaded = deserializeProject(JSON.stringify({
    version: 1,
    name: "储气量字段迁移",
    nodes: [camel, lower, canonical],
    edges: []
  }));

  expect(loaded.nodes[0].params.gas_quantity).toBe("21");
  expect(loaded.nodes[1].params.gas_quantity).toBe("22");
  expect(loaded.nodes[2].params.gas_quantity).toBe("23");
  for (const node of loaded.nodes) {
    expect(node.params).not.toHaveProperty("gasQuantity");
    expect(node.params).not.toHaveProperty("gasquantity");
  }
  expect(JSON.parse(loaded.nodes[0].params[CUSTOM_PARAM_DEFINITIONS_KEY])).toEqual([
    expect.objectContaining({ enName: "gas_quantity", exportName: "gas_quantity" })
  ]);
  expect(getEParamValue("gas_quantity", lower)).toBe("22");
});

test("exports electric-hydrogen controls, directional coefficients, and associated setpoints", () => {
  const expected = [
    ["ac-electrolyzer", "AcE2Hydro", "FLOW", "e2h_coeff", "0.2", "ACLoad", "ac_load_t1", "HydroSource", "h2_unit_t2"],
    ["dc-electrolyzer", "DcE2Hydro", "FLOW", "e2h_coeff", "0.2", "DCLoad", "dc_load_t1", "HydroSource", "h2_unit_t2"],
    ["ac-fuel-cell", "Hydro2AcE", "P", "h2e_coeff", "1.5", "ACGenerator", "ac_unit_t1", "HydroLoad", "h2_load_t2"],
    ["dc-fuel-cell", "Hydro2DcE", "P", "h2e_coeff", "1.5", "DCGenerator", "dc_unit_t1", "HydroLoad", "h2_load_t2"]
  ] as const;

  for (const [kind, couplingSection, controlType, coefficientKey, coefficientValue, electricSection, electricRelation, hydrogenSection, hydrogenRelation] of expected) {
    const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
    node.params[`p_set_${electricRelation}`] = "2.5";
    node.params[`flow_set_${hydrogenRelation}`] = "300";

    const exported = parseESections(buildEDeviceParameterFile({
      version: 1,
      name: `${kind}-控制参数导出`,
      nodes: [node],
      edges: []
    }));
    const couplingRow = exported[couplingSection].rows[0];

    expect(exported[couplingSection].columns, couplingSection).toEqual([
      "idx", "name", "parent", ...E_SECTION_COLUMNS[couplingSection].slice(2)
    ]);
    expect(couplingRow, couplingSection).toMatchObject({
      control_type: controlType,
      [coefficientKey]: coefficientValue
    });
    expect(couplingRow, couplingSection).not.toHaveProperty("efficiency");
    expect(couplingRow, couplingSection).not.toHaveProperty("p_set");
    expect(couplingRow, couplingSection).not.toHaveProperty("flow_set");
    expect(exported[electricSection].rows[0].p_set, electricSection).toBe("2.5");
    expect(exported[hydrogenSection].rows[0].flow_set, hydrogenSection).toBe("300");
  }
});

test("preserves explicit P and FLOW controls for every electric-hydrogen coupling section", () => {
  const cases = [
    ["ac-electrolyzer", "AcE2Hydro"],
    ["dc-electrolyzer", "DcE2Hydro"],
    ["ac-fuel-cell", "Hydro2AcE"],
    ["dc-fuel-cell", "Hydro2DcE"]
  ] as const;

  for (const [kind, section] of cases) {
    for (const controlType of ["P", "FLOW"] as const) {
      const node = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100, y: 100 }), {}).node;
      node.params.control_type = controlType;
      const project = {
        version: 1 as const,
        name: `${section}-${controlType}`,
        nodes: [node],
        edges: []
      };
      const records = buildEDeviceRecords(project);
      const record = records.find((item) => item.section === section);
      const defaultExport = parseESections(buildEDeviceParameterFile(project));
      const configuredExport = parseESections(buildEFileExport(project, ["默认方案"], {
        interfaceDefinitions: [{
          componentLibrary: section,
          exportEnabled: true,
          exportName: section,
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" },
            {
              sourceName: "control_type",
              exportEnabled: true,
              exportName: "control_type",
              definition: {
                cnName: "控制类型",
                enName: "control_type",
                valueType: "stringEnum",
                typicalValue: controlType,
                readonly: false,
                enumValues: ["P", "FLOW"],
                enumOptions: [{ value: "P" }, { value: "FLOW" }]
              }
            }
          ]
        }]
      }).text);

      expect(record?.params.control_type, `${section}:${controlType}:record`).toBe(controlType);
      expect(defaultExport[section].rows[0].control_type, `${section}:${controlType}:default`).toBe(controlType);
      expect(configuredExport[section].rows[0].control_type, `${section}:${controlType}:configured`).toBe(controlType);
    }
  }
});

test("exports hydrogen source and load fields in canonical order and defaults missing control mode to FLOW", () => {
  const source = assignPermanentDeviceIndex(createDefaultNode("hydrogen-source", { x: 100, y: 100 }), {}).node;
  const load = assignPermanentDeviceIndex(createDefaultNode("hydrogen-load", { x: 300, y: 100 }), { HydroLoad: 0 }).node;
  delete source.params.control_type;
  delete load.params.control_type;
  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "氢源荷接口字段",
    nodes: [source, load],
    edges: []
  }));
  const expectedColumns = [
    "idx", "name", "parent", "node", "rated_capacity", "control_type",
    "pressure_set", "pressure_max", "pressure_min",
    "flow_set", "flow_max", "flow_min", "run_stat"
  ];

  expect(exported.HydroSource.columns).toEqual(expectedColumns);
  expect(exported.HydroLoad.columns).toEqual(expectedColumns);
  expect(exported.HydroSource.rows[0].control_type).toBe("FLOW");
  expect(exported.HydroLoad.rows[0].control_type).toBe("FLOW");
});

test("returns E export warnings with the generated file", () => {
  const unsupported: ModelNode = {
    ...createDefaultNode("ac-load", { x: 100, y: 100 }),
    id: "unsupported-e-export-node",
    kind: "unknown-device-kind",
    name: "未支持设备",
    params: {}
  };
  const project = {
    version: 1 as const,
    name: "E 文件警告测试",
    nodes: [unsupported],
    edges: []
  };

  const standaloneWarnings = getEExportWarnings(project);
  const file = buildEFileExport(project);

  expect(file.warnings).toEqual(standaloneWarnings);
  expect(file.warnings).toEqual([
    expect.objectContaining({
      nodeId: unsupported.id,
      reason: "类没有对应的 E 文件段定义。"
    })
  ]);
});

test("exports electric heat containers to AC and DC specific E sections", () => {
  const acHeater = assignPermanentDeviceIndex(createDefaultNode("ac-heater", { x: 100, y: 100 }), {}).node;
  const dcHeater = assignPermanentDeviceIndex(createDefaultNode("dc-heater", { x: 240, y: 100 }), {}).node;
  const acTwoPortHeater = assignPermanentDeviceIndex(createDefaultNode("ac-two-port-heater", { x: 380, y: 100 }), {}).node;
  const dcTwoPortHeater = assignPermanentDeviceIndex(createDefaultNode("dc-two-port-heater", { x: 520, y: 100 }), {}).node;
  acTwoPortHeater.params.control_type = "T";
  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "电制热导出",
    nodes: [acHeater, dcHeater, acTwoPortHeater, dcTwoPortHeater],
    edges: []
  }));

  expect(exported.AcE2Heat.columns).toEqual(["idx", "name", "parent", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"]);
  expect(exported.DcE2Heat.columns).toEqual(["idx", "name", "parent", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"]);
  expect(exported.AcE2Heat2.columns).toEqual(["idx", "name", "parent", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_heat2_unit_t2"]);
  expect(exported.DcE2Heat2.columns).toEqual(["idx", "name", "parent", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_heat2_unit_t2"]);
  expect(exported.AcE2Heat.rows[0]).toMatchObject({ control_type: "P", e2h_coeff: "1.0" });
  expect(exported.DcE2Heat.rows[0]).toMatchObject({ control_type: "P", e2h_coeff: "1.0" });
  expect(exported.AcE2Heat2.rows[0]).toMatchObject({ control_type: "T", e2h_coeff: "1.0" });
  expect(exported.DcE2Heat2.rows[0]).toMatchObject({ control_type: "P", e2h_coeff: "1.0" });
  expect(exported.HeatSource.columns).toEqual(["idx", "name", "node", "supply_temperature_set", "run_stat"]);
  expect(exported.HeatSource.rows.map((row) => row.supply_temperature_set)).toEqual(["95", "95"]);
  expect(exported.HeatSource2.columns).toEqual(["idx", "name", "i_node", "j_node", "supply_temperature_set", "run_stat"]);
  expect(exported.HeatSource2.rows.map((row) => row.supply_temperature_set)).toEqual(["95", "95"]);
  expect(exported.Elec2Heat).toBeUndefined();
  expect(exported.Elec2Heat2).toBeUndefined();
  expect(exported.AcElec2Heat).toBeUndefined();
  expect(exported.DcElec2Heat).toBeUndefined();
  expect(exported.AcElec2Heat2).toBeUndefined();
  expect(exported.DcElec2Heat2).toBeUndefined();
  expect(inferESection("ac-heater", acHeater.params)).toBe("AcE2Heat");
  expect(inferESection("dc-heater", dcHeater.params)).toBe("DcE2Heat");
  expect(inferESection("ac-two-port-heater", acTwoPortHeater.params)).toBe("AcE2Heat2");
  expect(inferESection("dc-two-port-heater", dcTwoPortHeater.params)).toBe("DcE2Heat2");
});

test("returns E export warnings for invalid enum parameters instead of hiding them", () => {
  const generator = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
  generator.params.control_type = "BAD";
  const custom = createDefaultNode("static-default-node", { x: 240, y: 100 });
  custom.kind = "custom-export-enum";
  custom.params = {
    [CUSTOM_DEVICE_TEMPLATE_KEY]: "1",
    mode: "UNKNOWN",
    [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify([
      { cnName: "模式", enName: "mode", valueType: "stringEnum", typicalValue: "AUTO", enumValues: ["AUTO", "MANUAL"] }
    ])
  };
  const project: ProjectFile = { version: 1, name: "非法枚举导出", nodes: [generator, custom], edges: [] };

  expect(buildEFileExport(project).warnings).toEqual(expect.arrayContaining([
    expect.objectContaining({ nodeId: generator.id, reason: expect.stringContaining("control_type") }),
    expect.objectContaining({ nodeId: custom.id, reason: expect.stringContaining("AUTO、MANUAL") })
  ]));
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
    rated_active_power: "不要导出",
    backgroundImage: apiPath("/images/asset")
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
  expect(payload.ACLoad.columns).not.toContain("rated_active_power");
  expect(payload.ACLoad.columns).not.toContain("backgroundImage");
  expect(buildEDeviceParameterFile({
    version: 1,
    name: "E导出模型",
    nodes: [acLoad, staticText],
    edges: []
  })).not.toContain("rated_active_power");
});

test("keeps canonical transformer E fields as export defaults when metadata is absent", () => {
  const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer")!;
  const definitions = JSON.parse(transformer.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];
  const resistanceDefinition = getTemplateParameterDefinitions(template).find((definition) => definition.enName === "r");
  const rated_capacityDefinition = definitions.find((definition) => definition.enName === "rated_capacity");

  expect(resistanceDefinition).toBeTruthy();
  expect(resolveDeviceParameterDefinitionExportSettings(transformer.kind, transformer.params, resistanceDefinition!)).toEqual({
    exportEnabled: true,
    exportName: "r"
  });
  expect(resolveDeviceParameterDefinitionExportSettings(transformer.kind, transformer.params, rated_capacityDefinition!)).toEqual({
    exportEnabled: true,
    exportName: "rated_capacity"
  });
  expect(getEParameterKeys(transformer.kind, transformer.params)).toEqual([
    "idx", "name", "parent", ...E_SECTION_COLUMNS.ACTransformer.slice(2),
    "i_p",
    "i_q",
    "i_u",
    "i_i",
    "j_p",
    "j_q",
    "j_u",
    "j_i"
  ]);
});

test("removes a canonical E column when its parameter definition disables export", () => {
  const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });
  const definitions = JSON.parse(transformer.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];
  transformer.params.r = "0.125";
  transformer.params[CUSTOM_PARAM_DEFINITIONS_KEY] = JSON.stringify([
    ...definitions,
    { cnName: "电阻（标幺值）", enName: "r", valueType: "float", typicalValue: "0.0", exportEnabled: false, exportName: "r" }
  ]);

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "禁用导出测试",
    nodes: [transformer],
    edges: []
  }));

  expect(getEParameterKeys(transformer.kind, transformer.params)).not.toContain("r");
  expect(payload.ACTransformer.columns).not.toContain("r");
});

test("uses a configured E export name while reading the canonical transformer value", () => {
  const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });
  const definitions = JSON.parse(transformer.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];
  transformer.params.r = "0.125";
  transformer.params[CUSTOM_PARAM_DEFINITIONS_KEY] = JSON.stringify([
    ...definitions,
    { cnName: "电阻（标幺值）", enName: "r", valueType: "float", typicalValue: "0.0", exportEnabled: true, exportName: "resistance" }
  ]);

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "导出改名测试",
    nodes: [transformer],
    edges: []
  }));

  expect(getEParameterKeys(transformer.kind, transformer.params)).toContain("resistance");
  expect(getEParameterKeys(transformer.kind, transformer.params)).not.toContain("r");
  expect(payload.ACTransformer.columns).toContain("resistance");
  expect(payload.ACTransformer.columns).not.toContain("r");
  expect(payload.ACTransformer.rows[0].resistance).toBe("0.125");
});

test("uses the current E interface definition instead of stale node export metadata", () => {
  const generator = createDefaultNode("ac-source", { x: 100, y: 100 });
  generator.name = "generator_1";
  generator.params = {
    ...generator.params,
    idx: "5",
    p_set: "8.5",
    q_set: "12.5",
    [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(
      (JSON.parse(generator.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[])
        .filter((definition) => definition.enName !== "dev_type")
        .map((definition) => definition.enName === "q_set"
          ? { ...definition, exportEnabled: false, exportName: "old_reactive_power" }
          : definition)
    )
  };
  const project: ProjectFile = {
    version: 1,
    name: "接口定义导出测试",
    nodes: [generator],
    edges: []
  };
  const interfaceDefinitions = [{
    componentLibrary: "ACGenerator",
    exportEnabled: true,
    exportName: "GeneratorTable",
    fields: [
      { sourceName: "idx", exportEnabled: true, exportName: "idx" },
      { sourceName: "name", exportEnabled: true, exportName: "name" },
      { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" },
      { sourceName: "p_set", exportEnabled: false, exportName: "p_set" },
      { sourceName: "q_set", exportEnabled: true, exportName: "reactive_power" }
    ]
  }];

  const payload = parseESections(buildEFileExport(project, ["默认方案"], { interfaceDefinitions }).text);

  expect(payload.ACGenerator).toBeUndefined();
  expect(payload.GeneratorTable.columns).toEqual(["idx", "name", "dev_type", "reactive_power"]);
  expect(payload.GeneratorTable.rows[0]).toMatchObject({
    idx: "5",
    name: "generator_1",
    dev_type: "ACGenerator",
    reactive_power: "12.5"
  });
  expect(payload.GeneratorTable.columns).not.toContain("p_set");
  expect(payload.GeneratorTable.columns).not.toContain("old_reactive_power");
});

test("honors an E interface class export switch without reporting an intentional omission", () => {
  const generator = createDefaultNode("ac-source", { x: 100, y: 100 });
  const project: ProjectFile = {
    version: 1,
    name: "接口类开关测试",
    nodes: [generator],
    edges: []
  };
  const exportOptions = {
    interfaceDefinitions: [{
      componentLibrary: "ACGenerator",
      exportEnabled: false,
      exportName: "ACGenerator",
      fields: []
    }]
  };

  expect(buildEFileExport(project, ["默认方案"], exportOptions).text).not.toContain("<ACGenerator>");
  expect(getEExportWarnings(project, exportOptions)).toEqual([]);
});

test("keeps old custom parameters exported while new explicitly disabled parameters stay internal", () => {
  const template = {
    kind: "custom-export-control",
    label: "自定义导出控制",
    categoryLibrary: "交流设备",
    size: { width: 104, height: 64 },
    params: { component_type: "CustomExportControl" },
    terminalType: "ac" as const,
    terminalCount: 1,
    custom: true,
    parameterDefinitions: [
      { cnName: "旧参数", enName: "legacyValue", valueType: "string" as const, typicalValue: "legacy" },
      { cnName: "内部参数", enName: "internalValue", valueType: "string" as const, typicalValue: "internal", exportEnabled: false, exportName: "" },
      { cnName: "外部参数", enName: "externalValue", valueType: "string" as const, typicalValue: "external", exportEnabled: true, exportName: "external_value" }
    ]
  };
  const node = createNodeFromTemplate(template, { x: 100, y: 100 });

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "自定义导出测试",
    nodes: [node],
    edges: []
  }));

  expect(getEParameterKeys(node.kind, node.params)).toEqual(["parent", "legacyValue", "external_value"]);
  expect(payload.CustomExportControl.columns).toEqual(["parent", "legacyValue", "external_value"]);
  expect(payload.CustomExportControl.rows[0]).toMatchObject({
    legacyValue: "legacy",
    external_value: "external"
  });
  expect(payload.CustomExportControl.columns).not.toContain("internalValue");
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
    parent: "0",
    node: "1",
    rated_voltage: "380",
    v_max: "1.1",
    v_min: "0.9",
    run_stat: "1",
    u: "0",
    f: "0"
  });
  expect(dcRealBus).toEqual({
    idx: "1",
    name: "dc_bus",
    parent: "0",
    node: "1",
    rated_voltage: "720",
    v_max: "1.1",
    v_min: "0.9",
    run_stat: "1",
    u: "0",
    i: "0"
  });
});

test("marks ACNode and DCNode records backed by real bus devices", () => {
  const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
  const acBusLoad = createDefaultNode("ac-load", { x: 100, y: 220 });
  const acPlainLoad = createDefaultNode("ac-load", { x: 320, y: 220 });
  const dcBus = createDefaultNode("dc-bus", { x: 540, y: 100 });
  const dcBusLoad = createDefaultNode("dc-load", { x: 540, y: 220 });
  const dcPlainLoad = createDefaultNode("dc-load", { x: 760, y: 220 });
  acBus.name = "ac_real_bus";
  acBusLoad.name = "ac_bus_load";
  acPlainLoad.name = "ac_plain_node";
  dcBus.name = "dc_real_bus";
  dcBusLoad.name = "dc_bus_load";
  dcPlainLoad.name = "dc_plain_node";

  const nodeInterface = (componentLibrary: "ACNode" | "DCNode") => ({
    componentLibrary,
    exportEnabled: true,
    exportName: componentLibrary,
    fields: [
      { sourceName: "idx", exportEnabled: true, exportName: "idx" },
      { sourceName: "name", exportEnabled: true, exportName: "name" },
      { sourceName: "realbs", exportEnabled: true, exportName: "realbs" }
    ]
  });
  const records = buildEDeviceRecords({
    version: 1,
    name: "真实母线节点标识",
    nodes: [acBus, acBusLoad, acPlainLoad, dcBus, dcBusLoad, dcPlainLoad],
    edges: [
      { id: "ac-bus-load", sourceId: acBus.id, targetId: acBusLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "dc-bus-load", sourceId: dcBus.id, targetId: dcBusLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ]
  }, {
    interfaceDefinitions: [nodeInterface("ACNode"), nodeInterface("DCNode")]
  });
  const acNodes = records.filter((record) => record.section === "ACNode" && record.kind === "ac-node");
  const dcNodes = records.filter((record) => record.section === "DCNode" && record.kind === "dc-node");

  expect(acNodes.find((record) => record.params.name === "ac_real_bus")?.params.realbs).toBe("1");
  expect(acNodes.find((record) => record.params.name === "ac_plain_node")?.params.realbs).toBe("0");
  expect(dcNodes.find((record) => record.params.name === "dc_real_bus")?.params.realbs).toBe("1");
  expect(dcNodes.find((record) => record.params.name === "dc_plain_node")?.params.realbs).toBe("0");
});

test("exports a three-winding transformer as one independent device with three-side parameters", () => {
  const highBus = createDefaultNode("ac-bus", { x: 80, y: 80 });
  const mediumBus = createDefaultNode("ac-bus", { x: 80, y: 260 });
  const lowBus = createDefaultNode("ac-bus", { x: 80, y: 440 });
  const transformer = assignPermanentDeviceIndex(createDefaultNode("ac-three-winding-transformer", { x: 460, y: 260 }), {}).node;
  transformer.name = "T3";
  expect(transformer.params.is_container).toBeUndefined();
  expect(transformer.params.idx_xf_t1).toBeUndefined();
  expect(transformer.params.idx_xf_t2).toBeUndefined();
  expect(transformer.params.idx_xf_t3).toBeUndefined();
  transformer.terminals[0].vbase = "220 kV";
  transformer.terminals[1].vbase = "110 kV";
  transformer.terminals[2].vbase = "10 kV";
  transformer.params = {
    ...transformer.params,
    i_r: "0.01",
    i_x: "0.11",
    i_gt: "0.001",
    i_bt: "0.002",
    i_tap: "1.01",
    i_shift: "1",
    k_r: "0.02",
    k_x: "0.12",
    k_gt: "0.003",
    k_bt: "0.004",
    k_tap: "1.02",
    k_shift: "2",
    j_r: "0.03",
    j_x: "0.13",
    j_gt: "0.005",
    j_bt: "0.006",
    j_tap: "1.03",
    j_shift: "3",
    i_p: "11",
    i_q: "12",
    i_u: "13",
    i_i: "14",
    k_p: "21",
    k_q: "22",
    k_u: "23",
    k_i: "24",
    j_p: "31",
    j_q: "32",
    j_u: "33",
    j_i: "34"
  };
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
  const acTransfomer3 = payload.ACTransfomer3.rows.find((row) => row.name === "T3");

  expect(acNodes.map((row) => row.idx)).toEqual(["1", "2", "3"]);
  expect(acNodes.some((row) => row.name === "T3_neutral")).toBe(false);
  expect(payload.ACTransformer).toBeUndefined();
  expect(payload.ACTransfomer3.columns).toEqual([
    "idx",
    "name",
    "parent",
    "i_node",
    "k_node",
    "j_node",
    "neutral_node",
    "i_rated_capacity",
    "i_i_max",
    "k_rated_capacity",
    "k_i_max",
    "j_rated_capacity",
    "j_i_max",
    "i_r",
    "i_x",
    "i_gt",
    "i_bt",
    "i_tap",
    "i_shift",
    "k_r",
    "k_x",
    "k_gt",
    "k_bt",
    "k_tap",
    "k_shift",
    "j_r",
    "j_x",
    "j_gt",
    "j_bt",
    "j_tap",
    "j_shift",
    "run_stat",
    "i_p",
    "i_q",
    "i_u",
    "i_i",
    "k_p",
    "k_q",
    "k_u",
    "k_i",
    "j_p",
    "j_q",
    "j_u",
    "j_i"
  ]);
  expect(acTransfomer3).toEqual({
    idx: "1",
    name: "T3",
    parent: "0",
    i_node: "1",
    k_node: "2",
    j_node: "3",
    neutral_node: "0",
    i_rated_capacity: "90",
    i_i_max: "0",
    k_rated_capacity: "90",
    k_i_max: "0",
    j_rated_capacity: "90",
    j_i_max: "0",
    i_r: "0.01",
    i_x: "0.11",
    i_gt: "0.001",
    i_bt: "0.002",
    i_tap: "1.01",
    i_shift: "1",
    k_r: "0.02",
    k_x: "0.12",
    k_gt: "0.003",
    k_bt: "0.004",
    k_tap: "1.02",
    k_shift: "2",
    j_r: "0.03",
    j_x: "0.13",
    j_gt: "0.005",
    j_bt: "0.006",
    j_tap: "1.03",
    j_shift: "3",
    run_stat: "1",
    i_p: "11",
    i_q: "12",
    i_u: "13",
    i_i: "14",
    k_p: "21",
    k_q: "22",
    k_u: "23",
    k_i: "24",
    j_p: "31",
    j_q: "32",
    j_u: "33",
    j_i: "34"
  });

  const windingFieldNames = ["idx", "name", "itrfm", "rij", "xij", "gti", "bti", "tap", "ind", "znd"];
  const windingRecords = buildEDeviceRecords({
    version: 1,
    name: "三绕组主变绕组导出",
    nodes: [highBus, mediumBus, lowBus, transformer],
    edges
  }, {
    interfaceDefinitions: [{
      componentLibrary: "ACTransWinding",
      exportEnabled: true,
      exportName: "transformerwinding",
      fields: windingFieldNames.map((fieldName) => ({
        sourceName: fieldName,
        exportEnabled: true,
        exportName: fieldName
      }))
    }]
  }).filter((record) => record.section === "ACTransWinding");

  expect(windingRecords.map((record) => record.params)).toEqual([
    expect.objectContaining({ name: "T3_高", itrfm: "1", rij: "0.01", xij: "0.11", gti: "0.001", bti: "0.002", tap: "1.01", ind: "1" }),
    expect.objectContaining({ name: "T3_中", itrfm: "1", rij: "0.02", xij: "0.12", gti: "0.003", bti: "0.004", tap: "1.02", ind: "2" }),
    expect.objectContaining({ name: "T3_低", itrfm: "1", rij: "0.03", xij: "0.13", gti: "0.005", bti: "0.006", tap: "1.03", ind: "3" })
  ]);
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

test("defines AC and DC generator operating limits as inherited float defaults and exports them to E", () => {
  const acTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
  const dcTemplate = DEVICE_LIBRARY.find((item) => item.kind === "dc-source")!;
  const acDefinitions = new Map(getTemplateParameterDefinitions(acTemplate).map((definition) => [definition.enName, definition]));
  const dcDefinitions = new Map(getTemplateParameterDefinitions(dcTemplate).map((definition) => [definition.enName, definition]));

  expect(E_SECTION_COLUMNS.ACGenerator).toEqual([
    "idx",
    "name",
    "node",
    "rated_capacity",
    "rated_voltage",
    "control_type",
    "p_set",
    "p_max",
    "p_min",
    "q_set",
    "q_max",
    "q_min",
    "v_set",
    "v_max",
    "v_min",
    "alpha",
    "regable",
    "run_stat"
  ]);
  expect(E_SECTION_COLUMNS.DCGenerator).toEqual([
    "idx",
    "name",
    "node",
    "rated_capacity",
    "rated_voltage",
    "control_type",
    "v_set",
    "p_set",
    "p_max",
    "p_min",
    "i_set",
    "v_max",
    "v_min",
    "run_stat"
  ]);

  for (const [name, cnName] of [
    ["p_max", "有功上限"],
    ["p_min", "有功下限"],
    ["q_max", "无功上限"],
    ["q_min", "无功下限"]
  ] as const) {
    expect(acDefinitions.get(name), name).toMatchObject({
      cnName,
      valueType: "float",
      typicalValue: "0",
      readonly: false
    });
  }
  for (const [name, cnName] of [
    ["p_max", "有功上限"],
    ["p_min", "有功下限"]
  ] as const) {
    expect(dcDefinitions.get(name), name).toMatchObject({
      cnName,
      valueType: "float",
      typicalValue: "0",
      readonly: false
    });
  }
  expect(dcDefinitions.has("q_max")).toBe(false);
  expect(dcDefinitions.has("q_min")).toBe(false);

  const acSource = assignPermanentDeviceIndex(createDefaultNode("ac-source", { x: 100, y: 100 }), {}).node;
  const dcSource = assignPermanentDeviceIndex(createDefaultNode("dc-source", { x: 240, y: 100 }), {}).node;
  const acWind = createDefaultNode("ac-wind-source", { x: 380, y: 100 });
  const dcWind = createDefaultNode("dc-wind-source", { x: 520, y: 100 });
  expect(acSource.params).toMatchObject({ p_max: "0", p_min: "0", q_max: "0", q_min: "0" });
  expect(dcSource.params).toMatchObject({ p_max: "0", p_min: "0" });
  expect(acWind.params).toMatchObject({ p_max: "0", p_min: "0", q_max: "0", q_min: "0" });
  expect(dcWind.params).toMatchObject({ p_max: "0", p_min: "0" });
  expect(dcSource.params).not.toHaveProperty("q_max");
  expect(dcSource.params).not.toHaveProperty("q_min");
  expect(dcWind.params).not.toHaveProperty("q_max");
  expect(dcWind.params).not.toHaveProperty("q_min");

  Object.assign(acSource.params, { p_max: "12.5", p_min: "-1.5", q_max: "6.25", q_min: "-4.75" });
  Object.assign(dcSource.params, { p_max: "8.5", p_min: "-2.5" });
  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "电源出力上下限导出测试",
    nodes: [acSource, dcSource],
    edges: []
  }));

  expect(payload.ACGenerator.rows[0]).toMatchObject({
    p_max: "12.5",
    p_min: "-1.5",
    q_max: "6.25",
    q_min: "-4.75"
  });
  expect(payload.DCGenerator.rows[0]).toMatchObject({
    p_max: "8.5",
    p_min: "-2.5"
  });
});

test("exports electric generation derived devices as base records plus derived records with only relation and family fields", () => {
  const indexed = assignPermanentDeviceIndex(createDefaultNode("ac-wind-source", { x: 100, y: 100 }), {}).node;
  indexed.name = "风电场A";
  indexed.params.wind_turbine_model = "WT-8MW";
  indexed.params.cut_in_wind_speed = "3.5mps";

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "派生类电源导出测试",
    nodes: [indexed],
    edges: []
  }));

  expect(payload.ACGenerator.rows).toHaveLength(1);
  expect(payload.ACGenerator.rows[0]).toMatchObject({
    idx: indexed.params.idx,
    name: "风电场A",
    node: "1",
    control_type: "PV",
    run_stat: "1"
  });
  expect(payload.ACWindGen.columns).toEqual(expect.arrayContaining([
    "idx",
    "idx_acgenerator",
    "wind_turbine_model",
    "cut_in_wind_speed"
  ]));
  expect(payload.ACWindGen.rows).toEqual([
    expect.objectContaining({
      idx: indexed.params.idx,
      idx_acgenerator: indexed.params.idx,
      wind_turbine_model: "WT-8MW",
      cut_in_wind_speed: "3.5mps"
    })
  ]);
  expect(payload.ACWindGen.columns).not.toContain("name");
  expect(payload.ACWindGen.columns).not.toContain("node");
  expect(payload.ACWindGen.columns).not.toContain("control_type");
  expect(payload.ACWindGen.columns).not.toContain("run_stat");
  expect(payload.ACWindGen.columns).not.toContain("rated_power");
  expect(payload.ACWindGen.columns).not.toContain("rated_voltage");
  expect(payload.ACWindGen.columns).not.toContain("source_type");
});

test("exports storage SOC limits through the derived E interface", () => {
  const indexed = assignPermanentDeviceIndex(createDefaultNode("ac-storage", { x: 100, y: 100 }), {}).node;
  indexed.params.soc_upper_limit = "0.95";
  indexed.params.soc_lower_limit = "0.15";

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "储能SOC导出测试",
    nodes: [indexed],
    edges: []
  }));

  expect(payload.ACStorageGen.columns).toEqual(expect.arrayContaining([
    "idx",
    "idx_acgenerator",
    "soc_upper_limit",
    "soc_lower_limit"
  ]));
  expect(payload.ACStorageGen.rows).toEqual([
    expect.objectContaining({
      idx: indexed.params.idx,
      idx_acgenerator: indexed.params.idx,
      soc_upper_limit: "0.95",
      soc_lower_limit: "0.15"
    })
  ]);
});

test("includes rated voltage in bus, load, branch, zero-branch, switch and breaker E sections", () => {
  for (const section of [
    "ACRealBs",
    "DCRealBs",
    "ACLoad",
    "DCLoad",
    "ACBranch",
    "DCBranch",
    "ACZeroBranch",
    "DCZeroBranch",
    "ACSwitch",
    "DCSwitch",
    "ACBreak",
    "DCBreak"
  ] as const) {
    expect(E_SECTION_COLUMNS[section], section).toContain("rated_voltage");
    expect(E_SECTION_COLUMNS[section].filter((column) => column === "rated_voltage"), section).toHaveLength(1);
  }
});

test("ignores historical parent and dev_type fields in configured derived records", () => {
  const feederSource = createDefaultNode("ac-feeder-source", { x: 100, y: 100 });
  feederSource.params.idx = "7";
  feederSource.params.model_id = "21";
  const payload = parseESections(buildEFileExport({
    version: 1,
    name: "派生类历史接口字段过滤测试",
    nodes: [feederSource],
    edges: []
  }, ["默认方案"], {
    interfaceDefinitions: [
      {
        componentLibrary: "ACGenerator",
        exportEnabled: true,
        exportName: "ACGenerator",
        fields: [
          { sourceName: "idx", exportEnabled: true, exportName: "idx" },
          { sourceName: "name", exportEnabled: true, exportName: "name" },
          { sourceName: "parent", exportEnabled: true, exportName: "parent" },
          { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
        ]
      },
      {
        componentLibrary: "ACFeederGen",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        exportEnabled: true,
        exportName: "ACFeederGen",
        fields: [
          { sourceName: "idx", exportEnabled: true, exportName: "idx" },
          { sourceName: "parent", exportEnabled: true, exportName: "parent" },
          { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" },
          { sourceName: "idx_acgenerator", exportEnabled: true, exportName: "idx_acgenerator" },
          { sourceName: "model_id", exportEnabled: true, exportName: "model_id" }
        ]
      }
    ]
  }).text);

  expect(payload.ACGenerator.columns).toEqual(["idx", "name", "parent", "dev_type"]);
  expect(payload.ACFeederGen.columns).toEqual(["idx", "idx_acgenerator", "model_id"]);
  expect(payload.ACFeederGen.rows[0]).toMatchObject({
    idx: "1",
    idx_acgenerator: "7",
    model_id: "21"
  });
});

test("exports legacy container-polluted electric generation derived nodes without container warnings or duplicate associated records", () => {
  const wind = assignPermanentDeviceIndex(createDefaultNode("ac-wind-source", { x: 100, y: 100 }), {}).node;
  wind.name = "交流风电-1";
  wind.params = {
    ...wind.params,
    is_container: "1",
    idx_ac_unit_t1: "999",
    wind_turbine_model: "WT-8MW"
  };
  const project: ProjectFile = {
    version: 1,
    name: "旧容器污染派生电源导出测试",
    nodes: [wind],
    edges: []
  };

  const payload = parseESections(buildEDeviceParameterFile(project));

  expect(getEExportWarnings(project)).toEqual([]);
  expect(payload.ACGenerator.rows).toHaveLength(1);
  expect(payload.ACGenerator.rows[0].idx).toBe(wind.params.idx);
  expect(payload.ACWindGen.columns).toEqual(expect.arrayContaining(["idx", "idx_acgenerator", "wind_turbine_model"]));
  expect(payload.ACWindGen.columns).not.toContain("idx_ac_unit_t1");
  expect(payload.ACWindGen.rows).toEqual([
    expect.objectContaining({
      idx: "1",
      idx_acgenerator: wind.params.idx,
      wind_turbine_model: "WT-8MW"
    })
  ]);
});

test("numbers derived component rows independently from base component indexes and per derived section", () => {
  const nuclearOne = createDefaultNode("ac-nuclear-source", { x: 100, y: 100 });
  nuclearOne.params.idx = "28";
  nuclearOne.params.nuclear_unit_model = "1000MW";
  const nuclearTwo = createDefaultNode("ac-nuclear-source", { x: 200, y: 100 });
  nuclearTwo.params.idx = "32";
  nuclearTwo.params.nuclear_unit_model = "1000MW";
  const wind = createDefaultNode("ac-wind-source", { x: 300, y: 100 });
  wind.params.idx = "30";
  wind.params.wind_turbine_model = "WT-5MW";
  const pv = createDefaultNode("ac-pv-source", { x: 400, y: 100 });
  pv.params.idx = "31";
  pv.params.pv_module_model = "Mono-550W";

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "派生类独立编号测试",
    nodes: [nuclearOne, nuclearTwo, wind, pv],
    edges: []
  }));

  expect(payload.ACNuclearGen.rows.map((row) => row.idx)).toEqual(["1", "2"]);
  expect(payload.ACNuclearGen.rows.map((row) => row.idx_acgenerator)).toEqual(["28", "32"]);
  expect(payload.ACWindGen.rows.map((row) => row.idx)).toEqual(["1"]);
  expect(payload.ACWindGen.rows.map((row) => row.idx_acgenerator)).toEqual(["30"]);
  expect(payload.ACPVGen.rows.map((row) => row.idx)).toEqual(["1"]);
  expect(payload.ACPVGen.rows.map((row) => row.idx_acgenerator)).toEqual(["31"]);
});

test("uses the exact Chinese parameter labels for electric generation definitions", () => {
  const familyPairs = {
    wind: [
      { cnName: "风机型号", enName: "wind_turbine_model" },
      { cnName: "叶轮直径", enName: "rotor_diameter" }
    ],
    pv: [
      { cnName: "光伏组件型号", enName: "pv_module_model" },
      { cnName: "MPPT 路数", enName: "mppt_count" },
      { cnName: "参考辐照度", enName: "reference_irradiance" },
      { cnName: "参考温度", enName: "reference_temperature" },
      { cnName: "温度系数", enName: "temperature_coefficient" }
    ],
    thermal: [],
    diesel: [
      { cnName: "柴油机组型号", enName: "diesel_unit_model" },
      { cnName: "单位油耗", enName: "specific_fuel_consumption" }
    ],
    hydro: [],
    nuclear: [],
    storage: [
      { cnName: "储能技术类型", enName: "storage_technology" },
      { cnName: "储能容量", enName: "energy_capacity" },
      { cnName: "荷电状态（SOC）", enName: "soc" },
      { cnName: "SOC上限", enName: "soc_upper_limit" },
      { cnName: "SOC下限", enName: "soc_lower_limit" }
    ]
  } as const;

  for (const expected of electricGenerationCases) {
    const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind)!;
    const pairs = getTemplateParameterDefinitions(template).map(({ cnName, enName }) => ({ cnName, enName }));
    expect(pairs).toEqual(expect.arrayContaining([
      { cnName: "设备状态", enName: "status" },
      ...familyPairs[expected.family]
    ]));
  }
});

test("reconciles existing device params when template definitions change", () => {
  const originalTemplate: DeviceTemplate = {
    kind: "custom-DefinitionSyncUnit",
    label: "DefinitionSyncUnit",
    categoryLibrary: "自定义类别库",
    size: { width: 104, height: 64 },
    params: { component_type: "DefinitionSyncUnit", fillColor: "transparent", strokeColor: "transparent", line_width: "0" },
    terminalType: "ac",
    terminalCount: 1,
    custom: true,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "运行状态", enName: "status", valueType: "enum", typicalValue: "1", readonly: true },
      { cnName: "投运状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
      { cnName: "旧参数", enName: "old_param", valueType: "string", typicalValue: "old-default" }
    ]
  };
  const updatedTemplate: DeviceTemplate = {
    ...originalTemplate,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "运行状态", enName: "status", valueType: "enum", typicalValue: "1", readonly: true },
      { cnName: "投运状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
      { cnName: "新参数", enName: "new_param", valueType: "float", typicalValue: "12.5" }
    ]
  };
  const node = createNodeFromTemplate(originalTemplate, { x: 100, y: 120 });
  const editedNode: ModelNode = {
    ...node,
    name: "用户命名",
    params: {
      ...node.params,
      old_param: "user-old",
      status: "0",
      run_stat: "停运",
      _labelText: "保留标签",
      free_note: "非定义参数"
    }
  };

  const reconciled = reconcileNodeParamsWithTemplateDefinitions(
    editedNode,
    updatedTemplate,
    originalTemplate.parameterDefinitions
  );

  expect(reconciled).not.toBe(editedNode);
  expect(reconciled.name).toBe("用户命名");
  expect(reconciled.params.old_param).toBeUndefined();
  expect(reconciled.params.new_param).toBe("12.5");
  expect(reconciled.params.status).toBe("0");
  expect(reconciled.params.run_stat).toBe("0");
  expect(reconciled.params._labelText).toBe("保留标签");
  expect(reconciled.params.free_note).toBe("非定义参数");
  expect(JSON.parse(reconciled.params[CUSTOM_PARAM_DEFINITIONS_KEY])).toEqual(getTemplateParameterDefinitions(updatedTemplate));
});

test("exports user-defined English device types as custom E sections", () => {
  const template: DeviceTemplate = {
    kind: "custom-CustomEnergyUnit",
    label: "CustomEnergyUnit",
    categoryLibrary: "自定义类别库",
    size: { width: 104, height: 64 },
    params: { component_type: "CustomEnergyUnit", fillColor: "transparent", strokeColor: "transparent", line_width: "0" },
    terminalType: "ac",
    terminalCount: 1,
    custom: true,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "节点", enName: "node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "工作状态", enName: "run_stat", valueType: "enum", typicalValue: "1", readonly: true },
      { cnName: "设定值", enName: "p_set", valueType: "float", typicalValue: "3.5" }
    ]
  };
  const node = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 100, y: 100 }), {}).node;
  node.name = "custom_unit_1";
  node.terminals[0].nodeNumber = "8";

  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "自定义类导出测试",
    nodes: [node],
    edges: []
  }));

  expect(exported.CustomEnergyUnit.columns).toEqual(["idx", "name", "parent", "node", "run_stat", "p_set"]);
  expect(exported.CustomEnergyUnit.rows[0]).toMatchObject({
    idx: "1",
    name: "custom_unit_1",
    node: "1",
    run_stat: "1",
    p_set: "3.5"
  });
  expect(getEExportWarnings({ version: 1, name: "自定义类导出测试", nodes: [node], edges: [] })).toEqual([]);
});

test("uses associated E section columns for every built-in container-associated device view", () => {
  for (const template of DEVICE_LIBRARY.filter((item) => item.isContainer)) {
    const node = assignPermanentDeviceIndex(createDefaultNode(template.kind, { x: 100, y: 100 }), {}).node;
    const views = buildContainerDeviceParameterViews(node, template).filter((view) => view.kind === "associated");

    expect(views.length, template.kind).toBeGreaterThan(0);
    for (const view of views) {
      expect(view.componentLibrary, `${template.kind}:${view.label}`).toBeTruthy();
      const columns = E_SECTION_COLUMNS[view.componentLibrary ?? ""];
      expect(columns, `${template.kind}:${view.label}:${view.componentLibrary}`).toBeDefined();
      expect(view.rows.map((row) => row.key), `${template.kind}:${view.label}`).toEqual(columns);
    }
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

test("preserves editable enum values in template parameter definitions", () => {
  const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-line");
  expect(baseTemplate).toBeDefined();
  const template: DeviceTemplate = {
    ...baseTemplate!,
    params: { ...baseTemplate!.params, owner: "检修班" },
    parameterDefinitions: [
      {
        cnName: "巡视单位",
        enName: "owner",
        valueType: "enum",
        typicalValue: "检修班",
        enumValues: ["运维班", "检修班", "调度班", "检修班", ""]
      }
    ]
  };

  const definitions = getTemplateParameterDefinitions(template);
  const node = createNodeFromTemplate(template, { x: 100, y: 100 });
  const storedDefinitions = JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY]) as DeviceParameterDefinition[];

  expect(definitions[0]).toMatchObject({
    enName: "owner",
    valueType: "stringEnum",
    typicalValue: "检修班",
    enumValues: ["运维班", "检修班", "调度班"]
  });
  expect(storedDefinitions[0]).toMatchObject({
    enName: "owner",
    valueType: "stringEnum",
    enumValues: ["运维班", "检修班", "调度班"]
  });
  expect(storedDefinitions[0]).not.toHaveProperty("enumValueType");
});

test("keeps status enum definitions editable when normalizing historical readonly rows", () => {
  const baseTemplate = DEVICE_LIBRARY.find((item) => item.kind === "ac-load");
  expect(baseTemplate).toBeDefined();
  const template: DeviceTemplate = {
    ...baseTemplate!,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: true },
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: true },
      { cnName: "交流节点", enName: "node", valueType: "integer", typicalValue: "", readonly: true }
    ]
  };

  const definitions = getTemplateParameterDefinitions(template);

  expect(definitions.find((definition) => definition.enName === "status")).toMatchObject({ readonly: false });
  expect(definitions.find((definition) => definition.enName === "run_stat")).toMatchObject({ readonly: false });
  expect(definitions.find((definition) => definition.enName === "idx")).toMatchObject({ readonly: true });
  expect(definitions.find((definition) => definition.enName === "name")).toMatchObject({ readonly: true });
  expect(definitions.find((definition) => definition.enName === "node")).toMatchObject({ readonly: true });
});

test("exports numeric enum codes and string enum values from custom E sections", () => {
  const template: DeviceTemplate = {
    kind: "custom-CustomEnumUnit",
    label: "CustomEnumUnit",
    categoryLibrary: "自定义类别库",
    size: { width: 104, height: 64 },
    params: { component_type: "CustomEnumUnit", fillColor: "transparent", strokeColor: "transparent", line_width: "0" },
    terminalType: "ac",
    terminalCount: 1,
    custom: true,
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "节点", enName: "node", valueType: "integer", typicalValue: "", readonly: true },
      {
        cnName: "投运状态",
        enName: "run_mode",
        valueType: "numberEnum",
        typicalValue: "1",
        enumOptions: [
          { value: "0", label: "退出" },
          { value: "1", label: "运行" }
        ]
      },
      {
        cnName: "发电机类型",
        enName: "generator_type",
        valueType: "stringEnum",
        typicalValue: "PV",
        enumOptions: [
          { value: "PV" },
          { value: "PQ" },
          { value: "PH" }
        ]
      }
    ]
  };
  const node = assignPermanentDeviceIndex(createNodeFromTemplate(template, { x: 100, y: 100 }), {}).node;
  node.name = "custom_enum_1";
  node.terminals[0].nodeNumber = "8";
  node.params.run_mode = "退出";
  node.params.generator_type = "PH";

  const storedDefinitions = JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY]) as DeviceParameterDefinition[];
  const exported = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "数字字符串枚举导出测试",
    nodes: [node],
    edges: []
  }));

  expect(storedDefinitions.find((definition) => definition.enName === "run_mode")).toMatchObject({
    valueType: "numberEnum",
    typicalValue: "1",
    enumOptions: [
      { value: "0", label: "退出" },
      { value: "1", label: "运行" }
    ],
    enumValues: ["0", "1"],
    enumValueType: "number"
  });
  expect(storedDefinitions.find((definition) => definition.enName === "generator_type")).toMatchObject({
    valueType: "stringEnum",
    typicalValue: "PV",
    enumOptions: [
      { value: "PV" },
      { value: "PQ" },
      { value: "PH" }
    ],
    enumValues: ["PV", "PQ", "PH"]
  });
  expect(storedDefinitions.find((definition) => definition.enName === "generator_type")).not.toHaveProperty("enumValueType");
  expect(exported.CustomEnumUnit.columns).toEqual(["idx", "name", "parent", "node", "run_mode", "generator_type"]);
  expect(exported.CustomEnumUnit.rows[0]).toMatchObject({
    idx: "1",
    name: "custom_enum_1",
    node: "1",
    run_mode: "0",
    generator_type: "PH"
  });
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
    p_max: "float",
    p_min: "float",
    q_set: "float",
    q_max: "float",
    q_min: "float",
    v_set: "float"
  });
  expect(definitionTypes("dc-source")).toMatchObject({
    idx: "integer",
    node: "integer",
    p_set: "float",
    p_max: "float",
    p_min: "float",
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
    i_node: "integer",
    j_node: "integer",
    r: "float",
    x: "float",
    gt: "float",
    bt: "float",
    tap: "float",
    shift: "float"
  });
  expect(definitionTypes("dcdc-converter")).toMatchObject({
    i_node: "integer",
    j_node: "integer",
    r1: "float",
    r2: "float",
    i_control_type: "stringEnum",
    j_control_type: "stringEnum"
  });
});

test("keeps every built-in device parameter aligned with its semantic type and numeric default", () => {
  const floatNames = new Set([
    "ac_i_max", "ac_p_max", "ac_p_min", "ac_q_max", "ac_q_min", "ac_v_max", "ac_v_min", "ac_voltage", "active_power", "alpha", "angle", "array_area", "b", "b_set", "bt", "bt1", "bt2", "bt3",
    "capacity", "capacity_factor", "charge_discharge_efficiency", "current", "cut_in_wind_speed", "cut_out_wind_speed", "dc_i_max", "dc_p_max", "dc_p_min", "dc_v_max", "dc_v_min", "dc_voltage",
    "design_flow", "design_head", "e2h_coeff", "efficiency", "energy_capacity", "flow", "flow_rate", "flow_set", "flow_max", "flow_min", "frequency", "fuel_tank_capacity",
    "f", "g_set", "gas_quantity", "generator_efficiency", "gt", "gt1", "gt2", "gt3", "head", "heat_demand", "heat_power", "heat_rate",
    "h2e_coeff", "high_i_max", "high_rated_capacity", "high_vbase", "hub_height", "hydrogen_demand", "hydrogen_flow", "impedance", "initial_soc", "inlet_pressure",
    "i", "i_bt", "i_dc_set", "i_gt", "i_i", "i_i_max", "i_i_set", "i_max", "i_p", "i_p_max", "i_p_min", "i_p_set", "i_q", "i_q_max", "i_q_min", "i_q_set", "i_r", "i_rated_capacity", "i_set", "i_shift", "i_tap", "i_u", "i_v_max", "i_v_min", "i_v_set", "i_vbase", "i_x", "input_voltage", "j_bt", "j_gt", "j_i", "j_i_max", "j_i_set", "j_p", "j_p_max", "j_p_min", "j_p_set", "j_q", "j_q_max", "j_q_min", "j_q_set", "j_r", "j_rated_capacity", "j_shift", "j_tap", "j_u", "j_v_max", "j_v_min", "j_v_set", "j_vbase", "j_x", "k_bt", "k_gt", "k_i", "k_i_max", "k_p", "k_q", "k_r", "k_rated_capacity", "k_shift", "k_tap", "k_u", "k_vbase", "k_x", "length", "level", "low_i_max", "low_rated_capacity", "low_vbase", "main_steam_pressure",
    "main_steam_temperature", "max_charge_power", "max_current", "max_discharge_power", "medium_i_max", "medium_rated_capacity",
    "medium_vbase", "module_efficiency", "outlet_pressure", "output_voltage", "p", "p_ac_set", "p_dc_set", "p_max", "p_min", "p_set", "pbase", "power",
    "power_factor", "pressure", "pressure_set", "pressure_max", "pressure_min", "primary_loop_pressure", "pv0", "pv1", "pv2", "q", "q_ac_set", "q_max", "q_min", "q_set", "qbase", "qv0",
    "qv1", "qv2", "r", "r1", "r2", "r3", "rated_capacity", "rated_current", "rated_power", "rated_speed",
    "rated_voltage", "rated_wind_speed", "reactive_power", "reactor_thermal_power", "reference_irradiance", "reference_temperature", "return_temperature", "rotor_diameter",
    "shift", "shift1", "shift2", "shift3", "short_circuit_capacity", "soc", "soc_lower_limit", "soc_upper_limit",
    "specific_fuel_consumption", "start_time", "supply_temperature", "supply_temperature_set", "tap", "tap_set", "tap1", "tap2", "tap3",
    "temperature", "temperature_coefficient", "thermal_efficiency", "u", "v_ac_set", "v_dc_set", "v_max", "v_min", "v_set", "vbase", "voltage", "voltage_level", "water_volume", "x",
    "x1", "x2", "x3", "x_pu"
  ]);
  const integerNames = new Set(["battery_rack_count", "idx", "isl", "mppt_count"]);
  const compensatorKinds = new Set([
    "ac-capacitor", "ac-reactor", "ac-series-capacitor", "ac-series-reactor",
    "ac-series-capacitor-vertical", "ac-series-reactor-vertical"
  ]);
  const compensatorFloatNames = new Set(["rated_reactive_power", "reactance"]);
  const stringEnumNames = new Set([
    "ac_control_type", "control_type", "dc_control_type", "fuel_type", "i_control_type", "j_control_type", "reactor_type",
    "storage_technology", "turbine_type"
  ]);
  const numberEnumNames = new Set(["parent", "regable", "run_stat", "status", "closed_status", "closed_status_set"]);
  const numericText = /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/;
  const integerText = /^[-+]?\d+$/;
  const expectedType = (name: string, kind: DeviceKind) => {
    const containerBaseName = name.replace(/_(?:ac2|dc2|h22|heat2|ac|dc|h2|heat)_(?:unit|load|transformer)_t\d+$/, "");
    if (name === "model_id" && modelAssociationModelTypeForKind(kind)) return "integer";
    if (numberEnumNames.has(containerBaseName)) return "numberEnum";
    if (stringEnumNames.has(containerBaseName)) return "stringEnum";
    if (
      integerNames.has(name) ||
      /^idx_(?:ac2|dc2|h22|heat2|ac|dc|h2|heat)_(?:unit|load|transformer)_t\d+$/.test(name) ||
      /^(?:node|node[1-4]|i_node|j_node|k_node|ac_node|dc_node|t[123]_node|neutral_node)$/.test(name)
    ) {
      return "integer";
    }
    if (floatNames.has(containerBaseName)) return "float";
    return "string";
  };

  for (const template of DEVICE_LIBRARY.filter((item) => !isStaticNode({ kind: item.kind } as any))) {
    const section = inferESection(template.kind, template.params);
    const definitions = getTemplateParameterDefinitions(template);
    for (const definition of definitions) {
      const context = `${template.label}.${definition.enName}`;
      const semanticType = compensatorKinds.has(template.kind) && compensatorFloatNames.has(definition.enName)
        ? "float"
        : expectedType(definition.enName, template.kind);
      expect(definition.valueType, context).toBe(semanticType);
      if (semanticType === "float" && definition.typicalValue !== "") {
        expect(definition.typicalValue, context).toMatch(numericText);
      }
      if (semanticType === "integer" && definition.typicalValue !== "") {
        expect(definition.typicalValue, context).toMatch(integerText);
      }
      if (semanticType === "stringEnum" || semanticType === "numberEnum") {
        const optionValues = (definition.enumOptions ?? []).map((option) => option.value);
        if (
          definition.enName === "parent" ||
          (definition.enName === "model_id" && modelAssociationModelTypeForKind(template.kind))
        ) {
          expect(optionValues, context).toEqual([]);
          expect(definition.typicalValue, context).toBe("");
        } else {
          expect(optionValues.length, context).toBeGreaterThan(0);
          expect(optionValues, context).toContain(definition.typicalValue);
        }
      }
      if (definition.enName === "regable") {
        expect(definition.valueType, context).toBe("numberEnum");
        expect(definition.enumValues, context).toEqual(["0", "1"]);
        expect(definition.typicalValue, context).toMatch(integerText);
      }
      if (definition.enName === "control_type") {
        const hydrogenCoupling = ["AcE2Hydro", "DcE2Hydro", "Hydro2AcE", "Hydro2DcE"].includes(section ?? "");
        const hydrogenEndpoint = section === "HydroSource" || section === "HydroLoad";
        const hydrogenStorage = section === "HydroStorage";
        const electricHeatCoupling = ["AcE2Heat", "DcE2Heat", "AcE2Heat2", "DcE2Heat2"].includes(section ?? "");
        const expectedOptions = hydrogenCoupling
          ? [...HYDROGEN_COUPLING_CONTROL_TYPES]
          : hydrogenStorage
            ? [...HYDROGEN_STORAGE_CONTROL_TYPES]
          : hydrogenEndpoint
            ? [...HYDROGEN_ENDPOINT_CONTROL_TYPES]
          : electricHeatCoupling
            ? [...ELECTRIC_HEAT_COUPLING_CONTROL_TYPES]
          : section === "ACGenerator"
            ? [...AC_GENERATOR_CONTROL_TYPES]
            : [...DC_GENERATOR_CONTROL_TYPES];
        expect((definition.enumOptions ?? []).map((option) => option.value), context).toEqual(expectedOptions);
        const expectedDefault = section === "ACGenerator"
          ? "PV"
          : hydrogenStorage
            ? "PRESSURE"
          : hydrogenEndpoint
            ? "FLOW"
          : section === "AcE2Hydro" || section === "DcE2Hydro"
            ? "FLOW"
            : "P";
        expect(definition.typicalValue, context).toBe(expectedDefault);
      }
    }

    const node = createNodeFromTemplate(template, { x: 100, y: 100 });
    for (const params of [template.params, node.params]) {
      for (const [rawName, rawValue] of Object.entries(params)) {
        const name = rawName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
        const isFloat = floatNames.has(name) || (compensatorKinds.has(template.kind) && compensatorFloatNames.has(name));
        if (isFloat && rawValue !== "") {
          expect(rawValue, `${template.label}.${name}`).toMatch(numericText);
        }
        if (integerNames.has(name) && rawValue !== "") {
          expect(rawValue, `${template.label}.${name}`).toMatch(integerText);
        }
      }
    }
  }
});

test("treats custom templates assigned to the StaticButton library as button-capable nodes", () => {
  const template: DeviceTemplate = {
    kind: "custom-StaticButton",
    label: "自定义按钮",
    categoryLibrary: "静态图元",
    size: { width: 128, height: 54 },
    params: {
      component_type: "StaticButton",
      fillColor: "transparent",
      strokeColor: "transparent",
      line_width: "0"
    },
    terminalType: "ac",
    terminalCount: 0,
    terminalTypes: [],
    custom: true,
    parameterDefinitions: [],
    stateDefinitions: []
  };

  const node = createNodeFromTemplate(template, { x: 240, y: 180 });

  expect(isStaticButtonCapableKind(node.kind)).toBe(true);
  expect(isStaticButtonCapableNode(node)).toBe(true);
  expect(isStaticGraphicNode(node)).toBe(true);
  expect(isStaticBoxLikeNode(node)).toBe(true);
  expect(node.params.component_type).toBe("StaticButton");
  expect(node.params.buttonEnabled).toBe("1");
  expect(node.params.buttonActionType).toBe("none");
});

test("exports DCDC converter endpoint control types with supported values", () => {
  const defaultConverter = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
  const legacyConverter = createDefaultNode("dcdc-converter", { x: 240, y: 100 });
  const legacyCombinedConverter = createDefaultNode("dcdc-converter", { x: 380, y: 100 });
  const invalidConverter = createDefaultNode("dcdc-converter", { x: 520, y: 100 });
  defaultConverter.params.i_control_type = "V";
  defaultConverter.params.j_control_type = "I";
  Object.assign(defaultConverter.params, {
    i_p_set: "1.25",
    i_i_set: "2.5",
    i_v_set: "750",
    p_set: "91",
    i_set: "92",
    v_set: "93"
  });
  legacyConverter.params.i_control_type = "";
  legacyConverter.params.j_control_type = "";
  legacyConverter.params.source_control_type = "定P";
  legacyConverter.params.target_control_type = "不定";
  delete legacyCombinedConverter.params.i_control_type;
  delete legacyCombinedConverter.params.j_control_type;
  legacyCombinedConverter.params.control_type = "V";
  invalidConverter.params.i_control_type = "BAD";
  invalidConverter.params.j_control_type = "V";

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "DCDC控制类型测试",
    nodes: [defaultConverter, legacyConverter, legacyCombinedConverter, invalidConverter],
    edges: []
  }));

  expect(payload.DCDCConverter.columns).toContain("i_control_type");
  expect(payload.DCDCConverter.columns).toContain("j_control_type");
  expect(payload.DCDCConverter.columns).not.toContain("control_type");
  expect(payload.DCDCConverter.rows[0]).toMatchObject({ p_set: "1.25", i_set: "2.5", v_set: "750" });
  expect(payload.DCDCConverter.rows.map((row) => row.i_control_type)).toEqual(["V", "P", "V", "BAD"]);
  expect(payload.DCDCConverter.rows.map((row) => row.j_control_type)).toEqual(["I", "NONE", "NONE", "V"]);
  expect(getEExportWarnings({
    version: 1,
    name: "DCDC非法控制类型",
    nodes: [invalidConverter],
    edges: []
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ nodeId: invalidConverter.id, reason: expect.stringContaining("BAD") })
  ]));
});

test("exports converter setpoint columns from canonical endpoint and side fields without legacy fallback", () => {
  const dcdc = createDefaultNode("dcdc-converter", { x: 100, y: 100 });
  dcdc.name = "DCDC端侧设定值";
  delete dcdc.params[CUSTOM_PARAM_DEFINITIONS_KEY];
  Object.assign(dcdc.params, {
    i_p_set: "1.1",
    i_i_set: "2.2",
    i_v_set: "3.3",
    p_set: "91",
    i_set: "92",
    v_set: "93"
  });

  const acac = createDefaultNode("acac-converter", { x: 260, y: 100 });
  acac.name = "ACAC端侧设定值";
  delete acac.params[CUSTOM_PARAM_DEFINITIONS_KEY];
  Object.assign(acac.params, {
    i_p_set: "4.4",
    i_q_set: "5.5",
    j_q_set: "6.6",
    i_v_set: "7.7",
    j_v_set: "8.8",
    p_set: "94",
    v_set: "95"
  });

  const dcac = createDefaultNode("dcac-converter", { x: 420, y: 100 });
  dcac.name = "DCAC分侧设定值";
  delete dcac.params[CUSTOM_PARAM_DEFINITIONS_KEY];
  Object.assign(dcac.params, {
    p_ac_set: "9.1",
    q_ac_set: "9.2",
    v_ac_set: "9.3",
    p_dc_set: "9.4",
    i_dc_set: "9.5",
    v_dc_set: "9.6",
    p_set: "96",
    i_set: "97",
    v_set: "98",
    ac_v_set: "99",
    dc_v_set: "100"
  });

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "变流器端侧设定值",
    nodes: [dcdc, acac, dcac],
    edges: []
  }));

  expect(payload.DCDCConverter.rows[0]).toMatchObject({ p_set: "1.1", i_set: "2.2", v_set: "3.3" });
  expect(payload.ACACConverter.rows[0]).toMatchObject({
    p_set: "4.4",
    i_q_set: "5.5",
    j_q_set: "6.6",
    i_v_set: "7.7",
    j_v_set: "8.8"
  });
  expect(payload.DCACConverter.rows[0]).toMatchObject({
    p_ac_set: "9.1",
    q_ac_set: "9.2",
    v_ac_set: "9.3",
    p_dc_set: "9.4",
    i_dc_set: "9.5",
    v_dc_set: "9.6"
  });
  expect(payload.DCACConverter.columns).not.toEqual(expect.arrayContaining(["p_set", "i_set", "v_set", "ac_v_set", "dc_v_set"]));
});

test("preserves an invalid AC generator control_type and reports it", () => {
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

  expect(values).toEqual(["PV", "PQ", "PH", "P"]);
  expect(getEExportWarnings({
    version: 1,
    name: "交流电源非法控制类型",
    nodes: [invalidGenerator],
    edges: []
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ nodeId: invalidGenerator.id, reason: expect.stringContaining("P") })
  ]));
});

test("preserves an invalid DC generator control_type and reports it", () => {
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

  expect(values).toEqual(["P", "V", "I", "PQ"]);
  expect(getEExportWarnings({
    version: 1,
    name: "直流电源非法控制类型",
    nodes: [invalidGenerator],
    edges: []
  })).toEqual(expect.arrayContaining([
    expect.objectContaining({ nodeId: invalidGenerator.id, reason: expect.stringContaining("PQ") })
  ]));
});

test("exports DCAC converter AC and DC control types as separate columns", () => {
  const defaultConverter = createDefaultNode("acdc-converter", { x: 100, y: 100 });
  const explicitConverter = createDefaultNode("dcac-converter", { x: 160, y: 100 });
  const legacyDcvConverter = createDefaultNode("dcac-converter-vertical", { x: 220, y: 100 });
  const legacyAcvConverter = createDefaultNode("acdc-converter", { x: 300, y: 100 });
  const legacyAcpConverter = createDefaultNode("dcac-converter", { x: 380, y: 100 });
  defaultConverter.name = "默认控制";
  explicitConverter.name = "独立控制";
  legacyDcvConverter.name = "旧DCV";
  legacyAcvConverter.name = "旧ACV";
  legacyAcpConverter.name = "旧ACP";
  explicitConverter.params.ac_control_type = "PV";
  explicitConverter.params.dc_control_type = "I";
  explicitConverter.params.p_dc_set = "3.5";
  for (const [node, legacyValue] of [
    [legacyDcvConverter, "DCV"],
    [legacyAcvConverter, "ACV"],
    [legacyAcpConverter, "ACP"]
  ] as const) {
    node.params.control_type = legacyValue;
    delete node.params.ac_control_type;
    delete node.params.dc_control_type;
  }
  legacyAcpConverter.params[CUSTOM_PARAM_DEFINITIONS_KEY] = JSON.stringify([{
    cnName: "旧控制类型",
    enName: "control_type",
    valueType: "stringEnum",
    typicalValue: "ACP",
    exportEnabled: true,
    exportName: "control_type"
  }]);
  const nodes = [defaultConverter, explicitConverter, legacyDcvConverter, legacyAcvConverter, legacyAcpConverter];

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "DCAC控制类型测试",
    nodes,
    edges: []
  }));
  const topologyNodeById = new Map(calculateElectricalTopology(nodes, []).map((node) => [node.id, node]));
  const topologyNodeNumberForType = (node: ModelNode, type: "ac" | "dc") =>
    topologyNodeById.get(node.id)?.terminals.find((terminal) => terminal.type === type)?.nodeNumber;
  const rowByName = new Map(payload.DCACConverter.rows.map((row) => [row.name, row]));

  expect(payload.DCACConverter.columns).toContain("ac_control_type");
  expect(payload.DCACConverter.columns).toContain("dc_control_type");
  expect(payload.DCACConverter.columns).toContain("p_dc_set");
  expect(payload.DCACConverter.columns).toEqual(expect.arrayContaining([
    "rated_capacity",
    "ac_p_max",
    "ac_p_min",
    "ac_q_max",
    "ac_q_min",
    "ac_i_max",
    "ac_v_max",
    "ac_v_min",
    "dc_p_max",
    "dc_p_min",
    "dc_i_max",
    "dc_v_max",
    "dc_v_min"
  ]));
  expect(payload.DCACConverter.columns).not.toContain("control_type");
  expect(rowByName.get("默认控制")).toMatchObject({
    ac_node: topologyNodeNumberForType(defaultConverter, "ac"),
    dc_node: topologyNodeNumberForType(defaultConverter, "dc"),
    rated_capacity: "10",
    ac_p_max: "10",
    ac_p_min: "-10",
    ac_q_max: "10",
    ac_q_min: "-10",
    ac_control_type: "PQ",
    dc_control_type: "V"
  });
  expect(rowByName.get("独立控制")).toMatchObject({
    ac_node: topologyNodeNumberForType(explicitConverter, "ac"),
    dc_node: topologyNodeNumberForType(explicitConverter, "dc"),
    ac_control_type: "PV",
    dc_control_type: "I",
    p_dc_set: "3.5"
  });
  expect(rowByName.get("旧DCV")).toMatchObject({ ac_control_type: "PQ", dc_control_type: "V" });
  expect(rowByName.get("旧ACV")).toMatchObject({ ac_control_type: "PQ", dc_control_type: "V" });
  expect(rowByName.get("旧ACP")).toMatchObject({ ac_control_type: "PQ", dc_control_type: "V" });
});

test("omits legacy DCAC control fields from explicit E interface definitions", () => {
  const converter = createDefaultNode("acdc-converter", { x: 100, y: 100 });
  converter.name = "严格接口";
  converter.params.control_type = "DCV";
  converter.params.controlType = "ACV";
  converter.params.acControlType = "PH";
  converter.params.dcControlType = "I";
  converter.params.ac_control_type = "PV";
  converter.params.dc_control_type = "P";

  const payload = parseESections(buildEFileExport({
    version: 1,
    name: "DCAC严格接口",
    nodes: [converter],
    edges: []
  }, ["默认方案"], {
    interfaceDefinitions: [{
      componentLibrary: "DCACConverter",
      exportEnabled: true,
      exportName: "DCACConverter",
      fields: [
        { sourceName: "idx", exportEnabled: true, exportName: "idx" },
        { sourceName: "name", exportEnabled: true, exportName: "name" },
        { sourceName: "control_type", exportEnabled: true, exportName: "control_type" },
        { sourceName: "controlType", exportEnabled: true, exportName: "controlType" },
        { sourceName: "acControlType", exportEnabled: true, exportName: "acControlType" },
        { sourceName: "dcControlType", exportEnabled: true, exportName: "dcControlType" },
        { sourceName: "ac_control_type", exportEnabled: true, exportName: "ac_control_type" },
        { sourceName: "dc_control_type", exportEnabled: true, exportName: "dc_control_type" }
      ]
    }]
  }).text);

  expect(payload.DCACConverter.columns).toEqual(["idx", "name", "ac_control_type", "dc_control_type"]);
  expect(payload.DCACConverter.rows[0]).toMatchObject({
    name: "严格接口",
    ac_control_type: "PV",
    dc_control_type: "P"
  });
});

test("exports ACAC converter endpoint control types with only supported values", () => {
  const defaultConverter = createDefaultNode("acac-converter", { x: 100, y: 100 });
  const explicitConverter = createDefaultNode("acac-converter", { x: 240, y: 100 });
  const legacyCombinedConverter = createDefaultNode("acac-converter", { x: 380, y: 100 });
  const legacyEndpointConverter = createDefaultNode("acac-converter", { x: 520, y: 100 });
  explicitConverter.params.i_control_type = "PH";
  explicitConverter.params.j_control_type = "NONE";
  explicitConverter.params.i_p_set = "4.5";
  explicitConverter.params.p_set = "94";
  delete legacyCombinedConverter.params.i_control_type;
  delete legacyCombinedConverter.params.j_control_type;
  legacyCombinedConverter.params.control_type = "PQV";
  legacyCombinedConverter.params[CUSTOM_PARAM_DEFINITIONS_KEY] = JSON.stringify([{
    cnName: "旧控制类型",
    enName: "control_type",
    valueType: "stringEnum",
    typicalValue: "PQV",
    exportEnabled: true,
    exportName: "control_type"
  }]);
  delete legacyEndpointConverter.params.i_control_type;
  delete legacyEndpointConverter.params.j_control_type;
  legacyEndpointConverter.params.source_control_type = "定PV";
  legacyEndpointConverter.params.target_control_type = "定PH";

  const payload = parseESections(buildEDeviceParameterFile({
    version: 1,
    name: "ACAC控制类型测试",
    nodes: [defaultConverter, explicitConverter, legacyCombinedConverter, legacyEndpointConverter],
    edges: []
  }));

  expect(payload.ACACConverter.columns).toContain("i_control_type");
  expect(payload.ACACConverter.columns).toContain("j_control_type");
  expect(payload.ACACConverter.columns).toEqual(expect.arrayContaining([
    "rated_capacity",
    "i_p_max",
    "i_p_min",
    "i_q_max",
    "i_q_min",
    "i_i_max",
    "i_v_max",
    "i_v_min",
    "j_p_max",
    "j_p_min",
    "j_q_max",
    "j_q_min",
    "j_i_max",
    "j_v_max",
    "j_v_min"
  ]));
  expect(payload.ACACConverter.columns).not.toContain("control_type");
  expect(payload.ACACConverter.rows[1].p_set).toBe("4.5");
  expect(payload.ACACConverter.rows[0]).toMatchObject({
    rated_capacity: "10",
    i_q_max: "10",
    i_q_min: "-10",
    j_q_max: "10",
    j_q_min: "-10"
  });
  expect(payload.ACACConverter.rows.map((row) => row.i_control_type)).toEqual(["PQ", "PH", "PQ", "PV"]);
  expect(payload.ACACConverter.rows.map((row) => row.j_control_type)).toEqual(["PQ", "NONE", "PV", "PH"]);
  expect(payload.ACACConverter.rows.flatMap((row) => [row.i_control_type, row.j_control_type]).every((value) => ["PQ", "PV", "PH", "NONE"].includes(value))).toBe(true);
});

test("keeps explicitly configured ACAC and DCDC E interface control_type columns unchanged", () => {
  const cases = [
    { kind: "dcdc-converter" as const, section: "DCDCConverter", legacy: "V", expectedI: "V", expectedJ: "NONE" },
    { kind: "acac-converter" as const, section: "ACACConverter", legacy: "PVQ", expectedI: "PV", expectedJ: "PQ" }
  ];

  for (const item of cases) {
    const converter = createDefaultNode(item.kind, { x: 100, y: 100 });
    converter.name = `${item.section}接口迁移`;
    delete converter.params.i_control_type;
    delete converter.params.j_control_type;
    converter.params.control_type = item.legacy;

    const payload = parseESections(buildEFileExport({
      version: 1,
      name: `${item.section}接口迁移`,
      nodes: [converter],
      edges: []
    }, ["默认方案"], {
      interfaceDefinitions: [{
        componentLibrary: item.section,
        exportEnabled: true,
        exportName: item.section,
        fields: [
          { sourceName: "idx", exportEnabled: true, exportName: "idx" },
          { sourceName: "name", exportEnabled: true, exportName: "name" },
          { sourceName: "control_type", exportEnabled: true, exportName: "control_type" }
        ]
      }]
    }).text);

    expect(payload[item.section].columns).toEqual(["idx", "name", "control_type"]);
    expect(payload[item.section].columns).not.toContain("i_control_type");
    expect(payload[item.section].columns).not.toContain("j_control_type");
  }
});

test("removes duplicate legacy side parameter fields from three-winding transformers", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;
  const canonicalFields = [
    "i_node", "j_node", "k_node",
    "i_r", "i_x", "i_gt", "i_bt", "i_tap", "i_shift",
    "j_r", "j_x", "j_gt", "j_bt", "j_tap", "j_shift",
    "k_r", "k_x", "k_gt", "k_bt", "k_tap", "k_shift"
  ];
  const legacyFields = [
    "t1_node",
    "t2_node",
    "t3_node",
    "r1", "x1", "gt1", "bt1", "tap1", "shift1",
    "r2", "x2", "gt2", "bt2", "tap2", "shift2",
    "r3", "x3", "gt3", "bt3", "tap3", "shift3",
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
  const fieldNames = getTemplateParameterDefinitions(template).map((definition) => definition.enName);
  const transformer = createDefaultNode("ac-three-winding-transformer", { x: 100, y: 100 });

  expect(fieldNames).toEqual(expect.arrayContaining(canonicalFields));
  expect(fieldNames).not.toEqual(expect.arrayContaining(legacyFields));
  expect(transformer.params).toMatchObject({
    i_r: "0.0",
    i_x: "0.1",
    i_gt: "0.0",
    i_bt: "0.0",
    i_tap: "1.0",
    i_shift: "0",
    j_r: "0.0",
    j_x: "0.1",
    j_gt: "0.0",
    j_bt: "0.0",
    j_tap: "1.0",
    j_shift: "0",
    k_r: "0.0",
    k_x: "0.1",
    k_gt: "0.0",
    k_bt: "0.0",
    k_tap: "1.0",
    k_shift: "0"
  });
  for (const field of legacyFields) {
    expect(transformer.params).not.toHaveProperty(field);
  }

  for (const field of canonicalFields) {
    delete transformer.params[field];
  }
  Object.assign(transformer.params, {
    t1_node: "101",
    t2_node: "102",
    t3_node: "103",
    high_resistance_pu: "0.01",
    high_reactance_pu: "0.11",
    high_magnetizing_conductance_pu: "0.001",
    high_magnetizing_susceptance_pu: "0.002",
    high_tap_ratio: "1.01",
    high_shift: "1",
    medium_resistance_pu: "0.02",
    medium_reactance_pu: "0.12",
    medium_magnetizing_conductance_pu: "0.003",
    medium_magnetizing_susceptance_pu: "0.004",
    medium_tap_ratio: "1.02",
    medium_shift: "2",
    low_resistance_pu: "0.03",
    low_reactance_pu: "0.13",
    low_magnetizing_conductance_pu: "0.005",
    low_magnetizing_susceptance_pu: "0.006",
    low_tap_ratio: "1.03",
    low_shift: "3"
  });

  const normalized = normalizeNodeTerminalsWithTemplate(transformer, template);

  expect(normalized.params).toMatchObject({
    i_node: "101",
    k_node: "102",
    j_node: "103",
    i_r: "0.01",
    i_x: "0.11",
    i_gt: "0.001",
    i_bt: "0.002",
    i_tap: "1.01",
    i_shift: "1",
    k_r: "0.02",
    k_x: "0.12",
    k_gt: "0.003",
    k_bt: "0.004",
    k_tap: "1.02",
    k_shift: "2",
    j_r: "0.03",
    j_x: "0.13",
    j_gt: "0.005",
    j_bt: "0.006",
    j_tap: "1.03",
    j_shift: "3"
  });
  for (const field of legacyFields) {
    expect(normalized.params).not.toHaveProperty(field);
  }
});

test("keeps transformer E export controls through override application and node creation", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-transformer")!;
  const parameterDefinitions = getTemplateParameterDefinitions(template).map((definition) =>
    definition.enName === "r"
      ? { ...definition, exportEnabled: true, exportName: "resistance" }
      : {
          ...definition,
          ...resolveDeviceParameterDefinitionExportSettings(template.kind, template.params, definition)
        }
  );
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: "ACTransformer",
    params: { component_type: "ACTransformer" },
    parameterDefinitions,
    updatedAt: "2026-07-12T00:00:00.000Z"
  });
  const node = createNodeFromTemplate(overridden, { x: 100, y: 100 });
  const storedDefinitions = JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];
  const normalized = normalizeNodeTerminalsWithTemplate(node, overridden);
  const normalizedDefinitions = JSON.parse(normalized.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];

  expect(overridden.parameterDefinitions?.find((definition) => definition.enName === "r")).toMatchObject({
    exportEnabled: true,
    exportName: "resistance"
  });
  expect(storedDefinitions.find((definition) => definition.enName === "r")).toMatchObject({
    exportEnabled: true,
    exportName: "resistance"
  });
  expect(normalizedDefinitions.find((definition) => definition.enName === "r")).toMatchObject({
    exportEnabled: true,
    exportName: "resistance"
  });
  expect(normalized.params.r).toBe("0.0");
  expect(getEParameterKeys(node.kind, node.params)).toContain("resistance");
  expect(getEParameterKeys(node.kind, node.params)).not.toContain("r");
  expect(getEParameterKeys(normalized.kind, normalized.params)).toContain("resistance");
  expect(getEParameterKeys(normalized.kind, normalized.params)).not.toContain("r");
});

test("keeps three-winding transformer E export controls on canonical side parameters", () => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;
  const parameterDefinitions = getTemplateParameterDefinitions(template).map((definition) =>
    definition.enName === "i_r"
      ? { ...definition, exportEnabled: true, exportName: "high_resistance" }
      : {
          ...definition,
          ...resolveDeviceParameterDefinitionExportSettings(template.kind, template.params, definition)
        }
  );
  const overridden = applyDeviceTemplateDefinitionOverride(template, {
    kind: "ACTransfomer3",
    params: { component_type: "ACTransfomer3" },
    parameterDefinitions,
    updatedAt: "2026-07-12T00:00:00.000Z"
  });
  const node = createNodeFromTemplate(overridden, { x: 100, y: 100 });
  const storedDefinitions = JSON.parse(node.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];
  const normalized = normalizeNodeTerminalsWithTemplate(node, overridden);
  const normalizedDefinitions = JSON.parse(normalized.params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]") as DeviceParameterDefinition[];

  expect(overridden.parameterDefinitions?.find((definition) => definition.enName === "i_r")).toMatchObject({
    exportEnabled: true,
    exportName: "high_resistance"
  });
  expect(storedDefinitions.find((definition) => definition.enName === "i_r")).toMatchObject({
    exportEnabled: true,
    exportName: "high_resistance"
  });
  expect(normalizedDefinitions.find((definition) => definition.enName === "i_r")).toMatchObject({
    exportEnabled: true,
    exportName: "high_resistance"
  });
  expect(normalized.params.i_r).toBe("0.0");
  expect(getEParameterKeys(node.kind, node.params)).toContain("high_resistance");
  expect(getEParameterKeys(node.kind, node.params)).not.toContain("i_r");
  expect(getEParameterKeys(normalized.kind, normalized.params)).toContain("high_resistance");
  expect(getEParameterKeys(normalized.kind, normalized.params)).not.toContain("i_r");
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

test("keeps topology validation running when a persisted global-line node name is missing", () => {
  const unnamedLine = createDefaultNode("ac-routable-line", { x: 100, y: 100 });
  unnamedLine.params = {
    ...unnamedLine.params,
    idx: "13",
    _globalLineModelPair: "target"
  };
  delete (unnamedLine as Partial<typeof unnamedLine>).name;

  expect(() => validateTopology([unnamedLine], [])).not.toThrow();
  expect(validateTopology([unnamedLine], [])).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "duplicate-device-name" })
  ]));
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
});

describe("E 文件查看/编辑展示与导出一致性", () => {
  test("未设置字段在查看模式下显示与导出 E 文件一致的默认值", () => {
    const generator = createDefaultNode("ac-source", { x: 100, y: 100 });
    generator.params = {
      ...generator.params,
      idx: "5",
      p_set: "8.5",
      run_stat: "1"
    };
    const project: ProjectFile = {
      version: 1,
      name: "查看展示一致性测试",
      nodes: [generator],
      edges: []
    };

    const records = buildEDeviceRecords(project);
    const generatorRecord = records.find((record) => record.kind === "ac-source");
    expect(generatorRecord).toBeDefined();

    const section = generatorRecord!.section;
    const rowIndex = 0;
    const formatted: Record<string, string> = {};
    for (const column of generatorRecord!.columns ?? []) {
      formatted[column] = formatEDeviceRecordColumnValue(section, generatorRecord!, column, rowIndex);
    }

    // 已设置字段按实际值展示
    expect(formatted.name).toBe("交流电源");
    expect(formatted.p_set).toBe("8.5");
    expect(formatted.run_stat).toBe("1");
    // 未设置字段展示导出默认值而非空白
    expect(formatted.idx).toBe("5");
    expect(formatted.q_set).toBe("0");
    expect(formatted.regable).toBe("0");
    expect(formatted.v_set).toBe("0");
    // 有默认参数值（PV）的字段按实际值展示
    expect(formatted.control_type).toBe("PV");

    // 与导出文件中的取值一致
    const payload = parseESections(
      buildEDeviceParameterFile(project)
    );
    const exportedRow = payload.ACGenerator.rows[0];
    for (const column of Object.keys(formatted)) {
      if (column === "name") continue;
      expect(formatted[column], `列 ${column} 展示值应与导出一致`).toBe(exportedRow[column] ?? "");
    }
  });

  test("导出与展示共用 formatEDeviceRecordColumnValue（regable 可调设备默认 1）", () => {
    const storage = createDefaultNode("ac-storage", { x: 100, y: 100 });
    const record: any = {
      section: "ACGenerator",
      params: { name: "储能", type: "ac-storage", regable: "" }
    };
    expect(formatEDeviceRecordColumnValue("ACGenerator", record, "regable", 0)).toBe("1");
    record.params.type = "ac-line";
    expect(formatEDeviceRecordColumnValue("ACGenerator", record, "regable", 0)).toBe("0");
  });
});

describe("模型类型与全局序号", () => {
  test("支持五种模型类型并跨方案树计算全局下一个模型 idx", () => {
    expect(MODEL_TYPES).toEqual(["厂站", "馈线", "台区", "微网", "其他"]);
    // createSavedProject 不再继承来源 idx（新模型由后端分配），这里显式补上以构造固定 model_id 的夹具。
    const project = (name: string, idx?: number) => {
      const record = createSavedProject(name, { version: 1, name, nodes: [], edges: [] });
      return idx === undefined ? record : { ...record, project: { ...record.project, idx } };
    };
    const rootA = createSavedScheme("方案A", [project("模型1", 1)]);
    rootA.children = [createSavedScheme("子方案", [project("模型9", 9)])];
    const rootB = createSavedScheme("方案B", [project("模型4", 4)]);

    expect(nextGlobalProjectIndex([])).toBe(1);
    expect(nextGlobalProjectIndex([rootA, rootB])).toBe(10);
  });

});


describe("全网 E 文件导出", () => {
  const terminalPoint = (node: ModelNode, terminalId: string) => getTerminalPoint(node, terminalId);
  const connectLine = (
    name: string,
    source: { node: ModelNode; terminalId: string },
    target: { node: ModelNode; terminalId: string }
  ) => {
    const line = createRoutableLineDeviceFromEndpoints(
      DEVICE_LIBRARY_BY_KIND.get("ac-routable-line")!,
      terminalPoint(source.node, source.terminalId),
      terminalPoint(target.node, target.terminalId),
      DEFAULT_MODEL_LAYER_ID,
      {
        source: { nodeId: source.node.id, terminalId: source.terminalId },
        target: { nodeId: target.node.id, terminalId: target.terminalId }
      }
    );
    line.name = name;
    line.terminals = line.terminals.map((terminal) => ({ ...terminal, vbase: "10" }));
    return line;
  };

  test("单端全局线路的对端未导出时，普通 E 和 EMS 模板都保留该端模型关联边界", () => {
    const physicalSource = createDefaultNode("ac-source", { x: 100, y: 300 });
    physicalSource.name = "实际交流电源";
    physicalSource.params.idx = "91";
    physicalSource.terminals[0].vbase = "10";
    const physicalLoad = createDefaultNode("ac-load", { x: 300, y: 300 });
    physicalLoad.name = "实际交流负荷";
    physicalLoad.params.idx = "92";
    physicalLoad.terminals[0].vbase = "10";
    const connectedFeederBoundary = createDefaultNode("ac-feeder-load", { x: 420, y: 300 });
    connectedFeederBoundary.name = "全局线路占用的馈线边界";
    connectedFeederBoundary.params.idx = "1";
    connectedFeederBoundary.params.model_id = "12";
    connectedFeederBoundary.terminals[0].vbase = "10";
    const independentDistrictBoundary = createDefaultNode("ac-district-load", { x: 520, y: 300 });
    independentDistrictBoundary.name = "独立台区边界负荷";
    independentDistrictBoundary.params.idx = "2";
    independentDistrictBoundary.params.model_id = "23";
    independentDistrictBoundary.terminals[0].vbase = "10";
    const independentStationBoundary = createDefaultNode("ac-station-source", { x: 100, y: 480 });
    independentStationBoundary.name = "独立厂站边界电源";
    independentStationBoundary.params.idx = "3";
    independentStationBoundary.params.model_id = "5";
    independentStationBoundary.terminals[0].vbase = "10";
    const globalLine = connectLine(
      "模型内待合并全局线路",
      { node: physicalSource, terminalId: physicalSource.terminals[0].id },
      { node: connectedFeederBoundary, terminalId: connectedFeederBoundary.terminals[0].id }
    );
    globalLine.params.idx = "41";
    globalLine.params._globalLineId = "global-line-filter-boundary";
    globalLine.params._globalLineModelPair = "source";
    const inputs = [
      {
        id: "station-5",
        schemePath: ["主方案"],
        project: {
          version: 1 as const,
          name: "中心厂站",
          idx: 5,
          modelType: "厂站" as const,
          nodes: [physicalSource, connectedFeederBoundary, independentDistrictBoundary, globalLine],
          edges: []
        }
      },
      {
        id: "feeder-12",
        schemePath: ["主方案"],
        project: {
          version: 1 as const,
          name: "十千伏一线",
          idx: 12,
          modelType: "馈线" as const,
          nodes: [physicalLoad, independentStationBoundary],
          edges: []
        }
      },
      {
        id: "district-23",
        schemePath: ["主方案"],
        project: { version: 1 as const, name: "一号台区", idx: 23, modelType: "台区" as const, nodes: [], edges: [] }
      }
    ];

    const assertIncompleteGlobalLineBoundaryIsPreserved = (text: string) => {
      const payload = parseESections(text);
      const exportedDeviceNames = Object.entries(payload)
        .filter(([section]) => section !== "ACNode" && section !== "DCNode")
        .flatMap(([, section]) => section.rows.map((row) => row.name).filter(Boolean));
      expect(exportedDeviceNames).toContain(connectedFeederBoundary.name);
      expect(exportedDeviceNames).toContain(independentDistrictBoundary.name);
      expect(exportedDeviceNames).toContain(independentStationBoundary.name);
      expect(exportedDeviceNames).toContain("实际交流电源");
      expect(exportedDeviceNames).toContain("实际交流负荷");
    };

    const ordinaryFile = buildMultiModelEFileExport(inputs);
    assertIncompleteGlobalLineBoundaryIsPreserved(ordinaryFile.text);

    const emsFile = buildMultiModelEFileExport(inputs, {
      templateName: "主网实时库",
      eDeviceDefinitionLabels: {
        ACGenerator: "generatingunit",
        ACLoad: "energyconsumer"
      },
      interfaceDefinitions: [
        {
          componentLibrary: "ACGenerator",
          exportName: "generatingunit",
          fields: ["idx", "name", "node"].map((name) => ({
            sourceName: name,
            exportName: name,
            cnName: name,
            exportEnabled: true
          }))
        },
        {
          componentLibrary: "ACLoad",
          exportName: "energyconsumer",
          fields: ["idx", "name", "node"].map((name) => ({
            sourceName: name,
            exportName: name,
            cnName: name,
            exportEnabled: true
          }))
        }
      ]
    });
    assertIncompleteGlobalLineBoundaryIsPreserved(emsFile.text);
  });

  test("模型设备写入所属 model_id 且全局线路按表记录合并为 parent=0 的唯一线路", () => {
    const globalLineId = "global-line-parent-and-dedup";
    const stationSource = createDefaultNode("ac-source", { x: 100, y: 120 });
    stationSource.name = "厂站本地电源";
    stationSource.params.idx = "3";
    stationSource.terminals[0].vbase = "10";
    const feederBoundary = createDefaultNode("ac-feeder-load", { x: 420, y: 120 });
    feederBoundary.name = "应收缩馈线边界负荷";
    feederBoundary.params.model_id = "7";
    feederBoundary.terminals[0].vbase = "10";
    const stationLine = connectLine(
      "模型内线路副本A",
      { node: stationSource, terminalId: stationSource.terminals[0].id },
      { node: feederBoundary, terminalId: feederBoundary.terminals[0].id }
    );
    stationLine.params.idx = "42";
    stationLine.params._globalLineId = globalLineId;
    stationLine.params._globalLineModelPair = "target";

    const stationBoundary = createDefaultNode("ac-station-source", { x: 100, y: 320 });
    stationBoundary.name = "应收缩厂站边界电源";
    stationBoundary.params.model_id = "6";
    stationBoundary.terminals[0].vbase = "10";
    const feederLoad = createDefaultNode("ac-load", { x: 420, y: 320 });
    feederLoad.name = "馈线本地负荷";
    feederLoad.params.idx = "4";
    feederLoad.terminals[0].vbase = "10";
    const feederLine = connectLine(
      "模型内线路副本B",
      { node: stationBoundary, terminalId: stationBoundary.terminals[0].id },
      { node: feederLoad, terminalId: feederLoad.terminals[0].id }
    );
    feederLine.params.idx = "42";
    feederLine.params._globalLineId = globalLineId;
    feederLine.params._globalLineModelPair = "source";

    const sourceReference = {
      modelKey: "model:6",
      projectIdx: 6,
      schemePath: ["主方案"],
      projectName: "厂站A",
      nodeId: stationLine.id,
      terminalSlot: "i" as const,
      boundaryEndpoint: "source" as const
    };
    const targetReference = {
      modelKey: "model:7",
      projectIdx: 7,
      schemePath: ["主方案"],
      projectName: "馈线A",
      nodeId: feederLine.id,
      terminalSlot: "j" as const,
      boundaryEndpoint: "target" as const
    };
    const globalLineRecord: GlobalLineRecord = {
      id: globalLineId,
      idx: 42,
      name: "全局统一线路名",
      energyType: "ac",
      params: {
        run_stat: "1",
        vbase: "10",
        rated_capacity: "250",
        i_max: "500",
        r: "0.25",
        x: "0.75",
        b: "0.01",
        dev_type: "ACBranch"
      },
      references: [sourceReference, targetReference],
      endpointSlots: { source: sourceReference, target: targetReference },
      terminalSlots: { i: sourceReference, j: targetReference },
      degree: 2,
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:00:00.000Z"
    };

    const file = buildMultiModelEFileExport([
      {
        id: "station-6",
        schemePath: ["主方案"],
        project: {
          version: 1,
          name: "厂站A",
          idx: 6,
          modelType: "厂站",
          nodes: [stationSource, feederBoundary, stationLine],
          edges: []
        }
      },
      {
        id: "feeder-7",
        schemePath: ["主方案"],
        project: {
          version: 1,
          name: "馈线A",
          idx: 7,
          modelType: "馈线",
          nodes: [stationBoundary, feederLoad, feederLine],
          edges: []
        }
      }
    ], {}, [globalLineRecord]);
    const payload = parseESections(file.text);
    const globalLineRows = payload.ACBranch.rows.filter((row) => row.idx === "42");

    expect(payload.ACBranch.columns.slice(0, 3)).toEqual(["idx", "name", "parent"]);
    expect(globalLineRows).toHaveLength(1);
    expect(globalLineRows[0]).toMatchObject({
      idx: "42",
      name: "全局统一线路名",
      parent: "0",
      rated_capacity: "250",
      r: "0.25",
      x: "0.75"
    });
    expect(Number(globalLineRows[0].i_node)).toBeGreaterThanOrEqual(60000);
    expect(Number(globalLineRows[0].i_node)).toBeLessThan(70000);
    expect(Number(globalLineRows[0].j_node)).toBeGreaterThanOrEqual(70000);
    expect(Number(globalLineRows[0].j_node)).toBeLessThan(80000);
    expect(payload.ACBranch.rows.map((row) => row.name)).not.toEqual(
      expect.arrayContaining(["模型内线路副本A", "模型内线路副本B"])
    );
    expect(payload.ACLoad.rows.map((row) => row.name)).not.toContain(feederBoundary.name);
    expect(payload.ACGenerator.rows.map((row) => row.name)).not.toContain(stationBoundary.name);
    expect(payload.ACGenerator.columns.slice(0, 3)).toEqual(["idx", "name", "parent"]);
    expect(payload.ACGenerator.rows.find((row) => row.name === "厂站本地电源")?.parent).toBe("6");
    expect(payload.ACLoad.columns.slice(0, 3)).toEqual(["idx", "name", "parent"]);
    expect(payload.ACLoad.rows.find((row) => row.name === "馈线本地负荷")?.parent).toBe("7");
    // ACNode 在本 fixture 的接口里没有 parent 字段：不再强制注入。
    expect(payload.ACNode.columns).not.toContain("parent");
  });

  test("全网 E 中接口未定义 parent 时不注入 parent 列（列与模板一致）", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    source.name = "顺序校验电源";
    source.params.idx = "1";
    source.terminals[0].vbase = "10";
    const load = createDefaultNode("ac-load", { x: 320, y: 120 });
    load.name = "顺序校验负荷";
    load.params.idx = "2";
    load.terminals[0].vbase = "10";
    const fields = ["idx", "dev_type", "name", "node"].map((name) => ({
      sourceName: name,
      exportName: name,
      cnName: name,
      exportEnabled: true
    }));

    const file = buildMultiModelEFileExport([{
      id: "station-19",
      schemePath: ["主方案"],
      project: {
        version: 1,
        name: "顺序校验厂站",
        idx: 19,
        modelType: "厂站",
        nodes: [source, load],
        edges: []
      }
    }], {
      interfaceDefinitions: [
        {
          componentLibrary: "ACGenerator",
          exportName: "ACGenerator",
          fields
        },
        {
          componentLibrary: "ACLoad",
          exportName: "ACLoad",
          fields
        }
      ]
    });
    const payload = parseESections(file.text);

    for (const section of ["ACGenerator", "ACLoad"] as const) {
      // 接口字段未含 parent：保持接口列（idx,dev_type,name,node），不再注入 parent。
      expect(payload[section].columns).toEqual(["idx", "dev_type", "name", "node"]);
      expect(payload[section].columns).not.toContain("parent");
      expect(payload[section].rows.length).toBeGreaterThan(0);
    }
  });

  test("模板态全网：厂站模型写入 <substation>，不再输出合成 <Station> 或默认厂站行", () => {
    const mk = (idx: number, name: string) => ({
      id: `station-${idx}`,
      schemePath: ["主方案"],
      project: { version: 1 as const, name, idx, modelType: "厂站" as const, nodes: [], edges: [] }
    });
    const file = buildMultiModelEFileExport([mk(1, "厂站一"), mk(5, "厂站二")], {
      eDeviceDefinitionLabels: { substation: "substation" }
    });
    const payload = parseESections(file.text);
    expect(payload.Station).toBeUndefined();
    expect(payload.substation.rows.map((row: any) => row.idx)).toEqual(["1", "5"]);
    expect(payload.substation.rows.map((row: any) => row.name)).toEqual(["厂站一", "厂站二"]);
    expect(payload.substation.rows.every((row: any) => String(row.idv ?? "") === "0")).toBe(true);
  });

  test("模板态全网：厂站设备 ist 置为所属模型序号（不依赖 parent 列也能区分多站）", () => {
    const fields = ["idx", "name", "ist", "node"].map((name) => ({
      sourceName: name,
      exportName: name,
      cnName: name,
      exportEnabled: true
    }));
    const source = createDefaultNode("ac-source", { x: 10, y: 10 });
    source.name = "厂站二电源";
    source.params.idx = "1";
    source.terminals[0].vbase = "10";
    const options = {
      eDeviceDefinitionLabels: { ACGenerator: "ACGenerator", ACLoad: "ACLoad" },
      interfaceDefinitions: [
        { componentLibrary: "ACGenerator", exportName: "ACGenerator", fields },
        { componentLibrary: "ACLoad", exportName: "ACLoad", fields }
      ]
    };
    const file = buildMultiModelEFileExport([{
      id: "station-9",
      schemePath: ["主方案"],
      project: { version: 1 as const, name: "厂站二", idx: 9, modelType: "厂站" as const, nodes: [source], edges: [] }
    }], options);
    const payload = parseESections(file.text);
    expect(payload.ACGenerator.rows.find((row: any) => row.name === "厂站二电源")?.ist).toBe("9");
  });

  test("按模型 idx 合并记录并把设备及节点序号重编号为模型 idx * 10000 + 单模型序号", () => {
    const stationReference = createDefaultNode("ac-station-source", { x: 120, y: 160 });
    stationReference.params.model_id = "5";
    stationReference.terminals = stationReference.terminals.map((terminal) => ({ ...terminal, vbase: "10" }));
    const feederLoad = createDefaultNode("ac-load", { x: 440, y: 160 });
    feederLoad.name = "馈线负荷";
    feederLoad.params.idx = "7";
    feederLoad.terminals[0].vbase = "10";
    const line = connectLine(
      "十千伏联络线",
      { node: stationReference, terminalId: stationReference.terminals[0].id },
      { node: feederLoad, terminalId: feederLoad.terminals[0].id }
    );
    line.params.idx = "3";

    const stationSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    stationSource.name = "厂站电源";
    stationSource.params.idx = "4";
    stationSource.terminals[0].vbase = "10";

    const file = buildMultiModelEFileExport([
      {
        id: "station-5",
        schemePath: ["主方案"],
        project: { version: 1, name: "中心厂站", idx: 5, modelType: "厂站", nodes: [stationSource], edges: [] }
      },
      {
        id: "feeder-2",
        schemePath: ["主方案"],
        project: { version: 1, name: "十千伏一线", idx: 2, modelType: "馈线", nodes: [stationReference, feederLoad, line], edges: [] }
      }
    ]);
    const payload = parseESections(file.text);

    expect(file.filename).toBe("全网拓扑.e");
    expect(payload.ACLoad.rows.find((row) => row.name === "馈线负荷")?.idx).toBe("20007");
    expect(payload.ACBranch.rows.find((row) => row.name === "十千伏联络线")?.idx).toBe("20003");
    expect(payload.ACGenerator.rows.find((row) => row.name === "厂站电源")?.idx).toBe("50004");
    expect(Number(payload.ACLoad.rows.find((row) => row.name === "馈线负荷")?.node)).toBeGreaterThanOrEqual(20000);
    expect(Number(payload.ACGenerator.rows.find((row) => row.name === "厂站电源")?.node)).toBeGreaterThanOrEqual(50000);
    expect(payload.ACGenerator.rows.find((row) => row.name === "交流厂站电源")).toMatchObject({
      parent: "2"
    });
    const stationReferenceBase = payload.ACGenerator.rows.find((row) => row.name === stationReference.name);
    const stationReferenceDerived = payload.ACStationGen.rows[0];
    expect(payload.ACStationGen.columns).toEqual(["idx", "idx_acgenerator", "model_id"]);
    expect(stationReferenceDerived).not.toHaveProperty("parent");
    expect(stationReferenceDerived).not.toHaveProperty("dev_type");
    expect(stationReferenceDerived.idx_acgenerator).toBe(stationReferenceBase?.idx);
    expect(stationReferenceDerived.idx_acgenerator).toBe("20001");
  });

  test("全网 E 文件分别导出厂站、馈线和台区列表并按模型关联建立 parent", () => {
    const feederReference = createDefaultNode("ac-feeder-source", { x: 100, y: 100 });
    feederReference.params.model_id = "12";
    const duplicateFeederReference = createDefaultNode("dc-feeder-load", { x: 200, y: 100 });
    duplicateFeederReference.params.model_id = "12";
    const districtReference = createDefaultNode("ac-district-load", { x: 100, y: 100 });
    districtReference.params.model_id = "23";

    const file = buildMultiModelEFileExport([
      {
        id: "district-23",
        schemePath: ["主方案"],
        project: { version: 1, name: "一号台区", idx: 23, modelType: "台区", nodes: [], edges: [] }
      },
      {
        id: "station-5",
        schemePath: ["主方案"],
        project: {
          version: 1,
          name: "中心厂站",
          idx: 5,
          modelType: "厂站",
          nodes: [feederReference, duplicateFeederReference],
          edges: []
        }
      },
      {
        id: "feeder-12",
        schemePath: ["主方案"],
        project: {
          version: 1,
          name: "十千伏一线",
          idx: 12,
          modelType: "馈线",
          nodes: [districtReference],
          edges: []
        }
      }
    ]);
    const payload = parseESections(file.text);

    expect(payload.Station.columns).toEqual(["idx", "name"]);
    expect(payload.Feeder.columns).toEqual(["idx", "name", "parent"]);
    expect(payload.District.columns).toEqual(["idx", "name", "parent"]);
    expect(payload.Station.rows).toEqual([{ idx: "5", name: "中心厂站" }]);
    expect(payload.Feeder.rows).toEqual([{ idx: "12", name: "十千伏一线", parent: "5" }]);
    expect(payload.District.rows).toEqual([{ idx: "23", name: "一号台区", parent: "12" }]);
    expect(file.text.indexOf("<Station>")).toBeLessThan(file.text.indexOf("<ACNode>"));
    const singleModelFile = buildEFileExport({
      version: 1,
      name: "中心厂站",
      idx: 5,
      modelType: "厂站",
      nodes: [feederReference],
      edges: []
    });
    expect(singleModelFile.text).not.toContain("<Station>");
    expect(singleModelFile.text).not.toContain("<Feeder>");
    expect(singleModelFile.text).not.toContain("<District>");
  });

});

describe("terminalVoltageDisplay 电压继承着色", () => {
  test("断路器端子 vbase 为占位 0 但 params.vbase 已继承 750 时，应显示 750 而非 0", () => {
    const base = createDefaultNode("ac-breaker", { x: 0, y: 0 });
    // 模拟断路器连接到 750kV 母线后的状态：params.vbase 被继承为 750，
    // 但端子 vbase 仍是默认占位 "0"（DEFAULT_INITIAL_TERMINAL_VBASE）。
    const node = {
      ...base,
      params: { ...base.params, vbase: "750" },
      terminals: base.terminals.map((terminal) => ({ ...terminal, vbase: "0" }))
    };
    expect(terminalVoltageDisplay(node, node.terminals[0])).toBe("750");
    expect(terminalVoltageDisplay(node, node.terminals[1])).toBe("750");
  });

  test("断路器端子 vbase 为 0 且 params.vbase 未被继承时，应回退显示 0（不误用空值）", () => {
    const base = createDefaultNode("ac-breaker", { x: 0, y: 0 });
    const node = {
      ...base,
      params: { ...base.params, vbase: "0" },
      terminals: base.terminals.map((terminal) => ({ ...terminal, vbase: "0" }))
    };
    expect(terminalVoltageDisplay(node, node.terminals[0])).toBe("0");
  });

  test("端子自身存在非零 vbase 时优先采用端子电压", () => {
    const base = createDefaultNode("ac-breaker", { x: 0, y: 0 });
    const node = {
      ...base,
      params: { ...base.params, vbase: "750" },
      terminals: base.terminals.map((terminal, index) => ({ ...terminal, vbase: index === 0 ? "35" : "0" }))
    };
    expect(terminalVoltageDisplay(node, node.terminals[0])).toBe("35");
  });
});

// —— 交流容器 E 导出:容器段 ACContainer(决策 3)+ 模板态静默(决策 6) ——

/** 按序建带永久 idx 的内置图元(容器与普通设备共用计数器池,分段互不干扰) */
function createIndexedExportNodes(kinds: DeviceKind[]): ModelNode[] {
  let counters: Record<string, number> = {};
  return kinds.map((kind, index) => {
    const assigned = assignPermanentDeviceIndex(createDefaultNode(kind, { x: 100 + index * 240, y: 100 }), counters);
    counters = assigned.counters;
    return assigned.node;
  });
}

/**
 * 解析容器记录 bound_device_idx 指向的行:按**最后一个**下划线切「表名 / idx」
 * (表名可能自带下划线,如 dms_def_load_3),再在对应段里找 idx 匹配的行。
 * 返回行本身,便于断言行内 name 就是绑定设备 —— 只断言 idx 存在是恒真的(引用错位时命中的是另一台设备)。
 */
function containerBoundDeviceRow(
  payload: Record<string, ParsedESection>,
  containerName: string
): { table: string; idx: string; row?: Record<string, string> } {
  const ref = payload.ACContainer?.rows.find((row) => row.name === containerName)?.bound_device_idx ?? "";
  const cut = ref.lastIndexOf("_");
  const table = cut >= 0 ? ref.slice(0, cut) : "";
  const idx = cut >= 0 ? ref.slice(cut + 1) : "";
  return { table, idx, row: payload[table]?.rows.find((candidate) => candidate.idx === idx) };
}

describe("交流容器 E 导出", () => {
  test("三个容器 kind 统一映射到容器段 ACContainer", () => {
    for (const kind of ["ac-vpp-box", "ac-switch-box", "ac-distribution-box"]) {
      expect(inferESection(kind), kind).toBe("ACContainer");
    }
    // 容器段列:dev_type 值 = 容器元件英文名(旧 type 列已删除)
    expect(E_SECTION_COLUMNS.ACContainer).toEqual(["idx", "name", "dev_type", "is_gateway", "bound_device_idx"]);
  });

  test("容器 dev_type 取值与导出同源:取容器元件英文名,不是段名 ACContainer", () => {
    // 双击/批量参数行读 getEParamValue —— 与容器段记录同一出口,避免面板显示 ACContainer 而文件写 ac-vpp-box
    for (const kind of ["ac-vpp-box", "ac-switch-box", "ac-distribution-box"] as DeviceKind[]) {
      expect(getEParamValue("dev_type", createDefaultNode(kind, { x: 0, y: 0 })), kind).toBe(kind);
    }
    // 变体 kind:判据走 baseDeviceKind(与 inferESection 同源),-vertical 变体照样命中容器、值仍取基点 kind
    expect(getEParamValue("dev_type", {
      ...createDefaultNode("ac-vpp-box", { x: 0, y: 0 }),
      kind: "ac-vpp-box-vertical"
    } as ModelNode)).toBe("ac-vpp-box");
  });

  test("非关口容器仅入 ACContainer 段,不进拓扑节点表", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    container.name = "虚拟电厂1";
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "容器导出模型", nodes: [container, member], edges: [] };

    // 容器只产出一条记录,不混入任何设备/拓扑节点段
    const records = buildEDeviceRecords(project);
    expect(records.filter((record) => record.id === container.id).map((record) => record.section)).toEqual(["ACContainer"]);
    expect(records.find((record) => record.section === "ACContainer")?.params).toMatchObject({
      idx: container.params.idx,
      name: "虚拟电厂1",
      dev_type: "ac-vpp-box",
      is_gateway: "0",
      bound_device_idx: ""
    });

    const payload = parseESections(buildEFileExport(project).text);
    expect(payload.ACContainer?.columns).toEqual(["idx", "name", "dev_type", "is_gateway", "bound_device_idx"]);
    expect(payload.ACContainer?.rows).toEqual([
      expect.objectContaining({ idx: container.params.idx, name: "虚拟电厂1", dev_type: "ac-vpp-box", is_gateway: "0" })
    ]);
    // 旧 type 列已删除:消费方不能再从容器段读到中文类型名
    expect(payload.ACContainer?.rows[0]).not.toHaveProperty("type");
    // 拓扑节点表只由带 nodeNumber 的端子驱动:容器无边无端子,不入表
    expect((payload.ACNode?.rows ?? []).map((row) => row.name)).not.toContain("虚拟电厂1");
  });

  test("非关口容器的绑定残留:移出绑定设备后被清空 → bound_device_idx 为空(对齐容器段不变量)", () => {
    // 容器段不变量:绑定失效(设备已删/移出)→ 整列为空。绑定字段残留(关过口又关了 / 老数据带来)
    // 若不在「成员离开」时清掉,导出会写出指向**容器外**设备的跨段引用
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    member.containerId = container.id;
    container.params.is_gateway = "0";
    container.params.bound_device_id = member.id;
    const staleProject: ProjectFile = { version: 1, name: "绑定残留容器模型", nodes: [container, member], edges: [] };
    // 反证:残留态直接导出会写出引用(这正是要清它的理由)
    expect(parseESections(buildEFileExport(staleProject).text).ACContainer?.rows[0]?.bound_device_idx)
      .toBe(`ACGenerator_${member.params.idx}`);

    // 走真实出口(移出容器)清掉残留 → 引用为空
    const afterRemove = withNodeUpdates([container, member], applyRemoveFromAcContainer([container, member] as any, [member.id]));
    expect(afterRemove.find((node) => node.id === container.id)!.params.bound_device_id).toBe("");
    const cleanedProject: ProjectFile = { ...staleProject, nodes: afterRemove };
    // 记录层:绑定列整列为空(容器段不变量的口径)
    expect(buildEDeviceRecords(cleanedProject).find((record) => record.section === "ACContainer")!.params.bound_device_idx).toBe("");
    // 落到文件:空数值列按 E 文件口径写 0,关键是不再指向容器外的设备
    expect(parseESections(buildEFileExport(cleanedProject).text).ACContainer?.rows[0]?.bound_device_idx)
      .not.toBe(`ACGenerator_${member.params.idx}`);
  });

  test("关口容器导出容器元件英文名、关口标记与绑定设备序号", () => {
    const [container, member] = createIndexedExportNodes(["ac-switch-box", "ac-source"]);
    member.containerId = container.id;
    container.params.is_gateway = "1";
    container.params.bound_device_id = member.id;
    const project: ProjectFile = { version: 1, name: "关口容器模型", nodes: [container, member], edges: [] };

    const payload = parseESections(buildEFileExport(project).text);
    expect(payload.ACContainer?.rows).toEqual([
      expect.objectContaining({
        dev_type: "ac-switch-box",
        is_gateway: "1",
        // 绑定引用带表名前缀:裸 idx 跨段重号,无法确认属于哪张表
        bound_device_idx: `ACGenerator_${member.params.idx}`,
        name: container.name
      })
    ]);
    // 引用要解析到 ACGenerator 段、且行内 name 就是绑定设备(表名前缀漂移或 idx 错位都会先红)
    const bound = containerBoundDeviceRow(payload, container.name);
    expect(bound.table).toBe("ACGenerator");
    expect(bound.row?.name).toBe(member.name);
  });

  test("bound_device_idx 非模板态取绑定设备所在 E 段名(母线→ACRealBs)", () => {
    const [container, bus] = createIndexedExportNodes(["ac-switch-box", "ac-bus"]);
    bus.containerId = container.id;
    container.params.is_gateway = "1";
    container.params.bound_device_id = bus.id;
    const project: ProjectFile = { version: 1, name: "容器绑母线模型", nodes: [container, bus], edges: [] };

    const payload = parseESections(buildEFileExport(project).text);
    expect(payload.ACContainer?.rows[0]?.bound_device_idx).toBe(`ACRealBs_${bus.params.idx}`);
    // 母线自身记录就在 ACRealBs 段:引用指到的行 name 必须是绑定母线,不是同段另一台设备
    const bound = containerBoundDeviceRow(payload, container.name);
    expect(bound.table).toBe("ACRealBs");
    expect(bound.row?.name).toBe(bus.name);
  });

  test("bound_device_idx 模板态取模板表名(ACRealBs 合并到 ACNode 后写模板段名)", () => {
    const [container, bus] = createIndexedExportNodes(["ac-switch-box", "ac-bus"]);
    bus.containerId = container.id;
    container.params.is_gateway = "1";
    container.params.bound_device_id = bus.id;
    const project: ProjectFile = { version: 1, name: "容器绑母线模板态模型", nodes: [container, bus], edges: [] };
    const options = {
      // 模板表名 node ≠ 内部段名 ACNode:引用值必须跟模板表名,否则指向不存在的段
      eDeviceDefinitionLabels: { ACNode: "node" },
      interfaceDefinitions: [
        {
          componentLibrary: "ACNode",
          exportEnabled: true,
          exportName: "node",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" }
          ]
        },
        {
          componentLibrary: "ACContainer",
          exportEnabled: true,
          exportName: "ACContainer",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" },
            { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" },
            { sourceName: "is_gateway", exportEnabled: true, exportName: "is_gateway" },
            { sourceName: "bound_device_idx", exportEnabled: true, exportName: "bound_device_idx" }
          ]
        }
      ]
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    expect(payload.ACContainer?.rows[0]?.bound_device_idx).toBe(`node_${bus.params.idx}`);
    // node 表由两套 idx 空间喂(拓扑行 idx=端子 nodeNumber / 合并母线行 idx=设备 idx),可能多行同号:
    // 断言「命中的行 name 是绑定母线」而不是「某 idx 存在」,后者恒真
    const bound = containerBoundDeviceRow(payload, container.name);
    expect(bound.table).toBe("node");
    expect(bound.row?.name).toBe(bus.name);
  });

  test("bound_device_idx 跟真实 sgcc 模板段名:母线→node 表、电源→unit 表", () => {
    const options = eExportOptionsForTemplateFile("sgcc.e");

    const [busBox, bus] = createIndexedExportNodes(["ac-switch-box", "ac-bus"]);
    bus.containerId = busBox.id;
    busBox.params.is_gateway = "1";
    busBox.params.bound_device_id = bus.id;
    const busPayload = parseESections(
      buildEFileExport({ version: 1, name: "sgcc容器绑母线", nodes: [busBox, bus], edges: [] }, ["默认方案"], options).text
    );
    // sgcc 把 ACNode+交流母线 合到 node 表:引用必须写 node_,写内部段名 ACRealBs_ 在文件里找不到该段
    expect(busPayload.ACContainer?.rows[0]?.bound_device_idx).toBe(`node_${bus.params.idx}`);
    const bound = containerBoundDeviceRow(busPayload, busBox.name);
    expect(bound.table).toBe("node");
    expect(bound.row?.name).toBe(bus.name);

    const [srcBox, src] = createIndexedExportNodes(["ac-switch-box", "ac-source"]);
    src.containerId = srcBox.id;
    srcBox.params.is_gateway = "1";
    srcBox.params.bound_device_id = src.id;
    const srcPayload = parseESections(
      buildEFileExport({ version: 1, name: "sgcc容器绑电源", nodes: [srcBox, src], edges: [] }, ["默认方案"], options).text
    );
    // 同模板下电源落 unit 表:同模型两类绑定设备各写各的表名,证表名不是写死的段名
    expect(srcPayload.ACContainer?.rows[0]?.bound_device_idx).toBe(`unit_${src.params.idx}`);
    const srcBound = containerBoundDeviceRow(srcPayload, srcBox.name);
    expect(srcBound.table).toBe("unit");
    expect(srcBound.row?.name).toBe(src.name);
  });

  test("绑定设备落在合并段(双/三绕组主变同写 trfm)时引用指向重排后的最终行", () => {
    const options = eExportOptionsForTemplateFile("sgcc.e");
    // 双绕组主变(ACTransformer)与三绕组主变(ACTransfomer3)在 sgcc 下同写 trfm 表:
    // 合并段会把 idx 重排为 1..N,与各设备在自身内部段里的序号不同 —— 引用必须取重排后的最终值
    const [boxA, t2, boxB, t3] = createIndexedExportNodes([
      "ac-switch-box", "ac-transformer", "ac-switch-box", "ac-three-winding-transformer"
    ]);
    boxA.name = "箱A";
    boxB.name = "箱B";
    t2.name = "双绕组主变1";
    t3.name = "三绕组主变1";
    t2.containerId = boxA.id;
    boxA.params.is_gateway = "1";
    boxA.params.bound_device_id = t2.id;
    t3.containerId = boxB.id;
    boxB.params.is_gateway = "1";
    boxB.params.bound_device_id = t3.id;
    const project: ProjectFile = { version: 1, name: "容器绑合并段设备模型", nodes: [boxA, t2, boxB, t3], edges: [] };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    // 两个容器各自解析引用所指的行,断言行内 name 就是绑定设备 —— 引用错位时指向的是另一台变压器的行
    const boundAContainer = containerBoundDeviceRow(payload, "箱A");
    const boundBContainer = containerBoundDeviceRow(payload, "箱B");
    expect(boundAContainer.table).toBe("trfm");
    expect(boundBContainer.table).toBe("trfm");
    // 两台主变各自段内序号都是 1,重排后必有一台变成 2 —— 只用裸 idx(或按段内序号算的引用)时这里至少一条会指向错设备
    expect(boundAContainer.row?.name).toBe("双绕组主变1");
    expect(boundBContainer.row?.name).toBe("三绕组主变1");
  });

  test("绑定设备 id 悬空时 bound_device_idx 保持空(不产出半个引用)", () => {
    const [container] = createIndexedExportNodes(["ac-vpp-box"]);
    container.params.is_gateway = "1";
    container.params.bound_device_id = "missing-node-id";
    const project: ProjectFile = { version: 1, name: "容器悬空绑定模型", nodes: [container], edges: [] };

    expect(
      buildEDeviceRecords(project).find((record) => record.section === "ACContainer")?.params.bound_device_idx
    ).toBe("");
  });

  test("模板态下容器静默过滤:不产出容器段也不告警", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "容器模板态模型", nodes: [container, member], edges: [] };
    const options = {
      eDeviceDefinitionLabels: { ACNode: "交流节点" },
      interfaceDefinitions: [{
        componentLibrary: "ACNode",
        exportEnabled: true,
        exportName: "ACNode",
        fields: [
          { sourceName: "idx", exportEnabled: true, exportName: "idx" },
          { sourceName: "name", exportEnabled: true, exportName: "name" }
        ]
      }]
    };

    const file = buildEFileExport(project, ["默认方案"], options);
    expect(parseESections(file.text).ACContainer).toBeUndefined();
    expect(buildEDeviceRecords(project, options).some((record) => record.section === "ACContainer")).toBe(false);
    // 决策 6:容器段不写入预定义模板,模板未定义该段时容器不逐节点告警(按 nodeId 判,不按告警文案)
    expect(file.warnings.filter((warning) => warning.nodeId === container.id)).toEqual([]);
    expect(getEExportWarnings(project, options).filter((warning) => warning.nodeId === container.id)).toEqual([]);
    // 反证:同模板态下未定义段的设备仍照常告警,上面的空数组不是「告警整体失效」的假绿
    expect(getEExportWarnings(project, options).some((warning) => warning.nodeId === member.id)).toBe(true);
  });

  test("容器段中文显示名「容器表」已注册到类标签表与反查表", () => {
    // 三处用户可见出口都读这张表:元素树类型标签、app 层 COMPONENT_LIBRARY_LABELS(缺键自动继承)、E 元件定义导出
    expect(ELEMENT_TREE_COMPONENT_LIBRARY_LABELS.ACContainer).toBe("容器表");
    // 反查唯一性:若无此键,说明「容器表」被别的类占用,回查会指向错误的类
    expect(COMPONENT_LIBRARY_REVERSE_MAPPING["容器表"]).toBe("ACContainer");
  });

  test("模板定义了容器段但字段列表为空时不产占位行", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "容器空字段模型", nodes: [container, member], edges: [] };
    const options = {
      eDeviceDefinitionLabels: { ACContainer: "容器表" },
      interfaceDefinitions: [{
        componentLibrary: "ACContainer",
        exportEnabled: true,
        exportName: "ACContainer",
        fields: []
      }]
    };

    // 与通用路径同款守卫:字段为空 → 记录被过滤,不落 `# 1 unnamed_1 0 0 0` 占位行
    expect(buildEDeviceRecords(project, options).some((record) => record.section === "ACContainer")).toBe(false);
    expect(parseESections(buildEFileExport(project, ["默认方案"], options).text).ACContainer).toBeUndefined();
  });

  test("模板定义了容器段时容器照常导出(按模板字段出列)", () => {
    const [container, member] = createIndexedExportNodes(["ac-distribution-box", "ac-source"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "容器模板段模型", nodes: [container, member], edges: [] };
    const options = {
      eDeviceDefinitionLabels: { ACContainer: "容器表" },
      interfaceDefinitions: [{
        componentLibrary: "ACContainer",
        exportEnabled: true,
        exportName: "ACContainer",
        fields: [
          { sourceName: "idx", exportEnabled: true, exportName: "idx" },
          { sourceName: "name", exportEnabled: true, exportName: "name" },
          { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
        ]
      }]
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    expect(payload.ACContainer?.columns).toEqual(["idx", "name", "dev_type"]);

    // 变体 kind:模板字段出列路径的容器例外同样先剥 -vertical(否则 dev_type 会退化成段名 ACContainer)
    const variant = { ...container, kind: "ac-vpp-box-vertical" } as ModelNode;
    const variantPayload = parseESections(
      buildEFileExport({ ...project, nodes: [variant, member] }, ["默认方案"], options).text
    );
    expect(variantPayload.ACContainer?.rows).toEqual([
      expect.objectContaining({ dev_type: "ac-vpp-box" })
    ]);
    expect(payload.ACContainer?.rows).toEqual([
      // 模板态下 dev_type 仍取容器元件英文名(模板字段只决定列,不改值 —— 不得退化成段名 ACContainer)
      expect.objectContaining({ idx: container.params.idx, name: container.name, dev_type: "ac-distribution-box" })
    ]);
  });

  // —— 成员关系反向导出:设备表 container_id 列(规格 A)+ ACContainerDev 段(规格 B) ——

  test("规格 A:设备表新增 container_id 列 —— 成员写容器裸 idx,无归属为空(非模板态)", () => {
    const [container, member, outsider] = createIndexedExportNodes(["ac-vpp-box", "ac-source", "ac-source"]);
    container.name = "虚拟电厂1";
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "容器归属列模型", nodes: [container, member, outsider], edges: [] };

    const payload = parseESections(buildEFileExport(project).text);
    // 「其他设备表都要添加」:段内即使有非成员行,整表都出该列
    expect(payload.ACGenerator?.columns).toContain("container_id");
    const rows = payload.ACGenerator?.rows ?? [];
    expect(rows.find((row) => row.name === member.name)?.container_id).toBe(container.params.idx);
    // 无归属行:空值按 E 文件既有口径落成 0(与 bound_device_idx 空值同款)
    expect(rows.find((row) => row.name === outsider.name)?.container_id).toBe("0");
    // 容器段自身不属于任何容器;拓扑节点表行由多设备/端子合并,归属无单一定义 —— 两处都不加该列
    expect(payload.ACContainer?.columns).not.toContain("container_id");
    expect(payload.ACNode?.columns).not.toContain("container_id");

    // 记录层:有归属写值、无归属不写值,但列定义都在(空值行也带列)
    const records = buildEDeviceRecords(project);
    expect(records.find((record) => record.id === member.id)?.params.container_id).toBe(container.params.idx);
    expect(records.find((record) => record.id === outsider.id)?.params.container_id).toBeUndefined();
    expect(records.find((record) => record.id === outsider.id)?.columns).toContain("container_id");
  });

  test("规格 A:无容器模型列结构零差异(container_id / ACContainerDev 只在有容器时出现)", () => {
    const [a, b] = createIndexedExportNodes(["ac-source", "ac-load"]);
    const project: ProjectFile = { version: 1, name: "无容器模型", nodes: [a, b], edges: [] };

    const payload = parseESections(buildEFileExport(project).text);
    expect(payload.ACContainerDev).toBeUndefined();
    expect(payload.ACGenerator?.columns).not.toContain("container_id");
    expect(payload.ACLoad?.columns).not.toContain("container_id");
  });

  test("规格 A:container_id 悬空(容器已删)写空,不产出半个引用", () => {
    const [member] = createIndexedExportNodes(["ac-source"]);
    member.containerId = "missing-container-id";
    const project: ProjectFile = { version: 1, name: "容器悬空归属模型", nodes: [member], edges: [] };

    expect(buildEDeviceRecords(project).find((record) => record.id === member.id)?.params.container_id).toBeUndefined();
  });

  test("规格 A:模板态不越过模板列控制 —— 未定义不出列,定义后值带模板容器表名", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "模板态容器归属列模型", nodes: [container, member], edges: [] };
    const baseOptions = {
      eDeviceDefinitionLabels: { ACContainer: "container", ACGenerator: "unit" },
      interfaceDefinitions: [
        {
          componentLibrary: "ACContainer", exportEnabled: true, exportName: "container",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" },
            { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
          ]
        },
        {
          componentLibrary: "ACGenerator", exportEnabled: true, exportName: "unit",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" }
          ]
        }
      ]
    };
    // 1) 模板字段不含 container_id → 不出现该列(列集合由模板说了算)
    expect(parseESections(buildEFileExport(project, ["默认方案"], baseOptions).text).unit?.columns)
      .not.toContain("container_id");

    // 2) 模板定义了该列 → 值 = 模板容器表名_idx(与 bound_device_idx 同一表名口径)
    const withColumn = {
      ...baseOptions,
      interfaceDefinitions: baseOptions.interfaceDefinitions.map((definition) =>
        definition.componentLibrary === "ACGenerator"
          ? { ...definition, fields: [...definition.fields, { sourceName: "container_id", exportEnabled: true, exportName: "container_id" }] }
          : definition
      )
    };
    const payload = parseESections(buildEFileExport(project, ["默认方案"], withColumn).text);
    expect(payload.unit?.columns).toContain("container_id");
    expect(payload.unit?.rows[0]?.container_id).toBe(`container_${container.params.idx}`);
  });

  test("规格 A:模板态无容器表定义时用 container 前缀兜底(不写裸 idx,形态仍是 表名_idx)", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "模板态无容器表归属列模型", nodes: [container, member], edges: [] };
    const options = {
      eDeviceDefinitionLabels: { ACGenerator: "unit" },
      interfaceDefinitions: [
        {
          componentLibrary: "ACGenerator", exportEnabled: true, exportName: "unit",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" },
            { sourceName: "container_id", exportEnabled: true, exportName: "container_id" }
          ]
        }
      ]
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    // 决策 6:模板无容器段定义 → 容器整体静默(容器表不存在)
    expect(payload.ACContainer).toBeUndefined();
    // 归属信息不丢:兜底写成合成表名前缀 container 的引用(与「模板容器表名_idx」同形态)
    expect(payload.unit?.rows[0]?.container_id).toBe(`container_${container.params.idx}`);
  });

  test("规格 A:实时库模板(表名族 dms_def_)兜底名取同族 dms_def_container", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-load"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "dms 模板兜底名模型", nodes: [container, member], edges: [] };
    const base = eExportOptionsForTemplateFile("dms_rtdb.e");
    // 剥离容器段定义,构造「模板没有对应容器类型表」(真实链路下未命中类本就经 classExportEnabled 剔除)
    const options = {
      ...base,
      interfaceDefinitions: (base.interfaceDefinitions ?? [])
        .filter((definition) => definition.componentLibrary !== "ACContainer")
        .map((definition) => definition.componentLibrary === "ACLoad"
          ? {
              ...definition,
              fields: [...(definition.fields ?? []), { sourceName: "container_id", exportEnabled: true, exportName: "container_id" }]
            }
          : definition)
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    // 无容器表 → 容器静默;实时库模板表名族带 dms_def_ 前缀(labels.ACBranch = dms_def_lnseg)→ 兜底名同族
    expect(payload.ACContainer).toBeUndefined();
    expect(payload.dms_def_load?.rows[0]?.container_id).toBe(`dms_def_container_${container.params.idx}`);
  });

  test("规格 B:ACContainerDev 段 —— 每行一个容器成员关系,三列无类型列", () => {
    const [boxA, boxB, src, load, outsider] = createIndexedExportNodes([
      "ac-vpp-box", "ac-switch-box", "ac-source", "ac-load", "ac-load"
    ]);
    src.containerId = boxA.id;
    load.containerId = boxA.id;
    const project: ProjectFile = { version: 1, name: "容器成员关系模型", nodes: [boxA, boxB, src, load, outsider], edges: [] };

    const payload = parseESections(buildEFileExport(project).text);
    expect(payload.ACContainerDev?.columns).toEqual(["device_id", "container_idx", "container_type"]);
    // 三列:设备引用(表名_idx)/ 所属容器 idx / 容器类型(容器表 dev_type 值);空容器无行、非成员不入表
    expect(payload.ACContainerDev?.rows).toEqual([
      expect.objectContaining({
        device_id: `ACGenerator_${src.params.idx}`, container_idx: boxA.params.idx, container_type: "ac-vpp-box"
      }),
      expect.objectContaining({
        device_id: `ACLoad_${load.params.idx}`, container_idx: boxA.params.idx, container_type: "ac-vpp-box"
      })
    ]);
    // 输出序:成员关系表紧随容器表之后(容器表殿后)
    const text = buildEFileExport(project).text;
    expect(text.indexOf("<ACContainerDev>")).toBeGreaterThan(text.indexOf("<ACContainer>"));
  });

  test("规格 B:device_id 取合并段重排后的最终行号(与 bound_device_idx 同源定稿)", () => {
    const base = eExportOptionsForTemplateFile("sgcc.e");
    // 模板未定义段一律静默:容器段要模板显式定义才输出(成员关系段是功能表,恒出,见下一条用例)
    const options = {
      ...base,
      eDeviceDefinitionLabels: { ...base.eDeviceDefinitionLabels, ACContainer: "container", ACContainerDev: "ACContainerDev" },
      interfaceDefinitions: [
        ...(base.interfaceDefinitions ?? []),
        {
          componentLibrary: "ACContainer", exportEnabled: true, exportName: "container",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" },
            { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
          ]
        },
        {
          componentLibrary: "ACContainerDev", exportEnabled: true, exportName: "ACContainerDev",
          fields: [
            { sourceName: "device_id", exportEnabled: true, exportName: "device_id" },
            { sourceName: "container_idx", exportEnabled: true, exportName: "container_idx" },
            { sourceName: "container_type", exportEnabled: true, exportName: "container_type" }
          ]
        }
      ]
    };
    // sgcc:双绕组主变与三绕组主变同写 trfm 表,合并段把 idx 重排为 1..N,与各自段内序号不同
    const [box, t2, t3] = createIndexedExportNodes(["ac-switch-box", "ac-transformer", "ac-three-winding-transformer"]);
    t2.name = "双绕组主变1";
    t3.name = "三绕组主变1";
    t2.containerId = box.id;
    t3.containerId = box.id;
    const project: ProjectFile = { version: 1, name: "容器成员合并段模型", nodes: [box, t2, t3], edges: [] };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    // 按最后一个下划线切「表名 / idx」(表名可含下划线),再在对应段找行 —— 引用错位时命中的是另一台变压器
    const referencedNames = (payload.ACContainerDev?.rows ?? []).map((row) => {
      const ref = row.device_id;
      const cut = ref.lastIndexOf("_");
      return (payload[ref.slice(0, cut)]?.rows ?? []).find((candidate) => candidate.idx === ref.slice(cut + 1))?.name;
    });
    expect(referencedNames).toEqual(["双绕组主变1", "三绕组主变1"]);
    // container_idx 与设备表 container_id 同形态:容器段输出时也写 `表名_idx`(裁决 2026-09-17 统一口径)
    expect(payload.ACContainerDev?.rows[0]?.container_idx).toBe(`container_${box.params.idx}`);
  });

  test("规格 B:成员无 E 段(静态图元)时行保留、引用为空 —— 成员关系不丢", () => {
    const [box, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    const [graphic] = createIndexedExportNodes(["static-text"]);
    member.containerId = box.id;
    graphic.containerId = box.id;
    const project: ProjectFile = { version: 1, name: "容器静态成员模型", nodes: [box, member, graphic], edges: [] };

    const payload = parseESections(buildEFileExport(project).text);
    // 静态图元不产出设备行(空列段既有口径),成员关系行仍在:引用为空(文件口径写 0)
    expect(payload.ACContainerDev?.rows).toHaveLength(2);
    expect(payload.ACContainerDev?.rows.filter((row) => row.device_id === "0")).toHaveLength(1);
    expect(payload.ACContainerDev?.rows.some((row) => row.device_id === `ACGenerator_${member.params.idx}`)).toBe(true);
  });

  test("规格 A/B:全网拓扑导出中容器引用跟容器段最终 idx(modelIndex 偏移后不悬空)", () => {
    // 模型 2(project.idx=2 → 偏移 20000):容器 + 成员
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    container.name = "箱甲";
    member.name = "电源甲";
    member.containerId = container.id;
    const [otherLoad] = createIndexedExportNodes(["ac-load"]);

    const file = buildMultiModelEFileExport([
      {
        id: "m1", schemePath: ["主方案"],
        project: { version: 1, name: "模型一", idx: 1, modelType: "厂站", nodes: [otherLoad], edges: [] }
      },
      {
        id: "m2", schemePath: ["主方案"],
        project: { version: 1, name: "模型二", idx: 2, modelType: "厂站", nodes: [container, member], edges: [] }
      }
    ]);
    const payload = parseESections(file.text);
    // 容器段行 idx 已按 modelIndex 偏移:局部 idx 值不再出现在文件里
    const containerRow = payload.ACContainer.rows.find((row) => row.name === "箱甲");
    expect(containerRow?.idx).toBe(String(20000 + Number(container.params.idx)));

    // 设备表 container_id 必须指向偏移后的容器行(写局部值即悬空 —— offset = modelIndex*10000)
    const deviceRow = payload.ACGenerator.rows.find((row) => row.name === "电源甲");
    expect(deviceRow?.container_id).toBe(containerRow?.idx);

    // ACContainerDev:container_idx 同源偏移,device_id 命中设备最终行
    expect(payload.ACContainerDev?.rows).toHaveLength(1);
    expect(payload.ACContainerDev?.rows[0]?.container_idx).toBe(containerRow?.idx);
    const ref = payload.ACContainerDev?.rows[0]?.device_id ?? "";
    const cut = ref.lastIndexOf("_");
    expect((payload[ref.slice(0, cut)]?.rows ?? []).find((row) => row.idx === ref.slice(cut + 1))?.name).toBe("电源甲");
  });

  test("规格 B(裁决):模板未定义成员关系段也输出 —— 功能表不受模板过滤", () => {
    const [box, member] = createIndexedExportNodes(["ac-vpp-box", "ac-source"]);
    member.containerId = box.id;
    const project: ProjectFile = { version: 1, name: "模板无成员段模型", nodes: [box, member], edges: [] };
    const base = eExportOptionsForTemplateFile("sgcc.e");
    // 前提:真实设备库不会为「成员关系表」建元件定义(它不是设备类)—— 实机模板态走的就是「无定义」这条路
    expect(base.interfaceDefinitions?.some((definition) => definition.componentLibrary === "ACContainerDev")).toBe(false);
    const options = {
      ...base,
      eDeviceDefinitionLabels: { ...base.eDeviceDefinitionLabels, ACContainer: "container" },
      interfaceDefinitions: [
        ...(base.interfaceDefinitions ?? []),
        {
          componentLibrary: "ACContainer", exportEnabled: true, exportName: "container",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "name", exportEnabled: true, exportName: "name" },
            { sourceName: "dev_type", exportEnabled: true, exportName: "dev_type" }
          ]
        }
      ]
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    // 列定义取 E_SECTION_COLUMNS 兜底(模板没有该段);模板态 container_idx 与设备表 container_id **同形态**
    // (裁决 2026-09-17:统一写 `表名_idx`,裸 idx 只属非模板态)
    expect(payload.ACContainerDev?.columns).toEqual(["device_id", "container_idx", "container_type"]);
    expect(payload.ACContainerDev?.rows).toHaveLength(1);
    expect(payload.ACContainerDev?.rows[0]?.container_idx).toBe(`container_${box.params.idx}`);
    expect(payload.ACContainerDev?.rows[0]?.container_type).toBe("ac-vpp-box");
    expect(payload.ACContainerDev?.rows[0]?.device_id).toBe(`unit_${member.params.idx}`);
  });

  test("规格 A/B:模板态容器段被类门控关掉时走兜底名,成员关系表仍产出", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-load"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "类门控容器模型", nodes: [container, member], edges: [] };
    // 真实库 options:不剥离定义,改用 eDeviceDefinitionClassExportEnabled 关掉容器类 —— 与 UI 里模板未命中该类的真实链路同形
    const base = eExportOptionsForTemplateFile("dms_rtdb.e", { ACContainer: false });
    // 设备库对每类无条件建定义,未命中只置 exportEnabled=false(定义不删):「定义存在」单独不足以判定会输出
    expect(base.interfaceDefinitions?.find((definition) => definition.componentLibrary === "ACContainer")?.exportEnabled).toBe(false);
    const options = {
      ...base,
      interfaceDefinitions: (base.interfaceDefinitions ?? []).map((definition) =>
        definition.componentLibrary === "ACLoad"
          ? { ...definition, fields: [...(definition.fields ?? []), { sourceName: "container_id", exportEnabled: true, exportName: "container_id" }] }
          : definition
      )
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    // 容器段不输出 → 不得写指向不存在表的 ACContainer_{idx},改用 dms 族兜底名
    expect(payload.ACContainer).toBeUndefined();
    expect(payload.dms_def_load?.rows[0]?.container_id).toBe(`dms_def_container_${container.params.idx}`);
    // 裁决 2026-09-17:成员关系表是功能表,容器段被关掉也**仍产出**(成员关系是画布事实);
    // container_idx 同走兜底名口径(裸 idx 指向不存在的表),device_id 仍按成员最终行定稿
    expect(payload.ACContainerDev?.rows).toHaveLength(1);
    expect(payload.ACContainerDev?.rows[0]?.container_idx).toBe(`dms_def_container_${container.params.idx}`);
    expect(payload.ACContainerDev?.rows[0]?.container_type).toBe("ac-vpp-box");
    expect(payload.ACContainerDev?.rows[0]?.device_id).toBe(`dms_def_load_${member.params.idx}`);
  });

  test("规格 A/B:容器段定义存在但字段列表为空 → 两处容器引用同源同形(不分叉)", () => {
    const [container, member] = createIndexedExportNodes(["ac-vpp-box", "ac-load"]);
    member.containerId = container.id;
    const project: ProjectFile = { version: 1, name: "容器段列空模型", nodes: [container, member], edges: [] };
    // 边界:模板为容器段建了定义(containerSectionOutputs 判「会输出」)但字段列表为空 → 容器记录被列空守卫剔除,
    // 定稿阶段查不到容器最终落位。此时两处引用必须走**同一** containerReferenceTable —— 修前设备表写输出表名
    // (`vpp_idx`,判据真)而成员表按「查不到」写兜底名(`container_idx`,判据假),同文件两处形态分叉
    const options = {
      eDeviceDefinitionLabels: { ACContainer: "vpp", ACLoad: "load" },
      interfaceDefinitions: [
        { componentLibrary: "ACContainer", exportEnabled: true, exportName: "vpp", fields: [] },
        {
          componentLibrary: "ACLoad", exportEnabled: true, exportName: "load",
          fields: [
            { sourceName: "idx", exportEnabled: true, exportName: "idx" },
            { sourceName: "container_id", exportEnabled: true, exportName: "container_id" }
          ]
        }
      ]
    };

    const payload = parseESections(buildEFileExport(project, ["默认方案"], options).text);
    expect(payload.vpp).toBeUndefined();
    expect(payload.load?.rows[0]?.container_id).toBe(`vpp_${container.params.idx}`);
    expect(payload.ACContainerDev?.rows[0]?.container_idx).toBe(`vpp_${container.params.idx}`);
  });
});

// —— 关口拓扑变换(决策 4):合成端子 + 绑定设备上游替换为容器 ——

type GatewayWireSpec = {
  /** 上游设备 kind */
  kind: DeviceKind;
  /** 反向画线:绑定设备作起点(验收边方向只是画法,不代表电源方向) */
  reverse?: boolean;
  /** 接在绑定设备的第几个端子(默认 0) */
  boundTerminal?: number;
};

type GatewayFixture = {
  nodes: ModelNode[];
  edges: Edge[];
  project: ProjectFile;
  containerId: string;
  boundId: string;
  boundTerminalIds: string[];
  upstreamIds: string[];
  upstreamTerminalIds: string[];
};

/**
 * 关口装置:容器 + 绑定成员(默认交流断路器,双端子)+ 上游设备若干(默认一条 `上游→绑定设备` 边)。
 * prefix 供多套装置并入同一模型;wires: [] = 绑定设备无连线;isGateway:false 即非关口容器。
 */
function makeGatewayFixture(options: {
  prefix?: string;
  boundKind?: DeviceKind;
  wires?: GatewayWireSpec[];
  isGateway?: boolean;
} = {}): GatewayFixture {
  const prefix = options.prefix ?? "1";
  const wires = options.wires ?? [{ kind: "ac-source" as DeviceKind }];
  const [container, member] = createIndexedExportNodes(["ac-vpp-box", options.boundKind ?? "ac-breaker"]);
  const upstreams = createIndexedExportNodes(wires.map((wire) => wire.kind));
  const containerId = `c${prefix}`;
  const boundId = `m${prefix}`;
  container.id = containerId;
  member.id = boundId;
  member.containerId = containerId;
  container.params.is_gateway = options.isGateway === false ? "0" : "1";
  container.params.bound_device_id = boundId;
  upstreams.forEach((upstream, index) => { upstream.id = `u${prefix}${index + 1}`; });
  const edges: Edge[] = wires.map((wire, index) => {
    const upstream = upstreams[index];
    const boundTerminalId = member.terminals[wire.boundTerminal ?? 0].id;
    // 母线建出来没有端子(靠拓扑计算内部补),故上游端子可能为空
    const upstreamTerminalId = upstream.terminals[0]?.id;
    return wire.reverse
      ? { id: `e${prefix}${index + 1}`, sourceId: boundId, sourceTerminalId: boundTerminalId, targetId: upstream.id, targetTerminalId: upstreamTerminalId }
      : { id: `e${prefix}${index + 1}`, sourceId: upstream.id, sourceTerminalId: upstreamTerminalId, targetId: boundId, targetTerminalId: boundTerminalId };
  });
  const nodes = [container, member, ...upstreams];
  return {
    nodes,
    edges,
    containerId,
    boundId,
    boundTerminalIds: member.terminals.map((terminal) => terminal.id),
    upstreamIds: upstreams.map((upstream) => upstream.id),
    upstreamTerminalIds: upstreams.map((upstream) => upstream.terminals[0]?.id ?? ""),
    project: { version: 1, name: "关口拓扑模型", nodes, edges }
  };
}

/** 取某节点某端子的拓扑节点号(calculateElectricalTopology 按岛分配;同岛同号) */
function topologyNumber(nodes: ModelNode[], nodeId: string, terminalId: string): string {
  const terminal = nodes.find((node) => node.id === nodeId)?.terminals.find((item) => item.id === terminalId);
  expect(terminal, `端子不存在:${nodeId}.${terminalId}`).toBeDefined();
  return terminal!.nodeNumber;
}

describe("关口容器拓扑变换(决策 4)", () => {
  test("关口容器:合成端子 + 绑定设备上游替换为容器", () => {
    const model = makeGatewayFixture();
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    const container = nodes.find((node) => node.id === model.containerId)!;
    expect(container.terminals).toHaveLength(2);
    expect(container.terminals.every((terminal) => Boolean(terminal.nodeNumber))).toBe(true);
    // 原上游 → 容器;容器 → 绑定设备
    expect(edges.some((edge) => edge.sourceId === model.upstreamIds[0] && edge.targetId === model.containerId)).toBe(true);
    expect(edges.some((edge) => edge.sourceId === model.containerId && edge.targetId === model.boundId)).toBe(true);
    // 上游与绑定设备的直连已被改接,不并存
    expect(edges.some((edge) => edge.sourceId === model.upstreamIds[0] && edge.targetId === model.boundId)).toBe(false);
    expect(warnings).toEqual([]);
    // 画布模型(入参)不被污染
    expect(model.nodes.find((node) => node.id === model.containerId)!.terminals).toEqual([]);
    expect(model.edges).toHaveLength(1);
    expect(model.edges[0].targetId).toBe(model.boundId);
  });

  test("关口把上游与绑定设备分隔成两个拓扑节点,容器两侧同岛同号", () => {
    const model = makeGatewayFixture();
    // 变换前:上游边直连 → 上游与绑定设备同号
    const before = calculateElectricalTopology(model.nodes, model.edges);
    expect(topologyNumber(before, model.upstreamIds[0], model.upstreamTerminalIds[0]))
      .toBe(topologyNumber(before, model.boundId, model.boundTerminalIds[0]));
    // 变换后:容器串入 → 电源侧与上游同号、负荷侧与绑定设备同号,两侧互不同号
    const graph = transformGraphForGateways(model.nodes, model.edges);
    const after = calculateElectricalTopology(graph.nodes, graph.edges);
    const [power, load] = graph.nodes.find((node) => node.id === model.containerId)!.terminals;
    expect(topologyNumber(after, model.containerId, power.id))
      .toBe(topologyNumber(after, model.upstreamIds[0], model.upstreamTerminalIds[0]));
    expect(topologyNumber(after, model.containerId, load.id))
      .toBe(topologyNumber(after, model.boundId, model.boundTerminalIds[0]));
    expect(topologyNumber(after, model.upstreamIds[0], model.upstreamTerminalIds[0]))
      .not.toBe(topologyNumber(after, model.boundId, model.boundTerminalIds[0]));
  });

  test("反向画线(绑定设备作起点)同样串入,电源侧端子恒朝上游", () => {
    const model = makeGatewayFixture({ wires: [{ kind: "ac-source", reverse: true }] });
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    expect(warnings).toEqual([]);
    const [power, load] = nodes.find((node) => node.id === model.containerId)!.terminals;
    // 原「绑定设备 → 上游」拆成「绑定设备 → 容器负荷侧」+「容器电源侧 → 上游」,两段各保持原方向
    expect(edges.some((edge) => edge.sourceId === model.boundId && edge.targetId === model.containerId && edge.targetTerminalId === load.id)).toBe(true);
    expect(edges.some((edge) => edge.sourceId === model.containerId && edge.sourceTerminalId === power.id && edge.targetId === model.upstreamIds[0])).toBe(true);
    expect(edges.some((edge) => edge.sourceId === model.boundId && edge.targetId === model.upstreamIds[0])).toBe(false);
    // 拓扑不变式:电源侧与上游同岛、负荷侧与绑定设备同岛(与画法方向无关)
    const after = calculateElectricalTopology(nodes, edges);
    expect(topologyNumber(after, model.containerId, power.id))
      .toBe(topologyNumber(after, model.upstreamIds[0], model.upstreamTerminalIds[0]));
    expect(topologyNumber(after, model.containerId, load.id))
      .toBe(topologyNumber(after, model.boundId, model.boundTerminalIds[0]));
  });

  test("绑定设备无连线 → 告警并退化(不加端子、不改边)", () => {
    const model = makeGatewayFixture({ wires: [] });
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("未找到与绑定设备的连线");
    expect(nodes.find((node) => node.id === model.containerId)!.terminals).toEqual([]);
    expect(edges).toEqual(model.edges);
  });

  test("连线两端端子类型不一致 → 告警退化,原连接不得被删除", () => {
    // 交流断路器被直流电源馈入:两端端子类型不同,并查集按类型不会合并,串入必产生悬空节点
    const model = makeGatewayFixture({ wires: [{ kind: "dc-source" }] });
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("端子类型");
    expect(nodes.find((node) => node.id === model.containerId)!.terminals).toEqual([]);
    // 退化语义 = 不改边:原「上游—绑定设备」连接原样保留,既不删也不加
    expect(edges).toEqual(model.edges);
    expect(edges).toHaveLength(1);
    expect(edges[0].targetId).toBe(model.boundId);
  });

  test("直流绑定设备 + 直流上游 → 合成直流端子并进入直流节点表", () => {
    const model = makeGatewayFixture({ boundKind: "dc-breaker", wires: [{ kind: "dc-source" }] });
    const graph = transformGraphForGateways(model.nodes, model.edges);
    expect(graph.warnings).toEqual([]);
    const container = graph.nodes.find((node) => node.id === model.containerId)!;
    expect(container.terminals.map((terminal) => terminal.type)).toEqual(["dc", "dc"]);
    // 合成端子号出现在 DCNode 行(容器以自身身份进直流拓扑节点表)
    const numbers = calculateElectricalTopology(graph.nodes, graph.edges)
      .find((node) => node.id === model.containerId)!.terminals.map((terminal) => terminal.nodeNumber);
    const dcRows = parseESections(buildEFileExport(model.project).text).DCNode?.rows ?? [];
    expect(dcRows.length).toBeGreaterThan(1);
    for (const number of numbers) {
      expect(dcRows.map((row) => row.idx)).toContain(number);
    }
  });

  test("同一接线点多条连线:全部并到容器电源侧,只补一条容器↔绑定设备连线", () => {
    const model = makeGatewayFixture({ wires: [{ kind: "ac-source" }, { kind: "ac-source" }] });
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    expect(warnings).toEqual([]);
    const [power] = nodes.find((node) => node.id === model.containerId)!.terminals;
    const intoContainer = edges.filter((edge) => edge.targetId === model.containerId);
    expect(intoContainer).toHaveLength(2);
    expect(intoContainer.every((edge) => edge.targetTerminalId === power.id)).toBe(true);
    expect(edges.filter((edge) => edge.sourceId === model.containerId && edge.targetId === model.boundId)).toHaveLength(1);
    // 拓扑:两条上游本就同点(仍同号),串入后与绑定设备分属两岛
    const after = calculateElectricalTopology(nodes, edges);
    expect(topologyNumber(after, model.upstreamIds[0], model.upstreamTerminalIds[0]))
      .toBe(topologyNumber(after, model.upstreamIds[1], model.upstreamTerminalIds[1]));
    expect(topologyNumber(after, model.upstreamIds[0], model.upstreamTerminalIds[0]))
      .not.toBe(topologyNumber(after, model.boundId, model.boundTerminalIds[0]));
  });

  test("绑定设备两处接线点各有连线 → 告警退化且不改边(避免两侧短接)", () => {
    // 双绕组变压器两侧各接电源:并到一对端子会让 i_node == j_node
    const model = makeGatewayFixture({
      boundKind: "ac-transformer",
      wires: [{ kind: "ac-source", boundTerminal: 0 }, { kind: "ac-source", boundTerminal: 1 }]
    });
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("2 处不同连接点");
    expect(nodes.find((node) => node.id === model.containerId)!.terminals).toEqual([]);
    expect(edges).toEqual(model.edges);
  });

  test("两关口绑定设备直连 → 双方都告警退化且不改边", () => {
    // 同一条连线被两个关口认领:只能改一次,后写覆盖先写 → 幻影拓扑节点 + 新增边重号,故双方退化
    const first = makeGatewayFixture({ prefix: "1", wires: [] });
    const second = makeGatewayFixture({ prefix: "2", wires: [] });
    const direct: Edge = {
      id: "e12",
      sourceId: first.boundId,
      sourceTerminalId: first.boundTerminalIds[0],
      targetId: second.boundId,
      targetTerminalId: second.boundTerminalIds[0]
    };
    const nodes = [...first.nodes, ...second.nodes];
    const graph = transformGraphForGateways(nodes, [direct]);
    expect(graph.warnings).toHaveLength(2);
    expect(graph.warnings.every((warning) => warning.includes("直连另一关口"))).toBe(true);
    expect(graph.nodes.find((node) => node.id === first.containerId)!.terminals).toEqual([]);
    expect(graph.nodes.find((node) => node.id === second.containerId)!.terminals).toEqual([]);
    expect(graph.edges).toEqual([direct]);
    // 反证:去掉直连、各自接自己的上游后两个关口都能串入(见「多关口容器并存」用例,此处不重复)
  });

  test("上游为母线:端子已就绪照常串入,端子未同步则退化告警", () => {
    // 母线端子由 synchronizeBusTerminalsWithEdges 在拓扑计算内部补,而本变换在其之前解析远端端子 → 两种保存态都要钉死
    const synced = makeGatewayFixture({ wires: [{ kind: "ac-bus" }] });
    const bus = synced.nodes.find((node) => node.id === synced.upstreamIds[0])!;
    bus.terminals = [{ id: "t1", label: "交流母线端子1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "N900" }];
    synced.edges[0].sourceTerminalId = "t1";
    const spliced = transformGraphForGateways(synced.nodes, synced.edges);
    expect(spliced.warnings).toEqual([]);
    const [syncedPower] = spliced.nodes.find((node) => node.id === synced.containerId)!.terminals;
    const afterSync = calculateElectricalTopology(spliced.nodes, spliced.edges);
    // 母线侧端点被同步成 t1,与容器电源侧同岛
    expect(topologyNumber(afterSync, synced.upstreamIds[0], "t1"))
      .toBe(topologyNumber(afterSync, synced.containerId, syncedPower.id));

    // 保存态母线端子为空 → 远端端子解析不到 → 退化 + 告警(不猜类型),原连接原样保留
    const unsynced = makeGatewayFixture({ wires: [{ kind: "ac-bus" }] });
    expect(unsynced.nodes.find((node) => node.id === unsynced.upstreamIds[0])!.terminals).toEqual([]);
    const degraded = transformGraphForGateways(unsynced.nodes, unsynced.edges);
    expect(degraded.warnings).toHaveLength(1);
    expect(degraded.warnings[0]).toContain("端子类型");
    expect(degraded.nodes.find((node) => node.id === unsynced.containerId)!.terminals).toEqual([]);
    expect(degraded.edges).toEqual(unsynced.edges);
  });

  test("退化告警汇入导出告警通道(带容器 nodeId)", () => {
    const degraded = makeGatewayFixture({ wires: [] });
    const degradedWarnings = getEExportWarnings(degraded.project);
    expect(degradedWarnings.filter((warning) => warning.nodeId === degraded.containerId))
      .toEqual([expect.objectContaining({ reason: expect.stringContaining("未找到与绑定设备的连线") })]);
    // 类型不一致的退化同样进通道
    const mismatched = makeGatewayFixture({ wires: [{ kind: "dc-source" }] });
    expect(getEExportWarnings(mismatched.project).filter((warning) => warning.nodeId === mismatched.containerId))
      .toEqual([expect.objectContaining({ reason: expect.stringContaining("端子类型") })]);
    // 反证:能串入的关口不报该告警(上面的命中不是「告警通道恒有该条」)
    const wired = makeGatewayFixture();
    expect(getEExportWarnings(wired.project).filter((warning) => warning.nodeId === wired.containerId)).toEqual([]);
  });

  test("非关口容器完全不参与变换", () => {
    const model = makeGatewayFixture({ isGateway: false });
    const { nodes, edges, warnings } = transformGraphForGateways(model.nodes, model.edges);
    expect(nodes.find((node) => node.id === model.containerId)!.terminals).toEqual([]);
    expect(edges).toEqual(model.edges);
    expect(warnings).toEqual([]);
  });

  test("多关口容器并存:各自改接自己绑定设备的上游", () => {
    const first = makeGatewayFixture({ prefix: "1" });
    const second = makeGatewayFixture({ prefix: "2" });
    const nodes = [...first.nodes, ...second.nodes];
    const edges = [...first.edges, ...second.edges];
    const graph = transformGraphForGateways(nodes, edges);
    for (const model of [first, second]) {
      expect(graph.nodes.find((node) => node.id === model.containerId)!.terminals).toHaveLength(2);
      expect(graph.edges.some((edge) => edge.sourceId === model.upstreamIds[0] && edge.targetId === model.containerId)).toBe(true);
      expect(graph.edges.some((edge) => edge.sourceId === model.containerId && edge.targetId === model.boundId)).toBe(true);
    }
    expect(graph.warnings).toEqual([]);
  });

  test("关口容器合成端子后进入拓扑节点表(ACNode 多出容器串入的那一个岛)", () => {
    const gateway = makeGatewayFixture();
    const plain = makeGatewayFixture({ isGateway: false });
    const gatewayRows = parseESections(buildEFileExport(gateway.project).text).ACNode?.rows ?? [];
    const plainRows = parseESections(buildEFileExport(plain.project).text).ACNode?.rows ?? [];
    expect(gatewayRows.length).toBe(plainRows.length + 1);
    // 合成端子的拓扑号出现在拓扑节点表行 idx —— 容器确实由自己的端子驱动出了节点行(不依赖行名与行序)
    const graph = transformGraphForGateways(gateway.nodes, gateway.edges);
    const containerNumbers = calculateElectricalTopology(graph.nodes, graph.edges)
      .find((node) => node.id === gateway.containerId)!.terminals.map((terminal) => terminal.nodeNumber);
    for (const number of containerNumbers) {
      expect(gatewayRows.map((row) => row.idx)).toContain(number);
    }
  });

  test("模板态容器段静默时不做关口拓扑变换(不留无容器记录的断口)", () => {
    const options = {
      eDeviceDefinitionLabels: { ACNode: "交流节点" },
      interfaceDefinitions: [{
        componentLibrary: "ACNode",
        exportEnabled: true,
        exportName: "ACNode",
        fields: [
          { sourceName: "idx", exportEnabled: true, exportName: "idx" },
          { sourceName: "name", exportEnabled: true, exportName: "name" }
        ]
      }]
    };
    const gateway = makeGatewayFixture();
    const plain = makeGatewayFixture({ isGateway: false });
    const gatewayRows = parseESections(buildEFileExport(gateway.project, ["默认方案"], options).text).ACNode?.rows ?? [];
    const plainRows = parseESections(buildEFileExport(plain.project, ["默认方案"], options).text).ACNode?.rows ?? [];
    expect(gatewayRows.length).toBeGreaterThan(0);
    expect(gatewayRows).toEqual(plainRows);
  });

  // —— 容器关联行取端子口径(决策 4 附加):关系行能量类型无匹配端子时留空 ——

  test("容器关联行按关系能量类型取端子:类型不符留空", () => {
    const terminal = (id: string, type: TerminalType, nodeNumber: string): Terminal => ({
      id, label: id, type, nodeNumber, anchor: { x: 0, y: 0 }
    });
    const node = {
      name: "容器设备",
      params: {} as Record<string, string>,
      terminals: [terminal("t1", "ac", "7"), terminal("t2", "dc", "8")]
    };
    // 关系声明 dc,而该位是 ac 端子 → 留空(关口容器合成端子只有一种能量,不会误取另一种)
    expect(associatedNodeColumnValue(node, "idx_dc_unit_t1", "DCLoad", "i_node", [node.terminals[0]])).toBe("");
    // 同位的 dc 端子照常取号,ac 关系行取 ac 端子不受影响
    expect(associatedNodeColumnValue(node, "idx_dc_unit_t1", "DCLoad", "i_node", [node.terminals[1]])).toBe("8");
    expect(associatedNodeColumnValue(node, "idx_ac_unit_t1", "ACLoad", "i_node", [node.terminals[0]])).toBe("7");
    // 非关系行(relationKey 为空)不套能量过滤,保持按位取号的原行为
    expect(associatedNodeColumnValue(node, "", "ACLoad", "i_node", [node.terminals[0]])).toBe("7");
    // j_node 同口径
    expect(associatedNodeColumnValue(node, "idx_dc_unit_t1", "DCLoad", "j_node", [node.terminals[0], node.terminals[0]])).toBe("");
  });
});
