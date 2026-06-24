// @ts-nocheck
import { clampNumber } from "../canvasViewport";

const STATE_ICON_DRAFT_FRAME = {
  strokeStyle: "dashed",
  strokeWidth: 1.2,
  strokeColor: "#94a3b8",
  fillColor: "#ffffff"
};

const STATE_ICON_LINE_SHAPE_KINDS = new Set(["line", "polyline", "arc", "semicircle"]);
const STATE_ICON_CLOSED_SHAPE_KINDS = new Set(["point", "triangle", "rectangle", "square", "hexagon", "polygon", "circle", "semicircle", "ellipse", "text"]);
const STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER = [
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape",
  "StaticMediaSymbol",
  "StaticFlowNode",
  "StaticContainerSymbol",
  "StaticAnnotationSymbol",
  "StaticButton"
];
const STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS = new Set([
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape"
]);
const STATE_ICON_DRAWING_FRAME_WIDTH = 240;
const STATE_ICON_DRAWING_FRAME_HEIGHT = 160;
const STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
const STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE = 3;
const STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING = 8;
const STATE_ICON_DRAWING_MIN_FONT_SIZE = 8;

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

function stateIconStaticTemplateParam(template: any, key: string, fallback = "") {
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

export function createStateIconDrawingElementFromStaticTemplate(__appScope: Record<string, any>, template: any, row?: any) {
  const {
    createImportedStateIconElement,
    createStateIconDrawingElement,
    createTemplateDefaultStateIconImage,
    svgSourceFromDataUrl
  } = __appScope;
  const baseKind = stateIconBaseStaticTemplateKind(template?.kind);
  const editableKind = STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND[baseKind];
  const size = template?.size ?? {};
  const templateWidth = Math.max(1, Number(size.width) || 96);
  const templateHeight = Math.max(1, Number(size.height) || 64);
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
  const renderedImage = createTemplateDefaultStateIconImage(__appScope, template, {
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

function stateIconDrawingSelectedIds(dialog: any) {
  return dialog?.selectedElementIds?.length > 0
    ? dialog.selectedElementIds
    : [dialog?.selectedElementId].filter(Boolean);
}

function pushStateIconDrawingHistorySnapshot(historyRef: any, elements: any[]) {
  if (!historyRef) {
    return;
  }
  const snapshot = elements.map((element) => ({ ...element }));
  historyRef.current = [...(historyRef.current ?? []), snapshot].slice(-80);
}

function cloneStateIconDrawingElements(elements: any[], createId: () => string, offset = { x: 12, y: 12 }) {
  return elements.map((element) => ({
    ...element,
    id: createId(),
    x: element.x + offset.x,
    y: element.y + offset.y
  }));
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

function cutStateIconDrawingSelection(current: any, clipboardRef: any, historyRef: any) {
  if (!current) {
    return current;
  }
  const selectedIds = stateIconDrawingSelectedIds(current);
  if (selectedIds.length === 0) {
    return current;
  }
  const selectedSet = new Set(selectedIds);
  clipboardRef.current = current.elements.filter((element) => selectedSet.has(element.id)).map((element) => ({ ...element }));
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: current.elements.filter((element) => !selectedSet.has(element.id)),
    selectedElementId: "",
    selectedElementIds: []
  };
}

function stateIconDrawingElementBounds(element: any) {
  const width = Math.max(1, Number(element.width) || 1);
  const height = Math.max(1, Number(element.height) || 1);
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

function stateIconDrawingSelectionBounds(elements: any[]) {
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

function stateIconDrawingRectFromPoints(start: Point, current: Point) {
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
  const verticalCandidates = STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => {
    const x = STATE_ICON_DRAWING_FRAME_WIDTH * ratio;
    return {
      id: `frame-x-${ratio}`,
      bounds: {
        left: x,
        right: x,
        top: 0,
        bottom: STATE_ICON_DRAWING_FRAME_HEIGHT,
        centerX: x,
        centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2
      },
      anchors: {
        x: [{ key: `frame-${ratio}`, value: x, priority: 2 }],
        y: []
      }
    };
  });
  const horizontalCandidates = STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => {
    const y = STATE_ICON_DRAWING_FRAME_HEIGHT * ratio;
    return {
      id: `frame-y-${ratio}`,
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
        y: [{ key: `frame-${ratio}`, value: y, priority: 2 }]
      }
    };
  });
  return [...verticalCandidates, ...horizontalCandidates];
}

export function createComputeStateIconDrawingSmartAlignmentSnap(__appScope: Record<string, any>) {
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
    const selectedSet = new Set(selectedIds);
    const startBounds = stateIconDrawingSelectionBounds(startElements);
    if (!startBounds) {
      return { delta, guides: [] };
    }
    const candidates = [
      ...elements
      .filter((element) => !selectedSet.has(element.id))
      .map((element) => ({ id: element.id, bounds: stateIconDrawingElementBounds(element) })),
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

function stateIconDrawingFrameDashArray(frame: any) {
  const width = Math.max(1, Number(frame?.strokeWidth) || 1);
  if (frame?.strokeStyle === "dotted") {
    return `${width * 0.2} ${width * 2}`;
  }
  if (frame?.strokeStyle === "dashed") {
    return `${width * 5} ${width * 3}`;
  }
  return undefined;
}

function clampStateIconDrawingPoint(point: Point) {
  return {
    x: clampNumber(point.x, 0, 240),
    y: clampNumber(point.y, 0, 160)
  };
}

function sameStateIconDrawingPoint(left: Point, right: Point) {
  return Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01;
}

function appendDistinctStateIconDrawingPoint(points: readonly Point[], point: Point) {
  const nextPoint = clampStateIconDrawingPoint(point);
  const lastPoint = points[points.length - 1];
  return lastPoint && sameStateIconDrawingPoint(lastPoint, nextPoint)
    ? points.map(clampStateIconDrawingPoint)
    : [...points.map(clampStateIconDrawingPoint), nextPoint];
}

function stateIconDrawingPolylineElementFromPoints(element: any, points: readonly Point[]) {
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

function stateIconDrawingElementFromPoints(element: any, startPoint: Point, currentPoint: Point) {
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

function finishStateIconDrawingDraft(current: any, historyRef: any) {
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
    drawingDraft: undefined
  };
}

function createTemplateDefaultStateIconImage(__appScope: Record<string, any>, template: any, options: Record<string, any> = {}) {
  if (!template) {
    return "";
  }
  const { DeviceGlyph, MAX_CUSTOM_DEVICE_TERMINALS, createNodeFromTemplate, escapeXml, formatSvgNumber, nodeGeometryTransform, renderSvgElementMarkup, colorDisplayMode, colorPalette } = __appScope;
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
  const visualTemplate = {
    ...template,
    label: options.label || template.label,
    size: { width, height },
    params: {
      ...template.params,
      backgroundImage: "",
      backgroundImageAssetId: ""
    },
    terminalType: terminalTypes[0] ?? template.terminalType,
    terminalCount,
    terminalTypes,
    terminalLabels: (options.terminalLabels ?? template.terminalLabels ?? []).slice(0, terminalCount),
    terminalAnchors: (options.terminalAnchors ?? template.terminalAnchors ?? []).slice(0, terminalCount)
  };
  const node = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
  const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual: null }));
  const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual: null }));
  const padding = 12;
  const viewBoxX = -width / 2 - padding;
  const viewBoxY = -height / 2 - padding;
  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="${formatSvgNumber(viewBoxX)} ${formatSvgNumber(viewBoxY)} ${formatSvgNumber(viewBoxWidth)} ${formatSvgNumber(viewBoxHeight)}"><g transform="${escapeXml(nodeGeometryTransform(node))}">${glyphMarkup}${glyphTextMarkup}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createOpenEdgeContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGPathElement>, edgeId: string, routePoints?: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, canvasInteractionRef, clampPointToCanvas, lastCanvasPointerRef, lastRawCanvasPointerRef, openGraphicContextMenu, projectListPointerInsideRef, screenToSvgPoint, selectCanvasGraphics, svgRef, updateMouseStatus } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      pointer = clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    selectCanvasGraphics([], [edgeId]);
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "edge",
      canvasPoint: pointer,
      edgeId,
      routePoints: routePoints?.map((point) => ({ ...point }))
    });
  };
}

export function createCaptureCanvasPointer(__appScope: Record<string, any>) {
  return (pointerId: number) => {
  const { svgRef } = __appScope;
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
  };
}

export function createStartManualSegmentDrag(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGPathElement>,
    edgeId: string,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
  const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, hasCanvasSelectionModifier, insertManualBendAtPoint, isBrowseMode, routeManualPoints, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createStartManualPointDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGCircleElement>, edgeId: string, pointIndex: number, routePoints: Point[]) => {
  const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, findBendInsertRouteSegmentIndex, hasCanvasSelectionModifier, insertManualBendAtPoint, isBrowseMode, routeManualPoints, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      const segmentIndex = findBendInsertRouteSegmentIndex(routePoints, pointer);
      if (segmentIndex >= 0) {
        edgePointerBendInsertRef.current = {
          edgeId,
          clientX: event.clientX,
          clientY: event.clientY,
          at: Date.now()
        };
        insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      }
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createRouteSegmentPointerDistance(__appScope: Record<string, any>) {
  return (point: Point, from: Point, to: Point) => {
    if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      if (point.x >= minX && point.x <= maxX) {
        return Math.abs(point.y - from.y);
      }
    } else if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      if (point.y >= minY && point.y <= maxY) {
        return Math.abs(point.x - from.x);
      }
    }
    return Math.min(
      Math.hypot(point.x - from.x, point.y - from.y),
      Math.hypot(point.x - to.x, point.y - to.y)
    );
  };
}

export function createFindEditableRouteSegmentIndex(__appScope: Record<string, any>) {
  return (routePoints: Point[], point: Point) => {
  const { routeSegmentPointerDistance, sameOptionalPoint } = __appScope;
    const candidates = routePoints
      .slice(0, -1)
      .map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    return candidates.reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
      const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
      return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
    }, null)?.index ?? -1;
  };
}

export function createConnectionHitTolerance(__appScope: Record<string, any>) {
  return () => {
  const { CONNECTION_HIT_SCREEN_TOLERANCE, svgRef } = __appScope;
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!svg || !rect || rect.width <= 0 || rect.height <= 0) {
      return 16;
    }
    const svgViewBox = svg.viewBox.baseVal;
    const xTolerance = (svgViewBox.width / rect.width) * CONNECTION_HIT_SCREEN_TOLERANCE;
    const yTolerance = (svgViewBox.height / rect.height) * CONNECTION_HIT_SCREEN_TOLERANCE;
    return Math.max(xTolerance, yTolerance);
  };
}

export function createFindConnectionRouteHitAtPoint(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { activeLayerEdgeIdSet, connectionHitTolerance, queryRouteSpatialIndex, routeSegmentPointerDistance, routedEdgeIndexById, routedEdgeSpatialIndex } = __appScope;
    const tolerance = connectionHitTolerance();
    const hitBounds = {
      left: point.x - tolerance,
      right: point.x + tolerance,
      top: point.y - tolerance,
      bottom: point.y + tolerance
    };
    return queryRouteSpatialIndex(routedEdgeSpatialIndex, hitBounds)
      .filter((route) => activeLayerEdgeIdSet.has(route.edgeId))
      .flatMap((route) =>
        route.points.slice(0, -1).map((from, segmentIndex) => ({
          edgeId: route.edgeId,
          routePoints: route.points,
          distance: routeSegmentPointerDistance(point, from, route.points[segmentIndex + 1]),
          routeOrder: routedEdgeIndexById.get(route.edgeId) ?? -1,
          segmentIndex
        }))
      )
      .filter((candidate) => candidate.distance <= tolerance)
      .sort((first, second) =>
        first.distance - second.distance ||
        second.routeOrder - first.routeOrder ||
        first.segmentIndex - second.segmentIndex
      )[0] ?? null;
  };
}

export function createInsertManualBendAtPoint(__appScope: Record<string, any>) {
  return (edgeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
  const { activeLayerEdgeIdSet, canvasBounds, insertOrthogonalRouteBend, pushUndoSnapshot, requireEditMode, routeManualPoints, setEdgeManualPoints } = __appScope;
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = insertOrthogonalRouteBend(routePoints, segmentIndex, clickPoint, canvasBounds);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints), nextPoints);
  };
}

export function createInsertManualBendFromPointer(__appScope: Record<string, any>) {
  return (edgeId: string, routePoints: Point[], clickPoint: Point) => {
  const { findEditableRouteSegmentIndex, insertManualBendAtPoint } = __appScope;
    const segmentIndex = findEditableRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, clickPoint);
      return true;
    }
    return false;
  };
}

export function createAddManualBendFromContextMenu(__appScope: Record<string, any>) {
  return () => {
  const { contextMenu, insertManualBendFromPointer, lastCanvasPointerRef, selectedEdgeId, selectedRoutedEdge } = __appScope;
    const edgeId = contextMenu?.edgeId ?? selectedEdgeId;
    const routePoints = contextMenu?.routePoints ?? selectedRoutedEdge?.points;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!edgeId || !routePoints?.length || !point) {
      return;
    }
    insertManualBendFromPointer(edgeId, routePoints, point);
  };
}

export function createAddRoutableLineBendFromContextMenu(__appScope: Record<string, any>) {
  return () => {
  const { contextMenu, insertRoutableLineBendFromPointer, isRoutableLineDeviceKind, lastCanvasPointerRef, nodeById, routableLineDeviceCanvasPoints } = __appScope;
    const nodeId = contextMenu?.nodeId;
    const lineNode = nodeId ? nodeById.get(nodeId) : undefined;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!nodeId || !lineNode || !isRoutableLineDeviceKind(lineNode.kind) || !point) {
      return;
    }
    const routePoints = contextMenu?.routePoints ?? routableLineDeviceCanvasPoints(lineNode);
    if (routePoints.length < 2) {
      return;
    }
    insertRoutableLineBendFromPointer(nodeId, routePoints, point);
  };
}

export function createInsertManualBendFromEdgePath(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGElement>, edgeId: string, routePoints: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, clampPointToCanvas, edgePointerBendInsertRef, insertManualBendFromPointer, requireEditMode, screenToSvgPoint, selectCanvasGraphics, staticDrawing, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (staticDrawing) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const pointerInsertedBend = edgePointerBendInsertRef.current;
    if (
      pointerInsertedBend &&
      pointerInsertedBend.edgeId === edgeId &&
      Date.now() - pointerInsertedBend.at < 800 &&
      Math.hypot(event.clientX - pointerInsertedBend.clientX, event.clientY - pointerInsertedBend.clientY) <= 8
    ) {
      edgePointerBendInsertRef.current = null;
      return;
    }
    if (!svgRef.current) {
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    insertManualBendFromPointer(edgeId, routePoints, clickPoint);
  };
}

export function createHandleEdgePathPointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGPathElement>, edgeId: string, routePoints: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, appendStaticDrawingPoint, clampPointToCanvas, edgePointerBendInsertRef, hasCanvasSelectionModifier, insertManualBendFromPointer, isBrowseMode, isRepeatedEdgePointerClick, lastEdgePointerClickRef, screenToSvgPoint, selectCanvasGraphics, startModifierSelectionPress, staticDrawing, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    if (staticDrawing) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      activateInspectorFromCanvas();
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const edgeClick = {
      edgeId,
      clientX: event.clientX,
      clientY: event.clientY,
      at: Date.now()
    };
    const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
    lastEdgePointerClickRef.current = edgeClick;
    if (event.detail < 2 && !repeatedClick) {
      return;
    }
    event.preventDefault();
    if (insertManualBendFromPointer(edgeId, routePoints, clickPoint)) {
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      lastEdgePointerClickRef.current = null;
    }
  };
}

export function createDeleteManualBendPoint(__appScope: Record<string, any>) {
  return (edgeId: string, routePointIndex: number, routePoints: Point[]) => {
  const { activeLayerEdgeIdSet, pushUndoSnapshot, requireEditMode, routeManualPoints, setEdgeManualPoints } = __appScope;
    if (!requireEditMode("删除连接线拐点")) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints), nextPoints);
  };
}

export function createSetRoutableLineManualPathPoints(__appScope: Record<string, any>) {
  return (nodeId: string, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, isRoutableLineDeviceKind, nodeById, patchGraphNodes, requireEditMode, setRoutableLineDeviceCanvasPoints } = __appScope;
    if (!requireEditMode("修改可变线路路径")) {
      return;
    }
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return;
    }
    const nextNode = setRoutableLineDeviceCanvasPoints(lineNode, routePoints);
    if (nextNode !== lineNode) {
      patchGraphNodes([nextNode]);
    }
  };
}

export function createInsertRoutableLineBendAtPoint(__appScope: Record<string, any>) {
  return (nodeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
  const { activeLayerNodeIdSet, canvasBounds, insertRoutableLineDeviceBend, isRoutableLineDeviceKind, nodeById, patchGraphNodes, pushUndoSnapshot, requireEditMode, setRoutableLineDeviceCanvasPoints, writeOperationLog } = __appScope;
    if (!requireEditMode("添加可变线路拐点")) {
      return false;
    }
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return false;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return false;
    }
    pushUndoSnapshot();
    const baseNode = setRoutableLineDeviceCanvasPoints(lineNode, routePoints);
    const nextNode = insertRoutableLineDeviceBend(baseNode, segmentIndex, clickPoint, canvasBounds);
    if (nextNode !== lineNode) {
      patchGraphNodes([nextNode]);
      writeOperationLog(`添加可变线路拐点：${nextNode.name}`);
    }
    return true;
  };
}

export function createInsertRoutableLineBendFromPointer(__appScope: Record<string, any>) {
  return (nodeId: string, routePoints: Point[], clickPoint: Point) => {
  const { findEditableRouteSegmentIndex, insertRoutableLineBendAtPoint } = __appScope;
    const segmentIndex = findEditableRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      return insertRoutableLineBendAtPoint(nodeId, segmentIndex, routePoints, clickPoint);
    }
    return false;
  };
}

