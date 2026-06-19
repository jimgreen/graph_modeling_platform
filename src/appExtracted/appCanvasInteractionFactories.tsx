// @ts-nocheck
import { degreesToRadians } from "../formatUtils";

export function createUpdateSingleNodeDragImperativePreview(__appScope: Record<string, any>) {
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

export function createStartDraggingState(__appScope: Record<string, any>) {
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

export function createFlushConnectPreviewDom(__appScope: Record<string, any>) {
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

export function createSetConnectPreviewDom(__appScope: Record<string, any>) {
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

export function createApplyConnectPreviewState(__appScope: Record<string, any>) {
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

export function createScheduleConnectPreviewPoint(__appScope: Record<string, any>) {
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

export function createApplyRoutableLinePreviewState(__appScope: Record<string, any>) {
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
    setRoutableLinePreview((current) =>
      current.path === path && sameOptionalPoint(current.targetPoint ?? undefined, targetPoint ?? undefined)
        ? current
        : { path, targetPoint }
    );
  };
}

export function createScheduleRoutableLinePreviewPoint(__appScope: Record<string, any>) {
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

export function createReleaseRoutableLinePreviewAxisLock(__appScope: Record<string, any>) {
  return () => {
  const { routableLinePreviewAxisLockRef } = __appScope;
    routableLinePreviewAxisLockRef.current = null;
  };
}

export function createLockRoutableLinePreviewAxis(__appScope: Record<string, any>) {
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

export function createAppendRoutableLinePreviewManualPoint(__appScope: Record<string, any>) {
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

export function createResolveRoutableLinePreviewPoint(__appScope: Record<string, any>) {
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

export function createResetRoutableLinePreviewState(__appScope: Record<string, any>) {
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
    setRoutableLinePreview((current) => current.path || current.targetPoint ? { path: "", targetPoint: null } : current);
  };
}

export function createScheduleRewirePreviewPoint(__appScope: Record<string, any>) {
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
      setRewiring((current) =>
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

export function createResetConnectPreviewState(__appScope: Record<string, any>) {
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

export function createReleaseConnectPreviewAxisLock(__appScope: Record<string, any>) {
  return () => {
  const { connectPreviewAxisLockRef } = __appScope;
    connectPreviewAxisLockRef.current = null;
  };
}

export function createConnectSourceEndpointPoint(__appScope: Record<string, any>) {
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

export function createLockConnectPreviewAxis(__appScope: Record<string, any>) {
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

export function createAppendConnectPreviewManualPoint(__appScope: Record<string, any>) {
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

export function createResolveConnectPreviewPoint(__appScope: Record<string, any>) {
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

export function createBoundedDeltaForNodes(__appScope: Record<string, any>) {
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

export function createBoundedDeltaForMultiNodeInteractiveMove(__appScope: Record<string, any>) {
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

export function createNodeMoveGeometryInsideCanvas(__appScope: Record<string, any>) {
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
    const nextNodes = orderedNodesForIds(nodes, relevantNodeIds).map((node) => {
      const originalPosition = originalPositions[node.id];
      return movedNodeIds.has(node.id) && originalPosition
        ? { ...node, position: clampNodePositionToExpandableBounds(node, bounds, { x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }) }
        : node;
    });
    const movedNodes = nextNodes.filter((node) => movedNodeIds.has(node.id));
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
      ? movedNodes.map((node) => translateNodeBy(node, originShift))
      : movedNodes;
    const shiftedAffectedRoutes = hasCanvasOriginShift(originShift)
      ? affectedRoutes.map((route) => translateRouteBy(route, originShift))
      : affectedRoutes;
    return modelGeometryInsideCanvasBounds(shiftedMovedNodes, shiftedAffectedRoutes, shiftedBounds, MOVE_BOUNDARY_GUARD);
  };
}

export function createNearestBoundarySafeDelta(__appScope: Record<string, any>) {
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

export function createBoundedDeltaForMoveGeometry(__appScope: Record<string, any>) {
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
      (delta) => nodeMoveGeometryInsideCanvas(nodeIds, edgeIds, affectedEdgesForMove, originalPositions, originalEdgePoints, originalRoutePoints, delta, bounds),
      fallbackDelta
    );
  };
}

export function createCommitSafeDeltaForDraggingState(__appScope: Record<string, any>) {
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

export function createCanvasBoundsForMovedNodeDelta(__appScope: Record<string, any>) {
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

export function createDragBoundsForSmartAlignment(__appScope: Record<string, any>) {
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

export function createTerminalOutflowAnchorsForSmartAlignmentDrag(__appScope: Record<string, any>) {
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

export function createComputeSmartAlignmentSnap(__appScope: Record<string, any>) {
  return (dragState: DraggingState, movementDelta: Point, axisLocked: boolean) => {
  const { SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, bestSmartAlignmentAxisSnap, canvasScrollScaleRef, canvasVisibleViewBoxRef, dragBoundsForSmartAlignment, isEditMode, nodeHasUprightBoundsContent, nodeSmartAlignmentBounds, nodeTerminalOutflowSmartAlignmentAnchors, queryNodeSpatialIndex, smartAlignmentEnabled, terminalOutflowAnchorsForSmartAlignmentDrag, viewBoxRef, visibleNodeSpatialIndex } = __appScope;
    // 对齐功能关闭时直接返回无对齐结果
    if (!smartAlignmentEnabled || axisLocked || !isEditMode || dragState.nodeIds.length === 0 || dragState.wholeLayerMove) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const draggedBounds = dragBoundsForSmartAlignment(dragState, movementDelta);
    if (!draggedBounds) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
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
    const draggedNodeIds = new Set(dragState.nodeIds);
    const candidatesById = new Map<string, SmartAlignmentAxisCandidate>();
    const includeCandidate = (candidate: ModelNode) => {
      if (draggedNodeIds.has(candidate.id) || candidatesById.has(candidate.id)) {
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
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const draggedTerminalAnchors = terminalOutflowAnchorsForSmartAlignmentDrag(dragState, movementDelta);
    const xSnap = bestSmartAlignmentAxisSnap("x", draggedBounds, draggedTerminalAnchors.x, candidates, snapThreshold);
    const ySnap = bestSmartAlignmentAxisSnap("y", draggedBounds, draggedTerminalAnchors.y, candidates, snapThreshold);
    const guides = [xSnap?.guide, ySnap?.guide].filter((guide): guide is SmartAlignmentGuide => Boolean(guide));
    return {
      delta: {
        x: movementDelta.x + (xSnap?.adjustment ?? 0),
        y: movementDelta.y + (ySnap?.adjustment ?? 0)
      },
      guides
    };
  };
}

export function createComputeNodeDragPreviewDelta(__appScope: Record<string, any>) {
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

export function createComputeNodeDragDelta(__appScope: Record<string, any>) {
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

export function createApplyNodeDragMove(__appScope: Record<string, any>) {
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

export function createScheduleNodeDragMove(__appScope: Record<string, any>) {
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

export function createFlushPendingNodeDragMove(__appScope: Record<string, any>) {
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

export function createClearNodeDragMoveSchedule(__appScope: Record<string, any>) {
  return () => {
  const { nodeDragMoveFrameRef, pendingNodeDragMoveRef } = __appScope;
    pendingNodeDragMoveRef.current = null;
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
  };
}

export function createClearKeyboardMoveCommitSchedule(__appScope: Record<string, any>) {
  return () => {
  const { keyboardMoveCommitCancelRef } = __appScope;
    keyboardMoveCommitCancelRef.current?.();
    keyboardMoveCommitCancelRef.current = null;
  };
}

export function createClearKeyboardNudgeSchedule(__appScope: Record<string, any>) {
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

export function createClearDraggingMoveState(__appScope: Record<string, any>) {
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

export function createCancelActiveEditInteractions(__appScope: Record<string, any>) {
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

export function createEnterBrowseMode(__appScope: Record<string, any>) {
  return () => {
  const { cancelActiveEditInteractions, setInteractionMode, writeOperationLog } = __appScope;
    cancelActiveEditInteractions();
    setInteractionMode("browse");
    writeOperationLog("切换到浏览模式");
  };
}

export function createRequestEnterBrowseMode(__appScope: Record<string, any>) {
  return () => {
  const { enterBrowseMode, saveRequired, setPendingUnsavedAction } = __appScope;
    if (!saveRequired) {
      enterBrowseMode();
      return;
    }
    setPendingUnsavedAction({
      kind: "enter-browse",
      label: "切换到浏览模式"
    });
  };
}

export function createToggleInteractionMode(__appScope: Record<string, any>) {
  return () => {
  const { isEditMode, requestEnterBrowseMode, setInteractionMode, writeOperationLog } = __appScope;
    if (isEditMode) {
      requestEnterBrowseMode();
      return;
    }
    setInteractionMode("edit");
    writeOperationLog("切换到编辑模式");
  };
}

export function createFinishDraggingMove(__appScope: Record<string, any>) {
  return (
    activeDragging: DraggingState | null,
    snapTarget: NodeTerminalSnapTarget | null,
    actionLabel: "拖拽" | "移动"
  ) => {
  const { adjustEdgesAfterNodeMove, applyCanvasBounds, applyNodeTerminalSnap, boundedDeltaForMoveGeometry, buildMovedNodeUpdates, canvasBoundsForMoveDelta, canvasInteractionRef, clearDraggingMoveState, commitFastMovedGraphPatches, commitSafeDeltaForDraggingState, dragDraggedEdgeIdSet, dragMovedBusNodeIdSet, dragMovedNodeIdSet, ensureDraggingUndoSnapshot, externalMoveCandidateEdges, finalizeMovedNodeEdgesFast, findMultiNodeDragSnapTargetAtDelta, findSingleNodeDragSnapTargetAtDelta, graphStore, internalMoveEdgeIdsForMovedNodes, isMultiNodeMoveState, mergeAdjustedCandidateEdges, nextNodesForMovedGraphCommit, nodes, projectListPointerInsideRef, restoreCanvasSelectionSnapshotWithInspector, routePreserveEdgeIdsForMovedNodes, shouldFinalizeMovedNodeEdgesSynchronously, synchronousEdgeAdjustmentCandidates, translateInternalMoveCandidateEdges, translateWholeMoveCandidateEdges, writeOperationLog } = __appScope;
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
    const movedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
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
                  Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta])),
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

export function createFinishNodeDrag(__appScope: Record<string, any>) {
  return () => {
  const { adjustEdgesAfterNodeMove, applyCanvasBounds, applyNodeTerminalSnap, boundedDeltaForMoveGeometry, buildMovedNodeUpdates, canvasBoundsForMoveDelta, canvasInteractionRef, clearNodeDragMoveSchedule, commitFastMovedGraphPatches, commitSafeDeltaForDraggingState, dragDraggedEdgeIdSet, dragMovedBusNodeIdSet, dragMovedNodeIdSet, dragUndoCapturedRef, draggingRef, ensureDraggingUndoSnapshot, externalMoveCandidateEdges, finalizeMovedNodeEdgesFast, findMultiNodeDragSnapTargetAtDelta, findSingleNodeDragSnapTargetAtDelta, flushPendingNodeDragMove, graphStore, hideImperativeMultiNodeDragOverlay, hideImperativeSingleNodeDragPreview, internalMoveEdgeIdsForMovedNodes, isMultiNodeMoveState, mergeAdjustedCandidateEdges, nextNodesForMovedGraphCommit, nodeTerminalSnapTargetRef, nodes, projectListPointerInsideRef, resetMultiNodeDragOverlayTransform, restoreCanvasSelectionSnapshotWithInspector, routePreserveEdgeIdsForMovedNodes, setDragging, shouldFinalizeMovedNodeEdgesSynchronously, synchronousEdgeAdjustmentCandidates, translateInternalMoveCandidateEdges, translateWholeMoveCandidateEdges, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
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
    const movedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
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
                  Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta])),
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
  };
}

export function createFinishTransformDrag(__appScope: Record<string, any>) {
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
          transformedNodeUpdates = transformedNodeUpdates.map((node) => ({
            ...node,
            position: clampNodePositionToBounds(node, transformBounds, node.position)
          }));
          setGraphStore((current) => {
            let currentTransformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === "rotate" });
            const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === "rotate" });
            const transformedRouteEdgeIds = new Set(transformedEdgeUpdates.map((edge) => edge.id));
            const transformedEdges = overlayEdgeUpdatesForTransform(current.edges, transformedEdgeUpdates);
            currentTransformedNodeUpdates = currentTransformedNodeUpdates.map((node) => ({
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
            const transformedNodeIdSet = new Set(transformedNodeIds);
            const transformedEdgeIds = Array.from(new Set([
              ...current.edges
              .filter((edge) => transformedNodeIdSet.has(edge.sourceId) || transformedNodeIdSet.has(edge.targetId))
                .map((edge) => edge.id),
              ...transformedRouteEdgeIds
            ]));
            return graphStorePatchGraphFromArrays(
              current,
              finalNextNodes,
              nextEdges,
              [...transformedNodeIds, ...routableLineNodeUpdates.map((node) => node.id)],
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
          setGraphStore((current) => {
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
            const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, transformedNodeIds, current.edges);
            return graphStoreApplyPatch(current, {
              nodeUpdates,
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
          setGraphStore((current) => {
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
            const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, transformedNodeIds, current.edges);
            return graphStoreApplyPatch(current, {
              nodeUpdates: finalNodeUpdates,
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

export function createFinishKeyboardMove(__appScope: Record<string, any>) {
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

export function createScheduleKeyboardMoveCommit(__appScope: Record<string, any>) {
  return () => {
  const { KEYBOARD_MOVE_COMMIT_DELAY_MS, clearKeyboardMoveCommitSchedule, finishKeyboardMove, keyboardMoveCommitCancelRef, scheduleIdleWork } = __appScope;
    clearKeyboardMoveCommitSchedule();
    keyboardMoveCommitCancelRef.current = scheduleIdleWork(() => {
      keyboardMoveCommitCancelRef.current = null;
      finishKeyboardMove();
    }, KEYBOARD_MOVE_COMMIT_DELAY_MS, 1200);
  };
}

export function createApplyKeyboardMoveDelta(__appScope: Record<string, any>) {
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

export function createFlushPendingKeyboardMove(__appScope: Record<string, any>) {
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

export function createKeyboardMoveActiveFrameDelta(__appScope: Record<string, any>) {
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

export function createAppendPendingKeyboardMoveDelta(__appScope: Record<string, any>) {
  return (delta: Point) => {
  const { draggingRef, pendingKeyboardMoveDeltaRef } = __appScope;
    if (delta.x === 0 && delta.y === 0) {
      return;
    }
    const baseDelta = pendingKeyboardMoveDeltaRef.current ?? draggingRef.current?.currentDelta ?? { x: 0, y: 0 };
    pendingKeyboardMoveDeltaRef.current = { x: baseDelta.x + delta.x, y: baseDelta.y + delta.y };
  };
}

export function createScheduleKeyboardNudgeFrame(__appScope: Record<string, any>) {
  return () => {
  const { KEYBOARD_MOVE_FRAME_INTERVAL_MS, appendPendingKeyboardMoveDelta, flushPendingKeyboardMove, keyboardMoveActiveFrameDelta, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef } = __appScope;
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

export function createReleaseKeyboardMoveKey(__appScope: Record<string, any>) {
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

export function createStartKeyboardMoveSession(__appScope: Record<string, any>) {
  return (renderInitial = true) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clearNodeDragMoveSchedule, currentCanvasSelectionSnapshot, displaySelectedEdgeIds, displaySelectedNodeIds, dragUndoCapturedRef, dragging, draggingRef, edgeListForNodeIds, isMultiNodeMoveState, isWholeActiveLayerMove, movableCanvasNodeIds, nodeById, requireEditMode, routePointsSnapshotForMove, snapshotRouteBounds, startDraggingState } = __appScope;
    if (!requireEditMode("移动图元")) {
      return null;
    }
    const rawMoveNodeIds = canvasSelectionScope === "direct" ? displaySelectedNodeIds : activeSelectedNodeIds;
    const moveNodeIds = movableCanvasNodeIds(rawMoveNodeIds);
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
      moveNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForMove = routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds);
    const nextDragging: DraggingState = {
      source: "keyboard",
      nodeIds: moveNodeIds,
      edgeIds: moveEdgeIds,
      affectedEdges: affectedEdgesForMove,
      wholeLayerMove,
      startPoint: { x: 0, y: 0 },
      originalPositions: originalPositionsForMove,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForMove.map((edge) => [
          edge.id,
          {
            sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
            manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
            routePoints: edge.routePoints?.map((point) => ({ ...point }))
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

export function createNudgeSelectionByKeyboard(__appScope: Record<string, any>) {
  return (key: string, dx: number, dy: number, repeated = false) => {
  const { appendPendingKeyboardMoveDelta, clearKeyboardMoveCommitSchedule, draggingRef, flushPendingKeyboardMove, keyboardMoveActiveKeyDeltasRef, keyboardMoveLastFrameTimeRef, moveSelection, requireEditMode, scheduleKeyboardNudgeFrame, startKeyboardMoveSession } = __appScope;
    if (!requireEditMode("移动图元")) {
      return;
    }
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

export function createMoveSelection(__appScope: Record<string, any>) {
  return (dx: number, dy: number) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, adjustEdgesAfterNodeMove, applyCanvasBounds, boundedDeltaForMoveGeometry, boundedDeltaForNodes, buildMovedNodeUpdates, busNodeIdSet, canvasBoundsForMoveDelta, canvasSelectionScope, commitFastMovedGraphPatches, displaySelectedEdgeIds, displaySelectedNodeIds, edgeListForNodeIds, externalMoveCandidateEdges, finalizeMovedNodeEdgesFast, graphStore, internalMoveEdgeIdsForMovedNodes, isWholeActiveLayerMove, mergeAdjustedCandidateEdges, movableCanvasNodeIds, nextNodesForMovedGraphCommit, nodeById, nodes, pushUndoSnapshot, requireEditMode, routePointsSnapshotForMove, routePreserveEdgeIdsForMovedNodes, shouldFinalizeMovedNodeEdgesSynchronously, snapshotEdgePoints, synchronousEdgeAdjustmentCandidates, translateInternalMoveCandidateEdges, translateWholeMoveCandidateEdges, undoScopeForGraphPatch, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
    if (!requireEditMode("移动图元")) {
      return;
    }
    const rawMoveNodeIds = canvasSelectionScope === "direct" ? displaySelectedNodeIds : activeSelectedNodeIds;
    const moveNodeIds = movableCanvasNodeIds(rawMoveNodeIds);
    const moveEdgeIds = canvasSelectionScope === "direct" ? displaySelectedEdgeIds : activeSelectedEdgeIds;
    if (moveNodeIds.length === 0) {
      return;
    }
    const originalPositions = Object.fromEntries(
      moveNodeIds.flatMap((id) => {
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
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(moveNodeIds, affectedEdgesForMove.map((edge) => edge.id)));
    const finalBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, boundedDelta.x, boundedDelta.y);
    applyCanvasBounds(finalBounds);
    const deltasByNode = Object.fromEntries(moveNodeIds.map((id) => [id, boundedDelta]));
    const selected = new Set(moveNodeIds);
    const movedNodeUpdates = buildMovedNodeUpdates(moveNodeIds, originalPositions, boundedDelta, finalBounds);
    const nextNodes = nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, selected);
    const multiNodeMove = moveNodeIds.length > 1;
    const selectedMoveEdgeIds = new Set(moveEdgeIds);
    const movedBusNodeIds = new Set(moveNodeIds.filter((nodeId) => busNodeIdSet.has(nodeId)));
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

export function createUndoScopeForNodeFootprintPatch(__appScope: Record<string, any>) {
  return (nodeId: string, nextNode: ModelNode | undefined): UndoGraphPatchScope => {
  const { edgeListForNodeIds, graphStore, localRouteOptimizationCandidateEdges, nodes, overlayGraphStoreNodes, undoScopeForGraphPatch } = __appScope;
    const directCandidateEdges = edgeListForNodeIds([nodeId]);
    if (!nextNode) {
      return undoScopeForGraphPatch([nodeId], directCandidateEdges.map((edge) => edge.id));
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
    return undoScopeForGraphPatch([nodeId], candidateEdges.map((edge) => edge.id));
  };
}

export function createUpdateSelectedNode(__appScope: Record<string, any>) {
  return (patch: Partial<ModelNode>) => {
  const { CANVAS_AUTO_EXPAND_PADDING, adjustEdgesAfterNodeMove, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, clampNodePositionToExpandableBounds, commitFastMovedGraphPatches, currentStoredRoutePointsForEdge, edgeListForNodeIds, expandCanvasToFitGraph, finalizeMovedNodeEdgesFast, focusedGroupedNodeMovesGroup, graphStore, graphStoreApplyPatch, mergeNodeUpdateLists, moveSelection, nodeById, nodes, overlayGraphStoreNodes, patchGraphNodes, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, rebuildRoutableLineNodeUpdatesForChangedNodes, rejectAutoCanvasExpansionForContent, requireEditMode, selectedNode, selectedNodeId, setGraphStore, snapshotEdgePoints, undoScopeForGraphPatch } = __appScope;
    if (!requireEditMode("修改图元")) {
      return;
    }
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
      pushUndoSnapshot(true, false, undoScopeForGraphPatch([selectedNodeId], footprintEdges.map((edge) => edge.id)));
    } else {
      pushNodeOnlyUndoSnapshot(selectedNodeId);
    }
    const nextSelectedNode = { ...currentSelectedNode, ...nextPatch };
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
        affectedEdgesForMove.map((edge) => [
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
      const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(finalNextNodes, [selectedNodeId]);
      expandCanvasToFitGraph(nodeUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, selectedNodeCanvasBounds);
      setGraphStore((current) =>
        graphStoreApplyPatch(current, {
          nodeUpdates,
          edgeUpserts: edgeUpdates
        })
      );
      return;
    }
    patchGraphNodes([nextSelectedNode]);
  };
}

export function createCommitNodeFootprintUpdates(__appScope: Record<string, any>) {
  return (
    nodeUpdates: ModelNode[],
    options: { previousNodes?: ModelNode[] } = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, allowAutoExpandCanvas, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsWithOriginShift, edgeListForNodeIds, edgePatchFromCandidateEdges, edges, expandCanvasToFitGraph, graphStore, graphStoreApplyPatch, graphStoreSetGraph, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, mergeNodeUpdateLists, nodeById, nodes, optimizeMovedNodeEdgeRoutes, overlayGraphStoreNodes, rebuildRoutableLineNodeUpdatesForChangedNodes, rejectAutoCanvasExpansionForContent, requireEditMode, routePointsForMovedNodeBlockers, setGraphStore, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy } = __appScope;
    if (!requireEditMode("修改图元")) {
      return;
    }
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
      const shiftedNodes = nextNodes.map((node) => translateNodeBy(node, originShift));
      const shiftedEdges = edges.map((edge) => translateEdgeBy(edge, originShift));
      const shiftedBounds = canvasBoundsForGraphContent(
        canvasBoundsWithOriginShift(canvasBounds, originShift),
        shiftedNodes,
        shiftedEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(shiftedBounds, originShift);
      shiftCachedRoutesForCanvasOrigin(originShift);
      const shiftedEdgeIds = shiftedEdges.map((edge) => edge.id);
      markRouteEdgesDirty(shiftedEdgeIds);
      markStoredRouteEdgesDirty(shiftedEdgeIds);
      markBusTerminalSyncDirtyForEdges(shiftedEdges);
      setGraphStore((current) => graphStoreSetGraph(current, shiftedNodes, shiftedEdges));
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
      const dirtyEdgeIds = edgeUpdates.map((edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      markStoredRouteEdgesDirty(dirtyEdgeIds);
      markBusTerminalSyncDirtyForEdges(edgeUpdates);
    }
    expandCanvasToFitGraph(finalNodeUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, footprintCanvasBounds);
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: finalNodeUpdates,
        edgeUpserts: edgeUpdates
      })
    );
  };
}

export function createAssignSelectedNodesToModelLayer(__appScope: Record<string, any>) {
  return (layerId: string) => {
  const { DEFAULT_MODEL_LAYER_ID, activeSelectedNodeIds, layers, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, requireEditMode, writeOperationLog } = __appScope;
    if (!requireEditMode("修改图元所属图层")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      return;
    }
    const selected = new Set(activeSelectedNodeIds);
    const changedCount = nodes.filter((node) => selected.has(node.id) && (node.layerId ?? DEFAULT_MODEL_LAYER_ID) !== layerId).length;
    if (changedCount === 0) {
      return;
    }
    pushUndoSnapshot();
    patchGraphNodes(
      activeSelectedNodeIds.flatMap((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && selected.has(node.id) ? [{ ...node, layerId }] : [];
      })
    );
    writeOperationLog(`修改 ${changedCount} 个图元所属图层为：${layer.name}`);
  };
}

export function createOpenLayerAssignmentDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_MODEL_LAYER_ID, activeLayerId, activeSelectedNodeIds, layers, nodeById, requireEditMode, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId } = __appScope;
    if (!requireEditMode("修改图元所属图层")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const selectedLayerIds = activeSelectedNodeIds
      .map((nodeId) => nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID)
      .filter((layerId) => layers.some((layer) => layer.id === layerId));
    const commonLayerId =
      selectedLayerIds.length > 0 && selectedLayerIds.every((layerId) => layerId === selectedLayerIds[0])
        ? selectedLayerIds[0]
        : "";
    setLayerAssignmentTargetId(commonLayerId || activeLayerId || layers[0]?.id || DEFAULT_MODEL_LAYER_ID);
    setLayerAssignmentDialogOpen(true);
  };
}

export function createApplyLayerAssignmentDialog(__appScope: Record<string, any>) {
  return () => {
  const { assignSelectedNodesToModelLayer, layerAssignmentTargetId, setLayerAssignmentDialogOpen } = __appScope;
    assignSelectedNodesToModelLayer(layerAssignmentTargetId);
    setLayerAssignmentDialogOpen(false);
  };
}

export function createRotateSelectedLayoutUnits(__appScope: Record<string, any>) {
  return (direction: "left" | "right") => {
  const { buildRotateLayoutUnitEdgeUpdates, edges, expandCanvasToFitGraph, graphStore, graphStoreApplyPatch, markRouteEdgesDirty, markStoredRouteEdgesDirty, overlayGraphStoreNodes, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, requireEditMode, rotateLayoutUnitNodeUpdates, selectedLayoutUnits, setGraphStore, setSelectedEdgeId, writeOperationLog } = __appScope;
    if (!requireEditMode("旋转图元")) {
      return;
    }
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    const degrees = direction === "left" ? -90 : 90;
    pushUndoSnapshot();
    setSelectedEdgeId("");
    const nodeUpdates = rotateLayoutUnitNodeUpdates(selectedLayoutUnits, degrees);
    const transformedNodeIds = nodeUpdates.map((node) => node.id);
    const nextNodes = overlayGraphStoreNodes(graphStore, nodeUpdates);
    const rotatedEdgeUpdates = buildRotateLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, degrees);
    const preservedRotateEdgeIds = new Set(rotatedEdgeUpdates.map((edge) => edge.id));
    markRouteEdgesDirty(preservedRotateEdgeIds);
    markStoredRouteEdgesDirty(preservedRotateEdgeIds);
    const reroutedEdgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedRotateEdgeIds);
    const edgeUpdates = [...rotatedEdgeUpdates, ...reroutedEdgeUpdates];
    expandCanvasToFitGraph(nodeUpdates, edgeUpdates);
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates,
        edgeUpserts: edgeUpdates
      })
    );
    writeOperationLog(`${direction === "left" ? "向左" : "向右"}旋转90度 ${selectedLayoutUnits.length} 个选中单元`);
  };
}

export function createMirrorSelectedNodes(__appScope: Record<string, any>) {
  return (axis: "horizontal" | "vertical") => {
  const { buildMirrorLayoutUnitEdgeUpdates, edges, expandCanvasToFitGraph, graphStore, graphStoreApplyPatch, markRouteEdgesDirty, markStoredRouteEdgesDirty, mirrorLayoutUnitNodeUpdates, overlayGraphStoreNodes, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, requireEditMode, selectedLayoutUnits, setGraphStore, setSelectedEdgeId, writeOperationLog } = __appScope;
    if (!requireEditMode("镜像图元")) {
      return;
    }
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    pushUndoSnapshot();
    setSelectedEdgeId("");
    const nodeUpdates = mirrorLayoutUnitNodeUpdates(selectedLayoutUnits, axis);
    const transformedNodeIds = nodeUpdates.map((node) => node.id);
    const nextNodes = overlayGraphStoreNodes(graphStore, nodeUpdates);
    const mirroredEdgeUpdates = buildMirrorLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, axis);
    const preservedMirrorEdgeIds = new Set(mirroredEdgeUpdates.map((edge) => edge.id));
    markRouteEdgesDirty(preservedMirrorEdgeIds);
    markStoredRouteEdgesDirty(preservedMirrorEdgeIds);
    const reroutedEdgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedMirrorEdgeIds);
    const edgeUpdates = [...mirroredEdgeUpdates, ...reroutedEdgeUpdates];
    expandCanvasToFitGraph(nodeUpdates, edgeUpdates);
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates,
        edgeUpserts: edgeUpdates
      })
    );
    writeOperationLog(`${axis === "horizontal" ? "水平" : "垂直"}镜像 ${selectedLayoutUnits.length} 个选中单元`);
  };
}

export function createUpdateCanvasSize(__appScope: Record<string, any>) {
  return (nextWidth: number, nextHeight: number) => {
  const { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, applyCanvasBounds, canvasBoundsChangeIsMeaningful, canvasBoundsRef, clampCanvasDimension, clampEdgeGeometryToBounds, clampNodePositionToBounds, edges, nodes, pushUndoSnapshot, requireEditMode, setGraphArrays } = __appScope;
    if (!requireEditMode("修改画布尺寸")) {
      return;
    }
    const currentBounds = canvasBoundsRef.current;
    const width = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    const nextBounds = { width, height };
    if (!canvasBoundsChangeIsMeaningful(currentBounds, nextBounds)) {
      return;
    }
    pushUndoSnapshot();
    applyCanvasBounds(nextBounds);
    setGraphArrays(
      nodes.map((node) => ({ ...node, position: clampNodePositionToBounds(node, nextBounds) })),
      edges.map((edge) => clampEdgeGeometryToBounds(edge, nextBounds))
    );
  };
}

export function createCommitCanvasSizeDraft(__appScope: Record<string, any>) {
  return (draft?: typeof canvasSizeDraft) => {
  const { MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, calculateModelContentSize, canvasHeight, canvasSizeDraft, canvasWidth, clampCanvasDimension, edges, nodes, routeEdgesForStoredRendering, routedEdges, setCanvasSizeDraft, updateCanvasSize, writeOperationLog } = __appScope;
    if (draft === undefined) {
      draft = canvasSizeDraft;
    }
    const nextWidth = draft.width.trim() === "" ? canvasWidth : Number(draft.width);
    const nextHeight = draft.height.trim() === "" ? canvasHeight : Number(draft.height);
    const requestedWidth = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth);
    const requestedHeight = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight);
    const requestedRoutes = routeEdgesForStoredRendering(nodes, edges, { width: requestedWidth, height: requestedHeight });
    const currentContentSize = calculateModelContentSize(nodes, edges, routedEdges);
    const requestedContentSize = calculateModelContentSize(nodes, edges, requestedRoutes);
    const contentSize = {
      width: Math.max(currentContentSize.width, requestedContentSize.width),
      height: Math.max(currentContentSize.height, requestedContentSize.height)
    };
    const requiredWidth = clampCanvasDimension(contentSize.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, requestedWidth);
    const requiredHeight = clampCanvasDimension(contentSize.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, requestedHeight);
    const width = Math.max(requestedWidth, requiredWidth);
    const height = Math.max(requestedHeight, requiredHeight);
    if (width !== requestedWidth || height !== requestedHeight) {
      const message = `输入的显示区域小于当前图上内容实际占用范围，已调整为 ${width} x ${height}。`;
      window.alert(message);
      writeOperationLog(message);
    }
    setCanvasSizeDraft({ width: String(width), height: String(height) });
    updateCanvasSize(width, height);
  };
}

export function createResetCanvasSizeDraft(__appScope: Record<string, any>) {
  return () => {
  const { canvasHeight, canvasWidth, setCanvasSizeDraft } = __appScope;
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  };
}

export function createHandleCanvasSizeBlur(__appScope: Record<string, any>) {
  return () => {
  const { commitCanvasSizeDraft, flushSync, skipCanvasSizeBlurCommitRef } = __appScope;
    if (skipCanvasSizeBlurCommitRef.current) {
      skipCanvasSizeBlurCommitRef.current = false;
      return;
    }
    flushSync(() => commitCanvasSizeDraft());
  };
}

export function createHandleCanvasSizeKeyDown(__appScope: Record<string, any>) {
  return (event: ReactKeyboardEvent<HTMLInputElement>) => {
  const { commitCanvasSizeDraft, flushSync, resetCanvasSizeDraft, skipCanvasSizeBlurCommitRef } = __appScope;
    if (event.key === "Enter") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      flushSync(() => commitCanvasSizeDraft());
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      resetCanvasSizeDraft();
      event.currentTarget.blur();
    }
  };
}

export function createUpdateParam(__appScope: Record<string, any>) {
  return (key: string, value: string) => {
  const { NODE_LABEL_FOOTPRINT_PARAM_KEYS, commitNodeFootprintUpdates, nodeById, normalizeNodeLabelDisplayMode, patchGraphNodes, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, requireEditMode, selectedNodeId, undoScopeForNodeFootprintPatch } = __appScope;
    if (!requireEditMode("修改图元参数")) {
      return;
    }
    if (!selectedNodeId) {
      return;
    }
    const currentNode = nodeById.get(selectedNodeId);
    if (!currentNode) {
      return;
    }
    if (key !== "_labelDisplayMode" && currentNode.params[key] === value) {
      return;
    }
    const nextNode =
      key === "_labelDisplayMode"
        ? (() => {
            const mode = normalizeNodeLabelDisplayMode(value);
            const visible = mode === "hidden" ? "0" : "1";
            if (currentNode.params._labelDisplayMode === mode && currentNode.params._labelVisible === visible) {
              return currentNode;
            }
            return { ...currentNode, params: { ...currentNode.params, _labelDisplayMode: mode, _labelVisible: visible } };
          })()
        : { ...currentNode, params: { ...currentNode.params, [key]: value } };
    if (nextNode === currentNode) {
      return;
    }
    if (NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key)) {
      pushUndoSnapshot(true, false, undoScopeForNodeFootprintPatch(selectedNodeId, nextNode));
      commitNodeFootprintUpdates([nextNode]);
      return;
    }
    pushNodeOnlyUndoSnapshot(selectedNodeId);
    patchGraphNodes([nextNode]);
  };
}

export function createApplyBatchCommonParamPatch(__appScope: Record<string, any>) {
  return (operationLabel: string, patchForNode: (node: ModelNode) => BatchCommonParamPatch) => {
  const { NODE_LABEL_FOOTPRINT_PARAM_KEYS, activeSelectedNodeIds, canBatchEditParam, commitNodeFootprintUpdates, edgeListForNodeIds, nodeById, patchGraphNodes, pushUndoSnapshot, requireEditMode, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    if (!requireEditMode("批量修改图元参数")) {
      return;
    }
    const targetNodes = activeSelectedNodeIds.flatMap((nodeId) => nodeById.get(nodeId) ?? []);
    const changedPatchKeys = new Set<string>();
    const nextNodes = targetNodes
      .map((node) => {
        const patch = Object.fromEntries(
          Object.entries(patchForNode(node))
            .filter(([patchKey]) => canBatchEditParam(patchKey))
            .filter(([patchKey]) => Object.prototype.hasOwnProperty.call(node.params, patchKey))
        );
        if (Object.keys(patch).length === 0) {
          return node;
        }
        if (Object.entries(patch).every(([patchKey, patchValue]) => node.params[patchKey] === patchValue)) {
          return node;
        }
        Object.keys(patch).forEach((patchKey) => changedPatchKeys.add(patchKey));
        return { ...node, params: { ...node.params, ...patch } };
      })
      .filter((node, index) => node !== targetNodes[index]);
    if (nextNodes.length === 0) {
      return;
    }
    const nextNodeIds = nextNodes.map((node) => node.id);
    const hasFootprintParam = Array.from(changedPatchKeys).some((key) => NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key));
    if (hasFootprintParam) {
      const affectedEdges = edgeListForNodeIds(nextNodeIds);
      pushUndoSnapshot(true, false, undoScopeForGraphPatch(nextNodeIds, affectedEdges.map((edge) => edge.id)));
      commitNodeFootprintUpdates(nextNodes);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(nextNodeIds, []));
    patchGraphNodes(nextNodes);
    writeOperationLog(`批量修改共同属性：${operationLabel}`);
  };
}

export function createApplyBatchCommonParam(__appScope: Record<string, any>) {
  return (key: string, value: string) => {
  const { PARAM_LABELS, applyBatchCommonParamPatch, canBatchEditParam, normalizeNodeLabelDisplayMode } = __appScope;
    if (!canBatchEditParam(key)) {
      return;
    }
    const normalizedLabelDisplayMode = key === "_labelDisplayMode" ? normalizeNodeLabelDisplayMode(value) : undefined;
    const normalizedLabelVisible = normalizedLabelDisplayMode === "hidden" ? "0" : "1";
    applyBatchCommonParamPatch(
      PARAM_LABELS[key] ?? key,
      () => normalizedLabelDisplayMode
        ? { _labelDisplayMode: normalizedLabelDisplayMode, _labelVisible: normalizedLabelVisible }
        : { [key]: value }
    );
  };
}

export function createApplyBatchCommonMeasurementGroupSetting(__appScope: Record<string, any>) {
  return (key: BatchCommonMeasurementGroupKey, value: string) => {
  const { BATCH_MEASUREMENT_GROUP_LABELS, measurementGroupCommonValue, measurementGroupWithCommonSetting, projectMeasurements, requireEditMode, selectedNodeIdsWithMeasurementGroups, updateProjectMeasurementsWithUndo } = __appScope;
    if (!requireEditMode("批量修改量测属性")) {
      return;
    }
    if (!value || selectedNodeIdsWithMeasurementGroups.size === 0) {
      return;
    }
    const changedGroupIds = new Set(
      projectMeasurements.groups
        .filter((group) => selectedNodeIdsWithMeasurementGroups.has(group.nodeId))
        .filter((group) => measurementGroupCommonValue(group, key) !== value)
        .map((group) => group.id)
    );
    if (changedGroupIds.size === 0) {
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current) => ({
        version: 1,
        groups: current.groups.map((group) => changedGroupIds.has(group.id)
          ? measurementGroupWithCommonSetting(group, key, value)
          : group
        )
      }),
      `批量修改量测属性：${BATCH_MEASUREMENT_GROUP_LABELS[key]}`
    );
  };
}

export function createCommitElementTreeNodeIdentity(__appScope: Record<string, any>) {
  return (nodeId: string, field: "idx" | "name", value: string, draftKey?: string) => {
  const { activeLayerNodeIdSet, clearElementTreeDraft, nodeById, pushNodeOnlyUndoSnapshot, requireEditMode, updateElementTreeDraft, updateGraphNodeById } = __appScope;
    if (!requireEditMode("修改图元树参数")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    const node = nodeById.get(nodeId);
    if (!node) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    const currentValue = field === "name" ? node.name : node.params.idx ?? "";
    if (currentValue === value) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if (draftKey) {
      updateElementTreeDraft(draftKey, value);
    }
    pushNodeOnlyUndoSnapshot(nodeId);
    updateGraphNodeById(nodeId, (node) =>
      field === "name" ? { ...node, name: value } : { ...node, params: { ...node.params, idx: value } }
    );
  };
}

export function createCommitElementTreeContainerChildParam(__appScope: Record<string, any>) {
  return (nodeId: string, key: string, value: string, draftKey?: string) => {
  const { activeLayerNodeIdSet, clearElementTreeDraft, nodeById, pushNodeOnlyUndoSnapshot, requireEditMode, updateElementTreeDraft, updateGraphNodeById } = __appScope;
    if (!requireEditMode("修改图元树参数")) {
      return;
    }
    if (!key) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    const node = nodeById.get(nodeId);
    if (!node) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if ((node.params[key] ?? "") === value) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if (draftKey) {
      updateElementTreeDraft(draftKey, value);
    }
    pushNodeOnlyUndoSnapshot(nodeId);
    updateGraphNodeById(nodeId, (node) => ({ ...node, params: { ...node.params, [key]: value } }));
  };
}

export function createTerminalVbaseFallback(__appScope: Record<string, any>) {
  return (node: ModelNode, terminalIndex: number) => {
  const { terminalVbaseFallbackValue } = __appScope;
    return terminalVbaseFallbackValue(node, terminalIndex);
  };
}

export function createUpdateTerminalVbase(__appScope: Record<string, any>) {
  return (terminalId: string, value: string) => {
  const { normalizeVoltageBaseInput, pushNodeOnlyUndoSnapshot, requireEditMode, selectedNodeId, updateGraphNodeById } = __appScope;
    if (!requireEditMode("修改端子参数")) {
      return;
    }
    if (!selectedNodeId) {
      return;
    }
    const numericValue = normalizeVoltageBaseInput(value);
    pushNodeOnlyUndoSnapshot(selectedNodeId);
    updateGraphNodeById(selectedNodeId, (node) => ({
      ...node,
      terminals: node.terminals.map((terminal) =>
        terminal.id === terminalId ? { ...terminal, vbase: numericValue } : terminal
      )
    }));
  };
}

export function createRenderParamHeader(__appScope: Record<string, any>) {
  return (key: string, displayName = key, title?: string) => {
  const { PARAM_LABELS, small, span, th } = __appScope;
    if (title === undefined) {
      title = PARAM_LABELS[key] ?? displayName;
    }
    const visibleLabel = displayName === key ? title : displayName;
    const englishLabel = key.trim();
    return (
      <th title={englishLabel ? `${visibleLabel} / ${englishLabel}` : visibleLabel}>
        <span className="param-header-bilingual">
          <span>{visibleLabel}</span>
          {englishLabel && englishLabel !== visibleLabel ? <small>{englishLabel}</small> : null}
        </span>
      </th>
    );
  };
}

export function createRenderNodeDoubleClickDeviceParamRows(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, BufferedTextInput, PARAM_LABELS, READONLY_E_PARAM_KEYS, batchEditors, formatDeviceModelParamDisplayValue, getEParamValue, getEParameterKeys, input, parseCustomDefinitions, td, tr } = __appScope;
    const eKeys = getEParameterKeys(node.kind, node.params);
    const customDefinitions = parseCustomDefinitions(node.params);
    const customKeys = customDefinitions.map((definition) => definition.enName);
    const customExtraKeys = customKeys.filter((key) => !eKeys.includes(key));
    const keys =
      eKeys.length > 0
        ? [...eKeys, ...customExtraKeys]
        : customKeys.length > 0
          ? ["name", ...customKeys.filter((key) => key !== "name")]
          : ["name", ...Object.keys(node.params).filter((key) => !key.startsWith("_") && key !== "is_container" && key !== ALLOW_RESIZE_TRANSFORM_PARAM)];
    return keys.map((key) => {
      const value = eKeys.length > 0 ? getEParamValue(key, node) : key === "name" ? node.name : node.params[key] ?? "";
      const displayValue = formatDeviceModelParamDisplayValue(key, value);
      const definition = customDefinitions.find((item) => item.enName === key);
      return (
        <tr key={key}>
          {batchEditors.renderParamHeader(key, key, definition?.cnName ?? PARAM_LABELS[key] ?? key)}
          <td>
            {key === "name" ? (
              <BufferedTextInput value={node.name} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftPatch(node.id, { name: nextValue })} />
            ) : READONLY_E_PARAM_KEYS.has(key) || batchEditors.definitionMakesValueReadonly(definition) ? (
              <input value={displayValue} readOnly />
            ) : (
              batchEditors.renderNodeDoubleClickParamEditor(node, key, displayValue, false, definition)
            )}
          </td>
        </tr>
      );
    });
  };
}

export function createRememberNodeDoubleClickDialogGuard(__appScope: Record<string, any>) {
  return (dialog: NonNullable<NodeDoubleClickDialogState>) => {
  const { NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS, nodeDoubleClickCloseSuppressUntilRef, nodeDoubleClickOpenGuardRef } = __appScope;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    nodeDoubleClickOpenGuardRef.current = { key: `${dialog.nodeId}:${dialog.kind}`, time: now };
    nodeDoubleClickCloseSuppressUntilRef.current = now + NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS;
  };
}

export function createSuppressNodeDoubleClickDialogEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
  const { nodeDoubleClickDialog, rememberNodeDoubleClickDialogGuard } = __appScope;
    event.stopPropagation();
    if (nodeDoubleClickDialog) {
      rememberNodeDoubleClickDialogGuard(nodeDoubleClickDialog);
    }
  };
}

export function createFinishNodeDoubleClickDialogPointerOperation(__appScope: Record<string, any>) {
  return () => {
  const { setNodeDoubleClickDialogDrag, setNodeDoubleClickDialogResize } = __appScope;
    setNodeDoubleClickDialogDrag(null);
    setNodeDoubleClickDialogResize(null);
  };
}

export function createStopNodeDoubleClickDialogEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
  const { finishNodeDoubleClickDialogPointerOperation } = __appScope;
    event.stopPropagation();
    if (
      event.type === "pointerup" ||
      event.type === "pointercancel" ||
      event.type === "lostpointercapture"
    ) {
      finishNodeDoubleClickDialogPointerOperation();
    }
  };
}

export function createCurrentNodeDoubleClickDialogRect(__appScope: Record<string, any>) {
  return () => {
  const { NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH, clampNodeDoubleClickDialogLayout, nodeDoubleClickDialogLayout, nodeDoubleClickDialogRef } = __appScope;
    const rect = nodeDoubleClickDialogRef.current?.getBoundingClientRect();
    if (rect) {
      return clampNodeDoubleClickDialogLayout({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
    const viewportWidth = typeof window === "undefined" ? NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT : window.innerHeight;
    return clampNodeDoubleClickDialogLayout(nodeDoubleClickDialogLayout ?? {
      left: (viewportWidth - NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH) / 2,
      top: (viewportHeight - NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT) / 2,
      width: NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH,
      height: NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT
    });
  };
}

export function createStartNodeDoubleClickDialogDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement>) => {
  const { currentNodeDoubleClickDialogRect, setNodeDoubleClickDialogDrag, setNodeDoubleClickDialogLayout } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentNodeDoubleClickDialogRect();
    setNodeDoubleClickDialogLayout(rect);
    setNodeDoubleClickDialogDrag({
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

export function createStartNodeDoubleClickDialogResize(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLDivElement>) => {
  const { currentNodeDoubleClickDialogRect, setNodeDoubleClickDialogLayout, setNodeDoubleClickDialogResize } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentNodeDoubleClickDialogRect();
    setNodeDoubleClickDialogLayout(rect);
    setNodeDoubleClickDialogResize({
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

export function createCancelNodeDoubleClickDialog(__appScope: Record<string, any>) {
  return () => {
  const { finishNodeDoubleClickDialogPointerOperation, nodeDoubleClickDialog, rememberNodeDoubleClickDialogGuard, setNodeDoubleClickDialog, setNodeDoubleClickDraft } = __appScope;
    const dialog = nodeDoubleClickDialog;
    if (dialog) {
      rememberNodeDoubleClickDialogGuard(dialog);
    }
    finishNodeDoubleClickDialogPointerOperation();
    setNodeDoubleClickDialog(null);
    setNodeDoubleClickDraft(null);
  };
}

export function createConfirmNodeDoubleClickDialog(__appScope: Record<string, any>) {
  return () => {
  const { finishNodeDoubleClickDialogPointerOperation, nodeById, nodeDoubleClickDialog, nodeDoubleClickDraft, nodeDoubleClickDraftHasModelChanges, patchGraphNodes, pushNodeOnlyUndoSnapshot, rememberNodeDoubleClickDialogGuard, setNodeDoubleClickDialog, setNodeDoubleClickDraft } = __appScope;
    const dialog = nodeDoubleClickDialog;
    if (!dialog) {
      return;
    }
    rememberNodeDoubleClickDialogGuard(dialog);
    const currentNode = nodeById.get(dialog.nodeId);
    const draftNode =
      nodeDoubleClickDraft?.nodeId === dialog.nodeId ? nodeDoubleClickDraft.node : undefined;
    if (currentNode && draftNode && nodeDoubleClickDraftHasModelChanges(currentNode, draftNode)) {
      pushNodeOnlyUndoSnapshot(currentNode.id);
      patchGraphNodes([
        {
          ...currentNode,
          name: draftNode.name,
          params: { ...draftNode.params }
        }
      ]);
    }
    finishNodeDoubleClickDialogPointerOperation();
    setNodeDoubleClickDialog(null);
    setNodeDoubleClickDraft(null);
  };
}

export function createRenderNodeDoubleClickDialog(__appScope: Record<string, any>) {
  return () => {
  const { batchEditors, buildContainerDeviceParameterViews, button, cancelNodeDoubleClickDialog, clampNodeDoubleClickDialogLayout, cloneNodeForDoubleClickDraft, confirmNodeDoubleClickDialog, div, h2, h3, isStaticButtonCapableKind, libraryTemplateByKind, nodeById, nodeDoubleClickDialog, nodeDoubleClickDialogLayout, nodeDoubleClickDialogRef, nodeDoubleClickDraft, nodeHasTextDoubleClickEditor, p, renderNodeDoubleClickContainerParamRows, renderNodeDoubleClickDeviceParamRows, renderNodeDoubleClickTextParamTable, section, setNodeDoubleClickDialog, startNodeDoubleClickDialogDrag, startNodeDoubleClickDialogResize, stopNodeDoubleClickDialogEvent, suppressNodeDoubleClickDialogEvent, table, tbody } = __appScope;
    if (!nodeDoubleClickDialog) {
      return null;
    }
    const node = nodeById.get(nodeDoubleClickDialog.nodeId);
    if (!node) {
      return null;
    }
    const dialogNode =
      nodeDoubleClickDraft?.nodeId === node.id ? nodeDoubleClickDraft.node : cloneNodeForDoubleClickDraft(node);
    const containerViews =
      nodeDoubleClickDialog.kind === "device"
        ? buildContainerDeviceParameterViews(dialogNode, libraryTemplateByKind.get(dialogNode.kind))
        : [];
    const activeContainerView =
      containerViews.find((view) => view.id === nodeDoubleClickDialog.containerViewId) ?? containerViews[0];
    const title =
      nodeDoubleClickDialog.kind === "interaction"
        ? "修改交互操作"
        : nodeDoubleClickDialog.kind === "text"
          ? "修改文本"
          : "修改设备参数";
    const dialogLayout = nodeDoubleClickDialogLayout ? clampNodeDoubleClickDialogLayout(nodeDoubleClickDialogLayout) : null;
    const dialogStyle = dialogLayout
      ? {
          left: `${dialogLayout.left}px`,
          top: `${dialogLayout.top}px`,
          width: `${dialogLayout.width}px`,
          height: `${dialogLayout.height}px`
        } as CSSProperties
      : undefined;
    return (
      <div className="image-picker-backdrop" onPointerDown={cancelNodeDoubleClickDialog}>
        <section
          ref={nodeDoubleClickDialogRef}
          className={`node-double-click-dialog${dialogLayout ? " floating" : ""}`}
          style={dialogStyle}
          onPointerDown={stopNodeDoubleClickDialogEvent}
          onPointerUp={stopNodeDoubleClickDialogEvent}
          onPointerCancel={stopNodeDoubleClickDialogEvent}
          onLostPointerCapture={stopNodeDoubleClickDialogEvent}
          onClick={stopNodeDoubleClickDialogEvent}
          onDoubleClick={suppressNodeDoubleClickDialogEvent}
          role="dialog"
          aria-modal="true"
          aria-labelledby="node-double-click-dialog-title"
        >
          <div className="image-picker-title node-double-click-dialog-title" onPointerDown={startNodeDoubleClickDialogDrag}>
            <div>
              <h2 id="node-double-click-dialog-title">{title}</h2>
              <p>{dialogNode.name}</p>
            </div>
          </div>
          <div className="node-double-click-dialog-body">
            {nodeDoubleClickDialog.kind === "interaction" ? (
              <>
                <div className="node-double-click-dialog-section">
                  <h3>修改交互操作</h3>
                  <table className="param-table node-double-click-param-table">
                    <tbody>
                      {batchEditors.renderStaticButtonActionEditor(dialogNode, {
                        updateParam: (key, value) => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, key, value),
                        updateNode: (patch) => batchEditors.updateNodeDoubleClickDraftPatch(dialogNode.id, patch)
                      })}
                    </tbody>
                  </table>
                </div>
                {(nodeHasTextDoubleClickEditor(dialogNode) || isStaticButtonCapableKind(dialogNode.kind)) && (
                  <div className="node-double-click-dialog-section">
                    <h3>修改文本</h3>
                    {renderNodeDoubleClickTextParamTable(dialogNode)}
                  </div>
                )}
              </>
            ) : nodeDoubleClickDialog.kind === "text" ? (
              renderNodeDoubleClickTextParamTable(dialogNode)
            ) : activeContainerView ? (
              <>
                <div className="container-param-tabs node-double-click-container-tabs" role="tablist" aria-label="容器设备参数切换">
                  {containerViews.map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      className={activeContainerView.id === view.id ? "active" : ""}
                      onClick={() => {
                        setNodeDoubleClickDialog((current) =>
                          current && current.kind === "device" && current.nodeId === dialogNode.id
                            ? { ...current, containerViewId: view.id }
                            : current
                        );
                      }}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
                <table className="param-table node-double-click-param-table">
                  <tbody>{renderNodeDoubleClickContainerParamRows(dialogNode, activeContainerView)}</tbody>
                </table>
              </>
            ) : (
              <table className="param-table node-double-click-param-table">
                <tbody>{renderNodeDoubleClickDeviceParamRows(dialogNode)}</tbody>
              </table>
            )}
          </div>
          <div className="node-double-click-dialog-actions nodeDoubleClickDialogActions">
            <button
              type="button"
              className="primary"
              onPointerDown={suppressNodeDoubleClickDialogEvent}
              onDoubleClick={suppressNodeDoubleClickDialogEvent}
              onClick={(event) => {
                suppressNodeDoubleClickDialogEvent(event);
                confirmNodeDoubleClickDialog();
              }}
            >
              确定
            </button>
            <button
              type="button"
              onPointerDown={suppressNodeDoubleClickDialogEvent}
              onDoubleClick={suppressNodeDoubleClickDialogEvent}
              onClick={(event) => {
                suppressNodeDoubleClickDialogEvent(event);
                cancelNodeDoubleClickDialog();
              }}
            >
              取消
            </button>
          </div>
          <div
            className="node-double-click-dialog-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整双击编辑窗口大小"
            title="拖拽调整窗口大小"
            onPointerDown={startNodeDoubleClickDialogResize}
          />
        </section>
      </div>
    );
  };
}

export function createContextMenuPlacement(__appScope: Record<string, any>) {
  return (menu: ContextMenuState | ProjectMenuState) => {
  const { CONTEXT_MENU_FALLBACK_HEIGHT, CONTEXT_MENU_FALLBACK_WIDTH, CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT, CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH, CONTEXT_MENU_VIEWPORT_PADDING, clampNumber, contextMenuSize } = __appScope;
    const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;
    const maxWidth = Math.max(128, viewportWidth - CONTEXT_MENU_VIEWPORT_PADDING * 2);
    const maxHeight = Math.max(120, viewportHeight - CONTEXT_MENU_VIEWPORT_PADDING * 2);
    const menuWidth = Math.min(contextMenuSize?.width ?? CONTEXT_MENU_FALLBACK_WIDTH, maxWidth);
    const menuHeight = Math.min(contextMenuSize?.height ?? CONTEXT_MENU_FALLBACK_HEIGHT, maxHeight);
    const left = clampNumber(
      menu?.x ?? CONTEXT_MENU_VIEWPORT_PADDING,
      CONTEXT_MENU_VIEWPORT_PADDING,
      Math.max(CONTEXT_MENU_VIEWPORT_PADDING, viewportWidth - menuWidth - CONTEXT_MENU_VIEWPORT_PADDING)
    );
    const top = clampNumber(
      menu?.y ?? CONTEXT_MENU_VIEWPORT_PADDING,
      CONTEXT_MENU_VIEWPORT_PADDING,
      Math.max(CONTEXT_MENU_VIEWPORT_PADDING, viewportHeight - menuHeight - CONTEXT_MENU_VIEWPORT_PADDING)
    );
    const submenuOpensLeft =
      left + menuWidth + CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH + CONTEXT_MENU_VIEWPORT_PADDING > viewportWidth;
    const submenuOpensUp =
      top + menuHeight + CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT + CONTEXT_MENU_VIEWPORT_PADDING > viewportHeight;
    return { left, top, maxWidth, maxHeight, submenuOpensLeft, submenuOpensUp };
  };
}

export function createContextMenuStyle(__appScope: Record<string, any>) {
  return (menu: ContextMenuState | ProjectMenuState): CSSProperties => {
  const { contextMenuPlacement, contextMenuSize } = __appScope;
    const placement = contextMenuPlacement(menu);
    return {
      left: placement.left,
      top: placement.top,
      maxWidth: placement.maxWidth,
      maxHeight: placement.maxHeight,
      overflowY: contextMenuSize && contextMenuSize.height > placement.maxHeight ? "auto" : "visible"
    };
  };
}

export function createContextMenuClassName(__appScope: Record<string, any>) {
  return (menu: ContextMenuState | ProjectMenuState) => {
  const { contextMenuPlacement } = __appScope;
    const placement = contextMenuPlacement(menu);
    return [
      "context-menu",
      placement.submenuOpensLeft ? "context-menu--submenu-left" : "",
      placement.submenuOpensUp ? "context-menu--submenu-up" : ""
    ].filter(Boolean).join(" ");
  };
}

export function createStopSidePanelEventPropagation(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };
}

export function createSetSidePanelMode(__appScope: Record<string, any>) {
  return (side: SidePanelSide, mode: SidePanelMode) => {
  const { setLeftPanelAutoVisible, setLeftPanelMode, setRightPanelAutoVisible, setRightPanelMode } = __appScope;
    if (side === "left") {
      setLeftPanelMode(mode);
      setLeftPanelAutoVisible(mode === "auto");
    } else {
      setRightPanelMode(mode);
      setRightPanelAutoVisible(mode === "auto");
    }
  };
}

export function createPointerClientTargetInside(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement>, selector: string) => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    return target instanceof Element && Boolean(target.closest(selector));
  };
}

export function createPointerInsideElementRect(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement>, element: HTMLElement | null, padding = 0) => {
    if (!element) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return (
      event.clientX >= rect.left - padding &&
      event.clientX <= rect.right + padding &&
      event.clientY >= rect.top - padding &&
      event.clientY <= rect.bottom + padding
    );
  };
}

export function createUpdateAutoPanelVisibility(__appScope: Record<string, any>) {
  return (side: SidePanelSide, event: Parameters<typeof nextSidePanelAutoVisible>[3]) => {
  const { leftPanelMode, nextSidePanelAutoVisible, projectMenu, projectRecordDragActiveRef, rightPanelMode, schemeRecordDragActiveRef, setLeftPanelAutoVisible, setRightPanelAutoVisible, sidePanelResize, topologyWarningPanelDrag, topologyWarningPanelResize } = __appScope;
    if (sidePanelResize || topologyWarningPanelDrag || topologyWarningPanelResize) {
      return;
    }
    if (side === "left" && event === "panel-leave" && projectMenu) {
      return;
    }
    if (side === "left" && event === "panel-leave" && projectRecordDragActiveRef.current) {
      return;
    }
    if (side === "left" && event === "panel-leave" && schemeRecordDragActiveRef.current) {
      return;
    }
    if (side === "left") {
      setLeftPanelAutoVisible((current) => nextSidePanelAutoVisible("left", leftPanelMode, current, event));
    } else {
      setRightPanelAutoVisible((current) => nextSidePanelAutoVisible("right", rightPanelMode, current, event));
    }
  };
}

export function createActivateInspectorFromCanvas(__appScope: Record<string, any>) {
  return () => {
  const { rightPanelMode, updateAutoPanelVisibility } = __appScope;
    if (rightPanelMode !== "auto") {
      return;
    }
    updateAutoPanelVisibility("right", "canvas-activate");
  };
}

export function createOpenMeasurementEditorForNode(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { cloneMeasurementGroupForDraft, isStaticNode, measurementGroupsForNode, projectMeasurements, selectCanvasGraphics, setMeasurementEditorDialog } = __appScope;
    if (isStaticNode(node)) {
      return;
    }
    const groups = measurementGroupsForNode(projectMeasurements, node.id);
    if (groups.length === 0) {
      window.alert("当前设备还没有添加显示量测。");
      return;
    }
    const drafts = groups.map((group) => cloneMeasurementGroupForDraft(group));
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setMeasurementEditorDialog({
      nodeId: node.id,
      drafts
    });
  };
}

export function createHandleSidePanelPointerLeave(__appScope: Record<string, any>) {
  return (side: SidePanelSide, event: PointerEvent<HTMLElement>) => {
  const { pointerInsideElementRect, updateAutoPanelVisibility } = __appScope;
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    if (pointerInsideElementRect(event, event.currentTarget, 1)) {
      return;
    }
    updateAutoPanelVisibility(side, "panel-leave");
  };
}

export function createHideAutoPanelsFromWorkspace(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement>) => {
  const { leftPanelMode, pointerClientTargetInside, pointerInsideFloatingPanelBounds, pointerRelatedTargetInside, projectMenu, projectRecordDragActiveRef, rightPanelMode, schemeRecordDragActiveRef, setLeftPanelAutoVisible, setRightPanelAutoVisible, shouldIgnoreWorkspaceAutoHide, sidePanelResize, topologyWarningPanelDrag, topologyWarningPanelResize } = __appScope;
    if (sidePanelResize || topologyWarningPanelDrag || topologyWarningPanelResize) {
      return;
    }
    if (shouldIgnoreWorkspaceAutoHide(
      pointerRelatedTargetInside(event, ".floating-side-panel, .side-panel-edge-trigger"),
      pointerClientTargetInside(event, ".floating-side-panel, .side-panel-edge-trigger"),
      pointerInsideFloatingPanelBounds(event)
    )) {
      return;
    }
    if (projectRecordDragActiveRef.current) {
      return;
    }
    if (schemeRecordDragActiveRef.current) {
      return;
    }
    if (projectMenu) {
      return;
    }
    if (leftPanelMode === "auto") {
      setLeftPanelAutoVisible(false);
    }
    if (rightPanelMode === "auto") {
      setRightPanelAutoVisible(false);
    }
  };
}

export function createAppendDistinctStaticDrawingPoint(__appScope: Record<string, any>) {
  return (points: Point[], point: Point) => {
  const { sameOptionalPoint } = __appScope;
    const previous = points.at(-1);
    return previous && sameOptionalPoint(previous, point) ? points : [...points, point];
  };
}

export function createRenderStaticBoxDrawingPreview(__appScope: Record<string, any>) {
  return () => {
  const { MemoDeviceGlyph, activeLayerId, circle, colorDisplayMode, colorPalette, createStaticBoxNodeFromDrawing, formatSvgNumber, g, nodeGeometryTransform, rect, resolveNodeStateVisual, staticDrawing, staticDrawingPreviewPoints } = __appScope;
    if (!staticDrawing) {
      return null;
    }
    const points = staticDrawingPreviewPoints(staticDrawing);
    if (points.length < 2) {
      return (
        <g className="static-drawing-preview">
          {staticDrawing.points.map((point, index) => (
            <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
          ))}
        </g>
      );
    }
    const previewNode = createStaticBoxNodeFromDrawing(staticDrawing.template, points, activeLayerId);
    return (
      <g className="static-drawing-preview static-drawing-preview-box">
        <rect
          className="static-drawing-preview-rect"
          x={previewNode.position.x - previewNode.size.width / 2}
          y={previewNode.position.y - previewNode.size.height / 2}
          width={previewNode.size.width}
          height={previewNode.size.height}
        />
        <g transform={`translate(${formatSvgNumber(previewNode.position.x)} ${formatSvgNumber(previewNode.position.y)})`}>
          <g className="node-geometry" transform={nodeGeometryTransform(previewNode)}>
            <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(previewNode)} />
            <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(previewNode)} />
          </g>
        </g>
        {staticDrawing.points.map((point, index) => (
          <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
        ))}
      </g>
    );
  };
}

export function createStartInteractiveStaticDrawing(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, startPoint: Point) => {
  const { activateInspectorFromCanvas, clampPointToCanvas, requireEditMode, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setMode, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, writeOperationLog } = __appScope;
    if (!requireEditMode("绘制图元")) {
      return;
    }
    const pointer = clampPointToCanvas(startPoint);
    setMode("static-draw");
    setStaticDrawing({
      kind: template.kind,
      template,
      points: [pointer],
      previewPoint: pointer
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    activateInspectorFromCanvas();
    writeOperationLog(`开始绘制图元：${template.label}`);
  };
}

export function createCancelInteractiveStaticDrawing(__appScope: Record<string, any>) {
  return () => {
  const { setMode, setStaticDrawing, staticDrawing, writeOperationLog } = __appScope;
    if (!staticDrawing) {
      return;
    }
    setStaticDrawing(null);
    setMode("select");
    writeOperationLog("取消绘制图元");
  };
}

export function createFinishInteractiveStaticDrawing(__appScope: Record<string, any>) {
  return (finalPoint?: Point) => {
  const { activateInspectorFromCanvas, activeLayerId, appendDistinctStaticDrawingPoint, clampPointToCanvas, createInteractiveStaticDrawingNode, createStaticBoxNodeFromDrawing, edges, isStaticBoxLikeKind, nodes, pushUndoSnapshot, requireEditMode, setCanvasSelectionScope, setGraphArrays, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, staticDrawing, staticDrawingPreviewPoints, writeOperationLog } = __appScope;
    if (!requireEditMode("绘制图元")) {
      return;
    }
    if (!staticDrawing) {
      return;
    }
    const points = finalPoint
      ? appendDistinctStaticDrawingPoint(staticDrawing.points, clampPointToCanvas(finalPoint))
      : staticDrawingPreviewPoints(staticDrawing);
    if (points.length < 2) {
      writeOperationLog("绘制图元至少需要两个落点");
      return;
    }
    const node = isStaticBoxLikeKind(staticDrawing.kind)
      ? createStaticBoxNodeFromDrawing(staticDrawing.template, points, activeLayerId)
      : createInteractiveStaticDrawingNode(staticDrawing.template, points, activeLayerId);
    pushUndoSnapshot();
    setGraphArrays([...nodes, node], edges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setStaticDrawing(null);
    setMode("select");
    activateInspectorFromCanvas();
    writeOperationLog(`新增图元：${node.name}`);
  };
}

export function createAppendStaticDrawingPoint(__appScope: Record<string, any>) {
  return (point: Point, forceFinish = false) => {
  const { appendDistinctStaticDrawingPoint, clampPointToCanvas, finishInteractiveStaticDrawing, interactiveStaticDrawingNeedsExplicitFinish, setStaticDrawing, staticDrawing } = __appScope;
    if (!staticDrawing) {
      return;
    }
    const nextPoint = clampPointToCanvas(point);
    const nextPoints = appendDistinctStaticDrawingPoint(staticDrawing.points, nextPoint);
    if (forceFinish || (!interactiveStaticDrawingNeedsExplicitFinish(staticDrawing.kind) && nextPoints.length >= 2)) {
      finishInteractiveStaticDrawing(nextPoint);
      return;
    }
    setStaticDrawing({
      ...staticDrawing,
      points: nextPoints,
      previewPoint: nextPoint
    });
  };
}

export function createUpdateInteractiveStaticDrawingPreview(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { clampPointToCanvas, sameOptionalPoint, setStaticDrawing } = __appScope;
    const previewPoint = clampPointToCanvas(point);
    setStaticDrawing((current) => {
      if (!current || sameOptionalPoint(current.previewPoint, previewPoint)) {
        return current;
      }
      return { ...current, previewPoint };
    });
  };
}

export function createRenderInteractiveStaticDrawingPreview(__appScope: Record<string, any>) {
  return () => {
  const { circle, g, isStaticBoxLikeKind, path, renderStaticBoxDrawingPreview, staticDrawing, staticDrawingPathData, staticDrawingPreviewPoints } = __appScope;
    if (!staticDrawing) {
      return null;
    }
    if (isStaticBoxLikeKind(staticDrawing.kind)) {
      return renderStaticBoxDrawingPreview();
    }
    const points = staticDrawingPreviewPoints(staticDrawing);
    return (
      <g className="static-drawing-preview">
        {points.length >= 2 && <path d={staticDrawingPathData(points)} className="static-drawing-preview-line" />}
        {staticDrawing.points.map((point, index) => (
          <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
        ))}
      </g>
    );
  };
}

export function createStartLibraryDevicePlacement(__appScope: Record<string, any>) {
  return (template: DeviceTemplate) => {
  const { componentLibraryDisplayMode, hideLibraryFlyout, isRoutableLineDeviceKind, requireEditMode, resetConnectPreviewState, resetRoutableLinePreviewState, setConnectSource, setContextMenu, setLibraryPlacement, setMode, setRewiring, setRoutableLinePlacement, setStaticDrawing, writeOperationLog } = __appScope;
    if (!requireEditMode("放置图元")) {
      return;
    }
    if (isRoutableLineDeviceKind(template.kind)) {
      setRoutableLinePlacement({ template, source: null });
      resetRoutableLinePreviewState();
      setLibraryPlacement(null);
      setStaticDrawing(null);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setContextMenu(null);
      setMode("connect");
      if (componentLibraryDisplayMode === "right") {
        hideLibraryFlyout();
      }
      writeOperationLog(`进入线路绘制模式：${template.label}`);
      return;
    }
    setLibraryPlacement({ kind: "device", template, previewPoint: null });
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setStaticDrawing(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMode("select");
    if (componentLibraryDisplayMode === "right") {
      hideLibraryFlyout();
    }
    writeOperationLog(`进入图元绘制模式：${template.label}`);
  };
}

export function createStartLibraryGraphTemplatePlacement(__appScope: Record<string, any>) {
  return (template: GraphTemplate) => {
  const { requireEditMode, resetConnectPreviewState, resetRoutableLinePreviewState, setConnectSource, setContextMenu, setLibraryPlacement, setMode, setRewiring, setRoutableLinePlacement, setStaticDrawing, writeOperationLog } = __appScope;
    if (!requireEditMode("放置模板")) {
      return;
    }
    setLibraryPlacement({ kind: "graph-template", template, previewPoint: null });
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setStaticDrawing(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMode("select");
    writeOperationLog(`进入模板绘制模式：${template.typeName} / ${template.name}`);
  };
}

export function createCancelLibraryPlacement(__appScope: Record<string, any>) {
  return () => {
  const { resetRoutableLinePreviewState, setContextMenu, setLibraryPlacement, setMode, setRoutableLinePlacement } = __appScope;
    setLibraryPlacement(null);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    setContextMenu(null);
  };
}

export function createUpdateLibraryPlacementPreview(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { clampPointToCanvas, sameOptionalPoint, setLibraryPlacement } = __appScope;
    const previewPoint = clampPointToCanvas(point);
    setLibraryPlacement((current) => {
      if (!current || (current.previewPoint && sameOptionalPoint(current.previewPoint, previewPoint))) {
        return current;
      }
      return { ...current, previewPoint };
    });
  };
}

export function createClearLibraryPlacementPreview(__appScope: Record<string, any>) {
  return () => {
  const { setLibraryPlacement } = __appScope;
    setLibraryPlacement((current) => current?.previewPoint ? { ...current, previewPoint: null } : current);
  };
}

export function createPlaceLibraryDeviceAtPoint(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, pointerPosition: Point) => {
  const { CANVAS_AUTO_EXPAND_PADDING, activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, clampNodePositionToBounds, clampPointToBounds, createNodeFromTemplate, deviceIndexCounters, edges, hasCanvasOriginShift, isInteractiveStaticDrawingKind, isRoutableLineDeviceKind, isStaticBoxLikeKind, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, nodes, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, requireEditMode, routeRoutableLineDevice, setCanvasSelectionScope, setDeviceIndexCounters, setGraphArrays, setLibraryPlacement, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, startInteractiveStaticDrawing, startLibraryDevicePlacement, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = __appScope;
    if (!requireEditMode("放置图元")) {
      return;
    }
    const kind = template.kind;
    if (isRoutableLineDeviceKind(kind)) {
      startLibraryDevicePlacement(template);
      return;
    }
    if (isInteractiveStaticDrawingKind(kind) || isStaticBoxLikeKind(kind)) {
      startInteractiveStaticDrawing(template, pointerPosition);
      return;
    }
    const position = { x: pointerPosition.x, y: pointerPosition.y };
    const createdNode = { ...createNodeFromTemplate(template, position), layerId: activeLayerId };
    const rawNode = isRoutableLineDeviceKind(createdNode.kind)
      ? routeRoutableLineDevice(createdNode, [...nodes, createdNode], canvasBounds)
      : createdNode;
    if (rejectAutoCanvasExpansionForContent([...nodes, rawNode], edges)) {
      setLibraryPlacement(null);
      setMode("select");
      return;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, rawNode], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const node = translateNodeBy(rawNode, dropOriginShift);
    const shiftedPointerPosition = translatePointBy(pointerPosition, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, node],
      dropSourceEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges);
    }
    const placedNode = { ...node, position: clampNodePositionToBounds(node, dropCanvasBounds, shiftedPointerPosition) };
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    const indexed = assignPermanentDeviceIndex(placedNode, deviceIndexCounters);
    pushUndoSnapshot();
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([indexed.node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    activateInspectorFromCanvas();
    writeOperationLog(`新增图元：${indexed.node.name}`);
  };
}

export function createCommitLibraryPlacementAtPoint(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { dropGraphTemplate, libraryPlacement, placeLibraryDeviceAtPoint, requireEditMode, setLibraryPlacement } = __appScope;
    if (!requireEditMode("放置图元")) {
      return;
    }
    if (!libraryPlacement) {
      return;
    }
    const placement = libraryPlacement;
    setLibraryPlacement(null);
    if (placement.kind === "graph-template") {
      dropGraphTemplate(placement.template, point);
      return;
    }
    placeLibraryDeviceAtPoint(placement.template, point);
  };
}

export function createRenderLibraryPlacementPreview(__appScope: Record<string, any>) {
  return () => {
  const { MemoDeviceGlyph, activeLayerId, canvasClipboardBounds, colorDisplayMode, colorPalette, createNodeFromTemplate, formatSvgNumber, g, libraryPlacement, nodeGeometryTransform, path, pointsToPreviewPath, renderNodePreviewImageContent, resolveNodeStateVisual } = __appScope;
    if (!libraryPlacement?.previewPoint) {
      return null;
    }
    const previewPoint = libraryPlacement.previewPoint;
    if (libraryPlacement.kind === "device") {
      const previewNode = { ...createNodeFromTemplate(libraryPlacement.template, previewPoint), layerId: activeLayerId };
      return (
        <g className="library-placement-preview library-placement-preview-device">
          <g transform={`translate(${formatSvgNumber(previewNode.position.x)} ${formatSvgNumber(previewNode.position.y)})`}>
            <g transform={nodeGeometryTransform(previewNode)}>
              <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(previewNode)} />
              <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(previewNode)} />
            </g>
            {renderNodePreviewImageContent(previewNode, `library-placement-preview-clip-${libraryPlacement.template.kind.replace(/[^A-Za-z0-9_-]/g, "-")}`)}
          </g>
        </g>
      );
    }
    const bounds = canvasClipboardBounds(libraryPlacement.template.clipboard);
    if (!bounds) {
      return null;
    }
    const targetTopLeft = {
      x: previewPoint.x - libraryPlacement.template.sourceSize.width / 2,
      y: previewPoint.y - libraryPlacement.template.sourceSize.height / 2
    };
    const offset = { x: targetTopLeft.x - bounds.left, y: targetTopLeft.y - bounds.top };
    return (
      <g className="library-placement-preview library-placement-preview-template" transform={`translate(${formatSvgNumber(offset.x)} ${formatSvgNumber(offset.y)})`}>
        {libraryPlacement.template.clipboard.edges.map((item) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            className="library-placement-preview-line"
          />
        ))}
        {libraryPlacement.template.clipboard.nodes.map((node) => (
          <g key={node.id} transform={`translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})`}>
            <g transform={nodeGeometryTransform(node)}>
              <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
              <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
            </g>
            {renderNodePreviewImageContent(node, `library-placement-template-preview-clip-${node.id}`)}
          </g>
        ))}
      </g>
    );
  };
}

export function createStartSidePanelResize(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLDivElement>, side: SidePanelSide) => {
  const { leftPanelWidth, rightPanelWidth, setSidePanelResize } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    setSidePanelResize({
      side,
      startX: event.clientX,
      startWidth: side === "left" ? leftPanelWidth : rightPanelWidth
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartCanvasResize(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>, edge: CanvasResizeEdge) => {
  const { canvasBoundsRef, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasHorizontalScrollbarsActive, canvasResizeUndoCapturedRef, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasVerticalScrollbarsActive, clearCanvasBoundsScrollSyncPending, minimumCanvasBoundsForResizeEdge, pendingCanvasResizeCommitAnchorRef, requireEditMode, setCanvasResizeDrag, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!requireEditMode("调整画布边界")) {
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    const currentCanvasBounds = canvasBoundsRef.current;
    canvasResizeUndoCapturedRef.current = false;
    clearCanvasBoundsScrollSyncPending();
    pendingCanvasResizeCommitAnchorRef.current = null;
    setCanvasResizeDrag({
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: currentCanvasBounds.width,
      startHeight: currentCanvasBounds.height,
      startDisplayWidth: canvasDisplayWidth,
      startDisplayHeight: canvasDisplayHeight,
      startDisplayOffsetX: canvasDisplayOffsetX,
      startDisplayOffsetY: canvasDisplayOffsetY,
      startScrollLeft: canvasFrameRef.current?.scrollLeft ?? 0,
      startScrollTop: canvasFrameRef.current?.scrollTop ?? 0,
      startScrollSurfaceWidth: canvasScrollSurfaceWidth,
      startScrollSurfaceHeight: canvasScrollSurfaceHeight,
      startHorizontalScrollbarsActive: canvasHorizontalScrollbarsActive,
      startVerticalScrollbarsActive: canvasVerticalScrollbarsActive,
      unitsPerCssX: svgRect.width > 0 ? currentCanvasBounds.width / svgRect.width : 1,
      unitsPerCssY: svgRect.height > 0 ? currentCanvasBounds.height / svgRect.height : 1,
      minBounds: minimumCanvasBoundsForResizeEdge(edge)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartCanvasResizeFromRightOverlay(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssX = canvasBounds.width / svgRect.width;
    const handleHalfWidthCss = unitsPerCssX > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssX
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const rightEdgeHotspot = Math.max(10, handleHalfWidthCss + 3);
    const insideRightEdge =
      Math.abs(event.clientX - svgRect.right) <= rightEdgeHotspot &&
      event.clientY >= svgRect.top &&
      event.clientY <= svgRect.bottom;
    if (!insideRightEdge) {
      return false;
    }
    startCanvasResize(event, "right");
    return true;
  };
}

export function createStartCanvasResizeFromLeftOverlay(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssX = canvasBounds.width / svgRect.width;
    const handleHalfWidthCss = unitsPerCssX > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssX
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const leftEdgeHotspot = Math.max(10, handleHalfWidthCss + 3);
    const insideLeftEdge =
      Math.abs(event.clientX - svgRect.left) <= leftEdgeHotspot &&
      event.clientY >= svgRect.top &&
      event.clientY <= svgRect.bottom;
    if (!insideLeftEdge) {
      return false;
    }
    startCanvasResize(event, "left");
    return true;
  };
}

export function createStartCanvasResizeFromBottomOverlay(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssY = canvasBounds.height / svgRect.height;
    const handleHalfHeightCss = unitsPerCssY > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssY
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const bottomEdgeHotspot = Math.max(10, handleHalfHeightCss + 3);
    const insideBottomEdge =
      Math.abs(event.clientY - svgRect.bottom) <= bottomEdgeHotspot &&
      event.clientX >= svgRect.left &&
      event.clientX <= svgRect.right;
    if (!insideBottomEdge) {
      return false;
    }
    startCanvasResize(event, "bottom");
    return true;
  };
}

export function createStartCanvasResizeFromTopOverlay(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssY = canvasBounds.height / svgRect.height;
    const handleHalfHeightCss = unitsPerCssY > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssY
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const topEdgeHotspot = Math.max(10, handleHalfHeightCss + 3);
    const insideTopEdge =
      Math.abs(event.clientY - svgRect.top) <= topEdgeHotspot &&
      event.clientX >= svgRect.left &&
      event.clientX <= svgRect.right;
    if (!insideTopEdge) {
      return false;
    }
    startCanvasResize(event, "top");
    return true;
  };
}

export function createStartStatusbarResize(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLDivElement>) => {
  const { setStatusbarResize, statusbarHeight } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    setStatusbarResize({
      startY: event.clientY,
      startHeight: statusbarHeight
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createCurrentTopologyWarningPanelRect(__appScope: Record<string, any>) {
  return () => {
  const { CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_WIDTH, TOPOLOGY_WARNING_PANEL_MARGIN, rightPanelVisible, rightPanelWidth, statusbarHeight, topologyWarningPanelHeight, topologyWarningPanelRef, topologyWarningPanelWidth } = __appScope;
    const rect = topologyWarningPanelRef.current?.getBoundingClientRect();
    return rect
      ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        }
      : {
          left: Math.max(
            TOPOLOGY_WARNING_PANEL_MARGIN,
            window.innerWidth -
              (rightPanelVisible ? rightPanelWidth + 28 : 16) -
              CANVAS_MINIMAP_WIDTH -
              TOPOLOGY_WARNING_PANEL_MARGIN -
              topologyWarningPanelWidth
          ),
          top: Math.max(
            TOPOLOGY_WARNING_PANEL_MARGIN,
            window.innerHeight - statusbarHeight - 14 - CANVAS_MINIMAP_HEIGHT
          ),
          width: topologyWarningPanelWidth,
          height: topologyWarningPanelHeight
        };
  };
}

export function createStartTopologyWarningPanelDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement>) => {
  const { currentTopologyWarningPanelRect, setTopologyWarningPanelDrag, setTopologyWarningPanelPosition } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const rect = currentTopologyWarningPanelRect();
    setTopologyWarningPanelPosition({ left: rect.left, top: rect.top });
    setTopologyWarningPanelDrag({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartTopologyWarningPanelResize(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLDivElement>) => {
  const { currentTopologyWarningPanelRect, setTopologyWarningPanelPosition, setTopologyWarningPanelResize } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const rect = currentTopologyWarningPanelRect();
    setTopologyWarningPanelPosition({ left: rect.left, top: rect.top });
    setTopologyWarningPanelResize({
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

export function createRenderSidePanelModeControls(__appScope: Record<string, any>) {
  return (side: SidePanelSide) => {
  const { EyeOff, MousePointer2, Pin, button, div, leftPanelMode, rightPanelMode, setSidePanelMode } = __appScope;
    const mode = side === "left" ? leftPanelMode : rightPanelMode;
    const label = side === "left" ? "左侧栏" : "右侧栏";
    const options: Array<{ mode: SidePanelMode; title: string; icon: typeof Pin }> = [
      { mode: "pinned", title: `${label}永久显示`, icon: Pin },
      { mode: "auto", title: `${label}自动显示/隐藏`, icon: MousePointer2 },
      { mode: "hidden", title: `${label}永久隐藏`, icon: EyeOff }
    ];
    return (
      <div className="side-panel-mode-controls" role="group" aria-label={`${label}显示模式`}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              type="button"
              key={option.mode}
              className={mode === option.mode ? "active" : ""}
              title={option.title}
              aria-label={option.title}
              onClick={() => setSidePanelMode(side, option.mode)}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    );
  };
}

export function createRenderSidePanelEdgeTrigger(__appScope: Record<string, any>) {
  return (side: SidePanelSide) => {
  const { PanelLeftOpen, PanelRightOpen, button, div, leftPanelMode, leftPanelVisible, rightPanelMode, rightPanelVisible, setSidePanelMode, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, updateAutoPanelVisibility } = __appScope;
    const mode = side === "left" ? leftPanelMode : rightPanelMode;
    const visible = side === "left" ? leftPanelVisible : rightPanelVisible;
    if (visible) {
      return null;
    }
    const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
    const label = side === "left" ? "显示左侧栏" : "显示右侧栏";
    return (
      <div
        className={`side-panel-edge-trigger ${side} mode-${mode}`}
        onPointerEnter={() => updateAutoPanelVisibility(side, "edge-enter")}
      >
        <button
          type="button"
          title={mode === "hidden" ? `${label}并切换为永久显示` : label}
          aria-label={label}
          onPointerEnter={() => updateAutoPanelVisibility(side, "edge-enter")}
          onPointerDown={(event) => {
            if (side === "left" && startCanvasResizeFromLeftOverlay(event)) {
              return;
            }
            if (side === "right" && startCanvasResizeFromRightOverlay(event)) {
              return;
            }
          }}
          onClick={() => {
            if (mode === "hidden") {
              setSidePanelMode(side, "pinned");
            } else {
              updateAutoPanelVisibility(side, "edge-enter");
            }
          }}
        >
          <Icon size={17} />
        </button>
      </div>
    );
  };
}

export function createNormalizeStaticBoxDimension(__appScope: Record<string, any>) {
  return (value: number, fallback: number, max: number) => {
  const { clampNumber } = __appScope;
    const nextValue = Number.isFinite(value) ? value : fallback;
    return Math.round(clampNumber(nextValue, 4, max) * 10) / 10;
  };
}

export function createToLocalNodePoint(__appScope: Record<string, any>) {
  return (node: ModelNode, point: Point): Point => {
    const radians = degreesToRadians(-node.rotation);
    const dx = point.x - node.position.x;
    const dy = point.y - node.position.y;
    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians)
    };
  };
}

export function createSingleTransformNodeUpdate(__appScope: Record<string, any>) {
  return (drag: SingleTransformDrag, point: Point, store: GraphStore, snapRotation: boolean): ModelNode | null => {
  const { normalizeRotationDegrees, rotationDeltaBetweenTransformPoints, singleTransformBaseNode } = __appScope;
    const node = store.nodeMap.get(drag.nodeId);
    if (!node || drag.kind !== "rotate") {
      return null;
    }
    const baseNode = singleTransformBaseNode(drag, node);
    const rotationDelta = rotationDeltaBetweenTransformPoints(baseNode.position, drag.startPoint, point, snapRotation);
    return {
      ...node,
      position: baseNode.position,
      rotation: normalizeRotationDegrees(baseNode.rotation + rotationDelta),
      scale: baseNode.scale,
      scaleX: baseNode.scaleX,
      scaleY: baseNode.scaleY
    };
  };
}

export function createSignedScaleFromRotatedHandleDelta(__appScope: Record<string, any>) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
  const { getNodeScaleX, getNodeScaleY, signedScale, toLocalNodePoint } = __appScope;
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const startLocal = toLocalNodePoint(baseNode, drag.startPoint);
    const currentLocal = toLocalNodePoint(baseNode, point);
    const localDelta = localScaleKind === "scale-x"
      ? currentLocal.x - startLocal.x
      : currentLocal.y - startLocal.y;
    const localDirection = localScaleKind === "scale-x"
      ? drag.handleXDirection || Math.sign(startLocal.x) || 1
      : drag.handleYDirection || Math.sign(startLocal.y) || 1;
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (localDelta * localDirection * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };
}

export function createSignedScaleFromUprightHandleDelta(__appScope: Record<string, any>) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
  const { getNodeScaleX, getNodeScaleY, signedScale } = __appScope;
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const screenDelta = localScaleKind === "scale-x"
      ? (point.x - drag.startPoint.x) * (drag.handleXDirection || 1)
      : (point.y - drag.startPoint.y) * (drag.handleYDirection || 1);
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (screenDelta * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };
}

export function createProportionalSignedScaleFromHandleDelta(__appScope: Record<string, any>) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode
  ) => {
  const { getNodeScaleX, getNodeScaleY, projectedProportionalScaleFromHandleDelta, signedScale, toLocalNodePoint } = __appScope;
    const currentSignedScaleX = getNodeScaleX(baseNode);
    const currentSignedScaleY = getNodeScaleY(baseNode);
    const startLocal = toLocalNodePoint(baseNode, drag.startPoint);
    const currentLocal = toLocalNodePoint(baseNode, point);
    const currentScale = Math.max(Math.abs(currentSignedScaleX), Math.abs(currentSignedScaleY));
    const nextScale = projectedProportionalScaleFromHandleDelta({
      currentScale,
      width: baseNode.size.width,
      height: baseNode.size.height,
      handleXDirection: drag.handleXDirection,
      handleYDirection: drag.handleYDirection,
      deltaX: currentLocal.x - startLocal.x,
      deltaY: currentLocal.y - startLocal.y
    });
    return {
      scale: nextScale,
      scaleX: signedScale(nextScale, currentSignedScaleX),
      scaleY: signedScale(nextScale, currentSignedScaleY)
    };
  };
}

export function createProportionalSignedScaleFromUprightHandleDelta(__appScope: Record<string, any>) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode
  ) => {
  const { getNodeScaleX, getNodeScaleY, projectedProportionalScaleFromHandleDelta, signedScale } = __appScope;
    const currentSignedScaleX = getNodeScaleX(baseNode);
    const currentSignedScaleY = getNodeScaleY(baseNode);
    const currentScale = Math.max(Math.abs(currentSignedScaleX), Math.abs(currentSignedScaleY));
    const nextScale = projectedProportionalScaleFromHandleDelta({
      currentScale,
      width: baseNode.size.width,
      height: baseNode.size.height,
      handleXDirection: drag.handleXDirection,
      handleYDirection: drag.handleYDirection,
      deltaX: point.x - drag.startPoint.x,
      deltaY: point.y - drag.startPoint.y
    });
    return {
      scale: nextScale,
      scaleX: signedScale(nextScale, currentSignedScaleX),
      scaleY: signedScale(nextScale, currentSignedScaleY)
    };
  };
}

export function createCurrentStoredRoutePointsForEdge(__appScope: Record<string, any>) {
  return (edge: Edge | undefined, bounds?: CanvasBounds) => {
  const { canvasBounds, compactPreviewNodes, edgeSnapshotFallbackPoints, endpointMatchedRoutePointsForEdge, endpointMatchedStoredRoutePoints, nodeById, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routeEdgesForStoredRendering, routedEdgeById } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    if (!edge) {
      return [];
    }
    const storedRoute = endpointMatchedStoredRoutePoints(edge);
    if (storedRoute.length) {
      return storedRoute;
    }
    const cachedRoute =
      !pendingStoredRouteEdgeIdsRef.current.has(edge.id) && !pendingRouteEdgeIdsRef.current.has(edge.id)
        ? routedEdgeById.get(edge.id)
        : undefined;
    const matchedCachedRoute = endpointMatchedRoutePointsForEdge(edge, cachedRoute?.points);
    if (matchedCachedRoute.length) {
      return matchedCachedRoute;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && target) {
      const route = routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], bounds)[0];
      if (route?.points.length) {
        return route.points.map((point) => ({ ...point }));
      }
    }
    return (routedEdgeById.get(edge.id)?.points ?? edgeSnapshotFallbackPoints(edge)).map((point) => ({ ...point }));
  };
}

export function createBuildMirrorLayoutUnitEdgeUpdates(__appScope: Record<string, any>) {
  return (
    units: CanvasLayoutUnit[],
    currentEdges: Edge[],
    axis: "horizontal" | "vertical"
  ) => {
  const { currentStoredRoutePointsForEdge, edgeById, edges, mirrorPointAcrossAxis, selectionRectCenter } = __appScope;
    const currentEdgeById = currentEdges === edges ? edgeById : new Map(currentEdges.map((edge) => [edge.id, edge]));
    const updates = new Map<string, Edge>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      const unitNodeIds = new Set(unit.nodeIds);
      for (const edgeId of unit.edgeIds) {
        if (updates.has(edgeId)) {
          continue;
        }
        const edge = currentEdgeById.get(edgeId);
        if (!edge || !unitNodeIds.has(edge.sourceId) || !unitNodeIds.has(edge.targetId)) {
          continue;
        }
        const routePoints = currentStoredRoutePointsForEdge(edge);
        if (routePoints.length < 2) {
          continue;
        }
        const points = routePoints.map((point) => mirrorPointAcrossAxis(point, center, axis));
        updates.set(edge.id, {
          ...edge,
          sourcePoint: { ...points[0] },
          targetPoint: { ...points[points.length - 1] },
          manualPoints: points.slice(1, -1).map((point) => ({ ...point }))
        });
      }
    }
    return Array.from(updates.values());
  };
}

export function createBuildRotateLayoutUnitEdgeUpdates(__appScope: Record<string, any>) {
  return (
    units: CanvasLayoutUnit[],
    currentEdges: Edge[],
    degrees: number
  ) => {
  const { currentStoredRoutePointsForEdge, edgeById, edges, rotatePointAround, selectionRectCenter } = __appScope;
    const currentEdgeById = currentEdges === edges ? edgeById : new Map(currentEdges.map((edge) => [edge.id, edge]));
    const updates = new Map<string, Edge>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      const unitNodeIds = new Set(unit.nodeIds);
      for (const edgeId of unit.edgeIds) {
        if (updates.has(edgeId)) {
          continue;
        }
        const edge = currentEdgeById.get(edgeId);
        if (!edge || !unitNodeIds.has(edge.sourceId) || !unitNodeIds.has(edge.targetId)) {
          continue;
        }
        const routePoints = currentStoredRoutePointsForEdge(edge);
        if (routePoints.length < 2) {
          continue;
        }
        const points = routePoints.map((point) => rotatePointAround(point, center, degrees));
        updates.set(edge.id, {
          ...edge,
          sourcePoint: { ...points[0] },
          targetPoint: { ...points[points.length - 1] },
          manualPoints: points.slice(1, -1).map((point) => ({ ...point }))
        });
      }
    }
    return Array.from(updates.values());
  };
}

export function createBuildGroupTransformEdgeUpdates(__appScope: Record<string, any>) {
  return (drag: GroupTransformDrag, point: Point, store: GraphStore, options?: { snapRotation?: boolean }) => {
  const { groupTransformGeometry, transformGroupPoint } = __appScope;
    const geometry = groupTransformGeometry(drag, point, options);
    const transformedNodeIdSet = new Set(drag.nodeIds);
    return drag.originalEdgeRoutes.flatMap((route) => {
      const edge = store.edgeMap.get(route.edgeId);
      if (!edge || !transformedNodeIdSet.has(edge.sourceId) || !transformedNodeIdSet.has(edge.targetId)) {
        return [];
      }
      const points = route.points.map((routePoint) => transformGroupPoint(drag, geometry, routePoint));
      if (points.length < 2) {
        return [];
      }
      return [{
        ...edge,
        sourcePoint: { ...points[0] },
        targetPoint: { ...points[points.length - 1] },
        manualPoints: points.slice(1, -1).map((routePoint) => ({ ...routePoint }))
      }];
    });
  };
}

export function createOverlayEdgeUpdatesForTransform(__appScope: Record<string, any>) {
  return (sourceEdges: Edge[], edgeUpdates: Edge[]) => {
    if (edgeUpdates.length === 0) {
      return sourceEdges;
    }
    const edgeUpdateById = new Map(edgeUpdates.map((edge) => [edge.id, edge]));
    let changed = false;
    const nextEdges = sourceEdges.map((edge) => {
      const update = edgeUpdateById.get(edge.id);
      if (!update) {
        return edge;
      }
      changed = true;
      return update;
    });
    return changed ? nextEdges : sourceEdges;
  };
}

export function createStartGroupTransformDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGElement>, unit: CanvasLayoutUnit, kind: "rotate" | ScaleHandleKind) => {
  const { TRANSFORM_ROTATE_HANDLE_GAP, clampPointToCanvas, hasCanvasSelectionModifier, requireEditMode, screenToSvgPoint, selectionRectCenter, setTransformDrag, snapshotGroupTransformEdgeRoutes, snapshotGroupTransformNodes, startModifierSelectionPress, svgRef, transformDragChangedRef } = __appScope;
    event.stopPropagation();
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "selection", nodeIds: unit.nodeIds, edgeIds: unit.edgeIds });
      return;
    }
    if (!requireEditMode("拖拽图元")) {
      return;
    }
    if (kind !== "rotate" && kind !== "scale-both") {
      return;
    }
    const center = selectionRectCenter(unit.bounds);
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...center };
    transformDragChangedRef.current = false;
    setTransformDrag({
      kind,
      groupId: unit.id.replace(/^group:/, ""),
      nodeIds: unit.nodeIds,
      bounds: unit.bounds,
      center,
      startPoint,
      rotationStartPoint: kind === "rotate" ? { x: center.x, y: unit.bounds.top - TRANSFORM_ROTATE_HANDLE_GAP } : undefined,
      originalNodes: snapshotGroupTransformNodes(unit),
      originalEdgeRoutes: snapshotGroupTransformEdgeRoutes(unit),
      proportionalScale: kind !== "rotate",
      handleXDirection: kind === "rotate" ? 0 : startPoint.x >= center.x ? 1 : -1,
      handleYDirection: kind === "rotate" ? 0 : startPoint.y >= center.y ? 1 : -1
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartSingleTransformDrag(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGElement>,
    node: ModelNode,
    kind: "rotate" | ScaleHandleKind,
    handle?: ScaleHandleConfig
  ) => {
  const { TRANSFORM_ROTATE_HANDLE_GAP, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_STEM_START, clampPointToCanvas, hasCanvasSelectionModifier, nodeForegroundImage, nodeImage, nodeKindAllowsResizeTransform, nodeRotateHandleControlPoints, nodeUprightRotateHandleControlPoints, nodeUsesUprightStaticSelectionOutline, requireEditMode, screenToSvgPoint, setTransformDrag, snapshotSingleTransformNode, startModifierSelectionPress, svgRef, transformDragChangedRef } = __appScope;
    event.stopPropagation();
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    if (!requireEditMode("拖拽图元")) {
      return;
    }
    if (kind !== "rotate" && kind !== "scale-both" && !nodeKindAllowsResizeTransform(node.kind)) {
      return;
    }
    transformDragChangedRef.current = false;
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...node.position };
    const uprightStaticSelection = nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node));
    const rotateHandleStart = (
      uprightStaticSelection
        ? nodeUprightRotateHandleControlPoints(node, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
        : nodeRotateHandleControlPoints(node, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
    ).handle;
    setTransformDrag({
      kind,
      nodeId: node.id,
      originalNode: snapshotSingleTransformNode(node),
      startPoint,
      rotationStartPoint: kind === "rotate"
        ? { x: node.position.x + rotateHandleStart.x, y: node.position.y + rotateHandleStart.y }
        : undefined,
      handleXDirection: handle?.xDirection,
      handleYDirection: handle?.yDirection,
      uprightStaticSelection: nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node))
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartGroupMoveDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGRectElement>, unit: CanvasLayoutUnit) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, activeSelectedNodeIds, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clampPointToCanvas, clearNodeDragMoveSchedule, connectSource, createCanvasSelectionSnapshot, dragUndoCapturedRef, edgeListForNodeIds, expandActiveGroupSelection, groupExpandedCanvasSelection, hasCanvasSelectionModifier, isMultiNodeMoveState, isWholeActiveLayerMove, mode, movableCanvasNodeIds, nodeById, requireEditMode, routePointsSnapshotForMove, screenToSvgPoint, setCanvasSelectionScope, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, snapshotRouteBounds, startDraggingState, startModifierSelectionPress, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || mode === "connect" || connectSource) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "selection", nodeIds: unit.nodeIds, edgeIds: unit.edgeIds });
      return;
    }
    if (!requireEditMode("拖拽图元")) {
      return;
    }
    if (unit.nodeIds.length === 0 || unit.nodeIds.some((nodeId) => !activeLayerNodeIdSet.has(nodeId))) {
      return;
    }
    activateInspectorFromCanvas();
    const currentGroupSelectionContainsUnit =
      canvasSelectionScope === "group" && unit.nodeIds.every((nodeId) => activeSelectedNodeIds.includes(nodeId));
    const dragSelection = currentGroupSelectionContainsUnit
      ? {
          nodeIds: groupExpandedCanvasSelection.nodeIds,
          edgeIds: groupExpandedCanvasSelection.edgeIds
        }
      : expandActiveGroupSelection(unit.nodeIds, []);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(dragSelection.nodeIds);
    setSelectedEdgeIds(dragSelection.edgeIds);
    setSelectedEdgeId(dragSelection.edgeIds[0] ?? "");
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const dragNodeIds = movableCanvasNodeIds(dragSelection.nodeIds);
    if (dragNodeIds.length === 0) {
      return;
    }
    const edgeIdsForDrag = dragSelection.edgeIds;
    const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag);
    const wholeLayerMove = isWholeActiveLayerMove(dragNodeIds);
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag);
    const nextDragging: DraggingState = {
      source: "pointer",
      nodeIds: dragNodeIds,
      edgeIds: edgeIdsForDrag,
      affectedEdges: affectedEdgesForDrag,
      wholeLayerMove,
      startPoint: point,
      originalPositions: originalPositionsForDrag,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForDrag.map((edge) => [
          edge.id,
          {
            sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
            manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
            routePoints: edge.routePoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForDrag),
      singleNodeDragCache: buildSingleNodeDragCache(dragNodeIds, edgeIdsForDrag, affectedEdgesForDrag),
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined,
      selection: createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "")
    };
    startDraggingState(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createBuildGroupTransformNodeUpdates(__appScope: Record<string, any>) {
  return (drag: GroupTransformDrag, point: Point, store: GraphStore, options?: { snapRotation?: boolean }) => {
  const { groupTransformGeometry, normalizeRotationDegrees, transformGroupPoint } = __appScope;
    const updates: ModelNode[] = [];
    const geometry = groupTransformGeometry(drag, point, options);
    if (geometry.kind === "rotate") {
      for (const nodeId of drag.nodeIds) {
        const snapshot = drag.originalNodes[nodeId];
        const node = store.nodeMap.get(nodeId);
        if (!node || !snapshot) {
          continue;
        }
        updates.push({
          ...node,
          position: transformGroupPoint(drag, geometry, snapshot.position),
          rotation: normalizeRotationDegrees(snapshot.rotation + geometry.degrees)
        });
      }
      return updates;
    }

    for (const nodeId of drag.nodeIds) {
      const snapshot = drag.originalNodes[nodeId];
      const node = store.nodeMap.get(nodeId);
      if (!node || !snapshot) {
        continue;
      }
      const nextScaleX = (snapshot.scaleX ?? snapshot.scale ?? 1) * geometry.scaleX;
      const nextScaleY = (snapshot.scaleY ?? snapshot.scale ?? 1) * geometry.scaleY;
      updates.push({
        ...node,
        position: transformGroupPoint(drag, geometry, snapshot.position),
        scale: Math.max(Math.abs(nextScaleX), Math.abs(nextScaleY)),
        scaleX: nextScaleX,
        scaleY: nextScaleY
      });
    }
    return updates;
  };
}

export function createRotateLayoutUnitNodeUpdates(__appScope: Record<string, any>) {
  return (
    units: CanvasLayoutUnit[],
    degrees: number,
    store?: GraphStore
  ) => {
  const { graphStore, normalizeRotationDegrees, rotatePointAround, selectionRectCenter } = __appScope;
    if (store === undefined) {
      store = graphStore;
    }
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = store.nodeMap.get(nodeId);
        if (!node) {
          continue;
        }
        updates.set(nodeId, {
          ...node,
          position: unit.kind === "group" ? rotatePointAround(node.position, center, degrees) : node.position,
          rotation: normalizeRotationDegrees(node.rotation + degrees)
        });
      }
    }
    return Array.from(updates.values());
  };
}

export function createMirrorLayoutUnitNodeUpdates(__appScope: Record<string, any>) {
  return (
    units: CanvasLayoutUnit[],
    axis: "horizontal" | "vertical",
    store?: GraphStore
  ) => {
  const { getNodeScaleX, getNodeScaleY, graphStore, mirrorPointAcrossAxis, normalizeRotationDegrees, selectionRectCenter } = __appScope;
    if (store === undefined) {
      store = graphStore;
    }
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = store.nodeMap.get(nodeId);
        if (!node) {
          continue;
        }
        const mirroredPosition =
          unit.kind === "group"
            ? mirrorPointAcrossAxis(node.position, center, axis)
            : node.position;
        const mirroredNode = { ...node, position: mirroredPosition, rotation: normalizeRotationDegrees(-node.rotation) };
        updates.set(
          nodeId,
          axis === "horizontal"
            ? { ...mirroredNode, scaleX: -getNodeScaleX(node) }
            : { ...mirroredNode, scaleY: -getNodeScaleY(node) }
        );
      }
    }
    return Array.from(updates.values());
  };
}

export function createBusAnchorFromEvent(__appScope: Record<string, any>) {
  return (node: ModelNode, event: PointerEvent<SVGGElement | SVGCircleElement>): Point | undefined => {
  const { busAnchorFromPoint, clampPointToCanvas, isBusNode, screenToSvgPoint, svgRef } = __appScope;
    if (!isBusNode(node) || !svgRef.current) {
      return undefined;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    return busAnchorFromPoint(node, point);
  };
}

export function createBusAnchorFromPoint(__appScope: Record<string, any>) {
  return (node: ModelNode, point: Point): Point | undefined => {
  const { isBusNode, projectPointToBusCenterline } = __appScope;
    if (!isBusNode(node)) {
      return undefined;
    }
    return projectPointToBusCenterline(node, point);
  };
}

export function createIsPointOnBus(__appScope: Record<string, any>) {
  return (node: ModelNode, point: Point) => {
  const { isPointNearBus } = __appScope;
    return isPointNearBus(node, point, 0);
  };
}

export function createIsPointNearBus(__appScope: Record<string, any>) {
  return (node: ModelNode, point: Point, tolerance = 0) => {
  const { pointOnBusForSnap } = __appScope;
    return Boolean(pointOnBusForSnap(node, point, tolerance));
  };
}

export function createFindRewireTargetAtPoint(__appScope: Record<string, any>) {
  return (point: Point, state: Exclude<RewiringState, null>) => {
  const { CONNECT_BUS_SNAP_TOLERANCE, CONNECT_TERMINAL_SNAP_TOLERANCE, activeLayerEdgeIdSet, busAnchorFromPoint, canConnectTerminals, connectTargetSearchBounds, edgeById, getTerminalPoint, isBusNode, isPointNearBus, queryNodeSpatialIndex, visibleNodeById, visibleNodeSpatialIndex } = __appScope;
    const edge = edgeById.get(state.edgeId);
    if (!edge) {
      return null;
    }
    if (!activeLayerEdgeIdSet.has(edge.id)) {
      return null;
    }
    const otherNode = visibleNodeById.get(state.endpoint === "source" ? edge.targetId : edge.sourceId);
    const otherTerminalId = state.endpoint === "source" ? edge.targetTerminalId : edge.sourceTerminalId;
    if (!otherNode || !otherTerminalId) {
      return null;
    }
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (node.id === otherNode.id) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE && canConnectTerminals(node, terminal.id, otherNode, otherTerminalId)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };
}

export function createFindConnectTargetAtPoint(__appScope: Record<string, any>) {
  return (point: Point): ConnectTarget | null => {
  const { CONNECT_BUS_SNAP_TOLERANCE, CONNECT_TERMINAL_SNAP_TOLERANCE, activeLayerNodeIdSet, busAnchorFromPoint, canConnectTerminals, connectSource, connectTargetSearchBounds, getTerminalPoint, isBusNode, isPointNearBus, queryNodeSpatialIndex, visibleNodeById, visibleNodeSpatialIndex } = __appScope;
    if (!connectSource) {
      return null;
    }
    const sourceNode = activeLayerNodeIdSet.has(connectSource.nodeId) ? visibleNodeById.get(connectSource.nodeId) : undefined;
    if (!sourceNode) {
      return null;
    }
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (
          !(node.id === sourceNode.id && terminalId === connectSource.terminalId) &&
          canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)
        ) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        if (node.id === sourceNode.id && terminal.id === connectSource.terminalId) {
          continue;
        }
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE && canConnectTerminals(sourceNode, connectSource.terminalId, node, terminal.id)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };
}

export function createFindRoutableLineEndpointTargetAtPoint(__appScope: Record<string, any>) {
  return (
    point: Point,
    options: { terminalType?: TerminalType; source?: ConnectTarget | null; excludedNodeId?: string } = {}
  ): ConnectTarget | null => {
  const { CONNECT_BUS_SNAP_TOLERANCE, CONNECT_TERMINAL_SNAP_TOLERANCE, activeLayerNodeIdSet, busAnchorFromPoint, connectTargetSearchBounds, getBusTerminalType, getTerminalPoint, isBusNode, isPointNearBus, isRoutableLineDeviceKind, queryNodeSpatialIndex, routableLinePlacement, routableLineTemplateTerminalType, visibleNodeSpatialIndex } = __appScope;
    const terminalType = options.terminalType ?? (routableLinePlacement ? routableLineTemplateTerminalType(routableLinePlacement.template) : undefined);
    if (!terminalType) {
      return null;
    }
    const source = options.source ?? routableLinePlacement?.source ?? null;
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (!activeLayerNodeIdSet.has(node.id) || node.id === options.excludedNodeId || isRoutableLineDeviceKind(node.kind)) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (
          getBusTerminalType(node) === terminalType &&
          !(source && source.node.id === node.id && source.terminalId === terminalId)
        ) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        if (terminal.type !== terminalType) {
          continue;
        }
        if (source && source.node.id === node.id && source.terminalId === terminal.id) {
          continue;
        }
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };
}
