import { describe, expect, test } from "vitest";
import {
  buildProject,
  routableLinePointsParam,
  routableLineSourceLocalPointParam,
  routableLineSourceNodeParam,
  routableLineSourceTerminalParam,
  routableLineTargetLocalPointParam,
  routableLineTargetNodeParam,
  routableLineTargetTerminalParam
} from "./generate-ieee-models.mjs";

const busRow = (busNo, baseKv = 110, pd = 0, qd = 0) => [busNo, 1, pd, qd, 0, 0, 0, 1, 0, baseKv];
const genRow = (busNo) => [busNo, 10, 0, 0, 0, 1, 0, 1];
const branchRow = (fromBus, toBus) => [fromBus, toBus, 0.01, 0.1, 0, 0, 0, 0, 0, 0, 1];

const parsePoints = (value) => JSON.parse(value);

const roundedPoint = (point) => ({
  x: Math.round(point.x * 10) / 10,
  y: Math.round(point.y * 10) / 10
});

const busTerminalPoint = (bus, terminalId) => {
  const terminal = bus.terminals.find((item) => item.id === terminalId);
  const width = bus.size.width * Math.abs(bus.scaleX ?? bus.scale ?? 1);
  return roundedPoint({
    x: bus.position.x + terminal.anchor.x * width,
    y: bus.position.y
  });
};

const worldRoutableLinePoints = (line) =>
  parsePoints(line.params[routableLinePointsParam]).map((point) => roundedPoint({
    x: line.position.x + point.x,
    y: line.position.y + point.y
  }));

const terminalWorldPoint = (node, terminalId = "t1") => {
  const terminal = node.terminals.find((item) => item.id === terminalId);
  const width = node.size.width * Math.abs(node.scaleX ?? node.scale ?? 1);
  const height = node.size.height * Math.abs(node.scaleY ?? node.scale ?? 1);
  const radians = ((node.rotation ?? 0) * Math.PI) / 180;
  const local = {
    x: terminal.anchor.x * width,
    y: terminal.anchor.y * height
  };
  return roundedPoint({
    x: node.position.x + local.x * Math.cos(radians) - local.y * Math.sin(radians),
    y: node.position.y + local.x * Math.sin(radians) + local.y * Math.cos(radians)
  });
};

const expectOrthogonalPolyline = (points) => {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    expect(previous.x === current.x || previous.y === current.y).toBe(true);
  }
};

const expectStartPerpendicularToBus = (points) => {
  expect(points.length).toBeGreaterThanOrEqual(2);
  expect(points[1].x).toBe(points[0].x);
  expect(points[1].y).not.toBe(points[0].y);
};

const expectEndPerpendicularToBus = (points) => {
  expect(points.length).toBeGreaterThanOrEqual(2);
  const previous = points.at(-2);
  const last = points.at(-1);
  expect(previous.x).toBe(last.x);
  expect(previous.y).not.toBe(last.y);
};

const expectEvenlyDistributedTerminals = (bus) => {
  const anchors = bus.terminals.map((terminal) => terminal.anchor.x);
  expect(anchors.at(0)).toBeCloseTo(-0.48, 6);
  expect(anchors.at(-1)).toBeCloseTo(0.48, 6);
  const spacing = anchors[1] - anchors[0];
  for (let index = 2; index < anchors.length; index += 1) {
    expect(anchors[index] - anchors[index - 1]).toBeCloseTo(spacing, 6);
  }
};

