import {
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEVICE_LIBRARY,
  createNodeFromTemplate,
  type DeviceTemplate,
  type ModelNode,
  type ModelLayer,
  type ProjectFile
} from "./model";

export type SvgModelImportMode = "platform" | "generic";

export type SvgModelImportStats = {
  nodes: number;
  edges: number;
  measurementGroups: number;
  staticNodes: number;
};

export type SvgModelImportResult = {
  mode: SvgModelImportMode;
  project: ProjectFile;
  stats: SvgModelImportStats;
  warnings: string[];
};

export type SvgDomAdapter = {
  parse: (source: string) => Document;
  serialize: (node: Node) => string;
};

export type SvgModelImportOptions = {
  name: string;
  templates?: readonly DeviceTemplate[];
  dom?: SvgDomAdapter;
  batchSize?: number;
  yieldToMain?: () => Promise<void>;
};

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 800;
const DANGEROUS_ELEMENT_NAMES = new Set(["script", "foreignobject", "iframe", "object", "embed"]);
const URL_ATTRIBUTE_NAMES = new Set(["href", "xlink:href", "src", "action", "formaction", "poster"]);
const EXECUTABLE_STYLE_PATTERN = /javascript:|vbscript:|expression\s*\(|@import/iu;

function browserDomAdapter(): SvgDomAdapter {
  return {
    parse(source) {
      if (typeof DOMParser === "undefined") {
        throw new Error("当前环境不支持 SVG XML 解析。");
      }
      const document = new DOMParser().parseFromString(source, "image/svg+xml");
      if (document.getElementsByTagName("parsererror").length > 0) {
        throw new Error("SVG XML 解析失败。");
      }
      return document;
    },
    serialize(node) {
      if (typeof XMLSerializer === "undefined") {
        throw new Error("当前环境不支持 SVG XML 序列化。");
      }
      return new XMLSerializer().serializeToString(node);
    }
  };
}

function elementName(element: Element) {
  return String(element.localName || element.nodeName).toLowerCase();
}

function childElements(node: Node): Element[] {
  const result: Element[] = [];
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child?.nodeType === 1) {
      result.push(child as Element);
    }
  }
  return result;
}

function walkElements(root: Node): Element[] {
  const result: Element[] = [];
  const pending = [...childElements(root)];
  while (pending.length > 0) {
    const element = pending.shift()!;
    result.push(element);
    pending.unshift(...childElements(element));
  }
  return result;
}

function hasClass(element: Element, className: string) {
  return String(element.getAttribute("class") || "")
    .split(/\s+/u)
    .filter(Boolean)
    .includes(className);
}

function findById(root: Element, id: string) {
  return [root, ...walkElements(root)].find((element) => element.getAttribute("id") === id);
}

function elementHref(element: Element) {
  return String(element.getAttribute("href") || element.getAttribute("xlink:href") || "").trim();
}

function normalizedUrlForSafety(value: string) {
  return value.trim().replace(/[\u0000-\u001f\u007f\s]+/gu, "").toLowerCase();
}

function safeUrl(value: string) {
  const normalized = normalizedUrlForSafety(value);
  if (!normalized) {
    return true;
  }
  if (
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("http:") ||
    normalized.startsWith("https:")
  ) {
    return true;
  }
  return normalized.startsWith("data:image/");
}

