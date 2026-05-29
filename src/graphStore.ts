import { DEFAULT_MODEL_LAYER_ID, getNodeScaleX, getNodeScaleY, isBusNode, type Edge, type ModelNode } from "./model";

export type GraphRenderBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type GraphNodeSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, ModelNode[]>;
  nodeBucketKeysById: Map<string, string[]>;
  nodeBoundsById: Map<string, GraphRenderBounds>;
};

export type GraphStore = {
  nodeMap: Map<string, ModelNode>;
  edgeMap: Map<string, Edge>;
  nodeOrder: string[];
  edgeOrder: string[];
  nodeIndexById: Map<string, number>;
  edgeIndexById: Map<string, number>;
  nodeIdSet: Set<string>;
  edgeIdSet: Set<string>;
  edgesByNodeId: Map<string, Edge[]>;
  edgesByTerminalRef: Map<string, Edge[]>;
  nodesByLayerId: Map<string, ModelNode[]>;
  busNodeIdSet: Set<string>;
  nodeSpatialIndex: GraphNodeSpatialIndex;
  nodes: ModelNode[];
  edges: Edge[];
};

export type GraphStorePatch = {
  nodeUpdates?: Iterable<ModelNode>;
  edgeUpserts?: Iterable<Edge>;
  edgeDeleteIds?: Iterable<string>;
};

const GRAPH_NODE_SPATIAL_BUCKET_SIZE = 256;

const spatialBucketKey = (x: number, y: number) => `${x}:${y}`;

const spatialBucketRange = (bounds: GraphRenderBounds, bucketSize: number) => ({
  left: Math.floor(bounds.left / bucketSize),
  right: Math.floor(bounds.right / bucketSize),
  top: Math.floor(bounds.top / bucketSize),
  bottom: Math.floor(bounds.bottom / bucketSize)
});

const orderedIndexMap = (order: readonly string[]) => new Map(order.map((id, index) => [id, index]));

function graphNodeRenderBounds(node: ModelNode): GraphRenderBounds {
  const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
  return {
    left: node.position.x - halfDiagonal,
    right: node.position.x + halfDiagonal,
    top: node.position.y - halfDiagonal,
    bottom: node.position.y + halfDiagonal
  };
}

function boxesIntersect(first: GraphRenderBounds, second: GraphRenderBounds) {
  return first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
}

export function buildGraphNodeSpatialIndex(
  nodes: readonly ModelNode[],
  bucketSize = GRAPH_NODE_SPATIAL_BUCKET_SIZE
): GraphNodeSpatialIndex {
  const buckets = new Map<string, ModelNode[]>();
  const nodeBucketKeysById = new Map<string, string[]>();
  const nodeBoundsById = new Map<string, GraphRenderBounds>();
  for (const node of nodes) {
    const bounds = graphNodeRenderBounds(node);
    nodeBoundsById.set(node.id, bounds);
    const range = spatialBucketRange(bounds, bucketSize);
    const nodeBucketKeys: string[] = [];
    for (let x = range.left; x <= range.right; x += 1) {
      for (let y = range.top; y <= range.bottom; y += 1) {
        const key = spatialBucketKey(x, y);
        nodeBucketKeys.push(key);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(node);
        } else {
          buckets.set(key, [node]);
        }
      }
    }
    nodeBucketKeysById.set(node.id, nodeBucketKeys);
  }
  return { bucketSize, buckets, nodeBucketKeysById, nodeBoundsById };
}

