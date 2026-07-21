import type { CSSProperties, ReactNode } from "react";
import type {
  DeviceStateDefinition,
  DeviceStateVisual,
  DeviceTemplate,
  Point
} from "./model";
import { getTemplateStateDefinitions, normalizeDeviceStateDefinitions } from "./model";
import { imageFitPreserveAspectRatio, normalizeImageFitMode } from "./imageFit";
import { escapeXml, formatSvgNumber, svgImageContentMarkup } from "./svgUtils";
import { resolveStateVisualImageHref } from "./staticRenderUtils";

export type StateVisualShapeKind =
  | "switch-open"
  | "switch-closed"
  | "valve-open"
  | "valve-closed"
  | "line"
  | "polyline"
  | "point"
  | "triangle"
  | "rectangle"
  | "square"
  | "hexagon"
  | "polygon"
  | "circle"
  | "semicircle"
  | "ellipse"
  | "arc"
  | "text"
  | "imported-svg"
  | "image";

export type StateIconLineCapKind =
  | "none"
  | "arrow"
  | "circle"
  | "triangle"
  | "square";

export const STATE_ICON_LINE_CAP_OPTIONS: Array<{ value: StateIconLineCapKind; label: string }> = [
  { value: "none", label: "无" },
  { value: "arrow", label: "箭头" },
  { value: "circle", label: "圆形" },
  { value: "triangle", label: "三角" },
  { value: "square", label: "四方" }
];

export type StateIconDrawingElement = {
  id: string;
  kind: StateVisualShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  strokeWidth: number;
  strokeColor: string;
  strokeColorEdited?: boolean;
  fillColor: string;
  textColor: string;
  text: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeStyleEdited?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  startCap?: StateIconLineCapKind;
  endCap?: StateIconLineCapKind;
  points?: Point[];
  terminalIndex?: number;
  svgSource?: string;
  imageHref?: string;
  imageFit?: string;
  imageScale?: number;
  cropX?: number;
  cropY?: number;
};

export type StateIconDrawingToImageOptions = {
  resolveImageHref?: (href: string) => string | undefined | null;
  frame?: Partial<StateIconDrawingFrame>;
  frameHasTerminals?: boolean;
};

export type StateIconDrawingFrame = {
  strokeStyle: "solid" | "dashed" | "dotted";
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  backgroundImage?: string;
  backgroundImageAssetId?: string;
  backgroundImageFit?: string;
};

export const DEFAULT_STATE_ICON_DRAWING_FRAME: StateIconDrawingFrame = {
  strokeStyle: "solid",
  strokeWidth: 0,
  strokeColor: "transparent",
  fillColor: "transparent",
  backgroundImage: "",
  backgroundImageAssetId: "",
  backgroundImageFit: "cover"
};

type StateIconSvgStyleOverride = {
  stroke: string;
  strokeWidth: number;
  dashArray: string;
  strokeColorEdited?: boolean;
  strokeStyleEdited?: boolean;
};

export type DeviceDefinitionStateDraftRow = DeviceStateDefinition & {
  id: string;
  value: string;
  name: string;
  icon: string;
  image: string;
  imageAssetId: string;
  imageFit: string;
  text: string;
  color: string;
  fillColor: string;
  strokeColor: string;
  textColor: string;
  backgroundImage: string;
  backgroundImageAssetId: string;
  backgroundImageFit: string;
  imageCleared: string;
};

export function customParamId() {
  return `param-${Math.random().toString(36).slice(2, 9)}`;
}

export function deviceDefinitionRowId() {
  return `def-${Math.random().toString(36).slice(2, 9)}`;
}

export function stateDraftRowId() {
  return `state-${Math.random().toString(36).slice(2, 9)}`;
}

export const DEFAULT_STATE_PAGE_ID = "__default-state__";
export const DEFAULT_STATE_VALUE = "0";
export const DEFAULT_STATE_NAME = "状态0";

export function isDefaultStatePageId(rowId: string) {
  return !rowId || rowId === DEFAULT_STATE_PAGE_ID;
}

export function createStateDraftRow(definition: Partial<DeviceStateDefinition> = {}): DeviceDefinitionStateDraftRow {
  const value = String(definition.value ?? "").trim();
  const name = String(definition.name ?? value).trim();
  const hasImage = Boolean(definition.image || definition.imageAssetId || definition.backgroundImage || definition.backgroundImageAssetId);
  const fallbackImageFit = hasImage ? "fixed" : "cover";
  return {
    id: stateDraftRowId(),
    value,
    name,
    icon: String(definition.icon ?? "").trim(),
    image: String(definition.image ?? definition.backgroundImage ?? "").trim(),
    imageAssetId: String(definition.imageAssetId ?? definition.backgroundImageAssetId ?? "").trim(),
    imageFit: normalizeImageFitMode(definition.imageFit ?? definition.backgroundImageFit ?? fallbackImageFit),
    text: String(definition.text ?? "").trim(),
    color: String(definition.color ?? "").trim(),
    fillColor: String(definition.fillColor ?? "").trim(),
    strokeColor: String(definition.strokeColor ?? "").trim(),
    textColor: String(definition.textColor ?? "").trim(),
    backgroundImage: String(definition.backgroundImage ?? "").trim(),
    backgroundImageAssetId: String(definition.backgroundImageAssetId ?? "").trim(),
    backgroundImageFit: normalizeImageFitMode(definition.backgroundImageFit ?? definition.imageFit ?? fallbackImageFit),
    imageCleared: String(definition.imageCleared ?? "").trim()
  };
}

export function createStateDraftRowFromDefaultVisual(
  defaultVisual: Partial<DeviceStateDefinition>,
  definition: Partial<DeviceStateDefinition> = {}
): DeviceDefinitionStateDraftRow {
  return createStateDraftRow({
    ...defaultVisual,
    ...definition
  });
}

export function defaultStateDraftRow(
  rows: readonly DeviceDefinitionStateDraftRow[],
  defaultVisual: Partial<DeviceStateDefinition> = {}
): DeviceDefinitionStateDraftRow {
  const base = createStateDraftRow(defaultVisual);
  return {
    ...base,
    id: DEFAULT_STATE_PAGE_ID,
    value: base.value || DEFAULT_STATE_VALUE,
    name: base.name || DEFAULT_STATE_NAME
  };
}

export function nonDefaultStateDraftRows(rows: readonly DeviceDefinitionStateDraftRow[]) {
  return rows;
}

export function nextNonDefaultStateIndex(rows: readonly DeviceDefinitionStateDraftRow[]) {
  const used = new Set<string>();
  for (const row of nonDefaultStateDraftRows(rows)) {
    const value = row.value.trim();
    const name = row.name.trim();
    if (/^\d+$/.test(value)) {
      used.add(value);
    }
    const nameMatch = /^状态(\d+)$/.exec(name);
    if (nameMatch) {
      used.add(nameMatch[1]);
    }
  }
  for (let index = 1; index <= rows.length + 1; index += 1) {
    if (!used.has(String(index))) {
      return index;
    }
  }
  return Math.max(1, rows.length);
}

export function upsertDefaultStateDraftRow(
  rows: readonly DeviceDefinitionStateDraftRow[],
  defaultVisual: Partial<DeviceStateDefinition>,
  patch: Partial<DeviceDefinitionStateDraftRow>
): DeviceDefinitionStateDraftRow[] {
  void defaultVisual;
  void patch;
  return [...rows];
}

export function appendNonDefaultStateDraftRow(
  rows: readonly DeviceDefinitionStateDraftRow[],
  defaultVisual: Partial<DeviceStateDefinition>,
  row: DeviceDefinitionStateDraftRow
): DeviceDefinitionStateDraftRow[] {
  void defaultVisual;
  return [...rows, row];
}

export function createDefinitionStateDraftRows(template: DeviceTemplate): DeviceDefinitionStateDraftRow[] {
  return getTemplateStateDefinitions(template).map((definition) => createStateDraftRow(definition));
}

export function normalizeStateDraftRows(rows: readonly DeviceDefinitionStateDraftRow[]): DeviceStateDefinition[] {
  return normalizeDeviceStateDefinitions(
    rows.map((row) => ({
      value: row.value,
      name: row.name,
      icon: row.icon,
      image: row.image,
      imageAssetId: row.imageAssetId,
      imageFit: row.imageFit,
      text: row.text,
      color: row.color,
      fillColor: row.fillColor,
      strokeColor: row.strokeColor,
      textColor: row.textColor,
      backgroundImage: row.backgroundImage,
      backgroundImageAssetId: row.backgroundImageAssetId,
      backgroundImageFit: row.backgroundImageFit,
      imageCleared: row.imageCleared
    }))
  );
}

export function validateStateDraftRows(rows: readonly DeviceDefinitionStateDraftRow[]) {
  const populatedRows = rows.filter((row) =>
    [
      row.value,
      row.name,
      row.icon,
      row.image,
      row.imageAssetId,
      row.imageFit,
      row.text,
      row.color,
      row.fillColor,
      row.strokeColor,
      row.textColor,
      row.backgroundImage,
      row.backgroundImageAssetId,
      row.backgroundImageFit,
      row.imageCleared
    ].some((value) => String(value ?? "").trim())
  );
  for (const row of populatedRows) {
    if (!row.value.trim() || !row.name.trim()) {
      return { states: [] as DeviceStateDefinition[], error: "状态值和状态名称不能为空。" };
    }
  }
  const seen = new Set<string>();
  for (const row of populatedRows) {
    const key = row.value.trim();
    if (seen.has(key)) {
      return { states: [] as DeviceStateDefinition[], error: `状态值重复：${key}` };
    }
    seen.add(key);
  }
  return { states: normalizeStateDraftRows(populatedRows), error: "" };
}

export function stateVisualFromDraftRow(row?: DeviceDefinitionStateDraftRow | null): DeviceStateVisual | null {
  const [state] = row ? normalizeStateDraftRows([row]) : [];
  return state ? { ...state, value: state.value, name: state.name } : null;
}

export function activeStateDraftRow(rows: readonly DeviceDefinitionStateDraftRow[], activeRowId: string) {
  if (isDefaultStatePageId(activeRowId)) {
    return null;
  }
  return rows.find((row) => row.id === activeRowId) ?? null;
}

export function normalizeStatePageId(rows: readonly DeviceDefinitionStateDraftRow[], activeRowId: string) {
  if (isDefaultStatePageId(activeRowId)) {
    return DEFAULT_STATE_PAGE_ID;
  }
  return rows.some((row) => row.id === activeRowId) ? activeRowId : DEFAULT_STATE_PAGE_ID;
}

export function stateDraftImageValue(row: DeviceDefinitionStateDraftRow) {
  return row.image || row.backgroundImage;
}

export function stateIconDrawingDraftSourceImage(
  row: DeviceDefinitionStateDraftRow | null | undefined,
  assets: Record<string, string> = {}
) {
  const visual = stateVisualFromDraftRow(row);
  if (!visual || visual.imageCleared) {
    return "";
  }
  return resolveStateVisualImageHref(visual, assets).trim();
}

