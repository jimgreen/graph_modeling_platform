import { useEffect, useMemo, type CSSProperties } from "react";
import {
  calculateModelGeometryBounds,
  calculateNodeVisualBounds,
  getNodeScaleX,
  getNodeScaleY,
  type ModelNode,
  type Point
} from "./model";
import { type SelectionRect } from "./selectionActions";

export const CANVAS_MINIMAP_WIDTH = 220;
export const CANVAS_MINIMAP_HEIGHT = 142;

const CANVAS_MINIMAP_PADDING = 9;
const CANVAS_MINIMAP_MAX_NODE_MARKS = 360;
const CANVAS_MINIMAP_MAX_ROUTE_MARKS = 160;
const CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD = 1200;
const CANVAS_FLOATING_TOOLBAR_GAP = 7;
const NODE_FLOATING_TOOLBAR_WIDTH = 224;
const NODE_FLOATING_TOOLBAR_HEIGHT = 38;
const EDGE_FLOATING_TOOLBAR_WIDTH = 160;
const EDGE_FLOATING_TOOLBAR_HEIGHT = 38;

type CanvasViewportDerivationProps = Record<string, any>;

type RenderViewportBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type FloatingToolbarPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function selectionRectCenter(rect: SelectionRect): Point {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  };
}

function combineSelectionRects(rects: Array<SelectionRect | null | undefined>): SelectionRect | null {
  const validRects = rects.filter((rect): rect is SelectionRect => Boolean(rect));
  if (validRects.length === 0) {
    return null;
  }
  return {
    left: Math.min(...validRects.map((rect) => rect.left)),
    right: Math.max(...validRects.map((rect) => rect.right)),
    top: Math.min(...validRects.map((rect) => rect.top)),
    bottom: Math.max(...validRects.map((rect) => rect.bottom))
  };
}

function routeMidpoint(points: Point[]): Point | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return points[0];
  }
  const segmentLengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  if (totalLength <= 0) {
    return points[Math.floor(points.length / 2)];
  }
  let walked = 0;
  const target = totalLength / 2;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index];
    if (walked + length >= target) {
      const from = points[index];
      const to = points[index + 1];
      const ratio = length <= 0 ? 0 : (target - walked) / length;
      return {
        x: Math.round(from.x + (to.x - from.x) * ratio),
        y: Math.round(from.y + (to.y - from.y) * ratio)
      };
    }
    walked += length;
  }
  return points[points.length - 1];
}

function normalizeRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

const formatStatusNumber = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const formatStatusScalePercent = (value: number) => `${formatStatusNumber(value * 100)}%`;

const formatStatusRotationDegrees = (value: number) => `${formatStatusNumber(normalizeRotationDegrees(value))}°`;

const boxesIntersect = (first: RenderViewportBounds, second: RenderViewportBounds) =>
  first.left <= second.right &&
  first.right >= second.left &&
  first.top <= second.bottom &&
  first.bottom >= second.top;

const floatingToolbarBounds = (toolbar: FloatingToolbarPlacement) => ({
  left: toolbar.x,
  right: toolbar.x + toolbar.width,
  top: toolbar.y,
  bottom: toolbar.y + toolbar.height
});

const isGroupTransformDragLike = (transform: any) => Boolean(transform && "groupId" in transform);

