/**
 * 状态图标画板编辑工厂与几何吸附辅助模块。
 * 从 appDeviceDefinitionFactories.tsx 拆分，保持严格 TypeScript 类型检查。
 */

import type { StateIconDrawingScope } from "./appScopeTypes";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from "react";
import {
  STATE_ICON_DRAFT_FRAME,
  STATE_ICON_DRAWING_FRAME_WIDTH,
  STATE_ICON_DRAWING_FRAME_HEIGHT,
  stateIconDrawingFrameHasPersistedContent,
} from "./appDeviceDefinitionEInterface";
import { switchingDeviceUsesClosedStatus, type Point } from "../model";
import { atLeastOneNumber, clampNumber } from "../canvasViewport";
import { type ImageAsset, type StateIconDrawingDragMode, type StateIconDrawingTarget } from "./appCoreCanvasUtilities";
import {
  stateIconDrawingFrameRect,
  stateIconSvgVisibleViewBox,
  type DeviceDefinitionStateDraftRow,
  type StateIconDrawingElement,
  type StateVisualShapeKind,
} from "../stateIconDrawing";

const STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];

const STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE = 3;

const STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING = 8;

export const STATE_ICON_DRAWING_MIN_FONT_SIZE = 8;

const STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND: Record<string, StateVisualShapeKind> = {
  "static-text": "text",
  "static-line": "line",
  "static-straight-connector": "line",
  "static-arrow-connector": "line",
  "static-double-arrow-connector": "line",
  "static-polyline": "polyline",
  "static-elbow-connector": "polyline",
  "static-circle": "circle",
  "static-ellipse": "ellipse",
  "static-rect": "rectangle",
  "static-point": "point",
  "static-ring": "point",
  "static-hexagon": "hexagon",
  "static-triangle": "triangle"
};

function stateIconBaseStaticTemplateKind(kind: string) {
  return String(kind ?? "").replace(/-vertical$/, "");
}

export function stateIconStaticTemplateParam(template: any, key: string, fallback = "") {
  return String(template?.params?.[key] ?? fallback ?? "").trim();
}

function stateIconStaticTemplateNumberParam(template: any, key: string, fallback: number) {
  const parsed = Number.parseFloat(stateIconStaticTemplateParam(template, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stateIconStaticTemplateStrokeStyle(template: any): "solid" | "dashed" | "dotted" {
  const value = stateIconStaticTemplateParam(template, "strokeStyle", "solid");
  return value === "dashed" || value === "dotted" ? value : "solid";
}

function stateIconLineCapFromStaticMarker(value: string | undefined | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "arrow") {
    return "arrow";
  }
  if (normalized === "dot" || normalized === "circle") {
    return "circle";
  }
  if (normalized === "triangle") {
    return "triangle";
  }
  if (normalized === "square" || normalized === "rect" || normalized === "rectangle") {
    return "square";
  }
  return "none";
}

export function createStateIconDrawingElementFromStaticTemplate(__appScope: StateIconDrawingScope, template: any, row?: any) {
  const {
    createImportedStateIconElement,
    createStateIconDrawingElement,
    svgSourceFromDataUrl
  } = __appScope;
  const renderTemplateDefaultStateIconImage = typeof __appScope.createTemplateDefaultStateIconImage === "function"
    ? __appScope.createTemplateDefaultStateIconImage
    : createTemplateDefaultStateIconImage;
  const baseKind = stateIconBaseStaticTemplateKind(template?.kind);
  const editableKind = STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND[baseKind];
  const size = template?.size ?? {};
  const templateWidth = atLeastOneNumber(size.width, 96);
  const templateHeight = atLeastOneNumber(size.height, 64);
  if (editableKind) {
    const base = createStateIconDrawingElement(editableKind, row);
    const text = stateIconStaticTemplateParam(template, "text", template?.label ?? base.text);
    const fillColor = stateIconStaticTemplateParam(template, "fillColor", base.fillColor);
    const strokeColor = stateIconStaticTemplateParam(template, "strokeColor", base.strokeColor);
    const textColor = stateIconStaticTemplateParam(template, "textColor", base.textColor);
    const element = {
      ...base,
      width: templateWidth,
      height: templateHeight,
      strokeWidth: Math.max(0, stateIconStaticTemplateNumberParam(template, "lineWidth", base.strokeWidth)),
      strokeColor: strokeColor || base.strokeColor,
      fillColor: fillColor || base.fillColor,
      textColor: textColor || base.textColor,
      text: text || template?.label || base.text,
      strokeStyle: stateIconStaticTemplateStrokeStyle(template),
      fontFamily: stateIconStaticTemplateParam(template, "fontFamily", base.fontFamily ?? "Arial, Microsoft YaHei"),
      fontSize: Math.max(1, stateIconStaticTemplateNumberParam(template, "fontSize", base.fontSize ?? 16)),
      fontWeight: stateIconStaticTemplateParam(template, "fontWeight", base.fontWeight ?? "400"),
      fontStyle: stateIconStaticTemplateParam(template, "fontStyle", base.fontStyle ?? "normal"),
      startCap: stateIconLineCapFromStaticMarker(stateIconStaticTemplateParam(template, "markerStart", base.startCap ?? "none")),
      endCap: stateIconLineCapFromStaticMarker(stateIconStaticTemplateParam(template, "markerEnd", base.endCap ?? "none"))
    };
    if (baseKind === "static-ring") {
      return {
        ...element,
        fillColor: "transparent",
        strokeWidth: Math.max(1, element.strokeWidth)
      };
    }
    return element;
  }
  const renderedImage = renderTemplateDefaultStateIconImage(__appScope, template, {
    size: { width: templateWidth, height: templateHeight },
    label: template?.label ?? ""
  });
  const svgSource = svgSourceFromDataUrl(renderedImage);
  return {
    ...createImportedStateIconElement(svgSource ? "imported-svg" : "image", svgSource || renderedImage, template?.label ?? template?.kind ?? "静态图元"),
    width: templateWidth,
    height: templateHeight,
    text: template?.label ?? template?.kind ?? "静态图元"
  };
}

function cloneStateIconDrawingElementSnapshot(element: any) {
  return {
    ...element,
    ...(Array.isArray(element?.points)
      ? { points: element.points.map((point: Point) => ({ ...point })) }
      : {})
  };
}

/**
 * 状态图标绘制弹窗的分组 token。
 *
 * 随机后缀的去向（追踪结论）：**只活在弹窗内存里，不进任何输出**，故保留 Math.random 不注入。
 * 它被写进 dialog elements 的 groupId，消费方只有弹窗内部的三类行为 ——
 * `expandStateIconDrawingElementIds` 的整组选中、`ungroupStateIconDrawingSelection` 的解组、
 * `cloneStateIconDrawingElements` 粘贴时的旧→新 groupId 重映射；
 * 渲染侧（appDeviceDefinitionRenderers）只用它做相等性判断与双击整组拖拽，
 * React key 用的是 element.id，groupId 从不进 DOM 属性或文本。
 *
 * 提交路径会把它丢掉：createApplyStateIconDrawingDialog 走 stateIconDrawingToImage 把 elements
 * 栅格化成 data URL，而 stateIconDrawing.tsx 全文没有一处 groupId（只读几何/样式），
 * 落盘的 stateIconDrawingInlineCanPersistDraft 也只比较那串图片。
 * ⇒ 不进节点 params、不进保存方案、不进 SVG/E 导出。
 */
export function stateIconDrawingGroupId() {
  return `state-icon-group-${Math.random().toString(36).slice(2, 9)}`;
}

export function expandStateIconDrawingElementIds(elements: readonly any[] = [], elementIds: readonly string[] = []) {
  const selectedSet = new Set(elementIds.filter(Boolean));
  if (selectedSet.size === 0) {
    return [];
  }
  if (elements.length === 0) {
    return Array.from(selectedSet);
  }
  const selectedGroupIds = new Set(
    elements
      .filter((element) => selectedSet.has(element.id) && String(element.groupId ?? "").trim())
      .map((element) => String(element.groupId).trim())
  );
  return elements
    .filter((element) => selectedSet.has(element.id) || selectedGroupIds.has(String(element.groupId ?? "").trim()))
    .map((element) => element.id);
}

export function stateIconDrawingSelectedIds(dialog: any) {
  const selectedIds = dialog?.selectedElementIds?.length > 0
    ? dialog.selectedElementIds
    : [dialog?.selectedElementId].filter(Boolean);
  return expandStateIconDrawingElementIds(dialog?.elements ?? [], selectedIds);
}

export function toggleStateIconDrawingElementSelection(
  elements: readonly any[],
  currentIds: readonly string[],
  elementId: string,
  append: boolean
) {
  const currentSelection = expandStateIconDrawingElementIds(elements, currentIds);
  const targetSelection = expandStateIconDrawingElementIds(elements, [elementId]);
  if (!append) {
    return targetSelection;
  }
  const currentSet = new Set(currentSelection);
  const targetIsSelected = targetSelection.every((id) => currentSet.has(id));
  if (targetIsSelected) {
    const targetSet = new Set(targetSelection);
    return currentSelection.filter((id) => !targetSet.has(id));
  }
  return Array.from(new Set([...currentSelection, ...targetSelection]));
}

export function groupStateIconDrawingSelection(current: any, historyRef: any, createGroupId = stateIconDrawingGroupId) {
  if (!current) {
    return current;
  }
  const selectedIds = stateIconDrawingSelectedIds(current);
  if (selectedIds.length < 2) {
    return current;
  }
  const selectedSet = new Set(selectedIds);
  const groupId = createGroupId();
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: current.elements.map((element: any) => selectedSet.has(element.id) ? { ...element, groupId } : element),
    selectedElementId: selectedIds[selectedIds.length - 1] ?? "",
    selectedElementIds: selectedIds
  };
}

export function ungroupStateIconDrawingSelection(current: any, historyRef: any) {
  if (!current) {
    return current;
  }
  const selectedIds = stateIconDrawingSelectedIds(current);
  const selectedSet = new Set(selectedIds);
  if (!current.elements.some((element: any) => selectedSet.has(element.id) && String(element.groupId ?? "").trim())) {
    return current;
  }
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: current.elements.map((element: any) => {
      if (!selectedSet.has(element.id) || !element.groupId) {
        return element;
      }
      const { groupId: _groupId, ...ungroupedElement } = element;
      return ungroupedElement;
    }),
    selectedElementId: selectedIds[selectedIds.length - 1] ?? "",
    selectedElementIds: selectedIds
  };
}