export function stateIconDrawingInlineNeedsDraftReload(options: {
  targetMatches: boolean;
  keyMatches: boolean;
  initialImage: string;
  inlineImage: string;
  initialSourceImage: string;
  draftSourceImage: string;
}) {
  if (!options.targetMatches || !options.keyMatches) {
    return true;
  }
  if (options.initialImage !== options.inlineImage) {
    return false;
  }
  return options.initialSourceImage !== options.draftSourceImage;
}

export function stateIconDrawingInlineCanPersistDraft(options: {
  targetMatches: boolean;
  keyMatches: boolean;
  initialImage: string;
  inlineImage: string;
}) {
  if (!options.targetMatches || !options.keyMatches) {
    return false;
  }
  return options.initialImage !== options.inlineImage;
}

export function stateVisualShapeLabel(kind: StateVisualShapeKind) {
  switch (kind) {
    case "switch-open":
      return "开关开";
    case "switch-closed":
      return "开关闭";
    case "valve-open":
      return "阀开";
    case "valve-closed":
      return "阀关";
    case "line":
      return "线";
    case "polyline":
      return "折线";
    case "point":
      return "点";
    case "triangle":
      return "三角";
    case "rectangle":
      return "矩形";
    case "square":
      return "正方型";
    case "hexagon":
      return "六角";
    case "polygon":
      return "多角";
    case "circle":
      return "圆";
    case "semicircle":
      return "半圆";
    case "ellipse":
      return "椭圆";
    case "arc":
      return "圆弧";
    case "text":
      return "文本框";
    case "imported-svg":
      return "SVG";
    case "image":
      return "图片";
    default:
      return kind;
  }
}

export function generateStateVisualShapeImage(kind: StateVisualShapeKind, row: DeviceDefinitionStateDraftRow) {
  const stroke = visibleStateIconColor("#2563eb", row.strokeColor, row.color);
  const fill = row.fillColor.trim() || "transparent";
  const textFill = visibleStateIconColor(stroke, row.textColor, row.color);
  const label = escapeXml(row.text.trim() || row.icon.trim() || row.name.trim() || row.value.trim() || "状态");
  const common = `fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  const text = `<text x="120" y="94" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Microsoft YaHei" font-size="54" font-weight="800" fill="${escapeXml(textFill)}">${label}</text>`;
  let body = "";
  switch (kind) {
    case "switch-open":
      body = `<circle cx="70" cy="80" r="14" fill="#fff" stroke="${escapeXml(stroke)}" stroke-width="8"/><circle cx="170" cy="80" r="14" fill="#fff" stroke="${escapeXml(stroke)}" stroke-width="8"/><path d="M 30 80 H 56 M 184 80 H 210 M 84 72 L 154 38" fill="none" stroke="${escapeXml(stroke)}" stroke-width="9" stroke-linecap="round"/>`;
      break;
    case "switch-closed":
      body = `<circle cx="70" cy="80" r="14" fill="#fff" stroke="${escapeXml(stroke)}" stroke-width="8"/><circle cx="170" cy="80" r="14" fill="#fff" stroke="${escapeXml(stroke)}" stroke-width="8"/><path d="M 30 80 H 56 M 84 80 H 156 M 184 80 H 210" fill="none" stroke="${escapeXml(stroke)}" stroke-width="9" stroke-linecap="round"/>`;
      break;
    case "valve-open":
      body = `<path d="M 44 48 L 120 80 L 44 112 Z M 196 48 L 120 80 L 196 112 Z" ${common}/><path d="M 120 34 V 126 M 88 34 H 152" fill="none" stroke="${escapeXml(stroke)}" stroke-width="7" stroke-linecap="round"/>`;
      break;
    case "valve-closed":
      body = `<path d="M 44 48 L 120 80 L 44 112 Z M 196 48 L 120 80 L 196 112 Z" ${common}/><path d="M 76 36 L 164 124 M 164 36 L 76 124" fill="none" stroke="${escapeXml(stroke)}" stroke-width="8" stroke-linecap="round"/>`;
      break;
    case "line":
      body = `<path d="M 42 80 H 198" fill="none" stroke="${escapeXml(stroke)}" stroke-width="10" stroke-linecap="round"/>`;
      break;
    case "polyline":
      body = `<path d="M 42 118 L 120 42 L 198 118" fill="none" stroke="${escapeXml(stroke)}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case "point":
      body = `<circle cx="120" cy="80" r="18" fill="${escapeXml(stroke)}"/>`;
      break;
    case "triangle":
      body = `<path d="M 120 34 L 190 122 H 50 Z" ${common}/>`;
      break;
    case "rectangle":
      body = `<rect x="52" y="50" width="136" height="60" rx="4" ${common}/>`;
      break;
    case "square":
      body = `<rect x="74" y="34" width="92" height="92" rx="4" ${common}/>`;
      break;
    case "hexagon":
      body = `<path d="M 82 34 H 158 L 198 80 L 158 126 H 82 L 42 80 Z" ${common}/>`;
      break;
    case "polygon":
      body = `<path d="M 120 28 L 158 54 L 202 58 L 178 96 L 184 138 L 120 120 L 56 138 L 62 96 L 38 58 L 82 54 Z" ${common}/>`;
      break;
    case "circle":
      body = `<circle cx="120" cy="80" r="48" ${common}/>`;
      break;
    case "semicircle":
      body = `<path d="M 60 104 A 60 60 0 0 1 180 104 Z" ${common}/>`;
      break;
    case "ellipse":
      body = `<ellipse cx="120" cy="80" rx="72" ry="42" ${common}/>`;
      break;
    case "arc":
      body = `<path d="M 58 112 A 72 72 0 0 1 182 112" fill="none" stroke="${escapeXml(stroke)}" stroke-width="10" stroke-linecap="round"/>`;
      break;
    case "text":
      body = text;
      break;
    default:
      body = `<circle cx="120" cy="80" r="48" ${common}/>`;
      break;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" fill="none"/>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function stateIconDrawingElementId() {
  return `state-icon-element-${Math.random().toString(36).slice(2, 9)}`;
}

export function visibleStateIconColor(fallback: string, ...values: Array<string | undefined | null>) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
      continue;
    }
    const lower = normalized.toLowerCase();
    if (lower !== "transparent" && lower !== "none") {
      return normalized;
    }
  }
  return fallback;
}

function isTransparentStateIconColor(value: string | undefined | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return !normalized || normalized === "transparent" || normalized === "none";
}

function normalizeStateIconLineCapKind(value: string | undefined | null): StateIconLineCapKind {
  return STATE_ICON_LINE_CAP_OPTIONS.some((option) => option.value === value)
    ? value as StateIconLineCapKind
    : "none";
}

function stateIconStrokeDashArray(strokeStyle: StateIconDrawingElement["strokeStyle"], strokeWidth: number) {
  const width = Math.max(1, strokeWidth);
  if (strokeStyle === "dashed") {
    return `${formatSvgNumber(width * 3)} ${formatSvgNumber(width * 1.8)}`;
  }
  if (strokeStyle === "dotted") {
    return `${formatSvgNumber(width * 0.2)} ${formatSvgNumber(width * 1.8)}`;
  }
  return "";
}

export function stateIconDrawingFrameRect(hasTerminals: boolean) {
  return hasTerminals
    ? { x: 30, y: 20, width: 180, height: 120, rx: 8 }
    : { x: 0, y: 0, width: 240, height: 160, rx: 10 };
}

function stateIconDrawingFrameMarkup(
  frame: Partial<StateIconDrawingFrame> | undefined,
  hasTerminals: boolean,
  options: StateIconDrawingToImageOptions = {}
) {
  if (!frame) {
    return "";
  }
  const strokeWidth = Math.max(0, Number(frame.strokeWidth) || 0);
  const fill = String(frame.fillColor ?? "").trim() || "transparent";
  const stroke = String(frame.strokeColor ?? "").trim() || "transparent";
  const dashArray = stateIconStrokeDashArray(frame.strokeStyle, strokeWidth);
  const dashAttr = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
  const rect = stateIconDrawingFrameRect(hasTerminals);
  const backgroundImageAssetId = String(frame.backgroundImageAssetId ?? "").trim();
  const backgroundImage = backgroundImageAssetId
    ? (String(frame.backgroundImage ?? "").trim() || `/webgrp/images/${backgroundImageAssetId}`)
    : String(frame.backgroundImage ?? "").trim();
  const resolvedBackgroundImage = backgroundImage
    ? backgroundImageAssetId
      ? (backgroundImage.startsWith("data:") ? `/webgrp/images/${backgroundImageAssetId}` : backgroundImage)
      : options.resolveImageHref?.(backgroundImage) || backgroundImage
    : "";
  const frameRect = `<rect data-state-icon-frame="true" x="${formatSvgNumber(rect.x)}" y="${formatSvgNumber(rect.y)}" width="${formatSvgNumber(rect.width)}" height="${formatSvgNumber(rect.height)}" rx="${formatSvgNumber(rect.rx)}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"${dashAttr} vector-effect="non-scaling-stroke"/>`;
  if (!resolvedBackgroundImage) {
    return frameRect;
  }
  const clipId = "state-icon-frame-background-clip";
  const assetAttr = backgroundImageAssetId ? ` data-state-icon-frame-image-asset-id="${escapeXml(backgroundImageAssetId)}"` : "";
  const backgroundImageFit = normalizeImageFitMode(frame.backgroundImageFit);
  const fitAttr = backgroundImageFit === "cover" ? "" : ` data-state-icon-frame-image-fit="${escapeXml(backgroundImageFit)}"`;
  const hrefAttr = ` data-state-icon-frame-image-href="${escapeXml(resolvedBackgroundImage)}"`;
  const backgroundMarkup = `<defs><clipPath id="${clipId}"><rect x="${formatSvgNumber(rect.x)}" y="${formatSvgNumber(rect.y)}" width="${formatSvgNumber(rect.width)}" height="${formatSvgNumber(rect.height)}" rx="${formatSvgNumber(rect.rx)}"/></clipPath></defs>${svgImageContentMarkup(resolvedBackgroundImage, {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    imageFit: backgroundImageFit,
    clipPath: `url(#${clipId})`,
    extraAttributes: ` data-state-icon-frame-image="true"${assetAttr}${fitAttr}${hrefAttr}`
  })}`;
  const borderMarkup = `<rect data-state-icon-frame-border="true" x="${formatSvgNumber(rect.x)}" y="${formatSvgNumber(rect.y)}" width="${formatSvgNumber(rect.width)}" height="${formatSvgNumber(rect.height)}" rx="${formatSvgNumber(rect.rx)}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"${dashAttr} vector-effect="non-scaling-stroke"/>`;
  return `${frameRect}${backgroundMarkup}${borderMarkup}`;
}

function stateIconSvgStyleOverrideCss(override: StateIconSvgStyleOverride) {
  const rules: string[] = [];
  const overrideStrokeWidth = override.strokeWidth > 0;
  const overrideStrokeColor = overrideStrokeWidth || override.strokeColorEdited === true;
  const overrideStrokeStyle = overrideStrokeWidth || override.strokeStyleEdited === true;
  if (overrideStrokeColor) {
    rules.push(`stroke:${escapeXml(override.stroke)} !important;`);
  }
  if (overrideStrokeWidth) {
    rules.push(`stroke-width:${formatSvgNumber(Math.max(0, override.strokeWidth))} !important;`);
  }
  if (overrideStrokeStyle) {
    rules.push(override.dashArray
      ? `stroke-dasharray:${escapeXml(override.dashArray)} !important;`
      : "stroke-dasharray:none !important;");
  }
  if (overrideStrokeWidth) {
    rules.push("vector-effect:non-scaling-stroke !important;");
  }
  return rules.length > 0
    ? `path,line,polyline,polygon,rect,circle,ellipse{${rules.join("")}}`
    : "";
}

function stateIconSvgStyleOverrideMarkup(override?: StateIconSvgStyleOverride) {
  const css = override ? stateIconSvgStyleOverrideCss(override) : "";
  return css ? `<style>${css}</style>` : "";
}

function isGeneratedZeroStrokeSvgStyleOverride(css: string) {
  const normalized = css.replace(/\s+/gu, "").toLowerCase();
  return (
    normalized.includes("path,line,polyline,polygon,rect,circle,ellipse{") &&
    normalized.includes("stroke-width:0!important") &&
    normalized.includes("vector-effect:non-scaling-stroke!important")
  );
}

function stripGeneratedZeroStrokeSvgStyleOverrides(source: string) {
  return source.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/giu, (markup, css) =>
    isGeneratedZeroStrokeSvgStyleOverride(String(css ?? "")) ? "" : markup
  );
}

function stateIconSvgFallbackParts(source: string) {
  const svgSource = source.trim();
  const openMatch = /^<svg\b([^>]*)>/iu.exec(svgSource);
  const closeIndex = svgSource.toLowerCase().lastIndexOf("</svg>");
  if (!openMatch || closeIndex < 0) {
    return null;
  }
  const open = openMatch[1] ?? "";
  const body = svgSource.slice(openMatch[0].length, closeIndex);
  const viewBox = readSvgMarkupAttribute(open, "viewBox") ||
    `0 0 ${formatSvgNumber(readSvgMarkupNumber(open, "width", 240))} ${formatSvgNumber(readSvgMarkupNumber(open, "height", 160))}`;
  return { viewBox, body };
}

function stateIconLineCapMarkerId(elementId: string, position: "start" | "end", cap: StateIconLineCapKind) {
  return `cap-${elementId.replace(/[^a-zA-Z0-9_-]/g, "")}-${position}-${cap}`;
}

function stateIconLineCapMarkerMarkup(
  element: StateIconDrawingElement,
  position: "start" | "end",
  capValue: string | undefined,
  stroke: string
) {
  const cap = normalizeStateIconLineCapKind(capValue);
  if (cap === "none") {
    return "";
  }
  const id = escapeXml(stateIconLineCapMarkerId(element.id, position, cap));
  if (cap === "arrow") {
    return `<marker id="${id}" viewBox="-6 -6 12 12" refX="5" refY="0" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M -4 -4 L 5 0 L -4 4 Z" fill="${stroke}"/></marker>`;
  }
  if (cap === "circle") {
    return `<marker id="${id}" viewBox="-5 -5 10 10" refX="0" refY="0" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><circle cx="0" cy="0" r="3.2" fill="${stroke}"/></marker>`;
  }
  if (cap === "triangle") {
    return `<marker id="${id}" viewBox="-5 -5 10 10" refX="0" refY="0" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><path d="M 0 -4 L 4 4 L -4 4 Z" fill="${stroke}"/></marker>`;
  }
  return `<marker id="${id}" viewBox="-5 -5 10 10" refX="0" refY="0" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><rect x="-3.4" y="-3.4" width="6.8" height="6.8" fill="${stroke}"/></marker>`;
}

