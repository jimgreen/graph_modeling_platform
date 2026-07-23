import {
  DEFAULT_DEVICE_LABEL_FONT_SIZE,
  describeContainerTerminalAssociations,
  getSafeNodeScaleX,
  getSafeNodeScaleY,
  getTemplateParameterDefinitions,
  inferESection,
  templateDerivedComponentLibraryInfo,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type ModelNode
} from "./model";
import { finiteNumber, degreesToRadians } from "./formatUtils";
import { clampNumber } from "./canvasViewport";

export type MeasurementValueType = "number" | "string" | "boolean";
export type MeasurementQuality = "good" | "bad" | "stale" | "missing";
export type MeasurementGroupAnchor = "top" | "bottom" | "left" | "right" | "custom";
export type MeasurementGroupLayout = "vertical" | "horizontal" | "grid";
export type MeasurementFontWeight = "400" | "500" | "700";
export type MeasurementFontStyle = "normal" | "italic";
export type MeasurementTextDecoration = "none" | "underline";
export type MeasurementGroupBorderStyle = "none" | "solid" | "dashed" | "dotted";

export type MeasurementGroupDefaults = {
  backgroundColor: string;
  borderColor: string;
  borderStyle: MeasurementGroupBorderStyle;
  borderWidth: number;
};

export type MeasurementStyleOverride = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: MeasurementFontWeight;
  fontStyle?: MeasurementFontStyle;
  textDecoration?: MeasurementTextDecoration;
};

export type MeasurementTypeDefinition = {
  id: string;
  key: string;
  name: string;
  shortLabel: string;
  defaultUnit: string;
  valueType: MeasurementValueType;
  defaultDecimals: number;
  defaultColor: string;
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultFontWeight: MeasurementFontWeight;
  defaultVisible: boolean;
};

export type DeviceMeasurementProfileItem = {
  name?: string;
  measurementTypeId: string;
  position?: string;
  associatedField?: string;
  role?: string;
  defaultVisible?: boolean;
  labelOverride?: string;
  unitOverride?: string;
  decimalsOverride?: number;
  styleOverride?: MeasurementStyleOverride;
};

export type DeviceMeasurementProfile = {
  deviceKind: string;
  items: DeviceMeasurementProfileItem[];
};

export type MeasurementProfilePositionDefinition = {
  value: string;
  label: string;
  deviceModel?: string;
  parameterDefinitions: readonly DeviceParameterDefinition[];
};

export type MeasurementProfilePositionSource = Pick<DeviceTemplate, "kind" | "terminalCount"> &
  Partial<Pick<DeviceTemplate,
    | "label"
    | "categoryLibrary"
    | "size"
    | "params"
    | "terminalType"
    | "terminalTypes"
    | "terminalLabels"
    | "terminalRoles"
    | "terminalAssociations"
    | "isContainer"
    | "parameterDefinitions"
  >>;

function measurementParameterDefinitionKey(definition: Pick<DeviceParameterDefinition, "enName">) {
  return String(definition.enName ?? "").trim().toLowerCase();
}

function mergeMeasurementParameterDefinitions(
  ...definitionGroups: readonly (readonly DeviceParameterDefinition[] | undefined)[]
): DeviceParameterDefinition[] {
  const seen = new Set<string>();
  const merged: DeviceParameterDefinition[] = [];
  for (const definitions of definitionGroups) {
    for (const definition of definitions ?? []) {
      const key = measurementParameterDefinitionKey(definition);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(definition);
    }
  }
  return merged;
}

function derivedBaseTemplateForMeasurementSource(
  source: MeasurementProfilePositionSource,
  libraryTemplates: readonly DeviceTemplate[] = []
) {
  const derivedInfo = templateDerivedComponentLibraryInfo({ ...source, params: source.params ?? {} });
  if (!derivedInfo) {
    return undefined;
  }
  const baseLibraryKey = String(derivedInfo.baseComponentLibrary ?? "").trim().toLowerCase();
  if (!baseLibraryKey) {
    return undefined;
  }
  return libraryTemplates.find((template) =>
    !templateDerivedComponentLibraryInfo(template) &&
    String(inferESection(template.kind, template.params ?? {})).trim().toLowerCase() === baseLibraryKey
  );
}

export function buildMeasurementProfilePositionDefinitions(options: {
  source: MeasurementProfilePositionSource;
  parameterDefinitions?: readonly DeviceParameterDefinition[];
  libraryTemplates?: readonly DeviceTemplate[];
}): MeasurementProfilePositionDefinition[] {
  const { source } = options;
  const directParameterDefinitions = options.parameterDefinitions ?? source.parameterDefinitions ?? [];
  const derivedBaseTemplate = derivedBaseTemplateForMeasurementSource(source, options.libraryTemplates);
  const parentParameterDefinitions = mergeMeasurementParameterDefinitions(
    derivedBaseTemplate ? getTemplateParameterDefinitions(derivedBaseTemplate) : undefined,
    directParameterDefinitions
  );
  const positions: MeasurementProfilePositionDefinition[] = [{
    value: "device",
    label: "设备本体",
    parameterDefinitions: parentParameterDefinitions
  }];
  const terminalCount = Math.max(0, Number(source.terminalCount) || 0);
  if (!source.isContainer || terminalCount === 0) {
    return positions;
  }

  const associationTemplate: DeviceTemplate = {
    kind: source.kind,
    label: source.label ?? String(source.kind),
    categoryLibrary: source.categoryLibrary ?? "",
    size: source.size ?? { width: 1, height: 1 },
    params: source.params ?? {},
    terminalType: source.terminalType ?? source.terminalTypes?.[0] ?? "ac",
    terminalCount,
    terminalTypes: source.terminalTypes ? [...source.terminalTypes] : undefined,
    terminalLabels: source.terminalLabels ? [...source.terminalLabels] : undefined,
    terminalRoles: source.terminalRoles ? [...source.terminalRoles] : undefined,
    terminalAssociations: source.terminalAssociations ? [...source.terminalAssociations] : undefined,
    isContainer: true,
    parameterDefinitions: [...parentParameterDefinitions]
  };
  const templateByDeviceModel = new Map<string, DeviceTemplate>();
  for (const template of options.libraryTemplates ?? []) {
    const deviceModel = String(inferESection(template.kind, template.params) ?? "").trim().toLowerCase();
    if (deviceModel && !templateByDeviceModel.has(deviceModel)) {
      templateByDeviceModel.set(deviceModel, template);
    }
  }

  for (const association of describeContainerTerminalAssociations(associationTemplate)) {
    const deviceModelKey = String(association.deviceModel ?? "").trim().toLowerCase();
    const associatedTemplate = templateByDeviceModel.get(deviceModelKey);
    const roleLabel = String(association.roleLabel ?? "").trim();
    positions.push({
      value: `t${association.terminalIndex + 1}`,
      label: `端${association.terminalIndex + 1}${roleLabel ? `（${roleLabel}）` : ""}`,
      deviceModel: association.deviceModel,
      parameterDefinitions: associatedTemplate ? getTemplateParameterDefinitions(associatedTemplate) : []
    });
  }
  return positions;
}

