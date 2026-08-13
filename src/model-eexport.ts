// E 文件导出相关类型、常量和函数（从 model.ts 提取）

import {
  type ModelNode, type Terminal, type TerminalType, type ProjectFile, type DeviceTemplate,
  type DeviceParameterDefinition, type DeviceStateDefinition, type Edge,
  baseDeviceKind, isContainerParams, staticComponentLibraryFromParams, staticComponentLibraryForNodeLike,
  templateDerivedComponentLibraryInfo, electricGenerationDerivedComponentLibraryInfo,
  normalizeRunStatForE, normalizeSwitchStatusForE, normalizeControlTypeForE,
  normalizeAcGeneratorControlTypeForE, normalizeDcGeneratorControlTypeForE,
  normalizeDcacAcControlTypeForE, normalizeDcacDcControlTypeForE,
  normalizeAcacEndpointControlTypeForE, normalizeDcdcEndpointControlTypeForE,
  acacConverterControlTypePairForE, dcdcConverterControlTypePairForE, dcacConverterControlTypePairForE,
  E_NODE_REFERENCE_COLUMNS, numericNodeReference, mappedLegacyEValue,
  CUSTOM_PARAM_DEFINITIONS_KEY, deviceParamValue, enumExportValueForDefinition,
  toSnakeCaseDeviceParamName, normalizeVoltageBaseInput, terminalVoltageBaseNumber,
  readVoltageLevelSettings, calculateElectricalTopology, isStaticNode, isBusNode,
  getTemplateParameterDefinitions, associatedNodeColumnValue,
  containerRelationCounterKey, parseContainerRelationField, isContainerTransformerRelationKey,
  DEFAULT_POWER_BASE_VALUE, DEFAULT_VOLTAGE_UNIT, DEFAULT_POWER_UNIT, DEFAULT_CURRENT_UNIT,
  ELEMENT_TREE_COMPONENT_LIBRARY_LABELS, COMPONENT_LIBRARY_REVERSE_MAPPING,
  topologyNodeNumberForEField, normalizeTemplateDefinitionList,
  validateNodeEnumParameters
} from "./model";

export const E_SECTION_COLUMNS: Record<string, string[]> = {
  StaticTextSymbol: [],
  StaticMediaSymbol: [],
  StaticBasicShape: [],
  StaticFlowNode: [],
  StaticButton: [],
  StaticContainerSymbol: [],
  StaticConnectorSymbol: [],
  StaticAnnotationSymbol: [],
  ACRealBs: ["idx", "name", "node", "v_max", "v_min", "run_stat"],
  DCRealBs: ["idx", "name", "node", "v_max", "v_min", "run_stat"],
  ACNode: ["idx", "name", "vbase", "run_stat"],
  DCNode: ["idx", "name", "vbase", "voltage", "isl", "run_stat"],
  ACBranch: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_max", "r", "x", "b", "run_stat"],
  DCBranch: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_max", "r", "run_stat"],
  ACLoad: [
    "idx",
    "name",
    "node",
    "rated_capacity",
    "pbase",
    "p_set",
    "p_max",
    "p_min",
    "pv0",
    "pv1",
    "pv2",
    "qbase",
    "q_max",
    "q_min",
    "qv0",
    "qv1",
    "qv2",
    "v_max",
    "v_min",
    "run_stat"
  ],
  DCLoad: [
    "idx",
    "name",
    "node",
    "rated_capacity",
    "pbase",
    "p_set",
    "p_max",
    "p_min",
    "pv0",
    "pv1",
    "pv2",
    "v_max",
    "v_min",
    "run_stat"
  ],
  ACGenerator: [
    "idx",
    "name",
    "node",
    "rated_capacity",
    "rated_voltage",
    "control_type",
    "p_set",
    "p_max",
    "p_min",
    "q_set",
    "q_max",
    "q_min",
    "v_set",
    "v_max",
    "v_min",
    "alpha",
    "regable",
    "run_stat"
  ],
  DCGenerator: [
    "idx",
    "name",
    "node",
    "rated_capacity",
    "rated_voltage",
    "control_type",
    "v_set",
    "p_set",
    "p_max",
    "p_min",
    "i_set",
    "v_max",
    "v_min",
    "run_stat"
  ],
  ACCompensator: ["idx", "name", "dev_type", "node", "rated_voltage", "rated_reactive_power", "reactance", "run_stat"],
  ACSeriCompensator: ["idx", "name", "dev_type", "i_node", "j_node", "rated_voltage", "rated_reactive_power", "reactance", "run_stat"],
  ACZeroBranch: ["idx", "name", "i_node", "j_node", "run_stat"],
  DCZeroBranch: ["idx", "name", "i_node", "j_node", "run_stat"],
  ACSwitch: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_max", "status", "run_stat"],
  DCSwitch: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_max", "status", "run_stat"],
  ACBreak: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_max", "status", "run_stat"],
  DCBreak: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_max", "status", "run_stat"],
  GroundDisconnector: ["idx", "name", "node", "rated_capacity", "i_max", "status", "run_stat"],
  ACTransformer: ["idx", "name", "i_node", "j_node", "rated_capacity", "high_i_max", "low_i_max", "r", "x", "gt", "bt", "tap", "shift", "run_stat"],
  ACTransWinding: ["idx", "name", "i_node", "j_node", "r", "x", "gt", "bt", "tap", "shift", "run_stat"],
  ACTransfomer3: [
    "idx",
    "name",
    "t1_node",
    "t2_node",
    "t3_node",
    "neutral_node",
    "high_rated_capacity",
    "high_i_max",
    "medium_rated_capacity",
    "medium_i_max",
    "low_rated_capacity",
    "low_i_max",
    "r1",
    "x1",
    "gt1",
    "bt1",
    "tap1",
    "shift1",
    "r2",
    "x2",
    "gt2",
    "bt2",
    "tap2",
    "shift2",
    "r3",
    "x3",
    "gt3",
    "bt3",
    "tap3",
    "shift3",
    "run_stat"
  ],
  DCDCConverter: [
    "idx",
    "name",
    "i_node",
    "j_node",
    "rated_capacity",
    "i_p_max",
    "i_p_min",
    "i_i_max",
    "i_v_max",
    "i_v_min",
    "j_p_max",
    "j_p_min",
    "j_i_max",
    "j_v_max",
    "j_v_min",
    "r1",
    "r2",
    "i_control_type",
    "j_control_type",
    "p_set",
    "i_set",
    "v_set",
    "run_stat"
  ],
  DCACConverter: [
    "idx",
    "name",
    "ac_node",
    "dc_node",
    "rated_capacity",
    "ac_p_max",
    "ac_p_min",
    "ac_q_max",
    "ac_q_min",
    "ac_i_max",
    "ac_v_max",
    "ac_v_min",
    "dc_p_max",
    "dc_p_min",
    "dc_i_max",
    "dc_v_max",
    "dc_v_min",
    "r1",
    "r2",
    "ac_control_type",
    "dc_control_type",
    "p_ac_set",
    "q_ac_set",
    "v_ac_set",
    "p_dc_set",
    "v_dc_set",
    "run_stat"
  ],
  ACACConverter: [
    "idx",
    "name",
    "i_node",
    "j_node",
    "rated_capacity",
    "i_p_max",
    "i_p_min",
    "i_q_max",
    "i_q_min",
    "i_i_max",
    "i_v_max",
    "i_v_min",
    "j_p_max",
    "j_p_min",
    "j_q_max",
    "j_q_min",
    "j_i_max",
    "j_v_max",
    "j_v_min",
    "r1",
    "r2",
    "i_control_type",
    "j_control_type",
    "p_set",
    "i_q_set",
    "j_q_set",
    "i_v_set",
    "j_v_set",
    "run_stat"
  ],
  HydroNode: ["idx", "name", "pressure", "run_stat"],
  HydroSource: ["idx", "name", "node", "rated_capacity", "control_type", "pressure_set", "pressure_max", "pressure_min", "flow_set", "flow_max", "flow_min", "run_stat"],
  HydroLoad: ["idx", "name", "node", "rated_capacity", "control_type", "pressure_set", "pressure_max", "pressure_min", "flow_set", "flow_max", "flow_min", "run_stat"],
  HydroPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroCompressor: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroPressRegulator: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HydroBus: ["idx", "name", "node", "run_stat"],
  HydroStorage: [
    "idx", "name", "node", "control_type", "pressure_set", "flow_set", "alpha",
    "flow_min", "flow_max", "run_stat", "pressure", "capacity", "water_volume",
    "initial_soc", "pressure_max", "pressure_min"
  ],
  AcE2Hydro: ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_h2_unit_t2"],
  DcE2Hydro: ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_h2_unit_t2"],
  Hydro2AcE: ["idx", "name", "control_type", "h2e_coeff", "run_stat", "idx_ac_unit_t1", "idx_h2_load_t2"],
  Hydro2DcE: ["idx", "name", "control_type", "h2e_coeff", "run_stat", "idx_dc_unit_t1", "idx_h2_load_t2"],
  HeatNode: ["idx", "name", "pressure", "supply_temperature", "return_temperature", "run_stat"],
  HeatSource: ["idx", "name", "node", "supply_temperature_set", "run_stat"],
  HeatSource2: ["idx", "name", "i_node", "j_node", "supply_temperature_set", "run_stat"],
  HeatLoad: ["idx", "name", "node", "run_stat"],
  HeatLoad2: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HeatBus: ["idx", "name", "node", "run_stat"],
  HeatStorage: ["idx", "name", "node", "run_stat"],
  HeatBoiler: ["idx", "name", "run_stat", "idx_heat_unit_t1"],
  HeatBoiler2: ["idx", "name", "run_stat", "idx_heat2_unit_t1"],
  AcE2Heat: ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"],
  DcE2Heat: ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"],
  AcE2Heat2: ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_ac_load_t1", "idx_heat2_unit_t2"],
  DcE2Heat2: ["idx", "name", "control_type", "e2h_coeff", "run_stat", "idx_dc_load_t1", "idx_heat2_unit_t2"],
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
  "hydrogen-tank": "HydroStorage",
  "hydrogen-tank-horizontal": "HydroStorage",
  "hydrogen-tank-container": "HydroStorage",
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
  "thermal-storage-tank": "HeatStorage",
  "heat-boiler": "HeatBoiler",
  "two-port-heat-boiler": "HeatBoiler2",
  "ac-heater": "AcE2Heat",
  "dc-heater": "DcE2Heat",
  "ac-two-port-heater": "AcE2Heat2",
  "dc-two-port-heater": "DcE2Heat2",
  "heat-exchanger": "HeatExchanger",
  "three-port-heat-exchanger": "HeatExchanger3",
  "four-port-heat-exchanger": "HeatExchanger4",
  "heat-pump": "HeatPump"
};

export function inferESection(kind: string, params: Record<string, string> = {}) {
  const sectionKind = baseDeviceKind(kind);
  if (sectionKind === "ac-bus") return "ACRealBs";
  if (sectionKind === "dc-bus") return "DCRealBs";
  const componentLibrary = staticComponentLibraryFromParams(params);
  const staticComponentLibrary = staticComponentLibraryForNodeLike(sectionKind, params);
  if (staticComponentLibrary) {
    return componentLibrary && componentLibrary !== "StaticSymbol" ? componentLibrary : staticComponentLibrary;
  }
  if (componentLibrary) {
    return componentLibrary === "ACShuntCompensator" ? "ACCompensator" : componentLibrary;
  }
  const mappedSection = E_KIND_SECTION_MAP[sectionKind];
  if (mappedSection) {
    return mappedSection;
  }
  const derivedComponentInfo = templateDerivedComponentLibraryInfo({ kind: sectionKind, params });
  if (derivedComponentInfo) {
    return derivedComponentInfo.baseComponentLibrary;
  }
  if (isContainerParams(params)) {
    return "";
  }
  if (sectionKind === "ac-line") return "ACBranch";
  if (sectionKind === "ac-capacitor" || sectionKind === "ac-reactor" || sectionKind === "ac-shunt") return "ACCompensator";
  if (sectionKind === "ac-series-capacitor" || sectionKind === "ac-series-reactor") return "ACSeriCompensator";
  if (sectionKind === "dc-line") return "DCBranch";
  if (sectionKind === "ac-zero-branch") return "ACZeroBranch";
  if (sectionKind === "ac-zero-routable-branch") return "ACZeroBranch";
  if (sectionKind === "dc-zero-branch") return "DCZeroBranch";
  if (sectionKind === "dc-zero-routable-branch") return "DCZeroBranch";
  if (sectionKind === "ac-load" || sectionKind === "ac-terminal-transformer-load") return "ACLoad";
  if (sectionKind === "dc-load") return "DCLoad";
  if (sectionKind === "ac-storage") return "ACGenerator";
  if (sectionKind === "dc-storage") return "DCGenerator";
  if (sectionKind.startsWith("ac-") && sectionKind.includes("source")) return "ACGenerator";
  if (sectionKind.startsWith("dc-") && sectionKind.includes("source")) return "DCGenerator";
  if (sectionKind === "ac-switch" || sectionKind === "ac-disconnector") return "ACSwitch";
  if (sectionKind === "ac-ground-disconnector" || sectionKind === "ac-ground-disconnector-vertical") return "GroundDisconnector";
  if (sectionKind === "dc-switch" || sectionKind === "dc-disconnector") return "DCSwitch";
  if (sectionKind === "ac-breaker" || sectionKind === "ac-box-breaker") return "ACBreak";
  if (sectionKind === "dc-breaker") return "DCBreak";
  if (sectionKind === "ac-transformer" || sectionKind === "ac-two-winding-transformer") return "ACTransformer";
  if (sectionKind === "ac-three-winding-transformer" || sectionKind === "ac-three-winding-transformer-neutral") return "ACTransfomer3";
  if (sectionKind === "dcdc-converter") return "DCDCConverter";
  if (sectionKind === "acdc-converter" || sectionKind === "dcac-converter") return "DCACConverter";
  if (sectionKind === "acac-converter") return "ACACConverter";
  return "";
}

