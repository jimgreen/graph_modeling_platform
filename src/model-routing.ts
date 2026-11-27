/** 模型拓扑路由与正交寻路引擎主模块（统一门面重导出 src/routing/* 子模块）。 */

import { cloneEdgeEditablePoints, isTwoWindingTransformerKind } from "./model.ts";
import { clampNumber } from "./canvasViewport.ts";
import { degreesToRadians } from "./formatUtils.ts";
import { normalizeProjectMeasurements } from "./measurements.ts";
import type {
  AlignDirection,
  AlignMode,
  CanvasBounds,
  DeviceTemplate,
  Edge,
  ElementTreeChildItem,
  ElementTreeDeviceGroup,
  ElementTreeGroup,
  ElementTreeItem,
  ModelGroup,
  ModelLayer,
  ModelNode,
  PersistedSavedSchemeRecord,
  Point,
  ProjectFile,
  RoutedEdge,
  SavedProjectRecord,
  SavedSchemeRecord,
  Terminal,
  TerminalType,
  Topology,
  TopologyValidationError,
} from "./model.ts";
import {
  DEFAULT_INITIAL_TERMINAL_VBASE,
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEVICE_LIBRARY,
  E_NODE_REFERENCE_COLUMNS,
  ROUTABLE_LINE_POINTS_PARAM,
  baseDeviceKind,
  buildContainerDeviceParameterViews,
  containerRelationCounterKey,
  containerRelationNameKey,
  containerRelationParamKey,
  deviceParamValue,
  getDeviceStrokeWidth,
  isContainerParams,
  modelAssociationModelTypeForKind,
  isRoutableLineDeviceKind,
  isStaticNode,
  isWireLikeRouteDeviceKind,
  liveContainerIds,
  makeId,
  normalizeSwitchStatusForE,
  normalizeThreeWindingTransformerParams,
  normalizeTwoWindingTransformerParams,
  normalizeVoltageBaseInput,
  parseContainerRelationField,
  terminalVoltageBaseNumber,
  topologyNodeNumberForEField,
  validateNodeEnumParameters,
  ELEMENT_TREE_COMPONENT_LIBRARY_LABELS,
  getRatedCapacityDefaultForKind,
} from "./model.ts";
import {
  E_SECTION_COLUMNS,
  hasVisibleThreeWindingNeutralTerminal,
  inferESection,
  isThreeWindingTransformer,
  isZeroNumericText,
  shouldAssignVoltageSetpointDefault,
} from "./model-eexport.ts";
import { clampPointToBounds, getNodeScaleX, getNodeScaleY, type GeometryBounds } from "./model-canvas-ops.ts";
import { normalizeDeviceParameterEnglishName } from "../shared/deviceParameterChineseNames.mjs";

import {
  type EdgeSide,
  type ManualRouteDisplayOptions,
  type RoutableLineDeviceEndpointRef,
  type RoutableLineDeviceEndpointRefs,
  type RoutableLineDeviceRouteUpdateOptions,
  type RouteBlockerBox,
  type Segment,
  ROUTABLE_LINE_ENDPOINT_BUS_INFER_TOLERANCE,
  ROUTABLE_LINE_ENDPOINT_TERMINAL_INFER_TOLERANCE,
  ROUTE_ENDPOINT_STUB_LENGTH,
  applyRoutableLineEndpointRefs,
  bodyVisualBoxForNode,
  busConnectableHalfWidth,
  candidateRemovesManualOuterDetour,
  closestPointOnTankBody,
  commitManualPointsFromRoute,
  createFloatingEndpointNode,
  edgeEndpointStoredPoint,
  edgeTerminalId,
  edgeWithCommitManualPoints,
  edgeWithProjectedMissingBusEndpointPoints,
  edgeWithoutManualPoints,
  getBusTerminalType,
  getEdgeEndpointPoint,
  getOverlappingTerminalGroups,
  getRouteBlockingCandidateNodesFromBoxes,
  getRouteBlockingCandidates,
  getSegments,
  getTerminal,
  getTerminalBusContactGroups,
  getTerminalPoint,
  isBoundaryBusNode,
  isBusNode,
  mergeRouteBlockerBoxes,
  nodeLabelVisualBox,
  nodeLocalToPoint,
  normalizeNodeTerminalsByTemplate,
  orthogonalizeRouteKeepingCollinear,
  parseRoutableLineDevicePoints,
  pointToNodeLocal,
  pointsToOrthogonalPath,
  prepareConnectionEdgeForCommit,
  preserveDraggedRouteShape,
  projectPointToBusCenterline,
  projectPointToBusCenterlineWithInset,
  projectPointToNodeBoundary,
  refreshCrossingArcPaths,
  routableLineBlockerNodeIdsForMovedInterference,
  routableLineDeviceCanvasPoints,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  routableLineDeviceRouteBox,
  routableLineEndpointPointFromRef,
  routableLineStoredPathSafety,
  routableLineStoredPathSafetyForRouteUpdate,
  routeBendCount,
  routeEdgesForRendering,
  routeEdgesForStoredRendering,
  routeEndpointNormal,
  routeEndpointSegmentsAreValid,
  routeHasImmediateReversal,
  routeIsSafeForCommit,
  routeManhattanLength,
  routeOrthogonalEdge,
  routeRoutableLineDevice,
  routeSegmentMatchesNormal,
  samePoint,
  samePointList,
  segmentIntersectsNodeBody,
  segmentIntersectsRouteBlocker,
  segmentManhattanLength,
  setRoutableLineDeviceCanvasPoints,
  setRoutableLineDeviceEndpoints,
  setRoutableLineDeviceEndpointsPreservingRoute,
  simplifyRoutePreservingEndpointStubs,
  synchronizeBusTerminalsWithEdges,
  usesBoundaryBusAnchors,
  visualHalfExtentsForNode,
} from "./routing/routeGeometryPrimitives.ts";
import {
  type TopologyConnectivity,
  type ValidateTopologyOptions,
  collectElectricalIslandVoltageGroups,
  defaultModelLayer,
  duplicateDeviceIdentityErrors,
  flattenSavedSchemes,
  getTerminalVoltageLevel,
  isElectricalTerminalType,
  isTransformerNodeForTopology,
  modelTypeVoltageRangeFor,
  savedSchemeChildren,
  topologyValidationInput,
  validateVoltageSetpointDeviations,
} from "./routing/electricalTopology.ts";

export * from "./model-canvas-ops.ts";
export * from "./routing/routeGeometryPrimitives.ts";
export * from "./routing/electricalTopology.ts";

function pointDistance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function routableLineBusEndpointSnapPointWithinTolerance(
  bus: ModelNode,
  point: Point,
  tolerance = ROUTABLE_LINE_ENDPOINT_BUS_INFER_TOLERANCE
): Point | undefined {
  if (!isBusNode(bus)) {
    return undefined;
  }
  if (isBoundaryBusNode(bus)) {
    const projected = projectPointToNodeBoundary(bus, point);
    return pointDistance(projected, point) <= tolerance ? projected : undefined;
  }
  const local = pointToNodeLocal(bus, point);
  const limit = busConnectableHalfWidth((bus.size.width * Math.abs(getNodeScaleX(bus))) / 2);
  const halfHeight = Math.max(4, (bus.size.height * Math.abs(getNodeScaleY(bus))) / 2);
  if (
    local.x < -limit - tolerance ||
    local.x > limit + tolerance ||
    Math.abs(local.y) > halfHeight + tolerance
  ) {
    return undefined;
  }
  return projectPointToBusCenterline(bus, point);
}

function inferRoutableLineEndpointRefForPoint(
  node: ModelNode,
  endpointIndex: 0 | 1,
  point: Point | undefined,
  referenceNodes: readonly ModelNode[]
): RoutableLineDeviceEndpointRef | undefined {
  const endpointTerminal = node.terminals[endpointIndex];
  if (!endpointTerminal || !point) {
    return undefined;
  }
  let bestRef: RoutableLineDeviceEndpointRef | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  const accept = (candidate: ModelNode, terminalId: string, snappedPoint: Point, distance: number) => {
    if (
      distance > ROUTABLE_LINE_ENDPOINT_TERMINAL_INFER_TOLERANCE &&
      !isBusNode(candidate)
    ) {
      return;
    }
    if (distance >= bestDistance) {
      return;
    }
    bestRef = routableLineDeviceEndpointRefForNode(candidate, terminalId, snappedPoint);
    bestDistance = distance;
  };
  for (const candidate of referenceNodes) {
    if (candidate.id === node.id || isRoutableLineDeviceKind(candidate.kind)) {
      continue;
    }
    if (isBusNode(candidate)) {
      if (getBusTerminalType(candidate) !== endpointTerminal.type) {
        continue;
      }
      const snappedPoint = routableLineBusEndpointSnapPointWithinTolerance(candidate, point);
      if (!snappedPoint) {
        continue;
      }
      const terminalId =
        candidate.terminals.find((terminal) => terminal.type === endpointTerminal.type)?.id ??
        candidate.terminals[0]?.id ??
        "t1";
      accept(candidate, terminalId, snappedPoint, pointDistance(point, snappedPoint));
      continue;
    }
    for (const terminal of candidate.terminals) {
      if (terminal.type !== endpointTerminal.type) {
        continue;
      }
      const terminalPoint = getTerminalPoint(candidate, terminal.id);
      const distance = pointDistance(point, terminalPoint);
      if (distance <= ROUTABLE_LINE_ENDPOINT_TERMINAL_INFER_TOLERANCE) {
        accept(candidate, terminal.id, terminalPoint, distance);
      }
    }
  }
  return bestRef;
}

export function inferMissingRoutableLineDeviceEndpointRefs(
  node: ModelNode,
  referenceNodes: readonly ModelNode[]
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const refs = routableLineDeviceEndpointRefs(node);
  if (refs.source && refs.target) {
    return node;
  }
  const points = routableLineDeviceCanvasPoints(node);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const inferredSource = refs.source
    ? undefined
    : inferRoutableLineEndpointRefForPoint(node, 0, firstPoint, referenceNodes);
  const inferredTarget = refs.target
    ? undefined
    : inferRoutableLineEndpointRefForPoint(node, 1, lastPoint, referenceNodes);
  if (!inferredSource && !inferredTarget) {
    return node;
  }
  const endpointRefs: RoutableLineDeviceEndpointRefs = {};
  if (inferredSource) {
    endpointRefs.source = inferredSource;
  }
  if (inferredTarget) {
    endpointRefs.target = inferredTarget;
  }
  return {
    ...node,
    params: applyRoutableLineEndpointRefs(node.params, endpointRefs)
  };
}

export function syncRoutableLineDeviceEndpointsToRefs(
  node: ModelNode,
  nodes: ModelNode[],
  nodeById: Map<string, ModelNode> = new Map(nodes.map((item) => [item.id, item])),
  referenceNodes: readonly ModelNode[] = nodes
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const nodeWithRefs = inferMissingRoutableLineDeviceEndpointRefs(node, referenceNodes);
  const refs = routableLineDeviceEndpointRefs(nodeWithRefs);
  if (!refs.source && !refs.target) {
    return nodeWithRefs;
  }
  const currentPoints = routableLineDeviceCanvasPoints(nodeWithRefs);
  const currentStart = currentPoints[0];
  const currentEnd = currentPoints[currentPoints.length - 1];
  if (!currentStart || !currentEnd) {
    return nodeWithRefs;
  }
  const nextStart = routableLineEndpointPointFromRef(refs.source, nodeById, currentStart) ?? currentStart;
  const nextEnd = routableLineEndpointPointFromRef(refs.target, nodeById, currentEnd) ?? currentEnd;
  if (nextStart.x === currentStart.x && nextStart.y === currentStart.y && nextEnd.x === currentEnd.x && nextEnd.y === currentEnd.y) {
    return nodeWithRefs;
  }
  return setRoutableLineDeviceEndpointsPreservingRoute(nodeWithRefs, nextStart, nextEnd, refs, nodeById);
}

export function realignRoutableLineDeviceBusEndpointPoints(
  node: ModelNode,
  nodes: ModelNode[]
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const nodeWithRefs = inferMissingRoutableLineDeviceEndpointRefs(node, nodes);
  const refs = routableLineDeviceEndpointRefs(nodeWithRefs);
  if (!refs.source && !refs.target) {
    return nodeWithRefs;
  }
  const nodeById = new Map(nodes.map((item) => [item.id, item]));
  const currentPoints = routableLineDeviceCanvasPoints(nodeWithRefs);
  const currentStart = currentPoints[0];
  const currentEnd = currentPoints[currentPoints.length - 1];
  if (!currentStart || !currentEnd) {
    return nodeWithRefs;
  }
  const sourceNode = refs.source ? nodeById.get(refs.source.nodeId) : undefined;
  const targetNode = refs.target ? nodeById.get(refs.target.nodeId) : undefined;
  let nextStart = routableLineEndpointPointFromRef(refs.source, nodeById, currentStart) ?? currentStart;
  let nextEnd = routableLineEndpointPointFromRef(refs.target, nodeById, currentEnd) ?? currentEnd;
  const nextRefs: RoutableLineDeviceEndpointRefs = { ...refs };

  if (refs.source && sourceNode && isBusNode(sourceNode) && targetNode && !isBusNode(targetNode)) {
    const targetNormal = routeEndpointNormal(targetNode, nextEnd, nextStart, refs.target?.terminalId);
    nextStart = alignBusEndpointPointToRouteSegmentExtension(sourceNode, currentPoints, "source") ?? projectPointToBusCenterline(sourceNode, {
      x: Math.round(nextEnd.x + targetNormal.x * ROUTE_ENDPOINT_STUB_LENGTH),
      y: Math.round(nextEnd.y + targetNormal.y * ROUTE_ENDPOINT_STUB_LENGTH)
    });
    nextRefs.source = routableLineDeviceEndpointRefForNode(sourceNode, refs.source.terminalId, nextStart);
  }
  if (refs.target && targetNode && isBusNode(targetNode) && sourceNode && !isBusNode(sourceNode)) {
    const sourceNormal = routeEndpointNormal(sourceNode, nextStart, nextEnd, refs.source?.terminalId);
    nextEnd = alignBusEndpointPointToRouteSegmentExtension(targetNode, currentPoints, "target") ?? projectPointToBusCenterline(targetNode, {
      x: Math.round(nextStart.x + sourceNormal.x * ROUTE_ENDPOINT_STUB_LENGTH),
      y: Math.round(nextStart.y + sourceNormal.y * ROUTE_ENDPOINT_STUB_LENGTH)
    });
    nextRefs.target = routableLineDeviceEndpointRefForNode(targetNode, refs.target.terminalId, nextEnd);
  }

  const startChanged = nextStart.x !== currentStart.x || nextStart.y !== currentStart.y;
  const endChanged = nextEnd.x !== currentEnd.x || nextEnd.y !== currentEnd.y;
  const refsChanged =
    nextRefs.source?.localPoint?.x !== refs.source?.localPoint?.x ||
    nextRefs.source?.localPoint?.y !== refs.source?.localPoint?.y ||
    nextRefs.target?.localPoint?.x !== refs.target?.localPoint?.x ||
    nextRefs.target?.localPoint?.y !== refs.target?.localPoint?.y;
  return startChanged || endChanged || refsChanged
    ? setRoutableLineDeviceEndpoints(nodeWithRefs, nextStart, nextEnd, nextRefs)
    : nodeWithRefs;
}

function routableLineDeviceTopologyEdges(nodes: ModelNode[]): Edge[] {
  const edges: Edge[] = [];
  for (const node of nodes) {
    if (!isRoutableLineDeviceKind(node.kind)) {
      continue;
    }
    const nodeWithRefs = inferMissingRoutableLineDeviceEndpointRefs(node, nodes);
    const refs = routableLineDeviceEndpointRefs(nodeWithRefs);
    const sourceTerminal = node.terminals[0];
    const targetTerminal = node.terminals[node.terminals.length - 1];
    if (refs.source && sourceTerminal) {
      edges.push({
        id: `${node.id}:routable-source`,
        sourceId: refs.source.nodeId,
        targetId: node.id,
        sourceTerminalId: refs.source.terminalId,
        targetTerminalId: sourceTerminal.id
      });
    }
    if (refs.target && targetTerminal) {
      edges.push({
        id: `${node.id}:routable-target`,
        sourceId: node.id,
        targetId: refs.target.nodeId,
        sourceTerminalId: targetTerminal.id,
        targetTerminalId: refs.target.terminalId
      });
    }
  }
  return edges;
}

export function rebuildRoutableLineDeviceRouteUpdates(
  nodes: ModelNode[],
  lineNodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  referenceNodes: readonly ModelNode[] = nodes,
  options: RoutableLineDeviceRouteUpdateOptions = {}
): ModelNode[] {
  const requestedIds = new Set(lineNodeIds);
  if (requestedIds.size === 0) {
    return [];
  }
  const updates: ModelNode[] = [];
  const nodeById = new Map(nodes.map((item) => [item.id, item]));
  const movedNodeIds = options.movedNodeIds ? new Set(options.movedNodeIds) : undefined;
  const routeBlockingCandidates = movedNodeIds?.size
    ? undefined
    : getRouteBlockingCandidates(nodes.filter((candidate) => !isWireLikeRouteDeviceKind(candidate.kind)));
  for (const node of nodes) {
    if (!requestedIds.has(node.id) || !isRoutableLineDeviceKind(node.kind)) {
      continue;
    }
    const syncedNode = syncRoutableLineDeviceEndpointsToRefs(node, nodes, nodeById, referenceNodes);
    const routingNodes = syncedNode === node ? nodes : nodes.map((item) => (item.id === syncedNode.id ? syncedNode : item));
    const blockerNodeIds = movedNodeIds
      ? routableLineBlockerNodeIdsForMovedInterference(syncedNode, routingNodes, movedNodeIds)
      : undefined;
    const syncedRoutePoints = routableLineDeviceCanvasPoints(syncedNode);
    const pathSafety = routeBlockingCandidates
      ? routableLineStoredPathSafety(syncedNode, routingNodes, {
          nodeById,
          routeBlockingCandidates,
          checkEndpointNormals: true
        })
      : routableLineStoredPathSafetyForRouteUpdate(syncedNode, routingNodes, blockerNodeIds);
    const rerouteBlockerNodeIds = blockerNodeIds ?? pathSafety.blockerNodeIds;
    if (syncedRoutePoints.length > 2 && !pathSafety.unsafe) {
      if (syncedNode !== node) {
        updates.push(syncedNode);
      }
      continue;
    }
    const nextNode = pathSafety.unsafe
      ? routeRoutableLineDevice(
          syncedNode,
          routingNodes,
          bounds,
          rerouteBlockerNodeIds ? { blockerNodeIds: rerouteBlockerNodeIds } : undefined
        )
      : syncedNode;
    if (nextNode !== node) {
      updates.push(nextNode);
    }
  }
  return updates;
}

export function redrawRoutableLineDeviceRoutes(
  nodes: ModelNode[],
  lineNodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  referenceNodes: readonly ModelNode[] = nodes
): ModelNode[] {
  const requestedIds = new Set(lineNodeIds);
  if (requestedIds.size === 0) {
    return [];
  }
  const updates: ModelNode[] = [];
  const nodeById = new Map(nodes.map((item) => [item.id, item]));
  for (const node of nodes) {
    if (!requestedIds.has(node.id) || !isRoutableLineDeviceKind(node.kind)) {
      continue;
    }
    const syncedNode = syncRoutableLineDeviceEndpointsToRefs(node, nodes, nodeById, referenceNodes);
    const syncedRoutingNodes = syncedNode === node
      ? nodes
      : nodes.map((item) => (item.id === syncedNode.id ? syncedNode : item));
    const syncedRoutePoints = routableLineDeviceCanvasPoints(syncedNode);
    const nodeForRedraw = syncedRoutePoints.length > 2
      ? realignRoutableLineDeviceBusEndpointPoints(syncedNode, syncedRoutingNodes)
      : syncedNode;
    const routePoints = routableLineDeviceCanvasPoints(nodeForRedraw);
    const start = routePoints[0];
    const end = routePoints[routePoints.length - 1];
    if (!start || !end) {
      continue;
    }
    const endpointRefs = routableLineDeviceEndpointRefs(nodeForRedraw);
    const baseNode = setRoutableLineDeviceEndpoints(nodeForRedraw, start, end, endpointRefs);
    const routingNodes = nodes.map((item) => (item.id === node.id ? baseNode : item));
    const nextNode = routeRoutableLineDevice(baseNode, routingNodes, bounds);
    if (nextNode !== node) {
      updates.push(nextNode);
    }
  }
  return updates;
}

export function repairUnsafeRoutableLineDeviceRoutes(nodes: ModelNode[], bounds?: CanvasBounds): ModelNode[] {
  let nextNodes = nodes;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routeBlockingCandidates = getRouteBlockingCandidates(
    nodes.filter((candidate) => !isWireLikeRouteDeviceKind(candidate.kind))
  );
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nextNodes[index];
    if (!node || !isRoutableLineDeviceKind(node.kind)) {
      continue;
    }
    const syncedNode = syncRoutableLineDeviceEndpointsToRefs(node, nextNodes, nodeById);
    if (syncedNode !== node) {
      if (nextNodes === nodes) {
        nextNodes = nodes.slice();
      }
      nextNodes[index] = syncedNode;
      nodeById.set(syncedNode.id, syncedNode);
    }
    const pathSafety = routableLineStoredPathSafety(syncedNode, nextNodes, {
      nodeById,
      routeBlockingCandidates
    });
    if (!pathSafety.unsafe) {
      continue;
    }
    const routedNode = routeRoutableLineDevice(
      syncedNode,
      nextNodes,
      bounds,
      pathSafety.blockerNodeIds ? { blockerNodeIds: pathSafety.blockerNodeIds } : undefined
    );
    if (routedNode !== syncedNode) {
      if (nextNodes === nodes) {
        nextNodes = nodes.slice();
      }
      nextNodes[index] = routedNode;
      nodeById.set(routedNode.id, routedNode);
    }
  }
  return nextNodes;
}

export function boundaryBusInternalConnectorSegment(node: ModelNode, endpointPoint: Point): { from: Point; to: Point } | null {
  if (!isBoundaryBusNode(node)) {
    return null;
  }
  const from = projectPointToNodeBoundary(node, endpointPoint);
  const localFrom = pointToNodeLocal(node, from);
  const localTo = closestPointOnTankBody(localFrom, node);
  if (Math.hypot(localTo.x - localFrom.x, localTo.y - localFrom.y) < 0.5) {
    return null;
  }
  return {
    from,
    to: nodeLocalToPoint(node, localTo)
  };
}

export function boundaryBusInternalConnectorStrokeWidth(node: ModelNode, segment: { from: Point; to: Point }): number {
  const localFrom = pointToNodeLocal(node, segment.from);
  const localTo = pointToNodeLocal(node, segment.to);
  const dx = Math.abs(localTo.x - localFrom.x);
  const dy = Math.abs(localTo.y - localFrom.y);
  const scaleX = Math.abs(getNodeScaleX(node) || 1);
  const scaleY = Math.abs(getNodeScaleY(node) || 1);
  const crossAxisScale = dx > dy * 1.5 ? scaleY : dy > dx * 1.5 ? scaleX : (scaleX + scaleY) / 2;
  return Math.round(getDeviceStrokeWidth(node) * crossAxisScale * 1000) / 1000;
}

/** 母线中心线投影（不扣两端禁绘区），供导入等按母线实体范围判定的场景使用。 */
export function projectPointToBusCenterlineUninset(node: ModelNode, point: Point): Point {
  return projectPointToBusCenterlineWithInset(node, point, 0);
}

export function projectPointToBusCenterlineIfInRange(node: ModelNode, point: Point): Point | null {
  if (!isBusNode(node)) {
    return null;
  }
  if (isBoundaryBusNode(node)) {
    return projectPointToNodeBoundary(node, point);
  }
  const local = pointToNodeLocal(node, point);
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  if (local.x < -halfWidth || local.x > halfWidth) {
    return null;
  }
  return projectPointToBusCenterline(node, point);
}