export function pushStateIconDrawingHistorySnapshot(historyRef: any, elements: any[]) {
  if (!historyRef) {
    return;
  }
  const snapshot = elements.map(cloneStateIconDrawingElementSnapshot);
  historyRef.current = [...(historyRef.current ?? []), snapshot].slice(-80);
}

export function cloneStateIconDrawingElements(
  elements: any[],
  createId: () => string,
  offset = { x: 12, y: 12 },
  createGroupId = stateIconDrawingGroupId
) {
  const pastedGroupIds = new Map<string, string>();
  return elements.map((element) => {
    const sourceGroupId = String(element.groupId ?? "").trim();
    if (sourceGroupId && !pastedGroupIds.has(sourceGroupId)) {
      pastedGroupIds.set(sourceGroupId, createGroupId());
    }
    return {
      ...cloneStateIconDrawingElementSnapshot(element),
      id: createId(),
      x: element.x + offset.x,
      y: element.y + offset.y,
      ...(sourceGroupId ? { groupId: pastedGroupIds.get(sourceGroupId) } : {})
    };
  });
}

export function normalizeStateIconDrawingFontSize(value: unknown, fallback: unknown = STATE_ICON_DRAWING_MIN_FONT_SIZE) {
  const fallbackNumber = Number(fallback);
  const fallbackSize = Number.isFinite(fallbackNumber)
    ? Math.max(STATE_ICON_DRAWING_MIN_FONT_SIZE, Math.floor(fallbackNumber))
    : STATE_ICON_DRAWING_MIN_FONT_SIZE;
  if (typeof value === "string" && value.trim() === "") {
    return fallbackSize;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackSize;
  }
  return Math.max(STATE_ICON_DRAWING_MIN_FONT_SIZE, Math.floor(parsed));
}

export function formatStateIconDrawingNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  const fallbackNumber = Number(fallback);
  const safeFallback = Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
  return (Number.isFinite(parsed) ? parsed : safeFallback).toFixed(2);
}

export function normalizeStateIconDrawingStrokeWidth(value: unknown, fallback = 0) {
  const parsed = Number(value);
  const fallbackNumber = Number(fallback);
  const safeFallback = Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.round(safeFallback));
  }
  return Math.max(0, Math.round(parsed));
}

export function cutStateIconDrawingSelection(current: any, clipboardRef: any, historyRef: any) {
  if (!current) {
    return current;
  }
  const selectedIds = stateIconDrawingSelectedIds(current);
  if (selectedIds.length === 0) {
    return current;
  }
  const selectedSet = new Set(selectedIds);
  clipboardRef.current = current.elements.filter((element: any) => selectedSet.has(element.id)).map(cloneStateIconDrawingElementSnapshot);
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: current.elements.filter((element: any) => !selectedSet.has(element.id)),
    selectedElementId: "",
    selectedElementIds: []
  };
}

export function stateIconDrawingElementBounds(element: any) {
  const width = atLeastOneNumber(element.width, 1);
  const height = atLeastOneNumber(element.height, 1);
  return {
    left: element.x - width / 2,
    right: element.x + width / 2,
    top: element.y - height / 2,
    bottom: element.y + height / 2,
    centerX: element.x,
    centerY: element.y,
    width,
    height
  };
}

export function stateIconDrawingSelectionBounds(elements: any[]) {
  if (elements.length === 0) {
    return null;
  }
  const bounds = elements.map(stateIconDrawingElementBounds);
  const left = Math.min(...bounds.map((item) => item.left));
  const right = Math.max(...bounds.map((item) => item.right));
  const top = Math.min(...bounds.map((item) => item.top));
  const bottom = Math.max(...bounds.map((item) => item.bottom));
  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}

function stateIconDrawingMovementVisibleFrame(element: any, visibleFrames: any) {
  const width = atLeastOneNumber(element.width, 1);
  const height = atLeastOneNumber(element.height, 1);
  let frame: any = null;
  if (element?.kind === "image") {
    const key = `${element.id}:${element.imageHref ?? ""}:${element.imageFit ?? "cover"}:${element.imageScale ?? 1}:${element.cropX ?? 0}:${element.cropY ?? 0}`;
    frame = visibleFrames?.image?.[key] ?? null;
  } else if (element?.kind === "imported-svg") {
    const key = `${element.id}:${element.svgSource ?? ""}:${element.strokeWidth}:${element.strokeColor ?? ""}:${element.strokeStyle ?? ""}`;
    frame = visibleFrames?.svg?.[key] ?? stateIconDrawingImportedSvgSelectionFrame(element);
  }
  // frame 与宽高同源（visibleFrames 缓存或 stateIconDrawingImportedSvgSelectionFrame），
  // x / y 缺失或非数值时，下面的角点会算出 NaN，Math.min/max 出来的边界盒整条都是 NaN，
  // 于是拖拽收敛成 NaN 位移。判定沿用本文件校验 viewBox 坐标四元组的同一写法
  // （`[...].every(Number.isFinite)`，见 stateIconDrawingImportedSvgSelectionFrame）：
  // 坐标只要求有限、不要求 > 0（合法的负坐标会被 `> 0` 误杀），失败时回退值与非法宽高完全一致。
  if (
    !frame ||
    !(Number(frame.width) > 0) ||
    !(Number(frame.height) > 0) ||
    ![frame.x, frame.y].every(Number.isFinite)
  ) {
    return { x: -width / 2, y: -height / 2, width, height };
  }
  const basisWidth = atLeastOneNumber(frame.basisWidth, width);
  const basisHeight = atLeastOneNumber(frame.basisHeight, height);
  const scaleX = width / basisWidth;
  const scaleY = height / basisHeight;
  return {
    x: Number(frame.x) * scaleX,
    y: Number(frame.y) * scaleY,
    width: Number(frame.width) * scaleX,
    height: Number(frame.height) * scaleY
  };
}

function stateIconDrawingMovementElementBounds(element: any, visibleFrames: any) {
  const frame = stateIconDrawingMovementVisibleFrame(element, visibleFrames);
  const rotation = (Number(element.rotation) || 0) * Math.PI / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width, y: frame.y },
    { x: frame.x, y: frame.y + frame.height },
    { x: frame.x + frame.width, y: frame.y + frame.height }
  ].map((point) => ({
    x: element.x + point.x * cos - point.y * sin,
    y: element.y + point.x * sin + point.y * cos
  }));
  return {
    left: Math.min(...corners.map((point) => point.x)),
    right: Math.max(...corners.map((point) => point.x)),
    top: Math.min(...corners.map((point) => point.y)),
    bottom: Math.max(...corners.map((point) => point.y))
  };
}

