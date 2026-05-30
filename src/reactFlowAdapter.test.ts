import { describe, expect, test } from "vitest";
import {
  createDefaultNode,
  getTerminalPoint,
  type Edge
} from "./model";
import { modelToReactFlowElements } from "./reactFlowAdapter";

describe("reactFlowAdapter", () => {
  test("converts model nodes without changing their model identity or geometry meaning", () => {
    const node = createDefaultNode("ac-source", { x: 240, y: 160 });
    const { nodes, edges } = modelToReactFlowElements({ nodes: [node], edges: [] });

    expect(edges).toEqual([]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: node.id,
      type: "modelDevice",
      position: {
        x: node.position.x - node.size.width / 2,
        y: node.position.y - node.size.height / 2
      },
      width: node.size.width,
      height: node.size.height,
      draggable: true,
      selectable: true
    });
    expect(nodes[0].data.modelNode).toBe(node);
    expect(nodes[0].data.kind).toBe(node.kind);
    expect(nodes[0].data.name).toBe(node.name);
  });

  test("converts edges to saved-path React Flow edges without automatic routing", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    const target = createDefaultNode("ac-load", { x: 360, y: 120 });
    const manualPoints = [
      { x: 180, y: 80 },
      { x: 300, y: 80 }
    ];
    const edge: Edge = {
      id: "edge-1",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: source.terminals[0].id,
      targetTerminalId: target.terminals[0].id,
      manualPoints
    };

    const { edges } = modelToReactFlowElements({ nodes: [source, target], edges: [edge] });
    const start = getTerminalPoint(source, edge.sourceTerminalId);
    const end = getTerminalPoint(target, edge.targetTerminalId);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: edge.id,
      source: source.id,
      target: target.id,
      type: "savedPath",
      selectable: true,
      data: {
        modelEdge: edge,
        points: [start, ...manualPoints, end],
        path: `M ${start.x} ${start.y} L 180 80 L 300 80 L ${end.x} ${end.y}`
      }
    });
    expect(edges[0].sourceHandle).toBeUndefined();
    expect(edges[0].targetHandle).toBeUndefined();
    expect(edge.manualPoints).toEqual(manualPoints);
  });

  test("keeps a connection without saved bends as a direct saved endpoint path", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 120 });
    const target = createDefaultNode("ac-load", { x: 360, y: 160 });
    const edge: Edge = {
      id: "edge-2",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: source.terminals[0].id,
      targetTerminalId: target.terminals[0].id
    };

    const { edges } = modelToReactFlowElements({ nodes: [source, target], edges: [edge] });
    const start = getTerminalPoint(source, edge.sourceTerminalId);
    const end = getTerminalPoint(target, edge.targetTerminalId);

    expect(edges).toHaveLength(1);
    const previewEdge = edges[0]!;
    const previewEdgeData = previewEdge.data!;
    expect(previewEdgeData.points).toEqual([start, end]);
    expect(previewEdgeData.path).toBe(`M ${start.x} ${start.y} L ${end.x} ${end.y}`);
  });
});