export type PlatformMeasurementConfig = {
  groupDefaults: MeasurementGroupDefaults;
  measurementTypes: MeasurementTypeDefinition[];
  deviceProfiles: DeviceMeasurementProfile[];
};

export type PlatformMeasurementConfigInput = {
  groupDefaults?: Partial<MeasurementGroupDefaults>;
  measurementTypes?: Array<Partial<MeasurementTypeDefinition>>;
  deviceProfiles?: Array<Partial<DeviceMeasurementProfile> & { items?: Partial<DeviceMeasurementProfileItem>[] }>;
};

export type MeasurementItemBinding = {
  id: string;
  name?: string;
  measurementTypeId: string;
  role?: string;
  sourcePoint: string;
  visible?: boolean;
  labelOverride?: string;
  unitOverride?: string;
  decimalsOverride?: number;
  styleOverride?: MeasurementStyleOverride;
};

export type MeasurementGroup = {
  id: string;
  nodeId: string;
  terminalId?: string;
  visible: boolean;
  labelVisible?: boolean;
  unitVisible?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: MeasurementGroupBorderStyle;
  borderWidth?: number;
  anchor: MeasurementGroupAnchor;
  offset: { x: number; y: number };
  layout: MeasurementGroupLayout;
  groupStyleOverride?: MeasurementStyleOverride;
  items: MeasurementItemBinding[];
};

export type ProjectMeasurementConfig = {
  version: 1;
  groups: MeasurementGroup[];
};

export const DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR = "transparent";
export const DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR = "#64748b";
export const DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE: MeasurementGroupBorderStyle = "none";
export const DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH = 0;

export type MeasurementRuntimeValue = {
  sourcePoint: string;
  value: number | string | boolean | null;
  unit?: string;
  quality: MeasurementQuality;
  timestamp: number;
  sequence?: number;
};

export type ResolvedMeasurementDisplay = {
  label: string;
  unit: string;
  decimals: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: MeasurementFontWeight;
  fontStyle: MeasurementFontStyle;
  textDecoration: MeasurementTextDecoration;
  visible: boolean;
};

const DEFAULT_TYPE_VALUES = {
  defaultUnit: "",
  valueType: "number" as MeasurementValueType,
  defaultDecimals: 3,
  defaultColor: "#334155",
  defaultFontFamily: "Arial",
  defaultFontSize: 14,
  defaultFontWeight: "500" as MeasurementFontWeight,
  defaultVisible: true
};
const LEGACY_DEFAULT_MEASUREMENT_FONT_SIZE = 12;

function normalizedDefaultMeasurementFontSize(value: unknown, fallback?: MeasurementTypeDefinition) {
  const next = clampNumber(finiteNumber(value, fallback?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize), 6, 96);
  return fallback?.defaultFontSize === DEFAULT_TYPE_VALUES.defaultFontSize && next === LEGACY_DEFAULT_MEASUREMENT_FONT_SIZE
    ? DEFAULT_TYPE_VALUES.defaultFontSize
    : next;
}