export function clampStateIconDrawingMovementDelta(elements: any[], delta: Point, frameRect: any, visibleFrames: any = {}) {
  if (elements.length === 0) {
    return { x: 0, y: 0 };
  }
  const elementBounds = elements.map((element) => stateIconDrawingMovementElementBounds(element, visibleFrames));
  const selectionBounds = {
    left: Math.min(...elementBounds.map((bounds) => bounds.left)),
    right: Math.max(...elementBounds.map((bounds) => bounds.right)),
    top: Math.min(...elementBounds.map((bounds) => bounds.top)),
    bottom: Math.max(...elementBounds.map((bounds) => bounds.bottom))
  };
  const frameLeft = Number(frameRect?.x) || 0;
  const frameTop = Number(frameRect?.y) || 0;
  const frameRight = frameLeft + Math.max(0, Number(frameRect?.width) || 0);
  const frameBottom = frameTop + Math.max(0, Number(frameRect?.height) || 0);
  const clampAxis = (value: number, start: number, end: number, minimum: number, maximum: number) => {
    const minimumDelta = minimum - start;
    const maximumDelta = maximum - end;
    return minimumDelta <= maximumDelta
      ? clampNumber(value, minimumDelta, maximumDelta)
      : 0;
  };
  return {
    x: clampAxis(delta.x, selectionBounds.left, selectionBounds.right, frameLeft, frameRight),
    y: clampAxis(delta.y, selectionBounds.top, selectionBounds.bottom, frameTop, frameBottom)
  };
}

export function stateIconDrawingMovementFrameForDialog(__appScope: StateIconDrawingScope, current: any) {
  const definitionScope = current?.target?.scope === "definition";
  const draft = definitionScope ? __appScope.definitionVisualDraft : __appScope.customDeviceDraft;
  const terminalTypes = definitionScope ? __appScope.definitionVisualTerminalTypes : __appScope.customDraftTerminalTypes;
  const terminalCount = Math.max(
    0,
    Number(draft?.terminalCount) || (Array.isArray(terminalTypes) ? terminalTypes.length : 0) || 0
  );
  return stateIconDrawingFrameRect(Boolean(current?.target?.scope && terminalCount > 0));
}

export function stateIconDrawingMovementVisibleFrames(__appScope: StateIconDrawingScope) {
  return {
    image: __appScope.stateIconDrawingImageVisibleFrames ?? {},
    svg: __appScope.stateIconDrawingSvgVisibleFrames ?? {}
  };
}

export function stateIconDrawingRectFromPoints(start: Point, current: Point) {
  return {
    left: Math.min(start.x, current.x),
    right: Math.max(start.x, current.x),
    top: Math.min(start.y, current.y),
    bottom: Math.max(start.y, current.y)
  };
}

function stateIconDrawingBoundsIntersectRect(bounds: any, rect: any) {
  return bounds.right >= rect.left && bounds.left <= rect.right && bounds.bottom >= rect.top && bounds.top <= rect.bottom;
}

export function stateIconDrawingElementIdsInRect(elements: any[], rect: { left: number; right: number; top: number; bottom: number }) {
  return elements
    .filter((element) => stateIconDrawingBoundsIntersectRect(stateIconDrawingElementBounds(element), rect))
    .map((element) => element.id);
}

function stateIconDrawingBoundsAnchors(bounds: any, axis: "x" | "y") {
  return axis === "x"
    ? [
        { key: "start", value: bounds.left, priority: 1 },
        { key: "center", value: bounds.centerX, priority: 0 },
        { key: "end", value: bounds.right, priority: 1 }
      ]
    : [
        { key: "start", value: bounds.top, priority: 1 },
        { key: "center", value: bounds.centerY, priority: 0 },
        { key: "end", value: bounds.bottom, priority: 1 }
      ];
}

function translatedStateIconDrawingBounds(bounds: any, delta: Point) {
  return {
    ...bounds,
    left: bounds.left + delta.x,
    right: bounds.right + delta.x,
    top: bounds.top + delta.y,
    bottom: bounds.bottom + delta.y,
    centerX: bounds.centerX + delta.x,
    centerY: bounds.centerY + delta.y
  };
}

function bestStateIconDrawingAlignmentSnap(axis: "x" | "y", movedBounds: any, candidates: any[], threshold: number) {
  let best: any = null;
  const movedAnchors = stateIconDrawingBoundsAnchors(movedBounds, axis);
  for (const candidate of candidates) {
    const candidateAnchors = candidate.anchors
      ? (candidate.anchors[axis] ?? [])
      : stateIconDrawingBoundsAnchors(candidate.bounds, axis);
    for (const movedAnchor of movedAnchors) {
      for (const candidateAnchor of candidateAnchors) {
        const adjustment = candidateAnchor.value - movedAnchor.value;
        const distance = Math.abs(adjustment);
        const priority = movedAnchor.priority + candidateAnchor.priority;
        if (distance > threshold) {
          continue;
        }
        if (best && (distance > best.distance || (distance === best.distance && priority >= best.priority))) {
          continue;
        }
        const guide = axis === "x"
          ? {
              id: `state-icon-vertical:${candidate.id}:${candidateAnchor.key}:${movedAnchor.key}`,
              orientation: "vertical",
              position: candidateAnchor.value,
              start: Math.min(movedBounds.top, candidate.bounds.top) - STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING,
              end: Math.max(movedBounds.bottom, candidate.bounds.bottom) + STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING
            }
          : {
              id: `state-icon-horizontal:${candidate.id}:${candidateAnchor.key}:${movedAnchor.key}`,
              orientation: "horizontal",
              position: candidateAnchor.value,
              start: Math.min(movedBounds.left, candidate.bounds.left) - STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING,
              end: Math.max(movedBounds.right, candidate.bounds.right) + STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING
            };
        best = { adjustment, distance, priority, guide };
      }
    }
  }
  return best;
}

function stateIconDrawingFrameAlignmentCandidates() {
  const terminalFrame = stateIconDrawingTerminalFrame();
  const xGuides = Array.from(new Set([
    0,
    terminalFrame.centerX - terminalFrame.width / 2,
    ...STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => STATE_ICON_DRAWING_FRAME_WIDTH * ratio),
    terminalFrame.centerX + terminalFrame.width / 2,
    STATE_ICON_DRAWING_FRAME_WIDTH
  ]));
  const yGuides = Array.from(new Set([
    0,
    terminalFrame.centerY - terminalFrame.height / 2,
    ...STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => STATE_ICON_DRAWING_FRAME_HEIGHT * ratio),
    terminalFrame.centerY + terminalFrame.height / 2,
    STATE_ICON_DRAWING_FRAME_HEIGHT
  ]));
  const verticalCandidates = xGuides.map((x) => {
    return {
      id: `frame-x-${x}`,
      bounds: {
        left: x,
        right: x,
        top: 0,
        bottom: STATE_ICON_DRAWING_FRAME_HEIGHT,
        centerX: x,
        centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2
      },
      anchors: {
        x: [{ key: `frame-${x}`, value: x, priority: 2 }],
        y: []
      }
    };
  });
  const horizontalCandidates = yGuides.map((y) => {
    return {
      id: `frame-y-${y}`,
      bounds: {
        left: 0,
        right: STATE_ICON_DRAWING_FRAME_WIDTH,
        top: y,
        bottom: y,
        centerX: STATE_ICON_DRAWING_FRAME_WIDTH / 2,
        centerY: y
      },
      anchors: {
        x: [],
        y: [{ key: `frame-${y}`, value: y, priority: 2 }]
      }
    };
  });
  return [...verticalCandidates, ...horizontalCandidates];
}

function stateIconDrawingPointAlignmentCandidate(id: string, x: number, y: number, priority: number) {
  return {
    id,
    bounds: {
      left: x,
      right: x,
      top: y,
      bottom: y,
      centerX: x,
      centerY: y
    },
    anchors: {
      x: [{ key: id, value: x, priority }],
      y: [{ key: id, value: y, priority }]
    }
  };
}

function stateIconDrawingTerminalFrame() {
  return {
    width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4,
    height: STATE_ICON_DRAWING_FRAME_HEIGHT * 3 / 4,
    centerX: STATE_ICON_DRAWING_FRAME_WIDTH / 2,
    centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2,
    marginX: STATE_ICON_DRAWING_FRAME_WIDTH / 8,
    marginY: STATE_ICON_DRAWING_FRAME_HEIGHT / 8
  };
}