export function createStartRoutableLineSegmentDrag(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGPathElement>,
    node: ModelNode,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
  const { activeLayerNodeIdSet, captureCanvasPointer, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendAtPoint, isBrowseMode, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      insertRoutableLineBendAtPoint(node.id, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setManualPathDrag({
      nodeId: node.id,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: [],
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createStartRoutableLinePointDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode, pointIndex: number, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, captureCanvasPointer, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendFromPointer, isBrowseMode, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      insertRoutableLineBendFromPointer(node.id, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setManualPathDrag({
      nodeId: node.id,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: [],
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createDeleteRoutableLineBendPoint(__appScope: Record<string, any>) {
  return (nodeId: string, routePointIndex: number, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, pushUndoSnapshot, requireEditMode, setRoutableLineManualPathPoints } = __appScope;
    if (!requireEditMode("删除可变线路拐点")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId) || routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setRoutableLineManualPathPoints(nodeId, nextPoints);
  };
}

export function createStartConnectFromTerminal(__appScope: Record<string, any>) {
  return (node: ModelNode, terminalId: string, point?: Point) => {
  const { activeLayerNodeIdSet, applyConnectPreviewState, getModelEdgeEndpointPoint, requireEditMode, resetRoutableLinePreviewState, setCanvasSelectionScope, setConnectSource, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    if (!requireEditMode("建立连接线")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const sourcePoint = point ?? getModelEdgeEndpointPoint(node, undefined, terminalId);
    const nextConnectSource: NonNullable<typeof connectSource> = point ? { nodeId: node.id, terminalId, point } : { nodeId: node.id, terminalId };
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setConnectSource(nextConnectSource);
    applyConnectPreviewState(sourcePoint, false, null, null, nextConnectSource);
    setMode("connect");
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
  };
}

export function createFinishTerminalPress(__appScope: Record<string, any>) {
  return () => {
  const { busAnchorFromPoint, isBusNode, nodeById, patchSingleTerminalAnchorFromPoint, setTerminalPress, startConnectFromTerminal, terminalPress } = __appScope;
    if (!terminalPress) {
      return;
    }
    const node = nodeById.get(terminalPress.nodeId);
    if (!node) {
      setTerminalPress(null);
      return;
    }
    const busPoint = isBusNode(node) ? busAnchorFromPoint(node, terminalPress.startPoint) : undefined;
    if (!terminalPress.moved) {
      startConnectFromTerminal(node, terminalPress.terminalId, busPoint);
      setTerminalPress(null);
      return;
    }
    if (!isBusNode(node) && node.terminals.length === 1) {
      patchSingleTerminalAnchorFromPoint(
        terminalPress.nodeId,
        terminalPress.terminalId,
        terminalPress.currentPoint,
        terminalPress.startPoint
      );
    }
    setTerminalPress(null);
  };
}

export function createHandleTerminalPointerDown(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
  const { activeLayerNodeIdSet, appendStaticDrawingPoint, busAnchorFromEvent, busAnchorFromPoint, canConnectTerminals, canvasBounds, clampPointToCanvas, commitNewConnectionEdge, connectPreviewPointRef, connectSource, connectTargetTerminalType, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, finishConnectToTarget, finishRoutableLineToTarget, getTerminalPoint, hasCanvasSelectionModifier, isBrowseMode, isBusNode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, prepareConnectionEdgeForCommit, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, pushUndoSnapshot, resetConnectPreviewState, resolveStraightBusSlideEndpointToPoint, rewiring, routableLinePlacement, routableLineTemplateTerminalType, routedEdges, routingNodesForConnectionEdge, screenToSvgPoint, setCanvasSelectionScope, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, startConnectFromTerminal, startModifierSelectionPress, startRoutableLineFromTerminal, staticDrawing, svgRef, visibleNodeById, writeOperationLog } = __appScope;
    event.stopPropagation();
    if (staticDrawing && event.button === 0 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      setCanvasSelectionScope("direct");
      setSelectedNodeIds([node.id]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      return;
    }
    if (routableLinePlacement && event.button === 0 && svgRef.current) {
      const busPoint = busAnchorFromEvent(node, event);
      const target: ConnectTarget = { node, terminalId, point: busPoint };
      if (routableLinePlacement.source) {
        if (connectTargetTerminalType(target) === routableLineTemplateTerminalType(routableLinePlacement.template)) {
          finishRoutableLineToTarget(target, routableLinePlacement.manualPoints);
        }
      } else {
        startRoutableLineFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && svgRef.current && !rewiring) {
      event.preventDefault();
      const busPoint = busAnchorFromEvent(node, event);
      if (connectSource) {
        const target: ConnectTarget = { node, terminalId, point: busPoint };
        finishConnectToTarget(target, busPoint ?? getTerminalPoint(node, terminalId));
      } else {
        // 普通点击直接启动连接预览，无需Ctrl键
        startConnectFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    const busPoint = busAnchorFromEvent(node, event);
    if (rewiring) {
      const edge = edgeById.get(rewiring.edgeId);
      const otherNode = edge ? nodeById.get(rewiring.endpoint === "source" ? edge.targetId : edge.sourceId) : undefined;
      const otherTerminalId = rewiring.endpoint === "source" ? edge?.targetTerminalId : edge?.sourceTerminalId;
      if (edge && otherNode && otherTerminalId && canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
        const movingPoint = busPoint ?? getTerminalPoint(node, terminalId);
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const rewiredEdge =
          rewiring.endpoint === "source"
            ? { ...edge, sourceId: node.id, sourceTerminalId: terminalId, sourcePoint: busPoint }
            : { ...edge, targetId: node.id, targetTerminalId: terminalId, targetPoint: busPoint };
        const slidePatch = sourceNode && targetNode
          ? resolveStraightBusSlideEndpointToPoint({
              edge,
              sourceNode,
              targetNode,
              movingEndpoint: rewiring.endpoint,
              movingPoint,
              nodes,
              movingNode: node,
              movingTerminalId: terminalId
            })
          : null;
        const candidateEdge = slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge;
        const routingNodes = routingNodesForConnectionEdge(candidateEdge, nodes);
        const edgeForCommit = preserveConnectionEdgeRouteShape(
          routingNodes,
          candidateEdge,
          previewStoredRoutePointsForEdge(edge),
          canvasBounds
        );
        const endpointRuleMessage = connectionEndpointRuleFailureMessage(edgeForCommit);
        const prepared = endpointRuleMessage
          ? null
          : prepareConnectionEdgeForCommit(
          routingNodes,
          [edgeForCommit],
          edge.id,
          canvasBounds,
          routedEdges,
          { preserveManualRouteDisplay: Boolean(edgeForCommit.manualPoints?.length) }
        );
        if (prepared?.ok && prepared.edge) {
          const preparedEdge = prepared.edge;
          pushUndoSnapshot();
          markRouteEdgesDirty([edge.id]);
          markStoredRouteEdgesDirty([edge.id]);
          markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
          patchGraphEdges([preparedEdge]);
        } else {
          const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
          window.alert(`联络线端子调整失败：${message}`);
          writeOperationLog(`联络线端子调整失败：${message}`);
        }
      }
      setRewiring(null);
      return;
    }
    if (!connectSource) {
      return;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (sourceNode?.id === node.id && connectSource.terminalId === terminalId) {
      return;
    }
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)) {
      return;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      manualPoints: connectSource.manualPoints,
      targetTerminalId: terminalId,
      targetPoint: isBusNode(node) ? busAnchorFromPoint(node, connectPreviewPointRef.current ?? busPoint ?? getTerminalPoint(node, terminalId)) : busPoint
    };
    commitNewConnectionEdge(newEdge, sourceNode.name, node.name);
  };
}

export function createEnsureSavedBeforeExport(__appScope: Record<string, any>) {
  return () => {
  const { canExportCurrentModel } = __appScope;
    if (canExportCurrentModel) {
      return true;
    }
    window.alert("当前模型存在未保存修改，请先保存后再导出文件。");
    return false;
  };
}

export function createSvgExportReferencedImageHrefById(__appScope: Record<string, any>) {
  return () => {
  const { backendImageIdFromHref, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageUrl, imageAssets, libraryTemplateByKind, nodes, resolveDeviceStateVisual, resolveStateVisualImageHref } = __appScope;
    const hrefById = new Map<string, string>();
    const appendAssetId = (assetId?: string) => {
      const id = String(assetId ?? "").trim();
      if (id && !hrefById.has(id)) {
        hrefById.set(id, `/api/images/${encodeURIComponent(id)}`);
      }
    };
    const appendHref = (href?: string) => {
      const value = String(href ?? "").trim();
      const id = backendImageIdFromHref(value);
      if (id && !hrefById.has(id)) {
        hrefById.set(id, value);
      }
    };

    appendAssetId(canvasBackgroundImageAssetId);
    appendHref(canvasBackgroundImage);
    appendHref(canvasBackgroundImageUrl);
    for (const node of nodes) {
      appendAssetId(node.params.backgroundImageAssetId);
      appendAssetId(node.params.foregroundImageAssetId);
      appendHref(node.params.backgroundImage);
      appendHref(node.params.foregroundImage);
      const template = libraryTemplateByKind.get(node.kind);
      const stateVisual = template ? resolveDeviceStateVisual(template, node) : null;
      appendHref(resolveStateVisualImageHref(stateVisual, imageAssets));
    }
    return hrefById;
  };
}

export function createLoadSvgImageExportPathById(__appScope: Record<string, any>) {
  return async () => {
  const { fetchAllBackendImages, fetchBackendImageDataUrl, imageAssetList, imageAssets, imageExportPathByIdFromAssets, isImageDataUrl, svgExportReferencedImageHrefById } = __appScope;
    let assets = imageAssetList;
    try {
      const backendAssets = await fetchAllBackendImages();
      const mergedById = new Map<string, ImageAsset>();
      for (const asset of assets) {
        mergedById.set(asset.id, asset);
      }
      for (const asset of backendAssets) {
        const existing = mergedById.get(asset.id);
        mergedById.set(asset.id, existing ? { ...existing, ...asset } : asset);
      }
      assets = Array.from(mergedById.values());
    } catch {
      // 后端图片清单不可用时，保持现有导出逻辑，不影响本地图形导出。
    }
    const exportHrefById = imageExportPathByIdFromAssets(assets, imageAssets);
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const referencedHrefById = svgExportReferencedImageHrefById();
    await Promise.all(Array.from(referencedHrefById.entries()).map(async ([id, href]) => {
      if (exportHrefById[id]) {
        return;
      }
      const asset = { ...(assetById.get(id) ?? { id, name: id, url: href }) };
      asset.url = asset.url || href;
      try {
        const dataUrl = await fetchBackendImageDataUrl(asset);
        if (isImageDataUrl(dataUrl)) {
          exportHrefById[id] = dataUrl;
        }
      } catch {
        // 单张图片无法读取时，保留原始 href，避免阻断 SVG 导出。
      }
    }));
    return exportHrefById;
  };
}

export function createExportSvg(__appScope: Record<string, any>) {
  return async () => {
  const { DEFAULT_CANVAS_BACKGROUND, activeLayerId, buildSvgDocument, canvasBackgroundColor, canvasBackgroundImageUrl, canvasBounds, colorDisplayMode, colorPalette, edges, ensureSavedBeforeExport, layers, libraryTemplates, loadSvgImageExportPathById, measurementConfig, nodes, projectMeasurements, projectName, safeFilePart, saveTextFile, writeOperationLog } = __appScope;
    if (!ensureSavedBeforeExport()) {
      return;
    }
    const imageExportPathById = await loadSvgImageExportPathById();
    await saveTextFile({
      filename: `${safeFilePart(projectName)}.svg`,
      text: buildSvgDocument(nodes, edges, {
        ...canvasBounds,
        backgroundColor: canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND,
        backgroundImage: canvasBackgroundImageUrl,
        imageExportPathById,
        colorDisplayMode,
        colorPalette,
        deviceTemplates: libraryTemplates,
        layers,
        activeLayerId,
        measurements: projectMeasurements,
        measurementConfig
      }),
      mime: "image/svg+xml",
      description: "SVG 图形文件",
      extensions: [".svg"]
    });
    writeOperationLog(`导出图形文件：${projectName}.svg`);
  };
}

export function createExportEFile(__appScope: Record<string, any>) {
  return async () => {
  const { buildEFileExport, currentProject, ensureSavedBeforeExport, getEExportWarnings, saveTextFile, writeOperationLog } = __appScope;
    if (!ensureSavedBeforeExport()) {
      return;
    }
    const project = currentProject();
    const warnings = getEExportWarnings(project);
    if (warnings.length > 0) {
      window.alert(
        [
          `有 ${warnings.length} 个图上设备未导出到 E 文件：`,
          ...warnings.slice(0, 20).map((warning) => `- ${warning.nodeName}（${warning.kind}）：${warning.reason}`),
          warnings.length > 20 ? `... 还有 ${warnings.length - 20} 个设备未列出。` : ""
        ].filter(Boolean).join("\n")
      );
    }
    const file = buildEFileExport(project);
    await saveTextFile({
      filename: file.filename,
      text: file.text,
      mime: file.mime,
      description: "E 模型文件",
      extensions: [".e"]
    });
    writeOperationLog(`导出模型文件：${file.filename}`);
  };
}

export function createIsProjectFilePayload(__appScope: Record<string, any>) {
  return (value: unknown): value is ProjectFile => {
  const { isObjectRecord } = __appScope;
    if (!isObjectRecord(value)) {
      return false;
    }
    return value.version === 1 && Array.isArray(value.nodes) && Array.isArray(value.edges);
  };
}

export function createCreateImportedSchemeRecord(__appScope: Record<string, any>) {
  return (text: string, fileName: string): SavedSchemeRecord => {
  const { createSavedProject, createSavedScheme, isObjectRecord, isProjectFilePayload } = __appScope;
    const payload = JSON.parse(text) as unknown;
    const payloadRecord = isObjectRecord(payload) ? payload : null;
    const rawScheme =
      payloadRecord && isObjectRecord(payloadRecord.scheme)
        ? payloadRecord.scheme
        : payloadRecord && Array.isArray(payloadRecord.schemes) && isObjectRecord(payloadRecord.schemes[0])
          ? payloadRecord.schemes[0]
          : payloadRecord;
    if (!rawScheme || !Array.isArray(rawScheme.projects)) {
      throw new Error("方案文件格式不正确。");
    }
    const fileBaseName = fileName.replace(/\.scheme\.json$/i, "").replace(/\.json$/i, "");
    const importedName = typeof rawScheme.name === "string" && rawScheme.name.trim() ? rawScheme.name.trim() : fileBaseName || "导入方案";
    const importedProjects = rawScheme.projects.map((projectPayload, index) => {
      const projectRecord = isObjectRecord(projectPayload) ? projectPayload : null;
      const projectFile = projectRecord && isProjectFilePayload(projectRecord.project)
        ? projectRecord.project
        : isProjectFilePayload(projectPayload)
          ? projectPayload
          : null;
      if (!projectFile) {
        throw new Error(`方案文件中的第 ${index + 1} 个模型格式不正确。`);
      }
      const importedProjectName =
        projectRecord && typeof projectRecord.name === "string" && projectRecord.name.trim()
          ? projectRecord.name.trim()
          : projectFile.name || `导入模型${index + 1}`;
      return createSavedProject(importedProjectName, projectFile);
    });
    const importedChildren: SavedSchemeRecord[] = Array.isArray(rawScheme.children)
      ? rawScheme.children.map((childPayload, index): SavedSchemeRecord => {
          try {
            return createImportedSchemeRecord(JSON.stringify(childPayload), `子方案${index + 1}.json`);
          } catch (error) {
            throw new Error(error instanceof Error ? `子方案${index + 1}：${error.message}` : `子方案${index + 1}格式不正确。`);
          }
        })
      : [];
    return createSavedScheme(importedName, importedProjects, importedChildren);
  };
}

export function createExportProjectRecordFile(__appScope: Record<string, any>) {
  return async (project: SavedProjectRecord) => {
  const { activeProjectKey, currentProject, projectName, safeFilePart, saveTextFile, serializeProject, writeOperationLog } = __appScope;
    const projectFile = project.id === activeProjectKey ? currentProject() : project.project;
    const exportName = project.id === activeProjectKey ? projectName : project.name;
    await saveTextFile({
      filename: `${safeFilePart(exportName)}.json`,
      text: serializeProject(projectFile),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"]
    });
    writeOperationLog(`导出模型文件：${exportName}.json`);
  };
}

export function createExportCurrentModelFile(__appScope: Record<string, any>) {
  return async () => {
  const { currentProject, projectName, safeFilePart, saveTextFile, serializeProject, writeOperationLog } = __appScope;
    await saveTextFile({
      filename: `${safeFilePart(projectName)}.json`,
      text: serializeProject(currentProject()),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"]
    });
    writeOperationLog(`导出当前模型文件：${projectName}.json`);
  };
}

export function createOpenModelImportFilePicker(__appScope: Record<string, any>) {
  return (targetSchemeId = "") => {
  const { modelImportInputRef, modelImportTargetSchemeIdRef, requireEditMode } = __appScope;
    if (!requireEditMode("导入模型")) {
      return;
    }
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    modelImportInputRef.current?.click();
  };
}

export function createOpenSchemeImportFilePicker(__appScope: Record<string, any>) {
  return (parentSchemeId = "") => {
  const { requireEditMode, schemeImportInputRef, schemeImportParentSchemeIdRef } = __appScope;
    if (!requireEditMode("导入方案")) {
      return;
    }
    schemeImportParentSchemeIdRef.current = parentSchemeId;
    if (schemeImportInputRef.current) {
      schemeImportInputRef.current.value = "";
      schemeImportInputRef.current.click();
    }
  };
}

export function createMergeImportedSchemeIntoExisting(__appScope: Record<string, any>) {
  return (existingScheme: SavedSchemeRecord, importedScheme: SavedSchemeRecord): SavedSchemeRecord => {
  const { hasSameName, upsertSavedProject } = __appScope;
    const now = new Date().toISOString();
    const nextProjects = importedScheme.projects.reduce<SavedProjectRecord[]>((current, importedProject) => {
      const duplicateProject = current.find((project) => hasSameName(project.name, [importedProject.name]));
      if (!duplicateProject) {
        return upsertSavedProject(current, importedProject);
      }
      return upsertSavedProject(current, {
        ...importedProject,
        id: duplicateProject.id,
        name: duplicateProject.name,
        project: { ...importedProject.project, name: duplicateProject.name }
      });
    }, existingScheme.projects);
    const nextChildren = (importedScheme.children ?? []).reduce<SavedSchemeRecord[]>((current, importedChild) => {
      const duplicateChild = current.find((child) => hasSameName(child.name, [importedChild.name]));
      if (!duplicateChild) {
        return [...current, importedChild];
      }
      return current.map((child) => child.id === duplicateChild.id ? mergeImportedSchemeIntoExisting(child, importedChild) : child);
    }, existingScheme.children ?? []);
    return { ...existingScheme, updatedAt: now, projects: nextProjects, children: nextChildren };
  };
}

export function createCommitImportedSchemeRecord(__appScope: Record<string, any>) {
  return (importedScheme: SavedSchemeRecord, parentSchemeId = "") => {
  const { insertChildSavedScheme, persistSchemeTreeToBackend, schemePathForScheme, selectSingleScheme, setExpandedSchemeIds, setSchemes, writeOperationLog } = __appScope;
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, importedScheme));
    persistSchemeTreeToBackend(importedScheme, parentPath, `导入方案：${importedScheme.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    setExpandedSchemeIds((current) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
    selectSingleScheme(importedScheme.id);
    writeOperationLog(`导入方案：${importedScheme.name}`);
  };
}

export function createApplyBackendSchemeArchiveImport(__appScope: Record<string, any>) {
  return (payload: BackendSchemeArchiveImportResponse, fallbackName: string) => {
  const { findSavedSchemeByPath, hydrateSavedSchemeRuntimeIds, normalizeSavedSchemeIndexes, rememberPersistedSchemesPayload, selectSingleScheme, serializeSchemesForStorage, setExpandedSchemeIds, setSchemesState, suppressNextBackendSchemeSyncRef, writeOperationLog } = __appScope;
    const importedPath = Array.isArray(payload.importedPath) ? payload.importedPath : [];
    const backendSchemes = hydrateSavedSchemeRuntimeIds((payload.schemes ?? []).map(normalizeSavedSchemeIndexes));
    suppressNextBackendSchemeSyncRef.current = true;
    rememberPersistedSchemesPayload(serializeSchemesForStorage(backendSchemes));
    setSchemesState(backendSchemes);
    const importedScheme = importedPath.length > 0 ? findSavedSchemeByPath(backendSchemes, importedPath) : null;
    if (importedScheme) {
      const parentPath = importedPath.slice(0, -1);
      const parentScheme = parentPath.length > 0 ? findSavedSchemeByPath(backendSchemes, parentPath) : null;
      if (parentScheme) {
        setExpandedSchemeIds((current) => (current.includes(parentScheme.id) ? current : [...current, parentScheme.id]));
      }
      setExpandedSchemeIds((current) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
      selectSingleScheme(importedScheme.id);
    }
    writeOperationLog(`导入方案压缩包：${payload.importedName || fallbackName}`);
  };
}

export function createImportSchemeFile(__appScope: Record<string, any>) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const { applyBackendSchemeArchiveImport, commitImportedSchemeRecord, createImportedSchemeRecord, findSavedSchemeById, hasSameName, requireEditMode, schemeImportParentSchemeIdRef, schemePathForScheme, schemes, setPendingSchemeImportConflict, uploadBackendSchemeArchive } = __appScope;
    const input = event.currentTarget;
    if (!requireEditMode("导入方案")) {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    try {
      if (/\.zip$/iu.test(file.name)) {
        const parentSchemeId = schemeImportParentSchemeIdRef.current;
        const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
        const payload = await uploadBackendSchemeArchive(file, parentPath);
        if (payload.conflict) {
          setPendingSchemeImportConflict({
            importFile: file,
            importedPath: payload.parentPath,
            importedName: payload.importedName || file.name.replace(/\.zip$/iu, "") || "导入方案",
            duplicateSchemeName: payload.duplicateSchemeName || payload.importedName || "同名方案",
            targetParentSchemeId: parentSchemeId
          });
          return;
        }
        applyBackendSchemeArchiveImport(payload, file.name);
        return;
      }
      const text = await file.text();
      const importedScheme = createImportedSchemeRecord(text, file.name);
      const parentSchemeId = schemeImportParentSchemeIdRef.current;
      const targetSchemes = parentSchemeId ? findSavedSchemeById(schemes, parentSchemeId)?.children ?? [] : schemes;
      const duplicateScheme = targetSchemes.find((scheme) => hasSameName(importedScheme.name, [scheme.name]));
      if (duplicateScheme) {
        setPendingSchemeImportConflict({
          importedScheme,
          importedName: importedScheme.name,
          duplicateSchemeId: duplicateScheme.id,
          duplicateSchemeName: duplicateScheme.name,
          targetParentSchemeId: parentSchemeId
        });
        return;
      }
      commitImportedSchemeRecord(importedScheme, parentSchemeId);
    } catch (error) {
      window.alert(error instanceof Error ? `导入方案失败：${error.message}` : "导入方案失败。");
    } finally {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createCommitImportedModelRecord(__appScope: Record<string, any>) {
  return (targetScheme: SavedSchemeRecord, importedRecord: SavedProjectRecord) => {
  const { findSavedSchemeById, handleBackendSchemeMutationFailure, loadSavedProject, saveBackendProjectRecord, schemePathForRecord, setExpandedSchemeIds, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current) => {
      const fallback = current.length > 0 ? current : [targetScheme];
      const nextSchemes = findSavedSchemeById(fallback, targetScheme.id) ? fallback : [...fallback, targetScheme];
      return upsertSavedProjectInScheme(nextSchemes, targetScheme.id, importedRecord);
    });
    void saveBackendProjectRecord(targetPath, importedRecord)
      .catch((error) => handleBackendSchemeMutationFailure(`导入模型同步后台：${importedRecord.name}`, error));
    setExpandedSchemeIds((current) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    loadSavedProject(importedRecord, targetScheme.id);
    writeOperationLog(`导入模型文件：${importedRecord.name}`);
  };
}

export function createImportModelFile(__appScope: Record<string, any>) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const { activeSchemeRecord, commitImportedModelRecord, createSavedProject, createSavedScheme, deserializeProject, findSavedSchemeById, modelImportTargetSchemeIdRef, requireEditMode, schemes, selectedSchemeRecord, setPendingModelImportConflict } = __appScope;
    const input = event.currentTarget;
    if (!requireEditMode("导入模型")) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedProject = deserializeProject(text);
      const importTargetSchemeId = modelImportTargetSchemeIdRef.current;
      const targetScheme =
        findSavedSchemeById(schemes, importTargetSchemeId) ??
        activeSchemeRecord ??
        selectedSchemeRecord ??
        schemes[0] ??
        createSavedScheme("默认方案");
      const fileBaseName = file.name.replace(/\.json$/i, "");
      const importedName = (importedProject.name || fileBaseName || "导入模型").trim() || "导入模型";
      const duplicateProject = targetScheme.projects.find((project) => project.name.trim() === importedName.trim());
      if (duplicateProject) {
        setPendingModelImportConflict({
          targetSchemeId: targetScheme.id,
          importedProject,
          importedName,
          duplicateProjectId: duplicateProject.id,
          duplicateProjectName: duplicateProject.name
        });
        return;
      }
      commitImportedModelRecord(targetScheme, createSavedProject(importedName, importedProject));
    } catch (error) {
      window.alert(error instanceof Error ? `导入模型文件失败：${error.message}` : "导入模型文件失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createResolveDuplicateSchemeImport(__appScope: Record<string, any>) {
  return (action: "merge" | "rename" | "cancel") => {
  const { applyBackendSchemeArchiveImport, commitImportedSchemeRecord, findSavedSchemeById, mergeImportedSchemeIntoExisting, pendingSchemeImportConflict, persistSchemeTreeToBackend, promptUniqueRecordName, replaceSavedSchemeById, requireEditMode, savedChildSchemeNames, schemePathForRecord, schemePathForScheme, schemes, selectSingleScheme, setExpandedSchemeIds, setPendingSchemeImportConflict, setSchemes, uniqueRecordName, uploadBackendSchemeArchive, writeOperationLog } = __appScope;
    const conflict = pendingSchemeImportConflict;
    if (!conflict || action === "cancel") {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (!requireEditMode("处理方案导入冲突")) {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (conflict.importFile) {
      const parentPath = conflict.targetParentSchemeId ? schemePathForScheme(conflict.targetParentSchemeId) : [];
      const handleZipImport = async (targetName?: string) => {
        try {
          const payload = await uploadBackendSchemeArchive(conflict.importFile as File, parentPath, { mode: "overwrite", targetName });
          applyBackendSchemeArchiveImport(payload, targetName || conflict.importedName);
        } catch (error) {
          window.alert(error instanceof Error ? `导入方案压缩包失败：${error.message}` : "导入方案压缩包失败。");
        }
      };
      if (action === "rename") {
        const siblingNames = savedChildSchemeNames(schemes, conflict.targetParentSchemeId ?? "");
        const renamed = promptUniqueRecordName(
          "请输入导入后的方案名称",
          uniqueRecordName(conflict.importedName, siblingNames, "导入方案"),
          siblingNames,
          "方案名称不能为空。",
          "方案名称重复，无法导入。"
        );
        if (!renamed) {
          return;
        }
        setPendingSchemeImportConflict(null);
        void handleZipImport(renamed);
        return;
      }
      setPendingSchemeImportConflict(null);
      void handleZipImport();
      return;
    }
    const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId ?? "");
    const targetParentSchemeId = conflict.targetParentSchemeId ?? "";
    const siblingNames = savedChildSchemeNames(schemes, targetParentSchemeId);
    if (!conflict.importedScheme) {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的方案名称",
        uniqueRecordName(conflict.importedName, siblingNames, "导入方案"),
        siblingNames,
        "方案名称不能为空。",
        "方案名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord({ ...conflict.importedScheme, name: renamed, updatedAt: new Date().toISOString() }, targetParentSchemeId);
      return;
    }
    if (!duplicateScheme) {
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord(conflict.importedScheme, targetParentSchemeId);
      return;
    }
    setPendingSchemeImportConflict(null);
    const mergedScheme = mergeImportedSchemeIntoExisting(duplicateScheme, conflict.importedScheme);
    const duplicatePath = schemePathForRecord(duplicateScheme);
    const parentPath = duplicatePath.slice(0, -1);
    setSchemes((current) => replaceSavedSchemeById(current, duplicateScheme.id, mergedScheme));
    persistSchemeTreeToBackend(mergedScheme, parentPath, `合并覆盖导入方案：${mergedScheme.name}`);
    setExpandedSchemeIds((current) => (current.includes(duplicateScheme.id) ? current : [...current, duplicateScheme.id]));
    selectSingleScheme(duplicateScheme.id);
    writeOperationLog(`合并覆盖导入方案：${duplicateScheme.name}`);
  };
}

export function createResolveDuplicateModelImport(__appScope: Record<string, any>) {
  return (action: "overwrite" | "rename" | "cancel") => {
  const { activeSchemeRecord, commitImportedModelRecord, createSavedProject, createSavedScheme, findSavedSchemeById, pendingModelImportConflict, promptUniqueRecordName, requireEditMode, schemes, selectedSchemeRecord, setPendingModelImportConflict, uniqueRecordName } = __appScope;
    const conflict = pendingModelImportConflict;
    if (!conflict || action === "cancel") {
      setPendingModelImportConflict(null);
      return;
    }
    if (!requireEditMode("处理模型导入冲突")) {
      setPendingModelImportConflict(null);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0] ??
      createSavedScheme("默认方案");
    const existingNames = targetScheme.projects.map((project) => project.name);
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的模型名称",
        uniqueRecordName(conflict.importedName, existingNames, "导入模型"),
        existingNames,
        "模型名称不能为空。",
        "模型名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingModelImportConflict(null);
      commitImportedModelRecord(targetScheme, createSavedProject(renamed, conflict.importedProject));
      return;
    }
    const duplicateProject = targetScheme.projects.find((project) => project.id === conflict.duplicateProjectId);
    const targetName = duplicateProject?.name ?? conflict.duplicateProjectName;
    const overwrittenRecord = createSavedProject(targetName, conflict.importedProject);
    setPendingModelImportConflict(null);
    commitImportedModelRecord(targetScheme, {
      ...overwrittenRecord,
      id: conflict.duplicateProjectId,
      name: targetName,
      project: { ...overwrittenRecord.project, name: targetName }
    });
  };
}

export function createExportSchemeRecord(__appScope: Record<string, any>) {
  return async (scheme: SavedSchemeRecord) => {
  const { downloadBackendSchemeArchive, flattenSavedProjects, isPickerAbort, safeFilePart, schemePathForRecord, writeOperationLog } = __appScope;
    try {
      const schemePath = schemePathForRecord(scheme);
      const saved = await downloadBackendSchemeArchive(schemePath, `${safeFilePart(scheme.name)}.zip`);
      if (!saved) {
        return;
      }
      writeOperationLog(`导出方案：${scheme.name}`);
      window.alert(`已导出方案“${scheme.name}”，共 ${flattenSavedProjects([scheme]).length} 个模型。`);
    } catch (error) {
      if (isPickerAbort(error)) {
        return;
      }
      window.alert(error instanceof Error ? `导出方案失败：${error.message}` : "导出方案失败。");
    }
  };
}

export type ImageLibraryImportKind = "image" | "archive" | "mixed";

const IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN = /\.(docx|docm|pptx|pptm|ppsx|ppsm|xlsx|xlsm|vsdx|wps|dps|zip)$/iu;
const IMAGE_LIBRARY_IMAGE_FILE_PATTERN = /\.(svg|png|jpe?g|gif|webp|bmp|ico)$/iu;

export function imageLibraryImportKindForInput(input?: { dataset?: { imageImportKind?: string } } | null): ImageLibraryImportKind {
  const kind = input?.dataset?.imageImportKind;
  return kind === "image" || kind === "archive" ? kind : "mixed";
}

export function imageLibraryFileMatchesImportKind(fileName: string, importKind: ImageLibraryImportKind) {
  const normalizedName = String(fileName ?? "").trim().toLowerCase();
  const isArchive = IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN.test(normalizedName);
  const isImage = IMAGE_LIBRARY_IMAGE_FILE_PATTERN.test(normalizedName);
  if (importKind === "archive") {
    return isArchive;
  }
  if (importKind === "image") {
    return isImage;
  }
  return isArchive || isImage;
}

export function createChooseImage(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, imageTarget, importBackendIconLibraryFile, refreshImageFolders, requireEditMode, saveImageAsset, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传图片")) {
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files ?? []);
    const importKind = imageLibraryImportKindForInput(event.currentTarget ?? event.target);
    event.target.value = "";
    if (files.length === 0 || !imageTarget) {
      return;
    }
    const readFileAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error ?? new Error("读取图片失败。"));
        reader.readAsDataURL(file);
      });
    void (async () => {
      const nextAssets: ImageAsset[] = [];
      const nextAssetMap: Record<string, string> = {};
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isIconArchive = IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN.test(lowerName);
        if (!imageLibraryFileMatchesImportKind(lowerName, importKind)) {
          window.alert(importKind === "archive"
            ? `“${file.name || "所选文件"}”不是 DOCX/PPTX/XLSX/VSDX/WPS/DPS/ZIP 文档图片导入文件，请使用外部图片入口直接导入图片。`
            : `“${file.name || "所选文件"}”不是 SVG/PNG/JPG 等图片文件，请使用文档图片/图标入口导入文档中的图片和矢量图标素材。`);
          continue;
        }
        let imageData = "";
        try {
          imageData = await readFileAsDataUrl(file);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : `读取 ${file.name || "图片"} 失败。`);
          continue;
        }
        if (isIconArchive) {
          try {
            const importedAssets = await importBackendIconLibraryFile(file.name, imageData, activeImageFolderId);
            nextAssets.push(...importedAssets);
            for (const asset of importedAssets) {
              nextAssetMap[asset.id] = asset.url;
            }
          } catch (error) {
            window.alert(error instanceof Error ? error.message : `导入 ${file.name || "文档图片"} 失败。`);
          }
          continue;
        }
        let asset: ImageAsset;
        try {
          asset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : `上传 ${file.name || "图片"} 到后台失败。`);
          const fallbackId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          saveImageAsset(fallbackId, imageData);
          asset = { id: fallbackId, name: file.name || "本地图片", folderId: activeImageFolderId, url: imageData };
        }
        nextAssets.push(asset);
        nextAssetMap[asset.id] = asset.url;
      }
      if (nextAssets.length > 0) {
        setImageAssetList((current) => [...nextAssets, ...current.filter((item) => !nextAssets.some((asset) => asset.id === item.id))]);
        setImageAssets((current) => ({ ...current, ...nextAssetMap }));
      }
      void refreshImageFolders();
    })();
  };
}

export function createApplyExistingImage(__appScope: Record<string, any>) {
  return async (assetId: string) => {
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, imageAssetList, imageAssets, imageTarget, libraryTemplateByKind, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, setStateIconDrawingDialog, startLibraryDevicePlacement, stateIconDrawingHistoryRef, svgSourceFromDataUrl, updateGraphNodeById, writeOperationLog } = __appScope;
    if (!requireEditMode("应用图片")) {
      return;
    }
    const asset = imageAssetList.find((item: ImageAsset) => item.id === assetId);
    const imageData = imageAssets[assetId] ?? asset?.url;
    if (!imageTarget || !imageData) {
      return;
    }
    if (imageTarget.kind === "canvasIcon") {
      const baseTemplate = libraryTemplateByKind.get("static-image");
      if (!baseTemplate) {
        window.alert("未找到静态图片图元定义，无法插入图标。");
        return;
      }
      const iconTemplate = {
        ...baseTemplate,
        label: asset?.name || baseTemplate.label || "图标",
        params: {
          ...baseTemplate.params,
          text: asset?.name || baseTemplate.params?.text || "",
          backgroundImage: imageData,
          backgroundImageAssetId: assetId
        }
      };
      startLibraryDevicePlacement(iconTemplate);
      setImageTarget(null);
      writeOperationLog?.(`从图标库选择图标：${asset?.name || assetId}`);
      return;
    }
    if (imageTarget.kind === "stateIconDrawing") {
      const assetName = asset?.name || assetId;
      const lowerName = assetName.toLowerCase();
      const isSvg = asset?.mimeType === "image/svg+xml" || lowerName.endsWith(".svg") || imageData.startsWith("data:image/svg+xml");
      let importedElements: StateIconDrawingElement[] = [];
      if (isSvg) {
        let svgSource = svgSourceFromDataUrl(imageData);
        if (!svgSource) {
          try {
            svgSource = await fetch(imageData).then((response) => response.ok ? response.text() : "");
          } catch {
            svgSource = "";
          }
        }
        importedElements = svgSource
          ? createEditableStateIconElementsFromSvgSource(svgSource, assetName, { preserveImportedSvg: true })
          : [createImportedStateIconElement("image", imageData, assetName)];
      } else {
        importedElements = [createImportedStateIconElement("image", imageData, assetName)];
      }
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
      setImageTarget(null);
      writeOperationLog?.(`从图标库导入元件图案：${assetName}`);
      return;
    }
    pushUndoSnapshot();
    if (imageTarget.kind === "canvas") {
      setCanvasBackgroundImageAssetId(assetId);
      setCanvasBackgroundImage(imageData);
    } else {
      updateGraphNodeById(imageTarget.nodeId, (node) =>
        imageTarget.kind === "nodeForeground"
          ? { ...node, params: { ...node.params, foregroundImageAssetId: assetId, foregroundImage: imageData } }
          : { ...node, params: { ...node.params, backgroundImageAssetId: assetId, backgroundImage: imageData } }
      );
    }
    setImageTarget(null);
  };
}

export function createApplyIconLibraryCatalogIcon(__appScope: Record<string, any>) {
  return async (iconEntryId: string) => {
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, iconLibraryPicker, imageTarget, requireEditMode, setImageTarget, setStateIconDrawingDialog, stateIconDrawingHistoryRef, writeOperationLog } = __appScope;
    if (!requireEditMode("选择分类图标")) {
      return;
    }
    if (!imageTarget || imageTarget.kind !== "stateIconDrawing") {
      return;
    }
    const entry = iconLibraryPicker?.entries?.find((item: any) => item.id === iconEntryId);
    if (!entry) {
      window.alert("未找到所选分类图标，请刷新后重试。");
      return;
    }
    let svgSource = "";
    try {
      const response = await fetch(entry.url);
      svgSource = response.ok ? await response.text() : "";
    } catch {
      svgSource = "";
    }
    if (!svgSource) {
      window.alert("读取分类图标失败。");
      return;
    }
    const assetName = `${entry.libraryLabel || entry.libraryId} / ${entry.categoryLabel || entry.categoryId} / ${entry.name || entry.iconId}`;
    const importedElements = createEditableStateIconElementsFromSvgSource(svgSource, assetName, { preserveImportedSvg: true });
    const fallbackElements = importedElements.length > 0
      ? importedElements
      : [createImportedStateIconElement("imported-svg", svgSource, assetName)];
    const selectedElementId = fallbackElements[0]?.id ?? "";
    setStateIconDrawingDialog((current: any) =>
      current
        ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
            ...current,
            elements: [...current.elements, ...fallbackElements],
            selectedElementId,
            selectedElementIds: selectedElementId ? [selectedElementId] : [],
            pendingElementKind: undefined,
            pendingStaticTemplate: undefined,
            drawingDraft: undefined
          })
        : current
    );
    setImageTarget(null);
    writeOperationLog?.(`从分类图标库导入元件图案：${assetName}`);
  };
}

export function createClearSelectedImage(__appScope: Record<string, any>) {
  return () => {
  const { imageTarget, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, updateGraphNodeById } = __appScope;
    if (!requireEditMode("清除图片")) {
      return;
    }
    if (!imageTarget) {
      return;
    }
    if (imageTarget.kind === "canvasIcon" || imageTarget.kind === "stateIconDrawing") {
      setImageTarget(null);
      return;
    }
    pushUndoSnapshot();
    if (imageTarget.kind === "canvas") {
      setCanvasBackgroundImage("");
      setCanvasBackgroundImageAssetId("");
    } else {
      updateGraphNodeById(imageTarget.nodeId, (node) =>
        imageTarget.kind === "nodeForeground"
          ? {
              ...node,
              params: {
                ...node.params,
                foregroundImage: "",
                foregroundImageAssetId: ""
              }
            }
          : {
              ...node,
              params: {
                ...node.params,
                backgroundImage: "",
                backgroundImageAssetId: ""
              }
            }
      );
    }
    setImageTarget(null);
  };
}

export function createClearSelectedImageForNode(__appScope: Record<string, any>) {
  return (nodeId: string, target: "background" | "foreground") => {
  const { pushUndoSnapshot, requireEditMode, updateGraphNodeById } = __appScope;
    if (!requireEditMode("清除图片")) {
      return;
    }
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node) => ({
      ...node,
      params:
        target === "foreground"
          ? { ...node.params, foregroundImage: "", foregroundImageAssetId: "" }
          : { ...node.params, backgroundImage: "", backgroundImageAssetId: "" }
    }));
  };
}

export function createCreateImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { createBackendImageFolder, refreshImageFolders, requireEditMode, setActiveImageFolderId } = __appScope;
    if (!requireEditMode("新建图片文件夹")) {
      return;
    }
    const inputName = window.prompt("请输入图片文件夹名称", "新建文件夹");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("图片文件夹名称不能为空。");
      return;
    }
    try {
      const folder = await createBackendImageFolder(name);
      await refreshImageFolders();
      setActiveImageFolderId(folder.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "新建图片文件夹失败。");
    }
  };
}

export function createRenameImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { activeImageFolderId, imageFolders, refreshImageFolders, renameBackendImageFolder, requireEditMode } = __appScope;
    if (!requireEditMode("重命名图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      window.alert("默认文件夹不能重命名。");
      return;
    }
    const inputName = window.prompt("请输入新的图片文件夹名称", folder.name);
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("图片文件夹名称不能为空。");
      return;
    }
    try {
      await renameBackendImageFolder(folder.id, name);
      await refreshImageFolders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "重命名图片文件夹失败。");
    }
  };
}

export function createDeleteImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { activeImageFolderId, deleteBackendImageFolder, imageFolders, refreshImageFolders, requireEditMode, setActiveImageFolderId } = __appScope;
    if (!requireEditMode("删除图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      window.alert("默认文件夹不能删除。");
      return;
    }
    if (!window.confirm(`删除图片文件夹“${folder.name}”？文件夹内图片将移回默认文件夹。`)) {
      return;
    }
    try {
      await deleteBackendImageFolder(folder.id);
      setActiveImageFolderId("root");
      await refreshImageFolders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除图片文件夹失败。");
    }
  };
}

export function createStartProjectRecordDrag(__appScope: Record<string, any>) {
  return (event: DragEvent<HTMLDivElement>, projectId: string) => {
  const { projectRecordDragActiveRef } = __appScope;
    projectRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/project-id", projectId);
    event.dataTransfer.effectAllowed = "move";
  };
}

export function createFinishProjectRecordDrag(__appScope: Record<string, any>) {
  return () => {
  const { projectRecordDragActiveRef } = __appScope;
    projectRecordDragActiveRef.current = false;
  };
}

export function createStartSchemeRecordDrag(__appScope: Record<string, any>) {
  return (event: DragEvent<HTMLDivElement>, schemeId: string) => {
  const { schemeRecordDragActiveRef } = __appScope;
    schemeRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/scheme-id", schemeId);
    event.dataTransfer.effectAllowed = "move";
  };
}

export function createFinishSchemeRecordDrag(__appScope: Record<string, any>) {
  return () => {
  const { schemeRecordDragActiveRef } = __appScope;
    schemeRecordDragActiveRef.current = false;
  };
}

export function createRenderProjectSchemeNode(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, depth = 0): ReactNode => {
  const { ChevronDown, ChevronRight, FileJson, FolderOpen, activeProjectKey, div, expandedSchemeIds, finishProjectRecordDrag, finishSchemeRecordDrag, isEditMode, moveProjectRecordToScheme, moveSchemeRecordToScheme, p, projectSearchNeedle, renderProjectSchemeNode, requestLoadSavedProject, selectSingleProject, selectSingleScheme, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, setInspectorTab, setProjectMenu, span, startProjectRecordDrag, startSchemeRecordDrag, toggleProjectSelection, toggleSchemeExpanded, toggleSchemeSelection } = __appScope;
    const isExpanded = projectSearchNeedle ? true : expandedSchemeIds.includes(scheme.id);
    const children = scheme.children ?? [];
    const hasContent = scheme.projects.length > 0 || children.length > 0;
    const schemeIndentStyle = { "--scheme-depth": depth } as CSSProperties;
    const projectIndentStyle = { "--scheme-depth": depth + 1 } as CSSProperties;
    return (
      <div
        className={`scheme-group ${depth > 0 ? "nested" : ""}`}
        key={scheme.id}
        style={schemeIndentStyle}
      >
        <div
          role="option"
          aria-label={`方案：${scheme.name}`}
          aria-selected={selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id}
          aria-expanded={isExpanded}
          tabIndex={0}
          draggable={isEditMode}
          className={`scheme-option ${selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id ? "selected" : ""}`}
          style={schemeIndentStyle}
          onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
              toggleSchemeSelection(scheme.id);
            } else {
              selectSingleScheme(scheme.id);
            }
            toggleSchemeExpanded(scheme.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
              event.preventDefault();
              if (event.ctrlKey || event.metaKey || event.shiftKey) {
                toggleSchemeSelection(scheme.id);
              } else {
                selectSingleScheme(scheme.id);
              }
              toggleSchemeExpanded(scheme.id);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={(event) => {
            if (!isEditMode) {
              event.preventDefault();
              return;
            }
            startSchemeRecordDrag(event, scheme.id);
          }}
          onDragEnd={finishSchemeRecordDrag}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isEditMode) {
              return;
            }
            finishProjectRecordDrag();
            finishSchemeRecordDrag();
            const schemeId = event.dataTransfer.getData("application/scheme-id");
            if (schemeId) {
              moveSchemeRecordToScheme(schemeId, scheme.id);
              return;
            }
            const projectId = event.dataTransfer.getData("application/project-id");
            if (projectId) {
              moveProjectRecordToScheme(projectId, scheme.id);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!selectedSchemeIds.includes(scheme.id)) {
              selectSingleScheme(scheme.id);
            }
            setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id });
          }}
        >
          {isExpanded ? <ChevronDown className="scheme-toggle-icon" size={14} /> : <ChevronRight className="scheme-toggle-icon" size={14} />}
          <FolderOpen className="scheme-folder-icon" size={15} />
          <span className="project-tree-name">{scheme.name}</span>
        </div>
        {isExpanded && (
          <div className="scheme-projects">
            {!hasContent ? (
              <p className="project-empty" style={projectIndentStyle}>暂无模型或子方案</p>
            ) : (
              <>
                {scheme.projects.map((project) => {
                  const isProjectSelected = selectedProjectIds.includes(project.id) || project.id === selectedProjectId;
                  return (
                    <div
                      role="option"
                      aria-label={`模型：${project.name}`}
                      aria-selected={isProjectSelected}
                      tabIndex={0}
                      draggable={isEditMode}
                      className={`project-option ${isProjectSelected ? "selected" : ""} ${project.id === activeProjectKey ? "active" : ""}`}
                      style={projectIndentStyle}
                      key={project.id}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey) {
                          toggleProjectSelection(scheme.id, project.id);
                        } else {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setInspectorTab("model");
                      }}
                      onDoubleClick={() => requestLoadSavedProject(project, scheme.id)}
                      onDragStart={(event) => {
                        if (!isEditMode) {
                          event.preventDefault();
                          return;
                        }
                        startProjectRecordDrag(event, project.id);
                      }}
                      onDragEnd={finishProjectRecordDrag}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          requestLoadSavedProject(project, scheme.id);
                        } else if (event.key === " " || event.key === "Spacebar") {
                          event.preventDefault();
                          if (event.ctrlKey || event.metaKey || event.shiftKey) {
                            toggleProjectSelection(scheme.id, project.id);
                          } else {
                            selectSingleProject(scheme.id, project.id);
                          }
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!selectedProjectIds.includes(project.id)) {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id, projectId: project.id });
                      }}
                    >
                      <FileJson className="project-item-icon" size={14} />
                      <span className="project-tree-name">{project.name}</span>
                    </div>
                  );
                })}
                {children.map((child) => renderProjectSchemeNode(child, depth + 1))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };
}

export function createOpenBlankProjectLibraryContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<HTMLElement>) => {
  const { isEditMode, setProjectMenu } = __appScope;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".scheme-option, .project-option, .library-search")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!isEditMode) {
      return;
    }
    setProjectMenu({ x: event.clientX, y: event.clientY });
  };
}

export function createCustomDeviceDefaultStateVisualDraft(__appScope: Record<string, any>) {
  return (): Partial<DeviceStateDefinition> => {
  const { customDeviceDraft, customDevicePreviewLabel, customDevicePreviewSourceTemplate, customDraftTerminalTypes, generateCustomDeviceImage, selectedCustomComponentTemplate, selectedDefinitionTemplate } = __appScope;
    const sourceTemplate = customDevicePreviewSourceTemplate ?? selectedCustomComponentTemplate ?? selectedDefinitionTemplate;
    const templateImage = !customDeviceDraft.backgroundImage && !customDeviceDraft.backgroundImageAssetId
      ? createTemplateDefaultStateIconImage(__appScope, sourceTemplate, {
          label: customDevicePreviewLabel,
          size: customDeviceDraft.size,
          terminalCount: customDeviceDraft.terminalCount,
          terminalTypes: customDraftTerminalTypes,
          terminalLabels: customDeviceDraft.terminalLabels,
          terminalAnchors: customDeviceDraft.terminalAnchors
        })
      : "";
    const image = customDeviceDraft.backgroundImage ||
      templateImage ||
      generateCustomDeviceImage(customDevicePreviewLabel, customDraftTerminalTypes.length > 0 ? customDraftTerminalTypes : ["ac"]);
    const imageAssetId = customDeviceDraft.backgroundImageAssetId && image === `/api/images/${customDeviceDraft.backgroundImageAssetId}`
      ? customDeviceDraft.backgroundImageAssetId
      : "";
    return {
      image,
      imageAssetId,
      color: "",
      fillColor: "transparent",
      strokeColor: "transparent",
      textColor: ""
    };
  };
}

export function createSnapCustomDeviceTerminalAnchor(__appScope: Record<string, any>) {
  return (anchor: Point): Point => {
  const { CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, customDevicePreviewHeight, customDevicePreviewWidth, customDeviceTerminalAnchorValue, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const snapAxis = (value: number, tolerance: number) => {
      const normalizedValue = customDeviceTerminalAnchorValue(value);
      const guideValue = CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.find((candidate) => Math.abs(normalizedValue - candidate) <= tolerance);
      return guideValue === undefined ? normalizedValue : customDeviceTerminalAnchorValue(guideValue);
    };
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        x: boundaryAnchor.x,
        y: snapAxis(boundaryAnchor.y, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / customDevicePreviewHeight)
      };
    }
    return {
      x: snapAxis(boundaryAnchor.x, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / customDevicePreviewWidth),
      y: boundaryAnchor.y
    };
  };
}

export function createCustomDeviceTerminalConnectorSegment(__appScope: Record<string, any>) {
  return (anchor: Point) => {
  const { CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET, customDevicePreviewHeight, customDevicePreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    const from = {
      x: boundaryAnchor.x * customDevicePreviewWidth,
      y: boundaryAnchor.y * customDevicePreviewHeight
    };
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        from,
        to: {
          x: from.x + Math.sign(boundaryAnchor.x || 1) * CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET,
          y: from.y
        },
      };
    }
    return {
      from,
      to: {
        x: from.x,
        y: from.y + Math.sign(boundaryAnchor.y || 1) * CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET
      }
    };
  };
}

export function createUpdateCustomDeviceTerminalAnchor(__appScope: Record<string, any>) {
  return (index: number, patch: Partial<Point>) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceTerminalAnchorValue, hasOverlappingCustomDeviceTerminalAnchors, projectCustomDeviceTerminalAnchorToBoundary, setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => {
      if (index < 0 || index >= current.terminalCount) {
        return current;
      }
      const terminalAnchors = createDefaultCustomDeviceTerminalAnchors(current.terminalCount, current.terminalAnchors);
      const currentAnchor = terminalAnchors[index] ?? { x: 0, y: 0 };
      terminalAnchors[index] = projectCustomDeviceTerminalAnchorToBoundary({
        x: customDeviceTerminalAnchorValue(patch.x ?? currentAnchor.x),
        y: customDeviceTerminalAnchorValue(patch.y ?? currentAnchor.y)
      });
      if (hasOverlappingCustomDeviceTerminalAnchors(terminalAnchors)) {
        return { ...current, error: `端子${index + 1}位置不能与其他端子重叠。` };
      }
      return { ...current, terminalAnchors, error: "" };
    });
  };
}

export function createUpdateCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => {
  const { isDefaultStatePageId, setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => ({
      ...current,
      stateDefinitions: isDefaultStatePageId(rowId)
        ? current.stateDefinitions
        : current.stateDefinitions.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      error: ""
    }));
  };
}

export function createAddCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { appendNonDefaultStateDraftRow, createStateDraftRowFromDefaultVisual, customDeviceDefaultStateVisualDraft, defaultStateDraftRow, isDefaultStatePageId, nextNonDefaultStateIndex, setCustomDeviceDraft, setCustomDeviceStatePageId, stateDraftRowId, stateIconDrawingDialog, stateIconDrawingInlineImage } = __appScope;
    const defaultVisual = customDeviceDefaultStateVisualDraft();
    const rowId = stateDraftRowId();
    const inlineDefaultStateIconPatch =
      stateIconDrawingDialog?.target.scope === "custom" && isDefaultStatePageId(stateIconDrawingDialog.target.rowId)
        ? {
            image: stateIconDrawingInlineImage,
            imageAssetId: "",
            backgroundImage: "",
            backgroundImageAssetId: ""
          }
        : null;
    const sourceDefaultVisual = inlineDefaultStateIconPatch
      ? { ...defaultVisual, ...inlineDefaultStateIconPatch }
      : defaultVisual;
    setCustomDeviceDraft((current) => ({
      ...current,
      backgroundImage: inlineDefaultStateIconPatch ? stateIconDrawingInlineImage : current.backgroundImage,
      backgroundImageAssetId: inlineDefaultStateIconPatch ? "" : current.backgroundImageAssetId,
      stateDefinitions: (() => {
        const sourceRows = current.stateDefinitions;
        const nextIndex = nextNonDefaultStateIndex(sourceRows);
        const row = {
          ...createStateDraftRowFromDefaultVisual(defaultStateDraftRow(sourceRows, sourceDefaultVisual), {
            value: String(nextIndex),
            name: `状态${nextIndex}`
          }),
          id: rowId
        };
        return appendNonDefaultStateDraftRow(sourceRows, sourceDefaultVisual, row);
      })(),
      error: ""
    }));
    setCustomDeviceStatePageId(rowId);
  };
}

export function createDeleteCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string) => {
  const { setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => ({
      ...current,
      stateDefinitions: current.stateDefinitions.filter((row) => row.id !== rowId),
      error: ""
    }));
  };
}

export function createUpdateCustomDeviceTerminalAnchorFromPreview(__appScope: Record<string, any>) {
  return (index: number, svg: SVGSVGElement, event: PointerEvent<SVGElement>) => {
  const { customDevicePreviewHeight, customDevicePreviewWidth, snapCustomDeviceTerminalAnchor, updateCustomDeviceTerminalAnchor } = __appScope;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    const snappedAnchor = snapCustomDeviceTerminalAnchor({
      x: transformed.x / customDevicePreviewWidth,
      y: transformed.y / customDevicePreviewHeight
    });
    updateCustomDeviceTerminalAnchor(index, snappedAnchor);
  };
}

export function createDefinitionDefaultStateVisualDraft(__appScope: Record<string, any>) {
  return (): Partial<DeviceStateDefinition> => {
  const { definitionVisualDraft, selectedDefinitionTemplate } = __appScope;
    const params = selectedDefinitionTemplate?.params ?? {};
    const sourceImage = definitionVisualDraft?.backgroundImage || params.backgroundImage || "";
    const sourceImageAssetId = definitionVisualDraft?.backgroundImageAssetId || params.backgroundImageAssetId || "";
    const templateImage = !sourceImage && !sourceImageAssetId
      ? createTemplateDefaultStateIconImage(__appScope, selectedDefinitionTemplate, {
          size: definitionVisualDraft?.size,
          terminalCount: definitionVisualDraft?.terminalCount,
          terminalTypes: definitionVisualDraft?.terminalTypes,
          terminalLabels: definitionVisualDraft?.terminalLabels,
          terminalAnchors: definitionVisualDraft?.terminalAnchors
        })
      : "";
    return {
      image: sourceImage || templateImage,
      imageAssetId: sourceImageAssetId && sourceImage === `/api/images/${sourceImageAssetId}` ? sourceImageAssetId : sourceImage ? "" : sourceImageAssetId,
      color: params.foregroundColor || "",
      fillColor: params.fillColor || "",
      strokeColor: params.strokeColor || "",
      textColor: params.textColor || ""
    };
  };
}

export function createSnapDefinitionTerminalAnchor(__appScope: Record<string, any>) {
  return (anchor: Point): Point => {
  const { CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, customDeviceTerminalAnchorValue, definitionVisualPreviewHeight, definitionVisualPreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const snapAxis = (value: number, tolerance: number) => {
      const normalizedValue = customDeviceTerminalAnchorValue(value);
      const guideValue = CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.find((candidate) => Math.abs(normalizedValue - candidate) <= tolerance);
      return guideValue === undefined ? normalizedValue : customDeviceTerminalAnchorValue(guideValue);
    };
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        x: boundaryAnchor.x,
        y: snapAxis(boundaryAnchor.y, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / definitionVisualPreviewHeight)
      };
    }
    return {
      x: snapAxis(boundaryAnchor.x, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / definitionVisualPreviewWidth),
      y: boundaryAnchor.y
    };
  };
}

export function createDefinitionTerminalConnectorSegment(__appScope: Record<string, any>) {
  return (anchor: Point) => {
  const { CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET, definitionVisualPreviewHeight, definitionVisualPreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    const from = {
      x: boundaryAnchor.x * definitionVisualPreviewWidth,
      y: boundaryAnchor.y * definitionVisualPreviewHeight
    };
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        from,
        to: {
          x: from.x + Math.sign(boundaryAnchor.x || 1) * CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET,
          y: from.y
        },
      };
    }
    return {
      from,
      to: {
        x: from.x,
        y: from.y + Math.sign(boundaryAnchor.y || 1) * CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET
      }
    };
  };
}

export function createUpdateDefinitionTerminalAnchor(__appScope: Record<string, any>) {
  return (index: number, patch: Partial<Point>) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceTerminalAnchorValue, hasOverlappingCustomDeviceTerminalAnchors, projectCustomDeviceTerminalAnchorToBoundary, setDefinitionVisualDraft } = __appScope;
    setDefinitionVisualDraft((current) => {
      if (!current || index < 0 || index >= current.terminalCount) {
        return current;
      }
      const terminalAnchors = createDefaultCustomDeviceTerminalAnchors(current.terminalCount, current.terminalAnchors);
      const currentAnchor = terminalAnchors[index] ?? { x: 0, y: 0 };
      terminalAnchors[index] = projectCustomDeviceTerminalAnchorToBoundary({
        x: customDeviceTerminalAnchorValue(patch.x ?? currentAnchor.x),
        y: customDeviceTerminalAnchorValue(patch.y ?? currentAnchor.y)
      });
      if (hasOverlappingCustomDeviceTerminalAnchors(terminalAnchors)) {
        return { ...current, error: `端子${index + 1}位置不能与其他端子重叠。` };
      }
      return { ...current, terminalAnchors, error: "" };
    });
  };
}

export function createUpdateDefinitionTerminalAnchorFromPreview(__appScope: Record<string, any>) {
  return (index: number, svg: SVGSVGElement, event: PointerEvent<SVGElement>) => {
  const { definitionVisualPreviewHeight, definitionVisualPreviewWidth, snapDefinitionTerminalAnchor, updateDefinitionTerminalAnchor } = __appScope;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    const snappedAnchor = snapDefinitionTerminalAnchor({
      x: transformed.x / definitionVisualPreviewWidth,
      y: transformed.y / definitionVisualPreviewHeight
    });
    updateDefinitionTerminalAnchor(index, snappedAnchor);
  };
}

export function createLoadDefinitionTemplateDraft(__appScope: Record<string, any>) {
  return (template: DeviceTemplate) => {
  const { DEFAULT_STATE_PAGE_ID, attributeLibraryComponentTypeKey, createDefinitionDraftRows, createDefinitionStateDraftRows, createDefinitionVisualDraft, normalizeAttributeLibraryName, resolveTemplateComponentType, setCollapsedDefinitionComponentTypes, setDefinitionDraftError, setDefinitionDraftRows, setDefinitionDraftSection, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setExpandedDefinitionGroups, setSelectedDefinitionKind } = __appScope;
    const stateRows = createDefinitionStateDraftRows(template);
    setSelectedDefinitionKind(template.kind);
    const group = normalizeAttributeLibraryName(template.attributeLibrary);
    const componentType = resolveTemplateComponentType(template);
    setExpandedDefinitionGroups((current) => (current.includes(group) ? current : [...current, group]));
    setCollapsedDefinitionComponentTypes((current) => current.filter((item) => item !== attributeLibraryComponentTypeKey(group, componentType)));
    setDefinitionDraftRows(createDefinitionDraftRows(template));
    setDefinitionStateDraftRows(stateRows);
    setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
    setDefinitionDraftSection(componentType);
    setDefinitionDraftError("");
    setDefinitionVisualDraft(createDefinitionVisualDraft(template));
    setDefinitionTerminalAnchorDragIndex(null);
  };
}

export function createFinishDeviceLibraryDialogPointerOperation(__appScope: Record<string, any>) {
  return () => {
  const { setDeviceLibraryDialogDrag, setDeviceLibraryDialogResize } = __appScope;
    setDeviceLibraryDialogDrag(null);
    setDeviceLibraryDialogResize(null);
  };
}

export function createCurrentDeviceLibraryDialogRect(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind) => {
  const { DEVICE_LIBRARY_DIALOG_CONFIG, clampDeviceLibraryDialogLayout, deviceLibraryDialogLayouts, deviceLibraryDialogRefForKind } = __appScope;
    const config = DEVICE_LIBRARY_DIALOG_CONFIG[kind];
    const rect = deviceLibraryDialogRefForKind(kind).current?.getBoundingClientRect();
    if (rect) {
      return clampDeviceLibraryDialogLayout(kind, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
    const viewportWidth = typeof window === "undefined" ? config.defaultWidth : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? config.defaultHeight : window.innerHeight;
    return clampDeviceLibraryDialogLayout(kind, deviceLibraryDialogLayouts[kind] ?? {
      left: (viewportWidth - config.defaultWidth) / 2,
      top: (viewportHeight - config.defaultHeight) / 2,
      width: config.defaultWidth,
      height: config.defaultHeight
    });
  };
}

export function createDeviceLibraryDialogStyle(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind) => {
  const { clampDeviceLibraryDialogLayout, deviceLibraryDialogLayouts } = __appScope;
    const layout = deviceLibraryDialogLayouts[kind];
    if (!layout) {
      return undefined;
    }
    const clampedLayout = clampDeviceLibraryDialogLayout(kind, layout);
    return {
      left: `${clampedLayout.left}px`,
      top: `${clampedLayout.top}px`,
      width: `${clampedLayout.width}px`,
      height: `${clampedLayout.height}px`
    } as CSSProperties;
  };
}

export function createStartDeviceLibraryDialogDrag(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind, event: PointerEvent<HTMLElement>) => {
  const { currentDeviceLibraryDialogRect, setDeviceLibraryDialogDrag, setDeviceLibraryDialogLayouts } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentDeviceLibraryDialogRect(kind);
    setDeviceLibraryDialogLayouts((current) => ({ ...current, [kind]: rect }));
    setDeviceLibraryDialogDrag({
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartDeviceLibraryDialogResize(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind, event: PointerEvent<HTMLDivElement>) => {
  const { currentDeviceLibraryDialogRect, setDeviceLibraryDialogLayouts, setDeviceLibraryDialogResize } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentDeviceLibraryDialogRect(kind);
    setDeviceLibraryDialogLayouts((current) => ({ ...current, [kind]: rect }));
    setDeviceLibraryDialogResize({
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStopDeviceLibraryDialogEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
  const { finishDeviceLibraryDialogPointerOperation } = __appScope;
    event.stopPropagation();
    if (
      event.type === "pointerup" ||
      event.type === "pointercancel" ||
      event.type === "lostpointercapture"
    ) {
      finishDeviceLibraryDialogPointerOperation();
    }
  };
}

export function createOpenDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, createCustomDeviceDraftFromTemplate, ensureCustomComponentTreeExpanded, libraryTemplates, normalizeAttributeLibraryName, prepareMeasurementConfigDraft, requireEditMode, resolveTemplateComponentType, selectedCustomComponentTemplate, selectedDefinitionTemplate, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogOpen, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setDeviceDefinitionDialogOpen, setDeviceLibraryDialogLayouts, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (!requireEditMode("元件定义")) {
      return;
    }
    const template = selectedCustomComponentTemplate ?? selectedDefinitionTemplate ?? libraryTemplates[0];
    if (template) {
      const attributeLibraryName = normalizeAttributeLibraryName(template.attributeLibrary);
      const section = resolveTemplateComponentType(template);
      cancelPendingCustomComponentTemplateLoad();
      ensureCustomComponentTreeExpanded(attributeLibraryName, section);
      setSelectedDefinitionKind(template.kind);
      setDefinitionDraftSection(section);
      setCustomComponentTreeSelection({ kind: "component", attributeLibraryName, section, templateKind: template.kind });
      setEditingCustomDeviceKind(template.custom ? template.kind : "");
      setCustomDeviceDefinitionMode("edit");
      setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
      setCustomDeviceSaveMessage("");
      const nextDraft = createCustomDeviceDraftFromTemplate(template, section);
      setCustomDeviceDialogView(nextDraft.terminalCount > 0 ? "terminals" : "icon");
      setCustomDeviceDraft(template.custom ? nextDraft : { ...nextDraft, error: "" });
    }
    prepareMeasurementConfigDraft();
    setDeviceDefinitionDialogOpen(false);
    setDeviceLibraryDialogLayouts((current: Record<string, any>) => {
      const { custom: _custom, ...rest } = current;
      return rest;
    });
    setCustomDeviceDialogOpen(true);
  };
}

export function createCloseDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, finishDeviceLibraryDialogPointerOperation, measurementConfigDraftRef, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setDeviceDefinitionDialogOpen, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    finishDeviceLibraryDialogPointerOperation();
    setDeviceDefinitionDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
    setDefinitionVisualDraft(null);
    setDefinitionStateDraftRows([]);
    setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
    setDefinitionTerminalAnchorDragIndex(null);
  };
}

export function createCloseCustomDeviceDialog(__appScope: Record<string, any>) {
  return () => {
  const { finishDeviceLibraryDialogPointerOperation, measurementConfigDraftRef, setCustomDeviceDialogOpen, setCustomDeviceTerminalAnchorDragIndex, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    finishDeviceLibraryDialogPointerOperation();
    setCustomDeviceDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
    setCustomDeviceTerminalAnchorDragIndex(null);
  };
}

export function createToggleDefinitionGroup(__appScope: Record<string, any>) {
  return (attributeLibrary: AttributeLibrary) => {
  const { setExpandedDefinitionGroups } = __appScope;
    setExpandedDefinitionGroups((current) =>
      current.includes(attributeLibrary) ? current.filter((item) => item !== attributeLibrary) : [...current, attributeLibrary]
    );
  };
}

export function createToggleDefinitionComponentType(__appScope: Record<string, any>) {
  return (attributeLibrary: AttributeLibrary, componentType: string) => {
  const { attributeLibraryComponentTypeKey, setCollapsedDefinitionComponentTypes } = __appScope;
    const typeKey = attributeLibraryComponentTypeKey(attributeLibrary, componentType);
    setCollapsedDefinitionComponentTypes((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
    );
  };
}

export function createToggleElementTreeGroup(__appScope: Record<string, any>) {
  return (typeKey: string) => {
  const { setCollapsedElementTreeGroups } = __appScope;
    setCollapsedElementTreeGroups((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
    );
  };
}

export function createToggleElementTreeDeviceGroup(__appScope: Record<string, any>) {
  return (deviceKey: string) => {
  const { setCollapsedElementTreeDeviceGroups } = __appScope;
    setCollapsedElementTreeDeviceGroups((current) =>
      current.includes(deviceKey) ? current.filter((item) => item !== deviceKey) : [...current, deviceKey]
    );
  };
}

export function createUpdateDefinitionDraftRow(__appScope: Record<string, any>) {
  return (rowId: string, patch: Partial<DeviceDefinitionDraftRow>) => {
  const { setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    setDefinitionDraftRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    setDefinitionDraftError("");
  };
}

export function createAddDefinitionDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { deviceDefinitionRowId, setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    setDefinitionDraftRows((current) => [
      ...current,
      {
        id: deviceDefinitionRowId(),
        cnName: "",
        enName: "",
        valueType: "string",
        typicalValue: ""
      }
    ]);
    setDefinitionDraftError("");
  };
}

export function createDeleteDefinitionDraftRow(__appScope: Record<string, any>) {
  return (rowId: string) => {
  const { requireEditMode, setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    if (!requireEditMode("修改元件定义")) {
      return;
    }
    setDefinitionDraftRows((current) => current.filter((row) => row.id !== rowId || row.readonly));
    setDefinitionDraftError("");
  };
}

export function createUpdateDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => {
  const { isDefaultStatePageId, setDefinitionDraftError, setDefinitionStateDraftRows } = __appScope;
    setDefinitionStateDraftRows((current) =>
      isDefaultStatePageId(rowId)
        ? current
        : current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
    setDefinitionDraftError("");
  };
}

export function createAddDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { appendNonDefaultStateDraftRow, createStateDraftRowFromDefaultVisual, defaultStateDraftRow, definitionDefaultStateVisualDraft, isDefaultStatePageId, nextNonDefaultStateIndex, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, stateDraftRowId, stateIconDrawingDialog, stateIconDrawingInlineImage } = __appScope;
    const defaultVisual = definitionDefaultStateVisualDraft();
    const rowId = stateDraftRowId();
    const inlineDefaultStateIconPatch =
      stateIconDrawingDialog?.target.scope === "definition" && isDefaultStatePageId(stateIconDrawingDialog.target.rowId)
        ? {
            image: stateIconDrawingInlineImage,
            imageAssetId: "",
            backgroundImage: "",
            backgroundImageAssetId: ""
          }
        : null;
    const sourceDefaultVisual = inlineDefaultStateIconPatch
      ? { ...defaultVisual, ...inlineDefaultStateIconPatch }
      : defaultVisual;
    setDefinitionStateDraftRows((current) => {
      const sourceRows = current;
      const nextIndex = nextNonDefaultStateIndex(sourceRows);
      const row = {
        ...createStateDraftRowFromDefaultVisual(defaultStateDraftRow(sourceRows, sourceDefaultVisual), {
          value: String(nextIndex),
          name: `状态${nextIndex}`
        }),
        id: rowId
      };
      return appendNonDefaultStateDraftRow(sourceRows, sourceDefaultVisual, row);
    });
    setDefinitionStatePageId(rowId);
    setDefinitionDraftError("");
  };
}

export function createDeleteDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string) => {
  const { requireEditMode, setDefinitionDraftError, setDefinitionStateDraftRows } = __appScope;
    if (!requireEditMode("修改状态定义")) {
      return;
    }
    setDefinitionStateDraftRows((current) => current.filter((row) => row.id !== rowId));
    setDefinitionDraftError("");
  };
}

export function createUpdateSelectedDefinitionResizePermission(__appScope: Record<string, any>) {
  return (value: string) => {
  const { deviceDefinitionOverrideForTemplate, requireEditMode, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDeviceDefinitionOverrides, writeOperationLog } = __appScope;
    if (!requireEditMode("修改元件变形权限")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const nextAllowed = value === "1";
    const targetKind = selectedDefinitionTemplate.kind;
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) =>
          template.kind === targetKind
            ? {
                ...template,
                allowResizeTransform: nextAllowed
              }
            : template
        )
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [targetKind]: {
            ...existingOverride,
            kind: targetKind,
            allowResizeTransform: nextAllowed,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }
    setDefinitionDraftError("");
    writeOperationLog(`修改元件变形权限：${selectedDefinitionTemplate.label} ${nextAllowed ? "允许" : "不允许"}`);
  };
}

export function createSaveDeviceDefinitionStateVisualDraft(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, activeStateDraftRow, createStateDraftRow, definitionStateDraftRows, definitionStatePageId, deviceDefinitionOverrideForTemplate, requireEditMode, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDeviceDefinitionOverrides, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存状态样式")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const stateValidation = validateStateDraftRows(definitionStateDraftRows);
    if (stateValidation.error) {
      setDefinitionDraftError(stateValidation.error);
      return;
    }
    const stateDefinitions = stateValidation.states;
    const activeStateValue = activeStateDraftRow(definitionStateDraftRows, definitionStatePageId)?.value.trim() ?? "";
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) => {
          if (template.kind !== selectedDefinitionTemplate.kind) {
            return template;
          }
          const { status, ...templateParams } = template.params;
          void status;
          return {
                ...template,
                params: templateParams,
                stateDefinitions
              };
        })
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [selectedDefinitionTemplate.kind]: {
            ...existingOverride,
            kind: selectedDefinitionTemplate.kind,
            params: existingOverride?.params ?? {},
            stateDefinitions,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }
    const nextStateRows = stateDefinitions.map((definition) => createStateDraftRow(definition));
    setDefinitionStateDraftRows(nextStateRows);
    setDefinitionStatePageId(nextStateRows.find((row) => row.value === activeStateValue)?.id ?? DEFAULT_STATE_PAGE_ID);
    setDefinitionDraftError("");
    writeOperationLog(`保存状态样式：${selectedDefinitionTemplate.label}`);
  };
}

export function createSaveDeviceDefinitionVisualDraft(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, TERMINAL_TYPE_LIBRARY_LABELS, activeStateDraftRow, createStateDraftRow, definitionStateDraftRows, definitionStatePageId, definitionVisualDraft, definitionVisualTerminalAnchors, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, requireEditMode, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setDeviceDefinitionOverrides, templateAllowsResizeTransform, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件图标和端子")) {
      return;
    }
    if (!selectedDefinitionTemplate || !definitionVisualDraft) {
      return;
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(definitionVisualTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      window.alert(message);
      setDefinitionVisualDraft((current) => current ? { ...current, error: message } : current);
      return;
    }
    const stateValidation = validateStateDraftRows(definitionStateDraftRows);
    if (stateValidation.error) {
      setDefinitionDraftError(stateValidation.error);
      return;
    }
    const stateDefinitions = stateValidation.states;
    const activeStateValue = activeStateDraftRow(definitionStateDraftRows, definitionStatePageId)?.value.trim() ?? "";
    const terminalTypes = definitionVisualDraft.terminalTypes.slice(0, definitionVisualDraft.terminalCount);
    const terminalLabels = definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount).map((label, index) => {
      const type = terminalTypes[index] ?? selectedDefinitionTemplate.terminalType;
      return label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${index + 1}`;
    });
    const terminalAnchors = definitionVisualTerminalAnchors.slice(0, definitionVisualDraft.terminalCount).map((anchor) => ({ ...anchor }));
    const size = {
      width: Math.max(1, Math.round(definitionVisualDraft.size.width || selectedDefinitionTemplate.size.width || 104)),
      height: Math.max(1, Math.round(definitionVisualDraft.size.height || selectedDefinitionTemplate.size.height || 64))
    };
    const backgroundParams = {
      backgroundImage: definitionVisualDraft.backgroundImage,
      backgroundImageAssetId: definitionVisualDraft.backgroundImageAssetId
    };
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) => {
          if (template.kind !== selectedDefinitionTemplate.kind) {
            return template;
          }
          const { status, ...templateParams } = template.params;
          void status;
          return {
                ...template,
                size,
                params: {
                  ...templateParams,
                  ...backgroundParams
                },
                terminalType: terminalTypes[0] ?? template.terminalType,
                terminalCount: definitionVisualDraft.terminalCount,
                terminalTypes,
                terminalLabels,
                terminalAnchors,
                stateDefinitions
              };
        })
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [selectedDefinitionTemplate.kind]: {
            ...existingOverride,
            kind: selectedDefinitionTemplate.kind,
            params: {
              ...(existingOverride?.params ?? {}),
              ...backgroundParams
            },
            size,
            terminalType: terminalTypes[0] ?? selectedDefinitionTemplate.terminalType,
            terminalCount: definitionVisualDraft.terminalCount,
            terminalTypes,
            terminalLabels,
            terminalAnchors,
            terminalRoles: existingOverride?.terminalRoles ?? selectedDefinitionTemplate.terminalRoles,
            terminalAssociations: existingOverride?.terminalAssociations ?? selectedDefinitionTemplate.terminalAssociations,
            isContainer: existingOverride?.isContainer ?? selectedDefinitionTemplate.isContainer,
            allowResizeTransform: existingOverride?.allowResizeTransform ?? templateAllowsResizeTransform(selectedDefinitionTemplate),
            parameterDefinitions: existingOverride?.parameterDefinitions ?? selectedDefinitionTemplate.parameterDefinitions ?? getTemplateParameterDefinitions(selectedDefinitionTemplate),
            stateDefinitions,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }
    const nextStateRows = stateDefinitions.map((definition) => createStateDraftRow(definition));
    setDefinitionVisualDraft((current) => current ? { ...current, size, terminalLabels, terminalAnchors, error: "" } : current);
    setDefinitionStateDraftRows(nextStateRows);
    setDefinitionStatePageId(nextStateRows.find((row) => row.value === activeStateValue)?.id ?? DEFAULT_STATE_PAGE_ID);
    setDefinitionTerminalAnchorDragIndex(null);
    setDefinitionDraftError("");
    writeOperationLog(`修改元件图标和端子：${selectedDefinitionTemplate.label}`);
  };
}

export function createSaveDeviceDefinitionDraft(__appScope: Record<string, any>) {
  return () => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, definitionDraftRows, definitionDraftSection, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, deviceDefinitionRowId, getTemplateParameterDefinitions, isReservedDeviceDefinitionParamName, normalizeComponentTypeName, normalizeDefinitionRowEnumFields, requireEditMode, selectedDefinitionTemplate, setDefinitionDraftError, setDefinitionDraftRows, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, templateAllowsResizeTransform } = __appScope;
    if (!requireEditMode("保存元件定义")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const normalizedRows: DeviceParameterDefinition[] = [];
    const seenNames = new Set<string>();
    for (const row of definitionDraftRows) {
      const enName = row.enName.trim();
      const cnName = row.cnName.trim();
      if (!enName || !cnName) {
        setDefinitionDraftError("中文名称和英文名称不能为空。");
        return;
      }
      if (isReservedDeviceDefinitionParamName(enName)) {
        setDefinitionDraftError(enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。");
        return;
      }
      const key = enName.toLowerCase();
      if (seenNames.has(key)) {
        setDefinitionDraftError(`英文名称 ${enName} 重复，无法保存。`);
        return;
      }
      seenNames.add(key);
      normalizedRows.push(normalizeDefinitionRowEnumFields({
        cnName,
        enName,
        valueType: row.valueType,
        typicalValue: row.typicalValue,
        enumOptions: row.enumOptions,
        enumValues: row.enumValues,
        readonly: Boolean(row.readonly)
      }));
    }
    const definitionKey = normalizeComponentTypeName(definitionDraftSection) || deviceDefinitionKeyForTemplate(selectedDefinitionTemplate);
    const params = normalizedRows.reduce<Record<string, string>>((acc, row) => {
      if (row.enName !== "name") {
        acc[row.enName] = row.typicalValue;
      }
      return acc;
    }, {
      component_type: definitionKey
    });
    const previousDefinitions = getTemplateParameterDefinitions(selectedDefinitionTemplate);
    syncExistingNodesWithTemplateDefinitions(
      { parameterDefinitions: normalizedRows },
      previousDefinitions,
      (node) => node.kind === selectedDefinitionTemplate.kind
    );
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
      delete next[selectedDefinitionTemplate.kind];
      next[definitionKey] = {
        ...existingOverride,
        kind: definitionKey,
        params: {
          ...(existingOverride?.params ?? {}),
          ...params
        },
        allowResizeTransform: templateAllowsResizeTransform(selectedDefinitionTemplate),
        parameterDefinitions: normalizedRows,
        stateDefinitions: Array.isArray(existingOverride?.stateDefinitions)
          ? existingOverride.stateDefinitions
          : selectedDefinitionTemplate.stateDefinitions,
        updatedAt: new Date().toISOString()
      };
      return next;
    });
    setDefinitionDraftRows(normalizedRows.map((row) => ({ ...row, id: deviceDefinitionRowId() })));
    setDefinitionDraftError("");
  };
}

export function createResetDeviceDefinitionDraft(__appScope: Record<string, any>) {
  return () => {
  const { deviceDefinitionKeyForTemplate, loadDefinitionTemplateDraft, requireEditMode, selectedDefinitionBaseTemplate, setDeviceDefinitionOverrides } = __appScope;
    if (!requireEditMode("重置元件定义")) {
      return;
    }
    if (!selectedDefinitionBaseTemplate) {
      return;
    }
    loadDefinitionTemplateDraft(selectedDefinitionBaseTemplate);
    const definitionKey = deviceDefinitionKeyForTemplate(selectedDefinitionBaseTemplate);
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[definitionKey];
      delete next[selectedDefinitionBaseTemplate.kind];
      return next;
    });
  };
}

export function createUpdateCustomDraftTerminalCount(__appScope: Record<string, any>) {
  return (value: number) => {
  const { MAX_CUSTOM_DEVICE_TERMINALS, TERMINAL_TYPE_LIBRARY_LABELS, createDefaultCustomDeviceTerminalAnchors, normalizeContainerTerminalAssociations, setCustomDeviceDialogView, setCustomDeviceDraft } = __appScope;
    const count = clampNumber(Math.round(value || 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
    if (count === 0) {
      setCustomDeviceDialogView("icon");
    }
    setCustomDeviceDraft((current) => {
      const fallback = current.attributeLibraryName.includes("直流")
        ? "dc"
        : current.attributeLibraryName.includes("氢")
          ? "h2"
          : current.attributeLibraryName.includes("热")
            ? "heat"
            : "ac";
      const terminalTypes = [...current.terminalTypes];
      while (terminalTypes.length < count) {
        terminalTypes.push(fallback);
      }
      const terminalLabels = [...current.terminalLabels];
      while (terminalLabels.length < count) {
        const type = terminalTypes[terminalLabels.length] ?? fallback;
        terminalLabels.push(`${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${terminalLabels.length + 1}`);
      }
      const terminalRoles = [...current.terminalRoles];
      while (terminalRoles.length < count) {
        terminalRoles.push("single-load");
      }
      const terminalAssociations = normalizeContainerTerminalAssociations([...terminalTypes], current.terminalAssociations, count);
      return {
        ...current,
        terminalCount: count,
        terminalTypes,
        terminalLabels,
        terminalAnchors: createDefaultCustomDeviceTerminalAnchors(count, current.terminalAnchors),
        terminalRoles,
        terminalAssociations,
        error: ""
      };
    });
  };
}

export function createChooseCustomDeviceBackground(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, requireEditMode, setCustomDeviceDraft, setCustomDeviceSaveMessage, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传元件图标")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset | null = null;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        asset = uploadedAsset;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
      }
      setCustomDeviceDraft((current) => ({
        ...current,
        backgroundImage: asset?.url ?? imageData,
        backgroundImageAssetId: asset?.id ?? "",
        error: ""
      }));
      setCustomDeviceSaveMessage(asset ? "图标已上传到后台，保存自定义设备后生效。" : "图标已设置为本地预览，保存自定义设备后生效。");
    };
    reader.readAsDataURL(file);
  };
}

export function createChooseDefinitionTemplateIcon(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, requireEditMode, setDefinitionVisualDraft, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传元件图标")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset | null = null;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        asset = uploadedAsset;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
      }
      setDefinitionVisualDraft((current) =>
        current
          ? {
              ...current,
              backgroundImage: asset?.url ?? imageData,
              backgroundImageAssetId: asset?.id ?? "",
              error: ""
            }
          : current
      );
    };
    reader.readAsDataURL(file);
  };
}

