export type DeviceKind =
  | "static-text"
  | "static-line"
  | "static-polyline"
  | "static-circle"
  | "static-ellipse"
  | "static-rect"
  | "static-image"
  | "static-web"
  | "static-date"
  | "static-time"
  | "static-datetime"
  | "static-input"
  | "static-button"
  | "ac-source"
  | "ac-wind-source"
  | "dc-wind-source"
  | "ac-pv-source"
  | "dc-pv-source"
  | "ac-thermal-source"
  | "ac-hydro-source"
  | "ac-nuclear-source"
  | "ac-storage"
  | "ac-electrolyzer"
  | "dc-electrolyzer"
  | "hydrogen-source"
  | "hydrogen-tank"
  | "hydrogen-load"
  | "ac-fuel-cell"
  | "dc-fuel-cell"
  | "hydrogen-bus"
  | "hydrogen-compressor"
  | "hydrogen-pressure-reducer"
  | "hydrogen-shutoff-valve"
  | "hydrogen-pipeline"
  | "heat-boiler"
  | "two-port-heat-boiler"
  | "heat-source"
  | "two-port-heat-source"
  | "heat-exchanger"
  | "three-port-heat-exchanger"
  | "four-port-heat-exchanger"
  | "ac-heater"
  | "ac-two-port-heater"
  | "dc-heater"
  | "dc-two-port-heater"
  | "thermal-storage-tank"
  | "heat-load"
  | "single-port-heat-load"
  | "two-port-heat-load"
  | "heat-bus"
  | "heat-pipeline"
  | "heat-pump"
  | "heat-shutoff-valve"
  | "ac-line"
  | "ac-zero-branch"
  | "ac-bus"
  | "ac-switch"
  | "ac-disconnector"
  | "ac-breaker"
  | "ac-load"
  | "ac-transformer"
  | "ac-two-winding-transformer"
  | "ac-three-winding-transformer"
  | "dc-source"
  | "dc-storage"
  | "dc-line"
  | "dc-zero-branch"
  | "dc-bus"
  | "dc-switch"
  | "dc-disconnector"
  | "dc-breaker"
  | "dc-load"
  | "dc-transformer"
  | "dcdc-converter"
  | "acdc-converter"
  | "acac-converter"
  | (string & {});

export type DeviceGlyphVariant =
  | "static"
  | "ac-generator"
  | "dc-generator"
  | "wind-source"
  | "pv-source"
  | "thermal-source"
  | "hydro-source"
  | "nuclear-source"
  | "battery-storage"
  | "hydrogen-electrolyzer"
  | "hydrogen-source"
  | "hydrogen-storage"
  | "hydrogen-load"
  | "hydrogen-fuel-cell"
  | "hydrogen-bus"
  | "hydrogen-compressor"
  | "hydrogen-regulator"
  | "hydrogen-valve"
  | "hydrogen-pipeline"
  | "heat-boiler"
  | "heat-source"
  | "heat-electric-heater"
  | "heat-exchanger-two"
  | "heat-exchanger-three"
  | "heat-exchanger-four"
  | "heat-storage"
  | "heat-load"
  | "heat-bus"
  | "heat-pipeline"
  | "heat-pump"
  | "heat-valve"
  | "custom-device"
  | "bus"
  | "ac-line"
  | "dc-line"
  | "line"
  | "transformer"
  | "switch"
  | "disconnector"
  | "breaker"
  | "load"
  | "dcdc-converter"
  | "acdc-converter"
  | "acac-converter"
  | "default";

export type Point = {
  x: number;
  y: number;
};

export type CanvasBounds = {
  width: number;
  height: number;
};

export type ViewBox = CanvasBounds & {
  x: number;
  y: number;
};

export type TerminalType = "ac" | "dc" | "h2" | "heat";

export type ContainerTerminalRole = "single-source" | "double-source" | "single-load" | "double-load";

export type ContainerTerminalAssociationType =
  | "ac-generator"
  | "ac-load"
  | "dc-generator"
  | "dc-load"
  | "h2-source"
  | "h2-load"
  | "heat-source"
  | "heat2-source"
  | "heat-load"
  | "heat2-load";

export type ContainerTerminalAssociationValue = ContainerTerminalAssociationType | "";

export type DeviceParameterValueType = "integer" | "float" | "string" | "enum";

export type DeviceParameterDefinition = {
  cnName: string;
  enName: string;
  valueType: DeviceParameterValueType;
  typicalValue: string;
  readonly?: boolean;
};

export type Terminal = {
  id: string;
  label: string;
  type: TerminalType;
  anchor: Point;
  nodeNumber: string;
  vbase?: string;
};

export type DeviceTemplate = {
  kind: DeviceKind;
  label: string;
  group: string;
  size: {
    width: number;
    height: number;
  };
  params: Record<string, string>;
  terminalType: TerminalType;
  terminalCount: number;
  terminalTypes?: TerminalType[];
  terminalLabels?: string[];
  terminalAnchors?: Point[];
  terminalRoles?: ContainerTerminalRole[];
  terminalAssociations?: ContainerTerminalAssociationValue[];
  isContainer?: boolean;
  custom?: boolean;
  parameterDefinitions?: DeviceParameterDefinition[];
};

export type DeviceTemplateDefinitionOverride = {
  kind: string;
  params?: Record<string, string>;
  parameterDefinitions?: DeviceParameterDefinition[];
  updatedAt?: string;
};

export type ContainerTerminalAssociation = {
  terminalIndex: number;
  terminalLabel: string;
  terminalType: TerminalType;
  relationKey: string;
  relationName: string;
  roleLabel: string;
  deviceModel: string;
  sourceTerminalIndex: number;
  dependent: boolean;
};

export type ContainerDeviceParameterViewRow = {
  key: string;
  label: string;
  value: string;
  readonly: boolean;
};

export type ContainerDeviceParameterView = {
  id: string;
  label: string;
  kind: "container" | "associated";
  deviceType?: string;
  relationKeys?: string[];
  terminalIndexes?: number[];
  rows: ContainerDeviceParameterViewRow[];
};

export type ModelNode = {
  id: string;
  kind: DeviceKind;
  name: string;
  nodeNumber: string;
  acTopologyNode: number;
  dcTopologyNode: number;
  position: Point;
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  terminals: Terminal[];
  params: Record<string, string>;
};

export type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  sourceTerminalId?: string;
  targetTerminalId?: string;
  sourcePoint?: Point;
  targetPoint?: Point;
  manualPoints?: Point[];
};

export type ElementTreeItem = {
  kind: "node" | "edge";
  id: string;
  name: string;
};

export type ElementTreeGroup = {
  typeKey: string;
  typeLabel: string;
  items: ElementTreeItem[];
};

export type ProjectFile = {
  version: 1;
  name: string;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBackgroundColor?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
  powerUnit?: string;
  voltageUnit?: string;
  currentUnit?: string;
  powerBaseValue?: number;
  deviceIndexCounters?: DeviceIndexCounters;
  nodes: ModelNode[];
  edges: Edge[];
};

export const DEFAULT_POWER_UNIT = "MW";
export const DEFAULT_VOLTAGE_UNIT = "kV";
export const DEFAULT_CURRENT_UNIT = "A";
export const DEFAULT_POWER_BASE_VALUE = 100;

export const E_SECTION_COLUMNS: Record<string, string[]> = {
  ACRealBs: ["idx", "name", "node", "run_stat"],
  DCRealBs: ["idx", "name", "node", "run_stat"],
  ACNode: ["idx", "name", "vbase", "voltage", "angle", "isl", "run_stat"],
  DCNode: ["idx", "name", "vbase", "voltage", "isl", "run_stat"],
  ACBranch: ["idx", "name", "i_node", "j_node", "r", "x", "b", "run_stat"],
  DCBranch: ["idx", "name", "i_node", "j_node", "r", "run_stat"],
  ACLoad: ["idx", "name", "node", "pbase", "pv0", "pv1", "pv2", "qbase", "qv0", "qv1", "qv2", "run_stat"],
  DCLoad: ["idx", "name", "node", "pbase", "pv0", "pv1", "pv2", "run_stat"],
  ACGenerator: ["idx", "name", "node", "control_type", "p_set", "q_set", "v_set", "alpha", "run_stat"],
  DCGenerator: ["idx", "name", "node", "control_type", "v_set", "p_set", "i_set", "run_stat"],
  ACShuntCompensator: ["idx", "name", "node", "control_type", "q_set", "g_set", "b_set", "v_set", "run_stat"],
  ACZeroBranch: ["idx", "name", "i_node", "j_node", "run_stat"],
  DCZeroBranch: ["idx", "name", "i_node", "j_node", "run_stat"],
  ACSwitch: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  DCSwitch: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  ACBreak: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  DCBreak: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  ACTransformer: ["idx", "name", "i_node", "j_node", "r", "x", "gt", "bt", "tap", "shift", "run_stat"],
  ThreePowerTransformer: ["idx", "name", "run_stat", "idx_xf_t1", "idx_xf_t2", "idx_xf_t3"],
  DCDCConverter: ["idx", "name", "i_node", "j_node", "r1", "r2", "control_type", "p_set", "i_set", "v_set", "run_stat"],
  DCACConverter: ["idx", "name", "ac_node", "dc_node", "r1", "r2", "control_type", "p_ac_set", "q_ac_set", "v_ac_set", "v_dc_set", "run_stat"],
  ACACConverter: ["idx", "name", "i_node", "j_node", "r1", "r2", "control_type", "p_set", "i_q_set", "j_q_set", "i_v_set", "j_v_set", "run_stat"]
};

function isContainerParams(params: Record<string, string> = {}) {
  return params.is_container === "1" || params.is_container === "true" || params.isContainer === "true";
}

export function inferESection(kind: string, params: Record<string, string> = {}) {
  if (isContainerParams(params)) {
    return "";
  }
  if (kind === "ac-bus") return "ACRealBs";
  if (kind === "dc-bus") return "DCRealBs";
  if (params.source_section && E_SECTION_COLUMNS[params.source_section]) {
    return params.source_section;
  }
  if (kind === "ac-line") return "ACBranch";
  if (kind === "dc-line") return "DCBranch";
  if (kind === "ac-zero-branch") return "ACZeroBranch";
  if (kind === "dc-zero-branch") return "DCZeroBranch";
  if (kind === "ac-load") return "ACLoad";
  if (kind === "dc-load") return "DCLoad";
  if (kind === "ac-storage") return "ACGenerator";
  if (kind === "dc-storage") return "DCGenerator";
  if (kind.startsWith("ac-") && kind.includes("source")) return "ACGenerator";
  if (kind.startsWith("dc-") && kind.includes("source")) return "DCGenerator";
  if (kind === "ac-switch" || kind === "ac-disconnector") return "ACSwitch";
  if (kind === "dc-switch" || kind === "dc-disconnector") return "DCSwitch";
  if (kind === "ac-breaker") return "ACBreak";
  if (kind === "dc-breaker") return "DCBreak";
  if (kind === "ac-transformer" || kind === "ac-two-winding-transformer") return "ACTransformer";
  if (kind === "dcdc-converter") return "DCDCConverter";
  if (kind === "acdc-converter") return "DCACConverter";
  if (kind === "acac-converter") return "ACACConverter";
  return "";
}

export type DeviceIndexCounters = Record<string, number>;

function deviceIndexCounterKey(node: Pick<ModelNode, "kind" | "params">): string {
  if (isContainerParams(node.params)) {
    return String(node.kind);
  }
  const section = inferESection(node.kind, node.params);
  if (section) {
    return section;
  }
  return node.params[CUSTOM_DEVICE_TEMPLATE_KEY] === "1" ? String(node.kind) : "";
}

function parseDeviceIndex(value?: string): number {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text)) {
    return 0;
  }
  return Number.parseInt(text, 10);
}

function parseContainerRelationField(fieldName: string) {
  const transformerMatch = /^idx_xf_t(\d+)$/.exec(fieldName);
  if (transformerMatch) {
    return {
      energy: "ac",
      role: "transformer",
      terminalNumber: Number.parseInt(transformerMatch[1], 10),
      doublePort: false
    };
  }
  const match = /^idx_(ac2|dc2|h22|heat2|ac|dc|h2|heat)_(unit|load|transformer)_t(\d+)$/.exec(fieldName);
  if (!match) {
    return null;
  }
  const [, energy, role, terminalNumber] = match;
  return {
    energy,
    role,
    terminalNumber: Number.parseInt(terminalNumber, 10),
    doublePort: energy.endsWith("2")
  };
}

function containerRelationCounterKey(fieldName: string): string {
  const parsed = parseContainerRelationField(fieldName);
  if (!parsed) {
    return "";
  }
  const { energy, role } = parsed;
  const mapping: Record<string, string> = {
    ac_unit: "ACGenerator",
    ac_load: "ACLoad",
    ac_transformer: "ACTransformer",
    ac2_unit: "TwoPortACGenerator",
    ac2_load: "TwoPortACLoad",
    dc_unit: "DCGenerator",
    dc_load: "DCLoad",
    dc2_unit: "TwoPortDCGenerator",
    dc2_load: "TwoPortDCLoad",
    h2_unit: "HydrogenSource",
    h2_load: "HydrogenLoad",
    h22_unit: "TwoPortHydrogenSource",
    h22_load: "TwoPortHydrogenLoad",
    heat_unit: "HeatSource",
    heat_load: "HeatLoad",
    heat2_unit: "TwoPortHeatSource",
    heat2_load: "TwoPortHeatLoad"
  };
  return mapping[`${energy}_${role}`] ?? `ContainerRelation:${energy}_${role}`;
}

function isContainerTransformerRelationKey(fieldName: string): boolean {
  return /^idx_xf_t\d+$/.test(fieldName) || /_transformer_t\d+$/.test(fieldName);
}

function deriveContainerRelationCounters(params: Record<string, string>, counters: DeviceIndexCounters) {
  for (const [fieldName, value] of Object.entries(params)) {
    const counterKey = containerRelationCounterKey(fieldName);
    if (!counterKey) {
      continue;
    }
    const idx = parseDeviceIndex(value);
    if (idx > (counters[counterKey] ?? 0)) {
      counters[counterKey] = idx;
    }
  }
}