export const DEFAULT_MEASUREMENT_CONFIG: PlatformMeasurementConfig = {
  groupDefaults: {
    backgroundColor: DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
    borderColor: DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
    borderStyle: DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
    borderWidth: DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH
  },
  measurementTypes: [
    { id: "activePower", key: "p", name: "有功功率", shortLabel: "P", defaultUnit: "MW", valueType: "number", defaultDecimals: 3, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: true },
    { id: "reactivePower", key: "q", name: "无功功率", shortLabel: "Q", defaultUnit: "Mvar", valueType: "number", defaultDecimals: 3, defaultColor: "#475569", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: true },
    { id: "voltage", key: "u", name: "电压", shortLabel: "U", defaultUnit: "kV", valueType: "number", defaultDecimals: 2, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: true },
    { id: "current", key: "i", name: "电流", shortLabel: "I", defaultUnit: "A", valueType: "number", defaultDecimals: 1, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: false },
    { id: "frequency", key: "f", name: "频率", shortLabel: "f", defaultUnit: "Hz", valueType: "number", defaultDecimals: 2, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: false },
    { id: "pressure", key: "pressure", name: "压力", shortLabel: "压力", defaultUnit: "MPa", valueType: "number", defaultDecimals: 3, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: true },
    { id: "temperature", key: "temperature", name: "温度", shortLabel: "温度", defaultUnit: "degC", valueType: "number", defaultDecimals: 1, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: false },
    { id: "flow", key: "flow", name: "流量", shortLabel: "流量", defaultUnit: "kg/s", valueType: "number", defaultDecimals: 2, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: true },
    { id: "level", key: "level", name: "液位", shortLabel: "液位", defaultUnit: "%", valueType: "number", defaultDecimals: 1, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: true },
    { id: "status", key: "status", name: "状态", shortLabel: "状态", defaultUnit: "", valueType: "string", defaultDecimals: 0, defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500", defaultVisible: false }
  ],
  deviceProfiles: [
    { deviceKind: "ac-load", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "dc-load", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "ac-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "ac-wind-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "ac-pv-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "ac-thermal-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "ac-hydro-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "ac-nuclear-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "dc-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "dc-wind-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "dc-pv-source", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "ac-storage", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "level" }] },
    { deviceKind: "dc-storage", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }, { measurementTypeId: "level" }] },
    { deviceKind: "ac-line", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "current" }] },
    { deviceKind: "dc-line", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "ac-bus", items: [{ measurementTypeId: "voltage" }, { measurementTypeId: "frequency" }] },
    { deviceKind: "dc-bus", items: [{ measurementTypeId: "voltage" }, { measurementTypeId: "current", defaultVisible: false }] },
    { deviceKind: "ac-switch", items: [{ measurementTypeId: "status" }, { measurementTypeId: "current" }] },
    { deviceKind: "dc-switch", items: [{ measurementTypeId: "status" }, { measurementTypeId: "current" }] },
    { deviceKind: "ac-breaker", items: [{ measurementTypeId: "status" }, { measurementTypeId: "current" }] },
    { deviceKind: "dc-breaker", items: [{ measurementTypeId: "status" }, { measurementTypeId: "current" }] },
    { deviceKind: "ac-transformer", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "reactivePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "converter", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "current" }] },
    { deviceKind: "ac-electrolyzer", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "flow" }] },
    { deviceKind: "dc-electrolyzer", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "flow" }] },
    { deviceKind: "ac-fuel-cell", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "flow" }] },
    { deviceKind: "dc-fuel-cell", items: [{ measurementTypeId: "activePower" }, { measurementTypeId: "voltage" }, { measurementTypeId: "flow" }] },
    { deviceKind: "hydrogen-source", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "flow" }, { measurementTypeId: "status" }] },
    { deviceKind: "hydrogen-load", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "flow" }] },
    { deviceKind: "hydrogen-tank", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "level" }, { measurementTypeId: "temperature" }] },
    { deviceKind: "hydrogen-tank-horizontal", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "level" }, { measurementTypeId: "temperature" }] },
    { deviceKind: "hydrogen-tank-container", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "level" }, { measurementTypeId: "temperature" }] },
    { deviceKind: "hydrogen-pipeline", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "flow" }] },
    { deviceKind: "hydrogen-compressor", items: [{ measurementTypeId: "pressure" }, { measurementTypeId: "flow" }, { measurementTypeId: "status" }] },
    { deviceKind: "heat-bus", items: [{ measurementTypeId: "temperature" }, { measurementTypeId: "flow", defaultVisible: false }] },
    { deviceKind: "heat-pipeline", items: [{ measurementTypeId: "temperature" }, { measurementTypeId: "flow" }] },
    { deviceKind: "thermal-storage-tank", items: [{ measurementTypeId: "temperature" }, { measurementTypeId: "flow" }, { measurementTypeId: "level" }] },
    { deviceKind: "heat-source", items: [{ measurementTypeId: "temperature" }, { measurementTypeId: "flow" }, { measurementTypeId: "activePower" }] },
    { deviceKind: "heat-load", items: [{ measurementTypeId: "temperature" }, { measurementTypeId: "flow" }, { measurementTypeId: "activePower" }] }
  ]
};

export const EMPTY_PROJECT_MEASUREMENTS: ProjectMeasurementConfig = {
  version: 1,
  groups: []
};

const typeById = (types: readonly MeasurementTypeDefinition[]) => new Map(types.map((item) => [item.id, item]));

export function measurementFontScaleForNode(node: ModelNode): number {
  const scaleX = getSafeNodeScaleX(node);
  const scaleY = getSafeNodeScaleY(node);
  return Math.sqrt(scaleX * scaleY);
}

export function measurementOffsetScaleForNode(node: ModelNode): { x: number; y: number } {
  return {
    x: getSafeNodeScaleX(node),
    y: getSafeNodeScaleY(node)
  };
}

function normalizedFontWeight(value: unknown, fallback: MeasurementFontWeight): MeasurementFontWeight {
  return value === "400" || value === "500" || value === "700" ? value : fallback;
}

function normalizedFontStyle(value: unknown): MeasurementFontStyle {
  return value === "italic" ? "italic" : "normal";
}

function normalizedTextDecoration(value: unknown): MeasurementTextDecoration {
  return value === "underline" ? "underline" : "none";
}

function normalizedValueType(value: unknown, fallback: MeasurementValueType): MeasurementValueType {
  return value === "string" || value === "boolean" || value === "number" ? value : fallback;
}

function normalizedAnchor(value: unknown): MeasurementGroupAnchor {
  return value === "top" || value === "left" || value === "right" || value === "custom" ? value : "bottom";
}

function normalizedLayout(value: unknown): MeasurementGroupLayout {
  return value === "horizontal" || value === "grid" ? value : "vertical";
}

function normalizedGroupBorderStyle(value: unknown): MeasurementGroupBorderStyle | undefined {
  if (value === "none" || value === "solid" || value === "dashed" || value === "dotted") {
    return value;
  }
  return undefined;
}

function normalizedGroupColor(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const color = String(value).trim();
  return color ? color : undefined;
}

function normalizedGroupBorderWidth(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return clampNumber(finiteNumber(value, 1), 0, 12);
}

function normalizedProfilePosition(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const position = String(value).trim();
  return position ? position : undefined;
}

function normalizedAssociatedField(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const associatedField = String(value).trim();
  return associatedField ? associatedField : undefined;
}

function baseDeviceKind(kind: string): string {
  return kind.endsWith("-vertical") && kind !== "ac-ground-disconnector-vertical"
    ? kind.slice(0, -"-vertical".length)
    : kind;
}

