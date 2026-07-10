// @ts-nocheck
import { clampNumber } from "../canvasViewport";

export function createCommitRoutableLineDevice(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, source: ConnectTarget, target: ConnectTarget, manualPoints?: Point[]) => {
  const { CANVAS_AUTO_EXPAND_PADDING, activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, buildManualConnectionPreviewRoute, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, connectTargetPoint, createRoutableLineDeviceFromEndpoints, deviceIndexCounters, edges, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, nodes, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, resetRoutableLinePreviewState, routableLineDeviceEndpointRefForNode, routeRoutableLineDevice, setCanvasSelectionScope, setDeviceIndexCounters, setGraphArrays, setMode, setRoutableLineDeviceCanvasPoints, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, writeOperationLog } = __appScope;
    const sourcePoint = connectTargetPoint(source);
    const targetPoint = connectTargetPoint(target);
    const rawLine = createRoutableLineDeviceFromEndpoints(
      template,
      sourcePoint,
      targetPoint,
      activeLayerId,
      {
        source: routableLineDeviceEndpointRefForNode(source.node, source.terminalId, source.point),
        target: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point)
      }
    );
    const manualRoutePoints = manualPoints?.length
      ? buildManualConnectionPreviewRoute(sourcePoint, manualPoints, targetPoint, canvasBounds)
      : null;
    const routedLine = manualRoutePoints
      ? setRoutableLineDeviceCanvasPoints(rawLine, manualRoutePoints)
      : routeRoutableLineDevice(rawLine, [...nodes, rawLine], canvasBounds);
    if (rejectAutoCanvasExpansionForContent([...nodes, routedLine], edges)) {
      return false;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, routedLine], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const shiftedLine = translateNodeBy(routedLine, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, shiftedLine],
      dropSourceEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges);
    }
    const indexed = assignPermanentDeviceIndex(shiftedLine, deviceIndexCounters);
    pushUndoSnapshot();
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([indexed.node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    activateInspectorFromCanvas();
    writeOperationLog(`新增线路：${indexed.node.name}`);
    return true;
  };
}

export function createStartRoutableLineFromTerminal(__appScope: Record<string, any>) {
  return (node: ModelNode, terminalId: string, point?: Point) => {
  const { activeLayerNodeIdSet, applyRoutableLinePreviewState, connectTargetPoint, connectTargetTerminalType, routableLinePlacement, routableLineTemplateTerminalType, setCanvasSelectionScope, setContextMenu, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!routableLinePlacement || !activeLayerNodeIdSet.has(node.id)) {
      return false;
    }
    const source: ConnectTarget = { node, terminalId, point };
    if (connectTargetTerminalType(source) !== routableLineTemplateTerminalType(routableLinePlacement.template)) {
      return false;
    }
    const nextPlacement: RoutableLinePlacementState = { ...routableLinePlacement, source };
    setRoutableLinePlacement(nextPlacement);
    applyRoutableLinePreviewState(connectTargetPoint(source), null, null, nextPlacement);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setContextMenu(null);
    setMode("connect");
    writeOperationLog(`线路起点：${node.name}`);
    return true;
  };
}

export function createFinishRoutableLineToTarget(__appScope: Record<string, any>) {
  return (target: ConnectTarget, manualPoints?: Point[]) => {
  const { commitRoutableLineDevice, connectTargetTerminalType, routableLinePlacement, routableLineTemplateTerminalType, writeOperationLog } = __appScope;
    if (manualPoints === undefined) {
      manualPoints = routableLinePlacement?.manualPoints;
    }
    if (!routableLinePlacement?.source) {
      return false;
    }
    if (connectTargetTerminalType(target) !== routableLineTemplateTerminalType(routableLinePlacement.template)) {
      return false;
    }
    const committed = commitRoutableLineDevice(routableLinePlacement.template, routableLinePlacement.source, target, manualPoints);
    if (committed) {
      writeOperationLog(`线路终点：${target.node.name}`);
    }
    return committed;
  };
}

export function createUpdateRoutableLineEndpointDrag(__appScope: Record<string, any>) {
  return (point: Point, ctrlKey = false) => {
  const { alignBusEndpointPointToRouteSegmentExtension, connectTargetPoint, findRoutableLineEndpointTargetAtPoint, isBusNode, nodeById, routableLineDeviceCanvasPoints, routableLineEndpointDrag, sameConnectTarget, sameOptionalPoint, setRoutableLineEndpointDrag } = __appScope;
    if (!routableLineEndpointDrag) {
      return;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    if (!lineNode) {
      return;
    }
    const terminalIndex = routableLineEndpointDrag.endpoint === "source" ? 0 : 1;
    const terminalType = lineNode.terminals[terminalIndex]?.type ?? lineNode.terminals[0]?.type;
    const target = terminalType
      ? findRoutableLineEndpointTargetAtPoint(point, { terminalType, excludedNodeId: lineNode.id })
      : null;
    const routePoints = routableLineDeviceCanvasPoints(lineNode);
    const alignedPoint =
      target && ctrlKey && isBusNode(target.node)
        ? alignBusEndpointPointToRouteSegmentExtension(target.node, routePoints, routableLineEndpointDrag.endpoint)
        : null;
    const effectiveTarget = target && alignedPoint ? { ...target, point: alignedPoint } : target;
    const snappedPoint = effectiveTarget ? connectTargetPoint(effectiveTarget) : point;
    setRoutableLineEndpointDrag((current) =>
      current && current.nodeId === routableLineEndpointDrag.nodeId && current.endpoint === routableLineEndpointDrag.endpoint
        ? sameOptionalPoint(current.previewPoint, snappedPoint) &&
          sameOptionalPoint(current.dropTargetPoint, effectiveTarget ? snappedPoint : undefined) &&
          sameConnectTarget(current.dropTarget, effectiveTarget)
          ? current
          : {
              ...current,
              previewPoint: snappedPoint,
              dropTargetPoint: effectiveTarget ? snappedPoint : undefined,
              dropTarget: effectiveTarget ?? undefined
            }
        : current
    );
  };
}

export function createStartRoutableLineEndpointDrag(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    endpoint: EdgeEndpoint
  ) => {
  const { activeLayerNodeIdSet, isBrowseMode, routableLineDeviceCanvasPoints, setCanvasSelectionScope, setContextMenu, setRoutableLineEndpointDrag, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || isBrowseMode || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const points = routableLineDeviceCanvasPoints(node);
    const previewPoint = endpoint === "source" ? points[0] : points[points.length - 1];
    if (!previewPoint) {
      return;
    }
    setRoutableLineEndpointDrag({
      nodeId: node.id,
      endpoint,
      previewPoint,
      pointerId: event.pointerId
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setContextMenu(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createFinishRoutableLineEndpointDrag(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, connectTargetPoint, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefForNode, routableLineDeviceEndpointRefs, routableLineEndpointDrag, setCanvasSelectionScope, setRoutableLineDeviceEndpointsPreservingRoute, setRoutableLineEndpointDrag, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!routableLineEndpointDrag) {
      return;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    const target = routableLineEndpointDrag.dropTarget;
    if (lineNode && target) {
      const points = routableLineDeviceCanvasPoints(lineNode);
      const currentStart = points[0];
      const currentEnd = points[points.length - 1];
      if (currentStart && currentEnd) {
        const targetPoint = connectTargetPoint(target);
        const nextStart = routableLineEndpointDrag.endpoint === "source" ? targetPoint : currentStart;
        const nextEnd = routableLineEndpointDrag.endpoint === "target" ? targetPoint : currentEnd;
        const refs = routableLineDeviceEndpointRefs(lineNode);
        const nextRefs =
          routableLineEndpointDrag.endpoint === "source"
            ? {
                source: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point),
                target: refs.target
              }
            : {
                source: refs.source,
                target: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point)
              };
        const commitNodeById = new Map(nodes.map((node) => [node.id, node]));
        commitNodeById.set(target.node.id, target.node);
        const routedLine = setRoutableLineDeviceEndpointsPreservingRoute(
          lineNode,
          nextStart,
          nextEnd,
          nextRefs,
          commitNodeById,
          canvasBounds
        );
        pushUndoSnapshot();
        patchGraphNodes([routedLine]);
        setCanvasSelectionScope("group");
        setSelectedNodeIds([routedLine.id]);
        setSelectedEdgeId("");
        setSelectedEdgeIds([]);
        writeOperationLog(`调整线路端点：${routedLine.name}`);
      }
    } else if (lineNode) {
      window.alert("线路端点必须连接到同类型设备端子或母线，已保持原连接。");
      writeOperationLog("线路端点调整失败");
    }
    setRoutableLineEndpointDrag(null);
  };
}

export function createCommitNewConnectionEdge(__appScope: Record<string, any>) {
  return (newEdge: Edge, sourceName: string, targetName: string) => {
  const { buildManualConnectionPreviewRoute, canvasBounds, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, getModelEdgeEndpointPoint, graphStoreApplyPatch, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, prepareConnectionEdgeForCommit, pushUndoSnapshot, resetConnectPreviewState, routedEdges, routingNodesForConnectionEdge, setCanvasSelectionScope, setConnectSource, setGraphStore, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    const routeNodes = routingNodesForConnectionEdge(newEdge);
    const edgeForCommit = (() => {
      if (!newEdge.manualPoints?.length) {
        return newEdge;
      }
      const routeNodeById = new Map(routeNodes.map((node) => [node.id, node]));
      const sourceNode = routeNodeById.get(newEdge.sourceId);
      const targetNode = routeNodeById.get(newEdge.targetId);
      if (!sourceNode || !targetNode) {
        return newEdge;
      }
      const sourcePoint = getModelEdgeEndpointPoint(sourceNode, newEdge.sourcePoint, newEdge.sourceTerminalId);
      const targetPoint = getModelEdgeEndpointPoint(targetNode, newEdge.targetPoint, newEdge.targetTerminalId);
      const manualPreviewRoutePoints = buildManualConnectionPreviewRoute(
        sourcePoint,
        newEdge.manualPoints,
        targetPoint,
        canvasBounds
      );
      return manualPreviewRoutePoints.length >= 2
        ? { ...newEdge, routePoints: manualPreviewRoutePoints }
        : newEdge;
    })();
    const endpointRuleMessage = connectionEndpointRuleFailureMessage(edgeForCommit);
    if (endpointRuleMessage) {
      window.alert(`联络线绘制失败：${endpointRuleMessage}`);
      writeOperationLog(`联络线绘制失败：${endpointRuleMessage}`);
      return false;
    }
    const prepared = prepareConnectionEdgeForCommit(
      routeNodes,
      [edgeForCommit],
      edgeForCommit.id,
      canvasBounds,
      routedEdges,
      { preserveManualRouteDisplay: Boolean(edgeForCommit.manualPoints?.length) }
    );
    if (!prepared.ok || !prepared.edge) {
      const message = connectionCommitFailureMessage(prepared.issues);
      window.alert(`联络线绘制失败：${message}`);
      writeOperationLog(`联络线绘制失败：${message}`);
      return false;
    }
    const preparedEdge = prepared.edge;
    pushUndoSnapshot();
    markRouteEdgesDirty([preparedEdge.id]);
    markStoredRouteEdgesDirty([preparedEdge.id]);
    markBusTerminalSyncDirtyForEdges([preparedEdge]);
    setGraphStore((current) => graphStoreApplyPatch(current, { edgeUpserts: [preparedEdge] }));
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId(preparedEdge.id);
    setSelectedEdgeIds([preparedEdge.id]);
    setConnectSource(null);
    resetConnectPreviewState();
    setMode("select");
    writeOperationLog(`新增联络线：${sourceName} -> ${targetName}`);
    return true;
  };
}

export function createFinishConnectToTarget(__appScope: Record<string, any>) {
  return (target: NonNullable<ReturnType<typeof findConnectTargetAtPoint>>, endpointPoint?: Point | null) => {
  const { busAnchorFromPoint, canConnectTerminals, commitNewConnectionEdge, connectPreviewPointRef, connectSource, getTerminalPoint, isBusNode, visibleNodeById } = __appScope;
    if (endpointPoint === undefined) {
      endpointPoint = connectPreviewPointRef.current;
    }
    if (!connectSource) {
      return false;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, target.node, target.terminalId)) {
      return false;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: target.node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      manualPoints: connectSource.manualPoints,
      targetTerminalId: target.terminalId,
      targetPoint: isBusNode(target.node)
        ? target.point ?? busAnchorFromPoint(target.node, endpointPoint ?? getTerminalPoint(target.node, target.terminalId))
        : target.point
    };
    return commitNewConnectionEdge(newEdge, sourceNode.name, target.node.name);
  };
}

export function createFinishRewiring(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { canvasBounds, clampPointToCanvas, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, endpointMatchedRoutePointsForEdge, findRewireTargetAtPoint, getModelEdgeEndpointPoint, getTerminalPoint, isBusNode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, prepareConnectionEdgeForCommit, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, pushUndoSnapshot, resolveStraightBusSlideEndpointToPoint, rewiring, routedEdgeById, routedEdges, routingNodesForConnectionEdge, screenToSvgPoint, selectCanvasGraphics, setRewiring, svgRef, writeOperationLog } = __appScope;
    if (!rewiring || !svgRef.current) {
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const target = findRewireTargetAtPoint(point, rewiring);
    if (target) {
      const edge = edgeById.get(rewiring.edgeId);
      const movingPoint = target.point ?? getTerminalPoint(target.node, target.terminalId);
      const sourceNode = edge ? nodeById.get(edge.sourceId) : undefined;
      const targetNode = edge ? nodeById.get(edge.targetId) : undefined;
      const matchedRewireRoutePoints = edge && sourceNode && targetNode
        ? endpointMatchedRoutePointsForEdge(edge, routedEdgeById.get(edge.id)?.points)
        : [];
      const currentRewireRoutePoints = edge && sourceNode && targetNode
        ? matchedRewireRoutePoints.length
          ? matchedRewireRoutePoints
          : previewStoredRoutePointsForEdge(edge)
        : [];
      const currentSourcePoint = edge && sourceNode
        ? currentRewireRoutePoints[0] ?? getModelEdgeEndpointPoint(sourceNode, edge.sourcePoint, edge.sourceTerminalId)
        : undefined;
      const currentTargetPoint = edge && targetNode
        ? currentRewireRoutePoints[currentRewireRoutePoints.length - 1] ?? getModelEdgeEndpointPoint(targetNode, edge.targetPoint, edge.targetTerminalId)
        : undefined;
      const fixedSourcePoint = edge && sourceNode && currentSourcePoint && isBusNode(sourceNode)
        ? currentSourcePoint
        : edge?.sourcePoint;
      const fixedTargetPoint = edge && targetNode && currentTargetPoint && isBusNode(targetNode)
        ? currentTargetPoint
        : edge?.targetPoint;
      const rewiredEdge = edge
        ? rewiring.endpoint === "source"
          ? {
              ...edge,
              sourceId: target.node.id,
              sourceTerminalId: target.terminalId,
              sourcePoint: target.point,
              targetPoint: fixedTargetPoint
            }
          : {
              ...edge,
              sourcePoint: fixedSourcePoint,
              targetId: target.node.id,
              targetTerminalId: target.terminalId,
              targetPoint: target.point
            }
        : null;
      const slidePatch = edge && sourceNode && targetNode
        ? resolveStraightBusSlideEndpointToPoint({
            edge,
            sourceNode,
            targetNode,
            movingEndpoint: rewiring.endpoint,
            movingPoint,
            nodes,
            movingNode: target.node,
            movingTerminalId: target.terminalId
          })
        : null;
      const candidateEdge = rewiredEdge ? (slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge) : null;
      const routingNodes = candidateEdge ? routingNodesForConnectionEdge(candidateEdge, nodes) : [];
      const rewireStoredPoints = currentRewireRoutePoints.length >= 2
        ? currentRewireRoutePoints.map((routePoint) => ({ ...routePoint }))
        : edge && currentSourcePoint && currentTargetPoint
          ? previewStoredRoutePointsForEdge(edge, currentSourcePoint, currentTargetPoint)
          : edge
            ? previewStoredRoutePointsForEdge(edge)
            : [];
      const edgeForCommit = candidateEdge && edge
        ? preserveConnectionEdgeRouteShape(
            routingNodes,
            candidateEdge,
            rewireStoredPoints,
            canvasBounds
          )
        : null;
      const endpointRuleMessage = edgeForCommit ? connectionEndpointRuleFailureMessage(edgeForCommit) : "";
      const prepared = edgeForCommit && !endpointRuleMessage
        ? prepareConnectionEdgeForCommit(
            routingNodes,
            [edgeForCommit],
            rewiring.edgeId,
            canvasBounds,
            routedEdges
          )
        : null;
      if (prepared?.ok && prepared.edge) {
        const preparedEdge = prepared.edge;
        pushUndoSnapshot();
        markRouteEdgesDirty([rewiring.edgeId]);
        markStoredRouteEdgesDirty([rewiring.edgeId]);
        markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
        patchGraphEdges([preparedEdge]);
        writeOperationLog(`调整联络线端子：${rewiring.edgeId}`);
      } else {
        const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
        window.alert(`联络线端子调整失败：${message}`);
        writeOperationLog(`联络线端子调整失败：${message}`);
      }
    } else {
      window.alert("联络线端子必须连接到同类型端子或母线，已保持原连接。");
      writeOperationLog("联络线端子调整失败");
    }
    selectCanvasGraphics([], [rewiring.edgeId]);
    setRewiring(null);
  };
}

export function createHandleDrop(__appScope: Record<string, any>) {
  return (event: DragEvent<SVGSVGElement>) => {
  const { customGraphTemplates, dropGraphTemplate, libraryTemplates, placeLibraryDeviceAtPoint, requireEditMode, screenToSvgPoint, svgRef } = __appScope;
    event.preventDefault();
    if (!requireEditMode("拖入图元")) {
      return;
    }
    const graphTemplateId = event.dataTransfer.getData("application/graph-template-id");
    if (graphTemplateId && svgRef.current) {
      const template = customGraphTemplates.find((item) => item.id === graphTemplateId);
      if (!template) {
        return;
      }
      const pointerPosition = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      dropGraphTemplate(template, pointerPosition);
      return;
    }
    const kind = event.dataTransfer.getData("application/device-kind") as DeviceKind;
    if (!kind || !svgRef.current) {
      return;
    }
    const pointerPosition = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const position = { x: pointerPosition.x, y: pointerPosition.y };
    const template = libraryTemplates.find((item) => item.kind === kind);
    if (!template) {
      return;
    }
    placeLibraryDeviceAtPoint(template, position);
  };
}

export function createHandleRoutableLineNodePointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendFromPointer, isEditMode, resetConnectPreviewState, routableLineDeviceCanvasPoints, screenToSvgPoint, selectCanvasGraphics, selectedNodeIdSet, setConnectSource, setContextMenu, setRewiring, startModifierSelectionPress, svgRef, switchInspectorTabForCanvasSelection } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    activateInspectorFromCanvas();
    if (isEditMode && selectedNodeIdSet.has(node.id) && event.detail >= 2 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const routePoints = routableLineDeviceCanvasPoints(node);
      if (insertRoutableLineBendFromPointer(node.id, routePoints, pointer)) {
        return;
      }
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    switchInspectorTabForCanvasSelection([node.id], [], "single");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
}

export function createHandleNodePointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, appendStaticDrawingPoint, applyConnectPreviewState, beginStaticButtonPointerFeedback, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clampPointToCanvas, clearNodeDragMoveSchedule, connectSource, connectTargetSnapPoint, createCanvasSelectionSnapshot, dragUndoCapturedRef, edgeListForNodeIds, expandActiveGroupSelection, findConnectTargetAtPoint, finishConnectToTarget, groupExpandedCanvasSelection, handleRoutableLineNodePointerDown, handleTerminalPointerDown, hasCanvasSelectionModifier, isBrowseMode, isBusNode, isMultiNodeMoveState, isRoutableLineDeviceKind, isStaticButtonEnabledForNode, isWholeActiveLayerMove, lastCanvasPointerRef, mode, movableCanvasNodeIds, nodeById, resetConnectPreviewState, resolveConnectPreviewPoint, restoreCanvasSelectionSnapshotWithInspector, routableLinePlacement, routePointsSnapshotForMove, screenToSvgPoint, selectCanvasGraphics, selectedEdgeId, selectedEdgeIds, selectedGroupMemberNodeIdSet, selectedNodeIdSet, selectedNodeIds, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, snapshotRouteBounds, startDraggingState, startModifierSelectionPress, staticDrawing, svgRef, switchInspectorTabForCanvasSelection, updateMouseStatus } = __appScope;
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    if (staticDrawing && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    activateInspectorFromCanvas();
    if (isBrowseMode) {
      if (isStaticButtonEnabledForNode(node)) {
        beginStaticButtonPointerFeedback(event, node);
        return;
      }
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      switchInspectorTabForCanvasSelection([node.id], [], "single");
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setContextMenu(null);
      return;
    }
    if (routableLinePlacement && isBusNode(node)) {
      event.preventDefault();
      event.stopPropagation();
      handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      return;
    }
    if (connectSource && svgRef.current) {
      event.preventDefault();
      event.stopPropagation();
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
      const previewPoint = resolveConnectPreviewPoint(pointer, event);
      const target = findConnectTargetAtPoint(previewPoint);
      applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
      if (target) {
        finishConnectToTarget(target, previewPoint);
      }
      return;
    }
    if (isRoutableLineDeviceKind(node.kind)) {
      handleRoutableLineNodePointerDown(event, node);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    beginStaticButtonPointerFeedback(event, node);
    const nodeWasSelected = selectedNodeIdSet.has(node.id);
    const hadCanvasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;
    let applyPointerDownSelectionImmediately = false;
    const clickedSelectedGroupMember =
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.metaKey &&
      nodeWasSelected &&
      selectedGroupMemberNodeIdSet.has(node.id);
    const keepEdgeSelection = nodeWasSelected && activeSelectedEdgeIds.length > 0;
    let dragSelectionSnapshot = createCanvasSelectionSnapshot(
      canvasSelectionScope,
      selectedNodeIds,
      keepEdgeSelection ? selectedEdgeIds : [],
      keepEdgeSelection ? selectedEdgeId : ""
    );
    if (!keepEdgeSelection && nodeWasSelected && activeSelectedEdgeIds.length > 0) {
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
    }
    const groupDragSelection = {
      nodeIds: groupExpandedCanvasSelection.nodeIds,
      edgeIds: groupExpandedCanvasSelection.edgeIds
    };
    let dragSelection = nodeWasSelected
      ? groupDragSelection
      : expandActiveGroupSelection([node.id], []);
    if (clickedSelectedGroupMember) {
      dragSelectionSnapshot = createCanvasSelectionSnapshot("direct", [node.id], [], "");
      applyPointerDownSelectionImmediately = true;
    } else if (event.ctrlKey || event.shiftKey || event.metaKey) {
      dragSelection = nodeWasSelected
        ? groupDragSelection
        : expandActiveGroupSelection([...activeSelectedNodeIds, node.id], activeSelectedEdgeIds);
      dragSelectionSnapshot = createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "");
      applyPointerDownSelectionImmediately = true;
    } else if (!nodeWasSelected) {
      dragSelection = expandActiveGroupSelection([node.id], []);
      dragSelectionSnapshot = createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "");
      applyPointerDownSelectionImmediately = hadCanvasSelection;
    }
    if (applyPointerDownSelectionImmediately) {
      restoreCanvasSelectionSnapshotWithInspector(dragSelectionSnapshot);
    }
    const dragNodeIds = movableCanvasNodeIds(dragSelection.nodeIds);
    if (mode === "connect") {
      if (isBusNode(node)) {
        handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      }
      return;
    }
    if (connectSource && isBusNode(node)) {
      handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
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
      selection: dragSelectionSnapshot
    };
    startDraggingState(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createHandleRoutableLineNodePathPointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGPathElement>, node: ModelNode) => {
  const { handleRoutableLineNodePointerDown } = __appScope;
    handleRoutableLineNodePointerDown(event, node);
  };
}

