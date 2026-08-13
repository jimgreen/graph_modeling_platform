import { normalizeProjectMeasurements } from "./measurements";
import type { ProjectMeasurementConfig } from "./measurements";
import { cloneDeviceMeasurementDefinitions, normalizeDeviceMeasurementDefinitions } from "./measurementDefinitionTypes";
import type { DeviceMeasurementDefinition } from "./measurementDefinitionTypes";
import { degreesToRadians } from "./formatUtils";
import { clampNumber } from "./canvasViewport";
import { normalizeImageFitMode } from "./imageFit";

// E 文件导出相关代码（从 model.ts 提取到独立模块）
export * from "./model-eexport";
import {
  inferESection,
  E_SECTION_COLUMNS,
  THREE_WINDING_TRANSFORMER_SIDES,
  legacyEColumnForDefinition,
  getEParameterKeys,
  isZeroNumericText,
  isThreeWindingTransformer,
  firstText,
  terminalVoltageDisplayValue,
  firstNonZeroVoltageBase,
  terminalVoltageDisplay,
  shouldAssignVoltageSetpointDefault,
  hasVisibleThreeWindingNeutralTerminal,
  isDerivedComponentCommonFieldName,
  defaultContainerAssociatedColumnValue,
  firstNumericToken,
  type VoltageDisplayTerminal
} from "./model-eexport";

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
  | "ac-capacitor"
  | "ac-reactor"
  | "ac-series-capacitor"
  | "ac-series-reactor"
  | "ac-wind-source"
  | "dc-wind-source"
  | "ac-pv-source"
  | "dc-pv-source"
  | "ac-thermal-source"
  | "dc-thermal-source"
  | "ac-diesel-source"
  | "dc-diesel-source"
  | "ac-hydro-source"
  | "dc-hydro-source"
  | "ac-nuclear-source"
  | "dc-nuclear-source"
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
  | "dcac-converter"
  | "acac-converter"
  | (string & {});

export type DeviceGlyphVariant =
  | "static"
  | "ac-generator"
  | "ac-shunt-capacitor"
  | "ac-shunt-reactor"
  | "ac-series-capacitor"
  | "ac-series-reactor"
  | "dc-generator"
  | "wind-source"
  | "pv-source"
  | "thermal-source"
  | "diesel-source"
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
  | "dcac-converter"
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