function stateIconLineCapMarkerAttrs(element: StateIconDrawingElement) {
  const startCap = normalizeStateIconLineCapKind(element.startCap);
  const endCap = normalizeStateIconLineCapKind(element.endCap);
  return [
    startCap !== "none" ? `marker-start="url(#${escapeXml(stateIconLineCapMarkerId(element.id, "start", startCap))})"` : "",
    endCap !== "none" ? `marker-end="url(#${escapeXml(stateIconLineCapMarkerId(element.id, "end", endCap))})"` : ""
  ].filter(Boolean).join(" ");
}

function stateIconLineCapMarkerDefs(element: StateIconDrawingElement, stroke: string) {
  const markers = [
    stateIconLineCapMarkerMarkup(element, "start", element.startCap, stroke),
    stateIconLineCapMarkerMarkup(element, "end", element.endCap, stroke)
  ].filter(Boolean).join("");
  return markers ? `<defs>${markers}</defs>` : "";
}

function normalizedStateIconPolylinePoints(element: StateIconDrawingElement) {
  const points = (element.points ?? [])
    .map((point) => ({
      x: Number(point.x),
      y: Number(point.y)
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  return points.length >= 2 ? points : null;
}

function stateIconPolylineLocalPoints(element: StateIconDrawingElement, width: number, height: number) {
  const normalizedPoints = normalizedStateIconPolylinePoints(element);
  if (normalizedPoints) {
    return normalizedPoints.map((point) => ({
      x: point.x * width,
      y: point.y * height
    }));
  }
  const hw = width / 2;
  const hh = height / 2;
  return [
    { x: -hw, y: hh * 0.72 },
    { x: 0, y: -hh * 0.72 },
    { x: hw, y: hh * 0.72 }
  ];
}

function stateIconPolylinePathData(points: readonly Point[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`)
    .join(" ");
}

function stateIconPolylinePointsAttribute(points: readonly Point[]) {
  return points
    .map((point) => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`)
    .join(" ");
}

function parseStateIconPolylinePointsAttribute(value: string) {
  const points = value
    .trim()
    .split(/\s+/u)
    .map((item) => {
      const [rawX, rawY] = item.split(",");
      return {
        x: Number.parseFloat(rawX ?? ""),
        y: Number.parseFloat(rawY ?? "")
      };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  return points.length >= 2 ? points : null;
}

export function createStateIconDrawingElement(kind: StateVisualShapeKind, row?: DeviceDefinitionStateDraftRow | null): StateIconDrawingElement {
  const strokeColor = visibleStateIconColor("#2563eb", row?.strokeColor, row?.color);
  return {
    id: stateIconDrawingElementId(),
    kind,
    x: 120,
    y: 80,
    width: kind === "point" ? 28 : kind === "line" || kind === "polyline" || kind === "arc" ? 128 : kind === "rectangle" ? 96 : kind === "square" ? 68 : 76,
    height: kind === "point" ? 28 : kind === "line" ? 24 : kind === "polyline" || kind === "arc" ? 70 : kind === "square" ? 68 : 58,
    rotation: 0,
    strokeWidth: 6,
    strokeColor,
    fillColor: kind === "line" || kind === "polyline" || kind === "arc" || kind === "text" ? "transparent" : (row?.fillColor.trim() || "transparent"),
    textColor: visibleStateIconColor("#111827", row?.textColor, row?.color, strokeColor),
    text: row?.text.trim() || row?.icon.trim() || stateVisualShapeLabel(kind),
    strokeStyle: "solid",
    startCap: "none",
    endCap: "none",
    svgSource: "",
    imageHref: "",
    imageFit: "cover",
    imageScale: 1,
    cropX: 0,
    cropY: 0
  };
}

export function createImportedStateIconElement(
  kind: "imported-svg" | "image",
  source: string,
  fileName: string
): StateIconDrawingElement {
  const normalizedSvgSource = kind === "imported-svg"
    ? stripGeneratedZeroStrokeSvgStyleOverrides(source)
    : "";
  return {
    ...createStateIconDrawingElement(kind),
    width: 120,
    height: 88,
    strokeWidth: 0,
    fillColor: "transparent",
    text: fileName || stateVisualShapeLabel(kind),
    svgSource: normalizedSvgSource,
    imageHref: kind === "image" ? source : "",
    imageFit: "cover",
    imageScale: 1,
    cropX: 0,
    cropY: 0
  };
}

function readSvgMarkupAttribute(markup: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(markup);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const STATE_ICON_PRESERVE_VIEW_BOX_ATTRIBUTE = "data-state-icon-preserve-view-box";

function stateIconSvgPreservesDeclaredViewBox(source: string) {
  const rootOpen = /<svg\b([^>]*)>/iu.exec(source.trim())?.[1] ?? "";
  return readSvgMarkupAttribute(rootOpen, STATE_ICON_PRESERVE_VIEW_BOX_ATTRIBUTE).trim().toLowerCase() === "true";
}

function stateIconSvgPreserveViewBoxMarkup(source: string) {
  return stateIconSvgPreservesDeclaredViewBox(source)
    ? ` ${STATE_ICON_PRESERVE_VIEW_BOX_ATTRIBUTE}="true"`
    : "";
}

function readSvgMarkupNumber(markup: string, name: string, fallback: number) {
  const parsed = Number.parseFloat(readSvgMarkupAttribute(markup, name));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stateIconDrawingTerminalOwnershipFromMarkup(markup: string): Pick<StateIconDrawingElement, "terminalIndex"> | Record<string, never> {
  const terminalIndex = readSvgMarkupNumber(markup, "data-terminal-index", Number.NaN);
  return Number.isInteger(terminalIndex) && terminalIndex >= 0
    ? { terminalIndex }
    : {};
}

function stateIconDrawingStrokeStyleFromMarkup(markup: string): StateIconDrawingElement["strokeStyle"] {
  const dashArray = readSvgMarkupAttribute(markup, "stroke-dasharray").trim();
  if (!dashArray) {
    return "solid";
  }
  const parts = dashArray
    .split(/[,\s]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((value) => Number.isFinite(value));
  if (parts.length >= 2 && parts[0] <= parts[1] * 0.25) {
    return "dotted";
  }
  return "dashed";
}

function parseStateIconDrawingGeneratedTransform(markup: string) {
  const transform = readSvgMarkupAttribute(markup, "transform");
  const translateMatch = /translate\(\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*(?:,|\s)\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)?\s*\)/i.exec(transform);
  if (!translateMatch) {
    return null;
  }
  const rotationMatch = /rotate\(\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*\)/i.exec(transform);
  return {
    x: Number.parseFloat(translateMatch[1]),
    y: Number.parseFloat(translateMatch[2] ?? "0"),
    rotation: rotationMatch ? Number.parseFloat(rotationMatch[1]) : 0
  };
}

function firstSvgMarkupInGeneratedGroup(markup: string) {
  if (typeof DOMParser !== "undefined") {
    try {
      const document = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
      if (!document.querySelector("parsererror")) {
        const rootGroup = Array.from(document.documentElement.children).find((child) => child.tagName.toLowerCase() === "g");
        const nestedSvg = rootGroup
          ? Array.from(rootGroup.children).find((child) => child.tagName.toLowerCase() === "svg")
          : null;
        if (nestedSvg?.outerHTML) {
          return nestedSvg.outerHTML;
        }
      }
    } catch {
      // Fall through to the markup scan used in non-DOM runtimes.
    }
  }
  const rootGroupOpen = /^<g\b[^>]*>/i.exec(markup);
  if (rootGroupOpen) {
    const tagPattern = /<\/?(?:g|svg)\b[^>]*>/gi;
    tagPattern.lastIndex = rootGroupOpen[0].length;
    let groupDepth = 1;
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(markup))) {
      const tag = match[0];
      const isClosing = /^<\//u.test(tag);
      const tagName = /^<\/?\s*([a-z]+)/iu.exec(tag)?.[1]?.toLowerCase() ?? "";
      if (tagName === "g") {
        groupDepth += isClosing ? -1 : 1;
        if (groupDepth <= 0) {
          break;
        }
        continue;
      }
      if (tagName !== "svg" || isClosing || groupDepth !== 1) {
        continue;
      }
      const svgStart = match.index;
      let svgDepth = 1;
      while ((match = tagPattern.exec(markup))) {
        const svgTag = match[0];
        const svgTagName = /^<\/?\s*([a-z]+)/iu.exec(svgTag)?.[1]?.toLowerCase() ?? "";
        if (svgTagName !== "svg") {
          continue;
        }
        svgDepth += /^<\//u.test(svgTag) ? -1 : 1;
        if (svgDepth === 0) {
          return markup.slice(svgStart, tagPattern.lastIndex);
        }
      }
      break;
    }
  }
  return /<svg\b[\s\S]*?<\/svg>/i.exec(markup)?.[0] ?? "";
}

function generatedStateIconRootOpenMarkup(source: string) {
  const svgOpen = /<svg\b([^>]*)>/i.exec(source)?.[1] ?? "";
  if (!svgOpen) {
    return "";
  }
  const width = readSvgMarkupNumber(svgOpen, "width", 0);
  const height = readSvgMarkupNumber(svgOpen, "height", 0);
  const viewBox = readSvgMarkupAttribute(svgOpen, "viewBox").replace(/\s+/g, " ").trim();
  return (width === 240 && height === 160) || viewBox === "0 0 240 160" ? svgOpen : "";
}

function generatedStateIconTopLevelGroupMarkups(source: string) {
  if (!generatedStateIconRootOpenMarkup(source)) {
    return [];
  }
  const groups: string[] = [];
  const tagPattern = /<\/?g\b[^>]*>/gi;
  let depth = 0;
  let startIndex = -1;
  let startTag = "";
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source))) {
    const tag = match[0];
    const isClosing = /^<\//u.test(tag);
    if (isClosing) {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && startIndex >= 0) {
          if (/\btransform\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/iu.test(startTag)) {
            groups.push(source.slice(startIndex, tagPattern.lastIndex));
          }
          startIndex = -1;
          startTag = "";
        }
      }
      continue;
    }
    if (depth === 0) {
      startIndex = match.index;
      startTag = tag;
    }
    depth += 1;
  }
  return groups;
}

