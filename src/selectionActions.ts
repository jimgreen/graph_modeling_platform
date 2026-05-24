import {
  getNodeScaleX,
  getNodeScaleY,
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

function rectsIntersect(first: SelectionRect, second: SelectionRect) {
  return first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
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

function segmentIntersectsRect(a: Point, b: Point, rect: SelectionRect) {
  if (pointInRect(a, rect) || pointInRect(b, rect)) {
    return true;
  }
  if (a.y === b.y) {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return a.y >= rect.top && a.y <= rect.bottom && right >= rect.left && left <= rect.right;
  }
  if (a.x === b.x) {
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return a.x >= rect.left && a.x <= rect.right && bottom >= rect.top && top <= rect.bottom;
  }
  const segmentBounds = {
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y)
  };
  return rectsIntersect(segmentBounds, rect);
}

function routeIntersectsRect(points: Point[], rect: SelectionRect) {
  for (let index = 1; index < points.length; index += 1) {
    if (segmentIntersectsRect(points[index - 1], points[index], rect)) {
      return true;
    }
  }
  return false;
}

export function selectGraphicsInRect(nodes: ModelNode[], routedEdges: RoutedEdge[], rect: SelectionRect) {
  const selectionRect = normalizedRect(rect);
  return {
    nodeIds: nodes
      .filter((node) => rectsIntersect(nodeSelectionBounds(node), selectionRect))
      .map((node) => node.id),
    edgeIds: routedEdges
      .filter((route) => routeIntersectsRect(route.points, selectionRect))
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
    const params = { ...node.params };
    delete params.idx;
    return {
      ...node,
      id: nextId,
      name: `${node.name} 副本`,
      position: { x: Math.round(node.position.x + dx), y: Math.round(node.position.y + dy) },
      params,
      terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
    };
  });
  const edges = clipboard.edges.map(({ edge, routePoints }) => {
    const sourceCopied = idMap.has(edge.sourceId);
    const targetCopied = idMap.has(edge.targetId);
    const firstRoutePoint = routePoints[0];
    const lastRoutePoint = routePoints[routePoints.length - 1];
    return {
      ...edge,
      id: createEdgeId(),
      sourceId: sourceCopied ? idMap.get(edge.sourceId)! : "",
      targetId: targetCopied ? idMap.get(edge.targetId)! : "",
      sourceTerminalId: sourceCopied ? edge.sourceTerminalId : undefined,
      targetTerminalId: targetCopied ? edge.targetTerminalId : undefined,
      sourcePoint: sourceCopied ? offsetPoint(edge.sourcePoint, dx, dy) : offsetPoint(firstRoutePoint, dx, dy),
      targetPoint: targetCopied ? offsetPoint(edge.targetPoint, dx, dy) : offsetPoint(lastRoutePoint, dx, dy),
      manualPoints: routePoints.slice(1, -1).map((point) => offsetPoint(point, dx, dy)!)
    };
  });
  return { nodes, edges };
}