const THREE_WINDING_TRANSFORMER_NEUTRAL_TERMINAL_ANCHORS: Point[] = [
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

export type DeviceParameterValueType = "integer" | "float" | "string" | "stringEnum" | "numberEnum" | "enum";

export type DeviceParameterEnumValueType = "number" | "string";

export type DeviceParameterEnumOption = {
  value: string;
  label?: string;
};

export type DeviceParameterDefinition = {
  cnName: string;
  enName: string;
  valueType: DeviceParameterValueType;
  typicalValue: string;
  enumValues?: string[];
  enumValueType?: DeviceParameterEnumValueType;
  enumOptions?: DeviceParameterEnumOption[];
  readonly?: boolean;
  exportEnabled?: boolean;
  exportName?: string;
};

export type DeviceEnumParameterBinding = {
  paramKey: string;
  definition: DeviceParameterDefinition;
  value: string;
  section: string;
};

export type DeviceEnumParameterIssue = DeviceEnumParameterBinding & {
  allowedValues: string[];
};

export type DeviceStateDefinition = {
  value: string;
  name: string;
  icon?: string;
  image?: string;
  imageAssetId?: string;
  imageFit?: string;
  text?: string;
  color?: string;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  backgroundImage?: string;
  backgroundImageAssetId?: string;
  backgroundImageFit?: string;
  imageCleared?: string;
};

export type DeviceStateVisual = DeviceStateDefinition & {
  value: string;
  name: string;
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
  categoryLibrary: string;
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
  isDerivedComponentLibrary?: boolean;
  derivedFromComponentLibrary?: string;
  derivedComponentLibrary?: string;
  derivedComponentLibraryLabel?: string;
  allowResizeTransform?: boolean;
  custom?: boolean;
  parameterDefinitions?: DeviceParameterDefinition[];
  /** An applied persisted override is a complete table; omitted fields were explicitly deleted. */
  parameterDefinitionsComplete?: boolean;
  measurementDefinitions?: DeviceMeasurementDefinition[];
  stateDefinitions?: DeviceStateDefinition[];
  rotation?: number;
};

export type DeviceTemplateDefinitionOverride = {
  kind: string;
  params?: Record<string, string>;
  size?: DeviceTemplate["size"];
  terminalType?: TerminalType;
  terminalCount?: number;
  terminalTypes?: TerminalType[];
  terminalLabels?: string[];
  terminalAnchors?: Point[];
  terminalRoles?: ContainerTerminalRole[];
  terminalAssociations?: ContainerTerminalAssociationValue[];
  isContainer?: boolean;
  isDerivedComponentLibrary?: boolean;
  derivedFromComponentLibrary?: string;
  derivedComponentLibrary?: string;
  derivedComponentLibraryLabel?: string;
  allowResizeTransform?: boolean;
  parameterDefinitions?: DeviceParameterDefinition[];
  measurementDefinitions?: DeviceMeasurementDefinition[];
  stateDefinitions?: DeviceStateDefinition[];
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
  componentLibrary?: string;
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
  componentLibrary: string;
  componentLibraryLabel?: string;
  idx: string;
  name: string;
  nameKey: string;
  relationKeys: string[];
  terminalLabels: string;
};

export type ElementTreeDeviceGroup = {
  deviceKey: string;
  deviceLabel: string;
  deviceEnglishLabel?: string;
  items: ElementTreeItem[];
};

export type ElementTreeGroup = {
  typeKey: string;
  typeLabel: string;
  typeEnglishLabel?: string;
  items: ElementTreeItem[];
  deviceGroups?: ElementTreeDeviceGroup[];
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
  canvasBackgroundImageFit?: string;
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
  subcontrolarea?: string;
  modelType?: string;
  substation?: string;
  feeder?: string;
  taiqu?: string;
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
export const ALLOW_RESIZE_TRANSFORM_PARAM = "allowResizeTransform";
const ROUTABLE_LINE_LEGACY_DEFAULT_STROKE_WIDTH = 7;
// INTERACTIVE_STATIC_DRAWING_KINDS 已移至 model-node-ops.ts，通过 export * 重新导出
import { INTERACTIVE_STATIC_DRAWING_KINDS } from "./model-node-ops";

export const STATIC_LINE_LIKE_KINDS = [
  ...INTERACTIVE_STATIC_DRAWING_KINDS,
  "static-self-loop"
] as const satisfies readonly DeviceKind[];

const STATIC_LINE_LIKE_KIND_SET = new Set<DeviceKind>(STATIC_LINE_LIKE_KINDS);

export const DEFAULT_POWER_UNIT = "MW";
export const DEFAULT_VOLTAGE_UNIT = "kV";
export const DEFAULT_CURRENT_UNIT = "A";
export const DEFAULT_POWER_BASE_VALUE = 100;

const POWER_VALUE_NUMERIC_PREFIX_PATTERN = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/;
const RATIO_PARAMETER_INPUT_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const PERCENTAGE_RATIO_PARAMETER_NAMES = new Set([
  "eta",
  "soc",
  "soc_lower_limit",
  "soc_upper_limit",
  "state_of_charge"
]);
const BOUNDED_NUMERIC_PARAMETER_RANGES: Record<string, readonly [number, number]> = {
  e2h_coeff: [0.1, 0.5],
  h2e_coeff: [1.0, 2.0]
};
const ELECTRIC_HEAT_COUPLING_SECTIONS = new Set(["AcE2Heat", "DcE2Heat", "AcE2Heat2", "DcE2Heat2"]);
const ELECTRIC_HEAT_E2H_COEFF_RANGE = [0.5, 5.0] as const;

function numericPrefixForPowerDisplay(value: string) {
  const text = String(value ?? "").trim();
  return POWER_VALUE_NUMERIC_PREFIX_PATTERN.exec(text)?.[1] ?? text;
}

function compactRatioNumber(value: number) {
  const rounded = Math.round(value * 1e12) / 1e12;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export function isPercentageRatioParameterName(name: string) {
  const normalizedName = toSnakeCaseDeviceParamName(String(name ?? ""));
  return normalizedName === "efficiency" ||
    normalizedName.endsWith("_efficiency") ||
    PERCENTAGE_RATIO_PARAMETER_NAMES.has(normalizedName);
}

export function normalizeRatioParameterInputValue(name: string, value: string, section?: string): string | null {
  const normalizedName = toSnakeCaseDeviceParamName(String(name ?? ""));
  const numericRange = normalizedName === "e2h_coeff" && ELECTRIC_HEAT_COUPLING_SECTIONS.has(section ?? "")
    ? ELECTRIC_HEAT_E2H_COEFF_RANGE
    : BOUNDED_NUMERIC_PARAMETER_RANGES[normalizedName];
  if (numericRange) {
    const text = String(value ?? "").trim();
    if (!RATIO_PARAMETER_INPUT_PATTERN.test(text)) {
      return null;
    }
    const numericValue = Number(text);
    return Number.isFinite(numericValue) && numericValue >= numericRange[0] && numericValue <= numericRange[1]
      ? compactRatioNumber(numericValue)
      : null;
  }
  if (!isPercentageRatioParameterName(name)) {
    return value;
  }
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  const hasPercentSuffix = text.endsWith("%");
  const numericText = (hasPercentSuffix ? text.slice(0, -1) : text).trim();
  if (!RATIO_PARAMETER_INPUT_PATTERN.test(numericText)) {
    return null;
  }
  const numericValue = Number(numericText);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  const ratioValue = hasPercentSuffix || Math.abs(numericValue) > 1
    ? numericValue / 100
    : numericValue;
  if (ratioValue < 0 || ratioValue > 1) {
    return null;
  }
  return compactRatioNumber(ratioValue);
}

export function formatRatioParameterDisplayValue(name: string, value: string) {
  const text = String(value ?? "").trim();
  if (!text || !isPercentageRatioParameterName(name)) {
    return text;
  }
  const normalizedValue = normalizeRatioParameterInputValue(name, text);
  if (normalizedValue === null || !normalizedValue) {
    return text;
  }
  return `${compactRatioNumber(Number(normalizedValue) * 100)}%`;
}

export function formatPowerBaseDisplayValue(key: string, value: string) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (isPercentageRatioParameterName(key)) {
    return formatRatioParameterDisplayValue(key, text);
  }
  if (key === "pbase" || key === "qbase") {
    return numericPrefixForPowerDisplay(text);
  }
  return text;
}

const DEFAULT_STATIC_COMPONENT_LIBRARY = "StaticBasicShape";
const STATIC_COMPONENT_LIBRARY_BY_KIND: Record<string, string> = {
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

const STATIC_COMPONENT_RENDER_KIND_BY_LIBRARY: Record<string, DeviceKind> = {
  StaticTextSymbol: "static-text",
  StaticMediaSymbol: "static-image",
  StaticBasicShape: "static-rect",
  StaticFlowNode: "static-default-node",
  StaticButton: "static-button",
  StaticContainerSymbol: "static-group-box",
  StaticConnectorSymbol: "static-straight-connector",
  StaticAnnotationSymbol: "static-callout"
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

function explicitStaticComponentLibraryForKind(kind: string): string {
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

export function isStaticGraphicParams(params?: Record<string, string>): boolean {
  return isStaticComponentLibraryName(staticComponentLibraryFromParams(params));
}

export function staticComponentLibraryForNodeLike(kind: string, params?: Record<string, string>): string {
  const paramsComponentLibrary = staticComponentLibraryFromParams(params);
  if (isStaticComponentLibraryName(paramsComponentLibrary)) {
    return paramsComponentLibrary;
  }
  return explicitStaticComponentLibraryForKind(kind);
}

export function staticRenderKindForNode(node: Pick<ModelNode, "kind" | "params">): DeviceKind {
  const baseKind = baseDeviceKind(node.kind) as DeviceKind;
  if (STATIC_COMPONENT_LIBRARY_BY_KIND[baseKind]) {
    return baseKind;
  }
  const componentLibrary = staticComponentLibraryForNodeLike(node.kind, node.params);
  return STATIC_COMPONENT_RENDER_KIND_BY_LIBRARY[componentLibrary] ?? baseKind;
}

export function isStaticContainerKind(kind: string): boolean {
  return staticComponentLibraryForKind(kind) === "StaticContainerSymbol";
}

function defaultStaticRouteAvoidanceValue(kind: string): "0" | "1" {
  return isStaticContainerKind(kind) ? "0" : "1";
}

function normalizeRouteAvoidanceFlag(value: string | undefined, fallback: "0" | "1"): "0" | "1" {
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
  if (!isStaticGraphicNode(node)) {
    return true;
  }
  return normalizeRouteAvoidanceFlag(
    node.params?.[STATIC_ROUTE_AVOIDANCE_PARAM],
    defaultStaticRouteAvoidanceValue(node.kind)
  ) === "1";
}

export function isContainerParams(params: Record<string, string> = {}) {
  return params.is_container === "1" || params.is_container === "true" || params.isContainer === "true";
}

const GENERATED_VERTICAL_KIND_SUFFIX = "-vertical";
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
const LEGACY_ELECTRIC_GENERATION_BASE_KIND_SET = new Set<string>([
  "ac-wind-source",
  "dc-wind-source",
  "ac-pv-source",
  "dc-pv-source",
  "ac-thermal-source",
  "ac-hydro-source",
  "ac-nuclear-source"
]);

export function isElectricGenerationContainerKind(kind: string): boolean {
  void kind;
  return false;
}

function isLegacyElectricGenerationContainerKind(kind: string): boolean {
  return LEGACY_ELECTRIC_GENERATION_BASE_KIND_SET.has(baseDeviceKind(kind));
}

const ROUTABLE_LINE_DEVICE_KINDS = new Set<string>([
  "ac-routable-line",
  "ac-zero-routable-branch",
  "dc-routable-line",
  "dc-zero-routable-branch",
  "hydrogen-routable-pipeline",
  "heat-routable-line"
]);

const WIRE_LIKE_ROUTE_DEVICE_KINDS = new Set<string>([
  "ac-line",
  "ac-zero-branch",
  "dc-line",
  "dc-zero-branch",
  "hydrogen-pipeline",
  "heat-pipeline"
]);

export function isRoutableLineDeviceKind(kind: string): boolean {
  return ROUTABLE_LINE_DEVICE_KINDS.has(baseDeviceKind(kind));
}

export function isWireLikeRouteDeviceKind(kind: string): boolean {
  const baseKind = baseDeviceKind(kind);
  return ROUTABLE_LINE_DEVICE_KINDS.has(baseKind) || WIRE_LIKE_ROUTE_DEVICE_KINDS.has(baseKind);
}

export function isCanvasNodeMovable(kind: string): boolean {
  return !isRoutableLineDeviceKind(kind);
}

const RESIZE_TRANSFORM_DEFAULT_ALLOWED_KINDS = new Set<string>([
  "hydrogen-tank",
  "hydrogen-tank-horizontal",
  "hydrogen-tank-container",
  "thermal-storage-tank"
]);

export function defaultAllowsResizeTransformForKind(kind: string): boolean {
  const baseKind = baseDeviceKind(kind);
  return (
    Boolean(explicitStaticComponentLibraryForKind(baseKind)) ||
    baseKind.includes("bus") ||
    isRoutableLineDeviceKind(baseKind) ||
    RESIZE_TRANSFORM_DEFAULT_ALLOWED_KINDS.has(baseKind)
  );
}

export function nodeAllowsResizeTransform(node: Pick<ModelNode, "kind">): boolean {
  return defaultAllowsResizeTransformForKind(node.kind);
}

function hasEStatusColumn(kind: string, params: Record<string, string> = {}) {
  const section = inferESection(kind, params);
  return Boolean(section && E_SECTION_COLUMNS[section]?.includes("status"));
}

function isDefaultBinaryStateDeviceKind(kind: string, params: Record<string, string> = {}) {
  const baseKind = baseDeviceKind(kind);
  return (
    hasEStatusColumn(baseKind, params) ||
    baseKind.includes("switch") ||
    baseKind.includes("breaker") ||
    baseKind.includes("disconnector") ||
    baseKind.includes("valve")
  );
}

function cloneDeviceStateDefinition(definition: DeviceStateDefinition): DeviceStateDefinition {
  return {
    value: definition.value,
    name: definition.name,
    ...(definition.icon ? { icon: definition.icon } : {}),
    ...(definition.image ? { image: definition.image } : {}),
    ...(definition.imageAssetId ? { imageAssetId: definition.imageAssetId } : {}),
    ...(definition.imageFit ? { imageFit: normalizeImageFitMode(definition.imageFit) } : {}),
    ...(definition.text ? { text: definition.text } : {}),
    ...(definition.color ? { color: definition.color } : {}),
    ...(definition.fillColor ? { fillColor: definition.fillColor } : {}),
    ...(definition.strokeColor ? { strokeColor: definition.strokeColor } : {}),
    ...(definition.textColor ? { textColor: definition.textColor } : {}),
    ...(definition.backgroundImage ? { backgroundImage: definition.backgroundImage } : {}),
    ...(definition.backgroundImageAssetId ? { backgroundImageAssetId: definition.backgroundImageAssetId } : {}),
    ...(definition.backgroundImageFit ? { backgroundImageFit: normalizeImageFitMode(definition.backgroundImageFit) } : {}),
    ...(definition.imageCleared ? { imageCleared: definition.imageCleared } : {})
  };
}

export function normalizeDeviceStateDefinitions(value: unknown): DeviceStateDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const states: DeviceStateDefinition[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const source = item as Partial<DeviceStateDefinition>;
    const stateValue = normalizeDeviceStateValue(source.value);
    if (!stateValue || seen.has(stateValue)) {
      continue;
    }
    seen.add(stateValue);
    const state: DeviceStateDefinition = {
      value: stateValue,
      name: String(source.name ?? stateValue).trim() || stateValue
    };
    for (const key of ["icon", "image", "imageAssetId", "text", "color", "fillColor", "strokeColor", "textColor", "backgroundImage", "backgroundImageAssetId", "imageCleared"] as const) {
      const text = String(source[key] ?? "").trim();
      if (text) {
        state[key] = text;
      }
    }
    for (const key of ["imageFit", "backgroundImageFit"] as const) {
      const text = String(source[key] ?? "").trim();
      if (text) {
        state[key] = normalizeImageFitMode(text);
      }
    }
    states.push(state);
  }
  return states;
}

function defaultDeviceStateDefinitionsForTemplate(template: Pick<DeviceTemplate, "kind" | "params">): DeviceStateDefinition[] {
  return isDefaultBinaryStateDeviceKind(template.kind, template.params)
    ? DEFAULT_BINARY_DEVICE_STATE_DEFINITIONS.map(cloneDeviceStateDefinition)
    : [];
}

export function getTemplateStateDefinitions(template: Pick<DeviceTemplate, "kind" | "params"> & Partial<Pick<DeviceTemplate, "stateDefinitions">>): DeviceStateDefinition[] {
  if (Array.isArray(template.stateDefinitions)) {
    return normalizeDeviceStateDefinitions(template.stateDefinitions);
  }
  return defaultDeviceStateDefinitionsForTemplate(template);
}

export function defaultDeviceStatusValue(template: Pick<DeviceTemplate, "kind" | "params"> & Partial<Pick<DeviceTemplate, "stateDefinitions">>) {
  const states = getTemplateStateDefinitions(template);
  if (states.length === 0) {
    return "";
  }
  const explicitStatus = normalizeDeviceStateValue(template.params?.status);
  if (explicitStatus) {
    const exact = states.find((state) => state.value === explicitStatus);
    if (exact) {
      return exact.value;
    }
    const normalized = normalizeDeviceStatusForE(explicitStatus);
    const match = states.find((state) => normalizeDeviceStatusForE(state.value) === normalized);
    if (match) {
      return match.value;
    }
    return normalized;
  }
  if (Array.isArray(template.stateDefinitions)) {
    return "";
  }
  const baseKind = baseDeviceKind(template.kind);
  if (baseKind.includes("ground-disconnector")) {
    return "0";
  }
  if (isDefaultBinaryStateDeviceKind(baseKind, template.params)) {
    return "1";
  }
  return states[0]?.value ?? "";
}

export function resolveDeviceStateVisual(
  template: Pick<DeviceTemplate, "kind" | "params"> & Partial<Pick<DeviceTemplate, "stateDefinitions">>,
  node: Pick<ModelNode, "params">
): DeviceStateVisual | null {
  const states = getTemplateStateDefinitions(template);
  if (states.length === 0) {
    return null;
  }
  const current = normalizeDeviceStateValue(node.params.status) || defaultDeviceStatusValue(template);
  const normalizedCurrent = normalizeDeviceStatusForDisplayMatch(current);
  const state = states.find((item) => item.value === current) ??
    (normalizedCurrent
      ? states.find((item) => normalizeDeviceStatusForDisplayMatch(item.value) === normalizedCurrent)
      : undefined);
  return state ? { ...cloneDeviceStateDefinition(state), value: current || state.value, name: state.name } : null;
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
  const template = DEVICE_LIBRARY_BY_KIND.get(node.kind);
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

function containerRelationBaseEnergy(energy: string) {
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

function isContainerAssociatedParameterName(template: DeviceTemplate, paramName: string): boolean {
  if (!template.isContainer || !paramName || paramName.startsWith("_")) {
    return false;
  }
  const normalizedName = toSnakeCaseDeviceParamName(paramName);
  const terminalTypes = templateTerminalTypes(template);
  const terminalAssociations = template.terminalAssociations ?? [];
  const terminalRoles = template.terminalRoles ?? [];
  return terminalTypes.some((terminalType, terminalIndex) => {
    const dependent = terminalAssociations.length
      ? isContainerTerminalAssociationDependent(terminalAssociations, terminalIndex)
      : isContainerTerminalRoleDependent(terminalRoles, terminalIndex);
    if (dependent) {
      return false;
    }
    const association = getEffectiveContainerTerminalAssociation(
      terminalAssociations,
      terminalTypes,
      terminalIndex,
      terminalRoles
    );
    const role = getEffectiveContainerTerminalRole(terminalRoles, terminalIndex);
    const relationKey = terminalAssociations.length
      ? getContainerAssociationRelationKey(association, terminalIndex)
      : getContainerRelationKey(terminalType, role, terminalIndex);
    const relationSuffix = relationKey.replace(/^idx_/, "");
    return normalizedName.endsWith(`_${relationSuffix}`) && normalizedName !== relationKey;
  });
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

export function containerAssociatedDeviceName(
  node: Pick<ModelNode, "name" | "terminals" | "params">,
  fieldName: string
): string {
  return node.params[containerRelationNameKey(fieldName)]?.trim() || containerAssociatedDeviceDisplayName(node, fieldName);
}

export type ContainerAssociatedDeviceIdentity = {
  terminalId: string;
  relationKey: string;
  deviceModel: string;
  index: string;
  deviceId: string;
  name: string;
};

export function containerAssociatedDeviceIdentityForTerminal(
  node: Pick<ModelNode, "name" | "terminals" | "params">,
  template: DeviceTemplate | undefined,
  terminalId: string | undefined
): ContainerAssociatedDeviceIdentity | undefined {
  const normalizedTerminalId = String(terminalId ?? "").trim();
  if (!template?.isContainer || !normalizedTerminalId) {
    return undefined;
  }
  const terminalIndex = node.terminals.findIndex((terminal) => terminal.id === normalizedTerminalId);
  if (terminalIndex < 0) {
    return undefined;
  }
  const associations = describeContainerTerminalAssociations(template);
  const requestedAssociation = associations.find((association) => association.terminalIndex === terminalIndex);
  if (!requestedAssociation) {
    return undefined;
  }
  const sourceAssociation = requestedAssociation.dependent
    ? associations.find((association) =>
        association.terminalIndex === requestedAssociation.sourceTerminalIndex && !association.dependent
      )
    : requestedAssociation;
  const relationKey = String(sourceAssociation?.relationKey ?? "").trim();
  const deviceModel = String(sourceAssociation?.deviceModel ?? "").trim();
  const index = String(node.params[relationKey] ?? "").trim();
  if (!relationKey || !deviceModel || !index) {
    return undefined;
  }
  return {
    terminalId: normalizedTerminalId,
    relationKey,
    deviceModel,
    index,
    deviceId: `${deviceModel}-${index}`,
    name: containerAssociatedDeviceName(node, relationKey)
  };
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

export function normalizeRunStatForE(value?: string) {
  if (!value) return "";
  if (value === "运行") return "1";
  if (value === "停运" || value === "检修") return "0";
  return value;
}

const DEFAULT_BINARY_DEVICE_STATE_DEFINITIONS: DeviceStateDefinition[] = [
  { value: "0", name: "打开/开断" },
  { value: "1", name: "闭合" }
];

function normalizeDeviceStateValue(value?: string) {
  return String(value ?? "").trim();
}

export function normalizeDeviceStatusForE(value?: string) {
  const normalized = normalizeDeviceStateValue(value);
  if (!normalized) return "";
  const lower = normalized.toLowerCase();
  if (
    normalized === "0" ||
    normalized === "打开" ||
    normalized === "开断" ||
    normalized === "打开/开断" ||
    normalized === "分闸" ||
    lower === "open" ||
    lower === "off" ||
    lower === "false"
  ) {
    return "0";
  }
  if (
    normalized === "1" ||
    normalized === "闭合" ||
    normalized === "合闸" ||
    lower === "closed" ||
    lower === "on" ||
    lower === "true"
  ) {
    return "1";
  }
  return "1";
}

function normalizeDeviceStatusForDisplayMatch(value?: string) {
  const normalized = normalizeDeviceStateValue(value);
  if (!normalized) return "";
  const lower = normalized.toLowerCase();
  if (
    normalized === "0" ||
    normalized === "打开" ||
    normalized === "开断" ||
    normalized === "打开/开断" ||
    normalized === "分闸" ||
    lower === "open" ||
    lower === "off" ||
    lower === "false"
  ) {
    return "0";
  }
  if (
    normalized === "1" ||
    normalized === "闭合" ||
    normalized === "合闸" ||
    lower === "closed" ||
    lower === "on" ||
    lower === "true"
  ) {
    return "1";
  }
  return "";
}

export function normalizeSwitchStatusForE(value?: string) {
  return normalizeDeviceStatusForE(value);
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
export const DCAC_AC_CONTROL_TYPES = ["PQ", "PV", "PH", "NONE"] as const;
export const DCAC_DC_CONTROL_TYPES = ["P", "V", "I", "NONE"] as const;
export const ACAC_CONVERTER_CONTROL_TYPES = ["PQQ", "PVQ", "PQV", "PVV"] as const;
export const ACAC_SIDE_CONTROL_TYPES = DCAC_AC_CONTROL_TYPES;
export const DCDC_CONVERTER_CONTROL_TYPES = DCAC_DC_CONTROL_TYPES;
export const AC_GENERATOR_CONTROL_TYPES = ["PV", "PQ", "PH"] as const;
export const DC_GENERATOR_CONTROL_TYPES = ["P", "V", "I", "NONE"] as const;
export const HYDROGEN_COUPLING_CONTROL_TYPES = ["P", "FLOW"] as const;
export const HYDROGEN_ENDPOINT_CONTROL_TYPES = ["FLOW", "PRESSURE"] as const;
export const ELECTRIC_HEAT_COUPLING_CONTROL_TYPES = ["P", "T"] as const;

export function normalizeAcGeneratorControlTypeForE(value?: string) {
  if (!value) return "PV";
  const text = value.trim();
  const normalized = normalizeControlTypeForE(value);
  return (AC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(normalized) ? normalized : text;
}

export function normalizeDcGeneratorControlTypeForE(value?: string) {
  if (!value) return "P";
  const text = value.trim();
  const normalized = normalizeControlTypeForE(value);
  return (DC_GENERATOR_CONTROL_TYPES as readonly string[]).includes(normalized) ? normalized : text;
}

export function normalizeDcdcEndpointControlTypeForE(value?: string, fallback = "NONE") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const normalized = normalizeControlTypeForE(text).toUpperCase();
  const map: Record<string, string> = {
    CTRL_P: "P",
    CTRL_V: "V",
    CTRL_I: "I",
    SLACK: "NONE",
    "0": "NONE"
  };
  const mapped = map[normalized] ?? normalized;
  return (DCDC_CONVERTER_CONTROL_TYPES as readonly string[]).includes(mapped) ? mapped : text;
}

export type EndpointConverterControlTypePair = {
  i_control_type: string;
  j_control_type: string;
};

const ACAC_LEGACY_CONTROL_TYPE_PAIRS: Record<string, EndpointConverterControlTypePair> = {
  PQQ: { i_control_type: "PQ", j_control_type: "PQ" },
  PVQ: { i_control_type: "PV", j_control_type: "PQ" },
  PQV: { i_control_type: "PQ", j_control_type: "PV" },
  PVV: { i_control_type: "PV", j_control_type: "PV" }
};

export function normalizeAcacEndpointControlTypeForE(value?: string, fallback = "PQ") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const normalized = normalizeControlTypeForE(text).toUpperCase();
  const mapped = normalized === "Q"
    ? "PQ"
    : normalized === "V"
      ? "PV"
      : normalized === "0"
        ? "NONE"
        : normalized;
  return (ACAC_SIDE_CONTROL_TYPES as readonly string[]).includes(mapped) ? mapped : text;
}

export function acacConverterControlTypePairForE(params: Record<string, string>): EndpointConverterControlTypePair {
  const explicitI = deviceParamValue(params, "i_control_type");
  const explicitJ = deviceParamValue(params, "j_control_type");
  const legacyControlType = normalizeControlTypeForE(deviceParamValue(params, "control_type")).toUpperCase();
  const legacyPair = ACAC_LEGACY_CONTROL_TYPE_PAIRS[legacyControlType];
  return {
    i_control_type: explicitI
      ? normalizeAcacEndpointControlTypeForE(explicitI)
      : legacyPair?.i_control_type ?? normalizeAcacEndpointControlTypeForE(deviceParamValue(params, "source_control_type")),
    j_control_type: explicitJ
      ? normalizeAcacEndpointControlTypeForE(explicitJ)
      : legacyPair?.j_control_type ?? normalizeAcacEndpointControlTypeForE(deviceParamValue(params, "target_control_type"))
  };
}

export function dcdcConverterControlTypePairForE(params: Record<string, string>): EndpointConverterControlTypePair {
  const explicitI = deviceParamValue(params, "i_control_type");
  const explicitJ = deviceParamValue(params, "j_control_type");
  const legacyControlType = deviceParamValue(params, "control_type");
  return {
    i_control_type: explicitI
      ? normalizeDcdcEndpointControlTypeForE(explicitI)
      : legacyControlType
        ? normalizeDcdcEndpointControlTypeForE(legacyControlType)
        : deviceParamValue(params, "source_control_type")
          ? normalizeDcdcEndpointControlTypeForE(deviceParamValue(params, "source_control_type"))
          : "P",
    j_control_type: explicitJ
      ? normalizeDcdcEndpointControlTypeForE(explicitJ)
      : normalizeDcdcEndpointControlTypeForE(deviceParamValue(params, "target_control_type"))
  };
}

export type DcacConverterControlTypePair = {
  ac_control_type: string;
  dc_control_type: string;
};

export function normalizeDcacAcControlTypeForE(value?: string, fallback = "PQ") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const normalized = normalizeControlTypeForE(text).toUpperCase();
  const mapped = normalized === "Q" ? "PQ" : normalized === "V" ? "PV" : normalized === "0" ? "NONE" : normalized;
  return (DCAC_AC_CONTROL_TYPES as readonly string[]).includes(mapped) ? mapped : text;
}

export function normalizeDcacDcControlTypeForE(value?: string, fallback = "V") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const normalized = normalizeControlTypeForE(text).toUpperCase();
  const mapped = ({ CTRL_P: "P", CTRL_V: "V", CTRL_I: "I", SLACK: "NONE", "0": "NONE" } as Record<string, string>)[normalized] ?? normalized;
  return (DCAC_DC_CONTROL_TYPES as readonly string[]).includes(mapped) ? mapped : text;
}

export function dcacConverterControlTypePairForE(params: Record<string, string>): DcacConverterControlTypePair {
  return {
    ac_control_type: normalizeDcacAcControlTypeForE(params.ac_control_type),
    dc_control_type: normalizeDcacDcControlTypeForE(params.dc_control_type)
  };
}

function terminalNodeNumber(node: Pick<ModelNode, "nodeNumber" | "terminals">, index: number) {
  return node.terminals[index]?.nodeNumber ?? (index === 0 ? node.nodeNumber : "") ?? "";
}

export const E_NODE_REFERENCE_COLUMNS = new Set([
  "node",
  "i_node",
  "j_node",
  "ind",
  "znd",
  "nd",
  "ac_node",
  "dc_node",
  "node1",
  "node2",
  "node3",
  "node4",
  "t1_node",
  "t2_node",
  "t3_node",
  "neutral_node"
]);

export function numericNodeReference(value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (/^\d+$/.test(normalized)) {
    return normalized;
  }
  return /^N(\d+)$/i.exec(normalized)?.[1] ?? "";
}

export function topologyNodeNumberForEField(
  node: Pick<ModelNode, "nodeNumber" | "terminals">,
  key: string
): string {
  if (key === "ac_node") {
    return numericNodeReference(node.terminals.find((terminal) => terminal.type === "ac")?.nodeNumber);
  }
  if (key === "dc_node") {
    return numericNodeReference(node.terminals.find((terminal) => terminal.type === "dc")?.nodeNumber);
  }
  const numberedNodeMatch = /^node([1-4])$/.exec(key);
  const transformerNodeMatch = /^t([123])_node$/.exec(key);
  const terminalIndex = key === "node" || key === "i_node" || key === "ind" || key === "nd"
    ? 0
    : key === "j_node" || key === "znd"
      ? 1
      : key === "neutral_node"
        ? 3
        : numberedNodeMatch
          ? Number.parseInt(numberedNodeMatch[1], 10) - 1
          : transformerNodeMatch
            ? Number.parseInt(transformerNodeMatch[1], 10) - 1
            : -1;
  return terminalIndex >= 0 ? numericNodeReference(terminalNodeNumber(node, terminalIndex)) : "";
}

export function mappedLegacyEValue(key: string, params: Record<string, string>) {
  if (key === "rated_capacity" || key === "rated_power") {
    return deviceParamValue(params, "rated_capacity") ?? deviceParamValue(params, "rated_power") ?? "";
  }
  const legacyCurrentKey = ({
    i_max: "max_current",
    high_i_max: "high_max_current",
    medium_i_max: "medium_max_current",
    low_i_max: "low_max_current"
  } as Record<string, string>)[key];
  if (legacyCurrentKey) {
    return deviceParamValue(params, key) ?? deviceParamValue(params, legacyCurrentKey) ?? "";
  }
  if (key === "pbase") return params.pbase ?? deviceParamValue(params, "rated_active_power") ?? "";
  if (key === "qbase") return params.qbase ?? deviceParamValue(params, "rated_reactive_power") ?? "";
  if (key === "r") return params.r ?? deviceParamValue(params, "resistance_pu") ?? "";
  if (key === "x") return params.x ?? deviceParamValue(params, "reactance_pu") ?? "";
  if (key === "b") return params.b ?? deviceParamValue(params, "half_charging_susceptance_pu") ?? "";
  if (key === "gt") return params.gt ?? deviceParamValue(params, "magnetizing_conductance_pu") ?? "";
  if (key === "bt") return params.bt ?? deviceParamValue(params, "magnetizing_susceptance_pu") ?? "";
  if (key === "tap") return params.tap ?? deviceParamValue(params, "tap_ratio") ?? "";
  if (key === "r1") return params.r1 ?? deviceParamValue(params, "source_equivalent_resistance") ?? "";
  if (key === "r2") return params.r2 ?? deviceParamValue(params, "target_equivalent_resistance") ?? "";
  return deviceParamValue(params, key) ?? "";
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
  | "same-device-same-bus-endpoints"
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
  | "device-enum-invalid"
  | "device-limit-invalid"
  | "device-setpoint-out-of-range"
  | "hydrogen-storage-parameter-invalid"
  | "hydrogen-coupling-parameter-invalid"
  | "voltage-limit-out-of-range"
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
    error.type === "transformer-island-short" ||
    error.type === "device-enum-invalid" ||
    error.type === "device-setpoint-out-of-range" ||
    error.type === "hydrogen-storage-parameter-invalid" ||
    error.type === "hydrogen-coupling-parameter-invalid"
  );
}

const readonlyIntegerDefinition = (cnName: string, enName: string, typicalValue = ""): DeviceParameterDefinition => ({
  cnName,
  enName,
  valueType: "integer",
  typicalValue,
  readonly: true
});

export const twoWindingTransformerParameterDefinitions: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: false },
  { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false },
  { cnName: "高压侧电压等级", enName: "highVbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧电压等级", enName: "lowVbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "额定容量", enName: "ratedCapacity", valueType: "float", typicalValue: "50", readonly: false },
  { cnName: "高压侧最大电流", enName: "highIMax", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧最大电流", enName: "lowIMax", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "相移（度）", enName: "shift", valueType: "float", typicalValue: "0", readonly: false }
];

const RETIRED_TWO_WINDING_TRANSFORMER_PARAMETER_NAMES = new Set([
  "t1_node",
  "t2_node",
  "resistance_pu",
  "reactance_pu",
  "magnetizing_conductance_pu",
  "magnetizing_susceptance_pu",
  "tap_ratio"
]);

export function isRetiredTwoWindingTransformerParameterName(name: string): boolean {
  return RETIRED_TWO_WINDING_TRANSFORMER_PARAMETER_NAMES.has(toSnakeCaseDeviceParamName(name));
}

export const threeWindingTransformerParameterDefinitions: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: false },
  { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false },
  readonlyIntegerDefinition("高压侧节点号", "t1_node"),
  readonlyIntegerDefinition("中压侧节点号", "t2_node"),
  readonlyIntegerDefinition("低压侧节点号", "t3_node"),
  readonlyIntegerDefinition("中性点节点号", "neutral_node"),
  { cnName: "高压侧电压等级", enName: "highVbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "高压侧额定容量", enName: "highRatedCapacity", valueType: "float", typicalValue: "90", readonly: false },
  { cnName: "高压侧最大电流", enName: "highIMax", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "中压侧电压等级", enName: "mediumVbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "中压侧额定容量", enName: "mediumRatedCapacity", valueType: "float", typicalValue: "90", readonly: false },
  { cnName: "中压侧最大电流", enName: "mediumIMax", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧电压等级", enName: "lowVbase", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "低压侧额定容量", enName: "lowRatedCapacity", valueType: "float", typicalValue: "90", readonly: false },
  { cnName: "低压侧最大电流", enName: "lowIMax", valueType: "float", typicalValue: "0", readonly: false }
];

const THREE_WINDING_TRANSFORMER_E_DEFAULT_PARAMS = {
  r1: "0.0",
  x1: "0.1",
  gt1: "0.0",
  bt1: "0.0",
  tap1: "1.0",
  shift1: "0",
  r2: "0.0",
  x2: "0.1",
  gt2: "0.0",
  bt2: "0.0",
  tap2: "1.0",
  shift2: "0",
  r3: "0.0",
  x3: "0.1",
  gt3: "0.0",
  bt3: "0.0",
  tap3: "1.0",
  shift3: "0"
} as const;

const THREE_WINDING_TRANSFORMER_PARAMETER_ALIASES = [
  ["r1", ["high_resistance_pu", "highResistancePu"]],
  ["x1", ["high_reactance_pu", "highReactancePu"]],
  ["gt1", ["high_magnetizing_conductance_pu", "highMagnetizingConductancePu"]],
  ["bt1", ["high_magnetizing_susceptance_pu", "highMagnetizingSusceptancePu"]],
  ["tap1", ["high_tap_ratio", "highTapRatio"]],
  ["shift1", ["high_shift", "highShift"]],
  ["r2", ["medium_resistance_pu", "mediumResistancePu"]],
  ["x2", ["medium_reactance_pu", "mediumReactancePu"]],
  ["gt2", ["medium_magnetizing_conductance_pu", "mediumMagnetizingConductancePu"]],
  ["bt2", ["medium_magnetizing_susceptance_pu", "mediumMagnetizingSusceptancePu"]],
  ["tap2", ["medium_tap_ratio", "mediumTapRatio"]],
  ["shift2", ["medium_shift", "mediumShift"]],
  ["r3", ["low_resistance_pu", "lowResistancePu"]],
  ["x3", ["low_reactance_pu", "lowReactancePu"]],
  ["gt3", ["low_magnetizing_conductance_pu", "lowMagnetizingConductancePu"]],
  ["bt3", ["low_magnetizing_susceptance_pu", "lowMagnetizingSusceptancePu"]],
  ["tap3", ["low_tap_ratio", "lowTapRatio"]],
  ["shift3", ["low_shift", "lowShift"]]
] as const;

const RETIRED_THREE_WINDING_TRANSFORMER_PARAMETER_NAMES = new Set(
  THREE_WINDING_TRANSFORMER_PARAMETER_ALIASES.flatMap(([, aliases]) =>
    aliases.map((alias) => toSnakeCaseDeviceParamName(alias))
  )
);

export function isRetiredThreeWindingTransformerParameterName(name: string): boolean {
  return RETIRED_THREE_WINDING_TRANSFORMER_PARAMETER_NAMES.has(toSnakeCaseDeviceParamName(name));
}

function isStaticButtonComponentParams(params?: Record<string, string>): boolean {
  return staticComponentLibraryFromParams(params) === "StaticButton";
}

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

function withStaticButtonCapability(kind: DeviceKind, params: Record<string, string>): Record<string, string> {
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

type ElectricGenerationTerminalType = (typeof ELECTRIC_GENERATION_TERMINAL_TYPES)[number];
type ElectricGenerationFamilyKindSuffix = (typeof ELECTRIC_GENERATION_FAMILY_KIND_SUFFIXES)[number];
type ElectricGenerationParameterDefinitionSpec = Omit<DeviceParameterDefinition, "typicalValue">;

type ElectricGenerationFamilySpec = {
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
      electricGenerationFloatDefinition("荷电状态", "stateOfCharge"),
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
      stateOfCharge: "0.5",
      socUpperLimit: "0.9",
      socLowerLimit: "0.1"
    },
    defaultsByTerminalType: {
      ac: { ratedVoltage: "10 kV", ratedPower: "5 MW" },
      dc: { ratedVoltage: "750 V", ratedPower: "5 MW" }
    }
  }
];

const RETIRED_ELECTRIC_GENERATION_PARAMETER_NAMES_BY_KIND_SUFFIX: Readonly<Record<string, readonly string[]>> = {
  "wind-source": ["wind_turbine_count", "unit_rated_power"],
  "pv-source": ["pv_module_count", "module_rated_power"],
  "diesel-source": ["diesel_unit_count", "unit_rated_power"],
  "hydro-source": ["turbine_count", "unit_rated_power"],
  "nuclear-source": ["reactor_count", "unit_rated_power"]
};

export type ElectricGenerationDerivedComponentLibraryInfo = {
  kind: string;
  componentLibrary: string;
  derivedComponentLibrary: string;
  label: string;
  categoryLibrary: string;
  terminalType: ElectricGenerationTerminalType;
  baseComponentLibrary: "ACGenerator" | "DCGenerator";
  isContainer: false;
};

export function electricGenerationDerivedInfoForFamily(
  terminalType: ElectricGenerationTerminalType,
  family: ElectricGenerationFamilySpec
): ElectricGenerationDerivedComponentLibraryInfo {
  const terminalPrefix = terminalType === "ac" ? "交流" : "直流";
  const baseComponentLibrary = terminalType === "ac" ? "ACGenerator" : "DCGenerator";
  return {
    kind: `${terminalType}-${family.kindSuffix}`,
    componentLibrary: baseComponentLibrary,
    derivedComponentLibrary: `${terminalType.toUpperCase()}${family.derivedComponentSuffix}`,
    label: `${terminalPrefix}${family.label}`,
    categoryLibrary: `${terminalPrefix}设备`,
    terminalType,
    baseComponentLibrary,
    isContainer: false
  };
}

export function electricGenerationDerivedComponentLibraryInfo(kind: string): ElectricGenerationDerivedComponentLibraryInfo | null {
  const normalizedKind = baseDeviceKind(kind);
  for (const family of ELECTRIC_GENERATION_FAMILY_SPECS) {
    for (const terminalType of ELECTRIC_GENERATION_TERMINAL_TYPES) {
      const info = electricGenerationDerivedInfoForFamily(terminalType, family);
      if (info.kind === normalizedKind) {
        return info;
      }
    }
  }
  return null;
}

export type TemplateDerivedComponentLibraryInfo = {
  kind: string;
  componentLibrary: string;
  derivedComponentLibrary: string;
  label: string;
  categoryLibrary: string;
  baseComponentLibrary: string;
  isContainer: false;
};

function derivedComponentLibraryFlagIsYes(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "是";
}

function derivedComponentLibraryFlagIsNo(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no" || normalized === "否";
}

export function templateDerivedComponentLibraryInfo(
  template: Pick<DeviceTemplate, "kind" | "params"> &
    Partial<Pick<DeviceTemplate, "categoryLibrary" | "derivedFromComponentLibrary" | "derivedComponentLibrary" | "derivedComponentLibraryLabel" | "isDerivedComponentLibrary">>
): TemplateDerivedComponentLibraryInfo | null {
  const params = template.params ?? {};
  if (
    template.isDerivedComponentLibrary === false ||
    derivedComponentLibraryFlagIsNo(params.is_derived_component_library) ||
    derivedComponentLibraryFlagIsNo((params as { isDerivedComponentLibrary?: string }).isDerivedComponentLibrary)
  ) {
    return null;
  }
  const builtInInfo = electricGenerationDerivedComponentLibraryInfo(template.kind);
  if (builtInInfo) {
    return builtInInfo;
  }
  const rawComponentLibrary = String(params.component_type ?? params.componentLibrary ?? (params as { componentType?: string }).componentType ?? "").trim();
  const baseComponentLibrary = String(
    template.derivedFromComponentLibrary ??
    params.derived_from_component_type ??
    (params as { derivedFromComponentLibrary?: string }).derivedFromComponentLibrary ??
    ""
  ).trim();
  const explicitDerivedComponentLibrary = String(
    template.derivedComponentLibrary ??
    params.derived_component_type ??
    (params as { derivedComponentLibrary?: string }).derivedComponentLibrary ??
    ""
  ).trim();
  const componentLibrary = baseComponentLibrary || rawComponentLibrary;
  const derivedComponentLibrary = explicitDerivedComponentLibrary ||
    (baseComponentLibrary && rawComponentLibrary && rawComponentLibrary.toLowerCase() !== baseComponentLibrary.toLowerCase()
      ? rawComponentLibrary
      : "");
  const derived = template.isDerivedComponentLibrary === true ||
    derivedComponentLibraryFlagIsYes(params.is_derived_component_library) ||
    derivedComponentLibraryFlagIsYes((params as { isDerivedComponentLibrary?: string }).isDerivedComponentLibrary) ||
    Boolean(baseComponentLibrary && derivedComponentLibrary);
  if (!derived || !componentLibrary || !baseComponentLibrary || !derivedComponentLibrary) {
    return null;
  }
  const label = String(
    template.derivedComponentLibraryLabel ??
    params.derived_component_library_label ??
    (params as { derivedComponentLibraryLabel?: string }).derivedComponentLibraryLabel ??
    ""
  ).trim();
  return {
    kind: template.kind,
    componentLibrary,
    derivedComponentLibrary,
    label,
    categoryLibrary: String(template.categoryLibrary ?? "").trim(),
    baseComponentLibrary,
    isContainer: false
  };
}

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
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false },
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

// 元件库标签映射
export const ELEMENT_TREE_COMPONENT_LIBRARY_LABELS: Record<string, string> = {
  StaticTextSymbol: "静态文本",
  StaticMediaSymbol: "静态媒体",
  StaticBasicShape: "基础图形",
  StaticFlowNode: "流程节点",
  StaticButton: "按钮图元",
  StaticContainerSymbol: "容器图元",
  StaticConnectorSymbol: "连接图元",
  StaticAnnotationSymbol: "标注图元",
  ACRealBs: "交流母线",
  DCRealBs: "直流母线",
  ACNode: "交流节点",
  DCNode: "直流节点",
  ACBranch: "交流支路",
  DCBranch: "直流支路",
  ACLoad: "交流负荷",
  DCLoad: "直流负荷",
  ACGenerator: "交流电源",
  DCGenerator: "直流电源",
  ACCompensator: "并联无功补偿装置",
  ACSeriCompensator: "串联无功补偿装置",
  ACShuntCompensator: "并联无功补偿装置（旧格式）",
  ACZeroBranch: "交流零阻支路",
  DCZeroBranch: "直流零阻支路",
  ACSwitch: "交流开关",
  DCSwitch: "直流开关",
  ACBreak: "交流断路器",
  DCBreak: "直流断路器",
  GroundDisconnector: "接地刀闸",
  ACTransformer: "双绕组变压器",
  ACTransWinding: "变压器绕组",
  ACTransfomer3: "三绕组变压器",
  DCDCConverter: "直流变换器",
  DCACConverter: "交直流变换器",
  ACACConverter: "交流变换器",
  HydroNode: "氢节点",
  HydroSource: "氢源",
  HydroLoad: "氢负荷",
  HydroPipe: "输氢管道",
  HydroCompressor: "氢压缩机",
  HydroPressRegulator: "氢调压器",
  HydroStopValve: "氢截止阀",
  HydroBus: "氢母线",
  HeatNode: "热节点",
  HeatSource: "热源",
  HeatLoad: "热负荷",
  HeatPipe: "热管道",
  HeatExchanger: "换热器",
  HeatPump: "热泵",
  HeatBus: "热母线"
};

// 派生元件库标签从内置图元定义动态生成
for (const family of ELECTRIC_GENERATION_FAMILY_SPECS) {
  for (const terminalType of ELECTRIC_GENERATION_TERMINAL_TYPES) {
    const info = electricGenerationDerivedInfoForFamily(terminalType, family);
    ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[info.derivedComponentLibrary] = info.label;
  }
}

// 反向映射表
export const COMPONENT_LIBRARY_REVERSE_MAPPING: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(ELEMENT_TREE_COMPONENT_LIBRARY_LABELS).map(([en, cn]) => [cn, en])
  ),
  "交流线路": "ACBranch",
  "双绕组主变+三绕组主变": "ACTransformer",
  "ACNode+交流母线": "ACNode"
};

const HYDROGEN_TANK_PARAMETER_DEFINITIONS: DeviceParameterDefinition[] = [
  readonlyIntegerDefinition("序号", "idx"),
  { cnName: "名称", enName: "name", valueType: "string", typicalValue: "", readonly: true },
  readonlyIntegerDefinition("氢节点号", "node"),
  {
    cnName: "控制模式",
    enName: "control_type",
    valueType: "stringEnum",
    typicalValue: "PRESSURE",
    enumValues: [...HYDROGEN_ENDPOINT_CONTROL_TYPES],
    enumOptions: [
      { value: "FLOW", label: "定流量" },
      { value: "PRESSURE", label: "定压力" }
    ],
    readonly: false
  },
  { cnName: "压力设定值(MPa)", enName: "pressure_set", valueType: "float", typicalValue: "1", readonly: false },
  { cnName: "流量设定值(Nm3/h)", enName: "flow_set", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "压力平衡系数", enName: "alpha", valueType: "float", typicalValue: "1", readonly: false },
  { cnName: "流量下限(Nm3/h)", enName: "flow_min", valueType: "float", typicalValue: "-10", readonly: false },
  { cnName: "流量上限(Nm3/h)", enName: "flow_max", valueType: "float", typicalValue: "10", readonly: false },
  { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false },
  {
    cnName: "储气压(MPa)",
    enName: "pressure",
    valueType: "float",
    typicalValue: "1",
    readonly: false,
    exportEnabled: true,
    exportName: "pressure"
  },
  { cnName: "额定储气量(Nm3)", enName: "capacity", valueType: "float", typicalValue: "1000", readonly: false },
  { cnName: "水容积(m3)", enName: "water_volume", valueType: "float", typicalValue: "50", readonly: false },
  { cnName: "初始SOC", enName: "initial_soc", valueType: "float", typicalValue: "0.5", readonly: false },
  { cnName: "压力上限(MPa)", enName: "pressure_max", valueType: "float", typicalValue: "45", readonly: false },
  { cnName: "压力下限(MPa)", enName: "pressure_min", valueType: "float", typicalValue: "0.1", readonly: false },
  { cnName: "流量(Nm3/h)", enName: "flow", valueType: "float", typicalValue: "0", readonly: false },
  { cnName: "储气量(Nm3)", enName: "gas_quantity", valueType: "float", typicalValue: "500", readonly: false },
  { cnName: "soc", enName: "soc", valueType: "float", typicalValue: "0.5", readonly: false }
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
    { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false }
  ];
}

const HYDROGEN_SOURCE_DEFAULTS: HydrogenEndpointDefaults = {
  ratedCapacity: "1000",
  pressure: "20",
  pressureMax: "25",
  pressureMin: "1",
  flow: "1000",
  flowMax: "1000",
  flowMin: "0"
};

const HYDROGEN_LOAD_DEFAULTS: HydrogenEndpointDefaults = {
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

const BASE_DEVICE_LIBRARY: DeviceTemplate[] = [
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
      vMin: "0.9"
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
      { cnName: "无功下限", enName: "qMin", valueType: "float", typicalValue: "0", readonly: false }
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
      capacity: "1000",
      water_volume: "50",
      initial_soc: "0.5",
      pressure_max: "45",
      pressure_min: "0.1",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5"
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
      capacity: "1000",
      water_volume: "50",
      initial_soc: "0.5",
      pressure_max: "45",
      pressure_min: "0.1",
      storageType: "horizontal",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5"
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
      capacity: "1000",
      water_volume: "50",
      initial_soc: "0.5",
      pressure_max: "45",
      pressure_min: "0.1",
      storageType: "container",
      flow: "0",
      gas_quantity: "500",
      soc: "0.5"
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
    params: { capacity: "100 MWh", temperature: "90 degC" },
    terminalType: "heat",
    terminalCount: 0
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
    params: { ratedCapacity: "0", iMax: "0", r: "0.1", x: "1.0", b: "0.0" },
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
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false }
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
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false }
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
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false }
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
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false }
    ]
  },
  {
    kind: "ac-routable-line",
    label: "交流线路（自适应）",
    categoryLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { ratedCapacity: "0", iMax: "0", r: "0.1", x: "1.0", b: "0.0", component_type: "ACBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-zero-branch",
    label: "交流零阻抗支路",
    categoryLibrary: "交流设备",
    size: { width: 108, height: 36 },
    params: {},
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-zero-routable-branch",
    label: "交流零阻抗支路（自适应）",
    categoryLibrary: "交流设备",
    size: { width: 150, height: 36 },
    params: { component_type: "ACZeroBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-bus",
    label: "交流母线",
    categoryLibrary: "交流设备",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "10 kV", vMax: "1.1", vMin: "0.9", section: "I段" },
    terminalType: "ac",
    terminalCount: 0
  },
  {
    kind: "ac-switch",
    label: "交流开关",
    categoryLibrary: "交流设备",
    size: { width: 72, height: 48 },
    params: { status: "1", ratedCapacity: "0", iMax: "1250 A" },
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
    params: { ratedCapacity: "0", iMax: "1250 A" },
    terminalType: "ac",
    terminalCount: 2
  },
  {
    kind: "ac-box-breaker",
    label: "盒型开关",
    categoryLibrary: "交流设备",
    size: { width: 86, height: 44 },
    params: { status: "1", ratedCapacity: "0", iMax: "1250 A" },
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
      pMax: "5 MW",
      pMin: "0",
      qMax: "1.2 Mvar",
      qMin: "0",
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
      pMax: "5 MW",
      pMin: "0",
      qMax: "1.2 Mvar",
      qMin: "0",
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
      highIMax: "0",
      lowIMax: "0",
      voltageRatio: "110/10 kV",
      impedance: "10.5%",
      r: "0.0",
      x: "0.1",
      gt: "0.0",
      bt: "0.0",
      tap: "1.0"
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
      highIMax: "0",
      mediumIMax: "0",
      lowIMax: "0",
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
    params: { ratedCapacity: "0", iMax: "0", r: "1.0" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-routable-line",
    label: "直流线路（自适应）",
    categoryLibrary: "直流设备",
    size: { width: 150, height: 36 },
    params: { ratedCapacity: "0", iMax: "0", r: "1.0", component_type: "DCBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-zero-branch",
    label: "直流零阻抗支路",
    categoryLibrary: "直流设备",
    size: { width: 108, height: 36 },
    params: {},
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-zero-routable-branch",
    label: "直流零阻抗支路（自适应）",
    categoryLibrary: "直流设备",
    size: { width: 150, height: 36 },
    params: { component_type: "DCZeroBranch", lineWidth: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH) },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-bus",
    label: "直流母线",
    categoryLibrary: "直流设备",
    size: { width: 120, height: 28 },
    params: { voltageLevel: "750 V", vMax: "1.1", vMin: "0.9", pole: "正负极" },
    terminalType: "dc",
    terminalCount: 0
  },
  {
    kind: "dc-switch",
    label: "直流开关",
    categoryLibrary: "直流设备",
    size: { width: 72, height: 48 },
    params: { status: "1", ratedCapacity: "0", iMax: "1600 A" },
    terminalType: "dc",
    terminalCount: 2
  },
  {
    kind: "dc-breaker",
    label: "直流断路器",
    categoryLibrary: "直流设备",
    size: { width: 78, height: 50 },
    params: { ratedCapacity: "0", iMax: "1600 A" },
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

const VERTICAL_BUS_TEMPLATE_KINDS = new Set<string>(["ac-bus", "dc-bus", "hydrogen-bus", "heat-bus"]);

function shouldCreateVerticalDeviceTemplate(template: DeviceTemplate): boolean {
  if (template.kind.endsWith(GENERATED_VERTICAL_KIND_SUFFIX)) {
    return false;
  }
  if (isRoutableLineDeviceKind(template.kind)) {
    return false;
  }
  return VERTICAL_BUS_TEMPLATE_KINDS.has(template.kind) || template.terminalCount === 2;
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

const DEFAULT_DEVICE_LONGEST_SIDE = 150;
export const DEFAULT_DEVICE_LABEL_FONT_SIZE = 14;
const DEFAULT_DEVICE_LABEL_GAP = 18;

function roundDefaultDeviceSize(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

export function normalizeDefaultDeviceSize(kind: string, size: DeviceTemplate["size"]): DeviceTemplate["size"] {
  if (explicitStaticComponentLibraryForKind(kind)) {
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

function normalizeDeviceTemplateDefaultSize(template: DeviceTemplate): DeviceTemplate {
  return {
    ...template,
    size: normalizeDefaultDeviceSize(template.kind, template.size)
  };
}

export function toSnakeCaseDeviceParamName(name: string): string {
  const normalized = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z0-9])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return normalized === "gasquantity" ? "gas_quantity" : normalized;
}

function legacyCamelCaseParamName(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

const TEMPLATE_DEFINITION_VALUE_TYPES: Record<string, DeviceParameterValueType> = {
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
  i_v_max: "float",
  i_v_min: "float",
  j_p_max: "float",
  j_p_min: "float",
  j_q_max: "float",
  j_q_min: "float",
  j_i_max: "float",
  j_v_max: "float",
  j_v_min: "float",
  idx: "integer",
  node: "integer",
  node1: "integer",
  node2: "integer",
  node3: "integer",
  node4: "integer",
  i_node: "integer",
  j_node: "integer",
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
  run_stat: "stringEnum",
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
  i_q_set: "float",
  i_set: "float",
  i_v_set: "float",
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
  state_of_charge: "float",
  supply_temperature: "float",
  supply_temperature_set: "float",
  tap: "float",
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

function semanticParameterValueType(name: string): DeviceParameterValueType | undefined {
  const normalizedName = toSnakeCaseDeviceParamName(name);
  const definedType = TEMPLATE_DEFINITION_VALUE_TYPES[normalizedName];
  if (definedType) {
    return definedType;
  }
  if (/^idx_(?:ac2|dc2|h22|heat2|ac|dc|h2|heat)_(?:unit|load|transformer)_t\d+$/.test(normalizedName)) {
    return "integer";
  }
  return undefined;
}

function normalizeSemanticNumericValue(value: string, valueType: "integer" | "float"): string {
  const token = String(value ?? "").trim().match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)/)?.[0] ?? "";
  if (!token) {
    return "";
  }
  if (valueType === "float") {
    return token.endsWith(".") ? token.slice(0, -1) : token;
  }
  const numericValue = Number(token);
  return Number.isFinite(numericValue) ? String(Math.trunc(numericValue)) : "";
}

function normalizeSemanticParameterValue(name: string, value: string): string {
  const valueType = semanticParameterValueType(name);
  if (valueType !== "integer" && valueType !== "float") {
    return value;
  }
  const normalizedValue = normalizeSemanticNumericValue(value, valueType);
  return normalizedValue || (String(value ?? "").trim() ? value : "");
}

export function normalizeSemanticParameterValues(params: Record<string, string>): Record<string, string> {
  let next = params;
  let changed = false;
  for (const [name, value] of Object.entries(params)) {
    if (name.startsWith("_")) {
      continue;
    }
    const normalizedValue = normalizeSemanticParameterValue(name, value);
    if (normalizedValue === value) {
      continue;
    }
    if (!changed) {
      next = { ...params };
      changed = true;
    }
    next[name] = normalizedValue;
  }
  return next;
}

export function deviceParamValue(params: Record<string, string>, key: string): string | undefined {
  const snakeKey = toSnakeCaseDeviceParamName(key);
  if (snakeKey === "gas_quantity") {
    return params.gas_quantity ?? params.gasQuantity ?? params.gasquantity;
  }
  const camelKey = legacyCamelCaseParamName(snakeKey);
  return params[key] ?? params[snakeKey] ?? params[camelKey];
}

export function normalizeLegacyGasQuantityDeviceParams(params: Record<string, string>): Record<string, string> {
  const hasCamel = Object.prototype.hasOwnProperty.call(params, "gasQuantity");
  const hasLower = Object.prototype.hasOwnProperty.call(params, "gasquantity");
  const storedDefinitions = params[CUSTOM_PARAM_DEFINITIONS_KEY];
  const normalizedDefinitions = storedDefinitions === undefined
    ? storedDefinitions
    : normalizeStoredDeviceParameterDefinitionNames(storedDefinitions, true);
  if (!hasCamel && !hasLower && normalizedDefinitions === storedDefinitions) {
    return params;
  }
  const next = { ...params };
  if (!Object.prototype.hasOwnProperty.call(next, "gas_quantity")) {
    next.gas_quantity = hasCamel ? next.gasQuantity : next.gasquantity;
  }
  delete next.gasQuantity;
  delete next.gasquantity;
  if (normalizedDefinitions !== undefined) {
    next[CUSTOM_PARAM_DEFINITIONS_KEY] = normalizedDefinitions;
  }
  return next;
}

function normalizedDeviceParamKeyPriority(key: string, normalizedKey: string): number {
  if (normalizedKey !== "gas_quantity") {
    return key === normalizedKey ? 1 : 0;
  }
  if (key === "gas_quantity") return 3;
  if (key === "gasQuantity") return 2;
  if (key === "gasquantity") return 1;
  return 0;
}

function normalizeStoredDeviceParameterDefinitionNames(value: string, gasQuantityOnly = false): string {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return value;
    }
    const normalized = parsed.map((definition) => {
      if (!definition || typeof definition !== "object") {
        return definition;
      }
      const source = definition as DeviceParameterDefinition;
      const rawEnName = String(source.enName ?? "").trim();
      const rawExportName = typeof source.exportName === "string" ? source.exportName.trim() : source.exportName;
      const normalizeName = (name: string) => gasQuantityOnly
        ? /^(?:gasQuantity|gasquantity)$/.test(name) ? "gas_quantity" : name
        : toSnakeCaseDeviceParamName(name);
      const enName = normalizeName(rawEnName);
      const exportName = typeof rawExportName === "string" ? normalizeName(rawExportName) : rawExportName;
      if (enName === rawEnName && exportName === rawExportName) {
        return definition;
      }
      return {
        ...source,
        enName,
        ...(source.exportName !== undefined ? { exportName } : {})
      };
    });
    const serialized = JSON.stringify(normalized);
    return serialized === value ? value : serialized;
  } catch {
    return value;
  }
}

export function normalizeDeviceParamRecord(params?: Record<string, string>): Record<string, string> | undefined {
  if (!params) {
    return params;
  }
  const normalized: Record<string, string> = {};
  const priorities = new Map<string, number>();
  for (const [key, value] of Object.entries(params)) {
    const normalizedKey = key.startsWith("_") ? key : toSnakeCaseDeviceParamName(key);
    const priority = normalizedDeviceParamKeyPriority(key, normalizedKey);
    if ((priorities.get(normalizedKey) ?? -1) > priority) {
      continue;
    }
    priorities.set(normalizedKey, priority);
    normalized[normalizedKey] = key === "_customParamDefinitions"
      ? normalizeStoredDeviceParameterDefinitionNames(value, true)
      : key.startsWith("_")
        ? value
        : normalizeSemanticParameterValue(normalizedKey, value);
  }
  return normalized;
}

function normalizeDeviceParameterDefinition(definition: DeviceParameterDefinition): DeviceParameterDefinition {
  const enName = toSnakeCaseDeviceParamName(definition.enName);
  const exportName = definition.exportName ? toSnakeCaseDeviceParamName(definition.exportName) : definition.exportName;
  return {
    ...definition,
    enName,
    exportName
  };
}

function normalizeDeviceTemplateParameterNames(template: DeviceTemplate): DeviceTemplate {
  if (isStaticNode({ kind: template.kind } as ModelNode)) {
    return template;
  }
  return {
    ...template,
    params: normalizeDeviceParamRecord(template.params) ?? template.params,
    parameterDefinitions: template.parameterDefinitions?.map(normalizeDeviceParameterDefinition)
  };
}

function createVerticalDeviceTemplate(template: DeviceTemplate): DeviceTemplate {
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
    stateDefinitions: template.stateDefinitions?.map(cloneDeviceStateDefinition),
    rotation: 90
  };
}

/** 为内置元件统一注入 rdf_id（原始ID，字符串，默认空）参数——平台 E 文件各表均含 rdf_id(RDF_ID) 字段 */
function withRdfIdParameter(template: DeviceTemplate): DeviceTemplate {
  const definitions = template.parameterDefinitions ?? [];
  if (definitions.some((definition) => definition.enName === "rdf_id")) {
    return template;
  }
  return {
    ...template,
    parameterDefinitions: [
      { cnName: "原始ID", enName: "rdf_id", valueType: "string", typicalValue: "", readonly: false },
      ...definitions
    ]
  };
}

const NORMALIZED_BASE_DEVICE_LIBRARY = BASE_DEVICE_LIBRARY
  .map(normalizeDeviceTemplateDefaultSize)
  .map(normalizeDeviceTemplateParameterNames)
  .map(withRdfIdParameter);

export const DEVICE_LIBRARY: DeviceTemplate[] = [
  ...NORMALIZED_BASE_DEVICE_LIBRARY,
  ...NORMALIZED_BASE_DEVICE_LIBRARY.filter(shouldCreateVerticalDeviceTemplate).map(createVerticalDeviceTemplate)
];

/** kind → 模板的 O(1) 查找索引。DEVICE_LIBRARY 为静态内置库，构建后不再变更，故可在模块级缓存。 */
export const DEVICE_LIBRARY_BY_KIND: ReadonlyMap<string, DeviceTemplate> = new Map<string, DeviceTemplate>(
  DEVICE_LIBRARY.map((template) => [template.kind, template])
);

let nodeNumberSeed = 1;
export const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
export const makeNodeNumber = () => `N${nodeNumberSeed++}`;
export const CUSTOM_PARAM_DEFINITIONS_KEY = "_customParamDefinitions";
export const CUSTOM_DEVICE_TEMPLATE_KEY = "_customDeviceTemplate";

function normalizeDcacControlParameterDefinition(
  definition: DeviceParameterDefinition
): DeviceParameterDefinition | null {
  const rawEnName = definition.enName.trim();
  const enName = toSnakeCaseDeviceParamName(definition.enName);
  if (enName === "control_type") {
    return null;
  }
  if ((enName === "ac_control_type" || enName === "dc_control_type") && rawEnName !== enName) {
    return null;
  }
  if (enName !== "ac_control_type" && enName !== "dc_control_type") {
    return definition;
  }
  const options = enName === "ac_control_type" ? [...DCAC_AC_CONTROL_TYPES] : [...DCAC_DC_CONTROL_TYPES];
  const normalizeValue = enName === "ac_control_type" ? normalizeDcacAcControlTypeForE : normalizeDcacDcControlTypeForE;
  const exportName = definition.exportName && toSnakeCaseDeviceParamName(definition.exportName) === "control_type"
    ? enName
    : definition.exportName;
  return {
    ...definition,
    enName,
    valueType: "stringEnum",
    typicalValue: normalizeValue(definition.typicalValue),
    enumValues: options,
    enumOptions: options.map((value) => ({ value })),
    ...(typeof exportName === "string" ? { exportName } : {})
  };
}

function normalizeDcacControlParameterDefinitions(
  definitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  const normalized: DeviceParameterDefinition[] = [];
  const seen = new Set<string>();
  for (const definition of definitions) {
    const nextDefinition = normalizeDcacControlParameterDefinition(definition);
    if (!nextDefinition || seen.has(nextDefinition.enName)) {
      continue;
    }
    seen.add(nextDefinition.enName);
    normalized.push(nextDefinition);
  }
  return normalized;
}

type GeneratorControlSection = "ACGenerator" | "DCGenerator";

function normalizeGeneratorControlParameterDefinitions(
  section: GeneratorControlSection,
  definitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  const options = section === "ACGenerator"
    ? [...AC_GENERATOR_CONTROL_TYPES]
    : [...DC_GENERATOR_CONTROL_TYPES];
  const normalizeValue = section === "ACGenerator"
    ? normalizeAcGeneratorControlTypeForE
    : normalizeDcGeneratorControlTypeForE;
  return definitions.map((definition) => {
    if (toSnakeCaseDeviceParamName(definition.enName) !== "control_type") {
      return definition;
    }
    return {
      ...definition,
      enName: "control_type",
      valueType: "stringEnum",
      typicalValue: normalizeValue(definition.typicalValue),
      enumValues: options,
      enumOptions: options.map((value) => ({ value }))
    };
  });
}

const HYDROGEN_COUPLING_SECTIONS = new Set(["AcE2Hydro", "DcE2Hydro", "Hydro2AcE", "Hydro2DcE"]);

function normalizeHydrogenCouplingControlParameterDefinitions(
  section: string,
  definitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  const options = [...HYDROGEN_COUPLING_CONTROL_TYPES];
  const fallback = section === "AcE2Hydro" || section === "DcE2Hydro" ? "FLOW" : "P";
  return definitions.map((definition) => {
    if (toSnakeCaseDeviceParamName(definition.enName) !== "control_type") {
      return definition;
    }
    const normalizedValue = normalizeControlTypeForE(definition.typicalValue).toUpperCase();
    const typicalValue = options.includes(normalizedValue as (typeof options)[number]) ? normalizedValue : fallback;
    return {
      ...definition,
      enName: "control_type",
      valueType: "stringEnum",
      typicalValue,
      enumValues: options,
      enumOptions: options.map((value) => ({ value }))
    };
  });
}

function normalizeElectricHeatCouplingParameterDefinitions(
  definitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  const options = [...ELECTRIC_HEAT_COUPLING_CONTROL_TYPES];
  return definitions.map((definition) => {
    const name = toSnakeCaseDeviceParamName(definition.enName);
    if (name === "control_type") {
      const normalizedValue = normalizeControlTypeForE(definition.typicalValue).toUpperCase();
      const typicalValue = options.includes(normalizedValue as (typeof options)[number]) ? normalizedValue : "P";
      return {
        ...definition,
        cnName: "控制类型",
        enName: "control_type",
        valueType: "stringEnum",
        typicalValue,
        enumValues: options,
        enumOptions: [
          { value: "P", label: "定电功率" },
          { value: "T", label: "定出口温度" }
        ]
      };
    }
    if (name === "e2h_coeff") {
      return {
        ...definition,
        cnName: "电转热效率(kWh/kWh)",
        enName: "e2h_coeff",
        valueType: "float",
        typicalValue: definition.typicalValue === "1.0"
          ? "1.0"
          : normalizeRatioParameterInputValue("e2h_coeff", definition.typicalValue, "AcE2Heat") ?? "1.0"
      };
    }
    return definition;
  });
}

function normalizeESectionParameterDefinitions(
  section: string,
  definitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  if (section === "DCACConverter") {
    return normalizeDcacControlParameterDefinitions(definitions);
  }
  if (section === "ACACConverter" || section === "DCDCConverter") {
    return normalizeEndpointControlParameterDefinitions(section, definitions);
  }
  if (section === "ACGenerator" || section === "DCGenerator") {
    return normalizeGeneratorControlParameterDefinitions(section, definitions);
  }
  if (HYDROGEN_COUPLING_SECTIONS.has(section)) {
    return normalizeHydrogenCouplingControlParameterDefinitions(section, definitions);
  }
  if (ELECTRIC_HEAT_COUPLING_SECTIONS.has(section)) {
    return normalizeElectricHeatCouplingParameterDefinitions(definitions);
  }
  return [...definitions];
}

function normalizeStoredDcacControlParameterDefinitions(value?: string): string | undefined {
  if (!value) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return value;
    }
    const definitions = parsed.filter(
      (definition): definition is DeviceParameterDefinition => Boolean(definition && typeof definition === "object")
    );
    const normalized = normalizeDcacControlParameterDefinitions(definitions);
    const serialized = JSON.stringify(normalized);
    return serialized === value ? value : serialized;
  } catch {
    return value;
  }
}

