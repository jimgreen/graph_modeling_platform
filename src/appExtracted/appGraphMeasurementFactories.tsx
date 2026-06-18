// @ts-nocheck
import { clampNumber } from "../canvasViewport";
import { degreesToRadians } from "../formatUtils";

export function createSetNodes(__appScope: Record<string, any>) {
  return (value: SetStateAction<ModelNode[]>) => {
  const { graphStoreSetNodes, setGraphStore } = __appScope;
    setGraphStore((current) => {
      const nextNodes = typeof value === "function" ? value(current.nodes) : value;
      return graphStoreSetNodes(current, nextNodes);
    });
  };
}

export function createSetEdges(__appScope: Record<string, any>) {
  return (value: SetStateAction<Edge[]>) => {
  const { graphStoreSetEdges, setGraphStore } = __appScope;
    setGraphStore((current) => {
      const nextEdges = typeof value === "function" ? value(current.edges) : value;
      return graphStoreSetEdges(current, nextEdges);
    });
  };
}

export function createSetGraphArrays(__appScope: Record<string, any>) {
  return (nextNodes: ModelNode[], nextEdges: Edge[]) => {
  const { graphStoreSetGraph, setGraphStore } = __appScope;
    setGraphStore((current) => graphStoreSetGraph(current, nextNodes, nextEdges));
  };
}

export function createPatchGraphNodes(__appScope: Record<string, any>) {
  return (nodeUpdates: Iterable<ModelNode>) => {
  const { graphStorePatchNodes, setGraphStore } = __appScope;
    setGraphStore((current) => graphStorePatchNodes(current, nodeUpdates));
  };
}

export function createPatchGraphEdges(__appScope: Record<string, any>) {
  return (edgeUpdates: Iterable<Edge>) => {
  const { graphStorePatchEdges, setGraphStore } = __appScope;
    setGraphStore((current) => graphStorePatchEdges(current, edgeUpdates));
  };
}

export function createUpdateGraphNodeById(__appScope: Record<string, any>) {
  return (nodeId: string, updater: (node: ModelNode) => ModelNode) => {
  const { graphStorePatchNodes, setGraphStore } = __appScope;
    setGraphStore((current) => {
      const node = current.nodeMap.get(nodeId);
      if (!node) {
        return current;
      }
      const nextNode = updater(node);
      return nextNode === node ? current : graphStorePatchNodes(current, [nextNode]);
    });
  };
}

export function createSetSchemes(__appScope: Record<string, any>) {
  return (value: SetStateAction<SavedSchemeRecord[]>) => {
  const { setSchemesState } = __appScope;
    setSchemesState(value);
  };
}

export function createUpdateSmartAlignmentGuides(__appScope: Record<string, any>) {
  return (guides: SmartAlignmentGuide[]) => {
  const { setSmartAlignmentGuides, smartAlignmentGuideSignature, smartAlignmentGuidesRef } = __appScope;
    if (smartAlignmentGuideSignature(smartAlignmentGuidesRef.current) === smartAlignmentGuideSignature(guides)) {
      return;
    }
    smartAlignmentGuidesRef.current = guides;
    setSmartAlignmentGuides(guides);
  };
}

export function createSetCanvasPanning(__appScope: Record<string, any>) {
  return (next: CanvasPanningState) => {
  const { panningRef, setPanning } = __appScope;
    panningRef.current = next;
    setPanning(next);
  };
}

export function createSetContextMarqueeSelection(__appScope: Record<string, any>) {
  return (next: ContextMarqueeSelectionState) => {
  const { contextMarqueeSelectionRef, setContextMarqueeSelectionState } = __appScope;
    contextMarqueeSelectionRef.current = next;
    setContextMarqueeSelectionState(next);
  };
}

export function createMarkGraphicContextMenuHandled(__appScope: Record<string, any>) {
  return () => {
  const { canvasGraphicContextMenuHandledRef, canvasGraphicContextMenuHandledTimerRef } = __appScope;
    canvasGraphicContextMenuHandledRef.current = true;
    if (canvasGraphicContextMenuHandledTimerRef.current !== null) {
      window.clearTimeout(canvasGraphicContextMenuHandledTimerRef.current);
    }
    canvasGraphicContextMenuHandledTimerRef.current = window.setTimeout(() => {
      canvasGraphicContextMenuHandledRef.current = false;
      canvasGraphicContextMenuHandledTimerRef.current = null;
    }, 0);
  };
}

export function createConsumeGraphicContextMenuHandled(__appScope: Record<string, any>) {
  return () => {
  const { canvasGraphicContextMenuHandledRef, canvasGraphicContextMenuHandledTimerRef } = __appScope;
    const handled = canvasGraphicContextMenuHandledRef.current;
    canvasGraphicContextMenuHandledRef.current = false;
    if (canvasGraphicContextMenuHandledTimerRef.current !== null) {
      window.clearTimeout(canvasGraphicContextMenuHandledTimerRef.current);
      canvasGraphicContextMenuHandledTimerRef.current = null;
    }
    return handled;
  };
}

export function createOpenGraphicContextMenu(__appScope: Record<string, any>) {
  return (menu: NonNullable<ContextMenuState>) => {
  const { markGraphicContextMenuHandled, setContextMenu } = __appScope;
    markGraphicContextMenuHandled();
    setContextMenu(menu);
  };
}

export function createSetOperationLogText(__appScope: Record<string, any>) {
  return (nextLog: string) => {
  const { operationLogRef, operationLogStatusRef } = __appScope;
    operationLogRef.current = nextLog;
    const element = operationLogStatusRef.current;
    if (!element) {
      return;
    }
    element.title = nextLog;
    element.textContent = `日志 ${nextLog}`;
  };
}

export function createEdgeListForNodeIds(__appScope: Record<string, any>) {
  return (nodeIds: Iterable<string>, extraEdgeIds: Iterable<string> = []) => {
  const { edgeById, edgesByNodeId } = __appScope;
    const collected = new Map<string, Edge>();
    for (const nodeId of nodeIds) {
      for (const edge of edgesByNodeId.get(nodeId) ?? []) {
        collected.set(edge.id, edge);
      }
    }
    for (const edgeId of extraEdgeIds) {
      const edge = edgeById.get(edgeId);
      if (edge) {
        collected.set(edge.id, edge);
      }
    }
    return Array.from(collected.values());
  };
}

export function createBuildSingleNodeDragCache(__appScope: Record<string, any>) {
  return (nodeIds: string[], edgeIds: string[], affectedEdges: Edge[]): SingleNodeDragCache | undefined => {
  const { CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, colorDisplayMode, colorPalette, currentStoredRoutePointsForEdge, edgeWithFrozenBusEndpointPoints, getConnectionStrokeColor, getModelEdgeEndpointPoint, getRouteEndpointNormal, isBusNode, nodeById, visibleEdgeIdSet } = __appScope;
    if (nodeIds.length !== 1) {
      return undefined;
    }
    const movedNodeIds = new Set(nodeIds);
    const draggedEdgeIds = new Set(edgeIds);
    const movedBusNodeIds = new Set(
      nodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    const relevantEdges = affectedEdges.filter((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return false;
      }
      return movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id);
    });
    const previewEdges = relevantEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT);
    const previewEndpointByEdgeId = new Map<string, SingleNodeDragPreviewEndpoint>();
    for (const edge of previewEdges) {
      const sourceMoves = movedNodeIds.has(edge.sourceId);
      const targetMoves = movedNodeIds.has(edge.targetId);
      const wholeEdgeMoves = draggedEdgeIds.has(edge.id) && !sourceMoves && !targetMoves;
      if (wholeEdgeMoves || movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)) {
        continue;
      }
      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) {
        continue;
      }
      const routePoints = currentStoredRoutePointsForEdge(edge);
      const frozenEdge = edgeWithFrozenBusEndpointPoints(edge, routePoints);
      const start = getModelEdgeEndpointPoint(sourceNode, frozenEdge.sourcePoint, frozenEdge.sourceTerminalId);
      const end = getModelEdgeEndpointPoint(targetNode, frozenEdge.targetPoint, frozenEdge.targetTerminalId);
      previewEndpointByEdgeId.set(edge.id, {
        edgeId: edge.id,
        color: getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette),
        start,
        end,
        sourceNode,
        targetNode,
        startMoves: sourceMoves,
        endMoves: targetMoves,
        sourceNormal: getRouteEndpointNormal(sourceNode, start, end, edge.sourceTerminalId),
        targetNormal: getRouteEndpointNormal(targetNode, end, start, edge.targetTerminalId),
        routePoints
      });
    }
    return {
      movedNodeIds,
      draggedEdgeIds,
      movedBusNodeIds,
      relevantEdges,
      previewEdges,
      snapEdges: relevantEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT),
      previewEndpointByEdgeId
    };
  };
}

export function createOrderedNodeFromList(__appScope: Record<string, any>) {
  return (sourceNodes: ModelNode[], nodeId: string) => {
  const { graphStore, nodeById, nodePatchListLookupCacheRef, nodes } = __appScope;
    const index = graphStore.nodeIndexById.get(nodeId);
    const indexedNode = index === undefined ? undefined : sourceNodes[index];
    if (indexedNode?.id === nodeId) {
      return indexedNode;
    }
    if (sourceNodes !== nodes && sourceNodes.length < graphStore.nodes.length) {
      let patchNodeById = nodePatchListLookupCacheRef.current.get(sourceNodes);
      if (!patchNodeById) {
        patchNodeById = new Map(sourceNodes.map((node) => [node.id, node]));
        nodePatchListLookupCacheRef.current.set(sourceNodes, patchNodeById);
      }
      const patchedNode = patchNodeById.get(nodeId);
      if (patchedNode) {
        return patchedNode;
      }
    }
    const currentNode = sourceNodes === nodes || sourceNodes.length < graphStore.nodes.length ? nodeById.get(nodeId) : undefined;
    return currentNode?.id === nodeId ? currentNode : undefined;
  };
}

export function createOrderedNodesForIds(__appScope: Record<string, any>) {
  return (sourceNodes: ModelNode[], nodeIds: Iterable<string>) => {
  const { orderedNodeFromList } = __appScope;
    const selectedNodes: ModelNode[] = [];
    for (const nodeId of nodeIds) {
      const node = orderedNodeFromList(sourceNodes, nodeId);
      if (node) {
        selectedNodes.push(node);
      }
    }
    return selectedNodes;
  };
}

export function createAddRoutingNodesForConnectionEdge(__appScope: Record<string, any>) {
  return (
    edge: Edge,
    sourceNodes: ModelNode[],
    scopedNodes: Map<string, ModelNode>
  ) => {
  const { getModelEdgeEndpointPoint, nodeForRoutingList, queryNodeSpatialIndex, visibleNodeSpatialIndex } = __appScope;
    const source = nodeForRoutingList(sourceNodes, edge.sourceId);
    const target = nodeForRoutingList(sourceNodes, edge.targetId);
    if (!source || !target) {
      return;
    }
    const sourcePoint = getModelEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
    const targetPoint = getModelEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
    const padding = 512;
    const searchBounds = {
      left: Math.min(sourcePoint.x, targetPoint.x) - padding,
      right: Math.max(sourcePoint.x, targetPoint.x) + padding,
      top: Math.min(sourcePoint.y, targetPoint.y) - padding,
      bottom: Math.max(sourcePoint.y, targetPoint.y) + padding
    };
    scopedNodes.set(source.id, source);
    scopedNodes.set(target.id, target);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (!scopedNodes.has(node.id)) {
        scopedNodes.set(node.id, node);
      }
    }
  };
}

export function createRoutingNodesForConnectionEdge(__appScope: Record<string, any>) {
  return (edge: Edge, sourceNodes?: ModelNode[]) => {
  const { addRoutingNodesForConnectionEdge, visibleNodes } = __appScope;
    if (sourceNodes === undefined) {
      sourceNodes = visibleNodes;
    }
    const scopedNodes = new Map<string, ModelNode>();
    addRoutingNodesForConnectionEdge(edge, sourceNodes, scopedNodes);
    return scopedNodes.size > 0 ? Array.from(scopedNodes.values()) : sourceNodes;
  };
}

export function createRoutingNodesForConnectionEdges(__appScope: Record<string, any>) {
  return (
    candidateEdges: Edge[],
    sourceNodes: ModelNode[],
    extraNodeIds: Iterable<string> = []
  ) => {
  const { addRoutingNodesForConnectionEdge, nodeById, orderedNodeFromList } = __appScope;
    if (candidateEdges.length === 0) {
      return [];
    }
    const scopedNodes = new Map<string, ModelNode>();
    for (const nodeId of extraNodeIds) {
      const node = orderedNodeFromList(sourceNodes, nodeId) ?? nodeById.get(nodeId);
      if (node) {
        scopedNodes.set(node.id, node);
      }
    }
    for (const edge of candidateEdges) {
      addRoutingNodesForConnectionEdge(edge, sourceNodes, scopedNodes);
    }
    return scopedNodes.size > 0 ? Array.from(scopedNodes.values()) : sourceNodes;
  };
}

export function createCachedConnectionStrokeColor(__appScope: Record<string, any>) {
  return (edge: Edge) => {
  const { colorDisplayMode, colorPalette, connectionStrokeColorCacheRef, connectionStrokeColorCacheToken, getConnectionStrokeColor, nodeById } = __appScope;
    const cache = connectionStrokeColorCacheRef.current;
    if (cache.nodeById !== nodeById || cache.token !== connectionStrokeColorCacheToken) {
      cache.nodeById = nodeById;
      cache.token = connectionStrokeColorCacheToken;
      cache.colors = new Map();
    }
    const cached = cache.colors.get(edge.id);
    if (cached && cached.edge === edge) {
      return cached.color;
    }
    const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette);
    cache.colors.set(edge.id, { edge, color });
    return color;
  };
}

export function createConnectionLineStyle(__appScope: Record<string, any>) {
  return (edgeId: string) => {
  const { cachedConnectionStrokeColor, edgeById } = __appScope;
    const edge = edgeById.get(edgeId);
    return edge ? ({ "--connection-color": cachedConnectionStrokeColor(edge) } as CSSProperties) : undefined;
  };
}

export function createMeasurementGroupAnchorPoint(__appScope: Record<string, any>) {
  return (node: ModelNode, group: MeasurementGroup, absolute: boolean): Point => {
  const { getTerminalPoint } = __appScope;
    if (group.terminalId && node.terminals.some((terminal) => terminal.id === group.terminalId)) {
      const terminalPoint = getTerminalPoint(node, group.terminalId);
      return absolute
        ? terminalPoint
        : { x: terminalPoint.x - node.position.x, y: terminalPoint.y - node.position.y };
    }
    return absolute ? node.position : { x: 0, y: 0 };
  };
}

export function createMeasurementGroupLocalOffset(__appScope: Record<string, any>) {
  return (node: ModelNode, group: MeasurementGroup): Point => {
  const { measurementOffsetScaleForNode } = __appScope;
    const offsetScale = measurementOffsetScaleForNode(node);
    return {
      x: group.offset.x * offsetScale.x,
      y: group.offset.y * offsetScale.y
    };
  };
}

export function createMeasurementGroupCanvasPosition(__appScope: Record<string, any>) {
  return (node: ModelNode, group: MeasurementGroup): Point => {
  const { measurementGroupAnchorPoint, measurementGroupLocalOffset } = __appScope;
    const anchor = measurementGroupAnchorPoint(node, group, true);
    const localOffset = measurementGroupLocalOffset(node, group);
    return {
      x: anchor.x + localOffset.x,
      y: anchor.y + localOffset.y
    };
  };
}

export function createMeasurementGroupRenderMetrics(__appScope: Record<string, any>) {
  return (node: ModelNode, group: MeasurementGroup) => {
  const { formatMeasurementDisplayValue, measurementConfig, measurementFontScaleForNode, resolveMeasurementItemDisplay } = __appScope;
    if (!group.visible) {
      return null;
    }
    const measurementFontScale = measurementFontScaleForNode(node);
    const rows = group.items.flatMap((item) => {
      const display = resolveMeasurementItemDisplay({ config: measurementConfig, node, group, item });
      if (!display.visible) {
        return [];
      }
      const label = group.labelVisible === false ? "" : display.label;
      const unit = group.unitVisible === false ? "" : display.unit;
      const text = `${label} ${formatMeasurementDisplayValue(undefined, display.decimals, unit)}`.trim();
      return [{ item, display, text, fontSize: display.fontSize * measurementFontScale }];
    });
    if (rows.length === 0) {
      return null;
    }
    const maxFontSize = Math.max(...rows.map((row) => row.fontSize));
    const lineHeight = Math.max(16, maxFontSize + 6);
    const columnWidth = Math.max(72, Math.max(...rows.map((row) => row.text.length * row.fontSize * 0.58)) + 12);
    const columns = group.layout === "grid" ? 2 : group.layout === "horizontal" ? rows.length : 1;
    const width = Math.max(64, columnWidth * columns);
    const height = Math.max(lineHeight, Math.ceil(rows.length / columns) * lineHeight);
    return { rows, maxFontSize, lineHeight, columnWidth, columns, width, height };
  };
}

export function createIncludeMeasurementGroupBounds(__appScope: Record<string, any>) {
  return (node: ModelNode, includeBox: (box: RenderViewportBounds) => void) => {
  const { measurementGroupCanvasPosition, measurementGroupRenderMetrics, measurementGroupsForNode, projectMeasurements } = __appScope;
    for (const group of measurementGroupsForNode(projectMeasurements, node.id)) {
      const metrics = measurementGroupRenderMetrics(node, group);
      if (!metrics) {
        continue;
      }
      const position = measurementGroupCanvasPosition(node, group);
      includeBox({
        left: position.x - metrics.width / 2,
        right: position.x + metrics.width / 2,
        top: position.y - metrics.height / 2,
        bottom: position.y + metrics.height / 2
      });
    }
  };
}

export function createBuildMeasurementGroupMarkup(__appScope: Record<string, any>) {
  return (node: ModelNode, group: MeasurementGroup, options: { absolute?: boolean } = {}) => {
  const { escapeXml, exportMeasurementGroupMetadataAttributes, exportMeasurementItemMetadataAttributes, formatSvgNumber, measurementGroupAnchorPoint, measurementGroupBackgroundColor, measurementGroupBorderColor, measurementGroupBorderDashArray, measurementGroupBorderWidth, measurementGroupLocalOffset, measurementGroupRenderMetrics, selectedMeasurementGroupIdSet } = __appScope;
    const metrics = measurementGroupRenderMetrics(node, group);
    if (!metrics) {
      return "";
    }
    const anchor = measurementGroupAnchorPoint(node, group, Boolean(options.absolute));
    const localOffset = measurementGroupLocalOffset(node, group);
    const position = { x: anchor.x + localOffset.x, y: anchor.y + localOffset.y };
    const selectedClass = selectedMeasurementGroupIdSet.has(group.id) ? " selected" : "";
    const borderDashArray = measurementGroupBorderDashArray(group);
    const borderDashAttribute = borderDashArray ? ` stroke-dasharray="${escapeXml(borderDashArray)}"` : "";
    const rowsMarkup = metrics.rows.map((row, index) => {
      const col = metrics.columns <= 1 ? 0 : index % metrics.columns;
      const rowIndex = metrics.columns <= 1 ? index : Math.floor(index / metrics.columns);
      const textX = -metrics.width / 2 + col * metrics.columnWidth + 7;
      const textY = -metrics.height / 2 + rowIndex * metrics.lineHeight + metrics.lineHeight / 2;
      return `<text class="measurement-item" ${exportMeasurementItemMetadataAttributes(node, group, row.item, row.display)} x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}" dominant-baseline="middle" fill="${escapeXml(row.display.color)}" font-family="${escapeXml(row.display.fontFamily)}" font-size="${formatSvgNumber(row.fontSize)}" font-weight="${escapeXml(row.display.fontWeight)}" font-style="${escapeXml(row.display.fontStyle)}" text-decoration="${escapeXml(row.display.textDecoration)}">${escapeXml(row.text)}</text>`;
    }).join("");
    return `<g class="measurement-group drag-preview-measurement-group${selectedClass}" transform="translate(${formatSvgNumber(position.x)} ${formatSvgNumber(position.y)})" ${exportMeasurementGroupMetadataAttributes(node, group)}>
  <rect class="measurement-group-bg" x="${formatSvgNumber(-metrics.width / 2)}" y="${formatSvgNumber(-metrics.height / 2)}" width="${formatSvgNumber(metrics.width)}" height="${formatSvgNumber(metrics.height)}" rx="4" fill="${escapeXml(measurementGroupBackgroundColor(group))}" stroke="${escapeXml(measurementGroupBorderColor(group))}" stroke-width="${formatSvgNumber(measurementGroupBorderWidth(group))}"${borderDashAttribute}/>
  ${rowsMarkup}
</g>`;
  };
}

export function createBuildRoutableLineDragGhostRoutesForNodeIds(__appScope: Record<string, any>) {
  return (nodeIds: Iterable<string>): DragGhostRoute[] => {
  const { colorDisplayMode, colorPalette, getDeviceStrokeColor, isRoutableLineDeviceKind, nodeById, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineNodeIdsByEndpointNodeId, visibleNodeIdSet } = __appScope;
    const candidateLineIds = new Set<string>();
    for (const nodeId of nodeIds) {
      const node = nodeById.get(nodeId);
      if (node && isRoutableLineDeviceKind(node.kind)) {
        candidateLineIds.add(node.id);
      }
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        candidateLineIds.add(lineId);
      }
    }
    const routes: DragGhostRoute[] = [];
    for (const lineId of candidateLineIds) {
      const lineNode = nodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const points = routableLineDeviceCanvasPoints(lineNode);
      if (points.length < 2) {
        continue;
      }
      routes.push({
        edgeId: `routable-line:${lineNode.id}`,
        routableLineNodeId: lineNode.id,
        path: pointsToPreviewPath(points),
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette)
      });
    }
    return routes;
  };
}

