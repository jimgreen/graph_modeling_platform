import {
  type AlignDirection,
  type AlignMode,
  calculateNodeBodyBounds,
  calculateNodeVisualBounds,
  getEdgeEndpointPoint,
  isBusNode,
  isCanvasNodeMovable,
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
import { containerMemberNodes, isAcContainerNode } from "./acContainer";

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
  collisionRects: SelectionRect[];
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
      .map((node) => {
        const copy: ModelNode = {
          ...node,
          size: { ...node.size },
          position: { ...node.position },
          params: { ...node.params },
          terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
        };
        // 副本不继承归属:粘贴后容器与成员的 id 全换,继承来的 containerId 恒悬空(跨模型粘贴更是必然)
        delete copy.containerId;
        // 容器副本的绑定同样失效(绑的是原图设备 id):清绑定 + 关口置 0,避免粘贴出「开着口的空绑定」
        if (isAcContainerNode(node)) {
          delete copy.params.bound_device_id;
          copy.params.is_gateway = "0";
        }
        return copy;
      }),
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
    const copy: ModelNode = resetDeviceIndexesForPaste({
      ...node,
      id: nextId,
      name: `${node.name} 副本`,
      position: { x: Math.round(node.position.x + dx), y: Math.round(node.position.y + dy) },
      params: remapRoutableLineEndpointNodeRefs(node.params, idMap),
      terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
    });
    // 归属/绑定剥离的最后一关:粘贴、模板落点、以及**存量已持久化模板**(剪贴板 JSON 早于本功能落库,
    // 构建期剥离对它无效)全部经此克隆。与 buildCanvasClipboard 处同款,重复执行是幂等的(删已删的键、
    // 关口再置一次 "0"),不会双剥出 bug;副本 id 全换,继承来的归属与绑定恒悬空。
    delete copy.containerId;
    if (isAcContainerNode(node)) {
      delete copy.params.bound_device_id;
      copy.params.is_gateway = "0";
    }
    return copy;
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
    const groupNodes = groupNodeIds.flatMap((nodeId) => nodesById.get(nodeId) ?? []);
    const extraGroupBounds = groupNodeIds.flatMap((nodeId) => options.extraBoundsByNodeId?.get(nodeId) ?? []);
    const collisionRects = groupNodeIds.flatMap((nodeId) => {
      const node = nodesById.get(nodeId);
      return node ? [nodeSelectionBounds(node), ...(options.extraBoundsByNodeId?.get(nodeId) ?? [])] : [];
    });
    const bounds = boundsForNodesAndEdges(
      groupNodes,
      groupEdges,
      routeByEdgeId
    );
    const layoutBounds = boundsForNodesAndEdges(
      groupNodes,
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
      layoutBounds: padSelectionRect(layoutBounds, GROUP_LAYOUT_BOUNDS_PADDING),
      collisionRects
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
    const collisionRects = [nodeSelectionBounds(node), ...(options.extraBoundsByNodeId?.get(node.id) ?? [])];
    const visibleBounds = mergeSelectionRects(collisionRects) ?? nodeSelectionBounds(node);
    units.push({
      id: `node:${node.id}`,
      kind: "node",
      nodeIds: [node.id],
      edgeIds: [],
      bounds: visibleBounds,
      layoutBounds: nodeLayoutBounds(node),
      collisionRects
    });
  }
  return units;
}

/**
 * 容器整组布局单元(用户裁决:对齐/分布选中容器 → 容器作为整体参与;自动对齐/散开阶段 2 同理):
 * 把「参与布局的容器」与其**全部成员**(不论成员自身是否在 units 里)合并成一个单元,成员单元从列表移除 ——
 * 布局只挪这个整组单元,容器与成员相对位置不变。单元包围盒取「容器 ∪ 全部成员」并集:
 * 阶段 1 刚挪过成员时容器节点本身尚未重算,只取容器矩形会漏掉成员新位置。
 * 无容器参与时原样返回(元素与顺序不变)。
 */
export function mergeContainerLayoutUnits(nodes: ModelNode[], units: readonly CanvasLayoutUnit[]): CanvasLayoutUnit[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const unitNodeIds = new Set(units.flatMap((unit) => unit.nodeIds));
  const groupIdByNodeId = new Map<string, string>();
  const groupNodesById = new Map<string, ModelNode[]>();
  for (const container of nodes) {
    if (!isAcContainerNode(container) || !unitNodeIds.has(container.id)) {
      continue;
    }
    const groupId = `container:${container.id}`;
    // 成员过滤与 buildCanvasLayoutUnits 同谓词:线路设备不可作布局单元,不吸入整组(否则布局会连带挪动不可移动节点)
    const groupNodes = [
      container,
      ...containerMemberNodes(nodes, container.id).filter((node) => isCanvasNodeMovable(node.kind))
    ];
    groupNodesById.set(groupId, groupNodes);
    for (const node of groupNodes) {
      groupIdByNodeId.set(node.id, groupId);
    }
  }
  if (groupIdByNodeId.size === 0) {
    return [...units];
  }
  const firstIndexByGroupId = new Map<string, number>();
  units.forEach((unit, index) => {
    for (const nodeId of unit.nodeIds) {
      const groupId = groupIdByNodeId.get(nodeId);
      if (groupId && !firstIndexByGroupId.has(groupId)) {
        firstIndexByGroupId.set(groupId, index);
      }
    }
  });
  const buildUnit = (unitId: string, unitNodes: ModelNode[]): CanvasLayoutUnit => {
    const selectionRects = unitNodes.map((node) => nodeSelectionBounds(node));
    const layoutRects = unitNodes.map((node) => nodeLayoutBounds(node));
    return {
      id: unitId,
      kind: "node",
      nodeIds: unitNodes.map((node) => node.id),
      edgeIds: [],
      bounds: mergeSelectionRects(selectionRects) ?? selectionRects[0],
      layoutBounds: mergeSelectionRects(layoutRects) ?? layoutRects[0],
      collisionRects: selectionRects
    };
  };
  const out: CanvasLayoutUnit[] = [];
  units.forEach((unit, index) => {
    const groupIds = [...new Set(unit.nodeIds.flatMap((nodeId) => groupIdByNodeId.get(nodeId) ?? []))];
    if (groupIds.length === 0) {
      out.push(unit);
      return;
    }
    // 整组单元落回该组首个单元的位置(保持原有相对次序,避免布局算法的稳定排序被打乱)
    for (const groupId of groupIds) {
      if (firstIndexByGroupId.get(groupId) === index) {
        out.push(buildUnit(groupId, groupNodesById.get(groupId)!));
      }
    }
    // 同一单元里不属于任何整组的节点(如画布组合内混装容器与散装设备)补成独立单元 ——
    // 原单元被整组单元替换后,它们否则会从布局集里无声消失(布局不动它们、组合被悄悄拆散且无提示)
    const restNodes = unit.nodeIds.flatMap((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && !groupIdByNodeId.has(nodeId) ? [node] : [];
    });
    if (restNodes.length > 0) {
      out.push(buildUnit(`rest:${unit.id}`, restNodes));
    }
  });
  return out;
}

/**
 * 容器内自布局(自动对齐/散开阶段 1):对每个容器**单独**跑一次 unitLayout,
 * 单元 = 该容器的成员(容器自身不动,几何随后由 enforce 按成员重算)。
 * 成员不足 2 个的容器跳过(无可布局内容)。返回成员新位置后的完整节点数组。
 * `scopeNodeIds` 限定参与容器(与阶段 2 的作用域一致):整层布局传当前图层节点,避免顺手改别层容器的内部。
 */