function normalizeDcacConverterControlParams(params: Record<string, string>): Record<string, string> {
  const pair = dcacConverterControlTypePairForE(params);
  const nextParams = { ...params };
  let changed = false;
  for (const legacyKey of ["control_type", "controlType", "acControlType", "dcControlType"]) {
    if (Object.prototype.hasOwnProperty.call(nextParams, legacyKey)) {
      delete nextParams[legacyKey];
      changed = true;
    }
  }
  if (nextParams.ac_control_type !== pair.ac_control_type) {
    nextParams.ac_control_type = pair.ac_control_type;
    changed = true;
  }
  if (nextParams.dc_control_type !== pair.dc_control_type) {
    nextParams.dc_control_type = pair.dc_control_type;
    changed = true;
  }
  const storedDefinitions = normalizeStoredDcacControlParameterDefinitions(nextParams[CUSTOM_PARAM_DEFINITIONS_KEY]);
  if (storedDefinitions !== nextParams[CUSTOM_PARAM_DEFINITIONS_KEY]) {
    if (storedDefinitions) {
      nextParams[CUSTOM_PARAM_DEFINITIONS_KEY] = storedDefinitions;
    } else {
      delete nextParams[CUSTOM_PARAM_DEFINITIONS_KEY];
    }
    changed = true;
  }
  return changed ? nextParams : params;
}

