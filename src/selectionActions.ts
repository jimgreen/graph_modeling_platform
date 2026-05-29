import {
  getNodeScaleX,
  getNodeScaleY,
  resetDeviceIndexesForPaste,
  type Edge,
  type ModelGroup,
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
  groups: ModelGroup[];
};

export const EMPTY_CANVAS_CLIPBOARD: CanvasClipboard = {
  nodes: [],
  edges: [],
  groups: []
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

function uniqueIds(ids: readonly string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function groupIntersectsSelection(group: ModelGroup, selectedNodeIds: ReadonlySet<string>, selectedEdgeIds: ReadonlySet<string>) {
  return group.nodeIds.some((id) => selectedNodeIds.has(id)) || group.edgeIds.some((id) => selectedEdgeIds.has(id));
}

export function expandSelectionByGroups(
  groups: readonly ModelGroup[] = [],
  selectedNodeIds: readonly string[] = [],
  selectedEdgeIds: readonly string[] = []
) {
  const nodeIds = uniqueIds(selectedNodeIds);
  const edgeIds = uniqueIds(selectedEdgeIds);
  const nodeSelection = new Set(nodeIds);
  const edgeSelection = new Set(edgeIds);
  let expanded = true;

  while (expanded) {
    expanded = false;
    for (const group of groups) {
      if (!groupIntersectsSelection(group, nodeSelection, edgeSelection)) {
        continue;
      }
      for (const nodeId of group.nodeIds) {
        if (!nodeSelection.has(nodeId)) {
          nodeSelection.add(nodeId);
          nodeIds.push(nodeId);
          expanded = true;
        }
      }
      for (const edgeId of group.edgeIds) {
        if (!edgeSelection.has(edgeId)) {
          edgeSelection.add(edgeId);
          edgeIds.push(edgeId);
          expanded = true;
        }
      }
    }
  }

  return { nodeIds, edgeIds };
}

function nextGroupName(groups: readonly ModelGroup[]) {
  const used = new Set(groups.map((group) => group.name));
  let index = 1;
  while (used.has(`组合${index}`)) {
    index += 1;
  }
  return `组合${index}`;
}

export function createCanvasGroupFromSelection(
  groups: readonly ModelGroup[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[],
  createGroupId: () => string
) {
  const expandedSelection = expandSelectionByGroups(groups, selectedNodeIds, selectedEdgeIds);
  if (expandedSelection.nodeIds.length + expandedSelection.edgeIds.length < 2) {
    return { groups: [...groups], group: null as ModelGroup | null };
  }
  const selectedNodeSet = new Set(expandedSelection.nodeIds);
  const selectedEdgeSet = new Set(expandedSelection.edgeIds);
  const retainedGroups = groups.filter((group) => !groupIntersectsSelection(group, selectedNodeSet, selectedEdgeSet));
  const group: ModelGroup = {
    id: createGroupId(),
    name: nextGroupName(retainedGroups),
    nodeIds: expandedSelection.nodeIds,
    edgeIds: expandedSelection.edgeIds
  };
  return {
    groups: [...retainedGroups, group],
    group
  };
}

export function selectedCanvasGroupIds(
  groups: readonly ModelGroup[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[]
) {
  const selectedNodeSet = new Set(selectedNodeIds);
  const selectedEdgeSet = new Set(selectedEdgeIds);
  return groups
    .filter((group) => groupIntersectsSelection(group, selectedNodeSet, selectedEdgeSet))
    .map((group) => group.id);
}

export function dissolveSelectedCanvasGroups(
  groups: readonly ModelGroup[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[]
) {
  const removedGroupIds = selectedCanvasGroupIds(groups, selectedNodeIds, selectedEdgeIds);
  const removed = new Set(removedGroupIds);
  return {
    groups: groups.filter((group) => !removed.has(group.id)),
    removedGroupIds
  };
}

export function removeGraphicsFromGroups(
  groups: readonly ModelGroup[],
  removedNodeIds: Iterable<string>,
  removedEdgeIds: Iterable<string>
) {
  const removedNodes = new Set(removedNodeIds);
  const removedEdges = new Set(removedEdgeIds);
  return groups.flatMap((group) => {
    const nodeIds = group.nodeIds.filter((nodeId) => !removedNodes.has(nodeId));
    const edgeIds = group.edgeIds.filter((edgeId) => !removedEdges.has(edgeId));
    if (nodeIds.length + edgeIds.length < 2) {
      return [];
    }
    return [{ ...group, nodeIds, edgeIds }];
  });
}

export function buildCanvasClipboard(
  nodes: ModelNode[],
  edges: Edge[],
  routedEdges: RoutedEdge[],
  selectedNodeIds: string[],
  selectedEdgeIds: string[],
  groups: ModelGroup[] = []
): CanvasClipboard {
  const expandedSelection = expandSelectionByGroups(groups, selectedNodeIds, selectedEdgeIds);
  const nodeSelection = new Set(expandedSelection.nodeIds);
  const edgeSelection = new Set(expandedSelection.edgeIds);
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
      })),
    groups: groups
      .filter((group) =>
        group.nodeIds.every((nodeId) => nodeSelection.has(nodeId)) &&
        group.edgeIds.every((edgeId) => edgeSelection.has(edgeId))
      )
      .map((group) => ({
        ...group,
        nodeIds: [...group.nodeIds],
        edgeIds: [...group.edgeIds]
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
  createEdgeId: () => string,
  createGroupId: () => string = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
) {
  const bounds = canvasClipboardBounds(clipboard);
  if (!bounds) {
    return { nodes: [], edges: [], groups: [] };
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
  const edgeIdMap = new Map<string, string>();
  const edges = clipboard.edges.flatMap(({ edge, routePoints }) => {
    const sourceCopied = idMap.has(edge.sourceId);
    const targetCopied = idMap.has(edge.targetId);
    if (!sourceCopied || !targetCopied) {
      return [];
    }
    const nextEdgeId = createEdgeId();
    edgeIdMap.set(edge.id, nextEdgeId);
    const firstRoutePoint = routePoints[0];
    const lastRoutePoint = routePoints[routePoints.length - 1];
    return [{
      ...edge,
      id: nextEdgeId,
      sourceId: idMap.get(edge.sourceId)!,
      targetId: idMap.get(edge.targetId)!,
      sourceTerminalId: edge.sourceTerminalId,
      targetTerminalId: edge.targetTerminalId,
      sourcePoint: offsetPoint(edge.sourcePoint ?? firstRoutePoint, dx, dy),
      targetPoint: offsetPoint(edge.targetPoint ?? lastRoutePoint, dx, dy),
      manualPoints: routePoints.slice(1, -1).map((point) => offsetPoint(point, dx, dy)!)
    }];
  });
  const groups = clipboard.groups.flatMap((group) => {
    const nodeIds = group.nodeIds.flatMap((nodeId) => idMap.get(nodeId) ?? []);
    const edgeIds = group.edgeIds.flatMap((edgeId) => edgeIdMap.get(edgeId) ?? []);
    if (nodeIds.length + edgeIds.length < 2) {
      return [];
    }
    return [{
      id: createGroupId(),
      name: `${group.name} 副本`,
      nodeIds,
      edgeIds
    }];
  });
  return { nodes, edges, groups };
}