function stateIconDrawingTerminalConnectorSegment(anchor: Point, projectAnchor: (anchor: Point) => Point = (value) => value) {
  const frame = stateIconDrawingTerminalFrame();
  const boundaryAnchor = projectAnchor(anchor);
  const framePoint = {
    x: frame.centerX + boundaryAnchor.x * frame.width,
    y: frame.centerY + boundaryAnchor.y * frame.height
  };
  const horizontal = Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y);
  const bodyReachX = frame.marginX * 2.6;
  const bodyReachY = frame.marginY * 2.6;
  return {
    from: horizontal
      ? { x: framePoint.x - Math.sign(boundaryAnchor.x || 1) * bodyReachX, y: framePoint.y }
      : { x: framePoint.x, y: framePoint.y - Math.sign(boundaryAnchor.y || 1) * bodyReachY },
    to: horizontal
      ? { x: framePoint.x + (boundaryAnchor.x < 0 ? -frame.marginX : frame.marginX), y: framePoint.y }
      : { x: framePoint.x, y: framePoint.y + (boundaryAnchor.y < 0 ? -frame.marginY : frame.marginY) }
  };
}

function stateIconDrawingTerminalAlignmentCandidates(__appScope: StateIconDrawingScope, options: { excludeTerminalIndex?: number } = {}) {
  const {
    customDeviceDraft,
    customDeviceTerminalAnchors,
    customDraftTerminalTypes,
    definitionVisualDraft,
    definitionVisualTerminalAnchors,
    definitionVisualTerminalTypes,
    projectCustomDeviceTerminalAnchorToBoundary,
    stateIconDrawingDialog
  } = __appScope;
  const scope = stateIconDrawingDialog?.target?.scope;
  const draft = scope === "definition" ? definitionVisualDraft : scope === "custom" ? customDeviceDraft : null;
  const terminalTypes = scope === "definition" ? definitionVisualTerminalTypes : customDraftTerminalTypes;
  const terminalAnchors = scope === "definition" ? definitionVisualTerminalAnchors : customDeviceTerminalAnchors;
  const terminalCount = Math.max(
    0,
    Number(draft?.terminalCount) || (Array.isArray(terminalTypes) ? terminalTypes.length : 0) || 0
  );
  if (!terminalCount || !Array.isArray(terminalAnchors)) {
    return [];
  }
  const projectAnchor = typeof projectCustomDeviceTerminalAnchorToBoundary === "function"
    ? projectCustomDeviceTerminalAnchorToBoundary
    : (anchor: Point) => anchor;
  return terminalAnchors.slice(0, terminalCount).flatMap((anchor, index) => {
    if (index === options.excludeTerminalIndex) {
      return [];
    }
    const segment = stateIconDrawingTerminalConnectorSegment(anchor, projectAnchor);
    return [
      stateIconDrawingPointAlignmentCandidate(`terminal-anchor-${index}`, segment.to.x, segment.to.y, -3),
      stateIconDrawingPointAlignmentCandidate(`terminal-inner-${index}`, segment.from.x, segment.from.y, -2)
    ];
  });
}

function stateIconDrawingElementAlignmentCandidates(elements: readonly StateIconDrawingElement[] = [], selectedIds: readonly string[] = []) {
  const selectedSet = new Set(selectedIds);
  return elements
    .filter((element) => !selectedSet.has(element.id))
    .map((element) => ({ id: element.id, bounds: stateIconDrawingElementBounds(element) }));
}

function stateIconDrawingPointBounds(point: Point) {
  return {
    left: point.x,
    right: point.x,
    top: point.y,
    bottom: point.y,
    centerX: point.x,
    centerY: point.y
  };
}

export function stateIconDrawingTerminalPointSnap(
  __appScope: StateIconDrawingScope,
  point: Point,
  options: { excludeTerminalIndex?: number; selectedIds?: readonly string[] } = {}
) {
  if (!__appScope.smartAlignmentEnabled) {
    return { point, guides: [] };
  }
  const candidates = [
    ...stateIconDrawingTerminalAlignmentCandidates(__appScope, options),
    ...stateIconDrawingElementAlignmentCandidates(__appScope.stateIconDrawingDialog?.elements ?? [], options.selectedIds ?? []),
    ...stateIconDrawingFrameAlignmentCandidates()
  ];
  if (candidates.length === 0) {
    return { point, guides: [] };
  }
  const pointBounds = stateIconDrawingPointBounds(point);
  const xSnap = bestStateIconDrawingAlignmentSnap("x", pointBounds, candidates, STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE);
  const ySnap = bestStateIconDrawingAlignmentSnap("y", pointBounds, candidates, STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE);
  return {
    point: {
      x: point.x + (xSnap?.adjustment ?? 0),
      y: point.y + (ySnap?.adjustment ?? 0)
    },
    guides: [xSnap?.guide, ySnap?.guide].filter(Boolean)
  };
}

export function createComputeStateIconDrawingSmartAlignmentSnap(__appScope: StateIconDrawingScope) {
  return ({
    elements,
    selectedIds,
    startElements,
    delta,
    threshold = STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE
  }: {
    elements: StateIconDrawingElement[];
    selectedIds: readonly string[];
    startElements: StateIconDrawingElement[];
    delta: Point;
    threshold?: number;
  }) => {
  const { smartAlignmentEnabled } = __appScope;
    if (!smartAlignmentEnabled || selectedIds.length === 0 || startElements.length === 0) {
      return { delta, guides: [] };
    }
    const startBounds = stateIconDrawingSelectionBounds(startElements);
    if (!startBounds) {
      return { delta, guides: [] };
    }
    const candidates = [
      ...stateIconDrawingElementAlignmentCandidates(elements, selectedIds),
      ...stateIconDrawingTerminalAlignmentCandidates(__appScope),
      ...stateIconDrawingFrameAlignmentCandidates()
    ];
    if (candidates.length === 0) {
      return { delta, guides: [] };
    }
    const movedBounds = translatedStateIconDrawingBounds(startBounds, delta);
    const xSnap = bestStateIconDrawingAlignmentSnap("x", movedBounds, candidates, threshold);
    const ySnap = bestStateIconDrawingAlignmentSnap("y", movedBounds, candidates, threshold);
    const guides = [xSnap?.guide, ySnap?.guide].filter(Boolean);
    return {
      delta: {
        x: delta.x + (xSnap?.adjustment ?? 0),
        y: delta.y + (ySnap?.adjustment ?? 0)
      },
      guides
    };
  };
}

export function stateIconDrawingFrameDashArray(frame: any) {
  const width = atLeastOneNumber(frame?.strokeWidth, 1);
  if (frame?.strokeStyle === "dotted") {
    return `${width * 0.2} ${width * 2}`;
  }
  if (frame?.strokeStyle === "dashed") {
    return `${width * 5} ${width * 3}`;
  }
  return undefined;
}

export function clampStateIconDrawingPoint(point: Point) {
  return {
    x: clampNumber(point.x, 0, 240),
    y: clampNumber(point.y, 0, 160)
  };
}

function sameStateIconDrawingPoint(left: Point, right: Point) {
  return Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01;
}

export function appendDistinctStateIconDrawingPoint(points: readonly Point[], point: Point) {
  const nextPoint = clampStateIconDrawingPoint(point);
  const lastPoint = points[points.length - 1];
  return lastPoint && sameStateIconDrawingPoint(lastPoint, nextPoint)
    ? points.map(clampStateIconDrawingPoint)
    : [...points.map(clampStateIconDrawingPoint), nextPoint];
}

export function stateIconDrawingPolylineElementFromPoints(element: any, points: readonly Point[]) {
  const clampedPoints = points.map(clampStateIconDrawingPoint);
  const drawPoints = clampedPoints.length >= 2
    ? clampedPoints
    : clampedPoints.length === 1
      ? [clampedPoints[0], clampedPoints[0]]
      : [{ x: 120, y: 80 }, { x: 120, y: 80 }];
  const left = Math.min(...drawPoints.map((point) => point.x));
  const right = Math.max(...drawPoints.map((point) => point.x));
  const top = Math.min(...drawPoints.map((point) => point.y));
  const bottom = Math.max(...drawPoints.map((point) => point.y));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const center = {
    x: left + width / 2,
    y: top + height / 2
  };
  return {
    ...element,
    x: center.x,
    y: center.y,
    width,
    height,
    rotation: 0,
    points: drawPoints.map((point) => ({
      x: (point.x - center.x) / width,
      y: (point.y - center.y) / height
    }))
  };
}