function assignContainerRelationIndexes<T extends Pick<ModelNode, "params">>(
  node: T,
  counters: DeviceIndexCounters
): { node: T; counters: DeviceIndexCounters; changed: boolean } {
  if (!isContainerParams(node.params)) {
    return { node, counters, changed: false };
  }
  const relationEntries = Object.keys(node.params)
    .map((fieldName) => {
      const parsed = parseContainerRelationField(fieldName);
      const counterKey = containerRelationCounterKey(fieldName);
      return parsed && counterKey ? { ...parsed, counterKey, fieldName } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.terminalNumber - right.terminalNumber || left.fieldName.localeCompare(right.fieldName));
  const relationGroups: Array<{ counterKey: string; fields: string[] }> = [];
  const consumedFields = new Set<string>();
  for (const entry of relationEntries) {
    if (consumedFields.has(entry.fieldName)) {
      continue;
    }
    consumedFields.add(entry.fieldName);
    const fields = [entry.fieldName];
    if (entry.doublePort) {
      const pairedEntry = relationEntries.find(
        (candidate) =>
          !consumedFields.has(candidate.fieldName) &&
          candidate.doublePort &&
          candidate.counterKey === entry.counterKey &&
          candidate.terminalNumber === entry.terminalNumber + 1
      );
      if (pairedEntry) {
        consumedFields.add(pairedEntry.fieldName);
        fields.push(pairedEntry.fieldName);
      }
    }
    relationGroups.push({ counterKey: entry.counterKey, fields });
  }
  if (relationGroups.length === 0) {
    return { node, counters, changed: false };
  }
  let nextParams = node.params;
  let nextCounters = counters;
  let changed = false;
  for (const group of relationGroups) {
    const existingIdx = Math.max(0, ...group.fields.map((fieldName) => parseDeviceIndex(nextParams[fieldName])));
    const idx = existingIdx > 0 ? existingIdx : (nextCounters[group.counterKey] ?? 0) + 1;
    nextCounters = { ...nextCounters, [group.counterKey]: Math.max(nextCounters[group.counterKey] ?? 0, idx) };
    for (const fieldName of group.fields) {
      if (nextParams[fieldName] !== String(idx)) {
        nextParams = { ...nextParams, [fieldName]: String(idx) };
        changed = true;
      }
    }
  }
  return { node: changed ? { ...node, params: nextParams } : node, counters: nextCounters, changed };
}

export function deriveDeviceIndexCounters(nodes: Pick<ModelNode, "kind" | "params">[]): DeviceIndexCounters {
  const counters: DeviceIndexCounters = {};
  for (const node of nodes) {
    const key = deviceIndexCounterKey(node);
    if (key) {
      const idx = parseDeviceIndex(node.params.idx);
      if (idx > (counters[key] ?? 0)) {
        counters[key] = idx;
      }
    }
    deriveContainerRelationCounters(node.params, counters);
  }
  return counters;
}

export function normalizeDeviceIndexCounters(
  counters: DeviceIndexCounters | undefined,
  nodes: Pick<ModelNode, "kind" | "params">[] = []
): DeviceIndexCounters {
  const normalized: DeviceIndexCounters = {};
  for (const [section, value] of Object.entries(counters ?? {})) {
    const numeric = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    if (numeric > 0) {
      normalized[section] = numeric;
    }
  }
  const derived = deriveDeviceIndexCounters(nodes);
  for (const [section, value] of Object.entries(derived)) {
    normalized[section] = Math.max(normalized[section] ?? 0, value);
  }
  return normalized;
}

export function assignPermanentDeviceIndex<T extends Pick<ModelNode, "kind" | "params">>(
  node: T,
  counters: DeviceIndexCounters = {}
): { node: T; counters: DeviceIndexCounters } {
  const key = deviceIndexCounterKey(node);
  if (!key) {
    const relationResult = assignContainerRelationIndexes(node, counters);
    return { node: relationResult.node, counters: relationResult.counters };
  }
  const existingIdx = parseDeviceIndex(node.params.idx);
  if (existingIdx > 0) {
    const nextCounters = existingIdx <= (counters[key] ?? 0) ? counters : { ...counters, [key]: existingIdx };
    const relationResult = assignContainerRelationIndexes(node, nextCounters);
    return { node: relationResult.node, counters: relationResult.counters };
  }
  const idx = (counters[key] ?? 0) + 1;
  const indexedNode = { ...node, params: { ...node.params, idx: String(idx) } };
  const relationResult = assignContainerRelationIndexes(indexedNode, { ...counters, [key]: idx });
  return { node: relationResult.node, counters: relationResult.counters };
}

export function assignMissingDeviceIndexes<T extends Pick<ModelNode, "kind" | "params">>(
  nodes: T[],
  counters?: DeviceIndexCounters
): { nodes: T[]; counters: DeviceIndexCounters } {
  let nextCounters = normalizeDeviceIndexCounters(counters, nodes);
  let changed = false;
  const nextNodes = nodes.map((node) => {
    const result = assignPermanentDeviceIndex(node, nextCounters);
    nextCounters = result.counters;
    if (result.node !== node) {
      changed = true;
    }
    return result.node;
  });
  return { nodes: changed ? nextNodes : nodes, counters: nextCounters };
}

function normalizeRunStatForE(value?: string) {
  if (!value) return "";
  if (value === "运行") return "1";
  if (value === "停运" || value === "检修") return "0";
  return value;
}

function normalizeSwitchStatusForE(value?: string) {
  if (!value) return "";
  if (value === "闭合") return "1";
  if (value === "合闸") return "1";
  if (value === "打开") return "0";
  if (value === "分闸") return "0";
  return value;
}

function terminalNodeNumber(node: Pick<ModelNode, "nodeNumber" | "terminals">, index: number) {
  return node.terminals[index]?.nodeNumber ?? (index === 0 ? node.nodeNumber : "") ?? "";
}

function mappedLegacyEValue(key: string, params: Record<string, string>) {
  if (key === "pbase") return params.pbase ?? params.ratedActivePower ?? "";
  if (key === "qbase") return params.qbase ?? params.ratedReactivePower ?? "";
  if (key === "r") return params.r ?? params.resistancePu ?? "";
  if (key === "x") return params.x ?? params.reactancePu ?? "";
  if (key === "b") return params.b ?? params.halfChargingSusceptancePu ?? "";
  if (key === "gt") return params.gt ?? params.magnetizingConductancePu ?? "";
  if (key === "bt") return params.bt ?? params.magnetizingSusceptancePu ?? "";
  if (key === "tap") return params.tap ?? params.tapRatio ?? "";
  if (key === "r1") return params.r1 ?? params.sourceEquivalentResistance ?? "";
  if (key === "r2") return params.r2 ?? params.targetEquivalentResistance ?? "";
  return params[key] ?? "";
}

type EDeviceExport = {
  id: string;
  kind: string;
  section: string;
  params: Record<string, string>;
};

type EParamValueOptions = {
  preferTopologyNodeNumbers?: boolean;
};

export function getEParamValue(
  key: string,
  node: Pick<ModelNode, "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  options: EParamValueOptions = {}
) {
  if (key === "name") {
    return node.name;
  }
  if (key === "run_stat") {
    return normalizeRunStatForE(node.params.run_stat);
  }
  if (key === "status") {
    return normalizeSwitchStatusForE(node.params.status ?? node.params.closedStatus);
  }
  if (key === "control_type") {
    return node.params.control_type ?? node.params.controlType ?? node.params.sourceControlType ?? "";
  }
  if (key === "vbase") {
    return node.params.vbase ?? node.terminals[0]?.vbase ?? "";
  }
  if (key === "node") {
    return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 0) : node.params.node ?? terminalNodeNumber(node, 0);
  }
  if (key === "i_node") {
    return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 0) : node.params.i_node ?? terminalNodeNumber(node, 0);
  }
  if (key === "j_node") {
    return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 1) : node.params.j_node ?? terminalNodeNumber(node, 1);
  }
  if (key === "ac_node") {
    const acNodeNumber = node.terminals.find((terminal) => terminal.type === "ac")?.nodeNumber ?? terminalNodeNumber(node, 0);
    return options.preferTopologyNodeNumbers ? acNodeNumber : node.params.ac_node ?? acNodeNumber;
  }
  if (key === "dc_node") {
    const dcNodeNumber = node.terminals.find((terminal) => terminal.type === "dc")?.nodeNumber ?? terminalNodeNumber(node, 1);
    return options.preferTopologyNodeNumbers ? dcNodeNumber : node.params.dc_node ?? dcNodeNumber;
  }
  return mappedLegacyEValue(key, node.params);
}

export function getEParameterKeys(kind: string, params: Record<string, string>) {
  const section = inferESection(kind, params);
  return section ? E_SECTION_COLUMNS[section] ?? [] : [];
}

export function buildEDeviceValues(
  node: Pick<ModelNode, "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  options: EParamValueOptions = {}
) {
  const values: Record<string, string> = {};
  for (const key of getEParameterKeys(node.kind, node.params)) {
    const value = getEParamValue(key, node, options);
    if (value !== "") {
      values[key] = value;
    }
  }
  return values;
}

function firstText(values: Array<string | undefined>): string {
  return values.find((value) => value !== undefined && value.trim() !== "") ?? "";
}

function terminalVoltageDisplay(node: ModelNode, terminal: Terminal): string {
  return terminalVoltageBaseNumber(firstText([
    terminal.vbase,
    node.params.vbase,
    node.params.highVbase,
    node.params.mediumVbase,
    node.params.lowVbase,
    node.params.sourceVbase,
    node.params.targetVbase,
    node.params.voltageLevel,
    node.params.ratedVoltage,
    node.params.voltage
  ]));
}

function topologyRepresentativeScore(node: ModelNode): number {
  if (isBusNode(node)) return 0;
  if (node.terminals.length === 1) return 1;
  if (node.kind.includes("converter") || node.kind.includes("transformer")) return 2;
  return 3;
}

function isThreeWindingTransformer(node: Pick<ModelNode, "kind">): boolean {
  return node.kind === "ac-three-winding-transformer";
}

function buildTopologyNodeDevices(nodes: ModelNode[]): EDeviceExport[] {
  type ElectricalTerminalType = Extract<TerminalType, "ac" | "dc">;
  type TopologyNodeCandidate = { node: ModelNode; terminal: Terminal; name?: string; voltage?: string };
  const groups: Record<ElectricalTerminalType, Map<string, TopologyNodeCandidate[]>> = {
    ac: new Map(),
    dc: new Map()
  };
  for (const node of nodes) {
    if (isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      const terminalType = terminal.type;
      if (terminalType !== "ac" && terminalType !== "dc") {
        continue;
      }
      if (!terminal.nodeNumber) {
        continue;
      }
      const candidates = groups[terminalType].get(terminal.nodeNumber) ?? [];
      candidates.push({ node, terminal });
      groups[terminalType].set(terminal.nodeNumber, candidates);
    }
    if (isThreeWindingTransformer(node) && node.params.neutral_node) {
      const neutralTerminal: Terminal = {
        id: "neutral",
        label: "中性点",
        type: "ac",
        anchor: { x: 0, y: 0 },
        nodeNumber: node.params.neutral_node,
        vbase: node.params.neutral_vbase || "1.0"
      };
      const candidates = groups.ac.get(neutralTerminal.nodeNumber) ?? [];
      candidates.push({
        node,
        terminal: neutralTerminal,
        name: `${node.name}_neutral`,
        voltage: node.params.neutral_vbase || "1.0"
      });
      groups.ac.set(neutralTerminal.nodeNumber, candidates);
    }
  }

  const buildForType = (type: ElectricalTerminalType, section: "ACNode" | "DCNode"): EDeviceExport[] =>
    Array.from(groups[type].entries())
      .sort(([first], [second]) => Number(first) - Number(second))
      .map(([idx, candidates]) => {
        const representative = [...candidates].sort(
          (first, second) => topologyRepresentativeScore(first.node) - topologyRepresentativeScore(second.node)
        )[0];
        const vbase = firstText(candidates.map(({ node, terminal }) => terminalVoltageDisplay(node, terminal)));
        const voltage = firstText([representative.voltage, representative.node.params.voltage, vbase]);
        const runStat = normalizeRunStatForE(representative.node.params.run_stat) || "1";
        const commonParams = {
          idx,
          name: representative.name || representative.node.name || `${section}_${idx}`,
          vbase,
          voltage,
          isl: representative.node.params.isl ?? "0",
          run_stat: runStat
        };
        return {
          id: `${section}-${idx}`,
          kind: type === "ac" ? "ac-node" : "dc-node",
          section,
          params: section === "ACNode" ? { ...commonParams, angle: representative.node.params.angle ?? "0" } : commonParams
        };
      });

  return [...buildForType("ac", "ACNode"), ...buildForType("dc", "DCNode")];
}

const THREE_WINDING_TRANSFORMER_SIDES = [
  { suffix: "high", label: "高压绕组", terminalIndex: 0, idxKey: "idx_xf_t1" },
  { suffix: "medium", label: "中压绕组", terminalIndex: 1, idxKey: "idx_xf_t2" },
  { suffix: "low", label: "低压绕组", terminalIndex: 2, idxKey: "idx_xf_t3" }
] as const;

function threeWindingSideParam(params: Record<string, string>, suffix: string, key: string, fallback = ""): string {
  const paramKey = `${suffix}${key}`;
  return params[paramKey] ?? fallback;
}

function buildThreeWindingTransformerBranchDevices(nodes: ModelNode[]): EDeviceExport[] {
  const records: EDeviceExport[] = [];
  for (const node of nodes) {
    if (!isThreeWindingTransformer(node) || !node.params.neutral_node) {
      continue;
    }
    for (const side of THREE_WINDING_TRANSFORMER_SIDES) {
      const terminal = node.terminals[side.terminalIndex];
      if (!terminal?.nodeNumber) {
        continue;
      }
      records.push({
        id: `${node.id}:w${side.terminalIndex + 1}`,
        kind: "ac-two-winding-transformer",
        section: "ACTransformer",
        params: {
          idx: node.params[side.idxKey] ?? "",
          name: `${node.name}_${side.label}`,
          i_node: terminal.nodeNumber,
          j_node: node.params.neutral_node,
          r: threeWindingSideParam(node.params, side.suffix, "ResistancePu"),
          x: threeWindingSideParam(node.params, side.suffix, "ReactancePu"),
          gt: threeWindingSideParam(node.params, side.suffix, "MagnetizingConductancePu"),
          bt: threeWindingSideParam(node.params, side.suffix, "MagnetizingSusceptancePu"),
          tap: threeWindingSideParam(node.params, side.suffix, "TapRatio"),
          shift: threeWindingSideParam(node.params, side.suffix, "Shift", "0"),
          run_stat: normalizeRunStatForE(node.params.run_stat)
        }
      });
    }
  }
  return records;
}

function buildThreePowerTransformerDevices(nodes: ModelNode[]): EDeviceExport[] {
  return nodes
    .filter((node) => isThreeWindingTransformer(node))
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      section: "ThreePowerTransformer",
      params: {
        idx: node.params.idx ?? "",
        name: node.name,
        run_stat: normalizeRunStatForE(node.params.run_stat),
        idx_xf_t1: node.params.idx_xf_t1 ?? "",
        idx_xf_t2: node.params.idx_xf_t2 ?? "",
        idx_xf_t3: node.params.idx_xf_t3 ?? ""
      }
    }));
}

export function buildEDeviceParameterFile(project: ProjectFile) {
  const topologyNodes = calculateElectricalTopology(project.nodes, project.edges);
  const topologyNodeDevices = buildTopologyNodeDevices(topologyNodes);
  const threePowerTransformerDevices = buildThreePowerTransformerDevices(topologyNodes);
  const threeWindingTransformerBranchDevices = buildThreeWindingTransformerBranchDevices(topologyNodes);
  const deviceRecords = topologyNodes
    .map<EDeviceExport | null>((node) => {
      const section = inferESection(node.kind, node.params);
      if (!section || section === "ACNode" || section === "DCNode") {
        return null;
      }
      return {
        id: node.id,
        kind: node.kind,
        section,
        params: buildEDeviceValues(node, { preferTopologyNodeNumbers: true })
      };
    })
    .filter((device): device is EDeviceExport => Boolean(device));

  return JSON.stringify(
    {
      version: 1,
      name: project.name,
      modelParameters: {
        powerUnit: project.powerUnit ?? DEFAULT_POWER_UNIT,
        voltageUnit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
        currentUnit: project.currentUnit ?? DEFAULT_CURRENT_UNIT,
        powerBaseValue: project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE
      },
      devices: [...topologyNodeDevices, ...deviceRecords, ...threePowerTransformerDevices, ...threeWindingTransformerBranchDevices],
      edges: project.edges
    },
    null,
    2
  );
}

export type SavedProjectRecord = {
  id: string;
  name: string;
  updatedAt: string;
  project: ProjectFile;
};