export function useCanvasStatusDerivations(props: CanvasViewportDerivationProps) {
  const {
    activeSelectedEdgeIds,
    activeSelectedNodeIds,
    topologyErrors,
    visibleNodeById
  } = props;

  const selectedNodeCount = activeSelectedNodeIds.length;
  const selectedCount = selectedNodeCount + activeSelectedEdgeIds.length;
  const selectedNodeTransformStatus = useMemo(() => {
    const selectedNodes = activeSelectedNodeIds.flatMap((nodeId: string) => visibleNodeById.get(nodeId) ?? []);
    if (selectedNodes.length === 0) {
      return null;
    }
    const firstNode = selectedNodes[0];
    const firstScaleX = getNodeScaleX(firstNode);
    const firstScaleY = getNodeScaleY(firstNode);
    const firstRotation = normalizeRotationDegrees(firstNode.rotation);
    const sameScale = selectedNodes.every((node: ModelNode) =>
      Math.abs(getNodeScaleX(node) - firstScaleX) < 0.0005 &&
      Math.abs(getNodeScaleY(node) - firstScaleY) < 0.0005
    );
    const sameRotation = selectedNodes.every((node: ModelNode) => normalizeRotationDegrees(node.rotation) === firstRotation);
    const scaleText = sameScale
      ? `X ${formatStatusScalePercent(firstScaleX)} / Y ${formatStatusScalePercent(firstScaleY)}`
      : "多值";
    const rotationText = sameRotation ? formatStatusRotationDegrees(firstRotation) : "多值";
    return {
      scaleText,
      rotationText,
      title: selectedNodes.length === 1
        ? `${firstNode.name}：缩放 ${scaleText}，旋转 ${rotationText}`
        : `已选 ${selectedNodes.length} 个图元：缩放 ${scaleText}，旋转 ${rotationText}`
    };
  }, [activeSelectedNodeIds, visibleNodeById]);
  const topologyWarningDisplayMessage = (message: string) =>
    message.replace(/^(?:图上拓扑失败|拓扑失败)\s*[:：]\s*/, "");
  const warningStatusText = topologyErrors.length > 0
    ? `告警 ${topologyErrors.length} 条：${topologyWarningDisplayMessage(topologyErrors[0]?.message ?? "请查看拓扑告警")}`
    : "告警 无";
  const warningStatusTitle = topologyErrors.length > 0
    ? topologyErrors.slice(0, 5).map((error: any, index: number) => `${index + 1}. ${topologyWarningDisplayMessage(error.message)}`).join("\n")
    : "当前没有拓扑告警。";
  return {
    selectedCount,
    selectedNodeCount,
    selectedNodeTransformStatus,
    topologyWarningDisplayMessage,
    warningStatusText,
    warningStatusTitle
  };
}

export function useCanvasSelectionBounds(props: CanvasViewportDerivationProps) {
  const {
    activeSelectedEdgeIds,
    activeSelectedNodeIds,
    focusedGroupedNodeMovesGroup,
    isEditMode,
    routedEdgeById,
    selectedLayoutUnits,
    selectedNode,
    visibleNodeById
  } = props;

  const browseSelectedCanvasBounds = useMemo(() => {
    if (isEditMode || (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0)) {
      return null;
    }
    const rects: Array<SelectionRect | null> = [];
    for (const nodeId of activeSelectedNodeIds) {
      const node = visibleNodeById.get(nodeId);
      if (node) {
        rects.push(calculateNodeVisualBounds(node));
      }
    }
    for (const edgeId of activeSelectedEdgeIds) {
      const route = routedEdgeById.get(edgeId);
      const bounds = route ? calculateModelGeometryBounds([], [{ points: route.points }], 24) : null;
      if (bounds) {
        rects.push(bounds);
      }
    }
    return combineSelectionRects(rects);
  }, [activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode, routedEdgeById, visibleNodeById]);
  const selectedCanvasBounds = isEditMode
    ? combineSelectionRects(selectedLayoutUnits.map((unit: any) => unit.bounds)) ??
      calculateModelGeometryBounds(
        [],
        activeSelectedEdgeIds.flatMap((edgeId: string) => {
          const route = routedEdgeById.get(edgeId);
          return route ? [{ points: route.points }] : [];
        }),
        24
      )
    : browseSelectedCanvasBounds;
  const selectedFloatingToolbarBounds = isEditMode
    ? focusedGroupedNodeMovesGroup && selectedNode ? calculateNodeVisualBounds(selectedNode) : selectedCanvasBounds
    : null;

  return {
    selectedCanvasBounds,
    selectedFloatingToolbarBounds
  };
}

