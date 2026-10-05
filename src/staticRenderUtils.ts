import { createElement, Fragment, type CSSProperties, type ReactNode } from "react";
import type { DeviceStateVisual, ModelNode, Point } from "./model";
import {
  getNodeScaleX,
  getNodeScaleY,
  parseStaticDrawPoints,
  routableLineDeviceCanvasPoints,
  STATIC_DRAW_POINTS_PARAM,
} from "./model.ts";
import { formatSvgNumber, inlineBackendImageRefsInSvgDataUrl } from "./svgUtils.ts";

// ─── Counter Transform Matrix ────────────────────────────────────────────────

function nodeCounterTransformMatrix(node: ModelNode, preserveScale = true) {
  const scaleX = getNodeScaleX(node) || 1;
  const scaleY = getNodeScaleY(node) || 1;
  const desiredScale = preserveScale ? Math.sqrt((Math.abs(scaleX) || 1) * (Math.abs(scaleY) || 1)) : 1;
  const desiredScaleX = desiredScale;
  const desiredScaleY = desiredScale;
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const a = (cos * desiredScaleX) / scaleX;
  const b = (-sin * desiredScaleX) / scaleY;
  const c = (sin * desiredScaleY) / scaleX;
  const d = (cos * desiredScaleY) / scaleY;
  return `matrix(${formatSvgNumber(a)} ${formatSvgNumber(b)} ${formatSvgNumber(c)} ${formatSvgNumber(d)} 0 0)`;
}

// ─── Upright Text ────────────────────────────────────────────────────────────

function uprightText(
  node: ModelNode,
  x: number,
  y: number,
  props: Record<string, string | number | CSSProperties | undefined>,
  children: ReactNode
) {
  const { style, ...textProps } = props;
  return (
    createElement("g", { transform: `translate(${formatSvgNumber(x)} ${formatSvgNumber(y)}) ${nodeCounterTransformMatrix(node)}` }, createElement("text", { x: "0", y: "0", ...textProps, style: style as CSSProperties | undefined }, children))
  );
}

// ─── Numeric Parameter ───────────────────────────────────────────────────────