export function stateIconDrawingElementFromPoints(element: any, startPoint: Point, currentPoint: Point) {
  const start = clampStateIconDrawingPoint(startPoint);
  const current = clampStateIconDrawingPoint(currentPoint);
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const absWidth = Math.abs(dx);
  const absHeight = Math.abs(dy);
  const center = {
    x: start.x + dx / 2,
    y: start.y + dy / 2
  };
  if (element.kind === "line") {
    const length = Math.max(1, Math.hypot(dx, dy));
    return {
      ...element,
      x: center.x,
      y: center.y,
      width: length,
      height: Math.max(12, element.height),
      rotation: Math.atan2(dy, dx || 0.000001) * 180 / Math.PI
    };
  }
  if (element.kind === "polyline") {
    return stateIconDrawingPolylineElementFromPoints(element, [start, current]);
  }
  if (element.kind === "point") {
    const size = Math.max(8, absWidth, absHeight);
    return {
      ...element,
      x: center.x,
      y: center.y,
      width: size,
      height: size
    };
  }
  if (element.kind === "circle" || element.kind === "square" || element.kind === "semicircle") {
    const size = Math.max(1, absWidth, absHeight);
    const end = {
      x: start.x + (dx < 0 ? -size : size),
      y: start.y + (dy < 0 ? -size : size)
    };
    return {
      ...element,
      x: start.x + (end.x - start.x) / 2,
      y: start.y + (end.y - start.y) / 2,
      width: size,
      height: size
    };
  }
  const minimumWidth = element.kind === "text" ? 24 : 1;
  const minimumHeight = element.kind === "text" ? 16 : 1;
  return {
    ...element,
    x: center.x,
    y: center.y,
    width: Math.max(minimumWidth, absWidth),
    height: Math.max(minimumHeight, absHeight)
  };
}

export function finishStateIconDrawingDraft(current: any, historyRef: any) {
  if (!current?.drawingDraft) {
    return current;
  }
  const draft = current.drawingDraft;
  let element = draft.element;
  if (draft.kind === "polyline") {
    const draftPoints = draft.points?.length ? draft.points : [draft.start];
    const finalPoint = draft.current ?? draftPoints[draftPoints.length - 1] ?? draft.start;
    const finalPoints = appendDistinctStateIconDrawingPoint(draftPoints, finalPoint);
    if (finalPoints.length < 2) {
      return current;
    }
    element = stateIconDrawingPolylineElementFromPoints(draft.element, finalPoints);
  } else {
    element = stateIconDrawingElementFromPoints(draft.element, draft.start, draft.current ?? draft.start);
  }
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: [...current.elements, element],
    selectedElementId: element.id,
    selectedElementIds: [element.id],
    pendingElementKind: undefined,
    pendingStaticTemplate: undefined,
    drawingDraft: undefined,
    smartAlignmentGuides: []
  };
}

export function createTemplateDefaultStateIconImage(__appScope: StateIconDrawingScope, template: any, options: Record<string, any> = {}) {
  if (!template) {
    return "";
  }
  const { DeviceGlyph, MAX_CUSTOM_DEVICE_TERMINALS, createNodeFromTemplate, escapeXml, formatSvgNumber, nodeGeometryTransform, renderSvgElementMarkup, colorDisplayMode, colorPalette, themeMode } = __appScope;
  if (!DeviceGlyph || !createNodeFromTemplate || !renderSvgElementMarkup) {
    return "";
  }
  const width = Math.max(1, Math.round(options.size?.width ?? template.size?.width ?? 104));
  const height = Math.max(1, Math.round(options.size?.height ?? template.size?.height ?? 64));
  const terminalCount = clampNumber(Math.round(options.terminalCount ?? template.terminalCount ?? 0), 0, MAX_CUSTOM_DEVICE_TERMINALS ?? 64);
  const sourceTerminalTypes = (
    options.terminalTypes ??
    template.terminalTypes ??
    Array.from({ length: terminalCount }, () => template.terminalType ?? "ac")
  ).slice(0, terminalCount);
  const terminalTypes = sourceTerminalTypes.length > 0 ? sourceTerminalTypes : [template.terminalType ?? "ac"];
  const explicitStatus = options.status !== undefined && options.status !== null && String(options.status) !== "";
  const stateParamKey = switchingDeviceUsesClosedStatus(String(template.kind ?? ""), template.params ?? {})
    ? "closed_status"
    : "status";
  const visualTemplate = {
    ...template,
    label: options.label || template.label,
    size: { width, height },
    params: {
      ...template.params,
      backgroundImage: "",
      backgroundImageAssetId: ""
    },
    ...(explicitStatus
      ? { params: { ...template.params, [stateParamKey]: String(options.status), backgroundImage: "", backgroundImageAssetId: "" } }
      : {}),
    terminalType: terminalTypes[0] ?? template.terminalType,
    terminalCount,
    terminalTypes,
    terminalLabels: (options.terminalLabels ?? template.terminalLabels ?? []).slice(0, terminalCount),
    terminalAnchors: (options.terminalAnchors ?? template.terminalAnchors ?? []).slice(0, terminalCount)
  };
  const node = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
  if (explicitStatus) {
    node.params = { ...node.params, [stateParamKey]: String(options.status) };
  }
  const stateVisual = options.stateVisual
    ? {
        ...options.stateVisual,
        image: "",
        imageAssetId: "",
        backgroundImage: "",
        backgroundImageAssetId: "",
        imageCleared: ""
      }
    : null;
  const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, themeMode, stateVisual }));
  const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, themeMode, stateVisual }));
  const viewBoxX = -width / 2;
  const viewBoxY = -height / 2;
  const viewBoxWidth = width;
  const viewBoxHeight = height;
  const drawingWidth = 240;
  const drawingHeight = 160;
  const contentWidth = terminalCount > 0 ? drawingWidth * 3 / 4 : drawingWidth;
  const contentHeight = terminalCount > 0 ? drawingHeight * 3 / 4 : drawingHeight;
  const contentCenterX = drawingWidth / 2;
  const contentCenterY = drawingHeight / 2;
  const isStaticTemplate = typeof __appScope.isStaticKind === "function"
    ? __appScope.isStaticKind(template.kind)
    : String(template.kind ?? "").startsWith("static-");
  const staticTemplateSizeAttrs = isStaticTemplate
    ? ` data-state-icon-template-width="${formatSvgNumber(width)}" data-state-icon-template-height="${formatSvgNumber(height)}"`
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatSvgNumber(drawingWidth)}" height="${formatSvgNumber(drawingHeight)}" viewBox="0 0 ${formatSvgNumber(drawingWidth)} ${formatSvgNumber(drawingHeight)}">` +
    `<g data-state-icon-layer-width="${formatSvgNumber(contentWidth)}" data-state-icon-layer-height="${formatSvgNumber(contentHeight)}"${staticTemplateSizeAttrs} transform="translate(${formatSvgNumber(contentCenterX)} ${formatSvgNumber(contentCenterY)})">` +
    `<svg x="${formatSvgNumber(-contentWidth / 2)}" y="${formatSvgNumber(-contentHeight / 2)}" width="${formatSvgNumber(contentWidth)}" height="${formatSvgNumber(contentHeight)}" data-state-icon-preserve-view-box="true" viewBox="${formatSvgNumber(viewBoxX)} ${formatSvgNumber(viewBoxY)} ${formatSvgNumber(viewBoxWidth)} ${formatSvgNumber(viewBoxHeight)}" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
    `<g data-platform-generated-default="true" transform="${escapeXml(nodeGeometryTransform(node))}">${glyphMarkup}${glyphTextMarkup}</g>` +
    `</svg></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function isGeneratedTemplateDefaultStateIconImage(value: unknown) {
  const image = String(value ?? "");
  if (!image.startsWith("data:image/svg+xml")) {
    return false;
  }
  const payload = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
  try {
    const decoded = decodeURIComponent(payload);
    return (
      decoded.includes('data-platform-generated-default="true"') ||
      decoded.includes("data-state-icon-layer-width") ||
      decoded.includes("data-state-icon-layer-height") ||
      decoded.includes("data-custom-device-persisted-terminal-connectors") ||
      (
        decoded.includes('width="240"') &&
        decoded.includes('height="160"') &&
        decoded.includes('d="M -64 0 H 64"') &&
        decoded.includes(">文本框</text>")
      )
    );
  } catch {
    return false;
  }
}

export function clearGeneratedDefinitionVisualDraftImage(template: any, draft: any) {
  if (!template || template.custom || !draft || !isGeneratedTemplateDefaultStateIconImage(draft.backgroundImage)) {
    return draft;
  }
  return {
    ...draft,
    backgroundImage: "",
    backgroundImageAssetId: "",
    backgroundImageFit: "cover",
    backgroundImageCleared: ""
  };
}

export function createDefinitionStateDraftRowsWithDefaultImages(__appScope: StateIconDrawingScope, template: any) {
  const { createDefinitionStateDraftRows, imageAssets = {} } = __appScope;
  const rows = createDefinitionStateDraftRows(template);
  if (!template || template.custom) {
    return rows;
  }
  return rows.map((row: any) => {
    const imageAssetHref = row.imageAssetId ? imageAssets[row.imageAssetId] : "";
    const backgroundImageAssetHref = row.backgroundImageAssetId ? imageAssets[row.backgroundImageAssetId] : "";
    const hasCustomStateImage = Boolean(
      (row.image && !isGeneratedTemplateDefaultStateIconImage(row.image)) ||
      (row.imageAssetId && !isGeneratedTemplateDefaultStateIconImage(imageAssetHref)) ||
      (row.backgroundImage && !isGeneratedTemplateDefaultStateIconImage(row.backgroundImage)) ||
      (row.backgroundImageAssetId && !isGeneratedTemplateDefaultStateIconImage(backgroundImageAssetHref)) ||
      row.imageCleared
    );
    if (hasCustomStateImage) {
      return row;
    }
    const image = createTemplateDefaultStateIconImage(__appScope, template, {
      status: row.value,
      stateVisual: row
    });
    return {
      ...row,
      image,
      imageAssetId: "",
      imageCleared: image ? "" : "1"
    };
  });
}

