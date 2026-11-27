/** 选区拖拽、群组操作与撤销重做主工厂模块（重导出 appTransformDragFactories）。 */

import type { SelectionDragScope } from "./appScopeTypes";
import { runBatchRerouteInWorker, shouldOffloadBatchRerouteToWorker } from "../routing/routeWorkerClient";
import type {
  CanvasBounds,
  Edge,
  ModelNode,
  Point,
  RoutedEdge,
  Terminal,
} from "../model";
import type { GraphStore } from "../graphStore";
import type {
  BulkMovePlan,
  DraggingState,
  FastMovedGraphCommitOptions,
  NodeDragPreviewRoute,
  NodeTerminalSnapTarget,
  RenderViewportBounds,
  SingleNodeDeferredRepairOptions,
  SingleNodeDragCache,
} from "./appCoreCanvasUtilities";
import type { SelectionRect } from "../selectionActions";
import {
  repairInteractiveConnectionRoute,
  repairInteractiveRoutableLineDeviceRoute
} from "../model-routing";

import {
  type DragPreviewEndpointPoints,
  type RoutableLineDeviceEndpointRefs,
  canvasIdRandom,
  createOverlapEdgeId,
} from "./appTransformDragFactories";

export * from "./appTransformDragFactories";

export function createLocalRouteOptimizationCandidateEdges(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalPositions: Record<string, Point> | undefined,
    directCandidateEdges: Edge[]
  ) => {
  const { MOVE_ROUTE_LOCAL_SEARCH_PADDING, boundsForNodeSet, edgeById, queryRouteSpatialIndex, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const collected = new Map<string, Edge>();
    const directEdgeById = new Map(directCandidateEdges.map((edge) => [edge.id, edge]));
    const addEdge = (edge: Edge | undefined) => {
      if (edge) {
        collected.set(edge.id, edge);
      }
    };
    for (const edge of directCandidateEdges) {
      addEdge(edge);
    }
    for (const edgeId of selectedEdgeIds) {
      addEdge(directEdgeById.get(edgeId) ?? edgeById.get(edgeId));
    }
    const addRoutesNearBounds = (bounds: ReturnType<typeof boundsForNodeSet>) => {
      if (!bounds) {
        return;
      }
      for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, bounds)) {
        addEdge(directEdgeById.get(route.edgeId) ?? edgeById.get(route.edgeId));
      }
    };
    addRoutesNearBounds(boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addRoutesNearBounds(boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return Array.from(collected.values());
  };
}

export function createRoutePointsForMovedNodeBlockers(__appScope: SelectionDragScope) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    baseRoutePoints: DraggingState["originalRoutePoints"]
  ): DraggingState["originalRoutePoints"] => {
  const { boxesOverlap, getRouteBlockingCandidateNodesFromBoxes, getRouteBlockingCandidates, orderedNodesForIds, routeRenderBounds, routeSpatialIndexRenderBounds, routedEdgeById, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const movedNodes = orderedNodesForIds(nextNodes, movedIds);
    if (movedNodes.length === 0) {
      return baseRoutePoints;
    }
    const movedCandidates = getRouteBlockingCandidates(movedNodes);
    const movedCandidateBounds = movedCandidates.reduce(
      (bounds: SelectionRect, candidate: { box: SelectionRect }) => {
        if (!bounds) {
          return { ...candidate.box };
        }
        return {
          left: Math.min(bounds.left, candidate.box.left),
          right: Math.max(bounds.right, candidate.box.right),
          top: Math.min(bounds.top, candidate.box.top),
          bottom: Math.max(bounds.bottom, candidate.box.bottom)
        };
      },
      null
    );
    if (!movedCandidateBounds) {
      return baseRoutePoints;
    }
    let nextRoutePoints = baseRoutePoints;
    for (const edge of candidateEdges) {
      if (baseRoutePoints[edge.id] || movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        continue;
      }
      const route = routedEdgeById.get(edge.id);
      const routeBounds = route ? routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8) : null;
      if (!route || !routeBounds || !boxesOverlap(routeBounds, movedCandidateBounds)) {
        continue;
      }
      if (getRouteBlockingCandidateNodesFromBoxes(route.points, edge, movedCandidates).length === 0) {
        continue;
      }
      if (nextRoutePoints === baseRoutePoints) {
        nextRoutePoints = { ...baseRoutePoints };
      }
      nextRoutePoints[edge.id] = route.points;
    }
    return nextRoutePoints;
  };
}

export function createRoutePointsForMovedEdgesBlockedByStationaryNodes(__appScope: SelectionDragScope) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    baseRoutePoints: DraggingState["originalRoutePoints"],
    bounds?: CanvasBounds
  ): DraggingState["originalRoutePoints"] => {
  const { canvasBounds, getRouteBlockingCandidateNodesFromBoxes, getRouteBlockingCandidates, routeEdgesForStoredRendering, routeIntersectsEndpointNodeBodies, routeIntersectsSpecificNodes, routingNodesForConnectionEdges } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const movedCandidateEdges = candidateEdges.filter((edge) => movedIds.has(edge.sourceId) || movedIds.has(edge.targetId));
    if (movedCandidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const routingNodes = routingNodesForConnectionEdges(movedCandidateEdges, nextNodes, movedIds);
    const stationaryNodes = routingNodes.filter((node: ModelNode) => !movedIds.has(node.id));
    const endpointNodeById = new Map(routingNodes.map((node: ModelNode) => [node.id, node]));
    if (stationaryNodes.length === 0 && endpointNodeById.size === 0) {
      return baseRoutePoints;
    }
    const stationaryCandidates = getRouteBlockingCandidates(stationaryNodes);
    const routeByEdgeId = new Map<string, RoutedEdge>(routeEdgesForStoredRendering(
      routingNodes,
      movedCandidateEdges,
      bounds,
      { preserveManualRouteDisplay: true }
    ).map((route: RoutedEdge) => [route.edgeId, route] as [string, RoutedEdge]));
    let nextRoutePoints = baseRoutePoints;
    for (const edge of movedCandidateEdges) {
      if (baseRoutePoints[edge.id]) {
        continue;
      }
      const route = routeByEdgeId.get(edge.id);
      if (!route) {
        continue;
      }
      const endpointBlockers = [endpointNodeById.get(edge.sourceId), endpointNodeById.get(edge.targetId)].filter(Boolean);
      if (routeIntersectsEndpointNodeBodies(route.points, edge, endpointBlockers)) {
        if (nextRoutePoints === baseRoutePoints) {
          nextRoutePoints = { ...baseRoutePoints };
        }
        nextRoutePoints[edge.id] = route.points;
        continue;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, stationaryCandidates);
      if (blockers.length === 0 || !routeIntersectsSpecificNodes(route.points, edge, blockers)) {
        continue;
      }
      if (nextRoutePoints === baseRoutePoints) {
        nextRoutePoints = { ...baseRoutePoints };
      }
      nextRoutePoints[edge.id] = route.points;
    }
    return nextRoutePoints;
  };
}

export function createRoutePointsNearOriginalMovedNodes(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    originalPositions: Record<string, Point> | undefined,
    baseRoutePoints: DraggingState["originalRoutePoints"]
  ): DraggingState["originalRoutePoints"] => {
  const { MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, ORIGINAL_POSITION_REROUTE_PADDING, boxesOverlap, expandRouteBox, getRouteBlockingCandidates, orderedNodesForIds, routeRenderBounds, routeSpatialIndexRenderBounds, routeTouchesExpandedBoxes, routedEdgeById, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (
      movedIds.size === 0 ||
      movedIds.size > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES ||
      !originalPositions ||
      candidateEdges.length === 0
    ) {
      return baseRoutePoints;
    }
    const originalMovedNodes = orderedNodesForIds(previousNodes, movedIds)
      .filter((node: ModelNode) => originalPositions[node.id])
      .map((node: ModelNode) => ({ ...node, position: originalPositions[node.id] }));
    if (originalMovedNodes.length === 0) {
      return baseRoutePoints;
    }
    const originalBoxes = getRouteBlockingCandidates(originalMovedNodes).map((candidate: { box: SelectionRect }) =>
      expandRouteBox(candidate.box, ORIGINAL_POSITION_REROUTE_PADDING)
    );
    const originalBounds = originalBoxes.reduce(
      (bounds: SelectionRect, box: SelectionRect) => {
        if (!bounds) {
          return { ...box };
        }
        return {
          left: Math.min(bounds.left, box.left),
          right: Math.max(bounds.right, box.right),
          top: Math.min(bounds.top, box.top),
          bottom: Math.max(bounds.bottom, box.bottom)
        };
      },
      null
    );
    if (!originalBounds) {
      return baseRoutePoints;
    }
    let nextRoutePoints = baseRoutePoints;
    for (const edge of candidateEdges) {
      if (baseRoutePoints[edge.id] || movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        continue;
      }
      const route = routedEdgeById.get(edge.id);
      const routeBounds = route ? routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8) : null;
      if (!route || !routeBounds || !boxesOverlap(routeBounds, originalBounds)) {
        continue;
      }
      if (!routeTouchesExpandedBoxes(route.points, originalBoxes)) {
        continue;
      }
      if (nextRoutePoints === baseRoutePoints) {
        nextRoutePoints = { ...baseRoutePoints };
      }
      nextRoutePoints[edge.id] = route.points;
    }
    return nextRoutePoints;
  };
}

export function createAdjustEdgesAfterNodeMove(__appScope: SelectionDragScope) {
  return (
    currentEdges: Edge[],
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    deltasByNode: Record<string, Point>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {},
    preserveRouteEdgeIds = new Set<string>(),
    bounds?: CanvasBounds
  ) => {
  const { allowAutoExpandCanvas, canvasBounds, clampEdgeGeometryToExpandableBounds, clampNodePositionToExpandableBounds, hasCanvasOriginShift, isBusNode, leftTopCanvasOriginShiftForContent, manualPointDeltaForEdge, nodeById, nodes, preserveConnectionEdgeRouteShape, resolveStraightBusSlideEndpoint, routingNodesForConnectionEdge, sameOptionalPoint, sameOptionalPointList } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const movedBusIds = new Set<string>();
    const movedNextNodeById = new Map<string, ModelNode>();
    for (const movedNodeId of movedNodeIds) {
      const node = nodeById.get(movedNodeId);
      if (node && isBusNode(node)) {
        movedBusIds.add(movedNodeId);
      }
      const delta = deltasByNode[movedNodeId];
      if (node && delta) {
        movedNextNodeById.set(
          movedNodeId,
          { ...node, position: clampNodePositionToExpandableBounds(node, bounds, { x: node.position.x + delta.x, y: node.position.y + delta.y }) }
        );
      }
    }
    const nextNodeForEndpoint = (nodeId: string) => movedNextNodeById.get(nodeId) ?? nodeById.get(nodeId);
    const preserveAffectedRoutesForCanvasOriginShift =
      allowAutoExpandCanvas && hasCanvasOriginShift(leftTopCanvasOriginShiftForContent(Array.from(movedNextNodeById.values())));
    let changed = false;
    const nextEdges = currentEdges.map((edge) => {
      const sourceMoved = movedNodeIds.has(edge.sourceId);
      const targetMoved = movedNodeIds.has(edge.targetId);
      if (!sourceMoved && !targetMoved && !preserveRouteEdgeIds.has(edge.id)) {
        return edge;
      }
      const originalPoints = originalEdgePoints[edge.id];
      const sourceDelta = movedBusIds.has(edge.sourceId) ? deltasByNode[edge.sourceId] : undefined;
      const targetDelta = movedBusIds.has(edge.targetId) ? deltasByNode[edge.targetId] : undefined;
      const manualDelta = manualPointDeltaForEdge(edge, deltasByNode);
      const baseEdge = {
        ...edge,
        sourcePoint: sourceDelta && originalPoints?.sourcePoint
          ? { x: originalPoints.sourcePoint.x + sourceDelta.x, y: originalPoints.sourcePoint.y + sourceDelta.y }
          : edge.sourcePoint,
        targetPoint: targetDelta && originalPoints?.targetPoint
          ? { x: originalPoints.targetPoint.x + targetDelta.x, y: originalPoints.targetPoint.y + targetDelta.y }
          : edge.targetPoint,
        manualPoints: manualDelta && originalPoints?.manualPoints
          ? originalPoints.manualPoints.map((point) => ({ x: point.x + manualDelta.x, y: point.y + manualDelta.y }))
          : edge.manualPoints
      };
      const originalSource = nodeById.get(edge.sourceId);
      const originalTarget = nodeById.get(edge.targetId);
      const nextSource = nextNodeForEndpoint(edge.sourceId);
      const nextTarget = nextNodeForEndpoint(edge.targetId);
      const previousSlideNodes = routingNodesForConnectionEdge(edge, nodes);
      const nextSlideNodes = routingNodesForConnectionEdge(baseEdge, nextNodes);
      const slidePatch =
        sourceMoved !== targetMoved && originalSource && originalTarget && nextSource && nextTarget
          ? resolveStraightBusSlideEndpoint({
              edge: baseEdge,
              sourceNode: originalSource,
              targetNode: originalTarget,
              nextSourceNode: nextSource,
              nextTargetNode: nextTarget,
              movingEndpoint: sourceMoved ? "source" : "target",
              nodes: previousSlideNodes,
              nextNodes: nextSlideNodes
            })
          : null;
      const nextEdgeWithSlide = slidePatch ? { ...baseEdge, ...slidePatch } : baseEdge;
      const originalRoute = originalRoutePoints[edge.id];
      const shouldPreserveRoute = originalRoute?.length && (
        preserveRouteEdgeIds.has(edge.id) ||
        Boolean(edge.manualPoints?.length) ||
        (preserveAffectedRoutesForCanvasOriginShift && (sourceMoved || targetMoved))
      );
      const nextEdge = shouldPreserveRoute && nextSource && nextTarget
        ? (() => {
            const routeDelta = preserveRouteEdgeIds.has(edge.id) ? manualPointDeltaForEdge(edge, deltasByNode) ?? undefined : undefined;
            return preserveConnectionEdgeRouteShape(nextSlideNodes, nextEdgeWithSlide, originalRoute, bounds, { routeDelta });
          })()
        : nextEdgeWithSlide;
      const boundedNextEdge = clampEdgeGeometryToExpandableBounds(nextEdge, bounds);
      if (
        sameOptionalPoint(boundedNextEdge.sourcePoint, edge.sourcePoint) &&
        sameOptionalPoint(boundedNextEdge.targetPoint, edge.targetPoint) &&
        sameOptionalPointList(boundedNextEdge.manualPoints, edge.manualPoints)
      ) {
        return edge;
      }
      changed = true;
      return boundedNextEdge;
    });
    return changed ? nextEdges : currentEdges;
  };
}

