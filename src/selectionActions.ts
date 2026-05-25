import {
  getNodeScaleX,
  getNodeScaleY,
  resetDeviceIndexesForPaste,
  type Edge,
  type ModelNode,
  type Point,
  type RoutedEdge
} from "./model";

export const CANVAS_EMPTY_SELECTION_MESSAGE = "当前没有被选中图元。";

type CanvasDeleteActionInput = {
  selectedNodeCount: number;
  hasSelectedEdge: boolean;
};

export type CanvasDeleteAction =
  | { kind: "delete" }
  | { kind: "warn"; message: string };

export function resolveCanvasDeleteAction(input: CanvasDeleteActionInput): CanvasDeleteAction {
  if (input.selectedNodeCount > 0 || input.hasSelectedEdge) {
    return { kind: "delete" };
  }
  return { kind: "warn", message: CANVAS_EMPTY_SELECTION_MESSAGE };
}

export type SelectionRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type CanvasClipboardEdge = {
  edge: Edge;
  routePoints: Point[];
};

export type CanvasClipboard = {
  nodes: ModelNode[];
  edges: CanvasClipboardEdge[];
};

export const EMPTY_CANVAS_CLIPBOARD: CanvasClipboard = {
  nodes: [],
  edges: []
};

function normalizedRect(rect: SelectionRect): SelectionRect {
  return {
    left: Math.min(rect.left, rect.right),
    right: Math.max(rect.left, rect.right),
    top: Math.min(rect.top, rect.bottom),
    bottom: Math.max(rect.top, rect.bottom)
  };
}

function pointInRect(point: Point, rect: SelectionRect) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function rectContainsRect(outer: SelectionRect, inner: SelectionRect) {
  return inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
}

function nodeSelectionBounds(node: ModelNode): SelectionRect {
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const visualHalfWidth = halfWidth * cos + halfHeight * sin;
  const visualHalfHeight = halfWidth * sin + halfHeight * cos;
  return {
    left: node.position.x - visualHalfWidth,
    right: node.position.x + visualHalfWidth,
    top: node.position.y - visualHalfHeight,
    bottom: node.position.y + visualHalfHeight
  };
}

function routeContainedInRect(points: Point[], rect: SelectionRect) {
  return points.length > 0 && points.every((point) => pointInRect(point, rect));
}

export function selectGraphicsInRect(nodes: ModelNode[], routedEdges: RoutedEdge[], rect: SelectionRect) {
  const selectionRect = normalizedRect(rect);
  return {
    nodeIds: nodes
      .filter((node) => rectContainsRect(selectionRect, nodeSelectionBounds(node)))
      .map((node) => node.id),
    edgeIds: routedEdges
      .filter((route) => routeContainedInRect(route.points, selectionRect))
      .map((route) => route.edgeId)
  };
}

export function buildCanvasClipboard(
  nodes: ModelNode[],
  edges: Edge[],
  routedEdges: RoutedEdge[],
  selectedNodeIds: string[],
  selectedEdgeIds: string[]
): CanvasClipboard {
  const nodeSelection = new Set(selectedNodeIds);
  const edgeSelection = new Set(selectedEdgeIds);
  const routeByEdgeId = new Map(routedEdges.map((route) => [route.edgeId, route]));
  return {
    nodes: nodes
      .filter((node) => nodeSelection.has(node.id))
      .map((node) => ({
        ...node,
        size: { ...node.size },
        position: { ...node.position },
        params: { ...node.params },
        terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
      })),
    edges: edges
      .filter((edge) => edgeSelection.has(edge.id))
      .map((edge) => ({
        edge: {
          ...edge,
          sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
          targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
          manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
        },
        routePoints: (routeByEdgeId.get(edge.id)?.points ?? [
          edge.sourcePoint,
          ...(edge.manualPoints ?? []),
          edge.targetPoint
        ].filter((point): point is Point => Boolean(point))).map((point) => ({ ...point }))
      }))
  };
}

export function canvasClipboardBounds(clipboard: CanvasClipboard): SelectionRect | null {
  const boxes = clipboard.nodes.map(nodeSelectionBounds);
  const edgePoints = clipboard.edges.flatMap((item) => item.routePoints);
  if (edgePoints.length > 0) {
    boxes.push({
      left: Math.min(...edgePoints.map((point) => point.x)),
      right: Math.max(...edgePoints.map((point) => point.x)),
      top: Math.min(...edgePoints.map((point) => point.y)),
      bottom: Math.max(...edgePoints.map((point) => point.y))
    });
  }
  if (boxes.length === 0) {
    return null;
  }
  return {
    left: Math.min(...boxes.map((box) => box.left)),
    right: Math.max(...boxes.map((box) => box.right)),
    top: Math.min(...boxes.map((box) => box.top)),
    bottom: Math.max(...boxes.map((box) => box.bottom))
  };
}

function offsetPoint(point: Point | undefined, dx: number, dy: number): Point | undefined {
  return point ? { x: Math.round(point.x + dx), y: Math.round(point.y + dy) } : undefined;
}

export function cloneCanvasClipboard(
  clipboard: CanvasClipboard,
  targetTopLeft: Point,
  createNodeId: () => string,
  createEdgeId: () => string
) {
  const bounds = canvasClipboardBounds(clipboard);
  if (!bounds) {
    return { nodes: [], edges: [] };
  }
  const dx = targetTopLeft.x - bounds.left;
  const dy = targetTopLeft.y - bounds.top;
  const idMap = new Map<string, string>();
  const nodes = clipboard.nodes.map((node) => {
    const nextId = createNodeId();
    idMap.set(node.id, nextId);
    return resetDeviceIndexesForPaste({
      ...node,
      id: nextId,
      name: `${node.name} 副本`,
      position: { x: Math.round(node.position.x + dx), y: Math.round(node.position.y + dy) },
      params: { ...node.params },
      terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
    });
  });
  const edges = clipboard.edges.flatMap(({ edge, routePoints }) => {
    const sourceCopied = idMap.has(edge.sourceId);
    const targetCopied = idMap.has(edge.targetId);
    if (!sourceCopied || !targetCopied) {
      return [];
    }
    const firstRoutePoint = routePoints[0];
    const lastRoutePoint = routePoints[routePoints.length - 1];
    return [{
      ...edge,
      id: createEdgeId(),
      sourceId: idMap.get(edge.sourceId)!,
      targetId: idMap.get(edge.targetId)!,
      sourceTerminalId: edge.sourceTerminalId,
      targetTerminalId: edge.targetTerminalId,
      sourcePoint: offsetPoint(edge.sourcePoint ?? firstRoutePoint, dx, dy),
      targetPoint: offsetPoint(edge.targetPoint ?? lastRoutePoint, dx, dy),
      manualPoints: routePoints.slice(1, -1).map((point) => offsetPoint(point, dx, dy)!)
    }];
  });
  return { nodes, edges };
}