export function createHandlePointerMove(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { CANVAS_SELECTION_DRAG_THRESHOLD, MOVE_BOUNDARY_GUARD, applyCanvasPanningVisualOffset, buildGroupTransformNodeUpdates, buildRoutableLineEndpointPreviewNodeUpdates, canvasBounds, canvasFrameRef, canvasFrameUserScrollRef, canvasNoScrollOffsetRef, clampCanvasNoScrollOffsetPoint, clampNumber, clampPointToCanvas, clampViewBoxToCanvas, connectSource, contextMarqueeSelectionRef, draggingRef, getNodeScaleX, getNodeScaleY, graphStore, isBusNode, isGroupTransformDrag, isRoutableLineDeviceKind, lastCanvasClientPointerRef, lastCanvasPointerRef, lastRawCanvasPointerRef, latestGraphStoreRef, libraryPlacement, manualPathDrag, marquee, modelGeometryInsideCanvasBounds, modifierSelectionPressRef, moveOrthogonalRouteSegment, moveRoutableLineDeviceSegment, nodeById, nodeLabelDrag, nodeLabelRotateDrag, nodeLabelRotationFromPoint, normalizeNodeLabelRotation, normalizeRotationDegrees, panning, panningRef, patchGraphNodes, patchSingleTerminalAnchorFromPoint, pendingCanvasNoScrollOffsetRef, proportionalSignedScaleFromHandleDelta, proportionalSignedScaleFromUprightHandleDelta, pushUndoSnapshot, resolveConnectPreviewPoint, resolveRoutableLinePreviewPoint, rewiring, rotationDeltaBetweenTransformPoints, routableLineDeviceCanvasPoints, routableLineEndpointDrag, routableLinePlacement, sameOptionalPoint, sameOptionalPointList, scheduleConnectPreviewPoint, scheduleNodeDragMove, scheduleRewirePreviewPoint, scheduleRoutableLinePreviewPoint, screenToSvgPoint, setManualPathDrag, setMarquee, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setRoutableLineDeviceCanvasPoints, setTerminalPress, setTransformDrag, setViewBox, signedScaleFromRotatedHandleDelta, signedScaleFromUprightHandleDelta, singleTransformBaseNode, staticButtonPointerRef, staticDrawing, svgRef, terminalPress, transformDrag, transformDragChangedRef, updateGraphNodeById, updateInteractiveStaticDrawingPreview, updateLibraryPlacementPreview, updateMeasurementDrag, updateMouseStatus, updateRoutableLineEndpointDrag } = __appScope;
    const staticButtonPointer = staticButtonPointerRef.current;
    if (
      staticButtonPointer &&
      !staticButtonPointer.moved &&
      Math.hypot(event.clientX - staticButtonPointer.clientX, event.clientY - staticButtonPointer.clientY) > 4
    ) {
      staticButtonPointerRef.current = { ...staticButtonPointer, moved: true };
    }
    const activePanning = panningRef.current ?? panning;
    if (activePanning && svgRef.current) {
      const frame = canvasFrameRef.current;
      const useHorizontalScrollPanning = Boolean(frame && activePanning.horizontalScrollMode);
      const useVerticalScrollPanning = Boolean(frame && activePanning.verticalScrollMode);
      if (frame) {
        const maxLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
        const maxTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
        let scrollChanged = false;
        if (useHorizontalScrollPanning) {
          const nextLeft = activePanning.scrollLeft - (event.clientX - activePanning.clientX);
          if (Math.abs(frame.scrollLeft - nextLeft) > 0.5) {
            frame.scrollLeft = nextLeft;
            scrollChanged = true;
          }
        }
        if (useVerticalScrollPanning) {
          const nextTop = activePanning.scrollTop - (event.clientY - activePanning.clientY);
          if (Math.abs(frame.scrollTop - nextTop) > 0.5) {
            frame.scrollTop = nextTop;
            scrollChanged = true;
          }
        }
        const nextOffset = clampCanvasNoScrollOffsetPoint({
          x: useHorizontalScrollPanning ? activePanning.canvasOffset.x : activePanning.canvasOffset.x + event.clientX - activePanning.clientX,
          y: useVerticalScrollPanning ? activePanning.canvasOffset.y : activePanning.canvasOffset.y + event.clientY - activePanning.clientY
        });
        pendingCanvasNoScrollOffsetRef.current = nextOffset;
        canvasNoScrollOffsetRef.current = nextOffset;
        applyCanvasPanningVisualOffset(nextOffset);
        if (scrollChanged) {
          canvasFrameUserScrollRef.current = true;
        }
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const dx = rect.width > 0 ? ((event.clientX - activePanning.clientX) / rect.width) * canvasBounds.width : 0;
      const dy = rect.height > 0 ? ((event.clientY - activePanning.clientY) / rect.height) * canvasBounds.height : 0;
      const nextViewBox = clampViewBoxToCanvas({ ...activePanning.viewBox, x: activePanning.viewBox.x - dx, y: activePanning.viewBox.y - dy });
      setViewBox((current) =>
        current.x === nextViewBox.x &&
        current.y === nextViewBox.y &&
        current.width === nextViewBox.width &&
        current.height === nextViewBox.height
          ? current
          : nextViewBox
      );
      return;
    }
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const pointer = draggingRef.current ? rawPointer : clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
      updateMouseStatus(pointer);
      if (libraryPlacement) {
        updateLibraryPlacementPreview(pointer);
      }
      if (routableLinePlacement) {
        const previewPoint = resolveRoutableLinePreviewPoint(pointer, event);
        scheduleRoutableLinePreviewPoint(previewPoint);
      }
      const activeContextMarqueeSelection = contextMarqueeSelectionRef.current;
      if (activeContextMarqueeSelection) {
        setMarquee({ start: activeContextMarqueeSelection.start, current: pointer });
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (routableLineEndpointDrag) {
        updateRoutableLineEndpointDrag(pointer, event.ctrlKey);
      }
      if (connectSource) {
        const previewPoint = resolveConnectPreviewPoint(pointer, event);
        scheduleConnectPreviewPoint(previewPoint);
      }
      if (staticDrawing && !connectSource) {
        updateInteractiveStaticDrawingPreview(pointer);
      }
    }
    if (updateMeasurementDrag(event)) {
      return;
    }
    const modifierPress = modifierSelectionPressRef.current;
    if (modifierPress && svgRef.current && modifierPress.pointerId === event.pointerId) {
      const currentPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const moved =
        modifierPress.moved ||
        Math.hypot(event.clientX - modifierPress.startClientX, event.clientY - modifierPress.startClientY) > CANVAS_SELECTION_DRAG_THRESHOLD;
      const nextPress = sameOptionalPoint(modifierPress.currentPoint, currentPoint) && modifierPress.moved === moved
        ? modifierPress
        : { ...modifierPress, currentPoint, moved };
      if (nextPress !== modifierPress) {
        setModifierSelectionPress(nextPress);
      }
      if (moved) {
        setMarquee({ start: modifierPress.startPoint, current: currentPoint });
      } else {
        setMarquee(null);
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (nodeLabelRotateDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const nextRotation = String(nodeLabelRotationFromPoint(nodeLabelRotateDrag.center, point));
      const currentNode = nodeById.get(nodeLabelRotateDrag.nodeId);
      if (!currentNode || normalizeNodeLabelRotation(currentNode.params._labelRotation) === Number(nextRotation)) {
        return;
      }
      if (!nodeLabelRotateDrag.historyCaptured) {
        pushUndoSnapshot();
      }
      updateGraphNodeById(nodeLabelRotateDrag.nodeId, (node) => ({
        ...node,
        params: { ...node.params, _labelRotation: nextRotation }
      }));
      setNodeLabelRotateDrag((current) =>
        current && current.nodeId === nodeLabelRotateDrag.nodeId
          ? { ...current, historyCaptured: true }
          : current
      );
      return;
    }
    if (nodeLabelDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const nextOffset = {
        x: Math.round((nodeLabelDrag.startOffset.x + (point.x - nodeLabelDrag.startPoint.x) / nodeLabelDrag.scaleX) * 10) / 10,
        y: Math.round((nodeLabelDrag.startOffset.y + (point.y - nodeLabelDrag.startPoint.y) / nodeLabelDrag.scaleY) * 10) / 10
      };
      if (sameOptionalPoint(nextOffset, nodeLabelDrag.startOffset) && !nodeLabelDrag.historyCaptured) {
        return;
      }
      if (!nodeLabelDrag.historyCaptured) {
        pushUndoSnapshot();
      }
      updateGraphNodeById(nodeLabelDrag.nodeId, (node) => {
        const currentX = node.params._labelX ?? "";
        const currentY = node.params._labelY ?? "";
        const nextX = String(nextOffset.x);
        const nextY = String(nextOffset.y);
        if (currentX === nextX && currentY === nextY) {
          return node;
        }
        return { ...node, params: { ...node.params, _labelX: nextX, _labelY: nextY } };
      });
      setNodeLabelDrag((current) =>
        current && current.nodeId === nodeLabelDrag.nodeId
          ? { ...current, historyCaptured: current.historyCaptured || nodeLabelDrag.historyCaptured || !sameOptionalPoint(nextOffset, nodeLabelDrag.startOffset) }
          : current
      );
      return;
    }
    if (terminalPress && svgRef.current) {
      const point = lastCanvasPointerRef.current;
      const node = nodeById.get(terminalPress.nodeId);
      if (!node || !point) {
        return;
      }
      const distance = Math.hypot(point.x - terminalPress.startPoint.x, point.y - terminalPress.startPoint.y);
      const nextPress = { ...terminalPress, currentPoint: point, moved: terminalPress.moved || distance > 4 };
      if (!nextPress.moved) {
        setTerminalPress(nextPress);
        return;
      }
      if (isBusNode(node) || node.terminals.length !== 1) {
        setTerminalPress(nextPress);
        return;
      }
      if (!nextPress.historyCaptured) {
        pushUndoSnapshot();
        nextPress.historyCaptured = true;
      }
      setTerminalPress(nextPress);
      patchSingleTerminalAnchorFromPoint(terminalPress.nodeId, terminalPress.terminalId, point, terminalPress.startPoint);
      return;
    }
    if (manualPathDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current;
      if (!point) {
        return;
      }
      const nextDrag = { ...manualPathDrag };
      if (!nextDrag.historyCaptured) {
        pushUndoSnapshot();
        nextDrag.historyCaptured = true;
      }
      const originalRoutePoints = nextDrag.originalRoutePoints;
      if (originalRoutePoints.length < 2) {
        return;
      }
      const nextPoints = originalRoutePoints.map((item) => ({ ...item }));
      const routableLineNode = nextDrag.nodeId ? nodeById.get(nextDrag.nodeId) : undefined;
      if ("pointIndex" in nextDrag) {
        if (nextDrag.pointIndex > 0 && nextDrag.pointIndex < originalRoutePoints.length - 1) {
          const originalPoint = originalRoutePoints[nextDrag.pointIndex];
          nextPoints[nextDrag.pointIndex] = clampPointToCanvas({
            x: originalPoint.x + point.x - nextDrag.startPoint.x,
            y: originalPoint.y + point.y - nextDrag.startPoint.y
          });
        }
      } else {
        nextPoints.splice(
          0,
          nextPoints.length,
          ...moveOrthogonalRouteSegment(originalRoutePoints, nextDrag.segmentIndex, nextDrag.orientation, point, canvasBounds)
        );
      }
      const previewRoutePoints = routableLineNode && isRoutableLineDeviceKind(routableLineNode.kind)
        ? routableLineDeviceCanvasPoints(
            "pointIndex" in nextDrag
              ? setRoutableLineDeviceCanvasPoints(routableLineNode, nextPoints)
              : moveRoutableLineDeviceSegment(
                  setRoutableLineDeviceCanvasPoints(routableLineNode, originalRoutePoints),
                  nextDrag.segmentIndex,
                  nextDrag.orientation,
                  point,
                  canvasBounds
                )
          )
        : nextPoints.map((item) => ({ ...item }));
      if (!modelGeometryInsideCanvasBounds([], [{ points: previewRoutePoints }], canvasBounds, MOVE_BOUNDARY_GUARD)) {
        return;
      }
      if (
        nextDrag.historyCaptured === manualPathDrag.historyCaptured &&
        sameOptionalPointList(previewRoutePoints, manualPathDrag.previewRoutePoints)
      ) {
        return;
      }
      setManualPathDrag({ ...nextDrag, previewRoutePoints });
      return;
    }
    if (rewiring && svgRef.current) {
      const previewPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      scheduleRewirePreviewPoint(previewPoint, rewiring, event.ctrlKey);
      return;
    }
    if (marquee && svgRef.current) {
      const currentPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      setMarquee((current) =>
        current && !sameOptionalPoint(current.current, currentPoint)
          ? { ...current, current: currentPoint }
          : current
      );
      return;
    }
    if (transformDrag && svgRef.current) {
      const rawPoint = lastRawCanvasPointerRef.current ?? screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const point = transformDrag.kind === "rotate" ? clampPointToCanvas(rawPoint) : rawPoint;
      transformDragChangedRef.current = true;
      if (!transformDrag.historyCaptured) {
        pushUndoSnapshot();
        if (!isGroupTransformDrag(transformDrag)) {
          setTransformDrag({ ...transformDrag, historyCaptured: true });
        }
      }
      const currentStore = latestGraphStoreRef.current ?? graphStore;
      if (isGroupTransformDrag(transformDrag)) {
        const transformForMove = transformDrag.kind === "rotate"
          ? transformDrag
          : { ...transformDrag, proportionalScale: true };
        const nextNodeUpdates = buildGroupTransformNodeUpdates(transformForMove, point, currentStore);
        if (nextNodeUpdates.length === 0) {
          return;
        }
        setTransformDrag((current) =>
          current && isGroupTransformDrag(current) && current.groupId === transformDrag.groupId
            ? current.historyCaptured && current.proportionalScale === transformForMove.proportionalScale && sameOptionalPoint(current.previewPoint, point)
              ? current
              : { ...current, historyCaptured: true, proportionalScale: transformForMove.proportionalScale, previewPoint: point }
            : current
        );
        return;
      }
      const node = currentStore.nodeMap.get(transformDrag.nodeId);
      if (!node) {
        return;
      }
      const baseNode = singleTransformBaseNode(transformDrag, node);
      let nextNode: ModelNode;
      if (transformDrag.kind === "rotate") {
        const rotationDelta = rotationDeltaBetweenTransformPoints(baseNode.position, transformDrag.startPoint, point, false);
        nextNode = {
          ...node,
          position: baseNode.position,
          rotation: normalizeRotationDegrees(baseNode.rotation + rotationDelta),
          scale: baseNode.scale,
          scaleX: baseNode.scaleX,
          scaleY: baseNode.scaleY
        };
        setTransformDrag((current) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && sameOptionalPoint(current.previewPoint, point)
              ? current
              : { ...current, historyCaptured: true, previewPoint: point }
            : current
        );
      } else {
        const currentSignedScaleX = getNodeScaleX(baseNode);
        const currentSignedScaleY = getNodeScaleY(baseNode);
        const localScaleKind = event.shiftKey || transformDrag.kind === "scale-both"
          ? "scale-both"
          : transformDrag.kind;
        const proportionalScale = localScaleKind === "scale-both";
        const signedScaleFromHandleDelta = transformDrag.uprightStaticSelection
          ? signedScaleFromUprightHandleDelta
          : signedScaleFromRotatedHandleDelta;
        setTransformDrag((current) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && current.proportionalScale === proportionalScale
              ? current
              : { ...current, historyCaptured: true, proportionalScale }
            : current
        );
        if (localScaleKind === "scale-x") {
          const nextSignedScaleX = signedScaleFromHandleDelta(transformDrag, point, baseNode, "scale-x");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(nextSignedScaleX), Math.abs(currentSignedScaleY)),
            scaleX: nextSignedScaleX,
            scaleY: currentSignedScaleY
          };
        } else if (localScaleKind === "scale-y") {
          const nextSignedScaleY = signedScaleFromHandleDelta(transformDrag, point, baseNode, "scale-y");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(currentSignedScaleX), Math.abs(nextSignedScaleY)),
            scaleX: currentSignedScaleX,
            scaleY: nextSignedScaleY
          };
        } else {
          const nextSignedScale = transformDrag.uprightStaticSelection
            ? proportionalSignedScaleFromUprightHandleDelta(transformDrag, point, baseNode)
            : proportionalSignedScaleFromHandleDelta(transformDrag, point, baseNode);
          nextNode = { ...node, position: baseNode.position, rotation: baseNode.rotation, scale: nextSignedScale.scale, scaleX: nextSignedScale.scaleX, scaleY: nextSignedScale.scaleY };
        }
      }
      const routableLinePreviewNodeUpdates = buildRoutableLineEndpointPreviewNodeUpdates(
        currentStore.nodes,
        currentStore.nodeMap,
        [nextNode.id],
        [nextNode],
        canvasBounds
      );
      patchGraphNodes([nextNode, ...routableLinePreviewNodeUpdates]);
      return;
    }
    if (!draggingRef.current || !svgRef.current) {
      return;
    }
    const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    scheduleNodeDragMove(point, event.ctrlKey, event.shiftKey);
  };
}

export function createFinishCanvasPanning(__appScope: Record<string, any>) {
  return () => {
  const { applyCanvasPanningVisualOffset, canvasNoScrollOffsetRef, panningRef, pendingCanvasNoScrollOffsetRef, scheduleCanvasVisibleViewBoxUpdate, setCanvasNoScrollOffset, setCanvasPanning } = __appScope;
    if (!panningRef.current && !pendingCanvasNoScrollOffsetRef.current) {
      return;
    }
    const pendingOffset = pendingCanvasNoScrollOffsetRef.current;
    pendingCanvasNoScrollOffsetRef.current = null;
    if (pendingOffset) {
      canvasNoScrollOffsetRef.current = pendingOffset;
      applyCanvasPanningVisualOffset(pendingOffset);
      setCanvasNoScrollOffset((current) =>
        current.x === pendingOffset.x && current.y === pendingOffset.y ? current : pendingOffset
      );
    }
    scheduleCanvasVisibleViewBoxUpdate();
    setCanvasPanning(null);
  };
}

export function createStartCanvasPanning(__appScope: Record<string, any>) {
  return (event: PointerEvent<Element>) => {
  const { activateInspectorFromCanvas, canvasFrameHasHorizontalScrollableRange, canvasFrameHasVerticalScrollableRange, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasInteractionRef, canvasNoScrollOffsetRef, canvasVerticalScrollbarsActiveRef, clampPointToCanvas, currentViewBoxFromCanvasFrameScroll, lastCanvasPointerRef, lastRawCanvasPointerRef, pendingCanvasNoScrollOffsetRef, projectListPointerInsideRef, resetConnectPreviewState, screenToSvgPoint, setCanvasPanning, setConnectSource, setContextMenu, setProjectMenu, setRewiring, svgRef, updateMouseStatus } = __appScope;
    const svg = svgRef.current;
    if (event.button !== 0 || !svg) {
      return false;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    const rawPointer = screenToSvgPoint(svg, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    updateMouseStatus(pointer);
    setContextMenu(null);
    setProjectMenu(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    const frame = canvasFrameRef.current;
    const panningViewBox = currentViewBoxFromCanvasFrameScroll();
    pendingCanvasNoScrollOffsetRef.current = null;
    setCanvasPanning({
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox: panningViewBox,
      canvasOffset: canvasNoScrollOffsetRef.current,
      scrollLeft: frame?.scrollLeft ?? 0,
      scrollTop: frame?.scrollTop ?? 0,
      horizontalScrollMode: frame ? canvasHorizontalScrollbarsActiveRef.current && canvasFrameHasHorizontalScrollableRange(frame) : false,
      verticalScrollMode: frame ? canvasVerticalScrollbarsActiveRef.current && canvasFrameHasVerticalScrollableRange(frame) : false
    });
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  };
}

export function createHandleCanvasPointerDownCapture(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { connectSource, hasCanvasSelectionModifier, lastCanvasClientPointerRef, staticDrawing } = __appScope;
    lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
    if (!hasCanvasSelectionModifier(event) || staticDrawing || connectSource) {
      return;
    }
  };
}

export function createClientPointInsideRenderedCanvas(__appScope: Record<string, any>) {
  return (clientX: number, clientY: number) => {
  const { canvasFrameRef, svgRef } = __appScope;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) {
      return false;
    }
    const frameRect = frame.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    return (
      clientX >= frameRect.left &&
      clientX <= frameRect.right &&
      clientY >= frameRect.top &&
      clientY <= frameRect.bottom &&
      clientX >= svgRect.left &&
      clientX <= svgRect.right &&
      clientY >= svgRect.top &&
      clientY <= svgRect.bottom
    );
  };
}

export function createFocusCanvasKeyboardShortcutHost(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement>) => {
  const { canvasFrameRef, canvasInteractionRef, clampPointToCanvas, clientPointInsideRenderedCanvas, isCanvasKeyboardBlockingTarget, lastCanvasClientPointerRef, lastCanvasPointerRef, lastKeyboardShortcutClientPointerRef, lastRawCanvasPointerRef, projectListPointerInsideRef, screenToSvgPoint, svgRef, updateMouseStatus } = __appScope;
    lastKeyboardShortcutClientPointerRef.current = { x: event.clientX, y: event.clientY };
    if (isCanvasKeyboardBlockingTarget(event.target)) {
      return;
    }
    const svg = svgRef.current;
    if (!svg || !clientPointInsideRenderedCanvas(event.clientX, event.clientY)) {
      return;
    }
    const rawPointer = screenToSvgPoint(svg, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
    updateMouseStatus(pointer);
    canvasFrameRef.current?.focus({ preventScroll: true });
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
  };
}

export function createWheelZoomAnchorFromClient(__appScope: Record<string, any>) {
  return (clientX: number, clientY: number): WheelZoomAnchor | null => {
  const { canvasBoundsRef, canvasFrameRef, canvasVisibleViewBoxRef, clampNumber, clampPointToBounds, screenToSvgPoint, svgRef, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) {
      return null;
    }
    const frameRect = frame.getBoundingClientRect();
    const cursorInsideFrame =
      clientX >= frameRect.left &&
      clientX <= frameRect.right &&
      clientY >= frameRect.top &&
      clientY <= frameRect.bottom;
    if (cursorInsideFrame) {
      return {
        point: clampPointToBounds(screenToSvgPoint(svg, clientX, clientY), canvasBoundsRef.current),
        cursorOffsetX: clampNumber(clientX - frameRect.left, 0, frameRect.width),
        cursorOffsetY: clampNumber(clientY - frameRect.top, 0, frameRect.height)
      };
    }
    const visible = canvasVisibleViewBoxRef.current;
    const current = viewBoxRef.current;
    const fallbackPoint = visible.width > 0 && visible.height > 0
      ? {
          x: visible.x + visible.width / 2,
          y: visible.y + visible.height / 2
        }
      : {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
    return {
      point: clampPointToBounds(fallbackPoint, canvasBoundsRef.current),
      cursorOffsetX: frameRect.width / 2,
      cursorOffsetY: frameRect.height / 2
    };
  };
}

export function createFlushPendingWheelZoom(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, pendingWheelZoomAnchorRef, pendingWheelZoomRequestRef, setViewBox, wheelZoomFrameRef, width } = __appScope;
    const request = pendingWheelZoomRequestRef.current;
    wheelZoomFrameRef.current = null;
    if (!request) {
      return;
    }
    pendingWheelZoomRequestRef.current = null;
    pendingWheelZoomAnchorRef.current = request.anchor;
    setViewBox((current) => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: current.width * request.zoomFactor, height: current.height * request.zoomFactor },
        bounds
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: request.anchor.point.x - request.anchor.cursorOffsetX / nextScaleX,
        y: request.anchor.point.y - request.anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
  };
}

export function createScheduleWheelZoom(__appScope: Record<string, any>) {
  return (anchor: WheelZoomAnchor, zoomFactor: number) => {
  const { flushPendingWheelZoom, pendingWheelZoomRequestRef, wheelZoomFrameRef } = __appScope;
    const current = pendingWheelZoomRequestRef.current;
    pendingWheelZoomRequestRef.current = current
      ? { anchor, zoomFactor: current.zoomFactor * zoomFactor }
      : { anchor, zoomFactor };
    if (wheelZoomFrameRef.current !== null) {
      return;
    }
    wheelZoomFrameRef.current = window.requestAnimationFrame(flushPendingWheelZoom);
  };
}

export function createZoomCanvasFromWheelEvent(__appScope: Record<string, any>) {
  return (event: CanvasWheelZoomEvent) => {
  const { scheduleWheelZoom, shouldZoomCanvasFromWheelEvent, wheelZoomAnchorFromClient } = __appScope;
    if (!shouldZoomCanvasFromWheelEvent(event)) {
      return false;
    }
    if (!event.defaultPrevented) {
      event.preventDefault();
    }
    event.stopPropagation();
    const anchor = wheelZoomAnchorFromClient(event.clientX, event.clientY);
    if (!anchor) {
      return true;
    }
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
    scheduleWheelZoom(anchor, zoomFactor);
    return true;
  };
}

export function createHandleWheel(__appScope: Record<string, any>) {
  return (event: React.WheelEvent<SVGSVGElement>) => {
  const { canvasWheelTargetIsRenderedCanvas, isCanvasWheelZoomExcludedTarget, shouldZoomCanvasFromWheelEvent, zoomCanvasFromWheelEvent } = __appScope;
    if (!shouldZoomCanvasFromWheelEvent(event)) {
      return;
    }
    if (isCanvasWheelZoomExcludedTarget(event.target) || !canvasWheelTargetIsRenderedCanvas(event.target)) {
      return;
    }
    if (event.nativeEvent.defaultPrevented) {
      event.stopPropagation();
      return;
    }
    zoomCanvasFromWheelEvent(event);
  };
}