export function createRebuildSingleAffectedConnectionRoute(__appScope: SelectionDragScope) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds = new Set<string>(),
    searchEdges: Edge[] = candidateEdges
  ) => {
  const { canvasBounds, editModeRouteRebuildOptions, rebuildExternalConnectionRoutesForMovedNodes, rebuildSingleConnectionRoute, routingNodesForConnectionEdge } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size !== 1) {
      return candidateEdges;
    }
    const affectedEdgeIds = searchEdges
      .filter((edge) => movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id))
      .map((edge) => edge.id);
    if (affectedEdgeIds.length !== 1) {
      return candidateEdges;
    }
    const affectedEdge = searchEdges.find((edge) => edge.id === affectedEdgeIds[0]);
    const routingNodes = affectedEdge ? routingNodesForConnectionEdge(affectedEdge, nextNodes) : nextNodes;
    if (affectedEdge && (movedIds.has(affectedEdge.sourceId) || movedIds.has(affectedEdge.targetId))) {
      return rebuildExternalConnectionRoutesForMovedNodes(
        routingNodes,
        candidateEdges,
        movedNodeIds,
        canvasBounds,
        [affectedEdge],
        editModeRouteRebuildOptions
      );
    }
    return rebuildSingleConnectionRoute(routingNodes, candidateEdges, affectedEdgeIds[0], canvasBounds, editModeRouteRebuildOptions);
  };
}

export function createSynchronousEdgeAdjustmentCandidates(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIdsInput: Iterable<string> = [],
    movedBusNodeIdsInput: Iterable<string> = [],
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
  const { reuseSetOrCreate, shouldAdjustEdgeSynchronouslyAfterMove } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const selectedEdgeIds = reuseSetOrCreate(selectedEdgeIdsInput);
    const movedBusNodeIds = reuseSetOrCreate(movedBusNodeIdsInput);
    return candidateEdges.filter((edge) =>
      shouldAdjustEdgeSynchronouslyAfterMove(edge, movedIds, selectedEdgeIds, movedBusNodeIds, originalRoutePoints)
    );
  };
}

export function createShouldAdjustEdgeSynchronouslyAfterMove(__appScope: SelectionDragScope) {
  return (
    edge: Edge,
    movedNodeIds: Set<string>,
    selectedEdgeIds: Set<string>,
    movedBusNodeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    return (
      selectedEdgeIds.has(edge.id) ||
      (sourceMoved && targetMoved) ||
      Boolean(edge.manualPoints?.length) ||
      movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId) ||
      Boolean(originalRoutePoints[edge.id]?.length)
    );
  };
}

export function createMergeAdjustedCandidateEdges(__appScope: SelectionDragScope) {
  return (candidateEdges: Edge[], adjustedCandidateEdges: Edge[]) => {
    if (adjustedCandidateEdges.length === 0) {
      return candidateEdges;
    }
    const adjustedEdgeById = new Map(adjustedCandidateEdges.map((edge) => [edge.id, edge]));
    let changed = false;
    const mergedEdges = candidateEdges.map((edge) => {
      const adjusted = adjustedEdgeById.get(edge.id);
      if (!adjusted) {
        return edge;
      }
      if (adjusted !== edge) {
        changed = true;
      }
      return adjusted;
    });
    return changed ? mergedEdges : candidateEdges;
  };
}

export function createTerminalReconcileNodeScope(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>
  ) => {
  const { MOVE_ROUTE_LOCAL_SEARCH_PADDING, boundsForNodeSet, orderedNodesForIds, queryNodeSpatialIndex, visibleNodeSpatialIndex } = __appScope;
    const scopedNodeIds = new Set<string>(movedNodeIds);
    const addNodesNear = (bounds: ReturnType<typeof boundsForNodeSet>) => {
      if (!bounds) {
        return;
      }
      for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, bounds)) {
        scopedNodeIds.add(node.id);
      }
    };
    addNodesNear(boundsForNodeSet(previousNodes, movedNodeIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addNodesNear(boundsForNodeSet(nextNodes, movedNodeIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return {
      previous: orderedNodesForIds(previousNodes, scopedNodeIds),
      next: orderedNodesForIds(nextNodes, scopedNodeIds)
    };
  };
}

export function createFinalizeMovedNodeEdgesFast(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    localCandidateEdges: Edge[] = candidateEdges
  ) => {
  const { canvasBounds, prepareConnectionEdgeForCommit, reconcileOverlappingTerminalConnections, routedEdges, routingNodesForConnectionEdge, terminalReconcileNodeScope } = __appScope;
    const movedNodeIdSet = new Set(movedNodeIds);
    const reconcileNodes = terminalReconcileNodeScope(previousNodes, nextNodes, movedNodeIdSet);
    const overlapEdgeIdRandom = canvasIdRandom(__appScope);
    const reconciled = reconcileOverlappingTerminalConnections(
      reconcileNodes.previous,
      reconcileNodes.next,
      candidateEdges,
      (_first: unknown, _second: unknown, index: number) => createOverlapEdgeId(overlapEdgeIdRandom, index),
      movedNodeIdSet,
      localCandidateEdges
    );
    let nextEdges = reconciled.edges;
    for (const edgeId of reconciled.addedEdgeIds) {
      const edge = nextEdges.find((item: Edge) => item.id === edgeId);
      if (!edge) {
        continue;
      }
      const prepared = prepareConnectionEdgeForCommit(routingNodesForConnectionEdge(edge, nextNodes), [edge], edgeId, canvasBounds, routedEdges);
      if (prepared.ok && prepared.edge) {
        nextEdges = nextEdges.map((edge: Edge) => edge.id === edgeId ? prepared.edge! : edge);
      }
    }
    return nextEdges;
  };
}

export function createOptimizeMovedNodeEdgeRoutes(__appScope: SelectionDragScope) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    precomputedBlockedRoutePoints: DraggingState["originalRoutePoints"] = {},
    forcedRerouteEdgeIds = new Set<string>(),
    routeSearchEdges: Edge[] = candidateEdges
  ) => {
  const { canvasBounds, editModeRouteRebuildOptions, rebuildSingleAffectedConnectionRoute, rerouteEdgesAroundMovedNodes, routePointSnapshotToRoutes, routePointsForMovedNodeBlockers, routingNodesForConnectionEdges } = __appScope;
    const hasPrecomputedBlockers = Object.keys(precomputedBlockedRoutePoints).length > 0;
    const routePointsForReroute = hasPrecomputedBlockers
      ? precomputedBlockedRoutePoints
      : routePointsForMovedNodeBlockers(
          nextNodes,
          routeSearchEdges,
          movedNodeIds,
          originalRoutePoints
        );
    const rebuiltAdjustedEdges = hasPrecomputedBlockers && forcedRerouteEdgeIds.size === 0
      ? candidateEdges
      : rebuildSingleAffectedConnectionRoute(
          nextNodes,
          candidateEdges,
          movedNodeIds,
          selectedEdgeIds,
          routeSearchEdges
        );
    if (Object.keys(routePointsForReroute).length === 0 && forcedRerouteEdgeIds.size === 0) {
      return {
        routePoints: routePointsForReroute,
        edges: rebuiltAdjustedEdges
      };
    }
    return {
      routePoints: routePointsForReroute,
      edges: rerouteEdgesAroundMovedNodes(
        routingNodesForConnectionEdges(routeSearchEdges, nextNodes, movedNodeIds),
        rebuiltAdjustedEdges,
        movedNodeIds,
        routePointSnapshotToRoutes(routePointsForReroute),
        canvasBounds,
        forcedRerouteEdgeIds,
        routeSearchEdges,
        editModeRouteRebuildOptions
      )
    };
  };
}

export function createShouldRunDeferredMoveOptimization(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    blockedEdgeIds = new Set<string>()
  ) => {
    if (blockedEdgeIds.size > 0) {
      return true;
    }
    const movedIds = new Set(movedNodeIds);
    if (candidateEdges.some((edge) =>
      !movedIds.has(edge.sourceId) && !movedIds.has(edge.targetId) && !selectedEdgeIds.has(edge.id)
    )) {
      return true;
    }
    let affectedConnectionCount = 0;
    for (const edge of candidateEdges) {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)) {
        affectedConnectionCount += 1;
        if (affectedConnectionCount > 1) {
          return false;
        }
      }
    }
    return affectedConnectionCount === 1;
  };
}

export function createScheduleMovedEdgeOptimization(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    fastEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    originalPositions?: Record<string, Point>,
    moveCandidateEdges: Edge[] = [],
    expectedPatch?: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] }
  ) => {
  const { MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, canvasBounds, deferredMoveOptimizationCancelRef, editModeRouteRebuildOptions, graphStorePatchEdges, graphStorePatchStillCurrent, latestEdgesRef, latestGraphStoreRef, latestNodesRef, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, optimizeMovedNodeEdgeRoutes, rebuildSingleAffectedConnectionRoute, routePointSnapshotToRoutes, routePointsForMovedNodeBlockers, routePointsNearOriginalMovedNodes, routingNodesForConnectionEdges, scheduleIdleWork, setGraphStore, shouldRunDeferredMoveOptimization } = __appScope;
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const routeCandidateEdges = moveCandidateEdges.length > 0
      ? moveCandidateEdges
      : localRouteOptimizationCandidateEdges(
          previousNodes,
          nextNodes,
          movedNodeIds,
          selectedEdgeIds,
          originalPositions,
          moveCandidateEdges
        );
    const optimizationEdges = localRouteOptimizationEdges(
      previousNodes,
      nextNodes,
      routeCandidateEdges,
      movedNodeIds,
      selectedEdgeIds,
      originalPositions
    );
    if (
      optimizationEdges.length === 0 ||
      !shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds)
    ) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const optimizationEdgeIds = optimizationEdges.map((edge: Edge) => edge.id);
    deferredMoveOptimizationCancelRef.current = scheduleIdleWork(() => {
      deferredMoveOptimizationCancelRef.current = null;
      const latestStore = latestGraphStoreRef.current;
      if (!latestStore) {
        return;
      }
      if (expectedPatch) {
        if (!graphStorePatchStillCurrent(latestStore, expectedPatch.nodeUpdates, expectedPatch.edgeUpserts, expectedPatch.edgeDeleteIds)) {
          return;
        }
      } else if (latestNodesRef.current !== nextNodes || latestEdgesRef.current !== fastEdges) {
        return;
      }
      const expectedNodes = latestStore.nodes;
      const latestOptimizationEdges = optimizationEdgeIds.flatMap((edgeId: string) => {
        const edge = latestStore.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      });
      if (latestOptimizationEdges.length === 0) {
        return;
      }
      const blockedRoutePoints = routePointsForMovedNodeBlockers(expectedNodes, latestOptimizationEdges, movedNodeIds, {});
      const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));
      const routePointsForOptimization = routePointsNearOriginalMovedNodes(
        previousNodes,
        latestOptimizationEdges,
        movedNodeIds,
        originalPositions,
        blockedRoutePoints
      );
      const releasedEdgeIds = Object.keys(routePointsForOptimization).filter((edgeId) => !blockedRoutePoints[edgeId]);
      const forcedRerouteEdgeIds = new Set(releasedEdgeIds);
      for (const edgeId of releasedEdgeIds) {
        blockedEdgeIds.add(edgeId);
      }
      if (!shouldRunDeferredMoveOptimization(latestOptimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)) {
        return;
      }
      const commitOptimizedEdges = (
        optimizedEdges: Edge[],
        routePointsMap: DraggingState["originalRoutePoints"]
      ) => {
        if (optimizedEdges === latestOptimizationEdges) {
          return;
        }
        const dirtyOptimizedEdgeIds = new Set<string>([...blockedEdgeIds, ...forcedRerouteEdgeIds]);
        for (const edgeId of Object.keys(routePointsMap)) {
          dirtyOptimizedEdgeIds.add(edgeId);
        }
        const previousOptimizedEdgeById = new Map<string, Edge>(
          latestOptimizationEdges.map((edge: Edge) => [edge.id, edge] as [string, Edge])
        );
        const optimizedEdgeById = new Map<string, Edge>(
          optimizedEdges.map((edge: Edge) => [edge.id, edge] as [string, Edge])
        );
        const optimizedEdgeUpdates: Edge[] = [];
        for (const edgeId of dirtyOptimizedEdgeIds) {
          const optimizedEdge = optimizedEdgeById.get(edgeId);
          if (optimizedEdge && previousOptimizedEdgeById.get(edgeId) !== optimizedEdge) {
            optimizedEdgeUpdates.push(optimizedEdge);
          }
        }
        if (optimizedEdgeUpdates.length === 0) {
          return;
        }
        markRouteEdgesDirty(dirtyOptimizedEdgeIds);
        markStoredRouteEdgesDirty(dirtyOptimizedEdgeIds);
        setGraphStore((current: GraphStore) => graphStorePatchEdges(current, optimizedEdgeUpdates));
      };

      const hasPrecomputedBlockers = Object.keys(routePointsForOptimization).length > 0;
      const shouldUseWorker =
        shouldOffloadBatchRerouteToWorker(latestOptimizationEdges.length) &&
        (hasPrecomputedBlockers || forcedRerouteEdgeIds.size > 0);

      if (shouldUseWorker) {
        const rebuiltAdjustedEdges =
          hasPrecomputedBlockers && forcedRerouteEdgeIds.size === 0
            ? latestOptimizationEdges
            : rebuildSingleAffectedConnectionRoute(
                expectedNodes,
                latestOptimizationEdges,
                movedNodeIds,
                selectedEdgeIds,
                latestOptimizationEdges
              );
        const workerController = new AbortController();
        deferredMoveOptimizationCancelRef.current = () => {
          workerController.abort();
        };
        void runBatchRerouteInWorker(
          {
            nodes: routingNodesForConnectionEdges(latestOptimizationEdges, expectedNodes, movedNodeIds),
            edges: rebuiltAdjustedEdges,
            movedNodeIds,
            previousRoutes: routePointSnapshotToRoutes(routePointsForOptimization),
            bounds: canvasBounds,
            forceEdgeIds: Array.from(forcedRerouteEdgeIds),
            searchEdges: latestOptimizationEdges,
            options: editModeRouteRebuildOptions
          },
          { signal: workerController.signal }
        )
          .then((workerEdges) => {
            if (workerController.signal.aborted) {
              return;
            }
            deferredMoveOptimizationCancelRef.current = null;
            const currentStore = latestGraphStoreRef.current;
            if (!currentStore) {
              return;
            }
            if (expectedPatch) {
              if (!graphStorePatchStillCurrent(currentStore, expectedPatch.nodeUpdates, expectedPatch.edgeUpserts, expectedPatch.edgeDeleteIds)) {
                return;
              }
            } else if (latestNodesRef.current !== nextNodes || latestEdgesRef.current !== fastEdges) {
              return;
            }
            commitOptimizedEdges(workerEdges, routePointsForOptimization);
          })
          .catch((error: any) => {
            if (error?.name === "AbortError" || workerController.signal.aborted) {
              return;
            }
            deferredMoveOptimizationCancelRef.current = null;
          });
        return;
      }

      const optimized = optimizeMovedNodeEdgeRoutes(
        expectedNodes,
        latestOptimizationEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds,
        routePointsForOptimization,
        forcedRerouteEdgeIds,
        latestOptimizationEdges
      );
      commitOptimizedEdges(optimized.edges, optimized.routePoints);
    }, 180, 1500);
  };
}

