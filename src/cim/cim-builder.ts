// model state → CimPackage IR 构建器（纯函数，五阶段）

import { deviceParamValue } from "../model";
import type { Edge, ModelNode } from "../model";
import { CIM_NS } from "./cim-namespaces";
import type { CimBaseVoltage, CimConnectivityNode, CimPackage, CimSubstation, CimTerminal, CimVoltageLevel } from "./cim-types";

export type CimBuildInput = {
  nodes: readonly ModelNode[];
  edges: readonly Edge[];
  projectName: string;
  modelId: string;
};

const VOLTAGE_PARAM_KEYS = ["i_vbase", "j_vbase", "k_vbase", "high_vbase", "medium_vbase", "low_vbase", "source_vbase", "target_vbase"] as const;

/** 节点电压值收集：terminals[].vbase + params 电压 keys；非法值（0/非数字/空）忽略 */
function nodeVoltageValues(node: ModelNode): number[] {
  const found: number[] = [];
  for (const terminal of node.terminals) {
    const raw = String(terminal.vbase ?? "").trim();
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value > 0) {
      found.push(value);
    }
  }
  for (const key of VOLTAGE_PARAM_KEYS) {
    const raw = String(deviceParamValue(node.params, key) ?? "").trim();
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value > 0) {
      found.push(value);
    }
  }
  return found;
}

/** 阶段 1：去重排序提取 BaseVoltage */
export function extractBaseVoltages(nodes: readonly ModelNode[]): CimBaseVoltage[] {
  const values = new Set<number>();
  for (const node of nodes) {
    for (const value of nodeVoltageValues(node)) {
      values.add(value);
    }
  }
  return [...values].sort((a, b) => a - b).map((value) => ({
    rdfId: `BV_${value}`,
    name: `${value}kV`,
    nominalVoltage: value
  }));
}

/** 电压值 → rdfId 映射（阶段 1 副产品，阶段 2-4 复用） */
export function voltageBaseMap(nodes: readonly ModelNode[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const bv of extractBaseVoltages(nodes)) {
    map.set(bv.nominalVoltage, bv.rdfId);
  }
  return map;
}

/** 节点主电压（阶段 2 分组用）：取该节点第一个有效电压值 */
function nodePrimaryVoltage(node: ModelNode): number {
  return nodeVoltageValues(node)[0] ?? 0;
}

/** 阶段 2：当前模型 → 一个 Substation；按主电压分组 → VoltageLevel */
function buildContainers(input: CimBuildInput, vbaseById: Map<number, string>) {
  const substation: CimSubstation = { rdfId: `SUB_${input.modelId}`, name: input.projectName || "未命名" };
  const byVoltage = new Map<number, ModelNode[]>();
  for (const node of input.nodes) {
    const voltage = nodePrimaryVoltage(node);
    if (voltage <= 0) continue;
    const bucket = byVoltage.get(voltage);
    if (bucket) bucket.push(node);
    else byVoltage.set(voltage, [node]);
  }
  const voltageLevels: CimVoltageLevel[] = [...byVoltage.keys()].sort((a, b) => a - b).map((voltage) => ({
    rdfId: `VL_${voltage}`,
    name: `${voltage}kV母线`,
    substationId: substation.rdfId,
    baseVoltageId: vbaseById.get(voltage) ?? `BV_${voltage}`
  }));
  return { substations: [substation], voltageLevels };
}

// ── 阶段 3：拓扑推导 ──
// 服务器组 key："nodeId::terminalId"（端子级），组内所有端子电气等位。

class TerminalUnionFind {
  private parent = new Map<string, string>();
  find(key: string): string {
    const parent = this.parent.get(key);
    if (parent === undefined) {
      this.parent.set(key, key);
      return key;
    }
    if (parent !== key) {
      const root = this.find(parent);
      this.parent.set(key, root);
    }
    return parent;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(rb, ra);
    }
  }
}

function isAcTerminal(terminal: ModelNode["terminals"][number]): boolean {
  return terminal.type === "ac";
}

function validTopologyNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** 阶段 3：端子并查 → ConnectivityNode；每组一个 CN，组内每端子一个 Terminal */
export function inferTopology(input: CimBuildInput): {
  connectivityNodes: CimConnectivityNode[];
  terminals: CimTerminal[];
} {
  const uf = new TerminalUnionFind();
  // a. 每 ac 端子自建组
  for (const node of input.nodes) {
    for (const terminal of node.terminals) {
      if (isAcTerminal(terminal)) {
        uf.find(`${node.id}::${terminal.id}`);
      }
    }
  }
  // b. 显式边合并
  for (const edge of input.edges) {
    if (edge.sourceTerminalId && edge.targetTerminalId) {
      uf.union(`${edge.sourceId}::${edge.sourceTerminalId}`, `${edge.targetId}::${edge.targetTerminalId}`);
    }
  }
  // c. 同 acTopologyNode 节点的全部 ac 端子隐式合并（覆盖 contact/overlap 等隐式连通）
  const terminalsByTopologyKey = new Map<number, string[]>();
  for (const node of input.nodes) {
    if (!validTopologyNumber(node.acTopologyNode)) continue;
    const keys = node.terminals
      .filter((t) => isAcTerminal(t))
      .map((t) => `${node.id}::${t.id}`);
    if (keys.length === 0) continue;
    const bucket = terminalsByTopologyKey.get(node.acTopologyNode);
    if (bucket) bucket.push(...keys);
    else terminalsByTopologyKey.set(node.acTopologyNode, keys);
  }
  for (const bucket of terminalsByTopologyKey.values()) {
    if (bucket.length < 2) continue;
    for (let index = 1; index < bucket.length; index += 1) {
      uf.union(bucket[0], bucket[index]);
    }
  }
  // d. 分组输出
  const groupKeys = new Map<string, string[]>(); // root → terminal keys
  for (const node of input.nodes) {
    for (const terminal of node.terminals) {
      if (!isAcTerminal(terminal)) continue;
      const key = `${node.id}::${terminal.id}`;
      const root = uf.find(key);
      const bucket = groupKeys.get(root);
      if (bucket) bucket.push(key);
      else groupKeys.set(root, [key]);
    }
  }
  const nodesById = new Map(input.nodes.map((n) => [n.id, n]));
  const connectivityNodes: CimConnectivityNode[] = [];
  const terminals: CimTerminal[] = [];
  const sequenceByEquipment = new Map<string, number>();
  let cnIndex = 0;
  let termIndex = 0;
  for (const keys of groupKeys.values()) {
    if (keys.length < 2) continue; // 孤立端子（无显式边/隐式拓扑合并）不生成 CN/Terminal
    cnIndex += 1;
    const cnId = `CN_${cnIndex}`;
    connectivityNodes.push({
      rdfId: cnId,
      name: `节点${cnIndex}`,
      containerId: "VL_UNKNOWN", // 归属电压等级由 Task 7 回填
      containerType: "VoltageLevel"
    });
    for (const key of keys) {
      const [nodeId, terminalId] = key.split("::");
      termIndex += 1;
      const equipmentId = `N_${nodeId}`; // 与 Task 5 设备 rdfId 规则一致
      const seq = (sequenceByEquipment.get(equipmentId) ?? 0) + 1;
      sequenceByEquipment.set(equipmentId, seq);
      terminals.push({
        rdfId: `T_${termIndex}`,
        name: `${nodesById.get(nodeId)?.name ?? nodeId} 端子${terminalId}`,
        conductingEquipmentId: equipmentId,
        connectivityNodeId: cnId,
        sequenceNumber: seq // 设备内端子序号（CIM 语义）
      });
    }
  }
  return { connectivityNodes, terminals };
}

/** 五阶段总入口。当前实现阶段 1-3；阶段 4-5 由后续任务填充对应数组。 */
export function buildCimPackage(input: CimBuildInput): CimPackage {
  const vbaseById = voltageBaseMap(input.nodes);
  const { substations, voltageLevels } = buildContainers(input, vbaseById);
  const { connectivityNodes, terminals } = inferTopology(input);
  const now = new Date().toISOString();
  return {
    fullModel: {
      rdfAbout: `urn:uuid:${input.modelId}`,
      created: now,
      description: "导出自图形建模平台",
      version: 1,
      profile: `${CIM_NS.cim}EquipmentCore`
    },
    substations,
    voltageLevels,
    baseVoltages: extractBaseVoltages(input.nodes),
    busbarSections: [],
    acLineSegments: [],
    powerTransformers: [],
    transformerEnds: [],
    energySources: [],
    energyConsumers: [],
    generatingUnits: [],
    switches: [],
    shuntCompensators: [],
    connectivityNodes,
    terminals,
    measurements: []
  };
}