export function createDeleteSelected(__appScope: Record<string, any>) {
  return () => {
  const { deleteSelection } = __appScope;
    deleteSelection();
  };
}

export function createRunContextMenuAction(__appScope: Record<string, any>) {
  return (action: () => void) => {
  const { setContextMenu, setProjectMenu, setTemplateMenu } = __appScope;
    action();
    setContextMenu(null);
    setProjectMenu(null);
    setTemplateMenu(null);
  };
}

export function createReadjustMovedBusConnectionRoutes(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    bounds: CanvasBounds
  ) => {
  const { isBusNode, realignConnectionEdgeBusEndpointPoints, redrawConnectionRoutesForEdges } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return candidateEdges;
    }
    const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
    const busConnectedEdgeIds: string[] = [];
    for (const edge of candidateEdges) {
      if (!(movedIds.has(edge.sourceId) || movedIds.has(edge.targetId))) {
        continue;
      }
      const source = nextNodeById.get(edge.sourceId);
      const target = nextNodeById.get(edge.targetId);
      if (!source || !target || (!isBusNode(source) && !isBusNode(target))) {
        continue;
      }
      busConnectedEdgeIds.push(edge.id);
    }
    if (busConnectedEdgeIds.length === 0) {
      return candidateEdges;
    }
    const redrawnCandidateEdges = redrawConnectionRoutesForEdges(nextNodes, candidateEdges, busConnectedEdgeIds, bounds);
    const busConnectedEdgeIdSet = new Set(busConnectedEdgeIds);
    const realignedCandidateEdges = redrawnCandidateEdges.map((edge) =>
      busConnectedEdgeIdSet.has(edge.id) ? realignConnectionEdgeBusEndpointPoints(nextNodes, edge) : edge
    );
    return redrawConnectionRoutesForEdges(nextNodes, realignedCandidateEdges, busConnectedEdgeIds, bounds);
  };
}

export function createReadjustActiveLayerBusEndpointRoutes(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerEdges, activeLayerNodes, canvasBounds, edges, isBusNode, isRoutableLineDeviceKind, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, patchGraphNodes, pushUndoSnapshot, redrawConnectionRoutesForEdges, redrawRoutableLineDeviceRoutes, routableLineDeviceEndpointRefs, undoScopeForGraphPatch } = __appScope;
    const edgeIds = activeLayerEdges
      .filter((edge: Edge) => {
        const source = nodeById.get(edge.sourceId);
        const target = nodeById.get(edge.targetId);
        return source && target && (isBusNode(source) || isBusNode(target));
      })
      .map((edge: Edge) => edge.id);
    const lineNodeIds = activeLayerNodes
      .filter((node: ModelNode) => {
        if (!isRoutableLineDeviceKind(node.kind)) {
          return false;
        }
        const refs = routableLineDeviceEndpointRefs(node);
        const sourceNode = refs.source ? nodeById.get(refs.source.nodeId) : undefined;
        const targetNode = refs.target ? nodeById.get(refs.target.nodeId) : undefined;
        return Boolean((sourceNode && isBusNode(sourceNode)) || (targetNode && isBusNode(targetNode)));
      })
      .map((node: ModelNode) => node.id);

    if (edgeIds.length === 0 && lineNodeIds.length === 0) {
      return 0;
    }

    const nextEdges = edgeIds.length > 0
      ? redrawConnectionRoutesForEdges(nodes, edges, edgeIds, canvasBounds)
      : edges;
    const changedEdges: Edge[] = [];
    for (let index = 0; index < nextEdges.length; index += 1) {
      if (nextEdges[index] !== edges[index]) {
        changedEdges.push(nextEdges[index]);
      }
    }
    const changedLineNodes = lineNodeIds.length > 0
      ? redrawRoutableLineDeviceRoutes(nodes, lineNodeIds, canvasBounds)
      : [];
    if (changedEdges.length === 0 && changedLineNodes.length === 0) {
      return 0;
    }

    const changedEdgeIds = changedEdges.map((edge) => edge.id);
    const changedNodeIds = changedLineNodes.map((node) => node.id);
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(changedNodeIds, changedEdgeIds));
    if (changedEdges.length > 0) {
      markRouteEdgesDirty(changedEdgeIds);
      markStoredRouteEdgesDirty(changedEdgeIds);
      patchGraphEdges(changedEdges);
    }
    if (changedLineNodes.length > 0) {
      patchGraphNodes(changedLineNodes);
    }
    return changedEdges.length + changedLineNodes.length;
  };
}

export function createCommitLayoutNodePositions(__appScope: Record<string, any>) {
  return (
    layoutNodeIds: string[],
    arranged: ModelNode[],
    options: { readjustBusEndpoints?: boolean } = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, adjustEdgesAfterNodeMove, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, commitFastMovedGraphPatches, currentStoredRoutePointsForEdge, edgeListForNodeIds, edges, finalizeMovedNodeEdgesFast, isRoutableLineDeviceKind, mergeNodeUpdateLists, nodeById, nodes, orderedNodeFromList, pushUndoSnapshot, readjustMovedBusConnectionRoutes, realignRoutableLineDeviceBusEndpointPoints, redrawRoutableLineDeviceRoutes, rejectAutoCanvasExpansionForContent, routableLineIdsConnectedToNodeIds, snapshotEdgePoints, undoScopeForGraphPatch } = __appScope;
    const uniqueLayoutNodeIds = Array.from(new Set(layoutNodeIds));
    if (uniqueLayoutNodeIds.length === 0) {
      return 0;
    }
    const movedNodeUpdates = uniqueLayoutNodeIds.flatMap((nodeId) => {
      const previous = nodeById.get(nodeId);
      const nextNode = orderedNodeFromList(arranged, nodeId);
      if (!previous || !nextNode) {
        return [];
      }
      return previous.position.x !== nextNode.position.x || previous.position.y !== nextNode.position.y ? [nextNode] : [];
    });
    if (movedNodeUpdates.length === 0) {
      return 0;
    }
    const movedNodeIds = movedNodeUpdates.map((node) => node.id);
    const movedNodeIdSet = new Set(movedNodeIds);
    const affectedEdgesForLayout = edgeListForNodeIds(movedNodeIds);
    const busConnectedLineNodeIds = options.readjustBusEndpoints
      ? routableLineIdsConnectedToNodeIds(movedNodeIds)
      : new Set<string>();
    if (rejectAutoCanvasExpansionForContent(movedNodeUpdates, affectedEdgesForLayout)) {
      return 0;
    }
    pushUndoSnapshot(
      true,
      false,
      undoScopeForGraphPatch(
        busConnectedLineNodeIds.size > 0 ? [...movedNodeIds, ...busConnectedLineNodeIds] : movedNodeIds,
        affectedEdgesForLayout.map((edge) => edge.id)
      )
    );
    const layoutCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBounds,
      arranged,
      edges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(layoutCanvasBounds);
    const originalPositions = Object.fromEntries(
      movedNodeIds.flatMap((id) => {
        const node = nodeById.get(id);
        return node ? [[id, node.position]] : [];
      })
    );
    const deltas = Object.fromEntries(
      movedNodeUpdates.map((node) => {
        const previous = nodeById.get(node.id);
        return [
          node.id,
          {
            x: node.position.x - (previous?.position.x ?? node.position.x),
            y: node.position.y - (previous?.position.y ?? node.position.y)
          }
        ];
      })
    );
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForLayout);
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForLayout.map((edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
    const adjustedAffectedEdges = affectedEdgesForLayout.length > 0
      ? adjustEdgesAfterNodeMove(
          affectedEdgesForLayout,
          arranged,
          movedNodeIdSet,
          originalEdgePoints,
          deltas,
          originalRoutePoints,
          new Set<string>(),
          layoutCanvasBounds
        )
      : affectedEdgesForLayout;
    const finalizedCandidateEdges = adjustedAffectedEdges.length > 0
      ? finalizeMovedNodeEdgesFast(
          nodes,
          arranged,
          adjustedAffectedEdges,
          movedNodeIds,
          adjustedAffectedEdges
        )
      : adjustedAffectedEdges;
    const committedCandidateEdges = options.readjustBusEndpoints
      ? readjustMovedBusConnectionRoutes(
          arranged,
          finalizedCandidateEdges,
          movedNodeIds,
          layoutCanvasBounds
        )
      : finalizedCandidateEdges;
    let committedNodeUpdates = movedNodeUpdates;
    let committedArrangedNodes = arranged;
    if (options.readjustBusEndpoints && busConnectedLineNodeIds.size > 0) {
      const initiallyRedrawnLineNodes = redrawRoutableLineDeviceRoutes(
        committedArrangedNodes,
        busConnectedLineNodeIds,
        layoutCanvasBounds
      );
      const initiallyRedrawnLineById = new Map(initiallyRedrawnLineNodes.map((node) => [node.id, node]));
      const arrangedWithInitialRedrawnLines = initiallyRedrawnLineNodes.length > 0
        ? committedArrangedNodes.map((node) => initiallyRedrawnLineById.get(node.id) ?? node)
        : committedArrangedNodes;
      const realignedLineNodes: ModelNode[] = [];
      for (const lineNodeId of busConnectedLineNodeIds) {
        const lineNode = orderedNodeFromList(arrangedWithInitialRedrawnLines, lineNodeId) ?? nodeById.get(lineNodeId);
        if (!lineNode || !isRoutableLineDeviceKind(lineNode.kind)) {
          continue;
        }
        const realignedLineNode = realignRoutableLineDeviceBusEndpointPoints(lineNode, arrangedWithInitialRedrawnLines);
        if (realignedLineNode !== lineNode) {
          realignedLineNodes.push(realignedLineNode);
        }
      }
      const realignedLineNodeById = new Map(realignedLineNodes.map((node) => [node.id, node]));
      const arrangedWithRealignedLines = realignedLineNodes.length > 0
        ? arrangedWithInitialRedrawnLines.map((node) => realignedLineNodeById.get(node.id) ?? node)
        : arrangedWithInitialRedrawnLines;
      const redrawnLineNodes = realignedLineNodes.length > 0
        ? redrawRoutableLineDeviceRoutes(
            arrangedWithRealignedLines,
            busConnectedLineNodeIds,
            layoutCanvasBounds
          )
        : [];
      const lineNodeUpdates = mergeNodeUpdateLists(
        initiallyRedrawnLineNodes,
        mergeNodeUpdateLists(realignedLineNodes, redrawnLineNodes)
      );
      if (lineNodeUpdates.length > 0) {
        const lineNodeUpdateById = new Map(lineNodeUpdates.map((node) => [node.id, node]));
        committedNodeUpdates = mergeNodeUpdateLists(movedNodeUpdates, lineNodeUpdates);
        committedArrangedNodes = committedArrangedNodes.map((node) =>
          lineNodeUpdateById.get(node.id) ?? node
        );
      }
    }
    commitFastMovedGraphPatches(
      committedNodeUpdates,
      committedArrangedNodes,
      committedCandidateEdges,
      affectedEdgesForLayout,
      movedNodeIds,
      originalRoutePoints,
      new Set<string>(),
      originalPositions,
      nodes,
      layoutCanvasBounds
    );
    return movedNodeUpdates.length;
  };
}

export function createApplySelectedNodeLayout(__appScope: Record<string, any>) {
  return (
    minimumUnitCount: number,
    layoutNodes: (currentNodes: ModelNode[], currentLayoutUnits: typeof selectedLayoutUnits) => ModelNode[]
  ) => {
  const { commitLayoutNodePositions, nodes, selectedLayoutUnits } = __appScope;
    if (selectedLayoutUnits.length < minimumUnitCount) {
      return;
    }
    const layoutNodeIds = Array.from(new Set(selectedLayoutUnits.flatMap((unit) => unit.nodeIds)));
    if (layoutNodeIds.length === 0) {
      return;
    }
    const arranged = layoutNodes(nodes, selectedLayoutUnits);
    commitLayoutNodePositions(layoutNodeIds, arranged);
  };
}

export function createAutoSpreadCanvasGraphics(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerEdges, activeLayerGroups, activeLayerNodes, autoSpreadNodeLayoutUnits, buildCanvasLayoutUnits, canvasBounds, commitLayoutNodePositions, isCanvasNodeMovable, nodes, requireEditMode, routedEdges, writeOperationLog } = __appScope;
    if (!requireEditMode("自动散开")) {
      return;
    }
    const activeNodeIds = activeLayerNodes.map((node) => node.id);
    if (activeNodeIds.length < 2) {
      writeOperationLog("自动散开需要至少 2 个可操作图元");
      return;
    }
    const layoutUnits = buildCanvasLayoutUnits(
      activeLayerGroups,
      activeLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges,
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    );
    if (layoutUnits.length < 2) {
      writeOperationLog("自动散开没有发现可调整的图元");
      return;
    }
    const arranged = autoSpreadNodeLayoutUnits(nodes, layoutUnits, { padding: 4, bounds: canvasBounds });
    const movedCount = commitLayoutNodePositions(
      Array.from(new Set(layoutUnits.flatMap((unit) => unit.nodeIds))),
      arranged
    );
    writeOperationLog(movedCount > 0 ? `自动散开 ${movedCount} 个图元` : "自动散开未发现重叠图元");
  };
}

export function createAutoAlignCanvasGraphics(__appScope: Record<string, any>) {
  return () => {
  const { AUTO_ALIGN_DEFAULT_THRESHOLD_PX, AUTO_ALIGN_MAX_THRESHOLD_PX, AUTO_ALIGN_MIN_THRESHOLD_PX, activeLayerEdges, activeLayerGroups, activeLayerNodes, autoAlignNodeLayoutUnits, buildCanvasLayoutUnits, commitLayoutNodePositions, isCanvasNodeMovable, nodes, readjustActiveLayerBusEndpointRoutes, requireEditMode, routedEdges, writeOperationLog } = __appScope;
    if (!requireEditMode("自动对齐")) {
      return;
    }
    const activeNodeIds = activeLayerNodes.map((node) => node.id);
    if (activeNodeIds.length < 2) {
      writeOperationLog("自动对齐需要至少 2 个可操作图元");
      return;
    }
    const rawThreshold = window.prompt(
      `请输入自动对齐判定门槛（${AUTO_ALIGN_MIN_THRESHOLD_PX}-${AUTO_ALIGN_MAX_THRESHOLD_PX}px）`,
      String(AUTO_ALIGN_DEFAULT_THRESHOLD_PX)
    );
    if (rawThreshold === null) {
      return;
    }
    const parsedThreshold = Number.parseFloat(rawThreshold.trim());
    if (!Number.isFinite(parsedThreshold)) {
      writeOperationLog("自动对齐判定门槛无效");
      return;
    }
    const threshold = clampNumber(Math.round(parsedThreshold), AUTO_ALIGN_MIN_THRESHOLD_PX, AUTO_ALIGN_MAX_THRESHOLD_PX);
    const layoutUnits = buildCanvasLayoutUnits(
      activeLayerGroups,
      activeLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges,
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    );
    if (layoutUnits.length < 2) {
      writeOperationLog("自动对齐没有发现可调整的图元");
      return;
    }
    const arranged = autoAlignNodeLayoutUnits(nodes, layoutUnits, threshold);
    const movedCount = commitLayoutNodePositions(
      Array.from(new Set(layoutUnits.flatMap((unit) => unit.nodeIds))),
      arranged,
      { readjustBusEndpoints: true }
    );
    const readjustedRouteCount = movedCount === 0 ? readjustActiveLayerBusEndpointRoutes() : 0;
    writeOperationLog(movedCount > 0
      ? `自动对齐 ${movedCount} 个图元，门槛 ${threshold}px`
      : readjustedRouteCount > 0
        ? `自动对齐未移动图元，已整理 ${readjustedRouteCount} 条母线连接落点，门槛 ${threshold}px`
        : `自动对齐未发现坐标相近图元，门槛 ${threshold}px`);
  };
}

export function createDefaultVoltageBaseSetValue(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedNodeIds, nodeById, normalizeVoltageBaseInput } = __appScope;
    for (const nodeId of activeSelectedNodeIds) {
      const node = nodeById.get(nodeId);
      if (!node) {
        continue;
      }
      const candidates = [
        node.terminals[0]?.vbase,
        node.params.vbase,
        node.params.highVbase,
        node.params.sourceVbase,
        node.params.i_vbase,
        node.params.v_set,
        node.params.ac_v_set,
        node.params.dc_v_set,
        node.params.voltage
      ];
      for (const candidate of candidates) {
        const normalized = normalizeVoltageBaseInput(candidate);
        if (normalized) {
          return normalized;
        }
      }
    }
    return "110";
  };
}

export function createRecommendedVoltageBaseSetMode(__appScope: Record<string, any>) {
  return (): VoltageBaseSetMode => {
  const { voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets } = __appScope;
    if (voltageBaseSetHasUniformTargets && voltageBaseSetHasTerminalTargets) {
      return "byDevice";
    }
    if (voltageBaseSetHasTerminalTargets) {
      return "terminal";
    }
    return "uniform";
  };
}

export function createDefaultVoltageBaseTerminalValues(__appScope: Record<string, any>) {
  return () => {
  const { defaultVoltageBaseSetValue, normalizeVoltageBaseInput, voltageBaseSetCandidateNodes, voltageBaseSettingModeForNode } = __appScope;
    const fallback = defaultVoltageBaseSetValue();
    const values: VoltageBaseTerminalValuesByNodeId = {};
    for (const node of voltageBaseSetCandidateNodes) {
      if (voltageBaseSettingModeForNode(node) !== "terminal" || node.terminals.length <= 1) {
        continue;
      }
      values[node.id] = Object.fromEntries(
        node.terminals.map((terminal) => [
          terminal.id,
          normalizeVoltageBaseInput(terminal.vbase) || fallback
        ])
      );
    }
    return values;
  };
}

export function createDefaultVoltageBaseTerminalKey(__appScope: Record<string, any>) {
  return () => {
  const { voltageBaseSetCandidateNodes, voltageBaseSettingModeForNode } = __appScope;
    for (const node of voltageBaseSetCandidateNodes) {
      if (voltageBaseSettingModeForNode(node) !== "terminal" || node.terminals.length <= 1) {
        continue;
      }
      const [terminal] = node.terminals;
      if (terminal) {
        return `${node.id}:${terminal.id}`;
      }
    }
    return "";
  };
}

export function createActiveVoltageBaseTerminalValues(__appScope: Record<string, any>) {
  return () => {
  const { activeVoltageBaseTerminalRow } = __appScope;
    if (!activeVoltageBaseTerminalRow) {
      return {};
    }
    const value = activeVoltageBaseTerminalRow.value.trim();
    return value
      ? { [activeVoltageBaseTerminalRow.nodeId]: { [activeVoltageBaseTerminalRow.terminalId]: value } }
      : {};
  };
}

export function createSetVoltageBaseTerminalValue(__appScope: Record<string, any>) {
  return (nodeId: string, terminalId: string, value: string) => {
  const { setVoltageBaseTerminalValues } = __appScope;
    setVoltageBaseTerminalValues((current) => ({
      ...current,
      [nodeId]: {
        ...(current[nodeId] ?? {}),
        [terminalId]: value
      }
    }));
  };
}

export function createMergeVoltageBaseSetResults(__appScope: Record<string, any>) {
  return (
    first: ReturnType<typeof setVoltageBaseValuesForScope>,
    second: ReturnType<typeof setVoltageBaseValuesForScope>
  ): ReturnType<typeof setVoltageBaseValuesForScope> => {
    const updatesById = new Map<string, ModelNode>();
    for (const node of first.nodeUpdates) {
      updatesById.set(node.id, node);
    }
    for (const node of second.nodeUpdates) {
      updatesById.set(node.id, node);
    }
    return {
      nodes: second.nodes,
      nodeUpdates: Array.from(updatesById.values()),
      targetNodeIds: Array.from(new Set([...first.targetNodeIds, ...second.targetNodeIds])),
      changedNodeIds: Array.from(new Set([...first.changedNodeIds, ...second.changedNodeIds]))
    };
  };
}

export function createVoltageBaseSetReady(__appScope: Record<string, any>) {
  return () => {
  const { activeVoltageBaseTerminalRow, voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetValue } = __appScope;
    const terminalReadyForActiveRow = activeVoltageBaseTerminalRow ? activeVoltageBaseTerminalRow.value.trim().length > 0 : false;
    if (voltageBaseSetMode === "byDevice") {
      const uniformReady = !voltageBaseSetHasUniformTargets || voltageBaseSetValue.trim().length > 0;
      const terminalReady = !voltageBaseSetHasTerminalTargets || terminalReadyForActiveRow;
      return uniformReady && terminalReady;
    }
    return voltageBaseSetMode === "terminal"
      ? terminalReadyForActiveRow
      : voltageBaseSetValue.trim().length > 0;
  };
}

export function createVoltageBaseSetResultForScope(__appScope: Record<string, any>) {
  return (scope: VoltageBaseSetScope) => {
  const { activeSelectedNodeIds, activeVoltageBaseTerminalValues, edges, emptyVoltageBaseSetResult, hasVoltageBaseTerminalValues, mergeVoltageBaseSetResults, nodes, setVoltageBaseTerminalValuesForScope, setVoltageBaseValuesForScope, voltageBaseSetMode, voltageBaseSetPreviewByScope, voltageBaseSetReady, voltageBaseSetValue } = __appScope;
    if (voltageBaseSetMode === "byDevice") {
      if (!voltageBaseSetReady()) {
        return emptyVoltageBaseSetResult();
      }
      const preview = voltageBaseSetPreviewByScope[scope];
      if (preview) {
        return preview;
      }
      const uniformResult = voltageBaseSetValue.trim().length > 0
        ? setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim())
        : emptyVoltageBaseSetResult();
      const selectedTerminalValues = activeVoltageBaseTerminalValues();
      const terminalResult = hasVoltageBaseTerminalValues(selectedTerminalValues)
        ? setVoltageBaseTerminalValuesForScope(uniformResult.nodes, edges, selectedTerminalValues, scope)
        : { ...emptyVoltageBaseSetResult(), nodes: uniformResult.nodes };
      return mergeVoltageBaseSetResults(uniformResult, terminalResult);
    }
    if (voltageBaseSetMode === "terminal") {
      return hasVoltageBaseTerminalValues(activeVoltageBaseTerminalValues())
        ? voltageBaseSetPreviewByScope[scope] ?? setVoltageBaseTerminalValuesForScope(nodes, edges, activeVoltageBaseTerminalValues(), scope)
        : emptyVoltageBaseSetResult();
    }
    return voltageBaseSetValue.trim().length === 0
      ? emptyVoltageBaseSetResult()
      : voltageBaseSetPreviewByScope[scope] ?? setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim());
  };
}

export function createOpenVoltageBaseSetDialog(__appScope: Record<string, any>) {
  return () => {
  const { defaultVoltageBaseSetValue, defaultVoltageBaseTerminalKey, defaultVoltageBaseTerminalValues, recommendedVoltageBaseSetMode, requireEditMode, setActiveVoltageBaseTerminalKey, setVoltageBaseSetDialogOpen, setVoltageBaseSetMode, setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValues } = __appScope;
    if (!requireEditMode("设置电压基值")) {
      return;
    }
    const terminalValues = defaultVoltageBaseTerminalValues();
    setVoltageBaseSetScope("selected");
    setVoltageBaseSetValue(defaultVoltageBaseSetValue());
    setVoltageBaseTerminalValues(terminalValues);
    setActiveVoltageBaseTerminalKey(defaultVoltageBaseTerminalKey());
    setVoltageBaseSetMode(recommendedVoltageBaseSetMode());
    setVoltageBaseSetDialogOpen(true);
  };
}