export function arrangeContainerInteriors(
  nodes: ModelNode[],
  unitLayout: (currentNodes: ModelNode[], units: CanvasLayoutUnit[]) => ModelNode[],
  scopeNodeIds?: readonly string[]
): ModelNode[] {
  const scope = scopeNodeIds ? new Set(scopeNodeIds) : null;
  let current = nodes;
  for (const container of nodes) {
    if (!isAcContainerNode(container) || (scope && !scope.has(container.id))) {
      continue;
    }
    const memberIds = containerMemberNodes(current, container.id)
      .filter((node) => !isAcContainerNode(node))
      .map((node) => node.id);
    if (memberIds.length < 2) {
      continue;
    }
    const memberIdSet = new Set(memberIds);
    const units = buildCanvasLayoutUnits(
      [],
      current.filter((node) => memberIdSet.has(node.id)),
      memberIds,
      [],
      [],
      [],
      { isTransformableNode: (node) => isCanvasNodeMovable(node.kind) }
    );
    if (units.length < 2) {
      continue;
    }
    current = unitLayout(current, units);
  }
  return current;
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

/** 每个单元最多试算的候选网格点数:9 = 就近网格点 + 一圈 8 邻点,位移上界约 1.5×阈值 */
const AUTO_ALIGN_DEFAULT_CANDIDATE_CHECKS = 9;
/** 带线路校验时的候选搜索半径(环):2 ⇒ 5×5 网格邻域内找候选,位移有界且扫描代价可控 */
const AUTO_ALIGN_CANDIDATE_RING_LIMIT = 2;
/** 终检发现指标变差时,最多回退几次(每次都重算一遍全量;仍然更差就整单放弃) */
const AUTO_ALIGN_REPAIR_ATTEMPTS = 6;
const AUTO_ALIGN_DEFAULT_QUALITY_BUDGET_MS = 800;
/** 端口对齐判定容差(px):节点/端子坐标取整后可能差 0.5px 以内 */
const AUTO_ALIGN_ALIGNMENT_EPSILON = 0.5;

/** 自动对齐的线路质量度量:拐点数 + 交叉数。 */
export type AutoAlignRouteQuality = {
  bends: number;
  crossings: number;
};

export type AutoAlignQualityReport = {
  /** 完成线路重算的候选数 */
  verifiedCandidateCount: number;
  /** 因「拐点增加」被否决的候选数 */
  bendRejectedCount: number;
  /** 因「交叉增加」被否决的候选数 */
  crossingRejectedCount: number;
  /** 因约束不满足(含终检回退)而原地保留的单元数 */
  frozenUnitCount: number;
  /** 线路重算耗时超预算 → 剩余单元一律原地保留 */
  degraded: boolean;
  /** 终检仍然发现全图拐点/交叉增加 → 已放弃本次对齐(位置不变) */
  revertedByVerification: boolean;
};

/**
 * 空白质量报告。生产侧(画布工厂)与测试都从这里取,避免 6 个字段散落多处手写 ——
 * 以后给报告加字段只需改这一处。
 */
export function createAutoAlignQualityReport(): AutoAlignQualityReport {
  return {
    verifiedCandidateCount: 0,
    bendRejectedCount: 0,
    crossingRejectedCount: 0,
    frozenUnitCount: 0,
    degraded: false,
    revertedByVerification: false
  };
}

export type AutoAlignQualityContext = {
  /** 参与判定的连线(当前图层的全部连线) */
  edges: readonly Edge[];
  /**
   * 候选判定用的线路几何。**缺省用内置的 `autoAlignPreviewRoutes`**(纯几何直连 / L 形,微秒级)。
   * 只有在「重算足够快」时才该传自定义实现 —— 逐候选判定会被调用几十上百次,
   * 画布路由器那种几十毫秒一次的实现必须留给 `verifyRouteEdges`,不要放在这里。
   */
  routeEdges?: (nodes: readonly ModelNode[], edges: readonly Edge[]) => readonly RoutedEdge[];
  /**
   * 终检用重算(与画布同一套参数,例如 `routeEdgesForStoredRendering`):
   * 对原布局与对齐后的布局各跑一次全量重算,全图拐点 / 交叉只要有一项增加,就整单放弃(位置不变)。
   * 只跑两次,所以可以承受昂贵的画布路由器;缺省则不做终检。
   */
  verifyRouteEdges?: (nodes: readonly ModelNode[], edges: readonly Edge[]) => readonly RoutedEdge[];
  /** 画布当前正在渲染的线路:其中的线路几何也计入判定(用于不在 `edges` 里的额外连线) */
  routedEdges?: readonly RoutedEdge[];
  /** 每个单元最多试算的候选数(默认 9 = 就近网格点 + 一圈 8 邻点) */
  maxCandidateChecksPerUnit?: number;
  /** 线路重算的总耗时预算(毫秒,默认 800),超出后剩余单元原地保留 */
  timeBudgetMs?: number;
  /** 出参:约束执行情况(供调用方写日志) */
  report?: AutoAlignQualityReport;
};

type AutoAlignGridCandidate = {
  gridX: number;
  gridY: number;
  delta: Point;
  collisionRects: SelectionRect[];
  distanceSquared: number;
};

/**
 * 候选判定用的**快速代理**线路几何:两端端口对齐(共 x / 共 y)就直连,否则走一个拐点的 L 形。
 *
 * 逐候选判定**不能**直接跑画布路由器:它为避让障碍会做路径搜索,实测一次几十毫秒(个别状态甚至几百毫秒),
 * 几十个单元 × 九个候选就是好几秒,交互直接卡死。代理只做纯几何,微秒级,足以比较候选之间的相对好坏;
 * 与真实几何的偏差由终检(见 `AutoAlignQualityContext.verifyRouteEdges`)兜底。
 */
export function autoAlignPreviewRoutes(nodes: readonly ModelNode[], edges: readonly Edge[]): RoutedEdge[] {
  const previewNodeById = new Map(nodes.map((node) => [node.id, node]));
  const routes: RoutedEdge[] = [];
  for (const edge of edges) {
    const source = previewNodeById.get(edge.sourceId);
    const target = previewNodeById.get(edge.targetId);
    if (!source || !target) {
      continue;
    }
    const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
    const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
    const points = start.x === end.x || start.y === end.y
      ? [start, end]
      : [start, { x: end.x, y: start.y }, end];
    routes.push({ edgeId: edge.id, points, path: "" });
  }
  return routes;
}

/** 正交线路的拐点数:相邻线段方向改变计 1(与 model-routing 的 routeBendCount 同口径)。 */
export function countAutoAlignRouteBends(points: readonly Point[]): number {
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

/** 一条边去掉存档折线几何(manualPoints / routePoints)后的副本:等价于「交给路由器按当前端口重算」。 */
export function autoAlignEdgeWithoutStoredRoute(edge: Edge): Edge {
  if (!edge.manualPoints?.length && !edge.routePoints?.length) {
    return edge;
  }
  const next = { ...edge };
  delete next.manualPoints;
  delete next.routePoints;
  return next;
}

/** 一条「失效存档折线」的处置结果:清掉该边的存档折线,换成这里给出的重算几何。 */
export type AutoAlignStoredRouteDrop = {
  edgeId: string;
  points: readonly Point[];
};

/**
 * 找出「存档折线已经失效」的线路。
 *
 * 判定口径(用户裁决):**按端口重算的拐点严格少于保留存档折线时的拐点** —— 说明这条存档折线
 * 是导入 / 上一次自动铺线留下的陈迹(设备移动后绕行已无必要),自动对齐应当把它换成重算几何。
 * 注意不要放宽成「不差于」:实测 `多能流` 里 30 条边有 2 条是「拐点数打平但腿位不同」(差 10px / 73px),
 * 放宽会把它们也换掉,凭空改变用户看到的形状。
 *
 * 只比 `candidateEdgeIds` 里的边(调用方通常传「本次移动真会影响到的边」+ 基线集合),免得每次都全量比两遍。
 * 两遍都用 `routeEdges`(画布同一套参数的解析器)跑**完整边表**,保证与画布渲染同源。
 */
export function autoAlignStoredRouteDrops(
  nodes: readonly ModelNode[],
  edges: readonly Edge[],
  candidateEdgeIds: ReadonlySet<string>,
  routeEdges: (nodes: readonly ModelNode[], edges: readonly Edge[]) => readonly RoutedEdge[]
): AutoAlignStoredRouteDrop[] {
  if (candidateEdgeIds.size === 0 || edges.length === 0) {
    return [];
  }
  const candidates = edges.filter((edge) => candidateEdgeIds.has(edge.id));
  if (candidates.length === 0) {
    return [];
  }
  const candidateIds = new Set(candidates.map((edge) => edge.id));
  const reroutedEdges = edges.map((edge) =>
    candidateIds.has(edge.id) ? autoAlignEdgeWithoutStoredRoute(edge) : edge
  );
  const preservedPoints = new Map(
    routeEdges(nodes, edges).map((route) => [route.edgeId, route.points])
  );
  const reroutedPoints = new Map(
    routeEdges(nodes, reroutedEdges).map((route) => [route.edgeId, route.points])
  );
  const drops: AutoAlignStoredRouteDrop[] = [];
  for (const edge of candidates) {
    const preserved = preservedPoints.get(edge.id);
    const rerouted = reroutedPoints.get(edge.id);
    if (!preserved || !rerouted || preserved.length < 2 || rerouted.length < 2) {
      continue;
    }
    if (countAutoAlignRouteBends(rerouted) < countAutoAlignRouteBends(preserved)) {
      drops.push({ edgeId: edge.id, points: rerouted });
    }
  }
  return drops;
}

/**
 * 两条正交线段是否「严格交叉」(X 型):两段都必须从内部穿过。
 * 端点相接、T 型相接、共线重叠都不算交叉 —— 母线落点共用、串联设备共用端子都是正常拓扑,不是视觉交叉。
 */
function autoAlignSegmentsCross(first: Point, second: Point, third: Point, fourth: Point): boolean {
  const firstHorizontal = first.y === second.y;
  const secondHorizontal = third.y === fourth.y;
  if (firstHorizontal === secondHorizontal) {
    return false;
  }
  const horizontalStart = firstHorizontal ? first : third;
  const horizontalEnd = firstHorizontal ? second : fourth;
  const verticalStart = firstHorizontal ? third : first;
  const verticalEnd = firstHorizontal ? fourth : second;
  const x = verticalStart.x;
  const y = horizontalStart.y;
  const insideHorizontal = x > Math.min(horizontalStart.x, horizontalEnd.x) && x < Math.max(horizontalStart.x, horizontalEnd.x);
  const insideVertical = y > Math.min(verticalStart.y, verticalEnd.y) && y < Math.max(verticalStart.y, verticalEnd.y);
  return insideHorizontal && insideVertical;
}

function countAutoAlignRoutePairCrossings(first: readonly Point[], second: readonly Point[]): number {
  let crossings = 0;
  for (let firstIndex = 1; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 1; secondIndex < second.length; secondIndex += 1) {
      if (autoAlignSegmentsCross(first[firstIndex - 1], first[firstIndex], second[secondIndex - 1], second[secondIndex])) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

/** 一组线路两两之间的严格交叉数。 */
export function countAutoAlignRouteCrossings(routes: readonly (readonly Point[])[]): number {
  let crossings = 0;
  for (let first = 0; first < routes.length; first += 1) {
    for (let second = first + 1; second < routes.length; second += 1) {
      crossings += countAutoAlignRoutePairCrossings(routes[first], routes[second]);
    }
  }
  return crossings;
}

function autoAlignEdgesByNodeId(edges: readonly Edge[]): Map<string, Edge[]> {
  const index = new Map<string, Edge[]>();
  for (const edge of edges) {
    for (const nodeId of [edge.sourceId, edge.targetId]) {
      const list = index.get(nodeId);
      if (list) {
        list.push(edge);
      } else {
        index.set(nodeId, [edge]);
      }
    }
  }
  return index;
}

function autoAlignUnitEdges(unit: CanvasLayoutUnit, edgesByNodeId: ReadonlyMap<string, readonly Edge[]>): Edge[] {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const nodeId of unit.nodeIds) {
    for (const edge of edgesByNodeId.get(nodeId) ?? []) {
      if (seen.has(edge.id)) {
        continue;
      }
      seen.add(edge.id);
      edges.push(edge);
    }
  }
  return edges;
}

/**
 * 线路是否参与「端点对齐」判定:
 * - 母线连接由母线落点投影自行对齐(落点会被母线整理重算),参与判定只会产生噪声;
 * - 手绘线路保留用户画的形状,拐点由手绘点决定,与端口是否对齐无关;
 * 两者都排除。注意:它们仍然参与「拐点 / 交叉」重算(见 autoAlignEdgesWithEndpoints)。
 */
function autoAlignEdgeAlignmentApplies(edge: Edge, nodeById: ReadonlyMap<string, ModelNode>): boolean {
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  if (!source || !target) {
    return false;
  }
  if (isBusNode(source) || isBusNode(target)) {
    return false;
  }
  return !edge.manualPoints?.length;
}

/** 两端都在图上的线路才能重算几何(悬空端没有端口)。母线 / 手绘线路同样要重算:它们移动后一样会多出拐点。 */
function autoAlignEdgeHasEndpoints(edge: Edge, nodeById: ReadonlyMap<string, ModelNode>): boolean {
  return nodeById.has(edge.sourceId) && nodeById.has(edge.targetId);
}

function autoAlignEdgePortPoint(
  nodeById: ReadonlyMap<string, ModelNode>,
  edge: Edge,
  side: "source" | "target"
): Point | null {
  const node = nodeById.get(side === "source" ? edge.sourceId : edge.targetId);
  if (!node) {
    return null;
  }
  return side === "source"
    ? getEdgeEndpointPoint(node, edge.sourcePoint, edge.sourceTerminalId)
    : getEdgeEndpointPoint(node, edge.targetPoint, edge.targetTerminalId);
}

/** 零拐点直连的前提:两端端口共 x 或共 y。 */
function autoAlignEdgePortsAligned(nodeById: ReadonlyMap<string, ModelNode>, edge: Edge): boolean {
  const source = autoAlignEdgePortPoint(nodeById, edge, "source");
  const target = autoAlignEdgePortPoint(nodeById, edge, "target");
  if (!source || !target) {
    return true;
  }
  return Math.abs(source.x - target.x) <= AUTO_ALIGN_ALIGNMENT_EPSILON ||
    Math.abs(source.y - target.y) <= AUTO_ALIGN_ALIGNMENT_EPSILON;
}

function autoAlignScoreIsBetter(candidate: readonly number[], current: readonly number[]): boolean {
  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate[index] !== current[index]) {
      return candidate[index] < current[index];
    }
  }
  return false;
}

function applyAutoAlignUnitDelta(state: ModelNode[], unit: CanvasLayoutUnit, delta: Point): ModelNode[] {
  if (delta.x === 0 && delta.y === 0) {
    return state;
  }
  const nodeIdSet = new Set(unit.nodeIds);
  return state.map((node) => nodeIdSet.has(node.id)
    ? {
        ...node,
        position: {
          x: Math.round(node.position.x + delta.x),
          y: Math.round(node.position.y + delta.y)
        }
      }
    : node);
}

function pickNearestAutoAlignCandidate(candidates: readonly AutoAlignGridCandidate[]): AutoAlignGridCandidate | null {
  let best: AutoAlignGridCandidate | null = null;
  for (const candidate of candidates) {
    if (!best || autoAlignCandidateIsNearer(candidate, best)) {
      best = candidate;
    }
  }
  return best;
}

function autoAlignCandidateIsNearer(candidate: AutoAlignGridCandidate, current: AutoAlignGridCandidate): boolean {
  if (candidate.distanceSquared !== current.distanceSquared) {
    return candidate.distanceSquared < current.distanceSquared;
  }
  if (Math.abs(candidate.delta.y) !== Math.abs(current.delta.y)) {
    return Math.abs(candidate.delta.y) < Math.abs(current.delta.y);
  }
  if (Math.abs(candidate.delta.x) !== Math.abs(current.delta.x)) {
    return Math.abs(candidate.delta.x) < Math.abs(current.delta.x);
  }
  const candidatePositiveX = candidate.delta.x >= 0 ? 0 : 1;
  const currentPositiveX = current.delta.x >= 0 ? 0 : 1;
  if (candidatePositiveX !== currentPositiveX) {
    return candidatePositiveX < currentPositiveX;
  }
  const candidatePositiveY = candidate.delta.y >= 0 ? 0 : 1;
  const currentPositiveY = current.delta.y >= 0 ? 0 : 1;
  if (candidatePositiveY !== currentPositiveY) {
    return candidatePositiveY < currentPositiveY;
  }
  if (candidate.gridY !== current.gridY) {
    return candidate.gridY < current.gridY;
  }
  return candidate.gridX < current.gridX;
}

/**
 * 自动对齐(网格吸附)。
 *
 * 不带 `quality` 时保持原行为:每个布局单元吸附到「就近且不重叠」的网格交叉点。
 *
 * 带 `quality` 时增加两条硬约束(用户裁决:**线路拐点** 与 **线路交叉** 都不能因本次对齐增加):
 * 1. 当前状态里已经对齐(两端端口共 x / 共 y)的线路,候选状态下必须仍然对齐 —— 零拐点直连不被破坏;
 * 2. 用真实路由器重算该单元相关线路,与其余线路合成「全图几何」,拐点数 / 交叉数任一超过当前值即否决该候选。
 * 两条都过才接受,所有候选都不合格时该单元原地保留(宁可不吸附,也不把线路画坏)。
 * 基线随每个被接受的移动一起前进,于是每一步都不让指标变差 ⇒ 最终结果必定不差于原始布局,
 * 阈值调大也不会出现用户反馈的「布局剧变 + 拐点成片暴增 + 多出交叉」。
 * 候选择优顺序:全图拐点数 → 全图交叉数 → 位移;候选取自同心网格点(3×3 邻域),位移天然受限,
 * 不会为了少一个拐点把图元甩出去。孤立图元(无线路可重算)自然退化为就近吸附。
 */
export function autoAlignNodeLayoutUnits(
  nodes: ModelNode[],
  units: readonly CanvasLayoutUnit[],
  threshold = AUTO_ALIGN_DEFAULT_THRESHOLD_PX,
  quality?: AutoAlignQualityContext
): ModelNode[] {
  const movableUnits = units.filter((unit) => unit.nodeIds.length > 0);
  const gridSpacing = Math.max(0, Math.round(threshold));
  if (movableUnits.length < 2 || gridSpacing <= 0) {
    return nodes;
  }

  const orderedUnits = movableUnits
    .map((unit, index) => ({
      unit,
      index,
      center: {
        x: unitCenter(unit, "x"),
        y: unitCenter(unit, "y")
      }
    }))
    .sort((first, second) =>
      first.center.y - second.center.y ||
      first.center.x - second.center.x ||
      first.index - second.index
    );
  const deltas = new Map<string, Point>();
  const occupiedGridPoints = new Set<string>();
  const placedCollisionRects: SelectionRect[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const gridPointKey = (gridX: number, gridY: number) => `${gridX}:${gridY}`;
  const movementDeltaToGridPoint = (gridCoordinate: number, centerCoordinate: number) =>
    Math.round(gridCoordinate * gridSpacing - centerCoordinate);
  const ringOffsets = (ring: number) => {
    if (ring === 0) {
      return [{ x: 0, y: 0 }];
    }
    const offsets: Point[] = [];
    for (let x = -ring; x <= ring; x += 1) {
      offsets.push({ x, y: -ring }, { x, y: ring });
    }
    for (let y = -ring + 1; y < ring; y += 1) {
      offsets.push({ x: -ring, y }, { x: ring, y });
    }
    return offsets;
  };

  /**
   * 收集某单元的候选网格点(同心环由近到远)。
   * `limit <= 0`:不限制候选数,但沿用「同心环剪枝」提前收尾(既有行为,按距离最近择优)。
   * `limit > 0`:取前 limit 个候选交给线路校验(候选本身已按由近到远排列)。
   * `maxRing`:候选搜索的最大环数(缺省不限)。带线路校验时环数必须封顶 ——
   * 否则图元密集处会一圈圈扫到很远,而每圈都要和全部已放置矩形做重叠判定,实测能把一次对齐拖到秒级。
   */
  const collectCandidates = (
    unit: CanvasLayoutUnit,
    center: Point,
    limit: number,
    occupied: Set<string>,
    placedRects: SelectionRect[],
    maxRing = Number.POSITIVE_INFINITY
  ): AutoAlignGridCandidate[] => {
    const baseGridX = Math.round(center.x / gridSpacing);
    const baseGridY = Math.round(center.y / gridSpacing);
    const sourceCollisionRects = unit.collisionRects.length > 0 ? unit.collisionRects : [unit.bounds];
    const baseDelta = {
      x: movementDeltaToGridPoint(baseGridX, center.x),
      y: movementDeltaToGridPoint(baseGridY, center.y)
    };
    const baseLeft = Math.min(...sourceCollisionRects.map((rect) => rect.left + baseDelta.x));
    const maxPlacedRight = placedRects.length > 0
      ? Math.max(...placedRects.map((rect) => rect.right))
      : baseLeft;
    const guaranteedPositiveXRing = Math.min(
      Math.max(0, Math.ceil((maxPlacedRight - baseLeft) / gridSpacing) + 1),
      maxRing
    );
    const candidates: AutoAlignGridCandidate[] = [];
    for (let ring = 0; ring <= guaranteedPositiveXRing; ring += 1) {
      for (const offset of ringOffsets(ring)) {
        const gridX = baseGridX + offset.x;
        const gridY = baseGridY + offset.y;
        if (occupied.has(gridPointKey(gridX, gridY))) {
          continue;
        }
        const delta = {
          x: movementDeltaToGridPoint(gridX, center.x),
          y: movementDeltaToGridPoint(gridY, center.y)
        };
        const collisionRects = sourceCollisionRects.map((rect) => offsetRect(rect, delta));
        const overlapsPlacedUnit = collisionRects.some((candidateRect) =>
          placedRects.some((placedRect) => rectsOverlap(candidateRect, placedRect))
        );
        if (overlapsPlacedUnit) {
          continue;
        }
        candidates.push({
          gridX,
          gridY,
          delta,
          collisionRects,
          distanceSquared: delta.x * delta.x + delta.y * delta.y
        });
        if (limit > 0 && candidates.length >= limit) {
          return candidates;
        }
      }
      if (limit <= 0) {
        const nearest = pickNearestAutoAlignCandidate(candidates);
        if (nearest) {
          const nextRingMinimumDistance = (ring + 0.5) * gridSpacing;
          if (nearest.distanceSquared <= nextRingMinimumDistance * nextRingMinimumDistance) {
            return candidates;
          }
        }
      }
    }
    return candidates;
  };

  if (!quality) {
    for (const { unit, center } of orderedUnits) {
      const bestCandidate = pickNearestAutoAlignCandidate(collectCandidates(unit, center, 0, occupiedGridPoints, placedCollisionRects));
      if (!bestCandidate) {
        continue;
      }
      occupiedGridPoints.add(gridPointKey(bestCandidate.gridX, bestCandidate.gridY));
      placedCollisionRects.push(...bestCandidate.collisionRects);
      if (bestCandidate.delta.x !== 0 || bestCandidate.delta.y !== 0) {
        deltas.set(unit.id, bestCandidate.delta);
      }
    }
    return deltas.size > 0 ? moveNodesByUnitDeltas(nodes, movableUnits, deltas) : nodes;
  }

  // ===== 带线路约束的路径 =====
  // 约束口径(用户裁决):**线路拐点** 与 **线路交叉** 都不能因本次对齐而增加。
  // 判定方式:维护一份「当前布局的全图线路几何」,逐个单元试算候选网格点:
  //   候选状态 = 本单元按候选位移 + 「与本单元共用线路、且尚未处理的邻居单元」按计划位移预演 ——
  //   这样「两个已经对齐的图元一起吸到同一条网格线」才不会被误判成「掰弯了线路」,本来能消掉的拐点才消得掉。
  //   要求全图拐点数 / 交叉数都不超过初始布局;两条都过才接受,所有候选都不合格则该单元原地保留。
  // 每一步都以「不差于初始布局」为上限 ⇒ 阈值调大也不会出现用户反馈的「布局剧变 + 拐点暴增 + 多出交叉」。
  // 逐候选判定用的是**快速代理几何**(见 autoAlignPreviewRoutes):真路由器一次几十毫秒,放不进候选循环。
  // 收尾两步保底:①代理空间局部回退(回退那些单独让代理指标变差的单元)
  // ②用参考几何(真路由器)复算全量终检,变差就按后进先出逐个撤回,仍差则整单放弃。
  const report = quality.report;
  if (report) {
    Object.assign(report, createAutoAlignQualityReport());
  }
  const qualityEdges = quality.edges ?? [];
  const qualityEdgesByNodeId = autoAlignEdgesByNodeId(qualityEdges);
  const candidateCheckLimit = Math.max(1, Math.round(quality.maxCandidateChecksPerUnit ?? AUTO_ALIGN_DEFAULT_CANDIDATE_CHECKS));
  const qualityBudgetMs = Math.max(0, quality.timeBudgetMs ?? AUTO_ALIGN_DEFAULT_QUALITY_BUDGET_MS);
  let qualityElapsedMs = 0;
  // 候选判定一律走快速代理(缺省内置);真路由器只留给终检
  const previewRouteEdges = quality.routeEdges ?? autoAlignPreviewRoutes;

  /** 一组线路几何的质量:拐点数 + 严格交叉数。 */
  const routeQualityOf = (routes: Iterable<readonly Point[]>): AutoAlignRouteQuality => {
    const list = [...routes].filter((points) => points.length >= 2);
    return {
      bends: list.reduce((sum, points) => sum + countAutoAlignRouteBends(points), 0),
      crossings: countAutoAlignRouteCrossings(list)
    };
  };
  /** 判定几何重算:累计耗时(供预算降级)与「已试算候选数」(供日志说明)。 */
  const previewRoutesOf = (state: ModelNode[], edges: readonly Edge[]): readonly RoutedEdge[] => {
    const startedAt = Date.now();
    const routes = previewRouteEdges(state, edges);
    qualityElapsedMs += Date.now() - startedAt;
    if (report) {
      report.verifiedCandidateCount += 1;
    }
    return routes;
  };
  const writeRoutes = (target: Map<string, readonly Point[]>, routes: readonly RoutedEdge[]) => {
    for (const route of routes) {
      if (route.points.length >= 2) {
        target.set(route.edgeId, route.points);
      } else {
        target.delete(route.edgeId);
      }
    }
  };

  // 判定几何统一走「代理」:先把 edges 之外还画着的线路(如 inherited 连线)放进来,再用代理重算全部参与判定的边,
  // 保证基线与候选是同一把尺子量出来的。
  const routePointsByEdgeId = new Map<string, readonly Point[]>();
  for (const route of quality.routedEdges ?? []) {
    if (route.points.length >= 2) {
      routePointsByEdgeId.set(route.edgeId, route.points);
    }
  }
  writeRoutes(routePointsByEdgeId, previewRouteEdges(nodes, qualityEdges));
  /** 约束上限:对齐后的全图拐点 / 交叉都不得超过初始布局 */
  const baselineQuality = routeQualityOf(routePointsByEdgeId.values());

  const originalPositionByNodeId = new Map(nodes.map((node) => [node.id, node.position]));
  const unitIdByNodeId = new Map<string, string>();
  const nodeIdsByUnitId = new Map<string, readonly string[]>();
  for (const unit of movableUnits) {
    nodeIdsByUnitId.set(unit.id, unit.nodeIds);
    for (const nodeId of unit.nodeIds) {
      unitIdByNodeId.set(nodeId, unit.id);
    }
  }
  const processedUnitIds = new Set<string>();

  // 阶段 A(干跑):算出「纯网格就近对齐」每个单元会落到哪 —— 邻居预演用它当参照。
  const plannedDeltaByUnitId = new Map<string, Point>();
  {
    const dryOccupiedPoints = new Set<string>();
    const dryPlacedRects: SelectionRect[] = [];
    for (const { unit, center } of orderedUnits) {
      const bestCandidate = pickNearestAutoAlignCandidate(collectCandidates(unit, center, 0, dryOccupiedPoints, dryPlacedRects));
      if (!bestCandidate) {
        continue;
      }
      dryOccupiedPoints.add(gridPointKey(bestCandidate.gridX, bestCandidate.gridY));
      dryPlacedRects.push(...bestCandidate.collisionRects);
      plannedDeltaByUnitId.set(unit.id, bestCandidate.delta);
    }
  }
  /** 未处理单元在「计划布局」里的落点;已处理单元返回 null(用真实落点)。 */
  const plannedPositionOf = (nodeId: string): Point | null => {
    const origin = originalPositionByNodeId.get(nodeId);
    const unitId = unitIdByNodeId.get(nodeId);
    if (!origin || !unitId || processedUnitIds.has(unitId)) {
      return null;
    }
    const delta = plannedDeltaByUnitId.get(unitId);
    if (!delta) {
      return null;
    }
    return { x: Math.round(origin.x + delta.x), y: Math.round(origin.y + delta.y) };
  };

  let working = nodes;
  let movedAnyUnit = false;
  for (const { unit, center } of orderedUnits) {
    processedUnitIds.add(unit.id);
    if (qualityElapsedMs > qualityBudgetMs) {
      // 预算耗尽:剩余单元一律原地保留,不再拿线路质量去冒险
      if (report) {
        report.degraded = true;
        report.frozenUnitCount += 1;
      }
      placedCollisionRects.push(...(unit.collisionRects.length > 0 ? unit.collisionRects : [unit.bounds]));
      continue;
    }
    const unitNodeIdSet = new Set(unit.nodeIds);
    const metricEdges = autoAlignUnitEdges(unit, qualityEdgesByNodeId).filter((edge) => autoAlignEdgeHasEndpoints(edge, nodeById));
    const candidates = collectCandidates(
      unit,
      center,
      candidateCheckLimit,
      occupiedGridPoints,
      placedCollisionRects,
      AUTO_ALIGN_CANDIDATE_RING_LIMIT
    ).sort((first, second) =>
      first.distanceSquared - second.distanceSquared ||
      first.gridY - second.gridY ||
      first.gridX - second.gridX
    );
    if (candidates.length === 0) {
      continue;
    }
    /** 原地保留:不吸附、不占用网格点,但占住当前位置避免后续单元叠上来。 */
    const freezeUnit = () => {
      if (report) {
        report.frozenUnitCount += 1;
      }
      placedCollisionRects.push(...(unit.collisionRects.length > 0 ? unit.collisionRects : [unit.bounds]));
    };
    const commitCandidate = (candidate: AutoAlignGridCandidate) => {
      occupiedGridPoints.add(gridPointKey(candidate.gridX, candidate.gridY));
      placedCollisionRects.push(...candidate.collisionRects);
      if (candidate.delta.x !== 0 || candidate.delta.y !== 0) {
        deltas.set(unit.id, candidate.delta);
        working = applyAutoAlignUnitDelta(working, unit, candidate.delta);
        movedAnyUnit = true;
      }
      if (metricEdges.length > 0) {
        // 邻居此刻并没有真的跟着预演位置移动,所以回写线路几何必须按「真实落点」重算
        writeRoutes(routePointsByEdgeId, previewRoutesOf(working, metricEdges));
      }
    };

    if (metricEdges.length === 0) {
      // 没有可重算的线路(孤立图元):移动它不会改变任何线路几何,直接就近吸附
      commitCandidate(pickNearestAutoAlignCandidate(candidates) ?? candidates[0]);
      continue;
    }

    // 邻居预演范围:与本单元共用线路、且尚未处理的邻居单元,以及这些线路
    const neighborNodeIds = new Set<string>();
    for (const edge of metricEdges) {
      for (const nodeId of [edge.sourceId, edge.targetId]) {
        const ownerId = unitIdByNodeId.get(nodeId);
        if (!ownerId || ownerId === unit.id || processedUnitIds.has(ownerId)) {
          continue;
        }
        for (const id of nodeIdsByUnitId.get(ownerId) ?? []) {
          neighborNodeIds.add(id);
        }
      }
    }
    // 预演只关心「本单元自己的线路」:邻居的其它线路这一趟并不会真的动,
    // 把它们也重算进去会把邻居计划里的偏差算到本单元头上,导致过度否决。
    const previewStateFor = (delta: Point): ModelNode[] => working.map((node) => {
      if (unitNodeIdSet.has(node.id)) {
        return {
          ...node,
          position: {
            x: Math.round(node.position.x + delta.x),
            y: Math.round(node.position.y + delta.y)
          }
        };
      }
      if (!neighborNodeIds.has(node.id)) {
        return node;
      }
      const planned = plannedPositionOf(node.id);
      return planned ? { ...node, position: planned } : node;
    });

    // 约束一:当前状态里已经对齐(零拐点直连)的线路,候选状态必须保持对齐
    const alignmentEdges = metricEdges.filter((edge) => autoAlignEdgeAlignmentApplies(edge, nodeById));
    const workingNodeById = new Map(working.map((node) => [node.id, node]));
    const baselineAlignedEdgeIds = new Set<string>();
    for (const edge of alignmentEdges) {
      if (autoAlignEdgePortsAligned(workingNodeById, edge)) {
        baselineAlignedEdgeIds.add(edge.id);
      }
    }

    let chosen: AutoAlignGridCandidate | null = null;
    let chosenScore: number[] | null = null;
    for (const candidate of candidates) {
      const state = previewStateFor(candidate.delta);
      const stateNodeById = new Map(state.map((node) => [node.id, node]));
      let breaksAlignment = false;
      for (const edge of alignmentEdges) {
        if (baselineAlignedEdgeIds.has(edge.id) && !autoAlignEdgePortsAligned(stateNodeById, edge)) {
          breaksAlignment = true;
          break;
        }
      }
      if (breaksAlignment) {
        if (report) {
          report.bendRejectedCount += 1;
        }
        continue;
      }
      // 约束二:重算本单元与邻居的线路,与其余线路合成「全图几何」,拐点 / 交叉任一超过初始布局即否决
      const trialRoutes = new Map(routePointsByEdgeId);
      writeRoutes(trialRoutes, previewRoutesOf(state, metricEdges));
      const candidateQuality = routeQualityOf(trialRoutes.values());
      if (candidateQuality.bends > baselineQuality.bends) {
        if (report) {
          report.bendRejectedCount += 1;
        }
        continue;
      }
      if (candidateQuality.crossings > baselineQuality.crossings) {
        if (report) {
          report.crossingRejectedCount += 1;
        }
        continue;
      }
      const score = [candidateQuality.bends, candidateQuality.crossings, candidate.distanceSquared];
      if (!chosenScore || autoAlignScoreIsBetter(score, chosenScore)) {
        chosenScore = score;
        chosen = candidate;
      }
    }

    if (!chosen) {
      freezeUnit();
      continue;
    }
    commitCandidate(chosen);
  }

  // 局部回退:邻域预演与最终落点可能不一致,逐个检查已移动的单元 —— 放回原位反而更好就回退。
  if (movedAnyUnit) {
    for (let pass = 0; pass < 2; pass += 1) {
      let revertedAny = false;
      for (const unit of movableUnits) {
        const delta = deltas.get(unit.id);
        if (!delta || (delta.x === 0 && delta.y === 0)) {
          continue;
        }
        const metricEdges = autoAlignUnitEdges(unit, qualityEdgesByNodeId).filter((edge) => autoAlignEdgeHasEndpoints(edge, nodeById));
        const state = applyAutoAlignUnitDelta(working, unit, { x: -delta.x, y: -delta.y });
        const trialRoutes = new Map(routePointsByEdgeId);
        if (metricEdges.length > 0) {
          writeRoutes(trialRoutes, previewRoutesOf(state, metricEdges));
        }
        const before = routeQualityOf(routePointsByEdgeId.values());
        const after = routeQualityOf(trialRoutes.values());
        if (!autoAlignScoreIsBetter([after.bends, after.crossings], [before.bends, before.crossings])) {
          continue;
        }
        working = state;
        deltas.delete(unit.id);
        routePointsByEdgeId.clear();
        for (const [edgeId, points] of trialRoutes) {
          routePointsByEdgeId.set(edgeId, points);
        }
        revertedAny = true;
      }
      if (!revertedAny) {
        break;
      }
    }
  }

  if (!movedAnyUnit || deltas.size === 0) {
    return nodes;
  }

  // 终检:候选判定用的是快速代理,它看不见「躲避障碍造成的绕行」——图元挪走后别的线路可能被迫多拐两个弯。
  // 所以最后必须用**参考几何**(与画布同一套参数的准确重算)对「原布局 / 对齐后布局」各跑一次全量,
  // 只要全图拐点或交叉有一项增加,就按「后接受的先撤回」的顺序逐个回退(每次重算一遍全量,回到不差于原布局就停);
  // 回退到无可回退仍然更差,则整单放弃(位置不变)。参考几何缺省即用注入的判定几何,两者都没有则不做终检。
  const authoritativeRouteEdges = quality.verifyRouteEdges ?? quality.routeEdges;
  if (authoritativeRouteEdges && movedAnyUnit) {
    // 终检的几何口径必须与「判定几何(代理)」一致:代理是按端口算的(端口对齐就直连),它看不见编辑态
    // `preserveManualRouteDisplay` 会把设备的存档折线原样搬走。设备一移动,存档折线的绕行不但留了下来,
    // 还可能多拐两个弯(实测 2→4),于是「本来能消掉的拐点」在终检里被算成「变差」而回退 —— 这正是用户反馈
    // 「自动对齐消不掉拐点」的根因。解决办法:把「按端口重算严格更简单」的存档折线按重算几何计入侵检,
    // 并由调用方在提交时把这些折线真正清掉(见 `createAutoAlignCanvasGraphics` 的 `storedRouteDrops`)。
    const qualityEdgeIds = new Set(qualityEdges.map((edge) => edge.id));
    /**
     * 逐状态算「该清哪些存档折线」——必须与**提交时刻**同口径:同一个 helper、同一套全量边表、
     * 同一套画布参数(提交侧就是 `autoAlignStoredRouteDrops(arranged, edges, 全部边 id, routeWithCanvasParams)`)。
     *
     * 只算「与被移动图元相连的边」是不够的:图元挪开后障碍让位,端点没动的线路也可能变得该清 ——
     * 那种边提交会清、终检却没清,量出来的拐点数就与实际不符(两个方向都会偏,可能把「没变差」判成「变差」,
     * 也可能把「变差了」判成「没变差」)。而放宽候选集不增加开销:`autoAlignStoredRouteDrops` 无论如何
     * 都要跑两遍全量路由,候选集只决定事后比较哪些边。
     */
    const measureAuthoritative = (state: ModelNode[]) => {
      const dropIds = new Set(
        autoAlignStoredRouteDrops(state, qualityEdges, qualityEdgeIds, authoritativeRouteEdges)
          .map((drop) => drop.edgeId)
      );
      const routeEdgesToMeasure = dropIds.size === 0
        ? qualityEdges
        : qualityEdges.map((edge) => (dropIds.has(edge.id) ? autoAlignEdgeWithoutStoredRoute(edge) : edge));
      const startedAt = Date.now();
      const routes = authoritativeRouteEdges(state, routeEdgesToMeasure);
      qualityElapsedMs += Date.now() - startedAt;
      return routeQualityOf(routes.map((route) => route.points));
    };
    const beforeQuality = measureAuthoritative(nodes);
    const isWorseThanOriginal = (qualityOfState: AutoAlignRouteQuality) =>
      qualityOfState.bends > beforeQuality.bends || qualityOfState.crossings > beforeQuality.crossings;
    let afterQuality = measureAuthoritative(working);
    if (isWorseThanOriginal(afterQuality)) {
      const acceptedUnits = orderedUnits.filter(({ unit }) => deltas.has(unit.id)).reverse();
      let attempts = 0;
      let revertedCount = 0;
      for (const { unit } of acceptedUnits) {
        if (attempts >= AUTO_ALIGN_REPAIR_ATTEMPTS) {
          break;
        }
        attempts += 1;
        const delta = deltas.get(unit.id);
        if (!delta) {
          continue;
        }
        const revertedState = applyAutoAlignUnitDelta(working, unit, { x: -delta.x, y: -delta.y });
        const revertedQuality = measureAuthoritative(revertedState);
        if (!autoAlignScoreIsBetter(
          [revertedQuality.bends, revertedQuality.crossings],
          [afterQuality.bends, afterQuality.crossings]
        )) {
          continue;
        }
        working = revertedState;
        deltas.delete(unit.id);
        afterQuality = revertedQuality;
        revertedCount += 1;
        if (!isWorseThanOriginal(afterQuality)) {
          break;
        }
      }
      if (report) {
        report.frozenUnitCount += revertedCount;
      }
      if (deltas.size === 0) {
        return nodes;
      }
      if (isWorseThanOriginal(afterQuality)) {
        if (report) {
          report.revertedByVerification = true;
        }
        return nodes;
      }
    }
  }

  return working;
}

export type AutoSpreadNodeLayoutUnitsOptions = {
  padding?: number;
  maxIterations?: number;
  minSeparation?: number;
  bounds?: CanvasBounds;
  /** 硬障碍:移动后必须完全不重叠(如不可移动图元的包围盒)。 */
  avoidRects?: readonly SelectionRect[];
  /**
   * 软障碍:移动后**可以**压到,只按「压到几个」扣分(见 `nearestNonOverlappingDelta`)。
   *
   * 典型用途是**当前线路走廊**(`createAutoSpreadCanvasGraphics` 的 `routeAvoidRectsFor`):
   * 线路在设备移动后本来就会按新位置重算,把旧走线当硬障碍会让设备为了躲开**自己那根线**
   * 被推到画布另一头 —— 实测 交流母线（竖向）-1 被推 +1605px(画布宽 2121),就是用户看到的「严重变形」。
   */
  softAvoidRects?: readonly SelectionRect[];
};

export type AutoSpreadMovableRect = {
  id: string;
  rect: SelectionRect;
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

function rectCanvasContainmentDelta(rect: SelectionRect, bounds: CanvasBounds | undefined): Point {
  if (!bounds) {
    return { x: 0, y: 0 };
  }
  const axisDelta = (start: number, end: number, limit: number) => {
    if (end - start > limit) {
      return Math.round(limit / 2 - (start + end) / 2);
    }
    if (start < 0) {
      return Math.ceil(-start);
    }
    if (end > limit) {
      return Math.floor(limit - end);
    }
    return 0;
  };
  return {
    x: axisDelta(rect.left, rect.right, bounds.width),
    y: axisDelta(rect.top, rect.bottom, bounds.height)
  };
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
  /** 与 `overlapsAny` 同一条查找路径,但返回**去重后**的重叠矩形数(一个矩形可能落在多个格子里)。 */
  overlapCount(rect: SelectionRect): number {
    const seen = new Set<SelectionRect>();
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
          if (!seen.has(candidate) && rectsOverlap(rect, candidate)) {
            seen.add(candidate);
          }
        }
      }
    }
    return seen.size;
  }
}

