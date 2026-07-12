import {
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEVICE_LIBRARY,
  createNodeFromTemplate,
  getSafeNodeScaleX,
  getSafeNodeScaleY,
  getTerminalPoint,
  isBusNode,
  type DeviceTemplate,
  type Edge,
  type ModelNode,
  type ModelLayer,
  type Point,
  type ProjectFile
} from "./model";
import {
  measurementFontScaleForNode,
  measurementOffsetScaleForNode,
  type MeasurementGroup,
  type MeasurementGroupAnchor,
  type MeasurementGroupBorderStyle,
  type MeasurementGroupLayout,
  type MeasurementItemBinding,
  type MeasurementStyleOverride
} from "./measurements";

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
  if (normalized.startsWith("data:image/")) {
    return true;
  }
  return !/^[a-z][a-z0-9+.-]*:/iu.test(normalized);
}

function relativeResourceUrl(value: string) {
  const normalized = normalizedUrlForSafety(value);
  return Boolean(
    normalized &&
    !normalized.startsWith("#") &&
    !normalized.startsWith("/") &&
    !/^[a-z][a-z0-9+.-]*:/iu.test(normalized)
  );
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
  let relativeImageWarningAdded = false;
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
      if (!relativeImageWarningAdded && elementName(element) === "image" && relativeResourceUrl(attributeValue)) {
        warnings.push("SVG 包含相对图片路径；离开原目录后，该图片可能无法加载。");
        relativeImageWarningAdded = true;
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

function imageFitFromPreserveAspectRatio(value: string) {
  const normalized = value.trim().replace(/\s+/gu, " ");
  if (normalized === "none") {
    return "stretch";
  }
  if (normalized.includes("xMidYMin") && normalized.includes("slice")) {
    return "fill-x";
  }
  if (normalized.includes("xMinYMid") && normalized.includes("slice")) {
    return "fill-y";
  }
  if (normalized.includes("slice")) {
    return "cover";
  }
  return "fixed";
}

function platformBackgroundImage(root: Element, dom: SvgDomAdapter) {
  const layer = findById(root, "Background_Layer");
  if (!layer) {
    return { image: "", fit: "stretch" };
  }
  const elements = [layer, ...walkElements(layer)];
  const imageElement = elements.find((element) =>
    hasClass(element, "export-canvas-background-image") &&
    (elementName(element) === "image" || elementName(element) === "svg")
  );
  if (imageElement) {
    const image = elementName(imageElement) === "image"
      ? elementHref(imageElement)
      : svgDataUrl(dom.serialize(imageElement));
    return {
      image,
      fit: imageFitFromPreserveAspectRatio(String(imageElement.getAttribute("preserveAspectRatio") || ""))
    };
  }
  const tiledRect = elements.find((element) =>
    elementName(element) === "rect" && hasClass(element, "export-canvas-background-image")
  );
  const patternId = /url\(\s*#([^\s)]+)\s*\)/u.exec(String(tiledRect?.getAttribute("fill") || ""))?.[1];
  const pattern = patternId ? findById(root, patternId) : undefined;
  const tiledImage = pattern
    ? [pattern, ...walkElements(pattern)].find((element) => elementName(element) === "image")
    : undefined;
  return {
    image: tiledImage ? elementHref(tiledImage) : "",
    fit: tiledImage ? "tile" : "stretch"
  };
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

function hasAncestorId(element: Element, id: string) {
  let parent = element.parentNode;
  while (parent && parent.nodeType === 1) {
    if ((parent as Element).getAttribute("id") === id) {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}

function isInsideNestedSvg(element: Element, root: Element) {
  let parent = element.parentNode;
  while (parent && parent.nodeType === 1 && parent !== root) {
    if (elementName(parent as Element) === "svg") {
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
  const dom = options.dom ?? browserDomAdapter();
  const { width: canvasWidth, height: canvasHeight } = svgViewport(root, warnings);
  const templates = options.templates ?? DEVICE_LIBRARY;
  const templateByKind = new Map(templates.map((template) => [template.kind, template]));
  const staticImageTemplate = templateByKind.get("static-image")
    ?? DEVICE_LIBRARY.find((template) => template.kind === "static-image");
  const staticTextTemplate = templateByKind.get("static-text")
    ?? DEVICE_LIBRARY.find((template) => template.kind === "static-text");
  if (!staticImageTemplate || !staticTextTemplate) {
    throw new Error("当前图元库缺少 SVG 导入所需的静态图元模板。");
  }
  const usedNodeIds = new Set<string>();
  const usedEdgeIds = new Set<string>();
  const usedMeasurementGroupIds = new Set<string>();
  const nodeIdBySvgId = new Map<string, string>();
  const nodes: ModelNode[] = [];
  const semanticUses = [root, ...walkElements(root)].filter((element) =>
    elementName(element) === "use" &&
    !isInsideDefs(element) &&
    !hasAncestorId(element, "Background_Layer") &&
    !isInsideNestedSvg(element, root)
  );
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 200));
  const yieldToMain = options.yieldToMain ?? (() => new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0)));
  let deviceCount = 0;
  let staticNodeCount = 0;
  let defaultedDeviceCount = 0;

  for (let index = 0; index < semanticUses.length; index += 1) {
    const element = semanticUses[index];
    const declaredKind = String(element.getAttribute("dev-kind") || "").trim();
    const href = elementHref(element);
    const kind = declaredKind || inferredKindFromHref(href, templates);
    const template = templateByKind.get(kind);
    const symbol = symbolForUse(root, element);
    const fallbackWidth = template?.size.width ?? 120;
    const fallbackHeight = template?.size.height ?? 80;
    const nodeWidth = Math.max(1, elementNumber(element, "width", fallbackWidth));
    const nodeHeight = Math.max(1, elementNumber(element, "height", fallbackHeight));
    const x = elementNumber(element, "x", 0);
    const y = elementNumber(element, "y", 0);
    const requestedLayerId = String(element.getAttribute("layer-id") || DEFAULT_MODEL_LAYER_ID).trim() || DEFAULT_MODEL_LAYER_ID;
    const rawId = String(element.getAttribute("dev-id") || element.getAttribute("id") || `${kind || "svg-node"}-${index + 1}`);
    const id = uniqueModelId(rawId, `${kind || "svg-node"}-${index + 1}`, usedNodeIds, warnings);
    let node: ModelNode | null = null;
    if (template && !kind.startsWith("static-")) {
      const transform = parseGeometryTransform(symbol);
      const baseNode = createNodeFromTemplate(template, { x: x + nodeWidth / 2, y: y + nodeHeight / 2 });
      const status = stateFromHref(href);
      node = restoreTerminalMetadata({
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
      deviceCount += 1;
      defaultedDeviceCount += 1;
    } else if (symbol) {
      node = positionedStaticImageNode({
        template: staticImageTemplate,
        id,
        name: String(element.getAttribute("name") || declaredKind || kind || "SVG 静态图元").trim() || "SVG 静态图元",
        svg: standaloneSymbolSvg(root, symbol, dom, nodeWidth, nodeHeight),
        width: nodeWidth,
        height: nodeHeight,
        position: { x: x + nodeWidth / 2, y: y + nodeHeight / 2 },
        layerId: requestedLayerId
      });
      staticNodeCount += 1;
      if (declaredKind && !template) {
        warnings.push(`设备类型“${declaredKind}”在当前元件库中不存在，已降级为静态 SVG 图元。`);
      }
    } else if (declaredKind) {
      warnings.push(`设备“${rawId}”引用的 SVG symbol 不存在，无法恢复其图形。`);
    }
    if (!node) {
      usedNodeIds.delete(id);
      continue;
    }
    nodes.push(node);
    for (const alias of [rawId, element.getAttribute("dev-id"), element.getAttribute("id")]) {
      const normalizedAlias = String(alias || "").trim();
      if (normalizedAlias && !nodeIdBySvgId.has(normalizedAlias)) {
        nodeIdBySvgId.set(normalizedAlias, id);
      }
    }
    if ((index + 1) % batchSize === 0 && index + 1 < semanticUses.length) {
      await yieldToMain();
    }
  }

  const nodeIndexById = new Map(nodes.map((node, index) => [node.id, index]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const updateNode = (node: ModelNode) => {
    const index = nodeIndexById.get(node.id);
    if (index === undefined) {
      return;
    }
    nodes[index] = node;
    nodeById.set(node.id, node);
  };

  const edges: Edge[] = [];
  const segmentLayer = findById(root, "Segment_Layer");
  const edgePaths = segmentLayer
    ? walkElements(segmentLayer).filter((element) => elementName(element) === "path")
    : [];
  for (let index = 0; index < edgePaths.length; index += 1) {
    const path = edgePaths[index];
    const rawId = String(path.getAttribute("id") || `edge-${index + 1}`);
    const sourceSvgId = String(path.getAttribute("source-dev-id") || "").trim();
    const targetSvgId = String(path.getAttribute("target-dev-id") || "").trim();
    const sourceId = nodeIdBySvgId.get(sourceSvgId);
    const targetId = nodeIdBySvgId.get(targetSvgId);
    const points = parsePolylinePath(String(path.getAttribute("d") || ""));
    const source = sourceId ? nodeById.get(sourceId) : undefined;
    const target = targetId ? nodeById.get(targetId) : undefined;
    const edgeId = uniqueModelId(rawId, `edge-${index + 1}`, usedEdgeIds, warnings);
    const sourceMatch = source && points ? matchedTerminal(source, points[0], warnings, edgeId, "首") : null;
    const targetMatch = target && points ? matchedTerminal(target, points[points.length - 1], warnings, edgeId, "末") : null;
    if (!points || !source || !target || !sourceMatch || !targetMatch) {
      const fallbackId = uniqueModelId(`static-${edgeId}`, `static-edge-${index + 1}`, usedNodeIds, warnings);
      nodes.push(positionedStaticImageNode({
        template: staticImageTemplate,
        id: fallbackId,
        name: `未识别连接线 ${rawId}`,
        svg: standaloneCanvasElementSvg(root, path, dom, canvasWidth, canvasHeight),
        width: canvasWidth,
        height: canvasHeight,
        position: { x: canvasWidth / 2, y: canvasHeight / 2 },
        layerId: DEFAULT_MODEL_LAYER_ID
      }));
      staticNodeCount += 1;
      warnings.push(`连接线“${rawId}”无法恢复拓扑，已保留为静态 SVG 图元。`);
      continue;
    }
    edges.push({
      id: edgeId,
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: sourceMatch.terminalId,
      targetTerminalId: targetMatch.terminalId,
      sourcePoint: sourceMatch.endpointPoint,
      targetPoint: targetMatch.endpointPoint,
      routePoints: points.map((point) => ({ ...point }))
    });
    if ((index + 1) % batchSize === 0 && index + 1 < edgePaths.length) {
      await yieldToMain();
    }
  }

  const textLayer = findById(root, "Text_Layer");
  const labelTexts = textLayer
    ? walkElements(textLayer).filter((element) => elementName(element) === "text")
    : [];
  const labelsByNodeId = new Map<string, Element[]>();
  const unmatchedLabels: Element[] = [];
  for (const text of labelTexts) {
    const nodeId = nodeIdBySvgId.get(String(text.getAttribute("dev-id") || "").trim());
    if (!nodeId || !nodeById.has(nodeId)) {
      unmatchedLabels.push(text);
      continue;
    }
    const labels = labelsByNodeId.get(nodeId) ?? [];
    labels.push(text);
    labelsByNodeId.set(nodeId, labels);
  }
  for (const [nodeId, texts] of labelsByNodeId) {
    const node = nodeById.get(nodeId);
    if (!node || texts.length === 0) {
      continue;
    }
    const first = texts[0];
    const labelText = texts.map(elementText).join("");
    const center = {
      x: texts.reduce((sum, text) => sum + elementNumber(text, "x", node.position.x), 0) / texts.length,
      y: texts.reduce((sum, text) => sum + elementNumber(text, "y", node.position.y), 0) / texts.length
    };
    const scaleX = getSafeNodeScaleX(node) || 1;
    const scaleY = getSafeNodeScaleY(node) || 1;
    const fontScale = Math.sqrt(scaleX * scaleY) || 1;
    updateNode({
      ...node,
      params: {
        ...node.params,
        _labelText: labelText || node.name,
        _labelX: String((center.x - node.position.x) / scaleX),
        _labelY: String((center.y - node.position.y) / scaleY),
        _labelColor: elementStyleValue(first, "fill") || "#334155",
        _labelFontFamily: elementStyleValue(first, "font-family") || "Arial",
        _labelFontSize: String(numericStyleValue(first, "font-size", 14) / fontScale),
        _labelFontWeight: elementStyleValue(first, "font-weight") || "500",
        _labelFontStyle: elementStyleValue(first, "font-style") || "normal",
        _labelTextDecoration: elementStyleValue(first, "text-decoration") || "none",
        _labelTextAnchor: String(first.getAttribute("text-anchor") || "middle"),
        _labelRotation: texts.length > 1 ? "90" : "0",
        _labelVisible: texts.every(elementHidden) ? "0" : "1",
        _labelDisplayMode: "follow"
      }
    });
  }
  for (let index = 0; index < unmatchedLabels.length; index += 1) {
    const text = unmatchedLabels[index];
    const id = uniqueModelId(String(text.getAttribute("id") || `static-text-${index + 1}`), `static-text-${index + 1}`, usedNodeIds, warnings);
    nodes.push(staticTextNode(
      staticTextTemplate,
      text,
      id,
      String(text.getAttribute("layer-id") || DEFAULT_MODEL_LAYER_ID).trim() || DEFAULT_MODEL_LAYER_ID
    ));
    staticNodeCount += 1;
    warnings.push(`Text_Layer 中的文本“${elementText(text)}”未关联到设备，已恢复为静态文本。`);
  }

  const measurements: MeasurementGroup[] = [];
  const measurementLayer = findById(root, "Measurement_Layer");
  const measurementElements = measurementLayer
    ? walkElements(measurementLayer).filter((element) => elementName(element) === "g" && hasClass(element, "mg"))
    : [];
  for (let index = 0; index < measurementElements.length; index += 1) {
    const groupElement = measurementElements[index];
    const svgDeviceId = String(groupElement.getAttribute("dev") || "").trim();
    const nodeId = nodeIdBySvgId.get(svgDeviceId);
    const node = nodeId ? nodeById.get(nodeId) : undefined;
    const terminalId = String(groupElement.getAttribute("term") || "").trim() || undefined;
    if (!node) {
      warnings.push(`量测组引用的设备“${svgDeviceId}”不存在，已跳过。`);
      continue;
    }
    if (terminalId && !node.terminals.some((terminal) => terminal.id === terminalId) && !isBusNode(node)) {
      warnings.push(`设备“${node.name}”不存在端子“${terminalId}”，对应量测组已跳过。`);
      continue;
    }
    const { textRows, items } = measurementItemsForGroup(groupElement, node, terminalId, warnings);
    if (items.length === 0) {
      continue;
    }
    const rect = walkElements(groupElement).find((element) => elementName(element) === "rect");
    const position = parseTranslate(String(groupElement.getAttribute("transform") || ""));
    const anchorPoint = terminalId ? getTerminalPoint(node, terminalId) : node.position;
    const offsetScale = measurementOffsetScaleForNode(node);
    const baseGroupId = terminalId ? `measurement-${node.id}-${terminalId}` : `measurement-${node.id}`;
    const id = uniqueModelId(baseGroupId, `measurement-group-${index + 1}`, usedMeasurementGroupIds, warnings);
    measurements.push({
      id,
      nodeId: node.id,
      terminalId,
      visible: !elementHidden(groupElement),
      labelVisible: items.some((item) => Boolean(item.labelOverride)),
      unitVisible: items.some((item) => Boolean(item.unitOverride)),
      backgroundColor: rect ? elementStyleValue(rect, "fill") || "transparent" : "transparent",
      borderColor: rect ? elementStyleValue(rect, "stroke") || "#64748b" : "#64748b",
      borderStyle: measurementBorderStyle(rect),
      borderWidth: rect ? numericStyleValue(rect, "stroke-width", 0) : 0,
      anchor: terminalId ? terminalMeasurementAnchor(node, terminalId) : "custom",
      offset: {
        x: (position.x - anchorPoint.x) / (offsetScale.x || 1),
        y: (position.y - anchorPoint.y) / (offsetScale.y || 1)
      },
      layout: inferredMeasurementLayout(textRows),
      items
    });
    if ((index + 1) % batchSize === 0 && index + 1 < measurementElements.length) {
      await yieldToMain();
    }
  }

  const otherLayer = findById(root, "Other_Layer");
  const otherElements = otherLayer ? childElements(otherLayer) : [];
  for (let index = 0; index < otherElements.length; index += 1) {
    const element = otherElements[index];
    const id = uniqueModelId(String(element.getAttribute("id") || `static-other-${index + 1}`), `static-other-${index + 1}`, usedNodeIds, warnings);
    nodes.push(positionedStaticImageNode({
      template: staticImageTemplate,
      id,
      name: `SVG 辅助图元 ${index + 1}`,
      svg: standaloneCanvasElementSvg(root, element, dom, canvasWidth, canvasHeight),
      width: canvasWidth,
      height: canvasHeight,
      position: { x: canvasWidth / 2, y: canvasHeight / 2 },
      layerId: String(element.getAttribute("layer-id") || DEFAULT_MODEL_LAYER_ID).trim() || DEFAULT_MODEL_LAYER_ID
    }));
    staticNodeCount += 1;
  }

  if (nodes.length === 0) {
    warnings.push("平台 SVG 未恢复出有效设备或静态图元，已按普通 SVG 整体导入。");
    return genericSvgResult(document, dom, options, warnings);
  }
  const layerState = platformLayers(root, nodes, warnings);
  const validLayerIds = new Set(layerState.layers.map((layer) => layer.id));
  const normalizedNodes = nodes.map((node) => {
    if (validLayerIds.has(node.layerId ?? "")) {
      return node;
    }
    warnings.push(`图元“${node.name}”引用的图层“${node.layerId}”不存在，已移入默认图层。`);
    return { ...node, layerId: validLayerIds.has(DEFAULT_MODEL_LAYER_ID) ? DEFAULT_MODEL_LAYER_ID : layerState.layers[0].id };
  });
  if (defaultedDeviceCount > 0) {
    warnings.push(`${defaultedDeviceCount} 个设备未包含完整静态参数，已使用当前元件模板默认值补齐。`);
  }
  const backgroundImage = platformBackgroundImage(root, dom);
  const project: ProjectFile = {
    version: 1,
    name: options.name.trim() || "SVG 导入模型",
    layers: layerState.layers,
    activeLayerId: layerState.activeLayerId,
    canvasWidth,
    canvasHeight,
    canvasBackgroundColor: platformBackgroundColor(root),
    canvasBackgroundImage: backgroundImage.image,
    canvasBackgroundImageFit: backgroundImage.fit,
    measurements: { version: 1, groups: measurements },
    nodes: normalizedNodes,
    edges
  };
  return {
    mode: "platform",
    project,
    stats: { nodes: deviceCount, edges: edges.length, measurementGroups: measurements.length, staticNodes: staticNodeCount },
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

function positionedStaticImageNode(options: {
  template: DeviceTemplate;
  id: string;
  name: string;
  svg: string;
  width: number;
  height: number;
  position: Point;
  layerId: string;
}) {
  return {
    ...staticImageNode(options.template, options.id, options.name, options.svg, options.width, options.height),
    position: { ...options.position },
    layerId: options.layerId
  };
}

function serializedChildNodes(element: Element, dom: SvgDomAdapter) {
  const markup: string[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const child = element.childNodes.item(index);
    if (child) {
      markup.push(dom.serialize(child));
    }
  }
  return markup.join("");
}

function sharedDefinitionMarkup(root: Element, dom: SvgDomAdapter) {
  const defs = [root, ...walkElements(root)].find((element) => elementName(element) === "defs");
  if (!defs) {
    return "";
  }
  return childElements(defs)
    .filter((element) => elementName(element) !== "symbol")
    .map((element) => dom.serialize(element))
    .join("");
}

function standaloneSvgMarkup(options: {
  root: Element;
  dom: SvgDomAdapter;
  body: string;
  viewBox: string;
}) {
  const sharedDefs = sharedDefinitionMarkup(options.root, options.dom);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${options.viewBox}">${sharedDefs ? `<defs>${sharedDefs}</defs>` : ""}${options.body}</svg>`;
}

function standaloneSymbolSvg(root: Element, symbol: Element, dom: SvgDomAdapter, width: number, height: number) {
  const viewBox = String(symbol.getAttribute("viewBox") || `0 0 ${width} ${height}`).trim();
  return standaloneSvgMarkup({
    root,
    dom,
    viewBox,
    body: serializedChildNodes(symbol, dom)
  });
}

function standaloneCanvasElementSvg(root: Element, element: Element, dom: SvgDomAdapter, width: number, height: number) {
  return standaloneSvgMarkup({
    root,
    dom,
    viewBox: `0 0 ${width} ${height}`,
    body: dom.serialize(element)
  });
}

function inferredKindFromHref(href: string, templates: readonly DeviceTemplate[]) {
  const symbolId = href.replace(/^#/, "");
  const sortedKinds = templates.map((template) => template.kind).sort((left, right) => right.length - left.length);
  return sortedKinds.find((kind) => symbolId.includes(`_${kind}_`) || symbolId.endsWith(`_${kind}`)) ?? "";
}

function parsePolylinePath(data: string) {
  const withoutNumbers = data
    .replace(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/giu, "")
    .replace(/[\s,]/gu, "");
  if (/[^MLHVZmlhvz]/u.test(withoutNumbers)) {
    return null;
  }
  const tokens = data.match(/[MLHVZmlhvz]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/giu) ?? [];
  const points: Point[] = [];
  let command = "";
  let x = 0;
  let y = 0;
  let index = 0;
  const readNumber = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/u.test(tokens[index])) {
      command = tokens[index++];
    }
    if (!command) {
      return null;
    }
    if (command === "Z" || command === "z") {
      break;
    }
    const relative = command === command.toLowerCase();
    if (command === "M" || command === "m" || command === "L" || command === "l") {
      if (index + 1 >= tokens.length || /^[A-Za-z]$/u.test(tokens[index]) || /^[A-Za-z]$/u.test(tokens[index + 1])) {
        return null;
      }
      const nextX = readNumber();
      const nextY = readNumber();
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
        return null;
      }
      x = relative ? x + nextX : nextX;
      y = relative ? y + nextY : nextY;
      points.push({ x, y });
      if (command === "M" || command === "m") {
        command = relative ? "l" : "L";
      }
      continue;
    }
    if (command === "H" || command === "h") {
      if (index >= tokens.length || /^[A-Za-z]$/u.test(tokens[index])) {
        return null;
      }
      const nextX = readNumber();
      if (!Number.isFinite(nextX)) {
        return null;
      }
      x = relative ? x + nextX : nextX;
      points.push({ x, y });
      continue;
    }
    if (command === "V" || command === "v") {
      if (index >= tokens.length || /^[A-Za-z]$/u.test(tokens[index])) {
        return null;
      }
      const nextY = readNumber();
      if (!Number.isFinite(nextY)) {
        return null;
      }
      y = relative ? y + nextY : nextY;
      points.push({ x, y });
      continue;
    }
    return null;
  }
  const deduplicated = points.filter((point, pointIndex) =>
    pointIndex === 0 || point.x !== points[pointIndex - 1].x || point.y !== points[pointIndex - 1].y
  );
  return deduplicated.length >= 2 ? deduplicated : null;
}

function pointDistance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function matchedTerminal(node: ModelNode, point: Point, warnings: string[], edgeId: string, endpointLabel: string) {
  if (isBusNode(node)) {
    return {
      terminalId: node.terminals[0]?.id ?? "t1",
      endpointPoint: { ...point }
    };
  }
  if (node.terminals.length === 0) {
    return null;
  }
  const ranked = node.terminals
    .map((terminal) => ({ terminal, distance: pointDistance(getTerminalPoint(node, terminal.id), point) }))
    .sort((left, right) => left.distance - right.distance || left.terminal.id.localeCompare(right.terminal.id));
  const best = ranked[0];
  if (!best) {
    return null;
  }
  const tolerance = Math.max(24, Math.min(node.size.width, node.size.height) / 2);
  const tied = ranked[1] && Math.abs(ranked[1].distance - best.distance) <= 0.5;
  if (best.distance > tolerance || tied) {
    warnings.push(`连接线“${edgeId}”的${endpointLabel}端子无法唯一精确匹配，已使用最近端子“${best.terminal.id}”。`);
  }
  return { terminalId: best.terminal.id, endpointPoint: undefined };
}

function elementStyleValue(element: Element, property: string) {
  const direct = String(element.getAttribute(property) || "").trim();
  if (direct) {
    return direct;
  }
  const pattern = new RegExp(`(?:^|;)\\s*${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+)`, "iu");
  return pattern.exec(String(element.getAttribute("style") || ""))?.[1]?.trim() ?? "";
}

function elementHidden(element: Element) {
  return elementStyleValue(element, "display") === "none" || element.getAttribute("visibility") === "hidden";
}

function elementText(element: Element) {
  return String(element.textContent || "").trim();
}

function parseTranslate(value: string) {
  const match = /translate\s*\(\s*([-+\d.eE]+)(?:[\s,]+([-+\d.eE]+))?\s*\)/u.exec(value);
  const x = Number(match?.[1] ?? 0);
  const y = Number(match?.[2] ?? 0);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

function numericStyleValue(element: Element, property: string, fallback: number) {
  const parsed = Number.parseFloat(elementStyleValue(element, property));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function terminalMeasurementAnchor(node: ModelNode, terminalId: string): MeasurementGroupAnchor {
  const terminal = node.terminals.find((candidate) => candidate.id === terminalId);
  if (!terminal) {
    return "custom";
  }
  if (Math.abs(terminal.anchor.x) >= Math.abs(terminal.anchor.y)) {
    return terminal.anchor.x >= 0 ? "right" : "left";
  }
  return terminal.anchor.y >= 0 ? "bottom" : "top";
}

function inferredMeasurementLayout(rows: Element[]): MeasurementGroupLayout {
  if (rows.length <= 1) {
    return "vertical";
  }
  const xValues = new Set(rows.map((row) => numericStyleValue(row, "x", 0).toFixed(3)));
  const yValues = new Set(rows.map((row) => numericStyleValue(row, "y", 0).toFixed(3)));
  if (xValues.size === 1) {
    return "vertical";
  }
  if (yValues.size === 1) {
    return "horizontal";
  }
  return "grid";
}

function measurementBorderStyle(rect: Element | undefined): MeasurementGroupBorderStyle {
  if (!rect || numericStyleValue(rect, "stroke-width", 0) <= 0) {
    return "none";
  }
  const dashArray = elementStyleValue(rect, "stroke-dasharray");
  if (/^2(?:\D|$)/u.test(dashArray)) {
    return "dotted";
  }
  if (dashArray && dashArray !== "none") {
    return "dashed";
  }
  return "solid";
}

function measurementStyleForText(text: Element, node: ModelNode): MeasurementStyleOverride {
  const scale = measurementFontScaleForNode(node) || 1;
  const fontSize = numericStyleValue(text, "font-size", 14) / scale;
  const fontWeight = elementStyleValue(text, "font-weight");
  return {
    color: elementStyleValue(text, "fill") || "#334155",
    fontFamily: elementStyleValue(text, "font-family") || "Arial",
    fontSize,
    fontWeight: fontWeight === "400" || fontWeight === "700" ? fontWeight : "500",
    fontStyle: elementStyleValue(text, "font-style") === "italic" ? "italic" : "normal",
    textDecoration: elementStyleValue(text, "text-decoration") === "underline" ? "underline" : "none"
  };
}

function measurementItemsForGroup(
  groupElement: Element,
  node: ModelNode,
  terminalId: string | undefined,
  warnings: string[]
) {
  const textRows = walkElements(groupElement).filter((element) => elementName(element) === "text");
  const items: MeasurementItemBinding[] = [];
  for (let rowIndex = 0; rowIndex < textRows.length; rowIndex += 1) {
    const text = textRows[rowIndex];
    const spans = childElements(text).filter((element) => elementName(element) === "tspan");
    const valueIndex = spans.findIndex((span) => hasClass(span, "mv"));
    if (valueIndex < 0) {
      continue;
    }
    const valueSpan = spans[valueIndex];
    const measurementTypeId = String(valueSpan.getAttribute("mt") || "").trim();
    if (!measurementTypeId) {
      warnings.push(`设备“${node.name}”的量测项缺少 mt，已跳过。`);
      continue;
    }
    const rawValueId = String(valueSpan.getAttribute("id") || `${node.id}-${terminalId ? `${terminalId}-` : ""}${measurementTypeId}-${rowIndex}`)
      .replace(/^mv-/u, "");
    const sourceField = String(valueSpan.getAttribute("mf") || "").trim();
    const sourcePoint = sourceField
      ? (sourceField.startsWith(`${node.id}.`) ? sourceField : `${node.id}.${sourceField}`)
      : `${node.id}.${terminalId ? `${terminalId}.` : ""}${measurementTypeId}`;
    const label = spans.slice(0, valueIndex).map(elementText).join("").trim();
    const unit = spans.slice(valueIndex + 1).map(elementText).join("").trim();
    items.push({
      id: `measurement-${rawValueId}`,
      measurementTypeId,
      role: String(valueSpan.getAttribute("mr") || "").trim() || undefined,
      sourcePoint,
      visible: !elementHidden(text) && !elementHidden(valueSpan),
      labelOverride: label,
      unitOverride: unit,
      styleOverride: measurementStyleForText(text, node)
    });
  }
  return { textRows, items };
}

function staticTextNode(
  template: DeviceTemplate,
  element: Element,
  id: string,
  layerId: string
): ModelNode {
  const text = elementText(element) || "文字";
  const fontSize = numericStyleValue(element, "font-size", 16);
  const x = elementNumber(element, "x", 0);
  const y = elementNumber(element, "y", 0);
  const width = Math.max(24, text.length * fontSize * 0.7);
  const height = Math.max(24, fontSize * 1.5);
  const node = createNodeFromTemplate(template, { x, y });
  return {
    ...node,
    id,
    name: text,
    layerId,
    size: { width, height },
    params: {
      ...node.params,
      text,
      textColor: elementStyleValue(element, "fill") || "#111827",
      fontFamily: elementStyleValue(element, "font-family") || "Arial",
      fontSize: String(fontSize),
      fontWeight: elementStyleValue(element, "font-weight") || "500",
      fontStyle: elementStyleValue(element, "font-style") || "normal",
      textDecoration: elementStyleValue(element, "text-decoration") || "none",
      fillColor: "transparent",
      strokeColor: "transparent",
      lineWidth: "0"
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