export function useCanvasFloatingToolbarLayout(props: CanvasViewportDerivationProps) {
  const {
    activeSelectedEdgeIds,
    activeSelectedNodeIds,
    canAddTemplateFromSelection,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasHeight,
    canvasScrollScale,
    canvasVisibleViewBox,
    canvasWidth,
    connectSource,
    currentZoomPercent,
    dragging,
    editHotInteractionActive,
    groupTransformGeometry,
    isEditMode,
    manualPathDrag,
    marquee,
    modifierSelectionPress,
    nodeById,
    nodeForegroundImage,
    nodeImage,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodeRotateHandleControlPoints,
    nodeUprightRotateHandleControlPoints,
    nodeUsesUprightStaticSelectionOutline,
    panning,
    rewiring,
    selectedCanvasBounds,
    selectedEdge,
    selectedFloatingToolbarBounds,
    selectedNode,
    selectedNodeCount,
    selectedRoutedEdge,
    selectedTransformGroupUnit,
    staticDrawing,
    terminalPress,
    transformDrag,
    viewBox
  } = props;

  const selectedToolbarHidden = Boolean(
    dragging ||
    transformDrag ||
    panning ||
    marquee ||
    modifierSelectionPress ||
    connectSource ||
    staticDrawing ||
    rewiring ||
    terminalPress ||
    manualPathDrag ||
    nodeLabelDrag ||
    nodeLabelRotateDrag
  );
  const nodeFloatingToolbarActionCount =
    6 +
    (canGroupSelectedGraphics ? 1 : 0) +
    (canUngroupSelectedGraphics ? 1 : 0) +
    (canAddTemplateFromSelection ? 1 : 0);
  const nodeFloatingToolbarWidth = Math.max(NODE_FLOATING_TOOLBAR_WIDTH, nodeFloatingToolbarActionCount * 34 + 16);
  const svgUiUnitY = viewBox.height / Math.max(1, canvasHeight);
  const floatingToolbarScreenScale = clampNumber(Math.sqrt(currentZoomPercent / 100), 0.78, 1);
  const floatingToolbarGap = Math.max(5, Math.round(CANVAS_FLOATING_TOOLBAR_GAP * floatingToolbarScreenScale));
  const floatingToolbarPadding = Math.max(6, Math.round(8 * floatingToolbarScreenScale));
  const floatingToolbarButtonSize = Math.max(24, Math.round(30 * floatingToolbarScreenScale));
  const floatingToolbarIconSize = Math.max(12, Math.round(15 * floatingToolbarScreenScale));
  const floatingToolbarViewportCanvas =
    canvasVisibleViewBox.width > 0 && canvasVisibleViewBox.height > 0 ? canvasVisibleViewBox : viewBox;
  const canvasPointToSurfaceCss = (point: Point): Point => ({
    x: canvasDisplayOffsetX + point.x * canvasScrollScale.x,
    y: canvasDisplayOffsetY + point.y * canvasScrollScale.y
  });
  const floatingToolbarViewport = {
    left: canvasDisplayOffsetX + floatingToolbarViewportCanvas.x * canvasScrollScale.x,
    right: canvasDisplayOffsetX + (floatingToolbarViewportCanvas.x + floatingToolbarViewportCanvas.width) * canvasScrollScale.x,
    top: canvasDisplayOffsetY + floatingToolbarViewportCanvas.y * canvasScrollScale.y,
    bottom: canvasDisplayOffsetY + (floatingToolbarViewportCanvas.y + floatingToolbarViewportCanvas.height) * canvasScrollScale.y
  };
  const clampFloatingToolbarPosition = (x: number, y: number, width: number, height: number) => {
    const minX = floatingToolbarViewport.left + floatingToolbarPadding;
    const minY = floatingToolbarViewport.top + floatingToolbarPadding;
    const maxX = Math.max(minX, floatingToolbarViewport.right - width - floatingToolbarPadding);
    const maxY = Math.max(minY, floatingToolbarViewport.bottom - height - floatingToolbarPadding);
    return {
      x: clampNumber(x, minX, maxX),
      y: clampNumber(y, minY, maxY)
    };
  };
  const toolbarOverlapArea = (first: RenderViewportBounds, second: RenderViewportBounds) => {
    if (!boxesIntersect(first, second)) {
      return 0;
    }
    return Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
      Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  };
  const canvasRectToSurfaceCssRect = (rect: RenderViewportBounds, padding = 0): RenderViewportBounds => {
    const topLeft = canvasPointToSurfaceCss({ x: rect.left, y: rect.top });
    const bottomRight = canvasPointToSurfaceCss({ x: rect.right, y: rect.bottom });
    return {
      left: Math.min(topLeft.x, bottomRight.x) - padding,
      right: Math.max(topLeft.x, bottomRight.x) + padding,
      top: Math.min(topLeft.y, bottomRight.y) - padding,
      bottom: Math.max(topLeft.y, bottomRight.y) + padding
    };
  };
  const rotateControlAvoidRectFromCanvasPoints = (points: Point[]): RenderViewportBounds => {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return canvasRectToSurfaceCssRect({
      left: Math.min(...xs) - 12,
      right: Math.max(...xs) + 12,
      top: Math.min(...ys) - 12,
      bottom: Math.max(...ys) + 12
    }, Math.max(4, Math.round(6 * floatingToolbarScreenScale)));
  };
  const rotateControlAvoidRectFromCanvas = (centerX: number, topY: number): RenderViewportBounds =>
    rotateControlAvoidRectFromCanvasPoints([
      { x: centerX, y: topY - 52 },
      { x: centerX, y: topY - 6 }
    ]);
  const selectedRotateControlAvoidRects: RenderViewportBounds[] = [];
  if (isEditMode && !editHotInteractionActive && selectedTransformGroupUnit) {
    selectedRotateControlAvoidRects.push(
      rotateControlAvoidRectFromCanvas(selectionRectCenter(selectedTransformGroupUnit.bounds).x, selectedTransformGroupUnit.bounds.top)
    );
  } else if (isEditMode && !editHotInteractionActive && selectedNode && selectedNodeCount === 1 && activeSelectedEdgeIds.length === 0) {
    const selectedNodeUprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(selectedNode, nodeImage(selectedNode), nodeForegroundImage(selectedNode));
    const selectedNodeRotateHandle = selectedNodeUprightStaticSelectionOutline
      ? nodeUprightRotateHandleControlPoints(selectedNode, 12, 36, 42)
      : nodeRotateHandleControlPoints(selectedNode, 12, 36, 42);
    const selectedNodeRotateHandlePoints = [
      selectedNodeRotateHandle.stemStart,
      selectedNodeRotateHandle.stemEnd,
      selectedNodeRotateHandle.handle
    ].map((point: Point) => ({
      x: selectedNode.position.x + point.x,
      y: selectedNode.position.y + point.y
    }));
    selectedRotateControlAvoidRects.push(
      rotateControlAvoidRectFromCanvasPoints(selectedNodeRotateHandlePoints)
    );
  }
  const selectedFloatingToolbarAvoidRect = selectedFloatingToolbarBounds
    ? canvasRectToSurfaceCssRect(
        selectedFloatingToolbarBounds,
        Math.max(floatingToolbarGap, Math.round(8 * floatingToolbarScreenScale))
      )
    : null;
  const placeFloatingToolbar = (
    candidates: Point[],
    width: number,
    height: number,
    avoidRects: RenderViewportBounds[] = []
  ): FloatingToolbarPlacement => {
    const placements = candidates.map((candidate, index) => {
      const point = clampFloatingToolbarPosition(candidate.x, candidate.y, width, height);
      const rect = { left: point.x, right: point.x + width, top: point.y, bottom: point.y + height };
      return {
        ...point,
        index,
        overlap: avoidRects.reduce((total, avoidRect) => total + toolbarOverlapArea(rect, avoidRect), 0),
        drift: Math.abs(point.x - candidate.x) + Math.abs(point.y - candidate.y)
      };
    });
    const chosen = [...placements].sort(
      (first, second) => first.overlap - second.overlap || first.drift - second.drift || first.index - second.index
    )[0];
    return {
      x: Math.round(chosen.x),
      y: Math.round(chosen.y),
      width,
      height,
      scale: floatingToolbarScreenScale
    };
  };
  const nodeFloatingToolbar =
    isEditMode && !selectedToolbarHidden && activeSelectedNodeIds.length > 0 && selectedFloatingToolbarBounds
      ? (() => {
          const width = Math.round(nodeFloatingToolbarWidth * floatingToolbarScreenScale);
          const height = Math.round(NODE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale);
          const centerX = (selectedFloatingToolbarBounds.left + selectedFloatingToolbarBounds.right) / 2;
          const centerY = (selectedFloatingToolbarBounds.top + selectedFloatingToolbarBounds.bottom) / 2;
          const topCenter = canvasPointToSurfaceCss({ x: centerX, y: selectedFloatingToolbarBounds.top });
          const bottomCenter = canvasPointToSurfaceCss({ x: centerX, y: selectedFloatingToolbarBounds.bottom });
          const leftCenter = canvasPointToSurfaceCss({ x: selectedFloatingToolbarBounds.left, y: centerY });
          const rightCenter = canvasPointToSurfaceCss({ x: selectedFloatingToolbarBounds.right, y: centerY });
          const nodeFloatingToolbarAvoidRects = [
            ...(selectedFloatingToolbarAvoidRect ? [selectedFloatingToolbarAvoidRect] : []),
            ...selectedRotateControlAvoidRects
          ];
          const rotateAvoidTop = selectedRotateControlAvoidRects.length > 0
            ? Math.min(...selectedRotateControlAvoidRects.map((rect) => rect.top))
            : null;
          const nodeToolbarCandidates = [
            ...(rotateAvoidTop === null ? [] : [{ x: topCenter.x - width / 2, y: rotateAvoidTop - height - floatingToolbarGap }]),
            { x: topCenter.x - width / 2, y: topCenter.y - height - floatingToolbarGap },
            { x: bottomCenter.x - width / 2, y: bottomCenter.y + floatingToolbarGap },
            { x: rightCenter.x + floatingToolbarGap, y: rightCenter.y - height / 2 },
            { x: leftCenter.x - width - floatingToolbarGap, y: leftCenter.y - height / 2 }
          ];
          return placeFloatingToolbar(nodeToolbarCandidates, width, height, nodeFloatingToolbarAvoidRects);
        })()
      : null;
  const nodeFloatingToolbarRect = nodeFloatingToolbar ? floatingToolbarBounds(nodeFloatingToolbar) : null;
  const selectedEdgeMidpoint = selectedRoutedEdge ? routeMidpoint(selectedRoutedEdge.points) : null;
  const edgeFloatingToolbar =
    isEditMode && !selectedToolbarHidden && selectedEdge && selectedRoutedEdge && selectedEdgeMidpoint
      ? (() => {
          const width = Math.round(EDGE_FLOATING_TOOLBAR_WIDTH * floatingToolbarScreenScale);
          const height = Math.round(EDGE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale);
          const midpoint = canvasPointToSurfaceCss(selectedEdgeMidpoint);
          const avoidRects = nodeFloatingToolbarRect ? [nodeFloatingToolbarRect] : [];
          return placeFloatingToolbar([
            { x: midpoint.x - width / 2, y: midpoint.y - height - floatingToolbarGap },
            { x: midpoint.x - width / 2, y: midpoint.y + floatingToolbarGap },
            { x: midpoint.x + floatingToolbarGap, y: midpoint.y - height / 2 },
            { x: midpoint.x - width - floatingToolbarGap, y: midpoint.y - height / 2 }
          ], width, height, avoidRects);
        })()
      : null;
  const floatingToolbarWrapperStyle = (toolbar: FloatingToolbarPlacement) => ({
    left: toolbar.x,
    top: toolbar.y,
    width: toolbar.width,
    height: toolbar.height,
    "--canvas-floating-toolbar-button-size": `${floatingToolbarButtonSize}px`,
    "--canvas-floating-toolbar-gap": `${Math.max(2, Math.round(4 * toolbar.scale))}px`,
    "--canvas-floating-toolbar-padding": `${Math.max(3, Math.round(4 * toolbar.scale))}px`,
    "--canvas-floating-toolbar-radius": `${Math.max(6, Math.round(8 * toolbar.scale))}px`
  } as CSSProperties);
  const resizeSizeHint =
    transformDrag && transformDrag.kind !== "rotate"
      ? (() => {
          if (isGroupTransformDragLike(transformDrag)) {
            const point = transformDrag.previewPoint;
            if (!point) {
              return null;
            }
            const geometry = groupTransformGeometry(transformDrag, point);
            if (geometry.kind !== "scale") {
              return null;
            }
            const width = Math.round((transformDrag.bounds.right - transformDrag.bounds.left) * geometry.scaleX);
            const height = Math.round((transformDrag.bounds.bottom - transformDrag.bounds.top) * geometry.scaleY);
            return {
              x: transformDrag.center.x,
              y: transformDrag.bounds.bottom + 26 * svgUiUnitY,
              text: `${width} x ${height}${transformDrag.proportionalScale ? " 等比" : ""}`
            };
          }
          const node = nodeById.get(transformDrag.nodeId);
          if (!node) {
            return null;
          }
          return {
            x: node.position.x,
            y: node.position.y + (node.size.height * Math.abs(getNodeScaleY(node))) / 2 + 30 * svgUiUnitY,
            text: `${Math.round(node.size.width * Math.abs(getNodeScaleX(node)))} x ${Math.round(node.size.height * Math.abs(getNodeScaleY(node)))}${transformDrag.proportionalScale || transformDrag.kind === "scale-both" ? " 等比" : ""}`
          };
        })()
      : null;

  return {
    edgeFloatingToolbar,
    floatingToolbarIconSize,
    floatingToolbarWrapperStyle,
    nodeFloatingToolbar,
    resizeSizeHint
  };
}

