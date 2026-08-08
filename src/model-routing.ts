// 连线路由相关代码（从 model.ts 提取到独立模块）
import { clampNumber } from "./canvasViewport";
import { degreesToRadians } from "./formatUtils";
import { normalizeProjectMeasurements } from "./measurements";
import type {
  AlignDirection,
  AlignMode,
  CanvasBounds,
  CanvasResizeDragMetrics,
  ConnectionEndpointRuleIssue,
  ConnectionRouteValidationIssue,
  ConnectionRouteValidationResult,
  DeviceKind,
  DeviceTemplate,
  Edge,
  ElementTreeChildItem,
  ElementTreeDeviceGroup,
  ElementTreeGroup,
  ElementTreeItem,
  ModelGroup,
  ModelLayer,
  ModelNode,
  OverlappingTerminalConnectionReconcileResult,
  OverlappingTerminalGroup,
  OverlappingTerminalRef,
  PersistedSavedSchemeRecord,
  Point,
  PreparedConnectionEdgeCommit,
  ProjectFile,
  RoutedEdge,
  SavedProjectRecord,
  SavedSchemeRecord,
  Terminal,
  TerminalBusContact,
  TerminalBusContactGroup,
  TerminalType,
  Topology,
  TopologyValidationError,
  TopologyValidationErrorType,
  ViewBox
} from "./model";
import {
  DEFAULT_DEVICE_LABEL_FONT_SIZE,
  DEFAULT_INITIAL_TERMINAL_VBASE,
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEVICE_LIBRARY,
  DEVICE_LIBRARY_BY_KIND,
  ELECTRIC_GENERATION_FAMILY_SPECS,
  ELECTRIC_GENERATION_TERMINAL_TYPES,
  E_NODE_REFERENCE_COLUMNS,
  ROUTABLE_LINE_POINTS_PARAM,
  ROUTABLE_LINE_SOURCE_LOCAL_POINT_PARAM,
  ROUTABLE_LINE_SOURCE_NODE_PARAM,
  ROUTABLE_LINE_SOURCE_TERMINAL_PARAM,
  ROUTABLE_LINE_TARGET_LOCAL_POINT_PARAM,
  ROUTABLE_LINE_TARGET_NODE_PARAM,
  ROUTABLE_LINE_TARGET_TERMINAL_PARAM,
  STATIC_DRAWING_MIN_SIZE,
  STATIC_DRAWING_PADDING,
  STATIC_DRAW_POINTS_PARAM,
  baseDeviceKind,
  buildContainerDeviceParameterViews,
  containerAssociatedDeviceName,
  containerRelationCounterKey,
  containerRelationNameKey,
  containerRelationParamKey,
  createNodeFromTemplate,
  defaultTerminalVbase,
  deviceIndexCounterKey,
  deviceParamValue,
  electricGenerationDerivedInfoForFamily,
  getDeviceGlyphVariant,
  getDeviceStrokeWidth,
  isContainerParams,
  isImplicitTerminalVbaseForType,
  isRetiredThreeWindingTransformerParameterName,
  isRetiredTwoWindingTransformerParameterName,
  isRoutableLineDeviceKind,
  isStaticNode,
  isTwoWindingTransformerTemplateKind,
  isWireLikeRouteDeviceKind,
  makeId,
  makeNodeNumber,
  mergeCanonicalParameterDefinitions,
  migrateElectricGenerationContainerParams,
  normalizeDcacConverterNodeControlParams,
  normalizeDcdcEndpointControlTypeForE,
  normalizeElectricGenerationRatedParams,
  normalizeEndpointConverterNodeControlParams,
  normalizeRoutableLineDeviceStrokeWidthParam,
  normalizeSemanticParameterValues,
  normalizeStaticDrawingPoints,
  normalizeSwitchStatusForE,
  normalizeThreeWindingTransformerParams,
  normalizeTwoWindingTransformerParams,
  normalizeVoltageBaseInput,
  parseContainerRelationField,
  parseDeviceIndex,
  reconcileNodeParamsWithTemplateDefinitions,
  roundStaticDrawingCoordinate,
  serializeStaticDrawPoints,
  staticNodeParticipatesInRoutingAvoidance,
  templateTerminalTypes,
  terminalLabelForType,
  terminalVoltageBaseNumber,
  threeWindingTransformerParameterDefinitions,
  topologyNodeNumberForEField,
  twoWindingTransformerParameterDefinitions
} from "./model";
import {
  E_SECTION_COLUMNS,
  hasVisibleThreeWindingNeutralTerminal,
  inferESection,
  isThreeWindingTransformer,
  isZeroNumericText,
  shouldAssignVoltageSetpointDefault,
  terminalVoltageDisplay
} from "./model-eexport";

function roundRoutableLineCoordinate(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeRoutableLineDevicePoints(points: readonly Point[]): Point[] {
  const normalized: Point[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue;
    }
    const next = {
      x: roundRoutableLineCoordinate(point.x),
      y: roundRoutableLineCoordinate(point.y)
    };
    const previous = normalized.at(-1);
    if (!previous || previous.x !== next.x || previous.y !== next.y) {
      normalized.push(next);
    }
  }
  return normalized;
}

export function serializeRoutableLineDevicePoints(points: readonly Point[]): string {
  return JSON.stringify(normalizeRoutableLineDevicePoints(points));
}

export function parseRoutableLineDevicePoints(value?: string): Point[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeRoutableLineDevicePoints(
      parsed.map((item) => ({
        x: Number((item as Point).x),
        y: Number((item as Point).y)
      }))
    );
  } catch {
    return [];
  }
}

function defaultRoutableLineDeviceLocalPoints(node: ModelNode): Point[] {
  const [sourceTerminal, targetTerminal] = node.terminals;
  if (sourceTerminal && targetTerminal) {
    return [
      terminalRenderLocalPoint(sourceTerminal, node.size, getNodeScaleX(node), getNodeScaleY(node), node.kind),
      terminalRenderLocalPoint(targetTerminal, node.size, getNodeScaleX(node), getNodeScaleY(node), node.kind)
    ];
  }
  return [
    { x: -node.size.width / 2, y: 0 },
    { x: node.size.width / 2, y: 0 }
  ];
}

export function routableLineDeviceLocalPoints(node: ModelNode): Point[] {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return [];
  }
  const storedPoints = parseRoutableLineDevicePoints(node.params[ROUTABLE_LINE_POINTS_PARAM]);
  return storedPoints.length >= 2 ? storedPoints : defaultRoutableLineDeviceLocalPoints(node);
}

function nodeLocalPointToCanvasPoint(node: ModelNode, local: Point, position = node.position): Point {
  const scaleX = getNodeScaleX(node) || 1;
  const scaleY = getNodeScaleY(node) || 1;
  const scaled = {
    x: local.x * scaleX,
    y: local.y * scaleY
  };
  const radians = degreesToRadians(node.rotation);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: roundRoutableLineCoordinate(position.x + scaled.x * cos - scaled.y * sin),
    y: roundRoutableLineCoordinate(position.y + scaled.x * sin + scaled.y * cos)
  };
}

function canvasPointToNodeLocalPoint(node: ModelNode, point: Point): Point {
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  const radians = degreesToRadians(-node.rotation);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const scaleX = getNodeScaleX(node) || 1;
  const scaleY = getNodeScaleY(node) || 1;
  const unrotated = {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos
  };
  return {
    x: roundRoutableLineCoordinate(unrotated.x / scaleX),
    y: roundRoutableLineCoordinate(unrotated.y / scaleY)
  };
}

export function routableLineDeviceCanvasPoints(node: ModelNode, position = node.position): Point[] {
  return routableLineDeviceLocalPoints(node).map((point) => nodeLocalPointToCanvasPoint(node, point, position));
}

export function setRoutableLineDeviceCanvasPoints(node: ModelNode, canvasPoints: readonly Point[]): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const routePoints = orthogonalizeRouteKeepingCollinear(normalizeRoutableLineDevicePoints(canvasPoints));
  const localPoints = normalizeRoutableLineDevicePoints(
    routePoints.map((point) => canvasPointToNodeLocalPoint(node, point))
  );
  if (localPoints.length < 2) {
    return ensureRoutableLineDevicePathParam(node);
  }
  const currentLocalPoints = routableLineDeviceLocalPoints(node);
  if (samePointList(currentLocalPoints, localPoints)) {
    return ensureRoutableLineDevicePathParam(node);
  }
  return {
    ...node,
    params: {
      ...node.params,
      [ROUTABLE_LINE_POINTS_PARAM]: serializeRoutableLineDevicePoints(localPoints)
    }
  };
}

export function insertRoutableLineDeviceBend(
  node: ModelNode,
  segmentIndex: number,
  pointerPoint: Point,
  bounds?: CanvasBounds
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const routePoints = routableLineDeviceCanvasPoints(node);
  const nextPoints = insertOrthogonalRouteBend(routePoints, segmentIndex, pointerPoint, bounds);
  return setRoutableLineDeviceCanvasPoints(node, nextPoints);
}

export function moveRoutableLineDeviceSegment(
  node: ModelNode,
  segmentIndex: number,
  orientation: "horizontal" | "vertical",
  pointerPoint: Point,
  bounds?: CanvasBounds
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const routePoints = routableLineDeviceCanvasPoints(node);
  const movedPoints = moveOrthogonalRouteSegment(routePoints, segmentIndex, orientation, pointerPoint, bounds);
  const nextPoints = orthogonalizeRouteKeepingCollinear(movedPoints);
  return setRoutableLineDeviceCanvasPoints(node, nextPoints);
}

function routableLineEndpointAnchorForLocalPoint(local: Point, size: Pick<ModelNode["size"], "width" | "height">): Point {
  const safeWidth = Math.max(1, size.width);
  const safeHeight = Math.max(1, size.height);
  const clampAnchor = (value: number) => clampNumber(value, -0.48, 0.48);
  return {
    x: clampAnchor(local.x / safeWidth),
    y: clampAnchor(local.y / safeHeight)
  };
}

export function setRoutableLineDeviceEndpoints(
  node: ModelNode,
  start: Point,
  end: Point,
  endpointRefs?: RoutableLineDeviceEndpointRefs
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const nextPosition = {
    x: roundRoutableLineCoordinate((start.x + end.x) / 2),
    y: roundRoutableLineCoordinate((start.y + end.y) / 2)
  };
  const localStart = {
    x: roundRoutableLineCoordinate(start.x - nextPosition.x),
    y: roundRoutableLineCoordinate(start.y - nextPosition.y)
  };
  const localEnd = {
    x: roundRoutableLineCoordinate(end.x - nextPosition.x),
    y: roundRoutableLineCoordinate(end.y - nextPosition.y)
  };
  const terminals = node.terminals.map((terminal, index) => ({
    ...terminal,
    anchor: index === 0
      ? routableLineEndpointAnchorForLocalPoint(localStart, node.size)
      : index === 1
        ? routableLineEndpointAnchorForLocalPoint(localEnd, node.size)
        : terminal.anchor
  }));
  return {
    ...node,
    position: nextPosition,
    rotation: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    terminals,
    params: applyRoutableLineEndpointRefs({
      ...node.params,
      [ROUTABLE_LINE_POINTS_PARAM]: serializeRoutableLineDevicePoints([localStart, localEnd])
    }, endpointRefs)
  };
}

function routableLineEndpointNormalFromRef(
  ref: RoutableLineDeviceEndpointRef | undefined,
  endpointPoint: Point,
  otherPoint: Point,
  nodeById: Map<string, ModelNode>
): Point | undefined {
  const node = ref ? nodeById.get(ref.nodeId) : undefined;
  return node ? routeEndpointNormal(node, endpointPoint, otherPoint, ref?.terminalId) : undefined;
}

function simplifyPreservedRoutableLineRouteIfCleaner(
  baseNode: ModelNode,
  preserved: Point[],
  endpointRefs: RoutableLineDeviceEndpointRefs | undefined,
  nodeById: Map<string, ModelNode>,
  bounds?: CanvasBounds
): Point[] {
  if (preserved.length < 6 || routeBendCount(preserved) < 4) {
    return preserved;
  }
  const sourceNode = endpointRefs?.source ? nodeById.get(endpointRefs.source.nodeId) : undefined;
  const targetNode = endpointRefs?.target ? nodeById.get(endpointRefs.target.nodeId) : undefined;
  if (!sourceNode || !targetNode || isBusNode(sourceNode) || isBusNode(targetNode)) {
    return preserved;
  }
  const routingNodes = [
    ...Array.from(nodeById.values()).filter((candidate) => candidate.id !== baseNode.id),
    baseNode
  ];
  const routed = routeRoutableLineDevice(baseNode, routingNodes, bounds);
  const candidate = routableLineDeviceCanvasPoints(routed);
  const candidateStart = candidate[0];
  const candidateEnd = candidate[candidate.length - 1];
  const preservedStart = preserved[0];
  const preservedEnd = preserved[preserved.length - 1];
  if (
    candidate.length < 2 ||
    !candidateStart ||
    !candidateEnd ||
    !preservedStart ||
    !preservedEnd ||
    !samePoint(candidateStart, preservedStart) ||
    !samePoint(candidateEnd, preservedEnd)
  ) {
    return preserved;
  }
  const preservedBends = routeBendCount(preserved);
  const candidateBends = routeBendCount(candidate);
  if (candidateBends > preservedBends - 2 || routeManhattanLength(candidate) > routeManhattanLength(preserved)) {
    return preserved;
  }
  const routeEdge = routableLineDeviceRoutingEdge(baseNode, candidateStart, candidateEnd, nodeById);
  const blockers = routableLineRoutingBlockers(routingNodes, routeEdge);
  if (
    routeHasImmediateReversal(candidate) ||
    routableLineRouteHasBlockingIssue(candidate, blockers, routeEdge) ||
    !routableLineRouteMatchesEndpointNormals(candidate, routeEdge, nodeById)
  ) {
    return preserved;
  }
  return candidate;
}

export function setRoutableLineDeviceEndpointsPreservingRoute(
  node: ModelNode,
  start: Point,
  end: Point,
  endpointRefs?: RoutableLineDeviceEndpointRefs,
  nodeById: Map<string, ModelNode> = new Map(),
  bounds?: CanvasBounds
): ModelNode {
  const baseNode = setRoutableLineDeviceEndpoints(node, start, end, endpointRefs);
  if (!isRoutableLineDeviceKind(node.kind)) {
    return baseNode;
  }
  const currentPoints = routableLineDeviceCanvasPoints(node);
  if (currentPoints.length < 2) {
    return baseNode;
  }
  const currentStart = currentPoints[0];
  const currentEnd = currentPoints[currentPoints.length - 1];
  if (!currentStart || !currentEnd) {
    return baseNode;
  }
  const refs = endpointRefs ?? routableLineDeviceEndpointRefs(node);
  const preserved = preserveDraggedRouteShape({
    routePoints: currentPoints,
    nextStart: start,
    nextEnd: end,
    sourceDelta: { x: start.x - currentStart.x, y: start.y - currentStart.y },
    targetDelta: { x: end.x - currentEnd.x, y: end.y - currentEnd.y },
    sourceNormal: routableLineEndpointNormalFromRef(refs.source, start, end, nodeById),
    targetNormal: routableLineEndpointNormalFromRef(refs.target, end, start, nodeById)
  });
  const bounded = bounds
    ? orthogonalizeRouteKeepingCollinear(preserved.map((point) => clampPointToBounds(point, bounds)))
    : preserved;
  const simplified = simplifyPreservedRoutableLineRouteIfCleaner(baseNode, bounded, refs, nodeById, bounds);
  return setRoutableLineDeviceCanvasPoints(baseNode, simplified);
}

export function createRoutableLineDeviceFromEndpoints(
  template: DeviceTemplate,
  start: Point,
  end: Point,
  layerId = DEFAULT_MODEL_LAYER_ID,
  endpointRefs?: RoutableLineDeviceEndpointRefs
): ModelNode {
  const midpoint = {
    x: roundRoutableLineCoordinate((start.x + end.x) / 2),
    y: roundRoutableLineCoordinate((start.y + end.y) / 2)
  };
  const baseNode = createNodeFromTemplate(template, midpoint);
  return setRoutableLineDeviceEndpoints({ ...baseNode, layerId }, start, end, endpointRefs);
}

export function ensureRoutableLineDevicePathParam(node: ModelNode): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  if (parseRoutableLineDevicePoints(node.params[ROUTABLE_LINE_POINTS_PARAM]).length >= 2) {
    return node;
  }
  return {
    ...node,
    params: {
      ...node.params,
      [ROUTABLE_LINE_POINTS_PARAM]: serializeRoutableLineDevicePoints(defaultRoutableLineDeviceLocalPoints(node))
    }
  };
}

function samePointList(first: Point[], second: Point[]) {
  return first.length === second.length && first.every((point, index) => point.x === second[index]?.x && point.y === second[index]?.y);
}

export type RoutableLineDeviceEndpointRef = {
  nodeId: string;
  terminalId: string;
  localPoint?: Point;
};

export type RoutableLineDeviceEndpointRefs = {
  source?: RoutableLineDeviceEndpointRef;
  target?: RoutableLineDeviceEndpointRef;
};

const ROUTABLE_LINE_ENDPOINT_TERMINAL_INFER_TOLERANCE = 12;
const ROUTABLE_LINE_ENDPOINT_BUS_INFER_TOLERANCE = 18;

function parseRoutableLineEndpointLocalPoint(value?: string): Point | undefined {
  const points = parseRoutableLineDevicePoints(value);
  return points[0];
}

function routableLineEndpointRefFromParams(
  params: Record<string, string>,
  nodeParam: string,
  terminalParam: string,
  localPointParam: string
): RoutableLineDeviceEndpointRef | undefined {
  const nodeId = params[nodeParam];
  const terminalId = params[terminalParam];
  if (!nodeId || !terminalId) {
    return undefined;
  }
  return {
    nodeId,
    terminalId,
    localPoint: parseRoutableLineEndpointLocalPoint(params[localPointParam])
  };
}

export function routableLineDeviceEndpointRefs(node: ModelNode): RoutableLineDeviceEndpointRefs {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return {};
  }
  return {
    source: routableLineEndpointRefFromParams(
      node.params,
      ROUTABLE_LINE_SOURCE_NODE_PARAM,
      ROUTABLE_LINE_SOURCE_TERMINAL_PARAM,
      ROUTABLE_LINE_SOURCE_LOCAL_POINT_PARAM
    ),
    target: routableLineEndpointRefFromParams(
      node.params,
      ROUTABLE_LINE_TARGET_NODE_PARAM,
      ROUTABLE_LINE_TARGET_TERMINAL_PARAM,
      ROUTABLE_LINE_TARGET_LOCAL_POINT_PARAM
    )
  };
}

export function routableLineDeviceEndpointRefForNode(
  node: ModelNode,
  terminalId: string,
  point?: Point
): RoutableLineDeviceEndpointRef {
  return {
    nodeId: node.id,
    terminalId,
    localPoint: point ? pointToNodeLocal(node, point) : undefined
  };
}

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
  const halfWidth = (bus.size.width * Math.abs(getNodeScaleX(bus))) / 2;
  const halfHeight = Math.max(4, (bus.size.height * Math.abs(getNodeScaleY(bus))) / 2);
  if (
    local.x < -halfWidth - tolerance ||
    local.x > halfWidth + tolerance ||
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

function writeRoutableLineEndpointRef(
  params: Record<string, string>,
  ref: RoutableLineDeviceEndpointRef | undefined | null,
  nodeParam: string,
  terminalParam: string,
  localPointParam: string
) {
  if (!ref) {
    delete params[nodeParam];
    delete params[terminalParam];
    delete params[localPointParam];
    return;
  }
  params[nodeParam] = ref.nodeId;
  params[terminalParam] = ref.terminalId;
  if (ref.localPoint) {
    params[localPointParam] = serializeRoutableLineDevicePoints([ref.localPoint]);
  } else {
    delete params[localPointParam];
  }
}

function applyRoutableLineEndpointRefs(
  params: Record<string, string>,
  refs?: RoutableLineDeviceEndpointRefs
) {
  if (!refs) {
    return params;
  }
  const nextParams = { ...params };
  if ("source" in refs) {
    writeRoutableLineEndpointRef(
      nextParams,
      refs.source,
      ROUTABLE_LINE_SOURCE_NODE_PARAM,
      ROUTABLE_LINE_SOURCE_TERMINAL_PARAM,
      ROUTABLE_LINE_SOURCE_LOCAL_POINT_PARAM
    );
  }
  if ("target" in refs) {
    writeRoutableLineEndpointRef(
      nextParams,
      refs.target,
      ROUTABLE_LINE_TARGET_NODE_PARAM,
      ROUTABLE_LINE_TARGET_TERMINAL_PARAM,
      ROUTABLE_LINE_TARGET_LOCAL_POINT_PARAM
    );
  }
  return nextParams;
}

function routableLineEndpointPointFromRef(
  ref: RoutableLineDeviceEndpointRef | undefined,
  nodeById: Map<string, ModelNode>,
  currentPoint?: Point
): Point | undefined {
  if (!ref) {
    return undefined;
  }
  const node = nodeById.get(ref.nodeId);
  if (!node) {
    return undefined;
  }
  if (isBusNode(node)) {
    const referencePoint = ref.localPoint ? nodeLocalToPoint(node, ref.localPoint) : currentPoint ?? getTerminalPoint(node, ref.terminalId);
    return projectPointToBusCenterline(node, referencePoint);
  }
  return getTerminalPoint(node, ref.terminalId);
}

type RoutableLineRoutingEndpoint = {
  nodeId: string;
  terminalId?: string;
  point?: Point;
};

function routableLineEndpointRoutingRef(
  side: EdgeSide,
  ref: RoutableLineDeviceEndpointRef | undefined,
  endpointPoint: Point,
  nodeById: Map<string, ModelNode>
): RoutableLineRoutingEndpoint {
  const node = ref ? nodeById.get(ref.nodeId) : undefined;
  if (!ref || !node) {
    return {
      nodeId: `floating-routable-line-${side}`,
      point: endpointPoint
    };
  }
  return {
    nodeId: ref.nodeId,
    terminalId: ref.terminalId,
    ...(isBusNode(node) ? { point: endpointPoint } : {})
  };
}

function routableLineDeviceRoutingEdge(
  node: ModelNode,
  start: Point,
  end: Point,
  nodeById: Map<string, ModelNode>
): Edge {
  const refs = routableLineDeviceEndpointRefs(node);
  const source = routableLineEndpointRoutingRef("source", refs.source, start, nodeById);
  const target = routableLineEndpointRoutingRef("target", refs.target, end, nodeById);
  return {
    id: `${node.id}-routable-line-route`,
    sourceId: source.nodeId,
    targetId: target.nodeId,
    ...(source.terminalId ? { sourceTerminalId: source.terminalId } : {}),
    ...(target.terminalId ? { targetTerminalId: target.terminalId } : {}),
    ...(source.point ? { sourcePoint: source.point } : {}),
    ...(target.point ? { targetPoint: target.point } : {})
  };
}

function routableLineRoutingBlockers(
  candidates: ModelNode[],
  edge: Edge,
  blockerNodeIds?: ReadonlySet<string>
) {
  const endpointNodeIds = new Set([edge.sourceId, edge.targetId]);
  return candidates.filter((candidate) => {
    if (endpointNodeIds.has(candidate.id)) {
      return true;
    }
    if (blockerNodeIds && !blockerNodeIds.has(candidate.id)) {
      return false;
    }
    return !isWireLikeRouteDeviceKind(candidate.kind);
  });
}

function routableLineRouteHasBlockingIssue(points: Point[], blockers: ModelNode[], edge: Edge) {
  const nonEndpointBlockers = blockers.filter((blocker) => blocker.id !== edge.sourceId && blocker.id !== edge.targetId);
  return (
    routeIntersectsBlockers(points, nonEndpointBlockers, ROUTE_BLOCKER_PADDING, 0) ||
    routeIntersectsBlockers(points, blockers, ROUTE_BLOCKER_PADDING, 1)
  );
}

function routableLineEndpointNormals(
  points: Point[],
  edge: Edge,
  nodeById: ReadonlyMap<string, ModelNode>
) {
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  const start = points[0];
  const end = points[points.length - 1];
  if (!source || !target || !start || !end) {
    return null;
  }
  return {
    sourceNormal: routeEndpointNormal(source, start, end, edge.sourceTerminalId),
    targetNormal: routeEndpointNormal(target, end, start, edge.targetTerminalId)
  };
}

function routableLineRouteMatchesEndpointNormals(
  points: Point[],
  edge: Edge,
  nodeById: ReadonlyMap<string, ModelNode>
) {
  const normals = routableLineEndpointNormals(points, edge, nodeById);
  return Boolean(normals && routeEndpointSegmentsMatchNormals(points, normals.sourceNormal, normals.targetNormal));
}

function routableLineRouteHasInteriorBlockingIssue(points: Point[], blockers: ModelNode[], edge: Edge) {
  const nonEndpointBlockers = blockers.filter((blocker) => blocker.id !== edge.sourceId && blocker.id !== edge.targetId);
  return (
    routeHasImmediateReversal(points) ||
    routeIntersectsBlockers(points, nonEndpointBlockers, ROUTE_BLOCKER_PADDING, 1) ||
    routeIntersectsBlockers(points, blockers, ROUTE_BLOCKER_PADDING, 1)
  );
}

function endpointNormalEscapePointThroughBlockers(
  point: Point,
  normal: Point,
  blockers: ModelNode[],
  bounds?: CanvasBounds
) {
  let length = ROUTE_ENDPOINT_STUB_LENGTH;
  for (const blocker of blockers) {
    if (!staticNodeParticipatesInRoutingAvoidance(blocker)) {
      continue;
    }
    const box = routeBlockerBox(blocker, ROUTE_BLOCKER_PADDING);
    if (normal.x > 0 && point.y >= box.top && point.y <= box.bottom && point.x >= box.left && point.x < box.right) {
      length = Math.max(length, box.right - point.x + ROUTE_CLEARANCE);
    } else if (normal.x < 0 && point.y >= box.top && point.y <= box.bottom && point.x <= box.right && point.x > box.left) {
      length = Math.max(length, point.x - box.left + ROUTE_CLEARANCE);
    } else if (normal.y > 0 && point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y < box.bottom) {
      length = Math.max(length, box.bottom - point.y + ROUTE_CLEARANCE);
    } else if (normal.y < 0 && point.x >= box.left && point.x <= box.right && point.y <= box.bottom && point.y > box.top) {
      length = Math.max(length, point.y - box.top + ROUTE_CLEARANCE);
    }
  }
  const escaped = {
    x: Math.round(point.x + normal.x * length),
    y: Math.round(point.y + normal.y * length)
  };
  return bounds ? clampPointToBounds(escaped, bounds) : escaped;
}

function buildEndpointNormalPreservingRoutableLineRoute(
  points: Point[],
  blockers: ModelNode[],
  edge: Edge,
  nodeById: ReadonlyMap<string, ModelNode>,
  bounds?: CanvasBounds
) {
  const normals = routableLineEndpointNormals(points, edge, nodeById);
  const start = points[0];
  const end = points[points.length - 1];
  if (!normals || !start || !end) {
    return null;
  }
  const startOut = endpointNormalEscapePointThroughBlockers(start, normals.sourceNormal, blockers, bounds);
  const endOut = endpointNormalEscapePointThroughBlockers(end, normals.targetNormal, blockers, bounds);
  const endpointNodeIds = new Set([edge.sourceId, edge.targetId]);
  const seen = new Set<string>();
  let bestRoute: Point[] | null = null;
  let bestTier = Number.POSITIVE_INFINITY;
  let bestLength = Number.POSITIVE_INFINITY;
  let bestBends = Number.POSITIVE_INFINITY;
  let bestScore = Number.POSITIVE_INFINITY;

  const evaluate = (candidate: Point[]) => {
    const routeBlockers = filterBlockersForRoutePoints(candidate, blockers);
    const route = simplifyRoutePreservingEndpointStubs(candidate, {
      blockers: routeBlockers,
      reduceTinyDoglegs: true
    });
    if (
      !routeEndpointSegmentsMatchNormals(route, normals.sourceNormal, normals.targetNormal) ||
      routeHasImmediateReversal(route)
    ) {
      return;
    }
    const signature = routeSignature(route);
    if (seen.has(signature)) {
      return;
    }
    seen.add(signature);
    const tier = routableLineRouteHasInteriorBlockingIssue(route, blockers, edge) ? 1 : 0;
    const length = routeManhattanLength(route);
    const bends = routeBendCount(route);
    const score = scoreRoute(route, routeBlockers);
    if (
      !bestRoute ||
      tier < bestTier ||
      (tier === bestTier &&
        (length < bestLength ||
          (length === bestLength &&
            (bends < bestBends ||
              (bends === bestBends && score < bestScore)))))
    ) {
      bestRoute = route;
      bestTier = tier;
      bestLength = length;
      bestBends = bends;
      bestScore = score;
    }
  };

  evaluate(buildFullRoute(start, startOut, [], endOut, end, bounds));
  for (const candidate of buildRouteCandidates(startOut, endOut, blockers, [], bounds, endpointNodeIds)) {
    evaluate(buildFullRoute(start, startOut, candidate.slice(1, -1), endOut, end, bounds));
  }
  if (bestTier !== 0) {
    for (const candidate of buildExpandedRouteCandidates(startOut, endOut, blockers, bounds, endpointNodeIds)) {
      evaluate(buildFullRoute(start, startOut, candidate.slice(1, -1), endOut, end, bounds));
    }
  }

  return bestRoute;
}

function repairRoutableLineRouteAroundBlockers(points: Point[], blockers: ModelNode[], edge: Edge, bounds?: CanvasBounds) {
  const routeBlockers = filterBlockersForRoutePoints(points, blockers);
  if (!routeIntersectsEndpointAwareBlockers(points, routeBlockers, edge.sourceId, edge.targetId)) {
    return points;
  }
  const repaired = repairEndpointAwareRouteAroundBlockers(points, routeBlockers, edge.sourceId, edge.targetId, bounds);
  return simplifyRoutePreservingEndpointStubs(repaired, {
    blockers: routeBlockers,
    reduceTinyDoglegs: true
  });
}

type RoutableLineDeviceRoutingOptions = {
  blockerNodeIds?: ReadonlySet<string>;
};

type RoutableLineDeviceRouteUpdateOptions = {
  movedNodeIds?: Iterable<string>;
};

function localOpposedBusRoutableLineRoute(
  edge: Edge,
  start: Point,
  end: Point,
  nodeById: Map<string, ModelNode>,
  blockers: ModelNode[]
): Point[] | null {
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target || !isBusNode(source) || !isBusNode(target)) {
    return null;
  }
  const sourceNormal = routeEndpointNormal(source, start, end, edge.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, end, start, edge.targetTerminalId);
  if (!endpointNormalsAreOpposedOnSameAxis(sourceNormal, targetNormal)) {
    return null;
  }
  if (normalAxisDistance(start, end, sourceNormal) <= 0) {
    return null;
  }
  const nonEndpointBlockers = blockers.filter((blocker) => blocker.id !== source.id && blocker.id !== target.id);
  if (endpointsAreAlignedThroughOpposedNormals(start, end, sourceNormal, targetNormal)) {
    return directSegmentClearOfNodeBodies(start, end, nonEndpointBlockers, new Set()) ? [start, end] : null;
  }
  const startOut = {
    x: Math.round(start.x + sourceNormal.x * ROUTE_ENDPOINT_STUB_LENGTH),
    y: Math.round(start.y + sourceNormal.y * ROUTE_ENDPOINT_STUB_LENGTH)
  };
  const endOut = {
    x: Math.round(end.x + targetNormal.x * ROUTE_ENDPOINT_STUB_LENGTH),
    y: Math.round(end.y + targetNormal.y * ROUTE_ENDPOINT_STUB_LENGTH)
  };
  const middleY = Math.round((startOut.y + endOut.y) / 2);
  const middleX = Math.round((startOut.x + endOut.x) / 2);
  const route = sourceNormal.y !== 0
    ? simplifyRoutePreservingEndpointStubs([
        start,
        startOut,
        { x: startOut.x, y: middleY },
        { x: endOut.x, y: middleY },
        endOut,
        end
      ], { blockers: nonEndpointBlockers, reduceTinyDoglegs: true })
    : simplifyRoutePreservingEndpointStubs([
        start,
        startOut,
        { x: middleX, y: startOut.y },
        { x: middleX, y: endOut.y },
        endOut,
        end
      ], { blockers: nonEndpointBlockers, reduceTinyDoglegs: true });
  if (
    routeHasImmediateReversal(route) ||
    !routeEndpointSegmentsMatchNormals(route, sourceNormal, targetNormal) ||
    routeIntersectsBlockers(route, nonEndpointBlockers, ROUTE_BLOCKER_PADDING, 0)
  ) {
    return null;
  }
  return route;
}

function routableLineMovesWithNodeIds(node: ModelNode, movedNodeIds: ReadonlySet<string>) {
  if (movedNodeIds.has(node.id)) {
    return true;
  }
  const refs = routableLineDeviceEndpointRefs(node);
  return Boolean(
    (refs.source && movedNodeIds.has(refs.source.nodeId)) ||
    (refs.target && movedNodeIds.has(refs.target.nodeId))
  );
}