export function normalizeDcacConverterNodeControlParams(node: ModelNode): ModelNode {
  if (inferESection(node.kind, node.params) !== "DCACConverter") {
    return node;
  }
  const params = normalizeDcacConverterControlParams(node.params);
  return params === node.params ? node : { ...node, params };
}

type EndpointControlSection = "ACACConverter" | "DCDCConverter";

function endpointControlOptionsForSection(section: EndpointControlSection): readonly string[] {
  return section === "ACACConverter" ? ACAC_SIDE_CONTROL_TYPES : DCDC_CONVERTER_CONTROL_TYPES;
}

function normalizeEndpointControlTypeForSection(
  section: EndpointControlSection,
  value: string | undefined,
  endpoint: "i" | "j"
) {
  if (section === "ACACConverter") {
    return normalizeAcacEndpointControlTypeForE(value);
  }
  if (value) {
    return normalizeDcdcEndpointControlTypeForE(value);
  }
  return endpoint === "i" ? "P" : "NONE";
}

function endpointConverterControlTypePairForSection(
  section: EndpointControlSection,
  params: Record<string, string>
) {
  return section === "ACACConverter"
    ? acacConverterControlTypePairForE(params)
    : dcdcConverterControlTypePairForE(params);
}

function normalizedEndpointControlDefinition(
  section: EndpointControlSection,
  endpoint: "i" | "j",
  source: DeviceParameterDefinition | undefined,
  typicalValue: string | undefined
): DeviceParameterDefinition {
  const enName = `${endpoint}_control_type`;
  const options = [...endpointControlOptionsForSection(section)];
  const normalizedExportName = source?.exportName
    ? toSnakeCaseDeviceParamName(source.exportName)
    : "";
  const exportName = normalizedExportName && ![
    "control_type",
    "source_control_type",
    "target_control_type",
    "i_control_type",
    "j_control_type"
  ].includes(normalizedExportName)
    ? source?.exportName
    : enName;
  return {
    ...(source ?? {}),
    cnName: source?.cnName || (endpoint === "i" ? "首端控制类型" : "末端控制类型"),
    enName,
    valueType: "stringEnum",
    typicalValue: normalizeEndpointControlTypeForSection(section, typicalValue, endpoint),
    enumValues: options,
    enumOptions: options.map((value) => ({ value })),
    ...(source?.exportEnabled !== undefined ? { exportEnabled: source.exportEnabled } : {}),
    ...(exportName ? { exportName } : {})
  };
}