export function createChooseStateVisualImage(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, requireEditMode, setImageAssetList, setImageAssets, setStateImageUploadTarget, stateImageUploadTarget, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传状态图形")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    const target = stateImageUploadTarget;
    event.target.value = "";
    setStateImageUploadTarget(null);
    if (!file || !target) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset | null = null;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        asset = uploadedAsset;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传状态图形到后台失败，将仅保留当前本地预览。");
      }
      const patch: Partial<DeviceDefinitionStateDraftRow> = {
        image: asset?.url ?? imageData,
        imageAssetId: asset?.id ?? "",
        backgroundImage: "",
        backgroundImageAssetId: ""
      };
      if (target.scope === "definition") {
        updateDefinitionStateDraftRow(target.rowId, patch);
      } else {
        updateCustomDeviceStateDraftRow(target.rowId, patch);
      }
    };
    reader.readAsDataURL(file);
  };
}

export function createChooseStateIconDrawingImport(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, refreshImageFolders, requireEditMode, setImageAssetList, setImageAssets, setStateIconDrawingDialog, stateIconDrawingHistoryRef, stateIconDrawingImportMode, uploadBackendImage } = __appScope;
    if (!requireEditMode("导入绘制图形")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const isSvg = stateIconDrawingImportMode === "svg" || file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const appendImportedElements = (importedElements: StateIconDrawingElement[]) => {
      const selectedElementId = importedElements[0]?.id ?? "";
      setStateIconDrawingDialog((current) =>
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
      // 位图：上传到图片库并引用 /api/images，避免把 base64 位图内联进状态图标 SVG（library.json 膨胀根因）。
      let href = source;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, source, activeImageFolderId);
        href = uploadedAsset.url;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传图片到后台失败，将以本地预览嵌入。");
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

export function createUpdateStateIconDrawingElement(__appScope: Record<string, any>) {
  return (elementId: string, patch: Partial<StateIconDrawingElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingDialog((current) =>
      current
        ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
            ...current,
            elements: current.elements.map((element) => (element.id === elementId ? { ...element, ...patch } : element))
          })
        : current
    );
  };
}