function createStateIconDrawingElementsFromGeneratedSvgSource(source: string, fileName: string) {
  const groups = generatedStateIconTopLevelGroupMarkups(source);
  if (groups.length === 0) {
    return null;
  }
  const rootOpen = generatedStateIconRootOpenMarkup(source);
  const viewBox = readSvgMarkupAttribute(rootOpen, "viewBox") || "0 0 240 160";
  const restored = groups.map((group, index) =>
    createStateIconDrawingElementFromGeneratedGroupMarkup(group, `${fileName || "SVG"}-${index + 1}`)
  );
  return restored.map((element, index) =>
    element ?? {
      ...createImportedStateIconElement(
        "imported-svg",
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeXml(viewBox)}">${groups[index]}</svg>`,
        `${fileName || "SVG"}-${index + 1}`
      ),
      ...stateIconDrawingTerminalOwnershipFromMarkup(groups[index])
    }
  );
}

export function createStateIconDrawingElementFromGeneratedGroupMarkup(
  markup: string,
  fileName: string
): StateIconDrawingElement | null {
  const trimmed = markup.trim();
  if (!/^<g\b/i.test(trimmed)) {
    return null;
  }
  const groupOpen = /^<g\b[^>]*>/i.exec(trimmed)?.[0] ?? trimmed;
  const transform = parseStateIconDrawingGeneratedTransform(trimmed);
  if (!transform) {
    return null;
  }
  const terminalOwnership = stateIconDrawingTerminalOwnershipFromMarkup(groupOpen);
  const svgMarkup = firstSvgMarkupInGeneratedGroup(trimmed);
  if (svgMarkup) {
    const svgOpen = /<svg\b([^>]*)>/i.exec(svgMarkup)?.[1] ?? "";
    const templateWidth = readSvgMarkupNumber(groupOpen, "data-state-icon-template-width", Number.NaN);
    const templateHeight = readSvgMarkupNumber(groupOpen, "data-state-icon-template-height", Number.NaN);
    const width = Math.max(1, Number.isFinite(templateWidth) && templateWidth > 0
      ? templateWidth
      : readSvgMarkupNumber(groupOpen, "data-state-icon-layer-width", readSvgMarkupNumber(svgOpen, "width", 120)));
    const height = Math.max(1, Number.isFinite(templateHeight) && templateHeight > 0
      ? templateHeight
      : readSvgMarkupNumber(groupOpen, "data-state-icon-layer-height", readSvgMarkupNumber(svgOpen, "height", 88)));
    return {
      ...createImportedStateIconElement(
        "imported-svg",
        stateIconSvgElementSource(svgMarkup) || svgMarkup,
        fileName
      ),
      x: transform.x,
      y: transform.y,
      width,
      height,
      rotation: transform.rotation,
      ...terminalOwnership
    };
  }
  const imageOpen = /<image\b([^>]*)>/i.exec(trimmed)?.[1] ?? "";
  if (imageOpen) {
    const href = readSvgMarkupAttribute(imageOpen, "href") || readSvgMarkupAttribute(imageOpen, "xlink:href");
    const width = Math.max(1, readSvgMarkupNumber(imageOpen, "width", 120));
    const height = Math.max(1, readSvgMarkupNumber(imageOpen, "height", 88));
    const svgSource = svgSourceFromDataUrl(href);
    return {
      ...createImportedStateIconElement(svgSource ? "imported-svg" : "image", svgSource || href, fileName),
      x: transform.x,
      y: transform.y,
      width,
      height,
      rotation: transform.rotation,
      ...terminalOwnership
    };
  }
  const polylinePoints = parseStateIconPolylinePointsAttribute(readSvgMarkupAttribute(trimmed, "data-polyline-points"));
  const pathOpen = /<path\b([^>]*)>/i.exec(trimmed)?.[1] ?? "";
  if (polylinePoints && pathOpen) {
    return {
      ...createStateIconDrawingElement("polyline"),
      x: transform.x,
      y: transform.y,
      width: Math.max(1, readSvgMarkupNumber(trimmed, "data-polyline-width", 128)),
      height: Math.max(1, readSvgMarkupNumber(trimmed, "data-polyline-height", 70)),
      rotation: transform.rotation,
      strokeWidth: Math.max(0, readSvgMarkupNumber(pathOpen, "stroke-width", 6)),
      strokeColor: readSvgMarkupAttribute(pathOpen, "stroke") || "#2563eb",
      fillColor: "transparent",
      points: polylinePoints,
      startCap: normalizeStateIconLineCapKind(readSvgMarkupAttribute(trimmed, "data-start-cap")),
      endCap: normalizeStateIconLineCapKind(readSvgMarkupAttribute(trimmed, "data-end-cap")),
      ...terminalOwnership
    };
  }
  const circleOpen = /<circle\b([^>]*)>/i.exec(trimmed)?.[1] ?? "";
  if (circleOpen) {
    const radius = Math.max(1, readSvgMarkupNumber(circleOpen, "r", 29));
    return {
      ...createStateIconDrawingElement("circle"),
      x: transform.x,
      y: transform.y,
      width: radius * 2,
      height: radius * 2,
      rotation: transform.rotation,
      strokeWidth: Math.max(0, readSvgMarkupNumber(circleOpen, "stroke-width", 6)),
      strokeColor: readSvgMarkupAttribute(circleOpen, "stroke") || "#2563eb",
      fillColor: readSvgMarkupAttribute(circleOpen, "fill") || "transparent",
      ...terminalOwnership
    };
  }
  const rectOpen = /<rect\b([^>]*)>/i.exec(trimmed)?.[1] ?? "";
  if (rectOpen) {
    const width = Math.max(1, readSvgMarkupNumber(rectOpen, "width", 96));
    const height = Math.max(1, readSvgMarkupNumber(rectOpen, "height", 58));
    return {
      ...createStateIconDrawingElement(Math.abs(width - height) < 0.001 ? "square" : "rectangle"),
      x: transform.x,
      y: transform.y,
      width,
      height,
      rotation: transform.rotation,
      strokeWidth: Math.max(0, readSvgMarkupNumber(rectOpen, "stroke-width", 6)),
      strokeColor: readSvgMarkupAttribute(rectOpen, "stroke") || "#2563eb",
      fillColor: readSvgMarkupAttribute(rectOpen, "fill") || "transparent",
      strokeStyle: stateIconDrawingStrokeStyleFromMarkup(rectOpen),
      ...terminalOwnership
    };
  }
  return null;
}

