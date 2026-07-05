// SVG 工具函数 — 纯 SVG 标记生成、解析与编码

import { Fragment, isValidElement } from "react";
import { imageFitPreserveAspectRatio, normalizeImageFitMode } from "./imageFit";

/* 常量 */

const BACKEND_IMAGE_HREF_PATTERN = /^\/api\/images\/([^/?#]+)/;
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

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export function stripUnsafeInlineSvgMarkup(value: string) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/giu, "")
    .replace(/<style\b[\s\S]*?<\/style>/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/giu, "");
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
