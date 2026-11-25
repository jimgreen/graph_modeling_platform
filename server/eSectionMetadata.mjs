// 后端 E 格式段名与静态元件库纯元数据模块
// 从 server/server.mjs 抽离，供 server.mjs 与 deviceLibraryNormalization.mjs 共享，无路径常量。

const defaultStaticComponentLibrary = "StaticBasicShape";

export const staticComponentLibraryByKind = {
  "static-text": "StaticTextSymbol",
  "static-date": "StaticTextSymbol",
  "static-time": "StaticTextSymbol",
  "static-datetime": "StaticTextSymbol",
  "static-image": "StaticMediaSymbol",
  "static-web": "StaticMediaSymbol",
  "static-circle": "StaticBasicShape",
  "static-ellipse": "StaticBasicShape",
  "static-rect": "StaticBasicShape",
  "static-point": "StaticBasicShape",
  "static-ring": "StaticBasicShape",
  "static-hexagon": "StaticBasicShape",
  "static-parallelogram": "StaticBasicShape",
  "static-triangle": "StaticBasicShape",
  "static-rounded-rect": "StaticFlowNode",
  "static-diamond": "StaticFlowNode",
  "static-pill": "StaticFlowNode",
  "static-database": "StaticFlowNode",
  "static-document": "StaticFlowNode",
  "static-note": "StaticFlowNode",
  "static-circle-node": "StaticFlowNode",
  "static-default-node": "StaticFlowNode",
  "static-input-node": "StaticFlowNode",
  "static-output-node": "StaticFlowNode",
  "static-port-node": "StaticFlowNode",
  "static-card-node": "StaticFlowNode",
  "static-toolbar-node": "StaticFlowNode",
  "static-input": "StaticFlowNode",
  "static-button": "StaticButton",
  "static-group-box": "StaticContainerSymbol",
  "static-swimlane": "StaticContainerSymbol",
  "static-resizer-frame": "StaticContainerSymbol",
  "static-subflow-box": "StaticContainerSymbol",
  "static-line": "StaticConnectorSymbol",
  "static-polyline": "StaticConnectorSymbol",
  "static-straight-connector": "StaticConnectorSymbol",
  "static-arrow-connector": "StaticConnectorSymbol",
  "static-double-arrow-connector": "StaticConnectorSymbol",
  "static-elbow-connector": "StaticConnectorSymbol",
  "static-bezier-connector": "StaticConnectorSymbol",
  "static-smoothstep-connector": "StaticConnectorSymbol",
  "static-self-loop": "StaticConnectorSymbol",
  "static-callout": "StaticAnnotationSymbol",
  "static-edge-label": "StaticAnnotationSymbol"
};

export function staticComponentLibraryForKind(kind) {
  return staticComponentLibraryByKind[String(kind ?? "")] ?? defaultStaticComponentLibrary;
}

export function isStaticKind(kind) {
  return String(kind ?? "").startsWith("static-");
}