export function alignBusEndpointPointToRouteSegmentExtension(
  busNode: ModelNode,
  routePoints: Point[],
  endpoint: "source" | "target"
): Point | null {
  // 审查 T01-P0-2 语义澄清：本函数并非"几何最近投影"，而是
  // 「沿路由方向（source 从起点、target 从终点）找到的第一个不同于当前端点位置的投影」——
  // 方向性遍历保证确定性；若所有投影都等于当前位置则回退第一个有效投影。
  // 修改为真·最近比较会改变既有吸附行为，需先确认产品预期。
  if (!isBusNode(busNode) || routePoints.length < 2) {
    return null;
  }
  const endpointPoint = endpoint === "source" ? routePoints[0] : routePoints[routePoints.length - 1];
  if (!endpointPoint) {
    return null;
  }
  const currentEndpointPoint = projectPointToBusCenterline(busNode, endpointPoint);
  const segmentIndexes =
    endpoint === "source"
      ? Array.from({ length: routePoints.length - 1 }, (_, index) => index)
      : Array.from({ length: routePoints.length - 1 }, (_, index) => routePoints.length - 2 - index);
  let nearestProjection: Point | null = null;
  for (const segmentIndex of segmentIndexes) {
    const segmentStart = routePoints[segmentIndex];
    const segmentEnd = routePoints[segmentIndex + 1];
    if (!segmentStart || !segmentEnd || (segmentStart.x === segmentEnd.x && segmentStart.y === segmentEnd.y)) {
      continue;
    }
    const projection = projectBusEndpointPointToRouteSegmentExtension(busNode, segmentStart, segmentEnd, endpointPoint);
    if (!projection) {
      continue;
    }
    if (!nearestProjection) {
      nearestProjection = projection;
    }
    if (!samePoint(projection, currentEndpointPoint)) {
      return projection;
    }
  }
  return nearestProjection;
}

function projectBusEndpointPointToRouteSegmentExtension(
  busNode: ModelNode,
  segmentStart: Point,
  segmentEnd: Point,
  endpointPoint: Point
): Point | null {
  if (!usesBoundaryBusAnchors(busNode)) {
    const rotationRadians = degreesToRadians(busNode.rotation);
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    const limit = busConnectableHalfWidth((busNode.size.width * Math.abs(getNodeScaleX(busNode))) / 2);
    const distance =
      segmentStart.x === segmentEnd.x
        ? Math.abs(cos) > 1e-6
          ? (segmentStart.x - busNode.position.x) / cos
          : null
        : segmentStart.y === segmentEnd.y && Math.abs(sin) > 1e-6
          ? (segmentStart.y - busNode.position.y) / sin
          : null;
    if (distance !== null) {
      const clampedDistance = clampNumber(distance, -limit, limit);
      return {
        x: Math.round(busNode.position.x + clampedDistance * cos),
        y: Math.round(busNode.position.y + clampedDistance * sin)
      };
    }
  }
  const referencePoint =
    segmentStart.x === segmentEnd.x
      ? { x: segmentStart.x, y: endpointPoint.y }
      : segmentStart.y === segmentEnd.y
        ? { x: endpointPoint.x, y: segmentStart.y }
        : null;
  return referencePoint ? projectPointToBusCenterline(busNode, referencePoint) : null;
}

function getElementTreeTypeLabel(node: ModelNode, templateByKind: ReadonlyMap<string, DeviceTemplate>): string {
  return templateByKind.get(node.kind)?.label ?? node.kind;
}

// ELEMENT_TREE_COMPONENT_LIBRARY_LABELS 和 COMPONENT_LIBRARY_REVERSE_MAPPING 已从 model.ts 导入

function elementTreeComponentLibraryLabel(componentLibrary: string): string {
  const normalized = componentLibrary.trim();
  return ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[normalized] ?? normalized;
}

function edgeDisplayName(edge: Edge, nodeById: Map<string, ModelNode>): string {
  const sourceName = nodeById.get(edge.sourceId)?.name;
  const targetName = nodeById.get(edge.targetId)?.name;
  if (sourceName || targetName) {
    return `${sourceName ?? edge.sourceId} -> ${targetName ?? edge.targetId}`;
  }
  return `联络线 ${edge.id}`;
}

export function buildElementTree(
  nodes: ModelNode[],
  edges: Edge[],
  templates: readonly DeviceTemplate[] = DEVICE_LIBRARY,
  options: { includeContainerChildren?: boolean } = {}
): ElementTreeGroup[] {
  const groups: ElementTreeGroup[] = [];
  const groupByKey = new Map<string, ElementTreeGroup>();
  const deviceGroupByKey = new Map<string, ElementTreeDeviceGroup>();
  const templateByKind = new Map<string, DeviceTemplate>(templates.map((template) => [template.kind, template]));
  const includeContainerChildren = options.includeContainerChildren !== false;
  const appendDeviceItem = (
    typeKey: string,
    typeLabel: string,
    typeEnglishLabel: string | undefined,
    deviceKey: string,
    deviceLabel: string,
    deviceEnglishLabel: string | undefined,
    item: ElementTreeItem
  ) => {
    let group = groupByKey.get(typeKey);
    if (!group) {
      group = { typeKey, typeLabel, typeEnglishLabel, items: [], deviceGroups: [] };
      groupByKey.set(typeKey, group);
      groups.push(group);
    }
    let deviceGroup = deviceGroupByKey.get(deviceKey);
    if (!deviceGroup) {
      deviceGroup = { deviceKey, deviceLabel, deviceEnglishLabel, items: [] };
      deviceGroupByKey.set(deviceKey, deviceGroup);
      group.deviceGroups?.push(deviceGroup);
    }
    group.items.push(item);
    deviceGroup.items.push(item);
  };

  for (const node of nodes) {
    const deviceLabel = getElementTreeTypeLabel(node, templateByKind);
    const deviceEnglishLabel = node.kind;
    const typeEnglishLabel = inferESection(node.kind, node.params) || deviceEnglishLabel;
    const typeLabel = typeEnglishLabel ? elementTreeComponentLibraryLabel(typeEnglishLabel) : deviceLabel;
    const containerChildren = includeContainerChildren
      ? buildContainerDeviceParameterViews(node, templateByKind.get(node.kind))
          .filter((view) => view.kind === "associated")
          .map<ElementTreeChildItem>((view) => ({
            id: `${node.id}:${view.id}`,
            label: view.label,
            componentLibrary: view.componentLibrary ?? "",
            componentLibraryLabel: view.componentLibrary ? elementTreeComponentLibraryLabel(view.componentLibrary) : "",
            idx: view.rows.find((row) => row.key === "idx")?.value ?? "",
            name: view.rows.find((row) => row.key === "name")?.value ?? "",
            nameKey: view.relationKeys?.[0] ? containerRelationNameKey(view.relationKeys[0]) : "",
            relationKeys: view.relationKeys ?? [],
            terminalLabels: view.terminalLabels ?? view.rows.find((row) => row.key === "terminals")?.value ?? ""
          }))
      : [];
    const item: ElementTreeItem = {
      kind: "node",
      id: node.id,
      name: node.name || typeLabel,
      idx: node.params.idx ?? "",
      editableDevice: !isStaticNode(node)
    };
    if (containerChildren.length > 0) {
      item.children = containerChildren;
    }
    const typeKey = `component:${typeEnglishLabel}`;
    appendDeviceItem(
      typeKey,
      typeLabel,
      typeEnglishLabel,
      `${typeKey}:device:${deviceEnglishLabel}`,
      deviceLabel,
      deviceEnglishLabel,
      item
    );
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    appendDeviceItem("edge:connection", "联络线", "ConnectionLine", "edge:connection:device:connection", "联络线", "ConnectionLine", {
      kind: "edge",
      id: edge.id,
      name: edgeDisplayName(edge, nodeById)
    });
  }

  return groups;
}

export function getElementFocusPoint(
  target: Pick<ElementTreeItem, "kind" | "id">,
  nodes: ModelNode[],
  edges: Edge[]
): Point | null {
  if (target.kind === "node") {
    return nodes.find((node) => node.id === target.id)?.position ?? null;
  }
  const edge = edges.find((item) => item.id === target.id);
  if (!edge) {
    return null;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sourceNode = nodeById.get(edge.sourceId);
  const targetNode = nodeById.get(edge.targetId);
  const sourcePoint = sourceNode ? getEdgeEndpointPoint(sourceNode, edge.sourcePoint, edge.sourceTerminalId) : edge.sourcePoint;
  const targetPoint = targetNode ? getEdgeEndpointPoint(targetNode, edge.targetPoint, edge.targetTerminalId) : edge.targetPoint;
  const points = [sourcePoint, ...(edge.manualPoints ?? []), targetPoint].filter((point): point is Point => Boolean(point));
  if (points.length === 0) {
    return null;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
  };
}

export function canConnectTerminals(
  source: ModelNode,
  sourceTerminalId: string,
  target: ModelNode,
  targetTerminalId: string
): boolean {
  if (source.id === target.id) {
    return false;
  }
  const sourceTerminal = getTerminal(source, sourceTerminalId);
  const targetTerminal = getTerminal(target, targetTerminalId);
  // 两端都无端子：都是「连到设备本体」，判为可连。
  // 只有一端无端子：类型无从比较（取 .type 会抛），判为不可连。
  if (!sourceTerminal && !targetTerminal) {
    return true;
  }
  if (!sourceTerminal || !targetTerminal) {
    return false;
  }
  return sourceTerminal.type === targetTerminal.type;
}

function nodeLayoutBounds(node: ModelNode) {
  const { halfWidth, halfHeight } = visualHalfExtentsForNode(node);
  return {
    left: node.position.x - halfWidth,
    right: node.position.x + halfWidth,
    top: node.position.y - halfHeight,
    bottom: node.position.y + halfHeight,
    halfWidth,
    halfHeight
  };
}

export function alignNodes(nodes: ModelNode[], selectedIds: string[], direction: AlignMode): ModelNode[] {
  const selected = nodes.filter((node) => selectedIds.includes(node.id));
  if (selected.length < 2) {
    return nodes;
  }
  if (direction === "left" || direction === "right" || direction === "top" || direction === "bottom") {
    const selectedBounds = selected.map(nodeLayoutBounds);
    const alignedCoordinate =
      direction === "left"
        ? Math.min(...selectedBounds.map((bounds) => bounds.left))
        : direction === "right"
          ? Math.max(...selectedBounds.map((bounds) => bounds.right))
          : direction === "top"
            ? Math.min(...selectedBounds.map((bounds) => bounds.top))
            : Math.max(...selectedBounds.map((bounds) => bounds.bottom));

    return nodes.map((node) => {
      if (!selectedIds.includes(node.id)) {
        return node;
      }
      const bounds = nodeLayoutBounds(node);
      return {
        ...node,
        position:
          direction === "left"
            ? { ...node.position, x: Math.round(alignedCoordinate + bounds.halfWidth) }
            : direction === "right"
              ? { ...node.position, x: Math.round(alignedCoordinate - bounds.halfWidth) }
              : direction === "top"
                ? { ...node.position, y: Math.round(alignedCoordinate + bounds.halfHeight) }
                : { ...node.position, y: Math.round(alignedCoordinate - bounds.halfHeight) }
      };
    });
  }
  const average =
    selected.reduce((sum, node) => sum + (direction === "horizontal" ? node.position.y : node.position.x), 0) /
    selected.length;
  const alignedCoordinate = Math.round(average);

  return nodes.map((node) => {
    if (!selectedIds.includes(node.id)) {
      return node;
    }
    return {
      ...node,
      position:
        direction === "horizontal"
          ? { ...node.position, y: alignedCoordinate }
          : { ...node.position, x: alignedCoordinate }
    };
  });
}

export function distributeNodes(nodes: ModelNode[], selectedIds: string[], direction: AlignDirection): ModelNode[] {
  const selected = nodes.filter((node) => selectedIds.includes(node.id));
  if (selected.length < 3) {
    return nodes;
  }
  const axis = direction === "horizontal" ? "x" : "y";
  const ordered = [...selected].sort((first, second) => first.position[axis] - second.position[axis]);
  const start = ordered[0].position[axis];
  const end = ordered[ordered.length - 1].position[axis];
  if (start === end) {
    return nodes;
  }
  const step = (end - start) / (ordered.length - 1);
  const coordinateById = new Map(
    ordered.map((node, index) => [node.id, Math.round(start + step * index)])
  );

  return nodes.map((node) => {
    const coordinate = coordinateById.get(node.id);
    if (coordinate === undefined) {
      return node;
    }
    return {
      ...node,
      position:
        direction === "horizontal"
          ? { ...node.position, x: coordinate }
          : { ...node.position, y: coordinate }
    };
  });
}

export function deleteNodesWithConnectedEdges(nodes: ModelNode[], edges: Edge[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return {
    nodes: nodes.filter((node) => !selected.has(node.id)),
    edges: edges.filter((edge) => !selected.has(edge.sourceId) && !selected.has(edge.targetId))
  };
}

type DisjointSet = {
  ensure: (key: string) => void;
  find: (key: string) => string;
  union: (first: string, second: string) => void;
};

function createDisjointSet(): DisjointSet {
  const parent = new Map<string, string>();
  const ensure = (key: string) => {
    if (!parent.has(key)) {
      parent.set(key, key);
    }
  };
  const find = (key: string): string => {
    ensure(key);
    const current = parent.get(key);
    if (!current || current === key) {
      return key;
    }
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  const union = (first: string, second: string) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) {
      parent.set(secondRoot, firstRoot);
    }
  };
  return { ensure, find, union };
}

export function resolveTopologyEdgeTerminal(node: ModelNode | undefined, terminalId?: string): Terminal | undefined {
  if (!node) {
    return undefined;
  }
  if (terminalId) {
    return node.terminals.find((terminal) => terminal.id === terminalId);
  }
  return node.terminals[0];
}

function shouldContractTopologyIslandNode(node: ModelNode): boolean {
  const section = inferESection(node.kind, node.params);
  if (section === "ACBranch" || section === "DCBranch" || section === "ACZeroBranch" || section === "DCZeroBranch") {
    return true;
  }
  if (section === "ACSwitch" || section === "DCSwitch" || section === "ACBreak" || section === "DCBreak") {
    return normalizeSwitchStatusForE(node.params.closed_status ?? node.params.closedStatus ?? node.params.status) !== "0";
  }
  return false;
}

function isTwoWindingTransformerNode(node: Pick<ModelNode, "kind">): boolean {
  return isTwoWindingTransformerKind(node.kind);
}

function isTwoTerminalTopologyDevice(node: ModelNode): boolean {
  return !isBusNode(node) && !isStaticNode(node) && node.terminals.length === 2;
}

export type VoltageBaseClearScope = "selected" | "island" | "all";

export type VoltageBaseSetScope = "selected" | "island";

export type VoltageBaseClearResult = {
  nodes: ModelNode[];
  nodeUpdates: ModelNode[];
  targetNodeIds: string[];
  changedNodeIds: string[];
};

export type VoltageBaseSetResult = VoltageBaseClearResult;

export type VoltageBaseTerminalValuesByNodeId = Record<string, Record<string, string>>;

export type TwoTerminalVoltageBaseMismatch = {
  nodeId: string;
  nodeName: string;
  section: string;
  sourceTerminalLabel: string;
  targetTerminalLabel: string;
  sourceVoltageBase: string;
  targetVoltageBase: string;
};

type VoltageBaseScopeTargets = {
  nodeIds: Set<string>;
  terminalIdsByNodeId: Map<string, Set<string>> | null;
};

export function buildTopologyConnectivity(nodes: ModelNode[], edges: Edge[]): TopologyConnectivity {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const topologyEdges = [...edges, ...routableLineDeviceTopologyEdges(nodes)];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const topology = createDisjointSet();

  for (const node of nodes) {
    for (const terminal of node.terminals) {
      topology.ensure(terminalKey(node.id, terminal.id));
    }
    if (isBusNode(node)) {
      const terminalsByType = new Map<TerminalType, Terminal[]>();
      for (const terminal of node.terminals) {
        terminalsByType.set(terminal.type, [...(terminalsByType.get(terminal.type) ?? []), terminal]);
      }
      for (const terminals of terminalsByType.values()) {
        const [first, ...rest] = terminals;
        for (const terminal of rest) {
          topology.union(terminalKey(node.id, first.id), terminalKey(node.id, terminal.id));
        }
      }
    }
  }

  for (const overlappingGroup of getOverlappingTerminalGroups(nodes)) {
    const [first, ...rest] = overlappingGroup.terminals;
    for (const item of rest) {
      topology.union(terminalKey(first.nodeId, first.terminalId), terminalKey(item.nodeId, item.terminalId));
    }
  }
  for (const contactGroup of getTerminalBusContactGroups(nodes)) {
    for (const contact of contactGroup.contacts) {
      topology.union(terminalKey(contact.nodeId, contact.terminalId), terminalKey(contact.busId, contact.busTerminalId));
    }
  }

  for (const edge of topologyEdges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    const sourceTerminal = resolveTopologyEdgeTerminal(source, edge.sourceTerminalId);
    const targetTerminal = resolveTopologyEdgeTerminal(target, edge.targetTerminalId);
    if (!source || !target || !sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) {
      continue;
    }
    topology.union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));
  }

  const island = createDisjointSet();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      island.ensure(topology.find(terminalKey(node.id, terminal.id)));
    }
  }
  for (const node of nodes) {
    if (!shouldContractTopologyIslandNode(node)) {
      continue;
    }
    const electricalTerminals = node.terminals.filter((terminal) => isElectricalTerminalType(terminal.type));
    const [first, ...rest] = electricalTerminals;
    if (!first) {
      continue;
    }
    for (const terminal of rest) {
      if (terminal.type === first.type) {
        island.union(topology.find(terminalKey(node.id, first.id)), topology.find(terminalKey(node.id, terminal.id)));
      }
    }
  }

  return {
    terminalKey,
    topologyRoot: (nodeId, terminalId) => topology.find(terminalKey(nodeId, terminalId)),
    islandRoot: (nodeId, terminalId) => island.find(topology.find(terminalKey(nodeId, terminalId)))
  };
}

function isVoltageBaseValueParamKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  const compact = normalized.replace(/[_\-\s]/g, "");
  return (
    normalized === "voltage" ||
    compact === "vbase" ||
    compact.endsWith("vbase") ||
    compact === "vset" ||
    compact.endsWith("vset") ||
    normalized === "v_set" ||
    normalized.startsWith("v_set_") ||
    normalized.endsWith("_v_set") ||
    /^v_[a-z0-9]+_set$/.test(normalized)
  );
}

function isSupportedVoltageBaseValueParamKey(node: ModelNode, key: string): boolean {
  if (!isVoltageBaseValueParamKey(key)) {
    return false;
  }
  const section = inferESection(node.kind, node.params);
  const normalized = normalizeDeviceParameterEnglishName(key);
  if ((section === "DCDCConverter" || section === "ACACConverter") && normalized === "v_set") {
    return false;
  }
  if (section === "DCACConverter" && ["v_set", "ac_v_set", "dc_v_set"].includes(normalized)) {
    return false;
  }
  return true;
}

const TWO_TERMINAL_EQUAL_VOLTAGE_BASE_SECTIONS = new Set([
  "ACBranch",
  "DCBranch",
  "ACZeroBranch",
  "DCZeroBranch",
  "ACSwitch",
  "DCSwitch",
  "ACBreak",
  "DCBreak"
]);

const TERMINAL_VOLTAGE_BASE_SETTING_SECTIONS = new Set([
  "ACTransformer",
  "ACTransfomer3",
  "DCDCConverter",
  "DCACConverter",
  "ACACConverter"
]);

const TERMINAL_VOLTAGE_BASE_SETTING_KINDS = new Set([
  "ac-transformer",
  "ac-two-winding-transformer",
  "ac-three-winding-transformer",
  "ac-three-winding-transformer-neutral",
  "dcdc-converter",
  "acdc-converter",
  "dcac-converter",
  "acac-converter"
]);

export type VoltageBaseSettingMode = "uniform" | "terminal";

export function voltageBaseSettingModeForNode(node: ModelNode): VoltageBaseSettingMode | null {
  const kind = baseDeviceKind(node.kind);
  if (kind === "ac-bus" || kind === "dc-bus") {
    return "uniform";
  }
  if (isBusNode(node) || isStaticNode(node) || !node.terminals.some((terminal) => isElectricalTerminalType(terminal.type))) {
    return null;
  }
  return TERMINAL_VOLTAGE_BASE_SETTING_KINDS.has(kind) || TERMINAL_VOLTAGE_BASE_SETTING_SECTIONS.has(inferESection(node.kind, node.params))
    ? "terminal"
    : "uniform";
}

function isTwoTerminalEqualVoltageBaseDevice(node: ModelNode): boolean {
  if (node.terminals.length !== 2 || isBusNode(node) || isStaticNode(node)) {
    return false;
  }
  return TWO_TERMINAL_EQUAL_VOLTAGE_BASE_SECTIONS.has(inferESection(node.kind, node.params));
}

function voltageBaseComparisonKey(value: string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : value;
}

export function validateTwoTerminalVoltageBaseConsistency(nodes: ModelNode[]): TwoTerminalVoltageBaseMismatch[] {
  const mismatches: TwoTerminalVoltageBaseMismatch[] = [];
  for (const node of nodes) {
    if (!isTwoTerminalEqualVoltageBaseDevice(node)) {
      continue;
    }
    const sourceTerminal = node.terminals[0];
    const targetTerminal = node.terminals[1];
    const sourceVoltageBase = terminalVoltageBaseNumber(sourceTerminal.vbase ?? node.params.i_vbase ?? deviceParamValue(node.params, "source_vbase") ?? node.params.vbase);
    const targetVoltageBase = terminalVoltageBaseNumber(targetTerminal.vbase ?? node.params.j_vbase ?? deviceParamValue(node.params, "target_vbase") ?? node.params.vbase);
    if (!sourceVoltageBase || !targetVoltageBase || voltageBaseComparisonKey(sourceVoltageBase) === voltageBaseComparisonKey(targetVoltageBase)) {
      continue;
    }
    mismatches.push({
      nodeId: node.id,
      nodeName: node.name,
      section: inferESection(node.kind, node.params),
      sourceTerminalLabel: sourceTerminal.label || sourceTerminal.id,
      targetTerminalLabel: targetTerminal.label || targetTerminal.id,
      sourceVoltageBase,
      targetVoltageBase
    });
  }
  return mismatches;
}

function setNodeVoltageBaseValues(node: ModelNode, value: string): ModelNode {
  let params = node.params;
  for (const key of Object.keys(node.params)) {
    if (!isSupportedVoltageBaseValueParamKey(node, key) || node.params[key] === value) {
      continue;
    }
    if (params === node.params) {
      params = { ...node.params };
    }
    params[key] = value;
  }
  let terminals = node.terminals;
  for (let index = 0; index < node.terminals.length; index += 1) {
    const terminal = node.terminals[index];
    if (terminal.vbase === value) {
      continue;
    }
    if (terminals === node.terminals) {
      terminals = [...node.terminals];
    }
    terminals[index] = { ...terminal, vbase: value };
  }
  return params === node.params && terminals === node.terminals
    ? node
    : { ...node, params, terminals };
}

function setNodeRatedVoltageIfPresent(node: ModelNode, value: string): ModelNode {
  if (
    !Object.prototype.hasOwnProperty.call(node.params, "rated_voltage") ||
    node.params.rated_voltage === value
  ) {
    return node;
  }
  return {
    ...node,
    params: {
      ...node.params,
      rated_voltage: value
    }
  };
}

const VOLTAGE_LIMIT_PARAM_KEYS = new Set([
  "v_max",
  "v_min",
  "i_v_max",
  "i_v_min",
  "j_v_max",
  "j_v_min",
  "ac_v_max",
  "ac_v_min",
  "dc_v_max",
  "dc_v_min"
]);

function terminalIdSet(...ids: Array<string | undefined>): Set<string> | null {
  const validIds = ids.filter((id): id is string => Boolean(id));
  return validIds.length > 0 ? new Set(validIds) : null;
}

function terminalIdAt(node: ModelNode, index: number): string | undefined {
  return node.terminals[index]?.id;
}

function terminalIdByType(node: ModelNode, type: TerminalType, fallbackIndex: number): string | undefined {
  return node.terminals.find((terminal) => terminal.type === type)?.id ?? terminalIdAt(node, fallbackIndex);
}

function voltageLimitParamTerminalIds(node: ModelNode, key: string): Set<string> | null {
  const normalized = key.trim().toLowerCase();
  if (normalized === "i_v_max" || normalized === "i_v_min") {
    return terminalIdSet(terminalIdAt(node, 0));
  }
  if (normalized === "j_v_max" || normalized === "j_v_min") {
    return terminalIdSet(terminalIdAt(node, 1));
  }
  if (normalized === "ac_v_max" || normalized === "ac_v_min") {
    return terminalIdSet(terminalIdByType(node, "ac", 0));
  }
  if (normalized === "dc_v_max" || normalized === "dc_v_min") {
    return terminalIdSet(terminalIdByType(node, "dc", 1));
  }
  return null;
}