export function createScheduleDeferredMovedConnectionRepair(__appScope: SelectionDragScope) {
  return (
    movedNodeIds: string[],
    candidateEdges: Edge[],
    expectedPatch: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] },
    effectiveCanvasBounds?: CanvasBounds,
    previousNodesForMove: ModelNode[] = [],
    originalPositions?: Record<string, Point>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {},
    selectedEdgeIds = new Set<string>(),
    options: SingleNodeDeferredRepairOptions = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES, busTerminalSyncNodeIdsForGraphPatch, canvasBounds, canvasBoundsForAutoExpandedGraphContent, deferredMoveOptimizationCancelRef, edgePatchFromCandidateEdges, editModeRouteRebuildOptions, finalizeMovedNodeEdgesFast, graphStoreApplyPatch, graphStorePatchStillCurrent, latestGraphStoreRef, markBusTerminalSyncDirty, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, optimizeMovedNodeEdgeRoutes, rebuildSingleAffectedConnectionRoute, routePointSnapshotToRoutes, routePointsForMovedEdgesBlockedByStationaryNodes, routePointsForMovedNodeBlockers, routePointsNearOriginalMovedNodes, routingNodesForConnectionEdges, scheduleIdleWork, setGraphStore } = __appScope;
    if (effectiveCanvasBounds === undefined) {
      effectiveCanvasBounds = canvasBounds;
    }
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length === 0 || candidateEdges.length === 0) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    if (
      movedNodeIds.length > MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES ||
      candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES
    ) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const candidateEdgeIds = candidateEdges.map((edge) => edge.id);
    deferredMoveOptimizationCancelRef.current = scheduleIdleWork(() => {
      deferredMoveOptimizationCancelRef.current = null;
      const latestStore = latestGraphStoreRef.current;
      if (!latestStore || !graphStorePatchStillCurrent(latestStore, expectedPatch.nodeUpdates, expectedPatch.edgeUpserts, expectedPatch.edgeDeleteIds)) {
        return;
      }
      const latestNodes = latestStore.nodes;
      const latestCandidateEdges = candidateEdgeIds.flatMap((edgeId: string) => {
        const edge = latestStore.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      });
      if (latestCandidateEdges.length === 0) {
        return;
      }
      let workingCandidateEdges = latestCandidateEdges;
      const dirtyDeferredEdgeIds = new Set<string>();
      if (options.reconcileTerminalConnections) {
        const finalizedEdges = finalizeMovedNodeEdgesFast(
          previousNodesForMove.length > 0 ? previousNodesForMove : latestNodes,
          latestNodes,
          workingCandidateEdges,
          movedNodeIds,
          workingCandidateEdges
        );
        if (finalizedEdges !== workingCandidateEdges) {
          const terminalPatch = edgePatchFromCandidateEdges(workingCandidateEdges, finalizedEdges);
          for (const edge of terminalPatch.edgeUpserts) {
            dirtyDeferredEdgeIds.add(edge.id);
          }
          for (const edgeId of terminalPatch.edgeDeleteIds) {
            dirtyDeferredEdgeIds.add(edgeId);
          }
          workingCandidateEdges = finalizedEdges;
        }
      }
      const repairCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
        effectiveCanvasBounds,
        [],
        workingCandidateEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      const movedBlockerRoutePoints = routePointsForMovedNodeBlockers(latestNodes, workingCandidateEdges, movedNodeIds, {});
      const stationaryBlockerRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        latestNodes,
        workingCandidateEdges,
        movedNodeIds,
        movedBlockerRoutePoints,
        repairCanvasBounds
      );
      const blockerRoutePoints = { ...movedBlockerRoutePoints, ...stationaryBlockerRoutePoints };
      const repairRoutePoints = previousNodesForMove.length > 0
        ? routePointsNearOriginalMovedNodes(
            previousNodesForMove,
            workingCandidateEdges,
            movedNodeIds,
            originalPositions,
            blockerRoutePoints
          )
        : blockerRoutePoints;
      const repairEdgeIds = new Set(Object.keys(repairRoutePoints));
      const commitDeferredRepair = (optimizedEdges: Edge[]) => {
        const deferredEdgePatch = edgePatchFromCandidateEdges(latestCandidateEdges, optimizedEdges);
        if (deferredEdgePatch.edgeUpserts.length === 0 && deferredEdgePatch.edgeDeleteIds.length === 0) {
          return;
        }
        for (const edge of deferredEdgePatch.edgeUpserts) {
          dirtyDeferredEdgeIds.add(edge.id);
        }
        for (const edgeId of deferredEdgePatch.edgeDeleteIds) {
          dirtyDeferredEdgeIds.add(edgeId);
        }
        markRouteEdgesDirty(dirtyDeferredEdgeIds);
        markStoredRouteEdgesDirty(dirtyDeferredEdgeIds);
        markBusTerminalSyncDirty(
          busTerminalSyncNodeIdsForGraphPatch(
            movedNodeIds,
            latestCandidateEdges,
            deferredEdgePatch.edgeUpserts,
            deferredEdgePatch.edgeDeleteIds
          )
        );
        markGraphDirtyForInteractiveCommit();
        setGraphStore((current: GraphStore) =>
          graphStoreApplyPatch(current, {
            edgeUpserts: deferredEdgePatch.edgeUpserts,
            edgeDeleteIds: deferredEdgePatch.edgeDeleteIds
          })
        );
      };

      if (repairEdgeIds.size > 0) {
        const repairCandidateEdges = workingCandidateEdges.filter((edge) => repairEdgeIds.has(edge.id));
        for (const edgeId of repairEdgeIds) {
          dirtyDeferredEdgeIds.add(edgeId);
        }
        if (shouldOffloadBatchRerouteToWorker(repairCandidateEdges.length)) {
          const rebuiltAdjustedEdges = rebuildSingleAffectedConnectionRoute(
            latestNodes,
            workingCandidateEdges,
            movedNodeIds,
            selectedEdgeIds,
            repairCandidateEdges
          );
          const workerController = new AbortController();
          deferredMoveOptimizationCancelRef.current = () => {
            workerController.abort();
          };
          void runBatchRerouteInWorker(
            {
              nodes: routingNodesForConnectionEdges(repairCandidateEdges, latestNodes, movedNodeIds),
              edges: rebuiltAdjustedEdges,
              movedNodeIds,
              previousRoutes: routePointSnapshotToRoutes(repairRoutePoints),
              bounds: repairCanvasBounds,
              forceEdgeIds: Array.from(repairEdgeIds),
              searchEdges: repairCandidateEdges,
              options: editModeRouteRebuildOptions
            },
            { signal: workerController.signal }
          )
            .then((workerEdges) => {
              if (workerController.signal.aborted) {
                return;
              }
              deferredMoveOptimizationCancelRef.current = null;
              const currentStore = latestGraphStoreRef.current;
              if (
                !currentStore ||
                !graphStorePatchStillCurrent(
                  currentStore,
                  expectedPatch.nodeUpdates,
                  expectedPatch.edgeUpserts,
                  expectedPatch.edgeDeleteIds
                )
              ) {
                return;
              }
              commitDeferredRepair(workerEdges);
            })
            .catch((error: any) => {
              if (error?.name === "AbortError" || workerController.signal.aborted) {
                return;
              }
              deferredMoveOptimizationCancelRef.current = null;
            });
          return;
        }
        const optimized = optimizeMovedNodeEdgeRoutes(
          latestNodes,
          workingCandidateEdges,
          movedNodeIds,
          originalRoutePoints,
          selectedEdgeIds,
          repairRoutePoints,
          repairEdgeIds,
          repairCandidateEdges
        );
        commitDeferredRepair(optimized.edges);
        return;
      }
      commitDeferredRepair(workingCandidateEdges);
    }, 60, 1500);
  };
}

export function createMoveRouteRepairSeedEdges(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
  const { MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, busNodeIdSet, reuseSetOrCreate } = __appScope;
    if (candidateEdges.length <= MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES) {
      return candidateEdges;
    }
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const movedBusNodeIds = new Set(movedNodeIds.filter((nodeId) => busNodeIdSet.has(nodeId)));
    return candidateEdges.filter((edge) => {
      const sourceMoved = movedIds.has(edge.sourceId);
      const targetMoved = movedIds.has(edge.targetId);
      return (
        selectedEdgeIds.has(edge.id) ||
        Boolean(originalRoutePoints[edge.id]?.length) ||
        Boolean(edge.manualPoints?.length) ||
        (sourceMoved && targetMoved) ||
        movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)
      );
    });
  };
}

export function createLightweightMovedEndpointRoute(__appScope: SelectionDragScope) {
  return (
    edge: Edge,
    previousRoute: RoutedEdge,
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>,
    bounds: CanvasBounds
  ): RoutedEdge | null => {
  const { clampPointToBounds, getModelEdgeEndpointPoint, getRouteBlockingCandidateNodesFromBoxes, getRouteBlockingCandidates, getRouteEndpointNormal, isBusNode, nodeForRoutingList, pointsToOrthogonalPath, preserveDraggedRouteShape, routeEdgesForStoredRendering, routeIntersectsEndpointNodeBodies, routeIntersectsSpecificNodes, sameOptionalPointList } = __appScope;
    if (previousRoute.points.length < 2) {
      return null;
    }
    const source = nodeForRoutingList(nextNodes, edge.sourceId);
    const target = nodeForRoutingList(nextNodes, edge.targetId);
    if (!source || !target) {
      return null;
    }
    const originalStart = previousRoute.points[0];
    const originalEnd = previousRoute.points[previousRoute.points.length - 1];
    if (!originalStart || !originalEnd) {
      return null;
    }
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    if (!sourceMoved && !targetMoved) {
      return null;
    }
    const sourceEndpointPoint = !sourceMoved && isBusNode(source) && !edge.sourcePoint ? originalStart : edge.sourcePoint;
    const targetEndpointPoint = !targetMoved && isBusNode(target) && !edge.targetPoint ? originalEnd : edge.targetPoint;
    const nextStart = getModelEdgeEndpointPoint(source, sourceEndpointPoint, edge.sourceTerminalId);
    const nextEnd = getModelEdgeEndpointPoint(target, targetEndpointPoint, edge.targetTerminalId);
    const sourceNormal = getRouteEndpointNormal(source, nextStart, nextEnd, edge.sourceTerminalId);
    const targetNormal = getRouteEndpointNormal(target, nextEnd, nextStart, edge.targetTerminalId);
    const preservedPoints = preserveDraggedRouteShape({
      routePoints: previousRoute.points,
      nextStart,
      nextEnd,
      sourceDelta: sourceMoved ? { x: nextStart.x - originalStart.x, y: nextStart.y - originalStart.y } : { x: 0, y: 0 },
      targetDelta: targetMoved ? { x: nextEnd.x - originalEnd.x, y: nextEnd.y - originalEnd.y } : { x: 0, y: 0 },
      sourceNormal,
      targetNormal
    }).map((point: Point) => clampPointToBounds(point, bounds));
    const routeEdge = {
      ...edge,
      sourcePoint: isBusNode(source) ? sourceEndpointPoint ?? nextStart : edge.sourcePoint,
      targetPoint: isBusNode(target) ? targetEndpointPoint ?? nextEnd : edge.targetPoint,
      routePoints: preservedPoints,
      manualPoints: preservedPoints.length > 2 ? preservedPoints.slice(1, -1) : undefined
    };
    const repairedRoute = routeEdgesForStoredRendering([source, target], [routeEdge], bounds)[0];
    const points = (repairedRoute?.points ?? preservedPoints).map((point: Point) => clampPointToBounds(point, bounds));
    const endpointBlockers = [source, target];
    if (routeIntersectsEndpointNodeBodies(points, routeEdge, endpointBlockers)) {
      return null;
    }
    const blockers = getRouteBlockingCandidateNodesFromBoxes(points, routeEdge, getRouteBlockingCandidates(nextNodes));
    if (blockers.length > 0 && routeIntersectsSpecificNodes(points, routeEdge, blockers)) {
      return null;
    }
    const path = pointsToOrthogonalPath(points);
    return sameOptionalPointList(points, previousRoute.points) && path === previousRoute.path
      ? previousRoute
      : { ...previousRoute, points, path };
  };
}

export function createPatchCachedRoutesForHighFanoutMove(__appScope: SelectionDragScope) {
  return (
    previousCandidateEdges: Edge[],
    committedCandidateEdges: Edge[],
    movedNodeIds: string[],
    nextNodes: ModelNode[],
    bounds: CanvasBounds
  ) => {
  const { cachedRouteStoreRef, cachedRoutedEdgesRef, lightweightMovedEndpointRoute, routeStorePatchRoutes, shouldPatchRouteCacheForHighFanoutMove } = __appScope;
    if (!shouldPatchRouteCacheForHighFanoutMove(movedNodeIds, previousCandidateEdges)) {
      return new Set<string>();
    }
    const routeStore = cachedRouteStoreRef.current;
    if (!routeStore || routeStore.routes.length === 0) {
      return new Set<string>();
    }
    const movedIds = new Set(movedNodeIds);
    const committedEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
    const routeUpdates: RoutedEdge[] = [];
    const patchedEdgeIds = new Set<string>();
    for (const previousEdge of previousCandidateEdges) {
      if (!movedIds.has(previousEdge.sourceId) && !movedIds.has(previousEdge.targetId)) {
        continue;
      }
      const edge = committedEdgeById.get(previousEdge.id) ?? previousEdge;
      const previousRoute = routeStore.routeMap.get(edge.id);
      if (!previousRoute) {
        continue;
      }
      const nextRoute = lightweightMovedEndpointRoute(edge, previousRoute, nextNodes, movedIds, bounds);
      if (!nextRoute || nextRoute === previousRoute) {
        continue;
      }
      routeUpdates.push(nextRoute);
      patchedEdgeIds.add(edge.id);
    }
    if (routeUpdates.length === 0) {
      return patchedEdgeIds;
    }
    const patchedRouteStore = routeStorePatchRoutes(routeStore, routeUpdates);
    cachedRouteStoreRef.current = patchedRouteStore;
    cachedRoutedEdgesRef.current = patchedRouteStore.routes;
    return patchedEdgeIds;
  };
}

export function createPatchCachedRoutesForBulkTranslation(__appScope: SelectionDragScope) {
  return (
    edgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD, cachedRouteStoreRef, cachedRoutedEdgesRef, createRouteStore, hasCanvasOriginShift, reuseSetOrCreate, routeStorePatchRoutesById, store, translateRouteBy } = __appScope;
    const routeStore = cachedRouteStoreRef.current;
    const ids = reuseSetOrCreate(edgeIds);
    if (!hasCanvasOriginShift(delta) || ids.size === 0 || !routeStore || routeStore.routes.length === 0) {
      return { patchedEdgeIds: new Set<string>(), durationMs: 0 };
    }
    const start = performance.now();
    const shouldRebuildRouteStore =
      ids.size >= ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD &&
      ids.size / routeStore.routes.length >= 0.5;
    if (shouldRebuildRouteStore) {
      const patchedEdgeIds = new Set<string>();
      const routeUpdates: RoutedEdge[] = [];
      const nextRoutes = routeStore.routes.map((route: RoutedEdge) => {
        if (!ids.has(route.edgeId)) {
          return route;
        }
        const nextRoute = translateRouteBy(route, delta);
        patchedEdgeIds.add(route.edgeId);
        routeUpdates.push(nextRoute);
        return nextRoute;
      });
      if (routeUpdates.length === 0) {
        return { patchedEdgeIds, durationMs: performance.now() - start };
      }
      const patchedRouteStore = createRouteStore(nextRoutes);
      cachedRouteStoreRef.current = patchedRouteStore;
      cachedRoutedEdgesRef.current = patchedRouteStore.routes;
      return { patchedEdgeIds, durationMs: performance.now() - start };
    }
    const { store: patchedRouteStore, patchedEdgeIds } = routeStorePatchRoutesById(
      routeStore,
      ids,
      (route: RoutedEdge) => translateRouteBy(route, delta)
    );
    if (patchedEdgeIds.size === 0) {
      return { patchedEdgeIds, durationMs: performance.now() - start };
    }
    cachedRouteStoreRef.current = patchedRouteStore;
    cachedRoutedEdgesRef.current = patchedRouteStore.routes;
    return { patchedEdgeIds, durationMs: performance.now() - start };
  };
}