function fallbackMeasurementProfileKinds(kind: string): string[] {
  const baseKind = baseDeviceKind(kind);
  const fallbacks: string[] = [];
  const push = (profileKind: string) => {
    if (profileKind !== baseKind && !fallbacks.includes(profileKind)) {
      fallbacks.push(profileKind);
    }
  };
  if (baseKind.includes("transformer")) {
    push("ac-transformer");
  }
  if (baseKind.includes("converter")) {
    push("converter");
  }
  if (baseKind.includes("line") || baseKind.includes("branch")) {
    if (baseKind.startsWith("ac-")) push("ac-line");
    if (baseKind.startsWith("dc-")) push("dc-line");
    if (baseKind.startsWith("heat-")) push("heat-pipeline");
  }
  if (baseKind.includes("pipeline")) {
    if (baseKind.startsWith("hydrogen-")) push("hydrogen-pipeline");
    if (baseKind.startsWith("heat-")) push("heat-pipeline");
  }
  if (baseKind.includes("bus")) {
    if (baseKind.startsWith("ac-")) push("ac-bus");
    if (baseKind.startsWith("dc-")) push("dc-bus");
    if (baseKind.startsWith("heat-")) push("heat-bus");
    if (baseKind.startsWith("hydrogen-")) push("hydrogen-pipeline");
  }
  if (baseKind.includes("switch") || baseKind.includes("disconnector")) {
    if (baseKind.startsWith("ac-")) push("ac-switch");
    if (baseKind.startsWith("dc-")) push("dc-switch");
  }
  if (baseKind.includes("breaker")) {
    if (baseKind.startsWith("ac-")) push("ac-breaker");
    if (baseKind.startsWith("dc-")) push("dc-breaker");
  }
  if (baseKind.includes("storage")) {
    if (baseKind.startsWith("ac-")) push("ac-storage");
    if (baseKind.startsWith("dc-")) push("dc-storage");
  }
  if (baseKind.includes("load")) {
    if (baseKind.startsWith("ac-")) push("ac-load");
    if (baseKind.startsWith("dc-")) push("dc-load");
    if (baseKind.startsWith("heat-") || baseKind.startsWith("single-port-heat-") || baseKind.startsWith("two-port-heat-")) push("heat-load");
    if (baseKind.startsWith("hydrogen-")) push("hydrogen-load");
  }
  if (baseKind.includes("source") || baseKind.includes("generator")) {
    if (baseKind.startsWith("ac-")) push("ac-source");
    if (baseKind.startsWith("dc-")) push("dc-source");
    if (baseKind.startsWith("heat-") || baseKind.startsWith("two-port-heat-")) push("heat-source");
    if (baseKind.startsWith("hydrogen-")) push("hydrogen-source");
  }
  if (baseKind.includes("heater")) {
    if (baseKind.startsWith("ac-")) push("ac-source");
    if (baseKind.startsWith("dc-")) push("dc-source");
  }
  if (baseKind.startsWith("heat-") || baseKind.startsWith("two-port-heat-") || baseKind.startsWith("three-port-heat-") || baseKind.startsWith("four-port-heat-")) {
    push("heat-source");
  }
  if (baseKind.startsWith("hydrogen-")) {
    push("hydrogen-source");
  }
  if (baseKind.startsWith("ac-")) {
    push("ac-source");
  }
  if (baseKind.startsWith("dc-")) {
    push("dc-source");
  }
  return fallbacks;
}

function measurementProfileForNode(node: ModelNode, config: PlatformMeasurementConfig): DeviceMeasurementProfile | undefined {
  const kind = node.kind;
  const baseKind = baseDeviceKind(kind);
  const componentLibrary = inferESection(node.kind, node.params);
  const directKeys = Array.from(new Set([componentLibrary, kind, baseKind].filter(Boolean)));
  return directKeys.flatMap((profileKind) => config.deviceProfiles.find((profile) => profile.deviceKind === profileKind) ?? [])[0] ??
    fallbackMeasurementProfileKinds(baseKind).flatMap((profileKind) => config.deviceProfiles.find((profile) => profile.deviceKind === profileKind) ?? [])[0];
}

