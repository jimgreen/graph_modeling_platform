import { describe, expect, test } from "vitest";
import { createDefaultNode, DEFAULT_MODEL_LAYER_ID, type Edge } from "./model";
import {
  createGraphStore,
  graphStoreEdges,
  graphStoreApplyPatch,
  graphStorePatchEdges,
  graphStorePatchGraph,
  graphStorePatchGraphFromArrays,
  graphStorePatchNodes,
  graphStoreNodes,
  graphStoreSetEdges,
  graphStoreSetNodes,
  overlayGraphStoreNodes,
  queryGraphStoreNodeSpatialIndex
} from "./graphStore";

describe("normalized graph store", () => {
  test("keeps nodes and edges in maps with stable order arrays", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" };

    const store = createGraphStore([source, load], [edge]);

    expect(store.nodeOrder).toEqual([source.id, load.id]);
    expect(store.edgeOrder).toEqual(["edge-1"]);
    expect(store.nodeMap.get(source.id)).toBe(source);
    expect(store.edgeMap.get("edge-1")).toBe(edge);
    expect(store.nodeIdSet.has(source.id)).toBe(true);
    expect(store.edgeIdSet.has(edge.id)).toBe(true);
    expect(store.edgesByTerminalRef.get(`${source.id}:t1`)).toEqual([edge]);
    expect(store.edgesByTerminalRef.get(`${load.id}:t1`)).toEqual([edge]);
    expect(graphStoreNodes(store)).toEqual([source, load]);
    expect(graphStoreEdges(store)).toEqual([edge]);
  });

  test("keeps bus node ids indexed without scanning all nodes during patches", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 260, y: 100 });
    const store = createGraphStore([source, bus], []);
    const movedBus = { ...bus, position: { x: 320, y: 120 } };
    const movedSource = { ...source, position: { x: 140, y: 120 } };

    const movedBusStore = graphStorePatchNodes(store, [movedBus]);
    const movedSourceStore = graphStorePatchNodes(movedBusStore, [movedSource]);
    const withoutBusStore = graphStoreSetNodes(movedSourceStore, [movedSource]);

    expect(store.busNodeIdSet.has(bus.id)).toBe(true);
    expect(movedBusStore.busNodeIdSet).toBe(store.busNodeIdSet);
    expect(movedSourceStore.busNodeIdSet).toBe(store.busNodeIdSet);
    expect(movedBusStore.elementTreeRevision).toBe(store.elementTreeRevision);
    expect(movedSourceStore.elementTreeRevision).toBe(store.elementTreeRevision);
    expect(withoutBusStore.busNodeIdSet.has(bus.id)).toBe(false);
    expect(withoutBusStore.elementTreeRevision).toBe(store.elementTreeRevision + 1);
  });

  test("bumps the element tree revision only for tree-visible graph changes", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([source, load], [edge]);

    const moved = graphStorePatchNodes(store, [{ ...load, position: { x: 320, y: 140 } }]);
    const renamed = graphStorePatchNodes(moved, [{ ...load, name: "新负荷" }]);
    const manualRoute = graphStorePatchEdges(renamed, [{ ...edge, manualPoints: [{ x: 180, y: 140 }] }]);
    const rewired = graphStorePatchEdges(manualRoute, [{ ...edge, targetTerminalId: "t2" }]);

    expect(moved.elementTreeRevision).toBe(store.elementTreeRevision);
    expect(moved.edgeEndpointRevision).toBe(store.edgeEndpointRevision);
    expect(renamed.elementTreeRevision).toBe(store.elementTreeRevision + 1);
    expect(renamed.edgeEndpointRevision).toBe(store.edgeEndpointRevision);
    expect(manualRoute.elementTreeRevision).toBe(renamed.elementTreeRevision);
    expect(manualRoute.edgeEndpointRevision).toBe(renamed.edgeEndpointRevision);
    expect(rewired.elementTreeRevision).toBe(manualRoute.elementTreeRevision + 1);
    expect(rewired.edgeEndpointRevision).toBe(manualRoute.edgeEndpointRevision + 1);
  });

  test("updates one node without rebuilding unchanged node and edge references", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const load = createDefaultNode("ac-load", { x: 260, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: source.id, targetId: load.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([source, load], [edge]);
    const movedLoad = { ...load, position: { x: 300, y: 120 } };

    const next = graphStoreSetNodes(store, [source, movedLoad]);

    expect(next).not.toBe(store);
    expect(next.nodeMap.get(source.id)).toBe(source);
    expect(next.nodeMap.get(load.id)).toBe(movedLoad);
    expect(next.edgeMap.get(edge.id)).toBe(edge);
    expect(next.edgesByNodeId.get(source.id)?.[0]).toBe(edge);
    expect(graphStoreNodes(next)).toEqual([source, movedLoad]);
  });

  test("maintains edge adjacency and node spatial lookup from the normalized store", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const right = createDefaultNode("ac-load", { x: 500, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: left.id, targetId: right.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([left, right], [edge]);
    const nextEdge = { ...edge, id: "edge-2", targetTerminalId: "t2" };
    const next = graphStoreSetEdges(store, [nextEdge]);

    expect(next.edgesByNodeId.get(left.id)).toEqual([nextEdge]);
    expect(next.edgesByNodeId.get(right.id)).toEqual([nextEdge]);
    expect(next.edgesByTerminalRef.get(`${left.id}:t1`)).toEqual([nextEdge]);
    expect(next.edgesByTerminalRef.get(`${right.id}:t1`)).toBeUndefined();
    expect(next.edgesByTerminalRef.get(`${right.id}:t2`)).toEqual([nextEdge]);
    expect(queryGraphStoreNodeSpatialIndex(next, { left: 0, right: 240, top: 0, bottom: 220 }).map((node) => node.id)).toEqual([left.id]);
  });

  test("caches node render bounds inside the spatial index and patches them on node moves", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const right = createDefaultNode("ac-load", { x: 500, y: 100 });
    const store = createGraphStore([left, right], []);
    const previousBounds = store.nodeSpatialIndex.nodeBoundsById.get(left.id);
    const movedLeft = { ...left, position: { x: 180, y: 140 } };

    const patched = graphStorePatchNodes(store, [movedLeft]);
    const nextBounds = patched.nodeSpatialIndex.nodeBoundsById.get(left.id);

    expect(previousBounds).toBeDefined();
    expect(nextBounds).toBeDefined();
    expect(nextBounds?.left).toBeGreaterThan(previousBounds?.left ?? 0);
    expect(nextBounds?.top).toBeGreaterThan(previousBounds?.top ?? 0);
    expect(queryGraphStoreNodeSpatialIndex(patched, { left: 120, right: 260, top: 100, bottom: 220 }).map((node) => node.id)).toContain(left.id);
  });

  test("keeps nodes indexed by model layer while patching moved nodes", () => {
    const first = createDefaultNode("ac-source", { x: 100, y: 100 });
    const second = { ...createDefaultNode("ac-load", { x: 320, y: 100 }), layerId: "layer-2" };
    const store = createGraphStore([first, second], []);
    const movedSecond = { ...second, position: { x: 360, y: 120 } };

    const patched = graphStorePatchNodes(store, [movedSecond]);

    expect(store.nodesByLayerId.get(DEFAULT_MODEL_LAYER_ID)?.map((node) => node.id)).toEqual([first.id]);
    expect(patched.nodesByLayerId.get("layer-2")).toEqual([movedSecond]);
    expect(patched.nodesByLayerId.get(DEFAULT_MODEL_LAYER_ID)).toEqual([first]);
    expect(patched.nodesByLayerId).not.toBe(store.nodesByLayerId);
  });

  test("patches moved nodes and candidate edges by id while preserving unchanged arrays", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const moved = createDefaultNode("ac-load", { x: 260, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: left.id, targetId: moved.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([left, moved], [edge]);
    const nextMoved = { ...moved, position: { x: 320, y: 140 } };
    const nextEdge = { ...edge, manualPoints: [{ x: 180, y: 140 }] };

    const patched = graphStorePatchGraphFromArrays(store, [left, nextMoved], [nextEdge], [moved.id], [edge.id]);

    expect(patched.nodeMap.get(left.id)).toBe(left);
    expect(patched.nodeMap.get(moved.id)).toBe(nextMoved);
    expect(patched.edgeMap.get(edge.id)).toBe(nextEdge);
    expect(patched.nodes[0]).toBe(left);
    expect(patched.nodes[1]).toBe(nextMoved);
    expect(patched.edges[0]).toBe(nextEdge);
    expect(patched.nodeOrder).toBe(store.nodeOrder);
    expect(patched.edgeOrder).toBe(store.edgeOrder);
  });

  test("patches known node and edge objects without rebuilding order indexes", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const right = createDefaultNode("ac-load", { x: 500, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: left.id, targetId: right.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([left, right], [edge]);
    const movedLeft = { ...left, position: { x: 140, y: 120 } };
    const nextEdge = { ...edge, manualPoints: [{ x: 300, y: 120 }] };

    const patchedNodes = graphStorePatchNodes(store, [movedLeft]);
    const patchedEdges = graphStorePatchEdges(patchedNodes, [nextEdge]);
    const patchedGraph = graphStorePatchGraph(store, [movedLeft], [nextEdge]);

    expect(patchedEdges.nodeMap.get(left.id)).toBe(movedLeft);
    expect(patchedEdges.nodeMap.get(right.id)).toBe(right);
    expect(patchedEdges.edgeMap.get(edge.id)).toBe(nextEdge);
    expect(patchedEdges.nodeOrder).toBe(store.nodeOrder);
    expect(patchedEdges.edgeOrder).toBe(store.edgeOrder);
    expect(patchedEdges.nodeIndexById).toBe(store.nodeIndexById);
    expect(patchedEdges.edgeIndexById).toBe(store.edgeIndexById);
    expect(patchedEdges.nodeIdSet).toBe(store.nodeIdSet);
    expect(patchedEdges.edgeIdSet).toBe(store.edgeIdSet);
    expect(patchedEdges.edgesByTerminalRef).not.toBe(store.edgesByTerminalRef);
    expect(patchedEdges.edgesByTerminalRef.get(`${left.id}:t1`)).toEqual([nextEdge]);
    expect(patchedGraph.nodeMap.get(left.id)).toBe(movedLeft);
    expect(patchedGraph.edgeMap.get(edge.id)).toBe(nextEdge);
  });

  test("patches terminal adjacency when an edge endpoint terminal changes", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const right = createDefaultNode("ac-load", { x: 500, y: 100 });
    const edge: Edge = { id: "edge-1", sourceId: left.id, targetId: right.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([left, right], [edge]);
    const rewired = { ...edge, targetTerminalId: "t2" };

    const patched = graphStorePatchEdges(store, [rewired]);

    expect(patched.edgesByTerminalRef.get(`${left.id}:t1`)).toEqual([rewired]);
    expect(patched.edgesByTerminalRef.get(`${right.id}:t1`)).toBeUndefined();
    expect(patched.edgesByTerminalRef.get(`${right.id}:t2`)).toEqual([rewired]);
  });

  test("applies edge upsert and delete patches without requiring a full edge array", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const middle = createDefaultNode("ac-load", { x: 300, y: 100 });
    const right = createDefaultNode("ac-load", { x: 500, y: 100 });
    const first: Edge = { id: "edge-1", sourceId: left.id, targetId: middle.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const removed: Edge = { id: "edge-2", sourceId: middle.id, targetId: right.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const added: Edge = { id: "edge-3", sourceId: left.id, targetId: right.id, sourceTerminalId: "t1", targetTerminalId: "t1" };
    const store = createGraphStore([left, middle, right], [first, removed]);
    const movedMiddle = { ...middle, position: { x: 330, y: 120 } };
    const nextFirst = { ...first, manualPoints: [{ x: 220, y: 120 }] };

    const patched = graphStoreApplyPatch(store, {
      nodeUpdates: [movedMiddle],
      edgeUpserts: [nextFirst, added],
      edgeDeleteIds: [removed.id]
    });

    expect(patched.nodeMap.get(middle.id)).toBe(movedMiddle);
    expect(patched.edgeOrder).toEqual([first.id, added.id]);
    expect(patched.edgeMap.get(first.id)).toBe(nextFirst);
    expect(patched.edgeMap.get(removed.id)).toBeUndefined();
    expect(patched.edgeMap.get(added.id)).toBe(added);
    expect(patched.edgesByNodeId.get(middle.id)).toEqual([nextFirst]);
    expect(patched.edgesByNodeId.get(left.id)).toEqual([nextFirst, added]);
    expect(patched.edgesByTerminalRef.get(`${right.id}:t1`)).toEqual([added]);
  });

  test("builds a compatibility node overlay from patched nodes only", () => {
    const left = createDefaultNode("ac-source", { x: 100, y: 100 });
    const right = createDefaultNode("ac-load", { x: 500, y: 100 });
    const store = createGraphStore([left, right], []);
    const movedRight = { ...right, position: { x: 520, y: 120 } };

    const overlay = overlayGraphStoreNodes(store, [movedRight]);

    expect(overlay).toEqual([left, movedRight]);
    expect(overlay[0]).toBe(left);
    expect(overlay[1]).toBe(movedRight);
    expect(store.nodes[1]).toBe(right);
  });
});
