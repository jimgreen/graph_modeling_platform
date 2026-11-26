/** 静态图形绘制、折线/曲线工具与画布标注交互工厂模块。 */

import type { CanvasInteractionScope } from "./appScopeTypes";
import {
  applyDragContainerMembership,
  clampContainerCenterToMembers,
  containerDragGroup,
  containerGatewayUnbindNotice,
  containerMemberNodes,
  containerResizeMinSize,
  foldContainerScaleIntoSize,
  hasContainer,
  isContainerNode,
  refitContainersAfterTransform,
  withNodeUpdates,
} from "../acContainer";
import { cloneEdgeEditablePoints } from "../model";
import { voltageBaseParamTerminalIndexForNode } from "../model-routing";
import type {
  CanvasBounds,
  Edge,
  ModelNode,
  Point,
  RoutedEdge,
} from "../model";
import type {
  ConnectSourceState,
  ConnectTarget,
  DraggingState,
  NodeTerminalSnapTarget,
  RenderViewportBounds,
  RewiringState,
  RoutableLinePlacementState,
  SmartAlignmentAnchorMap,
  SmartAlignmentAxisCandidate,
  SmartAlignmentGuide,
  UndoGraphPatchScope,
} from "./appCoreCanvasUtilities";
import type { GraphStore } from "../graphStore";
import type { ModelLayer } from "../model";

/** 变压器侧电压参数(i_vbase/j_vbase/k_vbase) → 对应端子 id；非变压器或非侧电压参数返回 undefined。
 *  分侧表（双绕组 i/j = 高/低、三绕组 i/k/j = 高/中/低）**不在本文件**：见
 *  `voltageBaseParamTerminalIndexForNode` —— 两处各存一份正是「改中压侧却改了低压侧」的成因。 */
export function transformerSideTerminalIdForVoltageParam(node: ModelNode, key: string): string | undefined {
  const terminalIndex = voltageBaseParamTerminalIndexForNode(node, key);
  return terminalIndex === undefined ? undefined : node.terminals[terminalIndex]?.id;
}

// 线路接线预览：路径 + 落点。清空时写成 { path: "", targetPoint: null }。
type RoutableLinePreviewState = { path: string; targetPoint: Point | null };

// 画布尺寸草稿：宽高都是字符串（提交时才 Number() 转换，空串表示「沿用当前值」。
export type CanvasSizeDraft = { width: string; height: string };

// 判断额定容量是否在合理范围内（非空、非零、非占位值）
export function isRatedCapacityInReasonableRange(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || trimmed === "0 MW" || trimmed === "0 kW") return false;
  return true;
}

export function createUpdateSingleNodeDragImperativePreview(__appScope: CanvasInteractionScope) {
  return (dragState: DraggingState, previewDelta: Point) => {
  const { applyNodeTerminalSnap, findSingleNodeDragSnapTargetAtDelta, imperativeSingleNodeDragActiveRef, imperativeSingleNodeDragNodeOverlayRef, isMultiNodeMoveState, nodeTerminalSnapTargetRef, setImperativeSingleNodeDragOrigin, setImperativeSingleNodeDragOriginLines, showImperativeSingleNodeDragPreview, singleNodeDragScopedEdges, updateImperativeNodeDragDropHint, updateNodeDragLightweightEdgePreview } = __appScope;
    if (isMultiNodeMoveState(dragState)) {
      return;
    }
    if (!imperativeSingleNodeDragActiveRef.current) {
      if (!showImperativeSingleNodeDragPreview(dragState)) {
        return;
      }
      setImperativeSingleNodeDragOrigin(dragState.nodeIds[0] ?? null);
      setImperativeSingleNodeDragOriginLines(dragState);
    }
    const scopedEdges = singleNodeDragScopedEdges(dragState, previewDelta);
    const snapTarget = findSingleNodeDragSnapTargetAtDelta(dragState, previewDelta, scopedEdges.snapEdges);
    const visualDelta = applyNodeTerminalSnap(previewDelta, snapTarget);
    const visualTransform = `translate(${Math.round(visualDelta.x)} ${Math.round(visualDelta.y)})`;
    imperativeSingleNodeDragNodeOverlayRef.current?.setAttribute("transform", visualTransform);
    updateNodeDragLightweightEdgePreview(dragState, visualDelta, scopedEdges.previewEdges);
    nodeTerminalSnapTargetRef.current = snapTarget;
    updateImperativeNodeDragDropHint(snapTarget);
  };
}

export function createStartDraggingState(__appScope: CanvasInteractionScope) {
  return (nextDragging: DraggingState) => {
  const { draggingRef, hideImperativeMultiNodeDragOverlay, hideImperativeSingleNodeDragPreview, isMultiNodeMoveState, resetMultiNodeDragOverlayTransform, setDragging, setImperativeSingleNodeDragOrigin, setImperativeSingleNodeDragOriginLines, showImperativeMultiNodeDragOverlay, showImperativeSingleNodeDragPreview, smartAlignmentAnchorBoundsRef, smartAlignmentCandidateCacheRef, smartAlignmentSortedAnchorsRef, updateSmartAlignmentGuides } = __appScope;
    draggingRef.current = nextDragging;
    updateSmartAlignmentGuides([]);
    // 清空所有对齐缓存，将在首次需要时计算
    smartAlignmentCandidateCacheRef.current = null;
    smartAlignmentSortedAnchorsRef.current = null;
    smartAlignmentAnchorBoundsRef.current = null;
    resetMultiNodeDragOverlayTransform();
    const simplifiedMarkup = isMultiNodeMoveState(nextDragging) ? nextDragging.overlayPreview?.simplifiedMarkup : "";
    if (simplifiedMarkup && showImperativeMultiNodeDragOverlay(simplifiedMarkup)) {
      hideImperativeSingleNodeDragPreview();
      return;
    }
    hideImperativeMultiNodeDragOverlay();
    if (!isMultiNodeMoveState(nextDragging)) {
      if (showImperativeSingleNodeDragPreview(nextDragging)) {
        setImperativeSingleNodeDragOrigin(nextDragging.nodeIds[0] ?? null);
        setImperativeSingleNodeDragOriginLines(nextDragging);
        return;
      }
    } else {
      hideImperativeSingleNodeDragPreview();
    }
    setDragging(nextDragging);
  };
}

export function createFlushConnectPreviewDom(__appScope: CanvasInteractionScope) {
  return () => {
  const { connectDropHintElementRef, connectPreviewDomRef, connectPreviewHandleElementRef, connectPreviewPathElementRef, connectPreviewPointRef } = __appScope;
    const { path, targetPoint } = connectPreviewDomRef.current;
    const previewPath = connectPreviewPathElementRef.current;
    if (previewPath) {
      if (path) {
        previewPath.setAttribute("d", path);
        previewPath.style.display = "";
      } else {
        previewPath.removeAttribute("d");
        previewPath.style.display = "none";
      }
    }
    const previewHandle = connectPreviewHandleElementRef.current;
    if (previewHandle) {
      const previewPoint = targetPoint ?? connectPreviewPointRef.current;
      if (previewPoint) {
        previewHandle.setAttribute("cx", String(previewPoint.x));
        previewHandle.setAttribute("cy", String(previewPoint.y));
        previewHandle.style.display = "";
      } else {
        previewHandle.style.display = "none";
      }
    }
    const dropHint = connectDropHintElementRef.current;
    if (dropHint) {
      if (targetPoint) {
        dropHint.setAttribute("transform", `translate(${Math.round(targetPoint.x)} ${Math.round(targetPoint.y)})`);
        dropHint.style.display = "";
      } else {
        dropHint.style.display = "none";
      }
    }
  };
}

export function createSetConnectPreviewDom(__appScope: CanvasInteractionScope) {
  return (path: string, targetPoint: Point | null) => {
  const { connectPreviewDomRef, flushConnectPreviewDom, sameOptionalPoint } = __appScope;
    const previous = connectPreviewDomRef.current;
    if (previous.path === path && sameOptionalPoint(previous.targetPoint ?? undefined, targetPoint ?? undefined)) {
      return;
    }
    connectPreviewDomRef.current = { path, targetPoint };
    flushConnectPreviewDom();
  };
}

export function createApplyConnectPreviewState(__appScope: CanvasInteractionScope) {
  return (
    point: Point | null,
    ready: boolean,
    targetPoint: Point | null = null,
    target: ConnectTarget | null = null,
    sourceOverride?: ConnectSourceState | null
  ) => {
  const { buildConnectPreviewPath, connectDropReadyRef, connectDropTargetPointRef, connectDropTargetRef, connectPreviewPointRef, connectSource, sameConnectTarget, sameOptionalPoint, setConnectDropReady, setConnectPreviewDom } = __appScope;
    if (sourceOverride === undefined) {
      sourceOverride = connectSource;
    }
    const previousPoint = connectPreviewPointRef.current;
    if (!sameOptionalPoint(previousPoint ?? undefined, point ?? undefined)) {
      connectPreviewPointRef.current = point;
    }
    const previousTargetPoint = connectDropTargetPointRef.current;
    const nextTargetPoint = ready ? targetPoint : null;
    if (!sameOptionalPoint(previousTargetPoint ?? undefined, nextTargetPoint ?? undefined)) {
      connectDropTargetPointRef.current = nextTargetPoint;
    }
    const previousTarget = connectDropTargetRef.current;
    const nextTarget = ready ? target : null;
    if (!sameConnectTarget(previousTarget ?? undefined, nextTarget)) {
      connectDropTargetRef.current = nextTarget;
    }
    setConnectPreviewDom(buildConnectPreviewPath(sourceOverride, point, nextTargetPoint, nextTarget), nextTargetPoint);
    if (connectDropReadyRef.current !== ready) {
      connectDropReadyRef.current = ready;
      setConnectDropReady(ready);
    }
  };
}

export function createScheduleConnectPreviewPoint(__appScope: CanvasInteractionScope) {
  return (point: Point | null) => {
  const { applyConnectPreviewState, connectPreviewFrameRef, connectTargetSnapPoint, findConnectTargetAtPoint, pendingConnectPreviewRef } = __appScope;
    pendingConnectPreviewRef.current = { point, ready: false, targetPoint: null, target: null };
    if (connectPreviewFrameRef.current !== null) {
      return;
    }
    connectPreviewFrameRef.current = window.requestAnimationFrame(() => {
      connectPreviewFrameRef.current = null;
      const next = pendingConnectPreviewRef.current;
      pendingConnectPreviewRef.current = null;
      if (!next) {
        return;
      }
      const target = next.point ? findConnectTargetAtPoint(next.point) : null;
      applyConnectPreviewState(
        next.point,
        Boolean(target),
        target ? connectTargetSnapPoint(target) : null,
        target ?? null
      );
    });
  };
}

export function createApplyRoutableLinePreviewState(__appScope: CanvasInteractionScope) {
  return (
    point: Point | null,
    targetPoint: Point | null = null,
    target: ConnectTarget | null = null,
    placementOverride?: RoutableLinePlacementState
  ) => {
  const { buildRoutableLinePreviewPath, routableLineDropTargetPointRef, routableLineDropTargetRef, routableLinePlacement, routableLinePreviewPointRef, sameConnectTarget, sameOptionalPoint, setRoutableLinePreview } = __appScope;
    if (placementOverride === undefined) {
      placementOverride = routableLinePlacement;
    }
    if (!sameOptionalPoint(routableLinePreviewPointRef.current ?? undefined, point ?? undefined)) {
      routableLinePreviewPointRef.current = point;
    }
    if (!sameOptionalPoint(routableLineDropTargetPointRef.current ?? undefined, targetPoint ?? undefined)) {
      routableLineDropTargetPointRef.current = targetPoint;
    }
    if (!sameConnectTarget(routableLineDropTargetRef.current ?? undefined, target)) {
      routableLineDropTargetRef.current = target;
    }
    const path = buildRoutableLinePreviewPath(placementOverride, point, targetPoint, target);
    setRoutableLinePreview((current: RoutableLinePreviewState | null) =>
      current && current.path === path && sameOptionalPoint(current.targetPoint ?? undefined, targetPoint ?? undefined)
        ? current
        : { path, targetPoint }
    );
  };
}

export function createScheduleRoutableLinePreviewPoint(__appScope: CanvasInteractionScope) {
  return (point: Point | null) => {
  const { applyRoutableLinePreviewState, connectTargetPoint, findRoutableLineEndpointTargetAtPoint, pendingRoutableLinePreviewRef, routableLinePreviewFrameRef } = __appScope;
    pendingRoutableLinePreviewRef.current = { point };
    if (routableLinePreviewFrameRef.current !== null) {
      return;
    }
    routableLinePreviewFrameRef.current = window.requestAnimationFrame(() => {
      routableLinePreviewFrameRef.current = null;
      const next = pendingRoutableLinePreviewRef.current;
      pendingRoutableLinePreviewRef.current = null;
      if (!next) {
        return;
      }
      const target = next.point ? findRoutableLineEndpointTargetAtPoint(next.point) : null;
      applyRoutableLinePreviewState(
        next.point,
        target ? connectTargetPoint(target) : null,
        target
      );
    });
  };
}

export function createReleaseRoutableLinePreviewAxisLock(__appScope: CanvasInteractionScope) {
  return () => {
  const { routableLinePreviewAxisLockRef } = __appScope;
    routableLinePreviewAxisLockRef.current = null;
  };
}

export function createLockRoutableLinePreviewAxis(__appScope: CanvasInteractionScope) {
  return (point: Point) => {
  const { primaryOrthogonalAxis, routableLinePlacement, routableLinePreviewAxisLockRef, routableLinePreviewAxisReferencePoint } = __appScope;
    if (!routableLinePlacement?.source) {
      return null;
    }
    const referencePoint = routableLinePreviewAxisReferencePoint();
    if (!referencePoint) {
      return null;
    }
    const locked = routableLinePreviewAxisLockRef.current;
    if (locked && locked.nodeId === routableLinePlacement.source.node.id && locked.terminalId === routableLinePlacement.source.terminalId) {
      return locked.axis;
    }
    if (referencePoint.x === point.x && referencePoint.y === point.y) {
      return null;
    }
    const axis = primaryOrthogonalAxis(referencePoint, point);
    routableLinePreviewAxisLockRef.current = {
      axis,
      nodeId: routableLinePlacement.source.node.id,
      terminalId: routableLinePlacement.source.terminalId
    };
    return axis;
  };
}

