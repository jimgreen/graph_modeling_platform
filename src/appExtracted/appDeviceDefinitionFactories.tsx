// @ts-nocheck

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
      .slice(1, -2)
      .map((from, offset) => {
        const segmentIndex = offset + 1;
        const to = routePoints[segmentIndex + 1];
        return { from, to, segmentIndex };
      })
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    const fallbackCandidates = candidates.length > 0
      ? candidates
      : routePoints.slice(0, -1).map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
        .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    return fallbackCandidates.reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
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
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints));
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
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints));
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

export function createChooseImage(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, imageTarget, refreshImageFolders, requireEditMode, saveImageAsset, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传图片")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file || !imageTarget) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset;
      try {
        asset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传图片到后台失败。");
        const fallbackId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        saveImageAsset(fallbackId, imageData);
        asset = { id: fallbackId, name: file.name || "本地图片", folderId: activeImageFolderId, url: imageData };
      }
      setImageAssetList((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setImageAssets((current) => ({ ...current, [asset.id]: asset.url }));
      void refreshImageFolders();
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };
}

export function createApplyExistingImage(__appScope: Record<string, any>) {
  return (assetId: string) => {
  const { imageAssets, imageTarget, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, updateGraphNodeById } = __appScope;
    if (!requireEditMode("应用图片")) {
      return;
    }
    const imageData = imageAssets[assetId];
    if (!imageTarget || !imageData) {
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

export function createClearSelectedImage(__appScope: Record<string, any>) {
  return () => {
  const { imageTarget, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, updateGraphNodeById } = __appScope;
    if (!requireEditMode("清除图片")) {
      return;
    }
    if (!imageTarget) {
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
  const { customDeviceDraft, customDevicePreviewLabel, customDraftTerminalTypes, generateCustomDeviceImage } = __appScope;
    const image = customDeviceDraft.backgroundImage ||
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
  const { setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => ({
      ...current,
      stateDefinitions: current.stateDefinitions.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      error: ""
    }));
  };
}

export function createAddCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { createStateDraftRowFromDefaultVisual, customDeviceDefaultStateVisualDraft, customDeviceDraft, setCustomDeviceDraft, setCustomDeviceStatePageId } = __appScope;
    const row = createStateDraftRowFromDefaultVisual(customDeviceDefaultStateVisualDraft(), {
      value: String(customDeviceDraft.stateDefinitions.length),
      name: `状态${customDeviceDraft.stateDefinitions.length}`
    });
    setCustomDeviceDraft((current) => ({
      ...current,
      stateDefinitions: [...current.stateDefinitions, row],
      error: ""
    }));
    setCustomDeviceStatePageId(row.id);
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
    return {
      image: definitionVisualDraft?.backgroundImage || params.backgroundImage || "",
      imageAssetId: definitionVisualDraft?.backgroundImageAssetId || params.backgroundImageAssetId || "",
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
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, createCustomDeviceDraftFromTemplate, ensureCustomComponentTreeExpanded, libraryTemplates, normalizeAttributeLibraryName, prepareMeasurementConfigDraft, requireEditMode, resolveTemplateComponentType, selectedCustomComponentTemplate, selectedDefinitionTemplate, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogOpen, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setDeviceDefinitionDialogOpen, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
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
      setCustomDeviceDialogView("terminals");
      setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
      setCustomDeviceSaveMessage("");
      const nextDraft = createCustomDeviceDraftFromTemplate(template, section);
      setCustomDeviceDraft(template.custom ? nextDraft : { ...nextDraft, error: "" });
    }
    prepareMeasurementConfigDraft();
    setDeviceDefinitionDialogOpen(false);
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
  const { setDefinitionDraftError, setDefinitionStateDraftRows } = __appScope;
    setDefinitionStateDraftRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    setDefinitionDraftError("");
  };
}

export function createAddDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { createStateDraftRowFromDefaultVisual, definitionDefaultStateVisualDraft, definitionStateDraftRows, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId } = __appScope;
    const row = createStateDraftRowFromDefaultVisual(definitionDefaultStateVisualDraft(), {
      value: String(definitionStateDraftRows.length),
      name: `状态${definitionStateDraftRows.length}`
    });
    setDefinitionStateDraftRows((current) => [...current, row]);
    setDefinitionStatePageId(row.id);
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
        current.map((template) =>
          template.kind === selectedDefinitionTemplate.kind
            ? {
                ...template,
                stateDefinitions
              }
            : template
        )
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [selectedDefinitionTemplate.kind]: {
            ...existingOverride,
            kind: selectedDefinitionTemplate.kind,
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
        current.map((template) =>
          template.kind === selectedDefinitionTemplate.kind
            ? {
                ...template,
                size,
                params: {
                  ...template.params,
                  ...backgroundParams
                },
                terminalType: terminalTypes[0] ?? template.terminalType,
                terminalCount: definitionVisualDraft.terminalCount,
                terminalTypes,
                terminalLabels,
                terminalAnchors,
                stateDefinitions
              }
            : template
        )
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
  const { MAX_CUSTOM_DEVICE_TERMINALS, TERMINAL_TYPE_LIBRARY_LABELS, createDefaultCustomDeviceTerminalAnchors, normalizeContainerTerminalAssociations, setCustomDeviceDraft } = __appScope;
    const count = Math.max(0, Math.min(MAX_CUSTOM_DEVICE_TERMINALS, Math.round(value || 0)));
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
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, requireEditMode, setStateIconDrawingDialog, stateIconDrawingImportMode } = __appScope;
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
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result ?? "");
      const importedElements = isSvg
        ? createEditableStateIconElementsFromSvgSource(source, file.name)
        : [createImportedStateIconElement("image", source, file.name)];
      const selectedElementId = importedElements[0]?.id ?? "";
      setStateIconDrawingDialog((current) =>
        current
          ? {
              ...current,
              elements: [...current.elements, ...importedElements],
              selectedElementId,
              selectedElementIds: selectedElementId ? [selectedElementId] : []
            }
          : current
      );
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
  const { setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current) =>
      current
        ? {
            ...current,
            elements: current.elements.map((element) => (element.id === elementId ? { ...element, ...patch } : element))
          }
        : current
    );
  };
}

