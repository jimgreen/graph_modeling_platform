import { normalizeProjectMeasurements, type ProjectMeasurementConfig } from "./measurements";
import {
  calculateElectricalTopology,
  getTemplateParameterDefinitions,
  isBusNode,
  templateTerminalTypes,
  virtualBusTerminal
} from "./model";

export type DeviceKind =
  | "static-text"
  | "static-line"
  | "static-polyline"
  | "static-circle"
  | "static-ellipse"
  | "static-rect"
  | "static-image"
  | "static-rounded-rect"
  | "static-diamond"
  | "static-pill"
  | "static-database"
  | "static-document"
  | "static-note"
  | "static-group-box"
  | "static-swimlane"
  | "static-point"
  | "static-ring"
  | "static-circle-node"
  | "static-straight-connector"
  | "static-arrow-connector"
  | "static-double-arrow-connector"
  | "static-elbow-connector"
  | "static-hexagon"
  | "static-parallelogram"
  | "static-triangle"
  | "static-callout"
  | "static-default-node"
  | "static-input-node"
  | "static-output-node"
  | "static-port-node"
  | "static-card-node"
  | "static-toolbar-node"
  | "static-resizer-frame"
  | "static-subflow-box"
  | "static-bezier-connector"
  | "static-smoothstep-connector"
  | "static-self-loop"
  | "static-edge-label"
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
  | "hydrogen-tank-horizontal"
  | "hydrogen-tank-container"
  | "hydrogen-load"
  | "ac-fuel-cell"
  | "dc-fuel-cell"
  | "hydrogen-bus"
  | "hydrogen-compressor"
  | "hydrogen-pressure-reducer"
  | "hydrogen-shutoff-valve"
  | "hydrogen-pipeline"
  | "hydrogen-routable-pipeline"
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
  | "heat-routable-line"
  | "heat-pump"
  | "heat-shutoff-valve"
  | "ac-line"
  | "ac-routable-line"
  | "ac-zero-branch"
  | "ac-zero-routable-branch"
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
  | "ac-three-winding-transformer-neutral"
  | "dc-source"
  | "dc-storage"
  | "dc-line"
  | "dc-routable-line"
  | "dc-zero-branch"
  | "dc-zero-routable-branch"
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
  | "hydrogen-storage-horizontal"
  | "hydrogen-storage-container"
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
  | "routable-line"
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


export const THREE_WINDING_TRANSFORMER_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: -8 / 76 },
  { x: 0.5, y: -8 / 76 },
  { x: 0, y: 0.5 }
];


export const THREE_WINDING_TRANSFORMER_NEUTRAL_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: -8 / 92 },
  { x: 0.5, y: -8 / 92 },
  { x: 0, y: 0.5 },
  { x: 0, y: -0.5 }
];


export type CanvasBounds = {
  width: number;
  height: number;
};


export type ViewBox = CanvasBounds & {
  x: number;
  y: number;
};


export type CanvasResizeDragMetrics = {
  edge: "right" | "bottom" | "corner" | "left" | "top" | "top-left" | "top-right" | "bottom-left";
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  unitsPerCssX: number;
  unitsPerCssY: number;
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
  rotation?: number;
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
  routePoints?: Point[];
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
  allowAutoExpandCanvas?: boolean;
  canvasBackgroundColor?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
  backgroundProjectId?: string;
  backgroundLayerIds?: string[];
  powerUnit?: string;
  voltageUnit?: string;
  currentUnit?: string;
  powerBaseValue?: number;
  deviceIndexCounters?: DeviceIndexCounters;
  groups?: ModelGroup[];
  measurements?: ProjectMeasurementConfig;
  nodes: ModelNode[];
  edges: Edge[];
};


export const DEFAULT_MODEL_LAYER_ID = "layer-default";

export const DEFAULT_MODEL_LAYER_NAME = "默认图层";

export const STATIC_DRAW_POINTS_PARAM = "drawPoints";

export const STATIC_ROUTE_AVOIDANCE_PARAM = "routeAvoidance";

export const ROUTABLE_LINE_POINTS_PARAM = "_routableLinePoints";

export const ROUTABLE_LINE_SOURCE_NODE_PARAM = "_routableLineSourceNodeId";

export const ROUTABLE_LINE_SOURCE_TERMINAL_PARAM = "_routableLineSourceTerminalId";

export const ROUTABLE_LINE_SOURCE_LOCAL_POINT_PARAM = "_routableLineSourceLocalPoint";

export const ROUTABLE_LINE_TARGET_NODE_PARAM = "_routableLineTargetNodeId";

export const ROUTABLE_LINE_TARGET_TERMINAL_PARAM = "_routableLineTargetTerminalId";

export const ROUTABLE_LINE_TARGET_LOCAL_POINT_PARAM = "_routableLineTargetLocalPoint";

export const ROUTABLE_LINE_DEFAULT_STROKE_WIDTH = 4;

export const ROUTABLE_LINE_LEGACY_DEFAULT_STROKE_WIDTH = 7;

export const INTERACTIVE_STATIC_DRAWING_KINDS = [
  "static-line",
  "static-polyline",
  "static-straight-connector",
  "static-arrow-connector",
  "static-double-arrow-connector",
  "static-elbow-connector",
  "static-bezier-connector",
  "static-smoothstep-connector"
] as const satisfies readonly DeviceKind[];


export const STATIC_LINE_LIKE_KINDS = [
  ...INTERACTIVE_STATIC_DRAWING_KINDS,
  "static-self-loop"
] as const satisfies readonly DeviceKind[];


export const STATIC_LINE_LIKE_KIND_SET = new Set<DeviceKind>(STATIC_LINE_LIKE_KINDS);


export const DEFAULT_POWER_UNIT = "MW";

export const DEFAULT_VOLTAGE_UNIT = "kV";

export const DEFAULT_CURRENT_UNIT = "A";

export const DEFAULT_POWER_BASE_VALUE = 100;


export const DEFAULT_STATIC_COMPONENT_TYPE = "StaticBasicShape";

export const STATIC_COMPONENT_TYPE_BY_KIND: Record<string, string> = {
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


export function staticComponentTypeForKind(kind: string): string {
  return STATIC_COMPONENT_TYPE_BY_KIND[baseDeviceKind(kind)] ?? DEFAULT_STATIC_COMPONENT_TYPE;
}


export function isStaticContainerKind(kind: string): boolean {
  return staticComponentTypeForKind(kind) === "StaticContainerSymbol";
}


export function defaultStaticRouteAvoidanceValue(kind: string): "0" | "1" {
  return isStaticContainerKind(kind) ? "0" : "1";
}


export function normalizeRouteAvoidanceFlag(value: string | undefined, fallback: "0" | "1"): "0" | "1" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on" || normalized === "是" || normalized === "参与") {
    return "1";
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off" || normalized === "否" || normalized === "不参与") {
    return "0";
  }
  return fallback;
}


