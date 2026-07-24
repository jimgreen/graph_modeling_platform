import {
  type AlignDirection,
  type AlignMode,
  calculateNodeBodyBounds,
  calculateNodeVisualBounds,
  ROUTABLE_LINE_SOURCE_NODE_PARAM,
  ROUTABLE_LINE_TARGET_NODE_PARAM,
  resetDeviceIndexesForPaste,
  type CanvasBounds,
  type Edge,
  type ModelGroup,
  type ModelNode,
  type Point,
  type RoutedEdge
} from "./model";
import { clampNumber } from "./canvasViewport";

export const CANVAS_EMPTY_SELECTION_MESSAGE = "当前没有被选中图元。";
const GROUP_LAYOUT_BOUNDS_PADDING = 4;

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

export type CanvasSelectionScope = "group" | "direct";

export type CanvasLayoutUnit = {
  id: string;
  kind: "group" | "node";
  nodeIds: string[];
  edgeIds: string[];
  bounds: SelectionRect;
  layoutBounds: SelectionRect;
};

export type BuildCanvasLayoutUnitsOptions = {
  isTransformableNode?: (node: ModelNode) => boolean;
  extraBoundsByNodeId?: ReadonlyMap<string, readonly SelectionRect[]>;
};

export const AUTO_ALIGN_DEFAULT_THRESHOLD_PX = 50;
export const AUTO_ALIGN_MIN_THRESHOLD_PX = 5;
export const AUTO_ALIGN_MAX_THRESHOLD_PX = 200;

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
  return calculateNodeVisualBounds(node);
}

function nodeLayoutBounds(node: ModelNode): SelectionRect {
  return calculateNodeBodyBounds(node);
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

export type DisplayLayerAction = "raise" | "lower" | "front" | "back";

function reorderDisplayLayerItems<T extends { id: string }>(
  items: readonly T[],
  selectedIdSet: ReadonlySet<string>,
  action: DisplayLayerAction
): T[] {
  const selected = (item: T) => selectedIdSet.has(item.id);
  let next = Array.from(items);
  if (action === "front") {
    next = [...next.filter((item) => !selected(item)), ...next.filter(selected)];
  } else if (action === "back") {
    next = [...next.filter(selected), ...next.filter((item) => !selected(item))];
  } else if (action === "raise") {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (selected(next[index]) && !selected(next[index + 1])) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      }
    }
  } else {
    for (let index = 1; index < next.length; index += 1) {
      if (selected(next[index]) && !selected(next[index - 1])) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      }
    }
  }
  return next;
}

function itemModelLayerId(item: { layerId?: unknown }) {
  return typeof item.layerId === "string" && item.layerId.trim() ? item.layerId : "__default_model_layer__";
}

export function reorderItemsByDisplayLayer<T extends { id: string }>(
  items: readonly T[],
  selectedIds: readonly string[],
  action: DisplayLayerAction
): T[] {
  const selectedIdSet = new Set(uniqueIds(selectedIds));
  if (selectedIdSet.size === 0 || !items.some((item) => selectedIdSet.has(item.id))) {
    return items as T[];
  }

  const hasModelLayerIds = items.some((item) => typeof (item as { layerId?: unknown }).layerId === "string");
  if (!hasModelLayerIds) {
    const reordered = reorderDisplayLayerItems(items, selectedIdSet, action);
    return reordered.every((item, index) => item === items[index]) ? items as T[] : reordered;
  }

  const groups = new Map<string, { indexes: number[]; items: T[] }>();
  items.forEach((item, index) => {
    const layerId = itemModelLayerId(item as { layerId?: unknown });
    const group = groups.get(layerId);
    if (group) {
      group.indexes.push(index);
      group.items.push(item);
    } else {
      groups.set(layerId, { indexes: [index], items: [item] });
    }
  });

  let changed = false;
  const next = Array.from(items);
  for (const group of groups.values()) {
    if (!group.items.some((item) => selectedIdSet.has(item.id))) {
      continue;
    }
    const reordered = reorderDisplayLayerItems(group.items, selectedIdSet, action);
    if (reordered.every((item, index) => item === group.items[index])) {
      continue;
    }
    changed = true;
    reordered.forEach((item, index) => {
      next[group.indexes[index]] = item;
    });
  }
  return changed ? next : items as T[];
}

function groupChildIds(group: ModelGroup) {
  return uniqueIds(group.childGroupIds ?? []);
}

function groupById(groups: readonly ModelGroup[]) {
  return new Map(groups.map((group) => [group.id, group]));
}

function collectGroupTreeMembers(
  group: ModelGroup,
  groupsById: ReadonlyMap<string, ModelGroup>,
  visiting = new Set<string>()
) {
  if (visiting.has(group.id)) {
    return { nodeIds: [] as string[], edgeIds: [] as string[], groupIds: [] as string[] };
  }
  visiting.add(group.id);
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  const groupIds: string[] = [];
  for (const childGroupId of groupChildIds(group)) {
    const childGroup = groupsById.get(childGroupId);
    if (!childGroup) {
      continue;
    }
    const childMembers = collectGroupTreeMembers(childGroup, groupsById, visiting);
    nodeIds.push(...childMembers.nodeIds);
    edgeIds.push(...childMembers.edgeIds);
    groupIds.push(...childMembers.groupIds);
  }
  nodeIds.push(...group.nodeIds);
  edgeIds.push(...group.edgeIds);
  groupIds.push(group.id);
  visiting.delete(group.id);
  return {
    nodeIds: uniqueIds(nodeIds),
    edgeIds: uniqueIds(edgeIds),
    groupIds: uniqueIds(groupIds)
  };
}