export function createUpdateStateIconDrawingElements(__appScope: Record<string, any>) {
  return (elementIds: readonly string[], updater: (element: StateIconDrawingElement) => StateIconDrawingElement, options: { recordHistory?: boolean } = {}) => {
  const { setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    const idSet = new Set(elementIds);
    setStateIconDrawingDialog((current) =>
      current
        ? (options.recordHistory ? pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements) : undefined, {
            ...current,
            elements: current.elements.map((element) => (idSet.has(element.id) ? updater(element) : element))
          })
        : current
    );
  };
}

export function createStateIconDrawingPointer(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGElement>): Point => {
  const { stateIconDrawingSvgRef } = __appScope;
    const svg = stateIconDrawingSvgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return { x: 0, y: 0 };
    }
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  };
}

export function createStateIconDrawingSelection(__appScope: Record<string, any>) {
  return (elementId: string, append: boolean) => {
  const { setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const currentIds = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      const selectedElementIds = append
        ? currentIds.includes(elementId)
          ? currentIds.filter((id) => id !== elementId)
          : [...currentIds, elementId]
        : [elementId];
      return {
        ...current,
        selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
        selectedElementIds
      };
    });
  };
}

export function createStartStateIconDrawingDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGElement>, elementId: string, mode: StateIconDrawingDragMode) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingDragRef, stateIconDrawingHistoryRef, stateIconDrawingPointer } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setStateIconDrawingContextMenu(null);
    (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
    const append = event.shiftKey || event.ctrlKey || event.metaKey;
    let dragIds: string[] = [elementId];
    let startElements: StateIconDrawingElement[] = [];
    let center: Point = { x: 0, y: 0 };
    const start = stateIconDrawingPointer(event);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const existingSelection = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      const selectedElementIds = append
        ? existingSelection.includes(elementId)
          ? existingSelection
          : [...existingSelection, elementId]
        : existingSelection.includes(elementId)
          ? existingSelection
          : [elementId];
      dragIds = selectedElementIds;
      startElements = current.elements.filter((element) => selectedElementIds.includes(element.id)).map((element) => ({ ...element }));
      if (startElements.length > 0) {
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      }
      center = startElements.length === 1
        ? { x: startElements[0].x, y: startElements[0].y }
        : {
            x: startElements.reduce((sum, element) => sum + element.x, 0) / Math.max(1, startElements.length),
            y: startElements.reduce((sum, element) => sum + element.y, 0) / Math.max(1, startElements.length)
          };
      return {
        ...current,
        selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
        selectedElementIds,
        smartAlignmentGuides: []
      };
    });
    if (startElements.length === 0) {
      return;
    }
    stateIconDrawingDragRef.current = { mode, elementIds: dragIds, start, center, startElements };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
}

export function createDragStateIconDrawingSelection(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { computeStateIconDrawingSmartAlignmentSnap, setStateIconDrawingDialog, stateIconDrawingDragRef, stateIconDrawingPointer, updateStateIconDrawingElements } = __appScope;
    const drag = stateIconDrawingDragRef.current;
    if (!drag) {
      return;
    }
    event.preventDefault();
    const point = stateIconDrawingPointer(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (drag.mode === "move") {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const snap = computeStateIconDrawingSmartAlignmentSnap
          ? computeStateIconDrawingSmartAlignmentSnap({
              elements: current.elements,
              selectedIds: drag.elementIds,
              startElements: drag.startElements,
              delta: { x: dx, y: dy }
            })
          : { delta: { x: dx, y: dy }, guides: [] };
        return {
          ...current,
          elements: current.elements.map((element) => {
            const startElement = drag.startElements.find((item) => item.id === element.id);
            return startElement ? { ...element, x: startElement.x + snap.delta.x, y: startElement.y + snap.delta.y } : element;
          }),
          smartAlignmentGuides: snap.guides
        };
      });
      return;
    }
    if (drag.mode === "resize") {
      const startDistance = Math.hypot(drag.start.x - drag.center.x, drag.start.y - drag.center.y) || 1;
      const currentDistance = Math.hypot(point.x - drag.center.x, point.y - drag.center.y) || 1;
      const scale = Math.max(0.05, currentDistance / startDistance);
      updateStateIconDrawingElements(drag.elementIds, (element) => {
        const startElement = drag.startElements.find((item) => item.id === element.id);
        return startElement
          ? {
              ...element,
              x: drag.center.x + (startElement.x - drag.center.x) * scale,
              y: drag.center.y + (startElement.y - drag.center.y) * scale,
              width: Math.max(1, startElement.width * scale),
              height: Math.max(1, startElement.height * scale)
            }
          : element;
      });
      return;
    }
    const startAngle = Math.atan2(drag.start.y - drag.center.y, drag.start.x - drag.center.x);
    const currentAngle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x);
    const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;
    updateStateIconDrawingElements(drag.elementIds, (element) => {
      const startElement = drag.startElements.find((item) => item.id === element.id);
      return startElement ? { ...element, rotation: startElement.rotation + deltaAngle } : element;
    });
  };
}

export function createStopStateIconDrawingDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingDragRef } = __appScope;
    stateIconDrawingDragRef.current = null;
    setStateIconDrawingDialog?.((current: any) => current ? { ...current, smartAlignmentGuides: [] } : current);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
}

