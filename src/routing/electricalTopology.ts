/** 电气拓扑计算、电压设定偏差与设备限值校验（从 model-routing.ts 拆分）。 */

import { isTwoWindingTransformerKind } from "../model/types.ts";
import type {
  DeviceKind,
  Edge,
  ModelLayer,
  ModelNode,
  ModelType,
  SavedSchemeRecord,
  Terminal,
  TerminalType,
  TopologyValidationError,
  TopologyValidationErrorType,
} from "../model.ts";
import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_MODEL_LAYER_ID,
  DEFAULT_MODEL_LAYER_NAME,
  DEFAULT_POWER_UNIT,
  DEFAULT_VOLTAGE_UNIT,
  DEVICE_LIBRARY_BY_KIND,
  applyContainerAssociatedDeviceDefaults,
  baseDeviceKind,
  buildContainerDeviceParameterViews,
  containerAssociatedDeviceName,
  containerRelationCounterKey,
  containerRelationParamKey,
  deviceIndexCounterKey,
  deviceParamValue,
  isContainerParams,
  isEndpointContainerKind,
  isStaticNode,
  normalizeVoltageBaseInput,
  parseContainerRelationField,
  parseDeviceIndex,
  terminalVoltageBaseNumber,
  getRatedCapacityDefaultForKind,
  getSwitchingRatedCapacityDefault,
} from "../model.ts";
import {
  inferESection,
  isThreeWindingTransformer,
  isZeroNumericText,
  shouldAssignVoltageSetpointDefault,
  terminalVoltageDisplay,
} from "../model-eexport.ts";
import { decideRatedCapacityFix, ratedCapacityFixKey, type RatedCapacityFixDecision } from "../topology-capacity-fix.ts";

import { getTerminal, isBusNode, synchronizeBusTerminalsWithEdges } from "./routeGeometryPrimitives.ts";

// 导出：voltageInheritance.ts 的同名判定与此**逐字相同**，只差这里的类型守卫标注。
// 单源放在本模块是因为它对 TerminalType 的联合更熟；那边已经 import 本模块
// （voltageBaseSettingModeForNode），不构成循环依赖。
export type ElectricalTerminalType = Extract<TerminalType, "ac" | "dc">;

export function isElectricalTerminalType(type: TerminalType): type is ElectricalTerminalType {
  return type === "ac" || type === "dc";
}

export type TopologyConnectivity = {
  terminalKey: (nodeId: string, terminalId: string) => string;
  topologyRoot: (nodeId: string, terminalId: string) => string;
  islandRoot: (nodeId: string, terminalId: string) => string;
};

/**
 * 从某种子端子出发，沿 edges 收集该侧电气连通岛（含 bus 同类型端子）。
 * 变压器作为分压元件：对侧端子不经本侧边连通，因此天然只收集单侧，
 * 用于"修改变压器某侧电压等级 → 只扩散该侧拓扑岛"。
 */
/** 判断节点是否为变压器（含 vertical 变体）——分压元件，作为电压等级边界 */
export function isTransformerNodeForTopology(node: ModelNode | undefined): boolean {
  if (!node) {
    return false;
  }
  if (isThreeWindingTransformer(node)) {
    return true;
  }
  return isTwoWindingTransformerKind(baseDeviceKind(node.kind));
}

type IslandVoltageGroup = {
  type: ElectricalTerminalType;
  relatedNodeIds: Set<string>;
  voltages: Map<string, string>;
};

export function collectElectricalIslandVoltageGroups(nodes: ModelNode[], connectivity: TopologyConnectivity) {
  const groups = new Map<string, IslandVoltageGroup>();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      if (!isElectricalTerminalType(terminal.type)) {
        continue;
      }
      const root = connectivity.islandRoot(node.id, terminal.id);
      const key = `${terminal.type}:${root}`;
      const group = groups.get(key) ?? { type: terminal.type, relatedNodeIds: new Set<string>(), voltages: new Map<string, string>() };
      group.relatedNodeIds.add(node.id);
      const voltage = terminalVoltageDisplay(node, terminal);
      if (voltage && !isZeroNumericText(voltage)) {
        group.voltages.set(voltage, voltage);
      }
      groups.set(key, group);
    }
  }
  return groups;
}

function normalizeVoltage(value?: string): string {
  return terminalVoltageBaseNumber(value) || (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function getNodeVoltageLevel(node: ModelNode): string {
  return normalizeVoltage(
    node.params.vbase ??
      node.params.voltageLevel ??
      node.params.ratedVoltage ??
      node.params.voltage ??
      node.params.acVoltage ??
      node.params.dcVoltage ??
      ""
  );
}

export function getTerminalVoltageLevel(node: ModelNode, terminalId?: string): string {
  const terminal = getTerminal(node, terminalId);
  return normalizeVoltage(terminal ? terminalVoltageDisplay(node, terminal) : getNodeVoltageLevel(node));
}

/**
 * 端点容器内部成员不属于模型拓扑：容器自身保留顶部端子，成员及其边引用从校验输入剔除。
 * E 文件导出和画布仍使用完整节点集，因此只在校验入口应用这一层过滤。
 */
export function topologyExcludedNodeIds(nodes: ModelNode[]): Set<string> {
  const endpointContainerIds = new Set(
    nodes.filter((node) => isEndpointContainerKind(node.kind)).map((node) => node.id)
  );
  return new Set(
    nodes
      .filter((node) => Boolean(node.containerId) && endpointContainerIds.has(node.containerId!))
      .map((node) => node.id)
  );
}

export function topologyValidationInput(nodes: ModelNode[], edges: Edge[]): { nodes: ModelNode[]; edges: Edge[] } {
  const excludedNodeIds = topologyExcludedNodeIds(nodes);
  if (excludedNodeIds.size === 0) {
    return { nodes, edges };
  }
  return {
    nodes: nodes.filter((node) => !excludedNodeIds.has(node.id)),
    edges: edges.filter((edge) => !excludedNodeIds.has(edge.sourceId) && !excludedNodeIds.has(edge.targetId))
  };
}

export function validateVoltageSetpointDeviations(nodes: ModelNode[], edges: Edge[]): TopologyValidationError[] {
  ({ nodes, edges } = topologyValidationInput(nodes, edges));
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const errors: TopologyValidationError[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const resolveEdgeTerminal = (node: ModelNode, terminalId?: string) => {
    if (terminalId) {
      return node.terminals.find((terminal) => terminal.id === terminalId);
    }
    return node.terminals[0];
  };
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const current = parent.get(key);
    if (!current || current === key) {
      return key;
    }
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  const union = (first: string, second: string) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) {
      parent.set(secondRoot, firstRoot);
    }
  };

  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const key = terminalKey(node.id, terminal.id);
      parent.set(key, key);
    }
    if (isBusNode(node)) {
      const terminalsByType = new Map<TerminalType, Terminal[]>();
      for (const terminal of node.terminals) {
        terminalsByType.set(terminal.type, [...(terminalsByType.get(terminal.type) ?? []), terminal]);
      }
      for (const terminals of terminalsByType.values()) {
        const [first, ...rest] = terminals;
        for (const terminal of rest) {
          union(terminalKey(node.id, first.id), terminalKey(node.id, terminal.id));
        }
      }
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    const sourceTerminal = source ? resolveEdgeTerminal(source, edge.sourceTerminalId) : undefined;
    const targetTerminal = target ? resolveEdgeTerminal(target, edge.targetTerminalId) : undefined;
    if (!source || !target || !sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) {
      continue;
    }
    union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));
  }

  const voltageGroups = new Map<
    string,
    {
      voltages: Map<string, string>;
    }
  >();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const root = find(terminalKey(node.id, terminal.id));
      const group = voltageGroups.get(root) ?? { voltages: new Map<string, string>() };
      const voltage = getTerminalVoltageLevel(node, terminal.id);
      if (voltage && !isZeroNumericText(voltage)) {
        group.voltages.set(voltage, voltage);
      }
      voltageGroups.set(root, group);
    }
  }

  const ratedVoltageForTerminal = (node: ModelNode, terminal?: Terminal) => {
    if (!terminal) {
      return "";
    }
    const root = find(terminalKey(node.id, terminal.id));
    const group = voltageGroups.get(root);
    if (group?.voltages.size === 1) {
      return terminalVoltageBaseNumber(Array.from(group.voltages.values())[0]);
    }
    return terminalVoltageDisplay(node, terminal);
  };
  const addVoltageSetpointDeviation = (node: ModelNode, paramKey: string, terminal?: Terminal) => {
    if (isZeroNumericText(node.params[paramKey])) {
      return;
    }
    const setpoint = terminalVoltageBaseNumber(node.params[paramKey]);
    const ratedVoltage = ratedVoltageForTerminal(node, terminal);
    if (!setpoint || !ratedVoltage) {
      return;
    }
    const setpointValue = Number(setpoint);
    const ratedVoltageValue = Number(ratedVoltage);
    if (!Number.isFinite(setpointValue) || !Number.isFinite(ratedVoltageValue) || ratedVoltageValue <= 0) {
      return;
    }
    const deviation = Math.abs(setpointValue - ratedVoltageValue) / ratedVoltageValue;
    if (deviation <= 0.3) {
      return;
    }
    errors.push({
      id: `voltage-setpoint-deviation:${node.id}:${paramKey}`,
      type: "voltage-setpoint-deviation",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `${node.name} 的 ${paramKey}=${setpoint} 与节点额定电压 ${ratedVoltage} 偏差超过 30%。`
    });
  };

  for (const node of nodes) {
    if (isStaticNode(node)) {
      continue;
    }
    const ratedVoltage = terminalVoltageBaseNumber(node.params.rated_voltage);
    if (ratedVoltage && !isZeroNumericText(ratedVoltage)) {
      const topologyVoltageBases = new Set(
        node.terminals
          .filter((terminal) => isElectricalTerminalType(terminal.type))
          .map((terminal) => terminalVoltageBaseNumber(terminal.vbase))
          .filter((voltage) => Boolean(voltage) && !isZeroNumericText(voltage))
      );
      if (topologyVoltageBases.size === 0 && node.terminals.length === 0) {
        const standaloneVoltageBase = terminalVoltageBaseNumber(node.params.vbase);
        if (standaloneVoltageBase && !isZeroNumericText(standaloneVoltageBase)) {
          topologyVoltageBases.add(standaloneVoltageBase);
        }
      }
      const ratedVoltageValue = Number(ratedVoltage);
      for (const topologyVoltageBase of topologyVoltageBases) {
        const topologyVoltageBaseValue = Number(topologyVoltageBase);
        if (
          !Number.isFinite(ratedVoltageValue) ||
          !Number.isFinite(topologyVoltageBaseValue) ||
          topologyVoltageBaseValue <= 0
        ) {
          continue;
        }
        const deviation = Math.abs(ratedVoltageValue - topologyVoltageBaseValue) / topologyVoltageBaseValue;
        if (deviation <= 0.3) {
          continue;
        }
        errors.push({
          id: `rated-voltage-deviation:${node.id}:${encodeURIComponent(topologyVoltageBase)}`,
          type: "rated-voltage-deviation",
          nodeId: node.id,
          relatedNodeIds: [node.id],
          message: `图上拓扑失败：${node.name} 的额定电压 ${ratedVoltage} 与对应节点电压基值 ${topologyVoltageBase} 偏差超过 30%。`
        });
        break;
      }
    }
    const section = inferESection(node.kind, node.params);
    const checkedVoltageSetpointKeys = new Set<string>();
    const addNodeVoltageSetpointDeviation = (paramKey: string, terminal?: Terminal) => {
      if (checkedVoltageSetpointKeys.has(paramKey)) {
        return;
      }
      checkedVoltageSetpointKeys.add(paramKey);
      addVoltageSetpointDeviation(node, paramKey, terminal);
    };
    if (section === "ACGenerator" || section === "DCGenerator" || section === "ACShuntCompensator") {
      const expectedType: TerminalType = section === "DCGenerator" ? "dc" : "ac";
      addNodeVoltageSetpointDeviation("v_set", node.terminals.find((terminal) => terminal.type === expectedType) ?? node.terminals[0]);
    }
    if (section === "DCDCConverter") {
      addNodeVoltageSetpointDeviation("i_v_set", node.terminals[0]);
      addNodeVoltageSetpointDeviation("j_v_set", node.terminals[1]);
    }
    if (section === "DCACConverter") {
      addNodeVoltageSetpointDeviation("v_ac_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_dc_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
    }
    if (section === "ACACConverter") {
      addNodeVoltageSetpointDeviation("i_v_set", node.terminals[0]);
      addNodeVoltageSetpointDeviation("j_v_set", node.terminals[1]);
    }
    if (isContainerParams(node.params)) {
      for (const fieldName of Object.keys(node.params)) {
        const relationSection = containerRelationCounterKey(fieldName);
        if (relationSection !== "ACGenerator" && relationSection !== "DCGenerator") {
          continue;
        }
        const parsed = parseContainerRelationField(fieldName);
        if (!parsed) {
          continue;
        }
        addNodeVoltageSetpointDeviation(containerRelationParamKey(fieldName, "v_set"), node.terminals[parsed.terminalNumber - 1]);
      }
    }
  }

  return errors;
}