function routableLineBlockerNodeIdsForMovedInterference(
  node: ModelNode,
  nodes: ModelNode[],
  movedNodeIds: ReadonlySet<string>
) {
  if (movedNodeIds.size === 0) {
    return undefined;
  }
  const lineMoves = routableLineMovesWithNodeIds(node, movedNodeIds);
  const blockerNodeIds = new Set<string>();
  for (const candidate of nodes) {
    if (candidate.id === node.id) {
      continue;
    }
    if (lineMoves ? !movedNodeIds.has(candidate.id) : movedNodeIds.has(candidate.id)) {
      blockerNodeIds.add(candidate.id);
    }
  }
  return blockerNodeIds;
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

export function routeRoutableLineDevice(
  node: ModelNode,
  nodes: ModelNode[],
  bounds?: CanvasBounds,
  options: RoutableLineDeviceRoutingOptions = {}
): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const endpoints = routableLineDeviceCanvasPoints(node);
  const start = endpoints[0];
  const end = endpoints[endpoints.length - 1];
  if (!start || !end) {
    return ensureRoutableLineDevicePathParam(node);
  }
  const otherNodes = nodes.filter((candidate) => candidate.id !== node.id);
  const nodeById = new Map(otherNodes.map((candidate) => [candidate.id, candidate]));
  const routeEdge = routableLineDeviceRoutingEdge(node, start, end, nodeById);
  const blockers = routableLineRoutingBlockers(otherNodes, routeEdge, options.blockerNodeIds);
  const localOpposedBusRoute = localOpposedBusRoutableLineRoute(routeEdge, start, end, nodeById, blockers);
  if (localOpposedBusRoute) {
    const nextLocalPoints = normalizeRoutableLineDevicePoints(localOpposedBusRoute.map((point) => canvasPointToNodeLocalPoint(node, point)));
    const currentLocalPoints = routableLineDeviceLocalPoints(node);
    if (samePointList(currentLocalPoints, nextLocalPoints)) {
      return ensureRoutableLineDevicePathParam(node);
    }
    return {
      ...node,
      params: {
        ...node.params,
        [ROUTABLE_LINE_POINTS_PARAM]: serializeRoutableLineDevicePoints(nextLocalPoints)
      }
    };
  }
  const preparedRoute =
    nodeById.has(routeEdge.sourceId) && nodeById.has(routeEdge.targetId)
      ? prepareConnectionEdgeForCommit(blockers, [routeEdge], routeEdge.id, bounds)
      : undefined;
  const preparedRoutePoints = preparedRoute?.edge?.routePoints ?? preparedRoute?.route?.points;
  const routePointsForDesign =
    preparedRoutePoints && preparedRoutePoints.length >= 2
      ? preparedRoutePoints
      : routeEdgesForRendering(blockers, [routeEdge], bounds)[0]?.points;
  if (!routePointsForDesign || routePointsForDesign.length < 2) {
    return ensureRoutableLineDevicePathParam(node);
  }
  let routePoints = routePointsForDesign;
  if (routableLineRouteHasBlockingIssue(routePointsForDesign, blockers, routeEdge)) {
    const repairedRoutePoints = repairRoutableLineRouteAroundBlockers(routePointsForDesign, blockers, routeEdge, bounds);
    if (routableLineRouteMatchesEndpointNormals(repairedRoutePoints, routeEdge, nodeById)) {
      routePoints = repairedRoutePoints;
    } else {
      routePoints =
        buildEndpointNormalPreservingRoutableLineRoute(routePointsForDesign, blockers, routeEdge, nodeById, bounds) ??
        (routableLineRouteMatchesEndpointNormals(routePointsForDesign, routeEdge, nodeById)
          ? routePointsForDesign
          : repairedRoutePoints);
    }
  }
  const nextLocalPoints = normalizeRoutableLineDevicePoints(routePoints.map((point) => canvasPointToNodeLocalPoint(node, point)));
  const currentLocalPoints = routableLineDeviceLocalPoints(node);
  if (samePointList(currentLocalPoints, nextLocalPoints)) {
    return ensureRoutableLineDevicePathParam(node);
  }
  return {
    ...node,
    params: {
      ...node.params,
      [ROUTABLE_LINE_POINTS_PARAM]: serializeRoutableLineDevicePoints(nextLocalPoints)
    }
  };
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
    const pathSafety = routableLineStoredPathSafetyForRouteUpdate(syncedNode, routingNodes, blockerNodeIds);
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
          blockerNodeIds ? { blockerNodeIds } : undefined
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

function routableLineEndpointNormalNeedsRepair(points: Point[], edge: Edge, nodeById: Map<string, ModelNode>) {
  if (points.length < 2) {
    return true;
  }
  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  const beforeLast = points[points.length - 2];
  const source = nodeById.get(edge.sourceId);
  if (
    source &&
    !routeSegmentMatchesNormal(first, second, routeEndpointNormal(source, first, last, edge.sourceTerminalId))
  ) {
    return true;
  }
  const target = nodeById.get(edge.targetId);
  if (
    target &&
    !routeSegmentMatchesNormal(last, beforeLast, routeEndpointNormal(target, last, first, edge.targetTerminalId))
  ) {
    return true;
  }
  return false;
}

type RoutableLineStoredPathSafetyContext = {
  nodeById?: Map<string, ModelNode>;
  routeBlockingCandidates?: Array<{ node: ModelNode; box: ReturnType<typeof boxFor> }>;
  includeEndpointBlockers?: boolean;
};

function routableLineStoredPathSafety(
  node: ModelNode,
  nodes: ModelNode[],
  context: RoutableLineStoredPathSafetyContext = {}
) {
  const points = routableLineDeviceCanvasPoints(node);
  if (points.length < 2) {
    return { unsafe: true, blockerNodeIds: undefined as Set<string> | undefined };
  }
  const nodeById = context.nodeById ?? new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const routeEdge = routableLineDeviceRoutingEdge(node, points[0], points[points.length - 1], nodeById);
  let blockers: ModelNode[];
  let blockerNodeIds: Set<string> | undefined;
  if (context.routeBlockingCandidates) {
    const nearbyBlockers = getRouteBlockingCandidateNodesFromBoxes(points, routeEdge, context.routeBlockingCandidates);
    const endpointBlockers = context.includeEndpointBlockers === false
      ? []
      : [nodeById.get(routeEdge.sourceId), nodeById.get(routeEdge.targetId)]
        .filter((candidate): candidate is ModelNode => Boolean(candidate && staticNodeParticipatesInRoutingAvoidance(candidate)));
    blockers = [...endpointBlockers, ...nearbyBlockers];
    blockerNodeIds = new Set(nearbyBlockers.map((candidate) => candidate.id));
  } else {
    const otherNodes = nodes.filter((candidate) => candidate.id !== node.id);
    blockers = routableLineRoutingBlockers(otherNodes, routeEdge);
  }
  const hasBlockingIssue =
    routableLineRouteHasBlockingIssue(points, blockers, routeEdge) ||
    routeHasEndpointAwareBlockingIssue(
    points,
    filterBlockersForRoutePoints(points, blockers),
    routeEdge.sourceId,
    routeEdge.targetId
    );
  if (hasBlockingIssue) {
    return { unsafe: true, blockerNodeIds };
  }
  return {
    unsafe: !context.routeBlockingCandidates && routableLineEndpointNormalNeedsRepair(points, routeEdge, nodeById),
    blockerNodeIds
  };
}

function routableLineStoredPathSafetyForRouteUpdate(
  node: ModelNode,
  nodes: ModelNode[],
  blockerNodeIds?: ReadonlySet<string>
) {
  if (!blockerNodeIds) {
    return routableLineStoredPathSafety(node, nodes);
  }
  return routableLineStoredPathSafety(node, nodes, {
    includeEndpointBlockers: false,
    routeBlockingCandidates: getRouteBlockingCandidates(
      nodes.filter((candidate) => candidate.id !== node.id && blockerNodeIds.has(candidate.id))
    )
  });
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

export function createStaticBoxNodeFromDrawing(
  template: DeviceTemplate,
  canvasPoints: readonly Point[],
  layerId = DEFAULT_MODEL_LAYER_ID
): ModelNode {
  const points = normalizeStaticDrawingPoints(canvasPoints);
  if (points.length < 2) {
    throw new Error("Static box drawing requires at least two points.");
  }
  const start = points[0];
  const end = points[points.length - 1];
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  const width = Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(right - left));
  const height = Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(bottom - top));
  const center = {
    x: roundStaticDrawingCoordinate(left + width / 2),
    y: roundStaticDrawingCoordinate(top + height / 2)
  };
  const node = createNodeFromTemplate(template, center);
  return {
    ...node,
    layerId,
    size: { width, height }
  };
}

export function createInteractiveStaticDrawingNode(
  template: DeviceTemplate,
  canvasPoints: readonly Point[],
  layerId = DEFAULT_MODEL_LAYER_ID
): ModelNode {
  const points = normalizeStaticDrawingPoints(canvasPoints);
  if (points.length < 2) {
    throw new Error("Interactive static drawing requires at least two points.");
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const center = {
    x: roundStaticDrawingCoordinate((left + right) / 2),
    y: roundStaticDrawingCoordinate((top + bottom) / 2)
  };
  const drawPoints = points.map((point) => ({
    x: roundStaticDrawingCoordinate(point.x - center.x),
    y: roundStaticDrawingCoordinate(point.y - center.y)
  }));
  const node = createNodeFromTemplate(template, center);
  return {
    ...node,
    layerId,
    size: {
      width: Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(right - left + STATIC_DRAWING_PADDING * 2)),
      height: Math.max(STATIC_DRAWING_MIN_SIZE, roundStaticDrawingCoordinate(bottom - top + STATIC_DRAWING_PADDING * 2))
    },
    params: {
      ...node.params,
      [STATIC_DRAW_POINTS_PARAM]: serializeStaticDrawPoints(drawPoints)
    }
  };
}

export function getNodeScaleX(node: ModelNode): number {
  return node.scaleX ?? node.scale ?? 1;
}

export function getNodeScaleY(node: ModelNode): number {
  return node.scaleY ?? node.scale ?? 1;
}

/** 安全获取节点 X 缩放值（绝对值 + fallback） */
export function getSafeNodeScaleX(node: ModelNode): number {
  return Math.abs(getNodeScaleX(node)) || 1;
}

/** 安全获取节点 Y 缩放值（绝对值 + fallback） */
export function getSafeNodeScaleY(node: ModelNode): number {
  return Math.abs(getNodeScaleY(node)) || 1;
}

export function normalizeScaleValue(value: number, fallback = 1) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeMirrorRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export function mirrorNodes(nodes: ModelNode[], nodeIds: string[], axis: "horizontal" | "vertical"): ModelNode[] {
  const selected = new Set(nodeIds);
  return nodes.map((node) => {
    if (!selected.has(node.id)) {
      return node;
    }
    if (axis === "horizontal") {
      return { ...node, rotation: normalizeMirrorRotationDegrees(-node.rotation), scaleX: -getNodeScaleX(node) };
    }
    return { ...node, rotation: normalizeMirrorRotationDegrees(-node.rotation), scaleY: -getNodeScaleY(node) };
  });
}

export function clampPointToBounds(point: Point, bounds: CanvasBounds): Point {
  return {
    x: Math.round(clampNumber(point.x, 0, bounds.width)),
    y: Math.round(clampNumber(point.y, 0, bounds.height))
  };
}

export function clampEdgeGeometryToBounds(edge: Edge, bounds: CanvasBounds): Edge {
  let changed = false;
  const clampOptionalPoint = (point?: Point) => {
    if (!point) {
      return undefined;
    }
    const clamped = clampPointToBounds(point, bounds);
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
}

export function clampNodePositionToBounds(node: ModelNode, bounds: CanvasBounds, position = node.position): Point {
  const visualBounds = calculateNodeVisualBounds(node, 0, position);
  const leftOffset = visualBounds.left - position.x;
  const rightOffset = visualBounds.right - position.x;
  const topOffset = visualBounds.top - position.y;
  const bottomOffset = visualBounds.bottom - position.y;
  const minX = -leftOffset;
  const maxX = bounds.width - rightOffset;
  const minY = -topOffset;
  const maxY = bounds.height - bottomOffset;
  const clampAxis = (value: number, min: number, max: number) =>
    min <= max ? clampNumber(value, min, max) : (min + max) / 2;
  return {
    x: Math.round(clampAxis(position.x, minX, maxX)),
    y: Math.round(clampAxis(position.y, minY, maxY))
  };
}

export type GeometryBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function calculateModelGeometryBounds(
  nodes: ModelNode[],
  routedEdges: Pick<RoutedEdge, "points">[] = [],
  padding = 0
): GeometryBounds | null {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let hasBounds = false;
  const includeBox = (box: GeometryBounds) => {
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
    hasBounds = true;
  };
  for (const node of nodes) {
    includeBox(calculateNodeVisualBounds(node, padding));
  }
  for (const route of routedEdges) {
    if (route.points.length === 0) {
      continue;
    }
    let routeLeft = Number.POSITIVE_INFINITY;
    let routeRight = Number.NEGATIVE_INFINITY;
    let routeTop = Number.POSITIVE_INFINITY;
    let routeBottom = Number.NEGATIVE_INFINITY;
    for (const point of route.points) {
      routeLeft = Math.min(routeLeft, point.x);
      routeRight = Math.max(routeRight, point.x);
      routeTop = Math.min(routeTop, point.y);
      routeBottom = Math.max(routeBottom, point.y);
    }
    includeBox({
      left: routeLeft - padding,
      right: routeRight + padding,
      top: routeTop - padding,
      bottom: routeBottom + padding
    });
  }
  if (!hasBounds) {
    return null;
  }
  return {
    left,
    right,
    top,
    bottom
  };
}

export function geometryBoundsInsideCanvas(bounds: GeometryBounds | null, canvasBounds: CanvasBounds, margin = 0): boolean {
  if (!bounds) {
    return true;
  }
  return (
    bounds.left >= margin &&
    bounds.top >= margin &&
    bounds.right <= canvasBounds.width - margin &&
    bounds.bottom <= canvasBounds.height - margin
  );
}

export function modelGeometryInsideCanvasBounds(
  nodes: ModelNode[],
  routedEdges: Pick<RoutedEdge, "points">[],
  canvasBounds: CanvasBounds,
  margin = 0
): boolean {
  return geometryBoundsInsideCanvas(calculateModelGeometryBounds(nodes, routedEdges), canvasBounds, margin);
}

export function normalizeViewBoxToCanvas(box: ViewBox, bounds: CanvasBounds): ViewBox {
  return box;
}

export function canvasResizeBoundsFromPointerDrag(
  drag: CanvasResizeDragMetrics,
  pointer: Pick<globalThis.PointerEvent, "clientX" | "clientY">,
  minBounds: CanvasBounds
): CanvasBounds {
  const safeUnitsPerCssX = Number.isFinite(drag.unitsPerCssX) && drag.unitsPerCssX > 0 ? drag.unitsPerCssX : 1;
  const safeUnitsPerCssY = Number.isFinite(drag.unitsPerCssY) && drag.unitsPerCssY > 0 ? drag.unitsPerCssY : 1;
  const deltaX = (pointer.clientX - drag.startClientX) * safeUnitsPerCssX;
  const deltaY = (pointer.clientY - drag.startClientY) * safeUnitsPerCssY;
  const resizesRight = drag.edge === "right" || drag.edge === "corner" || drag.edge === "top-right";
  const resizesBottom = drag.edge === "bottom" || drag.edge === "corner" || drag.edge === "bottom-left";
  const resizesLeft = drag.edge === "left" || drag.edge === "top-left" || drag.edge === "bottom-left";
  const resizesTop = drag.edge === "top" || drag.edge === "top-left" || drag.edge === "top-right";
  return {
    width: Math.round(
      resizesRight
        ? Math.max(minBounds.width, drag.startWidth + deltaX)
        : resizesLeft
          ? Math.max(minBounds.width, drag.startWidth - deltaX)
        : drag.startWidth
    ),
    height: Math.round(
      resizesBottom
        ? Math.max(minBounds.height, drag.startHeight + deltaY)
        : resizesTop
          ? Math.max(minBounds.height, drag.startHeight - deltaY)
        : drag.startHeight
    )
  };
}

export function canvasResizeMinimumBoundsForGeometry(
  edge: CanvasResizeDragMetrics["edge"],
  currentBounds: CanvasBounds,
  geometryBounds: GeometryBounds | null,
  absoluteMinBounds: CanvasBounds
): CanvasBounds {
  const resizesRight = edge === "right" || edge === "corner" || edge === "top-right";
  const resizesBottom = edge === "bottom" || edge === "corner" || edge === "bottom-left";
  const resizesLeft = edge === "left" || edge === "top-left" || edge === "bottom-left";
  const resizesTop = edge === "top" || edge === "top-left" || edge === "top-right";
  const minWidth = Math.max(0, Math.ceil(absoluteMinBounds.width));
  const minHeight = Math.max(0, Math.ceil(absoluteMinBounds.height));
  if (!geometryBounds) {
    return { width: minWidth, height: minHeight };
  }
  return {
    width: resizesRight
      ? Math.max(minWidth, Math.ceil(geometryBounds.right))
      : resizesLeft
        ? Math.max(minWidth, Math.ceil(currentBounds.width - geometryBounds.left))
        : minWidth,
    height: resizesBottom
      ? Math.max(minHeight, Math.ceil(geometryBounds.bottom))
      : resizesTop
        ? Math.max(minHeight, Math.ceil(currentBounds.height - geometryBounds.top))
        : minHeight
  };
}

export function canvasResizeOriginShiftFromPointerDrag(
  drag: CanvasResizeDragMetrics,
  pointer: Pick<globalThis.PointerEvent, "clientX" | "clientY">,
  minBounds: CanvasBounds
): Point {
  const bounds = canvasResizeBoundsFromPointerDrag(drag, pointer, minBounds);
  const shiftsLeft = drag.edge === "left" || drag.edge === "top-left" || drag.edge === "bottom-left";
  const shiftsTop = drag.edge === "top" || drag.edge === "top-left" || drag.edge === "top-right";
  return {
    x: shiftsLeft ? Math.round(bounds.width - drag.startWidth) : 0,
    y: shiftsTop ? Math.round(bounds.height - drag.startHeight) : 0
  };
}

function viewBoxScaleRatio(viewBox: ViewBox, bounds: CanvasBounds): number {
  if (viewBox.width <= 0 || viewBox.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return 1;
  }
  const widthRatio = viewBox.width / bounds.width;
  const heightRatio = viewBox.height / bounds.height;
  return Math.sqrt(widthRatio * heightRatio);
}

export function keyboardMoveStepForViewBox(viewBox: ViewBox, bounds: CanvasBounds, baseStep = 6): number {
  const safeBase = Math.max(1, Math.abs(baseStep));
  const zoomRatio = viewBoxScaleRatio(viewBox, bounds);
  return safeBase * zoomRatio;
}

export function viewBoxZoomPercent(viewBox: ViewBox, bounds: CanvasBounds): number {
  const zoomRatio = viewBoxScaleRatio(viewBox, bounds);
  return Math.max(1, Math.round(100 / zoomRatio));
}

export function clampViewBoxDimensionsForZoom(
  size: Pick<ViewBox, "width" | "height">,
  bounds: CanvasBounds,
  minZoomPercent = 5,
  maxZoomPercent = 2000
): Pick<ViewBox, "width" | "height"> {
  const safeMinZoom = Math.max(1, minZoomPercent);
  const safeMaxZoom = Math.max(safeMinZoom, maxZoomPercent);
  const minRatio = 100 / safeMaxZoom;
  const maxRatio = 100 / safeMinZoom;
  return {
    width: clampNumber(size.width, bounds.width * minRatio, bounds.width * maxRatio),
    height: clampNumber(size.height, bounds.height * minRatio, bounds.height * maxRatio)
  };
}

export function createTerminals(type: TerminalType, count: number): Terminal[] {
  if (count <= 0) {
    return [];
  }
  const safeCount = clampNumber(Math.round(count), 1, 8);
  if (safeCount === 1) {
    return [{ id: "t1", label: terminalLabelForType(type, 0), type, anchor: { x: 0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) }];
  }
  if (safeCount === 2) {
    return [
      { id: "t1", label: terminalLabelForType(type, 0), type, anchor: { x: -0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) },
      { id: "t2", label: terminalLabelForType(type, 1), type, anchor: { x: 0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) }
    ];
  }
  const anchors = [
    { x: -0.5, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0, y: -0.5 },
    { x: 0, y: 0.5 },
    { x: -0.5, y: -0.25 },
    { x: 0.5, y: -0.25 },
    { x: -0.5, y: 0.25 },
    { x: 0.5, y: 0.25 }
  ];
  return anchors.slice(0, safeCount).map((anchor, index) => ({
    id: `t${index + 1}`,
    label: terminalLabelForType(type, index),
    type,
    anchor,
    nodeNumber: makeNodeNumber(),
    vbase: defaultTerminalVbase(type)
  }));
}

export function createTemplateTerminals(template: DeviceTemplate): Terminal[] {
  const baseTerminals = createTerminals(template.terminalType, template.terminalCount);
  const terminalTypes = template.terminalTypes?.slice(0, baseTerminals.length);
  if (!terminalTypes?.length) {
    return baseTerminals.map((terminal, index) => ({
      ...terminal,
      label: template.terminalLabels?.[index] ?? terminal.label,
      anchor: template.terminalAnchors?.[index] ?? terminal.anchor
    }));
  }
  return baseTerminals.map((terminal, index) => {
    const type = terminalTypes[index] ?? template.terminalType;
    return {
      ...terminal,
      label: template.terminalLabels?.[index] ?? terminalLabelForType(type, index),
      anchor: template.terminalAnchors?.[index] ?? terminal.anchor,
      type,
      vbase: defaultTerminalVbase(type)
    };
  });
}

const BUS_TERMINAL_TYPE_BY_KIND: Partial<Record<string, TerminalType>> = {
  "ac-bus": "ac",
  "dc-bus": "dc",
  "hydrogen-bus": "h2",
  "hydrogen-tank": "h2",
  "hydrogen-tank-horizontal": "h2",
  "hydrogen-tank-container": "h2",
  "heat-bus": "heat",
  "thermal-storage-tank": "heat"
};

const BUS_LEGACY_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: 0 },
  { x: 0.5, y: 0 },
  { x: 0, y: -0.5 },
  { x: 0, y: 0.5 },
  { x: -0.5, y: -0.25 },
  { x: 0.5, y: -0.25 },
  { x: -0.5, y: 0.25 },
  { x: 0.5, y: 0.25 }
];

function busTerminalAnchor(index: number): Point {
  return BUS_LEGACY_TERMINAL_ANCHORS[index] ?? { x: 0, y: 0 };
}

export function busTerminalTypeByKind(kind: string): TerminalType | undefined {
  return BUS_TERMINAL_TYPE_BY_KIND[kind] ?? BUS_TERMINAL_TYPE_BY_KIND[baseDeviceKind(kind)];
}

export function getBusTerminalType(node: Pick<ModelNode, "kind" | "terminals">): TerminalType | undefined {
  return node.terminals[0]?.type ?? busTerminalTypeByKind(node.kind);
}

export function virtualBusTerminal(node: Pick<ModelNode, "kind" | "terminals">, terminalId?: string): Terminal | undefined {
  const type = getBusTerminalType(node);
  if (!type) {
    return undefined;
  }
  const index = Math.max(1, Number.parseInt(terminalId?.replace(/^t/, "") ?? "1", 10) || 1);
  return {
    id: terminalId || `t${index}`,
    label: terminalLabelForType(type, index - 1),
    type,
    anchor: busTerminalAnchor(index - 1),
    nodeNumber: "0",
    vbase: defaultTerminalVbase(type)
  };
}

export function normalizeNodeTerminalsWithTemplate(node: ModelNode, template: DeviceTemplate | undefined): ModelNode {
  const semanticParams = normalizeSemanticParameterValues(node.params);
  const semanticNode = semanticParams === node.params ? node : { ...node, params: semanticParams };
  let normalizedNode = normalizeEndpointConverterNodeControlParams(
    normalizeDcacConverterNodeControlParams(normalizeRoutableLineDeviceStrokeWidthParam(semanticNode))
  );
  normalizedNode = normalizeElectricGenerationRatedParams(normalizedNode, template);
  if (template) {
    normalizedNode = migrateElectricGenerationContainerParams(normalizedNode, template);
  }
  if (template && !template.isContainer && (isThreeWindingTransformer(normalizedNode) || isTwoWindingTransformerTemplateKind(normalizedNode.kind))) {
    const parameterDefinitions = isThreeWindingTransformer(normalizedNode)
      ? mergeCanonicalParameterDefinitions(
          threeWindingTransformerParameterDefinitions,
          (template.parameterDefinitions ?? []).filter(
            (definition) => !isRetiredThreeWindingTransformerParameterName(definition.enName)
          )
        )
      : mergeCanonicalParameterDefinitions(
          twoWindingTransformerParameterDefinitions,
          (template.parameterDefinitions ?? []).filter(
            (definition) => !isRetiredTwoWindingTransformerParameterName(definition.enName)
          )
        );
    const sourceParams = isThreeWindingTransformer(normalizedNode)
      ? normalizeThreeWindingTransformerParams(normalizedNode.params)
      : normalizeTwoWindingTransformerParams(normalizedNode.params);
    const sourceNode = sourceParams === normalizedNode.params ? normalizedNode : { ...normalizedNode, params: sourceParams };
    const reconciledNode = reconcileNodeParamsWithTemplateDefinitions(sourceNode, {
      parameterDefinitions
    });
    const params = isThreeWindingTransformer(reconciledNode)
      ? normalizeThreeWindingTransformerParams(reconciledNode.params)
      : normalizeTwoWindingTransformerParams(reconciledNode.params);
    normalizedNode = params === reconciledNode.params ? reconciledNode : { ...reconciledNode, params };
  }
  if (!template || normalizedNode.terminals.length === 0) {
    return normalizedNode;
  }
  let changed = false;
  const expectedTypes = templateTerminalTypes(template);
  const shouldNormalizeTerminalAnchors = expectedTypes.length > 1;
  const expectedTerminals = createTemplateTerminals(template);
  if (expectedTerminals.length !== normalizedNode.terminals.length) {
    changed = true;
  }
  const terminals = expectedTerminals.map((expectedTerminal, index) => {
    const terminal = normalizedNode.terminals[index] ?? expectedTerminal;
    const expectedType = expectedTerminal.type;
    const expectedLabel = expectedTerminal.label;
    const expectedAnchor = shouldNormalizeTerminalAnchors ? expectedTerminal.anchor : undefined;
    let nextTerminal = terminal;
    if (terminal.id !== expectedTerminal.id) {
      changed = true;
      nextTerminal = {
        ...nextTerminal,
        id: expectedTerminal.id
      };
    }
    if (expectedType && terminal.type !== expectedType) {
      changed = true;
      const shouldResetVbase = isImplicitTerminalVbaseForType(terminal.vbase, terminal.type);
      nextTerminal = {
        ...nextTerminal,
        type: expectedType,
        vbase: shouldResetVbase
          ? defaultTerminalVbase(expectedType)
          : terminal.vbase
      };
    }
    if (expectedLabel && nextTerminal.label !== expectedLabel) {
      changed = true;
      nextTerminal = {
        ...nextTerminal,
        label: expectedLabel
      };
    }
    if (expectedAnchor && !samePoint(nextTerminal.anchor, expectedAnchor)) {
      changed = true;
      nextTerminal = {
        ...nextTerminal,
        anchor: { ...expectedAnchor }
      };
    }
    return nextTerminal;
  });
  return changed ? { ...normalizedNode, terminals } : normalizedNode;
}

export function normalizeNodeTerminalsByTemplate(node: ModelNode): ModelNode {
  return normalizeNodeTerminalsWithTemplate(node, DEVICE_LIBRARY_BY_KIND.get(node.kind));
}

export function terminalStubSegment(
  terminal: Pick<Terminal, "anchor">,
  scaleX = 1,
  scaleY = 1,
  length = 24,
  nodeKind?: DeviceKind,
  size?: Pick<ModelNode["size"], "width" | "height">
): { from: Point; to: Point } {
  const displayedAnchor = {
    x: terminal.anchor.x * (Math.sign(scaleX) || 1),
    y: terminal.anchor.y * (Math.sign(scaleY) || 1)
  };
  const internalLength = terminalStubInternalLength(terminal, length, nodeKind, size);
  if (Math.abs(displayedAnchor.x) >= Math.abs(displayedAnchor.y)) {
    const scaledLength = Math.max(0, internalLength * Math.abs(scaleX || 1) + terminalOutwardOffsetLength(terminal, nodeKind));
    return {
      from: { x: displayedAnchor.x >= 0 ? -scaledLength : scaledLength, y: 0 },
      to: { x: 0, y: 0 }
    };
  }
  const scaledLength = Math.max(0, internalLength * Math.abs(scaleY || 1) + terminalOutwardOffsetLength(terminal, nodeKind));
  return {
    from: { x: 0, y: displayedAnchor.y >= 0 ? -scaledLength : scaledLength },
    to: { x: 0, y: 0 }
  };
}

const TERMINAL_STUB_INTERNAL_LINK_LENGTH = 72;
const TERMINAL_OUTWARD_OFFSET = 4;
const CLOSE_BORDER_TERMINAL_OUTWARD_OFFSET = 12;
const CONVERTER_TERMINAL_OUTWARD_OFFSET = 12;
export const CONVERTER_GLYPH_BORDER_INSET = 8;
const PIPELINE_TERMINAL_OUTWARD_OFFSET = 16;
const DEVICE_GLYPH_DESIGN_LONGEST_SIDE = 100;
const CONVERTER_TERMINAL_KINDS = new Set<DeviceKind>(["dcdc-converter", "acdc-converter", "dcac-converter", "acac-converter"]);
const LONG_STUB_PIPELINE_TERMINAL_KINDS = new Set<DeviceKind>([
  "hydrogen-pipeline",
  "hydrogen-routable-pipeline",
  "heat-pipeline",
  "heat-routable-line"
]);
const CLOSE_BORDER_TERMINAL_KINDS = new Set<DeviceKind>([
  "ac-electrolyzer",
  "dc-electrolyzer",
  "ac-fuel-cell",
  "dc-fuel-cell",
  "ac-heater",
  "dc-heater",
  "ac-two-port-heater",
  "dc-two-port-heater"
]);

function terminalOutwardAxis(terminal: Pick<Terminal, "anchor">): "x" | "y" | null {
  const absX = Math.abs(terminal.anchor.x);
  const absY = Math.abs(terminal.anchor.y);
  if (absX >= 0.499 && absX >= absY) {
    return "x";
  }
  if (absY >= 0.499) {
    return "y";
  }
  return null;
}

function terminalOutwardOffsetLength(terminal: Pick<Terminal, "anchor">, nodeKind?: DeviceKind): number {
  if (!terminalOutwardAxis(terminal)) {
    return 0;
  }
  const terminalNodeKind = nodeKind ? (baseDeviceKind(nodeKind) as DeviceKind) : undefined;
  if (terminalNodeKind && CONVERTER_TERMINAL_KINDS.has(terminalNodeKind)) {
    return CONVERTER_TERMINAL_OUTWARD_OFFSET;
  }
  if (terminalNodeKind && LONG_STUB_PIPELINE_TERMINAL_KINDS.has(terminalNodeKind)) {
    return PIPELINE_TERMINAL_OUTWARD_OFFSET;
  }
  if (terminalNodeKind && CLOSE_BORDER_TERMINAL_KINDS.has(terminalNodeKind)) {
    return CLOSE_BORDER_TERMINAL_OUTWARD_OFFSET;
  }
  return TERMINAL_OUTWARD_OFFSET;
}

function deviceGlyphScaleForSize(size: Pick<ModelNode["size"], "width" | "height">): number {
  return Math.max(1, Math.max(size.width, size.height) / DEVICE_GLYPH_DESIGN_LONGEST_SIDE);
}

function isConverterGlyphVariant(glyphVariant: string): boolean {
  return glyphVariant === "dcdc-converter" || glyphVariant === "acdc-converter" || glyphVariant === "dcac-converter" || glyphVariant === "acac-converter";
}

function isHeatSourceGlyphVariant(glyphVariant: string): boolean {
  return glyphVariant === "single-heat-source" || glyphVariant === "two-port-heat-source" || glyphVariant === "heat-source";
}

function isHeatBoilerGlyphVariant(glyphVariant: string): boolean {
  return glyphVariant === "single-heat-boiler" || glyphVariant === "two-port-heat-boiler" || glyphVariant === "heat-boiler";
}

function isHydrogenElectrolyzerGlyphVariant(glyphVariant: string): boolean {
  return glyphVariant === "hydrogen-electrolyzer" || glyphVariant === "ac-hydrogen-electrolyzer" || glyphVariant === "dc-hydrogen-electrolyzer";
}

function isHydrogenFuelCellGlyphVariant(glyphVariant: string): boolean {
  return glyphVariant === "hydrogen-fuel-cell" || glyphVariant === "ac-hydrogen-fuel-cell" || glyphVariant === "dc-hydrogen-fuel-cell";
}

function isHeatElectricHeaterGlyphVariant(glyphVariant: string): boolean {
  return (
    glyphVariant === "heat-electric-heater" ||
    glyphVariant === "ac-heat-electric-heater" ||
    glyphVariant === "ac-two-port-heat-electric-heater" ||
    glyphVariant === "dc-heat-electric-heater" ||
    glyphVariant === "dc-two-port-heat-electric-heater"
  );
}

function terminalStubVisibleBoundaryDistance(
  terminal: Pick<Terminal, "anchor">,
  size: Pick<ModelNode["size"], "width" | "height">,
  nodeKind: DeviceKind,
  axis: "x" | "y"
): number {
  const glyphScale = deviceGlyphScaleForSize(size);
  const w = size.width / glyphScale;
  const h = size.height / glyphScale;
  const baseKind = baseDeviceKind(nodeKind) as DeviceKind;
  const glyphVariant = getDeviceGlyphVariant(baseKind);
  const fullRectDistance = axis === "x" ? size.width / 2 : size.height / 2;
  const scaled = (value: number) => value * glyphScale;

  if (axis === "x") {
    if (glyphVariant === "custom-device") {
      return fullRectDistance * 3 / 4;
    }
    if (glyphVariant === "ac-generator" || glyphVariant === "dc-generator") {
      return Math.min(size.width, size.height) * 0.37;
    }
    if (glyphVariant === "hydrogen-source") {
      return Math.min(size.width, size.height) * 0.35;
    }
    if (isHeatSourceGlyphVariant(glyphVariant)) {
      return scaled(Math.max(Math.min(w, h) * 0.27, 31));
    }
    if (isHeatBoilerGlyphVariant(glyphVariant)) {
      const bodyWidth = Math.min(w * 0.66, 58);
      return scaled(bodyWidth / 2);
    }
    if (nodeKind === "ac-three-winding-transformer" || nodeKind === "ac-three-winding-transformer-neutral") {
      const hasNeutralTerminal = nodeKind === "ac-three-winding-transformer-neutral";
      const windingRadius = hasNeutralTerminal ? 14 : 15;
      const sideX = hasNeutralTerminal ? 17 : 16;
      return scaled(sideX + windingRadius + 8);
    }
    if (glyphVariant === "transformer" || glyphVariant === "terminal-transformer-load") {
      return scaled(32);
    }
    if (isConverterGlyphVariant(glyphVariant)) {
      return Math.max(0, fullRectDistance - scaled(CONVERTER_GLYPH_BORDER_INSET));
    }
    if (glyphVariant === "ac-hydrogen-electrolyzer" || glyphVariant === "dc-hydrogen-electrolyzer" || glyphVariant === "hydrogen-electrolyzer") {
      return scaled(w / 2 - 6);
    }
    if (glyphVariant === "ac-hydrogen-fuel-cell" || glyphVariant === "dc-hydrogen-fuel-cell" || glyphVariant === "hydrogen-fuel-cell") {
      return scaled(w / 2 - 7);
    }
    if (
      glyphVariant === "heat-electric-heater" ||
      glyphVariant === "ac-heat-electric-heater" ||
      glyphVariant === "ac-two-port-heat-electric-heater" ||
      glyphVariant === "dc-heat-electric-heater" ||
      glyphVariant === "dc-two-port-heat-electric-heater"
    ) {
      return scaled(w / 2 - 7);
    }
    if (glyphVariant === "heat-exchanger-two") {
      return scaled(28);
    }
    if (glyphVariant === "heat-exchanger-three" || glyphVariant === "heat-exchanger-four") {
      return scaled(38);
    }
    if (glyphVariant === "hydrogen-compressor" || glyphVariant === "heat-pump") {
      return scaled(24);
    }
    if (glyphVariant === "hydrogen-regulator" || glyphVariant === "hydrogen-valve" || glyphVariant === "heat-valve") {
      return scaled(28);
    }
    if (
      glyphVariant === "line" ||
      glyphVariant === "ac-line" ||
      glyphVariant === "dc-line" ||
      glyphVariant === "routable-line" ||
      glyphVariant === "hydrogen-pipeline" ||
      glyphVariant === "heat-pipeline" ||
      glyphVariant === "switch" ||
      glyphVariant === "disconnector" ||
      glyphVariant === "breaker" ||
      glyphVariant === "ground-disconnector" ||
      glyphVariant === "box-breaker"
    ) {
      return scaled(w / 2 - 8);
    }
    if (glyphVariant === "battery-storage") {
      return scaled(Math.min(w * 0.68, 56) / 2 + 6);
    }
    if (glyphVariant === "load") {
      return scaled(w / 9);
    }
    if (glyphVariant === "hydrogen-load" || glyphVariant === "heat-load" || glyphVariant === "single-heat-load") {
      return scaled((w * 2) / 9);
    }
    if (glyphVariant === "two-port-heat-load") {
      return scaled(Math.max(w / 2 - 10, 31));
    }
    if (baseKind.includes("wind-source") || baseKind.includes("pv-source") || baseKind.includes("thermal-source") || baseKind.includes("diesel-source") || baseKind.includes("hydro-source")) {
      return scaled(22);
    }
    if (baseKind.includes("nuclear-source")) {
      return scaled(22);
    }
    return fullRectDistance;
  }

  if (nodeKind === "ac-three-winding-transformer" || nodeKind === "ac-three-winding-transformer-neutral") {
    const hasNeutralTerminal = nodeKind === "ac-three-winding-transformer-neutral";
    const windingRadius = hasNeutralTerminal ? 14 : 15;
    const topY = -8;
    const bottomY = hasNeutralTerminal ? 16 : 14;
    return terminal.anchor.y < 0
      ? scaled(Math.abs(topY - windingRadius - 20))
      : scaled(bottomY + windingRadius + 10);
  }
  if (glyphVariant === "custom-device") {
    return fullRectDistance * 3 / 4;
  }
  if (glyphVariant === "ground-disconnector-vertical") {
    return scaled(h / 2 - 8);
  }
  if (glyphVariant === "ac-generator" || glyphVariant === "dc-generator") {
    return Math.min(size.width, size.height) * 0.37;
  }
  if (glyphVariant === "hydrogen-source") {
    return Math.min(size.width, size.height) * 0.35;
  }
  if (baseKind.includes("wind-source")) {
    return terminal.anchor.y < 0 ? scaled(18) : scaled(22);
  }
  if (baseKind.includes("pv-source")) {
    return terminal.anchor.y < 0 ? scaled(22) : scaled(14);
  }
  if (baseKind.includes("thermal-source")) {
    return terminal.anchor.y < 0 ? scaled(32) : scaled(18);
  }
  if (baseKind.includes("diesel-source")) {
    return terminal.anchor.y < 0 ? scaled(26) : scaled(18);
  }
  if (baseKind.includes("hydro-source")) {
    return terminal.anchor.y < 0 ? scaled(24) : scaled(22);
  }
  if (baseKind.includes("nuclear-source")) {
    return scaled(22);
  }
  if (isHeatSourceGlyphVariant(glyphVariant)) {
    const sourceRadius = Math.min(w, h) * 0.27;
    return terminal.anchor.y < 0
      ? scaled(Math.max(24, sourceRadius - 2))
      : scaled(Math.max(16, sourceRadius + 2));
  }
  if (isHeatBoilerGlyphVariant(glyphVariant)) {
    const bodyHeight = Math.min(h * 0.66, 40);
    return terminal.anchor.y < 0
      ? scaled(Math.max(24, bodyHeight / 2 - 5))
      : scaled(Math.max(18, bodyHeight / 2 + 5));
  }
  if (glyphVariant === "load") {
    return scaled(h * 2 / 9);
  }
  if (glyphVariant === "hydrogen-load" || glyphVariant === "heat-load" || glyphVariant === "single-heat-load") {
    return scaled((h * 2) / 9);
  }
  if (isConverterGlyphVariant(glyphVariant)) {
    return Math.max(0, fullRectDistance - scaled(CONVERTER_GLYPH_BORDER_INSET));
  }
  if (glyphVariant === "battery-storage") {
    const bodyHeight = Math.min(h * 0.58, 32);
    return scaled(bodyHeight / 2);
  }
  if (isHydrogenElectrolyzerGlyphVariant(glyphVariant)) {
    return scaled(Math.max(0, h / 2 - 5));
  }
  if (isHydrogenFuelCellGlyphVariant(glyphVariant)) {
    return scaled(Math.max(0, h / 2 - 6));
  }
  if (isHeatElectricHeaterGlyphVariant(glyphVariant)) {
    return scaled(Math.max(0, h / 2 - 6));
  }
  if (glyphVariant === "hydrogen-compressor" || glyphVariant === "heat-pump") {
    return scaled(20);
  }
  if (glyphVariant === "hydrogen-regulator" || glyphVariant === "hydrogen-valve" || glyphVariant === "heat-valve") {
    return terminal.anchor.y < 0
      ? scaled(glyphVariant === "hydrogen-regulator" ? 20 : 18)
      : scaled(12);
  }
  return fullRectDistance;
}