describe("IEEE model generator", () => {
  test("routes generated branch devices from distributed bus terminals with orthogonal segments", () => {
    const project = buildProject(
      { modelName: "IEEE14", title: "IEEE 14 Bus Test Case" },
      {
        baseMva: 100,
        bus: [busRow(1), busRow(2)],
        gen: [],
        branch: [branchRow(1, 2), branchRow(1, 2), branchRow(1, 2), branchRow(1, 2)]
      }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
    const lines = project.nodes.filter((node) => node.kind === "ac-routable-line");
    const sourcePoints = [];
    const targetPoints = [];

    expect(lines).toHaveLength(4);
    expectEvenlyDistributedTerminals(nodeById.get("ieee14-bus-1"));
    expectEvenlyDistributedTerminals(nodeById.get("ieee14-bus-2"));
    for (const line of lines) {
      const sourceBus = nodeById.get(line.params[routableLineSourceNodeParam]);
      const targetBus = nodeById.get(line.params[routableLineTargetNodeParam]);
      const sourceTerminalId = line.params[routableLineSourceTerminalParam];
      const targetTerminalId = line.params[routableLineTargetTerminalParam];
      const expectedSourcePoint = busTerminalPoint(sourceBus, sourceTerminalId);
      const expectedTargetPoint = busTerminalPoint(targetBus, targetTerminalId);
      const sourceLocalPoint = parsePoints(line.params[routableLineSourceLocalPointParam])[0];
      const targetLocalPoint = parsePoints(line.params[routableLineTargetLocalPointParam])[0];
      const routePoints = worldRoutableLinePoints(line);

      expect(sourceLocalPoint).toEqual(roundedPoint({
        x: expectedSourcePoint.x - sourceBus.position.x,
        y: expectedSourcePoint.y - sourceBus.position.y
      }));
      expect(targetLocalPoint).toEqual(roundedPoint({
        x: expectedTargetPoint.x - targetBus.position.x,
        y: expectedTargetPoint.y - targetBus.position.y
      }));
      expect(routePoints[0]).toEqual(expectedSourcePoint);
      expect(routePoints.at(-1)).toEqual(expectedTargetPoint);
      expectOrthogonalPolyline(routePoints);
      expectStartPerpendicularToBus(routePoints);
      expectEndPerpendicularToBus(routePoints);
      sourcePoints.push(`${expectedSourcePoint.x},${expectedSourcePoint.y}`);
      targetPoints.push(`${expectedTargetPoint.x},${expectedTargetPoint.y}`);
    }
    expect(new Set(sourcePoints).size).toBe(4);
    expect(new Set(targetPoints).size).toBe(4);
  });

  test("rotates directional generators and loads so their terminal side faces the bus", () => {
    const project = buildProject(
      { modelName: "IEEE118", title: "IEEE 118 Bus Test Case" },
      {
        baseMva: 100,
        bus: [busRow(1, 110, 10, 3), busRow(12, 110, 10, 3)],
        gen: [genRow(12)],
        branch: []
      }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
    const edgeById = new Map(project.edges.map((edge) => [edge.id, edge]));
    const bus1 = nodeById.get("ieee118-bus-1");
    const bus12 = nodeById.get("ieee118-bus-12");
    const generator12 = nodeById.get("ieee118-gen-1");
    const load1 = nodeById.get("ieee118-load-1");
    const load12 = nodeById.get("ieee118-load-12");

    expect(generator12.rotation).toBe(180);
    expect(generator12.terminals[0].anchor).toEqual({ x: 0.5, y: 0 });
    expect(terminalWorldPoint(generator12)).toEqual({
      x: generator12.position.x - generator12.size.width / 2,
      y: generator12.position.y
    });
    expect(terminalWorldPoint(generator12).x).toBeLessThan(generator12.position.x);
    expect(Math.abs(terminalWorldPoint(generator12).x - bus12.position.x)).toBeLessThan(Math.abs(generator12.position.x - bus12.position.x));

    expect(load1.rotation).toBe(90);
    expect(load1.terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(terminalWorldPoint(load1).x).toBeGreaterThan(load1.position.x);
    expect(Math.abs(terminalWorldPoint(load1).x - bus1.position.x)).toBeLessThan(Math.abs(load1.position.x - bus1.position.x));

    expect(load12.rotation).toBe(0);
    expect(load12.terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(terminalWorldPoint(load12).y).toBeLessThan(load12.position.y);
    expect(Math.abs(terminalWorldPoint(load12).y - bus12.position.y)).toBeLessThan(Math.abs(load12.position.y - bus12.position.y));

    expectEndPerpendicularToBus(edgeById.get("ieee118-gen-1-edge").routePoints);
    expectStartPerpendicularToBus(edgeById.get("ieee118-load-1-edge").routePoints);
    expectStartPerpendicularToBus(edgeById.get("ieee118-load-12-edge").routePoints);
  });

  test("converts manual side anchors to rotations for generators and loads", () => {
    const project = buildProject(
      { modelName: "IEEE14", title: "IEEE 14 Bus Test Case" },
      {
        baseMva: 100,
        bus: [busRow(2, 110, 10, 3)],
        gen: [genRow(2)],
        branch: []
      }
    );
    const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
    const generator = nodeById.get("ieee14-gen-1");
    const load = nodeById.get("ieee14-load-2");

    expect(generator.rotation).toBe(90);
    expect(generator.terminals[0].anchor).toEqual({ x: 0.5, y: 0 });
    expect(terminalWorldPoint(generator).y).toBeGreaterThan(generator.position.y);

    expect(load.rotation).toBe(0);
    expect(load.terminals[0].anchor).toEqual({ x: 0, y: -0.5 });
    expect(terminalWorldPoint(load).y).toBeLessThan(load.position.y);
  });
});