export function svgSourceFromDataUrl(dataUrl: string) {
  const value = dataUrl.trim();
  if (!value.startsWith("data:image/svg+xml")) {
    return "";
  }
  const commaIndex = value.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }
  const metadata = value.slice(0, commaIndex).toLowerCase();
  const payload = value.slice(commaIndex + 1);
  try {
    if (metadata.includes(";base64")) {
      return typeof atob === "function" ? atob(payload) : "";
    }
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

export function parseStateIconSvgSource(source: string) {
  const svgSource = source.trim();
  if (!svgSource || typeof DOMParser === "undefined") {
    return null;
  }
  try {
    const document = new DOMParser().parseFromString(svgSource, "image/svg+xml");
    if (document.querySelector("parsererror")) {
      return null;
    }
    const svg = document.querySelector("svg");
    if (!svg) {
      return null;
    }
    const width = Number.parseFloat(svg.getAttribute("width") || "") || 240;
    const height = Number.parseFloat(svg.getAttribute("height") || "") || 160;
    const viewBox = svg.getAttribute("viewBox") || `0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}`;
    const safeChildren = Array.from(svg.children).filter((child) => !["script", "foreignObject"].includes(child.tagName));
    const supportChildren = safeChildren.filter((child) => ["defs", "style"].includes(child.tagName));
    const editableChildren = safeChildren.filter((child) => !["defs", "style", "title", "desc", "metadata"].includes(child.tagName));
    const supportMarkup = supportChildren.map((child) => child.outerHTML).join("");
    const body = safeChildren.map((child) => child.outerHTML).join("");
    return { viewBox, body, supportMarkup, editableChildren };
  } catch {
    return null;
  }
}

export function stateIconSvgElementSource(source: string) {
  const parsed = parseStateIconSvgSource(source);
  if (!parsed || !parsed.body) {
    return "";
  }
  return `<svg xmlns="http://www.w3.org/2000/svg"${stateIconSvgPreserveViewBoxMarkup(source)} viewBox="${escapeXml(parsed.viewBox)}">${parsed.body}</svg>`;
}

export function stateIconSvgVisibleViewBox(source: string) {
  const parsed = parseStateIconSvgSource(source);
  if (!parsed) {
    return stateIconSvgFallbackParts(source)?.viewBox ?? "";
  }
  if (typeof document === "undefined") {
    return parsed.viewBox;
  }
  try {
    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.left = "-10000px";
    host.style.top = "-10000px";
    host.style.width = "0";
    host.style.height = "0";
    host.style.overflow = "hidden";
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeXml(parsed.viewBox)}">${parsed.supportMarkup}${parsed.editableChildren.map((child) => child.outerHTML).join("")}</svg>`;
    document.body.appendChild(host);
    const svg = host.querySelector("svg") as SVGSVGElement | null;
    const rootMatrix = svg?.getScreenCTM();
    const leafBoxes: Array<{ left: number; right: number; top: number; bottom: number }> = [];
    const visibleShapeSelector = "path,line,polyline,polygon,rect,circle,ellipse,text,use";
    svg?.querySelectorAll(visibleShapeSelector).forEach((element) => {
      if (!(element instanceof SVGGraphicsElement) || element.closest("defs,clipPath,mask,marker,pattern,symbol")) {
        return;
      }
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") === 0) {
        return;
      }
      const strokeWidth = Number.parseFloat(style.strokeWidth || element.getAttribute("stroke-width") || "0") || 0;
      const fillHidden = style.fill === "none" || style.fill === "transparent" || style.fill === "rgba(0, 0, 0, 0)";
      const strokeHidden = style.stroke === "none" || style.stroke === "transparent" || style.stroke === "rgba(0, 0, 0, 0)" || strokeWidth <= 0;
      if (fillHidden && strokeHidden) {
        return;
      }
      const matrix = element.getScreenCTM();
      if (!rootMatrix || !matrix) {
        return;
      }
      const box = element.getBBox();
      if (!box || box.width <= 0 || box.height <= 0) {
        return;
      }
      const toRoot = rootMatrix.inverse().multiply(matrix);
      const corners = [
        new DOMPoint(box.x, box.y),
        new DOMPoint(box.x + box.width, box.y),
        new DOMPoint(box.x + box.width, box.y + box.height),
        new DOMPoint(box.x, box.y + box.height)
      ].map((point) => point.matrixTransform(toRoot));
      leafBoxes.push({
        left: Math.min(...corners.map((point) => point.x)),
        right: Math.max(...corners.map((point) => point.x)),
        top: Math.min(...corners.map((point) => point.y)),
        bottom: Math.max(...corners.map((point) => point.y))
      });
    });
    const box = leafBoxes.length > 0
      ? {
          x: Math.min(...leafBoxes.map((item) => item.left)),
          y: Math.min(...leafBoxes.map((item) => item.top)),
          width: Math.max(...leafBoxes.map((item) => item.right)) - Math.min(...leafBoxes.map((item) => item.left)),
          height: Math.max(...leafBoxes.map((item) => item.bottom)) - Math.min(...leafBoxes.map((item) => item.top))
        }
      : svg?.getBBox();
    host.remove();
    if (box && box.width > 0 && box.height > 0) {
      return `${formatSvgNumber(box.x)} ${formatSvgNumber(box.y)} ${formatSvgNumber(box.width)} ${formatSvgNumber(box.height)}`;
    }
  } catch {
    // Fall back to the declared SVG viewBox when rendered geometry cannot be measured.
  }
  return parsed.viewBox;
}

function stateIconSvgRenderViewBox(source: string) {
  if (!stateIconSvgPreservesDeclaredViewBox(source)) {
    return stateIconSvgVisibleViewBox(source);
  }
  return parseStateIconSvgSource(source)?.viewBox ?? stateIconSvgFallbackParts(source)?.viewBox ?? "";
}

export function parseSvgStyleAttribute(value: string) {
  const style: CSSProperties = {};
  for (const declaration of value.split(";")) {
    const [rawName, ...rawValue] = declaration.split(":");
    const name = rawName?.trim();
    const propertyValue = rawValue.join(":").trim();
    if (!name || !propertyValue) {
      continue;
    }
    const camelName = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof CSSProperties;
    style[camelName] = propertyValue as never;
  }
  return style;
}

function stateIconSvgElementAcceptsStyleOverride(tag: string) {
  return ["path", "line", "polyline", "polygon", "rect", "circle", "ellipse"].includes(tag);
}

export function stateIconSvgReactAttributes(element: Element, override?: StateIconSvgStyleOverride) {
  const props: Record<string, string | CSSProperties> = {};
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name;
    if (name.startsWith("on")) {
      continue;
    }
    if (name === "style") {
      props.style = parseSvgStyleAttribute(attribute.value);
      continue;
    }
    const propName =
      name === "class"
        ? "className"
        : name === "clip-path"
          ? "clipPath"
          : name === "fill-rule"
            ? "fillRule"
            : name === "stroke-width"
              ? "strokeWidth"
              : name === "stroke-linecap"
                ? "strokeLinecap"
                : name === "stroke-linejoin"
                  ? "strokeLinejoin"
                  : name === "stroke-dasharray"
                    ? "strokeDasharray"
                    : name === "text-anchor"
                      ? "textAnchor"
                      : name === "dominant-baseline"
                        ? "dominantBaseline"
                        : name === "font-family"
                          ? "fontFamily"
                          : name === "font-size"
                            ? "fontSize"
                            : name === "font-weight"
                              ? "fontWeight"
                              : name === "font-style"
                                ? "fontStyle"
                                : name === "text-decoration"
                                  ? "textDecoration"
                                  : name === "vector-effect"
                                    ? "vectorEffect"
                                    : name === "pointer-events"
                                      ? "pointerEvents"
                                      : name === "stop-color"
                                        ? "stopColor"
                                        : name === "stop-opacity"
                                          ? "stopOpacity"
                                          : name === "fill-opacity"
                                            ? "fillOpacity"
                                            : name === "stroke-opacity"
                                              ? "strokeOpacity"
                                              : name === "marker-start"
                                                ? "markerStart"
                                                : name === "marker-end"
                                                  ? "markerEnd"
                                                  : name === "marker-mid"
                                                    ? "markerMid"
                                                    : name === "marker-width"
                                                      ? "markerWidth"
                                                      : name === "marker-height"
                                                        ? "markerHeight"
                                                        : name === "marker-units"
                                                          ? "markerUnits"
                                                          : name === "refx"
                                                            ? "refX"
                                                            : name === "refy"
                                                              ? "refY"
                                                              : name;
    props[propName] = attribute.value;
  }
  if (override && stateIconSvgElementAcceptsStyleOverride(element.tagName)) {
    const overrideStrokeWidth = override.strokeWidth > 0;
    const overrideStrokeColor = overrideStrokeWidth || override.strokeColorEdited === true;
    const overrideStrokeStyle = overrideStrokeWidth || override.strokeStyleEdited === true;
    if (!overrideStrokeColor && !overrideStrokeWidth && !overrideStrokeStyle) {
      return props;
    }
    const style = typeof props.style === "object" && props.style
      ? { ...(props.style as CSSProperties) }
      : {};
    if (overrideStrokeColor) {
      delete style.stroke;
      props.stroke = override.stroke;
    }
    if (overrideStrokeWidth) {
      delete style.strokeWidth;
      props.strokeWidth = formatSvgNumber(Math.max(0, override.strokeWidth));
      props.vectorEffect = "non-scaling-stroke";
    }
    if (overrideStrokeStyle) {
      delete style.strokeDasharray;
      props.strokeDasharray = override.dashArray || "none";
    }
    props.style = style;
  }
  return props;
}

export function stateIconSvgNodeChildren(element: Element, keyPrefix: string, override?: StateIconSvgStyleOverride): ReactNode[] {
  return Array.from(element.childNodes).flatMap((child, index) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      return text.trim() ? [text] : [];
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }
    const node = child as Element;
    if (["script", "foreignObject", "style"].includes(node.tagName)) {
      return [];
    }
    return [stateIconSvgNodeToReact(node, `${keyPrefix}-${index}`, override)];
  });
}

export function stateIconSvgNodeToReact(element: Element, key: string, override?: StateIconSvgStyleOverride): ReactNode {
  const tag = element.tagName;
  const props = stateIconSvgReactAttributes(element, override);
  const children = stateIconSvgNodeChildren(element, key, override);
  switch (tag) {
    case "svg":
      return <svg key={key} {...props}>{children}</svg>;
    case "g":
      return <g key={key} {...props}>{children}</g>;
    case "path":
      return <path key={key} {...props} />;
    case "circle":
      return <circle key={key} {...props} />;
    case "rect":
      return <rect key={key} {...props} />;
    case "ellipse":
      return <ellipse key={key} {...props} />;
    case "line":
      return <line key={key} {...props} />;
    case "polyline":
      return <polyline key={key} {...props} />;
    case "polygon":
      return <polygon key={key} {...props} />;
    case "text":
      return <text key={key} {...props}>{children}</text>;
    case "tspan":
      return <tspan key={key} {...props}>{children}</tspan>;
    case "defs":
      return <defs key={key} {...props}>{children}</defs>;
    case "marker":
      return <marker key={key} {...props}>{children}</marker>;
    case "clipPath":
      return <clipPath key={key} {...props}>{children}</clipPath>;
    case "linearGradient":
      return <linearGradient key={key} {...props}>{children}</linearGradient>;
    case "radialGradient":
      return <radialGradient key={key} {...props}>{children}</radialGradient>;
    case "stop":
      return <stop key={key} {...props} />;
    case "image":
      return <image key={key} {...props} />;
    default:
      return <g key={key} {...props}>{children}</g>;
  }
}

export function stateIconSvgSourceToReactNodes(source: string, override?: StateIconSvgStyleOverride) {
  const parsed = parseStateIconSvgSource(source);
  if (!parsed) {
    return null;
  }
  return parsed.editableChildren.map((child, index) => stateIconSvgNodeToReact(child, `svg-node-${index}`, override));
}