function patchNodeSpatialIndex(index: GraphNodeSpatialIndex, previousNode: ModelNode, nextNode: ModelNode): GraphNodeSpatialIndex {
  const buckets = new Map(index.buckets);
  for (const key of index.nodeBucketKeysById.get(previousNode.id) ?? []) {
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    const nextBucket = bucket.filter((node) => node.id !== previousNode.id);
    if (nextBucket.length > 0) {
      buckets.set(key, nextBucket);
    } else {
      buckets.delete(key);
    }
  }
  const nextBucketKeysById = new Map(index.nodeBucketKeysById);
  const nextBoundsById = new Map(index.nodeBoundsById);
  const nextBounds = graphNodeRenderBounds(nextNode);
  const range = spatialBucketRange(nextBounds, index.bucketSize);
  const nextBucketKeys: string[] = [];
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const key = spatialBucketKey(x, y);
      nextBucketKeys.push(key);
      buckets.set(key, [...(buckets.get(key) ?? []), nextNode]);
    }
  }
  nextBucketKeysById.set(nextNode.id, nextBucketKeys);
  nextBoundsById.set(nextNode.id, nextBounds);
  return { ...index, buckets, nodeBucketKeysById: nextBucketKeysById, nodeBoundsById: nextBoundsById };
}

export function queryGraphStoreNodeSpatialIndex(storeOrIndex: GraphStore | GraphNodeSpatialIndex, bounds: GraphRenderBounds): ModelNode[] {
  const index = "nodeSpatialIndex" in storeOrIndex ? storeOrIndex.nodeSpatialIndex : storeOrIndex;
  const range = spatialBucketRange(bounds, index.bucketSize);
  const matches: ModelNode[] = [];
  const seen = new Set<string>();
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(spatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const node of bucket) {
        if (seen.has(node.id) || !boxesIntersect(index.nodeBoundsById.get(node.id) ?? graphNodeRenderBounds(node), bounds)) {
          continue;
        }
        seen.add(node.id);
        matches.push(node);
      }
    }
  }
  return matches;
}

function buildEdgesByNodeId(edges: readonly Edge[]) {
  const map = new Map<string, Edge[]>();
  const add = (nodeId: string, edge: Edge) => {
    if (!nodeId) {
      return;
    }
    const bucket = map.get(nodeId);
    if (bucket) {
      bucket.push(edge);
    } else {
      map.set(nodeId, [edge]);
    }
  };
  for (const edge of edges) {
    add(edge.sourceId, edge);
    add(edge.targetId, edge);
  }
  return map;
}

const terminalRefKey = (nodeId: string, terminalId: string | undefined) => terminalId ? `${nodeId}:${terminalId}` : "";

function buildEdgesByTerminalRef(edges: readonly Edge[]) {
  const map = new Map<string, Edge[]>();
  for (const edge of edges) {
    addEdgeToTerminalRef(map, edge);
  }
  return map;
}

function removeEdgeFromTerminalRef(map: Map<string, Edge[]>, edge: Edge) {
  for (const key of [terminalRefKey(edge.sourceId, edge.sourceTerminalId), terminalRefKey(edge.targetId, edge.targetTerminalId)]) {
    if (!key) {
      continue;
    }
    const bucket = map.get(key);
    if (!bucket) {
      continue;
    }
    const nextBucket = bucket.filter((item) => item.id !== edge.id);
    if (nextBucket.length > 0) {
      map.set(key, nextBucket);
    } else {
      map.delete(key);
    }
  }
}

function addEdgeToTerminalRef(map: Map<string, Edge[]>, edge: Edge) {
  for (const key of [terminalRefKey(edge.sourceId, edge.sourceTerminalId), terminalRefKey(edge.targetId, edge.targetTerminalId)]) {
    if (!key) {
      continue;
    }
    map.set(key, [...(map.get(key) ?? []), edge]);
  }
}

const graphNodeLayerId = (node: ModelNode) => node.layerId ?? DEFAULT_MODEL_LAYER_ID;

function buildNodesByLayerId(nodes: readonly ModelNode[]) {
  const map = new Map<string, ModelNode[]>();
  for (const node of nodes) {
    const layerId = graphNodeLayerId(node);
    const bucket = map.get(layerId);
    if (bucket) {
      bucket.push(node);
    } else {
      map.set(layerId, [node]);
    }
  }
  return map;
}

function buildBusNodeIdSet(nodes: readonly ModelNode[]) {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (isBusNode(node)) {
      ids.add(node.id);
    }
  }
  return ids;
}