function setNodeVoltageLimitValues(
  node: ModelNode,
  targetTerminalIds: ReadonlySet<string> | null,
  value: string
): ModelNode {
  let params = node.params;
  for (const key of Object.keys(node.params)) {
    const normalized = key.trim().toLowerCase();
    if (!VOLTAGE_LIMIT_PARAM_KEYS.has(normalized) || node.params[key] === value) {
      continue;
    }
    if (targetTerminalIds) {
      const paramTerminalIds = voltageLimitParamTerminalIds(node, normalized);
      const shouldUpdate = paramTerminalIds
        ? terminalIdsOverlap(paramTerminalIds, targetTerminalIds)
        : allVoltageBaseTerminalIdsTargeted(node, targetTerminalIds);
      if (!shouldUpdate) {
        continue;
      }
    }
    if (params === node.params) {
      params = { ...node.params };
    }
    params[key] = value;
  }
  return params === node.params ? node : { ...node, params };
}

/**
 * 变压器「侧电压参数」→ 端子下标。**全仓唯一一份分侧表**：
 * 双绕组 `i/j` = 高/低；三绕组 `i/k/j` = 高/中/低（`neutral` 为第 4 个端子）。
 * 非变压器、或不是侧电压参数时返回 undefined。
 *
 * 为什么必须是单源：右侧面板的参数编辑要把「用户改了哪一侧」翻成端子、再据此算该侧分压岛，
 * 而写回参数时还要把端子值翻回**同一个**参数键。两处各存一份时，只要有一份写错侧位，
 * 就会出现「改 A 侧、B 侧跟着变」：曾经这里把 `j_vbase` 一律当成 1 号端子，而三绕组的
 * 1 号端子是**中压**侧 —— 于是改中压侧把值写进了低压侧 `j_vbase`，而 `k_vbase` 无人认领、
 * 中压侧自己反而没改。
 */
export function voltageBaseParamTerminalIndexForNode(node: ModelNode, key: string): number | undefined {
  const kind = baseDeviceKind(node.kind);
  const isThree = isThreeWindingTransformer(node);
  const isTwo = isTwoWindingTransformerKind(kind);
  if (!isThree && !isTwo) {
    return undefined;
  }
  const compact = key.trim().toLowerCase().replace(/[_\-\s]/g, "");
  const sideTable = isThree
    ? ({ ivbase: 0, kvbase: 1, jvbase: 2, neutralvbase: 3 } as Record<string, number>)
    : ({ ivbase: 0, jvbase: 1 } as Record<string, number>);
  return sideTable[compact];
}

/**
 * 存量数据修复：把变压器的**分侧电压参数**对齐到对应端子的 vbase（**以端子为准**）。
 *
 * 为什么需要：分侧表曾经错位（见上面 `voltageBaseParamTerminalIndexForNode` 的注释），
 * 那时的编辑会让 `params.j_vbase` 与 3 号端子各持一值 —— 右侧面板【图元】参数表读参数、
 * 而【设置电压基值】窗口与电压着色读端子（`terminalVoltageDisplayValue` 先读端子、非零即返回），
 * 于是同一个「低压侧电压等级」在界面上出现两个数。写路径已修正，但**存量模型里那对值不会自愈**：
 * 不再去动那一侧，它们就永远并存。
 *
 * 方向取「端子为准」不是新发明的优先级，而是照抄既有的读取顺序（端子优先、分侧参数是它的回退）。
 *
 * 端子还是默认占位（空 / `0`）时**跳过**：那时没有「实物」可对齐，硬写会把用户填过的数抹成 0。
 */
export function reconcileTransformerSideVoltageParamsWithTerminals(nodes: readonly ModelNode[]): ModelNode[] {
  return nodes.map((node) => {
    let params = node.params;
    for (const key of Object.keys(node.params)) {
      const terminalIndex = voltageBaseParamTerminalIndexForNode(node, key);
      if (terminalIndex === undefined) {
        continue;
      }
      const terminalVoltage = terminalVoltageBaseNumber(node.terminals[terminalIndex]?.vbase);
      if (!terminalVoltage || isZeroNumericText(terminalVoltage)) {
        continue;
      }
      if (terminalVoltageBaseNumber(params[key]) === terminalVoltage) {
        continue;
      }
      if (params === node.params) {
        params = { ...node.params };
      }
      params[key] = terminalVoltage;
    }
    return params === node.params ? node : { ...node, params };
  });
}

function containerVoltageBaseParamTerminalIds(node: ModelNode, key: string): Set<string> | null {  const normalized = key.trim().toLowerCase();
  const prefixes = ["v_set_", "vbase_", "v_base_"];
  for (const prefix of prefixes) {
    if (!normalized.startsWith(prefix)) {
      continue;
    }
    const relation = parseContainerRelationField(`idx_${normalized.slice(prefix.length)}`);
    if (!relation) {
      continue;
    }
    return terminalIdSet(terminalIdAt(node, relation.terminalNumber - 1));
  }
  return null;
}

function voltageBaseParamTerminalIds(node: ModelNode, key: string): Set<string> | null {
  const normalized = key.trim().toLowerCase();
  const compact = normalized.replace(/[_\-\s]/g, "");
  const containerTerminalIds = containerVoltageBaseParamTerminalIds(node, key);
  if (containerTerminalIds) {
    return containerTerminalIds;
  }
  // 变压器分侧（i/k/j）：走上面那份唯一分侧表。双绕组 i/j 与三绕组 i/k/j **不是同一套侧位**，
  // 故下面那些按字面名硬写的分支（source/target/high/medium/low）都只管非变压器设备。
  const transformerTerminalIndex = voltageBaseParamTerminalIndexForNode(node, key);
  if (transformerTerminalIndex !== undefined) {
    return terminalIdSet(terminalIdAt(node, transformerTerminalIndex));
  }
  if (compact === "highvbase") {
    return terminalIdSet(terminalIdAt(node, 0));
  }
  if (compact === "mediumvbase") {
    return terminalIdSet(terminalIdAt(node, 1));
  }
  if (compact === "lowvbase") {
    // 英文侧名的写法（custom component 定义常用），故不按设备类型早退 —— 非变压器也走这里。
    // 变压器上它与 `j_vbase` 必须同值：三绕组 2 号端子（低压）、双绕组 1 号端子。改一处要改两处，
    // 这正是上面 `voltageBaseParamTerminalIndexForNode` 注释里那条教训的来源。
    return terminalIdSet(terminalIdAt(node, isThreeWindingTransformer(node) ? 2 : 1));
  }
  if (compact === "neutralvbase") {
    return terminalIdSet(terminalIdAt(node, 3));
  }
  if (compact === "sourcevbase" || compact === "ivbase" || compact === "ivset") {
    return terminalIdSet(terminalIdAt(node, 0));
  }
  if (compact === "targetvbase" || compact === "jvbase" || compact === "jvset") {
    return terminalIdSet(terminalIdAt(node, 1));
  }
  if (compact === "vacset" || compact === "acvset") {
    return terminalIdSet(terminalIdByType(node, "ac", 0));
  }
  if (compact === "vdcset" || compact === "dcvset") {
    return terminalIdSet(terminalIdByType(node, "dc", 1));
  }
  if (compact === "vset") {
    if (node.terminals.length <= 1) {
      return terminalIdSet(terminalIdAt(node, 0));
    }
    const section = inferESection(node.kind, node.params);
    if (section === "DCDCConverter" || section === "DCACConverter" || section === "ACACConverter") {
      return terminalIdSet(terminalIdAt(node, 0));
    }
  }
  return null;
}

function terminalIdsOverlap(first: ReadonlySet<string>, second: ReadonlySet<string>): boolean {
  for (const id of first) {
    if (second.has(id)) {
      return true;
    }
  }
  return false;
}

function allVoltageBaseTerminalIdsTargeted(node: ModelNode, targetTerminalIds: ReadonlySet<string>): boolean {
  const terminalIds = node.terminals.map((terminal) => terminal.id);
  return terminalIds.length > 0 && terminalIds.every((id) => targetTerminalIds.has(id));
}

function shouldUpdateVoltageBaseParamForTerminals(node: ModelNode, key: string, targetTerminalIds: ReadonlySet<string>): boolean {
  const paramTerminalIds = voltageBaseParamTerminalIds(node, key);
  if (paramTerminalIds) {
    return terminalIdsOverlap(paramTerminalIds, targetTerminalIds);
  }
  return allVoltageBaseTerminalIdsTargeted(node, targetTerminalIds);
}

function setNodeVoltageBaseValuesForTerminals(node: ModelNode, targetTerminalIds: ReadonlySet<string>, value: string): ModelNode {
  if (targetTerminalIds.size === 0) {
    return node;
  }
  let params = node.params;
  for (const key of Object.keys(node.params)) {
    if (!isSupportedVoltageBaseValueParamKey(node, key) || node.params[key] === value) {
      continue;
    }
    if (!shouldUpdateVoltageBaseParamForTerminals(node, key, targetTerminalIds)) {
      continue;
    }
    if (params === node.params) {
      params = { ...node.params };
    }
    params[key] = value;
  }
  let terminals = node.terminals;
  for (let index = 0; index < node.terminals.length; index += 1) {
    const terminal = node.terminals[index];
    if (!targetTerminalIds.has(terminal.id) || terminal.vbase === value) {
      continue;
    }
    if (terminals === node.terminals) {
      terminals = [...node.terminals];
    }
    terminals[index] = { ...terminal, vbase: value };
  }
  return params === node.params && terminals === node.terminals
    ? node
    : { ...node, params, terminals };
}

function voltageBaseValueForParamTerminals(
  node: ModelNode,
  key: string,
  valueByTerminalId: ReadonlyMap<string, string>
): string | null {
  const paramTerminalIds = voltageBaseParamTerminalIds(node, key);
  const candidateValues: string[] = [];
  if (paramTerminalIds) {
    for (const terminalId of paramTerminalIds) {
      const value = valueByTerminalId.get(terminalId);
      if (value) {
        candidateValues.push(value);
      }
    }
  } else {
    for (const terminal of node.terminals) {
      const value = valueByTerminalId.get(terminal.id);
      if (!value) {
        return null;
      }
      candidateValues.push(value);
    }
  }
  if (candidateValues.length === 0) {
    return null;
  }
  const uniqueValues = new Set(candidateValues);
  return uniqueValues.size === 1 ? candidateValues[0] : null;
}

function setNodeVoltageBaseValuesByTerminal(
  node: ModelNode,
  valueByTerminalId: ReadonlyMap<string, string>
): ModelNode {
  if (valueByTerminalId.size === 0) {
    return node;
  }
  let params = node.params;
  for (const key of Object.keys(node.params)) {
    if (!isSupportedVoltageBaseValueParamKey(node, key)) {
      continue;
    }
    const value = voltageBaseValueForParamTerminals(node, key, valueByTerminalId);
    if (!value || node.params[key] === value) {
      continue;
    }
    if (params === node.params) {
      params = { ...node.params };
    }
    params[key] = value;
  }
  let terminals = node.terminals;
  for (let index = 0; index < node.terminals.length; index += 1) {
    const terminal = node.terminals[index];
    const value = valueByTerminalId.get(terminal.id);
    if (!value || terminal.vbase === value) {
      continue;
    }
    if (terminals === node.terminals) {
      terminals = [...node.terminals];
    }
    terminals[index] = { ...terminal, vbase: value };
  }
  return params === node.params && terminals === node.terminals
    ? node
    : { ...node, params, terminals };
}

function setNodeRatedVoltageFromTerminalValuesIfPresent(
  node: ModelNode,
  valueByTerminalId: ReadonlyMap<string, string>
): ModelNode {
  const electricalTerminals = node.terminals.filter((terminal) => isElectricalTerminalType(terminal.type));
  if (
    electricalTerminals.length === 0 ||
    electricalTerminals.some((terminal) => !valueByTerminalId.has(terminal.id))
  ) {
    return node;
  }
  const values = new Set(electricalTerminals.map((terminal) => valueByTerminalId.get(terminal.id)!));
  return values.size === 1
    ? setNodeRatedVoltageIfPresent(node, Array.from(values)[0])
    : node;
}

function selectedVoltageBaseTerminalValues(
  nodes: ModelNode[],
  terminalValuesByNodeId: VoltageBaseTerminalValuesByNodeId
): Map<string, Map<string, string>> {
  const valuesByNodeId = new Map<string, Map<string, string>>();
  for (const node of nodes) {
    const inputValues = terminalValuesByNodeId[node.id];
    if (!inputValues || voltageBaseSettingModeForNode(node) !== "terminal") {
      continue;
    }
    const valuesByTerminalId = new Map<string, string>();
    for (const terminal of node.terminals) {
      const value = normalizeVoltageBaseInput(inputValues[terminal.id]);
      if (value) {
        valuesByTerminalId.set(terminal.id, value);
      }
    }
    if (valuesByTerminalId.size > 0) {
      valuesByNodeId.set(node.id, valuesByTerminalId);
    }
  }
  return valuesByNodeId;
}

function islandVoltageBaseTerminalValues(
  nodes: ModelNode[],
  edges: Edge[],
  terminalValuesByNodeId: VoltageBaseTerminalValuesByNodeId
): Map<string, Map<string, string>> {
  const selectedValues = selectedVoltageBaseTerminalValues(nodes, terminalValuesByNodeId);
  if (selectedValues.size === 0) {
    return selectedValues;
  }
  const connectivity = buildTopologyConnectivity(nodes, edges);
  const valueByIslandRoot = new Map<string, string>();
  for (const node of nodes) {
    const valuesByTerminalId = selectedValues.get(node.id);
    if (!valuesByTerminalId) {
      continue;
    }
    for (const terminal of node.terminals) {
      const value = valuesByTerminalId.get(terminal.id);
      if (!value) {
        continue;
      }
      const root = connectivity.islandRoot(node.id, terminal.id);
      if (!valueByIslandRoot.has(root)) {
        valueByIslandRoot.set(root, value);
      }
    }
  }
  const valuesByNodeId = new Map<string, Map<string, string>>();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const value = valueByIslandRoot.get(connectivity.islandRoot(node.id, terminal.id));
      if (!value) {
        continue;
      }
      const valuesByTerminalId = valuesByNodeId.get(node.id) ?? new Map<string, string>();
      valuesByTerminalId.set(terminal.id, value);
      valuesByNodeId.set(node.id, valuesByTerminalId);
    }
  }
  return valuesByNodeId;
}

function collectVoltageBaseScopeTargets(
  nodes: ModelNode[],
  edges: Edge[],
  selectedNodeIds: Iterable<string>,
  scope: VoltageBaseClearScope
): VoltageBaseScopeTargets {
  if (scope === "all") {
    return { nodeIds: new Set(nodes.map((node) => node.id)), terminalIdsByNodeId: null };
  }

  const selected = new Set(selectedNodeIds);
  if (scope === "selected") {
    return {
      nodeIds: new Set(nodes.filter((node) => selected.has(node.id)).map((node) => node.id)),
      terminalIdsByNodeId: null
    };
  }
  if (selected.size === 0) {
    return { nodeIds: new Set(), terminalIdsByNodeId: new Map() };
  }

  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  const scopeNodes = synchronized.nodes;
  const connectivity = buildTopologyConnectivity(scopeNodes, synchronized.edges);
  const selectedIslandRoots = new Set<string>();
  for (const node of scopeNodes) {
    if (!selected.has(node.id)) {
      continue;
    }
    for (const terminal of node.terminals) {
      selectedIslandRoots.add(connectivity.islandRoot(node.id, terminal.id));
    }
  }
  if (selectedIslandRoots.size === 0) {
    return {
      nodeIds: new Set(nodes.filter((node) => selected.has(node.id)).map((node) => node.id)),
      terminalIdsByNodeId: null
    };
  }

  const nodeIds = new Set<string>();
  const terminalIdsByNodeId = new Map<string, Set<string>>();
  for (const node of scopeNodes) {
    for (const terminal of node.terminals) {
      if (!selectedIslandRoots.has(connectivity.islandRoot(node.id, terminal.id))) {
        continue;
      }
      nodeIds.add(node.id);
      const terminalIds = terminalIdsByNodeId.get(node.id) ?? new Set<string>();
      terminalIds.add(terminal.id);
      terminalIdsByNodeId.set(node.id, terminalIds);
    }
  }
  return { nodeIds, terminalIdsByNodeId };
}

export function clearVoltageBaseValuesForScope(
  nodes: ModelNode[],
  edges: Edge[],
  selectedNodeIds: Iterable<string>,
  scope: VoltageBaseClearScope
): VoltageBaseClearResult {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  const targets = collectVoltageBaseScopeTargets(synchronized.nodes, synchronized.edges, selectedNodeIds, scope);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = synchronized.nodes.map((node) => {
    if (!targets.nodeIds.has(node.id)) {
      return node;
    }
    const targetTerminalIds = targets.terminalIdsByNodeId?.get(node.id);
    const voltageBaseClearedNode = targetTerminalIds
      ? setNodeVoltageBaseValuesForTerminals(node, targetTerminalIds, "0.0")
      : setNodeVoltageBaseValues(node, "0.0");
    const voltageLimitsClearedNode = setNodeVoltageLimitValues(
      voltageBaseClearedNode,
      targetTerminalIds ?? null,
      "0.0"
    );
    const nextNode = setNodeRatedVoltageIfPresent(voltageLimitsClearedNode, "0.0");
    if (nextNode !== node) {
      nodeUpdates.push(nextNode);
    }
    return nextNode;
  });
  return {
    nodes: nextNodes,
    nodeUpdates,
    targetNodeIds: Array.from(targets.nodeIds),
    changedNodeIds: nodeUpdates.map((node) => node.id)
  };
}

export function setVoltageBaseValuesForScope(
  nodes: ModelNode[],
  edges: Edge[],
  selectedNodeIds: Iterable<string>,
  scope: VoltageBaseSetScope,
  value: string
): VoltageBaseSetResult {
  // 母线端子由运行时按边动态补齐（不随设备持久化），先同步端子再写回，
  // 动态端子母线在岛内命中但无端子可写（端子 vbase）时不再漏（与 setVoltageBaseTerminalValueForTopologySide 行为一致）。
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  const targets = collectVoltageBaseScopeTargets(synchronized.nodes, synchronized.edges, selectedNodeIds, scope);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = synchronized.nodes.map((node) => {
    if (!targets.nodeIds.has(node.id)) {
      return node;
    }
    const settingMode = voltageBaseSettingModeForNode(node);
    const targetTerminalIds = targets.terminalIdsByNodeId?.get(node.id);
    const voltageBaseSetNode = settingMode === "uniform"
      ? targetTerminalIds && node.terminals.length > 0
        ? setNodeVoltageBaseValuesForTerminals(node, targetTerminalIds, value)
        : setNodeVoltageBaseValues(node, value)
      : settingMode === "terminal" && targetTerminalIds
        ? setNodeVoltageBaseValuesForTerminals(node, targetTerminalIds, value)
        : node;
    const voltageSetNode = settingMode === "uniform"
      ? setNodeRatedVoltageIfPresent(voltageBaseSetNode, value)
      : voltageBaseSetNode;
    // 根据电压等级设置线路/负荷额定容量默认值
    const ratedCapacityDefault = getRatedCapacityDefaultForKind(baseDeviceKind(node.kind), value);
    const nextNode = ratedCapacityDefault && voltageSetNode.params.ratedCapacity !== ratedCapacityDefault
      ? { ...voltageSetNode, params: { ...voltageSetNode.params, ratedCapacity: ratedCapacityDefault } }
      : voltageSetNode;
    if (nextNode !== node) {
      nodeUpdates.push(nextNode);
    }
    return nextNode;
  });
  return {
    nodes: nextNodes,
    nodeUpdates,
    targetNodeIds: Array.from(targets.nodeIds),
    changedNodeIds: nodeUpdates.map((node) => node.id)
  };
}

export function setVoltageBaseTerminalValuesForScope(
  nodes: ModelNode[],
  edges: Edge[],
  terminalValuesByNodeId: VoltageBaseTerminalValuesByNodeId,
  scope: VoltageBaseSetScope
): VoltageBaseSetResult {
  // 母线端子由运行时按边动态补齐（不随设备持久化）。先同步端子，再基于同步后的节点计算与写回，
  // 避免动态端子母线在岛内命中却无端子可写而被漏掉（与 setVoltageBaseTerminalValueForTopologySide 行为一致）。
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  const valuesByNodeId = scope === "island"
    ? islandVoltageBaseTerminalValues(synchronized.nodes, synchronized.edges, terminalValuesByNodeId)
    : selectedVoltageBaseTerminalValues(synchronized.nodes, terminalValuesByNodeId);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = synchronized.nodes.map((node) => {
    const valuesByTerminalId = valuesByNodeId.get(node.id);
    if (!valuesByTerminalId) {
      return node;
    }
    const voltageBaseSetNode = setNodeVoltageBaseValuesByTerminal(node, valuesByTerminalId);
    const voltageSetNode = setNodeRatedVoltageFromTerminalValuesIfPresent(voltageBaseSetNode, valuesByTerminalId);
    // 根据电压等级设置线路/负荷额定容量默认值（取第一个端子电压值）
    const firstVoltageValue = Object.values(valuesByTerminalId)[0] ?? "";
    const ratedCapacityDefault = firstVoltageValue
      ? getRatedCapacityDefaultForKind(baseDeviceKind(node.kind), firstVoltageValue)
      : null;
    const nextNode = ratedCapacityDefault && voltageSetNode.params.ratedCapacity !== ratedCapacityDefault
      ? { ...voltageSetNode, params: { ...voltageSetNode.params, ratedCapacity: ratedCapacityDefault } }
      : voltageSetNode;
    if (nextNode !== node) {
      nodeUpdates.push(nextNode);
    }
    return nextNode;
  });
  return {
    nodes: nextNodes,
    nodeUpdates,
    targetNodeIds: Array.from(valuesByNodeId.keys()),
    changedNodeIds: nodeUpdates.map((node) => node.id)
  };
}

export function collectVoltageBaseIslandForTerminal(
  nodes: ModelNode[],
  edges: Edge[],
  seedNodeId: string,
  seedTerminalId: string
): { nodeIds: Set<string>; terminalIdsByNodeId: Map<string, Set<string>> } {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const seedNode = nodeById.get(seedNodeId);
  const seedTerminal = seedNode?.terminals.find((terminal) => terminal.id === seedTerminalId);
  if (!seedNode || !seedTerminal || !isElectricalTerminalType(seedTerminal.type)) {
    return { nodeIds: new Set<string>(), terminalIdsByNodeId: new Map() };
  }
  // 完整电气连通邻接：edges + routable-line 拓扑边 + bus contact + overlapping 端子
  const neighbors = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    if (!neighbors.has(b)) neighbors.set(b, new Set());
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  };
  const topologyEdges = [...edges, ...routableLineDeviceTopologyEdges(nodes)];
  for (const edge of topologyEdges) {
    if (edge.sourceTerminalId && edge.targetTerminalId) {
      link(`${edge.sourceId}:${edge.sourceTerminalId}`, `${edge.targetId}:${edge.targetTerminalId}`);
    }
  }
  for (const group of getOverlappingTerminalGroups(nodes)) {
    const keys = group.terminals
      .map((item) => `${item.nodeId}:${item.terminalId}`)
      .filter((key) => !isTransformerNodeForTopology(nodeById.get(key.slice(0, key.lastIndexOf(":")))));
    for (let i = 1; i < keys.length; i += 1) link(keys[0], keys[i]);
  }
  for (const contactGroup of getTerminalBusContactGroups(nodes)) {
    for (const contact of contactGroup.contacts) {
      if (isTransformerNodeForTopology(nodeById.get(contact.nodeId)) || isTransformerNodeForTopology(nodeById.get(contact.busId))) {
        continue;
      }
      link(`${contact.nodeId}:${contact.terminalId}`, `${contact.busId}:${contact.busTerminalId}`);
    }
  }
  const visited = new Set<string>();
  const nodeIds = new Set<string>();
  const terminalIdsByNodeId = new Map<string, Set<string>>();
  const queue: Array<{ nodeId: string; terminalId: string }> = [{ nodeId: seedNodeId, terminalId: seedTerminalId }];
  const push = (nodeId: string, terminalId: string) => {
    const key = `${nodeId}:${terminalId}`;
    if (!visited.has(key)) {
      queue.push({ nodeId, terminalId });
    }
  };
  while (queue.length > 0) {
    const { nodeId, terminalId } = queue.shift()!;
    const key = `${nodeId}:${terminalId}`;
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);
    const node = nodeById.get(nodeId);
    if (!node) {
      continue;
    }
    const terminal = node.terminals.find((item) => item.id === terminalId);
    if (terminal && !isElectricalTerminalType(terminal.type)) {
      continue;
    }
    nodeIds.add(nodeId);
    const terminals = terminalIdsByNodeId.get(nodeId) ?? new Set<string>();
    terminals.add(terminalId);
    terminalIdsByNodeId.set(nodeId, terminals);
    const type = terminal?.type;
    // uniform 电气设备（母线/线路/支路/开关/分段等，导电）同类型端子连通；
    // 变压器/换流器等 terminal 模式（分压分侧）不合并，保持侧间隔离。
    if (terminal && isElectricalTerminalType(terminal.type) && voltageBaseSettingModeForNode(node) !== "terminal") {
      for (const other of node.terminals) {
        if (other.type === terminal.type) {
          push(nodeId, other.id);
        }
      }
    }
    for (const neighborKey of neighbors.get(key) ?? []) {
      const colon = neighborKey.lastIndexOf(":");
      const neighborNodeId = neighborKey.slice(0, colon);
      const neighborTerminalId = neighborKey.slice(colon + 1);
      // 变压器作为分压边界：不跨越同一节点的其它端子
      if (neighborNodeId === nodeId && neighborTerminalId !== terminalId) {
        continue;
      }
      const neighborNode = nodeById.get(neighborNodeId);
      const neighborTerminal = neighborNode?.terminals.find((item) => item.id === neighborTerminalId);
      if (neighborTerminal && type && neighborTerminal.type !== type) {
        continue;
      }
      push(neighborNodeId, neighborTerminalId);
    }
  }
  return { nodeIds, terminalIdsByNodeId };
}

