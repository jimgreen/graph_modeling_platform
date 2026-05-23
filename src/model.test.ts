import { describe, expect, test } from "vitest";
import {
  alignNodes,
  buildTopology,
  calculateElectricalTopology,
  canConnectTerminals,
  createSavedProject,
  createDefaultNode,
  deleteNodesWithConnectedEdges,
  deleteSavedProject,
  DEVICE_LIBRARY,
  duplicateSavedProject,
  routeOrthogonalEdge,
  routeEdgesForRendering,
  renameSavedProject,
  upsertSavedProject,
  validateTopology,
  getTerminalPoint,
  isGeneratorNode,
  getSwitchVisualState,
  lockProjectEdgeTerminals,
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

  test("locks connection endpoints to explicit terminals for non-bus devices", () => {
    const source = createDefaultNode("ac-switch", { x: 100, y: 100 });
    const target = createDefaultNode("ac-load", { x: 240, y: 100 });
    const bus = createDefaultNode("ac-bus", { x: 360, y: 100 });

    const locked = lockProjectEdgeTerminals({
      version: 1,
      name: "端子锁定",
      nodes: [source, target, bus],
      edges: [
        {
          id: "non-bus-edge",
          sourceId: source.id,
          targetId: target.id,
          sourcePoint: { x: 123, y: 456 },
          targetPoint: { x: 222, y: 333 }
        },
        {
          id: "bus-edge",
          sourceId: source.id,
          targetId: bus.id,
          sourceTerminalId: "t2",
          targetPoint: { x: 350, y: 100 }
        }
      ]
    });

    expect(locked.edges[0].sourceTerminalId).toBe("t1");
    expect(locked.edges[0].targetTerminalId).toBe("t1");
    expect(locked.edges[0].sourcePoint).toBeUndefined();
    expect(locked.edges[0].targetPoint).toBeUndefined();
    expect(locked.edges[1].sourceTerminalId).toBe("t2");
    expect(locked.edges[1].targetTerminalId).toBe("t1");
    expect(locked.edges[1].targetPoint).toEqual({ x: 350, y: 100 });
  });

  test("creates generator parameters with readonly node numbers and control types", () => {
    const acWind = createDefaultNode("ac-wind-source", { x: 100, y: 100 });
    const dcPv = createDefaultNode("dc-pv-source", { x: 240, y: 100 });

    expect(isGeneratorNode(acWind)).toBe(true);
    expect(acWind.nodeNumber).toMatch(/^N\d+$/);
    expect(acWind.params.ratedCapacity).toBe("50 MW");
    expect(acWind.params.controlType).toBe("PV");
    expect(acWind.params.cutInWindSpeed).toBe("3 m/s");
    expect(acWind.params.ratedWindSpeed).toBe("12 m/s");
    expect(acWind.params.cutOutWindSpeed).toBe("25 m/s");

    expect(dcPv.params.controlType).toBe("P");
    expect(dcPv.params.ratedCapacity).toBe("5 MW");
  });

  test("creates DC source with exactly one DC terminal and one DC node number", () => {
    const dcSource = createDefaultNode("dc-source", { x: 100, y: 100 });

    expect(dcSource.terminals).toHaveLength(1);
    expect(dcSource.terminals[0].id).toBe("t1");
    expect(dcSource.terminals[0].type).toBe("dc");
    expect(dcSource.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(dcSource.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates AC source with exactly one AC terminal and one AC node number", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });

    expect(acSource.terminals).toHaveLength(1);
    expect(acSource.terminals[0].id).toBe("t1");
    expect(acSource.terminals[0].type).toBe("ac");
    expect(acSource.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(acSource.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates load devices with one terminal and one node number", () => {
    const dcLoad = createDefaultNode("dc-load", { x: 100, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 220, y: 100 });

    expect(dcLoad.terminals).toHaveLength(1);
    expect(dcLoad.terminals[0].type).toBe("dc");
    expect(dcLoad.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(dcLoad.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);

    expect(acLoad.terminals).toHaveLength(1);
    expect(acLoad.terminals[0].type).toBe("ac");
    expect(acLoad.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(new Set(acLoad.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(1);
  });

  test("creates DC branch devices with two DC terminals and two DC node numbers", () => {
    const dcKinds = ["dc-switch", "dc-disconnector", "dc-breaker", "dc-line"] as const;

    for (const kind of dcKinds) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals).toHaveLength(2);
      expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
      expect(node.terminals.every((terminal) => terminal.type === "dc")).toBe(true);
      expect(node.terminals[0].nodeNumber).toMatch(/^N\d+$/);
      expect(node.terminals[1].nodeNumber).toMatch(/^N\d+$/);
      expect(new Set(node.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(2);
    }
  });

  test("creates AC branch devices with two AC terminals and two AC node numbers", () => {
    const acKinds = ["ac-switch", "ac-disconnector", "ac-breaker", "ac-line"] as const;

    for (const kind of acKinds) {
      const node = createDefaultNode(kind, { x: 100, y: 100 });
      expect(node.terminals).toHaveLength(2);
      expect(node.terminals.map((terminal) => terminal.id)).toEqual(["t1", "t2"]);
      expect(node.terminals.every((terminal) => terminal.type === "ac")).toBe(true);
      expect(node.terminals[0].nodeNumber).toMatch(/^N\d+$/);
      expect(node.terminals[1].nodeNumber).toMatch(/^N\d+$/);
      expect(new Set(node.terminals.map((terminal) => terminal.nodeNumber)).size).toBe(2);
    }
  });

  test("creates load, line, and transformer electrical parameter defaults", () => {
    const acLoad = createDefaultNode("ac-load", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 200, y: 100 });
    const acLine = createDefaultNode("ac-line", { x: 300, y: 100 });
    const twoWinding = createDefaultNode("ac-two-winding-transformer", { x: 400, y: 100 });
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 500, y: 100 });

    expect(acLoad.nodeNumber).toMatch(/^N\d+$/);
    expect(acLoad.params.ratedActivePower).toBe("5 MW");
    expect(acLoad.params.pv0).toBe("1.0");
    expect(acLoad.params.pv1).toBe("0.0");
    expect(acLoad.params.pv2).toBe("0.0");
    expect(acLoad.params.ratedReactivePower).toBe("1.2 Mvar");
    expect(acLoad.params.qv0).toBe("1.0");
    expect(acLoad.params.qv1).toBe("0.0");
    expect(acLoad.params.qv2).toBe("0.0");
    expect(dcLoad.params.ratedReactivePower).toBeUndefined();

    expect(acLine.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(acLine.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(acLine.params.resistancePu).toBe("0.0");
    expect(acLine.params.reactancePu).toBe("0.1");
    expect(acLine.params.halfChargingSusceptancePu).toBe("0.0");

    expect(twoWinding.terminals).toHaveLength(2);
    expect(twoWinding.params.ratedCapacity).toBe("50 MVA");
    expect(twoWinding.params.resistancePu).toBe("0.0");
    expect(twoWinding.params.reactancePu).toBe("0.1");
    expect(twoWinding.params.magnetizingConductancePu).toBe("0.0");
    expect(twoWinding.params.magnetizingSusceptancePu).toBe("0.0");
    expect(twoWinding.params.tapRatio).toBe("1.0");

    expect(threeWinding.terminals).toHaveLength(3);
    expect(threeWinding.params.highRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.mediumRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.lowRatedCapacity).toBe("90 MVA");
    expect(threeWinding.params.highTapRatio).toBe("1.0");
    expect(threeWinding.params.mediumTapRatio).toBe("1.0");
    expect(threeWinding.params.lowTapRatio).toBe("1.0");

    const dcdc = createDefaultNode("dcdc-converter", { x: 600, y: 100 });
    expect(dcdc.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(dcdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(dcdc.params.targetEquivalentResistance).toBe("0.0");
    expect(dcdc.params.sourceControlType).toBe("定P");
    expect(dcdc.params.targetControlType).toBe("不定");

    const acdc = createDefaultNode("acdc-converter", { x: 700, y: 100 });
    expect(acdc.params.sourceEquivalentResistance).toBe("0.0");
    expect(acdc.params.targetEquivalentResistance).toBe("0.0");
    expect(acdc.params.acControlType).toBe("定PQ");
    expect(acdc.params.dcControlType).toBe("不定");

    const acac = createDefaultNode("acac-converter", { x: 800, y: 100 });
    expect(acac.params.sourceEquivalentResistance).toBe("0.0");
    expect(acac.params.targetEquivalentResistance).toBe("0.0");
    expect(acac.params.sourceControlType).toBe("定PQ");
    expect(acac.params.targetControlType).toBe("不定");

    const dcLine = createDefaultNode("dc-line", { x: 900, y: 100 });
    expect(dcLine.params.resistancePu).toBe("0.0");
    expect(dcLine.params.reactancePu).toBeUndefined();
    expect(dcLine.params.halfChargingSusceptancePu).toBeUndefined();

    const acSwitch = createDefaultNode("ac-disconnector", { x: 1000, y: 100 });
    const dcBreaker = createDefaultNode("dc-breaker", { x: 1100, y: 100 });
    expect(acSwitch.terminals[0].nodeNumber).toMatch(/^N\d+$/);
    expect(acSwitch.terminals[1].nodeNumber).toMatch(/^N\d+$/);
    expect(acSwitch.params.ratedCapacity).toBe("1250 A");
    expect(acSwitch.params.closedStatus).toBe("闭合");
    expect(getSwitchVisualState(acSwitch)).toBe("closed");
    dcBreaker.params.closedStatus = "打开";
    expect(getSwitchVisualState(dcBreaker)).toBe("open");
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

  test("keeps every routed segment orthogonal without diagonal fallbacks", () => {
    const left = createDefaultNode("ac-bus", { x: 100, y: 240 });
    const right = createDefaultNode("ac-bus", { x: 500, y: 240 });
    const top = createDefaultNode("ac-bus", { x: 300, y: 80 });
    const bottom = createDefaultNode("ac-bus", { x: 300, y: 400 });
    const load = createDefaultNode("ac-load", { x: 620, y: 160 });
    const routes = routeEdgesForRendering(
      [left, right, top, bottom, load],
      [
        { id: "horizontal", sourceId: left.id, targetId: right.id, sourceTerminalId: "t2", targetTerminalId: "t1" },
        { id: "vertical", sourceId: top.id, targetId: bottom.id, sourceTerminalId: "t4", targetTerminalId: "t3" },
        { id: "mixed", sourceId: right.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );

    for (const route of routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        const previous = route.points[index - 1];
        const point = route.points[index];
        expect(previous.x === point.x || previous.y === point.y).toBe(true);
      }
    }
  });

  test("does not reroute unrelated lines when a far non-interfering device moves", () => {
    const source = createDefaultNode("ac-source", { x: 120, y: 140 });
    const target = createDefaultNode("ac-load", { x: 420, y: 140 });
    const unrelated = createDefaultNode("ac-switch", { x: 1200, y: 840 });
    const movedUnrelated = { ...unrelated, position: { x: 1400, y: 980 } };
    const edge: Edge = {
      id: "stable-line",
      sourceId: source.id,
      targetId: target.id,
      sourceTerminalId: "t1",
      targetTerminalId: "t1"
    };

    const before = routeEdgesForRendering([source, target, unrelated], [edge])[0].points;
    const after = routeEdgesForRendering([source, target, movedUnrelated], [edge])[0].points;

    expect(after).toEqual(before);
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

  test("connects buses perpendicularly even when legacy terminal ids are present", () => {
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
    expect(points[1].y).not.toBe(sourceTerminal.y);
  });

  test("connects to arbitrary bus points with a perpendicular final segment", () => {
    const source = createDefaultNode("ac-line", { x: 160, y: 120 });
    const bus = createDefaultNode("ac-bus", { x: 420, y: 220 });
    const busPoint = { x: 380, y: 220 };
    const edge: Edge = {
      id: "e-bus-point",
      sourceId: source.id,
      targetId: bus.id,
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      targetPoint: busPoint
    };

    const points = routeOrthogonalEdge(source, bus, [source, bus], edge);
    const finalPoint = points[points.length - 1];
    const beforeFinal = points[points.length - 2];

    expect(finalPoint).toEqual(busPoint);
    expect(beforeFinal.x).toBe(busPoint.x);
    expect(beforeFinal.y).not.toBe(busPoint.y);
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

  test("adds run_stat operating status to every device type", () => {
    for (const template of DEVICE_LIBRARY) {
      const node = createDefaultNode(template.kind, { x: 100, y: 100 });
      expect(node.params.run_stat).toBe("运行");
    }
  });

  test("adds voltage base parameters to devices, transformers, and converters", () => {
    expect(createDefaultNode("ac-load", { x: 100, y: 100 }).params.vbase).toBe("10 kV");
    const twoWinding = createDefaultNode("ac-two-winding-transformer", { x: 200, y: 100 });
    expect(twoWinding.params.highVbase).toBe("110 kV");
    expect(twoWinding.params.lowVbase).toBe("10 kV");
    const threeWinding = createDefaultNode("ac-three-winding-transformer", { x: 300, y: 100 });
    expect(threeWinding.params.highVbase).toBe("220 kV");
    expect(threeWinding.params.mediumVbase).toBe("110 kV");
    expect(threeWinding.params.lowVbase).toBe("10 kV");
    const converter = createDefaultNode("acdc-converter", { x: 400, y: 100 });
    expect(converter.params.sourceVbase).toBe("10 kV");
    expect(converter.params.targetVbase).toBe("750 V");
  });

  test("includes two-winding and three-winding transformer device types", () => {
    const twoWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-two-winding-transformer");
    const threeWinding = DEVICE_LIBRARY.find((item) => item.kind === "ac-three-winding-transformer");

    expect(twoWinding?.terminalType).toBe("ac");
    expect(twoWinding?.terminalCount).toBe(2);
    expect(threeWinding?.terminalType).toBe("ac");
    expect(threeWinding?.terminalCount).toBe(3);
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

  test("manages saved drawing model records", () => {
    const project = createSavedProject("模型A", {
      version: 1,
      name: "模型A",
      nodes: [createDefaultNode("ac-bus", { x: 100, y: 100 })],
      edges: []
    });

    const saved = upsertSavedProject([], project);
    expect(saved).toHaveLength(1);

    const renamed = renameSavedProject(saved, project.id, "模型B");
    expect(renamed[0].name).toBe("模型B");
    expect(renamed[0].project.name).toBe("模型B");

    const copied = duplicateSavedProject(renamed, project.id);
    expect(copied).toHaveLength(2);
    expect(copied[1].name).toBe("模型B 副本");
    expect(copied[1].id).not.toBe(project.id);

    const deleted = deleteSavedProject(copied, project.id);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].name).toBe("模型B 副本");
  });

  test("deletes selected devices and automatically removes their connected lines", () => {
    const nodes: ModelNode[] = [
      createDefaultNode("ac-source", { x: 100, y: 100 }),
      createDefaultNode("ac-switch", { x: 240, y: 100 }),
      createDefaultNode("ac-load", { x: 380, y: 100 })
    ];
    const edges: Edge[] = [
      { id: "e1", sourceId: nodes[0].id, targetId: nodes[1].id },
      { id: "e2", sourceId: nodes[1].id, targetId: nodes[2].id }
    ];

    const result = deleteNodesWithConnectedEdges(nodes, edges, [nodes[1].id]);

    expect(result.nodes.map((node) => node.id)).toEqual([nodes[0].id, nodes[2].id]);
    expect(result.edges).toEqual([]);
  });

  test("calculates terminal topology node numbers by contracting connection lines and buses", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const acBus = createDefaultNode("ac-bus", { x: 240, y: 100 });
    const dcBus = createDefaultNode("dc-bus", { x: 380, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 520, y: 100 });
    const edges: Edge[] = [
      { id: "ac", sourceId: acSource.id, targetId: acBus.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
      { id: "dc", sourceId: dcBus.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
    ];

    const calculated = calculateElectricalTopology([acSource, acBus, dcBus, dcLoad], edges);
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(acSource.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acBus.id)?.acTopologyNode).toBe(1);
    expect(byId.get(acSource.id)?.terminals[0].nodeNumber).toBe("1");
    expect(new Set(byId.get(acBus.id)?.terminals.map((terminal) => terminal.nodeNumber))).toEqual(new Set(["1"]));
    expect(byId.get(dcBus.id)?.dcTopologyNode).toBe(2);
    expect(byId.get(dcLoad.id)?.dcTopologyNode).toBe(2);
    expect(byId.get(dcLoad.id)?.terminals[0].nodeNumber).toBe("2");
    expect(byId.get(dcLoad.id)?.acTopologyNode).toBe(0);
  });

  test("keeps two-terminal branch device endpoint node numbers separate unless connected", () => {
    const source = createDefaultNode("ac-source", { x: 100, y: 100 });
    const line = createDefaultNode("ac-line", { x: 240, y: 100 });
    const load = createDefaultNode("ac-load", { x: 380, y: 100 });

    const calculated = calculateElectricalTopology(
      [source, line, load],
      [
        { id: "source-line", sourceId: source.id, targetId: line.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "line-load", sourceId: line.id, targetId: load.id, sourceTerminalId: "t2", targetTerminalId: "t1" }
      ]
    );
    const byId = new Map(calculated.map((node) => [node.id, node]));

    expect(byId.get(source.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[0].nodeNumber).toBe("1");
    expect(byId.get(line.id)?.terminals[1].nodeNumber).toBe("2");
    expect(byId.get(load.id)?.terminals[0].nodeNumber).toBe("2");
  });

  test("validates floating terminals, mixed terminal types, and voltage mismatch before topology", () => {
    const acSource = createDefaultNode("ac-source", { x: 100, y: 100 });
    const dcLoad = createDefaultNode("dc-load", { x: 220, y: 100 });
    const acLoad = createDefaultNode("ac-load", { x: 340, y: 100 });
    acSource.params.vbase = "10 kV";
    acLoad.params.vbase = "35 kV";
    const errors = validateTopology(
      [acSource, dcLoad, acLoad],
      [
        { id: "mixed", sourceId: acSource.id, targetId: dcLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" },
        { id: "voltage", sourceId: acSource.id, targetId: acLoad.id, sourceTerminalId: "t1", targetTerminalId: "t1" }
      ]
    );

    expect(errors.some((error) => error.type === "terminal-type-mismatch" && error.edgeId === "mixed")).toBe(true);
    expect(errors.some((error) => error.type === "voltage-mismatch" && error.edgeId === "voltage")).toBe(true);

    const loneLoad = createDefaultNode("ac-load", { x: 460, y: 100 });
    const floatingErrors = validateTopology([loneLoad], []);
    expect(floatingErrors.some((error) => error.type === "floating-terminal" && error.nodeId === loneLoad.id)).toBe(true);
  });
});