export function createAppendRoutableLinePreviewManualPoint(__appScope: CanvasInteractionScope) {
  return (point: Point) => {
  const { pendingRoutableLinePreviewRef, releaseRoutableLinePreviewAxisLock, routableLinePlacement, routableLinePreviewAxisReferencePoint, routableLinePreviewFrameRef, sameOptionalPoint, setRoutableLinePlacement } = __appScope;
    if (!routableLinePlacement?.source) {
      return null;
    }
    const referencePoint = routableLinePreviewAxisReferencePoint();
    if (!referencePoint || sameOptionalPoint(referencePoint, point)) {
      return routableLinePlacement;
    }
    pendingRoutableLinePreviewRef.current = null;
    if (routableLinePreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(routableLinePreviewFrameRef.current);
      routableLinePreviewFrameRef.current = null;
    }
    const nextPlacement = {
      ...routableLinePlacement,
      manualPoints: [...(routableLinePlacement.manualPoints ?? []), { ...point }]
    };
    setRoutableLinePlacement(nextPlacement);
    releaseRoutableLinePreviewAxisLock();
    return nextPlacement;
  };
}

export function createResolveRoutableLinePreviewPoint(__appScope: CanvasInteractionScope) {
  return (point: Point, event: { shiftKey: boolean; ctrlKey: boolean }) => {
  const { clampPointToCanvas, constrainPointToOrthogonalAxis, lockRoutableLinePreviewAxis, releaseRoutableLinePreviewAxisLock, routableLinePlacement, routableLinePreviewAxisReferencePoint } = __appScope;
    if (!routableLinePlacement?.source) {
      releaseRoutableLinePreviewAxisLock();
      return point;
    }
    const referencePoint = routableLinePreviewAxisReferencePoint();
    if (!referencePoint) {
      return point;
    }
    if (event.ctrlKey) {
      const axis = lockRoutableLinePreviewAxis(point);
      return axis ? clampPointToCanvas(constrainPointToOrthogonalAxis(referencePoint, point, axis)) : point;
    }
    releaseRoutableLinePreviewAxisLock();
    return event.shiftKey ? clampPointToCanvas(constrainPointToOrthogonalAxis(referencePoint, point)) : point;
  };
}

export function createResetRoutableLinePreviewState(__appScope: CanvasInteractionScope) {
  return () => {
  const { pendingRoutableLinePreviewRef, releaseRoutableLinePreviewAxisLock, routableLineDropTargetPointRef, routableLineDropTargetRef, routableLinePreviewFrameRef, routableLinePreviewPointRef, setRoutableLinePreview } = __appScope;
    releaseRoutableLinePreviewAxisLock();
    pendingRoutableLinePreviewRef.current = null;
    if (routableLinePreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(routableLinePreviewFrameRef.current);
      routableLinePreviewFrameRef.current = null;
    }
    routableLinePreviewPointRef.current = null;
    routableLineDropTargetPointRef.current = null;
    routableLineDropTargetRef.current = null;
    setRoutableLinePreview((current: RoutableLinePreviewState | null) => current && (current.path || current.targetPoint) ? { path: "", targetPoint: null } : current);
  };
}

export function createScheduleRewirePreviewPoint(__appScope: CanvasInteractionScope) {
  return (point: Point, rewiring: Exclude<RewiringState, null>, ctrlKey = false) => {
  const { alignBusEndpointPointToRouteSegmentExtension, connectTargetSnapPoint, edgeById, endpointMatchedRoutePointsForEdge, findRewireTargetAtPoint, isBusNode, pendingRewirePreviewRef, previewStoredRoutePointsForEdge, rewirePreviewFrameRef, routedEdgeById, sameConnectTarget, sameOptionalPoint, setRewiring } = __appScope;
    pendingRewirePreviewRef.current = { point, rewiring, ctrlKey };
    if (rewirePreviewFrameRef.current !== null) {
      return;
    }
    rewirePreviewFrameRef.current = window.requestAnimationFrame(() => {
      rewirePreviewFrameRef.current = null;
      const next = pendingRewirePreviewRef.current;
      pendingRewirePreviewRef.current = null;
      if (!next) {
        return;
      }
      const target = findRewireTargetAtPoint(next.point, next.rewiring);
      const edge = edgeById.get(next.rewiring.edgeId);
      const cachedRoutePoints = edge ? endpointMatchedRoutePointsForEdge(edge, routedEdgeById.get(edge.id)?.points) : [];
      const routePoints = edge
        ? cachedRoutePoints.length
          ? cachedRoutePoints
          : previewStoredRoutePointsForEdge(edge)
        : [];
      const alignedPoint =
        target && next.ctrlKey && isBusNode(target.node)
          ? alignBusEndpointPointToRouteSegmentExtension(target.node, routePoints, next.rewiring.endpoint)
          : null;
      const effectiveTarget = target && alignedPoint ? { ...target, point: alignedPoint } : target;
      const snappedPreviewPoint = effectiveTarget ? connectTargetSnapPoint(effectiveTarget) : next.point;
      const dropTargetPoint = effectiveTarget ? connectTargetSnapPoint(effectiveTarget) : undefined;
      setRewiring((current: RewiringState | null) =>
        current && current.edgeId === next.rewiring.edgeId && current.endpoint === next.rewiring.endpoint
          ? sameOptionalPoint(current.previewPoint, snappedPreviewPoint) &&
            sameOptionalPoint(current.dropTargetPoint, dropTargetPoint) &&
            sameConnectTarget(current.dropTarget, effectiveTarget)
            ? current
            : { ...current, previewPoint: snappedPreviewPoint, dropTargetPoint, dropTarget: effectiveTarget ?? undefined }
          : current
      );
    });
  };
}

export function createResetConnectPreviewState(__appScope: CanvasInteractionScope) {
  return () => {
  const { applyConnectPreviewState, connectPreviewFrameRef, pendingConnectPreviewRef, releaseConnectPreviewAxisLock } = __appScope;
    releaseConnectPreviewAxisLock();
    pendingConnectPreviewRef.current = null;
    if (connectPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(connectPreviewFrameRef.current);
      connectPreviewFrameRef.current = null;
    }
    applyConnectPreviewState(null, false);
  };
}

export function createReleaseConnectPreviewAxisLock(__appScope: CanvasInteractionScope) {
  return () => {
  const { connectPreviewAxisLockRef } = __appScope;
    connectPreviewAxisLockRef.current = null;
  };
}

export function createConnectSourceEndpointPoint(__appScope: CanvasInteractionScope) {
  return () => {
  const { connectSource, getModelEdgeEndpointPoint, visibleNodeById } = __appScope;
    if (!connectSource) {
      return null;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    return sourceNode
      ? connectSource.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, connectSource.terminalId)
      : null;
  };
}

export function createLockConnectPreviewAxis(__appScope: CanvasInteractionScope) {
  return (point: Point) => {
  const { connectPreviewAxisLockRef, connectPreviewAxisReferencePoint, connectSource, primaryOrthogonalAxis } = __appScope;
    if (!connectSource) {
      return null;
    }
    const referencePoint = connectPreviewAxisReferencePoint();
    if (!referencePoint) {
      return null;
    }
    const locked = connectPreviewAxisLockRef.current;
    if (locked && locked.nodeId === connectSource.nodeId && locked.terminalId === connectSource.terminalId) {
      return locked.axis;
    }
    if (referencePoint.x === point.x && referencePoint.y === point.y) {
      return null;
    }
    const axis = primaryOrthogonalAxis(referencePoint, point);
    connectPreviewAxisLockRef.current = { axis, nodeId: connectSource.nodeId, terminalId: connectSource.terminalId };
    return axis;
  };
}

export function createAppendConnectPreviewManualPoint(__appScope: CanvasInteractionScope) {
  return (point: Point) => {
  const { connectPreviewAxisReferencePoint, connectPreviewFrameRef, connectSource, pendingConnectPreviewRef, releaseConnectPreviewAxisLock, sameOptionalPoint, setConnectSource } = __appScope;
    if (!connectSource) {
      return null;
    }
    const referencePoint = connectPreviewAxisReferencePoint();
    if (!referencePoint || sameOptionalPoint(referencePoint, point)) {
      return connectSource;
    }
    pendingConnectPreviewRef.current = null;
    if (connectPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(connectPreviewFrameRef.current);
      connectPreviewFrameRef.current = null;
    }
    const nextConnectSource = {
      ...connectSource,
      manualPoints: [...(connectSource.manualPoints ?? []), { ...point }]
    };
    setConnectSource(nextConnectSource);
    releaseConnectPreviewAxisLock();
    return nextConnectSource;
  };
}

export function createResolveConnectPreviewPoint(__appScope: CanvasInteractionScope) {
  return (point: Point, event: { shiftKey: boolean; ctrlKey: boolean }) => {
  const { clampPointToCanvas, connectPreviewAxisReferencePoint, connectSource, connectSourceEndpointPoint, constrainPointToOrthogonalAxis, lockConnectPreviewAxis, releaseConnectPreviewAxisLock } = __appScope;
    if (!connectSource) {
      releaseConnectPreviewAxisLock();
      return point;
    }
    const start = connectSourceEndpointPoint();
    if (!start) {
      return point;
    }
    if (event.ctrlKey) {
      const referencePoint = connectPreviewAxisReferencePoint() ?? start;
      const axis = lockConnectPreviewAxis(point);
      return axis ? clampPointToCanvas(constrainPointToOrthogonalAxis(referencePoint, point, axis)) : point;
    }
    releaseConnectPreviewAxisLock();
    const referencePoint = connectPreviewAxisReferencePoint() ?? start;
    return event.shiftKey ? clampPointToCanvas(constrainPointToOrthogonalAxis(referencePoint, point)) : point;
  };
}

export function createBoundedDeltaForNodes(__appScope: CanvasInteractionScope) {
  return (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number,
    bounds?: CanvasBounds
  ) => {
  const { canvasBounds, clampNodePositionToExpandableBounds, nodes, orderedNodesForIds } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    let boundedDx = dx;
    let boundedDy = dy;
    const selected = new Set(nodeIds);
    for (const node of orderedNodesForIds(nodes, selected)) {
      const original = originalPositions[node.id];
      if (!selected.has(node.id) || !original) {
        continue;
      }
      const clamped = clampNodePositionToExpandableBounds(node, bounds, { x: original.x + boundedDx, y: original.y + boundedDy });
      boundedDx = clamped.x - original.x;
      boundedDy = clamped.y - original.y;
    }
    return { x: boundedDx, y: boundedDy };
  };
}

export function createBoundedDeltaForMultiNodeInteractiveMove(__appScope: CanvasInteractionScope) {
  return (dragState: DraggingState, delta: Point) => {
  const { allowAutoExpandCanvas, boundsForNodeSet, canvasBounds, clampNumber, nodes } = __appScope;
    if (allowAutoExpandCanvas) {
      return delta;
    }
    const bounds =
      dragState.overlayPreview?.bounds ??
      boundsForNodeSet(nodes, new Set(dragState.nodeIds), dragState.originalPositions, 0);
    if (!bounds) {
      return delta;
    }
    const clampAxis = (value: number, min: number, max: number) =>
      min <= max ? clampNumber(value, min, max) : value;
    return {
      x: clampAxis(delta.x, -bounds.left, canvasBounds.width - bounds.right),
      y: clampAxis(delta.y, -bounds.top, canvasBounds.height - bounds.bottom)
    };
  };
}

export function createNodeMoveGeometryInsideCanvas(__appScope: CanvasInteractionScope) {
  return (
    nodeIds: string[],
    edgeIds: string[],
    affectedEdgesForMove: Edge[],
    originalPositions: Record<string, Point>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    delta: Point,
    bounds?: CanvasBounds
  ) => {
  const { MOVE_BOUNDARY_GUARD, adjustEdgesAfterNodeMove, allowAutoExpandCanvas, canvasBounds, canvasBoundsWithOriginShift, clampNodePositionToExpandableBounds, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, modelGeometryInsideCanvasBounds, nodes, orderedNodesForIds, routeEdgesForStoredRendering, routePreserveEdgeIdsForMovedNodes, translateNodeBy, translateRouteBy } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const movedNodeIds = new Set(nodeIds);
    const selectedEdgeIds = new Set(edgeIds);
    const relevantNodeIds = new Set(nodeIds);
    for (const edge of affectedEdgesForMove) {
      relevantNodeIds.add(edge.sourceId);
      relevantNodeIds.add(edge.targetId);
    }
    const nextNodes = orderedNodesForIds(nodes, relevantNodeIds).map((node: ModelNode) => {
      const originalPosition = originalPositions[node.id];
      return movedNodeIds.has(node.id) && originalPosition
        ? { ...node, position: clampNodePositionToExpandableBounds(node, bounds, { x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }) }
        : node;
    });
    const movedNodes = nextNodes.filter((node: ModelNode) => movedNodeIds.has(node.id));
    const deltasByNode = Object.fromEntries(nodeIds.map((id) => [id, delta]));
    const affectedEdges = affectedEdgesForMove.filter(
      (edge) => movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)
    );
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(affectedEdges, nodeIds, edgeIds);
    const nextAffectedEdges =
      affectedEdges.length > 0
        ? adjustEdgesAfterNodeMove(
            affectedEdges,
            nextNodes,
            movedNodeIds,
            originalEdgePoints,
            deltasByNode,
            originalRoutePoints,
            preserveRouteEdgeIds,
            bounds
          )
        : [];
    const affectedRoutes =
      nextAffectedEdges.length > 0 ? routeEdgesForStoredRendering(nextNodes, nextAffectedEdges, bounds) : [];
    const originShift = allowAutoExpandCanvas
      ? leftTopCanvasOriginShiftForContent(movedNodes, [], affectedRoutes, MOVE_BOUNDARY_GUARD)
      : { x: 0, y: 0 };
    const shiftedBounds = canvasBoundsWithOriginShift(bounds, originShift);
    const shiftedMovedNodes = hasCanvasOriginShift(originShift)
      ? movedNodes.map((node: ModelNode) => translateNodeBy(node, originShift))
      : movedNodes;
    const shiftedAffectedRoutes = hasCanvasOriginShift(originShift)
      ? affectedRoutes.map((route: RoutedEdge) => translateRouteBy(route, originShift))
      : affectedRoutes;
    return modelGeometryInsideCanvasBounds(shiftedMovedNodes, shiftedAffectedRoutes, shiftedBounds, MOVE_BOUNDARY_GUARD);
  };
}