function normalizeStyleOverride(value: unknown): MeasurementStyleOverride | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const source = value as MeasurementStyleOverride;
  const style: MeasurementStyleOverride = {};
  if (source.color) {
    style.color = String(source.color);
  }
  if (source.fontFamily) {
    style.fontFamily = String(source.fontFamily);
  }
  if (source.fontSize !== undefined) {
    style.fontSize = finiteNumber(source.fontSize, DEFAULT_TYPE_VALUES.defaultFontSize);
  }
  if (source.fontWeight) {
    style.fontWeight = normalizedFontWeight(source.fontWeight, DEFAULT_TYPE_VALUES.defaultFontWeight);
  }
  if (source.fontStyle) {
    style.fontStyle = normalizedFontStyle(source.fontStyle);
  }
  if (source.textDecoration) {
    style.textDecoration = normalizedTextDecoration(source.textDecoration);
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

export function normalizeMeasurementConfig(input: PlatformMeasurementConfigInput | undefined): PlatformMeasurementConfig {
  const rawGroupDefaults = input?.groupDefaults ?? DEFAULT_MEASUREMENT_CONFIG.groupDefaults;
  const groupDefaults: MeasurementGroupDefaults = {
    backgroundColor: normalizedGroupColor(rawGroupDefaults.backgroundColor) ?? DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
    borderColor: normalizedGroupColor(rawGroupDefaults.borderColor) ?? DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
    borderStyle: normalizedGroupBorderStyle(rawGroupDefaults.borderStyle) ?? DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
    borderWidth: normalizedGroupBorderWidth(rawGroupDefaults.borderWidth) ?? DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH
  };
  const defaults = typeById(DEFAULT_MEASUREMENT_CONFIG.measurementTypes);
  const rawTypes = Array.isArray(input?.measurementTypes) && input.measurementTypes.length > 0
    ? input.measurementTypes
    : DEFAULT_MEASUREMENT_CONFIG.measurementTypes;
  const seenTypes = new Set<string>();
  const measurementTypes = rawTypes.flatMap((item) => {
    const id = String((item as Partial<MeasurementTypeDefinition>)?.id ?? "").trim();
    if (!id || seenTypes.has(id)) {
      return [];
    }
    seenTypes.add(id);
    const fallback = defaults.get(id);
    const key = String(item.key ?? fallback?.key ?? id).trim() || id;
    const name = String(item.name ?? fallback?.name ?? key).trim() || key;
    return [{
      id,
      key,
      name,
      shortLabel: String(item.shortLabel ?? fallback?.shortLabel ?? name).trim() || name,
      defaultUnit: String(item.defaultUnit ?? fallback?.defaultUnit ?? DEFAULT_TYPE_VALUES.defaultUnit),
      valueType: normalizedValueType(item.valueType, fallback?.valueType ?? DEFAULT_TYPE_VALUES.valueType),
      defaultDecimals: clampNumber(finiteNumber(item.defaultDecimals, fallback?.defaultDecimals ?? DEFAULT_TYPE_VALUES.defaultDecimals), 0, 8),
      defaultColor: String(item.defaultColor ?? fallback?.defaultColor ?? DEFAULT_TYPE_VALUES.defaultColor),
      defaultFontFamily: String(item.defaultFontFamily ?? fallback?.defaultFontFamily ?? DEFAULT_TYPE_VALUES.defaultFontFamily),
      defaultFontSize: normalizedDefaultMeasurementFontSize(item.defaultFontSize, fallback),
      defaultFontWeight: normalizedFontWeight(item.defaultFontWeight, fallback?.defaultFontWeight ?? DEFAULT_TYPE_VALUES.defaultFontWeight),
      defaultVisible: item.defaultVisible ?? fallback?.defaultVisible ?? DEFAULT_TYPE_VALUES.defaultVisible
    }];
  });
  const validTypeIds = new Set(measurementTypes.map((item) => item.id));
  const rawProfiles = Array.isArray(input?.deviceProfiles) ? input.deviceProfiles : [];
  const seenProfiles = new Set<string>();
  const deviceProfiles = [...rawProfiles, ...DEFAULT_MEASUREMENT_CONFIG.deviceProfiles].flatMap((profile) => {
    const deviceKind = String((profile as Partial<DeviceMeasurementProfile>)?.deviceKind ?? "").trim();
    if (!deviceKind || seenProfiles.has(deviceKind)) {
      return [];
    }
    seenProfiles.add(deviceKind);
    const items = (Array.isArray(profile.items) ? profile.items : []).flatMap((item) => {
      const measurementTypeId = String(item.measurementTypeId ?? "").trim();
      if (!measurementTypeId || !validTypeIds.has(measurementTypeId)) {
        return [];
      }
      return [{
        name: item.name !== undefined ? String(item.name) : undefined,
        measurementTypeId,
        position: normalizedProfilePosition(item.position),
        associatedField: normalizedAssociatedField(item.associatedField),
        role: item.role ? String(item.role) : undefined,
        defaultVisible: item.defaultVisible,
        labelOverride: item.labelOverride ? String(item.labelOverride) : undefined,
        unitOverride: item.unitOverride ? String(item.unitOverride) : undefined,
        decimalsOverride: item.decimalsOverride === undefined ? undefined : clampNumber(finiteNumber(item.decimalsOverride, 3), 0, 8),
        styleOverride: normalizeStyleOverride(item.styleOverride)
      }];
    });
    return [{ deviceKind, items }];
  });
  return { groupDefaults, measurementTypes, deviceProfiles };
}

function normalizeMeasurementItem(item: Partial<MeasurementItemBinding>, validTypeIds?: ReadonlySet<string>): MeasurementItemBinding | null {
  const measurementTypeId = String(item.measurementTypeId ?? "").trim();
  if (!measurementTypeId || (validTypeIds && !validTypeIds.has(measurementTypeId))) {
    return null;
  }
  const id = String(item.id ?? `${measurementTypeId}-${item.role ?? "item"}`).trim() || `${measurementTypeId}-${Date.now()}`;
  return {
    id,
    name: item.name !== undefined ? String(item.name) : undefined,
    measurementTypeId,
    role: item.role ? String(item.role) : undefined,
    sourcePoint: String(item.sourcePoint ?? "").trim(),
    visible: item.visible,
    labelOverride: item.labelOverride !== undefined ? String(item.labelOverride) : undefined,
    unitOverride: item.unitOverride !== undefined ? String(item.unitOverride) : undefined,
    decimalsOverride: item.decimalsOverride === undefined ? undefined : clampNumber(finiteNumber(item.decimalsOverride, 3), 0, 8),
    styleOverride: normalizeStyleOverride(item.styleOverride)
  };
}

export function measurementGroupsForExistingNodes(groups: readonly MeasurementGroup[], nodeIds: ReadonlySet<string>): MeasurementGroup[] {
  return groups.flatMap((group) => {
    if (!group?.nodeId || !nodeIds.has(group.nodeId)) {
      return [];
    }
    return [{
      id: String(group.id || `measurement-${group.nodeId}`),
      nodeId: group.nodeId,
      terminalId: group.terminalId ? String(group.terminalId) : undefined,
      visible: group.visible !== false,
      labelVisible: group.labelVisible === undefined ? undefined : group.labelVisible !== false,
      unitVisible: group.unitVisible === undefined ? undefined : group.unitVisible !== false,
      backgroundColor: normalizedGroupColor(group.backgroundColor) ?? DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
      borderColor: normalizedGroupColor(group.borderColor) ?? DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
      borderStyle: normalizedGroupBorderStyle(group.borderStyle) ?? DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
      borderWidth: normalizedGroupBorderWidth(group.borderWidth) ?? DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH,
      anchor: normalizedAnchor(group.anchor),
      offset: {
        x: finiteNumber(group.offset?.x, 0),
        y: finiteNumber(group.offset?.y, 70)
      },
      layout: normalizedLayout(group.layout),
      groupStyleOverride: normalizeStyleOverride(group.groupStyleOverride),
      items: (Array.isArray(group.items) ? group.items : [])
        .map((item) => normalizeMeasurementItem(item))
        .filter((item): item is MeasurementItemBinding => Boolean(item))
    }];
  });
}

export function normalizeProjectMeasurements(input: ProjectMeasurementConfig | undefined, nodes: readonly ModelNode[]): ProjectMeasurementConfig {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    version: 1,
    groups: measurementGroupsForExistingNodes(input?.groups ?? [], nodeIds)
  };
}

