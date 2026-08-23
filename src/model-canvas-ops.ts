// 静态绘制与画布操作（从 model-routing.ts 提取）
import { clampNumber } from "./canvasViewport";
import { degreesToRadians } from "./formatUtils";
// 审查 T15-P0-1：清理未使用导入（normalizeProjectMeasurements 及 model 内 12 个仅出现在 import 行的符号）
import type {
  CanvasBounds,
  CanvasResizeDragMetrics,
  DeviceTemplate,
  Edge,
  ModelNode,
  Point,
  RoutedEdge,
  ViewBox
} from "./model";
import {
  DEFAULT_MODEL_LAYER_ID,
  STATIC_DRAWING_MIN_SIZE,
  STATIC_DRAWING_PADDING,
  STATIC_DRAW_POINTS_PARAM,
  normalizeStaticDrawingPoints,
  roundStaticDrawingCoordinate,
  serializeStaticDrawPoints,
  createNodeFromTemplate
} from "./model";
import { calculateNodeVisualBounds } from "./model";
export function createStaticBoxNodeFromDrawing(
  template: DeviceTemplate,
  canvasPoints: readonly Point[],
  layerId = DEFAULT_MODEL_LAYER_ID
): ModelNode {
  const points = normalizeStaticDrawingPoints(canvasPoints);
  if (points.length < 2) {
    throw new Error("Static box drawing requires at least two points.");
  }
  const start = points[0];
  const end = points[points.length - 1];
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  const width = Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(right - left));
  const height = Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(bottom - top));
  const center = {
    x: roundStaticDrawingCoordinate(left + width / 2),
    y: roundStaticDrawingCoordinate(top + height / 2)
  };
  const node = createNodeFromTemplate(template, center);
  return {
    ...node,
    layerId,
    size: { width, height }
  };
}

export function createInteractiveStaticDrawingNode(
  template: DeviceTemplate,
  canvasPoints: readonly Point[],
  layerId = DEFAULT_MODEL_LAYER_ID
): ModelNode {
  const points = normalizeStaticDrawingPoints(canvasPoints);
  if (points.length < 2) {
    throw new Error("Interactive static drawing requires at least two points.");
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const center = {
    x: roundStaticDrawingCoordinate((left + right) / 2),
    y: roundStaticDrawingCoordinate((top + bottom) / 2)
  };
  const drawPoints = points.map((point) => ({
    x: roundStaticDrawingCoordinate(point.x - center.x),
    y: roundStaticDrawingCoordinate(point.y - center.y)
  }));
  const node = createNodeFromTemplate(template, center);
  return {
    ...node,
    layerId,
    size: {
      width: Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(right - left + STATIC_DRAWING_PADDING * 2)),
      height: Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(bottom - top + STATIC_DRAWING_PADDING * 2))
    },
    params: {
      ...node.params,
      [STATIC_DRAW_POINTS_PARAM]: serializeStaticDrawPoints(drawPoints)
    }
  };
}

export function getNodeScaleX(node: ModelNode): number {
  return node.scaleX ?? node.scale ?? 1;
}

export function getNodeScaleY(node: ModelNode): number {
  return node.scaleY ?? node.scale ?? 1;
}

/** 安全获取节点 X 缩放值（绝对值 + fallback） */
export function getSafeNodeScaleX(node: ModelNode): number {
  return Math.abs(getNodeScaleX(node)) || 1;
}

/** 安全获取节点 Y 缩放值（绝对值 + fallback） */
export function getSafeNodeScaleY(node: ModelNode): number {
  return Math.abs(getNodeScaleY(node)) || 1;
}

export function normalizeScaleValue(value: number, fallback = 1) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeMirrorRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export function mirrorNodes(nodes: ModelNode[], nodeIds: string[], axis: "horizontal" | "vertical"): ModelNode[] {
  const selected = new Set(nodeIds);
  return nodes.map((node) => {
    if (!selected.has(node.id)) {
      return node;
    }
    if (axis === "horizontal") {
      return { ...node, rotation: normalizeMirrorRotationDegrees(-node.rotation), scaleX: -getNodeScaleX(node) };
    }
    return { ...node, rotation: normalizeMirrorRotationDegrees(-node.rotation), scaleY: -getNodeScaleY(node) };
  });
}

export function clampPointToBounds(point: Point, bounds: CanvasBounds): Point {
  return {
    x: Math.round(clampNumber(point.x, 0, bounds.width)),
    y: Math.round(clampNumber(point.y, 0, bounds.height))
  };
}