export function createNearestBoundarySafeDelta(__appScope: CanvasInteractionScope) {
  return (
    requestedDelta: Point,
    isSafeDelta: (delta: Point) => boolean,
    fallbackDelta: Point = { x: 0, y: 0 }
  ): Point => {
    if (isSafeDelta(requestedDelta)) {
      return requestedDelta;
    }
    const safeFallback = isSafeDelta(fallbackDelta) ? fallbackDelta : { x: 0, y: 0 };
    if (!isSafeDelta(safeFallback)) {
      return safeFallback;
    }
    let low = safeFallback;
    let high = requestedDelta;
    for (let index = 0; index < 12; index += 1) {
      const middle = {
        x: (low.x + high.x) / 2,
        y: (low.y + high.y) / 2
      };
      if (isSafeDelta(middle)) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return { x: Math.round(low.x), y: Math.round(low.y) };
  };
}

export function createBoundedDeltaForMoveGeometry(__appScope: CanvasInteractionScope) {
  return (
    nodeIds: string[],
    edgeIds: string[],
    affectedEdgesForMove: Edge[],
    originalPositions: Record<string, Point>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    dx: number,
    dy: number,
    fallbackDelta?: Point,
    bounds?: CanvasBounds
  ) => {
  const { boundedDeltaForNodes, canvasBounds, nearestBoundarySafeDelta, nodeMoveGeometryInsideCanvas } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const nodeBoundedDelta = boundedDeltaForNodes(nodeIds, originalPositions, dx, dy, bounds);
    return nearestBoundarySafeDelta(
      nodeBoundedDelta,
      (delta: Point) => nodeMoveGeometryInsideCanvas(nodeIds, edgeIds, affectedEdgesForMove, originalPositions, originalEdgePoints, originalRoutePoints, delta, bounds),
      fallbackDelta
    );
  };
}

export function createCommitSafeDeltaForDraggingState(__appScope: CanvasInteractionScope) {
  return (dragState: DraggingState) => {
  const { boundedDeltaForMoveGeometry, canvasBoundsForMoveDelta, isMultiNodeMoveState } = __appScope;
    const delta = dragState.currentDelta;
    if (!delta || isMultiNodeMoveState(dragState)) {
      return delta;
    }
    return boundedDeltaForMoveGeometry(
      dragState.nodeIds,
      dragState.edgeIds,
      dragState.affectedEdges,
      dragState.originalPositions,
      dragState.originalEdgePoints,
      dragState.originalRoutePoints,
      delta.x,
      delta.y,
      delta,
      canvasBoundsForMoveDelta(dragState.nodeIds, dragState.originalPositions, delta.x, delta.y)
    );
  };
}

export function createCanvasBoundsForMovedNodeDelta(__appScope: CanvasInteractionScope) {
  return (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, allowAutoExpandCanvas, canvasBounds, canvasBoundsForGraphContent, nodeById } = __appScope;
    if (nodeIds.length === 0) {
      return canvasBounds;
    }
    if (!allowAutoExpandCanvas) {
      return canvasBounds;
    }
    const movedNodes: ModelNode[] = [];
    const seen = new Set<string>();
    for (const nodeId of nodeIds) {
      if (seen.has(nodeId)) {
        continue;
      }
      seen.add(nodeId);
      const node = nodeById.get(nodeId);
      const originalPosition = originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      movedNodes.push({
        ...node,
        position: {
          x: Math.round(originalPosition.x + dx),
          y: Math.round(originalPosition.y + dy)
        }
      });
    }
    return movedNodes.length > 0
      ? canvasBoundsForGraphContent(canvasBounds, movedNodes, [], [], CANVAS_AUTO_EXPAND_PADDING)
      : canvasBounds;
  };
}

export function createDragBoundsForSmartAlignment(__appScope: CanvasInteractionScope) {
  return (dragState: DraggingState, delta: Point): RenderViewportBounds | null => {
  const { mergeRenderViewportBounds, nodeById, nodeHasUprightBoundsContent, nodeSmartAlignmentBounds } = __appScope;
    let bounds: RenderViewportBounds | null = null;
    for (const nodeId of dragState.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragState.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      const movedPosition = {
        x: originalPosition.x + delta.x,
        y: originalPosition.y + delta.y
      };
      const nodeBounds = nodeSmartAlignmentBounds(node, movedPosition, nodeHasUprightBoundsContent(node));
      bounds = bounds ? mergeRenderViewportBounds(bounds, nodeBounds) : nodeBounds;
    }
    return bounds;
  };
}

export function createTerminalOutflowAnchorsForSmartAlignmentDrag(__appScope: CanvasInteractionScope) {
  return (dragState: DraggingState, delta: Point): SmartAlignmentAnchorMap => {
  const { emptySmartAlignmentAnchorMap, nodeById, nodeTerminalOutflowSmartAlignmentAnchors } = __appScope;
    const anchors = emptySmartAlignmentAnchorMap();
    for (const nodeId of dragState.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragState.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      const movedPosition = {
        x: originalPosition.x + delta.x,
        y: originalPosition.y + delta.y
      };
      const nodeAnchors = nodeTerminalOutflowSmartAlignmentAnchors(node, movedPosition);
      anchors.x.push(...nodeAnchors.x);
      anchors.y.push(...nodeAnchors.y);
    }
    return anchors;
  };
}

export function createComputeSmartAlignmentGeometrySnap(__appScope: CanvasInteractionScope) {
  return (
    draggedBounds: RenderViewportBounds,
    draggedAnchors: SmartAlignmentAnchorMap,
    excludedNodeIds: ReadonlySet<string> = new Set<string>()
  ) => {
  const { SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, bestSmartAlignmentAxisSnap, canvasScrollScaleRef, canvasVisibleViewBoxRef, isEditMode, nodeHasUprightBoundsContent, nodeSmartAlignmentBounds, nodeTerminalOutflowSmartAlignmentAnchors, queryNodeSpatialIndex, smartAlignmentEnabled, viewBoxRef, visibleNodeSpatialIndex } = __appScope;
    if (!smartAlignmentEnabled || !isEditMode) {
      return { adjustment: { x: 0, y: 0 }, guides: [] as SmartAlignmentGuide[] };
    }
    const visible = canvasVisibleViewBoxRef.current.width > 0 && canvasVisibleViewBoxRef.current.height > 0
      ? canvasVisibleViewBoxRef.current
      : viewBoxRef.current;
    const snapThreshold = SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE / Math.max(0.2, Math.max(canvasScrollScaleRef.current.x, canvasScrollScaleRef.current.y));
    const verticalSearchBounds: RenderViewportBounds = {
      left: draggedBounds.left - snapThreshold,
      right: draggedBounds.right + snapThreshold,
      top: visible.y,
      bottom: visible.y + visible.height
    };
    const horizontalSearchBounds: RenderViewportBounds = {
      left: visible.x,
      right: visible.x + visible.width,
      top: draggedBounds.top - snapThreshold,
      bottom: draggedBounds.bottom + snapThreshold
    };
    const candidatesById = new Map<string, SmartAlignmentAxisCandidate>();
    const includeCandidate = (candidate: ModelNode) => {
      if (excludedNodeIds.has(candidate.id) || candidatesById.has(candidate.id)) {
        return;
      }
      candidatesById.set(candidate.id, {
        id: candidate.id,
        bounds: nodeSmartAlignmentBounds(candidate, candidate.position, nodeHasUprightBoundsContent(candidate)),
        anchors: nodeTerminalOutflowSmartAlignmentAnchors(candidate, candidate.position)
      });
    };
    for (const candidate of queryNodeSpatialIndex(visibleNodeSpatialIndex, verticalSearchBounds)) {
      includeCandidate(candidate);
    }
    for (const candidate of queryNodeSpatialIndex(visibleNodeSpatialIndex, horizontalSearchBounds)) {
      includeCandidate(candidate);
    }
    const candidates = Array.from(candidatesById.values());
    if (candidates.length === 0) {
      return { adjustment: { x: 0, y: 0 }, guides: [] as SmartAlignmentGuide[] };
    }
    const xSnap = bestSmartAlignmentAxisSnap("x", draggedBounds, draggedAnchors.x, candidates, snapThreshold);
    const ySnap = bestSmartAlignmentAxisSnap("y", draggedBounds, draggedAnchors.y, candidates, snapThreshold);
    const guides = [xSnap?.guide, ySnap?.guide].filter((guide): guide is SmartAlignmentGuide => Boolean(guide));
    return {
      adjustment: {
        x: xSnap?.adjustment ?? 0,
        y: ySnap?.adjustment ?? 0
      },
      guides
    };
  };
}

export function createComputeSmartAlignmentSnap(__appScope: CanvasInteractionScope) {
  const computeSmartAlignmentGeometrySnap = createComputeSmartAlignmentGeometrySnap(__appScope);
  return (dragState: DraggingState, movementDelta: Point, axisLocked: boolean) => {
  const { dragBoundsForSmartAlignment, isEditMode, smartAlignmentEnabled, terminalOutflowAnchorsForSmartAlignmentDrag } = __appScope;
    // 对齐功能关闭时直接返回无对齐结果
    if (!smartAlignmentEnabled || axisLocked || !isEditMode || dragState.nodeIds.length === 0 || dragState.wholeLayerMove) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const draggedBounds = dragBoundsForSmartAlignment(dragState, movementDelta);
    if (!draggedBounds) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const draggedNodeIds = new Set(dragState.nodeIds);
    const draggedTerminalAnchors = terminalOutflowAnchorsForSmartAlignmentDrag(dragState, movementDelta);
    const smartSnap = computeSmartAlignmentGeometrySnap(draggedBounds, draggedTerminalAnchors, draggedNodeIds);
    return {
      delta: {
        x: movementDelta.x + smartSnap.adjustment.x,
        y: movementDelta.y + smartSnap.adjustment.y
      },
      guides: smartSnap.guides
    };
  };
}

export function createComputeNodeDragPreviewDelta(__appScope: CanvasInteractionScope) {
  return (
    dragState: DraggingState,
    point: Point,
    ctrlKey: boolean,
    shiftKey: boolean
  ) => {
  const { axisLockedDelta, computeSmartAlignmentSnap, updateSmartAlignmentGuides } = __appScope;
    const rawDx = point.x - dragState.startPoint.x;
    const rawDy = point.y - dragState.startPoint.y;
    const movementDelta = ctrlKey || shiftKey ? axisLockedDelta(rawDx, rawDy) : { x: rawDx, y: rawDy };
    const smartSnap = computeSmartAlignmentSnap(dragState, movementDelta, ctrlKey || shiftKey);
    updateSmartAlignmentGuides(smartSnap.guides);
    return smartSnap.delta;
  };
}

export function createComputeNodeDragDelta(__appScope: CanvasInteractionScope) {
  return (
    dragState: DraggingState,
    point: Point,
    ctrlKey: boolean,
    shiftKey: boolean
  ) => {
  const { boundedDeltaForMoveGeometry, boundedDeltaForMultiNodeInteractiveMove, canvasBoundsForMoveDelta, computeNodeDragPreviewDelta, isMultiNodeMoveState } = __appScope;
    const movementDelta = computeNodeDragPreviewDelta(dragState, point, ctrlKey, shiftKey);
    if (isMultiNodeMoveState(dragState)) {
      return boundedDeltaForMultiNodeInteractiveMove(dragState, movementDelta);
    }
    const expandedBounds = canvasBoundsForMoveDelta(dragState.nodeIds, dragState.originalPositions, movementDelta.x, movementDelta.y);
    return boundedDeltaForMoveGeometry(
      dragState.nodeIds,
      dragState.edgeIds,
      dragState.affectedEdges,
      dragState.originalPositions,
      dragState.originalEdgePoints,
      dragState.originalRoutePoints,
      movementDelta.x,
      movementDelta.y,
      dragState.currentDelta ?? { x: 0, y: 0 },
      expandedBounds
    );
  };
}

export function createApplyNodeDragMove(__appScope: CanvasInteractionScope) {
  return (point: Point, ctrlKey: boolean, shiftKey: boolean, renderPreview = true) => {
  const { applyNodeTerminalSnap, boundedDeltaForMultiNodeInteractiveMove, boundedDeltaForNodes, canvasBoundsForMovedNodeDelta, computeNodeDragDelta, computeNodeDragPreviewDelta, draggingRef, findMultiNodeDragSnapTargetAtDelta, isMultiNodeMoveState, nodeTerminalSnapTargetRef, updateImperativeNodeDragDropHint, updateMultiNodeDragOverlayTransform, updateSingleNodeDragImperativePreview } = __appScope;
    const currentDrag = draggingRef.current;
    if (!currentDrag) {
      return;
    }
    const previewDelta = computeNodeDragPreviewDelta(currentDrag, point, ctrlKey, shiftKey);
    const boundedDelta =
      renderPreview && !isMultiNodeMoveState(currentDrag)
        ? boundedDeltaForNodes(
            currentDrag.nodeIds,
            currentDrag.originalPositions,
            previewDelta.x,
            previewDelta.y,
            canvasBoundsForMovedNodeDelta(currentDrag.nodeIds, currentDrag.originalPositions, previewDelta.x, previewDelta.y)
          )
        : computeNodeDragDelta(currentDrag, point, ctrlKey, shiftKey);
    const multiNodeMove = isMultiNodeMoveState(currentDrag);
    const multiNodeSnapTarget = multiNodeMove && renderPreview ? findMultiNodeDragSnapTargetAtDelta(currentDrag, boundedDelta) : null;
    const effectiveBoundedDelta = multiNodeSnapTarget
      ? boundedDeltaForMultiNodeInteractiveMove(currentDrag, applyNodeTerminalSnap(boundedDelta, multiNodeSnapTarget))
      : boundedDelta;
    const effectivePreviewDelta = multiNodeSnapTarget
      ? boundedDeltaForMultiNodeInteractiveMove(currentDrag, applyNodeTerminalSnap(previewDelta, multiNodeSnapTarget))
      : previewDelta;
    if (
      currentDrag.historyCaptured &&
      currentDrag.currentDelta?.x === effectiveBoundedDelta.x &&
      currentDrag.currentDelta?.y === effectiveBoundedDelta.y &&
      currentDrag.previewDelta?.x === effectivePreviewDelta.x &&
      currentDrag.previewDelta?.y === effectivePreviewDelta.y
    ) {
      draggingRef.current = currentDrag;
      return;
    }
    if (multiNodeMove) {
      draggingRef.current = {
        ...currentDrag,
        currentDelta: effectiveBoundedDelta,
        previewDelta: effectivePreviewDelta,
        historyCaptured: true
      };
      if (renderPreview) {
        nodeTerminalSnapTargetRef.current = multiNodeSnapTarget;
        updateImperativeNodeDragDropHint(multiNodeSnapTarget);
        updateMultiNodeDragOverlayTransform(effectivePreviewDelta);
      } else {
        nodeTerminalSnapTargetRef.current = null;
        updateImperativeNodeDragDropHint(null);
      }
      return;
    }
    const nextDragState = {
      ...currentDrag,
      currentDelta: boundedDelta,
      previewDelta,
      historyCaptured: true
    };
    draggingRef.current = nextDragState;
    if (!renderPreview) {
      nodeTerminalSnapTargetRef.current = null;
      return;
    }
    updateSingleNodeDragImperativePreview(nextDragState, previewDelta);
  };
}

