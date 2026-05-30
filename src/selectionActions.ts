import {
  type AlignDirection,
  type AlignMode,
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

export type CanvasSelectionScope = "group" | "direct";

export type CanvasLayoutUnit = {
  id: string;
  kind: "group" | "node";
  nodeIds: string[];
  bounds: SelectionRect;
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
  const expandedSelection = resolveCanvasSelection(
    groups,
    selectedNodeIds,
    selectedEdgeIds,
    options.expandGroups === false ? "direct" : "group"
  );
  const nodeSelection = new Set(expandedSelection.nodeIds);
  const edgeSelection = new Set(expandedSelection.edgeIds);
  const routeByEdgeId = new Map(routedEdges.map((route) => [route.edgeId, route]));
  const groupsById = groupById(groups);
  const copiedGroups: ModelGroup[] = [];
  const copiedGroupIds = new Set<string>();
  for (const group of groupsInChildFirstOrder(groups)) {
    const childGroupIds = groupChildIds(group).filter((groupId) => copiedGroupIds.has(groupId));
    const validChildGroupIds = groupChildIds(group).filter((groupId) => groupsById.has(groupId));
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
      edgeIds: [...group.edgeIds]
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

function boundsForNodesAndEdges(nodes: ModelNode[], edges: Edge[]) {
  const boxes = nodes.map(nodeSelectionBounds);
  const edgePoints = edges.flatMap(edgeStoredPoints);
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

export function buildCanvasLayoutUnits(
  groups: readonly ModelGroup[],
  nodes: readonly ModelNode[],
  selectedNodeIds: readonly string[],
  selectedEdgeIds: readonly string[],
  edges: readonly Edge[] = []
): CanvasLayoutUnit[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edgesById = new Map(edges.map((edge) => [edge.id, edge]));
  const groupsById = groupById(groups);
  const coveredNodeIds = new Set<string>();
  const units: CanvasLayoutUnit[] = [];
  for (const groupId of selectedCanvasGroupIds(groups, selectedNodeIds, selectedEdgeIds)) {
    const group = groupsById.get(groupId);
    if (!group) {
      continue;
    }
    const groupMembers = collectGroupTreeMembers(group, groupsById);
    const groupNodeIds = groupMembers.nodeIds.filter((nodeId) => nodesById.has(nodeId));
    const groupEdges = groupMembers.edgeIds.flatMap((edgeId) => edgesById.get(edgeId) ?? []);
    const bounds = boundsForNodesAndEdges(
      groupNodeIds.flatMap((nodeId) => nodesById.get(nodeId) ?? []),
      groupEdges
    );
    if (!bounds) {
      continue;
    }
    groupNodeIds.forEach((nodeId) => coveredNodeIds.add(nodeId));
    units.push({
      id: `group:${group.id}`,
      kind: "group",
      nodeIds: groupNodeIds,
      bounds
    });
  }
  for (const nodeId of uniqueIds(selectedNodeIds)) {
    if (coveredNodeIds.has(nodeId)) {
      continue;
    }
    const node = nodesById.get(nodeId);
    if (!node) {
      continue;
    }
    units.push({
      id: `node:${node.id}`,
      kind: "node",
      nodeIds: [node.id],
      bounds: nodeSelectionBounds(node)
    });
  }
  return units;
}

function unitCenter(unit: CanvasLayoutUnit, axis: "x" | "y") {
  return axis === "x"
    ? (unit.bounds.left + unit.bounds.right) / 2
    : (unit.bounds.top + unit.bounds.bottom) / 2;
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
        ? Math.min(...units.map((unit) => unit.bounds.left))
        : direction === "right"
          ? Math.max(...units.map((unit) => unit.bounds.right))
          : direction === "top"
            ? Math.min(...units.map((unit) => unit.bounds.top))
            : Math.max(...units.map((unit) => unit.bounds.bottom));
    for (const unit of units) {
      const delta =
        direction === "left"
          ? { x: alignedCoordinate - unit.bounds.left, y: 0 }
          : direction === "right"
            ? { x: alignedCoordinate - unit.bounds.right, y: 0 }
            : direction === "top"
              ? { x: 0, y: alignedCoordinate - unit.bounds.top }
              : { x: 0, y: alignedCoordinate - unit.bounds.bottom };
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