function normalizeEndpointControlParameterDefinitions(
  section: EndpointControlSection,
  definitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  type Candidate = { definition: DeviceParameterDefinition; typicalValue: string | undefined; rank: number };
  let insertionIndex = -1;
  let iCandidate: Candidate | undefined;
  let jCandidate: Candidate | undefined;
  const retained: DeviceParameterDefinition[] = [];
  const assignCandidate = (endpoint: "i" | "j", candidate: Candidate) => {
    if (endpoint === "i") {
      if (!iCandidate || candidate.rank >= iCandidate.rank) iCandidate = candidate;
      return;
    }
    if (!jCandidate || candidate.rank >= jCandidate.rank) jCandidate = candidate;
  };

  for (const definition of definitions) {
    const enName = toSnakeCaseDeviceParamName(definition.enName);
    if (!["control_type", "source_control_type", "target_control_type", "i_control_type", "j_control_type"].includes(enName)) {
      retained.push(definition);
      continue;
    }
    if (insertionIndex < 0) {
      insertionIndex = retained.length;
    }
    if (enName === "i_control_type") {
      assignCandidate("i", { definition, typicalValue: definition.typicalValue, rank: 3 });
      continue;
    }
    if (enName === "j_control_type") {
      assignCandidate("j", { definition, typicalValue: definition.typicalValue, rank: 3 });
      continue;
    }
    if (enName === "control_type") {
      const pair = endpointConverterControlTypePairForSection(section, { control_type: definition.typicalValue });
      assignCandidate("i", { definition, typicalValue: pair.i_control_type, rank: 2 });
      assignCandidate("j", { definition, typicalValue: pair.j_control_type, rank: 2 });
      continue;
    }
    if (enName === "source_control_type") {
      assignCandidate("i", { definition, typicalValue: definition.typicalValue, rank: 1 });
      continue;
    }
    assignCandidate("j", { definition, typicalValue: definition.typicalValue, rank: 1 });
  }

  if (insertionIndex < 0) {
    return retained;
  }
  const fallbackDefinition = iCandidate?.definition ?? jCandidate?.definition;
  const endpointDefinitions = [
    normalizedEndpointControlDefinition(section, "i", iCandidate?.definition ?? fallbackDefinition, iCandidate?.typicalValue),
    normalizedEndpointControlDefinition(section, "j", jCandidate?.definition ?? fallbackDefinition, jCandidate?.typicalValue)
  ];
  retained.splice(insertionIndex, 0, ...endpointDefinitions);
  return retained;
}

function normalizeStoredEndpointControlParameterDefinitions(
  section: EndpointControlSection,
  value?: string
): string | undefined {
  if (!value) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return value;
    }
    const definitions = parsed.filter(
      (definition): definition is DeviceParameterDefinition => Boolean(definition && typeof definition === "object")
    );
    const normalized = normalizeEndpointControlParameterDefinitions(section, definitions);
    const serialized = JSON.stringify(normalized);
    return serialized === value ? value : serialized;
  } catch {
    return value;
  }
}

function normalizeEndpointConverterControlParams(
  section: EndpointControlSection,
  params: Record<string, string>
): Record<string, string> {
  const pair = endpointConverterControlTypePairForSection(section, params);
  const nextParams = { ...params };
  let changed = false;
  for (const legacyKey of [
    "control_type",
    "controlType",
    "source_control_type",
    "sourceControlType",
    "target_control_type",
    "targetControlType",
    "iControlType",
    "jControlType"
  ]) {
    if (Object.prototype.hasOwnProperty.call(nextParams, legacyKey)) {
      delete nextParams[legacyKey];
      changed = true;
    }
  }
  if (nextParams.i_control_type !== pair.i_control_type) {
    nextParams.i_control_type = pair.i_control_type;
    changed = true;
  }
  if (nextParams.j_control_type !== pair.j_control_type) {
    nextParams.j_control_type = pair.j_control_type;
    changed = true;
  }
  const storedDefinitions = normalizeStoredEndpointControlParameterDefinitions(
    section,
    nextParams[CUSTOM_PARAM_DEFINITIONS_KEY]
  );
  if (storedDefinitions !== nextParams[CUSTOM_PARAM_DEFINITIONS_KEY]) {
    if (storedDefinitions) {
      nextParams[CUSTOM_PARAM_DEFINITIONS_KEY] = storedDefinitions;
    } else {
      delete nextParams[CUSTOM_PARAM_DEFINITIONS_KEY];
    }
    changed = true;
  }
  return changed ? nextParams : params;
}

export function normalizeEndpointConverterNodeControlParams(node: ModelNode): ModelNode {
  const section = inferESection(node.kind, node.params);
  if (section !== "ACACConverter" && section !== "DCDCConverter") {
    return node;
  }
  const params = normalizeEndpointConverterControlParams(section, node.params);
  return params === node.params ? node : { ...node, params };
}

function normalizeStoredElectricGenerationRatedDefinitions(value?: string): string | undefined {
  if (!value) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return value;
    }
    const definitions = parsed.filter(
      (definition): definition is DeviceParameterDefinition => Boolean(definition && typeof definition === "object")
    );
    const hasRatedCapacity = definitions.some(
      (definition) => toSnakeCaseDeviceParamName(String(definition.enName ?? "")) === "rated_capacity"
    );
    const normalized: DeviceParameterDefinition[] = [];
    const seen = new Set<string>();
    for (const definition of definitions) {
      const normalizedName = toSnakeCaseDeviceParamName(String(definition.enName ?? ""));
      if (normalizedName === "rated_power" && hasRatedCapacity) {
        continue;
      }
      let nextDefinition = definition;
      if (normalizedName === "rated_power" || normalizedName === "rated_capacity") {
        const exportName = String(definition.exportName ?? "").trim();
        nextDefinition = {
          ...definition,
          cnName: definition.cnName === "额定功率" ? "额定容量" : definition.cnName,
          enName: "rated_capacity",
          ...(exportName && toSnakeCaseDeviceParamName(exportName) === "rated_power"
            ? { exportName: "rated_capacity" }
            : {})
        };
      } else if (normalizedName === "rated_voltage") {
        nextDefinition = { ...definition, enName: "rated_voltage" };
      }
      if (seen.has(nextDefinition.enName)) {
        continue;
      }
      seen.add(nextDefinition.enName);
      normalized.push(nextDefinition);
    }
    const serialized = JSON.stringify(normalized);
    return serialized === value ? value : serialized;
  } catch {
    return value;
  }
}

export function normalizeElectricGenerationRatedParams(node: ModelNode, template?: DeviceTemplate): ModelNode {
  const section = inferESection(node.kind, node.params);
  if (section !== "ACGenerator" && section !== "DCGenerator") {
    return node;
  }
  const templateParams = template?.params ?? {};
  const ratedCapacity = deviceParamValue(node.params, "rated_capacity") ??
    deviceParamValue(node.params, "rated_power") ??
    deviceParamValue(templateParams, "rated_capacity") ??
    deviceParamValue(templateParams, "rated_power") ??
    "10 MW";
  const ratedVoltage = deviceParamValue(node.params, "rated_voltage") ??
    deviceParamValue(templateParams, "rated_voltage") ??
    (section === "ACGenerator" ? "10 kV" : "750 V");
  const nextParams = { ...node.params };
  let changed = false;
  for (const key of Object.keys(nextParams)) {
    if (key.startsWith("_")) {
      continue;
    }
    const normalizedName = toSnakeCaseDeviceParamName(key);
    if (
      normalizedName === "rated_power" ||
      (normalizedName === "rated_capacity" && key !== "rated_capacity") ||
      (normalizedName === "rated_voltage" && key !== "rated_voltage")
    ) {
      delete nextParams[key];
      changed = true;
    }
  }
  if (nextParams.rated_capacity !== ratedCapacity) {
    nextParams.rated_capacity = ratedCapacity;
    changed = true;
  }
  if (nextParams.rated_voltage !== ratedVoltage) {
    nextParams.rated_voltage = ratedVoltage;
    changed = true;
  }
  const storedDefinitions = normalizeStoredElectricGenerationRatedDefinitions(nextParams[CUSTOM_PARAM_DEFINITIONS_KEY]);
  if (storedDefinitions !== nextParams[CUSTOM_PARAM_DEFINITIONS_KEY]) {
    if (storedDefinitions) {
      nextParams[CUSTOM_PARAM_DEFINITIONS_KEY] = storedDefinitions;
    } else {
      delete nextParams[CUSTOM_PARAM_DEFINITIONS_KEY];
    }
    changed = true;
  }
  return changed ? { ...node, params: nextParams } : node;
}

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

const terminalTypeLabel = (type: TerminalType) => TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type;

const terminalPortLabel = (type: TerminalType) => {
  return terminalTypeLabel(type);
};

export const terminalLabelForType = (type: TerminalType, index: number) => `${terminalTypeLabel(type)}端${index + 1}`;

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

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function viewRow(key: string, label: string, value: string, readonly = true, paramKey?: string): ContainerDeviceParameterViewRow {
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
  if (column === "supply_temperature_set") {
    return node.params[paramKey]
      ?? deviceParamValue(node.params, "supply_temperature_set")
      ?? deviceParamValue(node.params, "supply_temperature")
      ?? defaultContainerAssociatedColumnValue(section, column);
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
    categoryLibrary: "",
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
    const componentLibrary = containerRelationCounterKey(first.relationKey) || first.roleLabel;
    const label = fallbackTemplate.isContainer && isElectricGenerationContainerKind(fallbackTemplate.kind)
      ? `端${sourceTerminalIndex + 1}（${first.roleLabel}）`
      : `${sourceTerminal?.label ?? first.terminalLabel}${first.roleLabel}`;
    const sectionColumns = E_SECTION_COLUMNS[componentLibrary] ?? [];
    const rows = sectionColumns.length > 0
      ? associatedDeviceRows(node, first.relationKey, componentLibrary, terminals)
      : [
          viewRow("idx", "idx", relationIdx),
          viewRow("name", "name", first.relationKey ? containerAssociatedDeviceName(node, first.relationKey) : `${node.name}_${label}`),
          viewRow("device_model", "device_model", componentLibrary),
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
      componentLibrary,
      relationKeys,
      terminalIndexes,
      terminalLabels: terminals.map((terminal) => terminal.label).join(", "),
      rows
    };
  });
  return [
    {
      id: "container",
      label: "设备本体",
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
    { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: false },
    { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: false }
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
  if (glyphKind === "ac-capacitor") return "ac-shunt-capacitor";
  if (glyphKind === "ac-reactor") return "ac-shunt-reactor";
  if (glyphKind === "ac-series-capacitor") return "ac-series-capacitor";
  if (glyphKind === "ac-series-reactor") return "ac-series-reactor";
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
  if (glyphKind.includes("diesel-source")) return "diesel-source";
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
  if (glyphKind === "dcac-converter") return "dcac-converter";
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

export const BUILTIN_VOLTAGE_LEVELS = ["0", "0.4", "6", "10", "10.5", "35", "66", "110", "220", "330", "500", "750", "800"];

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

export type VoltageLevelConfig = {
  name: string;
  vltp: string;
};

export type VoltageLevelSettings = {
  ac: VoltageLevelConfig[];
  dc: VoltageLevelConfig[];
};

const VOLTAGE_LEVEL_SETTINGS_KEY = "graph-model-voltage-levels";

export function readVoltageLevelSettings(): VoltageLevelSettings {
  try {
    const stored = localStorage.getItem(VOLTAGE_LEVEL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.ac) && Array.isArray(parsed.dc)) {
        return parsed as VoltageLevelSettings;
      }
    }
  } catch {}
  return {
    ac: BUILTIN_VOLTAGE_LEVELS.map((v) => ({ name: v, vltp: v })),
    dc: BUILTIN_VOLTAGE_LEVELS.map((v) => ({ name: v, vltp: v }))
  };
}