/**
 * 修改某侧端子电压等级时，将该侧拓扑岛（沿 edges 连通、变压器分侧）的所有设备统一设置为该值。
 */
export function setVoltageBaseTerminalValueForTopologySide(
  nodes: ModelNode[],
  edges: Edge[],
  seedNodeId: string,
  seedTerminalId: string,
  value: string
): VoltageBaseSetResult {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  const targets = collectVoltageBaseIslandForTerminal(synchronized.nodes, synchronized.edges, seedNodeId, seedTerminalId);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = synchronized.nodes.map((node) => {
    const terminalIds = targets.terminalIdsByNodeId.get(node.id);
    if (!terminalIds) {
      return node;
    }
    const valueByTerminalId = new Map<string, string>();
    for (const terminalId of terminalIds) {
      valueByTerminalId.set(terminalId, value);
    }
    const voltageBaseSetNode = setNodeVoltageBaseValuesByTerminal(node, valueByTerminalId);
    const voltageSetNode = setNodeRatedVoltageFromTerminalValuesIfPresent(voltageBaseSetNode, valueByTerminalId);
    const ratedCapacityDefault = value
      ? getRatedCapacityDefaultForKind(baseDeviceKind(node.kind), value)
      : null;
    const nextNode = ratedCapacityDefault && voltageSetNode.params.ratedCapacity !== ratedCapacityDefault
      ? { ...voltageSetNode, params: { ...voltageSetNode.params, ratedCapacity: ratedCapacityDefault } }
      : voltageSetNode;
    if (nextNode !== node) {
      nodeUpdates.push(nextNode);
    }
    return nextNode;
  });
  return {
    nodes: nextNodes,
    nodeUpdates,
    targetNodeIds: Array.from(targets.nodeIds),
    changedNodeIds: nodeUpdates.map((node) => node.id)
  };
}

export function calculateElectricalTopology(nodes: ModelNode[], edges: Edge[]): ModelNode[] {
  const originalNodes = nodes;
  const filteredInput = topologyValidationInput(nodes, edges);
  nodes = filteredInput.nodes;
  edges = filteredInput.edges;
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const connectivity = buildTopologyConnectivity(nodes, edges);

  const nextTopologyNumberByType: Record<TerminalType, number> = { ac: 1, dc: 1, h2: 1, heat: 1 };
  const numberByTypeAndRoot: Record<TerminalType, Map<string, string>> = {
    ac: new Map<string, string>(),
    dc: new Map<string, string>(),
    h2: new Map<string, string>(),
    heat: new Map<string, string>()
  };
  const getTopologyNumber = (nodeId: string, terminal: Terminal) => {
    const root = connectivity.topologyRoot(nodeId, terminal.id);
    const type = terminal.type;
    const numberByRoot = numberByTypeAndRoot[type];
    const existing = numberByRoot.get(root);
    if (existing) {
      return existing;
    }
    const next = String(nextTopologyNumberByType[type]++);
    numberByRoot.set(root, next);
    return next;
  };
  const islandVoltageGroups = collectElectricalIslandVoltageGroups(nodes, connectivity);
  const voltageForTerminal = (nodeId: string, terminal: Terminal): string => {
    if (!isElectricalTerminalType(terminal.type)) {
      return "";
    }
    const root = connectivity.islandRoot(nodeId, terminal.id);
    const group = islandVoltageGroups.get(`${terminal.type}:${root}`);
    return group?.voltages.size === 1 ? Array.from(group.voltages.keys())[0] : "";
  };
  const applyTerminalVoltageBaseParams = (node: ModelNode, terminals: Terminal[]): Record<string, string> => {
    let params = node.params;
    const voltageByTerminalId = new Map(terminals.map((terminal) => [terminal.id, voltageForTerminal(node.id, terminal)]));
    const ensureParams = () => {
      if (params === node.params) {
        params = { ...node.params };
      }
    };
    const assignTerminalParam = (paramKey: string, terminal?: Terminal) => {
      const voltage = terminal ? voltageByTerminalId.get(terminal.id) : "";
      if (!voltage) {
        return;
      }
      ensureParams();
      params[paramKey] = voltage;
    };
    const terminalVoltages = Array.from(new Set(terminals.map((terminal) => voltageByTerminalId.get(terminal.id) ?? "").filter(Boolean)));
    if (Object.prototype.hasOwnProperty.call(params, "vbase") && terminalVoltages.length === 1) {
      ensureParams();
      params.vbase = terminalVoltages[0];
    }
    if (isThreeWindingTransformer(node)) {
      assignTerminalParam("i_vbase", terminals[0]);
      assignTerminalParam("k_vbase", terminals[1]);
      assignTerminalParam("j_vbase", terminals[2]);
      if (hasVisibleThreeWindingNeutralTerminal(node)) {
        assignTerminalParam("neutral_vbase", terminals[3]);
      }
    } else if (isTwoWindingTransformerNode(node)) {
      assignTerminalParam("i_vbase", terminals[0]);
      assignTerminalParam("j_vbase", terminals[1]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "source_vbase") || Object.prototype.hasOwnProperty.call(params, "sourceVbase")) {
      assignTerminalParam("source_vbase", terminals[0]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "target_vbase") || Object.prototype.hasOwnProperty.call(params, "targetVbase")) {
      assignTerminalParam("target_vbase", terminals[1]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "i_vbase")) {
      assignTerminalParam("i_vbase", terminals[0]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "j_vbase")) {
      assignTerminalParam("j_vbase", terminals[1]);
    }
    return params;
  };
  const applyVoltageSetpointDefaults = (node: ModelNode, terminals: Terminal[]): Record<string, string> => {
    let params = applyTerminalVoltageBaseParams(node, terminals);
    const assignIfZero = (paramKey: string, terminal?: Terminal) => {
      if (!terminal || !shouldAssignVoltageSetpointDefault(params[paramKey])) {
        return;
      }
      const voltage = voltageForTerminal(node.id, terminal);
      if (!voltage) {
        return;
      }
      if (params === node.params) {
        params = { ...node.params };
      }
      params[paramKey] = voltage;
    };
    if (
      Object.prototype.hasOwnProperty.call(params, "rated_voltage") &&
      isZeroNumericText(params.rated_voltage)
    ) {
      const ratedVoltageCandidates = new Set(
        terminals
          .filter((terminal) => isElectricalTerminalType(terminal.type))
          .map((terminal) => voltageForTerminal(node.id, terminal))
          .filter((voltage) => Boolean(voltage) && !isZeroNumericText(voltage))
      );
      if (ratedVoltageCandidates.size === 0 && terminals.length === 0) {
        const standaloneVoltage = terminalVoltageBaseNumber(params.vbase);
        if (standaloneVoltage && !isZeroNumericText(standaloneVoltage)) {
          ratedVoltageCandidates.add(standaloneVoltage);
        }
      }
      if (ratedVoltageCandidates.size === 1) {
        if (params === node.params) {
          params = { ...node.params };
        }
        params.rated_voltage = Array.from(ratedVoltageCandidates)[0];
      }
    }
    const section = inferESection(node.kind, node.params);
    if (section === "ACGenerator" || section === "DCGenerator") {
      const type: TerminalType = section === "ACGenerator" ? "ac" : "dc";
      assignIfZero("v_set", terminals.find((terminal) => terminal.type === type) ?? terminals[0]);
    }
    if (section === "DCDCConverter") {
      assignIfZero("i_v_set", terminals[0]);
      assignIfZero("j_v_set", terminals[1]);
    }
    if (section === "DCACConverter") {
      assignIfZero("v_ac_set", terminals.find((terminal) => terminal.type === "ac") ?? terminals[0]);
      assignIfZero("v_dc_set", terminals.find((terminal) => terminal.type === "dc") ?? terminals[1]);
    }
    if (section === "ACACConverter") {
      assignIfZero("i_v_set", terminals[0]);
      assignIfZero("j_v_set", terminals[1]);
    }
    if (isContainerParams(node.params)) {
      for (const fieldName of Object.keys(node.params)) {
        const relationSection = containerRelationCounterKey(fieldName);
        if (relationSection !== "ACGenerator" && relationSection !== "DCGenerator") {
          continue;
        }
        const parsed = parseContainerRelationField(fieldName);
        if (!parsed) {
          continue;
        }
        assignIfZero(containerRelationParamKey(fieldName, "v_set"), terminals[parsed.terminalNumber - 1]);
      }
    }
    return params;
  };

  const applyTopologyNodeReferenceParams = (
    node: ModelNode,
    terminals: Terminal[],
    params: Record<string, string>
  ): Record<string, string> => {
    const section = inferESection(node.kind, params);
    const referenceKeys = (E_SECTION_COLUMNS[section] ?? []).filter((key) => E_NODE_REFERENCE_COLUMNS.has(key));
    if (referenceKeys.length === 0) {
      return params;
    }
    const topologyNode = { ...node, terminals };
    let nextParams = params;
    for (const key of referenceKeys) {
      const value = topologyNodeNumberForEField(topologyNode, key);
      if (!value) {
        continue;
      }
      if (nextParams === params) {
        nextParams = { ...params };
      }
      nextParams[key] = value;
    }
    return nextParams;
  };

  const numberedNodes = nodes.map((node) => {
    const terminals = node.terminals.map((terminal) => {
      const voltage = voltageForTerminal(node.id, terminal);
      return {
        ...terminal,
        vbase: voltage || terminal.vbase,
        nodeNumber: getTopologyNumber(node.id, terminal)
      };
    });
    const standaloneBusType = isBusNode(node) && terminals.length === 0 ? getBusTerminalType(node) : undefined;
    const standaloneBusNodeNumber = standaloneBusType ? String(nextTopologyNumberByType[standaloneBusType]++) : "";
    const primaryTopologyNodeNumber = terminals[0]?.nodeNumber ?? standaloneBusNodeNumber;
    const calculatedNodeNumber = isBusNode(node)
      ? primaryTopologyNodeNumber || node.nodeNumber
      : terminals.length === 1
        ? primaryTopologyNodeNumber
        : node.nodeNumber;
    const topologyNode = calculatedNodeNumber === node.nodeNumber ? node : { ...node, nodeNumber: calculatedNodeNumber };
    const acTopologyNode = Number(
      terminals.find((terminal) => terminal.type === "ac")?.nodeNumber ??
      (standaloneBusType === "ac" ? standaloneBusNodeNumber : 0)
    );
    const dcTopologyNode = Number(
      terminals.find((terminal) => terminal.type === "dc")?.nodeNumber ??
      (standaloneBusType === "dc" ? standaloneBusNodeNumber : 0)
    );
    let params = applyVoltageSetpointDefaults(node, terminals);
    if (isTwoWindingTransformerNode(node)) {
      params = normalizeTwoWindingTransformerParams(params);
    } else if (isThreeWindingTransformer(node)) {
      params = {
        ...normalizeThreeWindingTransformerParams(params),
        i_node: terminals[0]?.nodeNumber ?? "",
        k_node: terminals[1]?.nodeNumber ?? "",
        j_node: terminals[2]?.nodeNumber ?? ""
      };
    }
    params = applyTopologyNodeReferenceParams(topologyNode, terminals, params);
    return {
      ...topologyNode,
      acTopologyNode,
      dcTopologyNode,
      params,
      terminals
    };
  });
  const calculatedNodes = numberedNodes.map((node) => {
    if (!isThreeWindingTransformer(node)) {
      return node;
    }
    if (hasVisibleThreeWindingNeutralTerminal(node)) {
      const neutralTerminal = node.terminals[3];
      return {
        ...node,
        params: {
          ...node.params,
          neutral_node: neutralTerminal?.nodeNumber ?? "",
          neutral_vbase: terminalVoltageBaseNumber(neutralTerminal?.vbase) || node.params.neutral_vbase || DEFAULT_INITIAL_TERMINAL_VBASE
        }
      };
    }
    return {
      ...node,
      params: {
        ...node.params,
        neutral_node: String(nextTopologyNumberByType.ac++),
        neutral_vbase: node.params.neutral_vbase || "1.0"
      }
    };
  });
  const calculatedById = new Map(calculatedNodes.map((node) => [node.id, node]));
  return originalNodes.map((node) => calculatedById.get(node.id) ?? node);
}

