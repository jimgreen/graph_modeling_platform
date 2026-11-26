/** 图上建模平台核心领域类型定义（从 model.ts 拆分，纯底层无反向依赖）。 */

import type { ProjectMeasurementConfig } from "../measurements.ts";
import type { DeviceMeasurementDefinition } from "../measurementDefinitionTypes.ts";

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
  | "ac-station-source"
  | "ac-feeder-source"
  | "ac-district-source"
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
  | "ac-station-load"
  | "ac-feeder-load"
  | "ac-district-load"
  | "ac-terminal-transformer-load"
  | "ac-transformer"
  | "ac-two-winding-transformer"
  | "ac-three-winding-transformer"
  | "ac-three-winding-transformer-neutral"
  | "dc-source"
  | "dc-station-source"
  | "dc-feeder-source"
  | "dc-district-source"
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
  | "dc-station-load"
  | "dc-feeder-load"
  | "dc-district-load"
  | "dc-transformer"
  | "dcdc-converter"
  | "acdc-converter"
  | "dcac-converter"
  | "acac-converter"
  | "ac-endpoint-container"
  | "ac-vpp-box"
  | "ac-switch-box"
  | "ac-distribution-box"
  | "dc-vpp-box"
  | "hydrogen-vpp-box"
  | "heat-vpp-box"
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
  /** Editable English display name. `kind` remains the stable runtime identity. */
  englishName?: string;
  /** Explicit class identity used by persisted concrete elements. */
  componentClass?: string;
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
  parameterDefinitionsIntent?: "delete-all";
  /** An applied persisted override is a complete table; omitted fields were explicitly deleted. */
  parameterDefinitionsComplete?: boolean;
  measurementDefinitions?: DeviceMeasurementDefinition[];
  measurementDefinitionsIntent?: "delete-all";
  stateDefinitions?: DeviceStateDefinition[];
  rotation?: number;
};

export type DeviceTemplateDefinitionOverride = {
  kind: string;
  label?: string;
  /** Editable English display name for built-in and persisted templates. */
  englishName?: string;
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
  parameterDefinitionsIntent?: "delete-all";
  measurementDefinitions?: DeviceMeasurementDefinition[];
  measurementDefinitionsIntent?: "delete-all";
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
  /** 所属交流容器节点 id;空 = 无容器 */
  containerId?: string;
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

export const MODEL_TYPES = ["厂站", "馈线", "台区", "微网", "其他"] as const;

export type ModelType = (typeof MODEL_TYPES)[number];

/**
 * 电流流水线外观设置：各项全部可选，缺省值与 buildElectricFlowStyleMarkup 内置 CSS 变量一致。
 *
 * - durationSeconds：动画周期（秒），越小越快。0/负数视为非法，回落默认。
 * - arrowFill：箭头填充色（任意 CSS color）。
 * - arrowStroke：箭头描边色（轮廓颜色）。
 * - arrowStrokeWidth：轮廓宽度（CSS px 数值）。
 * - arrowSize：箭头大小（基准图元约 8px，此值是缩放系数，1 = 默认）。
 * - arrowStyleId：箭头形状预设 id（见 ELECTRIC_FLOW_ARROW_STYLES）。
 * - arrowSpacing：箭头密度 —— 沿线路方向相邻箭头的目标间距（SVG px，按路径实长换算
 *   每边箭头数，**与边长无关**：100px 的线和 400px 的线上相邻箭头屏上距离相同）。
 *   合法区间 10~400，非法回落默认。
 */
export type ElectricFlowSettings = {
  durationSeconds?: number;
  arrowFill?: string;
  arrowStroke?: string;
  arrowStrokeWidth?: number;
  arrowSize?: number;
  arrowStyleId?: string;
  arrowSpacing?: number;
};

/** 单个箭头形状预设：id + 显示名 + 基准图元 `d`（顶点朝局部 +x，几何中心在原点）。 */
export type ElectricFlowArrowStyle = {
  id: string;
  label: string;
  pathD: string;
};

export type ProjectFile = {
  version: 1;
  name: string;
  idx?: number;
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
  // 背景页引用键：模型全局 idx（服务端据它定位被引用模型重建背景页；前端 id 服务端无法解析）
  backgroundProjectIdx?: number;
  backgroundLayerIds?: string[];
  // 电流流水线（沿线路移动的方向箭头）是否显示。默认关 —— 它是纯显示开关，
  // 而导出 SVG / E 文件读的是存档里的这个值，默认开着会改掉存量模型的导出基线。
  electricFlowVisible?: boolean;
  // 电流流水线外观设置（随方案存档）。四项均为可选：缺省走内置默认值，
  // 与 buildElectricFlowStyleMarkup 的 CSS 变量默认值一一对应。
  electricFlowSettings?: ElectricFlowSettings;
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
  modelType?: ModelType;
  substation?: string;
  feeder?: string;
  taiqu?: string;
};

export type DeviceIndexCounters = Record<string, number>;

export const TWO_WINDING_TRANSFORMER_KINDS: ReadonlySet<string> = new Set([
  "ac-transformer",
  "ac-two-winding-transformer"
]);

export const THREE_WINDING_NEUTRAL_TRANSFORMER_KIND = "ac-three-winding-transformer-neutral";

export const THREE_WINDING_TRANSFORMER_KINDS: ReadonlySet<string> = new Set([
  "ac-three-winding-transformer",
  THREE_WINDING_NEUTRAL_TRANSFORMER_KIND
]);

export const isTwoWindingTransformerKind = (kind: string | undefined): boolean =>
  TWO_WINDING_TRANSFORMER_KINDS.has(kind as string);

export const isThreeWindingTransformerKind = (kind: string | undefined): boolean =>
  THREE_WINDING_TRANSFORMER_KINDS.has(kind as string);

export const isThreeWindingNeutralTransformerKind = (kind: string | undefined): boolean =>
  kind === THREE_WINDING_NEUTRAL_TRANSFORMER_KIND;