export function createPatchCachedRoutesForWholeMove(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { patchCachedRoutesForBulkTranslation, reuseSetOrCreate } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const selectedIds = reuseSetOrCreate(selectedEdgeIds);
    const routeEdgeIds = new Set<string>();
    for (const edge of candidateEdges) {
      if (!selectedIds.has(edge.id) && (!movedIds.has(edge.sourceId) || !movedIds.has(edge.targetId))) {
        continue;
      }
      routeEdgeIds.add(edge.id);
    }
    return patchCachedRoutesForBulkTranslation(routeEdgeIds, delta).patchedEdgeIds;
  };
}

export function createPatchCachedRoutesForInternalMove(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    internalMovedEdgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { hasCanvasOriginShift, patchCachedRoutesForBulkTranslation, reuseSetOrCreate } = __appScope;
    if (!hasCanvasOriginShift(delta)) {
      return new Set<string>();
    }
    const internalIds = reuseSetOrCreate(internalMovedEdgeIds);
    if (internalIds.size === 0) {
      return new Set<string>();
    }
    const routeEdgeIds = new Set<string>();
    for (const edge of candidateEdges) {
      if (internalIds.has(edge.id)) {
        routeEdgeIds.add(edge.id);
      }
    }
    return patchCachedRoutesForBulkTranslation(routeEdgeIds, delta).patchedEdgeIds;
  };
}

export function createStoredRouteDirtyIdsForMove(__appScope: SelectionDragScope) {
  return (dirtyEdgeIds: Set<string>, routeCachePatchedEdgeIds: Set<string>) => {
    if (routeCachePatchedEdgeIds.size === 0) {
      return dirtyEdgeIds;
    }
    const storedDirty = new Set<string>();
    for (const edgeId of dirtyEdgeIds) {
      if (!routeCachePatchedEdgeIds.has(edgeId)) {
        storedDirty.add(edgeId);
      }
    }
    if (storedDirty.size === 0) {
      const firstPatchedEdgeId = routeCachePatchedEdgeIds.values().next().value;
      if (firstPatchedEdgeId) {
        storedDirty.add(firstPatchedEdgeId);
      }
    }
    return storedDirty;
  };
}

export function createBuildBulkMovePlan(__appScope: SelectionDragScope) {
  return (
    committedCandidateEdges: Edge[],
    internalMovedEdgeIds: Set<string>,
    wholeLayerMove: boolean,
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"],
    previousNodes: ModelNode[],
    committedNextNodes: ModelNode[],
    originalPositions?: Record<string, Point>
  ): BulkMovePlan => {
  const { CANVAS_BULK_MOVE_EDGE_THRESHOLD, externalMoveCandidateEdges, internalMoveCandidateEdges, localRouteOptimizationCandidateEdges, mergeUniqueEdgesById, moveRouteRepairSeedEdges } = __appScope;
    const internalCandidateEdges = internalMoveCandidateEdges(committedCandidateEdges, internalMovedEdgeIds);
    const boundaryCandidateEdges = externalMoveCandidateEdges(committedCandidateEdges, internalMovedEdgeIds);
    const pureInternalBulkMove =
      !wholeLayerMove &&
      internalMovedEdgeIds.size >= CANVAS_BULK_MOVE_EDGE_THRESHOLD &&
      boundaryCandidateEdges.length === 0;
    const kind: BulkMovePlan["kind"] =
      wholeLayerMove || pureInternalBulkMove
        ? "rigid"
        : internalMovedEdgeIds.size >= CANVAS_BULK_MOVE_EDGE_THRESHOLD
          ? "hybrid"
          : "none";
    const skipInternalRepair = wholeLayerMove || internalMovedEdgeIds.size >= CANVAS_BULK_MOVE_EDGE_THRESHOLD;
    const skipRouteRepairSearch = wholeLayerMove || pureInternalBulkMove;
    const routeRepairSeedEdges = skipRouteRepairSearch
      ? []
      : moveRouteRepairSeedEdges(
          boundaryCandidateEdges,
          movedNodeIds,
          selectedEdgeIds,
          originalRoutePoints
        );
    const rawRouteRepairCandidateEdges = skipRouteRepairSearch
      ? []
      : localRouteOptimizationCandidateEdges(
          previousNodes,
          committedNextNodes,
          movedNodeIds,
          selectedEdgeIds,
          originalPositions,
          routeRepairSeedEdges
        );
    const routeRepairCandidateEdges = skipInternalRepair
      ? externalMoveCandidateEdges(rawRouteRepairCandidateEdges, internalMovedEdgeIds)
      : rawRouteRepairCandidateEdges;
    const internalRepairCandidateEdges = skipInternalRepair ? [] : internalCandidateEdges;
    const legacyDeferredRepairCandidateEdges = mergeUniqueEdgesById(rawRouteRepairCandidateEdges, internalCandidateEdges);
    const deferredRepairCandidateEdges = mergeUniqueEdgesById(routeRepairCandidateEdges, internalRepairCandidateEdges);
    return {
      kind,
      internalEdgeIds: internalMovedEdgeIds,
      internalCandidateEdges,
      boundaryCandidateEdges,
      internalRepairCandidateEdges,
      routeRepairSeedEdges,
      routeRepairCandidateEdges,
      deferredRepairCandidateEdges,
      legacyDeferredRepairCandidateCount: legacyDeferredRepairCandidateEdges.length
    };
  };
}