export function createEditableStateIconElementsFromSvgSource(
  source: string,
  fileName: string,
  options: { preserveImportedSvg?: boolean } = {}
) {
  if (options.preserveImportedSvg) {
    return [createImportedStateIconElement("imported-svg", stateIconSvgElementSource(source) || source, fileName)];
  }
  const parsed = parseStateIconSvgSource(source);
  if (!parsed) {
    const generatedElements = createStateIconDrawingElementsFromGeneratedSvgSource(source, fileName);
    if (generatedElements) {
      return generatedElements;
    }
    return stateIconDrawingSourceHasGeneratedFrameMarkup(source)
      ? []
      : [createImportedStateIconElement("imported-svg", stateIconSvgElementSource(source) || source, fileName)];
  }
  const editableChildren = parsed.editableChildren.filter((child) =>
    child.getAttribute("data-state-icon-frame") !== "true" &&
    child.getAttribute("data-state-icon-frame-image") !== "true" &&
    child.getAttribute("data-state-icon-frame-border") !== "true"
  );
  const generatedElements = editableChildren.map((child, index) =>
    createStateIconDrawingElementFromGeneratedGroupMarkup(child.outerHTML, `${fileName || "SVG"}-${index + 1}`)
  );
  const importedElementFromGeneratedChild = (child: Element, index: number) => ({
    ...createImportedStateIconElement(
      "imported-svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeXml(parsed.viewBox)}">${parsed.supportMarkup}${child.outerHTML}</svg>`,
      `${fileName || "SVG"}-${index + 1}`
    ),
    ...stateIconDrawingTerminalOwnershipFromMarkup(child.outerHTML)
  });
  if (editableChildren.length === 0) {
    return [];
  }
  if (generatedElements.some(Boolean)) {
    return editableChildren.map((child, index) =>
      generatedElements[index] ?? importedElementFromGeneratedChild(child, index)
    );
  }
  if (editableChildren.length <= 1) {
    const child = editableChildren[0];
    return [{
      ...createImportedStateIconElement("imported-svg", stateIconSvgElementSource(source) || source, fileName),
      ...(child ? stateIconDrawingTerminalOwnershipFromMarkup(child.outerHTML) : {})
    }];
  }
  return editableChildren.map((child, index) =>
    importedElementFromGeneratedChild(child, index)
  );
}

export function createStateIconDrawingInitialElements(
  row: DeviceDefinitionStateDraftRow | null | undefined,
  assets: Record<string, string>
) {
  const visual = stateVisualFromDraftRow(row);
  if (visual?.imageCleared) {
    return [];
  }
  const imageHref = resolveStateVisualImageHref(visual, assets).trim();
  if (imageHref) {
    const svgSource = svgSourceFromDataUrl(imageHref);
    return svgSource
      ? createEditableStateIconElementsFromSvgSource(svgSource, row?.name.trim() || "原始图标")
      : [createImportedStateIconElement("image", imageHref, row?.name.trim() || "原始图标")];
  }
  return [createStateIconDrawingElement("line", row), createStateIconDrawingElement("text", row)];
}

function stateIconDrawingFrameMarkupTag(source: string) {
  return /<rect\b(?=[^>]*\bdata-state-icon-frame\s*=\s*(?:"true"|'true'|true))[^>]*>/iu.exec(source)?.[0] ?? "";
}

function stateIconDrawingFrameImageMarkupTag(source: string) {
  return /<(?:image|rect)\b(?=[^>]*\bdata-state-icon-frame-image\s*=\s*(?:"true"|'true'|true))[^>]*>/iu.exec(source)?.[0] ?? "";
}

function stateIconDrawingFrameBorderMarkupTag(source: string) {
  return /<rect\b(?=[^>]*\bdata-state-icon-frame-border\s*=\s*(?:"true"|'true'|true))[^>]*>/iu.exec(source)?.[0] ?? "";
}

function stateIconDrawingSourceHasGeneratedFrameMarkup(source: string) {
  return Boolean(
    stateIconDrawingFrameMarkupTag(source) ||
    stateIconDrawingFrameImageMarkupTag(source) ||
    stateIconDrawingFrameBorderMarkupTag(source)
  );
}

export function stateIconDrawingInitialFrame(
  row: DeviceDefinitionStateDraftRow | null | undefined,
  assets: Record<string, string>,
  fallback: StateIconDrawingFrame
): StateIconDrawingFrame {
  const fallbackFrame = { ...fallback };
  const visual = stateVisualFromDraftRow(row);
  if (visual?.imageCleared) {
    return fallbackFrame;
  }
  const imageHref = resolveStateVisualImageHref(visual, assets).trim();
  const svgSource = imageHref ? svgSourceFromDataUrl(imageHref) : "";
  if (!svgSource) {
    return fallbackFrame;
  }
  const frameMarkup = stateIconDrawingFrameMarkupTag(svgSource);
  if (!frameMarkup) {
    return fallbackFrame;
  }
  const frameImageMarkup = stateIconDrawingFrameImageMarkupTag(svgSource);
  const frameBackgroundImageAssetId = readSvgMarkupAttribute(frameImageMarkup, "data-state-icon-frame-image-asset-id").trim();
  const frameBackgroundImageHref = (
    readSvgMarkupAttribute(frameImageMarkup, "href") ||
    readSvgMarkupAttribute(frameImageMarkup, "data-state-icon-frame-image-href")
  ).trim();
  const frameBackgroundImageFit = normalizeImageFitMode(readSvgMarkupAttribute(frameImageMarkup, "data-state-icon-frame-image-fit"));
  const frameBackgroundImage = frameBackgroundImageAssetId
    ? assets[frameBackgroundImageAssetId] || frameBackgroundImageHref || `/webgrp/images/${frameBackgroundImageAssetId}`
    : frameBackgroundImageHref;
  return {
    strokeStyle: stateIconDrawingStrokeStyleFromMarkup(frameMarkup) ?? fallbackFrame.strokeStyle,
    strokeWidth: Math.max(0, readSvgMarkupNumber(frameMarkup, "stroke-width", fallbackFrame.strokeWidth)),
    strokeColor: readSvgMarkupAttribute(frameMarkup, "stroke").trim() || fallbackFrame.strokeColor,
    fillColor: readSvgMarkupAttribute(frameMarkup, "fill").trim() || fallbackFrame.fillColor,
    ...(frameBackgroundImage ? { backgroundImage: frameBackgroundImage } : {}),
    ...(frameBackgroundImageAssetId ? { backgroundImageAssetId: frameBackgroundImageAssetId } : {}),
    ...(frameBackgroundImageFit !== "cover" ? { backgroundImageFit: frameBackgroundImageFit } : {})
  };
}

export function svgSourceToDataUrl(source?: string) {
  const svg = String(source ?? "").trim();
  return svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : "";
}

export function stateIconDrawingSvgElementMarkup(
  source: string,
  x: number,
  y: number,
  width: number,
  height: number,
  override?: StateIconSvgStyleOverride
) {
  const parsed = parseStateIconSvgSource(source);
  const preserveViewBoxMarkup = stateIconSvgPreserveViewBoxMarkup(source);
  if (!parsed || !parsed.body) {
    const fallback = stateIconSvgFallbackParts(source);
    if (fallback?.body) {
      const styleOverride = stateIconSvgStyleOverrideMarkup(override);
      return `<svg x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}"${preserveViewBoxMarkup} viewBox="${escapeXml(fallback.viewBox)}" preserveAspectRatio="none">${fallback.body}${styleOverride}</svg>`;
    }
    const href = svgSourceToDataUrl(source);
    return href
      ? `<image href="${escapeXml(href)}" x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" preserveAspectRatio="none"/>`
      : "";
  }
  const styleOverride = stateIconSvgStyleOverrideMarkup(override);
  return `<svg x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}"${preserveViewBoxMarkup} viewBox="${escapeXml(stateIconSvgRenderViewBox(source))}" preserveAspectRatio="none">${parsed.body}${styleOverride}</svg>`;
}