export function createScheduleNodeDragMove(__appScope: CanvasInteractionScope) {
  return (point: Point, ctrlKey: boolean, shiftKey: boolean) => {
  const { applyNodeDragMove, nodeDragMoveFrameRef, pendingNodeDragMoveRef } = __appScope;
    pendingNodeDragMoveRef.current = { point, ctrlKey, shiftKey };
    if (nodeDragMoveFrameRef.current !== null) {
      return;
    }
    nodeDragMoveFrameRef.current = window.requestAnimationFrame(() => {
      nodeDragMoveFrameRef.current = null;
      const pending = pendingNodeDragMoveRef.current;
      pendingNodeDragMoveRef.current = null;
      if (pending) {
        applyNodeDragMove(pending.point, pending.ctrlKey, pending.shiftKey);
      }
    });
  };
}

export function createFlushPendingNodeDragMove(__appScope: CanvasInteractionScope) {
  return (renderPreview = true) => {
  const { applyNodeDragMove, nodeDragMoveFrameRef, pendingNodeDragMoveRef } = __appScope;
    const pending = pendingNodeDragMoveRef.current;
    if (!pending) {
      return;
    }
    pendingNodeDragMoveRef.current = null;
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
    applyNodeDragMove(pending.point, pending.ctrlKey, pending.shiftKey, renderPreview);
  };
}

export function createClearNodeDragMoveSchedule(__appScope: CanvasInteractionScope) {
  return () => {
  const { nodeDragMoveFrameRef, pendingNodeDragMoveRef } = __appScope;
    pendingNodeDragMoveRef.current = null;
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
  };
}

export function createClearKeyboardMoveCommitSchedule(__appScope: CanvasInteractionScope) {
  return () => {
  const { keyboardMoveCommitCancelRef } = __appScope;
    keyboardMoveCommitCancelRef.current?.();
    keyboardMoveCommitCancelRef.current = null;
  };
}

export function createClearKeyboardNudgeSchedule(__appScope: CanvasInteractionScope) {
  return () => {
  const { keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef, pendingKeyboardMoveDeltaRef } = __appScope;
    pendingKeyboardMoveDeltaRef.current = null;
    keyboardMoveActiveKeyDeltasRef.current.clear();
    keyboardMoveLastFrameTimeRef.current = null;
    keyboardMoveFrameElapsedMsRef.current = 0;
    if (keyboardMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(keyboardMoveFrameRef.current);
      keyboardMoveFrameRef.current = null;
    }
  };
}

export function createClearDraggingMoveState(__appScope: CanvasInteractionScope) {
  return () => {
  const { clearKeyboardMoveCommitSchedule, clearKeyboardNudgeSchedule, clearNodeDragMoveSchedule, dragUndoCapturedRef, draggingRef, hideImperativeMultiNodeDragOverlay, hideImperativeSingleNodeDragPreview, resetMultiNodeDragOverlayTransform, setDragging, updateSmartAlignmentGuides } = __appScope;
    clearNodeDragMoveSchedule();
    clearKeyboardNudgeSchedule();
    clearKeyboardMoveCommitSchedule();
    updateSmartAlignmentGuides([]);
    resetMultiNodeDragOverlayTransform();
    hideImperativeMultiNodeDragOverlay();
    hideImperativeSingleNodeDragPreview();
    draggingRef.current = null;
    setDragging(null);
    dragUndoCapturedRef.current = false;
  };
}

export function createCancelActiveEditInteractions(__appScope: CanvasInteractionScope) {
  return () => {
  const { canvasResizeDraftRef, clearDraggingMoveState, resetConnectPreviewState, setCanvasResizeDraft, setCanvasResizeDrag, setConnectDropReady, setConnectSource, setLibraryPlacement, setManualPathDrag, setMarquee, setMode, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setRewiring, setStaticDrawing, setTerminalPress, setTransformDrag, staticButtonPointerRef } = __appScope;
    clearDraggingMoveState();
    setMode("select");
    setStaticDrawing(null);
    setLibraryPlacement(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setConnectDropReady(false);
    setRewiring(null);
    setTerminalPress(null);
    setNodeLabelDrag(null);
    setNodeLabelRotateDrag(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setCanvasResizeDrag(null);
    canvasResizeDraftRef.current = null;
    setCanvasResizeDraft(null);
    setMarquee(null);
    setModifierSelectionPress(null);
    staticButtonPointerRef.current = null;
  };
}

export function createFinishDraggingMove(__appScope: CanvasInteractionScope) {
  return (
    activeDragging: DraggingState | null,
    snapTarget: NodeTerminalSnapTarget | null,
    actionLabel: "拖拽" | "移动"
  ) => {
  const { adjustEdgesAfterNodeMove, applyCanvasBounds, applyNodeTerminalSnap, boundedDeltaForMoveGeometry, buildMovedNodeUpdates, canvasBoundsForMoveDelta, canvasInteractionRef, clearDraggingMoveState, commitFastMovedGraphPatches, commitSafeDeltaForDraggingState, dragDraggedEdgeIdSet, dragMovedBusNodeIdSet, dragMovedNodeIdSet, ensureDraggingUndoSnapshot, externalMoveCandidateEdges, finalizeMovedNodeEdgesFast, findMultiNodeDragSnapTargetAtDelta, findSingleNodeDragSnapTargetAtDelta, graphStore, internalMoveEdgeIdsForMovedNodes, isMultiNodeMoveState, mergeAdjustedCandidateEdges, mergeNodeUpdateLists, nextNodesForMovedGraphCommit, nodes, projectListPointerInsideRef, restoreCanvasSelectionSnapshotWithInspector, routePreserveEdgeIdsForMovedNodes, shouldFinalizeMovedNodeEdgesSynchronously, synchronousEdgeAdjustmentCandidates, translateInternalMoveCandidateEdges, translateWholeMoveCandidateEdges, writeOperationLog } = __appScope;
    if (!activeDragging) {
      return false;
    }
    const delta = commitSafeDeltaForDraggingState(activeDragging);
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      restoreCanvasSelectionSnapshotWithInspector(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      clearDraggingMoveState();
      return false;
    }
    ensureDraggingUndoSnapshot();
    const dragNodeIds = dragMovedNodeIdSet(activeDragging);
    const dragEdgeIds = dragDraggedEdgeIdSet(activeDragging);
    const dragBusNodeIds = dragMovedBusNodeIdSet(activeDragging);
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
    const wholeLayerMove = activeDragging.wholeLayerMove === true;
    const releaseSnapTarget = snapTarget ?? (
      multiNodeMove
        ? findMultiNodeDragSnapTargetAtDelta(activeDragging, delta)
        : findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)
    );
    const effectiveSnapTarget = releaseSnapTarget;
    const snappedDelta = applyNodeTerminalSnap(delta, effectiveSnapTarget);
    const finalDelta =
      snappedDelta.x !== delta.x || snappedDelta.y !== delta.y
        ? boundedDeltaForMoveGeometry(
            activeDragging.nodeIds,
            activeDragging.edgeIds,
            activeDragging.affectedEdges,
            activeDragging.originalPositions,
            activeDragging.originalEdgePoints,
            activeDragging.originalRoutePoints,
            snappedDelta.x,
            snappedDelta.y,
            delta,
            canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, snappedDelta.x, snappedDelta.y)
          )
        : delta;
    if (finalDelta.x === 0 && finalDelta.y === 0) {
      restoreCanvasSelectionSnapshotWithInspector(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      clearDraggingMoveState();
      return false;
    }
    const finalBounds = canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta.x, finalDelta.y);
    applyCanvasBounds(finalBounds);
    const draggedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
    // 归属落地:本路径无 Alt 语义(altKey 恒 false),判定与容器重算口径同鼠标拖动 ——
    // 非 Alt 落入容器 = 排斥(弹出框外),与 createFinishNodeDrag 同开 repelNonMembers
    const { updates: containerUpdates } = applyDragContainerMembership({
      nodes: withNodeUpdates(nodes, draggedNodeUpdates),
      movedIds: activeDragging.nodeIds,
      grabbedIds: activeDragging.grabbedNodeIds,
      altKey: false,
      repelNonMembers: true
    });
    const movedNodeUpdates = mergeNodeUpdateLists(draggedNodeUpdates, containerUpdates);
    const nextNodes = nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, dragNodeIds);
    const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(
      activeDragging.affectedEdges,
      dragNodeIds,
      dragEdgeIds,
      dragBusNodeIds,
      activeDragging.originalRoutePoints
    );
    const internalMovedEdgeIds = internalMoveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds);
    const externalSynchronousCandidateEdges = externalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds);
    const preserveRouteEdgeIds = synchronousCandidateEdges.length > 0
      ? routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds, dragEdgeIds)
      : new Set<string>();
    const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0
      ? wholeLayerMove
        ? translateWholeMoveCandidateEdges(synchronousCandidateEdges, dragNodeIds, dragEdgeIds, finalDelta)
        : mergeAdjustedCandidateEdges(
            translateInternalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds, finalDelta),
            externalSynchronousCandidateEdges.length > 0
              ? adjustEdgesAfterNodeMove(
                  externalSynchronousCandidateEdges,
                  nextNodes,
                  dragNodeIds,
                  activeDragging.originalEdgePoints,
                  Object.fromEntries(activeDragging.nodeIds.map((id: string) => [id, finalDelta])),
                  activeDragging.originalRoutePoints,
                  preserveRouteEdgeIds,
                  finalBounds
                )
              : externalSynchronousCandidateEdges
          )
      : synchronousCandidateEdges;
    const adjustedAffectedEdges = mergeAdjustedCandidateEdges(activeDragging.affectedEdges, adjustedSynchronousEdges);
    const finalizationCandidateEdges = externalMoveCandidateEdges(adjustedAffectedEdges, internalMovedEdgeIds);
    const terminalFinalizationCandidateEdges =
      internalMovedEdgeIds.size === 0 ? adjustedAffectedEdges : finalizationCandidateEdges;
    const finalizedCandidateEdges = !wholeLayerMove &&
      (internalMovedEdgeIds.size === 0 || finalizationCandidateEdges.length > 0) &&
      shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, terminalFinalizationCandidateEdges)
      ? finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          activeDragging.nodeIds,
          terminalFinalizationCandidateEdges
        )
      : adjustedAffectedEdges;
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      activeDragging.affectedEdges,
      activeDragging.nodeIds,
      activeDragging.originalRoutePoints,
      dragEdgeIds,
      activeDragging.originalPositions,
      nodes,
      finalBounds,
      { wholeLayerMove, moveDelta: finalDelta, internalMovedEdgeIds }
    );
    restoreCanvasSelectionSnapshotWithInspector(activeDragging.selection);
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    clearDraggingMoveState();
    const snapText =
      effectiveSnapTarget &&
      finalDelta.x === snappedDelta.x &&
      finalDelta.y === snappedDelta.y
        ? "，端子已吸附"
        : "";
    writeOperationLog(`${actionLabel} ${activeDragging.nodeIds.length} 个图元 (${Math.round(finalDelta.x)}, ${Math.round(finalDelta.y)})${snapText}`);
    return true;
  };
}