export function createCommitFastMovedGraphPatches(__appScope: SelectionDragScope) {
  return (
    movedNodeUpdates: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    previousCandidateEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    originalPositions?: Record<string, Point>,
    previousNodes?: ModelNode[],
    effectiveCanvasBounds?: CanvasBounds,
    options: FastMovedGraphCommitOptions = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, allowAutoExpandCanvas, applyCanvasBounds, buildBulkMovePlan, busTerminalSyncNodeIdsForGraphPatch, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsWithOriginShift, deferredMoveOptimizationCancelRef, deferredMoveRepairFrameRef, deferredRoutableLineRouteRepairCancelRef, dirtyEdgeIdsAfterBulkMove, dirtyEdgeIdsForMovedLocalRoutes, edgePatchFromCandidateEdges, edgeReferenceDiffIds, edges, editModeRouteRebuildOptions, expandCanvasToFitGraph, externalMoveCandidateEdges, graphStore, graphStoreApplyPatch, graphStoreSetGraph, hasCanvasOriginShift, internalRoutableLineNodeUpdatesForMove, leftTopCanvasOriginShiftForContent, logBulkMoveCommitStats, markBusTerminalSyncDirty, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, mergeNodeUpdateLists, nextNodesForMovedGraphCommit, nodes, overlayGraphStoreNodes, patchCachedRoutesForHighFanoutMove, patchCachedRoutesForInternalMove, patchCachedRoutesForWholeMove, rebuildExternalConnectionRoutesForMovedNodes, rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes, reuseSetOrCreate, routePointsForMovedEdgesBlockedByStationaryNodes, routingNodesForConnectionEdges, scheduleDeferredMovedConnectionRepair, scheduleDeferredRoutableLineRouteRepair, scheduleMovedEdgeOptimization, setGraphStore, shiftCachedRoutesForCanvasOrigin, shouldDeferSingleNodeTerminalReconciliation, shouldRunSynchronousMoveBlockerRepair, storedRouteDirtyIdsForMove, translateEdgeBy, translateNodeBy, wholeMoveRoutableLineNodeUpdates } = __appScope;
    if (previousNodes === undefined) {
      previousNodes = nodes;
    }
    if (effectiveCanvasBounds === undefined) {
      effectiveCanvasBounds = canvasBounds;
    }
    const wholeLayerMove = options.wholeLayerMove === true;
    const wholeLayerMoveDelta = options.moveDelta;
    const internalMovedEdgeIds = options.internalMovedEdgeIds ? reuseSetOrCreate(options.internalMovedEdgeIds) : new Set<string>();
    if (wholeLayerMove) {
      if (deferredMoveRepairFrameRef.current !== null) {
        window.cancelAnimationFrame(deferredMoveRepairFrameRef.current);
        deferredMoveRepairFrameRef.current = null;
      }
      deferredMoveOptimizationCancelRef.current?.();
      deferredMoveOptimizationCancelRef.current = null;
      deferredRoutableLineRouteRepairCancelRef.current?.();
      deferredRoutableLineRouteRepairCancelRef.current = null;
    }
    const commitStart = performance.now();
    let bulkPlanMs = 0;
    let canvasBoundsMs = 0;
    let edgePatchMs = 0;
    let dirtyMs = 0;
    let markDirtyMs = 0;
    let busSyncMs = 0;
    let syncRepairMs = 0;
    let routeCacheMs = 0;
    let graphPatchMs = 0;
    let committedCandidateEdges = candidateEdges;
    const wholeMoveRoutableLineUpdates =
      wholeLayerMove && wholeLayerMoveDelta
        ? wholeMoveRoutableLineNodeUpdates(movedNodeIds, wholeLayerMoveDelta)
        : [];
    const internalRoutableLineUpdates =
      !wholeLayerMove && wholeLayerMoveDelta
        ? internalRoutableLineNodeUpdatesForMove(movedNodeIds, wholeLayerMoveDelta)
        : [];
    const committedNodeUpdates =
      wholeMoveRoutableLineUpdates.length > 0
        ? mergeNodeUpdateLists(movedNodeUpdates, wholeMoveRoutableLineUpdates)
        : internalRoutableLineUpdates.length > 0
          ? mergeNodeUpdateLists(movedNodeUpdates, internalRoutableLineUpdates)
          : movedNodeUpdates;
    const committedNextNodes =
      committedNodeUpdates !== movedNodeUpdates
        ? nextNodesForMovedGraphCommit(graphStore, committedNodeUpdates, committedNodeUpdates.map((node: ModelNode) => node.id))
        : nextNodes;
    const bulkPlanStart = performance.now();
    const bulkPlan = buildBulkMovePlan(
      committedCandidateEdges,
      internalMovedEdgeIds,
      wholeLayerMove,
      movedNodeIds,
      selectedEdgeIds,
      originalRoutePoints,
      previousNodes,
      committedNextNodes,
      originalPositions
    );
    bulkPlanMs += performance.now() - bulkPlanStart;
    const synchronousRepairCandidateEdges = bulkPlan.boundaryCandidateEdges;
    const routeRepairCandidateEdges = bulkPlan.routeRepairCandidateEdges;
    const deferredRepairCandidateEdges = bulkPlan.deferredRepairCandidateEdges;
    const initialStoredRouteDirtyIds = dirtyEdgeIdsForMovedLocalRoutes(selectedEdgeIds, originalRoutePoints);
    const translatedLocalRouteIds = new Set<string>();
    if (wholeLayerMove) {
      const movedIdSet = new Set(movedNodeIds);
      for (const edge of committedCandidateEdges) {
        if (selectedEdgeIds.has(edge.id) || (movedIdSet.has(edge.sourceId) && movedIdSet.has(edge.targetId))) {
          translatedLocalRouteIds.add(edge.id);
        }
      }
    } else if (wholeLayerMoveDelta && internalMovedEdgeIds.size > 0) {
      for (const edgeId of internalMovedEdgeIds) {
        translatedLocalRouteIds.add(edgeId);
      }
    }
    const nonTranslatedInitialStoredRouteDirtyIds = [...initialStoredRouteDirtyIds].filter((edgeId) => !translatedLocalRouteIds.has(edgeId));
    const initialMarkDirtyStart = performance.now();
    markStoredRouteEdgesDirty(nonTranslatedInitialStoredRouteDirtyIds);
    markDirtyMs += performance.now() - initialMarkDirtyStart;
    const deferSingleNodeTerminalReconciliation =
      !wholeLayerMove &&
      shouldDeferSingleNodeTerminalReconciliation(
        movedNodeIds,
        synchronousRepairCandidateEdges
      );
    const deferMovedRouteRepair =
      !wholeLayerMove &&
      movedNodeIds.length > 0 &&
      (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation);
    const bulkCommitKind = bulkPlan.kind;
    const timingStats = () => ({
      durationMs: performance.now() - commitStart,
      bulkPlanMs,
      canvasBoundsMs,
      edgePatchMs,
      dirtyMs,
      markDirtyMs,
      busSyncMs,
      syncRepairMs,
      routeCacheMs,
      graphPatchMs
    });
    const originShiftStart = performance.now();
    const originShift = allowAutoExpandCanvas ? leftTopCanvasOriginShiftForContent(committedNodeUpdates, committedCandidateEdges) : { x: 0, y: 0 };
    canvasBoundsMs += performance.now() - originShiftStart;
    if (hasCanvasOriginShift(originShift)) {
      const candidateEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
      const rawNextEdges = edges.map((edge: Edge) => candidateEdgeById.get(edge.id) ?? edge);
      const rawNextNodes = overlayGraphStoreNodes(graphStore, committedNodeUpdates);
      const shiftedNextNodes = rawNextNodes.map((node: ModelNode) => translateNodeBy(node, originShift));
      const shiftedNextEdges = rawNextEdges.map((edge: Edge) => translateEdgeBy(edge, originShift));
      const committedNodeIdSet = new Set(committedNodeUpdates.map((node: ModelNode) => node.id));
      const shiftedExpectedNodeUpdates = shiftedNextNodes.filter((node: ModelNode) => committedNodeIdSet.has(node.id));
      const shiftedCanvasBoundsStart = performance.now();
      const shiftedCanvasBounds = canvasBoundsForGraphContent(
        canvasBoundsWithOriginShift(effectiveCanvasBounds, originShift),
        shiftedNextNodes,
        shiftedNextEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(shiftedCanvasBounds, originShift);
      canvasBoundsMs += performance.now() - shiftedCanvasBoundsStart;
      const routeCacheStart = performance.now();
      shiftCachedRoutesForCanvasOrigin(originShift);
      routeCacheMs += performance.now() - routeCacheStart;
      const candidateEdgeIds = committedCandidateEdges.map((edge) => edge.id);
      const markDirtyStart = performance.now();
      markRouteEdgesDirty(candidateEdgeIds);
      markStoredRouteEdgesDirty(candidateEdgeIds);
      markGraphDirtyForInteractiveCommit();
      markDirtyMs += performance.now() - markDirtyStart;
      const graphPatchStart = performance.now();
      setGraphStore((current: GraphStore) => graphStoreSetGraph(current, shiftedNextNodes, shiftedNextEdges));
      graphPatchMs += performance.now() - graphPatchStart;
      logBulkMoveCommitStats({
        kind: bulkCommitKind,
        movedNodeCount: movedNodeIds.length,
        candidateEdgeCount: previousCandidateEdges.length,
        internalEdgeCount: internalMovedEdgeIds.size,
        boundaryEdgeCount: synchronousRepairCandidateEdges.length,
        deferredRepairCandidateCount: deferredRepairCandidateEdges.length,
        legacyDeferredRepairCandidateCount: bulkPlan.legacyDeferredRepairCandidateCount,
        routeCachePatchedCount: candidateEdgeIds.length,
        legacyRouteDirtyCount: candidateEdgeIds.length,
        routeDirtyCount: candidateEdgeIds.length,
        storedRouteDirtyCount: candidateEdgeIds.length,
        routableLineUpdateCount: wholeMoveRoutableLineUpdates.length + internalRoutableLineUpdates.length,
        ...timingStats()
      });
      if (!wholeLayerMove) {
        scheduleDeferredRoutableLineRouteRepair(
          previousNodes,
          movedNodeIds,
          originalPositions,
          shiftedExpectedNodeUpdates,
          shiftedCanvasBounds
        );
      }
      return;
    }
    const commitCanvasBoundsStart = performance.now();
    const commitCanvasBounds = canvasBoundsForAutoExpandedGraphContent(effectiveCanvasBounds, committedNodeUpdates, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING);
    canvasBoundsMs += performance.now() - commitCanvasBoundsStart;
    if (deferMovedRouteRepair) {
      const edgePatchStart = performance.now();
      const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
      const expectedPatch = { nodeUpdates: committedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
      const edgePatchDirtyIds = [
        ...edgePatch.edgeUpserts.map((edge: Edge) => edge.id),
        ...edgePatch.edgeDeleteIds
      ];
      edgePatchMs += performance.now() - edgePatchStart;
      const routeCacheStart = performance.now();
      const routeCachePatchedEdgeIds = patchCachedRoutesForHighFanoutMove(
        previousCandidateEdges,
        committedCandidateEdges,
        movedNodeIds,
        committedNextNodes,
        commitCanvasBounds
      );
      if (!wholeLayerMove && wholeLayerMoveDelta && internalMovedEdgeIds.size > 0) {
        for (const edgeId of patchCachedRoutesForInternalMove(committedCandidateEdges, internalMovedEdgeIds, wholeLayerMoveDelta)) {
          routeCachePatchedEdgeIds.add(edgeId);
        }
      }
      routeCacheMs += performance.now() - routeCacheStart;
      const dirtyStart = performance.now();
      const movedRouteDirtyResult = dirtyEdgeIdsAfterBulkMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds);
      const movedRouteDirtyIds = movedRouteDirtyResult.dirtyIds;
      const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);
      dirtyMs += performance.now() - dirtyStart;
      const busSyncStart = performance.now();
      const busTerminalSyncNodeIds = busTerminalSyncNodeIdsForGraphPatch(
        movedNodeIds,
        previousCandidateEdges,
        edgePatch.edgeUpserts,
        edgePatch.edgeDeleteIds
      );
      busSyncMs += performance.now() - busSyncStart;
      const markDirtyStart = performance.now();
      markRouteEdgesDirty(movedRouteDirtyIds);
      markStoredRouteEdgesDirty(storedRouteDirtyIds);
      markBusTerminalSyncDirty(busTerminalSyncNodeIds);
      markGraphDirtyForInteractiveCommit();
      markDirtyMs += performance.now() - markDirtyStart;
      const graphPatchStart = performance.now();
      setGraphStore((current: GraphStore) =>
        graphStoreApplyPatch(current, {
          nodeUpdates: expectedPatch.nodeUpdates,
          edgeUpserts: expectedPatch.edgeUpserts,
          edgeDeleteIds: expectedPatch.edgeDeleteIds
        })
      );
      graphPatchMs += performance.now() - graphPatchStart;
      logBulkMoveCommitStats({
        kind: bulkCommitKind,
        movedNodeCount: movedNodeIds.length,
        candidateEdgeCount: previousCandidateEdges.length,
        internalEdgeCount: internalMovedEdgeIds.size,
        boundaryEdgeCount: synchronousRepairCandidateEdges.length,
        deferredRepairCandidateCount: deferredRepairCandidateEdges.length,
        legacyDeferredRepairCandidateCount: bulkPlan.legacyDeferredRepairCandidateCount,
        routeCachePatchedCount: routeCachePatchedEdgeIds.size,
        legacyRouteDirtyCount: movedRouteDirtyResult.legacyDirtyCount,
        routeDirtyCount: movedRouteDirtyIds.size,
        storedRouteDirtyCount: storedRouteDirtyIds.size,
        routableLineUpdateCount: wholeMoveRoutableLineUpdates.length + internalRoutableLineUpdates.length,
        ...timingStats()
      });
      scheduleDeferredRoutableLineRouteRepair(
        previousNodes,
        movedNodeIds,
        originalPositions,
        expectedPatch.nodeUpdates,
        commitCanvasBounds
      );
      if (deferredMoveRepairFrameRef.current !== null) {
        window.cancelAnimationFrame(deferredMoveRepairFrameRef.current);
        deferredMoveRepairFrameRef.current = null;
      }
      deferredMoveOptimizationCancelRef.current?.();
      deferredMoveOptimizationCancelRef.current = null;
      if (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation) {
        deferredMoveRepairFrameRef.current = window.requestAnimationFrame(() => {
          deferredMoveRepairFrameRef.current = null;
          scheduleDeferredMovedConnectionRepair(
            movedNodeIds,
            deferredRepairCandidateEdges.length > 0 ? deferredRepairCandidateEdges : synchronousRepairCandidateEdges,
            expectedPatch,
            commitCanvasBounds,
            previousNodes,
            originalPositions,
            originalRoutePoints,
            selectedEdgeIds,
            { reconcileTerminalConnections: deferSingleNodeTerminalReconciliation }
          );
        });
      }
      return;
    }
    const syncRepairStart = performance.now();
    if (
      !wholeLayerMove &&
      shouldRunSynchronousMoveBlockerRepair(
        movedNodeIds,
        externalMoveCandidateEdges(previousCandidateEdges, internalMovedEdgeIds),
        synchronousRepairCandidateEdges
      )
    ) {
      const blockedConnectedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        committedNextNodes,
        synchronousRepairCandidateEdges,
        movedNodeIds,
        {},
        commitCanvasBounds
      );
      const blockedConnectedEdgeIds = new Set(Object.keys(blockedConnectedRoutePoints));
      if (blockedConnectedEdgeIds.size > 0) {
        let blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        let routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, committedNextNodes, movedNodeIds);
        const rebuiltEdges = rebuildExternalConnectionRoutesForMovedNodes(
          routingNodes,
          committedCandidateEdges,
          movedNodeIds,
          commitCanvasBounds,
          blockedCandidateEdges,
          editModeRouteRebuildOptions
        );
        if (rebuiltEdges !== committedCandidateEdges) {
          const rebuiltDirtyEdgeIds = edgeReferenceDiffIds(committedCandidateEdges, rebuiltEdges);
          markRouteEdgesDirty(rebuiltDirtyEdgeIds);
          markStoredRouteEdgesDirty(rebuiltDirtyEdgeIds);
          committedCandidateEdges = rebuiltEdges;
        }
        blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, committedNextNodes, movedNodeIds);
        if (internalMovedEdgeIds.size === 0) {
          const rebuiltInternalEdges = rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(
            routingNodes,
            committedCandidateEdges,
            movedNodeIds,
            commitCanvasBounds,
            blockedCandidateEdges,
            editModeRouteRebuildOptions
          );
          if (rebuiltInternalEdges !== committedCandidateEdges) {
            const rebuiltDirtyEdgeIds = edgeReferenceDiffIds(committedCandidateEdges, rebuiltInternalEdges);
            markRouteEdgesDirty(rebuiltDirtyEdgeIds);
            markStoredRouteEdgesDirty(rebuiltDirtyEdgeIds);
            committedCandidateEdges = rebuiltInternalEdges;
          }
        }
      }
    }
    syncRepairMs += performance.now() - syncRepairStart;
    const edgePatchStart = performance.now();
    const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
    const nextEdgesForBounds = edgePatch.edgeUpserts;
    const edgePatchDirtyIds = [
      ...edgePatch.edgeUpserts.map((edge: Edge) => edge.id),
      ...edgePatch.edgeDeleteIds
    ];
    const expectedPatch = { nodeUpdates: committedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
    edgePatchMs += performance.now() - edgePatchStart;
    const expandCanvasStart = performance.now();
    expandCanvasToFitGraph(committedNodeUpdates, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);
    canvasBoundsMs += performance.now() - expandCanvasStart;
    const routeCacheStart = performance.now();
    const routeCachePatchedEdgeIds =
      wholeLayerMove && wholeLayerMoveDelta
        ? patchCachedRoutesForWholeMove(
            committedCandidateEdges,
            movedNodeIds,
            selectedEdgeIds,
            wholeLayerMoveDelta
          )
        : patchCachedRoutesForHighFanoutMove(
            previousCandidateEdges,
            committedCandidateEdges,
            movedNodeIds,
            committedNextNodes,
            commitCanvasBounds
          );
    if (!wholeLayerMove && wholeLayerMoveDelta && internalMovedEdgeIds.size > 0) {
      for (const edgeId of patchCachedRoutesForInternalMove(committedCandidateEdges, internalMovedEdgeIds, wholeLayerMoveDelta)) {
        routeCachePatchedEdgeIds.add(edgeId);
      }
    }
    routeCacheMs += performance.now() - routeCacheStart;
    const dirtyStart = performance.now();
    const movedRouteDirtyResult = dirtyEdgeIdsAfterBulkMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds);
    const movedRouteDirtyIds = movedRouteDirtyResult.dirtyIds;
    const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);
    dirtyMs += performance.now() - dirtyStart;
    const busSyncStart = performance.now();
    const busTerminalSyncNodeIds = busTerminalSyncNodeIdsForGraphPatch(
      movedNodeIds,
      previousCandidateEdges,
      edgePatch.edgeUpserts,
      edgePatch.edgeDeleteIds
    );
    busSyncMs += performance.now() - busSyncStart;
    const markDirtyStart = performance.now();
    markRouteEdgesDirty(movedRouteDirtyIds);
    markStoredRouteEdgesDirty(storedRouteDirtyIds);
    markBusTerminalSyncDirty(busTerminalSyncNodeIds);
    markGraphDirtyForInteractiveCommit();
    markDirtyMs += performance.now() - markDirtyStart;
    const graphPatchStart = performance.now();
    setGraphStore((current: GraphStore) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: expectedPatch.nodeUpdates,
        edgeUpserts: expectedPatch.edgeUpserts,
        edgeDeleteIds: expectedPatch.edgeDeleteIds
      })
    );
    graphPatchMs += performance.now() - graphPatchStart;
    logBulkMoveCommitStats({
      kind: bulkCommitKind,
      movedNodeCount: movedNodeIds.length,
      candidateEdgeCount: previousCandidateEdges.length,
      internalEdgeCount: internalMovedEdgeIds.size,
      boundaryEdgeCount: synchronousRepairCandidateEdges.length,
      deferredRepairCandidateCount: deferredRepairCandidateEdges.length,
      legacyDeferredRepairCandidateCount: bulkPlan.legacyDeferredRepairCandidateCount,
      routeCachePatchedCount: routeCachePatchedEdgeIds.size,
      legacyRouteDirtyCount: movedRouteDirtyResult.legacyDirtyCount,
      routeDirtyCount: movedRouteDirtyIds.size,
      storedRouteDirtyCount: storedRouteDirtyIds.size,
      routableLineUpdateCount: wholeMoveRoutableLineUpdates.length + internalRoutableLineUpdates.length,
      ...timingStats()
    });
    if (!wholeLayerMove) {
      scheduleDeferredRoutableLineRouteRepair(
        previousNodes,
        movedNodeIds,
        originalPositions,
        expectedPatch.nodeUpdates,
        commitCanvasBounds
      );
      scheduleMovedEdgeOptimization(
        previousNodes,
        committedNextNodes,
        routeRepairCandidateEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds,
        originalPositions,
        deferredRepairCandidateEdges,
        expectedPatch
      );
    }
  };
}

export function createUpdateMouseStatus(__appScope: SelectionDragScope) {
  return (point: Point) => {
  const { lastMouseStatusRef, mousePositionTextRef, mouseStatusFrameRef, pendingMouseStatusRef } = __appScope;
    const rounded = { x: Math.round(point.x), y: Math.round(point.y) };
    const previous = lastMouseStatusRef.current;
    if (previous?.x === rounded.x && previous.y === rounded.y) {
      return;
    }
    pendingMouseStatusRef.current = rounded;
    if (mouseStatusFrameRef.current !== null) {
      return;
    }
    mouseStatusFrameRef.current = window.requestAnimationFrame(() => {
      mouseStatusFrameRef.current = null;
      const next = pendingMouseStatusRef.current;
      pendingMouseStatusRef.current = null;
      if (!next) {
        return;
      }
      const latest = lastMouseStatusRef.current;
      if (latest?.x === next.x && latest.y === next.y) {
        return;
      }
      lastMouseStatusRef.current = next;
      if (mousePositionTextRef.current) {
        mousePositionTextRef.current.textContent = `X:${next.x} Y:${next.y}`;
      }
    });
  };
}

export function createUpdateMultiNodeDragOverlayTransform(__appScope: SelectionDragScope) {
  return (delta: Point | null) => {
  const { draggingRef, imperativeMultiNodeDragOverlayRef, isMultiNodeMoveState, multiNodeDragOverlayDeltaRef, multiNodeDragOverlayRef, updateNodeDragLightweightEdgePreview } = __appScope;
    const nextDelta = delta ?? { x: 0, y: 0 };
    multiNodeDragOverlayDeltaRef.current = nextDelta;
    const roundedDelta = { x: Math.round(nextDelta.x), y: Math.round(nextDelta.y) };
    const transform = `translate(${roundedDelta.x} ${roundedDelta.y})`;
    multiNodeDragOverlayRef.current?.setAttribute("transform", transform);
    imperativeMultiNodeDragOverlayRef.current?.setAttribute("transform", transform);
    const activeDragging = draggingRef.current;
    if (activeDragging && isMultiNodeMoveState(activeDragging)) {
      updateNodeDragLightweightEdgePreview(activeDragging, roundedDelta, activeDragging.overlayPreview?.dynamicEdgePreviewEdges ?? []);
    }
  };
}

export function createShowImperativeMultiNodeDragOverlay(__appScope: SelectionDragScope) {
  return (markup: string) => {
  const { imperativeMultiNodeDragActiveRef, imperativeMultiNodeDragOverlayRef, multiNodeDragOverlayDeltaRef, updateMultiNodeDragOverlayTransform } = __appScope;
    const overlay = imperativeMultiNodeDragOverlayRef.current;
    if (!overlay) {
      return false;
    }
    imperativeMultiNodeDragActiveRef.current = true;
    overlay.innerHTML = markup;
    overlay.style.display = "";
    updateMultiNodeDragOverlayTransform(multiNodeDragOverlayDeltaRef.current);
    return true;
  };
}

export function createHideImperativeMultiNodeDragOverlay(__appScope: SelectionDragScope) {
  return () => {
  const { clearImperativeNodeDragEdgePreview, imperativeMultiNodeDragActiveRef, imperativeMultiNodeDragOverlayRef } = __appScope;
    imperativeMultiNodeDragActiveRef.current = false;
    const overlay = imperativeMultiNodeDragOverlayRef.current;
    if (overlay) {
      overlay.innerHTML = "";
      overlay.style.display = "none";
    }
    clearImperativeNodeDragEdgePreview();
  };
}

