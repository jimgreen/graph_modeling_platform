// SVG 工具函数 — 纯 SVG 标记生成、解析与编码

import { Fragment, isValidElement } from "react";
import { imageFitPreserveAspectRatio, normalizeImageFitMode } from "./imageFit.ts";
import { API_PREFIX } from "./config.ts";
import { escapeXmlFull } from "../shared/xmlEscape.mjs";

/* 常量 */

/** 状态图标/形状默认描边色（审查 T19-P2/F-P3-1：原散布于前后端 13+ 处的 "#2563eb"） */
export const DEFAULT_SHAPE_STROKE_COLOR = "#2563eb";

const BACKEND_IMAGE_HREF_PATTERN = new RegExp(`^${escapeRegExp(API_PREFIX)}/images/([^/?#]+)`);
const IMAGE_DATA_URL_PATTERN = /^data:image\//iu;
let inlineSvgAutoScopeCounter = 0;

const SVG_ATTRIBUTE_NAMES: Record<string, string> = {
  className: "class",
  dominantBaseline: "dominant-baseline",
  fillOpacity: "fill-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontStyle: "font-style",
  fontWeight: "font-weight",
  paintOrder: "paint-order",
  strokeDasharray: "stroke-dasharray",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration"
};

/* 基础工具 */

export function svgStrokeDashArray(style?: string) {
  if (style === "dashed") {
    return "10 6";
  }
  if (style === "dotted") {
    return "2 6";
  }
  return undefined;
}

/** XML 转义：委托 shared/xmlEscape.mjs 的完整实现（含单引号），保持原导出名兼容下游 */
export function escapeXml(value: string) {
  return escapeXmlFull(value);
}