export function createFinishNodeDrag(__appScope: CanvasInteractionScope) {
  // altKey 由指针抬起事件带入(Alt = 双向归属变更键:拖出容器 / 拖入容器)
  return (altKey = false) => {
  const { adjustEdgesAfterNodeMove, applyCanvasBounds, applyNodeTerminalSnap, boundedDeltaForMoveGeometry, buildMovedNodeUpdates, canvasBoundsForMoveDelta, canvasInteractionRef, clearNodeDragMoveSchedule, commitFastMovedGraphPatches, commitSafeDeltaForDraggingState, dragDraggedEdgeIdSet, dragMovedBusNodeIdSet, dragMovedNodeIdSet, dragUndoCapturedRef, draggingRef, ensureDraggingUndoSnapshot, externalMoveCandidateEdges, finalizeMovedNodeEdgesFast, findMultiNodeDragSnapTargetAtDelta, findSingleNodeDragSnapTargetAtDelta, flushPendingNodeDragMove, graphStore, hideImperativeMultiNodeDragOverlay, hideImperativeSingleNodeDragPreview, internalMoveEdgeIdsForMovedNodes, isMultiNodeMoveState, mergeAdjustedCandidateEdges, mergeNodeUpdateLists, nextNodesForMovedGraphCommit, nodeTerminalSnapTargetRef, nodes, normalizeProjectMeasurements, projectListPointerInsideRef, resetMultiNodeDragOverlayTransform, restoreCanvasSelectionSnapshotWithInspector, routePreserveEdgeIdsForMovedNodes, setDragging, setProjectMeasurements, shouldFinalizeMovedNodeEdgesSynchronously, showGlobalMessage, synchronousEdgeAdjustmentCandidates, translateInternalMoveCandidateEdges, translateWholeMoveCandidateEdges, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
    flushPendingNodeDragMove(false);
    const activeDragging = draggingRef.current;
    if (!activeDragging) {
      return;
    }
    const delta = commitSafeDeltaForDraggingState(activeDragging);
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      clearNodeDragMoveSchedule();
      updateSmartAlignmentGuides([]);
      resetMultiNodeDragOverlayTransform();
      hideImperativeMultiNodeDragOverlay();
      hideImperativeSingleNodeDragPreview();
      draggingRef.current = null;
      setDragging(null);
      restoreCanvasSelectionSnapshotWithInspector(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      return;
    }
    ensureDraggingUndoSnapshot();
    const dragNodeIds = dragMovedNodeIdSet(activeDragging);
    const dragEdgeIds = dragDraggedEdgeIdSet(activeDragging);
    const dragBusNodeIds = dragMovedBusNodeIdSet(activeDragging);
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
    const wholeLayerMove = activeDragging.wholeLayerMove === true;
    const releaseSnapTarget = nodeTerminalSnapTargetRef.current ?? (
      multiNodeMove
        ? findMultiNodeDragSnapTargetAtDelta(activeDragging, delta)
        : findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)
    );
    const effectiveSnapTarget = releaseSnapTarget;
    const snappedDelta = applyNodeTerminalSnap(delta, effectiveSnapTarget);
    const finalDelta =
      snappedDelta.x !== delta.x || snappedDelta.y !== delta.y
        ? boundedDeltaForMoveGeometry(
            activeDragging.nodeIds,
            activeDragging.edgeIds,
            activeDragging.affectedEdges,
            activeDragging.originalPositions,
            activeDragging.originalEdgePoints,
            activeDragging.originalRoutePoints,
            snappedDelta.x,
            snappedDelta.y,
            delta,
            canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, snappedDelta.x, snappedDelta.y)
          )
        : delta;
    if (finalDelta.x === 0 && finalDelta.y === 0) {
      clearNodeDragMoveSchedule();
      updateSmartAlignmentGuides([]);
      resetMultiNodeDragOverlayTransform();
      hideImperativeMultiNodeDragOverlay();
      hideImperativeSingleNodeDragPreview();
      draggingRef.current = null;
      setDragging(null);
      restoreCanvasSelectionSnapshotWithInspector(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      return;
    }
    const finalBounds = canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta.x, finalDelta.y);
    applyCanvasBounds(finalBounds);
    const draggedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
    // 归属落地:判定用**拖动后**节点(容器与成员均取新位置,判定点 = 节点中心)——
    // 用拖动前的位置会漏判「拖进容器」,并把容器重算回旧位置
    const { updates: containerUpdates, enterContainerId, exitContainerId } = applyDragContainerMembership({
      nodes: withNodeUpdates(nodes, draggedNodeUpdates),
      movedIds: activeDragging.nodeIds,
      grabbedIds: activeDragging.grabbedNodeIds,
      altKey,
      repelNonMembers: true // 非 Alt 拖进容器 → 弹回框外(Alt 才是双向归属变更键)
    });
    // 归属/容器几何变更并入同一次提交(单一撤销单元:撤销点见前方 ensureDraggingUndoSnapshot)
    const movedNodeUpdates = mergeNodeUpdateLists(draggedNodeUpdates, containerUpdates);
    const nextNodes = nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, dragNodeIds);
    const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(
      activeDragging.affectedEdges,
      dragNodeIds,
      dragEdgeIds,
      dragBusNodeIds,
      activeDragging.originalRoutePoints
    );
    const internalMovedEdgeIds = internalMoveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds);
    const externalSynchronousCandidateEdges = externalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds);
    const preserveRouteEdgeIds = synchronousCandidateEdges.length > 0
      ? routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds, dragEdgeIds)
      : new Set<string>();
    const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0
      ? wholeLayerMove
        ? translateWholeMoveCandidateEdges(synchronousCandidateEdges, dragNodeIds, dragEdgeIds, finalDelta)
        : mergeAdjustedCandidateEdges(
            translateInternalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds, finalDelta),
            externalSynchronousCandidateEdges.length > 0
              ? adjustEdgesAfterNodeMove(
                  externalSynchronousCandidateEdges,
                  nextNodes,
                  dragNodeIds,
                  activeDragging.originalEdgePoints,
                  Object.fromEntries(activeDragging.nodeIds.map((id: string) => [id, finalDelta])),
                  activeDragging.originalRoutePoints,
                  preserveRouteEdgeIds,
                  finalBounds
                )
              : externalSynchronousCandidateEdges
          )
      : synchronousCandidateEdges;
    const adjustedAffectedEdges = mergeAdjustedCandidateEdges(activeDragging.affectedEdges, adjustedSynchronousEdges);
    const finalizationCandidateEdges = externalMoveCandidateEdges(adjustedAffectedEdges, internalMovedEdgeIds);
    const terminalFinalizationCandidateEdges =
      internalMovedEdgeIds.size === 0 ? adjustedAffectedEdges : finalizationCandidateEdges;
    const finalizedCandidateEdges = !wholeLayerMove &&
      (internalMovedEdgeIds.size === 0 || finalizationCandidateEdges.length > 0) &&
      shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, terminalFinalizationCandidateEdges)
      ? finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          activeDragging.nodeIds,
          terminalFinalizationCandidateEdges
        )
      : adjustedAffectedEdges;
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      activeDragging.affectedEdges,
      activeDragging.nodeIds,
      activeDragging.originalRoutePoints,
      dragEdgeIds,
      activeDragging.originalPositions,
      nodes,
      finalBounds,
      { wholeLayerMove, moveDelta: finalDelta, internalMovedEdgeIds }
    );
    // 量测同步:Alt 拖出会解绑原关口容器,容器量测组须随同一归一化出口收敛
    if (containerUpdates.length > 0) {
      setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, nextNodes));
    }
    clearNodeDragMoveSchedule();
    updateSmartAlignmentGuides([]);
    resetMultiNodeDragOverlayTransform();
    hideImperativeMultiNodeDragOverlay();
    hideImperativeSingleNodeDragPreview();
    draggingRef.current = null;
    setDragging(null);
    restoreCanvasSelectionSnapshotWithInspector(activeDragging.selection);
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    dragUndoCapturedRef.current = false;
    const snapText =
      effectiveSnapTarget &&
      finalDelta.x === snappedDelta.x &&
      finalDelta.y === snappedDelta.y
        ? "，端子已吸附"
        : "";
    writeOperationLog(`拖拽 ${activeDragging.nodeIds.length} 个图元 (${Math.round(finalDelta.x)}, ${Math.round(finalDelta.y)})${snapText}`);
    if (enterContainerId) {
      const target = nodes.find((node: ModelNode) => node.id === enterContainerId);
      showGlobalMessage(`已移入容器 ${target?.name ?? ""}`.trim());
    }
    // Alt 移出与移入对称提示:两条都在 altKey=true 下才可能触发(Alt = 双向归属变更键)。
    // 同一次拖动里仍可各弹一次(Alt 拖「成员 + 落在别的容器里的非成员」的混选),写成独立 if 即为此,
    // 不是「同一节点进出各一次」
    if (exitContainerId) {
      const source = nodes.find((node: ModelNode) => node.id === exitContainerId);
      // Alt 拖出的正是原容器绑定的设备 → 该容器已自动解绑 + 关关口,一并提示。
      // globalMessage 单槽(后弹覆盖前弹),故与「已移出容器」合并成一条,不弹两次。
      // 离开者按**拖动前**的归属现算(判定侧用的就是这份原图,见 applyDragContainerMembership)
      const containerIdByNodeId = new Map(nodes.map((node: ModelNode) => [node.id, node.containerId]));
      const leavingIds = activeDragging.nodeIds.filter((id: string) => containerIdByNodeId.get(id) === exitContainerId);
      const unbindNotice = containerGatewayUnbindNotice(nodes, leavingIds, undefined);
      const exitText = `已移出容器 ${source?.name ?? ""}`.trim();
      showGlobalMessage(unbindNotice ? `${exitText}，${unbindNotice}` : exitText);
    }
  };
}

export function createFinishTransformDrag(__appScope: CanvasInteractionScope) {
  return () => {
  const { CANVAS_AUTO_EXPAND_PADDING, applyCanvasBounds, buildGroupTransformEdgeUpdates, buildGroupTransformNodeUpdates, canvasBounds, canvasBoundsForAutoExpandedGraphContent, clampNodePositionToBounds, graphStore, graphStoreApplyPatch, graphStorePatchGraphFromArrays, isGroupTransformDrag, latestGraphStoreRef, markRouteEdgesDirty, markStoredRouteEdgesDirty, mergeNodeUpdateLists, nodeById, overlayEdgeUpdatesForTransform, overlayGraphStoreNodes, rebuildEdgeUpdatesAfterNodeGeometryChange, rebuildEdgesAfterNodeGeometryChange, rebuildRoutableLineNodeUpdatesForChangedNodes, rejectAutoCanvasExpansionForContent, setGraphStore, setTransformDrag, singleTransformNodeUpdate, transformDrag, transformDragChangedRef, writeOperationLog } = __appScope;
    const activeTransform = transformDrag;
    if (!activeTransform) {
      return;
    }
    const shouldReroute = transformDragChangedRef.current || Boolean(activeTransform.historyCaptured);
    transformDragChangedRef.current = false;
    if (shouldReroute) {
      const transformedNodeIds = isGroupTransformDrag(activeTransform) ? activeTransform.nodeIds : [activeTransform.nodeId];
      if (isGroupTransformDrag(activeTransform)) {
        const finalPreviewPoint = activeTransform.previewPoint;
        if (finalPreviewPoint) {
          const currentStore = latestGraphStoreRef.current ?? graphStore;
          let transformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, currentStore, { snapRotation: activeTransform.kind === "rotate" });
          const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, currentStore, { snapRotation: activeTransform.kind === "rotate" });
          const transformedEdges = overlayEdgeUpdatesForTransform(currentStore.edges, transformedEdgeUpdates);
          if (rejectAutoCanvasExpansionForContent(transformedNodeUpdates, transformedEdgeUpdates)) {
            setTransformDrag(null);
            return;
          }
          const transformBounds = canvasBoundsForAutoExpandedGraphContent(
            canvasBounds,
            overlayGraphStoreNodes(currentStore, transformedNodeUpdates),
            transformedEdges,
            [],
            CANVAS_AUTO_EXPAND_PADDING
          );
          applyCanvasBounds(transformBounds);
          transformedNodeUpdates = transformedNodeUpdates.map((node: ModelNode) => ({
            ...node,
            position: clampNodePositionToBounds(node, transformBounds, node.position)
          }));
          setGraphStore((current: GraphStore) => {
            let currentTransformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === "rotate" });
            const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === "rotate" });
            const transformedRouteEdgeIds = new Set(transformedEdgeUpdates.map((edge: Edge) => edge.id));
            const transformedEdges = overlayEdgeUpdatesForTransform(current.edges, transformedEdgeUpdates);
            currentTransformedNodeUpdates = currentTransformedNodeUpdates.map((node: ModelNode) => ({
              ...node,
              position: clampNodePositionToBounds(node, transformBounds, node.position)
            }));
            const nextNodes = overlayGraphStoreNodes(current, currentTransformedNodeUpdates);
            markRouteEdgesDirty(transformedRouteEdgeIds);
            markStoredRouteEdgesDirty(transformedRouteEdgeIds);
            const nextEdges = rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, transformedEdges, transformedRouteEdgeIds);
            const routableLineNodeUpdates = rebuildRoutableLineNodeUpdatesForChangedNodes(
              current.nodes,
              nextNodes,
              transformedNodeIds,
              transformBounds
            );
            const finalNodeUpdates = mergeNodeUpdateLists(currentTransformedNodeUpdates, routableLineNodeUpdates);
            const finalNextNodes = routableLineNodeUpdates.length > 0
              ? overlayGraphStoreNodes(current, finalNodeUpdates)
              : nextNodes;
            // 容器跟随:旋转/缩放只改被变换节点的几何,容器不重算会停在旧矩形(见 refitContainersAfterTransform)。
            // 与变换同批提交 = 单一撤销单元;被变换的容器自身走「只扩不缩」(手动尺寸优先)
            const containerUpdates = refitContainersAfterTransform(finalNextNodes, transformedNodeIds);
            const nodesWithContainers = withNodeUpdates(finalNextNodes, containerUpdates);
            const transformedNodeIdSet = new Set(transformedNodeIds);
            const transformedEdgeIds = Array.from(new Set([
              ...current.edges
              .filter((edge: Edge) => transformedNodeIdSet.has(edge.sourceId) || transformedNodeIdSet.has(edge.targetId))
                .map((edge: Edge) => edge.id),
              ...transformedRouteEdgeIds
            ]));
            return graphStorePatchGraphFromArrays(
              current,
              nodesWithContainers,
              nextEdges,
              [...transformedNodeIds, ...routableLineNodeUpdates.map((node: ModelNode) => node.id), ...containerUpdates.map((node: ModelNode) => node.id)],
              transformedEdgeIds
            );
          });
        }
      } else if (activeTransform.kind === "rotate" && activeTransform.previewPoint) {
        const currentStore = latestGraphStoreRef.current ?? graphStore;
        let singleNodeUpdate = singleTransformNodeUpdate(activeTransform, activeTransform.previewPoint, currentStore, true);
        if (singleNodeUpdate) {
          if (rejectAutoCanvasExpansionForContent([singleNodeUpdate])) {
            setTransformDrag(null);
            return;
          }
          const transformBounds = canvasBoundsForAutoExpandedGraphContent(
            canvasBounds,
            [singleNodeUpdate],
            [],
            [],
            CANVAS_AUTO_EXPAND_PADDING
          );
          applyCanvasBounds(transformBounds);
          singleNodeUpdate = {
            ...singleNodeUpdate,
            position: clampNodePositionToBounds(singleNodeUpdate, transformBounds, singleNodeUpdate.position)
          };
          setGraphStore((current: GraphStore) => {
            if (!activeTransform.previewPoint) {
              return current;
            }
            let currentSingleNodeUpdate = singleTransformNodeUpdate(activeTransform, activeTransform.previewPoint, current, true);
            if (!currentSingleNodeUpdate) {
              return current;
            }
            currentSingleNodeUpdate = {
              ...currentSingleNodeUpdate,
              position: clampNodePositionToBounds(currentSingleNodeUpdate, transformBounds, currentSingleNodeUpdate.position)
            };
            const nextNodes = overlayGraphStoreNodes(current, [currentSingleNodeUpdate]);
            const routableLineNodeUpdates = rebuildRoutableLineNodeUpdatesForChangedNodes(
              current.nodes,
              nextNodes,
              transformedNodeIds,
              transformBounds
            );
            const nodeUpdates = [currentSingleNodeUpdate, ...routableLineNodeUpdates];
            const finalNextNodes = routableLineNodeUpdates.length > 0
              ? overlayGraphStoreNodes(current, nodeUpdates)
              : nextNodes;
            // 容器跟随:成员旋转 → 容器矩形同批重算(见 refitContainersAfterTransform)
            const containerUpdates = refitContainersAfterTransform(finalNextNodes, transformedNodeIds);
            const nodesWithContainers = withNodeUpdates(finalNextNodes, containerUpdates);
            const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nodesWithContainers, transformedNodeIds, current.edges);
            return graphStoreApplyPatch(current, {
              nodeUpdates: [...nodeUpdates, ...containerUpdates],
              edgeUpserts: edgeUpdates
            });
          });
        }
      } else {
        const currentStore = latestGraphStoreRef.current ?? graphStore;
        const currentSingleNode = currentStore.nodeMap.get(activeTransform.nodeId);
        if (currentSingleNode) {
          if (rejectAutoCanvasExpansionForContent([currentSingleNode])) {
            setTransformDrag(null);
            return;
          }
          const transformBounds = canvasBoundsForAutoExpandedGraphContent(
            canvasBounds,
            [currentSingleNode],
            [],
            [],
            CANVAS_AUTO_EXPAND_PADDING
          );
          applyCanvasBounds(transformBounds);
          setGraphStore((current: GraphStore) => {
            const currentNode = current.nodeMap.get(activeTransform.nodeId);
            if (!currentNode) {
              return current;
            }
            const clampedPosition = clampNodePositionToBounds(currentNode, transformBounds, currentNode.position);
            const nodeUpdates =
              clampedPosition.x === currentNode.position.x && clampedPosition.y === currentNode.position.y
                ? []
                : [{ ...currentNode, position: clampedPosition }];
            const nextNodes = nodeUpdates.length > 0 ? overlayGraphStoreNodes(current, nodeUpdates) : current.nodes;
            const routableLineNodeUpdates = rebuildRoutableLineNodeUpdatesForChangedNodes(
              current.nodes,
              nextNodes,
              transformedNodeIds,
              transformBounds
            );
            const finalNodeUpdates = mergeNodeUpdateLists(nodeUpdates, routableLineNodeUpdates);
            const finalNextNodes = routableLineNodeUpdates.length > 0
              ? overlayGraphStoreNodes(current, finalNodeUpdates)
              : nextNodes;
            // 容器跟随:成员缩放 → 容器矩形同批重算(见 refitContainersAfterTransform)
            const containerUpdates = refitContainersAfterTransform(finalNextNodes, transformedNodeIds);
            const nodesWithContainers = withNodeUpdates(finalNextNodes, containerUpdates);
            const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nodesWithContainers, transformedNodeIds, current.edges);
            return graphStoreApplyPatch(current, {
              nodeUpdates: [...finalNodeUpdates, ...containerUpdates],
              edgeUpserts: edgeUpdates
            });
          });
        }
      }
      const transformedNode = isGroupTransformDrag(activeTransform) ? null : nodeById.get(activeTransform.nodeId);
      writeOperationLog(
        isGroupTransformDrag(activeTransform)
          ? `调整组合几何：${transformedNodeIds.length} 个图元`
          : `调整图元几何：${transformedNode?.name ?? activeTransform.nodeId}`
      );
    }
    setTransformDrag(null);
  };
}

