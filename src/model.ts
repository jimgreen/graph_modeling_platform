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
  | "ac-ground-disconnector"
  | "ac-ground-disconnector-vertical"
  | "ac-breaker"
  | "ac-box-breaker"
  | "ac-load"
  | "ac-terminal-transformer-load"
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
  | "ac-hydrogen-electrolyzer"
  | "dc-hydrogen-electrolyzer"
  | "hydrogen-source"
  | "hydrogen-storage"
  | "hydrogen-load"
  | "hydrogen-fuel-cell"
  | "ac-hydrogen-fuel-cell"
  | "dc-hydrogen-fuel-cell"
  | "hydrogen-bus"
  | "hydrogen-compressor"
  | "hydrogen-regulator"
  | "hydrogen-valve"
  | "hydrogen-pipeline"
  | "heat-boiler"
  | "single-heat-boiler"
  | "two-port-heat-boiler"
  | "heat-source"
  | "single-heat-source"
  | "two-port-heat-source"
  | "heat-electric-heater"
  | "ac-heat-electric-heater"
  | "ac-two-port-heat-electric-heater"
  | "dc-heat-electric-heater"
  | "dc-two-port-heat-electric-heater"
  | "heat-exchanger-two"
  | "heat-exchanger-three"
  | "heat-exchanger-four"
  | "heat-storage"
  | "heat-load"
  | "single-heat-load"
  | "two-port-heat-load"
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
  | "ground-disconnector"
  | "ground-disconnector-vertical"
  | "breaker"
  | "box-breaker"
  | "load"
  | "terminal-transformer-load"
  | "dcdc-converter"
  | "acdc-converter"
  | "acac-converter"
  | "default";

export type Point = {
  x: number;
  y: number;
};

const THREE_WINDING_TRANSFORMER_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: -8 / 76 },
  { x: 0.5, y: -8 / 76 },
  { x: 0, y: 0.5 }
];

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
  attributeLibrary: string;
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
  paramKey?: string;
};

export type ContainerDeviceParameterView = {
  id: string;
  label: string;
  kind: "container" | "associated";
  componentType?: string;
  relationKeys?: string[];
  terminalIndexes?: number[];
  terminalLabels?: string;
  rows: ContainerDeviceParameterViewRow[];
};

export type ModelNode = {
  id: string;
  kind: DeviceKind;
  name: string;
  layerId?: string;
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

export type ModelGroup = {
  id: string;
  name: string;
  nodeIds: string[];
  edgeIds: string[];
  childGroupIds?: string[];
};

export type ModelLayer = {
  id: string;
  name: string;
  visible: boolean;
};

export type OverlappingTerminalRef = {
  nodeId: string;
  terminalId: string;
  type: TerminalType;
  point: Point;
};

export type OverlappingTerminalGroup = {
  key: string;
  type: TerminalType;
  point: Point;
  terminals: OverlappingTerminalRef[];
};

export type OverlappingTerminalConnectionReconcileResult = {
  edges: Edge[];
  addedEdgeIds: string[];
  removedEdgeIds: string[];
};

export type TerminalBusContact = {
  nodeId: string;
  terminalId: string;
  busId: string;
  busTerminalId: string;
  type: TerminalType;
  point: Point;
};

export type TerminalBusContactGroup = {
  key: string;
  type: TerminalType;
  point: Point;
  contacts: TerminalBusContact[];
};

export type ElementTreeItem = {
  kind: "node" | "edge";
  id: string;
  name: string;
  idx?: string;
  editableDevice?: boolean;
  children?: ElementTreeChildItem[];
};

export type ElementTreeChildItem = {
  id: string;
  label: string;
  componentType: string;
  idx: string;
  name: string;
  nameKey: string;
  relationKeys: string[];
  terminalLabels: string;
};

export type ElementTreeGroup = {
  typeKey: string;
  typeLabel: string;
  items: ElementTreeItem[];
};

export type ProjectFile = {
  version: 1;
  name: string;
  layers?: ModelLayer[];
  activeLayerId?: string;
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
  groups?: ModelGroup[];
  nodes: ModelNode[];
  edges: Edge[];
};

export const DEFAULT_MODEL_LAYER_ID = "layer-default";
export const DEFAULT_MODEL_LAYER_NAME = "默认图层";

export const DEFAULT_POWER_UNIT = "MW";
export const DEFAULT_VOLTAGE_UNIT = "kV";
export const DEFAULT_CURRENT_UNIT = "A";
export const DEFAULT_POWER_BASE_VALUE = 100;

export const E_SECTION_COLUMNS: Record<string, string[]> = {
  StaticSymbol: [],
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
  GroundDisconnector: ["idx", "name", "node", "status", "run_stat"],
  ACTransformer: ["idx", "name", "i_node", "j_node", "r", "x", "gt", "bt", "tap", "shift", "run_stat"],
  ACTransfomer3: ["idx", "name", "run_stat", "idx_xf_t1", "idx_xf_t2", "idx_xf_t3"],
  DCDCConverter: ["idx", "name", "i_node", "j_node", "r1", "r2", "i_control_type", "j_control_type", "p_set", "i_set", "v_set", "run_stat"],
  DCACConverter: ["idx", "name", "ac_node", "dc_node", "r1", "r2", "control_type", "p_ac_set", "q_ac_set", "v_ac_set", "v_dc_set", "run_stat"],
  ACACConverter: ["idx", "name", "i_node", "j_node", "r1", "r2", "control_type", "p_set", "i_q_set", "j_q_set", "i_v_set", "j_v_set", "run_stat"],
  HydroSource: ["idx", "name", "node", "run_stat"],
  HydroLoad: ["idx", "name", "node", "run_stat"],
  HydroPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroCompressor: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroPressRegulator: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HydroBus: ["idx", "name", "node", "run_stat"],
  HydroTank: ["idx", "name", "node", "run_stat"],
  AcE2Hydro: ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_h2_unit_t2"],
  DcE2Hydro: ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_h2_unit_t2"],
  Hydro2AcE: ["idx", "name", "run_stat", "idx_ac_unit_t1", "idx_h2_load_t2"],
  Hydro2DcE: ["idx", "name", "run_stat", "idx_dc_unit_t1", "idx_h2_load_t2"],
  HeatSource: ["idx", "name", "node", "run_stat"],
  HeatSource2: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatLoad: ["idx", "name", "node", "run_stat"],
  HeatLoad2: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HeatBus: ["idx", "name", "node", "run_stat"],
  HeatTank: ["idx", "name", "node", "run_stat"],
  HeatBoiler: ["idx", "name", "run_stat", "idx_heat_unit_t1"],
  HeatBoiler2: ["idx", "name", "run_stat", "idx_heat2_unit_t1"],
  AcElec2Heat: ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"],
  DcElec2Heat: ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"],
  AcElec2Heat2: ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat2_unit_t2"],
  DcElec2Heat2: ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat2_unit_t2"],
  HeatExchanger: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatExchanger3: ["idx", "name", "node1", "node2", "node3", "run_stat"],
  HeatExchanger4: ["idx", "name", "node1", "node2", "node3", "node4", "run_stat"],
  HeatPump: ["idx", "name", "i_node", "j_node", "run_stat"]
};

const E_KIND_SECTION_MAP: Record<string, string> = {
  "hydrogen-source": "HydroSource",
  "hydrogen-load": "HydroLoad",
  "hydrogen-pipeline": "HydroPipe",
  "hydrogen-compressor": "HydroCompressor",
  "hydrogen-pressure-reducer": "HydroPressRegulator",
  "hydrogen-shutoff-valve": "HydroStopValve",
  "hydrogen-bus": "HydroBus",
  "hydrogen-tank": "HydroTank",
  "ac-electrolyzer": "AcE2Hydro",
  "dc-electrolyzer": "DcE2Hydro",
  "ac-fuel-cell": "Hydro2AcE",
  "dc-fuel-cell": "Hydro2DcE",
  "heat-source": "HeatSource",
  "single-port-heat-load": "HeatLoad",
  "heat-load": "HeatLoad",
  "two-port-heat-source": "HeatSource2",
  "two-port-heat-load": "HeatLoad2",
  "heat-pipeline": "HeatPipe",
  "heat-shutoff-valve": "HeatStopValve",
  "heat-bus": "HeatBus",
  "thermal-storage-tank": "HeatTank",
  "heat-boiler": "HeatBoiler",
  "two-port-heat-boiler": "HeatBoiler2",
  "ac-heater": "AcElec2Heat",
  "dc-heater": "DcElec2Heat",
  "ac-two-port-heater": "AcElec2Heat2",
  "dc-two-port-heater": "DcElec2Heat2",
  "heat-exchanger": "HeatExchanger",
  "three-port-heat-exchanger": "HeatExchanger3",
  "four-port-heat-exchanger": "HeatExchanger4",
  "heat-pump": "HeatPump"
};

function isContainerParams(params: Record<string, string> = {}) {
  return params.is_container === "1" || params.is_container === "true" || params.isContainer === "true";
}

export function inferESection(kind: string, params: Record<string, string> = {}) {
  if (kind === "ac-bus") return "ACRealBs";
  if (kind === "dc-bus") return "DCRealBs";
  if (isStaticKind(kind)) return "StaticSymbol";
  const componentType = params.component_type?.trim();
  if (componentType) {
    return componentType;
  }
  const mappedSection = E_KIND_SECTION_MAP[kind];
  if (mappedSection) {
    return mappedSection;
  }
  if (isContainerParams(params)) {
    return "";
  }
  if (kind === "ac-line") return "ACBranch";
  if (kind === "dc-line") return "DCBranch";
  if (kind === "ac-zero-branch") return "ACZeroBranch";
  if (kind === "dc-zero-branch") return "DCZeroBranch";
  if (kind === "ac-load" || kind === "ac-terminal-transformer-load") return "ACLoad";
  if (kind === "dc-load") return "DCLoad";
  if (kind === "ac-storage") return "ACGenerator";
  if (kind === "dc-storage") return "DCGenerator";
  if (kind.startsWith("ac-") && kind.includes("source")) return "ACGenerator";
  if (kind.startsWith("dc-") && kind.includes("source")) return "DCGenerator";
  if (kind === "ac-switch" || kind === "ac-disconnector") return "ACSwitch";
  if (kind === "ac-ground-disconnector" || kind === "ac-ground-disconnector-vertical") return "GroundDisconnector";
  if (kind === "dc-switch" || kind === "dc-disconnector") return "DCSwitch";
  if (kind === "ac-breaker" || kind === "ac-box-breaker") return "ACBreak";
  if (kind === "dc-breaker") return "DCBreak";
  if (kind === "ac-transformer" || kind === "ac-two-winding-transformer") return "ACTransformer";
  if (kind === "ac-three-winding-transformer") return "ACTransfomer3";
  if (kind === "dcdc-converter") return "DCDCConverter";
  if (kind === "acdc-converter") return "DCACConverter";
  if (kind === "acac-converter") return "ACACConverter";
  return "";
}

export type DeviceIndexCounters = Record<string, number>;

function deviceIndexCounterKey(node: Pick<ModelNode, "kind" | "params">): string {
  if (isStaticKind(node.kind)) {
    return "";
  }
  const section = inferESection(node.kind, node.params);
  if (section === "ACTransfomer3") {
    return section;
  }
  if (isContainerParams(node.params)) {
    return String(node.kind);
  }
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripGeneratedDeviceName(name?: string): string {
  return String(name ?? "")
    .trim()
    .replace(/\s*副本(?:\s*\d+)?$/u, "")
    .replace(/-\d+$/u, "")
    .trim();
}

function deviceDefaultNameBase(node: Pick<ModelNode, "kind" | "name" | "params">): string {
  const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind);
  return template?.label || stripGeneratedDeviceName(node.name) || inferESection(node.kind, node.params) || node.kind;
}

function isGeneratedDeviceName(name: string, baseName: string): boolean {
  if (!name) {
    return true;
  }
  const copyBaseName = name.replace(/\s*副本(?:\s*\d+)?$/u, "").trim();
  if (name === baseName || copyBaseName === baseName) {
    return true;
  }
  const indexedNamePattern = new RegExp(`^${escapeRegExp(baseName)}-\\d+$`);
  return indexedNamePattern.test(name) || indexedNamePattern.test(copyBaseName);
}

function withAllocatedDeviceName<T extends Pick<ModelNode, "kind" | "name" | "params">>(node: T, idx: number): T {
  const baseName = deviceDefaultNameBase(node);
  const currentName = node.name.trim();
  if (!isGeneratedDeviceName(currentName, baseName)) {
    return node;
  }
  const nextName = `${baseName}-${idx}`;
  return currentName === nextName ? node : { ...node, name: nextName };
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
    doublePort: energy === "ac2" || energy === "dc2" || energy === "h22" || energy === "heat2"
  };
}

function containerRelationBaseEnergy(energy: string) {
  if (energy === "h22") {
    return "h2";
  }
  if (energy === "ac2" || energy === "dc2" || energy === "heat2") {
    return energy.slice(0, -1);
  }
  return energy;
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
    h2_unit: "HydroSource",
    h2_load: "HydroLoad",
    h22_unit: "TwoPortHydrogenSource",
    h22_load: "TwoPortHydrogenLoad",
    heat_unit: "HeatSource",
    heat_load: "HeatLoad",
    heat2_unit: "HeatSource2",
    heat2_load: "HeatLoad2"
  };
  return mapping[`${energy}_${role}`] ?? `ContainerRelation:${energy}_${role}`;
}

function isContainerTransformerRelationKey(fieldName: string): boolean {
  return /^idx_xf_t\d+$/.test(fieldName) || /_transformer_t\d+$/.test(fieldName);
}

export function containerRelationNameKey(fieldName: string): string {
  return fieldName.replace(/^idx_/, "name_");
}

function containerRelationParamKey(fieldName: string, column: string): string {
  if (!fieldName) {
    return column;
  }
  const transformerSide = THREE_WINDING_TRANSFORMER_SIDES.find((side) => side.idxKey === fieldName);
  if (transformerSide) {
    const sideColumnMap: Record<string, string> = {
      r: `${transformerSide.suffix}ResistancePu`,
      x: `${transformerSide.suffix}ReactancePu`,
      gt: `${transformerSide.suffix}MagnetizingConductancePu`,
      bt: `${transformerSide.suffix}MagnetizingSusceptancePu`,
      tap: `${transformerSide.suffix}TapRatio`,
      shift: `${transformerSide.suffix}Shift`
    };
    if (column in sideColumnMap) {
      return sideColumnMap[column];
    }
  }
  if (column === "idx") {
    return fieldName;
  }
  if (column === "name") {
    return containerRelationNameKey(fieldName);
  }
  return `${column}_${fieldName.replace(/^idx_/, "")}`;
}

function containerRelationRoleDisplayLabel(fieldName: string): string {
  const parsed = parseContainerRelationField(fieldName);
  if (!parsed) {
    return fieldName;
  }
  if (parsed.role === "transformer") {
    return "双绕组主变首端";
  }
  const energy = containerRelationBaseEnergy(parsed.energy);
  const doublePort = parsed.doublePort;
  if (energy === "ac") {
    return parsed.role === "load" ? "交流电负荷" : "交流电源";
  }
  if (energy === "dc") {
    return parsed.role === "load" ? "直流电负荷" : "直流电源";
  }
  if (energy === "h2") {
    return parsed.role === "load" ? "氢荷" : "氢源";
  }
  if (parsed.role === "load") {
    return doublePort ? "双端热荷" : "单端热荷";
  }
  return doublePort ? "双端热源" : "单端热源";
}

function containerRelationDisplayLabel(
  node: Pick<ModelNode, "name" | "terminals">,
  fieldName: string
): string {
  const parsed = parseContainerRelationField(fieldName);
  if (!parsed) {
    return fieldName;
  }
  if (/^idx_xf_t\d+$/.test(fieldName)) {
    const sideLabel = THREE_WINDING_TRANSFORMER_SIDES[parsed.terminalNumber - 1]?.label;
    if (sideLabel) {
      return sideLabel;
    }
  }
  const terminalLabel = node.terminals[parsed.terminalNumber - 1]?.label ?? `端子${parsed.terminalNumber}`;
  return `${terminalLabel}${containerRelationRoleDisplayLabel(fieldName)}`;
}

function containerAssociatedDeviceDisplayName(
  node: Pick<ModelNode, "name" | "terminals">,
  fieldName: string
): string {
  return `${node.name.trim() || "未命名容器"}_${containerRelationDisplayLabel(node, fieldName)}`;
}