export function createDeleteSelectedStateIconDrawingElements(__appScope: Record<string, any>) {
  return () => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const selectedIds = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      if (selectedIds.length === 0) {
        return current;
      }
      pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      const selectedSet = new Set(selectedIds);
      const elements = current.elements.filter((element) => !selectedSet.has(element.id));
      return {
        ...current,
        elements,
        selectedElementId: elements[0]?.id ?? "",
        selectedElementIds: elements[0]?.id ? [elements[0].id] : []
      };
    });
  };
}

export function createStateIconDrawingKeyDown(__appScope: Record<string, any>) {
  return (event: ReactKeyboardEvent<HTMLElement>) => {
  const { deleteSelectedStateIconDrawingElements, setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingClipboardRef, stateIconDrawingDialog, stateIconDrawingElementId, stateIconDrawingHistoryRef } = __appScope;
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return;
    }
    if (event.key === "Enter" && stateIconDrawingDialog?.drawingDraft) {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => finishStateIconDrawingDraft(current, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
        if (!current || !stateIconDrawingHistoryRef.current?.length) {
          return current;
        }
        const previous = stateIconDrawingHistoryRef.current[stateIconDrawingHistoryRef.current.length - 1];
        stateIconDrawingHistoryRef.current = stateIconDrawingHistoryRef.current.slice(0, -1);
        const selectedElementId = previous.some((element) => element.id === current.selectedElementId) ? current.selectedElementId : previous[0]?.id ?? "";
        return {
          ...current,
          elements: previous.map((element) => ({ ...element })),
          selectedElementId,
          selectedElementIds: current.selectedElementIds.filter((id) => previous.some((element) => element.id === id))
        };
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedSet = new Set(stateIconDrawingSelectedIds(current));
        stateIconDrawingClipboardRef.current = current.elements.filter((element) => selectedSet.has(element.id)).map((element) => ({ ...element }));
        return current;
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => cutStateIconDrawingSelection(current, stateIconDrawingClipboardRef, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
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
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        selectedElementId: current.elements[current.elements.length - 1]?.id ?? "",
        selectedElementIds: current.elements.map((element) => element.id)
      } : current);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedStateIconDrawingElements();
    }
  };
}

export function createAddStateIconDrawingElement(__appScope: Record<string, any>) {
  return (kind: StateVisualShapeKind) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current) => {
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

export function createDeleteStateIconDrawingElement(__appScope: Record<string, any>) {
  return (elementId: string) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      const elements = current.elements.filter((element) => element.id !== elementId);
      return {
        ...current,
        elements,
        selectedElementId: elements.some((element) => element.id === current.selectedElementId) ? current.selectedElementId : elements[0]?.id ?? "",
        selectedElementIds: current.selectedElementIds.filter((id) => elements.some((element) => element.id === id))
      };
    });
  };
}

export function createOpenStateIconDrawingDialog(__appScope: Record<string, any>) {
  return (target: StateIconDrawingTarget) => {
  const { createStateIconDrawingInitialElements, customDeviceDraft, definitionStateDraftRows, imageAssets, setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    const row =
      target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === target.rowId);
    const initial = createStateIconDrawingInitialElements(row, imageAssets);
    stateIconDrawingHistoryRef.current = [];
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog({
      target,
      elements: initial,
      selectedElementId: initial[0]?.id ?? "",
      selectedElementIds: initial[0]?.id ? [initial[0].id] : [],
      frame: { ...STATE_ICON_DRAFT_FRAME }
    });
  };
}

export function createApplyStateIconDrawingDialog(__appScope: Record<string, any>) {
  return async () => {
  const { backendImageIdFromHref, fetchBackendImageDataUrl, imageAssetList, imageAssets, isImageDataUrl, setStateIconDrawingDialog, stateIconDrawingDialog, stateIconDrawingToImage, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow } = __appScope;
    if (!stateIconDrawingDialog || stateIconDrawingDialog.elements.length === 0) {
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
    const patch: Partial<DeviceDefinitionStateDraftRow> = {
      image: stateIconDrawingToImage(stateIconDrawingDialog.elements, { resolveImageHref }),
      imageAssetId: "",
      backgroundImage: "",
      backgroundImageAssetId: ""
    };
    if (stateIconDrawingDialog.target.scope === "definition") {
      updateDefinitionStateDraftRow(stateIconDrawingDialog.target.rowId, patch);
    } else {
      updateCustomDeviceStateDraftRow(stateIconDrawingDialog.target.rowId, patch);
    }
    setStateIconDrawingDialog(null);
  };
}

export function createEnsureCustomComponentTreeExpanded(__appScope: Record<string, any>) {
  return (attributeLibraryName: string, componentType?: string) => {
  const { customComponentTreeTypeKey, normalizeAttributeLibraryName, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes } = __appScope;
    const normalizedLibrary = normalizeAttributeLibraryName(attributeLibraryName);
    setCollapsedCustomComponentTreeLibraries((current) => {
      const next = new Set(current);
      next.delete(normalizedLibrary);
      return next;
    });
    if (componentType) {
      const typeKey = customComponentTreeTypeKey(normalizedLibrary, componentType);
      setCollapsedCustomComponentTreeTypes((current) => {
        const next = new Set(current);
        next.delete(typeKey);
        return next;
      });
    }
  };
}

export function createCancelPendingCustomComponentTemplateLoad(__appScope: Record<string, any>) {
  return () => {
  const { customComponentSelectionFrameRef, customComponentSelectionRequestRef } = __appScope;
    customComponentSelectionRequestRef.current += 1;
    if (customComponentSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(customComponentSelectionFrameRef.current);
      customComponentSelectionFrameRef.current = null;
    }
  };
}

export function createSelectCustomAttributeLibrary(__appScope: Record<string, any>) {
  return (attributeLibraryName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, defaultComponentTypeForAttributeLibrary, ensureCustomComponentTreeExpanded, normalizeAttributeLibraryName, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setEditingCustomDeviceKind } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeAttributeLibraryName(attributeLibraryName);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group);
    }
    setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName: group });
    setEditingCustomDeviceKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName: group,
      componentType: defaultComponentTypeForAttributeLibrary(group),
      componentName: "",
      error: ""
    }));
  };
}

export function createSelectCustomComponentType(__appScope: Record<string, any>) {
  return (attributeLibraryName: string, sectionName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, ensureCustomComponentTreeExpanded, normalizeAttributeLibraryName, normalizeComponentTypeName, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setEditingCustomDeviceKind } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeAttributeLibraryName(attributeLibraryName);
    const section = normalizeComponentTypeName(sectionName);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group, section);
    }
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName: group, section });
    setEditingCustomDeviceKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName: group,
      componentType: section,
      componentName: "",
      error: ""
    }));
  };
}

export function createSelectCustomComponentTemplate(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, sectionName?: string) => {
  const { DEFAULT_STATE_PAGE_ID, createCustomDeviceDraftFromTemplate, customComponentSelectionFrameRef, customComponentSelectionRequestRef, customDeviceDefinitionMode, ensureCustomComponentTreeExpanded, normalizeAttributeLibraryName, normalizeComponentTypeName, resolveTemplateComponentType, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (sectionName === undefined) {
      sectionName = resolveTemplateComponentType(template);
    }
    const attributeLibraryName = normalizeAttributeLibraryName(template.attributeLibrary);
    const section = normalizeComponentTypeName(sectionName);
    customComponentSelectionRequestRef.current += 1;
    setCustomDeviceSaveMessage("");
    ensureCustomComponentTreeExpanded(attributeLibraryName, section);
    if (customComponentSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(customComponentSelectionFrameRef.current);
      customComponentSelectionFrameRef.current = null;
    }
    const nextDraft = createCustomDeviceDraftFromTemplate(template, section);
    const editableDraft = customDeviceDefinitionMode === "edit" && !template.custom
      ? { ...nextDraft, error: "" }
      : nextDraft;
    setSelectedDefinitionKind(template.kind);
    setDefinitionDraftSection(section);
    setCustomComponentTreeSelection({ kind: "component", attributeLibraryName, section, templateKind: template.kind });
    setEditingCustomDeviceKind(template.custom ? template.kind : "");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDraft(editableDraft);
  };
}

export function createStartCustomComponentCreate(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, createEmptyCustomDeviceDraft, customComponentTreeSelection, defaultComponentTypeForAttributeLibrary, normalizeAttributeLibraryName, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (!requireEditMode("新建元件")) {
      return;
    }
    cancelPendingCustomComponentTemplateLoad();
    const attributeLibraryName = normalizeAttributeLibraryName(customComponentTreeSelection.attributeLibraryName);
    const section =
      customComponentTreeSelection.kind === "componentType" || customComponentTreeSelection.kind === "component"
        ? customComponentTreeSelection.section
        : defaultComponentTypeForAttributeLibrary(attributeLibraryName);
    setCustomDeviceDefinitionMode("create");
    setEditingCustomDeviceKind("");
    setSelectedDefinitionKind("");
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName, section });
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceSaveMessage("");
    const nextDraft = {
      ...createEmptyCustomDeviceDraft(attributeLibraryName),
      componentType: section,
      componentName: "",
      error: ""
    };
    setCustomDeviceDialogView(nextDraft.terminalCount > 0 ? "terminals" : "icon");
    setCustomDeviceDraft(nextDraft);
  };
}

export function createNextCustomAttributeLibraryName(__appScope: Record<string, any>) {
  return () => {
  const { attributeLibraries } = __appScope;
    const existingGroups = new Set(attributeLibraries.map((group) => group.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `属性库${index}`;
      if (!existingGroups.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `属性库${Date.now()}`;
  };
}

export function createCreateCustomAttributeLibrary(__appScope: Record<string, any>) {
  return () => {
  const { attributeLibraries, defaultComponentTypeForAttributeLibrary, nextCustomAttributeLibraryName, normalizeAttributeLibraryName, normalizeCustomAttributeLibraries, requireEditMode, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomDeviceDraft, setExpandedAttributeLibraries } = __appScope;
    if (!requireEditMode("新建属性库")) {
      return;
    }
    const defaultName = nextCustomAttributeLibraryName();
    const rawName = window.prompt("请输入新属性库名称", defaultName);
    if (rawName === null) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(rawName.trim());
    if (!attributeLibraryName) {
      window.alert("属性库名称不能为空。");
      return;
    }
    const existingGroups = new Set(attributeLibraries.map((group) => group.toLowerCase()));
    if (existingGroups.has(attributeLibraryName.toLowerCase())) {
      window.alert("属性库名称已存在，无法新增同名属性库。");
      return;
    }
    setCustomAttributeLibraries((current) => normalizeCustomAttributeLibraries([...current, attributeLibraryName]));
    setExpandedAttributeLibraries((current) => Array.from(new Set([...current, attributeLibraryName])));
    setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName });
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName,
      componentType: defaultComponentTypeForAttributeLibrary(attributeLibraryName),
      error: ""
    }));
  };
}

export function createDeleteCustomAttributeLibrary(__appScope: Record<string, any>) {
  return (targetAttributeLibraryName?: string) => {
  const { PROTECTED_ATTRIBUTE_LIBRARIES, customComponentTypes, customDeviceDraft, customDeviceTemplates, defaultComponentTypeForAttributeLibrary, isBuiltInComponentType, normalizeAttributeLibraryName, requireEditMode, resolveTemplateComponentType, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setExpandedAttributeLibraries, setExpandedDefinitionGroups, setSelectedDefinitionKind } = __appScope;
    if (targetAttributeLibraryName === undefined) {
      targetAttributeLibraryName = customDeviceDraft.attributeLibraryName;
    }
    if (!requireEditMode("删除属性库")) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(targetAttributeLibraryName);
    if (!attributeLibraryName || attributeLibraryName === "静态图元" || PROTECTED_ATTRIBUTE_LIBRARIES.has(attributeLibraryName)) {
      window.alert("默认属性库无法删除。");
      return;
    }
    const templatesInGroup = customDeviceTemplates.filter((template) => normalizeAttributeLibraryName(template.attributeLibrary) === attributeLibraryName);
    if (templatesInGroup.length > 0) {
      const confirmed = window.confirm(`属性库“${attributeLibraryName}”中共有 ${templatesInGroup.length} 个元件，删除属性库会同时删除这些元件及其自定义元件类型，是否继续？`);
      if (!confirmed) {
        return;
      }
    }
    const deletedKinds = new Set(templatesInGroup.map((template) => template.kind));
    const deletedComponentTypeKeys = new Set(
      [
        ...templatesInGroup.map(resolveTemplateComponentType),
        ...customComponentTypes
          .filter((componentType) => normalizeAttributeLibraryName(componentType.attributeLibraryName) === attributeLibraryName)
          .map((componentType) => componentType.name)
      ]
        .filter((section) => section && !isBuiltInComponentType(section))
        .map((section) => section.toLowerCase())
    );
    setCustomDeviceTemplates((current) => current.filter((template) => normalizeAttributeLibraryName(template.attributeLibrary) !== attributeLibraryName));
    if (deletedComponentTypeKeys.size > 0) {
      setCustomComponentTypes((current) => current.filter((componentType) => !deletedComponentTypeKeys.has(componentType.name.toLowerCase())));
      setDefinitionDraftSection((current) =>
        deletedComponentTypeKeys.has(current.toLowerCase()) ? defaultComponentTypeForAttributeLibrary("交流设备") : current
      );
    }
    setCustomAttributeLibraries((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setExpandedAttributeLibraries((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setExpandedDefinitionGroups((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setCollapsedCustomComponentTreeLibraries((current) => {
      const next = new Set(current);
      next.delete(attributeLibraryName);
      return next;
    });
    setCollapsedCustomComponentTreeTypes((current) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.startsWith(`${attributeLibraryName}::`)) {
          next.delete(key);
        }
      }
      return next;
    });
    setSelectedDefinitionKind((current) => (deletedKinds.has(current) ? "" : current));
    setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName: "交流设备" });
    setEditingCustomDeviceKind("");
    if (deletedKinds.size > 0) {
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of deletedKinds) {
          delete next[kind];
        }
        return next;
      });
    }
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName: "交流设备",
      componentType: defaultComponentTypeForAttributeLibrary("交流设备"),
      error: ""
    }));
  };
}

export function createNextCustomComponentTypeName(__appScope: Record<string, any>) {
  return () => {
  const { componentTypeOptions } = __appScope;
    const existingTypes = new Set(componentTypeOptions.map((componentType) => componentType.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `CustomDevice${index}`;
      if (!existingTypes.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `CustomDevice${Date.now()}`;
  };
}

export function createCreateCustomComponentType(__appScope: Record<string, any>) {
  return () => {
  const { componentTypeOptions, customDeviceDraft, isValidComponentTypeName, nextCustomComponentTypeName, normalizeAttributeLibraryName, normalizeComponentTypeName, normalizeCustomComponentTypes, requireEditMode, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft } = __appScope;
    if (!requireEditMode("新建元件类型")) {
      return;
    }
    const rawName = window.prompt("请输入新元件类型英文名称", nextCustomComponentTypeName());
    if (rawName === null) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(customDeviceDraft.attributeLibraryName);
    const componentType = normalizeComponentTypeName(rawName);
    if (!componentType) {
      window.alert("元件类型名称不能为空。");
      return;
    }
    if (!isValidComponentTypeName(componentType)) {
      window.alert("元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
      return;
    }
    const existingTypes = new Set(componentTypeOptions.map((item) => item.toLowerCase()));
    if (existingTypes.has(componentType.toLowerCase())) {
      window.alert("元件类型已存在，无法新增同名元件类型。");
      return;
    }
    setCustomComponentTypes((current) => normalizeCustomComponentTypes([...current, { name: componentType, attributeLibraryName }]));
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName, section: componentType });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentType: componentType,
      error: ""
    }));
  };
}

export function createDeleteCustomComponentType(__appScope: Record<string, any>) {
  return (targetSection?: string) => {
  const { E_SECTION_OPTIONS, customComponentTreeSelection, customDeviceDraft, defaultComponentTypeForAttributeLibrary, libraryTemplates, normalizeAttributeLibraryName, normalizeComponentTypeName, requireEditMode, resolveTemplateComponentType, setCollapsedCustomComponentTreeTypes, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (targetSection === undefined) {
      targetSection = customDeviceDraft.componentType;
    }
    if (!requireEditMode("删除元件类型")) {
      return;
    }
    const componentType = normalizeComponentTypeName(targetSection);
    if (!componentType || E_SECTION_OPTIONS.some((section) => section.toLowerCase() === componentType.toLowerCase())) {
      window.alert("内置元件类型无法删除。");
      return;
    }
    const templatesWithType = libraryTemplates.filter((template) => template.custom && resolveTemplateComponentType(template).toLowerCase() === componentType.toLowerCase());
    if (templatesWithType.length > 0) {
      const confirmed = window.confirm(`元件类型“${componentType}”下共有 ${templatesWithType.length} 个自定义元件，删除元件类型会同时删除这些元件，是否继续？`);
      if (!confirmed) {
        return;
      }
    }
    const deletedKinds = new Set(templatesWithType.map((template) => template.kind));
    setCustomComponentTypes((current) => current.filter((item) => item.name.toLowerCase() !== componentType.toLowerCase()));
    setCustomDeviceTemplates((current) => current.filter((template) => !deletedKinds.has(template.kind)));
    setSelectedDefinitionKind((current) => (deletedKinds.has(current) ? "" : current));
    setEditingCustomDeviceKind((current) => (deletedKinds.has(current) ? "" : current));
    setCollapsedCustomComponentTreeTypes((current) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.endsWith(`::${componentType}`)) {
          next.delete(key);
        }
      }
      return next;
    });
    if (deletedKinds.size > 0) {
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of deletedKinds) {
          delete next[kind];
        }
        return next;
      });
    }
    const fallbackAttributeLibraryName = customComponentTreeSelection.kind === "componentType" ? customComponentTreeSelection.attributeLibraryName : customDeviceDraft.attributeLibraryName;
    const fallbackSection = defaultComponentTypeForAttributeLibrary(fallbackAttributeLibraryName);
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName: normalizeAttributeLibraryName(fallbackAttributeLibraryName), section: fallbackSection });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentType: fallbackSection,
      error: ""
    }));
    setDefinitionDraftSection((current) => (current.toLowerCase() === componentType.toLowerCase() ? fallbackSection : current));
  };
}

export function createRenameSelectedCustomDeviceTreeItem(__appScope: Record<string, any>) {
  return () => {
  const { PROTECTED_ATTRIBUTE_LIBRARIES, attributeLibraries, componentTypeOptions, customComponentTreeSelection, customComponentTreeTypeKey, isBuiltInComponentType, isValidComponentTypeName, libraryTemplateByKind, libraryTemplates, normalizeAttributeLibraryName, normalizeComponentTypeName, requireEditMode, resolveTemplateComponentType, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setExpandedAttributeLibraries, setExpandedDefinitionGroups } = __appScope;
    if (!requireEditMode("重命名元件库条目")) {
      return;
    }
    if (customComponentTreeSelection.kind === "attributeLibrary") {
      const oldAttributeLibraryName = normalizeAttributeLibraryName(customComponentTreeSelection.attributeLibraryName);
      if (PROTECTED_ATTRIBUTE_LIBRARIES.has(oldAttributeLibraryName) || oldAttributeLibraryName === "静态图元") {
        window.alert("系统内置属性库不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的属性库名称", oldAttributeLibraryName);
      if (rawName === null) {
        return;
      }
      const newAttributeLibraryName = normalizeAttributeLibraryName(rawName.trim());
      if (!newAttributeLibraryName) {
        window.alert("属性库名称不能为空。");
        return;
      }
      if (attributeLibraries.some((group) => normalizeAttributeLibraryName(group).toLowerCase() === newAttributeLibraryName.toLowerCase() && normalizeAttributeLibraryName(group) !== oldAttributeLibraryName)) {
        window.alert("属性库名称已存在，无法重命名。");
        return;
      }
      setCustomAttributeLibraries((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setCustomComponentTypes((current) => current.map((componentType) => normalizeAttributeLibraryName(componentType.attributeLibraryName) === oldAttributeLibraryName ? { ...componentType, attributeLibraryName: newAttributeLibraryName } : componentType));
      setCustomDeviceTemplates((current) => current.map((template) => normalizeAttributeLibraryName(template.attributeLibrary) === oldAttributeLibraryName ? { ...template, attributeLibrary: newAttributeLibraryName } : template));
      setExpandedAttributeLibraries((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setExpandedDefinitionGroups((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setCollapsedCustomComponentTreeLibraries((current) => {
      const next = new Set(current);
      if (next.has(oldAttributeLibraryName)) {
        next.delete(oldAttributeLibraryName);
        next.add(newAttributeLibraryName);
      }
      return next;
    });
    setCollapsedCustomComponentTreeTypes((current) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.startsWith(`${oldAttributeLibraryName}::`)) {
          next.delete(key);
          next.add(key.replace(`${oldAttributeLibraryName}::`, `${newAttributeLibraryName}::`));
        }
      }
      return next;
    });
      setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName: newAttributeLibraryName });
      setCustomDeviceDraft((current) => ({
        ...current,
        attributeLibraryName: normalizeAttributeLibraryName(current.attributeLibraryName) === oldAttributeLibraryName ? newAttributeLibraryName : current.attributeLibraryName,
        error: ""
      }));
      return;
    }
    if (customComponentTreeSelection.kind === "componentType") {
      const oldSection = normalizeComponentTypeName(customComponentTreeSelection.section);
      if (isBuiltInComponentType(oldSection)) {
        window.alert("系统内置元件类型不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的元件类型英文名称", oldSection);
      if (rawName === null) {
        return;
      }
      const newSection = normalizeComponentTypeName(rawName);
      if (!isValidComponentTypeName(newSection)) {
        window.alert("元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
        return;
      }
      if (componentTypeOptions.some((section) => section.toLowerCase() === newSection.toLowerCase() && section.toLowerCase() !== oldSection.toLowerCase())) {
        window.alert("元件类型已存在，无法重命名。");
        return;
      }
      const attributeLibraryName = normalizeAttributeLibraryName(customComponentTreeSelection.attributeLibraryName);
      const affectedKinds = new Set(
        libraryTemplates
          .filter((template) => template.custom && normalizeAttributeLibraryName(template.attributeLibrary) === attributeLibraryName && resolveTemplateComponentType(template).toLowerCase() === oldSection.toLowerCase())
          .map((template) => template.kind)
      );
      setCustomComponentTypes((current) => current.map((componentType) =>
        componentType.name.toLowerCase() === oldSection.toLowerCase() ? { ...componentType, name: newSection, attributeLibraryName } : componentType
      ));
      setCollapsedCustomComponentTreeTypes((current) => {
        const next = new Set(current);
        const oldKey = customComponentTreeTypeKey(attributeLibraryName, oldSection);
        const newKey = customComponentTreeTypeKey(attributeLibraryName, newSection);
        if (next.has(oldKey)) {
          next.delete(oldKey);
          next.add(newKey);
        }
        return next;
      });
      setCustomDeviceTemplates((current) => current.map((template) =>
        affectedKinds.has(template.kind)
          ? { ...template, params: { ...template.params, component_type: newSection } }
          : template
      ));
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of affectedKinds) {
          const override = next[kind];
          if (override) {
            next[kind] = { ...override, params: { ...(override.params ?? {}), component_type: newSection } };
          }
        }
        return next;
      });
      setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName, section: newSection });
      setCustomDeviceDraft((current) => ({
        ...current,
        attributeLibraryName,
        componentType: current.componentType.toLowerCase() === oldSection.toLowerCase() ? newSection : current.componentType,
        error: ""
      }));
      setDefinitionDraftSection((current) => current.toLowerCase() === oldSection.toLowerCase() ? newSection : current);
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      window.alert("系统内置元件不能在这里重命名。");
      return;
    }
    const rawName = window.prompt("请输入新的元件名称", template.label);
    if (rawName === null) {
      return;
    }
    const newLabel = rawName.trim();
    if (!newLabel) {
      window.alert("元件名称不能为空。");
      return;
    }
    setCustomDeviceTemplates((current) => current.map((item) => item.kind === template.kind ? { ...item, label: newLabel } : item));
    setCustomDeviceDraft((current) => ({
      ...current,
      componentName: current.componentName === template.label ? newLabel : current.componentName,
      error: ""
    }));
  };
}

export function createDeleteSelectedCustomDeviceTreeItem(__appScope: Record<string, any>) {
  return () => {
  const { customComponentTreeSelection, deleteCustomAttributeLibrary, deleteCustomComponentType, libraryTemplateByKind, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceTemplates, setDeviceDefinitionOverrides, setEditingCustomDeviceKind } = __appScope;
    if (!requireEditMode("删除元件库条目")) {
      return;
    }
    if (customComponentTreeSelection.kind === "attributeLibrary") {
      deleteCustomAttributeLibrary(customComponentTreeSelection.attributeLibraryName);
      return;
    }
    if (customComponentTreeSelection.kind === "componentType") {
      deleteCustomComponentType(customComponentTreeSelection.section);
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      window.alert("系统内置元件不能在这里删除。");
      return;
    }
    const confirmed = window.confirm(`确认删除元件“${template.label}”？`);
    if (!confirmed) {
      return;
    }
    setCustomDeviceTemplates((current) => current.filter((item) => item.kind !== template.kind));
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[template.kind];
      return next;
    });
    setEditingCustomDeviceKind((current) => current === template.kind ? "" : current);
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName: customComponentTreeSelection.attributeLibraryName, section: customComponentTreeSelection.section });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentName: "",
      error: ""
    }));
  };
}