export function stateIconDrawingElementMarkup(
  element: StateIconDrawingElement,
  options: StateIconDrawingToImageOptions = {}
) {
  const stroke = escapeXml(element.strokeColor || "#2563eb");
  const fill = escapeXml(element.fillColor || "transparent");
  const textFill = escapeXml(element.textColor || element.strokeColor || "#111827");
  const sw = formatSvgNumber(Math.max(0, element.strokeWidth));
  const dashArray = stateIconStrokeDashArray(element.strokeStyle, Math.max(0, element.strokeWidth));
  const dashAttr = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
  const w = Math.max(1, element.width);
  const h = Math.max(1, element.height);
  const hw = w / 2;
  const hh = h / 2;
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dashAttr} vector-effect="non-scaling-stroke"`;
  const lineCapDefs = stateIconLineCapMarkerDefs(element, stroke);
  const lineCapAttrs = stateIconLineCapMarkerAttrs(element);
  let body = "";
  switch (element.kind) {
    case "imported-svg": {
      body = stateIconDrawingSvgElementMarkup(element.svgSource ?? "", -hw, -hh, w, h, {
        stroke,
        strokeWidth: Math.max(0, element.strokeWidth),
        dashArray,
        strokeColorEdited: element.strokeColorEdited === true,
        strokeStyleEdited: element.strokeStyleEdited === true
      });
      break;
    }
    case "image": {
      const rawHref = element.imageHref || "";
      const href = rawHref ? (options.resolveImageHref?.(rawHref) || rawHref) : "";
      const clipId = `clip-${element.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      const scale = Math.max(0.05, element.imageScale ?? 1);
      const imageFit = normalizeImageFitMode(element.imageFit);
      const useRawFrame = imageFit === "fixed" || imageFit === "stretch" || imageFit === "tile";
      const fitAttr = imageFit === "cover" ? "" : ` data-state-icon-image-fit="${escapeXml(imageFit)}"`;
      body = href
        ? `<defs><clipPath id="${escapeXml(clipId)}"><rect x="${formatSvgNumber(-hw)}" y="${formatSvgNumber(-hh)}" width="${formatSvgNumber(w)}" height="${formatSvgNumber(h)}"/></clipPath></defs>${svgImageContentMarkup(href, {
            x: useRawFrame ? -hw : -hw + (element.cropX ?? 0),
            y: useRawFrame ? -hh : -hh + (element.cropY ?? 0),
            width: useRawFrame ? w : w * scale,
            height: useRawFrame ? h : h * scale,
            imageFit,
            clipPath: `url(#${escapeXml(clipId)})`,
            extraAttributes: fitAttr
          })}`
        : "";
      break;
    }
    case "switch-open":
      body = `<circle cx="${formatSvgNumber(-hw * 0.46)}" cy="0" r="${formatSvgNumber(Math.min(w, h) * 0.12)}" fill="#fff" stroke="${stroke}" stroke-width="${sw}"/><circle cx="${formatSvgNumber(hw * 0.46)}" cy="0" r="${formatSvgNumber(Math.min(w, h) * 0.12)}" fill="#fff" stroke="${stroke}" stroke-width="${sw}"/><path d="M ${formatSvgNumber(-hw)} 0 H ${formatSvgNumber(-hw * 0.62)} M ${formatSvgNumber(-hw * 0.3)} ${formatSvgNumber(-h * 0.08)} L ${formatSvgNumber(hw * 0.3)} ${formatSvgNumber(-hh)} M ${formatSvgNumber(hw * 0.62)} 0 H ${formatSvgNumber(hw)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
      break;
    case "switch-closed":
      body = `<circle cx="${formatSvgNumber(-hw * 0.46)}" cy="0" r="${formatSvgNumber(Math.min(w, h) * 0.12)}" fill="#fff" stroke="${stroke}" stroke-width="${sw}"/><circle cx="${formatSvgNumber(hw * 0.46)}" cy="0" r="${formatSvgNumber(Math.min(w, h) * 0.12)}" fill="#fff" stroke="${stroke}" stroke-width="${sw}"/><path d="M ${formatSvgNumber(-hw)} 0 H ${formatSvgNumber(hw)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
      break;
    case "valve-open":
      body = `<path d="M ${formatSvgNumber(-hw)} ${formatSvgNumber(-hh)} L 0 0 L ${formatSvgNumber(-hw)} ${formatSvgNumber(hh)} Z M ${formatSvgNumber(hw)} ${formatSvgNumber(-hh)} L 0 0 L ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} Z" ${common}/><path d="M 0 ${formatSvgNumber(-hh * 1.15)} V ${formatSvgNumber(hh * 1.15)} M ${formatSvgNumber(-hw * 0.35)} ${formatSvgNumber(-hh * 1.15)} H ${formatSvgNumber(hw * 0.35)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
      break;
    case "valve-closed":
      body = `<path d="M ${formatSvgNumber(-hw)} ${formatSvgNumber(-hh)} L 0 0 L ${formatSvgNumber(-hw)} ${formatSvgNumber(hh)} Z M ${formatSvgNumber(hw)} ${formatSvgNumber(-hh)} L 0 0 L ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} Z" ${common}/><path d="M ${formatSvgNumber(-hw * 0.55)} ${formatSvgNumber(-hh * 0.9)} L ${formatSvgNumber(hw * 0.55)} ${formatSvgNumber(hh * 0.9)} M ${formatSvgNumber(hw * 0.55)} ${formatSvgNumber(-hh * 0.9)} L ${formatSvgNumber(-hw * 0.55)} ${formatSvgNumber(hh * 0.9)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
      break;
    case "line":
      body = `${lineCapDefs}<path d="M ${formatSvgNumber(-hw)} 0 H ${formatSvgNumber(hw)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dashAttr}${lineCapAttrs ? ` ${lineCapAttrs}` : ""}/>`;
      break;
    case "polyline":
      body = `${lineCapDefs}<path d="${stateIconPolylinePathData(stateIconPolylineLocalPoints(element, w, h))}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${lineCapAttrs ? ` ${lineCapAttrs}` : ""}/>`;
      break;
    case "point":
      body = `<circle cx="0" cy="0" r="${formatSvgNumber(Math.min(w, h) / 2)}" fill="${stroke}"/>`;
      break;
    case "triangle":
      body = `<path d="M 0 ${formatSvgNumber(-hh)} L ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} H ${formatSvgNumber(-hw)} Z" ${common}/>`;
      break;
    case "rectangle":
      body = `<rect x="${formatSvgNumber(-hw)}" y="${formatSvgNumber(-hh)}" width="${formatSvgNumber(w)}" height="${formatSvgNumber(h)}" rx="2" ${common}/>`;
      break;
    case "square":
      body = `<rect x="${formatSvgNumber(-hw)}" y="${formatSvgNumber(-hh)}" width="${formatSvgNumber(w)}" height="${formatSvgNumber(h)}" rx="2" ${common}/>`;
      break;
    case "hexagon":
      body = `<path d="M ${formatSvgNumber(-hw * 0.5)} ${formatSvgNumber(-hh)} H ${formatSvgNumber(hw * 0.5)} L ${formatSvgNumber(hw)} 0 L ${formatSvgNumber(hw * 0.5)} ${formatSvgNumber(hh)} H ${formatSvgNumber(-hw * 0.5)} L ${formatSvgNumber(-hw)} 0 Z" ${common}/>`;
      break;
    case "polygon":
      body = `<path d="M 0 ${formatSvgNumber(-hh)} L ${formatSvgNumber(hw * 0.36)} ${formatSvgNumber(-hh * 0.36)} L ${formatSvgNumber(hw)} ${formatSvgNumber(-hh * 0.25)} L ${formatSvgNumber(hw * 0.52)} ${formatSvgNumber(hh * 0.2)} L ${formatSvgNumber(hw * 0.62)} ${formatSvgNumber(hh)} L 0 ${formatSvgNumber(hh * 0.58)} L ${formatSvgNumber(-hw * 0.62)} ${formatSvgNumber(hh)} L ${formatSvgNumber(-hw * 0.52)} ${formatSvgNumber(hh * 0.2)} L ${formatSvgNumber(-hw)} ${formatSvgNumber(-hh * 0.25)} L ${formatSvgNumber(-hw * 0.36)} ${formatSvgNumber(-hh * 0.36)} Z" ${common}/>`;
      break;
    case "circle":
      body = `<circle cx="0" cy="0" r="${formatSvgNumber(Math.min(w, h) / 2)}" ${common}/>`;
      break;
    case "semicircle":
      if (lineCapAttrs) {
        body = `${lineCapDefs}${isTransparentStateIconColor(element.fillColor) ? "" : `<path d="M ${formatSvgNumber(-hw)} ${formatSvgNumber(hh)} A ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} 0 0 1 ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} Z" fill="${fill}" stroke="none"/>`}<path d="M ${formatSvgNumber(-hw)} ${formatSvgNumber(hh)} A ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} 0 0 1 ${formatSvgNumber(hw)} ${formatSvgNumber(hh)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dashAttr} ${lineCapAttrs}/>`;
      } else {
        body = `<path d="M ${formatSvgNumber(-hw)} ${formatSvgNumber(hh)} A ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} 0 0 1 ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} Z" ${common}/>`;
      }
      break;
    case "ellipse":
      body = `<ellipse cx="0" cy="0" rx="${formatSvgNumber(hw)}" ry="${formatSvgNumber(hh)}" ${common}/>`;
      break;
    case "arc":
      body = `${lineCapDefs}<path d="M ${formatSvgNumber(-hw)} ${formatSvgNumber(hh * 0.6)} A ${formatSvgNumber(hw)} ${formatSvgNumber(hh)} 0 0 1 ${formatSvgNumber(hw)} ${formatSvgNumber(hh * 0.6)}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dashAttr}${lineCapAttrs ? ` ${lineCapAttrs}` : ""}/>`;
      break;
    case "text":
      body = `${isTransparentStateIconColor(element.fillColor) ? "" : `<rect x="${formatSvgNumber(-hw)}" y="${formatSvgNumber(-hh)}" width="${formatSvgNumber(w)}" height="${formatSvgNumber(h)}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dashAttr}/>`}<text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(element.fontFamily || "Arial, Microsoft YaHei")}" font-size="${formatSvgNumber(Math.max(8, element.fontSize ?? h))}" font-weight="${escapeXml(element.fontWeight || "800")}" font-style="${escapeXml(element.fontStyle || "normal")}" fill="${textFill}">${escapeXml(element.text || "文字")}</text>`;
      break;
    default:
      body = `<circle cx="0" cy="0" r="${formatSvgNumber(Math.min(w, h) / 2)}" ${common}/>`;
      break;
  }
  const terminalAttr = Number.isInteger(element.terminalIndex) && (element.terminalIndex ?? -1) >= 0
    ? ` data-terminal-index="${formatSvgNumber(element.terminalIndex ?? 0)}"`
    : "";
  const polylinePoints = element.kind === "polyline" ? normalizedStateIconPolylinePoints(element) : null;
  const polylineAttr = polylinePoints
    ? ` data-polyline-points="${escapeXml(stateIconPolylinePointsAttribute(polylinePoints))}" data-polyline-width="${formatSvgNumber(w)}" data-polyline-height="${formatSvgNumber(h)}" data-start-cap="${escapeXml(normalizeStateIconLineCapKind(element.startCap))}" data-end-cap="${escapeXml(normalizeStateIconLineCapKind(element.endCap))}"`
    : "";
  return `<g${terminalAttr}${polylineAttr} transform="translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})">${body}</g>`;
}

export function stateIconDrawingToImage(
  elements: readonly StateIconDrawingElement[],
  options: StateIconDrawingToImageOptions = {}
) {
  const frameMarkup = stateIconDrawingFrameMarkup(options.frame, options.frameHasTerminals === true, options);
  const body = elements.map((element) => stateIconDrawingElementMarkup(element, options)).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-state-icon-drawing="true" width="240" height="160" viewBox="0 0 240 160">${frameMarkup}${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeStateIconFrameText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeStateIconFrameNumber(value: unknown) {
  return Math.max(0, Number(value) || 0);
}

export function stateIconDrawingFrameHasPersistedContent(
  frame: Partial<StateIconDrawingFrame> | undefined,
  fallbackFrame: StateIconDrawingFrame = DEFAULT_STATE_ICON_DRAWING_FRAME
) {
  if (!frame) {
    return false;
  }
  const mergedFrame = { ...fallbackFrame, ...frame };
  return Boolean(
    normalizeStateIconFrameText(mergedFrame.backgroundImage) ||
    normalizeStateIconFrameText(mergedFrame.backgroundImageAssetId) ||
    normalizeStateIconFrameText(mergedFrame.fillColor) !== normalizeStateIconFrameText(fallbackFrame.fillColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeColor) !== normalizeStateIconFrameText(fallbackFrame.strokeColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeStyle) !== normalizeStateIconFrameText(fallbackFrame.strokeStyle) ||
    normalizeStateIconFrameNumber(mergedFrame.strokeWidth) !== normalizeStateIconFrameNumber(fallbackFrame.strokeWidth)
  );
}

export function stateIconDrawingToPersistedImage(
  elements: readonly StateIconDrawingElement[],
  options: StateIconDrawingToImageOptions = {}
) {
  return elements.length > 0 || stateIconDrawingFrameHasPersistedContent(options.frame)
    ? stateIconDrawingToImage(elements, options)
    : "";
}

export function stateIconDrawingPreviewNeedsDirectElementRender(elements: readonly StateIconDrawingElement[]) {
  return elements.some((element) =>
    element.kind === "imported-svg" ||
    (element.kind === "image" && String(element.imageHref ?? "").trim())
  );
}

export function stateIconDrawingElementPreviewImage(element: StateIconDrawingElement) {
  const w = Math.max(1, element.width);
  const h = Math.max(1, element.height);
  const padding = Math.max(18, Math.max(0, element.strokeWidth) * 3);
  const previewElement = {
    ...element,
    x: padding + w / 2,
    y: padding + h / 2,
    rotation: 0
  };
  const svgWidth = w + padding * 2;
  const svgHeight = h + padding * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${formatSvgNumber(svgWidth)}" height="${formatSvgNumber(svgHeight)}" viewBox="0 0 ${formatSvgNumber(svgWidth)} ${formatSvgNumber(svgHeight)}">${stateIconDrawingElementMarkup(previewElement)}</svg>`;
  return {
    href: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    x: -w / 2 - padding,
    y: -h / 2 - padding,
    width: svgWidth,
    height: svgHeight
  };
}