export type SavedSchemeRecord = {
  id: string;
  name: string;
  updatedAt: string;
  projects: SavedProjectRecord[];
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

export type AlignDirection = "horizontal" | "vertical";

export type RoutedEdge = {
  edgeId: string;
  points: Point[];
  path: string;
};

export type TopologyValidationErrorType = "floating-terminal" | "terminal-type-mismatch" | "voltage-mismatch";

export type TopologyValidationError = {
  id: string;
  type: TopologyValidationErrorType;
  message: string;
  nodeId?: string;
  edgeId?: string;
  relatedNodeIds: string[];
};

const readonlyIntegerDefinition = (cnName: string, enName: string, typicalValue = ""): DeviceParameterDefinition => ({
  cnName,
  enName,
  valueType: "integer",
  typicalValue,
  readonly: true
});

const threeWindingTransformerParameterDefinitions: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  { cnName: "运行状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
  readonlyIntegerDefinition("高压绕组双绕组主变idx", "idx_xf_t1"),
  readonlyIntegerDefinition("中压绕组双绕组主变idx", "idx_xf_t2"),
  readonlyIntegerDefinition("低压绕组双绕组主变idx", "idx_xf_t3")
];

export const DEVICE_LIBRARY: DeviceTemplate[] = [
  {
    kind: "static-text",
    label: "文字",
    group: "静态图元",
    size: { width: 120, height: 40 },
    params: {
      text: "文字",
      fillColor: "transparent",
      strokeColor: "transparent",
      textColor: "#111827",
      lineWidth: "0",
      strokeStyle: "solid",
      fontSize: "24",
      fontFamily: "Arial",
      fontWeight: "400",
      fontStyle: "normal",
      textDecoration: "none"
    },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-line",
    label: "直线",
    group: "静态图元",
    size: { width: 140, height: 24 },
    params: { fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-polyline",
    label: "折线",
    group: "静态图元",
    size: { width: 140, height: 70 },
    params: { fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-circle",
    label: "正圆",
    group: "静态图元",
    size: { width: 72, height: 72 },
    params: { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-ellipse",
    label: "椭圆",
    group: "静态图元",
    size: { width: 112, height: 70 },
    params: { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-rect",
    label: "方框",
    group: "静态图元",
    size: { width: 112, height: 70 },
    params: { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-image",
    label: "图片",
    group: "静态图元",
    size: { width: 140, height: 90 },
    params: { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#64748b", lineWidth: "0", strokeStyle: "solid", fontSize: "16", backgroundImage: "", backgroundImageAssetId: "" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-web",
    label: "WEB",
    group: "静态图元",
    size: { width: 180, height: 110 },
    params: { text: "https://", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#334155", lineWidth: "0", strokeStyle: "solid", fontSize: "14" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-date",
    label: "日期",
    group: "静态图元",
    size: { width: 130, height: 36 },
    params: { text: "2026-01-01", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-time",
    label: "时刻",
    group: "静态图元",
    size: { width: 110, height: 36 },
    params: { text: "12:00", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-datetime",
    label: "日期时刻",
    group: "静态图元",
    size: { width: 190, height: 36 },
    params: { text: "2026-01-01 12:00", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-input",
    label: "输入框",
    group: "静态图元",
    size: { width: 150, height: 38 },
    params: { text: "请输入", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#334155", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-button",
    label: "按钮",
    group: "静态图元",
    size: { width: 96, height: 38 },
    params: { text: "按钮", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "ac-source",
    label: "交流电源",
    group: "交流设备",
    size: { width: 84, height: 56 },
    params: { ratedVoltage: "10 kV", frequency: "50 Hz", shortCircuitCapacity: "500 MVA" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-wind-source",
    label: "交流风电",
    group: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "35 kV", ratedPower: "50 MW", sourceType: "风电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-pv-source",
    label: "交流光伏",
    group: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "10 kV", ratedPower: "20 MW", sourceType: "光伏" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-thermal-source",
    label: "交流火电",
    group: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "220 kV", ratedPower: "600 MW", sourceType: "火电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-hydro-source",
    label: "交流水电",
    group: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "220 kV", ratedPower: "300 MW", sourceType: "水电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-nuclear-source",
    label: "交流核电",
    group: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "500 kV", ratedPower: "1000 MW", sourceType: "核电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-storage",
    label: "电化学储能",
    group: "交流设备",
    size: { width: 90, height: 56 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", energyCapacity: "20 MWh", stateOfCharge: "50%" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-electrolyzer",
    label: "交流电制氢",
    group: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", hydrogenFlow: "1000 Nm3/h" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "h2"],
    terminalLabels: ["交流端", "氢能端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["ac-load", "h2-source"],
    isContainer: true
  },
  {
    kind: "dc-electrolyzer",
    label: "直流电制氢",
    group: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", hydrogenFlow: "1000 Nm3/h" },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "h2"],
    terminalLabels: ["直流端", "氢能端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["dc-load", "h2-source"],
    isContainer: true
  },
  {
    kind: "hydrogen-source",
    label: "氢源",
    group: "氢能设备",
    size: { width: 84, height: 56 },
    params: { pressure: "20 MPa", hydrogenFlow: "1000 Nm3/h" },
    terminalType: "h2",
    terminalCount: 1
  },
  {
    kind: "hydrogen-tank",
    label: "储氢罐",
    group: "氢能设备",
    size: { width: 126, height: 58 },
    params: { pressure: "35 MPa", capacity: "1000 kg" },
    terminalType: "h2",
    terminalCount: 4
  },
  {
    kind: "hydrogen-load",
    label: "氢荷",
    group: "氢能设备",
    size: { width: 86, height: 58 },
    params: { pressure: "2 MPa", hydrogenDemand: "500 Nm3/h" },
    terminalType: "h2",
    terminalCount: 1
  },
  {
    kind: "ac-fuel-cell",
    label: "交流燃料电池",
    group: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "10 kV", ratedPower: "3 MW", hydrogenFlow: "600 Nm3/h" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "h2"],
    terminalLabels: ["交流端", "氢能端"],
    terminalRoles: ["single-source", "single-load"],
    terminalAssociations: ["ac-generator", "h2-load"],
    isContainer: true
  },
  {
    kind: "dc-fuel-cell",
    label: "直流燃料电池",
    group: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "750 V", ratedPower: "3 MW", hydrogenFlow: "600 Nm3/h" },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "h2"],
    terminalLabels: ["直流端", "氢能端"],
    terminalRoles: ["single-source", "single-load"],
    terminalAssociations: ["dc-generator", "h2-load"],
    isContainer: true
  },
  {
    kind: "hydrogen-bus",
    label: "氢能母线",
    group: "氢能设备",
    size: { width: 120, height: 28 },
    params: { pressure: "20 MPa" },
    terminalType: "h2",
    terminalCount: 4
  },
  {
    kind: "hydrogen-compressor",
    label: "氢压机",
    group: "氢能设备",
    size: { width: 86, height: 58 },
    params: { inletPressure: "2 MPa", outletPressure: "20 MPa" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-pressure-reducer",
    label: "减压阀",
    group: "氢能设备",
    size: { width: 82, height: 54 },
    params: { inletPressure: "20 MPa", outletPressure: "2 MPa" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-shutoff-valve",
    label: "截止阀",
    group: "氢能设备",
    size: { width: 82, height: 54 },
    params: { status: "1" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-pipeline",
    label: "输氢管道",
    group: "氢能设备",
    size: { width: 108, height: 36 },
    params: { length: "1 km", diameter: "DN200" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "heat-boiler",
    label: "供热锅炉",
    group: "热能设备",
    size: { width: 94, height: 60 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC" },
    terminalType: "heat",
    terminalCount: 1,
    terminalTypes: ["heat"],
    terminalLabels: ["热力端"],
    terminalRoles: ["single-source"],
    terminalAssociations: ["heat-source"],
    isContainer: true
  },
  {
    kind: "two-port-heat-boiler",
    label: "供热锅炉2",
    group: "热能设备",
    size: { width: 100, height: 64 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["供水端", "回水端"],
    terminalRoles: ["double-source", "double-source"],
    terminalAssociations: ["heat2-source", ""],
    isContainer: true,
    terminalAnchors: [
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]
  },
  {
    kind: "heat-source",
    label: "单端热源",
    group: "热能设备",
    size: { width: 88, height: 56 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC" },
    terminalType: "heat",
    terminalCount: 1
  },
  {
    kind: "two-port-heat-source",
    label: "双端热源",
    group: "热能设备",
    size: { width: 96, height: 60 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["供水端", "回水端"]
  },
  {
    kind: "heat-exchanger",
    label: "双端热交换器",
    group: "热能设备",
    size: { width: 96, height: 66 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["一次侧", "二次侧"]
  },
  {
    kind: "three-port-heat-exchanger",
    label: "三端热交换器",
    group: "热能设备",
    size: { width: 104, height: 72 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 3,
    terminalLabels: ["单端侧", "双端侧供水", "双端侧回水"],
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]
  },
  {
    kind: "four-port-heat-exchanger",
    label: "四端热交换器",
    group: "热能设备",
    size: { width: 110, height: 76 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 4,
    terminalLabels: ["一侧供水", "一侧回水", "二侧供水", "二侧回水"],
    terminalAnchors: [
      { x: -0.5, y: -0.25 },
      { x: -0.5, y: 0.25 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]
  },
  {
    kind: "ac-heater",
    label: "交流电制热",
    group: "热能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", heatPower: "4.8 MW" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "heat"],
    terminalLabels: ["交流端", "热力端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["ac-load", "heat-source"],
    isContainer: true
  },
  {
    kind: "ac-two-port-heater",
    label: "交流电制热2",
    group: "热能设备",
    size: { width: 116, height: 68 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", heatPower: "4.8 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "ac",
    terminalCount: 3,
    terminalTypes: ["ac", "heat", "heat"],
    terminalLabels: ["交流端", "供水端", "回水端"],
    terminalRoles: ["single-load", "double-source", "double-source"],
    terminalAssociations: ["ac-load", "heat2-source", ""],
    isContainer: true,
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]
  },
  {
    kind: "dc-heater",
    label: "直流电制热",
    group: "热能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", heatPower: "4.8 MW" },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "heat"],
    terminalLabels: ["直流端", "热力端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["dc-load", "heat-source"],
    isContainer: true
  },
  {
    kind: "dc-two-port-heater",
    label: "直流电制热2",
    group: "热能设备",
    size: { width: 116, height: 68 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", heatPower: "4.8 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "dc",
    terminalCount: 3,
    terminalTypes: ["dc", "heat", "heat"],
    terminalLabels: ["直流端", "供水端", "回水端"],
    terminalRoles: ["single-load", "double-source", "double-source"],
    terminalAssociations: ["dc-load", "heat2-source", ""],
    isContainer: true,
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]
  },
  {
    kind: "thermal-storage-tank",
    label: "储热罐",
    group: "热能设备",
    size: { width: 126, height: 58 },
    params: { capacity: "100 MWh", temperature: "90 degC" },
    terminalType: "heat",
    terminalCount: 4
  },
  {
    kind: "heat-load",
    label: "热负荷",
    group: "热能设备",
    size: { width: 86, height: 58 },
    params: { heatDemand: "5 MW" },
    terminalType: "heat",
    terminalCount: 1
  },
  {
    kind: "single-port-heat-load",
    label: "单端热荷",
    group: "热能设备",
    size: { width: 86, height: 58 },
    params: { heatDemand: "5 MW" },
    terminalType: "heat",
    terminalCount: 1
  },
  {
    kind: "two-port-heat-load",
    label: "双端热荷",
    group: "热能设备",
    size: { width: 94, height: 60 },
    params: { heatDemand: "5 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["供水端", "回水端"]
  },
  {
    kind: "heat-bus",
    label: "热力母线",
    group: "热能设备",
    size: { width: 120, height: 28 },
    params: { temperature: "90 degC" },
    terminalType: "heat",
    terminalCount: 4
  },
  {
    kind: "heat-pipeline",
    label: "输热管道",
    group: "热能设备",
    size: { width: 108, height: 36 },
    params: { length: "1 km", diameter: "DN200" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-pump",
    label: "循环水泵",
    group: "热能设备",
    size: { width: 86, height: 58 },
    params: { flowRate: "200 t/h", head: "30 m" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-shutoff-valve",
    label: "截止阀",
    group: "热能设备",
    size: { width: 82, height: 54 },
    params: { status: "1" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "ac-line",
    label: "交流线路",
    group: "交流设备",
    size: { width: 108, height: 36 },
    params: { length: "10 km", r: "0.12 ohm/km", x: "0.38 ohm/km" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-zero-branch",
    label: "交流零阻抗支路",
    group: "交流设备",
    size: { width: 108, height: 36 },
    params: {},
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-bus",
    label: "交流母线",
    group: "交流设备",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "10 kV", section: "I段" },
    terminalType: "ac",
    terminalCount: 4
  },
  {
    kind: "ac-switch",
    label: "交流开关",
    group: "交流设备",
    size: { width: 72, height: 48 },
    params: { status: "合闸", ratedCurrent: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-breaker",
    label: "交流断路器",
    group: "交流设备",
    size: { width: 78, height: 50 },
    params: {},
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-load",
    label: "交流负荷",
    group: "交流设备",
    size: { width: 86, height: 58 },
    params: { activePower: "5 MW", reactivePower: "1.2 Mvar", powerFactor: "0.95" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-transformer",
    label: "交流主变",
    group: "交流设备",
    size: { width: 92, height: 70 },
    params: { ratedCapacity: "50 MVA", voltageRatio: "110/10 kV", impedance: "10.5%" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-three-winding-transformer",
    label: "三绕组主变",
    group: "交流设备",
    size: { width: 104, height: 76 },
    params: { ratedCapacity: "90 MVA", voltageRatio: "220/110/10 kV", windingType: "三绕组", impedance: "12.0%" },
    terminalType: "ac",
    terminalCount: 3,
    isContainer: true,
    parameterDefinitions: threeWindingTransformerParameterDefinitions
  },
  {
    kind: "dc-source",
    label: "直流电源",
    group: "直流设备",
    size: { width: 84, height: 56 },
    params: { ratedVoltage: "750 V", maxCurrent: "2000 A" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-wind-source",
    label: "直流风电",
    group: "直流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "1500 V", ratedPower: "10 MW", sourceType: "风电" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-pv-source",
    label: "直流光伏",
    group: "直流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "1500 V", ratedPower: "5 MW", sourceType: "光伏" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-storage",
    label: "电化学储能",
    group: "直流设备",
    size: { width: 90, height: 56 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", energyCapacity: "20 MWh", stateOfCharge: "50%" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-line",
    label: "直流线路",
    group: "直流设备",
    size: { width: 108, height: 36 },
    params: { length: "2 km", resistance: "0.08 ohm/km" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-zero-branch",
    label: "直流零阻抗支路",
    group: "直流设备",
    size: { width: 108, height: 36 },
    params: {},
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-bus",
    label: "直流母线",
    group: "直流设备",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "750 V", pole: "正负极" },
    terminalType: "dc",
    terminalCount: 4
  },
  {
    kind: "dc-switch",
    label: "直流开关",
    group: "直流设备",
    size: { width: 72, height: 48 },
    params: { status: "合闸", ratedCurrent: "1600 A" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-breaker",
    label: "直流断路器",
    group: "直流设备",
    size: { width: 78, height: 50 },
    params: {},
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-load",
    label: "直流负荷",
    group: "直流设备",
    size: { width: 86, height: 58 },
    params: { power: "1.5 MW", voltage: "750 V" },
    terminalType: "dc",
    terminalCount: 1
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
  },
  {
    kind: "acac-converter",
    label: "ACAC变流器",
    group: "变流设备",
    size: { width: 112, height: 66 },
    params: {},
    terminalType: "ac",
    terminalCount: 2
  }
];

let nodeNumberSeed = 1;
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const makeNodeNumber = () => `N${nodeNumberSeed++}`;
export const CUSTOM_PARAM_DEFINITIONS_KEY = "_customParamDefinitions";
export const CUSTOM_DEVICE_TEMPLATE_KEY = "_customDeviceTemplate";

const defaultTerminalVbase = (type: TerminalType) => {
  if (type === "ac") return "10 kV";
  if (type === "dc") return "750 V";
  return "";
};

export function normalizeVoltageBaseInput(value?: string): string {
  let normalized = "";
  let hasDecimalPoint = false;
  for (const char of String(value ?? "")) {
    if (/\d/.test(char)) {
      normalized += char;
      continue;
    }
    if (char === "." && !hasDecimalPoint) {
      normalized += char;
      hasDecimalPoint = true;
    }
  }
  return normalized;
}

export function terminalVoltageBaseNumber(value?: string): string {
  return normalizeVoltageBaseInput(value);
}

const terminalTypeLabel = (type: TerminalType) => {
  if (type === "ac") return "交流";
  if (type === "dc") return "直流";
  if (type === "h2") return "氢能";
  return "热能";
};

const terminalPortLabel = (type: TerminalType) => {
  if (type === "ac") return "交流电";
  if (type === "dc") return "直流电";
  if (type === "h2") return "氢能";
  return "热能";
};

const containerTerminalRoleLabel = (role: ContainerTerminalRole) => {
  if (role === "double-source") return "双端源";
  if (role === "single-source") return "单端源";
  if (role === "double-load") return "双端荷";
  return "单端荷";
};

const containerTerminalAssociationDefinitions: Record<
  ContainerTerminalAssociationType,
  { terminalType: TerminalType; energyKey: string; deviceRole: "unit" | "load"; label: string; deviceModel: string; doublePort?: boolean }
> = {
  "ac-generator": { terminalType: "ac", energyKey: "ac", deviceRole: "unit", label: "交流电源", deviceModel: "ACGenerator" },
  "ac-load": { terminalType: "ac", energyKey: "ac", deviceRole: "load", label: "交流电负荷", deviceModel: "ACLoad" },
  "dc-generator": { terminalType: "dc", energyKey: "dc", deviceRole: "unit", label: "直流电源", deviceModel: "DCGenerator" },
  "dc-load": { terminalType: "dc", energyKey: "dc", deviceRole: "load", label: "直流电负荷", deviceModel: "DCLoad" },
  "h2-source": { terminalType: "h2", energyKey: "h2", deviceRole: "unit", label: "氢源", deviceModel: "HydrogenSource" },
  "h2-load": { terminalType: "h2", energyKey: "h2", deviceRole: "load", label: "氢荷", deviceModel: "HydrogenLoad" },
  "heat-source": { terminalType: "heat", energyKey: "heat", deviceRole: "unit", label: "单端热源", deviceModel: "HeatSource" },
  "heat2-source": { terminalType: "heat", energyKey: "heat2", deviceRole: "unit", label: "双端热源", deviceModel: "TwoPortHeatSource", doublePort: true },
  "heat-load": { terminalType: "heat", energyKey: "heat", deviceRole: "load", label: "单端热荷", deviceModel: "HeatLoad" },
  "heat2-load": { terminalType: "heat", energyKey: "heat2", deviceRole: "load", label: "双端热荷", deviceModel: "TwoPortHeatLoad", doublePort: true }
};

const containerTerminalAssociationLabel = (association: ContainerTerminalAssociationType) =>
  containerTerminalAssociationDefinitions[association]?.label ?? association;

function defaultContainerAssociationFor(type: TerminalType, role: ContainerTerminalRole = "single-load"): ContainerTerminalAssociationType {
  const source = role.endsWith("source");
  const doublePort = role.startsWith("double");
  if (type === "ac") return source ? "ac-generator" : "ac-load";
  if (type === "dc") return source ? "dc-generator" : "dc-load";
  if (type === "h2") return source ? "h2-source" : "h2-load";
  if (doublePort) return source ? "heat2-source" : "heat2-load";
  return source ? "heat-source" : "heat-load";
}

export function isDoubleContainerTerminalAssociation(association?: ContainerTerminalAssociationValue): boolean {
  return Boolean(association && containerTerminalAssociationDefinitions[association]?.doublePort);
}

function getContainerTerminalAssociationDependencyIndex(
  terminalAssociations: readonly ContainerTerminalAssociationValue[],
  terminalIndex: number
): number {
  for (let index = 0; index < terminalAssociations.length; index += 1) {
    const association = terminalAssociations[index];
    if (!isDoubleContainerTerminalAssociation(association)) {
      continue;
    }
    if (index + 1 === terminalIndex) {
      return index;
    }
    index += 1;
  }
  return -1;
}

export function getContainerTerminalAssociationSourceIndex(
  terminalAssociations: readonly ContainerTerminalAssociationValue[],
  terminalIndex: number
): number {
  const dependencyIndex = getContainerTerminalAssociationDependencyIndex(terminalAssociations, terminalIndex);
  return dependencyIndex >= 0 ? dependencyIndex : terminalIndex;
}

export function isContainerTerminalAssociationDependent(
  terminalAssociations: readonly ContainerTerminalAssociationValue[],
  terminalIndex: number
): boolean {
  return getContainerTerminalAssociationDependencyIndex(terminalAssociations, terminalIndex) >= 0;
}

export function getEffectiveContainerTerminalAssociation(
  terminalAssociations: readonly ContainerTerminalAssociationValue[] | undefined,
  terminalTypes: readonly TerminalType[],
  terminalIndex: number,
  terminalRoles?: readonly ContainerTerminalRole[]
): ContainerTerminalAssociationType {
  if (terminalAssociations?.length) {
    const sourceIndex = getContainerTerminalAssociationSourceIndex(terminalAssociations, terminalIndex);
    const sourceType = terminalTypes[sourceIndex] ?? terminalTypes[terminalIndex] ?? "ac";
    return terminalAssociations[sourceIndex] || defaultContainerAssociationFor(sourceType);
  }
  const role = getEffectiveContainerTerminalRole(terminalRoles, terminalIndex);
  const roleSourceIndex = getContainerTerminalRoleSourceIndex(terminalRoles ?? [], terminalIndex);
  const sourceType = terminalTypes[roleSourceIndex] ?? terminalTypes[terminalIndex] ?? "ac";
  return defaultContainerAssociationFor(sourceType, role);
}

export function getContainerAssociationRelationKey(association: ContainerTerminalAssociationType, terminalIndex: number): string {
  const definition = containerTerminalAssociationDefinitions[association];
  return `idx_${definition.energyKey}_${definition.deviceRole}_t${terminalIndex + 1}`;
}

export function isDoubleContainerTerminalRole(role?: ContainerTerminalRole): boolean {
  return role === "double-source" || role === "double-load";
}

function getContainerTerminalRoleDependencyIndex(terminalRoles: readonly ContainerTerminalRole[], terminalIndex: number): number {
  for (let index = 0; index < terminalRoles.length; index += 1) {
    const role = terminalRoles[index] ?? "single-load";
    if (!isDoubleContainerTerminalRole(role)) {
      continue;
    }
    if (index + 1 === terminalIndex) {
      return index;
    }
    index += 1;
  }
  return -1;
}

export function getContainerTerminalRoleSourceIndex(
  terminalRoles: readonly ContainerTerminalRole[],
  terminalIndex: number
): number {
  const dependencyIndex = getContainerTerminalRoleDependencyIndex(terminalRoles, terminalIndex);
  return dependencyIndex >= 0 ? dependencyIndex : terminalIndex;
}

export function isContainerTerminalRoleDependent(
  terminalRoles: readonly ContainerTerminalRole[],
  terminalIndex: number
): boolean {
  return getContainerTerminalRoleDependencyIndex(terminalRoles, terminalIndex) >= 0;
}

export function getEffectiveContainerTerminalRole(
  terminalRoles: readonly ContainerTerminalRole[] | undefined,
  terminalIndex: number
): ContainerTerminalRole {
  const roles = terminalRoles ?? [];
  const sourceIndex = getContainerTerminalRoleSourceIndex(roles, terminalIndex);
  return roles[sourceIndex] ?? "single-load";
}

export function validateContainerTerminalRoles(
  terminalTypes: readonly TerminalType[],
  terminalRoles: readonly ContainerTerminalRole[]
): { valid: true; message: "" } | { valid: false; message: string; terminalIndex: number } {
  for (let index = 0; index < terminalTypes.length; index += 1) {
    const role = terminalRoles[index] ?? "single-load";
    if (!isDoubleContainerTerminalRole(role)) {
      continue;
    }
    if (index + 1 >= terminalTypes.length) {
      return {
        valid: false,
        terminalIndex: index,
        message: `端子${index + 1}是最后一个端子，不能设置为双端源/荷；双端源/荷必须同时占用端子${index + 1}和端子${index + 2}。`
      };
    }
    index += 1;
  }
  return { valid: true, message: "" };
}

export function validateContainerTerminalAssociations(
  terminalTypes: readonly TerminalType[],
  terminalAssociations: readonly ContainerTerminalAssociationValue[]
): { valid: true; message: "" } | { valid: false; message: string; terminalIndex: number } {
  for (let index = 0; index < terminalTypes.length; index += 1) {
    const association = terminalAssociations[index] || defaultContainerAssociationFor(terminalTypes[index] ?? "ac");
    const definition = containerTerminalAssociationDefinitions[association];
    const terminalType = terminalTypes[index] ?? definition.terminalType;
    if (definition.terminalType !== terminalType) {
      return {
        valid: false,
        terminalIndex: index,
        message: `端子${index + 1}是${terminalPortLabel(terminalType)}端口，不能关联${definition.label}。`
      };
    }
    if (!definition.doublePort) {
      continue;
    }
    if (index + 1 >= terminalTypes.length) {
      return {
        valid: false,
        terminalIndex: index,
        message: `端子${index + 1}是最后一个端子，不能设置为${definition.label}；双端热源/热荷必须同时占用端子${index + 1}和端子${index + 2}。`
      };
    }
    if (terminalTypes[index + 1] !== definition.terminalType) {
      return {
        valid: false,
        terminalIndex: index + 1,
        message: `端子${index + 2}必须是${terminalPortLabel(definition.terminalType)}端口，才能与端子${index + 1}共同关联${definition.label}。`
      };
    }
    if (terminalAssociations[index + 1]) {
      return {
        valid: false,
        terminalIndex: index + 1,
        message: `端子${index + 2}已随端子${index + 1}分配给${definition.label}，关联属性应为空。`
      };
    }
    index += 1;
  }
  return { valid: true, message: "" };
}

export function getContainerRelationKey(type: TerminalType, role: ContainerTerminalRole, terminalIndex: number): string {
  const energyKey = `${type}${role.startsWith("double") ? "2" : ""}`;
  const deviceRole = role.endsWith("load") ? "load" : "unit";
  return `idx_${energyKey}_${deviceRole}_t${terminalIndex + 1}`;
}

export function describeContainerTerminalAssociations(template: DeviceTemplate): ContainerTerminalAssociation[] {
  if (!template.isContainer || template.terminalCount <= 0) {
    return [];
  }
  const terminalTypes = templateTerminalTypes(template);
  const terminalRoles = template.terminalRoles ?? [];
  const terminalAssociations = template.terminalAssociations ?? [];
  const definitions = getTemplateParameterDefinitions(template);

  return terminalTypes.map((type, index) => {
    const dependent = terminalAssociations.length
      ? isContainerTerminalAssociationDependent(terminalAssociations, index)
      : isContainerTerminalRoleDependent(terminalRoles, index);
    const associationSourceIndex = terminalAssociations.length
      ? getContainerTerminalAssociationSourceIndex(terminalAssociations, index)
      : getContainerTerminalRoleSourceIndex(terminalRoles, index);
    const role = getEffectiveContainerTerminalRole(terminalRoles, index);
    const association = getEffectiveContainerTerminalAssociation(terminalAssociations, terminalTypes, index, terminalRoles);
    const relationType = terminalTypes[associationSourceIndex] ?? type;
    const expectedRelationKey = dependent
      ? ""
      : terminalAssociations.length
        ? getContainerAssociationRelationKey(association, index)
        : template.terminalRoles?.length
          ? getContainerRelationKey(relationType, role, index)
          : "";
    const relationDefinition =
      definitions.find((definition) => expectedRelationKey && definition.enName === expectedRelationKey) ??
      (dependent ? undefined : definitions.find((definition) => new RegExp(`^idx_.+_t${index + 1}$`).test(definition.enName)));
    const relationKey = relationDefinition?.enName ?? expectedRelationKey;
    const transformerAssociation = isContainerTransformerRelationKey(relationKey);
    const roleLabel = transformerAssociation
      ? "双绕组主变首端"
      : terminalAssociations.length
        ? containerTerminalAssociationLabel(association)
        : containerTerminalRoleLabel(role);
    const deviceModel = transformerAssociation
      ? "ACTransformer"
      : terminalAssociations.length
        ? containerTerminalAssociationDefinitions[association].deviceModel
        : containerRelationCounterKey(relationKey || getContainerAssociationRelationKey(association, associationSourceIndex));
    const terminalLabel = template.terminalLabels?.[index] ?? `${terminalTypeLabel(type)}端${index + 1}`;
    return {
      terminalIndex: index,
      terminalLabel,
      terminalType: type,
      relationKey,
      relationName: dependent
        ? `随端子${associationSourceIndex + 1}关联${roleLabel}`
        : relationDefinition?.cnName ?? `${terminalLabel}${roleLabel}关联idx`,
      roleLabel,
      deviceModel,
      sourceTerminalIndex: associationSourceIndex,
      dependent
    };
  });
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function viewRow(key: string, label: string, value: string, readonly = true): ContainerDeviceParameterViewRow {
  return { key, label, value, readonly };
}

export function buildContainerDeviceParameterViews(
  node: Pick<ModelNode, "kind" | "name" | "terminals" | "params">,
  template?: DeviceTemplate
): ContainerDeviceParameterView[] {
  if (!isContainerParams(node.params)) {
    return [];
  }
  const fallbackTemplate: DeviceTemplate = template ?? {
    kind: node.kind,
    label: node.name,
    group: "",
    size: { width: 0, height: 0 },
    params: node.params,
    terminalType: node.terminals[0]?.type ?? "ac",
    terminalCount: node.terminals.length,
    terminalTypes: node.terminals.map((terminal) => terminal.type),
    terminalLabels: node.terminals.map((terminal) => terminal.label),
    isContainer: true
  };
  const associations = describeContainerTerminalAssociations(fallbackTemplate);
  if (associations.length === 0) {
    return [];
  }
  const groups = new Map<number, ContainerTerminalAssociation[]>();
  for (const association of associations) {
    const group = groups.get(association.sourceTerminalIndex) ?? [];
    group.push(association);
    groups.set(association.sourceTerminalIndex, group);
  }
  const associatedViews = Array.from(groups.entries()).map<ContainerDeviceParameterView>(([sourceTerminalIndex, group]) => {
    const first = group[0];
    const relationKeys = group.map((association) => association.relationKey).filter(Boolean);
    const relationIdx = firstText(relationKeys.map((key) => node.params[key]));
    const sourceTerminal = node.terminals[sourceTerminalIndex];
    const terminalIndexes = group.map((association) => association.terminalIndex);
    const terminals = terminalIndexes.map((index) => node.terminals[index]).filter((terminal): terminal is Terminal => Boolean(terminal));
    const deviceType = containerRelationCounterKey(first.relationKey) || first.roleLabel;
    const label = `${sourceTerminal?.label ?? first.terminalLabel}${first.roleLabel}`;
    const rows = [
      viewRow("idx", "idx", relationIdx),
      viewRow("name", "name", `${node.name}_${label}`),
      viewRow("device_model", "device_model", deviceType),
      viewRow("relation_fields", "relation_fields", relationKeys.join(", ")),
      viewRow("terminals", "terminals", terminals.map((terminal) => terminal.label).join(", ")),
      viewRow("energy", "energy", uniqueNonEmpty(terminals.map((terminal) => terminal.type.toUpperCase())).join(" / "))
    ];
    if (isContainerTransformerRelationKey(first.relationKey)) {
      rows.push(viewRow("i_node", "i_node", sourceTerminal?.nodeNumber ?? ""));
      rows.push(viewRow("j_node", "j_node", node.params.neutral_node ?? ""));
    } else if (terminals.length === 1) {
      rows.push(viewRow("node", "node", terminals[0]?.nodeNumber ?? ""));
    } else if (terminals.length >= 2) {
      rows.push(viewRow("i_node", "i_node", terminals[0]?.nodeNumber ?? ""));
      rows.push(viewRow("j_node", "j_node", terminals[1]?.nodeNumber ?? ""));
    }
    const vbaseValues = uniqueNonEmpty(terminals.map((terminal) => terminal.vbase ?? ""));
    if (vbaseValues.length > 0) {
      rows.push(viewRow("vbase", "vbase", vbaseValues.join(" / ")));
    }
    return {
      id: `associated-${sourceTerminalIndex + 1}`,
      label,
      kind: "associated",
      deviceType,
      relationKeys,
      terminalIndexes,
      rows
    };
  });
  return [
    {
      id: "container",
      label: "容器本体",
      kind: "container",
      rows: []
    },
    ...associatedViews
  ];
}

export function buildDefaultDeviceParameterDefinitions(
  terminalTypes: readonly TerminalType[],
  options: {
    isContainer?: boolean;
    terminalRoles?: readonly ContainerTerminalRole[];
    terminalAssociations?: readonly ContainerTerminalAssociationValue[];
  } = {}
): DeviceParameterDefinition[] {
  const baseDefinitions: DeviceParameterDefinition[] = [
    { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
    { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
    { cnName: "运行状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true }
  ];
  if (options.isContainer) {
    const relationDefinitions: DeviceParameterDefinition[] = [];
    for (let index = 0; index < terminalTypes.length; index += 1) {
      const hasExplicitAssociations = Boolean(options.terminalAssociations?.length);
      const dependent = hasExplicitAssociations
        ? isContainerTerminalAssociationDependent(options.terminalAssociations ?? [], index)
        : isContainerTerminalRoleDependent(options.terminalRoles ?? [], index);
      if (dependent) {
        continue;
      }
      const type = terminalTypes[index];
      const sourceIndex = hasExplicitAssociations
        ? getContainerTerminalAssociationSourceIndex(options.terminalAssociations ?? [], index)
        : getContainerTerminalRoleSourceIndex(options.terminalRoles ?? [], index);
      const role = getEffectiveContainerTerminalRole(options.terminalRoles, index);
      const association = getEffectiveContainerTerminalAssociation(options.terminalAssociations, terminalTypes, index, options.terminalRoles);
      const relationType = terminalTypes[sourceIndex] ?? type;
      const associationLabel = hasExplicitAssociations ? containerTerminalAssociationLabel(association) : containerTerminalRoleLabel(role);
      relationDefinitions.push({
        cnName: `${terminalTypeLabel(relationType)}端${index + 1}${associationLabel}关联idx`,
        enName: hasExplicitAssociations ? getContainerAssociationRelationKey(association, index) : getContainerRelationKey(relationType, role, index),
        valueType: "integer",
        typicalValue: "",
        readonly: true
      });
    }
    return [
      ...baseDefinitions,
      { cnName: "是否容器", enName: "is_container", valueType: "integer", typicalValue: "1", readonly: true },
      ...relationDefinitions
    ];
  }
  const nodeDefinitions = terminalTypes.map<DeviceParameterDefinition>((type, index) => {
    const enName = terminalTypes.length === 1 ? "node" : `t${index + 1}_node`;
    return {
      cnName: `${terminalTypeLabel(type)}端${index + 1}节点号`,
      enName,
      valueType: "integer",
      typicalValue: "",
      readonly: true
    };
  });
  return [...baseDefinitions, ...nodeDefinitions];
}

export function isGeneratorKind(kind: DeviceKind): boolean {
  return kind.includes("source");
}

export function isGeneratorNode(node: ModelNode): boolean {
  return isGeneratorKind(node.kind);
}

export function getDeviceGlyphVariant(kind: DeviceKind): DeviceGlyphVariant {
  if (kind.startsWith("static-")) return "static";
  if (kind === "ac-source") return "ac-generator";
  if (kind === "dc-source") return "dc-generator";
  if (kind === "ac-storage") return "battery-storage";
  if (kind === "dc-storage") return "battery-storage";
  if (kind === "ac-electrolyzer" || kind === "dc-electrolyzer") return "hydrogen-electrolyzer";
  if (kind === "hydrogen-source") return "hydrogen-source";
  if (kind === "hydrogen-tank") return "hydrogen-storage";
  if (kind === "hydrogen-load") return "hydrogen-load";
  if (kind === "ac-fuel-cell" || kind === "dc-fuel-cell") return "hydrogen-fuel-cell";
  if (kind === "hydrogen-bus") return "hydrogen-bus";
  if (kind === "hydrogen-compressor") return "hydrogen-compressor";
  if (kind === "hydrogen-pressure-reducer") return "hydrogen-regulator";
  if (kind === "hydrogen-shutoff-valve") return "hydrogen-valve";
  if (kind === "hydrogen-pipeline") return "hydrogen-pipeline";
  if (kind === "heat-boiler" || kind === "two-port-heat-boiler") return "heat-boiler";
  if (kind === "heat-source" || kind === "two-port-heat-source") return "heat-source";
  if (kind === "heat-exchanger") return "heat-exchanger-two";
  if (kind === "three-port-heat-exchanger") return "heat-exchanger-three";
  if (kind === "four-port-heat-exchanger") return "heat-exchanger-four";
  if (kind === "ac-heater" || kind === "dc-heater" || kind === "ac-two-port-heater" || kind === "dc-two-port-heater") return "heat-electric-heater";
  if (kind === "thermal-storage-tank") return "heat-storage";
  if (kind === "heat-load" || kind === "single-port-heat-load" || kind === "two-port-heat-load") return "heat-load";
  if (kind === "heat-bus") return "heat-bus";
  if (kind === "heat-pipeline") return "heat-pipeline";
  if (kind === "heat-pump") return "heat-pump";
  if (kind === "heat-shutoff-valve") return "heat-valve";
  if (kind.includes("wind-source")) return "wind-source";
  if (kind.includes("pv-source")) return "pv-source";
  if (kind.includes("thermal-source")) return "thermal-source";
  if (kind.includes("hydro-source")) return "hydro-source";
  if (kind.includes("nuclear-source")) return "nuclear-source";
  if (kind.includes("bus")) return "bus";
  if (kind === "ac-line") return "ac-line";
  if (kind === "dc-line") return "dc-line";
  if (kind.includes("line") || kind.includes("zero-branch")) return "line";
  if (kind.includes("transformer")) return "transformer";
  if (kind.includes("switch")) return "switch";
  if (kind.includes("disconnector")) return "disconnector";
  if (kind.includes("breaker")) return "breaker";
  if (kind.includes("load")) return "load";
  if (kind === "dcdc-converter") return "dcdc-converter";
  if (kind === "acdc-converter") return "acdc-converter";
  if (kind === "acac-converter") return "acac-converter";
  if (kind.startsWith("custom-") || kind.startsWith("custom:")) return "custom-device";
  return "default";
}

export const TERMINAL_TYPE_COLORS: Record<TerminalType, string> = {
  ac: "#2563eb",
  dc: "#0f766e",
  h2: "#7c3aed",
  heat: "#dc2626"
};

export function terminalTypeColor(type?: TerminalType): string {
  return type ? TERMINAL_TYPE_COLORS[type] : TERMINAL_TYPE_COLORS.ac;
}

function isHydrogenVisualKind(kind: string): boolean {
  return kind.startsWith("hydrogen-") || kind.includes("electrolyzer") || kind.includes("fuel-cell");
}

function isThermalVisualKind(kind: string): boolean {
  return (
    kind.startsWith("heat-") ||
    kind === "ac-heater" ||
    kind === "dc-heater" ||
    kind === "ac-two-port-heater" ||
    kind === "dc-two-port-heater" ||
    kind === "thermal-storage-tank" ||
    kind.includes("port-heat-")
  );
}

function isPureHydrogenNetworkKind(kind: string): boolean {
  return kind.startsWith("hydrogen-");
}

function isPureThermalNetworkKind(kind: string): boolean {
  return isThermalVisualKind(kind) && kind !== "ac-heater" && kind !== "dc-heater" && kind !== "ac-two-port-heater" && kind !== "dc-two-port-heater";
}

export function getDeviceStrokeColor(node: Pick<ModelNode, "kind" | "terminals" | "params">): string {
  return node.params.foregroundColor || (
    isHydrogenVisualKind(node.kind)
      ? terminalTypeColor("h2")
      : isThermalVisualKind(node.kind)
        ? terminalTypeColor("heat")
        : terminalTypeColor(node.terminals[0]?.type)
  );
}

const DEVICE_STROKE_WIDTH_BY_VARIANT: Partial<Record<DeviceGlyphVariant, number>> = {
  "wind-source": 2.4,
  "pv-source": 2.2,
  "thermal-source": 2.3,
  "nuclear-source": 2.2,
  "battery-storage": 2.4,
  "hydrogen-electrolyzer": 2.3,
  "hydrogen-fuel-cell": 2.3,
  "hydrogen-storage": 2.4,
  "hydrogen-compressor": 2.4,
  "hydrogen-regulator": 2.4,
  "hydrogen-valve": 2.4,
  "hydrogen-pipeline": 2.8,
  "heat-boiler": 2.4,
  "heat-source": 2.4,
  "heat-electric-heater": 2.3,
  "heat-exchanger-two": 2.4,
  "heat-exchanger-three": 2.4,
  "heat-exchanger-four": 2.4,
  "heat-storage": 2.4,
  "heat-load": 2.4,
  "heat-pipeline": 2.8,
  "heat-pump": 2.4,
  "heat-valve": 2.4,
  "ac-line": 4,
  "dc-line": 4,
  line: 4,
  "dcdc-converter": 2.2,
  "acdc-converter": 2.2,
  "acac-converter": 2.2
};

export function getDeviceStrokeWidth(node: Pick<ModelNode, "kind" | "params">): number {
  const explicitWidth = Number(node.params.lineWidth ?? "");
  if (Number.isFinite(explicitWidth) && explicitWidth > 0) {
    return explicitWidth;
  }
  return DEVICE_STROKE_WIDTH_BY_VARIANT[getDeviceGlyphVariant(node.kind)] ?? 2.5;
}

export function getSwitchVisualState(node: ModelNode): "open" | "closed" {
  const status = normalizeSwitchStatusForE(node.params.status ?? node.params.closedStatus);
  return status === "0" ? "open" : "closed";
}

export function isStaticKind(kind: DeviceKind): boolean {
  return kind.startsWith("static-");
}

export function isStaticNode(node: ModelNode): boolean {
  return isStaticKind(node.kind);
}

const TEMPLATE_DEFINITION_READONLY_KEYS = new Set(["idx", "name", "node", "i_node", "j_node", "ac_node", "dc_node"]);
const TEMPLATE_DEFINITION_VALUE_TYPES: Record<string, DeviceParameterValueType> = {
  idx: "integer",
  node: "integer",
  i_node: "integer",
  j_node: "integer",
  ac_node: "integer",
  dc_node: "integer",
  p_set: "float",
  q_set: "float",
  v_set: "float",
  i_set: "float",
  p_ac_set: "float",
  q_ac_set: "float",
  v_ac_set: "float",
  v_dc_set: "float",
  i_v_set: "float",
  j_v_set: "float",
  i_q_set: "float",
  j_q_set: "float",
  pv0: "float",
  pv1: "float",
  pv2: "float",
  qv0: "float",
  qv1: "float",
  qv2: "float",
  pbase: "float",
  qbase: "float",
  r1: "float",
  r2: "float",
  r: "float",
  x: "float",
  x_pu: "float",
  b: "float",
  gt: "float",
  bt: "float"
};

function inferDefinitionValueType(key: string, value: string): DeviceParameterValueType {
  const definedType = TEMPLATE_DEFINITION_VALUE_TYPES[key];
  if (definedType) {
    return definedType;
  }
  if (/^-?\d+$/.test(value.trim())) {
    return "integer";
  }
  if (/^-?\d+(\.\d+)?(?:\s*[a-zA-Z/%]+)?$/.test(value.trim())) {
    return "float";
  }
  return "string";
}

function normalizeTemplateDefinition(definition: DeviceParameterDefinition): DeviceParameterDefinition | null {
  const enName = String(definition.enName ?? "").trim();
  if (!enName) {
    return null;
  }
  const valueType = TEMPLATE_DEFINITION_VALUE_TYPES[enName] ?? (["integer", "float", "string", "enum"].includes(definition.valueType) ? definition.valueType : "string");
  return {
    cnName: String(definition.cnName ?? enName).trim() || enName,
    enName,
    valueType,
    typicalValue: String(definition.typicalValue ?? ""),
    readonly: Boolean(definition.readonly || TEMPLATE_DEFINITION_READONLY_KEYS.has(enName))
  };
}

function templateTerminalTypes(template: DeviceTemplate): TerminalType[] {
  const terminalTypes = (template.terminalTypes ?? []).slice(0, template.terminalCount);
  while (terminalTypes.length < template.terminalCount) {
    terminalTypes.push(template.terminalType);
  }
  return terminalTypes;
}

export function getTemplateParameterDefinitions(template: DeviceTemplate): DeviceParameterDefinition[] {
  if (template.parameterDefinitions?.length) {
    return template.parameterDefinitions
      .map((definition) => normalizeTemplateDefinition(definition))
      .filter((definition): definition is DeviceParameterDefinition => Boolean(definition));
  }
  if (template.isContainer) {
    const defaultDefinitions = buildDefaultDeviceParameterDefinitions(templateTerminalTypes(template), {
      isContainer: true,
      terminalRoles: template.terminalRoles,
      terminalAssociations: template.terminalAssociations
    });
    const defaultKeys = new Set(defaultDefinitions.map((definition) => definition.enName));
    const extraKeys = Object.keys(template.params).filter((key) => key && !key.startsWith("_") && !defaultKeys.has(key));
    return [
      ...defaultDefinitions,
      ...extraKeys.map((key) => ({
        cnName: key,
        enName: key,
        valueType: inferDefinitionValueType(key, template.params[key] ?? ""),
        typicalValue: template.params[key] ?? "",
        readonly: TEMPLATE_DEFINITION_READONLY_KEYS.has(key)
      }))
    ];
  }
  const eKeys = getEParameterKeys(template.kind, template.params);
  const keys = eKeys.length > 0 ? eKeys : Object.keys(template.params);
  const uniqueKeys = Array.from(new Set(keys.filter((key) => key && !key.startsWith("_"))));
  return uniqueKeys.map((key) => ({
    cnName: key,
    enName: key,
    valueType: inferDefinitionValueType(key, template.params[key] ?? ""),
    typicalValue: template.params[key] ?? "",
    readonly: TEMPLATE_DEFINITION_READONLY_KEYS.has(key)
  }));
}

export function applyDeviceTemplateDefinitionOverride(
  template: DeviceTemplate,
  override?: DeviceTemplateDefinitionOverride
): DeviceTemplate {
  if (!override) {
    return template;
  }
  const parameterDefinitions = (override.parameterDefinitions ?? [])
    .map((definition) => normalizeTemplateDefinition(definition))
    .filter((definition): definition is DeviceParameterDefinition => Boolean(definition));
  const params = { ...(override.params ?? template.params) };
  for (const definition of parameterDefinitions) {
    if (definition.enName === "name") {
      continue;
    }
    params[definition.enName] = definition.typicalValue;
  }
  return {
    ...template,
    params,
    parameterDefinitions
  };
}

function applyTemplateDefinitionDefaults(params: Record<string, string>, template: DeviceTemplate): Record<string, string> {
  const parameterDefinitions = template.parameterDefinitions ?? [];
  if (parameterDefinitions.length === 0) {
    return params;
  }
  const next: Record<string, string> = {
    ...params,
    [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(parameterDefinitions)
  };
  for (const definition of parameterDefinitions) {
    const enName = definition.enName.trim();
    if (!enName || enName === "name") {
      continue;
    }
    next[enName] = definition.typicalValue;
  }
  return next;
}

function applyContainerRelationDefaults(params: Record<string, string>, template: DeviceTemplate): Record<string, string> {
  if (!template.isContainer) {
    return params;
  }
  const next: Record<string, string> = { ...params, is_container: params.is_container ?? "1" };
  if (template.parameterDefinitions?.length) {
    return next;
  }
  for (const definition of buildDefaultDeviceParameterDefinitions(templateTerminalTypes(template), {
    isContainer: true,
    terminalRoles: template.terminalRoles,
    terminalAssociations: template.terminalAssociations
  })) {
    if (definition.enName === "name") {
      continue;
    }
    next[definition.enName] = next[definition.enName] ?? definition.typicalValue;
  }
  return next;
}

function buildDefaultParams(template: DeviceTemplate): Record<string, string> {
  const withTemplateDefinitions = (params: Record<string, string>) =>
    applyTemplateDefinitionDefaults(applyContainerRelationDefaults(params, template), template);
  if (isStaticKind(template.kind)) {
    return withTemplateDefinitions({ ...template.params });
  }
  const withRunStat = (params: Record<string, string>) => ({ run_stat: "运行", ...params });
  const withDefaultVbase = (params: Record<string, string>) => ({
    vbase: defaultTerminalVbase(template.terminalType),
    ...params
  });
  const type = template.terminalType;
  if (template.custom) {
    const params: Record<string, string> = {
      ...template.params,
      [CUSTOM_DEVICE_TEMPLATE_KEY]: "1",
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(template.parameterDefinitions ?? []),
      run_stat: template.params.run_stat ?? "运行"
    };
    for (const definition of template.parameterDefinitions ?? []) {
      if (definition.enName === "name") {
        continue;
      }
      params[definition.enName] = params[definition.enName] ?? definition.typicalValue;
    }
    return withTemplateDefinitions(params);
  }
  if (isPureHydrogenNetworkKind(template.kind) || isPureThermalNetworkKind(template.kind)) {
    return withTemplateDefinitions(withRunStat({ ...template.params }));
  }
  if (isGeneratorKind(template.kind)) {
    const base: Record<string, string> = {
      ratedCapacity: template.params.ratedPower ?? template.params.ratedCapacity ?? "10 MW",
      controlType: type === "ac" ? "PV" : "P"
    };
    if (template.kind.includes("wind-source")) {
      base.cutInWindSpeed = "3 m/s";
      base.ratedWindSpeed = "12 m/s";
      base.cutOutWindSpeed = "25 m/s";
    }
    return withTemplateDefinitions(withRunStat(withDefaultVbase({ ...template.params, ...base })));
  }
  if (template.kind === "ac-load") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ratedActivePower: "5 MW",
      pv0: "1.0",
      pv1: "0.0",
      pv2: "0.0",
      ratedReactivePower: "1.2 Mvar",
      qv0: "1.0",
      qv1: "0.0",
      qv2: "0.0"
    })));
  }
  if (template.kind === "dc-load") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ratedActivePower: "1.5 MW",
      pv0: "1.0",
      pv1: "0.0",
      pv2: "0.0"
    })));
  }
  if (template.kind === "ac-storage") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: template.params.ratedPower ?? "5 MW",
      controlType: "PQ",
      p_set: "0.0",
      q_set: "0.0",
      v_set: "10",
      alpha: "1.0"
    })));
  }
  if (template.kind === "dc-storage") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: template.params.ratedPower ?? "5 MW",
      controlType: "P",
      v_set: "750",
      p_set: "0.0",
      i_set: "0.0"
    })));
  }
  if (
    template.kind === "ac-electrolyzer" ||
    template.kind === "dc-electrolyzer" ||
    template.kind === "ac-fuel-cell" ||
    template.kind === "dc-fuel-cell"
  ) {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: template.params.ratedPower ?? "5 MW",
      controlType: template.terminalType === "ac" ? "PQ" : "P"
    })));
  }
  if (template.kind === "ac-heater" || template.kind === "dc-heater" || template.kind === "ac-two-port-heater" || template.kind === "dc-two-port-heater") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: template.params.ratedPower ?? "5 MW",
      controlType: template.terminalType === "ac" ? "PQ" : "P"
    })));
  }
  if (template.kind === "ac-line" || template.kind === "dc-line") {
    if (template.kind === "dc-line") {
      return withTemplateDefinitions(withRunStat(withDefaultVbase({
        resistancePu: "0.0"
      })));
    }
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      resistancePu: "0.0",
      reactancePu: "0.1",
      halfChargingSusceptancePu: "0.0"
    })));
  }
  if (template.kind === "ac-two-winding-transformer" || template.kind === "ac-transformer") {
    return withTemplateDefinitions(withRunStat({
      highVbase: "110 kV",
      lowVbase: "10 kV",
      ratedCapacity: "50 MVA",
      resistancePu: "0.0",
      reactancePu: "0.1",
      magnetizingConductancePu: "0.0",
      magnetizingSusceptancePu: "0.0",
      tapRatio: "1.0"
    }));
  }
  if (template.kind === "ac-three-winding-transformer") {
    return withTemplateDefinitions(withRunStat({
      neutral_node: "",
      neutral_vbase: "1.0",
      highVbase: "220 kV",
      mediumVbase: "110 kV",
      lowVbase: "10 kV",
      highRatedCapacity: "90 MVA",
      highResistancePu: "0.0",
      highReactancePu: "0.1",
      highMagnetizingConductancePu: "0.0",
      highMagnetizingSusceptancePu: "0.0",
      highTapRatio: "1.0",
      mediumRatedCapacity: "90 MVA",
      mediumResistancePu: "0.0",
      mediumReactancePu: "0.1",
      mediumMagnetizingConductancePu: "0.0",
      mediumMagnetizingSusceptancePu: "0.0",
      mediumTapRatio: "1.0",
      lowRatedCapacity: "90 MVA",
      lowResistancePu: "0.0",
      lowReactancePu: "0.1",
      lowMagnetizingConductancePu: "0.0",
      lowMagnetizingSusceptancePu: "0.0",
      lowTapRatio: "1.0"
    }));
  }
  if (template.kind === "dcdc-converter") {
    return withTemplateDefinitions(withRunStat({
      sourceVbase: "1500 V",
      targetVbase: "750 V",
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      sourceControlType: "定P",
      targetControlType: "不定"
    }));
  }
  if (template.kind === "acdc-converter") {
    return withTemplateDefinitions(withRunStat({
      sourceVbase: "10 kV",
      targetVbase: "750 V",
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      acControlType: "定PQ",
      dcControlType: "不定"
    }));
  }
  if (template.kind === "acac-converter") {
    return withTemplateDefinitions(withRunStat({
      sourceVbase: "10 kV",
      targetVbase: "10 kV",
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      sourceControlType: "定PQ",
      targetControlType: "不定"
    }));
  }
  if (
    template.kind === "ac-switch" ||
    template.kind === "dc-switch" ||
    template.kind === "ac-disconnector" ||
    template.kind === "dc-disconnector" ||
    template.kind === "ac-breaker" ||
    template.kind === "dc-breaker"
  ) {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ratedCapacity: template.terminalType === "ac" ? "1250 A" : "1600 A",
      status: "1",
      closedStatus: "闭合"
    })));
  }
  return withTemplateDefinitions(withRunStat(withDefaultVbase({ ...template.params })));
}

export function getTemplate(kind: DeviceKind): DeviceTemplate {
  const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
  if (!template) {
    throw new Error(`Unknown device kind: ${kind}`);
  }
  return template;
}

export function createDefaultNode(kind: DeviceKind, position: Point): ModelNode {
  const template = getTemplate(kind);
  return createNodeFromTemplate(template, position);
}

export function createNodeFromTemplate(template: DeviceTemplate, position: Point): ModelNode {
  return {
    id: makeId(template.kind),
    kind: template.kind,
    name: template.label,
    nodeNumber: makeNodeNumber(),
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position,
    size: { ...template.size },
    rotation: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    terminals: createTemplateTerminals(template),
    params: buildDefaultParams(template)
  };
}

export function getNodeScaleX(node: ModelNode): number {
  return node.scaleX ?? node.scale ?? 1;
}

export function getNodeScaleY(node: ModelNode): number {
  return node.scaleY ?? node.scale ?? 1;
}

export function mirrorNodes(nodes: ModelNode[], nodeIds: string[], axis: "horizontal" | "vertical"): ModelNode[] {
  const selected = new Set(nodeIds);
  return nodes.map((node) => {
    if (!selected.has(node.id)) {
      return node;
    }
    if (axis === "horizontal") {
      return { ...node, scaleX: -getNodeScaleX(node) };
    }
    return { ...node, scaleY: -getNodeScaleY(node) };
  });
}

export function clampPointToBounds(point: Point, bounds: CanvasBounds): Point {
  return {
    x: Math.round(Math.max(0, Math.min(bounds.width, point.x))),
    y: Math.round(Math.max(0, Math.min(bounds.height, point.y)))
  };
}

export function clampNodePositionToBounds(node: ModelNode, bounds: CanvasBounds, position = node.position): Point {
  const halfWidth = Math.min(bounds.width / 2, (node.size.width * Math.abs(getNodeScaleX(node))) / 2);
  const halfHeight = Math.min(bounds.height / 2, (node.size.height * Math.abs(getNodeScaleY(node))) / 2);
  return {
    x: Math.round(Math.max(halfWidth, Math.min(bounds.width - halfWidth, position.x))),
    y: Math.round(Math.max(halfHeight, Math.min(bounds.height - halfHeight, position.y)))
  };
}

export function normalizeViewBoxToCanvas(box: ViewBox, bounds: CanvasBounds): ViewBox {
  const maxX = bounds.width - box.width;
  const maxY = bounds.height - box.height;
  return {
    ...box,
    x: box.width >= bounds.width ? maxX / 2 : Math.max(0, Math.min(maxX, box.x)),
    y: box.height >= bounds.height ? maxY / 2 : Math.max(0, Math.min(maxY, box.y))
  };
}

export function createTerminals(type: TerminalType, count: number): Terminal[] {
  if (count <= 0) {
    return [];
  }
  const safeCount = Math.max(1, Math.min(8, Math.round(count)));
  if (safeCount === 1) {
    return [{ id: "t1", label: "端子1", type, anchor: { x: 0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) }];
  }
  if (safeCount === 2) {
    return [
      { id: "t1", label: "端子1", type, anchor: { x: -0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) },
      { id: "t2", label: "端子2", type, anchor: { x: 0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) }
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
    anchor,
    nodeNumber: makeNodeNumber(),
    vbase: defaultTerminalVbase(type)
  }));
}

function createTemplateTerminals(template: DeviceTemplate): Terminal[] {
  if (!template.terminalTypes?.length) {
    return createTerminals(template.terminalType, template.terminalCount).map((terminal, index) => ({
      ...terminal,
      label: template.terminalLabels?.[index] ?? terminal.label,
      anchor: template.terminalAnchors?.[index] ?? terminal.anchor
    }));
  }
  const anchors = createTerminals(template.terminalType, template.terminalTypes.length);
  return template.terminalTypes.map((type, index) => ({
    ...anchors[index],
    label: template.terminalLabels?.[index] ?? `端子${index + 1}`,
    anchor: template.terminalAnchors?.[index] ?? anchors[index].anchor,
    type,
    vbase: defaultTerminalVbase(type)
  }));
}

export function terminalStubSegment(
  terminal: Pick<Terminal, "anchor">,
  scaleX = 1,
  scaleY = 1,
  length = 16
): { from: Point; to: Point } {
  const displayedAnchor = {
    x: terminal.anchor.x * (Math.sign(scaleX) || 1),
    y: terminal.anchor.y * (Math.sign(scaleY) || 1)
  };
  if (Math.abs(displayedAnchor.x) >= Math.abs(displayedAnchor.y)) {
    return {
      from: { x: displayedAnchor.x >= 0 ? -length : length, y: 0 },
      to: { x: 0, y: 0 }
    };
  }
  return {
    from: { x: 0, y: displayedAnchor.y >= 0 ? -length : length },
    to: { x: 0, y: 0 }
  };
}

export function getTerminal(node: ModelNode, terminalId?: string): Terminal {
  return node.terminals.find((terminal) => terminal.id === terminalId) ?? node.terminals[0];
}

export function getTerminalPoint(node: ModelNode, terminalId?: string): Point {
  const terminal = getTerminal(node, terminalId);
  const width = node.size.width * getNodeScaleX(node);
  const height = node.size.height * getNodeScaleY(node);
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

export function isBusNode(node: ModelNode): boolean {
  return (
    node.kind === "ac-bus" ||
    node.kind === "dc-bus" ||
    node.kind === "hydrogen-bus" ||
    node.kind === "hydrogen-tank" ||
    node.kind === "heat-bus" ||
    node.kind === "thermal-storage-tank"
  );
}

function isBoundaryBusNode(node: Pick<ModelNode, "kind">): boolean {
  return node.kind === "hydrogen-tank" || node.kind === "thermal-storage-tank";
}

function pointToNodeLocal(node: ModelNode, point: Point): Point {
  const radians = (-node.rotation * Math.PI) / 180;
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
}

function nodeLocalToPoint(node: ModelNode, local: Point): Point {
  const radians = (node.rotation * Math.PI) / 180;
  return {
    x: Math.round(node.position.x + local.x * Math.cos(radians) - local.y * Math.sin(radians)),
    y: Math.round(node.position.y + local.x * Math.sin(radians) + local.y * Math.cos(radians))
  };
}

function projectPointToNodeBoundary(node: ModelNode, point: Point): Point {
  const local = pointToNodeLocal(node, point);
  const halfWidth = Math.max(1, (node.size.width * Math.abs(getNodeScaleX(node))) / 2);
  const halfHeight = Math.max(1, (node.size.height * Math.abs(getNodeScaleY(node))) / 2);
  const xRatio = Math.abs(local.x) / halfWidth;
  const yRatio = Math.abs(local.y) / halfHeight;
  const projected =
    xRatio >= yRatio
      ? {
          x: local.x >= 0 ? halfWidth : -halfWidth,
          y: Math.max(-halfHeight, Math.min(halfHeight, local.y))
        }
      : {
          x: Math.max(-halfWidth, Math.min(halfWidth, local.x)),
          y: local.y >= 0 ? halfHeight : -halfHeight
        };
  return nodeLocalToPoint(node, projected);
}

export function projectPointToBusCenterline(node: ModelNode, point: Point): Point {
  if (isBoundaryBusNode(node)) {
    return projectPointToNodeBoundary(node, point);
  }
  const radians = (-node.rotation * Math.PI) / 180;
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  const local = {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const clampedX = Math.max(-halfWidth, Math.min(halfWidth, local.x));
  const forwardRadians = (node.rotation * Math.PI) / 180;
  return {
    x: Math.round(node.position.x + clampedX * Math.cos(forwardRadians)),
    y: Math.round(node.position.y + clampedX * Math.sin(forwardRadians))
  };
}

export function getEdgeEndpointPoint(node: ModelNode, endpointPoint?: Point, terminalId?: string): Point {
  return endpointPoint && isBusNode(node) ? projectPointToBusCenterline(node, endpointPoint) : getTerminalPoint(node, terminalId);
}

function getElementTreeTypeLabel(node: ModelNode): string {
  return DEVICE_LIBRARY.find((template) => template.kind === node.kind)?.label ?? node.kind;
}

function edgeDisplayName(edge: Edge, nodeById: Map<string, ModelNode>): string {
  const sourceName = nodeById.get(edge.sourceId)?.name;
  const targetName = nodeById.get(edge.targetId)?.name;
  if (sourceName || targetName) {
    return `${sourceName ?? edge.sourceId} -> ${targetName ?? edge.targetId}`;
  }
  return `联络线 ${edge.id}`;
}

export function buildElementTree(nodes: ModelNode[], edges: Edge[]): ElementTreeGroup[] {
  const groups: ElementTreeGroup[] = [];
  const groupByKey = new Map<string, ElementTreeGroup>();
  const appendItem = (typeKey: string, typeLabel: string, item: ElementTreeItem) => {
    let group = groupByKey.get(typeKey);
    if (!group) {
      group = { typeKey, typeLabel, items: [] };
      groupByKey.set(typeKey, group);
      groups.push(group);
    }
    group.items.push(item);
  };

  for (const node of nodes) {
    appendItem(`node:${node.kind}`, getElementTreeTypeLabel(node), {
      kind: "node",
      id: node.id,
      name: node.name || getElementTreeTypeLabel(node)
    });
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    appendItem("edge:connection", "联络线", {
      kind: "edge",
      id: edge.id,
      name: edgeDisplayName(edge, nodeById)
    });
  }

  return groups;
}

export function getElementFocusPoint(
  target: Pick<ElementTreeItem, "kind" | "id">,
  nodes: ModelNode[],
  edges: Edge[]
): Point | null {
  if (target.kind === "node") {
    return nodes.find((node) => node.id === target.id)?.position ?? null;
  }
  const edge = edges.find((item) => item.id === target.id);
  if (!edge) {
    return null;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sourceNode = nodeById.get(edge.sourceId);
  const targetNode = nodeById.get(edge.targetId);
  const sourcePoint = sourceNode ? getEdgeEndpointPoint(sourceNode, edge.sourcePoint, edge.sourceTerminalId) : edge.sourcePoint;
  const targetPoint = targetNode ? getEdgeEndpointPoint(targetNode, edge.targetPoint, edge.targetTerminalId) : edge.targetPoint;
  const points = [sourcePoint, ...(edge.manualPoints ?? []), targetPoint].filter((point): point is Point => Boolean(point));
  if (points.length === 0) {
    return null;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
  };
}

export function getTerminalNormal(node: ModelNode, terminalId?: string): Point {
  const terminal = getTerminal(node, terminalId);
  const scaledAnchor = {
    x: terminal.anchor.x * (Math.sign(getNodeScaleX(node)) || 1),
    y: terminal.anchor.y * (Math.sign(getNodeScaleY(node)) || 1)
  };
  const raw =
    Math.abs(scaledAnchor.x) >= Math.abs(scaledAnchor.y)
      ? { x: Math.sign(scaledAnchor.x || 1), y: 0 }
      : { x: 0, y: Math.sign(scaledAnchor.y || 1) };
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: Math.round(raw.x * cos - raw.y * sin),
    y: Math.round(raw.x * sin + raw.y * cos)
  };
}

function getBusNormalToward(node: ModelNode, otherPoint: Point): Point {
  const radians = (node.rotation * Math.PI) / 180;
  const normal = { x: -Math.sin(radians), y: Math.cos(radians) };
  const vector = { x: otherPoint.x - node.position.x, y: otherPoint.y - node.position.y };
  const dot = normal.x * vector.x + normal.y * vector.y;
  const direction = dot >= 0 ? 1 : -1;
  const x = Math.round(normal.x * direction);
  const y = Math.round(normal.y * direction);
  if (x === 0 && y === 0) {
    return { x: 0, y: -1 };
  }
  return { x, y };
}

function getBoundaryNormalAtPoint(node: ModelNode, point: Point): Point {
  const local = pointToNodeLocal(node, point);
  const halfWidth = Math.max(1, (node.size.width * Math.abs(getNodeScaleX(node))) / 2);
  const halfHeight = Math.max(1, (node.size.height * Math.abs(getNodeScaleY(node))) / 2);
  const xRatio = Math.abs(local.x) / halfWidth;
  const yRatio = Math.abs(local.y) / halfHeight;
  const raw = xRatio >= yRatio
    ? { x: Math.sign(local.x || 1), y: 0 }
    : { x: 0, y: Math.sign(local.y || 1) };
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: Math.round(raw.x * cos - raw.y * sin),
    y: Math.round(raw.x * sin + raw.y * cos)
  };
}

function getBusEndpointNormal(node: ModelNode, endpointPoint: Point, otherPoint: Point): Point {
  return isBoundaryBusNode(node) ? getBoundaryNormalAtPoint(node, endpointPoint) : getBusNormalToward(node, otherPoint);
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

export function alignNodes(nodes: ModelNode[], selectedIds: string[], direction: AlignDirection): ModelNode[] {
  const selected = nodes.filter((node) => selectedIds.includes(node.id));
  if (selected.length < 2) {
    return nodes;
  }
  const average =
    selected.reduce((sum, node) => sum + (direction === "horizontal" ? node.position.y : node.position.x), 0) /
    selected.length;
  const alignedCoordinate = Math.round(average);

  return nodes.map((node) => {
    if (!selectedIds.includes(node.id)) {
      return node;
    }
    return {
      ...node,
      position:
        direction === "horizontal"
          ? { ...node.position, y: alignedCoordinate }
          : { ...node.position, x: alignedCoordinate }
    };
  });
}

export function deleteNodesWithConnectedEdges(nodes: ModelNode[], edges: Edge[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return {
    nodes: nodes.filter((node) => !selected.has(node.id)),
    edges: edges.filter((edge) => !selected.has(edge.sourceId) && !selected.has(edge.targetId))
  };
}

export function calculateElectricalTopology(nodes: ModelNode[], edges: Edge[]): ModelNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const parent = new Map<string, string>();
  const terminalTypes = new Map<string, TerminalType>();
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
      terminalTypes.set(key, terminal.type);
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
    if (!source || !target) continue;
    const sourceTerminal = getTerminal(source, edge.sourceTerminalId);
    const targetTerminal = getTerminal(target, edge.targetTerminalId);
    if (sourceTerminal.type !== targetTerminal.type) continue;
    union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));
  }

  const nextTopologyNumberByType: Record<TerminalType, number> = { ac: 1, dc: 1, h2: 1, heat: 1 };
  const numberByTypeAndRoot: Record<TerminalType, Map<string, string>> = {
    ac: new Map<string, string>(),
    dc: new Map<string, string>(),
    h2: new Map<string, string>(),
    heat: new Map<string, string>()
  };
  const getTopologyNumber = (key: string, type: TerminalType) => {
    const root = find(key);
    const numberByRoot = numberByTypeAndRoot[type];
    const existing = numberByRoot.get(root);
    if (existing) {
      return existing;
    }
    const next = String(nextTopologyNumberByType[type]++);
    numberByRoot.set(root, next);
    return next;
  };

  const numberedNodes = nodes.map((node) => {
    const terminals = node.terminals.map((terminal) => {
      const key = terminalKey(node.id, terminal.id);
      return { ...terminal, nodeNumber: getTopologyNumber(key, terminal.type) };
    });
    const acTopologyNode = Number(terminals.find((terminal) => terminal.type === "ac")?.nodeNumber ?? 0);
    const dcTopologyNode = Number(terminals.find((terminal) => terminal.type === "dc")?.nodeNumber ?? 0);
    return {
      ...node,
      acTopologyNode,
      dcTopologyNode,
      nodeNumber: terminals.length === 1 ? terminals[0].nodeNumber : node.nodeNumber,
      terminals
    };
  });
  return numberedNodes.map((node) => {
    if (!isThreeWindingTransformer(node)) {
      return node;
    }
    return {
      ...node,
      params: {
        ...node.params,
        neutral_node: String(nextTopologyNumberByType.ac++),
        neutral_vbase: node.params.neutral_vbase || "1.0"
      }
    };
  });
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
  return normalizeVoltage(getTerminal(node, terminalId)?.vbase ?? getNodeVoltageLevel(node));
}