function decodeSvgDataUrl(value: string) {
  const match = /^data:image\/svg\+xml(?:;charset=[^;,]+)?(?:;(base64|utf8))?,(.*)$/isu.exec(value.trim());
  if (!match) {
    return null;
  }
  const encoding = String(match[1] || "").toLowerCase();
  const payload = match[2] ?? "";
  try {
    if (encoding === "base64") {
      if (typeof globalThis.atob !== "function") {
        return null;
      }
      const binary = globalThis.atob(payload);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function sanitizeSvgDataUrl(value: string, dom: SvgDomAdapter, warnings: string[], depth: number) {
  const decoded = decodeSvgDataUrl(value);
  if (decoded === null) {
    return value;
  }
  if (depth >= 3) {
    warnings.push("嵌套 SVG 图片层级过深，已移除该图片引用。");
    return "";
  }
  try {
    const document = parseSvgDocument(decoded, dom);
    sanitizeDocument(document, dom, warnings, depth + 1);
    return svgDataUrl(dom.serialize(document.documentElement));
  } catch {
    warnings.push("嵌套 SVG 图片无法安全解析，已移除该图片引用。");
    return "";
  }
}

function sanitizeDocument(document: Document, dom: SvgDomAdapter, warnings: string[], depth = 0) {
  const root = document.documentElement;
  let removedCount = 0;
  for (const element of [root, ...walkElements(root)]) {
    const name = elementName(element);
    if (DANGEROUS_ELEMENT_NAMES.has(name)) {
      element.parentNode?.removeChild(element);
      removedCount += 1;
      continue;
    }
    if (name === "style" && EXECUTABLE_STYLE_PATTERN.test(String(element.textContent || ""))) {
      element.parentNode?.removeChild(element);
      removedCount += 1;
      continue;
    }
    for (let index = element.attributes.length - 1; index >= 0; index -= 1) {
      const attribute = element.attributes.item(index);
      if (!attribute) {
        continue;
      }
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value;
      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        removedCount += 1;
        continue;
      }
      if (attributeName === "style" && EXECUTABLE_STYLE_PATTERN.test(attributeValue)) {
        element.removeAttribute(attribute.name);
        removedCount += 1;
        continue;
      }
      if (!URL_ATTRIBUTE_NAMES.has(attributeName)) {
        continue;
      }
      if (!safeUrl(attributeValue)) {
        element.removeAttribute(attribute.name);
        removedCount += 1;
        continue;
      }
      if (normalizedUrlForSafety(attributeValue).startsWith("data:image/svg+xml")) {
        const sanitized = sanitizeSvgDataUrl(attributeValue, dom, warnings, depth);
        if (sanitized) {
          element.setAttribute(attribute.name, sanitized);
        } else {
          element.removeAttribute(attribute.name);
        }
        if (sanitized !== attributeValue) {
          removedCount += 1;
        }
      }
    }
  }
  if (removedCount > 0) {
    warnings.push(`已清理 ${removedCount} 项不安全的 SVG 内容。`);
  }
  return document;
}

function parseSvgDocument(source: string, dom: SvgDomAdapter) {
  let document: Document;
  try {
    document = dom.parse(source);
  } catch (error) {
    throw new Error(error instanceof Error ? `SVG XML 解析失败：${error.message}` : "SVG XML 解析失败。");
  }
  const root = document.documentElement;
  if (!root || elementName(root) !== "svg") {
    throw new Error("文件根节点不是 SVG。");
  }
  return document;
}

function parseSvgLength(value: string | null) {
  const text = String(value ?? "").trim();
  if (!text || text.endsWith("%")) {
    return Number.NaN;
  }
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function svgViewport(root: Element, warnings: string[]) {
  const viewBox = String(root.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/u)
    .filter(Boolean)
    .map(Number);
  if (viewBox.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  const width = parseSvgLength(root.getAttribute("width"));
  const height = parseSvgLength(root.getAttribute("height"));
  if (width > 0 && height > 0) {
    return { width, height };
  }
  warnings.push(`SVG 未提供有效画布尺寸，使用默认尺寸 ${DEFAULT_CANVAS_WIDTH} x ${DEFAULT_CANVAS_HEIGHT}。`);
  return { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT };
}

function platformSvg(root: Element) {
  const all = [root, ...walkElements(root)];
  const hasRoot = all.some((element) => element.getAttribute("id") === "root_g");
  const semanticLayerIds = new Set(["Segment_Layer", "Text_Layer", "Measurement_Layer", "Other_Layer"]);
  const hasLayer = all.some((element) => semanticLayerIds.has(String(element.getAttribute("id") || "")));
  const hasMetadata = all.some((element) =>
    ["dev-kind", "dev-id", "source-dev-id", "target-dev-id"].some((name) => element.hasAttribute(name))
  );
  return hasRoot && hasLayer && hasMetadata;
}

function uniqueModelId(raw: string, fallback: string, used: Set<string>, warnings: string[]) {
  const requested = raw.trim();
  const normalized = requested
    .replace(/[^A-Za-z0-9_.:-]+/gu, "-")
    .replace(/^[^A-Za-z_]+/u, "");
  const base = normalized || fallback;
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  used.add(candidate);
  if (candidate !== requested) {
    warnings.push(`SVG 标识“${requested || fallback}”已规范化为“${candidate}”。`);
  }
  return candidate;
}

function parseGeometryTransform(symbol: Element | undefined) {
  const transformed = symbol
    ? [symbol, ...walkElements(symbol)].find((element) => /\b(?:rotate|scale)\s*\(/u.test(String(element.getAttribute("transform") || "")))
    : undefined;
  const transform = String(transformed?.getAttribute("transform") || "");
  const rotation = Number(/rotate\s*\(\s*([-+\d.eE]+)/u.exec(transform)?.[1] || 0);
  const scale = /scale\s*\(\s*([-+\d.eE]+)(?:[\s,]+([-+\d.eE]+))?/u.exec(transform);
  const scaleX = Number(scale?.[1] || 1);
  const scaleY = Number(scale?.[2] || scale?.[1] || 1);
  return {
    rotation: Number.isFinite(rotation) ? rotation : 0,
    scaleX: Number.isFinite(scaleX) && scaleX !== 0 ? scaleX : 1,
    scaleY: Number.isFinite(scaleY) && scaleY !== 0 ? scaleY : 1
  };
}

function stateFromHref(href: string) {
  const match = /_state_([^#]+)$/u.exec(href.replace(/^#/, ""));
  return match?.[1] && match[1] !== "default" ? match[1] : "";
}

function elementNumber(element: Element, name: string, fallback: number) {
  const parsed = Number.parseFloat(String(element.getAttribute(name) || ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validTerminalType(value: string) {
  return value === "ac" || value === "dc" || value === "h2" || value === "heat";
}

function platformLayers(root: Element, nodes: readonly ModelNode[], warnings: string[]) {
  const definitionLayer = [root, ...walkElements(root)].find((element) => hasClass(element, "export-layer-definitions"));
  const usedIds = new Set<string>();
  const layers: ModelLayer[] = [];
  for (const element of definitionLayer ? childElements(definitionLayer) : []) {
    const rawId = String(element.getAttribute("layer-id") || "").trim();
    if (!rawId || usedIds.has(rawId)) {
      continue;
    }
    usedIds.add(rawId);
    layers.push({
      id: rawId,
      name: String(element.getAttribute("name") || rawId).trim() || rawId,
      visible: element.getAttribute("visible") !== "0"
    });
  }
  if (layers.length === 0) {
    layers.push({ id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true });
    warnings.push("平台 SVG 缺少图层定义，已创建默认图层。");
  } else if (!layers.some((layer) => layer.id === DEFAULT_MODEL_LAYER_ID)) {
    const needsDefault = nodes.some((node) => !layers.some((layer) => layer.id === node.layerId));
    if (needsDefault) {
      layers.unshift({ id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true });
    }
  }
  const requestedActive = String(root.getAttribute("active-layer-id") || "").trim()
    || String(childElements(definitionLayer ?? root).find((element) => element.getAttribute("active") === "1")?.getAttribute("layer-id") || "").trim();
  const activeLayerId = layers.some((layer) => layer.id === requestedActive) ? requestedActive : layers[0].id;
  return { layers, activeLayerId };
}

function platformBackgroundColor(root: Element) {
  const layer = findById(root, "Background_Layer");
  if (!layer) {
    return "transparent";
  }
  const rect = [layer, ...walkElements(layer)].find((element) => elementName(element) === "rect");
  if (!rect) {
    return "transparent";
  }
  const directFill = String(rect.getAttribute("fill") || "").trim();
  if (directFill && !directFill.startsWith("url(")) {
    return directFill;
  }
  const styleFill = /(?:^|;)\s*fill\s*:\s*([^;]+)/iu.exec(String(rect.getAttribute("style") || ""))?.[1]?.trim();
  return styleFill && !styleFill.startsWith("url(") ? styleFill : "transparent";
}

function nodeTopologyNumber(node: ModelNode, type: "ac" | "dc") {
  const value = node.terminals.find((terminal) => terminal.type === type)?.nodeNumber
    || (node.terminals.length === 0 ? node.nodeNumber : "");
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function restoreTerminalMetadata(node: ModelNode, element: Element) {
  const commonNodeNumber = String(element.getAttribute("node") || "").trim();
  const terminals = node.terminals.map((terminal, index) => {
    const suffix = node.terminals.length > 1 ? `-${index + 1}` : "";
    const nodeNumber = String(element.getAttribute(`node${suffix}`) || commonNodeNumber || terminal.nodeNumber).trim();
    const rawType = String(element.getAttribute(`voltage-type${suffix}`) || element.getAttribute("voltage-type") || terminal.type).trim();
    const type = validTerminalType(rawType) ? rawType : terminal.type;
    const vbase = String(element.getAttribute(`vbase${suffix}`) || element.getAttribute("vbase") || terminal.vbase || "").trim();
    return { ...terminal, nodeNumber, type, vbase };
  });
  const nodeNumber = commonNodeNumber || terminals[0]?.nodeNumber || node.nodeNumber;
  const next = { ...node, nodeNumber, terminals };
  return {
    ...next,
    acTopologyNode: nodeTopologyNumber(next, "ac"),
    dcTopologyNode: nodeTopologyNumber(next, "dc")
  };
}

function symbolForUse(root: Element, use: Element) {
  const id = elementHref(use).replace(/^#/, "");
  return id ? findById(root, id) : undefined;
}

function isInsideDefs(element: Element) {
  let parent = element.parentNode;
  while (parent && parent.nodeType === 1) {
    if (elementName(parent as Element) === "defs") {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}

async function parsePlatformSvg(
  document: Document,
  options: SvgModelImportOptions,
  warnings: string[]
): Promise<SvgModelImportResult> {
  const root = document.documentElement;
  const { width: canvasWidth, height: canvasHeight } = svgViewport(root, warnings);
  const templates = options.templates ?? DEVICE_LIBRARY;
  const templateByKind = new Map(templates.map((template) => [template.kind, template]));
  const usedNodeIds = new Set<string>();
  const nodeIdBySvgId = new Map<string, string>();
  const nodes: ModelNode[] = [];
  const semanticUses = [root, ...walkElements(root)].filter((element) =>
    elementName(element) === "use" && element.hasAttribute("dev-kind") && !isInsideDefs(element)
  );
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 200));
  const yieldToMain = options.yieldToMain ?? (() => new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0)));
  let defaultedDeviceCount = 0;

  for (let index = 0; index < semanticUses.length; index += 1) {
    const element = semanticUses[index];
    const kind = String(element.getAttribute("dev-kind") || "").trim();
    const template = templateByKind.get(kind);
    if (!template || kind.startsWith("static-")) {
      continue;
    }
    const rawId = String(element.getAttribute("dev-id") || element.getAttribute("id") || `${kind}-${index + 1}`);
    const id = uniqueModelId(rawId, `${kind}-${index + 1}`, usedNodeIds, warnings);
    const symbol = symbolForUse(root, element);
    const transform = parseGeometryTransform(symbol);
    const nodeWidth = Math.max(1, elementNumber(element, "width", template.size.width));
    const nodeHeight = Math.max(1, elementNumber(element, "height", template.size.height));
    const x = elementNumber(element, "x", 0);
    const y = elementNumber(element, "y", 0);
    const baseNode = createNodeFromTemplate(template, { x: x + nodeWidth / 2, y: y + nodeHeight / 2 });
    const requestedLayerId = String(element.getAttribute("layer-id") || DEFAULT_MODEL_LAYER_ID).trim() || DEFAULT_MODEL_LAYER_ID;
    const status = stateFromHref(elementHref(element));
    const node = restoreTerminalMetadata({
      ...baseNode,
      id,
      name: String(element.getAttribute("name") || template.label).trim() || template.label,
      layerId: requestedLayerId,
      size: { width: nodeWidth, height: nodeHeight },
      rotation: transform.rotation,
      scale: 1,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      params: {
        ...baseNode.params,
        ...(element.hasAttribute("idx") ? { idx: String(element.getAttribute("idx") || "") } : {}),
        ...(status ? { status } : {})
      }
    }, element);
    nodes.push(node);
    for (const alias of [rawId, element.getAttribute("dev-id"), element.getAttribute("id")]) {
      const normalizedAlias = String(alias || "").trim();
      if (normalizedAlias && !nodeIdBySvgId.has(normalizedAlias)) {
        nodeIdBySvgId.set(normalizedAlias, id);
      }
    }
    defaultedDeviceCount += 1;
    if ((index + 1) % batchSize === 0 && index + 1 < semanticUses.length) {
      await yieldToMain();
    }
  }

  if (nodes.length === 0) {
    warnings.push("平台 SVG 未恢复出有效设备，已按普通 SVG 整体导入。");
    return genericSvgResult(document, options.dom ?? browserDomAdapter(), options, warnings);
  }
  const layerState = platformLayers(root, nodes, warnings);
  const validLayerIds = new Set(layerState.layers.map((layer) => layer.id));
  const normalizedNodes = nodes.map((node) => {
    if (validLayerIds.has(node.layerId ?? "")) {
      return node;
    }
    warnings.push(`设备“${node.name}”引用的图层“${node.layerId}”不存在，已移入默认图层。`);
    return { ...node, layerId: validLayerIds.has(DEFAULT_MODEL_LAYER_ID) ? DEFAULT_MODEL_LAYER_ID : layerState.layers[0].id };
  });
  if (defaultedDeviceCount > 0) {
    warnings.push(`${defaultedDeviceCount} 个设备未包含完整静态参数，已使用当前元件模板默认值补齐。`);
  }
  const project: ProjectFile = {
    version: 1,
    name: options.name.trim() || "SVG 导入模型",
    layers: layerState.layers,
    activeLayerId: layerState.activeLayerId,
    canvasWidth,
    canvasHeight,
    canvasBackgroundColor: platformBackgroundColor(root),
    measurements: { version: 1, groups: [] },
    nodes: normalizedNodes,
    edges: []
  };
  void nodeIdBySvgId;
  return {
    mode: "platform",
    project,
    stats: { nodes: normalizedNodes.length, edges: 0, measurementGroups: 0, staticNodes: 0 },
    warnings
  };
}

function staticImageNode(
  template: DeviceTemplate,
  id: string,
  name: string,
  svg: string,
  width: number,
  height: number
): ModelNode {
  const node = createNodeFromTemplate(template, { x: width / 2, y: height / 2 });
  return {
    ...node,
    id,
    name,
    size: { width, height },
    params: {
      ...node.params,
      backgroundImage: svgDataUrl(svg),
      backgroundImageAssetId: "",
      backgroundImageFit: "stretch",
      fillColor: "transparent",
      strokeColor: "transparent",
      lineWidth: "0",
      allowResizeTransform: "1"
    }
  };
}

function genericSvgResult(
  document: Document,
  dom: SvgDomAdapter,
  options: SvgModelImportOptions,
  warnings: string[]
): SvgModelImportResult {
  const { width, height } = svgViewport(document.documentElement, warnings);
  const templates = options.templates ?? DEVICE_LIBRARY;
  const staticImageTemplate = templates.find((template) => template.kind === "static-image")
    ?? DEVICE_LIBRARY.find((template) => template.kind === "static-image");
  if (!staticImageTemplate) {
    throw new Error("当前图元库缺少 static-image 模板，无法导入 SVG。");
  }
  const modelName = options.name.trim() || "SVG 导入模型";
  const node = staticImageNode(
    staticImageTemplate,
    "static-image-1",
    modelName,
    dom.serialize(document.documentElement),
    width,
    height
  );
  const project: ProjectFile = {
    version: 1,
    name: modelName,
    layers: [{ id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true }],
    activeLayerId: DEFAULT_MODEL_LAYER_ID,
    canvasWidth: width,
    canvasHeight: height,
    canvasBackgroundColor: "transparent",
    measurements: { version: 1, groups: [] },
    nodes: [node],
    edges: []
  };
  return {
    mode: "generic",
    project,
    stats: { nodes: 0, edges: 0, measurementGroups: 0, staticNodes: 1 },
    warnings
  };
}

export async function parseSvgModel(source: string, options: SvgModelImportOptions): Promise<SvgModelImportResult> {
  if (!String(source ?? "").trim()) {
    throw new Error("SVG 文件为空。");
  }
  const dom = options.dom ?? browserDomAdapter();
  const warnings: string[] = [];
  const document = parseSvgDocument(source, dom);
  sanitizeDocument(document, dom, warnings);
  if (platformSvg(document.documentElement)) {
    return parsePlatformSvg(document, { ...options, dom }, warnings);
  }
  return genericSvgResult(document, dom, options, warnings);
}