export function createBuildMultiNodeDragOverlayPreview(__appScope: Record<string, any>) {
  return (
    dragNodeIds: string[],
    affectedEdgesForDrag: Edge[],
    originalPositionsForDrag: Record<string, Point>,
    originalRoutePointsForDrag: Record<string, Point[]>,
    movingEdgeIds: Iterable<string> = []
  ): MultiNodeDragOverlayPreview => {
  const { CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT, CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT, buildMeasurementGroupsMarkup, buildNodePreviewImageMarkup, buildRoutableLineDragGhostRoutesForNodeIds, colorDisplayMode, colorPalette, escapeXml, formatSvgNumber, getConnectionStrokeColor, getDeviceStrokeColor, getDeviceStrokeWidth, includeMeasurementGroupBounds, isBusNode, nodeById, nodeGeometryTransform, nodeHasUprightBoundsContent, nodeVisualInteractionBounds, pointsToPreviewPath, visibleEdgeIdSet, visibleNodeIdSet } = __appScope;
    const movingNodeIdSet = new Set(dragNodeIds);
    const movingEdgeIdSet = new Set(movingEdgeIds);
    const movingBusNodeIdSet = new Set(
      dragNodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    const useSimplifiedOverlay = dragNodeIds.length > CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT;
    const simplifiedNodeMarkup: string[] = [];
    const simplifiedEdgeMarkup: string[] = [];
    let bounds: RenderViewportBounds | null = null;
    const includePoint = (point: Point) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, point.x),
            right: Math.max(bounds.right, point.x),
            top: Math.min(bounds.top, point.y),
            bottom: Math.max(bounds.bottom, point.y)
          }
        : { left: point.x, right: point.x, top: point.y, bottom: point.y };
    };
    const includeBox = (box: RenderViewportBounds) => {
      includePoint({ x: box.left, y: box.top });
      includePoint({ x: box.right, y: box.bottom });
    };
    for (const nodeId of dragNodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = originalPositionsForDrag[nodeId] ?? node?.position;
      if (!node || !originalPosition || !visibleNodeIdSet.has(node.id)) {
        continue;
      }
      const includeUprightContentInBounds = nodeHasUprightBoundsContent(node);
      const previewNode = originalPosition === node.position ? node : { ...node, position: originalPosition };
      includeBox(nodeVisualInteractionBounds(node, originalPosition, 0, includeUprightContentInBounds));
      includeMeasurementGroupBounds(previewNode, includeBox);
      if (useSimplifiedOverlay) {
        const nodeIsBus = isBusNode(node);
        const positionTransform = `translate(${formatSvgNumber(originalPosition.x)} ${formatSvgNumber(originalPosition.y)})`;
        const transform = `${positionTransform} ${nodeGeometryTransform(node)}`;
        const fill = node.params.backgroundColor || "#ffffff";
        const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
        const strokeWidth = Math.max(2, getDeviceStrokeWidth(node));
        const imageMarkup = buildNodePreviewImageMarkup(node, `multi-node-drag-lite-preview-clip-${node.id}`, { clip: false });
        const measurementMarkup = buildMeasurementGroupsMarkup(previewNode, { absolute: true });
        if (imageMarkup) {
          simplifiedNodeMarkup.push(
            `<g class="multi-node-drag-preview-node-lite${nodeIsBus ? " bus-node" : ""}" transform="${escapeXml(positionTransform)}"><title>${escapeXml(node.name)}</title>${imageMarkup}</g>`
          );
        } else {
          simplifiedNodeMarkup.push(
            `<rect class="multi-node-drag-preview-node-lite${nodeIsBus ? " bus-node" : ""}" transform="${escapeXml(transform)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 6}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"><title>${escapeXml(node.name)}</title></rect>`
          );
        }
        if (measurementMarkup) {
          simplifiedNodeMarkup.push(`${measurementMarkup}`);
        }
      }
    }
    const edgeRoutes: MultiNodeDragOverlayPreview["edgeRoutes"] = [];
    const ghostRoutes: MultiNodeDragOverlayPreview["ghostRoutes"] = [];
    const dynamicEdgePreviewEdges: Edge[] = [];
    for (const edge of affectedEdgesForDrag) {
      if (!visibleEdgeIdSet.has(edge.id)) {
        continue;
      }
      const edgeMovesWithDraggedGraphics =
        movingEdgeIdSet.has(edge.id) || (movingNodeIdSet.has(edge.sourceId) && movingNodeIdSet.has(edge.targetId));
      if (
        !edgeMovesWithDraggedGraphics &&
        dynamicEdgePreviewEdges.length < CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT &&
        (movingNodeIdSet.has(edge.sourceId) || movingNodeIdSet.has(edge.targetId))
      ) {
        dynamicEdgePreviewEdges.push(edge);
      }
      const points = originalRoutePointsForDrag[edge.id];
      if (points?.length && (edgeMovesWithDraggedGraphics || movingNodeIdSet.has(edge.sourceId) || movingNodeIdSet.has(edge.targetId))) {
        ghostRoutes.push({
          edgeId: edge.id,
          path: pointsToPreviewPath(points),
          color: getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette)
        });
      }
      if (!edgeMovesWithDraggedGraphics) {
        continue;
      }
      if (!points?.length) {
        continue;
      }
      for (const point of points) {
        includePoint(point);
      }
      const path = pointsToPreviewPath(points);
      if (useSimplifiedOverlay) {
        const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette);
        simplifiedEdgeMarkup.push(
          `<path class="connection-line drag-preview" d="${escapeXml(path)}" style="--connection-color:${escapeXml(color)}"/>`
        );
      } else {
        edgeRoutes.push({ edgeId: edge.id, path });
      }
    }
    ghostRoutes.push(...buildRoutableLineDragGhostRoutesForNodeIds(dragNodeIds));
    const previewBounds = bounds as RenderViewportBounds | null;
    const paddedBounds = previewBounds
      ? {
          left: previewBounds.left - 4,
          right: previewBounds.right + 4,
          top: previewBounds.top - 4,
          bottom: previewBounds.bottom + 4
        }
      : null;
    if (useSimplifiedOverlay && paddedBounds) {
      simplifiedNodeMarkup.push(
        `<rect class="multi-node-drag-bounds-preview" x="${formatSvgNumber(paddedBounds.left)}" y="${formatSvgNumber(paddedBounds.top)}" width="${formatSvgNumber(Math.max(1, paddedBounds.right - paddedBounds.left))}" height="${formatSvgNumber(Math.max(1, paddedBounds.bottom - paddedBounds.top))}"/>`
      );
    }
    return {
      bounds: paddedBounds,
      edgeRoutes,
      ghostRoutes,
      dynamicEdgePreviewEdges,
      movedNodeIds: movingNodeIdSet,
      draggedEdgeIds: movingEdgeIdSet,
      movedBusNodeIds: movingBusNodeIdSet,
      simplifiedMarkup: useSimplifiedOverlay
        ? `${simplifiedEdgeMarkup.join("")}${simplifiedNodeMarkup.join("")}`
        : undefined
    };
  };
}

