export type DeviceKind =
  | "ac-source"
  | "ac-line"
  | "ac-bus"
  | "ac-switch"
  | "ac-load"
  | "ac-transformer"
  | "dc-source"
  | "dc-line"
  | "dc-bus"
  | "dc-switch"
  | "dc-load"
  | "dc-transformer"
  | "dcdc-converter"
  | "acdc-converter";

export type Point = {
  x: number;
  y: number;
};

export type TerminalType = "ac" | "dc";

export type Terminal = {
  id: string;
  label: string;
  type: TerminalType;
  anchor: Point;
};

export type DeviceTemplate = {
  kind: DeviceKind;
  label: string;
  group: "交流系统" | "直流系统" | "变流设备";
  size: {
    width: number;
    height: number;
  };
  params: Record<string, string>;
  terminalType: TerminalType;
  terminalCount: number;
};

export type ModelNode = {
  id: string;
  kind: DeviceKind;
  name: string;
  position: Point;
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  scale: number;
  terminals: Terminal[];
  params: Record<string, string>;
};

export type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  sourceTerminalId?: string;
  targetTerminalId?: string;
};

export type ProjectFile = {
  version: 1;
  name: string;
  nodes: ModelNode[];
  edges: Edge[];
};

export type Topology = {
  nodes: Record<
    string,
    {
      id: string;
      degree: number;
      neighbors: string[];
      edgeIds: string[];
    }
  >;
  connectedComponents: string[][];
};

