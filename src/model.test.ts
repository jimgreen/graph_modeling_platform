import { describe, expect, test } from "vitest";
import {
  alignNodes,
  buildTopology,
  canConnectTerminals,
  createDefaultNode,
  DEVICE_LIBRARY,
  routeOrthogonalEdge,
  routeEdgesForRendering,
  getTerminalPoint,
  serializeProject,
  deserializeProject,
  type Edge,
  type ModelNode
} from "./model";

describe("power system model", () => {
  test("builds adjacency topology from connection lines", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-bus", { x: 100, y: 100 }),
      createDefaultNode("ac-line", { x: 220, y: 100 }),
      createDefaultNode("ac-load", { x: 340, y: 100 })
    ];
    const edges: Edge[] = [
      { id: "e1", sourceId: nodes[0].id, targetId: nodes[1].id },
      { id: "e2", sourceId: nodes[1].id, targetId: nodes[2].id }
    ];

    const topology = buildTopology(nodes, edges);

    expect(topology.nodes[nodes[1].id].degree).toBe(2);
    expect(topology.nodes[nodes[0].id].neighbors).toEqual([nodes[1].id]);
    expect(topology.connectedComponents).toEqual([[nodes[0].id, nodes[1].id, nodes[2].id]]);
  });

  test("round-trips project files without losing device parameters", () => {
    const node = createDefaultNode("ac-transformer", { x: 160, y: 180 });
    node.name = "1号主变";
    node.params.ratedCapacity = "50 MVA";
    node.params.voltageRatio = "110/10 kV";

    const json = serializeProject({
      version: 1,
      name: "测试模型",
      nodes: [node],
      edges: []
    });
    const loaded = deserializeProject(json);

    expect(loaded.name).toBe("测试模型");
    expect(loaded.nodes[0].name).toBe("1号主变");
    expect(loaded.nodes[0].params.voltageRatio).toBe("110/10 kV");
  });

  test("routes orthogonal connection around interfering devices", () => {
    const source = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 420, y: 100 });
    const blocker = createDefaultNode("ac-switch", { x: 260, y: 100 });

    const points = routeOrthogonalEdge(source, target, [source, target, blocker]);

    expect(points.length).toBeGreaterThan(2);
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const point = points[index];
      expect(prev.x === point.x || prev.y === point.y).toBe(true);
    }
    const blockerBox = {
      left: blocker.position.x - blocker.size.width / 2 - 8,
      right: blocker.position.x + blocker.size.width / 2 + 8,
      top: blocker.position.y - blocker.size.height / 2 - 8,
      bottom: blocker.position.y + blocker.size.height / 2 + 8
    };
    expect(
      points.some(
        (point) =>
          point.x > blockerBox.left &&
          point.x < blockerBox.right &&
          point.y > blockerBox.top &&
          point.y < blockerBox.bottom
      )
    ).toBe(false);
  });

  test("anchors route endpoints on terminals and leaves terminals perpendicularly", () => {
    const source = createDefaultNode("ac-line", { x: 120, y: 120 });
    const target = createDefaultNode("ac-line", { x: 420, y: 120 });
    const edge: Edge = {
      id: "e-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t2");
    const targetTerminal = getTerminalPoint(target, "t1");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[1].y).toBe(sourceTerminal.y);
    expect(points[1].x).toBeGreaterThan(sourceTerminal.x);
    expect(points[points.length - 2].y).toBe(targetTerminal.y);
    expect(points[points.length - 2].x).toBeLessThan(targetTerminal.x);
  });

  test("uses vertical terminal normals for top and bottom terminals", () => {
    const source = createDefaultNode("ac-bus", { x: 200, y: 220 });
    const target = createDefaultNode("ac-bus", { x: 200, y: 520 });
    const edge: Edge = {
      id: "e-vertical-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t4",
      targetTerminalId: "t3"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t4");
    const targetTerminal = getTerminalPoint(target, "t3");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].x).toBe(sourceTerminal.x);
    expect(points[1].y).toBeGreaterThan(sourceTerminal.y);
    expect(points[points.length - 1]).toEqual(targetTerminal);
    expect(points[points.length - 2].x).toBe(targetTerminal.x);
    expect(points[points.length - 2].y).toBeLessThan(targetTerminal.y);
  });

  test("does not choose a shorter path that exits a top terminal sideways", () => {
    const source = createDefaultNode("ac-bus", { x: 200, y: 220 });
    const target = createDefaultNode("ac-line", { x: 520, y: 220 });
    const edge: Edge = {
      id: "e-mixed-terminal",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t3",
      targetTerminalId: "t1"
    };

    const points = routeOrthogonalEdge(source, target, [source, target], edge);
    const sourceTerminal = getTerminalPoint(source, "t3");

    expect(points[0]).toEqual(sourceTerminal);
    expect(points[1].x).toBe(sourceTerminal.x);
    expect(points[1].y).toBeLessThan(sourceTerminal.y);
  });

  test("allows only terminals with the same electrical type to connect", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });

    expect(canConnectTerminals(acBus, acBus.terminals[0].id, acLoad, acLoad.terminals[0].id)).toBe(true);
    expect(canConnectTerminals(acBus, acBus.terminals[0].id, dcLoad, dcLoad.terminals[0].id)).toBe(false);
  });

  test("aligns selected nodes horizontally and vertically without moving unselected nodes", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 260, y: 180 }),
      createDefaultNode("ac-load", { x: 420, y: 260 })
    ];
    const selectedIds = [nodes[0].id, nodes[2].id];

    const horizontal = alignNodes(nodes, selectedIds, "horizontal");
    expect(horizontal.find((node) => node.id === nodes[0].id)?.position.y).toBe(180);
    expect(horizontal.find((node) => node.id === nodes[2].id)?.position.y).toBe(180);
    expect(horizontal.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 260, y: 180 });

    const vertical = alignNodes(nodes, selectedIds, "vertical");
    expect(vertical.find((node) => node.id === nodes[0].id)?.position.x).toBe(260);
    expect(vertical.find((node) => node.id === nodes[2].id)?.position.x).toBe(260);
    expect(vertical.find((node) => node.id === nodes[1].id)?.position).toEqual({ x: 260, y: 180 });
  });

  test("includes specialized AC and DC source device types with matching terminal types", () => {
    const expected = [
      ["ac-wind-source", "ac"],
      ["dc-wind-source", "dc"],
      ["ac-pv-source", "ac"],
      ["dc-pv-source", "dc"],
      ["ac-thermal-source", "ac"],
      ["ac-hydro-source", "ac"],
      ["ac-nuclear-source", "ac"]
    ];

    for (const [kind, terminalType] of expected) {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
      expect(template?.terminalType).toBe(terminalType);
    }
  });

  test("renders crossing connection lines with local arc transitions", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const edges: Edge[] = [
      { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
      { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" }
    ];

    const routes = routeEdgesForRendering([left, right, top, bottom], edges);

    expect(routes[0].path).not.toContain("Q");
    expect(routes[1].path).toContain("Q");
  });
});