export function createConfirmVoltageBaseSetDialog(__appScope: Record<string, any>) {
  return () => {
  const { VOLTAGE_BASE_SET_SCOPE_LABELS, activeVoltageBaseTerminalValues, hasVoltageBaseTerminalValues, patchGraphNodes, pushUndoSnapshot, requireEditMode, undoScopeForGraphPatch, validateTwoTerminalVoltageBaseConsistency, voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetValue, writeOperationLog } = __appScope;
    if (!requireEditMode("设置电压基值")) {
      return;
    }
    const value = voltageBaseSetValue.trim();
    const terminalMode = voltageBaseSetMode === "terminal";
    if ((voltageBaseSetMode === "terminal" || (voltageBaseSetMode === "byDevice" && voltageBaseSetHasTerminalTargets)) && !hasVoltageBaseTerminalValues(activeVoltageBaseTerminalValues())) {
      writeOperationLog("端子电压基值不能为空");
      return;
    }
    if ((voltageBaseSetMode === "uniform" || (voltageBaseSetMode === "byDevice" && voltageBaseSetHasUniformTargets)) && !value) {
      writeOperationLog("设置电压基值不能为空");
      return;
    }
    const result = voltageBaseSetResultForScope(voltageBaseSetScope);
    const scopeLabel = VOLTAGE_BASE_SET_SCOPE_LABELS[voltageBaseSetScope];
    if (result.changedNodeIds.length === 0) {
      writeOperationLog(`${scopeLabel}没有需要设置的电压基值`);
      return;
    }
    const voltageBaseMismatches = validateTwoTerminalVoltageBaseConsistency(result.nodes);
    if (voltageBaseMismatches.length > 0) {
      const examples = voltageBaseMismatches.slice(0, 8).map((item) =>
        `${item.nodeName}：${item.sourceTerminalLabel} ${item.sourceVoltageBase} / ${item.targetTerminalLabel} ${item.targetVoltageBase}`
      );
      const suffix = voltageBaseMismatches.length > examples.length ? `\n等 ${voltageBaseMismatches.length} 个两端设备。` : "";
      window.alert(`两端设备的电压基值必须相同，无法保存本次人工设置。\n\n${examples.join("\n")}${suffix}`);
      writeOperationLog(`设置电压基值失败：${voltageBaseMismatches.length} 个两端设备电压基值不一致`);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
    patchGraphNodes(result.nodeUpdates);
    writeOperationLog(`设置电压基值（${scopeLabel}）：${result.changedNodeIds.length}/${result.targetNodeIds.length} 个设备，${voltageBaseSetModeLabel}${terminalMode ? "" : `，值 ${value}`}`);
  };
}

export function createOpenVoltageBaseClearDialog(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedNodeIds, requireEditMode, setVoltageBaseClearDialogOpen, setVoltageBaseClearScope } = __appScope;
    if (!requireEditMode("清空电压基值")) {
      return;
    }
    setVoltageBaseClearScope(activeSelectedNodeIds.length > 0 ? "selected" : "all");
    setVoltageBaseClearDialogOpen(true);
  };
}

export function createConfirmVoltageBaseClearDialog(__appScope: Record<string, any>) {
  return () => {
  const { VOLTAGE_BASE_CLEAR_SCOPE_LABELS, patchGraphNodes, pushUndoSnapshot, requireEditMode, setVoltageBaseClearDialogOpen, undoScopeForGraphPatch, voltageBaseClearResultForScope, voltageBaseClearScope, writeOperationLog } = __appScope;
    if (!requireEditMode("清空电压基值")) {
      setVoltageBaseClearDialogOpen(false);
      return;
    }
    const result = voltageBaseClearResultForScope(voltageBaseClearScope);
    const scopeLabel = VOLTAGE_BASE_CLEAR_SCOPE_LABELS[voltageBaseClearScope];
    if (result.changedNodeIds.length === 0) {
      writeOperationLog(`${scopeLabel}没有可清空的电压基值`);
      setVoltageBaseClearDialogOpen(false);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
    patchGraphNodes(result.nodeUpdates);
    writeOperationLog(`清空电压基值（${scopeLabel}）：${result.changedNodeIds.length}/${result.targetNodeIds.length} 个设备`);
    setVoltageBaseClearDialogOpen(false);
  };
}

export function createConnectionRedrawViewportBounds(__appScope: Record<string, any>) {
  return () => {
  const { canvasVisibleViewBoxRef, viewBox } = __appScope;
    const visible = canvasVisibleViewBoxRef.current.width > 0 && canvasVisibleViewBoxRef.current.height > 0
      ? canvasVisibleViewBoxRef.current
      : viewBox;
    return {
      left: visible.x,
      right: visible.x + visible.width,
      top: visible.y,
      bottom: visible.y + visible.height
    };
  };
}

export function createConnectionRedrawEdgeIdsForScope(__appScope: Record<string, any>) {
  return (scope: ConnectionRedrawScope) => {
  const { activeLayerEdgeIdSet, activeLayerEdges, activeSelectedEdgeIds, connectionRedrawViewportBounds, queryRouteSpatialIndex, routedEdgeSpatialIndex } = __appScope;
    if (scope === "selected") {
      return activeSelectedEdgeIds.filter((edgeId, index, list) =>
        activeLayerEdgeIdSet.has(edgeId) && list.indexOf(edgeId) === index
      );
    }
    if (scope === "all") {
      return activeLayerEdges.map((edge) => edge.id);
    }

    const viewportBounds = connectionRedrawViewportBounds();
    const edgeIds: string[] = [];
    const seenEdgeIds = new Set<string>();
    for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, viewportBounds)) {
      if (seenEdgeIds.has(route.edgeId) || !activeLayerEdgeIdSet.has(route.edgeId)) {
        continue;
      }
      seenEdgeIds.add(route.edgeId);
      edgeIds.push(route.edgeId);
    }
    return edgeIds;
  };
}

export function createConnectionRedrawLineNodeIdsForScope(__appScope: Record<string, any>) {
  return (scope: ConnectionRedrawScope) => {
  const { activeLayerNodeIdSet, activeLayerNodes, activeSelectedNodeIds, connectionRedrawViewportBounds, isRoutableLineDeviceKind, nodeById, queryNodeSpatialIndex, visibleNodeSpatialIndex } = __appScope;
    const appendLineNodeId = (node: ModelNode | undefined, lineNodeIds: string[], seenNodeIds: Set<string>) => {
      if (!node || seenNodeIds.has(node.id) || !activeLayerNodeIdSet.has(node.id) || !isRoutableLineDeviceKind(node.kind)) {
        return;
      }
      seenNodeIds.add(node.id);
      lineNodeIds.push(node.id);
    };

    if (scope === "selected") {
      const lineNodeIds: string[] = [];
      const seenNodeIds = new Set<string>();
      for (const nodeId of activeSelectedNodeIds) {
        appendLineNodeId(nodeById.get(nodeId), lineNodeIds, seenNodeIds);
      }
      return lineNodeIds;
    }
    if (scope === "all") {
      return activeLayerNodes.filter((node) => isRoutableLineDeviceKind(node.kind)).map((node) => node.id);
    }

    const viewportBounds = connectionRedrawViewportBounds();
    const lineNodeIds: string[] = [];
    const seenNodeIds = new Set<string>();
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, viewportBounds)) {
      appendLineNodeId(node, lineNodeIds, seenNodeIds);
    }
    return lineNodeIds;
  };
}

export function createConnectionRedrawTargetsForScope(__appScope: Record<string, any>) {
  return (scope: ConnectionRedrawScope) => {
  const { connectionRedrawEdgeIdsForScope, connectionRedrawLineNodeIdsForScope } = __appScope;
    const edgeIds = connectionRedrawEdgeIdsForScope(scope);
    const lineNodeIds = connectionRedrawLineNodeIdsForScope(scope);
    return {
      edgeIds,
      lineNodeIds,
      total: edgeIds.length + lineNodeIds.length
    };
  };
}

export function createRedrawConnectionRoutes(__appScope: Record<string, any>) {
  return (scope: ConnectionRedrawScope) => {
  const { CONNECTION_REDRAW_SCOPE_LABELS, canvasBounds, connectionRedrawTargetsForScope, edgeIds, edges, lineNodeIds, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, patchGraphEdges, patchGraphNodes, pushUndoSnapshot, redrawConnectionRoutesForEdges, redrawRoutableLineDeviceRoutes, requireEditMode, total, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    if (!requireEditMode("重绘连接线")) {
      return;
    }
    const { edgeIds: targetEdgeIds, lineNodeIds: targetLineNodeIds, total: targetCount } = connectionRedrawTargetsForScope(scope);
    const scopeLabel = CONNECTION_REDRAW_SCOPE_LABELS[scope];
    if (targetCount === 0) {
      writeOperationLog(`${scopeLabel}为空，未执行连接线重绘`);
      return;
    }

    const nextEdges = targetEdgeIds.length > 0
      ? redrawConnectionRoutesForEdges(nodes, edges, targetEdgeIds, canvasBounds)
      : edges;
    const changedEdges: Edge[] = [];
    for (let index = 0; index < nextEdges.length; index += 1) {
      if (nextEdges[index] !== edges[index]) {
        changedEdges.push(nextEdges[index]);
      }
    }
    const changedLineNodes = targetLineNodeIds.length > 0
      ? redrawRoutableLineDeviceRoutes(nodes, targetLineNodeIds, canvasBounds)
      : [];
    if (changedEdges.length === 0 && changedLineNodes.length === 0) {
      writeOperationLog(`${scopeLabel}重绘未产生变化`);
      return;
    }

    const changedEdgeIds = changedEdges.map((edge) => edge.id);
    const changedNodeIds = changedLineNodes.map((node) => node.id);
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(changedNodeIds, changedEdgeIds));
    if (changedEdgeIds.length > 0) {
      markRouteEdgesDirty(changedEdgeIds);
      markStoredRouteEdgesDirty(changedEdgeIds);
      patchGraphEdges(changedEdges);
    }
    if (changedLineNodes.length > 0) {
      patchGraphNodes(changedLineNodes);
    }
    writeOperationLog(`重绘${scopeLabel}：${changedEdges.length}/${targetEdgeIds.length} 条连接线，${changedLineNodes.length}/${targetLineNodeIds.length} 条可变线路`);
  };
}

export function createOpenConnectionRedrawDialog(__appScope: Record<string, any>) {
  return () => {
  const { connectionRedrawTargetsForScope, requireEditMode, setConnectionRedrawDialogOpen, setConnectionRedrawScope } = __appScope;
    if (!requireEditMode("重绘连接线")) {
      return;
    }
    setConnectionRedrawScope(connectionRedrawTargetsForScope("selected").total > 0 ? "selected" : "viewport");
    setConnectionRedrawDialogOpen(true);
  };
}

export function createConfirmConnectionRedrawDialog(__appScope: Record<string, any>) {
  return () => {
  const { connectionRedrawScope, redrawConnectionRoutes, requireEditMode, setConnectionRedrawDialogOpen } = __appScope;
    if (!requireEditMode("重绘连接线")) {
      setConnectionRedrawDialogOpen(false);
      return;
    }
    redrawConnectionRoutes(connectionRedrawScope);
    setConnectionRedrawDialogOpen(false);
  };
}

export function createAlignSelected(__appScope: Record<string, any>) {
  return (direction: AlignMode) => {
  const { alignNodeLayoutUnits, applySelectedNodeLayout, requireEditMode, selectedLayoutUnitCount, writeOperationLog } = __appScope;
    if (!requireEditMode("对齐图元")) {
      return;
    }
    applySelectedNodeLayout(2, (currentNodes, currentLayoutUnits) => alignNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 2) {
      const labelByDirection: Record<AlignMode, string> = {
        horizontal: "横向",
        vertical: "纵向",
        left: "左",
        right: "右",
        top: "上",
        bottom: "下"
      };
      writeOperationLog(`${labelByDirection[direction]}对齐 ${selectedLayoutUnitCount} 个单元`);
    }
  };
}

export function createDistributeSelected(__appScope: Record<string, any>) {
  return (direction: "horizontal" | "vertical") => {
  const { applySelectedNodeLayout, distributeNodeLayoutUnits, requireEditMode, selectedLayoutUnitCount, writeOperationLog } = __appScope;
    if (!requireEditMode("分布图元")) {
      return;
    }
    applySelectedNodeLayout(3, (currentNodes, currentLayoutUnits) => distributeNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 3) {
      writeOperationLog(`${direction === "horizontal" ? "横向" : "纵向"}平均 ${selectedLayoutUnitCount} 个单元`);
    }
  };
}

export function createToggleSchemeExpanded(__appScope: Record<string, any>) {
  return (schemeId: string) => {
  const { setExpandedSchemeIds } = __appScope;
    setExpandedSchemeIds((current) =>
      current.includes(schemeId) ? current.filter((id) => id !== schemeId) : [...current, schemeId]
    );
  };
}

export function createPromptUniqueRecordName(__appScope: Record<string, any>) {
  return (
    promptText: string,
    defaultName: string,
    existingNames: string[],
    emptyMessage: string,
    duplicateMessage: string
  ) => {
  const { hasSameName } = __appScope;
    const inputName = window.prompt(promptText, defaultName);
    if (inputName === null) {
      return null;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert(emptyMessage);
      return null;
    }
    if (hasSameName(name, existingNames)) {
      window.alert(duplicateMessage);
      return null;
    }
    return name;
  };
}

export function createCloneProjectRecordForPaste(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord, name = project.name, existingProjectId?: string) => {
  const { cloneProjectRecordWithName } = __appScope;
    const record = cloneProjectRecordWithName(project, name);
    return existingProjectId
      ? { ...record, id: existingProjectId, name: record.name, project: { ...record.project, name: record.name } }
      : record;
  };
}

export function createSchemePathForScheme(__appScope: Record<string, any>) {
  return (schemeId: string, sourceSchemes?: SavedSchemeRecord[]) => {
  const { findSavedSchemeById, savedSchemePathForId, schemes } = __appScope;
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const scheme = findSavedSchemeById(sourceSchemes, schemeId);
    return scheme ? savedSchemePathForId(sourceSchemes, scheme.id) ?? [scheme.name] : [];
  };
}

export function createSchemePathForProject(__appScope: Record<string, any>) {
  return (projectId: string, sourceSchemes?: SavedSchemeRecord[]) => {
  const { findSavedProjectRecordInSchemes, savedSchemePathForId, schemes } = __appScope;
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const owner = findSavedProjectRecordInSchemes(sourceSchemes, projectId);
    return owner ? savedSchemePathForId(sourceSchemes, owner.scheme.id) ?? [owner.scheme.name] : [];
  };
}

export function createSchemePathForRecord(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord) => {
  const { schemePathForScheme } = __appScope;
    const existingPath = schemePathForScheme(scheme.id);
    return existingPath.length > 0 ? existingPath : [scheme.name];
  };
}

export function createCloneSchemeRecord(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, existingNames?: string[], suffix = "副本"): SavedSchemeRecord => {
  const { copySavedSchemeWithUniqueName, savedChildSchemeNames, schemes } = __appScope;
    if (existingNames === undefined) {
      existingNames = savedChildSchemeNames(schemes);
    }
    return copySavedSchemeWithUniqueName(scheme, existingNames, suffix);
  };
}

export function createCloneSchemeRecordWithName(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, name: string): SavedSchemeRecord => {
  const { cloneSchemeRecordForPaste } = __appScope;
    return cloneSchemeRecordForPaste(scheme, name);
  };
}

export function createCloneSchemeRecordForPaste(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, name = scheme.name, existingScheme?: SavedSchemeRecord): SavedSchemeRecord => {
  const { cloneProjectRecordForPaste, createSavedScheme, hasSameName, upsertSavedProject } = __appScope;
    const projects = scheme.projects.reduce<SavedProjectRecord[]>((current, project) => {
      const duplicateProject = existingScheme?.projects.find((item) => hasSameName(item.name, [project.name]));
      return upsertSavedProject(current, cloneProjectRecordForPaste(project, project.name, duplicateProject?.id));
    }, []);
    const existingChildren = existingScheme?.children ?? [];
    const children = (scheme.children ?? []).reduce<SavedSchemeRecord[]>((current, child) => {
      const duplicateChild = existingChildren.find((item) => hasSameName(item.name, [child.name]));
      return [...current, cloneSchemeRecordForPaste(child, child.name, duplicateChild)];
    }, []);
    const record = createSavedScheme(name, projects, children);
    return existingScheme ? { ...record, id: existingScheme.id, name: record.name } : record;
  };
}