export const DEVICE_LIBRARY: DeviceTemplate[] = [
  {
    kind: "ac-source",
    label: "交流电源",
    group: "交流系统",
    size: { width: 84, height: 56 },
    params: { ratedVoltage: "10 kV", frequency: "50 Hz", shortCircuitCapacity: "500 MVA" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-line",
    label: "交流线路",
    group: "交流系统",
    size: { width: 108, height: 36 },
    params: { length: "10 km", r: "0.12 ohm/km", x: "0.38 ohm/km" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-bus",
    label: "交流母线",
    group: "交流系统",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "10 kV", section: "I段" },
    terminalType: "ac",
    terminalCount: 4
  },
  {
    kind: "ac-switch",
    label: "交流开关",
    group: "交流系统",
    size: { width: 72, height: 48 },
    params: { status: "合闸", ratedCurrent: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-load",
    label: "交流负荷",
    group: "交流系统",
    size: { width: 86, height: 58 },
    params: { activePower: "5 MW", reactivePower: "1.2 Mvar", powerFactor: "0.95" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-transformer",
    label: "交流主变",
    group: "交流系统",
    size: { width: 92, height: 70 },
    params: { ratedCapacity: "50 MVA", voltageRatio: "110/10 kV", impedance: "10.5%" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "dc-source",
    label: "直流电源",
    group: "直流系统",
    size: { width: 84, height: 56 },
    params: { ratedVoltage: "750 V", maxCurrent: "2000 A" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-line",
    label: "直流线路",
    group: "直流系统",
    size: { width: 108, height: 36 },
    params: { length: "2 km", resistance: "0.08 ohm/km" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-bus",
    label: "直流母线",
    group: "直流系统",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "750 V", pole: "正负极" },
    terminalType: "dc",
    terminalCount: 4
  },
  {
    kind: "dc-switch",
    label: "直流开关",
    group: "直流系统",
    size: { width: 72, height: 48 },
    params: { status: "合闸", ratedCurrent: "1600 A" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-load",
    label: "直流负荷",
    group: "直流系统",
    size: { width: 86, height: 58 },
    params: { power: "1.5 MW", voltage: "750 V" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-transformer",
    label: "直流主变",
    group: "直流系统",
    size: { width: 92, height: 70 },
    params: { ratedCapacity: "20 MW", voltageRatio: "1500/750 V" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dcdc-converter",
    label: "DCDC变流器",
    group: "变流设备",
    size: { width: 112, height: 66 },
    params: { ratedPower: "5 MW", inputVoltage: "1500 V", outputVoltage: "750 V" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "acdc-converter",
    label: "ACDC变流器",
    group: "变流设备",
    size: { width: 112, height: 66 },
    params: { ratedPower: "10 MW", acVoltage: "10 kV", dcVoltage: "750 V" },
    terminalType: "ac",
    terminalCount: 2
  }
];

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function getTemplate(kind: DeviceKind): DeviceTemplate {
  const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
  if (!template) {
    throw new Error(`Unknown device kind: ${kind}`);
  }
  return template;
}

export function createDefaultNode(kind: DeviceKind, position: Point): ModelNode {
  const template = getTemplate(kind);
  return {
    id: makeId(kind),
    kind,
    name: template.label,
    position,
    size: { ...template.size },
    rotation: 0,
    scale: 1,
    terminals: createTerminals(template.terminalType, template.terminalCount),
    params: { ...template.params }
  };
}

export function createTerminals(type: TerminalType, count: number): Terminal[] {
  const safeCount = Math.max(1, Math.min(8, Math.round(count)));
  if (safeCount === 1) {
    return [{ id: "t1", label: "端子1", type, anchor: { x: 0.5, y: 0 } }];
  }
  if (safeCount === 2) {
    return [
      { id: "t1", label: "端子1", type, anchor: { x: -0.5, y: 0 } },
      { id: "t2", label: "端子2", type, anchor: { x: 0.5, y: 0 } }
    ];
  }
  const anchors = [
    { x: -0.5, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0, y: -0.5 },
    { x: 0, y: 0.5 },
    { x: -0.5, y: -0.25 },
    { x: 0.5, y: -0.25 },
    { x: -0.5, y: 0.25 },
    { x: 0.5, y: 0.25 }
  ];
  return anchors.slice(0, safeCount).map((anchor, index) => ({
    id: `t${index + 1}`,
    label: `端子${index + 1}`,
    type,
    anchor
  }));
}

export function getTerminal(node: ModelNode, terminalId?: string): Terminal {
  return node.terminals.find((terminal) => terminal.id === terminalId) ?? node.terminals[0];
}

export function getTerminalPoint(node: ModelNode, terminalId?: string): Point {
  const terminal = getTerminal(node, terminalId);
  const width = node.size.width * node.scale;
  const height = node.size.height * node.scale;
  const local = {
    x: terminal.anchor.x * width,
    y: terminal.anchor.y * height
  };
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: Math.round(node.position.x + local.x * cos - local.y * sin),
    y: Math.round(node.position.y + local.x * sin + local.y * cos)
  };
}

export function canConnectTerminals(
  source: ModelNode,
  sourceTerminalId: string,
  target: ModelNode,
  targetTerminalId: string
): boolean {
  if (source.id === target.id) {
    return false;
  }
  return getTerminal(source, sourceTerminalId).type === getTerminal(target, targetTerminalId).type;
}

export function buildTopology(nodes: ModelNode[], edges: Edge[]): Topology {
  const topology: Topology = {
    nodes: Object.fromEntries(
      nodes.map((node) => [
        node.id,
        {
          id: node.id,
          degree: 0,
          neighbors: [],
          edgeIds: []
        }
      ])
    ),
    connectedComponents: []
  };

  for (const edge of edges) {
    const source = topology.nodes[edge.sourceId];
    const target = topology.nodes[edge.targetId];
    if (!source || !target) {
      continue;
    }
    source.neighbors.push(edge.targetId);
    source.edgeIds.push(edge.id);
    source.degree += 1;
    target.neighbors.push(edge.sourceId);
    target.edgeIds.push(edge.id);
    target.degree += 1;
  }

  const visited = new Set<string>();
  for (const node of nodes) {
    if (visited.has(node.id)) {
      continue;
    }
    const component: string[] = [];
    const stack = [node.id];
    visited.add(node.id);

    while (stack.length > 0) {
      const id = stack.pop()!;
      component.push(id);
      for (const neighbor of topology.nodes[id].neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    topology.connectedComponents.push(component);
  }

  return topology;
}

export function serializeProject(project: ProjectFile): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json) as ProjectFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Unsupported or invalid model file");
  }
  return parsed;
}

function boxFor(node: ModelNode, padding = 0) {
  const width = node.size.width * node.scale;
  const height = node.size.height * node.scale;
  return {
    left: node.position.x - width / 2 - padding,
    right: node.position.x + width / 2 + padding,
    top: node.position.y - height / 2 - padding,
    bottom: node.position.y + height / 2 + padding
  };
}

function pointInsideBox(point: Point, box: ReturnType<typeof boxFor>) {
  return point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
}

function segmentIntersectsBox(a: Point, b: Point, box: ReturnType<typeof boxFor>) {
  if (pointInsideBox(a, box) || pointInsideBox(b, box)) {
    return true;
  }
  if (a.x === b.x) {
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    return a.x > box.left && a.x < box.right && yMax > box.top && yMin < box.bottom;
  }
  if (a.y === b.y) {
    const xMin = Math.min(a.x, b.x);
    const xMax = Math.max(a.x, b.x);
    return a.y > box.top && a.y < box.bottom && xMax > box.left && xMin < box.right;
  }
  return false;
}

function scoreRoute(points: Point[], blockers: ModelNode[]) {
  let score = points.length * 8;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    score += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (const blocker of blockers) {
      if (segmentIntersectsBox(a, b, boxFor(blocker, 8))) {
        score += 100000;
      }
    }
  }
  return score;
}

function compactRoute(points: Point[]) {
  return points.filter((point, index) => {
    const prev = points[index - 1];
    const next = points[index + 1];
    if (!prev || !next) {
      return true;
    }
    return !(prev.x === point.x && point.x === next.x) && !(prev.y === point.y && point.y === next.y);
  });
}

export function routeOrthogonalEdge(source: ModelNode, target: ModelNode, nodes: ModelNode[], edge?: Edge): Point[] {
  const start = getTerminalPoint(source, edge?.sourceTerminalId);
  const end = getTerminalPoint(target, edge?.targetTerminalId);
  const blockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);
  const midX = Math.round((start.x + end.x) / 2);
  const midY = Math.round((start.y + end.y) / 2);
  const blockerExtents = blockers.map((node) => boxFor(node, 24));
  const topLane = Math.min(start.y, end.y, ...blockerExtents.map((box) => box.top)) - 24;
  const bottomLane = Math.max(start.y, end.y, ...blockerExtents.map((box) => box.bottom)) + 24;
  const leftLane = Math.min(start.x, end.x, ...blockerExtents.map((box) => box.left)) - 24;
  const rightLane = Math.max(start.x, end.x, ...blockerExtents.map((box) => box.right)) + 24;

  const candidates = [
    [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
    [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end],
    [start, { x: start.x, y: topLane }, { x: end.x, y: topLane }, end],
    [start, { x: start.x, y: bottomLane }, { x: end.x, y: bottomLane }, end],
    [start, { x: leftLane, y: start.y }, { x: leftLane, y: end.y }, end],
    [start, { x: rightLane, y: start.y }, { x: rightLane, y: end.y }, end]
  ].map(compactRoute);

  return candidates.sort((a, b) => scoreRoute(a, blockers) - scoreRoute(b, blockers))[0];
}