function groupIntersectsSelection(
  group: ModelGroup,
  groupsById: ReadonlyMap<string, ModelGroup>,
  selectedNodeIds: ReadonlySet<string>,
  selectedEdgeIds: ReadonlySet<string>
) {
  const members = collectGroupTreeMembers(group, groupsById);
  return members.nodeIds.some((id) => selectedNodeIds.has(id)) || members.edgeIds.some((id) => selectedEdgeIds.has(id));
}

function withChildGroupIds(group: Omit<ModelGroup, "childGroupIds">, childGroupIds: readonly string[] = []): ModelGroup {
  const ids = uniqueIds(childGroupIds);
  return ids.length > 0 ? { ...group, childGroupIds: ids } : group;
}

function groupsInChildFirstOrder(groups: readonly ModelGroup[]) {
  const byId = groupById(groups);
  const ordered: ModelGroup[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (group: ModelGroup) => {
    if (visited.has(group.id) || visiting.has(group.id)) {
      return;
    }
    visiting.add(group.id);
    for (const childGroupId of groupChildIds(group)) {
      const childGroup = byId.get(childGroupId);
      if (childGroup) {
        visit(childGroup);
      }
    }
    visiting.delete(group.id);
    visited.add(group.id);
    ordered.push(group);
  };
  groups.forEach(visit);
  return ordered;
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
  const groupsById = groupById(groups);
  let expanded = true;

  while (expanded) {
    expanded = false;
    for (const group of groups) {
      if (!groupIntersectsSelection(group, groupsById, nodeSelection, edgeSelection)) {
        continue;
      }
      const members = collectGroupTreeMembers(group, groupsById);
      for (const nodeId of members.nodeIds) {
        if (!nodeSelection.has(nodeId)) {
          nodeSelection.add(nodeId);
          nodeIds.push(nodeId);
          expanded = true;
        }
      }
      for (const edgeId of members.edgeIds) {
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

export function resolveCanvasSelection(
  groups: readonly ModelGroup[] = [],
  selectedNodeIds: readonly string[] = [],
  selectedEdgeIds: readonly string[] = [],
  scope: CanvasSelectionScope = "group"
) {
  if (scope === "direct") {
    return {
      nodeIds: uniqueIds(selectedNodeIds),
      edgeIds: uniqueIds(selectedEdgeIds)
    };
  }
  return expandSelectionByGroups(groups, selectedNodeIds, selectedEdgeIds);
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
  const selectedGroupIds = selectedCanvasGroupIds(groups, selectedNodeIds, selectedEdgeIds);
  const groupsById = groupById(groups);
  const expandedSelection = expandSelectionByGroups(groups, selectedNodeIds, selectedEdgeIds);
  const groupedNodeIds = new Set<string>();
  const groupedEdgeIds = new Set<string>();
  for (const selectedGroupId of selectedGroupIds) {
    const selectedGroup = groupsById.get(selectedGroupId);
    if (!selectedGroup) {
      continue;
    }
    const members = collectGroupTreeMembers(selectedGroup, groupsById);
    members.nodeIds.forEach((nodeId) => groupedNodeIds.add(nodeId));
    members.edgeIds.forEach((edgeId) => groupedEdgeIds.add(edgeId));
  }
  const nodeIds = expandedSelection.nodeIds.filter((nodeId) => !groupedNodeIds.has(nodeId));
  const edgeIds = expandedSelection.edgeIds.filter((edgeId) => !groupedEdgeIds.has(edgeId));
  if (selectedGroupIds.length + nodeIds.length + edgeIds.length < 2) {
    return { groups: [...groups], group: null as ModelGroup | null };
  }
  const group = withChildGroupIds({
    id: createGroupId(),
    name: nextGroupName(groups),
    nodeIds,
    edgeIds
  }, selectedGroupIds);
  return {
    groups: [...groups, group],
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
  const groupsById = groupById(groups);
  const selectedGroups = groups.filter((group) => groupIntersectsSelection(group, groupsById, selectedNodeSet, selectedEdgeSet));
  const selectedGroupIdSet = new Set(selectedGroups.map((group) => group.id));
  const selectedDescendantIds = new Set<string>();
  for (const group of selectedGroups) {
    for (const childGroupId of groupChildIds(group)) {
      const childGroup = groupsById.get(childGroupId);
      if (!childGroup) {
        continue;
      }
      const childMembers = collectGroupTreeMembers(childGroup, groupsById);
      childMembers.groupIds.forEach((groupId) => {
        if (selectedGroupIdSet.has(groupId)) {
          selectedDescendantIds.add(groupId);
        }
      });
    }
  }
  return selectedGroups
    .filter((group) => !selectedDescendantIds.has(group.id))
    .map((group) => group.id);
}

export function canvasGroupMemberNodeIds(groups: readonly ModelGroup[], groupIds: readonly string[]) {
  const groupsById = groupById(groups);
  const nodeIds: string[] = [];
  for (const groupId of uniqueIds(groupIds)) {
    const group = groupsById.get(groupId);
    if (!group) {
      continue;
    }
    nodeIds.push(...collectGroupTreeMembers(group, groupsById).nodeIds);
  }
  return uniqueIds(nodeIds);
}

function sameIdSet(firstIds: readonly string[], secondIds: readonly string[]) {
  if (firstIds.length !== secondIds.length) {
    return false;
  }
  const second = new Set(secondIds);
  return firstIds.every((id) => second.has(id));
}

export function canDissolveSingleCanvasGroupSelection(
  groups: readonly ModelGroup[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[]
) {
  const selectedGroupIds = selectedCanvasGroupIds(groups, selectedNodeIds, selectedEdgeIds);
  if (selectedGroupIds.length !== 1) {
    return false;
  }
  const groupsById = groupById(groups);
  const selectedGroup = groupsById.get(selectedGroupIds[0]);
  if (!selectedGroup) {
    return false;
  }
  const expandedSelection = expandSelectionByGroups(groups, selectedNodeIds, selectedEdgeIds);
  const groupMembers = collectGroupTreeMembers(selectedGroup, groupsById);
  return sameIdSet(expandedSelection.nodeIds, groupMembers.nodeIds) && sameIdSet(expandedSelection.edgeIds, groupMembers.edgeIds);
}

export function canGroupCanvasSelection(
  groups: readonly ModelGroup[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[]
) {
  return selectedNodeIds.length + selectedEdgeIds.length >= 2 &&
    !canDissolveSingleCanvasGroupSelection(groups, selectedNodeIds, selectedEdgeIds);
}

export function dissolveSelectedCanvasGroups(
  groups: readonly ModelGroup[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[]
) {
  if (!canDissolveSingleCanvasGroupSelection(groups, selectedNodeIds, selectedEdgeIds)) {
    return { groups: [...groups], removedGroupIds: [] };
  }
  const removedGroupIds = selectedCanvasGroupIds(groups, selectedNodeIds, selectedEdgeIds);
  const removed = new Set(removedGroupIds);
  return {
    groups: groups
      .filter((group) => !removed.has(group.id))
      .map((group) => withChildGroupIds({
        id: group.id,
        name: group.name,
        nodeIds: [...group.nodeIds],
        edgeIds: [...group.edgeIds]
      }, groupChildIds(group).filter((groupId) => !removed.has(groupId)))),
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
    const childGroupIds = groupChildIds(group);
    if (nodeIds.length + edgeIds.length + childGroupIds.length < 2) {
      return [];
    }
    return [withChildGroupIds({
      id: group.id,
      name: group.name,
      nodeIds,
      edgeIds
    }, childGroupIds)];
  });
}

export function buildCanvasClipboard(
  nodes: ModelNode[],
  edges: Edge[],
  routedEdges: RoutedEdge[],
  selectedNodeIds: string[],
  selectedEdgeIds: string[],
  groups: ModelGroup[] = [],
  options: { expandGroups?: boolean } = {}
): CanvasClipboard {
  const shouldExpandGroups = options.expandGroups !== false;
  const expandedSelection = resolveCanvasSelection(
    groups,
    selectedNodeIds,
    selectedEdgeIds,
    shouldExpandGroups ? "group" : "direct"
  );
  const nodeSelection = new Set(expandedSelection.nodeIds);
  const edgeSelection = new Set(expandedSelection.edgeIds);
  if (shouldExpandGroups) {
    for (const edge of edges) {
      if (nodeSelection.has(edge.sourceId) && nodeSelection.has(edge.targetId)) {
        edgeSelection.add(edge.id);
      }
    }
  }
  const routeByEdgeId = new Map(routedEdges.map((route) => [route.edgeId, route]));
  const groupsById = groupById(groups);
  const copiedGroups: ModelGroup[] = [];
  const copiedGroupIds = new Set<string>();
  for (const group of groupsInChildFirstOrder(groups)) {
    const childGroupIds = groupChildIds(group).filter((groupId) => copiedGroupIds.has(groupId));
    const validChildGroupIds = groupChildIds(group).filter((groupId) => groupsById.has(groupId));
    const groupMembers = collectGroupTreeMembers(group, groupsById);
    const groupNodeSet = new Set(groupMembers.nodeIds);
    const childNodeSets = validChildGroupIds.flatMap((groupId) => {
      const childGroup = groupsById.get(groupId);
      return childGroup ? [new Set(collectGroupTreeMembers(childGroup, groupsById).nodeIds)] : [];
    });
    const implicitGroupEdgeIds = shouldExpandGroups
      ? edges
          .filter((edge) =>
            edgeSelection.has(edge.id) &&
            groupNodeSet.has(edge.sourceId) &&
            groupNodeSet.has(edge.targetId) &&
            !childNodeSets.some((childNodeSet) => childNodeSet.has(edge.sourceId) && childNodeSet.has(edge.targetId))
          )
          .map((edge) => edge.id)
      : [];
    const groupEdgeIds = uniqueIds([...group.edgeIds, ...implicitGroupEdgeIds]).filter((edgeId) => edgeSelection.has(edgeId));
    const directMembersSelected =
      group.nodeIds.every((nodeId) => nodeSelection.has(nodeId)) &&
      group.edgeIds.every((edgeId) => edgeSelection.has(edgeId));
    const childGroupsSelected = validChildGroupIds.every((groupId) => copiedGroupIds.has(groupId));
    if (!directMembersSelected || !childGroupsSelected || group.nodeIds.length + group.edgeIds.length + childGroupIds.length < 2) {
      continue;
    }
    copiedGroupIds.add(group.id);
    copiedGroups.push(withChildGroupIds({
      id: group.id,
      name: group.name,
      nodeIds: [...group.nodeIds],
      edgeIds: groupEdgeIds
    }, childGroupIds));
  }
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
    groups: copiedGroups
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

function remapRoutableLineEndpointNodeRefs(
  params: Record<string, string>,
  idMap: ReadonlyMap<string, string>
): Record<string, string> {
  const nextParams = { ...params };
  const remapEndpointNodeParam = (paramName: string) => {
    const nextNodeId = idMap.get(nextParams[paramName]);
    if (nextNodeId) {
      nextParams[paramName] = nextNodeId;
    }
  };
  remapEndpointNodeParam(ROUTABLE_LINE_SOURCE_NODE_PARAM);
  remapEndpointNodeParam(ROUTABLE_LINE_TARGET_NODE_PARAM);
  return nextParams;
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
  for (const node of clipboard.nodes) {
    idMap.set(node.id, createNodeId());
  }
  const nodes = clipboard.nodes.map((node) => {
    const nextId = idMap.get(node.id)!;
    return resetDeviceIndexesForPaste({
      ...node,
      id: nextId,
      name: `${node.name} 副本`,
      position: { x: Math.round(node.position.x + dx), y: Math.round(node.position.y + dy) },
      params: remapRoutableLineEndpointNodeRefs(node.params, idMap),
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
  const groupIdMap = new Map<string, string>();
  const groups = groupsInChildFirstOrder(clipboard.groups).flatMap((group) => {
    const nodeIds = group.nodeIds.flatMap((nodeId) => idMap.get(nodeId) ?? []);
    const edgeIds = group.edgeIds.flatMap((edgeId) => edgeIdMap.get(edgeId) ?? []);
    const childGroupIds = groupChildIds(group).flatMap((groupId) => groupIdMap.get(groupId) ?? []);
    if (nodeIds.length + edgeIds.length + childGroupIds.length < 2) {
      return [];
    }
    const nextGroupId = createGroupId();
    groupIdMap.set(group.id, nextGroupId);
    return [withChildGroupIds({
      id: nextGroupId,
      name: `${group.name} 副本`,
      nodeIds,
      edgeIds
    }, childGroupIds)];
  });
  return { nodes, edges, groups };
}

function edgeStoredPoints(edge: Edge): Point[] {
  return [
    edge.sourcePoint,
    ...(edge.manualPoints ?? []),
    edge.targetPoint
  ].filter((point): point is Point => Boolean(point));
}

function boundsForNodesAndEdges(
  nodes: ModelNode[],
  edges: Edge[],
  routeByEdgeId: ReadonlyMap<string, RoutedEdge> = new Map(),
  nodeBounds: (node: ModelNode) => SelectionRect = nodeSelectionBounds
) {
  const boxes = nodes.map(nodeBounds);
  const edgePoints = edges.flatMap((edge) => routeByEdgeId.get(edge.id)?.points ?? edgeStoredPoints(edge));
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

function padSelectionRect(rect: SelectionRect, padding: number): SelectionRect {
  return {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding
  };
}

export function buildCanvasLayoutUnits(
  groups: readonly ModelGroup[],
  nodes: readonly ModelNode[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[],
  edges: readonly Edge[] = [],
  routedEdges: readonly RoutedEdge[] = [],
  options: BuildCanvasLayoutUnitsOptions = {}
): CanvasLayoutUnit[] {
  if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
    return [];
  }
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edgesById = new Map(edges.map((edge) => [edge.id, edge]));
  const routeByEdgeId = new Map(routedEdges.map((route) => [route.edgeId, route]));
  const groupsById = groupById(groups);
  const coveredNodeIds = new Set<string>();
  const units: CanvasLayoutUnit[] = [];
  for (const groupId of selectedCanvasGroupIds(groups, selectedNodeIds, selectedEdgeIds)) {
    const group = groupsById.get(groupId);
    if (!group) {
      continue;
    }
    const groupMembers = collectGroupTreeMembers(group, groupsById);
    const groupNodeIds = groupMembers.nodeIds.filter((nodeId) => {
      const node = nodesById.get(nodeId);
      return Boolean(node && (options.isTransformableNode?.(node) ?? true));
    });
    const groupNodeIdSet = new Set(groupNodeIds);
    const internalEdgeIds = edges
      .filter((edge) => groupNodeIdSet.has(edge.sourceId) && groupNodeIdSet.has(edge.targetId))
      .map((edge) => edge.id);
    const groupEdgeIds = uniqueIds([...groupMembers.edgeIds, ...internalEdgeIds]).filter((edgeId) => edgesById.has(edgeId));
    const groupEdges = groupEdgeIds.flatMap((edgeId) => edgesById.get(edgeId) ?? []);
    const extraGroupBounds = groupNodeIds.flatMap((nodeId) => options.extraBoundsByNodeId?.get(nodeId) ?? []);
    const bounds = boundsForNodesAndEdges(
      groupNodeIds.flatMap((nodeId) => nodesById.get(nodeId) ?? []),
      groupEdges,
      routeByEdgeId
    );
    const layoutBounds = boundsForNodesAndEdges(
      groupNodeIds.flatMap((nodeId) => nodesById.get(nodeId) ?? []),
      groupEdges,
      routeByEdgeId,
      nodeLayoutBounds
    );
    if (!bounds || !layoutBounds) {
      continue;
    }
    const visibleBounds = mergeSelectionRects([bounds, ...extraGroupBounds]) ?? bounds;
    groupNodeIds.forEach((nodeId) => coveredNodeIds.add(nodeId));
    units.push({
      id: `group:${group.id}`,
      kind: "group",
      nodeIds: groupNodeIds,
      edgeIds: groupEdgeIds,
      bounds: padSelectionRect(visibleBounds, GROUP_LAYOUT_BOUNDS_PADDING),
      layoutBounds: padSelectionRect(layoutBounds, GROUP_LAYOUT_BOUNDS_PADDING)
    });
  }
  for (const nodeId of uniqueIds(selectedNodeIds)) {
    if (coveredNodeIds.has(nodeId)) {
      continue;
    }
    const node = nodesById.get(nodeId);
    if (!node || !(options.isTransformableNode?.(node) ?? true)) {
      continue;
    }
    const visibleBounds = mergeSelectionRects([nodeSelectionBounds(node), ...(options.extraBoundsByNodeId?.get(node.id) ?? [])]) ?? nodeSelectionBounds(node);
    units.push({
      id: `node:${node.id}`,
      kind: "node",
      nodeIds: [node.id],
      edgeIds: [],
      bounds: visibleBounds,
      layoutBounds: nodeLayoutBounds(node)
    });
  }
  return units;
}

function unitLayoutBounds(unit: CanvasLayoutUnit) {
  return unit.layoutBounds ?? unit.bounds;
}

function unitCenter(unit: CanvasLayoutUnit, axis: "x" | "y") {
  const bounds = unitLayoutBounds(unit);
  return axis === "x"
    ? (bounds.left + bounds.right) / 2
    : (bounds.top + bounds.bottom) / 2;
}

function moveNodesByUnitDeltas(nodes: ModelNode[], units: readonly CanvasLayoutUnit[], deltas: ReadonlyMap<string, Point>) {
  const deltaByNodeId = new Map<string, Point>();
  for (const unit of units) {
    const delta = deltas.get(unit.id);
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      continue;
    }
    unit.nodeIds.forEach((nodeId) => deltaByNodeId.set(nodeId, delta));
  }
  if (deltaByNodeId.size === 0) {
    return nodes;
  }
  return nodes.map((node) => {
    const delta = deltaByNodeId.get(node.id);
    if (!delta) {
      return node;
    }
    return {
      ...node,
      position: {
        x: Math.round(node.position.x + delta.x),
        y: Math.round(node.position.y + delta.y)
      }
    };
  });
}

export function alignNodeLayoutUnits(nodes: ModelNode[], units: readonly CanvasLayoutUnit[], direction: AlignMode): ModelNode[] {
  if (units.length < 2) {
    return nodes;
  }
  const deltas = new Map<string, Point>();
  if (direction === "left" || direction === "right" || direction === "top" || direction === "bottom") {
    const alignedCoordinate =
      direction === "left"
        ? Math.min(...units.map((unit) => unitLayoutBounds(unit).left))
        : direction === "right"
          ? Math.max(...units.map((unit) => unitLayoutBounds(unit).right))
          : direction === "top"
            ? Math.min(...units.map((unit) => unitLayoutBounds(unit).top))
            : Math.max(...units.map((unit) => unitLayoutBounds(unit).bottom));
    for (const unit of units) {
      const bounds = unitLayoutBounds(unit);
      const delta =
        direction === "left"
          ? { x: alignedCoordinate - bounds.left, y: 0 }
          : direction === "right"
            ? { x: alignedCoordinate - bounds.right, y: 0 }
            : direction === "top"
              ? { x: 0, y: alignedCoordinate - bounds.top }
              : { x: 0, y: alignedCoordinate - bounds.bottom };
      deltas.set(unit.id, delta);
    }
    return moveNodesByUnitDeltas(nodes, units, deltas);
  }
  const axis = direction === "horizontal" ? "y" : "x";
  const average = units.reduce((sum, unit) => sum + unitCenter(unit, axis), 0) / units.length;
  const alignedCoordinate = Math.round(average);
  for (const unit of units) {
    deltas.set(unit.id, direction === "horizontal"
      ? { x: 0, y: alignedCoordinate - unitCenter(unit, "y") }
      : { x: alignedCoordinate - unitCenter(unit, "x"), y: 0 });
  }
  return moveNodesByUnitDeltas(nodes, units, deltas);
}

export function distributeNodeLayoutUnits(nodes: ModelNode[], units: readonly CanvasLayoutUnit[], direction: AlignDirection): ModelNode[] {
  if (units.length < 3) {
    return nodes;
  }
  const axis = direction === "horizontal" ? "x" : "y";
  const ordered = [...units].sort((first, second) => unitCenter(first, axis) - unitCenter(second, axis));
  const start = unitCenter(ordered[0], axis);
  const end = unitCenter(ordered[ordered.length - 1], axis);
  if (start === end) {
    return nodes;
  }
  const step = (end - start) / (ordered.length - 1);
  const deltas = new Map<string, Point>();
  ordered.forEach((unit, index) => {
    const target = Math.round(start + step * index);
    const current = unitCenter(unit, axis);
    deltas.set(unit.id, direction === "horizontal" ? { x: target - current, y: 0 } : { x: 0, y: target - current });
  });
  return moveNodesByUnitDeltas(nodes, units, deltas);
}

export function autoAlignNodeLayoutUnits(
  nodes: ModelNode[],
  units: readonly CanvasLayoutUnit[],
  threshold = AUTO_ALIGN_DEFAULT_THRESHOLD_PX
): ModelNode[] {
  const movableUnits = units.filter((unit) => unit.nodeIds.length > 0);
  const normalizedThreshold = Math.max(0, threshold);
  if (movableUnits.length < 2 || normalizedThreshold <= 0) {
    return nodes;
  }
  const deltas = new Map<string, Point>();
  const mergeDelta = (unitId: string, delta: Point) => {
    const current = deltas.get(unitId) ?? { x: 0, y: 0 };
    deltas.set(unitId, {
      x: current.x + delta.x,
      y: current.y + delta.y
    });
  };
  const collectAxisDeltas = (axis: "x" | "y") => {
    const ordered = movableUnits
      .map((unit, index) => ({ unit, index, center: unitCenter(unit, axis) }))
      .sort((first, second) => first.center - second.center || first.index - second.index);
    let cluster: typeof ordered = [];
    const flushCluster = () => {
      if (cluster.length < 2) {
        cluster = [];
        return;
      }
      const target = Math.round(cluster.reduce((sum, item) => sum + item.center, 0) / cluster.length);
      for (const item of cluster) {
        const offset = target - item.center;
        if (offset === 0) {
          continue;
        }
        mergeDelta(item.unit.id, axis === "x" ? { x: offset, y: 0 } : { x: 0, y: offset });
      }
      cluster = [];
    };

    for (const item of ordered) {
      if (cluster.length === 0) {
        cluster = [item];
        continue;
      }
      const previous = cluster[cluster.length - 1];
      if (Math.abs(item.center - previous.center) < normalizedThreshold) {
        cluster.push(item);
        continue;
      }
      flushCluster();
      cluster = [item];
    }
    flushCluster();
  };

  collectAxisDeltas("x");
  collectAxisDeltas("y");
  return deltas.size > 0 ? moveNodesByUnitDeltas(nodes, movableUnits, deltas) : nodes;
}

export type AutoSpreadNodeLayoutUnitsOptions = {
  padding?: number;
  maxIterations?: number;
  minSeparation?: number;
  bounds?: CanvasBounds;
  avoidRects?: readonly SelectionRect[];
};

function offsetRect(rect: SelectionRect, delta: Point): SelectionRect {
  return {
    left: rect.left + delta.x,
    right: rect.right + delta.x,
    top: rect.top + delta.y,
    bottom: rect.bottom + delta.y
  };
}

function padRect(rect: SelectionRect, padding: number): SelectionRect {
  return {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding
  };
}

function rectOverlap(first: SelectionRect, second: SelectionRect) {
  return {
    x: Math.min(first.right, second.right) - Math.max(first.left, second.left),
    y: Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
  };
}

function rectsOverlap(first: SelectionRect, second: SelectionRect) {
  const overlap = rectOverlap(first, second);
  return overlap.x > 0 && overlap.y > 0;
}

function rectCanvasOverflow(rect: SelectionRect, bounds: CanvasBounds | undefined) {
  if (!bounds) {
    return 0;
  }
  return Math.max(0, -rect.left) +
    Math.max(0, -rect.top) +
    Math.max(0, rect.right - bounds.width) +
    Math.max(0, rect.bottom - bounds.height);
}

function rectWidth(rect: SelectionRect) {
  return Math.max(1, rect.right - rect.left);
}

function rectHeight(rect: SelectionRect) {
  return Math.max(1, rect.bottom - rect.top);
}

function rectCenterPoint(rect: SelectionRect): Point {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  };
}

function boundsForRects(rects: readonly SelectionRect[]): SelectionRect {
  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    top: Math.min(...rects.map((rect) => rect.top)),
    bottom: Math.max(...rects.map((rect) => rect.bottom))
  };
}

function mergeSelectionRects(rects: readonly SelectionRect[]): SelectionRect | null {
  return rects.length > 0 ? boundsForRects(rects) : null;
}

function uniqueNearestValues(values: number[], limit: number) {
  const seen = new Set<number>();
  return values
    .map((value) => Math.round(value))
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    })
    .sort((first, second) => Math.abs(first) - Math.abs(second) || first - second)
    .slice(0, limit);
}

const SPREAD_GRID_CELL = 256;

// 已放置矩形的均匀网格索引:overlapsAny 与线性 rectOverlapsAny 结果完全一致(几何重叠、布尔判定),
// 仅把每次检查从 O(已放置数) 降到查询邻近格子。rects 按插入顺序保留 → 候选生成逻辑与顺序不变。
class PlacedRectGrid {
  readonly rects: SelectionRect[] = [];
  private readonly buckets = new Map<string, SelectionRect[]>();
  add(rect: SelectionRect): void {
    this.rects.push(rect);
    const x0 = Math.floor(rect.left / SPREAD_GRID_CELL);
    const x1 = Math.floor(rect.right / SPREAD_GRID_CELL);
    const y0 = Math.floor(rect.top / SPREAD_GRID_CELL);
    const y1 = Math.floor(rect.bottom / SPREAD_GRID_CELL);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const key = `${cx}:${cy}`;
        const bucket = this.buckets.get(key);
        if (bucket) {
          bucket.push(rect);
        } else {
          this.buckets.set(key, [rect]);
        }
      }
    }
  }
  overlapsAny(rect: SelectionRect): boolean {
    const x0 = Math.floor(rect.left / SPREAD_GRID_CELL);
    const x1 = Math.floor(rect.right / SPREAD_GRID_CELL);
    const y0 = Math.floor(rect.top / SPREAD_GRID_CELL);
    const y1 = Math.floor(rect.bottom / SPREAD_GRID_CELL);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cy = y0; cy <= y1; cy += 1) {
        const bucket = this.buckets.get(`${cx}:${cy}`);
        if (!bucket) {
          continue;
        }
        for (const candidate of bucket) {
          if (rectsOverlap(rect, candidate)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

function nearestNonOverlappingDelta(
  baseRect: SelectionRect,
  placedGrid: PlacedRectGrid,
  minSeparation: number,
  bounds: CanvasBounds | undefined
) {
  if (!placedGrid.overlapsAny(baseRect)) {
    return { x: 0, y: 0 };
  }
  const axisValueLimit = placedGrid.rects.length < 80 ? Math.max(1, placedGrid.rects.length * 2 + 1) : 48;
  const xValues = [0];
  const yValues = [0];
  for (const placed of placedGrid.rects) {
    xValues.push(placed.right - baseRect.left + minSeparation);
    xValues.push(placed.left - baseRect.right - minSeparation);
    yValues.push(placed.bottom - baseRect.top + minSeparation);
    yValues.push(placed.top - baseRect.bottom - minSeparation);
  }
  const candidateXValues = uniqueNearestValues(xValues, axisValueLimit);
  const candidateYValues = uniqueNearestValues(yValues, axisValueLimit);
  let bestDelta: Point | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const consider = (delta: Point) => {
    const rect = offsetRect(baseRect, delta);
    if (placedGrid.overlapsAny(rect)) {
      return;
    }
    const overflow = rectCanvasOverflow(rect, bounds);
    const score = overflow * 1_000_000 + delta.x * delta.x + delta.y * delta.y + (delta.x !== 0 && delta.y !== 0 ? 0.25 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestDelta = delta;
    }
  };

  for (const x of candidateXValues) {
    consider({ x, y: 0 });
  }
  for (const y of candidateYValues) {
    consider({ x: 0, y });
  }
  for (const x of candidateXValues) {
    for (const y of candidateYValues) {
      consider({ x, y });
    }
  }
  if (bestDelta) {
    return bestDelta;
  }

  const width = Math.max(1, baseRect.right - baseRect.left);
  const height = Math.max(1, baseRect.bottom - baseRect.top);
  const stepX = width + minSeparation;
  const stepY = height + minSeparation;
  const maxRing = Math.max(8, Math.ceil(Math.sqrt(placedGrid.rects.length)) + 8);
  for (let ring = 1; ring <= maxRing; ring += 1) {
    for (let ix = -ring; ix <= ring; ix += 1) {
      for (let iy = -ring; iy <= ring; iy += 1) {
        if (Math.max(Math.abs(ix), Math.abs(iy)) !== ring) {
          continue;
        }
        consider({ x: ix * stepX, y: iy * stepY });
      }
    }
    if (bestDelta) {
      return bestDelta;
    }
  }
  return { x: 0, y: 0 };
}

type AutoSpreadLayoutItem = {
  unit: CanvasLayoutUnit;
  index: number;
  baseRect: SelectionRect;
};

function buildOverlapComponents(items: readonly AutoSpreadLayoutItem[]) {
  const components: AutoSpreadLayoutItem[][] = [];
  const visited = new Set<number>();
  for (let index = 0; index < items.length; index += 1) {
    if (visited.has(index)) {
      continue;
    }
    const component: AutoSpreadLayoutItem[] = [];
    const stack = [index];
    visited.add(index);
    while (stack.length > 0) {
      const currentIndex = stack.pop()!;
      const current = items[currentIndex];
      component.push(current);
      for (let nextIndex = 0; nextIndex < items.length; nextIndex += 1) {
        if (visited.has(nextIndex)) {
          continue;
        }
        if (rectsOverlap(current.baseRect, items[nextIndex].baseRect)) {
          visited.add(nextIndex);
          stack.push(nextIndex);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function clampSpreadOrigin(value: number, size: number, limit: number | undefined) {
  if (limit === undefined || size >= limit) {
    return Math.round(value);
  }
  return Math.round(clampNumber(value, 0, limit - size));
}

function balancedGridShape(component: readonly AutoSpreadLayoutItem[], minSeparation: number, bounds: CanvasBounds | undefined) {
  const count = component.length;
  const maxWidth = Math.max(...component.map((item) => rectWidth(item.baseRect)));
  const maxHeight = Math.max(...component.map((item) => rectHeight(item.baseRect)));
  const targetAspect = bounds ? clampNumber(bounds.width / Math.max(1, bounds.height), 0.75, 1.5) : 1;
  let best = {
    columns: 1,
    rows: count,
    gridWidth: maxWidth,
    gridHeight: count * maxHeight + (count - 1) * minSeparation,
    score: Number.POSITIVE_INFINITY
  };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const gridWidth = columns * maxWidth + (columns - 1) * minSeparation;
    const gridHeight = rows * maxHeight + (rows - 1) * minSeparation;
    const aspect = gridWidth / Math.max(1, gridHeight);
    const emptyCells = columns * rows - count;
    const score =
      Math.abs(Math.log(aspect / targetAspect)) +
      (emptyCells / count) * 0.12 +
      Math.abs(columns - rows) * 0.01;
    if (score < best.score) {
      best = { columns, rows, gridWidth, gridHeight, score };
    }
  }
  return { ...best, maxWidth, maxHeight };
}

function balancedGridDeltasForComponent(
  component: readonly AutoSpreadLayoutItem[],
  placedGrid: PlacedRectGrid,
  minSeparation: number,
  bounds: CanvasBounds | undefined
) {
  const shape = balancedGridShape(component, minSeparation, bounds);
  const componentBounds = boundsForRects(component.map((item) => item.baseRect));
  const componentCenter = rectCenterPoint(componentBounds);
  const origin = {
    x: clampSpreadOrigin(componentCenter.x - shape.gridWidth / 2, shape.gridWidth, bounds?.width),
    y: clampSpreadOrigin(componentCenter.y - shape.gridHeight / 2, shape.gridHeight, bounds?.height)
  };
  const ordered = [...component].sort((first, second) =>
    first.baseRect.top - second.baseRect.top ||
    first.baseRect.left - second.baseRect.left ||
    first.index - second.index
  );
  const proposedRects = ordered.map((item, index) => {
    const column = index % shape.columns;
    const row = Math.floor(index / shape.columns);
    const width = rectWidth(item.baseRect);
    const height = rectHeight(item.baseRect);
    const left = origin.x + column * (shape.maxWidth + minSeparation) + (shape.maxWidth - width) / 2;
    const top = origin.y + row * (shape.maxHeight + minSeparation) + (shape.maxHeight - height) / 2;
    return {
      left: Math.round(left),
      right: Math.round(left + width),
      top: Math.round(top),
      bottom: Math.round(top + height)
    };
  });
  const clusterDelta = nearestNonOverlappingDelta(
    boundsForRects(proposedRects),
    placedGrid,
    minSeparation,
    bounds
  );
  const deltas = new Map<string, Point>();
  const rects: SelectionRect[] = [];
  ordered.forEach((item, index) => {
    const finalRect = offsetRect(proposedRects[index], clusterDelta);
    const from = rectCenterPoint(item.baseRect);
    const to = rectCenterPoint(finalRect);
    const delta = {
      x: Math.round(to.x - from.x),
      y: Math.round(to.y - from.y)
    };
    if (delta.x !== 0 || delta.y !== 0) {
      deltas.set(item.unit.id, delta);
    }
    rects.push(finalRect);
  });
  return { deltas, rects };
}

export function autoSpreadNodeLayoutUnits(
  nodes: ModelNode[],
  units: readonly CanvasLayoutUnit[],
  options: AutoSpreadNodeLayoutUnitsOptions = {}
): ModelNode[] {
  const movableUnits = units.filter((unit) => unit.nodeIds.length > 0);
  if (movableUnits.length < 2) {
    return nodes;
  }
  const padding = Math.max(0, options.padding ?? 4);
  const minSeparation = Math.max(1, options.minSeparation ?? 1);
  const orderedUnits = movableUnits
    .map((unit, index) => ({ unit, index }))
    .sort((first, second) =>
      first.unit.bounds.top - second.unit.bounds.top ||
      first.unit.bounds.left - second.unit.bounds.left ||
      first.index - second.index
    );
  const layoutItems = orderedUnits.map((item) => ({
    ...item,
    baseRect: padRect(item.unit.bounds, padding)
  }));
  const components = buildOverlapComponents(layoutItems);
  const orderedComponents = [
    ...components.filter((component) => component.length === 1),
    ...components.filter((component) => component.length > 1)
  ].sort((first, second) => {
    const firstBounds = boundsForRects(first.map((item) => item.baseRect));
    const secondBounds = boundsForRects(second.map((item) => item.baseRect));
    const firstSingleton = first.length === 1 ? 0 : 1;
    const secondSingleton = second.length === 1 ? 0 : 1;
    return firstSingleton - secondSingleton ||
      firstBounds.top - secondBounds.top ||
      firstBounds.left - secondBounds.left;
  });
  const placed = new PlacedRectGrid();
  for (const avoidRect of options.avoidRects ?? []) {
    placed.add(padRect(avoidRect, padding));
  }
  const deltas = new Map<string, Point>();
  for (const component of orderedComponents) {
    if (component.length >= 4) {
      const gridLayout = balancedGridDeltasForComponent(component, placed, minSeparation, options.bounds);
      for (const [unitId, delta] of gridLayout.deltas) {
        deltas.set(unitId, delta);
      }
      for (const rect of gridLayout.rects) {
        placed.add(rect);
      }
      continue;
    }
    for (const item of component) {
      const delta = nearestNonOverlappingDelta(item.baseRect, placed, minSeparation, options.bounds);
      placed.add(offsetRect(item.baseRect, delta));
      if (delta.x !== 0 || delta.y !== 0) {
        deltas.set(item.unit.id, delta);
      }
    }
  }
  return deltas.size > 0 ? moveNodesByUnitDeltas(nodes, movableUnits, deltas) : nodes;
}