export function validateTopology(nodes: ModelNode[], edges: Edge[]): TopologyValidationError[] {
  const errors: TopologyValidationError[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const parent = new Map<string, string>();
  const connectedTerminals = new Set<string>();
  const directVoltageMismatchEdges: Array<{
    source: ModelNode;
    sourceTerminal: Terminal;
    target: ModelNode;
    targetTerminal: Terminal;
  }> = [];
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
    if (!source || !target) continue;
    const sourceTerminal = getTerminal(source, edge.sourceTerminalId);
    const targetTerminal = getTerminal(target, edge.targetTerminalId);
    connectedTerminals.add(`${source.id}:${sourceTerminal.id}`);
    connectedTerminals.add(`${target.id}:${targetTerminal.id}`);

    if (sourceTerminal.type !== targetTerminal.type) {
      errors.push({
        id: `terminal-type-mismatch:${edge.id}`,
        type: "terminal-type-mismatch",
        edgeId: edge.id,
        relatedNodeIds: [source.id, target.id],
        message: `图上拓扑失败：${source.name} 与 ${target.name} 的端子类型不一致，不能连接 ${sourceTerminal.type.toUpperCase()} 与 ${targetTerminal.type.toUpperCase()}。`
      });
      continue;
    }

    union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));

    const sourceVoltage = getTerminalVoltageLevel(source, sourceTerminal.id);
    const targetVoltage = getTerminalVoltageLevel(target, targetTerminal.id);
    if (sourceVoltage && targetVoltage && sourceVoltage !== targetVoltage) {
      directVoltageMismatchEdges.push({ source, sourceTerminal, target, targetTerminal });
      errors.push({
        id: `voltage-mismatch:${edge.id}`,
        type: "voltage-mismatch",
        edgeId: edge.id,
        relatedNodeIds: [source.id, target.id],
        message: `图上拓扑失败：${source.name} 与 ${target.name} 电压基值不一致（${sourceVoltage} / ${targetVoltage}）。`
      });
    }
  }

  const directVoltageMismatchRoots = new Set(
    directVoltageMismatchEdges.map(({ source, sourceTerminal }) => find(terminalKey(source.id, sourceTerminal.id)))
  );
  const voltageGroups = new Map<
    string,
    {
      relatedNodeIds: Set<string>;
      voltages: Map<string, string>;
    }
  >();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      const key = terminalKey(node.id, terminal.id);
      const root = find(key);
      const group = voltageGroups.get(root) ?? { relatedNodeIds: new Set<string>(), voltages: new Map<string, string>() };
      group.relatedNodeIds.add(node.id);
      const voltage = getTerminalVoltageLevel(node, terminal.id);
      if (voltage) {
        group.voltages.set(voltage, terminal.vbase ?? node.params.vbase ?? voltage);
      }
      voltageGroups.set(root, group);
    }
  }
  for (const [root, group] of voltageGroups) {
    if (group.voltages.size <= 1 || directVoltageMismatchRoots.has(root)) {
      continue;
    }
    const relatedNodeIds = Array.from(group.relatedNodeIds);
    errors.push({
      id: `voltage-mismatch:${root}`,
      type: "voltage-mismatch",
      nodeId: relatedNodeIds[0],
      relatedNodeIds,
      message: `图上拓扑失败：同一拓扑节点内存在不同电压基值（${Array.from(group.voltages.values()).join(" / ")}）。`
    });
  }

  for (const node of nodes) {
    if (isBusNode(node) || isStaticNode(node)) continue;
    for (const terminal of node.terminals) {
      if (!connectedTerminals.has(`${node.id}:${terminal.id}`)) {
        errors.push({
          id: `floating-terminal:${node.id}:${terminal.id}`,
          type: "floating-terminal",
          nodeId: node.id,
          relatedNodeIds: [node.id],
          message: `${node.name} 的 ${terminal.label} 悬空，未连接到任何设备。`
        });
      }
    }
  }

  return errors;
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
  return JSON.stringify(lockProjectEdgeTerminals(project), null, 2);
}