export function createFinishKeyboardMove(__appScope: CanvasInteractionScope) {
  return () => {
  const { clearKeyboardMoveCommitSchedule, dragging, draggingRef, finishDraggingMove, flushPendingKeyboardMove, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef, nodeTerminalSnapTargetRef } = __appScope;
    clearKeyboardMoveCommitSchedule();
    keyboardMoveActiveKeyDeltasRef.current.clear();
    keyboardMoveLastFrameTimeRef.current = null;
    keyboardMoveFrameElapsedMsRef.current = 0;
    flushPendingKeyboardMove(false);
    if (keyboardMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(keyboardMoveFrameRef.current);
      keyboardMoveFrameRef.current = null;
    }
    const activeDragging = draggingRef.current ?? dragging;
    if (activeDragging?.source !== "keyboard") {
      return;
    }
    finishDraggingMove(activeDragging, nodeTerminalSnapTargetRef.current, "移动");
  };
}

export function createScheduleKeyboardMoveCommit(__appScope: CanvasInteractionScope) {
  return () => {
  const { KEYBOARD_MOVE_COMMIT_DELAY_MS, clearKeyboardMoveCommitSchedule, finishKeyboardMove, keyboardMoveCommitCancelRef, scheduleIdleWork } = __appScope;
    clearKeyboardMoveCommitSchedule();
    keyboardMoveCommitCancelRef.current = scheduleIdleWork(() => {
      keyboardMoveCommitCancelRef.current = null;
      finishKeyboardMove();
    }, KEYBOARD_MOVE_COMMIT_DELAY_MS, 1200);
  };
}

export function createApplyKeyboardMoveDelta(__appScope: CanvasInteractionScope) {
  return (requestedDelta: Point, renderPreview = true, logBoundary = true) => {
  const { applyNodeTerminalSnap, boundedDeltaForMoveGeometry, boundedDeltaForMultiNodeInteractiveMove, boundedDeltaForNodes, canvasBounds, canvasBoundsForMoveDelta, draggingRef, findMultiNodeDragSnapTargetAtDelta, isMultiNodeMoveState, keyboardMoveActiveKeyDeltasRef, nodeTerminalSnapTargetRef, scheduleKeyboardMoveCommit, setDragging, singleNodeDragRenderState, updateImperativeNodeDragDropHint, updateMultiNodeDragOverlayTransform, updateSingleNodeDragImperativePreview, writeOperationLog } = __appScope;
    const activeDragging = draggingRef.current;
    if (activeDragging?.source !== "keyboard") {
      return false;
    }
    const previousDelta = activeDragging.currentDelta ?? { x: 0, y: 0 };
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
    const expandedBounds = multiNodeMove
      ? canvasBounds
      : canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, requestedDelta.x, requestedDelta.y);
    const boundedDelta = multiNodeMove
      ? boundedDeltaForMultiNodeInteractiveMove(activeDragging, requestedDelta)
      : renderPreview
        ? boundedDeltaForNodes(
            activeDragging.nodeIds,
            activeDragging.originalPositions,
            requestedDelta.x,
            requestedDelta.y,
            expandedBounds
          )
        : boundedDeltaForMoveGeometry(
            activeDragging.nodeIds,
            activeDragging.edgeIds,
            activeDragging.affectedEdges,
            activeDragging.originalPositions,
            activeDragging.originalEdgePoints,
            activeDragging.originalRoutePoints,
            requestedDelta.x,
            requestedDelta.y,
            previousDelta,
            expandedBounds
          );
    const multiNodeSnapTarget = multiNodeMove && renderPreview ? findMultiNodeDragSnapTargetAtDelta(activeDragging, boundedDelta) : null;
    const effectiveBoundedDelta = multiNodeSnapTarget
      ? boundedDeltaForMultiNodeInteractiveMove(activeDragging, applyNodeTerminalSnap(boundedDelta, multiNodeSnapTarget))
      : boundedDelta;
    if (effectiveBoundedDelta.x === previousDelta.x && effectiveBoundedDelta.y === previousDelta.y) {
      if (logBoundary) {
        writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      }
      return false;
    }
    const nextDragging = {
      ...activeDragging,
      currentDelta: effectiveBoundedDelta,
      historyCaptured: true
    };
    if (multiNodeMove) {
      draggingRef.current = nextDragging;
      if (renderPreview) {
        nodeTerminalSnapTargetRef.current = multiNodeSnapTarget;
        updateImperativeNodeDragDropHint(multiNodeSnapTarget);
        updateMultiNodeDragOverlayTransform(effectiveBoundedDelta);
      } else {
        nodeTerminalSnapTargetRef.current = null;
        updateImperativeNodeDragDropHint(null);
      }
      return true;
    }
    draggingRef.current = nextDragging;
    if (renderPreview) {
      updateSingleNodeDragImperativePreview(nextDragging, boundedDelta);
      if (!activeDragging.historyCaptured) {
        setDragging(singleNodeDragRenderState(nextDragging));
      }
      if (keyboardMoveActiveKeyDeltasRef.current.size === 0) {
        scheduleKeyboardMoveCommit();
      }
    }
    return true;
  };
}

export function createFlushPendingKeyboardMove(__appScope: CanvasInteractionScope) {
  return (renderPreview = true) => {
  const { applyKeyboardMoveDelta, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameRef, pendingKeyboardMoveDeltaRef } = __appScope;
    const pendingDelta = pendingKeyboardMoveDeltaRef.current;
    if (!pendingDelta) {
      return false;
    }
    pendingKeyboardMoveDeltaRef.current = null;
    if (keyboardMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(keyboardMoveFrameRef.current);
      keyboardMoveFrameRef.current = null;
    }
    return applyKeyboardMoveDelta(pendingDelta, renderPreview, keyboardMoveActiveKeyDeltasRef.current.size === 0);
  };
}

export function createKeyboardMoveActiveFrameDelta(__appScope: CanvasInteractionScope) {
  return (elapsedMs: number) => {
  const { KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND, keyboardMoveActiveKeyDeltasRef } = __appScope;
    if (elapsedMs <= 0 || keyboardMoveActiveKeyDeltasRef.current.size === 0) {
      return null;
    }
    let dx = 0;
    let dy = 0;
    for (const delta of keyboardMoveActiveKeyDeltasRef.current.values()) {
      dx += delta.x;
      dy += delta.y;
    }
    if (dx === 0 && dy === 0) {
      return null;
    }
    const multiplier = (elapsedMs / 1000) * KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND;
    return { x: dx * multiplier, y: dy * multiplier };
  };
}

export function createAppendPendingKeyboardMoveDelta(__appScope: CanvasInteractionScope) {
  return (delta: Point) => {
  const { draggingRef, pendingKeyboardMoveDeltaRef } = __appScope;
    if (delta.x === 0 && delta.y === 0) {
      return;
    }
    const baseDelta = pendingKeyboardMoveDeltaRef.current ?? draggingRef.current?.currentDelta ?? { x: 0, y: 0 };
    pendingKeyboardMoveDeltaRef.current = { x: baseDelta.x + delta.x, y: baseDelta.y + delta.y };
  };
}

export function createScheduleKeyboardNudgeFrame(__appScope: CanvasInteractionScope) {
  return () => {
  const { KEYBOARD_MOVE_FRAME_INTERVAL_MS, appendPendingKeyboardMoveDelta, flushPendingKeyboardMove, keyboardMoveActiveFrameDelta, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef, scheduleKeyboardNudgeFrame } = __appScope;
    if (keyboardMoveFrameRef.current !== null) {
      return;
    }
    keyboardMoveFrameRef.current = window.requestAnimationFrame((timestamp) => {
      keyboardMoveFrameRef.current = null;
      const previousTimestamp = keyboardMoveLastFrameTimeRef.current;
      keyboardMoveLastFrameTimeRef.current = timestamp;
      const elapsedMs = previousTimestamp === null ? 0 : Math.min(50, timestamp - previousTimestamp);
      if (elapsedMs > 0) {
        keyboardMoveFrameElapsedMsRef.current += elapsedMs;
      }
      if (keyboardMoveFrameElapsedMsRef.current >= KEYBOARD_MOVE_FRAME_INTERVAL_MS) {
        const elapsedToApply = keyboardMoveFrameElapsedMsRef.current;
        keyboardMoveFrameElapsedMsRef.current = 0;
        const frameDelta = keyboardMoveActiveFrameDelta(elapsedToApply);
        if (frameDelta) {
          appendPendingKeyboardMoveDelta(frameDelta);
        }
      }
      flushPendingKeyboardMove(true);
      if (keyboardMoveActiveKeyDeltasRef.current.size > 0) {
        scheduleKeyboardNudgeFrame();
      }
    });
  };
}

export function createReleaseKeyboardMoveKey(__appScope: CanvasInteractionScope) {
  return (key: string) => {
  const { draggingRef, flushPendingKeyboardMove, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveLastFrameTimeRef, scheduleKeyboardMoveCommit } = __appScope;
    keyboardMoveActiveKeyDeltasRef.current.delete(key);
    if (keyboardMoveActiveKeyDeltasRef.current.size === 0) {
      keyboardMoveLastFrameTimeRef.current = null;
      keyboardMoveFrameElapsedMsRef.current = 0;
      flushPendingKeyboardMove(true);
      if (draggingRef.current?.source === "keyboard") {
        scheduleKeyboardMoveCommit();
      }
    }
  };
}