/**
 * 每压到一个「软障碍」扣多少分(与 `delta²` 同量纲,便于直接比较)。
 * 取值口径:4000 → 「为了躲开 1 条线路走廊,值得多走 √4000 ≈ 63px」。
 * 上限也随之被钉住:即使躲开全部 40 条走廊最多也只值 √(40×4000) ≈ 400px,
 * 远小于「搜索到画布另一头」的 1600px —— 这正是要把硬否决改成扣分的原因。
 */
const SOFT_AVOID_PENALTY = 4000;

function nearestNonOverlappingDelta(
  baseRects: readonly SelectionRect[],
  placedGrid: PlacedRectGrid,
  minSeparation: number,
  bounds: CanvasBounds | undefined,
  softGrid?: PlacedRectGrid
) {
  const overlapsHard = () => baseRects.some((rect) => placedGrid.overlapsAny(rect));
  const softOverlapCount = (rects: readonly SelectionRect[]) =>
    softGrid ? rects.reduce((sum, rect) => sum + softGrid.overlapCount(rect), 0) : 0;
  if (!overlapsHard() && softOverlapCount(baseRects) === 0) {
    return { x: 0, y: 0 };
  }
  const baseBounds = boundsForRects(baseRects);
  const axisValueLimit = placedGrid.rects.length < 80 ? Math.max(1, placedGrid.rects.length * 2 + 1) : 48;
  const xValues = [0];
  const yValues = [0];
  // 软障碍的边缘也算候选:否则「横向挪 9px 就离开线路走廊」这种正常解根本不会被考虑。
  for (const placed of [...placedGrid.rects, ...(softGrid?.rects ?? [])]) {
    for (const baseRect of baseRects) {
      xValues.push(placed.right - baseRect.left + minSeparation);
      xValues.push(placed.left - baseRect.right - minSeparation);
      yValues.push(placed.bottom - baseRect.top + minSeparation);
      yValues.push(placed.top - baseRect.bottom - minSeparation);
    }
  }
  const candidateXValues = uniqueNearestValues(xValues, axisValueLimit);
  const candidateYValues = uniqueNearestValues(yValues, axisValueLimit);
  let bestDelta: Point | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const consider = (delta: Point) => {
    const movedRects = baseRects.map((rect) => offsetRect(rect, delta));
    if (movedRects.some((rect) => placedGrid.overlapsAny(rect))) {
      return;
    }
    const overflow = rectCanvasOverflow(boundsForRects(movedRects), bounds);
    const score = overflow * 1_000_000 +
      softOverlapCount(movedRects) * SOFT_AVOID_PENALTY +
      delta.x * delta.x + delta.y * delta.y +
      (delta.x !== 0 && delta.y !== 0 ? 0.25 : 0);
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

  const width = Math.max(1, baseBounds.right - baseBounds.left);
  const height = Math.max(1, baseBounds.bottom - baseBounds.top);
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

export function autoSpreadMovableRects(
  items: readonly AutoSpreadMovableRect[],
  fixedRects: readonly SelectionRect[],
  options: AutoSpreadNodeLayoutUnitsOptions = {}
): Map<string, Point> {
  const padding = Math.max(0, options.padding ?? 4);
  const minSeparation = Math.max(1, options.minSeparation ?? 1);
  const placed = new PlacedRectGrid();
  for (const rect of fixedRects) {
    placed.add(padRect(rect, padding));
  }
  const deltas = new Map<string, Point>();
  const orderedItems = items
    .map((item, index) => ({ item, index }))
    .sort((first, second) =>
      first.item.rect.top - second.item.rect.top ||
      first.item.rect.left - second.item.rect.left ||
      first.index - second.index
    );
  for (const { item } of orderedItems) {
    const paddedRect = padRect(item.rect, padding);
    const boundaryDelta = rectCanvasContainmentDelta(paddedRect, options.bounds);
    const containedRect = offsetRect(paddedRect, boundaryDelta);
    const separationDelta = nearestNonOverlappingDelta(
      [containedRect],
      placed,
      minSeparation,
      options.bounds
    );
    const finalDelta = {
      x: boundaryDelta.x + separationDelta.x,
      y: boundaryDelta.y + separationDelta.y
    };
    placed.add(offsetRect(containedRect, separationDelta));
    if (finalDelta.x !== 0 || finalDelta.y !== 0) {
      deltas.set(item.id, finalDelta);
    }
  }
  return deltas;
}

type AutoSpreadLayoutItem = {
  unit: CanvasLayoutUnit;
  index: number;
  baseRect: SelectionRect;
  baseRects: SelectionRect[];
  boundaryDelta: Point;
};

function rectCollectionsOverlap(first: readonly SelectionRect[], second: readonly SelectionRect[]) {
  return first.some((firstRect) => second.some((secondRect) => rectsOverlap(firstRect, secondRect)));
}

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
        if (rectCollectionsOverlap(current.baseRects, items[nextIndex].baseRects)) {
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

/**
 * 「紧凑网格重排」的最低重叠密度(`单元面积总和 / 组件包围盒面积`)。
 *
 * 网格重排的用途是**把缠成一团的单元摊开**:单元格一律按最大成员撑开,
 * 所以只有当成员**彼此大幅重叠**时它才是净收益。密度 ≥2 意味着平均每块地方被压了两层以上。
 *
 * 反例(实测 `多能流`):「3 个断路器 + 一根竖母线」只是相邻擦边,密度 ≈0.76,却凑够了 4 个单元。
 * 走网格重排后:竖排被摊成横排、包围盒横向翻倍 —— 这正是用户反馈的「严重变形」。
 * 这类组件应当走**逐项就近推开**,而不是重排。
 */
const AUTO_SPREAD_GRID_MIN_DENSITY = 2;

function spreadComponentDensity(component: readonly AutoSpreadLayoutItem[]) {
  const bounds = boundsForRects(component.map((item) => item.baseRect));
  const boundsArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
  const totalArea = component.reduce(
    (sum, item) => sum + rectWidth(item.baseRect) * rectHeight(item.baseRect),
    0
  );
  return totalArea / boundsArea;
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
  bounds: CanvasBounds | undefined,
  softGrid?: PlacedRectGrid
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
    [boundsForRects(proposedRects)],
    placedGrid,
    minSeparation,
    bounds,
    softGrid
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
  const layoutItems = orderedUnits.map((item) => {
    const baseRect = padRect(item.unit.bounds, padding);
    const baseRects = item.unit.collisionRects.map((rect) => padRect(rect, padding));
    const boundaryDelta = rectCanvasContainmentDelta(baseRect, options.bounds);
    return {
      ...item,
      baseRect: offsetRect(baseRect, boundaryDelta),
      baseRects: baseRects.map((rect) => offsetRect(rect, boundaryDelta)),
      boundaryDelta
    };
  });
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
  for (const component of orderedComponents) {
    if (component.length === 1) {
      for (const rect of component[0].baseRects) {
        placed.add(rect);
      }
    }
  }
  for (const avoidRect of options.avoidRects ?? []) {
    placed.add(padRect(avoidRect, padding));
  }
  const softPlaced = new PlacedRectGrid();
  for (const avoidRect of options.softAvoidRects ?? []) {
    softPlaced.add(padRect(avoidRect, padding));
  }
  const deltas = new Map<string, Point>();
  const mergeDelta = (unitId: string, delta: Point) => {
    const current = deltas.get(unitId) ?? { x: 0, y: 0 };
    const next = { x: current.x + delta.x, y: current.y + delta.y };
    if (next.x === 0 && next.y === 0) {
      deltas.delete(unitId);
      return;
    }
    deltas.set(unitId, next);
  };
  for (const item of layoutItems) {
    mergeDelta(item.unit.id, item.boundaryDelta);
  }
  for (const component of orderedComponents) {
    if (component.length === 1) {
      continue;
    }
    if (component.length >= 4 &&
      component.every((item) => item.baseRects.length === 1) &&
      spreadComponentDensity(component) >= AUTO_SPREAD_GRID_MIN_DENSITY) {
      const gridLayout = balancedGridDeltasForComponent(component, placed, minSeparation, options.bounds, softPlaced);
      for (const [unitId, delta] of gridLayout.deltas) {
        mergeDelta(unitId, delta);
      }
      for (const rect of gridLayout.rects) {
        placed.add(rect);
      }
      continue;
    }
    for (const item of component) {
      const delta = nearestNonOverlappingDelta(item.baseRects, placed, minSeparation, options.bounds, softPlaced);
      for (const rect of item.baseRects) {
        placed.add(offsetRect(rect, delta));
      }
      if (delta.x !== 0 || delta.y !== 0) {
        mergeDelta(item.unit.id, delta);
      }
    }
  }
  return deltas.size > 0 ? moveNodesByUnitDeltas(nodes, movableUnits, deltas) : nodes;
}
