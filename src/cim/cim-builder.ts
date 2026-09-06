// model state → CimPackage IR 构建器（纯函数，五阶段）

import { deviceParamValue } from "../model";
import type { DeviceKind, Edge, ModelNode } from "../model";
import { CIM_NS } from "./cim-namespaces";
import type { CimBaseVoltage, CimConnectivityNode, CimGeneratingUnit, CimPackage, CimSubstation, CimTerminal, CimVoltageLevel } from "./cim-types";

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
      return root; // 返回压缩后的根，避免并行边 union 场景成环
    }
    return key;
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

// ── 阶段 4a：AC 核心设备映射 ──

export type CimClassDecision = {
  className: string;
  skip?: boolean;
};

/** DeviceKind → CIM 类决策（单一真源，Task 6/7 复用） */
export function cimClassForKind(kind: DeviceKind): CimClassDecision {
  switch (kind) {
    case "ac-line": case "ac-routable-line":
    case "ac-zero-branch": case "ac-zero-routable-branch":
      return { className: "ACLineSegment" };
    case "ac-bus":
      return { className: "BusbarSection" };
    case "ac-transformer": case "ac-two-winding-transformer":
    case "ac-three-winding-transformer": case "ac-three-winding-transformer-neutral":
      return { className: "PowerTransformer" };
    case "ac-load": case "ac-station-load": case "ac-feeder-load":
    case "ac-district-load": case "ac-terminal-transformer-load":
      return { className: "EnergyConsumer" };
    case "ac-source": case "ac-station-source": case "ac-feeder-source":
    case "ac-district-source":
      return { className: "EnergySource" };
    case "ac-wind-source": case "ac-pv-source": case "ac-thermal-source":
    case "ac-diesel-source": case "ac-hydro-source": case "ac-nuclear-source":
    case "ac-storage":
      return { className: "GeneratingUnit" };
    case "ac-breaker": case "ac-box-breaker":
      return { className: "Breaker" };
    case "ac-switch": case "ac-disconnector": case "ac-ground-disconnector":
    case "ac-ground-disconnector-vertical":
      return { className: "Disconnector" };
    case "ac-capacitor": case "ac-reactor":
      return { className: "LinearShuntCompensator" };
    case "ac-series-capacitor": case "ac-series-reactor":
      return { className: "SeriesCompensator" };
    case "dc-line": case "dc-routable-line": case "dc-zero-branch":
    case "dc-bus": case "dc-breaker": case "dc-switch": case "dc-load":
    case "dc-source": case "dc-transformer": case "dcdc-converter":
    case "acdc-converter": case "dcac-converter": case "acac-converter":
    case "dc-storage":
      // CIM16 RDF 对 DC 类支持不全，退化跳过（保持兼容性，留待未来扩展）
      return { className: "", skip: true };
    default:
      return { className: "", skip: true };
  }
}

const GENERATING_UNIT_CLASS_BY_KIND: Record<string, CimGeneratingUnit["cimClass"]> = {
  "ac-wind-source": "WindGeneratingUnit",
  "ac-pv-source": "SolarGeneratingUnit",
  "ac-thermal-source": "ThermalGeneratingUnit",
  "ac-diesel-source": "ThermalGeneratingUnit",
  "ac-nuclear-source": "ThermalGeneratingUnit",
  "ac-hydro-source": "HydroGeneratingUnit",
  "ac-storage": "ThermalGeneratingUnit" // 储能退化为机组占位；细化留待 Task 8 侦察储能参数
};