export function useCanvasMinimapState(props: CanvasViewportDerivationProps) {
  const {
    canvasHeight,
    canvasVisibleViewBox,
    canvasWidth,
    editHotInteractionActive,
    minimapSampleCacheRef,
    minimapSamplingReady,
    routedEdges,
    scheduleIdleWork,
    setMinimapSamplingReady,
    visibleNodes
  } = props;

  useEffect(() => {
    if (editHotInteractionActive) {
      return;
    }
    const minimapSampleSize = visibleNodes.length + routedEdges.length;
    if (minimapSampleSize <= CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD) {
      setMinimapSamplingReady(true);
      return;
    }
    setMinimapSamplingReady(false);
    return scheduleIdleWork(() => setMinimapSamplingReady(true), 80, 1500);
  }, [editHotInteractionActive, routedEdges, scheduleIdleWork, setMinimapSamplingReady, visibleNodes]);
  const minimapScale = Math.min(
    (CANVAS_MINIMAP_WIDTH - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasWidth),
    (CANVAS_MINIMAP_HEIGHT - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasHeight)
  );
  const minimapContentWidth = canvasWidth * minimapScale;
  const minimapContentHeight = canvasHeight * minimapScale;
  const minimapOffsetX = (CANVAS_MINIMAP_WIDTH - minimapContentWidth) / 2;
  const minimapOffsetY = (CANVAS_MINIMAP_HEIGHT - minimapContentHeight) / 2;
  const minimapNodeStep = Math.max(1, Math.ceil(visibleNodes.length / CANVAS_MINIMAP_MAX_NODE_MARKS));
  const minimapRouteStep = Math.max(1, Math.ceil(routedEdges.length / CANVAS_MINIMAP_MAX_ROUTE_MARKS));
  const minimapNodes = useMemo(() => {
    const cache = minimapSampleCacheRef.current;
    if (editHotInteractionActive) {
      return cache.nodes;
    }
    if (!minimapSamplingReady) {
      return cache.nodeSource === visibleNodes && cache.nodeStep === minimapNodeStep ? cache.nodes : [];
    }
    if (cache.nodeSource === visibleNodes && cache.nodeStep === minimapNodeStep) {
      return cache.nodes;
    }
    const nodes = visibleNodes.filter((_: any, index: number) => index % minimapNodeStep === 0);
    cache.nodeSource = visibleNodes;
    cache.nodeStep = minimapNodeStep;
    cache.nodes = nodes;
    return nodes;
  }, [editHotInteractionActive, minimapNodeStep, minimapSamplingReady, minimapSampleCacheRef, visibleNodes]);
  const minimapRoutes = useMemo(() => {
    const cache = minimapSampleCacheRef.current;
    if (editHotInteractionActive) {
      return cache.routes;
    }
    if (!minimapSamplingReady) {
      return cache.routeSource === routedEdges && cache.routeStep === minimapRouteStep ? cache.routes : [];
    }
    if (cache.routeSource === routedEdges && cache.routeStep === minimapRouteStep) {
      return cache.routes;
    }
    const routes = routedEdges.filter((_: any, index: number) => index % minimapRouteStep === 0);
    cache.routeSource = routedEdges;
    cache.routeStep = minimapRouteStep;
    cache.routes = routes;
    return routes;
  }, [editHotInteractionActive, minimapRouteStep, minimapSamplingReady, minimapSampleCacheRef, routedEdges]);
  const mapPointToMinimap = (point: Point) => ({
    x: minimapOffsetX + point.x * minimapScale,
    y: minimapOffsetY + point.y * minimapScale
  });
  const minimapViewportLeft = clampNumber(minimapOffsetX + canvasVisibleViewBox.x * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth);
  const minimapViewportTop = clampNumber(minimapOffsetY + canvasVisibleViewBox.y * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight);
  const minimapViewportRight = clampNumber(minimapOffsetX + (canvasVisibleViewBox.x + canvasVisibleViewBox.width) * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth);
  const minimapViewportBottom = clampNumber(minimapOffsetY + (canvasVisibleViewBox.y + canvasVisibleViewBox.height) * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight);

  return {
    CANVAS_MINIMAP_HEIGHT,
    CANVAS_MINIMAP_WIDTH,
    mapPointToMinimap,
    minimapContentHeight,
    minimapContentWidth,
    minimapNodes,
    minimapOffsetX,
    minimapOffsetY,
    minimapRoutes,
    minimapScale,
    minimapViewportBottom,
    minimapViewportLeft,
    minimapViewportRight,
    minimapViewportTop
  };
}