export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json) as ProjectFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Unsupported or invalid model file");
  }
  return lockProjectEdgeTerminals(parsed);
}

export function lockProjectEdgeTerminals(project: ProjectFile): ProjectFile {
  const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  return {
    ...project,
    nodes: project.nodes,
    edges: project.edges.map((edge) => {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      const sourceTerminalId =
        source?.terminals.some((terminal) => terminal.id === edge.sourceTerminalId)
          ? edge.sourceTerminalId
          : source?.terminals[0]?.id;
      const targetTerminalId =
        target?.terminals.some((terminal) => terminal.id === edge.targetTerminalId)
          ? edge.targetTerminalId
          : target?.terminals[0]?.id;
      return {
        ...edge,
        sourceTerminalId,
        targetTerminalId,
        sourcePoint: source ? (isBusNode(source) ? edge.sourcePoint : undefined) : edge.sourcePoint,
        targetPoint: target ? (isBusNode(target) ? edge.targetPoint : undefined) : edge.targetPoint
      };
    })
  };
}

export function createSavedProject(name: string, project: ProjectFile): SavedProjectRecord {
  const savedName = name.trim() || "未命名模型";
  const lockedProject = lockProjectEdgeTerminals(project);
  return {
    id: makeId("project"),
    name: savedName,
    updatedAt: new Date().toISOString(),
    project: {
      ...lockedProject,
      name: savedName,
      nodes: lockedProject.nodes.map((node) => ({ ...node, params: { ...node.params }, terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } })) })),
      edges: lockedProject.edges.map((edge) => ({
        ...edge,
        sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
        targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
        manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
      }))
    }
  };
}