export function createResetMultiNodeDragOverlayTransform(__appScope: SelectionDragScope) {
  return () => {
  const { updateMultiNodeDragOverlayTransform } = __appScope;
    updateMultiNodeDragOverlayTransform({ x: 0, y: 0 });
  };
}

export function createBuildSingleNodeDragPreviewNodeMarkup(__appScope: SelectionDragScope) {
  return (dragState: DraggingState) => {
  const { DeviceGlyph, buildMeasurementGroupsMarkup, buildNodePreviewImageMarkup, buildSvgNodeLabelMarkup, buildSvgTerminalMarkup, colorDisplayMode, colorPalette, escapeXml, formatSvgNumber, isBusNode, isMultiNodeMoveState, isStaticNode, nodeById, nodeGeometryTransform, renderSvgElementMarkup, resolveNodeStateVisual, themeMode, visibleNodeIdSet } = __appScope;
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return "";
    }
    const nodeId = dragState.nodeIds[0];
    const node = nodeById.get(nodeId);
    const originalPosition = dragState.originalPositions[nodeId] ?? node?.position;
    if (!node || !originalPosition || !visibleNodeIdSet.has(node.id)) {
      return "";
    }
    const nodeIsBus = isBusNode(node);
    const stateVisual = resolveNodeStateVisual(node);
    const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, themeMode, stateVisual }));
    const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, themeMode, stateVisual }));
    const imageMarkup = buildNodePreviewImageMarkup(node, `single-node-drag-preview-clip-${node.id}`);
    const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
    const labelMarkup = buildSvgNodeLabelMarkup(node);
    const previewNode = originalPosition === node.position ? node : { ...node, position: originalPosition };
    const measurementMarkup = buildMeasurementGroupsMarkup(previewNode);
    return `<g class="single-node-drag-preview-node ${nodeIsBus ? "bus-node" : ""}" transform="translate(${formatSvgNumber(originalPosition.x)} ${formatSvgNumber(originalPosition.y)})">
  <title>${escapeXml(node.name)}</title>
  <g class="node-geometry" transform="${escapeXml(nodeGeometryTransform(node))}">
    <rect class="node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${isStaticNode(node) ? "static-hitbox" : ""}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 8}"/>
    ${glyphMarkup}
    ${glyphTextMarkup}
  </g>
  ${imageMarkup}
  <g class="node-terminal-layer" transform="${escapeXml(nodeGeometryTransform(node))}">
    ${terminalMarkup}
  </g>
  ${labelMarkup}
  ${measurementMarkup}
</g>`;
  };
}

export function createClearImperativeNodeDragEdgePreview(__appScope: SelectionDragScope) {
  return () => {
  const { imperativeNodeDragEdgePreviewKeyRef, imperativeNodeDragEdgePreviewPathRefs, imperativeSingleNodeDragEdgePreviewRef } = __appScope;
    imperativeNodeDragEdgePreviewPathRefs.current.clear();
    imperativeNodeDragEdgePreviewKeyRef.current = "";
    const edgePreview = imperativeSingleNodeDragEdgePreviewRef.current;
    if (edgePreview) {
      edgePreview.innerHTML = "";
      edgePreview.style.display = "none";
    }
  };
}

export function createShowImperativeSingleNodeDragPreview(__appScope: SelectionDragScope) {
  return (dragState: DraggingState) => {
  const { buildSingleNodeDragPreviewNodeMarkup, clearImperativeNodeDragEdgePreview, imperativeSingleNodeDragActiveRef, imperativeSingleNodeDragNodeOverlayRef } = __appScope;
    const markup = buildSingleNodeDragPreviewNodeMarkup(dragState);
    const nodeOverlay = imperativeSingleNodeDragNodeOverlayRef.current;
    if (!nodeOverlay || !markup) {
      return false;
    }
    imperativeSingleNodeDragActiveRef.current = true;
    nodeOverlay.innerHTML = markup;
    nodeOverlay.style.display = "";
    nodeOverlay.setAttribute("transform", "translate(0 0)");
    clearImperativeNodeDragEdgePreview();
    return true;
  };
}

export function createCssSelectorEscape(__appScope: SelectionDragScope) {
  return (value: string) => {
  const { CSS } = __appScope;
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  };
}

export function createClearImperativeSingleNodeDragOriginLines(__appScope: SelectionDragScope) {
  return () => {
  const { cssSelectorEscape, imperativeSingleNodeDragOriginEdgeIdsRef, imperativeSingleNodeDragOriginRoutableLineNodeIdsRef, svgRef } = __appScope;
    const svg = svgRef.current;
    if (svg) {
      for (const edgeId of imperativeSingleNodeDragOriginEdgeIdsRef.current) {
        svg.querySelectorAll(`[data-edge-id="${cssSelectorEscape(edgeId)}"]`).forEach((element: Element) => {
          element.classList.remove("single-drag-origin-line");
        });
      }
      for (const nodeId of imperativeSingleNodeDragOriginRoutableLineNodeIdsRef.current) {
        svg.querySelectorAll(`[data-node-id="${cssSelectorEscape(nodeId)}"]`).forEach((element: Element) => {
          element.classList.remove("single-drag-origin-line");
        });
      }
    }
    imperativeSingleNodeDragOriginEdgeIdsRef.current.clear();
    imperativeSingleNodeDragOriginRoutableLineNodeIdsRef.current.clear();
  };
}

export function createSetImperativeSingleNodeDragOriginLines(__appScope: SelectionDragScope) {
  return (dragState: DraggingState) => {
  const { clearImperativeSingleNodeDragOriginLines, cssSelectorEscape, dragDraggedEdgeIdSet, dragMovedNodeIdSet, imperativeSingleNodeDragOriginEdgeIdsRef, imperativeSingleNodeDragOriginRoutableLineNodeIdsRef, isMultiNodeMoveState, isRoutableLineDeviceKind, nodeById, routableLineNodeIdsByEndpointNodeId, singleNodeDragRelevantEdges, svgRef, visibleEdgeIdSet, visibleNodeIdSet } = __appScope;
    clearImperativeSingleNodeDragOriginLines();
    const svg = svgRef.current;
    if (!svg || isMultiNodeMoveState(dragState)) {
      return;
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    const draggedEdgeIds = dragDraggedEdgeIdSet(dragState);
    const edgeIds = new Set<string>();
    for (const edge of singleNodeDragRelevantEdges(dragState)) {
      if (
        visibleEdgeIdSet.has(edge.id) &&
        (movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id))
      ) {
        edgeIds.add(edge.id);
      }
    }
    const routableLineNodeIds = new Set<string>();
    for (const nodeId of movedNodeIds) {
      const node = nodeById.get(nodeId);
      if (node && visibleNodeIdSet.has(node.id) && isRoutableLineDeviceKind(node.kind)) {
        routableLineNodeIds.add(node.id);
      }
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        if (visibleNodeIdSet.has(lineId)) {
          routableLineNodeIds.add(lineId);
        }
      }
    }
    for (const edgeId of edgeIds) {
      svg.querySelectorAll(`[data-edge-id="${cssSelectorEscape(edgeId)}"]`).forEach((element: Element) => {
        element.classList.add("single-drag-origin-line");
      });
    }
    for (const nodeId of routableLineNodeIds) {
      svg.querySelectorAll(`[data-node-id="${cssSelectorEscape(nodeId)}"]`).forEach((element: Element) => {
        element.classList.add("single-drag-origin-line");
      });
    }
    imperativeSingleNodeDragOriginEdgeIdsRef.current = edgeIds;
    imperativeSingleNodeDragOriginRoutableLineNodeIdsRef.current = routableLineNodeIds;
  };
}

export function createSetImperativeSingleNodeDragOrigin(__appScope: SelectionDragScope) {
  return (nodeId: string | null) => {
  const { canvasNodeElementRefs, clearImperativeSingleNodeDragOriginLines, cssSelectorEscape, imperativeSingleNodeDragOriginNodeIdRef, svgRef } = __appScope;
    const setMeasurementOriginClass = (originNodeId: string, enabled: boolean) => {
      const svg = svgRef.current;
      if (!svg) {
        return;
      }
      svg.querySelectorAll(`.measurement-group[data-export-device-id="${cssSelectorEscape(originNodeId)}"]`).forEach((element: Element) => {
        if (enabled) {
          element.classList.add("drag-origin");
        } else {
          element.classList.remove("drag-origin");
        }
      });
    };
    const previousNodeId = imperativeSingleNodeDragOriginNodeIdRef.current;
    if (previousNodeId && previousNodeId !== nodeId) {
      canvasNodeElementRefs.current.get(previousNodeId)?.classList.remove("single-drag-origin");
      setMeasurementOriginClass(previousNodeId, false);
    }
    imperativeSingleNodeDragOriginNodeIdRef.current = nodeId;
    svgRef.current?.classList.toggle("single-node-dragging", Boolean(nodeId));
    if (!nodeId) {
      clearImperativeSingleNodeDragOriginLines();
    }
    if (nodeId) {
      canvasNodeElementRefs.current.get(nodeId)?.classList.add("single-drag-origin");
      setMeasurementOriginClass(nodeId, true);
    }
  };
}

export function createBindCanvasNodeElement(__appScope: SelectionDragScope) {
  return (nodeId: string, element: SVGGElement | null) => {
  const { canvasNodeElementRefs, imperativeSingleNodeDragOriginNodeIdRef } = __appScope;
    if (!element) {
      canvasNodeElementRefs.current.delete(nodeId);
      return;
    }
    canvasNodeElementRefs.current.set(nodeId, element);
    if (imperativeSingleNodeDragOriginNodeIdRef.current === nodeId) {
      element.classList.add("single-drag-origin");
    } else {
      element.classList.remove("single-drag-origin");
    }
  };
}

export function createHideImperativeSingleNodeDragPreview(__appScope: SelectionDragScope) {
  return () => {
  const { clearImperativeNodeDragEdgePreview, imperativeNodeDragDropHintRef, imperativeSingleNodeDragActiveRef, imperativeSingleNodeDragNodeOverlayRef, nodeTerminalSnapTargetRef, setImperativeSingleNodeDragOrigin } = __appScope;
    imperativeSingleNodeDragActiveRef.current = false;
    setImperativeSingleNodeDragOrigin(null);
    const nodeOverlay = imperativeSingleNodeDragNodeOverlayRef.current;
    if (nodeOverlay) {
      nodeOverlay.innerHTML = "";
      nodeOverlay.style.display = "none";
      nodeOverlay.setAttribute("transform", "translate(0 0)");
    }
    clearImperativeNodeDragEdgePreview();
    const dropHint = imperativeNodeDragDropHintRef.current;
    if (dropHint) {
      dropHint.style.display = "none";
    }
    nodeTerminalSnapTargetRef.current = null;
  };
}

export function createSingleNodeDragPreviewNodeFor(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, nodeId: string, delta: Point) => {
  const { nodeById } = __appScope;
    const node = nodeById.get(nodeId);
    const originalPosition = dragState.originalPositions[nodeId];
    return node && originalPosition
      ? {
          ...node,
          position: {
            x: originalPosition.x + delta.x,
            y: originalPosition.y + delta.y
          }
        }
      : node;
  };
}

export function createSingleNodeDragRelevantEdges(__appScope: SelectionDragScope) {
  return (dragState: DraggingState) => {
  const { isMultiNodeMoveState, visibleEdgeIdSet } = __appScope;
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return [];
    }
    if (dragState.singleNodeDragCache) {
      return dragState.singleNodeDragCache.relevantEdges;
    }
    const movedNodeIds = new Set(dragState.nodeIds);
    const draggedEdgeIds = new Set(dragState.edgeIds);
    return dragState.affectedEdges.filter((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return false;
      }
      return movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id);
    });
  };
}

export function createSingleNodeDragPreviewBounds(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point): RenderViewportBounds => {
  const { CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, expandRouteBox, mergeRenderViewportBounds, nodeHasUprightBoundsContent, nodeVisualInteractionBounds, renderViewportBounds, singleNodeDragPreviewNodeFor } = __appScope;
    const baseBounds = expandRouteBox(renderViewportBounds, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING);
    const nodeId = dragState.nodeIds[0];
    const movedNode = nodeId ? singleNodeDragPreviewNodeFor(dragState, nodeId, delta) : undefined;
    return movedNode
      ? mergeRenderViewportBounds(baseBounds, nodeVisualInteractionBounds(movedNode, movedNode.position, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, nodeHasUprightBoundsContent(movedNode)))
      : baseBounds;
  };
}

export function createSingleNodeDragEdgeTouchesBounds(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, edge: Edge, delta: Point, bounds: RenderViewportBounds) => {
  const { boxesOverlap, nodeIntersectsRenderViewport, singleNodeDragPreviewNodeFor } = __appScope;
    const routeBounds = dragState.originalRouteBounds[edge.id];
    if (routeBounds && boxesOverlap(routeBounds, bounds)) {
      return true;
    }
    const sourcePreviewNode = singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta);
    const targetPreviewNode = singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta);
    const sourceMoved = dragState.nodeIds.includes(edge.sourceId);
    const targetMoved = dragState.nodeIds.includes(edge.targetId);
    const stationaryEndpoint = sourceMoved ? targetPreviewNode : targetMoved ? sourcePreviewNode : undefined;
    return Boolean(stationaryEndpoint && nodeIntersectsRenderViewport(stationaryEndpoint, bounds));
  };
}

export function createSingleNodeDragViewportLocalEdgesByScan(__appScope: SelectionDragScope) {
  return (
    dragState: DraggingState,
    edgesToCheck: Edge[],
    delta: Point,
    bounds: RenderViewportBounds,
    localLimit = Number.POSITIVE_INFINITY
  ) => {
  const { singleNodeDragEdgeTouchesBounds } = __appScope;
    const viewportLocalEdges: Edge[] = [];
    for (const edge of edgesToCheck) {
      if (!singleNodeDragEdgeTouchesBounds(dragState, edge, delta, bounds)) {
        continue;
      }
      viewportLocalEdges.push(edge);
      if (viewportLocalEdges.length >= localLimit) {
        break;
      }
    }
    return viewportLocalEdges;
  };
}

export function createSingleNodeDragScopedEdges(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point) => {
  const { CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, singleNodeDragPreviewBounds, singleNodeDragRelevantEdges, singleNodeDragViewportLocalEdgesByScan } = __appScope;
    if (dragState.singleNodeDragCache) {
      return { previewEdges: dragState.singleNodeDragCache.previewEdges, snapEdges: dragState.singleNodeDragCache.snapEdges };
    }
    const relevantEdges = singleNodeDragRelevantEdges(dragState);
    if (relevantEdges.length <= CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT) {
      return { previewEdges: relevantEdges, snapEdges: relevantEdges };
    }
    const bounds = singleNodeDragPreviewBounds(dragState, delta);
    const localLimit = Math.max(CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT);
    const viewportLocalEdges = singleNodeDragViewportLocalEdgesByScan(dragState, relevantEdges, delta, bounds, localLimit);
    const scopedEdges = viewportLocalEdges.length > 0 ? viewportLocalEdges : relevantEdges;
    return {
      previewEdges: scopedEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT),
      snapEdges: scopedEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT)
    };
  };
}

export function createSimpleOrthogonalDragPreviewPoints(__appScope: SelectionDragScope) {
  return (start: Point, end: Point) => {
    if (Math.round(start.x) === Math.round(end.x) || Math.round(start.y) === Math.round(end.y)) {
      return [start, end];
    }
    return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: start.x, y: end.y }, end];
  };
}