export function createStartKeyboardMoveSession(__appScope: CanvasInteractionScope) {
  return (renderInitial = true) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clearNodeDragMoveSchedule, currentCanvasSelectionSnapshot, displaySelectedEdgeIds, displaySelectedNodeIds, dragUndoCapturedRef, dragging, draggingRef, edgeListForNodeIds, isMultiNodeMoveState, isWholeActiveLayerMove, movableCanvasNodeIds, nodeById, nodes, routePointsSnapshotForMove, snapshotRouteBounds, startDraggingState } = __appScope;
    const rawMoveNodeIds = canvasSelectionScope === "direct" ? displaySelectedNodeIds : activeSelectedNodeIds;
    // 拖容器 = 整组(键盘方向键与鼠标拖动同口径)
    const moveNodeIds = movableCanvasNodeIds(containerDragGroup(nodes, rawMoveNodeIds));
    const moveEdgeIds = canvasSelectionScope === "direct" ? displaySelectedEdgeIds : activeSelectedEdgeIds;
    if (moveNodeIds.length === 0) {
      return null;
    }
    const activeDragging = draggingRef.current ?? dragging;
    if (activeDragging?.source === "keyboard") {
      return activeDragging;
    }
    if (activeDragging) {
      return null;
    }
    const affectedEdgesForMove = edgeListForNodeIds(moveNodeIds, moveEdgeIds);
    const wholeLayerMove = isWholeActiveLayerMove(moveNodeIds);
    const originalPositionsForMove = Object.fromEntries(
      moveNodeIds.flatMap((id: string) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForMove = routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds);
    const nextDragging: DraggingState = {
      source: "keyboard",
      nodeIds: moveNodeIds,
      grabbedNodeIds: rawMoveNodeIds,
      edgeIds: moveEdgeIds,
      affectedEdges: affectedEdgesForMove,
      wholeLayerMove,
      startPoint: { x: 0, y: 0 },
      originalPositions: originalPositionsForMove,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForMove.map((edge: Edge) => [
          edge.id,
          {
            ...cloneEdgeEditablePoints(edge),
            routePoints: edge.routePoints?.map((point: Point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForMove,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForMove),
      singleNodeDragCache: buildSingleNodeDragCache(moveNodeIds, moveEdgeIds, affectedEdgesForMove),
      overlayPreview: isMultiNodeMoveState({ nodeIds: moveNodeIds })
        ? buildMultiNodeDragOverlayPreview(moveNodeIds, affectedEdgesForMove, originalPositionsForMove, originalRoutePointsForMove, moveEdgeIds)
        : undefined,
      selection: currentCanvasSelectionSnapshot()
    };
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    if (renderInitial || isMultiNodeMoveState(nextDragging)) {
      startDraggingState(nextDragging);
    } else {
      draggingRef.current = nextDragging;
    }
    return nextDragging;
  };
}

export function createNudgeSelectionByKeyboard(__appScope: CanvasInteractionScope) {
  return (key: string, dx: number, dy: number, repeated = false) => {
  const { appendPendingKeyboardMoveDelta, clearKeyboardMoveCommitSchedule, draggingRef, flushPendingKeyboardMove, keyboardMoveActiveKeyDeltasRef, keyboardMoveLastFrameTimeRef, moveSelection, scheduleKeyboardNudgeFrame, startKeyboardMoveSession } = __appScope;
    clearKeyboardMoveCommitSchedule();
    const wasActive = keyboardMoveActiveKeyDeltasRef.current.has(key);
    if (!repeated && !wasActive && !draggingRef.current) {
      moveSelection(dx, dy);
      return;
    }
    const activeDragging = startKeyboardMoveSession(false);
    if (!activeDragging) {
      return;
    }
    keyboardMoveActiveKeyDeltasRef.current.set(key, { x: dx, y: dy });
    if (!wasActive && !repeated) {
      appendPendingKeyboardMoveDelta({ x: dx, y: dy });
      flushPendingKeyboardMove(true);
    }
    if (keyboardMoveLastFrameTimeRef.current === null) {
      keyboardMoveLastFrameTimeRef.current = performance.now();
    }
    scheduleKeyboardNudgeFrame();
  };
}

export function createMoveSelection(__appScope: CanvasInteractionScope) {
  return (dx: number, dy: number) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, adjustEdgesAfterNodeMove, applyCanvasBounds, boundedDeltaForMoveGeometry, boundedDeltaForNodes, buildMovedNodeUpdates, busNodeIdSet, canvasBoundsForMoveDelta, canvasSelectionScope, commitFastMovedGraphPatches, displaySelectedEdgeIds, displaySelectedNodeIds, edgeListForNodeIds, externalMoveCandidateEdges, finalizeMovedNodeEdgesFast, graphStore, internalMoveEdgeIdsForMovedNodes, isWholeActiveLayerMove, mergeAdjustedCandidateEdges, mergeNodeUpdateLists, movableCanvasNodeIds, nextNodesForMovedGraphCommit, nodeById, nodes, pushUndoSnapshot, routePointsSnapshotForMove, routePreserveEdgeIdsForMovedNodes, shouldFinalizeMovedNodeEdgesSynchronously, snapshotEdgePoints, synchronousEdgeAdjustmentCandidates, translateInternalMoveCandidateEdges, translateWholeMoveCandidateEdges, undoScopeForGraphPatch, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
    const rawMoveNodeIds = canvasSelectionScope === "direct" ? displaySelectedNodeIds : activeSelectedNodeIds;
    // 拖容器 = 整组(与鼠标拖动/键盘按住的方向键同口径)
    const moveNodeIds = movableCanvasNodeIds(containerDragGroup(nodes, rawMoveNodeIds));
    const moveEdgeIds = canvasSelectionScope === "direct" ? displaySelectedEdgeIds : activeSelectedEdgeIds;
    if (moveNodeIds.length === 0) {
      return;
    }
    const originalPositions = Object.fromEntries(
      moveNodeIds.flatMap((id: string) => {
        const node = nodeById.get(id);
        return node ? [[id, node.position]] : [];
      })
    );
    const affectedEdgesForMove = edgeListForNodeIds(moveNodeIds, moveEdgeIds);
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForMove);
    const originalRoutePoints = routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds);
    const wholeLayerMove = isWholeActiveLayerMove(moveNodeIds);
    const movementDelta = { x: dx, y: dy };
    const expandedBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, movementDelta.x, movementDelta.y);
    const boundedDelta = moveNodeIds.length > 1
      ? boundedDeltaForNodes(
          moveNodeIds,
          originalPositions,
          movementDelta.x,
          movementDelta.y,
          expandedBounds
        )
      : boundedDeltaForMoveGeometry(
          moveNodeIds,
          moveEdgeIds,
          affectedEdgesForMove,
          originalPositions,
          originalEdgePoints,
          originalRoutePoints,
          movementDelta.x,
          movementDelta.y,
          undefined,
          expandedBounds
        );
    if (boundedDelta.x === 0 && boundedDelta.y === 0) {
      writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      return;
    }
    // 有容器时撤销作用域让位(容器几何/归属/解绑/挤出在拖动集之外),见 ensureDraggingUndoSnapshot
    const moveUndoScope = hasContainer(nodes)
      ? undefined
      : undoScopeForGraphPatch(moveNodeIds, affectedEdgesForMove.map((edge: Edge) => edge.id));
    pushUndoSnapshot(true, false, moveUndoScope, "移动设备", moveNodeIds.length === 1 ? nodeById.get(moveNodeIds[0])?.name || "" : "");
    const finalBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, boundedDelta.x, boundedDelta.y);
    applyCanvasBounds(finalBounds);
    const deltasByNode = Object.fromEntries(moveNodeIds.map((id: string) => [id, boundedDelta]));
    const selected = new Set(moveNodeIds);
    const draggedNodeUpdates = buildMovedNodeUpdates(moveNodeIds, originalPositions, boundedDelta, finalBounds);
    // 归属落地:单次方向键同源接入(判定只看抓取集;本路径无 Alt,故非成员落入容器一律排斥弹出)
    const { updates: containerUpdates } = applyDragContainerMembership({
      nodes: withNodeUpdates(nodes, draggedNodeUpdates),
      movedIds: moveNodeIds,
      grabbedIds: rawMoveNodeIds,
      altKey: false,
      repelNonMembers: true
    });
    const movedNodeUpdates = mergeNodeUpdateLists(draggedNodeUpdates, containerUpdates);
    const nextNodes = nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, selected);
    const multiNodeMove = moveNodeIds.length > 1;
    const selectedMoveEdgeIds = new Set(moveEdgeIds);
    const movedBusNodeIds = new Set(moveNodeIds.filter((nodeId: string) => busNodeIdSet.has(nodeId)));
    const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(
      affectedEdgesForMove,
      selected,
      selectedMoveEdgeIds,
      movedBusNodeIds,
      originalRoutePoints
    );
    const internalMovedEdgeIds = internalMoveEdgeIdsForMovedNodes(affectedEdgesForMove, selected);
    const externalSynchronousCandidateEdges = externalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds);
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(affectedEdgesForMove, selected, selectedMoveEdgeIds);
    const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0
      ? wholeLayerMove
        ? translateWholeMoveCandidateEdges(synchronousCandidateEdges, selected, selectedMoveEdgeIds, boundedDelta)
        : mergeAdjustedCandidateEdges(
            translateInternalMoveCandidateEdges(synchronousCandidateEdges, internalMovedEdgeIds, boundedDelta),
            externalSynchronousCandidateEdges.length > 0
              ? adjustEdgesAfterNodeMove(
                  externalSynchronousCandidateEdges,
                  nextNodes,
                  selected,
                  originalEdgePoints,
                  deltasByNode,
                  originalRoutePoints,
                  preserveRouteEdgeIds,
                  finalBounds
                )
              : externalSynchronousCandidateEdges
          )
      : synchronousCandidateEdges;
    const adjustedAffectedEdges = mergeAdjustedCandidateEdges(affectedEdgesForMove, adjustedSynchronousEdges);
    const finalizationCandidateEdges = externalMoveCandidateEdges(adjustedAffectedEdges, internalMovedEdgeIds);
    const terminalFinalizationCandidateEdges =
      internalMovedEdgeIds.size === 0 ? adjustedAffectedEdges : finalizationCandidateEdges;
    const finalizedCandidateEdges = !wholeLayerMove &&
      (internalMovedEdgeIds.size === 0 || finalizationCandidateEdges.length > 0) &&
      shouldFinalizeMovedNodeEdgesSynchronously(moveNodeIds, terminalFinalizationCandidateEdges)
      ? finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          moveNodeIds,
          terminalFinalizationCandidateEdges
        )
      : adjustedAffectedEdges;
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      affectedEdgesForMove,
      moveNodeIds,
      originalRoutePoints,
      selectedMoveEdgeIds,
      originalPositions,
      nodes,
      finalBounds,
      { wholeLayerMove, moveDelta: boundedDelta, internalMovedEdgeIds }
    );
    updateSmartAlignmentGuides([]);
    writeOperationLog(`移动 ${moveNodeIds.length} 个图元 (${Math.round(boundedDelta.x)}, ${Math.round(boundedDelta.y)})`);
  };
}

export function createUndoScopeForNodeFootprintPatch(__appScope: CanvasInteractionScope) {
  return (nodeId: string, nextNode: ModelNode | undefined): UndoGraphPatchScope => {
  const { edgeListForNodeIds, graphStore, localRouteOptimizationCandidateEdges, nodes, overlayGraphStoreNodes, undoScopeForGraphPatch } = __appScope;
    const directCandidateEdges = edgeListForNodeIds([nodeId]);
    if (!nextNode) {
      return undoScopeForGraphPatch([nodeId], directCandidateEdges.map((edge: Edge) => edge.id));
    }
    const nextNodesForScope = overlayGraphStoreNodes(graphStore, [nextNode]);
    const candidateEdges = localRouteOptimizationCandidateEdges(
      nodes,
      nextNodesForScope,
      [nodeId],
      new Set<string>(),
      undefined,
      directCandidateEdges
    );
    return undoScopeForGraphPatch([nodeId], candidateEdges.map((edge: Edge) => edge.id));
  };
}

export function createUpdateSelectedNode(__appScope: CanvasInteractionScope) {
  return (patch: Partial<ModelNode>) => {
  const { CANVAS_AUTO_EXPAND_PADDING, adjustEdgesAfterNodeMove, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, clampNodePositionToExpandableBounds, commitFastMovedGraphPatches, currentStoredRoutePointsForEdge, edgeListForNodeIds, expandCanvasToFitGraph, finalizeMovedNodeEdgesFast, focusedGroupedNodeMovesGroup, graphStore, graphStoreApplyPatch, mergeNodeUpdateLists, moveSelection, nodeById, nodes, overlayGraphStoreNodes, patchGraphNodes, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, rebuildRoutableLineNodeUpdatesForChangedNodes, rejectAutoCanvasExpansionForContent, selectedNode, selectedNodeId, setGraphStore, snapshotEdgePoints, undoScopeForGraphPatch } = __appScope;
    if (!selectedNodeId) {
      return;
    }
    if (patch.position && focusedGroupedNodeMovesGroup && selectedNode) {
      const nextPosition = { x: patch.position.x, y: patch.position.y };
      if (nextPosition.x === selectedNode.position.x && nextPosition.y === selectedNode.position.y) {
        return;
      }
      moveSelection(nextPosition.x - selectedNode.position.x, nextPosition.y - selectedNode.position.y);
      return;
    }
    const nextPatch = { ...patch };
    const geometryPatch =
      patch.rotation !== undefined ||
      patch.scale !== undefined ||
      patch.scaleX !== undefined ||
      patch.scaleY !== undefined ||
      patch.size !== undefined;
    const currentSelectedNode = nodeById.get(selectedNodeId);
    if (!currentSelectedNode) {
      return;
    }
    const changesCanvasFootprint = Boolean(patch.position) || geometryPatch;
    let selectedNodeCanvasBounds = canvasBounds;
    const footprintSourceNode = selectedNode ?? currentSelectedNode;
    if (footprintSourceNode) {
      if (changesCanvasFootprint) {
        const requestedPosition = nextPatch.position
          ? { x: nextPatch.position.x, y: nextPatch.position.y }
          : footprintSourceNode.position;
        const candidateNode = { ...footprintSourceNode, ...nextPatch, position: requestedPosition };
        if (rejectAutoCanvasExpansionForContent([candidateNode])) {
          return;
        }
        selectedNodeCanvasBounds = canvasBoundsForAutoExpandedGraphContent(canvasBounds, [candidateNode], [], [], CANVAS_AUTO_EXPAND_PADDING);
        applyCanvasBounds(selectedNodeCanvasBounds);
        nextPatch.position = clampNodePositionToExpandableBounds(candidateNode, selectedNodeCanvasBounds, requestedPosition);
      }
    }
    if (changesCanvasFootprint) {
      const footprintEdges = edgeListForNodeIds([selectedNodeId]);
      // 有容器时作用域必须让位:容器收尾(矩形重算 / 挤出非成员 / 被 re-fit 的其它容器)全在选中节点之外,
      // 一旦走 patch 通道这些节点就落在撤销计划外(Ctrl+Z 后残留新几何)。undefined = 全量对比分支,
      // 正确性无损,只多一趟 O(n) 比较(与拖动 / 剪切 / 删除三处先例同款,见 createEnsureDraggingUndoSnapshot)。
      const undoScope = hasContainer(nodes)
        ? undefined
        : undoScopeForGraphPatch([selectedNodeId], footprintEdges.map((edge: Edge) => edge.id));
      pushUndoSnapshot(true, false, undoScope, "移动设备", (() => { const n = nodeById.get(selectedNodeId); return n ? `${n.params?.idx || n.id} ${n.name ?? ""}`.trim() : ""; })());
    } else {
      pushNodeOnlyUndoSnapshot(selectedNodeId, "移动设备");
    }
    // 交流容器:面板「横向/纵向倍率」(以及任何经此出口的 scale 写入)在落图前折算进 size ——
    // 容器几何恒在 size/position(见 foldContainerScaleIntoSize),否则渲染矩形 = size × |scale|
    // 又和 eject/入组用的 size 矩形分叉
    const patchedNode = { ...currentSelectedNode, ...nextPatch };
    let nextSelectedNode = isContainerNode(currentSelectedNode) ? foldContainerScaleIntoSize(patchedNode) : patchedNode;
    // 面板「倍率」行是容器的尺寸入口(不像拖角那样自带下限):与拖角 resize 同口径补两道钳制 ——
    // ① 下限 = 成员视觉包围盒 + 内侧留白(见 containerResizeMinSize);② 中心平移保完全包裹成员。
    // 只对**尺寸类** patch 生效:坐标行是「面板改坐标是否等同拖动容器」待裁决的 followup,不得被静默改写。
    const sizePatch =
      patch.scale !== undefined || patch.scaleX !== undefined || patch.scaleY !== undefined || patch.size !== undefined;
    if (sizePatch && isContainerNode(nextSelectedNode)) {
      // 放大后圈进的非成员由下方 enforce 收尾挤出。
      const members = containerMemberNodes(graphStore.nodes, nextSelectedNode.id);
      const minSize = containerResizeMinSize(currentSelectedNode, members);
      const size = {
        width: Math.max(nextSelectedNode.size.width, minSize.width),
        height: Math.max(nextSelectedNode.size.height, minSize.height)
      };
      nextSelectedNode = { ...nextSelectedNode, size, position: clampContainerCenterToMembers(nextSelectedNode.position, size, members) };
    }
    const nextNodes = overlayGraphStoreNodes(graphStore, [nextSelectedNode]);
    if (patch.position && selectedNode) {
      const delta = {
        x: nextPatch.position!.x - selectedNode.position.x,
        y: nextPatch.position!.y - selectedNode.position.y
      };
      const affectedEdgesForMove = edgeListForNodeIds([selectedNodeId]);
      const originalPositions = { [selectedNodeId]: selectedNode.position };
      const originalEdgePoints = snapshotEdgePoints(affectedEdgesForMove);
      const originalRoutePoints = Object.fromEntries(
        affectedEdgesForMove.map((edge: Edge) => [
          edge.id,
          currentStoredRoutePointsForEdge(edge)
        ])
      );
      const adjustedAffectedEdges = adjustEdgesAfterNodeMove(
        affectedEdgesForMove,
        nextNodes,
        new Set([selectedNodeId]),
        originalEdgePoints,
        {
          [selectedNodeId]: delta
        },
        originalRoutePoints,
        new Set<string>(),
        selectedNodeCanvasBounds
      );
      const finalizedCandidateEdges = finalizeMovedNodeEdgesFast(
        nodes,
        nextNodes,
        adjustedAffectedEdges,
        [selectedNodeId],
        adjustedAffectedEdges
      );
      commitFastMovedGraphPatches(
        nextSelectedNode ? [nextSelectedNode] : [],
        nextNodes,
        finalizedCandidateEdges,
        affectedEdgesForMove,
        [selectedNodeId],
        originalRoutePoints,
        new Set<string>(),
        originalPositions,
        nodes,
        selectedNodeCanvasBounds
      );
      return;
    }
    if (geometryPatch) {
      const routableLineNodeUpdates = rebuildRoutableLineNodeUpdatesForChangedNodes(
        nodes,
        nextNodes,
        [selectedNodeId],
        selectedNodeCanvasBounds
      );
      const nodeUpdates = mergeNodeUpdateLists(nextSelectedNode ? [nextSelectedNode] : [], routableLineNodeUpdates);
      const finalNextNodes = routableLineNodeUpdates.length > 0
        ? overlayGraphStoreNodes(graphStore, nodeUpdates)
        : nextNodes;
      // 容器收尾(与变换句柄 / 拖角 resize 同一出口):本次几何变更后重算容器矩形并**挤出**非成员。
      // 选中的是容器时走 preserveSizeIds「只扩不缩」—— 面板给的尺寸不被成员包围盒打回。
      const containerUpdates = refitContainersAfterTransform(finalNextNodes, [selectedNodeId]);
      const nodesWithContainers = withNodeUpdates(finalNextNodes, containerUpdates);
      const finalUpdates = mergeNodeUpdateLists(nodeUpdates, containerUpdates);
      const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nodesWithContainers, [selectedNodeId]);
      expandCanvasToFitGraph(finalUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, selectedNodeCanvasBounds);
      setGraphStore((current: GraphStore) =>
        graphStoreApplyPatch(current, {
          nodeUpdates: finalUpdates,
          edgeUpserts: edgeUpdates
        })
      );
      return;
    }
    patchGraphNodes([nextSelectedNode]);
  };
}

