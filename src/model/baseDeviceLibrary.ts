/** 内置基础设备图元库、发电族规格与模板值类型定义（从 model.ts 拆分）。 */

import { INTERACTIVE_STATIC_DRAWING_KINDS } from "../model-node-ops.ts";

import type { DeviceKind, DeviceParameterDefinition, DeviceParameterEnumOption, DeviceParameterValueType, DeviceTemplate, Point } from "./types.ts";

const THREE_WINDING_TRANSFORMER_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: -8 / 76 },
  { x: 0.5, y: -8 / 76 },
  { x: 0, y: 0.5 }
];

const THREE_WINDING_TRANSFORMER_NEUTRAL_TERMINAL_ANCHORS: Point[] = [
  { x: -0.5, y: -8 / 92 },
  { x: 0.5, y: -8 / 92 },
  { x: 0, y: 0.5 },
  { x: 0, y: -0.5 }
];

export const STATIC_ROUTE_AVOIDANCE_PARAM = "routeAvoidance";

export const ROUTABLE_LINE_DEFAULT_STROKE_WIDTH = 4;

export const STATIC_LINE_LIKE_KINDS = [
  ...INTERACTIVE_STATIC_DRAWING_KINDS,
  "static-self-loop"
] as const satisfies readonly DeviceKind[];

const STATIC_LINE_LIKE_KIND_SET = new Set<DeviceKind>(STATIC_LINE_LIKE_KINDS);

const DEFAULT_STATIC_COMPONENT_LIBRARY = "StaticBasicShape";