export function createUpdateStateIconDrawingElements(__appScope: Record<string, any>) {
  return (elementIds: readonly string[], updater: (element: StateIconDrawingElement) => StateIconDrawingElement) => {
  const { setStateIconDrawingDialog } = __appScope;
    const idSet = new Set(elementIds);
    setStateIconDrawingDialog((current) =>
      current
        ? {
            ...current,
            elements: current.elements.map((element) => (idSet.has(element.id) ? updater(element) : element))
          }
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
  const { setStateIconDrawingDialog, stateIconDrawingDragRef, stateIconDrawingPointer } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget.closest(".state-icon-drawing-dialog") as HTMLElement | null)?.focus();
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
      center = startElements.length === 1
        ? { x: startElements[0].x, y: startElements[0].y }
        : {
            x: startElements.reduce((sum, element) => sum + element.x, 0) / Math.max(1, startElements.length),
            y: startElements.reduce((sum, element) => sum + element.y, 0) / Math.max(1, startElements.length)
          };
      return {
        ...current,
        selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
        selectedElementIds
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
  const { stateIconDrawingDragRef, stateIconDrawingPointer, updateStateIconDrawingElements } = __appScope;
    const drag = stateIconDrawingDragRef.current;
    if (!drag) {
      return;
    }
    event.preventDefault();
    const point = stateIconDrawingPointer(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (drag.mode === "move") {
      updateStateIconDrawingElements(drag.elementIds, (element) => {
        const startElement = drag.startElements.find((item) => item.id === element.id);
        return startElement ? { ...element, x: startElement.x + dx, y: startElement.y + dy } : element;
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
  const { stateIconDrawingDragRef } = __appScope;
    stateIconDrawingDragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
}

export function createDeleteSelectedStateIconDrawingElements(__appScope: Record<string, any>) {
  return () => {
  const { setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const selectedIds = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      if (selectedIds.length === 0) {
        return current;
      }
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
  const { deleteSelectedStateIconDrawingElements } = __appScope;
    if (event.key !== "Delete" && event.key !== "Backspace") {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return;
    }
    event.preventDefault();
    deleteSelectedStateIconDrawingElements();
  };
}

export function createAddStateIconDrawingElement(__appScope: Record<string, any>) {
  return (kind: StateVisualShapeKind) => {
  const { createStateIconDrawingElement, customDeviceDraft, definitionStateDraftRows, setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const row =
        current.target.scope === "definition"
          ? definitionStateDraftRows.find((item) => item.id === current.target.rowId)
          : customDeviceDraft.stateDefinitions.find((item) => item.id === current.target.rowId);
      const element = createStateIconDrawingElement(kind, row);
      return {
        ...current,
        elements: [...current.elements, element],
        selectedElementId: element.id,
        selectedElementIds: [element.id]
      };
    });
  };
}

export function createDeleteStateIconDrawingElement(__appScope: Record<string, any>) {
  return (elementId: string) => {
  const { setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
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
  const { createStateIconDrawingInitialElements, customDeviceDraft, definitionStateDraftRows, imageAssets, setStateIconDrawingDialog } = __appScope;
    const row =
      target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === target.rowId);
    const initial = createStateIconDrawingInitialElements(row, imageAssets);
    setStateIconDrawingDialog({
      target,
      elements: initial,
      selectedElementId: initial[0]?.id ?? "",
      selectedElementIds: initial[0]?.id ? [initial[0].id] : []
    });
  };
}

export function createApplyStateIconDrawingDialog(__appScope: Record<string, any>) {
  return () => {
  const { setStateIconDrawingDialog, stateIconDrawingDialog, stateIconDrawingToImage, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow } = __appScope;
    if (!stateIconDrawingDialog || stateIconDrawingDialog.elements.length === 0) {
      return;
    }
    const patch: Partial<DeviceDefinitionStateDraftRow> = {
      image: stateIconDrawingToImage(stateIconDrawingDialog.elements),
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
  const { DEFAULT_STATE_PAGE_ID, createCustomDeviceDraftFromTemplate, customComponentSelectionFrameRef, customComponentSelectionRequestRef, customDeviceDefinitionMode, ensureCustomComponentTreeExpanded, normalizeAttributeLibraryName, normalizeComponentTypeName, resolveTemplateComponentType, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setEditingCustomDeviceKind, setSelectedDefinitionKind, startCustomComponentSelectionTransition } = __appScope;
    if (sectionName === undefined) {
      sectionName = resolveTemplateComponentType(template);
    }
    const attributeLibraryName = normalizeAttributeLibraryName(template.attributeLibrary);
    const section = normalizeComponentTypeName(sectionName);
    const requestId = customComponentSelectionRequestRef.current + 1;
    customComponentSelectionRequestRef.current = requestId;
    setCustomDeviceSaveMessage("");
    ensureCustomComponentTreeExpanded(attributeLibraryName, section);
    // 树组件内部已管理 selection，这里只在 transition 中更新右侧面板的状态
    setSelectedDefinitionKind(template.kind);
    setDefinitionDraftSection(section);
    if (customComponentSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(customComponentSelectionFrameRef.current);
    }
    customComponentSelectionFrameRef.current = window.requestAnimationFrame(() => {
      customComponentSelectionFrameRef.current = null;
      if (customComponentSelectionRequestRef.current !== requestId) {
        return;
      }
      const nextDraft = createCustomDeviceDraftFromTemplate(template, section);
      const editableDraft = customDeviceDefinitionMode === "edit" && !template.custom
        ? { ...nextDraft, error: "" }
        : nextDraft;
      startCustomComponentSelectionTransition(() => {
        // 合并所有状态更新，减少重渲染
        setCustomComponentTreeSelection({ kind: "component", attributeLibraryName, section, templateKind: template.kind });
        setEditingCustomDeviceKind((current) =>
          customComponentSelectionRequestRef.current !== requestId ? current : template.custom ? template.kind : ""
        );
        setCustomDeviceStatePageId((current) =>
          customComponentSelectionRequestRef.current !== requestId ? current : DEFAULT_STATE_PAGE_ID
        );
        setCustomDeviceDraft((current) =>
          customComponentSelectionRequestRef.current !== requestId ? current : editableDraft
        );
      });
    });
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
    setCustomDeviceDialogView("terminals");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceSaveMessage("");
    setCustomDeviceDraft({
      ...createEmptyCustomDeviceDraft(attributeLibraryName),
      componentType: section,
      componentName: "",
      error: ""
    });
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
      preview?: ReactNode;
      saveStateVisuals?: () => void;
      saveStateVisualsLabel?: string;
      uploadStateImage?: (rowId: string) => void;
      drawStateIcon?: (rowId: string) => void;
    }
  ) => {
  const { BufferedTextInput, DEFAULT_STATE_PAGE_ID, DeferredColorInput, activeStateDraftRow, button, div, isDefaultStatePageId, label, section, small, span, stateDraftImageValue } = __appScope;
    const isDefaultStatePage = isDefaultStatePageId(activeRowId);
    const activeRow = activeStateDraftRow(rows, activeRowId);
    return (
      <section className="device-state-pager" aria-label="状态分页">
        <div className="device-state-pager-header">
          <div className="device-state-tabs" role="tablist" aria-label="状态分页">
            <button
              type="button"
              role="tab"
              aria-selected={isDefaultStatePage}
              className={isDefaultStatePage ? "active" : ""}
              onClick={() => setActiveRowId(DEFAULT_STATE_PAGE_ID)}
            >
              默认状态
            </button>
            {rows.map((row, index) => {
              const active = activeRow?.id === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "active" : ""}
                  onClick={() => setActiveRowId(row.id)}
                >
                  {row.name.trim() || row.value.trim() || `状态${index}`}
                </button>
              );
            })}
            <button type="button" className="device-state-add-tab" onClick={handlers.add}>新增状态</button>
          </div>
          <span className="device-state-shared-note" title="尺寸大小和端子位置由所有状态分页共享">共享尺寸/端子</span>
        </div>
        {isDefaultStatePage ? (
          <div className="device-state-default-body">
            <span>默认状态用于维护所有状态共享的尺寸和端子。</span>
          </div>
        ) : activeRow ? (
          <>
            <div className="device-state-page-fields">
              <label>
                状态值
                <BufferedTextInput value={activeRow.value} onCommit={(value) => handlers.update(activeRow.id, { value })} />
              </label>
              <label>
                状态名称
                <BufferedTextInput value={activeRow.name} onCommit={(value) => handlers.update(activeRow.id, { name: value })} />
              </label>
              <label>
                状态图标
                <BufferedTextInput value={activeRow.icon} placeholder="如 ON" onCommit={(value) => handlers.update(activeRow.id, { icon: value })} />
              </label>
              <label className="device-state-image-field">
                状态图片
                <div className="device-state-image-input-row">
                  <BufferedTextInput
                    value={stateDraftImageValue(activeRow)}
                    placeholder="图片URL或后台路径"
                    onCommit={(value) =>
                      handlers.update(activeRow.id, {
                        image: value,
                        imageAssetId: "",
                        backgroundImage: "",
                        backgroundImageAssetId: ""
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handlers.update(activeRow.id, {
                        image: "",
                        imageAssetId: "",
                        backgroundImage: "",
                        backgroundImageAssetId: ""
                      })
                    }
                  >
                    清除
                  </button>
                  {handlers.uploadStateImage && (
                    <button type="button" onClick={() => handlers.uploadStateImage?.(activeRow.id)}>
                      上传图形
                    </button>
                  )}
                </div>
              </label>
              <div className="device-state-shape-field">
                <span>状态图标绘制</span>
                <div className="device-state-shape-tools">
                  <button type="button" onClick={() => handlers.drawStateIcon?.(activeRow.id)}>
                    绘制图标
                  </button>
                  <small>在绘制器中组合线、点、文字和几何图形。</small>
                </div>
              </div>
              <label>
                状态文字
                <BufferedTextInput value={activeRow.text} placeholder="覆盖文字" onCommit={(value) => handlers.update(activeRow.id, { text: value })} />
              </label>
              <label>
                主颜色
                <div className="color-field device-state-color-field">
                  <DeferredColorInput value={activeRow.color} fallback="#2563eb" onCommit={(value) => handlers.update(activeRow.id, { color: value })} />
                  <span className="device-state-color-swatch" title={activeRow.color || "未设置"} style={{ "--state-color": activeRow.color || "#2563eb" } as CSSProperties} />
                </div>
              </label>
              <label>
                填充色
                <div className="color-field device-state-color-field">
                  <DeferredColorInput value={activeRow.fillColor} fallback="#ffffff" onCommit={(value) => handlers.update(activeRow.id, { fillColor: value })} />
                  <span className={`device-state-color-swatch ${activeRow.fillColor === "transparent" ? "transparent" : ""}`} title={activeRow.fillColor || "未设置"} style={{ "--state-color": activeRow.fillColor === "transparent" ? "#ffffff" : activeRow.fillColor || "#ffffff" } as CSSProperties} />
                </div>
              </label>
              <label>
                边框色
                <div className="color-field device-state-color-field">
                  <DeferredColorInput value={activeRow.strokeColor} fallback="#2563eb" onCommit={(value) => handlers.update(activeRow.id, { strokeColor: value })} />
                  <span className={`device-state-color-swatch ${activeRow.strokeColor === "transparent" ? "transparent" : ""}`} title={activeRow.strokeColor || "未设置"} style={{ "--state-color": activeRow.strokeColor === "transparent" ? "#ffffff" : activeRow.strokeColor || "#2563eb" } as CSSProperties} />
                </div>
              </label>
              <label>
                文字色
                <div className="color-field device-state-color-field">
                  <DeferredColorInput value={activeRow.textColor} fallback="#111827" onCommit={(value) => handlers.update(activeRow.id, { textColor: value })} />
                  <span className="device-state-color-swatch" title={activeRow.textColor || "未设置"} style={{ "--state-color": activeRow.textColor || "#111827" } as CSSProperties} />
                </div>
              </label>
            </div>
            {handlers.preview}
            <div className="custom-device-actions device-state-actions">
              {handlers.saveStateVisuals && <button type="button" onClick={handlers.saveStateVisuals}>{handlers.saveStateVisualsLabel ?? "保存状态样式"}</button>}
              <button type="button" onClick={() => handlers.remove(activeRow.id)}>删除状态</button>
              {handlers.reset && <button type="button" onClick={handlers.reset}>{handlers.resetLabel ?? "恢复状态页"}</button>}
            </div>
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
  const { BufferedTextInput, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, DEFAULT_STATE_PAGE_ID, Fragment, MemoDeviceGlyph, TERMINAL_TYPE_LIBRARY_LABELS, addDefinitionStateDraftRow, button, circle, colorPalette, createDefinitionStateDraftRows, createDefinitionVisualDraft, createNodeFromTemplate, customDeviceTerminalAnchorValue, definitionDraftError, definitionStateDraftRows, definitionStatePageId, definitionStatePreviewVisual, definitionTemplateIconInputRef, definitionTerminalAnchorDragIndex, definitionTerminalConnectorSegment, definitionVisualDraft, definitionVisualPreviewHeight, definitionVisualPreviewImage, definitionVisualPreviewWidth, definitionVisualTerminalAnchors, definitionVisualTerminalTypes, deleteDefinitionStateDraftRow, div, formatCustomDeviceTerminalAnchorValue, formatSvgNumber, g, image, isDefaultStatePageId, label, line, nodeGeometryTransform, openStateIconDrawingDialog, p, rect, renderStateVisualPager, resolveNodeStateVisual, saveDeviceDefinitionStateVisualDraft, saveDeviceDefinitionVisualDraft, section, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setStateImageUploadTarget, small, span, stateVisualImageInputRef, stateVisualText, strong, terminalColor, text, title, updateDefinitionStateDraftRow, updateDefinitionTerminalAnchor, updateDefinitionTerminalAnchorFromPreview } = __appScope;
    if (!definitionVisualDraft) {
      return null;
    }
    const visualTemplate: DeviceTemplate = {
      ...template,
      size: definitionVisualDraft.size,
      params: {
        ...template.params,
        backgroundImage: "",
        backgroundImageAssetId: ""
      },
      terminalType: definitionVisualTerminalTypes[0] ?? template.terminalType,
      terminalCount: definitionVisualDraft.terminalCount,
      terminalTypes: definitionVisualTerminalTypes,
      terminalLabels: definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount),
      terminalAnchors: definitionVisualTerminalAnchors
    };
    const previewNode = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
    const definitionStatePreviewText = stateVisualText(definitionStatePreviewVisual);
    const definitionDefaultStateSelected = isDefaultStatePageId(definitionStatePageId);
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
          uploadStateImage: (rowId) => {
            setStateImageUploadTarget({ scope: "definition", rowId });
            stateVisualImageInputRef.current?.click();
          },
          drawStateIcon: (rowId) => openStateIconDrawingDialog({ scope: "definition", rowId }),
          preview: !definitionDefaultStateSelected ? (
            <div className="custom-device-preview device-definition-visual-preview">
              <div className="custom-device-preview-stage">
                <svg
                  className="custom-device-anchor-preview device-definition-anchor-preview"
                  viewBox={`${formatSvgNumber(-definitionVisualPreviewWidth / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(-definitionVisualPreviewHeight / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(definitionVisualPreviewWidth + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)} ${formatSvgNumber(definitionVisualPreviewHeight + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)}`}
                  role="img"
                  aria-label="状态预览"
                >
                  {definitionVisualPreviewImage ? (
                    <image
                      href={definitionVisualPreviewImage}
                      x={-definitionVisualPreviewWidth / 2}
                      y={-definitionVisualPreviewHeight / 2}
                      width={definitionVisualPreviewWidth}
                      height={definitionVisualPreviewHeight}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <g transform={nodeGeometryTransform(previewNode)}>
                      <MemoDeviceGlyph node={previewNode} miniature colorPalette={colorPalette} stateVisual={definitionStatePreviewVisual ?? resolveNodeStateVisual(previewNode)} />
                    </g>
                  )}
                  {definitionVisualPreviewImage && definitionStatePreviewText && (
                    <text
                      className="custom-device-state-preview-text"
                      x="0"
                      y="0"
                      fill={definitionStatePreviewVisual?.textColor || definitionStatePreviewVisual?.color || "#1d4ed8"}
                    >
                      {definitionStatePreviewText}
                    </text>
                  )}
                  <rect
                    className="custom-device-preview-frame"
                    x={-definitionVisualPreviewWidth / 2}
                    y={-definitionVisualPreviewHeight / 2}
                    width={definitionVisualPreviewWidth}
                    height={definitionVisualPreviewHeight}
                    rx="8"
                  />
                </svg>
              </div>
            </div>
          ) : undefined,
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
              {definitionVisualPreviewImage ? (
                <image
                  href={definitionVisualPreviewImage}
                  x={-definitionVisualPreviewWidth / 2}
                  y={-definitionVisualPreviewHeight / 2}
                  width={definitionVisualPreviewWidth}
                  height={definitionVisualPreviewHeight}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <g transform={nodeGeometryTransform(previewNode)}>
                  <MemoDeviceGlyph node={previewNode} miniature colorPalette={colorPalette} stateVisual={definitionStatePreviewVisual ?? resolveNodeStateVisual(previewNode)} />
                </g>
              )}
              {definitionVisualPreviewImage && definitionStatePreviewText && (
                <text
                  className="custom-device-state-preview-text"
                  x="0"
                  y="0"
                  fill={definitionStatePreviewVisual?.textColor || definitionStatePreviewVisual?.color || "#1d4ed8"}
                >
                  {definitionStatePreviewText}
                </text>
              )}
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
                        <text
                          className="custom-device-terminal-guide-label"
                          x={guideValue * definitionVisualPreviewWidth}
                          y={-definitionVisualPreviewHeight / 2 - 5}
                        >
                          {CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS[guideIndex]}
                        </text>
                        <text
                          className="custom-device-terminal-guide-label horizontal"
                          x={-definitionVisualPreviewWidth / 2 - 5}
                          y={guideValue * definitionVisualPreviewHeight}
                        >
                          {CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS[guideIndex]}
                        </text>
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
  const { MemoDeviceGlyph, button, cancelLibraryPlacement, clipPath, colorPalette, componentLibraryDisplayMode, createNodeFromTemplate, defs, formatSvgNumber, g, hideLibraryFlyout, image, isBrowseMode, isBusNode, isEditMode, libraryPreviewByKind, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, rect, resolveNodeStateVisual, startLibraryDevicePlacement, svg } = __appScope;
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
                <image
                  href={libraryPreviewImageHref}
                  x={-preview.size.width / 2}
                  y={-preview.size.height / 2}
                  width={preview.size.width}
                  height={preview.size.height}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#${libraryPreviewClipId})`}
                  className="library-preview-image"
                />
              )}
              {libraryPreviewForegroundHref && (
                <image
                  href={libraryPreviewForegroundHref}
                  x={-preview.size.width / 2}
                  y={-preview.size.height / 2}
                  width={preview.size.width}
                  height={preview.size.height}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#${libraryPreviewClipId})`}
                  className="library-preview-image library-preview-foreground-image"
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