export function createClearActiveProjectDisplay(__appScope: Record<string, any>) {
  return (logMessage: string) => {
  const { DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, DEFAULT_CURRENT_UNIT, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, EMPTY_PROJECT_MEASUREMENTS, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, cachedRoutedEdgesRef, canvasFrameRef, canvasFullViewBoxFromBounds, clearNodeDragMoveSchedule, clearRecordSelection, clearRefreshRecoveryProject, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, dragUndoCapturedRef, draggingRef, fitWholeCanvasViewBox, hideImperativeMultiNodeDragOverlay, lastBusTerminalSyncEndpointRevisionRef, normalizeModelLayers, pendingBusTerminalSyncNodeIdsRef, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, requestCanvasFrameCenter, resetConnectPreviewState, saveActiveProjectPointer, setActiveLayerId, setActiveProjectKey, setActiveSchemeKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasHeight, setCanvasPanning, setCanvasResizeDraft, setCanvasSelectionScope, setCanvasSizeDraft, setCanvasVisibleViewBox, setCanvasWidth, setConnectSource, setContextMarqueeSelection, setContextMenu, setCurrentUnit, setDeviceIndexCounters, setDragging, setGraphArrays, setGroups, setHasUnsavedChanges, setInitialCanvasDetailHydrationLimit, setInitialCanvasLodActive, setLayers, setLibraryPlacement, setManualPathDrag, setMarquee, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setPowerBaseValue, setPowerUnit, setProjectMeasurements, setProjectMenu, setProjectName, setRewiring, setRoutableLineEndpointDrag, setRoutableLinePlacement, setRoutableLinePreview, setRouteRenderingReady, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, setTerminalPress, setTopology, setTopologyErrors, setTopologyStatus, setTransformDrag, setUndoStack, setViewBox, setVoltageUnit, suppressNextGraphDirtyRef, writeOperationLog } = __appScope;
    clearRefreshRecoveryProject();
    const emptyCanvasBounds = {
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT
    };
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
    hideImperativeMultiNodeDragOverlay();
    dragUndoCapturedRef.current = false;
    cachedRoutedEdgesRef.current = [];
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
    lastBusTerminalSyncEndpointRevisionRef.current = -1;
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    suppressNextGraphDirtyRef.current += 1;
    setUndoStack([]);
    setProjectName("");
    setCanvasWidth(emptyCanvasBounds.width);
    setCanvasHeight(emptyCanvasBounds.height);
    setCanvasSizeDraft({ width: String(emptyCanvasBounds.width), height: String(emptyCanvasBounds.height) });
    setAllowAutoExpandCanvas(true);
    setCanvasBackgroundColor(DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage("");
    setCanvasBackgroundImageAssetId("");
    setBackgroundProjectId("");
    setBackgroundLayerIds([]);
    setPowerUnit(DEFAULT_POWER_UNIT);
    setVoltageUnit(DEFAULT_VOLTAGE_UNIT);
    setCurrentUnit(DEFAULT_CURRENT_UNIT);
    setPowerBaseValue(DEFAULT_POWER_BASE_VALUE);
    setViewBox(fitWholeCanvasViewBox(emptyCanvasBounds, canvasFrameRef.current));
    setCanvasVisibleViewBox(canvasFullViewBoxFromBounds(emptyCanvasBounds));
    setLayers(normalizeModelLayers());
    setActiveLayerId(DEFAULT_MODEL_LAYER_ID);
    setDeviceIndexCounters({});
    setGraphArrays([], []);
    setGroups([]);
    setProjectMeasurements(EMPTY_PROJECT_MEASUREMENTS);
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setInitialCanvasLodActive(false);
    setInitialCanvasDetailHydrationLimit(0);
    setActiveProjectKey("");
    setActiveSchemeKey("");
    clearRecordSelection();
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRoutableLinePreview({ path: "", targetPoint: null });
    setStaticDrawing(null);
    setLibraryPlacement(null);
    setRoutableLinePlacement(null);
    setRoutableLineEndpointDrag(null);
    setRewiring(null);
    setTerminalPress(null);
    setNodeLabelDrag(null);
    setNodeLabelRotateDrag(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setCanvasResizeDraft(null);
    setDragging(null);
    hideImperativeMultiNodeDragOverlay();
    setMarquee(null);
    setContextMarqueeSelection(null);
    setModifierSelectionPress(null);
    setCanvasPanning(null);
    setContextMenu(null);
    setProjectMenu(null);
    setHasUnsavedChanges(false);
    saveActiveProjectPointer("", "");
    writeOperationLog(logMessage);
    requestCanvasFrameCenter();
  };
}

export function createLoadSavedProject(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord, schemeId?: string) => {
  const { CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, DEFAULT_CURRENT_UNIT, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, assignMissingDeviceIndexes, cachedRoutedEdgesRef, canvasFrameRef, clearNodeDragMoveSchedule, clearRefreshRecoveryProject, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, dragUndoCapturedRef, draggingRef, findSchemeForProject, fitWholeCanvasViewBox, hideImperativeMultiNodeDragOverlay, lastBusTerminalSyncEndpointRevisionRef, libraryTemplateByKind, lockProjectEdgeTerminals, normalizeModelGroups, normalizeNodeTerminalsByTemplate, normalizeNodeTerminalsWithTemplate, normalizeProjectLayers, normalizeProjectMeasurements, pendingBusTerminalSyncNodeIdsRef, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, requestCanvasFrameCenter, resetConnectPreviewState, resolveConfiguredBackgroundLayerIds, selectSingleProject, setActiveLayerId, setActiveProjectKey, setActiveSchemeKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasHeight, setCanvasPanning, setCanvasSelectionScope, setCanvasVisibleViewBox, setCanvasWidth, setConnectSource, setCurrentUnit, setDeviceIndexCounters, setDragging, setGraphArrays, setGroups, setHasUnsavedChanges, setInitialCanvasDetailHydrationLimit, setInitialCanvasLodActive, setLayers, setManualPathDrag, setMarquee, setModifierSelectionPress, setPowerBaseValue, setPowerUnit, setProjectMeasurements, setProjectName, setRewiring, setRouteRenderingReady, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, setTopology, setTopologyErrors, setTopologyStatus, setTransformDrag, setUndoStack, setViewBox, setVoltageUnit, suppressNextGraphDirtyRef, writeOperationLog } = __appScope;
    if (schemeId === undefined) {
      schemeId = findSchemeForProject(project.id)?.id ?? "";
    }
    clearRefreshRecoveryProject();
    const normalizedNodes = project.project.nodes.map((node) =>
      libraryTemplateByKind?.has(node.kind)
        ? normalizeNodeTerminalsWithTemplate(node, libraryTemplateByKind.get(node.kind))
        : normalizeNodeTerminalsByTemplate(node)
    );
    const indexed = assignMissingDeviceIndexes(normalizedNodes, project.project.deviceIndexCounters);
    const lockedProject = lockProjectEdgeTerminals({
      ...project.project,
      nodes: indexed.nodes
    });
    const layeredProject = normalizeProjectLayers(lockedProject);
    const nextCanvasBounds = {
      width: project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      height: project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
    };
    const nextViewBox = fitWholeCanvasViewBox(nextCanvasBounds, canvasFrameRef.current);
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
    hideImperativeMultiNodeDragOverlay();
    dragUndoCapturedRef.current = false;
    cachedRoutedEdgesRef.current = [];
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
    lastBusTerminalSyncEndpointRevisionRef.current = -1;
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    suppressNextGraphDirtyRef.current += 1;
    setUndoStack([]);
    setProjectName(project.name);
    setCanvasWidth(nextCanvasBounds.width);
    setCanvasHeight(nextCanvasBounds.height);
    setAllowAutoExpandCanvas(project.project.allowAutoExpandCanvas ?? true);
    setCanvasBackgroundColor(project.project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage(project.project.canvasBackgroundImage ?? "");
    setCanvasBackgroundImageAssetId(project.project.canvasBackgroundImageAssetId ?? "");
    setBackgroundProjectId(project.project.backgroundProjectId ?? "");
    setBackgroundLayerIds(resolveConfiguredBackgroundLayerIds(project.project.backgroundProjectId, project.project.backgroundLayerIds));
    setPowerUnit(project.project.powerUnit ?? DEFAULT_POWER_UNIT);
    setVoltageUnit(project.project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
    setCurrentUnit(project.project.currentUnit ?? DEFAULT_CURRENT_UNIT);
    setPowerBaseValue(project.project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
    setViewBox(nextViewBox);
    setCanvasVisibleViewBox(nextViewBox);
    setLayers(layeredProject.layers ?? []);
    setActiveLayerId(layeredProject.activeLayerId ?? DEFAULT_MODEL_LAYER_ID);
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays(layeredProject.nodes, layeredProject.edges);
    setGroups(normalizeModelGroups(layeredProject.groups, layeredProject.nodes, layeredProject.edges));
    setProjectMeasurements(normalizeProjectMeasurements(layeredProject.measurements, layeredProject.nodes));
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setInitialCanvasLodActive(layeredProject.nodes.length > CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT);
    setInitialCanvasDetailHydrationLimit(0);
    setActiveProjectKey(project.id);
    setActiveSchemeKey(schemeId);
    selectSingleProject(schemeId, project.id);
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setTerminalPress(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setDragging(null);
    hideImperativeMultiNodeDragOverlay();
    setMarquee(null);
    setModifierSelectionPress(null);
    setCanvasPanning(null);
    setHasUnsavedChanges(false);
    writeOperationLog(`加载模型：${project.name}`);
    requestCanvasFrameCenter();
  };
}

export function createLoadSavedProjectRecord(__appScope: Record<string, any>) {
  return async (
    project: SavedProjectRecord,
    schemeId?: string,
    sourceSchemes?: SavedSchemeRecord[]
  ) => {
  const { fetchBackendProjectRecord, findSchemeForProject, loadSavedProject, savedProjectRecordIsSummary, schemePathForProject, schemePathForScheme, schemes, setSchemes, suppressNextBackendSchemeSyncRef, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (schemeId === undefined) {
      schemeId = findSchemeForProject(project.id)?.id ?? "";
    }
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const resolvedSchemeId = schemeId || findSchemeForProject(project.id)?.id || "";
    let projectToLoad = project;
    if (savedProjectRecordIsSummary(project)) {
      const ownerSchemePath = resolvedSchemeId ? schemePathForScheme(resolvedSchemeId, sourceSchemes) : [];
      const schemePath = ownerSchemePath.length > 0 ? ownerSchemePath : schemePathForProject(project.id, sourceSchemes);
      if (schemePath.length === 0) {
        window.alert(`无法读取模型“${project.name}”：未找到所属方案路径。`);
        writeOperationLog(`读取模型失败：${project.name}`);
        return false;
      }
      try {
        const loadedProject = await fetchBackendProjectRecord(schemePath, project.name);
        projectToLoad = {
          ...loadedProject,
          id: project.id || loadedProject.id,
          name: loadedProject.name || project.name
        };
        if (resolvedSchemeId) {
          suppressNextBackendSchemeSyncRef.current = true;
          setSchemes((current) => upsertSavedProjectInScheme(current, resolvedSchemeId, projectToLoad));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : `读取模型失败：${project.name}`;
        window.alert(message);
        writeOperationLog(`读取模型失败：${project.name}`);
        return false;
      }
    }
    loadSavedProject(projectToLoad, resolvedSchemeId);
    return true;
  };
}

export function createRequestUnsavedChangeAction(__appScope: Record<string, any>) {
  return (action: UnsavedChangeAction) => {
  const { enterBrowseMode, loadSavedProjectRecord, saveRequired, setPendingUnsavedAction } = __appScope;
    if (!saveRequired) {
      if (action.kind === "load-project") {
        void loadSavedProjectRecord(action.project, action.schemeId);
      } else if (action.kind === "enter-browse") {
        enterBrowseMode();
      }
      return;
    }
    setPendingUnsavedAction(action);
  };
}

export function createRequestLoadSavedProject(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord, schemeId?: string) => {
  const { findSchemeForProject, requestUnsavedChangeAction } = __appScope;
    if (schemeId === undefined) {
      schemeId = findSchemeForProject(project.id)?.id ?? "";
    }
    requestUnsavedChangeAction({
      kind: "load-project",
      project,
      schemeId,
      label: `切换到模型“${project.name}”`
    });
  };
}

export function createResolveUnsavedChangeAction(__appScope: Record<string, any>) {
  return async (resolution: "discard" | "save" | "cancel") => {
  const { enterBrowseMode, loadSavedProjectRecord, pendingUnsavedAction, saveCurrentProject, setPendingUnsavedAction } = __appScope;
    const action = pendingUnsavedAction;
    if (!action || resolution === "cancel") {
      setPendingUnsavedAction(null);
      return;
    }
    if (resolution === "save") {
      const saved = await saveCurrentProject();
      if (!saved) {
        return;
      }
    }
    setPendingUnsavedAction(null);
    if (action.kind === "load-project") {
      void loadSavedProjectRecord(action.project, action.schemeId);
    } else if (action.kind === "enter-browse") {
      enterBrowseMode();
    }
  };
}

export function createCreateSchemeRecord(__appScope: Record<string, any>) {
  return (parentSchemeId = "") => {
  const { createSavedScheme, handleBackendSchemeMutationFailure, hasSameName, insertChildSavedScheme, requireEditMode, saveBackendSchemeRecord, savedChildSchemeNames, schemePathForScheme, schemes, selectSingleScheme, setExpandedSchemeIds, setSchemes, writeOperationLog } = __appScope;
    if (!requireEditMode("新建方案")) {
      return;
    }
    const inputName = window.prompt("请输入方案名称", "新建方案");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, savedChildSchemeNames(schemes, parentSchemeId))) {
      window.alert("方案名称重复，无法新建方案。");
      return;
    }
    const record = createSavedScheme(name);
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    const recordPath = [...parentPath, record.name];
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, record));
    void saveBackendSchemeRecord(recordPath)
      .catch((error) => handleBackendSchemeMutationFailure(`新建方案同步后台：${record.name}`, error));
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    selectSingleScheme(record.id);
    writeOperationLog(`新建方案：${record.name}`);
  };
}

export function createRenameSchemeRecord(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord) => {
  const { handleBackendSchemeMutationFailure, hasSameName, renameSavedScheme, requireEditMode, saveBackendSchemeRecord, savedSchemeSiblingNames, schemePathForScheme, schemes, setSchemes } = __appScope;
    if (!requireEditMode("重命名方案")) {
      return;
    }
    const nextName = window.prompt("请输入新的方案名称", scheme.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    if (!name) {
      window.alert("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, savedSchemeSiblingNames(schemes, scheme.id, scheme.id))) {
      window.alert("方案名称重复，无法修改。");
      return;
    }
    const previousPath = schemePathForScheme(scheme.id);
    const nextPath = previousPath.length > 0 ? [...previousPath.slice(0, -1), name] : [name];
    setSchemes((current) => renameSavedScheme(current, scheme.id, nextName));
    void saveBackendSchemeRecord(nextPath, previousPath)
      .catch((error) => handleBackendSchemeMutationFailure(`重命名方案同步后台：${name}`, error));
  };
}

export function createDuplicateSchemeRecord(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord) => {
  const { cloneSchemeRecordWithName, findSavedSchemeParentById, insertChildSavedScheme, persistSchemeTreeToBackend, promptUniqueRecordName, requireEditMode, savedSchemeSiblingNames, schemePathForScheme, schemes, setExpandedSchemeIds, setSchemes, uniqueRecordName } = __appScope;
    if (!requireEditMode("复制方案")) {
      return;
    }
    const defaultName = uniqueRecordName(
      `${scheme.name} 副本`,
      savedSchemeSiblingNames(schemes, scheme.id),
      "未命名方案"
    );
    const name = promptUniqueRecordName(
      "请输入新方案名称",
      defaultName,
      savedSchemeSiblingNames(schemes, scheme.id),
      "方案名称不能为空。",
      "方案名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    const parentSchemeId = findSavedSchemeParentById(schemes, scheme.id)?.id ?? "";
    const record = cloneSchemeRecordWithName(scheme, name);
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, record));
    persistSchemeTreeToBackend(record, parentPath, `复制方案：${record.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
  };
}

export function createDeleteSchemeRecord(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord) => {
  const { activeSchemeKey, clearActiveProjectDisplay, clearRecordSelection, deleteBackendSchemeRecord, deleteSavedScheme, flattenSavedSchemes, handleBackendSchemeMutationFailure, loadSavedProjectRecord, nextSavedProjectAfterSchemeDeletion, requireEditMode, schemePathForScheme, schemes, selectedSchemeId, setSchemes } = __appScope;
    if (!requireEditMode("删除方案")) {
      return;
    }
    const deletingSchemeIds = new Set(flattenSavedSchemes([scheme]).map((item) => item.id));
    const emptyDisplayMessage = flattenSavedSchemes(schemes).some((item) => !deletingSchemeIds.has(item.id))
      ? "剩余方案没有可显示模型，画布已清空。"
      : "所有方案已删除，画布已清空。";
    const deletingActiveScheme = Boolean(activeSchemeKey && deletingSchemeIds.has(activeSchemeKey));
    const confirmationMessage = deletingActiveScheme
      ? `当前加载模型所在方案“${scheme.name}”将被删除。删除后会自动切换到相邻方案的模型；若没有可用模型，将清空画布。是否继续？`
      : `删除方案“${scheme.name}”及其全部模型？`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }
    const fallbackSelection = deletingActiveScheme
      ? nextSavedProjectAfterSchemeDeletion(schemes, activeSchemeKey, deletingSchemeIds)
      : null;
    const schemePath = schemePathForScheme(scheme.id);
    const nextSchemes = deleteSavedScheme(schemes, scheme.id);
    const noSchemesAfterDeletion = nextSchemes.length === 0;
    setSchemes(nextSchemes);
    if (schemePath.length > 0) {
      void deleteBackendSchemeRecord(schemePath)
        .catch((error) => handleBackendSchemeMutationFailure(`删除后台方案：${scheme.name}`, error));
    }
    if (noSchemesAfterDeletion) {
      window.alert("所有方案已删除，画布已清空。");
      clearActiveProjectDisplay("所有方案已删除，画布已清空");
      return;
    }
    if (deletingActiveScheme) {
      if (fallbackSelection) {
        void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
      } else {
        window.alert(emptyDisplayMessage);
        clearActiveProjectDisplay("删除当前方案后已清空画布");
      }
      return;
    }
    if (selectedSchemeId && deletingSchemeIds.has(selectedSchemeId)) {
      clearRecordSelection();
    }
  };
}

export function createCopySelectedRecord(__appScope: Record<string, any>) {
  return () => {
  const { copyProjectRecord, copySchemeRecord, findSavedSchemeById, projectById, schemes, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds } = __appScope;
    const projectId = selectedProjectIds[0] ?? selectedProjectId;
    if (projectId) {
      const project = projectById.get(projectId);
      if (project) {
        copyProjectRecord(project);
      }
      return;
    }
    const schemeId = selectedSchemeIds[0] ?? selectedSchemeId;
    if (schemeId) {
      const scheme = findSavedSchemeById(schemes, schemeId);
      if (scheme) {
        copySchemeRecord(scheme);
      }
    }
  };
}

export function createDeleteSelectedRecords(__appScope: Record<string, any>) {
  return () => {
  const { activeProjectKey, activeSchemeKey, clearActiveProjectDisplay, clearRecordSelection, deleteBackendProjectRecord, deleteBackendSchemeRecord, deleteSavedProjectsFromSchemes, deleteSavedScheme, findSavedSchemeById, flattenSavedSchemes, handleBackendSchemeMutationFailure, loadSavedProjectRecord, nextSavedProjectAfterProjectBatchDeletion, nextSavedProjectAfterSchemeDeletion, projects, requireEditMode, schemePathForProject, schemePathForScheme, schemes, selectedProjectIds, selectedSchemeIds, setSchemes } = __appScope;
    if (!requireEditMode("删除记录")) {
      return;
    }
    if (selectedProjectIds.length > 0) {
      const names = projects.filter((project) => selectedProjectIds.includes(project.id)).map((project) => project.name);
      const selected = new Set(selectedProjectIds);
      const deletingActiveProject = Boolean(activeProjectKey && selected.has(activeProjectKey));
      const confirmationMessage = deletingActiveProject
        ? `选中的 ${names.length} 个模型包含当前加载模型。删除后会自动切换到同方案的相邻模型；若没有相邻模型，将清空画布。是否继续？`
        : `删除选中的 ${names.length} 个模型？`;
      if (!window.confirm(confirmationMessage)) {
        return;
      }
      const fallbackSelection = deletingActiveProject
        ? nextSavedProjectAfterProjectBatchDeletion(schemes, activeProjectKey, selected)
        : null;
      const backendDeletes = projects
        .filter((project) => selected.has(project.id))
        .map((project) => ({ project, schemePath: schemePathForProject(project.id) }))
        .filter((item) => item.schemePath.length > 0);
      setSchemes((current) => deleteSavedProjectsFromSchemes(current, selected));
      for (const item of backendDeletes) {
        void deleteBackendProjectRecord(item.schemePath, item.project.name)
          .catch((error) => handleBackendSchemeMutationFailure(`删除后台模型：${item.project.name}`, error));
      }
      if (deletingActiveProject) {
        if (fallbackSelection) {
          void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
        } else {
          window.alert("当前方案已无模型，画布已清空。");
          clearActiveProjectDisplay("删除当前模型后已清空画布");
        }
        return;
      }
      clearRecordSelection();
      return;
    }
    if (selectedSchemeIds.length > 0) {
      const deletingSchemeIds = new Set(
        selectedSchemeIds.flatMap((schemeId) => {
          const scheme = findSavedSchemeById(schemes, schemeId);
          return scheme ? flattenSavedSchemes([scheme]).map((item) => item.id) : [schemeId];
        })
      );
      const emptyDisplayMessage = flattenSavedSchemes(schemes).some((item) => !deletingSchemeIds.has(item.id))
        ? "剩余方案没有可显示模型，画布已清空。"
        : "所有方案已删除，画布已清空。";
      const deletingActiveScheme = Boolean(activeSchemeKey && deletingSchemeIds.has(activeSchemeKey));
      const confirmationMessage = deletingActiveScheme
        ? `选中的 ${selectedSchemeIds.length} 个方案包含当前加载模型所在方案。删除后会自动切换到相邻方案的模型；若没有可用模型，将清空画布。是否继续？`
        : `删除选中的 ${selectedSchemeIds.length} 个方案及其全部模型？`;
      if (!window.confirm(confirmationMessage)) {
        return;
      }
      const fallbackSelection = deletingActiveScheme
        ? nextSavedProjectAfterSchemeDeletion(schemes, activeSchemeKey, deletingSchemeIds)
        : null;
      const backendSchemeDeletes = selectedSchemeIds
        .map((schemeId) => ({ schemeId, schemePath: schemePathForScheme(schemeId), scheme: findSavedSchemeById(schemes, schemeId) }))
        .filter((item) => item.schemePath.length > 0 && item.scheme);
      const nextSchemes = selectedSchemeIds.reduce((updatedSchemes, schemeId) => deleteSavedScheme(updatedSchemes, schemeId), schemes);
      const noSchemesAfterDeletion = nextSchemes.length === 0;
      setSchemes(nextSchemes);
      for (const item of backendSchemeDeletes) {
        void deleteBackendSchemeRecord(item.schemePath)
          .catch((error) => handleBackendSchemeMutationFailure(`删除后台方案：${item.scheme?.name ?? item.schemeId}`, error));
      }
      if (noSchemesAfterDeletion) {
        window.alert("所有方案已删除，画布已清空。");
        clearActiveProjectDisplay("所有方案已删除，画布已清空");
        return;
      }
      if (deletingActiveScheme) {
        if (fallbackSelection) {
          void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
        } else {
          window.alert(emptyDisplayMessage);
          clearActiveProjectDisplay("删除当前方案后已清空画布");
        }
        return;
      }
      clearRecordSelection();
    }
  };
}

export function createCopyProjectRecord(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord) => {
  const { setRecordClipboard, writeOperationLog } = __appScope;
    setRecordClipboard({ kind: "project", project });
    writeOperationLog(`复制模型记录：${project.name}`);
  };
}

export function createCopySchemeRecord(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord) => {
  const { setRecordClipboard, writeOperationLog } = __appScope;
    setRecordClipboard({ kind: "scheme", scheme });
    writeOperationLog(`复制方案记录：${scheme.name}`);
  };
}

export function createPasteSchemeClipboardRecord(__appScope: Record<string, any>) {
  return (parentSchemeId = "") => {
  const { cloneSchemeRecordForPaste, findSavedSchemeById, hasSameName, insertChildSavedScheme, persistSchemeTreeToBackend, recordClipboard, requireEditMode, schemePathForScheme, schemes, setExpandedSchemeIds, setPendingRecordPasteConflict, setSchemes, writeOperationLog } = __appScope;
    if (!requireEditMode("粘贴方案")) {
      return;
    }
    if (recordClipboard?.kind !== "scheme") {
      return;
    }
    const sourceScheme = recordClipboard.scheme;
    const targetSchemes = parentSchemeId ? findSavedSchemeById(schemes, parentSchemeId)?.children ?? [] : schemes;
    const duplicateScheme = targetSchemes.find((scheme) => hasSameName(scheme.name, [sourceScheme.name]));
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme",
        sourceScheme,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name,
        targetParentSchemeId: parentSchemeId
      });
      return;
    }
    const record = cloneSchemeRecordForPaste(sourceScheme, sourceScheme.name);
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, record));
    persistSchemeTreeToBackend(record, parentPath, `粘贴方案：${record.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    writeOperationLog(`粘贴方案记录：${sourceScheme.name}`);
  };
}

export function createPasteProjectClipboardRecord(__appScope: Record<string, any>) {
  return (targetSchemeId?: string) => {
  const { activeSchemeKey, cloneProjectRecordForPaste, findSavedSchemeById, handleBackendSchemeMutationFailure, hasSameName, recordClipboard, requireEditMode, saveBackendProjectRecord, schemePathForRecord, schemes, selectedSchemeId, setPendingRecordPasteConflict, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (targetSchemeId === undefined) {
      targetSchemeId = selectedSchemeId || activeSchemeKey || schemes[0]?.id;
    }
    if (!requireEditMode("粘贴模型")) {
      return;
    }
    if (recordClipboard?.kind !== "project") {
      return;
    }
    const sourceProject = recordClipboard.project;
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId) ?? schemes[0];
    if (!targetScheme) {
      return;
    }
    const duplicateProject = targetScheme.projects.find((project) => hasSameName(project.name, [sourceProject.name]));
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project",
        sourceProject,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    const pastedProject = cloneProjectRecordForPaste(sourceProject, sourceProject.name);
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current) => upsertSavedProjectInScheme(current, targetScheme.id, pastedProject));
    void saveBackendProjectRecord(targetPath, pastedProject)
      .catch((error) => handleBackendSchemeMutationFailure(`粘贴模型同步后台：${pastedProject.name}`, error));
    writeOperationLog(`粘贴模型记录：${sourceProject.name}`);
  };
}

export function createPasteSelectedRecord(__appScope: Record<string, any>) {
  return () => {
  const { pasteProjectClipboardRecord, pasteSchemeClipboardRecord, recordClipboard, requireEditMode } = __appScope;
    if (!requireEditMode("粘贴记录")) {
      return;
    }
    if (!recordClipboard) {
      return;
    }
    if (recordClipboard.kind === "scheme") {
      pasteSchemeClipboardRecord();
      return;
    }
    pasteProjectClipboardRecord();
  };
}

export function createCommitProjectRecordMove(__appScope: Record<string, any>) {
  return (
    projectId: string,
    targetSchemeId: string,
    options: { targetName?: string; overwriteProjectId?: string } = {}
  ) => {
  const { activeProjectKey, deleteBackendProjectRecord, deleteSavedProjectsFromSchemes, findSavedProjectRecordInSchemes, findSavedSchemeById, handleBackendSchemeMutationFailure, requireEditMode, saveBackendProjectRecord, schemePathForRecord, schemes, selectedProjectId, selectedProjectIds, setActiveProjectKey, setActiveSchemeKey, setExpandedSchemeIds, setProjectName, setSchemes, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, upsertSavedProjectInScheme } = __appScope;
    if (!requireEditMode("移动模型")) {
      return;
    }
    const targetName = options.targetName?.trim();
    const nextProjectId = options.overwriteProjectId ?? projectId;
    const sourceRecord = findSavedProjectRecordInSchemes(schemes, projectId);
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
    const project = sourceRecord?.project;
    const sourceScheme = sourceRecord?.scheme;
    if (!sourceScheme || !targetScheme || !project || sourceScheme.id === targetSchemeId) {
      return;
    }
    const now = new Date().toISOString();
    const movedName = targetName || project.name;
    const movedProject: SavedProjectRecord = {
      ...project,
      id: nextProjectId,
      name: movedName,
      updatedAt: now,
      project: { ...project.project, name: movedName }
    };
    const sourcePath = schemePathForRecord(sourceScheme);
    const targetPath = schemePathForRecord(targetScheme);
    const overwrittenProject = options.overwriteProjectId
      ? targetScheme.projects.find((item) => item.id === options.overwriteProjectId)
      : undefined;
    setSchemes((current) => {
      const withoutSourceProject = deleteSavedProjectsFromSchemes(current, new Set([projectId]));
      return upsertSavedProjectInScheme(withoutSourceProject, targetScheme.id, movedProject);
    });
    void saveBackendProjectRecord(targetPath, movedProject, overwrittenProject?.name ?? "")
      .then(() => deleteBackendProjectRecord(sourcePath, project.name))
      .catch((error) => handleBackendSchemeMutationFailure(`移动模型同步后台：${movedProject.name}`, error));
    setExpandedSchemeIds((current) => (current.includes(targetSchemeId) ? current : [...current, targetSchemeId]));
    if (
      selectedProjectId === projectId ||
      selectedProjectIds.includes(projectId) ||
      (options.overwriteProjectId && (selectedProjectId === options.overwriteProjectId || selectedProjectIds.includes(options.overwriteProjectId)))
    ) {
      setSelectedSchemeId(targetSchemeId);
      setSelectedProjectIds([nextProjectId]);
      setSelectedProjectId(nextProjectId);
      setSelectedSchemeIds([]);
    }
    if (activeProjectKey === projectId || activeProjectKey === options.overwriteProjectId) {
      setActiveProjectKey(nextProjectId);
      setActiveSchemeKey(targetSchemeId);
      if (targetName) {
        setProjectName(targetName);
      }
    }
  };
}

export function createResolveRecordPasteConflict(__appScope: Record<string, any>) {
  return (action: "overwrite" | "rename" | "cancel") => {
  const { activeSchemeRecord, cloneProjectRecordForPaste, cloneSchemeRecordForPaste, commitProjectRecordMove, deleteBackendSchemeRecord, findSavedSchemeById, handleBackendSchemeMutationFailure, insertChildSavedScheme, moveSavedSchemeToParent, pendingRecordPasteConflict, persistSchemeTreeToBackend, promptUniqueRecordName, replaceSavedSchemeById, replaceSchemeTreeInBackend, requireEditMode, saveBackendProjectRecord, saveBackendSchemeRecord, savedChildSchemeNames, schemePathForRecord, schemePathForScheme, schemes, selectedSchemeRecord, setExpandedSchemeIds, setPendingRecordPasteConflict, setSchemes, uniqueRecordName, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (action !== "cancel" && !requireEditMode("处理粘贴冲突")) {
      return;
    }
    const conflict = pendingRecordPasteConflict;
    if (!conflict || action === "cancel") {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (conflict.kind === "scheme") {
      const targetParentSchemeId = conflict.targetParentSchemeId ?? "";
      const siblingNames = savedChildSchemeNames(schemes, targetParentSchemeId);
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入粘贴后的方案名称",
          uniqueRecordName(conflict.sourceScheme.name, siblingNames, "未命名方案"),
          siblingNames,
          "方案名称不能为空。",
          "方案名称重复，无法粘贴。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        const record = cloneSchemeRecordForPaste(conflict.sourceScheme, renamed);
        const parentPath = targetParentSchemeId ? schemePathForScheme(targetParentSchemeId) : [];
        setSchemes((current) => insertChildSavedScheme(current, targetParentSchemeId, record));
        persistSchemeTreeToBackend(record, parentPath, `新命名粘贴方案：${record.name}`);
        if (targetParentSchemeId) {
          setExpandedSchemeIds((current) => (current.includes(targetParentSchemeId) ? current : [...current, targetParentSchemeId]));
        }
        writeOperationLog(`新命名粘贴方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId);
      const parentPath = targetParentSchemeId ? schemePathForScheme(targetParentSchemeId) : [];
      const replacement = duplicateScheme
        ? cloneSchemeRecordForPaste(conflict.sourceScheme, duplicateScheme.name, duplicateScheme)
        : cloneSchemeRecordForPaste(conflict.sourceScheme, conflict.duplicateName);
      setSchemes((current) => {
        if (!findSavedSchemeById(current, conflict.duplicateSchemeId)) {
          return insertChildSavedScheme(current, targetParentSchemeId, replacement);
        }
        return replaceSavedSchemeById(current, conflict.duplicateSchemeId, replacement);
      });
      if (duplicateScheme) {
        const duplicatePath = schemePathForRecord(duplicateScheme);
        replaceSchemeTreeInBackend(replacement, parentPath, duplicatePath, `覆盖粘贴方案：${replacement.name}`);
      } else {
        persistSchemeTreeToBackend(replacement, parentPath, `覆盖粘贴方案：${replacement.name}`);
      }
      writeOperationLog(`覆盖粘贴方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "scheme-drag") {
      const sourceScheme = findSavedSchemeById(schemes, conflict.schemeId);
      const targetScheme = findSavedSchemeById(schemes, conflict.targetSchemeId);
      if (!sourceScheme || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      const targetChildNames = (targetScheme.children ?? []).map((scheme) => scheme.name);
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的方案名称",
          uniqueRecordName(sourceScheme.name, targetChildNames, "未命名方案"),
          targetChildNames,
          "方案名称不能为空。",
          "方案名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        const sourcePath = schemePathForRecord(sourceScheme);
        const targetParentPath = schemePathForRecord(targetScheme);
        const nextPath = [...targetParentPath, renamed];
        setSchemes((current) => moveSavedSchemeToParent(current, conflict.schemeId, conflict.targetSchemeId, { targetName: renamed }));
        void saveBackendSchemeRecord(nextPath, sourcePath)
          .catch((error) => handleBackendSchemeMutationFailure(`拖拽方案同步后台：${renamed}`, error));
        setExpandedSchemeIds((current) => (current.includes(conflict.targetSchemeId) ? current : [...current, conflict.targetSchemeId]));
        writeOperationLog(`新命名拖拽方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      const sourcePath = schemePathForRecord(sourceScheme);
      const targetParentPath = schemePathForRecord(targetScheme);
      const nextPath = [...targetParentPath, conflict.duplicateName];
      const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId);
      setSchemes((current) => moveSavedSchemeToParent(current, conflict.schemeId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteSchemeId: conflict.duplicateSchemeId
      }));
      const backendMove = duplicateScheme
        ? deleteBackendSchemeRecord(schemePathForRecord(duplicateScheme)).then(() => saveBackendSchemeRecord(nextPath, sourcePath))
        : saveBackendSchemeRecord(nextPath, sourcePath);
      void backendMove.catch((error) => handleBackendSchemeMutationFailure(`覆盖拖拽方案同步后台：${conflict.duplicateName}`, error));
      setExpandedSchemeIds((current) => (current.includes(conflict.targetSchemeId) ? current : [...current, conflict.targetSchemeId]));
      writeOperationLog(`覆盖拖拽方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "project-drag") {
      const sourceScheme = findSavedSchemeById(schemes, conflict.sourceSchemeId);
      const sourceProject = sourceScheme?.projects.find((project) => project.id === conflict.projectId);
      const targetScheme = findSavedSchemeById(schemes, conflict.targetSchemeId);
      if (!sourceProject || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的模型名称",
          uniqueRecordName(sourceProject.name, targetScheme.projects.map((project) => project.name), "未命名模型"),
          targetScheme.projects.map((project) => project.name),
          "模型名称不能为空。",
          "模型名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, { targetName: renamed });
        writeOperationLog(`新命名拖拽模型记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteProjectId: conflict.duplicateProjectId
      });
      writeOperationLog(`覆盖拖拽模型记录：${conflict.duplicateName}`);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0];
    if (!targetScheme) {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入粘贴后的模型名称",
        uniqueRecordName(conflict.sourceProject.name, targetScheme.projects.map((project) => project.name), "未命名模型"),
        targetScheme.projects.map((project) => project.name),
        "模型名称不能为空。",
        "模型名称重复，无法粘贴。"
      );
      if (!renamed) {
        return;
      }
      setPendingRecordPasteConflict(null);
      const pastedProject = cloneProjectRecordForPaste(conflict.sourceProject, renamed);
      const targetPath = schemePathForRecord(targetScheme);
      setSchemes((current) => upsertSavedProjectInScheme(current, targetScheme.id, pastedProject));
      void saveBackendProjectRecord(targetPath, pastedProject)
        .catch((error) => handleBackendSchemeMutationFailure(`新命名粘贴模型同步后台：${pastedProject.name}`, error));
      writeOperationLog(`新命名粘贴模型记录：${renamed}`);
      return;
    }
    setPendingRecordPasteConflict(null);
    const duplicateProject = targetScheme.projects.find((project) => project.id === conflict.duplicateProjectId);
    const targetName = duplicateProject?.name ?? conflict.duplicateName;
    const pastedProject = cloneProjectRecordForPaste(conflict.sourceProject, targetName, conflict.duplicateProjectId);
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current) => {
      const currentTargetScheme = findSavedSchemeById(current, targetScheme.id);
      if (!currentTargetScheme) {
        return current;
      }
      return upsertSavedProjectInScheme(current, currentTargetScheme.id, pastedProject);
    });
    void saveBackendProjectRecord(targetPath, pastedProject, duplicateProject?.name ?? "")
      .catch((error) => handleBackendSchemeMutationFailure(`覆盖粘贴模型同步后台：${pastedProject.name}`, error));
    writeOperationLog(`覆盖粘贴模型记录：${conflict.duplicateName}`);
  };
}

export function createMoveProjectRecordToScheme(__appScope: Record<string, any>) {
  return (projectId: string, schemeId: string) => {
  const { commitProjectRecordMove, findSavedSchemeById, findSchemeForProject, hasSameName, requireEditMode, schemes, setPendingRecordPasteConflict } = __appScope;
    if (!requireEditMode("移动模型")) {
      return;
    }
    const sourceScheme = findSchemeForProject(projectId);
    const sourceProject = sourceScheme?.projects.find((project) => project.id === projectId);
    const targetScheme = findSavedSchemeById(schemes, schemeId);
    if (!sourceScheme || !sourceProject || !targetScheme || sourceScheme.id === targetScheme.id) {
      return;
    }
    const duplicateProject = targetScheme.projects.find(
      (project) => project.id !== sourceProject.id && hasSameName(project.name, [sourceProject.name])
    );
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project-drag",
        projectId,
        sourceSchemeId: sourceScheme.id,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    commitProjectRecordMove(projectId, schemeId);
  };
}

export function createMoveSchemeRecordToScheme(__appScope: Record<string, any>) {
  return (schemeId: string, targetSchemeId: string) => {
  const { findSavedSchemeById, flattenSavedSchemes, handleBackendSchemeMutationFailure, hasSameName, moveSavedSchemeToParent, requireEditMode, saveBackendSchemeRecord, schemePathForRecord, schemes, selectedSchemeId, selectedSchemeIds, setExpandedSchemeIds, setPendingRecordPasteConflict, setSchemes, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, writeOperationLog } = __appScope;
    if (!requireEditMode("移动方案")) {
      return;
    }
    const sourceScheme = findSavedSchemeById(schemes, schemeId);
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
    if (!sourceScheme || !targetScheme || sourceScheme.id === targetScheme.id) {
      return;
    }
    const movedSchemeIds = new Set(flattenSavedSchemes([sourceScheme]).map((scheme) => scheme.id));
    if (movedSchemeIds.has(targetScheme.id)) {
      return;
    }
    const duplicateScheme = (targetScheme.children ?? []).find(
      (scheme) => scheme.id !== sourceScheme.id && hasSameName(scheme.name, [sourceScheme.name])
    );
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme-drag",
        schemeId,
        targetSchemeId: targetScheme.id,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name
      });
      return;
    }
    const sourcePath = schemePathForRecord(sourceScheme);
    const targetParentPath = schemePathForRecord(targetScheme);
    const nextPath = [...targetParentPath, sourceScheme.name];
    setSchemes((current) => moveSavedSchemeToParent(current, schemeId, targetScheme.id));
    void saveBackendSchemeRecord(nextPath, sourcePath)
      .catch((error) => handleBackendSchemeMutationFailure(`移动方案同步后台：${sourceScheme.name}`, error));
    setExpandedSchemeIds((current) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    if (selectedSchemeId === schemeId || selectedSchemeIds.includes(schemeId)) {
      setSelectedSchemeId(schemeId);
      setSelectedSchemeIds([]);
      setSelectedProjectId("");
      setSelectedProjectIds([]);
    }
    writeOperationLog(`移动方案“${sourceScheme.name}”到“${targetScheme.name}”下`);
  };
}

export function createSaveActiveProjectPointer(__appScope: Record<string, any>) {
  return (draftProjectId: string, draftSchemeId: string, sourceSchemes?: SavedSchemeRecord[]) => {
  const { ACTIVE_PROJECT_STORAGE_KEY, DRAFT_PROJECT_STORAGE_KEY, activeProjectPointerPayload, schemes } = __appScope;
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const pointerPayload = activeProjectPointerPayload(sourceSchemes, draftProjectId, draftSchemeId);
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(pointerPayload ?? {}));
      window.localStorage.removeItem(DRAFT_PROJECT_STORAGE_KEY);
    } catch {
      // 活动模型指针只是加速下次打开/刷新，写入失败不阻断手动保存。
    }
  };
}

export function createSetActiveLayer(__appScope: Record<string, any>) {
  return (layerId: string) => {
  const { layers, pushUndoSnapshot, requireEditMode, setActiveLayerId, setLayers, writeOperationLog } = __appScope;
    if (!requireEditMode("激活图层")) {
      return;
    }
    pushUndoSnapshot();
    setActiveLayerId(layerId);
    setLayers((current) => current.map((layer) => layer.id === layerId ? { ...layer, visible: true } : layer));
    writeOperationLog(`激活图层：${layers.find((layer) => layer.id === layerId)?.name ?? layerId}`);
  };
}

export function createNextDefaultModelLayerName(__appScope: Record<string, any>) {
  return () => {
  const { layers } = __appScope;
    const usedNames = new Set(layers.map((layer) => layer.name.trim()));
    let index = 1;
    while (usedNames.has(`图层${index}`)) {
      index += 1;
    }
    return `图层${index}`;
  };
}

export function createAddModelLayer(__appScope: Record<string, any>) {
  return () => {
  const { createModelLayer, layers, nextDefaultModelLayerName, pushUndoSnapshot, requireEditMode, setActiveLayerId, setLayers, writeOperationLog } = __appScope;
    if (!requireEditMode("新增图层")) {
      return;
    }
    pushUndoSnapshot();
    const layer = createModelLayer(nextDefaultModelLayerName(), layers);
    setLayers((current) => [...current, layer]);
    setActiveLayerId(layer.id);
    writeOperationLog(`新增图层：${layer.name}`);
  };
}

export function createClearLayerNameDraft(__appScope: Record<string, any>) {
  return (layerId: string) => {
  const { setLayerNameDrafts } = __appScope;
    setLayerNameDrafts((current) => {
      if (!(layerId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[layerId];
      return next;
    });
  };
}

export function createCommitModelLayerName(__appScope: Record<string, any>) {
  return (layerId: string, draftName: string) => {
  const { clearLayerNameDraft, layers, pushUndoSnapshot, requireEditMode, setLayers, uniqueRecordName, writeOperationLog } = __appScope;
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      clearLayerNameDraft(layerId);
      return;
    }
    const nextName = uniqueRecordName(
      draftName.trim() || "未命名图层",
      layers.filter((item) => item.id !== layerId).map((item) => item.name),
      "未命名图层"
    );
    clearLayerNameDraft(layerId);
    if (nextName === layer.name) {
      return;
    }
    if (!requireEditMode("重命名图层")) {
      return;
    }
    pushUndoSnapshot();
    setLayers((current) => current.map((item) => item.id === layerId ? { ...item, name: nextName } : item));
    writeOperationLog(`重命名图层：${layer.name} -> ${nextName}`);
  };
}

export function createHandleLayerNameInputKeyDown(__appScope: Record<string, any>) {
  return (event: ReactKeyboardEvent<HTMLInputElement>, layer: ModelLayer) => {
  const { clearLayerNameDraft } = __appScope;
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      clearLayerNameDraft(layer.id);
      event.currentTarget.value = layer.name;
      event.currentTarget.blur();
    }
  };
}

export function createToggleModelLayerVisibility(__appScope: Record<string, any>) {
  return (layerId: string) => {
  const { activeLayerId, layers, pushUndoSnapshot, requireEditMode, setLayers } = __appScope;
    if (!requireEditMode("修改图层显示状态")) {
      return;
    }
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      return;
    }
    if (layer.id === activeLayerId && layer.visible) {
      window.alert("激活图层必须显示，不能隐藏。");
      return;
    }
    pushUndoSnapshot();
    setLayers((current) => current.map((item) => item.id === layerId ? { ...item, visible: !item.visible } : item));
  };
}

export function createSetAllModelLayersVisibility(__appScope: Record<string, any>) {
  return (visible: boolean) => {
  const { activeLayerId, layers, pushUndoSnapshot, requireEditMode, setLayers, writeOperationLog } = __appScope;
    if (!requireEditMode(visible ? "显示全部图层" : "隐藏全部图层")) {
      return;
    }
    const nextLayers = layers.map((item) => ({
      ...item,
      visible: visible || item.id === activeLayerId
    }));
    if (nextLayers.every((item, index) => item.visible === layers[index]?.visible)) {
      return;
    }
    pushUndoSnapshot();
    setLayers(nextLayers);
    writeOperationLog(visible ? "显示全部图层" : "隐藏全部非激活图层");
  };
}

export function createMoveModelLayer(__appScope: Record<string, any>) {
  return (layerId: string, direction: -1 | 1) => {
  const { layers, pushUndoSnapshot, requireEditMode, setLayers } = __appScope;
    if (!requireEditMode("调整图层顺序")) {
      return;
    }
    const index = layers.findIndex((layer) => layer.id === layerId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= layers.length) {
      return;
    }
    pushUndoSnapshot();
    setLayers((current) => {
      const next = [...current];
      const [layer] = next.splice(index, 1);
      next.splice(targetIndex, 0, layer);
      return next;
    });
  };
}

export function createDeleteModelLayer(__appScope: Record<string, any>) {
  return (layerId: string) => {
  const { DEFAULT_MODEL_LAYER_ID, activeLayerId, deleteNodesWithConnectedEdges, edges, groups, layers, nodes, normalizeModelGroups, normalizeProjectMeasurements, pushUndoSnapshot, removeGraphicsFromGroups, requireEditMode, resetConnectPreviewState, setActiveLayerId, setConnectSource, setContextMenu, setGraphArrays, setGroups, setLayers, setProjectMeasurements, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!requireEditMode("删除图层")) {
      return;
    }
    if (layers.length <= 1) {
      window.alert("至少需要保留一个图层。");
      return;
    }
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      return;
    }
    const nodeIdsInLayer = nodes
      .filter((node) => (node.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerId)
      .map((node) => node.id);
    if (nodeIdsInLayer.length > 0 && !window.confirm(`删除图层“${layer.name}”？该图层内共有 ${nodeIdsInLayer.length} 个图元，继续删除将同时删除这些图元及相关联络线。是否继续？`)) {
      return;
    }
    pushUndoSnapshot();
    const result = deleteNodesWithConnectedEdges(nodes, edges, nodeIdsInLayer);
    const remainingLayers = layers.filter((item) => item.id !== layerId);
    const nextActiveLayerId = activeLayerId === layerId
      ? remainingLayers.find((item) => item.visible)?.id ?? remainingLayers[0]?.id ?? DEFAULT_MODEL_LAYER_ID
      : activeLayerId;
    const nextLayers = remainingLayers.map((item) => item.id === nextActiveLayerId ? { ...item, visible: true } : item);
    const remainingEdgeIds = new Set(result.edges.map((edge) => edge.id));
    const removedEdgeIds = edges.filter((edge) => !remainingEdgeIds.has(edge.id)).map((edge) => edge.id);
    setGraphArrays(result.nodes, result.edges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, nodeIdsInLayer, removedEdgeIds), result.nodes, result.edges));
    setProjectMeasurements((current) => normalizeProjectMeasurements(current, result.nodes));
    setLayers(nextLayers);
    setActiveLayerId(nextActiveLayerId);
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`删除图层：${layer.name}，删除 ${nodeIdsInLayer.length} 个图元`);
  };
}

export function createRenderDeviceDefinitionMeasurementPanel(__appScope: Record<string, any>) {
  return (target: DeviceDefinitionMeasurementPanelTarget) => {
  const { BufferedTextInput, addMeasurementProfileItem, button, deleteMeasurementProfileItem, div, editableMeasurementProfileByKind, editableMeasurementTypeById, footer, isBrowseMode, measurementConfig, measurementConfigDraft, measurementConfigSaveStatus, moveMeasurementProfileItem, normalizeComponentLibraryName, section, select, span, table, tbody, td, th, thead, tr, updateMeasurementProfileItem } = __appScope;
    const draftConfig = measurementConfigDraft ?? measurementConfig;
    const selectedKind = normalizeComponentLibraryName(target.deviceKind);
    const selectedProfileItems = editableMeasurementProfileByKind.get(selectedKind)?.items ?? [];
    const terminalCount = Math.max(0, target.terminalCount ?? target.terminalLabels?.length ?? 0);
    const measurementProfilePositionOptions = [
      { value: "device", label: "设备层" },
      ...Array.from({ length: terminalCount }, (_, index) => {
        const terminalLabel = target.terminalLabels?.[index] ?? `端子${index + 1}`;
        return { value: `t${index + 1}`, label: `${terminalLabel}端子层` };
      })
    ];
    const associatedFieldOptions = (() => {
      const seen = new Set<string>();
      return (target.parameterDefinitions ?? []).flatMap((definition) => {
        const value = String(definition?.enName ?? "").trim();
        if (!value || seen.has(value.toLowerCase())) {
          return [];
        }
        seen.add(value.toLowerCase());
        const label = String(definition?.cnName ?? "").trim();
        return [{
          value,
          label: label && label !== value ? `${label} (${value})` : value
        }];
      });
    })();
    const measurementProfilePositionValue = (item: DeviceMeasurementProfileItem) => item.position ?? "device";
    const measurementConfigStatusText =
      measurementConfigSaveStatus === "saving"
        ? "正在保存..."
        : measurementConfigSaveStatus === "saved"
          ? "已保存到本地和后台。"
          : measurementConfigSaveStatus === "error"
            ? "后台保存失败，请检查后台服务。"
            : "量测定义会随右下角保存元件定义一并生效。";
    return (
      <section className="device-definition-measurement-panel measurement-config-panel measurement-profile-panel">
        <div className="measurement-profile-toolbar">
          <button
            type="button"
            disabled={isBrowseMode || draftConfig.measurementTypes.length === 0 || !selectedKind}
            onClick={() => addMeasurementProfileItem(selectedKind)}
          >
            添加量测
          </button>
          <span>元件库 {selectedKind || "未设置"} / 参考图元 {target.label}</span>
        </div>
        <div className="measurement-table-wrap">
          <table className="measurement-table measurement-profile-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>量测名称</th>
                <th>量测类型</th>
                <th>量测位置</th>
                <th>关联字段</th>
                <th>默认显示</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {selectedProfileItems.length > 0 ? selectedProfileItems.map((item, itemIndex) => {
                const currentType = editableMeasurementTypeById.get(item.measurementTypeId) ?? draftConfig.measurementTypes[0];
                return (
                  <tr key={`${selectedKind}-${item.measurementTypeId}-${item.position ?? "legacy"}-${item.role ?? "item"}-${itemIndex}`}>
                    <td>{itemIndex + 1}</td>
                    <td>
                      <BufferedTextInput
                        value={item.name ?? ""}
                        disabled={isBrowseMode}
                        placeholder={currentType?.name ?? "量测名称"}
                        onCommit={(nextValue) => updateMeasurementProfileItem(selectedKind, itemIndex, { name: nextValue })}
                      />
                    </td>
                    <td>
                      <select
                        value={item.measurementTypeId}
                        disabled={isBrowseMode}
                        onChange={(event) => {
                          const nextTypeId = event.target.value;
                          const nextType = editableMeasurementTypeById.get(nextTypeId);
                          updateMeasurementProfileItem(selectedKind, itemIndex, {
                            measurementTypeId: nextTypeId,
                            name: item.name || nextType?.name || item.name
                          });
                        }}
                      >
                        {!editableMeasurementTypeById.has(item.measurementTypeId) && (
                          <option value={item.measurementTypeId}>{item.measurementTypeId}</option>
                        )}
                        {draftConfig.measurementTypes.map((type) => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={measurementProfilePositionValue(item)}
                        disabled={isBrowseMode}
                        onChange={(event) => updateMeasurementProfileItem(selectedKind, itemIndex, {
                          position: event.target.value
                        })}
                      >
                        {measurementProfilePositionOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.associatedField ?? ""}
                        disabled={isBrowseMode}
                        title={item.associatedField && !associatedFieldOptions.some((option) => option.value === item.associatedField)
                          ? "当前关联字段不在元件属性名称列表中"
                          : "关联到元件属性名称"}
                        onChange={(event) => updateMeasurementProfileItem(selectedKind, itemIndex, {
                          associatedField: event.target.value || undefined
                        })}
                      >
                        <option value="">未关联（使用量测类型ID）</option>
                        {item.associatedField && !associatedFieldOptions.some((option) => option.value === item.associatedField) && (
                          <option value={item.associatedField}>{item.associatedField}（未在属性中）</option>
                        )}
                        {associatedFieldOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.defaultVisible === undefined ? "type" : item.defaultVisible ? "1" : "0"}
                        disabled={isBrowseMode}
                        onChange={(event) => updateMeasurementProfileItem(selectedKind, itemIndex, {
                          defaultVisible: event.target.value === "type" ? undefined : event.target.value === "1"
                        })}
                      >
                        <option value="type">跟随类型</option>
                        <option value="1">显示</option>
                        <option value="0">隐藏</option>
                      </select>
                    </td>
                    <td>
                      <div className="measurement-profile-row-actions">
                        <button
                          type="button"
                          disabled={isBrowseMode || itemIndex === 0}
                          onClick={() => moveMeasurementProfileItem(selectedKind, itemIndex, -1)}
                        >
                          上移
                        </button>
                        <button
                          type="button"
                          disabled={isBrowseMode || itemIndex === selectedProfileItems.length - 1}
                          onClick={() => moveMeasurementProfileItem(selectedKind, itemIndex, 1)}
                        >
                          下移
                        </button>
                        <button
                          type="button"
                          disabled={isBrowseMode}
                          onClick={() => deleteMeasurementProfileItem(selectedKind, itemIndex)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7}>当前元件库还没有默认量测模板。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="measurement-config-actions device-definition-measurement-actions">
          <span className={`measurement-config-status ${measurementConfigSaveStatus === "error" ? "error" : ""}`}>
            {measurementConfigStatusText}
          </span>
        </footer>
      </section>
    );
  };
}

export function createRenderMeasurementConfigDialog(__appScope: Record<string, any>) {
  return () => {
  const { BufferedTextInput, DeferredColorInput, Download, FileInput, Save, addMeasurementType, button, closeMeasurementConfigDialog, deleteMeasurementType, deviceLibraryDialogLayouts, deviceLibraryDialogStyle, div, exportLibraryPackage, flushMeasurementConfigDialogDraftInputs, footer, h2, header, input, isBrowseMode, measurementConfig, measurementConfigDialogOpen, measurementConfigDialogRef, measurementConfigDraft, measurementConfigSaveStatus, openLibraryPackageImportFilePicker, option, p, saveMeasurementConfigDialog, section, select, span, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, stopDeviceLibraryDialogEvent, table, tbody, td, th, thead, tr, updateMeasurementType } = __appScope;
    if (!measurementConfigDialogOpen) {
      return null;
    }
    const draftConfig = measurementConfigDraft ?? measurementConfig;
    const measurementConfigStatusText =
      measurementConfigSaveStatus === "saving"
        ? "正在保存..."
        : measurementConfigSaveStatus === "saved"
          ? "已保存到本地和后台。"
          : measurementConfigSaveStatus === "error"
            ? "后台保存失败，请检查后台服务。"
            : "未点击保存前，本次修改只保留在当前窗口。";
    return (
      <div className="image-picker-backdrop measurement-config-backdrop" onPointerDown={closeMeasurementConfigDialog}>
        <section
          ref={measurementConfigDialogRef}
          className={`measurement-config-dialog${deviceLibraryDialogLayouts.measurementConfig ? " floating" : ""}`}
          style={deviceLibraryDialogStyle("measurementConfig")}
          onPointerDown={stopDeviceLibraryDialogEvent}
          onPointerUp={stopDeviceLibraryDialogEvent}
          onPointerCancel={stopDeviceLibraryDialogEvent}
          onLostPointerCapture={stopDeviceLibraryDialogEvent}
          role="dialog"
          aria-modal="true"
          aria-labelledby="measurement-config-title"
        >
          <header>
            <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("measurementConfig", event)}>
              <h2 id="measurement-config-title">动态量测配置</h2>
              <p>配置全平台统一的量测类型、单位、小数位和默认显示样式。</p>
            </div>
          </header>
            <div className="measurement-config-panel">
              <div className="measurement-config-toolbar">
                <button type="button" onClick={addMeasurementType}>新增量测类型</button>
              </div>
            <div className="measurement-table-wrap">
              <table className="measurement-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>名称</th>
                    <th>标签</th>
                    <th>单位</th>
                    <th>小数</th>
                    <th>字号</th>
                    <th>颜色</th>
                    <th>默认显示</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {draftConfig.measurementTypes.map((type) => (
                    <tr key={type.id}>
                      <td><input value={type.id} readOnly title="量测类型ID用于保存绑定关系，不能直接修改" /></td>
                      <td><BufferedTextInput value={type.name} onCommit={(nextValue) => updateMeasurementType(type.id, { name: nextValue })} /></td>
                      <td><BufferedTextInput value={type.shortLabel} onCommit={(nextValue) => updateMeasurementType(type.id, { shortLabel: nextValue })} /></td>
                      <td><BufferedTextInput value={type.defaultUnit} onCommit={(nextValue) => updateMeasurementType(type.id, { defaultUnit: nextValue })} /></td>
                      <td>
                        <BufferedTextInput
                          type="number"
                          min="0"
                          max="8"
                          value={type.defaultDecimals}
                          onCommit={(nextValue) => updateMeasurementType(type.id, { defaultDecimals: Number(nextValue) })}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          type="number"
                          min="6"
                          max="96"
                          value={type.defaultFontSize}
                          onCommit={(nextValue) => updateMeasurementType(type.id, { defaultFontSize: Number(nextValue) })}
                        />
                      </td>
                      <td>
                        <DeferredColorInput value={type.defaultColor} fallback="#334155" onCommit={(value) => updateMeasurementType(type.id, { defaultColor: value })} />
                      </td>
                      <td>
                        <select
                          value={type.defaultVisible ? "1" : "0"}
                          onChange={(event) => updateMeasurementType(type.id, { defaultVisible: event.target.value === "1" })}
                        >
                          <option value="1">显示</option>
                          <option value="0">隐藏</option>
                        </select>
                      </td>
                      <td><button type="button" onClick={() => deleteMeasurementType(type.id)}>删除</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <footer className="measurement-config-actions">
            <span className={`measurement-config-status ${measurementConfigSaveStatus === "error" ? "error" : ""}`}>
              {measurementConfigStatusText}
            </span>
            <button type="button" onClick={closeMeasurementConfigDialog}>取消</button>
            <button
              type="button"
              className="primary"
              disabled={isBrowseMode || measurementConfigSaveStatus === "saving"}
              onPointerDown={flushMeasurementConfigDialogDraftInputs}
              onClick={() => void saveMeasurementConfigDialog()}
            >
              <Save size={14} />
              保存
            </button>
          </footer>
          <div
            className="device-library-dialog-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整动态量测配置窗口大小"
            title="拖拽调整窗口大小"
            onPointerDown={(event) => startDeviceLibraryDialogResize("measurementConfig", event)}
          />
        </section>
      </div>
    );
  };
}

export function createRenderMeasurementEditorDialog(__appScope: Record<string, any>) {
  return () => {
  const { BufferedTextInput, DeferredColorInput, addMeasurementEditorDraftItem, button, confirmMeasurementEditorDialog, div, h2, header, isBrowseMode, label, measurementConfig, measurementEditorDialog, measurementEditorItemName, measurementGroupBackgroundColor, measurementTypeById, measurementTypeOptionsForMeasurementGroup, moveMeasurementEditorDraftItem, nodeById, option, p, removeMeasurementEditorDraftItem, section, select, setMeasurementEditorDialog, span, table, tbody, td, th, thead, tr, updateMeasurementEditorDraftItem, updateMeasurementEditorDraftItemPosition, updateMeasurementEditorGroupSettings } = __appScope;
    if (!measurementEditorDialog) {
      return null;
    }
    const node = nodeById.get(measurementEditorDialog.nodeId);
    if (!node) {
      return null;
    }
    const draft = measurementEditorDialog.drafts[0];
    if (!draft) {
      return null;
    }
    const measurementEditorPositionLabel = (group: MeasurementGroup) => {
      const terminal = group.terminalId ? node.terminals.find((item) => item.id === group.terminalId) : undefined;
      return terminal?.label || (group.terminalId ? group.terminalId : "设备层");
    };
    const measurementEditorRows = measurementEditorDialog.drafts.flatMap((group) =>
      group.items.map((item, itemIndex) => ({ group, groupId: group.id, item, itemIndex }))
    );
    const draftBackgroundHidden = measurementGroupBackgroundColor(draft) === "transparent";
    const draftBorderHidden = (draft.borderStyle ?? "none") === "none";
    return (
      <div className="image-picker-backdrop measurement-editor-backdrop" onPointerDown={() => setMeasurementEditorDialog(null)}>
        <section className="measurement-editor-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="measurement-editor-title">
          <header>
            <div>
              <h2 id="measurement-editor-title">修改量测信息</h2>
              <p>{node.name}：共 {measurementEditorRows.length} 项量测，可在同一张表中修改量测名称、位置和显示参数。</p>
            </div>
            <button type="button" onClick={() => setMeasurementEditorDialog(null)}>关闭</button>
          </header>
          <div className="measurement-editor-summary">
            <label>
              <span>量测组显示</span>
              <select
                value={draft.visible ? "1" : "0"}
                disabled={isBrowseMode}
                onChange={(event) => updateMeasurementEditorGroupSettings((group) => ({ ...group, visible: event.target.value === "1" }))}
              >
                <option value="1">显示</option>
                <option value="0">隐藏</option>
              </select>
            </label>
            <label>
              <span>布局</span>
              <select
                value={draft.layout}
                disabled={isBrowseMode}
                onChange={(event) => updateMeasurementEditorGroupSettings((group) => ({ ...group, layout: event.target.value as MeasurementGroup["layout"] }))}
              >
                <option value="vertical">竖向</option>
                <option value="horizontal">横向</option>
                <option value="grid">两列</option>
              </select>
            </label>
            <label>
              <span>标签显示</span>
              <select
                aria-label="量测标签显示"
                value={draft.labelVisible === false ? "0" : "1"}
                disabled={isBrowseMode}
                onChange={(event) => updateMeasurementEditorGroupSettings((group) => ({ ...group, labelVisible: event.target.value === "1" }))}
              >
                <option value="1">显示</option>
                <option value="0">隐藏</option>
              </select>
            </label>
            <label>
              <span>单位显示</span>
              <select
                aria-label="量测单位显示"
                value={draft.unitVisible === false ? "0" : "1"}
                disabled={isBrowseMode}
                onChange={(event) => updateMeasurementEditorGroupSettings((group) => ({ ...group, unitVisible: event.target.value === "1" }))}
              >
                <option value="1">显示</option>
                <option value="0">隐藏</option>
              </select>
            </label>
            <label>
              <span>字体颜色</span>
              <DeferredColorInput
                value={draft.groupStyleOverride?.color ?? "#334155"}
                fallback="#334155"
                disabled={isBrowseMode}
                aria-label="量测组字体颜色"
                onCommit={(value) => updateMeasurementEditorGroupSettings((group) => ({
                  ...group,
                  groupStyleOverride: { ...(group.groupStyleOverride ?? {}), color: value }
                }))}
              />
            </label>
            <label>
              <span>字体大小</span>
              <BufferedTextInput
                type="number"
                min="6"
                max="96"
                value={draft.groupStyleOverride?.fontSize ?? 14}
                disabled={isBrowseMode}
                aria-label="量测组字体大小"
                onCommit={(nextValue) => updateMeasurementEditorGroupSettings((group) => ({
                  ...group,
                  groupStyleOverride: {
                    ...(group.groupStyleOverride ?? {}),
                    fontSize: clampNumber(Number(nextValue), 6, 96)
                  }
                }))}
              />
            </label>
            <label>
              <span>背景显示</span>
              <select
                value={draftBackgroundHidden ? "0" : "1"}
                disabled={isBrowseMode}
                onChange={(event) => updateMeasurementEditorGroupSettings((group) => ({
                  ...group,
                  backgroundColor: event.target.value === "1"
                    ? group.backgroundColor === "transparent" ? "#ffffff" : group.backgroundColor ?? "#ffffff"
                    : "transparent"
                }))}
              >
                <option value="1">显示</option>
                <option value="0">透明</option>
              </select>
            </label>
            <label>
              <span>背景颜色</span>
              <DeferredColorInput
                value={draft.backgroundColor ?? ""}
                fallback="#ffffff"
                disabled={isBrowseMode || draftBackgroundHidden}
                onCommit={(value) => updateMeasurementEditorGroupSettings((group) => ({ ...group, backgroundColor: value }))}
              />
            </label>
            <label>
              <span>边框样式</span>
              <select
                value={draft.borderStyle ?? "none"}
                disabled={isBrowseMode}
                onChange={(event) => {
                  const borderStyle = event.target.value as MeasurementGroup["borderStyle"];
                  updateMeasurementEditorGroupSettings((group) => ({
                    ...group,
                    borderStyle,
                    borderWidth: borderStyle === "none" ? 0 : Math.max(1, group.borderWidth ?? 0)
                  }));
                }}
              >
                <option value="solid">实线</option>
                <option value="dashed">虚线</option>
                <option value="dotted">点线</option>
                <option value="none">无边框</option>
              </select>
            </label>
            <label>
              <span>边框颜色</span>
              <DeferredColorInput
                value={draft.borderColor ?? ""}
                fallback="#64748b"
                disabled={isBrowseMode || draftBorderHidden}
                onCommit={(value) => updateMeasurementEditorGroupSettings((group) => ({ ...group, borderColor: value }))}
              />
            </label>
            <label>
              <span>边框宽度</span>
              <BufferedTextInput
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={draft.borderWidth ?? 0}
                disabled={isBrowseMode || draftBorderHidden}
                onCommit={(nextValue) => updateMeasurementEditorGroupSettings((group) => ({
                  ...group,
                  borderWidth: clampNumber(Number(nextValue), 0, 12)
                }))}
              />
            </label>
          </div>
          <div className="measurement-editor-toolbar">
            <button
              type="button"
              disabled={isBrowseMode || measurementConfig.measurementTypes.length === 0}
              onClick={() => addMeasurementEditorDraftItem(node)}
            >
              添加一行量测
            </button>
          </div>
          <div className="measurement-editor-table-wrap">
            <table className="measurement-editor-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>操作</th>
                  <th>量测名称</th>
                  <th>量测位置</th>
                  <th>量测类型</th>
                  <th>显示</th>
                  <th>测点</th>
                  <th>标签</th>
                  <th>单位</th>
                  <th>小数位</th>
                  <th>颜色</th>
                  <th>字号</th>
                </tr>
              </thead>
              <tbody>
                {measurementEditorRows.length > 0 ? measurementEditorRows.map((row, rowIndex) => {
                  const { group, item, itemIndex } = row;
                  const type = measurementTypeById.get(item.measurementTypeId) ?? measurementConfig.measurementTypes[0];
                  const measurementTypeOptions = measurementTypeOptionsForMeasurementGroup(node, group);
                  const itemColor = item.styleOverride?.color ?? group.groupStyleOverride?.color ?? type?.defaultColor ?? "#334155";
                  const itemFontSize = item.styleOverride?.fontSize ?? group.groupStyleOverride?.fontSize ?? type?.defaultFontSize ?? 14;
                  return (
                    <tr key={item.id}>
                      <td>{rowIndex + 1}</td>
                      <td>
                        <div className="measurement-editor-row-actions">
                          <button
                            type="button"
                            disabled={isBrowseMode || itemIndex === 0}
                            onClick={() => moveMeasurementEditorDraftItem(row.groupId, item.id, -1)}
                          >
                            上移
                          </button>
                          <button
                            type="button"
                            disabled={isBrowseMode || itemIndex === group.items.length - 1}
                            onClick={() => moveMeasurementEditorDraftItem(row.groupId, item.id, 1)}
                          >
                            下移
                          </button>
                          <button
                            type="button"
                            disabled={isBrowseMode}
                            onClick={() => removeMeasurementEditorDraftItem(row.groupId, item.id)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                      <td>
                        <BufferedTextInput
                          value={measurementEditorItemName(item)}
                          disabled={isBrowseMode}
                          aria-label="量测名称"
                          onCommit={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            name: nextValue
                          }))}
                        />
                      </td>
                      <td>
                        <select
                          value={group.terminalId ?? ""}
                          disabled={isBrowseMode}
                          aria-label="量测位置"
                          title={measurementEditorPositionLabel(group)}
                          onChange={(event) => updateMeasurementEditorDraftItemPosition(node, row.groupId, item.id, event.target.value)}
                        >
                          <option value="">设备层</option>
                          {node.terminals.map((terminal, terminalIndex) => (
                            <option key={terminal.id} value={terminal.id}>{terminal.label || `端子${terminalIndex + 1}`}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={item.measurementTypeId}
                          disabled={isBrowseMode}
                          onChange={(event) => {
                            const nextTypeId = event.target.value;
                            updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                              ...current,
                              measurementTypeId: nextTypeId,
                              sourcePoint: current.sourcePoint || `${node.id}.${nextTypeId}`
                            }));
                          }}
                        >
                          {!measurementTypeOptions.some((candidate) => candidate.id === item.measurementTypeId) && (
                            <option value={item.measurementTypeId}>{item.measurementTypeId}</option>
                          )}
                          {measurementTypeOptions.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={item.visible === false ? "0" : "1"}
                          disabled={isBrowseMode}
                          onChange={(event) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            visible: event.target.value === "1"
                          }))}
                        >
                          <option value="1">显示</option>
                          <option value="0">隐藏</option>
                        </select>
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.sourcePoint}
                          disabled={isBrowseMode}
                          onCommit={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            sourcePoint: nextValue
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.labelOverride ?? ""}
                          disabled={isBrowseMode}
                          placeholder={type?.shortLabel ?? "标签"}
                          onCommit={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            labelOverride: nextValue || undefined
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          value={item.unitOverride ?? ""}
                          disabled={isBrowseMode}
                          placeholder={type?.defaultUnit ?? "单位"}
                          onCommit={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            unitOverride: nextValue || undefined
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          type="number"
                          min="0"
                          max="8"
                          value={item.decimalsOverride ?? ""}
                          disabled={isBrowseMode}
                          placeholder={String(type?.defaultDecimals ?? 3)}
                          onCommit={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            decimalsOverride: nextValue === "" ? undefined : Number(nextValue)
                          }))}
                        />
                      </td>
                      <td>
                        <DeferredColorInput
                          value={itemColor}
                          disabled={isBrowseMode}
                          onCommit={(value) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            styleOverride: { ...(current.styleOverride ?? {}), color: value }
                          }))}
                        />
                      </td>
                      <td>
                        <BufferedTextInput
                          type="number"
                          min="6"
                          max="96"
                          value={itemFontSize}
                          disabled={isBrowseMode}
                          onCommit={(nextValue) => updateMeasurementEditorDraftItem(row.groupId, item.id, (current) => ({
                            ...current,
                            styleOverride: { ...(current.styleOverride ?? {}), fontSize: Number(nextValue) }
                          }))}
                        />
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={12}>当前设备没有量测项。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="template-dialog-actions">
            <button
              type="button"
              disabled={isBrowseMode || measurementEditorDialog.drafts.every((group) => group.items.length === 0)}
              onClick={confirmMeasurementEditorDialog}
            >
              保存
            </button>
            <button type="button" onClick={() => setMeasurementEditorDialog(null)}>取消</button>
          </div>
        </section>
      </div>
    );
  };
}

export function createSaveCurrentProject(__appScope: Record<string, any>) {
  return async (targetId?: string) => {
  const { activeProjectKey, activeSchemeKey, clearRefreshRecoveryProject, createSavedProject, currentGraphDirtyBaseline, currentProject, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, findProjectRecordByNameInScheme, findSavedSchemeById, findSchemeForProject, graphDirtyBaselineRef, projectById, projectName, rememberPersistedSchemesPayload, requireEditMode, saveActiveProjectPointer, saveBackendProjectRecord, savedSchemePathForId, schemes, selectedSchemeId, serializeSchemesForStorage, setActiveProjectKey, setActiveSchemeKey, setHasUnsavedChanges, setProjectName, setSchemes, suppressNextGraphDirtyRef, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (targetId === undefined) {
      targetId = activeProjectKey;
    }
    if (!requireEditMode("保存模型")) {
      return false;
    }
    const existingTargetProject = targetId ? projectById.get(targetId) : undefined;
    if ((!targetId || !existingTargetProject) && schemes.length === 0) {
      window.alert("没有可保存的方案和模型，请先新建方案或导入方案。");
      writeOperationLog("方案为空、模型为空，无法保存");
      return false;
    }
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    if (targetId && existingTargetProject) {
      const existing = existingTargetProject;
      const record: SavedProjectRecord = {
        ...existing,
        name: projectName,
        project: currentProject(),
        updatedAt: new Date().toISOString()
      };
      const ownerScheme = findSchemeForProject(targetId);
      const ownerSchemePath = ownerScheme ? savedSchemePathForId(schemes, ownerScheme.id) ?? [ownerScheme.name] : [];
      if (!ownerScheme || ownerSchemePath.length === 0) {
        window.alert("当前模型没有所属方案路径，无法保存到后台目录。");
        writeOperationLog(`保存模型到后台失败：${record.name}`);
        return false;
      }
      let savedRecord: SavedProjectRecord;
      try {
        savedRecord = await saveBackendProjectRecord(ownerSchemePath, record, existing.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : `保存模型到后台失败：${record.name}`;
        window.alert(message);
        writeOperationLog(`保存模型到后台失败：${record.name}`);
        return false;
      }
      const nextSchemes = upsertSavedProjectInScheme(schemes, ownerScheme.id, savedRecord);
      setSchemes(nextSchemes);
      rememberPersistedSchemesPayload(serializeSchemesForStorage(nextSchemes));
      setActiveProjectKey(targetId);
      if (savedRecord.name !== projectName) {
        suppressNextGraphDirtyRef.current += 1;
        setProjectName(savedRecord.name);
      }
      graphDirtyBaselineRef.current = currentGraphDirtyBaseline();
      setHasUnsavedChanges(false);
      saveActiveProjectPointer(targetId, activeSchemeKey || ownerScheme.id || selectedSchemeId, nextSchemes);
      clearRefreshRecoveryProject();
      writeOperationLog(`保存模型：${savedRecord.name}`);
      return true;
    }
    const targetSchemeId = activeSchemeKey || selectedSchemeId || schemes[0]?.id || "";
    const fallbackSchemes = schemes;
    const resolvedSchemeId = findSavedSchemeById(fallbackSchemes, targetSchemeId) ? targetSchemeId : fallbackSchemes[0]?.id ?? "";
    if (!resolvedSchemeId) {
      window.alert("没有可保存的方案和模型，请先新建方案或导入方案。");
      writeOperationLog("方案为空、模型为空，无法保存");
      return false;
    }
    const targetScheme = findSavedSchemeById(fallbackSchemes, resolvedSchemeId);
    const recoveredRecord = findProjectRecordByNameInScheme(targetScheme, projectName);
    const projectSnapshot = currentProject();
    const createdRecord = createSavedProject(projectName, projectSnapshot);
    const record: SavedProjectRecord = recoveredRecord
      ? {
          ...recoveredRecord,
          name: projectName,
          project: projectSnapshot,
          updatedAt: new Date().toISOString()
        }
      : createdRecord;
    const targetSchemePath = savedSchemePathForId(fallbackSchemes, resolvedSchemeId) ?? [targetScheme?.name ?? "默认方案"];
    let savedRecord: SavedProjectRecord;
    try {
      savedRecord = await saveBackendProjectRecord(targetSchemePath, record, recoveredRecord?.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : `保存模型到后台失败：${record.name}`;
      window.alert(message);
      writeOperationLog(`保存模型到后台失败：${record.name}`);
      return false;
    }
    const nextSchemes = upsertSavedProjectInScheme(fallbackSchemes, resolvedSchemeId, savedRecord);
    setSchemes(nextSchemes);
    rememberPersistedSchemesPayload(serializeSchemesForStorage(nextSchemes));
    setActiveProjectKey(savedRecord.id);
    setActiveSchemeKey(resolvedSchemeId);
    graphDirtyBaselineRef.current = currentGraphDirtyBaseline();
    setHasUnsavedChanges(false);
    saveActiveProjectPointer(savedRecord.id, resolvedSchemeId, nextSchemes);
    clearRefreshRecoveryProject();
    writeOperationLog(`保存模型：${savedRecord.name}`);
    return true;
  };
}

export function createRenameProjectRecord(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord) => {
  const { activeProjectKey, findSchemeForProject, handleBackendSchemeMutationFailure, hasSameName, renameSavedProject, requireEditMode, saveBackendProjectRecord, schemePathForScheme, setProjectName, setSchemes, upsertSavedProjectInScheme } = __appScope;
    if (!requireEditMode("重命名模型")) {
      return;
    }
    const nextName = window.prompt("请输入新的模型名称", project.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    const ownerScheme = findSchemeForProject(project.id);
    if (!name) {
      window.alert("模型名称不能为空。");
      return;
    }
    if (ownerScheme && hasSameName(name, ownerScheme.projects.filter((item) => item.id !== project.id).map((item) => item.name))) {
      window.alert("模型名称重复，无法修改。");
      return;
    }
    if (ownerScheme) {
      const renamedProjects = renameSavedProject(ownerScheme.projects, project.id, nextName);
      const renamedProject = renamedProjects.find((item) => item.id === project.id);
      if (renamedProject) {
        setSchemes((current) => upsertSavedProjectInScheme(current, ownerScheme.id, renamedProject));
        const ownerPath = schemePathForScheme(ownerScheme.id);
        if (ownerPath.length > 0) {
          void saveBackendProjectRecord(ownerPath, renamedProject, project.name)
            .catch((error) => handleBackendSchemeMutationFailure(`重命名模型同步后台：${renamedProject.name}`, error));
        }
      }
    }
    if (activeProjectKey === project.id) {
      setProjectName(nextName.trim() || "未命名模型");
    }
  };
}

export function createDuplicateProjectRecord(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord) => {
  const { cloneProjectRecordWithName, findSchemeForProject, handleBackendSchemeMutationFailure, promptUniqueRecordName, requireEditMode, saveBackendProjectRecord, schemePathForScheme, setSchemes, uniqueRecordName, upsertSavedProjectInScheme } = __appScope;
    if (!requireEditMode("复制模型")) {
      return;
    }
    const ownerScheme = findSchemeForProject(project.id);
    const existingNames = ownerScheme?.projects.map((item) => item.name) ?? [];
    const defaultName = uniqueRecordName(`${project.name} 副本`, existingNames, "未命名模型");
    const name = promptUniqueRecordName(
      "请输入新模型名称",
      defaultName,
      existingNames,
      "模型名称不能为空。",
      "模型名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    if (ownerScheme) {
      const clonedProject = cloneProjectRecordWithName(project, name);
      setSchemes((current) => upsertSavedProjectInScheme(current, ownerScheme.id, clonedProject));
      const ownerPath = schemePathForScheme(ownerScheme.id);
      if (ownerPath.length > 0) {
        void saveBackendProjectRecord(ownerPath, clonedProject)
          .catch((error) => handleBackendSchemeMutationFailure(`复制模型同步后台：${clonedProject.name}`, error));
      }
    }
  };
}

export function createDuplicateSelectedProjectRecords(__appScope: Record<string, any>) {
  return () => {
  const { cloneProjectRecord, duplicateProjectRecord, flattenSavedSchemes, handleBackendSchemeMutationFailure, projectById, requireEditMode, saveBackendProjectRecord, schemePathForRecord, schemes, selectedProjectId, selectedProjectIds, setSchemes, upsertSavedProject, upsertSavedProjectInScheme } = __appScope;
    if (!requireEditMode("复制模型")) {
      return;
    }
    if (selectedProjectIds.length <= 1) {
      const project = projectById.get(selectedProjectIds[0] ?? selectedProjectId);
      if (project) {
        duplicateProjectRecord(project);
      }
      return;
    }
    const selected = new Set(selectedProjectIds);
    const backendSaves: Array<{ schemePath: string[]; project: SavedProjectRecord }> = [];
    let nextSchemes = schemes;
    for (const scheme of flattenSavedSchemes(schemes)) {
      const selectedProjects = scheme.projects.filter((project) => selected.has(project.id));
      if (selectedProjects.length === 0) {
        continue;
      }
      let nextProjects = scheme.projects;
      const schemePath = schemePathForRecord(scheme);
      for (const project of selectedProjects) {
        const clonedProject = cloneProjectRecord(project, "副本", nextProjects.map((item) => item.name));
        nextProjects = upsertSavedProject(nextProjects, clonedProject);
        backendSaves.push({ schemePath, project: clonedProject });
      }
      nextSchemes = nextProjects.reduce((updatedSchemes, project) => upsertSavedProjectInScheme(updatedSchemes, scheme.id, project), nextSchemes);
    }
    setSchemes(nextSchemes);
    for (const item of backendSaves) {
      void saveBackendProjectRecord(item.schemePath, item.project)
        .catch((error) => handleBackendSchemeMutationFailure(`批量复制模型同步后台：${item.project.name}`, error));
    }
  };
}

export function createDuplicateSelectedSchemeRecords(__appScope: Record<string, any>) {
  return () => {
  const { cloneSchemeRecord, duplicateSchemeRecord, findSavedSchemeById, findSavedSchemeParentById, insertChildSavedScheme, persistSchemeTreeToBackend, requireEditMode, savedSchemePathForId, savedSchemeSiblingNames, schemes, selectedSchemeId, selectedSchemeIds, setSchemes } = __appScope;
    if (!requireEditMode("复制方案")) {
      return;
    }
    if (selectedSchemeIds.length <= 1) {
      const scheme = findSavedSchemeById(schemes, selectedSchemeIds[0] ?? selectedSchemeId);
      if (scheme) {
        duplicateSchemeRecord(scheme);
      }
      return;
    }
    const backendSaves: Array<{ scheme: SavedSchemeRecord; parentPath: string[] }> = [];
    let nextSchemes = schemes;
    for (const schemeId of selectedSchemeIds) {
      const scheme = findSavedSchemeById(nextSchemes, schemeId);
      if (!scheme) {
        continue;
      }
      const parentSchemeId = findSavedSchemeParentById(nextSchemes, scheme.id)?.id ?? "";
      const siblingNames = savedSchemeSiblingNames(nextSchemes, scheme.id);
      const clonedScheme = cloneSchemeRecord(scheme, siblingNames);
      const parentPath = parentSchemeId ? savedSchemePathForId(nextSchemes, parentSchemeId) ?? [] : [];
      nextSchemes = insertChildSavedScheme(nextSchemes, parentSchemeId, clonedScheme);
      backendSaves.push({ scheme: clonedScheme, parentPath });
    }
    setSchemes(nextSchemes);
    for (const item of backendSaves) {
      persistSchemeTreeToBackend(item.scheme, item.parentPath, `批量复制方案：${item.scheme.name}`);
    }
  };
}

export function createDeleteProjectRecord(__appScope: Record<string, any>) {
  return (project: SavedProjectRecord) => {
  const { activeProjectKey, clearActiveProjectDisplay, clearRecordSelection, deleteBackendProjectRecord, deleteSavedProjectsFromSchemes, handleBackendSchemeMutationFailure, loadSavedProjectRecord, nextSavedProjectAfterProjectDeletion, requireEditMode, schemePathForProject, schemes, selectedProjectId, setSchemes } = __appScope;
    if (!requireEditMode("删除模型")) {
      return;
    }
    const deletingActiveProject = project.id === activeProjectKey;
    const confirmationMessage = deletingActiveProject
      ? `当前加载模型“${project.name}”将被删除。删除后会自动切换到同方案的相邻模型；若没有相邻模型，将清空画布。是否继续？`
      : `删除模型“${project.name}”？`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }
    const fallbackSelection = deletingActiveProject
      ? nextSavedProjectAfterProjectDeletion(schemes, project.id)
      : null;
    const ownerPath = schemePathForProject(project.id);
    setSchemes((current) => deleteSavedProjectsFromSchemes(current, new Set([project.id])));
    if (ownerPath.length > 0) {
      void deleteBackendProjectRecord(ownerPath, project.name)
        .catch((error) => handleBackendSchemeMutationFailure(`删除后台模型：${project.name}`, error));
    }
    if (deletingActiveProject) {
      if (fallbackSelection) {
        void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
      } else {
        window.alert("当前方案已无模型，画布已清空。");
        clearActiveProjectDisplay("删除当前模型后已清空画布");
      }
      return;
    }
    if (selectedProjectId === project.id) {
      clearRecordSelection();
    }
  };
}

export function createCreateBlankProject(__appScope: Record<string, any>) {
  return (preferredSchemeId?: string) => {
  const { DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, activeSchemeKey, createSavedProject, findSavedSchemeById, handleBackendSchemeMutationFailure, hasSameName, requestLoadSavedProject, requireEditMode, saveBackendProjectRecord, schemePathForScheme, schemes, selectSingleProject, selectedSchemeId, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (preferredSchemeId === undefined) {
      preferredSchemeId = selectedSchemeId || activeSchemeKey || schemes[0]?.id || "";
    }
    if (!requireEditMode("新建模型")) {
      return;
    }
    const targetScheme = findSavedSchemeById(schemes, preferredSchemeId) ?? schemes[0];
    const targetSchemeId = targetScheme?.id ?? preferredSchemeId;
    const inputName = window.prompt("请输入模型名称", "新建模型");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("模型名称不能为空。");
      return;
    }
    if (targetScheme && hasSameName(name, targetScheme.projects.map((project) => project.name))) {
      window.alert("模型名称重复，无法新建模型。");
      return;
    }
    const record = createSavedProject(name, {
      version: 1,
      name,
      canvasWidth: DEFAULT_CANVAS_WIDTH,
      canvasHeight: DEFAULT_CANVAS_HEIGHT,
      allowAutoExpandCanvas: true,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND,
      powerUnit: DEFAULT_POWER_UNIT,
      voltageUnit: DEFAULT_VOLTAGE_UNIT,
      currentUnit: DEFAULT_CURRENT_UNIT,
      powerBaseValue: DEFAULT_POWER_BASE_VALUE,
      deviceIndexCounters: {},
      nodes: [],
      edges: []
    });
    setSchemes((current) => upsertSavedProjectInScheme(current, targetSchemeId || current[0]?.id || "", record));
    const targetSchemePath = schemePathForScheme(targetSchemeId || schemes[0]?.id || "");
    if (targetSchemePath.length > 0) {
      void saveBackendProjectRecord(targetSchemePath, record)
        .catch((error) => handleBackendSchemeMutationFailure(`新建模型同步后台：${record.name}`, error));
    }
    selectSingleProject(targetSchemeId ?? schemes[0]?.id ?? "", record.id);
    requestLoadSavedProject(record, targetSchemeId ?? schemes[0]?.id ?? "");
    writeOperationLog(`新建模型：${record.name}`);
  };
}

export function createLocateTopologyError(__appScope: Record<string, any>) {
  return (error: TopologyValidationError) => {
    const { activateInspectorFromCanvas, activeLayerEdgeIdSet, activeLayerNodeIdSet, centerViewOnPoint, centerViewOnPointAtZoom, clearRecordSelection, currentZoomPercent, edges, getElementFocusPoint, nodeById, nodes, setCanvasSelectionScope, setInspectorTab, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    activateInspectorFromCanvas();
    const firstNodeId = error.nodeId ?? error.relatedNodeIds[0];
    const node = firstNodeId ? nodeById.get(firstNodeId) : undefined;
    const editableNode = Boolean(firstNodeId && activeLayerNodeIdSet.has(firstNodeId));
    const editableEdge = Boolean(error.edgeId && activeLayerEdgeIdSet.has(error.edgeId));
    setCanvasSelectionScope("group");
    setSelectedNodeIds(editableNode && firstNodeId ? [firstNodeId] : []);
    setSelectedEdgeId(editableEdge && error.edgeId ? error.edgeId : "");
    setSelectedEdgeIds(editableEdge && error.edgeId ? [error.edgeId] : []);
    const point = node
      ? getElementFocusPoint({ kind: "node", id: node.id }, nodes, edges)
      : error.edgeId
        ? getElementFocusPoint({ kind: "edge", id: error.edgeId }, nodes, edges)
        : null;
    if (point) {
      const focusZoomPercent = Math.max(Number(currentZoomPercent) || 0, 120);
      if (centerViewOnPointAtZoom) {
        centerViewOnPointAtZoom(point, focusZoomPercent);
      } else {
        centerViewOnPoint(point);
      }
    }
    if (node) {
      setInspectorTab("device");
      clearRecordSelection();
    }
  };
}

export function createRunTopologyCalculation(__appScope: Record<string, any>) {
  return () => {
  const { EMPTY_TOPOLOGY, buildTopology, calculateElectricalTopology, edges, isBlockingTopologyValidationError, locateTopologyError, nodes, pushUndoSnapshot, requireEditMode, setNodes, setTopology, setTopologyErrors, setTopologyStatus, skipNextTopologyStaleRef, topologyCalculationMessage, validateTopology, validateVoltageSetpointDeviations, writeOperationLog } = __appScope;
    if (!requireEditMode("执行图上拓扑计算")) {
      return;
    }
    const errors = validateTopology(nodes, edges, { includeVoltageSetpointDeviations: false });
    const blockingErrors = errors.filter(isBlockingTopologyValidationError);
    const nonBlockingWarnings = errors.filter((error) => !isBlockingTopologyValidationError(error));
    setTopologyErrors(errors);
    if (blockingErrors.length === 0) {
      pushUndoSnapshot();
      const calculatedNodes = calculateElectricalTopology(nodes, edges);
      const nextTopology = buildTopology(calculatedNodes, edges);
      const voltageSetpointWarnings = validateVoltageSetpointDeviations(calculatedNodes, edges);
      const nextWarnings = [...nonBlockingWarnings, ...voltageSetpointWarnings];
      skipNextTopologyStaleRef.current = true;
      setNodes(calculatedNodes);
      setTopology(nextTopology);
      setTopologyErrors(nextWarnings);
      if (nextWarnings.length === 0) {
        setTopologyStatus({ state: "success", message: `成功，${nextTopology.connectedComponents.length} 个拓扑岛` });
        writeOperationLog(`图上拓扑成功，${nextTopology.connectedComponents.length} 个拓扑岛`);
        window.alert(topologyCalculationMessage(0));
      } else {
        setTopologyStatus({ state: "failed", message: `完成，${nextWarnings.length} 条告警` });
        writeOperationLog(`图上拓扑完成，${nextWarnings.length} 条告警`);
        locateTopologyError(nextWarnings[0]);
        window.alert(topologyCalculationMessage(nextWarnings.length));
      }
    } else {
      setTopology(EMPTY_TOPOLOGY);
      setTopologyStatus({ state: "failed", message: `失败，${blockingErrors.length} 条阻断错误` });
      writeOperationLog(`图上拓扑失败，${blockingErrors.length} 条阻断错误`);
      locateTopologyError(blockingErrors[0]);
      window.alert(topologyCalculationMessage(blockingErrors.length));
    }
  };
}

export function createGetEdgeEndpointPoint(__appScope: Record<string, any>) {
  return (edge: Edge, endpoint: EdgeEndpoint): Point | null => {
  const { getModelEdgeEndpointPoint, nodeById } = __appScope;
    const node = nodeById.get(endpoint === "source" ? edge.sourceId : edge.targetId);
    const terminalId = endpoint === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
    const endpointPoint = endpoint === "source" ? edge.sourcePoint : edge.targetPoint;
    if (!node) {
      return endpointPoint ?? null;
    }
    return getModelEdgeEndpointPoint(node, endpointPoint, terminalId);
  };
}

export function createCenterViewOnPoint(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { canvasVisibleViewBoxRef, clampViewBoxToCanvas, setViewBoxAtViewportCenter, viewBox, viewBoxRef } = __appScope;
    const visible = canvasVisibleViewBoxRef.current;
    const current = viewBoxRef.current;
    setViewBoxAtViewportCenter(clampViewBoxToCanvas({
      x: point.x - (visible.width > 0 ? visible.width : viewBox.width) / 2,
      y: point.y - (visible.height > 0 ? visible.height : viewBox.height) / 2,
      width: current.width,
      height: current.height
    }), point);
  };
}

export function createViewportCenterAnchorForPoint(__appScope: Record<string, any>) {
  return (point: Point): WheelZoomAnchor | null => {
  const { canvasBoundsRef, canvasFrameRef, clampPointToBounds } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return null;
    }
    const frameRect = frame.getBoundingClientRect();
    if (frameRect.width <= 0 || frameRect.height <= 0) {
      return null;
    }
    return {
      point: clampPointToBounds(point, canvasBoundsRef.current),
      cursorOffsetX: frameRect.width / 2,
      cursorOffsetY: frameRect.height / 2
    };
  };
}

export function createSetViewBoxAtViewportCenter(__appScope: Record<string, any>) {
  return (nextViewBox: CanvasViewBox, point: Point) => {
  const { pendingWheelZoomAnchorRef, sameCanvasViewBox, scheduleCanvasVisibleViewBoxUpdate, setViewBox, syncCanvasFrameScrollToWheelAnchor, viewBoxRef, viewportCenterAnchorForPoint } = __appScope;
    const anchor = viewportCenterAnchorForPoint(point);
    if (!anchor) {
      setViewBox(nextViewBox);
      return;
    }
    if (sameCanvasViewBox(viewBoxRef.current, nextViewBox)) {
      syncCanvasFrameScrollToWheelAnchor(anchor);
      scheduleCanvasVisibleViewBoxUpdate();
      return;
    }
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox(nextViewBox);
  };
}

export function createCenterViewBoxOnPoint(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { canvasVisibleViewBoxRef, clampViewBoxToCanvas, setViewBoxAtViewportCenter, viewBoxRef } = __appScope;
    const current = viewBoxRef.current;
    const visible = canvasVisibleViewBoxRef.current;
    setViewBoxAtViewportCenter(clampViewBoxToCanvas({
      x: point.x - (visible.width > 0 ? visible.width : current.width) / 2,
      y: point.y - (visible.height > 0 ? visible.height : current.height) / 2,
      width: current.width,
      height: current.height
    }), point);
  };
}

export function createCenterViewOnPointAtZoom(__appScope: Record<string, any>) {
  return (point: Point, zoomPercent = 100) => {
  const { canvasBoundsRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, setViewBoxAtViewportCenter, width } = __appScope;
    const bounds = canvasBoundsRef.current;
    const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
      { width: bounds.width, height: bounds.height },
      bounds,
      zoomPercent,
      zoomPercent
    );
    setViewBoxAtViewportCenter(normalizeViewBoxToCanvas({
      x: point.x - nextWidth / 2,
      y: point.y - nextHeight / 2,
      width: nextWidth,
      height: nextHeight
    }, bounds), point);
  };
}

export function createZoomViewportAtCenter(__appScope: Record<string, any>) {
  return (zoomFactor: number) => {
  const { canvasBoundsRef, canvasFrameRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, pendingWheelZoomAnchorRef, setViewBox, wheelZoomAnchorFromClient, width } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      setViewBox((current) => {
        const bounds = canvasBoundsRef.current;
        const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
          { width: current.width * zoomFactor, height: current.height * zoomFactor },
          bounds
        );
        const center = {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
        return normalizeViewBoxToCanvas({
          x: center.x - nextWidth / 2,
          y: center.y - nextHeight / 2,
          width: nextWidth,
          height: nextHeight
        }, bounds);
      });
      return;
    }
    const frameRect = frame.getBoundingClientRect();
    const anchor = wheelZoomAnchorFromClient(
      frameRect.left + frameRect.width / 2,
      frameRect.top + frameRect.height / 2
    );
    if (!anchor) {
      return;
    }
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox((current) => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: current.width * zoomFactor, height: current.height * zoomFactor },
        bounds
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: anchor.point.x - anchor.cursorOffsetX / nextScaleX,
        y: anchor.point.y - anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
  };
}

export function createResetViewportZoom(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsRef, canvasFrameRef, clampViewBoxDimensionsForZoom, height, normalizeViewBoxToCanvas, pendingWheelZoomAnchorRef, setViewBox, wheelZoomAnchorFromClient, width } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      setViewBox((current) => {
        const bounds = canvasBoundsRef.current;
        const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
          { width: bounds.width, height: bounds.height },
          bounds,
          100,
          100
        );
        const center = {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
        return normalizeViewBoxToCanvas({
          x: center.x - nextWidth / 2,
          y: center.y - nextHeight / 2,
          width: nextWidth,
          height: nextHeight
        }, bounds);
      });
      return;
    }
    const frameRect = frame.getBoundingClientRect();
    const anchor = wheelZoomAnchorFromClient(
      frameRect.left + frameRect.width / 2,
      frameRect.top + frameRect.height / 2
    );
    if (!anchor) {
      return;
    }
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox(() => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: bounds.width, height: bounds.height },
        bounds,
        100,
        100
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: anchor.point.x - anchor.cursorOffsetX / nextScaleX,
        y: anchor.point.y - anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
  };
}

export function createFitWholeCanvasToFrame(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, canvasFrameRef, canvasFullViewBox, centerCanvasFrameScrollPosition, fitWholeCanvasViewBox, scheduleCanvasVisibleViewBoxUpdate, setCanvasNoScrollOffset, setCanvasVisibleViewBox, setViewBox, skipNextCanvasScrollSyncRef } = __appScope;
    const nextViewBox = fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current);
    skipNextCanvasScrollSyncRef.current = true;
    setViewBox(nextViewBox);
    setCanvasNoScrollOffset({ x: 0, y: 0 });
    setCanvasVisibleViewBox(canvasFullViewBox);
    window.requestAnimationFrame(() => {
      const frame = canvasFrameRef.current;
      if (!frame) {
        return;
      }
      centerCanvasFrameScrollPosition(frame);
      scheduleCanvasVisibleViewBoxUpdate();
    });
  };
}

export function createFitWholeCanvasFromBlankDoubleClick(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGSVGElement>) => {
  const { clampPointToCanvas, connectSource, findConnectionRouteHitAtPoint, fitWholeCanvasToFrame, routableLinePlacement, screenToSvgPoint, setMarquee, staticDrawing, svgRef } = __appScope;
    if (event.button !== 0 || staticDrawing || connectSource || routableLinePlacement) {
      return;
    }
    const target = event.target as Element | null;
    if (target?.closest(".diagram-node, .connection-group, .edge-endpoint-handle, .manual-segment-handle, .transform-handles, .group-selection-overlay, .canvas-resize-handles")) {
      return;
    }
    if (svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      if (findConnectionRouteHitAtPoint(pointer)) {
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    setMarquee(null);
    fitWholeCanvasToFrame();
  };
}

export function createFitViewToBounds(__appScope: Record<string, any>) {
  return (bounds: GeometryBounds | SelectionRect | null, padding = 96, maxZoomPercent = 2000) => {
  const { canvasBounds, canvasFrameRef, clampViewBoxDimensionsForZoom, clampViewBoxToCanvas, resetViewportZoom, setViewBoxAtViewportCenter, viewBox } = __appScope;
    if (!bounds) {
      resetViewportZoom();
      return;
    }
    const targetWidth = Math.max(80, bounds.right - bounds.left + padding * 2);
    const targetHeight = Math.max(80, bounds.bottom - bounds.top + padding * 2);
    const viewportAspect = canvasFrameRef.current?.clientWidth && canvasFrameRef.current.clientHeight
      ? canvasFrameRef.current.clientWidth / canvasFrameRef.current.clientHeight
      : viewBox.width > 0 && viewBox.height > 0
        ? viewBox.width / viewBox.height
      : canvasBounds.width / Math.max(1, canvasBounds.height);
    const fitSize = targetWidth / targetHeight > viewportAspect
      ? { width: targetWidth, height: targetWidth / viewportAspect }
      : { width: targetHeight * viewportAspect, height: targetHeight };
    const size = clampViewBoxDimensionsForZoom(fitSize, canvasBounds, 5, maxZoomPercent);
    const center = {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    };
    setViewBoxAtViewportCenter(clampViewBoxToCanvas({
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
      width: size.width,
      height: size.height
    }), center);
  };
}

export function createFitViewToContent(__appScope: Record<string, any>) {
  return () => {
  const { calculateModelGeometryBounds, fitViewToBounds, routedEdges, visibleNodes } = __appScope;
    fitViewToBounds(calculateModelGeometryBounds(visibleNodes, routedEdges, 0), 120);
  };
}

export function createFocusElementTreeItem(__appScope: Record<string, any>) {
  return (item: ElementTreeItem, openDeviceTab = false) => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, centerViewOnPoint, clearRecordSelection, edges, getElementFocusPoint, nodes, resetConnectPreviewState, selectCanvasGraphics, setConnectSource, setContextMenu, setInspectorTab, setRewiring } = __appScope;
    if (item.kind === "node") {
      selectCanvasGraphics(activeLayerNodeIdSet.has(item.id) ? [item.id] : [], []);
    } else {
      const editableEdge = activeLayerEdgeIdSet.has(item.id);
      selectCanvasGraphics([], editableEdge ? [item.id] : []);
    }
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    clearRecordSelection();
    if (openDeviceTab && (item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id))) {
      setInspectorTab("device");
    }
    const point = getElementFocusPoint(item, nodes, edges);
    if (point) {
      centerViewOnPoint(point);
    }
  };
}

export function createJumpToElementTreeItem(__appScope: Record<string, any>) {
  return (item: ElementTreeItem) => {
  const { centerViewOnPointAtZoom, edges, getElementFocusPoint, nodes } = __appScope;
    const point = getElementFocusPoint(item, nodes, edges);
    if (point) {
      centerViewOnPointAtZoom(point, 100);
    }
  };
}

export function createOpenElementTreeItemContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<HTMLDivElement>, item: ElementTreeItem) => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, canvasInteractionRef, clearRecordSelection, isEditMode, projectListPointerInsideRef, resetConnectPreviewState, resetRoutableLinePreviewState, selectCanvasGraphics, setConnectSource, setContextMenu, setMode, setProjectMenu, setRewiring, setRoutableLinePlacement } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const editable = item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id);
    if (!isEditMode || !editable) {
      return;
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    if (item.kind === "node") {
      selectCanvasGraphics([item.id], []);
    } else {
      selectCanvasGraphics([], [item.id]);
    }
    clearRecordSelection();
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    setProjectMenu(null);
    const nextContextMenu: NonNullable<ContextMenuState> = {
      x: event.clientX,
      y: event.clientY,
      target: item.kind,
      source: "element-tree"
    };
    if (item.kind === "node") {
      nextContextMenu.nodeId = item.id;
    } else {
      nextContextMenu.edgeId = item.id;
    }
    setContextMenu(nextContextMenu);
  };
}

export function createSetEdgeManualPoints(__appScope: Record<string, any>) {
  return (edgeId: string, manualPoints: Point[], routePoints?: Point[]) => {
  const { edgeById, markRouteEdgesDirty, markStoredRouteEdgesDirty, patchGraphEdges, requireEditMode, sameOptionalPointList } = __appScope;
    if (!requireEditMode("修改连接线路径")) {
      return;
    }
    const normalizedManualPoints = manualPoints.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    const normalizedRoutePoints = routePoints?.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    const edge = edgeById.get(edgeId);
    if (
      !edge ||
      (
        sameOptionalPointList(edge.manualPoints, normalizedManualPoints) &&
        (!normalizedRoutePoints || sameOptionalPointList(edge.routePoints, normalizedRoutePoints))
      )
    ) {
      return;
    }
    markRouteEdgesDirty([edgeId]);
    markStoredRouteEdgesDirty([edgeId]);
    const nextEdge = { ...edge, manualPoints: normalizedManualPoints };
    if (normalizedRoutePoints) {
      nextEdge.routePoints = normalizedRoutePoints;
    } else {
      delete nextEdge.routePoints;
    }
    patchGraphEdges([nextEdge]);
  };
}

export function createRouteManualPoints(__appScope: Record<string, any>) {
  return (routePoints: Point[]) => {
    const manualPoints = routePoints.length > 4 ? routePoints.slice(2, -2) : routePoints.slice(1, -1);
    return manualPoints.map((point) => ({ ...point }));
  };
}

export function createFinishManualPathDrag(__appScope: Record<string, any>) {
  return () => {
  const { isRoutableLineDeviceKind, manualPathDrag, nodeById, patchGraphNodes, routeManualPoints, setEdgeManualPoints, setManualPathDrag, setRoutableLineDeviceCanvasPoints, writeOperationLog } = __appScope;
    if (!manualPathDrag) {
      return;
    }
    if (manualPathDrag.historyCaptured && manualPathDrag.previewRoutePoints?.length) {
      if (manualPathDrag.nodeId) {
        const lineNode = nodeById.get(manualPathDrag.nodeId);
        if (lineNode && isRoutableLineDeviceKind(lineNode.kind)) {
          const nextNode = setRoutableLineDeviceCanvasPoints(lineNode, manualPathDrag.previewRoutePoints);
          if (nextNode !== lineNode) {
            patchGraphNodes([nextNode]);
            writeOperationLog(`调整可变线路路径：${nextNode.name}`);
          }
        }
      } else if (manualPathDrag.edgeId) {
        setEdgeManualPoints(manualPathDrag.edgeId, routeManualPoints(manualPathDrag.previewRoutePoints), manualPathDrag.previewRoutePoints);
      }
    }
    setManualPathDrag(null);
  };
}

export function createTidySelectedEdgeRoute(__appScope: Record<string, any>) {
  return () => {
  const { canvasBounds, edges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, patchGraphEdges, pushUndoSnapshot, redrawConnectionRoutesForEdges, requireEditMode, selectedEdge, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    if (!requireEditMode("整理连接线")) {
      return;
    }
    if (!selectedEdge) {
      return;
    }
    const nextEdges = redrawConnectionRoutesForEdges(nodes, edges, [selectedEdge.id], canvasBounds);
    const changedEdge = nextEdges.find((edge, index) => edge.id === selectedEdge.id && edge !== edges[index]);
    if (!changedEdge) {
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch([], [changedEdge.id]));
    markRouteEdgesDirty([changedEdge.id]);
    markStoredRouteEdgesDirty([changedEdge.id]);
    patchGraphEdges([changedEdge]);
    writeOperationLog(`整理连接线：${changedEdge.id}`);
  };
}

export function createTidyRoutableLineRoute(__appScope: Record<string, any>) {
  return (nodeId?: string) => {
  const { activeLayerNodeIdSet, canvasBounds, isRoutableLineDeviceKind, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, redrawRoutableLineDeviceRoutes, requireEditMode, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    if (!requireEditMode("整理连接线")) {
      return;
    }
    if (!nodeId) {
      return;
    }
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return;
    }
    const changedLineNodes = redrawRoutableLineDeviceRoutes(nodes, [nodeId], canvasBounds);
    if (changedLineNodes.length === 0) {
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(changedLineNodes.map((node) => node.id), []));
    patchGraphNodes(changedLineNodes);
    writeOperationLog(`整理连接线：${lineNode.name}`);
  };
}