export function stateIconDrawingImportedSvgSelectionFrame(element: any) {
  if (element?.kind !== "imported-svg" || !element.svgSource) {
    return null;
  }
  const [x, y, width, height] = stateIconSvgVisibleViewBox(element.svgSource)
    .split(/\s+/u)
    .map((value) => Number.parseFloat(value));
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }
  const elementWidth = atLeastOneNumber(element.width, 1);
  const elementHeight = atLeastOneNumber(element.height, 1);
  const scale = Math.min(elementWidth / width, elementHeight / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    x: -fittedWidth / 2,
    y: -fittedHeight / 2,
    width: fittedWidth,
    height: fittedHeight,
    halfWidth: fittedWidth / 2,
    halfHeight: fittedHeight / 2
  };
}

export function createChooseStateIconDrawingImport(__appScope: StateIconDrawingScope) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, refreshImageFolders, setImageAssetList, setImageAssets, setStateIconDrawingDialog, stateIconDrawingHistoryRef, stateIconDrawingImportMode, uploadBackendImage } = __appScope;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const isSvg = stateIconDrawingImportMode === "svg" || file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const appendImportedElements = (importedElements: StateIconDrawingElement[]) => {
      const selectedElementId = importedElements[0]?.id ?? "";
      setStateIconDrawingDialog((current: any) =>
        current
          ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
              ...current,
              elements: [...current.elements, ...importedElements],
              selectedElementId,
              selectedElementIds: selectedElementId ? [selectedElementId] : [],
              pendingElementKind: undefined,
              pendingStaticTemplate: undefined,
              drawingDraft: undefined
            })
          : current
      );
    };
    const reader = new FileReader();
    reader.onload = async () => {
      const source = String(reader.result ?? "");
      if (isSvg) {
        appendImportedElements(createEditableStateIconElementsFromSvgSource(source, file.name, { preserveImportedSvg: true }));
        return;
      }
      // 位图：上传到图片库并引用 /webgrp/images，避免把 base64 位图内联进状态图标 SVG（library.json 膨胀根因）。
      let href = source;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, source, activeImageFolderId);
        href = uploadedAsset.url;
        setImageAssetList((current: any) => [uploadedAsset, ...current.filter((item: any) => item.id !== uploadedAsset.id)]);
        setImageAssets((current: any) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "上传图片到后台失败，将以本地预览嵌入。");
      }
      appendImportedElements([createImportedStateIconElement("image", href, file.name)]);
    };
    if (isSvg) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };
}

export function createUpdateStateIconDrawingElement(__appScope: StateIconDrawingScope) {
  return (elementId: string, patch: Partial<StateIconDrawingElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    const explicitPatch = {
      ...patch,
      ...(Object.prototype.hasOwnProperty.call(patch, "strokeWidth") ? { strokeWidthEdited: true } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "strokeColor") ? { strokeColorEdited: true } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "strokeStyle") ? { strokeStyleEdited: true } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "fillColor") ? { fillColorEdited: true } : {})
    };
    setStateIconDrawingDialog((current: any) =>
      current
        ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
            ...current,
            elements: current.elements.map((element: any) => (element.id === elementId ? { ...element, ...explicitPatch } : element))
          })
        : current
    );
  };
}

export function createUpdateStateIconDrawingElements(__appScope: StateIconDrawingScope) {
  return (elementIds: readonly string[], updater: (element: StateIconDrawingElement) => StateIconDrawingElement, options: { recordHistory?: boolean } = {}) => {
  const { setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    const idSet = new Set(elementIds);
    setStateIconDrawingDialog((current: any) =>
      current
        ? (options.recordHistory ? pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements) : undefined, {
            ...current,
            elements: current.elements.map((element: any) => (idSet.has(element.id) ? updater(element) : element))
          })
        : current
    );
  };
}

export function createStateIconDrawingPointer(__appScope: StateIconDrawingScope) {
  let cachedSvg: SVGSVGElement | null = null;
  let cachedPoint: SVGPoint | null = null;
  let cachedInverse: DOMMatrix | null = null;
  return (event: PointerEvent<SVGElement>): Point => {
  const { stateIconDrawingSvgRef } = __appScope;
    const svg = stateIconDrawingSvgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    if (svg !== cachedSvg || !cachedPoint) {
      cachedSvg = svg;
      cachedPoint = svg.createSVGPoint() as SVGPoint;
      cachedInverse = null;
    }
    const svgPoint = cachedPoint!;
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    if (!cachedInverse) {
      cachedInverse = ctm.inverse();
    }
    const transformed = svgPoint.matrixTransform(cachedInverse ?? undefined);
    return { x: transformed.x, y: transformed.y };
  };
}

export function createStateIconDrawingSelection(__appScope: StateIconDrawingScope) {
  return (elementId: string, append: boolean) => {
  const { setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current: any) => {
      if (!current) {
        return current;
      }
      const currentIds = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      const selectedElementIds = toggleStateIconDrawingElementSelection(current.elements, currentIds, elementId, append);
      return {
        ...current,
        selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
        selectedElementIds
      };
    });
  };
}