export function clampEdgeGeometryToBounds(edge: Edge, bounds: CanvasBounds): Edge {
  let changed = false;
  const clampOptionalPoint = (point?: Point) => {
    if (!point) {
      return undefined;
    }
    const clamped = clampPointToBounds(point, bounds);
    if (clamped.x !== point.x || clamped.y !== point.y) {
      changed = true;
    }
    return clamped;
  };
  const sourcePoint = clampOptionalPoint(edge.sourcePoint);
  const targetPoint = clampOptionalPoint(edge.targetPoint);
  const manualPoints = edge.manualPoints?.map(clampOptionalPoint).filter((point): point is Point => Boolean(point));
  if (manualPoints && (!edge.manualPoints || manualPoints.some((point, index) => point.x !== edge.manualPoints?.[index]?.x || point.y !== edge.manualPoints?.[index]?.y))) {
    changed = true;
  }
  return changed ? { ...edge, sourcePoint, targetPoint, manualPoints } : edge;
}

export function clampNodePositionToBounds(node: ModelNode, bounds: CanvasBounds, position = node.position): Point {
  const visualBounds = calculateNodeVisualBounds(node, 0, position);
  const leftOffset = visualBounds.left - position.x;
  const rightOffset = visualBounds.right - position.x;
  const topOffset = visualBounds.top - position.y;
  const bottomOffset = visualBounds.bottom - position.y;
  const minX = -leftOffset;
  const maxX = bounds.width - rightOffset;
  const minY = -topOffset;
  const maxY = bounds.height - bottomOffset;
  const clampAxis = (value: number, min: number, max: number) =>
    min <= max ? clampNumber(value, min, max) : (min + max) / 2;
  return {
    x: Math.round(clampAxis(position.x, minX, maxX)),
    y: Math.round(clampAxis(position.y, minY, maxY))
  };
}

export type GeometryBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function calculateModelGeometryBounds(
  nodes: ModelNode[],
  routedEdges: Pick<RoutedEdge, "points">[] = [],
  padding = 0
): GeometryBounds | null {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let hasBounds = false;
  const includeBox = (box: GeometryBounds) => {
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
    hasBounds = true;
  };
  for (const node of nodes) {
    includeBox(calculateNodeVisualBounds(node, padding));
  }
  for (const route of routedEdges) {
    if (route.points.length === 0) {
      continue;
    }
    let routeLeft = Number.POSITIVE_INFINITY;
    let routeRight = Number.NEGATIVE_INFINITY;
    let routeTop = Number.POSITIVE_INFINITY;
    let routeBottom = Number.NEGATIVE_INFINITY;
    for (const point of route.points) {
      routeLeft = Math.min(routeLeft, point.x);
      routeRight = Math.max(routeRight, point.x);
      routeTop = Math.min(routeTop, point.y);
      routeBottom = Math.max(routeBottom, point.y);
    }
    includeBox({
      left: routeLeft - padding,
      right: routeRight + padding,
      top: routeTop - padding,
      bottom: routeBottom + padding
    });
  }
  if (!hasBounds) {
    return null;
  }
  return {
    left,
    right,
    top,
    bottom
  };
}

export function geometryBoundsInsideCanvas(bounds: GeometryBounds | null, canvasBounds: CanvasBounds, margin = 0): boolean {
  if (!bounds) {
    return true;
  }
  return (
    bounds.left >= margin &&
    bounds.top >= margin &&
    bounds.right <= canvasBounds.width - margin &&
    bounds.bottom <= canvasBounds.height - margin
  );
}

export function modelGeometryInsideCanvasBounds(
  nodes: ModelNode[],
  routedEdges: Pick<RoutedEdge, "points">[],
  canvasBounds: CanvasBounds,
  margin = 0
): boolean {
  return geometryBoundsInsideCanvas(calculateModelGeometryBounds(nodes, routedEdges), canvasBounds, margin);
}

export function normalizeViewBoxToCanvas(box: ViewBox, bounds: CanvasBounds): ViewBox {
  return box;
}