function staticNumericParam(node: ModelNode, key: string, fallback: number, min = 0): number {
  const parsed = Number(node.params[key]);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

// ─── Shadow Style ────────────────────────────────────────────────────────────

function staticSymbolShadowStyle(node: ModelNode): CSSProperties | undefined {
  return node.params.shadowEnabled === "1"
    ? { filter: "drop-shadow(0 4px 8px rgba(15, 23, 42, 0.18))" }
    : undefined;
}

// ─── Symbol Text Values ──────────────────────────────────────────────────────

// `params` 来自后端且落盘前不做运行时校验（ModelNode.params 只是**声明**为
// Record<string, string>），故 text 可能是数字 / 布尔 / 对象 / 数组。
// 原实现 `node.params.text ?? fallback` 把这类值原样放行，而下游
// staticShapeText 会对它调 .split —— 直接抛 TypeError，整棵图元渲染中断。
//
// 兜底选「与 null / undefined 同处理」即回落 fallback，而不是 String(v)：
//   · 合法字符串（含空串）行为逐字节不变，String(v) 也在这一点上等价；
//   · undefined/null 本来就走 fallback，非字符串再走同一条分支 ⇒ 语义统一为
//     「没有可用的文本值」，调用方只需处理一种形态；
//   · String(v) 对 {} 会产出 "[object Object]"、对 [] 会产出 ""、对 false 会
//     产出 "false" —— 全是画布上的垃圾标签，且 String([]) === "" 与
//     String(0) === "0" 的分歧会让「空标签」有两条来源。
function staticSymbolTextValue(node: ModelNode, fallback: string): string {
  const text = node.params.text;
  return typeof text === "string" ? text : fallback;
}

// 缩略图版同理：原实现只判 undefined，null.slice / (123).slice 直接抛 TypeError。
function staticSymbolMiniatureTextValue(node: ModelNode, fallback: string): string {
  const text = node.params.text;
  return typeof text === "string" ? text.slice(0, 2) : fallback;
}

// ─── Shape Text ──────────────────────────────────────────────────────────────

function staticShapeText(node: ModelNode, width: number, height: number, miniature = false) {
  const fontSize = miniature ? 12 : staticNumericParam(node, "fontSize", 16, 8);
  const padding = Math.min(staticNumericParam(node, "padding", 12, 0), Math.max(0, Math.min(width, height) / 2 - 2));
  const align = node.params.textAlign || "center";
  const verticalAlign = node.params.verticalAlign || "middle";
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const x = align === "left" ? -width / 2 + padding : align === "right" ? width / 2 - padding : 0;
  const y =
    verticalAlign === "top"
      ? -height / 2 + padding + fontSize / 2
      : verticalAlign === "bottom"
        ? height / 2 - padding - fontSize / 2
        : 0;
  const text = miniature ? staticSymbolMiniatureTextValue(node, "图元") : staticSymbolTextValue(node, node.name);
  const lines = text.split(/\r?\n/);
  return uprightText(
    node,
    x,
    y - ((lines.length - 1) * fontSize * 0.6),
    {
      fill: node.params.textColor || "#111827",
      fontSize,
      fontFamily: node.params.fontFamily || "Arial",
      fontWeight: node.params.fontWeight || "500",
      fontStyle: node.params.fontStyle || "normal",
      textDecoration: node.params.textDecoration || "none",
      textAnchor,
      dominantBaseline: "middle",
      style: { userSelect: "none", pointerEvents: "none" }
    },
    createElement(Fragment, null, lines.map((line, index) => (
        createElement("tspan", { key: index, x: "0", dy: index === 0 ? 0 : fontSize * 1.2 }, line || " ")
      )))
  );
}

// ─── Estimate SVG Text Width ─────────────────────────────────────────────────

function estimateSvgTextWidth(text: string, fontSize: number): number {
  return Array.from(text).reduce((total, char) => total + (/^[\x00-ÿ]$/.test(char) ? 0.56 : 1), 0) * fontSize;
}

// ─── Connector Marker ────────────────────────────────────────────────────────

function staticConnectorMarker(
  marker: string,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  size: number,
  color: string,
  lineWidth: number
): ReactNode {
  if (marker === "dot") {
    return createElement("circle", { cx: x, cy: y, r: Math.max(size * 0.36, lineWidth * 1.4), fill: color, stroke: color });
  }
  if (marker !== "arrow") {
    return null;
  }
  const length = Math.hypot(directionX, directionY) || 1;
  const ux = directionX / length;
  const uy = directionY / length;
  const px = -uy;
  const py = ux;
  const baseX = x - ux * size;
  const baseY = y - uy * size;
  const halfWidth = size * 0.42;
  const points = `${x},${y} ${baseX + px * halfWidth},${baseY + py * halfWidth} ${baseX - px * halfWidth},${baseY - py * halfWidth}`;
  return createElement("polygon", { points, fill: color, stroke: color, strokeLinejoin: "round" });
}

// ─── Connector Path ──────────────────────────────────────────────────────────

function staticConnectorPath(
  node: ModelNode,
  points: Point[],
  stroke: string,
  lineWidth: number,
  dashArray: string | undefined
) {
  const markerStart = node.params.markerStart || "none";
  const markerEnd = node.params.markerEnd || "none";
  const arrowSize = staticNumericParam(node, "arrowSize", 10, 4);
  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const first = points[0];
  const second = points[1] ?? first;
  const previous = points[points.length - 2] ?? first;
  const last = points[points.length - 1] ?? first;
  return (
    createElement("g", null, createElement("path", { d: pathData, fill: "none", stroke, strokeWidth: lineWidth, strokeDasharray: dashArray, strokeLinecap: "round", strokeLinejoin: "round" }), staticConnectorMarker(markerStart, first.x, first.y, first.x - second.x, first.y - second.y, arrowSize, stroke, lineWidth), staticConnectorMarker(markerEnd, last.x, last.y, last.x - previous.x, last.y - previous.y, arrowSize, stroke, lineWidth))
  );
}

// ─── Draw Points for Node ────────────────────────────────────────────────────

function staticDrawPointsForNode(node: ModelNode, fallback: Point[]) {
  const customPoints = parseStaticDrawPoints(node.params[STATIC_DRAW_POINTS_PARAM]);
  return customPoints.length >= 2 ? customPoints : fallback;
}

// ─── Handle Dot ──────────────────────────────────────────────────────────────

function staticHandleDot(node: ModelNode, x: number, y: number, stroke = "#ffffff") {
  const size = staticNumericParam(node, "handleSize", 8, 3);
  const color = node.params.handleColor || node.params.accentColor || "#2563eb";
  return createElement("circle", { cx: x, cy: y, r: size / 2, fill: color, stroke, strokeWidth: "2" });
}

// ─── Frame Handles ───────────────────────────────────────────────────────────

function staticFrameHandles(node: ModelNode, width: number, height: number) {
  return (
    createElement(Fragment, null, [
        [-width / 2, -height / 2],
        [0, -height / 2],
        [width / 2, -height / 2],
        [width / 2, 0],
        [width / 2, height / 2],
        [0, height / 2],
        [-width / 2, height / 2],
        [-width / 2, 0]
      ].map(([x, y], index) => (
        createElement("g", { key: index }, staticHandleDot(node, x, y, node.params.accentColor || "#2563eb"))
      )))
  );
}

// ─── Device Glyph Constants ──────────────────────────────────────────────────

const DEVICE_GLYPH_DESIGN_LONGEST_SIDE = 100;

// ─── Bus Glyph Rect ──────────────────────────────────────────────────────────

function renderBusGlyphRect(width: number, height: number, color: string) {
  const thickness = Math.max(8, height / 3);
  return createElement("rect", { className: "bus-glyph", x: -width / 2, y: -thickness / 2, width, height: thickness, fill: color, stroke: color, strokeWidth: "0" });
}

function deviceStateVisualToken(visual?: DeviceStateVisual | null) {
  if (!visual) {
    return "";
  }
  return [
    visual.value,
    visual.name,
    visual.icon ?? "",
    visual.image ?? "",
    visual.imageAssetId ?? "",
    visual.imageFit ?? "",
    visual.backgroundImage ?? "",
    visual.backgroundImageAssetId ?? "",
    visual.backgroundImageFit ?? "",
    visual.text ?? "",
    visual.color ?? "",
    visual.fillColor ?? "",
    visual.strokeColor ?? "",
    visual.textColor ?? ""
  ].join("\u001f");
}

function stateVisualText(visual?: DeviceStateVisual | null) {
  return String(visual?.text || visual?.icon || "").trim();
}

function resolveStateVisualImageHref(visual: DeviceStateVisual | null | undefined, assets: Record<string, string>) {
  if (!visual) {
    return "";
  }
  const assetId = visual.imageAssetId || visual.backgroundImageAssetId;
  // 必须用 Object.hasOwn 判存在性，不能靠 `assets[assetId]` 的真值：
  // 键为 "constructor" / "__proto__" / "toString" 时，裸索引取到的是**原型链成员**
  // （对 assets 而言恒为真值），于是把 Object / toString 这些函数体当资源 url 传给
  // inlineBackendImageRefsInSvgDataUrl —— 它 String() 后原样返回，画布上会出现
  // "function Object() { [native code] }" 这样的 href，而不是「资源不存在」时的空串。
  if (assetId && Object.hasOwn(assets, assetId) && assets[assetId]) {
    return inlineBackendImageRefsInSvgDataUrl(assets[assetId], assets);
  }
  return inlineBackendImageRefsInSvgDataUrl(visual.image || visual.backgroundImage || "", assets);
}

function routableLineDeviceRenderLocalPoints(node: ModelNode) {
  return routableLineDeviceCanvasPoints(node).map((point) => ({
    x: Number(formatSvgNumber(point.x - node.position.x)),
    y: Number(formatSvgNumber(point.y - node.position.y))
  }));
}

export {
  nodeCounterTransformMatrix,
  uprightText,
  staticNumericParam,
  staticSymbolShadowStyle,
  staticSymbolTextValue,
  staticSymbolMiniatureTextValue,
  staticShapeText,
  estimateSvgTextWidth,
  staticConnectorMarker,
  staticConnectorPath,
  staticDrawPointsForNode,
  staticHandleDot,
  staticFrameHandles,
  DEVICE_GLYPH_DESIGN_LONGEST_SIDE,
  renderBusGlyphRect,
  deviceStateVisualToken,
  stateVisualText,
  resolveStateVisualImageHref,
  routableLineDeviceRenderLocalPoints,
};