export const STATIC_COMPONENT_LIBRARY_BY_KIND: Record<string, string> = {
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

const STATIC_COMPONENT_LIBRARY_NAME_SET = new Set(Object.values(STATIC_COMPONENT_LIBRARY_BY_KIND));

function staticComponentLibraryFromCustomKind(kind: string): string {
  const baseKind = baseDeviceKind(kind).trim();
  const customPrefix = "custom-";
  if (!baseKind.toLowerCase().startsWith(customPrefix)) {
    return "";
  }
  const customKindSuffix = baseKind.slice(customPrefix.length).toLowerCase();
  for (const componentLibrary of STATIC_COMPONENT_LIBRARY_NAME_SET) {
    const componentLibraryLower = componentLibrary.toLowerCase();
    if (
      customKindSuffix === componentLibraryLower ||
      customKindSuffix.startsWith(`${componentLibraryLower}-`) ||
      customKindSuffix.startsWith(`${componentLibraryLower}_`)
    ) {
      return componentLibrary;
    }
  }
  return "";
}

export function explicitStaticComponentLibraryForKind(kind: string): string {
  const baseKind = baseDeviceKind(kind);
  return STATIC_COMPONENT_LIBRARY_BY_KIND[baseKind] ?? staticComponentLibraryFromCustomKind(baseKind);
}

function staticComponentLibraryForKind(kind: string): string {
  return explicitStaticComponentLibraryForKind(kind) || DEFAULT_STATIC_COMPONENT_LIBRARY;
}

export function staticComponentLibraryFromParams(params?: Record<string, string>): string {
  return (
    params?.component_type ||
    (params as { componentLibrary?: string } | undefined)?.componentLibrary ||
    (params as { componentType?: string } | undefined)?.componentType ||
    ""
  ).trim();
}

export function isStaticComponentLibraryName(componentLibrary: string): boolean {
  return STATIC_COMPONENT_LIBRARY_NAME_SET.has(componentLibrary.trim());
}

export function staticComponentLibraryForNodeLike(kind: string, params?: Record<string, string>): string {
  const paramsComponentLibrary = staticComponentLibraryFromParams(params);
  if (isStaticComponentLibraryName(paramsComponentLibrary)) {
    return paramsComponentLibrary;
  }
  return explicitStaticComponentLibraryForKind(kind);
}

export function isStaticContainerKind(kind: string): boolean {
  return staticComponentLibraryForKind(kind) === "StaticContainerSymbol";
}

export function defaultStaticRouteAvoidanceValue(kind: string): "0" | "1" {
  return isStaticContainerKind(kind) ? "0" : "1";
}

export const GENERATED_VERTICAL_KIND_SUFFIX = "-vertical";

const EXPLICIT_VERTICAL_DEVICE_KINDS = new Set<string>(["ac-ground-disconnector-vertical"]);

export function baseDeviceKind(kind: string): string {
  if (!kind.endsWith(GENERATED_VERTICAL_KIND_SUFFIX) || EXPLICIT_VERTICAL_DEVICE_KINDS.has(kind)) {
    return kind;
  }
  return kind.slice(0, -GENERATED_VERTICAL_KIND_SUFFIX.length);
}

export const ELECTRIC_GENERATION_TERMINAL_TYPES = ["ac", "dc"] as const;

const ELECTRIC_GENERATION_FAMILY_KIND_SUFFIXES = [
  "wind-source",
  "pv-source",
  "thermal-source",
  "diesel-source",
  "hydro-source",
  "nuclear-source",
  "storage"
] as const;

export const HYDROGEN_ENDPOINT_CONTROL_TYPES = ["FLOW", "PRESSURE"] as const;

export const HYDROGEN_STORAGE_CONTROL_TYPES = ["PRESSURE", "FLOW"] as const;

const readonlyIntegerDefinition = (cnName: string, enName: string, typicalValue = ""): DeviceParameterDefinition => ({
  cnName,
  enName,
  valueType: "integer",
  typicalValue,
  readonly: true
});

export const TWO_WINDING_TRANSFORMER_MEASUREMENT_FIELDS = [
  { enName: "i_p", cnName: "高压侧有功值", measurementTypeId: "activePower" },
  { enName: "i_q", cnName: "高压侧无功值", measurementTypeId: "reactivePower" },
  { enName: "i_u", cnName: "高压侧电压值", measurementTypeId: "voltage" },
  { enName: "i_i", cnName: "高压侧电流值", measurementTypeId: "current" },
  { enName: "j_p", cnName: "低压侧有功值", measurementTypeId: "activePower" },
  { enName: "j_q", cnName: "低压侧无功值", measurementTypeId: "reactivePower" },
  { enName: "j_u", cnName: "低压侧电压值", measurementTypeId: "voltage" },
  { enName: "j_i", cnName: "低压侧电流值", measurementTypeId: "current" },
  { enName: "tap", cnName: "分接头档位", measurementTypeId: "tapPosition" }
] as const;

export const THREE_WINDING_TRANSFORMER_MEASUREMENT_FIELDS = [
  { enName: "i_p", cnName: "高压侧有功量测", measurementTypeId: "activePower" },
  { enName: "i_q", cnName: "高压侧无功量测", measurementTypeId: "reactivePower" },
  { enName: "i_u", cnName: "高压侧电压量测", measurementTypeId: "voltage" },
  { enName: "i_i", cnName: "高压侧电流量测", measurementTypeId: "current" },
  { enName: "k_p", cnName: "中压侧有功量测", measurementTypeId: "activePower" },
  { enName: "k_q", cnName: "中压侧无功量测", measurementTypeId: "reactivePower" },
  { enName: "k_u", cnName: "中压侧电压量测", measurementTypeId: "voltage" },
  { enName: "k_i", cnName: "中压侧电流量测", measurementTypeId: "current" },
  { enName: "j_p", cnName: "低压侧有功量测", measurementTypeId: "activePower" },
  { enName: "j_q", cnName: "低压侧无功量测", measurementTypeId: "reactivePower" },
  { enName: "j_u", cnName: "低压侧电压量测", measurementTypeId: "voltage" },
  { enName: "j_i", cnName: "低压侧电流量测", measurementTypeId: "current" }
] as const;

const THREE_WINDING_TRANSFORMER_SIDE_PARAMETER_FIELDS = [
  { enName: "i_r", cnName: "高压侧电阻", typicalValue: "0.0" },
  { enName: "i_x", cnName: "高压侧电抗", typicalValue: "0.1" },
  { enName: "i_gt", cnName: "高压侧励磁电导", typicalValue: "0.0" },
  { enName: "i_bt", cnName: "高压侧励磁电纳", typicalValue: "0.0" },
  { enName: "i_tap", cnName: "高压侧变比", typicalValue: "1.0" },
  { enName: "i_shift", cnName: "高压侧相移（度）", typicalValue: "0" },
  { enName: "k_r", cnName: "中压侧电阻", typicalValue: "0.0" },
  { enName: "k_x", cnName: "中压侧电抗", typicalValue: "0.1" },
  { enName: "k_gt", cnName: "中压侧励磁电导", typicalValue: "0.0" },
  { enName: "k_bt", cnName: "中压侧励磁电纳", typicalValue: "0.0" },
  { enName: "k_tap", cnName: "中压侧变比", typicalValue: "1.0" },
  { enName: "k_shift", cnName: "中压侧相移（度）", typicalValue: "0" },
  { enName: "j_r", cnName: "低压侧电阻", typicalValue: "0.0" },
  { enName: "j_x", cnName: "低压侧电抗", typicalValue: "0.1" },
  { enName: "j_gt", cnName: "低压侧励磁电导", typicalValue: "0.0" },
  { enName: "j_bt", cnName: "低压侧励磁电纳", typicalValue: "0.0" },
  { enName: "j_tap", cnName: "低压侧变比", typicalValue: "1.0" },
  { enName: "j_shift", cnName: "低压侧相移（度）", typicalValue: "0" }
] as const;

export const twoWindingTransformerParameterDefinitions: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: false },
  { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false },
  { cnName: "高压侧电压等级", enName: "i_vbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧电压等级", enName: "j_vbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "额定容量", enName: "ratedCapacity", valueType: "float", typicalValue: "50", readonly: false },
  { cnName: "高压侧最大电流", enName: "i_i_max", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧最大电流", enName: "j_i_max", valueType: "float", typicalValue: "0", readonly: false },
  ...TWO_WINDING_TRANSFORMER_MEASUREMENT_FIELDS.map(({ enName, cnName }) => ({
    cnName,
    enName,
    valueType: "float" as const,
    typicalValue: enName === "tap" ? "1.0" : "0",
    readonly: false,
    exportEnabled: true
  })),
  { cnName: "分接头档位设定值", enName: "tap_set", valueType: "float", typicalValue: "0", readonly: false, exportEnabled: true },
  { cnName: "相移（度）", enName: "shift", valueType: "float", typicalValue: "0", readonly: false }
];

export const threeWindingTransformerParameterDefinitions: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "", readonly: false, exportEnabled: true, exportName: "dev_type" },
  { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: false },
  { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false },
  readonlyIntegerDefinition("高压侧节点号", "i_node"),
  readonlyIntegerDefinition("中压侧节点号", "k_node"),
  readonlyIntegerDefinition("低压侧节点号", "j_node"),
  readonlyIntegerDefinition("中性点节点号", "neutral_node"),
  { cnName: "高压侧电压等级", enName: "i_vbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "高压侧额定容量", enName: "i_rated_capacity", valueType: "float", typicalValue: "90", readonly: false },
  { cnName: "高压侧最大电流", enName: "i_i_max", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "中压侧电压等级", enName: "k_vbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "中压侧额定容量", enName: "k_rated_capacity", valueType: "float", typicalValue: "90", readonly: false },
  { cnName: "中压侧最大电流", enName: "k_i_max", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧电压等级", enName: "j_vbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧额定容量", enName: "j_rated_capacity", valueType: "float", typicalValue: "90", readonly: false },
  { cnName: "低压侧最大电流", enName: "j_i_max", valueType: "float", typicalValue: "0", readonly: false },
  ...THREE_WINDING_TRANSFORMER_SIDE_PARAMETER_FIELDS.map(({ enName, cnName, typicalValue }) => ({
    cnName,
    enName,
    valueType: "float" as const,
    typicalValue,
    readonly: false,
    exportEnabled: true
  })),
  ...THREE_WINDING_TRANSFORMER_MEASUREMENT_FIELDS.map(({ enName, cnName }) => ({
    cnName,
    enName,
    valueType: "float" as const,
    typicalValue: "0",
    readonly: false,
    exportEnabled: true
  }))
];

export const THREE_WINDING_TRANSFORMER_E_DEFAULT_PARAMS = {
  i_vbase: "0",
  i_rated_capacity: "90",
  i_i_max: "0",
  k_vbase: "0",
  k_rated_capacity: "90",
  k_i_max: "0",
  j_vbase: "0",
  j_rated_capacity: "90",
  j_i_max: "0",
  i_r: "0.0",
  i_x: "0.1",
  i_gt: "0.0",
  i_bt: "0.0",
  i_tap: "1.0",
  i_shift: "0",
  j_r: "0.0",
  j_x: "0.1",
  j_gt: "0.0",
  j_bt: "0.0",
  j_tap: "1.0",
  j_shift: "0",
  k_r: "0.0",
  k_x: "0.1",
  k_gt: "0.0",
  k_bt: "0.0",
  k_tap: "1.0",
  k_shift: "0",
  i_p: "0",
  i_q: "0",
  i_u: "0",
  i_i: "0",
  k_p: "0",
  k_q: "0",
  k_u: "0",
  k_i: "0",
  j_p: "0",
  j_q: "0",
  j_u: "0",
  j_i: "0"
} as const;

function defaultStaticButtonParams(kind: DeviceKind, params?: Record<string, string>): Record<string, string> {
  const componentLibrary = staticComponentLibraryForNodeLike(kind, params);
  if (!isStaticButtonCapableKind(kind) && componentLibrary !== "StaticButton") {
    return {};
  }
  return {
    buttonEnabled: kind === "static-button" || componentLibrary === "StaticButton" ? "1" : "0",
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
  const next = {
    ...defaultStaticButtonParams(kind, params),
    ...params
  };
  return staticComponentLibraryForNodeLike(kind, params) === "StaticButton"
    ? { ...next, buttonEnabled: "1" }
    : next;
}

const staticSymbolParams = (
  kind: DeviceKind,
  text: string,
  overrides: Partial<Record<string, string>> = {}
): Record<string, string> => ({
  ...withStaticButtonCapability(kind, {
    component_type: staticComponentLibraryForKind(kind),
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

const staticVisualParams = (
  kind: DeviceKind,
  params: Record<string, string>
): Record<string, string> => ({
  ...withStaticButtonCapability(kind, {
    component_type: staticComponentLibraryForKind(kind),
    [STATIC_ROUTE_AVOIDANCE_PARAM]: defaultStaticRouteAvoidanceValue(kind),
    ...params
  })
});

export type ElectricGenerationTerminalType = (typeof ELECTRIC_GENERATION_TERMINAL_TYPES)[number];

type ElectricGenerationFamilyKindSuffix = (typeof ELECTRIC_GENERATION_FAMILY_KIND_SUFFIXES)[number];

type ElectricGenerationParameterDefinitionSpec = Omit<DeviceParameterDefinition, "typicalValue">;

export type ElectricGenerationFamilySpec = {
  kindSuffix: ElectricGenerationFamilyKindSuffix;
  label: string;
  sourceType: string;
  derivedComponentSuffix: string;
  parameterDefinitions: ElectricGenerationParameterDefinitionSpec[];
  commonParams: Record<string, string>;
  paramsByTerminalType?: Partial<Record<ElectricGenerationTerminalType, Record<string, string>>>;
  defaultsByTerminalType: Record<ElectricGenerationTerminalType, { ratedVoltage: string; ratedPower: string }>;
};

const electricGenerationStringDefinition = (
  cnName: string,
  enName: string
): ElectricGenerationParameterDefinitionSpec => ({
  cnName,
  enName,
  valueType: "string",
  readonly: false
});

const electricGenerationIntegerDefinition = (
  cnName: string,
  enName: string
): ElectricGenerationParameterDefinitionSpec => ({
  cnName,
  enName,
  valueType: "integer",
  readonly: false
});

const electricGenerationFloatDefinition = (
  cnName: string,
  enName: string
): ElectricGenerationParameterDefinitionSpec => ({
  cnName,
  enName,
  valueType: "float",
  readonly: false
});

const electricGenerationStringEnumDefinition = (
  cnName: string,
  enName: string,
  enumOptions: DeviceParameterEnumOption[]
): ElectricGenerationParameterDefinitionSpec => ({
  cnName,
  enName,
  valueType: "stringEnum",
  enumOptions,
  readonly: false
});

export const ELECTRIC_GENERATION_FAMILY_SPECS: ElectricGenerationFamilySpec[] = [
  {
    kindSuffix: "wind-source",
    label: "风力发电机",
    sourceType: "风力",
    derivedComponentSuffix: "WindGen",
    parameterDefinitions: [
      electricGenerationStringDefinition("风机型号", "windTurbineModel"),
      electricGenerationFloatDefinition("切入风速", "cutInWindSpeed"),
      electricGenerationFloatDefinition("额定风速", "ratedWindSpeed"),
      electricGenerationFloatDefinition("切出风速", "cutOutWindSpeed"),
      electricGenerationFloatDefinition("叶轮直径", "rotorDiameter"),
      electricGenerationFloatDefinition("轮毂高度", "hubHeight")
    ],
    commonParams: {
      windTurbineModel: "WT-5MW",
      cutInWindSpeed: "3",
      ratedWindSpeed: "12",
      cutOutWindSpeed: "25",
      rotorDiameter: "170",
      hubHeight: "110"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "35 kV", ratedPower: "50 MW" },
      dc: { ratedVoltage: "1500 V", ratedPower: "10 MW" }
    }
  },
  {
    kindSuffix: "pv-source",
    label: "光伏发电机",
    sourceType: "光伏",
    derivedComponentSuffix: "PVGen",
    parameterDefinitions: [
      electricGenerationStringDefinition("光伏组件型号", "pvModuleModel"),
      electricGenerationFloatDefinition("组件效率", "moduleEfficiency"),
      electricGenerationFloatDefinition("阵列面积", "arrayArea"),
      electricGenerationIntegerDefinition("MPPT 路数", "mpptCount"),
      electricGenerationFloatDefinition("参考辐照度", "referenceIrradiance"),
      electricGenerationFloatDefinition("参考温度", "referenceTemperature"),
      electricGenerationFloatDefinition("温度系数", "temperatureCoefficient")
    ],
    commonParams: {
      pvModuleModel: "Mono-550W",
      moduleEfficiency: "0.213",
      referenceIrradiance: "1000",
      referenceTemperature: "25",
      temperatureCoefficient: "-0.004"
    },
    paramsByTerminalType: {
      ac: { arrayArea: "100000", mpptCount: "100" },
      dc: { arrayArea: "25000", mpptCount: "25" }
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "10 kV", ratedPower: "20 MW" },
      dc: { ratedVoltage: "1500 V", ratedPower: "5 MW" }
    }
  },
  {
    kindSuffix: "thermal-source",
    label: "火力发电机",
    sourceType: "火力",
    derivedComponentSuffix: "ThermalGen",
    parameterDefinitions: [
      electricGenerationStringDefinition("火电机组型号", "thermalUnitModel"),
      electricGenerationStringEnumDefinition("燃料类型", "fuelType", [
        { value: "coal", label: "煤" },
        { value: "gas", label: "天然气" },
        { value: "oil", label: "燃油" },
        { value: "biomass", label: "生物质" }
      ]),
      electricGenerationFloatDefinition("热效率", "thermalEfficiency"),
      electricGenerationFloatDefinition("热耗率", "heatRate"),
      electricGenerationFloatDefinition("主蒸汽压力", "mainSteamPressure"),
      electricGenerationFloatDefinition("主蒸汽温度", "mainSteamTemperature")
    ],
    commonParams: {
      thermalUnitModel: "600 MW超超临界机组",
      fuelType: "coal",
      thermalEfficiency: "0.45",
      heatRate: "8000",
      mainSteamPressure: "25",
      mainSteamTemperature: "600"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "220 kV", ratedPower: "600 MW" },
      dc: { ratedVoltage: "1500 V", ratedPower: "600 MW" }
    }
  },
  {
    kindSuffix: "diesel-source",
    label: "柴油发电机",
    sourceType: "柴油",
    derivedComponentSuffix: "DieselGen",
    parameterDefinitions: [
      electricGenerationStringDefinition("柴油机组型号", "dieselUnitModel"),
      electricGenerationStringDefinition("燃油牌号", "fuelGrade"),
      electricGenerationFloatDefinition("单位油耗", "specificFuelConsumption"),
      electricGenerationFloatDefinition("油箱容量", "fuelTankCapacity"),
      electricGenerationFloatDefinition("额定转速", "ratedSpeed"),
      electricGenerationFloatDefinition("启动时间", "startTime")
    ],
    commonParams: {
      dieselUnitModel: "DG-2500",
      fuelGrade: "0#柴油",
      specificFuelConsumption: "200",
      fuelTankCapacity: "20",
      ratedSpeed: "1500",
      startTime: "10"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "10 kV", ratedPower: "5 MW" },
      dc: { ratedVoltage: "750 V", ratedPower: "5 MW" }
    }
  },
  {
    kindSuffix: "hydro-source",
    label: "水力发电机",
    sourceType: "水力",
    derivedComponentSuffix: "HydroGen",
    parameterDefinitions: [
      electricGenerationStringDefinition("水电机组型号", "hydroUnitModel"),
      electricGenerationStringEnumDefinition("水轮机类型", "turbineType", [
        { value: "francis", label: "混流式" },
        { value: "kaplan", label: "轴流式" },
        { value: "pelton", label: "冲击式" },
        { value: "bulb", label: "贯流式" }
      ]),
      electricGenerationFloatDefinition("设计水头", "designHead"),
      electricGenerationFloatDefinition("设计流量", "designFlow"),
      electricGenerationFloatDefinition("额定转速", "ratedSpeed"),
      electricGenerationFloatDefinition("发电机效率", "generatorEfficiency")
    ],
    commonParams: {
      hydroUnitModel: "300 MW混流式机组",
      turbineType: "francis",
      designHead: "120",
      designFlow: "280",
      ratedSpeed: "150",
      generatorEfficiency: "0.985"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "220 kV", ratedPower: "300 MW" },
      dc: { ratedVoltage: "1500 V", ratedPower: "300 MW" }
    }
  },
  {
    kindSuffix: "nuclear-source",
    label: "核能发电机",
    sourceType: "核能",
    derivedComponentSuffix: "NuclearGen",
    parameterDefinitions: [
      electricGenerationStringDefinition("核电机组型号", "nuclearUnitModel"),
      electricGenerationStringEnumDefinition("反应堆类型", "reactorType", [
        { value: "pwr", label: "压水堆" },
        { value: "bwr", label: "沸水堆" },
        { value: "phwr", label: "重水堆" },
        { value: "htgr", label: "高温气冷堆" },
        { value: "fbr", label: "快中子增殖堆" }
      ]),
      electricGenerationFloatDefinition("反应堆热功率", "reactorThermalPower"),
      electricGenerationFloatDefinition("热效率", "thermalEfficiency"),
      electricGenerationFloatDefinition("一回路压力", "primaryLoopPressure"),
      electricGenerationFloatDefinition("主蒸汽压力", "mainSteamPressure"),
      electricGenerationFloatDefinition("主蒸汽温度", "mainSteamTemperature"),
      electricGenerationFloatDefinition("容量因子", "capacityFactor")
    ],
    commonParams: {
      nuclearUnitModel: "1000 MW压水堆机组",
      reactorType: "pwr",
      reactorThermalPower: "2900",
      thermalEfficiency: "0.345",
      primaryLoopPressure: "15.5",
      mainSteamPressure: "6.8",
      mainSteamTemperature: "285",
      capacityFactor: "90"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "500 kV", ratedPower: "1000 MW" },
      dc: { ratedVoltage: "1500 V", ratedPower: "1000 MW" }
    }
  },
  {
    kindSuffix: "storage",
    label: "电化学储能",
    sourceType: "储能",
    derivedComponentSuffix: "StorageGen",
    parameterDefinitions: [
      electricGenerationStringEnumDefinition("储能技术类型", "storageTechnology", [
        { value: "lithium", label: "锂电池" },
        { value: "sodium", label: "钠离子电池" },
        { value: "flow", label: "液流电池" },
        { value: "leadCarbon", label: "铅碳电池" },
        { value: "supercapacitor", label: "超级电容" }
      ]),
      electricGenerationIntegerDefinition("电池簇/电池架数量", "batteryRackCount"),
      electricGenerationFloatDefinition("储能容量", "energyCapacity"),
      electricGenerationFloatDefinition("充放电效率", "chargeDischargeEfficiency"),
      electricGenerationFloatDefinition("最大充电功率", "maxChargePower"),
      electricGenerationFloatDefinition("最大放电功率", "maxDischargePower"),
      electricGenerationFloatDefinition("SOC", "soc"),
      electricGenerationFloatDefinition("SOC上限", "socUpperLimit"),
      electricGenerationFloatDefinition("SOC下限", "socLowerLimit")
    ],
    commonParams: {
      storageTechnology: "lithium",
      batteryRackCount: "20",
      energyCapacity: "20",
      chargeDischargeEfficiency: "0.9",
      maxChargePower: "5",
      maxDischargePower: "5",
      soc: "0.5",
      socUpperLimit: "0.9",
      socLowerLimit: "0.1"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "10 kV", ratedPower: "5 MW" },
      dc: { ratedVoltage: "750 V", ratedPower: "5 MW" }
    }
  }
];