function numericParam(params: Record<string, string>, keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = String(deviceParamValue(params, key) ?? "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

/** 阶段 4a：单一节点 → IR 设备对象（追加到对应数组） */
function mapDeviceObjects(node: ModelNode, vbaseById: Map<number, string>, sink: CimPackage): void {
  const decision = cimClassForKind(node.kind);
  if (decision.skip) return;
  const nodeRdfId = `N_${node.id}`;
  const baseVoltageId = vbaseById.get(nodePrimaryVoltage(node)) ?? "BV_UNKNOWN";
  switch (decision.className) {
    case "BusbarSection": {
      sink.busbarSections.push({
        rdfId: nodeRdfId,
        name: node.name,
        voltageLevelId: voltageLevelIdForNode(node)
      });
      return;
    }
    case "ACLineSegment": {
      sink.acLineSegments.push({
        rdfId: nodeRdfId,
        name: node.name,
        r: numericParam(node.params, ["r", "r1", "resistance"]) ?? 0,
        x: numericParam(node.params, ["x", "x1", "reactance"]) ?? 0,
        bch: numericParam(node.params, ["b", "bch", "b1"]) ?? 0,
        baseVoltageId
      });
      return;
    }
    case "PowerTransformer": {
      sink.powerTransformers.push({
        rdfId: nodeRdfId,
        name: node.name,
        vectorGroup: String(deviceParamValue(node.params, "vector_group") ?? deviceParamValue(node.params, "vectorGroup") ?? "").trim() || undefined
      });
      const isThree = node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral";
      const sideKeys: Array<[number, string]> = isThree
        ? [[0, "i_vbase"], [1, "k_vbase"], [2, "j_vbase"]]
        : [[0, "i_vbase"], [1, "j_vbase"]];
      const ratedS = numericParam(node.params, ["sn", "rated_s", "rated_capacity", "capacity"]) ?? 0;
      sideKeys.forEach(([sideIndex, voltageKey], index) => {
        const ratedU = numericParam(node.params, [voltageKey]) ?? 0;
        const endId = `PTE_${node.id}_${index + 1}`;
        sink.transformerEnds.push({
          rdfId: endId,
          name: `${node.name}绕组${index + 1}`,
          transformerId: nodeRdfId,
          baseVoltageId: ratedU > 0 ? (vbaseById.get(ratedU) ?? `BV_${ratedU}`) : "BV_UNKNOWN",
          ratedU,
          ratedS: ratedS > 0 ? ratedS : undefined,
          r: 0, x: 0,
          endNumber: index + 1
        });
      });
      return;
    }
    case "EnergyConsumer": {
      sink.energyConsumers.push({
        rdfId: nodeRdfId,
        name: node.name,
        baseVoltageId,
        activePower: numericParam(node.params, ["p", "active_power"]),
        reactivePower: numericParam(node.params, ["q", "reactive_power"])
      });
      return;
    }
    case "EnergySource": {
      sink.energySources.push({
        rdfId: nodeRdfId,
        name: node.name,
        baseVoltageId,
        activePower: numericParam(node.params, ["p", "active_power"]),
        reactivePower: numericParam(node.params, ["q", "reactive_power"])
      });
      return;
    }
    case "GeneratingUnit": {
      sink.generatingUnits.push({
        rdfId: nodeRdfId,
        name: node.name,
        cimClass: GENERATING_UNIT_CLASS_BY_KIND[node.kind] ?? "ThermalGeneratingUnit",
        baseVoltageId,
        ratedGrossMaxP: numericParam(node.params, ["pn", "rated_capacity", "capacity"])
      });
      return;
    }
    case "Breaker":
    case "Disconnector": {
      const closedRaw = String(deviceParamValue(node.params, "closed_status") ?? node.params.status ?? "1").trim();
      sink.switches.push({
        rdfId: nodeRdfId,
        name: node.name,
        cimClass: decision.className === "Breaker" ? "Breaker" : "Disconnector",
        normalOpen: closedRaw === "0" || closedRaw.toLowerCase() === "open"
      });
      return;
    }
    case "LinearShuntCompensator":
    case "SeriesCompensator": {
      sink.shuntCompensators.push({
        rdfId: nodeRdfId,
        name: node.name,
        cimClass: decision.className === "SeriesCompensator" ? "SeriesCompensator" : "LinearShuntCompensator",
        sections: 1
      });
      return;
    }
    default:
      return;
  }
}

/** 节点所属 VoltageLevel rdfId（按主电压线性索引；阶段 2 同序生成） */
function voltageLevelIdForNode(node: ModelNode): string {
  const voltage = nodePrimaryVoltage(node);
  if (voltage <= 0) return "VL_UNKNOWN";
  return `VL_${voltage}`;
}

/** 五阶段总入口。当前实现阶段 1-3 + 4a；阶段 4b/5 由后续任务填充对应数组。 */
export function buildCimPackage(input: CimBuildInput): CimPackage {
  const vbaseById = voltageBaseMap(input.nodes);
  const { substations, voltageLevels } = buildContainers(input, vbaseById);
  const { connectivityNodes, terminals } = inferTopology(input);
  const now = new Date().toISOString();
  const sink: CimPackage = {
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
  // 阶段 4a：AC 核心设备映射
  for (const node of input.nodes) {
    mapDeviceObjects(node, vbaseById, sink);
  }
  return sink;
}