export type EDeviceExport = {
  id: string;
  kind: string;
  section: string;
  params: Record<string, string>;
  columns?: string[];
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
  "ACCompensator",
  "ACSeriCompensator",
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
  "HydroNode",
  "HydroSource",
  "HydroLoad",
  "HydroPipe",
  "HydroCompressor",
  "HydroPressRegulator",
  "HydroStopValve",
  "HydroBus",
  "HydroStorage",
  "AcE2Hydro",
  "DcE2Hydro",
  "Hydro2AcE",
  "Hydro2DcE",
  "HeatNode",
  "HeatSource",
  "HeatSource2",
  "HeatLoad",
  "HeatLoad2",
  "HeatPipe",
  "HeatStopValve",
  "HeatBus",
  "HeatStorage",
  "HeatBoiler",
  "HeatBoiler2",
  "AcE2Heat",
  "DcE2Heat",
  "AcE2Heat2",
  "DcE2Heat2",
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
  "t1_node",
  "t2_node",
  "t3_node",
  "neutral_node",
  "isl",
  "status",
  "run_stat"
]);

const E_FLOAT_COLUMNS = new Set([
  "vbase",
  "voltage",
  "angle",
  "pbase",
  "qbase",
  "rated_capacity",
  "rated_voltage",
  "i_max",
  "high_rated_capacity",
  "high_i_max",
  "medium_rated_capacity",
  "medium_i_max",
  "low_rated_capacity",
  "low_i_max",
  "pv0",
  "pv1",
  "pv2",
  "qv0",
  "qv1",
  "qv2",
  "p_set",
  "flow_set",
  "pressure_set",
  "pressure_max",
  "pressure_min",
  "flow_max",
  "flow_min",
  "p_max",
  "p_min",
  "q_set",
  "q_max",
  "q_min",
  "i_set",
  "v_set",
  "v_max",
  "v_min",
  "ac_p_max",
  "ac_p_min",
  "ac_i_max",
  "ac_v_max",
  "ac_v_min",
  "dc_p_max",
  "dc_p_min",
  "dc_i_max",
  "dc_v_max",
  "dc_v_min",
  "i_p_max",
  "i_p_min",
  "i_i_max",
  "i_v_max",
  "i_v_min",
  "j_p_max",
  "j_p_min",
  "j_i_max",
  "j_v_max",
  "j_v_min",
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
  "x1",
  "gt1",
  "bt1",
  "tap1",
  "shift1",
  "r2",
  "x2",
  "gt2",
  "bt2",
  "tap2",
  "shift2",
  "r3",
  "x3",
  "gt3",
  "bt3",
  "tap3",
  "shift3",
  "p_ac_set",
  "p_dc_set",
  "q_ac_set",
  "v_ac_set",
  "v_dc_set",
  "i_q_set",
  "j_q_set",
  "i_v_set",
  "j_v_set",
  "supply_temperature",
  "supply_temperature_set",
  "e2h_coeff",
  "h2e_coeff"
]);

function getRawEParamValue(
  key: string,
  node: Pick<ModelNode, "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  options: EParamValueOptions = {}
) {
  const section = inferESection(node.kind, node.params);
  if (key === "name") {
    return node.name;
  }
  if (key === "dev_type") {
    return String(node.params.dev_type ?? "").trim() || node.kind;
  }
  if (key === "run_stat") {
    return normalizeRunStatForE(node.params.run_stat);
  }
  if (key === "status") {
    return normalizeSwitchStatusForE(node.params.status ?? node.params.closedStatus);
  }
  if ((key === "ac_control_type" || key === "dc_control_type") && section === "DCACConverter") {
    return dcacConverterControlTypePairForE(node.params)[key];
  }
  if ((key === "i_control_type" || key === "j_control_type") && section === "ACACConverter") {
    return acacConverterControlTypePairForE(node.params)[key];
  }
  if ((key === "i_control_type" || key === "j_control_type") && section === "DCDCConverter") {
    return dcdcConverterControlTypePairForE(node.params)[key];
  }
  if (key === "control_type") {
    if (section === "ACGenerator") {
    return normalizeAcGeneratorControlTypeForE(
        node.params.control_type ?? deviceParamValue(node.params, "control_type") ?? deviceParamValue(node.params, "ac_control_type") ?? deviceParamValue(node.params, "source_control_type") ?? ""
      );
    }
    if (section === "DCGenerator") {
      return normalizeDcGeneratorControlTypeForE(
        node.params.control_type ?? deviceParamValue(node.params, "control_type") ?? deviceParamValue(node.params, "dc_control_type") ?? deviceParamValue(node.params, "source_control_type") ?? ""
      );
    }
    if (section === "DCACConverter" || section === "ACACConverter" || section === "DCDCConverter") return "";
    return normalizeControlTypeForE(
      node.params.control_type ??
        deviceParamValue(node.params, "control_type") ??
        deviceParamValue(node.params, "ac_control_type") ??
        deviceParamValue(node.params, "dc_control_type") ??
        deviceParamValue(node.params, "source_control_type") ??
        ""
    );
  }
  if (key === "vbase") {
    return node.params.vbase ?? node.terminals[0]?.vbase ?? "";
  }
  if (key === "vltp") {
    return String(node.params.vltp ?? node.params.vbase ?? node.terminals[0]?.vbase ?? "").trim();
  }
  if (key === "realbs") {
    return section === "ACRealBs" ? "1" : "0";
  }
  if (key === "ist") {
    return "1";
  }
  if (E_NODE_REFERENCE_COLUMNS.has(key)) {
    if (key === "neutral_node" && isThreeWindingTransformer(node) && node.kind !== "ac-three-winding-transformer-neutral") {
      return "0";
    }
    const topologyNodeNumber = topologyNodeNumberForEField(node, key);
    if (topologyNodeNumber) {
      return topologyNodeNumber;
    }
    return options.preferTopologyNodeNumbers ? "" : numericNodeReference(node.params[key]);
  }
  if (isThreeWindingTransformer(node)) {
    const sideParameterMatch = /^(r|x|gt|bt|tap|shift)([123])$/.exec(key);
    if (sideParameterMatch) {
      const sidePrefix = ["high", "medium", "low"][Number.parseInt(sideParameterMatch[2], 10) - 1];
      const parameterSuffix: Record<string, string> = {
        r: "resistance_pu",
        x: "reactance_pu",
        gt: "magnetizing_conductance_pu",
        bt: "magnetizing_susceptance_pu",
        tap: "tap_ratio",
        shift: "shift"
      };
      return node.params[key] ?? deviceParamValue(node.params, `${sidePrefix}_${parameterSuffix[sideParameterMatch[1]]}`) ?? "";
    }
  }
  return mappedLegacyEValue(key, node.params);
}

