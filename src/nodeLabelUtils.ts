// 节点标签工具函数 — 标签渲染、样式、几何计算

import type { CSSProperties } from "react";
import {
  DEFAULT_DEVICE_LABEL_FONT_SIZE,
  getSafeNodeScaleX,
  getSafeNodeScaleY,
  isContainerKind,
  isStaticNode,
  type ModelNode,
  type Point
} from "./model.ts";
import { formatSvgNumber } from "./svgUtils.ts";

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

// 静态图元与交流容器自带名称绘制(容器名出自 DeviceGlyph 容器分支左上),不再叠加设备标签
export const nodeLabelVisible = (node: ModelNode) =>
  !isStaticNode(node) && !isContainerKind(node.kind) && node.params._labelVisible !== "0";

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
  const scaleX = getSafeNodeScaleX(node);
  const scaleY = getSafeNodeScaleY(node);
  return `translate(${formatSvgNumber(offset.x * scaleX)} ${formatSvgNumber(offset.y * scaleY)})`;
};

export function nodeLabelCanvasCenter(node: ModelNode): Point {
  const offset = nodeLabelOffset(node);
  return {
    x: node.position.x + offset.x * getSafeNodeScaleX(node),
    y: node.position.y + offset.y * getSafeNodeScaleY(node)
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
  const scaleX = getSafeNodeScaleX(node);
  const scaleY = getSafeNodeScaleY(node);
  return baseSize * Math.sqrt(scaleX * scaleY);
}

/** 设备名标签的默认文字色（浅色画布上用的深灰）。 */
const DEFAULT_LABEL_COLOR_LIGHT = "#334155";
/** 深色（纯黑画布）上的默认文字色。 */
const DEFAULT_LABEL_COLOR_DARK = "#e2e8f0";

/**
 * 设备名标签的颜色：返回 null 表示“跟随主题”。
 *
 * 关键点：新建节点时会把默认色 #334155 真实写进 `params._labelColor`，
 * 所以“有 _labelColor”并不等于“用户选过颜色”。只有当它与深/浅两套默认色都不同时，
 * 才视为用户显式指定的颜色，主题切换时保持不变；否则交给主题。
 */
export function nodeLabelExplicitColor(node: ModelNode): string | null {
  const raw = typeof node.params?._labelColor === "string" ? node.params._labelColor.trim() : "";
  if (!raw) {
    return null;
  }
  const normalized = raw.toLowerCase();
  if (normalized === DEFAULT_LABEL_COLOR_LIGHT || normalized === DEFAULT_LABEL_COLOR_DARK) {
    // 与某个主题的默认色完全相同，当作“未设置”，让主题决定
    return null;
  }
  return raw;
}

/**
 * 设备名标签样式。
 * 默认色是按「浅色纯白画布」定的深灰，深色（纯黑画布）上必须换成浅色，否则读不出来；
 * 用户显式改过的颜色不随主题变。
 */
export function nodeLabelTextStyle(node: ModelNode, themeMode: "light" | "dark" = "light"): CSSProperties {
  return {
    fill: nodeLabelExplicitColor(node) || (themeMode === "dark" ? DEFAULT_LABEL_COLOR_DARK : DEFAULT_LABEL_COLOR_LIGHT),
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

export function nodeLabelVerticalTokenStyle(node: ModelNode, themeMode: "light" | "dark" = "light"): CSSProperties {
  return {
    ...nodeLabelTextStyle(node, themeMode),
    writingMode: "horizontal-tb",
    textOrientation: "mixed"
  };
}