function createElectricGenerationDeviceTemplate(
  terminalType: ElectricGenerationTerminalType,
  family: ElectricGenerationFamilySpec
): DeviceTemplate {
  const electricalDefaults = family.defaultsByTerminalType[terminalType];
  const terminalPrefix = terminalType === "ac" ? "交流" : "直流";
  const terminalLabel = `${terminalPrefix}发电机端`;
  const params: Record<string, string> = {
    sourceType: family.sourceType,
    ratedCapacity: electricalDefaults.ratedPower,
    ratedVoltage: electricalDefaults.ratedVoltage,
    pMax: "0",
    pMin: "0",
    vMax: "1.1",
    vMin: "0.9",
    ...(terminalType === "ac" ? { qMax: "0", qMin: "0" } : {}),
    ...family.commonParams,
    ...(family.paramsByTerminalType?.[terminalType] ?? {})
  };
  return {
    kind: `${terminalType}-${family.kindSuffix}` as DeviceKind,
    label: `${terminalPrefix}${family.label}`,
    categoryLibrary: `${terminalPrefix}设备`,
    size: { width: 92, height: 58 },
    params,
    terminalType,
    terminalCount: 1,
    terminalLabels: [terminalLabel],
    terminalRoles: ["single-source"],
    parameterDefinitions: [
      readonlyIntegerDefinition("序号", "idx"),
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "设备状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: false },
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false },
      { cnName: "发电类型", enName: "sourceType", valueType: "string", typicalValue: family.sourceType, readonly: true },
      { cnName: "电压上限", enName: "vMax", valueType: "float", typicalValue: "1.1", readonly: false },
      { cnName: "电压下限", enName: "vMin", valueType: "float", typicalValue: "0.9", readonly: false },
      ...family.parameterDefinitions.map((definition) => ({
        ...definition,
        typicalValue: params[definition.enName] ?? ""
      }))
    ]
  };
}

const ELECTRIC_GENERATION_DEVICE_TEMPLATES = ELECTRIC_GENERATION_FAMILY_SPECS.flatMap((family) =>
  ELECTRIC_GENERATION_TERMINAL_TYPES.map((terminalType) => createElectricGenerationDeviceTemplate(terminalType, family))
);

const HYDROGEN_TANK_PARAMETER_DEFINITIONS: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  readonlyIntegerDefinition("氢节点号", "node"),
  {
    cnName: "控制模式",
    enName: "control_type",
    valueType: "stringEnum",
    typicalValue: "PRESSURE",
    enumValues: [...HYDROGEN_STORAGE_CONTROL_TYPES],
    enumOptions: [
      { value: "PRESSURE", label: "定压力" },
      { value: "FLOW", label: "定流量" }
    ],
    readonly: false
  },
  { cnName: "压力设定值(MPa)", enName: "pressure_set", valueType: "float", typicalValue: "1", readonly: false },
  { cnName: "流量设定值(Nm3/h)", enName: "flow_set", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "压力平衡系数", enName: "alpha", valueType: "float", typicalValue: "1", readonly: false },
  { cnName: "流量下限(Nm3/h)", enName: "flow_min", valueType: "float", typicalValue: "-10", readonly: false },
  { cnName: "流量上限(Nm3/h)", enName: "flow_max", valueType: "float", typicalValue: "10", readonly: false },
  { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false },
  {
    cnName: "储气压(MPa)",
    enName: "pressure",
    valueType: "float",
    typicalValue: "1",
    readonly: false,
    exportEnabled: true,
    exportName: "pressure"
  },
  { cnName: "额定容量(m3)", enName: "rated_capacity", valueType: "float", typicalValue: "1000", readonly: false },
  { cnName: "水容积(m3)", enName: "water_volume", valueType: "float", typicalValue: "50", readonly: false },
  { cnName: "初始SOC", enName: "initial_soc", valueType: "float", typicalValue: "0.5", readonly: false },
  { cnName: "压力上限(MPa)", enName: "pressure_max", valueType: "float", typicalValue: "45", readonly: false },
  { cnName: "压力下限(MPa)", enName: "pressure_min", valueType: "float", typicalValue: "0.1", readonly: false },
  { cnName: "流量(Nm3/h)", enName: "flow", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "储气量(Nm3)", enName: "gas_quantity", valueType: "float", typicalValue: "500", readonly: false },
  { cnName: "SOC", enName: "soc", valueType: "float", typicalValue: "0.5", readonly: false },
  { cnName: "SOC上限", enName: "soc_upper_limit", valueType: "float", typicalValue: "0.9", readonly: false },
  { cnName: "SOC下限", enName: "soc_lower_limit", valueType: "float", typicalValue: "0.1", readonly: false }
];

type HydrogenEndpointDefaults = {
  ratedCapacity: string;
  pressure: string;
  pressureMax: string;
  pressureMin: string;
  flow: string;
  flowMax: string;
  flowMin: string;
};