export const eSectionColumns = {
  StaticTextSymbol: [],
  StaticMediaSymbol: [],
  StaticBasicShape: [],
  StaticFlowNode: [],
  StaticButton: [],
  StaticContainerSymbol: [],
  StaticConnectorSymbol: [],
  StaticAnnotationSymbol: [],
  ACRealBs: ["idx", "name", "node", "rated_voltage", "v_max", "v_min", "run_stat"],
  DCRealBs: ["idx", "name", "node", "rated_voltage", "v_max", "v_min", "run_stat"],
  ACNode: ["idx", "name", "vbase", "run_stat"],
  DCNode: ["idx", "name", "vbase", "voltage", "isl", "run_stat"],
  ACBranch: ["idx", "name", "i_node", "j_node", "rated_capacity", "rated_voltage", "i_max", "r", "x", "b", "run_stat", "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"],
  DCBranch: ["idx", "name", "i_node", "j_node", "rated_capacity", "rated_voltage", "i_max", "r", "run_stat", "i_p", "i_u", "i_i", "j_p", "j_u", "j_i"],
  ACLoad: ["idx", "name", "node", "rated_capacity", "rated_voltage", "pbase", "p_set", "p_max", "p_min", "pv0", "pv1", "pv2", "qbase", "q_set", "q_max", "q_min", "qv0", "qv1", "qv2", "v_max", "v_min", "run_stat"],
  DCLoad: ["idx", "name", "node", "rated_capacity", "rated_voltage", "pbase", "p_set", "p_max", "p_min", "pv0", "pv1", "pv2", "v_max", "v_min", "run_stat"],
  ACGenerator: ["idx", "name", "node", "rated_capacity", "rated_voltage", "control_type", "p_set", "p_max", "p_min", "q_set", "q_max", "q_min", "v_set", "v_max", "v_min", "alpha", "run_stat"],
  DCGenerator: ["idx", "name", "node", "rated_capacity", "rated_voltage", "control_type", "v_set", "p_set", "p_max", "p_min", "i_set", "v_max", "v_min", "run_stat"],
  ACCompensator: ["idx", "name", "dev_type", "node", "rated_voltage", "rated_reactive_power", "reactance", "run_stat"],
  ACSeriCompensator: ["idx", "name", "dev_type", "i_node", "j_node", "rated_voltage", "rated_reactive_power", "reactance", "run_stat"],
  ACZeroBranch: ["idx", "name", "i_node", "j_node", "rated_voltage", "run_stat"],
  DCZeroBranch: ["idx", "name", "i_node", "j_node", "rated_voltage", "run_stat"],
  ACSwitch: ["idx", "name", "i_node", "j_node", "rated_capacity", "rated_voltage", "i_max", "status", "closed_status", "closed_status_set", "run_stat", "p", "q", "u", "i"],
  DCSwitch: ["idx", "name", "i_node", "j_node", "rated_capacity", "rated_voltage", "i_max", "status", "closed_status", "closed_status_set", "run_stat", "p", "u", "i"],
  ACBreak: ["idx", "name", "i_node", "j_node", "rated_capacity", "rated_voltage", "i_max", "status", "closed_status", "closed_status_set", "run_stat", "p", "q", "u", "i"],
  DCBreak: ["idx", "name", "i_node", "j_node", "rated_capacity", "rated_voltage", "i_max", "status", "closed_status", "closed_status_set", "run_stat", "p", "u", "i"],
  GroundDisconnector: ["idx", "name", "node", "rated_capacity", "i_max", "status", "run_stat"],
  ACTransformer: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_i_max", "j_i_max", "r", "x", "gt", "bt", "tap", "tap_set", "shift", "run_stat"],
  ACTransfomer3: [
    "idx",
    "name",
    "i_node",
    "k_node",
    "j_node",
    "neutral_node",
    "i_rated_capacity",
    "i_i_max",
    "k_rated_capacity",
    "k_i_max",
    "j_rated_capacity",
    "j_i_max",
    "i_r",
    "i_x",
    "i_gt",
    "i_bt",
    "i_tap",
    "i_shift",
    "k_r",
    "k_x",
    "k_gt",
    "k_bt",
    "k_tap",
    "k_shift",
    "j_r",
    "j_x",
    "j_gt",
    "j_bt",
    "j_tap",
    "j_shift",
    "run_stat"
  ],
  DCDCConverter: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_p_max", "i_p_min", "i_i_max", "i_v_max", "i_v_min", "j_p_max", "j_p_min", "j_i_max", "j_v_max", "j_v_min", "r1", "r2", "i_control_type", "j_control_type", "p_set", "i_set", "v_set", "run_stat"],
  DCACConverter: ["idx", "name", "ac_node", "dc_node", "rated_capacity", "ac_p_max", "ac_p_min", "ac_i_max", "ac_v_max", "ac_v_min", "dc_p_max", "dc_p_min", "dc_i_max", "dc_v_max", "dc_v_min", "r1", "r2", "ac_control_type", "dc_control_type", "p_ac_set", "q_ac_set", "v_ac_set", "p_dc_set", "i_dc_set", "v_dc_set", "run_stat"],
  ACACConverter: ["idx", "name", "i_node", "j_node", "rated_capacity", "i_p_max", "i_p_min", "i_i_max", "i_v_max", "i_v_min", "j_p_max", "j_p_min", "j_i_max", "j_v_max", "j_v_min", "r1", "r2", "i_control_type", "j_control_type", "p_set", "i_q_set", "j_q_set", "i_v_set", "j_v_set", "run_stat"],
  HydroNode: ["idx", "name", "pressure", "run_stat"],
  HydroSource: ["idx", "name", "node", "rated_capacity", "control_type", "pressure_set", "pressure_max", "pressure_min", "flow_set", "flow_max", "flow_min", "run_stat"],
  HydroLoad: ["idx", "name", "node", "rated_capacity", "control_type", "pressure_set", "pressure_max", "pressure_min", "flow_set", "flow_max", "flow_min", "run_stat"],
  HydroPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroCompressor: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroPressRegulator: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HydroBus: ["idx", "name", "node", "run_stat"],
  HydroStorage: ["idx", "name", "node", "control_type", "pressure_set", "flow_set", "alpha", "flow_min", "flow_max", "run_stat", "pressure", "rated_capacity", "water_volume", "initial_soc", "soc", "soc_upper_limit", "soc_lower_limit", "pressure_max", "pressure_min"],
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
  HeatStorage: ["idx", "name", "node", "capacity", "temperature", "soc", "soc_upper_limit", "soc_lower_limit", "run_stat"],
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

export function inferESection(kind, params = {}) {
  kind = String(kind ?? "").endsWith("-vertical") && kind !== "ac-ground-disconnector-vertical"
    ? kind.slice(0, -"-vertical".length)
    : kind;
  if (kind === "ac-bus") return "ACRealBs";
  if (kind === "dc-bus") return "DCRealBs";
  if (isStaticKind(kind)) {
    const componentLibrary = String(params.component_type ?? "").trim();
    return componentLibrary && componentLibrary !== "StaticSymbol" ? componentLibrary : staticComponentLibraryForKind(kind);
  }
  if (params.component_type === "ACShuntCompensator") return "ACCompensator";
  if (params.component_type && eSectionColumns[params.component_type]) return params.component_type;
  if (kind === "ac-line") return "ACBranch";
  if (kind === "ac-capacitor" || kind === "ac-reactor" || kind === "ac-shunt") return "ACCompensator";
  if (kind === "ac-series-capacitor" || kind === "ac-series-reactor") return "ACSeriCompensator";
  if (kind === "dc-line") return "DCBranch";
  if (kind === "ac-load" || kind === "ac-terminal-transformer-load") return "ACLoad";
  if (kind === "dc-load") return "DCLoad";
  if (kind === "hydrogen-source") return "HydroSource";
  if (kind === "hydrogen-load") return "HydroLoad";
  if (kind === "hydrogen-pipeline") return "HydroPipe";
  if (kind === "hydrogen-compressor") return "HydroCompressor";
  if (kind === "hydrogen-pressure-reducer") return "HydroPressRegulator";
  if (kind === "hydrogen-shutoff-valve") return "HydroStopValve";
  if (kind === "hydrogen-bus") return "HydroBus";
  if (kind === "hydrogen-tank" || kind === "hydrogen-tank-horizontal" || kind === "hydrogen-tank-container") return "HydroStorage";
  if (kind === "ac-electrolyzer") return "AcE2Hydro";
  if (kind === "dc-electrolyzer") return "DcE2Hydro";
  if (kind === "ac-fuel-cell") return "Hydro2AcE";
  if (kind === "dc-fuel-cell") return "Hydro2DcE";
  if (kind === "heat-source" || kind === "single-port-heat-source") return "HeatSource";
  if (kind === "two-port-heat-source") return "HeatSource2";
  if (kind === "single-port-heat-load" || kind === "heat-load") return "HeatLoad";
  if (kind === "two-port-heat-load") return "HeatLoad2";
  if (kind === "heat-pipeline") return "HeatPipe";
  if (kind === "heat-shutoff-valve") return "HeatStopValve";
  if (kind === "heat-bus") return "HeatBus";
  if (kind === "thermal-storage-tank") return "HeatStorage";
  if (kind === "heat-boiler") return "HeatBoiler";
  if (kind === "two-port-heat-boiler") return "HeatBoiler2";
  if (kind === "ac-heater") return "AcE2Heat";
  if (kind === "dc-heater") return "DcE2Heat";
  if (kind === "ac-two-port-heater") return "AcE2Heat2";
  if (kind === "dc-two-port-heater") return "DcE2Heat2";
  if (kind === "heat-exchanger") return "HeatExchanger";
  if (kind === "three-port-heat-exchanger") return "HeatExchanger3";
  if (kind === "four-port-heat-exchanger") return "HeatExchanger4";
  if (kind === "heat-pump") return "HeatPump";
  if (kind?.startsWith("ac-") && kind.includes("source")) return "ACGenerator";
  if (kind?.startsWith("dc-") && kind.includes("source")) return "DCGenerator";
  if (kind === "ac-switch" || kind === "ac-disconnector") return "ACSwitch";
  if (kind === "ac-ground-disconnector" || kind === "ac-ground-disconnector-vertical") return "GroundDisconnector";
  if (kind === "dc-switch" || kind === "dc-disconnector") return "DCSwitch";
  if (kind === "ac-breaker" || kind === "ac-box-breaker") return "ACBreak";
  if (kind === "dc-breaker") return "DCBreak";
  if (kind === "ac-transformer" || kind === "ac-two-winding-transformer") return "ACTransformer";
  if (kind === "ac-three-winding-transformer" || kind === "ac-three-winding-transformer-neutral") return "ACTransfomer3";
  if (kind === "dcdc-converter") return "DCDCConverter";
  if (kind === "acdc-converter" || kind === "dcac-converter" || kind === "dcac-converter-vertical") return "DCACConverter";
  if (kind === "acac-converter") return "ACACConverter";
  return "";
}
