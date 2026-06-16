// 节点标签工具函数 — 标签渲染、样式、几何计算

import type { CSSProperties } from "react";
import {
  DEFAULT_DEVICE_LABEL_FONT_SIZE,
  getNodeScaleX,
  getNodeScaleY,
  isStaticNode,
  type ModelNode,
  type Point
} from "./model";
import { formatSvgNumber } from "./svgUtils";

export type NodeLabelDisplayMode = "always" | "hidden" | "follow";

/* 基础参数读取 */

export function numericNodeParam(node: ModelNode, key: string, fallback: number) {
  const parsed = Number(node.params[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function nodeLabelOffset(node: ModelNode): Point {
  return {
    x: numericNodeParam(node, "_labelX", 0),
    y: numericNodeParam(node, "_labelY", Math.round(node.size.height / 2 + 22))
  };
}

/* 标签可见性与显示模式 */

export const nodeLabelText = (node: ModelNode) => node.params._labelText ?? node.name;

export const nodeLabelVisible = (node: ModelNode) => !isStaticNode(node) && node.params._labelVisible !== "0";

export function normalizeNodeLabelDisplayMode(value: string | undefined): NodeLabelDisplayMode {
  return value === "always" || value === "hidden" || value === "follow" ? value : "follow";
}

export const nodeLabelDisplayMode = (node: ModelNode): NodeLabelDisplayMode => {
  const mode = node.params._labelDisplayMode;
  if (mode === "always" || mode === "hidden" || mode === "follow") {
    return mode;
  }
  return node.params._labelVisible === "0" ? "hidden" : "follow";
};

export const nodeLabelShouldRender = (node: ModelNode, globalVisible: boolean) => {
  if (!nodeLabelVisible(node)) {
    return false;
  }
  const mode = nodeLabelDisplayMode(node);
  return mode === "always" || (mode === "follow" && globalVisible);
};

/* 旋转 */

export function normalizeNodeLabelRotation(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  const snapped = Math.round((Number.isFinite(parsed) ? parsed : 0) / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

export const nodeLabelVertical = (node: ModelNode) => {
  const rotation = normalizeNodeLabelRotation(node.params._labelRotation);
  return rotation === 90 || rotation === 270;
};

/* 纵向标签分段 */

const nodeLabelNumericTokenPattern = String.raw`\d+(?:[./:：-]\d+)*`;
const nodeLabelNumericTokenRegex = new RegExp(`^${nodeLabelNumericTokenPattern}`);

export function nodeLabelVerticalSegments(text: string) {
  const segments: Array<{ text: string; numeric: boolean }> = [];
  let remaining = text;
  while (remaining) {
    const numericMatch = remaining.match(nodeLabelNumericTokenRegex);
    if (numericMatch?.[0]) {
      segments.push({ text: numericMatch[0], numeric: true });
      remaining = remaining.slice(numericMatch[0].length);
      continue;
    }
    const [char] = Array.from(remaining);
    if (!char) {
      break;
    }
    segments.push({ text: char, numeric: false });
    remaining = remaining.slice(char.length);
  }
  return segments;
}

export function nodeLabelVerticalTokenY(index: number, count: number, node: ModelNode) {
  const step = nodeLabelFontSize(node) * 1.2;
  return (index - (count - 1) / 2) * step;
}

/* 变换与几何 */

export const nodeLabelTransform = (node: ModelNode) => {
  const offset = nodeLabelOffset(node);
  const scaleX = Math.abs(getNodeScaleX(node)) || 1;
  const scaleY = Math.abs(getNodeScaleY(node)) || 1;
  return `translate(${formatSvgNumber(offset.x * scaleX)} ${formatSvgNumber(offset.y * scaleY)})`;
};

export function nodeLabelCanvasCenter(node: ModelNode): Point {
  const offset = nodeLabelOffset(node);
  return {
    x: node.position.x + offset.x * (Math.abs(getNodeScaleX(node)) || 1),
    y: node.position.y + offset.y * (Math.abs(getNodeScaleY(node)) || 1)
  };
}

export const nodeLabelRotationFromPoint = (center: Point, point: Point) =>
  normalizeNodeLabelRotation((Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90);

/* 文本属性 */

export function nodeLabelTextAnchor(node: ModelNode) {
  const anchor = node.params._labelTextAnchor;
  return anchor === "start" || anchor === "end" || anchor === "middle" ? anchor : "middle";
}

export function nodeLabelFontSize(node: ModelNode) {
  const baseSize = numericNodeParam(node, "_labelFontSize", DEFAULT_DEVICE_LABEL_FONT_SIZE);
  const scaleX = Math.abs(getNodeScaleX(node)) || 1;
  const scaleY = Math.abs(getNodeScaleY(node)) || 1;
  return baseSize * Math.sqrt(scaleX * scaleY);
}

export function nodeLabelTextStyle(node: ModelNode): CSSProperties {
  return {
    fill: node.params._labelColor || "#334155",
    fontFamily: node.params._labelFontFamily || "Arial",
    fontSize: nodeLabelFontSize(node),
    fontWeight: node.params._labelFontWeight || "500",
    fontStyle: node.params._labelFontStyle || "normal",
    textDecoration: node.params._labelTextDecoration || "none",
    writingMode: nodeLabelVertical(node) ? "vertical-rl" : "horizontal-tb",
    textOrientation: nodeLabelVertical(node) ? "upright" : undefined,
    userSelect: "none"
  };
}

export function nodeLabelVerticalTokenStyle(node: ModelNode): CSSProperties {
  return {
    ...nodeLabelTextStyle(node),
    writingMode: "horizontal-tb",
    textOrientation: "mixed"
  };
}
