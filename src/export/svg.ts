// SVG 自包含导出纯模块（Node 可直载，供后端 /api/v1/runtime/svg 端点复用）。
// 来源：src/appExtracted/appPersistenceLibraryExport.tsx（Task 13 整段剪切）。
// 约束：不得 import 任何 .tsx 模块（闭包检查 tsx 0）。
// 图片资源读取经 setSvgImageAssetsReader 注入（.tsx 侧注册真实实现），Node 侧默认空表。
import type {
  CanvasBounds,
  ColorDisplayMode,
  ColorPalette,
  DeviceStateVisual,
  DeviceTemplate,
  Edge,
  ModelLayer,
  ModelNode,
  ProjectFile,
  TerminalType
} from "../model.ts";
import {
  CUSTOM_DEVICE_TEMPLATE_KEY,
  DEFAULT_COLOR_PALETTE,
  DEFAULT_MODEL_LAYER_ID,
  DEVICE_LIBRARY,
  containerAssociatedDeviceIdentityForTerminal,
  getConnectionStrokeColor,
  getDeviceGlyphVariant,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getSwitchVisualState,
  getTemplateStateDefinitions,
  getTerminalDisplayColor,
  isRoutableLineDeviceKind,
  isStaticButtonCapableNode,
  isStaticNode,
  normalizeColorPalette,
  resolveDeviceStateVisual,
  switchingDeviceUsesClosedStatus,
  terminalVoltageBaseNumber,
  voltageLevelColor
} from "../model.ts";
import {
  boundaryBusInternalConnectorSegment,
  boundaryBusInternalConnectorStrokeWidth,
  calculateElectricalTopology,
  getBusTerminalType,
  getEdgeEndpointPoint as getModelEdgeEndpointPoint,
  isBusNode,
  normalizeModelLayers,
  orderNodesByModelLayer,
  routeEdgesForSavedPathRendering,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth
} from "../model-routing.ts";
import { getNodeScaleX, getNodeScaleY } from "../model-canvas-ops.ts";
import { inferESection } from "../model-eexport.ts";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  EMPTY_PROJECT_MEASUREMENTS,
  type PlatformMeasurementConfig,
  type ProjectMeasurementConfig
} from "../measurements.ts";
import {
  backendImageIdFromHref,
  escapeXml,
  formatSvgNumber,
  inlineBackendImageRefsInSvgDataUrl,
  renderSvgElementMarkup,
  svgImageContentMarkup,
  svgStrokeDashArray
} from "../svgUtils.ts";
import {
  buildExportDeviceIdMap,
  buildExportMeasurementGroupMarkup,
  buildSvgNodeLabelMarkup,
  buildSvgNodeLabelTextElementsMarkup,
  exportDeviceMetadataAttributes,
  exportSvgLayerId,
  exportSvgLayerScriptMarkup,
  exportSvgSafeId,
  exportSvgUniqueId,
  svgDisplayAttribute
} from "../svgExportUtils.ts";
import { DeviceGlyph } from "../DeviceGlyph.ts";
import { deviceStateVisualToken, resolveStateVisualImageHref } from "../staticRenderUtils.ts";
import { resolveStaticButtonTargetLayers } from "./static-button-targets.ts";

// DEFAULT_CANVAS_* 原唯一定义在 appCoreCanvasUtilities.tsx（.tsx），此处本地定义同值常量
// （与 CanvasRenderOptions 同为 .tsx 唯一定义的本地化处理）。改值必须同时改两处：
// golden 基线显式传宽高/底色、不覆盖默认分支；默认底色的漂移由 src/export/svg.test.ts 的默认值断言守护，
// 宽高默认值暂无自动守护。
// 宽高导出供 server/svgExport.mjs 复用：适配层不再自带第三份默认字面量
export const DEFAULT_CANVAS_WIDTH = 1920;
export const DEFAULT_CANVAS_HEIGHT = 1024;
const DEFAULT_CANVAS_BACKGROUND = "#f1f5f9";

// CanvasRenderOptions 原唯一定义在 appCoreCanvasUtilities.tsx（.tsx），此处本地定义同构类型（纯类型，编译期擦除），
// 并按 Task 13 brief 新增 imageAssets 可注入字段。
export type CanvasRenderOptions = CanvasBounds & {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundImageFit?: string;
  backgroundPage?: {
    nodes?: ModelNode[];
    edges?: Edge[];
    project?: ProjectFile;
    backgroundBounds?: CanvasBounds;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    transform?: string;
  } | null;
  imageExportPathById?: Record<string, string>;
  imageAssets?: Record<string, string>;
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: ColorPalette;
  deviceTemplates?: DeviceTemplate[];
  layers?: ModelLayer[];
  activeLayerId?: string;
  measurements?: ProjectMeasurementConfig;
  measurementConfig?: PlatformMeasurementConfig;
};

// readImageAssets 惰性注入：appCoreCanvasUtilities.tsx 是 .tsx，顶层 import 会把 React 拖进 Node 闭包。
// 真实实现由 appPersistenceLibraryExport.tsx（浏览器侧）注册。
let readImageAssetsImpl: () => Record<string, string> = () => ({});
export function setSvgImageAssetsReader(fn: () => Record<string, string>) {
  readImageAssetsImpl = fn;
}
function readImageAssets() {
  return readImageAssetsImpl();
}

// resolveNodeImage / resolveNodeForegroundImage 原实现位于 appCoreCanvasUtilities.tsx 的同名函数（.tsx），
// 纯函数复制内联（不 import，避免拖入 .tsx）；改实现时两处需同步。
function resolveNodeImage(node: ModelNode, assets: Record<string, string>) {
  const assetId = node.params.backgroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.backgroundImage || "";
}
function resolveNodeForegroundImage(node: ModelNode, assets: Record<string, string>) {
  const assetId = node.params.foregroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.foregroundImage || "";
}

export function exportSvgImageHref(value: string, imageExportPathById: Record<string, string> = {}) {
  const href = inlineBackendImageRefsInSvgDataUrl(String(value ?? ""), imageExportPathById);
  const id = backendImageIdFromHref(href);
  if (!id) {
    return href;
  }
  return imageExportPathById[id] || href;
}