function patchBusNodeIdSet(index: Set<string>, previousNode: ModelNode, nextNode: ModelNode) {
  const previousIsBus = isBusNode(previousNode);
  const nextIsBus = isBusNode(nextNode);
  if (previousIsBus === nextIsBus) {
    return index;
  }
  const nextIndex = new Set(index);
  if (nextIsBus) {
    nextIndex.add(nextNode.id);
  } else {
    nextIndex.delete(previousNode.id);
  }
  return nextIndex;
}

function patchNodeLayerIndex(index: Map<string, ModelNode[]>, previousNode: ModelNode, nextNode: ModelNode) {
  const nextIndex = new Map(index);
  const previousLayerId = graphNodeLayerId(previousNode);
  const nextLayerId = graphNodeLayerId(nextNode);
  const previousBucket = nextIndex.get(previousLayerId) ?? [];
  const nextPreviousBucket = previousBucket.flatMap((node) => {
    if (node.id !== previousNode.id) {
      return [node];
    }
    return previousLayerId === nextLayerId ? [nextNode] : [];
  });
  if (nextPreviousBucket.length > 0) {
    nextIndex.set(previousLayerId, nextPreviousBucket);
  } else {
    nextIndex.delete(previousLayerId);
  }
  if (previousLayerId !== nextLayerId) {
    nextIndex.set(nextLayerId, [...(nextIndex.get(nextLayerId) ?? []), nextNode]);
  }
  return nextIndex;
}

function sameOrderedReferences<T extends { id: string }>(items: readonly T[], order: readonly string[], map: ReadonlyMap<string, T>) {
  if (items.length !== order.length) {
    return false;
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (order[index] !== item.id || map.get(item.id) !== item) {
      return false;
    }
  }
  return true;
}

export function createGraphStore(nodes: readonly ModelNode[], edges: readonly Edge[]): GraphStore {
  const nodeList = Array.from(nodes);
  const edgeList = Array.from(edges);
  const nodeMap = new Map(nodeList.map((node) => [node.id, node]));
  const edgeMap = new Map(edgeList.map((edge) => [edge.id, edge]));
  const nodeOrder = nodeList.map((node) => node.id);
  const edgeOrder = edgeList.map((edge) => edge.id);
  return {
    nodeMap,
    edgeMap,
    nodeOrder,
    edgeOrder,
    nodeIndexById: orderedIndexMap(nodeOrder),
    edgeIndexById: orderedIndexMap(edgeOrder),
    nodeIdSet: new Set(nodeOrder),
    edgeIdSet: new Set(edgeOrder),
    edgesByNodeId: buildEdgesByNodeId(edgeList),
    edgesByTerminalRef: buildEdgesByTerminalRef(edgeList),
    nodesByLayerId: buildNodesByLayerId(nodeList),
    busNodeIdSet: buildBusNodeIdSet(nodeList),
    nodeSpatialIndex: buildGraphNodeSpatialIndex(nodeList),
    nodes: nodeList,
    edges: edgeList
  };
}

export function graphStoreNodes(store: GraphStore): ModelNode[] {
  return store.nodes;
}

export function graphStoreEdges(store: GraphStore): Edge[] {
  return store.edges;
}

export function graphStoreSetNodes(store: GraphStore, nodes: readonly ModelNode[]): GraphStore {
  if (sameOrderedReferences(nodes, store.nodeOrder, store.nodeMap)) {
    return store;
  }
  const nodeList = Array.from(nodes);
  const nodeMap = new Map(nodeList.map((node) => [node.id, node]));
  const nodeOrder = nodeList.map((node) => node.id);
  return {
    ...store,
    nodeMap,
    nodeOrder,
    nodeIndexById: orderedIndexMap(nodeOrder),
    nodeIdSet: new Set(nodeOrder),
    nodesByLayerId: buildNodesByLayerId(nodeList),
    busNodeIdSet: buildBusNodeIdSet(nodeList),
    nodeSpatialIndex: buildGraphNodeSpatialIndex(nodeList),
    nodes: nodeList
  };
}