function terminalStubInternalLength(
  terminal: Pick<Terminal, "anchor">,
  requestedLength: number,
  nodeKind?: DeviceKind,
  size?: Pick<ModelNode["size"], "width" | "height">
): number {
  const axis = terminalOutwardAxis(terminal);
  if (!axis) {
    return requestedLength;
  }
  if (nodeKind && size) {
    const anchorDistance = axis === "x" ? Math.abs(terminal.anchor.x * size.width) : Math.abs(terminal.anchor.y * size.height);
    const boundaryDistance = terminalStubVisibleBoundaryDistance(terminal, size, nodeKind, axis);
    return anchorDistance - boundaryDistance;
  }
  if (!terminalOutwardAxis(terminal)) {
    return requestedLength;
  }
  return Math.max(requestedLength, TERMINAL_STUB_INTERNAL_LINK_LENGTH);
}

export function terminalRenderLocalPoint(
  terminal: Pick<Terminal, "anchor">,
  size: Pick<ModelNode["size"], "width" | "height">,
  scaleX = 1,
  scaleY = 1,
  nodeKind?: DeviceKind
): Point {
  const axis = terminalOutwardAxis(terminal);
  const outwardOffset = terminalOutwardOffsetLength(terminal, nodeKind);
  const safeScaleX = Math.abs(scaleX || 1);
  const safeScaleY = Math.abs(scaleY || 1);
  return {
    x: terminal.anchor.x * size.width + (axis === "x" ? Math.sign(terminal.anchor.x || 1) * (outwardOffset / safeScaleX) : 0),
    y: terminal.anchor.y * size.height + (axis === "y" ? Math.sign(terminal.anchor.y || 1) * (outwardOffset / safeScaleY) : 0)
  };
}

export function terminalStubStrokeWidth(node: ModelNode, terminal: Pick<Terminal, "anchor">): number {
  const scaleX = Math.abs(getNodeScaleX(node) || 1);
  const scaleY = Math.abs(getNodeScaleY(node) || 1);
  const displayedAnchor = {
    x: terminal.anchor.x * (Math.sign(getNodeScaleX(node)) || 1),
    y: terminal.anchor.y * (Math.sign(getNodeScaleY(node)) || 1)
  };
  const crossAxisScale = Math.abs(displayedAnchor.x) >= Math.abs(displayedAnchor.y) ? scaleY : scaleX;
  return getDeviceStrokeWidth(node) * crossAxisScale;
}

export function getTerminal(node: ModelNode, terminalId?: string): Terminal {
  return node.terminals.find((terminal) => terminal.id === terminalId) ?? node.terminals[0] ?? virtualBusTerminal(node, terminalId) ?? node.terminals[0];
}

export function getTerminalPoint(node: ModelNode, terminalId?: string): Point {
  if (isRoutableLineDeviceKind(node.kind)) {
    const endpointPoints = routableLineDeviceCanvasPoints(node);
    if (endpointPoints.length >= 2) {
      const terminalIndex = Math.max(0, node.terminals.findIndex((terminal) => terminal.id === terminalId));
      return terminalIndex === 1 ? endpointPoints[endpointPoints.length - 1] : endpointPoints[0];
    }
  }
  const terminal = getTerminal(node, terminalId);
  const width = node.size.width * getNodeScaleX(node);
  const height = node.size.height * getNodeScaleY(node);
  const local = {
    x: terminal.anchor.x * width,
    y: terminal.anchor.y * height
  };
  const radians = degreesToRadians(node.rotation);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const outwardOffset = !isBusNode(node) ? terminalOutwardOffsetLength(terminal, node.kind) : 0;
  const normal = outwardOffset > 0 ? getTerminalNormal(node, terminal.id) : { x: 0, y: 0 };
  return {
    x: Math.round(node.position.x + local.x * cos - local.y * sin + normal.x * outwardOffset),
    y: Math.round(node.position.y + local.x * sin + local.y * cos + normal.y * outwardOffset)
  };
}

function terminalRefKey(nodeId: string, terminalId: string): string {
  return `${nodeId}:${terminalId}`;
}

function terminalPairKey(first: Pick<OverlappingTerminalRef, "nodeId" | "terminalId">, second: Pick<OverlappingTerminalRef, "nodeId" | "terminalId">): string {
  const refs = [terminalRefKey(first.nodeId, first.terminalId), terminalRefKey(second.nodeId, second.terminalId)].sort();
  return `${refs[0]}|${refs[1]}`;
}

function canReconcileImplicitTerminalConnection(node: ModelNode | undefined | null): node is ModelNode {
  return Boolean(node && !isBusNode(node) && !isStaticNode(node) && !isRoutableLineDeviceKind(node.kind));
}

export function getOverlappingTerminalGroups(nodes: ModelNode[], affectedNodeIds?: ReadonlySet<string>): OverlappingTerminalGroup[] {
  if (affectedNodeIds && affectedNodeIds.size === 0) {
    return [];
  }
  if (affectedNodeIds) {
    const affectedKeys = new Set<string>();
    const groups = new Map<string, OverlappingTerminalGroup>();
    for (const node of nodes) {
      if (!affectedNodeIds.has(node.id) || isBusNode(node) || isStaticNode(node)) {
        continue;
      }
      for (const terminal of node.terminals) {
        const point = getTerminalPoint(node, terminal.id);
        const key = `${terminal.type}:${point.x}:${point.y}`;
        affectedKeys.add(key);
        const group = groups.get(key) ?? { key, type: terminal.type, point, terminals: [] };
        group.terminals.push({ nodeId: node.id, terminalId: terminal.id, type: terminal.type, point });
        groups.set(key, group);
      }
    }
    if (affectedKeys.size === 0) {
      return [];
    }
    for (const node of nodes) {
      if (affectedNodeIds.has(node.id) || isBusNode(node) || isStaticNode(node)) {
        continue;
      }
      for (const terminal of node.terminals) {
        const point = getTerminalPoint(node, terminal.id);
        const key = `${terminal.type}:${point.x}:${point.y}`;
        if (!affectedKeys.has(key)) {
          continue;
        }
        const group = groups.get(key) ?? { key, type: terminal.type, point, terminals: [] };
        group.terminals.push({ nodeId: node.id, terminalId: terminal.id, type: terminal.type, point });
        groups.set(key, group);
      }
    }
    return Array.from(groups.values()).filter((group) => group.terminals.length > 1);
  }
  const groups = new Map<string, OverlappingTerminalGroup>();
  for (const node of nodes) {
    if (isBusNode(node) || isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      const point = getTerminalPoint(node, terminal.id);
      const key = `${terminal.type}:${point.x}:${point.y}`;
      const group = groups.get(key) ?? { key, type: terminal.type, point, terminals: [] };
      group.terminals.push({ nodeId: node.id, terminalId: terminal.id, type: terminal.type, point });
      groups.set(key, group);
    }
  }
  return Array.from(groups.values()).filter((group) => group.terminals.length > 1);
}

function terminalPointOnBus(bus: ModelNode, point: Point, tolerance = 0): Point | null {
  if (!isBusNode(bus)) {
    return null;
  }
  if (isBoundaryBusNode(bus)) {
    const projected = projectPointToNodeBoundary(bus, point);
    return Math.hypot(projected.x - point.x, projected.y - point.y) <= tolerance ? projected : null;
  }
  const local = pointToNodeLocal(bus, point);
  const halfWidth = (bus.size.width * Math.abs(getNodeScaleX(bus))) / 2;
  const halfHeight = Math.max(4, (bus.size.height * Math.abs(getNodeScaleY(bus))) / 2);
  if (local.x < -halfWidth - tolerance || local.x > halfWidth + tolerance || Math.abs(local.y) > halfHeight + tolerance) {
    return null;
  }
  return projectPointToBusCenterline(bus, point);
}

const TERMINAL_BUS_CONTACT_BUCKET_SIZE = 256;

export function getTerminalBusContactGroups(
  nodes: ModelNode[],
  tolerance = 0,
  affectedNodeIds?: ReadonlySet<string>
): TerminalBusContactGroup[] {
  const buses = nodes.filter(isBusNode);
  if (buses.length === 0) {
    return [];
  }
  type BusContactEntry = {
    bus: ModelNode;
    type: TerminalType;
    box: ReturnType<typeof boxFor>;
  };
  const busEntries = buses.map((bus) => ({
    bus,
    type: getBusTerminalType(bus),
    box: boxFor(bus, tolerance)
  })).filter((entry): entry is BusContactEntry => Boolean(entry.type));
  const busEntriesByType = new Map<TerminalType, BusContactEntry[]>();
  const affectedBusEntriesByType = new Map<TerminalType, BusContactEntry[]>();
  const busEntryBucketsByType = new Map<TerminalType, Map<string, BusContactEntry[]>>();
  const affectedBusEntryBucketsByType = new Map<TerminalType, Map<string, BusContactEntry[]>>();
  const bucketKey = (x: number, y: number) => `${x}:${y}`;
  const bucketRange = (box: BusContactEntry["box"]) => ({
    left: Math.floor(box.left / TERMINAL_BUS_CONTACT_BUCKET_SIZE),
    right: Math.floor(box.right / TERMINAL_BUS_CONTACT_BUCKET_SIZE),
    top: Math.floor(box.top / TERMINAL_BUS_CONTACT_BUCKET_SIZE),
    bottom: Math.floor(box.bottom / TERMINAL_BUS_CONTACT_BUCKET_SIZE)
  });
  const pushEntry = (map: Map<TerminalType, BusContactEntry[]>, entry: BusContactEntry) => {
    const bucket = map.get(entry.type);
    if (bucket) {
      bucket.push(entry);
    } else {
      map.set(entry.type, [entry]);
    }
  };
  const addEntryToBuckets = (map: Map<TerminalType, Map<string, BusContactEntry[]>>, entry: BusContactEntry) => {
    let buckets = map.get(entry.type);
    if (!buckets) {
      buckets = new Map<string, BusContactEntry[]>();
      map.set(entry.type, buckets);
    }
    const range = bucketRange(entry.box);
    for (let x = range.left; x <= range.right; x += 1) {
      for (let y = range.top; y <= range.bottom; y += 1) {
        const key = bucketKey(x, y);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(entry);
        } else {
          buckets.set(key, [entry]);
        }
      }
    }
  };
  for (const entry of busEntries) {
    pushEntry(busEntriesByType, entry);
    addEntryToBuckets(busEntryBucketsByType, entry);
    if (affectedNodeIds?.has(entry.bus.id)) {
      pushEntry(affectedBusEntriesByType, entry);
      addEntryToBuckets(affectedBusEntryBucketsByType, entry);
    }
  }
  const hasAffectedBusEntries = affectedBusEntriesByType.size > 0;
  const queryBusEntries = (map: Map<TerminalType, Map<string, BusContactEntry[]>>, type: TerminalType, point: Point) =>
    map.get(type)?.get(bucketKey(
      Math.floor(point.x / TERMINAL_BUS_CONTACT_BUCKET_SIZE),
      Math.floor(point.y / TERMINAL_BUS_CONTACT_BUCKET_SIZE)
    )) ?? [];
  const groups = new Map<string, TerminalBusContactGroup>();
  for (const node of nodes) {
    if (isBusNode(node) || isStaticNode(node)) {
      continue;
    }
    if (affectedNodeIds && !affectedNodeIds.has(node.id) && !hasAffectedBusEntries) {
      continue;
    }
    for (const terminal of node.terminals) {
      const point = getTerminalPoint(node, terminal.id);
      const candidateBuses = !affectedNodeIds
        ? queryBusEntries(busEntryBucketsByType, terminal.type, point)
        : affectedNodeIds.has(node.id)
          ? queryBusEntries(busEntryBucketsByType, terminal.type, point)
          : queryBusEntries(affectedBusEntryBucketsByType, terminal.type, point);
      if (candidateBuses.length === 0) {
        continue;
      }
      for (const entry of candidateBuses) {
        if (
          point.x < entry.box.left ||
          point.x > entry.box.right ||
          point.y < entry.box.top ||
          point.y > entry.box.bottom
        ) {
          continue;
        }
        const contactPoint = terminalPointOnBus(entry.bus, point, tolerance);
        if (!contactPoint) {
          continue;
        }
        const key = `${terminal.type}:${contactPoint.x}:${contactPoint.y}`;
        const terminalId = entry.bus.terminals[0]?.id ?? "t1";
        const group = groups.get(key) ?? { key, type: terminal.type, point: contactPoint, contacts: [] };
        group.contacts.push({
          nodeId: node.id,
          terminalId: terminal.id,
          busId: entry.bus.id,
          busTerminalId: terminalId,
          type: terminal.type,
          point: contactPoint
        });
        groups.set(key, group);
      }
    }
  }
  return Array.from(groups.values());
}

function collectOverlappingTerminalPairs(nodes: ModelNode[], affectedNodeIds?: ReadonlySet<string>) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const pairs = new Map<string, { first: OverlappingTerminalRef; second: OverlappingTerminalRef }>();
  for (const group of getOverlappingTerminalGroups(nodes, affectedNodeIds)) {
    for (let firstIndex = 0; firstIndex < group.terminals.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < group.terminals.length; secondIndex += 1) {
        const first = group.terminals[firstIndex];
        const second = group.terminals[secondIndex];
        if (first.nodeId === second.nodeId) {
          continue;
        }
        if (
          !canReconcileImplicitTerminalConnection(nodeById.get(first.nodeId)) ||
          !canReconcileImplicitTerminalConnection(nodeById.get(second.nodeId))
        ) {
          continue;
        }
        if (affectedNodeIds && !affectedNodeIds.has(first.nodeId) && !affectedNodeIds.has(second.nodeId)) {
          continue;
        }
        pairs.set(terminalPairKey(first, second), { first, second });
      }
    }
  }
  return pairs;
}

function terminalBusPairKey(contact: Pick<TerminalBusContact, "nodeId" | "terminalId" | "busId">): string {
  return `${terminalRefKey(contact.nodeId, contact.terminalId)}|bus:${contact.busId}`;
}

function collectTerminalBusContacts(
  nodes: ModelNode[],
  affectedNodeIds?: ReadonlySet<string>,
  options: { implicitReconcileOnly?: boolean } = {}
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const contacts = new Map<string, TerminalBusContact>();
  for (const group of getTerminalBusContactGroups(nodes, 0, affectedNodeIds)) {
    for (const contact of group.contacts) {
      if (options.implicitReconcileOnly && !canReconcileImplicitTerminalConnection(nodeById.get(contact.nodeId))) {
        continue;
      }
      contacts.set(terminalBusPairKey(contact), contact);
    }
  }
  return contacts;
}

function explicitEdgeTerminalPairKey(edge: Edge): string | null {
  if (!edge.sourceTerminalId || !edge.targetTerminalId || edge.sourceId === edge.targetId) {
    return null;
  }
  return terminalPairKey(
    { nodeId: edge.sourceId, terminalId: edge.sourceTerminalId },
    { nodeId: edge.targetId, terminalId: edge.targetTerminalId }
  );
}

function sameTypeEndpointTerminalsOverlap(nodesById: Map<string, ModelNode>, edge: Edge): boolean {
  const source = nodesById.get(edge.sourceId);
  const target = nodesById.get(edge.targetId);
  if (!canReconcileImplicitTerminalConnection(source) || !canReconcileImplicitTerminalConnection(target)) {
    return false;
  }
  const sourceTerminal = source.terminals.find((terminal) => terminal.id === edge.sourceTerminalId);
  const targetTerminal = target.terminals.find((terminal) => terminal.id === edge.targetTerminalId);
  if (!sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) {
    return false;
  }
  const sourcePoint = getTerminalPoint(source, sourceTerminal.id);
  const targetPoint = getTerminalPoint(target, targetTerminal.id);
  return sourcePoint.x === targetPoint.x && sourcePoint.y === targetPoint.y;
}

function sameTypeEndpointTouchesBus(nodesById: Map<string, ModelNode>, edge: Edge): boolean {
  const source = nodesById.get(edge.sourceId);
  const target = nodesById.get(edge.targetId);
  if (!source || !target) {
    return false;
  }
  const bus = isBusNode(source) ? source : isBusNode(target) ? target : null;
  const device = bus === source ? target : bus === target ? source : null;
  if (!bus || !canReconcileImplicitTerminalConnection(device)) {
    return false;
  }
  const deviceTerminalId = bus === source ? edge.targetTerminalId : edge.sourceTerminalId;
  const deviceTerminal = device.terminals.find((terminal) => terminal.id === deviceTerminalId);
  const busType = getBusTerminalType(bus);
  if (!deviceTerminal || !busType || deviceTerminal.type !== busType) {
    return false;
  }
  return Boolean(terminalPointOnBus(bus, getTerminalPoint(device, deviceTerminal.id), 0));
}

export function reconcileOverlappingTerminalConnections(
  previousNodes: ModelNode[],
  nextNodes: ModelNode[],
  edges: Edge[],
  createEdgeId: (first: OverlappingTerminalRef, second: OverlappingTerminalRef, index: number) => string = (_first, _second, index) => `overlap-edge-${index + 1}`,
  affectedNodeIds?: ReadonlySet<string>,
  candidateEdges: Edge[] = edges
): OverlappingTerminalConnectionReconcileResult {
  const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
  const previousPairs = collectOverlappingTerminalPairs(previousNodes, affectedNodeIds);
  const nextPairs = collectOverlappingTerminalPairs(nextNodes, affectedNodeIds);
  const previousBusContacts = collectTerminalBusContacts(previousNodes, affectedNodeIds, { implicitReconcileOnly: true });
  const nextBusContacts = collectTerminalBusContacts(nextNodes, affectedNodeIds, { implicitReconcileOnly: true });
  const edgeTouchesAffectedNode = (edge: Edge) =>
    !affectedNodeIds || affectedNodeIds.has(edge.sourceId) || affectedNodeIds.has(edge.targetId);
  const relevantEdges = affectedNodeIds ? candidateEdges.filter(edgeTouchesAffectedNode) : candidateEdges;
  const existingPairKeys = new Set(relevantEdges.flatMap((edge) => {
    const key = explicitEdgeTerminalPairKey(edge);
    return key ? [key] : [];
  }));
  const existingBusContactKeys = new Set(relevantEdges.flatMap((edge) => {
    const source = nextNodeById.get(edge.sourceId);
    const target = nextNodeById.get(edge.targetId);
    if (!source || !target) {
      return [];
    }
    const bus = isBusNode(source) ? source : isBusNode(target) ? target : null;
    const device = bus === source ? target : bus === target ? source : null;
    const terminalId = bus === source ? edge.targetTerminalId : edge.sourceTerminalId;
    return bus && device && terminalId ? [`${terminalRefKey(device.id, terminalId)}|bus:${bus.id}`] : [];
  }));
  const removedEdgeIds: string[] = [];
  for (const edge of relevantEdges) {
    if (!sameTypeEndpointTerminalsOverlap(nextNodeById, edge) && !sameTypeEndpointTouchesBus(nextNodeById, edge)) {
      continue;
    }
    removedEdgeIds.push(edge.id);
  }
  const removedEdgeIdSet = new Set(removedEdgeIds);
  const retainedEdges = removedEdgeIdSet.size > 0 ? edges.filter((edge) => !removedEdgeIdSet.has(edge.id)) : edges;
  let usedEdgeIds: Set<string> | null = null;
  const allocateEdgeId = (baseId: string) => {
    if (!usedEdgeIds) {
      usedEdgeIds = new Set(edges.map((edge) => edge.id));
    }
    let edgeId = baseId;
    let suffix = 2;
    while (usedEdgeIds.has(edgeId)) {
      edgeId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedEdgeIds.add(edgeId);
    return edgeId;
  };
  const addedEdges: Edge[] = [];
  let addedIndex = 0;
  for (const [pairKey, pair] of previousPairs.entries()) {
    if (nextPairs.has(pairKey) || existingPairKeys.has(pairKey)) {
      continue;
    }
    const nextFirst = nextNodeById.get(pair.first.nodeId)?.terminals.find((terminal) => terminal.id === pair.first.terminalId);
    const nextSecond = nextNodeById.get(pair.second.nodeId)?.terminals.find((terminal) => terminal.id === pair.second.terminalId);
    if (!nextFirst || !nextSecond || nextFirst.type !== nextSecond.type) {
      continue;
    }
    const baseId = createEdgeId(pair.first, pair.second, addedIndex);
    const edgeId = allocateEdgeId(baseId);
    addedIndex += 1;
    addedEdges.push({
      id: edgeId,
      sourceId: pair.first.nodeId,
      targetId: pair.second.nodeId,
      sourceTerminalId: pair.first.terminalId,
      targetTerminalId: pair.second.terminalId
    });
  }
  for (const [contactKey, contact] of previousBusContacts.entries()) {
    if (nextBusContacts.has(contactKey) || existingBusContactKeys.has(contactKey)) {
      continue;
    }
    const device = nextNodeById.get(contact.nodeId);
    const deviceTerminal = device?.terminals.find((terminal) => terminal.id === contact.terminalId);
    const bus = nextNodeById.get(contact.busId);
    if (!device || !deviceTerminal || !bus || getBusTerminalType(bus) !== deviceTerminal.type) {
      continue;
    }
    const busPoint = projectPointToBusCenterline(bus, getTerminalPoint(device, deviceTerminal.id));
    const baseId = createEdgeId(
      { nodeId: contact.nodeId, terminalId: contact.terminalId, type: contact.type, point: contact.point },
      { nodeId: contact.busId, terminalId: contact.busTerminalId, type: contact.type, point: busPoint },
      addedIndex
    );
    const candidateEdge: Edge = {
      id: baseId,
      sourceId: contact.nodeId,
      targetId: contact.busId,
      sourceTerminalId: contact.terminalId,
      targetTerminalId: contact.busTerminalId,
      targetPoint: busPoint
    };
    if (validateConnectionEndpointRules(nextNodes, [...retainedEdges, ...addedEdges], candidateEdge).length > 0) {
      continue;
    }
    const edgeId = allocateEdgeId(baseId);
    addedIndex += 1;
    addedEdges.push({ ...candidateEdge, id: edgeId });
  }
  if (removedEdgeIds.length === 0 && addedEdges.length === 0) {
    return { edges, addedEdgeIds: [], removedEdgeIds: [] };
  }
  return {
    edges: [...retainedEdges, ...addedEdges],
    addedEdgeIds: addedEdges.map((edge) => edge.id),
    removedEdgeIds
  };
}

export function isBusNode(node: ModelNode): boolean {
  return Boolean(busTerminalTypeByKind(node.kind));
}

function isBoundaryBusNode(node: Pick<ModelNode, "kind">): boolean {
  return (
    node.kind === "hydrogen-tank" ||
    node.kind === "hydrogen-tank-horizontal" ||
    node.kind === "hydrogen-tank-container" ||
    node.kind === "thermal-storage-tank"
  );
}

function createDynamicBusTerminal(node: ModelNode, index: number): Terminal {
  const id = `t${index + 1}`;
  const existing = node.terminals.find((terminal) => terminal.id === id);
  const type = existing?.type ?? getBusTerminalType(node) ?? "ac";
  const sameTypeFallback = node.terminals.find((terminal) => terminal.type === type);
  return {
    id,
    label: terminalLabelForType(type, index),
    type,
    anchor: existing?.anchor ?? busTerminalAnchor(index),
    nodeNumber: existing?.nodeNumber ?? makeNodeNumber(),
    vbase: existing?.vbase ?? sameTypeFallback?.vbase ?? defaultTerminalVbase(type)
  };
}

function terminalEquals(first: Terminal, second: Terminal): boolean {
  return (
    first.id === second.id &&
    first.label === second.label &&
    first.type === second.type &&
    first.nodeNumber === second.nodeNumber &&
    first.vbase === second.vbase &&
    first.anchor.x === second.anchor.x &&
    first.anchor.y === second.anchor.y
  );
}

function syncBusNodeTerminals(node: ModelNode, connectionEndpointCount: number): ModelNode {
  if (!isBusNode(node)) {
    return node;
  }
  const safeCount = Math.max(0, Math.round(connectionEndpointCount));
  const terminals = Array.from({ length: safeCount }, (_, index) => createDynamicBusTerminal(node, index));
  if (
    node.terminals.length === terminals.length &&
    node.terminals.every((terminal, index) => terminalEquals(terminal, terminals[index]))
  ) {
    return node;
  }
  return { ...node, terminals };
}

function synchronizeAffectedBusTerminalsWithEdges(
  nodes: ModelNode[],
  edges: Edge[],
  affectedNodeIds: ReadonlySet<string>
): { nodes: ModelNode[]; edges: Edge[] } {
  if (affectedNodeIds.size === 0) {
    return { nodes, edges };
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const busIdsToSync = new Set<string>();
  for (const nodeId of affectedNodeIds) {
    const node = nodeById.get(nodeId);
    if (node && isBusNode(node)) {
      busIdsToSync.add(node.id);
    }
  }
  for (const edge of edges) {
    if (!affectedNodeIds.has(edge.sourceId) && !affectedNodeIds.has(edge.targetId)) {
      continue;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && isBusNode(source)) {
      busIdsToSync.add(source.id);
    }
    if (target && isBusNode(target)) {
      busIdsToSync.add(target.id);
    }
  }
  for (const contact of collectTerminalBusContacts(nodes, affectedNodeIds).values()) {
    busIdsToSync.add(contact.busId);
  }
  if (busIdsToSync.size === 0) {
    return { nodes, edges };
  }

  const endpointCountByBusId = new Map<string, number>();
  const nextEndpointIndexByBusId = new Map<string, number>();
  const implicitContactCountByBusId = new Map<string, number>();
  for (const contact of collectTerminalBusContacts(nodes, busIdsToSync).values()) {
    if (busIdsToSync.has(contact.busId)) {
      implicitContactCountByBusId.set(contact.busId, (implicitContactCountByBusId.get(contact.busId) ?? 0) + 1);
    }
  }

  let edgesChanged = false;
  let nextEdges = edges;
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      continue;
    }
    let nextEdge = edge;
    const assignBusEndpoint = (endpoint: "source" | "target", busNode: ModelNode) => {
      if (!busIdsToSync.has(busNode.id)) {
        return;
      }
      const nextIndex = nextEndpointIndexByBusId.get(busNode.id) ?? 0;
      nextEndpointIndexByBusId.set(busNode.id, nextIndex + 1);
      endpointCountByBusId.set(busNode.id, (endpointCountByBusId.get(busNode.id) ?? 0) + 1);
      const terminalId = `t${nextIndex + 1}`;
      if (endpoint === "source") {
        if (nextEdge.sourceTerminalId !== terminalId) {
          nextEdge = { ...nextEdge, sourceTerminalId: terminalId };
        }
      } else if (nextEdge.targetTerminalId !== terminalId) {
        nextEdge = { ...nextEdge, targetTerminalId: terminalId };
      }
    };
    if (isBusNode(source)) {
      assignBusEndpoint("source", source);
    }
    if (isBusNode(target)) {
      assignBusEndpoint("target", target);
    }
    if (nextEdge !== edge) {
      if (nextEdges === edges) {
        nextEdges = edges.slice();
      }
      nextEdges[index] = nextEdge;
      edgesChanged = true;
    }
  }

  let nodesChanged = false;
  let nextNodes = nodes;
  for (const busId of busIdsToSync) {
    const node = nodeById.get(busId);
    if (!node || !isBusNode(node)) {
      continue;
    }
    const nextNode = syncBusNodeTerminals(
      node,
      (endpointCountByBusId.get(node.id) ?? 0) + (implicitContactCountByBusId.get(node.id) ?? 0)
    );
    if (nextNode === node) {
      continue;
    }
    if (nextNodes === nodes) {
      nextNodes = nodes.slice();
    }
    const nodeIndex = nodes.indexOf(node);
    if (nodeIndex >= 0) {
      nextNodes[nodeIndex] = nextNode;
      nodesChanged = true;
    }
  }

  return {
    nodes: nodesChanged ? nextNodes : nodes,
    edges: edgesChanged ? nextEdges : edges
  };
}

export function synchronizeBusTerminalsWithEdges(
  nodes: ModelNode[],
  edges: Edge[],
  affectedNodeIds?: Iterable<string>
): { nodes: ModelNode[]; edges: Edge[] } {
  if (affectedNodeIds) {
    return synchronizeAffectedBusTerminalsWithEdges(nodes, edges, new Set(affectedNodeIds));
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const endpointCountByBusId = new Map<string, number>();
  const nextEndpointIndexByBusId = new Map<string, number>();
  const implicitContactCountByBusId = new Map<string, number>();
  for (const contact of collectTerminalBusContacts(nodes).values()) {
    implicitContactCountByBusId.set(contact.busId, (implicitContactCountByBusId.get(contact.busId) ?? 0) + 1);
  }
  let edgesChanged = false;
  const nextEdges = edges.map((edge) => {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      return edge;
    }
    let nextEdge = edge;
    const assignBusEndpoint = (endpoint: "source" | "target", busNode: ModelNode) => {
      const nextIndex = nextEndpointIndexByBusId.get(busNode.id) ?? 0;
      nextEndpointIndexByBusId.set(busNode.id, nextIndex + 1);
      endpointCountByBusId.set(busNode.id, (endpointCountByBusId.get(busNode.id) ?? 0) + 1);
      const terminalId = `t${nextIndex + 1}`;
      if (endpoint === "source") {
        if (nextEdge.sourceTerminalId !== terminalId) {
          nextEdge = { ...nextEdge, sourceTerminalId: terminalId };
          edgesChanged = true;
        }
      } else if (nextEdge.targetTerminalId !== terminalId) {
        nextEdge = { ...nextEdge, targetTerminalId: terminalId };
        edgesChanged = true;
      }
    };
    if (isBusNode(source)) {
      assignBusEndpoint("source", source);
    }
    if (isBusNode(target)) {
      assignBusEndpoint("target", target);
    }
    return nextEdge;
  });
  let nodesChanged = false;
  const nextNodes = nodes.map((node) => {
    if (!isBusNode(node)) {
      return node;
    }
    const nextNode = syncBusNodeTerminals(
      node,
      (endpointCountByBusId.get(node.id) ?? 0) + (implicitContactCountByBusId.get(node.id) ?? 0)
    );
    if (nextNode !== node) {
      nodesChanged = true;
    }
    return nextNode;
  });
  return {
    nodes: nodesChanged ? nextNodes : nodes,
    edges: edgesChanged ? nextEdges : edges
  };
}

function pointToNodeLocal(node: ModelNode, point: Point): Point {
  const radians = degreesToRadians(-node.rotation);
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
}

function nodeLocalToPoint(node: ModelNode, local: Point): Point {
  const radians = degreesToRadians(node.rotation);
  return {
    x: Math.round(node.position.x + local.x * Math.cos(radians) - local.y * Math.sin(radians)),
    y: Math.round(node.position.y + local.x * Math.sin(radians) + local.y * Math.cos(radians))
  };
}

function projectPointToNodeBoundary(node: ModelNode, point: Point): Point {
  const local = pointToNodeLocal(node, point);
  const halfWidth = Math.max(1, (node.size.width * Math.abs(getNodeScaleX(node))) / 2);
  const halfHeight = Math.max(1, (node.size.height * Math.abs(getNodeScaleY(node))) / 2);
  const xRatio = Math.abs(local.x) / halfWidth;
  const yRatio = Math.abs(local.y) / halfHeight;
  const projected =
    xRatio >= yRatio
      ? {
          x: local.x >= 0 ? halfWidth : -halfWidth,
          y: clampNumber(local.y, -halfHeight, halfHeight)
        }
      : {
          x: clampNumber(local.x, -halfWidth, halfWidth),
          y: local.y >= 0 ? halfHeight : -halfHeight
        };
  return nodeLocalToPoint(node, projected);
}

function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return start;
  }
  const ratio = clampNumber(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio
  };
}

function cubicBezierPoint(start: Point, controlA: Point, controlB: Point, end: Point, ratio: number): Point {
  const inverse = 1 - ratio;
  const inverseSquared = inverse * inverse;
  const ratioSquared = ratio * ratio;
  return {
    x: inverseSquared * inverse * start.x + 3 * inverseSquared * ratio * controlA.x + 3 * inverse * ratioSquared * controlB.x + ratioSquared * ratio * end.x,
    y: inverseSquared * inverse * start.y + 3 * inverseSquared * ratio * controlA.y + 3 * inverse * ratioSquared * controlB.y + ratioSquared * ratio * end.y
  };
}