function customEParameterDefinitions(params: Record<string, string>) {
  try {
    const parsed = JSON.parse(params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeTemplateDefinitionList(parsed)
      .filter((definition) => definition.enName && !definition.enName.startsWith("_") && definition.enName !== "component_type");
  } catch {
    return [];
  }
}

type EParameterField = {
  sourceName: string;
  exportName: string;
  definition?: DeviceParameterDefinition;
};

export type EFileInterfaceFieldDefinition = {
  sourceName: string;
  cnName?: string;
  exportEnabled?: boolean;
  exportName?: string;
  readonly?: boolean;
  definition?: DeviceParameterDefinition;
};

export type EFileInterfaceSectionDefinition = {
  componentLibrary: string;
  categoryLibrary?: string;
  label?: string;
  exportEnabled?: boolean;
  exportName?: string;
  derivedFromComponentLibrary?: string;
  isDerivedComponentLibrary?: boolean;
  isContainerComponentLibrary?: boolean;
  tableId?: string;
  fields?: readonly EFileInterfaceFieldDefinition[];
};

export type EFileExportOptions = {
  interfaceDefinitions?: readonly EFileInterfaceSectionDefinition[];
  eDeviceDefinitionLabels?: Record<string, string>;
  eDeviceDefinitionTemplateFields?: Record<string, Array<{ sourceName?: string; exportName: string; cnName: string }>>;
  /** 元件库 -> 表号（如 ACGenerator -> "00411"），用于导出时计算 id */
  eDeviceDefinitionTableIds?: Record<string, string>;
};

function normalizeGasQuantityFieldName(value: unknown): string {
  const text = String(value ?? "").trim();
  return /^(?:gasQuantity|gasquantity)$/.test(text) ? "gas_quantity" : text;
}

function normalizeEFileInterfaceDefinition(
  definition: EFileInterfaceSectionDefinition
): EFileInterfaceSectionDefinition {
  return {
    ...definition,
    fields: (definition.fields ?? []).map((field) => ({
      ...field,
      sourceName: normalizeGasQuantityFieldName(field.sourceName),
      ...(field.exportName !== undefined
        ? { exportName: normalizeGasQuantityFieldName(field.exportName) }
        : {})
    }))
  };
}

function eFileInterfaceDefinitionIndex(options: EFileExportOptions = {}) {
  const index = new Map(
    (options.interfaceDefinitions ?? [])
      .map((definition) => [
        String(definition.componentLibrary ?? "").trim(),
        normalizeEFileInterfaceDefinition(definition)
      ] as const)
      .filter(([componentLibrary]) => Boolean(componentLibrary))
  );
  // 从模板字段定义为运行时生成的表（ACNode/DCNode）构造接口定义
  if (options.eDeviceDefinitionTemplateFields) {
    for (const [componentLibrary, templateFields] of Object.entries(options.eDeviceDefinitionTemplateFields)) {
      if (componentLibrary && templateFields && templateFields.length > 0 && !index.has(componentLibrary)) {
        index.set(componentLibrary, {
          componentLibrary,
          tableId: options.eDeviceDefinitionTableIds?.[componentLibrary],
          fields: templateFields.map((tf) => ({
            sourceName: normalizeGasQuantityFieldName(tf.sourceName ?? tf.exportName),
            exportName: normalizeGasQuantityFieldName(tf.exportName),
            cnName: tf.cnName
          }))
        });
      }
    }
  }
  // 若 interfaceDefinitions 未携带表号，从 eDeviceDefinitionTableIds 补充
  if (options.eDeviceDefinitionTableIds) {
    for (const [componentLibrary, definition] of index) {
      if (!definition.tableId && options.eDeviceDefinitionTableIds[componentLibrary]) {
        definition.tableId = options.eDeviceDefinitionTableIds[componentLibrary];
      }
    }
  }
  return index;
}

const LEGACY_E_DEFINITION_COLUMN_ALIASES: Record<string, string> = {
  maxCurrent: "i_max",
  max_current: "i_max",
  iMax: "i_max",
  highMaxCurrent: "high_i_max",
  high_max_current: "high_i_max",
  highIMax: "high_i_max",
  mediumMaxCurrent: "medium_i_max",
  medium_max_current: "medium_i_max",
  mediumIMax: "medium_i_max",
  lowMaxCurrent: "low_i_max",
  low_max_current: "low_i_max",
  lowIMax: "low_i_max",
  ratedPower: "rated_capacity",
  rated_power: "rated_capacity",
  ratedActivePower: "pbase",
  rated_active_power: "pbase",
  ratedReactivePower: "qbase",
  rated_reactive_power: "qbase",
  resistancePu: "r",
  resistance_pu: "r",
  reactancePu: "x",
  reactance_pu: "x",
  halfChargingSusceptancePu: "b",
  half_charging_susceptance_pu: "b",
  magnetizingConductancePu: "gt",
  magnetizing_conductance_pu: "gt",
  magnetizingSusceptancePu: "bt",
  magnetizing_susceptance_pu: "bt",
  tapRatio: "tap",
  tap_ratio: "tap",
  sourceEquivalentResistance: "r1",
  source_equivalent_resistance: "r1",
  targetEquivalentResistance: "r2",
  target_equivalent_resistance: "r2",
  controlType: "control_type",
  acControlType: "control_type",
  ac_control_type: "control_type",
  dcControlType: "control_type",
  dc_control_type: "control_type",
  closedStatus: "status"
};

function isUnsupportedDcacControlField(section: string, enName: string): boolean {
  if (section !== "DCACConverter") {
    return false;
  }
  const rawName = String(enName ?? "").trim();
  const normalizedName = toSnakeCaseDeviceParamName(rawName);
  if (normalizedName === "control_type") {
    return true;
  }
  return (normalizedName === "ac_control_type" || normalizedName === "dc_control_type")
    && rawName !== normalizedName;
}

export function legacyEColumnForDefinition(section: string, enName: string): string {
  const columns = E_SECTION_COLUMNS[section];
  if (!columns) {
    return "";
  }
  if (isUnsupportedDcacControlField(section, enName)) {
    return "";
  }
  if (columns.includes(enName)) {
    return enName;
  }
  if (section === "ACACConverter" || section === "DCDCConverter") {
    const normalizedName = toSnakeCaseDeviceParamName(enName);
    if (normalizedName === "control_type") return "";
    if (normalizedName === "i_control_type" || normalizedName === "source_control_type") return "i_control_type";
    if (normalizedName === "j_control_type" || normalizedName === "target_control_type") return "j_control_type";
  }
  if (enName === "t1_node") {
    if (columns.includes("i_node")) return "i_node";
    if (columns.includes("node")) return "node";
  }
  if (enName === "t2_node" && columns.includes("j_node")) {
    return "j_node";
  }
  if (enName === "sourceControlType" || enName === "source_control_type") {
    if (columns.includes("i_control_type")) return "i_control_type";
    if (columns.includes("control_type")) return "control_type";
  }
  if (enName === "targetControlType" || enName === "target_control_type") {
    if (columns.includes("j_control_type")) return "j_control_type";
    if (columns.includes("control_type")) return "control_type";
  }
  if (section === "ACTransfomer3") {
    const sideMatch =
      /^(high|medium|low)(ResistancePu|ReactancePu|MagnetizingConductancePu|MagnetizingSusceptancePu|TapRatio|Shift)$/.exec(enName) ??
      /^(high|medium|low)_(resistance_pu|reactance_pu|magnetizing_conductance_pu|magnetizing_susceptance_pu|tap_ratio|shift)$/.exec(enName);
    if (sideMatch) {
      const sideIndex = { high: "1", medium: "2", low: "3" }[sideMatch[1] as "high" | "medium" | "low"];
      const prefix = {
        ResistancePu: "r",
        ReactancePu: "x",
        MagnetizingConductancePu: "gt",
        MagnetizingSusceptancePu: "bt",
        TapRatio: "tap",
        Shift: "shift",
        resistance_pu: "r",
        reactance_pu: "x",
        magnetizing_conductance_pu: "gt",
        magnetizing_susceptance_pu: "bt",
        tap_ratio: "tap",
        shift: "shift"
      }[sideMatch[2] as "ResistancePu" | "ReactancePu" | "MagnetizingConductancePu" | "MagnetizingSusceptancePu" | "TapRatio" | "Shift" | "resistance_pu" | "reactance_pu" | "magnetizing_conductance_pu" | "magnetizing_susceptance_pu" | "tap_ratio" | "shift"];
      const column = `${prefix}${sideIndex}`;
      return columns.includes(column) ? column : "";
    }
  }
  const alias = LEGACY_E_DEFINITION_COLUMN_ALIASES[enName];
  return alias && columns.includes(alias) ? alias : "";
}

export function resolveDeviceParameterDefinitionExportSettings(
  kind: string,
  params: Record<string, string>,
  definition: DeviceParameterDefinition
) {
  const section = inferESection(kind, params);
  const enName = String(definition.enName ?? "").trim();
  const legacyColumn = section ? legacyEColumnForDefinition(section, enName) : "";
  const configuredExportName = typeof definition.exportName === "string" ? definition.exportName.trim() : "";
  const exportEnabled = typeof definition.exportEnabled === "boolean"
    ? definition.exportEnabled
    : Boolean(section && (E_SECTION_COLUMNS[section] ? legacyColumn : enName));
  return {
    exportEnabled,
    exportName: configuredExportName || (exportEnabled ? legacyColumn || enName : "")
  };
}

function eParameterFieldsFromInterfaceDefinition(
  section: string,
  interfaceDefinition: EFileInterfaceSectionDefinition
): EParameterField[] {
  const fields: EParameterField[] = [];
  const seenExportNames = new Set<string>();
  const appendField = (field: EParameterField) => {
    if (!field.sourceName || !field.exportName || seenExportNames.has(field.exportName)) {
      return;
    }
    seenExportNames.add(field.exportName);
    fields.push(field);
  };
  for (const configuredField of interfaceDefinition.fields ?? []) {
    if (configuredField.exportEnabled === false) {
      continue;
    }
    const exportName = normalizeGasQuantityFieldName(configuredField.exportName ?? configuredField.sourceName);
    const configuredSourceName = normalizeGasQuantityFieldName(configuredField.sourceName) || exportName;
    if (!configuredSourceName || !exportName) {
      continue;
    }
    if (isUnsupportedDcacControlField(section, configuredSourceName)) {
      continue;
    }
    appendField({
      sourceName: legacyEColumnForDefinition(section, configuredSourceName) || configuredSourceName,
      exportName,
      definition: configuredField.definition
    });
  }
  return fields;
}

function resolveEParameterFields(
  kind: string,
  params: Record<string, string>,
  interfaceDefinition?: EFileInterfaceSectionDefinition
): EParameterField[] {
  const section = inferESection(kind, params);
  if (!section) {
    return [];
  }
  if (interfaceDefinition) {
    return eParameterFieldsFromInterfaceDefinition(section, interfaceDefinition);
  }
  const splitControlSections = new Set(["DCACConverter", "ACACConverter", "DCDCConverter"]);
  const definitions = customEParameterDefinitions(params).filter((definition) => {
    if (section === "DCACConverter") {
      return !isUnsupportedDcacControlField(section, definition.enName);
    }
    return !splitControlSections.has(section) || toSnakeCaseDeviceParamName(definition.enName) !== "control_type";
  });
  const builtInColumns = E_SECTION_COLUMNS[section];
  const derivedInfo = electricGenerationDerivedComponentLibraryInfo(kind);
  if (definitions.length === 0) {
    return (builtInColumns ?? []).map((column) => ({ sourceName: column, exportName: column }));
  }

  const fields: EParameterField[] = [];
  const seenExportNames = new Set<string>();
  const appendField = (field: EParameterField) => {
    if (!field.exportName || seenExportNames.has(field.exportName)) {
      return;
    }
    seenExportNames.add(field.exportName);
    fields.push(field);
  };

  if (builtInColumns) {
    const definitionByLegacyColumn = new Map<string, DeviceParameterDefinition>();
    const definitionsMappedToLegacyColumns = new Set<DeviceParameterDefinition>();
    const baseDefinitions = derivedInfo
      ? definitions.filter((definition) => isDerivedComponentCommonFieldName(definition.enName, derivedInfo.baseComponentLibrary))
      : definitions;
    for (const definition of baseDefinitions) {
      const legacyColumn = legacyEColumnForDefinition(section, definition.enName);
      if (!legacyColumn) {
        continue;
      }
      definitionsMappedToLegacyColumns.add(definition);
      const current = definitionByLegacyColumn.get(legacyColumn);
      if (!current || definition.enName === legacyColumn) {
        definitionByLegacyColumn.set(legacyColumn, definition);
      }
    }
    for (const column of builtInColumns) {
      const definition = definitionByLegacyColumn.get(column);
      if (!definition) {
        appendField({ sourceName: column, exportName: column });
        continue;
      }
      const settings = resolveDeviceParameterDefinitionExportSettings(kind, params, definition);
      if (settings.exportEnabled) {
        appendField({ sourceName: column, exportName: settings.exportName, definition });
      }
    }
    for (const definition of definitions) {
      if (definitionsMappedToLegacyColumns.has(definition)) {
        continue;
      }
      const settings = resolveDeviceParameterDefinitionExportSettings(kind, params, definition);
      if (settings.exportEnabled) {
        appendField({ sourceName: definition.enName, exportName: settings.exportName, definition });
      }
    }
    return fields;
  }

  for (const definition of definitions) {
    const settings = resolveDeviceParameterDefinitionExportSettings(kind, params, definition);
    if (settings.exportEnabled) {
      appendField({ sourceName: definition.enName, exportName: settings.exportName, definition });
    }
  }
  return fields;
}

export function getEParamValue(
  key: string,
  node: Pick<ModelNode, "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  options: EParamValueOptions = {}
) {
  const field = resolveEParameterFields(node.kind, node.params).find((item) => item.exportName === key);
  return getRawEParamValue(field?.sourceName ?? key, node, options);
}

export function getEParameterKeys(kind: string, params: Record<string, string>) {
  return resolveEParameterFields(kind, params).map((field) => field.exportName);
}

function buildEDeviceValuesFromFields(
  node: Pick<ModelNode, "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  fields: readonly EParameterField[],

  options: EParamValueOptions = {}
) {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const sourceValue = getRawEParamValue(field.sourceName, node, options);
    const value = field.definition ? enumExportValueForDefinition(field.definition, sourceValue) : sourceValue;
    if (value !== "") {
      values[field.exportName] = value;
    }
  }
  return values;
}

const DERIVED_COMPONENT_METADATA_PARAM_NAMES = new Set([
  "component_type",
  "componentType",
  "componentLibrary",
  "derived_from_component_type",
  "derivedFromComponentLibrary",
  "derived_component_type",
  "derivedComponentLibrary",
  "derived_component_library_label",
  "derivedComponentLibraryLabel",
  "is_derived_component_library",
  "isDerivedComponentLibrary"
]);

const DERIVED_COMPONENT_COMMON_PARAM_NAMES = new Set([
  "idx",
  "name",
  "dev_type",
  "status",
  "run_stat",
  "node",
  "t1_node",
  "t2_node",
  "t3_node",
  "i_node",
  "j_node",
  "control_type",
  "controlType",
  "acControlType",
  "ac_control_type",
  "dcControlType",
  "dc_control_type",
  "sourceControlType",
  "source_control_type",
  "target_control_type",
  "p_set",
  "q_set",
  "v_set",
  "i_set",
  "alpha",
  "vbase",
  "ratedPower",
  "rated_power",
  "ratedVoltage",
  "rated_voltage",
  "ratedCapacity",
  "rated_capacity",
  "sourceType",
  "source_type"
]);

function derivedComponentBaseRelationKey(baseComponentLibrary: string): string {
  const normalizedBase = baseComponentLibrary.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalizedBase ? `idx_${normalizedBase}` : "idx_base";
}

export function isDerivedComponentCommonFieldName(fieldName: string, baseComponentLibrary: string): boolean {
  if (!fieldName || fieldName.startsWith("_")) {
    return true;
  }
  return (
    DERIVED_COMPONENT_METADATA_PARAM_NAMES.has(fieldName) ||
    DERIVED_COMPONENT_COMMON_PARAM_NAMES.has(fieldName) ||
    Boolean(E_SECTION_COLUMNS[baseComponentLibrary]?.includes(fieldName))
  );
}

function resolveDerivedComponentParameterFields(
  kind: string,
  params: Record<string, string>,
  definitions: readonly DeviceParameterDefinition[],
  baseComponentLibrary: string,
  derivedComponentLibrary: string
): EParameterField[] {
  const baseFields = resolveEParameterFields(kind, { ...params, component_type: baseComponentLibrary });
  const baseFieldNames = new Set(
    baseFields.flatMap((field) => [field.sourceName, field.exportName])
  );
  const derivedParams = { ...params, component_type: derivedComponentLibrary };
  const fields: EParameterField[] = [];
  const seenExportNames = new Set<string>();
  for (const definition of definitions) {
    const sourceName = String(definition.enName ?? "").trim();
    if (
      isDerivedComponentCommonFieldName(sourceName, baseComponentLibrary) ||
      baseFieldNames.has(sourceName)
    ) {
      continue;
    }
    const settings = resolveDeviceParameterDefinitionExportSettings(kind, derivedParams, definition);
    if (!settings.exportEnabled) {
      continue;
    }
    const exportName = (settings.exportName || sourceName).trim();
    if (
      isDerivedComponentCommonFieldName(exportName, baseComponentLibrary) ||
      baseFieldNames.has(exportName) ||
      seenExportNames.has(exportName)
    ) {
      continue;
    }
    seenExportNames.add(exportName);
    fields.push({ sourceName, exportName, definition });
  }
  return fields;
}

function buildDerivedComponentEDeviceRecord(
  node: Pick<ModelNode, "id" | "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  baseIdx: string,
  derivedIdx: string,
  interfaceDefinition?: EFileInterfaceSectionDefinition
): EDeviceExport | null {
  const derivedInfo = templateDerivedComponentLibraryInfo({ kind: node.kind, params: node.params });
  if (!derivedInfo) {
    return null;
  }
  const relationKey = derivedComponentBaseRelationKey(derivedInfo.baseComponentLibrary);
  const configuredFields = interfaceDefinition
    ? eParameterFieldsFromInterfaceDefinition(derivedInfo.derivedComponentLibrary, interfaceDefinition)
    : null;
  const fields = configuredFields
    ? configuredFields.filter((field) => field.sourceName !== "idx" && field.sourceName !== relationKey)
    : resolveDerivedComponentParameterFields(
        node.kind,
        node.params,
        customEParameterDefinitions(node.params),
        derivedInfo.baseComponentLibrary,
        derivedInfo.derivedComponentLibrary
      );
  const columns = configuredFields
    ? configuredFields.map((field) => field.exportName)
    : ["idx", relationKey, ...fields.map((field) => field.exportName)];
  if (columns.length === 0) {
    return null;
  }
  const params = buildEDeviceValuesFromFields(node, fields, { preferTopologyNodeNumbers: true });
  if (!params._vbase) {
    params._vbase = String(node.params.vbase ?? node.terminals[0]?.vbase ?? "").trim();
  }
  if (configuredFields) {
    const idxField = configuredFields.find((field) => field.sourceName === "idx");
    const relationField = configuredFields.find((field) => field.sourceName === relationKey);
    if (idxField) {
      params[idxField.exportName] = derivedIdx;
    }
    if (relationField) {
      params[relationField.exportName] = baseIdx;
    }
  } else {
    params.idx = derivedIdx;
    params[relationKey] = baseIdx;
  }
  return {
    id: `${node.id}:derived:${derivedInfo.derivedComponentLibrary}`,
    kind: `${node.kind}:derived:${derivedInfo.derivedComponentLibrary}`,
    section: derivedInfo.derivedComponentLibrary,
    params,
    columns
  };
}

export function buildEDeviceValues(
  node: Pick<ModelNode, "kind" | "name" | "nodeNumber" | "terminals" | "params">,
  options: EParamValueOptions = {}
) {
  return buildEDeviceValuesFromFields(node, resolveEParameterFields(node.kind, node.params), options);
}

export function firstText(values: Array<string | undefined>): string {
  return values.find((value) => value !== undefined && value.trim() !== "") ?? "";
}