export function nodeGeometryTransform(node: ModelNode) {
  if (isRoutableLineDeviceKind(node.kind)) {
    return "rotate(0) scale(1 1)";
  }
  return `rotate(${formatSvgNumber(node.rotation)}) scale(${formatSvgNumber(getNodeScaleX(node))} ${formatSvgNumber(getNodeScaleY(node))})`;
}

export function backgroundPageCanvasTransform(sourceBounds: CanvasBounds, targetBounds: CanvasBounds) {
  const sourceWidth = Math.max(1, sourceBounds.width);
  const sourceHeight = Math.max(1, sourceBounds.height);
  const targetWidth = Math.max(1, targetBounds.width);
  const targetHeight = Math.max(1, targetBounds.height);
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const x = (targetWidth - sourceWidth * safeScale) / 2;
  const y = (targetHeight - sourceHeight * safeScale) / 2;
  return `translate(${formatSvgNumber(x)} ${formatSvgNumber(y)}) scale(${formatSvgNumber(safeScale)})`;
}

export function buildSvgDeviceConnectorMarkup(node: ModelNode, colorDisplayMode: ColorDisplayMode = "energy", colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE) {
  if (isBusNode(node) || isStaticNode(node) || isRoutableLineDeviceKind(node.kind)) {
    return "";
  }
  const nodeScaleX = getNodeScaleX(node);
  const nodeScaleY = getNodeScaleY(node);
  const dashArray = svgStrokeDashArray(node.params.strokeStyle);
  const dashAttribute = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
  const connectors = node.terminals
    .map((terminal) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
      const strokeWidth = terminalStubStrokeWidth(node, terminal);
      const terminalColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
      return `<g transform="translate(${formatSvgNumber(renderPoint.x)} ${formatSvgNumber(renderPoint.y)})">
  <line x1="${formatSvgNumber(stub.from.x)}" y1="${formatSvgNumber(stub.from.y)}" x2="${formatSvgNumber(stub.to.x)}" y2="${formatSvgNumber(stub.to.y)}" stroke="${escapeXml(terminalColor)}" stroke-width="${formatSvgNumber(strokeWidth)}" stroke-linecap="round"${dashAttribute}/>
</g>`;
    })
    .join("\n");
  return connectors;
}

const BACKGROUND_PAGE_EXPORT_ID_PREFIX = "export_bg_";