function hydrogenEndpointParameterDefinitions(defaults: HydrogenEndpointDefaults): DeviceParameterDefinition[] {
  return [
    readonlyIntegerDefinition("序号", "idx"),
    { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
    readonlyIntegerDefinition("氢节点号", "node"),
    { cnName: "额定容量(Nm3/h)", enName: "rated_capacity", valueType: "float", typicalValue: defaults.ratedCapacity, readonly: false },
    {
      cnName: "控制模式",
      enName: "control_type",
      valueType: "stringEnum",
      typicalValue: "FLOW",
      enumValues: [...HYDROGEN_ENDPOINT_CONTROL_TYPES],
      enumOptions: [
        { value: "FLOW", label: "定流量" },
        { value: "PRESSURE", label: "定压力" }
      ],
      readonly: false
    },
    { cnName: "压力设定值(MPa)", enName: "pressure_set", valueType: "float", typicalValue: defaults.pressure, readonly: false },
    { cnName: "压力上限(MPa)", enName: "pressure_max", valueType: "float", typicalValue: defaults.pressureMax, readonly: false },
    { cnName: "压力下限(MPa)", enName: "pressure_min", valueType: "float", typicalValue: defaults.pressureMin, readonly: false },
    { cnName: "流量设定值(Nm3/h)", enName: "flow_set", valueType: "float", typicalValue: defaults.flow, readonly: false },
    { cnName: "流量上限(Nm3/h)", enName: "flow_max", valueType: "float", typicalValue: defaults.flowMax, readonly: false },
    { cnName: "流量下限(Nm3/h)", enName: "flow_min", valueType: "float", typicalValue: defaults.flowMin, readonly: false },
    { cnName: "压力(MPa)", enName: "pressure", valueType: "float", typicalValue: defaults.pressure, readonly: false },
    { cnName: "流量(Nm3/h)", enName: "flow", valueType: "float", typicalValue: defaults.flow, readonly: false },
    { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false }
  ];
}

export const HYDROGEN_SOURCE_DEFAULTS: HydrogenEndpointDefaults = {
  ratedCapacity: "1000",
  pressure: "20",
  pressureMax: "25",
  pressureMin: "1",
  flow: "1000",
  flowMax: "1000",
  flowMin: "0"
};

export const HYDROGEN_LOAD_DEFAULTS: HydrogenEndpointDefaults = {
  ratedCapacity: "500",
  pressure: "2",
  pressureMax: "5",
  pressureMin: "0.1",
  flow: "500",
  flowMax: "500",
  flowMin: "0"
};

const HYDROGEN_SOURCE_PARAMETER_DEFINITIONS = hydrogenEndpointParameterDefinitions(HYDROGEN_SOURCE_DEFAULTS);

const HYDROGEN_LOAD_PARAMETER_DEFINITIONS = hydrogenEndpointParameterDefinitions(HYDROGEN_LOAD_DEFAULTS);

/**
 * 容器「框」元件的公共几何(交流 3 + 直流/氢能/热能各 1):同尺寸、同样式参数。
 * 每次返回**新对象**(含 params/size 各一份)—— 模板对象会被下游就地改写,共用引用会多 kind 串改。
 */
function containerBoxTemplateGeometry(): Pick<DeviceTemplate, "size" | "params"> {
  return {
    size: { width: 180, height: 112 },
    params: {
      // 名称渲染源恒为 node.name(见 DeviceGlyph 容器分支),不写 text 死参数
      fillColor: "transparent",
      strokeColor: "#64748b",
      cornerRadius: "8",
      strokeStyle: "dashed",
      textAlign: "left",
      verticalAlign: "top"
    }
  };
}

export const BASE_DEVICE_LIBRARY: DeviceTemplate[] = [
  {
    kind: "static-text",
    label: "文字",
    categoryLibrary: "静态图元",
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
    categoryLibrary: "静态图元",
    size: { width: 140, height: 24 },
    params: staticVisualParams("static-line", { fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-polyline",
    label: "折线",
    categoryLibrary: "静态图元",
    size: { width: 140, height: 70 },
    params: staticVisualParams("static-polyline", { fillColor: "transparent", strokeColor: "#334155", textColor: "#111827", lineWidth: "3", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-circle",
    label: "正圆",
    categoryLibrary: "静态图元",
    size: { width: 72, height: 72 },
    params: staticVisualParams("static-circle", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-ellipse",
    label: "椭圆",
    categoryLibrary: "静态图元",
    size: { width: 112, height: 70 },
    params: staticVisualParams("static-ellipse", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-rect",
    label: "方框",
    categoryLibrary: "静态图元",
    size: { width: 112, height: 70 },
    params: staticVisualParams("static-rect", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#111827", lineWidth: "0", strokeStyle: "solid", fontSize: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-image",
    label: "图片",
    categoryLibrary: "静态图元",
    size: { width: 140, height: 90 },
    params: staticVisualParams("static-image", { fillColor: "#ffffff", strokeColor: "transparent", textColor: "#64748b", lineWidth: "0", strokeStyle: "solid", fontSize: "16", backgroundImage: "", backgroundImageAssetId: "" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-rounded-rect",
    label: "圆角节点",
    categoryLibrary: "静态图元",
    size: { width: 132, height: 72 },
    params: staticSymbolParams("static-rounded-rect", "圆角节点", { cornerRadius: "12", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-diamond",
    label: "判断节点",
    categoryLibrary: "静态图元",
    size: { width: 116, height: 86 },
    params: staticSymbolParams("static-diamond", "判断", { fillColor: "#fefce8", strokeColor: "#ca8a04", accentColor: "#eab308", padding: "18" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-pill",
    label: "起止节点",
    categoryLibrary: "静态图元",
    size: { width: 132, height: 58 },
    params: staticSymbolParams("static-pill", "开始/结束", { fillColor: "#ecfdf5", strokeColor: "#059669", accentColor: "#10b981", cornerRadius: "999" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-database",
    label: "数据库",
    categoryLibrary: "静态图元",
    size: { width: 112, height: 88 },
    params: staticSymbolParams("static-database", "数据库", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", verticalAlign: "middle" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-document",
    label: "文档",
    categoryLibrary: "静态图元",
    size: { width: 106, height: 128 },
    params: staticSymbolParams("static-document", "文档", { fillColor: "#ffffff", strokeColor: "#475569", accentColor: "#94a3b8", verticalAlign: "top", padding: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-note",
    label: "便签",
    categoryLibrary: "静态图元",
    size: { width: 126, height: 92 },
    params: staticSymbolParams("static-note", "便签", { fillColor: "#fef9c3", strokeColor: "#ca8a04", accentColor: "#facc15", cornerRadius: "6", verticalAlign: "top" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-group-box",
    label: "分组框",
    categoryLibrary: "静态图元",
    size: { width: 180, height: 112 },
    params: staticSymbolParams("static-group-box", "分组", { fillColor: "transparent", strokeColor: "#64748b", accentColor: "#64748b", cornerRadius: "8", strokeStyle: "dashed", textAlign: "left", verticalAlign: "top" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-swimlane",
    label: "泳道",
    categoryLibrary: "静态图元",
    size: { width: 220, height: 122 },
    params: staticSymbolParams("static-swimlane", "泳道", { fillColor: "#f8fafc", strokeColor: "#475569", accentColor: "#dbeafe", textAlign: "left", verticalAlign: "top", padding: "14" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-point",
    label: "连接点",
    categoryLibrary: "静态图元",
    size: { width: 22, height: 22 },
    params: staticSymbolParams("static-point", "", { fillColor: "#2563eb", strokeColor: "#ffffff", accentColor: "#2563eb", lineWidth: "2", padding: "4" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-ring",
    label: "圆环点",
    categoryLibrary: "静态图元",
    size: { width: 28, height: 28 },
    params: staticSymbolParams("static-ring", "", { fillColor: "transparent", strokeColor: "#2563eb", accentColor: "#60a5fa", lineWidth: "3", padding: "4" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-circle-node",
    label: "圆形节点",
    categoryLibrary: "静态图元",
    size: { width: 86, height: 86 },
    params: staticSymbolParams("static-circle-node", "圆形节点", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", cornerRadius: "999", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-straight-connector",
    label: "直线连接",
    categoryLibrary: "静态图元",
    size: { width: 150, height: 28 },
    params: staticSymbolParams("static-straight-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "none", arrowSize: "10" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-arrow-connector",
    label: "箭头连接",
    categoryLibrary: "静态图元",
    size: { width: 150, height: 32 },
    params: staticSymbolParams("static-arrow-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-double-arrow-connector",
    label: "双向箭头",
    categoryLibrary: "静态图元",
    size: { width: 150, height: 32 },
    params: staticSymbolParams("static-double-arrow-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "arrow", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-elbow-connector",
    label: "折线连接",
    categoryLibrary: "静态图元",
    size: { width: 150, height: 82 },
    params: staticSymbolParams("static-elbow-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-hexagon",
    label: "六边形",
    categoryLibrary: "静态图元",
    size: { width: 126, height: 78 },
    params: staticSymbolParams("static-hexagon", "六边形", { fillColor: "#f8fafc", strokeColor: "#475569", accentColor: "#94a3b8", padding: "16" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-parallelogram",
    label: "平行四边形",
    categoryLibrary: "静态图元",
    size: { width: 132, height: 76 },
    params: staticSymbolParams("static-parallelogram", "输入/输出", { fillColor: "#f0f9ff", strokeColor: "#0284c7", accentColor: "#38bdf8", padding: "18" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-triangle",
    label: "三角形",
    categoryLibrary: "静态图元",
    size: { width: 96, height: 86 },
    params: staticSymbolParams("static-triangle", "三角", { fillColor: "#fff7ed", strokeColor: "#ea580c", accentColor: "#fb923c", padding: "18", verticalAlign: "bottom" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-callout",
    label: "标注气泡",
    categoryLibrary: "静态图元",
    size: { width: 154, height: 86 },
    params: staticSymbolParams("static-callout", "标注", { fillColor: "#ffffff", strokeColor: "#475569", accentColor: "#2563eb", cornerRadius: "10", textAlign: "left", verticalAlign: "top", padding: "14", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-default-node",
    label: "默认节点",
    categoryLibrary: "静态图元",
    size: { width: 142, height: 64 },
    params: staticSymbolParams("static-default-node", "默认节点", { fillColor: "#ffffff", strokeColor: "#1f2937", accentColor: "#3b82f6", cornerRadius: "8", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-input-node",
    label: "输入节点",
    categoryLibrary: "静态图元",
    size: { width: 142, height: 64 },
    params: staticSymbolParams("static-input-node", "输入", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", cornerRadius: "8", handleColor: "#2563eb" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-output-node",
    label: "输出节点",
    categoryLibrary: "静态图元",
    size: { width: 142, height: 64 },
    params: staticSymbolParams("static-output-node", "输出", { fillColor: "#ecfdf5", strokeColor: "#059669", accentColor: "#34d399", cornerRadius: "8", handleColor: "#059669" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-port-node",
    label: "端口节点",
    categoryLibrary: "静态图元",
    size: { width: 148, height: 82 },
    params: staticSymbolParams("static-port-node", "端口节点", { fillColor: "#f8fafc", strokeColor: "#334155", accentColor: "#94a3b8", cornerRadius: "10", handleColor: "#2563eb", handleSize: "9" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-card-node",
    label: "卡片节点",
    categoryLibrary: "静态图元",
    size: { width: 168, height: 98 },
    params: staticSymbolParams("static-card-node", "卡片节点", { fillColor: "#ffffff", strokeColor: "#cbd5e1", accentColor: "#2563eb", cornerRadius: "10", textAlign: "left", verticalAlign: "top", padding: "16", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-toolbar-node",
    label: "工具条节点",
    categoryLibrary: "静态图元",
    size: { width: 170, height: 96 },
    params: staticSymbolParams("static-toolbar-node", "工具条节点", { fillColor: "#ffffff", strokeColor: "#64748b", accentColor: "#e2e8f0", cornerRadius: "10", verticalAlign: "bottom", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-button",
    label: "按钮",
    categoryLibrary: "静态图元",
    size: { width: 132, height: 52 },
    params: staticSymbolParams("static-button", "按钮", { fillColor: "#eff6ff", strokeColor: "#2563eb", accentColor: "#60a5fa", cornerRadius: "8", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-resizer-frame",
    label: "缩放框",
    categoryLibrary: "静态图元",
    size: { width: 166, height: 104 },
    params: staticSymbolParams("static-resizer-frame", "", { fillColor: "transparent", strokeColor: "#2563eb", accentColor: "#2563eb", lineWidth: "2", strokeStyle: "dashed", handleColor: "#ffffff", handleSize: "10" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-subflow-box",
    label: "子流程框",
    categoryLibrary: "静态图元",
    size: { width: 210, height: 136 },
    params: staticSymbolParams("static-subflow-box", "子流程", { fillColor: "#f8fafc", strokeColor: "#475569", accentColor: "#dbeafe", cornerRadius: "10", textAlign: "left", verticalAlign: "top", padding: "14" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-bezier-connector",
    label: "贝塞尔连接",
    categoryLibrary: "静态图元",
    size: { width: 156, height: 72 },
    params: staticSymbolParams("static-bezier-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-smoothstep-connector",
    label: "平滑折线",
    categoryLibrary: "静态图元",
    size: { width: 156, height: 76 },
    params: staticSymbolParams("static-smoothstep-connector", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "12" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-self-loop",
    label: "自环连接",
    categoryLibrary: "静态图元",
    size: { width: 104, height: 86 },
    params: staticSymbolParams("static-self-loop", "", { fillColor: "transparent", strokeColor: "#334155", lineWidth: "3", markerStart: "none", markerEnd: "arrow", arrowSize: "10" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "static-edge-label",
    label: "边标签",
    categoryLibrary: "静态图元",
    size: { width: 104, height: 42 },
    params: staticSymbolParams("static-edge-label", "边标签", { fillColor: "#ffffff", strokeColor: "#cbd5e1", accentColor: "#2563eb", cornerRadius: "999", padding: "10", shadowEnabled: "1" }),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    // 交流容器:框选一组交流设备的容器图元,不进 static 家族(不写 component_type)
    kind: "ac-vpp-box",
    label: "虚拟电厂",
    categoryLibrary: "交流设备",
    componentClass: "ACContainer",
    ...containerBoxTemplateGeometry(),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    // 交流端点容器:复用交流容器框选交互,顶部单端子用于对外连接
    kind: "ac-endpoint-container",
    label: "虚拟电厂",
    categoryLibrary: "交流设备",
    componentClass: "ACEndpointContainer",
    ...containerBoxTemplateGeometry(),
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流设备端"],
    terminalAnchors: [{ x: 0, y: -0.5 }]
  },
  {
    kind: "ac-switch-box",
    label: "开关箱",
    categoryLibrary: "交流设备",
    componentClass: "ACContainer",
    ...containerBoxTemplateGeometry(),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "ac-distribution-box",
    label: "配变箱",
    categoryLibrary: "交流设备",
    componentClass: "ACContainer",
    ...containerBoxTemplateGeometry(),
    terminalType: "ac",
    terminalCount: 0
  },
  {
    // 直流容器:同「框」几何,归直流设备类别库;E 段名与 terminalType 随直流流(见 model-eexport 的 inferESection)
    kind: "dc-vpp-box",
    label: "虚拟电厂",
    categoryLibrary: "直流设备",
    ...containerBoxTemplateGeometry(),
    terminalType: "dc",
    terminalCount: 0
  },
  {
    kind: "hydrogen-vpp-box",
    label: "虚拟电厂",
    categoryLibrary: "氢能设备",
    ...containerBoxTemplateGeometry(),
    terminalType: "h2",
    terminalCount: 0
  },
  {
    kind: "heat-vpp-box",
    label: "虚拟电厂",
    categoryLibrary: "热能设备",
    ...containerBoxTemplateGeometry(),
    terminalType: "heat",
    terminalCount: 0
  },
  {
    kind: "ac-source",
    label: "交流电源",
    categoryLibrary: "交流设备",
    size: { width: 84, height: 56 },
    params: {
      ratedCapacity: "10 MW",
      ratedVoltage: "10 kV",
      frequency: "50 Hz",
      shortCircuitCapacity: "500 MVA",
      pMax: "0",
      pMin: "0",
      qMax: "0",
      qMin: "0",
      vMax: "1.1",
      vMin: "0.9",
      regable: "0"
    },
    terminalType: "ac",
    terminalCount: 1,
    parameterDefinitions: [
      { cnName: "额定容量", enName: "ratedCapacity", valueType: "string", typicalValue: "10 MW", readonly: false },
      { cnName: "额定电压", enName: "ratedVoltage", valueType: "string", typicalValue: "10 kV", readonly: false },
      { cnName: "电压上限", enName: "vMax", valueType: "float", typicalValue: "1.1", readonly: false },
      { cnName: "电压下限", enName: "vMin", valueType: "float", typicalValue: "0.9", readonly: false },
      { cnName: "频率", enName: "frequency", valueType: "string", typicalValue: "50 Hz", readonly: false },
      { cnName: "短路容量", enName: "shortCircuitCapacity", valueType: "string", typicalValue: "500 MVA", readonly: false },
      { cnName: "有功上限", enName: "pMax", valueType: "float", typicalValue: "0", readonly: false },
      { cnName: "有功下限", enName: "pMin", valueType: "float", typicalValue: "0", readonly: false },
      { cnName: "无功上限", enName: "qMax", valueType: "float", typicalValue: "0", readonly: false },
      { cnName: "无功下限", enName: "qMin", valueType: "float", typicalValue: "0", readonly: false },
      { cnName: "是否可调", enName: "regable", valueType: "numberEnum", typicalValue: "0", enumValues: ["0", "1"], enumValueType: "number", enumOptions: [{ value: "0", label: "不可调" }, { value: "1", label: "可调" }], readonly: false }
    ]
  },
  ...ELECTRIC_GENERATION_DEVICE_TEMPLATES.filter((template) => template.terminalType === "ac"),
  {
    kind: "ac-electrolyzer",
    label: "交流电制氢",
    categoryLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: {
      controlType: "FLOW",
      e2hCoeff: "0.2"
    },
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
    categoryLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: {
      controlType: "FLOW",
      e2hCoeff: "0.2"
    },
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
    categoryLibrary: "氢能设备",
    size: { width: 84, height: 56 },
    params: {
      rated_capacity: HYDROGEN_SOURCE_DEFAULTS.ratedCapacity,
      control_type: "FLOW",
      pressure_set: HYDROGEN_SOURCE_DEFAULTS.pressure,
      pressure_max: HYDROGEN_SOURCE_DEFAULTS.pressureMax,
      pressure_min: HYDROGEN_SOURCE_DEFAULTS.pressureMin,
      flow_set: HYDROGEN_SOURCE_DEFAULTS.flow,
      flow_max: HYDROGEN_SOURCE_DEFAULTS.flowMax,
      flow_min: HYDROGEN_SOURCE_DEFAULTS.flowMin,
      pressure: HYDROGEN_SOURCE_DEFAULTS.pressure,
      flow: HYDROGEN_SOURCE_DEFAULTS.flow
    },
    terminalType: "h2",
    terminalCount: 1,
    parameterDefinitions: HYDROGEN_SOURCE_PARAMETER_DEFINITIONS
  },
  {
    kind: "hydrogen-tank",
    label: "储氢罐",
    categoryLibrary: "氢能设备",
    size: { width: 126, height: 58 },
    params: {
      control_type: "PRESSURE",
      pressure_set: "1",
      flow_set: "0",
      alpha: "1",
      flow_min: "-10",
      flow_max: "10",
      pressure: "1",
      rated_capacity: "1000",
      water_volume: "50",
      initial_soc: "0.5",
      pressure_max: "45",
      pressure_min: "0.1",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5",
      soc_upper_limit: "0.9",
      soc_lower_limit: "0.1"
    },
    terminalType: "h2",
    terminalCount: 0,
    parameterDefinitions: HYDROGEN_TANK_PARAMETER_DEFINITIONS
  },
  {
    kind: "hydrogen-tank-horizontal",
    label: "横卧式储氢罐",
    categoryLibrary: "氢能设备",
    size: { width: 150, height: 54 },
    params: {
      control_type: "PRESSURE",
      pressure_set: "1",
      flow_set: "0",
      alpha: "1",
      flow_min: "-10",
      flow_max: "10",
      pressure: "1",
      rated_capacity: "1000",
      water_volume: "50",
      initial_soc: "0.5",
      pressure_max: "45",
      pressure_min: "0.1",
      storageType: "horizontal",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5",
      soc_upper_limit: "0.9",
      soc_lower_limit: "0.1"
    },
    terminalType: "h2",
    terminalCount: 0,
    parameterDefinitions: HYDROGEN_TANK_PARAMETER_DEFINITIONS
  },
  {
    kind: "hydrogen-tank-container",
    label: "集装格式储氢罐",
    categoryLibrary: "氢能设备",
    size: { width: 142, height: 66 },
    params: {
      control_type: "PRESSURE",
      pressure_set: "1",
      flow_set: "0",
      alpha: "1",
      flow_min: "-10",
      flow_max: "10",
      pressure: "1",
      rated_capacity: "1000",
      water_volume: "50",
      initial_soc: "0.5",
      pressure_max: "45",
      pressure_min: "0.1",
      storageType: "container",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5",
      soc_upper_limit: "0.9",
      soc_lower_limit: "0.1"
    },
    terminalType: "h2",
    terminalCount: 0,
    parameterDefinitions: HYDROGEN_TANK_PARAMETER_DEFINITIONS
  },
  {
    kind: "hydrogen-load",
    label: "氢荷",
    categoryLibrary: "氢能设备",
    size: { width: 86, height: 58 },
    params: {
      rated_capacity: HYDROGEN_LOAD_DEFAULTS.ratedCapacity,
      control_type: "FLOW",
      pressure_set: HYDROGEN_LOAD_DEFAULTS.pressure,
      pressure_max: HYDROGEN_LOAD_DEFAULTS.pressureMax,
      pressure_min: HYDROGEN_LOAD_DEFAULTS.pressureMin,
      flow_set: HYDROGEN_LOAD_DEFAULTS.flow,
      flow_max: HYDROGEN_LOAD_DEFAULTS.flowMax,
      flow_min: HYDROGEN_LOAD_DEFAULTS.flowMin,
      pressure: HYDROGEN_LOAD_DEFAULTS.pressure,
      flow: HYDROGEN_LOAD_DEFAULTS.flow
    },
    terminalType: "h2",
    terminalCount: 1,
    terminalAnchors: [{ x: 0, y: -0.5 }],
    parameterDefinitions: HYDROGEN_LOAD_PARAMETER_DEFINITIONS
  },
  {
    kind: "ac-fuel-cell",
    label: "交流燃料电池",
    categoryLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: {
      controlType: "P",
      h2eCoeff: "1.5"
    },
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
    categoryLibrary: "氢能设备",
    size: { width: 108, height: 62 },
    params: {
      controlType: "P",
      h2eCoeff: "1.5"
    },
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
    categoryLibrary: "氢能设备",
    size: { width: 120, height: 28 },
    params: { pressure: "20 MPa" },
    terminalType: "h2",
    terminalCount: 0
  },
  {
    kind: "hydrogen-compressor",
    label: "氢压机",
    categoryLibrary: "氢能设备",
    size: { width: 86, height: 58 },
    params: { inletPressure: "2 MPa", outletPressure: "20 MPa" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-pressure-reducer",
    label: "减压阀",
    categoryLibrary: "氢能设备",
    size: { width: 82, height: 54 },
    params: { inletPressure: "20 MPa", outletPressure: "2 MPa" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-shutoff-valve",
    label: "截止阀",
    categoryLibrary: "氢能设备",
    size: { width: 82, height: 54 },
    params: { status: "1" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-pipeline",
    label: "输氢管道",
    categoryLibrary: "氢能设备",
    size: { width: 108, height: 36 },
    params: { length: "1 km", diameter: "DN200" },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "hydrogen-routable-pipeline",
    label: "输氢管道（自适应）",
    categoryLibrary: "氢能设备",
    size: { width: 150, height: 36 },
    params: { length: "1 km", diameter: "DN200", component_type: "HydroPipe", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "h2",
    terminalCount: 2
  },
  {
    kind: "heat-boiler",
    label: "供热锅炉",
    categoryLibrary: "热能设备",
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
    categoryLibrary: "热能设备",
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
    categoryLibrary: "热能设备",
    size: { width: 88, height: 56 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC" },
    terminalType: "heat",
    terminalCount: 1
  },
  {
    kind: "two-port-heat-source",
    label: "双端热源",
    categoryLibrary: "热能设备",
    size: { width: 96, height: 60 },
    params: { heatPower: "10 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备供水端", "热能设备回水端"]
  },
  {
    kind: "heat-exchanger",
    label: "双端热交换器",
    categoryLibrary: "热能设备",
    size: { width: 96, height: 66 },
    params: { heatPower: "8 MW", efficiency: "0.98" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备一次侧", "热能设备二次侧"]
  },
  {
    kind: "three-port-heat-exchanger",
    label: "三端热交换器",
    categoryLibrary: "热能设备",
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
    categoryLibrary: "热能设备",
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
    categoryLibrary: "热能设备",
    size: { width: 108, height: 62 },
    params: {
      ratedVoltage: "10 kV",
      ratedPower: "5 MW",
      heatPower: "4.8 MW",
      controlType: "P",
      e2hCoeff: "1.0"
    },
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
    categoryLibrary: "热能设备",
    size: { width: 116, height: 68 },
    params: {
      ratedVoltage: "10 kV",
      ratedPower: "5 MW",
      heatPower: "4.8 MW",
      supplyTemperature: "95 degC",
      returnTemperature: "70 degC",
      controlType: "P",
      e2hCoeff: "1.0"
    },
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
    categoryLibrary: "热能设备",
    size: { width: 108, height: 62 },
    params: {
      ratedVoltage: "750 V",
      ratedPower: "5 MW",
      heatPower: "4.8 MW",
      controlType: "P",
      e2hCoeff: "1.0"
    },
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
    categoryLibrary: "热能设备",
    size: { width: 116, height: 68 },
    params: {
      ratedVoltage: "750 V",
      ratedPower: "5 MW",
      heatPower: "4.8 MW",
      supplyTemperature: "95 degC",
      returnTemperature: "70 degC",
      controlType: "P",
      e2hCoeff: "1.0"
    },
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
    categoryLibrary: "热能设备",
    size: { width: 126, height: 58 },
    params: {
      capacity: "100 MWh",
      temperature: "90 degC",
      soc: "0.5",
      soc_upper_limit: "0.9",
      soc_lower_limit: "0.1"
    },
    terminalType: "heat",
    terminalCount: 0,
    parameterDefinitions: [
      readonlyIntegerDefinition("序号", "idx"),
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      readonlyIntegerDefinition("热节点号", "node"),
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false },
      { cnName: "储热容量(MWh)", enName: "capacity", valueType: "float", typicalValue: "100", readonly: false },
      { cnName: "温度(°C)", enName: "temperature", valueType: "float", typicalValue: "90", readonly: false },
      { cnName: "SOC", enName: "soc", valueType: "float", typicalValue: "0.5", readonly: false },
      { cnName: "SOC上限", enName: "soc_upper_limit", valueType: "float", typicalValue: "0.9", readonly: false },
      { cnName: "SOC下限", enName: "soc_lower_limit", valueType: "float", typicalValue: "0.1", readonly: false }
    ]
  },
  {
    kind: "single-port-heat-load",
    label: "单端热荷",
    categoryLibrary: "热能设备",
    size: { width: 86, height: 58 },
    params: { heatDemand: "5 MW" },
    terminalType: "heat",
    terminalCount: 1,
    terminalAnchors: [{ x: 0, y: -0.5 }]
  },
  {
    kind: "two-port-heat-load",
    label: "双端热荷",
    categoryLibrary: "热能设备",
    size: { width: 94, height: 60 },
    params: { heatDemand: "5 MW", supplyTemperature: "95 degC", returnTemperature: "70 degC" },
    terminalType: "heat",
    terminalCount: 2,
    terminalLabels: ["热能设备供水端", "热能设备回水端"]
  },
  {
    kind: "heat-bus",
    label: "热力母线",
    categoryLibrary: "热能设备",
    size: { width: 120, height: 28 },
    params: { temperature: "90 degC" },
    terminalType: "heat",
    terminalCount: 0
  },
  {
    kind: "heat-pipeline",
    label: "输热管道",
    categoryLibrary: "热能设备",
    size: { width: 108, height: 36 },
    params: { length: "1 km", diameter: "DN200" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-routable-line",
    label: "热力线路（自适应）",
    categoryLibrary: "热能设备",
    size: { width: 150, height: 36 },
    params: { length: "1 km", diameter: "DN200", component_type: "HeatPipe", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-pump",
    label: "循环水泵",
    categoryLibrary: "热能设备",
    size: { width: 86, height: 58 },
    params: { flowRate: "200 t/h", head: "30 m" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "heat-shutoff-valve",
    label: "截止阀",
    categoryLibrary: "热能设备",
    size: { width: 82, height: 54 },
    params: { status: "1" },
    terminalType: "heat",
    terminalCount: 2
  },
  {
    kind: "ac-line",
    label: "交流线路",
    categoryLibrary: "交流设备",
    size: { width: 108, height: 36 },
    params: { ratedCapacity: "0", rated_voltage: "10", iMax: "0", r: "0.1", x: "1.0", b: "0.0" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-capacitor",
    label: "并联电容器",
    categoryLibrary: "交流设备",
    size: { width: 84, height: 68 },
    params: {
      dev_type: "CAPACITOR",
      rated_voltage: "10",
      rated_reactive_power: "1",
      reactance: "100"
    },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流设备端1"],
    terminalAnchors: [{ x: 0, y: -0.5 }],
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "CAPACITOR", readonly: true },
      { cnName: "节点号", enName: "node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "额定电压(kV)", enName: "rated_voltage", valueType: "float", typicalValue: "10", readonly: false },
      { cnName: "额定无功(Mvar)", enName: "rated_reactive_power", valueType: "float", typicalValue: "1", readonly: false },
      { cnName: "电抗值(Ω)", enName: "reactance", valueType: "float", typicalValue: "100", readonly: false },
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false }
    ]
  },
  {
    kind: "ac-reactor",
    label: "并联电抗器",
    categoryLibrary: "交流设备",
    size: { width: 84, height: 68 },
    params: {
      dev_type: "REACTOR",
      rated_voltage: "10",
      rated_reactive_power: "1",
      reactance: "100"
    },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流设备端1"],
    terminalAnchors: [{ x: 0, y: -0.5 }],
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "REACTOR", readonly: true },
      { cnName: "节点号", enName: "node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "额定电压(kV)", enName: "rated_voltage", valueType: "float", typicalValue: "10", readonly: false },
      { cnName: "额定无功(Mvar)", enName: "rated_reactive_power", valueType: "float", typicalValue: "1", readonly: false },
      { cnName: "电抗值(Ω)", enName: "reactance", valueType: "float", typicalValue: "100", readonly: false },
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false }
    ]
  },
  {
    kind: "ac-series-capacitor",
    label: "串联电容器",
    categoryLibrary: "交流设备",
    size: { width: 108, height: 52 },
    params: {
      dev_type: "CAPACITOR",
      rated_voltage: "10",
      rated_reactive_power: "1",
      reactance: "100"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "ac"],
    terminalLabels: ["交流设备首端", "交流设备末端"],
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "CAPACITOR", readonly: true },
      { cnName: "首端节点号", enName: "i_node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "末端节点号", enName: "j_node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "额定电压(kV)", enName: "rated_voltage", valueType: "float", typicalValue: "10", readonly: false },
      { cnName: "额定无功(Mvar)", enName: "rated_reactive_power", valueType: "float", typicalValue: "1", readonly: false },
      { cnName: "电抗值(Ω)", enName: "reactance", valueType: "float", typicalValue: "100", readonly: false },
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false }
    ]
  },
  {
    kind: "ac-series-reactor",
    label: "串联电抗器",
    categoryLibrary: "交流设备",
    size: { width: 108, height: 52 },
    params: {
      dev_type: "REACTOR",
      rated_voltage: "10",
      rated_reactive_power: "1",
      reactance: "100"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "ac"],
    terminalLabels: ["交流设备首端", "交流设备末端"],
    parameterDefinitions: [
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
      { cnName: "设备类型", enName: "dev_type", valueType: "string", typicalValue: "REACTOR", readonly: true },
      { cnName: "首端节点号", enName: "i_node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "末端节点号", enName: "j_node", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "额定电压(kV)", enName: "rated_voltage", valueType: "float", typicalValue: "10", readonly: false },
      { cnName: "额定无功(Mvar)", enName: "rated_reactive_power", valueType: "float", typicalValue: "1", readonly: false },
      { cnName: "电抗值(Ω)", enName: "reactance", valueType: "float", typicalValue: "100", readonly: false },
      { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], enumValueType: "number", enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }], readonly: false }
    ]
  },
  {
    kind: "ac-routable-line",
    label: "交流线路（自适应）",
    categoryLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { ratedCapacity: "0", rated_voltage: "10", iMax: "0", r: "0.1", x: "1.0", b: "0.0", component_type: "ACBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-zero-branch",
    label: "交流零阻抗支路",
    categoryLibrary: "交流设备",
    size: { width: 108, height: 36 },
    params: { rated_voltage: "10" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-zero-routable-branch",
    label: "交流零阻抗支路（自适应）",
    categoryLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { rated_voltage: "10", component_type: "ACZeroBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-bus",
    label: "交流母线",
    categoryLibrary: "交流设备",
    size: { width: 120, height: 28 },
    params: { rated_voltage: "10", voltageLevel: "10 kV", vMax: "1.1", vMin: "0.9", section: "I段" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "ac-switch",
    label: "交流开关",
    categoryLibrary: "交流设备",
    size: { width: 72, height: 48 },
    params: { status: "1", closed_status: "1", closed_status_set: "1", ratedCapacity: "0", rated_voltage: "10", iMax: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-ground-disconnector",
    label: "接地刀闸",
    categoryLibrary: "交流设备",
    size: { width: 78, height: 58 },
    params: { status: "0", ratedCapacity: "0", iMax: "1250 A" },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流系统端"],
    terminalAnchors: [{ x: -0.5, y: 0 }]
  },
  {
    kind: "ac-ground-disconnector-vertical",
    label: "竖向接地刀闸",
    categoryLibrary: "交流设备",
    size: { width: 58, height: 78 },
    params: { status: "0", ratedCapacity: "0", iMax: "1250 A" },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流系统端"],
    terminalAnchors: [{ x: 0, y: -0.5 }]
  },
  {
    kind: "ac-breaker",
    label: "交流断路器",
    categoryLibrary: "交流设备",
    size: { width: 78, height: 50 },
    params: { status: "1", closed_status: "1", closed_status_set: "1", ratedCapacity: "0", rated_voltage: "10", iMax: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-box-breaker",
    label: "盒型开关",
    categoryLibrary: "交流设备",
    size: { width: 86, height: 44 },
    params: { status: "1", closed_status: "1", closed_status_set: "1", ratedCapacity: "0", rated_voltage: "10", iMax: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-load",
    label: "交流负荷",
    categoryLibrary: "交流设备",
    size: { width: 86, height: 58 },
    params: {
      activePower: "5 MW",
      reactivePower: "1.2 Mvar",
      powerFactor: "0.95",
      ratedCapacity: "5 MW",
      rated_voltage: "10",
      pMax: "5 MW",
      pMin: "0",
      qMax: "1.2 Mvar",
      qMin: "0",
      q_set: "0",
      vMax: "1.1",
      vMin: "0.9"
    },
    terminalType: "ac",
    terminalCount: 1,
    terminalAnchors: [{ x: 0, y: -0.5 }]
  },
  {
    kind: "ac-terminal-transformer-load",
    label: "终端变负荷",
    categoryLibrary: "交流设备",
    size: { width: 92, height: 70 },
    params: {
      activePower: "5 MW",
      reactivePower: "1.2 Mvar",
      powerFactor: "0.95",
      ratedCapacity: "5 MW",
      rated_voltage: "10",
      pMax: "5 MW",
      pMin: "0",
      qMax: "1.2 Mvar",
      qMin: "0",
      q_set: "0",
      vMax: "1.1",
      vMin: "0.9"
    },
    terminalType: "ac",
    terminalCount: 1,
    terminalLabels: ["交流设备端1"],
    terminalAnchors: [{ x: -0.5, y: 0 }]
  },
  {
    kind: "ac-transformer",
    label: "双绕组主变",
    categoryLibrary: "交流设备",
    size: { width: 92, height: 70 },
    params: {
      ratedCapacity: "50",
      i_i_max: "0",
      j_i_max: "0",
      voltageRatio: "110/10 kV",
      impedance: "10.5%",
      r: "0.0",
      x: "0.1",
      gt: "0.0",
      bt: "0.0",
      tap: "1.0",
      tap_set: "0"
    },
    terminalType: "ac",
    terminalCount: 2,
    isContainer: false,
    parameterDefinitions: twoWindingTransformerParameterDefinitions
  },
  {
    kind: "ac-three-winding-transformer",
    label: "三绕组主变",
    categoryLibrary: "交流设备",
    size: { width: 104, height: 76 },
    params: {
      ratedCapacity: "90",
      voltageRatio: "220/110/10 kV",
      windingType: "三绕组",
      impedance: "12.0%",
      ...THREE_WINDING_TRANSFORMER_E_DEFAULT_PARAMS
    },
    terminalType: "ac",
    terminalCount: 3,
    terminalAnchors: THREE_WINDING_TRANSFORMER_TERMINAL_ANCHORS,
    isContainer: false,
    parameterDefinitions: threeWindingTransformerParameterDefinitions
  },
  {
    kind: "ac-three-winding-transformer-neutral",
    label: "三绕组主变(中性点)",
    categoryLibrary: "交流设备",
    size: { width: 112, height: 92 },
    params: {
      ratedCapacity: "90",
      voltageRatio: "220/110/10/0.4 kV",
      windingType: "三绕组带中性点",
      impedance: "12.0%",
      ...THREE_WINDING_TRANSFORMER_E_DEFAULT_PARAMS
    },
    terminalType: "ac",
    terminalCount: 4,
    terminalLabels: ["高压绕组端", "中压绕组端", "低压绕组端", "中性点"],
    terminalAnchors: THREE_WINDING_TRANSFORMER_NEUTRAL_TERMINAL_ANCHORS,
    isContainer: false,
    parameterDefinitions: threeWindingTransformerParameterDefinitions
  },
  {
    kind: "dc-source",
    label: "直流电源",
    categoryLibrary: "直流设备",
    size: { width: 84, height: 56 },
    params: { ratedCapacity: "10 MW", ratedVoltage: "750 V", iMax: "2000 A", pMax: "0", pMin: "0", vMax: "1.1", vMin: "0.9" },
    terminalType: "dc",
    terminalCount: 1,
    parameterDefinitions: [
      { cnName: "额定容量", enName: "ratedCapacity", valueType: "string", typicalValue: "10 MW", readonly: false },
      { cnName: "额定电压", enName: "ratedVoltage", valueType: "string", typicalValue: "750 V", readonly: false },
      { cnName: "电压上限", enName: "vMax", valueType: "float", typicalValue: "1.1", readonly: false },
      { cnName: "电压下限", enName: "vMin", valueType: "float", typicalValue: "0.9", readonly: false },
      { cnName: "最大电流", enName: "iMax", valueType: "string", typicalValue: "2000 A", readonly: false },
      { cnName: "有功上限", enName: "pMax", valueType: "float", typicalValue: "0", readonly: false },
      { cnName: "有功下限", enName: "pMin", valueType: "float", typicalValue: "0", readonly: false }
    ]
  },
  ...ELECTRIC_GENERATION_DEVICE_TEMPLATES.filter((template) => template.terminalType === "dc"),
  {
    kind: "dc-line",
    label: "直流线路",
    categoryLibrary: "直流设备",
    size: { width: 108, height: 36 },
    params: { ratedCapacity: "0", rated_voltage: "750", iMax: "0", r: "1.0" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-routable-line",
    label: "直流线路（自适应）",
    categoryLibrary: "直流设备",
    size: { width: 150, height: 36 },
    params: { ratedCapacity: "0", rated_voltage: "750", iMax: "0", r: "1.0", component_type: "DCBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-zero-branch",
    label: "直流零阻抗支路",
    categoryLibrary: "直流设备",
    size: { width: 108, height: 36 },
    params: { rated_voltage: "750" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-zero-routable-branch",
    label: "直流零阻抗支路（自适应）",
    categoryLibrary: "直流设备",
    size: { width: 150, height: 36 },
    params: { rated_voltage: "750", component_type: "DCZeroBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-bus",
    label: "直流母线",
    categoryLibrary: "直流设备",
    size: { width: 120, height: 28 },
    params: { rated_voltage: "750", voltageLevel: "750 V", vMax: "1.1", vMin: "0.9", pole: "正负极" },
    terminalType: "dc",
    terminalCount: 0
  },
  {
    kind: "dc-switch",
    label: "直流开关",
    categoryLibrary: "直流设备",
    size: { width: 72, height: 48 },
    params: { status: "1", closed_status: "1", closed_status_set: "1", ratedCapacity: "0", rated_voltage: "750", iMax: "1600 A" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-breaker",
    label: "直流断路器",
    categoryLibrary: "直流设备",
    size: { width: 78, height: 50 },
    params: { status: "1", closed_status: "1", closed_status_set: "1", ratedCapacity: "0", rated_voltage: "750", iMax: "1600 A" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-load",
    label: "直流负荷",
    categoryLibrary: "直流设备",
    size: { width: 86, height: 58 },
    params: {
      power: "1.5 MW",
      voltage: "750 V",
      ratedCapacity: "1.5 MW",
      rated_voltage: "750",
      pMax: "1.5 MW",
      pMin: "0",
      vMax: "1.1",
      vMin: "0.9"
    },
    terminalType: "dc",
    terminalCount: 1,
    terminalAnchors: [{ x: 0, y: -0.5 }]
  },
  {
    kind: "dcdc-converter",
    label: "DCDC变流器",
    categoryLibrary: "直流设备",
    size: { width: 112, height: 66 },
    params: {
      ratedCapacity: "5 MW",
      inputVoltage: "1500 V",
      outputVoltage: "750 V",
      iPMax: "5 MW",
      iPMin: "-5 MW",
      iIMax: "0",
      iVMax: "1.1",
      iVMin: "0.9",
      jPMax: "5 MW",
      jPMin: "-5 MW",
      jIMax: "0",
      jVMax: "1.1",
      jVMin: "0.9"
    },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "acdc-converter",
    label: "ACDC变流器",
    categoryLibrary: "直流设备",
    size: { width: 112, height: 66 },
    params: {
      ratedCapacity: "10 MW",
      acVoltage: "10 kV",
      dcVoltage: "750 V",
      acPMax: "10 MW",
      acPMin: "-10 MW",
      acQMax: "10 MW",
      acQMin: "-10 MW",
      acIMax: "0",
      acVMax: "1.1",
      acVMin: "0.9",
      dcPMax: "10 MW",
      dcPMin: "-10 MW",
      dcIMax: "0",
      dcVMax: "1.1",
      dcVMin: "0.9"
    },
    terminalType: "ac",
    terminalCount: 2,
    terminalTypes: ["ac", "dc"]
  },
  {
    kind: "dcac-converter",
    label: "DCAC变流器",
    categoryLibrary: "直流设备",
    size: { width: 112, height: 66 },
    params: {
      ratedCapacity: "10 MW",
      dcVoltage: "750 V",
      acVoltage: "10 kV",
      acPMax: "10 MW",
      acPMin: "-10 MW",
      acQMax: "10 MW",
      acQMin: "-10 MW",
      acIMax: "0",
      acVMax: "1.1",
      acVMin: "0.9",
      dcPMax: "10 MW",
      dcPMin: "-10 MW",
      dcIMax: "0",
      dcVMax: "1.1",
      dcVMin: "0.9"
    },
    terminalType: "dc",
    terminalCount: 2,
    terminalTypes: ["dc", "ac"]
  },
  {
    kind: "acac-converter",
    label: "ACAC变流器",
    categoryLibrary: "交流设备",
    size: { width: 112, height: 66 },
    params: {
      ratedCapacity: "10 MW",
      iPMax: "10 MW",
      iPMin: "-10 MW",
      iQMax: "10 MW",
      iQMin: "-10 MW",
      iIMax: "0",
      iVMax: "1.1",
      iVMin: "0.9",
      jPMax: "10 MW",
      jPMin: "-10 MW",
      jQMax: "10 MW",
      jQMin: "-10 MW",
      jIMax: "0",
      jVMax: "1.1",
      jVMin: "0.9"
    },
    terminalType: "ac",
    terminalCount: 2
  }
];

export const TEMPLATE_DEFINITION_VALUE_TYPES: Record<string, DeviceParameterValueType> = {
  rated_capacity_ac_load_t1: "float",
  p_max_ac_load_t1: "float",
  p_min_ac_load_t1: "float",
  q_max_ac_load_t1: "float",
  q_min_ac_load_t1: "float",
  rated_capacity_dc_load_t1: "float",
  p_max_dc_load_t1: "float",
  p_min_dc_load_t1: "float",
  rated_capacity_ac_unit_t1: "float",
  p_max_ac_unit_t1: "float",
  p_min_ac_unit_t1: "float",
  q_max_ac_unit_t1: "float",
  q_min_ac_unit_t1: "float",
  rated_capacity_dc_unit_t1: "float",
  p_max_dc_unit_t1: "float",
  p_min_dc_unit_t1: "float",
  rated_capacity_h2_unit_t2: "float",
  control_type_h2_unit_t2: "stringEnum",
  pressure_set_h2_unit_t2: "float",
  pressure_max_h2_unit_t2: "float",
  pressure_min_h2_unit_t2: "float",
  flow_set_h2_unit_t2: "float",
  flow_max_h2_unit_t2: "float",
  flow_min_h2_unit_t2: "float",
  rated_capacity_h2_load_t2: "float",
  control_type_h2_load_t2: "stringEnum",
  pressure_set_h2_load_t2: "float",
  pressure_max_h2_load_t2: "float",
  pressure_min_h2_load_t2: "float",
  flow_set_h2_load_t2: "float",
  flow_max_h2_load_t2: "float",
  flow_min_h2_load_t2: "float",
  i_max: "float",
  high_i_max: "float",
  medium_i_max: "float",
  low_i_max: "float",
  v_max: "float",
  v_min: "float",
  ac_p_max: "float",
  ac_p_min: "float",
  ac_q_max: "float",
  ac_q_min: "float",
  ac_i_max: "float",
  ac_v_max: "float",
  ac_v_min: "float",
  dc_p_max: "float",
  dc_p_min: "float",
  dc_i_max: "float",
  dc_v_max: "float",
  dc_v_min: "float",
  i_p_max: "float",
  i_p_min: "float",
  i_q_max: "float",
  i_q_min: "float",
  i_i_max: "float",
  i_vbase: "float",
  i_rated_capacity: "float",
  i_p: "float",
  i_q: "float",
  i_u: "float",
  i_i: "float",
  i_r: "float",
  i_x: "float",
  i_gt: "float",
  i_bt: "float",
  i_tap: "float",
  i_shift: "float",
  i_v_max: "float",
  i_v_min: "float",
  j_p_max: "float",
  j_p_min: "float",
  j_q_max: "float",
  j_q_min: "float",
  j_i_max: "float",
  j_vbase: "float",
  j_rated_capacity: "float",
  j_p: "float",
  j_q: "float",
  j_u: "float",
  j_i: "float",
  j_r: "float",
  j_x: "float",
  j_gt: "float",
  j_bt: "float",
  j_tap: "float",
  j_shift: "float",
  j_v_max: "float",
  j_v_min: "float",
  k_r: "float",
  k_i_max: "float",
  k_vbase: "float",
  k_rated_capacity: "float",
  k_x: "float",
  k_gt: "float",
  k_bt: "float",
  k_tap: "float",
  k_shift: "float",
  idx: "integer",
  node: "integer",
  node1: "integer",
  node2: "integer",
  node3: "integer",
  node4: "integer",
  i_node: "integer",
  j_node: "integer",
  k_node: "integer",
  ac_node: "integer",
  dc_node: "integer",
  t1_node: "integer",
  t2_node: "integer",
  t3_node: "integer",
  neutral_node: "integer",
  isl: "integer",
  battery_rack_count: "integer",
  mppt_count: "integer",
  status: "numberEnum",
  status_set: "numberEnum",
  closed_status: "numberEnum",
  closed_status_set: "numberEnum",
  run_stat: "numberEnum",
  control_type: "stringEnum",
  i_control_type: "stringEnum",
  j_control_type: "stringEnum",
  ac_control_type: "stringEnum",
  dc_control_type: "stringEnum",
  fuel_type: "stringEnum",
  reactor_type: "stringEnum",
  storage_technology: "stringEnum",
  turbine_type: "stringEnum",
  ac_voltage: "float",
  active_power: "float",
  alpha: "float",
  initial_soc: "float",
  angle: "float",
  array_area: "float",
  b: "float",
  b_set: "float",
  bt: "float",
  bt1: "float",
  bt2: "float",
  bt3: "float",
  capacity: "float",
  capacity_factor: "float",
  charge_discharge_efficiency: "float",
  cut_in_wind_speed: "float",
  cut_out_wind_speed: "float",
  dc_voltage: "float",
  design_flow: "float",
  design_head: "float",
  e2h_coeff: "float",
  efficiency: "float",
  energy_capacity: "float",
  flow_rate: "float",
  flow_set: "float",
  frequency: "float",
  flow: "float",
  fuel_tank_capacity: "float",
  gas_quantity: "float",
  g_set: "float",
  generator_efficiency: "float",
  gt: "float",
  gt1: "float",
  gt2: "float",
  gt3: "float",
  head: "float",
  heat_demand: "float",
  heat_power: "float",
  heat_rate: "float",
  high_rated_capacity: "float",
  high_vbase: "float",
  hub_height: "float",
  hydrogen_demand: "float",
  hydrogen_flow: "float",
  h2e_coeff: "float",
  impedance: "float",
  inlet_pressure: "float",
  input_voltage: "float",
  i_dc_set: "float",
  i_i_set: "float",
  i_p_set: "float",
  i_q_set: "float",
  i_set: "float",
  i_v_set: "float",
  j_i_set: "float",
  j_p_set: "float",
  j_q_set: "float",
  j_v_set: "float",
  length: "float",
  low_rated_capacity: "float",
  low_vbase: "float",
  main_steam_pressure: "float",
  main_steam_temperature: "float",
  max_charge_power: "float",
  max_current: "float",
  max_discharge_power: "float",
  medium_rated_capacity: "float",
  medium_vbase: "float",
  module_efficiency: "float",
  outlet_pressure: "float",
  output_voltage: "float",
  p_ac_set: "float",
  p_dc_set: "float",
  p_max: "float",
  p_min: "float",
  p_set: "float",
  pbase: "float",
  power: "float",
  power_factor: "float",
  pressure: "float",
  pressure_max: "float",
  pressure_min: "float",
  primary_loop_pressure: "float",
  pv0: "float",
  pv1: "float",
  pv2: "float",
  q_ac_set: "float",
  q_max: "float",
  q_min: "float",
  q_set: "float",
  qbase: "float",
  qv0: "float",
  qv1: "float",
  qv2: "float",
  r: "float",
  r1: "float",
  r2: "float",
  r3: "float",
  rated_capacity: "float",
  rated_current: "float",
  rated_power: "float",
  rated_speed: "float",
  rated_voltage: "float",
  rated_wind_speed: "float",
  reactive_power: "float",
  regable: "numberEnum",
  reactor_thermal_power: "float",
  reference_irradiance: "float",
  reference_temperature: "float",
  return_temperature: "float",
  rotor_diameter: "float",
  shift: "float",
  shift1: "float",
  shift2: "float",
  shift3: "float",
  short_circuit_capacity: "float",
  soc: "float",
  soc_lower_limit: "float",
  soc_upper_limit: "float",
  specific_fuel_consumption: "float",
  start_time: "float",
  supply_temperature: "float",
  supply_temperature_set: "float",
  tap: "float",
  tap_set: "float",
  tap1: "float",
  tap2: "float",
  tap3: "float",
  temperature: "float",
  temperature_coefficient: "float",
  thermal_efficiency: "float",
  v_ac_set: "float",
  v_dc_set: "float",
  v_set: "float",
  vbase: "float",
  voltage: "float",
  voltage_level: "float",
  water_volume: "float",
  x: "float",
  x1: "float",
  x2: "float",
  x3: "float",
  x_pu: "float"
};

export function isStaticKind(kind: DeviceKind): boolean {
  return kind.startsWith("static-");
}

export function isStaticLineLikeKind(kind: DeviceKind): boolean {
  return STATIC_LINE_LIKE_KIND_SET.has(baseDeviceKind(kind) as DeviceKind);
}

export function isStaticButtonCapableKind(kind: DeviceKind): boolean {
  const baseKind = baseDeviceKind(kind) as DeviceKind;
  if (explicitStaticComponentLibraryForKind(baseKind) === "StaticButton") {
    return true;
  }
  return isStaticKind(baseKind) && !isStaticLineLikeKind(baseKind);
}
