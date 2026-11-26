/** 图存储状态更新、路由缓存失效与设备量测配置域工厂模块。 */

import type { GraphMeasurementScope } from "./appScopeTypes";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, SetStateAction } from "react";
import { type CanvasResizeEdge, type CanvasResizePreviewRect, type CanvasViewBox } from "../canvasViewport";
import type { MeasurementGroup } from "../measurements";
import type { GraphStore } from "../graphStore";
import {
  measurementOffsetScaleForNode,
  measurementRowLineHeight,
  resolveMeasurementItemDisplay,
  formatMeasurementDisplayValue,
  MEASUREMENT_FONT_FAMILY,
  MEASUREMENT_LABEL_VISUAL_WIDTH,
  MEASUREMENT_VALUE_TOTAL_WIDTH,
  MEASUREMENT_CHAR_WIDTH_RATIO,
  MEASUREMENT_INTER_COLUMN_GAP,
  measurementVisualWidth,
  measurementPadTextToVisualWidth,
  measurementFormatValueText,
} from "../measurements";
import {
  withNodesParentModelId,
  type CanvasBounds,
  type ColorDisplayMode,
  type ColorPalette,
  type DeviceStateVisual,
  type Edge,
  type ElementTreeChildItem,
  type ElementTreeItem,
  type ModelNode,
  type Point,
  type RoutedEdge,
  type SavedSchemeRecord,
  type TerminalType,
} from "../model";
import {
  type CanvasBoundsScrollAnchor,
  type CanvasPanningState,
  type CanvasResizeCommitAnchor,
  type CanvasResizeState,
  type CategoryLibrary,
  type ContextMarqueeSelectionState,
  type ContextMenuState,
  type DragGhostRoute,
  type MultiNodeDragOverlayPreview,
  type RenderViewportBounds,
  type SingleNodeDragCache,
  type SingleNodeDragPreviewEndpoint,
  type SmartAlignmentGuide,
  type WheelZoomAnchor,
} from "./appCoreCanvasUtilities";

export function createSetNodes(__appScope: GraphMeasurementScope) {
  return (value: SetStateAction<ModelNode[]>) => {
  const { graphStoreSetNodes, setGraphStore } = __appScope;
    setGraphStore((current: any) => {
      const nextNodes = typeof value === "function" ? value(current.nodes) : value;
      return graphStoreSetNodes(current, withNodesParentModelId(nextNodes, __appScope.projectIdx));
    });
  };
}

export function createSetEdges(__appScope: GraphMeasurementScope) {
  return (value: SetStateAction<Edge[]>) => {
  const { graphStoreSetEdges, setGraphStore } = __appScope;
    setGraphStore((current: any) => {
      const nextEdges = typeof value === "function" ? value(current.edges) : value;
      return graphStoreSetEdges(current, nextEdges);
    });
  };
}

export function createSetGraphArrays(__appScope: GraphMeasurementScope) {
  return (nextNodes: ModelNode[], nextEdges: Edge[], parentModelId?: number) => {
  const { graphStoreSetGraph, setGraphStore } = __appScope;
    const resolvedParentModelId = parentModelId === undefined ? __appScope.projectIdx : parentModelId;
    const normalizedNodes = withNodesParentModelId(nextNodes, resolvedParentModelId);
    setGraphStore((current: any) => graphStoreSetGraph(current, normalizedNodes, nextEdges));
  };
}

export function createPatchGraphNodes(__appScope: GraphMeasurementScope) {
  return (nodeUpdates: Iterable<ModelNode>) => {
  const { graphStorePatchNodes, setGraphStore } = __appScope;
    const normalizedUpdates = withNodesParentModelId(Array.from(nodeUpdates), __appScope.projectIdx);
    setGraphStore((current: any) => graphStorePatchNodes(current, normalizedUpdates));
  };
}

export function createPatchGraphEdges(__appScope: GraphMeasurementScope) {
  return (edgeUpdates: Iterable<Edge>) => {
  const { graphStorePatchEdges, setGraphStore } = __appScope;
    setGraphStore((current: any) => graphStorePatchEdges(current, edgeUpdates));
  };
}

export function createUpdateGraphNodeById(__appScope: GraphMeasurementScope) {
  return (nodeId: string, updater: (node: ModelNode) => ModelNode) => {
  const { graphStorePatchNodes, setGraphStore } = __appScope;
    setGraphStore((current: any) => {
      const node = current.nodeMap.get(nodeId);
      if (!node) {
        return current;
      }
      const nextNode = updater(node);
      return nextNode === node ? current : graphStorePatchNodes(current, [nextNode]);
    });
  };
}

export function createSetSchemes(__appScope: GraphMeasurementScope) {
  return (value: SetStateAction<SavedSchemeRecord[]>) => {
  const { setSchemesState } = __appScope;
    setSchemesState(value);
  };
}

export function createUpdateSmartAlignmentGuides(__appScope: GraphMeasurementScope) {
  return (guides: SmartAlignmentGuide[]) => {
  const { setSmartAlignmentGuides, smartAlignmentGuideSignature, smartAlignmentGuidesRef } = __appScope;
    if (smartAlignmentGuideSignature(smartAlignmentGuidesRef.current) === smartAlignmentGuideSignature(guides)) {
      return;
    }
    smartAlignmentGuidesRef.current = guides;
    setSmartAlignmentGuides(guides);
  };
}

export function createSetCanvasPanning(__appScope: GraphMeasurementScope) {
  return (next: CanvasPanningState) => {
  const { panningRef, setPanning } = __appScope;
    panningRef.current = next;
    setPanning(next);
  };
}

export function createSetContextMarqueeSelection(__appScope: GraphMeasurementScope) {
  return (next: ContextMarqueeSelectionState) => {
  const { contextMarqueeSelectionRef, setContextMarqueeSelectionState } = __appScope;
    contextMarqueeSelectionRef.current = next;
    setContextMarqueeSelectionState(next);
  };
}