export function stateIconDrawingElementPreviewNode(
  element: StateIconDrawingElement,
  options: { onImageLoad?: (element: StateIconDrawingElement, event: any) => void } = {}
) {
  const stroke = element.strokeColor || "#2563eb";
  const fill = element.fillColor || "transparent";
  const textFill = element.textColor || element.strokeColor || "#111827";
  const sw = Math.max(0, element.strokeWidth);
  const w = Math.max(1, element.width);
  const h = Math.max(1, element.height);
  const hw = w / 2;
  const hh = h / 2;
  const dashArray = stateIconStrokeDashArray(element.strokeStyle, sw);
  const startCap = normalizeStateIconLineCapKind(element.startCap);
  const endCap = normalizeStateIconLineCapKind(element.endCap);
  const startMarkerId = stateIconLineCapMarkerId(element.id, "start", startCap);
  const endMarkerId = stateIconLineCapMarkerId(element.id, "end", endCap);
  const lineMarkerProps = {
    markerStart: startCap !== "none" ? `url(#${startMarkerId})` : undefined,
    markerEnd: endCap !== "none" ? `url(#${endMarkerId})` : undefined
  };
  const lineStrokeProps = {
    fill: "none",
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashArray || undefined,
    ...lineMarkerProps
  };
  const renderLineCapMarker = (position: "start" | "end", cap: StateIconLineCapKind) => {
    if (cap === "none") {
      return null;
    }
    const markerId = position === "start" ? startMarkerId : endMarkerId;
    if (cap === "arrow") {
      return (
        <marker key={markerId} id={markerId} viewBox="-6 -6 12 12" refX={5} refY={0} markerWidth={7} markerHeight={7} orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M -4 -4 L 5 0 L -4 4 Z" fill={stroke} />
        </marker>
      );
    }
    if (cap === "circle") {
      return (
        <marker key={markerId} id={markerId} viewBox="-5 -5 10 10" refX={0} refY={0} markerWidth={6} markerHeight={6} orient="auto" markerUnits="strokeWidth">
          <circle cx={0} cy={0} r={3.2} fill={stroke} />
        </marker>
      );
    }
    if (cap === "triangle") {
      return (
        <marker key={markerId} id={markerId} viewBox="-5 -5 10 10" refX={0} refY={0} markerWidth={6} markerHeight={6} orient="auto" markerUnits="strokeWidth">
          <path d="M 0 -4 L 4 4 L -4 4 Z" fill={stroke} />
        </marker>
      );
    }
    return (
      <marker key={markerId} id={markerId} viewBox="-5 -5 10 10" refX={0} refY={0} markerWidth={6} markerHeight={6} orient="auto" markerUnits="strokeWidth">
        <rect x={-3.4} y={-3.4} width={6.8} height={6.8} fill={stroke} />
      </marker>
    );
  };
  const lineCapMarkers = startCap !== "none" || endCap !== "none"
    ? <defs>{renderLineCapMarker("start", startCap)}{renderLineCapMarker("end", endCap)}</defs>
    : null;
  const common = {
    fill,
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashArray || undefined,
    vectorEffect: "non-scaling-stroke" as const
  };
  switch (element.kind) {
    case "imported-svg": {
      const parsed = parseStateIconSvgSource(element.svgSource ?? "");
      if (!parsed || !parsed.body) {
        const href = svgSourceToDataUrl(element.svgSource);
        return href ? <image href={href} x={-hw} y={-hh} width={w} height={h} preserveAspectRatio="none" /> : null;
      }
      const override = {
        stroke,
        strokeWidth: sw,
        dashArray,
        strokeColorEdited: element.strokeColorEdited === true,
        strokeStyleEdited: element.strokeStyleEdited === true
      };
      const nodes = stateIconSvgSourceToReactNodes(element.svgSource ?? "", override);
      return (
        <svg
          x={-hw}
          y={-hh}
          width={w}
          height={h}
          viewBox={stateIconSvgRenderViewBox(element.svgSource ?? "")}
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        >
          {nodes}
        </svg>
      );
    }
    case "image": {
      const href = element.imageHref || "";
      const clipId = `preview-clip-${element.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      const scale = Math.max(0.05, element.imageScale ?? 1);
      const imageFit = normalizeImageFitMode(element.imageFit);
      const useRawFrame = imageFit === "fixed" || imageFit === "stretch" || imageFit === "tile";
      const tilePatternId = `preview-pattern-${element.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      const imageX = useRawFrame ? -hw : -hw + (element.cropX ?? 0);
      const imageY = useRawFrame ? -hh : -hh + (element.cropY ?? 0);
      const imageWidth = useRawFrame ? w : w * scale;
      const imageHeight = useRawFrame ? h : h * scale;
      return href ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x={-hw} y={-hh} width={w} height={h} />
            </clipPath>
            {imageFit === "tile" && (
              <pattern id={tilePatternId} x={-hw} y={-hh} width={Math.min(w, 96)} height={Math.min(h, 96)} patternUnits="userSpaceOnUse">
                <image href={href} x={0} y={0} width={Math.min(w, 96)} height={Math.min(h, 96)} preserveAspectRatio={imageFitPreserveAspectRatio("fixed")} />
              </pattern>
            )}
          </defs>
          {imageFit === "tile" ? (
            <rect x={-hw} y={-hh} width={w} height={h} fill={`url(#${tilePatternId})`} clipPath={`url(#${clipId})`} />
          ) : (
            <image
              href={href}
              x={imageX}
              y={imageY}
              width={imageWidth}
              height={imageHeight}
              preserveAspectRatio={imageFitPreserveAspectRatio(imageFit)}
              clipPath={`url(#${clipId})`}
              onLoad={(event) => options.onImageLoad?.(element, event)}
            />
          )}
        </>
      ) : null;
    }
    case "switch-open":
      return (
        <>
          <circle cx={-hw * 0.46} cy={0} r={Math.min(w, h) * 0.12} fill="#fff" stroke={stroke} strokeWidth={sw} />
          <circle cx={hw * 0.46} cy={0} r={Math.min(w, h) * 0.12} fill="#fff" stroke={stroke} strokeWidth={sw} />
          <path d={`M ${-hw} 0 H ${-hw * 0.62} M ${-hw * 0.3} ${-h * 0.08} L ${hw * 0.3} ${-hh} M ${hw * 0.62} 0 H ${hw}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    case "switch-closed":
      return (
        <>
          <circle cx={-hw * 0.46} cy={0} r={Math.min(w, h) * 0.12} fill="#fff" stroke={stroke} strokeWidth={sw} />
          <circle cx={hw * 0.46} cy={0} r={Math.min(w, h) * 0.12} fill="#fff" stroke={stroke} strokeWidth={sw} />
          <path d={`M ${-hw} 0 H ${hw}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    case "valve-open":
      return (
        <>
          <path d={`M ${-hw} ${-hh} L 0 0 L ${-hw} ${hh} Z M ${hw} ${-hh} L 0 0 L ${hw} ${hh} Z`} {...common} />
          <path d={`M 0 ${-hh * 1.15} V ${hh * 1.15} M ${-hw * 0.35} ${-hh * 1.15} H ${hw * 0.35}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    case "valve-closed":
      return (
        <>
          <path d={`M ${-hw} ${-hh} L 0 0 L ${-hw} ${hh} Z M ${hw} ${-hh} L 0 0 L ${hw} ${hh} Z`} {...common} />
          <path d={`M ${-hw * 0.55} ${-hh * 0.9} L ${hw * 0.55} ${hh * 0.9} M ${hw * 0.55} ${-hh * 0.9} L ${-hw * 0.55} ${hh * 0.9}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    case "line":
      return <>{lineCapMarkers}<path d={`M ${-hw} 0 H ${hw}`} {...lineStrokeProps} /></>;
    case "polyline":
      return <>{lineCapMarkers}<path d={stateIconPolylinePathData(stateIconPolylineLocalPoints(element, w, h))} {...lineStrokeProps} /></>;
    case "point":
      return <circle cx={0} cy={0} r={Math.min(w, h) / 2} fill={stroke} />;
    case "triangle":
      return <path d={`M 0 ${-hh} L ${hw} ${hh} H ${-hw} Z`} {...common} />;
    case "rectangle":
      return <rect x={-hw} y={-hh} width={w} height={h} rx={2} {...common} />;
    case "square":
      return <rect x={-hw} y={-hh} width={w} height={h} rx={2} {...common} />;
    case "hexagon":
      return <path d={`M ${-hw * 0.5} ${-hh} H ${hw * 0.5} L ${hw} 0 L ${hw * 0.5} ${hh} H ${-hw * 0.5} L ${-hw} 0 Z`} {...common} />;
    case "polygon":
      return <path d={`M 0 ${-hh} L ${hw * 0.36} ${-hh * 0.36} L ${hw} ${-hh * 0.25} L ${hw * 0.52} ${hh * 0.2} L ${hw * 0.62} ${hh} L 0 ${hh * 0.58} L ${-hw * 0.62} ${hh} L ${-hw * 0.52} ${hh * 0.2} L ${-hw} ${-hh * 0.25} L ${-hw * 0.36} ${-hh * 0.36} Z`} {...common} />;
    case "circle":
      return <circle cx={0} cy={0} r={Math.min(w, h) / 2} {...common} />;
    case "semicircle":
      return startCap !== "none" || endCap !== "none" ? (
        <>
          {lineCapMarkers}
          {!isTransparentStateIconColor(element.fillColor) && <path d={`M ${-hw} ${hh} A ${hw} ${hh} 0 0 1 ${hw} ${hh} Z`} fill={fill} stroke="none" />}
          <path d={`M ${-hw} ${hh} A ${hw} ${hh} 0 0 1 ${hw} ${hh}`} {...lineStrokeProps} />
        </>
      ) : <path d={`M ${-hw} ${hh} A ${hw} ${hh} 0 0 1 ${hw} ${hh} Z`} {...common} />;
    case "ellipse":
      return <ellipse cx={0} cy={0} rx={hw} ry={hh} {...common} />;
    case "arc":
      return <>{lineCapMarkers}<path d={`M ${-hw} ${hh * 0.6} A ${hw} ${hh} 0 0 1 ${hw} ${hh * 0.6}`} {...lineStrokeProps} /></>;
    case "text":
      return (
        <>
          {!isTransparentStateIconColor(element.fillColor) && <rect x={-hw} y={-hh} width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dashArray || undefined} />}
          <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontFamily={element.fontFamily || "Arial, Microsoft YaHei"} fontSize={Math.max(8, element.fontSize ?? h)} fontWeight={element.fontWeight || 800} fontStyle={element.fontStyle || "normal"} fill={textFill}>
            {element.text || "文字"}
          </text>
        </>
      );
    default:
      return <circle cx={0} cy={0} r={Math.min(w, h) / 2} {...common} />;
  }
}