export function createRenderMultiNodeDragOverlay(__appScope: Record<string, any>) {
  return () => {
  const { MemoDeviceGlyph, buildMeasurementGroupsMarkup, circle, clipPath, colorDisplayMode, colorPalette, connectionLineStyle, dragging, draggingRef, g, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, image, isBusNode, isMultiNodeMoveState, isRoutableLineDeviceKind, isStaticNode, line, multiNodeDragOverlayDeltaRef, multiNodeDragOverlayRef, nodeById, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, path, rect, resolveNodeStateVisual, svgStrokeDashArray, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, title, updateMultiNodeDragOverlayTransform, visibleNodeIdSet } = __appScope;
    if (!dragging || !isMultiNodeMoveState(dragging)) {
      return null;
    }
    const overlay = dragging.overlayPreview ?? {
      bounds: null,
      edgeRoutes: [],
      ghostRoutes: [],
      dynamicEdgePreviewEdges: [],
      movedNodeIds: new Set<string>(),
      draggedEdgeIds: new Set<string>(),
      movedBusNodeIds: new Set<string>()
    };
    if (overlay.simplifiedMarkup) {
      return (
        <g
          ref={(element) => {
            multiNodeDragOverlayRef.current = element;
            if (element) {
              updateMultiNodeDragOverlayTransform(draggingRef.current?.previewDelta ?? draggingRef.current?.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
            }
          }}
          className="multi-node-drag-overlay"
          transform={`translate(${Math.round(multiNodeDragOverlayDeltaRef.current.x)} ${Math.round(multiNodeDragOverlayDeltaRef.current.y)})`}
          dangerouslySetInnerHTML={{ __html: overlay.simplifiedMarkup }}
        />
      );
    }
    return (
      <g
        ref={(element) => {
          multiNodeDragOverlayRef.current = element;
          if (element) {
            updateMultiNodeDragOverlayTransform(draggingRef.current?.previewDelta ?? draggingRef.current?.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
          }
        }}
        className="multi-node-drag-overlay"
        transform={`translate(${Math.round(multiNodeDragOverlayDeltaRef.current.x)} ${Math.round(multiNodeDragOverlayDeltaRef.current.y)})`}
      >
        {overlay.edgeRoutes.map((route) => (
          <path key={`multi-drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
        ))}
        {dragging.nodeIds.map((nodeId) => {
          const node = nodeById.get(nodeId);
          const originalPosition = dragging.originalPositions[nodeId] ?? node?.position;
          if (!node || !originalPosition || !visibleNodeIdSet.has(node.id)) {
            return null;
          }
          const imageHref = nodeImage(node);
          const foregroundImageHref = nodeForegroundImage(node);
          const nodeScaleX = getNodeScaleX(node);
          const nodeScaleY = getNodeScaleY(node);
          const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
          const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
          const nodeIsBus = isBusNode(node);
          const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
          const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
          const measurementMarkup = buildMeasurementGroupsMarkup(node);
          return (
            <g
              key={`multi-drag-preview-node-${node.id}`}
              className={`multi-node-drag-preview-node ${nodeIsBus ? "bus-node" : ""}`}
              transform={`translate(${originalPosition.x} ${originalPosition.y})`}
            >
              <title>{node.name}</title>
              {imageHref && !nodeIsBus && (
                <clipPath id={`multi-drag-preview-clip-${node.id}`}>
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                  />
                </clipPath>
              )}
              <g className="node-geometry" transform={nodeGeometryTransform(node)}>
                <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
                <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
              </g>
              {!nodeIsBus && (imageHref || foregroundImageHref) && (
                <g className="node-upright-content" transform={nodeImageContentTransform(node)}>
                  {imageHref && isStaticNode(node) && (
                    <image
                      href={imageHref}
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#multi-drag-preview-clip-${node.id})`}
                      className="node-background-image"
                    />
                  )}
                  {imageHref && !isStaticNode(node) && (
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                      className="node-image-cover"
                    />
                  )}
                  {imageHref && !isStaticNode(node) && (
                    <image
                      href={imageHref}
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#multi-drag-preview-clip-${node.id})`}
                      className="node-background-image"
                    />
                  )}
                  {foregroundImageHref && (
                    <image
                      href={foregroundImageHref}
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#multi-drag-preview-clip-${node.id})`}
                      className="node-foreground-image"
                    />
                  )}
                </g>
              )}
              {!nodeIsBus && !isStaticNode(node) && !isRoutableLineDeviceKind(node.kind) && (
                <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                  {node.terminals.map((terminal) => {
                    const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                    const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                    const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                    return (
                      <g key={terminal.id} transform={terminalControlTransform(renderPoint.x, renderPoint.y)}>
                        <line
                          className={`terminal-stub ${terminal.type}`}
                          strokeDasharray={terminalStubDashArray}
                          style={{
                            stroke: terminalDisplayColor,
                            strokeWidth: terminalStubStrokeWidth(node, terminal)
                          }}
                          x1={stub.from.x}
                          y1={stub.from.y}
                          x2={stub.to.x}
                          y2={stub.to.y}
                        />
                        <circle
                          className={`terminal-dot ${terminal.type}`}
                          style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                          cx="0"
                          cy="0"
                          r={6}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
              {measurementMarkup && (
                <g dangerouslySetInnerHTML={{ __html: measurementMarkup }} />
              )}
            </g>
          );
        })}
        {overlay.bounds && (
          <rect
            className="multi-node-drag-bounds-preview"
            x={overlay.bounds.left}
            y={overlay.bounds.top}
            width={Math.max(1, overlay.bounds.right - overlay.bounds.left)}
            height={Math.max(1, overlay.bounds.bottom - overlay.bounds.top)}
          />
        )}
      </g>
    );
  };
}

export function createGroupTransformPreviewNodeFromSnapshot(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { isGroupTransformDrag, transformDrag } = __appScope;
    if (!transformDrag || !isGroupTransformDrag(transformDrag)) {
      return node;
    }
    const snapshot = transformDrag.originalNodes[node.id];
    return snapshot
      ? {
          ...node,
          position: { ...snapshot.position },
          rotation: snapshot.rotation,
          scale: snapshot.scale,
          scaleX: snapshot.scaleX,
          scaleY: snapshot.scaleY
        }
      : node;
  };
}

export function createRenderGroupTransformPhotoPreview(__appScope: Record<string, any>) {
  return () => {
  const { MemoDeviceGlyph, canvasBounds, circle, clipPath, colorDisplayMode, colorPalette, connectionLineStyle, g, getDeviceStrokeColor, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, groupTransformGeometry, groupTransformPreviewEdgeRoutes, groupTransformPreviewNodeFromSnapshot, groupTransformPreviewRoutableLineNodeIdSet, groupTransformPreviewTransform, image, isBusNode, isGroupTransformDrag, isRoutableLineDeviceKind, isStaticNode, line, nodeById, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, nodes, normalizeRotationDegrees, path, pointsToPreviewPath, rect, resolveNodeStateVisual, routableLineDeviceCanvasPoints, routeRoutableLineDevice, svgStrokeDashArray, syncRoutableLineDeviceEndpointsToRefs, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, title, transformDrag, transformGroupPoint, visibleNodeIdSet } = __appScope;
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !groupTransformPreviewTransform) {
      return null;
    }
    const bounds = transformDrag.bounds;
    const geometry = transformDrag.previewPoint ? groupTransformGeometry(transformDrag, transformDrag.previewPoint) : null;
    const transformedNodeUpdates = geometry
      ? transformDrag.nodeIds.flatMap((nodeId) => {
          const snapshot = transformDrag.originalNodes[nodeId];
          const node = nodeById.get(nodeId);
          if (!node || !snapshot) {
            return [];
          }
          return [{
            ...node,
            position: transformGroupPoint(transformDrag, geometry, snapshot.position),
            ...(geometry.kind === "rotate"
              ? { rotation: normalizeRotationDegrees(snapshot.rotation + geometry.degrees) }
              : {
                  scale: Math.max(
                    Math.abs((snapshot.scaleX ?? snapshot.scale ?? 1) * geometry.scaleX),
                    Math.abs((snapshot.scaleY ?? snapshot.scale ?? 1) * geometry.scaleY)
                  ),
                  scaleX: (snapshot.scaleX ?? snapshot.scale ?? 1) * geometry.scaleX,
                  scaleY: (snapshot.scaleY ?? snapshot.scale ?? 1) * geometry.scaleY
                })
          }];
        })
      : [];
    const transformedNodeById = new Map(nodeById);
    for (const node of transformedNodeUpdates) {
      transformedNodeById.set(node.id, node);
    }
    const previewNodes = nodes.map((node) => transformedNodeById.get(node.id) ?? node);
    const routableLineTransformPreviewRoutes = Array.from(groupTransformPreviewRoutableLineNodeIdSet).flatMap((lineId) => {
      const lineNode = nodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        return [];
      }
      const syncedLine = syncRoutableLineDeviceEndpointsToRefs(lineNode, previewNodes, transformedNodeById, nodes);
      const routingNodes = previewNodes.map((node) => (node.id === syncedLine.id ? syncedLine : node));
      const routedLine = routeRoutableLineDevice(syncedLine, routingNodes, canvasBounds);
      const points = routableLineDeviceCanvasPoints(routedLine);
      const start = points[0];
      const end = points[points.length - 1];
      if (!start || !end) {
        return [];
      }
      return [{
        nodeId: lineNode.id,
        path: pointsToPreviewPath(points),
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette)
      }];
    });
    return (
      <g className="group-transform-photo-preview">
        <g className="group-transform-origin-ghost">
          {transformDrag.originalEdgeRoutes.map((route) => (
            <path
              key={`group-transform-origin-edge-${route.edgeId}`}
              d={pointsToPreviewPath(route.points)}
              className="connection-line group-transform-origin-edge"
              style={connectionLineStyle(route.edgeId)}
            />
          ))}
          <rect
            className="group-transform-origin-outline"
            x={bounds.left}
            y={bounds.top}
            width={Math.max(1, bounds.right - bounds.left)}
            height={Math.max(1, bounds.bottom - bounds.top)}
          />
        </g>
        {groupTransformPreviewEdgeRoutes.map((route) => (
          <path key={`group-transform-photo-edge-${route.edgeId}`} d={route.path} className="connection-line group-transform-preview" style={connectionLineStyle(route.edgeId)} />
        ))}
        {routableLineTransformPreviewRoutes.map((route) => (
          <path
            key={`group-transform-photo-routable-line-${route.nodeId}`}
            d={route.path}
            className="connection-line group-transform-preview"
            style={{ "--connection-color": route.color } as CSSProperties}
          />
        ))}
        <g className="group-transform-photo-content" transform={groupTransformPreviewTransform}>
          {transformDrag.nodeIds.map((nodeId) => {
            const originalNode = nodeById.get(nodeId);
            if (!originalNode || !visibleNodeIdSet.has(originalNode.id)) {
              return null;
            }
            const node = groupTransformPreviewNodeFromSnapshot(originalNode);
            const imageHref = nodeImage(node);
            const foregroundImageHref = nodeForegroundImage(node);
            const nodeScaleX = getNodeScaleX(node);
            const nodeScaleY = getNodeScaleY(node);
            const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
            const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
            const nodeIsBus = isBusNode(node);
            const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
            const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
            return (
              <g
                key={`group-transform-photo-node-${node.id}`}
                className={`group-transform-photo-node ${nodeIsBus ? "bus-node" : ""}`}
                transform={`translate(${node.position.x} ${node.position.y})`}
              >
                <title>{node.name}</title>
                {imageHref && !nodeIsBus && (
                  <clipPath id={`group-transform-preview-clip-${node.id}`}>
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                    />
                  </clipPath>
                )}
                <g className="node-geometry" transform={nodeGeometryTransform(node)}>
                  <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
                  <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
                </g>
                {!nodeIsBus && (imageHref || foregroundImageHref) && (
                  <g className="node-upright-content" transform={nodeImageContentTransform(node)}>
                    {imageHref && isStaticNode(node) && (
                      <image
                        href={imageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#group-transform-preview-clip-${node.id})`}
                        className="node-background-image"
                      />
                    )}
                    {imageHref && !isStaticNode(node) && (
                      <rect
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        rx="8"
                        className="node-image-cover"
                      />
                    )}
                    {imageHref && !isStaticNode(node) && (
                      <image
                        href={imageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#group-transform-preview-clip-${node.id})`}
                        className="node-background-image"
                      />
                    )}
                    {foregroundImageHref && (
                      <image
                        href={foregroundImageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#group-transform-preview-clip-${node.id})`}
                        className="node-foreground-image"
                      />
                    )}
                  </g>
                )}
                {!nodeIsBus && !isStaticNode(node) && !isRoutableLineDeviceKind(node.kind) && (
                  <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                    {node.terminals.map((terminal) => {
                      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                      const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                      return (
                        <g key={terminal.id} transform={terminalControlTransform(renderPoint.x, renderPoint.y)}>
                          <line
                            className={`terminal-stub ${terminal.type}`}
                            strokeDasharray={terminalStubDashArray}
                            style={{
                              stroke: terminalDisplayColor,
                              strokeWidth: terminalStubStrokeWidth(node, terminal)
                            }}
                            x1={stub.from.x}
                            y1={stub.from.y}
                            x2={stub.to.x}
                            y2={stub.to.y}
                          />
                          <circle
                            className={`terminal-dot ${terminal.type}`}
                            style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                            cx="0"
                            cy="0"
                            r={6}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}
          <rect
            className="group-transform-photo-outline"
            x={bounds.left}
            y={bounds.top}
            width={Math.max(1, bounds.right - bounds.left)}
            height={Math.max(1, bounds.bottom - bounds.top)}
          />
        </g>
      </g>
    );
  };
}

export function createRenderSingleTransformRotateOriginGhost(__appScope: Record<string, any>) {
  return () => {
  const { MemoDeviceGlyph, colorDisplayMode, colorPalette, g, isBusNode, isGroupTransformDrag, isStaticNode, nodeById, nodeGeometryTransform, rect, renderNodePreviewImageContent, resolveNodeStateVisual, transformDrag, visibleNodeIdSet } = __appScope;
    if (!transformDrag || isGroupTransformDrag(transformDrag) || transformDrag.kind !== "rotate" || !transformDrag.previewPoint) {
      return null;
    }
    const node = nodeById.get(transformDrag.nodeId);
    if (!node || !visibleNodeIdSet.has(node.id)) {
      return null;
    }
    const ghostNode = {
      ...node,
      position: { ...transformDrag.originalNode.position },
      rotation: transformDrag.originalNode.rotation,
      scale: transformDrag.originalNode.scale,
      scaleX: transformDrag.originalNode.scaleX,
      scaleY: transformDrag.originalNode.scaleY
    };
    return (
      <g
        className={`node-rotate-origin-ghost ${isBusNode(ghostNode) ? "bus-node" : ""}`}
        transform={`translate(${ghostNode.position.x} ${ghostNode.position.y})`}
      >
        <g className="node-geometry" transform={nodeGeometryTransform(ghostNode)}>
          <rect
            x={-ghostNode.size.width / 2}
            y={-ghostNode.size.height / 2}
            width={ghostNode.size.width}
            height={ghostNode.size.height}
            rx="8"
            className={`node-hitbox ${isBusNode(ghostNode) ? "bus-hitbox" : ""} ${isStaticNode(ghostNode) ? "static-hitbox" : ""}`}
          />
          <MemoDeviceGlyph node={ghostNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(ghostNode)} />
          <MemoDeviceGlyph node={ghostNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(ghostNode)} />
        </g>
        {renderNodePreviewImageContent(ghostNode, `rotate-origin-ghost-preview-clip-${ghostNode.id}`)}
      </g>
    );
  };
}

export function createRenderTransformRotationTrajectory(__appScope: Record<string, any>) {
  return () => {
  const { circle, g, isGroupTransformDrag, line, path, rotatePointAround, rotationDeltaBetweenTransformPoints, rotationTrajectoryArcPath, transformDrag } = __appScope;
    if (!transformDrag || transformDrag.kind !== "rotate" || !transformDrag.previewPoint) {
      return null;
    }
    const center = isGroupTransformDrag(transformDrag)
      ? transformDrag.center
      : transformDrag.originalNode.position;
    const delta = rotationDeltaBetweenTransformPoints(center, transformDrag.startPoint, transformDrag.previewPoint, false);
    const startPoint = transformDrag.rotationStartPoint ?? transformDrag.startPoint;
    const arcPath = rotationTrajectoryArcPath(center, startPoint, delta);
    const endPoint = rotatePointAround(startPoint, center, delta);
    return (
      <g className="rotation-trajectory">
        <line className="rotation-start-ray" x1={center.x} y1={center.y} x2={startPoint.x} y2={startPoint.y} />
        <line className="rotation-current-ray" x1={center.x} y1={center.y} x2={endPoint.x} y2={endPoint.y} />
        {arcPath && <path className="rotation-trajectory-arc" d={arcPath} />}
        <circle className="rotation-center-dot" cx={center.x} cy={center.y} r="4" />
        <circle className="rotation-current-dot" cx={endPoint.x} cy={endPoint.y} r="5" />
      </g>
    );
  };
}

export function createRenderBoundaryBusInternalConnector(__appScope: Record<string, any>) {
  return (node: ModelNode | undefined, point: Point | undefined, key: string) => {
  const { boundaryBusInternalConnectorSegment, boundaryBusInternalConnectorStrokeWidth, line, svgStrokeDashArray } = __appScope;
    if (!node || !point) {
      return null;
    }
    const segment = boundaryBusInternalConnectorSegment(node, point);
    if (!segment) {
      return null;
    }
    return (
      <line
        key={key}
        className="boundary-bus-internal-connector"
        x1={segment.from.x}
        y1={segment.from.y}
        x2={segment.to.x}
        y2={segment.to.y}
        strokeWidth={boundaryBusInternalConnectorStrokeWidth(node, segment)}
        strokeDasharray={svgStrokeDashArray(node.params.strokeStyle)}
      />
    );
  };
}

export function createCollectCurrentModelVoltageColorKeys(__appScope: Record<string, any>) {
  return (sourceNodes?: ModelNode[]) => {
  const { nodes, voltageColorKeyForTerminal } = __appScope;
    if (sourceNodes === undefined) {
      sourceNodes = nodes;
    }
    const keys = new Set<string>();
    for (const node of sourceNodes) {
      node.terminals.forEach((terminal, terminalIndex) => {
        const key = voltageColorKeyForTerminal(node, terminal, terminalIndex);
        if (key) {
          keys.add(key);
        }
      });
    }
    return keys;
  };
}

export function createNearestVoltageColor(__appScope: Record<string, any>) {
  return (missingKey: string, voltageColors: Record<string, string>) => {
  const { DEFAULT_COLOR_PALETTE } = __appScope;
    const [targetType, ...targetVoltageParts] = missingKey.split(":");
    const targetVoltage = Number(targetVoltageParts.join(":"));
    const candidates = Object.entries(voltageColors)
      .filter(([key, color]) => key.startsWith(`${targetType}:`) && color)
      .map(([key, color]) => ({
        key,
        color,
        voltage: Number(key.slice(targetType.length + 1))
      }))
      .filter((entry) => Number.isFinite(entry.voltage));
    if (Number.isFinite(targetVoltage) && candidates.length > 0) {
      return candidates
        .sort((left, right) => Math.abs(left.voltage - targetVoltage) - Math.abs(right.voltage - targetVoltage) || left.key.localeCompare(right.key))[0]
        .color;
    }
    return DEFAULT_COLOR_PALETTE.voltage[missingKey] ?? DEFAULT_COLOR_PALETTE.voltage[`${targetType}:0`] ?? "#64748b";
  };
}

export function createFillMissingVoltageColorRows(__appScope: Record<string, any>) {
  return (palette: ColorPalette, sourceKeys?: Set<string>) => {
  const { collectCurrentModelVoltageColorKeys, nearestVoltageColor } = __appScope;
    if (sourceKeys === undefined) {
      sourceKeys = collectCurrentModelVoltageColorKeys();
    }
    const missingKeys = Array.from(sourceKeys).filter((key) => !palette.voltage[key]);
    if (missingKeys.length === 0) {
      return { palette, missingKeys };
    }
    const voltage = { ...palette.voltage };
    for (const key of missingKeys) {
      voltage[key] = nearestVoltageColor(key, voltage);
    }
    return {
      palette: { ...palette, voltage },
      missingKeys
    };
  };
}

export function createToggleColorDisplayMode(__appScope: Record<string, any>) {
  return (nextMode?: ColorDisplayMode) => {
  const { setColorDisplayMode } = __appScope;
    setColorDisplayMode((current) => nextMode ?? (current === "energy" ? "voltage" : "energy"));
  };
}

export function createOpenColorPaletteDialog(__appScope: Record<string, any>) {
  return () => {
  const { collectCurrentModelVoltageColorKeys, colorDisplayMode, colorPalette, fillMissingVoltageColorRows, normalizeColorPalette, requireEditMode, setColorPalette, setColorPaletteDialogOpen, setColorPaletteDraft, setColorPaletteTab } = __appScope;
    if (!requireEditMode("设置配色")) {
      return;
    }
    const filled = fillMissingVoltageColorRows(normalizeColorPalette(colorPalette), collectCurrentModelVoltageColorKeys());
    setColorPaletteDraft(filled.palette);
    setColorPaletteTab(colorDisplayMode);
    setColorPaletteDialogOpen(true);
    if (filled.missingKeys.length > 0) {
      setColorPalette(filled.palette);
      window.setTimeout(() => {
        window.alert(`当前模型存在 ${filled.missingKeys.length} 个未配置颜色的电压等级，已按相近电压等级自动赋默认颜色：${filled.missingKeys.join("，")}`);
      }, 0);
    }
  };
}

export function createSaveColorPalette(__appScope: Record<string, any>) {
  return () => {
  const { colorPaletteDraft, colorPaletteTab, normalizeColorPalette, requireEditMode, setColorDisplayMode, setColorPalette, setColorPaletteDialogOpen } = __appScope;
    if (!requireEditMode("保存配色")) {
      return;
    }
    const normalized = normalizeColorPalette(colorPaletteDraft);
    setColorPalette(normalized);
    setColorDisplayMode(colorPaletteTab);
    setColorPaletteDialogOpen(false);
  };
}

export function createResetEnergyColors(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_COLOR_PALETTE, setColorPaletteDraft } = __appScope;
    setColorPaletteDraft((current) => ({
      ...current,
      energy: { ...DEFAULT_COLOR_PALETTE.energy }
    }));
  };
}

export function createResetVoltageColors(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_COLOR_PALETTE, setColorPaletteDraft } = __appScope;
    setColorPaletteDraft((current) => ({
      ...current,
      voltage: { ...DEFAULT_COLOR_PALETTE.voltage }
    }));
  };
}

export function createUpdateEnergyColor(__appScope: Record<string, any>) {
  return (type: TerminalType, color: string) => {
  const { setColorPaletteDraft } = __appScope;
    setColorPaletteDraft((current) => ({
      ...current,
      energy: {
        ...current.energy,
        [type]: color
      }
    }));
  };
}

export function createSetVoltageColorRows(__appScope: Record<string, any>) {
  return (rows: Array<{ type: "ac" | "dc"; voltage: string; color: string }>) => {
  const { colorPaletteDraft, normalizeVoltageBaseInput, setColorPaletteDraft } = __appScope;
    const fallbackNumericEntries = Object.fromEntries(
      Object.entries(colorPaletteDraft.voltage).filter(([key]) => !key.startsWith("ac:") && !key.startsWith("dc:"))
    );
    const typedEntries = rows.reduce<Record<string, string>>((result, row) => {
      const voltage = normalizeVoltageBaseInput(row.voltage) || row.voltage.trim() || "0";
      result[`${row.type}:${voltage}`] = row.color;
      return result;
    }, {});
    setColorPaletteDraft((current) => ({
      ...current,
      voltage: {
        ...fallbackNumericEntries,
        ...typedEntries
      }
    }));
  };
}

export function createUpdateVoltageColorRow(__appScope: Record<string, any>) {
  return (rowKey: string, patch: Partial<{ type: "ac" | "dc"; voltage: string; color: string }>) => {
  const { setVoltageColorRows, voltageColorRows } = __appScope;
    const rows = voltageColorRows.map((row) => row.key === rowKey ? { ...row, ...patch } : row);
    setVoltageColorRows(rows);
  };
}

export function createDeleteVoltageColorRow(__appScope: Record<string, any>) {
  return (rowKey: string) => {
  const { setVoltageColorRows, voltageColorRows } = __appScope;
    setVoltageColorRows(voltageColorRows.filter((row) => row.key !== rowKey));
  };
}

export function createAddVoltageColorRow(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_COLOR_PALETTE, setVoltageColorRows, voltageColorRows } = __appScope;
    const existingKeys = new Set(voltageColorRows.map((row) => row.key));
    const baseVoltages = ["10", "35", "110", "220", "500", "750", "800"];
    const voltage = baseVoltages.find((item) => !existingKeys.has(`ac:${item}`)) ?? `${voltageColorRows.length + 1}`;
    setVoltageColorRows([...voltageColorRows, { type: "ac", voltage, color: DEFAULT_COLOR_PALETTE.voltage[`ac:${voltage}`] ?? "#2563eb" }]);
  };
}

export function createResolveNodeStateVisual(__appScope: Record<string, any>) {
  return (node: ModelNode): DeviceStateVisual | null => {
  const { libraryTemplateByKind, resolveDeviceStateVisual } = __appScope;
    const template = libraryTemplateByKind.get(node.kind);
    return template ? resolveDeviceStateVisual(template, node) : null;
  };
}

export function createStatusStatesForNode(__appScope: Record<string, any>) {
  return (node: ModelNode | undefined) => {
  const { getTemplateStateDefinitions, libraryTemplateByKind } = __appScope;
    if (!node) {
      return [];
    }
    const template = libraryTemplateByKind.get(node.kind);
    return template ? getTemplateStateDefinitions(template) : [];
  };
}

export function createNodeKindAllowsResizeTransform(__appScope: Record<string, any>) {
  return (kind: string) => {
  const { defaultAllowsResizeTransformForKind, libraryTemplateByKind, templateAllowsResizeTransform } = __appScope;
    const template = libraryTemplateByKind.get(kind);
    return template ? templateAllowsResizeTransform(template) : defaultAllowsResizeTransformForKind(kind);
  };
}

export function createClearLibraryFlyoutCloseTimer(__appScope: Record<string, any>) {
  return () => {
  const { libraryFlyoutCloseTimerRef } = __appScope;
    if (libraryFlyoutCloseTimerRef.current !== null) {
      window.clearTimeout(libraryFlyoutCloseTimerRef.current);
      libraryFlyoutCloseTimerRef.current = null;
    }
  };
}

export function createHideLibraryFlyout(__appScope: Record<string, any>) {
  return () => {
  const { clearLibraryFlyoutCloseTimer, libraryFlyoutPositionsRef, setHoveredAttributeLibrary, setHoveredAttributeLibraryComponentType, setLibraryFlyoutPositions } = __appScope;
    clearLibraryFlyoutCloseTimer();
    setHoveredAttributeLibrary("");
    setHoveredAttributeLibraryComponentType("");
    if (Object.keys(libraryFlyoutPositionsRef.current).length > 0) {
      setLibraryFlyoutPositions({});
    }
  };
}

export function createScheduleLibraryFlyoutClose(__appScope: Record<string, any>) {
  return (group: AttributeLibrary, componentTypeKey?: string) => {
  const { clearLibraryFlyoutCloseTimer, libraryComponentListRefKey, libraryFlyoutCloseTimerRef, setHoveredAttributeLibrary, setHoveredAttributeLibraryComponentType, setLibraryFlyoutPositions } = __appScope;
    clearLibraryFlyoutCloseTimer();
    libraryFlyoutCloseTimerRef.current = window.setTimeout(() => {
      setHoveredAttributeLibrary((current) => current === group ? "" : current);
      setHoveredAttributeLibraryComponentType((current) => componentTypeKey ? current === componentTypeKey ? "" : current : "");
      setLibraryFlyoutPositions((current) => {
        if (!componentTypeKey) {
          return Object.keys(current).length > 0 ? {} : current;
        }
        const key = libraryComponentListRefKey("flyout", componentTypeKey);
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      });
      libraryFlyoutCloseTimerRef.current = null;
    }, 120);
  };
}

export function createLibraryFlyoutStyle(__appScope: Record<string, any>) {
  return (key: string) => {
  const { libraryFlyoutPositions } = __appScope;
    const position = libraryFlyoutPositions[key];
    return {
      "--library-flyout-top": `${position?.top ?? 0}px`,
      "--library-flyout-left": `${position?.left ?? 0}px`,
      visibility: position ? "visible" : "hidden"
    } as CSSProperties;
  };
}

export function createFitLibraryFlyoutsToVisibleArea(__appScope: Record<string, any>) {
  return () => {
  const { libraryComponentListRefs, libraryComponentTypeHeaderRefs, libraryFlyoutPositionsRef, libraryScrollRef, setLibraryFlyoutPositions } = __appScope;
    const scrollElement = libraryScrollRef.current;
    if (!scrollElement) {
      return;
    }
    const margin = 8;
    const scrollRect = scrollElement.getBoundingClientRect();
    const minTop = scrollRect.top + margin;
    const maxBottom = scrollRect.bottom - margin;
    const viewportRight = window.innerWidth || document.documentElement.clientWidth || scrollRect.right;
    const maxRight = viewportRight - margin;
    const gap = 8;
    const nextPositions: Record<string, { top: number; left: number }> = {};
    libraryComponentListRefs.current.forEach((element, key) => {
      if (!key.startsWith("flyout:")) {
        return;
      }
      const headerElement = libraryComponentTypeHeaderRefs.current.get(key);
      if (!headerElement) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const headerRect = headerElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const desiredLeft = headerRect.right + gap;
      let left = Math.min(desiredLeft, Math.max(margin, maxRight - width));
      left = Math.max(margin, left);
      const maxTop = Math.max(minTop, maxBottom - height);
      let top = Math.min(Math.max(headerRect.top, minTop), maxTop);
      const horizontallyOverlapsHeader =
        left < headerRect.right + gap &&
        left + width > headerRect.left - gap;
      if (horizontallyOverlapsHeader) {
        const belowTop = headerRect.bottom + gap;
        const aboveTop = headerRect.top - gap - height;
        const belowOverflow = Math.max(0, belowTop + height - maxBottom) + Math.max(0, minTop - belowTop);
        const aboveOverflow = Math.max(0, aboveTop + height - maxBottom) + Math.max(0, minTop - aboveTop);
        top = belowOverflow <= aboveOverflow ? belowTop : aboveTop;
        top = Math.min(Math.max(top, minTop), maxTop);
      }
      nextPositions[key] = {
        top: Math.round(top),
        left: Math.round(left)
      };
    });
    const currentPositions = libraryFlyoutPositionsRef.current;
    const currentKeys = Object.keys(currentPositions);
    const nextKeys = Object.keys(nextPositions);
    const unchanged =
      currentKeys.length === nextKeys.length &&
      nextKeys.every((key) => {
        const currentPosition = currentPositions[key];
        const nextPosition = nextPositions[key];
        return currentPosition?.top === nextPosition.top && currentPosition?.left === nextPosition.left;
      });
    if (!unchanged) {
      setLibraryFlyoutPositions(nextPositions);
    }
  };
}

export function createToggleAttributeLibrary(__appScope: Record<string, any>) {
  return (group: AttributeLibrary) => {
  const { componentLibraryDisplayMode, setCollapsedExpandedModeAttributeLibraries, setExpandedAttributeLibraries } = __appScope;
    if (componentLibraryDisplayMode === "expanded") {
      setCollapsedExpandedModeAttributeLibraries((current) =>
        current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
      );
      return;
    }
    setExpandedAttributeLibraries((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
    );
  };
}

export function createToggleAttributeLibraryComponentType(__appScope: Record<string, any>) {
  return (attributeLibraryName: string, sectionName: string) => {
  const { attributeLibraryComponentTypeKey, componentLibraryDisplayMode, setCollapsedExpandedModeComponentTypes, setExpandedAttributeLibraryComponentTypes } = __appScope;
    const key = attributeLibraryComponentTypeKey(attributeLibraryName, sectionName);
    if (componentLibraryDisplayMode === "expanded") {
      setCollapsedExpandedModeComponentTypes((current) =>
        current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      );
      return;
    }
    setExpandedAttributeLibraryComponentTypes((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };
}

export function createResolveConfiguredBackgroundLayerIds(__appScope: Record<string, any>) {
  return (projectId?: string, configuredLayerIds?: string[]) => {
  const { defaultBackgroundLayerIdsForProject, normalizeProjectLayers, projectById } = __appScope;
    if (!projectId) {
      return [];
    }
    const backgroundProject = projectById.get(projectId);
    if (!backgroundProject) {
      return configuredLayerIds ?? [];
    }
    const validLayerIds = new Set((normalizeProjectLayers(backgroundProject.project).layers ?? []).map((layer) => layer.id));
    if (!configuredLayerIds) {
      return defaultBackgroundLayerIdsForProject(backgroundProject.project);
    }
    return configuredLayerIds.filter((layerId) => validLayerIds.has(layerId));
  };
}

export function createToggleBackgroundLayer(__appScope: Record<string, any>) {
  return (layerId: string) => {
  const { pushUndoSnapshot, requireEditMode, setBackgroundLayerIds } = __appScope;
    if (!requireEditMode("修改背景页面图层")) {
      return;
    }
    pushUndoSnapshot();
    setBackgroundLayerIds((current) => current.includes(layerId)
      ? current.filter((item) => item !== layerId)
      : [...current, layerId]
    );
  };
}

export function createElementTreeItemChildren(__appScope: Record<string, any>) {
  return (item: ElementTreeItem): ElementTreeChildItem[] => {
  const { buildContainerDeviceParameterViews, containerRelationNameKey, libraryTemplateByKind, visibleNodeById } = __appScope;
    if (item.kind !== "node") {
      return [];
    }
    const node = visibleNodeById.get(item.id);
    if (!node) {
      return item.children ?? [];
    }
    return buildContainerDeviceParameterViews(node, libraryTemplateByKind.get(node.kind))
      .filter((view) => view.kind === "associated")
      .map<ElementTreeChildItem>((view) => ({
        id: `${node.id}:${view.id}`,
        label: view.label,
        componentType: view.componentType ?? "",
        idx: view.rows.find((row) => row.key === "idx")?.value ?? "",
        name: view.rows.find((row) => row.key === "name")?.value ?? "",
        nameKey: view.relationKeys?.[0] ? containerRelationNameKey(view.relationKeys[0]) : "",
        relationKeys: view.relationKeys ?? [],
        terminalLabels: view.terminalLabels ?? view.rows.find((row) => row.key === "terminals")?.value ?? ""
      }));
  };
}

export function createUpdateElementTreeDraft(__appScope: Record<string, any>) {
  return (key: string, value: string) => {
  const { setElementTreeEditDrafts } = __appScope;
    setElementTreeEditDrafts((current) =>
      current[key] === value ? current : { ...current, [key]: value }
    );
  };
}

export function createClearElementTreeDraft(__appScope: Record<string, any>) {
  return (key: string) => {
  const { setElementTreeEditDrafts } = __appScope;
    setElementTreeEditDrafts((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
}

export function createElementTreeCommittedDraftValue(__appScope: Record<string, any>) {
  return (key: string): string | undefined => {
  const { nodeById } = __appScope;
    if (!key.startsWith("node:")) {
      return undefined;
    }
    const childMarker = ":child:";
    const childMarkerIndex = key.indexOf(childMarker);
    if (childMarkerIndex >= 0) {
      const nodeId = key.slice("node:".length, childMarkerIndex);
      const tail = key.slice(childMarkerIndex + childMarker.length);
      const fieldSeparatorIndex = tail.lastIndexOf(":");
      if (fieldSeparatorIndex < 0) {
        return undefined;
      }
      const paramKey = tail.slice(0, fieldSeparatorIndex);
      return nodeById.get(nodeId)?.params[paramKey] ?? "";
    }
    const fieldSeparatorIndex = key.lastIndexOf(":");
    if (fieldSeparatorIndex <= "node:".length) {
      return undefined;
    }
    const nodeId = key.slice("node:".length, fieldSeparatorIndex);
    const field = key.slice(fieldSeparatorIndex + 1);
    const node = nodeById.get(nodeId);
    if (!node) {
      return undefined;
    }
    return field === "name" ? node.name : node.params.idx ?? "";
  };
}

export function createCommitElementTreeInputOnEnter(__appScope: Record<string, any>) {
  return (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key !== "Enter") {
      return;
    }
    if (event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    event.currentTarget.blur();
  };
}

export function createMarkBusTerminalSyncDirty(__appScope: Record<string, any>) {
  return (nodeIds: Iterable<string | undefined>) => {
  const { pendingBusTerminalSyncNodeIdsRef } = __appScope;
    const next = new Set(pendingBusTerminalSyncNodeIdsRef.current);
    for (const nodeId of nodeIds) {
      if (nodeId) {
        next.add(nodeId);
      }
    }
    pendingBusTerminalSyncNodeIdsRef.current = next;
  };
}

export function createBusNodeIdsFromEdges(__appScope: Record<string, any>) {
  return (edgeItems: Iterable<Edge | undefined>) => {
  const { busNodeIdSet } = __appScope;
    const ids = new Set<string>();
    for (const edge of edgeItems) {
      if (!edge) {
        continue;
      }
      if (busNodeIdSet.has(edge.sourceId)) {
        ids.add(edge.sourceId);
      }
      if (busNodeIdSet.has(edge.targetId)) {
        ids.add(edge.targetId);
      }
    }
    return ids;
  };
}

export function createMarkBusTerminalSyncDirtyForEdges(__appScope: Record<string, any>) {
  return (...edgeCollections: Array<Iterable<Edge | undefined>>) => {
  const { busNodeIdsFromEdges, markBusTerminalSyncDirty } = __appScope;
    const ids = new Set<string>();
    for (const edgeCollection of edgeCollections) {
      for (const busId of busNodeIdsFromEdges(edgeCollection)) {
        ids.add(busId);
      }
    }
    markBusTerminalSyncDirty(ids);
  };
}

export function createBusTerminalSyncNodeIdsForGraphPatch(__appScope: Record<string, any>) {
  return (
    movedNodeIds: Iterable<string>,
    previousCandidateEdges: Edge[],
    edgeUpserts: Edge[],
    edgeDeleteIds: string[]
  ) => {
  const { busNodeIdsFromEdges } = __appScope;
    const ids = new Set<string>();
    // Moving a bus or a device only changes endpoint coordinates. Bus terminal
    // counts/ids need resync only when an edge is added, deleted, or reattached.
    void movedNodeIds;
    const previousEdgeById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    const edgeAttachmentChanged = (previousEdge: Edge | undefined, nextEdge: Edge) =>
      !previousEdge ||
      previousEdge.sourceId !== nextEdge.sourceId ||
      previousEdge.targetId !== nextEdge.targetId ||
      previousEdge.sourceTerminalId !== nextEdge.sourceTerminalId ||
      previousEdge.targetTerminalId !== nextEdge.targetTerminalId;
    for (const nextEdge of edgeUpserts) {
      const previousEdge = previousEdgeById.get(nextEdge.id);
      if (!edgeAttachmentChanged(previousEdge, nextEdge)) {
        continue;
      }
      for (const busId of busNodeIdsFromEdges([previousEdge, nextEdge])) {
        ids.add(busId);
      }
    }
    if (edgeDeleteIds.length > 0) {
      const deleted = new Set(edgeDeleteIds);
      for (const busId of busNodeIdsFromEdges(previousCandidateEdges.filter((edge) => deleted.has(edge.id)))) {
        ids.add(busId);
      }
    }
    return ids;
  };
}

export function createSynchronizePendingBusTerminalsWithGraphStore(__appScope: Record<string, any>) {
  return (
    store: GraphStore,
    affectedBusIds: ReadonlySet<string>
  ) => {
  const { isBusNode, queryGraphStoreNodeSpatialIndex, synchronizeBusTerminalsWithEdges } = __appScope;
    if (affectedBusIds.size === 0) {
      return null;
    }
    const scopedNodeIds = new Set<string>();
    const scopedEdgeIds = new Set<string>();
    const scopePadding = 16;
    for (const busId of affectedBusIds) {
      const bus = store.nodeMap.get(busId);
      if (!bus || !isBusNode(bus)) {
        continue;
      }
      scopedNodeIds.add(bus.id);
      const busBounds = store.nodeSpatialIndex.nodeBoundsById.get(bus.id);
      if (busBounds) {
        for (const node of queryGraphStoreNodeSpatialIndex(store, {
          left: busBounds.left - scopePadding,
          right: busBounds.right + scopePadding,
          top: busBounds.top - scopePadding,
          bottom: busBounds.bottom + scopePadding
        })) {
          scopedNodeIds.add(node.id);
        }
      }
      for (const edge of store.edgesByNodeId.get(busId) ?? []) {
        scopedEdgeIds.add(edge.id);
        scopedNodeIds.add(edge.sourceId);
        scopedNodeIds.add(edge.targetId);
      }
    }
    if (scopedNodeIds.size === 0) {
      return null;
    }
    const nodeOrderIndex = (node: ModelNode) => store.nodeIndexById.get(node.id) ?? Number.MAX_SAFE_INTEGER;
    const edgeOrderIndex = (edge: Edge) => store.edgeIndexById.get(edge.id) ?? Number.MAX_SAFE_INTEGER;
    const scopedNodes = Array.from(scopedNodeIds)
      .flatMap((nodeId) => {
        const node = store.nodeMap.get(nodeId);
        return node ? [node] : [];
      })
      .sort((first, second) => nodeOrderIndex(first) - nodeOrderIndex(second));
    const scopedEdges = Array.from(scopedEdgeIds)
      .flatMap((edgeId) => {
        const edge = store.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      })
      .sort((first, second) => edgeOrderIndex(first) - edgeOrderIndex(second));
    const synchronized = synchronizeBusTerminalsWithEdges(scopedNodes, scopedEdges, affectedBusIds);
    return {
      scopedNodes,
      scopedEdges,
      synchronized,
      nodeUpdates: synchronized.nodes.filter((node, index) => node !== scopedNodes[index]),
      edgeUpserts: synchronized.edges.filter((edge, index) => edge !== scopedEdges[index])
    };
  };
}

export function createApplyCanvasPanningVisualOffset(__appScope: Record<string, any>) {
  return (nextOffset: Point) => {
  const { canvasBaseDisplayOffsetX, canvasBaseDisplayOffsetY, canvasDisplayHeight, canvasDisplayWidth, canvasResizeAnchoredDisplayOffset, canvasResizeDrag, canvasResizeHotzonesRef, svgRef } = __appScope;
    const left = canvasResizeAnchoredDisplayOffset(
      Math.round(canvasBaseDisplayOffsetX + nextOffset.x),
      canvasResizeDrag,
      "x",
      canvasDisplayWidth
    );
    const top = canvasResizeAnchoredDisplayOffset(
      Math.round(canvasBaseDisplayOffsetY + nextOffset.y),
      canvasResizeDrag,
      "y",
      canvasDisplayHeight
    );
    const svg = svgRef.current;
    if (svg) {
      svg.style.left = `${left}px`;
      svg.style.top = `${top}px`;
    }
    const hotzones = canvasResizeHotzonesRef.current;
    if (hotzones) {
      hotzones.style.left = `${left}px`;
      hotzones.style.top = `${top}px`;
    }
  };
}

export function createCancelCanvasBoundsScrollSyncPendingRelease(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsScrollSyncPendingFrameRef } = __appScope;
    if (canvasBoundsScrollSyncPendingFrameRef.current !== null) {
      window.cancelAnimationFrame(canvasBoundsScrollSyncPendingFrameRef.current);
      canvasBoundsScrollSyncPendingFrameRef.current = null;
    }
  };
}

export function createClearCanvasBoundsScrollSyncPending(__appScope: Record<string, any>) {
  return () => {
  const { cancelCanvasBoundsScrollSyncPendingRelease, canvasBoundsScrollSyncPendingRef, pendingCanvasBoundsScrollAnchorRef } = __appScope;
    cancelCanvasBoundsScrollSyncPendingRelease();
    canvasBoundsScrollSyncPendingRef.current = false;
    pendingCanvasBoundsScrollAnchorRef.current = null;
  };
}

export function createReleaseCanvasBoundsScrollSyncPending(__appScope: Record<string, any>) {
  return () => {
  const { cancelCanvasBoundsScrollSyncPendingRelease, canvasBoundsScrollSyncPendingFrameRef, canvasBoundsScrollSyncPendingRef, pendingCanvasBoundsScrollAnchorRef } = __appScope;
    cancelCanvasBoundsScrollSyncPendingRelease();
    canvasBoundsScrollSyncPendingFrameRef.current = window.requestAnimationFrame(() => {
      canvasBoundsScrollSyncPendingFrameRef.current = window.requestAnimationFrame(() => {
        canvasBoundsScrollSyncPendingFrameRef.current = null;
        canvasBoundsScrollSyncPendingRef.current = false;
        pendingCanvasBoundsScrollAnchorRef.current = null;
      });
    });
  };
}

export function createMarkCanvasBoundsScrollSyncPending(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsScrollSyncPendingRef, canvasFrameRef, pendingCanvasBoundsScrollAnchorRef, releaseCanvasBoundsScrollSyncPending } = __appScope;
    const frame = canvasFrameRef.current;
    if (!pendingCanvasBoundsScrollAnchorRef.current) {
      const hotzones = frame?.querySelector<HTMLElement>(".canvas-resize-hotzones");
      const visualRect = hotzones
        ? (() => {
            const rect = hotzones.getBoundingClientRect();
            return {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            };
          })()
        : undefined;
      pendingCanvasBoundsScrollAnchorRef.current = frame
        ? { left: frame.scrollLeft, top: frame.scrollTop, visualRect }
        : null;
    }
    canvasBoundsScrollSyncPendingRef.current = true;
    releaseCanvasBoundsScrollSyncPending();
  };
}

export function createCanvasBoundsForGraphContent(__appScope: Record<string, any>) {
  return (
    baseBounds: CanvasBounds,
    contentNodes?: ModelNode[],
    contentEdges?: Edge[],
    contentRoutes?: RoutedEdge[],
    padding?: number
  ): CanvasBounds => {
  const { MOVE_BOUNDARY_GUARD, calculateModelContentSize, clampCanvasBounds, edges, nodes, routedEdges } = __appScope;
    if (contentNodes === undefined) {
      contentNodes = nodes;
    }
    if (contentEdges === undefined) {
      contentEdges = edges;
    }
    if (contentRoutes === undefined) {
      contentRoutes = routedEdges;
    }
    if (padding === undefined) {
      padding = MOVE_BOUNDARY_GUARD;
    }
    const contentSize = calculateModelContentSize(contentNodes, contentEdges, contentRoutes, padding);
    return clampCanvasBounds({
      width: Math.max(baseBounds.width, contentSize.width),
      height: Math.max(baseBounds.height, contentSize.height)
    });
  };
}

export function createApplyCanvasBounds(__appScope: Record<string, any>) {
  return (
    bounds: CanvasBounds,
    originShift: Point = { x: 0, y: 0 },
    options: { preserveScrollAnchor?: boolean } = {}
  ) => {
  const { canvasBoundsChangeIsMeaningful, canvasBoundsRef, clampCanvasBounds, markCanvasBoundsScrollSyncPending, setCanvasHeight, setCanvasSizeDraft, setCanvasWidth, setViewBox, viewBoxAfterCanvasBoundsChange } = __appScope;
    const currentBoundsForApply = canvasBoundsRef.current;
    const nextBounds = clampCanvasBounds(bounds);
    if (!canvasBoundsChangeIsMeaningful(currentBoundsForApply, nextBounds, originShift)) {
      return false;
    }
    if (options.preserveScrollAnchor !== false) {
      markCanvasBoundsScrollSyncPending();
    }
    canvasBoundsRef.current = nextBounds;
    setCanvasWidth(nextBounds.width);
    setCanvasHeight(nextBounds.height);
    setCanvasSizeDraft({ width: String(nextBounds.width), height: String(nextBounds.height) });
    setViewBox((current) => {
      return viewBoxAfterCanvasBoundsChange(current, nextBounds, originShift, currentBoundsForApply);
    });
    return true;
  };
}

export function createRejectAutoCanvasExpansionForContent(__appScope: Record<string, any>) {
  return (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = [],
    bounds?: CanvasBounds
  ) => {
  const { allowAutoExpandCanvas, autoCanvasExpansionBlockedMessage, canvasBounds, graphContentFitsFixedCanvasBounds, writeOperationLog } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    if (allowAutoExpandCanvas || graphContentFitsFixedCanvasBounds(contentNodes, contentEdges, contentRoutes, bounds)) {
      return false;
    }
    writeOperationLog(autoCanvasExpansionBlockedMessage);
    return true;
  };
}

export function createCanvasBoundsForAutoExpandedGraphContent(__appScope: Record<string, any>) {
  return (
    baseBounds: CanvasBounds,
    contentNodes?: ModelNode[],
    contentEdges?: Edge[],
    contentRoutes?: RoutedEdge[],
    padding?: number
  ): CanvasBounds => {
  const { CANVAS_AUTO_EXPAND_PADDING, allowAutoExpandCanvas, canvasBoundsForGraphContent, edges, nodes, routedEdges } = __appScope;
    if (contentNodes === undefined) {
      contentNodes = nodes;
    }
    if (contentEdges === undefined) {
      contentEdges = edges;
    }
    if (contentRoutes === undefined) {
      contentRoutes = routedEdges;
    }
    if (padding === undefined) {
      padding = CANVAS_AUTO_EXPAND_PADDING;
    }
    if (!allowAutoExpandCanvas) {
      return baseBounds;
    }
    return canvasBoundsForGraphContent(baseBounds, contentNodes, contentEdges, contentRoutes, padding);
  };
}

export function createTranslateStoredEdgeGeometryBy(__appScope: Record<string, any>) {
  return (edge: Edge, shift: Point): Edge => {
  const { hasCanvasOriginShift, translatePointBy } = __appScope;
    if (!hasCanvasOriginShift(shift)) {
      return edge;
    }
    let changed = false;
    const nextSourcePoint = edge.sourcePoint ? translatePointBy(edge.sourcePoint, shift) : undefined;
    const nextTargetPoint = edge.targetPoint ? translatePointBy(edge.targetPoint, shift) : undefined;
    const nextManualPoints = edge.manualPoints?.length
      ? edge.manualPoints.map((point) => translatePointBy(point, shift))
      : edge.manualPoints;
    const nextRoutePoints = edge.routePoints?.length
      ? edge.routePoints.map((point) => translatePointBy(point, shift))
      : edge.routePoints;
    changed ||= Boolean(edge.sourcePoint);
    changed ||= Boolean(edge.targetPoint);
    changed ||= Boolean(edge.manualPoints?.length);
    changed ||= Boolean(edge.routePoints?.length);
    return changed
      ? {
          ...edge,
          sourcePoint: nextSourcePoint,
          targetPoint: nextTargetPoint,
          manualPoints: nextManualPoints,
          routePoints: nextRoutePoints
        }
      : edge;
  };
}

export function createShiftCachedRoutesForCanvasOrigin(__appScope: Record<string, any>) {
  return (originShift: Point) => {
  const { cachedRouteStoreRef, cachedRoutedEdgesRef, hasCanvasOriginShift, routeStoreSetRoutes, translateRouteBy } = __appScope;
    if (!hasCanvasOriginShift(originShift) || cachedRoutedEdgesRef.current.length === 0) {
      return;
    }
    const shiftedRoutes = cachedRoutedEdgesRef.current.map((route) => translateRouteBy(route, originShift));
    cachedRoutedEdgesRef.current = shiftedRoutes;
    cachedRouteStoreRef.current = routeStoreSetRoutes(cachedRouteStoreRef.current, shiftedRoutes);
  };
}

export function createLeftTopCanvasOriginShiftForContent(__appScope: Record<string, any>) {
  return (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = [],
    padding = 0
  ): Point => {
  const { calculateModelGeometryBounds, edgeRoutesForGeometryBounds } = __appScope;
    const geometryBounds = calculateModelGeometryBounds(
      contentNodes,
      [...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)],
      padding
    );
    const positiveCeil = (value: number) => Math.ceil(Math.max(0, value));
    return {
      x: geometryBounds && geometryBounds.left < 0 ? positiveCeil(-geometryBounds.left) : 0,
      y: geometryBounds && geometryBounds.top < 0 ? positiveCeil(-geometryBounds.top) : 0
    };
  };
}

export function createMinimumCanvasBoundsForResizeEdge(__appScope: Record<string, any>) {
  return (edge: CanvasResizeEdge): CanvasBounds => {
  const { MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MOVE_BOUNDARY_GUARD, calculateModelGeometryBounds, canvasBounds, canvasResizeMinimumBoundsForGeometry, clampCanvasBounds, edgeRoutesForGeometryBounds, edges, nodes, routedEdges } = __appScope;
    const geometryBounds = calculateModelGeometryBounds(
      nodes,
      [...routedEdges, ...edgeRoutesForGeometryBounds(edges)],
      MOVE_BOUNDARY_GUARD
    );
    return clampCanvasBounds(canvasResizeMinimumBoundsForGeometry(
      edge,
      canvasBounds,
      geometryBounds,
      { width: MIN_CANVAS_WIDTH, height: MIN_CANVAS_HEIGHT }
    ));
  };
}

export function createClampNodePositionToExpandableBounds(__appScope: Record<string, any>) {
  return (node: ModelNode, bounds: CanvasBounds, position = node.position): Point => {
  const { allowAutoExpandCanvas, clampNodePositionToBounds } = __appScope;
    const clamped = clampNodePositionToBounds(node, bounds, position);
    if (!allowAutoExpandCanvas) {
      return clamped;
    }
    return {
      x: position.x < clamped.x ? Math.round(position.x) : clamped.x,
      y: position.y < clamped.y ? Math.round(position.y) : clamped.y
    };
  };
}

export function createClampPointToExpandableBounds(__appScope: Record<string, any>) {
  return (point: Point, bounds: CanvasBounds): Point => {
  const { allowAutoExpandCanvas, clampPointToBounds } = __appScope;
    const clamped = clampPointToBounds(point, bounds);
    if (!allowAutoExpandCanvas) {
      return clamped;
    }
    return {
      x: point.x < clamped.x ? Math.round(point.x) : clamped.x,
      y: point.y < clamped.y ? Math.round(point.y) : clamped.y
    };
  };
}

export function createClampEdgeGeometryToExpandableBounds(__appScope: Record<string, any>) {
  return (edge: Edge, bounds: CanvasBounds): Edge => {
  const { clampPointToExpandableBounds } = __appScope;
    let changed = false;
    const clampOptionalPoint = (point?: Point) => {
      if (!point) {
        return undefined;
      }
      const clamped = clampPointToExpandableBounds(point, bounds);
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
  };
}

export function createCanvasNoScrollOffsetForCanvasResizeAnchor(__appScope: Record<string, any>) {
  return (drag: NonNullable<CanvasResizeState>, nextBounds: CanvasBounds): Point => {
  const { CANVAS_FRAME_INSET, CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE, canvasBoundsRef, canvasDisplayOffset, canvasFrameViewportSize, canvasRenderViewBoxAfterBoundsDraft, canvasResizeEdgeAnchorsStart, canvasScrollScaleFromViewBox, canvasScrollSurfaceSize, clampCanvasNoScrollOffset, viewBoxRef } = __appScope;
    const currentBounds = canvasBoundsRef.current;
    const currentViewBox = viewBoxRef.current;
    const nextViewBox = canvasRenderViewBoxAfterBoundsDraft(currentViewBox, currentBounds, nextBounds);
    const nextScrollScale = canvasScrollScaleFromViewBox(nextViewBox, nextBounds);
    const nextDisplayWidth = Math.max(1, Math.round(nextBounds.width * nextScrollScale.x));
    const nextDisplayHeight = Math.max(1, Math.round(nextBounds.height * nextScrollScale.y));
    const nextHorizontalScrollbarsActive =
      canvasFrameViewportSize.width > 0 &&
      nextDisplayWidth + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.width + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
    const nextVerticalScrollbarsActive =
      canvasFrameViewportSize.height > 0 &&
      nextDisplayHeight + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.height + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
    const nextScrollSurfaceWidth = canvasScrollSurfaceSize(
      nextDisplayWidth,
      canvasFrameViewportSize.width,
      nextHorizontalScrollbarsActive
    );
    const nextScrollSurfaceHeight = canvasScrollSurfaceSize(
      nextDisplayHeight,
      canvasFrameViewportSize.height,
      nextVerticalScrollbarsActive
    );
    const nextBaseDisplayOffsetX = canvasDisplayOffset(
      nextDisplayWidth,
      nextScrollSurfaceWidth,
      canvasFrameViewportSize.width,
      nextHorizontalScrollbarsActive
    );
    const nextBaseDisplayOffsetY = canvasDisplayOffset(
      nextDisplayHeight,
      nextScrollSurfaceHeight,
      canvasFrameViewportSize.height,
      nextVerticalScrollbarsActive
    );
    const desiredLeft = canvasResizeEdgeAnchorsStart(drag.edge, "x")
      ? drag.startDisplayOffsetX + drag.startDisplayWidth - nextDisplayWidth
      : drag.startDisplayOffsetX;
    const desiredTop = canvasResizeEdgeAnchorsStart(drag.edge, "y")
      ? drag.startDisplayOffsetY + drag.startDisplayHeight - nextDisplayHeight
      : drag.startDisplayOffsetY;
    return {
      x: clampCanvasNoScrollOffset(
        desiredLeft - nextBaseDisplayOffsetX,
        nextDisplayWidth,
        canvasFrameViewportSize.width,
        nextBaseDisplayOffsetX,
        nextHorizontalScrollbarsActive
      ),
      y: clampCanvasNoScrollOffset(
        desiredTop - nextBaseDisplayOffsetY,
        nextDisplayHeight,
        canvasFrameViewportSize.height,
        nextBaseDisplayOffsetY,
        nextVerticalScrollbarsActive
      )
    };
  };
}

export function createSetCanvasFrameScrollPosition(__appScope: Record<string, any>) {
  return (frame: HTMLElement, left: number, top: number) => {
  const { canvasFrameProgrammaticScrollRef } = __appScope;
    canvasFrameProgrammaticScrollRef.current = true;
    frame.scrollLeft = left;
    frame.scrollTop = top;
    window.requestAnimationFrame(() => {
      canvasFrameProgrammaticScrollRef.current = false;
    });
  };
}

export function createCenterCanvasFrameScrollPosition(__appScope: Record<string, any>) {
  return (frame: HTMLElement) => {
  const { setCanvasFrameScrollPosition } = __appScope;
    setCanvasFrameScrollPosition(
      frame,
      Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2),
      Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2)
    );
  };
}

export function createSyncCanvasFrameScrollToViewBox(__appScope: Record<string, any>) {
  return (
    targetViewBox?: CanvasViewBox,
    boundsScrollAnchor: CanvasBoundsScrollAnchor | null = null
  ) => {
  const { canvasBoundsRef, canvasBoundsScrollSyncTarget, canvasFrameRef, canvasFrameScrollTargetForViewBox, canvasHorizontalScrollbarsActiveRef, canvasVerticalScrollbarsActiveRef, canvasVisualRectScrollTarget, clampCanvasNoScrollOffsetPoint, left, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, skipNextCanvasScrollSyncRef, top, viewBoxRef } = __appScope;
    if (targetViewBox === undefined) {
      targetViewBox = viewBoxRef.current;
    }
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const maxLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
    const { left: nextLeft, top: nextTop } = canvasFrameScrollTargetForViewBox({
      targetViewBox,
      canvasBounds: canvasBoundsRef.current,
      maxScrollLeft: maxLeft,
      maxScrollTop: maxTop,
      horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current,
      verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current
    });
    const scrollTarget = boundsScrollAnchor
      ? canvasBoundsScrollSyncTarget({
          anchorScrollLeft: boundsScrollAnchor.left,
          anchorScrollTop: boundsScrollAnchor.top,
          targetScrollLeft: nextLeft,
          targetScrollTop: nextTop,
          maxScrollLeft: maxLeft,
          maxScrollTop: maxTop,
          targetViewBox,
          canvasBounds: canvasBoundsRef.current
        })
      : { left: nextLeft, top: nextTop };
    const useHorizontalBoundsAnchor = Boolean(boundsScrollAnchor && targetViewBox.width >= canvasBoundsRef.current.width - 1);
    const useVerticalBoundsAnchor = Boolean(boundsScrollAnchor && targetViewBox.height >= canvasBoundsRef.current.height - 1);
    const hotzones = boundsScrollAnchor?.visualRect
      ? frame.querySelector<HTMLElement>(".canvas-resize-hotzones")
      : null;
    const hotzoneRect = hotzones?.getBoundingClientRect();
    const visualTarget = boundsScrollAnchor?.visualRect && hotzoneRect
      ? canvasVisualRectScrollTarget({
          desiredRect: boundsScrollAnchor.visualRect,
          currentRect: {
            left: hotzoneRect.left,
            top: hotzoneRect.top,
            width: hotzoneRect.width,
            height: hotzoneRect.height
          },
          currentScrollLeft: frame.scrollLeft,
          currentScrollTop: frame.scrollTop,
          maxScrollLeft: maxLeft,
          maxScrollTop: maxTop,
          affectsX: useHorizontalBoundsAnchor,
          affectsY: useVerticalBoundsAnchor
        })
      : null;
    const syncVisualScrollX = Boolean(visualTarget?.affectsX && maxLeft > 1);
    const syncVisualScrollY = Boolean(visualTarget?.affectsY && maxTop > 1);
    const targetLeft = syncVisualScrollX ? visualTarget!.left : scrollTarget.left;
    const targetTop = syncVisualScrollY ? visualTarget!.top : scrollTarget.top;
    if (Math.abs(frame.scrollLeft - targetLeft) > 1 || Math.abs(frame.scrollTop - targetTop) > 1) {
      setCanvasFrameScrollPosition(frame, targetLeft, targetTop);
      if (syncVisualScrollX || syncVisualScrollY) {
        skipNextCanvasScrollSyncRef.current = true;
      }
    }
    if (visualTarget && ((visualTarget.affectsX && !syncVisualScrollX) || (visualTarget.affectsY && !syncVisualScrollY))) {
      skipNextCanvasScrollSyncRef.current = true;
      setCanvasNoScrollOffset((current) => {
        const next = clampCanvasNoScrollOffsetPoint({
          x: visualTarget.affectsX && !syncVisualScrollX ? current.x - visualTarget.deltaX : current.x,
          y: visualTarget.affectsY && !syncVisualScrollY ? current.y - visualTarget.deltaY : current.y
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
  };
}

export function createSyncCanvasFrameScrollToCanvasResizeCommitAnchor(__appScope: Record<string, any>) {
  return (anchor: CanvasResizeCommitAnchor) => {
  const { canvasBoundsRef, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasResizeScrollTargetForCommitAnchor, canvasVerticalScrollbarsActiveRef, canvasViewBoxFromFrameScrollPosition, clampCanvasNoScrollOffsetPoint, normalizeViewBoxToCanvas, sameCanvasViewBox, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, setViewBox, skipNextCanvasScrollSyncRef, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    const hotzones = frame?.querySelector<HTMLElement>(".canvas-resize-hotzones");
    if (!frame || !hotzones) {
      return;
    }
    const hotzoneRect = hotzones.getBoundingClientRect();
    const currentRect: CanvasResizePreviewRect = {
      left: hotzoneRect.left,
      top: hotzoneRect.top,
      width: hotzoneRect.width,
      height: hotzoneRect.height
    };
    const maxScrollLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxScrollTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
    const target = canvasResizeScrollTargetForCommitAnchor({
      edge: anchor.edge,
      desiredRect: anchor.desiredRect,
      currentRect,
      currentScrollLeft: frame.scrollLeft,
      currentScrollTop: frame.scrollTop,
      maxScrollLeft,
      maxScrollTop
    });
    const syncScrollX = target.affectsX && maxScrollLeft > 1;
    const syncScrollY = target.affectsY && maxScrollTop > 1;
    const nextScrollLeft = syncScrollX ? target.left : frame.scrollLeft;
    const nextScrollTop = syncScrollY ? target.top : frame.scrollTop;
    if (
      Math.abs(frame.scrollLeft - nextScrollLeft) > 1 ||
      Math.abs(frame.scrollTop - nextScrollTop) > 1
    ) {
      setCanvasFrameScrollPosition(frame, nextScrollLeft, nextScrollTop);
      skipNextCanvasScrollSyncRef.current = true;
    }
    if (syncScrollX || syncScrollY) {
      const scrolledViewBox = canvasViewBoxFromFrameScrollPosition({
        currentViewBox: viewBoxRef.current,
        canvasBounds: canvasBoundsRef.current,
        scrollLeft: nextScrollLeft,
        scrollTop: nextScrollTop,
        maxScrollLeft,
        maxScrollTop,
        horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current || maxScrollLeft > 1,
        verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current || maxScrollTop > 1
      });
      skipNextCanvasScrollSyncRef.current = true;
      setViewBox((current) => {
        const nextViewBox = normalizeViewBoxToCanvas({
          ...current,
          x: syncScrollX ? scrolledViewBox.x : current.x,
          y: syncScrollY ? scrolledViewBox.y : current.y
        }, canvasBoundsRef.current);
        return sameCanvasViewBox(current, nextViewBox) ? current : nextViewBox;
      });
    }
    if ((target.affectsX && !syncScrollX) || (target.affectsY && !syncScrollY)) {
      setCanvasNoScrollOffset((current) => {
        const next = clampCanvasNoScrollOffsetPoint({
          x: target.affectsX && !syncScrollX ? current.x - target.deltaX : current.x,
          y: target.affectsY && !syncScrollY ? current.y - target.deltaY : current.y
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
  };
}

export function createSyncCanvasFrameScrollToWheelAnchor(__appScope: Record<string, any>) {
  return (anchor: WheelZoomAnchor) => {
  const { anchoredCanvasNoScrollOffset, anchoredCanvasScrollPosition, canvasBaseDisplayOffsetX, canvasBaseDisplayOffsetY, canvasBoundsRef, canvasFramePaddingOffset, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasScrollScaleRef, canvasVerticalScrollbarsActiveRef, clampCanvasNoScrollOffsetPoint, normalizeViewBoxToCanvas, scrollPositionToViewBoxStart, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, setViewBox, skipNextCanvasScrollSyncRef, svgRef, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    const bounds = canvasBoundsRef.current;
    if (!frame || !svg || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    const svgRect = svg.getBoundingClientRect();
    const scale = {
      x: svgRect.width > 0 ? svgRect.width / bounds.width : canvasScrollScaleRef.current.x,
      y: svgRect.height > 0 ? svgRect.height / bounds.height : canvasScrollScaleRef.current.y
    };
    const maxScroll = {
      left: Math.max(0, frame.scrollWidth - frame.clientWidth),
      top: Math.max(0, frame.scrollHeight - frame.clientHeight)
    };
    const scrollPosition = anchoredCanvasScrollPosition(
      anchor,
      scale,
      canvasFramePaddingOffset(frame, svg),
      maxScroll
    );
    const noScrollOffset = anchoredCanvasNoScrollOffset(
      anchor,
      scale,
      {
        left: canvasBaseDisplayOffsetX,
        top: canvasBaseDisplayOffsetY
      }
    );
    const nextCanvasNoScrollOffset = clampCanvasNoScrollOffsetPoint({
      x: canvasHorizontalScrollbarsActiveRef.current ? 0 : noScrollOffset.x,
      y: canvasVerticalScrollbarsActiveRef.current ? 0 : noScrollOffset.y
    });
    const targetScrollLeft = canvasHorizontalScrollbarsActiveRef.current ? scrollPosition.left : 0;
    const targetScrollTop = canvasVerticalScrollbarsActiveRef.current ? scrollPosition.top : 0;
    const currentViewBox = viewBoxRef.current;
    const nextViewBox = normalizeViewBoxToCanvas({
      ...currentViewBox,
      x: canvasHorizontalScrollbarsActiveRef.current
        ? scrollPositionToViewBoxStart(targetScrollLeft, currentViewBox.width, bounds.width, maxScroll.left, currentViewBox.x)
        : currentViewBox.x,
      y: canvasVerticalScrollbarsActiveRef.current
        ? scrollPositionToViewBoxStart(targetScrollTop, currentViewBox.height, bounds.height, maxScroll.top, currentViewBox.y)
        : currentViewBox.y
    }, bounds);
    setCanvasFrameScrollPosition(
      frame,
      targetScrollLeft,
      targetScrollTop
    );
    setViewBox((current) => {
      const updated = normalizeViewBoxToCanvas({
        ...current,
        x: canvasHorizontalScrollbarsActiveRef.current ? nextViewBox.x : current.x,
        y: canvasVerticalScrollbarsActiveRef.current ? nextViewBox.y : current.y
      }, canvasBoundsRef.current);
      if (
        Math.round(updated.x) === Math.round(current.x) &&
        Math.round(updated.y) === Math.round(current.y) &&
        Math.round(updated.width) === Math.round(current.width) &&
        Math.round(updated.height) === Math.round(current.height)
      ) {
        return current;
      }
      skipNextCanvasScrollSyncRef.current = true;
      return updated;
    });
    if (!canvasHorizontalScrollbarsActiveRef.current || !canvasVerticalScrollbarsActiveRef.current) {
      skipNextCanvasScrollSyncRef.current = true;
      setCanvasNoScrollOffset((current) => {
        if (
          Math.round(current.x) === Math.round(nextCanvasNoScrollOffset.x) &&
          Math.round(current.y) === Math.round(nextCanvasNoScrollOffset.y)
        ) {
          return current;
        }
        return nextCanvasNoScrollOffset;
      });
    }
  };
}

export function createCurrentViewBoxFromCanvasFrameScroll(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsRef, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasVerticalScrollbarsActiveRef, canvasViewBoxFromFrameScrollPosition, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return viewBoxRef.current;
    }
    const maxLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
    return canvasViewBoxFromFrameScrollPosition({
      currentViewBox: viewBoxRef.current,
      canvasBounds: canvasBoundsRef.current,
      scrollLeft: frame.scrollLeft,
      scrollTop: frame.scrollTop,
      maxScrollLeft: maxLeft,
      maxScrollTop: maxTop,
      horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current,
      verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current
    });
  };
}

export function createScheduleCanvasVisibleViewBoxUpdate(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsRef, canvasFrameRef, canvasFrameUserScrollRef, canvasFullViewBoxRef, canvasScrollbarsActiveRef, canvasVisibleViewBoxFrameRef, currentViewBoxFromCanvasFrameScroll, normalizeViewBoxToCanvas, renderedCanvasFullyFitsFrame, sameCanvasViewBox, setCanvasVisibleViewBox, setViewBox, skipNextCanvasScrollSyncRef, svgRef, visibleCanvasViewBoxFromRects } = __appScope;
    if (canvasVisibleViewBoxFrameRef.current !== null) {
      return;
    }
    canvasVisibleViewBoxFrameRef.current = window.requestAnimationFrame(() => {
      canvasVisibleViewBoxFrameRef.current = null;
      const frame = canvasFrameRef.current;
      const svg = svgRef.current;
      if (!frame || !svg) {
        return;
      }
      const frameScrollWasUserDriven = canvasFrameUserScrollRef.current;
      canvasFrameUserScrollRef.current = false;
      const frameRect = frame.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const fullViewBox = canvasFullViewBoxRef.current;
      const canvasFullyVisible = !canvasScrollbarsActiveRef.current && renderedCanvasFullyFitsFrame(frameRect, svgRect);
      const next = canvasFullyVisible ? fullViewBox : visibleCanvasViewBoxFromRects(frameRect, svgRect, fullViewBox);
      setCanvasVisibleViewBox((current) => (sameCanvasViewBox(current, next) ? current : next));
      if (canvasFullyVisible || !frameScrollWasUserDriven) {
        return;
      }
      const scrolledViewBox = currentViewBoxFromCanvasFrameScroll();
      setViewBox((current) => {
        const nextViewBox = normalizeViewBoxToCanvas({ ...current, x: scrolledViewBox.x, y: scrolledViewBox.y }, canvasBoundsRef.current);
        if (
          Math.round(nextViewBox.x) === Math.round(current.x) &&
          Math.round(nextViewBox.y) === Math.round(current.y)
        ) {
          return current;
        }
        skipNextCanvasScrollSyncRef.current = true;
        return nextViewBox;
      });
    });
  };
}

export function createHandleCanvasFrameScroll(__appScope: Record<string, any>) {
  return () => {
  const { canvasBoundsScrollSyncPendingRef, canvasFrameProgrammaticScrollRef, canvasFrameScrollIsUserDriven, canvasFrameUserScrollRef, panningRef, scheduleCanvasVisibleViewBoxUpdate } = __appScope;
    if (canvasFrameScrollIsUserDriven({
      programmaticScroll: canvasFrameProgrammaticScrollRef.current,
      boundsScrollSyncPending: canvasBoundsScrollSyncPendingRef.current
    })) {
      canvasFrameUserScrollRef.current = true;
    }
    if (panningRef.current) {
      return;
    }
    scheduleCanvasVisibleViewBoxUpdate();
  };
}

export function createUpdateCanvasFrameViewportSize(__appScope: Record<string, any>) {
  return () => {
  const { canvasFrameRef, setCanvasFrameViewportSize } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const nextSize = { width: frame.clientWidth, height: frame.clientHeight };
    setCanvasFrameViewportSize((current) =>
      current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
    );
  };
}

export function createUpdateCanvasFrameViewportAndVisibleBox(__appScope: Record<string, any>) {
  return () => {
  const { scheduleCanvasVisibleViewBoxUpdate, updateCanvasFrameViewportSize } = __appScope;
    updateCanvasFrameViewportSize();
    scheduleCanvasVisibleViewBoxUpdate();
  };
}

export function createNodeImage(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { imageAssets, resolveNodeImage, resolveNodeStateVisual, resolveStateVisualImageHref } = __appScope;
    const stateImageHref = resolveStateVisualImageHref(resolveNodeStateVisual(node), imageAssets);
    return stateImageHref || resolveNodeImage(node, imageAssets);
  };
}

export function createRenderNodePreviewImageContent(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    clipId: string,
    options: { imageHref?: string; foregroundImageHref?: string; className?: string } = {}
  ) => {
  const { g, image, isBusNode, isStaticNode, nodeForegroundImage, nodeImage, nodeImageContentTransform, rect } = __appScope;
    const imageHref = options.imageHref ?? nodeImage(node);
    const foregroundImageHref = options.foregroundImageHref ?? nodeForegroundImage(node);
    if (isBusNode(node) || (!imageHref && !foregroundImageHref)) {
      return null;
    }
    const clipPath = `url(#${clipId})`;
    return (
      <>
        <clipPath id={clipId}>
          <rect
            x={-node.size.width / 2}
            y={-node.size.height / 2}
            width={node.size.width}
            height={node.size.height}
            rx="8"
          />
        </clipPath>
        <g className={options.className ?? "node-upright-content"} transform={nodeImageContentTransform(node)}>
          {!isStaticNode(node) && (
            <rect
              x={-node.size.width / 2}
              y={-node.size.height / 2}
              width={node.size.width}
              height={node.size.height}
              rx="8"
              className="node-image-cover"
            />
          )}
          {imageHref && (
            <image
              href={imageHref}
              x={-node.size.width / 2}
              y={-node.size.height / 2}
              width={node.size.width}
              height={node.size.height}
              preserveAspectRatio="xMidYMid slice"
              clipPath={clipPath}
              className="node-background-image"
            />
          )}
          {foregroundImageHref && (
            <image
              href={foregroundImageHref}
              x={-node.size.width / 2}
              y={-node.size.height / 2}
              width={node.size.width}
              height={node.size.height}
              preserveAspectRatio="xMidYMid slice"
              clipPath={clipPath}
              className="node-foreground-image"
            />
          )}
        </g>
      </>
    );
  };
}

export function createBuildNodePreviewImageMarkup(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    clipId: string,
    options: { clip?: boolean; className?: string } = {}
  ) => {
  const { escapeXml, formatSvgNumber, isBusNode, isStaticNode, nodeForegroundImage, nodeImage, nodeImageContentTransform } = __appScope;
    const imageHref = nodeImage(node);
    const foregroundImageHref = nodeForegroundImage(node);
    if (isBusNode(node) || (!imageHref && !foregroundImageHref)) {
      return "";
    }
    const clipEnabled = options.clip !== false;
    const clipUrl = `url(#${clipId})`;
    const clipAttribute = clipEnabled ? ` clip-path="${escapeXml(clipUrl)}"` : "";
    const clipMarkup = clipEnabled
      ? `<clipPath id="${escapeXml(clipId)}"><rect x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="8"/></clipPath>`
      : "";
    const imageCoverMarkup = !isStaticNode(node)
      ? `<rect x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="8" class="node-image-cover"/>`
      : "";
    const backgroundMarkup = imageHref
      ? `<image href="${escapeXml(imageHref)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" preserveAspectRatio="xMidYMid slice"${clipAttribute} class="node-background-image"/>`
      : "";
    const foregroundMarkup = foregroundImageHref
      ? `<image href="${escapeXml(foregroundImageHref)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" preserveAspectRatio="xMidYMid slice"${clipAttribute} class="node-foreground-image"/>`
      : "";
    return `${clipMarkup}<g class="${escapeXml(options.className ?? "node-upright-content")}" transform="${escapeXml(nodeImageContentTransform(node))}">${imageCoverMarkup}${backgroundMarkup}${foregroundMarkup}</g>`;
  };
}

export function createBuildConnectPreviewPath(__appScope: Record<string, any>) {
  return (
    source: typeof connectSource,
    point: Point | null,
    targetPoint: Point | null = null,
    target: ConnectTarget | null = null
  ) => {
  const { buildManualConnectionPreviewPath, canvasBounds, getModelEdgeEndpointPoint, isBusNode, routeEdgesForStoredRendering, visibleNodeById } = __appScope;
    const endPoint = targetPoint ?? point;
    if (!source || !endPoint) {
      return "";
    }
    const sourceNode = visibleNodeById.get(source.nodeId);
    if (!sourceNode) {
      return "";
    }
    const sourcePoint = source.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, source.terminalId);
    if (source.manualPoints?.length) {
      return buildManualConnectionPreviewPath(sourcePoint, source.manualPoints, endPoint, canvasBounds);
    }
    const previewTarget = target;
    const previewNodes = previewTarget?.node && previewTarget.node.id !== sourceNode.id
      ? [sourceNode, previewTarget.node]
      : [sourceNode];
    const route = routeEdgesForStoredRendering(
      previewNodes,
      [{
        id: "connect-preview",
        sourceId: sourceNode.id,
        targetId: previewTarget?.node.id ?? "floating-connect-preview-target",
        sourceTerminalId: source.terminalId,
        targetTerminalId: previewTarget?.terminalId ?? "t1",
        sourcePoint,
        manualPoints: source.manualPoints,
        targetPoint: previewTarget
          ? isBusNode(previewTarget.node)
            ? previewTarget.point ?? endPoint
            : previewTarget.point
          : endPoint
      }],
      canvasBounds,
      { preserveManualRouteDisplay: Boolean(source.manualPoints?.length) }
    )[0];
    return route?.path ?? "";
  };
}

export function createBuildRoutableLinePreviewPath(__appScope: Record<string, any>) {
  return (
    placement: RoutableLinePlacementState,
    point: Point | null,
    targetPoint: Point | null = null,
    target: ConnectTarget | null = null
  ) => {
  const { buildManualConnectionPreviewPath, canvasBounds, compactPreviewNodes, connectTargetPoint, pointsToPreviewPath, routeEdgesForStoredRendering } = __appScope;
    if (!placement?.source || !point) {
      return "";
    }
    const sourcePoint = connectTargetPoint(placement.source);
    const endPoint = targetPoint ?? point;
    if (placement.manualPoints?.length) {
      return buildManualConnectionPreviewPath(sourcePoint, placement.manualPoints, endPoint, canvasBounds);
    }
    const route = routeEdgesForStoredRendering(
      compactPreviewNodes(placement.source.node, target?.node),
      [{
        id: "routable-line-device-preview",
        sourceId: placement.source.node.id,
        targetId: target?.node.id ?? "floating-routable-line-target",
        sourceTerminalId: placement.source.terminalId,
        targetTerminalId: target?.terminalId ?? "t1",
        sourcePoint,
        targetPoint: target ? connectTargetPoint(target) : endPoint
      }],
      canvasBounds
    )[0];
    return route?.path ?? pointsToPreviewPath([sourcePoint, endPoint]);
  };
}

export function createPatchStoredRouteStoreForEdgeIds(__appScope: Record<string, any>) {
  return (
    store: RouteStore | null | undefined,
    edgeIds: ReadonlySet<string>,
    bounds: CanvasBounds,
    routeNodes: ModelNode[]
  ): RouteStore | null => {
  const { edgeById, editModeRouteRenderOptions, queryRouteSpatialIndex, refreshCrossingArcPaths, routeEdgesForStoredRendering, routeRenderBounds, routeStorePatchRoutes, routingNodesForConnectionEdge, visibleEdgeIdSet } = __appScope;
    if (!store || edgeIds.size === 0 || store.routes.length === 0) {
      return null;
    }
    const changedRouteIds = new Set<string>();
    const routeDeleteIds: string[] = [];
    const routeDeleteIdSet = new Set<string>();
    const localRouteById = new Map<string, RoutedEdge>();
    const previousLocalRouteById = new Map<string, RoutedEdge>();
    const addLocalRoute = (route: RoutedEdge | undefined, options: { replaceChanged?: boolean } = {}) => {
      if (!route || routeDeleteIdSet.has(route.edgeId)) {
        return;
      }
      if (changedRouteIds.has(route.edgeId) && localRouteById.has(route.edgeId) && !options.replaceChanged) {
        return;
      }
      localRouteById.set(route.edgeId, route);
    };
    const addStoredRoutesNearBounds = (boundsToQuery: ReturnType<typeof routeRenderBounds>) => {
      if (!boundsToQuery) {
        return;
      }
      for (const route of queryRouteSpatialIndex(store.routeSpatialIndex, boundsToQuery)) {
        addLocalRoute(route);
      }
    };

    for (const edgeId of edgeIds) {
      const previousRoute = store.routeMap.get(edgeId);
      if (previousRoute) {
        previousLocalRouteById.set(edgeId, previousRoute);
        addStoredRoutesNearBounds(routeRenderBounds(previousRoute, 8));
      }
      const edge = edgeById.get(edgeId);
      if (!edge || !visibleEdgeIdSet.has(edge.id)) {
        changedRouteIds.add(edgeId);
        routeDeleteIds.push(edgeId);
        routeDeleteIdSet.add(edgeId);
        localRouteById.delete(edgeId);
        continue;
      }
      const routeNodesForEdge = routingNodesForConnectionEdge(edge, routeNodes);
      const nextRoute = routeEdgesForStoredRendering(routeNodesForEdge, [edge], bounds, editModeRouteRenderOptions)[0];
      if (!nextRoute) {
        changedRouteIds.add(edgeId);
        routeDeleteIds.push(edgeId);
        routeDeleteIdSet.add(edgeId);
        localRouteById.delete(edgeId);
        continue;
      }
      changedRouteIds.add(edgeId);
      addStoredRoutesNearBounds(routeRenderBounds(nextRoute, 8));
      addLocalRoute(nextRoute, { replaceChanged: true });
    }

    if (changedRouteIds.size === 0 && routeDeleteIds.length === 0) {
      return null;
    }
    const refreshSeedRoutes = Array.from(localRouteById.values());
    for (const route of refreshSeedRoutes) {
      addStoredRoutesNearBounds(routeRenderBounds(route, 8));
    }
    const localRoutes = Array.from(localRouteById.values()).sort(
      (first, second) =>
        (store.routeIndexById.get(first.edgeId) ?? Number.MAX_SAFE_INTEGER) -
        (store.routeIndexById.get(second.edgeId) ?? Number.MAX_SAFE_INTEGER)
    );
    const refreshedRoutes = localRoutes.length > 0
      ? refreshCrossingArcPaths(localRoutes, changedRouteIds, Array.from(previousLocalRouteById.values()))
      : [];
    return routeStorePatchRoutes(store, refreshedRoutes, routeDeleteIds);
  };
}

export function createMarkRouteEdgesDirty(__appScope: Record<string, any>) {
  return (edgeIds: Iterable<string | undefined>) => {
  const { pendingRouteEdgeIdsRef, routeDirtyGenerationRef } = __appScope;
    const next = new Set(pendingRouteEdgeIdsRef.current);
    let changed = false;
    for (const edgeId of edgeIds) {
      if (edgeId) {
        next.add(edgeId);
        changed = true;
      }
    }
    pendingRouteEdgeIdsRef.current = next;
    if (changed) {
      routeDirtyGenerationRef.current += 1;
    }
  };
}

export function createMarkStoredRouteEdgesDirty(__appScope: Record<string, any>) {
  return (edgeIds: Iterable<string | undefined>) => {
  const { pendingStoredRouteEdgeIdsRef, routeDirtyGenerationRef } = __appScope;
    const next = new Set(pendingStoredRouteEdgeIdsRef.current);
    let changed = false;
    for (const edgeId of edgeIds) {
      if (edgeId) {
        next.add(edgeId);
        changed = true;
      }
    }
    pendingStoredRouteEdgeIdsRef.current = next;
    if (changed) {
      routeDirtyGenerationRef.current += 1;
    }
  };
}

export function createEdgeListsHaveSameOrder(__appScope: Record<string, any>) {
  return (previousEdges: Edge[], nextEdges: Edge[]) => {
    if (previousEdges.length !== nextEdges.length) {
      return false;
    }
    for (let index = 0; index < previousEdges.length; index += 1) {
      if (previousEdges[index].id !== nextEdges[index].id) {
        return false;
      }
    }
    return true;
  };
}

export function createEdgeReferenceDiffIds(__appScope: Record<string, any>) {
  return (previousEdges: Edge[], nextEdges: Edge[]) => {
  const { edgeListsHaveSameOrder } = __appScope;
    if (edgeListsHaveSameOrder(previousEdges, nextEdges)) {
      const changed = new Set<string>();
      for (let index = 0; index < previousEdges.length; index += 1) {
        if (previousEdges[index] !== nextEdges[index]) {
          changed.add(nextEdges[index].id);
        }
      }
      return changed;
    }
    const previousById = new Map(previousEdges.map((edge) => [edge.id, edge]));
    const nextById = new Map(nextEdges.map((edge) => [edge.id, edge]));
    const changed = new Set<string>();
    for (const edge of nextEdges) {
      if (previousById.get(edge.id) !== edge) {
        changed.add(edge.id);
      }
    }
    for (const edge of previousEdges) {
      if (!nextById.has(edge.id)) {
        changed.add(edge.id);
      }
    }
    return changed;
  };
}

export function createDirtyEdgeIdsAfterMove(__appScope: Record<string, any>) {
  return (
    previousEdges: Edge[],
    nextEdges: Edge[],
    movedNodeIds: Iterable<string>,
    extraEdgeIds: Iterable<string> = []
  ) => {
  const { edgeReferenceDiffIds, reuseSetOrCreate } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const dirty = edgeReferenceDiffIds(previousEdges, nextEdges);
    for (const edge of previousEdges) {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        dirty.add(edge.id);
      }
    }
    for (const edgeId of extraEdgeIds) {
      dirty.add(edgeId);
    }
    return dirty;
  };
}

export function createDirtyEdgeIdsForMovedLocalRoutes(__appScope: Record<string, any>) {
  return (
    selectedEdgeIds: Iterable<string> = [],
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
    const dirty = new Set<string>(Object.keys(originalRoutePoints));
    for (const edgeId of selectedEdgeIds) {
      dirty.add(edgeId);
    }
    return dirty;
  };
}

export function createDirtyEdgeIdsAfterBulkMove(__appScope: Record<string, any>) {
  return (
    previousEdges: Edge[],
    nextEdges: Edge[],
    movedNodeIds: Iterable<string>,
    routeCachePatchedEdgeIds: Iterable<string>,
    extraEdgeIds: Iterable<string> = []
  ): BulkMoveDirtyResult => {
  const { dirtyEdgeIdsAfterMove, edgeListsHaveSameOrder, edgeReferenceDiffIds, reuseSetOrCreate } = __appScope;
    const translatedIds = reuseSetOrCreate(routeCachePatchedEdgeIds);
    if (translatedIds.size === 0) {
      const dirtyIds = dirtyEdgeIdsAfterMove(previousEdges, nextEdges, movedNodeIds, extraEdgeIds);
      return { dirtyIds, legacyDirtyCount: dirtyIds.size };
    }
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const dirty = new Set<string>();
    const legacyDirty = new Set<string>();
    const addLegacyAndCurrent = (edgeId: string) => {
      legacyDirty.add(edgeId);
      if (!translatedIds.has(edgeId)) {
        dirty.add(edgeId);
      }
    };
    if (edgeListsHaveSameOrder(previousEdges, nextEdges)) {
      for (let index = 0; index < previousEdges.length; index += 1) {
        const previousEdge = previousEdges[index];
        const nextEdge = nextEdges[index];
        const edgeId = nextEdge.id;
        if (previousEdge !== nextEdge) {
          addLegacyAndCurrent(edgeId);
        }
        if (movedIds.has(previousEdge.sourceId) || movedIds.has(previousEdge.targetId)) {
          addLegacyAndCurrent(previousEdge.id);
        }
      }
    } else {
      for (const edgeId of edgeReferenceDiffIds(previousEdges, nextEdges)) {
        addLegacyAndCurrent(edgeId);
      }
      for (const edge of previousEdges) {
        if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
          addLegacyAndCurrent(edge.id);
        }
      }
    }
    for (const edgeId of extraEdgeIds) {
      addLegacyAndCurrent(edgeId);
    }
    return { dirtyIds: dirty, legacyDirtyCount: legacyDirty.size };
  };
}

export function createLogBulkMoveCommitStats(__appScope: Record<string, any>) {
  return (stats: BulkMoveCommitStats) => {
  const { BULK_MOVE_PERF_LOG_THRESHOLD_MS, CANVAS_BULK_MOVE_EDGE_THRESHOLD } = __appScope;
    if (stats.durationMs < BULK_MOVE_PERF_LOG_THRESHOLD_MS && stats.candidateEdgeCount < CANVAS_BULK_MOVE_EDGE_THRESHOLD) {
      return;
    }
    const savedRouteDirty = Math.max(0, stats.legacyRouteDirtyCount - stats.routeDirtyCount);
    const savedDeferredRepairCandidates = Math.max(0, stats.legacyDeferredRepairCandidateCount - stats.deferredRepairCandidateCount);
    console.table({
      kind: stats.kind,
      movedNodes: stats.movedNodeCount,
      candidateEdges: stats.candidateEdgeCount,
      internalEdges: stats.internalEdgeCount,
      boundaryEdges: stats.boundaryEdgeCount,
      deferredRepairCandidates: stats.deferredRepairCandidateCount,
      oldDeferredRepairCandidates: stats.legacyDeferredRepairCandidateCount,
      savedDeferredRepairCandidates,
      routeCachePatched: stats.routeCachePatchedCount,
      oldRouteDirty: stats.legacyRouteDirtyCount,
      routeDirty: stats.routeDirtyCount,
      savedRouteDirty,
      storedRouteDirty: stats.storedRouteDirtyCount,
      routableLineUpdates: stats.routableLineUpdateCount,
      totalMs: Number(stats.durationMs.toFixed(2)),
      bulkPlanMs: Number(stats.bulkPlanMs.toFixed(2)),
      canvasBoundsMs: Number(stats.canvasBoundsMs.toFixed(2)),
      edgePatchMs: Number(stats.edgePatchMs.toFixed(2)),
      dirtyMs: Number(stats.dirtyMs.toFixed(2)),
      markDirtyMs: Number(stats.markDirtyMs.toFixed(2)),
      busSyncMs: Number(stats.busSyncMs.toFixed(2)),
      syncRepairMs: Number(stats.syncRepairMs.toFixed(2)),
      routeCacheMs: Number(stats.routeCacheMs.toFixed(2)),
      graphPatchMs: Number(stats.graphPatchMs.toFixed(2))
    });
  };
}

export function createBuildMovedNodeUpdates(__appScope: Record<string, any>) {
  return (
    nodeIds: Iterable<string>,
    originalPositions: Record<string, Point>,
    delta: Point,
    bounds?: CanvasBounds
  ) => {
  const { canvasBounds, clampNodePositionToExpandableBounds, isCanvasNodeMovable, nodeById } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const updates: ModelNode[] = [];
    for (const nodeId of nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = originalPositions[nodeId];
      if (!node || !originalPosition || !isCanvasNodeMovable(node.kind)) {
        continue;
      }
      updates.push({
        ...node,
        position: clampNodePositionToExpandableBounds(
          node,
          bounds,
          { x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }
        )
      });
    }
    return updates;
  };
}

export function createNextNodesForMovedGraphCommit(__appScope: Record<string, any>) {
  return (
    store: GraphStore,
    movedNodeUpdates: ModelNode[],
    movedNodeIds: Iterable<string>
  ) => {
  const { overlayGraphStoreNodes, reuseSetOrCreate } = __appScope;
    const uniqueMovedNodeIds = reuseSetOrCreate(movedNodeIds);
    return uniqueMovedNodeIds.size > 0 && movedNodeUpdates.length < store.nodes.length ? movedNodeUpdates : overlayGraphStoreNodes(store, movedNodeUpdates);
  };
}

export function createEdgePatchFromCandidateEdges(__appScope: Record<string, any>) {
  return (previousCandidateEdges: Edge[], nextCandidateEdges: Edge[]) => {
  const { edgeListsHaveSameOrder } = __appScope;
    if (edgeListsHaveSameOrder(previousCandidateEdges, nextCandidateEdges)) {
      const edgeUpserts: Edge[] = [];
      for (let index = 0; index < previousCandidateEdges.length; index += 1) {
        if (previousCandidateEdges[index] !== nextCandidateEdges[index]) {
          edgeUpserts.push(nextCandidateEdges[index]);
        }
      }
      return { edgeUpserts, edgeDeleteIds: [] };
    }
    const previousById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    const nextIds = new Set(nextCandidateEdges.map((edge) => edge.id));
    const edgeUpserts = nextCandidateEdges.filter((edge) => previousById.get(edge.id) !== edge);
    const edgeDeleteIds = previousCandidateEdges
      .filter((edge) => !nextIds.has(edge.id))
      .map((edge) => edge.id);
    return { edgeUpserts, edgeDeleteIds };
  };
}

export function createGraphStorePatchStillCurrent(__appScope: Record<string, any>) {
  return (
    store: GraphStore,
    nodeUpdates: readonly ModelNode[],
    edgeUpserts: readonly Edge[],
    edgeDeleteIds: readonly string[]
  ) => {
    for (const node of nodeUpdates) {
      if (store.nodeMap.get(node.id) !== node) {
        return false;
      }
    }
    for (const edge of edgeUpserts) {
      if (store.edgeMap.get(edge.id) !== edge) {
        return false;
      }
    }
    for (const edgeId of edgeDeleteIds) {
      if (store.edgeMap.has(edgeId)) {
        return false;
      }
    }
    return true;
  };
}

export function createShouldRunSynchronousMoveBlockerRepair(__appScope: Record<string, any>) {
  return (
    movedNodeIds: string[],
    previousCandidateEdges: Edge[],
    nextCandidateEdges: Edge[]
  ) => {
  const { MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES } = __appScope;
    if (movedNodeIds.length === 0) {
      return false;
    }
    if (movedNodeIds.length !== 1 || previousCandidateEdges.length <= MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES) {
      return true;
    }
    const previousById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    return nextCandidateEdges.some((edge) => previousById.get(edge.id) !== edge);
  };
}

export function createMarkGraphDirtyForInteractiveCommit(__appScope: Record<string, any>) {
  return () => {
  const { setHasUnsavedChanges, setRouteRenderingReady, suppressNextGraphDirtyRef } = __appScope;
    suppressNextGraphDirtyRef.current = true;
    setHasUnsavedChanges(true);
    setRouteRenderingReady(true);
  };
}

export function createPatchSingleTerminalAnchorFromPoint(__appScope: Record<string, any>) {
  return (
    nodeId: string,
    terminalId: string,
    point: Point,
    originalMovingPoint: Point
  ) => {
  const { canvasBounds, currentStoredRoutePointsForEdge, edgeWithFrozenBusEndpointPoints, graphStoreApplyPatch, isBusNode, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, overlayGraphStoreNodes, preserveConnectionEdgeRouteShape, resolveStraightBusSlideEndpoint, sameOptionalPoint, setGraphStore, snapSingleTerminalAnchorToNearestSide } = __appScope;
    markGraphDirtyForInteractiveCommit();
    setGraphStore((current) => {
      const currentNode = current.nodeMap.get(nodeId);
      if (!currentNode || isBusNode(currentNode) || currentNode.terminals.length !== 1) {
        return current;
      }
      const anchor = snapSingleTerminalAnchorToNearestSide(currentNode, point);
      let changed = false;
      const nextTerminals = currentNode.terminals.map((terminal) => {
        if (terminal.id !== terminalId || sameOptionalPoint(terminal.anchor, anchor)) {
          return terminal;
        }
        changed = true;
        return { ...terminal, anchor };
      });
      if (!changed) {
        return current;
      }
      const nextNode = { ...currentNode, terminals: nextTerminals };
      const nextNodes = overlayGraphStoreNodes(current, [nextNode]);
      const dirtyEdges = (current.edgesByNodeId.get(nodeId) ?? []).filter((edge) =>
        (edge.sourceId === nodeId && edge.sourceTerminalId === terminalId) ||
        (edge.targetId === nodeId && edge.targetTerminalId === terminalId)
      );
      const dirtyEdgeIds = dirtyEdges.map((edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      markStoredRouteEdgesDirty(dirtyEdgeIds);
      const nextEdges = dirtyEdges.map((edge) => {
        const sourceAffected = edge.sourceId === nodeId && edge.sourceTerminalId === terminalId;
        const storedPoints = currentStoredRoutePointsForEdge(edge);
        const frozenEdge = edgeWithFrozenBusEndpointPoints(edge, storedPoints);
        const sourceNode = current.nodeMap.get(edge.sourceId);
        const targetNode = current.nodeMap.get(edge.targetId);
        const nextSourceNode = edge.sourceId === nodeId ? nextNode : sourceNode;
        const nextTargetNode = edge.targetId === nodeId ? nextNode : targetNode;
        const slidePatch = sourceNode && targetNode && nextSourceNode && nextTargetNode
          ? resolveStraightBusSlideEndpoint({
              edge: frozenEdge,
              sourceNode,
              targetNode,
              nextSourceNode,
              nextTargetNode,
              movingEndpoint: sourceAffected ? "source" : "target",
              nodes: current.nodes,
              nextNodes,
              originalMovingPoint
            })
          : null;
        const nextEdge = slidePatch ? { ...frozenEdge, ...slidePatch } : frozenEdge;
        return preserveConnectionEdgeRouteShape(nextNodes, nextEdge, storedPoints, canvasBounds);
      });
      return graphStoreApplyPatch(current, {
        nodeUpdates: [nextNode],
        edgeUpserts: nextEdges
      });
    });
  };
}

export function createRebuildEdgeUpdatesAfterNodeGeometryChange(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    changedNodeIds: Iterable<string>,
    currentEdges?: Edge[],
    preservedEdgeIds = new Set<string>()
  ) => {
  const { canvasBounds, dirtyEdgeIdsAfterMove, edgeListForNodeIds, edges, editModeRouteRebuildOptions, markRouteEdgesDirty, markStoredRouteEdgesDirty, rebuildConnectionRoutesForNodes, routingNodesForConnectionEdges } = __appScope;
    if (currentEdges === undefined) {
      currentEdges = edges;
    }
    const changedIds = Array.from(new Set(changedNodeIds));
    if (changedIds.length === 0) {
      return [];
    }
    const localEdges = currentEdges === edges
      ? edgeListForNodeIds(changedIds)
      : currentEdges.filter((edge) => changedIds.includes(edge.sourceId) || changedIds.includes(edge.targetId));
    const rerouteEdges = preservedEdgeIds.size > 0
      ? localEdges.filter((edge) => !preservedEdgeIds.has(edge.id))
      : localEdges;
    if (rerouteEdges.length === 0) {
      return [];
    }
    const routingNodes = routingNodesForConnectionEdges(rerouteEdges, nextNodes, changedIds);
    const nextLocalEdges = rebuildConnectionRoutesForNodes(routingNodes, rerouteEdges, changedIds, canvasBounds, rerouteEdges, editModeRouteRebuildOptions);
    const dirtyEdgeIds = dirtyEdgeIdsAfterMove(rerouteEdges, nextLocalEdges, changedIds);
    markRouteEdgesDirty(dirtyEdgeIds);
    markStoredRouteEdgesDirty(dirtyEdgeIds);
    if (dirtyEdgeIds.size === 0) {
      return [];
    }
    const previousLocalEdgeById = new Map(rerouteEdges.map((edge) => [edge.id, edge]));
    return nextLocalEdges.filter((edge) => previousLocalEdgeById.get(edge.id) !== edge);
  };
}

export function createRebuildEdgesAfterNodeGeometryChange(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    changedNodeIds: Iterable<string>,
    currentEdges?: Edge[],
    preservedEdgeIds = new Set<string>()
  ) => {
  const { edges, rebuildEdgeUpdatesAfterNodeGeometryChange } = __appScope;
    if (currentEdges === undefined) {
      currentEdges = edges;
    }
    const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, changedNodeIds, currentEdges, preservedEdgeIds);
    if (edgeUpdates.length === 0) {
      return currentEdges;
    }
    const edgeUpdateById = new Map(edgeUpdates.map((edge) => [edge.id, edge]));
    let changed = false;
    const nextEdges = currentEdges.map((edge) => {
      const update = edgeUpdateById.get(edge.id);
      if (!update) {
        return edge;
      }
      changed = true;
      return update;
    });
    return changed ? nextEdges : currentEdges;
  };
}

export function createStoredRouteEndpointMatchPoint(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    endpointPoint: Point | undefined,
    terminalId: string | undefined,
    storedEndpoint: Point | undefined
  ) => {
  const { getModelEdgeEndpointPoint, isBusNode, projectPointToBusCenterline, sameStoredRouteEndpointPoint } = __appScope;
    if (isBusNode(node) && !endpointPoint && storedEndpoint) {
      const projected = projectPointToBusCenterline(node, storedEndpoint);
      if (sameStoredRouteEndpointPoint(projected, storedEndpoint)) {
        return storedEndpoint;
      }
    }
    return getModelEdgeEndpointPoint(node, endpointPoint, terminalId);
  };
}

export function createEndpointMatchedRoutePointsForEdge(__appScope: Record<string, any>) {
  return (edge: Edge | undefined, routePoints: Point[] | undefined) => {
  const { nodeById, sameStoredRouteEndpointPoint, storedRouteEndpointMatchPoint } = __appScope;
    if (!edge || !routePoints || routePoints.length < 2) {
      return [];
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      return [];
    }
    const storedStart = routePoints[0];
    const storedEnd = routePoints[routePoints.length - 1];
    const start = storedRouteEndpointMatchPoint(source, edge.sourcePoint, edge.sourceTerminalId, storedStart);
    const end = storedRouteEndpointMatchPoint(target, edge.targetPoint, edge.targetTerminalId, storedEnd);
    if (!storedStart || !storedEnd || !sameStoredRouteEndpointPoint(storedStart, start) || !sameStoredRouteEndpointPoint(storedEnd, end)) {
      return [];
    }
    return routePoints.map((point) => ({ ...point }));
  };
}

export function createEdgeWithFrozenBusEndpointPoints(__appScope: Record<string, any>) {
  return (edge: Edge, routePoints: Point[] | undefined): Edge => {
  const { isBusNode, nodeById } = __appScope;
    if (!routePoints || routePoints.length < 2) {
      return edge;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      return edge;
    }
    const routeStart = routePoints[0];
    const routeEnd = routePoints[routePoints.length - 1];
    if (!routeStart || !routeEnd) {
      return edge;
    }
    return {
      ...edge,
      sourcePoint: isBusNode(source) && !edge.sourcePoint ? routeStart : edge.sourcePoint,
      targetPoint: isBusNode(target) && !edge.targetPoint ? routeEnd : edge.targetPoint
    };
  };
}

export function createPreviewStoredRoutePointsForEdge(__appScope: Record<string, any>) {
  return (edge: Edge, start?: Point, end?: Point) => {
  const { endpointMatchedRoutePointsForEdge, endpointMatchedStoredRoutePoints, routedEdgeById } = __appScope;
    const storedRoute = endpointMatchedStoredRoutePoints(edge);
    if (storedRoute.length) {
      return storedRoute;
    }
    const cachedRoute = endpointMatchedRoutePointsForEdge(edge, routedEdgeById.get(edge.id)?.points);
    if (cachedRoute.length) {
      return cachedRoute;
    }
    if (!start || !end) {
      return [];
    }
    return [
      start,
      ...(edge.manualPoints ?? []),
      end
    ].filter((point): point is Point => Boolean(point)).map((point) => ({ ...point }));
  };
}

export function createClearLocalSchemeModelCache(__appScope: Record<string, any>) {
  return () => {
  const { DRAFT_PROJECT_STORAGE_KEY, PROJECT_STORAGE_KEY, SCHEME_STORAGE_KEY } = __appScope;
    try {
      window.localStorage.removeItem(SCHEME_STORAGE_KEY);
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
      window.localStorage.removeItem(DRAFT_PROJECT_STORAGE_KEY);
    } catch {
      // 浏览器缓存不可写时不阻断目录文件作为唯一数据源。
    }
  };
}

export function createRememberPersistedSchemesPayload(__appScope: Record<string, any>) {
  return (normalizedSchemesPayload: string) => {
  const { clearLocalSchemeModelCache, lastPersistedSchemesPayloadRef } = __appScope;
    clearLocalSchemeModelCache();
    lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;
  };
}

export function createRefreshSchemesFromBackendDirectory(__appScope: Record<string, any>) {
  return (reason: string) => {
  const { activeSchemeKey, clearActiveProjectDisplay, fetchBackendSchemes, flattenSavedSchemes, rememberPersistedSchemesPayload, saveRequiredRef, serializeSchemesForStorage, setExpandedSchemeIds, setSchemesState, suppressNextBackendSchemeSyncRef, writeOperationLog } = __appScope;
    void fetchBackendSchemes()
      .then((backendSchemes) => {
        const backendPayload = serializeSchemesForStorage(backendSchemes);
        rememberPersistedSchemesPayload(backendPayload);
        suppressNextBackendSchemeSyncRef.current = true;
        setSchemesState(backendSchemes);
        setExpandedSchemeIds((current) => {
          const backendSchemeIds = new Set(flattenSavedSchemes(backendSchemes).map((scheme) => scheme.id));
          const retained = current.filter((schemeId) => backendSchemeIds.has(schemeId));
          if (retained.length > 0) {
            return retained;
          }
          const preferredSchemeId =
            (activeSchemeKey && backendSchemeIds.has(activeSchemeKey) ? activeSchemeKey : "") ||
            backendSchemes[0]?.id ||
            "";
          return preferredSchemeId ? [preferredSchemeId] : [];
        });
        if (backendSchemes.length === 0 && !saveRequiredRef.current) {
          clearActiveProjectDisplay("后台目录没有可用方案，画布已清空");
        }
        writeOperationLog(`${reason}：已按后台目录刷新方案/模型树`);
      })
      .catch(() => writeOperationLog(`${reason}：读取后台目录失败`));
  };
}

export function createHandleBackendSchemeMutationFailure(__appScope: Record<string, any>) {
  return (reason: string, error: unknown) => {
  const { refreshSchemesFromBackendDirectory, writeOperationLog } = __appScope;
    const message = error instanceof Error ? error.message : reason;
    window.alert(`${reason}失败：${message}\n已按后台目录重新刷新方案/模型树。`);
    writeOperationLog(`${reason}失败：${message}`);
    refreshSchemesFromBackendDirectory(`${reason}失败后刷新`);
  };
}

export function createSaveSchemeTreeToBackend(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, parentPath: string[], previousSchemePath?: string[]) => {
  const { saveBackendProjectRecord, saveBackendSchemeRecord } = __appScope;
    const tasks: Promise<unknown>[] = [];
    const visit = (record: SavedSchemeRecord, pathPrefix: string[], previousPath?: string[]) => {
      const schemePath = [...pathPrefix, record.name];
      tasks.push(saveBackendSchemeRecord(schemePath, previousPath));
      for (const project of record.projects) {
        tasks.push(saveBackendProjectRecord(schemePath, project));
      }
      for (const child of record.children ?? []) {
        visit(child, schemePath);
      }
    };
    visit(scheme, parentPath, previousSchemePath);
    return Promise.all(tasks);
  };
}

export function createPersistSchemeTreeToBackend(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, parentPath: string[], reason: string, previousSchemePath?: string[]) => {
  const { handleBackendSchemeMutationFailure, saveSchemeTreeToBackend, writeOperationLog } = __appScope;
    void saveSchemeTreeToBackend(scheme, parentPath, previousSchemePath)
      .then(() => writeOperationLog(`${reason}：已按单方案/单模型同步到后台`))
      .catch((error) => handleBackendSchemeMutationFailure(`${reason}后台同步`, error));
  };
}

export function createReplaceSchemeTreeInBackend(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, parentPath: string[], previousSchemePath: string[], reason: string) => {
  const { deleteBackendSchemeRecord, handleBackendSchemeMutationFailure, saveSchemeTreeToBackend, writeOperationLog } = __appScope;
    void deleteBackendSchemeRecord(previousSchemePath)
      .then(() => saveSchemeTreeToBackend(scheme, parentPath))
      .then(() => writeOperationLog(`${reason}：已按单方案/单模型同步到后台`))
      .catch((error) => handleBackendSchemeMutationFailure(`${reason}后台同步`, error));
  };
}

export function createPersistRefreshRecoveryNow(__appScope: Record<string, any>) {
  return () => {
  const { clearRefreshRecoveryProject, refreshRecoveryProjectRef, saveRequiredRef, writeRefreshRecoveryProject } = __appScope;
    if (!saveRequiredRef.current) {
      clearRefreshRecoveryProject();
      return;
    }
    const recoveryProjectSnapshot = refreshRecoveryProjectRef.current;
    if (!recoveryProjectSnapshot) {
      return;
    }
    const recoveryProject = {
      ...recoveryProjectSnapshot,
      savedAt: new Date().toISOString()
    };
    writeRefreshRecoveryProject(recoveryProject);
  };
}

export function createClearRecordSelection(__appScope: Record<string, any>) {
  return () => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedProjectId("");
    setSelectedSchemeId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds([]);
  };
}

export function createBlurLayerManagementDropdownFocus(__appScope: Record<string, any>) {
  return () => {
  const { layerManagementDropdownRef } = __appScope;
    const dropdown = layerManagementDropdownRef.current;
    const activeElement = document.activeElement;
    if (dropdown && activeElement instanceof HTMLElement && dropdown.contains(activeElement)) {
      activeElement.blur();
    }
  };
}

export function createSelectSingleScheme(__appScope: Record<string, any>) {
  return (schemeId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedSchemeId(schemeId);
    setSelectedSchemeIds([schemeId]);
    setSelectedProjectId("");
    setSelectedProjectIds([]);
  };
}

export function createSelectSingleProject(__appScope: Record<string, any>) {
  return (schemeId: string, projectId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedSchemeId(schemeId);
    setSelectedProjectId(projectId);
    setSelectedProjectIds([projectId]);
    setSelectedSchemeIds([]);
  };
}

export function createToggleSchemeSelection(__appScope: Record<string, any>) {
  return (schemeId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedProjectId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds((current) => {
      const next = current.includes(schemeId) ? current.filter((id) => id !== schemeId) : [...current, schemeId];
      setSelectedSchemeId(next[0] ?? "");
      return next;
    });
  };
}

export function createToggleProjectSelection(__appScope: Record<string, any>) {
  return (schemeId: string, projectId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedSchemeIds([]);
    setSelectedProjectIds((current) => {
      const next = current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId];
      setSelectedProjectId(next[0] ?? "");
      setSelectedSchemeId(next.length > 0 ? schemeId : "");
      return next;
    });
  };
}

export function createUndoGraphSnapshotPatchPlan(__appScope: Record<string, any>) {
  return (store: GraphStore, snapshot: UndoSnapshot): UndoGraphSnapshotPatchPlan => {
  const { canvasHeight, canvasWidth, fullUndoGraphDirtyEdgeIds } = __appScope;
    if (
      snapshot.graphSnapshotMode !== "reference" ||
      snapshot.canvasWidth !== canvasWidth ||
      snapshot.canvasHeight !== canvasHeight ||
      snapshot.nodes.length !== store.nodes.length ||
      snapshot.edges.length !== store.edges.length
    ) {
      return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
    }
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const scopedNodeIds = snapshot.graphPatchScope?.nodeIds;
    const scopedEdgeIds = snapshot.graphPatchScope?.edgeIds;
    if (scopedNodeIds || scopedEdgeIds) {
      if (scopedNodeIds) {
        for (const nodeId of scopedNodeIds) {
          const index = store.nodeIndexById.get(nodeId);
          if (index === undefined || snapshot.nodes[index]?.id !== nodeId) {
            return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
          }
          if (store.nodes[index] !== snapshot.nodes[index]) {
            nodeIds.push(nodeId);
          }
        }
      }
      if (scopedEdgeIds) {
        for (const edgeId of scopedEdgeIds) {
          const index = store.edgeIndexById.get(edgeId);
          if (index === undefined || snapshot.edges[index]?.id !== edgeId) {
            return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
          }
          if (store.edges[index] !== snapshot.edges[index]) {
            edgeIds.push(edgeId);
          }
        }
      }
      const dirtyEdgeIds = new Set(edgeIds);
      const changedNodeIds = new Set(nodeIds);
      for (const nodeId of changedNodeIds) {
        for (const edge of store.edgesByNodeId.get(nodeId) ?? []) {
          dirtyEdgeIds.add(edge.id);
        }
      }
      return { mode: "patch", nodeIds, edgeIds, dirtyEdgeIds };
    }
    for (let index = 0; index < snapshot.nodes.length; index += 1) {
      const snapshotNode = snapshot.nodes[index];
      const currentNode = store.nodes[index];
      if (!currentNode || currentNode.id !== snapshotNode.id) {
        return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
      }
      if (currentNode !== snapshotNode) {
        nodeIds.push(snapshotNode.id);
      }
    }
    for (let index = 0; index < snapshot.edges.length; index += 1) {
      const snapshotEdge = snapshot.edges[index];
      const currentEdge = store.edges[index];
      if (!currentEdge || currentEdge.id !== snapshotEdge.id) {
        return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
      }
      if (currentEdge !== snapshotEdge) {
        edgeIds.push(snapshotEdge.id);
      }
    }
    const dirtyEdgeIds = new Set(edgeIds);
    const changedNodeIds = new Set(nodeIds);
    for (const nodeId of changedNodeIds) {
      for (const edge of store.edgesByNodeId.get(nodeId) ?? []) {
        dirtyEdgeIds.add(edge.id);
      }
    }
    return { mode: "patch", nodeIds, edgeIds, dirtyEdgeIds };
  };
}

export function createApplyUndoGraphSnapshot(__appScope: Record<string, any>) {
  return (snapshot: UndoSnapshot) => {
  const { graphStore, graphStorePatchGraphFromArrays, graphStoreSetGraph, latestGraphStoreRef, markRouteEdgesDirty, markStoredRouteEdgesDirty, setGraphStore, undoGraphSnapshotPatchPlan } = __appScope;
    const currentStore = latestGraphStoreRef.current ?? graphStore;
    const plan = undoGraphSnapshotPatchPlan(currentStore, snapshot);
    markRouteEdgesDirty(plan.dirtyEdgeIds);
    markStoredRouteEdgesDirty(plan.dirtyEdgeIds);
    if (plan.mode === "full") {
      setGraphStore((current) => graphStoreSetGraph(current, snapshot.nodes, snapshot.edges));
      return;
    }
    setGraphStore((current) => {
      const currentPlan = undoGraphSnapshotPatchPlan(current, snapshot);
      return currentPlan.mode === "patch"
        ? graphStorePatchGraphFromArrays(current, snapshot.nodes, snapshot.edges, currentPlan.nodeIds, currentPlan.edgeIds)
        : graphStoreSetGraph(current, snapshot.nodes, snapshot.edges);
    });
  };
}

export function createPushUndoSnapshot(__appScope: Record<string, any>) {
  return (markDirty = true, deepModelSnapshot = false, graphPatchScope?: UndoGraphPatchScope) => {
  const { cloneProjectState, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, setHasUnsavedChanges, setUndoStack } = __appScope;
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    const snapshot = cloneProjectState(deepModelSnapshot, graphPatchScope);
    setUndoStack((current) => [...current.slice(-49), snapshot]);
    if (markDirty) {
      setHasUnsavedChanges(true);
    }
  };
}

export function createUniqueUndoScopeIds(__appScope: Record<string, any>) {
  return (ids: Iterable<string | undefined>) => {
    const uniqueIds = new Set<string>();
    for (const id of ids) {
      if (id) {
        uniqueIds.add(id);
      }
    }
    return Array.from(uniqueIds);
  };
}

export function createPushNodeOnlyUndoSnapshot(__appScope: Record<string, any>) {
  return (nodeId: string) => {
  const { pushUndoSnapshot, undoScopeForGraphPatch } = __appScope;
    pushUndoSnapshot(true, false, undoScopeForGraphPatch([nodeId], []));
  };
}

export function createSyncExistingNodesWithTemplateDefinitions(__appScope: Record<string, any>) {
  return (
    template: Pick<DeviceTemplate, "parameterDefinitions">,
    previousDefinitions: readonly DeviceParameterDefinition[] | undefined,
    matchesNode: (node: ModelNode) => boolean
  ) => {
  const { nodes, patchGraphNodes, pushUndoSnapshot, reconcileNodeParamsWithTemplateDefinitions, undoScopeForGraphPatch } = __appScope;
    const nodeUpdates: ModelNode[] = [];
    for (const node of nodes) {
      if (!matchesNode(node)) {
        continue;
      }
      const reconciled = reconcileNodeParamsWithTemplateDefinitions(node, template, previousDefinitions);
      if (reconciled !== node) {
        nodeUpdates.push(reconciled);
      }
    }
    if (nodeUpdates.length === 0) {
      return 0;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(nodeUpdates.map((node) => node.id), []));
    patchGraphNodes(nodeUpdates);
    return nodeUpdates.length;
  };
}

export function createUpdateMeasurementConfig(__appScope: Record<string, any>) {
  return (updater: (current: PlatformMeasurementConfig) => PlatformMeasurementConfig) => {
  const { measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeMeasurementConfig, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    const currentMeasurementConfig = measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig;
    const next = normalizeMeasurementConfig(updater(currentMeasurementConfig));
    measurementConfigDraftRef.current = next;
    setMeasurementConfigDraft(next);
    setMeasurementConfigSaveStatus("idle");
  };
}

export function createPrepareMeasurementConfigDraft(__appScope: Record<string, any>) {
  return () => {
  const { measurementConfig, measurementConfigDraftRef, normalizeMeasurementConfig, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    const nextDraft = normalizeMeasurementConfig(measurementConfig);
    measurementConfigDraftRef.current = nextDraft;
    setMeasurementConfigDraft(nextDraft);
    setMeasurementConfigSaveStatus("idle");
    return nextDraft;
  };
}

export function createOpenMeasurementConfigDialog(__appScope: Record<string, any>) {
  return () => {
  const { prepareMeasurementConfigDraft, setMeasurementConfigDialogOpen } = __appScope;
    prepareMeasurementConfigDraft();
    setMeasurementConfigDialogOpen(true);
  };
}

export function createCloseMeasurementConfigDialog(__appScope: Record<string, any>) {
  return () => {
  const { measurementConfigDraftRef, setMeasurementConfigDialogOpen, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    setMeasurementConfigDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
  };
}

export function createFlushMeasurementConfigDialogDraftInputs(__appScope: Record<string, any>) {
  return () => {
  const { flushSync, measurementConfigDialogRef } = __appScope;
    if (typeof document === "undefined") {
      return;
    }
    const activeElement = document.activeElement;
    const dialog = measurementConfigDialogRef?.current;
    if (!dialog || !activeElement || !dialog.contains(activeElement) || typeof activeElement.blur !== "function") {
      return;
    }
    const blurFocusedElement = () => activeElement.blur();
    if (typeof flushSync === "function") {
      flushSync(blurFocusedElement);
      return;
    }
    blurFocusedElement();
  };
}

const duplicateMeasurementTypeValues = (measurementTypes: MeasurementTypeDefinition[], field: "id" | "name") => {
  const counts = new Map<string, number>();
  for (const type of measurementTypes) {
    const value = String(type[field] ?? "").trim();
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
};

const measurementTypeDuplicateMessage = (measurementTypes: MeasurementTypeDefinition[]) => {
  const duplicateIds = duplicateMeasurementTypeValues(measurementTypes, "id");
  const duplicateNames = duplicateMeasurementTypeValues(measurementTypes, "name");
  const messages: string[] = [];
  if (duplicateIds.length > 0) {
    messages.push(`量测类型ID不能重复：${duplicateIds.join("、")}`);
  }
  if (duplicateNames.length > 0) {
    messages.push(`量测类型名称不能重复：${duplicateNames.join("、")}`);
  }
  return messages.join("\n");
};

export function createSaveMeasurementConfigDialog(__appScope: Record<string, any>) {
  return async () => {
  const { backendMeasurementConfigLoadedRef, flushMeasurementConfigDialogDraftInputs, lastPersistedMeasurementConfigPayloadRef, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeMeasurementConfig, saveBackendMeasurementConfigPayload, serializeMeasurementConfigForStorage, setMeasurementConfig, setMeasurementConfigDraft, setMeasurementConfigSaveStatus, writeMeasurementConfig, writeOperationLog } = __appScope;
    flushMeasurementConfigDialogDraftInputs?.();
    const normalizedMeasurementConfig = normalizeMeasurementConfig(measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig);
    const duplicateMessage = measurementTypeDuplicateMessage(normalizedMeasurementConfig.measurementTypes);
    if (duplicateMessage) {
      setMeasurementConfigSaveStatus("error");
      window.alert(duplicateMessage);
      return;
    }
    const normalizedMeasurementConfigPayload = serializeMeasurementConfigForStorage(normalizedMeasurementConfig);
    setMeasurementConfigSaveStatus("saving");
    writeMeasurementConfig(normalizedMeasurementConfig);
    setMeasurementConfig(normalizedMeasurementConfig);
    measurementConfigDraftRef.current = normalizedMeasurementConfig;
    setMeasurementConfigDraft(normalizedMeasurementConfig);
    lastPersistedMeasurementConfigPayloadRef.current = normalizedMeasurementConfigPayload;
    try {
      await saveBackendMeasurementConfigPayload(normalizedMeasurementConfigPayload);
      backendMeasurementConfigLoadedRef.current = true;
      setMeasurementConfigSaveStatus("saved");
      writeOperationLog("保存动态量测配置");
    } catch {
      setMeasurementConfigSaveStatus("error");
      window.alert("量测配置已保存到本地，但保存到后台失败，请检查后台服务。");
    }
  };
}

export function createUpdateMeasurementType(__appScope: Record<string, any>) {
  return (typeId: string, patch: Partial<MeasurementTypeDefinition>) => {
  const { updateMeasurementConfig } = __appScope;
    updateMeasurementConfig((current) => ({
      ...current,
      measurementTypes: current.measurementTypes.map((item) => item.id === typeId ? { ...item, ...patch } : item)
    }));
  };
}

export function createAddMeasurementType(__appScope: Record<string, any>) {
  return () => {
  const { measurementConfig, measurementConfigDraft, measurementConfigDraftRef, updateMeasurementConfig } = __appScope;
    const name = window.prompt("请输入量测类型名称", "新量测");
    const normalizedName = name?.trim();
    if (!normalizedName) {
      return;
    }
    const currentMeasurementConfig = measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig;
    const existingNames = new Set(currentMeasurementConfig.measurementTypes.map((type) => String(type.name ?? "").trim()).filter(Boolean));
    if (existingNames.has(normalizedName)) {
      window.alert(`量测类型名称不能重复：${normalizedName}`);
      return;
    }
    const existingIds = new Set(currentMeasurementConfig.measurementTypes.map((type) => String(type.id ?? "").trim()).filter(Boolean));
    const idBase = `customMeasurement${Date.now().toString(36)}`;
    let id = idBase;
    let suffix = 1;
    while (existingIds.has(id)) {
      id = `${idBase}_${suffix}`;
      suffix += 1;
    }
    updateMeasurementConfig((current) => ({
      ...current,
      measurementTypes: [
        ...current.measurementTypes,
        {
          id,
          key: id,
          name: normalizedName,
          shortLabel: normalizedName,
          defaultUnit: "",
          valueType: "number",
          defaultDecimals: 3,
          defaultColor: "#334155",
          defaultFontFamily: "Arial",
          defaultFontSize: 14,
          defaultFontWeight: "500",
          defaultVisible: true
        }
      ]
    }));
  };
}

export function createDeleteMeasurementType(__appScope: Record<string, any>) {
  return (typeId: string) => {
  const { updateMeasurementConfig } = __appScope;
    if (!window.confirm("删除该量测类型后，设备类型默认绑定里也会同步移除，是否继续？")) {
      return;
    }
    updateMeasurementConfig((current) => ({
      measurementTypes: current.measurementTypes.filter((item) => item.id !== typeId),
      deviceProfiles: current.deviceProfiles.map((profile) => ({
        ...profile,
        items: profile.items.filter((item) => item.measurementTypeId !== typeId)
      }))
    }));
  };
}

export function createSetMeasurementProfileItems(__appScope: Record<string, any>) {
  return (deviceKind: string, items: DeviceMeasurementProfileItem[]) => {
  const { updateMeasurementConfig } = __appScope;
    updateMeasurementConfig((current) => {
      const exists = current.deviceProfiles.some((profile) => profile.deviceKind === deviceKind);
      return {
        ...current,
        deviceProfiles: exists
          ? current.deviceProfiles.map((profile) => profile.deviceKind === deviceKind ? { ...profile, items } : profile)
          : [...current.deviceProfiles, { deviceKind, items }]
      };
    });
  };
}

export function createCreateMeasurementProfileItem(__appScope: Record<string, any>) {
  return (): DeviceMeasurementProfileItem | null => {
  const { measurementConfig, measurementConfigDraft } = __appScope;
    const type = (measurementConfigDraft ?? measurementConfig).measurementTypes[0];
    if (!type) {
      return null;
    }
    return {
      name: type.name,
      measurementTypeId: type.id,
      position: "device",
      associatedField: type.id,
      defaultVisible: type.defaultVisible
    };
  };
}

export function createAddMeasurementProfileItem(__appScope: Record<string, any>) {
  return (deviceKind: string) => {
  const { createMeasurementProfileItem, editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const item = createMeasurementProfileItem();
    if (!item) {
      window.alert("请先配置至少一个量测类型。");
      return;
    }
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    setMeasurementProfileItems(deviceKind, [...currentItems, item]);
  };
}

export function createUpdateMeasurementProfileItem(__appScope: Record<string, any>) {
  return (deviceKind: string, index: number, patch: Partial<DeviceMeasurementProfileItem>) => {
  const { editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    if (index < 0 || index >= currentItems.length) {
      return;
    }
    setMeasurementProfileItems(deviceKind, currentItems.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };
}

export function createDeleteMeasurementProfileItem(__appScope: Record<string, any>) {
  return (deviceKind: string, index: number) => {
  const { editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    setMeasurementProfileItems(deviceKind, currentItems.filter((_, itemIndex) => itemIndex !== index));
  };
}

export function createMoveMeasurementProfileItem(__appScope: Record<string, any>) {
  return (deviceKind: string, index: number, direction: -1 | 1) => {
  const { editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentItems.length) {
      return;
    }
    const items = [...currentItems];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    setMeasurementProfileItems(deviceKind, items);
  };
}

export function createUpdateProjectMeasurementsWithUndo(__appScope: Record<string, any>) {
  return (updater: (current: ProjectMeasurementConfig) => ProjectMeasurementConfig, logText?: string) => {
  const { nodes, normalizeProjectMeasurements, pushUndoSnapshot, setProjectMeasurements, writeOperationLog } = __appScope;
    pushUndoSnapshot();
    setProjectMeasurements((current) => normalizeProjectMeasurements(updater(current), nodes));
    if (logText) {
      writeOperationLog(logText);
    }
  };
}

export function createAddDefaultMeasurementsToNode(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { createDefaultMeasurementGroupsForNode, isStaticNode, measurementConfig, updateProjectMeasurementsWithUndo, upsertMeasurementGroups } = __appScope;
    if (isStaticNode(node)) {
      return;
    }
    const groups = createDefaultMeasurementGroupsForNode(node, measurementConfig);
    if (groups.length === 0) {
      window.alert("该设备类型还没有绑定默认量测，请先在基础页配置设备类型可用量测。");
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current) => upsertMeasurementGroups(current, groups),
      `添加动态量测：${node.name}`
    );
  };
}

export function createRemoveMeasurementsFromNode(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { removeMeasurementGroupForNode, updateProjectMeasurementsWithUndo } = __appScope;
    updateProjectMeasurementsWithUndo(
      (current) => removeMeasurementGroupForNode(current, node.id),
      `删除动态量测：${node.name}`
    );
  };
}

export function createMeasurementGroupShellOffsetForNode(__appScope: Record<string, any>) {
  return (node: ModelNode, terminalId?: string): Point => {
    const rotateOffset = (offset: Point): Point => {
      const radians = degreesToRadians(node.rotation);
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return {
        x: Math.round((offset.x * cos - offset.y * sin) * 10) / 10,
        y: Math.round((offset.x * sin + offset.y * cos) * 10) / 10
      };
    };
    const terminal = terminalId ? node.terminals.find((item) => item.id === terminalId) : undefined;
    if (!terminal) {
      return { x: 0, y: Math.round(node.size.height / 2 + 42) };
    }
    if (Math.abs(terminal.anchor.x) >= Math.abs(terminal.anchor.y) && Math.abs(terminal.anchor.x) > 0.001) {
      return rotateOffset({ x: Math.sign(terminal.anchor.x) * 54, y: 0 });
    }
    if (Math.abs(terminal.anchor.y) > 0.001) {
      return rotateOffset({ x: 0, y: Math.sign(terminal.anchor.y) * 42 });
    }
    return rotateOffset({ x: 0, y: 42 });
  };
}

export function createMeasurementSourcePointForNodeItem(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    item: Pick<DeviceMeasurementProfileItem, "measurementTypeId" | "role" | "associatedField">,
    terminalId?: string
  ) => {
    const sourceKey = item.associatedField || `${item.role ? `${item.role}.` : ""}${item.measurementTypeId}`;
    return terminalId ? `${node.id}.${terminalId}.${sourceKey}` : `${node.id}.${sourceKey}`;
  };
}

export function createMeasurementTypeOptionsForMeasurementGroup(__appScope: Record<string, any>) {
  return (node: ModelNode, group?: Pick<MeasurementGroup, "terminalId">): MeasurementTypeDefinition[] => {
  const { measurementConfig, measurementProfileItemsForMeasurementGroup } = __appScope;
    const profileItems = measurementProfileItemsForMeasurementGroup(node, group?.terminalId);
    const allowedTypeIds = new Set(profileItems.map((item) => item.measurementTypeId));
    return allowedTypeIds.size > 0
      ? measurementConfig.measurementTypes.filter((type) => allowedTypeIds.has(type.id))
      : measurementConfig.measurementTypes;
  };
}

export function createCreateMeasurementItemForNode(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    measurementTypeId?: string,
    terminalId?: string,
    existingItems: readonly MeasurementItemBinding[] = []
  ): MeasurementItemBinding | null => {
  const { measurementConfig, measurementProfileItemsForMeasurementGroup, measurementSourcePointForNodeItem, measurementTypeById } = __appScope;
    const profileItems = measurementProfileItemsForMeasurementGroup(node, terminalId);
    const usedTypeIds = new Set(existingItems.map((item) => item.measurementTypeId));
    const profileItem = measurementTypeId
      ? profileItems.find((item) => item.measurementTypeId === measurementTypeId)
      : profileItems.find((item) => !usedTypeIds.has(item.measurementTypeId)) ?? profileItems[0];
    const type = (measurementTypeId ? measurementTypeById.get(measurementTypeId) : undefined) ??
      (profileItem ? measurementTypeById.get(profileItem.measurementTypeId) : undefined) ??
      measurementConfig.measurementTypes[0];
    if (!type) {
      return null;
    }
    const sourcePoint = measurementSourcePointForNodeItem(
      node,
      { measurementTypeId: type.id, role: profileItem?.role, associatedField: profileItem?.associatedField },
      terminalId
    );
    return {
      id: `measurement-${node.id}${terminalId ? `-${terminalId}` : ""}-${type.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: profileItem?.name ?? type.name,
      measurementTypeId: type.id,
      role: profileItem?.role,
      sourcePoint,
      visible: profileItem?.defaultVisible ?? type.defaultVisible,
      labelOverride: profileItem?.name ?? profileItem?.labelOverride,
      unitOverride: profileItem?.unitOverride,
      decimalsOverride: profileItem?.decimalsOverride,
      styleOverride: profileItem?.styleOverride
    };
  };
}

export function createUpdateMeasurementGroupById(__appScope: Record<string, any>) {
  return (groupId: string, updater: (group: MeasurementGroup) => MeasurementGroup, logText?: string) => {
  const { updateProjectMeasurementsWithUndo } = __appScope;
    updateProjectMeasurementsWithUndo(
      (current) => ({
        version: 1,
        groups: current.groups.map((group) => group.id === groupId ? updater(group) : group)
      }),
      logText
    );
  };
}

export function createUpdateSelectedMeasurementGroup(__appScope: Record<string, any>) {
  return (updater: (group: MeasurementGroup) => MeasurementGroup, logText?: string) => {
  const { selectedMeasurementGroup, updateMeasurementGroupById } = __appScope;
    if (!selectedMeasurementGroup) {
      return;
    }
    updateMeasurementGroupById(selectedMeasurementGroup.id, updater, logText);
  };
}

export function createUpdateSelectedMeasurementGroups(__appScope: Record<string, any>) {
  return (updater: (group: MeasurementGroup) => MeasurementGroup, logText?: string) => {
  const { selectedMeasurementGroupIdSet, updateProjectMeasurementsWithUndo } = __appScope;
    if (selectedMeasurementGroupIdSet.size === 0) {
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current) => ({
        version: 1,
        groups: current.groups.map((group) => selectedMeasurementGroupIdSet.has(group.id) ? updater(group) : group)
      }),
      logText
    );
  };
}

export function createAddMeasurementItemToGroup(__appScope: Record<string, any>) {
  return (node: ModelNode, group: MeasurementGroup) => {
  const { createMeasurementItemForNode, isStaticNode, updateProjectMeasurementsWithUndo, upsertMeasurementGroup } = __appScope;
    if (isStaticNode(node)) {
      return;
    }
    const item = createMeasurementItemForNode(node, undefined, group.terminalId, group.items);
    if (!item) {
      window.alert("请先配置至少一个量测类型。");
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current) => upsertMeasurementGroup(current, { ...group, items: [...group.items, item] }),
      `添加量测项：${node.name}`
    );
  };
}

export function createAddMeasurementItemToNode(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { addMeasurementItemToGroup, createMeasurementGroupShellForNode, isStaticNode, measurementGroupForNode, projectMeasurements } = __appScope;
    if (isStaticNode(node)) {
      return;
    }
    const existingGroup = measurementGroupForNode(projectMeasurements, node.id);
    const group = existingGroup ?? createMeasurementGroupShellForNode(node);
    addMeasurementItemToGroup(node, group);
  };
}

export function createUpdateMeasurementItem(__appScope: Record<string, any>) {
  return (
    groupId: string,
    itemId: string,
    updater: (item: MeasurementItemBinding) => MeasurementItemBinding,
    logText?: string
  ) => {
  const { updateMeasurementGroupById } = __appScope;
    updateMeasurementGroupById(groupId, (group) => ({
      ...group,
      items: group.items.map((item) => item.id === itemId ? updater(item) : item)
    }), logText);
  };
}

export function createRemoveMeasurementItem(__appScope: Record<string, any>) {
  return (groupId: string, itemId: string) => {
  const { updateMeasurementGroupById } = __appScope;
    updateMeasurementGroupById(groupId, (group) => ({
      ...group,
      items: group.items.filter((item) => item.id !== itemId)
    }), "删除量测项");
  };
}

export function createCreateMeasurementEditorGroupForPosition(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    terminalId: string | undefined,
    template?: MeasurementGroup
  ): MeasurementGroup => {
  const { applyMeasurementEditorGroupSettings, createMeasurementEditorGroupShellForNode } = __appScope;
    const group = createMeasurementEditorGroupShellForNode(node, terminalId);
    return template ? applyMeasurementEditorGroupSettings(group, template) : group;
  };
}

export function createUpdateMeasurementEditorGroupSettings(__appScope: Record<string, any>) {
  return (updater: (group: MeasurementGroup) => MeasurementGroup) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current) => current
      ? {
          ...current,
          drafts: current.drafts.map((group) => updater(group))
        }
      : current
    );
  };
}

export function createUpdateMeasurementEditorDraftItem(__appScope: Record<string, any>) {
  return (
    groupId: string,
    itemId: string,
    updater: (item: MeasurementItemBinding) => MeasurementItemBinding
  ) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current) => current
      ? {
          ...current,
          drafts: current.drafts.map((group) => group.id === groupId
            ? { ...group, items: group.items.map((item) => item.id === itemId ? updater(item) : item) }
            : group
          )
        }
      : current
    );
  };
}

export function createAddMeasurementEditorDraftItem(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { createMeasurementEditorGroupForPosition, createMeasurementItemForNode, measurementEditorDialog, setMeasurementEditorDialog } = __appScope;
    if (!measurementEditorDialog) {
      return;
    }
    const terminalId = undefined;
    const draft = measurementEditorDialog.drafts.find((group) => group.terminalId === terminalId);
    const existingItems = draft?.items ?? [];
    const item = createMeasurementItemForNode(
      node,
      undefined,
      terminalId,
      existingItems
    );
    if (!item) {
      window.alert("请先配置至少一个量测类型。");
      return;
    }
    setMeasurementEditorDialog((current) => {
      if (!current) {
        return current;
      }
      const targetGroup = current.drafts.find((group) => group.terminalId === terminalId);
      const template = current.drafts[0];
      if (!targetGroup) {
        return {
          ...current,
          drafts: [
            ...current.drafts,
            { ...createMeasurementEditorGroupForPosition(node, terminalId, template), items: [item] }
          ]
        };
      }
      return {
        ...current,
        drafts: current.drafts.map((group) => group.id === targetGroup.id
          ? { ...group, items: [...group.items, item] }
          : group
        )
      };
    });
  };
}

export function createRemoveMeasurementEditorDraftItem(__appScope: Record<string, any>) {
  return (groupId: string, itemId: string) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current) => current
      ? {
          ...current,
          drafts: current.drafts.map((group) => group.id === groupId
            ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
            : group
          )
        }
      : current
    );
  };
}

export function createMoveMeasurementEditorDraftItem(__appScope: Record<string, any>) {
  return (groupId: string, itemId: string, direction: -1 | 1) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current) => current
      ? {
          ...current,
          drafts: current.drafts.map((group) => {
            if (group.id !== groupId) {
              return group;
            }
            const index = group.items.findIndex((item) => item.id === itemId);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= group.items.length) {
              return group;
            }
            const items = [...group.items];
            [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
            return { ...group, items };
          })
        }
      : current
    );
  };
}

export function createUpdateMeasurementEditorDraftItemPosition(__appScope: Record<string, any>) {
  return (
    node: ModelNode,
    sourceGroupId: string,
    itemId: string,
    terminalIdValue: string
  ) => {
  const { createMeasurementEditorGroupForPosition, measurementSourcePointForNodeItem, setMeasurementEditorDialog } = __appScope;
    const terminalId = terminalIdValue || undefined;
    setMeasurementEditorDialog((current) => {
      if (!current) {
        return current;
      }
      const sourceGroup = current.drafts.find((group) => group.id === sourceGroupId);
      const item = sourceGroup?.items.find((candidate) => candidate.id === itemId);
      if (!sourceGroup || !item || sourceGroup.terminalId === terminalId) {
        return current;
      }
      const movedItem: MeasurementItemBinding = {
        ...item,
        sourcePoint: measurementSourcePointForNodeItem(node, item, terminalId)
      };
      const template = current.drafts[0] ?? sourceGroup;
      const existingTargetGroup = current.drafts.find((group) => group.terminalId === terminalId);
      const targetGroup = existingTargetGroup ?? createMeasurementEditorGroupForPosition(node, terminalId, template);
      const targetGroupId = targetGroup.id;
      const draftsWithoutItem = current.drafts.map((group) => group.id === sourceGroupId
        ? { ...group, items: group.items.filter((candidate) => candidate.id !== itemId) }
        : group
      );
      const targetExists = draftsWithoutItem.some((group) => group.id === targetGroupId);
      const drafts = targetExists
        ? draftsWithoutItem.map((group) => group.id === targetGroupId
          ? { ...group, items: [...group.items, movedItem] }
          : group
        )
        : [...draftsWithoutItem, { ...targetGroup, items: [movedItem] }];
      return {
        ...current,
        drafts
      };
    });
  };
}

export function createDuplicateMeasurementEditorItemNames(__appScope: Record<string, any>) {
  return (drafts: readonly MeasurementGroup[]) => {
  const { measurementEditorItemName } = __appScope;
    const seen = new Map<string, string>();
    const duplicates = new Set<string>();
    for (const group of drafts) {
      for (const item of group.items) {
        const name = measurementEditorItemName(item);
        const key = name.toLowerCase();
        if (!key) {
          continue;
        }
        if (seen.has(key)) {
          duplicates.add(seen.get(key) ?? name);
        } else {
          seen.set(key, name);
        }
      }
    }
    return Array.from(duplicates);
  };
}

export function createConfirmMeasurementEditorDialog(__appScope: Record<string, any>) {
  return () => {
  const { cloneMeasurementGroupForDraft, duplicateMeasurementEditorItemNames, measurementEditorDialog, measurementEditorItemName, nodeById, setMeasurementEditorDialog, updateProjectMeasurementsWithUndo } = __appScope;
    if (!measurementEditorDialog) {
      return;
    }
    const node = nodeById.get(measurementEditorDialog.nodeId);
    if (!node) {
      setMeasurementEditorDialog(null);
      return;
    }
    const duplicateNames = duplicateMeasurementEditorItemNames(measurementEditorDialog.drafts);
    if (duplicateNames.length > 0) {
      window.alert(`同一个设备下量测名称不能重复：${duplicateNames.join("、")}`);
      return;
    }
    const drafts = measurementEditorDialog.drafts
      .filter((group) => group.items.length > 0)
      .map((group) => cloneMeasurementGroupForDraft({
        ...group,
        nodeId: node.id,
        items: group.items.map((item) => ({
          ...item,
          name: measurementEditorItemName(item)
        }))
      }));
    updateProjectMeasurementsWithUndo(
      (current) => ({
        version: 1,
        groups: [
          ...current.groups.filter((group) => group.nodeId !== node.id),
          ...drafts
        ]
      }),
      `修改量测信息：${node.name}`
    );
    setMeasurementEditorDialog(null);
  };
}

export function createRenderSelectedNodeMeasurementTable(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { BufferedTextInput, DeferredColorInput, Fragment, addDefaultMeasurementsToNode, addMeasurementItemToGroup, addMeasurementItemToNode, button, div, isBrowseMode, measurementConfig, measurementGroupBackgroundColor, measurementTypeById, measurementTypeOptionsForMeasurementGroup, option, removeMeasurementItem, removeMeasurementsFromNode, select, selectedMeasurementGroups, span, table, tbody, td, th, tr, updateMeasurementItem, updateSelectedMeasurementGroups } = __appScope;
    const selectedMeasurementGroupCommonDraft = selectedMeasurementGroups[0];
    const renderCommonMeasurementGroupRows = () => {
      if (!selectedMeasurementGroupCommonDraft) {
        return null;
      }
      return (
        <>
          <tr>
            <th>量测显示</th>
            <td>
              <select
                value={selectedMeasurementGroupCommonDraft.visible ? "1" : "0"}
                disabled={isBrowseMode}
                onChange={(event) => updateSelectedMeasurementGroups((current) => ({ ...current, visible: event.target.value === "1" }))}
              >
                <option value="1">显示</option>
                <option value="0">隐藏</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>量测布局</th>
            <td>
              <select
                value={selectedMeasurementGroupCommonDraft.layout}
                disabled={isBrowseMode}
                onChange={(event) => updateSelectedMeasurementGroups((current) => ({ ...current, layout: event.target.value as MeasurementGroup["layout"] }))}
              >
                <option value="vertical">竖向</option>
                <option value="horizontal">横向</option>
                <option value="grid">两列</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>标签显示</th>
            <td>
              <select
                aria-label="量测标签显示"
                value={selectedMeasurementGroupCommonDraft.labelVisible === false ? "0" : "1"}
                disabled={isBrowseMode}
                onChange={(event) => updateSelectedMeasurementGroups((current) => ({ ...current, labelVisible: event.target.value === "1" }))}
              >
                <option value="1">显示</option>
                <option value="0">隐藏</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>单位显示</th>
            <td>
              <select
                aria-label="量测单位显示"
                value={selectedMeasurementGroupCommonDraft.unitVisible === false ? "0" : "1"}
                disabled={isBrowseMode}
                onChange={(event) => updateSelectedMeasurementGroups((current) => ({ ...current, unitVisible: event.target.value === "1" }))}
              >
                <option value="1">显示</option>
                <option value="0">隐藏</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>背景显示</th>
            <td>
              <select
                value={measurementGroupBackgroundColor(selectedMeasurementGroupCommonDraft) === "transparent" ? "0" : "1"}
                disabled={isBrowseMode}
                onChange={(event) => updateSelectedMeasurementGroups((current) => ({
                  ...current,
                  backgroundColor: event.target.value === "1"
                    ? current.backgroundColor === "transparent" ? "#ffffff" : current.backgroundColor ?? "#ffffff"
                    : "transparent"
                }), "修改量测组背景显示")}
              >
                <option value="1">显示</option>
                <option value="0">透明</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>背景颜色</th>
            <td>
              <DeferredColorInput
                value={selectedMeasurementGroupCommonDraft.backgroundColor ?? ""}
                fallback="#ffffff"
                disabled={isBrowseMode || measurementGroupBackgroundColor(selectedMeasurementGroupCommonDraft) === "transparent"}
                aria-label="量测组背景颜色"
                onCommit={(value) => updateSelectedMeasurementGroups((current) => ({ ...current, backgroundColor: value }), "修改量测组背景颜色")}
              />
            </td>
          </tr>
          <tr>
            <th>边框样式</th>
            <td>
              <select
                value={selectedMeasurementGroupCommonDraft.borderStyle ?? "solid"}
                disabled={isBrowseMode}
                onChange={(event) => updateSelectedMeasurementGroups((current) => ({
                  ...current,
                  borderStyle: event.target.value as MeasurementGroup["borderStyle"],
                  borderWidth: current.borderWidth ?? 1
                }), "修改量测组边框样式")}
              >
                <option value="solid">实线</option>
                <option value="dashed">虚线</option>
                <option value="dotted">点线</option>
                <option value="none">无边框</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>边框颜色</th>
            <td>
              <DeferredColorInput
                value={selectedMeasurementGroupCommonDraft.borderColor ?? ""}
                fallback="#64748b"
                disabled={isBrowseMode || (selectedMeasurementGroupCommonDraft.borderStyle ?? "solid") === "none"}
                aria-label="量测组边框颜色"
                onCommit={(value) => updateSelectedMeasurementGroups((current) => ({ ...current, borderColor: value }), "修改量测组边框颜色")}
              />
            </td>
          </tr>
          <tr>
            <th>边框宽度</th>
            <td>
              <BufferedTextInput
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={selectedMeasurementGroupCommonDraft.borderWidth ?? 1}
                disabled={isBrowseMode || (selectedMeasurementGroupCommonDraft.borderStyle ?? "solid") === "none"}
                aria-label="量测组边框宽度"
                onCommit={(nextValue) => updateSelectedMeasurementGroups((current) => ({
                  ...current,
                  borderWidth: clampNumber(Number(nextValue), 0, 12)
                }), "修改量测组边框宽度")}
              />
            </td>
          </tr>
        </>
      );
    };

    const renderGroupRows = (group: MeasurementGroup, groupIndex: number) => {
      const terminal = group.terminalId ? node.terminals.find((item) => item.id === group.terminalId) : undefined;
      const groupTitle = terminal?.label
        ? `${terminal.label}量测组`
        : group.terminalId
          ? `${group.terminalId}量测组`
          : selectedMeasurementGroups.length > 1 ? `量测组${groupIndex + 1}` : "量测组";
      return (
        <Fragment key={group.id}>
          <tr className="measurement-section-row measurement-group-section-row">
            <th>{groupTitle}</th>
            <td>
              <div className="measurement-sidebar-actions">
                <span className="graph-readonly-value">{terminal ? `端子：${terminal.label || terminal.id}` : "设备级量测"}</span>
                <button type="button" disabled={isBrowseMode} onClick={() => addMeasurementItemToGroup(node, group)}>添加量测项</button>
              </div>
            </td>
          </tr>
          {group.items.length === 0 && (
            <tr>
              <th>量测内容</th>
              <td><span className="graph-readonly-value">该端子未定义量测</span></td>
            </tr>
          )}
          {group.items.map((item, itemIndex) => {
            const type = measurementTypeById.get(item.measurementTypeId) ?? measurementConfig.measurementTypes[0];
            const measurementTypeOptions = measurementTypeOptionsForMeasurementGroup(node, group);
            const itemColor = item.styleOverride?.color ?? type?.defaultColor ?? "#334155";
            const itemFontSize = item.styleOverride?.fontSize ?? type?.defaultFontSize ?? 14;
            return (
              <Fragment key={item.id}>
                <tr className="measurement-item-row">
                  <th>{`量测${itemIndex + 1}`}</th>
                  <td>
                    <div className="measurement-item-toolbar">
                      <select
                        value={item.measurementTypeId}
                        disabled={isBrowseMode}
                        onChange={(event) => {
                          const nextTypeId = event.target.value;
                          updateMeasurementItem(group.id, item.id, (current) => ({
                            ...current,
                            measurementTypeId: nextTypeId,
                            sourcePoint: current.sourcePoint || (group.terminalId ? `${node.id}.${group.terminalId}.${nextTypeId}` : `${node.id}.${nextTypeId}`)
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
                      <select
                        value={item.visible === false ? "0" : "1"}
                        disabled={isBrowseMode}
                        onChange={(event) => updateMeasurementItem(group.id, item.id, (current) => ({ ...current, visible: event.target.value === "1" }))}
                      >
                        <option value="1">显示</option>
                        <option value="0">隐藏</option>
                      </select>
                      <button type="button" disabled={isBrowseMode} onClick={() => removeMeasurementItem(group.id, item.id)}>删除</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>测点</th>
                  <td>
                    <BufferedTextInput
                      value={item.sourcePoint}
                      disabled={isBrowseMode}
                      placeholder={group.terminalId ? `${node.id}.${group.terminalId}.${item.measurementTypeId}` : `${node.id}.${item.measurementTypeId}`}
                      onCommit={(nextValue) => updateMeasurementItem(group.id, item.id, (current) => ({ ...current, sourcePoint: nextValue }))}
                    />
                  </td>
                </tr>
                <tr>
                  <th>显示</th>
                  <td>
                    <div className="measurement-item-display-grid">
                      <BufferedTextInput
                        value={item.labelOverride ?? ""}
                        disabled={isBrowseMode}
                        placeholder={type?.shortLabel ?? "标签"}
                        aria-label="量测标签"
                        onCommit={(nextValue) => updateMeasurementItem(group.id, item.id, (current) => ({ ...current, labelOverride: nextValue || undefined }))}
                      />
                      <BufferedTextInput
                        value={item.unitOverride ?? ""}
                        disabled={isBrowseMode}
                        placeholder={type?.defaultUnit ?? "单位"}
                        aria-label="量测单位"
                        onCommit={(nextValue) => updateMeasurementItem(group.id, item.id, (current) => ({ ...current, unitOverride: nextValue || undefined }))}
                      />
                      <BufferedTextInput
                        type="number"
                        min="0"
                        max="8"
                        value={item.decimalsOverride ?? ""}
                        disabled={isBrowseMode}
                        placeholder={String(type?.defaultDecimals ?? 3)}
                        aria-label="量测小数位"
                        onCommit={(nextValue) => updateMeasurementItem(group.id, item.id, (current) => ({
                          ...current,
                          decimalsOverride: nextValue === "" ? undefined : Number(nextValue)
                        }))}
                      />
                      <DeferredColorInput
                        value={itemColor}
                        disabled={isBrowseMode}
                        aria-label="量测颜色"
                        onCommit={(value) => updateMeasurementItem(group.id, item.id, (current) => ({
                          ...current,
                          styleOverride: { ...(current.styleOverride ?? {}), color: value }
                        }))}
                      />
                      <BufferedTextInput
                        type="number"
                        min="6"
                        max="96"
                        value={itemFontSize}
                        disabled={isBrowseMode}
                        aria-label="量测字号"
                        onCommit={(nextValue) => updateMeasurementItem(group.id, item.id, (current) => ({
                          ...current,
                          styleOverride: { ...(current.styleOverride ?? {}), fontSize: Number(nextValue) }
                        }))}
                      />
                    </div>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </Fragment>
      );
    };

    return (
      <table className="param-table selected-node-measurement-table">
        <tbody>
          <tr className="measurement-section-row">
            <th>动态量测</th>
            <td>
              <div className="measurement-sidebar-actions">
                <button
                  type="button"
                  disabled={isBrowseMode || selectedMeasurementGroups.length > 0}
                  onClick={() => addDefaultMeasurementsToNode(node)}
                >
                  添加默认量测
                </button>
                <button
                  type="button"
                  disabled={isBrowseMode}
                  onClick={() => addMeasurementItemToNode(node)}
                >
                  添加量测项
                </button>
                <button
                  type="button"
                  disabled={isBrowseMode || selectedMeasurementGroups.length === 0}
                  onClick={() => removeMeasurementsFromNode(node)}
                >
                  删除量测
                </button>
              </div>
            </td>
          </tr>
          {selectedMeasurementGroups.length > 0 ? (
            <>
              {renderCommonMeasurementGroupRows()}
              {selectedMeasurementGroups.map(renderGroupRows)}
            </>
          ) : (
            <tr>
              <th>量测内容</th>
              <td><span className="graph-readonly-value">当前设备未添加显示量测</span></td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };
}

export function createBeginMeasurementDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>, group: MeasurementGroup) => {
  const { isBrowseMode, screenToSvgPoint, setMeasurementDrag, svgRef } = __appScope;
    if (isBrowseMode || event.button !== 0 || !svgRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const startPoint = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    setMeasurementDrag({
      groupId: group.id,
      pointerId: event.pointerId,
      startPoint,
      startOffset: { ...group.offset },
      historyCaptured: false
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createUpdateMeasurementDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { measurementDrag, measurementOffsetScaleForNode, nodeById, projectMeasurements, pushUndoSnapshot, screenToSvgPoint, setMeasurementDrag, setProjectMeasurements, svgRef } = __appScope;
    if (!measurementDrag || measurementDrag.pointerId !== event.pointerId || !svgRef.current) {
      return false;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    if (!measurementDrag.historyCaptured) {
      pushUndoSnapshot();
      setMeasurementDrag({ ...measurementDrag, historyCaptured: true });
    }
    const draggedGroup = projectMeasurements.groups.find((group) => group.id === measurementDrag.groupId);
    const draggedNode = draggedGroup ? nodeById.get(draggedGroup.nodeId) : undefined;
    const offsetScale = draggedNode ? measurementOffsetScaleForNode(draggedNode) : { x: 1, y: 1 };
    const offset = {
      x: Math.round((measurementDrag.startOffset.x + (point.x - measurementDrag.startPoint.x) / offsetScale.x) * 10) / 10,
      y: Math.round((measurementDrag.startOffset.y + (point.y - measurementDrag.startPoint.y) / offsetScale.y) * 10) / 10
    };
    setProjectMeasurements((current) => ({
      version: 1,
      groups: current.groups.map((group) => group.id === measurementDrag.groupId ? { ...group, offset, anchor: "custom" } : group)
    }));
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
}

export function createFinishMeasurementDrag(__appScope: Record<string, any>) {
  return (pointerId?: number) => {
  const { measurementDrag, setHasUnsavedChanges, setMeasurementDrag, writeOperationLog } = __appScope;
    if (!measurementDrag || (pointerId !== undefined && measurementDrag.pointerId !== pointerId)) {
      return false;
    }
    setMeasurementDrag(null);
    if (measurementDrag.historyCaptured) {
      setHasUnsavedChanges(true);
      writeOperationLog("调整动态量测位置");
    }
    return true;
  };
}
