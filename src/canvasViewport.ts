import {
  clampViewBoxDimensionsForZoom,
  normalizeViewBoxToCanvas,
  type CanvasBounds,
  type Point
} from "./model";

export type CanvasViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasResizeEdge = "right" | "bottom" | "corner" | "left" | "top" | "top-left" | "top-right" | "bottom-left";

export type CanvasResizePreviewMetrics = {
  edge: CanvasResizeEdge;
  startWidth: number;
  startHeight: number;
  startDisplayWidth: number;
  startDisplayHeight: number;
  startDisplayOffsetX: number;
  startDisplayOffsetY: number;
};

export type CanvasResizePreviewRect = { left: number; top: number; width: number; height: number };

export type CanvasResizeCommitScrollTarget = {
  left: number;
  top: number;
  deltaX: number;
  deltaY: number;
  affectsX: boolean;
  affectsY: boolean;
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function canvasResizeEdgeAnchorsAxis(edge: CanvasResizeEdge, axis: "x" | "y") {
  return axis === "x"
    ? edge === "right" || edge === "corner" || edge === "left" || edge === "top-left" || edge === "top-right" || edge === "bottom-left"
    : edge === "bottom" || edge === "corner" || edge === "top" || edge === "top-left" || edge === "top-right" || edge === "bottom-left";
}

function canvasResizeRectSide(rect: CanvasResizePreviewRect, side: "left" | "right" | "top" | "bottom") {
  switch (side) {
    case "left":
      return rect.left;
    case "right":
      return rect.left + rect.width;
    case "top":
      return rect.top;
    case "bottom":
      return rect.top + rect.height;
  }
}

export function canvasResizeEdgeAnchorsStart(edge: CanvasResizeEdge, axis: "x" | "y") {
  return axis === "x"
    ? edge === "left" || edge === "top-left" || edge === "bottom-left"
    : edge === "top" || edge === "top-left" || edge === "top-right";
}

export function canvasResizeOriginShiftForBounds(edge: CanvasResizeEdge, startBounds: CanvasBounds, nextBounds: CanvasBounds): Point {
  return {
    x: canvasResizeEdgeAnchorsStart(edge, "x") ? Math.round(nextBounds.width - startBounds.width) : 0,
    y: canvasResizeEdgeAnchorsStart(edge, "y") ? Math.round(nextBounds.height - startBounds.height) : 0
  };
}

export function canvasResizePreviewRectForDraft(drag: CanvasResizePreviewMetrics, draftBounds: CanvasBounds): CanvasResizePreviewRect {
  const scaleX = drag.startWidth > 0 ? drag.startDisplayWidth / drag.startWidth : 1;
  const scaleY = drag.startHeight > 0 ? drag.startDisplayHeight / drag.startHeight : 1;
  const width = Math.max(1, Math.round(draftBounds.width * scaleX));
  const height = Math.max(1, Math.round(draftBounds.height * scaleY));
  const left = canvasResizeEdgeAnchorsStart(drag.edge, "x")
    ? Math.round(drag.startDisplayOffsetX + drag.startDisplayWidth - width)
    : Math.round(drag.startDisplayOffsetX);
  const top = canvasResizeEdgeAnchorsStart(drag.edge, "y")
    ? Math.round(drag.startDisplayOffsetY + drag.startDisplayHeight - height)
    : Math.round(drag.startDisplayOffsetY);
  return { left, top, width, height };
}

export function canvasResizeScrollTargetForCommitAnchor({
  edge,
  desiredRect,
  currentRect,
  currentScrollLeft,
  currentScrollTop,
  maxScrollLeft,
  maxScrollTop
}: {
  edge: CanvasResizeEdge;
  desiredRect: CanvasResizePreviewRect;
  currentRect: CanvasResizePreviewRect;
  currentScrollLeft: number;
  currentScrollTop: number;
  maxScrollLeft: number;
  maxScrollTop: number;
}): CanvasResizeCommitScrollTarget {
  const affectsX = canvasResizeEdgeAnchorsAxis(edge, "x");
  const affectsY = canvasResizeEdgeAnchorsAxis(edge, "y");
  const anchorX = canvasResizeEdgeAnchorsStart(edge, "x") ? "right" : "left";
  const anchorY = canvasResizeEdgeAnchorsStart(edge, "y") ? "bottom" : "top";
  const deltaX = affectsX
    ? canvasResizeRectSide(currentRect, anchorX) - canvasResizeRectSide(desiredRect, anchorX)
    : 0;
  const deltaY = affectsY
    ? canvasResizeRectSide(currentRect, anchorY) - canvasResizeRectSide(desiredRect, anchorY)
    : 0;
  return {
    left: affectsX ? clampNumber(currentScrollLeft + deltaX, 0, maxScrollLeft) : currentScrollLeft,
    top: affectsY ? clampNumber(currentScrollTop + deltaY, 0, maxScrollTop) : currentScrollTop,
    deltaX,
    deltaY,
    affectsX,
    affectsY
  };
}

export function canvasVisualRectScrollTarget({
  desiredRect,
  currentRect,
  currentScrollLeft,
  currentScrollTop,
  maxScrollLeft,
  maxScrollTop,
  affectsX = true,
  affectsY = true
}: {
  desiredRect: CanvasResizePreviewRect;
  currentRect: CanvasResizePreviewRect;
  currentScrollLeft: number;
  currentScrollTop: number;
  maxScrollLeft: number;
  maxScrollTop: number;
  affectsX?: boolean;
  affectsY?: boolean;
}): CanvasResizeCommitScrollTarget {
  const deltaX = affectsX ? currentRect.left - desiredRect.left : 0;
  const deltaY = affectsY ? currentRect.top - desiredRect.top : 0;
  return {
    left: affectsX ? clampNumber(currentScrollLeft + deltaX, 0, maxScrollLeft) : currentScrollLeft,
    top: affectsY ? clampNumber(currentScrollTop + deltaY, 0, maxScrollTop) : currentScrollTop,
    deltaX,
    deltaY,
    affectsX,
    affectsY
  };
}

function viewBoxStartToScrollPosition(viewStart: number, viewSize: number, boundSize: number, maxScroll: number) {
  const maxViewStart = Math.max(0, boundSize - viewSize);
  return maxScroll > 1 && maxViewStart > 0 ? clampNumber((viewStart / maxViewStart) * maxScroll, 0, maxScroll) : 0;
}

export function scrollPositionToViewBoxStart(scrollPosition: number, viewSize: number, boundSize: number, maxScroll: number, fallbackStart: number) {
  const maxViewStart = Math.max(0, boundSize - viewSize);
  return maxScroll > 1 && maxViewStart > 0
    ? clampNumber((scrollPosition / maxScroll) * maxViewStart, 0, maxViewStart)
    : fallbackStart;
}

export function canvasFrameScrollTargetForViewBox({
  targetViewBox,
  canvasBounds,
  maxScrollLeft,
  maxScrollTop,
  horizontalScrollbarsActive,
  verticalScrollbarsActive
}: {
  targetViewBox: CanvasViewBox;
  canvasBounds: CanvasBounds;
  maxScrollLeft: number;
  maxScrollTop: number;
  horizontalScrollbarsActive: boolean;
  verticalScrollbarsActive: boolean;
}) {
  const syncHorizontal = horizontalScrollbarsActive || maxScrollLeft > 1;
  const syncVertical = verticalScrollbarsActive || maxScrollTop > 1;
  return {
    left: syncHorizontal
      ? viewBoxStartToScrollPosition(targetViewBox.x, targetViewBox.width, canvasBounds.width, maxScrollLeft)
      : 0,
    top: syncVertical
      ? viewBoxStartToScrollPosition(targetViewBox.y, targetViewBox.height, canvasBounds.height, maxScrollTop)
      : 0
  };
}

export function canvasViewBoxFromFrameScrollPosition({
  currentViewBox,
  canvasBounds,
  scrollLeft,
  scrollTop,
  maxScrollLeft,
  maxScrollTop,
  horizontalScrollbarsActive,
  verticalScrollbarsActive
}: {
  currentViewBox: CanvasViewBox;
  canvasBounds: CanvasBounds;
  scrollLeft: number;
  scrollTop: number;
  maxScrollLeft: number;
  maxScrollTop: number;
  horizontalScrollbarsActive: boolean;
  verticalScrollbarsActive: boolean;
}) {
  const syncHorizontal = horizontalScrollbarsActive || maxScrollLeft > 1;
  const syncVertical = verticalScrollbarsActive || maxScrollTop > 1;
  return normalizeViewBoxToCanvas({
    ...currentViewBox,
    x: syncHorizontal
      ? scrollPositionToViewBoxStart(scrollLeft, currentViewBox.width, canvasBounds.width, maxScrollLeft, currentViewBox.x)
      : currentViewBox.x,
    y: syncVertical
      ? scrollPositionToViewBoxStart(scrollTop, currentViewBox.height, canvasBounds.height, maxScrollTop, currentViewBox.y)
      : currentViewBox.y
  }, canvasBounds);
}

export function canvasFullViewBoxFromBounds(bounds: CanvasBounds): CanvasViewBox {
  return { x: 0, y: 0, width: bounds.width, height: bounds.height };
}

function viewBoxSizePreservingCanvasUnitScale(
  current: Pick<CanvasViewBox, "width" | "height">,
  currentBounds: CanvasBounds | undefined,
  nextBounds: CanvasBounds
) {
  if (!currentBounds || currentBounds.width <= 0 || currentBounds.height <= 0) {
    return clampViewBoxDimensionsForZoom(current, nextBounds);
  }
  return clampViewBoxDimensionsForZoom({
    width: Math.round(current.width * (nextBounds.width / currentBounds.width)),
    height: Math.round(current.height * (nextBounds.height / currentBounds.height))
  }, nextBounds);
}

export function canvasRenderViewBoxAfterBoundsDraft(
  current: CanvasViewBox,
  currentBounds: CanvasBounds,
  nextBounds: CanvasBounds
): CanvasViewBox {
  return normalizeViewBoxToCanvas({
    ...current,
    ...viewBoxSizePreservingCanvasUnitScale(current, currentBounds, nextBounds)
  }, nextBounds);
}

export function viewBoxAfterCanvasBoundsChange(
  current: CanvasViewBox,
  nextBounds: CanvasBounds,
  originShift: Point = { x: 0, y: 0 },
  currentBounds?: CanvasBounds
): CanvasViewBox {
  return normalizeViewBoxToCanvas({
    ...current,
    x: current.x + originShift.x,
    y: current.y + originShift.y,
    ...viewBoxSizePreservingCanvasUnitScale(current, currentBounds, nextBounds)
  }, nextBounds);
}

export function canvasBoundsChangeIsMeaningful(
  currentBounds: CanvasBounds,
  nextBounds: CanvasBounds,
  originShift: Point = { x: 0, y: 0 }
) {
  return (
    nextBounds.width !== currentBounds.width ||
    nextBounds.height !== currentBounds.height ||
    originShift.x !== 0 ||
    originShift.y !== 0
  );
}

export function canvasFrameScrollIsUserDriven({
  programmaticScroll,
  boundsScrollSyncPending
}: {
  programmaticScroll: boolean;
  boundsScrollSyncPending: boolean;
}) {
  return !programmaticScroll && !boundsScrollSyncPending;
}

export function canvasScrollSyncShouldRun({
  skipNextScrollSync,
  boundsScrollSyncPending
}: {
  skipNextScrollSync: boolean;
  boundsScrollSyncPending: boolean;
}) {
  return boundsScrollSyncPending || !skipNextScrollSync;
}

export function canvasBoundsScrollSyncTarget({
  anchorScrollLeft,
  anchorScrollTop,
  targetScrollLeft,
  targetScrollTop,
  maxScrollLeft,
  maxScrollTop,
  targetViewBox,
  canvasBounds
}: {
  anchorScrollLeft: number;
  anchorScrollTop: number;
  targetScrollLeft: number;
  targetScrollTop: number;
  maxScrollLeft: number;
  maxScrollTop: number;
  targetViewBox: CanvasViewBox;
  canvasBounds: CanvasBounds;
}) {
  const useHorizontalAnchor = targetViewBox.width >= canvasBounds.width - 1;
  const useVerticalAnchor = targetViewBox.height >= canvasBounds.height - 1;
  return {
    left: useHorizontalAnchor ? clampNumber(anchorScrollLeft, 0, maxScrollLeft) : targetScrollLeft,
    top: useVerticalAnchor ? clampNumber(anchorScrollTop, 0, maxScrollTop) : targetScrollTop
  };
}