export function staticNodeParticipatesInRoutingAvoidance(node: Pick<ModelNode, "kind" | "params">): boolean {
  if (!node.kind.startsWith("static-")) {
    return true;
  }
  return normalizeRouteAvoidanceFlag(
    node.params?.[STATIC_ROUTE_AVOIDANCE_PARAM],
    defaultStaticRouteAvoidanceValue(node.kind)
  ) === "1";
}


export const E_SECTION_COLUMNS: Record<string, string[]> = {
  StaticTextSymbol: [],
  StaticMediaSymbol: [],
  StaticBasicShape: [],
  StaticFlowNode: [],
  StaticButton: [],
  StaticContainerSymbol: [],
  StaticConnectorSymbol: [],
  StaticAnnotationSymbol: [],
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
  HydroStorage: ["idx", "name", "node", "run_stat"],
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
  HeatStorage: ["idx", "name", "node", "run_stat"],
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


export const E_KIND_SECTION_MAP: Record<string, string> = {
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
  "ac-heater": "AcElec2Heat",
  "dc-heater": "DcElec2Heat",
  "ac-two-port-heater": "AcElec2Heat2",
  "dc-two-port-heater": "DcElec2Heat2",
  "heat-exchanger": "HeatExchanger",
  "three-port-heat-exchanger": "HeatExchanger3",
  "four-port-heat-exchanger": "HeatExchanger4",
  "heat-pump": "HeatPump"
};


export function isContainerParams(params: Record<string, string> = {}) {
  return params.is_container === "1" || params.is_container === "true" || params.isContainer === "true";
}


export const GENERATED_VERTICAL_KIND_SUFFIX = "-vertical";

export const EXPLICIT_VERTICAL_DEVICE_KINDS = new Set<string>(["ac-ground-disconnector-vertical"]);


export function baseDeviceKind(kind: string): string {
  if (!kind.endsWith(GENERATED_VERTICAL_KIND_SUFFIX) || EXPLICIT_VERTICAL_DEVICE_KINDS.has(kind)) {
    return kind;
  }
  return kind.slice(0, -GENERATED_VERTICAL_KIND_SUFFIX.length);
}


export const ROUTABLE_LINE_DEVICE_KINDS = new Set<string>([
  "ac-routable-line",
  "ac-zero-routable-branch",
  "dc-routable-line",
  "dc-zero-routable-branch",
  "hydrogen-routable-pipeline",
  "heat-routable-line"
]);


export function isRoutableLineDeviceKind(kind: string): boolean {
  return ROUTABLE_LINE_DEVICE_KINDS.has(baseDeviceKind(kind));
}


export function inferESection(kind: string, params: Record<string, string> = {}) {
  const sectionKind = baseDeviceKind(kind);
  if (sectionKind === "ac-bus") return "ACRealBs";
  if (sectionKind === "dc-bus") return "DCRealBs";
  const componentType = params.component_type?.trim();
  if (isStaticKind(sectionKind)) {
    return componentType && componentType !== "StaticSymbol" ? componentType : staticComponentTypeForKind(sectionKind);
  }
  if (componentType) {
    return componentType;
  }
  const mappedSection = E_KIND_SECTION_MAP[sectionKind];
  if (mappedSection) {
    return mappedSection;
  }
  if (isContainerParams(params)) {
    return "";
  }
  if (sectionKind === "ac-line") return "ACBranch";
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
  if (sectionKind === "acdc-converter") return "DCACConverter";
  if (sectionKind === "acac-converter") return "ACACConverter";
  return "";
}


export type DeviceIndexCounters = Record<string, number>;


export function deviceIndexCounterKey(node: Pick<ModelNode, "kind" | "params">): string {
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


export function parseDeviceIndex(value?: string): number {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text)) {
    return 0;
  }
  return Number.parseInt(text, 10);
}


export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


export function stripGeneratedDeviceName(name?: string): string {
  return String(name ?? "")
    .trim()
    .replace(/\s*副本(?:\s*\d+)?$/u, "")
    .replace(/-\d+$/u, "")
    .trim();
}


export function deviceDefaultNameBase(node: Pick<ModelNode, "kind" | "name" | "params">): string {
  const template = DEVICE_LIBRARY.find((item) => item.kind === node.kind);
  return template?.label || stripGeneratedDeviceName(node.name) || inferESection(node.kind, node.params) || node.kind;
}


