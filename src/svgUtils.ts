// SVG 工具函数 — 纯 SVG 标记生成、解析与编码

import { Fragment, isValidElement } from "react";

/* 常量 */

const BACKEND_IMAGE_HREF_PATTERN = /^\/api\/images\/([^/?#]+)/;
const IMAGE_DATA_URL_PATTERN = /^data:image\//iu;

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
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/giu, "");
}

/* SVG 内联渲染 */

export function inlineSvgRootMarkup(
  href: string,
  options: { x: number; y: number; width: number; height: number; className: string; preserveAspectRatio?: string; clipPath?: string }
) {
  const source = stripUnsafeInlineSvgMarkup(
    decodeSvgImageSource(href)
      .replace(/^﻿/u, "")
      .replace(/^\s*<\?xml[\s\S]*?\?>/iu, "")
      .replace(/^\s*<!doctype[\s\S]*?>/iu, "")
      .trim()
  );
  const match = source.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg\s*>/iu);
  if (!match) {
    return "";
  }
  const rootAttributes = match[1] ?? "";
  const body = match[2] ?? "";
  const filteredRootAttributes = rootAttributes
    .replace(/\s+(?:x|y|width|height|preserveAspectRatio|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .trim();
  const width = svgLengthNumber(svgRootAttributeValue(rootAttributes, "width"));
  const height = svgLengthNumber(svgRootAttributeValue(rootAttributes, "height"));
  const viewBoxAttribute =
    /\bviewBox\s*=/iu.test(rootAttributes) || width <= 0 || height <= 0
      ? ""
      : ` viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}"`;
  const preservedAttributes = filteredRootAttributes ? ` ${filteredRootAttributes}` : "";
  const inlineClassName = ["export-inline-svg-image", options.className].filter(Boolean).join(" ");
  const clipPathAttribute = options.clipPath ? ` clip-path="${escapeXml(options.clipPath)}"` : "";
  return `<svg class="${escapeXml(inlineClassName)}" x="${formatSvgNumber(options.x)}" y="${formatSvgNumber(options.y)}" width="${formatSvgNumber(options.width)}" height="${formatSvgNumber(options.height)}" preserveAspectRatio="${escapeXml(options.preserveAspectRatio ?? "xMidYMid slice")}"${clipPathAttribute}${viewBoxAttribute}${preservedAttributes}>${body}</svg>`;
}

export function svgImageContentMarkup(
  href: string,
  options: { x: number; y: number; width: number; height: number; className?: string; preserveAspectRatio?: string; clipPath?: string }
) {
  if (!href) {
    return "";
  }
  const className = options.className ?? "";
  const inlineSvg = className ? inlineSvgRootMarkup(href, { ...options, className }) : "";
  if (inlineSvg) {
    return inlineSvg;
  }
  const classAttribute = className ? ` class="${escapeXml(className)}"` : "";
  const clipPathAttribute = options.clipPath ? ` clip-path="${escapeXml(options.clipPath)}"` : "";
  return `<image href="${escapeXml(href)}" x="${formatSvgNumber(options.x)}" y="${formatSvgNumber(options.y)}" width="${formatSvgNumber(options.width)}" height="${formatSvgNumber(options.height)}" preserveAspectRatio="${escapeXml(options.preserveAspectRatio ?? "xMidYMid slice")}"${clipPathAttribute}${classAttribute}/>`;
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
