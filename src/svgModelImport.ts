import {
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEVICE_LIBRARY,
  createNodeFromTemplate,
  type DeviceTemplate,
  type ModelNode,
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
  return genericSvgResult(document, dom, options, warnings);
}
