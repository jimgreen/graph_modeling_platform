import type { ModelNode } from "./model";

export type MeasurementValueType = "number" | "string" | "boolean";
export type MeasurementQuality = "good" | "bad" | "stale" | "missing";
export type MeasurementGroupAnchor = "top" | "bottom" | "left" | "right" | "custom";
export type MeasurementGroupLayout = "vertical" | "horizontal" | "grid";

export type MeasurementStyleOverride = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "400" | "500" | "700";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
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
  defaultFontWeight: "400" | "500" | "700";
  defaultVisible: boolean;
};

export type DeviceMeasurementProfileItem = {
  measurementTypeId: string;
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

export type PlatformMeasurementConfig = {
  measurementTypes: MeasurementTypeDefinition[];
  deviceProfiles: DeviceMeasurementProfile[];
};

export type PlatformMeasurementConfigInput = {
  measurementTypes?: Array<Partial<MeasurementTypeDefinition> & { id: string }>;
  deviceProfiles?: DeviceMeasurementProfile[];
};

export type MeasurementItemBinding = {
  id: string;
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
  visible: boolean;
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
  fontWeight: "400" | "500" | "700";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  visible: boolean;
};

const DEFAULT_TYPE_VALUES = {
  defaultUnit: "",
  valueType: "number" as MeasurementValueType,
  defaultDecimals: 3,
  defaultColor: "#334155",
  defaultFontFamily: "Arial",
  defaultFontSize: 12,
  defaultFontWeight: "500" as const,
  defaultVisible: true
};

export const DEFAULT_MEASUREMENT_CONFIG: PlatformMeasurementConfig = {
  measurementTypes: [
    {
      id: "activePower",
      key: "p",
      name: "有功功率",
      shortLabel: "P",
      defaultUnit: "MW",
      valueType: "number",
      defaultDecimals: 3,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: true
    },
    {
      id: "reactivePower",
      key: "q",
      name: "无功功率",
      shortLabel: "Q",
      defaultUnit: "Mvar",
      valueType: "number",
      defaultDecimals: 3,
      defaultColor: "#475569",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: true
    },
    {
      id: "voltage",
      key: "u",
      name: "电压",
      shortLabel: "U",
      defaultUnit: "kV",
      valueType: "number",
      defaultDecimals: 2,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: true
    },
    {
      id: "current",
      key: "i",
      name: "电流",
      shortLabel: "I",
      defaultUnit: "A",
      valueType: "number",
      defaultDecimals: 1,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: false
    },
    {
      id: "frequency",
      key: "f",
      name: "频率",
      shortLabel: "f",
      defaultUnit: "Hz",
      valueType: "number",
      defaultDecimals: 2,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: false
    },
    {
      id: "pressure",
      key: "pressure",
      name: "压力",
      shortLabel: "压力",
      defaultUnit: "MPa",
      valueType: "number",
      defaultDecimals: 3,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: true
    },
    {
      id: "temperature",
      key: "temperature",
      name: "温度",
      shortLabel: "温度",
      defaultUnit: "℃",
      valueType: "number",
      defaultDecimals: 1,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: false
    },
    {
      id: "flow",
      key: "flow",
      name: "流量",
      shortLabel: "流量",
      defaultUnit: "kg/s",
      valueType: "number",
      defaultDecimals: 2,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: true
    },
    {
      id: "level",
      key: "level",
      name: "液位",
      shortLabel: "液位",
      defaultUnit: "%",
      valueType: "number",
      defaultDecimals: 1,
      defaultColor: "#334155",
      defaultFontFamily: "Arial",
      defaultFontSize: 12,
      defaultFontWeight: "500",
      defaultVisible: true
    }
  ],
  deviceProfiles: [
    {
      deviceKind: "ACLoad",
      items: [
        { measurementTypeId: "activePower" },
        { measurementTypeId: "reactivePower" },
        { measurementTypeId: "voltage" },
        { measurementTypeId: "current" }
      ]
    },
    {
      deviceKind: "DCLoad",
      items: [
        { measurementTypeId: "activePower" },
        { measurementTypeId: "voltage" },
        { measurementTypeId: "current" }
      ]
    },
    {
      deviceKind: "HydroStorage",
      items: [
        { measurementTypeId: "pressure" },
        { measurementTypeId: "level" },
        { measurementTypeId: "temperature" }
      ]
    },
    {
      deviceKind: "HeatStorage",
      items: [
        { measurementTypeId: "temperature" },
        { measurementTypeId: "flow" }
      ]
    }
  ]
};

const byId = <T extends { id: string }>(items: readonly T[]) => new Map(items.map((item) => [item.id, item]));

const finiteNumberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeStyleOverride = (style: MeasurementStyleOverride | undefined): MeasurementStyleOverride | undefined => {
  if (!style) {
    return undefined;
  }
  const normalized: MeasurementStyleOverride = {};
  if (style.color) {
    normalized.color = style.color;
  }
  if (style.fontFamily) {
    normalized.fontFamily = style.fontFamily;
  }
  if (typeof style.fontSize === "number" && Number.isFinite(style.fontSize)) {
    normalized.fontSize = style.fontSize;
  }
  if (style.fontWeight === "400" || style.fontWeight === "500" || style.fontWeight === "700") {
    normalized.fontWeight = style.fontWeight;
  }
  if (style.fontStyle === "normal" || style.fontStyle === "italic") {
    normalized.fontStyle = style.fontStyle;
  }
  if (style.textDecoration === "none" || style.textDecoration === "underline") {
    normalized.textDecoration = style.textDecoration;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export function normalizeMeasurementConfig(input: PlatformMeasurementConfigInput | undefined): PlatformMeasurementConfig {
  const defaultTypes = byId(DEFAULT_MEASUREMENT_CONFIG.measurementTypes);
  const rawTypes: Array<Partial<MeasurementTypeDefinition> & { id: string }> = Array.isArray(input?.measurementTypes)
    ? input.measurementTypes
    : DEFAULT_MEASUREMENT_CONFIG.measurementTypes;
  const measurementTypes = rawTypes
    .filter((item) => typeof item?.id === "string" && item.id.trim().length > 0)
    .map((item) => {
      const id = item.id.trim();
      const fallback = defaultTypes.get(id);
      const key = item.key || fallback?.key || id;
      return {
        id,
        key,
        name: item.name || fallback?.name || key,
        shortLabel: item.shortLabel || fallback?.shortLabel || item.name || key,
        defaultUnit: item.defaultUnit ?? fallback?.defaultUnit ?? DEFAULT_TYPE_VALUES.defaultUnit,
        valueType: item.valueType ?? fallback?.valueType ?? DEFAULT_TYPE_VALUES.valueType,
        defaultDecimals: finiteNumberOr(item.defaultDecimals, fallback?.defaultDecimals ?? DEFAULT_TYPE_VALUES.defaultDecimals),
        defaultColor: item.defaultColor || fallback?.defaultColor || DEFAULT_TYPE_VALUES.defaultColor,
        defaultFontFamily: item.defaultFontFamily || fallback?.defaultFontFamily || DEFAULT_TYPE_VALUES.defaultFontFamily,
        defaultFontSize: finiteNumberOr(item.defaultFontSize, fallback?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize),
        defaultFontWeight: item.defaultFontWeight || fallback?.defaultFontWeight || DEFAULT_TYPE_VALUES.defaultFontWeight,
        defaultVisible: item.defaultVisible ?? fallback?.defaultVisible ?? DEFAULT_TYPE_VALUES.defaultVisible
      };
    });

  const rawProfiles = Array.isArray(input?.deviceProfiles) ? input.deviceProfiles : DEFAULT_MEASUREMENT_CONFIG.deviceProfiles;
  const deviceProfiles = rawProfiles
    .filter((profile): profile is DeviceMeasurementProfile => typeof profile?.deviceKind === "string" && Array.isArray(profile.items))
    .map((profile) => ({
      deviceKind: profile.deviceKind,
      items: profile.items
        .filter((item) => typeof item?.measurementTypeId === "string" && item.measurementTypeId.trim().length > 0)
        .map((item) => ({
          ...item,
          measurementTypeId: item.measurementTypeId.trim(),
          styleOverride: normalizeStyleOverride(item.styleOverride)
        }))
    }));

  return { measurementTypes, deviceProfiles };
}

export function measurementGroupsForExistingNodes(groups: readonly MeasurementGroup[], nodeIds: ReadonlySet<string>): MeasurementGroup[] {
  return groups
    .filter((group) => typeof group?.nodeId === "string" && nodeIds.has(group.nodeId))
    .map((group) => ({
      id: group.id || `measurement-group-${group.nodeId}`,
      nodeId: group.nodeId,
      visible: group.visible !== false,
      anchor: group.anchor ?? "bottom",
      offset: group.offset && Number.isFinite(group.offset.x) && Number.isFinite(group.offset.y)
        ? { x: group.offset.x, y: group.offset.y }
        : { x: 0, y: 70 },
      layout: group.layout ?? "vertical",
      groupStyleOverride: normalizeStyleOverride(group.groupStyleOverride),
      items: Array.isArray(group.items)
        ? group.items
            .filter((item) => typeof item?.measurementTypeId === "string" && item.measurementTypeId.trim().length > 0)
            .map((item, index) => ({
              id: item.id || `measurement-item-${index + 1}`,
              measurementTypeId: item.measurementTypeId,
              role: item.role,
              sourcePoint: item.sourcePoint || "",
              visible: item.visible,
              labelOverride: item.labelOverride,
              unitOverride: item.unitOverride,
              decimalsOverride: item.decimalsOverride,
              styleOverride: normalizeStyleOverride(item.styleOverride)
            }))
        : []
    }));
}

export function normalizeProjectMeasurements(input: ProjectMeasurementConfig | undefined, nodes: readonly ModelNode[]): ProjectMeasurementConfig {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    version: 1,
    groups: measurementGroupsForExistingNodes(input?.groups ?? [], nodeIds)
  };
}

export function resolveMeasurementItemDisplay({
  config,
  node,
  item
}: {
  config: PlatformMeasurementConfig;
  node: ModelNode;
  group: MeasurementGroup;
  item: MeasurementItemBinding;
}): ResolvedMeasurementDisplay {
  const type = config.measurementTypes.find((candidate) => candidate.id === item.measurementTypeId);
  const profileItem = config.deviceProfiles
    .find((profile) => profile.deviceKind === node.kind)
    ?.items.find((candidate) => candidate.measurementTypeId === item.measurementTypeId && (candidate.role ?? "") === (item.role ?? ""));
  const style = { ...(profileItem?.styleOverride ?? {}), ...(item.styleOverride ?? {}) };

  return {
    label: item.labelOverride || profileItem?.labelOverride || type?.shortLabel || item.measurementTypeId,
    unit: item.unitOverride ?? profileItem?.unitOverride ?? type?.defaultUnit ?? "",
    decimals: item.decimalsOverride ?? profileItem?.decimalsOverride ?? type?.defaultDecimals ?? DEFAULT_TYPE_VALUES.defaultDecimals,
    color: style.color || type?.defaultColor || DEFAULT_TYPE_VALUES.defaultColor,
    fontFamily: style.fontFamily || type?.defaultFontFamily || DEFAULT_TYPE_VALUES.defaultFontFamily,
    fontSize: style.fontSize ?? type?.defaultFontSize ?? DEFAULT_TYPE_VALUES.defaultFontSize,
    fontWeight: style.fontWeight || type?.defaultFontWeight || DEFAULT_TYPE_VALUES.defaultFontWeight,
    fontStyle: style.fontStyle || "normal",
    textDecoration: style.textDecoration || "none",
    visible: item.visible ?? profileItem?.defaultVisible ?? type?.defaultVisible ?? true
  };
}

export function formatMeasurementDisplayValue(value: MeasurementRuntimeValue | undefined, decimals: number, fallbackUnit: string): string {
  const unit = value?.unit ?? fallbackUnit;
  if (!value || value.value === null || value.quality === "missing") {
    return unit ? `-- ${unit}` : "--";
  }
  const formatted = typeof value.value === "number"
    ? value.value.toFixed(Math.max(0, Math.min(12, decimals)))
    : String(value.value);
  return unit ? `${formatted} ${unit}` : formatted;
}

const measurementId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createDefaultMeasurementGroupForNode({
  node,
  config
}: {
  node: ModelNode;
  config: PlatformMeasurementConfig;
}): MeasurementGroup | null {
  const profile = config.deviceProfiles.find((candidate) => candidate.deviceKind === node.kind);
  if (!profile || profile.items.length === 0) {
    return null;
  }
  return {
    id: measurementId("measurement-group"),
    nodeId: node.id,
    visible: true,
    anchor: "bottom",
    offset: { x: 0, y: Math.max(70, node.size.height / 2 + 24) },
    layout: "vertical",
    items: profile.items.map((item) => ({
      id: measurementId("measurement-item"),
      measurementTypeId: item.measurementTypeId,
      role: item.role,
      sourcePoint: "",
      visible: item.defaultVisible
    }))
  };
}

export function removeMeasurementGroupsForNodeIds(groups: readonly MeasurementGroup[], nodeIds: ReadonlySet<string>): MeasurementGroup[] {
  return groups.filter((group) => !nodeIds.has(group.nodeId));
}
