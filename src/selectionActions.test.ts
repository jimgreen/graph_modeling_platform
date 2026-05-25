import { describe, expect, test } from "vitest";
import { createDefaultNode, routeEdgesForRendering, type Edge } from "./model";
import {
  CANVAS_EMPTY_SELECTION_MESSAGE,
  buildCanvasClipboard,
  canvasClipboardBounds,
  cloneCanvasClipboard,
  resolveCanvasDeleteAction,
  selectGraphicsInRect
} from "./selectionActions";

describe("canvas selection actions", () => {
  test("deletes selected graphics including nodes and connection lines", () => {
    expect(resolveCanvasDeleteAction({ selectedNodeCount: 1, hasSelectedEdge: false })).toEqual({ kind: "delete" });
    expect(resolveCanvasDeleteAction({ selectedNodeCount: 0, hasSelectedEdge: true })).toEqual({ kind: "delete" });
  });

  test("warns when deleting with no selected graphics", () => {
    expect(resolveCanvasDeleteAction({ selectedNodeCount: 0, hasSelectedEdge: false })).toEqual({
      kind: "warn",
      message: CANVAS_EMPTY_SELECTION_MESSAGE
    });
  });

  test("selects nodes and routed connection lines fully enclosed by the marquee rectangle", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const outside = createDefaultNode("dc-load", { x: 500, y: 300 });
    const edge: Edge = {
      id: "edge-in-marquee",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target, outside], [edge], { width: 800, height: 500 });

    const selection = selectGraphicsInRect(
      [source, target, outside],
      routes,
      { left: 0, right: 400, top: 0, bottom: 200 }
    );

    expect(selection.nodeIds).toEqual([source.id, target.id]);
    expect(selection.edgeIds).toEqual([edge.id]);
  });

  test("does not select a graphic that is only partially covered by the marquee rectangle", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-partial",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });

    const selection = selectGraphicsInRect(
      [source, target],
      routes,
      { left: 120, right: 260, top: 70, bottom: 130 }
    );

    expect(selection.nodeIds).toEqual([]);
    expect(selection.edgeIds).toEqual([]);
  });

  test("copies and pastes selected nodes with their selected connection lines", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-to-copy",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [source.id, target.id], [edge.id]);
    const bounds = canvasClipboardBounds(clipboard)!;
    let nextNodeNumber = 1;

    const pasted = cloneCanvasClipboard(
      clipboard,
      { x: 400, y: 300 },
      () => `node-copy-${nextNodeNumber++}`,
      () => "edge-copy"
    );

    expect(pasted.nodes).toHaveLength(2);
    expect(pasted.edges).toHaveLength(1);
    expect(pasted.nodes[0].position).toEqual({
      x: Math.round(source.position.x + 400 - bounds.left),
      y: Math.round(source.position.y + 300 - bounds.top)
    });
    expect(pasted.edges[0]).toEqual(expect.objectContaining({
      id: "edge-copy",
      sourceId: "node-copy-1",
      targetId: "node-copy-2",
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    }));
    expect(pasted.edges[0].manualPoints?.length).toBeGreaterThan(0);
  });

  test("does not paste a selected connection line when its endpoint devices are not copied", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 300, y: 100 });
    const edge: Edge = {
      id: "edge-only",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };
    const routes = routeEdgesForRendering([source, target], [edge], { width: 800, height: 500 });
    const clipboard = buildCanvasClipboard([source, target], [edge], routes, [], [edge.id]);

    const pasted = cloneCanvasClipboard(clipboard, { x: 400, y: 300 }, () => "unused-node", () => "edge-copy");

    expect(pasted.nodes).toHaveLength(0);
    expect(pasted.edges).toHaveLength(0);
  });
});