export function measurementGroupForNode(measurements: ProjectMeasurementConfig, nodeId: string): MeasurementGroup | undefined {
  return measurements.groups.find((group) => group.nodeId === nodeId);
}

export function measurementGroupsForNode(measurements: ProjectMeasurementConfig, nodeId: string): MeasurementGroup[] {
  return measurements.groups.filter((group) => group.nodeId === nodeId);
}

export function measurementGroupForNodeTerminal(
  measurements: ProjectMeasurementConfig,
  nodeId: string,
  terminalId: string
): MeasurementGroup | undefined {
  return measurements.groups.find((group) => group.nodeId === nodeId && group.terminalId === terminalId);
}

export function upsertMeasurementGroup(measurements: ProjectMeasurementConfig, group: MeasurementGroup): ProjectMeasurementConfig {
  const groups = measurements.groups.some((item) => item.id === group.id)
    ? measurements.groups.map((item) => (item.id === group.id ? group : item))
    : [...measurements.groups, group];
  return { version: 1, groups };
}

export function upsertMeasurementGroups(measurements: ProjectMeasurementConfig, incomingGroups: readonly MeasurementGroup[]): ProjectMeasurementConfig {
  const groupById = new Map(measurements.groups.map((group) => [group.id, group]));
  for (const group of incomingGroups) {
    groupById.set(group.id, group);
  }
  return { version: 1, groups: Array.from(groupById.values()) };
}

export function removeMeasurementGroupForNode(measurements: ProjectMeasurementConfig, nodeId: string): ProjectMeasurementConfig {
  return {
    version: 1,
    groups: measurements.groups.filter((group) => group.nodeId !== nodeId)
  };
}

export function createDefaultMeasurementGroupForNode(
  node: ModelNode,
  config: PlatformMeasurementConfig
): MeasurementGroup | null {
  return createDefaultMeasurementGroupsForNode(node, config)[0] ?? null;
}

export function measurementProfileItemsForNodePosition(
  node: ModelNode,
  config: PlatformMeasurementConfig,
  terminalId?: string
): DeviceMeasurementProfileItem[] {
  const normalizedConfig = normalizeMeasurementConfig(config);
  const profile = measurementProfileForNode(node, normalizedConfig);
  if (!profile || profile.items.length === 0) {
    return [];
  }
  if (terminalId) {
    const terminalExists = node.terminals.some((terminal) => terminal.id === terminalId);
    if (!terminalExists) {
      return [];
    }
    return profile.items.filter((item) => item.position === terminalId);
  }
  return profile.items.filter((item) =>
    item.position === "device" || !item.position
  );
}

function measurementSourcePointForProfileItem(nodeId: string, item: Pick<DeviceMeasurementProfileItem, "measurementTypeId" | "role" | "associatedField">, terminalId?: string): string {
  const sourceKey = item.associatedField || `${item.role ? `${item.role}.` : ""}${item.measurementTypeId}`;
  return terminalId ? `${nodeId}.${terminalId}.${sourceKey}` : `${nodeId}.${sourceKey}`;
}