export function formatSvgNumber(value: number) {
  const rounded = Math.round(value * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/* 图片 href / data URL */

export function backendImageIdFromHref(value: string) {
  const match = BACKEND_IMAGE_HREF_PATTERN.exec(String(value ?? "").trim());
  if (!match) {
    return "";
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isImageDataUrl(value: string) {
  return IMAGE_DATA_URL_PATTERN.test(String(value ?? "").trim());
}

export function imageArrayBufferToDataUrl(buffer: ArrayBuffer, mimeType = "image/png") {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${mimeType};base64,${window.btoa(binary)}`;
}

export function decodeBase64Text(value: string) {
  try {
    const decoder = globalThis.atob;
    if (typeof decoder !== "function") {
      return "";
    }
    const binary = decoder(value.replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return typeof TextDecoder === "undefined" ? binary : new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function decodeSvgImageSource(value: string) {
  const source = String(value ?? "").trim();
  if (source.startsWith("<svg")) {
    return source;
  }
  if (!/^data:image\/svg\+xml\b/iu.test(source)) {
    return "";
  }
  const commaIndex = source.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }
  const metadata = source.slice(0, commaIndex).toLowerCase();
  const payload = source.slice(commaIndex + 1);
  if (metadata.includes(";base64")) {
    return decodeBase64Text(payload).trim();
  }
  try {
    return decodeURIComponent(payload).trim();
  } catch {
    return payload.trim();
  }
}

export function isPlatformDeviceVisualReplacementImage(value: unknown) {
  const source = decodeSvgImageSource(String(value ?? ""));
  if (!source) {
    return false;
  }
  return (
    /\bdata-state-icon-drawing\s*=\s*["']true["']/iu.test(source) ||
    /\bdata-state-icon-frame\s*=\s*["']true["']/iu.test(source) ||
    /\bdata-state-icon-layer-(?:width|height)\s*=/iu.test(source) ||
    /\bdata-custom-device-persisted-terminal-connectors\s*=\s*["']true["']/iu.test(source)
  );
}

export function inlineBackendImageRefsInSvgDataUrl(value: string, assets: Record<string, string>) {
  const href = String(value ?? "").trim();
  if (!href) {
    return "";
  }
  const source = decodeSvgImageSource(href);
  if (!source) {
    return href;
  }
  let changed = false;
  const nextSource = source.replace(
    /(\s(?:xlink:)?href\s*=\s*)(["'])(.*?)\2/giu,
    (match, prefix: string, quote: string, rawHref: string) => {
      const id = backendImageIdFromHref(rawHref);
      const assetHref = id ? assets[id] ?? "" : "";
      if (!isImageDataUrl(assetHref)) {
        return match;
      }
      changed = true;
      return `${prefix}${quote}${escapeXml(assetHref)}${quote}`;
    }
  );
  return changed ? `data:image/svg+xml;utf8,${encodeURIComponent(nextSource)}` : href;
}

/* SVG 解析 */

export function svgRootAttributeValue(attributes: string, name: string) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "iu");
  const match = pattern.exec(attributes);
  return match?.[1] ?? match?.[2] ?? "";
}

export function svgLengthNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// 审查 T25b-P0-1/P0-2：渲染路径与导入路径（sanitizeDocument/safeUrl 白名单）对齐安全标准——
// 1) 先解码 XML/HTML 数字实体再匹配危险 scheme，防 "&#106;avascript:" 绕过；
// 2) 覆盖 vbscript:/data:text/html 等非 javascript 危险协议；
// 3) <script> 匹配自闭合与无闭合变体，不再遗漏 `<script src=...>`。
const SVG_ENTITY_ENCODED_COLON = /&#x?0*3a;?|&#58;/giu;

function decodeSvgNumericEntities(value: string) {
  return value.replace(/&#x([0-9a-f]+);?/giu, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/gu, (_match, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

export function stripUnsafeInlineSvgMarkup(value: string) {
  let output = value;
  // 迭代解码实体（防双重编码绕过），最多 3 轮
  for (let round = 0; round < 3; round += 1) {
    const decoded = decodeSvgNumericEntities(output);
    if (decoded === output) {
      break;
    }
    output = decoded;
  }
  return output
    // 未闭合的 <script>xxx 必须整段去掉。`[\s\S]*?` 要放在前、让 `</script>` 与 `$`
    // 成为它的**终止条件之一**：原写法的 `[\s\S]*?<\/script\s*>|$` 里，`$` 分支只在
    // `>` 之后**一个字符都没有**时才成立，于是 `<script>alert(1)` 这类「未闭合但有内容」
    // 整条匹配失败、原样漏出 —— 而浏览器会把未终止的 script 标签照常解析成 script 元素
    // 并执行。这是实测出来的绕过（28 个 XSS 向量里唯一一个漏的）。
    .replace(/<script\b[^>]*(?:\/>|>[\s\S]*?(?:<\/script\s*>|$))/giu, "")
    .replace(/<\/script\s*>/giu, "")
    // 与 script 同理：<style> 未闭合时必须整段去掉，否则未终止的 style 会把后续
    // 整篇内容当成 CSS 吞掉（实测 `<style>*{background:url(javascript:alert(1))}` 原样漏出）。
    // CSS 里的 url(javascript:) 现代浏览器已不执行，故这不是 XSS，但属同一处
    // `$` 分支失效的写法，且会破坏标记结构，一并修掉。
    .replace(/<style\b[^>]*(?:\/>|>[\s\S]*?(?:<\/style\s*>|$))/giu, "")
    // srcdoc 的值是一整段 HTML 字符串，解析器不把它当标记处理，上面所有规则都碰不到它。
    // <foreignObject> 是 SVG 里唯一的 HTML 集成点，其中的 iframe[srcdoc] 会真的执行脚本
    // （实测绕过：srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;" 原样通过）。
    // srcdoc 对图标 SVG 无任何合法用途，故整个属性连值一起删。
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/(\s+(?:href|xlink:href)\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/giu, (_match: string, prefix: string, url: string) => {
      const rawUrl = url.replace(/^["']|["']$/g, "");
      const normalized = decodeSvgNumericEntities(rawUrl).replace(SVG_ENTITY_ENCODED_COLON, ":").replace(/[\s\u00A0]+/gu, "").toLowerCase();
      if (/^(?:javascript|vbscript|livescript|mocha):/.test(normalized) || /^data:text\/html/i.test(normalized)) {
        return "";
      }
      return `${prefix}${url}`;
    })
    // SMIL 动画能把 href **改写**成 javascript:，例如
    //   <animate attributeName="href" values="javascript:alert(1)" dur="1s"/>
    //   <set     attributeName="xlink:href" to="javascript:alert(1)"/>
    // 上面那条 href/xlink:href 规则只查「属性本身就是 URL」的情况，漏掉这一类
    // 「动画目标是指向 URL 的属性」的情形。实测该向量可穿透两道防线：导入侧
    // sanitizeDocument（DANGEROUS_ELEMENT_NAMES 不含 animate、URL_ATTRIBUTE_NAMES
    // 不含 values）与此处的 href 规则都漏过它；而图元节点在画布上走
    // svgImageContentMarkup(..., { className }) → inlineSvgRootMarkup 把 SVG
    // **内联进 DOM**（见 appCanvasArea.tsx 的 node-background-image 渲染）——
    // 内联 SVG 的 SMIL 动画是会运行的，属可利用的存储型 XSS。
    //
    // 这里对 SMIL 的值属性（values/to/from/by）套用与 href **完全相同**的 scheme 判定。
    // 误伤面极小：正常动画的值（`0;1;2`、`#fff`、色值、`url(#id)`）都不带危险 scheme，
    // 会被原样放行；任何写着 javascript:/vbscript:/data:text/html 的 SMIL 值本就无意义。
    //
    // 与 href 那条规则的两处**必要差异**（都源自 SMIL values 的语法本身，不是宽严取舍）：
    // ① `values` 本来就是**分号分隔的多值列表**（`values="#a;javascript:x"`），而 href
    //    只有单个值。故对每个 `;` 分段**独立**判定 —— 否则危险 scheme 放在第二个值里
    //    就能绕过（探针实测确认为真实绕过，非理论风险）。
    // ② 归一时额外去掉 **C0/DEL 控制字符**：SMIL 的 values 允许值里夹带换行/制表符甚至
    //    NUL，而浏览器解析属性值时会丢弃它们 —— `java<NUL>script:x` 归一后不以
    //    `javascript:` 开头、anchored 判定会放行，但浏览器照常执行。
    // href 规则不动：它有 36 条既有向量守卫依赖当前语义。
    .replace(/(\s+(?:values|to|from|by)\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/giu, (_match: string, prefix: string, url: string) => {
      const rawValue = url.replace(/^["']|["']$/g, "");
      const decoded = decodeSvgNumericEntities(rawValue).replace(SVG_ENTITY_ENCODED_COLON, ":");
      const normalized = decoded.replace(/[\u0000-\u001f\u007f\s\u00A0]+/gu, "").toLowerCase();
      const isDangerous = (candidate: string) =>
        /^(?:javascript|vbscript|livescript|mocha):/.test(candidate) || /^data:text\/html/i.test(candidate);
      // ① 分号分段：任一段危险即整条拒绝
      if (isDangerous(normalized) || normalized.split(";").some(isDangerous)) {
        return "";
      }
      return `${prefix}${url}`;
    });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function inlineSvgScopedIdPrefix(
  href: string,
  options: { x: number; y: number; width: number; height: number; className: string; preserveAspectRatio?: string; clipPath?: string }
) {
  const scope = options.clipPath || `auto-${inlineSvgAutoScopeCounter++}`;
  const seed = [
    href,
    options.x,
    options.y,
    options.width,
    options.height,
    options.className,
    options.preserveAspectRatio ?? "",
    scope
  ].join("\u001f");
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `inline-svg-${(hash >>> 0).toString(36)}-`;
}

function collectInlineSvgIds(markup: string) {
  const ids = new Set<string>();
  markup.replace(/\bid\s*=\s*(["'])(.*?)\1/giu, (_match, _quote: string, id: string) => {
    if (id) {
      ids.add(id);
    }
    return _match;
  });
  return ids;
}

function scopeInlineSvgIdReferences(markup: string, ids: Set<string>, prefix: string, scopeIdAttributes: boolean) {
  if (ids.size === 0) {
    return markup;
  }
  const idAlternation = Array.from(ids).sort((left, right) => right.length - left.length).map(escapeRegExp).join("|");
  const idAttributePattern = /\bid\s*=\s*(["'])(.*?)\1/giu;
  const urlReferencePattern = new RegExp(`url\\(\\s*(['"]?)#(${idAlternation})\\1\\s*\\)`, "giu");
  const hrefReferencePattern = new RegExp(`(\\s(?:xlink:)?href\\s*=\\s*)(["'])#(${idAlternation})\\2`, "giu");
  const scopedMarkup = scopeIdAttributes
    ? markup.replace(idAttributePattern, (match, quote: string, id: string) => (ids.has(id) ? `id=${quote}${prefix}${id}${quote}` : match))
    : markup;
  return scopedMarkup
    .replace(urlReferencePattern, (_match, quote: string, id: string) => `url(${quote}#${prefix}${id}${quote})`)
    .replace(hrefReferencePattern, (_match, attributePrefix: string, quote: string, id: string) => `${attributePrefix}${quote}#${prefix}${id}${quote}`);
}

/* SVG 内联渲染 */

export function inlineSvgRootMarkup(
  href: string,
  options: { x: number; y: number; width: number; height: number; className: string; preserveAspectRatio?: string; clipPath?: string; imageFit?: string; extraAttributes?: string }
) {
  const source = stripUnsafeInlineSvgMarkup(
    decodeSvgImageSource(href)
      .replace(/^﻿/u, "")
      .replace(/^\s*<\?xml[\s\S]*?\?>/iu, "")
      .replace(/^\s*<!doctype[\s\S]*?>/iu, "")
      .trim()
  );
  const match = source.match(/<svg\b([^>]*)>([\s\S]*)<\/svg\s*>/iu);
  if (!match) {
    return "";
  }
  const rootAttributes = match[1] ?? "";
  const body = match[2] ?? "";
  const filteredRootAttributes = rootAttributes
    .replace(/\s+(?:x|y|width|height|preserveAspectRatio|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .trim();
  const bodyIds = collectInlineSvgIds(body);
  const idPrefix = bodyIds.size > 0 ? inlineSvgScopedIdPrefix(href, options) : "";
  const scopedRootAttributes = idPrefix ? scopeInlineSvgIdReferences(filteredRootAttributes, bodyIds, idPrefix, false) : filteredRootAttributes;
  const scopedBody = idPrefix ? scopeInlineSvgIdReferences(body, bodyIds, idPrefix, true) : body;
  const width = svgLengthNumber(svgRootAttributeValue(rootAttributes, "width"));
  const height = svgLengthNumber(svgRootAttributeValue(rootAttributes, "height"));
  const viewBoxAttribute =
    /\bviewBox\s*=/iu.test(rootAttributes) || width <= 0 || height <= 0
      ? ""
      : ` viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}"`;
  const preservedAttributes = scopedRootAttributes ? ` ${scopedRootAttributes}` : "";
  const inlineClassName = ["export-inline-svg-image", options.className].filter(Boolean).join(" ");
  const preserveAspectRatio = options.preserveAspectRatio ?? imageFitPreserveAspectRatio(options.imageFit);
  const extraAttributes = options.extraAttributes ?? "";
  const inlineSvg = `<svg class="${escapeXml(inlineClassName)}" x="${formatSvgNumber(options.x)}" y="${formatSvgNumber(options.y)}" width="${formatSvgNumber(options.width)}" height="${formatSvgNumber(options.height)}" preserveAspectRatio="${escapeXml(preserveAspectRatio)}"${extraAttributes}${viewBoxAttribute}${preservedAttributes}>${scopedBody}</svg>`;
  return options.clipPath ? `<g clip-path="${escapeXml(options.clipPath)}">${inlineSvg}</g>` : inlineSvg;
}

export function svgImageContentMarkup(
  href: string,
  options: { x: number; y: number; width: number; height: number; className?: string; preserveAspectRatio?: string; clipPath?: string; imageFit?: string; patternId?: string; tileWidth?: number; tileHeight?: number; extraAttributes?: string }
) {
  if (!href) {
    return "";
  }
  const className = options.className ?? "";
  const imageFit = normalizeImageFitMode(options.imageFit);
  const preserveAspectRatio = options.preserveAspectRatio ?? imageFitPreserveAspectRatio(imageFit);
  if (imageFit === "tile") {
    const tileWidth = Math.max(1, Number.isFinite(Number(options.tileWidth)) ? Number(options.tileWidth) : Math.min(Math.max(1, options.width), 96));
    const tileHeight = Math.max(1, Number.isFinite(Number(options.tileHeight)) ? Number(options.tileHeight) : Math.min(Math.max(1, options.height), 96));
    const patternId = options.patternId || `${inlineSvgScopedIdPrefix(href, {
      ...options,
      className,
      preserveAspectRatio: "tile"
    })}pattern`;
    const classAttribute = className ? ` class="${escapeXml(className)}"` : "";
    const clipPathAttribute = options.clipPath ? ` clip-path="${escapeXml(options.clipPath)}"` : "";
    const extraAttributes = options.extraAttributes ?? "";
    return `<defs><pattern id="${escapeXml(patternId)}" x="${formatSvgNumber(options.x)}" y="${formatSvgNumber(options.y)}" width="${formatSvgNumber(tileWidth)}" height="${formatSvgNumber(tileHeight)}" patternUnits="userSpaceOnUse"><image href="${escapeXml(href)}" x="0" y="0" width="${formatSvgNumber(tileWidth)}" height="${formatSvgNumber(tileHeight)}" preserveAspectRatio="${escapeXml(imageFitPreserveAspectRatio("fixed"))}"/></pattern></defs><rect x="${formatSvgNumber(options.x)}" y="${formatSvgNumber(options.y)}" width="${formatSvgNumber(options.width)}" height="${formatSvgNumber(options.height)}" fill="url(#${escapeXml(patternId)})"${clipPathAttribute}${classAttribute}${extraAttributes}/>`;
  }
  const inlineSvg = className ? inlineSvgRootMarkup(href, { ...options, className }) : "";
  if (inlineSvg) {
    return inlineSvg;
  }
  const classAttribute = className ? ` class="${escapeXml(className)}"` : "";
  const clipPathAttribute = options.clipPath ? ` clip-path="${escapeXml(options.clipPath)}"` : "";
  const extraAttributes = options.extraAttributes ?? "";
  return `<image href="${escapeXml(href)}" x="${formatSvgNumber(options.x)}" y="${formatSvgNumber(options.y)}" width="${formatSvgNumber(options.width)}" height="${formatSvgNumber(options.height)}" preserveAspectRatio="${escapeXml(preserveAspectRatio)}"${clipPathAttribute}${classAttribute}${extraAttributes}/>`;
}

/* React 元素 → SVG 标记 */

export function styleObjectToSvgAttribute(style: Record<string, string | number>) {
  return Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${String(value)}`)
    .join(";");
}

export function renderSvgElementMarkup(value: unknown): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return escapeXml(String(value));
  }
  if (Array.isArray(value)) {
    return value.map(renderSvgElementMarkup).join("");
  }
  if (!isValidElement(value)) {
    return "";
  }
  const props = value.props as Record<string, unknown>;
  if (value.type === Fragment) {
    return renderSvgElementMarkup(props.children);
  }
  if (typeof value.type !== "string") {
    return "";
  }
  const attrs = Object.entries(props)
    .filter(([key, attrValue]) => key !== "children" && key !== "key" && key !== "ref" && attrValue !== undefined && attrValue !== null && attrValue !== false)
    .map(([key, attrValue]) => {
      const attrName = SVG_ATTRIBUTE_NAMES[key] ?? key;
      const renderedValue =
        key === "style" && typeof attrValue === "object" && !Array.isArray(attrValue)
          ? styleObjectToSvgAttribute(attrValue as Record<string, string | number>)
          : attrValue === true
            ? "true"
            : String(attrValue);
      return ` ${attrName}="${escapeXml(renderedValue)}"`;
    })
    .join("");
  return `<${value.type}${attrs}>${renderSvgElementMarkup(props.children)}</${value.type}>`;
}