type DeviceIdentityValidationEntry = {
  typeKey: string;
  idx: string;
  name: string;
  node: ModelNode;
};

function identityValidationEntriesForNode(node: ModelNode): DeviceIdentityValidationEntry[] {
  if (isStaticNode(node)) {
    return [];
  }
  const localName = String(node.name ?? "").trim();
  const identityNode = localName === node.name
    ? node
    : { ...node, name: localName || String(node.id ?? "").trim() || "未命名设备" };
  const entries: DeviceIdentityValidationEntry[] = [];
  const primaryTypeKey = deviceIndexCounterKey(node);
  const idx = parseDeviceIndex(node.params.idx);
  if (primaryTypeKey) {
    entries.push({
      typeKey: primaryTypeKey,
      idx: idx > 0 ? String(idx) : "",
      name: localName,
      node: identityNode
    });
  }
  if (isContainerParams(node.params)) {
    for (const [fieldName, value] of Object.entries(node.params)) {
      const relationTypeKey = containerRelationCounterKey(fieldName);
      const relationIdx = parseDeviceIndex(value);
      if (!relationTypeKey || relationIdx <= 0) {
        continue;
      }
      entries.push({
        typeKey: relationTypeKey,
        idx: String(relationIdx),
        name: containerAssociatedDeviceName(identityNode, fieldName),
        node: identityNode
      });
    }
  }
  return entries;
}

type DeviceLimitTerminalSelector = "default" | "ac" | "dc" | "i" | "j" | "t3";

type DeviceLimitPairSpec = {
  maxKey: string;
  minKey: string;
  label: string;
  voltage: boolean;
  terminalSelector: DeviceLimitTerminalSelector;
};

type DeviceSetpointLimitSpec = {
  setKey: string;
  maxKey: string;
  minKey?: string;
  implicitMin?: number;
  label: string;
  quantity: "power" | "voltage" | "current" | "numeric";
  terminalSelector?: DeviceLimitTerminalSelector;
  legacyAlias?: boolean;
};

const DEVICE_LIMIT_PAIR_SPECS: DeviceLimitPairSpec[] = [
  { maxKey: "p_max", minKey: "p_min", label: "有功", voltage: false, terminalSelector: "default" },
  { maxKey: "q_max", minKey: "q_min", label: "无功", voltage: false, terminalSelector: "default" },
  { maxKey: "v_max", minKey: "v_min", label: "电压", voltage: true, terminalSelector: "default" },
  { maxKey: "ac_p_max", minKey: "ac_p_min", label: "交流侧有功", voltage: false, terminalSelector: "ac" },
  { maxKey: "ac_q_max", minKey: "ac_q_min", label: "交流侧无功", voltage: false, terminalSelector: "ac" },
  { maxKey: "ac_v_max", minKey: "ac_v_min", label: "交流侧电压", voltage: true, terminalSelector: "ac" },
  { maxKey: "dc_p_max", minKey: "dc_p_min", label: "直流侧有功", voltage: false, terminalSelector: "dc" },
  { maxKey: "dc_v_max", minKey: "dc_v_min", label: "直流侧电压", voltage: true, terminalSelector: "dc" },
  { maxKey: "i_p_max", minKey: "i_p_min", label: "首端有功", voltage: false, terminalSelector: "i" },
  { maxKey: "i_q_max", minKey: "i_q_min", label: "首端无功", voltage: false, terminalSelector: "i" },
  { maxKey: "i_v_max", minKey: "i_v_min", label: "首端电压", voltage: true, terminalSelector: "i" },
  { maxKey: "j_p_max", minKey: "j_p_min", label: "末端有功", voltage: false, terminalSelector: "j" },
  { maxKey: "j_q_max", minKey: "j_q_min", label: "末端无功", voltage: false, terminalSelector: "j" },
  { maxKey: "j_v_max", minKey: "j_v_min", label: "末端电压", voltage: true, terminalSelector: "j" }
];