export function uniqueRecordName(baseName: string, existingNames: string[], fallback: string): string {
  const base = baseName.trim() || fallback;
  const used = new Set(existingNames.map((name) => name.trim()).filter(Boolean));
  if (!used.has(base)) {
    return base;
  }
  let index = 2;
  while (used.has(`${base} (${index})`)) {
    index += 1;
  }
  return `${base} (${index})`;
}

export function copySavedProjectWithUniqueName(project: SavedProjectRecord, existingNames: string[], suffix = "副本"): SavedProjectRecord {
  const name = uniqueRecordName(`${project.name} ${suffix}`, existingNames, "未命名模型");
  return createSavedProject(name, project.project);
}

export function copySavedSchemeWithUniqueName(scheme: SavedSchemeRecord, existingNames: string[], suffix = "副本"): SavedSchemeRecord {
  const name = uniqueRecordName(`${scheme.name} ${suffix}`, existingNames, "未命名方案");
  const projects = scheme.projects.reduce<SavedProjectRecord[]>(
    (current, project) => upsertSavedProject(current, copySavedProjectWithUniqueName(project, current.map((item) => item.name))),
    []
  );
  return createSavedScheme(name, projects);
}

export function upsertSavedProject(projects: SavedProjectRecord[], record: SavedProjectRecord): SavedProjectRecord[] {
  const index = projects.findIndex((project) => project.id === record.id);
  const name = uniqueRecordName(
    record.name,
    projects.filter((project) => project.id !== record.id).map((project) => project.name),
    "未命名模型"
  );
  const nextRecord = {
    ...record,
    name,
    updatedAt: new Date().toISOString(),
    project: { ...record.project, name }
  };
  if (index === -1) {
    return [...projects, nextRecord];
  }
  return projects.map((project) => (project.id === record.id ? nextRecord : project));
}