export function writeVoltageLevelSettings(settings: VoltageLevelSettings): void {
  try {
    localStorage.setItem(VOLTAGE_LEVEL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

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

function terminalVoltageDisplayForColor(
  node: Pick<ModelNode, "kind" | "params" | "terminals">,
  terminal?: VoltageDisplayTerminal
): string {
  return terminalVoltageDisplayValue(node, terminal);
}

export function getTerminalDisplayColor(
  node: Pick<ModelNode, "kind" | "terminals" | "params">,
  terminal: Pick<Terminal, "id" | "type" | "vbase">,
  mode: ColorDisplayMode = "energy",
  palette: ColorPalette = DEFAULT_COLOR_PALETTE
): string {
  return mode === "voltage" && isElectricColorType(terminal.type)
    ? voltageLevelColor(terminalVoltageDisplayForColor(node, terminal), terminal.type, palette)
    : terminalTypeColor(terminal.type, palette);
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
  const visualKind = baseDeviceKind(kind);
  return visualKind.startsWith("hydrogen-") || visualKind.includes("electrolyzer") || visualKind.includes("fuel-cell");
}

function isThermalVisualKind(kind: string): boolean {
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

function isPureHydrogenNetworkKind(kind: string): boolean {
  return baseDeviceKind(kind).startsWith("hydrogen-");
}

function isPureThermalNetworkKind(kind: string): boolean {
  return isThermalVisualKind(kind) && kind !== "ac-heater" && kind !== "dc-heater" && kind !== "ac-two-port-heater" && kind !== "dc-two-port-heater";
}

export function getDeviceStrokeColor(node: Pick<ModelNode, "kind" | "terminals" | "params">, mode: ColorDisplayMode = "energy", palette: ColorPalette = DEFAULT_COLOR_PALETTE): string {
  const primaryTerminal = node.terminals.find((terminal) => isElectricColorType(terminal.type)) ?? node.terminals[0] ?? virtualBusTerminal(node);
  const busTerminalType = busTerminalTypeByKind(node.kind);
  const busVoltage = firstNonZeroVoltageBase([
    node.params.vbase,
    deviceParamValue(node.params, "voltage_level"),
    deviceParamValue(node.params, "rated_voltage"),
    node.params.voltage
  ]);
  return (deviceParamValue(node.params, "foreground_color") ?? "") || (
    mode === "voltage" && isElectricColorType(busTerminalType) && busVoltage
      ? voltageLevelColor(busVoltage, busTerminalType, palette)
      : isHydrogenVisualKind(node.kind)
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
  "diesel-source": 2.3,
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
  "dcac-converter": 2.2,
  "acac-converter": 2.2
};

export function getDeviceStrokeWidth(node: Pick<ModelNode, "kind" | "params">): number {
  const explicitWidth = Number(deviceParamValue(node.params, "line_width") ?? "");
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
  const lineWidth = deviceParamValue(node.params, "line_width");
  const explicitWidth = Number(lineWidth ?? "");
  if (
    lineWidth &&
    explicitWidth !== ROUTABLE_LINE_LEGACY_DEFAULT_STROKE_WIDTH
  ) {
    return node;
  }
  return {
    ...node,
    params: {
      ...node.params,
      line_width: String(ROUTABLE_LINE_DEFAULT_STROKE_WIDTH)
    }
  };
}

export function getSwitchVisualState(node: ModelNode): "open" | "closed" {
  const status = normalizeSwitchStatusForE(node.params.status ?? deviceParamValue(node.params, "closed_status"));
  return status === "0" ? "open" : "closed";
}

export function isStaticKind(kind: DeviceKind): boolean {
  return kind.startsWith("static-");
}

export function isStaticNode(node: Pick<ModelNode, "kind" | "params">): boolean {
  return isStaticKind(node.kind) || Boolean(staticComponentLibraryForNodeLike(node.kind, node.params));
}

export function isStaticGraphicNode(node: Pick<ModelNode, "kind" | "params">): boolean {
  return isStaticNode(node);
}

export function isStaticLineLikeKind(kind: DeviceKind): boolean {
  return STATIC_LINE_LIKE_KIND_SET.has(baseDeviceKind(kind) as DeviceKind);
}

export function isStaticBoxLikeKind(kind: DeviceKind): boolean {
  const baseKind = baseDeviceKind(kind) as DeviceKind;
  const componentLibrary = explicitStaticComponentLibraryForKind(baseKind);
  if (!componentLibrary || isStaticLineLikeKind(baseKind)) {
    return false;
  }
  if (baseKind === "static-point" || baseKind === "static-ring") {
    return false;
  }
  return componentLibrary !== "StaticConnectorSymbol";
}

export function isStaticBoxLikeNode(node: Pick<ModelNode, "kind" | "params">): boolean {
  const baseKind = baseDeviceKind(node.kind) as DeviceKind;
  if (baseKind === "static-point" || baseKind === "static-ring") {
    return false;
  }
  const componentLibrary = staticComponentLibraryForNodeLike(node.kind, node.params);
  return Boolean(componentLibrary) && componentLibrary !== "StaticConnectorSymbol";
}

export function isStaticBoxLikeTemplate(template: Pick<DeviceTemplate, "kind" | "params">): boolean {
  const baseKind = baseDeviceKind(template.kind) as DeviceKind;
  if (baseKind === "static-point" || baseKind === "static-ring") {
    return false;
  }
  const componentLibrary = staticComponentLibraryForNodeLike(template.kind, template.params);
  return Boolean(componentLibrary) && componentLibrary !== "StaticConnectorSymbol";
}

export function isStaticButtonCapableKind(kind: DeviceKind): boolean {
  const baseKind = baseDeviceKind(kind) as DeviceKind;
  if (explicitStaticComponentLibraryForKind(baseKind) === "StaticButton") {
    return true;
  }
  return isStaticKind(baseKind) && !isStaticLineLikeKind(baseKind);
}

export function isStaticButtonCapableNode(node: Pick<ModelNode, "kind" | "params">): boolean {
  return isStaticButtonCapableKind(node.kind) || staticComponentLibraryForNodeLike(node.kind, node.params) === "StaticButton";
}

const TEMPLATE_DEFINITION_READONLY_KEYS = new Set(["idx", "name", "node", "i_node", "j_node", "ac_node", "dc_node"]);
const TEMPLATE_DEFINITION_EDITABLE_DEFAULT_KEYS = new Set(["status", "run_stat"]);

export function templateDefinitionIsReadonly(enName: string, readonly?: boolean): boolean {
  const normalizedName = enName.trim();
  if (TEMPLATE_DEFINITION_EDITABLE_DEFAULT_KEYS.has(normalizedName)) {
    return false;
  }
  return Boolean(readonly || TEMPLATE_DEFINITION_READONLY_KEYS.has(normalizedName));
}
function inferDefinitionValueType(key: string, value: string): DeviceParameterValueType {
  const definedType = semanticParameterValueType(key);
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

const DEFAULT_TEMPLATE_ENUM_VALUES: Record<string, string[]> = {
  status: ["1", "0"],
  run_stat: ["运行", "停运"]
};

const DEFAULT_TEMPLATE_ENUM_OPTIONS: Record<string, DeviceParameterEnumOption[]> = {
  status: [
    { value: "1", label: "闭合" },
    { value: "0", label: "打开/开断" }
  ],
  run_stat: [
    { value: "运行" },
    { value: "停运" }
  ]
};

function normalizeTemplateEnumValueType(value: unknown, enumOptions: readonly DeviceParameterEnumOption[] = []): DeviceParameterEnumValueType {
  if (value === "number" || value === "string") {
    return value;
  }
  const optionValues = enumOptions.map((option) => option.value.trim()).filter(Boolean);
  return optionValues.length > 0 && optionValues.every((optionValue) => /^-?\d+(?:\.\d+)?$/.test(optionValue)) ? "number" : "string";
}

function templateDefinitionValueTypeIsEnum(valueType: unknown): valueType is "stringEnum" | "numberEnum" | "enum" {
  return valueType === "stringEnum" || valueType === "numberEnum" || valueType === "enum";
}

function enumValueTypeForTemplateDefinition(
  definition: Pick<DeviceParameterDefinition, "valueType" | "enumValueType">,
  enumOptions: readonly DeviceParameterEnumOption[]
): DeviceParameterEnumValueType {
  if (definition.valueType === "numberEnum") {
    return "number";
  }
  if (definition.valueType === "stringEnum") {
    return "string";
  }
  return normalizeTemplateEnumValueType(definition.enumValueType, enumOptions);
}

function enumDefinitionValueTypeForEnumValueType(enumValueType: DeviceParameterEnumValueType): DeviceParameterValueType {
  return enumValueType === "number" ? "numberEnum" : "stringEnum";
}

function normalizeTemplateEnumOption(rawOption: unknown): DeviceParameterEnumOption | null {
  if (rawOption && typeof rawOption === "object" && !Array.isArray(rawOption)) {
    const option = rawOption as Partial<DeviceParameterEnumOption>;
    const value = String(option.value ?? "").trim();
    if (!value) {
      return null;
    }
    const label = String(option.label ?? "").trim();
    return label ? { value, label } : { value };
  }
  const value = String(rawOption ?? "").trim();
  return value ? { value } : null;
}

function normalizeTemplateEnumValues(values: unknown, typicalValue = ""): string[] {
  const sourceValues = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const enumValues: string[] = [];
  for (const value of sourceValues) {
    const text = String(value ?? "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    enumValues.push(text);
  }
  const typical = typicalValue.trim();
  if (typical && !seen.has(typical)) {
    enumValues.push(typical);
  }
  return enumValues;
}

function normalizeTemplateEnumOptions(definition: DeviceParameterDefinition, typicalValue = ""): DeviceParameterEnumOption[] {
  const rawOptions = Array.isArray(definition.enumOptions) && definition.enumOptions.length > 0
    ? definition.enumOptions
    : (DEFAULT_TEMPLATE_ENUM_OPTIONS[definition.enName?.trim()] ?? definition.enumValues ?? DEFAULT_TEMPLATE_ENUM_VALUES[definition.enName?.trim()] ?? []);
  const seen = new Set<string>();
  const enumOptions: DeviceParameterEnumOption[] = [];
  const addOption = (rawOption: unknown) => {
    const option = normalizeTemplateEnumOption(rawOption);
    if (!option || seen.has(option.value)) {
      return;
    }
    seen.add(option.value);
    enumOptions.push(option);
  };
  for (const option of rawOptions) {
    addOption(option);
  }
  if (Array.isArray(definition.enumOptions) && definition.enumOptions.length > 0) {
    for (const value of normalizeTemplateEnumValues(definition.enumValues ?? [], "")) {
      addOption(value);
    }
  }
  const typical = typicalValue.trim();
  const typicalMatchesExistingOption = enumOptions.some((option) => option.value === typical || option.label === typical);
  if (typical && !typicalMatchesExistingOption) {
    addOption(typical);
  }
  return enumOptions;
}

function enumValueForDefinition(definition: DeviceParameterDefinition, value?: string): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (!templateDefinitionValueTypeIsEnum(definition.valueType)) {
    return text;
  }
  const enumOptions = definition.enumOptions ?? normalizeTemplateEnumOptions(definition, definition.typicalValue);
  const exactValue = enumOptions.find((option) => option.value === text);
  if (exactValue) {
    return exactValue.value;
  }
  const labelMatch = enumOptions.find((option) => option.label === text);
  return labelMatch?.value ?? text;
}

export function enumExportValueForDefinition(definition: DeviceParameterDefinition, value?: string): string {
  return enumValueForDefinition(definition, value);
}

export function isEnumParameterDefinition(
  definition: Pick<DeviceParameterDefinition, "valueType">
): boolean {
  return templateDefinitionValueTypeIsEnum(definition.valueType);
}

export function enumValuesForParameterDefinition(definition: DeviceParameterDefinition): string[] {
  if (!isEnumParameterDefinition(definition)) {
    return [];
  }
  return normalizeTemplateEnumOptions(definition, definition.typicalValue).map((option) => option.value);
}

export function enumOptionLabelsForParameterDefinition(
  definition: DeviceParameterDefinition
): Record<string, string> {
  if (!isEnumParameterDefinition(definition)) {
    return {};
  }
  return Object.fromEntries(
    normalizeTemplateEnumOptions(definition, definition.typicalValue).map((option) => [
      option.value,
      option.label || option.value
    ])
  );
}

export const invalidEnumOptionLabel = (value: string) => `非法历史值：${value}`;

export function enumSelectOptionsWithCurrentValue(
  options: readonly string[] | undefined,
  value: string
): { options: string[] | undefined; invalidValue?: string } {
  if (!options) {
    return { options: undefined };
  }
  const normalizedOptions = Array.from(new Set(options.map((option) => String(option ?? "").trim()).filter(Boolean)));
  const currentValue = String(value ?? "").trim();
  if (normalizedOptions.includes(currentValue)) {
    return { options: normalizedOptions };
  }
  return { options: [currentValue, ...normalizedOptions], invalidValue: currentValue };
}

function normalizeTemplateDefinition(definition: DeviceParameterDefinition): DeviceParameterDefinition | null {
  const rawEnName = String(definition.enName ?? "").trim();
  const enName = /^(?:gasQuantity|gasquantity)$/.test(rawEnName) ? "gas_quantity" : rawEnName;
  if (!enName || enName === "is_container" || enName === ALLOW_RESIZE_TRANSFORM_PARAM) {
    return null;
  }
  const valueType = semanticParameterValueType(enName) ?? (["integer", "float", "string", "stringEnum", "numberEnum", "enum"].includes(definition.valueType) ? definition.valueType : "string");
  const rawTypicalValue = String(definition.typicalValue ?? "");
  const typicalValue = valueType === "integer" || valueType === "float"
    ? normalizeSemanticNumericValue(rawTypicalValue, valueType)
    : rawTypicalValue;
  const exportSettings = {
    ...(typeof definition.exportEnabled === "boolean" ? { exportEnabled: definition.exportEnabled } : {}),
    ...(typeof definition.exportName === "string"
      ? {
          exportName: /^(?:gasQuantity|gasquantity)$/.test(definition.exportName.trim())
            ? "gas_quantity"
            : definition.exportName.trim()
        }
      : {})
  };
  const normalized: DeviceParameterDefinition = {
    cnName: String(definition.cnName ?? enName).trim() || enName,
    enName,
    valueType,
    typicalValue,
    readonly: templateDefinitionIsReadonly(enName, definition.readonly),
    ...exportSettings
  };
  if (!templateDefinitionValueTypeIsEnum(valueType)) {
    return normalized;
  }
  const enumOptions = normalizeTemplateEnumOptions(definition, typicalValue);
  const enumValueType = enumValueTypeForTemplateDefinition({ ...definition, valueType }, enumOptions);
  const normalizedDefinition: DeviceParameterDefinition = {
    ...normalized,
    valueType: enumDefinitionValueTypeForEnumValueType(enumValueType),
    enumOptions
  };
  const normalizedTypicalValue = enumValueForDefinition(normalizedDefinition, typicalValue);
  const enumValues = enumOptions.map((option) => option.value);
  return {
    ...normalizedDefinition,
    typicalValue: normalizedTypicalValue || enumValues[0] || "",
    enumValues
  };
}

export function templateTerminalTypes(template: DeviceTemplate): TerminalType[] {
  const terminalTypes = (template.terminalTypes ?? []).slice(0, template.terminalCount);
  while (terminalTypes.length < template.terminalCount) {
    terminalTypes.push(template.terminalType);
  }
  return terminalTypes;
}

export function getTemplateParameterDefinitions(template: DeviceTemplate): DeviceParameterDefinition[] {
  if (template.parameterDefinitionsComplete && Array.isArray(template.parameterDefinitions)) {
    const normalizedParamDefs = template.parameterDefinitions
      .map((definition) => normalizeTemplateDefinition(definition))
      .filter((definition): definition is DeviceParameterDefinition => (
        Boolean(definition) && !isContainerAssociatedParameterName(template, definition?.enName ?? "")
      ));
    return normalizeESectionParameterDefinitions(
      inferESection(template.kind, template.params),
      normalizedParamDefs
    );
  }
  if (template.parameterDefinitions?.length) {
    const normalizedParamDefs = template.parameterDefinitions
      .map((definition) => normalizeTemplateDefinition(definition))
      .filter((definition): definition is DeviceParameterDefinition => (
        Boolean(definition) && !isContainerAssociatedParameterName(template, definition?.enName ?? "")
      ));
    const section = inferESection(template.kind, template.params);
    const derivedComponentInfo = templateDerivedComponentLibraryInfo(template);
    const paramDefs = normalizeESectionParameterDefinitions(section, normalizedParamDefs);
    // 对属 E 分区的图元，合并 eKeys（E_SECTION_COLUMNS 内置列）+ dev_type，确保所有字段都显示
    const eKeys = getEParameterKeys(template.kind, template.params);
    if (eKeys.length > 0) {
      const existingEnNames = new Set(paramDefs.map(d => d.enName));
      // 过滤掉已被 parameterDefinitions 映射 legacyColumn 的 eKeys，避免覆盖参数定义的 exportName（如 resistancePu -> resistance）
      const existingLegacyColumns = new Set(
        paramDefs.map(d => section ? legacyEColumnForDefinition(section, d.enName) : "").filter(Boolean)
      );
      const keysToAdd = [...eKeys];
      if (!keysToAdd.includes("dev_type")) {
        // dev_type 紧跟 name 之后
        const nameIndex = keysToAdd.indexOf("name");
        if (nameIndex >= 0) {
          keysToAdd.splice(nameIndex + 1, 0, "dev_type");
        } else {
          keysToAdd.unshift("dev_type");
        }
      }
      const keysToAppend = keysToAdd.filter((key) => (
        !existingEnNames.has(key) &&
        !existingLegacyColumns.has(key) &&
        key !== ALLOW_RESIZE_TRANSFORM_PARAM &&
        !key.startsWith("_") &&
        (!derivedComponentInfo || !["rated_power", "rated_capacity", "rated_voltage"].includes(toSnakeCaseDeviceParamName(key)))
      ));
      if (keysToAppend.length > 0) {
        const eDefs = keysToAppend.map((key) => {
          const base = {
            cnName: key,
            enName: key,
            valueType: inferDefinitionValueType(key, template.params[key] ?? ""),
            typicalValue: template.params[key] ?? "",
            readonly: TEMPLATE_DEFINITION_READONLY_KEYS.has(key)
          };
          // dev_type 固定列默认勾选导出，导出名称为 dev_type
          if (key === "dev_type") {
            return normalizeTemplateDefinition({ ...base, exportEnabled: true, exportName: "dev_type" })!;
          }
          return normalizeTemplateDefinition(base)!;
        });
        const allDefs = [...paramDefs, ...eDefs];
        // dev_type 移到 name 之后，确保表格中紧跟名称行
        const devTypeIndex = allDefs.findIndex(d => d.enName === "dev_type");
        if (devTypeIndex >= 0) {
          const nameIndex = allDefs.findIndex(d => d.enName === "name");
          if (nameIndex >= 0 && devTypeIndex !== nameIndex + 1) {
            const [devTypeDef] = allDefs.splice(devTypeIndex, 1);
            allDefs.splice(nameIndex + 1, 0, devTypeDef);
          }
        }
        return normalizeESectionParameterDefinitions(section, allDefs);
      }
    }
    return paramDefs;
  }
  if (template.isContainer) {
    const defaultDefinitions = buildDefaultDeviceParameterDefinitions(templateTerminalTypes(template), {
      isContainer: true,
      terminalRoles: template.terminalRoles,
      terminalAssociations: template.terminalAssociations
    });
    const defaultKeys = new Set(defaultDefinitions.map((definition) => definition.enName));
    const extraKeys = Object.keys(template.params).filter((key) =>
      key &&
      key !== "is_container" &&
      key !== ALLOW_RESIZE_TRANSFORM_PARAM &&
      !key.startsWith("_") &&
      !defaultKeys.has(key) &&
      !isContainerAssociatedParameterName(template, key)
    );
    const generatedDefinitions = [
      ...defaultDefinitions,
      ...extraKeys.map((key) => ({
        cnName: key,
        enName: key,
        valueType: inferDefinitionValueType(key, template.params[key] ?? ""),
        typicalValue: template.params[key] ?? "",
        readonly: TEMPLATE_DEFINITION_READONLY_KEYS.has(key)
      }))
    ]
      .map((definition) => normalizeTemplateDefinition(definition))
      .filter((definition): definition is DeviceParameterDefinition => Boolean(definition));
    return normalizeESectionParameterDefinitions(inferESection(template.kind, template.params), generatedDefinitions);
  }
  const eKeys = getEParameterKeys(template.kind, template.params);
  const keys = eKeys.length > 0 ? [...eKeys] : Object.keys(template.params);
  // 属 E 分区的图元加 dev_type（E 文件固定列，标识设备类型），紧跟 name 之后
  if (eKeys.length > 0 && !keys.includes("dev_type")) {
    const nameIndex = keys.indexOf("name");
    if (nameIndex >= 0) {
      keys.splice(nameIndex + 1, 0, "dev_type");
    } else {
      keys.unshift("dev_type");
    }
  }
  const uniqueKeys = Array.from(new Set(keys.filter((key) => key && key !== ALLOW_RESIZE_TRANSFORM_PARAM && !key.startsWith("_"))));
  const generatedDefinitions = uniqueKeys.map((key) => {
    const base = {
      cnName: key,
      enName: key,
      valueType: inferDefinitionValueType(key, template.params[key] ?? ""),
      typicalValue: template.params[key] ?? "",
      readonly: TEMPLATE_DEFINITION_READONLY_KEYS.has(key)
    };
    // dev_type 固定列默认勾选导出，导出名称为 dev_type
    if (key === "dev_type") {
      return normalizeTemplateDefinition({ ...base, exportEnabled: true, exportName: "dev_type" })!;
    }
    return normalizeTemplateDefinition(base)!;
  });
  const section = inferESection(template.kind, template.params);
  return normalizeESectionParameterDefinitions(section, generatedDefinitions);
}

function stripThreeWindingTransformerContainerParams(params: Record<string, string>): Record<string, string> {
  const legacyContainerParamPattern =
    /(?:^|_)(?:xf_t\d+|(?:ac2|dc2|h22|heat2|ac|dc|h2|heat)_(?:unit|load|transformer)_t\d+)$/;
  let changed = false;
  const entries = Object.entries(params).filter(([key]) => {
    const shouldRemove = key === "is_container" || legacyContainerParamPattern.test(key);
    if (shouldRemove) {
      changed = true;
    }
    return !shouldRemove;
  });
  return changed ? Object.fromEntries(entries) : params;
}

export function normalizeThreeWindingTransformerParams(params: Record<string, string>): Record<string, string> {
  let next = stripThreeWindingTransformerContainerParams(params);
  let changed = next !== params;
  for (const [canonicalKey, legacyKeys] of THREE_WINDING_TRANSFORMER_PARAMETER_ALIASES) {
    const canonicalValue = String(next[canonicalKey] ?? "").trim();
    const legacyValues = legacyKeys.map((legacyKey) => next[legacyKey]);
    const legacyValue = legacyValues.find((value) => String(value ?? "").trim()) ??
      legacyValues.find((value) => value !== undefined);
    if (!canonicalValue && legacyValue !== undefined) {
      if (!changed) {
        next = { ...next };
        changed = true;
      }
      next[canonicalKey] = legacyValue;
    }
    for (const legacyKey of legacyKeys) {
      if (Object.prototype.hasOwnProperty.call(next, legacyKey)) {
        if (!changed) {
          next = { ...next };
          changed = true;
        }
        delete next[legacyKey];
      }
    }
  }
  return changed ? next : params;
}

export function isTwoWindingTransformerTemplateKind(kind: string): boolean {
  const templateKind = baseDeviceKind(kind);
  return templateKind === "ac-transformer" || templateKind === "ac-two-winding-transformer";
}

export function normalizeTwoWindingTransformerParams(params: Record<string, string>): Record<string, string> {
  let next = stripThreeWindingTransformerContainerParams(params);
  let changed = next !== params;
  const aliases = [
    ["r", ["resistance_pu", "resistancePu"]],
    ["x", ["reactance_pu", "reactancePu"]],
    ["gt", ["magnetizing_conductance_pu", "magnetizingConductancePu"]],
    ["bt", ["magnetizing_susceptance_pu", "magnetizingSusceptancePu"]],
    ["tap", ["tap_ratio", "tapRatio"]]
  ] as const;
  for (const [canonicalKey, legacyKeys] of aliases) {
    const canonicalValue = String(next[canonicalKey] ?? "").trim();
    const legacyValue = legacyKeys.map((legacyKey) => next[legacyKey]).find((value) => value !== undefined);
    if (!canonicalValue && legacyValue !== undefined) {
      if (!changed) {
        next = { ...next };
        changed = true;
      }
      next[canonicalKey] = legacyValue;
    }
    for (const legacyKey of legacyKeys) {
      if (Object.prototype.hasOwnProperty.call(next, legacyKey)) {
        if (!changed) {
          next = { ...next };
          changed = true;
        }
        delete next[legacyKey];
      }
    }
  }
  for (const legacyNodeKey of ["t1_node", "t2_node"]) {
    if (Object.prototype.hasOwnProperty.call(next, legacyNodeKey)) {
      if (!changed) {
        next = { ...next };
        changed = true;
      }
      delete next[legacyNodeKey];
    }
  }
  return changed ? next : params;
}

export function mergeCanonicalParameterDefinitions(
  canonicalDefinitions: readonly DeviceParameterDefinition[],
  overrideDefinitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  const normalizedCanonicalDefinitions = canonicalDefinitions.map(normalizeDeviceParameterDefinition);
  const normalizedOverrideDefinitions = overrideDefinitions.map(normalizeDeviceParameterDefinition);
  const overrideByName = new Map(normalizedOverrideDefinitions.map((definition) => [definition.enName.toLowerCase(), definition]));
  const canonicalNames = new Set(normalizedCanonicalDefinitions.map((definition) => definition.enName.toLowerCase()));
  const legacyContainerParamPattern = /(?:^|_)(?:xf_t\d+|(?:ac2|dc2|h22|heat2|ac|dc|h2|heat)_(?:unit|load|transformer)_t\d+)$/;
  const merged = normalizedCanonicalDefinitions.map((definition) => {
    const override = overrideByName.get(definition.enName.toLowerCase());
    if (!override) {
      return { ...definition };
    }
    return normalizeTemplateDefinition({
      ...definition,
      ...override,
      enName: definition.enName,
      readonly: definition.readonly
    }) ?? { ...definition };
  });
  for (const definition of normalizedOverrideDefinitions) {
    if (
      !canonicalNames.has(definition.enName.toLowerCase()) &&
      definition.enName !== "is_container" &&
      !legacyContainerParamPattern.test(definition.enName)
    ) {
      merged.push({ ...definition });
    }
  }
  return merged;
}

function mergeCanonicalFloatParameterDefinitions(
  canonicalDefinitions: readonly DeviceParameterDefinition[],
  overrideDefinitions: readonly DeviceParameterDefinition[]
): DeviceParameterDefinition[] {
  const canonicalFloatDefinitions = new Map(
    canonicalDefinitions
      .map(normalizeDeviceParameterDefinition)
      .filter((definition) => definition.valueType === "float")
      .map((definition) => [definition.enName, definition])
  );
  return mergeCanonicalParameterDefinitions(canonicalDefinitions, overrideDefinitions).map((definition) => {
    const canonicalDefinition = canonicalFloatDefinitions.get(definition.enName);
    if (!canonicalDefinition) {
      return definition;
    }
    return {
      ...definition,
      valueType: "float",
      typicalValue: firstNumericToken(definition.typicalValue) ||
        firstNumericToken(canonicalDefinition.typicalValue) ||
        "0"
    };
  });
}

function normalizeCanonicalFloatParameterValues(
  params: Record<string, string>,
  canonicalDefinitions: readonly DeviceParameterDefinition[]
): Record<string, string> {
  let next = params;
  let changed = false;
  for (const rawDefinition of canonicalDefinitions) {
    const definition = normalizeDeviceParameterDefinition(rawDefinition);
    if (definition.valueType !== "float") {
      continue;
    }
    const key = definition.enName;
    const legacyKey = legacyCamelCaseParamName(key);
    const normalizedValue = firstNumericToken(deviceParamValue(next, key) ?? "") ||
      firstNumericToken(definition.typicalValue) ||
      "0";
    if (next[key] === normalizedValue && (legacyKey === key || !Object.prototype.hasOwnProperty.call(next, legacyKey))) {
      continue;
    }
    if (!changed) {
      next = { ...next };
      changed = true;
    }
    next[key] = normalizedValue;
    if (legacyKey !== key) {
      delete next[legacyKey];
    }
  }
  return next;
}

export function applyDeviceTemplateDefinitionOverride(
  template: DeviceTemplate,
  override?: DeviceTemplateDefinitionOverride
): DeviceTemplate {
  if (!override) {
    return template;
  }
  const hasParameterDefinitionsOverride = Array.isArray(override.parameterDefinitions);
  const overrideParameterDefinitions = (override.parameterDefinitions ?? [])
    .map((definition) => normalizeTemplateDefinition(definition))
    .filter((definition): definition is DeviceParameterDefinition => (
      Boolean(definition) && !isContainerAssociatedParameterName(template, definition?.enName ?? "")
    ));
  const baseKind = baseDeviceKind(template.kind);
  const electricGenerationDerivedInfo = electricGenerationDerivedComponentLibraryInfo(baseKind);
  const isElectricGenerationBase = baseKind === "ac-source" || baseKind === "dc-source";
  const isElectricGenerationTemplate = isElectricGenerationBase || Boolean(electricGenerationDerivedInfo);
  const isCanonicalHydrogenEndpoint = baseKind === "hydrogen-source" || baseKind === "hydrogen-load";
  const normalizedOverrideParameterDefinitions = isElectricGenerationTemplate
    ? overrideParameterDefinitions.map((definition) => (
        definition.enName === "rated_power"
          ? {
              ...definition,
              cnName: definition.cnName === "额定功率" ? "额定容量" : definition.cnName,
              enName: "rated_capacity",
              ...(definition.exportName && toSnakeCaseDeviceParamName(definition.exportName) === "rated_power"
                ? { exportName: "rated_capacity" }
                : {})
            }
          : definition
      ))
    : overrideParameterDefinitions;
  const retiredElectricGenerationParameterNames = new Set(
    electricGenerationDerivedInfo
      ? Object.entries(RETIRED_ELECTRIC_GENERATION_PARAMETER_NAMES_BY_KIND_SUFFIX)
          .find(([kindSuffix]) => baseKind.endsWith(kindSuffix))?.[1] ?? []
      : []
  );
  const canonicalOverrideParameterDefinitions = electricGenerationDerivedInfo
    ? normalizedOverrideParameterDefinitions.filter((definition) => (
        definition.enName !== "rated_power" &&
        definition.enName !== "rated_capacity" &&
        definition.enName !== "rated_voltage" &&
        !retiredElectricGenerationParameterNames.has(definition.enName)
      ))
    : normalizedOverrideParameterDefinitions;
  const parameterDefinitions = hasParameterDefinitionsOverride
    ? (isElectricGenerationBase || electricGenerationDerivedInfo || isCanonicalHydrogenEndpoint
        ? mergeCanonicalParameterDefinitions(template.parameterDefinitions ?? [], canonicalOverrideParameterDefinitions)
        : canonicalOverrideParameterDefinitions)
    : template.parameterDefinitions?.map((definition) => ({ ...definition }));
  const hasStateDefinitionsOverride = Array.isArray(override.stateDefinitions);
  const stateDefinitions = hasStateDefinitionsOverride ? normalizeDeviceStateDefinitions(override.stateDefinitions) : template.stateDefinitions?.map(cloneDeviceStateDefinition);
  const hasMeasurementDefinitionsOverride = Array.isArray(override.measurementDefinitions);
  const measurementDefinitions = hasMeasurementDefinitionsOverride
    ? normalizeDeviceMeasurementDefinitions(override.measurementDefinitions)
    : cloneDeviceMeasurementDefinitions(template.measurementDefinitions);
  const overrideParams = Object.fromEntries(
    Object.entries(override.params ?? {}).filter(([key]) => (
      key !== ALLOW_RESIZE_TRANSFORM_PARAM &&
      !retiredElectricGenerationParameterNames.has(toSnakeCaseDeviceParamName(key))
    ))
  );
  const params = { ...template.params, ...overrideParams };
  for (const definition of normalizedOverrideParameterDefinitions) {
    if (
      definition.enName === "name" ||
      retiredElectricGenerationParameterNames.has(definition.enName)
    ) {
      continue;
    }
    params[definition.enName] = definition.typicalValue;
  }
  for (const key of Object.keys(params)) {
    if (retiredElectricGenerationParameterNames.has(toSnakeCaseDeviceParamName(key))) {
      delete params[key];
    }
  }
  if (isElectricGenerationTemplate) {
    const ratedCapacityDefinition = normalizedOverrideParameterDefinitions.find(
      (definition) => definition.enName === "rated_capacity"
    );
    const ratedVoltageDefinition = normalizedOverrideParameterDefinitions.find(
      (definition) => definition.enName === "rated_voltage"
    );
    const ratedCapacity = ratedCapacityDefinition?.typicalValue ??
      deviceParamValue(overrideParams, "rated_capacity") ??
      deviceParamValue(overrideParams, "rated_power") ??
      deviceParamValue(template.params, "rated_capacity") ??
      deviceParamValue(template.params, "rated_power") ??
      "10 MW";
    const ratedVoltage = ratedVoltageDefinition?.typicalValue ??
      deviceParamValue(overrideParams, "rated_voltage") ??
      deviceParamValue(template.params, "rated_voltage") ??
      (template.terminalType === "ac" ? "10 kV" : "750 V");
    for (const key of Object.keys(params)) {
      if (key.startsWith("_")) {
        continue;
      }
      const normalizedName = toSnakeCaseDeviceParamName(key);
      if (
        normalizedName === "rated_power" ||
        (normalizedName === "rated_capacity" && key !== "rated_capacity") ||
        (normalizedName === "rated_voltage" && key !== "rated_voltage")
      ) {
        delete params[key];
      }
    }
    params.rated_capacity = ratedCapacity;
    params.rated_voltage = ratedVoltage;
  }
  const terminalTypes = override.terminalTypes?.length
    ? override.terminalTypes.slice(0, Math.max(0, override.terminalCount ?? override.terminalTypes.length))
    : template.terminalTypes;
  const terminalCount = Math.max(
    0,
    Math.round(override.terminalCount ?? terminalTypes?.length ?? template.terminalCount)
  );
  const terminalType = override.terminalType ?? terminalTypes?.[0] ?? template.terminalType;
  const normalizedParams = normalizeSemanticParameterValues(params);
  const mergedTemplate: DeviceTemplate = {
    ...template,
    size: override.size ? { ...override.size } : template.size,
    terminalType,
    terminalCount,
    terminalTypes: terminalTypes ? [...terminalTypes] : template.terminalTypes,
    terminalLabels: override.terminalLabels ? override.terminalLabels.slice(0, terminalCount) : template.terminalLabels,
    terminalAnchors: override.terminalAnchors ? override.terminalAnchors.slice(0, terminalCount).map(clonePoint) : template.terminalAnchors,
    terminalRoles: override.terminalRoles ? override.terminalRoles.slice(0, terminalCount) : template.terminalRoles,
    terminalAssociations: override.terminalAssociations ? override.terminalAssociations.slice(0, terminalCount) : template.terminalAssociations,
    isContainer: override.isContainer ?? template.isContainer,
    isDerivedComponentLibrary: override.isDerivedComponentLibrary ?? template.isDerivedComponentLibrary,
    derivedFromComponentLibrary: override.derivedFromComponentLibrary ?? template.derivedFromComponentLibrary,
    derivedComponentLibrary: override.derivedComponentLibrary ?? template.derivedComponentLibrary,
    derivedComponentLibraryLabel: override.derivedComponentLibraryLabel ?? template.derivedComponentLibraryLabel,
    allowResizeTransform: override.allowResizeTransform ?? template.allowResizeTransform,
    params: normalizedParams,
    parameterDefinitions,
    parameterDefinitionsComplete: hasParameterDefinitionsOverride || template.parameterDefinitionsComplete,
    measurementDefinitions,
    ...(stateDefinitions ? { stateDefinitions } : {})
  };
  if (isTwoWindingTransformerTemplateKind(template.kind)) {
    const canonicalTerminalCount = 2;
    return {
      ...mergedTemplate,
      terminalType: "ac",
      terminalCount: canonicalTerminalCount,
      terminalTypes: Array.from({ length: canonicalTerminalCount }, () => "ac"),
      terminalLabels: mergedTemplate.terminalLabels?.slice(0, canonicalTerminalCount),
      terminalAnchors: mergedTemplate.terminalAnchors?.slice(0, canonicalTerminalCount).map(clonePoint),
      terminalRoles: undefined,
      terminalAssociations: undefined,
      isContainer: false,
      params: normalizeCanonicalFloatParameterValues(
        normalizeTwoWindingTransformerParams(mergedTemplate.params),
        twoWindingTransformerParameterDefinitions
      ),
      parameterDefinitionsComplete: false,
      parameterDefinitions: mergeCanonicalFloatParameterDefinitions(
        twoWindingTransformerParameterDefinitions,
        (parameterDefinitions ?? []).filter((definition) => !isRetiredTwoWindingTransformerParameterName(definition.enName))
      )
    };
  }
  if (!isThreeWindingTransformer(template)) {
    return mergedTemplate;
  }
  const canonicalTerminalCount = template.terminalCount;
  return {
    ...mergedTemplate,
    terminalType: "ac",
    terminalCount: canonicalTerminalCount,
    terminalTypes: Array.from({ length: canonicalTerminalCount }, () => "ac"),
    terminalLabels: mergedTemplate.terminalLabels?.slice(0, canonicalTerminalCount),
    terminalAnchors: mergedTemplate.terminalAnchors?.slice(0, canonicalTerminalCount).map(clonePoint),
    terminalRoles: undefined,
    terminalAssociations: undefined,
    isContainer: false,
    params: normalizeCanonicalFloatParameterValues(
      normalizeThreeWindingTransformerParams(mergedTemplate.params),
      threeWindingTransformerParameterDefinitions
    ),
    parameterDefinitionsComplete: false,
    parameterDefinitions: mergeCanonicalFloatParameterDefinitions(
      threeWindingTransformerParameterDefinitions,
      (parameterDefinitions ?? []).filter((definition) => !isRetiredThreeWindingTransformerParameterName(definition.enName))
    )
  };
}

function applyTemplateDefinitionDefaults(
  params: Record<string, string>,
  template: DeviceTemplate,
  definitionFilter?: (definition: DeviceParameterDefinition) => boolean
): Record<string, string> {
  const parameterDefinitions = normalizeTemplateDefinitionList(template.parameterDefinitions)
    .filter((definition) => definitionFilter ? definitionFilter(definition) : true);
  if (parameterDefinitions.length === 0) {
    return params;
  }
  const next: Record<string, string> = {
    ...params,
    [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(parameterDefinitions)
  };
  for (const definition of parameterDefinitions) {
    const enName = definition.enName.trim();
    if (!enName || enName === "name" || enName === "is_container" || enName === ALLOW_RESIZE_TRANSFORM_PARAM) {
      continue;
    }
    next[enName] = definition.typicalValue;
  }
  return next;
}

const TEMPLATE_DEFINITION_PARAM_METADATA_KEYS = new Set([
  "name",
  "component_type",
  "is_container",
  ALLOW_RESIZE_TRANSFORM_PARAM,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY
]);

export function normalizeTemplateDefinitionList(definitions?: readonly DeviceParameterDefinition[]): DeviceParameterDefinition[] {
  return (definitions ?? [])
    .map((definition) => normalizeTemplateDefinition(definition))
    .filter((definition): definition is DeviceParameterDefinition => Boolean(definition));
}

function parseStoredTemplateParameterDefinitions(params: Record<string, string>): DeviceParameterDefinition[] {
  try {
    const parsed = JSON.parse(params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]");
    return Array.isArray(parsed) ? normalizeTemplateDefinitionList(parsed) : [];
  } catch {
    return [];
  }
}

function sectionEnumParameterDefinition(section: string, enName: string): DeviceParameterDefinition | undefined {
  const base = (values: readonly string[], labels?: Record<string, string>): DeviceParameterDefinition => ({
    cnName: enName,
    enName,
    valueType: "stringEnum",
    typicalValue: values[0] ?? "",
    enumValues: [...values],
    enumOptions: values.map((value) => ({ value, ...(labels?.[value] ? { label: labels[value] } : {}) }))
  });
  if (enName === "status") {
    return base(["1", "0"], { "1": "闭合", "0": "打开/开断" });
  }
  if (enName === "run_stat") {
    return base(["1", "0"], { "1": "运行", "0": "停运" });
  }
  if (enName === "control_type") {
    if (section === "ACGenerator") return base(AC_GENERATOR_CONTROL_TYPES);
    if (section === "DCGenerator") return base(DC_GENERATOR_CONTROL_TYPES);
    if (section === "HydroSource" || section === "HydroLoad") {
      return base(HYDROGEN_ENDPOINT_CONTROL_TYPES, { FLOW: "定流量", PRESSURE: "定压力" });
    }
    if (HYDROGEN_COUPLING_SECTIONS.has(section)) {
      return base(HYDROGEN_COUPLING_CONTROL_TYPES, { P: "定电功率", FLOW: "定气流量" });
    }
    if (ELECTRIC_HEAT_COUPLING_SECTIONS.has(section)) {
      return base(ELECTRIC_HEAT_COUPLING_CONTROL_TYPES, { P: "定电功率", T: "定出口温度" });
    }
  }
  if (section === "DCACConverter" && enName === "ac_control_type") return base(DCAC_AC_CONTROL_TYPES);
  if (section === "DCACConverter" && enName === "dc_control_type") return base(DCAC_DC_CONTROL_TYPES);
  if (section === "ACACConverter" && (enName === "i_control_type" || enName === "j_control_type")) {
    return base(ACAC_SIDE_CONTROL_TYPES);
  }
  if (section === "DCDCConverter" && (enName === "i_control_type" || enName === "j_control_type")) {
    return base(DCDC_CONVERTER_CONTROL_TYPES);
  }
  return undefined;
}

export function resolveNodeParameterDefinitions(
  node: Pick<ModelNode, "kind" | "params">,
  template?: DeviceTemplate
): DeviceParameterDefinition[] {
  const storedDefinitions = parseStoredTemplateParameterDefinitions(node.params);
  const resolvedTemplate = template ?? DEVICE_LIBRARY_BY_KIND.get(node.kind) ?? DEVICE_LIBRARY_BY_KIND.get(baseDeviceKind(node.kind));
  if (node.params[CUSTOM_DEVICE_TEMPLATE_KEY] === "1") {
    return storedDefinitions.length > 0
      ? storedDefinitions
      : resolvedTemplate
        ? getTemplateParameterDefinitions(resolvedTemplate)
        : [];
  }
  const templateDefinitions = resolvedTemplate ? getTemplateParameterDefinitions(resolvedTemplate) : [];
  const storedDefinitionByName = new Map(storedDefinitions.map((definition) => [definition.enName, definition]));
  const sourceDefinitions = [
    ...templateDefinitions.map((definition) => storedDefinitionByName.get(definition.enName) ?? definition),
    ...storedDefinitions.filter((definition) => !templateDefinitions.some((candidate) => candidate.enName === definition.enName))
  ];
  return normalizeESectionParameterDefinitions(inferESection(node.kind, node.params), sourceDefinitions);
}

function normalizeKnownLegacyEnumValue(
  section: string,
  definition: DeviceParameterDefinition,
  value: string
): string {
  const text = String(value ?? "").trim();
  const allowedValues = enumValuesForParameterDefinition(definition);
  if (allowedValues.includes(text)) {
    return text;
  }
  const optionValue = enumValueForDefinition(definition, text);
  if (allowedValues.includes(optionValue)) {
    return optionValue;
  }
  const caseInsensitiveMatch = allowedValues.find((allowed) => allowed.toUpperCase() === text.toUpperCase());
  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }
  const enName = toSnakeCaseDeviceParamName(definition.enName);
  if (enName === "status") {
    const normalizedStatus = normalizeDeviceStatusForE(text);
    if (allowedValues.includes(normalizedStatus)) {
      return normalizedStatus;
    }
  }
  if (enName === "run_stat") {
    const normalizedRunStat = normalizeRunStatForE(text);
    const runStatAliases: Record<string, string[]> = {
      "1": ["1", "运行"],
      "0": ["0", "停运"]
    };
    const mapped = runStatAliases[normalizedRunStat]?.find((candidate) => allowedValues.includes(candidate));
    if (mapped) {
      return mapped;
    }
  }
  if (enName.includes("control_type")) {
    const normalizedControlType = normalizeControlTypeForE(text).toUpperCase();
    if (allowedValues.includes(normalizedControlType)) {
      return normalizedControlType;
    }
    if (HYDROGEN_COUPLING_SECTIONS.has(section) && ["PQ", "PV", "PH"].includes(normalizedControlType)) {
      return allowedValues.includes("P") ? "P" : text;
    }
    if ((normalizedControlType === "0" || normalizedControlType === "SLACK") && allowedValues.includes("NONE")) {
      return "NONE";
    }
  }
  return text;
}

export function resolveNodeEnumParameterBindings(
  node: Pick<ModelNode, "kind" | "name" | "terminals" | "params">,
  template?: DeviceTemplate
): DeviceEnumParameterBinding[] {
  const section = inferESection(node.kind, node.params);
  const bindings: DeviceEnumParameterBinding[] = resolveNodeParameterDefinitions(node, template)
    .filter(isEnumParameterDefinition)
    .map((definition) => ({
      paramKey: definition.enName,
      definition,
      value: String(node.params[definition.enName] ?? "").trim(),
      section
    }));
  if (!isContainerParams(node.params)) {
    return bindings;
  }
  const resolvedTemplate = template ?? DEVICE_LIBRARY_BY_KIND.get(node.kind) ?? DEVICE_LIBRARY_BY_KIND.get(baseDeviceKind(node.kind));
  for (const view of buildContainerDeviceParameterViews(node, resolvedTemplate)) {
    const componentLibrary = String(view.componentLibrary ?? "").trim();
    if (view.kind === "container" || !componentLibrary) {
      continue;
    }
    for (const row of view.rows) {
      if (!row.paramKey || !Object.prototype.hasOwnProperty.call(node.params, row.paramKey)) {
        continue;
      }
      const definition = sectionEnumParameterDefinition(componentLibrary, row.key);
      if (!definition) {
        continue;
      }
      bindings.push({
        paramKey: row.paramKey,
        definition,
        value: String(node.params[row.paramKey] ?? "").trim(),
        section: componentLibrary
      });
    }
  }
  return bindings;
}

export function validateNodeEnumParameters(
  node: Pick<ModelNode, "kind" | "name" | "terminals" | "params">,
  template?: DeviceTemplate
): DeviceEnumParameterIssue[] {
  return resolveNodeEnumParameterBindings(node, template).flatMap((binding) => {
    const allowedValues = enumValuesForParameterDefinition(binding.definition);
    if (!binding.value && binding.definition.typicalValue && allowedValues.includes(binding.definition.typicalValue)) {
      return [];
    }
    return allowedValues.includes(binding.value) ? [] : [{ ...binding, allowedValues }];
  });
}

export function normalizeKnownLegacyNodeEnumValues(
  node: ModelNode,
  template?: DeviceTemplate
): ModelNode {
  let nextParams = node.params;
  for (const binding of resolveNodeEnumParameterBindings(node, template)) {
    const normalizedValue = normalizeKnownLegacyEnumValue(binding.section, binding.definition, binding.value);
    if (normalizedValue === binding.value) {
      continue;
    }
    if (nextParams === node.params) {
      nextParams = { ...node.params };
    }
    nextParams[binding.paramKey] = normalizedValue;
  }
  return nextParams === node.params ? node : { ...node, params: nextParams };
}

function isTemplateDefinitionStoredParam(enName: string) {
  return Boolean(enName) && !TEMPLATE_DEFINITION_PARAM_METADATA_KEYS.has(enName);
}

export function reconcileNodeParamsWithTemplateDefinitions(
  node: ModelNode,
  template: Pick<DeviceTemplate, "parameterDefinitions">,
  previousDefinitions?: readonly DeviceParameterDefinition[]
): ModelNode {
  const nextDefinitions = normalizeTemplateDefinitionList(template.parameterDefinitions);
  const previousDefinitionList = previousDefinitions
    ? normalizeTemplateDefinitionList(previousDefinitions)
    : parseStoredTemplateParameterDefinitions(node.params);
  const nextDefinitionKeys = new Set(nextDefinitions.map((definition) => definition.enName));
  let changed = false;
  const nextParams: Record<string, string> = { ...node.params };

  for (const definition of previousDefinitionList) {
    if (!isTemplateDefinitionStoredParam(definition.enName) || nextDefinitionKeys.has(definition.enName)) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(nextParams, definition.enName)) {
      delete nextParams[definition.enName];
      changed = true;
    }
  }

  for (const definition of nextDefinitions) {
    if (!isTemplateDefinitionStoredParam(definition.enName)) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(nextParams, definition.enName)) {
      nextParams[definition.enName] = definition.typicalValue;
      changed = true;
    }
  }

  const serializedDefinitions = JSON.stringify(nextDefinitions);
  if (nextDefinitions.length > 0) {
    if (nextParams[CUSTOM_PARAM_DEFINITIONS_KEY] !== serializedDefinitions) {
      nextParams[CUSTOM_PARAM_DEFINITIONS_KEY] = serializedDefinitions;
      changed = true;
    }
  } else if (Object.prototype.hasOwnProperty.call(nextParams, CUSTOM_PARAM_DEFINITIONS_KEY)) {
    delete nextParams[CUSTOM_PARAM_DEFINITIONS_KEY];
    changed = true;
  }

  return changed ? { ...node, params: nextParams } : node;
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

export function applyContainerAssociatedDeviceDefaults(
  params: Record<string, string>,
  template: DeviceTemplate
): Record<string, string> {
  const templateKind = baseDeviceKind(template.kind);
  const electrolyzer = templateKind === "ac-electrolyzer" || templateKind === "dc-electrolyzer";
  const fuelCell = templateKind === "ac-fuel-cell" || templateKind === "dc-fuel-cell";
  if (!template.isContainer || (!electrolyzer && !fuelCell)) {
    return params;
  }
  const ratedPower = electrolyzer ? "5" : "3";
  const ratedVoltage = template.terminalType === "ac" ? "10" : "750";
  const hydrogenFlow = electrolyzer ? "1000" : "600";
  const terminalTypes = templateTerminalTypes(template);
  const terminalAssociations = template.terminalAssociations ?? [];
  const terminalRoles = template.terminalRoles ?? [];
  let next = params;
  for (let terminalIndex = 0; terminalIndex < terminalTypes.length; terminalIndex += 1) {
    const dependent = terminalAssociations.length
      ? isContainerTerminalAssociationDependent(terminalAssociations, terminalIndex)
      : isContainerTerminalRoleDependent(terminalRoles, terminalIndex);
    if (dependent) {
      continue;
    }
    const association = getEffectiveContainerTerminalAssociation(
      terminalAssociations,
      terminalTypes,
      terminalIndex,
      terminalRoles
    );
    const role = getEffectiveContainerTerminalRole(terminalRoles, terminalIndex);
    const relationKey = terminalAssociations.length
      ? getContainerAssociationRelationKey(association, terminalIndex)
      : getContainerRelationKey(terminalTypes[terminalIndex], role, terminalIndex);
    const section = containerRelationCounterKey(relationKey);
    const defaults = section === "ACLoad"
      ? { rated_capacity: ratedPower, p_max: ratedPower, p_min: "0", q_max: ratedPower, q_min: `-${ratedPower}` }
      : section === "DCLoad"
        ? { rated_capacity: ratedPower, p_max: ratedPower, p_min: "0" }
        : section === "ACGenerator"
          ? { rated_capacity: ratedPower, rated_voltage: ratedVoltage, p_max: ratedPower, p_min: "0", q_max: ratedPower, q_min: `-${ratedPower}` }
          : section === "DCGenerator"
            ? { rated_capacity: ratedPower, rated_voltage: ratedVoltage, p_max: ratedPower, p_min: "0" }
            : section === "HydroSource"
              ? {
                  rated_capacity: hydrogenFlow,
                  control_type: "FLOW",
                  pressure_set: HYDROGEN_SOURCE_DEFAULTS.pressure,
                  pressure_max: HYDROGEN_SOURCE_DEFAULTS.pressureMax,
                  pressure_min: HYDROGEN_SOURCE_DEFAULTS.pressureMin,
                  flow_set: hydrogenFlow,
                  flow_max: hydrogenFlow,
                  flow_min: HYDROGEN_SOURCE_DEFAULTS.flowMin
                }
              : section === "HydroLoad"
                ? {
                    rated_capacity: hydrogenFlow,
                    control_type: "FLOW",
                    pressure_set: HYDROGEN_LOAD_DEFAULTS.pressure,
                    pressure_max: HYDROGEN_LOAD_DEFAULTS.pressureMax,
                    pressure_min: HYDROGEN_LOAD_DEFAULTS.pressureMin,
                    flow_set: hydrogenFlow,
                    flow_max: hydrogenFlow,
                    flow_min: HYDROGEN_LOAD_DEFAULTS.flowMin
                  }
                : {};
    for (const [column, value] of Object.entries(defaults)) {
      const paramKey = containerRelationParamKey(relationKey, column);
      if (next[paramKey] !== undefined) {
        continue;
      }
      if (next === params) {
        next = { ...params };
      }
      next[paramKey] = value;
    }
  }
  return next;
}

const HYDROGEN_COUPLING_BODY_RUNTIME_FIELDS = new Set([
  "rated_voltage",
  "rated_power",
  "rated_capacity",
  "hydrogen_flow",
  "vbase",
  "p",
  "q",
  "u",
  "voltage",
  "flow"
]);

export function normalizeHydrogenCouplingBodyParams(node: ModelNode, template?: DeviceTemplate): ModelNode {
  const templateKind = baseDeviceKind(template?.kind ?? node.kind);
  if (![
    "ac-electrolyzer",
    "dc-electrolyzer",
    "ac-fuel-cell",
    "dc-fuel-cell"
  ].includes(templateKind)) {
    return node;
  }
  let params = node.params;
  for (const field of HYDROGEN_COUPLING_BODY_RUNTIME_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(params, field)) {
      continue;
    }
    if (params === node.params) {
      params = { ...node.params };
    }
    delete params[field];
  }
  return params === node.params ? node : { ...node, params };
}

export function buildDefaultParams(template: DeviceTemplate): Record<string, string> {
  const templateKind = baseDeviceKind(template.kind) as DeviceKind;
  const templateStaticComponentLibrary = staticComponentLibraryForNodeLike(template.kind, template.params);
  const templateIsStaticGraphic = Boolean(templateStaticComponentLibrary);
  const withoutResizeTransformParam = (params: Record<string, string>) =>
    Object.fromEntries(Object.entries(params).filter(([key]) => key !== ALLOW_RESIZE_TRANSFORM_PARAM));
  const withStaticGraphicDefaults = (params: Record<string, string>) => {
    const componentLibrary = staticComponentLibraryForNodeLike(template.kind, params) || templateStaticComponentLibrary;
    if (!componentLibrary) {
      return params;
    }
    return {
      component_type: componentLibrary,
      [STATIC_ROUTE_AVOIDANCE_PARAM]: defaultStaticRouteAvoidanceValue(template.kind),
      ...params
    };
  };
  const withDeviceLabelDefaults = (params: Record<string, string>) =>
    templateIsStaticGraphic
      ? params
      : {
          _labelVisible: "1",
          _labelDisplayMode: "follow",
          _labelX: "0",
          _labelY: String(Math.round(template.size.height / 2 + DEFAULT_DEVICE_LABEL_GAP)),
          _labelColor: "#334155",
          _labelFontSize: String(DEFAULT_DEVICE_LABEL_FONT_SIZE),
          _labelFontFamily: "Arial",
          _labelFontWeight: "500",
          _labelFontStyle: "normal",
          _labelTextDecoration: "none",
          _labelTextAnchor: "middle",
          _labelRotation: "0",
          ...params
        };
  const withStatusDefault = (params: Record<string, string>) => {
    if (templateIsStaticGraphic) {
      return params;
    }
    const templateExplicitStatus = normalizeDeviceStateValue(template.params?.status);
    if (Array.isArray(template.stateDefinitions) && template.stateDefinitions.length > 0 && !templateExplicitStatus) {
      const { status, ...rest } = params;
      void status;
      return rest;
    }
    const states = getTemplateStateDefinitions({ ...template, params });
    const defaultStatus = defaultDeviceStatusValue({ ...template, params }) || "1";
    const explicitStatus = normalizeDeviceStateValue(params.status);
    if (!explicitStatus) {
      return { ...params, status: defaultStatus };
    }
    if (states.length === 0) {
      return { ...params, status: explicitStatus };
    }
    const exact = states.find((state) => state.value === explicitStatus);
    if (exact) {
      return { ...params, status: exact.value };
    }
    const normalized = normalizeDeviceStatusForE(explicitStatus);
    const mapped = states.find((state) => normalizeDeviceStatusForE(state.value) === normalized);
    return { ...params, status: mapped?.value ?? normalized };
  };
  const withTemplateDefinitions = (
    params: Record<string, string>,
    definitionFilter?: (definition: DeviceParameterDefinition) => boolean
  ) => {
    const resolved = withDeviceLabelDefaults(
      withStatusDefault(
        applyTemplateDefinitionDefaults(
          applyContainerRelationDefaults(
            applyContainerAssociatedDeviceDefaults(
              withStaticButtonCapability(template.kind, withStaticGraphicDefaults(withoutResizeTransformParam(params))),
              template
            ),
            template
          ),
          template,
          definitionFilter
        )
      )
    );
    return templateIsStaticGraphic ? resolved : normalizeDeviceParamRecord(resolved) ?? resolved;
  };
  if (templateIsStaticGraphic) {
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
      if (definition.enName === "name" || definition.enName === "is_container" || definition.enName === ALLOW_RESIZE_TRANSFORM_PARAM) {
        continue;
      }
      params[definition.enName] = params[definition.enName] ?? definition.typicalValue;
    }
    return withTemplateDefinitions(params);
  }
  if (isPureHydrogenNetworkKind(templateKind) || isPureThermalNetworkKind(templateKind)) {
    return withTemplateDefinitions(withRunStat({ ...template.params }));
  }
  if (template.isContainer && isElectricGenerationContainerKind(templateKind)) {
    return withTemplateDefinitions(withRunStat({ ...template.params }));
  }
  if (templateKind === "ac-storage") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: deviceParamValue(template.params, "rated_power") ?? "5 MW",
      controlType: "PQ",
      p_set: "0.0",
      q_set: "0.0",
      v_set: "10",
      alpha: "1.0"
    })));
  }
  if (templateKind === "dc-storage") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: deviceParamValue(template.params, "rated_power") ?? "5 MW",
      controlType: "P",
      v_set: "750",
      p_set: "0.0",
      i_set: "0.0"
    })));
  }
  const electricGenerationDerivedInfo = electricGenerationDerivedComponentLibraryInfo(templateKind);
  if (electricGenerationDerivedInfo) {
    return withTemplateDefinitions(
      withRunStat({ ...template.params }),
      (definition) => !isDerivedComponentCommonFieldName(definition.enName, electricGenerationDerivedInfo.baseComponentLibrary)
    );
  }
  if (isGeneratorKind(templateKind)) {
    const base: Record<string, string> = {
      ratedCapacity: deviceParamValue(template.params, "rated_power") ?? deviceParamValue(template.params, "rated_capacity") ?? "10 MW",
      controlType: type === "ac" ? "PV" : "P"
    };
    if (templateKind.includes("wind-source")) {
      base.cutInWindSpeed = "3";
      base.ratedWindSpeed = "12";
      base.cutOutWindSpeed = "25";
    }
    return withTemplateDefinitions(withRunStat(withDefaultVbase({ ...template.params, ...base })));
  }
  if (templateKind === "ac-load" || templateKind === "ac-terminal-transformer-load") {
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
  if (templateKind === "dc-load") {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ratedActivePower: "1.5 MW",
      pv0: "1.0",
      pv1: "0.0",
      pv2: "0.0"
    })));
  }
  if (
    templateKind === "ac-electrolyzer" ||
    templateKind === "dc-electrolyzer" ||
    templateKind === "ac-fuel-cell" ||
    templateKind === "dc-fuel-cell"
  ) {
    const controlType = templateKind === "ac-electrolyzer" || templateKind === "dc-electrolyzer"
      ? "FLOW"
      : "P";
    return withTemplateDefinitions(withRunStat({
      ...template.params,
      controlType
    }));
  }
  if (
    templateKind === "ac-heater" ||
    templateKind === "dc-heater" ||
    templateKind === "ac-two-port-heater" ||
    templateKind === "dc-two-port-heater"
  ) {
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ...template.params,
      ratedCapacity: deviceParamValue(template.params, "rated_power") ?? "5 MW",
      controlType: "P",
      e2hCoeff: deviceParamValue(template.params, "e2h_coeff") ?? "1.0"
    })));
  }
  if (templateKind === "ac-line" || templateKind === "dc-line") {
    if (templateKind === "dc-line") {
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
  if (templateKind === "ac-two-winding-transformer" || templateKind === "ac-transformer") {
    return withTemplateDefinitions(withRunStat({
      highVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      lowVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      ratedCapacity: "50",
      r: "0.0",
      x: "0.1",
      gt: "0.0",
      bt: "0.0",
      tap: "1.0",
      shift: "0"
    }));
  }
  if (templateKind === "ac-three-winding-transformer" || templateKind === "ac-three-winding-transformer-neutral") {
    const visibleNeutral = templateKind === "ac-three-winding-transformer-neutral";
    return withTemplateDefinitions(withRunStat({
      neutral_node: "",
      neutral_vbase: visibleNeutral ? DEFAULT_INITIAL_TERMINAL_VBASE : "1.0",
      highVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      mediumVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      lowVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      highRatedCapacity: "90",
      mediumRatedCapacity: "90",
      lowRatedCapacity: "90",
      ...THREE_WINDING_TRANSFORMER_E_DEFAULT_PARAMS
    }));
  }
  if (templateKind === "dcdc-converter") {
    return normalizeEndpointConverterControlParams("DCDCConverter", withTemplateDefinitions(withRunStat({
      ...template.params,
      sourceVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      targetVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      i_control_type: "P",
      j_control_type: "NONE"
    })));
  }
  if (templateKind === "acdc-converter" || templateKind === "dcac-converter") {
    return normalizeDcacConverterControlParams(withTemplateDefinitions(withRunStat({
      ...template.params,
      sourceVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      targetVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      ac_control_type: "PQ",
      dc_control_type: "V",
      p_dc_set: "0.0",
      v_ac_set: "0.0",
      v_dc_set: "0.0"
    })));
  }
  if (templateKind === "acac-converter") {
    return normalizeEndpointConverterControlParams("ACACConverter", withTemplateDefinitions(withRunStat({
      ...template.params,
      sourceVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      targetVbase: DEFAULT_INITIAL_TERMINAL_VBASE,
      sourceEquivalentResistance: "0.0",
      targetEquivalentResistance: "0.0",
      i_control_type: "PQ",
      j_control_type: "PQ"
    })));
  }
  if (
    templateKind === "ac-switch" ||
    templateKind === "dc-switch" ||
    templateKind === "ac-disconnector" ||
    templateKind === "dc-disconnector" ||
    templateKind === "ac-ground-disconnector" ||
    templateKind === "ac-ground-disconnector-vertical" ||
    templateKind === "ac-breaker" ||
    templateKind === "ac-box-breaker" ||
    templateKind === "dc-breaker"
  ) {
    const isGroundDisconnector = templateKind === "ac-ground-disconnector" || templateKind === "ac-ground-disconnector-vertical";
    return withTemplateDefinitions(withRunStat(withDefaultVbase({
      ratedCapacity: template.terminalType === "ac" ? "1250 A" : "1600 A",
      status: isGroundDisconnector ? "0" : "1"
    })));
  }
  return withTemplateDefinitions(withRunStat(withDefaultVbase({ ...template.params })));
}

export function migrateElectricGenerationContainerParams(node: ModelNode, template: DeviceTemplate): ModelNode {
  if (!template.isContainer || !isLegacyElectricGenerationContainerKind(template.kind)) {
    return node;
  }
  const defaultParams = buildDefaultParams(template);
  const hasMissingDefaults = Object.keys(defaultParams).some((key) =>
    !Object.prototype.hasOwnProperty.call(node.params, key)
  );
  if (!hasMissingDefaults && node.params.is_container === "1") {
    return node;
  }
  return {
    ...node,
    params: {
      ...defaultParams,
      ...node.params,
      is_container: "1"
    }
  };
}

// 节点操作相关代码已提取到独立模块
export * from "./model-node-ops";

// 连线路由相关代码已提取到独立模块
import {
  busTerminalTypeByKind,
  createTemplateTerminals,
  ensureRoutableLineDevicePathParam,
  virtualBusTerminal
} from "./model-routing";
export * from "./model-routing";
