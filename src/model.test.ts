import { describe, expect, test } from "vitest";
import {
  buildTopology,
  canConnectTerminals,
  createDefaultNode,
  routeOrthogonalEdge,
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

  test("allows only terminals with the same electrical type to connect", () => {
    const acBus = createDefaultNode("ac-bus", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 240, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 380, y: 100 });

    expect(canConnectTerminals(acBus, acBus.terminals[0].id, acLoad, acLoad.terminals[0].id)).toBe(true);
    expect(canConnectTerminals(acBus, acBus.terminals[0].id, dcLoad, dcLoad.terminals[0].id)).toBe(false);
  });
});