export function graphStoreSetEdges(store: GraphStore, edges: readonly Edge[]): GraphStore {
  if (sameOrderedReferences(edges, store.edgeOrder, store.edgeMap)) {
    return store;
  }
  const edgeList = Array.from(edges);
  const edgeMap = new Map(edgeList.map((edge) => [edge.id, edge]));
  const edgeOrder = edgeList.map((edge) => edge.id);
  return {
    ...store,
    edgeMap,
    edgeOrder,
    edgeIndexById: orderedIndexMap(edgeOrder),
    edgeIdSet: new Set(edgeOrder),
    edgesByNodeId: buildEdgesByNodeId(edgeList),
    edgesByTerminalRef: buildEdgesByTerminalRef(edgeList),
    edges: edgeList
  };
}

export function graphStoreSetGraph(store: GraphStore, nodes: readonly ModelNode[], edges: readonly Edge[]): GraphStore {
  const nextNodes = graphStoreSetNodes(store, nodes);
  return graphStoreSetEdges(nextNodes, edges);
}

function sameOrderFromItems<T extends { id: string }>(items: readonly T[], order: readonly string[]) {
  if (items.length !== order.length) {
    return false;
  }
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].id !== order[index]) {
      return false;
    }
  }
  return true;
}

function removeEdgeFromAdjacency(map: Map<string, Edge[]>, nodeId: string, edgeId: string) {
  const bucket = map.get(nodeId);
  if (!bucket) {
    return;
  }
  const nextBucket = bucket.filter((edge) => edge.id !== edgeId);
  if (nextBucket.length > 0) {
    map.set(nodeId, nextBucket);
  } else {
    map.delete(nodeId);
  }
}

function addEdgeToAdjacency(map: Map<string, Edge[]>, nodeId: string, edge: Edge) {
  if (!nodeId) {
    return;
  }
  map.set(nodeId, [...(map.get(nodeId) ?? []), edge]);
}

export function graphStorePatchNodesFromArray(
  store: GraphStore,
  nodes: readonly ModelNode[],
  nodeIds: Iterable<string>
): GraphStore {
  if (!sameOrderFromItems(nodes, store.nodeOrder)) {
    return graphStoreSetNodes(store, nodes);
  }
  let changed = false;
  let nodeMap = store.nodeMap;
  let nodeList = store.nodes;
  let nodesByLayerId = store.nodesByLayerId;
  let busNodeIdSet = store.busNodeIdSet;
  let nodeSpatialIndex = store.nodeSpatialIndex;
  for (const nodeId of nodeIds) {
    const index = store.nodeIndexById.get(nodeId);
    if (index === undefined) {
      continue;
    }
    const nextNode = nodes[index];
    const previousNode = store.nodeMap.get(nodeId);
    if (!previousNode || previousNode === nextNode) {
      continue;
    }
    if (!changed) {
      nodeMap = new Map(store.nodeMap);
      nodeList = store.nodes.slice();
      changed = true;
    }
    nodeMap.set(nodeId, nextNode);
    nodeList[index] = nextNode;
    nodesByLayerId = patchNodeLayerIndex(nodesByLayerId, previousNode, nextNode);
    busNodeIdSet = patchBusNodeIdSet(busNodeIdSet, previousNode, nextNode);
    nodeSpatialIndex = patchNodeSpatialIndex(nodeSpatialIndex, previousNode, nextNode);
  }
  return changed ? { ...store, nodeMap, nodesByLayerId, busNodeIdSet, nodeSpatialIndex, nodes: nodeList } : store;
}

