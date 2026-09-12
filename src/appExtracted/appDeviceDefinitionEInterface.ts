// @ts-nocheck
import { DEFAULT_STATE_ICON_DRAWING_FRAME } from "../stateIconDrawing";

export * from "../export/e-file";
export const STATE_ICON_DRAFT_FRAME = DEFAULT_STATE_ICON_DRAWING_FRAME;

function normalizeStateIconFrameText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeStateIconFrameNumber(value: unknown) {
  return Math.max(0, Number(value) || 0);
}

export function stateIconDrawingFrameHasPersistedContent(frame: any) {
  if (!frame) {
    return false;
  }
  const mergedFrame = { ...STATE_ICON_DRAFT_FRAME, ...frame };
  return Boolean(
    normalizeStateIconFrameText(mergedFrame.backgroundImage) ||
    normalizeStateIconFrameText(mergedFrame.backgroundImageAssetId) ||
    normalizeStateIconFrameText(mergedFrame.fillColor) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.fillColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeColor) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.strokeColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeStyle) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.strokeStyle) ||
    normalizeStateIconFrameNumber(mergedFrame.strokeWidth) !== normalizeStateIconFrameNumber(STATE_ICON_DRAFT_FRAME.strokeWidth)
  );
}

export const STATE_ICON_LINE_SHAPE_KINDS = new Set(["line", "polyline", "arc", "semicircle"]);
export const STATE_ICON_CLOSED_SHAPE_KINDS = new Set(["point", "triangle", "rectangle", "square", "hexagon", "polygon", "circle", "semicircle", "ellipse", "text"]);
export const STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER = [
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape",
  "StaticMediaSymbol",
  "StaticFlowNode",
  "StaticContainerSymbol",
  "StaticAnnotationSymbol",
  "StaticButton"
];
export const STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS = new Set([
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape"
]);
export const STATE_ICON_DRAWING_FRAME_WIDTH = 240;
export const STATE_ICON_DRAWING_FRAME_HEIGHT = 160;