export function createCommitNodeFootprintUpdates(__appScope: CanvasInteractionScope) {
  return (
    nodeUpdates: ModelNode[],
    options: { previousNodes?: ModelNode[] } = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, allowAutoExpandCanvas, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsWithOriginShift, edgeListForNodeIds, edgePatchFromCandidateEdges, edges, expandCanvasToFitGraph, graphStore, graphStoreApplyPatch, graphStoreSetGraph, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, mergeNodeUpdateLists, nodeById, nodes, optimizeMovedNodeEdgeRoutes, overlayGraphStoreNodes, rebuildRoutableLineNodeUpdatesForChangedNodes, rejectAutoCanvasExpansionForContent, routePointsForMovedNodeBlockers, setGraphStore, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy } = __appScope;
    const existingUpdates = nodeUpdates.filter((node) => nodeById.has(node.id));
    if (existingUpdates.length === 0) {
      return;
    }
    const changedNodeIds = Array.from(new Set(existingUpdates.map((node) => node.id)));
    const previousNodes = options.previousNodes ?? nodes;
    const nextNodes = overlayGraphStoreNodes(graphStore, existingUpdates);
    const directCandidateEdges = edgeListForNodeIds(changedNodeIds);
    if (rejectAutoCanvasExpansionForContent(existingUpdates, directCandidateEdges)) {
      return;
    }
    const originShift = allowAutoExpandCanvas ? leftTopCanvasOriginShiftForContent(existingUpdates, directCandidateEdges) : { x: 0, y: 0 };
    if (hasCanvasOriginShift(originShift)) {
      const shiftedNodes = nextNodes.map((node: ModelNode) => translateNodeBy(node, originShift));
      const shiftedEdges = edges.map((edge: Edge) => translateEdgeBy(edge, originShift));
      const shiftedBounds = canvasBoundsForGraphContent(
        canvasBoundsWithOriginShift(canvasBounds, originShift),
        shiftedNodes,
        shiftedEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(shiftedBounds, originShift);
      shiftCachedRoutesForCanvasOrigin(originShift);
      const shiftedEdgeIds = shiftedEdges.map((edge: Edge) => edge.id);
      markRouteEdgesDirty(shiftedEdgeIds);
      markStoredRouteEdgesDirty(shiftedEdgeIds);
      markBusTerminalSyncDirtyForEdges(shiftedEdges);
      setGraphStore((current: GraphStore) => graphStoreSetGraph(current, shiftedNodes, shiftedEdges));
      return;
    }
    const footprintCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBounds,
      existingUpdates,
      directCandidateEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    const candidateEdges = localRouteOptimizationCandidateEdges(
      previousNodes,
      nextNodes,
      changedNodeIds,
      new Set<string>(),
      undefined,
      directCandidateEdges
    );
    const optimizationEdges = localRouteOptimizationEdges(
      previousNodes,
      nextNodes,
      candidateEdges,
      changedNodeIds,
      new Set<string>(),
      undefined
    );
    const blockedRoutePoints = routePointsForMovedNodeBlockers(nextNodes, optimizationEdges, changedNodeIds, {});
    const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));
    const optimizedEdges = blockedEdgeIds.size > 0
      ? optimizeMovedNodeEdgeRoutes(
          nextNodes,
          optimizationEdges,
          changedNodeIds,
          {},
          new Set<string>(),
          blockedRoutePoints,
          blockedEdgeIds,
          optimizationEdges
        ).edges
      : optimizationEdges;
    const edgeUpdates = optimizedEdges === optimizationEdges
      ? []
      : edgePatchFromCandidateEdges(optimizationEdges, optimizedEdges).edgeUpserts;
    const routableLineNodeUpdates = rebuildRoutableLineNodeUpdatesForChangedNodes(
      previousNodes,
      nextNodes,
      changedNodeIds,
      footprintCanvasBounds
    );
    const finalNodeUpdates = mergeNodeUpdateLists(existingUpdates, routableLineNodeUpdates);
    if (edgeUpdates.length > 0) {
      const dirtyEdgeIds = edgeUpdates.map((edge: Edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      markStoredRouteEdgesDirty(dirtyEdgeIds);
      markBusTerminalSyncDirtyForEdges(edgeUpdates);
    }
    expandCanvasToFitGraph(finalNodeUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, footprintCanvasBounds);
    setGraphStore((current: GraphStore) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: finalNodeUpdates,
        edgeUpserts: edgeUpdates
      })
    );
  };
}

export function createAssignSelectedNodesToModelLayer(__appScope: CanvasInteractionScope) {
  return (layerId: string) => {
  const { DEFAULT_MODEL_LAYER_ID, activeSelectedNodeIds, layers, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, writeOperationLog } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const layer = layers.find((item: ModelLayer) => item.id === layerId);
    if (!layer) {
      return;
    }
    const selected = new Set(activeSelectedNodeIds);
    const changedCount = nodes.filter((node: ModelNode) => selected.has(node.id) && (node.layerId ?? DEFAULT_MODEL_LAYER_ID) !== layerId).length;
    if (changedCount === 0) {
      return;
    }
    pushUndoSnapshot(true, false, undefined, "修改图层");
    patchGraphNodes(
      activeSelectedNodeIds.flatMap((nodeId: string) => {
        const node = nodeById.get(nodeId);
        return node && selected.has(node.id) ? [{ ...node, layerId }] : [];
      })
    );
    writeOperationLog(`修改 ${changedCount} 个图元所属图层为：${layer.name}`);
  };
}

export function createOpenLayerAssignmentDialog(__appScope: CanvasInteractionScope) {
  return () => {
  const { DEFAULT_MODEL_LAYER_ID, activeLayerId, activeSelectedNodeIds, layers, nodeById, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const selectedLayerIds = activeSelectedNodeIds
      .map((nodeId: string) => nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID)
      .filter((layerId: string) => layers.some((layer: ModelLayer) => layer.id === layerId));
    const commonLayerId =
      selectedLayerIds.length > 0 && selectedLayerIds.every((layerId: string) => layerId === selectedLayerIds[0])
        ? selectedLayerIds[0]
        : "";
    setLayerAssignmentTargetId(commonLayerId || activeLayerId || layers[0]?.id || DEFAULT_MODEL_LAYER_ID);
    setLayerAssignmentDialogOpen(true);
  };
}

export function createApplyLayerAssignmentDialog(__appScope: CanvasInteractionScope) {
  return () => {
  const { assignSelectedNodesToModelLayer, layerAssignmentTargetId, setLayerAssignmentDialogOpen } = __appScope;
    assignSelectedNodesToModelLayer(layerAssignmentTargetId);
    setLayerAssignmentDialogOpen(false);
  };
}

export function createRotateSelectedLayoutUnits(__appScope: CanvasInteractionScope) {
  return (direction: "left" | "right") => {
  const { buildRotateLayoutUnitEdgeUpdates, edges, expandCanvasToFitGraph, graphStore, graphStoreApplyPatch, markRouteEdgesDirty, markStoredRouteEdgesDirty, overlayGraphStoreNodes, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, rotateLayoutUnitNodeUpdates, selectedLayoutUnits, setGraphStore, setSelectedEdgeId, writeOperationLog } = __appScope;
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    const degrees = direction === "left" ? -90 : 90;
    pushUndoSnapshot(true, false, undefined, "旋转图元");
    setSelectedEdgeId("");
    const nodeUpdates = rotateLayoutUnitNodeUpdates(selectedLayoutUnits, degrees);
    const transformedNodeIds = nodeUpdates.map((node: ModelNode) => node.id);
    const nextNodes = overlayGraphStoreNodes(graphStore, nodeUpdates);
    // 容器跟随:旋转只改被变换节点的几何,容器不重算会停在旧矩形(与变换句柄同口径,见 refitContainersAfterTransform)
    const containerUpdates = refitContainersAfterTransform(nextNodes, transformedNodeIds);
    const nodesWithContainers = withNodeUpdates(nextNodes, containerUpdates);
    const rotatedEdgeUpdates = buildRotateLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, degrees);
    const preservedRotateEdgeIds = new Set(rotatedEdgeUpdates.map((edge: Edge) => edge.id));
    markRouteEdgesDirty(preservedRotateEdgeIds);
    markStoredRouteEdgesDirty(preservedRotateEdgeIds);
    const reroutedEdgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nodesWithContainers, transformedNodeIds, edges, preservedRotateEdgeIds);
    const edgeUpdates = [...rotatedEdgeUpdates, ...reroutedEdgeUpdates];
    expandCanvasToFitGraph([...nodeUpdates, ...containerUpdates], edgeUpdates);
    setGraphStore((current: GraphStore) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: [...nodeUpdates, ...containerUpdates],
        edgeUpserts: edgeUpdates
      })
    );
    writeOperationLog(`${direction === "left" ? "向左" : "向右"}旋转90度 ${selectedLayoutUnits.length} 个选中单元`);
  };
}

export function createMirrorSelectedNodes(__appScope: CanvasInteractionScope) {
  return (axis: "horizontal" | "vertical") => {
  const { buildMirrorLayoutUnitEdgeUpdates, edges, expandCanvasToFitGraph, graphStore, graphStoreApplyPatch, markRouteEdgesDirty, markStoredRouteEdgesDirty, mirrorLayoutUnitNodeUpdates, overlayGraphStoreNodes, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, selectedLayoutUnits, setGraphStore, setSelectedEdgeId, writeOperationLog } = __appScope;
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    pushUndoSnapshot(true, false, undefined, "镜像图元");
    setSelectedEdgeId("");
    const nodeUpdates = mirrorLayoutUnitNodeUpdates(selectedLayoutUnits, axis);
    const transformedNodeIds = nodeUpdates.map((node: ModelNode) => node.id);
    const nextNodes = overlayGraphStoreNodes(graphStore, nodeUpdates);
    // 容器跟随:镜像会挪成员位置(翻面),容器不重算会停在旧矩形(与变换句柄同口径,见 refitContainersAfterTransform)
    const containerUpdates = refitContainersAfterTransform(nextNodes, transformedNodeIds);
    const nodesWithContainers = withNodeUpdates(nextNodes, containerUpdates);
    const mirroredEdgeUpdates = buildMirrorLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, axis);
    const preservedMirrorEdgeIds = new Set(mirroredEdgeUpdates.map((edge: Edge) => edge.id));
    markRouteEdgesDirty(preservedMirrorEdgeIds);
    markStoredRouteEdgesDirty(preservedMirrorEdgeIds);
    const reroutedEdgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nodesWithContainers, transformedNodeIds, edges, preservedMirrorEdgeIds);
    const edgeUpdates = [...mirroredEdgeUpdates, ...reroutedEdgeUpdates];
    expandCanvasToFitGraph([...nodeUpdates, ...containerUpdates], edgeUpdates);
    setGraphStore((current: GraphStore) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: [...nodeUpdates, ...containerUpdates],
        edgeUpserts: edgeUpdates
      })
    );
    writeOperationLog(`${axis === "horizontal" ? "水平" : "垂直"}镜像 ${selectedLayoutUnits.length} 个选中单元`);
  };
}

export function createUpdateCanvasSize(__appScope: CanvasInteractionScope) {
  return (nextWidth: number, nextHeight: number) => {
  const { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, applyCanvasBounds, canvasBoundsChangeIsMeaningful, canvasBoundsRef, clampCanvasDimension, clampEdgeGeometryToBounds, clampNodePositionToBounds, edges, nodes, pushUndoSnapshot, setGraphArrays } = __appScope;
    const currentBounds = canvasBoundsRef.current;
    const width = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    const nextBounds = { width, height };
    if (!canvasBoundsChangeIsMeaningful(currentBounds, nextBounds)) {
      return;
    }
    pushUndoSnapshot(true, false, undefined, "修改画布尺寸");
    applyCanvasBounds(nextBounds);
    setGraphArrays(
      nodes.map((node: ModelNode) => ({ ...node, position: clampNodePositionToBounds(node, nextBounds) })),
      edges.map((edge: Edge) => clampEdgeGeometryToBounds(edge, nextBounds))
    );
  };
}