export function canvasResizeBoundsFromPointerDrag(
  drag: CanvasResizeDragMetrics,
  pointer: Pick<globalThis.PointerEvent, "clientX" | "clientY">,
  minBounds: CanvasBounds
): CanvasBounds {
  const safeUnitsPerCssX = Number.isFinite(drag.unitsPerCssX) && drag.unitsPerCssX > 0 ? drag.unitsPerCssX : 1;
  const safeUnitsPerCssY = Number.isFinite(drag.unitsPerCssY) && drag.unitsPerCssY > 0 ? drag.unitsPerCssY : 1;
  const deltaX = (pointer.clientX - drag.startClientX) * safeUnitsPerCssX;
  const deltaY = (pointer.clientY - drag.startClientY) * safeUnitsPerCssY;
  const resizesRight = drag.edge === "right" || drag.edge === "corner" || drag.edge === "top-right";
  const resizesBottom = drag.edge === "bottom" || drag.edge === "corner" || drag.edge === "bottom-left";
  const resizesLeft = drag.edge === "left" || drag.edge === "top-left" || drag.edge === "bottom-left";
  const resizesTop = drag.edge === "top" || drag.edge === "top-left" || drag.edge === "top-right";
  return {
    width: Math.round(
      resizesRight
        ? Math.max(minBounds.width, drag.startWidth + deltaX)
        : resizesLeft
          ? Math.max(minBounds.width, drag.startWidth - deltaX)
        : drag.startWidth
    ),
    height: Math.round(
      resizesBottom
        ? Math.max(minBounds.height, drag.startHeight + deltaY)
        : resizesTop
          ? Math.max(minBounds.height, drag.startHeight - deltaY)
        : drag.startHeight
    )
  };
}

export function canvasResizeMinimumBoundsForGeometry(
  edge: CanvasResizeDragMetrics["edge"],
  currentBounds: CanvasBounds,
  geometryBounds: GeometryBounds | null,
  absoluteMinBounds: CanvasBounds
): CanvasBounds {
  const resizesRight = edge === "right" || edge === "corner" || edge === "top-right";
  const resizesBottom = edge === "bottom" || edge === "corner" || edge === "bottom-left";
  const resizesLeft = edge === "left" || edge === "top-left" || edge === "bottom-left";
  const resizesTop = edge === "top" || edge === "top-left" || edge === "top-right";
  const minWidth = Math.max(0, Math.ceil(absoluteMinBounds.width));
  const minHeight = Math.max(0, Math.ceil(absoluteMinBounds.height));
  if (!geometryBounds) {
    return { width: minWidth, height: minHeight };
  }
  return {
    width: resizesRight
      ? Math.max(minWidth, Math.ceil(geometryBounds.right))
      : resizesLeft
        ? Math.max(minWidth, Math.ceil(currentBounds.width - geometryBounds.left))
        : minWidth,
    height: resizesBottom
      ? Math.max(minHeight, Math.ceil(geometryBounds.bottom))
      : resizesTop
        ? Math.max(minHeight, Math.ceil(currentBounds.height - geometryBounds.top))
        : minHeight
  };
}

export function canvasResizeOriginShiftFromPointerDrag(
  drag: CanvasResizeDragMetrics,
  pointer: Pick<globalThis.PointerEvent, "clientX" | "clientY">,
  minBounds: CanvasBounds
): Point {
  const bounds = canvasResizeBoundsFromPointerDrag(drag, pointer, minBounds);
  const shiftsLeft = drag.edge === "left" || drag.edge === "top-left" || drag.edge === "bottom-left";
  const shiftsTop = drag.edge === "top" || drag.edge === "top-left" || drag.edge === "top-right";
  return {
    x: shiftsLeft ? Math.round(bounds.width - drag.startWidth) : 0,
    y: shiftsTop ? Math.round(bounds.height - drag.startHeight) : 0
  };
}

function viewBoxScaleRatio(viewBox: ViewBox, bounds: CanvasBounds): number {
  if (viewBox.width <= 0 || viewBox.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return 1;
  }
  const widthRatio = viewBox.width / bounds.width;
  const heightRatio = viewBox.height / bounds.height;
  return Math.sqrt(widthRatio * heightRatio);
}

export function keyboardMoveStepForViewBox(viewBox: ViewBox, bounds: CanvasBounds, baseStep = 6): number {
  const safeBase = Math.max(1, Math.abs(baseStep));
  const zoomRatio = viewBoxScaleRatio(viewBox, bounds);
  return safeBase * zoomRatio;
}

export function viewBoxZoomPercent(viewBox: ViewBox, bounds: CanvasBounds): number {
  const zoomRatio = viewBoxScaleRatio(viewBox, bounds);
  return Math.max(1, Math.round(100 / zoomRatio));
}

export function clampViewBoxDimensionsForZoom(
  size: Pick<ViewBox, "width" | "height">,
  bounds: CanvasBounds,
  minZoomPercent = 5,
  maxZoomPercent = 2000
): Pick<ViewBox, "width" | "height"> {
  const safeMinZoom = Math.max(1, minZoomPercent);
  const safeMaxZoom = Math.max(safeMinZoom, maxZoomPercent);
  const minRatio = 100 / safeMaxZoom;
  const maxRatio = 100 / safeMinZoom;
  return {
    width: clampNumber(size.width, bounds.width * minRatio, bounds.width * maxRatio),
    height: clampNumber(size.height, bounds.height * minRatio, bounds.height * maxRatio)
  };
}