function numericNodeParam(node: ModelNode, key: string, fallback: number) {
  const parsed = Number(node.params[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultMeasurementGroupEstimatedHeight(
  node: ModelNode,
  items: readonly DeviceMeasurementProfileItem[],
  config: PlatformMeasurementConfig
) {
  const visibleItems = items.filter((item) => item.defaultVisible !== false);
  const visibleCount = Math.max(1, visibleItems.length);
  const measurementTypesById = typeById(config.measurementTypes);
  const fontScale = measurementFontScaleForNode(node);
  const maxFontSize = Math.max(
    DEFAULT_TYPE_VALUES.defaultFontSize,
    ...visibleItems.map((item) => {
      const type = measurementTypesById.get(item.measurementTypeId);
      return (item.styleOverride?.fontSize ?? type?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize) * fontScale;
    })
  );
  const lineHeight = Math.max(16, maxFontSize + 6);
  return visibleCount * lineHeight;
}

function defaultMeasurementGroupDeviceOffsetY(
  node: ModelNode,
  items: readonly DeviceMeasurementProfileItem[] = [],
  config: PlatformMeasurementConfig = DEFAULT_MEASUREMENT_CONFIG
) {
  const baseOffset = Math.round(node.size.height / 2 + 42);
  if (node.params._labelVisible === "0") {
    return baseOffset;
  }
  const labelY = numericNodeParam(node, "_labelY", Math.round(node.size.height / 2 + 22));
  if (labelY < node.size.height / 2) {
    return baseOffset;
  }
  const labelFontSize = Math.max(6, numericNodeParam(node, "_labelFontSize", DEFAULT_DEVICE_LABEL_FONT_SIZE));
  const labelBottom = labelY + labelFontSize * 0.75;
  const measurementHeight = defaultMeasurementGroupEstimatedHeight(node, items, config);
  return Math.max(baseOffset, Math.ceil(labelBottom + 8 + measurementHeight / 2));
}

function defaultMeasurementGroupOffsetForNode(
  node: ModelNode,
  terminal?: ModelNode["terminals"][number],
  items?: readonly DeviceMeasurementProfileItem[],
  config?: PlatformMeasurementConfig
): { x: number; y: number } {
  const rotateOffset = (offset: { x: number; y: number }) => {
    const radians = degreesToRadians(node.rotation);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return {
      x: Math.round((offset.x * cos - offset.y * sin) * 10) / 10,
      y: Math.round((offset.x * sin + offset.y * cos) * 10) / 10
    };
  };
  if (!terminal) {
    return { x: 0, y: defaultMeasurementGroupDeviceOffsetY(node, items, config) };
  }
  const anchor = terminal.anchor;
  if (Math.abs(anchor.x) >= Math.abs(anchor.y) && Math.abs(anchor.x) > 0.001) {
    return rotateOffset({ x: Math.sign(anchor.x) * 54, y: 0 });
  }
  if (Math.abs(anchor.y) > 0.001) {
    return rotateOffset({ x: 0, y: Math.sign(anchor.y) * 42 });
  }
  return rotateOffset({ x: 0, y: 42 });
}

export function createDefaultMeasurementGroupsForNode(
  node: ModelNode,
  config: PlatformMeasurementConfig
): MeasurementGroup[] {
  const normalizedConfig = normalizeMeasurementConfig(config);
  const profile = measurementProfileForNode(node, normalizedConfig);
  if (!profile || profile.items.length === 0) {
    return [];
  }
  const groupPositions = [
    { key: "device", terminal: undefined },
    ...node.terminals.map((terminal) => ({ key: terminal.id, terminal }))
  ];
  return groupPositions.flatMap(({ terminal }) => {
    const items = measurementProfileItemsForNodePosition(node, normalizedConfig, terminal?.id);
    if (items.length === 0) {
      return [];
    }
    return {
      id: terminal ? `measurement-${node.id}-${terminal.id}` : `measurement-${node.id}`,
      nodeId: node.id,
      terminalId: terminal?.id,
      visible: true,
      labelVisible: true,
      unitVisible: true,
      backgroundColor: normalizedConfig.groupDefaults.backgroundColor,
      borderColor: normalizedConfig.groupDefaults.borderColor,
      borderStyle: normalizedConfig.groupDefaults.borderStyle,
      borderWidth: normalizedConfig.groupDefaults.borderWidth,
      anchor: "bottom",
      offset: defaultMeasurementGroupOffsetForNode(node, terminal, items, normalizedConfig),
      layout: "vertical",
      items: items.map((item, index) => ({
        id: terminal
          ? `measurement-${node.id}-${terminal.id}-${item.measurementTypeId}-${item.role ?? index}`
          : `measurement-${node.id}-${item.measurementTypeId}-${item.role ?? index}`,
        measurementTypeId: item.measurementTypeId,
        role: item.role,
        sourcePoint: measurementSourcePointForProfileItem(node.id, item, terminal?.id),
        visible: item.defaultVisible !== false,
        labelOverride: item.name ?? item.labelOverride,
        unitOverride: item.unitOverride,
        decimalsOverride: item.decimalsOverride,
        styleOverride: item.styleOverride
      }))
    };
  });
}

function measurementValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalMeasurementGroupId(group: Pick<MeasurementGroup, "nodeId" | "terminalId">) {
  return group.terminalId
    ? `measurement-${group.nodeId}-${group.terminalId}`
    : `measurement-${group.nodeId}`;
}

function generatedMeasurementGroupsById(
  nodes: readonly ModelNode[],
  config: PlatformMeasurementConfig
) {
  return new Map(
    nodes.flatMap((node) => createDefaultMeasurementGroupsForNode(node, config))
      .map((group) => [group.id, group] as const)
  );
}

function isManualMeasurementItem(
  item: MeasurementItemBinding,
  group: MeasurementGroup,
  previousGeneratedItemIds: ReadonlySet<string>,
  nextGeneratedItemIds: ReadonlySet<string>
) {
  if (previousGeneratedItemIds.has(item.id) || nextGeneratedItemIds.has(item.id)) {
    return false;
  }
  const prefix = `${group.id}-${item.measurementTypeId}-`;
  if (!item.id.startsWith(prefix)) {
    return true;
  }
  const suffix = item.id.slice(prefix.length);
  return /^[a-z0-9]{6,}-[a-z0-9]{4}$/i.test(suffix);
}

function mergeInheritedMeasurementValue<T>(
  existing: T,
  previousGenerated: T | undefined,
  nextGenerated: T
) {
  if (previousGenerated === undefined) {
    return existing === undefined ? nextGenerated : existing;
  }
  return measurementValuesEqual(existing, previousGenerated) ? nextGenerated : existing;
}

function reconcileGeneratedMeasurementItem(
  existing: MeasurementItemBinding,
  nextGenerated: MeasurementItemBinding,
  previousGenerated?: MeasurementItemBinding
): MeasurementItemBinding {
  return {
    ...existing,
    id: nextGenerated.id,
    measurementTypeId: nextGenerated.measurementTypeId,
    role: nextGenerated.role,
    sourcePoint: nextGenerated.sourcePoint,
    name: mergeInheritedMeasurementValue(existing.name, previousGenerated?.name, nextGenerated.name),
    visible: mergeInheritedMeasurementValue(existing.visible, previousGenerated?.visible, nextGenerated.visible),
    labelOverride: mergeInheritedMeasurementValue(existing.labelOverride, previousGenerated?.labelOverride, nextGenerated.labelOverride),
    unitOverride: mergeInheritedMeasurementValue(existing.unitOverride, previousGenerated?.unitOverride, nextGenerated.unitOverride),
    decimalsOverride: mergeInheritedMeasurementValue(existing.decimalsOverride, previousGenerated?.decimalsOverride, nextGenerated.decimalsOverride),
    styleOverride: mergeInheritedMeasurementValue(existing.styleOverride, previousGenerated?.styleOverride, nextGenerated.styleOverride)
  };
}

function reconcileGeneratedMeasurementGroup(
  existing: MeasurementGroup,
  nextGenerated: MeasurementGroup,
  previousGenerated: MeasurementGroup | undefined,
  previousConfig: PlatformMeasurementConfig | undefined,
  nextConfig: PlatformMeasurementConfig
): MeasurementGroup {
  const previousItems = new Map((previousGenerated?.items ?? []).map((item) => [item.id, item]));
  const nextItemIds = new Set(nextGenerated.items.map((item) => item.id));
  const previousItemIds = new Set(previousItems.keys());
  const existingItems = new Map(existing.items.map((item) => [item.id, item]));
  const generatedItems = nextGenerated.items.map((item) => {
    const current = existingItems.get(item.id);
    return current ? reconcileGeneratedMeasurementItem(current, item, previousItems.get(item.id)) : item;
  });
  const manualItems = existing.items.filter((item) =>
    !nextItemIds.has(item.id) && isManualMeasurementItem(item, existing, previousItemIds, nextItemIds)
  );
  const previousDefaults = previousConfig?.groupDefaults;
  return {
    ...existing,
    id: nextGenerated.id,
    nodeId: nextGenerated.nodeId,
    terminalId: nextGenerated.terminalId,
    backgroundColor: mergeInheritedMeasurementValue(
      existing.backgroundColor,
      previousGenerated?.backgroundColor ?? previousDefaults?.backgroundColor,
      nextGenerated.backgroundColor ?? nextConfig.groupDefaults.backgroundColor
    ),
    borderColor: mergeInheritedMeasurementValue(
      existing.borderColor,
      previousGenerated?.borderColor ?? previousDefaults?.borderColor,
      nextGenerated.borderColor ?? nextConfig.groupDefaults.borderColor
    ),
    borderStyle: mergeInheritedMeasurementValue(
      existing.borderStyle,
      previousGenerated?.borderStyle ?? previousDefaults?.borderStyle,
      nextGenerated.borderStyle ?? nextConfig.groupDefaults.borderStyle
    ),
    borderWidth: mergeInheritedMeasurementValue(
      existing.borderWidth,
      previousGenerated?.borderWidth ?? previousDefaults?.borderWidth,
      nextGenerated.borderWidth ?? nextConfig.groupDefaults.borderWidth
    ),
    items: [...generatedItems, ...manualItems]
  };
}

export function reconcileProjectMeasurementsWithConfig(
  measurements: ProjectMeasurementConfig,
  nodes: readonly ModelNode[],
  nextConfigInput: PlatformMeasurementConfig,
  previousConfigInput?: PlatformMeasurementConfig
): ProjectMeasurementConfig {
  const normalizedMeasurements = normalizeProjectMeasurements(measurements, nodes);
  const nextConfig = normalizeMeasurementConfig(nextConfigInput);
  const previousConfig = previousConfigInput ? normalizeMeasurementConfig(previousConfigInput) : undefined;
  const nextGeneratedGroups = generatedMeasurementGroupsById(nodes, nextConfig);
  const previousGeneratedGroups = previousConfig
    ? generatedMeasurementGroupsById(nodes, previousConfig)
    : new Map<string, MeasurementGroup>();
  const reconciledGroups: MeasurementGroup[] = [];
  const handledGroupIds = new Set<string>();

  for (const group of normalizedMeasurements.groups) {
    if (group.id !== canonicalMeasurementGroupId(group)) {
      reconciledGroups.push(group);
      continue;
    }
    handledGroupIds.add(group.id);
    const nextGenerated = nextGeneratedGroups.get(group.id);
    const previousGenerated = previousGeneratedGroups.get(group.id);
    if (nextGenerated) {
      reconciledGroups.push(reconcileGeneratedMeasurementGroup(
        group,
        nextGenerated,
        previousGenerated,
        previousConfig,
        nextConfig
      ));
      continue;
    }
    const previousItemIds = new Set((previousGenerated?.items ?? []).map((item) => item.id));
    const manualItems = group.items.filter((item) =>
      isManualMeasurementItem(item, group, previousItemIds, new Set())
    );
    if (manualItems.length > 0) {
      reconciledGroups.push({ ...group, items: manualItems });
    }
  }

  for (const group of nextGeneratedGroups.values()) {
    if (!handledGroupIds.has(group.id)) {
      reconciledGroups.push(group);
    }
  }

  const reconciled: ProjectMeasurementConfig = { version: 1, groups: reconciledGroups };
  return measurementValuesEqual(measurements, reconciled) ? measurements : reconciled;
}

export function resolveMeasurementItemDisplay({
  config,
  node,
  group,
  item
}: {
  config: PlatformMeasurementConfig;
  node: ModelNode;
  group: MeasurementGroup;
  item: MeasurementItemBinding;
}): ResolvedMeasurementDisplay {
  const normalizedConfig = normalizeMeasurementConfig(config);
  const type = normalizedConfig.measurementTypes.find((candidate) => candidate.id === item.measurementTypeId);
  const profileItem = measurementProfileForNode(node, normalizedConfig)
    ?.items.find((candidate) => candidate.measurementTypeId === item.measurementTypeId && (candidate.role ?? "") === (item.role ?? ""));
  const style = {
    ...(profileItem?.styleOverride ?? {}),
    ...(group.groupStyleOverride ?? {}),
    ...(item.styleOverride ?? {})
  };
  return {
    label: item.labelOverride || profileItem?.labelOverride || type?.shortLabel || item.measurementTypeId,
    unit: item.unitOverride ?? profileItem?.unitOverride ?? type?.defaultUnit ?? "",
    decimals: item.decimalsOverride ?? profileItem?.decimalsOverride ?? type?.defaultDecimals ?? 3,
    color: style.color || type?.defaultColor || DEFAULT_TYPE_VALUES.defaultColor,
    fontFamily: style.fontFamily || type?.defaultFontFamily || DEFAULT_TYPE_VALUES.defaultFontFamily,
    fontSize: style.fontSize ?? type?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize,
    fontWeight: style.fontWeight || type?.defaultFontWeight || DEFAULT_TYPE_VALUES.defaultFontWeight,
    fontStyle: style.fontStyle || "normal",
    textDecoration: style.textDecoration || "none",
    visible: item.visible !== false
  };
}

export function formatMeasurementDisplayValue(
  value: MeasurementRuntimeValue | undefined,
  decimals: number,
  fallbackUnit: string
): string {
  const unit = value?.unit ?? fallbackUnit;
  if (!value || value.value === null || value.quality === "missing") {
    return unit ? `-- ${unit}` : "--";
  }
  const rendered = typeof value.value === "number"
    ? value.value.toFixed(clampNumber(decimals, 0, 8))
    : String(value.value);
  return unit ? `${rendered} ${unit}` : rendered;
}
