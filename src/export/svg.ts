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
  deviceParamValue,
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
  rebuildContainerExemptConnectionRoutes,
  rebuildContainerExemptRoutableLineDeviceRoutes,
  routeEdgesForSavedPathRendering,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth
} from "../model-routing.ts";
import { getNodeScaleX, getNodeScaleY } from "../model-canvas-ops.ts";
import { inferESection } from "../model-eexport.ts";
import { isAcContainerNode, withNodeUpdates } from "../acContainer.ts";
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
import { DeviceGlyph, usesTransformerTerminalSlotPaint } from "../DeviceGlyph.ts";
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

export function buildSvgDeviceConnectorMarkup(
  node: ModelNode,
  colorDisplayMode: ColorDisplayMode = "energy",
  colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE,
  voltagePaint: { terminalRef?: (terminalId: string) => string | undefined } | null = null
) {
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
      const paintRef = voltagePaint?.terminalRef?.(String(terminal.id ?? ""));
      // 导出态电压色走槽/class：有槽链 --tN，无槽删属性靠 <use class> 继承；
      // 仅电端子删属性 —— 非电端子（h2/heat）保留字面 terminalColor（身份色不归电压类管）
      const isElectric = terminal.type === "ac" || terminal.type === "dc";
      const strokeAttribute = paintRef
        ? ` stroke="${escapeXml(paintRef)}"`
        : voltagePaint && isElectric
          ? "" // 导出态电端子单电压：删属性，靠 <use class> 继承
          : ` stroke="${escapeXml(terminalColor)}"`;
      return `<g transform="translate(${formatSvgNumber(renderPoint.x)} ${formatSvgNumber(renderPoint.y)})">
  <line x1="${formatSvgNumber(stub.from.x)}" y1="${formatSvgNumber(stub.from.y)}" x2="${formatSvgNumber(stub.to.x)}" y2="${formatSvgNumber(stub.to.y)}"${strokeAttribute} stroke-width="${formatSvgNumber(strokeWidth)}" stroke-linecap="round"${dashAttribute}/>
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
  const orderedNodes = orderNodesByModelLayer(nodes, normalizedLayers);
  // 容器豁免存量回填(设备型线路):端点 refs 连容器内设备的线路设备,存量路径按豁免口径重算
  // (与下方连线回填同批;同样的口径也用在加载路径 createLoadSavedProject)
  const containerExemptedLineNodes = rebuildContainerExemptRoutableLineDeviceRoutes(orderedNodes, canvasSize);
  const exportNodes = containerExemptedLineNodes.length > 0
    ? withNodeUpdates(orderedNodes, containerExemptedLineNodes)
    : orderedNodes;
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
  // 容器沉底:容器节点层在 segment(线路)层之前输出,与画布同口径(acContainer.containerFirstComparator)。
  // 层键按「节点的真实分层结果」派生而非按 kind 猜层名;判定口径 = **整层皆容器**才搬:
  // 静态图元层键恒为 "Other",容器若被手工塞入 static 库参数也会落进该层,此时整层搬会把装饰图元一并沉底。
  // 一趟判断「整层皆容器」:遇到非容器即置 false(逐层扫全部节点是 O(层数 × 节点数));
  // 键集与 nodeTypeLayerIds 同源(同一 exportNodes + 同一层键函数),插入序也一致
  const layerKeyAllContainer = new Map<string, boolean>();
  for (const node of exportNodes) {
    const layerKey = exportNodeLayerKey(node);
    layerKeyAllContainer.set(layerKey, (layerKeyAllContainer.get(layerKey) ?? true) && isAcContainerNode(node));
  }
  const containerLayerKeys = new Set(
    [...layerKeyAllContainer].filter(([, allContainer]) => allContainer).map(([layerKey]) => layerKey)
  );
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
  // filter 谓词须带「元素」级守卫（value is S），否则 t.type is "ac"|"dc" 不生效，收窄参数会报 TS2345
  const exportElectricTerminals = (node: ModelNode) =>
    node.terminals.filter((terminal): terminal is ExportVoltageTerminal & { type: "ac" | "dc" } => isExportElectricTerminalType(terminal.type));
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
  // 单一 token 派生：类规则把字面色写入 --c-<类名>，正文/端子/引线全部经 var() 引用
  const exportVoltageColorVar = (className: string) => `--c-${className}`;
  const exportVoltageCssColor = (color: string) => color.trim().replace(/[<>{};]/g, "") || "#64748b";
  const voltageStyleRules = new Map<string, { type: "ac" | "dc"; voltage: string; color: string }>();
  // 已登记过的类名集合：nodeVoltageSlotDeclarations 用它决定槽链到自身类还是回落到端子 1
  const registeredVoltageClasses = new Set<string>();
  const addVoltageStyleRule = (type: "ac" | "dc", voltage: string, color = voltageLevelColor(voltage, type, colorPalette)) => {
    const normalizedVoltage = exportVoltageValue(voltage);
    voltageStyleRules.set(`${type}:${normalizedVoltage}`, { type, voltage: normalizedVoltage, color: exportVoltageCssColor(color) });
    registeredVoltageClasses.add(exportVoltageDeviceClass(type, normalizedVoltage));
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
      deviceParamValue(node.params, "voltage_level"),
      deviceParamValue(node.params, "rated_voltage"),
      node.params.voltage
    ]) || "0";
    return { type, voltage };
  };
  const nodeVoltageDescriptor = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage") {
      return null;
    }
    // 多端子器件：每个端子电压都要有 --c-<类名> 定义，否则 var(--tN) 会静默解析失败
    exportElectricTerminals(node).forEach((terminal) => addVoltageStyleRule(terminal.type, terminalExportVoltage(node, terminal)));
    const descriptor = nodeExportVoltageDescriptor(node);
    if (!descriptor) {
      return null;
    }
    const { type, voltage } = descriptor;
    addVoltageStyleRule(type, voltage);
    return descriptor;
  };
  const nodeVoltageClasses = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage") {
      return "";
    }
    const classes = exportElectricTerminals(node)
      .map((terminal) => exportVoltageDeviceClass(terminal.type, terminalExportVoltage(node, terminal)));
    if (classes.length === 0) {
      const descriptor = nodeExportVoltageDescriptor(node);
      return descriptor ? exportVoltageDeviceClass(descriptor.type, descriptor.voltage) : "";
    }
    return Array.from(new Set(classes)).join(" ");
  };
  const nodeVoltageSlotDeclarations = (node: ModelNode) => {
    if (colorDisplayMode !== "voltage" || !usesTransformerTerminalSlotPaint(node.kind)) {
      return "";
    }
    const electricTerminals = exportElectricTerminals(node);
    if (electricTerminals.length <= 1) {
      return "";
    }
    const primaryClass = exportVoltageDeviceClass(electricTerminals[0].type, terminalExportVoltage(node, electricTerminals[0]));
    return electricTerminals
      .map((terminal, index) => {
        const className = exportVoltageDeviceClass(terminal.type, terminalExportVoltage(node, terminal));
        // 槽链失效时会静默取错色或元素消失，故宁可链到端子 1 也不留空槽。
        // 防御分支：正常路径下所有节点电压类已由 exportNodes.forEach(nodeVoltageDescriptor)（<use> 输出前）登记进 registeredVoltageClasses，
        // 走到这里时几乎必然命中；仅当端子电压源缺失/越界时才回落，保持槽始终有值。
        const source = registeredVoltageClasses.has(className) ? className : primaryClass;
        return `--t${index + 1}:var(${exportVoltageColorVar(source)})`;
      })
      .join(";");
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
        const deviceClass = exportVoltageDeviceClass(type, voltage);
        const lineClass = exportVoltageLineClass(type, voltage);
        rules.push(`.${deviceClass}{${exportVoltageColorVar(deviceClass)}:${color};stroke:var(${exportVoltageColorVar(deviceClass)});color:var(${exportVoltageColorVar(deviceClass)});fill:var(${exportVoltageColorVar(deviceClass)})}`);
        rules.push(`.${lineClass}{${exportVoltageColorVar(lineClass)}:${color};fill:none;stroke:var(${exportVoltageColorVar(lineClass)});color:var(${exportVoltageColorVar(lineClass)})}`);
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
  const buildBoundaryBusInternalConnectorMarkup = (edge: Edge, endpoint: "source" | "target", stroke: string, edgeAttributes: string, voltageLineClass = "", suppressStroke = false) => {
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
    return `<line class="export-boundary-bus-internal-connector${voltageLineClass ? ` ${voltageLineClass}` : ""}"${edgeAttributes} x1="${formatSvgNumber(segment.from.x)}" y1="${formatSvgNumber(segment.from.y)}" x2="${formatSvgNumber(segment.to.x)}" y2="${formatSvgNumber(segment.to.y)}"${suppressStroke ? "" : ` stroke="${escapeXml(stroke)}"`} stroke-width="${formatSvgNumber(boundaryBusInternalConnectorStrokeWidth(node, segment))}" stroke-linecap="round"${dashAttribute}/>`;
  };
  // 容器豁免存量回填:端点连容器内设备的连线按豁免口径重算后回放(容器是避让障碍物;服务容器内设备的线路豁免)
  const edgeMarkup = routeEdgesForSavedPathRendering(
    exportNodes,
    rebuildContainerExemptConnectionRoutes(exportNodes, edges, canvasSize),
    canvasSize,
    { refreshCrossingArcs: true }
  )
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
      // 电压模式下线路删字面 stroke，颜色交给 lkvN/ldcvN 类驱动
      const voltageModeEdgeStroke = colorDisplayMode === "voltage" && Boolean(edgeVoltage);
      const edgeVoltageStroke = voltageModeEdgeStroke ? "" : ` stroke="${escapeXml(stroke)}"`;
      const sourceExportDeviceId = edge ? exportDeviceIdByNodeId.get(edge.sourceId) ?? edge.sourceId : "";
      const targetExportDeviceId = edge ? exportDeviceIdByNodeId.get(edge.targetId) ?? edge.targetId : "";
      const edgeAttributes = `${svgDisplayAttribute(edgeVisible)} source-dev-id="${escapeXml(sourceExportDeviceId)}" target-dev-id="${escapeXml(targetExportDeviceId)}"`;
      const internalConnectors = edge
        ? [
            buildBoundaryBusInternalConnectorMarkup(edge, "source", stroke, edgeAttributes, edgeVoltageLineClass, voltageModeEdgeStroke),
            buildBoundaryBusInternalConnectorMarkup(edge, "target", stroke, edgeAttributes, edgeVoltageLineClass, voltageModeEdgeStroke)
          ]
            .filter(Boolean)
            .join("\n")
        : "";
      return `<path id="${escapeXml(edgeElementId)}"${edgeClassAttribute}${edgeAttributes}${edgeVoltageAttributes} d="${route.path}" fill="none"${edgeVoltageStroke} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${internalConnectors ? `\n${internalConnectors}` : ""}`;
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
        // node-number 进 token：锚点已入 symbol 正文，不同端子号不得复用同一 symbol（防串号）
        terminal.nodeNumber ?? "",
        renderPoint.x,
        renderPoint.y,
        stub.from.x,
        stub.from.y,
        stub.to.x,
        stub.to.y,
        terminalStubStrokeWidth(symbolNode, terminal),
        // 电压模式下剔除端子电压色：跨电压同种图元共用 symbol（颜色由 use 上的类/槽驱动）
        colorDisplayMode === "voltage" ? "" : getTerminalDisplayColor(symbolNode, terminal, colorDisplayMode, colorPalette)
      ];
    });
    const stateVisualImageHref = resolveStateVisualImageHref(stateVisual, imageAssets);
    return JSON.stringify([
      symbolNode.kind,
      glyphVariant,
      symbolNode.size.width,
      symbolNode.size.height,
      nodeGeometryTransform(symbolNode),
      // 电压模式下剔除节点电压描边色：跨电压同种图元共用 symbol（颜色由 use 上的类/槽驱动）
      colorDisplayMode === "voltage" ? "" : getDeviceStrokeColor(symbolNode, colorDisplayMode, colorPalette),
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
        const voltageDescriptor = nodeExportVoltageDescriptor(symbolNode);
        // foregroundColor 抹空是「取色来源 = 电压色」的隐形前提：节点身份色禁用后，
        // getDeviceStrokeColor 结果与电压类色一致，nodeRef 走槽/currentColor 而非字面色。勿顺手清理（spec §6）。
        const voltageColoredNode = colorDisplayMode === "voltage" && voltageDescriptor
          ? { ...symbolNode, params: { ...symbolNode.params, foregroundColor: "" } }
          : symbolNode;
        // 导出态：正文电压色改 class/槽驱动。多端子器件节点级链 --t1、端子级按顺序链 --tN（槽在 <use> 上声明）
        // I-1 身份色例外：氢/热耦合器件（电解槽/燃料电池/电热器）在电压模式下的身份色来自终端类型色
        // （h2 紫 / heat 红），不是电压色。getDeviceStrokeColor 的实际结果与该器件电压类对应色不一致时，
        // 机身保持字面身份色（nodeRef 指向身份色）；电端子引线仍按 class 驱动、非电端子（h2/heat）保留字面终端色。
        // 槽只对变压器族有用：非变压器即便多端子也是内部单色，一律不消耗 var(--tN)。
        // 构造一次 slotTerminals，nodeRef 的多端子判断与 terminalRef 的子序列序号共用同一份电端子表。
        const slotTerminals = usesTransformerTerminalSlotPaint(symbolNode.kind) ? exportElectricTerminals(symbolNode) : [];
        // energy 默认路径无需取色：身份/电压类色仅在电压模式且有电压描述符时才计算，避免白算
        const deviceIdentityColor = colorDisplayMode === "voltage" && voltageDescriptor ? getDeviceStrokeColor(voltageColoredNode, colorDisplayMode, colorPalette) : "";
        const deviceVoltageClassColor = colorDisplayMode === "voltage" && voltageDescriptor ? voltageLevelColor(voltageDescriptor.voltage, voltageDescriptor.type, colorPalette) : "";
        const glyphVoltagePaint = colorDisplayMode === "voltage" && voltageDescriptor
          ? {
              nodeRef: deviceIdentityColor.toLowerCase() === deviceVoltageClassColor.toLowerCase()
                // 变压器族多端子才链 --t1；其余器件（含开关等双端子器件）内部单色，走 currentColor 继承
                ? (slotTerminals.length > 1
                    ? "var(--t1)"
                    : undefined)
                : deviceIdentityColor,
              // 槽按「电端子序」声明（与 nodeVoltageSlotDeclarations 同基数）：terminalRef 返回电端子子序列序号，
              // 混合端子器件（电端之间夹非电端）不会指向未声明的槽；单电端子器件无槽，返回 undefined 走回落。
              // 仅变压器族提供端子槽：其余器件内部不消费 var(--tN)
              terminalRef: slotTerminals.length > 1
                ? (terminalId: string) => {
                    const index = slotTerminals.findIndex((terminal) => terminal.id === terminalId);
                    return index >= 0 ? `var(--t${index + 1})` : undefined;
                  }
                : undefined
            }
          : null;
        const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node: voltageColoredNode, mode: "geometry", colorDisplayMode, colorPalette: glyphColorPalette, stateVisual, voltagePaint: glyphVoltagePaint }));
        const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node: voltageColoredNode, mode: "text", colorDisplayMode, colorPalette: glyphColorPalette, stateVisual, voltagePaint: glyphVoltagePaint }));
        const connectorMarkup = buildSvgDeviceConnectorMarkup(voltageColoredNode, colorDisplayMode, colorPalette, glyphVoltagePaint);
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
        // terminal 锚点（symbol 内）：每电端子在引线落点输出一个隐藏圆点，与图元定义同处 symbol，
        // 下游复用 symbol 时经 terminal-id 直接定位连接点。与引线同帧（geometryTransform 内）。
        // 默认 display="none" 呈现属性隐藏；CSS 规则恒胜呈现属性，下游 .terminal-anchor{display:inline} 一行即可显示。
        // 去重前提：签名/快路径 token 均涵盖端子签名（node-number 参与），不同端子号的设备
        // 不会复用同一 symbol，锚点各归其主（防 v1 串号回归）。
        const terminalAnchors = isStaticNode(symbolNode) ? [] : exportElectricTerminals(symbolNode);
        const terminalAnchorMarkup = terminalAnchors
          .map((terminal, index) => {
            const renderPoint = terminalRenderLocalPoint(terminal, symbolNode.size, getNodeScaleX(symbolNode), getNodeScaleY(symbolNode), symbolNode.kind);
            return `<circle class="terminal-anchor" cx="${formatSvgNumber(renderPoint.x)}" cy="${formatSvgNumber(renderPoint.y)}" r="4" display="none" terminal-id="${escapeXml(terminal.id)}" terminal-index="${index + 1}" node-number="${escapeXml(terminal.nodeNumber ?? "")}"/>`;
          })
          .join("");
        return `<title>${escapeXml(template?.label ?? exportNodeType(symbolNode))}</title>
  <g transform="${geometryTransform}">
  ${glyphMarkup}
  ${glyphTextMarkup}
  ${connectorMarkup}
  ${isStaticNode(symbolNode) ? imageMarkup : ""}
  ${imageCoverMarkup}
  ${allowNodeImage && !isStaticNode(symbolNode) ? imageMarkup : ""}
  ${allowNodeImage ? foregroundMarkup : ""}
  ${terminalAnchorMarkup}
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
      const nodeVoltageClass = nodeVoltageClasses(node);
      const nodeSlotStyle = nodeVoltageSlotDeclarations(node);
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
      nodeLayerMarkup.get(typeLayerId)?.push(`<g transform="translate(${useX},${useY})"><use id="${escapeXml(useId)}"${nodeClassAttribute} layer-id="${escapeXml(layerId)}"${deviceMetadataAttributes ? ` ${deviceMetadataAttributes}` : ""}${topologyNodeAttributes}${voltageAttributes} href="#${escapeXml(symbolId)}" xlink:href="#${escapeXml(symbolId)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}"${exportButtonAttributes}${svgDisplayAttribute(layerVisible(layerId), nodeSlotStyle)}/></g>`);
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
  const exportDeviceLayerGroup = ([layerKey, layerId]: [string, string]) => `<g id="${escapeXml(layerId)}" device-type="${escapeXml(layerKey)}">
${(nodeLayerMarkup.get(layerId) ?? []).join("\n")}
</g>`;
  const deviceLayerEntries = Array.from(nodeTypeLayerIds.entries());
  // 尾随换行写进变量:无容器时输出必须逐字节等于旧基线(golden 哈希守卫)
  const containerLayerEntries = deviceLayerEntries.filter(([layerKey]) => containerLayerKeys.has(layerKey));
  const containerLayerMarkup = containerLayerEntries.length > 0
    ? `${containerLayerEntries.map(exportDeviceLayerGroup).join("\n")}\n`
    : "";
  const deviceLayerMarkup = deviceLayerEntries
    .filter(([layerKey]) => !containerLayerKeys.has(layerKey))
    .map(exportDeviceLayerGroup)
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
${containerLayerMarkup}<g id="${escapeXml(segmentLayerId)}">
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