export function isGeneratedDeviceName(name: string, baseName: string): boolean {
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


export function withAllocatedDeviceName<T extends Pick<ModelNode, "kind" | "name" | "params">>(node: T, idx: number): T {
  const baseName = deviceDefaultNameBase(node);
  const currentName = node.name.trim();
  if (!isGeneratedDeviceName(currentName, baseName)) {
    return node;
  }
  const nextName = `${baseName}-${idx}`;
  return currentName === nextName ? node : { ...node, name: nextName };
}


export function parseContainerRelationField(fieldName: string) {
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


export function containerRelationBaseEnergy(energy: string) {
  if (energy === "h22") {
    return "h2";
  }
  if (energy === "ac2" || energy === "dc2" || energy === "heat2") {
    return energy.slice(0, -1);
  }
  return energy;
}


export function containerRelationCounterKey(fieldName: string): string {
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


export function isContainerTransformerRelationKey(fieldName: string): boolean {
  return /^idx_xf_t\d+$/.test(fieldName) || /_transformer_t\d+$/.test(fieldName);
}


export function containerRelationNameKey(fieldName: string): string {
  return fieldName.replace(/^idx_/, "name_");
}


export function containerRelationParamKey(fieldName: string, column: string): string {
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


export function containerRelationRoleDisplayLabel(fieldName: string): string {
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


export function containerRelationDisplayLabel(
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


export function containerAssociatedDeviceDisplayName(
  node: Pick<ModelNode, "name" | "terminals">,
  fieldName: string
): string {
  return `${node.name.trim() || "未命名容器"}_${containerRelationDisplayLabel(node, fieldName)}`;
}


export function containerAssociatedDeviceName(
  node: Pick<ModelNode, "name" | "terminals" | "params">,
  fieldName: string
): string {
  return node.params[containerRelationNameKey(fieldName)]?.trim() || containerAssociatedDeviceDisplayName(node, fieldName);
}


export function deriveContainerRelationCounters(params: Record<string, string>, counters: DeviceIndexCounters) {
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


export function assignContainerRelationIndexes<T extends Pick<ModelNode, "params">>(
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


export function normalizeRunStatForE(value?: string) {
  if (!value) return "";
  if (value === "运行") return "1";
  if (value === "停运" || value === "检修") return "0";
  return value;
}


export function normalizeSwitchStatusForE(value?: string) {
  if (!value) return "";
  if (value === "闭合") return "1";
  if (value === "合闸") return "1";
  if (value === "打开") return "0";
  if (value === "分闸") return "0";
  return value;
}


export function normalizeControlTypeForE(value?: string) {
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


export function normalizeAcGeneratorControlTypeForE(value?: string) {
  if (!value) return "PV";
  const normalized = normalizeControlTypeForE(value);
  return (AC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(normalized) ? normalized : "PV";
}


export function normalizeDcGeneratorControlTypeForE(value?: string) {
  if (!value) return "P";
  const normalized = normalizeControlTypeForE(value);
  return (DC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(normalized) ? normalized : "P";
}


export function normalizeDcdcEndpointControlTypeForE(value?: string) {
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


export function normalizeDcacConverterControlTypeForE(params: Record<string, string>) {
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


export function normalizeAcacConverterControlTypeForE(params: Record<string, string>) {
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


export function terminalNodeNumber(node: Pick<ModelNode, "nodeNumber" | "terminals">, index: number) {
  return node.terminals[index]?.nodeNumber ?? (index === 0 ? node.nodeNumber : "") ?? "";
}


export function mappedLegacyEValue(key: string, params: Record<string, string>) {
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


export type EDeviceExport = {
  id: string;
  kind: string;
  section: string;
  params: Record<string, string>;
};


export type EParamValueOptions = {
  preferTopologyNodeNumbers?: boolean;
};


export const E_SECTION_OUTPUT_ORDER = [
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
  "HydroStorage",
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
  "HeatStorage",
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


export const E_INTEGER_COLUMNS = new Set([
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


export const E_FLOAT_COLUMNS = new Set([
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


export function customEParameterKeys(params: Record<string, string>) {
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


export function firstText(values: Array<string | undefined>): string {
  return values.find((value) => value !== undefined && value.trim() !== "") ?? "";
}


export function terminalVoltageDisplay(node: ModelNode, terminal: Terminal): string {
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


export function isZeroNumericText(value?: string): boolean {
  const normalized = normalizeVoltageBaseInput(value);
  return normalized !== "" && Number(normalized) === 0;
}


export function shouldAssignVoltageSetpointDefault(value?: string): boolean {
  return value === undefined || value.trim() === "" || isZeroNumericText(value);
}


export function topologyRepresentativeScore(node: ModelNode): number {
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


export function buildTopologyNodeDevices(nodes: ModelNode[]): EDeviceExport[] {
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
    if (isThreeWindingTransformer(node) && !hasVisibleThreeWindingNeutralTerminal(node) && node.params.neutral_node) {
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


export const THREE_WINDING_TRANSFORMER_SIDES = [
  { suffix: "high", label: "高压绕组", terminalIndex: 0, idxKey: "idx_xf_t1" },
  { suffix: "medium", label: "中压绕组", terminalIndex: 1, idxKey: "idx_xf_t2" },
  { suffix: "low", label: "低压绕组", terminalIndex: 2, idxKey: "idx_xf_t3" }
] as const;


export function buildThreeWindingTransformerBranchDevices(nodes: ModelNode[]): EDeviceExport[] {
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


export function buildACTransfomer3Devices(nodes: ModelNode[]): EDeviceExport[] {
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


export function buildContainerAssociatedDevices(nodes: ModelNode[]): EDeviceExport[] {
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


export function buildEDeviceRecords(project: ProjectFile): EDeviceExport[] {
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


export function normalizeEFileToken(value: string) {
  return value.trim().replace(/\s+/g, "_") || "0";
}


export function firstNumericToken(value: string) {
  return value.trim().match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? "";
}


export function defaultEColumnValue(column: string, rowIndex: number) {
  if (column === "idx") return String(rowIndex + 1);
  if (column === "name") return `unnamed_${rowIndex + 1}`;
  if (column === "run_stat") return "1";
  if (column === "status") return "1";
  if (column === "control_type") return "0";
  if (column === "i_control_type" || column === "j_control_type") return "SLACK";
  if (column === "tap" || column === "alpha" || column === "voltage" || column === "vbase") return "1.0";
  return "0";
}


export function defaultContainerAssociatedColumnValue(section: string, column: string, rowIndex = 0) {
  if (section === "ACLoad" || section === "DCLoad") {
    if (column === "pv0" || column === "qv0") return "1.0";
    if (column === "pv1" || column === "pv2" || column === "qv1" || column === "qv2") return "0.0";
  }
  if (section === "ACGenerator" && column === "control_type") return "PV";
  if (section === "DCGenerator" && column === "control_type") return "P";
  return defaultEColumnValue(column, rowIndex);
}


export function formatEColumnValue(section: string, column: string, value: string | undefined, rowIndex: number) {
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


export function eRecordIdxSortValue(record: EDeviceExport): number {
  const value = firstNumericToken(String(record.params.idx ?? ""));
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : Number.POSITIVE_INFINITY;
}


export function sortESectionRecordsByIdx(rows: EDeviceExport[]): EDeviceExport[] {
  return rows
    .map((record, order) => ({ record, order }))
    .sort((first, second) => {
      const idxDelta = eRecordIdxSortValue(first.record) - eRecordIdxSortValue(second.record);
      return idxDelta !== 0 ? idxDelta : first.order - second.order;
    })
    .map(({ record }) => record);
}


export function eSectionColumns(section: string, rows: EDeviceExport[]) {
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


export function formatESection(section: string, rows: EDeviceExport[]) {
  const columns = eSectionColumns(section, rows);
  const bodyRows = sortESectionRecordsByIdx(rows)
    .map((record, rowIndex) => `# ${columns.map((column) => formatEColumnValue(section, column, record.params[column], rowIndex)).join(" ")}`)
    .join("\n");
  return `<${section}>\n@ ${columns.join(" ")}\n${bodyRows}\n</${section}>`;
}


export function buildPowerBaseSection(project: ProjectFile) {
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


export function safeModelFilePart(name: string) {
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


export type PersistedSavedProjectRecord = Omit<SavedProjectRecord, "id">;


export type SavedSchemeRecord = {
  id: string;
  name: string;
  updatedAt: string;
  projects: SavedProjectRecord[];
  children?: SavedSchemeRecord[];
};


export type PersistedSavedSchemeRecord = Omit<SavedSchemeRecord, "id" | "projects" | "children"> & {
  projects: PersistedSavedProjectRecord[];
  children?: PersistedSavedSchemeRecord[];
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


export type ConnectionEndpointRuleIssueType =
  | "duplicate-terminal-pair"
  | "duplicate-terminal-bus"
  | "same-device-terminals"
  | "shared-opposite-terminal";


export type ConnectionEndpointRuleIssue = {
  type: ConnectionEndpointRuleIssueType;
  edgeId: string;
  message: string;
  conflictingEdgeId?: string;
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


export const readonlyIntegerDefinition = (cnName: string, enName: string, typicalValue = ""): DeviceParameterDefinition => ({
  cnName,
  enName,
  valueType: "integer",
  typicalValue,
  readonly: true
});


export const threeWindingTransformerParameterDefinitions: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  { cnName: "运行状态", enName: "run_stat", valueType: "enum", typicalValue: "运行", readonly: true },
  readonlyIntegerDefinition("高压绕组双绕组主变idx", "idx_xf_t1"),
  readonlyIntegerDefinition("中压绕组双绕组主变idx", "idx_xf_t2"),
  readonlyIntegerDefinition("低压绕组双绕组主变idx", "idx_xf_t3")
];


export function defaultStaticButtonParams(kind: DeviceKind): Record<string, string> {
  if (!isStaticButtonCapableKind(kind)) {
    return {};
  }
  return {
    buttonEnabled: kind === "static-button" ? "1" : "0",
    buttonActionType: "none",
    buttonTargetSchemeId: "",
    buttonTargetProjectId: "",
    buttonTargetProjectName: "",
    buttonTargetLayerId: "",
    buttonTargetLayerName: "",
    buttonTargetLayerIds: "",
    buttonTargetLayerNames: "",
    buttonCommand: "none"
  };
}


export function withStaticButtonCapability(kind: DeviceKind, params: Record<string, string>): Record<string, string> {
  return {
    ...defaultStaticButtonParams(kind),
    ...params
  };
}


export const staticSymbolParams = (
  kind: DeviceKind,
  text: string,
  overrides: Partial<Record<string, string>> = {}
): Record<string, string> => ({
  ...withStaticButtonCapability(kind, {
    component_type: staticComponentTypeForKind(kind),
    [STATIC_ROUTE_AVOIDANCE_PARAM]: defaultStaticRouteAvoidanceValue(kind),
    text,
    fillColor: "#ffffff",
    strokeColor: "#64748b",
    textColor: "#111827",
    lineWidth: "2",
    strokeStyle: "solid",
    fontSize: "16",
    fontFamily: "Arial",
    fontWeight: "500",
    fontStyle: "normal",
    textDecoration: "none",
    cornerRadius: "8",
    accentColor: "#2563eb",
    shadowEnabled: "0",
    padding: "12",
    textAlign: "center",
    verticalAlign: "middle",
    markerStart: "none",
    markerEnd: "none",
    arrowSize: "10",
    handleColor: "#2563eb",
    handleSize: "8",
    ...overrides
  })
});


export const staticVisualParams = (
  kind: DeviceKind,
  params: Record<string, string>
): Record<string, string> => ({
  ...withStaticButtonCapability(kind, {
    component_type: staticComponentTypeForKind(kind),
    [STATIC_ROUTE_AVOIDANCE_PARAM]: defaultStaticRouteAvoidanceValue(kind),
    ...params
  })
});


export const BASE_DEVICE_LIBRARY: DeviceTemplate[] = [
  {
    kind: "static-text",
    label: "文字",
    attributeLibrary: "静态图元",
    size: { width: 120, height: 40 },
    params: staticVisualParams("static-text", {
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
    }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-line",
    label: "直线",
    attributeLibrary: "静态图元",
    size: { width: 140, height: 24 },
    params: staticVisualParams("static-line", { fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-polyline",
    label: "折线",
    attributeLibrary: "静态图元",
    size: { width: 140, height: 70 },
    params: staticVisualParams("static-polyline", { fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-circle",
    label: "正圆",
    attributeLibrary: "静态图元",
    size: { width: 72, height: 72 },
    params: staticVisualParams("static-circle", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-ellipse",
    label: "椭圆",
    attributeLibrary: "静态图元",
    size: { width: 112, height: 70 },
    params: staticVisualParams("static-ellipse", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-rect",
    label: "方框",
    attributeLibrary: "静态图元",
    size: { width: 112, height: 70 },
    params: staticVisualParams("static-rect", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-image",
    label: "图片",
    attributeLibrary: "静态图元",
    size: { width: 140, height: 90 },
    params: staticVisualParams("static-image", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#64748b", lineWidth: "0", strokeStyle: "solid", fontSize: "16", backgroundImage: "", backgroundImageAssetId: "" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-rounded-rect",
    label: "圆角节点",
    attributeLibrary: "静态图元",
    size: { width: 132, height: 72 },
    params: staticSymbolParams("static-rounded-rect", "圆角节点", { cornerRadius: "12", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-diamond",
    label: "判断节点",
    attributeLibrary: "静态图元",
    size: { width: 116, height: 86 },
    params: staticSymbolParams("static-diamond", "判断", { fillColor: "#fefce8", strokeColor: "#ca8a04", accentColor: "#eab308", padding: "18" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-pill",
    label: "起止节点",
    attributeLibrary: "静态图元",
    size: { width: 132, height: 58 },
    params: staticSymbolParams("static-pill", "开始/结束", { fillColor: "#ecfdf5", strokeColor: "#059669", accentColor: "#10b981", cornerRadius: "999" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-database",
    label: "数据库",
    attributeLibrary: "静态图元",
    size: { width: 112, height: 88 },
    params: staticSymbolParams("static-database", "数据库", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", verticalAlign: "middle" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-document",
    label: "文档",
    attributeLibrary: "静态图元",
    size: { width: 106, height: 128 },
    params: staticSymbolParams("static-document", "文档", { fillColor: "#ffffff", strokeColor: "#475569", accentColor: "#94a3b8", verticalAlign: "top", padding: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-note",
    label: "便签",
    attributeLibrary: "静态图元",
    size: { width: 126, height: 92 },
    params: staticSymbolParams("static-note", "便签", { fillColor: "#fef9c3", strokeColor: "#ca8a04", accentColor: "#facc15", cornerRadius: "6", verticalAlign: "top" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-group-box",
    label: "分组框",
    attributeLibrary: "静态图元",
    size: { width: 180, height: 112 },
    params: staticSymbolParams("static-group-box", "分组", { fillColor: "transparent", strokeColor: "#64748b", accentColor: "#64748b", cornerRadius: "8", strokeStyle: "dashed", textAlign: "left", verticalAlign: "top" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-swimlane",
    label: "泳道",
    attributeLibrary: "静态图元",
    size: { width: 220, height: 122 },
    params: staticSymbolParams("static-swimlane", "泳道", { fillColor: "#f8fafc", strokeColor: "#475569", accentColor: "#dbeafe", textAlign: "left", verticalAlign: "top", padding: "14" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-point",
    label: "连接点",
    attributeLibrary: "静态图元",
    size: { width: 22, height: 22 },
    params: staticSymbolParams("static-point", "", { fillColor: "#2563eb", strokeColor: "#ffffff", accentColor: "#2563eb", lineWidth: "2", padding: "4" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-ring",
    label: "圆环点",
    attributeLibrary: "静态图元",
    size: { width: 28, height: 28 },
    params: staticSymbolParams("static-ring", "", { fillColor: "transparent", strokeColor: "#2563eb", accentColor: "#60a5fa", lineWidth: "3", padding: "4" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-circle-node",
    label: "圆形节点",
    attributeLibrary: "静态图元",
    size: { width: 86, height: 86 },
    params: staticSymbolParams("static-circle-node", "圆形节点", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", cornerRadius: "999", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-straight-connector",
    label: "直线连接",
    attributeLibrary: "静态图元",
    size: { width: 150, height: 28 },
    params: staticSymbolParams("static-straight-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "none", arrowSize: "10" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-arrow-connector",
    label: "箭头连接",
    attributeLibrary: "静态图元",
    size: { width: 150, height: 32 },
    params: staticSymbolParams("static-arrow-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-double-arrow-connector",
    label: "双向箭头",
    attributeLibrary: "静态图元",
    size: { width: 150, height: 32 },
    params: staticSymbolParams("static-double-arrow-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "arrow", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-elbow-connector",
    label: "折线连接",
    attributeLibrary: "静态图元",
    size: { width: 150, height: 82 },
    params: staticSymbolParams("static-elbow-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-hexagon",
    label: "六边形",
    attributeLibrary: "静态图元",
    size: { width: 126, height: 78 },
    params: staticSymbolParams("static-hexagon", "六边形", { fillColor: "#f8fafc", strokeColor: "#475569", accentColor: "#94a3b8", padding: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-parallelogram",
    label: "平行四边形",
    attributeLibrary: "静态图元",
    size: { width: 132, height: 76 },
    params: staticSymbolParams("static-parallelogram", "输入/输出", { fillColor: "#f0f9ff", strokeColor: "#0284c7", accentColor: "#38bdf8", padding: "18" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-triangle",
    label: "三角形",
    attributeLibrary: "静态图元",
    size: { width: 96, height: 86 },
    params: staticSymbolParams("static-triangle", "三角", { fillColor: "#fff7ed", strokeColor: "#ea580c", accentColor: "#fb923c", padding: "18", verticalAlign: "bottom" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-callout",
    label: "标注气泡",
    attributeLibrary: "静态图元",
    size: { width: 154, height: 86 },
    params: staticSymbolParams("static-callout", "标注", { fillColor: "#ffffff", strokeColor: "#475569", accentColor: "#2563eb", cornerRadius: "10", textAlign: "left", verticalAlign: "top", padding: "14", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-default-node",
    label: "默认节点",
    attributeLibrary: "静态图元",
    size: { width: 142, height: 64 },
    params: staticSymbolParams("static-default-node", "默认节点", { fillColor: "#ffffff", strokeColor: "#1f2937", accentColor: "#3b82f6", cornerRadius: "8", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-input-node",
    label: "输入节点",
    attributeLibrary: "静态图元",
    size: { width: 142, height: 64 },
    params: staticSymbolParams("static-input-node", "输入", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", cornerRadius: "8", handleColor: "#2563eb" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-output-node",
    label: "输出节点",
    attributeLibrary: "静态图元",
    size: { width: 142, height: 64 },
    params: staticSymbolParams("static-output-node", "输出", { fillColor: "#ecfdf5", strokeColor: "#059669", accentColor: "#34d399", cornerRadius: "8", handleColor: "#059669" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-port-node",
    label: "端口节点",
    attributeLibrary: "静态图元",
    size: { width: 148, height: 82 },
    params: staticSymbolParams("static-port-node", "端口节点", { fillColor: "#f8fafc", strokeColor: "#334155", accentColor: "#94a3b8", cornerRadius: "10", handleColor: "#2563eb", handleSize: "9" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-card-node",
    label: "卡片节点",
    attributeLibrary: "静态图元",
    size: { width: 168, height: 98 },
    params: staticSymbolParams("static-card-node", "卡片节点", { fillColor: "#ffffff", strokeColor: "#cbd5e1", accentColor: "#2563eb", cornerRadius: "10", textAlign: "left", verticalAlign: "top", padding: "16", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-toolbar-node",
    label: "工具条节点",
    attributeLibrary: "静态图元",
    size: { width: 170, height: 96 },
    params: staticSymbolParams("static-toolbar-node", "工具条节点", { fillColor: "#ffffff", strokeColor: "#64748b", accentColor: "#e2e8f0", cornerRadius: "10", verticalAlign: "bottom", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-button",
    label: "按钮",
    attributeLibrary: "静态图元",
    size: { width: 132, height: 52 },
    params: staticSymbolParams("static-button", "按钮", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", cornerRadius: "8", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-resizer-frame",
    label: "缩放框",
    attributeLibrary: "静态图元",
    size: { width: 166, height: 104 },
    params: staticSymbolParams("static-resizer-frame", "", { fillColor: "transparent", strokeColor: "#2563eb", accentColor: "#2563eb", lineWidth: "2", strokeStyle: "dashed", handleColor: "#ffffff", handleSize: "10" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-subflow-box",
    label: "子流程框",
    attributeLibrary: "静态图元",
    size: { width: 210, height: 136 },
    params: staticSymbolParams("static-subflow-box", "子流程", { fillColor: "#f8fafc", strokeColor: "#475569", accentColor: "#dbeafe", cornerRadius: "10", textAlign: "left", verticalAlign: "top", padding: "14" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-bezier-connector",
    label: "贝塞尔连接",
    attributeLibrary: "静态图元",
    size: { width: 156, height: 72 },
    params: staticSymbolParams("static-bezier-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-smoothstep-connector",
    label: "平滑折线",
    attributeLibrary: "静态图元",
    size: { width: 156, height: 76 },
    params: staticSymbolParams("static-smoothstep-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-self-loop",
    label: "自环连接",
    attributeLibrary: "静态图元",
    size: { width: 104, height: 86 },
    params: staticSymbolParams("static-self-loop", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "10" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-edge-label",
    label: "边标签",
    attributeLibrary: "静态图元",
    size: { width: 104, height: 42 },
    params: staticSymbolParams("static-edge-label", "边标签", { fillColor: "#ffffff", strokeColor: "#cbd5e1", accentColor: "#2563eb", cornerRadius: "999", padding: "10", shadowEnabled: "1" }),
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
    kind: "hydrogen-tank-horizontal",
    label: "横卧式储氢罐",
    attributeLibrary: "氢能设备",
    size: { width: 150, height: 54 },
    params: { pressure: "35 MPa", capacity: "1000 kg", storageType: "horizontal" },
    terminalType: "h2",
    terminalCount: 0
  },
  {
    kind: "hydrogen-tank-container",
    label: "集装格式储氢罐",
    attributeLibrary: "氢能设备",
    size: { width: 142, height: 66 },
    params: { pressure: "35 MPa", capacity: "1000 kg", storageType: "container" },
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
    kind: "hydrogen-routable-pipeline",
    label: "输氢管道（自适应）",
    attributeLibrary: "氢能设备",
    size: { width: 150, height: 36 },
    params: { length: "1 km", diameter: "DN200", component_type: "HydroPipe", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
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
    kind: "heat-routable-line",
    label: "热力线路（自适应）",
    attributeLibrary: "热能设备",
    size: { width: 150, height: 36 },
    params: { length: "1 km", diameter: "DN200", component_type: "HeatPipe", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
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
    kind: "ac-routable-line",
    label: "交流线路（自适应）",
    attributeLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { r: "0.1", x: "1.0", b: "0.0", component_type: "ACBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
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
    kind: "ac-zero-routable-branch",
    label: "交流零阻抗支路（自适应）",
    attributeLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { component_type: "ACZeroBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
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
    terminalCount: 1,
    terminalAnchors: [{ x: 0, y: -0.5 }]
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
    kind: "ac-three-winding-transformer-neutral",
    label: "三绕组主变(中性点)",
    attributeLibrary: "交流设备",
    size: { width: 112, height: 92 },
    params: { ratedCapacity: "90 MVA", voltageRatio: "220/110/10/0.4 kV", windingType: "三绕组带中性点", impedance: "12.0%" },
    terminalType: "ac",
    terminalCount: 4,
    terminalLabels: ["高压绕组端", "中压绕组端", "低压绕组端", "中性点"],
    terminalAnchors: THREE_WINDING_TRANSFORMER_NEUTRAL_TERMINAL_ANCHORS,
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
    kind: "dc-routable-line",
    label: "直流线路（自适应）",
    attributeLibrary: "直流设备",
    size: { width: 150, height: 36 },
    params: { r: "1.0", component_type: "DCBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
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
    kind: "dc-zero-routable-branch",
    label: "直流零阻抗支路（自适应）",
    attributeLibrary: "直流设备",
    size: { width: 150, height: 36 },
    params: { component_type: "DCZeroBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
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
    terminalCount: 1,
    terminalAnchors: [{ x: 0, y: -0.5 }]
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


export const VERTICAL_BUS_TEMPLATE_KINDS = new Set<string>(["ac-bus", "dc-bus", "hydrogen-bus", "heat-bus"]);


export function shouldCreateVerticalDeviceTemplate(template: DeviceTemplate): boolean {
  if (template.kind.endsWith(GENERATED_VERTICAL_KIND_SUFFIX)) {
    return false;
  }
  if (isRoutableLineDeviceKind(template.kind)) {
    return false;
  }
  return VERTICAL_BUS_TEMPLATE_KINDS.has(template.kind) || template.terminalCount === 2;
}


export function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}


export const DEFAULT_DEVICE_LONGEST_SIDE = 150;

export const DEFAULT_DEVICE_LABEL_FONT_SIZE = 12;

export const DEFAULT_DEVICE_LABEL_GAP = 18;


export function roundDefaultDeviceSize(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}


export function normalizeDefaultDeviceSize(kind: string, size: DeviceTemplate["size"]): DeviceTemplate["size"] {
  if (kind.startsWith("static-")) {
    return { ...size };
  }
  const width = Number.isFinite(size.width) && size.width > 0 ? size.width : DEFAULT_DEVICE_LONGEST_SIDE;
  const height = Number.isFinite(size.height) && size.height > 0 ? size.height : DEFAULT_DEVICE_LONGEST_SIDE;
  const longestSide = Math.max(width, height);
  const scale = DEFAULT_DEVICE_LONGEST_SIDE / longestSide;
  return {
    width: roundDefaultDeviceSize(width * scale),
    height: roundDefaultDeviceSize(height * scale)
  };
}


export function normalizeDeviceTemplateDefaultSize(template: DeviceTemplate): DeviceTemplate {
  return {
    ...template,
    size: normalizeDefaultDeviceSize(template.kind, template.size)
  };
}


export function createVerticalDeviceTemplate(template: DeviceTemplate): DeviceTemplate {
  return {
    ...template,
    kind: `${template.kind}${GENERATED_VERTICAL_KIND_SUFFIX}`,
    label: `${template.label}（竖向）`,
    size: { ...template.size },
    params: { ...template.params },
    terminalTypes: template.terminalTypes ? [...template.terminalTypes] : undefined,
    terminalLabels: template.terminalLabels ? [...template.terminalLabels] : undefined,
    terminalAnchors: template.terminalAnchors?.map(clonePoint),
    terminalRoles: template.terminalRoles ? [...template.terminalRoles] : undefined,
    terminalAssociations: template.terminalAssociations ? [...template.terminalAssociations] : undefined,
    parameterDefinitions: template.parameterDefinitions?.map((definition) => ({ ...definition })),
    rotation: 90
  };
}


export const NORMALIZED_BASE_DEVICE_LIBRARY = BASE_DEVICE_LIBRARY.map(normalizeDeviceTemplateDefaultSize);


export const DEVICE_LIBRARY: DeviceTemplate[] = [
  ...NORMALIZED_BASE_DEVICE_LIBRARY,
  ...NORMALIZED_BASE_DEVICE_LIBRARY.filter(shouldCreateVerticalDeviceTemplate).map(createVerticalDeviceTemplate)
];


export let nodeNumberSeed = 1;

export const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const makeNodeNumber = () => `N${nodeNumberSeed++}`;

export const CUSTOM_PARAM_DEFINITIONS_KEY = "_customParamDefinitions";

export const CUSTOM_DEVICE_TEMPLATE_KEY = "_customDeviceTemplate";


export const DEFAULT_INITIAL_TERMINAL_VBASE = "0";


export const defaultTerminalVbase = (_type: TerminalType) => DEFAULT_INITIAL_TERMINAL_VBASE;


export function isImplicitTerminalVbaseForType(value: string | undefined, type: TerminalType): boolean {
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


export const terminalTypeLabel = (type: TerminalType) => TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type;


export const terminalPortLabel = (type: TerminalType) => {
  return terminalTypeLabel(type);
};


export const terminalLabelForType = (type: TerminalType, index: number) => `${terminalTypeLabel(type)}端${index + 1}`;


export const containerTerminalRoleLabel = (role: ContainerTerminalRole) => {
  if (role === "double-source") return "双端源";
  if (role === "single-source") return "单端源";
  if (role === "double-load") return "双端荷";
  return "单端荷";
};


export const containerTerminalAssociationDefinitions: Record<
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


export const containerTerminalAssociationLabel = (association: ContainerTerminalAssociationType) =>
  containerTerminalAssociationDefinitions[association]?.label ?? association;


export function defaultContainerAssociationFor(type: TerminalType, role: ContainerTerminalRole = "single-load"): ContainerTerminalAssociationType {
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


export function getContainerTerminalAssociationDependencyIndex(
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


export function getContainerTerminalRoleDependencyIndex(terminalRoles: readonly ContainerTerminalRole[], terminalIndex: number): number {
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

  if (isThreeWindingTransformer({ kind: template.kind })) {
    return THREE_WINDING_TRANSFORMER_SIDES.map((side) => {
      const type = terminalTypes[side.terminalIndex] ?? "ac";
      const terminalLabel = template.terminalLabels?.[side.terminalIndex] ?? terminalLabelForType(type, side.terminalIndex);
      const relationDefinition = definitions.find((definition) => definition.enName === side.idxKey);
      const roleLabel = "双绕组主变首端";
      return {
        terminalIndex: side.terminalIndex,
        terminalLabel,
        terminalType: type,
        relationKey: side.idxKey,
        relationName: relationDefinition?.cnName ?? `${terminalLabel}${roleLabel}关联idx`,
        roleLabel,
        deviceModel: "ACTransformer",
        sourceTerminalIndex: side.terminalIndex,
        dependent: false
      };
    });
  }

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


export function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}


export function viewRow(key: string, label: string, value: string, readonly = true, paramKey?: string): ContainerDeviceParameterViewRow {
  return { key, label, value, readonly, paramKey };
}


export function associatedNodeColumnValue(
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


export function associatedDeviceRows(
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
  return baseDeviceKind(kind).includes("source");
}


export function isGeneratorNode(node: ModelNode): boolean {
  return isGeneratorKind(node.kind);
}


export function getDeviceGlyphVariant(kind: DeviceKind): DeviceGlyphVariant {
  const glyphKind = baseDeviceKind(kind) as DeviceKind;
  if (glyphKind.startsWith("static-")) return "static";
  if (glyphKind === "ac-source") return "ac-generator";
  if (glyphKind === "dc-source") return "dc-generator";
  if (glyphKind === "ac-storage") return "battery-storage";
  if (glyphKind === "dc-storage") return "battery-storage";
  if (glyphKind === "ac-electrolyzer") return "ac-hydrogen-electrolyzer";
  if (glyphKind === "dc-electrolyzer") return "dc-hydrogen-electrolyzer";
  if (glyphKind === "hydrogen-source") return "hydrogen-source";
  if (glyphKind === "hydrogen-tank") return "hydrogen-storage";
  if (glyphKind === "hydrogen-tank-horizontal") return "hydrogen-storage-horizontal";
  if (glyphKind === "hydrogen-tank-container") return "hydrogen-storage-container";
  if (glyphKind === "hydrogen-load") return "hydrogen-load";
  if (glyphKind === "ac-fuel-cell") return "ac-hydrogen-fuel-cell";
  if (glyphKind === "dc-fuel-cell") return "dc-hydrogen-fuel-cell";
  if (glyphKind === "hydrogen-bus") return "hydrogen-bus";
  if (glyphKind === "hydrogen-compressor") return "hydrogen-compressor";
  if (glyphKind === "hydrogen-pressure-reducer") return "hydrogen-regulator";
  if (glyphKind === "hydrogen-shutoff-valve") return "hydrogen-valve";
  if (glyphKind === "hydrogen-pipeline") return "hydrogen-pipeline";
  if (glyphKind === "heat-boiler") return "single-heat-boiler";
  if (glyphKind === "two-port-heat-boiler") return "two-port-heat-boiler";
  if (glyphKind === "heat-source") return "single-heat-source";
  if (glyphKind === "two-port-heat-source") return "two-port-heat-source";
  if (glyphKind === "heat-exchanger") return "heat-exchanger-two";
  if (glyphKind === "three-port-heat-exchanger") return "heat-exchanger-three";
  if (glyphKind === "four-port-heat-exchanger") return "heat-exchanger-four";
  if (glyphKind === "ac-heater") return "ac-heat-electric-heater";
  if (glyphKind === "ac-two-port-heater") return "ac-two-port-heat-electric-heater";
  if (glyphKind === "dc-heater") return "dc-heat-electric-heater";
  if (glyphKind === "dc-two-port-heater") return "dc-two-port-heat-electric-heater";
  if (glyphKind === "thermal-storage-tank") return "heat-storage";
  if (glyphKind === "single-port-heat-load") return "single-heat-load";
  if (glyphKind === "two-port-heat-load") return "two-port-heat-load";
  if (glyphKind === "heat-load") return "heat-load";
  if (glyphKind === "heat-bus") return "heat-bus";
  if (glyphKind === "heat-pipeline") return "heat-pipeline";
  if (glyphKind === "heat-pump") return "heat-pump";
  if (glyphKind === "heat-shutoff-valve") return "heat-valve";
  if (glyphKind.includes("wind-source")) return "wind-source";
  if (glyphKind.includes("pv-source")) return "pv-source";
  if (glyphKind.includes("thermal-source")) return "thermal-source";
  if (glyphKind.includes("hydro-source")) return "hydro-source";
  if (glyphKind.includes("nuclear-source")) return "nuclear-source";
  if (glyphKind.includes("bus")) return "bus";
  if (isRoutableLineDeviceKind(glyphKind)) return "routable-line";
  if (glyphKind === "ac-line") return "ac-line";
  if (glyphKind === "dc-line") return "dc-line";
  if (glyphKind.includes("line") || glyphKind.includes("zero-branch")) return "line";
  if (glyphKind === "ac-terminal-transformer-load") return "terminal-transformer-load";
  if (glyphKind.includes("transformer")) return "transformer";
  if (glyphKind === "ac-ground-disconnector-vertical") return "ground-disconnector-vertical";
  if (glyphKind === "ac-ground-disconnector") return "ground-disconnector";
  if (glyphKind.includes("switch")) return "switch";
  if (glyphKind.includes("disconnector")) return "disconnector";
  if (glyphKind === "ac-box-breaker") return "box-breaker";
  if (glyphKind.includes("breaker")) return "breaker";
  if (glyphKind.includes("load")) return "load";
  if (glyphKind === "dcdc-converter") return "dcdc-converter";
  if (glyphKind === "acdc-converter") return "acdc-converter";
  if (glyphKind === "acac-converter") return "acac-converter";
  if (glyphKind.startsWith("custom-") || glyphKind.startsWith("custom:")) return "custom-device";
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


export function buildDefaultVoltagePalette(): Record<string, string> {
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


export function normalizeColorRecord(source: unknown, fallback: Record<string, string>): Record<string, string> {
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


export function voltageColorFallback(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return `hsl(${hash} 72% 42%)`;
}


export function voltageColorKey(value?: string): string {
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


export function isElectricColorType(type?: TerminalType): type is "ac" | "dc" {
  return type === "ac" || type === "dc";
}


export function findDisplayTerminal(
  node: Pick<ModelNode, "kind" | "terminals" | "params"> | undefined,
  terminalId?: string
): Terminal | undefined {
  if (!node) {
    return undefined;
  }
  return node.terminals.find((terminal) => terminal.id === terminalId) ?? node.terminals[0] ?? virtualBusTerminal(node, terminalId);
}


export function terminalVoltageDisplayForColor(node: Pick<ModelNode, "params">, terminal?: Pick<Terminal, "vbase">): string {
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


export function findTerminalType(node: Pick<ModelNode, "kind" | "terminals" | "params"> | undefined, terminalId?: string): TerminalType | undefined {
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


export function isHydrogenVisualKind(kind: string): boolean {
  const visualKind = baseDeviceKind(kind);
  return visualKind.startsWith("hydrogen-") || visualKind.includes("electrolyzer") || visualKind.includes("fuel-cell");
}


export function isThermalVisualKind(kind: string): boolean {
  const visualKind = baseDeviceKind(kind);
  return (
    visualKind.startsWith("heat-") ||
    visualKind === "ac-heater" ||
    visualKind === "dc-heater" ||
    visualKind === "ac-two-port-heater" ||
    visualKind === "dc-two-port-heater" ||
    visualKind === "thermal-storage-tank" ||
    visualKind.includes("port-heat-")
  );
}


export function isPureHydrogenNetworkKind(kind: string): boolean {
  return baseDeviceKind(kind).startsWith("hydrogen-");
}


export function isPureThermalNetworkKind(kind: string): boolean {
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


export const DEVICE_STROKE_WIDTH_BY_VARIANT: Partial<Record<DeviceGlyphVariant, number>> = {
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
  "hydrogen-storage-horizontal": 2.4,
  "hydrogen-storage-container": 2.4,
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
  "routable-line": ROUTABLE_LINE_DEFAULT_STROKE_WIDTH,
  line: 4,
  "dcdc-converter": 2.2,
  "acdc-converter": 2.2,
  "acac-converter": 2.2
};


export function getDeviceStrokeWidth(node: Pick<ModelNode, "kind" | "params">): number {
  const explicitWidth = Number(node.params.lineWidth ?? "");
  if (Number.isFinite(explicitWidth) && explicitWidth > 0) {
    if (isRoutableLineDeviceKind(node.kind) && explicitWidth === ROUTABLE_LINE_LEGACY_DEFAULT_STROKE_WIDTH) {
      return ROUTABLE_LINE_DEFAULT_STROKE_WIDTH;
    }
    return explicitWidth;
  }
  return DEVICE_STROKE_WIDTH_BY_VARIANT[getDeviceGlyphVariant(node.kind)] ?? 2.5;
}


export function normalizeRoutableLineDeviceStrokeWidthParam(node: ModelNode): ModelNode {
  if (!isRoutableLineDeviceKind(node.kind)) {
    return node;
  }
  const explicitWidth = Number(node.params.lineWidth ?? "");
  if (
    node.params.lineWidth &&
    explicitWidth !== ROUTABLE_LINE_LEGACY_DEFAULT_STROKE_WIDTH
  ) {
    return node;
  }
  return {
    ...node,
    params: {
      ...node.params,
      lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH)
    }
  };
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


export function isStaticLineLikeKind(kind: DeviceKind): boolean {
  return STATIC_LINE_LIKE_KIND_SET.has(baseDeviceKind(kind) as DeviceKind);
}


export function isStaticBoxLikeKind(kind: DeviceKind): boolean {
  const baseKind = baseDeviceKind(kind) as DeviceKind;
  if (!isStaticKind(baseKind) || isStaticLineLikeKind(baseKind)) {
    return false;
  }
  if (baseKind === "static-point" || baseKind === "static-ring") {
    return false;
  }
  return staticComponentTypeForKind(baseKind) !== "StaticConnectorSymbol";
}


export function isStaticBoxLikeNode(node: ModelNode): boolean {
  return isStaticBoxLikeKind(node.kind);
}


export function isStaticButtonCapableKind(kind: DeviceKind): boolean {
  return isStaticKind(kind) && !isStaticLineLikeKind(kind);
}