export function createStartStateIconDrawingDrag(__appScope: StateIconDrawingScope) {
  return (event: PointerEvent<SVGElement>, elementId: string, mode: StateIconDrawingDragMode, handleOffset?: Point) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingDialog, stateIconDrawingDragRef, stateIconDrawingPointer } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setStateIconDrawingContextMenu(null);
    (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
    if (!stateIconDrawingDialog) {
      return;
    }
    const append = event.shiftKey || event.ctrlKey || event.metaKey;
    const existingSelection = stateIconDrawingSelectedIds(stateIconDrawingDialog);
    const clickedSelection = expandStateIconDrawingElementIds(stateIconDrawingDialog.elements, [elementId]);
    const selectedElementIds = append
      ? Array.from(new Set([...existingSelection, ...clickedSelection]))
      : clickedSelection.every((id) => existingSelection.includes(id))
        ? existingSelection
        : clickedSelection;
    const startElements = stateIconDrawingDialog.elements
      .filter((element: any) => selectedElementIds.includes(element.id))
      .map(cloneStateIconDrawingElementSnapshot);
    if (startElements.length === 0) {
      return;
    }
    const allStartElements = stateIconDrawingDialog.elements.map(cloneStateIconDrawingElementSnapshot);
    const selectionBounds = stateIconDrawingSelectionBounds(startElements);
    const center = selectionBounds
      ? { x: selectionBounds.centerX, y: selectionBounds.centerY }
      : { x: 0, y: 0 };
    const movementFrame = stateIconDrawingMovementFrameForDialog(__appScope, stateIconDrawingDialog);
    const movementVisibleFrames = stateIconDrawingMovementVisibleFrames(__appScope);
    const start = stateIconDrawingPointer(event);
    setStateIconDrawingDialog((current: any) => current ? {
      ...current,
      selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
      selectedElementIds,
      smartAlignmentGuides: []
    } : current);
    stateIconDrawingDragRef.current = {
      mode,
      elementIds: selectedElementIds,
      start,
      center,
      startElements,
      allStartElements,
      movementFrame,
      movementVisibleFrames,
      handleOffset
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
}

export function createDragStateIconDrawingSelection(__appScope: StateIconDrawingScope) {
  let rafId: number | null = null;
  let pendingEvent: PointerEvent<SVGSVGElement> | null = null;

  const processDrag = (event: PointerEvent<SVGSVGElement>) => {
  const { computeStateIconDrawingSmartAlignmentSnap, setStateIconDrawingDialog, stateIconDrawingDragDeltaRef, stateIconDrawingDragRef, stateIconDrawingPointer } = __appScope;
    const drag = stateIconDrawingDragRef.current;
    if (!drag) {
      return;
    }
    event.preventDefault();
    const point = stateIconDrawingPointer(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (drag.mode === "move") {
      const snap = computeStateIconDrawingSmartAlignmentSnap
        ? computeStateIconDrawingSmartAlignmentSnap({
            elements: drag.allStartElements ?? drag.startElements,
            selectedIds: drag.elementIds,
            startElements: drag.startElements,
            delta: { x: dx, y: dy }
          })
        : { delta: { x: dx, y: dy }, guides: [] };
      const boundedDelta = clampStateIconDrawingMovementDelta(
        drag.startElements,
        snap.delta,
        drag.movementFrame ?? stateIconDrawingFrameRect(false),
        drag.movementVisibleFrames
      );
      const movementWasClamped = boundedDelta.x !== snap.delta.x || boundedDelta.y !== snap.delta.y;
      const overrides: Record<string, { x: number; y: number }> = {};
      for (const startElement of drag.startElements) {
        overrides[startElement.id] = { x: startElement.x + boundedDelta.x, y: startElement.y + boundedDelta.y };
      }
      stateIconDrawingDragDeltaRef.current = { overrides, guides: movementWasClamped ? [] : snap.guides };
      setStateIconDrawingDialog((current: any) => current ? { ...current, _dragTick: (current._dragTick ?? 0) + 1 } : current);
      return;
    }
    if (drag.mode === "resize" || drag.mode === "resize-top" || drag.mode === "resize-bottom" || drag.mode === "resize-left" || drag.mode === "resize-right") {
      const overrides: Record<string, { x: number; y: number; width: number; height: number }> = {};
      for (const startElement of drag.startElements) {
        if (drag.mode === "resize") {
          const startDistance = Math.hypot(drag.start.x - drag.center.x, drag.start.y - drag.center.y) || 1;
          const currentDistance = Math.hypot(point.x - drag.center.x, point.y - drag.center.y) || 1;
          const scale = Math.max(0.05, currentDistance / startDistance);
          overrides[startElement.id] = {
            x: drag.center.x + (startElement.x - drag.center.x) * scale,
            y: drag.center.y + (startElement.y - drag.center.y) * scale,
            width: Math.max(1, startElement.width * scale),
            height: Math.max(1, startElement.height * scale)
          };
          continue;
        }
        const rad = -(startElement.rotation * Math.PI) / 180;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        const fullWidth = Math.max(1, startElement.width);
        const fullHeight = Math.max(1, startElement.height);
        let newWidth = fullWidth;
        let newHeight = fullHeight;
        let localCenterShiftX = 0;
        let localCenterShiftY = 0;
        const wHandle = Math.abs(drag.handleOffset?.x ?? fullWidth / 2) || fullWidth / 2;
        const hHandle = Math.abs(drag.handleOffset?.y ?? fullHeight / 2) || fullHeight / 2;
        switch (drag.mode) {
          case "resize-right":
            newWidth = Math.max(1, fullWidth + fullWidth * localDx / (2 * wHandle));
            localCenterShiftX = localDx / 2;
            break;
          case "resize-left":
            newWidth = Math.max(1, fullWidth - fullWidth * localDx / (2 * wHandle));
            localCenterShiftX = localDx / 2;
            break;
          case "resize-bottom":
            newHeight = Math.max(1, fullHeight + fullHeight * localDy / (2 * hHandle));
            localCenterShiftY = localDy / 2;
            break;
          case "resize-top":
            newHeight = Math.max(1, fullHeight - fullHeight * localDy / (2 * hHandle));
            localCenterShiftY = localDy / 2;
            break;
        }
        const fwdRad = (startElement.rotation * Math.PI) / 180;
        const centerShiftX = localCenterShiftX * Math.cos(fwdRad) - localCenterShiftY * Math.sin(fwdRad);
        const centerShiftY = localCenterShiftX * Math.sin(fwdRad) + localCenterShiftY * Math.cos(fwdRad);
        overrides[startElement.id] = {
          x: startElement.x + centerShiftX,
          y: startElement.y + centerShiftY,
          width: newWidth,
          height: newHeight
        };
      }
      stateIconDrawingDragDeltaRef.current = { overrides };
      setStateIconDrawingDialog((current: any) => current ? { ...current, _dragTick: (current._dragTick ?? 0) + 1 } : current);
      return;
    }
    const startAngle = Math.atan2(drag.start.y - drag.center.y, drag.start.x - drag.center.x);
    const currentAngle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x);
    const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;
    const overrides: Record<string, { x: number; y: number; rotation: number }> = {};
    const rotationRad = (deltaAngle * Math.PI) / 180;
    for (const startElement of drag.startElements) {
      const relativeX = startElement.x - drag.center.x;
      const relativeY = startElement.y - drag.center.y;
      overrides[startElement.id] = {
        x: drag.center.x + relativeX * Math.cos(rotationRad) - relativeY * Math.sin(rotationRad),
        y: drag.center.y + relativeX * Math.sin(rotationRad) + relativeY * Math.cos(rotationRad),
        rotation: startElement.rotation + deltaAngle
      };
    }
    stateIconDrawingDragDeltaRef.current = { overrides };
    setStateIconDrawingDialog((current: any) => current ? { ...current, _dragTick: (current._dragTick ?? 0) + 1 } : current);
  };

  return (event: PointerEvent<SVGSVGElement>) => {
    pendingEvent = event;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingEvent) {
          const e = pendingEvent;
          pendingEvent = null;
          processDrag(e);
        }
      });
    }
  };
}

export function createStopStateIconDrawingDrag(__appScope: StateIconDrawingScope) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingDragDeltaRef, stateIconDrawingDragRef, stateIconDrawingHistoryRef } = __appScope;
    const delta = stateIconDrawingDragDeltaRef.current;
    stateIconDrawingDragRef.current = null;
    stateIconDrawingDragDeltaRef.current = null;
    if (delta?.overrides) {
      const overrides = delta.overrides;
      setStateIconDrawingDialog((current: any) => {
        if (!current) return current;
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          smartAlignmentGuides: [],
          elements: current.elements.map((element: any) => {
            const ovr = overrides[element.id];
            return ovr ? { ...element, ...ovr } : element;
          })
        };
      });
    } else {
      setStateIconDrawingDialog?.((current: any) => current ? { ...current, smartAlignmentGuides: [] } : current);
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
}

export function createDeleteSelectedStateIconDrawingElements(__appScope: StateIconDrawingScope) {
  return () => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current: any) => {
      if (!current) {
        return current;
      }
      const selectedIds = stateIconDrawingSelectedIds(current);
      if (selectedIds.length === 0) {
        return current;
      }
      pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      const selectedSet = new Set(selectedIds);
      const elements = current.elements.filter((element: any) => !selectedSet.has(element.id));
      return {
        ...current,
        elements,
        selectedElementId: elements[0]?.id ?? "",
        selectedElementIds: elements[0]?.id ? [elements[0].id] : []
      };
    });
  };
}