export function createRoutableLineIdsConnectedToNodeIds(__appScope: SelectionDragScope) {
  return (nodeIds: Iterable<string>) => {
  const { routableLineNodeIdsByEndpointNodeId } = __appScope;
    const lineIds = new Set<string>();
    for (const nodeId of nodeIds) {
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        lineIds.add(lineId);
      }
    }
    return lineIds;
  };
}

export function createRoutableLineEndpointPreviewRoutePoints(__appScope: SelectionDragScope) {
  return function routableLineEndpointPreviewRoutePoints(
    refs: RoutableLineDeviceEndpointRefs,
    start: Point,
    end: Point,
    previewNodeById: Map<string, ModelNode>,
    bounds?: CanvasBounds
  ) {
  const { compactPreviewNodes, isBusNode, routeEdgesForStoredRendering } = __appScope;
    const sourceRef = refs.source;
    const targetRef = refs.target;
    const sourceEndpointNode = sourceRef ? previewNodeById.get(sourceRef.nodeId) : undefined;
    const targetEndpointNode = targetRef ? previewNodeById.get(targetRef.nodeId) : undefined;
    if (!sourceRef && !targetRef) {
      return null;
    }
    const route = routeEdgesForStoredRendering(compactPreviewNodes(sourceEndpointNode, targetEndpointNode), [{
      id: "routable-line-endpoint-preview",
      sourceId: sourceEndpointNode?.id ?? "floating-routable-line-preview-source",
      targetId: targetEndpointNode?.id ?? "floating-routable-line-preview-target",
      sourceTerminalId: sourceRef?.terminalId,
      targetTerminalId: targetRef?.terminalId,
      sourcePoint: !sourceEndpointNode || isBusNode(sourceEndpointNode) ? start : undefined,
      targetPoint: !targetEndpointNode || isBusNode(targetEndpointNode) ? end : undefined
    }], bounds)[0];
    return route?.points.length ? route.points : null;
  };
}

export function createBuildRoutableLinePreviewRoutesForNodeUpdates(__appScope: SelectionDragScope) {
  return (
    baseNodeById: Map<string, ModelNode>,
    changedNodeIds: Iterable<string>,
    nodeUpdates: Iterable<ModelNode>,
    options: { routeFully?: boolean; bounds?: CanvasBounds } = {}
  ): NodeDragPreviewRoute[] => {
  const { colorDisplayMode, colorPalette, themeMode, getDeviceStrokeColor, isRoutableLineDeviceKind, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefs, routableLineEndpointPreviewRoutePoints, routableLineIdsConnectedToNodeIds, routeRoutableLineDevice, simpleOrthogonalDragPreviewPoints, syncRoutableLineDeviceEndpointsToRefs, visibleNodeIdSet } = __appScope;
    const changedNodeIdList = Array.from(changedNodeIds);
    if (changedNodeIdList.length === 0) {
      return [];
    }
    const previewNodeById = new Map(baseNodeById);
    for (const node of nodeUpdates) {
      previewNodeById.set(node.id, node);
    }
    const lineIds = routableLineIdsConnectedToNodeIds(changedNodeIdList);
    if (lineIds.size === 0) {
      return [];
    }
    const routeFully = options.routeFully === true;
    const referenceNodes = Array.from(baseNodeById.values());
    const previewNodes = referenceNodes.map((node) => previewNodeById.get(node.id) ?? node);
    const routes: NodeDragPreviewRoute[] = [];
    for (const lineId of lineIds) {
      const lineNode = baseNodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const syncedLine = syncRoutableLineDeviceEndpointsToRefs(lineNode, previewNodes, previewNodeById, referenceNodes);
      const displayLine = routeFully
        ? routeRoutableLineDevice(syncedLine, previewNodes, options.bounds)
        : syncedLine;
      const repairedLine = repairInteractiveRoutableLineDeviceRoute(
        previewNodes,
        displayLine,
        routableLineDeviceCanvasPoints(displayLine),
        options.bounds
      );
      const points = routableLineDeviceCanvasPoints(repairedLine);
      const start = points[0];
      const end = points[points.length - 1];
      if (!start || !end) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(syncedLine);
      const endpointRoutePoints = !routeFully && points.length <= 2
        ? routableLineEndpointPreviewRoutePoints(refs, start, end, previewNodeById, options.bounds)
        : null;
      const previewPoints = routeFully || points.length > 2 ? points : endpointRoutePoints ?? simpleOrthogonalDragPreviewPoints(start, end);
      routes.push({
        edgeId: `routable-line:${lineNode.id}`,
        routableLineNodeId: lineNode.id,
        path: pointsToPreviewPath(previewPoints),
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette, themeMode)
      });
    }
    return routes;
  };
}

export function createBuildRoutableLineEndpointPreviewNodeUpdates(__appScope: SelectionDragScope) {
  return (
    sourceNodes: ModelNode[],
    baseNodeById: Map<string, ModelNode>,
    changedNodeIds: Iterable<string>,
    nodeUpdates: Iterable<ModelNode>,
    canvasBounds: CanvasBounds
  ) => {
  const { isRoutableLineDeviceKind, routableLineIdsConnectedToNodeIds, routeRoutableLineDevice, syncRoutableLineDeviceEndpointsToRefs } = __appScope;
    const lineIds = routableLineIdsConnectedToNodeIds(changedNodeIds);
    if (lineIds.size === 0) {
      return [];
    }
    const previewNodeById = new Map(baseNodeById);
    for (const node of nodeUpdates) {
      previewNodeById.set(node.id, node);
    }
    const previewNodes = sourceNodes.map((node) => previewNodeById.get(node.id) ?? node);
    const updates: ModelNode[] = [];
    for (const lineId of lineIds) {
      const lineNode = baseNodeById.get(lineId);
      if (!lineNode || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const syncedLine = syncRoutableLineDeviceEndpointsToRefs(lineNode, previewNodes, previewNodeById, sourceNodes);
      if (syncedLine !== lineNode) {
        const routingNodes = previewNodes.map((node) => (node.id === syncedLine.id ? syncedLine : node));
        updates.push(routeRoutableLineDevice(syncedLine, routingNodes, canvasBounds));
      }
    }
    return updates;
  };
}

export function createBuildTranslatedInternalRoutableLineDragPreviewRoutes(__appScope: SelectionDragScope) {
  return (
    dragState: DraggingState,
    delta: Point,
    movedNodeIds: string[]
  ) => {
  const { canvasBounds, colorDisplayMode, colorPalette, themeMode, getDeviceStrokeColor, inferMissingRoutableLineDeviceEndpointRefs, isMultiNodeMoveState, isRoutableLineDeviceKind, nodeById, nodes, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefs, routableLineIdsConnectedToNodeIds, translatePointBy, visibleNodeIdSet } = __appScope;
    if (!dragState.wholeLayerMove && !isMultiNodeMoveState(dragState)) {
      return [];
    }
    const movedIds = new Set(movedNodeIds);
    const previewNodes = nodes.map((node: ModelNode) => {
      const originalPosition = dragState.originalPositions[node.id];
      return originalPosition && movedIds.has(node.id)
        ? { ...node, position: translatePointBy(originalPosition, delta) }
        : node;
    });
    const routes: NodeDragPreviewRoute[] = [];
    const seenLineIds = new Set<string>();
    for (const lineId of routableLineIdsConnectedToNodeIds(movedNodeIds)) {
      if (seenLineIds.has(lineId)) {
        continue;
      }
      seenLineIds.add(lineId);
      const lineNode = nodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(inferMissingRoutableLineDeviceEndpointRefs(lineNode, nodes));
      if (!refs.source?.nodeId || !refs.target?.nodeId || !movedIds.has(refs.source.nodeId) || !movedIds.has(refs.target.nodeId)) {
        continue;
      }
      const translatedPoints = routableLineDeviceCanvasPoints(lineNode).map((point: Point) => translatePointBy(point, delta));
      const repairedLine = repairInteractiveRoutableLineDeviceRoute(previewNodes, lineNode, translatedPoints, canvasBounds);
      const points = routableLineDeviceCanvasPoints(repairedLine);
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

export function createBuildRoutableLineDragPreviewRoutes(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point) => {
  const { buildRoutableLinePreviewRoutesForNodeUpdates, buildTranslatedInternalRoutableLineDragPreviewRoutes, dragMovedNodeIdSet, nodeById, singleNodeDragPreviewNodeFor } = __appScope;
    const movedNodeIds = Array.from(dragMovedNodeIdSet(dragState));
    if (movedNodeIds.length === 0) {
      return [];
    }
    const translatedInternalRoutableLinePreviewRoutes = buildTranslatedInternalRoutableLineDragPreviewRoutes(dragState, delta, movedNodeIds);
    if (dragState.wholeLayerMove) {
      return translatedInternalRoutableLinePreviewRoutes;
    }
    const previewNodeUpdates = (movedNodeIds as string[]).flatMap((nodeId: string): ModelNode[] => {
      const node = singleNodeDragPreviewNodeFor(dragState, nodeId, delta);
      return node ? [node] : [];
    });
    const translatedInternalRoutableLineNodeIds = new Set(
      translatedInternalRoutableLinePreviewRoutes.flatMap((route: NodeDragPreviewRoute) =>
        route.routableLineNodeId ? [route.routableLineNodeId] : []
      )
    );
    const endpointPreviewRoutes = buildRoutableLinePreviewRoutesForNodeUpdates(nodeById, movedNodeIds, previewNodeUpdates)
      .filter((route: NodeDragPreviewRoute) => !route.routableLineNodeId || !translatedInternalRoutableLineNodeIds.has(route.routableLineNodeId));
    return [...endpointPreviewRoutes, ...translatedInternalRoutableLinePreviewRoutes];
  };
}

export function createBuildCachedSingleNodeDragPreviewRoutes(__appScope: SelectionDragScope) {
  return (
    cache: SingleNodeDragCache | undefined,
    delta: Point,
    previewEdges: Edge[],
    previewNodes: ModelNode[] = []
  ): NodeDragPreviewRoute[] | null => {
  const { canvasBounds, pointsToPreviewPath, preserveDraggedRouteShape, shiftPreviewEndpointForDelta, simpleOrthogonalDragPreviewPoints } = __appScope;
    if (!cache) {
      return null;
    }
    const routes: NodeDragPreviewRoute[] = [];
    for (const edge of previewEdges) {
      const endpoint = cache.previewEndpointByEdgeId.get(edge.id);
      if (!endpoint) {
        return null;
      }
      const start = shiftPreviewEndpointForDelta(endpoint.start, endpoint.startMoves, delta);
      const end = shiftPreviewEndpointForDelta(endpoint.end, endpoint.endMoves, delta);
      const previewPoints = endpoint.routePoints?.length
        ? preserveDraggedRouteShape({
            routePoints: endpoint.routePoints,
            nextStart: start,
            nextEnd: end,
            sourceDelta: { x: start.x - endpoint.routePoints[0].x, y: start.y - endpoint.routePoints[0].y },
            targetDelta: {
              x: end.x - endpoint.routePoints[endpoint.routePoints.length - 1].x,
              y: end.y - endpoint.routePoints[endpoint.routePoints.length - 1].y
            },
            sourceNormal: endpoint.sourceNormal,
            targetNormal: endpoint.targetNormal
          })
        : simpleOrthogonalDragPreviewPoints(start, end);
      const safePreviewPoints = previewNodes.length > 0
        ? repairInteractiveConnectionRoute(previewNodes, edge, previewPoints, canvasBounds)
        : previewPoints;
      routes.push({
        edgeId: endpoint.edgeId,
        path: pointsToPreviewPath(safePreviewPoints),
        color: endpoint.color
      });
    }
    return routes;
  };
}

export function createBuildDragPreviewEndpointPoints(__appScope: SelectionDragScope) {
  return (
    dragState: DraggingState,
    edge: Edge,
    delta: Point,
    movedNodeIds: Set<string>,
    draggedEdgeIds: Set<string>,
    movedBusIds: Set<string>
  ) => {
  const { getModelEdgeEndpointPoint, isBusNode, projectPointToBusCenterline, shiftedDragPreviewPoint, singleNodeDragPreviewNodeFor } = __appScope;
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    const wholeEdgeMoves = draggedEdgeIds.has(edge.id) && !sourceMoved && !targetMoved;
    const originalPoints = dragState.originalEdgePoints[edge.id];
    const source = singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta);
    const target = singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta);
    if (!source || !target) {
      return null;
    }
    const originalRoute = dragState.originalRoutePoints[edge.id];
    const frozenSourceBusPoint = originalRoute?.[0];
    const frozenTargetBusPoint = originalRoute?.[originalRoute.length - 1];
    const sourcePoint = movedBusIds.has(edge.sourceId) || wholeEdgeMoves
      ? shiftedDragPreviewPoint(originalPoints?.sourcePoint, delta) ??
        (isBusNode(source) ? shiftedDragPreviewPoint(frozenSourceBusPoint, delta) : undefined) ??
        edge.sourcePoint
      : edge.sourcePoint ?? (isBusNode(source) ? frozenSourceBusPoint : undefined);
    const targetPoint = movedBusIds.has(edge.targetId) || wholeEdgeMoves
      ? shiftedDragPreviewPoint(originalPoints?.targetPoint, delta) ??
        (isBusNode(target) ? shiftedDragPreviewPoint(frozenTargetBusPoint, delta) : undefined) ??
        edge.targetPoint
      : edge.targetPoint ?? (isBusNode(target) ? frozenTargetBusPoint : undefined);
    let start = getModelEdgeEndpointPoint(source, sourcePoint, edge.sourceTerminalId);
    let end = getModelEdgeEndpointPoint(target, targetPoint, edge.targetTerminalId);
    if (isBusNode(source) && !sourcePoint) {
      start = projectPointToBusCenterline(source, end);
    }
    if (isBusNode(target) && !targetPoint) {
      end = projectPointToBusCenterline(target, start);
    }
    return { start, end, source, target };
  };
}

export function createConnectionEndpointPreviewRoutePoints(__appScope: SelectionDragScope) {
  return (
    edge: Edge,
    endpoints: DragPreviewEndpointPoints
  ) => {
  const { canvasBounds, compactPreviewNodes, isBusNode, routeEdgesForStoredRendering, simpleOrthogonalDragPreviewPoints } = __appScope;
    const previewEdge = {
      ...edge,
      sourcePoint: isBusNode(endpoints.source) ? endpoints.start : edge.sourcePoint,
      targetPoint: isBusNode(endpoints.target) ? endpoints.end : edge.targetPoint
    };
    const route = routeEdgesForStoredRendering(compactPreviewNodes(endpoints.source, endpoints.target), [previewEdge], canvasBounds)[0];
    return route?.points.length
      ? route.points
      : simpleOrthogonalDragPreviewPoints(endpoints.start, endpoints.end);
  };
}

export function createBuildLightweightNodeDragPreviewRoutes(__appScope: SelectionDragScope) {
  return (
    dragState: DraggingState,
    delta: Point,
    scopedPreviewEdges?: Edge[]
  ): NodeDragPreviewRoute[] => {
  const { buildCachedSingleNodeDragPreviewRoutes, buildDragPreviewEndpointPoints, buildRoutableLineDragPreviewRoutes, cachedConnectionStrokeColor, canvasBounds, connectionEndpointPreviewRoutePoints, getRouteEndpointNormal, isBusNode, isMultiNodeMoveState, nodeById, pointsToPreviewPath, preserveDraggedRouteShape, singleNodeDragPreviewEdges, singleNodeDragPreviewNodeFor, visibleEdgeIdSet } = __appScope;
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, delta)
    );
    const multiNodeMove = isMultiNodeMoveState(dragState);
    const dragCache = dragState.singleNodeDragCache;
    const overlayPreviewCache = multiNodeMove ? dragState.overlayPreview : undefined;
    const movedNodeIds = dragCache?.movedNodeIds ?? overlayPreviewCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    const previewNodes = (Array.from(nodeById.values()) as ModelNode[]).map((node) =>
      singleNodeDragPreviewNodeFor(dragState, node.id, delta) ?? node
    );
    const cachedSingleNodePreviewRoutes = !multiNodeMove
      ? buildCachedSingleNodeDragPreviewRoutes(dragCache, delta, previewEdges, previewNodes)
      : null;
    const routableLinePreviewRoutes = buildRoutableLineDragPreviewRoutes(dragState, delta);
    if (cachedSingleNodePreviewRoutes) {
      return [...cachedSingleNodePreviewRoutes, ...routableLinePreviewRoutes];
    }
    const draggedEdgeIds = dragCache?.draggedEdgeIds ?? overlayPreviewCache?.draggedEdgeIds ?? new Set(dragState.edgeIds);
    const movedBusIds = dragCache?.movedBusNodeIds ?? overlayPreviewCache?.movedBusNodeIds ?? new Set(
      dragState.nodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    // 批量拖拽跨选区动态预览边超过 30 条时跳过每帧昂贵的正交保形计算，直接走轻量端点折线，松手再做完整路径还原
    const useFastEndpointPreview = multiNodeMove && previewEdges.length > 30;
    const edgePreviewRoutes = previewEdges.flatMap((edge: Edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return [];
      }
      const sourceMoved = movedNodeIds.has(edge.sourceId);
      const targetMoved = movedNodeIds.has(edge.targetId);
      if (multiNodeMove && sourceMoved && targetMoved) {
        return [];
      }
      if (!sourceMoved && !targetMoved && !draggedEdgeIds.has(edge.id)) {
        return [];
      }
      const endpoints = buildDragPreviewEndpointPoints(dragState, edge, delta, movedNodeIds, draggedEdgeIds, movedBusIds);
      if (!endpoints) {
        return [];
      }
      const color = cachedConnectionStrokeColor(edge);
      const originalRoute = dragState.originalRoutePoints[edge.id];
      const previewPoints = !useFastEndpointPreview && originalRoute?.length
        ? preserveDraggedRouteShape({
            routePoints: originalRoute,
            nextStart: endpoints.start,
            nextEnd: endpoints.end,
            sourceDelta: { x: endpoints.start.x - originalRoute[0].x, y: endpoints.start.y - originalRoute[0].y },
            targetDelta: {
              x: endpoints.end.x - originalRoute[originalRoute.length - 1].x,
              y: endpoints.end.y - originalRoute[originalRoute.length - 1].y
            },
            sourceNormal: getRouteEndpointNormal(endpoints.source, endpoints.start, endpoints.end, edge.sourceTerminalId),
            targetNormal: getRouteEndpointNormal(endpoints.target, endpoints.end, endpoints.start, edge.targetTerminalId)
          })
        : connectionEndpointPreviewRoutePoints(edge, endpoints);
      const previewEdge = {
        ...edge,
        sourcePoint: isBusNode(endpoints.source) ? endpoints.start : edge.sourcePoint,
        targetPoint: isBusNode(endpoints.target) ? endpoints.end : edge.targetPoint
      };
      const safePreviewPoints = repairInteractiveConnectionRoute(previewNodes, previewEdge, previewPoints, canvasBounds);
      return [{
        edgeId: edge.id,
        path: pointsToPreviewPath(safePreviewPoints),
        color
      }];
    });
    return [...edgePreviewRoutes, ...routableLinePreviewRoutes];
  };
}