function prefixNestedSvgDocumentIds(svg: string, prefix: string) {
  return svg
    .replace(/(\s)id="([^"]+)"/g, (_match, leadingSpace, id) => `${leadingSpace}id="${escapeXml(`${prefix}${id}`)}"`)
    .replace(/(\s)(href|xlink:href)="#([^"]+)"/g, (_match, leadingSpace, attributeName, id) => `${leadingSpace}${attributeName}="#${escapeXml(`${prefix}${id}`)}"`)
    .replace(/url\(#([^)]+)\)/g, (_match, id) => `url(#${escapeXml(`${prefix}${id}`)})`);
}

function nestedSvgDocumentRoot(svg: string, width: number, height: number) {
  const root = `<svg class="export-background-page-svg" x="0" y="0" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" preserveAspectRatio="xMidYMid meet" viewBox="0,0,${formatSvgNumber(width)},${formatSvgNumber(height)}">`;
  return svg.replace(/<svg\b[^>]*>/iu, root);
}

export function buildSvgDocument(nodes: ModelNode[], edges: Edge[], canvasSize: CanvasRenderOptions = { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }) {
  const imageAssets = canvasSize.imageAssets ?? readImageAssets();
  const imageExportPathById = canvasSize.imageExportPathById ?? {};
  const svgTemplateByKind = new Map((canvasSize.deviceTemplates ?? DEVICE_LIBRARY).map((template) => [template.kind, template]));
  const resolveSvgNodeTemplate = (node: ModelNode) => svgTemplateByKind.get(node.kind);
  const resolveSvgNodeStateVisual = (node: ModelNode) => {
    const template = resolveSvgNodeTemplate(node);
    return template ? resolveDeviceStateVisual(template, node) : null;
  };
  const backgroundColor = canvasSize.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND;
  const backgroundImage = exportSvgImageHref(canvasSize.backgroundImage ?? "", imageExportPathById);
  const escapedBackgroundColor = escapeXml(backgroundColor);
  const colorDisplayMode = canvasSize.colorDisplayMode ?? "energy";
  const colorPalette = normalizeColorPalette(canvasSize.colorPalette ?? DEFAULT_COLOR_PALETTE);
  const buildBackgroundPageExportMarkup = () => {
    const backgroundPage = canvasSize.backgroundPage;
    if (!backgroundPage) {
      return "";
    }
    const backgroundProject = backgroundPage.project;
    const backgroundBounds = backgroundPage.backgroundBounds ?? {
      width: backgroundProject?.canvasWidth ?? canvasSize.width,
      height: backgroundProject?.canvasHeight ?? canvasSize.height
    };
    const backgroundWidth = Math.max(1, Number(backgroundBounds.width) || canvasSize.width);
    const backgroundHeight = Math.max(1, Number(backgroundBounds.height) || canvasSize.height);
    const backgroundNodes = backgroundPage.nodes ?? backgroundProject?.nodes ?? [];
    const backgroundEdges = backgroundPage.edges ?? backgroundProject?.edges ?? [];
    const backgroundSvg = buildSvgDocument(backgroundNodes, backgroundEdges, {
      width: backgroundWidth,
      height: backgroundHeight,
      backgroundColor: backgroundPage.backgroundColor ?? backgroundProject?.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
      backgroundImage: backgroundPage.backgroundImageUrl ?? backgroundProject?.canvasBackgroundImage ?? "",
      backgroundImageFit: backgroundProject?.canvasBackgroundImageFit,
      imageExportPathById,
      colorDisplayMode,
      colorPalette,
      deviceTemplates: canvasSize.deviceTemplates
    });
    const scopedBackgroundSvg = nestedSvgDocumentRoot(
      prefixNestedSvgDocumentIds(backgroundSvg, BACKGROUND_PAGE_EXPORT_ID_PREFIX),
      backgroundWidth,
      backgroundHeight
    );
    const transform = backgroundPage.transform ?? backgroundPageCanvasTransform(
      { width: backgroundWidth, height: backgroundHeight },
      { width: canvasSize.width, height: canvasSize.height }
    );
    return `<g class="export-background-page-layer" transform="${escapeXml(transform)}" pointer-events="none">
${scopedBackgroundSvg}
<rect class="export-background-page-frame" x="0" y="0" width="${formatSvgNumber(backgroundWidth)}" height="${formatSvgNumber(backgroundHeight)}" fill="transparent" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" pointer-events="none"/>
</g>`;
  };
  const normalizedLayers = normalizeModelLayers(canvasSize.layers, nodes, canvasSize.activeLayerId);
  const exportNodes = orderNodesByModelLayer(nodes, normalizedLayers);
  const existingNumericNodeNumber = (value: unknown) => {
    const normalized = String(value ?? "").trim();
    if (/^\d+$/.test(normalized)) {
      return normalized;
    }
    return /^N(\d+)$/i.exec(normalized)?.[1] ?? "";
  };
  const calculatedTopologyNodeById = new Map(
    calculateElectricalTopology(nodes, edges).map((node) => [node.id, node])
  );
  const topologyNodeById = new Map(nodes.map((node) => {
    const calculated = calculatedTopologyNodeById.get(node.id) ?? node;
    const originalTerminalById = new Map(node.terminals.map((terminal) => [terminal.id, terminal]));
    const terminals = calculated.terminals.map((terminal, index) => ({
      ...terminal,
      nodeNumber: existingNumericNodeNumber(
        originalTerminalById.get(terminal.id)?.nodeNumber ?? node.terminals[index]?.nodeNumber
      ) || terminal.nodeNumber
    }));
    return [node.id, {
      ...calculated,
      nodeNumber: existingNumericNodeNumber(node.nodeNumber) || calculated.nodeNumber,
      terminals
    }];
  }));
  const activeExportLayerId = normalizedLayers.some((layer) => layer.id === canvasSize.activeLayerId)
    ? canvasSize.activeLayerId!
    : normalizedLayers[0]?.id ?? DEFAULT_MODEL_LAYER_ID;
  const layerById = new Map(normalizedLayers.map((layer) => [layer.id, layer]));
  const layerVisible = (layerId: string) => layerById.get(layerId)?.visible !== false;
  const nodeLayerId = (node: ModelNode) =>
    layerById.has(node.layerId ?? "") ? node.layerId! : DEFAULT_MODEL_LAYER_ID;
  const usedSvgIds = new Set<string>(["root_g"]);
  const rootId = "root_g";
  const defsId = exportSvgUniqueId("svg_defs", usedSvgIds, "svg_defs");
  const backgroundLayerId = exportSvgUniqueId(exportSvgLayerId("Background", "Background"), usedSvgIds, "Background_Layer");
  const segmentLayerId = exportSvgUniqueId(exportSvgLayerId("Segment", "Segment"), usedSvgIds, "Segment_Layer");
  const textLayerId = exportSvgUniqueId(exportSvgLayerId("Text", "Text"), usedSvgIds, "Text_Layer");
  const measurementLayerId = exportSvgUniqueId(exportSvgLayerId("Measurement", "Measurement"), usedSvgIds, "Measurement_Layer");
  const otherLayerId = exportSvgUniqueId(exportSvgLayerId("Other", "Other"), usedSvgIds, "Other_Layer");
  const exportNodeType = (node: ModelNode) => inferESection(node.kind, node.params) || node.kind || "Other";
  const exportNodeLayerKey = (node: ModelNode) => isStaticNode(node) ? "Other" : exportNodeType(node);
  const nodeTypeLayerIds = new Map<string, string>();
  for (const node of exportNodes) {
    const layerKey = exportNodeLayerKey(node);
    if (!nodeTypeLayerIds.has(layerKey)) {
      nodeTypeLayerIds.set(layerKey, exportSvgUniqueId(exportSvgLayerId(layerKey, "Device"), usedSvgIds, "Device_Layer"));
    }
  }
  const exportDeviceIdByNodeId = buildExportDeviceIdMap(exportNodes, usedSvgIds);
  const resolveExportLayerButtonTargetIds = (node: ModelNode) => {
    if (!isStaticButtonCapableNode(node) || node.params.buttonEnabled !== "1" || node.params.buttonActionType !== "layer") {
      return [];
    }
    return resolveStaticButtonTargetLayers(node, normalizedLayers).map((layer) => layer.id);
  };
  const exportLayerDefinitionsMarkup = normalizedLayers
    .map((layer) =>
      `<g layer-id="${escapeXml(layer.id)}" name="${escapeXml(layer.name)}" visible="${layer.visible === false ? "0" : "1"}" active="${layer.id === activeExportLayerId ? "1" : "0"}"/>`
    )
    .join("\n");
  const hasLayerButtons = exportNodes.some((node) => resolveExportLayerButtonTargetIds(node).length > 0);
  const includeLayerScript = hasLayerButtons || normalizedLayers.length > 1;
  const nodeById = new Map(exportNodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  type ExportVoltageTerminal = ModelNode["terminals"][number];
  const isExportElectricTerminalType = (type?: TerminalType): type is "ac" | "dc" => type === "ac" || type === "dc";
  const exportVoltageValue = (value?: string) => terminalVoltageBaseNumber(value) || "0";
  const nonZeroExportVoltageValue = (value?: string) => {
    const normalized = terminalVoltageBaseNumber(value);
    return normalized && Number(normalized) !== 0 ? normalized : "";
  };
  const firstNonZeroExportVoltageValue = (values: Array<string | undefined>) => {
    for (const value of values) {
      const normalized = nonZeroExportVoltageValue(value);
      if (normalized) {
        return normalized;
      }
    }
    return "";
  };
  const terminalIndexForExportVoltage = (node: ModelNode, terminal?: ExportVoltageTerminal) =>
    terminal?.id ? node.terminals.findIndex((candidate) => candidate.id === terminal.id) : node.terminals.length === 1 ? 0 : -1;
  const terminalSideExportVoltage = (node: ModelNode, terminalIndex: number) => {
    if (terminalIndex < 0) {
      return "";
    }
    const isThreeWindingTransformer = node.kind === "ac-three-winding-transformer" ||
      node.kind === "ac-three-winding-transformer-neutral";
    if (isThreeWindingTransformer) {
      return firstNonZeroExportVoltageValue(([
        [node.params.i_vbase, node.params.high_vbase, node.params.highVbase],
        [node.params.k_vbase, node.params.medium_vbase, node.params.mediumVbase],
        [node.params.j_vbase, node.params.low_vbase, node.params.lowVbase],
        [node.params.neutral_vbase]
      ] as Array<Array<string | undefined>>)[terminalIndex] ?? []);
    }
    if (terminalIndex === 0) {
      return firstNonZeroExportVoltageValue([node.params.i_vbase, node.params.sourceVbase, node.params.high_vbase, node.params.highVbase]);
    }
    if (terminalIndex === 1) {
      return firstNonZeroExportVoltageValue([node.params.j_vbase, node.params.targetVbase, node.params.low_vbase, node.params.lowVbase]);
    }
    return "";
  };
  const terminalExportVoltage = (node: ModelNode, terminal?: ExportVoltageTerminal) => {
    const rawTerminalVoltage = exportVoltageValue(terminal?.vbase);
    const terminalVoltage = nonZeroExportVoltageValue(terminal?.vbase);
    if (terminalVoltage) {
      return terminalVoltage;
    }
    const sideVoltage = terminalSideExportVoltage(node, terminalIndexForExportVoltage(node, terminal));
    if (sideVoltage) {
      return sideVoltage;
    }
    if (rawTerminalVoltage !== "0") {
      return rawTerminalVoltage;
    }
    return firstNonZeroExportVoltageValue([
      node.params.vbase,
      node.params.voltageLevel
    ]) || rawTerminalVoltage;
  };
  const exportVoltageClassSuffix = (voltage: string) => exportVoltageValue(voltage).replace(/[^A-Za-z0-9_-]+/g, "_") || "0";
  const exportVoltageDeviceClass = (type: "ac" | "dc", voltage: string) =>
    `${type === "dc" ? "dcv" : "kv"}${exportVoltageClassSuffix(voltage)}`;
  const exportVoltageLineClass = (type: "ac" | "dc", voltage: string) =>
    `${type === "dc" ? "ldcv" : "lkv"}${exportVoltageClassSuffix(voltage)}`;
  const exportVoltageCssColor = (color: string) => color.trim().replace(/[<>{};]/g, "") || "#64748b";
  const voltageStyleRules = new Map<string, { type: "ac" | "dc"; voltage: string; color: string }>();
  const addVoltageStyleRule = (type: "ac" | "dc", voltage: string, color = voltageLevelColor(voltage, type, colorPalette)) => {
    const normalizedVoltage = exportVoltageValue(voltage);
    voltageStyleRules.set(`${type}:${normalizedVoltage}`, { type, voltage: normalizedVoltage, color: exportVoltageCssColor(color) });
  };
  if (colorDisplayMode === "voltage") {
    Object.entries(colorPalette.voltage).forEach(([key, color]) => {
      const [maybeType, maybeVoltage] = key.split(":", 2);
      if (maybeVoltage && (maybeType === "ac" || maybeType === "dc")) {
        addVoltageStyleRule(maybeType, maybeVoltage, color);
        return;
      }
      addVoltageStyleRule("ac", key, color);
    });
  }
  const nodeExportVoltageDescriptor = (node: ModelNode) => {
    const terminal = node.terminals.find((candidate) => isExportElectricTerminalType(candidate.type));
    const busTerminalType = terminal ? undefined : getBusTerminalType(node);
    const type = terminal?.type ?? busTerminalType;
    if (!isExportElectricTerminalType(type)) {
      return null;
    }
    const voltage = terminal ? terminalExportVoltage(node, terminal) : firstNonZeroExportVoltageValue([
      node.params.vbase,
      node.params.voltageLevel
    ]) || "0";
    return { type, voltage };
  };
  const nodeVoltageDescriptor = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage") {
      return null;
    }
    const descriptor = nodeExportVoltageDescriptor(node);
    if (!descriptor) {
      return null;
    }
    const { type, voltage } = descriptor;
    addVoltageStyleRule(type, voltage);
    return descriptor;
  };
  const nodeVoltageAttributes = (node: ModelNode) => {
    if (isStaticNode(node)) {
      return "";
    }
    if (node.terminals.length === 0) {
      const descriptor = nodeExportVoltageDescriptor(node);
      return descriptor
        ? ` voltage-type="${descriptor.type}" vbase="${escapeXml(exportVoltageValue(descriptor.voltage))}"`
        : "";
    }
    const terminalVoltageDescriptors = node.terminals
      .filter((terminal) => isExportElectricTerminalType(terminal.type))
      .map((terminal) => ({
        type: terminal.type,
        voltage: terminalExportVoltage(node, terminal)
      }));
    if (terminalVoltageDescriptors.length > 0) {
      const descriptorKeys = terminalVoltageDescriptors.map((descriptor) => `${descriptor.type}:${exportVoltageValue(descriptor.voltage)}`);
      if (new Set(descriptorKeys).size <= 1) {
        const descriptor = terminalVoltageDescriptors[0];
        return ` voltage-type="${descriptor.type}" vbase="${escapeXml(exportVoltageValue(descriptor.voltage))}"`;
      }
    }
    if (node.terminals.length === 1) {
      const terminal = node.terminals[0];
      return isExportElectricTerminalType(terminal?.type)
        ? ` voltage-type="${terminal.type}" vbase="${escapeXml(terminalExportVoltage(node, terminal))}"`
        : "";
    }
    return node.terminals
      .map((terminal, index) => isExportElectricTerminalType(terminal.type)
        ? ` voltage-type-${index + 1}="${terminal.type}" vbase-${index + 1}="${escapeXml(terminalExportVoltage(node, terminal))}"`
        : "")
      .filter(Boolean)
      .join("");
  };
  const findExportDisplayTerminal = (node: ModelNode | undefined, terminalId?: string) =>
    node?.terminals.find((terminal) => terminal.id === terminalId) ??
      node?.terminals[0] ??
      ((node && isExportElectricTerminalType(getBusTerminalType(node)))
        ? { id: terminalId || "t1", label: "", type: getBusTerminalType(node) as "ac" | "dc", anchor: { x: 0, y: 0 }, nodeNumber: node.nodeNumber || "0", vbase: "0" }
        : undefined);
  const edgeExportVoltageDescriptor = (edge: Edge | undefined) => {
    if (!edge) {
      return null;
    }
    const sourceNode = nodeById.get(edge.sourceId);
    const targetNode = nodeById.get(edge.targetId);
    const sourceTerminal = findExportDisplayTerminal(sourceNode, edge.sourceTerminalId);
    const targetTerminal = findExportDisplayTerminal(targetNode, edge.targetTerminalId);
    const type = sourceTerminal?.type ?? targetTerminal?.type;
    if (!isExportElectricTerminalType(type)) {
      return null;
    }
    const sourceVoltage = sourceNode && sourceTerminal?.type === type ? terminalExportVoltage(sourceNode, sourceTerminal) : "";
    const targetVoltage = targetNode && targetTerminal?.type === type ? terminalExportVoltage(targetNode, targetTerminal) : "";
    const voltage = sourceVoltage && sourceVoltage !== "0" ? sourceVoltage : targetVoltage || sourceVoltage || "0";
    return { type, voltage };
  };
  const edgeVoltageDescriptor = (edge: Edge | undefined) => {
    if (colorDisplayMode !== "voltage") {
      return null;
    }
    const descriptor = edgeExportVoltageDescriptor(edge);
    if (!descriptor) {
      return null;
    }
    const { type, voltage } = descriptor;
    addVoltageStyleRule(type, voltage);
    return descriptor;
  };
  exportNodes.forEach(nodeVoltageDescriptor);
  edges.forEach(edgeVoltageDescriptor);
  const voltageColorStyleMarkup = (() => {
    if (colorDisplayMode !== "voltage" || voltageStyleRules.size === 0) {
      return "";
    }
    const rules = ["symbol{overflow:visible}"];
    Array.from(voltageStyleRules.values())
      .sort((left, right) => exportVoltageDeviceClass(left.type, left.voltage).localeCompare(exportVoltageDeviceClass(right.type, right.voltage)))
      .forEach(({ type, voltage, color }) => {
        rules.push(`.${exportVoltageDeviceClass(type, voltage)}{fill:${color};stroke:${color};stroke-width:1;color:${color}}`);
        rules.push(`.${exportVoltageLineClass(type, voltage)}{fill:none;stroke:${color};color:${color}}`);
      });
    return `<style type="text/css"><![CDATA[
${rules.join("\n")}
]]></style>`;
  })();
  const glyphColorPalette: ColorPalette = colorDisplayMode === "voltage"
    ? {
        ...colorPalette,
        voltage: {
          ...colorPalette.voltage,
          ...Object.fromEntries(Array.from(voltageStyleRules.values()).flatMap(({ type, voltage, color }) => [
            [`${type}:${voltage}`, color],
            [voltage, color]
          ]))
        }
      }
    : colorPalette;
  const deviceTopologyNodeAttributes = (node: ModelNode) => {
    const topologyNode = topologyNodeById.get(node.id) ?? node;
    if (isStaticNode(topologyNode)) {
      return "";
    }
    if (isBusNode(topologyNode)) {
      return ` node="${escapeXml(topologyNode.terminals[0]?.nodeNumber || topologyNode.nodeNumber || "")}"`;
    }
    if (topologyNode.terminals.length === 0) {
      return "";
    }
    if (topologyNode.terminals.length === 1) {
      return ` node="${escapeXml(topologyNode.terminals[0]?.nodeNumber || topologyNode.nodeNumber || "")}"`;
    }
    return topologyNode.terminals.map((terminal, index) => ` node-${index + 1}="${escapeXml(terminal.nodeNumber ?? "")}"`).join("");
  };
  const buildBoundaryBusInternalConnectorMarkup = (edge: Edge, endpoint: "source" | "target", stroke: string, edgeAttributes: string, voltageLineClass = "") => {
    const node = nodeById.get(endpoint === "source" ? edge.sourceId : edge.targetId);
    if (!node) {
      return "";
    }
    const point = getModelEdgeEndpointPoint(
      node,
      endpoint === "source" ? edge.sourcePoint : edge.targetPoint,
      endpoint === "source" ? edge.sourceTerminalId : edge.targetTerminalId
    );
    const segment = boundaryBusInternalConnectorSegment(node, point);
    if (!segment) {
      return "";
    }
    const dashArray = svgStrokeDashArray(node.params.strokeStyle);
    const dashAttribute = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
    return `<line class="export-boundary-bus-internal-connector${voltageLineClass ? ` ${voltageLineClass}` : ""}"${edgeAttributes} x1="${formatSvgNumber(segment.from.x)}" y1="${formatSvgNumber(segment.from.y)}" x2="${formatSvgNumber(segment.to.x)}" y2="${formatSvgNumber(segment.to.y)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(boundaryBusInternalConnectorStrokeWidth(node, segment))}" stroke-linecap="round"${dashAttribute}/>`;
  };
  const edgeMarkup = routeEdgesForSavedPathRendering(exportNodes, edges, canvasSize, { refreshCrossingArcs: true })
    .map((route, index) => {
      const edge = edgeById.get(route.edgeId);
      const stroke = edge ? getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette) : "#334155";
      const sourceNode = edge ? nodeById.get(edge.sourceId) : undefined;
      const targetNode = edge ? nodeById.get(edge.targetId) : undefined;
      const sourceLayerId = sourceNode ? nodeLayerId(sourceNode) : DEFAULT_MODEL_LAYER_ID;
      const targetLayerId = targetNode ? nodeLayerId(targetNode) : DEFAULT_MODEL_LAYER_ID;
      const edgeVisible = layerVisible(sourceLayerId) && layerVisible(targetLayerId);
      const edgeVoltage = edgeVoltageDescriptor(edge);
      const edgeExportVoltage = edgeExportVoltageDescriptor(edge);
      const edgeVoltageLineClass = edgeVoltage ? exportVoltageLineClass(edgeVoltage.type, edgeVoltage.voltage) : "";
      const edgeVoltageAttributes = colorDisplayMode !== "voltage" && edgeExportVoltage
        ? ` voltage-type="${edgeExportVoltage.type}" vbase="${escapeXml(exportVoltageValue(edgeExportVoltage.voltage))}"`
        : "";
      const edgeElementId = exportSvgUniqueId(`edge-${index + 1}`, usedSvgIds, "edge");
      const edgeClassAttribute = edgeVoltageLineClass ? ` class="${edgeVoltageLineClass}"` : "";
      const sourceExportDeviceId = edge ? exportDeviceIdByNodeId.get(edge.sourceId) ?? edge.sourceId : "";
      const targetExportDeviceId = edge ? exportDeviceIdByNodeId.get(edge.targetId) ?? edge.targetId : "";
      const edgeAttributes = `${svgDisplayAttribute(edgeVisible)} source-dev-id="${escapeXml(sourceExportDeviceId)}" target-dev-id="${escapeXml(targetExportDeviceId)}"`;
      const internalConnectors = edge
        ? [
            buildBoundaryBusInternalConnectorMarkup(edge, "source", stroke, edgeAttributes, edgeVoltageLineClass),
            buildBoundaryBusInternalConnectorMarkup(edge, "target", stroke, edgeAttributes, edgeVoltageLineClass)
          ]
            .filter(Boolean)
            .join("\n")
        : "";
      return `<path id="${escapeXml(edgeElementId)}"${edgeClassAttribute}${edgeAttributes}${edgeVoltageAttributes} d="${route.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${internalConnectors ? `\n${internalConnectors}` : ""}`;
    })
    .join("\n");
  const nodeLayerMarkup = new Map<string, string[]>();
  for (const layerId of nodeTypeLayerIds.values()) {
    nodeLayerMarkup.set(layerId, []);
  }
  const nodeSymbolMarkup: string[] = [];
  const symbolIdBySignature = new Map<string, string>();
  const symbolIdByVisualInput = new Map<string, string>();
  const textLayerMarkup: string[] = [];
  const cacheableStandardSymbolVisualToken = (symbolNode: ModelNode, stateVisual: DeviceStateVisual | null) => {
    const glyphVariant = getDeviceGlyphVariant(symbolNode.kind);
    if (
      isStaticNode(symbolNode) ||
      isRoutableLineDeviceKind(symbolNode.kind) ||
      glyphVariant === "custom-device" ||
      symbolNode.params[CUSTOM_DEVICE_TEMPLATE_KEY] === "1"
    ) {
      return "";
    }
    const nodeScaleX = getNodeScaleX(symbolNode);
    const nodeScaleY = getNodeScaleY(symbolNode);
    const terminalVisuals = symbolNode.terminals.map((terminal) => {
      const renderPoint = terminalRenderLocalPoint(terminal, symbolNode.size, nodeScaleX, nodeScaleY, symbolNode.kind);
      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, symbolNode.kind, symbolNode.size);
      return [
        terminal.type,
        terminal.anchor.x,
        terminal.anchor.y,
        terminal.vbase ?? "",
        renderPoint.x,
        renderPoint.y,
        stub.from.x,
        stub.from.y,
        stub.to.x,
        stub.to.y,
        terminalStubStrokeWidth(symbolNode, terminal),
        getTerminalDisplayColor(symbolNode, terminal, colorDisplayMode, colorPalette)
      ];
    });
    const stateVisualImageHref = resolveStateVisualImageHref(stateVisual, imageAssets);
    return JSON.stringify([
      symbolNode.kind,
      glyphVariant,
      symbolNode.size.width,
      symbolNode.size.height,
      nodeGeometryTransform(symbolNode),
      getDeviceStrokeColor(symbolNode, colorDisplayMode, colorPalette),
      getDeviceStrokeWidth(symbolNode),
      getSwitchVisualState(symbolNode),
      Boolean(nodeExportVoltageDescriptor(symbolNode)),
      symbolNode.params.strokeStyle ?? "",
      symbolNode.params.backgroundImageCleared ?? "",
      stateVisualImageHref,
      stateVisual?.imageFit ?? stateVisual?.backgroundImageFit ?? symbolNode.params.backgroundImageFit ?? "",
      resolveNodeImage(symbolNode, imageAssets),
      resolveNodeForegroundImage(symbolNode, imageAssets),
      symbolNode.params.foregroundImageFit ?? "",
      deviceStateVisualToken(stateVisual),
      terminalVisuals
    ]);
  };
  exportNodes.forEach((node) => {
      const layerId = nodeLayerId(node);
      const typeLayerId = nodeTypeLayerIds.get(exportNodeLayerKey(node)) ?? otherLayerId;
      const targetLayerIds = resolveExportLayerButtonTargetIds(node);
      const exportButtonAttributes = targetLayerIds.length > 0
        ? ` action="layer" target-layer-id="${escapeXml(targetLayerIds[0])}" target-layer-ids="${escapeXml(targetLayerIds.join(","))}"`
        : "";
      const exportButtonClass = targetLayerIds.length > 0 ? "export-static-button" : "";
      const allowNodeImage = !isBusNode(node);
      const exportDeviceId = exportDeviceIdByNodeId.get(node.id) ?? node.id;
      const deviceMetadataAttributes = exportDeviceMetadataAttributes(node, exportDeviceId);
      const labelMetadataAttributes = isStaticNode(node)
        ? ""
        : `dev-id="${escapeXml(exportDeviceId)}"`;
      const topologyNodeAttributes = deviceTopologyNodeAttributes(node);
      const voltageAttributes = nodeVoltageAttributes(node);
      const geometryTransform = nodeGeometryTransform(node);
      const labelMarkup = buildSvgNodeLabelMarkup(node);
      const template = resolveSvgNodeTemplate(node);
      const stateDefinitions = template ? getTemplateStateDefinitions(template) : [];
      const activeStateVisual = resolveSvgNodeStateVisual(node);
      const stateSymbolInputs = stateDefinitions.map((state) => {
        const stateParamKey = template && switchingDeviceUsesClosedStatus(template.kind, template.params)
          ? "closed_status"
          : "status";
        const stateNode = { ...node, params: { ...node.params, [stateParamKey]: state.value } };
        return {
          stateKey: `state_${state.value || "default"}`,
          node: stateNode,
          visual: template ? resolveDeviceStateVisual(template, stateNode) : null
        };
      });
      if (stateSymbolInputs.length === 0 || !activeStateVisual) {
        stateSymbolInputs.push({ stateKey: "default", node, visual: activeStateVisual });
      }
      const renderNodeSymbolBody = (symbolNode: ModelNode, stateVisual: DeviceStateVisual | null, patternScopeId: string) => {
        const stateVisualImageHref = resolveStateVisualImageHref(stateVisual, imageAssets);
        const imageHref = exportSvgImageHref(stateVisualImageHref || resolveNodeImage(symbolNode, imageAssets), imageExportPathById);
        const foregroundHref = exportSvgImageHref(resolveNodeForegroundImage(symbolNode, imageAssets), imageExportPathById);
        const backgroundImageFit = stateVisualImageHref
          ? stateVisual?.imageFit ?? stateVisual?.backgroundImageFit ?? symbolNode.params.backgroundImageFit
          : symbolNode.params.backgroundImageFit;
        const voltageColoredNode = colorDisplayMode === "voltage" && nodeExportVoltageDescriptor(symbolNode)
          ? { ...symbolNode, params: { ...symbolNode.params, foregroundColor: "" } }
          : symbolNode;
        const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node: voltageColoredNode, mode: "geometry", colorDisplayMode, colorPalette: glyphColorPalette, stateVisual }));
        const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node: voltageColoredNode, mode: "text", colorDisplayMode, colorPalette: glyphColorPalette, stateVisual }));
        const connectorMarkup = buildSvgDeviceConnectorMarkup(voltageColoredNode, colorDisplayMode, colorPalette);
        const imageMarkup = imageHref
          ? svgImageContentMarkup(imageHref, {
              x: -symbolNode.size.width / 2,
              y: -symbolNode.size.height / 2,
              width: symbolNode.size.width,
              height: symbolNode.size.height,
              imageFit: backgroundImageFit,
              patternId: exportSvgSafeId(`node_background_image_pattern_${patternScopeId}`, "node_background_image_pattern"),
              className: "node-background-image"
            })
          : "";
        const foregroundMarkup = foregroundHref
          ? svgImageContentMarkup(foregroundHref, {
              x: -symbolNode.size.width / 2,
              y: -symbolNode.size.height / 2,
              width: symbolNode.size.width,
              height: symbolNode.size.height,
              imageFit: symbolNode.params.foregroundImageFit,
              patternId: exportSvgSafeId(`node_foreground_image_pattern_${patternScopeId}`, "node_foreground_image_pattern"),
              className: "node-foreground-image"
            })
          : "";
        const imageCoverMarkup =
          imageHref && allowNodeImage && symbolNode.terminals.length === 0 && !isStaticNode(symbolNode)
            ? `<rect x="${-symbolNode.size.width / 2}" y="${-symbolNode.size.height / 2}" width="${symbolNode.size.width}" height="${symbolNode.size.height}" rx="8" fill="#ffffff" stroke="none"/>`
            : "";
        return `<title>${escapeXml(template?.label ?? exportNodeType(symbolNode))}</title>
  <g transform="${geometryTransform}">
  ${glyphMarkup}
  ${glyphTextMarkup}
  ${connectorMarkup}
  ${isStaticNode(symbolNode) ? imageMarkup : ""}
  ${imageCoverMarkup}
  ${allowNodeImage && !isStaticNode(symbolNode) ? imageMarkup : ""}
  ${allowNodeImage ? foregroundMarkup : ""}
  </g>`;
      };
      const symbolIdByStateKey = new Map<string, string>();
      for (const stateInput of stateSymbolInputs) {
        const symbolBaseId = exportSvgSafeId(`symbol_${exportNodeType(node)}_${node.kind}_${stateInput.stateKey}`, "device_symbol");
        const viewBox = `${formatSvgNumber(-node.size.width / 2)} ${formatSvgNumber(-node.size.height / 2)} ${formatSvgNumber(node.size.width)} ${formatSvgNumber(node.size.height)}`;
        const visualInputToken = cacheableStandardSymbolVisualToken(stateInput.node, stateInput.visual);
        const visualInputKey = visualInputToken ? `${symbolBaseId}\n${viewBox}\n${visualInputToken}` : "";
        let symbolId = visualInputKey ? symbolIdByVisualInput.get(visualInputKey) : undefined;
        if (!symbolId) {
          const signatureBody = renderNodeSymbolBody(stateInput.node, stateInput.visual, symbolBaseId);
          const signature = `${symbolBaseId}\n${viewBox}\n${signatureBody}`;
          symbolId = symbolIdBySignature.get(signature);
          if (!symbolId) {
            symbolId = exportSvgUniqueId(symbolBaseId, usedSvgIds, "device_symbol");
            const symbolBody = symbolId === symbolBaseId ? signatureBody : renderNodeSymbolBody(stateInput.node, stateInput.visual, symbolId);
            nodeSymbolMarkup.push(`<symbol id="${escapeXml(symbolId)}" viewBox="${viewBox}" overflow="visible">
  ${symbolBody}
</symbol>`);
            symbolIdBySignature.set(signature, symbolId);
          }
          if (visualInputKey) {
            symbolIdByVisualInput.set(visualInputKey, symbolId);
          }
        }
        symbolIdByStateKey.set(stateInput.stateKey, symbolId);
      }
      const activeStateKey = activeStateVisual ? `state_${activeStateVisual.value || "default"}` : "default";
      const symbolId = symbolIdByStateKey.get(activeStateKey) ?? symbolIdByStateKey.values().next().value ?? "";
      const useId = exportDeviceIdByNodeId.get(node.id) ?? exportSvgUniqueId(node.id, usedSvgIds, "device");
      const nodeVoltage = nodeVoltageDescriptor(node);
      const nodeVoltageClass = nodeVoltage ? exportVoltageDeviceClass(nodeVoltage.type, nodeVoltage.voltage) : "";
      const nodeClassName = [exportButtonClass, nodeVoltageClass].filter(Boolean).join(" ");
      const nodeClassAttribute = nodeClassName ? ` class="${escapeXml(nodeClassName)}"` : "";
      if (labelMarkup) {
        const labelWrapperId = exportSvgUniqueId(`label_${exportDeviceId}`, usedSvgIds, "node_label");
        textLayerMarkup.push(buildSvgNodeLabelTextElementsMarkup(node, labelWrapperId, {
          attributes: `layer-id="${escapeXml(layerId)}"${labelMetadataAttributes ? ` ${labelMetadataAttributes}` : ""}`,
          visible: layerVisible(layerId)
        }));
      }
      const useX = formatSvgNumber(node.position.x - node.size.width / 2);
      const useY = formatSvgNumber(node.position.y - node.size.height / 2);
      nodeLayerMarkup.get(typeLayerId)?.push(`<g transform="translate(${useX},${useY})"><use id="${escapeXml(useId)}"${nodeClassAttribute} layer-id="${escapeXml(layerId)}"${deviceMetadataAttributes ? ` ${deviceMetadataAttributes}` : ""}${topologyNodeAttributes}${voltageAttributes} href="#${escapeXml(symbolId)}" xlink:href="#${escapeXml(symbolId)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}"${exportButtonAttributes}${svgDisplayAttribute(layerVisible(layerId))}/></g>`);
  });
  const measurementConfig = canvasSize.measurementConfig ?? DEFAULT_MEASUREMENT_CONFIG;
  const measurements = canvasSize.measurements ?? EMPTY_PROJECT_MEASUREMENTS;
  const measurementNodeById = new Map(exportNodes.map((node) => [node.id, node]));
  const associatedDeviceIdentityByNodeTerminal = new Map<string, ReturnType<typeof containerAssociatedDeviceIdentityForTerminal>>();
  const associatedDeviceIdentity = (node: ModelNode, terminalId?: string) => {
    const key = `${node.id}:${String(terminalId ?? "")}`;
    if (!associatedDeviceIdentityByNodeTerminal.has(key)) {
      associatedDeviceIdentityByNodeTerminal.set(
        key,
        containerAssociatedDeviceIdentityForTerminal(node, resolveSvgNodeTemplate(node), terminalId)
      );
    }
    return associatedDeviceIdentityByNodeTerminal.get(key);
  };
  const measurementMarkup = measurements.groups
    .map((group) => {
      const node = measurementNodeById.get(group.nodeId);
      if (!node || isStaticNode(node)) {
        return "";
      }
      const layerId = nodeLayerId(node);
      const ownerDeviceId = exportDeviceIdByNodeId.get(node.id) ?? node.id;
      const associatedDevice = associatedDeviceIdentity(node, group.terminalId);
      const groupMarkup = buildExportMeasurementGroupMarkup(node, group, measurementConfig, usedSvgIds, {
        deviceId: associatedDevice?.deviceId ?? ownerDeviceId,
        ownerDeviceId,
        layerId,
        visible: layerVisible(layerId)
      });
      if (!groupMarkup) {
        return "";
      }
      return groupMarkup;
    })
    .filter(Boolean)
    .join("\n");
  const measurementAssociatedDevices = Array.from(associatedDeviceIdentityByNodeTerminal.values())
    .filter((identity): identity is NonNullable<typeof identity> => Boolean(identity))
    .filter((identity, index, identities) => identities.findIndex((candidate) => candidate.deviceId === identity.deviceId) === index);
  const associatedDeviceMetadataMarkup = Array.from(
    new Set(measurementAssociatedDevices.map((identity) => identity.deviceModel))
  )
    .sort((left, right) => left.localeCompare(right))
    .map((deviceModel) => `<g device-type="${escapeXml(deviceModel)}">
${measurementAssociatedDevices
      .filter((identity) => identity.deviceModel === deviceModel)
      .sort((left, right) => left.index.localeCompare(right.index))
      .map((identity) => `<g dev-id="${escapeXml(identity.deviceId)}" name="${escapeXml(identity.name)}" idx="${escapeXml(identity.index)}"/>`)
      .join("\n")}
</g>`)
    .join("\n");
  const backgroundMarkup = `<rect width="100%" height="100%" fill="${escapedBackgroundColor}"/>
${backgroundImage ? svgImageContentMarkup(backgroundImage, {
    x: 0,
    y: 0,
    width: canvasSize.width,
    height: canvasSize.height,
    imageFit: canvasSize.backgroundImageFit,
    patternId: exportSvgUniqueId("canvas_background_image_pattern", usedSvgIds, "canvas_background_image_pattern"),
    className: "export-canvas-background-image"
  }) : ""}`;
  const backgroundPageMarkup = buildBackgroundPageExportMarkup();
  const deviceLayerMarkup = Array.from(nodeTypeLayerIds.entries())
    .map(([layerKey, layerId]) => `<g id="${escapeXml(layerId)}" device-type="${escapeXml(layerKey)}">
${(nodeLayerMarkup.get(layerId) ?? []).join("\n")}
</g>`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" height="100%" width="100%" viewBox="0,0,${canvasSize.width},${canvasSize.height}" active-layer-id="${escapeXml(activeExportLayerId)}">
<defs id="${escapeXml(defsId)}">
${voltageColorStyleMarkup}
${nodeSymbolMarkup.join("\n")}
</defs>
<g id="${rootId}">
<g class="export-layer-definitions" style="display:none">
${exportLayerDefinitionsMarkup}
</g>
<g class="export-associated-device-definitions" style="display:none">
${associatedDeviceMetadataMarkup}
</g>
<g id="${escapeXml(backgroundLayerId)}">
${backgroundMarkup}
${backgroundPageMarkup}
</g>
<g id="${escapeXml(segmentLayerId)}">
${edgeMarkup}
</g>
${deviceLayerMarkup}
<g id="${escapeXml(textLayerId)}">
${textLayerMarkup.join("\n")}
</g>
<g id="${escapeXml(measurementLayerId)}">
${measurementMarkup}
</g>
<g id="${escapeXml(otherLayerId)}">
</g>
</g>
${exportSvgLayerScriptMarkup(includeLayerScript)}
</svg>`;
}