export function isZeroNumericText(value?: string): boolean {
  const normalized = normalizeVoltageBaseInput(value);
  return normalized !== "" && Number(normalized) === 0;
}

function nonZeroTerminalVoltageBaseNumber(value?: string): string {
  const normalized = terminalVoltageBaseNumber(value);
  return normalized && !isZeroNumericText(normalized) ? normalized : "";
}

export function firstNonZeroVoltageBase(values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = nonZeroTerminalVoltageBaseNumber(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

type VoltageDisplayNode = Pick<ModelNode, "kind" | "params" | "terminals">;
export type VoltageDisplayTerminal = Pick<Terminal, "vbase"> & Partial<Pick<Terminal, "id">>;

function terminalIndexForVoltageDisplay(node: VoltageDisplayNode, terminal?: VoltageDisplayTerminal): number {
  if (terminal?.id) {
    return node.terminals.findIndex((candidate) => candidate.id === terminal.id);
  }
  return node.terminals.length === 1 ? 0 : -1;
}

function terminalSideVoltageBase(node: VoltageDisplayNode, terminalIndex: number): string {
  if (terminalIndex < 0) {
    return "";
  }
  if (isThreeWindingTransformer(node)) {
    return firstNonZeroVoltageBase([
      deviceParamValue(node.params, "high_vbase"),
      deviceParamValue(node.params, "medium_vbase"),
      deviceParamValue(node.params, "low_vbase"),
      node.params.neutral_vbase
    ].slice(terminalIndex, terminalIndex + 1));
  }
  if (terminalIndex === 0) {
    return firstNonZeroVoltageBase([node.params.i_vbase, deviceParamValue(node.params, "source_vbase"), deviceParamValue(node.params, "high_vbase")]);
  }
  if (terminalIndex === 1) {
    return firstNonZeroVoltageBase([node.params.j_vbase, deviceParamValue(node.params, "target_vbase"), deviceParamValue(node.params, "low_vbase")]);
  }
  return "";
}

export function terminalVoltageDisplayValue(node: VoltageDisplayNode, terminal?: VoltageDisplayTerminal): string {
  const rawTerminalVoltage = terminalVoltageBaseNumber(terminal?.vbase);
  const terminalVoltage = nonZeroTerminalVoltageBaseNumber(terminal?.vbase);
  if (terminalVoltage) {
    return terminalVoltage;
  }
  const sideVoltage = terminalSideVoltageBase(node, terminalIndexForVoltageDisplay(node, terminal));
  if (sideVoltage) {
    return sideVoltage;
  }
  if (rawTerminalVoltage) {
    return rawTerminalVoltage;
  }
  const nodeVoltage = firstNonZeroVoltageBase([
    node.params.vbase,
    deviceParamValue(node.params, "voltage_level"),
    deviceParamValue(node.params, "rated_voltage"),
    node.params.voltage
  ]);
  return nodeVoltage || terminalVoltageBaseNumber(terminal?.vbase);
}

export function terminalVoltageDisplay(node: ModelNode, terminal: Terminal): string {
  return terminalVoltageDisplayValue(node, terminal);
}

export function shouldAssignVoltageSetpointDefault(value?: string): boolean {
  return value === undefined || value.trim() === "" || isZeroNumericText(value);
}

function topologyRepresentativeScore(node: ModelNode): number {
  if (isBusNode(node)) return 0;
  if (node.terminals.length === 1) return 1;
  if (node.kind.includes("converter") || node.kind.includes("transformer")) return 2;
  return 3;
}

export function isThreeWindingTransformer(node: Pick<ModelNode, "kind">): boolean {
  return node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral";
}

export function hasVisibleThreeWindingNeutralTerminal(node: Pick<ModelNode, "kind" | "terminals">): boolean {
  return node.kind === "ac-three-winding-transformer-neutral" && node.terminals.length >= 4;
}

function buildTopologyNodeDevices(nodes: ModelNode[]): EDeviceExport[] {
  type TopologyNodeCandidate = { node: ModelNode; terminal: Terminal; name?: string; voltage?: string };
  type TopologyNodeSection = "ACNode" | "DCNode" | "HydroNode" | "HeatNode";
  const groups: Record<TerminalType, Map<string, TopologyNodeCandidate[]>> = {
    ac: new Map(),
    dc: new Map(),
    h2: new Map(),
    heat: new Map()
  };
  for (const node of nodes) {
    if (isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      const terminalType = terminal.type;
      if (!terminal.nodeNumber) {
        continue;
      }
      const candidates = groups[terminalType].get(terminal.nodeNumber) ?? [];
      candidates.push({ node, terminal });
      groups[terminalType].set(terminal.nodeNumber, candidates);
    }
  }

  const topologyNodeKindByType: Record<TerminalType, string> = {
    ac: "ac-node",
    dc: "dc-node",
    h2: "hydrogen-node",
    heat: "heat-node"
  };
  const buildForType = (type: TerminalType, section: TopologyNodeSection): EDeviceExport[] =>
    Array.from(groups[type].entries())
      .sort(([first], [second]) => Number(first) - Number(second))
      .map(([idx, candidates]) => {
        const representative = [...candidates].sort(
          (first, second) => topologyRepresentativeScore(first.node) - topologyRepresentativeScore(second.node)
        )[0];
        const vbase = firstText(candidates.map(({ node, terminal }) => terminalVoltageDisplay(node, terminal)));
        const voltage = firstText([representative.voltage, representative.node.params.voltage, vbase]);
        const runStat = normalizeRunStatForE(representative.node.params.run_stat) || "1";
        const numericCandidateParam = (...keys: string[]) => firstNumericToken(firstText(
          keys.flatMap((key) => candidates.map(({ node }) => deviceParamValue(node.params, key)))
        ));
        const commonParams = {
          idx,
          name: representative.name || representative.node.name || `${section}_${idx}`,
          vbase,
          voltage,
          vltp: vbase,
          ist: "1",
          realbs: "0",
          v: "0",
          a: "0",
          vmax: "0",
          vmin: "0",
          isl: representative.node.params.isl ?? "0",
          run_stat: runStat
        };
        const params = section === "ACNode"
          ? { ...commonParams, angle: representative.node.params.angle ?? "0" }
          : section === "HydroNode"
            ? { ...commonParams, pressure: numericCandidateParam("pressure") }
            : section === "HeatNode"
              ? {
                  ...commonParams,
                  pressure: numericCandidateParam("pressure"),
                  supply_temperature: numericCandidateParam("supply_temperature", "temperature"),
                  return_temperature: numericCandidateParam("return_temperature", "temperature")
                }
              : commonParams;
        const columns = section === "ACNode"
          ? ["idx", "name", "vbase", "run_stat"]
          : section === "DCNode"
            ? ["idx", "name", "vbase", "run_stat"]
            : E_SECTION_COLUMNS[section];
        return {
          id: `${section}-${idx}`,
          kind: topologyNodeKindByType[type],
          section,
          params,
          columns
        };
      });

  return [
    ...buildForType("ac", "ACNode"),
    ...buildForType("dc", "DCNode"),
    ...buildForType("h2", "HydroNode"),
    ...buildForType("heat", "HeatNode")
  ];
}

export const THREE_WINDING_TRANSFORMER_SIDES = [
  { suffix: "high", label: "高压绕组", terminalIndex: 0, idxKey: "idx_xf_t1" },
  { suffix: "medium", label: "中压绕组", terminalIndex: 1, idxKey: "idx_xf_t2" },
  { suffix: "low", label: "低压绕组", terminalIndex: 2, idxKey: "idx_xf_t3" }
] as const;

function buildContainerAssociatedDevices(nodes: ModelNode[]): EDeviceExport[] {
  const records: EDeviceExport[] = [];
  for (const node of nodes) {
    if (!isContainerParams(node.params)) {
      continue;
    }
    if (templateDerivedComponentLibraryInfo({ kind: node.kind, params: node.params })) {
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

function applyEInterfaceDefinitionToRecord(
  record: EDeviceExport,
  interfaceDefinition?: EFileInterfaceSectionDefinition

): EDeviceExport {
  if (!interfaceDefinition) {
    return record;
  }
  const fields = eParameterFieldsFromInterfaceDefinition(record.section, interfaceDefinition);
  const params: Record<string, string> = {};
  for (const field of fields) {
    const sourceValue = field.sourceName === "dev_type"
      ? String(record.params.dev_type ?? "").trim() || record.kind.split(":", 1)[0] || record.section
      : record.params[field.sourceName] ?? "";
    const value = field.definition ? enumExportValueForDefinition(field.definition, sourceValue) : sourceValue;
    if (value !== "") {
      params[field.exportName] = value;
    }
  }
  return {
    ...record,
    params,
    columns: fields.map((field) => field.exportName)
  };
}

// aclinesegment/dclinesegment 同时生成 aclineend/dclineend（端点表）：
// 每条线段生成 2 条端点记录（首端/末端），name = 线段name + "_首端/_末端"，
// aclnseg_id/dcln_id 指向所属线段的 idx，nd 继承线段 ind/jnd 拓扑节点号。
function buildLineEndRecords(
  node: ModelNode,
  section: string,
  segmentParams: Record<string, string>,
  baseIdx: string,
  interfaceDefinitionBySection: Map<string, EFileInterfaceSectionDefinition>,
  sectionRowCounts: Map<string, number>,
  deviceRecords: EDeviceExport[],
  isDms = false
): void {
  if (section !== "ACBranch" && section !== "DCBranch") {
    return;
  }
  const endSection = isDms
    ? "dms_def_lnseg_dot"
    : (section === "ACBranch" ? "aclineend" : "dclineend");
  const linkField = section === "ACBranch" ? "aclnseg_id" : "dcln_id";
  const endInterface = interfaceDefinitionBySection.get(endSection);
  if (!endInterface) {
    return;
  }
  const endFields = eParameterFieldsFromInterfaceDefinition(endSection, endInterface);
  if (endFields.length === 0) {
    return;
  }
  const fieldByExportName = new Map(endFields.map((f) => [f.exportName, f]));
  const setEndField = (recordParams: Record<string, string>, exportName: string, value: string) => {
    if (fieldByExportName.has(exportName)) {
      recordParams[exportName] = value;
    }
  };
  const sideLabels = ["首端", "末端"] as const;
  const nodeKeys = ["i_node", "j_node"] as const;
  const segmentNodeKeys = ["ind", "jnd"] as const;
  const copyFromSegment: Array<[string, string]> = [
    ["st_id", "ist_id"],
    ["bv_id", "bv_id"],
    ["status", "status"],
    ["run_state", "run_stat"],
    ["tpcolor", "tpcolor"],
    ["record_app", "record_app"]
  ];
  for (let side = 0; side < sideLabels.length; side += 1) {
    const endParams = buildEDeviceValuesFromFields(node, endFields, { preferTopologyNodeNumbers: true });
    // name = 线段 name + _首端/_末端
    setEndField(endParams, "name", `${String(segmentParams.name ?? baseIdx)}_${sideLabels[side]}`);
    // 指向所属线段 idx（实时库模板下 applyEReferenceIdValues 会进一步换算为目标表 id）
    if (!isDms) {
      setEndField(endParams, linkField, baseIdx);
    }
    // nd：首端取线段 ind（i_node 拓扑号），末端取 jnd（j_node 拓扑号）
    // 配网线段端点表用 node_id 列（等同主网 nd 的节点号语义）
    const nodeFieldName = isDms ? "node_id" : "nd";
    const endNodeKey = nodeKeys[side];
    const segmentNodeField = segmentNodeKeys[side];
    const topologyNd = topologyNodeNumberForEField(node, endNodeKey);
    if (topologyNd !== undefined && topologyNd !== null && topologyNd !== "") {
      setEndField(endParams, nodeFieldName, String(topologyNd));
    } else if (segmentParams[segmentNodeField]) {
      setEndField(endParams, nodeFieldName, String(segmentParams[segmentNodeField]));
    }
    // 从线段继承厂站/电压/状态等公共字段（仅字段存在时）
    for (const [endName, segmentName] of copyFromSegment) {
      if (segmentParams[segmentName] && !endParams[endName]) {
        setEndField(endParams, endName, String(segmentParams[segmentName]));
      }
    }
    const endIdx = (sectionRowCounts.get(endSection) ?? 0) + 1;
    sectionRowCounts.set(endSection, endIdx);
    setEndField(endParams, "idx", String(endIdx));
    deviceRecords.push({
      id: `${node.id}:end:${side}`,
      kind: node.kind,
      section: endSection,
      params: endParams,
      columns: endFields.map((field) => field.exportName)
    });
  }
}

/** 判断是否有模板配置（eDeviceDefinitionLabels 非空） */
function hasTemplateConfig(options: EFileExportOptions): boolean {
  return Boolean(options.eDeviceDefinitionLabels) && Object.keys(options.eDeviceDefinitionLabels ?? {}).length > 0;
}

export function buildEDeviceRecords(project: ProjectFile, options: EFileExportOptions = {}): EDeviceExport[] {
  const hasTemplateConfigValue = hasTemplateConfig(options);
  const isDms = looksLikeDmsRtdbTemplate(options);
  const interfaceDefinitionBySection = eFileInterfaceDefinitionIndex(options);
  const topologyNodes = calculateElectricalTopology(project.nodes, project.edges);
  const topologyNodeDevices = buildTopologyNodeDevices(topologyNodes).map((record) =>
    applyEInterfaceDefinitionToRecord(record, interfaceDefinitionBySection.get(record.section))
  );
  const containerAssociatedDevices = buildContainerAssociatedDevices(topologyNodes).map((record) =>
    applyEInterfaceDefinitionToRecord(record, interfaceDefinitionBySection.get(record.section))
  );
  const deviceRecords: EDeviceExport[] = [];
  const derivedDeviceRecords: EDeviceExport[] = [];
  const sectionRowCounts = new Map<string, number>();
  const derivedSectionRowCounts = new Map<string, number>();
  const windingRowCounts = new Map<string, number>();
  for (const node of topologyNodes) {
    const originalSection = inferESection(node.kind, node.params);
    // 模板模式下 ACRealBs 合并到 node 表（ACNode+交流母线），realbs=1 标识母线。
    // 仅当模板确实定义了 node/ACNode 表（如 sgcc.e 的 <node 元件库="ACNode+交流母线">）时才合并；
    // 否则（如 ems_rtdb.e 使用独立的 <busbarsection> 表）保持 ACRealBs，避免记录被过滤。
    const section = (originalSection === "ACRealBs" && hasTemplateConfigValue && interfaceDefinitionBySection.has("ACNode"))
      ? "ACNode"
      : originalSection;
    if (!section || originalSection === "ACNode" || originalSection === "DCNode") {
      continue;
    }
    const fields = resolveEParameterFields(node.kind, node.params, interfaceDefinitionBySection.get(section));
    const columns = fields.map((field) => field.exportName);
    if (columns.length === 0) {
      continue;
    }
    const params = buildEDeviceValuesFromFields(node, fields, { preferTopologyNodeNumbers: true });
    // 注入内部电压信息（下划线前缀不会导出为列），供 bv_id 等引用字段匹配 basevoltage 行号
    if (!params._vbase) {
      params._vbase = String(node.params.vbase ?? node.terminals[0]?.vbase ?? "").trim();
    }
    const sectionRowCount = (sectionRowCounts.get(section) ?? 0) + 1;
    sectionRowCounts.set(section, sectionRowCount);
    const baseIdx = firstNumericToken(String(params.idx || node.params.idx || "")) || String(sectionRowCount);
    // 确保所有记录都有 idx 字段，即使 columns 中不包含 "idx"
    if (!params.idx) {
      params.idx = baseIdx;
    }
    if (columns.includes("idx") && !params.idx) {
      params.idx = baseIdx;
    }
    deviceRecords.push({
      id: node.id,
      kind: node.kind,
      section,
      params,
      columns
    });
    // ac-transformer/ac-three-winding-transformer 同时导出绕组表：
    // 双绕组生成 2 条绕组，三绕组生成 3 条；主网用 itrfm 指向所属变压器 idx，
    // 配网（dms_def_trwd）用 trfm_id 指向所属变压器 idx、node_id 指向节点号
    if (section === "ACTransformer" || section === "ACTransfomer3") {
      // 配网实时库只有双绕组台变（dms_def_trfm/trwd），三绕组不派生绕组
      if (!(isDms && section !== "ACTransformer")) {
        const windingInterface = interfaceDefinitionBySection.get("ACTransWinding");
        if (windingInterface) {
          const windingFields = eParameterFieldsFromInterfaceDefinition("ACTransWinding", windingInterface);
          if (windingFields.length > 0) {
            const fieldByExportName = new Map(windingFields.map((f) => [f.exportName, f]));
            const setField = (params: Record<string, string>, exportName: string, value: string) => {
              if (fieldByExportName.has(exportName)) {
                params[exportName] = value;
              }
            };
            const nodeKeys = section === "ACTransformer" ? ["i_node", "j_node"] : ["t1_node", "t2_node", "t3_node"];
            for (let side = 0; side < nodeKeys.length; side += 1) {
              const windingParams = buildEDeviceValuesFromFields(node, windingFields, { preferTopologyNodeNumbers: true });
              if (!windingParams._vbase) {
                windingParams._vbase = String(node.params.vbase ?? node.terminals[0]?.vbase ?? "").trim();
              }
              if (isDms) {
                // 配网绕组表（dms_def_trwd）：trfm_id 指向所属变压器 idx；三相阻抗归高压侧(side 0)
                setField(windingParams, "trfm_id", baseIdx);
                setField(windingParams, "name", `${node.name}_${["高", "低"][side]}`);
                const sideSuffix = side === 0 ? "" : null;
                const impVal = (base: string) => sideSuffix === null ? "0" : String(node.params[sideSuffix === "" ? base : `${base}${sideSuffix}`] ?? "0");
                const rVal = impVal("r");
                const xVal = impVal("x");
                const gVal = impVal("gt");
                const bVal = impVal("bt");
                setField(windingParams, "raa", rVal); setField(windingParams, "rbb", rVal); setField(windingParams, "rcc", rVal);
                setField(windingParams, "xaa", xVal); setField(windingParams, "xbb", xVal); setField(windingParams, "xcc", xVal);
                setField(windingParams, "gda", gVal); setField(windingParams, "gdb", gVal); setField(windingParams, "gdc", gVal);
                setField(windingParams, "bda", bVal); setField(windingParams, "bdb", bVal); setField(windingParams, "bdc", bVal);
                setField(windingParams, "node_id", topologyNodeNumberForEField(node, nodeKeys[side]) ?? "0");
                setField(windingParams, "p0", String(node.params.p0 ?? "0"));
                setField(windingParams, "pk", String(node.params.pk ?? "0"));
              } else {
                // 主网绕组表（transformerwinding）：itrfm 指向所属变压器 idx
                setField(windingParams, "itrfm", baseIdx);
                // name = 所属变压器name + '_' + '高/中/低'
                const sideLabel = section === "ACTransformer" ? ["高", "低"][side] : ["高", "中", "低"][side];
                setField(windingParams, "name", `${node.name}_${sideLabel}`);
                // 阻抗参数：双绕组阻抗归高压侧(side 0)，低压侧为 0；三绕组 r1/r2/r3
                const sideSuffix = section === "ACTransformer" ? (side === 0 ? "" : null) : String(side + 1);
                const impVal = (base: string) => sideSuffix === null ? "0" : String(node.params[sideSuffix === "" ? base : `${base}${sideSuffix}`] ?? "0");
                setField(windingParams, "rij", impVal("r"));
                setField(windingParams, "xij", impVal("x"));
                setField(windingParams, "gti", impVal("gt"));
                setField(windingParams, "bti", impVal("bt"));
                setField(windingParams, "tap", sideSuffix === null ? "1.0" : String(node.params[sideSuffix === "" ? "tap" : `tap${sideSuffix}`] ?? "1.0"));
                // vl = 该侧端子电压
                setField(windingParams, "vl", String(node.terminals[side]?.vbase ?? "").trim() || "0");
                // ind = 该侧节点号；znd = 双绕组互为末端，三绕组为中性点
                setField(windingParams, "ind", topologyNodeNumberForEField(node, nodeKeys[side]) ?? "0");
                setField(windingParams, "znd", section === "ACTransformer"
                  ? (topologyNodeNumberForEField(node, nodeKeys[1 - side]) ?? "0")
                  : (String(node.params.neutral_node ?? "0") || "0"));
              }
              // idx 自增
              const windingIdx = (windingRowCounts.get("ACTransWinding") ?? 0) + 1;
              windingRowCounts.set("ACTransWinding", windingIdx);
              setField(windingParams, "idx", String(windingIdx));
              deviceRecords.push({
                id: `${node.id}:winding:${side}`,
                kind: node.kind,
                section: "ACTransWinding",
                params: windingParams,
                columns: windingFields.map((field) => field.exportName)
              });
            }
          }
        }
      }
    }
    buildLineEndRecords(node, section, params, baseIdx, interfaceDefinitionBySection, sectionRowCounts, deviceRecords, isDms);
    const derivedInfo = templateDerivedComponentLibraryInfo({ kind: node.kind, params: node.params });
    if (derivedInfo) {
      const derivedSectionRowCount = (derivedSectionRowCounts.get(derivedInfo.derivedComponentLibrary) ?? 0) + 1;
      derivedSectionRowCounts.set(derivedInfo.derivedComponentLibrary, derivedSectionRowCount);
      const derivedRecord = buildDerivedComponentEDeviceRecord(
        node,
        baseIdx,
        String(derivedSectionRowCount),
        interfaceDefinitionBySection.get(derivedInfo.derivedComponentLibrary)
      );
      if (derivedRecord) {
        derivedDeviceRecords.push(derivedRecord);
      }
    }
  }

  return [
    ...topologyNodeDevices,
    ...deviceRecords,
    ...derivedDeviceRecords,
    ...containerAssociatedDevices
  ].filter((record) => {
    const definition = interfaceDefinitionBySection.get(record.section);
    // 模板模式：模板未定义的 section 一律不输出（如 ems_rtdb 未定义 ACNode/DCNode）
    if (hasTemplateConfigValue && !definition) {
      return false;
    }
    return definition?.exportEnabled !== false;
  });
}

export type EExportWarning = {
  nodeId: string;
  nodeName: string;
  kind: string;
  reason: string;
};

function getEExportWarningsFromRecords(
  project: ProjectFile,
  records: readonly EDeviceExport[],
  options: EFileExportOptions = {}
): EExportWarning[] {
  const interfaceDefinitionBySection = eFileInterfaceDefinitionIndex(options);
  const exportedNodeIds = new Set(records.map((record) => record.id).filter((id) => !id.includes(":")));
  const enumWarnings = project.nodes.flatMap((node) => validateNodeEnumParameters(node).map((issue) => ({
    nodeId: node.id,
    nodeName: node.name,
    kind: node.kind,
    reason: `枚举参数 ${issue.definition.cnName || issue.definition.enName}（${issue.paramKey}）值“${issue.value || "<空>"}”无效，允许值为：${issue.allowedValues.join("、")}。`
  })));
  const recordWarnings = project.nodes.flatMap((node) => {
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
        reason: isContainerParams(node.params) ? "容器设备没有对应的 E 文件段定义。" : "元件库没有对应的 E 文件段定义。"
      }];
    }
    const interfaceDefinition = interfaceDefinitionBySection.get(section);
    if (interfaceDefinition?.exportEnabled === false) {
      return [];
    }
    if (!E_SECTION_COLUMNS[section] && resolveEParameterFields(node.kind, node.params, interfaceDefinition).length === 0) {
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
  return [...enumWarnings, ...recordWarnings];
}

export function getEExportWarnings(project: ProjectFile, options: EFileExportOptions = {}): EExportWarning[] {
  return getEExportWarningsFromRecords(project, buildEDeviceRecords(project, options), options);
}

function normalizeEFileToken(value: string) {
  return value.trim().replace(/\s+/g, "_") || "0";
}

export function firstNumericToken(value: string) {
  return value.trim().match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? "";
}

function defaultEColumnValue(column: string, rowIndex: number) {
  if (column === "idx") return String(rowIndex + 1);

  if (column === "name") return `unnamed_${rowIndex + 1}`;
  if (column === "run_stat") return "1";
  if (column === "status") return "1";
  if (column === "control_type") return "0";
  if (column === "i_control_type" || column === "j_control_type") return "NONE";
  if (column === "ac_control_type") return "PQ";
  if (column === "dc_control_type") return "V";
  if (column === "tap" || /^tap[123]$/.test(column) || column === "alpha" || column === "voltage" || column === "vbase") return "1.0";
  return "0";
}

export function defaultContainerAssociatedColumnValue(section: string, column: string, rowIndex = 0) {
  if (section === "ACLoad" || section === "DCLoad") {
    if (column === "pv0" || column === "qv0") return "1.0";
    if (column === "pv1" || column === "pv2" || column === "qv1" || column === "qv2") return "0.0";
  }
  if (section === "ACGenerator" && column === "control_type") return "PV";
  if (section === "DCGenerator" && column === "control_type") return "P";
  if ((section === "HydroSource" || section === "HydroLoad") && column === "control_type") return "FLOW";
  if ((section === "HeatSource" || section === "HeatSource2") && column === "supply_temperature_set") return "95";
  return defaultEColumnValue(column, rowIndex);
}

/** 判断设备是否可调（风力、光伏、水力、储能默认可调） */
function isAdjustableDevice(deviceType: string): boolean {
  const adjustableTypes = ["ac-wind-source", "ac-pv-source", "ac-hydro-source", "ac-storage"];
  return adjustableTypes.includes(deviceType);
}

function formatEColumnValue(section: string, column: string, value: string | undefined, rowIndex: number) {
  if (column === "ist") {
    return "1";
  }
  const fallback = section === "ACACConverter" && (column === "i_control_type" || column === "j_control_type")
    ? "PQ"
    : section === "DCDCConverter" && column === "i_control_type"
      ? "P"
      : (section === "HydroSource" || section === "HydroLoad") && column === "control_type"
        ? "FLOW"
      : defaultEColumnValue(column, rowIndex);
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
    if (section === "ACACConverter") {
      return normalizeEFileToken(normalizeAcacEndpointControlTypeForE(text));
    }
    return normalizeEFileToken(normalizeDcdcEndpointControlTypeForE(text));
  }
  if (column === "ac_control_type") {
    return normalizeEFileToken(normalizeDcacAcControlTypeForE(text));
  }
  if (column === "dc_control_type") {
    return normalizeEFileToken(normalizeDcacDcControlTypeForE(text));
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
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const record of rows) {
    const recordColumns = record.columns ?? E_SECTION_COLUMNS[section] ?? Object.keys(record.params);
    for (const key of recordColumns) {
      if (!key || key.startsWith("_") || seen.has(key)) {
        continue;
      }
      seen.add(key);
      columns.push(key);
    }
  }
  return columns.length > 0 ? columns : E_SECTION_COLUMNS[section] ?? [];
}

const E_FILE_COLUMN_GAP = "    ";
const E_FILE_WIDE_CHAR_WIDTH = 5 / 3;

function eFileCellDisplayWidth(value: string) {
  let width = 0;
  for (const char of value) {
    width += /[ᄀ-ᅟ〈〉⺀-꓏가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]/u.test(char)
      ? E_FILE_WIDE_CHAR_WIDTH
      : 1;
  }
  return width;
}

function eFilePadCell(value: string, width: number) {
  const padding = Math.max(0, Math.round(width - eFileCellDisplayWidth(value)));
  return `${value}${" ".repeat(padding)}`;
}

function formatEFileSectionRows(section: string, columns: string[], rows: string[][]) {
  const widths = columns.map((column, columnIndex) =>
    Math.max(eFileCellDisplayWidth(column), ...rows.map((row) => eFileCellDisplayWidth(row[columnIndex] ?? "")))
  );
  const formatRow = (prefix: "@" | "#", cells: string[]) =>
    [prefix, ...cells.map((cell, index) => eFilePadCell(cell, widths[index]))].join(E_FILE_COLUMN_GAP).trimEnd();
  return [
    `<${section}>`,
    formatRow("@", columns),
    ...rows.map((row) => formatRow("#", row)),
    `</${section}>`
  ].join("\n");
}

/**
 * 按 E 文件导出规格格式化单条记录某一列的值：
 * 未设置（空白）时填充与导出文件完全一致的默认值，保证查看/编辑展示与导出的内网 E 文件一致。
 * regable 特殊处理与 formatESection 保持一致（风力/光伏/水力/储能默认可调）。
 */
export function formatEDeviceRecordColumnValue(
  section: string,
  record: Pick<EDeviceExport, "params">,
  column: string,
  rowIndex: number
) {
  if (column === "regable" && !record.params[column]) {
    const deviceType = record.params.type || record.params.dev_type || "";
    return isAdjustableDevice(deviceType) ? "1" : "0";
  }
  return formatEColumnValue(section, column, record.params[column], rowIndex);
}

/**
 * XX实时库 id 计算：key_to_long(table_id, field_id, key_no, area_no=0)
 * = (table_id << 48) + (field_id << 32) + (area_no << 24) + key_no
 * 平台实际输出：记录 id 的 field_id 恒为 0（如 generatingunit 第一行 = key_to_long(411,0,1)），
 * key_no 为表内行号（从 1 开始）。
 * 注意：结果可能超过 JS Number 安全整数范围（2^48 * 表号 > 2^53），必须用 BigInt 计算并返回字符串。
 */
export function keyToLong(tableId: string | number, fieldId: number, keyNo: number, areaNo = 0): string {
  const table = Number.parseInt(String(tableId).trim(), 10);
  if (!Number.isFinite(table) || table < 0) {
    return "0";
  }
  const result =
    (BigInt(table) << 48n) +
    (BigInt(fieldId) << 32n) +
    (BigInt(areaNo) << 24n) +
    BigInt(keyNo);
  return result.toString();
}

function formatESection(section: string, rows: EDeviceExport[], outputSection = section, tableId?: string) {
  const columns = eSectionColumns(section, rows);
  const formattedRows = sortESectionRecordsByIdx(rows)
    .map((record, rowIndex) => columns.map((column) => {
      // XX实时库模板：id 字段按 key_to_long(表号, 0, 行号) 计算（行号从 1 开始）
      if (column === "id" && tableId) {
        return keyToLong(tableId, 0, rowIndex + 1);
      }
      return formatEDeviceRecordColumnValue(section, record, column, rowIndex);
    }));
  return formatEFileSectionRows(outputSection, columns, formattedRows);
}

function buildBasevalueParameterRecord(project: ProjectFile, columns?: string[]): EDeviceExport {
  return {
    id: "basevalue-1",
    kind: "model",
    section: "basevalue",
    columns: columns?.length ? columns : ["p_base", "p_scale", "u_scale"],
    params: {
      p_base: String(project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE),
      p_scale: "1.0",
      u_scale: "1.0"
    }
  };
}

function buildBasevoltageParameterRecords(columns?: string[]): EDeviceExport[] {
  const settings = readVoltageLevelSettings();
  const allLevels: Array<{ name: string; vltp: string }> = [
    ...settings.ac.map((row) => ({ name: row.name, vltp: row.vltp })),
    ...settings.dc.map((row) => ({ name: row.name, vltp: row.vltp }))
  ];
  return allLevels.map((level, index) => {
    // 模板模式下电压值写入模板电压字段（nomvol/name 等），非模板模式用 idx/name/vltp
    const params: Record<string, string> = { idx: String(index + 1), name: level.name, vltp: level.vltp };
    if (columns?.length) {
      if (columns.includes("nomvol")) params.nomvol = level.vltp;
      if (columns.includes("name")) params.name = level.name;
    }
    return {
      id: `basevoltage-${index + 1}`,
      kind: "model",
      section: "basevoltage",
      columns: columns?.length ? columns : ["idx", "name", "vltp"],
      params
    };
  });
}

function buildSubcontrolareaParameterRecord(project: ProjectFile, columns?: string[]): EDeviceExport {
  return {
    id: "subcontrolarea-1",
    kind: "model",
    section: "subcontrolarea",
    columns: columns?.length ? columns : ["idx", "name"],
    params: { idx: "1", name: String(project.subcontrolarea ?? "").trim() || "默认区域" }
  };
}

function buildSubstationParameterRecord(project: ProjectFile, idv: string, columns?: string[]): EDeviceExport {
  return {
    id: "substation-1",
    kind: "model",
    section: "substation",
    columns: columns?.length ? columns : ["idx", "name", "idv"],
    params: { idx: "1", name: String(project.substation ?? "").trim() || "默认厂站", idv }
  };
}

function buildPowerBaseParameterRecord(project: ProjectFile, schemePath: string[]): EDeviceExport {
  const normalizedSchemePath = schemePath
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("/") || "默认方案";
  return {
    id: "Model-1",
    kind: "model",
    section: "Model",
    columns: ["path", "name", "p_base", "u_unit", "p_unit", "i_unit"],
    params: {
      path: normalizedSchemePath,
      name: project.name || "未命名",
      p_base: String(project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE),
      u_unit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
      p_unit: project.powerUnit ?? DEFAULT_POWER_UNIT,
      i_unit: project.currentUnit ?? DEFAULT_CURRENT_UNIT
    }
  };
}

/** 判断当前模板是否为配网实时库（dms_rtdb.e）——以配网特有的表段名映射为特征 */
function looksLikeDmsRtdbTemplate(options: EFileExportOptions): boolean {
  const labels = options.eDeviceDefinitionLabels ?? {};
  return labels["ACBreak"] === "dms_def_cb" && labels["ACBranch"] === "dms_def_lnseg";
}

/**
 * 构建配网实时库单行表记录（dms_def_bulk / dms_def_feeder / dms_def_source）。
 * 规则：
 * 1. dms_def_bulk 内容与 substation 一致（name 等公共字段取厂站），st_id 指向 substation 的 id；
 * 2. dms_def_feeder 记录馈线信息（当前模板类型为馈线），有且只有一行；
 * 3. dms_def_source 与 dms_def_feeder 相同字段保持一致（同名复制），
 *    dms_def_feeder.source_id 指向 dms_def_source 的 id。
 * 引用字段（st_id/area_id/source_id/bulk_id）由 applyEReferenceIdValues 统一换算为目标表计算 id。
 */
function buildDmsSingleRowRecords(
  project: ProjectFile,
  templateColumnsForSection: (section: string) => string[] | undefined
): EDeviceExport[] {
  const records: EDeviceExport[] = [];
  const substationName = String(project.substation ?? "").trim() || "默认厂站";
  const feederName = String(project.name ?? "").trim() || "馈线1";

  // 1. dms_def_bulk：内容与 substation 一致
  const bulkColumns = templateColumnsForSection("dms_def_bulk");
  if (bulkColumns && bulkColumns.length > 0) {
    const bulkParams: Record<string, string> = { name: substationName, code: "", descr: "", rdf_id: "" };
    records.push({
      id: "dms-bulk-1",
      kind: "model",
      section: "dms_def_bulk",
      columns: bulkColumns,
      params: bulkParams
    });
  }

  // 2. dms_def_feeder：一行馈线
  const feederColumns = templateColumnsForSection("dms_def_feeder");
  if (feederColumns && feederColumns.length > 0) {
    const feederParams: Record<string, string> = { name: feederName, code: "", descr: "", rdf_id: "" };
    for (const column of feederColumns) {
      if (column.startsWith("p_") || column.startsWith("q_") || column === "p" || column === "q" || column === "p_loss") {
        feederParams[column] = "0";
      }
    }
    records.push({
      id: "dms-feeder-1",
      kind: "model",
      section: "dms_def_feeder",
      columns: feederColumns,
      params: feederParams
    });
  }

  // 3. dms_def_source：与 feeder 相同字段保持一致（同名复制）
  const sourceColumns = templateColumnsForSection("dms_def_source");
  const feederRecord = records.find((record) => record.section === "dms_def_feeder");
  if (sourceColumns && sourceColumns.length > 0) {
    const sourceParams: Record<string, string> = {};
    for (const column of sourceColumns) {
      const value = feederRecord?.params?.[column];
      if (value !== undefined && value !== "") {
        sourceParams[column] = value;
      }
    }
    records.push({
      id: "dms-source-1",
      kind: "model",
      section: "dms_def_source",
      columns: sourceColumns,
      params: sourceParams
    });
  }

  return records;
}

/**
 * 构建 E 文件头表记录（模板模式：basevalue/basevoltage/subcontrolarea/substation；
 * 非模板模式：Model/basevoltage），取值与导出文件完全一致。
 * 供「查看/编辑E文件」弹窗按导出规格补全缺失的表。
 */
export function buildEDeviceHeaderParameterRecords(
  project: ProjectFile,
  records: readonly EDeviceExport[] = [],
  options: EFileExportOptions = {},
  schemePath: string[] = ["默认方案"]
): EDeviceExport[] {
  if (!hasTemplateConfig(options)) {
    return [buildPowerBaseParameterRecord(project, schemePath), ...buildBasevoltageParameterRecords()];
  }
  // 模板模式下头表按模板字段输出（含 id 列，导出时经 key_to_long 计算），与「查看/编辑E文件」展示一致
  const interfaceDefinitionBySection = eFileInterfaceDefinitionIndex(options);
  const templateColumnsForSection = (section: string) => {
    const definition = interfaceDefinitionBySection.get(section);
    if (!definition?.fields || definition.fields.length === 0) {
      return undefined;
    }
    return definition.fields
      .map((field) => String(field.exportName ?? field.sourceName ?? "").trim())
      .filter(Boolean);
  };
  // substation idv = max(unit 的 ind 对应的 node 的 vbase 对应的 basevoltage idx)（与导出一致）
  const recordsBySection = new Map<string, EDeviceExport[]>();
  for (const record of records) {
    const list = recordsBySection.get(record.section) ?? [];
    list.push(record);
    recordsBySection.set(record.section, list);
  }
  const basevoltageLevels = readVoltageLevelSettings();
  const allBasevoltageLevels = [...basevoltageLevels.ac, ...basevoltageLevels.dc];
  const nodeRecords = recordsBySection.get("ACNode") ?? [];
  const unitRecords = recordsBySection.get("ACGenerator") ?? [];
  const unitNodeIdxs = new Set(unitRecords.map((r) => r.params.ind).filter(Boolean));
  const relevantNodes = unitNodeIdxs.size > 0
    ? nodeRecords.filter((r) => unitNodeIdxs.has(r.params.idx))
    : nodeRecords;
  const nodeVbases = relevantNodes.map((r) => r.params.vbase).filter(Boolean);
  const basevoltageIdxs = nodeVbases.map((vbase) => {
    const idx = allBasevoltageLevels.findIndex((level) => String(level.vltp) === String(vbase));
    return idx >= 0 ? idx + 1 : 0;
  }).filter((idx) => idx > 0);
  const substationIdv = basevoltageIdxs.length > 0 ? String(Math.max(...basevoltageIdxs)) : "0";
  const headerRecords = [
    buildBasevalueParameterRecord(project, templateColumnsForSection("basevalue")),
    ...buildBasevoltageParameterRecords(templateColumnsForSection("basevoltage")),
    buildSubcontrolareaParameterRecord(project, templateColumnsForSection("subcontrolarea")),
    buildSubstationParameterRecord(project, substationIdv, templateColumnsForSection("substation"))
  ];
  // 配网实时库：追加单行表 dms_def_bulk / dms_def_feeder / dms_def_source
  if (looksLikeDmsRtdbTemplate(options)) {
    headerRecords.push(...buildDmsSingleRowRecords(project, templateColumnsForSection));
  }
  return headerRecords;
}

/**
 * 按导出顺序排列设备记录（E_SECTION_OUTPUT_ORDER 优先，其余按首次出现顺序排在最后），
 * 供「查看/编辑E文件」弹窗 Tab 顺序与导出的 E 文件一致。
 */
export function orderEDeviceRecordsForExport(records: readonly EDeviceExport[]): EDeviceExport[] {
  const sectionRank = new Map<string, number>();
  E_SECTION_OUTPUT_ORDER.forEach((section, index) => sectionRank.set(section, index));
  const remainingRank = new Map<string, number>();
  let nextRank = E_SECTION_OUTPUT_ORDER.length;
  for (const record of records) {
    if (!sectionRank.has(record.section) && !remainingRank.has(record.section)) {
      remainingRank.set(record.section, nextRank);
      nextRank += 1;
    }
  }
  return [...records].sort((first, second) => {
    const firstRank = sectionRank.get(first.section) ?? remainingRank.get(first.section) ?? Number.MAX_SAFE_INTEGER;
    const secondRank = sectionRank.get(second.section) ?? remainingRank.get(second.section) ?? Number.MAX_SAFE_INTEGER;
    return firstRank - secondRank;
  });
}

/**
 * XX实时库引用字段 → 目标表表号 映射（依据平台真实输出 result_rtdb.e）：
 * st_id/ist_id/jst_id → substation(00405)；bv_id → basevoltage(00401)；
 * subarea_id → subcontrolarea(00404)；aclnseg_id → aclinesegment(00414)；
 * tr_id/itrfm → powertransformer(00416)；tapty_id → taptype(00418)。
 * ind/jnd/nd/tpnd 为节点号（小数字），不参与 id 计算。
 */
export const E_REFERENCE_FIELD_TABLE_IDS: Record<string, string> = {
  st_id: "00405",
  ist_id: "00405",
  jst_id: "00405",
  bv_id: "00401",
  subarea_id: "00404",
  aclnseg_id: "00414",
  tr_id: "00416",
  itrfm: "00416",
  tapty_id: "00418",
  dcln_id: "00426",
  // 配网实时库（dms_rtdb.e）引用字段
  area_id: "00404",        // dms_def_bulk.area_id → subcontrolarea
  bulk_id: "12001",        // dms_def_feeder/dms_def_source.bulk_id → dms_def_bulk
  source_id: "12004",      // dms_def_feeder.source_id → dms_def_source
  trfm_id: "12012"         // dms_def_trwd.trfm_id → dms_def_trfm
};

/**
 * 对模板模式下的记录，将指向其他表 id 的引用字段（st_id/bv_id 等）替换为
 * 目标表记录的计算后 id（key_to_long(目标表号, 0, 目标行号)）。
 * 目标行号：st_id 等厂站/区域引用取第 1 行（默认厂站/默认区域）；bv_id 按设备
 * vbase 匹配 basevoltage 行号；tr_id/itrfm 按绕组所属变压器 idx 映射到
 * powertransformer 行号；其余按记录内已有值映射（无值时取 1）。
 */
export function applyEReferenceIdValues(
  project: ProjectFile,
  records: readonly EDeviceExport[],
  options: EFileExportOptions
): void {
  if (!hasTemplateConfig(options)) {
    return;
  }
  // 构建每个 section 的「idx → 行号」映射（按 idx 数值排序后从 1 计数）
  const sectionRowByIdx = new Map<string, Map<string, number>>();
  const recordsBySection = new Map<string, EDeviceExport[]>();
  for (const record of records) {
    const list = recordsBySection.get(record.section) ?? [];
    list.push(record);
    recordsBySection.set(record.section, list);
  }
  for (const [section, sectionRecords] of recordsBySection) {
    const sorted = sortESectionRecordsByIdx(sectionRecords);
    const rowByIdx = new Map<string, number>();
    sorted.forEach((record, index) => {
      const idx = String(record.params.idx ?? "").trim();
      if (idx) {
        rowByIdx.set(idx, index + 1);
      }
    });
    sectionRowByIdx.set(section, rowByIdx);
  }
  // basevoltage 行号：vltp 值 → 行号（导出中 basevoltage 段的行号，ac 在前 dc 在后）
  const basevoltageLevels = readVoltageLevelSettings();
  const allLevels = [...basevoltageLevels.ac, ...basevoltageLevels.dc];
  const basevoltageRowForVltp = (vltp: string): number => {
    // 精确匹配（ac 优先，dc 的 0 不会覆盖 ac 的 0）
    const acIndex = basevoltageLevels.ac.findIndex((level) => String(level.vltp).trim() === vltp);
    if (acIndex >= 0) {
      return acIndex + 1;
    }
    const dcIndex = basevoltageLevels.dc.findIndex((level) => String(level.vltp).trim() === vltp);
    return dcIndex >= 0 ? basevoltageLevels.ac.length + dcIndex + 1 : 1;
  };

  const targetRowFor = (record: EDeviceExport, column: string, options: { preferSection?: string } = {}): number => {
    if (column === "bv_id") {
      const vbase = String(record.params._vbase ?? record.params.vbase ?? "").trim() || "0";
      return basevoltageRowForVltp(vbase);
    }
    if (column === "tr_id" || column === "itrfm" || column === "trfm_id") {
      // 绕组记录中已携带所属变压器 idx（itrfm/trfm_id 字段）
      const transformerIdx = String(record.params.itrfm ?? record.params.tr_id ?? record.params.trfm_id ?? "").trim();
      const rowByIdx = sectionRowByIdx.get("ACTransformer") ?? sectionRowByIdx.get("powertransformer");
      if (transformerIdx && rowByIdx) {
        const row = rowByIdx.get(transformerIdx);
        if (row) {
          return row;
        }
      }
      return 1;
    }
    if (column === "aclnseg_id") {
      const segmentIdx = String(record.params.aclnseg_id ?? "").trim();
      const rowByIdx = sectionRowByIdx.get("ACBranch");
      if (segmentIdx && rowByIdx) {
        const row = rowByIdx.get(segmentIdx);
        if (row) {
          return row;
        }
      }
      return 1;
    }
    if (column === "dcln_id") {
      const segmentIdx = String(record.params.dcln_id ?? "").trim();
      const rowByIdx = sectionRowByIdx.get("DCBranch");
      if (segmentIdx && rowByIdx) {
        const row = rowByIdx.get(segmentIdx);
        if (row) {
          return row;
        }
      }
      return 1;
    }
    if (column === "tapty_id") {
      const taptyIdx = String(record.params.tapty_id ?? "").trim();
      const rowByIdx = sectionRowByIdx.get("taptype");
      if (taptyIdx && rowByIdx) {
        const row = rowByIdx.get(taptyIdx);
        if (row) {
          return row;
        }
      }
      return 1;
    }
    // st_id / ist_id / jst_id / subarea_id：默认厂站/区域第 1 行
    return 1;
  };

  for (const record of records) {
    const columns = eSectionColumns(record.section, [record]);
    for (const column of columns) {
      const targetTableId = E_REFERENCE_FIELD_TABLE_IDS[column];
      if (!targetTableId) {
        continue;
      }
      const current = String(record.params[column] ?? "").trim();
      // 已有合法 id（大数字）或模板未配置引用时跳过；空值/0/小序号则替换为目标表计算 id
      const numeric = Number(current);
      if (current && Number.isFinite(numeric) && numeric > 10 ** 14) {
        continue;
      }
      if (current === "" || current === "0" || (Number.isFinite(numeric) && numeric < 10 ** 14)) {
        record.params[column] = keyToLong(targetTableId, 0, targetRowFor(record, column));
      }
    }
  }
}

function buildEDeviceParameterFileFromRecords(
  project: ProjectFile,
  schemePath: string[],
  options: EFileExportOptions,
  records: readonly EDeviceExport[]
) {
  // XX实时库模板：将指向其他表 id 的引用字段（st_id/bv_id 等）替换为目标表记录的计算后 id
  applyEReferenceIdValues(project, records, options);
  const interfaceDefinitionBySection = eFileInterfaceDefinitionIndex(options);
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
  const sectionedRecords = Array.from(recordsBySection.values()).flat();
  const orderedSections = Array.from(new Set(
    orderEDeviceRecordsForExport(sectionedRecords).map((record) => record.section)
  ));
  // 按 outputSection 分组，合并同名的 records（如 ACTransformer 和 ACTransfomer3 都输出到 trfm）
  const recordsByOutputSection = new Map<string, { section: string; records: EDeviceExport[] }[]>();
  for (const section of orderedSections) {
    const outputSection = String(interfaceDefinitionBySection.get(section)?.exportName ?? "").trim()
      || String(options.eDeviceDefinitionLabels?.[section] ?? "").trim()
      || section;
    const existing = recordsByOutputSection.get(outputSection) ?? [];
    existing.push({ section, records: recordsBySection.get(section) ?? [] });
    recordsByOutputSection.set(outputSection, existing);
  }

  const sectionBlocks = Array.from(recordsByOutputSection.entries()).map(([outputSection, groups]) => {
    // 合并所有 records
    const allRecords = groups.flatMap((group) => group.records);
    // 只有当有多个 group 合并时（即同名 section），才重排 idx
    if (groups.length > 1) {
      const columns = eSectionColumns(groups[0].section, allRecords);
      if (columns.includes("idx")) {
        allRecords.forEach((record, index) => {
          record.params.idx = String(index + 1);
        });
      }
    }
    return formatESection(groups[0].section, allRecords, outputSection, interfaceDefinitionBySection.get(groups[0].section)?.tableId);
  });
  // 头表（模板模式：basevalue/basevoltage/subcontrolarea/substation；非模板模式：Model/basevoltage），
  // 与「查看/编辑E文件」弹窗展示共用同一份记录，保证展示与导出完全一致
  const headerRecords = buildEDeviceHeaderParameterRecords(project, sectionedRecords, options, schemePath);
  // 头表引用字段（如 substation.subarea_id → subcontrolarea）同步为目标表 id
  applyEReferenceIdValues(project, headerRecords, options);
  const headerBlocks: string[] = [];
  for (let index = 0; index < headerRecords.length;) {
    const section = headerRecords[index].section;
    const group: EDeviceExport[] = [];
    while (index < headerRecords.length && headerRecords[index].section === section) {
      group.push(headerRecords[index]);
      index += 1;
    }
    headerBlocks.push(formatESection(section, group, section, interfaceDefinitionBySection.get(section)?.tableId));
  }
  return [...headerBlocks, ...sectionBlocks].join("\n\n") + "\n";
}

export function buildEDeviceParameterFile(
  project: ProjectFile,
  schemePath: string[] = ["默认方案"],
  options: EFileExportOptions = {}
) {
  return buildEDeviceParameterFileFromRecords(
    project,
    schemePath,
    options,
    buildEDeviceRecords(project, options)
  );
}

export type TextFileExport = {
  filename: string;
  text: string;
  mime: string;
};

export type EFileExport = TextFileExport & {
  warnings: EExportWarning[];
};

function safeModelFilePart(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
}

export function buildEFileExport(
  project: ProjectFile,
  schemePath: string[] = ["默认方案"],
  options: EFileExportOptions = {}
): EFileExport {
  const records = buildEDeviceRecords(project, options);
  return {
    filename: `${safeModelFilePart(project.name)}.e`,
    text: buildEDeviceParameterFileFromRecords(project, schemePath, options, records),
    mime: "text/plain",
    warnings: getEExportWarningsFromRecords(project, records, options)
  };
}

// 元件定义 E 文件：每个元件一个 section，标签=英文名（带属性），@ 字段行 + // 注释行，无 # 数据行
export type EDeviceDefinitionField = {
  sourceName?: string;
  exportEnabled?: boolean;
  exportName: string;
  cnName: string;
};

export type EDeviceDefinitionSection = {
  kind: string;
  label: string;
  categoryLibrary: string;
  componentLibrary: string;
  originalComponentLibrary?: string;
  derivedFromComponentLibrary?: string;
  isDerivedComponentLibrary?: boolean;
  isContainerComponentLibrary?: boolean;
  exportEnabled?: boolean;
  tableId?: string;
  fields: EDeviceDefinitionField[];
};

function escapeEDefinitionAttr(value: string): string {
  return String(value ?? "").replace(/"/g, "'");
}

function formatEDeviceDefinitionSection(section: EDeviceDefinitionSection): string {
  const enabledFields = section.fields.filter((field) => field.exportEnabled !== false);
  const columns = enabledFields.map((field) => field.exportName);
  const comments = enabledFields.map((field) => field.cnName);
  const widths = columns.map((_, index) =>
    Math.max(eFileCellDisplayWidth(columns[index]), eFileCellDisplayWidth(comments[index]))
  );
  const fieldRow = ["@", ...columns.map((cell, index) => eFilePadCell(cell, widths[index]))]
    .join(E_FILE_COLUMN_GAP)
    .trimEnd();
  const commentRow = ["//", ...comments.map((cell, index) => eFilePadCell(cell, widths[index]))]
    .join(E_FILE_COLUMN_GAP)
    .trimEnd();
  const libraryAttr = section.originalComponentLibrary ? ` 元件库="${escapeEDefinitionAttr(section.originalComponentLibrary)}"` : "";
  const derivedAttr = section.isDerivedComponentLibrary ? ` 是否派生新类="是"` : "";
  const derivedBaseAttr = section.derivedFromComponentLibrary ? ` 派生基类="${escapeEDefinitionAttr(section.derivedFromComponentLibrary)}"` : "";
  const containerAttr = section.isContainerComponentLibrary ? ` 是否容器="是"` : "";
  const classExportAttr = section.exportEnabled === false ? ` 是否导出="否"` : "";
  const interfaceConfig = section.fields.some((field) => Boolean(field.sourceName))
    ? encodeURIComponent(JSON.stringify(section.fields.map((field) => ({
        sourceName: String(field.sourceName ?? field.exportName).trim(),
        cnName: String(field.cnName ?? field.sourceName ?? field.exportName).trim(),
        exportEnabled: field.exportEnabled !== false,
        exportName: String(field.exportName ?? field.sourceName ?? "").trim()
      }))))
    : "";
  const interfaceConfigAttr = interfaceConfig ? ` 接口配置="${interfaceConfig}"` : "";
  const attrs = `中文名="${escapeEDefinitionAttr(section.label)}" 类别库="${escapeEDefinitionAttr(section.categoryLibrary)}"${libraryAttr}${derivedAttr}${derivedBaseAttr}${containerAttr}${classExportAttr}${interfaceConfigAttr}`;
  return [`<${section.kind} ${attrs}>`, fieldRow, commentRow, `</${section.kind}>`].join("\n");
}

function matchEDefinitionAttr(attrText: string, key: string): string {
  const match = attrText.match(new RegExp(`${key}="([^"]*)"`));
  return match ? match[1] : "";
}

function eDefinitionAttrIsYes(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "是" || normalized === "1" || normalized === "true" || normalized === "yes";
}

function splitEDefinitionCells(line: string): string[] {
  return line.split(/\s{2,}|\|/).map((cell) => cell.trim()).filter((cell) => cell.length > 0);
}

export function buildEDeviceDefinitionFile(
  templates: DeviceTemplate[],
  labels?: Record<string, string>,
  eDeviceDefinitionLabels?: Record<string, string>,
  eDeviceDefinitionClassExportEnabled?: Record<string, boolean>
): TextFileExport {
  // 按元件库（E section）分组：同元件库的所有图元合并为一个 section，字段取勾选导出的并集
  type EDeviceDefinitionGroup = {
    categoryLibrary: string;
    label: string;
    derivedFromComponentLibrary?: string;
    isDerivedComponentLibrary?: boolean;
    isContainerComponentLibrary?: boolean;
    fields: Map<string, string[]>;
  };
  const groups = new Map<string, EDeviceDefinitionGroup>();
  const ensureGroup = (
    componentLibrary: string,
    options: Partial<Omit<EDeviceDefinitionGroup, "fields">> = {}
  ): EDeviceDefinitionGroup => {
    let group = groups.get(componentLibrary);

    if (!group) {
      group = {
        categoryLibrary: options.categoryLibrary ?? "",
        label: options.label ?? "",
        derivedFromComponentLibrary: options.derivedFromComponentLibrary,
        isDerivedComponentLibrary: options.isDerivedComponentLibrary,
        isContainerComponentLibrary: options.isContainerComponentLibrary,
        fields: new Map()
      };
      groups.set(componentLibrary, group);
      return group;
    }
    if (!group.categoryLibrary && options.categoryLibrary) {
      group.categoryLibrary = options.categoryLibrary;
    }
    if (!group.label && options.label) {
      group.label = options.label;
    }
    if (!group.derivedFromComponentLibrary && options.derivedFromComponentLibrary) {
      group.derivedFromComponentLibrary = options.derivedFromComponentLibrary;
    }
    if (options.isDerivedComponentLibrary !== undefined) {
      group.isDerivedComponentLibrary = options.isDerivedComponentLibrary;
    }
    if (options.isContainerComponentLibrary !== undefined) {
      group.isContainerComponentLibrary = options.isContainerComponentLibrary;
    }
    return group;
  };
  const appendGroupField = (group: EDeviceDefinitionGroup, exportName: string, cnName: string) => {
    const normalizedExportName = exportName.trim();
    if (!normalizedExportName) {
      return;
    }
    let cnNames = group.fields.get(normalizedExportName);
    if (!cnNames) {
      cnNames = [];
      group.fields.set(normalizedExportName, cnNames);
    }
    const normalizedCnName = cnName.trim();
    if (normalizedCnName && !cnNames.includes(normalizedCnName)) {
      cnNames.push(normalizedCnName);
    }
  };
  for (const template of templates) {
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    const componentLibrary = derivedInfo?.componentLibrary ?? inferESection(template.kind, template.params ?? {});
    if (!componentLibrary) {
      continue;
    }
    const definitionParams = derivedInfo
      ? { ...(template.params ?? {}), component_type: componentLibrary }
      : template.params ?? {};
    // 无 parameterDefinitions 的图元（如 ac-source）按 E 分区推导内置列参数，避免整类丢失
    const definitions = getTemplateParameterDefinitions(template);
    const group = ensureGroup(componentLibrary, {
      categoryLibrary: derivedInfo?.categoryLibrary ?? template.categoryLibrary ?? ""
    });
    for (const definition of definitions) {
      const settings = resolveDeviceParameterDefinitionExportSettings(template.kind, definitionParams, definition);
      if (!settings.exportEnabled) {
        continue;
      }
      const exportName = (settings.exportName || definition.enName).trim();
      if (!exportName) {
        continue;
      }
      const rawCnName = (definition.cnName ?? "").trim();
      // cnName 为英文 key 时用 labels 转中文（与 UI PARAM_LABELS 一致）
      const cnName = (rawCnName === exportName && labels?.[exportName]) ? labels[exportName] : rawCnName;
      appendGroupField(group, exportName, cnName);
    }
    if (derivedInfo) {
      const derivedGroup = ensureGroup(derivedInfo.derivedComponentLibrary, {
        categoryLibrary: derivedInfo.categoryLibrary || template.categoryLibrary || "",
        label: derivedInfo.label || (ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[derivedInfo.derivedComponentLibrary] ?? derivedInfo.derivedComponentLibrary),
        derivedFromComponentLibrary: derivedInfo.baseComponentLibrary,
        isDerivedComponentLibrary: true,
        isContainerComponentLibrary: false
      });
      appendGroupField(derivedGroup, derivedComponentBaseRelationKey(derivedInfo.baseComponentLibrary), "原类关联idx");
      const derivedFields = resolveDerivedComponentParameterFields(
        template.kind,
        template.params ?? {},
        definitions,
        derivedInfo.baseComponentLibrary,
        derivedInfo.derivedComponentLibrary
      );
      for (const field of derivedFields) {
        const rawCnName = (field.definition?.cnName ?? "").trim();
        const cnName = (rawCnName === field.exportName && labels?.[field.exportName]) ? labels[field.exportName] : rawCnName;
        appendGroupField(derivedGroup, field.exportName, cnName || field.exportName);
      }
    }
  }

  const sections: EDeviceDefinitionSection[] = [];
  for (const [componentLibrary, group] of groups) {
    if (eDeviceDefinitionClassExportEnabled?.[componentLibrary] === false) {
      continue;
    }
    if (group.fields.size === 0) {
      continue;
    }
    // 字段顺序：普通设备 idx/name/dev_type 固定在前；派生类只保留 idx、原类关联字段和个性化字段
    const fields: EDeviceDefinitionField[] = [];
    // E 文件固定标准列的中文名映射（不取图元 cnName 并集，避免混入英文 key）
    const fixedCnName: Record<string, string> = {
      idx: "序号",
      name: "名称",
      dev_type: "设备类型",
      node: "节点",
      i_node: "首节点",
      j_node: "末节点",
      status: "运行状态",
      run_stat: "运行状态（运行/停运）"
    };
    fields.push({ exportName: "idx", cnName: fixedCnName.idx });
    if (!group.isDerivedComponentLibrary) {
      fields.push({ exportName: "name", cnName: fixedCnName.name });
      fields.push({ exportName: "dev_type", cnName: fixedCnName.dev_type });
    }
    for (const [exportName, cnNames] of group.fields) {
      if (
        exportName === "idx" ||
        (!group.isDerivedComponentLibrary && (exportName === "name" || exportName === "dev_type")) ||
        (group.isDerivedComponentLibrary && DERIVED_COMPONENT_COMMON_PARAM_NAMES.has(exportName))
      ) {
        continue;
      }
      if (fixedCnName[exportName]) {
        fields.push({ exportName, cnName: fixedCnName[exportName] });
        continue;
      }
      // 过滤掉与 enName 相同的英文 key，只保留真正的中文名；全被过滤则回退到字段名
      const meaningfulCnNames = cnNames.filter((cnName) => cnName && cnName !== exportName);
      fields.push({ exportName, cnName: meaningfulCnNames.length > 0 ? meaningfulCnNames.join("/") : exportName });
    }
    const eLabel = eDeviceDefinitionLabels?.[componentLibrary]?.trim();
    sections.push({
      kind: eLabel || componentLibrary,
      label: group.label || (ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[componentLibrary] ?? componentLibrary),
      categoryLibrary: group.categoryLibrary,
      componentLibrary,
      originalComponentLibrary: eLabel && eLabel !== componentLibrary ? componentLibrary : undefined,
      derivedFromComponentLibrary: group.derivedFromComponentLibrary,
      isDerivedComponentLibrary: group.isDerivedComponentLibrary,
      isContainerComponentLibrary: group.isContainerComponentLibrary,
      fields
    });
  }
  const text = sections.length > 0
    ? sections.map(formatEDeviceDefinitionSection).join("\n\n") + "\n"
    : "";
  return {
    filename: "图元E文件定义.e",
    text,
    mime: "text/plain"
  };
}

export function buildEDeviceDefinitionFileFromInterfaceDefinitions(
  definitions: readonly EFileInterfaceSectionDefinition[] = []
): TextFileExport {
  const sections = (definitions ?? []).flatMap((definition): EDeviceDefinitionSection[] => {
    const componentLibrary = String(definition.componentLibrary ?? "").trim();
    const kind = String(definition.exportName ?? componentLibrary).trim() || componentLibrary;
    const fields = (definition.fields ?? []).flatMap((field): EDeviceDefinitionField[] => {
      const sourceName = normalizeGasQuantityFieldName(field.sourceName);
      const exportName = normalizeGasQuantityFieldName(field.exportName ?? sourceName);
      if (!sourceName || !exportName) {
        return [];
      }
      return [{
        sourceName,
        cnName: String(field.cnName ?? sourceName).trim() || sourceName,
        exportEnabled: field.exportEnabled !== false,
        exportName
      }];
    });
    if (!componentLibrary || definition.exportEnabled === false || !fields.some((field) => field.exportEnabled !== false)) {
      return [];
    }
    return [{
      kind,
      label: String(definition.label ?? componentLibrary).trim() || componentLibrary,
      categoryLibrary: String(definition.categoryLibrary ?? "").trim(),
      componentLibrary,
      originalComponentLibrary: kind !== componentLibrary ? componentLibrary : undefined,
      derivedFromComponentLibrary: definition.derivedFromComponentLibrary,
      isDerivedComponentLibrary: Boolean(definition.isDerivedComponentLibrary),
      isContainerComponentLibrary: Boolean(definition.isContainerComponentLibrary),
      exportEnabled: true,
      fields
    }];
  });
  return {
    filename: "图元E文件定义.e",
    text: sections.length > 0 ? `${sections.map(formatEDeviceDefinitionSection).join("\n\n")}\n` : "",
    mime: "text/plain"

  };
}

export function parseEDeviceDefinitionFile(text: string): EDeviceDefinitionSection[] {
  const sections: EDeviceDefinitionSection[] = [];
  const sectionRegex = /<(\S+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(text)) !== null) {
    const kind = match[1];
    const attrText = match[2];
    const body = match[3];
    const exportNames: string[] = [];
    const cnNames: string[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("@")) {
        exportNames.push(...splitEDefinitionCells(line.slice(1)));
      } else if (line.startsWith("//")) {
        cnNames.push(...splitEDefinitionCells(line.slice(2)));
      }
    }
    const interfaceConfigAttr = matchEDefinitionAttr(attrText, "接口配置");
    let fields: EDeviceDefinitionField[] = [];
    if (interfaceConfigAttr) {
      try {
        const configuredFields = JSON.parse(decodeURIComponent(interfaceConfigAttr));
        if (Array.isArray(configuredFields)) {
          fields = configuredFields.flatMap((field): EDeviceDefinitionField[] => {
            if (!field || typeof field !== "object") {
              return [];
            }
            const sourceName = normalizeGasQuantityFieldName(field.sourceName);
            const exportName = normalizeGasQuantityFieldName(field.exportName ?? sourceName);
            if (!sourceName || !exportName) {
              return [];
            }
            return [{
              sourceName,
              cnName: String(field.cnName ?? sourceName).trim() || sourceName,
              exportEnabled: field.exportEnabled !== false,
              exportName
            }];
          });
        }
      } catch {
        fields = [];
      }
    }
    if (fields.length === 0) {
      const count = Math.max(exportNames.length, cnNames.length);
      for (let index = 0; index < count; index += 1) {
        fields.push({
          exportName: normalizeGasQuantityFieldName(exportNames[index]),
          cnName: cnNames[index] ?? ""
        });
      }
    }
    const componentLibraryAttr = matchEDefinitionAttr(attrText, "元件库");
    const derivedAttr = matchEDefinitionAttr(attrText, "是否派生新类");
    const containerAttr = matchEDefinitionAttr(attrText, "是否容器");
    const exportEnabledAttr = matchEDefinitionAttr(attrText, "是否导出");

    // 支持 + 号分割的多对一映射（如 "双绕组变压器+三绕组变压器" → 同一个 exportName）
    const componentLibraryParts = componentLibraryAttr.includes("+")
      ? componentLibraryAttr.split("+").map((part) => part.trim()).filter(Boolean)
      : [componentLibraryAttr];

    for (const part of componentLibraryParts) {
      // 如果元件库是中文名，反向映射为英文元件库名
      const resolvedComponentLibrary = part ? (COMPONENT_LIBRARY_REVERSE_MAPPING[part] ?? part) : kind;
      sections.push({
        kind,
        label: matchEDefinitionAttr(attrText, "中文名"),
        categoryLibrary: matchEDefinitionAttr(attrText, "类别库"),
        componentLibrary: resolvedComponentLibrary,
        originalComponentLibrary: part && resolvedComponentLibrary !== part ? part : undefined,
        derivedFromComponentLibrary: matchEDefinitionAttr(attrText, "派生基类") || undefined,
        isDerivedComponentLibrary: derivedAttr ? eDefinitionAttrIsYes(derivedAttr) : undefined,
        isContainerComponentLibrary: containerAttr ? eDefinitionAttrIsYes(containerAttr) : undefined,
        exportEnabled: exportEnabledAttr ? eDefinitionAttrIsYes(exportEnabledAttr) : true,
        tableId: matchEDefinitionAttr(attrText, "表号") || undefined,
        fields
      });
    }
  }
  return sections;
}