export function createBuildLightweightNodeDragPreviewRouteMarkup(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point, scopedPreviewEdges?: Edge[]) => {
  const { buildLightweightNodeDragPreviewRoutes, escapeXml, isMultiNodeMoveState, singleNodeDragPreviewEdges } = __appScope;
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, delta)
    );
    return buildLightweightNodeDragPreviewRoutes(dragState, delta, previewEdges)
      .map((route: NodeDragPreviewRoute) => `<path class="connection-line drag-preview" data-drag-preview-edge-id="${escapeXml(route.edgeId)}" d="${escapeXml(route.path)}" style="--connection-color:${escapeXml(route.color)}"/>`)
      .join("");
  };
}

export function createSyncImperativeNodeDragPreviewPaths(__appScope: SelectionDragScope) {
  return (edgePreview: SVGGElement, routes: NodeDragPreviewRoute[]) => {
  const { imperativeNodeDragEdgePreviewPathRefs } = __appScope;
    const pathRefs = imperativeNodeDragEdgePreviewPathRefs.current;
    if (routes.length === 0) {
      for (const path of pathRefs.values()) {
        path.remove();
      }
      pathRefs.clear();
      edgePreview.style.display = "none";
      return;
    }
    const activeEdgeIds = new Set<string>();
    for (const route of routes) {
      activeEdgeIds.add(route.edgeId);
      let path = pathRefs.get(route.edgeId);
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connection-line drag-preview");
        path.setAttribute("data-drag-preview-edge-id", route.edgeId);
        pathRefs.set(route.edgeId, path);
        edgePreview.appendChild(path);
      } else if (path.parentNode !== edgePreview) {
        edgePreview.appendChild(path);
      }
      if (path.getAttribute("d") !== route.path) {
        path.setAttribute("d", route.path);
      }
      if (path.style.getPropertyValue("--connection-color") !== route.color) {
        path.style.setProperty("--connection-color", route.color);
      }
    }
    for (const [edgeId, path] of pathRefs) {
      if (activeEdgeIds.has(edgeId)) {
        continue;
      }
      path.remove();
      pathRefs.delete(edgeId);
    }
    edgePreview.style.display = routes.length > 0 ? "" : "none";
  };
}

export function createUpdateNodeDragLightweightEdgePreview(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, previewDelta: Point, scopedPreviewEdges?: Edge[]) => {
  const { buildLightweightNodeDragPreviewRoutes, imperativeNodeDragEdgePreviewKeyRef, imperativeSingleNodeDragEdgePreviewRef, isMultiNodeMoveState, singleNodeDragPreviewEdges, singleNodeDragPreviewKey, syncImperativeNodeDragPreviewPaths } = __appScope;
    const edgePreview = imperativeSingleNodeDragEdgePreviewRef.current;
    if (!edgePreview) {
      return;
    }
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, previewDelta)
    );
    const roundedPreviewDelta = { x: Math.round(previewDelta.x), y: Math.round(previewDelta.y) };
    const previewKey = isMultiNodeMoveState(dragState)
      ? `multi:${roundedPreviewDelta.x},${roundedPreviewDelta.y}:${previewEdges.length}:${previewEdges[0]?.id ?? ""}:${previewEdges[previewEdges.length - 1]?.id ?? ""}`
      : singleNodeDragPreviewKey(dragState, roundedPreviewDelta, previewEdges);
    if (imperativeNodeDragEdgePreviewKeyRef.current === previewKey) {
      if (previewKey) {
        return;
      }
    }
    const routes = buildLightweightNodeDragPreviewRoutes(dragState, roundedPreviewDelta, previewEdges);
    syncImperativeNodeDragPreviewPaths(edgePreview, routes);
    imperativeNodeDragEdgePreviewKeyRef.current = previewKey;
  };
}

export function createSingleNodeDragInteractionNodes(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point, scopedSnapEdges?: Edge[]) => {
  const { CONNECT_TERMINAL_SNAP_TOLERANCE, getNodeScaleX, getNodeScaleY, isMultiNodeMoveState, nodeById, nodeIntersectsRenderViewport, queryNodeSpatialIndex, singleNodeDragPreviewNodeFor, singleNodeDragSnapEdges, visibleNodeIdSet, visibleNodeSpatialIndex } = __appScope;
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return [];
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const dragCache = dragState.singleNodeDragCache;
    const movedNodeIds = dragCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    const snapEdges = scopedSnapEdges ?? singleNodeDragSnapEdges(dragState, delta);
    let bounds: RenderViewportBounds | null = null;
    const includeBox = (box: RenderViewportBounds) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, box.left),
            right: Math.max(bounds.right, box.right),
            top: Math.min(bounds.top, box.top),
            bottom: Math.max(bounds.bottom, box.bottom)
          }
        : { ...box };
    };
    const includeNode = (node: ModelNode | undefined) => {
      if (!node) {
        return;
      }
      const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
      includeBox({
        left: node.position.x - halfDiagonal,
        right: node.position.x + halfDiagonal,
        top: node.position.y - halfDiagonal,
        bottom: node.position.y + halfDiagonal
      });
    };
    for (const nodeId of dragState.nodeIds) {
      includeNode(nodeById.get(nodeId));
      includeNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    if (!bounds) {
      return [];
    }
    const finalBounds = bounds as RenderViewportBounds;
    const queryBounds = {
      left: finalBounds.left - padding,
      right: finalBounds.right + padding,
      top: finalBounds.top - padding,
      bottom: finalBounds.bottom + padding
    };
    const candidatesById = new Map<string, ModelNode>();
    const addNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id) && nodeIntersectsRenderViewport(node, queryBounds)) {
        candidatesById.set(node.id, node);
      }
    };
    for (const nodeId of dragState.nodeIds) {
      addNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, queryBounds)) {
      addNode(movedNodeIds.has(node.id) ? singleNodeDragPreviewNodeFor(dragState, node.id, delta) : node);
    }
    return Array.from(candidatesById.values());
  };
}

export function createMultiNodeDragInteractionNodes(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point) => {
  const { CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT, CONNECT_TERMINAL_SNAP_TOLERANCE, dragMovedNodeIdSet, getNodeScaleX, getNodeScaleY, isMultiNodeMoveState, nodeIntersectsRenderViewport, queryNodeSpatialIndex, singleNodeDragPreviewNodeFor, visibleNodeIdSet, visibleNodeSpatialIndex } = __appScope;
    if (!isMultiNodeMoveState(dragState)) {
      return [];
    }
    if (dragState.wholeLayerMove) {
      return [];
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    if (movedNodeIds.size === 0) {
      return [];
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const snapEdges = dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [];
    const snapMovedNodeIds = new Set<string>();
    if (movedNodeIds.size <= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
      for (const nodeId of dragState.nodeIds) {
        if (movedNodeIds.has(nodeId)) {
          snapMovedNodeIds.add(nodeId);
        }
      }
    } else {
      for (const edge of snapEdges) {
        if (movedNodeIds.has(edge.sourceId)) {
          snapMovedNodeIds.add(edge.sourceId);
        }
        if (movedNodeIds.has(edge.targetId)) {
          snapMovedNodeIds.add(edge.targetId);
        }
        if (snapMovedNodeIds.size >= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
          break;
        }
      }
      for (const nodeId of dragState.nodeIds) {
        if (snapMovedNodeIds.size >= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
          break;
        }
        if (movedNodeIds.has(nodeId)) {
          snapMovedNodeIds.add(nodeId);
        }
      }
    }
    if (snapMovedNodeIds.size === 0) {
      return [];
    }
    let bounds: RenderViewportBounds | null = null;
    const includeBox = (box: RenderViewportBounds) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, box.left),
            right: Math.max(bounds.right, box.right),
            top: Math.min(bounds.top, box.top),
            bottom: Math.max(bounds.bottom, box.bottom)
          }
        : { ...box };
    };
    const includeNode = (node: ModelNode | undefined) => {
      if (!node) {
        return;
      }
      const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
      includeBox({
        left: node.position.x - halfDiagonal,
        right: node.position.x + halfDiagonal,
        top: node.position.y - halfDiagonal,
        bottom: node.position.y + halfDiagonal
      });
    };
    for (const nodeId of snapMovedNodeIds) {
      includeNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    if (!bounds) {
      return [];
    }
    const finalBounds = bounds as RenderViewportBounds;
    const queryBounds = {
      left: finalBounds.left - padding,
      right: finalBounds.right + padding,
      top: finalBounds.top - padding,
      bottom: finalBounds.bottom + padding
    };
    const candidatesById = new Map<string, ModelNode>();
    const addNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id) && nodeIntersectsRenderViewport(node, queryBounds)) {
        candidatesById.set(node.id, node);
      }
    };
    for (const nodeId of snapMovedNodeIds) {
      addNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, queryBounds)) {
      addNode(movedNodeIds.has(node.id) ? singleNodeDragPreviewNodeFor(dragState, node.id, delta) : node);
    }
    return Array.from(candidatesById.values());
  };
}

export function createUpdateImperativeNodeDragDropHint(__appScope: SelectionDragScope) {
  return (snapTarget: NodeTerminalSnapTarget | null) => {
  const { colorPalette, getBusTerminalType, imperativeNodeDragDropHintRef, isBusNode, nodeById, terminalColor } = __appScope;
    const dropHint = imperativeNodeDragDropHintRef.current;
    if (!dropHint) {
      return;
    }
    if (!snapTarget) {
      dropHint.style.display = "none";
      return;
    }
    const targetNode = nodeById.get(snapTarget.targetNodeId);
    const terminalType = targetNode && isBusNode(targetNode)
      ? getBusTerminalType(targetNode)
      : targetNode?.terminals.find((terminal: Terminal) => terminal.id === snapTarget.targetTerminalId)?.type;
    if (terminalType) {
      dropHint.style.setProperty("--connection-color", terminalColor(terminalType, colorPalette));
    }
    dropHint.setAttribute("transform", `translate(${Math.round(snapTarget.point.x)} ${Math.round(snapTarget.point.y)})`);
    dropHint.style.display = "";
  };
}

export function createFindSingleNodeDragSnapTargetAtDelta(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point, scopedSnapEdges?: Edge[]) => {
  const { findNodeBusSnapTarget, findNodeTerminalSnapTarget, isMultiNodeMoveState, singleNodeDragInteractionNodes } = __appScope;
    if (isMultiNodeMoveState(dragState)) {
      return null;
    }
    const candidates = singleNodeDragInteractionNodes(dragState, delta, scopedSnapEdges ?? []);
    const movedNodeIds = dragState.singleNodeDragCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    return findNodeTerminalSnapTarget(candidates, movedNodeIds) ?? findNodeBusSnapTarget(candidates, movedNodeIds);
  };
}

export function createFindMultiNodeDragSnapTargetAtDelta(__appScope: SelectionDragScope) {
  return (dragState: DraggingState, delta: Point) => {
  const { dragMovedNodeIdSet, findNodeBusSnapTarget, findNodeTerminalSnapTarget, isMultiNodeMoveState, multiNodeDragInteractionNodes } = __appScope;
    if (!isMultiNodeMoveState(dragState)) {
      return null;
    }
    if (dragState.wholeLayerMove || dragState.nodeIds.length > 20) {
      return null;
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    const candidates = multiNodeDragInteractionNodes(dragState, delta);
    return findNodeTerminalSnapTarget(candidates, movedNodeIds) ?? findNodeBusSnapTarget(candidates, movedNodeIds);
  };
}