function closestPointOnTankBody(localPoint: Point, node: ModelNode): Point {
  const scaleX = Math.abs(getNodeScaleX(node) || 1);
  const scaleY = Math.abs(getNodeScaleY(node) || 1);
  const halfWidth = Math.max(1, (node.size.width * scaleX) / 2);
  const halfHeight = Math.max(1, (node.size.height * scaleY) / 2);
  const sideInset = Math.min(10 * scaleX, halfWidth * 0.45);
  const bodyHalfWidth = Math.max(1, halfWidth - sideInset);
  const sideTop = -halfHeight / 2;
  const sideBottom = halfHeight / 2;
  const topLeft = { x: -bodyHalfWidth, y: sideTop };
  const topRight = { x: bodyHalfWidth, y: sideTop };
  const bottomRight = { x: bodyHalfWidth, y: sideBottom };
  const bottomLeft = { x: -bodyHalfWidth, y: sideBottom };
  const topControlA = { x: -(node.size.width * scaleX) / 3, y: -halfHeight };
  const topControlB = { x: (node.size.width * scaleX) / 3, y: -halfHeight };
  const bottomControlA = { x: (node.size.width * scaleX) / 3, y: halfHeight };
  const bottomControlB = { x: -(node.size.width * scaleX) / 3, y: halfHeight };
  const candidates: Point[] = [
    closestPointOnSegment(localPoint, topLeft, bottomLeft),
    closestPointOnSegment(localPoint, topRight, bottomRight)
  ];
  const sampleBezier = (start: Point, controlA: Point, controlB: Point, end: Point) => {
    let previous = start;
    for (let index = 1; index <= 32; index += 1) {
      const next = cubicBezierPoint(start, controlA, controlB, end, index / 32);
      candidates.push(closestPointOnSegment(localPoint, previous, next));
      previous = next;
    }
  };
  sampleBezier(topLeft, topControlA, topControlB, topRight);
  sampleBezier(bottomRight, bottomControlA, bottomControlB, bottomLeft);
  return candidates.reduce((best, candidate) => {
    const bestDistance = Math.hypot(localPoint.x - best.x, localPoint.y - best.y);
    const candidateDistance = Math.hypot(localPoint.x - candidate.x, localPoint.y - candidate.y);
    return candidateDistance < bestDistance ? candidate : best;
  }, candidates[0]);
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

export function projectPointToBusCenterline(node: ModelNode, point: Point): Point {
  if (isBoundaryBusNode(node)) {
    return projectPointToNodeBoundary(node, point);
  }
  const radians = degreesToRadians(-node.rotation);
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  const local = {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const clampedX = clampNumber(local.x, -halfWidth, halfWidth);
  const forwardRadians = degreesToRadians(node.rotation);
  return {
    x: Math.round(node.position.x + clampedX * Math.cos(forwardRadians)),
    y: Math.round(node.position.y + clampedX * Math.sin(forwardRadians))
  };
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
  if (!isBoundaryBusNode(busNode)) {
    const rotationRadians = degreesToRadians(busNode.rotation);
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    const halfWidth = (busNode.size.width * Math.abs(getNodeScaleX(busNode))) / 2;
    const distance =
      segmentStart.x === segmentEnd.x
        ? Math.abs(cos) > 1e-6
          ? (segmentStart.x - busNode.position.x) / cos
          : null
        : segmentStart.y === segmentEnd.y && Math.abs(sin) > 1e-6
          ? (segmentStart.y - busNode.position.y) / sin
          : null;
    if (distance !== null) {
      const clampedDistance = clampNumber(distance, -halfWidth, halfWidth);
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

export function getEdgeEndpointPoint(node: ModelNode, endpointPoint?: Point, terminalId?: string): Point {
  return endpointPoint && isBusNode(node) ? projectPointToBusCenterline(node, endpointPoint) : getTerminalPoint(node, terminalId);
}

function getElementTreeTypeLabel(node: ModelNode, templateByKind: ReadonlyMap<string, DeviceTemplate>): string {
  return templateByKind.get(node.kind)?.label ?? node.kind;
}

export const ELEMENT_TREE_COMPONENT_LIBRARY_LABELS: Record<string, string> = {
  StaticTextSymbol: "静态文本",
  StaticMediaSymbol: "静态媒体",
  StaticBasicShape: "基础图形",
  StaticFlowNode: "流程节点",
  StaticButton: "按钮图元",
  StaticContainerSymbol: "容器图元",
  StaticConnectorSymbol: "连接图元",
  StaticAnnotationSymbol: "标注图元",
  ACRealBs: "交流母线",
  DCRealBs: "直流母线",
  ACNode: "交流节点",
  DCNode: "直流节点",
  ACBranch: "交流支路",
  DCBranch: "直流支路",
  ACLoad: "交流负荷",
  DCLoad: "直流负荷",
  ACGenerator: "交流电源",
  DCGenerator: "直流电源",
  ACShuntCompensator: "交流无功补偿",
  ACZeroBranch: "交流零阻支路",
  DCZeroBranch: "直流零阻支路",
  ACSwitch: "交流开关",
  DCSwitch: "直流开关",
  ACBreak: "交流断路器",
  DCBreak: "直流断路器",
  GroundDisconnector: "接地刀闸",
  ACTransformer: "双绕组变压器",
  ACTransWinding: "变压器绕组",
  ACTransfomer3: "三绕组变压器",
  DCDCConverter: "直流变换器",
  DCACConverter: "交直流变换器",
  ACACConverter: "交流变换器",
  HydroSource: "氢源",
  HydroLoad: "氢负荷",
  HydroPipe: "输氢管道",
  HydroCompressor: "氢压缩机",
  HydroPressRegulator: "氢调压器",
  HydroStopValve: "氢截止阀",
  HydroBus: "氢母线",
  HeatSource: "热源",
  HeatLoad: "热负荷",
  HeatPipe: "热管道",
  HeatExchanger: "换热器",
  HeatPump: "热泵",
  HeatBus: "热母线"
};

// 派生元件库标签从内置图元定义（ELECTRIC_GENERATION_FAMILY_SPECS）动态生成，
// 复用 electricGenerationDerivedInfoForFamily 的派生推导，与 template.label 保持一致
for (const family of ELECTRIC_GENERATION_FAMILY_SPECS) {
  for (const terminalType of ELECTRIC_GENERATION_TERMINAL_TYPES) {
    const info = electricGenerationDerivedInfoForFamily(terminalType, family);
    ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[info.derivedComponentLibrary] = info.label;
  }
}

// 反向映射表：支持多个中文名映射到同一个英文元件库名
// 从 ELEMENT_TREE_COMPONENT_LIBRARY_LABELS 生成反向映射，附加别名
export const COMPONENT_LIBRARY_REVERSE_MAPPING: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ELEMENT_TREE_COMPONENT_LIBRARY_LABELS).map(([en, cn]) => [cn, en])
  ),
  "交流线路": "ACBranch",
  "双绕组主变+三绕组主变": "ACTransformer",
  "ACNode+交流母线": "ACNode"
};

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

export function getTerminalNormal(node: ModelNode, terminalId?: string): Point {
  const terminal = getTerminal(node, terminalId);
  const scaledAnchor = {
    x: terminal.anchor.x * (Math.sign(getNodeScaleX(node)) || 1),
    y: terminal.anchor.y * (Math.sign(getNodeScaleY(node)) || 1)
  };
  const raw =
    Math.abs(scaledAnchor.x) >= Math.abs(scaledAnchor.y)
      ? { x: Math.sign(scaledAnchor.x || 1), y: 0 }
      : { x: 0, y: Math.sign(scaledAnchor.y || 1) };
  const radians = degreesToRadians(node.rotation);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: Math.round(raw.x * cos - raw.y * sin),
    y: Math.round(raw.x * sin + raw.y * cos)
  };
}

function getBusNormalToward(node: ModelNode, otherPoint: Point): Point {
  const radians = degreesToRadians(node.rotation);
  const normal = { x: -Math.sin(radians), y: Math.cos(radians) };
  const vector = { x: otherPoint.x - node.position.x, y: otherPoint.y - node.position.y };
  const dot = normal.x * vector.x + normal.y * vector.y;
  const direction = dot >= 0 ? 1 : -1;
  const x = Math.round(normal.x * direction);
  const y = Math.round(normal.y * direction);
  if (x === 0 && y === 0) {
    return { x: 0, y: -1 };
  }
  return { x, y };
}

function getBoundaryNormalAtPoint(node: ModelNode, point: Point): Point {
  const local = pointToNodeLocal(node, point);
  const halfWidth = Math.max(1, (node.size.width * Math.abs(getNodeScaleX(node))) / 2);
  const halfHeight = Math.max(1, (node.size.height * Math.abs(getNodeScaleY(node))) / 2);
  const xRatio = Math.abs(local.x) / halfWidth;
  const yRatio = Math.abs(local.y) / halfHeight;
  const raw = xRatio >= yRatio
    ? { x: Math.sign(local.x || 1), y: 0 }
    : { x: 0, y: Math.sign(local.y || 1) };
  const radians = degreesToRadians(node.rotation);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: Math.round(raw.x * cos - raw.y * sin),
    y: Math.round(raw.x * sin + raw.y * cos)
  };
}

function getBusEndpointNormal(node: ModelNode, endpointPoint: Point, otherPoint: Point): Point {
  return isBoundaryBusNode(node) ? getBoundaryNormalAtPoint(node, endpointPoint) : getBusNormalToward(node, otherPoint);
}

export function getRouteEndpointNormal(node: ModelNode, endpointPoint: Point, otherPoint: Point, terminalId?: string): Point {
  return isBusNode(node) ? getBusEndpointNormal(node, endpointPoint, otherPoint) : getTerminalNormal(node, terminalId);
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
  return getTerminal(source, sourceTerminalId).type === getTerminal(target, targetTerminalId).type;
}

type ConnectionEndpointRef = {
  node: ModelNode;
  nodeId: string;
  terminalId: string;
  isBus: boolean;
};

function edgeEndpointRefs(nodeById: ReadonlyMap<string, ModelNode>, edge: Edge): [ConnectionEndpointRef, ConnectionEndpointRef] | null {
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return null;
  }
  const sourceTerminal = getTerminal(source, edge.sourceTerminalId);
  const targetTerminal = getTerminal(target, edge.targetTerminalId);
  if (!sourceTerminal || !targetTerminal) {
    return null;
  }
  return [
    { node: source, nodeId: source.id, terminalId: sourceTerminal.id, isBus: isBusNode(source) },
    { node: target, nodeId: target.id, terminalId: targetTerminal.id, isBus: isBusNode(target) }
  ];
}

function sameEndpointRef(first: ConnectionEndpointRef, second: ConnectionEndpointRef): boolean {
  return first.nodeId === second.nodeId && first.terminalId === second.terminalId;
}

function unorderedEndpointPairKey(first: ConnectionEndpointRef, second: ConnectionEndpointRef): string {
  const refs = [terminalRefKey(first.nodeId, first.terminalId), terminalRefKey(second.nodeId, second.terminalId)].sort();
  return `${refs[0]}|${refs[1]}`;
}

function terminalBusEndpointPairKey(first: ConnectionEndpointRef, second: ConnectionEndpointRef): string {
  if (first.isBus && second.isBus) {
    return ["bus", first.nodeId, second.nodeId].sort().join(":");
  }
  if (first.isBus) {
    return `bus:${first.nodeId}|terminal:${terminalRefKey(second.nodeId, second.terminalId)}`;
  }
  if (second.isBus) {
    return `bus:${second.nodeId}|terminal:${terminalRefKey(first.nodeId, first.terminalId)}`;
  }
  return "";
}

function endpointBelongsToMultiTerminalDevice(endpoint: ConnectionEndpointRef): boolean {
  return !endpoint.isBus && endpoint.node.terminals.length > 1;
}

function deviceBusEndpointPair(
  first: ConnectionEndpointRef,
  second: ConnectionEndpointRef
): { device: ConnectionEndpointRef; bus: ConnectionEndpointRef } | null {
  if (first.isBus === second.isBus) {
    return null;
  }
  const device = first.isBus ? second : first;
  const bus = first.isBus ? first : second;
  if (!endpointBelongsToMultiTerminalDevice(device)) {
    return null;
  }
  return { device, bus };
}

function hasSameDeviceSameBusEndpointConflict(
  candidateFirst: ConnectionEndpointRef,
  candidateSecond: ConnectionEndpointRef,
  existingFirst: ConnectionEndpointRef,
  existingSecond: ConnectionEndpointRef
): { device: ConnectionEndpointRef; bus: ConnectionEndpointRef } | null {
  const candidate = deviceBusEndpointPair(candidateFirst, candidateSecond);
  const existing = deviceBusEndpointPair(existingFirst, existingSecond);
  if (
    candidate &&
    existing &&
    candidate.device.nodeId === existing.device.nodeId &&
    candidate.device.terminalId !== existing.device.terminalId &&
    candidate.bus.nodeId === existing.bus.nodeId
  ) {
    return candidate;
  }
  return null;
}

function hasSharedOppositeTerminalConflict(
  candidateLocal: ConnectionEndpointRef,
  candidateRemote: ConnectionEndpointRef,
  existingFirst: ConnectionEndpointRef,
  existingSecond: ConnectionEndpointRef
): boolean {
  return (
    endpointBelongsToMultiTerminalDevice(candidateLocal) &&
    !candidateRemote.isBus &&
    existingFirst.nodeId === candidateLocal.nodeId &&
    existingFirst.terminalId !== candidateLocal.terminalId &&
    sameEndpointRef(existingSecond, candidateRemote)
  );
}

