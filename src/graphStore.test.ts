import { describe, expect, test } from "vitest";
import { createDefaultNode, type Edge } from "./model";
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
    expect(graphStoreNodes(store)).toEqual([source, load]);
    expect(graphStoreEdges(store)).toEqual([edge]);
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
    const nextEdge = { ...edge, id: "edge-2" };
    const next = graphStoreSetEdges(store, [nextEdge]);

    expect(next.edgesByNodeId.get(left.id)).toEqual([nextEdge]);
    expect(next.edgesByNodeId.get(right.id)).toEqual([nextEdge]);
    expect(queryGraphStoreNodeSpatialIndex(next, { left: 0, right: 240, top: 0, bottom: 220 }).map((node) => node.id)).toEqual([left.id]);
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
    expect(patchedGraph.nodeMap.get(left.id)).toBe(movedLeft);
    expect(patchedGraph.edgeMap.get(edge.id)).toBe(nextEdge);
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