export function renameSavedProject(
  projects: SavedProjectRecord[],
  projectId: string,
  nextName: string
): SavedProjectRecord[] {
  const name = nextName.trim() || "未命名模型";
  const hasConflict = projects.some((project) => project.id !== projectId && project.name.trim() === name);
  if (hasConflict) {
    return projects;
  }
  return projects.map((project) =>
    project.id === projectId
      ? { ...project, name, updatedAt: new Date().toISOString(), project: { ...project.project, name } }
      : project
  );
}

export function duplicateSavedProject(projects: SavedProjectRecord[], projectId: string): SavedProjectRecord[] {
  const source = projects.find((project) => project.id === projectId);
  if (!source) {
    return projects;
  }
  return upsertSavedProject(projects, createSavedProject(`${source.name} 副本`, source.project));
}

export function deleteSavedProject(projects: SavedProjectRecord[], projectId: string): SavedProjectRecord[] {
  return projects.filter((project) => project.id !== projectId);
}

export function createSavedScheme(name: string, projects: SavedProjectRecord[] = []): SavedSchemeRecord {
  return {
    id: makeId("scheme"),
    name: name.trim() || "未命名方案",
    updatedAt: new Date().toISOString(),
    projects
  };
}

export function renameSavedScheme(
  schemes: SavedSchemeRecord[],
  schemeId: string,
  nextName: string
): SavedSchemeRecord[] {
  const name = nextName.trim() || "未命名方案";
  const hasConflict = schemes.some((scheme) => scheme.id !== schemeId && scheme.name.trim() === name);
  if (hasConflict) {
    return schemes;
  }
  return schemes.map((scheme) =>
    scheme.id === schemeId ? { ...scheme, name, updatedAt: new Date().toISOString() } : scheme
  );
}

export function deleteSavedScheme(schemes: SavedSchemeRecord[], schemeId: string): SavedSchemeRecord[] {
  return schemes.filter((scheme) => scheme.id !== schemeId);
}

export function moveProjectToScheme(
  schemes: SavedSchemeRecord[],
  projectId: string,
  targetSchemeId: string
): SavedSchemeRecord[] {
  const sourceScheme = schemes.find((scheme) => scheme.projects.some((project) => project.id === projectId));
  const project = sourceScheme?.projects.find((item) => item.id === projectId);
  if (!sourceScheme || !project || sourceScheme.id === targetSchemeId) {
    return schemes;
  }
  const now = new Date().toISOString();
  return schemes.map((scheme) => {
    if (scheme.id === sourceScheme.id) {
      return { ...scheme, updatedAt: now, projects: scheme.projects.filter((item) => item.id !== projectId) };
    }
    if (scheme.id === targetSchemeId) {
      return { ...scheme, updatedAt: now, projects: upsertSavedProject(scheme.projects, project) };
    }
    return scheme;
  });
}

function boxFor(node: ModelNode, padding = 0) {
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const visualHalfWidth = halfWidth * cos + halfHeight * sin;
  const visualHalfHeight = halfWidth * sin + halfHeight * cos;
  return {
    left: node.position.x - visualHalfWidth - padding,
    right: node.position.x + visualHalfWidth + padding,
    top: node.position.y - visualHalfHeight - padding,
    bottom: node.position.y + visualHalfHeight + padding
  };
}

function pointInsideBox(point: Point, box: ReturnType<typeof boxFor>) {
  return point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
}

function boxesOverlap(first: ReturnType<typeof boxFor>, second: ReturnType<typeof boxFor>) {
  return first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
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

function routeCorridor(a: Point, b: Point, margin: number) {
  return {
    left: Math.min(a.x, b.x) - margin,
    right: Math.max(a.x, b.x) + margin,
    top: Math.min(a.y, b.y) - margin,
    bottom: Math.max(a.y, b.y) + margin
  };
}

function relevantBlockersForRoute(source: ModelNode, target: ModelNode, nodes: ModelNode[], startOut: Point, endOut: Point, useCorridor = true) {
  const corridor = routeCorridor(startOut, endOut, 96);
  return nodes.filter((node) => {
    if (node.id === source.id || node.id === target.id || node.id.startsWith("floating-")) {
      return false;
    }
    return !useCorridor || boxesOverlap(boxFor(node, 24), corridor);
  });
}

function segmentOverlapAmount(a: Point, b: Point, segment: Segment) {
  if (a.x === b.x && segment.orientation === "vertical" && a.x === segment.a.x) {
    const top = Math.max(Math.min(a.y, b.y), Math.min(segment.a.y, segment.b.y));
    const bottom = Math.min(Math.max(a.y, b.y), Math.max(segment.a.y, segment.b.y));
    return Math.max(0, bottom - top);
  }
  if (a.y === b.y && segment.orientation === "horizontal" && a.y === segment.a.y) {
    const left = Math.max(Math.min(a.x, b.x), Math.min(segment.a.x, segment.b.x));
    const right = Math.min(Math.max(a.x, b.x), Math.max(segment.a.x, segment.b.x));
    return Math.max(0, right - left);
  }
  return 0;
}

function pointOutsideRoutingBounds(point: Point, bounds: ReturnType<typeof routeBounds>) {
  return point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom;
}

function routeBounds(points: Point[], blockers: ModelNode[]) {
  const boxes = blockers.map((node) => boxFor(node, 36));
  return {
    left: Math.min(0, ...points.map((point) => point.x), ...boxes.map((box) => box.left)) - 96,
    right: Math.max(1980, ...points.map((point) => point.x), ...boxes.map((box) => box.right)) + 96,
    top: Math.min(0, ...points.map((point) => point.y), ...boxes.map((box) => box.top)) - 96,
    bottom: Math.max(1200, ...points.map((point) => point.y), ...boxes.map((box) => box.bottom)) + 96
  };
}

const ROUTE_BLOCKER_PADDING = 8;
const ROUTE_CLEARANCE = 6;

function routeIntersectsBlockers(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING, protectedEndpointSegments = 0) {
  for (let index = 1; index < points.length; index += 1) {
    const routeSegmentIndex = index - 1;
    if (
      routeSegmentIndex < protectedEndpointSegments ||
      routeSegmentIndex >= points.length - 1 - protectedEndpointSegments
    ) {
      continue;
    }
    const a = points[index - 1];
    const b = points[index];
    if (blockers.some((blocker) => segmentIntersectsBox(a, b, boxFor(blocker, padding)))) {
      return true;
    }
  }
  return false;
}

function routeOverlapsSegments(points: Point[], avoidedSegments: Segment[]) {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (avoidedSegments.some((segment) => segmentOverlapAmount(a, b, segment) > 2)) {
      return true;
    }
  }
  return false;
}

function firstRouteBlockerIntersection(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING, protectedEndpointSegments = 0) {
  for (let segmentIndex = 1; segmentIndex < points.length; segmentIndex += 1) {
    const routeSegmentIndex = segmentIndex - 1;
    if (
      routeSegmentIndex < protectedEndpointSegments ||
      routeSegmentIndex >= points.length - 1 - protectedEndpointSegments
    ) {
      continue;
    }
    const a = points[segmentIndex - 1];
    const b = points[segmentIndex];
    for (const blocker of blockers) {
      const box = boxFor(blocker, padding);
      if (segmentIntersectsBox(a, b, box)) {
        return { segmentIndex: segmentIndex - 1, box };
      }
    }
  }
  return null;
}

function clampLane(value: number, min: number, max: number, bounds?: CanvasBounds) {
  if (!bounds) {
    return value;
  }
  return Math.max(min, Math.min(max, value));
}

function repairRouteAroundBlockers(points: Point[], blockers: ModelNode[], bounds?: CanvasBounds, protectedEndpointSegments = 0) {
  let route = orthogonalizeRouteKeepingCollinear(points);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const intersection = firstRouteBlockerIntersection(route, blockers, ROUTE_BLOCKER_PADDING, protectedEndpointSegments);
    if (!intersection) {
      return route;
    }
    const a = route[intersection.segmentIndex];
    const b = route[intersection.segmentIndex + 1];
    const box = intersection.box;
    let replacement: Point[];
    if (a.y === b.y) {
      const topLane = clampLane(box.top - 24, 0, bounds?.height ?? box.top - 24, bounds);
      const bottomLane = clampLane(box.bottom + 24, 0, bounds?.height ?? box.bottom + 24, bounds);
      const lane = Math.abs(a.y - bottomLane) <= Math.abs(a.y - topLane) ? bottomLane : topLane;
      replacement = [a, { x: a.x, y: lane }, { x: b.x, y: lane }, b];
    } else if (a.x === b.x) {
      const leftLane = clampLane(box.left - 24, 0, bounds?.width ?? box.left - 24, bounds);
      const rightLane = clampLane(box.right + 24, 0, bounds?.width ?? box.right + 24, bounds);
      const lane = Math.abs(a.x - rightLane) <= Math.abs(a.x - leftLane) ? rightLane : leftLane;
      replacement = [a, { x: lane, y: a.y }, { x: lane, y: b.y }, b];
    } else {
      replacement = orthogonalizeRoute([a, b]);
    }
    route = orthogonalizeRouteKeepingCollinear([
      ...route.slice(0, intersection.segmentIndex),
      ...replacement,
      ...route.slice(intersection.segmentIndex + 2)
    ]);
  }
  return route;
}

function safeStubPoint(point: Point, normal: Point, blockers: ModelNode[], maxLength: number): Point {
  let length = maxLength;
  const safeLengthBefore = (distance: number) => (distance > 0 ? Math.max(1, distance) : ROUTE_CLEARANCE);
  for (const blocker of blockers) {
    const box = boxFor(blocker, ROUTE_BLOCKER_PADDING);
    if (normal.x > 0 && point.y > box.top && point.y < box.bottom && box.left >= point.x) {
      length = Math.min(length, safeLengthBefore(box.left - point.x - 1));
    } else if (normal.x < 0 && point.y > box.top && point.y < box.bottom && box.right <= point.x) {
      length = Math.min(length, safeLengthBefore(point.x - box.right - 1));
    } else if (normal.y > 0 && point.x > box.left && point.x < box.right && box.top >= point.y) {
      length = Math.min(length, safeLengthBefore(box.top - point.y - 1));
    } else if (normal.y < 0 && point.x > box.left && point.x < box.right && box.bottom <= point.y) {
      length = Math.min(length, safeLengthBefore(point.y - box.bottom - 1));
    }
  }
  return {
    x: Math.round(point.x + normal.x * length),
    y: Math.round(point.y + normal.y * length)
  };
}