function containerAssociatedDeviceName(
  node: Pick<ModelNode, "name" | "terminals" | "params">,
  fieldName: string
): string {
  return node.params[containerRelationNameKey(fieldName)]?.trim() || containerAssociatedDeviceDisplayName(node, fieldName);
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

export function assignPermanentDeviceIndex<T extends Pick<ModelNode, "kind" | "name" | "params">>(
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
  const indexedNode = withAllocatedDeviceName({ ...node, params: { ...node.params, idx: String(idx) } }, idx);
  const relationResult = assignContainerRelationIndexes(indexedNode, { ...counters, [key]: idx });
  return { node: relationResult.node, counters: relationResult.counters };
}

export function resetDeviceIndexesForPaste<T extends Pick<ModelNode, "params"> & Partial<Pick<ModelNode, "kind" | "name">>>(
  node: T
): T {
  let changed = false;
  const nextParams = { ...node.params };
  const hadDeviceIndex = Object.prototype.hasOwnProperty.call(nextParams, "idx");
  if (hadDeviceIndex) {
    delete nextParams.idx;
    changed = true;
  }
  if (isContainerParams(node.params)) {
    for (const fieldName of Object.keys(nextParams)) {
      if (parseContainerRelationField(fieldName) && nextParams[fieldName] !== "") {
        nextParams[fieldName] = "";
        changed = true;
      }
    }
  }
  const indexedDeviceNode = node.kind && typeof node.name === "string"
    ? (node as Pick<ModelNode, "kind" | "name" | "params">)
    : null;
  let nextNode = node;
  if (indexedDeviceNode && deviceIndexCounterKey(indexedDeviceNode)) {
    const baseName = deviceDefaultNameBase(indexedDeviceNode);
    if (node.name !== baseName) {
      nextNode = { ...nextNode, name: baseName };
      changed = true;
    }
  }
  return changed ? { ...nextNode, params: nextParams } : node;
}

export function assignMissingDeviceIndexes<T extends Pick<ModelNode, "kind" | "name" | "params">>(
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

function normalizeControlTypeForE(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();
  const map: Record<string, string> = {
    定P: "P",
    定V: "V",
    定I: "I",
    定PQ: "PQ",
    定PV: "PV",
    定PH: "PH",
    不定: "0"
  };
  return map[trimmed] ?? trimmed;
}

export const DCAC_CONVERTER_CONTROL_TYPES = ["DCV", "ACV", "ACP"] as const;
export const ACAC_CONVERTER_CONTROL_TYPES = ["PQQ", "PVQ", "PQV", "PVV"] as const;
export const DCDC_CONVERTER_CONTROL_TYPES = ["CTRL_P", "CTRL_V", "CTRL_I", "SLACK"] as const;
export const AC_GENERATOR_CONTROL_TYPES = ["PV", "PQ", "PH"] as const;
export const DC_GENERATOR_CONTROL_TYPES = ["P", "V", "I"] as const;

function normalizeAcGeneratorControlTypeForE(value?: string) {
  if (!value) return "PV";
  const normalized = normalizeControlTypeForE(value);
  return (AC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(normalized) ? normalized : "PV";
}

function normalizeDcGeneratorControlTypeForE(value?: string) {
  if (!value) return "P";
  const normalized = normalizeControlTypeForE(value);
  return (DC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(normalized) ? normalized : "P";
}

function normalizeDcdcEndpointControlTypeForE(value?: string) {
  if (!value) return "SLACK";
  const normalized = normalizeControlTypeForE(value);
  const map: Record<string, string> = {
    P: "CTRL_P",
    V: "CTRL_V",
    I: "CTRL_I",
    "0": "SLACK"
  };
  const mapped = map[normalized] ?? normalized;
  return (DCDC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(mapped) ? mapped : "SLACK";
}

function normalizeDcacConverterControlTypeForE(params: Record<string, string>) {
  const explicit = normalizeControlTypeForE(params.control_type);
  if ((DCAC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(explicit)) {
    return explicit;
  }
  const dcControl = normalizeControlTypeForE(params.dcControlType);
  if (dcControl === "V") {
    return "DCV";
  }
  const acControl = normalizeControlTypeForE(params.acControlType);
  if (acControl === "PV" || acControl === "V" || acControl === "ACV") {
    return "ACV";
  }
  if (acControl === "PQ" || acControl === "PH" || acControl === "P" || acControl === "ACP") {
    return "ACP";
  }
  return "DCV";
}

function normalizeAcacConverterControlTypeForE(params: Record<string, string>) {
  const explicit = normalizeControlTypeForE(params.control_type);
  if ((ACAC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(explicit)) {
    return explicit;
  }
  const sourceControl = normalizeControlTypeForE(params.sourceControlType);
  const targetControl = normalizeControlTypeForE(params.targetControlType);
  const sourceVoltageControlled = sourceControl === "PV" || sourceControl === "V";
  const targetVoltageControlled = targetControl === "PV" || targetControl === "V";
  if (sourceVoltageControlled && targetVoltageControlled) {
    return "PVV";
  }
  if (sourceVoltageControlled) {
    return "PVQ";
  }
  if (targetVoltageControlled) {
    return "PQV";
  }
  return "PQQ";
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

const E_SECTION_OUTPUT_ORDER = [
  "ACNode",
  "ACRealBs",
  "ACBranch",
  "ACLoad",
  "ACGenerator",
  "ACShuntCompensator",
  "ACZeroBranch",
  "ACSwitch",
  "ACBreak",
  "GroundDisconnector",
  "ACTransformer",
  "ACTransfomer3",
  "DCNode",
  "DCRealBs",
  "DCBranch",
  "DCLoad",
  "DCGenerator",
  "DCZeroBranch",
  "DCSwitch",
  "DCBreak",
  "DCDCConverter",
  "DCACConverter",
  "ACACConverter",
  "HydroSource",
  "HydroLoad",
  "HydroPipe",
  "HydroCompressor",
  "HydroPressRegulator",
  "HydroStopValve",
  "HydroBus",
  "HydroTank",
  "AcE2Hydro",
  "DcE2Hydro",
  "Hydro2AcE",
  "Hydro2DcE",
  "HeatSource",
  "HeatSource2",
  "HeatLoad",
  "HeatLoad2",
  "HeatPipe",
  "HeatStopValve",
  "HeatBus",
  "HeatTank",
  "HeatBoiler",
  "HeatBoiler2",
  "AcElec2Heat",
  "DcElec2Heat",
  "AcElec2Heat2",
  "DcElec2Heat2",
  "HeatExchanger",
  "HeatExchanger3",
  "HeatExchanger4",
  "HeatPump"
];

const E_INTEGER_COLUMNS = new Set([
  "idx",
  "node",
  "i_node",
  "j_node",
  "ac_node",
  "dc_node",
  "node1",
  "node2",
  "node3",
  "node4",
  "isl",
  "status",
  "run_stat",
  "idx_xf_t1",
  "idx_xf_t2",
  "idx_xf_t3"
]);

const E_FLOAT_COLUMNS = new Set([
  "vbase",
  "voltage",
  "angle",
  "pbase",
  "qbase",
  "pv0",
  "pv1",
  "pv2",
  "qv0",
  "qv1",
  "qv2",
  "p_set",
  "q_set",
  "i_set",
  "v_set",
  "alpha",
  "g_set",
  "b_set",
  "r",
  "x",
  "b",
  "gt",
  "bt",
  "tap",
  "shift",
  "r1",
  "r2",
  "p_ac_set",
  "q_ac_set",
  "v_ac_set",
  "v_dc_set",
  "i_q_set",
  "j_q_set",
  "i_v_set",
  "j_v_set"
]);

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
    const section = inferESection(node.kind, node.params);
    if (section === "ACGenerator") {
      return normalizeAcGeneratorControlTypeForE(
        node.params.control_type ?? node.params.controlType ?? node.params.acControlType ?? node.params.sourceControlType ?? ""
      );
    }
    if (section === "DCGenerator") {
      return normalizeDcGeneratorControlTypeForE(
        node.params.control_type ?? node.params.controlType ?? node.params.dcControlType ?? node.params.sourceControlType ?? ""
      );
    }
    if (section === "DCACConverter") {
      return normalizeDcacConverterControlTypeForE(node.params);
    }
    if (section === "ACACConverter") {
      return normalizeAcacConverterControlTypeForE(node.params);
    }
    return normalizeControlTypeForE(
      node.params.control_type ??
        node.params.controlType ??
        node.params.acControlType ??
        node.params.dcControlType ??
        node.params.sourceControlType ??
        ""
    );
  }
  if (key === "i_control_type") {
    return normalizeDcdcEndpointControlTypeForE(node.params.i_control_type || node.params.sourceControlType || node.params.control_type);
  }
  if (key === "j_control_type") {
    return normalizeDcdcEndpointControlTypeForE(node.params.j_control_type || node.params.targetControlType);
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
  const numberedNodeMatch = /^node(\d+)$/.exec(key);
  if (numberedNodeMatch) {
    const index = Number.parseInt(numberedNodeMatch[1], 10) - 1;
    return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, index) : node.params[key] ?? terminalNodeNumber(node, index);
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

function customEParameterKeys(params: Record<string, string>) {
  try {
    const parsed = JSON.parse(params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return Array.from(new Set(parsed
      .map((definition) => String((definition as DeviceParameterDefinition)?.enName ?? "").trim())
      .filter((key) => key && !key.startsWith("_") && key !== "component_type")));
  } catch {
    return [];
  }
}

export function getEParameterKeys(kind: string, params: Record<string, string>) {
  const section = inferESection(kind, params);
  if (!section) {
    return [];
  }
  const builtInColumns = E_SECTION_COLUMNS[section];
  if (builtInColumns) {
    return builtInColumns;
  }
  return customEParameterKeys(params);
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

function isZeroNumericText(value?: string): boolean {
  const normalized = normalizeVoltageBaseInput(value);
  return normalized !== "" && Number(normalized) === 0;
}

function shouldAssignVoltageSetpointDefault(value?: string): boolean {
  return value === undefined || value.trim() === "" || isZeroNumericText(value);
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
      const params = Object.fromEntries(
        E_SECTION_COLUMNS.ACTransformer.map((column) => [
          column,
          associatedNodeColumnValue(node, side.idxKey, "ACTransformer", column, [terminal])
        ])
      );
      records.push({
        id: `${node.id}:w${side.terminalIndex + 1}`,
        kind: "ac-two-winding-transformer",
        section: "ACTransformer",
        params
      });
    }
  }
  return records;
}

function buildACTransfomer3Devices(nodes: ModelNode[]): EDeviceExport[] {
  return nodes
    .filter((node) => isThreeWindingTransformer(node))
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      section: "ACTransfomer3",
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

function buildContainerAssociatedDevices(nodes: ModelNode[]): EDeviceExport[] {
  const records: EDeviceExport[] = [];
  for (const node of nodes) {
    if (!isContainerParams(node.params)) {
      continue;
    }
    const consumed = new Set<string>();
    const entries = Object.keys(node.params)
      .map((fieldName) => {
        const parsed = parseContainerRelationField(fieldName);
        const section = containerRelationCounterKey(fieldName);
        return parsed && section && !isContainerTransformerRelationKey(fieldName)
          ? { ...parsed, fieldName, section }
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((left, right) => left.terminalNumber - right.terminalNumber || left.fieldName.localeCompare(right.fieldName));
    for (const entry of entries) {
      if (consumed.has(entry.fieldName) || !E_SECTION_COLUMNS[entry.section]) {
        continue;
      }
      consumed.add(entry.fieldName);
      const idx = node.params[entry.fieldName] ?? "";
      if (!idx) {
        continue;
      }
      const terminalIndex = entry.terminalNumber - 1;
      const firstTerminal = node.terminals[terminalIndex];
      const secondTerminal = entry.doublePort ? node.terminals[terminalIndex + 1] : undefined;
      const terminals = [firstTerminal, secondTerminal].filter((terminal): terminal is Terminal => Boolean(terminal));
      const params = Object.fromEntries(
        (E_SECTION_COLUMNS[entry.section] ?? []).map((column) => [
          column,
          associatedNodeColumnValue(node, entry.fieldName, entry.section, column, terminals)
        ])
      );
      records.push({
        id: `${node.id}:${entry.fieldName}`,
        kind: `${node.kind}:${entry.fieldName}`,
        section: entry.section,
        params
      });
    }
  }
  return records;
}

function buildEDeviceRecords(project: ProjectFile): EDeviceExport[] {
  const topologyNodes = calculateElectricalTopology(project.nodes, project.edges);
  const topologyNodeDevices = buildTopologyNodeDevices(topologyNodes);
  const acTransfomer3Devices = buildACTransfomer3Devices(topologyNodes);
  const threeWindingTransformerBranchDevices = buildThreeWindingTransformerBranchDevices(topologyNodes);
  const containerAssociatedDevices = buildContainerAssociatedDevices(topologyNodes);
  const deviceRecords = topologyNodes
    .map<EDeviceExport | null>((node) => {
      if (isThreeWindingTransformer(node)) {
        return null;
      }
      const section = inferESection(node.kind, node.params);
      if (!section || section === "ACNode" || section === "DCNode") {
        return null;
      }
      if (getEParameterKeys(node.kind, node.params).length === 0) {
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

  return [
    ...topologyNodeDevices,
    ...deviceRecords,
    ...acTransfomer3Devices,
    ...threeWindingTransformerBranchDevices,
    ...containerAssociatedDevices
  ];
}

export type EExportWarning = {
  nodeId: string;
  nodeName: string;
  kind: string;
  reason: string;
};

export function getEExportWarnings(project: ProjectFile): EExportWarning[] {
  const records = buildEDeviceRecords(project);
  const exportedNodeIds = new Set(records.map((record) => record.id).filter((id) => !id.includes(":")));
  return project.nodes.flatMap((node) => {
    if (isStaticNode(node)) {
      return [];
    }
    if (exportedNodeIds.has(node.id)) {
      return [];
    }
    const section = inferESection(node.kind, node.params);
    if (!section) {
      return [{
        nodeId: node.id,
        nodeName: node.name,
        kind: node.kind,
        reason: isContainerParams(node.params) ? "容器设备没有对应的 E 文件段定义。" : "元件类型没有对应的 E 文件段定义。"
      }];
    }
    if (!E_SECTION_COLUMNS[section] && getEParameterKeys(node.kind, node.params).length === 0) {
      return [{
        nodeId: node.id,
        nodeName: node.name,
        kind: node.kind,
        reason: `E 文件段 ${section} 未定义列。`
      }];
    }
    return [{
      nodeId: node.id,
      nodeName: node.name,
      kind: node.kind,
      reason: `E 文件段 ${section} 被导出逻辑过滤。`
    }];
  });
}

function normalizeEFileToken(value: string) {
  return value.trim().replace(/\s+/g, "_") || "0";
}

function firstNumericToken(value: string) {
  return value.trim().match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? "";
}

function defaultEColumnValue(column: string, rowIndex: number) {
  if (column === "idx") return String(rowIndex + 1);
  if (column === "name") return `unnamed_${rowIndex + 1}`;
  if (column === "run_stat") return "1";
  if (column === "status") return "1";
  if (column === "control_type") return "0";
  if (column === "i_control_type" || column === "j_control_type") return "SLACK";
  if (column === "tap" || column === "alpha" || column === "voltage" || column === "vbase") return "1.0";
  return "0";
}

function defaultContainerAssociatedColumnValue(section: string, column: string, rowIndex = 0) {
  if (section === "ACLoad" || section === "DCLoad") {
    if (column === "pv0" || column === "qv0") return "1.0";
    if (column === "pv1" || column === "pv2" || column === "qv1" || column === "qv2") return "0.0";
  }
  if (section === "ACGenerator" && column === "control_type") return "PV";
  if (section === "DCGenerator" && column === "control_type") return "P";
  return defaultEColumnValue(column, rowIndex);
}

function formatEColumnValue(section: string, column: string, value: string | undefined, rowIndex: number) {
  const fallback = defaultEColumnValue(column, rowIndex);
  const text = String(value ?? "").trim();
  if (!text) {
    return fallback;
  }
  if (column === "name") {
    return normalizeEFileToken(text);
  }
  if (column === "control_type") {
    if (section === "ACGenerator") {
      return normalizeEFileToken(normalizeAcGeneratorControlTypeForE(text));
    }
    if (section === "DCGenerator") {
      return normalizeEFileToken(normalizeDcGeneratorControlTypeForE(text));
    }
    return normalizeEFileToken(normalizeControlTypeForE(text));
  }
  if (column === "i_control_type" || column === "j_control_type") {
    return normalizeEFileToken(normalizeDcdcEndpointControlTypeForE(text));
  }
  if (column === "run_stat") {
    return normalizeRunStatForE(text) || fallback;
  }
  if (column === "status") {
    return normalizeSwitchStatusForE(text) || fallback;
  }
  if (E_INTEGER_COLUMNS.has(column)) {
    return firstNumericToken(text) || fallback;
  }
  if (E_FLOAT_COLUMNS.has(column)) {
    return firstNumericToken(text) || fallback;
  }
  return normalizeEFileToken(text);
}

function eRecordIdxSortValue(record: EDeviceExport): number {
  const value = firstNumericToken(String(record.params.idx ?? ""));
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : Number.POSITIVE_INFINITY;
}

function sortESectionRecordsByIdx(rows: EDeviceExport[]): EDeviceExport[] {
  return rows
    .map((record, order) => ({ record, order }))
    .sort((first, second) => {
      const idxDelta = eRecordIdxSortValue(first.record) - eRecordIdxSortValue(second.record);
      return idxDelta !== 0 ? idxDelta : first.order - second.order;
    })
    .map(({ record }) => record);
}

function eSectionColumns(section: string, rows: EDeviceExport[]) {
  const builtInColumns = E_SECTION_COLUMNS[section];
  if (builtInColumns) {
    return builtInColumns;
  }
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const record of rows) {
    for (const key of Object.keys(record.params)) {
      if (!key || key.startsWith("_") || seen.has(key)) {
        continue;
      }
      seen.add(key);
      columns.push(key);
    }
  }
  return columns;
}

function formatESection(section: string, rows: EDeviceExport[]) {
  const columns = eSectionColumns(section, rows);
  const bodyRows = sortESectionRecordsByIdx(rows)
    .map((record, rowIndex) => `# ${columns.map((column) => formatEColumnValue(section, column, record.params[column], rowIndex)).join(" ")}`)
    .join("\n");
  return `<${section}>\n@ ${columns.join(" ")}\n${bodyRows}\n</${section}>`;
}

function buildPowerBaseSection(project: ProjectFile) {
  const row: EDeviceExport = {
    id: "PowerBase-1",
    kind: "power-base",
    section: "PowerBase",
    params: {
      p_base: String(project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE),
      u_unit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
      p_unit: project.powerUnit ?? DEFAULT_POWER_UNIT,
      i_unit: project.currentUnit ?? DEFAULT_CURRENT_UNIT
    }
  };
  return `<PowerBase>\n@ p_base u_unit p_unit i_unit\n# ${["p_base", "u_unit", "p_unit", "i_unit"].map((column) => formatEColumnValue("PowerBase", column, row.params[column], 0)).join(" ")}\n</PowerBase>`;
}

export function buildEDeviceParameterFile(project: ProjectFile) {
  const records = buildEDeviceRecords(project);
  const recordsBySection = new Map<string, EDeviceExport[]>();
  for (const record of records) {
    const columns = eSectionColumns(record.section, [record]);
    if (columns.length === 0) {
      continue;
    }
    const sectionRecords = recordsBySection.get(record.section) ?? [];
    sectionRecords.push(record);
    recordsBySection.set(record.section, sectionRecords);
  }
  const orderedSections = [
    ...E_SECTION_OUTPUT_ORDER.filter((section) => recordsBySection.has(section)),
    ...Array.from(recordsBySection.keys()).filter((section) => !E_SECTION_OUTPUT_ORDER.includes(section))
  ];
  const sectionBlocks = orderedSections
    .map((section) => formatESection(section, recordsBySection.get(section) ?? []));
  return [buildPowerBaseSection(project), ...sectionBlocks].join("\n\n") + "\n";
}

export type TextFileExport = {
  filename: string;
  text: string;
  mime: string;
};

function safeModelFilePart(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
}

export function buildEFileExport(project: ProjectFile): TextFileExport {
  return {
    filename: `${safeModelFilePart(project.name)}.e`,
    text: buildEDeviceParameterFile(project),
    mime: "text/plain"
  };
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
export type AlignMode = AlignDirection | "left" | "right" | "top" | "bottom";

export type RoutedEdge = {
  edgeId: string;
  points: Point[];
  path: string;
};

export type ConnectionRouteValidationIssueType =
  | "missing-endpoint"
  | "endpoint-mismatch"
  | "non-orthogonal"
  | "endpoint-not-perpendicular"
  | "blocked-by-node"
  | "overlaps-connection"
  | "route-reversal"
  | "out-of-bounds";

export type ConnectionRouteValidationIssue = {
  type: ConnectionRouteValidationIssueType;
  edgeId: string;
  message: string;
  nodeId?: string;
  conflictingEdgeId?: string;
};

export type ConnectionRouteValidationResult = {
  ok: boolean;
  route?: RoutedEdge;
  issues: ConnectionRouteValidationIssue[];
};

export type PreparedConnectionEdgeCommit = ConnectionRouteValidationResult & {
  edge?: Edge;
};

export type TopologyValidationErrorType =
  | "floating-terminal"
  | "terminal-type-mismatch"
  | "same-bus-endpoints"
  | "same-topology-node-endpoints"
  | "voltage-mismatch"
  | "missing-island-voltage"
  | "island-voltage-mismatch"
  | "transformer-island-short"
  | "voltage-setpoint-deviation"
  | "duplicate-device-idx"
  | "duplicate-device-name";

export type TopologyValidationError = {
  id: string;
  type: TopologyValidationErrorType;
  message: string;
  nodeId?: string;
  edgeId?: string;
  relatedNodeIds: string[];
};

export function isBlockingTopologyValidationError(error: Pick<TopologyValidationError, "type">): boolean {
  return (
    error.type === "floating-terminal" ||
    error.type === "terminal-type-mismatch" ||
    error.type === "same-bus-endpoints" ||
    error.type === "same-topology-node-endpoints" ||
    error.type === "voltage-mismatch" ||
    error.type === "missing-island-voltage" ||
    error.type === "island-voltage-mismatch" ||
    error.type === "transformer-island-short"
  );
}

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
    attributeLibrary: "静态图元",
    size: { width: 120, height: 40 },
    params: {
      component_type: "StaticSymbol",
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
    attributeLibrary: "静态图元",
    size: { width: 140, height: 24 },
    params: { component_type: "StaticSymbol", fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-polyline",
    label: "折线",
    attributeLibrary: "静态图元",
    size: { width: 140, height: 70 },
    params: { component_type: "StaticSymbol", fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-circle",
    label: "正圆",
    attributeLibrary: "静态图元",
    size: { width: 72, height: 72 },
    params: { component_type: "StaticSymbol", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-ellipse",
    label: "椭圆",
    attributeLibrary: "静态图元",
    size: { width: 112, height: 70 },
    params: { component_type: "StaticSymbol", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-rect",
    label: "方框",
    attributeLibrary: "静态图元",
    size: { width: 112, height: 70 },
    params: { component_type: "StaticSymbol", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-image",
    label: "图片",
    attributeLibrary: "静态图元",
    size: { width: 140, height: 90 },
    params: { component_type: "StaticSymbol", fillColor: "#ffffff", strokeColor: "transparent", textColor: "#64748b", lineWidth: "0", strokeStyle: "solid", fontSize: "16", backgroundImage: "", backgroundImageAssetId: "" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "ac-source",
    label: "交流电源",
    attributeLibrary: "交流设备",
    size: { width: 84, height: 56 },
    params: { ratedVoltage: "10 kV", frequency: "50 Hz", shortCircuitCapacity: "500 MVA" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-wind-source",
    label: "交流风电",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "35 kV", ratedPower: "50 MW", sourceType: "风电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-pv-source",
    label: "交流光伏",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "10 kV", ratedPower: "20 MW", sourceType: "光伏" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-thermal-source",
    label: "交流火电",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "220 kV", ratedPower: "600 MW", sourceType: "火电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-hydro-source",
    label: "交流水电",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "220 kV", ratedPower: "300 MW", sourceType: "水电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-nuclear-source",
    label: "交流核电",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "500 kV", ratedPower: "1000 MW", sourceType: "核电" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-storage",
    label: "电化学储能",
    attributeLibrary: "交流设备",
    size: { width: 90, height: 56 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", energyCapacity: "20 MWh", stateOfCharge: "50%" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-electrolyzer",
    label: "交流电制氢",
    attributeLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", hydrogenFlow: "1000 Nm3/h" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "h2"],
    terminalLabels: ["交流设备端", "氢能设备端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["ac-load", "h2-source"],
    isContainer: true
  },
  {
    kind: "dc-electrolyzer",
    label: "直流电制氢",
    attributeLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", hydrogenFlow: "1000 Nm3/h" },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "h2"],
    terminalLabels: ["直流设备端", "氢能设备端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["dc-load", "h2-source"],
    isContainer: true
  },
  {
    kind: "hydrogen-source",
    label: "氢源",
    attributeLibrary: "氢能设备",
    size: { width: 84, height: 56 },
    params: { pressure: "20 MPa", hydrogenFlow: "1000 Nm3/h" },
    terminalType: "h2",
    terminalCount: 1
  },
  {
    kind: "hydrogen-tank",
    label: "储氢罐",
    attributeLibrary: "氢能设备",
    size: { width: 126, height: 58 },
    params: { pressure: "35 MPa", capacity: "1000 kg" },
    terminalType: "h2",
    terminalCount: 0
  },
  {
    kind: "hydrogen-load",
    label: "氢荷",
    attributeLibrary: "氢能设备",
    size: { width: 86, height: 58 },
    params: { pressure: "2 MPa", hydrogenDemand: "500 Nm3/h" },
    terminalType: "h2",
    terminalCount: 1
  },
  {
    kind: "ac-fuel-cell",
    label: "交流燃料电池",
    attributeLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "10 kV", ratedPower: "3 MW", hydrogenFlow: "600 Nm3/h" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "h2"],
    terminalLabels: ["交流设备端", "氢能设备端"],
    terminalRoles: ["single-source", "single-load"],
    terminalAssociations: ["ac-generator", "h2-load"],
    isContainer: true
  },
  {
    kind: "dc-fuel-cell",
    label: "直流燃料电池",
    attributeLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "750 V", ratedPower: "3 MW", hydrogenFlow: "600 Nm3/h" },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "h2"],
    terminalLabels: ["直流设备端", "氢能设备端"],
    terminalRoles: ["single-source", "single-load"],
    terminalAssociations: ["dc-generator", "h2-load"],
    isContainer: true
  },
  {
    kind: "hydrogen-bus",
    label: "氢能母线",
    attributeLibrary: "氢能设备",
    size: { width: 120, height: 28 },
    params: { pressure: "20 MPa" },
    terminalType: "h2",
    terminalCount: 0
  },
  {
    kind: "hydrogen-compressor",
    label: "氢压机",
    attributeLibrary: "氢能设备",
    size: { width: 86, height: 58 },
    params: { inletPressure: "2 MPa", outletPressure: "20 MPa" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-pressure-reducer",
    label: "减压阀",
    attributeLibrary: "氢能设备",
    size: { width: 82, height: 54 },
    params: { inletPressure: "20 MPa", outletPressure: "2 MPa" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-shutoff-valve",
    label: "截止阀",
    attributeLibrary: "氢能设备",
    size: { width: 82, height: 54 },
    params: { status: "1" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-pipeline",
    label: "输氢管道",
    attributeLibrary: "氢能设备",
    size: { width: 108, height: 36 },
    params: { length: "1 km", diameter: "DN200" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "heat-boiler",
    label: "供热锅炉",
    attributeLibrary: "热能设备",
    size: { width: 94, height: 60 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC" },
    terminalType: "heat",
    terminalCount: 1,
    terminalTypes: ["heat"],
    terminalLabels: ["热能设备端"],
    terminalRoles: ["single-source"],
    terminalAssociations: ["heat-source"],
    isContainer: true
  },
  {
    kind: "two-port-heat-boiler",
    label: "供热锅炉2",
    attributeLibrary: "热能设备",
    size: { width: 100, height: 64 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备供水端", "热能设备回水端"],
    terminalRoles: ["double-source", "double-source"],
    terminalAssociations: ["heat2-source", ""],
    isContainer: true,
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: 0 }
    ]
  },
  {
    kind: "heat-source",
    label: "单端热源",
    attributeLibrary: "热能设备",
    size: { width: 88, height: 56 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC" },
    terminalType: "heat",
    terminalCount: 1
  },
  {
    kind: "two-port-heat-source",
    label: "双端热源",
    attributeLibrary: "热能设备",
    size: { width: 96, height: 60 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备供水端", "热能设备回水端"]
  },
  {
    kind: "heat-exchanger",
    label: "双端热交换器",
    attributeLibrary: "热能设备",
    size: { width: 96, height: 66 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备一次侧", "热能设备二次侧"]
  },
  {
    kind: "three-port-heat-exchanger",
    label: "三端热交换器",
    attributeLibrary: "热能设备",
    size: { width: 104, height: 72 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 3,
    terminalLabels: ["热能设备单端侧", "热能设备双端侧供水", "热能设备双端侧回水"],
    terminalAnchors: [
      { x: -0.5, y: 0 },
      { x: 0.5, y: -0.25 },
      { x: 0.5, y: 0.25 }
    ]
  },
  {
    kind: "four-port-heat-exchanger",
    label: "四端热交换器",
    attributeLibrary: "热能设备",
    size: { width: 110, height: 76 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 4,
    terminalLabels: ["热能设备一侧供水", "热能设备一侧回水", "热能设备二侧供水", "热能设备二侧回水"],
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
    attributeLibrary: "热能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", heatPower: "4.8 MW" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "heat"],
    terminalLabels: ["交流设备端", "热能设备端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["ac-load", "heat-source"],
    isContainer: true
  },
  {
    kind: "ac-two-port-heater",
    label: "交流电制热2",
    attributeLibrary: "热能设备",
    size: { width: 116, height: 68 },
    params: { ratedVoltage: "10 kV", ratedPower: "5 MW", heatPower: "4.8 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "ac",
    terminalCount: 3,
    terminalTypes: ["ac", "heat", "heat"],
    terminalLabels: ["交流设备端", "热能设备供水端", "热能设备回水端"],
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
    attributeLibrary: "热能设备",
    size: { width: 108, height: 62 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", heatPower: "4.8 MW" },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "heat"],
    terminalLabels: ["直流设备端", "热能设备端"],
    terminalRoles: ["single-load", "single-source"],
    terminalAssociations: ["dc-load", "heat-source"],
    isContainer: true
  },
  {
    kind: "dc-two-port-heater",
    label: "直流电制热2",
    attributeLibrary: "热能设备",
    size: { width: 116, height: 68 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", heatPower: "4.8 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "dc",
    terminalCount: 3,
    terminalTypes: ["dc", "heat", "heat"],
    terminalLabels: ["直流设备端", "热能设备供水端", "热能设备回水端"],
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
    attributeLibrary: "热能设备",
    size: { width: 126, height: 58 },
    params: { capacity: "100 MWh", temperature: "90 degC" },
    terminalType: "heat",
    terminalCount: 0
  },
  {
    kind: "single-port-heat-load",
    label: "单端热荷",
    attributeLibrary: "热能设备",
    size: { width: 86, height: 58 },
    params: { heatDemand: "5 MW" },
    terminalType: "heat",
    terminalCount: 1
  },
  {
    kind: "two-port-heat-load",
    label: "双端热荷",
    attributeLibrary: "热能设备",
    size: { width: 94, height: 60 },
    params: { heatDemand: "5 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备供水端", "热能设备回水端"]
  },
  {
    kind: "heat-bus",
    label: "热力母线",
    attributeLibrary: "热能设备",
    size: { width: 120, height: 28 },
    params: { temperature: "90 degC" },
    terminalType: "heat",
    terminalCount: 0
  },
  {
    kind: "heat-pipeline",
    label: "输热管道",
    attributeLibrary: "热能设备",
    size: { width: 108, height: 36 },
    params: { length: "1 km", diameter: "DN200" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-pump",
    label: "循环水泵",
    attributeLibrary: "热能设备",
    size: { width: 86, height: 58 },
    params: { flowRate: "200 t/h", head: "30 m" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-shutoff-valve",
    label: "截止阀",
    attributeLibrary: "热能设备",
    size: { width: 82, height: 54 },
    params: { status: "1" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "ac-line",
    label: "交流线路",
    attributeLibrary: "交流设备",
    size: { width: 108, height: 36 },
    params: { r: "0.1", x: "1.0", b: "0.0" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-zero-branch",
    label: "交流零阻抗支路",
    attributeLibrary: "交流设备",
    size: { width: 108, height: 36 },
    params: {},
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-bus",
    label: "交流母线",
    attributeLibrary: "交流设备",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "10 kV", section: "I段" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "ac-switch",
    label: "交流开关",
    attributeLibrary: "交流设备",
    size: { width: 72, height: 48 },
    params: { status: "合闸", ratedCurrent: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-ground-disconnector",
    label: "接地刀闸",
    attributeLibrary: "交流设备",
    size: { width: 78, height: 58 },
    params: { status: "分闸", ratedCurrent: "1250 A" },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流系统端"],
    terminalAnchors: [{ x: -0.5, y: 0 }]
  },
  {
    kind: "ac-ground-disconnector-vertical",
    label: "竖向接地刀闸",
    attributeLibrary: "交流设备",
    size: { width: 58, height: 78 },
    params: { status: "分闸", ratedCurrent: "1250 A" },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流系统端"],
    terminalAnchors: [{ x: 0, y: -0.5 }]
  },
  {
    kind: "ac-breaker",
    label: "交流断路器",
    attributeLibrary: "交流设备",
    size: { width: 78, height: 50 },
    params: {},
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-box-breaker",
    label: "盒型开关",
    attributeLibrary: "交流设备",
    size: { width: 86, height: 44 },
    params: { status: "合闸", ratedCurrent: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-load",
    label: "交流负荷",
    attributeLibrary: "交流设备",
    size: { width: 86, height: 58 },
    params: { activePower: "5 MW", reactivePower: "1.2 Mvar", powerFactor: "0.95" },
    terminalType: "ac",
    terminalCount: 1
  },
  {
    kind: "ac-terminal-transformer-load",
    label: "终端变负荷",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 70 },
    params: { activePower: "5 MW", reactivePower: "1.2 Mvar", powerFactor: "0.95" },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流设备端1"],
    terminalAnchors: [{ x: -0.5, y: 0 }]
  },
  {
    kind: "ac-transformer",
    label: "双绕组主变",
    attributeLibrary: "交流设备",
    size: { width: 92, height: 70 },
    params: { ratedCapacity: "50 MVA", voltageRatio: "110/10 kV", impedance: "10.5%" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-three-winding-transformer",
    label: "三绕组主变",
    attributeLibrary: "交流设备",
    size: { width: 104, height: 76 },
    params: { ratedCapacity: "90 MVA", voltageRatio: "220/110/10 kV", windingType: "三绕组", impedance: "12.0%" },
    terminalType: "ac",
    terminalCount: 3,
    terminalAnchors: THREE_WINDING_TRANSFORMER_TERMINAL_ANCHORS,
    isContainer: true,
    parameterDefinitions: threeWindingTransformerParameterDefinitions
  },
  {
    kind: "dc-source",
    label: "直流电源",
    attributeLibrary: "直流设备",
    size: { width: 84, height: 56 },
    params: { ratedVoltage: "750 V", maxCurrent: "2000 A" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-wind-source",
    label: "直流风电",
    attributeLibrary: "直流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "1500 V", ratedPower: "10 MW", sourceType: "风电" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-pv-source",
    label: "直流光伏",
    attributeLibrary: "直流设备",
    size: { width: 92, height: 58 },
    params: { ratedVoltage: "1500 V", ratedPower: "5 MW", sourceType: "光伏" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-storage",
    label: "电化学储能",
    attributeLibrary: "直流设备",
    size: { width: 90, height: 56 },
    params: { ratedVoltage: "750 V", ratedPower: "5 MW", energyCapacity: "20 MWh", stateOfCharge: "50%" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dc-line",
    label: "直流线路",
    attributeLibrary: "直流设备",
    size: { width: 108, height: 36 },
    params: { r: "1.0" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-zero-branch",
    label: "直流零阻抗支路",
    attributeLibrary: "直流设备",
    size: { width: 108, height: 36 },
    params: {},
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-bus",
    label: "直流母线",
    attributeLibrary: "直流设备",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "750 V", pole: "正负极" },
    terminalType: "dc",
    terminalCount: 0
  },
  {
    kind: "dc-switch",
    label: "直流开关",
    attributeLibrary: "直流设备",
    size: { width: 72, height: 48 },
    params: { status: "合闸", ratedCurrent: "1600 A" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-breaker",
    label: "直流断路器",
    attributeLibrary: "直流设备",
    size: { width: 78, height: 50 },
    params: {},
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-load",
    label: "直流负荷",
    attributeLibrary: "直流设备",
    size: { width: 86, height: 58 },
    params: { power: "1.5 MW", voltage: "750 V" },
    terminalType: "dc",
    terminalCount: 1
  },
  {
    kind: "dcdc-converter",
    label: "DCDC变流器",
    attributeLibrary: "直流设备",
    size: { width: 112, height: 66 },
    params: { ratedPower: "5 MW", inputVoltage: "1500 V", outputVoltage: "750 V" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "acdc-converter",
    label: "ACDC变流器",
    attributeLibrary: "直流设备",
    size: { width: 112, height: 66 },
    params: { ratedPower: "10 MW", acVoltage: "10 kV", dcVoltage: "750 V" },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "dc"]
  },
  {
    kind: "acac-converter",
    label: "ACAC变流器",
    attributeLibrary: "交流设备",
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

const DEFAULT_INITIAL_TERMINAL_VBASE = "0";

const defaultTerminalVbase = (_type: TerminalType) => DEFAULT_INITIAL_TERMINAL_VBASE;

function isImplicitTerminalVbaseForType(value: string | undefined, type: TerminalType): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return true;
  }
  if (isZeroNumericText(trimmed)) {
    return true;
  }
  const normalized = terminalVoltageBaseNumber(trimmed);
  if (type === "ac") {
    return normalized === "10";
  }
  if (type === "dc") {
    return normalized === "750";
  }
  return false;
}

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

export const TERMINAL_TYPE_LIBRARY_LABELS: Record<TerminalType, string> = {
  ac: "交流设备",
  dc: "直流设备",
  h2: "氢能设备",
  heat: "热能设备"
};

const terminalTypeLabel = (type: TerminalType) => TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type;

const terminalPortLabel = (type: TerminalType) => {
  return terminalTypeLabel(type);
};

const terminalLabelForType = (type: TerminalType, index: number) => `${terminalTypeLabel(type)}端${index + 1}`;

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
  "h2-source": { terminalType: "h2", energyKey: "h2", deviceRole: "unit", label: "氢源", deviceModel: "HydroSource" },
  "h2-load": { terminalType: "h2", energyKey: "h2", deviceRole: "load", label: "氢荷", deviceModel: "HydroLoad" },
  "heat-source": { terminalType: "heat", energyKey: "heat", deviceRole: "unit", label: "单端热源", deviceModel: "HeatSource" },
  "heat2-source": { terminalType: "heat", energyKey: "heat2", deviceRole: "unit", label: "双端热源", deviceModel: "HeatSource2", doublePort: true },
  "heat-load": { terminalType: "heat", energyKey: "heat", deviceRole: "load", label: "单端热荷", deviceModel: "HeatLoad" },
  "heat2-load": { terminalType: "heat", energyKey: "heat2", deviceRole: "load", label: "双端热荷", deviceModel: "HeatLoad2", doublePort: true }
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
    const terminalLabel = template.terminalLabels?.[index] ?? terminalLabelForType(type, index);
    return {
      terminalIndex: index,
      terminalLabel,
      terminalType: type,
      relationKey,
      relationName: dependent
        ? `随端子${associationSourceIndex + 1}关联${roleLabel}`
        : transformerAssociation
          ? relationDefinition?.cnName ?? `${terminalLabel}${roleLabel}关联idx`
          : `${terminalLabel}${roleLabel}关联idx`,
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

function viewRow(key: string, label: string, value: string, readonly = true, paramKey?: string): ContainerDeviceParameterViewRow {
  return { key, label, value, readonly, paramKey };
}

function associatedNodeColumnValue(
  node: Pick<ModelNode, "name" | "terminals" | "params">,
  relationKey: string,
  section: string,
  column: string,
  terminals: Terminal[]
): string {
  const paramKey = containerRelationParamKey(relationKey, column);
  const transformerSide = THREE_WINDING_TRANSFORMER_SIDES.find((side) => side.idxKey === relationKey);
  if (column === "idx") {
    return node.params[relationKey] ?? "";
  }
  if (column === "name") {
    return relationKey ? containerAssociatedDeviceName(node, relationKey) : node.name;
  }
  if (column === "node") {
    return terminals[0]?.nodeNumber ?? "";
  }
  if (column === "i_node") {
    return terminals[0]?.nodeNumber ?? "";
  }
  if (column === "j_node") {
    return isContainerTransformerRelationKey(relationKey)
      ? node.params.neutral_node ?? ""
      : terminals[1]?.nodeNumber ?? "";
  }
  if (column === "run_stat") {
    return node.params[paramKey] ?? (normalizeRunStatForE(node.params.run_stat) || "1");
  }
  if (transformerSide) {
    const sideValue = node.params[paramKey];
    if (sideValue !== undefined && sideValue !== "") {
      return sideValue;
    }
    if (column === "shift") {
      return "0";
    }
  }
  return node.params[paramKey] ?? defaultContainerAssociatedColumnValue(section, column);
}

function associatedDeviceRows(
  node: Pick<ModelNode, "name" | "terminals" | "params">,
  relationKey: string,
  section: string,
  terminals: Terminal[]
): ContainerDeviceParameterViewRow[] {
  const columns = E_SECTION_COLUMNS[section] ?? [];
  return columns.map((column) => {
    const readonly = column === "idx" || column === "node" || column === "i_node" || column === "j_node";
    const paramKey = readonly ? undefined : containerRelationParamKey(relationKey, column);
    return viewRow(
      column,
      column,
      associatedNodeColumnValue(node, relationKey, section, column, terminals),
      readonly,
      paramKey
    );
  });
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
    attributeLibrary: "",
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
  const containerRows = getTemplateParameterDefinitions(fallbackTemplate).map((definition) => {
    const value = definition.enName === "name"
      ? node.name
      : node.params[definition.enName] ?? definition.typicalValue;
    return viewRow(definition.enName, definition.enName, value, Boolean(definition.readonly), definition.readonly ? undefined : definition.enName);
  });
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
    const componentType = containerRelationCounterKey(first.relationKey) || first.roleLabel;
    const label = `${sourceTerminal?.label ?? first.terminalLabel}${first.roleLabel}`;
    const sectionColumns = E_SECTION_COLUMNS[componentType] ?? [];
    const rows = sectionColumns.length > 0
      ? associatedDeviceRows(node, first.relationKey, componentType, terminals)
      : [
          viewRow("idx", "idx", relationIdx),
          viewRow("name", "name", first.relationKey ? containerAssociatedDeviceName(node, first.relationKey) : `${node.name}_${label}`),
          viewRow("device_model", "device_model", componentType),
          viewRow("relation_fields", "relation_fields", relationKeys.join(", ")),
          viewRow("terminals", "terminals", terminals.map((terminal) => terminal.label).join(", ")),
          viewRow("energy", "energy", uniqueNonEmpty(terminals.map((terminal) => terminal.type.toUpperCase())).join(" / "))
        ];
    if (sectionColumns.length === 0) {
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
    }
    return {
      id: `associated-${sourceTerminalIndex + 1}`,
      label,
      kind: "associated",
      componentType,
      relationKeys,
      terminalIndexes,
      terminalLabels: terminals.map((terminal) => terminal.label).join(", "),
      rows
    };
  });
  return [
    {
      id: "container",
      label: "容器本体",
      kind: "container",
      rows: containerRows
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
        cnName: `${terminalLabelForType(relationType, index)}${associationLabel}关联idx`,
        enName: hasExplicitAssociations ? getContainerAssociationRelationKey(association, index) : getContainerRelationKey(relationType, role, index),
        valueType: "integer",
        typicalValue: "",
        readonly: true
      });
    }
    return [
      ...baseDefinitions,
      ...relationDefinitions
    ];
  }
  const nodeDefinitions = terminalTypes.map<DeviceParameterDefinition>((type, index) => {
    const enName = terminalTypes.length === 1 ? "node" : `t${index + 1}_node`;
    return {
      cnName: `${terminalLabelForType(type, index)}节点号`,
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
  if (kind === "ac-electrolyzer") return "ac-hydrogen-electrolyzer";
  if (kind === "dc-electrolyzer") return "dc-hydrogen-electrolyzer";
  if (kind === "hydrogen-source") return "hydrogen-source";
  if (kind === "hydrogen-tank") return "hydrogen-storage";
  if (kind === "hydrogen-load") return "hydrogen-load";
  if (kind === "ac-fuel-cell") return "ac-hydrogen-fuel-cell";
  if (kind === "dc-fuel-cell") return "dc-hydrogen-fuel-cell";
  if (kind === "hydrogen-bus") return "hydrogen-bus";
  if (kind === "hydrogen-compressor") return "hydrogen-compressor";
  if (kind === "hydrogen-pressure-reducer") return "hydrogen-regulator";
  if (kind === "hydrogen-shutoff-valve") return "hydrogen-valve";
  if (kind === "hydrogen-pipeline") return "hydrogen-pipeline";
  if (kind === "heat-boiler") return "single-heat-boiler";
  if (kind === "two-port-heat-boiler") return "two-port-heat-boiler";
  if (kind === "heat-source") return "single-heat-source";
  if (kind === "two-port-heat-source") return "two-port-heat-source";
  if (kind === "heat-exchanger") return "heat-exchanger-two";
  if (kind === "three-port-heat-exchanger") return "heat-exchanger-three";
  if (kind === "four-port-heat-exchanger") return "heat-exchanger-four";
  if (kind === "ac-heater") return "ac-heat-electric-heater";
  if (kind === "ac-two-port-heater") return "ac-two-port-heat-electric-heater";
  if (kind === "dc-heater") return "dc-heat-electric-heater";
  if (kind === "dc-two-port-heater") return "dc-two-port-heat-electric-heater";
  if (kind === "thermal-storage-tank") return "heat-storage";
  if (kind === "single-port-heat-load") return "single-heat-load";
  if (kind === "two-port-heat-load") return "two-port-heat-load";
  if (kind === "heat-load") return "heat-load";
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
  if (kind === "ac-terminal-transformer-load") return "terminal-transformer-load";
  if (kind.includes("transformer")) return "transformer";
  if (kind === "ac-ground-disconnector-vertical") return "ground-disconnector-vertical";
  if (kind === "ac-ground-disconnector") return "ground-disconnector";
  if (kind.includes("switch")) return "switch";
  if (kind.includes("disconnector")) return "disconnector";
  if (kind === "ac-box-breaker") return "box-breaker";
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

export type ColorDisplayMode = "energy" | "voltage";

export type ColorPalette = {
  energy: Record<TerminalType, string>;
  voltage: Record<string, string>;
};

export const VOLTAGE_LEVEL_COLORS: Record<string, string> = {
  "0": "#64748b",
  "0.4": "#22c55e",
  "6": "#0ea5e9",
  "10": "#f97316",
  "10.5": "#f97316",
  "35": "#a855f7",
  "66": "#6366f1",
  "110": "#ef4444",
  "220": "#b91c1c",
  "330": "#7f1d1d",
  "500": "#dc2626",
  "750": "#0891b2",
  "800": "#0e7490"
};

function buildDefaultVoltagePalette(): Record<string, string> {
  const typedEntries = Object.entries(VOLTAGE_LEVEL_COLORS).flatMap(([voltage, color]) => [
    [`ac:${voltage}`, color],
    [`dc:${voltage}`, color]
  ]);
  return {
    ...VOLTAGE_LEVEL_COLORS,
    ...Object.fromEntries(typedEntries)
  };
}

export const DEFAULT_COLOR_PALETTE: ColorPalette = {
  energy: { ...TERMINAL_TYPE_COLORS },
  voltage: buildDefaultVoltagePalette()
};

function normalizeColorRecord(source: unknown, fallback: Record<string, string>): Record<string, string> {
  if (!source || typeof source !== "object") {
    return { ...fallback };
  }
  return Object.entries(source as Record<string, unknown>).reduce<Record<string, string>>((result, [key, value]) => {
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
    return result;
  }, { ...fallback });
}

export function normalizeColorPalette(value?: Partial<ColorPalette> | null): ColorPalette {
  return {
    energy: normalizeColorRecord(value?.energy, DEFAULT_COLOR_PALETTE.energy) as Record<TerminalType, string>,
    voltage: normalizeColorRecord(value?.voltage, DEFAULT_COLOR_PALETTE.voltage)
  };
}

export function terminalTypeColor(type?: TerminalType, palette: ColorPalette = DEFAULT_COLOR_PALETTE): string {
  return type ? palette.energy[type] ?? DEFAULT_COLOR_PALETTE.energy[type] : palette.energy.ac ?? DEFAULT_COLOR_PALETTE.energy.ac;
}

export const DEFAULT_CONNECTION_STROKE_COLOR = "#334155";

function voltageColorFallback(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return `hsl(${hash} 72% 42%)`;
}

function voltageColorKey(value?: string): string {
  return terminalVoltageBaseNumber(value) || "0";
}

export function voltageLevelColor(value?: string, type?: TerminalType, palette: ColorPalette = DEFAULT_COLOR_PALETTE): string {
  const key = voltageColorKey(value);
  if (isElectricColorType(type)) {
    const typedKey = `${type}:${key}`;
    return palette.voltage[typedKey] ?? palette.voltage[key] ?? DEFAULT_COLOR_PALETTE.voltage[typedKey] ?? DEFAULT_COLOR_PALETTE.voltage[key] ?? voltageColorFallback(typedKey);
  }
  return palette.voltage[key] ?? DEFAULT_COLOR_PALETTE.voltage[key] ?? voltageColorFallback(key);
}

function isElectricColorType(type?: TerminalType): type is "ac" | "dc" {
  return type === "ac" || type === "dc";
}

function findDisplayTerminal(
  node: Pick<ModelNode, "kind" | "terminals" | "params"> | undefined,
  terminalId?: string
): Terminal | undefined {
  if (!node) {
    return undefined;
  }
  return node.terminals.find((terminal) => terminal.id === terminalId) ?? node.terminals[0] ?? virtualBusTerminal(node, terminalId);
}

function terminalVoltageDisplayForColor(node: Pick<ModelNode, "params">, terminal?: Pick<Terminal, "vbase">): string {
  return terminalVoltageBaseNumber(firstText([
    terminal?.vbase,
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

export function getTerminalDisplayColor(
  node: Pick<ModelNode, "kind" | "terminals" | "params">,
  terminal: Pick<Terminal, "type" | "vbase">,
  mode: ColorDisplayMode = "energy",
  palette: ColorPalette = DEFAULT_COLOR_PALETTE
): string {
  return mode === "voltage" && isElectricColorType(terminal.type)
    ? voltageLevelColor(terminalVoltageDisplayForColor(node, terminal), terminal.type, palette)
    : terminalTypeColor(terminal.type, palette);
}

function findTerminalType(node: Pick<ModelNode, "kind" | "terminals" | "params"> | undefined, terminalId?: string): TerminalType | undefined {
  return findDisplayTerminal(node, terminalId)?.type;
}

export function getConnectionStrokeColor(
  edge: Pick<Edge, "id" | "sourceId" | "targetId" | "sourceTerminalId" | "targetTerminalId">,
  nodeById: ReadonlyMap<string, Pick<ModelNode, "kind" | "terminals" | "params">>,
  mode: ColorDisplayMode = "energy",
  palette: ColorPalette = DEFAULT_COLOR_PALETTE
): string {
  const sourceNode = nodeById.get(edge.sourceId);
  const targetNode = nodeById.get(edge.targetId);
  const sourceTerminal = findDisplayTerminal(sourceNode, edge.sourceTerminalId);
  const targetTerminal = findDisplayTerminal(targetNode, edge.targetTerminalId);
  const type = sourceTerminal?.type ?? targetTerminal?.type;
  if (!type) {
    return DEFAULT_CONNECTION_STROKE_COLOR;
  }
  if (mode === "voltage" && isElectricColorType(type)) {
    const sourceVoltage = sourceNode && sourceTerminal?.type === type ? terminalVoltageDisplayForColor(sourceNode, sourceTerminal) : "";
    const targetVoltage = targetNode && targetTerminal?.type === type ? terminalVoltageDisplayForColor(targetNode, targetTerminal) : "";
    return voltageLevelColor(sourceVoltage && sourceVoltage !== "0" ? sourceVoltage : targetVoltage, type, palette);
  }
  return terminalTypeColor(type, palette);
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

export function getDeviceStrokeColor(node: Pick<ModelNode, "kind" | "terminals" | "params">, mode: ColorDisplayMode = "energy", palette: ColorPalette = DEFAULT_COLOR_PALETTE): string {
  const primaryTerminal = node.terminals.find((terminal) => isElectricColorType(terminal.type)) ?? node.terminals[0] ?? virtualBusTerminal(node);
  return node.params.foregroundColor || (
    isHydrogenVisualKind(node.kind)
      ? terminalTypeColor("h2", palette)
      : isThermalVisualKind(node.kind)
        ? terminalTypeColor("heat", palette)
        : primaryTerminal
          ? getTerminalDisplayColor(node, primaryTerminal, mode, palette)
          : terminalTypeColor(undefined, palette)
  );
}

const DEVICE_STROKE_WIDTH_BY_VARIANT: Partial<Record<DeviceGlyphVariant, number>> = {
  "wind-source": 2.4,
  "pv-source": 2.2,
  "thermal-source": 2.3,
  "nuclear-source": 2.2,
  "battery-storage": 2.4,
  "hydrogen-electrolyzer": 2.3,
  "ac-hydrogen-electrolyzer": 2.3,
  "dc-hydrogen-electrolyzer": 2.3,
  "hydrogen-fuel-cell": 2.3,
  "ac-hydrogen-fuel-cell": 2.3,
  "dc-hydrogen-fuel-cell": 2.3,
  "hydrogen-storage": 2.4,
  "hydrogen-compressor": 2.4,
  "hydrogen-regulator": 2.4,
  "hydrogen-valve": 2.4,
  "hydrogen-pipeline": 2.8,
  "heat-boiler": 2.4,
  "single-heat-boiler": 2.4,
  "two-port-heat-boiler": 2.4,
  "heat-source": 2.4,
  "single-heat-source": 2.4,
  "two-port-heat-source": 2.4,
  "heat-electric-heater": 2.3,
  "ac-heat-electric-heater": 2.3,
  "ac-two-port-heat-electric-heater": 2.3,
  "dc-heat-electric-heater": 2.3,
  "dc-two-port-heat-electric-heater": 2.3,
  "heat-exchanger-two": 2.4,
  "heat-exchanger-three": 2.4,
  "heat-exchanger-four": 2.4,
  "heat-storage": 2.4,
  "heat-load": 2.4,
  "single-heat-load": 2.4,
  "two-port-heat-load": 2.4,
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
  i_control_type: "enum",
  j_control_type: "enum",
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
  if (!enName || enName === "is_container") {
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
    const extraKeys = Object.keys(template.params).filter((key) => key && key !== "is_container" && !key.startsWith("_") && !defaultKeys.has(key));
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
    if (!enName || enName === "name" || enName === "is_container") {
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
    if (definition.enName === "name" || definition.enName === "is_container") {
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
  if (template.kind === "ac-load" || template.kind === "ac-terminal-transformer-load") {
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
        r: "1.0"
      })));
    }
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      r: "0.1",
      x: "1.0",
      b: "0.0"
    })));
  }
  if (template.kind === "ac-two-winding-transformer" || template.kind === "ac-transformer") {
    return withTemplateDefinitions(withRunStat({
      highVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      lowVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
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
      highVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      mediumVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      lowVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
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
      sourceVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      targetVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      i_control_type: "CTRL_P",
      j_control_type: "SLACK"
    }));
  }
  if (template.kind === "acdc-converter") {
    return withTemplateDefinitions(withRunStat({
      sourceVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      targetVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      control_type: "DCV",
      v_ac_set: "0.0",
      v_dc_set: "0.0",
      acControlType: "定PQ",
      dcControlType: "不定"
    }));
  }
  if (template.kind === "acac-converter") {
    return withTemplateDefinitions(withRunStat({
      sourceVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      targetVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      control_type: "PQQ",
      sourceControlType: "定PQ",
      targetControlType: "不定"
    }));
  }
  if (
    template.kind === "ac-switch" ||
    template.kind === "dc-switch" ||
    template.kind === "ac-disconnector" ||
    template.kind === "dc-disconnector" ||
    template.kind === "ac-ground-disconnector" ||
    template.kind === "ac-ground-disconnector-vertical" ||
    template.kind === "ac-breaker" ||
    template.kind === "ac-box-breaker" ||
    template.kind === "dc-breaker"
  ) {
    const isGroundDisconnector = template.kind === "ac-ground-disconnector" || template.kind === "ac-ground-disconnector-vertical";
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ratedCapacity: template.terminalType === "ac" ? "1250 A" : "1600 A",
      status: isGroundDisconnector ? "0" : "1",
      closedStatus: isGroundDisconnector ? "分闸" : "闭合"
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
    layerId: DEFAULT_MODEL_LAYER_ID,
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

export function normalizeScaleValue(value: number, fallback = 1) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeMirrorRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export function mirrorNodes(nodes: ModelNode[], nodeIds: string[], axis: "horizontal" | "vertical"): ModelNode[] {
  const selected = new Set(nodeIds);
  return nodes.map((node) => {
    if (!selected.has(node.id)) {
      return node;
    }
    if (axis === "horizontal") {
      return { ...node, rotation: normalizeMirrorRotationDegrees(-node.rotation), scaleX: -getNodeScaleX(node) };
    }
    return { ...node, rotation: normalizeMirrorRotationDegrees(-node.rotation), scaleY: -getNodeScaleY(node) };
  });
}

export function clampPointToBounds(point: Point, bounds: CanvasBounds): Point {
  return {
    x: Math.round(Math.max(0, Math.min(bounds.width, point.x))),
    y: Math.round(Math.max(0, Math.min(bounds.height, point.y)))
  };
}

export function clampEdgeGeometryToBounds(edge: Edge, bounds: CanvasBounds): Edge {
  let changed = false;
  const clampOptionalPoint = (point?: Point) => {
    if (!point) {
      return undefined;
    }
    const clamped = clampPointToBounds(point, bounds);
    if (clamped.x !== point.x || clamped.y !== point.y) {
      changed = true;
    }
    return clamped;
  };
  const sourcePoint = clampOptionalPoint(edge.sourcePoint);
  const targetPoint = clampOptionalPoint(edge.targetPoint);
  const manualPoints = edge.manualPoints?.map(clampOptionalPoint).filter((point): point is Point => Boolean(point));
  if (manualPoints && (!edge.manualPoints || manualPoints.some((point, index) => point.x !== edge.manualPoints?.[index]?.x || point.y !== edge.manualPoints?.[index]?.y))) {
    changed = true;
  }
  return changed ? { ...edge, sourcePoint, targetPoint, manualPoints } : edge;
}

export function clampNodePositionToBounds(node: ModelNode, bounds: CanvasBounds, position = node.position): Point {
  const extents = visualHalfExtentsForNode(node);
  const halfWidth = Math.min(bounds.width / 2, extents.halfWidth);
  const halfHeight = Math.min(bounds.height / 2, extents.halfHeight);
  return {
    x: Math.round(Math.max(halfWidth, Math.min(bounds.width - halfWidth, position.x))),
    y: Math.round(Math.max(halfHeight, Math.min(bounds.height - halfHeight, position.y)))
  };
}

export type GeometryBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function calculateModelGeometryBounds(
  nodes: ModelNode[],
  routedEdges: Pick<RoutedEdge, "points">[] = [],
  padding = 0
): GeometryBounds | null {
  const boxes: GeometryBounds[] = [];
  for (const node of nodes) {
    boxes.push(boxFor(node, padding));
  }
  for (const route of routedEdges) {
    if (route.points.length === 0) {
      continue;
    }
    boxes.push({
      left: Math.min(...route.points.map((point) => point.x)) - padding,
      right: Math.max(...route.points.map((point) => point.x)) + padding,
      top: Math.min(...route.points.map((point) => point.y)) - padding,
      bottom: Math.max(...route.points.map((point) => point.y)) + padding
    });
  }
  if (boxes.length === 0) {
    return null;
  }
  return {
    left: Math.min(...boxes.map((box) => box.left)),
    right: Math.max(...boxes.map((box) => box.right)),
    top: Math.min(...boxes.map((box) => box.top)),
    bottom: Math.max(...boxes.map((box) => box.bottom))
  };
}

export function geometryBoundsInsideCanvas(bounds: GeometryBounds | null, canvasBounds: CanvasBounds, margin = 0): boolean {
  if (!bounds) {
    return true;
  }
  return (
    bounds.left >= margin &&
    bounds.top >= margin &&
    bounds.right <= canvasBounds.width - margin &&
    bounds.bottom <= canvasBounds.height - margin
  );
}

export function modelGeometryInsideCanvasBounds(
  nodes: ModelNode[],
  routedEdges: Pick<RoutedEdge, "points">[],
  canvasBounds: CanvasBounds,
  margin = 0
): boolean {
  return geometryBoundsInsideCanvas(calculateModelGeometryBounds(nodes, routedEdges), canvasBounds, margin);
}

export function normalizeViewBoxToCanvas(box: ViewBox, bounds: CanvasBounds): ViewBox {
  const minX = -box.width / 2;
  const maxX = bounds.width - box.width / 2;
  const minY = -box.height / 2;
  const maxY = bounds.height - box.height / 2;
  return {
    ...box,
    x: Math.max(minX, Math.min(maxX, box.x)),
    y: Math.max(minY, Math.min(maxY, box.y))
  };
}

function viewBoxScaleRatio(viewBox: ViewBox, bounds: CanvasBounds): number {
  if (viewBox.width <= 0 || viewBox.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return 1;
  }
  const widthRatio = viewBox.width / bounds.width;
  const heightRatio = viewBox.height / bounds.height;
  return Math.sqrt(widthRatio * heightRatio);
}

export function keyboardMoveStepForViewBox(viewBox: ViewBox, bounds: CanvasBounds, baseStep = 6): number {
  const safeBase = Math.max(1, Math.abs(baseStep));
  const zoomRatio = viewBoxScaleRatio(viewBox, bounds);
  return Math.max(1, Math.round(safeBase * zoomRatio));
}

export function viewBoxZoomPercent(viewBox: ViewBox, bounds: CanvasBounds): number {
  const zoomRatio = viewBoxScaleRatio(viewBox, bounds);
  return Math.max(1, Math.round(100 / zoomRatio));
}

export function clampViewBoxDimensionsForZoom(
  size: Pick<ViewBox, "width" | "height">,
  bounds: CanvasBounds,
  minZoomPercent = 5,
  maxZoomPercent = 2000
): Pick<ViewBox, "width" | "height"> {
  const safeMinZoom = Math.max(1, minZoomPercent);
  const safeMaxZoom = Math.max(safeMinZoom, maxZoomPercent);
  const minRatio = 100 / safeMaxZoom;
  const maxRatio = 100 / safeMinZoom;
  return {
    width: Math.max(bounds.width * minRatio, Math.min(bounds.width * maxRatio, size.width)),
    height: Math.max(bounds.height * minRatio, Math.min(bounds.height * maxRatio, size.height))
  };
}

export function createTerminals(type: TerminalType, count: number): Terminal[] {
  if (count <= 0) {
    return [];
  }
  const safeCount = Math.max(1, Math.min(8, Math.round(count)));
  if (safeCount === 1) {
    return [{ id: "t1", label: terminalLabelForType(type, 0), type, anchor: { x: 0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) }];
  }
  if (safeCount === 2) {
    return [
      { id: "t1", label: terminalLabelForType(type, 0), type, anchor: { x: -0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) },
      { id: "t2", label: terminalLabelForType(type, 1), type, anchor: { x: 0.5, y: 0 }, nodeNumber: makeNodeNumber(), vbase: defaultTerminalVbase(type) }
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
    label: terminalLabelForType(type, index),
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
    label: template.terminalLabels?.[index] ?? terminalLabelForType(type, index),
    anchor: template.terminalAnchors?.[index] ?? anchors[index].anchor,
    type,
    vbase: defaultTerminalVbase(type)
  }));
}

const BUS_TERMINAL_TYPE_BY_KIND: Partial<Record<string, TerminalType>> = {
  "ac-bus": "ac",
  "dc-bus": "dc",
  "hydrogen-bus": "h2",
  "hydrogen-tank": "h2",
  "heat-bus": "heat",
  "thermal-storage-tank": "heat"
};

const BUS_LEGACY_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: 0 },
  { x: 0.5, y: 0 },
  { x: 0, y: -0.5 },
  { x: 0, y: 0.5 },
  { x: -0.5, y: -0.25 },
  { x: 0.5, y: -0.25 },
  { x: -0.5, y: 0.25 },
  { x: 0.5, y: 0.25 }
];

function busTerminalAnchor(index: number): Point {
  return BUS_LEGACY_TERMINAL_ANCHORS[index] ?? { x: 0, y: 0 };
}

export function getBusTerminalType(node: Pick<ModelNode, "kind" | "terminals">): TerminalType | undefined {
  return node.terminals[0]?.type ?? BUS_TERMINAL_TYPE_BY_KIND[node.kind];
}

function virtualBusTerminal(node: Pick<ModelNode, "kind" | "terminals">, terminalId?: string): Terminal | undefined {
  const type = getBusTerminalType(node);
  if (!type) {
    return undefined;
  }
  const index = Math.max(1, Number.parseInt(terminalId?.replace(/^t/, "") ?? "1", 10) || 1);
  return {
    id: terminalId || `t${index}`,
    label: terminalLabelForType(type, index - 1),
    type,
    anchor: busTerminalAnchor(index - 1),
    nodeNumber: "0",
    vbase: defaultTerminalVbase(type)
  };
}

export function normalizeNodeTerminalsByTemplate(node: ModelNode): ModelNode {
  const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind);
  if (!template || node.terminals.length === 0) {
    return node;
  }
  let changed = false;
  const expectedTypes = templateTerminalTypes(template);
  const terminals = node.terminals.map((terminal, index) => {
    const expectedType = expectedTypes[index];
    const expectedLabel = template.terminalLabels?.[index] ?? (expectedType ? terminalLabelForType(expectedType, index) : undefined);
    const expectedAnchor = template.terminalAnchors?.[index];
    let nextTerminal = terminal;
    if (expectedType && terminal.type !== expectedType) {
      changed = true;
      const shouldResetVbase = isImplicitTerminalVbaseForType(terminal.vbase, terminal.type);
      nextTerminal = {
        ...nextTerminal,
        type: expectedType,
        vbase: shouldResetVbase
          ? defaultTerminalVbase(expectedType)
          : terminal.vbase
      };
    }
    if (expectedLabel && nextTerminal.label !== expectedLabel) {
      changed = true;
      nextTerminal = {
        ...nextTerminal,
        label: expectedLabel
      };
    }
    if (expectedAnchor && !samePoint(nextTerminal.anchor, expectedAnchor)) {
      changed = true;
      nextTerminal = {
        ...nextTerminal,
        anchor: { ...expectedAnchor }
      };
    }
    return nextTerminal;
  });
  return changed ? { ...node, terminals } : node;
}

export function terminalStubSegment(
  terminal: Pick<Terminal, "anchor">,
  scaleX = 1,
  scaleY = 1,
  length = 24,
  nodeKind?: DeviceKind
): { from: Point; to: Point } {
  const displayedAnchor = {
    x: terminal.anchor.x * (Math.sign(scaleX) || 1),
    y: terminal.anchor.y * (Math.sign(scaleY) || 1)
  };
  if (Math.abs(displayedAnchor.x) >= Math.abs(displayedAnchor.y)) {
    const scaledLength = length * Math.abs(scaleX || 1) + terminalOutwardOffsetLength(terminal, nodeKind);
    return {
      from: { x: displayedAnchor.x >= 0 ? -scaledLength : scaledLength, y: 0 },
      to: { x: 0, y: 0 }
    };
  }
  const scaledLength = length * Math.abs(scaleY || 1) + terminalOutwardOffsetLength(terminal, nodeKind);
  return {
    from: { x: 0, y: displayedAnchor.y >= 0 ? -scaledLength : scaledLength },
    to: { x: 0, y: 0 }
  };
}

const TERMINAL_OUTWARD_OFFSET = 4;
const CLOSE_BORDER_TERMINAL_OUTWARD_OFFSET = 12;
const CONVERTER_TERMINAL_OUTWARD_OFFSET = 12;
const CONVERTER_TERMINAL_KINDS = new Set<DeviceKind>(["dcdc-converter", "acdc-converter", "acac-converter"]);
const CLOSE_BORDER_TERMINAL_KINDS = new Set<DeviceKind>([
  "ac-electrolyzer",
  "dc-electrolyzer",
  "ac-fuel-cell",
  "dc-fuel-cell",
  "ac-heater",
  "dc-heater",
  "ac-two-port-heater",
  "dc-two-port-heater"
]);

function terminalOutwardAxis(terminal: Pick<Terminal, "anchor">): "x" | "y" | null {
  const absX = Math.abs(terminal.anchor.x);
  const absY = Math.abs(terminal.anchor.y);
  if (absX >= 0.499 && absX >= absY) {
    return "x";
  }
  if (absY >= 0.499) {
    return "y";
  }
  return null;
}

function terminalOutwardOffsetLength(terminal: Pick<Terminal, "anchor">, nodeKind?: DeviceKind): number {
  if (!terminalOutwardAxis(terminal)) {
    return 0;
  }
  if (nodeKind && CONVERTER_TERMINAL_KINDS.has(nodeKind)) {
    return CONVERTER_TERMINAL_OUTWARD_OFFSET;
  }
  if (nodeKind && CLOSE_BORDER_TERMINAL_KINDS.has(nodeKind)) {
    return CLOSE_BORDER_TERMINAL_OUTWARD_OFFSET;
  }
  return TERMINAL_OUTWARD_OFFSET;
}

export function terminalRenderLocalPoint(
  terminal: Pick<Terminal, "anchor">,
  size: Pick<ModelNode["size"], "width" | "height">,
  scaleX = 1,
  scaleY = 1,
  nodeKind?: DeviceKind
): Point {
  const axis = terminalOutwardAxis(terminal);
  const outwardOffset = terminalOutwardOffsetLength(terminal, nodeKind);
  const safeScaleX = Math.abs(scaleX || 1);
  const safeScaleY = Math.abs(scaleY || 1);
  return {
    x: terminal.anchor.x * size.width + (axis === "x" ? Math.sign(terminal.anchor.x || 1) * (outwardOffset / safeScaleX) : 0),
    y: terminal.anchor.y * size.height + (axis === "y" ? Math.sign(terminal.anchor.y || 1) * (outwardOffset / safeScaleY) : 0)
  };
}

export function terminalStubStrokeWidth(node: ModelNode, terminal: Pick<Terminal, "anchor">): number {
  const scaleX = Math.abs(getNodeScaleX(node) || 1);
  const scaleY = Math.abs(getNodeScaleY(node) || 1);
  const displayedAnchor = {
    x: terminal.anchor.x * (Math.sign(getNodeScaleX(node)) || 1),
    y: terminal.anchor.y * (Math.sign(getNodeScaleY(node)) || 1)
  };
  const crossAxisScale = Math.abs(displayedAnchor.x) >= Math.abs(displayedAnchor.y) ? scaleY : scaleX;
  return getDeviceStrokeWidth(node) * crossAxisScale;
}

export function getTerminal(node: ModelNode, terminalId?: string): Terminal {
  return node.terminals.find((terminal) => terminal.id === terminalId) ?? node.terminals[0] ?? virtualBusTerminal(node, terminalId) ?? node.terminals[0];
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
  const outwardOffset = !isBusNode(node) ? terminalOutwardOffsetLength(terminal, node.kind) : 0;
  const normal = outwardOffset > 0 ? getTerminalNormal(node, terminal.id) : { x: 0, y: 0 };
  return {
    x: Math.round(node.position.x + local.x * cos - local.y * sin + normal.x * outwardOffset),
    y: Math.round(node.position.y + local.x * sin + local.y * cos + normal.y * outwardOffset)
  };
}

function terminalRefKey(nodeId: string, terminalId: string): string {
  return `${nodeId}:${terminalId}`;
}

function terminalPairKey(first: Pick<OverlappingTerminalRef, "nodeId" | "terminalId">, second: Pick<OverlappingTerminalRef, "nodeId" | "terminalId">): string {
  const refs = [terminalRefKey(first.nodeId, first.terminalId), terminalRefKey(second.nodeId, second.terminalId)].sort();
  return `${refs[0]}|${refs[1]}`;
}

export function getOverlappingTerminalGroups(nodes: ModelNode[], affectedNodeIds?: ReadonlySet<string>): OverlappingTerminalGroup[] {
  if (affectedNodeIds && affectedNodeIds.size === 0) {
    return [];
  }
  if (affectedNodeIds) {
    const affectedKeys = new Set<string>();
    const groups = new Map<string, OverlappingTerminalGroup>();
    for (const node of nodes) {
      if (!affectedNodeIds.has(node.id) || isBusNode(node) || isStaticNode(node)) {
        continue;
      }
      for (const terminal of node.terminals) {
        const point = getTerminalPoint(node, terminal.id);
        const key = `${terminal.type}:${point.x}:${point.y}`;
        affectedKeys.add(key);
        const group = groups.get(key) ?? { key, type: terminal.type, point, terminals: [] };
        group.terminals.push({ nodeId: node.id, terminalId: terminal.id, type: terminal.type, point });
        groups.set(key, group);
      }
    }
    if (affectedKeys.size === 0) {
      return [];
    }
    for (const node of nodes) {
      if (affectedNodeIds.has(node.id) || isBusNode(node) || isStaticNode(node)) {
        continue;
      }
      for (const terminal of node.terminals) {
        const point = getTerminalPoint(node, terminal.id);
        const key = `${terminal.type}:${point.x}:${point.y}`;
        if (!affectedKeys.has(key)) {
          continue;
        }
        const group = groups.get(key) ?? { key, type: terminal.type, point, terminals: [] };
        group.terminals.push({ nodeId: node.id, terminalId: terminal.id, type: terminal.type, point });
        groups.set(key, group);
      }
    }
    return Array.from(groups.values()).filter((group) => group.terminals.length > 1);
  }
  const groups = new Map<string, OverlappingTerminalGroup>();
  for (const node of nodes) {
    if (isBusNode(node) || isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      const point = getTerminalPoint(node, terminal.id);
      const key = `${terminal.type}:${point.x}:${point.y}`;
      const group = groups.get(key) ?? { key, type: terminal.type, point, terminals: [] };
      group.terminals.push({ nodeId: node.id, terminalId: terminal.id, type: terminal.type, point });
      groups.set(key, group);
    }
  }
  return Array.from(groups.values()).filter((group) => group.terminals.length > 1);
}

function terminalPointOnBus(bus: ModelNode, point: Point, tolerance = 0): Point | null {
  if (!isBusNode(bus)) {
    return null;
  }
  if (isBoundaryBusNode(bus)) {
    const projected = projectPointToNodeBoundary(bus, point);
    return Math.hypot(projected.x - point.x, projected.y - point.y) <= tolerance ? projected : null;
  }
  const local = pointToNodeLocal(bus, point);
  const halfWidth = (bus.size.width * Math.abs(getNodeScaleX(bus))) / 2;
  const halfHeight = Math.max(4, (bus.size.height * Math.abs(getNodeScaleY(bus))) / 2);
  if (local.x < -halfWidth - tolerance || local.x > halfWidth + tolerance || Math.abs(local.y) > halfHeight + tolerance) {
    return null;
  }
  return projectPointToBusCenterline(bus, point);
}

export function getTerminalBusContactGroups(
  nodes: ModelNode[],
  tolerance = 0,
  affectedNodeIds?: ReadonlySet<string>
): TerminalBusContactGroup[] {
  const buses = nodes.filter(isBusNode);
  if (buses.length === 0) {
    return [];
  }
  const busEntries = buses.map((bus) => ({
    bus,
    type: getBusTerminalType(bus),
    box: boxFor(bus, tolerance)
  }));
  const busEntriesByType = new Map<TerminalType, typeof busEntries>();
  const affectedBusEntriesByType = new Map<TerminalType, typeof busEntries>();
  for (const entry of busEntries) {
    if (!entry.type) {
      continue;
    }
    busEntriesByType.set(entry.type, [...(busEntriesByType.get(entry.type) ?? []), entry]);
    if (affectedNodeIds?.has(entry.bus.id)) {
      affectedBusEntriesByType.set(entry.type, [...(affectedBusEntriesByType.get(entry.type) ?? []), entry]);
    }
  }
  const hasAffectedBusEntries = affectedBusEntriesByType.size > 0;
  const groups = new Map<string, TerminalBusContactGroup>();
  for (const node of nodes) {
    if (isBusNode(node) || isStaticNode(node)) {
      continue;
    }
    if (affectedNodeIds && !affectedNodeIds.has(node.id) && !hasAffectedBusEntries) {
      continue;
    }
    for (const terminal of node.terminals) {
      const point = getTerminalPoint(node, terminal.id);
      const candidateBuses = !affectedNodeIds
        ? busEntriesByType.get(terminal.type) ?? []
        : affectedNodeIds.has(node.id)
          ? busEntriesByType.get(terminal.type) ?? []
          : affectedBusEntriesByType.get(terminal.type) ?? [];
      if (candidateBuses.length === 0) {
        continue;
      }
      for (const entry of candidateBuses) {
        if (
          point.x < entry.box.left ||
          point.x > entry.box.right ||
          point.y < entry.box.top ||
          point.y > entry.box.bottom
        ) {
          continue;
        }
        const contactPoint = terminalPointOnBus(entry.bus, point, tolerance);
        if (!contactPoint) {
          continue;
        }
        const key = `${terminal.type}:${contactPoint.x}:${contactPoint.y}`;
        const terminalId = entry.bus.terminals[0]?.id ?? "t1";
        const group = groups.get(key) ?? { key, type: terminal.type, point: contactPoint, contacts: [] };
        group.contacts.push({
          nodeId: node.id,
          terminalId: terminal.id,
          busId: entry.bus.id,
          busTerminalId: terminalId,
          type: terminal.type,
          point: contactPoint
        });
        groups.set(key, group);
      }
    }
  }
  return Array.from(groups.values());
}

function collectOverlappingTerminalPairs(nodes: ModelNode[], affectedNodeIds?: ReadonlySet<string>) {
  const pairs = new Map<string, { first: OverlappingTerminalRef; second: OverlappingTerminalRef }>();
  for (const group of getOverlappingTerminalGroups(nodes, affectedNodeIds)) {
    for (let firstIndex = 0; firstIndex < group.terminals.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < group.terminals.length; secondIndex += 1) {
        const first = group.terminals[firstIndex];
        const second = group.terminals[secondIndex];
        if (first.nodeId === second.nodeId) {
          continue;
        }
        if (affectedNodeIds && !affectedNodeIds.has(first.nodeId) && !affectedNodeIds.has(second.nodeId)) {
          continue;
        }
        pairs.set(terminalPairKey(first, second), { first, second });
      }
    }
  }
  return pairs;
}

function terminalBusPairKey(contact: Pick<TerminalBusContact, "nodeId" | "terminalId" | "busId">): string {
  return `${terminalRefKey(contact.nodeId, contact.terminalId)}|bus:${contact.busId}`;
}

function collectTerminalBusContacts(nodes: ModelNode[], affectedNodeIds?: ReadonlySet<string>) {
  const contacts = new Map<string, TerminalBusContact>();
  for (const group of getTerminalBusContactGroups(nodes, 0, affectedNodeIds)) {
    for (const contact of group.contacts) {
      contacts.set(terminalBusPairKey(contact), contact);
    }
  }
  return contacts;
}

function explicitEdgeTerminalPairKey(edge: Edge): string | null {
  if (!edge.sourceTerminalId || !edge.targetTerminalId || edge.sourceId === edge.targetId) {
    return null;
  }
  return terminalPairKey(
    { nodeId: edge.sourceId, terminalId: edge.sourceTerminalId },
    { nodeId: edge.targetId, terminalId: edge.targetTerminalId }
  );
}

function sameTypeEndpointTerminalsOverlap(nodesById: Map<string, ModelNode>, edge: Edge): boolean {
  const source = nodesById.get(edge.sourceId);
  const target = nodesById.get(edge.targetId);
  if (!source || !target || isBusNode(source) || isBusNode(target) || isStaticNode(source) || isStaticNode(target)) {
    return false;
  }
  const sourceTerminal = source.terminals.find((terminal) => terminal.id === edge.sourceTerminalId);
  const targetTerminal = target.terminals.find((terminal) => terminal.id === edge.targetTerminalId);
  if (!sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) {
    return false;
  }
  const sourcePoint = getTerminalPoint(source, sourceTerminal.id);
  const targetPoint = getTerminalPoint(target, targetTerminal.id);
  return sourcePoint.x === targetPoint.x && sourcePoint.y === targetPoint.y;
}

function sameTypeEndpointTouchesBus(nodesById: Map<string, ModelNode>, edge: Edge): boolean {
  const source = nodesById.get(edge.sourceId);
  const target = nodesById.get(edge.targetId);
  if (!source || !target) {
    return false;
  }
  const bus = isBusNode(source) ? source : isBusNode(target) ? target : null;
  const device = bus === source ? target : bus === target ? source : null;
  if (!bus || !device || isStaticNode(device)) {
    return false;
  }
  const deviceTerminalId = bus === source ? edge.targetTerminalId : edge.sourceTerminalId;
  const deviceTerminal = device.terminals.find((terminal) => terminal.id === deviceTerminalId);
  const busType = getBusTerminalType(bus);
  if (!deviceTerminal || !busType || deviceTerminal.type !== busType) {
    return false;
  }
  return Boolean(terminalPointOnBus(bus, getTerminalPoint(device, deviceTerminal.id), 0));
}

export function reconcileOverlappingTerminalConnections(
  previousNodes: ModelNode[],
  nextNodes: ModelNode[],
  edges: Edge[],
  createEdgeId: (first: OverlappingTerminalRef, second: OverlappingTerminalRef, index: number) => string = (_first, _second, index) => `overlap-edge-${index + 1}`,
  affectedNodeIds?: ReadonlySet<string>,
  candidateEdges: Edge[] = edges
): OverlappingTerminalConnectionReconcileResult {
  const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
  const previousPairs = collectOverlappingTerminalPairs(previousNodes, affectedNodeIds);
  const nextPairs = collectOverlappingTerminalPairs(nextNodes, affectedNodeIds);
  const previousBusContacts = collectTerminalBusContacts(previousNodes, affectedNodeIds);
  const nextBusContacts = collectTerminalBusContacts(nextNodes, affectedNodeIds);
  const edgeTouchesAffectedNode = (edge: Edge) =>
    !affectedNodeIds || affectedNodeIds.has(edge.sourceId) || affectedNodeIds.has(edge.targetId);
  const relevantEdges = affectedNodeIds ? candidateEdges.filter(edgeTouchesAffectedNode) : candidateEdges;
  const existingPairKeys = new Set(relevantEdges.flatMap((edge) => {
    const key = explicitEdgeTerminalPairKey(edge);
    return key ? [key] : [];
  }));
  const existingBusContactKeys = new Set(relevantEdges.flatMap((edge) => {
    const source = nextNodeById.get(edge.sourceId);
    const target = nextNodeById.get(edge.targetId);
    if (!source || !target) {
      return [];
    }
    const bus = isBusNode(source) ? source : isBusNode(target) ? target : null;
    const device = bus === source ? target : bus === target ? source : null;
    const terminalId = bus === source ? edge.targetTerminalId : edge.sourceTerminalId;
    return bus && device && terminalId ? [`${terminalRefKey(device.id, terminalId)}|bus:${bus.id}`] : [];
  }));
  const removedEdgeIds: string[] = [];
  for (const edge of relevantEdges) {
    if (!sameTypeEndpointTerminalsOverlap(nextNodeById, edge) && !sameTypeEndpointTouchesBus(nextNodeById, edge)) {
      continue;
    }
    removedEdgeIds.push(edge.id);
  }
  let usedEdgeIds: Set<string> | null = null;
  const allocateEdgeId = (baseId: string) => {
    if (!usedEdgeIds) {
      usedEdgeIds = new Set(edges.map((edge) => edge.id));
    }
    let edgeId = baseId;
    let suffix = 2;
    while (usedEdgeIds.has(edgeId)) {
      edgeId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedEdgeIds.add(edgeId);
    return edgeId;
  };
  const addedEdges: Edge[] = [];
  let addedIndex = 0;
  for (const [pairKey, pair] of previousPairs.entries()) {
    if (nextPairs.has(pairKey) || existingPairKeys.has(pairKey)) {
      continue;
    }
    const nextFirst = nextNodeById.get(pair.first.nodeId)?.terminals.find((terminal) => terminal.id === pair.first.terminalId);
    const nextSecond = nextNodeById.get(pair.second.nodeId)?.terminals.find((terminal) => terminal.id === pair.second.terminalId);
    if (!nextFirst || !nextSecond || nextFirst.type !== nextSecond.type) {
      continue;
    }
    const baseId = createEdgeId(pair.first, pair.second, addedIndex);
    const edgeId = allocateEdgeId(baseId);
    addedIndex += 1;
    addedEdges.push({
      id: edgeId,
      sourceId: pair.first.nodeId,
      targetId: pair.second.nodeId,
      sourceTerminalId: pair.first.terminalId,
      targetTerminalId: pair.second.terminalId
    });
  }
  for (const [contactKey, contact] of previousBusContacts.entries()) {
    if (nextBusContacts.has(contactKey) || existingBusContactKeys.has(contactKey)) {
      continue;
    }
    const device = nextNodeById.get(contact.nodeId);
    const deviceTerminal = device?.terminals.find((terminal) => terminal.id === contact.terminalId);
    const bus = nextNodeById.get(contact.busId);
    if (!device || !deviceTerminal || !bus || getBusTerminalType(bus) !== deviceTerminal.type) {
      continue;
    }
    const busPoint = projectPointToBusCenterline(bus, getTerminalPoint(device, deviceTerminal.id));
    const baseId = createEdgeId(
      { nodeId: contact.nodeId, terminalId: contact.terminalId, type: contact.type, point: contact.point },
      { nodeId: contact.busId, terminalId: contact.busTerminalId, type: contact.type, point: busPoint },
      addedIndex
    );
    const edgeId = allocateEdgeId(baseId);
    addedIndex += 1;
    addedEdges.push({
      id: edgeId,
      sourceId: contact.nodeId,
      targetId: contact.busId,
      sourceTerminalId: contact.terminalId,
      targetTerminalId: contact.busTerminalId,
      targetPoint: busPoint
    });
  }
  if (removedEdgeIds.length === 0 && addedEdges.length === 0) {
    return { edges, addedEdgeIds: [], removedEdgeIds: [] };
  }
  const removedEdgeIdSet = new Set(removedEdgeIds);
  const retainedEdges = removedEdgeIdSet.size > 0 ? edges.filter((edge) => !removedEdgeIdSet.has(edge.id)) : edges;
  return {
    edges: [...retainedEdges, ...addedEdges],
    addedEdgeIds: addedEdges.map((edge) => edge.id),
    removedEdgeIds
  };
}

export function isBusNode(node: ModelNode): boolean {
  return Boolean(BUS_TERMINAL_TYPE_BY_KIND[node.kind]);
}

function isBoundaryBusNode(node: Pick<ModelNode, "kind">): boolean {
  return node.kind === "hydrogen-tank" || node.kind === "thermal-storage-tank";
}

function createDynamicBusTerminal(node: ModelNode, index: number): Terminal {
  const id = `t${index + 1}`;
  const existing = node.terminals.find((terminal) => terminal.id === id);
  const type = existing?.type ?? getBusTerminalType(node) ?? "ac";
  const sameTypeFallback = node.terminals.find((terminal) => terminal.type === type);
  return {
    id,
    label: terminalLabelForType(type, index),
    type,
    anchor: existing?.anchor ?? busTerminalAnchor(index),
    nodeNumber: existing?.nodeNumber ?? makeNodeNumber(),
    vbase: existing?.vbase ?? sameTypeFallback?.vbase ?? defaultTerminalVbase(type)
  };
}

function terminalEquals(first: Terminal, second: Terminal): boolean {
  return (
    first.id === second.id &&
    first.label === second.label &&
    first.type === second.type &&
    first.nodeNumber === second.nodeNumber &&
    first.vbase === second.vbase &&
    first.anchor.x === second.anchor.x &&
    first.anchor.y === second.anchor.y
  );
}

function syncBusNodeTerminals(node: ModelNode, connectionEndpointCount: number): ModelNode {
  if (!isBusNode(node)) {
    return node;
  }
  const safeCount = Math.max(0, Math.round(connectionEndpointCount));
  const terminals = Array.from({ length: safeCount }, (_, index) => createDynamicBusTerminal(node, index));
  if (
    node.terminals.length === terminals.length &&
    node.terminals.every((terminal, index) => terminalEquals(terminal, terminals[index]))
  ) {
    return node;
  }
  return { ...node, terminals };
}

function synchronizeAffectedBusTerminalsWithEdges(
  nodes: ModelNode[],
  edges: Edge[],
  affectedNodeIds: ReadonlySet<string>
): { nodes: ModelNode[]; edges: Edge[] } {
  if (affectedNodeIds.size === 0) {
    return { nodes, edges };
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const busIdsToSync = new Set<string>();
  for (const nodeId of affectedNodeIds) {
    const node = nodeById.get(nodeId);
    if (node && isBusNode(node)) {
      busIdsToSync.add(node.id);
    }
  }
  for (const edge of edges) {
    if (!affectedNodeIds.has(edge.sourceId) && !affectedNodeIds.has(edge.targetId)) {
      continue;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && isBusNode(source)) {
      busIdsToSync.add(source.id);
    }
    if (target && isBusNode(target)) {
      busIdsToSync.add(target.id);
    }
  }
  for (const contact of collectTerminalBusContacts(nodes, affectedNodeIds).values()) {
    busIdsToSync.add(contact.busId);
  }
  if (busIdsToSync.size === 0) {
    return { nodes, edges };
  }

  const endpointCountByBusId = new Map<string, number>();
  const nextEndpointIndexByBusId = new Map<string, number>();
  const implicitContactCountByBusId = new Map<string, number>();
  for (const contact of collectTerminalBusContacts(nodes, busIdsToSync).values()) {
    if (busIdsToSync.has(contact.busId)) {
      implicitContactCountByBusId.set(contact.busId, (implicitContactCountByBusId.get(contact.busId) ?? 0) + 1);
    }
  }

  let edgesChanged = false;
  let nextEdges = edges;
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      continue;
    }
    let nextEdge = edge;
    const assignBusEndpoint = (endpoint: "source" | "target", busNode: ModelNode) => {
      if (!busIdsToSync.has(busNode.id)) {
        return;
      }
      const nextIndex = nextEndpointIndexByBusId.get(busNode.id) ?? 0;
      nextEndpointIndexByBusId.set(busNode.id, nextIndex + 1);
      endpointCountByBusId.set(busNode.id, (endpointCountByBusId.get(busNode.id) ?? 0) + 1);
      const terminalId = `t${nextIndex + 1}`;
      if (endpoint === "source") {
        if (nextEdge.sourceTerminalId !== terminalId) {
          nextEdge = { ...nextEdge, sourceTerminalId: terminalId };
        }
      } else if (nextEdge.targetTerminalId !== terminalId) {
        nextEdge = { ...nextEdge, targetTerminalId: terminalId };
      }
    };
    if (isBusNode(source)) {
      assignBusEndpoint("source", source);
    }
    if (isBusNode(target)) {
      assignBusEndpoint("target", target);
    }
    if (nextEdge !== edge) {
      if (nextEdges === edges) {
        nextEdges = edges.slice();
      }
      nextEdges[index] = nextEdge;
      edgesChanged = true;
    }
  }

  let nodesChanged = false;
  let nextNodes = nodes;
  for (const busId of busIdsToSync) {
    const node = nodeById.get(busId);
    if (!node || !isBusNode(node)) {
      continue;
    }
    const nextNode = syncBusNodeTerminals(
      node,
      (endpointCountByBusId.get(node.id) ?? 0) + (implicitContactCountByBusId.get(node.id) ?? 0)
    );
    if (nextNode === node) {
      continue;
    }
    if (nextNodes === nodes) {
      nextNodes = nodes.slice();
    }
    const nodeIndex = nodes.indexOf(node);
    if (nodeIndex >= 0) {
      nextNodes[nodeIndex] = nextNode;
      nodesChanged = true;
    }
  }

  return {
    nodes: nodesChanged ? nextNodes : nodes,
    edges: edgesChanged ? nextEdges : edges
  };
}

export function synchronizeBusTerminalsWithEdges(
  nodes: ModelNode[],
  edges: Edge[],
  affectedNodeIds?: Iterable<string>
): { nodes: ModelNode[]; edges: Edge[] } {
  if (affectedNodeIds) {
    return synchronizeAffectedBusTerminalsWithEdges(nodes, edges, new Set(affectedNodeIds));
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const endpointCountByBusId = new Map<string, number>();
  const nextEndpointIndexByBusId = new Map<string, number>();
  const implicitContactCountByBusId = new Map<string, number>();
  for (const contact of collectTerminalBusContacts(nodes).values()) {
    implicitContactCountByBusId.set(contact.busId, (implicitContactCountByBusId.get(contact.busId) ?? 0) + 1);
  }
  let edgesChanged = false;
  const nextEdges = edges.map((edge) => {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      return edge;
    }
    let nextEdge = edge;
    const assignBusEndpoint = (endpoint: "source" | "target", busNode: ModelNode) => {
      const nextIndex = nextEndpointIndexByBusId.get(busNode.id) ?? 0;
      nextEndpointIndexByBusId.set(busNode.id, nextIndex + 1);
      endpointCountByBusId.set(busNode.id, (endpointCountByBusId.get(busNode.id) ?? 0) + 1);
      const terminalId = `t${nextIndex + 1}`;
      if (endpoint === "source") {
        if (nextEdge.sourceTerminalId !== terminalId) {
          nextEdge = { ...nextEdge, sourceTerminalId: terminalId };
          edgesChanged = true;
        }
      } else if (nextEdge.targetTerminalId !== terminalId) {
        nextEdge = { ...nextEdge, targetTerminalId: terminalId };
        edgesChanged = true;
      }
    };
    if (isBusNode(source)) {
      assignBusEndpoint("source", source);
    }
    if (isBusNode(target)) {
      assignBusEndpoint("target", target);
    }
    return nextEdge;
  });
  let nodesChanged = false;
  const nextNodes = nodes.map((node) => {
    if (!isBusNode(node)) {
      return node;
    }
    const nextNode = syncBusNodeTerminals(
      node,
      (endpointCountByBusId.get(node.id) ?? 0) + (implicitContactCountByBusId.get(node.id) ?? 0)
    );
    if (nextNode !== node) {
      nodesChanged = true;
    }
    return nextNode;
  });
  return {
    nodes: nodesChanged ? nextNodes : nodes,
    edges: edgesChanged ? nextEdges : edges
  };
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

function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return start;
  }
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio
  };
}

function cubicBezierPoint(start: Point, controlA: Point, controlB: Point, end: Point, ratio: number): Point {
  const inverse = 1 - ratio;
  const inverseSquared = inverse * inverse;
  const ratioSquared = ratio * ratio;
  return {
    x: inverseSquared * inverse * start.x + 3 * inverseSquared * ratio * controlA.x + 3 * inverse * ratioSquared * controlB.x + ratioSquared * ratio * end.x,
    y: inverseSquared * inverse * start.y + 3 * inverseSquared * ratio * controlA.y + 3 * inverse * ratioSquared * controlB.y + ratioSquared * ratio * end.y
  };
}

function closestPointOnTankBody(localPoint: Point, node: ModelNode): Point {
  const scaleX = Math.abs(getNodeScaleX(node) || 1);
  const scaleY = Math.abs(getNodeScaleY(node) || 1);
  const halfWidth = Math.max(1, (node.size.width * scaleX) / 2);
  const halfHeight = Math.max(1, (node.size.height * scaleY) / 2);
  const sideInset = Math.min(10 * scaleX, halfWidth * 0.45);
  const bodyHalfWidth = Math.max(1, halfWidth - sideInset);
  const sideTop = -halfHeight / 2;
  const sideBottom = halfHeight / 2;
  const topLeft = { x: -bodyHalfWidth, y: sideTop };
  const topRight = { x: bodyHalfWidth, y: sideTop };
  const bottomRight = { x: bodyHalfWidth, y: sideBottom };
  const bottomLeft = { x: -bodyHalfWidth, y: sideBottom };
  const topControlA = { x: -(node.size.width * scaleX) / 3, y: -halfHeight };
  const topControlB = { x: (node.size.width * scaleX) / 3, y: -halfHeight };
  const bottomControlA = { x: (node.size.width * scaleX) / 3, y: halfHeight };
  const bottomControlB = { x: -(node.size.width * scaleX) / 3, y: halfHeight };
  const candidates: Point[] = [
    closestPointOnSegment(localPoint, topLeft, bottomLeft),
    closestPointOnSegment(localPoint, topRight, bottomRight)
  ];
  const sampleBezier = (start: Point, controlA: Point, controlB: Point, end: Point) => {
    let previous = start;
    for (let index = 1; index <= 32; index += 1) {
      const next = cubicBezierPoint(start, controlA, controlB, end, index / 32);
      candidates.push(closestPointOnSegment(localPoint, previous, next));
      previous = next;
    }
  };
  sampleBezier(topLeft, topControlA, topControlB, topRight);
  sampleBezier(bottomRight, bottomControlA, bottomControlB, bottomLeft);
  return candidates.reduce((best, candidate) => {
    const bestDistance = Math.hypot(localPoint.x - best.x, localPoint.y - best.y);
    const candidateDistance = Math.hypot(localPoint.x - candidate.x, localPoint.y - candidate.y);
    return candidateDistance < bestDistance ? candidate : best;
  }, candidates[0]);
}

export function boundaryBusInternalConnectorSegment(node: ModelNode, endpointPoint: Point): { from: Point; to: Point } | null {
  if (!isBoundaryBusNode(node)) {
    return null;
  }
  const from = projectPointToNodeBoundary(node, endpointPoint);
  const localFrom = pointToNodeLocal(node, from);
  const localTo = closestPointOnTankBody(localFrom, node);
  if (Math.hypot(localTo.x - localFrom.x, localTo.y - localFrom.y) < 0.5) {
    return null;
  }
  return {
    from,
    to: nodeLocalToPoint(node, localTo)
  };
}

export function boundaryBusInternalConnectorStrokeWidth(node: ModelNode, segment: { from: Point; to: Point }): number {
  const localFrom = pointToNodeLocal(node, segment.from);
  const localTo = pointToNodeLocal(node, segment.to);
  const dx = Math.abs(localTo.x - localFrom.x);
  const dy = Math.abs(localTo.y - localFrom.y);
  const scaleX = Math.abs(getNodeScaleX(node) || 1);
  const scaleY = Math.abs(getNodeScaleY(node) || 1);
  const crossAxisScale = dx > dy * 1.5 ? scaleY : dy > dx * 1.5 ? scaleX : (scaleX + scaleY) / 2;
  return Math.round(getDeviceStrokeWidth(node) * crossAxisScale * 1000) / 1000;
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

export function projectPointToBusCenterlineIfInRange(node: ModelNode, point: Point): Point | null {
  if (!isBusNode(node)) {
    return null;
  }
  if (isBoundaryBusNode(node)) {
    return projectPointToNodeBoundary(node, point);
  }
  const local = pointToNodeLocal(node, point);
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  if (local.x < -halfWidth || local.x > halfWidth) {
    return null;
  }
  return projectPointToBusCenterline(node, point);
}

export function getEdgeEndpointPoint(node: ModelNode, endpointPoint?: Point, terminalId?: string): Point {
  return endpointPoint && isBusNode(node) ? projectPointToBusCenterline(node, endpointPoint) : getTerminalPoint(node, terminalId);
}

function getElementTreeTypeLabel(node: ModelNode, templates: readonly DeviceTemplate[] = DEVICE_LIBRARY): string {
  return templates.find((template) => template.kind === node.kind)?.label ?? node.kind;
}

function edgeDisplayName(edge: Edge, nodeById: Map<string, ModelNode>): string {
  const sourceName = nodeById.get(edge.sourceId)?.name;
  const targetName = nodeById.get(edge.targetId)?.name;
  if (sourceName || targetName) {
    return `${sourceName ?? edge.sourceId} -> ${targetName ?? edge.targetId}`;
  }
  return `联络线 ${edge.id}`;
}

export function buildElementTree(
  nodes: ModelNode[],
  edges: Edge[],
  templates: readonly DeviceTemplate[] = DEVICE_LIBRARY,
  options: { includeContainerChildren?: boolean } = {}
): ElementTreeGroup[] {
  const groups: ElementTreeGroup[] = [];
  const groupByKey = new Map<string, ElementTreeGroup>();
  const templateByKind = new Map(templates.map((template) => [template.kind, template]));
  const includeContainerChildren = options.includeContainerChildren !== false;
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
    const typeLabel = getElementTreeTypeLabel(node, templates);
    const containerChildren = includeContainerChildren
      ? buildContainerDeviceParameterViews(node, templateByKind.get(node.kind))
          .filter((view) => view.kind === "associated")
          .map<ElementTreeChildItem>((view) => ({
            id: `${node.id}:${view.id}`,
            label: view.label,
            componentType: view.componentType ?? "",
            idx: view.rows.find((row) => row.key === "idx")?.value ?? "",
            name: view.rows.find((row) => row.key === "name")?.value ?? "",
            nameKey: view.relationKeys?.[0] ? containerRelationNameKey(view.relationKeys[0]) : "",
            relationKeys: view.relationKeys ?? [],
            terminalLabels: view.terminalLabels ?? view.rows.find((row) => row.key === "terminals")?.value ?? ""
          }))
      : [];
    const item: ElementTreeItem = {
      kind: "node",
      id: node.id,
      name: node.name || typeLabel,
      idx: node.params.idx ?? "",
      editableDevice: !isStaticNode(node)
    };
    if (containerChildren.length > 0) {
      item.children = containerChildren;
    }
    appendItem(`node:${node.kind}`, typeLabel, item);
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

export function getRouteEndpointNormal(node: ModelNode, endpointPoint: Point, otherPoint: Point, terminalId?: string): Point {
  return isBusNode(node) ? getBusEndpointNormal(node, endpointPoint, otherPoint) : getTerminalNormal(node, terminalId);
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

function nodeLayoutBounds(node: ModelNode) {
  const { halfWidth, halfHeight } = visualHalfExtentsForNode(node);
  return {
    left: node.position.x - halfWidth,
    right: node.position.x + halfWidth,
    top: node.position.y - halfHeight,
    bottom: node.position.y + halfHeight,
    halfWidth,
    halfHeight
  };
}

export function alignNodes(nodes: ModelNode[], selectedIds: string[], direction: AlignMode): ModelNode[] {
  const selected = nodes.filter((node) => selectedIds.includes(node.id));
  if (selected.length < 2) {
    return nodes;
  }
  if (direction === "left" || direction === "right" || direction === "top" || direction === "bottom") {
    const selectedBounds = selected.map(nodeLayoutBounds);
    const alignedCoordinate =
      direction === "left"
        ? Math.min(...selectedBounds.map((bounds) => bounds.left))
        : direction === "right"
          ? Math.max(...selectedBounds.map((bounds) => bounds.right))
          : direction === "top"
            ? Math.min(...selectedBounds.map((bounds) => bounds.top))
            : Math.max(...selectedBounds.map((bounds) => bounds.bottom));

    return nodes.map((node) => {
      if (!selectedIds.includes(node.id)) {
        return node;
      }
      const bounds = nodeLayoutBounds(node);
      return {
        ...node,
        position:
          direction === "left"
            ? { ...node.position, x: Math.round(alignedCoordinate + bounds.halfWidth) }
            : direction === "right"
              ? { ...node.position, x: Math.round(alignedCoordinate - bounds.halfWidth) }
              : direction === "top"
                ? { ...node.position, y: Math.round(alignedCoordinate + bounds.halfHeight) }
                : { ...node.position, y: Math.round(alignedCoordinate - bounds.halfHeight) }
      };
    });
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

export function distributeNodes(nodes: ModelNode[], selectedIds: string[], direction: AlignDirection): ModelNode[] {
  const selected = nodes.filter((node) => selectedIds.includes(node.id));
  if (selected.length < 3) {
    return nodes;
  }
  const axis = direction === "horizontal" ? "x" : "y";
  const ordered = [...selected].sort((first, second) => first.position[axis] - second.position[axis]);
  const start = ordered[0].position[axis];
  const end = ordered[ordered.length - 1].position[axis];
  if (start === end) {
    return nodes;
  }
  const step = (end - start) / (ordered.length - 1);
  const coordinateById = new Map(
    ordered.map((node, index) => [node.id, Math.round(start + step * index)])
  );

  return nodes.map((node) => {
    const coordinate = coordinateById.get(node.id);
    if (coordinate === undefined) {
      return node;
    }
    return {
      ...node,
      position:
        direction === "horizontal"
          ? { ...node.position, x: coordinate }
          : { ...node.position, y: coordinate }
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

type DisjointSet = {
  ensure: (key: string) => void;
  find: (key: string) => string;
  union: (first: string, second: string) => void;
};

function createDisjointSet(): DisjointSet {
  const parent = new Map<string, string>();
  const ensure = (key: string) => {
    if (!parent.has(key)) {
      parent.set(key, key);
    }
  };
  const find = (key: string): string => {
    ensure(key);
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
  return { ensure, find, union };
}

type ElectricalTerminalType = Extract<TerminalType, "ac" | "dc">;

function isElectricalTerminalType(type: TerminalType): type is ElectricalTerminalType {
  return type === "ac" || type === "dc";
}

function resolveTopologyEdgeTerminal(node: ModelNode | undefined, terminalId?: string): Terminal | undefined {
  if (!node) {
    return undefined;
  }
  if (terminalId) {
    return node.terminals.find((terminal) => terminal.id === terminalId);
  }
  return node.terminals[0];
}

function shouldContractTopologyIslandNode(node: ModelNode): boolean {
  const section = inferESection(node.kind, node.params);
  if (section === "ACBranch" || section === "DCBranch" || section === "ACZeroBranch" || section === "DCZeroBranch") {
    return true;
  }
  if (section === "ACSwitch" || section === "DCSwitch" || section === "ACBreak" || section === "DCBreak") {
    return normalizeSwitchStatusForE(node.params.status ?? node.params.closedStatus) !== "0";
  }
  return false;
}

function isTwoWindingTransformerNode(node: Pick<ModelNode, "kind">): boolean {
  return node.kind === "ac-transformer" || node.kind === "ac-two-winding-transformer";
}

function isTwoTerminalTopologyDevice(node: ModelNode): boolean {
  return !isBusNode(node) && !isStaticNode(node) && node.terminals.length === 2;
}

type TopologyConnectivity = {
  terminalKey: (nodeId: string, terminalId: string) => string;
  topologyRoot: (nodeId: string, terminalId: string) => string;
  islandRoot: (nodeId: string, terminalId: string) => string;
};

function buildTopologyConnectivity(nodes: ModelNode[], edges: Edge[]): TopologyConnectivity {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const topology = createDisjointSet();

  for (const node of nodes) {
    for (const terminal of node.terminals) {
      topology.ensure(terminalKey(node.id, terminal.id));
    }
    if (isBusNode(node)) {
      const terminalsByType = new Map<TerminalType, Terminal[]>();
      for (const terminal of node.terminals) {
        terminalsByType.set(terminal.type, [...(terminalsByType.get(terminal.type) ?? []), terminal]);
      }
      for (const terminals of terminalsByType.values()) {
        const [first, ...rest] = terminals;
        for (const terminal of rest) {
          topology.union(terminalKey(node.id, first.id), terminalKey(node.id, terminal.id));
        }
      }
    }
  }

  for (const overlappingGroup of getOverlappingTerminalGroups(nodes)) {
    const [first, ...rest] = overlappingGroup.terminals;
    for (const item of rest) {
      topology.union(terminalKey(first.nodeId, first.terminalId), terminalKey(item.nodeId, item.terminalId));
    }
  }
  for (const contactGroup of getTerminalBusContactGroups(nodes)) {
    for (const contact of contactGroup.contacts) {
      topology.union(terminalKey(contact.nodeId, contact.terminalId), terminalKey(contact.busId, contact.busTerminalId));
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    const sourceTerminal = resolveTopologyEdgeTerminal(source, edge.sourceTerminalId);
    const targetTerminal = resolveTopologyEdgeTerminal(target, edge.targetTerminalId);
    if (!source || !target || !sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) {
      continue;
    }
    topology.union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));
  }

  const island = createDisjointSet();
  for (const node of nodes) {
    for (const terminal of node.terminals) {
      island.ensure(topology.find(terminalKey(node.id, terminal.id)));
    }
  }
  for (const node of nodes) {
    if (!shouldContractTopologyIslandNode(node)) {
      continue;
    }
    const electricalTerminals = node.terminals.filter((terminal) => isElectricalTerminalType(terminal.type));
    const [first, ...rest] = electricalTerminals;
    if (!first) {
      continue;
    }
    for (const terminal of rest) {
      if (terminal.type === first.type) {
        island.union(topology.find(terminalKey(node.id, first.id)), topology.find(terminalKey(node.id, terminal.id)));
      }
    }
  }

  return {
    terminalKey,
    topologyRoot: (nodeId, terminalId) => topology.find(terminalKey(nodeId, terminalId)),
    islandRoot: (nodeId, terminalId) => island.find(topology.find(terminalKey(nodeId, terminalId)))
  };
}

type IslandVoltageGroup = {
  type: ElectricalTerminalType;
  relatedNodeIds: Set<string>;
  voltages: Map<string, string>;
};

function collectElectricalIslandVoltageGroups(nodes: ModelNode[], connectivity: TopologyConnectivity) {
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
        group.voltages.set(voltage, terminal.vbase ?? node.params.vbase ?? voltage);
      }
      groups.set(key, group);
    }
  }
  return groups;
}

export function calculateElectricalTopology(nodes: ModelNode[], edges: Edge[]): ModelNode[] {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const connectivity = buildTopologyConnectivity(nodes, edges);

  const nextTopologyNumberByType: Record<TerminalType, number> = { ac: 1, dc: 1, h2: 1, heat: 1 };
  const numberByTypeAndRoot: Record<TerminalType, Map<string, string>> = {
    ac: new Map<string, string>(),
    dc: new Map<string, string>(),
    h2: new Map<string, string>(),
    heat: new Map<string, string>()
  };
  const getTopologyNumber = (nodeId: string, terminal: Terminal) => {
    const root = connectivity.topologyRoot(nodeId, terminal.id);
    const type = terminal.type;
    const numberByRoot = numberByTypeAndRoot[type];
    const existing = numberByRoot.get(root);
    if (existing) {
      return existing;
    }
    const next = String(nextTopologyNumberByType[type]++);
    numberByRoot.set(root, next);
    return next;
  };
  const islandVoltageGroups = collectElectricalIslandVoltageGroups(nodes, connectivity);
  const voltageForTerminal = (nodeId: string, terminal: Terminal): string => {
    if (!isElectricalTerminalType(terminal.type)) {
      return "";
    }
    const root = connectivity.islandRoot(nodeId, terminal.id);
    const group = islandVoltageGroups.get(`${terminal.type}:${root}`);
    return group?.voltages.size === 1 ? Array.from(group.voltages.keys())[0] : "";
  };
  const applyTerminalVoltageBaseParams = (node: ModelNode, terminals: Terminal[]): Record<string, string> => {
    let params = node.params;
    const voltageByTerminalId = new Map(terminals.map((terminal) => [terminal.id, voltageForTerminal(node.id, terminal)]));
    const ensureParams = () => {
      if (params === node.params) {
        params = { ...node.params };
      }
    };
    const assignTerminalParam = (paramKey: string, terminal?: Terminal) => {
      const voltage = terminal ? voltageByTerminalId.get(terminal.id) : "";
      if (!voltage) {
        return;
      }
      ensureParams();
      params[paramKey] = voltage;
    };
    const terminalVoltages = Array.from(new Set(terminals.map((terminal) => voltageByTerminalId.get(terminal.id) ?? "").filter(Boolean)));
    if (Object.prototype.hasOwnProperty.call(params, "vbase") && terminalVoltages.length === 1) {
      ensureParams();
      params.vbase = terminalVoltages[0];
    }
    if (isThreeWindingTransformer(node)) {
      assignTerminalParam("highVbase", terminals[0]);
      assignTerminalParam("mediumVbase", terminals[1]);
      assignTerminalParam("lowVbase", terminals[2]);
    } else if (isTwoWindingTransformerNode(node)) {
      assignTerminalParam("highVbase", terminals[0]);
      assignTerminalParam("lowVbase", terminals[1]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "sourceVbase")) {
      assignTerminalParam("sourceVbase", terminals[0]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "targetVbase")) {
      assignTerminalParam("targetVbase", terminals[1]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "i_vbase")) {
      assignTerminalParam("i_vbase", terminals[0]);
    }
    if (Object.prototype.hasOwnProperty.call(params, "j_vbase")) {
      assignTerminalParam("j_vbase", terminals[1]);
    }
    return params;
  };
  const applyVoltageSetpointDefaults = (node: ModelNode, terminals: Terminal[]): Record<string, string> => {
    let params = applyTerminalVoltageBaseParams(node, terminals);
    const assignIfZero = (paramKey: string, terminal?: Terminal) => {
      if (!terminal || !shouldAssignVoltageSetpointDefault(params[paramKey])) {
        return;
      }
      const voltage = voltageForTerminal(node.id, terminal);
      if (!voltage) {
        return;
      }
      if (params === node.params) {
        params = { ...node.params };
      }
      params[paramKey] = voltage;
    };
    const section = inferESection(node.kind, node.params);
    if (section === "ACGenerator" || section === "DCGenerator") {
      const type: TerminalType = section === "ACGenerator" ? "ac" : "dc";
      assignIfZero("v_set", terminals.find((terminal) => terminal.type === type) ?? terminals[0]);
    }
    if (section === "DCDCConverter") {
      const sourceControl = normalizeDcdcEndpointControlTypeForE(params.i_control_type || params.sourceControlType || params.control_type);
      const targetControl = normalizeDcdcEndpointControlTypeForE(params.j_control_type || params.targetControlType);
      const controlledTerminal = targetControl === "CTRL_V"
        ? terminals[1]
        : sourceControl === "CTRL_V"
          ? terminals[0]
          : terminals[0];
      assignIfZero("v_set", controlledTerminal);
    }
    if (section === "DCACConverter") {
      assignIfZero("v_ac_set", terminals.find((terminal) => terminal.type === "ac") ?? terminals[0]);
      assignIfZero("v_dc_set", terminals.find((terminal) => terminal.type === "dc") ?? terminals[1]);
      assignIfZero("ac_v_set", terminals.find((terminal) => terminal.type === "ac") ?? terminals[0]);
      assignIfZero("dc_v_set", terminals.find((terminal) => terminal.type === "dc") ?? terminals[1]);
    }
    if (section === "ACACConverter") {
      assignIfZero("i_v_set", terminals[0]);
      assignIfZero("j_v_set", terminals[1]);
    }
    if (section === "DCDCConverter" || section === "DCACConverter" || section === "ACACConverter") {
      assignIfZero("v_set", terminals[0]);
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
        assignIfZero(containerRelationParamKey(fieldName, "v_set"), terminals[parsed.terminalNumber - 1]);
      }
    }
    return params;
  };

  const numberedNodes = nodes.map((node) => {
    const terminals = node.terminals.map((terminal) => {
      const voltage = voltageForTerminal(node.id, terminal);
      return {
        ...terminal,
        vbase: voltage || terminal.vbase,
        nodeNumber: getTopologyNumber(node.id, terminal)
      };
    });
    const acTopologyNode = Number(terminals.find((terminal) => terminal.type === "ac")?.nodeNumber ?? 0);
    const dcTopologyNode = Number(terminals.find((terminal) => terminal.type === "dc")?.nodeNumber ?? 0);
    const params = applyVoltageSetpointDefaults(node, terminals);
    return {
      ...node,
      acTopologyNode,
      dcTopologyNode,
      nodeNumber: terminals.length === 1 ? terminals[0].nodeNumber : node.nodeNumber,
      params,
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

export function validateVoltageSetpointDeviations(nodes: ModelNode[], edges: Edge[]): TopologyValidationError[] {
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
        group.voltages.set(voltage, terminal.vbase ?? node.params.vbase ?? voltage);
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
      const sourceControl = normalizeDcdcEndpointControlTypeForE(node.params.i_control_type || node.params.sourceControlType || node.params.control_type);
      const targetControl = normalizeDcdcEndpointControlTypeForE(node.params.j_control_type || node.params.targetControlType);
      addNodeVoltageSetpointDeviation("v_set", targetControl === "CTRL_V" ? node.terminals[1] : sourceControl === "CTRL_V" ? node.terminals[0] : node.terminals[0]);
    }
    if (section === "DCACConverter") {
      addNodeVoltageSetpointDeviation("v_ac_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_dc_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
      addNodeVoltageSetpointDeviation("ac_v_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("dc_v_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
    }
    if (section === "ACACConverter") {
      addNodeVoltageSetpointDeviation("i_v_set", node.terminals[0]);
      addNodeVoltageSetpointDeviation("j_v_set", node.terminals[1]);
    }
    if (section === "DCDCConverter" || section === "DCACConverter" || section === "ACACConverter") {
      addNodeVoltageSetpointDeviation("v_set", node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_ac_set", node.terminals.find((terminal) => terminal.type === "ac") ?? node.terminals[0]);
      addNodeVoltageSetpointDeviation("v_dc_set", node.terminals.find((terminal) => terminal.type === "dc") ?? node.terminals[1]);
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
  const entries: DeviceIdentityValidationEntry[] = [];
  const primaryTypeKey = deviceIndexCounterKey(node);
  const idx = parseDeviceIndex(node.params.idx);
  if (primaryTypeKey) {
    entries.push({
      typeKey: primaryTypeKey,
      idx: idx > 0 ? String(idx) : "",
      name: node.name.trim(),
      node
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
        name: containerAssociatedDeviceName(node, fieldName),
        node
      });
    }
  }
  return entries;
}

function duplicateDeviceIdentityErrors(nodes: ModelNode[]): TopologyValidationError[] {
  const errors: TopologyValidationError[] = [];
  const entries = nodes.flatMap(identityValidationEntriesForNode);
  const addDuplicateErrors = (
    type: Extract<TopologyValidationErrorType, "duplicate-device-idx" | "duplicate-device-name">,
    valueOf: (entry: DeviceIdentityValidationEntry) => string,
    messageOf: (typeKey: string, value: string, entries: DeviceIdentityValidationEntry[]) => string
  ) => {
    const groups = new Map<string, DeviceIdentityValidationEntry[]>();
    for (const entry of entries) {
      const value = valueOf(entry).trim();
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

export function validateTopology(
  nodes: ModelNode[],
  edges: Edge[],
  options: { includeVoltageSetpointDeviations?: boolean } = {}
): TopologyValidationError[] {
  const synchronized = synchronizeBusTerminalsWithEdges(nodes, edges);
  nodes = synchronized.nodes;
  edges = synchronized.edges;
  const errors: TopologyValidationError[] = duplicateDeviceIdentityErrors(nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId: string, terminalId: string) => `${nodeId}:${terminalId}`;
  const resolveEdgeTerminal = (node: ModelNode, terminalId?: string) => {
    if (terminalId) {
      return node.terminals.find((terminal) => terminal.id === terminalId);
    }
    return node.terminals[0];
  };
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
    const sourceTerminal = source ? resolveEdgeTerminal(source, edge.sourceTerminalId) : undefined;
    const targetTerminal = target ? resolveEdgeTerminal(target, edge.targetTerminalId) : undefined;
    if (!source || !target || !sourceTerminal || !targetTerminal) {
      const floatingEnds = [
        !source || !sourceTerminal ? "首端" : "",
        !target || !targetTerminal ? "末端" : ""
      ].filter(Boolean).join("、");
      const relatedNodeIds = [source?.id, target?.id].filter((id): id is string => Boolean(id));
      errors.push({
        id: `floating-terminal:${edge.id}`,
        type: "floating-terminal",
        edgeId: edge.id,
        nodeId: relatedNodeIds[0],
        relatedNodeIds,
        message: `图上拓扑失败：联络线 ${edge.id} 的${floatingEnds || "端子"}悬空，必须连接到设备端子或母线。`
      });
      continue;
    }
    connectedTerminals.add(`${source.id}:${sourceTerminal.id}`);
    connectedTerminals.add(`${target.id}:${targetTerminal.id}`);

    if (source.id === target.id && isBusNode(source) && isBusNode(target)) {
      errors.push({
        id: `same-bus-endpoints:${edge.id}`,
        type: "same-bus-endpoints",
        edgeId: edge.id,
        nodeId: source.id,
        relatedNodeIds: [source.id],
        message: `图上拓扑失败：联络线 ${edge.id} 的首末端不能位于同一个母线 ${source.name} 上。`
      });
      continue;
    }

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
    if (
      sourceVoltage &&
      targetVoltage &&
      !isZeroNumericText(sourceVoltage) &&
      !isZeroNumericText(targetVoltage) &&
      sourceVoltage !== targetVoltage
    ) {
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
      if (voltage && !isZeroNumericText(voltage)) {
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
    if (!isTwoTerminalTopologyDevice(node)) {
      continue;
    }
    const firstTerminal = node.terminals[0];
    const lastTerminal = node.terminals[node.terminals.length - 1];
    if (!firstTerminal || !lastTerminal) {
      continue;
    }
    const firstRoot = find(terminalKey(node.id, firstTerminal.id));
    const lastRoot = find(terminalKey(node.id, lastTerminal.id));
    if (firstRoot !== lastRoot) {
      continue;
    }
    errors.push({
      id: `same-topology-node-endpoints:${node.id}:${firstTerminal.id}:${lastTerminal.id}`,
      type: "same-topology-node-endpoints",
      nodeId: node.id,
      relatedNodeIds: [node.id],
      message: `图上拓扑失败：双端设备 ${node.name} 的 ${firstTerminal.label} 与 ${lastTerminal.label} 位于同一个拓扑节点，首末端不能位于同一个拓扑节点。`
    });
  }

  const connectivity = buildTopologyConnectivity(nodes, edges);
  const islandVoltageGroups = collectElectricalIslandVoltageGroups(nodes, connectivity);
  for (const [root, group] of islandVoltageGroups) {
    const relatedNodeIds = Array.from(group.relatedNodeIds);
    if (group.voltages.size === 0) {
      errors.push({
        id: `missing-island-voltage:${root}`,
        type: "missing-island-voltage",
        nodeId: relatedNodeIds[0],
        relatedNodeIds,
        message: `图上拓扑失败：拓扑岛内没有非零电压基值，请至少设置一个${group.type.toUpperCase()}端子电压基值。`
      });
      continue;
    }
    if (group.voltages.size > 1) {
      errors.push({
        id: `island-voltage-mismatch:${root}`,
        type: "island-voltage-mismatch",
        nodeId: relatedNodeIds[0],
        relatedNodeIds,
        message: `图上拓扑失败：同一拓扑岛内存在多套非零电压基值（${Array.from(group.voltages.values()).join(" / ")}）。`
      });
    }
  }

  for (const node of nodes) {
    if (!isTwoWindingTransformerNode(node) && !isThreeWindingTransformer(node)) {
      continue;
    }
    const rootByTerminal = node.terminals
      .filter((terminal) => isElectricalTerminalType(terminal.type))
      .map((terminal) => ({ terminal, root: connectivity.islandRoot(node.id, terminal.id) }));
    const seenRoots = new Map<string, Terminal>();
    for (const { terminal, root } of rootByTerminal) {
      const existing = seenRoots.get(root);
      if (!existing) {
        seenRoots.set(root, terminal);
        continue;
      }
      errors.push({
        id: `transformer-island-short:${node.id}:${existing.id}:${terminal.id}`,
        type: "transformer-island-short",
        nodeId: node.id,
        relatedNodeIds: [node.id],
        message: `图上拓扑失败：${node.name} 的 ${existing.label} 与 ${terminal.label} 位于同一拓扑岛，变压器两侧不能被开关、断路器、线路或零阻抗支路短接。`
      });
      break;
    }
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

  if (errors.length > 0 || options.includeVoltageSetpointDeviations === false) {
    return errors;
  }
  return validateVoltageSetpointDeviations(calculateElectricalTopology(nodes, edges), edges);
}

export function topologyCalculationMessage(errorCount: number) {
  return errorCount === 0
    ? "图上拓扑成功。"
    : `图上拓扑失败：发现 ${errorCount} 条错误，已定位到第一条错误。`;
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

function defaultModelLayer(): ModelLayer {
  return { id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true };
}

export function createModelLayer(name: string, existingLayers: ModelLayer[] = []): ModelLayer {
  return {
    id: makeId("layer"),
    name: uniqueRecordName(name, existingLayers.map((layer) => layer.name), "新建图层"),
    visible: true
  };
}

export function normalizeModelLayers(layers?: ModelLayer[], nodes: Pick<ModelNode, "layerId">[] = [], activeLayerId?: string): ModelLayer[] {
  const normalized: ModelLayer[] = [];
  const seenIds = new Set<string>();
  const appendLayer = (layer: Partial<ModelLayer> | undefined, fallbackId: string, fallbackName: string) => {
    const id = (layer?.id || fallbackId).trim();
    if (!id || seenIds.has(id)) {
      return;
    }
    seenIds.add(id);
    normalized.push({
      id,
      name: (layer?.name || fallbackName).trim() || fallbackName,
      visible: id === activeLayerId || layer?.visible !== false
    });
  };

  appendLayer(layers?.find((layer) => layer.id === DEFAULT_MODEL_LAYER_ID) ?? defaultModelLayer(), DEFAULT_MODEL_LAYER_ID, DEFAULT_MODEL_LAYER_NAME);
  (layers ?? [])
    .filter((layer) => layer.id !== DEFAULT_MODEL_LAYER_ID)
    .forEach((layer, index) => appendLayer(layer, `layer-${index + 1}`, `图层${index + 1}`));
  nodes.forEach((node) => {
    if (node.layerId && !seenIds.has(node.layerId)) {
      appendLayer({ id: node.layerId, name: node.layerId, visible: true }, node.layerId, node.layerId);
    }
  });
  return normalized.length > 0 ? normalized : [defaultModelLayer()];
}

export function resolveActiveModelLayerId(layers: ModelLayer[], activeLayerId?: string): string {
  return layers.some((layer) => layer.id === activeLayerId)
    ? activeLayerId!
    : layers[0]?.id ?? DEFAULT_MODEL_LAYER_ID;
}

export function normalizeModelGroups(
  groups: readonly Partial<ModelGroup>[] | undefined,
  nodes: readonly Pick<ModelNode, "id">[] = [],
  edges: readonly Pick<Edge, "id">[] = []
): ModelGroup[] {
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const validEdgeIds = new Set(edges.map((edge) => edge.id));
  const seenGroupIds = new Set<string>();
  const uniqueValidIds = (ids: readonly string[] | undefined, validIds: ReadonlySet<string>) => {
    const seen = new Set<string>();
    return (ids ?? []).filter((id) => {
      if (!id || seen.has(id) || !validIds.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  };
  const uniqueIds = (ids: readonly string[] | undefined) => {
    const seen = new Set<string>();
    return (ids ?? []).filter((id) => {
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  };

  let normalized: ModelGroup[] = (groups ?? []).map((group, index) => {
    let id = (group.id ?? "").trim() || `group-${index + 1}`;
    if (seenGroupIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    seenGroupIds.add(id);
    const nodeIds = uniqueValidIds(group.nodeIds, validNodeIds);
    const edgeIds = uniqueValidIds(group.edgeIds, validEdgeIds);
    return {
      id,
      name: (group.name ?? "").trim(),
      nodeIds,
      edgeIds,
      childGroupIds: uniqueIds(group.childGroupIds)
    };
  });

  const hasDescendant = (
    groupsById: ReadonlyMap<string, ModelGroup>,
    groupId: string,
    targetGroupId: string,
    visiting = new Set<string>()
  ): boolean => {
    if (groupId === targetGroupId) {
      return true;
    }
    if (visiting.has(groupId)) {
      return false;
    }
    visiting.add(groupId);
    const group = groupsById.get(groupId);
    if (!group) {
      return false;
    }
    return (group.childGroupIds ?? []).some((childGroupId) => hasDescendant(groupsById, childGroupId, targetGroupId, visiting));
  };

  let changed = true;
  while (changed) {
    changed = false;
    const groupIds = new Set(normalized.map((group) => group.id));
    const groupsById = new Map(normalized.map((group) => [group.id, group] as const));
    const next = normalized.flatMap((group) => {
      const childGroupIds = (group.childGroupIds ?? []).filter((childGroupId) =>
        childGroupId !== group.id &&
        groupIds.has(childGroupId) &&
        !hasDescendant(groupsById, childGroupId, group.id)
      );
      if (childGroupIds.length !== (group.childGroupIds ?? []).length) {
        changed = true;
      }
      if (group.nodeIds.length + group.edgeIds.length + childGroupIds.length < 2) {
        changed = true;
        return [];
      }
      const baseGroup = {
        id: group.id,
        name: group.name,
        nodeIds: group.nodeIds,
        edgeIds: group.edgeIds
      };
      return childGroupIds.length > 0 ? [{ ...baseGroup, childGroupIds }] : [baseGroup];
    });
    normalized = next;
  }

  return normalized.map((group, index) => ({
    ...group,
    name: group.name || `组合${index + 1}`
  }));
}

export function normalizeProjectLayers(project: ProjectFile): ProjectFile {
  const baseLayers = normalizeModelLayers(project.layers, project.nodes);
  const activeLayerId = resolveActiveModelLayerId(baseLayers, project.activeLayerId);
  const layers = normalizeModelLayers(baseLayers, project.nodes, activeLayerId);
  const layerIds = new Set(layers.map((layer) => layer.id));
  return {
    ...project,
    layers,
    activeLayerId,
    nodes: project.nodes.map((node) => ({
      ...node,
      layerId: node.layerId && layerIds.has(node.layerId) ? node.layerId : DEFAULT_MODEL_LAYER_ID
    })),
    groups: normalizeModelGroups(project.groups, project.nodes, project.edges)
  };
}

export function filterProjectByVisibleLayers(nodes: ModelNode[], edges: Edge[], layers?: ModelLayer[]) {
  if (!layers || layers.length === 0 || layers.every((layer) => layer.visible !== false)) {
    return { nodes, edges };
  }
  const normalizedLayers = normalizeModelLayers(layers, nodes);
  const layerOrder = new Map(normalizedLayers.map((layer, index) => [layer.id, index]));
  const visibleLayers = normalizedLayers.filter((layer) => layer.visible);
  const allLayersVisible = visibleLayers.length === normalizedLayers.length;
  if (allLayersVisible) {
    let alreadyInLayerOrder = true;
    let previousLayerOrder = -1;
    for (const node of nodes) {
      const currentLayerOrder = layerOrder.get(node.layerId ?? DEFAULT_MODEL_LAYER_ID) ?? 0;
      if (currentLayerOrder < previousLayerOrder) {
        alreadyInLayerOrder = false;
        break;
      }
      previousLayerOrder = currentLayerOrder;
    }
    if (alreadyInLayerOrder) {
      return { nodes, edges };
    }
  }
  const visibleLayerIds = new Set(visibleLayers.map((layer) => layer.id));
  const visibleNodes = nodes
    .filter((node) => visibleLayerIds.has(node.layerId ?? DEFAULT_MODEL_LAYER_ID))
    .sort((left, right) =>
      (layerOrder.get(left.layerId ?? DEFAULT_MODEL_LAYER_ID) ?? 0) -
      (layerOrder.get(right.layerId ?? DEFAULT_MODEL_LAYER_ID) ?? 0)
    );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  return {
    nodes: visibleNodes,
    edges: edges.filter((edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId))
  };
}

export function serializeProject(project: ProjectFile): string {
  return JSON.stringify(normalizeProjectLayers(lockProjectEdgeTerminals(project)), null, 2);
}

export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json) as ProjectFile;
  if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Unsupported or invalid model file");
  }
  return normalizeProjectLayers(lockProjectEdgeTerminals(parsed));
}

export function lockProjectEdgeTerminals(project: ProjectFile): ProjectFile {
  const synchronized = synchronizeBusTerminalsWithEdges(project.nodes.map(normalizeNodeTerminalsByTemplate), project.edges);
  const nodes = synchronized.nodes;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const resolveTerminalId = (node: ModelNode | undefined, terminalId?: string) => {
    if (!node || node.terminals.length === 0) {
      return undefined;
    }
    return node.terminals.some((terminal) => terminal.id === terminalId)
      ? terminalId
      : node.terminals[0]?.id;
  };
  const locked = {
    ...project,
    layers: normalizeModelLayers(project.layers, nodes),
    nodes,
    edges: synchronized.edges.flatMap((edge) => {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      const sourceTerminalId = resolveTerminalId(source, edge.sourceTerminalId);
      const targetTerminalId = resolveTerminalId(target, edge.targetTerminalId);
      if (!source || !target || !sourceTerminalId || !targetTerminalId) {
        return [];
      }
      return [{
        ...edge,
        sourceTerminalId,
        targetTerminalId,
        sourcePoint: source ? (isBusNode(source) ? edge.sourcePoint : undefined) : edge.sourcePoint,
        targetPoint: target ? (isBusNode(target) ? edge.targetPoint : undefined) : edge.targetPoint
      }];
    })
  };
  return {
    ...locked,
    groups: normalizeModelGroups(project.groups, nodes, locked.edges)
  };
}

export function createSavedProject(name: string, project: ProjectFile): SavedProjectRecord {
  const savedName = name.trim() || "未命名模型";
  const lockedProject = normalizeProjectLayers(lockProjectEdgeTerminals(project));
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
      })),
      groups: normalizeModelGroups(lockedProject.groups, lockedProject.nodes, lockedProject.edges)
        .map((group) => ({
          ...group,
          nodeIds: [...group.nodeIds],
          edgeIds: [...group.edgeIds]
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

function hasUprightVisualContent(node: ModelNode) {
  return Boolean(
    node.kind === "static-text" ||
      node.kind === "static-image" ||
      node.params.backgroundImage ||
      node.params.backgroundImageAssetId ||
      node.params.foregroundImage ||
      node.params.foregroundImageAssetId
  );
}

function visualHalfExtentsForNode(node: ModelNode) {
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotatedHalfWidth = halfWidth * cos + halfHeight * sin;
  const rotatedHalfHeight = halfWidth * sin + halfHeight * cos;
  if (!isBusNode(node) && hasUprightVisualContent(node)) {
    return {
      halfWidth: Math.max(halfWidth, rotatedHalfWidth),
      halfHeight: Math.max(halfHeight, rotatedHalfHeight)
    };
  }
  return {
    halfWidth: rotatedHalfWidth,
    halfHeight: rotatedHalfHeight
  };
}

function boxFor(node: ModelNode, padding = 0) {
  const { halfWidth, halfHeight } = visualHalfExtentsForNode(node);
  return {
    left: node.position.x - halfWidth - padding,
    right: node.position.x + halfWidth + padding,
    top: node.position.y - halfHeight - padding,
    bottom: node.position.y + halfHeight + padding
  };
}

function routeBlockerPadding(node: ModelNode, padding: number) {
  return isBoundaryBusNode(node) ? 0 : padding;
}

function routeBlockerBox(node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  return boxFor(node, routeBlockerPadding(node, padding));
}

export function calculateModelContentSize(
  nodes: ModelNode[],
  edges: Edge[],
  routedEdges: RoutedEdge[] = [],
  padding = 0
): CanvasBounds {
  let right = 0;
  let bottom = 0;
  const includePoint = (point?: Point) => {
    if (!point) {
      return;
    }
    right = Math.max(right, point.x + padding);
    bottom = Math.max(bottom, point.y + padding);
  };

  for (const node of nodes) {
    const box = boxFor(node, padding);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  for (const edge of edges) {
    includePoint(edge.sourcePoint);
    includePoint(edge.targetPoint);
    edge.manualPoints?.forEach(includePoint);
  }
  for (const route of routedEdges) {
    route.points.forEach(includePoint);
  }

  return {
    width: Math.max(0, Math.ceil(right)),
    height: Math.max(0, Math.ceil(bottom))
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

export function segmentIntersectsNodeBody(a: Point, b: Point, node: ModelNode, padding = ROUTE_BLOCKER_PADDING) {
  return segmentIntersectsBox(a, b, routeBlockerBox(node, padding));
}

type EdgeSide = "source" | "target";

function oppositeEdgeSide(side: EdgeSide): EdgeSide {
  return side === "source" ? "target" : "source";
}

function edgeTerminalId(edge: Edge, side: EdgeSide) {
  return side === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
}

function edgeEndpointStoredPoint(edge: Edge, side: EdgeSide) {
  return side === "source" ? edge.sourcePoint : edge.targetPoint;
}

function isOrthogonalDirectSegment(a: Point, b: Point) {
  return Math.round(a.x) === Math.round(b.x) || Math.round(a.y) === Math.round(b.y);
}

function directSegmentMatchesTerminalNormal(a: Point, b: Point, node: ModelNode, terminalId?: string) {
  if (samePoint(a, b)) {
    return true;
  }
  const normal = getTerminalNormal(node, terminalId);
  return isOrthogonalDirectSegment(a, b) && routeSegmentMatchesNormal(a, b, normal);
}

function directSegmentClearOfNodeBodies(a: Point, b: Point, nodes: ModelNode[], excludedNodeIds: Set<string>) {
  return nodes.every((node) =>
    excludedNodeIds.has(node.id) ||
    node.id.startsWith("floating-") ||
    !segmentIntersectsNodeBody(a, b, node)
  );
}

function normalAxisDistance(from: Point, to: Point, normal: Point) {
  if (normal.x !== 0) {
    return (to.x - from.x) * Math.sign(normal.x);
  }
  if (normal.y !== 0) {
    return (to.y - from.y) * Math.sign(normal.y);
  }
  return 0;
}

// Two-terminal devices may leave the terminal on its outward stub before turning toward a bus.
function routedBusSlideEndpointPoint(options: {
  busNode: ModelNode;
  originalBusNode: ModelNode;
  movingNode: ModelNode;
  movingTerminalId?: string;
  movingPoint: Point;
  nodes: ModelNode[];
  nextNodes?: ModelNode[];
}): Point | null {
  if (options.movingNode.terminals.length < 2) {
    return null;
  }
  const normal = getTerminalNormal(options.movingNode, options.movingTerminalId);
  const referencePoint = {
    x: Math.round(options.movingPoint.x + normal.x * ROUTE_ENDPOINT_STUB_LENGTH),
    y: Math.round(options.movingPoint.y + normal.y * ROUTE_ENDPOINT_STUB_LENGTH)
  };
  if (normalAxisDistance(options.movingPoint, referencePoint, normal) <= 0) {
    return null;
  }
  const candidateBusPoint = projectPointToBusCenterline(options.busNode, referencePoint);
  if (
    !candidateBusPoint ||
    normalAxisDistance(options.movingPoint, candidateBusPoint, normal) <= 0 ||
    !isOrthogonalDirectSegment(referencePoint, candidateBusPoint)
  ) {
    return null;
  }
  const excludedNodeIds = new Set([options.busNode.id, options.originalBusNode.id, options.movingNode.id]);
  const nextNodes = options.nextNodes ?? options.nodes;
  if (
    !directSegmentClearOfNodeBodies(options.movingPoint, referencePoint, nextNodes, excludedNodeIds) ||
    !directSegmentClearOfNodeBodies(referencePoint, candidateBusPoint, nextNodes, excludedNodeIds)
  ) {
    return null;
  }
  return candidateBusPoint;
}

export function resolveStraightBusSlideEndpointToPoint(options: {
  edge: Edge;
  sourceNode: ModelNode;
  targetNode: ModelNode;
  movingEndpoint: EdgeSide;
  movingPoint: Point;
  nodes: ModelNode[];
  nextNodes?: ModelNode[];
  busNode?: ModelNode;
  movingNode?: ModelNode;
  movingTerminalId?: string;
  originalMovingPoint?: Point;
}): Pick<Edge, "sourcePoint"> | Pick<Edge, "targetPoint"> | null {
  const { edge, movingEndpoint } = options;
  const busEndpoint = oppositeEdgeSide(movingEndpoint);
  const sourceBySide = {
    source: options.sourceNode,
    target: options.targetNode
  };
  const originalBusNode = sourceBySide[busEndpoint];
  const busNode = options.busNode ?? originalBusNode;
  const movingNode = options.movingNode;
  if (!isBusNode(busNode) || !isBusNode(originalBusNode) || (movingNode && isBusNode(movingNode))) {
    return null;
  }
  const candidateBusPoint = projectPointToBusCenterline(busNode, options.movingPoint);
  if (!candidateBusPoint) {
    return null;
  }
  let resolvedBusPoint = candidateBusPoint;
  if (movingNode && !isBusNode(movingNode)) {
    const movingTerminalId = options.movingTerminalId ?? edgeTerminalId(edge, movingEndpoint);
    const excludedNodeIds = new Set([busNode.id, originalBusNode.id, movingNode.id]);
    if (
      directSegmentMatchesTerminalNormal(options.movingPoint, candidateBusPoint, movingNode, movingTerminalId) &&
      directSegmentClearOfNodeBodies(options.movingPoint, candidateBusPoint, options.nextNodes ?? options.nodes, excludedNodeIds)
    ) {
      resolvedBusPoint = candidateBusPoint;
    } else {
      const routedBusPoint = routedBusSlideEndpointPoint({
        busNode,
        originalBusNode,
        movingNode,
        movingTerminalId,
        movingPoint: options.movingPoint,
        nodes: options.nodes,
        nextNodes: options.nextNodes
      });
      if (!routedBusPoint) {
        return null;
      }
      resolvedBusPoint = routedBusPoint;
    }
  }
  return busEndpoint === "source"
    ? { sourcePoint: resolvedBusPoint }
    : { targetPoint: resolvedBusPoint };
}

export function resolveStraightBusSlideEndpoint(options: {
  edge: Edge;
  sourceNode: ModelNode;
  targetNode: ModelNode;
  nextSourceNode: ModelNode;
  nextTargetNode: ModelNode;
  movingEndpoint: EdgeSide;
  nodes: ModelNode[];
  nextNodes?: ModelNode[];
  originalMovingPoint?: Point;
}): Pick<Edge, "sourcePoint"> | Pick<Edge, "targetPoint"> | null {
  const { edge, movingEndpoint } = options;
  const busEndpoint = oppositeEdgeSide(movingEndpoint);
  const sourceBySide = {
    source: options.sourceNode,
    target: options.targetNode
  };
  const nextBySide = {
    source: options.nextSourceNode,
    target: options.nextTargetNode
  };
  const busNode = nextBySide[busEndpoint];
  const originalBusNode = sourceBySide[busEndpoint];
  const movingNode = nextBySide[movingEndpoint];
  if (!isBusNode(busNode) || !isBusNode(originalBusNode) || isBusNode(movingNode)) {
    return null;
  }
  const movingTerminalId = edgeTerminalId(edge, movingEndpoint);
  const movedPoint = getEdgeEndpointPoint(movingNode, edgeEndpointStoredPoint(edge, movingEndpoint), movingTerminalId);
  return resolveStraightBusSlideEndpointToPoint({
    edge,
    sourceNode: options.sourceNode,
    targetNode: options.targetNode,
    movingEndpoint,
    movingPoint: movedPoint,
    nodes: options.nodes,
    nextNodes: options.nextNodes,
    busNode,
    movingNode,
    movingTerminalId,
    originalMovingPoint: options.originalMovingPoint
  });
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
  const boxes = blockers.map((node) => routeBlockerBox(node, 36));
  return {
    left: Math.min(0, ...points.map((point) => point.x), ...boxes.map((box) => box.left)) - 96,
    right: Math.max(1980, ...points.map((point) => point.x), ...boxes.map((box) => box.right)) + 96,
    top: Math.min(0, ...points.map((point) => point.y), ...boxes.map((box) => box.top)) - 96,
    bottom: Math.max(1200, ...points.map((point) => point.y), ...boxes.map((box) => box.bottom)) + 96
  };
}

const ROUTE_BLOCKER_PADDING = 8;
const ROUTE_CLEARANCE = 6;
const ROUTE_LANE_SEARCH_MARGIN = 180;
const ROUTE_LANE_SEGMENT_MARGIN = 36;
const ROUTE_LANE_OFFSETS = [24, 56, 96, 144];
const ROUTE_AVOIDED_SEGMENT_OFFSETS = [18, 36, 54];
const ROUTE_MAX_LANES_PER_AXIS = 24;
const ROUTE_MAX_LANE_PAIRS = 128;
const ROUTE_MAX_BUS_ENDPOINT_POINTS_PER_SIDE = 2;
const ROUTE_MAX_BUS_ENDPOINT_CANDIDATES = 4;
const ROUTE_TINY_DOGLEG_LIMIT = 18;
const ROUTE_MIN_MOVABLE_SEGMENT_LENGTH = 18;
const ROUTE_SHARED_ENDPOINT_STUB_LIMIT = 36;
const ROUTE_ENDPOINT_STUB_LENGTH = 28;

function routeIntersectsBlockers(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING, protectedEndpointSegments = 0) {
  const routeBlockers = filterBlockersForRoutePoints(points, blockers, padding);
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
    if (routeBlockers.some((blocker) => segmentIntersectsBox(a, b, routeBlockerBox(blocker, padding)))) {
      return true;
    }
  }
  return false;
}

type RouteOverlapPolicy = {
  currentEdge?: Edge;
  edgeById?: Map<string, Edge>;
  nodeById?: Map<string, ModelNode>;
  allowSharedEndpointStubs?: boolean;
  sharedEndpointStubLimit?: number;
};

type RouteOverlapConflict = {
  segment: Segment;
  conflictingSegment: Segment;
  overlap: number;
};

function routeEndpointSideForSegment(segment: Pick<Segment, "segmentIndex" | "lastSegmentIndex">): EdgeSide | null {
  if (segment.segmentIndex === 0) {
    return "source";
  }
  if (segment.segmentIndex === segment.lastSegmentIndex) {
    return "target";
  }
  return null;
}

function edgeNodeId(edge: Edge, side: EdgeSide) {
  return side === "source" ? edge.sourceId : edge.targetId;
}

function pointsAreNear(a: Point, b: Point, tolerance = 2) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function edgesShareEndpoint(
  currentEdge: Edge,
  currentSide: EdgeSide,
  otherEdge: Edge,
  otherSide: EdgeSide,
  nodeById: Map<string, ModelNode>
) {
  const currentNodeId = edgeNodeId(currentEdge, currentSide);
  const otherNodeId = edgeNodeId(otherEdge, otherSide);
  if (currentNodeId !== otherNodeId) {
    return false;
  }
  const node = nodeById.get(currentNodeId);
  if (!node) {
    return false;
  }
  const currentTerminalId = edgeTerminalId(currentEdge, currentSide);
  const otherTerminalId = edgeTerminalId(otherEdge, otherSide);
  if (!isBusNode(node)) {
    return getTerminal(node, currentTerminalId).id === getTerminal(node, otherTerminalId).id;
  }
  const currentPoint = getEdgeEndpointPoint(node, edgeEndpointStoredPoint(currentEdge, currentSide), currentTerminalId);
  const otherPoint = getEdgeEndpointPoint(node, edgeEndpointStoredPoint(otherEdge, otherSide), otherTerminalId);
  return pointsAreNear(currentPoint, otherPoint);
}

function isAllowedSharedEndpointOverlap(
  currentSegment: Segment,
  conflictingSegment: Segment,
  overlap: number,
  policy: RouteOverlapPolicy
) {
  if (!policy.allowSharedEndpointStubs || !policy.currentEdge || !policy.edgeById || !policy.nodeById) {
    return false;
  }
  const limit = policy.sharedEndpointStubLimit ?? ROUTE_SHARED_ENDPOINT_STUB_LIMIT;
  if (overlap > limit) {
    return false;
  }
  const currentSide = routeEndpointSideForSegment(currentSegment);
  const conflictingSide = routeEndpointSideForSegment(conflictingSegment);
  if (!currentSide || !conflictingSide) {
    return false;
  }
  const conflictingEdge = policy.edgeById.get(conflictingSegment.edgeId);
  if (!conflictingEdge) {
    return false;
  }
  return edgesShareEndpoint(policy.currentEdge, currentSide, conflictingEdge, conflictingSide, policy.nodeById);
}

function findRouteOverlapConflict(points: Point[], avoidedSegments: Segment[], policy: RouteOverlapPolicy = {}): RouteOverlapConflict | null {
  const currentSegments = getSegments(policy.currentEdge?.id ?? "__current_route__", 0, points);
  const routeAvoidedSegments = filterSegmentsForRoutePoints(points, avoidedSegments, 2);
  for (const segment of currentSegments) {
    for (const conflictingSegment of routeAvoidedSegments) {
      const overlap = segmentOverlapAmount(segment.a, segment.b, conflictingSegment);
      if (overlap <= 2) {
        continue;
      }
      if (isAllowedSharedEndpointOverlap(segment, conflictingSegment, overlap, policy)) {
        continue;
      }
      return { segment, conflictingSegment, overlap };
    }
  }
  return null;
}

function routeOverlapsSegments(points: Point[], avoidedSegments: Segment[], policy: RouteOverlapPolicy = {}) {
  return Boolean(findRouteOverlapConflict(points, avoidedSegments, policy));
}

function firstRouteBlockerIntersection(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING, protectedEndpointSegments = 0) {
  const routeBlockers = filterBlockersForRoutePoints(points, blockers, padding);
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
    for (const blocker of routeBlockers) {
      const box = routeBlockerBox(blocker, padding);
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
    const box = routeBlockerBox(blocker, ROUTE_BLOCKER_PADDING);
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

function endpointStubLengthOutsideOwnBody(point: Point, normal: Point, node: ModelNode, fallbackLength = ROUTE_ENDPOINT_STUB_LENGTH) {
  const box = routeBlockerBox(node, ROUTE_BLOCKER_PADDING);
  if (normal.x > 0 && point.y >= box.top && point.y <= box.bottom && point.x < box.right) {
    return Math.max(fallbackLength, box.right - point.x + ROUTE_CLEARANCE);
  }
  if (normal.x < 0 && point.y >= box.top && point.y <= box.bottom && point.x > box.left) {
    return Math.max(fallbackLength, point.x - box.left + ROUTE_CLEARANCE);
  }
  if (normal.y > 0 && point.x >= box.left && point.x <= box.right && point.y < box.bottom) {
    return Math.max(fallbackLength, box.bottom - point.y + ROUTE_CLEARANCE);
  }
  if (normal.y < 0 && point.x >= box.left && point.x <= box.right && point.y > box.top) {
    return Math.max(fallbackLength, point.y - box.top + ROUTE_CLEARANCE);
  }
  return fallbackLength;
}

function endpointStubPoint(point: Point, normal: Point, node: ModelNode, blockers: ModelNode[], fallbackLength = ROUTE_ENDPOINT_STUB_LENGTH) {
  const length = endpointStubLengthOutsideOwnBody(point, normal, node, fallbackLength);
  return safeStubPoint(point, normal, blockers, length);
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
  const routeBlockers = filterBlockersForRoutePoints(points, blockers);
  const routeAvoidedSegments = filterSegmentsForRoutePoints(points, avoidedSegments);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (pointOutsideRoutingBounds(a, bounds) || pointOutsideRoutingBounds(b, bounds)) {
      score += 1000000;
    }
    score += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (const blocker of routeBlockers) {
      if (segmentIntersectsBox(a, b, routeBlockerBox(blocker, ROUTE_BLOCKER_PADDING))) {
        score += 10000000;
      }
    }
    for (const segment of routeAvoidedSegments) {
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

type InternalRouteSimplifyOptions = {
  blockers?: ModelNode[];
  avoidedSegments?: Segment[];
  reduceTinyDoglegs?: boolean;
};

export type TidyRouteOptions = {
  blockers?: ModelNode[];
};

function isProtectedRoutePointIndex(index: number, length: number) {
  return index === 0 || index === 1 || index === length - 2 || index === length - 1;
}

function segmentManhattanLength(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function routeManhattanLength(points: Point[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += segmentManhattanLength(points[index - 1], points[index]);
  }
  return length;
}

function routeBendCount(points: Point[]) {
  let bends = 0;
  let previousOrientation: "horizontal" | "vertical" | null = null;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const orientation = previous.y === point.y
      ? "horizontal"
      : previous.x === point.x
        ? "vertical"
        : null;
    if (!orientation) {
      continue;
    }
    if (previousOrientation && previousOrientation !== orientation) {
      bends += 1;
    }
    previousOrientation = orientation;
  }
  return bends;
}

function compactRoutePreservingEndpointStubs(points: Point[]) {
  if (points.length <= 4) {
    return points.filter((point, index) => !points[index - 1] || !samePoint(points[index - 1], point));
  }
  return points.filter((point, index) => {
    if (isProtectedRoutePointIndex(index, points.length)) {
      return true;
    }
    const previous = points[index - 1];
    if (previous && samePoint(previous, point)) {
      return false;
    }
    const next = points[index + 1];
    if (!previous || !next) {
      return true;
    }
    return !(previous.x === point.x && point.x === next.x) && !(previous.y === point.y && point.y === next.y);
  });
}

function routeCandidateIsSafe(points: Point[], options: InternalRouteSimplifyOptions) {
  const route = orthogonalizeRouteKeepingCollinear(points);
  if (routeHasImmediateReversal(route)) {
    return false;
  }
  if (options.blockers?.length && routeIntersectsBlockers(route, options.blockers, ROUTE_BLOCKER_PADDING, 1)) {
    return false;
  }
  if (options.avoidedSegments?.length && routeOverlapsSegments(route, options.avoidedSegments)) {
    return false;
  }
  return true;
}

function reduceTinyDoglegs(points: Point[], options: InternalRouteSimplifyOptions) {
  let route = compactRoutePreservingEndpointStubs(orthogonalizeRouteKeepingCollinear(points));
  for (let attempt = 0; attempt < 16; attempt += 1) {
    let changed = false;
    for (let index = 1; index < route.length - 3; index += 1) {
      const a = route[index];
      const b = route[index + 1];
      const c = route[index + 2];
      const d = route[index + 3];
      if (isProtectedRoutePointIndex(index + 1, route.length) || isProtectedRoutePointIndex(index + 2, route.length)) {
        continue;
      }
      const verticalDetour = a.x === b.x && b.y === c.y && c.x === d.x && a.y === d.y;
      const horizontalDetour = a.y === b.y && b.x === c.x && c.y === d.y && a.x === d.x;
      if (!verticalDetour && !horizontalDetour) {
        continue;
      }
      const candidate = compactRoutePreservingEndpointStubs([
        ...route.slice(0, index + 1),
        ...route.slice(index + 3)
      ]);
      if (candidate.length < route.length && routeCandidateIsSafe(candidate, options)) {
        route = candidate;
        changed = true;
        break;
      }
    }
    if (changed) {
      continue;
    }
    for (let index = 1; index < route.length - 2; index += 1) {
      const before = route[index - 1];
      const first = route[index];
      const second = route[index + 1];
      const after = route[index + 2];
      const tinySegmentLength = segmentManhattanLength(first, second);
      if (tinySegmentLength === 0 || tinySegmentLength > ROUTE_TINY_DOGLEG_LIMIT) {
        continue;
      }

      const firstProtected = isProtectedRoutePointIndex(index, route.length);
      const secondProtected = isProtectedRoutePointIndex(index + 1, route.length);
      const candidate = route.map((point) => ({ ...point }));
      if (before.y === first.y && first.x === second.x && second.y === after.y) {
        const previousLength = Math.abs(first.x - before.x);
        const nextLength = Math.abs(after.x - second.x);
        const lane = firstProtected ? first.y : secondProtected ? second.y : previousLength >= nextLength ? first.y : second.y;
        if (!firstProtected) {
          candidate[index].y = lane;
        }
        if (!secondProtected) {
          candidate[index + 1].y = lane;
        }
      } else if (before.x === first.x && first.y === second.y && second.x === after.x) {
        const previousLength = Math.abs(first.y - before.y);
        const nextLength = Math.abs(after.y - second.y);
        const lane = firstProtected ? first.x : secondProtected ? second.x : previousLength >= nextLength ? first.x : second.x;
        if (!firstProtected) {
          candidate[index].x = lane;
        }
        if (!secondProtected) {
          candidate[index + 1].x = lane;
        }
      } else {
        continue;
      }

      const compacted = compactRoutePreservingEndpointStubs(candidate);
      if (compacted.length < route.length && routeCandidateIsSafe(compacted, options)) {
        route = compacted;
        changed = true;
        break;
      }
    }
    if (!changed) {
      return route;
    }
  }
  return route;
}

function simplifyRoutePreservingEndpointStubs(points: Point[], options: InternalRouteSimplifyOptions = {}): Point[] {
  const route = orthogonalizeRouteKeepingCollinear(points);
  if (route.length <= 4) {
    return route;
  }
  const compacted = compactRoutePreservingEndpointStubs(route);
  return options.reduceTinyDoglegs ? reduceTinyDoglegs(compacted, options) : compacted;
}

export function tidyOrthogonalRoute(points: Point[], options: TidyRouteOptions = {}): Point[] {
  return simplifyRoutePreservingEndpointStubs(points, {
    blockers: options.blockers,
    reduceTinyDoglegs: true
  });
}

export function pointsToOrthogonalPath(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export type EdgePointerClick = {
  edgeId: string;
  clientX: number;
  clientY: number;
  at: number;
};

export function isRepeatedEdgePointerClick(
  previous: EdgePointerClick | null | undefined,
  next: EdgePointerClick,
  maxIntervalMs = 450,
  maxDistance = 8
): boolean {
  return Boolean(
    previous &&
    previous.edgeId === next.edgeId &&
    next.at - previous.at >= 0 &&
    next.at - previous.at <= maxIntervalMs &&
    Math.hypot(next.clientX - previous.clientX, next.clientY - previous.clientY) <= maxDistance
  );
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

export function insertOrthogonalRouteBend(
  routePoints: Point[],
  segmentIndex: number,
  pointerPoint: Point,
  bounds?: CanvasBounds,
  offset = 32,
  preferredMargin = 12
): Point[] {
  const nextPoints = routePoints.map((point) => ({ ...point }));
  const from = routePoints[segmentIndex];
  const to = routePoints[segmentIndex + 1];
  if (!from || !to || samePoint(from, to) || (from.x !== to.x && from.y !== to.y)) {
    return nextPoints;
  }
  const sideAwayFromAdjacent = (axis: "x" | "y") => {
    const sides: number[] = [];
    const previous = routePoints[segmentIndex - 1];
    const next = routePoints[segmentIndex + 2];
    if (axis === "y") {
      if (previous && previous.x === from.x && previous.y !== from.y) {
        sides.push(Math.sign(previous.y - from.y));
      }
      if (next && next.x === to.x && next.y !== to.y) {
        sides.push(Math.sign(next.y - to.y));
      }
    } else {
      if (previous && previous.y === from.y && previous.x !== from.x) {
        sides.push(Math.sign(previous.x - from.x));
      }
      if (next && next.y === to.y && next.x !== to.x) {
        sides.push(Math.sign(next.x - to.x));
      }
    }
    const adjacentBias = sides.reduce((sum, side) => sum + side, 0);
    return adjacentBias === 0 ? 0 : -Math.sign(adjacentBias);
  };
  const offsetSide = (pointerDelta: number, adjacentAxis: "x" | "y") => {
    if (Math.abs(pointerDelta) > 2) {
      return pointerDelta > 0 ? 1 : -1;
    }
    return sideAwayFromAdjacent(adjacentAxis) || 1;
  };
  const stepTowardTarget = (pivot: number, target: number) => {
    const direction = target >= pivot ? 1 : -1;
    const step = Math.min(Math.abs(offset), Math.abs(target - pivot));
    return Math.round(pivot + direction * step);
  };
  const clampCoordinate = (value: number, first: number, second: number) => {
    const min = Math.min(first, second);
    const max = Math.max(first, second);
    const margin = Math.min(preferredMargin, Math.max(0, (max - min) / 2));
    return Math.round(Math.max(min + margin, Math.min(max - margin, value)));
  };
  if (from.y === to.y) {
    const x = clampCoordinate(pointerPoint.x, from.x, to.x);
    const y = from.y;
    const bendOffsetY = Math.round(y + offsetSide(pointerPoint.y - y, "y") * Math.abs(offset));
    nextPoints.splice(
      segmentIndex + 1,
      0,
      { x, y },
      { x, y: bendOffsetY },
      { x: stepTowardTarget(x, to.x), y: bendOffsetY }
    );
  } else {
    const y = clampCoordinate(pointerPoint.y, from.y, to.y);
    const x = from.x;
    const bendOffsetX = Math.round(x + offsetSide(pointerPoint.x - x, "x") * Math.abs(offset));
    nextPoints.splice(
      segmentIndex + 1,
      0,
      { x, y },
      { x: bendOffsetX, y },
      { x: bendOffsetX, y: stepTowardTarget(y, to.y) }
    );
  }
  const bounded = bounds ? nextPoints.map((point) => clampPointToBounds(point, bounds)) : nextPoints;
  return orthogonalizeRouteKeepingCollinear(bounded);
}

type PreserveDraggedRouteShapeOptions = {
  routePoints: Point[];
  nextStart: Point;
  nextEnd: Point;
  sourceDelta?: Point;
  targetDelta?: Point;
  routeDelta?: Point;
  sourceNormal?: Point;
  targetNormal?: Point;
};

function roundPoint(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function sameDelta(first?: Point, second?: Point) {
  return Boolean(first && second && Math.round(first.x) === Math.round(second.x) && Math.round(first.y) === Math.round(second.y));
}

function nonZeroDelta(delta?: Point) {
  return Boolean(delta && (Math.round(delta.x) !== 0 || Math.round(delta.y) !== 0));
}

function draggedRouteShapeDelta(options: PreserveDraggedRouteShapeOptions): Point {
  if (options.routeDelta) {
    return options.routeDelta;
  }
  if (sameDelta(options.sourceDelta, options.targetDelta) && options.sourceDelta) {
    return options.sourceDelta;
  }
  if (nonZeroDelta(options.sourceDelta)) {
    return options.sourceDelta!;
  }
  if (nonZeroDelta(options.targetDelta)) {
    return options.targetDelta!;
  }
  return options.sourceDelta ?? options.targetDelta ?? { x: 0, y: 0 };
}

function alignTranslatedEndpointStub(points: Point[], original: Point[], endpoint: "source" | "target") {
  if (points.length < 2 || original.length < 2) {
    return;
  }
  const endpointIndex = endpoint === "source" ? 0 : points.length - 1;
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  const originalEndpoint = original[endpointIndex];
  const originalStub = original[stubIndex];
  if (!originalEndpoint || !originalStub) {
    return;
  }
  if (Math.round(originalEndpoint.x) === Math.round(originalStub.x)) {
    points[stubIndex] = { ...points[stubIndex], x: points[endpointIndex].x };
  } else if (Math.round(originalEndpoint.y) === Math.round(originalStub.y)) {
    points[stubIndex] = { ...points[stubIndex], y: points[endpointIndex].y };
  }
}

function alignEndpointStubToNormal(points: Point[], endpoint: "source" | "target", normal?: Point) {
  if (!normal || points.length < 3 || (normal.x === 0 && normal.y === 0)) {
    return;
  }
  const endpointIndex = endpoint === "source" ? 0 : points.length - 1;
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  if (endpointIndex === stubIndex) {
    return;
  }
  const endpointPoint = points[endpointIndex];
  if (!endpointPoint) {
    return;
  }
  if (normal.x !== 0) {
    points[stubIndex] = {
      x: Math.round(endpointPoint.x + Math.sign(normal.x) * ROUTE_ENDPOINT_STUB_LENGTH),
      y: endpointPoint.y
    };
    return;
  }
  points[stubIndex] = {
    x: endpointPoint.x,
    y: Math.round(endpointPoint.y + Math.sign(normal.y) * ROUTE_ENDPOINT_STUB_LENGTH)
  };
}

function setEndpointStubFromMove(points: Point[], original: Point[], endpoint: "source" | "target", normal?: Point) {
  if (points.length < 2 || original.length < 2) {
    return;
  }
  const endpointIndex = endpoint === "source" ? 0 : points.length - 1;
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  const originalEndpointIndex = endpoint === "source" ? 0 : original.length - 1;
  const originalStubIndex = endpoint === "source" ? 1 : original.length - 2;
  const endpointPoint = points[endpointIndex];
  const originalEndpoint = original[originalEndpointIndex];
  const originalStub = original[originalStubIndex];
  if (!endpointPoint || !originalEndpoint || !originalStub) {
    return;
  }
  if (normal && (normal.x !== 0 || normal.y !== 0)) {
    alignEndpointStubToNormal(points, endpoint, normal);
    return;
  }
  points[stubIndex] = roundPoint({
    x: endpointPoint.x + originalStub.x - originalEndpoint.x,
    y: endpointPoint.y + originalStub.y - originalEndpoint.y
  });
}

function alignSegmentAdjacentToMovedEndpoint(points: Point[], original: Point[], endpoint: "source" | "target") {
  if (points.length < 3 || original.length < 3) {
    return;
  }
  const stubIndex = endpoint === "source" ? 1 : points.length - 2;
  const adjacentIndex = endpoint === "source" ? 2 : points.length - 3;
  const originalStubIndex = endpoint === "source" ? 1 : original.length - 2;
  const originalAdjacentIndex = endpoint === "source" ? 2 : original.length - 3;
  const stub = points[stubIndex];
  const adjacent = points[adjacentIndex];
  const originalStub = original[originalStubIndex];
  const originalAdjacent = original[originalAdjacentIndex];
  if (!stub || !adjacent || !originalStub || !originalAdjacent) {
    return;
  }
  if (Math.round(originalStub.x) === Math.round(originalAdjacent.x)) {
    points[adjacentIndex] = { ...adjacent, x: stub.x };
  } else if (Math.round(originalStub.y) === Math.round(originalAdjacent.y)) {
    points[adjacentIndex] = { ...adjacent, y: stub.y };
  }
}

function preserveEndpointLocalRouteShape(options: PreserveDraggedRouteShapeOptions, sourceMoved: boolean, targetMoved: boolean): Point[] {
  const points = options.routePoints.map(roundPoint);
  points[0] = roundPoint(options.nextStart);
  points[points.length - 1] = roundPoint(options.nextEnd);
  if (sourceMoved || options.sourceNormal) {
    setEndpointStubFromMove(points, options.routePoints, "source", options.sourceNormal);
    alignSegmentAdjacentToMovedEndpoint(points, options.routePoints, "source");
  }
  if (targetMoved || options.targetNormal) {
    setEndpointStubFromMove(points, options.routePoints, "target", options.targetNormal);
    alignSegmentAdjacentToMovedEndpoint(points, options.routePoints, "target");
  }
  return orthogonalizeRouteKeepingCollinear(points);
}

export function preserveDraggedRouteShape(options: PreserveDraggedRouteShapeOptions): Point[] {
  if (options.routePoints.length === 0) {
    return [];
  }
  if (options.routePoints.length === 1) {
    return [roundPoint(options.nextStart)];
  }
  const sourceMoved = nonZeroDelta(options.sourceDelta);
  const targetMoved = nonZeroDelta(options.targetDelta);
  if (!options.routeDelta && (sourceMoved || targetMoved) && !sameDelta(options.sourceDelta, options.targetDelta)) {
    return preserveEndpointLocalRouteShape(options, sourceMoved, targetMoved);
  }
  const delta = draggedRouteShapeDelta(options);
  const translated = options.routePoints.map((point) =>
    roundPoint({ x: point.x + delta.x, y: point.y + delta.y })
  );
  translated[0] = roundPoint(options.nextStart);
  translated[translated.length - 1] = roundPoint(options.nextEnd);
  alignTranslatedEndpointStub(translated, options.routePoints, "source");
  alignTranslatedEndpointStub(translated, options.routePoints, "target");
  alignEndpointStubToNormal(translated, "source", options.sourceNormal);
  alignEndpointStubToNormal(translated, "target", options.targetNormal);
  return orthogonalizeRouteKeepingCollinear(translated);
}

export function getMovableRouteSegmentIndexes(routePoints: Point[]): number[] {
  const segments: Array<{ index: number; length: number }> = [];
  for (let segmentIndex = 1; segmentIndex < routePoints.length - 2; segmentIndex += 1) {
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || samePoint(from, to)) {
      continue;
    }
    if (from.x !== to.x && from.y !== to.y) {
      continue;
    }
    segments.push({ index: segmentIndex, length: segmentManhattanLength(from, to) });
  }
  const longerSegments = segments.filter((segment) => segment.length >= ROUTE_MIN_MOVABLE_SEGMENT_LENGTH);
  return (longerSegments.length > 0 ? longerSegments : segments).map((segment) => segment.index);
}

type Segment = {
  edgeId: string;
  edgeIndex: number;
  segmentIndex: number;
  lastSegmentIndex: number;
  a: Point;
  b: Point;
  orientation: "horizontal" | "vertical";
};

function getSegments(edgeId: string, edgeIndex: number, points: Point[]): Segment[] {
  const segments: Segment[] = [];
  const lastSegmentIndex = points.length - 2;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x === b.x && a.y !== b.y) {
      segments.push({ edgeId, edgeIndex, segmentIndex: index - 1, lastSegmentIndex, a, b, orientation: "vertical" });
    } else if (a.y === b.y && a.x !== b.x) {
      segments.push({ edgeId, edgeIndex, segmentIndex: index - 1, lastSegmentIndex, a, b, orientation: "horizontal" });
    }
  }
  return segments;
}

function segmentBox(segment: Segment, padding = 0) {
  return {
    left: Math.min(segment.a.x, segment.b.x) - padding,
    right: Math.max(segment.a.x, segment.b.x) + padding,
    top: Math.min(segment.a.y, segment.b.y) - padding,
    bottom: Math.max(segment.a.y, segment.b.y) + padding
  };
}

function filterBlockersForRoutePoints(points: Point[], blockers: ModelNode[], padding = ROUTE_BLOCKER_PADDING) {
  if (points.length < 2 || blockers.length === 0) {
    return [];
  }
  const routeBox = routeBoundsForPoints(points, padding);
  return blockers.filter((blocker) => boxesOverlap(routeBlockerBox(blocker, padding), routeBox));
}

function filterSegmentsForRoutePoints(points: Point[], segments: Segment[], padding = ROUTE_LANE_SEGMENT_MARGIN) {
  if (points.length < 2 || segments.length === 0) {
    return [];
  }
  const routeBox = routeBoundsForPoints(points, padding);
  return segments.filter((segment) => boxesOverlap(segmentBox(segment, padding), routeBox));
}

const CROSSING_TERMINAL_MARGIN = ROUTE_ENDPOINT_STUB_LENGTH + 2;
const CROSSING_ARC_SPATIAL_BUCKET_SIZE = 320;

function between(value: number, a: number, b: number, margin = 0) {
  return value > Math.min(a, b) + margin && value < Math.max(a, b) - margin;
}

function intersection(a: Segment, b: Segment, margin = 0): Point | null {
  if (a.orientation === b.orientation) {
    return null;
  }
  const horizontal = a.orientation === "horizontal" ? a : b;
  const vertical = a.orientation === "vertical" ? a : b;
  const point = { x: vertical.a.x, y: horizontal.a.y };
  if (between(point.x, horizontal.a.x, horizontal.b.x, margin) && between(point.y, vertical.a.y, vertical.b.y, margin)) {
    return point;
  }
  return null;
}

function distanceAlongSegment(point: Point, segmentEndpoint: Point, orientation: Segment["orientation"]) {
  return orientation === "horizontal"
    ? Math.abs(point.x - segmentEndpoint.x)
    : Math.abs(point.y - segmentEndpoint.y);
}

function pointNearRouteTerminal(point: Point, segment: Segment) {
  if (segment.segmentIndex === 0 && distanceAlongSegment(point, segment.a, segment.orientation) <= CROSSING_TERMINAL_MARGIN) {
    return true;
  }
  if (segment.segmentIndex === segment.lastSegmentIndex && distanceAlongSegment(point, segment.b, segment.orientation) <= CROSSING_TERMINAL_MARGIN) {
    return true;
  }
  return false;
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

function prioritizeLaneValues(values: number[], anchors: number[], maxCount = ROUTE_MAX_LANES_PER_AXIS) {
  const sorted = uniqueSorted(values);
  if (sorted.length <= maxCount) {
    return sorted;
  }
  const roundedAnchors = anchors.map((value) => Math.round(value));
  const anchorSet = new Set(roundedAnchors);
  const required = sorted.filter((value) => anchorSet.has(value));
  const requiredSet = new Set(required);
  const distanceToAnchor = (value: number) =>
    Math.min(...roundedAnchors.map((anchor) => Math.abs(value - anchor)));
  const optional = sorted
    .filter((value) => !requiredSet.has(value))
    .sort((first, second) => distanceToAnchor(first) - distanceToAnchor(second) || first - second);
  return uniqueSorted([...required, ...optional.slice(0, Math.max(0, maxCount - required.length))]);
}

function prioritizeLanePairs(
  xs: number[],
  ys: number[],
  startOut: Point,
  endOut: Point,
  maxCount = ROUTE_MAX_LANE_PAIRS
) {
  const midX = Math.round((startOut.x + endOut.x) / 2);
  const midY = Math.round((startOut.y + endOut.y) / 2);
  const pairScore = (x: number, y: number) => {
    const horizontalFirst = compactRoute([startOut, { x, y: startOut.y }, { x, y }, { x: endOut.x, y }, endOut]);
    const verticalFirst = compactRoute([startOut, { x: startOut.x, y }, { x, y }, { x, y: endOut.y }, endOut]);
    const horizontalScore = routeManhattanLength(horizontalFirst) * 4 + routeBendCount(horizontalFirst) * 64;
    const verticalScore = routeManhattanLength(verticalFirst) * 4 + routeBendCount(verticalFirst) * 64;
    return Math.min(horizontalScore, verticalScore) + Math.abs(x - midX) + Math.abs(y - midY);
  };
  const pairs: { x: number; y: number; score: number }[] = [];
  for (const x of xs) {
    for (const y of ys) {
      pairs.push({ x, y, score: pairScore(x, y) });
    }
  }
  if (pairs.length <= maxCount) {
    return pairs;
  }
  return pairs
    .sort((first, second) =>
      first.score - second.score ||
      Math.abs(first.x - midX) + Math.abs(first.y - midY) - (Math.abs(second.x - midX) + Math.abs(second.y - midY)) ||
      first.x - second.x ||
      first.y - second.y
    )
    .slice(0, maxCount);
}

function routeCandidatesFromLanes(
  startOut: Point,
  endOut: Point,
  xs: number[],
  ys: number[],
  maxLanePairs = ROUTE_MAX_LANE_PAIRS
) {
  const lanePairs = prioritizeLanePairs(xs, ys, startOut, endOut, maxLanePairs);
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
  for (const { x, y } of lanePairs) {
    candidates.push([startOut, { x, y: startOut.y }, { x, y }, { x: endOut.x, y }, endOut]);
    candidates.push([startOut, { x: startOut.x, y }, { x, y }, { x, y: endOut.y }, endOut]);
  }

  return candidates.map(compactRoute);
}

function candidateLanes(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds?: CanvasBounds,
  endpointNodeIds: ReadonlySet<string> = new Set()
) {
  const laneCorridor = routeCorridor(startOut, endOut, ROUTE_LANE_SEARCH_MARGIN);
  const pointTouchesBox = (point: Point, box: ReturnType<typeof boxFor>, margin = 1) =>
    point.x >= box.left - margin &&
    point.x <= box.right + margin &&
    point.y >= box.top - margin &&
    point.y <= box.bottom + margin;
  const blockerBoxes = blockers
    .map((node) => ({ node, box: boxFor(node, 32) }))
    .filter(({ node, box }) => {
      if (!boxesOverlap(box, laneCorridor)) {
        return false;
      }
      return !(
        endpointNodeIds.has(node.id) &&
        (pointTouchesBox(startOut, box) || pointTouchesBox(endOut, box))
      );
    })
    .map(({ box }) => box);
  const laneAvoidedSegments = avoidedSegments.filter((segment) =>
    boxesOverlap(segmentBox(segment, ROUTE_LANE_SEGMENT_MARGIN), laneCorridor)
  );
  const clampX = (value: number) => bounds ? Math.max(0, Math.min(bounds.width, value)) : value;
  const clampY = (value: number) => bounds ? Math.max(0, Math.min(bounds.height, value)) : value;
  const xLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.left - offset, box.right + offset])
  );
  const yLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.top - offset, box.bottom + offset])
  );
  const verticalSegmentLanes = laneAvoidedSegments
    .filter((segment) => segment.orientation === "vertical")
    .flatMap((segment) => ROUTE_AVOIDED_SEGMENT_OFFSETS.flatMap((offset) => [segment.a.x - offset, segment.a.x + offset]));
  const horizontalSegmentLanes = laneAvoidedSegments
    .filter((segment) => segment.orientation === "horizontal")
    .flatMap((segment) => ROUTE_AVOIDED_SEGMENT_OFFSETS.flatMap((offset) => [segment.a.y - offset, segment.a.y + offset]));
  const xAnchors = [
    startOut.x,
    endOut.x,
    Math.round((startOut.x + endOut.x) / 2)
  ].map(clampX);
  const yAnchors = [
    startOut.y,
    endOut.y,
    Math.round((startOut.y + endOut.y) / 2)
  ].map(clampY);
  const xValues = [
    ...xAnchors,
    ...xLaneOffsets,
    ...verticalSegmentLanes
  ].map(clampX);
  const yValues = [
    ...yAnchors,
    ...yLaneOffsets,
    ...horizontalSegmentLanes
  ].map(clampY);
  return {
    xs: prioritizeLaneValues(xValues, xAnchors),
    ys: prioritizeLaneValues(yValues, yAnchors)
  };
}

function buildRouteCandidates(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  avoidedSegments: Segment[],
  bounds?: CanvasBounds,
  endpointNodeIds?: ReadonlySet<string>
) {
  const { xs, ys } = candidateLanes(startOut, endOut, blockers, avoidedSegments, bounds, endpointNodeIds);
  return routeCandidatesFromLanes(startOut, endOut, xs, ys);
}

function expandedCandidateLanes(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  bounds?: CanvasBounds,
  endpointNodeIds: ReadonlySet<string> = new Set()
) {
  const pointTouchesBox = (point: Point, box: ReturnType<typeof boxFor>, margin = 1) =>
    point.x >= box.left - margin &&
    point.x <= box.right + margin &&
    point.y >= box.top - margin &&
    point.y <= box.bottom + margin;
  const blockerBoxes = blockers
    .map((node) => ({ node, box: boxFor(node, 32) }))
    .filter(({ node, box }) =>
      !(
        endpointNodeIds.has(node.id) &&
        (pointTouchesBox(startOut, box) || pointTouchesBox(endOut, box))
      )
    )
    .map(({ box }) => box);
  const clampX = (value: number) => bounds ? Math.max(0, Math.min(bounds.width, value)) : value;
  const clampY = (value: number) => bounds ? Math.max(0, Math.min(bounds.height, value)) : value;
  const xBoundaryLanes = bounds
    ? [32, 64, 96, bounds.width - 96, bounds.width - 64, bounds.width - 32].map(clampX)
    : [];
  const yBoundaryLanes = bounds
    ? [32, 64, 96, bounds.height - 96, bounds.height - 64, bounds.height - 32].map(clampY)
    : [];
  const xLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.left - offset, box.right + offset])
  );
  const yLaneOffsets = blockerBoxes.flatMap((box) =>
    ROUTE_LANE_OFFSETS.flatMap((offset) => [box.top - offset, box.bottom + offset])
  );
  const xAnchors = [
    startOut.x,
    endOut.x,
    Math.round((startOut.x + endOut.x) / 2),
    ...xBoundaryLanes
  ].map(clampX);
  const yAnchors = [
    startOut.y,
    endOut.y,
    Math.round((startOut.y + endOut.y) / 2),
    ...yBoundaryLanes
  ].map(clampY);
  return {
    xs: prioritizeLaneValues([...xAnchors, ...xLaneOffsets].map(clampX), xAnchors),
    ys: prioritizeLaneValues([...yAnchors, ...yLaneOffsets].map(clampY), yAnchors)
  };
}

function buildExpandedRouteCandidates(
  startOut: Point,
  endOut: Point,
  blockers: ModelNode[],
  bounds?: CanvasBounds,
  endpointNodeIds?: ReadonlySet<string>
) {
  const { xs, ys } = expandedCandidateLanes(startOut, endOut, blockers, bounds, endpointNodeIds);
  return routeCandidatesFromLanes(startOut, endOut, xs, ys, ROUTE_MAX_LANE_PAIRS * 2);
}

function selectRouteCandidate(candidates: Point[][], blockers: ModelNode[], avoidedSegments: Segment[]) {
  let bestCandidate = candidates[0];
  let bestTier = Number.POSITIVE_INFINITY;
  let bestBends = Number.POSITIVE_INFINITY;
  let bestLength = Number.POSITIVE_INFINITY;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const candidateBlockers = filterBlockersForRoutePoints(candidate, blockers);
    const candidateAvoidedSegments = filterSegmentsForRoutePoints(candidate, avoidedSegments);
    const hasImmediateReversal = routeHasImmediateReversal(candidate);
    const intersectsBlocker = routeIntersectsBlockers(candidate, candidateBlockers);
    const tier = hasImmediateReversal
      ? 3
      : !intersectsBlocker
      ? routeOverlapsSegments(candidate, candidateAvoidedSegments) ? 1 : 0
      : 2;
    if (tier > bestTier) {
      continue;
    }
    const candidateBends = routeBendCount(candidate);
    const candidateLength = routeManhattanLength(candidate);
    const candidateScore = scoreRoute(candidate, candidateBlockers, candidateAvoidedSegments);
    if (
      tier < bestTier ||
      (tier === bestTier &&
        (candidateLength < bestLength ||
          (candidateLength === bestLength &&
            (candidateBends < bestBends ||
              (candidateBends === bestBends && candidateScore < bestScore)))))
    ) {
      bestTier = tier;
      bestBends = candidateBends;
      bestLength = candidateLength;
      bestScore = candidateScore;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function pathWithCrossingArcs(route: RoutedEdge, allSegments: Segment[], routeIndex: number) {
  const crossingsBySegment = new Map<number, Point[]>();
  const currentSegments = getSegments(route.edgeId, routeIndex, route.points).filter((segment) => segment.orientation === "vertical");
  const nearbySegments = filterSegmentsForRoutePoints(route.points, allSegments, 2);

  for (const segment of currentSegments) {
    for (const other of nearbySegments) {
      if (other.edgeId === segment.edgeId || other.orientation !== "horizontal") {
        continue;
      }
      const point = intersection(segment, other);
      if (point && !pointNearRouteTerminal(point, segment) && !pointNearRouteTerminal(point, other)) {
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

type CrossingRouteBox = ReturnType<typeof routeBoundsForPoints>;

type CrossingRouteSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, number[]>;
  routeBoxes: CrossingRouteBox[];
};

const crossingRouteSpatialBucketKey = (x: number, y: number) => `${x}:${y}`;

const crossingRouteSpatialBucketRange = (box: CrossingRouteBox, bucketSize: number) => ({
  left: Math.floor(box.left / bucketSize),
  right: Math.floor(box.right / bucketSize),
  top: Math.floor(box.top / bucketSize),
  bottom: Math.floor(box.bottom / bucketSize)
});

function buildCrossingRouteSpatialIndex(routeBoxes: CrossingRouteBox[]): CrossingRouteSpatialIndex {
  const buckets = new Map<string, number[]>();
  for (let routeIndex = 0; routeIndex < routeBoxes.length; routeIndex += 1) {
    const box = routeBoxes[routeIndex];
    const range = crossingRouteSpatialBucketRange(box, CROSSING_ARC_SPATIAL_BUCKET_SIZE);
    for (let x = range.left; x <= range.right; x += 1) {
      for (let y = range.top; y <= range.bottom; y += 1) {
        const key = crossingRouteSpatialBucketKey(x, y);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(routeIndex);
        } else {
          buckets.set(key, [routeIndex]);
        }
      }
    }
  }
  return { bucketSize: CROSSING_ARC_SPATIAL_BUCKET_SIZE, buckets, routeBoxes };
}

function queryCrossingRouteSpatialIndex(index: CrossingRouteSpatialIndex, box: CrossingRouteBox): number[] {
  const range = crossingRouteSpatialBucketRange(box, index.bucketSize);
  const matches: number[] = [];
  const seen = new Set<number>();
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(crossingRouteSpatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const routeIndex of bucket) {
        if (seen.has(routeIndex) || !boxesOverlap(index.routeBoxes[routeIndex], box)) {
          continue;
        }
        seen.add(routeIndex);
        matches.push(routeIndex);
      }
    }
  }
  return matches;
}

function refreshCrossingArcPaths(
  routes: RoutedEdge[],
  changedEdgeIds?: ReadonlySet<string>,
  previousRoutes: RoutedEdge[] = []
): RoutedEdge[] {
  if (!changedEdgeIds || changedEdgeIds.size === 0) {
    const crossingSegments = routes.flatMap((route, index) => getSegments(route.edgeId, index, route.points));
    return routes.map((route, index) => ({
      ...route,
      path: pathWithCrossingArcs(route, crossingSegments, index)
    }));
  }

  const routeBoxes = routes.map((route) => routeBoundsForPoints(route.points, CROSSING_TERMINAL_MARGIN));
  const routeSpatialIndex = buildCrossingRouteSpatialIndex(routeBoxes);
  const changedBoxes: CrossingRouteBox[] = [];
  routes.forEach((route, index) => {
    if (changedEdgeIds.has(route.edgeId)) {
      changedBoxes.push(routeBoxes[index]);
    }
  });
  for (const previousRoute of previousRoutes) {
    if (changedEdgeIds.has(previousRoute.edgeId)) {
      changedBoxes.push(routeBoundsForPoints(previousRoute.points, CROSSING_TERMINAL_MARGIN));
    }
  }
  if (changedBoxes.length === 0) {
    return routes;
  }

  const refreshIndexes = new Set<number>();
  for (const changedBox of changedBoxes) {
    for (const routeIndex of queryCrossingRouteSpatialIndex(routeSpatialIndex, changedBox)) {
      refreshIndexes.add(routeIndex);
    }
  }
  if (refreshIndexes.size === 0) {
    return routes;
  }

  const segmentIndexes = new Set<number>();
  for (const refreshIndex of refreshIndexes) {
    const refreshBox = routeBoxes[refreshIndex];
    for (const routeIndex of queryCrossingRouteSpatialIndex(routeSpatialIndex, refreshBox)) {
      segmentIndexes.add(routeIndex);
    }
  }
  const crossingSegments = [...segmentIndexes].flatMap((index) =>
    getSegments(routes[index].edgeId, index, routes[index].points)
  );

  return routes.map((route, index) => {
    if (!refreshIndexes.has(index)) {
      return route;
    }
    const path = pathWithCrossingArcs(route, crossingSegments, index);
    return path === route.path ? route : { ...route, path };
  });
}

export function routeEdgesForRendering(nodes: ModelNode[], edges: Edge[], bounds?: CanvasBounds): RoutedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routed: RoutedEdge[] = [];
  const avoidedSegments: Segment[] = [];
  edges.forEach((edge) => {
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return;
    }
    const routeIndex = routed.length;
    const points = routeOrthogonalEdge(source, target, nodes, edge, avoidedSegments, bounds);
    routed.push({
      edgeId: edge.id,
      points,
      path: ""
    });
    avoidedSegments.push(...getSegments(edge.id, routeIndex, points));
  });
  const renderRoutes = routed.map((route) => ({ ...route, points: simplifyRoutePreservingEndpointStubs(route.points) }));
  return refreshCrossingArcPaths(renderRoutes);
}

export function routeEdgesForStoredRendering(nodes: ModelNode[], edges: Edge[], bounds?: CanvasBounds): RoutedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routes = edges.flatMap((edge) => {
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return [];
    }
    const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
    const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
    const sourceNormal = routeEndpointNormal(source, start, end, edge.sourceTerminalId);
    const targetNormal = routeEndpointNormal(target, end, start, edge.targetTerminalId);
    const stubLength = ROUTE_ENDPOINT_STUB_LENGTH;
    const startOut = {
      x: start.x + sourceNormal.x * stubLength,
      y: start.y + sourceNormal.y * stubLength
    };
    const endOut = {
      x: end.x + targetNormal.x * stubLength,
      y: end.y + targetNormal.y * stubLength
    };
    const middle = edge.manualPoints?.length
      ? edge.manualPoints
      : startOut.x === endOut.x || startOut.y === endOut.y
        ? []
        : [{ x: endOut.x, y: startOut.y }];
    const boundedPoints = [start, startOut, ...middle, endOut, end].map((point) =>
      bounds ? clampPointToBounds(point, bounds) : point
    );
    const points = simplifyRoutePreservingEndpointStubs(orthogonalizeRouteKeepingCollinear(boundedPoints));
    return [{
      edgeId: edge.id,
      points,
      path: pointsToOrthogonalPath(points)
    }];
  });
  return refreshCrossingArcPaths(routes);
}

export function routeEdgesForCachedStoredRendering(
  nodes: ModelNode[],
  edges: Edge[],
  affectedEdgeIds: ReadonlySet<string>,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
): RoutedEdge[] {
  if (affectedEdgeIds.size === 0 || previousRoutes.length === 0) {
    return routeEdgesForStoredRendering(nodes, edges, bounds);
  }
  const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
  const edgesToRefresh = edges.filter((edge) => affectedEdgeIds.has(edge.id) || !previousRouteById.has(edge.id));
  const refreshedRouteById = new Map(
    routeEdgesForStoredRendering(nodes, edgesToRefresh, bounds).map((route) => [route.edgeId, route])
  );
  const routes = edges.flatMap((edge) => {
    const route = affectedEdgeIds.has(edge.id) || !previousRouteById.has(edge.id)
      ? refreshedRouteById.get(edge.id)
      : previousRouteById.get(edge.id);
    return route ? [route] : [];
  });
  return refreshCrossingArcPaths(routes, affectedEdgeIds, previousRoutes);
}

export function routeEdgesForIncrementalRendering(
  nodes: ModelNode[],
  edges: Edge[],
  affectedEdgeIds: ReadonlySet<string>,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
): RoutedEdge[] {
  if (affectedEdgeIds.size === 0) {
    if (previousRoutes.length > 0) {
      if (
        previousRoutes.length === edges.length &&
        edges.every((edge, index) => previousRoutes[index]?.edgeId === edge.id)
      ) {
        return previousRoutes;
      }
      const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
      const missingEdges = edges.filter((edge) => !previousRouteById.has(edge.id));
      const missingRouteById = missingEdges.length > 0
        ? new Map(routeEdgesForStoredRendering(nodes, missingEdges, bounds).map((route) => [route.edgeId, route]))
        : new Map<string, RoutedEdge>();
      const routes = edges.flatMap((edge) => {
        const route = previousRouteById.get(edge.id) ?? missingRouteById.get(edge.id);
        return route ? [route] : [];
      });
      return refreshCrossingArcPaths(routes);
    }
    return routeEdgesForStoredRendering(nodes, edges, bounds);
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
  const missingStoredEdges = previousRoutes.length > 0
    ? edges.filter((edge) => !affectedEdgeIds.has(edge.id) && !previousRouteById.has(edge.id))
    : edges;
  const storedRoutes = [
    ...previousRoutes.filter((route) => !affectedEdgeIds.has(route.edgeId)),
    ...routeEdgesForStoredRendering(nodes, missingStoredEdges, bounds)
  ];
  const storedRouteById = new Map(storedRoutes.map((route) => [route.edgeId, route]));
  const avoidedSegments: Segment[] = [];
  edges.forEach((edge, routeIndex) => {
    if (affectedEdgeIds.has(edge.id)) {
      return;
    }
    const route = storedRouteById.get(edge.id);
    if (route) {
      avoidedSegments.push(...getSegments(edge.id, routeIndex, route.points));
    }
  });
  const routedRouteById = new Map<string, RoutedEdge>();
  edges.forEach((edge, routeIndex) => {
    if (!affectedEdgeIds.has(edge.id)) {
      return;
    }
    const source = nodeById.get(edge.sourceId) ?? (edge.sourcePoint ? createFloatingEndpointNode(edge.sourcePoint, edge.targetId ? nodeById.get(edge.targetId) : undefined) : undefined);
    const target = nodeById.get(edge.targetId) ?? (edge.targetPoint ? createFloatingEndpointNode(edge.targetPoint, edge.sourceId ? nodeById.get(edge.sourceId) : undefined) : undefined);
    if (!source || !target) {
      return;
    }
    const points = simplifyRoutePreservingEndpointStubs(routeOrthogonalEdge(source, target, nodes, edge, avoidedSegments, bounds));
    routedRouteById.set(edge.id, {
      edgeId: edge.id,
      points,
      path: ""
    });
    avoidedSegments.push(...getSegments(edge.id, routeIndex, points));
  });
  const combinedRoutes = edges.flatMap((edge) => {
    const route = routedRouteById.get(edge.id) ?? storedRouteById.get(edge.id);
    return route ? [route] : [];
  });
  return refreshCrossingArcPaths(combinedRoutes, affectedEdgeIds, previousRoutes);
}

function routeEndpointNormal(node: ModelNode, endpointPoint: Point, otherPoint: Point, terminalId?: string): Point {
  return getRouteEndpointNormal(node, endpointPoint, otherPoint, terminalId);
}

function routeSegmentMatchesNormal(endpoint: Point, adjacent: Point, normal: Point) {
  const dx = Math.round(adjacent.x - endpoint.x);
  const dy = Math.round(adjacent.y - endpoint.y);
  if (normal.x !== 0) {
    return dy === 0 && dx * Math.sign(normal.x) > 0;
  }
  if (normal.y !== 0) {
    return dx === 0 && dy * Math.sign(normal.y) > 0;
  }
  return false;
}

function routeHasImmediateReversal(points: Point[]) {
  const normalized: Point[] = [];
  for (const point of points) {
    const previous = normalized[normalized.length - 1];
    if (!previous || !samePoint(previous, point)) {
      normalized.push(point);
    }
  }
  for (let index = 1; index < normalized.length - 1; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    const next = normalized[index + 1];
    const first = {
      x: Math.round(current.x - previous.x),
      y: Math.round(current.y - previous.y)
    };
    const second = {
      x: Math.round(next.x - current.x),
      y: Math.round(next.y - current.y)
    };
    if (first.y === 0 && second.y === 0 && first.x * second.x < 0) {
      return true;
    }
    if (first.x === 0 && second.x === 0 && first.y * second.y < 0) {
      return true;
    }
  }
  return false;
}

function segmentIntersectsRouteBlocker(
  a: Point,
  b: Point,
  segmentIndex: number,
  lastSegmentIndex: number,
  node: ModelNode,
  sourceId: string,
  targetId: string
) {
  if (node.id.startsWith("floating-")) {
    return false;
  }
  if (node.id === sourceId && segmentIndex === 0) {
    return false;
  }
  if (node.id === targetId && segmentIndex === lastSegmentIndex) {
    return false;
  }
  return segmentIntersectsNodeBody(a, b, node);
}

function routeSingleConnectionForValidation(nodes: ModelNode[], edge: Edge, bounds?: CanvasBounds): RoutedEdge | null {
  return routeEdgesForRendering(nodes, [edge], bounds)[0] ?? null;
}

export function validateConnectionEdgeRoute(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
): ConnectionRouteValidationResult {
  const issues: ConnectionRouteValidationIssue[] = [];
  const edge = edges.find((item) => item.id === edgeId);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = edge ? nodeById.get(edge.sourceId) : undefined;
  const target = edge ? nodeById.get(edge.targetId) : undefined;
  if (!edge || !source || !target) {
    issues.push({
      type: "missing-endpoint",
      edgeId,
      message: "联络线缺少首端或末端设备，不能生成悬空联络线。"
    });
    return { ok: false, issues };
  }

  const route = routeSingleConnectionForValidation(nodes, edge, bounds);
  if (!route || route.points.length < 2) {
    issues.push({
      type: "missing-endpoint",
      edgeId,
      message: "联络线无法生成有效正交路径。"
    });
    return { ok: false, issues };
  }

  const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
  const first = route.points[0];
  const last = route.points[route.points.length - 1];
  if (!samePoint(first, start) || !samePoint(last, end)) {
    issues.push({
      type: "endpoint-mismatch",
      edgeId,
      message: "联络线路径首末点没有准确落在设备端子或母线连接点上。"
    });
  }

  const sourceNormal = routeEndpointNormal(source, start, end, edge.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, end, start, edge.targetTerminalId);
  if (!routeSegmentMatchesNormal(route.points[0], route.points[1], sourceNormal)) {
    issues.push({
      type: "endpoint-not-perpendicular",
      edgeId,
      nodeId: source.id,
      message: `联络线首端没有与 ${source.name} 的端子法平面保持垂直。`
    });
  }
  if (!routeSegmentMatchesNormal(route.points[route.points.length - 1], route.points[route.points.length - 2], targetNormal)) {
    issues.push({
      type: "endpoint-not-perpendicular",
      edgeId,
      nodeId: target.id,
      message: `联络线末端没有与 ${target.name} 的端子法平面保持垂直。`
    });
  }
  if (routeHasImmediateReversal(route.points)) {
    issues.push({
      type: "route-reversal",
      edgeId,
      message: "联络线路径存在原地 180 度反向折返，属于无意义走线。"
    });
  }

  const lastSegmentIndex = route.points.length - 2;
  const routeBlockers = filterBlockersForRoutePoints(route.points, nodes);
  for (let index = 1; index < route.points.length; index += 1) {
    const a = route.points[index - 1];
    const b = route.points[index];
    if (a.x !== b.x && a.y !== b.y) {
      issues.push({
        type: "non-orthogonal",
        edgeId,
        message: "联络线路径存在斜线段，必须保持横平竖直。"
      });
      continue;
    }
    if (bounds && (a.x < 0 || a.x > bounds.width || a.y < 0 || a.y > bounds.height || b.x < 0 || b.x > bounds.width || b.y < 0 || b.y > bounds.height)) {
      issues.push({
        type: "out-of-bounds",
        edgeId,
        message: "联络线路径超出模型显示区域。"
      });
    }
    for (const node of routeBlockers) {
      if (segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, source.id, target.id)) {
        issues.push({
          type: "blocked-by-node",
          edgeId,
          nodeId: node.id,
          message: `联络线路径被图元 ${node.name} 遮挡或穿越。`
        });
      }
    }
  }

  return { ok: issues.length === 0, route, issues };
}

function commitManualPointsFromRoute(points: Point[]) {
  const manualPoints = points.length > 4 ? points.slice(2, -2) : points.slice(1, -1);
  return manualPoints.map((point) => ({ ...point }));
}

function edgeWithoutManualPoints(edge: Edge): Edge {
  const next = { ...edge };
  delete next.manualPoints;
  return next;
}

function edgeWithCommitManualPoints(edge: Edge, route: RoutedEdge): Edge {
  const manualPoints = commitManualPointsFromRoute(route.points);
  const withoutManualPoints = edgeWithoutManualPoints(edge);
  return manualPoints.length > 0
    ? { ...withoutManualPoints, manualPoints }
    : withoutManualPoints;
}

type EdgeRoutingContext = {
  start: Point;
  end: Point;
  startOut: Point;
  endOut: Point;
  blockers: ModelNode[];
};

function buildEdgeRoutingContext(source: ModelNode, target: ModelNode, nodes: ModelNode[], edge?: Edge): EdgeRoutingContext {
  const start = getEdgeEndpointPoint(source, edge?.sourcePoint, edge?.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge?.targetPoint, edge?.targetTerminalId);
  const sourceNormal = isBusNode(source) ? getBusEndpointNormal(source, start, end) : getTerminalNormal(source, edge?.sourceTerminalId);
  const targetNormal = isBusNode(target) ? getBusEndpointNormal(target, end, start) : getTerminalNormal(target, edge?.targetTerminalId);
  const stubLength = ROUTE_ENDPOINT_STUB_LENGTH;
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
  return {
    start,
    end,
    startOut: endpointStubPoint(start, sourceNormal, source, blockers, stubLength),
    endOut: endpointStubPoint(end, targetNormal, target, blockers, stubLength),
    blockers
  };
}

function routeHasCommitBlockingIssue(points: Point[], nodes: ModelNode[], source: ModelNode, target: ModelNode, bounds?: CanvasBounds) {
  if (points.length < 2) {
    return true;
  }
  const lastSegmentIndex = points.length - 2;
  const routeBlockers = filterBlockersForRoutePoints(points, nodes);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x !== b.x && a.y !== b.y) {
      return true;
    }
    if (
      bounds &&
      (a.x < 0 || a.x > bounds.width || a.y < 0 || a.y > bounds.height ||
        b.x < 0 || b.x > bounds.width || b.y < 0 || b.y > bounds.height)
    ) {
      return true;
    }
    for (const node of routeBlockers) {
      if (segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, source.id, target.id)) {
        return true;
      }
    }
  }
  return false;
}

function routeEndpointSegmentsAreValid(points: Point[], source: ModelNode, target: ModelNode, edge: Edge) {
  if (points.length < 2) {
    return false;
  }
  const start = getEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
  const end = getEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
  const first = points[0];
  const last = points[points.length - 1];
  if (!samePoint(first, start) || !samePoint(last, end)) {
    return false;
  }
  const sourceNormal = routeEndpointNormal(source, start, end, edge.sourceTerminalId);
  const targetNormal = routeEndpointNormal(target, end, start, edge.targetTerminalId);
  return (
    routeSegmentMatchesNormal(points[0], points[1], sourceNormal) &&
    routeSegmentMatchesNormal(points[points.length - 1], points[points.length - 2], targetNormal)
  );
}

function routeIsSafeForCommit(
  points: Point[],
  nodes: ModelNode[],
  source: ModelNode,
  target: ModelNode,
  edge: Edge,
  bounds?: CanvasBounds
) {
  return (
    routeEndpointSegmentsAreValid(points, source, target, edge) &&
    !routeHasImmediateReversal(points) &&
    !routeHasCommitBlockingIssue(points, nodes, source, target, bounds)
  );
}

function routeSignature(points: Point[]) {
  return points.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(";");
}

function selectCommitSafeRoute(
  candidates: Point[][],
  nodes: ModelNode[],
  source: ModelNode,
  target: ModelNode,
  edge: Edge,
  avoidedSegments: Segment[],
  bounds?: CanvasBounds
): Point[] | null {
  let bestRoute: Point[] | null = null;
  let bestBends = Number.POSITIVE_INFINITY;
  let bestLength = Number.POSITIVE_INFINITY;
  let bestScore = Number.POSITIVE_INFINITY;
  const seen = new Set<string>();
  const scoreBlockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);

  for (const candidate of candidates) {
    const simplified = simplifyRoutePreservingEndpointStubs(candidate, {
      blockers: filterBlockersForRoutePoints(candidate, nodes),
      avoidedSegments: filterSegmentsForRoutePoints(candidate, avoidedSegments),
      reduceTinyDoglegs: true
    });
    const signature = routeSignature(simplified);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    const simplifiedBlockers = filterBlockersForRoutePoints(simplified, nodes);
    const simplifiedAvoidedSegments = filterSegmentsForRoutePoints(simplified, avoidedSegments);
    if (!routeIsSafeForCommit(simplified, simplifiedBlockers, source, target, edge, bounds)) {
      continue;
    }
    const candidateBends = routeBendCount(simplified);
    const candidateLength = routeManhattanLength(simplified);
    const candidateScore = scoreRoute(simplified, filterBlockersForRoutePoints(simplified, scoreBlockers), simplifiedAvoidedSegments);
    if (
      !bestRoute ||
      candidateLength < bestLength ||
      (candidateLength === bestLength &&
        (candidateBends < bestBends ||
          (candidateBends === bestBends && candidateScore < bestScore)))
    ) {
      bestRoute = simplified;
      bestBends = candidateBends;
      bestLength = candidateLength;
      bestScore = candidateScore;
    }
  }

  return bestRoute;
}

function uniquePoints(points: Point[]): Point[] {
  const seen = new Set<string>();
  const result: Point[] = [];
  for (const point of points) {
    const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(point);
  }
  return result;
}

function busEndpointCandidatePoints(bus: ModelNode, preferredPoints: Point[]): Point[] {
  if (!isBusNode(bus)) {
    return [];
  }
  if (isBoundaryBusNode(bus)) {
    return uniquePoints(preferredPoints.map((point) => projectPointToNodeBoundary(bus, point)))
      .slice(0, ROUTE_MAX_BUS_ENDPOINT_POINTS_PER_SIDE);
  }
  const halfWidth = (bus.size.width * Math.abs(getNodeScaleX(bus))) / 2;
  const localXValues = preferredPoints.map((point) => pointToNodeLocal(bus, point).x);
  return uniquePoints(localXValues.map((localX) =>
    nodeLocalToPoint(bus, {
      x: Math.max(-halfWidth, Math.min(halfWidth, localX)),
      y: 0
    })
  )).slice(0, ROUTE_MAX_BUS_ENDPOINT_POINTS_PER_SIDE);
}

function edgeWithEndpointPoint(edge: Edge, side: EdgeSide, point: Point): Edge {
  return side === "source"
    ? { ...edge, sourcePoint: point }
    : { ...edge, targetPoint: point };
}

function prioritizeBusOptimizedEdgeCandidates(
  candidates: Edge[],
  context: EdgeRoutingContext,
  maxCount = ROUTE_MAX_BUS_ENDPOINT_CANDIDATES
): Edge[] {
  if (candidates.length <= maxCount) {
    return candidates;
  }
  const distance = (first: Point, second: Point) =>
    Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
  return candidates
    .map((candidate, index) => {
      const sourcePoint = candidate.sourcePoint ?? context.start;
      const targetPoint = candidate.targetPoint ?? context.end;
      const score =
        distance(sourcePoint, targetPoint) * 4 +
        distance(sourcePoint, context.startOut) +
        distance(targetPoint, context.endOut) +
        distance(sourcePoint, context.start) +
        distance(targetPoint, context.end);
      return { candidate, index, score };
    })
    .sort((first, second) => first.score - second.score || first.index - second.index)
    .slice(0, maxCount)
    .map((item) => item.candidate);
}

function busOptimizedEdgeCandidates(edge: Edge, source: ModelNode, target: ModelNode, context: EdgeRoutingContext): Edge[] {
  let candidates = [edge];
  const expandSide = (side: EdgeSide, bus: ModelNode, preferredPoints: Point[]) => {
    if (!isBusNode(bus)) {
      return;
    }
    const points = busEndpointCandidatePoints(bus, preferredPoints);
    candidates = candidates.flatMap((candidate) =>
      points.map((point) => edgeWithEndpointPoint(candidate, side, point))
    );
  };

  expandSide("source", source, [context.start, context.endOut, context.end]);
  expandSide("target", target, [context.end, context.startOut, context.start]);

  const seen = new Set<string>();
  candidates = candidates.filter((candidate) => {
    const sourceKey = candidate.sourcePoint ? `${candidate.sourcePoint.x},${candidate.sourcePoint.y}` : "";
    const targetKey = candidate.targetPoint ? `${candidate.targetPoint.x},${candidate.targetPoint.y}` : "";
    const key = `${sourceKey}|${targetKey}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return prioritizeBusOptimizedEdgeCandidates(candidates, context, ROUTE_MAX_BUS_ENDPOINT_CANDIDATES);
}

type DesignedCommitRoute = {
  edge: Edge;
  route: RoutedEdge;
};

function designCommitSafeRoute(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds
): DesignedCommitRoute | null {
  const edge = edges.find((item) => item.id === edgeId);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const source = edge ? nodeById.get(edge.sourceId) : undefined;
  const target = edge ? nodeById.get(edge.targetId) : undefined;
  if (!edge || !source || !target) {
    return null;
  }

  const edgeForDesign = edgeWithoutManualPoints(edge);
  const avoidedSegments: Segment[] = [];
  const initialContext = buildEdgeRoutingContext(source, target, nodes, edgeForDesign);
  const candidateEdges = busOptimizedEdgeCandidates(edgeForDesign, source, target, initialContext);
  let best: (DesignedCommitRoute & { bends: number; length: number; score: number }) | null = null;
  const scoreBlockers = nodes.filter((node) => node.id !== source.id && node.id !== target.id);

  for (const candidateEdge of candidateEdges) {
    const context = buildEdgeRoutingContext(source, target, nodes, candidateEdge);
    const endpointNodeIds = new Set([source.id, target.id]);
    const selectFromMiddleCandidates = (middleCandidates: Point[][]) => {
      const fullCandidates: Point[][] = [];
      for (const middle of middleCandidates) {
        const route = buildFullRoute(context.start, context.startOut, middle.slice(1, -1), context.endOut, context.end, bounds);
        fullCandidates.push(route);
        fullCandidates.push(repairRouteAroundBlockers(route, context.blockers, bounds, 1));
      }
      return selectCommitSafeRoute(fullCandidates, nodes, source, target, candidateEdge, avoidedSegments, bounds);
    };
    let selected = selectFromMiddleCandidates(buildRouteCandidates(
      context.startOut,
      context.endOut,
      context.blockers,
      avoidedSegments,
      bounds,
      endpointNodeIds
    ));
    if (!selected) {
      selected = selectFromMiddleCandidates(buildExpandedRouteCandidates(
        context.startOut,
        context.endOut,
        context.blockers,
        bounds,
        endpointNodeIds
      ));
    }
    if (!selected) {
      continue;
    }
    const bends = routeBendCount(selected);
    const length = routeManhattanLength(selected);
    const score = scoreRoute(selected, filterBlockersForRoutePoints(selected, scoreBlockers), avoidedSegments);
    if (
      !best ||
      length < best.length ||
      (length === best.length && (bends < best.bends || (bends === best.bends && score < best.score)))
    ) {
      best = {
        edge: candidateEdge,
        route: { edgeId, points: selected, path: "" },
        bends,
        length,
        score
      };
    }
  }

  return best ? { edge: best.edge, route: best.route } : null;
}

export function prepareConnectionEdgeForCommit(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds,
  previousRoutes: RoutedEdge[] = []
): PreparedConnectionEdgeCommit {
  const edge = edges.find((item) => item.id === edgeId);
  if (!edge) {
    const validation = validateConnectionEdgeRoute(nodes, edges, edgeId, bounds, previousRoutes);
    return { ...validation };
  }

  const edgeForDesign = edgeWithoutManualPoints(edge);
  const safeDesign = designCommitSafeRoute(nodes, [edgeForDesign], edgeId, bounds);
  if (safeDesign) {
    const safeEdge = edgeWithCommitManualPoints(safeDesign.edge, safeDesign.route);
    const safeValidation = validateConnectionEdgeRoute(nodes, [safeEdge], edgeId, bounds, previousRoutes);
    if (safeValidation.ok) {
      return { ...safeValidation, edge: safeEdge };
    }
  }

  const designedRoute = routeSingleConnectionForValidation(nodes, edgeForDesign, bounds);
  if (!designedRoute) {
    const validation = validateConnectionEdgeRoute(nodes, [edgeForDesign], edgeId, bounds, previousRoutes);
    return { ...validation };
  }

  const preparedEdge = edgeWithCommitManualPoints(edgeForDesign, designedRoute);
  const validation = validateConnectionEdgeRoute(nodes, [preparedEdge], edgeId, bounds, previousRoutes);
  if (validation.ok) {
    return { ...validation, edge: preparedEdge };
  }

  return { ...validation };
}

export function rebuildSingleConnectionRoute(
  nodes: ModelNode[],
  edges: Edge[],
  edgeId: string,
  bounds?: CanvasBounds
): Edge[] {
  const edge = edges.find((item) => item.id === edgeId);
  if (!edge) {
    return edges;
  }
  const prepared = prepareConnectionEdgeForCommit(nodes, [edgeWithoutManualPoints(edge)], edgeId, bounds);
  if (!prepared.ok || !prepared.edge) {
    return edges;
  }
  return edges.map((item) => item.id === edgeId ? prepared.edge! : item);
}

function applyEdgeUpdateMap(edges: Edge[], updates: ReadonlyMap<string, Edge>): Edge[] {
  if (updates.size === 0) {
    return edges;
  }
  let changed = false;
  const nextEdges = edges.map((edge) => {
    const nextEdge = updates.get(edge.id);
    if (!nextEdge || nextEdge === edge) {
      return edge;
    }
    changed = true;
    return nextEdge;
  });
  return changed ? nextEdges : edges;
}

export function rebuildConnectionRoutesForNodes(
  nodes: ModelNode[],
  edges: Edge[],
  nodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  candidateEdges: Edge[] = edges
): Edge[] {
  const changedNodeIds = new Set(nodeIds);
  if (changedNodeIds.size === 0 || edges.length === 0 || candidateEdges.length === 0) {
    return edges;
  }

  const affectedEdges = candidateEdges.filter((edge) => changedNodeIds.has(edge.sourceId) || changedNodeIds.has(edge.targetId));
  const affectedEdgeIds = affectedEdges.map((edge) => edge.id);
  if (affectedEdgeIds.length === 0) {
    return edges;
  }

  const updates = new Map<string, Edge>();
  for (const edge of affectedEdges) {
    const edgeForDesign = edgeWithoutManualPoints(updates.get(edge.id) ?? edge);
    const prepared = prepareConnectionEdgeForCommit(nodes, [edgeForDesign], edge.id, bounds);
    if (!prepared.ok || !prepared.edge) {
      continue;
    }
    updates.set(edge.id, prepared.edge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

export function rebuildExternalConnectionRoutesForMovedNodes(
  nodes: ModelNode[],
  edges: Edge[],
  movedNodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  candidateEdges: Edge[] = edges
): Edge[] {
  const movedIds = new Set(movedNodeIds);
  if (movedIds.size === 0 || edges.length === 0 || candidateEdges.length === 0) {
    return edges;
  }

  const affectedEdgeIds = candidateEdges
    .filter((edge) => movedIds.has(edge.sourceId) !== movedIds.has(edge.targetId))
    .map((edge) => edge.id);
  if (affectedEdgeIds.length === 0) {
    return edges;
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const updates = new Map<string, Edge>();
  for (const edgeId of affectedEdgeIds) {
    const edge = updates.get(edgeId) ?? edgeById.get(edgeId);
    if (!edge) {
      continue;
    }
    const prepared = prepareConnectionEdgeForCommit(nodes, [edgeWithoutManualPoints(edge)], edgeId, bounds);
    if (!prepared.ok || !prepared.edge) {
      continue;
    }
    updates.set(edgeId, prepared.edge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

export function rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(
  nodes: ModelNode[],
  edges: Edge[],
  movedNodeIds: Iterable<string>,
  bounds?: CanvasBounds,
  candidateEdges: Edge[] = edges
): Edge[] {
  const movedIds = new Set(movedNodeIds);
  if (movedIds.size === 0 || edges.length === 0 || candidateEdges.length === 0) {
    return edges;
  }

  const internalEdges = candidateEdges.filter((edge) => movedIds.has(edge.sourceId) && movedIds.has(edge.targetId));
  if (internalEdges.length === 0) {
    return edges;
  }

  const stationaryNodes = nodes.filter((node) => !movedIds.has(node.id));
  if (stationaryNodes.length === 0) {
    return edges;
  }

  const stationaryCandidates = getRouteBlockingCandidates(stationaryNodes);
  const routeByEdgeId = new Map(routeEdgesForStoredRendering(nodes, internalEdges, bounds).map((route) => [route.edgeId, route]));
  const blockedEdgeIds = internalEdges
    .filter((edge) => {
      const route = routeByEdgeId.get(edge.id);
      if (!route) {
        return false;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, stationaryCandidates);
      return routeIntersectsSpecificNodes(route.points, edge, blockers);
    })
    .map((edge) => edge.id);
  if (blockedEdgeIds.length === 0) {
    return edges;
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const updates = new Map<string, Edge>();
  for (const edgeId of blockedEdgeIds) {
    const edge = updates.get(edgeId) ?? edgeById.get(edgeId);
    if (!edge) {
      continue;
    }
    const prepared = prepareConnectionEdgeForCommit(nodes, [edgeWithoutManualPoints(edge)], edgeId, bounds);
    if (!prepared.ok || !prepared.edge) {
      continue;
    }
    updates.set(edgeId, prepared.edge);
  }

  return applyEdgeUpdateMap(edges, updates);
}

function routeBoundsForPoints(points: Point[], padding = 0) {
  let left = points[0].x;
  let right = points[0].x;
  let top = points[0].y;
  let bottom = points[0].y;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  return {
    left: left - padding,
    right: right + padding,
    top: top - padding,
    bottom: bottom + padding
  };
}

export type RouteBlockingCandidate = {
  node: ModelNode;
  box: ReturnType<typeof boxFor>;
};

export function getRouteBlockingCandidates(blockers: ModelNode[]): RouteBlockingCandidate[] {
  return blockers.map((node) => ({ node, box: routeBlockerBox(node, ROUTE_BLOCKER_PADDING) }));
}

export function getRouteBlockingCandidateNodesFromBoxes(points: Point[], edge: Edge, candidates: RouteBlockingCandidate[]) {
  if (points.length < 2 || candidates.length === 0) {
    return [];
  }
  const routeBox = routeBoundsForPoints(points, ROUTE_BLOCKER_PADDING);
  return candidates
    .filter((candidate) =>
      candidate.node.id !== edge.sourceId &&
      candidate.node.id !== edge.targetId &&
      boxesOverlap(routeBox, candidate.box)
    )
    .map((candidate) => candidate.node);
}

export function getRouteBlockingCandidateNodes(points: Point[], edge: Edge, blockers: ModelNode[]) {
  return getRouteBlockingCandidateNodesFromBoxes(
    points,
    edge,
    getRouteBlockingCandidates(blockers)
  );
}

export function routeIntersectsSpecificNodes(points: Point[], edge: Edge, blockers: ModelNode[]) {
  if (points.length < 2 || blockers.length === 0) {
    return false;
  }
  const lastSegmentIndex = points.length - 2;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.x !== b.x && a.y !== b.y) {
      return true;
    }
    if (blockers.some((node) => segmentIntersectsRouteBlocker(a, b, index - 1, lastSegmentIndex, node, edge.sourceId, edge.targetId))) {
      return true;
    }
  }
  return false;
}

export function rerouteEdgesAroundMovedNodes(
  nodes: ModelNode[],
  edges: Edge[],
  movedNodeIds: string[],
  previousRoutes: RoutedEdge[] = [],
  bounds?: CanvasBounds,
  forceEdgeIds: Iterable<string> = [],
  searchEdges: Edge[] = edges
): Edge[] {
  const movedIds = new Set(movedNodeIds);
  if (movedIds.size === 0 || edges.length === 0) {
    return edges;
  }
  const movedNodes = nodes.filter((node) => movedIds.has(node.id));
  if (movedNodes.length === 0) {
    return edges;
  }

  const movedCandidates = movedNodes.map((node) => ({ node, box: routeBlockerBox(node, ROUTE_BLOCKER_PADDING) }));
  const previousRouteById = new Map(previousRoutes.map((route) => [route.edgeId, route]));
  const forcedEdgeIds = new Set(forceEdgeIds);
  const fallbackRoutes = previousRoutes.length > 0 ? [] : routeEdgesForRendering(nodes, searchEdges, bounds);
  const fallbackRouteById = new Map(fallbackRoutes.map((route) => [route.edgeId, route]));
  const candidateEdges = previousRoutes.length > 0
    ? searchEdges.filter((edge) => previousRouteById.has(edge.id))
    : searchEdges;
  const blockedEdgeIds = candidateEdges
    .filter((edge) => {
      if (forcedEdgeIds.has(edge.id)) {
        return true;
      }
      const route = previousRouteById.get(edge.id) ?? fallbackRouteById.get(edge.id);
      if (!route) {
        return false;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, movedCandidates);
      return routeIntersectsSpecificNodes(route.points, edge, blockers);
    })
    .map((edge) => edge.id);

  if (blockedEdgeIds.length === 0) {
    return edges;
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const updates = new Map<string, Edge>();
  for (const edgeId of blockedEdgeIds) {
    const edge = updates.get(edgeId) ?? edgeById.get(edgeId);
    if (!edge) {
      continue;
    }
    const prepared = prepareConnectionEdgeForCommit(nodes, [edgeWithoutManualPoints(edge)], edgeId, bounds, previousRoutes);
    if (!prepared.ok || !prepared.edge) {
      continue;
    }
    updates.set(edgeId, prepared.edge);
  }

  return applyEdgeUpdateMap(edges, updates);
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
  const startOut = endpointStubPoint(start, sourceNormal, source, blockers, stubLength);
  const endOut = endpointStubPoint(end, targetNormal, target, blockers, stubLength);
  if (edge?.manualPoints?.length) {
    const manualRoute = orthogonalizeRouteKeepingCollinear([start, startOut, ...edge.manualPoints, endOut, end]);
    const boundedManualRoute = bounds ? orthogonalizeRouteKeepingCollinear(manualRoute.map((point) => clampPointToBounds(point, bounds))) : manualRoute;
    const simplifiedManualRoute = simplifyRoutePreservingEndpointStubs(boundedManualRoute);
    if (
      !routeHasImmediateReversal(simplifiedManualRoute) &&
      !routeIntersectsBlockers(simplifiedManualRoute, blockers, ROUTE_BLOCKER_PADDING, 1)
    ) {
      return simplifiedManualRoute;
    }
    const repairedManualRoute = repairRouteAroundBlockers(boundedManualRoute, blockers, bounds, 1);
    const simplifiedRepairedManualRoute = simplifyRoutePreservingEndpointStubs(repairedManualRoute);
    if (
      !routeHasImmediateReversal(simplifiedRepairedManualRoute) &&
      !routeIntersectsBlockers(simplifiedRepairedManualRoute, blockers, ROUTE_BLOCKER_PADDING, 1)
    ) {
      return simplifiedRepairedManualRoute;
    }
    const candidates = buildRouteCandidates(startOut, endOut, blockers, avoidedSegments, bounds, new Set([source.id, target.id]));
    const repairedMiddle = selectRouteCandidate(candidates, blockers, avoidedSegments);
    return simplifyRoutePreservingEndpointStubs(repairRouteAroundBlockers(
      buildFullRoute(start, startOut, repairedMiddle.slice(1, -1), endOut, end, bounds),
      blockers,
      bounds,
      1
    ), { blockers, avoidedSegments, reduceTinyDoglegs: true });
  }
  const candidates = buildRouteCandidates(startOut, endOut, blockers, avoidedSegments, bounds, new Set([source.id, target.id]));
  const routedMiddle = selectRouteCandidate(candidates, blockers, avoidedSegments);
  return simplifyRoutePreservingEndpointStubs(repairRouteAroundBlockers(
    buildFullRoute(start, startOut, routedMiddle.slice(1, -1), endOut, end, bounds),
    blockers,
    bounds,
    1
  ), { blockers, avoidedSegments, reduceTinyDoglegs: true });
}
