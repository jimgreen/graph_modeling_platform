/** 图状态管理与量测编辑主工厂模块（重导出 appMeasurementDomainFactories）。 */

import type { GraphMeasurementScope } from "./appScopeTypes";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Tooltip, Button, message } from "antd";
import EyeTwoTone from "@ant-design/icons/es/icons/EyeTwoTone";
import EyeInvisibleTwoTone from "@ant-design/icons/es/icons/EyeInvisibleTwoTone";
import { clampNumber } from "../canvasViewport";
import { reconcileNodeWithDefinition } from "../definitionInstanceSync";
import { degreesToRadians } from "../formatUtils";
import type {
  DeviceMeasurementProfileItem,
  MeasurementFontWeight,
  MeasurementGroup,
  MeasurementItemBinding,
  MeasurementProfilePositionDefinition,
  MeasurementTypeDefinition,
  PlatformMeasurementConfig,
  ProjectMeasurementConfig,
} from "../measurements";
import type { GraphStore } from "../graphStore";
import type { RouteStore } from "../routeStore";
import { isSkipBeforeUnload } from "../spaceSwitch";
import {
  DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
  DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH,
  defaultMeasurementDisplayFormat,
} from "../measurements";
import {
  type CanvasBounds,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type Edge,
  type ModelNode,
  type Point,
  type RoutedEdge,
  type SavedSchemeRecord,
} from "../model";
import {
  bestSmartAlignmentAxisSnap,
  type BulkMoveCommitStats,
  type BulkMoveDirtyResult,
  type ConnectTarget,
  type DraggingState,
  type RenderViewportBounds,
  type RoutableLinePlacementState,
  type SmartAlignmentAxisCandidate,
  type UndoGraphPatchScope,
  type UndoGraphSnapshotPatchPlan,
  type UndoSnapshot,
} from "./appCoreCanvasUtilities";
import { InlineEditableValue } from "../components/InputComponents";
import { modelTrace } from "../modelTrace";

export * from "./appMeasurementDomainFactories";

// 告警消息下移到画布区域顶部，避免与顶部工具栏重叠
message.config({ top: 50 });

const MEASUREMENT_FONT_SIZE_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const size = String(i + 8);
  return { value: size, label: size };
});

const MEASUREMENT_FONT_WEIGHT_OPTIONS = [
  { value: "400", label: "细" },
  { value: "500", label: "中" },
  { value: "700", label: "粗" }
] as const;

const MEASUREMENT_FONT_WEIGHT_LABELS: Record<string, string> = {
  "400": "细",
  "500": "中",
  "700": "粗"
};

export function createHandleCanvasFrameScroll(__appScope: GraphMeasurementScope) {
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

export function createUpdateCanvasFrameViewportSize(__appScope: GraphMeasurementScope) {
  return () => {
  const { canvasFrameRef, setCanvasFrameViewportSize } = __appScope;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const nextSize = { width: frame.clientWidth, height: frame.clientHeight };
    setCanvasFrameViewportSize((current: any) =>
      current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
    );
  };
}

export function createUpdateCanvasFrameViewportAndVisibleBox(__appScope: GraphMeasurementScope) {
  return () => {
  const { scheduleCanvasVisibleViewBoxUpdate, updateCanvasFrameViewportSize } = __appScope;
    updateCanvasFrameViewportSize();
    scheduleCanvasVisibleViewBoxUpdate();
  };
}

export function createNodeImage(__appScope: GraphMeasurementScope) {
  return (node: ModelNode) => {
  const { imageAssets, resolveNodeImage, resolveNodeStateVisual, resolveStateVisualImageHref } = __appScope;
    const stateImageHref = resolveStateVisualImageHref(resolveNodeStateVisual(node), imageAssets);
    return stateImageHref || resolveNodeImage(node, imageAssets);
  };
}

export function createRenderNodePreviewImageContent(__appScope: GraphMeasurementScope) {
  return (
    node: ModelNode,
    clipId: string,
    options: { imageHref?: string; foregroundImageHref?: string; className?: string; preserveAspectRatio?: string; imageFit?: string; foregroundImageFit?: string } = {}
  ) => {
  const { SvgMarkupChunk, g, imageAssets, isBusNode, isStaticNode, nodeForegroundImage, nodeImage, nodeImageContentTransform, rect, resolveNodeStateVisual, resolveStateVisualImageHref, svgImageContentMarkup } = __appScope;
    const imageHref = options.imageHref ?? nodeImage(node);
    const foregroundImageHref = options.foregroundImageHref ?? nodeForegroundImage(node);
    if (isBusNode(node) || (!imageHref && !foregroundImageHref)) {
      return null;
    }
    const stateVisual = resolveNodeStateVisual?.(node);
    const stateImageHref = resolveStateVisualImageHref?.(stateVisual, imageAssets);
    const imageFit = options.imageFit ?? (stateImageHref
      ? stateVisual?.imageFit ?? stateVisual?.backgroundImageFit ?? node.params.backgroundImageFit
      : node.params.backgroundImageFit);
    const foregroundImageFit = options.foregroundImageFit ?? node.params.foregroundImageFit;
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
              className={`node-image-cover ${node.terminals.length > 0 ? "terminal-reserved-area" : ""}`}
            />
          )}
          {imageHref && (
            <SvgMarkupChunk
              className="node-background-image-markup"
              markup={svgImageContentMarkup(imageHref, {
                x: -node.size.width / 2,
                y: -node.size.height / 2,
                width: node.size.width,
                height: node.size.height,
                imageFit,
                preserveAspectRatio: options.preserveAspectRatio,
                clipPath,
                className: "node-background-image"
              })}
            />
          )}
          {foregroundImageHref && (
            <SvgMarkupChunk
              className="node-foreground-image-markup"
              markup={svgImageContentMarkup(foregroundImageHref, {
                x: -node.size.width / 2,
                y: -node.size.height / 2,
                width: node.size.width,
                height: node.size.height,
                imageFit: foregroundImageFit,
                preserveAspectRatio: options.preserveAspectRatio,
                clipPath,
                className: "node-foreground-image"
              })}
            />
          )}
        </g>
      </>
    );
  };
}

export function createBuildNodePreviewImageMarkup(__appScope: GraphMeasurementScope) {
  return (
    node: ModelNode,
    clipId: string,
    options: { clip?: boolean; className?: string } = {}
  ) => {
  const { escapeXml, formatSvgNumber, imageAssets, isBusNode, isStaticNode, nodeForegroundImage, nodeImage, nodeImageContentTransform, resolveNodeStateVisual, resolveStateVisualImageHref, svgImageContentMarkup } = __appScope;
    const imageHref = nodeImage(node);
    const foregroundImageHref = nodeForegroundImage(node);
    if (isBusNode(node) || (!imageHref && !foregroundImageHref)) {
      return "";
    }
    const clipEnabled = options.clip !== false;
    const clipUrl = `url(#${clipId})`;
    const clipMarkup = clipEnabled
      ? `<clipPath id="${escapeXml(clipId)}"><rect x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="8"/></clipPath>`
      : "";
    const imageCoverMarkup = !isStaticNode(node)
      ? `<rect x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="8" class="node-image-cover${node.terminals.length > 0 ? " terminal-reserved-area" : ""}"/>`
      : "";
    const imageContentOptions = {
      x: -node.size.width / 2,
      y: -node.size.height / 2,
      width: node.size.width,
      height: node.size.height,
      clipPath: clipEnabled ? clipUrl : undefined
    };
    const stateVisual = resolveNodeStateVisual?.(node);
    const stateImageHref = resolveStateVisualImageHref?.(stateVisual, imageAssets);
    const imageFit = stateImageHref
      ? stateVisual?.imageFit ?? stateVisual?.backgroundImageFit ?? node.params.backgroundImageFit
      : node.params.backgroundImageFit;
    const backgroundMarkup = imageHref
      ? svgImageContentMarkup(imageHref, { ...imageContentOptions, imageFit, className: "node-background-image" })
      : "";
    const foregroundMarkup = foregroundImageHref
      ? svgImageContentMarkup(foregroundImageHref, { ...imageContentOptions, imageFit: node.params.foregroundImageFit, className: "node-foreground-image" })
      : "";
    return `${clipMarkup}<g class="${escapeXml(options.className ?? "node-upright-content")}" transform="${escapeXml(nodeImageContentTransform(node))}">${imageCoverMarkup}${backgroundMarkup}${foregroundMarkup}</g>`;
  };
}