const DEVICE_SETPOINT_LIMIT_SPECS_BY_SECTION: Record<string, DeviceSetpointLimitSpec[]> = {
  ACGenerator: [
    { setKey: "p_set", maxKey: "p_max", minKey: "p_min", label: "有功设定值", quantity: "power" },
    { setKey: "q_set", maxKey: "q_max", minKey: "q_min", label: "无功设定值", quantity: "power" },
    { setKey: "v_set", maxKey: "v_max", minKey: "v_min", label: "电压设定值", quantity: "voltage", terminalSelector: "default" }
  ],
  DCGenerator: [
    { setKey: "p_set", maxKey: "p_max", minKey: "p_min", label: "有功设定值", quantity: "power" },
    { setKey: "i_set", maxKey: "i_max", implicitMin: 0, label: "电流设定值", quantity: "current" },
    { setKey: "v_set", maxKey: "v_max", minKey: "v_min", label: "电压设定值", quantity: "voltage", terminalSelector: "default" }
  ],
  ACLoad: [
    { setKey: "p_set", maxKey: "p_max", minKey: "p_min", label: "有功设定值", quantity: "power" }
  ],
  DCLoad: [
    { setKey: "p_set", maxKey: "p_max", minKey: "p_min", label: "有功设定值", quantity: "power" }
  ],
  DCACConverter: [
    { setKey: "p_ac_set", maxKey: "ac_p_max", minKey: "ac_p_min", label: "交流侧有功设定值", quantity: "power" },
    { setKey: "q_ac_set", maxKey: "ac_q_max", minKey: "ac_q_min", label: "交流侧无功设定值", quantity: "power" },
    { setKey: "v_ac_set", maxKey: "ac_v_max", minKey: "ac_v_min", label: "交流侧电压设定值", quantity: "voltage", terminalSelector: "ac" },
    { setKey: "p_dc_set", maxKey: "dc_p_max", minKey: "dc_p_min", label: "直流侧有功设定值", quantity: "power" },
    { setKey: "i_dc_set", maxKey: "dc_i_max", implicitMin: 0, label: "直流侧电流设定值", quantity: "current", terminalSelector: "dc" },
    { setKey: "v_dc_set", maxKey: "dc_v_max", minKey: "dc_v_min", label: "直流侧电压设定值", quantity: "voltage", terminalSelector: "dc" }
  ],
  ACACConverter: [
    { setKey: "i_p_set", maxKey: "i_p_max", minKey: "i_p_min", label: "首端有功设定值", quantity: "power" },
    { setKey: "j_p_set", maxKey: "j_p_max", minKey: "j_p_min", label: "末端有功设定值", quantity: "power" },
    { setKey: "i_q_set", maxKey: "i_q_max", minKey: "i_q_min", label: "首端无功设定值", quantity: "power" },
    { setKey: "j_q_set", maxKey: "j_q_max", minKey: "j_q_min", label: "末端无功设定值", quantity: "power" },
    { setKey: "i_v_set", maxKey: "i_v_max", minKey: "i_v_min", label: "首端电压设定值", quantity: "voltage", terminalSelector: "i" },
    { setKey: "j_v_set", maxKey: "j_v_max", minKey: "j_v_min", label: "末端电压设定值", quantity: "voltage", terminalSelector: "j" }
  ],
  DCDCConverter: [
    // DCDC setpoints are endpoint-specific and resolved per instance below.
  ],
  HydroSource: [
    { setKey: "pressure_set", maxKey: "pressure_max", minKey: "pressure_min", label: "压力设定值", quantity: "numeric" },
    { setKey: "flow_set", maxKey: "flow_max", minKey: "flow_min", label: "流量设定值", quantity: "numeric" }
  ],
  HydroLoad: [
    { setKey: "pressure_set", maxKey: "pressure_max", minKey: "pressure_min", label: "压力设定值", quantity: "numeric" },
    { setKey: "flow_set", maxKey: "flow_max", minKey: "flow_min", label: "流量设定值", quantity: "numeric" }
  ]
};

const REQUIRED_VOLTAGE_LIMIT_KEYS_BY_SECTION: Record<string, ReadonlySet<string>> = {
  ACRealBs: new Set(["v_max"]),
  DCRealBs: new Set(["v_max"]),
  ACLoad: new Set(["v_max"]),
  DCLoad: new Set(["v_max"]),
  ACGenerator: new Set(["v_max"]),
  DCGenerator: new Set(["v_max"]),
  DCDCConverter: new Set(["i_v_max", "j_v_max"]),
  DCACConverter: new Set(["ac_v_max", "dc_v_max"]),
  ACACConverter: new Set(["i_v_max", "j_v_max"])
};

const REQUIRED_POWER_LIMIT_KEYS_BY_SECTION: Record<string, ReadonlySet<string>> = {
  ACLoad: new Set(["p_max", "q_max"]),
  DCLoad: new Set(["p_max"]),
  ACGenerator: new Set(["p_max", "q_max"]),
  DCGenerator: new Set(["p_max"]),
  DCDCConverter: new Set(["i_p_max", "j_p_max"]),
  DCACConverter: new Set(["ac_p_max", "ac_q_max", "dc_p_max"]),
  ACACConverter: new Set(["i_p_max", "i_q_max", "j_p_max", "j_q_max"])
};

type DeviceLimitQuantity = "power" | "voltage" | "current";

export type DeviceOperatingLimitNormalizationOptions = {
  powerUnit?: string;
  voltageUnit?: string;
  currentUnit?: string;
  skipVoltageNodeIds?: ReadonlySet<string>;
  sourceNodes?: readonly ModelNode[];
  /**
   * 拓扑检查范围标识（模型唯一键）。传入后，额定容量无效的设备走两段式处理：
   * 首次检查只报告警、第二次检查才赋合理值并消除告警。
   * 合理值来源：线路/负荷按电压等级容量表；开关类设备（rated_capacity 即额定电流）取默认额定电流。
   * 缺省时保持原有「首次即自动填充」行为，供非检查入口使用。
   */
  capacityFixScopeKey?: string;
};

export type DeviceOperatingLimitCorrection = {
  nodeId: string;
  paramKey: string;
  value: string;
};

type RatedCurrentSpec = {
  currentKey: string;
  capacityKey: string;
  terminalSelector: DeviceLimitTerminalSelector;
  label: string;
};

const UNIT_FACTOR_BY_QUANTITY: Record<DeviceLimitQuantity, Record<string, number>> = {
  power: { W: 1, kW: 1_000, MW: 1_000_000 },
  voltage: { V: 1, kV: 1_000 },
  current: { A: 1, kA: 1_000 }
};

const RATED_CURRENT_SPECS_BY_SECTION: Record<string, RatedCurrentSpec[]> = {
  ACBranch: [{ currentKey: "i_max", capacityKey: "rated_capacity", terminalSelector: "default", label: "最大电流" }],
  DCBranch: [{ currentKey: "i_max", capacityKey: "rated_capacity", terminalSelector: "default", label: "最大电流" }],
  ACBreak: [{ currentKey: "i_max", capacityKey: "rated_capacity", terminalSelector: "default", label: "最大电流" }],
  DCBreak: [{ currentKey: "i_max", capacityKey: "rated_capacity", terminalSelector: "default", label: "最大电流" }],
  ACTransformer: [
    { currentKey: "i_i_max", capacityKey: "rated_capacity", terminalSelector: "i", label: "高压侧最大电流" },
    { currentKey: "j_i_max", capacityKey: "rated_capacity", terminalSelector: "j", label: "低压侧最大电流" }
  ],
  ACTransfomer3: [
    { currentKey: "i_i_max", capacityKey: "i_rated_capacity", terminalSelector: "i", label: "高压侧最大电流" },
    { currentKey: "k_i_max", capacityKey: "k_rated_capacity", terminalSelector: "j", label: "中压侧最大电流" },
    { currentKey: "j_i_max", capacityKey: "j_rated_capacity", terminalSelector: "t3", label: "低压侧最大电流" }
  ],
  DCGenerator: [
    { currentKey: "i_max", capacityKey: "rated_capacity", terminalSelector: "default", label: "最大电流" }
  ],
  DCDCConverter: [
    { currentKey: "i_i_max", capacityKey: "rated_capacity", terminalSelector: "i", label: "首端最大电流" },
    { currentKey: "j_i_max", capacityKey: "rated_capacity", terminalSelector: "j", label: "末端最大电流" }
  ],
  DCACConverter: [
    { currentKey: "ac_i_max", capacityKey: "rated_capacity", terminalSelector: "ac", label: "交流侧最大电流" },
    { currentKey: "dc_i_max", capacityKey: "rated_capacity", terminalSelector: "dc", label: "直流侧最大电流" }
  ],
  ACACConverter: [
    { currentKey: "i_i_max", capacityKey: "rated_capacity", terminalSelector: "i", label: "首端最大电流" },
    { currentKey: "j_i_max", capacityKey: "rated_capacity", terminalSelector: "j", label: "末端最大电流" }
  ]
};

const THREE_PHASE_CURRENT_DIVISOR = 1.732;

function namedNumericValue(value: string | undefined): number | null {
  const token = String(value ?? "").trim().match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/)?.[0];
  if (!token) {
    return null;
  }
  const numeric = Number(token);
  return Number.isFinite(numeric) ? numeric : null;
}

const STORAGE_SOC_SECTIONS = new Set(["ACGenerator", "DCGenerator", "HydroStorage", "HeatStorage"]);

function isStorageSocNode(node: ModelNode, ownerSection: string): boolean {
  const kind = baseDeviceKind(node.kind).toLowerCase();
  if (kind === "ac-storage" || kind === "dc-storage" || kind.includes("storage-tank")) {
    return true;
  }
  if (ownerSection === "HydroStorage" || ownerSection === "HeatStorage") {
    return true;
  }
  const sourceType = String(deviceParamValue(node.params, "source_type") ?? "").trim().toLowerCase();
  return STORAGE_SOC_SECTIONS.has(ownerSection) && (
    sourceType === "储能" || sourceType === "storage" || sourceType === "battery"
  );
}

function validateStorageSocParameters(
  node: ModelNode,
  ownerName: string,
  keyFor: (key: string) => string,
  ownerSection: string,
  updateParam: (key: string, value: string) => void
): TopologyValidationError[] {
  if (!isStorageSocNode(node, ownerSection)) {
    return [];
  }
  const upperKey = keyFor("soc_upper_limit");
  const socKey = keyFor("soc");
  const lowerKey = keyFor("soc_lower_limit");
  const upperText = deviceParamValue(node.params, upperKey);
  const socText = deviceParamValue(node.params, socKey);
  const lowerText = deviceParamValue(node.params, lowerKey);
  const upper = namedNumericValue(upperText);
  const soc = namedNumericValue(socText);
  const lower = namedNumericValue(lowerText);
  if (
    upper !== null &&
    soc !== null &&
    lower !== null &&
    upper <= 1 &&
    upper > soc &&
    soc > lower &&
    lower >= 0
  ) {
    return [];
  }
  updateParam(upperKey, "0.9");
  updateParam(socKey, "0.5");
  updateParam(lowerKey, "0.1");
  return [{
    id: `storage-soc-parameter-invalid:${node.id}:${encodeURIComponent(upperKey)}:${encodeURIComponent(socKey)}:${encodeURIComponent(lowerKey)}`,
    type: "storage-soc-parameter-invalid",
    nodeId: node.id,
    relatedNodeIds: [node.id],
    message: `图上拓扑告警：${ownerName} 的SOC参数无效，修正前为 ${upperKey}=${upperText ?? "未设置"}、${socKey}=${socText ?? "未设置"}、${lowerKey}=${lowerText ?? "未设置"}；必须满足 1 >= ${upperKey} > ${socKey} > ${lowerKey} >= 0，已自动修正为 ${upperKey}=0.9、${socKey}=0.5、${lowerKey}=0.1。`
  }];
}