export function createStateIconDrawingKeyDown(__appScope: StateIconDrawingScope) {
  return (event: ReactKeyboardEvent<HTMLElement>) => {
  const { deleteSelectedStateIconDrawingElements, setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingClipboardRef, stateIconDrawingDialog, stateIconDrawingElementId, stateIconDrawingHistoryRef } = __appScope;
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return;
    }
    const arrowDelta = ({
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }
    } as Record<string, Point>)[event.key];
    if (arrowDelta) {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      const step = event.shiftKey ? 10 : 1;
      const dx = arrowDelta.x * step;
      const dy = arrowDelta.y * step;
      setStateIconDrawingDialog((current: any) => {
        if (!current) {
          return current;
        }
        const selectedElementIds = stateIconDrawingSelectedIds(current);
        if (selectedElementIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedElementIds);
        const selectedElements = current.elements.filter((element: any) => selectedSet.has(element.id));
        const boundedDelta = clampStateIconDrawingMovementDelta(
          selectedElements,
          { x: dx, y: dy },
          stateIconDrawingMovementFrameForDialog(__appScope, current),
          stateIconDrawingMovementVisibleFrames(__appScope)
        );
        if (boundedDelta.x === 0 && boundedDelta.y === 0) {
          return current.smartAlignmentGuides?.length
            ? { ...current, smartAlignmentGuides: [] }
            : current;
        }
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element: any) => selectedSet.has(element.id)
            ? { ...element, x: element.x + boundedDelta.x, y: element.y + boundedDelta.y }
            : element),
          selectedElementIds,
          smartAlignmentGuides: []
        };
      });
      return;
    }
    if (event.key === "Enter" && stateIconDrawingDialog?.drawingDraft) {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current: any) => finishStateIconDrawingDraft(current, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current: any) => {
        if (!current) {
          return current;
        }
        if (current.drawingDraft) {
          if (current.drawingDraft.kind === "polyline") {
            const draftPoints = current.drawingDraft.points?.length
              ? current.drawingDraft.points
              : [current.drawingDraft.start];
            if (draftPoints.length > 1) {
              const previousPoints = draftPoints.slice(0, -1);
              const previousPoint = previousPoints[previousPoints.length - 1] ?? current.drawingDraft.start;
              return {
                ...current,
                drawingDraft: {
                  ...current.drawingDraft,
                  points: previousPoints,
                  current: previousPoint,
                  element: stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, previousPoints)
                },
                smartAlignmentGuides: []
              };
            }
          }
          return {
            ...current,
            drawingDraft: undefined,
            smartAlignmentGuides: []
          };
        }
        if (!stateIconDrawingHistoryRef.current?.length) {
          return current;
        }
        const previous = stateIconDrawingHistoryRef.current[stateIconDrawingHistoryRef.current.length - 1];
        stateIconDrawingHistoryRef.current = stateIconDrawingHistoryRef.current.slice(0, -1);
        const selectedElementId = previous.some((element: any) => element.id === current.selectedElementId) ? current.selectedElementId : previous[0]?.id ?? "";
        const previousElements = previous.map(cloneStateIconDrawingElementSnapshot);
        const retainedSelectionIds = current.selectedElementIds.filter((id: any) => previousElements.some((element: any) => element.id === id));
        const selectedElementIds = expandStateIconDrawingElementIds(
          previousElements,
          retainedSelectionIds.length > 0 ? retainedSelectionIds : [selectedElementId].filter(Boolean)
        );
        return {
          ...current,
          elements: previousElements,
          selectedElementId,
          selectedElementIds
        };
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current: any) => event.shiftKey
        ? ungroupStateIconDrawingSelection(current, stateIconDrawingHistoryRef)
        : groupStateIconDrawingSelection(current, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      setStateIconDrawingDialog((current: any) => {
        if (!current) {
          return current;
        }
        const selectedSet = new Set(stateIconDrawingSelectedIds(current));
        stateIconDrawingClipboardRef.current = current.elements.filter((element: any) => selectedSet.has(element.id)).map(cloneStateIconDrawingElementSnapshot);
        return current;
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current: any) => cutStateIconDrawingSelection(current, stateIconDrawingClipboardRef, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current: any) => {
        const clipboard = stateIconDrawingClipboardRef.current ?? [];
        if (!current || clipboard.length === 0) {
          return current;
        }
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        const pasted = cloneStateIconDrawingElements(clipboard, stateIconDrawingElementId);
        return {
          ...current,
          elements: [...current.elements, ...pasted],
          selectedElementId: pasted[pasted.length - 1]?.id ?? "",
          selectedElementIds: pasted.map((element) => element.id)
        };
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current: any) => current ? {
        ...current,
        selectedElementId: current.elements[current.elements.length - 1]?.id ?? "",
        selectedElementIds: current.elements.map((element: any) => element.id)
      } : current);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedStateIconDrawingElements();
    }
  };
}

export function createAddStateIconDrawingElement(__appScope: StateIconDrawingScope) {
  return (kind: StateVisualShapeKind) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current: any) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        elementLibraryTab: "basic",
        pendingElementKind: kind,
        pendingStaticTemplate: undefined,
        drawingDraft: undefined,
        selectedElementId: "",
        selectedElementIds: []
      };
    });
  };
}

export function createDeleteStateIconDrawingElement(__appScope: StateIconDrawingScope) {
  return (elementId: string) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current: any) => {
      if (!current) {
        return current;
      }
      const deleteIds = expandStateIconDrawingElementIds(current.elements, [elementId]);
      if (deleteIds.length === 0) {
        return current;
      }
      pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      const deleteSet = new Set(deleteIds);
      const elements = current.elements.filter((element: any) => !deleteSet.has(element.id));
      return {
        ...current,
        elements,
        selectedElementId: elements.some((element: any) => element.id === current.selectedElementId) ? current.selectedElementId : elements[0]?.id ?? "",
        selectedElementIds: current.selectedElementIds.filter((id: any) => elements.some((element: any) => element.id === id))
      };
    });
  };
}

export function createOpenStateIconDrawingDialog(__appScope: StateIconDrawingScope) {
  return (target: StateIconDrawingTarget) => {
  const { createStateIconDrawingInitialElements, customDeviceDraft, definitionStateDraftRows, imageAssets, setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef, stateIconDrawingInitialFrame } = __appScope;
    const row =
      target.scope === "definition"
        ? definitionStateDraftRows.find((item: any) => item.id === target.rowId)
        : customDeviceDraft.stateDefinitions.find((item: any) => item.id === target.rowId);
    const initial = createStateIconDrawingInitialElements(row, imageAssets);
    const frame = typeof stateIconDrawingInitialFrame === "function"
      ? stateIconDrawingInitialFrame(row, imageAssets, STATE_ICON_DRAFT_FRAME)
      : { ...STATE_ICON_DRAFT_FRAME };
    stateIconDrawingHistoryRef.current = [];
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog({
      target,
      elements: initial,
      selectedElementId: initial[0]?.id ?? "",
      selectedElementIds: initial[0]?.id ? [initial[0].id] : [],
      frame
    });
  };
}

export function createApplyStateIconDrawingDialog(__appScope: StateIconDrawingScope) {
  return async () => {
  const { backendImageIdFromHref, customDeviceDraft, customDraftTerminalTypes, definitionVisualDraft, definitionVisualTerminalTypes, fetchBackendImageDataUrl, imageAssetList, imageAssets, isDefaultStatePageId, isImageDataUrl, setDefinitionVisualDraft, setStateIconDrawingDialog, stateIconDrawingDialog, stateIconDrawingToImage, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow } = __appScope;
    if (!stateIconDrawingDialog) {
      return;
    }
    const assetById = new Map((imageAssetList ?? []).map((asset: ImageAsset) => [asset.id, asset]));
    const resolvedHrefByRawHref = new Map<string, string>();
    await Promise.all(stateIconDrawingDialog.elements.map(async (element: any) => {
      const rawHref = String(element?.kind === "image" ? element.imageHref ?? "" : "").trim();
      if (!rawHref || isImageDataUrl(rawHref)) {
        return;
      }
      const id = backendImageIdFromHref(rawHref);
      if (!id) {
        return;
      }
      const cachedHref = imageAssets?.[id] ?? "";
      if (isImageDataUrl(cachedHref)) {
        resolvedHrefByRawHref.set(rawHref, cachedHref);
        return;
      }
      if (typeof fetchBackendImageDataUrl !== "function") {
        return;
      }
      const asset = { ...(assetById.get(id) ?? { id, name: id, url: rawHref }) };
      asset.url = asset.url || rawHref;
      try {
        const dataUrl = await fetchBackendImageDataUrl(asset);
        if (isImageDataUrl(dataUrl)) {
          resolvedHrefByRawHref.set(rawHref, dataUrl);
        }
      } catch {
        // 单张后台图片读取失败时保留原始 href，避免阻断元件定义保存。
      }
    }));
    const resolveImageHref = (href: string) => resolvedHrefByRawHref.get(href) || href;
    const frameHasTerminals = stateIconDrawingDialog.target.scope === "definition"
      ? (Number(definitionVisualDraft?.terminalCount) || (Array.isArray(definitionVisualTerminalTypes) ? definitionVisualTerminalTypes.length : 0)) > 0
      : (Number(customDeviceDraft?.terminalCount) || (Array.isArray(customDraftTerminalTypes) ? customDraftTerminalTypes.length : 0)) > 0;
    const shouldPersistImage = stateIconDrawingDialog.elements.length > 0 ||
      stateIconDrawingFrameHasPersistedContent(stateIconDrawingDialog.frame);
    const image = shouldPersistImage
      ? stateIconDrawingToImage(stateIconDrawingDialog.elements, {
          resolveImageHref,
          frame: stateIconDrawingDialog.frame,
          frameHasTerminals
        })
      : "";
    const patch: Partial<DeviceDefinitionStateDraftRow> = {
      image,
      imageAssetId: "",
      imageFit: "fixed",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageFit: "fixed",
      imageCleared: image ? "" : "1"
    };
    if (isDefaultStatePageId(stateIconDrawingDialog.target.rowId) && stateIconDrawingDialog.target.scope === "definition") {
      setDefinitionVisualDraft((current: any) =>
        current
          ? {
              ...current,
              backgroundImage: image,
              backgroundImageAssetId: "",
              backgroundImageFit: "fixed",
              backgroundImageCleared: patch.imageCleared ?? "",
              error: ""
            }
          : current
      );
      setStateIconDrawingDialog(null);
      return;
    }
    if (stateIconDrawingDialog.target.scope === "definition") {
      updateDefinitionStateDraftRow(stateIconDrawingDialog.target.rowId, patch);
    } else {
      updateCustomDeviceStateDraftRow(stateIconDrawingDialog.target.rowId, patch);
    }
    setStateIconDrawingDialog(null);
  };
}
