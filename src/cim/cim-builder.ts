// model state → CimPackage IR 构建器（纯函数，五阶段）

import { deviceParamValue } from "../model";
import type { Edge, ModelNode } from "../model";
import { CIM_NS } from "./cim-namespaces";
import type { CimBaseVoltage, CimPackage, CimSubstation, CimVoltageLevel } from "./cim-types";

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

/** 五阶段总入口。当前实现阶段 1-2；阶段 3-5 由后续任务填充对应数组。 */
export function buildCimPackage(input: CimBuildInput): CimPackage {
  const vbaseById = voltageBaseMap(input.nodes);
  const { substations, voltageLevels } = buildContainers(input, vbaseById);
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
    connectivityNodes: [],
    terminals: [],
    measurements: []
  };
}