function normalizedQuantityUnit(quantity: DeviceLimitQuantity, value: string | undefined): string | null {
  const token = String(value ?? "").trim().toLowerCase();
  if (quantity === "power") {
    return token === "w" ? "W" : token === "kw" ? "kW" : token === "mw" ? "MW" : null;
  }
  if (quantity === "voltage") {
    return token === "v" ? "V" : token === "kv" ? "kV" : null;
  }
  return token === "a" ? "A" : token === "ka" ? "kA" : null;
}

function explicitQuantityUnit(quantity: DeviceLimitQuantity, value: string | undefined): string | null {
  const text = String(value ?? "").trim();
  const pattern = quantity === "power"
    ? /(?:MW|kW|W)\s*$/i
    : quantity === "voltage"
      ? /(?:kV|V)\s*$/i
      : /(?:kA|A)\s*$/i;
  return normalizedQuantityUnit(quantity, text.match(pattern)?.[0]?.trim());
}

function defaultQuantityUnit(quantity: DeviceLimitQuantity, options: DeviceOperatingLimitNormalizationOptions): string {
  const configured = quantity === "power"
    ? options.powerUnit
    : quantity === "voltage"
      ? options.voltageUnit
      : options.currentUnit;
  const fallback = quantity === "power"
    ? DEFAULT_POWER_UNIT
    : quantity === "voltage"
      ? DEFAULT_VOLTAGE_UNIT
      : DEFAULT_CURRENT_UNIT;
  return normalizedQuantityUnit(quantity, configured) ?? fallback;
}

function quantityValue(
  value: string | undefined,
  quantity: DeviceLimitQuantity,
  fallbackUnit: string
): { baseValue: number; unit: string } | null {
  const numeric = namedNumericValue(value);
  const unit = explicitQuantityUnit(quantity, value) ?? normalizedQuantityUnit(quantity, fallbackUnit);
  if (numeric === null || !unit) {
    return null;
  }
  return { baseValue: numeric * UNIT_FACTOR_BY_QUANTITY[quantity][unit], unit };
}

