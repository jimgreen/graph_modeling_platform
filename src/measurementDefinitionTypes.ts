export type MeasurementFontWeight = "400" | "500" | "700";
export type MeasurementFontStyle = "normal" | "italic";
export type MeasurementTextDecoration = "none" | "underline";

export type MeasurementStyleOverride = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: MeasurementFontWeight;
  fontStyle?: MeasurementFontStyle;
  textDecoration?: MeasurementTextDecoration;
};

export type DeviceMeasurementDefinition = {
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

export type MeasurementFieldParameterDefinition = {
  cnName: string;
  enName: string;
  valueType: "float" | "string" | "numberEnum";
  typicalValue: string;
  enumValues?: string[];
  enumValueType?: "number" | "string";
  enumOptions?: Array<{ value: string; label?: string }>;
  readonly: false;
  exportEnabled: true;
};

const MEASUREMENT_FIELD_PARAMETER_METADATA: Record<string, {
  cnName: string;
  valueType?: MeasurementFieldParameterDefinition["valueType"];
  typicalValue?: string;
  enumValues?: string[];
  enumValueType?: MeasurementFieldParameterDefinition["enumValueType"];
  enumOptions?: MeasurementFieldParameterDefinition["enumOptions"];
}> = {
  p: { cnName: "有功值" },
  q: { cnName: "无功值" },
  u: { cnName: "电压值" },
  i: { cnName: "电流值" },
  f: { cnName: "频率值" },
  current: { cnName: "电流值" },
  pressure: { cnName: "压力值" },
  flow: { cnName: "流量值" },
  gas_quantity: { cnName: "储气量" },
  soc: { cnName: "SOC" },
  temperature: { cnName: "温度值" },
  level: { cnName: "液位值" },
  status: { cnName: "状态", valueType: "string", typicalValue: "" },
  run_stat: {
    cnName: "工作状态",
    valueType: "numberEnum",
    typicalValue: "1",
    enumValues: ["1", "0"],
    enumValueType: "number",
    enumOptions: [
      { value: "1", label: "运行" },
      { value: "0", label: "停运" }
    ]
  }
};

export function createMeasurementFieldParameterDefinition(
  fieldValue: unknown,
  fallback?: { cnName?: unknown; valueType?: unknown }
): MeasurementFieldParameterDefinition | null {
  const field = normalizedAssociatedField(fieldValue);
  if (!field) return null;
  const metadata = MEASUREMENT_FIELD_PARAMETER_METADATA[field] ?? {};
  const fallbackCnName = normalizedOptionalString(fallback?.cnName);
  const fallbackValueType = fallback?.valueType === "string" ? "string" : "float";
  const valueType = metadata.valueType ?? fallbackValueType;
  return {
    cnName: metadata.cnName ?? fallbackCnName ?? field,
    enName: field,
    valueType,
    typicalValue: metadata.typicalValue ?? (valueType === "string" ? "" : "0"),
    ...(metadata.enumValues ? { enumValues: [...metadata.enumValues] } : {}),
    ...(metadata.enumValueType ? { enumValueType: metadata.enumValueType } : {}),
    ...(metadata.enumOptions ? { enumOptions: metadata.enumOptions.map((option) => ({ ...option })) } : {}),
    readonly: false,
    exportEnabled: true
  };
}

export function cloneDeviceMeasurementDefinitions(
  definitions: readonly DeviceMeasurementDefinition[] | undefined
): DeviceMeasurementDefinition[] | undefined {
  return definitions?.map((definition) => ({
    ...definition,
    styleOverride: definition.styleOverride ? { ...definition.styleOverride } : undefined
  }));
}

function normalizedOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizedAssociatedField(value: unknown): string | undefined {
  const field = normalizedOptionalString(value);
  if (!field) return undefined;
  if (/^(?:gasQuantity|gasquantity)$/u.test(field)) return "gas_quantity";
  if (/^(?:state_of_charge|stateOfCharge)$/u.test(field)) return "soc";
  return field;
}

function normalizedMeasurementTypeId(value: unknown): string | undefined {
  const measurementTypeId = normalizedOptionalString(value);
  if (!measurementTypeId) return undefined;
  return /^(?:state_of_charge|stateOfCharge)$/u.test(measurementTypeId) ? "soc" : measurementTypeId;
}

export function normalizeDeviceMeasurementDefinitions(
  input: unknown,
  validMeasurementTypeIds?: ReadonlySet<string>
): DeviceMeasurementDefinition[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((raw): DeviceMeasurementDefinition[] => {
    if (!raw || typeof raw !== "object") return [];
    const source = raw as Partial<DeviceMeasurementDefinition>;
    const measurementTypeId = normalizedMeasurementTypeId(source.measurementTypeId);
    if (!measurementTypeId || (validMeasurementTypeIds && !validMeasurementTypeIds.has(measurementTypeId))) return [];
    const styleSource = source.styleOverride && typeof source.styleOverride === "object"
      ? source.styleOverride
      : undefined;
    const styleOverride: MeasurementStyleOverride | undefined = styleSource
      ? {
          ...(normalizedOptionalString(styleSource.color) ? { color: normalizedOptionalString(styleSource.color) } : {}),
          ...(normalizedOptionalString(styleSource.fontFamily) ? { fontFamily: normalizedOptionalString(styleSource.fontFamily) } : {}),
          ...(Number.isFinite(Number(styleSource.fontSize)) ? { fontSize: Number(styleSource.fontSize) } : {}),
          ...(styleSource.fontWeight === "400" || styleSource.fontWeight === "500" || styleSource.fontWeight === "700"
            ? { fontWeight: styleSource.fontWeight }
            : {}),
          ...(styleSource.fontStyle === "normal" || styleSource.fontStyle === "italic"
            ? { fontStyle: styleSource.fontStyle }
            : {}),
          ...(styleSource.textDecoration === "none" || styleSource.textDecoration === "underline"
            ? { textDecoration: styleSource.textDecoration }
            : {})
        }
      : undefined;
    const decimals = Number(source.decimalsOverride);
    return [{
      measurementTypeId,
      ...(normalizedOptionalString(source.name) ? { name: normalizedOptionalString(source.name) } : {}),
      ...(normalizedOptionalString(source.position) ? { position: normalizedOptionalString(source.position) } : {}),
      ...(normalizedAssociatedField(source.associatedField) ? { associatedField: normalizedAssociatedField(source.associatedField) } : {}),
      ...(normalizedOptionalString(source.role) ? { role: normalizedOptionalString(source.role) } : {}),
      ...(typeof source.defaultVisible === "boolean" ? { defaultVisible: source.defaultVisible } : {}),
      ...(source.labelOverride !== undefined ? { labelOverride: String(source.labelOverride) } : {}),
      ...(source.unitOverride !== undefined ? { unitOverride: String(source.unitOverride) } : {}),
      ...(Number.isFinite(decimals) ? { decimalsOverride: Math.max(0, Math.min(8, Math.round(decimals))) } : {}),
      ...(styleOverride && Object.keys(styleOverride).length > 0 ? { styleOverride } : {})
    }];
  });
}