export function validateConnectionEndpointRules(
  nodes: ModelNode[],
  existingEdges: Edge[],
  candidateEdge: Edge
): ConnectionEndpointRuleIssue[] {
  const issues: ConnectionEndpointRuleIssue[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const candidateRefs = edgeEndpointRefs(nodeById, candidateEdge);
  if (!candidateRefs) {
    return issues;
  }
  const [candidateSource, candidateTarget] = candidateRefs;
  if (candidateSource.nodeId === candidateTarget.nodeId) {
    issues.push({
      type: "same-device-terminals",
      edgeId: candidateEdge.id,
      message: "同一设备的任意两个端子之间不能相互连接。"
    });
    return issues;
  }

  const candidateTerminalPairKey = unorderedEndpointPairKey(candidateSource, candidateTarget);
  const candidateTerminalBusKey = terminalBusEndpointPairKey(candidateSource, candidateTarget);

  for (const existingEdge of existingEdges) {
    if (existingEdge.id === candidateEdge.id) {
      continue;
    }
    const existingRefs = edgeEndpointRefs(nodeById, existingEdge);
    if (!existingRefs) {
      continue;
    }
    const [existingSource, existingTarget] = existingRefs;
    if (!candidateTerminalBusKey && unorderedEndpointPairKey(existingSource, existingTarget) === candidateTerminalPairKey) {
      issues.push({
        type: "duplicate-terminal-pair",
        edgeId: candidateEdge.id,
        conflictingEdgeId: existingEdge.id,
        message: "两个端子之间已存在联络线，不能重复连接。"
      });
      return issues;
    }
    if (candidateTerminalBusKey && terminalBusEndpointPairKey(existingSource, existingTarget) === candidateTerminalBusKey) {
      issues.push({
        type: "duplicate-terminal-bus",
        edgeId: candidateEdge.id,
        conflictingEdgeId: existingEdge.id,
        message: "该端子与该母线类设备之间已存在联络线，不能重复连接。"
      });
      return issues;
    }
    const sameDeviceSameBus = hasSameDeviceSameBusEndpointConflict(candidateSource, candidateTarget, existingSource, existingTarget);
    if (sameDeviceSameBus) {
      issues.push({
        type: "same-device-same-bus-endpoints",
        edgeId: candidateEdge.id,
        conflictingEdgeId: existingEdge.id,
        message: `同一个设备的两个端点不能落在同一个母线上（${sameDeviceSameBus.device.node.name} / ${sameDeviceSameBus.bus.node.name}）。`
      });
      return issues;
    }
    if (
      hasSharedOppositeTerminalConflict(candidateSource, candidateTarget, existingSource, existingTarget) ||
      hasSharedOppositeTerminalConflict(candidateSource, candidateTarget, existingTarget, existingSource) ||
      hasSharedOppositeTerminalConflict(candidateTarget, candidateSource, existingSource, existingTarget) ||
      hasSharedOppositeTerminalConflict(candidateTarget, candidateSource, existingTarget, existingSource)
    ) {
      issues.push({
        type: "shared-opposite-terminal",
        edgeId: candidateEdge.id,
        conflictingEdgeId: existingEdge.id,
        message: "同一多端设备的不同端子不能连接到同一个外部端子。"
      });
      return issues;
    }
  }

  return issues;
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

type ElectricalTerminalType = Extract<TerminalType, "ac" | "dc">;

function isElectricalTerminalType(type: TerminalType): type is ElectricalTerminalType {
  return type === "ac" || type === "dc";
}

function resolveTopologyEdgeTerminal(node: ModelNode | undefined, terminalId?: string): Terminal | undefined {
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
    return normalizeSwitchStatusForE(node.params.status ?? node.params.closedStatus) !== "0";
  }
  return false;
}

function isTwoWindingTransformerNode(node: Pick<ModelNode, "kind">): boolean {
  return node.kind === "ac-transformer" || node.kind === "ac-two-winding-transformer";
}

function isTwoTerminalTopologyDevice(node: ModelNode): boolean {
  return !isBusNode(node) && !isStaticNode(node) && node.terminals.length === 2;
}

type TopologyConnectivity = {
  terminalKey: (nodeId: string, terminalId: string) => string;
  topologyRoot: (nodeId: string, terminalId: string) => string;
  islandRoot: (nodeId: string, terminalId: string) => string;
};

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

function buildTopologyConnectivity(nodes: ModelNode[], edges: Edge[]): TopologyConnectivity {
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
    if (!isVoltageBaseValueParamKey(key) || node.params[key] === value) {
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

function containerVoltageBaseParamTerminalIds(node: ModelNode, key: string): Set<string> | null {
  const normalized = key.trim().toLowerCase();
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
  if (compact === "highvbase") {
    return terminalIdSet(terminalIdAt(node, 0));
  }
  if (compact === "mediumvbase") {
    return terminalIdSet(terminalIdAt(node, 1));
  }
  if (compact === "lowvbase") {
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
    if (!isVoltageBaseValueParamKey(key) || node.params[key] === value) {
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
    if (!isVoltageBaseValueParamKey(key)) {
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

  const connectivity = buildTopologyConnectivity(nodes, edges);
  const selectedIslandRoots = new Set<string>();
  for (const node of nodes) {
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
  for (const node of nodes) {
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
  const targets = collectVoltageBaseScopeTargets(nodes, edges, selectedNodeIds, scope);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = nodes.map((node) => {
    if (!targets.nodeIds.has(node.id)) {
      return node;
    }
    const targetTerminalIds = targets.terminalIdsByNodeId?.get(node.id);
    const nextNode = targetTerminalIds
      ? setNodeVoltageBaseValuesForTerminals(node, targetTerminalIds, "0.0")
      : setNodeVoltageBaseValues(node, "0.0");
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
  const targets = collectVoltageBaseScopeTargets(nodes, edges, selectedNodeIds, scope);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = nodes.map((node) => {
    if (!targets.nodeIds.has(node.id)) {
      return node;
    }
    const settingMode = voltageBaseSettingModeForNode(node);
    const targetTerminalIds = targets.terminalIdsByNodeId?.get(node.id);
    const nextNode = settingMode === "uniform"
      ? targetTerminalIds
        ? setNodeVoltageBaseValuesForTerminals(node, targetTerminalIds, value)
        : setNodeVoltageBaseValues(node, value)
      : settingMode === "terminal" && targetTerminalIds
        ? setNodeVoltageBaseValuesForTerminals(node, targetTerminalIds, value)
        : node;
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
  const valuesByNodeId = scope === "island"
    ? islandVoltageBaseTerminalValues(nodes, edges, terminalValuesByNodeId)
    : selectedVoltageBaseTerminalValues(nodes, terminalValuesByNodeId);
  const nodeUpdates: ModelNode[] = [];
  const nextNodes = nodes.map((node) => {
    const valuesByTerminalId = valuesByNodeId.get(node.id);
    if (!valuesByTerminalId) {
      return node;
    }
    const nextNode = setNodeVoltageBaseValuesByTerminal(node, valuesByTerminalId);
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

type IslandVoltageGroup = {
  type: ElectricalTerminalType;
  relatedNodeIds: Set<string>;
  voltages: Map<string, string>;
};

function collectElectricalIslandVoltageGroups(nodes: ModelNode[], connectivity: TopologyConnectivity) {
  const groups = new Map<string, IslandVoltageGroup>();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      if (!isElectricalTerminalType(terminal.type)) {
        continue;
      }
      const root = connectivity.islandRoot(node.id, terminal.id);
      const key = `${terminal.type}:${root}`;
      const group = groups.get(key) ?? { type: terminal.type, relatedNodeIds: new Set<string>(), voltages: new Map<string, string>() };
      group.relatedNodeIds.add(node.id);
      const voltage = terminalVoltageDisplay(node, terminal);
      if (voltage && !isZeroNumericText(voltage)) {
        group.voltages.set(voltage, voltage);
      }
      groups.set(key, group);
    }
  }
  return groups;
}

export function calculateElectricalTopology(nodes: ModelNode[], edges: Edge[]): ModelNode[] {
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
      assignTerminalParam("high_vbase", terminals[0]);
      assignTerminalParam("medium_vbase", terminals[1]);
      assignTerminalParam("low_vbase", terminals[2]);
      if (hasVisibleThreeWindingNeutralTerminal(node)) {
        assignTerminalParam("neutral_vbase", terminals[3]);
      }
    } else if (isTwoWindingTransformerNode(node)) {
      assignTerminalParam("high_vbase", terminals[0]);
      assignTerminalParam("low_vbase", terminals[1]);
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
    const section = inferESection(node.kind, node.params);
    if (section === "ACGenerator" || section === "DCGenerator") {
      const type: TerminalType = section === "ACGenerator" ? "ac" : "dc";
      assignIfZero("v_set", terminals.find((terminal) => terminal.type === type) ?? terminals[0]);
    }
    if (section === "DCDCConverter") {
      const sourceControl = normalizeDcdcEndpointControlTypeForE(params.i_control_type || params.sourceControlType || params.control_type);
      const targetControl = normalizeDcdcEndpointControlTypeForE(params.j_control_type || params.targetControlType);
      const controlledTerminal = targetControl === "V"
        ? terminals[1]
        : sourceControl === "V"
          ? terminals[0]
          : terminals[0];
      assignIfZero("v_set", controlledTerminal);
    }
    if (section === "DCACConverter") {
      assignIfZero("v_ac_set", terminals.find((terminal) => terminal.type === "ac") ?? terminals[0]);
      assignIfZero("v_dc_set", terminals.find((terminal) => terminal.type === "dc") ?? terminals[1]);
      assignIfZero("ac_v_set", terminals.find((terminal) => terminal.type === "ac") ?? terminals[0]);
      assignIfZero("dc_v_set", terminals.find((terminal) => terminal.type === "dc") ?? terminals[1]);
    }
    if (section === "ACACConverter") {
      assignIfZero("i_v_set", terminals[0]);
      assignIfZero("j_v_set", terminals[1]);
    }
    if (section === "DCDCConverter" || section === "DCACConverter" || section === "ACACConverter") {
      assignIfZero("v_set", terminals[0]);
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
        t1_node: terminals[0]?.nodeNumber ?? "",
        t2_node: terminals[1]?.nodeNumber ?? "",
        t3_node: terminals[2]?.nodeNumber ?? ""
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
  return numberedNodes.map((node) => {
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
}

function normalizeVoltage(value?: string): string {
  return terminalVoltageBaseNumber(value) || (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function getNodeVoltageLevel(node: ModelNode): string {
  return normalizeVoltage(
    node.params.vbase ??
      node.params.voltageLevel ??
      node.params.ratedVoltage ??
      node.params.voltage ??
      node.params.acVoltage ??
      node.params.dcVoltage ??
      ""
  );
}

export function getTerminalVoltageLevel(node: ModelNode, terminalId?: string): string {
  const terminal = getTerminal(node, terminalId);
  return normalizeVoltage(terminal ? terminalVoltageDisplay(node, terminal) : getNodeVoltageLevel(node));
}

export function validateVoltageSetpointDeviations(nodes: ModelNode[], edges: Edge[]): TopologyValidationError[] {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const errors: TopologyValidationError[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const resolveEdgeTerminal = (node: ModelNode, terminalId?: string) => {
    if (terminalId) {
      return node.terminals.find((terminal) => terminal.id === terminalId);
    }
    return node.terminals[0];
  };
  const parent = new Map<string, string>();
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

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    const sourceTerminal = source ? resolveEdgeTerminal(source, edge.sourceTerminalId) : undefined;
    const targetTerminal = target ? resolveEdgeTerminal(target, edge.targetTerminalId) : undefined;
    if (!source || !target || !sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) {
      continue;
    }
    union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));
  }

  const voltageGroups = new Map<
    string,
    {
      voltages: Map<string, string>;
    }
  >();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const root = find(terminalKey(node.id, terminal.id));
      const group = voltageGroups.get(root) ?? { voltages: new Map<string, string>() };
      const voltage = getTerminalVoltageLevel(node, terminal.id);
      if (voltage && !isZeroNumericText(voltage)) {
        group.voltages.set(voltage, voltage);
      }
      voltageGroups.set(root, group);
    }
  }

  const ratedVoltageForTerminal = (node: ModelNode, terminal?: Terminal) => {
    if (!terminal) {
      return "";
    }
    const root = find(terminalKey(node.id, terminal.id));
    const group = voltageGroups.get(root);
    if (group?.voltages.size === 1) {
      return terminalVoltageBaseNumber(Array.from(group.voltages.values())[0]);
    }
    return terminalVoltageDisplay(node, terminal);
  };
  const addVoltageSetpointDeviation = (node: ModelNode, paramKey: string, terminal?: Terminal) => {
    if (isZeroNumericText(node.params[paramKey])) {
      return;
    }
    const setpoint = terminalVoltageBaseNumber(node.params[paramKey]);
    const ratedVoltage = ratedVoltageForTerminal(node, terminal);
    if (!setpoint || !ratedVoltage) {
      return;
    }
    const setpointValue = Number(setpoint);
    const ratedVoltageValue = Number(ratedVoltage);
    if (!Number.isFinite(setpointValue) || !Number.isFinite(ratedVoltageValue) || ratedVoltageValue <= 0) {
      return;
    }
    const deviation = Math.abs(setpointValue - ratedVoltageValue) / ratedVoltageValue;
    if (deviation <= 0.3) {
      return;
    }
    errors.push({
      id: `voltage-setpoint-deviation:${node.id}:${paramKey}`,
      type: "voltage-setpoint-deviation",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `${node.name} 的 ${paramKey}=${setpoint} 与节点额定电压 ${ratedVoltage} 偏差超过 30%。`
    });
  };

  for (const node of nodes) {
    if (isStaticNode(node)) {
      continue;
    }
    const section = inferESection(node.kind, node.params);
    const checkedVoltageSetpointKeys = new Set<string>();
    const addNodeVoltageSetpointDeviation = (paramKey: string, terminal?: Terminal) => {
      if (checkedVoltageSetpointKeys.has(paramKey)) {
        return;
      }
      checkedVoltageSetpointKeys.add(paramKey);
      addVoltageSetpointDeviation(node, paramKey, terminal);
    };
    if (section === "ACGenerator" || section === "DCGenerator" || section === "ACShuntCompensator") {
      const expectedType: TerminalType = section === "DCGenerator" ? "dc" : "ac";
      addNodeVoltageSetpointDeviation("v_set", node.terminals.find((terminal) => terminal.type === expectedType) ?? node.terminals[0]);
    }
    if (section === "DCDCConverter") {
      const sourceControl = normalizeDcdcEndpointControlTypeForE(node.params.i_control_type || node.params.sourceControlType || node.params.control_type);
      const targetControl = normalizeDcdcEndpointControlTypeForE(node.params.j_control_type || node.params.targetControlType);
      addNodeVoltageSetpointDeviation("v_set", targetControl === "V" ? node.terminals[1] : sourceControl === "V" ? node.terminals[0] : node.terminals[0]);
    }
    if (section === "DCACConverter") {
      addNodeVoltageSetpointDeviation("v_ac_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_dc_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
      addNodeVoltageSetpointDeviation("ac_v_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("dc_v_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
    }
    if (section === "ACACConverter") {
      addNodeVoltageSetpointDeviation("i_v_set", node.terminals[0]);
      addNodeVoltageSetpointDeviation("j_v_set", node.terminals[1]);
    }
    if (section === "DCDCConverter" || section === "DCACConverter" || section === "ACACConverter") {
      addNodeVoltageSetpointDeviation("v_set", node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_ac_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_dc_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
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
        addNodeVoltageSetpointDeviation(containerRelationParamKey(fieldName, "v_set"), node.terminals[parsed.terminalNumber - 1]);
      }
    }
  }

  return errors;
}

type DeviceIdentityValidationEntry = {
  typeKey: string;
  idx: string;
  name: string;
  node: ModelNode;
};

function identityValidationEntriesForNode(node: ModelNode): DeviceIdentityValidationEntry[] {
  if (isStaticNode(node)) {
    return [];
  }
  const entries: DeviceIdentityValidationEntry[] = [];
  const primaryTypeKey = deviceIndexCounterKey(node);
  const idx = parseDeviceIndex(node.params.idx);
  if (primaryTypeKey) {
    entries.push({
      typeKey: primaryTypeKey,
      idx: idx > 0 ? String(idx) : "",
      name: node.name.trim(),
      node
    });
  }
  if (isContainerParams(node.params)) {
    for (const [fieldName, value] of Object.entries(node.params)) {
      const relationTypeKey = containerRelationCounterKey(fieldName);
      const relationIdx = parseDeviceIndex(value);
      if (!relationTypeKey || relationIdx <= 0) {
        continue;
      }
      entries.push({
        typeKey: relationTypeKey,
        idx: String(relationIdx),
        name: containerAssociatedDeviceName(node, fieldName),
        node
      });
    }
  }
  return entries;
}

function duplicateDeviceIdentityErrors(nodes: ModelNode[]): TopologyValidationError[] {
  const errors: TopologyValidationError[] = [];
  const entries = nodes.flatMap(identityValidationEntriesForNode);
  const addDuplicateErrors = (
    type: Extract<TopologyValidationErrorType, "duplicate-device-idx" | "duplicate-device-name">,
    valueOf: (entry: DeviceIdentityValidationEntry) => string,
    messageOf: (typeKey: string, value: string, entries: DeviceIdentityValidationEntry[]) => string
  ) => {
    const groups = new Map<string, DeviceIdentityValidationEntry[]>();
    for (const entry of entries) {
      const value = valueOf(entry).trim();
      if (!value) {
        continue;
      }
      const key = `${entry.typeKey}\u0000${value}`;
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    for (const [key, group] of groups) {
      const uniqueNodeIds = Array.from(new Set(group.map((entry) => entry.node.id)));
      if (group.length <= 1) {
        continue;
      }
      const [typeKey, value] = key.split("\u0000");
      errors.push({
        id: `${type}:${encodeURIComponent(typeKey)}:${encodeURIComponent(value)}`,
        type,
        nodeId: uniqueNodeIds[0],
        relatedNodeIds: uniqueNodeIds,
        message: messageOf(typeKey, value, group)
      });
    }
  };

  addDuplicateErrors(
    "duplicate-device-idx",
    (entry) => entry.idx,
    (typeKey, value, group) =>
      `图上拓扑失败：同类型设备 ${typeKey} 的 idx=${value} 重复（${group.map((entry) => entry.node.name).join("、")}）。`
  );
  addDuplicateErrors(
    "duplicate-device-name",
    (entry) => entry.name,
    (typeKey, value) => `图上拓扑失败：同类型设备 ${typeKey} 的 name=${value} 重复。`
  );
  return errors;
}

export function validateTopology(
  nodes: ModelNode[],
  edges: Edge[],
  options: { includeVoltageSetpointDeviations?: boolean } = {}
): TopologyValidationError[] {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const topologyEdges = [...edges, ...routableLineDeviceTopologyEdges(nodes)];
  const errors: TopologyValidationError[] = duplicateDeviceIdentityErrors(nodes);
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

  if (errors.length > 0 || options.includeVoltageSetpointDeviations === false) {
    return errors;
  }
  return validateVoltageSetpointDeviations(calculateElectricalTopology(nodes, edges), edges);
}

export function topologyCalculationMessage(errorCount: number) {
  return errorCount === 0
    ? "图上拓扑成功。"
    : `图上拓扑失败：发现 ${errorCount} 条错误，已定位到第一条错误。`;
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

function defaultModelLayer(): ModelLayer {
  return { id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true };
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
  while (changed) {
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
  const lockedProject = normalizeProjectLayers(lockProjectEdgeTerminals(project));
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
        sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
        targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
        manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
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

function savedProjectDisplayName(name: string, fallback = "未命名模型"): string {
  const normalized = name.trim().replace(/电力系统/g, "电力能源系统") || fallback;
  const suffixMatch = /^(.*?)\s*\((\d+)\)$/u.exec(normalized);
  if (!suffixMatch) {
    return normalized;
  }
  const base = suffixMatch[1].trim();
  // Explicit copies are intentionally named "副本", while numeric suffixes on
  // ordinary model names come from older duplicate-normalization bugs.
  return base && !base.endsWith("副本") ? base : normalized;
}

export function savedProjectRecordNameKey(name: string): string {
  return savedProjectDisplayName(name).toLocaleLowerCase();
}

function savedSchemeDisplayName(name: string, fallback = "未命名方案"): string {
  return name.trim().replace(/电力系统/g, "电力能源系统") || fallback;
}

function savedRuntimePathKey(kind: "scheme" | "project", path: string[]): string {
  return `${kind}:${path.map((part) => encodeURIComponent(part)).join("/")}`;
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
    return {
      ...scheme,
      id: savedRuntimePathKey("scheme", schemePath),
      projects: normalizeSavedProjectRecordNames(scheme.projects ?? []).map((project) => {
        const name = savedProjectDisplayName(project.name);
        return {
          ...project,
          id: savedRuntimePathKey("project", [...schemePath, name]),
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
    merged.set(key, {
      ...(backendUpdatedAt >= localUpdatedAt ? backendScheme : localScheme),
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

function savedSchemeChildren(scheme: SavedSchemeRecord): SavedSchemeRecord[] {
  return Array.isArray(scheme.children) ? scheme.children : [];
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
  children: SavedSchemeRecord[] = []
): SavedSchemeRecord {
  return {
    id: makeId("scheme"),
    name: name.trim() || "未命名方案",
    updatedAt: new Date().toISOString(),
    projects,
    children
  };
}

export function flattenSavedSchemes(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  return schemes.flatMap((scheme) => [scheme, ...flattenSavedSchemes(savedSchemeChildren(scheme))]);
}

export function flattenSavedProjects(schemes: SavedSchemeRecord[]): SavedProjectRecord[] {
  return schemes.flatMap((scheme) => [...scheme.projects, ...flattenSavedProjects(savedSchemeChildren(scheme))]);
}

export function nextSavedProjectAfterSchemeDeletion(
  schemes: SavedSchemeRecord[],
  activeSchemeId: string,
  deletingSchemeIds: Set<string>
): SavedProjectSelection | null {
  const flatSchemes = flattenSavedSchemes(schemes);
  const activeIndex = flatSchemes.findIndex((scheme) => scheme.id === activeSchemeId);
  const startIndex = activeIndex >= 0 ? activeIndex : -1;
  const canSelectScheme = (scheme: SavedSchemeRecord) =>
    !deletingSchemeIds.has(scheme.id) && scheme.projects.length > 0;
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
  schemeId: string
): SavedSchemeRecord | undefined {
  if (!schemeId) {
    return undefined;
  }
  for (const scheme of schemes) {
    if (scheme.id === schemeId) {
      return scheme;
    }
    const child = findSavedSchemeById(savedSchemeChildren(scheme), schemeId);
    if (child) {
      return child;
    }
  }
  return undefined;
}

export function findSavedSchemeParentById(
  schemes: SavedSchemeRecord[],
  schemeId: string
): SavedSchemeRecord | undefined {
  if (!schemeId) {
    return undefined;
  }
  for (const scheme of schemes) {
    if (savedSchemeChildren(scheme).some((child) => child.id === schemeId)) {
      return scheme;
    }
    const parent = findSavedSchemeParentById(savedSchemeChildren(scheme), schemeId);
    if (parent) {
      return parent;
    }
  }
  return undefined;
}

export function findSavedProjectRecordInSchemes(
  schemes: SavedSchemeRecord[],
  projectId: string,
  preferredSchemeId = ""
): { scheme: SavedSchemeRecord; project: SavedProjectRecord } | null {
  if (!projectId) {
    return null;
  }
  const flattenedSchemes = flattenSavedSchemes(schemes);
  const preferredScheme = preferredSchemeId ? flattenedSchemes.find((scheme) => scheme.id === preferredSchemeId) : undefined;
  const searchSchemes = preferredScheme
    ? [preferredScheme, ...flattenedSchemes.filter((scheme) => scheme.id !== preferredScheme.id)]
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
  schemeId: string,
  excludeSchemeId = ""
): string[] {
  const parent = findSavedSchemeParentById(schemes, schemeId);
  const siblings = parent ? savedSchemeChildren(parent) : schemes;
  return siblings.filter((scheme) => scheme.id !== excludeSchemeId).map((scheme) => scheme.name);
}

export function savedChildSchemeNames(schemes: SavedSchemeRecord[], parentSchemeId = ""): string[] {
  if (!parentSchemeId) {
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
  parentSchemeId: string,
  childScheme: SavedSchemeRecord
): SavedSchemeRecord[] {
  if (!parentSchemeId) {
    return [...schemes, childScheme];
  }
  const now = new Date().toISOString();
  let inserted = false;
  const nextSchemes = mapSavedSchemeTree(schemes, (scheme) => {
    if (scheme.id !== parentSchemeId) {
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
  schemeId: string,
  replacement: SavedSchemeRecord
): SavedSchemeRecord[] {
  return mapSavedSchemeTree(schemes, (scheme) => (scheme.id === schemeId ? replacement : scheme));
}

export function upsertSavedProjectInScheme(
  schemes: SavedSchemeRecord[],
  schemeId: string,
  record: SavedProjectRecord
): SavedSchemeRecord[] {
  const now = new Date().toISOString();
  return mapSavedSchemeTree(schemes, (scheme) =>
    scheme.id === schemeId
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
  schemeId: string,
  nextName: string
): SavedSchemeRecord[] {
  const name = nextName.trim() || "未命名方案";
  const renameInLevel = (level: SavedSchemeRecord[]): { schemes: SavedSchemeRecord[]; changed: boolean } => {
    const target = level.find((scheme) => scheme.id === schemeId);
    if (target) {
      const hasConflict = level.some((scheme) => scheme.id !== schemeId && scheme.name.trim() === name);
      if (hasConflict) {
        return { schemes: level, changed: false };
      }
      return {
        schemes: level.map((scheme) =>
          scheme.id === schemeId ? { ...scheme, name, updatedAt: new Date().toISOString() } : scheme
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

export function deleteSavedScheme(schemes: SavedSchemeRecord[], schemeId: string): SavedSchemeRecord[] {
  let changed = false;
  const nextSchemes = schemes.flatMap((scheme) => {
    if (scheme.id === schemeId) {
      changed = true;
      return [];
    }
    const children = savedSchemeChildren(scheme);
    const nextChildren = children.length > 0 ? deleteSavedScheme(children, schemeId) : children;
    if (nextChildren !== children) {
      changed = true;
      return [{ ...scheme, updatedAt: new Date().toISOString(), children: nextChildren }];
    }
    return [scheme];
  });
  return changed ? nextSchemes : schemes;
}

function savedSchemeTreeContainsId(scheme: SavedSchemeRecord, schemeId: string): boolean {
  return scheme.id === schemeId || savedSchemeChildren(scheme).some((child) => savedSchemeTreeContainsId(child, schemeId));
}

function removeSavedSchemesByIds(
  schemes: SavedSchemeRecord[],
  schemeIds: Set<string>,
  updatedAt: string
): { schemes: SavedSchemeRecord[]; changed: boolean } {
  let changed = false;
  const nextSchemes = schemes.flatMap((scheme) => {
    if (schemeIds.has(scheme.id)) {
      changed = true;
      return [];
    }
    const children = savedSchemeChildren(scheme);
    const childResult = children.length > 0
      ? removeSavedSchemesByIds(children, schemeIds, updatedAt)
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
  schemeId: string,
  targetParentSchemeId: string,
  options: { targetName?: string; overwriteSchemeId?: string } = {}
): SavedSchemeRecord[] {
  const sourceScheme = findSavedSchemeById(schemes, schemeId);
  if (!sourceScheme || schemeId === targetParentSchemeId) {
    return schemes;
  }
  if (targetParentSchemeId && savedSchemeTreeContainsId(sourceScheme, targetParentSchemeId)) {
    return schemes;
  }
  const targetParentScheme = targetParentSchemeId ? findSavedSchemeById(schemes, targetParentSchemeId) : undefined;
  if (targetParentSchemeId && !targetParentScheme) {
    return schemes;
  }
  const overwriteSchemeId = options.overwriteSchemeId ?? "";
  if (overwriteSchemeId && (overwriteSchemeId === schemeId || savedSchemeTreeContainsId(sourceScheme, overwriteSchemeId))) {
    return schemes;
  }
  const targetSiblings = targetParentScheme ? savedSchemeChildren(targetParentScheme) : schemes;
  if (overwriteSchemeId && !targetSiblings.some((scheme) => scheme.id === overwriteSchemeId)) {
    return schemes;
  }
  const sourceParentId = findSavedSchemeParentById(schemes, schemeId)?.id ?? "";
  const targetName = (options.targetName ?? sourceScheme.name).trim() || "未命名方案";
  if (!overwriteSchemeId) {
    const hasNameConflict = targetSiblings.some((scheme) => scheme.id !== schemeId && scheme.name.trim() === targetName);
    if (hasNameConflict) {
      return schemes;
    }
  }
  if (sourceParentId === targetParentSchemeId && targetName === sourceScheme.name && !overwriteSchemeId) {
    return schemes;
  }
  const now = new Date().toISOString();
  const movedScheme: SavedSchemeRecord = { ...sourceScheme, name: targetName, updatedAt: now };
  const removeIds = new Set([schemeId, overwriteSchemeId].filter(Boolean));
  const removed = removeSavedSchemesByIds(schemes, removeIds, now);
  if (!removed.changed) {
    return schemes;
  }
  if (!targetParentSchemeId) {
    return [...removed.schemes, movedScheme];
  }
  let inserted = false;
  const insertedSchemes = mapSavedSchemeTree(removed.schemes, (scheme) => {
    if (scheme.id !== targetParentSchemeId) {
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

export function moveProjectToScheme(
  schemes: SavedSchemeRecord[],
  projectId: string,
  targetSchemeId: string
): SavedSchemeRecord[] {
  const sourceRecord = findSavedProjectRecordInSchemes(schemes, projectId);
  const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
  const project = sourceRecord?.project;
  if (!sourceRecord || !targetScheme || !project || sourceRecord.scheme.id === targetSchemeId) {
    return schemes;
  }
  const now = new Date().toISOString();
  return mapSavedSchemeTree(schemes, (scheme) => {
    if (scheme.id === sourceRecord.scheme.id) {
      return { ...scheme, updatedAt: now, projects: scheme.projects.filter((item) => item.id !== projectId) };
    }
    if (scheme.id === targetSchemeId) {
      return { ...scheme, updatedAt: now, projects: upsertSavedProject(scheme.projects, project) };
    }
    return scheme;
  });
}

function hasUprightVisualContent(node: ModelNode) {
  return Boolean(
    node.kind === "static-text" ||
      node.kind === "static-image" ||
      node.params.backgroundImage ||
      node.params.backgroundImageAssetId ||
      node.params.foregroundImage ||
      node.params.foregroundImageAssetId
  );
}

function visualHalfExtentsForNode(node: ModelNode) {
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
  const radians = degreesToRadians(node.rotation);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotatedHalfWidth = halfWidth * cos + halfHeight * sin;
  const rotatedHalfHeight = halfWidth * sin + halfHeight * cos;
  if (!isBusNode(node) && hasUprightVisualContent(node)) {
    return {
      halfWidth: Math.max(halfWidth, rotatedHalfWidth),
      halfHeight: Math.max(halfHeight, rotatedHalfHeight)
    };
  }
  return {
    halfWidth: rotatedHalfWidth,
    halfHeight: rotatedHalfHeight
  };
}

function bodyVisualBoxForNode(node: ModelNode, padding = 0, position = node.position) {
  const { halfWidth, halfHeight } = visualHalfExtentsForNode(node);
  return {
    left: position.x - halfWidth - padding,
    right: position.x + halfWidth + padding,
    top: position.y - halfHeight - padding,
    bottom: position.y + halfHeight + padding
  };
}

function routableLineDeviceRouteBox(node: ModelNode, padding = 0, position = node.position): RouteBlockerBox | null {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return null;
  }
  const points = routableLineDeviceCanvasPoints(node, position);
  if (points.length < 2) {
    return null;
  }
  const strokePadding = Math.max(padding, getDeviceStrokeWidth(node) / 2 + padding);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs) - strokePadding,
    right: Math.max(...xs) + strokePadding,
    top: Math.min(...ys) - strokePadding,
    bottom: Math.max(...ys) + strokePadding
  };
}

function boxFor(node: ModelNode, padding = 0) {
  return bodyVisualBoxForNode(node, padding);
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

type RouteBlockerBox = ReturnType<typeof boxFor>;

function numericNodeParamForRoute(node: ModelNode, key: string, fallback: number) {
  const parsed = Number(node.params[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function routeNodeLabelText(node: ModelNode) {
  return node.params._labelText ?? node.name;
}

function routeNodeLabelDisplayMode(node: ModelNode) {
  const mode = node.params._labelDisplayMode;
  if (mode === "always" || mode === "hidden" || mode === "follow") {
    return mode;
  }
  return node.params._labelVisible === "0" ? "hidden" : "follow";
}

function routeNodeLabelBlocksRouting(node: ModelNode) {
  return (
    !isStaticNode(node) &&
    node.params._labelVisible !== "0" &&
    routeNodeLabelDisplayMode(node) !== "hidden" &&
    routeNodeLabelText(node).trim().length > 0
  );
}

function routeNodeLabelOffset(node: ModelNode): Point {
  return {
    x: numericNodeParamForRoute(node, "_labelX", 0),
    y: numericNodeParamForRoute(node, "_labelY", Math.round(node.size.height / 2 + 22))
  };
}

function normalizeRouteNodeLabelRotation(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  const snapped = Math.round((Number.isFinite(parsed) ? parsed : 0) / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

function routeNodeLabelVertical(node: ModelNode) {
  const rotation = normalizeRouteNodeLabelRotation(node.params._labelRotation);
  return rotation === 90 || rotation === 270;
}

const routeNodeLabelNumericTokenPattern = String.raw`\d+(?:[./:：-]\d+)*`;
const routeNodeLabelNumericTokenRegex = new RegExp(`^${routeNodeLabelNumericTokenPattern}`);

function routeNodeLabelVerticalSegments(text: string) {
  const segments: Array<{ text: string; numeric: boolean }> = [];
  let remaining = text;
  while (remaining) {
    const numericMatch = remaining.match(routeNodeLabelNumericTokenRegex);
    if (numericMatch?.[0]) {
      segments.push({ text: numericMatch[0], numeric: true });
      remaining = remaining.slice(numericMatch[0].length);
      continue;
    }
    const [char] = Array.from(remaining);
    if (!char) {
      break;
    }
    segments.push({ text: char, numeric: false });
    remaining = remaining.slice(char.length);
  }
  return segments;
}

function routeNodeLabelFontSize(node: ModelNode) {
  const baseSize = numericNodeParamForRoute(node, "_labelFontSize", DEFAULT_DEVICE_LABEL_FONT_SIZE);
  const scaleX = getSafeNodeScaleX(node);
  const scaleY = getSafeNodeScaleY(node);
  return baseSize * Math.sqrt(scaleX * scaleY);
}

function routeNodeLabelCanvasCenter(node: ModelNode, position = node.position): Point {
  const offset = routeNodeLabelOffset(node);
  const scaleX = getSafeNodeScaleX(node);
  const scaleY = getSafeNodeScaleY(node);
  return {
    x: position.x + offset.x * scaleX,
    y: position.y + offset.y * scaleY
  };
}

function routeNodeLabelTextAnchor(node: ModelNode) {
  const anchor = node.params._labelTextAnchor;
  return anchor === "start" || anchor === "end" || anchor === "middle" ? anchor : "middle";
}

function routeTextVisualWidth(text: string, fontSize: number) {
  return Array.from(text).reduce((width, char) => width + fontSize * (char.charCodeAt(0) > 255 ? 1 : 0.62), 0);
}

function nodeLabelVisualBox(node: ModelNode, padding = 0, position = node.position): RouteBlockerBox | null {
  if (!routeNodeLabelBlocksRouting(node)) {
    return null;
  }
  const text = routeNodeLabelText(node).trim();
  const center = routeNodeLabelCanvasCenter(node, position);
  const fontSize = routeNodeLabelFontSize(node);
  const effectivePadding = padding + Math.max(6, fontSize * 0.2);
  if (routeNodeLabelVertical(node)) {
    const segments = routeNodeLabelVerticalSegments(text);
    const width = Math.max(fontSize, ...segments.map((segment) => routeTextVisualWidth(segment.text, fontSize)));
    const height = Math.max(fontSize * 1.35, segments.length * fontSize * 1.2);
    return {
      left: center.x - width / 2 - effectivePadding,
      right: center.x + width / 2 + effectivePadding,
      top: center.y - height / 2 - effectivePadding,
      bottom: center.y + height / 2 + effectivePadding
    };
  }
  const width = Math.max(fontSize, routeTextVisualWidth(text, fontSize));
  const height = fontSize * 1.35;
  const anchor = routeNodeLabelTextAnchor(node);
  const left = anchor === "start" ? center.x : anchor === "end" ? center.x - width : center.x - width / 2;
  const right = anchor === "start" ? center.x + width : anchor === "end" ? center.x : center.x + width / 2;
  return {
    left: left - effectivePadding,
    right: right + effectivePadding,
    top: center.y - height / 2 - effectivePadding,
    bottom: center.y + height / 2 + effectivePadding
  };
}

function nodeLabelRouteBlockerBox(node: ModelNode, padding = 0): RouteBlockerBox | null {
  return nodeLabelVisualBox(node, Math.max(padding, 4));
}

function nodeLabelBridgeBlockerBox(
  node: ModelNode,
  bodyBox: RouteBlockerBox,
  labelBox: RouteBlockerBox,
  padding = 0
): RouteBlockerBox | null {
  const center = routeNodeLabelCanvasCenter(node);
  const bodyCenter = node.position;
  if (center.x >= bodyBox.left && center.x <= bodyBox.right && center.y >= bodyBox.top && center.y <= bodyBox.bottom) {
    return null;
  }
  if (labelBox.top >= bodyBox.bottom) {
    return {
      left: Math.min(bodyBox.left, labelBox.left, bodyCenter.x, center.x),
      right: Math.max(bodyBox.right, labelBox.right, bodyCenter.x, center.x),
      top: bodyBox.bottom,
      bottom: labelBox.top
    };
  }
  if (labelBox.bottom <= bodyBox.top) {
    return {
      left: Math.min(bodyBox.left, labelBox.left, bodyCenter.x, center.x),
      right: Math.max(bodyBox.right, labelBox.right, bodyCenter.x, center.x),
      top: labelBox.bottom,
      bottom: bodyBox.top
    };
  }
  if (labelBox.left >= bodyBox.right) {
    return {
      left: bodyBox.right,
      right: labelBox.left,
      top: Math.min(bodyBox.top, labelBox.top, bodyCenter.y, center.y),
      bottom: Math.max(bodyBox.bottom, labelBox.bottom, bodyCenter.y, center.y)
    };
  }
  if (labelBox.right <= bodyBox.left) {
    return {
      left: labelBox.right,
      right: bodyBox.left,
      top: Math.min(bodyBox.top, labelBox.top, bodyCenter.y, center.y),
      bottom: Math.max(bodyBox.bottom, labelBox.bottom, bodyCenter.y, center.y)
    };
  }
  return {
    left: Math.min(bodyBox.left, labelBox.left, bodyCenter.x, center.x),
    right: Math.max(bodyBox.right, labelBox.right, bodyCenter.x, center.x),
    top: Math.min(bodyBox.top, labelBox.top, bodyCenter.y, center.y),
    bottom: Math.max(bodyBox.bottom, labelBox.bottom, bodyCenter.y, center.y)
  };
}

function mergeRouteBlockerBoxes(boxes: RouteBlockerBox[]): RouteBlockerBox {
  return boxes.reduce((merged, box) => ({
    left: Math.min(merged.left, box.left),
    right: Math.max(merged.right, box.right),
    top: Math.min(merged.top, box.top),
    bottom: Math.max(merged.bottom, box.bottom)
  }));
}

function routeBlockerPadding(node: ModelNode, padding: number) {
  return isBoundaryBusNode(node) ? 0 : padding;
}

function routeBodyBlockerBox(node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  const effectivePadding = routeBlockerPadding(node, padding);
  const bodyBox = boxFor(node, effectivePadding);
  const routeBox = routableLineDeviceRouteBox(node, effectivePadding);
  return routeBox ? mergeRouteBlockerBoxes([bodyBox, routeBox]) : bodyBox;
}

const routeBlockerBoxCache = new WeakMap<ModelNode, Map<number, RouteBlockerBox>>();

function computeRouteBlockerBox(node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  const effectivePadding = routeBlockerPadding(node, padding);
  const bodyBox = routeBodyBlockerBox(node, padding);
  const labelBox = nodeLabelRouteBlockerBox(node, effectivePadding);
  if (!labelBox) {
    return bodyBox;
  }
  const bridgeBox = nodeLabelBridgeBlockerBox(node, bodyBox, labelBox, effectivePadding);
  return mergeRouteBlockerBoxes(bridgeBox ? [bodyBox, labelBox, bridgeBox] : [bodyBox, labelBox]);
}

function routeBlockerBox(node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  let boxesByPadding = routeBlockerBoxCache.get(node);
  if (!boxesByPadding) {
    boxesByPadding = new Map<number, RouteBlockerBox>();
    routeBlockerBoxCache.set(node, boxesByPadding);
  }
  const cached = boxesByPadding.get(padding);
  if (cached) {
    return cached;
  }
  const box = computeRouteBlockerBox(node, padding);
  boxesByPadding.set(padding, box);
  return box;
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

function pointInsideBox(point: Point, box: ReturnType<typeof boxFor>) {
  return point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
}

function boxesOverlap(first: ReturnType<typeof boxFor>, second: ReturnType<typeof boxFor>) {
  return first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
}

function segmentIntersectsBox(a: Point, b: Point, box: ReturnType<typeof boxFor>) {
  if (pointInsideBox(a, box) || pointInsideBox(b, box)) {
    return true;
  }
  if (a.x === b.x) {
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    return a.x > box.left && a.x < box.right && yMax > box.top && yMin < box.bottom;
  }
  if (a.y === b.y) {
    const xMin = Math.min(a.x, b.x);
    const xMax = Math.max(a.x, b.x);
    return a.y > box.top && a.y < box.bottom && xMax > box.left && xMin < box.right;
  }
  return false;
}

// 路由相交测试会对同一个 routable-line 阻挡物反复取其画布折线（每次都 JSON.parse + 三角变换）。
// 节点不可变（改动会生成新对象），故按节点引用缓存；本函数仅只读遍历该数组，缓存无副作用风险。
const routableLineBlockerCanvasPointsCache = new WeakMap<ModelNode, Point[]>();

function routableLineDeviceRouteSegmentIntersectionBox(a: Point, b: Point, node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  let points = routableLineBlockerCanvasPointsCache.get(node);
  if (!points) {
    points = routableLineDeviceCanvasPoints(node);
    routableLineBlockerCanvasPointsCache.set(node, points);
  }
  if (points.length < 2) {
    return null;
  }
  const strokePadding = getDeviceStrokeWidth(node) / 2 + padding;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (samePoint(previous, point)) {
      continue;
    }
    const segmentCorridor = routeCorridor(previous, point, strokePadding);
    if (segmentIntersectsBox(a, b, segmentCorridor)) {
      return segmentCorridor;
    }
  }
  return null;
}

// 标签避让框（含文本宽度测量）是 (node, padding) 的纯函数，但会对每个 (a,b) 线段重复计算。
// 节点不可变，按 node→padding 缓存盒子，只读使用，无副作用。
type RoutableLineLabelBoxes = { labelBox: RouteBlockerBox | null; bridgeBox: RouteBlockerBox | null };
const routableLineLabelBoxCache = new WeakMap<ModelNode, Map<number, RoutableLineLabelBoxes>>();

function routableLineDeviceLabelBoxes(node: ModelNode, padding: number): RoutableLineLabelBoxes {
  let byPadding = routableLineLabelBoxCache.get(node);
  if (!byPadding) {
    byPadding = new Map();
    routableLineLabelBoxCache.set(node, byPadding);
  }
  const cached = byPadding.get(padding);
  if (cached) {
    return cached;
  }
  const effectivePadding = routeBlockerPadding(node, padding);
  const labelBox = nodeLabelRouteBlockerBox(node, effectivePadding);
  const boxes: RoutableLineLabelBoxes = labelBox
    ? { labelBox, bridgeBox: nodeLabelBridgeBlockerBox(node, bodyVisualBoxForNode(node, effectivePadding), labelBox, effectivePadding) }
    : { labelBox: null, bridgeBox: null };
  byPadding.set(padding, boxes);
  return boxes;
}

function routableLineDeviceLabelIntersectionBox(a: Point, b: Point, node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  const { labelBox, bridgeBox } = routableLineDeviceLabelBoxes(node, padding);
  if (!labelBox) {
    return null;
  }
  if (segmentIntersectsBox(a, b, labelBox)) {
    return labelBox;
  }
  return bridgeBox && segmentIntersectsBox(a, b, bridgeBox) ? bridgeBox : null;
}

function routeSegmentBlockerIntersectionBox(a: Point, b: Point, node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  if (!staticNodeParticipatesInRoutingAvoidance(node)) {
    return null;
  }
  if (isRoutableLineDeviceKind(node.kind)) {
    return (
      routableLineDeviceRouteSegmentIntersectionBox(a, b, node, padding) ??
      routableLineDeviceLabelIntersectionBox(a, b, node, padding)
    );
  }
  const mergedBox = routeBlockerBox(node, padding);
  if (!segmentIntersectsBox(a, b, mergedBox)) {
    return null;
  }
  if (!isBusNode(node)) {
    return mergedBox;
  }

  const effectivePadding = routeBlockerPadding(node, padding);
  const bodyBox = routeBodyBlockerBox(node, padding);
  if (segmentIntersectsBox(a, b, bodyBox)) {
    return bodyBox;
  }

  const labelBox = nodeLabelRouteBlockerBox(node, effectivePadding);
  if (!labelBox) {
    return null;
  }
  if (segmentIntersectsBox(a, b, labelBox)) {
    return labelBox;
  }

  const bridgeBox = nodeLabelBridgeBlockerBox(node, bodyBox, labelBox, effectivePadding);
  return bridgeBox && segmentIntersectsBox(a, b, bridgeBox) ? bridgeBox : null;
}

export function segmentIntersectsNodeBody(a: Point, b: Point, node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  return Boolean(routeSegmentBlockerIntersectionBox(a, b, node, padding));
}

type EdgeSide = "source" | "target";

function oppositeEdgeSide(side: EdgeSide): EdgeSide {
  return side === "source" ? "target" : "source";
}

function edgeTerminalId(edge: Edge, side: EdgeSide) {
  return side === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
}

function edgeEndpointStoredPoint(edge: Edge, side: EdgeSide) {
  return side === "source" ? edge.sourcePoint : edge.targetPoint;
}

function isOrthogonalDirectSegment(a: Point, b: Point) {
  return Math.round(a.x) === Math.round(b.x) || Math.round(a.y) === Math.round(b.y);
}

function directSegmentClearOfNodeBodies(a: Point, b: Point, nodes: ModelNode[], excludedNodeIds: Set<string>) {
  return nodes.every((node) =>
    excludedNodeIds.has(node.id) ||
    node.id.startsWith("floating-") ||
    !staticNodeParticipatesInRoutingAvoidance(node) ||
    !segmentIntersectsNodeBody(a, b, node)
  );
}

function normalAxisDistance(from: Point, to: Point, normal: Point) {
  if (normal.x !== 0) {
    return (to.x - from.x) * Math.sign(normal.x);
  }
  if (normal.y !== 0) {
    return (to.y - from.y) * Math.sign(normal.y);
  }
  return 0;
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

function routeCorridor(a: Point, b: Point, margin: number) {
  return {
    left: Math.min(a.x, b.x) - margin,
    right: Math.max(a.x, b.x) + margin,
    top: Math.min(a.y, b.y) - margin,
    bottom: Math.max(a.y, b.y) + margin
  };
}

function relevantBlockersForRoute(source: ModelNode, target: ModelNode, nodes: ModelNode[], startOut: Point, endOut: Point, useCorridor = true) {
  const corridor = routeCorridor(startOut, endOut, 96);
  return nodes.filter((node) => {
    if (node.id === source.id || node.id === target.id || node.id.startsWith("floating-")) {
      return false;
    }
    if (!staticNodeParticipatesInRoutingAvoidance(node)) {
      return false;
    }
    return !useCorridor || boxesOverlap(routeBlockerBox(node, 24), corridor);
  });
}

function segmentOverlapAmount(a: Point, b: Point, segment: Segment) {
  if (a.x === b.x && segment.orientation === "vertical" && a.x === segment.a.x) {
    const top = clampNumber(segment.b.y, Math.min(a.y, b.y), segment.a.y);
    const bottom = Math.min(Math.max(a.y, b.y), Math.max(segment.a.y, segment.b.y));
    return Math.max(0, bottom - top);
  }
  if (a.y === b.y && segment.orientation === "horizontal" && a.y === segment.a.y) {
    const left = clampNumber(segment.b.x, Math.min(a.x, b.x), segment.a.x);
    const right = Math.min(Math.max(a.x, b.x), Math.max(segment.a.x, segment.b.x));
    return Math.max(0, right - left);
  }
  return 0;
}

function pointOutsideRoutingBounds(point: Point, bounds: ReturnType<typeof routeBounds>) {
  return point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom;
}

function routeBounds(points: Point[], blockers: ModelNode[]) {
  const boxes = blockers
    .filter(staticNodeParticipatesInRoutingAvoidance)
    .map((node) => routeBlockerBox(node, 36));
  return {
    left: Math.min(0, ...points.map((point) => point.x), ...boxes.map((box) => box.left)) - 96,
    right: Math.max(1980, ...points.map((point) => point.x), ...boxes.map((box) => box.right)) + 96,
    top: Math.min(0, ...points.map((point) => point.y), ...boxes.map((box) => box.top)) - 96,
    bottom: Math.max(1200, ...points.map((point) => point.y), ...boxes.map((box) => box.bottom)) + 96
  };
}

const ROUTE_BLOCKER_PADDING = 8;
const ROUTE_CLEARANCE = 6;
const ROUTE_LANE_SEARCH_MARGIN = 180;
const ROUTE_LANE_SEGMENT_MARGIN = 36;
const ROUTE_LANE_OFFSETS = [24, 56, 96, 144];
const ROUTE_AVOIDED_SEGMENT_OFFSETS = [18, 36, 54];
const ROUTE_MAX_LANES_PER_AXIS = 24;
const ROUTE_MAX_LANE_PAIRS = 128;
const ROUTE_MAX_BUS_ENDPOINT_POINTS_PER_SIDE = 2;
const ROUTE_MAX_BUS_ENDPOINT_CANDIDATES = 4;
const ROUTE_TINY_DOGLEG_LIMIT = 18;
const ROUTE_MIN_MOVABLE_SEGMENT_LENGTH = 18;
const ROUTE_SHARED_ENDPOINT_STUB_LIMIT = 36;
const ROUTE_ENDPOINT_STUB_LENGTH = 28;
const ROUTE_ENDPOINT_ESCAPE_CLEARANCE = 1;

function routeIntersectsBlockers(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING, protectedEndpointSegments = 0) {
  const routeBlockers = filterBlockersForRoutePoints(points, blockers, padding);
  for (let index = 1; index < points.length; index += 1) {
    const routeSegmentIndex = index - 1;
    if (
      routeSegmentIndex < protectedEndpointSegments ||
      routeSegmentIndex >= points.length - 1 - protectedEndpointSegments
    ) {
      continue;
    }
    const a = points[index - 1];
    const b = points[index];
    if (routeBlockers.some((blocker) => segmentIntersectsNodeBody(a, b, blocker, padding))) {
      return true;
    }
  }
  return false;
}

type RouteOverlapPolicy = {
  currentEdge?: Edge;
  edgeById?: Map<string, Edge>;
  nodeById?: Map<string, ModelNode>;
  allowSharedEndpointStubs?: boolean;
  sharedEndpointStubLimit?: number;
};

type RouteOverlapConflict = {
  segment: Segment;
  conflictingSegment: Segment;
  overlap: number;
};

function routeEndpointSideForSegment(segment: Pick<Segment, "segmentIndex" | "lastSegmentIndex">): EdgeSide | null {
  if (segment.segmentIndex === 0) {
    return "source";
  }
  if (segment.segmentIndex === segment.lastSegmentIndex) {
    return "target";
  }
  return null;
}

function edgeNodeId(edge: Edge, side: EdgeSide) {
  return side === "source" ? edge.sourceId : edge.targetId;
}

function pointsAreNear(a: Point, b: Point, tolerance = 2) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function edgesShareEndpoint(
  currentEdge: Edge,
  currentSide: EdgeSide,
  otherEdge: Edge,
  otherSide: EdgeSide,
  nodeById: Map<string, ModelNode>
) {
  const currentNodeId = edgeNodeId(currentEdge, currentSide);
  const otherNodeId = edgeNodeId(otherEdge, otherSide);
  if (currentNodeId !== otherNodeId) {
    return false;
  }
  const node = nodeById.get(currentNodeId);
  if (!node) {
    return false;
  }
  const currentTerminalId = edgeTerminalId(currentEdge, currentSide);
  const otherTerminalId = edgeTerminalId(otherEdge, otherSide);
  if (!isBusNode(node)) {
    return getTerminal(node, currentTerminalId).id === getTerminal(node, otherTerminalId).id;
  }
  const currentPoint = getEdgeEndpointPoint(node, edgeEndpointStoredPoint(currentEdge, currentSide), currentTerminalId);
  const otherPoint = getEdgeEndpointPoint(node, edgeEndpointStoredPoint(otherEdge, otherSide), otherTerminalId);
  return pointsAreNear(currentPoint, otherPoint);
}

function isAllowedSharedEndpointOverlap(
  currentSegment: Segment,
  conflictingSegment: Segment,
  overlap: number,
  policy: RouteOverlapPolicy
) {
  if (!policy.allowSharedEndpointStubs || !policy.currentEdge || !policy.edgeById || !policy.nodeById) {
    return false;
  }
  const limit = policy.sharedEndpointStubLimit ?? ROUTE_SHARED_ENDPOINT_STUB_LIMIT;
  if (overlap > limit) {
    return false;
  }
  const currentSide = routeEndpointSideForSegment(currentSegment);
  const conflictingSide = routeEndpointSideForSegment(conflictingSegment);
  if (!currentSide || !conflictingSide) {
    return false;
  }
  const conflictingEdge = policy.edgeById.get(conflictingSegment.edgeId);
  if (!conflictingEdge) {
    return false;
  }
  return edgesShareEndpoint(policy.currentEdge, currentSide, conflictingEdge, conflictingSide, policy.nodeById);
}

function findRouteOverlapConflict(points: Point[], avoidedSegments: Segment[], policy: RouteOverlapPolicy = {}): RouteOverlapConflict | null {
  const currentSegments = getSegments(policy.currentEdge?.id ?? "__current_route__", 0, points);
  const routeAvoidedSegments = filterSegmentsForRoutePoints(points, avoidedSegments, 2);
  for (const segment of currentSegments) {
    for (const conflictingSegment of routeAvoidedSegments) {
      const overlap = segmentOverlapAmount(segment.a, segment.b, conflictingSegment);
      if (overlap <= 2) {
        continue;
      }
      if (isAllowedSharedEndpointOverlap(segment, conflictingSegment, overlap, policy)) {
        continue;
      }
      return { segment, conflictingSegment, overlap };
    }
  }
  return null;
}

function routeOverlapsSegments(points: Point[], avoidedSegments: Segment[], policy: RouteOverlapPolicy = {}) {
  return Boolean(findRouteOverlapConflict(points, avoidedSegments, policy));
}

function firstRouteBlockerIntersection(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING, protectedEndpointSegments = 0) {
  const routeBlockers = filterBlockersForRoutePoints(points, blockers, padding);
  for (let segmentIndex = 1; segmentIndex < points.length; segmentIndex += 1) {
    const routeSegmentIndex = segmentIndex - 1;
    if (
      routeSegmentIndex < protectedEndpointSegments ||
      routeSegmentIndex >= points.length - 1 - protectedEndpointSegments
    ) {
      continue;
    }
    const a = points[segmentIndex - 1];
    const b = points[segmentIndex];
    for (const blocker of routeBlockers) {
      const box = routeSegmentBlockerIntersectionBox(a, b, blocker, padding);
      if (box) {
        return { segmentIndex: segmentIndex - 1, box };
      }
    }
  }
  return null;
}

function clampLane(value: number, min: number, max: number, bounds?: CanvasBounds) {
  if (!bounds) {
    return value;
  }
  return clampNumber(value, min, max);
}

function repairRouteAroundBlockers(points: Point[], blockers: ModelNode[], bounds?: CanvasBounds, protectedEndpointSegments = 0) {
  let route = orthogonalizeRouteKeepingCollinear(points);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const intersection = firstRouteBlockerIntersection(route, blockers, ROUTE_BLOCKER_PADDING, protectedEndpointSegments);
    if (!intersection) {
      return route;
    }
    const a = route[intersection.segmentIndex];
    const b = route[intersection.segmentIndex + 1];
    const box = intersection.box;
    let replacement: Point[];
    if (a.y === b.y) {
      const topLane = clampLane(box.top - 24, 0, bounds?.height ?? box.top - 24, bounds);
      const bottomLane = clampLane(box.bottom + 24, 0, bounds?.height ?? box.bottom + 24, bounds);
      const lane = Math.abs(a.y - bottomLane) <= Math.abs(a.y - topLane) ? bottomLane : topLane;
      replacement = [a, { x: a.x, y: lane }, { x: b.x, y: lane }, b];
    } else if (a.x === b.x) {
      const leftLane = clampLane(box.left - 24, 0, bounds?.width ?? box.left - 24, bounds);
      const rightLane = clampLane(box.right + 24, 0, bounds?.width ?? box.right + 24, bounds);
      const lane = Math.abs(a.x - rightLane) <= Math.abs(a.x - leftLane) ? rightLane : leftLane;
      replacement = [a, { x: lane, y: a.y }, { x: lane, y: b.y }, b];
    } else {
      replacement = orthogonalizeRoute([a, b]);
    }
    route = orthogonalizeRouteKeepingCollinear([
      ...route.slice(0, intersection.segmentIndex),
      ...replacement,
      ...route.slice(intersection.segmentIndex + 2)
    ]);
  }
  return route;
}

function safeStubPoint(point: Point, normal: Point, blockers: ModelNode[], maxLength: number): Point {
  let length = maxLength;
  const safeLengthBefore = (distance: number) => (distance > 0 ? Math.max(1, distance) : ROUTE_CLEARANCE);
  for (const blocker of blockers) {
    const box = routeBlockerBox(blocker, ROUTE_BLOCKER_PADDING);
    if (normal.x > 0 && point.y > box.top && point.y < box.bottom && box.left >= point.x) {
      length = Math.min(length, safeLengthBefore(box.left - point.x - 1));
    } else if (normal.x < 0 && point.y > box.top && point.y < box.bottom && box.right <= point.x) {
      length = Math.min(length, safeLengthBefore(point.x - box.right - 1));
    } else if (normal.y > 0 && point.x > box.left && point.x < box.right && box.top >= point.y) {
      length = Math.min(length, safeLengthBefore(box.top - point.y - 1));
    } else if (normal.y < 0 && point.x > box.left && point.x < box.right && box.bottom <= point.y) {
      length = Math.min(length, safeLengthBefore(point.y - box.bottom - 1));
    }
  }
  return {
    x: Math.round(point.x + normal.x * length),
    y: Math.round(point.y + normal.y * length)
  };
}

function endpointStubLengthOutsideOwnBody(point: Point, normal: Point, node: ModelNode, fallbackLength = ROUTE_ENDPOINT_STUB_LENGTH) {
  const box = routeBodyBlockerBox(node, ROUTE_BLOCKER_PADDING);
  if (normal.x > 0 && point.y >= box.top && point.y <= box.bottom && point.x < box.right) {
    return Math.max(fallbackLength, box.right - point.x + ROUTE_CLEARANCE);
  }
  if (normal.x < 0 && point.y >= box.top && point.y <= box.bottom && point.x > box.left) {
    return Math.max(fallbackLength, point.x - box.left + ROUTE_CLEARANCE);
  }
  if (normal.y > 0 && point.x >= box.left && point.x <= box.right && point.y < box.bottom) {
    return Math.max(fallbackLength, box.bottom - point.y + ROUTE_CLEARANCE);
  }
  if (normal.y < 0 && point.x >= box.left && point.x <= box.right && point.y > box.top) {
    return Math.max(fallbackLength, point.y - box.top + ROUTE_CLEARANCE);
  }
  return fallbackLength;
}

function endpointStubPoint(point: Point, normal: Point, node: ModelNode, blockers: ModelNode[], fallbackLength = ROUTE_ENDPOINT_STUB_LENGTH) {
  const length = endpointStubLengthOutsideOwnBody(point, normal, node, fallbackLength);
  return safeStubPoint(point, normal, blockers.filter((blocker) => blocker.id !== node.id), length);
}

function buildFullRoute(start: Point, startOut: Point, middle: Point[], endOut: Point, end: Point, bounds?: CanvasBounds) {
  const route = [
    start,
    ...(!samePoint(start, startOut) ? [startOut] : []),
    ...middle,
    ...(!samePoint(endOut, end) ? [endOut] : []),
    end
  ];
  const bounded = bounds ? route.map((point) => clampPointToBounds(point, bounds)) : route;
  return orthogonalizeRouteKeepingCollinear(bounded);
}

function scoreRoute(points: Point[], blockers: ModelNode[], avoidedSegments: Segment[] = []) {
  let score = points.length * 8;
  const bounds = routeBounds(points, blockers);
  const routeBlockers = filterBlockersForRoutePoints(points, blockers);
  const routeAvoidedSegments = filterSegmentsForRoutePoints(points, avoidedSegments);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (pointOutsideRoutingBounds(a, bounds) || pointOutsideRoutingBounds(b, bounds)) {
      score += 1000000;
    }
    score += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (const blocker of routeBlockers) {
      if (segmentIntersectsNodeBody(a, b, blocker, ROUTE_BLOCKER_PADDING)) {
        score += 10000000;
      }
    }
    for (const segment of routeAvoidedSegments) {
      const overlap = segmentOverlapAmount(a, b, segment);
      if (overlap > 2) {
        score += 10000000 + overlap * 1000;
      }
    }
  }
  return score;
}

function compactRoute(points: Point[]) {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    if (previous && samePoint(previous, point)) {
      return false;
    }
    const prev = points[index - 1];
    const next = points[index + 1];
    if (!prev || !next) {
      return true;
    }
    return !(prev.x === point.x && point.x === next.x) && !(prev.y === point.y && point.y === next.y);
  });
}

function orthogonalizeRoute(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points;
  }
  const orthogonal: Point[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = orthogonal[orthogonal.length - 1];
    const current = points[index];
    if (previous.x !== current.x && previous.y !== current.y) {
      orthogonal.push({ x: current.x, y: previous.y });
    }
    orthogonal.push(current);
  }
  return compactRoute(orthogonal);
}

function orthogonalizeRouteKeepingCollinear(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points;
  }
  const orthogonal: Point[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = orthogonal[orthogonal.length - 1];
    const current = points[index];
    if (previous.x !== current.x && previous.y !== current.y) {
      orthogonal.push({ x: current.x, y: previous.y });
    }
    orthogonal.push(current);
  }
  return orthogonal.filter((point, index) => {
    const previous = orthogonal[index - 1];
    return !previous || !samePoint(previous, point);
  });
}

type InternalRouteSimplifyOptions = {
  blockers?: ModelNode[];
  avoidedSegments?: Segment[];
  reduceTinyDoglegs?: boolean;
};

export type TidyRouteOptions = {
  blockers?: ModelNode[];
};

function isProtectedRoutePointIndex(index: number, length: number) {
  return index === 0 || index === 1 || index === length - 2 || index === length - 1;
}

function segmentManhattanLength(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function routeManhattanLength(points: Point[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += segmentManhattanLength(points[index - 1], points[index]);
  }
  return length;
}

function routeBendCount(points: Point[]) {
  let bends = 0;
  let previousOrientation: "horizontal" | "vertical" | null = null;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const orientation = previous.y === point.y
      ? "horizontal"
      : previous.x === point.x
        ? "vertical"
        : null;
    if (!orientation) {
      continue;
    }
    if (previousOrientation && previousOrientation !== orientation) {
      bends += 1;
    }
    previousOrientation = orientation;
  }
  return bends;
}

function compactRoutePreservingEndpointStubs(points: Point[]) {
  if (points.length <= 4) {
    return points.filter((point, index) => !points[index - 1] || !samePoint(points[index - 1], point));
  }
  return points.filter((point, index) => {
    if (isProtectedRoutePointIndex(index, points.length)) {
      return true;
    }
    const previous = points[index - 1];
    if (previous && samePoint(previous, point)) {
      return false;
    }
    const next = points[index + 1];
    if (!previous || !next) {
      return true;
    }
    return !(previous.x === point.x && point.x === next.x) && !(previous.y === point.y && point.y === next.y);
  });
}

function routeCandidateIsSafe(points: Point[], options: InternalRouteSimplifyOptions) {
  const route = orthogonalizeRouteKeepingCollinear(points);
  if (routeHasImmediateReversal(route)) {
    return false;
  }
  if (options.blockers?.length && routeIntersectsBlockers(route, options.blockers, ROUTE_BLOCKER_PADDING, 1)) {
    return false;
  }
  if (options.avoidedSegments?.length && routeOverlapsSegments(route, options.avoidedSegments)) {
    return false;
  }
  return true;
}

function normalizeRouteCandidate(points: Point[]) {
  return compactRoutePreservingEndpointStubs(orthogonalizeRouteKeepingCollinear(points));
}

function reduceTinyDoglegs(points: Point[], options: InternalRouteSimplifyOptions) {
  let route = compactRoutePreservingEndpointStubs(orthogonalizeRouteKeepingCollinear(points));
  for (let attempt = 0; attempt < 16; attempt += 1) {
    let changed = false;
    for (let index = 1; index < route.length - 3; index += 1) {
      const a = route[index];
      const b = route[index + 1];
      const c = route[index + 2];
      const d = route[index + 3];
      if (isProtectedRoutePointIndex(index + 1, route.length) || isProtectedRoutePointIndex(index + 2, route.length)) {
        continue;
      }
      const verticalDetour = a.x === b.x && b.y === c.y && c.x === d.x && a.y === d.y;
      const horizontalDetour = a.y === b.y && b.x === c.x && c.y === d.y && a.x === d.x;
      if (!verticalDetour && !horizontalDetour) {
        continue;
      }
      const candidate = compactRoutePreservingEndpointStubs([
        ...route.slice(0, index + 1),
        ...route.slice(index + 3)
      ]);
      if (candidate.length < route.length && routeCandidateIsSafe(candidate, options)) {
        route = normalizeRouteCandidate(candidate);
        changed = true;
        break;
      }
    }
    if (changed) {
      continue;
    }
    for (let index = 1; index < route.length - 2; index += 1) {
      const before = route[index - 1];
      const first = route[index];
      const second = route[index + 1];
      const after = route[index + 2];
      const tinySegmentLength = segmentManhattanLength(first, second);
      if (tinySegmentLength === 0 || tinySegmentLength > ROUTE_TINY_DOGLEG_LIMIT) {
        continue;
      }

      const firstProtected = isProtectedRoutePointIndex(index, route.length);
      const secondProtected = isProtectedRoutePointIndex(index + 1, route.length);
      const candidate = route.map((point) => ({ ...point }));
      if (before.y === first.y && first.x === second.x && second.y === after.y) {
        const previousLength = Math.abs(first.x - before.x);
        const nextLength = Math.abs(after.x - second.x);
        const lane = firstProtected ? first.y : secondProtected ? second.y : previousLength >= nextLength ? first.y : second.y;
        if (!firstProtected) {
          candidate[index].y = lane;
        }
        if (!secondProtected) {
          candidate[index + 1].y = lane;
        }
      } else if (before.x === first.x && first.y === second.y && second.x === after.x) {
        const previousLength = Math.abs(first.y - before.y);
        const nextLength = Math.abs(after.y - second.y);
        const lane = firstProtected ? first.x : secondProtected ? second.x : previousLength >= nextLength ? first.x : second.x;
        if (!firstProtected) {
          candidate[index].x = lane;
        }
        if (!secondProtected) {
          candidate[index + 1].x = lane;
        }
      } else {
        continue;
      }

      const compacted = compactRoutePreservingEndpointStubs(candidate);
      if (compacted.length < route.length && routeCandidateIsSafe(compacted, options)) {
        route = normalizeRouteCandidate(compacted);
        changed = true;
        break;
      }
    }
    if (!changed) {
      return route;
    }
  }
  return route;
}

function simplifyRoutePreservingEndpointStubs(points: Point[], options: InternalRouteSimplifyOptions = {}): Point[] {
  const route = orthogonalizeRouteKeepingCollinear(points);
  if (route.length <= 4) {
    return route;
  }
  const compacted = compactRoutePreservingEndpointStubs(route);
  return options.reduceTinyDoglegs ? reduceTinyDoglegs(compacted, options) : compacted;
}

export function tidyOrthogonalRoute(points: Point[], options: TidyRouteOptions = {}): Point[] {
  return simplifyRoutePreservingEndpointStubs(points, {
    blockers: options.blockers,
    reduceTinyDoglegs: true
  });
}

export function pointsToOrthogonalPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    path += ` L ${point.x} ${point.y}`;
  }
  return path;
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

export function moveOrthogonalRouteSegment(
  routePoints: Point[],
  segmentIndex: number,
  orientation: "horizontal" | "vertical",
  pointerPoint: Point,
  bounds?: CanvasBounds
): Point[] {
  const nextPoints = routePoints.map((point) => ({ ...point }));
  if (segmentIndex < 0 || segmentIndex >= routePoints.length - 1) {
    return nextPoints;
  }
  const targetCoordinate = Math.round(orientation === "horizontal" ? pointerPoint.y : pointerPoint.x);
  const movePoint = (source: Point) => {
    const moved = orientation === "horizontal"
      ? { x: source.x, y: targetCoordinate }
      : { x: targetCoordinate, y: source.y };
    return bounds ? clampPointToBounds(moved, bounds) : moved;
  };
  [segmentIndex, segmentIndex + 1].forEach((routeIndex) => {
    if (routeIndex > 0 && routeIndex < routePoints.length - 1) {
      nextPoints[routeIndex] = movePoint(routePoints[routeIndex]);
    }
  });
  return nextPoints;
}

export function insertOrthogonalRouteBend(
  routePoints: Point[],
  segmentIndex: number,
  pointerPoint: Point,
  bounds?: CanvasBounds,
  offset = 32,
  preferredMargin = 12
): Point[] {
  const nextPoints = routePoints.map((point) => ({ ...point }));
  const from = routePoints[segmentIndex];
  const to = routePoints[segmentIndex + 1];
  if (!from || !to || samePoint(from, to) || (from.x !== to.x && from.y !== to.y)) {
    return nextPoints;
  }
  const sideAwayFromAdjacent = (axis: "x" | "y") => {
    const sides: number[] = [];
    const previous = routePoints[segmentIndex - 1];
    const next = routePoints[segmentIndex + 2];
    if (axis === "y") {
      if (previous && previous.x === from.x && previous.y !== from.y) {
        sides.push(Math.sign(previous.y - from.y));
      }
      if (next && next.x === to.x && next.y !== to.y) {
        sides.push(Math.sign(next.y - to.y));
      }
    } else {
      if (previous && previous.y === from.y && previous.x !== from.x) {
        sides.push(Math.sign(previous.x - from.x));
      }
      if (next && next.y === to.y && next.x !== to.x) {
        sides.push(Math.sign(next.x - to.x));
      }
    }
    const adjacentBias = sides.reduce((sum, side) => sum + side, 0);
    return adjacentBias === 0 ? 0 : -Math.sign(adjacentBias);
  };
  const offsetSide = (pointerDelta: number, adjacentAxis: "x" | "y") => {
    if (Math.abs(pointerDelta) > 2) {
      return pointerDelta > 0 ? 1 : -1;
    }
    return sideAwayFromAdjacent(adjacentAxis) || 1;
  };
  const stepTowardTarget = (pivot: number, target: number) => {
    const direction = target >= pivot ? 1 : -1;
    const step = Math.min(Math.abs(offset), Math.abs(target - pivot));
    return Math.round(pivot + direction * step);
  };
  const boundedPointer = bounds ? clampPointToBounds(pointerPoint, bounds) : pointerPoint;
  const offsetCoordinate = (segmentCoordinate: number, pointerCoordinate: number, adjacentAxis: "x" | "y") => {
    const roundedPointer = Math.round(pointerCoordinate);
    if (Math.abs(roundedPointer - segmentCoordinate) > 2) {
      return roundedPointer;
    }
    return Math.round(segmentCoordinate + offsetSide(pointerCoordinate - segmentCoordinate, adjacentAxis) * Math.abs(offset));
  };
  const clampCoordinate = (value: number, first: number, second: number) => {
    const min = Math.min(first, second);
    const max = Math.max(first, second);
    const margin = Math.min(preferredMargin, Math.max(0, (max - min) / 2));
    return Math.round(clampNumber(value, min + margin, max - margin));
  };
  if (from.y === to.y) {
    const x = clampCoordinate(boundedPointer.x, from.x, to.x);
    const y = from.y;
    const bendOffsetY = offsetCoordinate(y, boundedPointer.y, "y");
    nextPoints.splice(
      segmentIndex + 1,
      0,
      { x, y },
      { x, y: bendOffsetY },
      { x: stepTowardTarget(x, to.x), y: bendOffsetY }
    );
  } else {
    const y = clampCoordinate(boundedPointer.y, from.y, to.y);
    const x = from.x;
    const bendOffsetX = offsetCoordinate(x, boundedPointer.x, "x");
    nextPoints.splice(
      segmentIndex + 1,
      0,
      { x, y },
      { x: bendOffsetX, y },
      { x: bendOffsetX, y: stepTowardTarget(y, to.y) }
    );
  }
  const bounded = bounds ? nextPoints.map((point) => clampPointToBounds(point, bounds)) : nextPoints;
  return orthogonalizeRouteKeepingCollinear(bounded);
}

type ManualRouteDisplayOptions = {
  preserveManualRouteDisplay?: boolean;
};

type PreserveDraggedRouteShapeOptions = {
  routePoints: Point[];
  nextStart: Point;
  nextEnd: Point;
  sourceDelta?: Point;
  targetDelta?: Point;
  routeDelta?: Point;
  sourceNormal?: Point;
  targetNormal?: Point;
};

function roundPoint(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function sameDelta(first?: Point, second?: Point) {
  return Boolean(first && second && Math.round(first.x) === Math.round(second.x) && Math.round(first.y) === Math.round(second.y));
}

function nonZeroDelta(delta?: Point) {
  return Boolean(delta && (Math.round(delta.x) !== 0 || Math.round(delta.y) !== 0));
}

function draggedRouteShapeDelta(options: PreserveDraggedRouteShapeOptions): Point {
  if (options.routeDelta) {
    return options.routeDelta;
  }
  if (sameDelta(options.sourceDelta, options.targetDelta) && options.sourceDelta) {
    return options.sourceDelta;
  }
  if (nonZeroDelta(options.sourceDelta)) {
    return options.sourceDelta!;
  }
  if (nonZeroDelta(options.targetDelta)) {
    return options.targetDelta!;
  }
  return options.sourceDelta ?? options.targetDelta ?? { x: 0, y: 0 };
}

function alignTranslatedEndpointStub(points: Point[], original: Point[], endpoint: "source" | "target") {
  if (points.length < 2 || original.length < 2) {
    return;
  }
  const endpointIndex = endpoint === "source" ? 0 : points.length - 1;
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  const originalEndpoint = original[endpointIndex];
  const originalStub = original[stubIndex];
  if (!originalEndpoint || !originalStub) {
    return;
  }
  if (Math.round(originalEndpoint.x) === Math.round(originalStub.x)) {
    points[stubIndex] = { ...points[stubIndex], x: points[endpointIndex].x };
  } else if (Math.round(originalEndpoint.y) === Math.round(originalStub.y)) {
    points[stubIndex] = { ...points[stubIndex], y: points[endpointIndex].y };
  }
}

function alignEndpointStubToNormal(points: Point[], endpoint: "source" | "target", normal?: Point) {
  if (!normal || points.length < 3 || (normal.x === 0 && normal.y === 0)) {
    return;
  }
  const endpointIndex = endpoint === "source" ? 0 : points.length - 1;
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  if (endpointIndex === stubIndex) {
    return;
  }
  const endpointPoint = points[endpointIndex];
  if (!endpointPoint) {
    return;
  }
  if (normal.x !== 0) {
    points[stubIndex] = {
      x: Math.round(endpointPoint.x + Math.sign(normal.x) * ROUTE_ENDPOINT_STUB_LENGTH),
      y: endpointPoint.y
    };
    return;
  }
  points[stubIndex] = {
    x: endpointPoint.x,
    y: Math.round(endpointPoint.y + Math.sign(normal.y) * ROUTE_ENDPOINT_STUB_LENGTH)
  };
}

function setEndpointStubFromMove(points: Point[], original: Point[], endpoint: "source" | "target", normal?: Point) {
  if (points.length < 2 || original.length < 2) {
    return;
  }
  const endpointIndex = endpoint === "source" ? 0 : points.length - 1;
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  const originalEndpointIndex = endpoint === "source" ? 0 : original.length - 1;
  const originalStubIndex = endpoint === "source" ? 1 : original.length - 2;
  const endpointPoint = points[endpointIndex];
  const originalEndpoint = original[originalEndpointIndex];
  const originalStub = original[originalStubIndex];
  if (!endpointPoint || !originalEndpoint || !originalStub) {
    return;
  }
  if (normal && (normal.x !== 0 || normal.y !== 0)) {
    alignEndpointStubToNormal(points, endpoint, normal);
    return;
  }
  points[stubIndex] = roundPoint({
    x: endpointPoint.x + originalStub.x - originalEndpoint.x,
    y: endpointPoint.y + originalStub.y - originalEndpoint.y
  });
}

function alignSegmentAdjacentToMovedEndpoint(points: Point[], original: Point[], endpoint: "source" | "target") {
  if (points.length < 3 || original.length < 3) {
    return;
  }
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  const adjacentIndex = endpoint === "source" ? 2 : points.length - 3;
  const originalStubIndex = endpoint === "source" ? 1 : original.length - 2;
  const originalAdjacentIndex = endpoint === "source" ? 2 : original.length - 3;
  const stub = points[stubIndex];
  const adjacent = points[adjacentIndex];
  const originalStub = original[originalStubIndex];
  const originalAdjacent = original[originalAdjacentIndex];
  if (!stub || !adjacent || !originalStub || !originalAdjacent) {
    return;
  }
  if (Math.round(originalStub.x) === Math.round(originalAdjacent.x)) {
    points[adjacentIndex] = { ...adjacent, x: stub.x };
  } else if (Math.round(originalStub.y) === Math.round(originalAdjacent.y)) {
    points[adjacentIndex] = { ...adjacent, y: stub.y };
  }
}

function endpointStubPointFromNormal(endpointPoint: Point, normal?: Point): Point | null {
  if (!normal || (normal.x === 0 && normal.y === 0)) {
    return null;
  }
  if (normal.x !== 0) {
    return {
      x: Math.round(endpointPoint.x + Math.sign(normal.x) * ROUTE_ENDPOINT_STUB_LENGTH),
      y: endpointPoint.y
    };
  }
  return {
    x: endpointPoint.x,
    y: Math.round(endpointPoint.y + Math.sign(normal.y) * ROUTE_ENDPOINT_STUB_LENGTH)
  };
}

function preserveShortEndpointRouteShape(options: PreserveDraggedRouteShapeOptions): Point[] {
  const start = roundPoint(options.nextStart);
  const end = roundPoint(options.nextEnd);
  const points = [start];
  const sourceStub = endpointStubPointFromNormal(start, options.sourceNormal);
  const targetStub = endpointStubPointFromNormal(end, options.targetNormal);
  if (sourceStub && !samePoint(points[points.length - 1], sourceStub)) {
    points.push(sourceStub);
  }
  if (sourceStub && targetStub && sourceStub.x !== targetStub.x && sourceStub.y !== targetStub.y) {
    const bridgePoint =
      options.sourceNormal?.x !== 0
        ? { x: sourceStub.x, y: targetStub.y }
        : { x: targetStub.x, y: sourceStub.y };
    if (!samePoint(points[points.length - 1], bridgePoint)) {
      points.push(bridgePoint);
    }
  }
  if (targetStub && !samePoint(points[points.length - 1], targetStub)) {
    points.push(targetStub);
  }
  if (!samePoint(points[points.length - 1], end)) {
    points.push(end);
  }
  return orthogonalizeRouteKeepingCollinear(points);
}

function preserveSingleCornerRouteShape(options: PreserveDraggedRouteShapeOptions): Point[] {
  const start = roundPoint(options.nextStart);
  const end = roundPoint(options.nextEnd);
  const originalStart = options.routePoints[0];
  const originalCorner = options.routePoints[1];
  if (!originalStart || !originalCorner || start.x === end.x || start.y === end.y) {
    return orthogonalizeRouteKeepingCollinear([start, end]);
  }
  const firstSegmentHorizontal = Math.round(originalStart.y) === Math.round(originalCorner.y);
  const corner = firstSegmentHorizontal
    ? { x: end.x, y: start.y }
    : { x: start.x, y: end.y };
  return orthogonalizeRouteKeepingCollinear([start, corner, end]);
}

function preserveEndpointLocalRouteShape(options: PreserveDraggedRouteShapeOptions, sourceMoved: boolean, targetMoved: boolean): Point[] {
  if (options.routePoints.length === 2 && (options.sourceNormal || options.targetNormal)) {
    return preserveShortEndpointRouteShape(options);
  }
  if (options.routePoints.length === 3) {
    return preserveSingleCornerRouteShape(options);
  }
  const points = options.routePoints.map(roundPoint);
  points[0] = roundPoint(options.nextStart);
  points[points.length - 1] = roundPoint(options.nextEnd);
  if (sourceMoved || options.sourceNormal) {
    setEndpointStubFromMove(points, options.routePoints, "source", options.sourceNormal);
    alignSegmentAdjacentToMovedEndpoint(points, options.routePoints, "source");
  }
  if (targetMoved || options.targetNormal) {
    setEndpointStubFromMove(points, options.routePoints, "target", options.targetNormal);
    alignSegmentAdjacentToMovedEndpoint(points, options.routePoints, "target");
  }
  return orthogonalizeRouteKeepingCollinear(points);
}

export function preserveDraggedRouteShape(options: PreserveDraggedRouteShapeOptions): Point[] {
  if (options.routePoints.length === 0) {
    return [];
  }
  if (options.routePoints.length === 1) {
    return [roundPoint(options.nextStart)];
  }
  const sourceMoved = nonZeroDelta(options.sourceDelta);
  const targetMoved = nonZeroDelta(options.targetDelta);
  if (!options.routeDelta && (sourceMoved || targetMoved) && !sameDelta(options.sourceDelta, options.targetDelta)) {
    return preserveEndpointLocalRouteShape(options, sourceMoved, targetMoved);
  }
  const delta = draggedRouteShapeDelta(options);
  const translated = options.routePoints.map((point) =>
    roundPoint({ x: point.x + delta.x, y: point.y + delta.y })
  );
  translated[0] = roundPoint(options.nextStart);
  translated[translated.length - 1] = roundPoint(options.nextEnd);
  alignTranslatedEndpointStub(translated, options.routePoints, "source");
  alignTranslatedEndpointStub(translated, options.routePoints, "target");
  alignEndpointStubToNormal(translated, "source", options.sourceNormal);
  alignEndpointStubToNormal(translated, "target", options.targetNormal);
  return orthogonalizeRouteKeepingCollinear(translated);
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

type Segment = {
  edgeId: string;
  edgeIndex: number;
  segmentIndex: number;
  lastSegmentIndex: number;
  a: Point;
  b: Point;
  orientation: "horizontal" | "vertical";
};

function getSegments(edgeId: string, edgeIndex: number, points: Point[]): Segment[] {
  const segments: Segment[] = [];
  const lastSegmentIndex = points.length - 2;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x === b.x && a.y !== b.y) {
      segments.push({ edgeId, edgeIndex, segmentIndex: index - 1, lastSegmentIndex, a, b, orientation: "vertical" });
    } else if (a.y === b.y && a.x !== b.x) {
      segments.push({ edgeId, edgeIndex, segmentIndex: index - 1, lastSegmentIndex, a, b, orientation: "horizontal" });
    }
  }
  return segments;
}

function segmentBox(segment: Segment, padding = 0) {
  return {
    left: Math.min(segment.a.x, segment.b.x) - padding,
    right: Math.max(segment.a.x, segment.b.x) + padding,
    top: Math.min(segment.a.y, segment.b.y) - padding,
    bottom: Math.max(segment.a.y, segment.b.y) + padding
  };
}

// ── 路由相交测试的空间网格索引（A2/A3）──────────────────────────────────────
// filterBlockersForRoutePoints / filterSegmentsForRoutePoints 原先对全集做线性 boxesOverlap，
// 在候选路径搜索中按 O(候选数 × 全集) 反复执行。这里用均匀网格把全集预筛成"路由框附近"的子集，
// 再套用完全相同的谓词 → 结果集与顺序逐元素一致，仅减少检查数量。
// 缓存：context.blockers 每条边稳定（按数组引用）；avoidedSegments 仅追加（按数组引用 + 长度失效）。
// 集合小于阈值时走原线性路径，零额外开销，保证小图/测试与原行为完全相同。
type RouteAabb = { left: number; right: number; top: number; bottom: number };
const SPATIAL_FILTER_MIN_ITEMS = 24;
const SPATIAL_GRID_CELL = 256;

class RouteBoxGrid<T> {
  private readonly buckets = new Map<string, { item: T; index: number; box: RouteAabb }[]>();
  constructor(private readonly cell: number) {}
  insert(item: T, index: number, box: RouteAabb): void {
    const entry = { item, index, box };
    const x0 = Math.floor(box.left / this.cell);
    const x1 = Math.floor(box.right / this.cell);
    const y0 = Math.floor(box.top / this.cell);
    const y1 = Math.floor(box.bottom / this.cell);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const key = `${cx}:${cy}`;
        const bucket = this.buckets.get(key);
        if (bucket) {
          bucket.push(entry);
        } else {
          this.buckets.set(key, [entry]);
        }
      }
    }
  }
  // 返回查询框附近的候选，按原始 index 升序去重（与线性 filter 顺序一致）。
  collect(queryBox: RouteAabb): { item: T; box: RouteAabb }[] {
    const x0 = Math.floor(queryBox.left / this.cell);
    const x1 = Math.floor(queryBox.right / this.cell);
    const y0 = Math.floor(queryBox.top / this.cell);
    const y1 = Math.floor(queryBox.bottom / this.cell);
    const seen = new Set<number>();
    const entries: { item: T; index: number; box: RouteAabb }[] = [];
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const bucket = this.buckets.get(`${cx}:${cy}`);
        if (!bucket) {
          continue;
        }
        for (const entry of bucket) {
          if (!seen.has(entry.index)) {
            seen.add(entry.index);
            entries.push(entry);
          }
        }
      }
    }
    entries.sort((a, b) => a.index - b.index);
    return entries;
  }
}

const blockerGridCache = new WeakMap<ModelNode[], Map<number, RouteBoxGrid<ModelNode>>>();
function blockerGridFor(blockers: ModelNode[], padding: number): RouteBoxGrid<ModelNode> {
  let byPadding = blockerGridCache.get(blockers);
  if (!byPadding) {
    byPadding = new Map();
    blockerGridCache.set(blockers, byPadding);
  }
  const existing = byPadding.get(padding);
  if (existing) {
    return existing;
  }
  const grid = new RouteBoxGrid<ModelNode>(SPATIAL_GRID_CELL);
  blockers.forEach((blocker, index) => grid.insert(blocker, index, routeBlockerBox(blocker, padding)));
  byPadding.set(padding, grid);
  return grid;
}

const segmentGridCache = new WeakMap<Segment[], { length: number; padding: number; grid: RouteBoxGrid<Segment> }>();
function segmentGridFor(segments: Segment[], padding: number): RouteBoxGrid<Segment> {
  const cached = segmentGridCache.get(segments);
  if (cached && cached.length === segments.length && cached.padding === padding) {
    return cached.grid;
  }
  const grid = new RouteBoxGrid<Segment>(SPATIAL_GRID_CELL);
  segments.forEach((segment, index) => grid.insert(segment, index, segmentBox(segment, padding)));
  segmentGridCache.set(segments, { length: segments.length, padding, grid });
  return grid;
}

function filterBlockersForRoutePoints(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING) {
  if (points.length < 2 || blockers.length === 0) {
    return [];
  }
  const routeBox = routeBoundsForPoints(points, padding);
  if (blockers.length < SPATIAL_FILTER_MIN_ITEMS) {
    return blockers.filter((blocker) =>
      staticNodeParticipatesInRoutingAvoidance(blocker) &&
      boxesOverlap(routeBlockerBox(blocker, padding), routeBox)
    );
  }
  const result: ModelNode[] = [];
  for (const candidate of blockerGridFor(blockers, padding).collect(routeBox)) {
    if (staticNodeParticipatesInRoutingAvoidance(candidate.item) && boxesOverlap(candidate.box, routeBox)) {
      result.push(candidate.item);
    }
  }
  return result;
}

function filterSegmentsForRoutePoints(points: Point[], segments: Segment[], padding = ROUTE_LANE_SEGMENT_MARGIN) {
  if (points.length < 2 || segments.length === 0) {
    return [];
  }
  const routeBox = routeBoundsForPoints(points, padding);
  if (segments.length < SPATIAL_FILTER_MIN_ITEMS) {
    return segments.filter((segment) => boxesOverlap(segmentBox(segment, padding), routeBox));
  }
  const result: Segment[] = [];
  for (const candidate of segmentGridFor(segments, padding).collect(routeBox)) {
    if (boxesOverlap(candidate.box, routeBox)) {
      result.push(candidate.item);
    }
  }
  return result;
}

const CROSSING_TERMINAL_MARGIN = ROUTE_ENDPOINT_STUB_LENGTH + 2;
const CROSSING_ARC_SPATIAL_BUCKET_SIZE = 320;

function between(value: number, a: number, b: number, margin = 0) {
  return value > Math.min(a, b) + margin && value < Math.max(a, b) - margin;
}

function intersection(a: Segment, b: Segment, margin = 0): Point | null {
  if (a.orientation === b.orientation) {
    return null;
  }
  const horizontal = a.orientation === "horizontal" ? a : b;
  const vertical = a.orientation === "vertical" ? a : b;
  const point = { x: vertical.a.x, y: horizontal.a.y };
  if (between(point.x, horizontal.a.x, horizontal.b.x, margin) && between(point.y, vertical.a.y, vertical.b.y, margin)) {
    return point;
  }
  return null;
}

function distanceAlongSegment(point: Point, segmentEndpoint: Point, orientation: Segment["orientation"]) {
  return orientation === "horizontal"
    ? Math.abs(point.x - segmentEndpoint.x)
    : Math.abs(point.y - segmentEndpoint.y);
}

function pointNearRouteTerminal(point: Point, segment: Segment) {
  if (segment.segmentIndex === 0 && distanceAlongSegment(point, segment.a, segment.orientation) <= CROSSING_TERMINAL_MARGIN) {
    return true;
  }
  if (segment.segmentIndex === segment.lastSegmentIndex && distanceAlongSegment(point, segment.b, segment.orientation) <= CROSSING_TERMINAL_MARGIN) {
    return true;
  }
  return false;
}

function uniqueSorted(values: number[]) {
  return [...new Set(values.map((value) => Math.round(value)))].sort((a, b) => a - b);
}

function prioritizeLaneValues(values: number[], anchors: number[], maxCount = ROUTE_MAX_LANES_PER_AXIS) {
  const sorted = uniqueSorted(values);
  if (sorted.length <= maxCount) {
    return sorted;
  }
  const roundedAnchors = anchors.map((value) => Math.round(value));
  const anchorSet = new Set(roundedAnchors);
  const required = sorted.filter((value) => anchorSet.has(value));
  const requiredSet = new Set(required);
  const distanceToAnchor = (value: number) =>
    Math.min(...roundedAnchors.map((anchor) => Math.abs(value - anchor)));
  const optional = sorted
    .filter((value) => !requiredSet.has(value))
    .sort((first, second) => distanceToAnchor(first) - distanceToAnchor(second) || first - second);
  return uniqueSorted([...required, ...optional.slice(0, Math.max(0, maxCount - required.length))]);
}

function prioritizeLanePairs(
  xs: number[],
  ys: number[],
  startOut: Point,
  endOut: Point,
  maxCount = ROUTE_MAX_LANE_PAIRS
) {
  const midX = Math.round((startOut.x + endOut.x) / 2);
  const midY = Math.round((startOut.y + endOut.y) / 2);
  const pairScore = (x: number, y: number) => {
    const horizontalFirst = compactRoute([startOut, { x, y: startOut.y }, { x, y }, { x: endOut.x, y }, endOut]);
    const verticalFirst = compactRoute([startOut, { x: startOut.x, y }, { x, y }, { x, y: endOut.y }, endOut]);
    const horizontalScore = routeManhattanLength(horizontalFirst) * 4 + routeBendCount(horizontalFirst) * 64;
    const verticalScore = routeManhattanLength(verticalFirst) * 4 + routeBendCount(verticalFirst) * 64;
    return Math.min(horizontalScore, verticalScore) + Math.abs(x - midX) + Math.abs(y - midY);
  };
  const pairs: { x: number; y: number; score: number }[] = [];
  for (const x of xs) {
    for (const y of ys) {
      pairs.push({ x, y, score: pairScore(x, y) });
    }
  }
  if (pairs.length <= maxCount) {
    return pairs;
  }
  return pairs
    .sort((first, second) =>
      first.score - second.score ||
      Math.abs(first.x - midX) + Math.abs(first.y - midY) - (Math.abs(second.x - midX) + Math.abs(second.y - midY)) ||
      first.x - second.x ||
      first.y - second.y
    )
    .slice(0, maxCount);
}

function routeCandidatesFromLanes(
  startOut: Point,
  endOut: Point,
  xs: number[],
  ys: number[],
  maxLanePairs = ROUTE_MAX_LANE_PAIRS
) {
  const lanePairs = prioritizeLanePairs(xs, ys, startOut, endOut, maxLanePairs);
  const candidates: Point[][] = [
    [startOut, { x: endOut.x, y: startOut.y }, endOut],
    [startOut, { x: startOut.x, y: endOut.y }, endOut]
  ];

  for (const x of xs) {
    candidates.push([startOut, { x, y: startOut.y }, { x, y: endOut.y }, endOut]);
  }
  for (const y of ys) {
    candidates.push([startOut, { x: startOut.x, y }, { x: endOut.x, y }, endOut]);
  }
  for (const { x, y } of lanePairs) {
    candidates.push([startOut, { x, y: startOut.y }, { x, y }, { x: endOut.x, y }, endOut]);
    candidates.push([startOut, { x: startOut.x, y }, { x, y }, { x, y: endOut.y }, endOut]);
  }

  return candidates.map(compactRoute);
}

function candidateLanes(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds?: CanvasBounds,
  endpointNodeIds: ReadonlySet<string> = new Set()
) {
  const laneCorridor = routeCorridor(startOut, endOut, ROUTE_LANE_SEARCH_MARGIN);
  const pointTouchesBox = (point: Point, box: ReturnType<typeof boxFor>, margin = 1) =>
    point.x >= box.left - margin &&
    point.x <= box.right + margin &&
    point.y >= box.top - margin &&
    point.y <= box.bottom + margin;
  const blockerBoxes = blockers
    .filter(staticNodeParticipatesInRoutingAvoidance)
    .map((node) => ({ node, box: routeBlockerBox(node, 32) }))
    .filter(({ node, box }) => {
      if (!boxesOverlap(box, laneCorridor)) {
        return false;
      }
      return !(
        endpointNodeIds.has(node.id) &&
        (pointTouchesBox(startOut, box) || pointTouchesBox(endOut, box))
      );
    })
    .map(({ box }) => box);
  const laneAvoidedSegments = avoidedSegments.filter((segment) =>
    boxesOverlap(segmentBox(segment, ROUTE_LANE_SEGMENT_MARGIN), laneCorridor)
  );
  const clampX = (value: number) => bounds ? clampNumber(value, 0, bounds.width) : value;
  const clampY = (value: number) => bounds ? clampNumber(value, 0, bounds.height) : value;
  const xLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.left - offset, box.right + offset])
  );
  const yLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.top - offset, box.bottom + offset])
  );
  const verticalSegmentLanes = laneAvoidedSegments
    .filter((segment) => segment.orientation === "vertical")
    .flatMap((segment) => ROUTE_AVOIDED_SEGMENT_OFFSETS.flatMap((offset) => [segment.a.x - offset, segment.a.x + offset]));
  const horizontalSegmentLanes = laneAvoidedSegments
    .filter((segment) => segment.orientation === "horizontal")
    .flatMap((segment) => ROUTE_AVOIDED_SEGMENT_OFFSETS.flatMap((offset) => [segment.a.y - offset, segment.a.y + offset]));
  const xAnchors = [
    startOut.x,
    endOut.x,
    Math.round((startOut.x + endOut.x) / 2)
  ].map(clampX);
  const yAnchors = [
    startOut.y,
    endOut.y,
    Math.round((startOut.y + endOut.y) / 2)
  ].map(clampY);
  const xValues = [
    ...xAnchors,
    ...xLaneOffsets,
    ...verticalSegmentLanes
  ].map(clampX);
  const yValues = [
    ...yAnchors,
    ...yLaneOffsets,
    ...horizontalSegmentLanes
  ].map(clampY);
  return {
    xs: prioritizeLaneValues(xValues, xAnchors),
    ys: prioritizeLaneValues(yValues, yAnchors)
  };
}

function buildRouteCandidates(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds?: CanvasBounds,
  endpointNodeIds?: ReadonlySet<string>
) {
  const { xs, ys } = candidateLanes(startOut, endOut, blockers, avoidedSegments, bounds, endpointNodeIds);
  return routeCandidatesFromLanes(startOut, endOut, xs, ys);
}

function expandedCandidateLanes(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  bounds?: CanvasBounds,
  endpointNodeIds: ReadonlySet<string> = new Set()
) {
  const pointTouchesBox = (point: Point, box: ReturnType<typeof boxFor>, margin = 1) =>
    point.x >= box.left - margin &&
    point.x <= box.right + margin &&
    point.y >= box.top - margin &&
    point.y <= box.bottom + margin;
  const blockerBoxes = blockers
    .filter(staticNodeParticipatesInRoutingAvoidance)
    .map((node) => ({ node, box: routeBlockerBox(node, 32) }))
    .filter(({ node, box }) =>
      !(
        endpointNodeIds.has(node.id) &&
        (pointTouchesBox(startOut, box) || pointTouchesBox(endOut, box))
      )
    )
    .map(({ box }) => box);
  const clampX = (value: number) => bounds ? clampNumber(value, 0, bounds.width) : value;
  const clampY = (value: number) => bounds ? clampNumber(value, 0, bounds.height) : value;
  const xBoundaryLanes = bounds
    ? [32, 64, 96, bounds.width - 96, bounds.width - 64, bounds.width - 32].map(clampX)
    : [];
  const yBoundaryLanes = bounds
    ? [32, 64, 96, bounds.height - 96, bounds.height - 64, bounds.height - 32].map(clampY)
    : [];
  const xLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.left - offset, box.right + offset])
  );
  const yLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.top - offset, box.bottom + offset])
  );
  const xAnchors = [
    startOut.x,
    endOut.x,
    Math.round((startOut.x + endOut.x) / 2),
    ...xBoundaryLanes
  ].map(clampX);
  const yAnchors = [
    startOut.y,
    endOut.y,
    Math.round((startOut.y + endOut.y) / 2),
    ...yBoundaryLanes
  ].map(clampY);
  return {
    xs: prioritizeLaneValues([...xAnchors, ...xLaneOffsets].map(clampX), xAnchors, ROUTE_MAX_LANES_PER_AXIS * 2),
    ys: prioritizeLaneValues([...yAnchors, ...yLaneOffsets].map(clampY), yAnchors, ROUTE_MAX_LANES_PER_AXIS * 2)
  };
}

function buildExpandedRouteCandidates(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  bounds?: CanvasBounds,
  endpointNodeIds?: ReadonlySet<string>
) {
  const { xs, ys } = expandedCandidateLanes(startOut, endOut, blockers, bounds, endpointNodeIds);
  return routeCandidatesFromLanes(startOut, endOut, xs, ys, ROUTE_MAX_LANE_PAIRS * 2);
}

function buildEndpointAlignedDirectCandidates(
  start: Point,
  end: Point,
  sourceNormal: Point,
  targetNormal: Point,
  bounds?: CanvasBounds
) {
  if (start.x === end.x || start.y === end.y) {
    return [];
  }
  const rawCandidates: Point[][] = [
    [start, { x: end.x, y: start.y }, end],
    [start, { x: start.x, y: end.y }, end]
  ];
  const seen = new Set<string>();
  return rawCandidates.flatMap((candidate) => {
    const route = orthogonalizeRouteKeepingCollinear(
      bounds ? candidate.map((point) => clampPointToBounds(point, bounds)) : candidate
    );
    if (route.length < 3 || samePoint(route[0], route[1]) || samePoint(route[route.length - 1], route[route.length - 2])) {
      return [];
    }
    if (
      !routeSegmentMatchesNormal(route[0], route[1], sourceNormal) ||
      !routeSegmentMatchesNormal(route[route.length - 1], route[route.length - 2], targetNormal)
    ) {
      return [];
    }
    const signature = routeSignature(route);
    if (seen.has(signature)) {
      return [];
    }
    seen.add(signature);
    return [route];
  });
}

function routeIntersectsEndpointAwareBlockers(
  points: Point[],
  blockers: ModelNode[],
  sourceId: string,
  targetId: string
) {
  if (points.length < 2) {
    return false;
  }
  const lastSegmentIndex = points.length - 2;
  const routeBlockers = filterBlockersForRoutePoints(points, blockers);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    for (const node of routeBlockers) {
      if (segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, sourceId, targetId, points)) {
        return true;
      }
    }
  }
  return false;
}

function routeHasEndpointAwareBlockingIssue(
  points: Point[],
  blockers: ModelNode[],
  sourceId: string,
  targetId: string
) {
  return routeHasImmediateReversal(points) || routeIntersectsEndpointAwareBlockers(points, blockers, sourceId, targetId);
}

function firstEndpointAwareBlockerIntersection(
  points: Point[],
  blockers: ModelNode[],
  sourceId: string,
  targetId: string
) {
  if (points.length < 2) {
    return null;
  }
  const lastSegmentIndex = points.length - 2;
  const routeBlockers = filterBlockersForRoutePoints(points, blockers);
  for (let segmentIndex = 1; segmentIndex < points.length; segmentIndex += 1) {
    const routeSegmentIndex = segmentIndex - 1;
    const a = points[segmentIndex - 1];
    const b = points[segmentIndex];
    for (const blocker of routeBlockers) {
      const box = routeSegmentBlockerIntersectionBoxWithEndpointAwareness(
        a,
        b,
        routeSegmentIndex,
        lastSegmentIndex,
        blocker,
        sourceId,
        targetId,
        points
      );
      if (box) {
        return { segmentIndex: routeSegmentIndex, box };
      }
    }
  }
  return null;
}

function repairEndpointAwareRouteAroundBlockers(
  points: Point[],
  blockers: ModelNode[],
  sourceId: string,
  targetId: string,
  bounds?: CanvasBounds
) {
  let route = orthogonalizeRouteKeepingCollinear(points);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const intersection = firstEndpointAwareBlockerIntersection(route, blockers, sourceId, targetId);
    if (!intersection) {
      return route;
    }
    const a = route[intersection.segmentIndex];
    const b = route[intersection.segmentIndex + 1];
    const box = intersection.box;
    let replacement: Point[];
    if (a.y === b.y) {
      const topLane = clampLane(box.top - 24, 0, bounds?.height ?? box.top - 24, bounds);
      const bottomLane = clampLane(box.bottom + 24, 0, bounds?.height ?? box.bottom + 24, bounds);
      const lane = Math.abs(a.y - bottomLane) <= Math.abs(a.y - topLane) ? bottomLane : topLane;
      replacement = [a, { x: a.x, y: lane }, { x: b.x, y: lane }, b];
    } else if (a.x === b.x) {
      const leftLane = clampLane(box.left - 24, 0, bounds?.width ?? box.left - 24, bounds);
      const rightLane = clampLane(box.right + 24, 0, bounds?.width ?? box.right + 24, bounds);
      const lane = Math.abs(a.x - rightLane) <= Math.abs(a.x - leftLane) ? rightLane : leftLane;
      replacement = [a, { x: lane, y: a.y }, { x: lane, y: b.y }, b];
    } else {
      replacement = orthogonalizeRoute([a, b]);
    }
    route = orthogonalizeRouteKeepingCollinear([
      ...route.slice(0, intersection.segmentIndex),
      ...replacement,
      ...route.slice(intersection.segmentIndex + 2)
    ]);
  }
  return route;
}

function selectFullRouteCandidate(
  candidates: Point[][],
  start: Point,
  startOut: Point,
  endOut: Point,
  end: Point,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds: CanvasBounds | undefined,
  sourceId: string,
  targetId: string,
  extraFullCandidates: Point[][] = []
) {
  let bestRoute: Point[] | null = null;
  let bestTier = Number.POSITIVE_INFINITY;
  let bestBends = Number.POSITIVE_INFINITY;
  let bestLength = Number.POSITIVE_INFINITY;
  let bestScore = Number.POSITIVE_INFINITY;
  const seen = new Set<string>();

  const evaluateRoute = (candidateRoute: Point[]) => {
    const routeBlockers = filterBlockersForRoutePoints(candidateRoute, blockers);
    const routeAvoidedSegments = filterSegmentsForRoutePoints(candidateRoute, avoidedSegments);
    const route = simplifyRoutePreservingEndpointStubs(candidateRoute, {
      blockers: routeBlockers,
      avoidedSegments: routeAvoidedSegments
    });
    const signature = routeSignature(route);
    if (seen.has(signature)) {
      return;
    }
    seen.add(signature);
    const hasImmediateReversal = routeHasImmediateReversal(route);
    const intersectsBlocker = routeIntersectsEndpointAwareBlockers(route, routeBlockers, sourceId, targetId);
    const tier = hasImmediateReversal
      ? 3
      : !intersectsBlocker
      ? routeOverlapsSegments(route, routeAvoidedSegments) ? 1 : 0
      : 2;
    if (tier > bestTier) {
      return;
    }
    const bends = routeBendCount(route);
    const length = routeManhattanLength(route);
    const score = scoreRoute(route, routeBlockers, routeAvoidedSegments);
    if (
      !bestRoute ||
      tier < bestTier ||
      (tier === bestTier &&
        (length < bestLength ||
          (length === bestLength &&
            (bends < bestBends ||
              (bends === bestBends && score < bestScore)))))
    ) {
      bestRoute = route;
      bestTier = tier;
      bestBends = bends;
      bestLength = length;
      bestScore = score;
    }
  };

  for (const candidate of extraFullCandidates) {
    evaluateRoute(candidate);
  }
  for (const candidate of candidates) {
    const fullRoute = buildFullRoute(start, startOut, candidate.slice(1, -1), endOut, end, bounds);
    evaluateRoute(fullRoute);
    evaluateRoute(repairRouteAroundBlockers(fullRoute, blockers, bounds, 1));
  }

  return bestRoute ?? simplifyRoutePreservingEndpointStubs(buildFullRoute(start, startOut, [], endOut, end, bounds), {
    blockers,
    avoidedSegments,
    reduceTinyDoglegs: true
  });
}

function selectRenderableRouteCandidate(
  start: Point,
  startOut: Point,
  endOut: Point,
  end: Point,
  source: ModelNode,
  target: ModelNode,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds: CanvasBounds | undefined,
  endpointAlignedCandidates: Point[][]
) {
  const endpointNodeIds = new Set([source.id, target.id]);
  const selected = selectFullRouteCandidate(
    buildRouteCandidates(startOut, endOut, blockers, avoidedSegments, bounds, endpointNodeIds),
    start,
    startOut,
    endOut,
    end,
    blockers,
    avoidedSegments,
    bounds,
    source.id,
    target.id,
    endpointAlignedCandidates
  );
  if (!routeHasEndpointAwareBlockingIssue(selected, blockers, source.id, target.id)) {
    return selected;
  }
  const repaired = simplifyRoutePreservingEndpointStubs(
    repairEndpointAwareRouteAroundBlockers(selected, blockers, source.id, target.id, bounds),
    { blockers, avoidedSegments, reduceTinyDoglegs: true }
  );
  if (!routeHasEndpointAwareBlockingIssue(repaired, blockers, source.id, target.id)) {
    return repaired;
  }
  const expanded = selectFullRouteCandidate(
    buildExpandedRouteCandidates(startOut, endOut, blockers, bounds, endpointNodeIds),
    start,
    startOut,
    endOut,
    end,
    blockers,
    avoidedSegments,
    bounds,
    source.id,
    target.id,
    endpointAlignedCandidates
  );
  if (!routeHasEndpointAwareBlockingIssue(expanded, blockers, source.id, target.id)) {
    return expanded;
  }
  const repairedExpanded = simplifyRoutePreservingEndpointStubs(
    repairEndpointAwareRouteAroundBlockers(expanded, blockers, source.id, target.id, bounds),
    { blockers, avoidedSegments, reduceTinyDoglegs: true }
  );
  return routeHasEndpointAwareBlockingIssue(repairedExpanded, blockers, source.id, target.id) ? selected : repairedExpanded;
}

function routeEndpointSegmentsMatchNormals(points: Point[], sourceNormal: Point, targetNormal: Point) {
  return (
    points.length >= 2 &&
    routeSegmentMatchesNormal(points[0], points[1], sourceNormal) &&
    routeSegmentMatchesNormal(points[points.length - 1], points[points.length - 2], targetNormal)
  );
}

function routeIsSafeForEndpointPair(
  points: Point[],
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  sourceId: string,
  targetId: string
) {
  const routeBlockers = filterBlockersForRoutePoints(points, blockers);
  if (routeHasEndpointAwareBlockingIssue(points, routeBlockers, sourceId, targetId)) {
    return false;
  }
  const routeAvoidedSegments = filterSegmentsForRoutePoints(points, avoidedSegments);
  return !routeOverlapsSegments(points, routeAvoidedSegments);
}

function endpointsAreAlignedThroughOpposedNormals(
  start: Point,
  end: Point,
  sourceNormal: Point,
  targetNormal: Point
) {
  const verticalOpposed =
    start.x === end.x &&
    sourceNormal.x === 0 &&
    targetNormal.x === 0 &&
    sourceNormal.y === -targetNormal.y &&
    (end.y - start.y) * sourceNormal.y > 0;
  const horizontalOpposed =
    start.y === end.y &&
    sourceNormal.y === 0 &&
    targetNormal.y === 0 &&
    sourceNormal.x === -targetNormal.x &&
    (end.x - start.x) * sourceNormal.x > 0;
  return verticalOpposed || horizontalOpposed;
}

function buildAlignedOpposedDirectRoute(
  start: Point,
  end: Point,
  sourceNormal: Point,
  targetNormal: Point,
  bounds?: CanvasBounds
): Point[] | null {
  if (!endpointsAreAlignedThroughOpposedNormals(start, end, sourceNormal, targetNormal)) {
    return null;
  }
  const rawRoute = bounds
    ? [start, end].map((point) => clampPointToBounds(point, bounds))
    : [start, end];
  const route = orthogonalizeRouteKeepingCollinear(rawRoute);
  if (route.length !== 2 || samePoint(route[0], route[1])) {
    return null;
  }
  return routeEndpointSegmentsMatchNormals(route, sourceNormal, targetNormal) ? route : null;
}

function buildAlignedOpposedDirectRouteWhenEndpointStubsOverlap(
  start: Point,
  startOut: Point,
  endOut: Point,
  end: Point,
  sourceNormal: Point,
  targetNormal: Point,
  bounds?: CanvasBounds
): Point[] | null {
  const directRoute = buildAlignedOpposedDirectRoute(start, end, sourceNormal, targetNormal, bounds);
  if (!directRoute) {
    return null;
  }
  const stubRoute = buildFullRoute(start, startOut, [], endOut, end, bounds);
  return routeHasImmediateReversal(stubRoute) || routeManhattanLength(stubRoute) > routeManhattanLength(directRoute)
    ? directRoute
    : null;
}

function endpointNormalsAreOpposedOnSameAxis(sourceNormal: Point, targetNormal: Point) {
  const horizontalOpposed =
    sourceNormal.y === 0 &&
    targetNormal.y === 0 &&
    sourceNormal.x !== 0 &&
    sourceNormal.x === -targetNormal.x;
  const verticalOpposed =
    sourceNormal.x === 0 &&
    targetNormal.x === 0 &&
    sourceNormal.y !== 0 &&
    sourceNormal.y === -targetNormal.y;
  return horizontalOpposed || verticalOpposed;
}

function endpointNormalsAreSameFacingOnSameAxis(sourceNormal: Point, targetNormal: Point) {
  const horizontalSameFacing =
    sourceNormal.y === 0 &&
    targetNormal.y === 0 &&
    sourceNormal.x !== 0 &&
    sourceNormal.x === targetNormal.x;
  const verticalSameFacing =
    sourceNormal.x === 0 &&
    targetNormal.x === 0 &&
    sourceNormal.y !== 0 &&
    sourceNormal.y === targetNormal.y;
  return horizontalSameFacing || verticalSameFacing;
}

function routeBoundsFromPoints(points: Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys)
  };
}

function routeStaysWithinEndpointStubEnvelope(
  route: Point[],
  start: Point,
  startOut: Point,
  endOut: Point,
  end: Point
) {
  const envelope = routeBoundsFromPoints([start, startOut, endOut, end]);
  const routeBox = routeBoundsFromPoints(route);
  const margin = ROUTE_CLEARANCE;
  return (
    routeBox.left >= envelope.left - margin &&
    routeBox.right <= envelope.right + margin &&
    routeBox.top >= envelope.top - margin &&
    routeBox.bottom <= envelope.bottom + margin
  );
}

function routeDetoursOppositeSameFacingEndpointSide(
  route: Point[],
  start: Point,
  end: Point,
  normal: Point
) {
  const endpointBox = routeBoundsFromPoints([start, end]);
  const routeBox = routeBoundsFromPoints(route);
  const margin = ROUTE_ENDPOINT_STUB_LENGTH;
  if (normal.x > 0) {
    return routeBox.left < endpointBox.left - margin;
  }
  if (normal.x < 0) {
    return routeBox.right > endpointBox.right + margin;
  }
  if (normal.y > 0) {
    return routeBox.top < endpointBox.top - margin;
  }
  if (normal.y < 0) {
    return routeBox.bottom > endpointBox.bottom + margin;
  }
  return false;
}

function candidateRemovesManualOuterDetour(manualRoute: Point[], candidateRoute: Point[], start: Point, end: Point) {
  const endpointBox = {
    left: Math.min(start.x, end.x),
    right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y),
    bottom: Math.max(start.y, end.y)
  };
  const manualBox = routeBoundsFromPoints(manualRoute);
  const candidateBox = routeBoundsFromPoints(candidateRoute);
  const margin = ROUTE_ENDPOINT_STUB_LENGTH;
  return (
    (manualBox.left < endpointBox.left - margin && candidateBox.left >= endpointBox.left - margin) ||
    (manualBox.right > endpointBox.right + margin && candidateBox.right <= endpointBox.right + margin) ||
    (manualBox.top < endpointBox.top - margin && candidateBox.top >= endpointBox.top - margin) ||
    (manualBox.bottom > endpointBox.bottom + margin && candidateBox.bottom <= endpointBox.bottom + margin)
  );
}

function routeHasManualBendPocket(route: Point[]) {
  for (let index = 0; index < route.length - 3; index += 1) {
    const a = route[index];
    const b = route[index + 1];
    const c = route[index + 2];
    const d = route[index + 3];
    const verticalPocketOffset = Math.abs(b.x - a.x);
    const horizontalPocketOffset = Math.abs(b.y - a.y);
    const maxInsertedPocketOffset = ROUTE_ENDPOINT_STUB_LENGTH + ROUTE_TINY_DOGLEG_LIMIT;
    const verticalPocket =
      a.x === d.x &&
      b.x === c.x &&
      a.y === b.y &&
      c.y === d.y &&
      a.x !== b.x &&
      a.y !== c.y &&
      verticalPocketOffset <= maxInsertedPocketOffset;
    const horizontalPocket =
      a.y === d.y &&
      b.y === c.y &&
      a.x === b.x &&
      c.x === d.x &&
      a.y !== b.y &&
      a.x !== c.x &&
      horizontalPocketOffset <= maxInsertedPocketOffset;
    if (verticalPocket || horizontalPocket) {
      return true;
    }
  }
  return false;
}

function selectClearlySimplerAutomaticManualRoute(
  manualRoute: Point[],
  start: Point,
  startOut: Point,
  endOut: Point,
  end: Point,
  source: ModelNode,
  target: ModelNode,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds: CanvasBounds | undefined,
  sourceNormal: Point,
  targetNormal: Point
) {
  if (routeHasManualBendPocket(manualRoute)) {
    return null;
  }
  const rawDirectRoute = buildFullRoute(start, startOut, [], endOut, end, bounds);
  const routeBlockers = filterBlockersForRoutePoints(rawDirectRoute, blockers);
  const routeAvoidedSegments = filterSegmentsForRoutePoints(rawDirectRoute, avoidedSegments);
  const alignedOpposedDirectRoute = buildAlignedOpposedDirectRouteWhenEndpointStubsOverlap(
    start,
    startOut,
    endOut,
    end,
    sourceNormal,
    targetNormal,
    bounds
  );
  const directRoute = alignedOpposedDirectRoute ?? simplifyRoutePreservingEndpointStubs(rawDirectRoute, {
    blockers: routeBlockers,
    avoidedSegments: routeAvoidedSegments,
    reduceTinyDoglegs: true
  });
  const automaticRoute = selectRenderableRouteCandidate(
    start,
    startOut,
    endOut,
    end,
    source,
    target,
    blockers,
    avoidedSegments,
    bounds,
    alignedOpposedDirectRoute
      ? [alignedOpposedDirectRoute, ...buildEndpointAlignedDirectCandidates(start, end, sourceNormal, targetNormal, bounds)]
      : buildEndpointAlignedDirectCandidates(start, end, sourceNormal, targetNormal, bounds)
  );
  const manualBends = routeBendCount(manualRoute);
  const manualLength = routeManhattanLength(manualRoute);
  const hasNonEndpointBlockers = blockers.some((node) => node.id !== source.id && node.id !== target.id);
  let bestRoute: Point[] | null = null;
  let bestBends = Number.POSITIVE_INFINITY;
  let bestLength = Number.POSITIVE_INFINITY;
  const seen = new Set<string>();

  for (const candidateRoute of [directRoute, automaticRoute]) {
    const signature = routeSignature(candidateRoute);
    if (seen.has(signature) || signature === routeSignature(manualRoute)) {
      continue;
    }
    seen.add(signature);
    if (
      !routeEndpointSegmentsMatchNormals(candidateRoute, sourceNormal, targetNormal) ||
      !routeIsSafeForEndpointPair(candidateRoute, blockers, avoidedSegments, source.id, target.id)
    ) {
      continue;
    }
    const candidateBends = routeBendCount(candidateRoute);
    const candidateLength = routeManhattanLength(candidateRoute);
    const bendGain = manualBends - candidateBends;
    const lengthGain = manualLength - candidateLength;
    const hasEndpointAlignedBendWin =
      candidateBends <= 1 || endpointsAreAlignedThroughOpposedNormals(start, end, sourceNormal, targetNormal);
    const hasClearBendWin =
      bendGain > 0 &&
      lengthGain >= ROUTE_TINY_DOGLEG_LIMIT &&
      (
        hasEndpointAlignedBendWin ||
        (!hasNonEndpointBlockers && candidateRemovesManualOuterDetour(manualRoute, candidateRoute, start, end))
      );
    const hasClearLengthWin =
      !hasNonEndpointBlockers &&
      candidateBends <= manualBends &&
      lengthGain >= ROUTE_ENDPOINT_STUB_LENGTH * 4 &&
      candidateRemovesManualOuterDetour(manualRoute, candidateRoute, start, end);
    const hasEqualOrShorterBendWin =
      bendGain > 0 &&
      lengthGain >= 0 &&
      hasEndpointAlignedBendWin;
    const hasLocalEndpointBendWin =
      bendGain > 0 &&
      lengthGain >= 0 &&
      candidateBends <= 2 &&
      (
        endpointNormalsAreOpposedOnSameAxis(sourceNormal, targetNormal) ||
        (
          endpointNormalsAreSameFacingOnSameAxis(sourceNormal, targetNormal) &&
          routeDetoursOppositeSameFacingEndpointSide(manualRoute, start, end, sourceNormal)
        )
      ) &&
      routeStaysWithinEndpointStubEnvelope(candidateRoute, start, startOut, endOut, end);
    const hasAlignedOpposedDirectWin =
      alignedOpposedDirectRoute !== null &&
      signature === routeSignature(alignedOpposedDirectRoute) &&
      candidateBends <= manualBends &&
      lengthGain > 0 &&
      routeStaysWithinEndpointStubEnvelope(candidateRoute, start, startOut, endOut, end);
    if (
      !hasClearBendWin &&
      !hasClearLengthWin &&
      !hasEqualOrShorterBendWin &&
      !hasLocalEndpointBendWin &&
      !hasAlignedOpposedDirectWin
    ) {
      continue;
    }
    if (
      !bestRoute ||
      candidateLength < bestLength ||
      (candidateLength === bestLength && candidateBends < bestBends)
    ) {
      bestRoute = candidateRoute;
      bestBends = candidateBends;
      bestLength = candidateLength;
    }
  }
  return bestRoute;
}

function pathWithCrossingArcs(route: RoutedEdge, allSegments: Segment[], routeIndex: number) {
  const crossingsBySegment = new Map<number, Point[]>();
  const currentSegments = getSegments(route.edgeId, routeIndex, route.points).filter((segment) => segment.orientation === "vertical");
  const nearbySegments = filterSegmentsForRoutePoints(route.points, allSegments, 2);

  for (const segment of currentSegments) {
    for (const other of nearbySegments) {
      if (other.edgeId === segment.edgeId || other.orientation !== "horizontal") {
        continue;
      }
      const point = intersection(segment, other);
      if (point && !pointNearRouteTerminal(point, segment) && !pointNearRouteTerminal(point, other)) {
        crossingsBySegment.set(segment.segmentIndex, [...(crossingsBySegment.get(segment.segmentIndex) ?? []), point]);
      }
    }
  }

  if (crossingsBySegment.size === 0) {
    return pointsToOrthogonalPath(route.points);
  }

  const radius = 7;
  const commands = [`M ${route.points[0].x} ${route.points[0].y}`];
  for (let index = 1; index < route.points.length; index += 1) {
    const a = route.points[index - 1];
    const b = route.points[index];
    const crossings = crossingsBySegment.get(index - 1) ?? [];
    if (crossings.length === 0) {
      commands.push(`L ${b.x} ${b.y}`);
      continue;
    }

    const ordered = crossings.sort((first, second) =>
      a.x === b.x ? Math.abs(first.y - a.y) - Math.abs(second.y - a.y) : Math.abs(first.x - a.x) - Math.abs(second.x - a.x)
    );
    for (const crossing of ordered) {
      if (a.y === b.y) {
        const direction = Math.sign(b.x - a.x);
        commands.push(`L ${crossing.x - direction * radius} ${crossing.y}`);
        commands.push(`Q ${crossing.x} ${crossing.y - radius} ${crossing.x + direction * radius} ${crossing.y}`);
      } else {
        const direction = Math.sign(b.y - a.y);
        commands.push(`L ${crossing.x} ${crossing.y - direction * radius}`);
        commands.push(`Q ${crossing.x + radius} ${crossing.y} ${crossing.x} ${crossing.y + direction * radius}`);
      }
    }
    commands.push(`L ${b.x} ${b.y}`);
  }
  return commands.join(" ");
}

type CrossingRouteBox = ReturnType<typeof routeBoundsForPoints>;

type CrossingRouteSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, number[]>;
  routeBoxes: CrossingRouteBox[];
};

const crossingRouteSpatialBucketKey = (x: number, y: number) => `${x}:${y}`;

const crossingRouteSpatialBucketRange = (box: CrossingRouteBox, bucketSize: number) => ({
  left: Math.floor(box.left / bucketSize),
  right: Math.floor(box.right / bucketSize),
  top: Math.floor(box.top / bucketSize),
  bottom: Math.floor(box.bottom / bucketSize)
});

function buildCrossingRouteSpatialIndex(routeBoxes: CrossingRouteBox[]): CrossingRouteSpatialIndex {
  const buckets = new Map<string, number[]>();
  for (let routeIndex = 0; routeIndex < routeBoxes.length; routeIndex += 1) {
    const box = routeBoxes[routeIndex];
    const range = crossingRouteSpatialBucketRange(box, CROSSING_ARC_SPATIAL_BUCKET_SIZE);
    for (let x = range.left; x <= range.right; x += 1) {
      for (let y = range.top; y <= range.bottom; y += 1) {
        const key = crossingRouteSpatialBucketKey(x, y);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(routeIndex);
        } else {
          buckets.set(key, [routeIndex]);
        }
      }
    }
  }
  return { bucketSize: CROSSING_ARC_SPATIAL_BUCKET_SIZE, buckets, routeBoxes };
}

function queryCrossingRouteSpatialIndex(index: CrossingRouteSpatialIndex, box: CrossingRouteBox): number[] {
  const range = crossingRouteSpatialBucketRange(box, index.bucketSize);
  const matches: number[] = [];
  const seen = new Set<number>();
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(crossingRouteSpatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const routeIndex of bucket) {
        if (seen.has(routeIndex) || !boxesOverlap(index.routeBoxes[routeIndex], box)) {
          continue;
        }
        seen.add(routeIndex);
        matches.push(routeIndex);
      }
    }
  }
  return matches;
}

export function refreshCrossingArcPaths(
  routes: RoutedEdge[],
  changedEdgeIds?: ReadonlySet<string>,
  previousRoutes: RoutedEdge[] = []
): RoutedEdge[] {
  if (!changedEdgeIds || changedEdgeIds.size === 0) {
    const routeBoxes = routes.map((route) => routeBoundsForPoints(route.points, CROSSING_TERMINAL_MARGIN));
    const routeSpatialIndex = buildCrossingRouteSpatialIndex(routeBoxes);
    const segmentCache = new Map<number, Segment[]>();
    const segmentsForRouteIndex = (routeIndex: number) => {
      const cached = segmentCache.get(routeIndex);
      if (cached) {
        return cached;
      }
      const route = routes[routeIndex];
      const segments = route ? getSegments(route.edgeId, routeIndex, route.points) : [];
      segmentCache.set(routeIndex, segments);
      return segments;
    };
    return routes.map((route, index) => {
      const crossingSegments = queryCrossingRouteSpatialIndex(routeSpatialIndex, routeBoxes[index]).flatMap(segmentsForRouteIndex);
      const path = pathWithCrossingArcs(route, crossingSegments, index);
      return path === route.path ? route : { ...route, path };
    });
  }

  const routeBoxes = routes.map((route) => routeBoundsForPoints(route.points, CROSSING_TERMINAL_MARGIN));
  const routeSpatialIndex = buildCrossingRouteSpatialIndex(routeBoxes);
  const changedBoxes: CrossingRouteBox[] = [];
  routes.forEach((route, index) => {
    if (changedEdgeIds.has(route.edgeId)) {
      changedBoxes.push(routeBoxes[index]);
    }
  });
  for (const previousRoute of previousRoutes) {
    if (changedEdgeIds.has(previousRoute.edgeId)) {
      changedBoxes.push(routeBoundsForPoints(previousRoute.points, CROSSING_TERMINAL_MARGIN));
    }
  }
  if (changedBoxes.length === 0) {
    return routes;
  }

  const refreshIndexes = new Set<number>();
  for (const changedBox of changedBoxes) {
    for (const routeIndex of queryCrossingRouteSpatialIndex(routeSpatialIndex, changedBox)) {
      refreshIndexes.add(routeIndex);
    }
  }
  if (refreshIndexes.size === 0) {
    return routes;
  }

  const segmentIndexes = new Set<number>();
  for (const refreshIndex of refreshIndexes) {
    const refreshBox = routeBoxes[refreshIndex];
    for (const routeIndex of queryCrossingRouteSpatialIndex(routeSpatialIndex, refreshBox)) {
      segmentIndexes.add(routeIndex);
    }
  }
  const crossingSegments = [...segmentIndexes].flatMap((index) =>
    getSegments(routes[index].edgeId, index, routes[index].points)
  );

  return routes.map((route, index) => {
    if (!refreshIndexes.has(index)) {
      return route;
    }
    const path = pathWithCrossingArcs(route, crossingSegments, index);
    return path === route.path ? route : { ...route, path };
  });
}

export function routeEdgesForRendering(
  nodes: ModelNode[],
  edges: Edge[],
  bounds?: CanvasBounds,
  options: ManualRouteDisplayOptions = {}
): RoutedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routed: RoutedEdge[] = [];
  const avoidedSegments: Segment[] = [];
  edges.forEach((edge) => {
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return;
    }
    const routeIndex = routed.length;
    const points = routeOrthogonalEdge(source, target, nodes, edge, avoidedSegments, bounds, options);
    routed.push({
      edgeId: edge.id,
      points,
      path: ""
    });
    avoidedSegments.push(...getSegments(edge.id, routeIndex, points));
  });
  const renderRoutes = routed.map((route) => ({ ...route, points: simplifyRoutePreservingEndpointStubs(route.points) }));
  return refreshCrossingArcPaths(renderRoutes);
}

function edgeWithProjectedMissingBusEndpointPoints(edge: Edge, source: ModelNode, target: ModelNode): Edge {
  let next = edge;
  let start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
  let end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
  if (isBusNode(source) && !edge.sourcePoint) {
    start = projectPointToBusCenterline(source, end);
    next = { ...next, sourcePoint: start };
  }
  if (isBusNode(target) && !edge.targetPoint) {
    end = projectPointToBusCenterline(target, start);
    next = { ...next, targetPoint: end };
  }
  return next;
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

function preservedStoredRoutePointsForDisplay(
  routePoints: Point[] | undefined,
  start: Point,
  end: Point,
  bounds?: CanvasBounds
): Point[] | null {
  if (!routePoints || routePoints.length < 2) {
    return null;
  }
  const points = routePoints.map((point) => ({ ...point }));
  if (!samePoint(points[0], start) || !samePoint(points[points.length - 1], end)) {
    return null;
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous.x !== current.x && previous.y !== current.y) {
      return null;
    }
    if (
      bounds &&
      (current.x < 0 || current.x > bounds.width || current.y < 0 || current.y > bounds.height ||
        previous.x < 0 || previous.x > bounds.width || previous.y < 0 || previous.y > bounds.height)
    ) {
      return null;
    }
  }
  return points;
}

export function routeEdgesForStoredRendering(
  nodes: ModelNode[],
  edges: Edge[],
  bounds?: CanvasBounds,
  options: ManualRouteDisplayOptions = {}
): RoutedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routes = edges.flatMap((edge) => {
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return [];
    }
    const routingEdge = edgeWithProjectedMissingBusEndpointPoints(edge, source, target);
    const start = getEdgeEndpointPoint(source, routingEdge.sourcePoint, routingEdge.sourceTerminalId);
    const end = getEdgeEndpointPoint(target, routingEdge.targetPoint, routingEdge.targetTerminalId);
    const sourceIsFloating = !nodeById.has(edge.sourceId) && Boolean(edge.sourcePoint);
    const targetIsFloating = !nodeById.has(edge.targetId) && Boolean(edge.targetPoint);
    const hasManualRoute = Boolean(edge.manualPoints?.length);
    const preservedRoutePoints = options.preserveManualRouteDisplay
      ? preservedStoredRoutePointsForDisplay(edge.routePoints, start, end, bounds)
      : null;
    if (preservedRoutePoints) {
      return [{
        edgeId: edge.id,
        points: preservedRoutePoints,
        path: pointsToOrthogonalPath(preservedRoutePoints)
      }];
    }
    if (!hasManualRoute && (sourceIsFloating || targetIsFloating) && isOrthogonalDirectSegment(start, end)) {
      const directRoute = [start, end];
      const nonEndpointBlockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);
      if (!routeIntersectsBlockers(directRoute, nonEndpointBlockers, ROUTE_BLOCKER_PADDING, 0)) {
        return [{
          edgeId: edge.id,
          points: directRoute,
          path: pointsToOrthogonalPath(directRoute)
        }];
      }
    }
    const sourceNormal = routeEndpointNormal(source, start, end, routingEdge.sourceTerminalId);
    const targetNormal = routeEndpointNormal(target, end, start, routingEdge.targetTerminalId);
    const alignedDirectRoute = buildAlignedOpposedDirectRoute(start, end, sourceNormal, targetNormal, bounds);
    if (!hasManualRoute && alignedDirectRoute) {
      const nonEndpointBlockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);
      if (!routeIntersectsBlockers(alignedDirectRoute, nonEndpointBlockers, ROUTE_BLOCKER_PADDING, 0)) {
        return [{
          edgeId: edge.id,
          points: alignedDirectRoute,
          path: pointsToOrthogonalPath(alignedDirectRoute)
        }];
      }
    }
    const stubLength = ROUTE_ENDPOINT_STUB_LENGTH;
    const endpointBlockers = [source, target];
    const startOut = endpointStubPoint(start, sourceNormal, source, endpointBlockers, stubLength);
    const endOut = endpointStubPoint(end, targetNormal, target, endpointBlockers, stubLength);
    const middle = edge.manualPoints?.length
      ? edge.manualPoints
      : startOut.x === endOut.x || startOut.y === endOut.y
        ? []
        : [{ x: endOut.x, y: startOut.y }];
    const boundedPoints = [start, startOut, ...middle, endOut, end].map((point) =>
      bounds ? clampPointToBounds(point, bounds) : point
    );
    let points = simplifyRoutePreservingEndpointStubs(orthogonalizeRouteKeepingCollinear(boundedPoints), {
      blockers: endpointBlockers,
      reduceTinyDoglegs: !edge.manualPoints?.length
    });
    if (routeHasImmediateReversal(points) || routeIntersectsBlockers(points, endpointBlockers, ROUTE_BLOCKER_PADDING, 1)) {
      points = simplifyRoutePreservingEndpointStubs(
        repairRouteAroundBlockers(points, endpointBlockers, bounds, 1),
        { blockers: endpointBlockers, reduceTinyDoglegs: true }
      );
    }
    if (edge.manualPoints?.length && !options.preserveManualRouteDisplay) {
      const relevantBlockers = relevantBlockersForRoute(source, target, nodes, startOut, endOut, true);
      const simplificationBlockers = relevantBlockers.length > 0
        ? [...endpointBlockers, ...relevantBlockers]
        : endpointBlockers;
      points = chooseSimplerAutomaticRouteForContext(
        points,
        source,
        target,
        {
          sourceId: source.id,
          targetId: target.id,
          start,
          end,
          startOut,
          endOut,
          sourceNormal,
          targetNormal,
          blockers: simplificationBlockers,
          endpointNodeIds: new Set([source.id, target.id])
        },
        [],
        bounds
      );
    }
    if (routeHasImmediateReversal(points) || routeIntersectsBlockers(points, endpointBlockers, ROUTE_BLOCKER_PADDING, 1)) {
      points = simplifyRoutePreservingEndpointStubs(
        routeOrthogonalEdge(source, target, nodes, edgeWithoutManualPoints(routingEdge), [], bounds),
        {
          blockers: filterBlockersForRoutePoints(points, nodes),
          reduceTinyDoglegs: true
        }
      );
    }
    return [{
      edgeId: edge.id,
      points,
      path: pointsToOrthogonalPath(points)
    }];
  });
  return refreshCrossingArcPaths(routes);
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

function routeEndpointNormal(node: ModelNode, endpointPoint: Point, otherPoint: Point, terminalId?: string): Point {
  return getRouteEndpointNormal(node, endpointPoint, otherPoint, terminalId);
}

function routeSegmentMatchesNormal(endpoint: Point, adjacent: Point, normal: Point) {
  const dx = Math.round(adjacent.x - endpoint.x);
  const dy = Math.round(adjacent.y - endpoint.y);
  if (normal.x !== 0) {
    return dy === 0 && dx * Math.sign(normal.x) > 0;
  }
  if (normal.y !== 0) {
    return dx === 0 && dy * Math.sign(normal.y) > 0;
  }
  return false;
}

function routeHasImmediateReversal(points: Point[]) {
  const normalized: Point[] = [];
  for (const point of points) {
    const previous = normalized[normalized.length - 1];
    if (!previous || !samePoint(previous, point)) {
      normalized.push(point);
    }
  }
  for (let index = 1; index < normalized.length - 1; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    const next = normalized[index + 1];
    const first = {
      x: Math.round(current.x - previous.x),
      y: Math.round(current.y - previous.y)
    };
    const second = {
      x: Math.round(next.x - current.x),
      y: Math.round(next.y - current.y)
    };
    if (first.y === 0 && second.y === 0 && first.x * second.x < 0) {
      return true;
    }
    if (first.x === 0 && second.x === 0 && first.y * second.y < 0) {
      return true;
    }
  }
  return false;
}

function segmentIntersectsRouteBlocker(
  a: Point,
  b: Point,
  segmentIndex: number,
  lastSegmentIndex: number,
  node: ModelNode,
  sourceId: string,
  targetId: string,
  routePoints?: Point[]
) {
  return Boolean(routeSegmentBlockerIntersectionBoxWithEndpointAwareness(
    a,
    b,
    segmentIndex,
    lastSegmentIndex,
    node,
    sourceId,
    targetId,
    routePoints
  ));
}

function routeSegmentBlockerIntersectionBoxWithEndpointAwareness(
  a: Point,
  b: Point,
  segmentIndex: number,
  lastSegmentIndex: number,
  node: ModelNode,
  sourceId: string,
  targetId: string,
  routePoints?: Point[]
) {
  if (node.id.startsWith("floating-")) {
    return null;
  }
  if (node.id === sourceId && segmentIndex === 0) {
    return null;
  }
  if (node.id === sourceId && segmentIndex === 1 && routeSegmentTouchesOnlyEndpointClearance(a, b, node)) {
    return null;
  }
  if (node.id === targetId && segmentIndex === lastSegmentIndex) {
    return null;
  }
  if (
    node.id === targetId &&
    segmentIndex === lastSegmentIndex - 1 &&
    routeSegmentTouchesOnlyEndpointClearance(a, b, node)
  ) {
    return null;
  }
  if (routePoints && routeSegmentIsContinuousEndpointBusOverlap(routePoints, segmentIndex, node, sourceId, targetId)) {
    return null;
  }
  return routeSegmentBlockerIntersectionBox(a, b, node);
}

function routeSegmentTouchesOnlyEndpointClearance(a: Point, b: Point, node: ModelNode) {
  return !segmentIntersectsBox(a, b, routeBodyBlockerBox(node, 0));
}

function routeSegmentIsContinuousEndpointBusOverlap(
  points: Point[],
  segmentIndex: number,
  node: ModelNode,
  sourceId: string,
  targetId: string
) {
  if (!isBusNode(node) || segmentIndex < 0 || segmentIndex >= points.length - 1) {
    return false;
  }
  const box = routeBlockerBox(node, ROUTE_BLOCKER_PADDING);
  if (node.id === sourceId) {
    for (let index = 0; index <= segmentIndex; index += 1) {
      if (!segmentIntersectsBox(points[index], points[index + 1], box)) {
        return false;
      }
    }
    return true;
  }
  if (node.id === targetId) {
    for (let index = points.length - 2; index >= segmentIndex; index -= 1) {
      if (!segmentIntersectsBox(points[index], points[index + 1], box)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function routeSingleConnectionForValidation(nodes: ModelNode[], edge: Edge, bounds?: CanvasBounds): RoutedEdge | null {
  return routeEdgesForRendering(nodes, [edge], bounds)[0] ?? null;
}

export function validateConnectionEdgeRoute(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
): ConnectionRouteValidationResult {
  const issues: ConnectionRouteValidationIssue[] = [];
  const edge = edges.find((item) => item.id === edgeId);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = edge ? nodeById.get(edge.sourceId) : undefined;
  const target = edge ? nodeById.get(edge.targetId) : undefined;
  if (!edge || !source || !target) {
    issues.push({
      type: "missing-endpoint",
      edgeId,
      message: "联络线缺少首端或末端设备，不能生成悬空联络线。"
    });
    return { ok: false, issues };
  }

  const route = routeSingleConnectionForValidation(nodes, edge, bounds);
  if (!route || route.points.length < 2) {
    issues.push({
      type: "missing-endpoint",
      edgeId,
      message: "联络线无法生成有效正交路径。"
    });
    return { ok: false, issues };
  }

  const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
  const first = route.points[0];
  const last = route.points[route.points.length - 1];
  if (!samePoint(first, start) || !samePoint(last, end)) {
    issues.push({
      type: "endpoint-mismatch",
      edgeId,
      message: "联络线路径首末点没有准确落在设备端子或母线连接点上。"
    });
  }

  const sourceNormal = routeEndpointNormal(source, start, end, edge.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, end, start, edge.targetTerminalId);
  if (!routeSegmentMatchesNormal(route.points[0], route.points[1], sourceNormal)) {
    issues.push({
      type: "endpoint-not-perpendicular",
      edgeId,
      nodeId: source.id,
      message: `联络线首端没有与 ${source.name} 的端子法平面保持垂直。`
    });
  }
  if (!routeSegmentMatchesNormal(route.points[route.points.length - 1], route.points[route.points.length - 2], targetNormal)) {
    issues.push({
      type: "endpoint-not-perpendicular",
      edgeId,
      nodeId: target.id,
      message: `联络线末端没有与 ${target.name} 的端子法平面保持垂直。`
    });
  }
  if (routeHasImmediateReversal(route.points)) {
    issues.push({
      type: "route-reversal",
      edgeId,
      message: "联络线路径存在原地 180 度反向折返，属于无意义走线。"
    });
  }

  const lastSegmentIndex = route.points.length - 2;
  const routeBlockers = filterBlockersForRoutePoints(route.points, nodes);
  for (let index = 1; index < route.points.length; index += 1) {
    const a = route.points[index - 1];
    const b = route.points[index];
    if (a.x !== b.x && a.y !== b.y) {
      issues.push({
        type: "non-orthogonal",
        edgeId,
        message: "联络线路径存在斜线段，必须保持横平竖直。"
      });
      continue;
    }
    if (bounds && (a.x < 0 || a.x > bounds.width || a.y < 0 || a.y > bounds.height || b.x < 0 || b.x > bounds.width || b.y < 0 || b.y > bounds.height)) {
      issues.push({
        type: "out-of-bounds",
        edgeId,
        message: "联络线路径超出模型显示区域。"
      });
    }
    for (const node of routeBlockers) {
      if (segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, source.id, target.id, route.points)) {
        issues.push({
          type: "blocked-by-node",
          edgeId,
          nodeId: node.id,
          message: `联络线路径被图元 ${node.name} 遮挡或穿越。`
        });
      }
    }
  }

  return { ok: issues.length === 0, route, issues };
}

function commitManualPointsFromRoute(points: Point[]) {
  const manualPoints = points.length > 4 ? points.slice(2, -2) : points.slice(1, -1);
  return manualPoints.map((point) => ({ ...point }));
}

function edgeWithoutManualPoints(edge: Edge): Edge {
  const next = { ...edge };
  delete next.manualPoints;
  return next;
}

function edgeWithoutStoredRouteGeometry(edge: Edge): Edge {
  const next = edgeWithoutManualPoints(edge);
  delete next.routePoints;
  return next;
}

type ConnectionRouteRebuildOptions = {
  preserveManualPoints?: boolean;
};

type ConnectionEdgeCommitOptions = {
  preserveManualRouteDisplay?: boolean;
};

function shouldPreserveManualPointsForAutomaticRebuild(edge: Edge, options: ConnectionRouteRebuildOptions = {}) {
  return Boolean(options.preserveManualPoints && edge.manualPoints?.length);
}

function edgeWithCommitManualPoints(edge: Edge, route: RoutedEdge): Edge {
  const manualPoints = commitManualPointsFromRoute(route.points);
  const withoutManualPoints = edgeWithoutManualPoints(edge);
  const routePoints = route.points.map((point) => ({ ...point }));
  return manualPoints.length > 0
    ? { ...withoutManualPoints, manualPoints, routePoints }
    : { ...withoutManualPoints, routePoints };
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

type EdgeRoutingContext = {
  sourceId: string;
  targetId: string;
  start: Point;
  end: Point;
  startOut: Point;
  endOut: Point;
  sourceNormal: Point;
  targetNormal: Point;
  blockers: ModelNode[];
  endpointNodeIds: ReadonlySet<string>;
};

/**
 * 联络线自动布线原则：
 * 1. 首末点必须落在端子或母线连接点，首末段必须沿端子法线向外延伸。
 * 2. 新建、重建和移动后修复时，先保证不穿越设备/静态图元/标识，再按总长最短、同线长少折点选择。
 * 3. 打开模型或普通渲染时优先按保存路径绘制，只修复端点反向、穿越端点设备、明显陈旧且安全更短的路径。
 * 4. 连接线绘制不为了避让已有连接线而绕远，交叉弧线只属于渲染表现。
 * 5. 移动后只处理受影响或被干涉的连接线，避免大模型下全量重算。
 */
function buildEdgeRoutingContext(source: ModelNode, target: ModelNode, nodes: ModelNode[], edge?: Edge): EdgeRoutingContext {
  const start = getEdgeEndpointPoint(source, edge?.sourcePoint, edge?.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge?.targetPoint, edge?.targetTerminalId);
  const sourceNormal = routeEndpointNormal(source, start, end, edge?.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, end, start, edge?.targetTerminalId);
  const stubLength = ROUTE_ENDPOINT_STUB_LENGTH;
  const initialStartOut = {
    x: start.x + sourceNormal.x * stubLength,
    y: start.y + sourceNormal.y * stubLength
  };
  const initialEndOut = {
    x: end.x + targetNormal.x * stubLength,
    y: end.y + targetNormal.y * stubLength
  };
  const blockers = [
    source,
    target,
    ...relevantBlockersForRoute(source, target, nodes, initialStartOut, initialEndOut, false)
  ];
  const endpointNodeIds = new Set([source.id, target.id]);
  return {
    sourceId: source.id,
    targetId: target.id,
    start,
    end,
    startOut: endpointStubPoint(start, sourceNormal, source, blockers, stubLength),
    endOut: endpointStubPoint(end, targetNormal, target, blockers, stubLength),
    sourceNormal,
    targetNormal,
    blockers,
    endpointNodeIds
  };
}

function buildEndpointAlignedDirectCandidatesForContext(context: EdgeRoutingContext, bounds?: CanvasBounds) {
  const candidates = buildEndpointAlignedDirectCandidates(
    context.start,
    context.end,
    context.sourceNormal,
    context.targetNormal,
    bounds
  );
  const directRoute = buildAlignedOpposedDirectRouteWhenEndpointStubsOverlap(
    context.start,
    context.startOut,
    context.endOut,
    context.end,
    context.sourceNormal,
    context.targetNormal,
    bounds
  );
  return directRoute ? [directRoute, ...candidates] : candidates;
}

function endpointEscapeLaneValues(
  axis: "x" | "y",
  sourceBox: ReturnType<typeof boxFor>,
  targetBox: ReturnType<typeof boxFor>,
  context: EdgeRoutingContext,
  bounds?: CanvasBounds
) {
  const boundaryLanes = bounds
    ? axis === "x"
      ? [32, 64, 96, bounds.width - 96, bounds.width - 64, bounds.width - 32]
      : [32, 64, 96, bounds.height - 96, bounds.height - 64, bounds.height - 32]
    : [];
  const bodyLanes = axis === "x"
    ? [
        sourceBox.left - ROUTE_ENDPOINT_ESCAPE_CLEARANCE,
        sourceBox.left,
        sourceBox.right,
        sourceBox.right + ROUTE_ENDPOINT_ESCAPE_CLEARANCE,
        targetBox.left - ROUTE_ENDPOINT_ESCAPE_CLEARANCE,
        targetBox.left,
        targetBox.right,
        targetBox.right + ROUTE_ENDPOINT_ESCAPE_CLEARANCE
      ]
    : [
        sourceBox.top - ROUTE_ENDPOINT_ESCAPE_CLEARANCE,
        sourceBox.top,
        sourceBox.bottom,
        sourceBox.bottom + ROUTE_ENDPOINT_ESCAPE_CLEARANCE,
        targetBox.top - ROUTE_ENDPOINT_ESCAPE_CLEARANCE,
        targetBox.top,
        targetBox.bottom,
        targetBox.bottom + ROUTE_ENDPOINT_ESCAPE_CLEARANCE
      ];
  const anchors = axis === "x"
    ? [
        context.startOut.x,
        context.endOut.x,
        Math.round((context.startOut.x + context.endOut.x) / 2)
      ]
    : [
        context.startOut.y,
        context.endOut.y,
        Math.round((context.startOut.y + context.endOut.y) / 2)
      ];
  const clamp = (value: number) => {
    if (!bounds) {
      return value;
    }
    return axis === "x"
      ? clampNumber(value, 0, bounds.width)
      : clampNumber(value, 0, bounds.height);
  };
  return prioritizeLaneValues([...anchors, ...bodyLanes, ...boundaryLanes].map(clamp), anchors, ROUTE_MAX_LANES_PER_AXIS * 2);
}

function buildEndpointBodyEscapeCandidatesForContext(
  source: ModelNode,
  target: ModelNode,
  context: EdgeRoutingContext,
  bounds?: CanvasBounds
) {
  const sourceBox = routeBodyBlockerBox(source, ROUTE_BLOCKER_PADDING);
  const targetBox = routeBodyBlockerBox(target, ROUTE_BLOCKER_PADDING);
  const xLanes = endpointEscapeLaneValues("x", sourceBox, targetBox, context, bounds);
  const yLanes = endpointEscapeLaneValues("y", sourceBox, targetBox, context, bounds);
  const routes: Point[][] = [];
  const seen = new Set<string>();
  const addRoute = (middle: Point[]) => {
    const route = buildFullRoute(context.start, context.startOut, middle, context.endOut, context.end, bounds);
    const signature = routeSignature(route);
    if (seen.has(signature)) {
      return;
    }
    seen.add(signature);
    routes.push(route);
  };

  if (context.sourceNormal.x !== 0) {
    const escapeX = context.sourceNormal.x < 0 ? sourceBox.left : sourceBox.right;
    for (const y of yLanes) {
      addRoute([
        { x: escapeX, y: context.startOut.y },
        { x: escapeX, y },
        { x: context.endOut.x, y }
      ]);
    }
  }
  if (context.sourceNormal.y !== 0) {
    const escapeY = context.sourceNormal.y < 0 ? sourceBox.top : sourceBox.bottom;
    for (const x of xLanes) {
      addRoute([
        { x: context.startOut.x, y: escapeY },
        { x, y: escapeY },
        { x, y: context.endOut.y }
      ]);
    }
  }
  if (context.targetNormal.x !== 0) {
    const escapeX = context.targetNormal.x < 0 ? targetBox.left : targetBox.right;
    for (const y of yLanes) {
      addRoute([
        { x: context.startOut.x, y },
        { x: escapeX, y },
        { x: escapeX, y: context.endOut.y }
      ]);
    }
  }
  if (context.targetNormal.y !== 0) {
    const escapeY = context.targetNormal.y < 0 ? targetBox.top : targetBox.bottom;
    for (const x of xLanes) {
      addRoute([
        { x, y: context.startOut.y },
        { x, y: escapeY },
        { x: context.endOut.x, y: escapeY }
      ]);
    }
  }

  return routes;
}

function selectRenderableRouteForContext(
  source: ModelNode,
  target: ModelNode,
  context: EdgeRoutingContext,
  avoidedSegments: Segment[],
  bounds?: CanvasBounds
) {
  return selectRenderableRouteCandidate(
    context.start,
    context.startOut,
    context.endOut,
    context.end,
    source,
    target,
    context.blockers,
    avoidedSegments,
    bounds,
    buildEndpointAlignedDirectCandidatesForContext(context, bounds)
  );
}

function buildManualRouteForContext(context: EdgeRoutingContext, manualPoints: Point[], bounds?: CanvasBounds) {
  const route = orthogonalizeRouteKeepingCollinear([
    context.start,
    context.startOut,
    ...manualPoints,
    context.endOut,
    context.end
  ]);
  return bounds
    ? orthogonalizeRouteKeepingCollinear(route.map((point) => clampPointToBounds(point, bounds)))
    : route;
}

function routeHasRenderableIssue(points: Point[], context: EdgeRoutingContext) {
  return (
    routeHasImmediateReversal(points) ||
    routeIntersectsEndpointAwareBlockers(points, context.blockers, context.sourceId, context.targetId)
  );
}

function chooseSimplerAutomaticRouteForContext(
  route: Point[],
  source: ModelNode,
  target: ModelNode,
  context: EdgeRoutingContext,
  avoidedSegments: Segment[],
  bounds?: CanvasBounds
) {
  return selectClearlySimplerAutomaticManualRoute(
    route,
    context.start,
    context.startOut,
    context.endOut,
    context.end,
    source,
    target,
    context.blockers,
    avoidedSegments,
    bounds,
    context.sourceNormal,
    context.targetNormal
  ) ?? route;
}

function resolveManualRouteForContext(
  source: ModelNode,
  target: ModelNode,
  context: EdgeRoutingContext,
  manualPoints: Point[] | undefined,
  avoidedSegments: Segment[],
  bounds?: CanvasBounds,
  options: ManualRouteDisplayOptions = {}
) {
  if (!manualPoints?.length) {
    return null;
  }
  const boundedManualRoute = buildManualRouteForContext(context, manualPoints, bounds);
  const simplifiedManualRoute = simplifyRoutePreservingEndpointStubs(boundedManualRoute);
  if (!routeHasRenderableIssue(simplifiedManualRoute, context)) {
    if (options.preserveManualRouteDisplay) {
      return simplifiedManualRoute;
    }
    return chooseSimplerAutomaticRouteForContext(simplifiedManualRoute, source, target, context, avoidedSegments, bounds);
  }
  const repairedManualRoute = repairRouteAroundBlockers(boundedManualRoute, context.blockers, bounds, 1);
  const simplifiedRepairedManualRoute = simplifyRoutePreservingEndpointStubs(repairedManualRoute);
  if (!routeHasRenderableIssue(simplifiedRepairedManualRoute, context)) {
    if (options.preserveManualRouteDisplay) {
      return simplifiedRepairedManualRoute;
    }
    return chooseSimplerAutomaticRouteForContext(simplifiedRepairedManualRoute, source, target, context, avoidedSegments, bounds);
  }
  return null;
}

function routeHasCommitBlockingIssue(points: Point[], nodes: ModelNode[], source: ModelNode, target: ModelNode, bounds?: CanvasBounds) {
  if (points.length < 2) {
    return true;
  }
  const lastSegmentIndex = points.length - 2;
  const routeBlockers = filterBlockersForRoutePoints(points, nodes);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x !== b.x && a.y !== b.y) {
      return true;
    }
    if (
      bounds &&
      (a.x < 0 || a.x > bounds.width || a.y < 0 || a.y > bounds.height ||
        b.x < 0 || b.x > bounds.width || b.y < 0 || b.y > bounds.height)
    ) {
      return true;
    }
    for (const node of routeBlockers) {
      if (segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, source.id, target.id, points)) {
        return true;
      }
    }
  }
  return false;
}

function routeEndpointSegmentsAreValid(points: Point[], source: ModelNode, target: ModelNode, edge: Edge) {
  if (points.length < 2) {
    return false;
  }
  const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
  const first = points[0];
  const last = points[points.length - 1];
  if (!samePoint(first, start) || !samePoint(last, end)) {
    return false;
  }
  const sourceNormal = routeEndpointNormal(source, start, end, edge.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, end, start, edge.targetTerminalId);
  return (
    routeSegmentMatchesNormal(points[0], points[1], sourceNormal) &&
    routeSegmentMatchesNormal(points[points.length - 1], points[points.length - 2], targetNormal)
  );
}

function routeIsSafeForCommit(
  points: Point[],
  nodes: ModelNode[],
  source: ModelNode,
  target: ModelNode,
  edge: Edge,
  bounds?: CanvasBounds
) {
  return (
    routeEndpointSegmentsAreValid(points, source, target, edge) &&
    !routeHasImmediateReversal(points) &&
    !routeHasCommitBlockingIssue(points, nodes, source, target, bounds)
  );
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

function routeSignature(points: Point[]) {
  return points.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(";");
}

function selectCommitSafeRoute(
  candidates: Point[][],
  nodes: ModelNode[],
  source: ModelNode,
  target: ModelNode,
  edge: Edge,
  avoidedSegments: Segment[],
  bounds?: CanvasBounds
): Point[] | null {
  let bestRoute: Point[] | null = null;
  let bestBends = Number.POSITIVE_INFINITY;
  let bestLength = Number.POSITIVE_INFINITY;
  let bestScore = Number.POSITIVE_INFINITY;
  const seen = new Set<string>();
  const scoreBlockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);

  for (const candidate of candidates) {
    const simplified = simplifyRoutePreservingEndpointStubs(candidate, {
      blockers: filterBlockersForRoutePoints(candidate, nodes),
      avoidedSegments: filterSegmentsForRoutePoints(candidate, avoidedSegments),
      reduceTinyDoglegs: true
    });
    const signature = routeSignature(simplified);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    const simplifiedBlockers = filterBlockersForRoutePoints(simplified, nodes);
    const simplifiedAvoidedSegments = filterSegmentsForRoutePoints(simplified, avoidedSegments);
    if (!routeIsSafeForCommit(simplified, simplifiedBlockers, source, target, edge, bounds)) {
      continue;
    }
    const candidateBends = routeBendCount(simplified);
    const candidateLength = routeManhattanLength(simplified);
    const candidateScore = scoreRoute(simplified, filterBlockersForRoutePoints(simplified, scoreBlockers), simplifiedAvoidedSegments);
    if (
      !bestRoute ||
      candidateLength < bestLength ||
      (candidateLength === bestLength &&
        (candidateBends < bestBends ||
          (candidateBends === bestBends && candidateScore < bestScore)))
    ) {
      bestRoute = simplified;
      bestBends = candidateBends;
      bestLength = candidateLength;
      bestScore = candidateScore;
    }
  }

  return bestRoute;
}

function uniquePoints(points: Point[]): Point[] {
  const seen = new Set<string>();
  const result: Point[] = [];
  for (const point of points) {
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(point);
  }
  return result;
}

function busEndpointCandidatePoints(bus: ModelNode, preferredPoints: Point[]): Point[] {
  if (!isBusNode(bus)) {
    return [];
  }
  if (isBoundaryBusNode(bus)) {
    return uniquePoints(preferredPoints.map((point) => projectPointToNodeBoundary(bus, point)))
      .slice(0, ROUTE_MAX_BUS_ENDPOINT_POINTS_PER_SIDE);
  }
  const halfWidth = (bus.size.width * Math.abs(getNodeScaleX(bus))) / 2;
  const localXValues = preferredPoints.map((point) => pointToNodeLocal(bus, point).x);
  return uniquePoints(localXValues.map((localX) =>
    nodeLocalToPoint(bus, {
      x: clampNumber(localX, -halfWidth, halfWidth),
      y: 0
    })
  )).slice(0, ROUTE_MAX_BUS_ENDPOINT_POINTS_PER_SIDE);
}

function edgeWithEndpointPoint(edge: Edge, side: EdgeSide, point: Point): Edge {
  return side === "source"
    ? { ...edge, sourcePoint: point }
    : { ...edge, targetPoint: point };
}

function prioritizeBusOptimizedEdgeCandidates(
  candidates: Edge[],
  context: EdgeRoutingContext,
  maxCount = ROUTE_MAX_BUS_ENDPOINT_CANDIDATES
): Edge[] {
  if (candidates.length <= maxCount) {
    return candidates;
  }
  const distance = (first: Point, second: Point) =>
    Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
  return candidates
    .map((candidate, index) => {
      const sourcePoint = candidate.sourcePoint ?? context.start;
      const targetPoint = candidate.targetPoint ?? context.end;
      const score =
        distance(sourcePoint, targetPoint) * 4 +
        distance(sourcePoint, context.startOut) +
        distance(targetPoint, context.endOut) +
        distance(sourcePoint, context.start) +
        distance(targetPoint, context.end);
      return { candidate, index, score };
    })
    .sort((first, second) => first.score - second.score || first.index - second.index)
    .slice(0, maxCount)
    .map((item) => item.candidate);
}

function busOptimizedEdgeCandidates(edge: Edge, source: ModelNode, target: ModelNode, context: EdgeRoutingContext): Edge[] {
  let candidates = [edge];
  const expandSide = (side: EdgeSide, bus: ModelNode, preferredPoints: Point[]) => {
    if (!isBusNode(bus)) {
      return;
    }
    if ((side === "source" && edge.sourcePoint) || (side === "target" && edge.targetPoint)) {
      return;
    }
    const points = busEndpointCandidatePoints(bus, preferredPoints);
    candidates = candidates.flatMap((candidate) =>
      points.map((point) => edgeWithEndpointPoint(candidate, side, point))
    );
  };

  expandSide("source", source, [context.start, context.endOut, context.end]);
  expandSide("target", target, [context.end, context.startOut, context.start]);

  const seen = new Set<string>();
  candidates = candidates.filter((candidate) => {
    const sourceKey = candidate.sourcePoint ? `${candidate.sourcePoint.x},${candidate.sourcePoint.y}` : "";
    const targetKey = candidate.targetPoint ? `${candidate.targetPoint.x},${candidate.targetPoint.y}` : "";
    const key = `${sourceKey}|${targetKey}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return prioritizeBusOptimizedEdgeCandidates(candidates, context, ROUTE_MAX_BUS_ENDPOINT_CANDIDATES);
}

type DesignedCommitRoute = {
  edge: Edge;
  route: RoutedEdge;
};

function designCommitSafeRoute(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds
): DesignedCommitRoute | null {
  const edge = edges.find((item) => item.id === edgeId);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = edge ? nodeById.get(edge.sourceId) : undefined;
  const target = edge ? nodeById.get(edge.targetId) : undefined;
  if (!edge || !source || !target) {
    return null;
  }

  const edgeForDesign = edgeWithoutManualPoints(edge);
  const avoidedSegments: Segment[] = [];
  const initialContext = buildEdgeRoutingContext(source, target, nodes, edgeForDesign);
  const candidateEdges = busOptimizedEdgeCandidates(edgeForDesign, source, target, initialContext);
  let best: (DesignedCommitRoute & { bends: number; length: number; score: number }) | null = null;
  const scoreBlockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);

  for (const candidateEdge of candidateEdges) {
    const context = buildEdgeRoutingContext(source, target, nodes, candidateEdge);
    const endpointAlignedCandidates = buildEndpointAlignedDirectCandidatesForContext(context, bounds);
    const endpointEscapeCandidates = buildEndpointBodyEscapeCandidatesForContext(source, target, context, bounds);
    const selectFromMiddleCandidates = (middleCandidates: Point[][]) => {
      const fullCandidates: Point[][] = [...endpointAlignedCandidates, ...endpointEscapeCandidates];
      for (const middle of middleCandidates) {
        const route = buildFullRoute(context.start, context.startOut, middle.slice(1, -1), context.endOut, context.end, bounds);
        fullCandidates.push(route);
        fullCandidates.push(repairRouteAroundBlockers(route, context.blockers, bounds, 1));
      }
      return selectCommitSafeRoute(fullCandidates, nodes, source, target, candidateEdge, avoidedSegments, bounds);
    };
    let selected = selectFromMiddleCandidates(buildRouteCandidates(
      context.startOut,
      context.endOut,
      context.blockers,
      avoidedSegments,
      bounds,
      context.endpointNodeIds
    ));
    if (!selected) {
      selected = selectFromMiddleCandidates(buildExpandedRouteCandidates(
        context.startOut,
        context.endOut,
        context.blockers,
        bounds,
        context.endpointNodeIds
      ));
    }
    if (!selected) {
      continue;
    }
    const bends = routeBendCount(selected);
    const length = routeManhattanLength(selected);
    const score = scoreRoute(selected, filterBlockersForRoutePoints(selected, scoreBlockers), avoidedSegments);
    if (
      !best ||
      length < best.length ||
      (length === best.length && (bends < best.bends || (bends === best.bends && score < best.score)))
    ) {
      best = {
        edge: candidateEdge,
        route: { edgeId, points: selected, path: "" },
        bends,
        length,
        score
      };
    }
  }

  return best ? { edge: best.edge, route: best.route } : null;
}

export function prepareConnectionEdgeForCommit(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = [],
  options: ConnectionEdgeCommitOptions = {}
): PreparedConnectionEdgeCommit {
  const edge = edges.find((item) => item.id === edgeId);
  if (!edge) {
    const validation = validateConnectionEdgeRoute(nodes, edges, edgeId, bounds, previousRoutes);
    return { ...validation };
  }

  if (options.preserveManualRouteDisplay && edge.manualPoints?.length) {
    const route = routeEdgesForStoredRendering(nodes, [edge], bounds, { preserveManualRouteDisplay: true })[0];
    if (route) {
      const manualEdge = edgeWithCommitManualPoints(edge, route);
      const validation = validateConnectionEdgeRoute(nodes, [manualEdge], edgeId, bounds, previousRoutes);
      if (validation.ok) {
        return { ...validation, edge: manualEdge };
      }
    }
  }

  const edgeForDesign = edgeWithoutManualPoints(edge);
  const safeDesign = designCommitSafeRoute(nodes, [edgeForDesign], edgeId, bounds);
  if (safeDesign) {
    const safeEdge = edgeWithCommitManualPoints(safeDesign.edge, safeDesign.route);
    const safeValidation = validateConnectionEdgeRoute(nodes, [safeEdge], edgeId, bounds, previousRoutes);
    if (safeValidation.ok) {
      return { ...safeValidation, edge: safeEdge };
    }
  }

  const designedRoute = routeSingleConnectionForValidation(nodes, edgeForDesign, bounds);
  if (!designedRoute) {
    const validation = validateConnectionEdgeRoute(nodes, [edgeForDesign], edgeId, bounds, previousRoutes);
    return { ...validation };
  }

  const preparedEdge = edgeWithCommitManualPoints(edgeForDesign, designedRoute);
  const validation = validateConnectionEdgeRoute(nodes, [preparedEdge], edgeId, bounds, previousRoutes);
  if (validation.ok) {
    return { ...validation, edge: preparedEdge };
  }

  return { ...validation };
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

function routeBoundsForPoints(points: Point[], padding = 0) {
  let left = points[0].x;
  let right = points[0].x;
  let top = points[0].y;
  let bottom = points[0].y;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  return {
    left: left - padding,
    right: right + padding,
    top: top - padding,
    bottom: bottom + padding
  };
}

export type RouteBlockingCandidate = {
  node: ModelNode;
  box: ReturnType<typeof boxFor>;
};

export function getRouteBlockingCandidates(blockers: ModelNode[]): RouteBlockingCandidate[] {
  return blockers
    .filter(staticNodeParticipatesInRoutingAvoidance)
    .map((node) => ({ node, box: routeBlockerBox(node, ROUTE_BLOCKER_PADDING) }));
}

export function getRouteBlockingCandidateNodesFromBoxes(points: Point[], edge: Edge, candidates: RouteBlockingCandidate[]) {
  if (points.length < 2 || candidates.length === 0) {
    return [];
  }
  const routeBox = routeBoundsForPoints(points, ROUTE_BLOCKER_PADDING);
  return candidates
    .filter((candidate) =>
      candidate.node.id !== edge.sourceId &&
      candidate.node.id !== edge.targetId &&
      boxesOverlap(routeBox, candidate.box)
    )
    .map((candidate) => candidate.node);
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

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function createFloatingEndpointNode(point: Point, relatedNode?: ModelNode): ModelNode {
  const type = relatedNode?.terminals[0]?.type ?? "ac";
  return {
    id: `floating-${point.x}-${point.y}`,
    kind: type === "dc" ? "dc-bus" : type === "h2" ? "hydrogen-bus" : type === "heat" ? "heat-bus" : "ac-bus",
    name: "悬空端点",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: point,
    size: { width: 0, height: 0 },
    rotation: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    terminals: [{ id: "t1", label: "悬空端点", type, anchor: { x: 0, y: 0 }, nodeNumber: "" }],
    params: {}
  };
}

export function routeOrthogonalEdge(
  source: ModelNode,
  target: ModelNode,
  nodes: ModelNode[],
  edge?: Edge,
  avoidedSegments: Segment[] = [],
  bounds?: CanvasBounds,
  options: ManualRouteDisplayOptions = {}
): Point[] {
  const context = buildEdgeRoutingContext(source, target, nodes, edge);
  const manualRoute = resolveManualRouteForContext(
    source,
    target,
    context,
    edge?.manualPoints,
    avoidedSegments,
    bounds,
    options
  );
  if (manualRoute) {
    return manualRoute;
  }
  return selectRenderableRouteForContext(
    source,
    target,
    context,
    avoidedSegments,
    bounds
  );
}