export function createNextCustomTemplateKind(__appScope: Record<string, any>) {
  return (componentType: string) => {
  const { libraryTemplates } = __appScope;
    const safeType = componentType.replace(/[^A-Za-z0-9_]+/g, "_") || "CustomDevice";
    const existingKinds = new Set(libraryTemplates.map((template) => template.kind.toLowerCase()));
    const base = `custom-${safeType}`;
    if (!existingKinds.has(base.toLowerCase())) {
      return base;
    }
    for (let index = 2; index <= 999; index += 1) {
      const candidate = `${base}-${index}`;
      if (!existingKinds.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `${base}-${Date.now()}`;
  };
}

export function createSaveCustomDeviceTemplate(__appScope: Record<string, any>) {
  return (options: { closeAfterSave?: boolean } = {}) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, closeCustomDeviceDialog, customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceTemplates, customDeviceTerminalAnchors, defaultComponentTypeForAttributeLibrary, editingCustomDeviceKind, ensureCustomComponentTreeExpanded, generateCustomDeviceImage, hasOverlappingCustomDeviceTerminalAnchors, isReservedDeviceDefinitionParamName, isValidComponentTypeName, nextCustomTemplateKind, normalizeAttributeLibraryName, normalizeComponentTypeName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceSaveMessage, setCustomDeviceTemplates, setEditingCustomDeviceKind, setExpandedAttributeLibraries, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件")) {
      return;
    }
    setCustomDeviceSaveMessage("");
    const attributeLibraryName = normalizeAttributeLibraryName(customDeviceDraft.attributeLibraryName);
    const componentType = normalizeComponentTypeName(customDeviceDraft.componentType);
    const componentLabel = customDeviceDraft.componentName.trim() || componentType;
    if (!componentType) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请选择元件类型。" }));
      return;
    }
    if (!isValidComponentTypeName(componentType)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。" }));
      return;
    }
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    if (customDeviceDraft.isContainer) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        window.alert(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      window.alert(message);
      setCustomDeviceDraft((current) => ({ ...current, error: message }));
      return;
    }
    const customRows: DeviceParameterDefinition[] = customDeviceDraft.params
      .map((row) => normalizeDefinitionRowEnumFields({
        cnName: row.cnName.trim(),
        enName: row.enName.trim(),
        valueType: row.valueType,
        typicalValue: row.typicalValue.trim(),
        enumOptions: row.enumOptions,
        enumValues: row.enumValues
      }))
      .filter((row) => row.cnName || row.enName);
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "属性行的中文名称和英文名称不能为空。" }));
      return;
    }
    const reservedCustomRow = customRows.find((row) => isReservedDeviceDefinitionParamName(row.enName));
    if (reservedCustomRow) {
      setCustomDeviceDraft((current) => ({
        ...current,
        error: reservedCustomRow.enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。"
      }));
      return;
    }
    const definitions = [...customDefaultDefinitions(terminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      terminalAssociations
    }), ...customRows];
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current) => ({ ...current, error: `属性英文名称重复：${duplicateDefinition.enName}` }));
      return;
    }
    const stateValidation = validateStateDraftRows(customDeviceDraft.stateDefinitions);
    if (stateValidation.error) {
      setCustomDeviceDraft((current) => ({ ...current, error: stateValidation.error }));
      return;
    }
    const backgroundImage =
      customDeviceDraft.backgroundImage || generateCustomDeviceImage(componentLabel, terminalTypes.length > 0 ? terminalTypes : ["ac"]);
    const backgroundImageAssetId = customDeviceDraft.backgroundImageAssetId && backgroundImage === `/api/images/${customDeviceDraft.backgroundImageAssetId}`
      ? customDeviceDraft.backgroundImageAssetId
      : "";
    const defaultImageCandidates = customDeviceGeneratedDefaultImageCandidates(
      componentLabel,
      customDeviceDraft.componentType,
      terminalTypes
    );
    const stateDefinitions = syncInheritedCustomDeviceStateVisuals(
      stateValidation.states,
      {
        backgroundImage,
        backgroundImageAssetId,
      },
      defaultImageCandidates
    );
    const customKind = editingCustomDeviceKind || nextCustomTemplateKind(componentType);
    const previousCustomTemplate = editingCustomDeviceKind
      ? customDeviceTemplates.find((item) => item.kind === editingCustomDeviceKind)
      : undefined;
    const template: DeviceTemplate = {
      kind: customKind,
      label: componentLabel,
      attributeLibrary: attributeLibraryName,
      size: customDeviceDraft.size,
      params: {
        component_type: customDeviceDraft.componentType || defaultComponentTypeForAttributeLibrary(attributeLibraryName),
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage,
        backgroundImageAssetId
      },
      terminalType: terminalTypes[0] ?? "ac",
      terminalCount: terminalTypes.length,
      terminalTypes,
      terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
      terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(
        (label, index) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
      ),
      terminalAnchors: customDeviceTerminalAnchors.slice(0, terminalTypes.length).map((anchor) => ({ ...anchor })),
      isContainer: customDeviceDraft.isContainer,
      allowResizeTransform: customDeviceDraft.allowResizeTransform === "1",
      custom: true,
      parameterDefinitions: definitions,
      stateDefinitions,
    };
    const nextTemplates = editingCustomDeviceKind && customDeviceTemplates.some((item) => item.kind === editingCustomDeviceKind)
      ? customDeviceTemplates.map((item) => item.kind === editingCustomDeviceKind ? template : item)
      : [...customDeviceTemplates, template];
    setCustomDeviceTemplates(nextTemplates);
    if (editingCustomDeviceKind) {
      syncExistingNodesWithTemplateDefinitions(
        template,
        previousCustomTemplate?.parameterDefinitions,
        (node) => node.kind === customKind
      );
    }
    persistDeviceLibraryChange({ customDeviceTemplates: nextTemplates }, {
      success: `自定义元件已保存到后台：${componentLabel}`,
      failure: `自定义元件已保存到本地，后台保存失败：${componentLabel}`
    });
    setExpandedAttributeLibraries((current) => Array.from(new Set([...current, attributeLibraryName])));
    ensureCustomComponentTreeExpanded(attributeLibraryName, componentType);
    setCustomComponentTreeSelection({ kind: "component", attributeLibraryName, section: componentType, templateKind: customKind });
    setEditingCustomDeviceKind(customKind);
    setCustomDeviceDraft((current) => ({ ...current, error: "" }));
    setCustomDeviceSaveMessage(`自定义元件已保存：${componentLabel}`);
    writeOperationLog(`保存自定义元件：${componentLabel}`);
    if (options.closeAfterSave) {
      closeCustomDeviceDialog();
    }
  };
}

export function createSaveBuiltinDeviceDefinitionFromCustomDraft(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, options: { closeAfterSave?: boolean } = {}) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, closeCustomDeviceDialog, customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceTerminalAnchors, deviceDefinitionOverrideForTemplate, deviceDefinitionOverrides, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, isReservedDeviceDefinitionParamName, isValidComponentTypeName, normalizeComponentTypeName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, requireEditMode, setCustomDeviceDraft, setCustomDeviceSaveMessage, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件定义")) {
      return;
    }
    setCustomDeviceSaveMessage("");
    const componentType = normalizeComponentTypeName(customDeviceDraft.componentType);
    if (!componentType) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请选择元件类型。" }));
      return;
    }
    if (!isValidComponentTypeName(componentType)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。" }));
      return;
    }
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    if (customDeviceDraft.isContainer) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        window.alert(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      window.alert(message);
      setCustomDeviceDraft((current) => ({ ...current, error: message }));
      return;
    }
    const customRows: DeviceParameterDefinition[] = customDeviceDraft.params
      .map((row) => normalizeDefinitionRowEnumFields({
        cnName: row.cnName.trim(),
        enName: row.enName.trim(),
        valueType: row.valueType,
        typicalValue: row.typicalValue.trim(),
        enumOptions: row.enumOptions,
        enumValues: row.enumValues
      }))
      .filter((row) => row.cnName || row.enName);
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "属性行的中文名称和英文名称不能为空。" }));
      return;
    }
    const reservedCustomRow = customRows.find((row) => isReservedDeviceDefinitionParamName(row.enName));
    if (reservedCustomRow) {
      setCustomDeviceDraft((current) => ({
        ...current,
        error: reservedCustomRow.enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。"
      }));
      return;
    }
    const definitions = [...customDefaultDefinitions(terminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      terminalAssociations
    }), ...customRows];
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current) => ({ ...current, error: `属性英文名称重复：${duplicateDefinition.enName}` }));
      return;
    }
    const stateValidation = validateStateDraftRows(customDeviceDraft.stateDefinitions);
    if (stateValidation.error) {
      setCustomDeviceDraft((current) => ({ ...current, error: stateValidation.error }));
      return;
    }
    const backgroundImage = customDeviceDraft.backgroundImage;
    const backgroundImageAssetId = customDeviceDraft.backgroundImageAssetId && backgroundImage === `/api/images/${customDeviceDraft.backgroundImageAssetId}`
      ? customDeviceDraft.backgroundImageAssetId
      : "";
    const defaultImageCandidates = customDeviceGeneratedDefaultImageCandidates(
      customDeviceDraft.componentName.trim() || template.label,
      customDeviceDraft.componentType,
      terminalTypes
    );
    const stateDefinitions = syncInheritedCustomDeviceStateVisuals(
      stateValidation.states,
      {
        backgroundImage,
        backgroundImageAssetId,
      },
      defaultImageCandidates
    );
    const size = {
      width: Math.max(1, Math.round(customDeviceDraft.size.width || template.size.width || 104)),
      height: Math.max(1, Math.round(customDeviceDraft.size.height || template.size.height || 64))
    };
    const terminalLabels = customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(
      (label, index) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
    );
    const previousDefinitions = getTemplateParameterDefinitions(template);
    syncExistingNodesWithTemplateDefinitions(
      { parameterDefinitions: definitions },
      previousDefinitions,
      (node) => node.kind === template.kind
    );
    const existingOverride = deviceDefinitionOverrideForTemplate(template, deviceDefinitionOverrides);
    const nextDeviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride> = {
      ...deviceDefinitionOverrides,
      [template.kind]: {
        ...existingOverride,
        kind: template.kind,
        params: {
          ...(existingOverride?.params ?? {}),
          component_type: componentType,
          backgroundImage,
          backgroundImageAssetId
        },
        size,
        terminalType: terminalTypes[0] ?? template.terminalType,
        terminalCount: terminalTypes.length,
        terminalTypes,
        terminalLabels,
        terminalAnchors: customDeviceTerminalAnchors.slice(0, terminalTypes.length).map((anchor) => ({ ...anchor })),
        terminalRoles: customDeviceDraft.terminalRoles.slice(0, terminalTypes.length),
        terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
        isContainer: customDeviceDraft.isContainer,
        allowResizeTransform: customDeviceDraft.allowResizeTransform === "1",
        parameterDefinitions: definitions,
        stateDefinitions,
        updatedAt: new Date().toISOString()
      }
    };
    setDeviceDefinitionOverrides(nextDeviceDefinitionOverrides);
    persistDeviceLibraryChange({ deviceDefinitionOverrides: nextDeviceDefinitionOverrides }, {
      success: `元件定义已保存到后台：${template.label}`,
      failure: `元件定义已保存到本地，后台保存失败：${template.label}`
    });
    setCustomDeviceDraft((current) => ({ ...current, size, terminalLabels, error: "" }));
    setCustomDeviceSaveMessage(`元件定义已保存：${template.label}`);
    writeOperationLog(`保存元件定义：${template.label}`);
    if (options.closeAfterSave) {
      closeCustomDeviceDialog();
    }
  };
}

export function createSaveCustomDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return (options: { closeAfterSave?: boolean } = {}) => {
  const { customDeviceDefinitionMode, editingCustomDeviceKind, measurementConfigDraft, measurementConfigDraftRef, saveBuiltinDeviceDefinitionFromCustomDraft, saveCustomDeviceTemplate, saveMeasurementConfigDialog, selectedCustomComponentTemplate, selectedDefinitionKind, selectedDefinitionTemplate } = __appScope;
    const targetTemplate = selectedDefinitionTemplate && selectedDefinitionTemplate.kind === selectedDefinitionKind
      ? selectedDefinitionTemplate
      : selectedCustomComponentTemplate;
    if (measurementConfigDraftRef.current ?? measurementConfigDraft) {
      void saveMeasurementConfigDialog();
    }
    if (customDeviceDefinitionMode === "edit" && targetTemplate && !targetTemplate.custom && editingCustomDeviceKind === "") {
      saveBuiltinDeviceDefinitionFromCustomDraft(targetTemplate, options);
      return;
    }
    saveCustomDeviceTemplate(options);
  };
}