function compactDeviceLimitNumber(value: number): string {
  const rounded = Number(value.toPrecision(12));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function quantityValueInUnit(baseValue: number, quantity: DeviceLimitQuantity, unit: string): string {
  return compactDeviceLimitNumber(baseValue / UNIT_FACTOR_BY_QUANTITY[quantity][unit]);
}

function terminalVoltageTextForDeviceLimit(node: ModelNode, terminal: Terminal | undefined): string {
  const rawTerminalVoltage = terminal?.vbase;
  return explicitQuantityUnit("voltage", rawTerminalVoltage)
    ? String(rawTerminalVoltage)
    : terminal
      ? terminalVoltageDisplay(node, terminal)
      : getNodeVoltageLevel(node);
}

function terminalForDeviceLimit(node: ModelNode, selector: DeviceLimitTerminalSelector): Terminal | undefined {
  if (selector === "ac" || selector === "dc") {
    return node.terminals.find((terminal) => terminal.type === selector);
  }
  if (selector === "i") {
    return node.terminals[0];
  }
  if (selector === "j") {
    return node.terminals[1];
  }
  if (selector === "t3") {
    return node.terminals[2];
  }
  return node.terminals.find((terminal) => isElectricalTerminalType(terminal.type)) ?? node.terminals[0];
}

type VoltageSetpointDefaultSpec = {
  paramKey: string;
  terminalSelector: DeviceLimitTerminalSelector;
};

function voltageSetpointDefaultSpecs(node: ModelNode): VoltageSetpointDefaultSpec[] {
  const section = inferESection(node.kind, node.params);
  if (section === "ACGenerator") {
    return [{ paramKey: "v_set", terminalSelector: "ac" }];
  }
  if (section === "DCGenerator") {
    return [{ paramKey: "v_set", terminalSelector: "dc" }];
  }
  if (section === "DCDCConverter") {
    return deviceSetpointLimitSpecs(node, section)
      .filter((spec) => spec.quantity === "voltage")
      .map((spec) => ({
        paramKey: spec.setKey,
        terminalSelector: spec.terminalSelector ?? "default"
      }));
  }
  if (section === "DCACConverter") {
    return [
      { paramKey: "v_ac_set", terminalSelector: "ac" },
      { paramKey: "v_dc_set", terminalSelector: "dc" }
    ];
  }
  if (section === "ACACConverter") {
    return [
      { paramKey: "i_v_set", terminalSelector: "i" },
      { paramKey: "j_v_set", terminalSelector: "j" }
    ];
  }
  return [];
}

function deviceSetpointLimitSpecs(node: ModelNode, ownerSection: string): DeviceSetpointLimitSpec[] {
  const specs = [...(DEVICE_SETPOINT_LIMIT_SPECS_BY_SECTION[ownerSection] ?? [])];
  if (ownerSection !== "DCDCConverter") {
    return specs;
  }
  specs.push(
    { setKey: "i_p_set", maxKey: "i_p_max", minKey: "i_p_min", label: "首端有功设定值", quantity: "power" },
    { setKey: "j_p_set", maxKey: "j_p_max", minKey: "j_p_min", label: "末端有功设定值", quantity: "power" },
    { setKey: "i_i_set", maxKey: "i_i_max", implicitMin: 0, label: "首端电流设定值", quantity: "current", terminalSelector: "i" },
    { setKey: "j_i_set", maxKey: "j_i_max", implicitMin: 0, label: "末端电流设定值", quantity: "current", terminalSelector: "j" },
    { setKey: "i_v_set", maxKey: "i_v_max", minKey: "i_v_min", label: "首端电压设定值", quantity: "voltage", terminalSelector: "i" },
    { setKey: "j_v_set", maxKey: "j_v_max", minKey: "j_v_min", label: "末端电压设定值", quantity: "voltage", terminalSelector: "j" }
  );
  return specs;
}

function validateDeviceSetpointLimits(
  node: ModelNode,
  ownerName: string,
  keyFor: (key: string) => string,
  ownerSection: string,
  options: DeviceOperatingLimitNormalizationOptions,
  updateParam: (key: string, value: string) => void,
  terminalOverride?: Terminal
): TopologyValidationError[] {
  const warnings: TopologyValidationError[] = [];
  const stagedValues = new Map<string, string>();
  const valueFor = (key: string): string | undefined => stagedValues.get(key) ?? deviceParamValue(node.params, key);
  const stageParam = (key: string, value: string) => {
    stagedValues.set(key, value);
    updateParam(key, value);
  };
  for (const spec of deviceSetpointLimitSpecs(node, ownerSection)) {
    const setKey = keyFor(spec.setKey);
    const maxKey = keyFor(spec.maxKey);
    const minKey = spec.minKey ? keyFor(spec.minKey) : undefined;
    const setText = valueFor(setKey);
    const setpointMissing = setText === undefined || !String(setText).trim();
    if (setpointMissing && (spec.quantity === "numeric" || spec.legacyAlias)) {
      continue;
    }
    const maxText = valueFor(maxKey);
    const minText = minKey ? valueFor(minKey) : compactDeviceLimitNumber(spec.implicitMin ?? 0);
    const defaultUnit = spec.quantity === "power"
      ? defaultQuantityUnit("power", options)
      : spec.quantity === "voltage"
        ? defaultQuantityUnit("voltage", options)
        : spec.quantity === "current"
          ? defaultQuantityUnit("current", options)
          : "";
    const valueOf = (text: string | undefined): number | null => {
      if (spec.quantity === "numeric") {
        return namedNumericValue(text);
      }
      return quantityValue(text, spec.quantity, defaultUnit)?.baseValue ?? null;
    };
    const setValue = valueOf(setText);
    const maxValue = valueOf(maxText);
    const minValue = valueOf(minText);
    if (maxValue === null || minValue === null || maxValue <= minValue) {
      continue;
    }
    if (setValue !== null && setValue >= minValue && setValue <= maxValue) {
      continue;
    }
    if (spec.quantity === "voltage") {
      if (options.skipVoltageNodeIds?.has(node.id)) {
        continue;
      }
      const terminal = terminalOverride ?? terminalForDeviceLimit(node, spec.terminalSelector ?? "default");
      const voltageUnit = defaultQuantityUnit("voltage", options);
      const baseVoltageText = terminalVoltageTextForDeviceLimit(node, terminal);
      const baseVoltage = quantityValue(baseVoltageText, "voltage", voltageUnit);
      if (!baseVoltage || baseVoltage.baseValue <= 0) {
        continue;
      }
      const correctedSetpoint = quantityValueInUnit(baseVoltage.baseValue, "voltage", voltageUnit);
      stageParam(setKey, correctedSetpoint);
      warnings.push({
        id: `voltage-setpoint-deviation:${node.id}:${encodeURIComponent(setKey)}:${encodeURIComponent(minKey ?? "")}:${encodeURIComponent(maxKey)}`,
        type: "voltage-setpoint-deviation",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑告警：${ownerName} 的${spec.label} ${setKey}=${setText ?? "未设置"} 不在 ${minKey}=${minText} 与 ${maxKey}=${maxText} 的有效范围内，已按基准电压 ${quantityValueInUnit(baseVoltage.baseValue, "voltage", voltageUnit)} ${voltageUnit} 自动修正为 ${correctedSetpoint} ${voltageUnit}。`
      });
      continue;
    }
    if (spec.quantity === "power" || spec.quantity === "current") {
      if (spec.quantity === "current") {
        if (options.skipVoltageNodeIds?.has(node.id)) {
          continue;
        }
        const terminal = terminalOverride ?? terminalForDeviceLimit(node, spec.terminalSelector ?? "default");
        const baseVoltage = quantityValue(
          terminalVoltageTextForDeviceLimit(node, terminal),
          "voltage",
          defaultQuantityUnit("voltage", options)
        );
        if (!baseVoltage || baseVoltage.baseValue <= 0) {
          continue;
        }
      }
      const capacity = quantityValue(valueFor(keyFor("rated_capacity")), "power", defaultQuantityUnit("power", options));
      if (!capacity || capacity.baseValue <= 0) {
        continue;
      }
      const correctedBaseValue = Math.min(maxValue, Math.max(minValue, 0));
      const correctedSetpoint = quantityValueInUnit(correctedBaseValue, spec.quantity, defaultUnit);
      stageParam(setKey, correctedSetpoint);
      warnings.push({
        id: `device-setpoint-auto-corrected:${node.id}:${encodeURIComponent(setKey)}:${encodeURIComponent(minKey ?? "0")}:${encodeURIComponent(maxKey)}`,
        type: "device-setpoint-auto-corrected",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑告警：${ownerName} 的${spec.label} ${setKey}=${setText ?? "未设置"} 不在 ${minKey ? `${minKey}=${minText}` : "隐式下限=0"} 与 ${maxKey}=${maxText} 的有效范围内，已自动修正为 ${correctedSetpoint} ${defaultUnit}。`
      });
      continue;
    }
    warnings.push({
      id: `device-setpoint-out-of-range:${node.id}:${encodeURIComponent(setKey)}:${encodeURIComponent(minKey ?? "0")}:${encodeURIComponent(maxKey)}`,
      type: "device-setpoint-out-of-range",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `图上拓扑失败：${ownerName} 的${spec.label} ${setKey}=${setText} 必须位于 ${minKey ? `${minKey}=${minText}` : "隐式下限=0"} 与 ${maxKey}=${maxText} 之间。`
    });
  }
  return warnings;
}

/**
 * 单次拓扑检查运行内的额定容量赋值决策缓存。
 * 一轮检查里容量会被功率上下限、最大电流等多处重复查询；没有这层缓存，
 * 第二次查询就会把「首查」误判成「二查」，两段式处理直接失效。
 */
type RatedCapacityFixTracker = {
  scopeKey: string;
  decisions: Map<string, RatedCapacityFixDecision>;
};

/**
 * 设备额定容量。`baseValue` 始终是「功率」口径，供功率上下限修正复用；
 * 开关类设备的额定容量承载的是额定电流，此时 `currentBaseValue` 给出它的电流值，
 * 最大电流（i_max）换算直接采用，不再按 功率/基准电压/1.732 折算。
 */
type DeviceLimitCapacity = {
  baseValue: number;
  unit: string;
  currentBaseValue?: number;
};

function ratedCapacityFixDecisionFor(
  tracker: RatedCapacityFixTracker,
  nodeId: string,
  capacityKey: string
): RatedCapacityFixDecision {
  const fixKey = ratedCapacityFixKey(tracker.scopeKey, nodeId, capacityKey);
  const memoized = tracker.decisions.get(fixKey);
  if (memoized) {
    return memoized;
  }
  const decision = decideRatedCapacityFix(tracker.scopeKey, nodeId, capacityKey);
  tracker.decisions.set(fixKey, decision);
  return decision;
}

function validateDeviceLimitPairs(
  node: ModelNode,
  ownerName: string,
  keyFor: (key: string) => string,
  ownerSection: string,
  options: DeviceOperatingLimitNormalizationOptions,
  updateParam: (key: string, value: string) => void,
  terminalOverride?: Terminal,
  capacityFix?: RatedCapacityFixTracker
): TopologyValidationError[] {
  const warnings: TopologyValidationError[] = [];
  const powerUnit = defaultQuantityUnit("power", options);
  const currentUnit = defaultQuantityUnit("current", options);
  if (ownerSection === "HydroStorage") {
    const ratedCapacityKey = keyFor("rated_capacity");
    const waterVolumeKey = keyFor("water_volume");
    const pressureMaxKey = keyFor("pressure_max");
    const pressureMinKey = keyFor("pressure_min");
    const ratedCapacityText = deviceParamValue(node.params, ratedCapacityKey);
    const waterVolumeText = deviceParamValue(node.params, waterVolumeKey);
    const pressureMaxText = deviceParamValue(node.params, pressureMaxKey);
    const pressureMinText = deviceParamValue(node.params, pressureMinKey);
    const ratedCapacity = namedNumericValue(ratedCapacityText);
    const waterVolume = namedNumericValue(waterVolumeText);
    const pressureMax = namedNumericValue(pressureMaxText);
    const pressureMin = namedNumericValue(pressureMinText);
    const invalidReasons: string[] = [];
    if (ratedCapacity === null || ratedCapacity <= 0) {
      invalidReasons.push(`${ratedCapacityKey}=${ratedCapacityText ?? "未设置"} 必须为正数`);
    }
    if (waterVolume === null || waterVolume <= 0) {
      invalidReasons.push(`${waterVolumeKey}=${waterVolumeText ?? "未设置"} 必须为正数`);
    }
    if (pressureMax === null || pressureMax <= 0) {
      invalidReasons.push(`${pressureMaxKey}=${pressureMaxText ?? "未设置"} 必须为正数`);
    }
    if (pressureMin === null || pressureMin <= 0) {
      invalidReasons.push(`${pressureMinKey}=${pressureMinText ?? "未设置"} 必须为正数`);
    }
    if (pressureMax !== null && pressureMax > 0 && pressureMin !== null && pressureMin > 0 && pressureMax <= pressureMin) {
      invalidReasons.push(`${pressureMaxKey} 必须大于 ${pressureMinKey}`);
    }
    if (invalidReasons.length > 0) {
      warnings.push({
        id: `hydrogen-storage-parameter-invalid:${node.id}`,
        type: "hydrogen-storage-parameter-invalid",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑告警：${ownerName} 的储氢参数无效：${invalidReasons.join("；")}。拓扑计算失败。`
      });
    }
  }
  warnings.push(...validateStorageSocParameters(node, ownerName, keyFor, ownerSection, updateParam));
  const relevantSpecs = DEVICE_LIMIT_PAIR_SPECS.flatMap((spec) => {
    const maxKey = keyFor(spec.maxKey);
    const minKey = keyFor(spec.minKey);
    const maxText = deviceParamValue(node.params, maxKey);
    const minText = deviceParamValue(node.params, minKey);
    const requiredVoltageLimit = spec.voltage && REQUIRED_VOLTAGE_LIMIT_KEYS_BY_SECTION[ownerSection]?.has(spec.maxKey);
    const requiredPowerLimit = !spec.voltage && REQUIRED_POWER_LIMIT_KEYS_BY_SECTION[ownerSection]?.has(spec.maxKey);
    return maxText === undefined && minText === undefined && !requiredVoltageLimit && !requiredPowerLimit
      ? []
      : [{ spec, maxKey, minKey, maxText, minText }];
  });
  const invalidCapacityKeys = new Set<string>();
  // 开关类设备的 rated_capacity 承载的是额定电流（A）而非功率：默认值取默认额定电流，
  // 并额外给出它的电流解释，供最大电流（i_max）换算直接使用，避免按功率/电压再折算。
  const switchingRatedCapacityDefault = getSwitchingRatedCapacityDefault(baseDeviceKind(node.kind));
  const ratedCapacityParamKey = keyFor("rated_capacity");
  const switchingRatedCurrentFor = (paramKey: string, value: string | undefined): number | undefined => {
    if (paramKey !== ratedCapacityParamKey || !switchingRatedCapacityDefault) {
      return undefined;
    }
    const current = quantityValue(value, "current", currentUnit);
    return current && current.baseValue > 0 ? current.baseValue : undefined;
  };
  const capacityFor = (capacityKey: string): DeviceLimitCapacity | null => {
    const capacityText = deviceParamValue(node.params, capacityKey);
    const capacity = quantityValue(capacityText, "power", powerUnit);
    const switchingCurrent = switchingRatedCurrentFor(capacityKey, capacityText);
    if (capacity && capacity.baseValue > 0) {
      return switchingCurrent === undefined ? capacity : { ...capacity, currentBaseValue: switchingCurrent };
    }
    // 兜底默认值来源：开关类设备取默认额定电流，线路/负荷按电压等级容量表查表。
    const voltageText = deviceParamValue(node.params, keyFor("rated_voltage"))
      ?? node.terminals[0]?.vbase;
    const voltageValue = voltageText ? normalizeVoltageBaseInput(voltageText) : "";
    const switchingDefault = capacityKey === ratedCapacityParamKey ? switchingRatedCapacityDefault : null;
    const defaultCapacity = switchingDefault
      ?? (voltageValue ? getRatedCapacityDefaultForKind(baseDeviceKind(node.kind), voltageValue) : null);
    const defaultSource = switchingDefault ? "开关类设备默认额定电流" : `电压等级 ${voltageValue} kV`;
    if (defaultCapacity) {
      const autoCapacity = quantityValue(defaultCapacity, "power", powerUnit);
      if (autoCapacity && autoCapacity.baseValue > 0) {
        const autoCurrent = switchingRatedCurrentFor(capacityKey, defaultCapacity);
        const resolvedCapacity = autoCurrent === undefined
          ? autoCapacity
          : { ...autoCapacity, currentBaseValue: autoCurrent };
        if (capacityFix) {
          const fixDecision = ratedCapacityFixDecisionFor(capacityFix, node.id, capacityKey);
          if (fixDecision === "defer") {
            // 首次检查：只报告警，暂不赋值。
            if (!invalidCapacityKeys.has(capacityKey)) {
              invalidCapacityKeys.add(capacityKey);
              warnings.push({
                id: `device-limit-invalid:${node.id}:${encodeURIComponent(capacityKey)}`,
                type: "device-limit-invalid",
                nodeId: node.id,
                relatedNodeIds: [node.id],
                message: `图上拓扑告警：${ownerName} 的额定容量 ${capacityKey}=${capacityText ?? "未设置"} 无效；本次（首次）检查暂不处理，将在下次拓扑检查时按${defaultSource}自动赋值为 ${defaultCapacity}。`
              });
            }
            return null;
          }
          // 第二次检查（及此后的只读模型副本）：赋值并消除该告警。
          updateParam(capacityKey, defaultCapacity);
          return resolvedCapacity;
        }
        updateParam(capacityKey, defaultCapacity);
        warnings.push({
          id: `device-limit-autofill:${node.id}:${encodeURIComponent(capacityKey)}`,
          type: "device-limit-autofill",
          nodeId: node.id,
          relatedNodeIds: [node.id],
          message: `图上拓扑告警：${ownerName} 的额定容量 ${capacityKey}=${capacityText ?? "未设置"} 无效，已根据${defaultSource}自动填充为 ${defaultCapacity}。`
        });
        return resolvedCapacity;
      }
    }
    if (!invalidCapacityKeys.has(capacityKey)) {
      invalidCapacityKeys.add(capacityKey);
      warnings.push({
        id: `device-limit-invalid:${node.id}:${encodeURIComponent(capacityKey)}`,
        type: "device-limit-invalid",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑告警：${ownerName} 的额定容量 ${capacityKey}=${capacityText ?? "未设置"} 无效；对应功率上下限和最大电流未自动修改。`
      });
    }
    return null;
  };

  const activePowerIsBidirectional = (() => {
    const kind = baseDeviceKind(node.kind).toLowerCase();
    const deviceType = String(deviceParamValue(node.params, keyFor("dev_type")) ?? "").toLowerCase();
    if (kind.includes("storage") || deviceType.includes("储能") || deviceType.includes("storage") || deviceType.includes("battery")) {
      return true;
    }
    return !["ACGenerator", "DCGenerator", "ACLoad", "DCLoad"].includes(ownerSection);
  })();

  for (const { spec, maxKey, minKey, maxText, minText } of relevantSpecs) {
    if (!spec.voltage) {
      const capacity = capacityFor(keyFor("rated_capacity"));
      // 开关类设备的额定容量承载额定电流而非功率，不能据它去反推功率上下限。
      if (!capacity || capacity.currentBaseValue !== undefined) {
        continue;
      }
      const maxValue = quantityValue(maxText, "power", powerUnit);
      const minValue = quantityValue(minText, "power", powerUnit);
      if (
        maxValue &&
        minValue &&
        maxValue.baseValue > 0 &&
        maxValue.baseValue > minValue.baseValue &&
        maxValue.baseValue <= capacity.baseValue + Number.EPSILON
      ) {
        continue;
      }
      const reactivePower = spec.maxKey === "q_max" || spec.maxKey.endsWith("_q_max");
      const correctedMax = quantityValueInUnit(capacity.baseValue, "power", powerUnit);
      const correctedMinBase = reactivePower || activePowerIsBidirectional ? -capacity.baseValue : 0;
      const correctedMin = quantityValueInUnit(correctedMinBase, "power", powerUnit);
      updateParam(maxKey, correctedMax);
      updateParam(minKey, correctedMin);
      warnings.push({
        id: `device-limit-invalid:${node.id}:${encodeURIComponent(maxKey)}:${encodeURIComponent(minKey)}`,
        type: "device-limit-invalid",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑告警：${ownerName} 的${spec.label}范围 ${maxKey}=${maxText ?? "未设置"}、${minKey}=${minText ?? "未设置"} 无效，已按额定容量自动修正为 ${correctedMax} ${powerUnit}、${correctedMin} ${powerUnit}。`
      });
      continue;
    }

    if (options.skipVoltageNodeIds?.has(node.id)) {
      continue;
    }
    const terminal = spec.terminalSelector === "default" && terminalOverride
      ? terminalOverride
      : terminalForDeviceLimit(node, spec.terminalSelector);
    const baseVoltageText = terminalVoltageTextForDeviceLimit(node, terminal);
    const baseVoltage = quantityValue(baseVoltageText, "voltage", defaultQuantityUnit("voltage", options));
    if (!baseVoltage || baseVoltage.baseValue <= 0) {
      continue;
    }
    const voltageUnit = defaultQuantityUnit("voltage", options);
    const maxValue = quantityValue(maxText, "voltage", voltageUnit);
    const minValue = quantityValue(minText, "voltage", voltageUnit);
    const allowedDeviation = baseVoltage.baseValue * 0.3;
    const pairInvalid = Boolean(maxValue && minValue && maxValue.baseValue <= minValue.baseValue);
    const maxInvalid = pairInvalid || !maxValue || Math.abs(maxValue.baseValue - baseVoltage.baseValue) > allowedDeviation + Number.EPSILON;
    const minInvalid = pairInvalid || !minValue || Math.abs(minValue.baseValue - baseVoltage.baseValue) > allowedDeviation + Number.EPSILON;
    if (!maxInvalid && !minInvalid) {
      continue;
    }
    const correctedMax = quantityValueInUnit(baseVoltage.baseValue * 1.2, "voltage", voltageUnit);
    const correctedMin = quantityValueInUnit(baseVoltage.baseValue * 0.8, "voltage", voltageUnit);
    if (maxInvalid) {
      updateParam(maxKey, correctedMax);
    }
    if (minInvalid) {
      updateParam(minKey, correctedMin);
    }
    warnings.push({
      id: `voltage-limit-out-of-range:${node.id}:${encodeURIComponent(maxKey)}:${encodeURIComponent(minKey)}`,
      type: "voltage-limit-out-of-range",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `图上拓扑告警：${ownerName} 的${spec.label}范围不满足要求；基准电压为 ${quantityValueInUnit(baseVoltage.baseValue, "voltage", voltageUnit)} ${voltageUnit}，已将${maxInvalid ? `上限 ${maxKey} 修正为 ${correctedMax} ${voltageUnit}` : "上限保持不变"}，${minInvalid ? `下限 ${minKey} 修正为 ${correctedMin} ${voltageUnit}` : "下限保持不变"}。`
    });
  }

  if (!options.skipVoltageNodeIds?.has(node.id)) {
    for (const spec of RATED_CURRENT_SPECS_BY_SECTION[ownerSection] ?? []) {
      const currentKey = keyFor(spec.currentKey);
      const capacity = capacityFor(keyFor(spec.capacityKey));
      const terminal = terminalOverride ?? terminalForDeviceLimit(node, spec.terminalSelector);
      const baseVoltageText = terminalVoltageTextForDeviceLimit(node, terminal);
      const baseVoltage = quantityValue(baseVoltageText, "voltage", defaultQuantityUnit("voltage", options));
      if (!capacity || !baseVoltage || baseVoltage.baseValue <= 0) {
        continue;
      }
      const expectedCurrent = capacity.currentBaseValue
        ?? capacity.baseValue / baseVoltage.baseValue / THREE_PHASE_CURRENT_DIVISOR;
      const currentText = deviceParamValue(node.params, currentKey);
      const current = quantityValue(currentText, "current", currentUnit);
      if (current && current.baseValue > 0) {
        continue;
      }
      const correctedCurrent = quantityValueInUnit(expectedCurrent, "current", currentUnit);
      updateParam(currentKey, correctedCurrent);
      warnings.push({
        id: `device-limit-invalid:${node.id}:${encodeURIComponent(currentKey)}`,
        type: "device-limit-invalid",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑告警：${ownerName} 的${spec.label} ${currentKey}=${currentText ?? "未设置"} 不是正数，已按额定容量/基准电压/1.732补为默认值 ${correctedCurrent} ${currentUnit}。`
      });
    }
  }
  return warnings;
}

type HydrogenCouplingValidationSpec = {
  coefficientKey: "e2h_coeff" | "h2e_coeff";
  electricRelationField: string;
  hydrogenRelationField: string;
};

const HYDROGEN_COUPLING_VALIDATION_SPECS: Partial<Record<DeviceKind, HydrogenCouplingValidationSpec>> = {
  "ac-electrolyzer": {
    coefficientKey: "e2h_coeff",
    electricRelationField: "idx_ac_load_t1",
    hydrogenRelationField: "idx_h2_unit_t2"
  },
  "dc-electrolyzer": {
    coefficientKey: "e2h_coeff",
    electricRelationField: "idx_dc_load_t1",
    hydrogenRelationField: "idx_h2_unit_t2"
  },
  "ac-fuel-cell": {
    coefficientKey: "h2e_coeff",
    electricRelationField: "idx_ac_unit_t1",
    hydrogenRelationField: "idx_h2_load_t2"
  },
  "dc-fuel-cell": {
    coefficientKey: "h2e_coeff",
    electricRelationField: "idx_dc_unit_t1",
    hydrogenRelationField: "idx_h2_load_t2"
  }
};

function validateHydrogenCouplingParameters(
  node: ModelNode,
  options: DeviceOperatingLimitNormalizationOptions
): { warnings: TopologyValidationError[]; invalidRelationFields: Set<string> } {
  const spec = HYDROGEN_COUPLING_VALIDATION_SPECS[baseDeviceKind(node.kind)];
  if (!spec) {
    return { warnings: [], invalidRelationFields: new Set() };
  }

  const issues: string[] = [];
  const invalidRelationFields = new Set<string>();
  const coefficientText = deviceParamValue(node.params, spec.coefficientKey);
  const coefficient = namedNumericValue(coefficientText);
  if (coefficient === null || coefficient <= 0) {
    issues.push(`${spec.coefficientKey}=${coefficientText ?? "未设置"} 必须为正数`);
  }

  const template = DEVICE_LIBRARY_BY_KIND.get(node.kind) ?? DEVICE_LIBRARY_BY_KIND.get(baseDeviceKind(node.kind));
  const associatedViews = buildContainerDeviceParameterViews(node, template).filter((view) => view.kind === "associated");
  const relationView = (fieldName: string) =>
    associatedViews.find((view) => view.relationKeys?.includes(fieldName));
  const relationValue = (fieldName: string, key: string) =>
    relationView(fieldName)?.rows.find((row) => row.key === key)?.value;

  const validateElectricRelation = (fieldName: string) => {
    const ownerName = containerAssociatedDeviceName(node, fieldName);
    const powerUnit = defaultQuantityUnit("power", options);
    const capacityText = relationValue(fieldName, "rated_capacity");
    const capacity = quantityValue(capacityText, "power", powerUnit);
    const relationIssues: string[] = [];

    if (!capacity || capacity.baseValue <= 0) {
      relationIssues.push(`rated_capacity=${capacityText ?? "未设置"} 必须为正数`);
    }
    if (relationIssues.length > 0) {
      invalidRelationFields.add(fieldName);
      issues.push(`${ownerName}：${relationIssues.join("，")}`);
    }
  };

  const validateHydrogenRelation = (fieldName: string) => {
    const ownerName = containerAssociatedDeviceName(node, fieldName);
    const value = (column: string) => relationValue(fieldName, column);
    const numeric = (column: string) => namedNumericValue(value(column));
    const capacity = numeric("rated_capacity");
    const pressureMaximum = numeric("pressure_max");
    const pressureMinimum = numeric("pressure_min");
    const pressureSetpoint = numeric("pressure_set");
    const flowMaximum = numeric("flow_max");
    const flowMinimum = numeric("flow_min");
    const flowSetpoint = numeric("flow_set");
    const relationIssues: string[] = [];

    if (capacity === null || capacity <= 0) {
      relationIssues.push(`rated_capacity=${value("rated_capacity") ?? "未设置"} 必须为正数`);
    }
    if (pressureMaximum === null || pressureMaximum <= 0) {
      relationIssues.push(`pressure_max=${value("pressure_max") ?? "未设置"} 必须为正数`);
    }
    if (pressureMinimum === null) {
      relationIssues.push(`pressure_min=${value("pressure_min") ?? "未设置"} 必须为数字`);
    }
    if (pressureMaximum !== null && pressureMinimum !== null && pressureMaximum <= pressureMinimum) {
      relationIssues.push("pressure_max 必须大于 pressure_min");
    }
    if (
      value("pressure_set") !== undefined &&
      pressureMaximum !== null &&
      pressureMinimum !== null &&
      pressureMaximum > pressureMinimum &&
      (pressureSetpoint === null || pressureSetpoint < pressureMinimum || pressureSetpoint > pressureMaximum)
    ) {
      relationIssues.push(`pressure_set=${value("pressure_set")} 必须位于 pressure_min 与 pressure_max 之间`);
    }
    if (flowMaximum === null || flowMaximum <= 0) {
      relationIssues.push(`flow_max=${value("flow_max") ?? "未设置"} 必须为正数`);
    }
    if (flowMinimum === null) {
      relationIssues.push(`flow_min=${value("flow_min") ?? "未设置"} 必须为数字`);
    }
    if (flowMaximum !== null && flowMinimum !== null && flowMaximum <= flowMinimum) {
      relationIssues.push("flow_max 必须大于 flow_min");
    }
    if (
      value("flow_set") !== undefined &&
      flowMaximum !== null &&
      flowMinimum !== null &&
      flowMaximum > flowMinimum &&
      (flowSetpoint === null || flowSetpoint < flowMinimum || flowSetpoint > flowMaximum)
    ) {
      relationIssues.push(`flow_set=${value("flow_set")} 必须位于 flow_min 与 flow_max 之间`);
    }
    if (capacity !== null && capacity > 0 && flowMaximum !== null && flowMaximum > capacity) {
      relationIssues.push("flow_max 不能大于 rated_capacity");
    }
    if (relationIssues.length > 0) {
      invalidRelationFields.add(fieldName);
      issues.push(`${ownerName}：${relationIssues.join("，")}`);
    }
  };

  validateElectricRelation(spec.electricRelationField);
  validateHydrogenRelation(spec.hydrogenRelationField);
  if (issues.length === 0) {
    return { warnings: [], invalidRelationFields };
  }
  return {
    warnings: [{
      id: `hydrogen-coupling-parameter-invalid:${node.id}`,
      type: "hydrogen-coupling-parameter-invalid",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `图上拓扑失败：${node.name} 的电-气参数无效：${issues.join("；")}。`
    }],
    invalidRelationFields
  };
}

export function normalizeDeviceOperatingLimitsAfterTopology(
  nodes: ModelNode[],
  options: DeviceOperatingLimitNormalizationOptions = {}
): { nodes: ModelNode[]; warnings: TopologyValidationError[]; corrections: DeviceOperatingLimitCorrection[] } {
  const warnings: TopologyValidationError[] = [];
  const corrections: DeviceOperatingLimitCorrection[] = [];
  const excludedNodeIds = topologyExcludedNodeIds(nodes);
  const sourceNodeById = new Map((options.sourceNodes ?? []).map((node) => [node.id, node]));
  // 两段式额定容量处理的作用域：仅在拓扑检查入口传入，非检查入口保持原行为。
  const capacityFix: RatedCapacityFixTracker | undefined = options.capacityFixScopeKey
    ? { scopeKey: options.capacityFixScopeKey, decisions: new Map() }
    : undefined;
  const normalizedNodes = nodes.map((node) => {
    if (excludedNodeIds.has(node.id)) {
      return node;
    }
    if (isStaticNode(node)) {
      return node;
    }
    let nextParams = node.params;
    const updateParam = (paramKey: string, value: string) => {
      if (deviceParamValue(nextParams, paramKey) === value) {
        return;
      }
      if (nextParams === node.params) {
        nextParams = { ...node.params };
      }
      nextParams[paramKey] = value;
      corrections.push({ nodeId: node.id, paramKey, value });
    };
    const sourceNode = sourceNodeById.get(node.id);
    if (sourceNode && !options.skipVoltageNodeIds?.has(node.id)) {
      const recordVoltageSetpointDefaults = (
        ownerName: string,
        specs: Array<{ paramKey: string; terminal: Terminal | undefined }>
      ) => {
        const correctedSetpoints: Array<{ paramKey: string; previousValue: string; value: string }> = [];
        for (const spec of specs) {
          if (!Object.prototype.hasOwnProperty.call(sourceNode.params, spec.paramKey)) {
            continue;
          }
          const previousValue = sourceNode.params[spec.paramKey];
          if (!shouldAssignVoltageSetpointDefault(previousValue)) {
            continue;
          }
          const baseVoltageText = terminalVoltageTextForDeviceLimit(node, spec.terminal);
          const baseVoltage = quantityValue(baseVoltageText, "voltage", defaultQuantityUnit("voltage", options));
          const defaultValue = node.params[spec.paramKey];
          const defaultVoltage = quantityValue(defaultValue, "voltage", defaultQuantityUnit("voltage", options));
          if (!baseVoltage || baseVoltage.baseValue <= 0 || !defaultVoltage || defaultVoltage.baseValue <= 0) {
            continue;
          }
          updateParam(spec.paramKey, defaultValue);
          if (!corrections.some((correction) => correction.nodeId === node.id && correction.paramKey === spec.paramKey)) {
            corrections.push({ nodeId: node.id, paramKey: spec.paramKey, value: defaultValue });
          }
          correctedSetpoints.push({ paramKey: spec.paramKey, previousValue, value: defaultValue });
        }
        if (correctedSetpoints.length === 0) {
          return;
        }
        const previousSummary = correctedSetpoints
          .map(({ paramKey, previousValue }) => `${paramKey}=${previousValue.trim() || "未设置"}`)
          .join("、");
        const correctedSummary = correctedSetpoints
          .map(({ paramKey, value }) => `${paramKey}=${value}`)
          .join("、");
        warnings.push({
          id: `voltage-setpoint-zero:${node.id}:${correctedSetpoints.map(({ paramKey }) => encodeURIComponent(paramKey)).join(":")}`,
          type: "voltage-setpoint-zero",
          nodeId: node.id,
          relatedNodeIds: [node.id],
          message: `图上拓扑告警：${ownerName} 的 ${previousSummary}，电压设定值不能为0；已根据所在节点电压基值自动修正为 ${correctedSummary}。`
        });
      };
      recordVoltageSetpointDefaults(
        node.name,
        voltageSetpointDefaultSpecs(sourceNode).map((spec) => ({
          paramKey: spec.paramKey,
          terminal: terminalForDeviceLimit(node, spec.terminalSelector)
        }))
      );
      if (isContainerParams(sourceNode.params)) {
        for (const fieldName of Object.keys(sourceNode.params)) {
          const relationSection = containerRelationCounterKey(fieldName);
          if (relationSection !== "ACGenerator" && relationSection !== "DCGenerator") {
            continue;
          }
          const parsed = parseContainerRelationField(fieldName);
          if (!parsed) {
            continue;
          }
          recordVoltageSetpointDefaults(containerAssociatedDeviceName(sourceNode, fieldName), [{
            paramKey: containerRelationParamKey(fieldName, "v_set"),
            terminal: node.terminals[parsed.terminalNumber - 1]
          }]);
        }
      }
    }
    const template = DEVICE_LIBRARY_BY_KIND.get(node.kind) ?? DEVICE_LIBRARY_BY_KIND.get(baseDeviceKind(node.kind));
    if (template) {
      const defaultedParams = applyContainerAssociatedDeviceDefaults(nextParams, template);
      if (defaultedParams !== nextParams) {
        for (const [paramKey, value] of Object.entries(defaultedParams)) {
          if (!Object.prototype.hasOwnProperty.call(nextParams, paramKey)) {
            updateParam(paramKey, value);
          }
        }
      }
    }
    const currentNode = () => nextParams === node.params ? node : { ...node, params: nextParams };
    const hydrogenCouplingValidation = validateHydrogenCouplingParameters(currentNode(), options);
    warnings.push(...hydrogenCouplingValidation.warnings);
    warnings.push(...validateDeviceLimitPairs(
      currentNode(),
      node.name,
      (key) => key,
      inferESection(node.kind, nextParams),
      options,
      updateParam,
      undefined,
      capacityFix
    ));
    warnings.push(...validateDeviceSetpointLimits(
      currentNode(),
      node.name,
      (key) => key,
      inferESection(node.kind, nextParams),
      options,
      updateParam
    ));
    if (!isContainerParams(nextParams)) {
      return nextParams === node.params ? node : { ...node, params: nextParams };
    }
    for (const fieldName of Object.keys(nextParams)) {
      const relationSection = containerRelationCounterKey(fieldName);
      if (!relationSection) {
        continue;
      }
      if (hydrogenCouplingValidation.invalidRelationFields.has(fieldName)) {
        continue;
      }
      const parsed = parseContainerRelationField(fieldName);
      const terminal = parsed ? node.terminals[parsed.terminalNumber - 1] : undefined;
      warnings.push(...validateDeviceLimitPairs(
        currentNode(),
        containerAssociatedDeviceName(node, fieldName),
        (key) => containerRelationParamKey(fieldName, key),
        relationSection,
        options,
        updateParam,
        terminal,
        capacityFix
      ));
      warnings.push(...validateDeviceSetpointLimits(
        currentNode(),
        containerAssociatedDeviceName(node, fieldName),
        (key) => containerRelationParamKey(fieldName, key),
        relationSection,
        options,
        updateParam,
        terminal
      ));
    }
    return nextParams === node.params ? node : { ...node, params: nextParams };
  });
  return { nodes: normalizedNodes, warnings, corrections };
}

export function validateDeviceOperatingLimits(
  nodes: ModelNode[],
  options: DeviceOperatingLimitNormalizationOptions = {}
): TopologyValidationError[] {
  return normalizeDeviceOperatingLimitsAfterTopology(nodes, options).warnings;
}

export function duplicateDeviceIdentityErrors(nodes: ModelNode[]): TopologyValidationError[] {
  const errors: TopologyValidationError[] = [];
  const entries = nodes.flatMap(identityValidationEntriesForNode);
  const addDuplicateErrors = (
    type: Extract<TopologyValidationErrorType, "duplicate-device-idx" | "duplicate-device-name">,
    valueOf: (entry: DeviceIdentityValidationEntry) => string,
    messageOf: (typeKey: string, value: string, entries: DeviceIdentityValidationEntry[]) => string
  ) => {
    const groups = new Map<string, DeviceIdentityValidationEntry[]>();
    for (const entry of entries) {
      const value = String(valueOf(entry) ?? "").trim();
      if (!value) {
        continue;
      }
      const key = `${entry.typeKey}\u0000${value}`;
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    for (const [key, group] of groups) {
      const uniqueNodeIds = Array.from(new Set(group.map((entry) => entry.node.id)));
      if (group.length <= 1) {
        continue;
      }
      const [typeKey, value] = key.split("\u0000");
      errors.push({
        id: `${type}:${encodeURIComponent(typeKey)}:${encodeURIComponent(value)}`,
        type,
        nodeId: uniqueNodeIds[0],
        relatedNodeIds: uniqueNodeIds,
        message: messageOf(typeKey, value, group)
      });
    }
  };

  addDuplicateErrors(
    "duplicate-device-idx",
    (entry) => entry.idx,
    (typeKey, value, group) =>
      `图上拓扑失败：同类型设备 ${typeKey} 的 idx=${value} 重复（${group.map((entry) => entry.node.name).join("、")}）。`
  );
  addDuplicateErrors(
    "duplicate-device-name",
    (entry) => entry.name,
    (typeKey, value) => `图上拓扑失败：同类型设备 ${typeKey} 的 name=${value} 重复。`
  );
  return errors;
}

export function modelTypeVoltageRangeFor(modelType?: string): { min: number; max: number; label: string } | null {
  if (modelType === "厂站") return { min: 10, max: Infinity, label: "10kV 及以上" };
  if (modelType === "馈线") return { min: 0, max: 35, label: "35kV 及以下" };
  if (modelType === "台区") return { min: 0, max: 10, label: "10kV 及以下" };
  return null;
}

type ModelAssociationProjectModelType = Extract<ModelType, "厂站" | "馈线" | "台区">;

export type ModelAssociationProjectIndexes = Readonly<
  Record<ModelAssociationProjectModelType, readonly string[]>
>;

export function buildModelAssociationProjectIndexes(
  projects: readonly { modelType?: unknown; idx?: unknown }[]
): ModelAssociationProjectIndexes {
  const indexes = {
    "厂站": new Set<string>(),
    "馈线": new Set<string>(),
    "台区": new Set<string>()
  } satisfies Record<ModelAssociationProjectModelType, Set<string>>;
  for (const project of projects) {
    const modelType = String(project.modelType ?? "").trim() as ModelAssociationProjectModelType;
    if (!Object.prototype.hasOwnProperty.call(indexes, modelType)) {
      continue;
    }
    const numericIndex = Number(project.idx);
    if (!Number.isInteger(numericIndex) || numericIndex <= 0) {
      continue;
    }
    indexes[modelType].add(String(numericIndex));
  }
  return {
    "厂站": [...indexes["厂站"]].sort((left, right) => Number(left) - Number(right)),
    "馈线": [...indexes["馈线"]].sort((left, right) => Number(left) - Number(right)),
    "台区": [...indexes["台区"]].sort((left, right) => Number(left) - Number(right))
  };
}

export function modelAssociationProjectIndexesForSchemes(
  schemes: SavedSchemeRecord[]
): ModelAssociationProjectIndexes {
  return buildModelAssociationProjectIndexes(
    flattenSavedSchemes(schemes).flatMap((scheme) =>
      scheme.projects.map((record) => ({
        modelType: record.project.modelType,
        idx: record.project.idx
      }))
    )
  );
}

export type ValidateTopologyOptions = {
  includeVoltageSetpointDeviations?: boolean;
  modelType?: string;
  modelAssociationProjectIndexes?: ModelAssociationProjectIndexes;
};

export function topologyCalculationMessage(errorCount: number) {
  return errorCount === 0
    ? "图上拓扑成功。"
    : `图上拓扑失败：发现 ${errorCount} 条错误，已定位到第一条错误。`;
}

export function defaultModelLayer(): ModelLayer {
  return { id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true };
}

export function savedSchemeChildren(scheme: SavedSchemeRecord): SavedSchemeRecord[] {
  return Array.isArray(scheme.children) ? scheme.children : [];
}

export function flattenSavedSchemes(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  return schemes.flatMap((scheme) => [scheme, ...flattenSavedSchemes(savedSchemeChildren(scheme))]);
}