export function createMarkGraphicContextMenuHandled(__appScope: GraphMeasurementScope) {
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

export function createConsumeGraphicContextMenuHandled(__appScope: GraphMeasurementScope) {
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

export function createOpenGraphicContextMenu(__appScope: GraphMeasurementScope) {
  return (menu: NonNullable<ContextMenuState>) => {
  const { markGraphicContextMenuHandled, setContextMenu } = __appScope;
    markGraphicContextMenuHandled();
    setContextMenu(menu);
  };
}

export function createSetOperationLogText(__appScope: GraphMeasurementScope) {
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

export function createEdgeListForNodeIds(__appScope: GraphMeasurementScope) {
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

export function createBuildSingleNodeDragCache(__appScope: GraphMeasurementScope) {
  return (nodeIds: string[], edgeIds: string[], affectedEdges: Edge[]): SingleNodeDragCache | undefined => {
  const { CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, colorDisplayMode, colorPalette, themeMode, currentStoredRoutePointsForEdge, edgeWithFrozenBusEndpointPoints, getConnectionStrokeColor, getModelEdgeEndpointPoint, getRouteEndpointNormal, isBusNode, nodeById, visibleEdgeIdSet } = __appScope;
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
        color: getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette, themeMode),
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

export function createOrderedNodeFromList(__appScope: GraphMeasurementScope) {
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

export function createOrderedNodesForIds(__appScope: GraphMeasurementScope) {
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

export function createAddRoutingNodesForConnectionEdge(__appScope: GraphMeasurementScope) {
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

export function createRoutingNodesForConnectionEdge(__appScope: GraphMeasurementScope) {
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

export function createRoutingNodesForConnectionEdges(__appScope: GraphMeasurementScope) {
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

export function createCachedConnectionStrokeColor(__appScope: GraphMeasurementScope) {
  return (edge: Edge) => {
  const { colorDisplayMode, colorPalette, themeMode, connectionStrokeColorCacheRef, connectionStrokeColorCacheToken, getConnectionStrokeColor, nodeById } = __appScope;
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
    const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette, themeMode);
    cache.colors.set(edge.id, { edge, color });
    return color;
  };
}

export function createConnectionLineStyle(__appScope: GraphMeasurementScope) {
  return (edgeId: string) => {
  const { cachedConnectionStrokeColor, edgeById } = __appScope;
    const edge = edgeById.get(edgeId);
    return edge ? ({ "--connection-color": cachedConnectionStrokeColor(edge) } as CSSProperties) : undefined;
  };
}

export function createMeasurementGroupAnchorPoint(__appScope: GraphMeasurementScope) {
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

export function createMeasurementGroupLocalOffset(__appScope: GraphMeasurementScope) {
  return (node: ModelNode, group: MeasurementGroup): Point => {
  const { measurementOffsetScaleForNode } = __appScope;
    const offsetScale = measurementOffsetScaleForNode(node);
    return {
      x: group.offset.x * offsetScale.x,
      y: group.offset.y * offsetScale.y
    };
  };
}

export function createMeasurementGroupCanvasPosition(__appScope: GraphMeasurementScope) {
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

// 计算量测框列位置
export function computeMeasurementColumnPositions(
  metrics: { width: number; columnWidth: number; columnMetrics: Array<{ labelWidth: number; valueWidth: number; unitWidth: number }>; interColumnGap: number },
  col: number
) {
  const columnStartX = -metrics.width / 2 + col * metrics.columnWidth;
  const columnMetric = metrics.columnMetrics[col];
  const labelEndX = columnStartX + columnMetric.labelWidth;
  const valueEndX = labelEndX + metrics.interColumnGap + columnMetric.valueWidth;
  const unitStartX = valueEndX + metrics.interColumnGap;
  return { labelEndX, valueEndX, unitStartX };
}

// 量测框 metrics 缓存：以 group 对象引用为 key。拖动中仅被拖 group 每帧新建对象，
// 其他 group 引用不变，直接命中缓存，避免每帧全量重算。
// 量测配置引用变化时整体失效（WeakMap 无 clear，直接换新实例）。
// 主题也参与失效判断：量测文本色按主题解析，切主题后旧缓存会继续吐浅色字。
let measurementMetricsCache: WeakMap<object, { node: ModelNode; result: unknown }> = new WeakMap();

let measurementMetricsCacheConfig: unknown = null;

let measurementMetricsCacheTheme: unknown = null;

export function createMeasurementGroupRenderMetrics(__appScope: GraphMeasurementScope) {
  return (node: ModelNode, group: MeasurementGroup): any => {
  const { formatMeasurementDisplayValue, measurementConfig, resolveMeasurementItemDisplay, themeMode, themedMeasurementTextColor } = __appScope;
    const runtimeMeasurementConfig = __appScope.runtimeMeasurementConfig ?? measurementConfig;
    if (measurementMetricsCacheConfig !== runtimeMeasurementConfig || measurementMetricsCacheTheme !== themeMode) {
      measurementMetricsCacheConfig = runtimeMeasurementConfig;
      measurementMetricsCacheTheme = themeMode;
      measurementMetricsCache = new WeakMap();
    }
    const cached = measurementMetricsCache.get(group);
    if (cached && cached.node === node) {
      return cached.result as ReturnType<ReturnType<typeof createMeasurementGroupRenderMetrics>>;
    }
    if (!group.visible) {
      return null;
    }
    const rows = group.items.flatMap((item) => {
      const display = resolveMeasurementItemDisplay({ config: runtimeMeasurementConfig, node, group, item });
      if (!display.visible) {
        return [];
      }
      const rawLabelText = group.labelVisible === false ? "" : display.label;
      const labelText = measurementPadTextToVisualWidth(rawLabelText, MEASUREMENT_LABEL_VISUAL_WIDTH);
      const rawValueText = formatMeasurementDisplayValue(
        { sourcePoint: item.sourcePoint, value: display.defaultValue, quality: "good", timestamp: 0 },
        display.decimals,
        "",
        display.format
      );
      // 自定义格式只改变值的内容、精度和补零规则；值列仍保持定宽，避免 %.3f 等格式破坏列对齐。
      const valueText = measurementFormatValueText(rawValueText, display.format);
      const unitText = group.unitVisible === false ? "" : display.unit;
      // display.color 是按浅色画布保存的数据色（默认 #334155 深灰）。
      // 深色画布上统一经主题层抬到浅色字；用户显式设过的彩色原样保留。
      // 在 metrics 这一层改，React 渲染与 SVG 串渲染（baseAttributes）两条路径同时生效。
      const themedDisplay = display.color === undefined
        ? display
        : { ...display, color: themedMeasurementTextColor(display.color, themeMode) };
      return [{ item, display: themedDisplay, labelText, valueText, unitText, fontSize: display.fontSize }];
    });
    if (rows.length === 0) {
      return null;
    }
    let maxFontSize = 0;
    for (const row of rows) if (row.fontSize > maxFontSize) maxFontSize = row.fontSize;
    const lineHeight = measurementRowLineHeight(maxFontSize);
    const columns = group.layout === "grid" ? 2 : group.layout === "horizontal" ? rows.length : 1;
    const charWidthFor = (fontSize: number) => fontSize * MEASUREMENT_CHAR_WIDTH_RATIO;
    const rowsPerColumn = Math.ceil(rows.length / columns);
    const columnMetrics = Array.from({ length: columns }, (_, column) => {
      let unitWidth = 0;
      for (let rowIndex = 0; rowIndex < rowsPerColumn; rowIndex++) {
        const row = rows[rowIndex * columns + column];
        if (!row) continue;
        if (row.unitText) {
          unitWidth = Math.max(unitWidth, measurementVisualWidth(row.unitText) * charWidthFor(row.fontSize));
        }
      }
      const labelWidth = MEASUREMENT_LABEL_VISUAL_WIDTH * charWidthFor(maxFontSize);
      const valueWidth = MEASUREMENT_VALUE_TOTAL_WIDTH * charWidthFor(maxFontSize);
      return { labelWidth, valueWidth, unitWidth };
    });
    const columnWidths = columnMetrics.map((m) => m.labelWidth + m.valueWidth + m.unitWidth + 2 * MEASUREMENT_INTER_COLUMN_GAP);
    const columnWidth = Math.max(...columnWidths);
    const width = columnWidth * columns;
    const height = rowsPerColumn * lineHeight;
    const result = {
      rows,
      maxFontSize,
      lineHeight,
      columnWidth,
      columns,
      width,
      height,
      columnMetrics,
      interColumnGap: MEASUREMENT_INTER_COLUMN_GAP,
      fontFamily: MEASUREMENT_FONT_FAMILY
    };
    measurementMetricsCache.set(group, { node, result });
    return result;
  };
}

export function createIncludeMeasurementGroupBounds(__appScope: GraphMeasurementScope) {
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

export function createBuildMeasurementGroupMarkup(__appScope: GraphMeasurementScope) {
  return (node: ModelNode, group: MeasurementGroup, options: { absolute?: boolean; className?: string } = {}) => {
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
    const charWidth = (fontSize: number) => fontSize * MEASUREMENT_CHAR_WIDTH_RATIO;
    const rowsMarkup = metrics.rows.map((row: any, index: any) => {
      const col = metrics.columns <= 1 ? 0 : index % metrics.columns;
      const rowIndex = metrics.columns <= 1 ? index : Math.floor(index / metrics.columns);
      const { labelEndX } = computeMeasurementColumnPositions(metrics, col);
      const textY = -metrics.height / 2 + rowIndex * metrics.lineHeight + metrics.lineHeight / 2;
      const fontSize = row.fontSize;
      const charGap = charWidth(fontSize);
      const valueX = labelEndX + charGap;
      const unitX = valueX + MEASUREMENT_VALUE_TOTAL_WIDTH * charGap;
      const baseAttributes = `fill="${escapeXml(row.display.color)}" font-family="${escapeXml(metrics.fontFamily)}" font-size="${formatSvgNumber(row.fontSize)}" font-weight="${escapeXml(row.display.fontWeight)}" font-style="${escapeXml(row.display.fontStyle)}" text-decoration="${escapeXml(row.display.textDecoration)}"`;
      const itemMetadata = exportMeasurementItemMetadataAttributes(row.item, node.id);
      const labelMarkup = row.labelText
        ? `<tspan class="measurement-label ml" x="${formatSvgNumber(labelEndX)}" text-anchor="end">${escapeXml(row.labelText)}</tspan>`
        : "";
      const valueMarkup = `<tspan class="measurement-value mv" id="mv-${escapeXml(row.item.id)}" x="4" text-anchor="start" xml:space="preserve" ${itemMetadata}>${escapeXml(row.valueText)}</tspan>`;
      const unitMarkup = `<tspan class="measurement-unit mu" dx="${formatSvgNumber(charGap * 2)}" text-anchor="start">${escapeXml(row.unitText)}</tspan>`;
      return `<text class="measurement-item mi" ${baseAttributes} y="${formatSvgNumber(textY)}" dominant-baseline="middle">${labelMarkup}${valueMarkup}${unitMarkup}</text>`;
    }).join("");
    const extraClass = options.className ? ` ${escapeXml(options.className)}` : "";
    return `<g class="measurement-group drag-preview-measurement-group${selectedClass}${extraClass}" transform="translate(${formatSvgNumber(position.x)} ${formatSvgNumber(position.y)})" ${exportMeasurementGroupMetadataAttributes(node, group)}>
  <rect class="measurement-group-bg" x="${formatSvgNumber(-metrics.width / 2)}" y="${formatSvgNumber(-metrics.height / 2)}" width="${formatSvgNumber(metrics.width)}" height="${formatSvgNumber(metrics.height)}" rx="4" fill="${escapeXml(measurementGroupBackgroundColor(group))}" stroke="${escapeXml(measurementGroupBorderColor(group))}" stroke-width="${formatSvgNumber(measurementGroupBorderWidth(group))}"${borderDashAttribute}/>
  ${rowsMarkup}
</g>`;
  };
}

export function createBuildRoutableLineDragGhostRoutesForNodeIds(__appScope: GraphMeasurementScope) {
  return (nodeIds: Iterable<string>): DragGhostRoute[] => {
  const { colorDisplayMode, colorPalette, themeMode, getDeviceStrokeColor, isRoutableLineDeviceKind, nodeById, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineNodeIdsByEndpointNodeId, visibleNodeIdSet } = __appScope;
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
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette, themeMode)
      });
    }
    return routes;
  };
}

export function createBuildMultiNodeDragOverlayPreview(__appScope: GraphMeasurementScope) {
  return (
    dragNodeIds: string[],
    affectedEdgesForDrag: Edge[],
    originalPositionsForDrag: Record<string, Point>,
    originalRoutePointsForDrag: Record<string, Point[]>,
    movingEdgeIds: Iterable<string> = []
  ): MultiNodeDragOverlayPreview => {
  const { CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT, CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT, buildMeasurementGroupsMarkup, buildNodePreviewImageMarkup, buildRoutableLineDragGhostRoutesForNodeIds, colorDisplayMode, colorPalette, themeMode, escapeXml, formatSvgNumber, getConnectionStrokeColor, getDeviceStrokeColor, getDeviceStrokeWidth, includeMeasurementGroupBounds, isBusNode, nodeById, nodeGeometryTransform, nodeHasUprightBoundsContent, nodeVisualInteractionBounds, pointsToPreviewPath, visibleEdgeIdSet, visibleNodeIdSet } = __appScope;
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
        const fill = node.params.fillColor || node.params.backgroundColor || "#ffffff";
        const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette, themeMode);
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
          color: getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette, themeMode)
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
        const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette, themeMode);
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

export function createRenderMultiNodeDragOverlay(__appScope: GraphMeasurementScope) {
  return () => {
  const { MemoDeviceGlyph, buildMeasurementGroupsMarkup, circle, clipPath, colorDisplayMode, colorPalette, themeMode, connectionLineStyle, dragging, draggingRef, g, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, image, isBusNode, isMultiNodeMoveState, isRoutableLineDeviceKind, isStaticNode, line, multiNodeDragOverlayDeltaRef, multiNodeDragOverlayRef, nodeById, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, path, rect, resolveNodeStateVisual, svgStrokeDashArray, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, title, updateMultiNodeDragOverlayTransform, visibleNodeIdSet } = __appScope;
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
        {overlay.edgeRoutes.map((route: any) => (
          <path key={`multi-drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
        ))}
        {dragging.nodeIds.map((nodeId: any) => {
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
          const previewNode = originalPosition === node.position ? node : { ...node, position: originalPosition };
          const measurementMarkup = buildMeasurementGroupsMarkup(previewNode);
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
                <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(node)} />
                <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(node)} />
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
                      className={`node-image-cover ${node.terminals.length > 0 ? "terminal-reserved-area" : ""}`}
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
                  {node.terminals.map((terminal: any) => {
                    const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                    const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                    const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette, themeMode);
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

export function createGroupTransformPreviewNodeFromSnapshot(__appScope: GraphMeasurementScope) {
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

export function createRenderGroupTransformPhotoPreview(__appScope: GraphMeasurementScope) {
  return () => {
  const { MemoDeviceGlyph, canvasBounds, circle, clipPath, colorDisplayMode, colorPalette, themeMode, connectionLineStyle, g, getDeviceStrokeColor, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, groupTransformGeometry, groupTransformPreviewEdgeRoutes, groupTransformPreviewNodeFromSnapshot, groupTransformPreviewRoutableLineNodeIdSet, groupTransformPreviewTransform, image, isBusNode, isGroupTransformDrag, isRoutableLineDeviceKind, isStaticNode, line, nodeById, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, nodes, normalizeRotationDegrees, path, pointsToPreviewPath, rect, resolveNodeStateVisual, routableLineDeviceCanvasPoints, routeRoutableLineDevice, svgStrokeDashArray, syncRoutableLineDeviceEndpointsToRefs, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, title, transformDrag, transformGroupPoint, visibleNodeIdSet } = __appScope;
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !groupTransformPreviewTransform) {
      return null;
    }
    const bounds = transformDrag.bounds;
    const geometry = transformDrag.previewPoint ? groupTransformGeometry(transformDrag, transformDrag.previewPoint) : null;
    const transformedNodeUpdates = geometry
      ? transformDrag.nodeIds.flatMap((nodeId: any) => {
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
    const previewNodes = nodes.map((node: any) => transformedNodeById.get(node.id) ?? node);
    const routableLineTransformPreviewRoutes = Array.from(groupTransformPreviewRoutableLineNodeIdSet).flatMap((lineId) => {
      const lineNode = nodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        return [];
      }
      const syncedLine = syncRoutableLineDeviceEndpointsToRefs(lineNode, previewNodes, transformedNodeById, nodes);
      const routingNodes = previewNodes.map((node: any) => (node.id === syncedLine.id ? syncedLine : node));
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
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette, themeMode)
      }];
    });
    return (
      <g className="group-transform-photo-preview">
        <g className="group-transform-origin-ghost">
          {transformDrag.originalEdgeRoutes.map((route: any) => (
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
        {groupTransformPreviewEdgeRoutes.map((route: any) => (
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
          {transformDrag.nodeIds.map((nodeId: any) => {
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
                  <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(node)} />
                  <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(node)} />
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
                        className={`node-image-cover ${node.terminals.length > 0 ? "terminal-reserved-area" : ""}`}
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
                    {node.terminals.map((terminal: any) => {
                      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                      const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette, themeMode);
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

export function createRenderSingleTransformRotateOriginGhost(__appScope: GraphMeasurementScope) {
  return () => {
  const { MemoDeviceGlyph, colorDisplayMode, colorPalette, g, isBusNode, isGroupTransformDrag, isStaticNode, nodeById, nodeGeometryTransform, rect, renderNodePreviewImageContent, resolveNodeStateVisual, themeMode, transformDrag, visibleNodeIdSet } = __appScope;
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
          <MemoDeviceGlyph node={ghostNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(ghostNode)} />
          <MemoDeviceGlyph node={ghostNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(ghostNode)} />
        </g>
        {renderNodePreviewImageContent(ghostNode, `rotate-origin-ghost-preview-clip-${ghostNode.id}`)}
      </g>
    );
  };
}

export function createRenderTransformRotationTrajectory(__appScope: GraphMeasurementScope) {
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

export function createRenderBoundaryBusInternalConnector(__appScope: GraphMeasurementScope) {
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

export function createCollectCurrentModelVoltageColorKeys(__appScope: GraphMeasurementScope) {
  return (sourceNodes?: ModelNode[]) => {
  const { nodes, voltageColorKeyForTerminal } = __appScope;
    if (sourceNodes === undefined) {
      sourceNodes = nodes;
    }
    const keys = new Set<string>();
    for (const node of sourceNodes ?? []) {
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

// 将颜色解析为 HSL（h:0-360, s:0-1, l:0-1），支持 hex 与 hsl() 两种实际出现的格式
function parseColorToHsl(color: string): { h: number; s: number; l: number } | null {
  const text = String(color ?? "").trim();
  const hexMatch = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    } else if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }
    return rgbToHsl(
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    );
  }
  const hslMatch = text.match(/^hsla?\(\s*([0-9.]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%\s*[,\s]\s*([0-9.]+)%/i);
  if (hslMatch) {
    // 分量正则 [0-9.]+ 会匹配到裸 "."，parseFloat(".") === NaN。
    // 若不校验就返回 { h: NaN, ... }，对象本身 truthy，会绕过调用方的 `if (!base)` 早退，
    // hslToHex 随后产出 "#NaNNaNNaN" 这类垃圾色。任一分量非有限即视为无法解析，返回 null。
    const h = parseFloat(hslMatch[1]);
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
      return null;
    }
    return {
      h: ((h % 360) + 360) % 360,
      s,
      l
    };
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const sector = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((sector / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (sector < 60) { r = c; g = x; }
  else if (sector < 120) { r = x; g = c; }
  else if (sector < 180) { g = c; b = x; }
  else if (sector < 240) { g = x; b = c; }
  else if (sector < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorToHex(color: string): string | null {
  const hsl = parseColorToHsl(color);
  return hsl ? hslToHex(hsl.h, hsl.s, hsl.l) : null;
}

// 基于参考色派生一个未使用的颜色：保持饱和度/明度，按黄金角旋转色相生成可区分的新色；
// 色相耗尽则调整明度、饱和度兜底，确保不与 usedColors 中任意颜色重复。
function deriveUnusedColor(baseColor: string, usedColors: Iterable<string>): string {
  const base = parseColorToHsl(baseColor);
  if (!base) {
    return baseColor;
  }
  const usedSet = new Set<string>();
  for (const color of usedColors) {
    const hex = colorToHex(color);
    if (hex) {
      usedSet.add(hex);
    }
  }
  const GOLDEN_ANGLE = 137.508;
  for (let i = 1; i <= 12; i += 1) {
    const hex = hslToHex(base.h + GOLDEN_ANGLE * i, base.s, base.l);
    if (!usedSet.has(hex)) {
      return hex;
    }
  }
  for (const delta of [0.12, -0.12, 0.2, -0.2, 0.06, -0.06]) {
    const l = Math.min(0.78, Math.max(0.22, base.l + delta));
    const hex = hslToHex(base.h, base.s, l);
    if (!usedSet.has(hex)) {
      return hex;
    }
  }
  for (const delta of [0.15, -0.15, 0.3, -0.3]) {
    const s = Math.min(1, Math.max(0.15, base.s + delta));
    const hex = hslToHex(base.h, s, base.l);
    if (!usedSet.has(hex)) {
      return hex;
    }
  }
  return baseColor;
}

export function createNearestVoltageColor(__appScope: GraphMeasurementScope) {
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
    const usedColors = Object.values(voltageColors);
    if (Number.isFinite(targetVoltage) && candidates.length > 0) {
      const baseColor = candidates
        .sort((left, right) => Math.abs(left.voltage - targetVoltage) - Math.abs(right.voltage - targetVoltage) || left.key.localeCompare(right.key))[0]
        .color;
      return deriveUnusedColor(baseColor, usedColors);
    }
    const fallbackColor = DEFAULT_COLOR_PALETTE.voltage[missingKey] ?? DEFAULT_COLOR_PALETTE.voltage[`${targetType}:0`] ?? "#64748b";
    return deriveUnusedColor(fallbackColor, usedColors);
  };
}

export function createFillMissingVoltageColorRows(__appScope: GraphMeasurementScope) {
  return (palette: ColorPalette, sourceKeys?: Set<string>) => {
  const { collectCurrentModelVoltageColorKeys, nearestVoltageColor } = __appScope;
    if (sourceKeys === undefined) {
      sourceKeys = collectCurrentModelVoltageColorKeys();
    }
    const missingKeys = Array.from(sourceKeys ?? []).filter((key: string) => !palette.voltage[key]);
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

export function createToggleColorDisplayMode(__appScope: GraphMeasurementScope) {
  return (nextMode?: ColorDisplayMode) => {
  const { setColorDisplayMode } = __appScope;
    setColorDisplayMode((current: any) => nextMode ?? (current === "energy" ? "voltage" : "energy"));
  };
}

export function createOpenColorPaletteDialog(__appScope: GraphMeasurementScope) {
  return () => {
  const { collectCurrentModelVoltageColorKeys, colorDisplayMode, colorPalette, fillMissingVoltageColorRows, normalizeColorPalette, setColorPalette, setColorPaletteDialogOpen, setColorPaletteDraft, setColorPaletteTab } = __appScope;
    const filled = fillMissingVoltageColorRows(normalizeColorPalette(colorPalette), collectCurrentModelVoltageColorKeys());
    setColorPaletteDraft(filled.palette);
    setColorPaletteTab(colorDisplayMode);
    setColorPaletteDialogOpen(true);
    if (filled.missingKeys.length > 0) {
      setColorPalette(filled.palette);
      window.setTimeout(() => {
        showGlobalMessage(`当前模型存在 ${filled.missingKeys.length} 个未配置颜色的电压等级，已按相近电压等级自动赋默认颜色：${filled.missingKeys.join("，")}`);
      }, 0);
    }
  };
}

export function createSaveColorPalette(__appScope: GraphMeasurementScope) {
  return () => {
  const { colorPaletteDraft, colorPaletteTab, normalizeColorPalette, setColorDisplayMode, setColorPalette, setColorPaletteDialogOpen } = __appScope;
    const normalized = normalizeColorPalette(colorPaletteDraft);
    setColorPalette(normalized);
    setColorDisplayMode(colorPaletteTab);
    setColorPaletteDialogOpen(false);
  };
}

export function createResetEnergyColors(__appScope: GraphMeasurementScope) {
  return () => {
  const { DEFAULT_COLOR_PALETTE, setColorPaletteDraft } = __appScope;
    setColorPaletteDraft((current: any) => ({
      ...current,
      energy: { ...DEFAULT_COLOR_PALETTE.energy }
    }));
  };
}

export function createResetVoltageColors(__appScope: GraphMeasurementScope) {
  return () => {
  const { DEFAULT_COLOR_PALETTE, setColorPaletteDraft } = __appScope;
    setColorPaletteDraft((current: any) => ({
      ...current,
      voltage: { ...DEFAULT_COLOR_PALETTE.voltage }
    }));
  };
}

export function createUpdateEnergyColor(__appScope: GraphMeasurementScope) {
  return (type: TerminalType, color: string) => {
  const { setColorPaletteDraft } = __appScope;
    setColorPaletteDraft((current: any) => ({
      ...current,
      energy: {
        ...current.energy,
        [type]: color
      }
    }));
  };
}

export function createSetVoltageColorRows(__appScope: GraphMeasurementScope) {
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
    setColorPaletteDraft((current: any) => ({
      ...current,
      voltage: {
        ...fallbackNumericEntries,
        ...typedEntries
      }
    }));
  };
}

export function createUpdateVoltageColorRow(__appScope: GraphMeasurementScope) {
  return (rowKey: string, patch: Partial<{ type: "ac" | "dc"; voltage: string; color: string }>) => {
  const { setVoltageColorRows, voltageColorRows } = __appScope;
    const rows = voltageColorRows.map((row: any) => row.key === rowKey ? { ...row, ...patch } : row);
    setVoltageColorRows(rows);
  };
}

export function createDeleteVoltageColorRow(__appScope: GraphMeasurementScope) {
  return (rowKey: string) => {
  const { setVoltageColorRows, voltageColorRows } = __appScope;
    setVoltageColorRows(voltageColorRows.filter((row: any) => row.key !== rowKey));
  };
}

export function createAddVoltageColorRow(__appScope: GraphMeasurementScope) {
  return () => {
  const { DEFAULT_COLOR_PALETTE, setVoltageColorRows, voltageColorRows } = __appScope;
    const existingKeys = new Set(voltageColorRows.map((row: any) => row.key));
    const baseVoltages = ["10", "35", "110", "220", "500", "750", "800"];
    const voltage = baseVoltages.find((item) => !existingKeys.has(`ac:${item}`)) ?? `${voltageColorRows.length + 1}`;
    setVoltageColorRows([...voltageColorRows, { type: "ac", voltage, color: DEFAULT_COLOR_PALETTE.voltage[`ac:${voltage}`] ?? "#2563eb" }]);
  };
}

export function createResolveNodeStateVisual(__appScope: GraphMeasurementScope) {
  return (node: ModelNode): DeviceStateVisual | null => {
  const { libraryTemplateByKind, resolveDeviceStateVisual } = __appScope;
    const template = libraryTemplateByKind.get(node.kind);
    return template ? resolveDeviceStateVisual(template, node) : null;
  };
}

export function createStatusStatesForNode(__appScope: GraphMeasurementScope) {
  return (node: ModelNode | undefined) => {
  const { getTemplateStateDefinitions, libraryTemplateByKind } = __appScope;
    if (!node) {
      return [];
    }
    const template = libraryTemplateByKind.get(node.kind);
    return template ? getTemplateStateDefinitions(template) : [];
  };
}

export function createNodeKindAllowsResizeTransform(__appScope: GraphMeasurementScope) {
  return (kind: string) => {
  const { defaultAllowsResizeTransformForKind, libraryTemplateByKind, templateAllowsResizeTransform } = __appScope;
    const template = libraryTemplateByKind.get(kind);
    return template ? templateAllowsResizeTransform(template) : defaultAllowsResizeTransformForKind(kind);
  };
}

export function createClearLibraryFlyoutCloseTimer(__appScope: GraphMeasurementScope) {
  return () => {
  const { libraryFlyoutCloseTimerRef } = __appScope;
    if (libraryFlyoutCloseTimerRef.current !== null) {
      window.clearTimeout(libraryFlyoutCloseTimerRef.current);
      libraryFlyoutCloseTimerRef.current = null;
    }
  };
}

export function createHideLibraryFlyout(__appScope: GraphMeasurementScope) {
  return () => {
  const { clearLibraryFlyoutCloseTimer, libraryFlyoutPositionsRef, setHoveredCategoryLibrary, setHoveredCategoryLibraryComponentLibrary, setHoveredGraphTemplateType, setLibraryFlyoutPositions } = __appScope;
    clearLibraryFlyoutCloseTimer();
    setHoveredCategoryLibrary("");
    setHoveredCategoryLibraryComponentLibrary("");
    setHoveredGraphTemplateType("");
    if (Object.keys(libraryFlyoutPositionsRef.current).length > 0) {
      setLibraryFlyoutPositions({});
    }
  };
}

export function createScheduleLibraryFlyoutClose(__appScope: GraphMeasurementScope) {
  return (group: CategoryLibrary, componentLibraryKey?: string) => {
  const { clearLibraryFlyoutCloseTimer, libraryComponentListRefKey, libraryFlyoutCloseTimerRef, setHoveredCategoryLibrary, setHoveredCategoryLibraryComponentLibrary, setLibraryFlyoutPositions } = __appScope;
    clearLibraryFlyoutCloseTimer();
    libraryFlyoutCloseTimerRef.current = window.setTimeout(() => {
      setHoveredCategoryLibrary((current: any) => current === group ? "" : current);
      setHoveredCategoryLibraryComponentLibrary((current: any) => componentLibraryKey ? current === componentLibraryKey ? "" : current : "");
      setLibraryFlyoutPositions((current: any) => {
        if (!componentLibraryKey) {
          return Object.keys(current).length > 0 ? {} : current;
        }
        const key = libraryComponentListRefKey("flyout", componentLibraryKey);
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

export function createLibraryFlyoutStyle(__appScope: GraphMeasurementScope) {
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

export function createFitLibraryFlyoutsToVisibleArea(__appScope: GraphMeasurementScope) {
  return () => {
  const { libraryComponentListRefs, libraryComponentLibraryHeaderRefs, libraryFlyoutPositionsRef, libraryScrollRef, setLibraryFlyoutPositions } = __appScope;
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
    libraryComponentListRefs.current.forEach((element: any, key: any) => {
      if (!key.startsWith("flyout:")) {
        return;
      }
      const headerElement = libraryComponentLibraryHeaderRefs.current.get(key);
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

export function createToggleCategoryLibrary(__appScope: GraphMeasurementScope) {
  return (group: CategoryLibrary) => {
  const { componentLibraryDisplayMode, setCollapsedExpandedModeCategoryLibraries, setExpandedCategoryLibraries } = __appScope;
    if (componentLibraryDisplayMode === "expanded") {
      setCollapsedExpandedModeCategoryLibraries((current: any) =>
        current.includes(group) ? current.filter((item: any) => item !== group) : [...current, group]
      );
      return;
    }
    setExpandedCategoryLibraries((current: any) =>
      current.includes(group) ? current.filter((item: any) => item !== group) : [...current, group]
    );
  };
}

export function createToggleCategoryLibraryComponentLibrary(__appScope: GraphMeasurementScope) {
  return (categoryLibraryName: string, sectionName: string) => {
  const { categoryLibraryComponentLibraryKey, componentLibraryDisplayMode, setCollapsedExpandedModeComponentLibraries, setExpandedCategoryLibraryComponentLibraries } = __appScope;
    const key = categoryLibraryComponentLibraryKey(categoryLibraryName, sectionName);
    if (componentLibraryDisplayMode === "expanded") {
      setCollapsedExpandedModeComponentLibraries((current: any) =>
        current.includes(key) ? current.filter((item: any) => item !== key) : [...current, key]
      );
      return;
    }
    setExpandedCategoryLibraryComponentLibraries((current: any) =>
      current.includes(key) ? current.filter((item: any) => item !== key) : [...current, key]
    );
  };
}

export function createResolveConfiguredBackgroundLayerIds(__appScope: GraphMeasurementScope) {
  return (projectId?: string, configuredLayerIds?: string[]) => {
  const { defaultBackgroundLayerIdsForProject, normalizeProjectLayers, projectById } = __appScope;
    if (!projectId) {
      return [];
    }
    const backgroundProject = projectById.get(projectId);
    if (!backgroundProject) {
      return configuredLayerIds ?? [];
    }
    const validLayerIds = new Set((normalizeProjectLayers(backgroundProject.project).layers ?? []).map((layer: any) => layer.id));
    if (!configuredLayerIds) {
      return defaultBackgroundLayerIdsForProject(backgroundProject.project);
    }
    return configuredLayerIds.filter((layerId) => validLayerIds.has(layerId));
  };
}

export function createToggleBackgroundLayer(__appScope: GraphMeasurementScope) {
  return (layerId: string) => {
  const { pushUndoSnapshot, setBackgroundLayerIds } = __appScope;
    pushUndoSnapshot();
    setBackgroundLayerIds((current: any) => current.includes(layerId)
      ? current.filter((item: any) => item !== layerId)
      : [...current, layerId]
    );
  };
}

export function createElementTreeItemChildren(__appScope: GraphMeasurementScope) {
  return (item: ElementTreeItem): ElementTreeChildItem[] => {
  const { buildContainerDeviceParameterViews, containerRelationNameKey, libraryTemplateByKind, visibleNodeById } = __appScope;
    if (item.kind !== "node") {
      return [];
    }
    const node = visibleNodeById.get(item.id);
    if (!node) {
      return item.children ?? [];
    }
    return (buildContainerDeviceParameterViews(node, libraryTemplateByKind.get(node.kind)) as any[])
      .filter((view: any) => view.kind === "associated")
      .map((view: any): ElementTreeChildItem => ({
        id: `${node.id}:${view.id}`,
        label: view.label,
        componentLibrary: view.componentLibrary ?? "",
        idx: view.rows.find((row: any) => row.key === "idx")?.value ?? "",
        name: view.rows.find((row: any) => row.key === "name")?.value ?? "",
        nameKey: view.relationKeys?.[0] ? containerRelationNameKey(view.relationKeys[0]) : "",
        relationKeys: view.relationKeys ?? [],
        terminalLabels: view.terminalLabels ?? view.rows.find((row: any) => row.key === "terminals")?.value ?? ""
      }));
  };
}

export function createUpdateElementTreeDraft(__appScope: GraphMeasurementScope) {
  return (key: string, value: string) => {
  const { setElementTreeEditDrafts } = __appScope;
    setElementTreeEditDrafts((current: any) =>
      current[key] === value ? current : { ...current, [key]: value }
    );
  };
}

export function createClearElementTreeDraft(__appScope: GraphMeasurementScope) {
  return (key: string) => {
  const { setElementTreeEditDrafts } = __appScope;
    setElementTreeEditDrafts((current: any) => {
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
}

export function createElementTreeCommittedDraftValue(__appScope: GraphMeasurementScope) {
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

export function createCommitElementTreeInputOnEnter(__appScope: GraphMeasurementScope) {
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

export function createMarkBusTerminalSyncDirty(__appScope: GraphMeasurementScope) {
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

export function createBusNodeIdsFromEdges(__appScope: GraphMeasurementScope) {
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

export function createMarkBusTerminalSyncDirtyForEdges(__appScope: GraphMeasurementScope) {
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

export function createBusTerminalSyncNodeIdsForGraphPatch(__appScope: GraphMeasurementScope) {
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

export function createSynchronizePendingBusTerminalsWithGraphStore(__appScope: GraphMeasurementScope) {
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
      nodeUpdates: synchronized.nodes.filter((node: any, index: any) => node !== scopedNodes[index]),
      edgeUpserts: synchronized.edges.filter((edge: any, index: any) => edge !== scopedEdges[index])
    };
  };
}

export function createApplyCanvasPanningVisualOffset(__appScope: GraphMeasurementScope) {
  return (nextOffset: Point) => {
  const { canvasBaseDisplayOffsetX, canvasBaseDisplayOffsetY, canvasDisplayHeight, canvasDisplayWidth, canvasResizeAnchoredDisplayOffset, canvasResizeDrag, canvasResizeHotzonesRef, canvasRulersRef, panningRef, svgRef } = __appScope;
    const svg = svgRef.current;
    const hotzones = canvasResizeHotzonesRef.current;
    const rulers = canvasRulersRef?.current;
    const activePanning = panningRef?.current;
    // 平移过程中优先使用纯 GPU 合成 transform: translate3d(dx, dy, 0)，避免每帧改写 left/top 触发 16k SVG 布局重排；
    // 松手 finishCanvasPanning 会先置空 panningRef.current 再调用本函数，从而自动清空 transform 并落盘精确 left/top。
    if (activePanning?.canvasOffset && svg && svg.style) {
      const dx = Math.round(nextOffset.x - activePanning.canvasOffset.x);
      const dy = Math.round(nextOffset.y - activePanning.canvasOffset.y);
      const translate = dx === 0 && dy === 0 ? "" : `translate3d(${dx}px, ${dy}px, 0)`;
      svg.style.transform = translate;
      if (hotzones && hotzones.style) {
        hotzones.style.transform = translate;
      }
      if (rulers && rulers.style) {
        rulers.style.transform = translate;
      }
      return;
    }
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
    if (svg) {
      if (svg.style?.transform) {
        svg.style.transform = "";
      }
      svg.style.left = `${left}px`;
      svg.style.top = `${top}px`;
    }
    if (hotzones) {
      if (hotzones.style?.transform) {
        hotzones.style.transform = "";
      }
      hotzones.style.left = `${left}px`;
      hotzones.style.top = `${top}px`;
    }
    // 刻度尺锚点容器与画布原点重合，拖动时用同一组 left/top 一起挪，否则尺子会滞后
    if (rulers) {
      if (rulers.style?.transform) {
        rulers.style.transform = "";
      }
      rulers.style.left = `${left}px`;
      rulers.style.top = `${top}px`;
    }
  };
}

export function createCancelCanvasBoundsScrollSyncPendingRelease(__appScope: GraphMeasurementScope) {
  return () => {
  const { canvasBoundsScrollSyncPendingFrameRef } = __appScope;
    if (canvasBoundsScrollSyncPendingFrameRef.current !== null) {
      window.cancelAnimationFrame(canvasBoundsScrollSyncPendingFrameRef.current);
      canvasBoundsScrollSyncPendingFrameRef.current = null;
    }
  };
}

export function createClearCanvasBoundsScrollSyncPending(__appScope: GraphMeasurementScope) {
  return () => {
  const { cancelCanvasBoundsScrollSyncPendingRelease, canvasBoundsScrollSyncPendingRef, pendingCanvasBoundsScrollAnchorRef } = __appScope;
    cancelCanvasBoundsScrollSyncPendingRelease();
    canvasBoundsScrollSyncPendingRef.current = false;
    pendingCanvasBoundsScrollAnchorRef.current = null;
  };
}

export function createReleaseCanvasBoundsScrollSyncPending(__appScope: GraphMeasurementScope) {
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

export function createMarkCanvasBoundsScrollSyncPending(__appScope: GraphMeasurementScope) {
  return () => {
  const { canvasBoundsScrollSyncPendingRef, canvasFrameRef, pendingCanvasBoundsScrollAnchorRef, releaseCanvasBoundsScrollSyncPending } = __appScope;
    const frame = canvasFrameRef.current;
    if (!pendingCanvasBoundsScrollAnchorRef.current) {
      const hotzones = frame?.querySelector(".canvas-resize-hotzones") as HTMLElement | null;
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

export function createCanvasBoundsForGraphContent(__appScope: GraphMeasurementScope) {
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

export function createApplyCanvasBounds(__appScope: GraphMeasurementScope) {
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
    setViewBox((current: any) => {
      return viewBoxAfterCanvasBoundsChange(current, nextBounds, originShift, currentBoundsForApply);
    });
    return true;
  };
}

export function createRejectAutoCanvasExpansionForContent(__appScope: GraphMeasurementScope) {
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

export function createCanvasBoundsForAutoExpandedGraphContent(__appScope: GraphMeasurementScope) {
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

export function createTranslateStoredEdgeGeometryBy(__appScope: GraphMeasurementScope) {
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

export function createShiftCachedRoutesForCanvasOrigin(__appScope: GraphMeasurementScope) {
  return (originShift: Point) => {
  const { cachedRouteStoreRef, cachedRoutedEdgesRef, hasCanvasOriginShift, routeStoreSetRoutes, translateRouteBy } = __appScope;
    if (!hasCanvasOriginShift(originShift) || cachedRoutedEdgesRef.current.length === 0) {
      return;
    }
    const shiftedRoutes = cachedRoutedEdgesRef.current.map((route: any) => translateRouteBy(route, originShift));
    cachedRoutedEdgesRef.current = shiftedRoutes;
    cachedRouteStoreRef.current = routeStoreSetRoutes(cachedRouteStoreRef.current, shiftedRoutes);
  };
}

export function createLeftTopCanvasOriginShiftForContent(__appScope: GraphMeasurementScope) {
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

export function createMinimumCanvasBoundsForResizeEdge(__appScope: GraphMeasurementScope) {
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

export function createClampNodePositionToExpandableBounds(__appScope: GraphMeasurementScope) {
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

export function createClampPointToExpandableBounds(__appScope: GraphMeasurementScope) {
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

export function createClampEdgeGeometryToExpandableBounds(__appScope: GraphMeasurementScope) {
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

export function createCanvasNoScrollOffsetForCanvasResizeAnchor(__appScope: GraphMeasurementScope) {
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

export function createSetCanvasFrameScrollPosition(__appScope: GraphMeasurementScope) {
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

export function createCenterCanvasFrameScrollPosition(__appScope: GraphMeasurementScope) {
  return (frame: HTMLElement) => {
  const { setCanvasFrameScrollPosition } = __appScope;
    setCanvasFrameScrollPosition(
      frame,
      Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2),
      Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2)
    );
  };
}

export function createSyncCanvasFrameScrollToViewBox(__appScope: GraphMeasurementScope) {
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
    const useHorizontalBoundsAnchor = Boolean(boundsScrollAnchor && targetViewBox && targetViewBox.width >= canvasBoundsRef.current.width - 1);
    const useVerticalBoundsAnchor = Boolean(boundsScrollAnchor && targetViewBox && targetViewBox.height >= canvasBoundsRef.current.height - 1);
    const hotzones = boundsScrollAnchor?.visualRect
      ? (frame.querySelector(".canvas-resize-hotzones") as HTMLElement | null)
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
      setCanvasNoScrollOffset((current: any) => {
        const next = clampCanvasNoScrollOffsetPoint({
          x: visualTarget.affectsX && !syncVisualScrollX ? current.x - visualTarget.deltaX : current.x,
          y: visualTarget.affectsY && !syncVisualScrollY ? current.y - visualTarget.deltaY : current.y
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
  };
}

export function createSyncCanvasFrameScrollToCanvasResizeCommitAnchor(__appScope: GraphMeasurementScope) {
  return (anchor: CanvasResizeCommitAnchor) => {
  const { canvasBoundsRef, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasResizeScrollTargetForCommitAnchor, canvasVerticalScrollbarsActiveRef, canvasViewBoxFromFrameScrollPosition, clampCanvasNoScrollOffsetPoint, normalizeViewBoxToCanvas, sameCanvasViewBox, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, setViewBox, skipNextCanvasScrollSyncRef, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    const hotzones = frame?.querySelector(".canvas-resize-hotzones") as HTMLElement | null;
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
      setViewBox((current: any) => {
        const nextViewBox = normalizeViewBoxToCanvas({
          ...current,
          x: syncScrollX ? scrolledViewBox.x : current.x,
          y: syncScrollY ? scrolledViewBox.y : current.y
        }, canvasBoundsRef.current);
        return sameCanvasViewBox(current, nextViewBox) ? current : nextViewBox;
      });
    }
    if ((target.affectsX && !syncScrollX) || (target.affectsY && !syncScrollY)) {
      setCanvasNoScrollOffset((current: any) => {
        const next = clampCanvasNoScrollOffsetPoint({
          x: target.affectsX && !syncScrollX ? current.x - target.deltaX : current.x,
          y: target.affectsY && !syncScrollY ? current.y - target.deltaY : current.y
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
  };
}

export function createSyncCanvasFrameScrollToWheelAnchor(__appScope: GraphMeasurementScope) {
  return (anchor: WheelZoomAnchor) => {
  const { anchoredCanvasNoScrollOffset, anchoredCanvasScrollPosition, canvasBaseDisplayOffsetX, canvasBaseDisplayOffsetY, canvasBoundsRef, canvasFramePaddingOffset, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasScrollScaleRef, canvasVerticalScrollbarsActiveRef, clampCanvasNoScrollOffsetPoint, normalizeViewBoxToCanvas, scrollPositionToViewBoxStart, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, setViewBox, skipNextCanvasScrollSyncRef, svgRef, viewBoxRef } = __appScope;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    const bounds = canvasBoundsRef.current;
    if (!frame || !svg || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    // 优先使用当帧已计算的 canvasScrollScaleRef，消除每步滚轮强制调用 svg.getBoundingClientRect() 引发的同步回流
    const cachedScale = canvasScrollScaleRef.current;
    const hasCachedScale = Number.isFinite(cachedScale?.x) && cachedScale.x > 0 && Number.isFinite(cachedScale?.y) && cachedScale.y > 0;
    const svgRect = hasCachedScale ? null : svg.getBoundingClientRect();
    const scale = {
      x: hasCachedScale ? cachedScale.x : (svgRect && svgRect.width > 0 ? svgRect.width / bounds.width : cachedScale.x),
      y: hasCachedScale ? cachedScale.y : (svgRect && svgRect.height > 0 ? svgRect.height / bounds.height : cachedScale.y)
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
    setViewBox((current: any) => {
      const updated = normalizeViewBoxToCanvas({
        ...current,
        x: canvasHorizontalScrollbarsActiveRef.current ? nextViewBox.x : current.x,
        y: canvasVerticalScrollbarsActiveRef.current ? nextViewBox.y : current.y
      }, canvasBoundsRef.current);
      if (
        Math.abs(updated.x - current.x) <= 1 &&
        Math.abs(updated.y - current.y) <= 1 &&
        Math.abs(updated.width - current.width) <= 1 &&
        Math.abs(updated.height - current.height) <= 1
      ) {
        return current;
      }
      skipNextCanvasScrollSyncRef.current = true;
      return updated;
    });
    if (!canvasHorizontalScrollbarsActiveRef.current || !canvasVerticalScrollbarsActiveRef.current) {
      skipNextCanvasScrollSyncRef.current = true;
      setCanvasNoScrollOffset((current: any) => {
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

export function createCurrentViewBoxFromCanvasFrameScroll(__appScope: GraphMeasurementScope) {
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

export function createScheduleCanvasVisibleViewBoxUpdate(__appScope: GraphMeasurementScope) {
  return () => {
  const { canvasBoundsRef, canvasFrameRef, canvasFrameUserScrollRef, canvasFullViewBoxRef, canvasScrollbarsActiveRef, canvasVisibleViewBoxFrameRef, currentViewBoxFromCanvasFrameScroll, normalizeViewBoxToCanvas, renderedCanvasFullyFitsFrame, sameCanvasViewBox, setCanvasVisibleViewBox, setViewBox, skipNextCanvasScrollSyncRef, svgRef, visibleCanvasViewBoxFromRects, wheelZoomCommitTimerRef } = __appScope;
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
      const wheelZoomSettling = Boolean(wheelZoomCommitTimerRef?.current !== null && wheelZoomCommitTimerRef?.current !== undefined);
      setCanvasVisibleViewBox((current: any) => {
        if (sameCanvasViewBox(current, next)) {
          return current;
        }
        // 连续滚轮期间，若新可见区完全位于当前已渲染区内部（如持续放大或轻微偏移），
        // 跳过本次视口重裁剪以彻底避免 16k SVG 节点重渲染，待滚轮停手 120ms 后自动精确同步。
        if (
          wheelZoomSettling &&
          next.x >= current.x &&
          next.y >= current.y &&
          next.x + next.width <= current.x + current.width &&
          next.y + next.height <= current.y + current.height
        ) {
          return current;
        }
        return next;
      });
      if (canvasFullyVisible || !frameScrollWasUserDriven) {
        return;
      }
      const scrolledViewBox = currentViewBoxFromCanvasFrameScroll();
      setViewBox((current: any) => {
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