export function createRenderStateVisualPager(__appScope: Record<string, any>) {
  return (
    rows: DeviceDefinitionStateDraftRow[],
    activeRowId: string,
    setActiveRowId: (rowId: string) => void,
    handlers: {
      update: (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => void;
      add: () => void;
      remove: (rowId: string) => void;
      reset?: () => void;
      resetLabel?: string;
      saveStateVisuals?: () => void;
      saveStateVisualsLabel?: string;
      drawingScope?: "definition" | "custom";
      hideDefaultPage?: boolean;
    }
  ) => {
  const { BufferedTextInput, COMPONENT_TYPE_LABELS, DEFAULT_STATE_PAGE_ID, DEVICE_LIBRARY, DeferredColorInput, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, MemoDeviceGlyph, STATE_ICON_LINE_CAP_OPTIONS, TERMINAL_TYPE_LIBRARY_LABELS, activeStateDraftRow, addStateIconDrawingElement, appendNonDefaultStateDraftRow, button, circle, colorPalette, createNodeFromTemplate, createStateDraftRowFromDefaultVisual, createStateIconDrawingElement, customDeviceDefaultStateVisualDraft, customDeviceDraft, customDraftTerminalTypes, defaultStateDraftRow, definitionDefaultStateVisualDraft, definitionVisualDraft, definitionVisualTerminalTypes, deleteSelectedStateIconDrawingElements, deleteStateIconDrawingElement, div, dragStateIconDrawingSelection, formatSvgNumber, g, image, isDefaultStatePageId, label, line, nextNonDefaultStateIndex, nodeGeometryTransform, nonDefaultStateDraftRows, rect, resolveTemplateComponentType, setCustomDeviceDraft, setDefinitionStateDraftRows, setImagePickerCategoryFilter, setImagePickerSearchQuery, setImagePickerSourceFilter, setImageTarget, setStateIconDrawingContextMenu, setStateIconDrawingDialog, small, span, stateDraftRowId, stateIconDrawingClipboardRef, stateIconDrawingContextMenu, stateIconDrawingDialog, stateIconDrawingElementId, stateIconDrawingElementPreviewNode, stateIconDrawingHistoryRef, stateIconDrawingKeyDown, stateIconDrawingPointer, stateIconDrawingPreviewNeedsDirectElementRender, stateIconDrawingSelection, stateIconDrawingSvgRef, stateIconDrawingToImage, stateVisualShapeLabel, startStateIconDrawingDrag, stopStateIconDrawingDrag, strong, terminalColor, text, updateStateIconDrawingElement, visibleStateIconColor } = __appScope;
    const hideDefaultPage = handlers.hideDefaultPage === true;
    const displayRows = hideDefaultPage ? rows : nonDefaultStateDraftRows(rows);
    const defaultVisual = handlers.drawingScope === "definition"
      ? definitionDefaultStateVisualDraft()
      : customDeviceDefaultStateVisualDraft();
    const defaultRow = hideDefaultPage ? null : defaultStateDraftRow(rows, defaultVisual);
    const effectiveActiveRowId = hideDefaultPage && isDefaultStatePageId(activeRowId) ? displayRows[0]?.id ?? activeRowId : activeRowId;
    const isDefaultStatePage = !hideDefaultPage && isDefaultStatePageId(effectiveActiveRowId);
    const activeRow = activeStateDraftRow(displayRows, effectiveActiveRowId);
    const activeDrawingTarget = handlers.drawingScope && (activeRow || isDefaultStatePage)
      ? { scope: handlers.drawingScope, rowId: isDefaultStatePage ? DEFAULT_STATE_PAGE_ID : activeRow.id }
      : null;
    const drawingReady =
      activeDrawingTarget &&
      stateIconDrawingDialog?.target.scope === activeDrawingTarget.scope &&
      stateIconDrawingDialog.target.rowId === activeDrawingTarget.rowId;
    const renderStateIconDrawingImportIcon = (mode: "svg" | "image") => (
      <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
        {mode === "svg" ? (
          <>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v5h5" />
            <path d="M10 16l-2-2 2-2" />
            <path d="M14 12l2 2-2 2" />
          </>
        ) : (
          <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M6.5 17l4.2-4.2 3 3 1.9-1.9 2.9 3.1" />
          </>
        )}
      </svg>
    );
    const renderStateIconDrawingToolIcon = (kind: StateVisualShapeKind) => {
      switch (kind) {
        case "switch-open":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="16" r="1.7" />
              <circle cx="19" cy="16" r="1.7" />
              <path d="M6.8 16h4.8" />
              <path d="M12.4 14.4l5.1-4.2" />
            </svg>
          );
        case "switch-closed":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="16" r="1.7" />
              <circle cx="19" cy="16" r="1.7" />
              <path d="M6.8 16h10.4" />
            </svg>
          );
        case "valve-open":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8l6 4-6 4z" />
              <path d="M19 8l-6 4 6 4z" />
              <path d="M12 7v10" />
            </svg>
          );
        case "valve-closed":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8l6 4-6 4z" />
              <path d="M19 8l-6 4 6 4z" />
              <path d="M8 6l8 12" />
            </svg>
          );
        case "line":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 18L19 6" />
            </svg>
          );
        case "polyline":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 17L11 7L20 17" />
            </svg>
          );
        case "point":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
            </svg>
          );
        case "triangle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l8 14H4z" />
            </svg>
          );
        case "rectangle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4.5" y="7" width="15" height="10" rx="1.5" />
            </svg>
          );
        case "square":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          );
        case "hexagon":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5h8l4 7-4 7H8l-4-7z" />
            </svg>
          );
        case "polygon":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5h8l4 5-2 8-8 1-4-6z" />
            </svg>
          );
        case "circle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
            </svg>
          );
        case "semicircle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 15a7 7 0 0 1 14 0z" />
              <path d="M5 15h14" />
            </svg>
          );
        case "ellipse":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="12" rx="8" ry="5" />
            </svg>
          );
        case "arc":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 16a7 7 0 0 1 12 0" />
            </svg>
          );
        case "text":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h12" />
              <path d="M12 6v12" />
              <path d="M9 18h6" />
            </svg>
          );
        default:
          return null;
      }
    };
    const stateIconBasicToolKinds = [
      "switch-open",
      "switch-closed",
      "valve-open",
      "valve-closed",
      "line",
      "polyline",
      "point",
      "triangle",
      "rectangle",
      "square",
      "hexagon",
      "polygon",
      "circle",
      "semicircle",
      "ellipse",
      "arc",
      "text"
    ] as StateVisualShapeKind[];
    const staticTemplateGroups = (() => {
      const groups = new Map<string, any[]>();
      for (const template of DEVICE_LIBRARY ?? []) {
        if (template.attributeLibrary !== "静态图元" && !String(template.kind ?? "").startsWith("static-")) {
          continue;
        }
        const section = resolveTemplateComponentType ? resolveTemplateComponentType(template) : stateIconStaticTemplateParam(template, "component_type", "StaticBasicShape");
        if (STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS.has(section)) {
          continue;
        }
        groups.set(section, [...(groups.get(section) ?? []), template]);
      }
      return Array.from(groups.entries())
        .sort(([left], [right]) => {
          const leftIndex = STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.indexOf(left);
          const rightIndex = STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.indexOf(right);
          const normalizedLeft = leftIndex >= 0 ? leftIndex : STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length;
          const normalizedRight = rightIndex >= 0 ? rightIndex : STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length;
          return normalizedLeft - normalizedRight || left.localeCompare(right);
        })
        .map(([section, templates]) => ({
          section,
          label: COMPONENT_TYPE_LABELS?.[section] ?? section,
          templates
        }));
    })();
    const renderStaticTemplateToolIcon = (template: any) => {
      if (!createNodeFromTemplate || !MemoDeviceGlyph || !nodeGeometryTransform) {
        return renderStateIconDrawingToolIcon("rectangle");
      }
      const preview = createNodeFromTemplate(template, { x: 0, y: 0 });
      const width = Math.max(72, Number(preview?.size?.width) || 72);
      const height = Math.max(48, Number(preview?.size?.height) || 48);
      const padding = 18;
      return (
        <svg
          className="state-icon-static-template-icon"
          viewBox={`${formatSvgNumber(-width / 2 - padding)} ${formatSvgNumber(-height / 2 - padding)} ${formatSvgNumber(width + padding * 2)} ${formatSvgNumber(height + padding * 2)}`}
          aria-hidden="true"
        >
          <g transform={nodeGeometryTransform(preview)}>
            <MemoDeviceGlyph node={preview} colorPalette={colorPalette} stateVisual={null} />
          </g>
        </svg>
      );
    };
    const addStateIconStaticTemplate = (template: any) => {
      if (!drawingReady) {
        return;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        elementLibraryTab: "static",
        pendingElementKind: undefined,
        pendingStaticTemplate: template,
        drawingDraft: undefined,
        selectedElementId: "",
        selectedElementIds: []
      } : current);
    };
    const setStateIconElementLibraryTab = (tab: "basic" | "static") => {
      if (!drawingReady) {
        return;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        elementLibraryTab: tab,
        pendingElementKind: tab === "basic" ? current.pendingElementKind : undefined,
        pendingStaticTemplate: tab === "static" ? current.pendingStaticTemplate : undefined,
        drawingDraft: undefined
      } : current);
    };
    const renderStateIconDrawingLibrary = () => {
      if (!activeDrawingTarget) {
        return null;
      }
      const activeElementLibraryTab = stateIconDrawingDialog?.elementLibraryTab ?? (stateIconDrawingDialog?.pendingStaticTemplate ? "static" : "basic");
      return (
        <div className="state-icon-drawing-library" aria-label="添加图案">
          <span>添加图案</span>
          <div className="state-icon-drawing-import-actions">
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("builtin");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "builtinOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="内置图标"
              title="内置图标"
            >
              内置图标
            </button>
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "catalogOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="分类图标"
              title="分类图标"
            >
              分类图标
            </button>
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("external");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "externalOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="外部图标"
              title="外部图标"
            >
              外部图标
            </button>
          </div>
          <div className="state-icon-library-tabs" role="tablist" aria-label="图案来源切换">
            <button
              type="button"
              className={`state-icon-library-tab ${activeElementLibraryTab === "basic" ? "active" : ""}`}
              disabled={!drawingReady}
              role="tab"
              aria-selected={activeElementLibraryTab === "basic"}
              onClick={() => setStateIconElementLibraryTab("basic")}
            >
              基础元素
            </button>
            <button
              type="button"
              className={`state-icon-library-tab ${activeElementLibraryTab === "static" ? "active" : ""}`}
              disabled={!drawingReady}
              role="tab"
              aria-selected={activeElementLibraryTab === "static"}
              onClick={() => setStateIconElementLibraryTab("static")}
            >
              静态图元库
            </button>
          </div>
          <div className="state-icon-library-panel">
            {activeElementLibraryTab === "basic" ? (
              <div className="state-icon-basic-tool-actions" role="tabpanel" aria-label="基础元素">
                {stateIconBasicToolKinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`state-icon-tool-button ${stateIconDrawingDialog?.pendingElementKind === kind ? "active" : ""}`}
                    disabled={!drawingReady}
                    aria-label={stateVisualShapeLabel(kind)}
                    title={stateVisualShapeLabel(kind)}
                    onClick={() => addStateIconDrawingElement(kind)}
                  >
                    {renderStateIconDrawingToolIcon(kind)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="state-icon-static-template-library" role="tabpanel" aria-label="静态图元库">
                <div className="state-icon-static-template-groups">
                  {staticTemplateGroups.map((group) => (
                    <div key={group.section} className="state-icon-static-template-group">
                      <span>{group.label}</span>
                      <div>
                        {group.templates.map((template) => (
                          <button
                            key={template.kind}
                            type="button"
                            className={`state-icon-static-template-button ${stateIconDrawingDialog?.pendingStaticTemplate?.kind === template.kind ? "active" : ""}`}
                            disabled={!drawingReady}
                            aria-label={template.label}
                            title={`${template.label} / ${group.label}`}
                            onClick={() => addStateIconStaticTemplate(template)}
                          >
                            {renderStaticTemplateToolIcon(template)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };
    const selectedStateRow = isDefaultStatePage ? defaultRow : activeRow;
    const selectedStateRowId = isDefaultStatePage ? DEFAULT_STATE_PAGE_ID : activeRow?.id ?? "";
    const stateIconDrawingTerminalDraft = handlers.drawingScope === "definition" ? definitionVisualDraft : customDeviceDraft;
    const stateIconDrawingTerminalTypes = handlers.drawingScope === "definition" ? definitionVisualTerminalTypes : customDraftTerminalTypes;
    const stateIconDrawingTerminalLabels = Array.isArray(stateIconDrawingTerminalDraft?.terminalLabels)
      ? stateIconDrawingTerminalDraft.terminalLabels
      : [];
    const stateIconDrawingTerminalCount = Math.max(
      0,
      Number(stateIconDrawingTerminalDraft?.terminalCount) || (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes.length : 0) || 0
    );
    const stateIconDrawingTerminalOptions = Array.from({ length: stateIconDrawingTerminalCount }, (_, index) => {
      const type = (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes[index] : "") || stateIconDrawingTerminalDraft?.terminalType || "ac";
      const typeLabel = TERMINAL_TYPE_LIBRARY_LABELS?.[type] ?? type;
      const customLabel = String(stateIconDrawingTerminalLabels[index] ?? "").trim();
      return {
        index,
        type,
        label: customLabel || `${typeLabel}端${index + 1}`,
        color: terminalColor ? terminalColor(type, colorPalette) : "#2563eb"
      };
    });
    const stateIconDrawingTerminalPatch = (value: string) => {
      if (value === "") {
        return { terminalIndex: undefined };
      }
      const terminalIndex = Number.parseInt(value, 10);
      if (!Number.isInteger(terminalIndex) || terminalIndex < 0) {
        return { terminalIndex: undefined };
      }
      const option = stateIconDrawingTerminalOptions.find((item) => item.index === terminalIndex);
      const color = option?.color || "";
      return color
        ? { terminalIndex, strokeColor: color, textColor: color }
        : { terminalIndex };
    };
    const stateIconDrawingRowForDialog = (dialog: any) => {
      if (isDefaultStatePageId(dialog.target.rowId)) {
        return dialog.target.scope === "definition"
          ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
          : defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft());
      }
      return dialog.target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === dialog.target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === dialog.target.rowId);
    };
    const cancelStateIconDrawingCanvasDraft = () => {
      const active = Boolean(stateIconDrawingDialog?.pendingElementKind || stateIconDrawingDialog?.pendingStaticTemplate || stateIconDrawingDialog?.drawingDraft);
      if (!active) {
        return false;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        pendingElementKind: undefined,
        pendingStaticTemplate: undefined,
        drawingDraft: undefined
      } : current);
      return true;
    };
    const handleStateIconDrawingCanvasPointerDown = (event: PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || !stateIconDrawingDialog?.target) {
        return false;
      }
      const active = Boolean(stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft);
      if (!active) {
        return false;
      }
      (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
      const point = stateIconDrawingPointer(event);
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.drawingDraft) {
          if (current.drawingDraft.kind === "polyline") {
            const committedPoint = clampStateIconDrawingPoint(point);
            const draftPoints = current.drawingDraft.points?.length
              ? current.drawingDraft.points
              : [current.drawingDraft.start];
            const nextPoints = appendDistinctStateIconDrawingPoint(draftPoints, committedPoint);
            const nextElement = stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, nextPoints);
            if (event.detail < 2) {
              return {
                ...current,
                drawingDraft: {
                  ...current.drawingDraft,
                  points: nextPoints,
                  current: committedPoint,
                  element: nextElement
                }
              };
            }
            if (nextPoints.length < 2) {
              return current;
            }
            return finishStateIconDrawingDraft({
              ...current,
              drawingDraft: {
                ...current.drawingDraft,
                points: nextPoints,
                current: committedPoint,
                element: nextElement
              }
            }, stateIconDrawingHistoryRef);
          }
          const element = stateIconDrawingElementFromPoints(current.drawingDraft.element, current.drawingDraft.start, point);
          pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
          return {
            ...current,
            elements: [...current.elements, element],
            selectedElementId: element.id,
            selectedElementIds: [element.id],
            pendingElementKind: undefined,
            pendingStaticTemplate: undefined,
            drawingDraft: undefined
          };
        }
        if (!current.pendingElementKind && !current.pendingStaticTemplate) {
          return current;
        }
        const row = stateIconDrawingRowForDialog(current);
        const baseElement = current.pendingStaticTemplate
          ? createStateIconDrawingElementFromStaticTemplate(__appScope, current.pendingStaticTemplate, row)
          : createStateIconDrawingElement(current.pendingElementKind, row);
        const startPoint = clampStateIconDrawingPoint(point);
        const element = baseElement.kind === "polyline"
          ? stateIconDrawingPolylineElementFromPoints(baseElement, [startPoint])
          : stateIconDrawingElementFromPoints(baseElement, startPoint, startPoint);
        return {
          ...current,
          selectedElementId: "",
          selectedElementIds: [],
          drawingDraft: {
            kind: baseElement.kind,
            start: startPoint,
            current: startPoint,
            points: baseElement.kind === "polyline" ? [startPoint] : undefined,
            element
          }
        };
      });
      return true;
    };
    const updateStateIconDrawingCanvasDraft = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.drawingDraft) {
        return false;
      }
      const point = stateIconDrawingPointer(event);
      setStateIconDrawingDialog((current) => {
        if (!current?.drawingDraft) {
          return current;
        }
        const currentPoint = clampStateIconDrawingPoint(point);
        if (current.drawingDraft.kind === "polyline") {
          const draftPoints = current.drawingDraft.points?.length
            ? current.drawingDraft.points
            : [current.drawingDraft.start];
          const previewPoints = appendDistinctStateIconDrawingPoint(draftPoints, currentPoint);
          return {
            ...current,
            drawingDraft: {
              ...current.drawingDraft,
              current: currentPoint,
              element: stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, previewPoints)
            }
          };
        }
        return {
          ...current,
          drawingDraft: {
            ...current.drawingDraft,
            current: currentPoint,
            element: stateIconDrawingElementFromPoints(current.drawingDraft.element, current.drawingDraft.start, currentPoint)
          }
        };
      });
      return true;
    };
    const updateStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
      setStateIconDrawingDialog((current) => current?.marquee ? {
        ...current,
        marquee: {
          ...current.marquee,
          current: point
        }
      } : current);
      return true;
    };
    const finishStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
      setStateIconDrawingDialog((current) => {
        if (!current?.marquee) {
          return current;
        }
        const rect = stateIconDrawingRectFromPoints(current.marquee.start, point);
        const selectedByRect = stateIconDrawingElementIdsInRect(current.elements, rect);
        const currentSelection = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
        const selectedElementIds = current.marquee.append
          ? Array.from(new Set([...currentSelection, ...selectedByRect]))
          : selectedByRect;
        return {
          ...current,
          selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
          selectedElementIds,
          marquee: undefined
        };
      });
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return true;
    };
    const cancelStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      setStateIconDrawingDialog((current) => current?.marquee ? { ...current, marquee: undefined } : current);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return true;
    };
    const setStateIconFramePatch = (patch: Record<string, any>) => {
      setStateIconDrawingDialog((current) =>
        current
          ? {
              ...current,
              frame: {
                ...STATE_ICON_DRAFT_FRAME,
                ...(current.frame ?? {}),
                ...patch
              }
            }
          : current
      );
    };
    const copySelectedStateIconElements = () => {
      if (!stateIconDrawingDialog) {
        return;
      }
      const selectedSet = new Set(stateIconDrawingSelectedIds(stateIconDrawingDialog));
      stateIconDrawingClipboardRef.current = stateIconDrawingDialog.elements.filter((element) => selectedSet.has(element.id)).map((element) => ({ ...element }));
      setStateIconDrawingContextMenu(null);
    };
    const cutSelectedStateIconElements = () => {
      setStateIconDrawingDialog((current) => cutStateIconDrawingSelection(current, stateIconDrawingClipboardRef, stateIconDrawingHistoryRef));
      setStateIconDrawingContextMenu(null);
    };
    const pasteStateIconElements = (point?: Point) => {
      setStateIconDrawingDialog((current) => {
        const clipboard = stateIconDrawingClipboardRef.current ?? [];
        if (!current || clipboard.length === 0) {
          return current;
        }
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        const sourceBounds = stateIconDrawingSelectionBounds(clipboard);
        const offset = point && sourceBounds
          ? { x: point.x - sourceBounds.centerX, y: point.y - sourceBounds.centerY }
          : { x: 12, y: 12 };
        const pasted = cloneStateIconDrawingElements(clipboard, stateIconDrawingElementId, offset);
        return {
          ...current,
          elements: [...current.elements, ...pasted],
          selectedElementId: pasted[pasted.length - 1]?.id ?? "",
          selectedElementIds: pasted.map((element) => element.id)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const updateSelectedStateIconElements = (updater: (element: StateIconDrawingElement, selected: StateIconDrawingElement[]) => StateIconDrawingElement) => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element) => selectedSet.has(element.id) ? updater(element, selected) : element)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const reorderSelectedStateIconElements = (mode: "front" | "back" | "forward" | "backward") => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id));
        const rest = current.elements.filter((element) => !selectedSet.has(element.id));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        if (mode === "front") {
          return { ...current, elements: [...rest, ...selected] };
        }
        if (mode === "back") {
          return { ...current, elements: [...selected, ...rest] };
        }
        const next = [...current.elements];
        if (mode === "forward") {
          for (let index = next.length - 2; index >= 0; index -= 1) {
            if (selectedSet.has(next[index].id) && !selectedSet.has(next[index + 1].id)) {
              [next[index], next[index + 1]] = [next[index + 1], next[index]];
            }
          }
        } else {
          for (let index = 1; index < next.length; index += 1) {
            if (selectedSet.has(next[index].id) && !selectedSet.has(next[index - 1].id)) {
              [next[index], next[index - 1]] = [next[index - 1], next[index]];
            }
          }
        }
        return { ...current, elements: next };
      });
      setStateIconDrawingContextMenu(null);
    };
    const alignSelectedStateIconElements = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom" | "same-width" | "same-height" | "same-size") => {
      updateSelectedStateIconElements((element, selected) => {
        const bounds = stateIconDrawingSelectionBounds(selected);
        const reference = selected[0];
        if (!bounds || !reference) {
          return element;
        }
        const itemBounds = stateIconDrawingElementBounds(element);
        if (mode === "left") return { ...element, x: bounds.left + itemBounds.width / 2 };
        if (mode === "center") return { ...element, x: bounds.centerX };
        if (mode === "right") return { ...element, x: bounds.right - itemBounds.width / 2 };
        if (mode === "top") return { ...element, y: bounds.top + itemBounds.height / 2 };
        if (mode === "middle") return { ...element, y: bounds.centerY };
        if (mode === "bottom") return { ...element, y: bounds.bottom - itemBounds.height / 2 };
        if (mode === "same-width") return { ...element, width: reference.width };
        if (mode === "same-height") return { ...element, height: reference.height };
        return { ...element, width: reference.width, height: reference.height };
      });
    };
    const distributeSelectedStateIconElements = (axis: "x" | "y") => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length < 3) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id)).sort((a, b) => axis === "x" ? a.x - b.x : a.y - b.y);
        const first = selected[0];
        const last = selected[selected.length - 1];
        const step = ((axis === "x" ? last.x - first.x : last.y - first.y) || 0) / Math.max(1, selected.length - 1);
        const nextById = new Map(selected.map((element, index) => [
          element.id,
          axis === "x" ? { ...element, x: first.x + step * index } : { ...element, y: first.y + step * index }
        ]));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element) => nextById.get(element.id) ?? element)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const mirrorSelectedStateIconElements = (axis: "x" | "y") => {
      updateSelectedStateIconElements((element, selected) => {
        const bounds = stateIconDrawingSelectionBounds(selected);
        if (!bounds) {
          return element;
        }
        return axis === "x"
          ? { ...element, x: bounds.centerX - (element.x - bounds.centerX), rotation: -element.rotation }
          : { ...element, y: bounds.centerY - (element.y - bounds.centerY), rotation: -element.rotation };
      });
    };
    const duplicateStateIconStatePage = (rowId: string) => {
      const source = isDefaultStatePageId(rowId)
        ? defaultRow
        : rows.find((row) => row.id === rowId) ?? null;
      if (!source) {
        return;
      }
      const nextIndex = nextNonDefaultStateIndex(rows);
      const nextRow = {
        ...createStateDraftRowFromDefaultVisual(source, {
          value: String(nextIndex),
          name: `状态${nextIndex}`
        }),
        id: stateDraftRowId()
      };
      if (handlers.drawingScope === "definition") {
        setDefinitionStateDraftRows((current) => appendNonDefaultStateDraftRow(current, defaultVisual, nextRow));
      } else {
        setCustomDeviceDraft((current) => ({
          ...current,
          stateDefinitions: appendNonDefaultStateDraftRow(current.stateDefinitions, defaultVisual, nextRow),
          error: ""
        }));
      }
      setActiveRowId(nextRow.id);
      setStateIconDrawingContextMenu(null);
    };
    const renderStateIconTabs = () => (
      <div className="device-state-tabs state-icon-drawing-state-tabs" role="tablist" aria-label="状态分页">
        {!hideDefaultPage && (
          <button
            type="button"
            role="tab"
            aria-selected={isDefaultStatePage}
            className={isDefaultStatePage ? "active" : ""}
            onClick={() => setActiveRowId(DEFAULT_STATE_PAGE_ID)}
            onContextMenu={(event) => {
              event.preventDefault();
              setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "state", rowId: DEFAULT_STATE_PAGE_ID });
            }}
          >
            默认状态
          </button>
        )}
        {displayRows.map((row, index) => {
          const active = activeRow?.id === row.id;
          return (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "active" : ""}
              onClick={() => setActiveRowId(row.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "state", rowId: row.id });
              }}
            >
              {row.name.trim() || `状态${index + 1}`}
            </button>
          );
        })}
        <button type="button" className="device-state-add-tab state-icon-small-icon-button" onClick={handlers.add} aria-label="新增状态" title="新增状态">+</button>
      </div>
    );
    const renderStateIconDrawingContextMenu = () => {
      if (!stateIconDrawingContextMenu || !drawingReady) {
        return null;
      }
      const selectedCount = stateIconDrawingSelectedIds(stateIconDrawingDialog).length;
      const clipboardReady = (stateIconDrawingClipboardRef.current ?? []).length > 0;
      const rowIsDefault = stateIconDrawingContextMenu.kind === "state" && isDefaultStatePageId(stateIconDrawingContextMenu.rowId ?? "");
      const menuButton = (label: string, onClick: () => void, disabled = false) => (
        <button type="button" disabled={disabled} onClick={onClick}>{label}</button>
      );
      const menuSubmenu = (label: string, children: React.ReactNode, disabled = false) => (
        <div className={`state-icon-context-submenu ${disabled ? "disabled" : ""}`}>
          <button type="button" className="state-icon-context-submenu-trigger" disabled={disabled} aria-haspopup="menu" aria-expanded="false">
            <span>{label}</span>
            <span className="state-icon-context-submenu-arrow" aria-hidden="true">&gt;</span>
          </button>
          {!disabled && (
            <div className="state-icon-context-submenu-panel" role="menu">
              {children}
            </div>
          )}
        </div>
      );
      return (
        <div
          className="state-icon-context-menu"
          style={{ left: stateIconDrawingContextMenu.x, top: stateIconDrawingContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {stateIconDrawingContextMenu.kind === "state" ? (
            <>
              {menuButton("复制到新状态", () => duplicateStateIconStatePage(stateIconDrawingContextMenu.rowId ?? selectedStateRowId))}
              {menuButton("删除状态", () => {
                const rowId = stateIconDrawingContextMenu.rowId ?? "";
                if (!isDefaultStatePageId(rowId)) {
                  handlers.remove(rowId);
                  setStateIconDrawingContextMenu(null);
                }
              }, rowIsDefault)}
            </>
          ) : (
            <>
              {menuButton("复制", copySelectedStateIconElements, selectedCount === 0)}
              {menuButton("剪切", cutSelectedStateIconElements, selectedCount === 0)}
              {menuButton("粘贴", () => pasteStateIconElements(stateIconDrawingContextMenu.pastePoint), !clipboardReady)}
              {menuButton("删除", deleteSelectedStateIconDrawingElements, selectedCount === 0)}
              {menuSubmenu("层级操作", (
                <>
                  {menuButton("置顶", () => reorderSelectedStateIconElements("front"))}
                  {menuButton("上移", () => reorderSelectedStateIconElements("forward"))}
                  {menuButton("下移", () => reorderSelectedStateIconElements("backward"))}
                  {menuButton("置底", () => reorderSelectedStateIconElements("back"))}
                </>
              ), selectedCount === 0)}
              {menuSubmenu("对齐操作", (
                <>
                  {menuButton("左对齐", () => alignSelectedStateIconElements("left"))}
                  {menuButton("水平居中", () => alignSelectedStateIconElements("center"))}
                  {menuButton("右对齐", () => alignSelectedStateIconElements("right"))}
                  {menuButton("上对齐", () => alignSelectedStateIconElements("top"))}
                  {menuButton("垂直居中", () => alignSelectedStateIconElements("middle"))}
                  {menuButton("下对齐", () => alignSelectedStateIconElements("bottom"))}
                </>
              ), selectedCount < 2)}
              {menuSubmenu("排列操作", (
                <>
                  {menuButton("水平等距", () => distributeSelectedStateIconElements("x"), selectedCount < 3)}
                  {menuButton("垂直等距", () => distributeSelectedStateIconElements("y"), selectedCount < 3)}
                  {menuButton("同宽", () => alignSelectedStateIconElements("same-width"))}
                  {menuButton("同高", () => alignSelectedStateIconElements("same-height"))}
                  {menuButton("同宽高", () => alignSelectedStateIconElements("same-size"))}
                </>
              ), selectedCount < 2)}
              {menuSubmenu("镜像操作", (
                <>
                  {menuButton("水平镜像", () => mirrorSelectedStateIconElements("x"))}
                  {menuButton("垂直镜像", () => mirrorSelectedStateIconElements("y"))}
                </>
              ), selectedCount === 0)}
            </>
          )}
        </div>
      );
    };
    const renderStateIconDrawingInline = () => {
      if (!activeDrawingTarget) {
        return null;
      }
      if (!drawingReady) {
        return (
          <div className="state-icon-drawing-inline pending" aria-label="图案编辑区">
            <span>图案编辑区准备中</span>
          </div>
        );
      }
      const selectedIds = stateIconDrawingDialog.selectedElementIds.length > 0
        ? stateIconDrawingDialog.selectedElementIds
        : [stateIconDrawingDialog.selectedElementId].filter(Boolean);
      const selectedLayerId = stateIconDrawingDialog.selectedElementId || selectedIds[0] || "";
      const frame = { ...STATE_ICON_DRAFT_FRAME, ...(stateIconDrawingDialog.frame ?? {}) };
      const frameDashArray = stateIconDrawingFrameDashArray(frame);
      const previewElements = stateIconDrawingDialog.drawingDraft
        ? [...stateIconDrawingDialog.elements, stateIconDrawingDialog.drawingDraft.element]
        : stateIconDrawingDialog.elements;
      const directPreviewElements = stateIconDrawingPreviewNeedsDirectElementRender(previewElements);
      const stateIconDrawingSmartGuides = stateIconDrawingDialog.smartAlignmentGuides ?? [];
      const stateIconDrawingMarqueeRect = stateIconDrawingDialog.marquee
        ? stateIconDrawingRectFromPoints(stateIconDrawingDialog.marquee.start, stateIconDrawingDialog.marquee.current)
        : null;
      return (
        <div
          className={`state-icon-drawing-inline ${stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate ? "tool-active" : ""} ${stateIconDrawingDialog.drawingDraft ? "drawing-active" : ""}`}
          onKeyDown={stateIconDrawingKeyDown}
          tabIndex={-1}
          aria-label="图案编辑区"
          onPointerDown={() => setStateIconDrawingContextMenu(null)}
        >
          <div className="state-icon-drawing-layout">
            <div className="state-icon-drawing-main">
              {renderStateIconTabs()}
              <div className="state-icon-drawing-canvas">
                <svg
                  ref={stateIconDrawingSvgRef}
                  viewBox="0 0 240 160"
                  role="img"
                  aria-label="图案绘制预览"
                  onPointerDownCapture={(event) => {
                    if (handleStateIconDrawingCanvasPointerDown(event)) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                  onPointerMove={(event) => {
                    if (updateStateIconDrawingCanvasDraft(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (updateStateIconDrawingMarquee(event)) {
                      event.preventDefault();
                      return;
                    }
                    dragStateIconDrawingSelection(event);
                  }}
                  onDoubleClick={(event) => {
                    if (!stateIconDrawingDialog.drawingDraft) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setStateIconDrawingContextMenu(null);
                    setStateIconDrawingDialog((current) => finishStateIconDrawingDraft(current, stateIconDrawingHistoryRef));
                  }}
                  onPointerUp={(event) => {
                    if (!stateIconDrawingDialog.drawingDraft) {
                      if (finishStateIconDrawingMarquee(event)) {
                        event.preventDefault();
                        return;
                      }
                      stopStateIconDrawingDrag(event);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (!stateIconDrawingDialog.drawingDraft) {
                      if (cancelStateIconDrawingMarquee(event)) {
                        event.preventDefault();
                        return;
                      }
                      stopStateIconDrawingDrag(event);
                    }
                  }}
                  onContextMenuCapture={(event) => {
                    if (stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft) {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelStateIconDrawingCanvasDraft();
                    }
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (cancelStateIconDrawingCanvasDraft()) {
                      event.stopPropagation();
                      return;
                    }
                    const point = stateIconDrawingPointer(event);
                    setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "canvas", pastePoint: point });
                  }}
                  onPointerDown={(event) => {
                    if (stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft) {
                      return;
                    }
                    if (event.button !== 0) {
                      return;
                    }
                    (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
                    const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
                    const append = event.shiftKey || event.ctrlKey || event.metaKey;
                    setStateIconDrawingDialog((current) => current ? {
                      ...current,
                      marquee: {
                        start: point,
                        current: point,
                        append
                      }
                    } : current);
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                >
                  <rect x="0" y="0" width="240" height="160" rx="10" className="state-icon-drawing-canvas-bg" fill={frame.fillColor} />
                  {directPreviewElements ? previewElements.map((element, index) => (
                    <g
                      key={`preview-${element.id}-${index}`}
                      className="state-icon-drawing-direct-preview"
                      transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`}
                    >
                      {stateIconDrawingElementPreviewNode(element)}
                    </g>
                  )) : (
                    <image
                      href={stateIconDrawingToImage(previewElements)}
                      x="0"
                      y="0"
                      width="240"
                      height="160"
                      preserveAspectRatio="xMidYMid meet"
                      className="state-icon-drawing-composite-preview"
                    />
                  )}
                  <rect
                    x="0"
                    y="0"
                    width="240"
                    height="160"
                    rx="6"
                    className="state-icon-drawing-icon-frame"
                    fill="none"
                    stroke={frame.strokeColor}
                    strokeWidth={frame.strokeWidth}
                    strokeDasharray={frameDashArray}
                  />
                  {stateIconDrawingSmartGuides.map((guide) => (
                    <line
                      key={guide.id}
                      className={`smart-alignment-guide smart-alignment-guide-${guide.orientation} state-icon-drawing-smart-guide`}
                      x1={guide.orientation === "vertical" ? guide.position : guide.start}
                      y1={guide.orientation === "vertical" ? guide.start : guide.position}
                      x2={guide.orientation === "vertical" ? guide.position : guide.end}
                      y2={guide.orientation === "vertical" ? guide.end : guide.position}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {stateIconDrawingMarqueeRect && (
                    <rect
                      className="marquee-box state-icon-drawing-marquee"
                      x={stateIconDrawingMarqueeRect.left}
                      y={stateIconDrawingMarqueeRect.top}
                      width={stateIconDrawingMarqueeRect.right - stateIconDrawingMarqueeRect.left}
                      height={stateIconDrawingMarqueeRect.bottom - stateIconDrawingMarqueeRect.top}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {stateIconDrawingDialog.elements.map((element) => {
                    const selected = selectedIds.includes(element.id);
                    const halfWidth = Math.max(1, element.width) / 2;
                    const halfHeight = Math.max(1, element.height) / 2;
                    return (
                      <g
                        key={element.id}
                        className={`state-icon-drawing-element ${selected ? "selected" : ""}`}
                        transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`}
                        onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "move")}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "element", elementId: element.id });
                        }}
                      >
                        <rect x={formatSvgNumber(-halfWidth)} y={formatSvgNumber(-halfHeight)} width={formatSvgNumber(element.width)} height={formatSvgNumber(element.height)} className="state-icon-drawing-hitbox" />
                        {selected && (
                          <>
                            <rect x={formatSvgNumber(-halfWidth)} y={formatSvgNumber(-halfHeight)} width={formatSvgNumber(element.width)} height={formatSvgNumber(element.height)} className="state-icon-drawing-selection-box" />
                            <circle cx={formatSvgNumber(halfWidth)} cy={formatSvgNumber(halfHeight)} r="5" className="state-icon-drawing-resize-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize")} />
                            <line x1="0" y1={formatSvgNumber(-halfHeight)} x2="0" y2={formatSvgNumber(-halfHeight - 16)} className="state-icon-drawing-rotate-stem" />
                            <circle cx="0" cy={formatSvgNumber(-halfHeight - 20)} r="5" className="state-icon-drawing-rotate-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "rotate")} />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <div className="state-icon-drawing-side">
              <div className="state-icon-drawing-state-info">
                <strong>状态信息</strong>
                {!isDefaultStatePage && selectedStateRow && (
                  <div className="state-icon-drawing-property-grid">
                    <label>
                      状态值
                      <BufferedTextInput value={selectedStateRow.value} onCommit={(value) => handlers.update(selectedStateRowId, { value })} />
                    </label>
                    <label>
                      状态名称
                      <BufferedTextInput value={selectedStateRow.name} onCommit={(value) => handlers.update(selectedStateRowId, { name: value })} />
                    </label>
                  </div>
                )}
              </div>
              <div className="state-icon-drawing-frame-panel">
                <strong>操作边框</strong>
                <div className="state-icon-drawing-property-grid">
                  <label>
                    线型
                    <select value={frame.strokeStyle} onChange={(event) => setStateIconFramePatch({ strokeStyle: event.target.value })}>
                      <option value="solid">实线</option>
                      <option value="dashed">虚线</option>
                      <option value="dotted">点线</option>
                    </select>
                  </label>
                  <label className="state-icon-drawing-compact-field">
                    线宽
                    <BufferedTextInput
                      type="number"
                      min="0"
                      step={1}
                      inputMode="numeric"
                      value={normalizeStateIconDrawingStrokeWidth(frame.strokeWidth)}
                      onKeyDown={(event) => {
                        if ([".", "-", "+", "e", "E"].includes(event.key)) {
                          event.preventDefault();
                        }
                      }}
                      onCommit={(nextValue) => setStateIconFramePatch({ strokeWidth: normalizeStateIconDrawingStrokeWidth(nextValue, frame.strokeWidth) })}
                    />
                  </label>
                  <label>
                    线色
                    <div className="state-icon-drawing-color-field">
                      <DeferredColorInput value={frame.strokeColor} fallback="#94a3b8" onCommit={(value) => setStateIconFramePatch({ strokeColor: value })} />
                    </div>
                  </label>
                  <label>
                    背景
                    <div className="state-icon-drawing-color-field">
                      <DeferredColorInput value={frame.fillColor} fallback="#ffffff" onCommit={(value) => setStateIconFramePatch({ fillColor: value })} />
                    </div>
                  </label>
                </div>
              </div>
              <div className="state-icon-drawing-layers">
                <label>
                  <span>图案图层</span>
                  <select
                    value={selectedLayerId}
                    disabled={stateIconDrawingDialog.elements.length === 0}
                    onChange={(event) => {
                      const elementId = event.target.value;
                      if (elementId) {
                        stateIconDrawingSelection(elementId, false);
                        return;
                      }
                      setStateIconDrawingDialog((current) => current ? { ...current, selectedElementId: "", selectedElementIds: [] } : current);
                    }}
                  >
                    {stateIconDrawingDialog.elements.length === 0 ? (
                      <option value="">暂无图案</option>
                    ) : (
                      <>
                        <option value="">未选择图案</option>
                        {stateIconDrawingDialog.elements.map((element, index) => (
                          <option key={element.id} value={element.id}>
                            {index + 1}. {stateVisualShapeLabel(element.kind)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
              </div>
              <div className="state-icon-drawing-properties">
                {(() => {
                  const selected = stateIconDrawingDialog.elements.find((element) => element.id === stateIconDrawingDialog.selectedElementId) ?? null;
                  if (!selected) {
                    return <p>选择一个图案后调整属性。</p>;
                  }
                  const visibleStrokeColor = visibleStateIconColor("#2563eb", selected.strokeColor);
                  const visibleTextColor = visibleStateIconColor("#111827", selected.textColor, selected.strokeColor);
                  const isLineShape = STATE_ICON_LINE_SHAPE_KINDS.has(selected.kind);
                  const isClosedShape = STATE_ICON_CLOSED_SHAPE_KINDS.has(selected.kind);
                  const fontFamilyValue = selected.fontFamily ?? "Arial, Microsoft YaHei";
                  const baseFontFamilyOptions = Array.isArray(FONT_FAMILY_OPTIONS)
                    ? FONT_FAMILY_OPTIONS
                    : ["Arial", "Microsoft YaHei", "SimSun", "KaiTi", "SimHei"];
                  const fontFamilyOptions = Array.from(new Set([
                    "Arial, Microsoft YaHei",
                    ...baseFontFamilyOptions,
                    fontFamilyValue
                  ].filter(Boolean)));
                  const fontFamilyOptionLabels = {
                    "Arial, Microsoft YaHei": "Arial / 微软雅黑",
                    ...(FONT_FAMILY_OPTION_LABELS ?? {})
                  };
                  return (
                    <>
                      <div className="state-icon-drawing-property-title">
                        <strong>{stateVisualShapeLabel(selected.kind)}</strong>
                        <span>{stateIconDrawingSelectedIds(stateIconDrawingDialog).length > 1 ? `${stateIconDrawingSelectedIds(stateIconDrawingDialog).length} 个元素` : "选中元素"}</span>
                      </div>
                      <div className="state-icon-drawing-property-grid">
                        <label className="state-icon-drawing-compact-field">
                          X
                          <BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.x)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { x: Number(nextValue) || 0 })} />
                        </label>
                        <label className="state-icon-drawing-compact-field">
                          Y
                          <BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.y)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { y: Number(nextValue) || 0 })} />
                        </label>
                        <label className="state-icon-drawing-compact-field">
                          宽
                          <BufferedTextInput type="number" min="1" step="0.01" value={formatStateIconDrawingNumber(selected.width, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { width: Math.max(1, Number(nextValue) || 1) })} />
                        </label>
                        <label className="state-icon-drawing-compact-field">
                          高
                          <BufferedTextInput type="number" min="1" step="0.01" value={formatStateIconDrawingNumber(selected.height, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { height: Math.max(1, Number(nextValue) || 1) })} />
                        </label>
                        <label className="state-icon-drawing-compact-field">
                          角度
                          <BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.rotation)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { rotation: Number(nextValue) || 0 })} />
                        </label>
                        <label className="state-icon-drawing-compact-field">
                          粗细
                          <BufferedTextInput
                            type="number"
                            min="0"
                            step={1}
                            inputMode="numeric"
                            value={normalizeStateIconDrawingStrokeWidth(selected.strokeWidth)}
                            onKeyDown={(event) => {
                              if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                event.preventDefault();
                              }
                            }}
                            onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { strokeWidth: normalizeStateIconDrawingStrokeWidth(nextValue, selected.strokeWidth) })}
                          />
                        </label>
                        <label>
                          线型
                          <select value={selected.strokeStyle ?? "solid"} onChange={(event) => updateStateIconDrawingElement(selected.id, { strokeStyle: event.target.value })}>
                            <option value="solid">实线</option>
                            <option value="dashed">虚线</option>
                            <option value="dotted">点线</option>
                          </select>
                        </label>
                        <label>
                          所属端子
                          <select
                            value={Number.isInteger(selected.terminalIndex) && selected.terminalIndex >= 0 ? String(selected.terminalIndex) : ""}
                            onChange={(event) => updateStateIconDrawingElement(selected.id, stateIconDrawingTerminalPatch(event.target.value))}
                          >
                            <option value="">无</option>
                            {stateIconDrawingTerminalOptions.map((option) => (
                              <option key={option.index} value={option.index}>
                                {option.index + 1}. {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          线色
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={visibleStrokeColor} fallback="#2563eb" onCommit={(value) => updateStateIconDrawingElement(selected.id, { strokeColor: value })} />
                          </div>
                        </label>
                        {isLineShape && (
                          <>
                            <label>
                              起点端型
                              <select value={selected.startCap ?? "none"} onChange={(event) => updateStateIconDrawingElement(selected.id, { startCap: event.target.value })}>
                                {STATE_ICON_LINE_CAP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </label>
                            <label>
                              终点端型
                              <select value={selected.endCap ?? "none"} onChange={(event) => updateStateIconDrawingElement(selected.id, { endCap: event.target.value })}>
                                {STATE_ICON_LINE_CAP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </label>
                          </>
                        )}
                        {isClosedShape && (
                          <label>
                            填充
                            <div className="state-icon-drawing-color-field">
                              <DeferredColorInput value={selected.fillColor} fallback="#ffffff" onCommit={(value) => updateStateIconDrawingElement(selected.id, { fillColor: value })} />
                            </div>
                          </label>
                        )}
                        {selected.kind === "text" && (
                          <>
                            <label>
                              文本颜色
                              <div className="state-icon-drawing-color-field">
                                <DeferredColorInput value={visibleTextColor} fallback="#111827" onCommit={(value) => updateStateIconDrawingElement(selected.id, { textColor: value })} />
                              </div>
                            </label>
                            <label>
                              字体
                              <select value={fontFamilyValue} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontFamily: event.target.value })}>
                                {fontFamilyOptions.map((fontFamily) => (
                                  <option key={fontFamily} value={fontFamily} style={{ fontFamily }}>
                                    {fontFamilyOptionLabels[fontFamily] ?? fontFamily}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="state-icon-drawing-compact-field">
                              字号
                              <BufferedTextInput
                                type="number"
                                min={STATE_ICON_DRAWING_MIN_FONT_SIZE}
                                step={1}
                                inputMode="numeric"
                                value={normalizeStateIconDrawingFontSize(selected.fontSize ?? selected.height)}
                                onKeyDown={(event) => {
                                  if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                    event.preventDefault();
                                  }
                                }}
                                onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, {
                                  fontSize: normalizeStateIconDrawingFontSize(nextValue, selected.fontSize ?? selected.height)
                                })}
                              />
                            </label>
                            <label>
                              字重
                              <select value={String(selected.fontWeight ?? "800")} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontWeight: event.target.value })}>
                                <option value="400">常规</option>
                                <option value="700">加粗</option>
                                <option value="800">特粗</option>
                              </select>
                            </label>
                            <label>
                              字型
                              <select value={selected.fontStyle ?? "normal"} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontStyle: event.target.value })}>
                                <option value="normal">常规</option>
                                <option value="italic">斜体</option>
                              </select>
                            </label>
                          </>
                        )}
                        {selected.kind !== "text" && (
                          <label>
                          文本颜色
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={visibleTextColor} fallback="#111827" onCommit={(value) => updateStateIconDrawingElement(selected.id, { textColor: value })} />
                          </div>
                          </label>
                        )}
                        <label className="state-icon-drawing-text-field state-icon-drawing-text-compact-field">
                          文字
                          <BufferedTextInput value={selected.text} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { text: nextValue })} />
                        </label>
                        {selected.kind === "image" && (
                          <>
                            <label>
                              图片缩放
                              <BufferedTextInput type="number" min="0.05" step="0.01" value={formatStateIconDrawingNumber(selected.imageScale ?? 1, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { imageScale: Math.max(0.05, Number(nextValue) || 0.05) })} />
                            </label>
                            <label>
                              裁剪X
                              <BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.cropX ?? 0)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropX: Number(nextValue) || 0 })} />
                            </label>
                            <label>
                              裁剪Y
                              <BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.cropY ?? 0)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropY: Number(nextValue) || 0 })} />
                            </label>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      );
    };
    return (
      <section className={`device-state-pager ${hideDefaultPage ? "hide-default-state" : ""}`} aria-label="状态分页">
        {renderStateIconDrawingLibrary()}
        {isDefaultStatePage || activeRow ? (
          <>
            {renderStateIconDrawingInline()}
            <div className="custom-device-actions device-state-actions">
              {handlers.saveStateVisuals && <button type="button" onClick={handlers.saveStateVisuals}>{handlers.saveStateVisualsLabel ?? "保存状态样式"}</button>}
              {handlers.reset && <button type="button" onClick={handlers.reset}>{handlers.resetLabel ?? "恢复状态页"}</button>}
            </div>
            {renderStateIconDrawingContextMenu()}
          </>
        ) : (
          <div className="device-state-empty">
            <span>暂无状态分页</span>
            <button type="button" onClick={handlers.add}>新增状态</button>
          </div>
        )}
      </section>
    );
  };
}

