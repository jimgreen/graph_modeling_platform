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
  buildDefaultParams,
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
  normalizeDeviceParamRecord,
  normalizeSemanticParameterValues,
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

describe("power system model", () => {





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

  test("rejects different terminals from the same device landing on one bus", () => {
    const branch = createDefaultNode("ac-line", { x: 160, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 360, y: 100 });
    const existing: Edge = {
      id: "existing-bus-terminal",
      sourceId: branch.id,
      targetId: bus.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1",
      targetPoint: { x: 320, y: 100 }
    };

    const issues = validateConnectionEndpointRules([branch, bus], [existing], {
      id: "same-device-same-bus",
      sourceId: bus.id,
      targetId: branch.id,
      sourceTerminalId: "t2",
      sourcePoint: { x: 400, y: 100 },
      targetTerminalId: "t2"
    });

    expect(issues).toEqual([
      expect.objectContaining({
        type: "same-device-same-bus-endpoints",
        conflictingEdgeId: existing.id,
        message: expect.stringContaining("同一个设备的两个端点不能落在同一个母线上")
      })
    ]);
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









  test("normalizes state image fit settings for persisted state visuals", () => {
    const states = normalizeDeviceStateDefinitions([
      {
        value: "1",
        name: "合位",
        image: apiPath("/images/state-closed"),
        imageFit: "stretch",
        backgroundImage: apiPath("/images/state-bg"),
        backgroundImageFit: "tile"
      },
      {
        value: "2",
        name: "分位",
        image: apiPath("/images/state-open"),
        imageFit: ""
      }
    ]);

    expect(states[0]).toMatchObject({
      value: "1",
      name: "合位",
      imageFit: "stretch",
      backgroundImageFit: "tile"
    });
    expect(states[1]).not.toHaveProperty("imageFit");
  });








  test("adds box breaker as an ACBreak device with two AC terminals", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-box-breaker");
    expect(template).toMatchObject({
      label: "盒型开关",
      categoryLibrary: "交流设备",
      terminalType: "ac",
      terminalCount: 2,
      params: expect.objectContaining({ status: "1" })
    });

    const node = createDefaultNode("ac-box-breaker", { x: 100, y: 100 });
    node.name = "盒型开关1";

    expect(node.terminals).toHaveLength(2);
    expect(node.terminals.map((terminal) => terminal.type)).toEqual(["ac", "ac"]);
    expect(node.terminals.map((terminal) => terminal.anchor)).toEqual([{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }]);
    expect(getDeviceGlyphVariant("ac-box-breaker")).toBe("box-breaker");
    expect(getEParameterKeys("ac-box-breaker", node.params)).toEqual([...E_SECTION_COLUMNS.ACBreak, "i"]);

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
























































































  test("preserves a vertical-then-horizontal three-point drag preview when the target moves", () => {
    const preserved = preserveDraggedRouteShape({
      routePoints: [
        { x: 420, y: 180 },
        { x: 420, y: 260 },
        { x: 560, y: 260 }
      ],
      nextStart: { x: 420, y: 180 },
      nextEnd: { x: 610, y: 320 },
      sourceDelta: { x: 0, y: 0 },
      targetDelta: { x: 50, y: 60 },
      sourceNormal: { x: 0, y: 1 },
      targetNormal: { x: -1, y: 0 }
    });

    expect(preserved).toEqual([
      { x: 420, y: 180 },
      { x: 420, y: 320 },
      { x: 610, y: 320 }
    ]);
    expectOrthogonalSegments(preserved);
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

  test("defines all electric generation devices as single-terminal derived devices, not containers", () => {
    for (const expected of electricGenerationCases) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === expected.kind);
      expect(template).toMatchObject({
        label: expected.label,
        categoryLibrary: expected.terminalType === "ac" ? "交流设备" : "直流设备",
        terminalType: expected.terminalType,
        terminalCount: 1,
        terminalLabels: [expected.terminalLabel],
        terminalRoles: ["single-source"],
        params: expect.objectContaining({
          source_type: expected.source_type,
          rated_voltage: expected.rated_voltage,
          rated_capacity: expected.rated_power
        })
      });
      expect(template?.terminalAssociations).toBeUndefined();
      expect(template?.isContainer).toBeFalsy();

      const node = createDefaultNode(expected.kind, { x: 100, y: 100 });
      expect(node.name).toBe(expected.label);
      expect(node.terminals).toMatchObject([
        { id: "t1", label: expected.terminalLabel, type: expected.terminalType }
      ]);
      expect(node.params).toMatchObject({
        source_type: expected.source_type,
        rated_voltage: expected.rated_voltage,
        rated_capacity: expected.rated_power
      });
      expect(node.params).not.toHaveProperty("rated_power");
      expect(node.params).not.toHaveProperty("is_container");
      expect(node.params).not.toHaveProperty(expected.relationKey);
      if (expected.family === "storage") {
        expect(node.params.vbase).toBe("0");
      } else {
        expect(node.params).not.toHaveProperty("control_type");
        expect(node.params).not.toHaveProperty("vbase");
      }

      const associatedViews = buildContainerDeviceParameterViews(node, template!).filter((view) => view.kind === "associated");
      expect(associatedViews).toHaveLength(0);

      const definitions = new Map(getTemplateParameterDefinitions(template!).map((definition) => [definition.enName, definition]));
      expect(definitions.get("idx")).toMatchObject({ valueType: "integer", readonly: true });
      expect(definitions.get("name")).toMatchObject({ valueType: "string", readonly: true });
      expect(definitions.get("status")).toMatchObject({ valueType: "numberEnum", enumValues: ["1", "0"], readonly: false });
      expect(definitions.get("run_stat")).toMatchObject({
        valueType: "numberEnum",
        typicalValue: "1",
        enumValueType: "number",
        enumValues: ["1", "0"],
        enumOptions: [
          { value: "1", label: "运行" },
          { value: "0", label: "停运" }
        ],
        readonly: false
      });
      expect(definitions.get(expected.relationKey)).toBeUndefined();
      expect(definitions.get("source_type")).toMatchObject({ valueType: "string", readonly: true });
      expect(definitions.has("rated_power")).toBe(false);
      expect(definitions.has("rated_capacity")).toBe(false);
      expect(definitions.has("rated_voltage")).toBe(false);
    }
  });





























  test("does not describe three-winding transformer terminals as internal two-winding devices", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer")!;

    expect(template.isContainer).toBe(false);
    expect(describeContainerTerminalAssociations(template)).toEqual([]);
    expect(getTemplateParameterDefinitions(template).map((definition) => definition.enName)).toEqual(expect.arrayContaining([
      "r1",
      "r2",
      "r3"
    ]));
    const fieldNames = getTemplateParameterDefinitions(template).map((definition) => definition.enName);
    expect(fieldNames).not.toContain("high_resistance_pu");
    expect(fieldNames).not.toContain("medium_resistance_pu");
    expect(fieldNames).not.toContain("low_resistance_pu");
    expect(fieldNames).not.toContain("idx_xf_t1");
    expect(fieldNames).not.toContain("idx_xf_t2");
    expect(fieldNames).not.toContain("idx_xf_t3");
  });









































  test("adds run_stat operating status to every device type", () => {
    expect(buildDefaultDeviceParameterDefinitions(["ac"]).find((definition) => definition.enName === "run_stat")).toMatchObject({
      cnName: "工作状态",
      valueType: "numberEnum",
      typicalValue: "1",
      enumValueType: "number",
      enumValues: ["1", "0"],
      enumOptions: [
        { value: "1", label: "运行" },
        { value: "0", label: "停运" }
      ],
      readonly: false
    });
    const deviceTemplates = DEVICE_LIBRARY.filter((template) => (
      !isStaticNode({ kind: template.kind, params: template.params } as ModelNode)
    ));
    expect(deviceTemplates.length).toBeGreaterThan(0);
    for (const template of deviceTemplates) {
      const definitions = getTemplateParameterDefinitions(template)
        .filter((definition) => definition.enName === "run_stat");
      expect(definitions, `${template.label} (${template.kind})`).toHaveLength(1);
      expect(definitions[0], `${template.label} (${template.kind})`).toMatchObject({
        valueType: "numberEnum",
        typicalValue: "1",
        enumValueType: "number",
        enumValues: ["1", "0"],
        enumOptions: [
          { value: "1", label: "运行" },
          { value: "0", label: "停运" }
        ]
      });
      expect(buildDefaultParams(template).run_stat, `${template.label} (${template.kind})`).toBe("1");
      const node = createDefaultNode(template.kind, { x: 100, y: 100 });
      expect(node.params.run_stat).toBe("1");
    }
  });

  test("migrates known run_stat aliases and empty values without hiding unknown values", () => {
    const expected = new Map<string, string>([
      ["运行", "1"], ["投运", "1"], ["on", "1"], ["true", "1"],
      ["停运", "0"], ["检修", "0"], ["off", "0"], ["false", "0"],
      ["", "1"], ["UNKNOWN", "UNKNOWN"]
    ]);

    for (const [source, target] of expected) {
      expect(normalizeDeviceParamRecord({ run_stat: source })?.run_stat).toBe(target);
    }

    const storedDefinitions = JSON.stringify([{
      cnName: "工作状态",
      enName: "run_stat",
      valueType: "stringEnum",
      typicalValue: "运行",
      enumValues: ["运行", "停运"]
    }]);
    const normalizedDefinitions = JSON.parse(
      normalizeDeviceParamRecord({ _customParamDefinitions: storedDefinitions })!._customParamDefinitions
    );
    expect(normalizedDefinitions[0]).toMatchObject({
      enName: "run_stat",
      valueType: "numberEnum",
      typicalValue: "1",
      enumValueType: "number",
      enumValues: ["1", "0"],
      enumOptions: [
        { value: "1", label: "运行" },
        { value: "0", label: "停运" }
      ]
    });
  });

  test("preserves canonical visual metadata while normalizing business parameter names", () => {
    const normalized = normalizeDeviceParamRecord({
      backgroundImage: "data:image/svg+xml,fingerprint",
      backgroundImageAssetId: "fingerprint-asset",
      backgroundImageFit: "contain",
      fillColor: "transparent",
      strokeColor: "#2563eb",
      lineWidth: "2",
      ratedCapacity: "5 MW"
    })!;

    expect(normalized).toMatchObject({
      backgroundImage: "data:image/svg+xml,fingerprint",
      backgroundImageAssetId: "fingerprint-asset",
      backgroundImageFit: "contain",
      fillColor: "transparent",
      strokeColor: "#2563eb",
      lineWidth: "2",
      rated_capacity: "5"
    });
    expect(normalized).not.toHaveProperty("background_image");
    expect(normalized).not.toHaveProperty("background_image_asset_id");
    expect(normalized).not.toHaveProperty("fill_color");
    expect(normalized).not.toHaveProperty("stroke_color");

    const allVisualParams = Object.fromEntries(
      Array.from(DEVICE_VISUAL_PARAM_KEYS, (key) => [key, `${key}-value`])
    );
    const normalizedVisualParams = normalizeDeviceParamRecord(allVisualParams)!;
    for (const [key, value] of Object.entries(allVisualParams)) {
      expect(normalizedVisualParams[key], key).toBe(value);
    }

    const visualValues = Object.fromEntries(
      Array.from(DEVICE_VISUAL_PARAM_KEYS, (key) => [key, `${key}: 10 MW / 99%`])
    );
    expect(normalizeSemanticParameterValues(visualValues)).toBe(visualValues);
  });

  test("migrates legacy SOC params and definitions while preferring canonical values", () => {
    const legacyDefinitions = JSON.stringify([
      { cnName: "荷电状态", enName: "state_of_charge", valueType: "float", typicalValue: "50" },
      { cnName: "SOC", enName: "soc", valueType: "float", typicalValue: "0.6" }
    ]);
    const normalized = normalizeDeviceParamRecord({
      state_of_charge: "50",
      soc: "0.6",
      soc_upper_limit: "90",
      soc_lower_limit: "10%",
      _customParamDefinitions: legacyDefinitions
    })!;

    expect(normalized).toMatchObject({ soc: "0.6", soc_upper_limit: "0.9", soc_lower_limit: "0.1" });
    expect(normalized).not.toHaveProperty("state_of_charge");
    expect(JSON.parse(normalized._customParamDefinitions)).toEqual([
      expect.objectContaining({ cnName: "SOC", enName: "soc", typicalValue: "0.6" })
    ]);
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

  test("selects the next or previous project in the same scheme after deleting the active project", () => {
    const first = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const second = createSavedProject("模型B", { version: 1, name: "模型B", nodes: [], edges: [] });
    const third = createSavedProject("模型C", { version: 1, name: "模型C", nodes: [], edges: [] });
    const scheme = createSavedScheme("方案A", [first, second, third]);

    expect(nextSavedProjectAfterProjectDeletion([scheme], second.id)?.project.name).toBe("模型C");
    expect(nextSavedProjectAfterProjectDeletion([scheme], third.id)?.project.name).toBe("模型B");
    expect(nextSavedProjectAfterProjectDeletion([createSavedScheme("空方案", [first])], first.id)).toBeNull();
  });

  test("selects the nearest remaining project after deleting a batch that includes the active project", () => {
    const first = createSavedProject("模型A", { version: 1, name: "模型A", nodes: [], edges: [] });
    const second = createSavedProject("模型B", { version: 1, name: "模型B", nodes: [], edges: [] });
    const third = createSavedProject("模型C", { version: 1, name: "模型C", nodes: [], edges: [] });
    const fourth = createSavedProject("模型D", { version: 1, name: "模型D", nodes: [], edges: [] });
    const scheme = createSavedScheme("方案A", [first, second, third, fourth]);

    expect(nextSavedProjectAfterProjectBatchDeletion([scheme], second.id, new Set([first.id, second.id]))?.project.name).toBe("模型C");
    expect(nextSavedProjectAfterProjectBatchDeletion([scheme], second.id, new Set([second.id, third.id]))?.project.name).toBe("模型D");
    expect(nextSavedProjectAfterProjectBatchDeletion([scheme], second.id, new Set([second.id, third.id, fourth.id]))?.project.name).toBe("模型A");
    expect(nextSavedProjectAfterProjectBatchDeletion([scheme], second.id, new Set([first.id, second.id, third.id, fourth.id]))).toBeNull();
  });

  test("selects neighboring scheme projects after deleting the active scheme", () => {
    const firstProject = createSavedProject("方案A模型", { version: 1, name: "方案A模型", nodes: [], edges: [] });
    const secondFirstProject = createSavedProject("方案B模型1", { version: 1, name: "方案B模型1", nodes: [], edges: [] });
    const secondLastProject = createSavedProject("方案B模型2", { version: 1, name: "方案B模型2", nodes: [], edges: [] });
    const thirdProject = createSavedProject("方案C模型", { version: 1, name: "方案C模型", nodes: [], edges: [] });
    const first = createSavedScheme("方案A", [firstProject]);
    const second = createSavedScheme("方案B", [secondFirstProject, secondLastProject]);
    const third = createSavedScheme("方案C", [thirdProject]);

    expect(nextSavedProjectAfterSchemeDeletion([first, second, third], second.id, new Set([second.id]))?.project.name).toBe("方案C模型");
    expect(nextSavedProjectAfterSchemeDeletion([first, second], second.id, new Set([second.id]))?.project.name).toBe("方案A模型");
    expect(nextSavedProjectAfterSchemeDeletion([second], second.id, new Set([second.id]))).toBeNull();
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

  test("merges startup local-only models with backend schemes without dropping unsynced work", () => {
    const localOnly = createSavedProject("qinling", {
      version: 1,
      name: "qinling",
      canvasWidth: 2400,
      nodes: [createDefaultNode("ac-bus", { x: 100, y: 100 })],
      edges: []
    });
    const olderBackend = {
      ...createSavedProject("山西", {
        version: 1,
        name: "山西",
        canvasWidth: 1200,
        nodes: [],
        edges: []
      }),
      updatedAt: "2026-06-07T12:00:00.000Z"
    };
    const newerLocal = {
      ...createSavedProject("山西", {
        version: 1,
        name: "山西",
        canvasWidth: 1800,
        nodes: [],
        edges: []
      }),
      updatedAt: "2026-06-08T12:00:00.000Z"
    };
    const backendOnly = createSavedProject("test", {
      version: 1,
      name: "test",
      canvasWidth: 1600,
      nodes: [],
      edges: []
    });
    const local = [createSavedScheme("默认方案", [localOnly, newerLocal])];
    const backend = [createSavedScheme("默认方案", [olderBackend, backendOnly])];

    const merged = mergeSavedSchemesForStartup(local, backend);
    const defaultScheme = merged.find((scheme) => scheme.name === "默认方案");

    expect(defaultScheme?.projects.map((project) => project.name).sort()).toEqual(["qinling", "test", "山西"].sort());
    expect(defaultScheme?.projects.find((project) => project.name === "qinling")?.project.nodes).toHaveLength(1);
    expect(defaultScheme?.projects.find((project) => project.name === "山西")?.project.canvasWidth).toBe(1800);
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




















































});