export function graphStorePatchNodes(store: GraphStore, nodeUpdates: Iterable<ModelNode>): GraphStore {
  let changed = false;
  let nodeMap = store.nodeMap;
  let nodeList = store.nodes;
  let nodesByLayerId = store.nodesByLayerId;
  let busNodeIdSet = store.busNodeIdSet;
  let nodeSpatialIndex = store.nodeSpatialIndex;
  for (const nextNode of nodeUpdates) {
    const index = store.nodeIndexById.get(nextNode.id);
    if (index === undefined) {
      continue;
    }
    const previousNode = store.nodeMap.get(nextNode.id);
    if (!previousNode || previousNode === nextNode) {
      continue;
    }
    if (!changed) {
      nodeMap = new Map(store.nodeMap);
      nodeList = store.nodes.slice();
      changed = true;
    }
    nodeMap.set(nextNode.id, nextNode);
    nodeList[index] = nextNode;
    nodesByLayerId = patchNodeLayerIndex(nodesByLayerId, previousNode, nextNode);
    busNodeIdSet = patchBusNodeIdSet(busNodeIdSet, previousNode, nextNode);
    nodeSpatialIndex = patchNodeSpatialIndex(nodeSpatialIndex, previousNode, nextNode);
  }
  return changed ? { ...store, nodeMap, nodesByLayerId, busNodeIdSet, nodeSpatialIndex, nodes: nodeList } : store;
}

export function graphStorePatchEdgesFromArray(
  store: GraphStore,
  edges: readonly Edge[],
  edgeIds: Iterable<string>
): GraphStore {
  if (!sameOrderFromItems(edges, store.edgeOrder)) {
    return graphStoreSetEdges(store, edges);
  }
  let changed = false;
  let edgeMap = store.edgeMap;
  let edgeList = store.edges;
  let edgesByNodeId = store.edgesByNodeId;
  let edgesByTerminalRef = store.edgesByTerminalRef;
  for (const edgeId of edgeIds) {
    const index = store.edgeIndexById.get(edgeId);
    if (index === undefined) {
      continue;
    }
    const nextEdge = edges[index];
    const previousEdge = store.edgeMap.get(edgeId);
    if (!previousEdge || previousEdge === nextEdge) {
      continue;
    }
    if (!changed) {
      edgeMap = new Map(store.edgeMap);
      edgeList = store.edges.slice();
      edgesByNodeId = new Map(store.edgesByNodeId);
      edgesByTerminalRef = new Map(store.edgesByTerminalRef);
      changed = true;
    }
    edgeMap.set(edgeId, nextEdge);
    edgeList[index] = nextEdge;
    removeEdgeFromAdjacency(edgesByNodeId, previousEdge.sourceId, edgeId);
    removeEdgeFromAdjacency(edgesByNodeId, previousEdge.targetId, edgeId);
    addEdgeToAdjacency(edgesByNodeId, nextEdge.sourceId, nextEdge);
    addEdgeToAdjacency(edgesByNodeId, nextEdge.targetId, nextEdge);
    removeEdgeFromTerminalRef(edgesByTerminalRef, previousEdge);
    addEdgeToTerminalRef(edgesByTerminalRef, nextEdge);
  }
  return changed ? { ...store, edgeMap, edgesByNodeId, edgesByTerminalRef, edges: edgeList } : store;
}

export function graphStorePatchEdges(store: GraphStore, edgeUpdates: Iterable<Edge>): GraphStore {
  let changed = false;
  let edgeMap = store.edgeMap;
  let edgeList = store.edges;
  let edgesByNodeId = store.edgesByNodeId;
  let edgesByTerminalRef = store.edgesByTerminalRef;
  for (const nextEdge of edgeUpdates) {
    const index = store.edgeIndexById.get(nextEdge.id);
    if (index === undefined) {
      continue;
    }
    const previousEdge = store.edgeMap.get(nextEdge.id);
    if (!previousEdge || previousEdge === nextEdge) {
      continue;
    }
    if (!changed) {
      edgeMap = new Map(store.edgeMap);
      edgeList = store.edges.slice();
      edgesByNodeId = new Map(store.edgesByNodeId);
      edgesByTerminalRef = new Map(store.edgesByTerminalRef);
      changed = true;
    }
    edgeMap.set(nextEdge.id, nextEdge);
    edgeList[index] = nextEdge;
    removeEdgeFromAdjacency(edgesByNodeId, previousEdge.sourceId, nextEdge.id);
    removeEdgeFromAdjacency(edgesByNodeId, previousEdge.targetId, nextEdge.id);
    addEdgeToAdjacency(edgesByNodeId, nextEdge.sourceId, nextEdge);
    addEdgeToAdjacency(edgesByNodeId, nextEdge.targetId, nextEdge);
    removeEdgeFromTerminalRef(edgesByTerminalRef, previousEdge);
    addEdgeToTerminalRef(edgesByTerminalRef, nextEdge);
  }
  return changed ? { ...store, edgeMap, edgesByNodeId, edgesByTerminalRef, edges: edgeList } : store;
}