function buildFullRoute(start: Point, startOut: Point, middle: Point[], endOut: Point, end: Point, bounds?: CanvasBounds) {
  const route = [
    start,
    ...(!samePoint(start, startOut) ? [startOut] : []),
    ...middle,
    ...(!samePoint(endOut, end) ? [endOut] : []),
    end
  ];
  const bounded = bounds ? route.map((point) => clampPointToBounds(point, bounds)) : route;
  return orthogonalizeRouteKeepingCollinear(bounded);
}

function scoreRoute(points: Point[], blockers: ModelNode[], avoidedSegments: Segment[] = []) {
  let score = points.length * 8;
  const bounds = routeBounds(points, blockers);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (pointOutsideRoutingBounds(a, bounds) || pointOutsideRoutingBounds(b, bounds)) {
      score += 1000000;
    }
    score += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (const blocker of blockers) {
      if (segmentIntersectsBox(a, b, boxFor(blocker, ROUTE_BLOCKER_PADDING))) {
        score += 10000000;
      }
    }
    for (const segment of avoidedSegments) {
      const overlap = segmentOverlapAmount(a, b, segment);
      if (overlap > 2) {
        score += 10000000 + overlap * 1000;
      }
    }
  }
  return score;
}

function compactRoute(points: Point[]) {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    if (previous && samePoint(previous, point)) {
      return false;
    }
    const prev = points[index - 1];
    const next = points[index + 1];
    if (!prev || !next) {
      return true;
    }
    return !(prev.x === point.x && point.x === next.x) && !(prev.y === point.y && point.y === next.y);
  });
}

function orthogonalizeRoute(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points;
  }
  const orthogonal: Point[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = orthogonal[orthogonal.length - 1];
    const current = points[index];
    if (previous.x !== current.x && previous.y !== current.y) {
      orthogonal.push({ x: current.x, y: previous.y });
    }
    orthogonal.push(current);
  }
  return compactRoute(orthogonal);
}

function orthogonalizeRouteKeepingCollinear(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points;
  }
  const orthogonal: Point[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = orthogonal[orthogonal.length - 1];
    const current = points[index];
    if (previous.x !== current.x && previous.y !== current.y) {
      orthogonal.push({ x: current.x, y: previous.y });
    }
    orthogonal.push(current);
  }
  return orthogonal.filter((point, index) => {
    const previous = orthogonal[index - 1];
    return !previous || !samePoint(previous, point);
  });
}

function simplifyRoutePreservingEndpointStubs(points: Point[]): Point[] {
  const route = orthogonalizeRouteKeepingCollinear(points);
  if (route.length <= 4) {
    return route;
  }
  const protectedIndexes = new Set([0, 1, route.length - 2, route.length - 1]);
  return route.filter((point, index) => {
    if (protectedIndexes.has(index)) {
      return true;
    }
    const previous = route[index - 1];
    const next = route[index + 1];
    if (!previous || !next) {
      return true;
    }
    return !(previous.x === point.x && point.x === next.x) && !(previous.y === point.y && point.y === next.y);
  });
}

export function pointsToOrthogonalPath(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function moveOrthogonalRouteSegment(
  routePoints: Point[],
  segmentIndex: number,
  orientation: "horizontal" | "vertical",
  pointerPoint: Point,
  bounds?: CanvasBounds
): Point[] {
  const nextPoints = routePoints.map((point) => ({ ...point }));
  if (segmentIndex < 0 || segmentIndex >= routePoints.length - 1) {
    return nextPoints;
  }
  const targetCoordinate = Math.round(orientation === "horizontal" ? pointerPoint.y : pointerPoint.x);
  const movePoint = (source: Point) => {
    const moved = orientation === "horizontal"
      ? { x: source.x, y: targetCoordinate }
      : { x: targetCoordinate, y: source.y };
    return bounds ? clampPointToBounds(moved, bounds) : moved;
  };
  [segmentIndex, segmentIndex + 1].forEach((routeIndex) => {
    if (routeIndex > 0 && routeIndex < routePoints.length - 1) {
      nextPoints[routeIndex] = movePoint(routePoints[routeIndex]);
    }
  });
  return nextPoints;
}

export function getMovableRouteSegmentIndexes(routePoints: Point[]): number[] {
  const indexes: number[] = [];
  for (let segmentIndex = 1; segmentIndex < routePoints.length - 2; segmentIndex += 1) {
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || samePoint(from, to)) {
      continue;
    }
    if (from.x !== to.x && from.y !== to.y) {
      continue;
    }
    indexes.push(segmentIndex);
  }
  return indexes;
}

type Segment = {
  edgeId: string;
  edgeIndex: number;
  segmentIndex: number;
  a: Point;
  b: Point;
  orientation: "horizontal" | "vertical";
};

function getSegments(edgeId: string, edgeIndex: number, points: Point[]): Segment[] {
  const segments: Segment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x === b.x && a.y !== b.y) {
      segments.push({ edgeId, edgeIndex, segmentIndex: index - 1, a, b, orientation: "vertical" });
    } else if (a.y === b.y && a.x !== b.x) {
      segments.push({ edgeId, edgeIndex, segmentIndex: index - 1, a, b, orientation: "horizontal" });
    }
  }
  return segments;
}

function between(value: number, a: number, b: number, margin = 0) {
  return value > Math.min(a, b) + margin && value < Math.max(a, b) - margin;
}

function intersection(a: Segment, b: Segment): Point | null {
  if (a.orientation === b.orientation) {
    return null;
  }
  const horizontal = a.orientation === "horizontal" ? a : b;
  const vertical = a.orientation === "vertical" ? a : b;
  const point = { x: vertical.a.x, y: horizontal.a.y };
  if (between(point.x, horizontal.a.x, horizontal.b.x, 10) && between(point.y, vertical.a.y, vertical.b.y, 10)) {
    return point;
  }
  return null;
}

function overlapAmount(a: Segment, b: Segment) {
  if (a.orientation !== b.orientation) {
    return 0;
  }
  if (a.orientation === "horizontal" && a.a.y === b.a.y) {
    const left = Math.max(Math.min(a.a.x, a.b.x), Math.min(b.a.x, b.b.x));
    const right = Math.min(Math.max(a.a.x, a.b.x), Math.max(b.a.x, b.b.x));
    return Math.max(0, right - left);
  }
  if (a.orientation === "vertical" && a.a.x === b.a.x) {
    const top = Math.max(Math.min(a.a.y, a.b.y), Math.min(b.a.y, b.b.y));
    const bottom = Math.min(Math.max(a.a.y, a.b.y), Math.max(b.a.y, b.b.y));
    return Math.max(0, bottom - top);
  }
  return 0;
}

function separateOverlaps(routes: RoutedEdge[]): RoutedEdge[] {
  return routes.map((route, routeIndex) => {
    if (routeIndex === 0) {
      return route;
    }
    const previousSegments = routes.slice(0, routeIndex).flatMap((item, index) => getSegments(item.edgeId, index, item.points));
    const currentSegments = getSegments(route.edgeId, routeIndex, route.points);
    const hasOverlap = currentSegments.some((segment) =>
      previousSegments.some((previous) => overlapAmount(segment, previous) > 18)
    );
    if (!hasOverlap || route.points.length <= 4) {
      return route;
    }
    const offset = 12 * ((routeIndex % 2 === 0 ? 1 : -1) * Math.ceil(routeIndex / 2));
    const points = route.points.map((point, index) => {
      if (index === 0 || index === 1 || index === route.points.length - 1 || index === route.points.length - 2) {
        return point;
      }
      return { x: point.x, y: point.y + offset };
    });
    return { ...route, points: orthogonalizeRoute(points) };
  });
}

function uniqueSorted(values: number[]) {
  return [...new Set(values.map((value) => Math.round(value)))].sort((a, b) => a - b);
}

function candidateLanes(startOut: Point, endOut: Point, blockers: ModelNode[], avoidedSegments: Segment[], bounds?: CanvasBounds) {
  const blockerBoxes = blockers.map((node) => boxFor(node, 32));
  const clampX = (value: number) => bounds ? Math.max(0, Math.min(bounds.width, value)) : value;
  const clampY = (value: number) => bounds ? Math.max(0, Math.min(bounds.height, value)) : value;
  const xValues = [
    startOut.x,
    endOut.x,
    Math.round((startOut.x + endOut.x) / 2),
    ...blockerBoxes.flatMap((box) => [box.left - 24, box.right + 24, box.left - 56, box.right + 56]),
    ...avoidedSegments.filter((segment) => segment.orientation === "vertical").flatMap((segment) => [segment.a.x - 18, segment.a.x + 18])
  ].map(clampX);
  const yValues = [
    startOut.y,
    endOut.y,
    Math.round((startOut.y + endOut.y) / 2),
    ...blockerBoxes.flatMap((box) => [box.top - 24, box.bottom + 24, box.top - 56, box.bottom + 56]),
    ...avoidedSegments.filter((segment) => segment.orientation === "horizontal").flatMap((segment) => [segment.a.y - 18, segment.a.y + 18])
  ].map(clampY);
  return { xs: uniqueSorted(xValues), ys: uniqueSorted(yValues) };
}

function buildRouteCandidates(startOut: Point, endOut: Point, blockers: ModelNode[], avoidedSegments: Segment[], bounds?: CanvasBounds) {
  const { xs, ys } = candidateLanes(startOut, endOut, blockers, avoidedSegments, bounds);
  const candidates: Point[][] = [
    [startOut, { x: endOut.x, y: startOut.y }, endOut],
    [startOut, { x: startOut.x, y: endOut.y }, endOut]
  ];

  for (const x of xs) {
    candidates.push([startOut, { x, y: startOut.y }, { x, y: endOut.y }, endOut]);
  }
  for (const y of ys) {
    candidates.push([startOut, { x: startOut.x, y }, { x: endOut.x, y }, endOut]);
  }
  for (const x of xs) {
    for (const y of ys) {
      candidates.push([startOut, { x, y: startOut.y }, { x, y }, { x: endOut.x, y }, endOut]);
      candidates.push([startOut, { x: startOut.x, y }, { x, y }, { x, y: endOut.y }, endOut]);
    }
  }

  return candidates.map(compactRoute);
}

function selectRouteCandidate(candidates: Point[][], blockers: ModelNode[], avoidedSegments: Segment[]) {
  const nonIntersecting = candidates.filter((candidate) => !routeIntersectsBlockers(candidate, blockers));
  const nonOverlapping = nonIntersecting.filter((candidate) => !routeOverlapsSegments(candidate, avoidedSegments));
  const pool = nonOverlapping.length > 0 ? nonOverlapping : nonIntersecting.length > 0 ? nonIntersecting : candidates;
  return pool.sort((a, b) => scoreRoute(a, blockers, avoidedSegments) - scoreRoute(b, blockers, avoidedSegments))[0];
}

function pathWithCrossingArcs(route: RoutedEdge, allRoutes: RoutedEdge[], routeIndex: number) {
  const crossingsBySegment = new Map<number, Point[]>();
  const currentSegments = getSegments(route.edgeId, routeIndex, route.points);
  const previousSegments = allRoutes.slice(0, routeIndex).flatMap((item, index) => getSegments(item.edgeId, index, item.points));

  for (const segment of currentSegments) {
    for (const previous of previousSegments) {
      const point = intersection(segment, previous);
      if (point) {
        crossingsBySegment.set(segment.segmentIndex, [...(crossingsBySegment.get(segment.segmentIndex) ?? []), point]);
      }
    }
  }

  if (crossingsBySegment.size === 0) {
    return pointsToOrthogonalPath(route.points);
  }

  const radius = 7;
  const commands = [`M ${route.points[0].x} ${route.points[0].y}`];
  for (let index = 1; index < route.points.length; index += 1) {
    const a = route.points[index - 1];
    const b = route.points[index];
    const crossings = crossingsBySegment.get(index - 1) ?? [];
    if (crossings.length === 0) {
      commands.push(`L ${b.x} ${b.y}`);
      continue;
    }

    const ordered = crossings.sort((first, second) =>
      a.x === b.x ? Math.abs(first.y - a.y) - Math.abs(second.y - a.y) : Math.abs(first.x - a.x) - Math.abs(second.x - a.x)
    );
    for (const crossing of ordered) {
      if (a.y === b.y) {
        const direction = Math.sign(b.x - a.x);
        commands.push(`L ${crossing.x - direction * radius} ${crossing.y}`);
        commands.push(`Q ${crossing.x} ${crossing.y - radius} ${crossing.x + direction * radius} ${crossing.y}`);
      } else {
        const direction = Math.sign(b.y - a.y);
        commands.push(`L ${crossing.x} ${crossing.y - direction * radius}`);
        commands.push(`Q ${crossing.x + radius} ${crossing.y} ${crossing.x} ${crossing.y + direction * radius}`);
      }
    }
    commands.push(`L ${b.x} ${b.y}`);
  }
  return commands.join(" ");
}

export function routeEdgesForRendering(nodes: ModelNode[], edges: Edge[], bounds?: CanvasBounds): RoutedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routed: RoutedEdge[] = [];
  edges.forEach((edge) => {
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return;
    }
    const avoidedSegments = routed.flatMap((route, index) => getSegments(route.edgeId, index, route.points));
    routed.push({
      edgeId: edge.id,
      points: routeOrthogonalEdge(source, target, nodes, edge, avoidedSegments, bounds),
      path: ""
    });
  });
  const renderRoutes = routed.map((route) => ({ ...route, points: simplifyRoutePreservingEndpointStubs(route.points) }));
  return renderRoutes.map((route, index, allRoutes) => ({
    ...route,
    path: pathWithCrossingArcs(route, allRoutes, index)
  }));
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function createFloatingEndpointNode(point: Point, relatedNode?: ModelNode): ModelNode {
  const type = relatedNode?.terminals[0]?.type ?? "ac";
  return {
    id: `floating-${point.x}-${point.y}`,
    kind: type === "dc" ? "dc-bus" : type === "h2" ? "hydrogen-bus" : type === "heat" ? "heat-bus" : "ac-bus",
    name: "悬空端点",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: point,
    size: { width: 0, height: 0 },
    rotation: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    terminals: [{ id: "t1", label: "悬空端点", type, anchor: { x: 0, y: 0 }, nodeNumber: "" }],
    params: {}
  };
}

export function routeOrthogonalEdge(source: ModelNode, target: ModelNode, nodes: ModelNode[], edge?: Edge, avoidedSegments: Segment[] = [], bounds?: CanvasBounds): Point[] {
  const start = getEdgeEndpointPoint(source, edge?.sourcePoint, edge?.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge?.targetPoint, edge?.targetTerminalId);
  const sourceNormal = isBusNode(source) ? getBusEndpointNormal(source, start, end) : getTerminalNormal(source, edge?.sourceTerminalId);
  const targetNormal = isBusNode(target) ? getBusEndpointNormal(target, end, start) : getTerminalNormal(target, edge?.targetTerminalId);
  const stubLength = 28;
  const initialStartOut = {
    x: start.x + sourceNormal.x * stubLength,
    y: start.y + sourceNormal.y * stubLength
  };
  const initialEndOut = {
    x: end.x + targetNormal.x * stubLength,
    y: end.y + targetNormal.y * stubLength
  };
  const blockers = [
    source,
    target,
    ...relevantBlockersForRoute(source, target, nodes, initialStartOut, initialEndOut, false)
  ];
  const startOut = safeStubPoint(start, sourceNormal, blockers, stubLength);
  const endOut = safeStubPoint(end, targetNormal, blockers, stubLength);
  if (edge?.manualPoints?.length) {
    const manualRoute = orthogonalizeRouteKeepingCollinear([start, startOut, ...edge.manualPoints, endOut, end]);
    const boundedManualRoute = bounds ? orthogonalizeRouteKeepingCollinear(manualRoute.map((point) => clampPointToBounds(point, bounds))) : manualRoute;
    if (!routeIntersectsBlockers(boundedManualRoute, blockers, ROUTE_BLOCKER_PADDING, 1)) {
      return simplifyRoutePreservingEndpointStubs(boundedManualRoute);
    }
    const candidates = buildRouteCandidates(startOut, endOut, blockers, avoidedSegments, bounds);
    const repairedMiddle = selectRouteCandidate(candidates, blockers, avoidedSegments);
    return simplifyRoutePreservingEndpointStubs(repairRouteAroundBlockers(
      buildFullRoute(start, startOut, repairedMiddle.slice(1, -1), endOut, end, bounds),
      blockers,
      bounds,
      1
    ));
  }
  const candidates = buildRouteCandidates(startOut, endOut, blockers, avoidedSegments, bounds);
  const routedMiddle = selectRouteCandidate(candidates, blockers, avoidedSegments);
  return simplifyRoutePreservingEndpointStubs(repairRouteAroundBlockers(
    buildFullRoute(start, startOut, routedMiddle.slice(1, -1), endOut, end, bounds),
    blockers,
    bounds,
    1
  ));
}