export function createRenderDeviceDefinitionVisualPanel(__appScope: Record<string, any>) {
  return (template: DeviceTemplate) => {
  const { BufferedTextInput, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, DEFAULT_STATE_PAGE_ID, Fragment, MemoDeviceGlyph, SvgMarkupChunk, TERMINAL_TYPE_LIBRARY_LABELS, addDefinitionStateDraftRow, button, circle, colorDisplayMode, colorPalette, createDefinitionStateDraftRows, createDefinitionVisualDraft, createNodeFromTemplate, customDeviceTerminalAnchorValue, definitionDraftError, definitionStateDraftRows, definitionStatePageId, definitionStatePreviewVisual, definitionTemplateIconInputRef, definitionTerminalAnchorDragIndex, definitionTerminalConnectorSegment, definitionVisualDraft, definitionVisualPreviewHeight, definitionVisualPreviewImage, definitionVisualPreviewWidth, definitionVisualTerminalAnchors, definitionVisualTerminalTypes, deleteDefinitionStateDraftRow, div, formatCustomDeviceTerminalAnchorValue, formatSvgNumber, g, image, isBusNode, isDefaultStatePageId, isStaticNode, label, line, nodeForegroundImage, nodeGeometryTransform, nodeImageContentTransform, openStateIconDrawingDialog, p, rect, renderStateVisualPager, resolveNodeStateVisual, saveDeviceDefinitionStateVisualDraft, saveDeviceDefinitionVisualDraft, section, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setStateImageUploadTarget, small, span, stateVisualImageInputRef, strong, svgImageContentMarkup, terminalColor, text, title, updateDefinitionStateDraftRow, updateDefinitionTerminalAnchor, updateDefinitionTerminalAnchorFromPreview } = __appScope;
    if (!definitionVisualDraft) {
      return null;
    }
    const visualTemplate: DeviceTemplate = {
      ...template,
      size: definitionVisualDraft.size,
      params: {
        ...template.params,
        ...(definitionStatePreviewVisual?.value !== undefined && definitionStatePreviewVisual.value !== "" ? { status: definitionStatePreviewVisual.value } : {}),
        backgroundImage: "",
        backgroundImageAssetId: ""
      },
      terminalType: definitionVisualTerminalTypes[0] ?? template.terminalType,
      terminalCount: definitionVisualDraft.terminalCount,
      terminalTypes: definitionVisualTerminalTypes,
      terminalLabels: definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount),
      terminalAnchors: definitionVisualTerminalAnchors,
      stateDefinitions: definitionStateDraftRows
    };
    const previewNode = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
    const definitionDefaultStateSelected = isDefaultStatePageId(definitionStatePageId);
    const renderDefinitionVisualPreviewContent = (clipId: string) => {
      const previewStateVisual = definitionStatePreviewVisual ?? resolveNodeStateVisual(previewNode);
      const previewImageHref = definitionVisualPreviewImage;
      const previewForegroundHref = nodeForegroundImage(previewNode);
      const previewIsBus = isBusNode(previewNode);
      const previewIsStatic = isStaticNode(previewNode);
      return (
        <>
          {!previewIsBus && (previewImageHref || previewForegroundHref) && (
            <clipPath id={clipId}>
              <rect
                x={-previewNode.size.width / 2}
                y={-previewNode.size.height / 2}
                width={previewNode.size.width}
                height={previewNode.size.height}
                rx="8"
              />
            </clipPath>
          )}
          <g className="node-geometry" transform={nodeGeometryTransform(previewNode)}>
            <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual} />
            <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual} />
          </g>
          {!previewIsBus && (previewImageHref || previewForegroundHref) && (
            <g className="node-upright-content" transform={nodeImageContentTransform(previewNode)}>
              {previewImageHref && previewIsStatic && (
                <SvgMarkupChunk
                  className="node-background-image-markup"
                  markup={svgImageContentMarkup(previewImageHref, {
                    x: -previewNode.size.width / 2,
                    y: -previewNode.size.height / 2,
                    width: previewNode.size.width,
                    height: previewNode.size.height,
                    preserveAspectRatio: "xMidYMid slice",
                    clipPath: `url(#${clipId})`,
                    className: "node-background-image"
                  })}
                />
              )}
              {previewImageHref && !previewIsStatic && (
                <rect
                  x={-previewNode.size.width / 2}
                  y={-previewNode.size.height / 2}
                  width={previewNode.size.width}
                  height={previewNode.size.height}
                  rx="8"
                  className="node-image-cover"
                />
              )}
              {previewImageHref && !previewIsStatic && (
                <SvgMarkupChunk
                  className="node-background-image-markup"
                  markup={svgImageContentMarkup(previewImageHref, {
                    x: -previewNode.size.width / 2,
                    y: -previewNode.size.height / 2,
                    width: previewNode.size.width,
                    height: previewNode.size.height,
                    preserveAspectRatio: "xMidYMid slice",
                    clipPath: `url(#${clipId})`,
                    className: "node-background-image"
                  })}
                />
              )}
              {previewForegroundHref && (
                <SvgMarkupChunk
                  className="node-foreground-image-markup"
                  markup={svgImageContentMarkup(previewForegroundHref, {
                    x: -previewNode.size.width / 2,
                    y: -previewNode.size.height / 2,
                    width: previewNode.size.width,
                    height: previewNode.size.height,
                    preserveAspectRatio: "xMidYMid slice",
                    clipPath: `url(#${clipId})`,
                    className: "node-foreground-image"
                  })}
                />
              )}
            </g>
          )}
        </>
      );
    };
    return (
      <section className="device-definition-visual-panel">
        {definitionVisualDraft.error && <p className="custom-device-error">{definitionVisualDraft.error}</p>}
        {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
        {renderStateVisualPager(definitionStateDraftRows, definitionStatePageId, setDefinitionStatePageId, {
          update: updateDefinitionStateDraftRow,
          add: addDefinitionStateDraftRow,
          remove: deleteDefinitionStateDraftRow,
          saveStateVisuals: saveDeviceDefinitionStateVisualDraft,
          saveStateVisualsLabel: "保存状态样式",
          drawingScope: "definition",
          reset: () => {
            const stateRows = createDefinitionStateDraftRows(template);
            setDefinitionStateDraftRows(stateRows);
            setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
            setDefinitionDraftError("");
          },
          resetLabel: "恢复状态分页"
        })}
        {definitionDefaultStateSelected && (
          <div className="device-definition-default-toolbar">
            <div className="custom-device-image-row device-definition-image-row">
              <span>SVG/图片图标</span>
              <button type="button" onClick={() => definitionTemplateIconInputRef.current?.click()}>上传到后台</button>
              <button
                type="button"
                onClick={() =>
                  setDefinitionVisualDraft((current) =>
                    current
                      ? {
                          ...current,
                          backgroundImage: "",
                          backgroundImageAssetId: "",
                          error: ""
                        }
                      : current
                  )
                }
              >
                清除
              </button>
              <strong>{definitionVisualDraft.backgroundImageAssetId ? "后台已保存" : definitionVisualDraft.backgroundImage ? "已设置" : "默认图形"}</strong>
            </div>
            <div className="device-definition-size-grid">
              <label>
                宽度
                <BufferedTextInput
                  type="number"
                  min="1"
                  value={definitionVisualDraft.size.width}
                  onCommit={(value) =>
                    setDefinitionVisualDraft((current) =>
                      current
                        ? {
                            ...current,
                            size: { ...current.size, width: Math.max(1, Math.round(Number(value) || current.size.width)) },
                            error: ""
                          }
                        : current
                    )
                  }
                />
              </label>
              <label>
                高度
                <BufferedTextInput
                  type="number"
                  min="1"
                  value={definitionVisualDraft.size.height}
                  onCommit={(value) =>
                    setDefinitionVisualDraft((current) =>
                      current
                        ? {
                            ...current,
                            size: { ...current.size, height: Math.max(1, Math.round(Number(value) || current.size.height)) },
                            error: ""
                          }
                        : current
                    )
                  }
                />
              </label>
              <span>端子拖放到元件四周边框。</span>
            </div>
            <div className="custom-device-actions device-definition-visual-actions">
              <button type="button" onClick={saveDeviceDefinitionVisualDraft}>保存图标和端子</button>
              <button
                type="button"
                onClick={() => {
                  const stateRows = createDefinitionStateDraftRows(template);
                  setDefinitionVisualDraft(createDefinitionVisualDraft(template));
                  setDefinitionStateDraftRows(stateRows);
                  setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
                  setDefinitionDraftError("");
                }}
              >
                恢复当前元件状态
              </button>
            </div>
          </div>
        )}
        {definitionDefaultStateSelected && <div className="custom-device-preview device-definition-visual-preview">
          <div className="custom-device-preview-stage">
            <svg
              className="custom-device-anchor-preview device-definition-anchor-preview"
              viewBox={`${formatSvgNumber(-definitionVisualPreviewWidth / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(-definitionVisualPreviewHeight / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(definitionVisualPreviewWidth + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)} ${formatSvgNumber(definitionVisualPreviewHeight + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)}`}
              role="img"
              aria-label="修改元件图标和端子位置预览"
              onPointerMove={(event) => {
                if (!definitionDefaultStateSelected || definitionTerminalAnchorDragIndex === null) {
                  return;
                }
                updateDefinitionTerminalAnchorFromPreview(definitionTerminalAnchorDragIndex, event.currentTarget, event);
              }}
              onPointerUp={(event) => {
                if (definitionTerminalAnchorDragIndex !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setDefinitionTerminalAnchorDragIndex(null);
              }}
              onPointerCancel={(event) => {
                if (definitionTerminalAnchorDragIndex !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
                setDefinitionTerminalAnchorDragIndex(null);
              }}
            >
              {renderDefinitionVisualPreviewContent("definition-default-preview-clip")}
              <rect
                className="custom-device-preview-frame"
                x={-definitionVisualPreviewWidth / 2}
                y={-definitionVisualPreviewHeight / 2}
                width={definitionVisualPreviewWidth}
                height={definitionVisualPreviewHeight}
                rx="8"
              />
              {definitionDefaultStateSelected && definitionTerminalAnchorDragIndex !== null && (
                <>
                  {CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.map((guideValue, guideIndex) => {
                    const activeAnchor = definitionVisualTerminalAnchors[definitionTerminalAnchorDragIndex];
                    const active = Boolean(
                      activeAnchor &&
                      (Math.abs(customDeviceTerminalAnchorValue(activeAnchor.x) - guideValue) <= 1 / CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION ||
                        Math.abs(customDeviceTerminalAnchorValue(activeAnchor.y) - guideValue) <= 1 / CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION)
                    );
                    return (
                      <Fragment key={`definition-terminal-guide-${guideIndex}`}>
                        <line
                          className={`custom-device-terminal-guide ${active ? "active" : ""}`}
                          x1={guideValue * definitionVisualPreviewWidth}
                          y1={-definitionVisualPreviewHeight / 2}
                          x2={guideValue * definitionVisualPreviewWidth}
                          y2={definitionVisualPreviewHeight / 2}
                        />
                        <line
                          className={`custom-device-terminal-guide ${active ? "active" : ""}`}
                          x1={-definitionVisualPreviewWidth / 2}
                          y1={guideValue * definitionVisualPreviewHeight}
                          x2={definitionVisualPreviewWidth / 2}
                          y2={guideValue * definitionVisualPreviewHeight}
                        />
                      </Fragment>
                    );
                  })}
                </>
              )}
              {definitionDefaultStateSelected && definitionVisualTerminalAnchors.map((anchor, index) => {
                const terminalType = definitionVisualDraft.terminalTypes[index] ?? template.terminalType;
                const segment = definitionTerminalConnectorSegment(anchor);
                return (
                  <line
                    key={`definition-terminal-connector-${index}`}
                    className="custom-device-terminal-connector"
                    x1={segment.from.x}
                    y1={segment.from.y}
                    x2={segment.to.x}
                    y2={segment.to.y}
                    style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                  />
                );
              })}
              {definitionDefaultStateSelected && definitionVisualTerminalAnchors.map((anchor, index) => {
                const terminalType = definitionVisualDraft.terminalTypes[index] ?? template.terminalType;
                const segment = definitionTerminalConnectorSegment(anchor);
                const dragging = definitionTerminalAnchorDragIndex === index;
                return (
                  <g
                    key={`definition-terminal-anchor-${index}`}
                    className={`custom-device-terminal-anchor ${dragging ? "dragging" : ""}`}
                    transform={`translate(${formatSvgNumber(segment.to.x)} ${formatSvgNumber(segment.to.y)})`}
                    style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                  >
                    <circle
                      r="8"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const svg = event.currentTarget.ownerSVGElement;
                        if (!svg) {
                          return;
                        }
                        setDefinitionTerminalAnchorDragIndex(index);
                        svg.setPointerCapture(event.pointerId);
                        updateDefinitionTerminalAnchorFromPreview(index, svg, event);
                      }}
                    >
                      <title>{`拖动调整端子${index + 1}位置`}</title>
                    </circle>
                    <text x="0" y="0">{index + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>}
        {definitionDefaultStateSelected && <div className="custom-terminal-grid device-definition-terminal-grid">
          {Array.from({ length: definitionVisualDraft.terminalCount }).map((_, index) => {
            const terminalType = definitionVisualDraft.terminalTypes[index] ?? template.terminalType;
            const terminalAnchor = definitionVisualTerminalAnchors[index] ?? { x: 0, y: 0 };
            return (
              <label key={index}>
                {`端子${index + 1}`}
                <strong>{TERMINAL_TYPE_LIBRARY_LABELS[terminalType] ?? terminalType}</strong>
                <span>端子位置</span>
                <div className="custom-terminal-anchor-inputs">
                  <span>X</span>
                  <BufferedTextInput
                    type="number"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.x)}
                    onCommit={(value) => updateDefinitionTerminalAnchor(index, { x: Number(value) })}
                    aria-label={`修改元件端子${index + 1} X位置`}
                  />
                  <span>Y</span>
                  <BufferedTextInput
                    type="number"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.y)}
                    onCommit={(value) => updateDefinitionTerminalAnchor(index, { y: Number(value) })}
                    aria-label={`修改元件端子${index + 1} Y位置`}
                  />
                </div>
              </label>
            );
          })}
        </div>}
      </section>
    );
  };
}

export function createRenderGraphTemplatePreview(__appScope: Record<string, any>) {
  return (template: GraphTemplate) => {
  const { MemoDeviceGlyph, canvasClipboardBounds, colorPalette, g, nodeGeometryTransform, path, pointsToPreviewPath, rect, resolveNodeStateVisual, svg } = __appScope;
    const bounds = canvasClipboardBounds(template.clipboard);
    if (!bounds) {
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true" className="template-preview-svg">
          <rect x="8" y="10" width="64" height="36" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
        </svg>
      );
    }
    const padding = 8;
    const width = Math.max(1, bounds.right - bounds.left + padding * 2);
    const height = Math.max(1, bounds.bottom - bounds.top + padding * 2);
    return (
      <svg
        viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width} ${height}`}
        aria-hidden="true"
        className="template-preview-svg"
      >
        {template.clipboard.edges.map((item) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {template.clipboard.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
            <g transform={nodeGeometryTransform(node)}>
              <MemoDeviceGlyph node={node} miniature colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
            </g>
          </g>
        ))}
      </svg>
    );
  };
}

export function createRenderLibraryTemplateButton(__appScope: Record<string, any>) {
  return (item: DeviceTemplate, section: string) => {
  const { MemoDeviceGlyph, SvgMarkupChunk, button, cancelLibraryPlacement, clipPath, colorPalette, componentLibraryDisplayMode, createNodeFromTemplate, defs, formatSvgNumber, g, hideLibraryFlyout, image, isBrowseMode, isBusNode, isEditMode, libraryPreviewByKind, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, rect, resolveNodeStateVisual, startLibraryDevicePlacement, svg, svgImageContentMarkup } = __appScope;
    const preview = libraryPreviewByKind.get(item.kind) ?? createNodeFromTemplate(item, { x: 0, y: 0 });
    const libraryPreviewImageHref = nodeImage(preview);
    const libraryPreviewForegroundHref = nodeForegroundImage(preview);
    const libraryPreviewHasImage = !isBusNode(preview) && Boolean(libraryPreviewImageHref || libraryPreviewForegroundHref);
    const previewRotation = ((Math.round(preview.rotation) % 360) + 360) % 360;
    const fallbackPreviewViewBox = previewRotation === 90 || previewRotation === 270 ? "-48 -48 96 96" : "-40 -28 80 56";
    const imagePreviewWidth = Math.max(80, preview.size.width + 16);
    const imagePreviewHeight = Math.max(56, preview.size.height + 16);
    const previewViewBox = libraryPreviewHasImage
      ? `${formatSvgNumber(-imagePreviewWidth / 2)} ${formatSvgNumber(-imagePreviewHeight / 2)} ${formatSvgNumber(imagePreviewWidth)} ${formatSvgNumber(imagePreviewHeight)}`
      : fallbackPreviewViewBox;
    const libraryPreviewClipId = `library-preview-clip-${item.kind.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    return (
      <button
        key={item.kind}
        className="library-item"
        draggable={isEditMode}
        disabled={isBrowseMode}
        title={`${item.label} / ${section}`}
        onClick={() => startLibraryDevicePlacement(item)}
        onContextMenu={(event) => {
          event.preventDefault();
          cancelLibraryPlacement();
        }}
        onDragStart={(event) => {
          if (!isEditMode) {
            event.preventDefault();
            return;
          }
          cancelLibraryPlacement();
          event.dataTransfer.setData("application/device-kind", item.kind);
          if (componentLibraryDisplayMode === "right") {
            hideLibraryFlyout();
          }
        }}
      >
        <svg viewBox={previewViewBox} aria-hidden="true">
          {libraryPreviewHasImage && (
            <defs>
              <clipPath id={libraryPreviewClipId}>
                <rect
                  x={-preview.size.width / 2}
                  y={-preview.size.height / 2}
                  width={preview.size.width}
                  height={preview.size.height}
                  rx="8"
                />
              </clipPath>
            </defs>
          )}
          {!libraryPreviewHasImage && (
            <g transform={nodeGeometryTransform(preview)}>
              <MemoDeviceGlyph node={preview} miniature colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(preview)} />
            </g>
          )}
          {libraryPreviewHasImage && (
            <g className="library-preview-image-wrap" transform={nodeImageContentTransform(preview)}>
              {libraryPreviewImageHref && (
                <SvgMarkupChunk
                  className="library-preview-image-markup"
                  markup={svgImageContentMarkup(libraryPreviewImageHref, {
                    x: -preview.size.width / 2,
                    y: -preview.size.height / 2,
                    width: preview.size.width,
                    height: preview.size.height,
                    preserveAspectRatio: "xMidYMid meet",
                    clipPath: `url(#${libraryPreviewClipId})`,
                    className: "library-preview-image"
                  })}
                />
              )}
              {libraryPreviewForegroundHref && (
                <SvgMarkupChunk
                  className="library-preview-image-markup"
                  markup={svgImageContentMarkup(libraryPreviewForegroundHref, {
                    x: -preview.size.width / 2,
                    y: -preview.size.height / 2,
                    width: preview.size.width,
                    height: preview.size.height,
                    preserveAspectRatio: "xMidYMid meet",
                    clipPath: `url(#${libraryPreviewClipId})`,
                    className: "library-preview-image library-preview-foreground-image"
                  })}
                />
              )}
            </g>
          )}
        </svg>
      </button>
    );
  };
}

export function createRenderLibraryFlyout(__appScope: Record<string, any>) {
  return (flyoutListKey: string, componentTypeKey: string, group: AttributeLibrary, typeGroup: AttributeLibraryComponentTypeGroup) => {
  const { clearLibraryFlyoutCloseTimer, createPortal, div, libraryFlyoutStyle, renderLibraryTemplateButton, scheduleLibraryFlyoutClose, setHoveredAttributeLibrary, setHoveredAttributeLibraryComponentType, setLibraryComponentListRef } = __appScope;
    const flyout = (
      <div
        className="library-group flyout-library-group"
        ref={setLibraryComponentListRef(flyoutListKey)}
        style={libraryFlyoutStyle(flyoutListKey)}
        onMouseEnter={() => {
          clearLibraryFlyoutCloseTimer();
          setHoveredAttributeLibrary(group);
          setHoveredAttributeLibraryComponentType(componentTypeKey);
        }}
        onMouseLeave={() => scheduleLibraryFlyoutClose(group, componentTypeKey)}
      >
        {typeGroup.templates.map((item) => renderLibraryTemplateButton(item, typeGroup.section))}
      </div>
    );
    if (typeof document === "undefined") {
      return flyout;
    }
    return createPortal(flyout, document.body);
  };
}

export function createLodNodeFromEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
  const { nodeById } = __appScope;
    const target = event.target instanceof Element
      ? event.target.closest(".lod-node[data-node-id]")
      : null;
    const nodeId = target?.getAttribute("data-node-id") ?? "";
    return nodeId ? nodeById.get(nodeId) : undefined;
  };
}

export function createLodTerminalIdFromEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
    const target = event.target instanceof Element
      ? event.target.closest("[data-terminal-id]")
      : null;
    return target?.closest(".lod-node[data-node-id]") ? target.getAttribute("data-terminal-id") ?? "" : "";
  };
}

export function createHandleLodNodePointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>) => {
  const { handleNodePointerDown, handleRoutableLineNodePointerDown, handleTerminalPointerDown, isRoutableLineDeviceKind, lodNodeFromEvent, lodTerminalIdFromEvent } = __appScope;
    const node = lodNodeFromEvent(event);
    if (node) {
      const terminalId = lodTerminalIdFromEvent(event);
      if (event.button === 0 && terminalId) {
        handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, terminalId);
        return;
      }
      if (isRoutableLineDeviceKind(node.kind)) {
        handleRoutableLineNodePointerDown(event, node);
        return;
      }
      handleNodePointerDown(event, node);
    }
  };
}

export function createHandleLodNodeContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGGElement>) => {
  const { activeLayerNodeIdSet, canvasInteractionRef, clampPointToCanvas, connectSource, isRoutableLineDeviceKind, lastCanvasPointerRef, lodNodeFromEvent, openGraphicContextMenu, projectListPointerInsideRef, resetConnectPreviewState, resetRoutableLinePreviewState, routableLineDeviceCanvasPoints, routableLinePlacement, screenToSvgPoint, selectCanvasGraphics, selectedNodeIdSet, setConnectSource, setMode, setRoutableLinePlacement, svgRef, updateMouseStatus } = __appScope;
    const node = lodNodeFromEvent(event);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    if (connectSource) {
      setConnectSource(null);
      resetConnectPreviewState();
      setMode("select");
      return;
    }
    if (routableLinePlacement) {
      setRoutableLinePlacement(null);
      resetRoutableLinePreviewState();
      setMode("select");
      return;
    }
    if (!selectedNodeIdSet.has(node.id)) {
      selectCanvasGraphics([node.id], []);
    }
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "node",
      canvasPoint: pointer,
      nodeId: node.id,
      routePoints: isRoutableLineDeviceKind(node.kind) ? routableLineDeviceCanvasPoints(node) : undefined
    });
  };
}