export function validateTopology(
  nodes: ModelNode[],
  edges: Edge[],
  options: ValidateTopologyOptions = {}
): TopologyValidationError[] {
  ({ nodes, edges } = topologyValidationInput(nodes, edges));
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const topologyEdges = [...edges, ...routableLineDeviceTopologyEdges(nodes)];
  const errors: TopologyValidationError[] = duplicateDeviceIdentityErrors(nodes);
  for (const node of nodes) {
    for (const issue of validateNodeEnumParameters(node)) {
      const parameterLabel = issue.definition.cnName || issue.definition.enName;
      errors.push({
        id: `device-enum-invalid:${node.id}:${issue.paramKey}`,
        type: "device-enum-invalid",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑失败：设备“${node.name}”的枚举参数 ${parameterLabel}（${issue.paramKey}）值“${issue.value || "<空>"}”无效，允许值为：${issue.allowedValues.join("、")}。`
      });
    }
  }
  // model_id 定义为整数（关联模型 idx 动态可变，非枚举），独立校验：非空值须命中同类型模型的动态目录。
  // 未提供目录时跳过，与 E 导出侧（validateNodeEnumParameters 不再校验 model_id）语义一致。
  if (options.modelAssociationProjectIndexes) {
    for (const node of nodes) {
      const associationModelType = modelAssociationModelTypeForKind(node.kind);
      if (!associationModelType) {
        continue;
      }
      const value = String(node.params.model_id ?? "").trim();
      if (!value) {
        continue;
      }
      const allowedValues = options.modelAssociationProjectIndexes[associationModelType] ?? [];
      if (allowedValues.includes(value)) {
        continue;
      }
      errors.push({
        id: `device-enum-invalid:${node.id}:model_id`,
        type: "device-enum-invalid",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑失败：设备“${node.name}”的关联模型（model_id）值“${value}”无效，允许值为：${allowedValues.join("、")}。`
      });
    }
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const resolveEdgeTerminal = (node: ModelNode, terminalId?: string) => {
    if (terminalId) {
      return node.terminals.find((terminal) => terminal.id === terminalId);
    }
    return node.terminals[0];
  };
  const parent = new Map<string, string>();
  const directVoltageMismatchEdges: Array<{
    source: ModelNode;
    sourceTerminal: Terminal;
    target: ModelNode;
    targetTerminal: Terminal;
  }> = [];
  const find = (key: string): string => {
    const current = parent.get(key);
    if (!current || current === key) {
      return key;
    }
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  const union = (first: string, second: string) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) {
      parent.set(secondRoot, firstRoot);
    }
  };

  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const key = terminalKey(node.id, terminal.id);
      parent.set(key, key);
    }
    if (isBusNode(node)) {
      const terminalsByType = new Map<TerminalType, Terminal[]>();
      for (const terminal of node.terminals) {
        terminalsByType.set(terminal.type, [...(terminalsByType.get(terminal.type) ?? []), terminal]);
      }
      for (const terminals of terminalsByType.values()) {
        const [first, ...rest] = terminals;
        for (const terminal of rest) {
          union(terminalKey(node.id, first.id), terminalKey(node.id, terminal.id));
        }
      }
    }
  }

  for (const overlappingGroup of getOverlappingTerminalGroups(nodes)) {
    const [first, ...rest] = overlappingGroup.terminals;
    if (!first) {
      continue;
    }
    for (const item of rest) {
      union(terminalKey(first.nodeId, first.terminalId), terminalKey(item.nodeId, item.terminalId));
    }
  }
  for (const contactGroup of getTerminalBusContactGroups(nodes)) {
    for (const contact of contactGroup.contacts) {
      union(terminalKey(contact.nodeId, contact.terminalId), terminalKey(contact.busId, contact.busTerminalId));
    }
  }

  for (const edge of topologyEdges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    const sourceTerminal = source ? resolveEdgeTerminal(source, edge.sourceTerminalId) : undefined;
    const targetTerminal = target ? resolveEdgeTerminal(target, edge.targetTerminalId) : undefined;
    if (!source || !target || !sourceTerminal || !targetTerminal) {
      const floatingEnds = [
        !source || !sourceTerminal ? "首端" : "",
        !target || !targetTerminal ? "末端" : ""
      ].filter(Boolean).join("、");
      const relatedNodeIds = [source?.id, target?.id].filter((id): id is string => Boolean(id));
      errors.push({
        id: `floating-terminal:${edge.id}`,
        type: "floating-terminal",
        edgeId: edge.id,
        nodeId: relatedNodeIds[0],
        relatedNodeIds,
        message: `图上拓扑失败：联络线 ${edge.id} 的${floatingEnds || "端子"}悬空，必须连接到设备端子或母线。`
      });
      continue;
    }

    if (source.id === target.id && isBusNode(source) && isBusNode(target)) {
      errors.push({
        id: `same-bus-endpoints:${edge.id}`,
        type: "same-bus-endpoints",
        edgeId: edge.id,
        nodeId: source.id,
        relatedNodeIds: [source.id],
        message: `图上拓扑失败：联络线 ${edge.id} 的首末端不能位于同一个母线 ${source.name} 上。`
      });
      continue;
    }

    if (sourceTerminal.type !== targetTerminal.type) {
      errors.push({
        id: `terminal-type-mismatch:${edge.id}`,
        type: "terminal-type-mismatch",
        edgeId: edge.id,
        relatedNodeIds: [source.id, target.id],
        message: `图上拓扑失败：${source.name} 与 ${target.name} 的端子类型不一致，不能连接 ${sourceTerminal.type.toUpperCase()} 与 ${targetTerminal.type.toUpperCase()}。`
      });
      continue;
    }

    union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));

    const sourceVoltage = getTerminalVoltageLevel(source, sourceTerminal.id);
    const targetVoltage = getTerminalVoltageLevel(target, targetTerminal.id);
    if (
      sourceVoltage &&
      targetVoltage &&
      !isZeroNumericText(sourceVoltage) &&
      !isZeroNumericText(targetVoltage) &&
      sourceVoltage !== targetVoltage
    ) {
      directVoltageMismatchEdges.push({ source, sourceTerminal, target, targetTerminal });
      errors.push({
        id: `voltage-mismatch:${edge.id}`,
        type: "voltage-mismatch",
        edgeId: edge.id,
        relatedNodeIds: [source.id, target.id],
        message: `图上拓扑失败：${source.name} 与 ${target.name} 电压基值不一致（${sourceVoltage} / ${targetVoltage}）。`
      });
    }
  }

  const directVoltageMismatchRoots = new Set(
    directVoltageMismatchEdges.map(({ source, sourceTerminal }) => find(terminalKey(source.id, sourceTerminal.id)))
  );
  const voltageGroups = new Map<
    string,
    {
      relatedNodeIds: Set<string>;
      voltages: Map<string, string>;
    }
  >();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const key = terminalKey(node.id, terminal.id);
      const root = find(key);
      const group = voltageGroups.get(root) ?? { relatedNodeIds: new Set<string>(), voltages: new Map<string, string>() };
      group.relatedNodeIds.add(node.id);
      const voltage = getTerminalVoltageLevel(node, terminal.id);
      if (voltage && !isZeroNumericText(voltage)) {
        group.voltages.set(voltage, voltage);
      }
      voltageGroups.set(root, group);
    }
  }
  for (const [root, group] of voltageGroups) {
    if (group.voltages.size <= 1 || directVoltageMismatchRoots.has(root)) {
      continue;
    }
    const relatedNodeIds = Array.from(group.relatedNodeIds);
    errors.push({
      id: `voltage-mismatch:${root}`,
      type: "voltage-mismatch",
      nodeId: relatedNodeIds[0],
      relatedNodeIds,
      message: `图上拓扑失败：同一拓扑节点内存在不同电压基值（${Array.from(group.voltages.values()).join(" / ")}）。`
    });
  }

  for (const node of nodes) {
    if (!isTwoTerminalTopologyDevice(node)) {
      continue;
    }
    const firstTerminal = node.terminals[0];
    const lastTerminal = node.terminals[node.terminals.length - 1];
    if (!firstTerminal || !lastTerminal) {
      continue;
    }
    const firstRoot = find(terminalKey(node.id, firstTerminal.id));
    const lastRoot = find(terminalKey(node.id, lastTerminal.id));
    if (firstRoot !== lastRoot) {
      continue;
    }
    errors.push({
      id: `same-topology-node-endpoints:${node.id}:${firstTerminal.id}:${lastTerminal.id}`,
      type: "same-topology-node-endpoints",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `图上拓扑失败：双端设备 ${node.name} 的 ${firstTerminal.label} 与 ${lastTerminal.label} 位于同一个拓扑节点，首末端不能位于同一个拓扑节点。`
    });
  }

  const connectivity = buildTopologyConnectivity(nodes, edges);
  const islandVoltageGroups = collectElectricalIslandVoltageGroups(nodes, connectivity);
  for (const [root, group] of islandVoltageGroups) {
    const relatedNodeIds = Array.from(group.relatedNodeIds);
    if (group.voltages.size === 0) {
      errors.push({
        id: `missing-island-voltage:${root}`,
        type: "missing-island-voltage",
        nodeId: relatedNodeIds[0],
        relatedNodeIds,
        message: "图上拓扑失败：拓扑岛内所有设备端子电压基值均为0，请至少设置一个设备端子的电压基值。"
      });
      continue;
    }
    if (group.voltages.size > 1) {
      errors.push({
        id: `island-voltage-mismatch:${root}`,
        type: "island-voltage-mismatch",
        nodeId: relatedNodeIds[0],
        relatedNodeIds,
        message: `图上拓扑失败：同一拓扑岛内存在多套非零电压基值（${Array.from(group.voltages.values()).join(" / ")}）。`
      });
    }
  }

  for (const node of nodes) {
    if (!isTwoWindingTransformerNode(node) && !isThreeWindingTransformer(node)) {
      continue;
    }
    const rootByTerminal = node.terminals
      .filter((terminal) => isElectricalTerminalType(terminal.type))
      .map((terminal) => ({ terminal, root: connectivity.islandRoot(node.id, terminal.id) }));
    const seenRoots = new Map<string, Terminal>();
    for (const { terminal, root } of rootByTerminal) {
      const existing = seenRoots.get(root);
      if (!existing) {
        seenRoots.set(root, terminal);
        continue;
      }
      errors.push({
        id: `transformer-island-short:${node.id}:${existing.id}:${terminal.id}`,
        type: "transformer-island-short",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑失败：${node.name} 的 ${existing.label} 与 ${terminal.label} 位于同一拓扑岛，变压器两侧不能被开关、断路器、线路或零阻抗支路短接。`
      });
      break;
    }
  }

  const topologyTerminalRefs = new Set<string>();
  for (const node of nodes) {
    if (isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      topologyTerminalRefs.add(terminalKey(node.id, terminal.id));
    }
  }
  for (const contactGroup of getTerminalBusContactGroups(nodes)) {
    for (const contact of contactGroup.contacts) {
      topologyTerminalRefs.add(terminalKey(contact.nodeId, contact.terminalId));
      topologyTerminalRefs.add(terminalKey(contact.busId, contact.busTerminalId));
    }
  }
  const topologyDegreeByRoot = new Map<string, number>();
  for (const key of topologyTerminalRefs) {
    const root = find(key);
    topologyDegreeByRoot.set(root, (topologyDegreeByRoot.get(root) ?? 0) + 1);
  }

  for (const node of nodes) {
    if (isBusNode(node) || isStaticNode(node)) continue;
    for (const terminal of node.terminals) {
      const root = find(terminalKey(node.id, terminal.id));
      if ((topologyDegreeByRoot.get(root) ?? 0) <= 1) {
        errors.push({
          id: `floating-terminal:${node.id}:${terminal.id}`,
          type: "floating-terminal",
          nodeId: node.id,
          relatedNodeIds: [node.id],
          message: `${node.name} 的 ${terminal.label} 悬空，未连接到任何设备。`
        });
      }
    }
  }

  const modelTypeVoltageRange = modelTypeVoltageRangeFor(options.modelType);
  if (modelTypeVoltageRange) {
    for (const node of nodes) {
      for (const terminal of node.terminals) {
        if (!isElectricalTerminalType(terminal.type)) continue;
        const voltageText = terminalVoltageBaseNumber(terminal.vbase);
        if (!voltageText || isZeroNumericText(voltageText)) continue;
        const voltage = Number(voltageText);
        if (!Number.isFinite(voltage)) continue;
        if (voltage < modelTypeVoltageRange.min || voltage > modelTypeVoltageRange.max) {
          errors.push({
            id: `voltage-level-out-of-model-range:${node.id}:${terminal.id}`,
            type: "voltage-level-out-of-model-range",
            nodeId: node.id,
            relatedNodeIds: [node.id],
            message: `图上拓扑失败：${options.modelType}模型仅支持 ${modelTypeVoltageRange.label} 电压等级，设备"${node.name}"的 ${terminal.label} 电压基值 ${voltageText} 超出范围。`
          });
        }
      }
    }
  }

  if (errors.length > 0 || options.includeVoltageSetpointDeviations === false) {
    return errors;
  }
  return validateVoltageSetpointDeviations(calculateElectricalTopology(nodes, edges), edges);
}

export function buildTopology(nodes: ModelNode[], edges: Edge[]): Topology {
  const topologyEdges = [...edges, ...routableLineDeviceTopologyEdges(nodes)];
  const topology: Topology = {
    nodes: Object.fromEntries(
      nodes.map((node) => [
        node.id,
        {
          id: node.id,
          degree: 0,
          neighbors: [],
          edgeIds: []
        }
      ])
    ),
    connectedComponents: []
  };
  const connectedNodePairKeys = new Set<string>();
  const nodePairKey = (firstId: string, secondId: string) =>
    firstId < secondId ? `${firstId}|${secondId}` : `${secondId}|${firstId}`;
  const addImplicitConnection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }
    const source = topology.nodes[sourceId];
    const target = topology.nodes[targetId];
    const pairKey = nodePairKey(sourceId, targetId);
    if (!source || !target || connectedNodePairKeys.has(pairKey)) {
      return;
    }
    connectedNodePairKeys.add(pairKey);
    source.neighbors.push(targetId);
    source.degree += 1;
    target.neighbors.push(sourceId);
    target.degree += 1;
  };

  for (const edge of topologyEdges) {
    const source = topology.nodes[edge.sourceId];
    const target = topology.nodes[edge.targetId];
    if (!source || !target) {
      continue;
    }
    source.neighbors.push(edge.targetId);
    source.edgeIds.push(edge.id);
    source.degree += 1;
    target.neighbors.push(edge.sourceId);
    target.edgeIds.push(edge.id);
    target.degree += 1;
    connectedNodePairKeys.add(nodePairKey(edge.sourceId, edge.targetId));
  }

  for (const overlappingGroup of getOverlappingTerminalGroups(nodes)) {
    const nodeIds = Array.from(new Set(overlappingGroup.terminals.map((terminal) => terminal.nodeId)));
    for (let firstIndex = 0; firstIndex < nodeIds.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < nodeIds.length; secondIndex += 1) {
        addImplicitConnection(nodeIds[firstIndex], nodeIds[secondIndex]);
      }
    }
  }

  for (const contactGroup of getTerminalBusContactGroups(nodes)) {
    for (const contact of contactGroup.contacts) {
      addImplicitConnection(contact.nodeId, contact.busId);
    }
  }

  const visited = new Set<string>();
  for (const node of nodes) {
    if (visited.has(node.id)) {
      continue;
    }
    const component: string[] = [];
    const stack = [node.id];
    visited.add(node.id);

    while (stack.length > 0) {
      const id = stack.pop()!;
      component.push(id);
      for (const neighbor of topology.nodes[id].neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    topology.connectedComponents.push(component);
  }

  return topology;
}

export function createModelLayer(name: string, existingLayers: ModelLayer[] = []): ModelLayer {
  return {
    id: makeId("layer"),
    name: uniqueRecordName(name, existingLayers.map((layer) => layer.name), "新建图层"),
    visible: true
  };
}

export function normalizeModelLayers(layers?: readonly ModelLayer[], nodes: readonly Pick<ModelNode, "layerId">[] = [], activeLayerId?: string): ModelLayer[] {
  const normalized: ModelLayer[] = [];
  const seenIds = new Set<string>();
  const appendLayer = (layer: Partial<ModelLayer> | undefined, fallbackId: string, fallbackName: string) => {
    const id = (layer?.id || fallbackId).trim();
    if (!id || seenIds.has(id)) {
      return;
    }
    seenIds.add(id);
    normalized.push({
      id,
      name: (layer?.name || fallbackName).trim() || fallbackName,
      visible: id === activeLayerId || layer?.visible !== false
    });
  };

  appendLayer(layers?.find((layer) => layer.id === DEFAULT_MODEL_LAYER_ID) ?? defaultModelLayer(), DEFAULT_MODEL_LAYER_ID, DEFAULT_MODEL_LAYER_NAME);
  (layers ?? [])
    .filter((layer) => layer.id !== DEFAULT_MODEL_LAYER_ID)
    .forEach((layer, index) => appendLayer(layer, `layer-${index + 1}`, `图层${index + 1}`));
  nodes.forEach((node) => {
    if (node.layerId && !seenIds.has(node.layerId)) {
      appendLayer({ id: node.layerId, name: node.layerId, visible: true }, node.layerId, node.layerId);
    }
  });
  return normalized.length > 0 ? normalized : [defaultModelLayer()];
}

export function resolveActiveModelLayerId(layers: ModelLayer[], activeLayerId?: string): string {
  return layers.some((layer) => layer.id === activeLayerId)
    ? activeLayerId!
    : layers[0]?.id ?? DEFAULT_MODEL_LAYER_ID;
}

export function normalizeModelGroups(
  groups: readonly Partial<ModelGroup>[] | undefined,
  nodes: readonly Pick<ModelNode, "id">[] = [],
  edges: readonly Pick<Edge, "id">[] = []
): ModelGroup[] {
  if (!groups || groups.length === 0) {
    return [];
  }
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const validEdgeIds = new Set(edges.map((edge) => edge.id));
  const seenGroupIds = new Set<string>();
  const uniqueValidIds = (ids: readonly string[] | undefined, validIds: ReadonlySet<string>) => {
    const seen = new Set<string>();
    return (ids ?? []).filter((id) => {
      if (!id || seen.has(id) || !validIds.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  };
  const uniqueIds = (ids: readonly string[] | undefined) => {
    const seen = new Set<string>();
    return (ids ?? []).filter((id) => {
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  };

  let normalized: ModelGroup[] = (groups ?? []).map((group, index) => {
    let id = (group.id ?? "").trim() || `group-${index + 1}`;
    if (seenGroupIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    seenGroupIds.add(id);
    const nodeIds = uniqueValidIds(group.nodeIds, validNodeIds);
    const edgeIds = uniqueValidIds(group.edgeIds, validEdgeIds);
    return {
      id,
      name: (group.name ?? "").trim(),
      nodeIds,
      edgeIds,
      childGroupIds: uniqueIds(group.childGroupIds)
    };
  });

  const hasDescendant = (
    groupsById: ReadonlyMap<string, ModelGroup>,
    groupId: string,
    targetGroupId: string,
    visiting = new Set<string>()
  ): boolean => {
    if (groupId === targetGroupId) {
      return true;
    }
    if (visiting.has(groupId)) {
      return false;
    }
    visiting.add(groupId);
    const group = groupsById.get(groupId);
    if (!group) {
      return false;
    }
    return (group.childGroupIds ?? []).some((childGroupId) => hasDescendant(groupsById, childGroupId, targetGroupId, visiting));
  };

  let changed = true;
  // 审查 T01-P0-3：安全阀——正常情况每轮至少删除一个空组/坏引用，上限取组数+1；
  // 数据损坏导致不收敛时告警退出，避免 UI 线程死循环阻塞。
  let iterations = 0;
  const maxIterations = normalized.length + 2;
  while (changed) {
    if (iterations >= maxIterations) {
      console.warn(`normalizeModelGroups: ${maxIterations} 轮未收敛，疑似数据异常，提前退出。`);
      break;
    }
    iterations += 1;
    changed = false;
    const groupIds = new Set(normalized.map((group) => group.id));
    const groupsById = new Map(normalized.map((group) => [group.id, group] as const));
    const next = normalized.flatMap((group) => {
      const childGroupIds = (group.childGroupIds ?? []).filter((childGroupId) =>
        childGroupId !== group.id &&
        groupIds.has(childGroupId) &&
        !hasDescendant(groupsById, childGroupId, group.id)
      );
      if (childGroupIds.length !== (group.childGroupIds ?? []).length) {
        changed = true;
      }
      if (group.nodeIds.length + group.edgeIds.length + childGroupIds.length < 2) {
        changed = true;
        return [];
      }
      const baseGroup = {
        id: group.id,
        name: group.name,
        nodeIds: group.nodeIds,
        edgeIds: group.edgeIds
      };
      return childGroupIds.length > 0 ? [{ ...baseGroup, childGroupIds }] : [baseGroup];
    });
    normalized = next;
  }

  return normalized.map((group, index) => ({
    ...group,
    name: group.name || `组合${index + 1}`
  }));
}

export function normalizeProjectLayers(project: ProjectFile): ProjectFile {
  const baseLayers = normalizeModelLayers(project.layers, project.nodes);
  const activeLayerId = resolveActiveModelLayerId(baseLayers, project.activeLayerId);
  const layers = normalizeModelLayers(baseLayers, project.nodes, activeLayerId);
  const layerIds = new Set(layers.map((layer) => layer.id));
  const nodes = project.nodes.map((node) => ({
    ...node,
    layerId: node.layerId && layerIds.has(node.layerId) ? node.layerId : DEFAULT_MODEL_LAYER_ID
  }));
  return {
    ...project,
    layers,
    activeLayerId,
    nodes,
    groups: normalizeModelGroups(project.groups, nodes, project.edges),
    measurements: normalizeProjectMeasurements(project.measurements, nodes)
  };
}

function modelLayerIdForOrdering(node: Pick<ModelNode, "layerId">) {
  return node.layerId ?? DEFAULT_MODEL_LAYER_ID;
}

function nodesAlreadyInModelLayerOrder(nodes: readonly Pick<ModelNode, "layerId">[], layerOrder: ReadonlyMap<string, number>) {
  let previousLayerOrder = -1;
  for (const node of nodes) {
    const currentLayerOrder = layerOrder.get(modelLayerIdForOrdering(node)) ?? 0;
    if (currentLayerOrder < previousLayerOrder) {
      return false;
    }
    previousLayerOrder = currentLayerOrder;
  }
  return true;
}

function collectNodesByModelLayerOrder<T extends Pick<ModelNode, "layerId">>(
  nodes: readonly T[],
  layers: readonly ModelLayer[],
  visibleLayerIds?: ReadonlySet<string>
): T[] {
  const buckets = new Map<string, T[]>();
  for (const node of nodes) {
    const layerId = modelLayerIdForOrdering(node);
    if (visibleLayerIds && !visibleLayerIds.has(layerId)) {
      continue;
    }
    const bucket = buckets.get(layerId);
    if (bucket) {
      bucket.push(node);
    } else {
      buckets.set(layerId, [node]);
    }
  }
  const ordered: T[] = [];
  for (const layer of layers) {
    if (visibleLayerIds && !visibleLayerIds.has(layer.id)) {
      continue;
    }
    ordered.push(...(buckets.get(layer.id) ?? []));
  }
  return ordered;
}

export function orderNodesByModelLayer<T extends Pick<ModelNode, "layerId">>(nodes: readonly T[], layers?: readonly ModelLayer[]): T[] {
  if (nodes.length < 2) {
    return nodes as T[];
  }
  const normalizedLayers = normalizeModelLayers(layers, nodes);
  const layerOrder = new Map(normalizedLayers.map((layer, index) => [layer.id, index]));
  return nodesAlreadyInModelLayerOrder(nodes, layerOrder)
    ? nodes as T[]
    : collectNodesByModelLayerOrder(nodes, normalizedLayers);
}

export function filterProjectByVisibleLayers(nodes: ModelNode[], edges: Edge[], layers?: ModelLayer[]) {
  if (!layers || layers.length === 0) {
    return { nodes, edges };
  }
  const normalizedLayers = normalizeModelLayers(layers, nodes);
  const layerOrder = new Map(normalizedLayers.map((layer, index) => [layer.id, index]));
  const visibleLayers = normalizedLayers.filter((layer) => layer.visible);
  const allLayersVisible = visibleLayers.length === normalizedLayers.length;
  if (allLayersVisible) {
    const orderedNodes = nodesAlreadyInModelLayerOrder(nodes, layerOrder)
      ? nodes
      : collectNodesByModelLayerOrder(nodes, normalizedLayers);
    return { nodes: orderedNodes, edges };
  }
  const visibleLayerIds = new Set(visibleLayers.map((layer) => layer.id));
  const visibleNodes = collectNodesByModelLayerOrder(nodes, normalizedLayers, visibleLayerIds);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  return {
    nodes: visibleNodes,
    edges: edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId))
  };
}

export function serializeProject(project: ProjectFile): string {
  return JSON.stringify(normalizeProjectLayers(lockProjectEdgeTerminals(project)), null, 2);
}

export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json) as ProjectFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Unsupported or invalid model file");
  }
  return normalizeProjectLayers(lockProjectEdgeTerminals(parsed));
}

export function lockProjectEdgeTerminals(project: ProjectFile): ProjectFile {
  const synchronized = synchronizeBusTerminalsWithEdges(project.nodes.map(normalizeNodeTerminalsByTemplate), project.edges);
  const nodes = synchronized.nodes;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const resolveTerminalId = (node: ModelNode | undefined, terminalId?: string) => {
    if (!node || node.terminals.length === 0) {
      return undefined;
    }
    return node.terminals.some((terminal) => terminal.id === terminalId)
      ? terminalId
      : node.terminals[0]?.id;
  };
  const locked = {
    ...project,
    layers: normalizeModelLayers(project.layers, nodes),
    nodes,
    edges: synchronized.edges.flatMap((edge) => {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      const sourceTerminalId = resolveTerminalId(source, edge.sourceTerminalId);
      const targetTerminalId = resolveTerminalId(target, edge.targetTerminalId);
      if (!source || !target || !sourceTerminalId || !targetTerminalId) {
        return [];
      }
      return [{
        ...edge,
        sourceTerminalId,
        targetTerminalId,
        sourcePoint: source ? (isBusNode(source) ? edge.sourcePoint : undefined) : edge.sourcePoint,
        targetPoint: target ? (isBusNode(target) ? edge.targetPoint : undefined) : edge.targetPoint
      }];
    })
  };
  return {
    ...locked,
    groups: normalizeModelGroups(project.groups, nodes, locked.edges),
    measurements: normalizeProjectMeasurements(project.measurements, nodes)
  };
}

export function createSavedProject(name: string, project: ProjectFile): SavedProjectRecord {
  const savedName = name.trim() || "未命名模型";
  // 新建记录不继承来源模型的 model_id：复制/粘贴、导入 json/svg/dot 都走这里，
  // 若把源模型的 idx 带过来，新模型会与源模型 model_id 相同，违反「模型 ID 跨方案唯一」。
  // 真正的 idx 由后端在保存时分配（saveSchemeProjectRecord → allocateStableProjectIndex）。
  const { idx: _inheritedProjectIndex, ...freshProject } = project;
  const lockedProject = normalizeProjectLayers(lockProjectEdgeTerminals(freshProject as ProjectFile));
  return {
    id: makeId("project"),
    name: savedName,
    updatedAt: new Date().toISOString(),
    project: {
      ...lockedProject,
      name: savedName,
      nodes: lockedProject.nodes.map((node) => ({ ...node, params: { ...node.params }, terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } })) })),
      edges: lockedProject.edges.map((edge) => ({
        ...edge,
        ...cloneEdgeEditablePoints(edge),
        routePoints: edge.routePoints?.map((point) => ({ ...point }))
      })),
      groups: normalizeModelGroups(lockedProject.groups, lockedProject.nodes, lockedProject.edges)
        .map((group) => ({
          ...group,
          nodeIds: [...group.nodeIds],
          edgeIds: [...group.edgeIds]
        })),
      measurements: normalizeProjectMeasurements(lockedProject.measurements, lockedProject.nodes)
    }
  };
}

export function uniqueRecordName(baseName: string, existingNames: string[], fallback: string): string {
  const base = baseName.trim() || fallback;
  const used = new Set(existingNames.map((name) => name.trim()).filter(Boolean));
  if (!used.has(base)) {
    return base;
  }
  let index = 2;
  while (used.has(`${base} (${index})`)) {
    index += 1;
  }
  return `${base} (${index})`;
}

function savedRecordTimestamp(value: string | undefined): number {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * 已存记录（模型 / 方案）的显示名归一。**唯一的业务规则出处**。
 *
 * 规则：`电力系统` → `电力能源系统`（平台改名后的兼容归一），trim，空则落 fallback。
 *
 * 原先模型与方案各有一份**逐字节相同**的实现（只差默认 fallback），
 * 共 8 个调用点依赖这条规则 —— 改一处漏一处的风险实在，现已单源化。
 * 输出逐字节不变（无参数调用时两边的默认 fallback 各自保留）。
 *
 * 跨端**刻意不合并**：`server/server.mjs` 的 `storageProjectDisplayName` 用的是
 * `String(name || "")`（容忍非字符串、且把 `0` 当空），与这里的 `name.trim()` 语义不同。
 * 合并会改变服务端对脏数据的处理，属行为变更。
 */
function savedRecordDisplayName(name: string, fallback: string): string {
  return name.trim().replace(/电力系统/g, "电力能源系统") || fallback;
}

function savedProjectDisplayName(name: string, fallback = "未命名模型"): string {
  // 名称即标识：`uniqueRecordName` 会用 “(N)” 区分重名模型，此处若把 “(N)” 归一化掉，
  // 新建/重命名/导入的同名模型会被静默合并进已有模型，模型列表看不到新条目。
  return savedRecordDisplayName(name, fallback);
}

export function savedProjectRecordNameKey(name: string): string {
  return savedProjectDisplayName(name).toLocaleLowerCase();
}

function savedSchemeDisplayName(name: string, fallback = "未命名方案"): string {
  return savedRecordDisplayName(name, fallback);
}

function savedProjectRuntimePathKey(path: string[]): string {
  return `project:${path.map((part) => encodeURIComponent(part)).join("/")}`;
}

function isValidSavedSchemeId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

let nextTransientSavedSchemeId = 1;

function allocateTransientSavedSchemeId(explicit?: number): number {
  if (isValidSavedSchemeId(explicit)) {
    nextTransientSavedSchemeId = Math.max(nextTransientSavedSchemeId, explicit + 1);
    return explicit;
  }
  return nextTransientSavedSchemeId++;
}

function normalizeSavedSchemeIdSelector(value: unknown): number | string | null {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" && /^\s*\d+\s*$/u.test(value)
      ? Number(value.trim())
      : NaN;
  if (isValidSavedSchemeId(numeric)) {
    return numeric;
  }
  const legacy = typeof value === "string" ? value.trim() : "";
  return legacy ? legacy : null;
}

export function savedSchemeIdOf(scheme: Pick<SavedSchemeRecord, "schemeId" | "id">): number | string | null {
  if (isValidSavedSchemeId(scheme.schemeId)) {
    return scheme.schemeId;
  }
  if (typeof scheme.id === "number" && isValidSavedSchemeId(scheme.id)) {
    return scheme.id;
  }
  const legacyId = typeof scheme.id === "string" ? scheme.id.trim() : "";
  if (!legacyId) {
    return null;
  }
  return /^\d+$/u.test(legacyId) ? Number(legacyId) : legacyId;
}

export function normalizeSavedSchemeRecordNames(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  const normalized: SavedSchemeRecord[] = [];
  const usedNames: string[] = [];
  let changed = false;
  for (const scheme of schemes) {
    const displayName = savedSchemeDisplayName(scheme.name);
    const name = uniqueRecordName(displayName, usedNames, "未命名方案");
    usedNames.push(name);
    const projects = Array.isArray(scheme.projects)
      ? normalizeSavedProjectRecordNames(scheme.projects)
      : [];
    const children = Array.isArray(scheme.children)
      ? normalizeSavedSchemeRecordNames(scheme.children)
      : [];
    const record = {
      ...scheme,
      name,
      projects,
      children
    };
    normalized.push(record);
    if (record !== scheme || name !== scheme.name || projects !== scheme.projects || children !== scheme.children) {
      changed = true;
    }
  }
  return changed ? normalized : schemes;
}

function hydrateSavedSchemeRuntimeIdsForPath(
  schemes: SavedSchemeRecord[],
  parentPath: string[]
): SavedSchemeRecord[] {
  return schemes.map((scheme) => {
    const schemePath = [...parentPath, savedSchemeDisplayName(scheme.name)];
    const canonicalSchemeId = isValidSavedSchemeId(scheme.schemeId) ? scheme.schemeId : undefined;
    const runtimeId = canonicalSchemeId ?? allocateTransientSavedSchemeId();
    return {
      ...scheme,
      ...(canonicalSchemeId === undefined ? { schemeId: undefined } : { schemeId: canonicalSchemeId }),
      id: String(runtimeId),
      projects: normalizeSavedProjectRecordNames(scheme.projects ?? []).map((project) => {
        const name = savedProjectDisplayName(project.name);
        return {
          ...project,
          id: savedProjectRuntimePathKey([...schemePath, name]),
          name,
          project: {
            ...project.project,
            name
          }
        };
      }),
      children: hydrateSavedSchemeRuntimeIdsForPath(scheme.children ?? [], schemePath)
    };
  });
}

export function hydrateSavedSchemeRuntimeIds(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  return hydrateSavedSchemeRuntimeIdsForPath(normalizeSavedSchemeRecordNames(schemes), []);
}

export function stripSavedSchemeRuntimeIds(schemes: SavedSchemeRecord[]): PersistedSavedSchemeRecord[] {
  return normalizeSavedSchemeRecordNames(schemes).map((scheme) => {
    const { id: _schemeRuntimeId, projects, children, ...schemeRecord } = scheme;
    return {
      ...schemeRecord,
      projects: normalizeSavedProjectRecordNames(projects ?? []).map((project) => {
        const { id: _projectRuntimeId, ...projectRecord } = project;
        return {
          ...projectRecord,
          project: {
            ...projectRecord.project,
            name: projectRecord.name
          }
        };
      }),
      children: stripSavedSchemeRuntimeIds(children ?? [])
    };
  });
}

export function normalizeSavedProjectRecordNames(projects: SavedProjectRecord[]): SavedProjectRecord[] {
  const normalized: SavedProjectRecord[] = [];
  const indexByNameKey = new Map<string, number>();
  let changed = false;
  for (const project of projects) {
    const name = savedProjectDisplayName(project.name);
    const record = {
      ...project,
      name,
      project: {
        ...project.project,
        name
      }
    };
    const key = savedProjectRecordNameKey(name);
    const existingIndex = indexByNameKey.get(key);
    if (existingIndex === undefined) {
      indexByNameKey.set(key, normalized.length);
      normalized.push(record);
      if (record !== project || name !== project.name || record.project.name !== project.project.name) {
        changed = true;
      }
      continue;
    }
    changed = true;
    const existing = normalized[existingIndex];
    const candidateTimestamp = savedRecordTimestamp(record.updatedAt);
    const existingTimestamp = savedRecordTimestamp(existing.updatedAt);
    if (candidateTimestamp >= existingTimestamp) {
      normalized[existingIndex] = record;
    }
  }
  return changed ? normalized : projects;
}

function mergeSavedProjectRecordsForStartup(localProjects: SavedProjectRecord[] = [], backendProjects: SavedProjectRecord[] = []) {
  const merged = new Map<string, SavedProjectRecord>();
  for (const project of normalizeSavedProjectRecordNames(backendProjects)) {
    merged.set(savedProjectRecordNameKey(project.name), project);
  }
  for (const project of normalizeSavedProjectRecordNames(localProjects)) {
    const key = savedProjectRecordNameKey(project.name);
    const existing = merged.get(key);
    if (!existing || savedRecordTimestamp(project.updatedAt) >= savedRecordTimestamp(existing.updatedAt)) {
      merged.set(key, project);
    }
  }
  return normalizeSavedProjectRecordNames(Array.from(merged.values()));
}

function savedSchemeRecordNameKey(name: string): string {
  return savedSchemeDisplayName(name).toLocaleLowerCase();
}

function mergeSavedSchemeLevelsForStartup(localSchemes: SavedSchemeRecord[] = [], backendSchemes: SavedSchemeRecord[] = []): SavedSchemeRecord[] {
  const merged = new Map<string, SavedSchemeRecord>();
  for (const scheme of normalizeSavedSchemeRecordNames(backendSchemes)) {
    merged.set(savedSchemeRecordNameKey(scheme.name), scheme);
  }
  for (const localScheme of normalizeSavedSchemeRecordNames(localSchemes)) {
    const key = savedSchemeRecordNameKey(localScheme.name);
    const backendScheme = merged.get(key);
    if (!backendScheme) {
      merged.set(key, localScheme);
      continue;
    }
    const localUpdatedAt = savedRecordTimestamp(localScheme.updatedAt);
    const backendUpdatedAt = savedRecordTimestamp(backendScheme.updatedAt);
    const canonicalSchemeId = backendScheme.schemeId ?? localScheme.schemeId;
    merged.set(key, {
      ...(backendUpdatedAt >= localUpdatedAt ? backendScheme : localScheme),
      ...(canonicalSchemeId === undefined ? {} : { schemeId: canonicalSchemeId }),
      name: backendScheme.name || localScheme.name,
      updatedAt: backendUpdatedAt >= localUpdatedAt ? backendScheme.updatedAt : localScheme.updatedAt,
      projects: mergeSavedProjectRecordsForStartup(localScheme.projects, backendScheme.projects),
      children: mergeSavedSchemeLevelsForStartup(localScheme.children ?? [], backendScheme.children ?? [])
    });
  }
  return normalizeSavedSchemeRecordNames(Array.from(merged.values()));
}

export function mergeSavedSchemesForStartup(localSchemes: SavedSchemeRecord[] = [], backendSchemes: SavedSchemeRecord[] = []): SavedSchemeRecord[] {
  return hydrateSavedSchemeRuntimeIds(mergeSavedSchemeLevelsForStartup(localSchemes, backendSchemes));
}

export function copySavedProjectWithUniqueName(project: SavedProjectRecord, existingNames: string[], suffix = "副本"): SavedProjectRecord {
  const name = uniqueRecordName(`${project.name} ${suffix}`, existingNames, "未命名模型");
  return createSavedProject(name, project.project);
}

function copySavedSchemeTreeWithName(scheme: SavedSchemeRecord, name: string): SavedSchemeRecord {
  const projects = scheme.projects.reduce<SavedProjectRecord[]>(
    (current, project) => upsertSavedProject(current, copySavedProjectWithUniqueName(project, current.map((item) => item.name))),
    []
  );
  const children = savedSchemeChildren(scheme).reduce<SavedSchemeRecord[]>((current, child) => {
    const childName = uniqueRecordName(child.name, current.map((item) => item.name), "未命名方案");
    return [...current, copySavedSchemeTreeWithName(child, childName)];
  }, []);
  return createSavedScheme(name, projects, children);
}

export function copySavedSchemeWithUniqueName(scheme: SavedSchemeRecord, existingNames: string[], suffix = "副本"): SavedSchemeRecord {
  const name = uniqueRecordName(`${scheme.name} ${suffix}`, existingNames, "未命名方案");
  return copySavedSchemeTreeWithName(scheme, name);
}

export function upsertSavedProject(projects: SavedProjectRecord[], record: SavedProjectRecord): SavedProjectRecord[] {
  const index = projects.findIndex((project) => project.id === record.id);
  const requestedName = savedProjectDisplayName(record.name);
  const duplicateNameIndex = projects.findIndex((project) => project.id !== record.id && savedProjectRecordNameKey(project.name) === savedProjectRecordNameKey(requestedName));
  const name = index !== -1 && duplicateNameIndex !== -1 ? projects[index].name : requestedName;
  const retainedId = index === -1 && duplicateNameIndex !== -1 ? projects[duplicateNameIndex].id : record.id;
  const nextRecord = {
    ...record,
    id: retainedId,
    name,
    updatedAt: new Date().toISOString(),
    project: { ...record.project, name }
  };
  const targetIndex = index === -1 ? duplicateNameIndex : index;
  if (targetIndex === -1) {
    return [...projects, nextRecord];
  }
  return projects.map((project, projectIndex) => (projectIndex === targetIndex ? nextRecord : project));
}

export function renameSavedProject(
  projects: SavedProjectRecord[],
  projectId: string,
  nextName: string
): SavedProjectRecord[] {
  const name = nextName.trim() || "未命名模型";
  const hasConflict = projects.some((project) => project.id !== projectId && savedProjectRecordNameKey(project.name) === savedProjectRecordNameKey(name));
  if (hasConflict) {
    return projects;
  }
  return projects.map((project) =>
    project.id === projectId
      ? { ...project, name, updatedAt: new Date().toISOString(), project: { ...project.project, name } }
      : project
  );
}

export function duplicateSavedProject(projects: SavedProjectRecord[], projectId: string): SavedProjectRecord[] {
  const source = projects.find((project) => project.id === projectId);
  if (!source) {
    return projects;
  }
  return upsertSavedProject(projects, createSavedProject(`${source.name} 副本`, source.project));
}

export function deleteSavedProject(projects: SavedProjectRecord[], projectId: string): SavedProjectRecord[] {
  return projects.filter((project) => project.id !== projectId);
}

export type SavedProjectSelection = {
  scheme: SavedSchemeRecord;
  project: SavedProjectRecord;
};

export function nextSavedProjectAfterProjectDeletion(
  schemes: SavedSchemeRecord[],
  projectId: string
): SavedProjectSelection | null {
  return nextSavedProjectAfterProjectBatchDeletion(schemes, projectId, new Set([projectId]));
}

export function nextSavedProjectAfterProjectBatchDeletion(
  schemes: SavedSchemeRecord[],
  activeProjectId: string,
  deletingProjectIds: Set<string>
): SavedProjectSelection | null {
  const owner = findSavedProjectRecordInSchemes(schemes, activeProjectId);
  if (!owner) {
    return null;
  }
  const projectIndex = owner.scheme.projects.findIndex((project) => project.id === activeProjectId);
  if (projectIndex < 0) {
    return null;
  }
  for (let index = projectIndex + 1; index < owner.scheme.projects.length; index += 1) {
    const project = owner.scheme.projects[index];
    if (!deletingProjectIds.has(project.id)) {
      return { scheme: owner.scheme, project };
    }
  }
  for (let index = projectIndex - 1; index >= 0; index -= 1) {
    const project = owner.scheme.projects[index];
    if (!deletingProjectIds.has(project.id)) {
      return { scheme: owner.scheme, project };
    }
  }
  return null;
}

export function createSavedScheme(
  name: string,
  projects: SavedProjectRecord[] = [],
  children: SavedSchemeRecord[] = [],
  schemeId?: number
): SavedSchemeRecord {
  const resolvedRuntimeId = allocateTransientSavedSchemeId(schemeId);
  return {
    ...(isValidSavedSchemeId(schemeId) ? { schemeId } : {}),
    id: String(resolvedRuntimeId),
    name: name.trim() || "未命名方案",
    updatedAt: new Date().toISOString(),
    projects,
    children
  };
}

export function flattenSavedProjects(schemes: SavedSchemeRecord[]): SavedProjectRecord[] {
  return schemes.flatMap((scheme) => [...scheme.projects, ...flattenSavedProjects(savedSchemeChildren(scheme))]);
}

export function nextGlobalProjectIndex(schemes: SavedSchemeRecord[]): number {
  const maxIndex = flattenSavedProjects(schemes).reduce((currentMax, record) => {
    const value = Number(record.project.idx);
    return Number.isSafeInteger(value) && value > currentMax ? value : currentMax;
  }, 0);
  return maxIndex + 1;
}

export function nextSavedProjectAfterSchemeDeletion(
  schemes: SavedSchemeRecord[],
  activeSchemeId: number | string,
  deletingSchemeIds: Set<number | string>
): SavedProjectSelection | null {
  const flatSchemes = flattenSavedSchemes(schemes);
  const normalizedActiveId = normalizeSavedSchemeIdSelector(activeSchemeId);
  const normalizedDeletingIds = new Set([...deletingSchemeIds].map(normalizeSavedSchemeIdSelector).filter((id): id is number | string => id !== null));
  const activeIndex = normalizedActiveId === null
    ? -1
    : flatSchemes.findIndex((scheme) => savedSchemeIdOf(scheme) === normalizedActiveId);
  const startIndex = activeIndex >= 0 ? activeIndex : -1;
  const canSelectScheme = (scheme: SavedSchemeRecord) =>
    savedSchemeIdOf(scheme) !== null && !normalizedDeletingIds.has(savedSchemeIdOf(scheme) as number | string) && scheme.projects.length > 0;
  for (let index = startIndex + 1; index < flatSchemes.length; index += 1) {
    const scheme = flatSchemes[index];
    if (canSelectScheme(scheme)) {
      return { scheme, project: scheme.projects[0] };
    }
  }
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const scheme = flatSchemes[index];
    if (canSelectScheme(scheme)) {
      return { scheme, project: scheme.projects[scheme.projects.length - 1] };
    }
  }
  return null;
}

export type SavedProjectPathOption = {
  scheme: SavedSchemeRecord;
  project: SavedProjectRecord;
  schemePath: string[];
  label: string;
};

export function savedProjectPathOptions(
  schemes: SavedSchemeRecord[],
  excludeProjectId = "",
  parentPath: string[] = []
): SavedProjectPathOption[] {
  return schemes.flatMap((scheme) => {
    const schemePath = [...parentPath, scheme.name];
    const projectOptions = scheme.projects
      .filter((project) => project.id !== excludeProjectId)
      .map((project) => ({
        scheme,
        project,
        schemePath,
        label: [...schemePath, project.name].join(" / ")
      }));
    return [
      ...projectOptions,
      ...savedProjectPathOptions(savedSchemeChildren(scheme), excludeProjectId, schemePath)
    ];
  });
}

export function findSavedSchemeById(
  schemes: SavedSchemeRecord[],
  schemeId: number | string
): SavedSchemeRecord | undefined {
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  if (normalizedId === null) {
    return undefined;
  }
  for (const scheme of schemes) {
    if (savedSchemeIdOf(scheme) === normalizedId) {
      return scheme;
    }
    const child = findSavedSchemeById(savedSchemeChildren(scheme), normalizedId);
    if (child) {
      return child;
    }
  }
  return undefined;
}

export function findSavedSchemeParentById(
  schemes: SavedSchemeRecord[],
  schemeId: number | string
): SavedSchemeRecord | undefined {
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  if (normalizedId === null) {
    return undefined;
  }
  for (const scheme of schemes) {
    if (savedSchemeChildren(scheme).some((child) => savedSchemeIdOf(child) === normalizedId)) {
      return scheme;
    }
    const parent = findSavedSchemeParentById(savedSchemeChildren(scheme), normalizedId);
    if (parent) {
      return parent;
    }
  }
  return undefined;
}

export function findSavedProjectRecordInSchemes(
  schemes: SavedSchemeRecord[],
  projectId: string,
  preferredSchemeId: number | string = ""
): { scheme: SavedSchemeRecord; project: SavedProjectRecord } | null {
  if (!projectId) {
    return null;
  }
  const flattenedSchemes = flattenSavedSchemes(schemes);
  const normalizedPreferredId = normalizeSavedSchemeIdSelector(preferredSchemeId);
  const preferredScheme = normalizedPreferredId === null
    ? undefined
    : flattenedSchemes.find((scheme) => savedSchemeIdOf(scheme) === normalizedPreferredId);
  const searchSchemes = preferredScheme
    ? [preferredScheme, ...flattenedSchemes.filter((scheme) => savedSchemeIdOf(scheme) !== savedSchemeIdOf(preferredScheme))]
    : flattenedSchemes;
  for (const scheme of searchSchemes) {
    const project = scheme.projects.find((item) => item.id === projectId);
    if (project) {
      return { scheme, project };
    }
  }
  return null;
}

export function savedSchemeSiblingNames(
  schemes: SavedSchemeRecord[],
  schemeId: number | string,
  excludeSchemeId: number | string = ""
): string[] {
  const parent = findSavedSchemeParentById(schemes, schemeId);
  const siblings = parent ? savedSchemeChildren(parent) : schemes;
  const normalizedExcludeId = normalizeSavedSchemeIdSelector(excludeSchemeId);
  return siblings
    .filter((scheme) => normalizedExcludeId === null || savedSchemeIdOf(scheme) !== normalizedExcludeId)
    .map((scheme) => scheme.name);
}

export function savedChildSchemeNames(schemes: SavedSchemeRecord[], parentSchemeId: number | string = ""): string[] {
  if (normalizeSavedSchemeIdSelector(parentSchemeId) === null) {
    return schemes.map((scheme) => scheme.name);
  }
  const parent = findSavedSchemeById(schemes, parentSchemeId);
  return parent ? savedSchemeChildren(parent).map((scheme) => scheme.name) : [];
}

export function mapSavedSchemeTree(
  schemes: SavedSchemeRecord[],
  mapper: (scheme: SavedSchemeRecord) => SavedSchemeRecord
): SavedSchemeRecord[] {
  let changed = false;
  const mapped = schemes.map((scheme) => {
    const children = savedSchemeChildren(scheme);
    const nextChildren = children.length > 0 ? mapSavedSchemeTree(children, mapper) : children;
    const normalizedScheme = nextChildren !== children ? { ...scheme, children: nextChildren } : scheme;
    const nextScheme = mapper(normalizedScheme);
    if (nextScheme !== scheme) {
      changed = true;
    }
    return nextScheme;
  });
  return changed ? mapped : schemes;
}

export function insertChildSavedScheme(
  schemes: SavedSchemeRecord[],
  parentSchemeId: number | string,
  childScheme: SavedSchemeRecord
): SavedSchemeRecord[] {
  const normalizedParentId = normalizeSavedSchemeIdSelector(parentSchemeId);
  if (normalizedParentId === null) {
    return [...schemes, childScheme];
  }
  const now = new Date().toISOString();
  let inserted = false;
  const nextSchemes = mapSavedSchemeTree(schemes, (scheme) => {
    if (savedSchemeIdOf(scheme) !== normalizedParentId) {
      return scheme;
    }
    inserted = true;
    return {
      ...scheme,
      updatedAt: now,
      children: [...savedSchemeChildren(scheme), childScheme]
    };
  });
  return inserted ? nextSchemes : [...schemes, childScheme];
}

export function replaceSavedSchemeById(
  schemes: SavedSchemeRecord[],
  schemeId: number | string,
  replacement: SavedSchemeRecord
): SavedSchemeRecord[] {
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  return normalizedId === null
    ? schemes
    : mapSavedSchemeTree(schemes, (scheme) => (savedSchemeIdOf(scheme) === normalizedId ? replacement : scheme));
}

export function upsertSavedProjectInScheme(
  schemes: SavedSchemeRecord[],
  schemeId: number | string,
  record: SavedProjectRecord
): SavedSchemeRecord[] {
  const now = new Date().toISOString();
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  if (normalizedId === null) {
    return schemes;
  }
  return mapSavedSchemeTree(schemes, (scheme) =>
    savedSchemeIdOf(scheme) === normalizedId
      ? {
          ...scheme,
          updatedAt: now,
          projects: upsertSavedProject(scheme.projects, record)
        }
      : scheme
  );
}

export function deleteSavedProjectsFromSchemes(
  schemes: SavedSchemeRecord[],
  projectIds: Set<string>
): SavedSchemeRecord[] {
  return mapSavedSchemeTree(schemes, (scheme) => {
    if (!scheme.projects.some((project) => projectIds.has(project.id))) {
      return scheme;
    }
    return {
      ...scheme,
      updatedAt: new Date().toISOString(),
      projects: scheme.projects.filter((project) => !projectIds.has(project.id))
    };
  });
}

export function renameSavedScheme(
  schemes: SavedSchemeRecord[],
  schemeId: number | string,
  nextName: string
): SavedSchemeRecord[] {
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  if (normalizedId === null) {
    return schemes;
  }
  const name = nextName.trim() || "未命名方案";
  const renameInLevel = (level: SavedSchemeRecord[]): { schemes: SavedSchemeRecord[]; changed: boolean } => {
    const target = level.find((scheme) => savedSchemeIdOf(scheme) === normalizedId);
    if (target) {
      const hasConflict = level.some((scheme) => savedSchemeIdOf(scheme) !== normalizedId && scheme.name.trim() === name);
      if (hasConflict) {
        return { schemes: level, changed: false };
      }
      return {
        schemes: level.map((scheme) =>
          savedSchemeIdOf(scheme) === normalizedId ? { ...scheme, name, updatedAt: new Date().toISOString() } : scheme
        ),
        changed: true
      };
    }
    let changed = false;
    const nextLevel = level.map((scheme) => {
      const result = renameInLevel(savedSchemeChildren(scheme));
      if (!result.changed) {
        return scheme;
      }
      changed = true;
      return { ...scheme, updatedAt: new Date().toISOString(), children: result.schemes };
    });
    return { schemes: changed ? nextLevel : level, changed };
  };
  return renameInLevel(schemes).schemes;
}

export function deleteSavedScheme(schemes: SavedSchemeRecord[], schemeId: number | string): SavedSchemeRecord[] {
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  if (normalizedId === null) {
    return schemes;
  }
  let changed = false;
  const nextSchemes = schemes.flatMap((scheme) => {
    if (savedSchemeIdOf(scheme) === normalizedId) {
      changed = true;
      return [];
    }
    const children = savedSchemeChildren(scheme);
    const nextChildren = children.length > 0 ? deleteSavedScheme(children, normalizedId) : children;
    if (nextChildren !== children) {
      changed = true;
      return [{ ...scheme, updatedAt: new Date().toISOString(), children: nextChildren }];
    }
    return [scheme];
  });
  return changed ? nextSchemes : schemes;
}

function savedSchemeTreeContainsId(scheme: SavedSchemeRecord, schemeId: number | string): boolean {
  const normalizedId = normalizeSavedSchemeIdSelector(schemeId);
  return normalizedId !== null && (savedSchemeIdOf(scheme) === normalizedId || savedSchemeChildren(scheme).some((child) => savedSchemeTreeContainsId(child, normalizedId)));
}

function removeSavedSchemesByIds(
  schemes: SavedSchemeRecord[],
  schemeIds: Set<number | string>,
  updatedAt: string
): { schemes: SavedSchemeRecord[]; changed: boolean } {
  const normalizedIds = new Set([...schemeIds].map(normalizeSavedSchemeIdSelector).filter((id): id is number => id !== null));
  let changed = false;
  const nextSchemes = schemes.flatMap((scheme) => {
    if (savedSchemeIdOf(scheme) !== null && normalizedIds.has(savedSchemeIdOf(scheme) as number)) {
      changed = true;
      return [];
    }
    const children = savedSchemeChildren(scheme);
    const childResult = children.length > 0
      ? removeSavedSchemesByIds(children, normalizedIds, updatedAt)
      : { schemes: children, changed: false };
    if (!childResult.changed) {
      return [scheme];
    }
    changed = true;
    return [{ ...scheme, updatedAt, children: childResult.schemes }];
  });
  return { schemes: changed ? nextSchemes : schemes, changed };
}

export function moveSavedSchemeToParent(
  schemes: SavedSchemeRecord[],
  schemeId: number | string,
  targetParentSchemeId: number | string,
  options: { targetName?: string; overwriteSchemeId?: number | string } = {}
): SavedSchemeRecord[] {  const sourceScheme = findSavedSchemeById(schemes, schemeId);
  const normalizedSchemeId = normalizeSavedSchemeIdSelector(schemeId);
  const normalizedTargetParentId = normalizeSavedSchemeIdSelector(targetParentSchemeId);
  if (!sourceScheme || normalizedSchemeId === null || (normalizedTargetParentId !== null && normalizedSchemeId === normalizedTargetParentId)) {
    return schemes;
  }
  if (normalizedTargetParentId !== null && savedSchemeTreeContainsId(sourceScheme, normalizedTargetParentId)) {
    return schemes;
  }
  const targetParentScheme = normalizedTargetParentId === null ? undefined : findSavedSchemeById(schemes, normalizedTargetParentId);
  if (normalizedTargetParentId !== null && !targetParentScheme) {
    return schemes;
  }
  const overwriteSchemeId = normalizeSavedSchemeIdSelector(options.overwriteSchemeId);
  if (overwriteSchemeId !== null && (overwriteSchemeId === normalizedSchemeId || savedSchemeTreeContainsId(sourceScheme, overwriteSchemeId))) {
    return schemes;
  }
  const targetSiblings = targetParentScheme ? savedSchemeChildren(targetParentScheme) : schemes;
  if (overwriteSchemeId !== null && !targetSiblings.some((scheme) => savedSchemeIdOf(scheme) === overwriteSchemeId)) {
    return schemes;
  }
  const sourceParentId = savedSchemeIdOf(findSavedSchemeParentById(schemes, normalizedSchemeId) ?? ({} as SavedSchemeRecord));
  const targetName = (options.targetName ?? sourceScheme.name).trim() || "未命名方案";
  if (overwriteSchemeId === null) {
    const hasNameConflict = targetSiblings.some((scheme) => savedSchemeIdOf(scheme) !== normalizedSchemeId && scheme.name.trim() === targetName);
    if (hasNameConflict) {
      return schemes;
    }
  }
  if (sourceParentId === normalizedTargetParentId && targetName === sourceScheme.name && overwriteSchemeId === null) {
    return schemes;
  }
  const now = new Date().toISOString();
  const movedScheme: SavedSchemeRecord = { ...sourceScheme, name: targetName, updatedAt: now };
  const removeIds = new Set<number | string>([normalizedSchemeId, ...(overwriteSchemeId === null ? [] : [overwriteSchemeId])]);
  const removed = removeSavedSchemesByIds(schemes, removeIds, now);
  if (!removed.changed) {
    return schemes;
  }
  if (normalizedTargetParentId === null) {
    return [...removed.schemes, movedScheme];
  }
  let inserted = false;
  const insertedSchemes = mapSavedSchemeTree(removed.schemes, (scheme) => {
    if (savedSchemeIdOf(scheme) !== normalizedTargetParentId) {
      return scheme;
    }
    inserted = true;
    return {
      ...scheme,
      updatedAt: now,
      children: [...savedSchemeChildren(scheme), movedScheme]
    };
  });
  return inserted ? insertedSchemes : schemes;
}

/**
 * 把方案移动到指定父级下的**指定位置**（面板拖动排序的跨层级落点用）。
 * 与 moveSavedSchemeToParent 的差别：
 *   · 支持目标父级为空串（移到**根层**）；
 *   · 支持 insertBeforeId —— 插到该兄弟之前（为空则追加到该父级末尾）。
 * 返回新树；源方案不存在 / 目标父级不存在 / 目标在源子树内（原样返回，不成环）时返回原树。
 */
export function moveSavedSchemeToPosition(
  schemes: SavedSchemeRecord[],
  schemeId: number | string,
  targetParentSchemeId: number | string,
  insertBeforeId?: number | string
): SavedSchemeRecord[] {
  const sourceScheme = findSavedSchemeById(schemes, schemeId);
  const normalizedSchemeId = normalizeSavedSchemeIdSelector(schemeId);
  const normalizedTargetParentId = normalizeSavedSchemeIdSelector(targetParentSchemeId);
  const normalizedInsertBeforeId = normalizeSavedSchemeIdSelector(insertBeforeId);
  if (!sourceScheme || normalizedSchemeId === null || (normalizedTargetParentId !== null && normalizedSchemeId === normalizedTargetParentId)) {
    return schemes;
  }
  if (normalizedTargetParentId !== null && savedSchemeTreeContainsId(sourceScheme, normalizedTargetParentId)) {
    // 目标父级在源子树内 —— 移动会成环，拒绝。
    return schemes;
  }
  const now = new Date().toISOString();
  const movedScheme: SavedSchemeRecord = { ...sourceScheme, updatedAt: now };
  const removed = removeSavedSchemesByIds(schemes, new Set([normalizedSchemeId]), now);
  if (!removed.changed) {
    return schemes;
  }
  const insertInto = (siblings: SavedSchemeRecord[]): SavedSchemeRecord[] => {
    if (normalizedInsertBeforeId === null) {
      return [...siblings, movedScheme];
    }
    const index = siblings.findIndex((scheme) => savedSchemeIdOf(scheme) === normalizedInsertBeforeId);
    if (index < 0) {
      return [...siblings, movedScheme];
    }
    const next = siblings.slice();
    next.splice(index, 0, movedScheme);
    return next;
  };
  if (normalizedTargetParentId === null) {
    return insertInto(removed.schemes);
  }
  let inserted = false;
  const insertedSchemes = mapSavedSchemeTree(removed.schemes, (scheme) => {
    if (savedSchemeIdOf(scheme) !== normalizedTargetParentId) {
      return scheme;
    }
    inserted = true;
    return { ...scheme, updatedAt: now, children: insertInto(savedSchemeChildren(scheme)) };
  });
  return inserted ? insertedSchemes : schemes;
}

export function moveProjectToScheme(
  schemes: SavedSchemeRecord[],
  projectId: string,
  targetSchemeId: number | string
): SavedSchemeRecord[] {
  const sourceRecord = findSavedProjectRecordInSchemes(schemes, projectId);
  const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
  const normalizedTargetSchemeId = normalizeSavedSchemeIdSelector(targetSchemeId);
  const sourceSchemeId = sourceRecord ? savedSchemeIdOf(sourceRecord.scheme) : null;
  const project = sourceRecord?.project;
  if (!sourceRecord || !targetScheme || !project || sourceSchemeId === null || normalizedTargetSchemeId === null || sourceSchemeId === normalizedTargetSchemeId) {
    return schemes;
  }
  const now = new Date().toISOString();
  return mapSavedSchemeTree(schemes, (scheme) => {
    if (savedSchemeIdOf(scheme) === sourceSchemeId) {
      return { ...scheme, updatedAt: now, projects: scheme.projects.filter((item) => item.id !== projectId) };
    }
    if (savedSchemeIdOf(scheme) === normalizedTargetSchemeId) {
      return { ...scheme, updatedAt: now, projects: upsertSavedProject(scheme.projects, project) };
    }
    return scheme;
  });
}

export function calculateNodeBodyBounds(node: ModelNode, padding = 0, position = node.position): GeometryBounds {
  return bodyVisualBoxForNode(node, padding, position);
}

export function calculateNodeVisualBounds(node: ModelNode, padding = 0, position = node.position): GeometryBounds {
  const bodyBox = bodyVisualBoxForNode(node, padding, position);
  const routeBox = routableLineDeviceRouteBox(node, padding, position);
  const labelBox = nodeLabelVisualBox(node, padding, position);
  const boxes = [bodyBox, routeBox, labelBox].filter((box): box is RouteBlockerBox => Boolean(box));
  return mergeRouteBlockerBoxes(boxes);
}

export function calculateModelContentSize(
  nodes: ModelNode[],
  edges: Edge[],
  routedEdges: RoutedEdge[] = [],
  padding = 0
): CanvasBounds {
  let right = 0;
  let bottom = 0;
  const includePoint = (point?: Point) => {
    if (!point) {
      return;
    }
    right = Math.max(right, point.x + padding);
    bottom = Math.max(bottom, point.y + padding);
  };

  for (const node of nodes) {
    const box = calculateNodeVisualBounds(node, padding);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  for (const edge of edges) {
    includePoint(edge.sourcePoint);
    includePoint(edge.targetPoint);
    if (edge.manualPoints) {
      for (const point of edge.manualPoints) {
        includePoint(point);
      }
    }
  }
  for (const route of routedEdges) {
    for (const point of route.points) {
      includePoint(point);
    }
  }

  return {
    width: Math.max(0, Math.ceil(right)),
    height: Math.max(0, Math.ceil(bottom))
  };
}

function oppositeEdgeSide(side: EdgeSide): EdgeSide {
  return side === "source" ? "target" : "source";
}

export function resolveStraightBusSlideEndpointToPoint(options: {
  edge: Edge;
  sourceNode: ModelNode;
  targetNode: ModelNode;
  movingEndpoint: EdgeSide;
  movingPoint: Point;
  nodes: ModelNode[];
  nextNodes?: ModelNode[];
  busNode?: ModelNode;
  movingNode?: ModelNode;
  movingTerminalId?: string;
  originalMovingPoint?: Point;
}): Pick<Edge, "sourcePoint"> | Pick<Edge, "targetPoint"> | null {
  // Bus endpoint positions are user-controlled; automatic rerouting must not slide them.
  void options;
  return null;
}

export function resolveStraightBusSlideEndpoint(options: {
  edge: Edge;
  sourceNode: ModelNode;
  targetNode: ModelNode;
  nextSourceNode: ModelNode;
  nextTargetNode: ModelNode;
  movingEndpoint: EdgeSide;
  nodes: ModelNode[];
  nextNodes?: ModelNode[];
  originalMovingPoint?: Point;
}): Pick<Edge, "sourcePoint"> | Pick<Edge, "targetPoint"> | null {
  const { edge, movingEndpoint } = options;
  const busEndpoint = oppositeEdgeSide(movingEndpoint);
  const sourceBySide = {
    source: options.sourceNode,
    target: options.targetNode
  };
  const nextBySide = {
    source: options.nextSourceNode,
    target: options.nextTargetNode
  };
  const busNode = nextBySide[busEndpoint];
  const originalBusNode = sourceBySide[busEndpoint];
  const movingNode = nextBySide[movingEndpoint];
  if (!isBusNode(busNode) || !isBusNode(originalBusNode) || isBusNode(movingNode)) {
    return null;
  }
  const movingTerminalId = edgeTerminalId(edge, movingEndpoint);
  const movedPoint = getEdgeEndpointPoint(movingNode, edgeEndpointStoredPoint(edge, movingEndpoint), movingTerminalId);
  return resolveStraightBusSlideEndpointToPoint({
    edge,
    sourceNode: options.sourceNode,
    targetNode: options.targetNode,
    movingEndpoint,
    movingPoint: movedPoint,
    nodes: options.nodes,
    nextNodes: options.nextNodes,
    busNode,
    movingNode,
    movingTerminalId,
    originalMovingPoint: options.originalMovingPoint
  });
}

const ROUTE_MIN_MOVABLE_SEGMENT_LENGTH = 18;

export type TidyRouteOptions = {
  blockers?: ModelNode[];
};

export function tidyOrthogonalRoute(points: Point[], options: TidyRouteOptions = {}): Point[] {
  return simplifyRoutePreservingEndpointStubs(points, {
    blockers: options.blockers,
    reduceTinyDoglegs: true
  });
}

export function buildManualConnectionPreviewRoute(
  sourcePoint: Point,
  manualPoints: Point[],
  targetPoint: Point,
  bounds?: CanvasBounds
): Point[] {
  const points = [sourcePoint, ...manualPoints, targetPoint].map((point) =>
    bounds ? clampPointToBounds(point, bounds) : point
  );
  return simplifyRoutePreservingEndpointStubs(orthogonalizeRouteKeepingCollinear(points));
}

export function buildManualConnectionPreviewPath(
  sourcePoint: Point,
  manualPoints: Point[],
  targetPoint: Point,
  bounds?: CanvasBounds
): string {
  return pointsToOrthogonalPath(buildManualConnectionPreviewRoute(sourcePoint, manualPoints, targetPoint, bounds));
}

/**
 * 交互预览路径的最小避障修正。
 *
 * 拖动设备或连接线时，调用方已经先按用户手势生成了一条正交折线；
 * 这里只在该折线穿过设备时复用正式路由器修复，未碰撞时保持用户拖出的形状。
 * 不写入 routePoints，避免 routeEdgesForStoredRendering 把不安全的存量路径直接原样返回。
 */
export function repairInteractiveConnectionRoute(
  nodes: ModelNode[],
  edge: Edge,
  points: Point[],
  bounds?: CanvasBounds
): Point[] {
  const normalizedPoints = orthogonalizeRouteKeepingCollinear(points.map((point) => ({ ...point })));
  if (normalizedPoints.length < 2) {
    return normalizedPoints;
  }
  const previewEdge: Edge = {
    ...edge,
    manualPoints: normalizedPoints.length > 4
      ? normalizedPoints.slice(2, -2).map((point) => ({ ...point }))
      : normalizedPoints.slice(1, -1).map((point) => ({ ...point }))
  };
  delete previewEdge.routePoints;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  const endpointNodes = [nodeById.get(edge.sourceId), nodeById.get(edge.targetId)].filter(
    (node): node is ModelNode => Boolean(node)
  );
  const blockers = getRouteBlockingCandidateNodes(
    normalizedPoints,
    previewEdge,
    nodes.filter((node) => node.id !== edge.sourceId && node.id !== edge.targetId)
  );
  if (
    !routeIntersectsEndpointNodeBodies(normalizedPoints, previewEdge, endpointNodes) &&
    !routeIntersectsSpecificNodes(normalizedPoints, previewEdge, blockers)
  ) {
    return normalizedPoints;
  }
  const repaired = source && target
    ? routeOrthogonalEdge(source, target, nodes, edgeWithoutManualPoints(previewEdge), [], bounds)
    : undefined;
  return repaired?.length ? repaired.map((point) => ({ ...point })) : normalizedPoints;
}

/**
 * 可变线路拖动预览/提交的避障修正。
 * `setRoutableLineDeviceCanvasPoints` 只负责把画布点写回线路节点，
 * 这里再经过同一套线路安全检查，确保线路本体也不会穿过设备。
 */
export function repairInteractiveRoutableLineDeviceRoute(
  nodes: ModelNode[],
  lineNode: ModelNode,
  points: Point[],
  bounds?: CanvasBounds
): ModelNode {
  const candidate = setRoutableLineDeviceCanvasPoints(lineNode, points);
  const routingNodes = nodes.map((node) => node.id === candidate.id ? candidate : node);
  if (!routableLineStoredPathSafety(candidate, routingNodes).unsafe) {
    return candidate;
  }
  const updates = rebuildRoutableLineDeviceRouteUpdates(
    routingNodes,
    [candidate.id],
    bounds,
    routingNodes
  );
  return updates.find((node) => node.id === candidate.id) ?? candidate;
}

export type EdgePointerClick = {
  edgeId: string;
  clientX: number;
  clientY: number;
  at: number;
};

export function isRepeatedEdgePointerClick(
  previous: EdgePointerClick | null | undefined,
  next: EdgePointerClick,
  maxIntervalMs = 450,
  maxDistance = 8
): boolean {
  return Boolean(
    previous &&
    previous.edgeId === next.edgeId &&
    next.at - previous.at >= 0 &&
    next.at - previous.at <= maxIntervalMs &&
    Math.hypot(next.clientX - previous.clientX, next.clientY - previous.clientY) <= maxDistance
  );
}

export function preserveConnectionEdgeRouteShape(
  nodes: ModelNode[],
  edge: Edge,
  routePoints: Point[] | undefined,
  bounds?: CanvasBounds,
  options: { routeDelta?: Point } = {}
): Edge {
  if (!routePoints || routePoints.length < 2) {
    return edge;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
  const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
  if (!source || !target) {
    return edge;
  }
  const originalStart = routePoints[0];
  const originalEnd = routePoints[routePoints.length - 1];
  if (!originalStart || !originalEnd) {
    return edge;
  }
  const routeEdge: Edge = {
    ...edge,
    sourcePoint: isBusNode(source) && !edge.sourcePoint ? { ...originalStart } : edge.sourcePoint,
    targetPoint: isBusNode(target) && !edge.targetPoint ? { ...originalEnd } : edge.targetPoint
  };
  const nextStart = getEdgeEndpointPoint(source, routeEdge.sourcePoint, routeEdge.sourceTerminalId);
  const nextEnd = getEdgeEndpointPoint(target, routeEdge.targetPoint, routeEdge.targetTerminalId);
  const sourceNormal = routeEndpointNormal(source, nextStart, nextEnd, edge.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, nextEnd, nextStart, edge.targetTerminalId);
  const preserved = preserveDraggedRouteShape({
    routePoints,
    nextStart,
    nextEnd,
    sourceDelta: { x: nextStart.x - originalStart.x, y: nextStart.y - originalStart.y },
    targetDelta: { x: nextEnd.x - originalEnd.x, y: nextEnd.y - originalEnd.y },
    routeDelta: options.routeDelta,
    sourceNormal,
    targetNormal
  });
  const bounded = bounds
    ? orthogonalizeRouteKeepingCollinear(preserved.map((point) => clampPointToBounds(point, bounds)))
    : preserved;
  if (samePointList(edge.routePoints ?? [], bounded)) {
    return edge;
  }
  return edgeWithCommitManualPoints(routeEdge, {
    edgeId: edge.id,
    points: bounded,
    path: pointsToOrthogonalPath(bounded)
  });
}

export function getMovableRouteSegmentIndexes(routePoints: Point[]): number[] {
  const segments: Array<{ index: number; length: number }> = [];
  for (let segmentIndex = 1; segmentIndex < routePoints.length - 2; segmentIndex += 1) {
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || samePoint(from, to)) {
      continue;
    }
    if (from.x !== to.x && from.y !== to.y) {
      continue;
    }
    segments.push({ index: segmentIndex, length: segmentManhattanLength(from, to) });
  }
  const longerSegments = segments.filter((segment) => segment.length >= ROUTE_MIN_MOVABLE_SEGMENT_LENGTH);
  return (longerSegments.length > 0 ? longerSegments : segments).map((segment) => segment.index);
}

export function realignConnectionEdgeBusEndpointPoints(nodes: ModelNode[], edge: Edge): Edge {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return edge;
  }
  if (isBusNode(source) && !isBusNode(target)) {
    const targetPoint = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
    const targetNormal = routeEndpointNormal(target, targetPoint, getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId), edge.targetTerminalId);
    const sourcePoint = alignBusEndpointPointToRouteSegmentExtension(source, edge.routePoints ?? [], "source") ?? projectPointToBusCenterline(source, {
      x: Math.round(targetPoint.x + targetNormal.x * ROUTE_ENDPOINT_STUB_LENGTH),
      y: Math.round(targetPoint.y + targetNormal.y * ROUTE_ENDPOINT_STUB_LENGTH)
    });
    return edge.sourcePoint && samePoint(projectPointToBusCenterline(source, edge.sourcePoint), sourcePoint)
      ? edge
      : { ...edge, sourcePoint };
  }
  if (isBusNode(target) && !isBusNode(source)) {
    const sourcePoint = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
    const sourceNormal = routeEndpointNormal(source, sourcePoint, getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId), edge.sourceTerminalId);
    const targetPoint = alignBusEndpointPointToRouteSegmentExtension(target, edge.routePoints ?? [], "target") ?? projectPointToBusCenterline(target, {
      x: Math.round(sourcePoint.x + sourceNormal.x * ROUTE_ENDPOINT_STUB_LENGTH),
      y: Math.round(sourcePoint.y + sourceNormal.y * ROUTE_ENDPOINT_STUB_LENGTH)
    });
    return edge.targetPoint && samePoint(projectPointToBusCenterline(target, edge.targetPoint), targetPoint)
      ? edge
      : { ...edge, targetPoint };
  }
  return edge;
}

/** 按稳定边顺序把自动连接线等间距铺到母线可连接中心线。 */
export function equalizeBusConnectionEdgeEndpointPoints(nodes: ModelNode[], edges: Edge[]): Edge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const updates = new Map<string, Edge>();
  const busEntries = new Map<string, Array<{ edge: Edge; endpoint: "source" | "target" }>>();
  for (const edge of edges) {
    if (edge.manualPoints?.length) {
      continue;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && isBusNode(source) && target && !isBusNode(target)) {
      const list = busEntries.get(source.id) ?? [];
      list.push({ edge, endpoint: "source" });
      busEntries.set(source.id, list);
    }
    if (target && isBusNode(target) && source && !isBusNode(source)) {
      const list = busEntries.get(target.id) ?? [];
      list.push({ edge, endpoint: "target" });
      busEntries.set(target.id, list);
    }
  }
  for (const [busId, entries] of busEntries) {
    const bus = nodeById.get(busId);
    if (!bus || entries.length < 2) continue;
    entries.sort((left, right) => {
      const edgeOrder = left.edge.id < right.edge.id ? -1 : left.edge.id > right.edge.id ? 1 : 0;
      if (edgeOrder !== 0) return edgeOrder;
      return left.endpoint < right.endpoint ? -1 : left.endpoint > right.endpoint ? 1 : 0;
    });
    const halfWidth = Math.max(1, Math.abs(bus.size.width * (bus.scaleX ?? bus.scale ?? 1)) / 2);
    const connectableHalfWidth = busConnectableHalfWidth(halfWidth);
    const step = entries.length > 1 ? (connectableHalfWidth * 2) / (entries.length - 1) : 0;
    const radians = degreesToRadians(bus.rotation);
    for (let index = 0; index < entries.length; index += 1) {
      const scalar = -connectableHalfWidth + step * index;
      const point = {
        x: Math.round(bus.position.x + scalar * Math.cos(radians)),
        y: Math.round(bus.position.y + scalar * Math.sin(radians))
      };
      const entry = entries[index];
      const next = entry.endpoint === "source"
        ? { ...entry.edge, sourcePoint: point }
        : { ...entry.edge, targetPoint: point };
      updates.set(entry.edge.id, next);
    }
  }
  return edges.map((edge) => updates.get(edge.id) ?? edge);
}

function manualConnectionRoutePointsForBusEndpointAlignment(nodes: ModelNode[], edge: Edge): Point[] | undefined {
  if (!edge.manualPoints?.length) {
    return undefined;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return undefined;
  }
  const routingEdge = edgeWithProjectedMissingBusEndpointPoints(edge, source, target);
  const start = getEdgeEndpointPoint(source, routingEdge.sourcePoint, routingEdge.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, routingEdge.targetPoint, routingEdge.targetTerminalId);
  return [start, ...edge.manualPoints.map((point) => ({ ...point })), end];
}

type SavedPathRenderingOptions = ManualRouteDisplayOptions & {
  refreshCrossingArcs?: boolean;
};

export function routeEdgesForSavedPathRendering(
  nodes: ModelNode[],
  edges: Edge[],
  bounds?: CanvasBounds,
  options: SavedPathRenderingOptions = {}
): RoutedEdge[] {
  let nodeById: Map<string, ModelNode> | null = null;
  const getNode = (nodeId: string) => {
    if (!nodeById) {
      nodeById = new Map(nodes.map((node) => [node.id, node]));
    }
    return nodeById.get(nodeId);
  };
  const directSavedEndpointPoint = (nodeId: string, endpointPoint: Point | undefined, terminalId?: string) => {
    if (endpointPoint) {
      return endpointPoint;
    }
    const node = getNode(nodeId);
    return node ? getTerminalPoint(node, terminalId) : undefined;
  };
  const directSavedRoutePointsFromEdge = (edge: Edge): Point[] | null => {
    if (!edge.routePoints || edge.routePoints.length < 2) {
      const source = directSavedEndpointPoint(edge.sourceId, edge.sourcePoint, edge.sourceTerminalId);
      const target = directSavedEndpointPoint(edge.targetId, edge.targetPoint, edge.targetTerminalId);
      const points = [
        ...(source ? [source] : []),
        ...(edge.manualPoints ?? []),
        ...(target ? [target] : [])
      ];
      return points.length >= 2 ? points : null;
    }
    return edge.routePoints;
  };
  const routes: RoutedEdge[] = [];
  for (const edge of edges) {
    const points = directSavedRoutePointsFromEdge(edge);
    if (!points) {
      continue;
    }
    routes.push({
      edgeId: edge.id,
      points,
      path: pointsToOrthogonalPath(points)
    });
  }
  return options.refreshCrossingArcs === true ? refreshCrossingArcPaths(routes) : routes;
}

export function routeEdgesForCachedStoredRendering(
  nodes: ModelNode[],
  edges: Edge[],
  affectedEdgeIds: ReadonlySet<string>,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = [],
  options: ManualRouteDisplayOptions = {}
): RoutedEdge[] {
  if (affectedEdgeIds.size === 0 || previousRoutes.length === 0) {
    return routeEdgesForStoredRendering(nodes, edges, bounds, options);
  }
  const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
  const edgesToRefresh = edges.filter((edge) => affectedEdgeIds.has(edge.id) || !previousRouteById.has(edge.id));
  const refreshedRouteById = new Map(
    routeEdgesForStoredRendering(nodes, edgesToRefresh, bounds, options).map((route) => [route.edgeId, route])
  );
  const routes = edges.flatMap((edge) => {
    const route = affectedEdgeIds.has(edge.id) || !previousRouteById.has(edge.id)
      ? refreshedRouteById.get(edge.id)
      : previousRouteById.get(edge.id);
    return route ? [route] : [];
  });
  return refreshCrossingArcPaths(routes, affectedEdgeIds, previousRoutes);
}

function cachedRouteEndpointNeedsRefresh(
  route: RoutedEdge | undefined,
  edge: Edge,
  source: ModelNode | undefined,
  target: ModelNode | undefined
) {
  if (!route || !source || !target || route.points.length < 2) {
    return true;
  }
  const routingEdge = edgeWithProjectedMissingBusEndpointPoints(edge, source, target);
  return !routeEndpointSegmentsAreValid(route.points, source, target, routingEdge) || routeHasImmediateReversal(route.points);
}

export function routeEdgesForIncrementalRendering(
  nodes: ModelNode[],
  edges: Edge[],
  affectedEdgeIds: ReadonlySet<string>,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = [],
  options: ManualRouteDisplayOptions = {}
): RoutedEdge[] {
  if (affectedEdgeIds.size === 0) {
    if (previousRoutes.length > 0) {
      if (
        previousRoutes.length === edges.length &&
        edges.every((edge, index) => previousRoutes[index]?.edgeId === edge.id)
      ) {
        const nodeById = new Map(nodes.map((node) => [node.id, node]));
        const endpointRefreshEdges = edges.filter((edge, index) => {
          const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
          const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
          return cachedRouteEndpointNeedsRefresh(previousRoutes[index], edge, source, target);
        });
        if (endpointRefreshEdges.length === 0) {
          return previousRoutes;
        }
        const refreshedRouteById = new Map(
          routeEdgesForStoredRendering(nodes, endpointRefreshEdges, bounds, options).map((route) => [route.edgeId, route])
        );
        const endpointRefreshIds = new Set(endpointRefreshEdges.map((edge) => edge.id));
        const routes = previousRoutes.map((route) => refreshedRouteById.get(route.edgeId) ?? route);
        return refreshCrossingArcPaths(routes, endpointRefreshIds, previousRoutes);
      }
      const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
      const missingEdges = edges.filter((edge) => !previousRouteById.has(edge.id));
      const missingRouteById = missingEdges.length > 0
        ? new Map(routeEdgesForStoredRendering(nodes, missingEdges, bounds, options).map((route) => [route.edgeId, route]))
        : new Map<string, RoutedEdge>();
      const routes = edges.flatMap((edge) => {
        const route = previousRouteById.get(edge.id) ?? missingRouteById.get(edge.id);
        return route ? [route] : [];
      });
      return refreshCrossingArcPaths(routes);
    }
    return routeEdgesForStoredRendering(nodes, edges, bounds, options);
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
  const missingStoredEdges = previousRoutes.length > 0
    ? edges.filter((edge) => !affectedEdgeIds.has(edge.id) && !previousRouteById.has(edge.id))
    : edges;
  const storedRoutes = [
    ...previousRoutes.filter((route) => !affectedEdgeIds.has(route.edgeId)),
    ...routeEdgesForStoredRendering(nodes, missingStoredEdges, bounds, options)
  ];
  const storedRouteById = new Map(storedRoutes.map((route) => [route.edgeId, route]));
  const avoidedSegments: Segment[] = [];
  edges.forEach((edge, routeIndex) => {
    if (affectedEdgeIds.has(edge.id)) {
      return;
    }
    const route = storedRouteById.get(edge.id);
    if (route) {
      avoidedSegments.push(...getSegments(edge.id, routeIndex, route.points));
    }
  });
  const routedRouteById = new Map<string, RoutedEdge>();
  edges.forEach((edge, routeIndex) => {
    if (!affectedEdgeIds.has(edge.id)) {
      return;
    }
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return;
    }
    const points = simplifyRoutePreservingEndpointStubs(routeOrthogonalEdge(source, target, nodes, edge, avoidedSegments, bounds, options));
    routedRouteById.set(edge.id, {
      edgeId: edge.id,
      points,
      path: ""
    });
    avoidedSegments.push(...getSegments(edge.id, routeIndex, points));
  });
  const combinedRoutes = edges.flatMap((edge) => {
    const route = routedRouteById.get(edge.id) ?? storedRouteById.get(edge.id);
    return route ? [route] : [];
  });
  return refreshCrossingArcPaths(combinedRoutes, affectedEdgeIds, previousRoutes);
}

function edgeWithoutStoredRouteGeometry(edge: Edge): Edge {
  const next = edgeWithoutManualPoints(edge);
  delete next.routePoints;
  return next;
}

type ConnectionRouteRebuildOptions = {
  preserveManualPoints?: boolean;
};

function shouldPreserveManualPointsForAutomaticRebuild(edge: Edge, options: ConnectionRouteRebuildOptions = {}) {
  return Boolean(options.preserveManualPoints && edge.manualPoints?.length);
}

export function edgeWithSavedRouteGeometry(edge: Edge, route: RoutedEdge | undefined, source?: ModelNode, target?: ModelNode): Edge {
  if (!route || route.points.length < 2) {
    return edge;
  }
  const points = route.points.map((point) => ({ ...point }));
  const manualPoints = commitManualPointsFromRoute(points);
  const next = edgeWithoutManualPoints(edge);
  next.routePoints = points.map((point) => ({ ...point }));
  if (manualPoints.length > 0) {
    next.manualPoints = manualPoints;
  }
  if (!source || isBusNode(source)) {
    next.sourcePoint = { ...points[0] };
  } else {
    delete next.sourcePoint;
  }
  if (!target || isBusNode(target)) {
    next.targetPoint = { ...points[points.length - 1] };
  } else {
    delete next.targetPoint;
  }
  return next;
}

function preservedConnectionRouteIsSafeForCommit(nodes: ModelNode[], edge: Edge, bounds?: CanvasBounds) {
  const routePoints = edge.routePoints && edge.routePoints.length >= 2
    ? edge.routePoints
    : edge.manualPoints?.length
      ? routeEdgesForStoredRendering(nodes, [edge], bounds, { preserveManualRouteDisplay: true })[0]?.points
      : null;
  if (!routePoints || routePoints.length < 2) {
    return true;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return true;
  }
  const routingEdge = edgeWithProjectedMissingBusEndpointPoints(edge, source, target);
  return routeIsSafeForCommit(routePoints, nodes, source, target, routingEdge, bounds);
}

function prepareRebuiltConnectionEdge(
  nodes: ModelNode[],
  edge: Edge,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
) {
  const edgeForDesign = edgeWithoutStoredRouteGeometry(edge);
  const prepared = prepareConnectionEdgeForCommit(nodes, [edgeForDesign], edge.id, bounds, previousRoutes);
  return prepared.ok && prepared.edge ? prepared.edge : null;
}

function simplifyPreservedConnectionRouteIfCleaner(
  nodes: ModelNode[],
  preservedEdge: Edge,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
) {
  const preservedRoute = preservedEdge.routePoints;
  if (!preservedRoute || preservedRoute.length < 6 || routeBendCount(preservedRoute) < 4) {
    return preservedEdge;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = nodeById.get(preservedEdge.sourceId);
  const target = nodeById.get(preservedEdge.targetId);
  if (!source || !target || isBusNode(source) || isBusNode(target)) {
    return preservedEdge;
  }
  const candidateEdge = prepareRebuiltConnectionEdge(nodes, preservedEdge, bounds, previousRoutes);
  const candidateRoute = candidateEdge?.routePoints;
  if (!candidateEdge || !candidateRoute || candidateRoute.length < 2 || samePointList(candidateRoute, preservedRoute)) {
    return preservedEdge;
  }
  const preservedStart = preservedRoute[0];
  const preservedEnd = preservedRoute[preservedRoute.length - 1];
  const candidateStart = candidateRoute[0];
  const candidateEnd = candidateRoute[candidateRoute.length - 1];
  if (
    !preservedStart ||
    !preservedEnd ||
    !candidateStart ||
    !candidateEnd ||
    !samePoint(candidateStart, preservedStart) ||
    !samePoint(candidateEnd, preservedEnd)
  ) {
    return preservedEdge;
  }
  const candidateBends = routeBendCount(candidateRoute);
  const preservedBends = routeBendCount(preservedRoute);
  if (
    candidateBends > preservedBends - 2 ||
    routeManhattanLength(candidateRoute) > routeManhattanLength(preservedRoute) ||
    !candidateRemovesManualOuterDetour(preservedRoute, candidateRoute, preservedStart, preservedEnd)
  ) {
    return preservedEdge;
  }
  const routingEdge = edgeWithProjectedMissingBusEndpointPoints(candidateEdge, source, target);
  return routeIsSafeForCommit(candidateRoute, nodes, source, target, routingEdge, bounds)
    ? candidateEdge
    : preservedEdge;
}

function preserveOrRebuildConnectionRoute(
  nodes: ModelNode[],
  edge: Edge,
  routePoints: Point[] | undefined,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
) {
  const preservedEdge = preserveConnectionEdgeRouteShape(nodes, edge, routePoints, bounds);
  const simplifiedEdge = simplifyPreservedConnectionRouteIfCleaner(nodes, preservedEdge, bounds, previousRoutes);
  if (preservedConnectionRouteIsSafeForCommit(nodes, simplifiedEdge, bounds)) {
    return simplifiedEdge;
  }
  return prepareRebuiltConnectionEdge(nodes, preservedEdge, bounds, previousRoutes) ?? preservedEdge;
}

/**
 * 容器豁免存量路径回填:端点(至少一端)连容器内设备、且有存量 routePoints 的连线,
 * 按豁免口径重跑一次提交设计,与存量 routePoints 不一致才回填
 * (commit 语义:routePoints 与 manualPoints 同步,维持二者一致)。
 * 回填对象主要是旧避让行为产生的存量绕行路径(线绕开容器走框外,回填后变直/穿框);
 * 无此类连线、路径已一致或设计失败时原样返回(零改动)。只改内存,随用户保存落盘。
 * 用途:打开既有模型与导出 SVG 的存量数据修复(容器是线路避让的障碍物;服务容器内设备的线路豁免)。
 */
/**
 * 端点是否落在某**存活**容器内 —— 容器豁免存量回填两处(**连线**至少一端 / **线路设备**端点 ref)共用的唯一判据。
 * 只看 `containerId` 真值会让悬空值(指向已删容器)被当成员豁免,故必须经存活容器 id 集合(见 liveContainerIds)。
 */
function endpointIdsSitInLiveContainer(
  ids: readonly (string | undefined)[],
  nodeById: ReadonlyMap<string, ModelNode>,
  liveContainers: ReadonlySet<string>
): boolean {
  return ids.some((id) => {
    const containerId = id ? nodeById.get(id)?.containerId : undefined;
    return Boolean(containerId && liveContainers.has(containerId));
  });
}

export function rebuildContainerExemptConnectionRoutes(
  nodes: ModelNode[],
  edges: Edge[],
  bounds?: CanvasBounds
): Edge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const liveContainers = liveContainerIds(nodes);
  const candidates = edges.filter((edge) => {
    const routePoints = edge.routePoints;
    return Boolean(routePoints && routePoints.length >= 2) &&
      endpointIdsSitInLiveContainer([edge.sourceId, edge.targetId], nodeById, liveContainers);
  });
  if (candidates.length === 0) {
    return edges;
  }
  const updates = new Map<string, Edge>();
  for (const edge of candidates) {
    const prepared = prepareConnectionEdgeForCommit(nodes, [edge], edge.id, bounds);
    const nextEdge = prepared.ok ? prepared.edge : undefined;
    const nextPoints = nextEdge?.routePoints;
    if (!nextEdge || !nextPoints || nextPoints.length < 2 || (edge.routePoints && samePointList(edge.routePoints, nextPoints))) {
      continue;
    }
    updates.set(edge.id, nextEdge);
  }
  return updates.size === 0 ? edges : edges.map((edge) => updates.get(edge.id) ?? edge);
}

/**
 * 容器豁免存量回填(**设备型线路**):端点 refs 指向容器内设备的线路设备节点,
 * 其存量路径按豁免口径重算(容器不参与该线路避让 —— 与建线时 routeRoutableLineDevice 的口径一致),
 * 与存量路径不一致才回填(routeRoutableLineDevice 对相同路径返回原引用,幂等短路)。
 * 存量绕行路径正是「容器当障碍物」时代的产物;运行时的路由修复(rebuildRoutableLineDeviceRouteUpdates)
 * 判这类路径「安全」(豁免后不再穿障碍)故不会重算,只能在此按设计口径重跑一次。
 * 返回**需提交的节点更新**(只含变化的线路设备);只改内存,随用户保存落盘。
 * 与 rebuildContainerExemptConnectionRoutes 同用途、同口径(打开既有模型与导出 SVG 时调用)。
 */
export function rebuildContainerExemptRoutableLineDeviceRoutes(
  nodes: ModelNode[],
  bounds?: CanvasBounds
): ModelNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const liveContainers = liveContainerIds(nodes);
  /** 端点 ref 所指设备是否归属某个存活容器(容器 id 悬空不算) */
  const endpointSitsInContainer = (ref: RoutableLineDeviceEndpointRef | undefined) =>
    endpointIdsSitInLiveContainer([ref?.nodeId], nodeById, liveContainers);
  const updates: ModelNode[] = [];
  for (const node of nodes) {
    if (!isRoutableLineDeviceKind(node.kind)) continue;
    // 只回填有存量路径的(与连线回填同口径):无路径 = 默认两点,由渲染兜底,无绕行可回填
    if (parseRoutableLineDevicePoints(node.params[ROUTABLE_LINE_POINTS_PARAM]).length < 2) continue;
    const refs = routableLineDeviceEndpointRefs(node);
    if (!endpointSitsInContainer(refs.source) && !endpointSitsInContainer(refs.target)) continue;
    const nextNode = routeRoutableLineDevice(node, nodes, bounds);
    if (nextNode !== node) {
      updates.push(nextNode);
    }
  }
  return updates;
}

export function rebuildSingleConnectionRoute(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds,
  options: ConnectionRouteRebuildOptions = {}
): Edge[] {
  const edge = edges.find((item) => item.id === edgeId);
  if (!edge) {
    return edges;
  }
  if (shouldPreserveManualPointsForAutomaticRebuild(edge, options)) {
    const preservedEdge = preserveOrRebuildConnectionRoute(nodes, edge, edge.routePoints, bounds);
    return preservedEdge === edge
      ? edges
      : edges.map((item) => item.id === edgeId ? preservedEdge : item);
  }
  const preparedEdge = prepareRebuiltConnectionEdge(nodes, edge, bounds);
  if (!preparedEdge) {
    return edges;
  }
  return edges.map((item) => item.id === edgeId ? preparedEdge : item);
}

export function redrawConnectionRoutesForEdges(
  nodes: ModelNode[],
  edges: Edge[],
  edgeIds: Iterable<string>,
  bounds?: CanvasBounds
): Edge[] {
  const requestedEdgeIds = new Set(edgeIds);
  if (requestedEdgeIds.size === 0 || edges.length === 0) {
    return edges;
  }

  const updates = new Map<string, Edge>();
  for (const edge of edges) {
    if (!requestedEdgeIds.has(edge.id)) {
      continue;
    }
    const busAlignmentRoutePoints = edge.routePoints && edge.routePoints.length > 2
      ? edge.routePoints
      : edge.manualPoints?.length
        ? manualConnectionRoutePointsForBusEndpointAlignment(nodes, edge)
        : undefined;
    const edgeForRedraw = busAlignmentRoutePoints && busAlignmentRoutePoints.length > 2
      ? realignConnectionEdgeBusEndpointPoints(nodes, { ...edge, routePoints: busAlignmentRoutePoints })
      : edge;
    const prepared = prepareConnectionEdgeForCommit(nodes, [edgeWithoutStoredRouteGeometry(edgeForRedraw)], edge.id, bounds);
    if (!prepared.ok || !prepared.edge) {
      continue;
    }
    updates.set(edge.id, prepared.edge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

function applyEdgeUpdateMap(edges: Edge[], updates: ReadonlyMap<string, Edge>): Edge[] {
  if (updates.size === 0) {
    return edges;
  }
  let changed = false;
  const nextEdges = edges.map((edge) => {
    const nextEdge = updates.get(edge.id);
    if (!nextEdge || nextEdge === edge) {
      return edge;
    }
    changed = true;
    return nextEdge;
  });
  return changed ? nextEdges : edges;
}

function routeNodesForMovedInterference(
  nodes: ModelNode[],
  edge: Edge,
  movedNodeIds: ReadonlySet<string>,
  routeMoves = movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId)
) {
  if (movedNodeIds.size === 0) {
    return nodes;
  }
  const endpointNodeIds = new Set([edge.sourceId, edge.targetId]);
  const includeMovedBlockers = !routeMoves;
  let changed = false;
  const scopedNodes: ModelNode[] = [];
  for (const node of nodes) {
    const include =
      endpointNodeIds.has(node.id) ||
      (includeMovedBlockers ? movedNodeIds.has(node.id) : !movedNodeIds.has(node.id));
    if (include) {
      scopedNodes.push(node);
    } else {
      changed = true;
    }
  }
  return changed ? scopedNodes : nodes;
}

export function rebuildConnectionRoutesForNodes(
  nodes: ModelNode[],
  edges: Edge[],
  nodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  candidateEdges: Edge[] = edges,
  options: ConnectionRouteRebuildOptions = {}
): Edge[] {
  const changedNodeIds = new Set(nodeIds);
  if (changedNodeIds.size === 0 || edges.length === 0 || candidateEdges.length === 0) {
    return edges;
  }

  const affectedEdges = candidateEdges.filter((edge) =>
    changedNodeIds.has(edge.sourceId) || changedNodeIds.has(edge.targetId)
  );
  const affectedEdgeIds = affectedEdges.map((edge) => edge.id);
  if (affectedEdgeIds.length === 0) {
    return edges;
  }

  const updates = new Map<string, Edge>();
  for (const edge of affectedEdges) {
    if (shouldPreserveManualPointsForAutomaticRebuild(edge, options)) {
      const currentEdge = updates.get(edge.id) ?? edge;
      const routeNodes = routeNodesForMovedInterference(nodes, currentEdge, changedNodeIds);
      const nextEdge = preserveOrRebuildConnectionRoute(routeNodes, currentEdge, currentEdge.routePoints, bounds);
      if (nextEdge !== edge) {
        updates.set(edge.id, nextEdge);
      }
      continue;
    }
    const edgeForDesign = edgeWithoutManualPoints(updates.get(edge.id) ?? edge);
    const routeNodes = routeNodesForMovedInterference(nodes, edgeForDesign, changedNodeIds);
    const preparedEdge = prepareRebuiltConnectionEdge(routeNodes, edgeForDesign, bounds);
    if (!preparedEdge) {
      continue;
    }
    updates.set(edge.id, preparedEdge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

export function rebuildExternalConnectionRoutesForMovedNodes(
  nodes: ModelNode[],
  edges: Edge[],
  movedNodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  candidateEdges: Edge[] = edges,
  options: ConnectionRouteRebuildOptions = {}
): Edge[] {
  const movedIds = new Set(movedNodeIds);
  if (movedIds.size === 0 || edges.length === 0 || candidateEdges.length === 0) {
    return edges;
  }

  const affectedEdges = candidateEdges.filter((edge) =>
    movedIds.has(edge.sourceId) !== movedIds.has(edge.targetId)
  );
  if (affectedEdges.length === 0) {
    return edges;
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const updates = new Map<string, Edge>();
  for (const affectedEdge of affectedEdges) {
    const edge = updates.get(affectedEdge.id) ?? edgeById.get(affectedEdge.id);
    if (!edge) {
      continue;
    }
    if (shouldPreserveManualPointsForAutomaticRebuild(edge, options)) {
      const routeNodes = routeNodesForMovedInterference(nodes, edge, movedIds, true);
      const nextEdge = preserveOrRebuildConnectionRoute(routeNodes, edge, edge.routePoints, bounds);
      if (nextEdge !== edge) {
        updates.set(affectedEdge.id, nextEdge);
      }
      continue;
    }
    const edgeForDesign = edgeWithoutManualPoints(edge);
    const routeNodes = routeNodesForMovedInterference(nodes, edgeForDesign, movedIds, true);
    const preparedEdge = prepareRebuiltConnectionEdge(routeNodes, edgeForDesign, bounds);
    if (!preparedEdge) {
      continue;
    }
    updates.set(affectedEdge.id, preparedEdge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

export function rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(
  nodes: ModelNode[],
  edges: Edge[],
  movedNodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  candidateEdges: Edge[] = edges,
  options: ConnectionRouteRebuildOptions = {}
): Edge[] {
  const movedIds = new Set(movedNodeIds);
  if (movedIds.size === 0 || edges.length === 0 || candidateEdges.length === 0) {
    return edges;
  }

  const internalEdges = candidateEdges.filter((edge) => movedIds.has(edge.sourceId) && movedIds.has(edge.targetId));
  if (internalEdges.length === 0) {
    return edges;
  }

  const stationaryNodes = nodes.filter((node) => !movedIds.has(node.id));
  if (stationaryNodes.length === 0) {
    return edges;
  }

  const stationaryCandidates = getRouteBlockingCandidates(stationaryNodes);
  const routeByEdgeId = new Map(routeEdgesForStoredRendering(nodes, internalEdges, bounds).map((route) => [route.edgeId, route]));
  const blockedEdgeIds = internalEdges
    .filter((edge) => {
      const route = routeByEdgeId.get(edge.id);
      if (!route) {
        return false;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, stationaryCandidates);
      return routeIntersectsSpecificNodes(route.points, edge, blockers);
    })
    .map((edge) => edge.id);
  if (blockedEdgeIds.length === 0) {
    return edges;
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const updates = new Map<string, Edge>();
  for (const edgeId of blockedEdgeIds) {
    const edge = updates.get(edgeId) ?? edgeById.get(edgeId);
    if (!edge) {
      continue;
    }
    const edgeForDesign = edgeWithoutStoredRouteGeometry(edge);
    const routeNodes = routeNodesForMovedInterference(nodes, edgeForDesign, movedIds, true);
    const preparedEdge = prepareRebuiltConnectionEdge(routeNodes, edgeForDesign, bounds);
    if (!preparedEdge) {
      continue;
    }
    updates.set(edgeId, preparedEdge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

export function getRouteBlockingCandidateNodes(points: Point[], edge: Edge, blockers: ModelNode[]) {
  return getRouteBlockingCandidateNodesFromBoxes(
    points,
    edge,
    getRouteBlockingCandidates(blockers)
  );
}

export function routeIntersectsSpecificNodes(points: Point[], edge: Edge, blockers: ModelNode[]) {
  if (points.length < 2 || blockers.length === 0) {
    return false;
  }
  const lastSegmentIndex = points.length - 2;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x !== b.x && a.y !== b.y) {
      return true;
    }
    if (blockers.some((node) => segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, edge.sourceId, edge.targetId, points))) {
      return true;
    }
  }
  return false;
}

export function routeIntersectsEndpointNodeBodies(points: Point[], edge: Edge, endpointNodes: ModelNode[]) {
  if (points.length < 2 || endpointNodes.length === 0) {
    return false;
  }
  const lastPointIndex = points.length - 1;
  const lastSegmentIndex = points.length - 2;
  for (const node of endpointNodes) {
    const sides: EdgeSide[] = [];
    if (node.id === edge.sourceId) {
      sides.push("source");
    }
    if (node.id === edge.targetId) {
      sides.push("target");
    }
    for (const side of sides) {
      const endpointIndex = side === "source" ? 0 : lastPointIndex;
      const adjacentIndex = side === "source" ? 1 : lastPointIndex - 1;
      const protectedSegmentIndex = side === "source" ? 0 : lastSegmentIndex;
      const endpoint = points[endpointIndex];
      const adjacent = points[adjacentIndex];
      const otherEndpoint = side === "source" ? points[lastPointIndex] : points[0];
      const terminalId = edgeTerminalId(edge, side);
      const normal = routeEndpointNormal(node, endpoint, otherEndpoint, terminalId);
      if (!routeSegmentMatchesNormal(endpoint, adjacent, normal)) {
        return true;
      }
      for (let index = 1; index < points.length; index += 1) {
        const segmentIndex = index - 1;
        if (segmentIndex === protectedSegmentIndex) {
          continue;
        }
        const a = points[index - 1];
        const b = points[index];
        if (a.x !== b.x && a.y !== b.y) {
          return true;
        }
        if (segmentIntersectsNodeBody(a, b, node)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function rerouteEdgesAroundMovedNodes(
  nodes: ModelNode[],
  edges: Edge[],
  movedNodeIds: string[],
  previousRoutes: RoutedEdge[] = [],
  bounds?: CanvasBounds,
  forceEdgeIds: Iterable<string> = [],
  searchEdges: Edge[] = edges,
  options: ConnectionRouteRebuildOptions = {}
): Edge[] {
  const movedIds = new Set(movedNodeIds);
  if (movedIds.size === 0 || edges.length === 0) {
    return edges;
  }
  const movedNodes = nodes.filter((node) => movedIds.has(node.id));
  if (movedNodes.length === 0) {
    return edges;
  }

  const movedCandidates = getRouteBlockingCandidates(movedNodes);
  const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
  const forcedEdgeIds = new Set(forceEdgeIds);
  const fallbackRouteById = new Map<string, RoutedEdge>();
  if (previousRoutes.length === 0) {
    for (const edge of searchEdges) {
      const route = routeEdgesForRendering(routeNodesForMovedInterference(nodes, edge, movedIds), [edge], bounds)[0];
      if (route) {
        fallbackRouteById.set(route.edgeId, route);
      }
    }
  }
  const candidateEdges = (previousRoutes.length > 0
    ? searchEdges.filter((edge) => previousRouteById.has(edge.id))
    : searchEdges
  );
  const blockedEdgeIds = candidateEdges
    .filter((edge) => {
      if (forcedEdgeIds.has(edge.id)) {
        return true;
      }
      const route = previousRouteById.get(edge.id) ?? fallbackRouteById.get(edge.id);
      if (!route) {
        return false;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, movedCandidates);
      return routeIntersectsSpecificNodes(route.points, edge, blockers);
    })
    .map((edge) => edge.id);

  if (blockedEdgeIds.length === 0) {
    return edges;
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const updates = new Map<string, Edge>();
  for (const edgeId of blockedEdgeIds) {
    const edge = updates.get(edgeId) ?? edgeById.get(edgeId);
    if (!edge) {
      continue;
    }
    const edgeForDesign = edgeWithoutStoredRouteGeometry(edge);
    const routeNodes = routeNodesForMovedInterference(nodes, edgeForDesign, movedIds);
    const preparedEdge = prepareRebuiltConnectionEdge(routeNodes, edgeForDesign, bounds, previousRoutes);
    if (!preparedEdge) {
      continue;
    }
    updates.set(edgeId, preparedEdge);
  }

  return applyEdgeUpdateMap(edges, updates);
}