export function createBuildConnectPreviewPath(__appScope: GraphMeasurementScope) {
  return (
    source: { nodeId: string; terminalId: string; point?: Point; manualPoints?: Point[] } | null,
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

export function createBuildRoutableLinePreviewPath(__appScope: GraphMeasurementScope) {
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

export function createPatchStoredRouteStoreForEdgeIds(__appScope: GraphMeasurementScope) {
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

export function createMarkRouteEdgesDirty(__appScope: GraphMeasurementScope) {
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

export function createMarkStoredRouteEdgesDirty(__appScope: GraphMeasurementScope) {
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

export function createEdgeListsHaveSameOrder(__appScope: GraphMeasurementScope) {
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

export function createEdgeReferenceDiffIds(__appScope: GraphMeasurementScope) {
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

export function createDirtyEdgeIdsAfterMove(__appScope: GraphMeasurementScope) {
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

export function createDirtyEdgeIdsForMovedLocalRoutes(__appScope: GraphMeasurementScope) {
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

export function createDirtyEdgeIdsAfterBulkMove(__appScope: GraphMeasurementScope) {
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

export function createLogBulkMoveCommitStats(__appScope: GraphMeasurementScope) {
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

export function createBuildMovedNodeUpdates(__appScope: GraphMeasurementScope) {
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

export function createNextNodesForMovedGraphCommit(__appScope: GraphMeasurementScope) {
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

export function createEdgePatchFromCandidateEdges(__appScope: GraphMeasurementScope) {
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

export function createGraphStorePatchStillCurrent(__appScope: GraphMeasurementScope) {
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

export function createShouldRunSynchronousMoveBlockerRepair(__appScope: GraphMeasurementScope) {
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

export function createMarkGraphDirtyForInteractiveCommit(__appScope: GraphMeasurementScope) {
  return () => {
  const { setHasUnsavedChanges, setRouteRenderingReady, suppressNextGraphDirtyRef } = __appScope;
    suppressNextGraphDirtyRef.current += 1;
    setHasUnsavedChanges(true);
    setRouteRenderingReady(true);
  };
}

export function createPatchSingleTerminalAnchorFromPoint(__appScope: GraphMeasurementScope) {
  return (
    nodeId: string,
    terminalId: string,
    point: Point,
    originalMovingPoint: Point
  ) => {
  const { canvasBounds, currentStoredRoutePointsForEdge, edgeWithFrozenBusEndpointPoints, graphStoreApplyPatch, isBusNode, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, overlayGraphStoreNodes, preserveConnectionEdgeRouteShape, resolveStraightBusSlideEndpoint, sameOptionalPoint, setGraphStore, snapSingleTerminalAnchorToNearestSide } = __appScope;
    markGraphDirtyForInteractiveCommit();
    setGraphStore((current: any) => {
      const currentNode = current.nodeMap.get(nodeId);
      if (!currentNode || isBusNode(currentNode) || currentNode.terminals.length !== 1) {
        return current;
      }
      const anchor = snapSingleTerminalAnchorToNearestSide(currentNode, point);
      let changed = false;
      const nextTerminals = currentNode.terminals.map((terminal: any) => {
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
      const dirtyEdges = (current.edgesByNodeId.get(nodeId) ?? []).filter((edge: any) =>
        (edge.sourceId === nodeId && edge.sourceTerminalId === terminalId) ||
        (edge.targetId === nodeId && edge.targetTerminalId === terminalId)
      );
      const dirtyEdgeIds = dirtyEdges.map((edge: any) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      markStoredRouteEdgesDirty(dirtyEdgeIds);
      const nextEdges = dirtyEdges.map((edge: any) => {
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

export function createRebuildEdgeUpdatesAfterNodeGeometryChange(__appScope: GraphMeasurementScope) {
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
    const safeCurrentEdges = currentEdges ?? [];
    const localEdges = safeCurrentEdges === edges
      ? edgeListForNodeIds(changedIds)
      : safeCurrentEdges.filter((edge: Edge) => changedIds.includes(edge.sourceId) || changedIds.includes(edge.targetId));
    const rerouteEdges = preservedEdgeIds.size > 0
      ? localEdges.filter((edge: any) => !preservedEdgeIds.has(edge.id))
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
    const previousLocalEdgeById = new Map(rerouteEdges.map((edge: any) => [edge.id, edge]));
    return nextLocalEdges.filter((edge: any) => previousLocalEdgeById.get(edge.id) !== edge);
  };
}

export function createRebuildEdgesAfterNodeGeometryChange(__appScope: GraphMeasurementScope) {
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
    const edgeUpdateById = new Map(edgeUpdates.map((edge: any) => [edge.id, edge]));
    let changed = false;
    const nextEdges = (currentEdges ?? []).map((edge: Edge) => {
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

export function createStoredRouteEndpointMatchPoint(__appScope: GraphMeasurementScope) {
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

export function createEndpointMatchedRoutePointsForEdge(__appScope: GraphMeasurementScope) {
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

export function createEdgeWithFrozenBusEndpointPoints(__appScope: GraphMeasurementScope) {
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

export function createPreviewStoredRoutePointsForEdge(__appScope: GraphMeasurementScope) {
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

export function createClearLocalSchemeModelCache(__appScope: GraphMeasurementScope) {
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

export function createRememberPersistedSchemesPayload(__appScope: GraphMeasurementScope) {
  return (normalizedSchemesPayload: string) => {
  const { clearLocalSchemeModelCache, lastPersistedSchemesPayloadRef } = __appScope;
    clearLocalSchemeModelCache();
    lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;
  };
}

export function createRefreshSchemesFromBackendDirectory(__appScope: GraphMeasurementScope) {
  return (reason: string) => {
  const { activeSchemeKey, clearActiveProjectDisplay, fetchBackendSchemes, flattenSavedSchemes, rememberPersistedSchemesPayload, saveRequiredRef, serializeSchemesForStorage, setExpandedSchemeIds, setSchemesState, suppressNextBackendSchemeSyncRef, writeOperationLog } = __appScope;
    void fetchBackendSchemes()
      .then((backendSchemes: any) => {
        const backendPayload = serializeSchemesForStorage(backendSchemes);
        rememberPersistedSchemesPayload(backendPayload);
        suppressNextBackendSchemeSyncRef.current = true;
        setSchemesState(backendSchemes);
        setExpandedSchemeIds((current: any) => {
          const backendSchemeIds = new Set(flattenSavedSchemes(backendSchemes).map((scheme: any) => scheme.id));
          const retained = current.filter((schemeId: any) => backendSchemeIds.has(schemeId));
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

export function createHandleBackendSchemeMutationFailure(__appScope: GraphMeasurementScope) {
  return (reason: string, error: unknown) => {
  const { refreshSchemesFromBackendDirectory, writeOperationLog } = __appScope;
    const message = error instanceof Error ? error.message : reason;
    showGlobalMessage(`${reason}失败：${message}\n已按后台目录重新刷新方案/模型树。`);
    writeOperationLog(`${reason}失败：${message}`);
    refreshSchemesFromBackendDirectory(`${reason}失败后刷新`);
  };
}

export function createSaveSchemeTreeToBackend(__appScope: GraphMeasurementScope) {
  return (scheme: SavedSchemeRecord, parentPath: string[], previousSchemePath?: string[]) => {
  const { findSavedSchemeById, replaceSavedSchemeById, saveBackendProjectRecord, saveBackendSchemeRecord, setSchemes } = __appScope;
    const tasks: Promise<unknown>[] = [];
    const visit = (record: SavedSchemeRecord, pathPrefix: string[], previousPath?: string[]) => {
      const schemePath = [...pathPrefix, record.name];
      tasks.push(saveBackendSchemeRecord(schemePath, previousPath, record.schemeId).then((receipt: { schemeId?: number }) => {
        const schemeId = receipt?.schemeId;
        if (typeof schemeId !== "number" || !Number.isSafeInteger(schemeId) || schemeId <= 0) {
          return;
        }
        setSchemes((current: SavedSchemeRecord[]) => {
          const latest = findSavedSchemeById(current, record.id);
          return latest
            ? replaceSavedSchemeById(current, record.id, { ...latest, id: String(schemeId), schemeId })
            : current;
        });
      }));
      for (const project of record.projects) {
        tasks.push(saveBackendProjectRecord(schemePath, project, "", record.schemeId));
      }
      for (const child of record.children ?? []) {
        visit(child, schemePath);
      }
    };
    visit(scheme, parentPath, previousSchemePath);
    return Promise.all(tasks);
  };
}

export function createPersistSchemeTreeToBackend(__appScope: GraphMeasurementScope) {
  return (scheme: SavedSchemeRecord, parentPath: string[], reason: string, previousSchemePath?: string[]) => {
  const { handleBackendSchemeMutationFailure, saveSchemeTreeToBackend, writeOperationLog } = __appScope;
    void saveSchemeTreeToBackend(scheme, parentPath, previousSchemePath)
      .then(() => writeOperationLog(`${reason}：已按单方案/单模型同步到后台`))
      .catch((error: any) => handleBackendSchemeMutationFailure(`${reason}后台同步`, error));
  };
}

export function createReplaceSchemeTreeInBackend(__appScope: GraphMeasurementScope) {
  return (scheme: SavedSchemeRecord, parentPath: string[], previousSchemePath: string[], reason: string) => {
  const { deleteBackendSchemeRecord, handleBackendSchemeMutationFailure, saveSchemeTreeToBackend, writeOperationLog } = __appScope;
    void deleteBackendSchemeRecord(previousSchemePath)
      .then(() => saveSchemeTreeToBackend(scheme, parentPath))
      .then(() => writeOperationLog(`${reason}：已按单方案/单模型同步到后台`))
      .catch((error: any) => handleBackendSchemeMutationFailure(`${reason}后台同步`, error));
  };
}

export function createPersistRefreshRecoveryNow(__appScope: GraphMeasurementScope) {
  return () => {
  const { clearRefreshRecoveryProject, refreshRecoveryProjectRef, saveRequiredRef, writeRefreshRecoveryProject } = __appScope;
    // 切空间的卸载路径：`switchToSpace` 已置跳过标志，而这一切正发生在 `location.reload()`
    // 的卸载事件里 —— 此刻内存中的模型是**旧**空间的，写进 `power-system-refresh-recovery`
    // 就会被新空间启动时读成「刷新恢复草稿」，把 T4 那次 sessionStorage 清理当场撤销，
    // 用户在新空间一保存就落进新空间（S2 复活）。故这里改写为「清掉」。
    //
    // 守卫放在这个原语里、而不是三个事件入口（`beforeunload` / `pagehide` /
    // `vite:beforeFullReload`）：枚举入口加守卫正是本计划栽过的坑 —— 漏一族就复活。
    if (isSkipBeforeUnload()) {
      clearRefreshRecoveryProject();
      return;
    }
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

export function createClearRecordSelection(__appScope: GraphMeasurementScope) {
  return () => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedProjectId("");
    setSelectedSchemeId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds([]);
  };
}

export function createBlurLayerManagementDropdownFocus(__appScope: GraphMeasurementScope) {
  return () => {
  const { layerManagementDropdownRef } = __appScope;
    const dropdown = layerManagementDropdownRef.current;
    const activeElement = document.activeElement;
    if (dropdown && activeElement instanceof HTMLElement && dropdown.contains(activeElement)) {
      activeElement.blur();
    }
  };
}

export function createSelectSingleScheme(__appScope: GraphMeasurementScope) {
  return (schemeId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedSchemeId(schemeId);
    setSelectedSchemeIds([schemeId]);
    setSelectedProjectId("");
    setSelectedProjectIds([]);
  };
}

export function createSelectSingleProject(__appScope: GraphMeasurementScope) {
  return (schemeId: string, projectId: string) => {
  const { manualModelSelectionRef, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    // 行点击是用户模型选择的最早入口，先于异步加载和 React state 提交。
    // 启动恢复链看到这个标记后必须让位，不能把模型切回页面初始值。
    if (manualModelSelectionRef) {
      manualModelSelectionRef.current = true;
    }
    modelTrace("manual-model-select", { projectId, schemeId });
    setSelectedSchemeId(schemeId);
    setSelectedProjectId(projectId);
    setSelectedProjectIds([projectId]);
    setSelectedSchemeIds([]);
  };
}

export function createToggleSchemeSelection(__appScope: GraphMeasurementScope) {
  return (schemeId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedProjectId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds((current: any) => {
      const next = current.includes(schemeId) ? current.filter((id: any) => id !== schemeId) : [...current, schemeId];
      setSelectedSchemeId(next[0] ?? "");
      return next;
    });
  };
}

export function createToggleProjectSelection(__appScope: GraphMeasurementScope) {
  return (schemeId: string, projectId: string) => {
  const { setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds } = __appScope;
    setSelectedSchemeIds([]);
    setSelectedProjectIds((current: any) => {
      const next = current.includes(projectId) ? current.filter((id: any) => id !== projectId) : [...current, projectId];
      setSelectedProjectId(next[0] ?? "");
      setSelectedSchemeId(next.length > 0 ? schemeId : "");
      return next;
    });
  };
}

export function createUndoGraphSnapshotPatchPlan(__appScope: GraphMeasurementScope) {
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

export function createApplyUndoGraphSnapshot(__appScope: GraphMeasurementScope) {
  return (snapshot: UndoSnapshot) => {
  const { graphStore, graphStorePatchGraphFromArrays, graphStoreSetGraph, latestGraphStoreRef, markRouteEdgesDirty, markStoredRouteEdgesDirty, setGraphStore, undoGraphSnapshotPatchPlan } = __appScope;
    const currentStore = latestGraphStoreRef.current ?? graphStore;
    const plan = undoGraphSnapshotPatchPlan(currentStore, snapshot);
    markRouteEdgesDirty(plan.dirtyEdgeIds);
    markStoredRouteEdgesDirty(plan.dirtyEdgeIds);
    if (plan.mode === "full") {
      setGraphStore((current: any) => graphStoreSetGraph(current, snapshot.nodes, snapshot.edges));
      return;
    }
    setGraphStore((current: any) => {
      const currentPlan = undoGraphSnapshotPatchPlan(current, snapshot);
      return currentPlan.mode === "patch"
        ? graphStorePatchGraphFromArrays(current, snapshot.nodes, snapshot.edges, currentPlan.nodeIds, currentPlan.edgeIds)
        : graphStoreSetGraph(current, snapshot.nodes, snapshot.edges);
    });
  };
}

export function createPushUndoSnapshot(__appScope: GraphMeasurementScope) {
  return (markDirty = true, deepModelSnapshot = false, graphPatchScope?: UndoGraphPatchScope, label?: string, target?: string) => {
  const { cloneProjectState, currentMutationRevisionRef, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, redoStackRef, setHasUnsavedChanges, setRedoStack, setUndoStack, undoStackRef } = __appScope;
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    const snapshot = cloneProjectState(deepModelSnapshot, graphPatchScope);
    if (currentMutationRevisionRef) {
      snapshot.revision = currentMutationRevisionRef.current;
      currentMutationRevisionRef.current += 1;
    }
    snapshot.label = label;
    if (target) {
      snapshot.target = target;
    } else {
      const selected = __appScope.inspectorSelectedNode;
      if (selected) {
        const idx = selected.params?.idx || selected.id;
        snapshot.target = `${idx} ${selected.name ?? ""}`.trim();
      }
    }
    setUndoStack((current: UndoSnapshot[]) => {
      const next = [...current.slice(-49), snapshot];
      if (undoStackRef) {
        undoStackRef.current = next;
      }
      return next;
    });
    if (redoStackRef) {
      redoStackRef.current = [];
    }
    setRedoStack?.([]);
    if (markDirty) {
      setHasUnsavedChanges(true);
    }
  };
}

export function createUniqueUndoScopeIds(__appScope: GraphMeasurementScope) {
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

export function createPushNodeOnlyUndoSnapshot(__appScope: GraphMeasurementScope) {
  return (nodeId: string, label?: string, target?: string) => {
  const { pushUndoSnapshot, undoScopeForGraphPatch, nodeById } = __appScope;
    const resolvedTarget = target || (() => {
      const node = nodeById?.get?.(nodeId);
      return node ? `${node.params?.idx || node.id} ${node.name ?? ""}`.trim() : undefined;
    })();
    pushUndoSnapshot(true, false, undoScopeForGraphPatch([nodeId], []), label, resolvedTarget);
  };
}

export function createSyncExistingNodesWithTemplateDefinitions(__appScope: GraphMeasurementScope) {
  return (
    template: Pick<DeviceTemplate, "parameterDefinitions"> & Partial<Pick<DeviceTemplate, "params" | "size" | "terminalType" | "terminalCount" | "terminalTypes" | "terminalLabels" | "terminalAnchors" | "stateDefinitions">>,
    previousDefinitions: readonly DeviceParameterDefinition[] | undefined,
    matchesNode: (node: ModelNode) => boolean
  ) => {
  const { measurementConfig, nodes, patchGraphNodes, projectMeasurements, pushUndoSnapshot, reconcileProjectMeasurementsWithConfig, setProjectMeasurements, undoScopeForGraphPatch } = __appScope;
    const nodeUpdates: ModelNode[] = [];
    for (const node of nodes) {
      if (!matchesNode(node)) {
        continue;
      }
      const reconciled = reconcileNodeWithDefinition(node, template, previousDefinitions);
      if (reconciled !== node) {
        nodeUpdates.push(reconciled);
      }
    }
    if (nodeUpdates.length === 0) {
      return 0;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(nodeUpdates.map((node) => node.id), []));
    if (typeof reconcileProjectMeasurementsWithConfig === "function" && projectMeasurements && measurementConfig) {
      const updatesById = new Map(nodeUpdates.map((node) => [node.id, node]));
      const nextNodes = nodes.map((node: any) => updatesById.get(node.id) ?? node);
      const reconciledMeasurements = reconcileProjectMeasurementsWithConfig(
        projectMeasurements,
        nextNodes,
        measurementConfig,
        measurementConfig
      );
      if (reconciledMeasurements !== projectMeasurements) {
        setProjectMeasurements(reconciledMeasurements);
      }
    }
    patchGraphNodes(nodeUpdates);
    return nodeUpdates.length;
  };
}

export function createUpdateMeasurementConfig(__appScope: GraphMeasurementScope) {
  return (updater: (current: PlatformMeasurementConfig) => PlatformMeasurementConfig) => {
  const { measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeMeasurementConfig, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    const currentMeasurementConfig = measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig;
    const next = normalizeMeasurementConfig(updater(currentMeasurementConfig));
    measurementConfigDraftRef.current = next;
    setMeasurementConfigDraft(next);
    setMeasurementConfigSaveStatus("idle");
  };
}

export function createPrepareMeasurementConfigDraft(__appScope: GraphMeasurementScope) {
  return () => {
  const { measurementConfig, measurementConfigDraftRef, normalizeMeasurementConfig, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    const nextDraft = normalizeMeasurementConfig(measurementConfig);
    measurementConfigDraftRef.current = nextDraft;
    setMeasurementConfigDraft(nextDraft);
    setMeasurementConfigSaveStatus("idle");
    return nextDraft;
  };
}

export function createOpenMeasurementConfigDialog(__appScope: GraphMeasurementScope) {
  return () => {
  const { prepareMeasurementConfigDraft, setMeasurementConfigDialogOpen } = __appScope;
    prepareMeasurementConfigDraft();
    setMeasurementConfigDialogOpen(true);
  };
}

export function createCloseMeasurementConfigDialog(__appScope: GraphMeasurementScope) {
  return () => {
  const { measurementConfigDraftRef, setMeasurementConfigDialogOpen, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    setMeasurementConfigDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
  };
}

export function createFlushMeasurementConfigDialogDraftInputs(__appScope: GraphMeasurementScope) {
  return () => {
  const { flushSync, measurementConfigDialogRef } = __appScope;
    if (typeof document === "undefined") {
      return;
    }
    const activeElement = document.activeElement as HTMLElement | null;
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

const measurementComplianceKey = (value: unknown) => String(value ?? "").trim().toLowerCase();

const duplicateMeasurementTypeValues = (measurementTypes: MeasurementTypeDefinition[], field: "id" | "name") => {
  const counts = new Map<string, number>();
  for (const type of measurementTypes) {
    const value = String(type[field] ?? "").trim();
    if (!value) {
      continue;
    }
    const key = measurementComplianceKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const firstValueByKey = new Map<string, string>();
  for (const type of measurementTypes) {
    const value = String(type[field] ?? "").trim();
    const key = measurementComplianceKey(value);
    if (value && !firstValueByKey.has(key)) {
      firstValueByKey.set(key, value);
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => firstValueByKey.get(key) ?? key);
};

export const measurementTypeComplianceMessage = (measurementTypes: MeasurementTypeDefinition[]) => {
  const messages: string[] = [];
  if (measurementTypes.length === 0) {
    messages.push("量测类型列表不能为空。");
  }
  measurementTypes.forEach((type, index) => {
    const rowLabel = `量测类型第 ${index + 1} 行`;
    if (!String(type.id ?? "").trim()) {
      messages.push(`${rowLabel}：ID不能为空。`);
    }
    if (!String(type.name ?? "").trim()) {
      messages.push(`${rowLabel}：名称不能为空。`);
    }
    if (!String(type.shortLabel ?? "").trim()) {
      messages.push(`${rowLabel}：标签不能为空。`);
    }
    if (!["number", "string", "boolean"].includes(String(type.valueType ?? ""))) {
      messages.push(`${rowLabel}：取值类型无效。`);
    }
    if (!Number.isInteger(Number(type.defaultDecimals)) || Number(type.defaultDecimals) < 0 || Number(type.defaultDecimals) > 8) {
      messages.push(`${rowLabel}：默认小数位必须是0到8之间的整数。`);
    }
    if (!Number.isFinite(Number(type.defaultFontSize)) || Number(type.defaultFontSize) < 6 || Number(type.defaultFontSize) > 96) {
      messages.push(`${rowLabel}：默认字号必须是6到96之间的数字。`);
    }
  });
  const duplicateIds = duplicateMeasurementTypeValues(measurementTypes, "id");
  const duplicateNames = duplicateMeasurementTypeValues(measurementTypes, "name");
  if (duplicateIds.length > 0) {
    messages.push(`量测类型ID不能重复：${duplicateIds.join("、")}`);
  }
  if (duplicateNames.length > 0) {
    messages.push(`量测类型名称不能重复：${duplicateNames.join("、")}`);
  }
  return messages.join("\n");
};

export const measurementProfileItemsComplianceMessage = (
  items: DeviceMeasurementProfileItem[],
  options: {
    measurementTypes: readonly MeasurementTypeDefinition[];
    parameterDefinitions?: readonly DeviceParameterDefinition[];
    positionDefinitions?: readonly MeasurementProfilePositionDefinition[];
    targetLabel?: string;
  }
) => {
  const messages: string[] = [];
  const validTypeIds = new Set(options.measurementTypes.map((type) => String(type.id ?? "").trim()).filter(Boolean));
  const validFieldNames = new Set(
    (options.parameterDefinitions ?? [])
      .map((definition) => measurementComplianceKey(definition?.enName))
      .filter(Boolean)
  );
  const hasParameterDefinitions = (options.parameterDefinitions ?? []).some((definition) => String(definition?.enName ?? "").trim());
  const positionDefinitionByValue = options.positionDefinitions
    ? new Map(options.positionDefinitions.map((definition) => [definition.value, definition]))
    : null;
  const seenBindingKeys = new Map<string, number>();
  const seenSourcePoints = new Map<string, number>();
  const label = options.targetLabel ? `${options.targetLabel}量测` : "量测";
  items.forEach((item, index) => {
    const rowLabel = `${label}第 ${index + 1} 行`;
    const sourcePoint = String((item as any).sourcePoint ?? "").trim();
    if (sourcePoint) {
      const previousSourcePointIndex = seenSourcePoints.get(sourcePoint);
      if (previousSourcePointIndex !== undefined) {
        messages.push(`${rowLabel}：测点 ${sourcePoint} 与第 ${previousSourcePointIndex + 1} 行重复。`);
      } else {
        seenSourcePoints.set(sourcePoint, index);
      }
    }
    const measurementTypeId = String(item.measurementTypeId ?? "").trim();
    const position = String(item.position ?? "device").trim();
    const associatedField = String(item.associatedField ?? "").trim();
    if (!measurementTypeId) {
      messages.push(`${rowLabel}：量测类型不能为空。`);
    } else if (!validTypeIds.has(measurementTypeId)) {
      messages.push(`${rowLabel}：量测类型 ${measurementTypeId} 不存在。`);
    }
    if (!position) {
      messages.push(`${rowLabel}：量测位置不能为空。`);
    } else if (positionDefinitionByValue && !positionDefinitionByValue.has(position)) {
      messages.push(`${rowLabel}：量测位置 ${position} 不存在。`);
    }
    const positionDefinition = positionDefinitionByValue?.get(position);
    const positionFieldNames = positionDefinition
      ? new Set(
          positionDefinition.parameterDefinitions
            .map((definition) => measurementComplianceKey(definition?.enName))
            .filter(Boolean)
        )
      : validFieldNames;
    const shouldValidateAssociatedField = Boolean(positionDefinitionByValue) || hasParameterDefinitions;
    if (associatedField && shouldValidateAssociatedField && !positionFieldNames.has(measurementComplianceKey(associatedField))) {
      messages.push(`${rowLabel}：关联字段 ${associatedField} 不在元件属性名称列表中。`);
    }
    const bindingKey = [
      measurementComplianceKey(position || "device"),
      measurementComplianceKey(measurementTypeId),
      measurementComplianceKey(associatedField || measurementTypeId)
    ].join("\u0000");
    if (measurementTypeId) {
      const previousIndex = seenBindingKeys.get(bindingKey);
      if (previousIndex !== undefined) {
        messages.push(`${rowLabel}：与第 ${previousIndex + 1} 行量测重复。`);
      } else {
        seenBindingKeys.set(bindingKey, index);
      }
    }
  });
  return messages.join("\n");
};

export const measurementConfigComplianceMessage = (config: PlatformMeasurementConfig) => {
  const messages: string[] = [];
  const typeMessage = measurementTypeComplianceMessage(config.measurementTypes);
  if (typeMessage) {
    messages.push(typeMessage);
  }
  config.deviceProfiles.forEach((profile) => {
    const profileMessage = measurementProfileItemsComplianceMessage(profile.items, {
      measurementTypes: config.measurementTypes,
      targetLabel: profile.deviceKind ? `${profile.deviceKind} ` : ""
    });
    if (profileMessage) {
      messages.push(profileMessage);
    }
  });
  return messages.join("\n");
};

export function createSaveMeasurementConfigDialog(__appScope: GraphMeasurementScope) {
  return async () => {
  const { backendMeasurementConfigLoadedRef, flushMeasurementConfigDialogDraftInputs, lastPersistedMeasurementConfigPayloadRef, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, nodes, normalizeMeasurementConfig, projectMeasurements, pushUndoSnapshot, reconcileProjectMeasurementsWithConfig, saveBackendMeasurementConfigPayload, serializeMeasurementConfigForStorage, setMeasurementConfig, setMeasurementConfigDraft, setMeasurementConfigSaveStatus, setProjectMeasurements, writeMeasurementConfig, writeOperationLog } = __appScope;
    flushMeasurementConfigDialogDraftInputs?.();
    const previousMeasurementConfig = normalizeMeasurementConfig(measurementConfig);
    const normalizedMeasurementConfig = normalizeMeasurementConfig(measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig);
    const complianceMessage = measurementConfigComplianceMessage(normalizedMeasurementConfig);
    if (complianceMessage) {
      setMeasurementConfigSaveStatus("error");
      showGlobalMessage(complianceMessage);
      return;
    }
    const reconciledMeasurements = reconcileProjectMeasurementsWithConfig(
      projectMeasurements,
      nodes,
      normalizedMeasurementConfig,
      previousMeasurementConfig
    );
    if (reconciledMeasurements !== projectMeasurements) {
      pushUndoSnapshot();
      setProjectMeasurements(reconciledMeasurements);
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
      showGlobalMessage("量测配置已保存到本地，但保存到后台失败，请检查后台服务。");
    }
  };
}

export function createUpdateMeasurementType(__appScope: GraphMeasurementScope) {
  return (typeId: string, patch: Partial<MeasurementTypeDefinition>) => {
  const { updateMeasurementConfig } = __appScope;
    updateMeasurementConfig((current: any) => ({
      ...current,
      measurementTypes: current.measurementTypes.map((item: any) => item.id === typeId ? { ...item, ...patch } : item)
    }));
  };
}

export function createAddMeasurementType(__appScope: GraphMeasurementScope) {
  return async () => {
  const { measurementConfig, measurementConfigDraft, measurementConfigDraftRef, updateMeasurementConfig } = __appScope;
    const name = await showGlobalPrompt("请输入量测类型名称", "新量测");
    const normalizedName = name?.trim();
    if (!normalizedName) {
      return;
    }
    const currentMeasurementConfig = measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig;
    const existingNames = new Set(currentMeasurementConfig.measurementTypes.map((type: any) => String(type.name ?? "").trim()).filter(Boolean));
    if (existingNames.has(normalizedName)) {
      showGlobalMessage(`量测类型名称不能重复：${normalizedName}`);
      return;
    }
    const existingIds = new Set(currentMeasurementConfig.measurementTypes.map((type: any) => String(type.id ?? "").trim()).filter(Boolean));
    const idBase = `customMeasurement${Date.now().toString(36)}`;
    let id = idBase;
    let suffix = 1;
    while (existingIds.has(id)) {
      id = `${idBase}_${suffix}`;
      suffix += 1;
    }
    updateMeasurementConfig((current: any) => ({
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
          defaultValue: 0,
          defaultColor: "#334155",
          defaultFontFamily: "Arial",
          defaultFontSize: 12,
          defaultFontWeight: "700",
          defaultVisible: true
        }
      ]
    }));
  };
}

export function createDeleteMeasurementType(__appScope: GraphMeasurementScope) {
  return async (typeId: string) => {
  const { updateMeasurementConfig } = __appScope;
    if (!await showGlobalConfirm("删除该量测类型后，设备类型默认绑定里也会同步移除，是否继续？")) {
      return;
    }
    updateMeasurementConfig((current: any) => ({
      measurementTypes: current.measurementTypes.filter((item: any) => item.id !== typeId),
      deviceProfiles: current.deviceProfiles.map((profile: any) => ({
        ...profile,
        items: profile.items.filter((item: any) => item.measurementTypeId !== typeId)
      }))
    }));
  };
}

export function createSetMeasurementProfileItems(__appScope: GraphMeasurementScope) {
  return (deviceKind: string, items: DeviceMeasurementProfileItem[]) => {
  const { updateMeasurementConfig } = __appScope;
    updateMeasurementConfig((current: any) => {
      const exists = current.deviceProfiles.some((profile: any) => profile.deviceKind === deviceKind);
      return {
        ...current,
        deviceProfiles: exists
          ? current.deviceProfiles.map((profile: any) => profile.deviceKind === deviceKind ? { ...profile, items } : profile)
          : [...current.deviceProfiles, { deviceKind, items }]
      };
    });
  };
}

export function createCreateMeasurementProfileItem(__appScope: GraphMeasurementScope) {
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

export function createAddMeasurementProfileItem(__appScope: GraphMeasurementScope) {
  return (deviceKind: string) => {
  const { createMeasurementProfileItem, editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const item = createMeasurementProfileItem();
    if (!item) {
      showGlobalMessage("请先配置至少一个量测类型。");
      return;
    }
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    setMeasurementProfileItems(deviceKind, [...currentItems, item]);
  };
}

export function createUpdateMeasurementProfileItem(__appScope: GraphMeasurementScope) {
  return (deviceKind: string, index: number, patch: Partial<DeviceMeasurementProfileItem>) => {
  const { editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    if (index < 0 || index >= currentItems.length) {
      return;
    }
    setMeasurementProfileItems(deviceKind, currentItems.map((item: any, itemIndex: any) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };
}

export function createDeleteMeasurementProfileItem(__appScope: GraphMeasurementScope) {
  return (deviceKind: string, index: number) => {
  const { editableMeasurementProfileByKind, setMeasurementProfileItems } = __appScope;
    const currentItems = editableMeasurementProfileByKind.get(deviceKind)?.items ?? [];
    setMeasurementProfileItems(deviceKind, currentItems.filter((_: any, itemIndex: any) => itemIndex !== index));
  };
}

export function createMoveMeasurementProfileItem(__appScope: GraphMeasurementScope) {
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

export function createUpdateProjectMeasurementsWithUndo(__appScope: GraphMeasurementScope) {
  return (updater: (current: ProjectMeasurementConfig) => ProjectMeasurementConfig, logText?: string) => {
  const { nodes, normalizeProjectMeasurements, pushUndoSnapshot, setProjectMeasurements, writeOperationLog } = __appScope;
    pushUndoSnapshot();
    setProjectMeasurements((current: any) => normalizeProjectMeasurements(updater(current), nodes));
    if (logText) {
      writeOperationLog(logText);
    }
  };
}

export function createAddDefaultMeasurementsToNode(__appScope: GraphMeasurementScope) {
  return (node: ModelNode) => {
  const { createDefaultMeasurementGroupsForNode, isStaticNode, measurementConfig, updateProjectMeasurementsWithUndo, upsertMeasurementGroups } = __appScope;
    const runtimeMeasurementConfig = __appScope.runtimeMeasurementConfig ?? measurementConfig;
    if (isStaticNode(node)) {
      return;
    }
    const groups = createDefaultMeasurementGroupsForNode(node, runtimeMeasurementConfig);
    if (groups.length === 0) {
      showGlobalMessage("该设备类型还没有绑定默认量测，请先在基础页配置设备类型可用量测。");
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current: any) => upsertMeasurementGroups(current, groups),
      `添加动态量测：${node.name}`
    );
  };
}

export function createRemoveMeasurementsFromNode(__appScope: GraphMeasurementScope) {
  return (node: ModelNode) => {
  const { removeMeasurementGroupForNode, updateProjectMeasurementsWithUndo } = __appScope;
    updateProjectMeasurementsWithUndo(
      (current: any) => removeMeasurementGroupForNode(current, node.id),
      `删除动态量测：${node.name}`
    );
  };
}

export function createMeasurementGroupShellOffsetForNode(__appScope: GraphMeasurementScope) {
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

export function createMeasurementSourcePointForNodeItem(__appScope: GraphMeasurementScope) {
  return (
    node: ModelNode,
    item: Pick<DeviceMeasurementProfileItem, "measurementTypeId" | "role" | "associatedField">,
    terminalId?: string
  ) => {
    const sourceKey = item.associatedField || `${item.role ? `${item.role}.` : ""}${item.measurementTypeId}`;
    return terminalId ? `${node.id}.${terminalId}.${sourceKey}` : `${node.id}.${sourceKey}`;
  };
}

export function createMeasurementTypeOptionsForMeasurementGroup(__appScope: GraphMeasurementScope) {
  return (node: ModelNode, group?: Pick<MeasurementGroup, "terminalId">): MeasurementTypeDefinition[] => {
  const { measurementConfig, measurementProfileItemsForMeasurementGroup } = __appScope;
    const profileItems = measurementProfileItemsForMeasurementGroup(node, group?.terminalId);
    const allowedTypeIds = new Set(profileItems.map((item: any) => item.measurementTypeId));
    return allowedTypeIds.size > 0
      ? measurementConfig.measurementTypes.filter((type: any) => allowedTypeIds.has(type.id))
      : measurementConfig.measurementTypes;
  };
}

export function createCreateMeasurementItemForNode(__appScope: GraphMeasurementScope) {
  return (
    node: ModelNode,
    measurementTypeId?: string,
    terminalId?: string,
    existingItems: readonly MeasurementItemBinding[] = []
  ): MeasurementItemBinding | null => {
  const { measurementConfig, measurementProfileItemsForMeasurementGroup, measurementSourcePointForNodeItem, measurementTypeById } = __appScope;
    // item.id 不是纯临时值：它进 projectMeasurements（随方案/项目持久化）、进
    // runtimeSnapshot 的 measurements 字段、进渲染层的 `mv-${item.id}`（本文件与
    // appToolbarHookFactories.tsx）、还经 svgExportUtils.ts 的 exportMeasurementScopedId
    // 进入 buildSvgDocument 导出的 SVG 元素 id；measurements.ts 的 isManualMeasurementItem
    // 还会按 `${groupId}-${typeId}-<base36{6,}>-<base36{4}>` 解析它的后缀。
    // 所以随机源必须可注入，测试才能拿到可复现的 id。默认仍是 Math.random，行为逐字不变。
    const randomSource: () => number = typeof __appScope.randomSource === "function" ? __appScope.randomSource : Math.random;
    const profileItems = measurementProfileItemsForMeasurementGroup(node, terminalId);
    const usedTypeIds = new Set(existingItems.map((item) => item.measurementTypeId));
    const profileItem = measurementTypeId
      ? profileItems.find((item: any) => item.measurementTypeId === measurementTypeId)
      : profileItems.find((item: any) => !usedTypeIds.has(item.measurementTypeId)) ?? profileItems[0];
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
      id: `measurement-${node.id}${terminalId ? `-${terminalId}` : ""}-${type.id}-${Date.now().toString(36)}-${randomSource().toString(36).slice(2, 6)}`,
      name: profileItem?.name ?? type.name,
      measurementTypeId: type.id,
      role: profileItem?.role,
      sourcePoint,
      visible: profileItem?.defaultVisible ?? type.defaultVisible,
      labelOverride: profileItem?.name ?? profileItem?.labelOverride,
      unitOverride: profileItem?.unitOverride,
      formatOverride: profileItem?.formatOverride,
      decimalsOverride: profileItem?.decimalsOverride,
      styleOverride: profileItem?.styleOverride
    };
  };
}

export function createUpdateMeasurementGroupById(__appScope: GraphMeasurementScope) {
  return (groupId: string, updater: (group: MeasurementGroup) => MeasurementGroup, logText?: string) => {
  const { updateProjectMeasurementsWithUndo } = __appScope;
    updateProjectMeasurementsWithUndo(
      (current: any) => ({
        version: 1,
        groups: current.groups.map((group: any) => group.id === groupId ? updater(group) : group)
      }),
      logText
    );
  };
}

export function createUpdateSelectedMeasurementGroup(__appScope: GraphMeasurementScope) {
  return (updater: (group: MeasurementGroup) => MeasurementGroup, logText?: string) => {
  const { selectedMeasurementGroup, updateMeasurementGroupById } = __appScope;
    if (!selectedMeasurementGroup) {
      return;
    }
    updateMeasurementGroupById(selectedMeasurementGroup.id, updater, logText);
  };
}

export function createUpdateSelectedMeasurementGroups(__appScope: GraphMeasurementScope) {
  return (updater: (group: MeasurementGroup) => MeasurementGroup, logText?: string) => {
  const { selectedMeasurementGroupIdSet, updateProjectMeasurementsWithUndo } = __appScope;
    if (selectedMeasurementGroupIdSet.size === 0) {
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current: any) => ({
        version: 1,
        groups: current.groups.map((group: any) => selectedMeasurementGroupIdSet.has(group.id) ? updater(group) : group)
      }),
      logText
    );
  };
}

export function createAddMeasurementItemToGroup(__appScope: GraphMeasurementScope) {
  return (node: ModelNode, group: MeasurementGroup) => {
  const { createMeasurementItemForNode, isStaticNode, updateProjectMeasurementsWithUndo, upsertMeasurementGroup } = __appScope;
    if (isStaticNode(node)) {
      return;
    }
    const item = createMeasurementItemForNode(node, undefined, group.terminalId, group.items);
    if (!item) {
      showGlobalMessage("请先配置至少一个量测类型。");
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current: any) => upsertMeasurementGroup(current, { ...group, items: [...group.items, item] }),
      `添加量测项：${node.name}`
    );
  };
}

export function createAddMeasurementItemToNode(__appScope: GraphMeasurementScope) {
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

// 默认测点与创建量测项时（measurementSourcePointForNodeItem）保持同一公式：
// associatedField || (role ? "role." : "") + measurementTypeId，前缀 节点ID[.端子ID]。
// profile 查不到（节点缺失或 scope 未注入）时退化为 节点ID[.端子ID].量测类型ID。
const measurementDefaultSourcePointForGroupItem = (
  __appScope: GraphMeasurementScope,
  group: { nodeId: string; terminalId?: string },
  item: { measurementTypeId: string; role?: string }
): string => {
  const { nodeById, measurementProfileItemsForMeasurementGroup, measurementSourcePointForNodeItem } = __appScope;
  const node = nodeById?.get?.(group.nodeId);
  if (node && measurementProfileItemsForMeasurementGroup && measurementSourcePointForNodeItem) {
    const profileItem = measurementProfileItemsForMeasurementGroup(node, group.terminalId)
      .find((profile: { measurementTypeId: string }) => profile.measurementTypeId === item.measurementTypeId);
    return measurementSourcePointForNodeItem(
      node,
      { measurementTypeId: item.measurementTypeId, role: profileItem?.role ?? item.role, associatedField: profileItem?.associatedField },
      group.terminalId
    );
  }
  return group.terminalId ? `${group.nodeId}.${group.terminalId}.${item.measurementTypeId}` : `${group.nodeId}.${item.measurementTypeId}`;
};

export function createUpdateMeasurementItem(__appScope: GraphMeasurementScope) {
  return (
    groupId: string,
    itemId: string,
    updater: (item: MeasurementItemBinding) => MeasurementItemBinding,
    logText?: string
  ) => {
  const { updateMeasurementGroupById, projectMeasurements } = __appScope;
    // projectMeasurements 结构为 { version, groups }，取 groups 数组供查重
    const measurementGroups = Array.isArray(projectMeasurements) ? projectMeasurements : (projectMeasurements?.groups ?? []);
    const targetGroup = measurementGroups.find((group: any) => group.id === groupId);
    const targetItem = targetGroup?.items.find((item: any) => item.id === itemId);
    const nextItem = targetItem ? updater(targetItem) : undefined;
    // 测点作为运行时绑定唯一 key：改 sourcePoint 时跨全部量测组查重，重复则还原为默认测点并提示
    if (targetItem && nextItem && String(nextItem.sourcePoint ?? "").trim() && nextItem.sourcePoint !== targetItem.sourcePoint) {
      const duplicate = measurementGroups.some((group: any) =>
        group.items.some((item: any) => item.id !== itemId && String(item.sourcePoint ?? "").trim() === String(nextItem.sourcePoint ?? "").trim())
      );
      if (duplicate && targetGroup) {
        // 还原为创建时的默认测点（按量测 profile 反查 associatedField/role），antd message.error 提示，5 秒自动消失
        const defaultSourcePoint = measurementDefaultSourcePointForGroupItem(__appScope, targetGroup, nextItem);
        // 还原值自身已被其他项占用时不自动改写，保留原测点并提示，避免制造新重复
        const defaultDuplicate = measurementGroups.some((group: any) =>
          group.items.some((item: any) => item.id !== itemId && String(item.sourcePoint ?? "").trim() === String(defaultSourcePoint ?? "").trim())
        );
        if (defaultDuplicate) {
          message.error({
            content: `测点 ${nextItem.sourcePoint} 已被其他量测使用，且默认测点 ${defaultSourcePoint} 也被占用，已保留原测点，请手动更换。`,
            duration: 5
          });
          return;
        }
        updateMeasurementGroupById(groupId, (group: any) => ({
          ...group,
          items: group.items.map((item: any) => item.id === itemId ? { ...item, sourcePoint: defaultSourcePoint } : item)
        }), "还原量测测点为默认值");
        message.error({
          content: `测点 ${nextItem.sourcePoint} 已被其他量测使用，已还原为默认测点 ${defaultSourcePoint}。`,
          duration: 5
        });
        return;
      }
    }
    updateMeasurementGroupById(groupId, (group: any) => ({
      ...group,
      items: group.items.map((item: any) => item.id === itemId ? updater(item) : item)
    }), logText);
  };
}

export function createRemoveMeasurementItem(__appScope: GraphMeasurementScope) {
  return (groupId: string, itemId: string) => {
  const { updateMeasurementGroupById } = __appScope;
    updateMeasurementGroupById(groupId, (group: any) => ({
      ...group,
      items: group.items.filter((item: any) => item.id !== itemId)
    }), "删除量测项");
  };
}

export function createCreateMeasurementEditorGroupForPosition(__appScope: GraphMeasurementScope) {
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

export function createUpdateMeasurementEditorGroupSettings(__appScope: GraphMeasurementScope) {
  return (updater: (group: MeasurementGroup) => MeasurementGroup) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current: any) => current
      ? {
          ...current,
          drafts: current.drafts.map((group: any) => updater(group))
        }
      : current
    );
  };
}

export function createUpdateMeasurementEditorDraftItem(__appScope: GraphMeasurementScope) {
  return (
    groupId: string,
    itemId: string,
    updater: (item: MeasurementItemBinding) => MeasurementItemBinding
  ) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current: any) => current
      ? {
          ...current,
          drafts: current.drafts.map((group: any) => group.id === groupId
            ? { ...group, items: group.items.map((item: any) => item.id === itemId ? updater(item) : item) }
            : group
          )
        }
      : current
    );
  };
}

export function createAddMeasurementEditorDraftItem(__appScope: GraphMeasurementScope) {
  return (node: ModelNode) => {
  const { createMeasurementEditorGroupForPosition, createMeasurementItemForNode, measurementEditorDialog, setMeasurementEditorDialog } = __appScope;
    if (!measurementEditorDialog) {
      return;
    }
    const terminalId = undefined;
    const draft = measurementEditorDialog.drafts.find((group: any) => group.terminalId === terminalId);
    const existingItems = draft?.items ?? [];
    const item = createMeasurementItemForNode(
      node,
      undefined,
      terminalId,
      existingItems
    );
    if (!item) {
      showGlobalMessage("请先配置至少一个量测类型。");
      return;
    }
    setMeasurementEditorDialog((current: any) => {
      if (!current) {
        return current;
      }
      const targetGroup = current.drafts.find((group: any) => group.terminalId === terminalId);
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
        drafts: current.drafts.map((group: any) => group.id === targetGroup.id
          ? { ...group, items: [...group.items, item] }
          : group
        )
      };
    });
  };
}

export function createRemoveMeasurementEditorDraftItem(__appScope: GraphMeasurementScope) {
  return (groupId: string, itemId: string) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current: any) => current
      ? {
          ...current,
          drafts: current.drafts.map((group: any) => group.id === groupId
            ? { ...group, items: group.items.filter((item: any) => item.id !== itemId) }
            : group
          )
        }
      : current
    );
  };
}

export function createMoveMeasurementEditorDraftItem(__appScope: GraphMeasurementScope) {
  return (groupId: string, itemId: string, direction: -1 | 1) => {
  const { setMeasurementEditorDialog } = __appScope;
    setMeasurementEditorDialog((current: any) => current
      ? {
          ...current,
          drafts: current.drafts.map((group: any) => {
            if (group.id !== groupId) {
              return group;
            }
            const index = group.items.findIndex((item: any) => item.id === itemId);
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

export function createUpdateMeasurementEditorDraftItemPosition(__appScope: GraphMeasurementScope) {
  return (
    node: ModelNode,
    sourceGroupId: string,
    itemId: string,
    terminalIdValue: string
  ) => {
  const { createMeasurementEditorGroupForPosition, measurementSourcePointForNodeItem, setMeasurementEditorDialog } = __appScope;
    const terminalId = terminalIdValue || undefined;
    setMeasurementEditorDialog((current: any) => {
      if (!current) {
        return current;
      }
      const sourceGroup = current.drafts.find((group: any) => group.id === sourceGroupId);
      const item = sourceGroup?.items.find((candidate: any) => candidate.id === itemId);
      if (!sourceGroup || !item || sourceGroup.terminalId === terminalId) {
        return current;
      }
      const movedItem: MeasurementItemBinding = {
        ...item,
        sourcePoint: measurementSourcePointForNodeItem(node, item, terminalId)
      };
      const template = current.drafts[0] ?? sourceGroup;
      const existingTargetGroup = current.drafts.find((group: any) => group.terminalId === terminalId);
      const targetGroup = existingTargetGroup ?? createMeasurementEditorGroupForPosition(node, terminalId, template);
      const targetGroupId = targetGroup.id;
      const draftsWithoutItem = current.drafts.map((group: any) => group.id === sourceGroupId
        ? { ...group, items: group.items.filter((candidate: any) => candidate.id !== itemId) }
        : group
      );
      const targetExists = draftsWithoutItem.some((group: any) => group.id === targetGroupId);
      const drafts = targetExists
        ? draftsWithoutItem.map((group: any) => group.id === targetGroupId
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

export function createDuplicateMeasurementEditorItemNames(__appScope: GraphMeasurementScope) {
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

export function createConfirmMeasurementEditorDialog(__appScope: GraphMeasurementScope) {
  return () => {
  const { cloneMeasurementGroupForDraft, duplicateMeasurementEditorItemNames, measurementEditorDialog, measurementEditorItemName, nodeById, projectMeasurements, setMeasurementEditorDialog, updateProjectMeasurementsWithUndo } = __appScope;
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
      showGlobalMessage(`同一个设备下量测名称不能重复：${duplicateNames.join("、")}`);
      return;
    }
    // 测点查重（与右侧面板编辑/保存校验同一策略）：drafts 内部互查 + 与其他节点的现有量测组互查。
    // 本节点现有组将被 drafts 整体替换，不参与查重。
    const draftGroups = measurementEditorDialog.drafts.filter((group: any) => group.items.length > 0);
    const otherNodeGroups = (Array.isArray(projectMeasurements) ? projectMeasurements : (projectMeasurements?.groups ?? []))
      .filter((group: any) => group.nodeId !== node.id);
    const seenSourcePoints = new Map<string, string>();
    const duplicateSourcePoints = new Set<string>();
    const collectSourcePoint = (ownerLabel: string, item: { sourcePoint?: string }) => {
      const sourcePoint = String(item.sourcePoint ?? "").trim();
      if (!sourcePoint) {
        return;
      }
      const previousOwner = seenSourcePoints.get(sourcePoint);
      if (previousOwner !== undefined) {
        duplicateSourcePoints.add(`${sourcePoint}（${previousOwner} / ${ownerLabel}）`);
      } else {
        seenSourcePoints.set(sourcePoint, ownerLabel);
      }
    };
    draftGroups.forEach((group: any, groupIndex: any) => {
      group.items.forEach((item: any, itemIndex: any) => collectSourcePoint(`本设备第 ${groupIndex + 1} 组第 ${itemIndex + 1} 项`, item));
    });
    otherNodeGroups.forEach((group: any) => {
      group.items.forEach((item: any) => collectSourcePoint(`设备 ${group.nodeId}`, item));
    });
    if (duplicateSourcePoints.size > 0) {
      showGlobalMessage(`量测测点不能重复：${Array.from(duplicateSourcePoints).join("、")}`);
      return;
    }
    const drafts = draftGroups
      .map((group: any) => cloneMeasurementGroupForDraft({
        ...group,
        nodeId: node.id,
        items: group.items.map((item: any) => ({
          ...item,
          name: measurementEditorItemName(item)
        }))
      }));
    updateProjectMeasurementsWithUndo(
      (current: any) => ({
        version: 1,
        groups: [
          ...current.groups.filter((group: any) => group.nodeId !== node.id),
          ...drafts
        ]
      }),
      `修改量测信息：${node.name}`
    );
    setMeasurementEditorDialog(null);
  };
}

export function createRenderSelectedNodeMeasurementTable(__appScope: GraphMeasurementScope) {
  return (node: ModelNode) => {
  const { DeferredColorInput, Fragment, Trash2, addDefaultMeasurementsToNode, addMeasurementItemToGroup, measurementConfig, measurementGroupBackgroundColor, measurementTypeById, measurementTypeOptionsForMeasurementGroup, removeMeasurementItem, removeMeasurementsFromNode, currentModelRecord, selectedProjectRecord, activeProjectRecord, selectedMeasurementGroups, table, tbody, td, th, updateMeasurementItem, updateSelectedMeasurementGroups } = __appScope;
    const persistedMeasurementConfig = currentModelRecord?.project?.measurements;
    const hasPersistedMeasurementBaseline = Boolean(
      (selectedProjectRecord || activeProjectRecord) &&
      persistedMeasurementConfig &&
      Array.isArray(persistedMeasurementConfig.groups)
    );
    const persistedGroupById = new Map(
      (hasPersistedMeasurementBaseline ? persistedMeasurementConfig.groups : []).map((group: any) => [group.id, group])
    );
    const valuesEqual = (left: unknown, right: unknown) => {
      const leftText = String(left ?? "").trim();
      const rightText = String(right ?? "").trim();
      if (leftText === rightText) return true;
      const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
      if (numericPattern.test(leftText) && numericPattern.test(rightText)) {
        return Number(leftText) === Number(rightText);
      }
      return false;
    };
    const effectiveGroupValue = (group: MeasurementGroup, key: string) => {
      switch (key) {
        case "visible": return group.visible !== false;
        case "labelVisible": return group.labelVisible !== false;
        case "unitVisible": return group.unitVisible !== false;
        case "backgroundColor": return group.backgroundColor ?? DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR;
        case "borderColor": return group.borderColor ?? DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR;
        case "borderStyle": return group.borderStyle ?? DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE;
        case "borderWidth": return group.borderWidth ?? DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH;
        case "layout": return group.layout ?? "vertical";
        case "fontSize": return group.groupStyleOverride?.fontSize ?? 14;
        case "fontColor": return group.groupStyleOverride?.color ?? "#334155";
        default: return (group as Record<string, any>)[key];
      }
    };
    const isMeasurementGroupModified = (group: MeasurementGroup, key: string) => {
      if (!hasPersistedMeasurementBaseline) return false;
      const savedGroup = persistedGroupById.get(group.id) as MeasurementGroup | undefined;
      return Boolean(savedGroup) && !valuesEqual(effectiveGroupValue(group, key), effectiveGroupValue(savedGroup!, key));
    };
    const isCommonMeasurementGroupModified = (key: string) =>
      selectedMeasurementGroups.some((group: any) => isMeasurementGroupModified(group, key));
    const effectiveItemValue = (group: MeasurementGroup, item: MeasurementItemBinding, key: string) => {
      const type = measurementTypeById.get(item.measurementTypeId);
      const defaultSourcePoint = group.terminalId
        ? `${node.id}.${group.terminalId}.${item.measurementTypeId}`
        : `${node.id}.${item.measurementTypeId}`;
      switch (key) {
        case "measurementTypeId": return item.measurementTypeId;
        case "sourcePoint": return item.sourcePoint || defaultSourcePoint;
        case "label": return item.labelOverride !== undefined ? item.labelOverride : type?.shortLabel || "标签";
        case "format": return item.formatOverride !== undefined ? item.formatOverride : defaultMeasurementDisplayFormat(type?.valueType, type?.defaultDecimals);
        case "unit": return item.unitOverride !== undefined ? item.unitOverride : type?.defaultUnit || "单位";
        case "visible": return item.visible !== false;
        case "fontSize": return item.styleOverride?.fontSize ?? group.groupStyleOverride?.fontSize ?? type?.defaultFontSize ?? 14;
        case "fontWeight": return item.styleOverride?.fontWeight ?? group.groupStyleOverride?.fontWeight ?? type?.defaultFontWeight ?? "500";
        case "color": return item.styleOverride?.color ?? group.groupStyleOverride?.color ?? type?.defaultColor ?? "#334155";
        default: return (item as Record<string, any>)[key];
      }
    };
    const isMeasurementItemModified = (group: MeasurementGroup, item: MeasurementItemBinding, key: string) => {
      if (!hasPersistedMeasurementBaseline) return false;
      const savedGroup = persistedGroupById.get(group.id) as MeasurementGroup | undefined;
      const savedItem = savedGroup?.items?.find((candidate: MeasurementItemBinding) => candidate.id === item.id);
      return Boolean(savedGroup && savedItem) && !valuesEqual(effectiveItemValue(group, item, key), effectiveItemValue(savedGroup!, savedItem!, key));
    };
    const selectedMeasurementGroupCommonDraft = selectedMeasurementGroups[0];
    const renderCommonMeasurementGroupRows = () => {
      if (!selectedMeasurementGroupCommonDraft) {
        return null;
      }
      return (
        <>
          <tr>
            <th>量测</th>
            <td style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <InlineEditableValue
                value={selectedMeasurementGroupCommonDraft.layout}
                displayValue={({ vertical: "竖向", horizontal: "横向", grid: "两列" } as Record<string, string>)[selectedMeasurementGroupCommonDraft.layout] ?? selectedMeasurementGroupCommonDraft.layout}
                modified={isCommonMeasurementGroupModified("layout")}

                options={[
                  { value: "vertical", label: "竖向" },
                  { value: "horizontal", label: "横向" },
                  { value: "grid", label: "两列" }
                ]}
                onCommit={(value) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({ ...current, layout: value as MeasurementGroup["layout"] }))}
              />
              <Button
                type="text"
                size="small"
                className={`visibility-toggle-button${isCommonMeasurementGroupModified("visible") ? " modified" : ""}`}
                data-modified={isCommonMeasurementGroupModified("visible") ? "true" : undefined}
                data-selected={selectedMeasurementGroupCommonDraft.visible === false}

                onClick={() => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({ ...current, visible: !current.visible }))}
                title={selectedMeasurementGroupCommonDraft.visible ? "隐藏量测" : "显示量测"}
              >
                {selectedMeasurementGroupCommonDraft.visible
                  ? <EyeTwoTone style={{ fontSize: 16 }} />
                  : <EyeInvisibleTwoTone style={{ fontSize: 16 }} />}
              </Button>
            </td>
          </tr>
          <tr>
            <th>标签</th>
            <td style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <InlineEditableValue
                value={selectedMeasurementGroupCommonDraft.unitVisible === false ? "0" : "1"}
                displayValue={selectedMeasurementGroupCommonDraft.unitVisible === false ? "无单位" : "单位"}
                modified={isCommonMeasurementGroupModified("unitVisible")}

                options={[
                  { value: "1", label: "单位" },
                  { value: "0", label: "无单位" }
                ]}
                onCommit={(value) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({ ...current, unitVisible: value === "1" }))}
              />
              <Button
                type="text"
                size="small"
                className={`visibility-toggle-button${isCommonMeasurementGroupModified("labelVisible") ? " modified" : ""}`}
                data-modified={isCommonMeasurementGroupModified("labelVisible") ? "true" : undefined}
                data-selected={selectedMeasurementGroupCommonDraft.labelVisible === false}

                onClick={() => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({ ...current, labelVisible: current.labelVisible === false ? true : false }))}
                title={selectedMeasurementGroupCommonDraft.labelVisible === false ? "显示标签" : "隐藏标签"}
              >
                {selectedMeasurementGroupCommonDraft.labelVisible === false
                  ? <EyeInvisibleTwoTone style={{ fontSize: 16 }} />
                  : <EyeTwoTone style={{ fontSize: 16 }} />}
              </Button>
            </td>
          </tr>
          <tr>
            <th>字体</th>
            <td style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <InlineEditableValue
                value={selectedMeasurementGroupCommonDraft.groupStyleOverride?.fontSize ?? 14}
                displayValue={String(selectedMeasurementGroupCommonDraft.groupStyleOverride?.fontSize ?? 14)}
                modified={isCommonMeasurementGroupModified("fontSize")}

                type="number"
                min={8}
                max={24}
                step={1}
                aria-label="量测组字体大小"
                onCommit={(value) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({
                  ...current,
                  groupStyleOverride: {
                    ...(current.groupStyleOverride ?? {}),
                    fontSize: Number(value)
                  }
                }), "修改量测组字体大小")}
              />
              <DeferredColorInput
                value={selectedMeasurementGroupCommonDraft.groupStyleOverride?.color ?? "#334155"}
                fallback="#334155"
                modified={isCommonMeasurementGroupModified("fontColor")}

                aria-label="量测组字体颜色"
                onCommit={(value: string) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({
                  ...current,
                  groupStyleOverride: { ...(current.groupStyleOverride ?? {}), color: value }
                }), "修改量测组字体颜色")}
              />
            </td>
          </tr>
          <tr>
            <th>背景</th>
            <td style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <InlineEditableValue
                value={measurementGroupBackgroundColor(selectedMeasurementGroupCommonDraft) === "transparent" ? "0" : "1"}
                displayValue={measurementGroupBackgroundColor(selectedMeasurementGroupCommonDraft) === "transparent" ? "透明" : "显示"}
                modified={isCommonMeasurementGroupModified("backgroundColor")}

                options={[{ value: "1", label: "显示" }, { value: "0", label: "透明" }]}
                onCommit={(value) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({
                  ...current,
                  backgroundColor: value === "1"
                    ? current.backgroundColor === "transparent" ? "#ffffff" : current.backgroundColor ?? "#ffffff"
                    : "transparent"
                }), "修改量测组背景显示")}
              />
              <DeferredColorInput
                value={selectedMeasurementGroupCommonDraft.backgroundColor ?? ""}
                fallback="#ffffff"
                modified={isCommonMeasurementGroupModified("backgroundColor")}

                aria-label="量测组背景颜色"
                onCommit={(value: string) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({ ...current, backgroundColor: value }), "修改量测组背景颜色")}
              />
            </td>
          </tr>
          <tr>
            <th>边框</th>
            <td style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <InlineEditableValue
                  value={selectedMeasurementGroupCommonDraft.borderStyle ?? "none"}
                  displayValue={({ solid: "实线", dashed: "虚线", dotted: "点线", none: "无边框" } as Record<string, string>)[selectedMeasurementGroupCommonDraft.borderStyle ?? "none"] ?? selectedMeasurementGroupCommonDraft.borderStyle ?? "none"}
                  modified={isCommonMeasurementGroupModified("borderStyle")}

                  options={[
                    { value: "solid", label: "实线" },
                    { value: "dashed", label: "虚线" },
                    { value: "dotted", label: "点线" },
                    { value: "none", label: "无边框" }
                  ]}
                  onCommit={(value) => {
                    const borderStyle = value as MeasurementGroup["borderStyle"];
                    updateSelectedMeasurementGroups((current: MeasurementGroup) => ({
                      ...current,
                      borderStyle,
                      borderWidth: borderStyle === "none" ? 0 : Math.max(1, current.borderWidth ?? 0)
                    }), "修改量测组边框样式");
                  }}
                />
                <InlineEditableValue type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  value={selectedMeasurementGroupCommonDraft.borderWidth ?? 0}
                  displayValue={Number(selectedMeasurementGroupCommonDraft.borderWidth ?? 0).toFixed(3).replace(/\.?(0+)$/, "")}
                  modified={isCommonMeasurementGroupModified("borderWidth")}
                  disabled={(selectedMeasurementGroupCommonDraft.borderStyle ?? "none") === "none"}
                  aria-label="量测组边框宽度"
                  onCommit={(nextValue) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({
                    ...current,
                    borderWidth: clampNumber(Number(nextValue), 0, 12)
                  }), "修改量测组边框宽度")}
                />
              </div>
              <DeferredColorInput
                value={selectedMeasurementGroupCommonDraft.borderColor ?? ""}
                fallback="#64748b"
                modified={isCommonMeasurementGroupModified("borderColor")}
                disabled={(selectedMeasurementGroupCommonDraft.borderStyle ?? "none") === "none"}
                aria-label="量测组边框颜色"
                onCommit={(value: string) => updateSelectedMeasurementGroups((current: MeasurementGroup) => ({ ...current, borderColor: value }), "修改量测组边框颜色")}
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
                <Button type="default" size="small"  onClick={() => addMeasurementItemToGroup(node, group)}>添加到本组</Button>
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
            const itemColor = item.styleOverride?.color ?? group.groupStyleOverride?.color ?? type?.defaultColor ?? "#334155";
            const itemFontSize = item.styleOverride?.fontSize ?? group.groupStyleOverride?.fontSize ?? type?.defaultFontSize ?? 14;
            const sourcePointValue = item.sourcePoint || (group.terminalId ? `${node.id}.${group.terminalId}.${item.measurementTypeId}` : `${node.id}.${item.measurementTypeId}`);
            const labelValue = item.labelOverride !== undefined ? item.labelOverride : type?.shortLabel || "标签";
            const formatValue = item.formatOverride ?? defaultMeasurementDisplayFormat(type?.valueType, type?.defaultDecimals);
            const unitValue = item.unitOverride !== undefined ? item.unitOverride : type?.defaultUnit || "单位";
            return (
              <Fragment key={item.id}>
                <tr className="measurement-item-row">
                  <th>{`量测${itemIndex + 1}`}</th>
                  <td>
                    <div className="measurement-item-toolbar" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "nowrap" }}>
                      <InlineEditableValue
                        value={item.measurementTypeId}
                        displayValue={measurementTypeOptions.find((candidate: MeasurementTypeDefinition) => candidate.id === item.measurementTypeId)?.name ?? item.measurementTypeId}
                        modified={isMeasurementItemModified(group, item, "measurementTypeId")}

                        options={[
                          ...(!measurementTypeOptions.some((candidate: MeasurementTypeDefinition) => candidate.id === item.measurementTypeId) ? [{ value: item.measurementTypeId, label: item.measurementTypeId }] : []),
                          ...measurementTypeOptions.map((candidate: MeasurementTypeDefinition) => ({ value: candidate.id, label: candidate.name }))
                        ]}
                        onCommit={(value) => {
                          const nextTypeId = value;
                          updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({
                            ...current,
                            measurementTypeId: nextTypeId,
                            sourcePoint: current.sourcePoint || (group.terminalId ? `${node.id}.${group.terminalId}.${nextTypeId}` : `${node.id}.${nextTypeId}`)
                          }));
                        }}
                      />
                      <span style={{ marginLeft: "auto" }} />
                      <Button
                        type="text"
                        size="small"
                        className={`visibility-toggle-button${isMeasurementItemModified(group, item, "visible") ? " modified" : ""}`}
                        data-modified={isMeasurementItemModified(group, item, "visible") ? "true" : undefined}
                        data-selected={item.visible === false}

                        onClick={() => updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({ ...current, visible: current.visible === false ? true : false }))}
                        title={item.visible === false ? "显示量测" : "隐藏量测"}
                      >
                        {item.visible === false
                          ? <EyeInvisibleTwoTone style={{ fontSize: 16 }} />
                          : <EyeTwoTone style={{ fontSize: 16 }} />}
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        className="visibility-delete-button"

                        onClick={() => removeMeasurementItem(group.id, item.id)}
                        title="删除量测"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>测点</th>
                  <td>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <InlineEditableValue
                        value={sourcePointValue}
                        modified={isMeasurementItemModified(group, item, "sourcePoint")}

                        onCommit={(nextValue) => {
                          if (nextValue !== sourcePointValue) updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({ ...current, sourcePoint: nextValue }));
                        }}
                      />
                      <Button
                        size="small"

                        title="恢复为默认测点（与创建量测时一致）"
                        onClick={() => updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({
                          ...current,
                          sourcePoint: measurementDefaultSourcePointForGroupItem(__appScope, group, current)
                        }))}
                      >
                        默认
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <th>显示</th>
                  <td>
                    <div className="measurement-display-inline-controls">
                      <div className="measurement-display-inline-row">
                        <div className="measurement-display-inline-control">
                          <InlineEditableValue
                            value={labelValue}
                            modified={isMeasurementItemModified(group, item, "label")}
                            title="名称"
                            aria-label="量测标签"
                            onCommit={(nextValue) => {
                              if (nextValue !== labelValue) updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({ ...current, labelOverride: nextValue }));
                            }}
                          />
                        </div>
                        <div className="measurement-display-inline-control">
                          <InlineEditableValue
                            value={formatValue}
                            modified={isMeasurementItemModified(group, item, "format")}
                            title="显示格式"
                            aria-label="量测显示格式"
                            onCommit={(nextValue) => {
                              if (nextValue.trim() !== formatValue.trim()) updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({ ...current, formatOverride: nextValue.trim() || undefined }));
                            }}
                          />
                        </div>
                        <div className="measurement-display-inline-control">
                          <InlineEditableValue
                            value={unitValue}
                            modified={isMeasurementItemModified(group, item, "unit")}
                            title="单位"
                            aria-label="量测单位"
                            onCommit={(nextValue) => {
                              if (nextValue !== unitValue) updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({ ...current, unitOverride: nextValue }));
                            }}
                          />
                        </div>
                      </div>
                      <div className="measurement-display-inline-row">
                        <div className="measurement-display-inline-control">
                          <InlineEditableValue
                            value={itemFontSize}
                            displayValue={String(itemFontSize)}
                            modified={isMeasurementItemModified(group, item, "fontSize")}
                            title="字号"
                            aria-label="量测字号"
                            options={MEASUREMENT_FONT_SIZE_OPTIONS}
                            onCommit={(value) => updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({
                              ...current,
                              styleOverride: { ...(current.styleOverride ?? {}), fontSize: Number(value) }
                            }))}
                          />
                        </div>
                        <div className="measurement-display-inline-control">
                          <InlineEditableValue
                            value={item.styleOverride?.fontWeight ?? "500"}
                            displayValue={MEASUREMENT_FONT_WEIGHT_LABELS[item.styleOverride?.fontWeight ?? "500"] ?? item.styleOverride?.fontWeight ?? "500"}
                            modified={isMeasurementItemModified(group, item, "fontWeight")}
                            title="字重"
                            aria-label="量测字重"
                            options={MEASUREMENT_FONT_WEIGHT_OPTIONS}
                            onCommit={(value) => updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({
                              ...current,
                              styleOverride: { ...(current.styleOverride ?? {}), fontWeight: value as MeasurementFontWeight }
                            }))}
                          />
                        </div>
                        <div className="measurement-display-inline-color">
                          <DeferredColorInput
                            value={itemColor}
                            modified={isMeasurementItemModified(group, item, "color")}
                            title="颜色"
                            aria-label="量测颜色"
                            onCommit={(value: string) => updateMeasurementItem(group.id, item.id, (current: MeasurementItemBinding) => ({
                              ...current,
                              styleOverride: { ...(current.styleOverride ?? {}), color: value }
                            }))}
                          />
                        </div>
                      </div>
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
                <Button type="default" size="small" disabled={selectedMeasurementGroups.length > 0} onClick={() => addDefaultMeasurementsToNode(node)}>
                  添加默认量测
                </Button>
                <Button type="default" size="small" disabled={selectedMeasurementGroups.length === 0} onClick={() => removeMeasurementsFromNode(node)}>
                  删除量测
                </Button>
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

export function createBeginMeasurementDrag(__appScope: GraphMeasurementScope) {
  return (event: ReactPointerEvent<SVGGElement>, group: MeasurementGroup) => {
  const { measurementGroupAnchorPoint, measurementGroupCanvasPosition, measurementGroupRenderMetrics, nodeById, nodeHasUprightBoundsContent, nodeSmartAlignmentBounds, projectMeasurements, screenToSvgPoint, selectCanvasGraphics, setInspectorTab, setLastCanvasClickTarget, setMeasurementDrag, setSelectedDeviceInfoView, smartAlignmentEnabled, svgRef, visibleNodeById } = __appScope;
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setLastCanvasClickTarget("measurement");
    selectCanvasGraphics([group.nodeId], [], { scope: "direct" });
    setInspectorTab("device");
    setSelectedDeviceInfoView("measurement");
    const startPoint = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const t0 = performance.now();
    // 预计算拖动量测框边界与锚点（拖动中不变，避免每帧重算）
    let draggedBounds: RenderViewportBounds | undefined;
    let alignmentCandidates: SmartAlignmentAxisCandidate[] | undefined;
    let anchorPoint: Point | undefined;
    const node = nodeById?.get(group.nodeId);
    if (node) {
      anchorPoint = measurementGroupAnchorPoint(node, group, true);
      if (smartAlignmentEnabled) {
        const metrics = measurementGroupRenderMetrics(node, group);
        if (metrics) {
          const pos = measurementGroupCanvasPosition(node, group);
          draggedBounds = {
            left: pos.x - metrics.width / 2,
            right: pos.x + metrics.width / 2,
            top: pos.y - metrics.height / 2,
            bottom: pos.y + metrics.height / 2
          };
          // 预计算所有候选
          const candidatesMap = new Map<string, SmartAlignmentAxisCandidate>();
          const addCandidate = (id: string, bounds: RenderViewportBounds) => {
            if (!candidatesMap.has(id)) {
              candidatesMap.set(id, { id, bounds });
            }
          };
          // 设备节点
          const nodes = nodeById?.size > 0 ? nodeById.values() : (visibleNodeById?.size > 0 ? visibleNodeById.values() : []);
          for (const n of nodes) {
            addCandidate(n.id, nodeSmartAlignmentBounds(n, n.position, nodeHasUprightBoundsContent(n)));
          }
          // 其他量测框
          if (projectMeasurements?.groups) {
            for (const otherGroup of projectMeasurements.groups) {
              if (otherGroup.id === group.id) continue;
              const otherNode = nodeById?.get(otherGroup.nodeId);
              if (!otherNode) continue;
              const otherMetrics = measurementGroupRenderMetrics(otherNode, otherGroup);
              if (!otherMetrics) continue;
              const otherPos = measurementGroupCanvasPosition(otherNode, otherGroup);
              addCandidate(`measurement-${otherGroup.id}`, {
                left: otherPos.x - otherMetrics.width / 2,
                right: otherPos.x + otherMetrics.width / 2,
                top: otherPos.y - otherMetrics.height / 2,
                bottom: otherPos.y + otherMetrics.height / 2
              });
            }
          }
          alignmentCandidates = Array.from(candidatesMap.values());
        }
      }
    }
    // 计时日志只在 dev 打印（写法同 qiankunLifecycle.tsx 的 traceLifecycle）：
    // 这条在 pointerdown 触发，拖动开始前必跑，生产构建里既无观测价值又白占控制台。
    if (import.meta.env.DEV) {
      console.log("[量测拖动计时] begin 预计算", (performance.now() - t0).toFixed(1), "ms, 候选数:", alignmentCandidates?.length ?? 0);
    }
    setMeasurementDrag({
      groupId: group.id,
      pointerId: event.pointerId,
      startPoint,
      startOffset: { ...group.offset },
      historyCaptured: false,
      draggedBounds,
      alignmentCandidates,
      anchorPoint
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createUpdateMeasurementDrag(__appScope: GraphMeasurementScope) {
  return (event: ReactPointerEvent<SVGSVGElement>) => {
  const { SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, canvasScrollScaleRef, measurementDragRef, pushUndoSnapshot, screenToSvgPoint, setMeasurementDrag, smartAlignmentEnabled, svgRef, updateSmartAlignmentGuides } = __appScope;
    const measurementDrag = measurementDragRef?.current;
    if (!measurementDrag || measurementDrag.pointerId !== event.pointerId || !svgRef.current) {
      return false;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const deltaX = point.x - measurementDrag.startPoint.x;
    const deltaY = point.y - measurementDrag.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (!measurementDrag.historyCaptured && distance < 4) {
      return true;
    }
    if (!measurementDrag.historyCaptured) {
      const tUndo = performance.now();
      pushUndoSnapshot();
      // 同上：undo 快照只在首次越过阈值时打一次，仍限 dev
      if (import.meta.env.DEV) {
        console.log("[量测拖动计时] undo 快照", (performance.now() - tUndo).toFixed(1), "ms");
      }
      setMeasurementDrag({ ...measurementDrag, historyCaptured: true });
    }
    // 量测框间距不随设备缩放（scale 恒 1），rawOffset = startOffset + 指针位移
    const rawOffset = {
      x: measurementDrag.startOffset.x + deltaX,
      y: measurementDrag.startOffset.y + deltaY
    };
    // 使用缓存的边界和候选（拖动开始时预计算），按指针位移平移边界
    const cachedBounds = measurementDrag.draggedBounds;
    const candidates = measurementDrag.alignmentCandidates;
    let adjustment = { x: 0, y: 0 };
    if (cachedBounds && candidates && smartAlignmentEnabled) {
      const movedBounds = {
        left: cachedBounds.left + deltaX,
        right: cachedBounds.right + deltaX,
        top: cachedBounds.top + deltaY,
        bottom: cachedBounds.bottom + deltaY
      };
      // 与设备拖动一致的阈值换算：屏幕容差除以滚动缩放
      const snapThreshold = (SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE ?? 8) / Math.max(0.2, Math.max(canvasScrollScaleRef?.current?.x ?? 1, canvasScrollScaleRef?.current?.y ?? 1));
      const xSnap = bestSmartAlignmentAxisSnap("x", movedBounds, [], candidates, snapThreshold);
      const ySnap = bestSmartAlignmentAxisSnap("y", movedBounds, [], candidates, snapThreshold);
      const guides = [xSnap?.guide, ySnap?.guide].filter(Boolean);
      updateSmartAlignmentGuides?.(guides);
      adjustment = { x: xSnap?.adjustment ?? 0, y: ySnap?.adjustment ?? 0 };
    } else {
      updateSmartAlignmentGuides?.([]);
    }
    const offset = {
      x: Math.round((rawOffset.x + adjustment.x) * 10) / 10,
      y: Math.round((rawOffset.y + adjustment.y) * 10) / 10
    };
    // 拖动中命令式更新 DOM transform（与设备拖动一致，避免每帧 React 重渲染）
    const anchor = measurementDrag.anchorPoint;
    const groupEl = svgRef.current?.querySelector?.(`[data-export-measurement-group-id="${measurementDrag.groupId}"]`);
    if (groupEl && anchor) {
      groupEl.setAttribute("transform", `translate(${anchor.x + offset.x} ${anchor.y + offset.y})`);
    }
    // 保存偏移供 finish 提交（写入 ref.current：setMeasurementDrag 会替换 ref 指向新对象）
    measurementDragRef.current.pendingOffset = offset;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
}

export function createFinishMeasurementDrag(__appScope: GraphMeasurementScope) {
  return (pointerId?: number) => {
  const { measurementDragRef, setHasUnsavedChanges, setMeasurementDrag, setProjectMeasurements, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
    const measurementDrag = measurementDragRef?.current;
    if (!measurementDrag) {
      return false;
    }
    setMeasurementDrag(null);
    updateSmartAlignmentGuides?.([]);
    if (measurementDrag.historyCaptured) {
      const finalOffset = measurementDrag.pendingOffset;
      if (finalOffset) {
        setProjectMeasurements((current: any) => ({
          version: 1,
          groups: current.groups.map((group: any) => group.id === measurementDrag.groupId ? { ...group, offset: finalOffset, anchor: "custom" } : group)
        }));
      }
      setHasUnsavedChanges(true);
      writeOperationLog("调整动态量测位置");
    }
    return true;
  };
}