export function graphStoreApplyPatch(store: GraphStore, patch: GraphStorePatch): GraphStore {
  const nextWithNodes = patch.nodeUpdates ? graphStorePatchNodes(store, patch.nodeUpdates) : store;
  const edgeUpserts = Array.from(patch.edgeUpserts ?? []);
  const edgeDeleteIds = new Set(patch.edgeDeleteIds ?? []);
  if (edgeDeleteIds.size === 0 && edgeUpserts.every((edge) => nextWithNodes.edgeMap.has(edge.id))) {
    return graphStorePatchEdges(nextWithNodes, edgeUpserts);
  }
  if (edgeDeleteIds.size === 0 && edgeUpserts.length === 0) {
    return nextWithNodes;
  }

  const upsertById = new Map(edgeUpserts.map((edge) => [edge.id, edge]));
  let changed = false;
  const edgeList: Edge[] = [];
  for (const edgeId of nextWithNodes.edgeOrder) {
    if (edgeDeleteIds.has(edgeId)) {
      changed = true;
      continue;
    }
    const currentEdge = nextWithNodes.edgeMap.get(edgeId);
    if (!currentEdge) {
      continue;
    }
    const nextEdge = upsertById.get(edgeId) ?? currentEdge;
    if (nextEdge !== currentEdge) {
      changed = true;
    }
    edgeList.push(nextEdge);
    upsertById.delete(edgeId);
  }
  for (const edge of upsertById.values()) {
    changed = true;
    edgeList.push(edge);
  }
  if (!changed) {
    return nextWithNodes;
  }
  const edgeMap = new Map(edgeList.map((edge) => [edge.id, edge]));
  const edgeOrder = edgeList.map((edge) => edge.id);
  return {
    ...nextWithNodes,
    edgeMap,
    edgeOrder,
    edgeIndexById: orderedIndexMap(edgeOrder),
    edgeIdSet: new Set(edgeOrder),
    edgesByNodeId: buildEdgesByNodeId(edgeList),
    edgesByTerminalRef: buildEdgesByTerminalRef(edgeList),
    edges: edgeList
  };
}

export function overlayGraphStoreNodes(store: GraphStore, nodeUpdates: Iterable<ModelNode>): ModelNode[] {
  let nodeList = store.nodes;
  for (const nextNode of nodeUpdates) {
    const index = store.nodeIndexById.get(nextNode.id);
    if (index === undefined || store.nodeMap.get(nextNode.id) === nextNode) {
      continue;
    }
    if (nodeList === store.nodes) {
      nodeList = store.nodes.slice();
    }
    nodeList[index] = nextNode;
  }
  return nodeList;
}

export function graphStorePatchGraphFromArrays(
  store: GraphStore,
  nodes: readonly ModelNode[],
  edges: readonly Edge[],
  nodeIds: Iterable<string>,
  edgeIds: Iterable<string>
): GraphStore {
  return graphStorePatchEdgesFromArray(graphStorePatchNodesFromArray(store, nodes, nodeIds), edges, edgeIds);
}

export function graphStorePatchGraph(
  store: GraphStore,
  nodeUpdates: Iterable<ModelNode>,
  edgeUpdates: Iterable<Edge>
): GraphStore {
  return graphStorePatchEdges(graphStorePatchNodes(store, nodeUpdates), edgeUpdates);
}
