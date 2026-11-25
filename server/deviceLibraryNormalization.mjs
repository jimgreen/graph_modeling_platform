// 设备库配置 v0→v4 迁移与全量归一化纯逻辑模块
// 从 server/server.mjs 抽离，无路径常量、无副作用。
import { meaningfulDeviceParameterChineseName } from "../shared/deviceParameterChineseNames.mjs";
import { inferESection } from "./eSectionMetadata.mjs";

function normalizeGasQuantityFieldName(value) {
  const text = String(value ?? "").trim();
  if (/^(?:gasQuantity|gasquantity)$/u.test(text)) return "gas_quantity";
  if (/^(?:state_of_charge|stateOfCharge)$/u.test(text)) return "soc";
  return text;
}

const runStatEnumValues = ["1", "0"];
const runStatEnumOptions = [
  { value: "1", label: "运行" },
  { value: "0", label: "停运" }
];

const concreteDeviceDefinitionParamNames = new Set([
  "component_type",
  "derived_from_component_type",
  "derived_component_type",
  "derived_component_library_label",
  "is_derived_component_library",
  "icon",
  "image",
  "imageAssetId",
  "imageFit",
  "backgroundImage",
  "backgroundImageAssetId",
  "backgroundImageCleared",
  "backgroundImageFit",
  "foregroundColor",
  "foregroundImage",
  "foregroundImageAssetId",
  "foregroundImageFit",
  "fillColor",
  "strokeColor",
  "textColor",
  "lineWidth",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "strokeStyle",
  "text",
  "cornerRadius",
  "accentColor",
  "shadowEnabled",
  "padding",
  "textAlign",
  "verticalAlign",
  "markerStart",
  "markerEnd",
  "arrowSize",
  "handleColor",
  "handleSize",
  "routeAvoidance",
  "staticWidth",
  "staticHeight"
]);

function concreteDeviceDefinitionParams(params) {
  return Object.fromEntries(Object.entries(params ?? {}).filter(([name]) => (
    concreteDeviceDefinitionParamNames.has(name) || name.startsWith("button")
  )));
}

function sharedDeviceDefinitionParams(params) {
  return Object.fromEntries(Object.entries(params ?? {}).filter(([name]) => (
    !concreteDeviceDefinitionParamNames.has(name) || [
      "component_type",
      "derived_from_component_type",
      "derived_component_type",
      "derived_component_library_label",
      "is_derived_component_library"
    ].includes(name)
  )));
}

export const deviceLibrarySchemaVersion = 4;

export function meaningfulStoredDeviceParameterChineseName(enName, cnName) {
  return meaningfulDeviceParameterChineseName(enName, cnName);
}

export function normalizeRunStatValue(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  const lower = text.toLowerCase();
  if (["1", "运行", "投运", "on", "true"].includes(lower)) return "1";
  if (["0", "停运", "检修", "off", "false"].includes(lower)) return "0";
  return text;
}

export function normalizeRunStatParameterDefinition(definition) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) return definition;
  const enName = String(definition.enName ?? "").trim();
  if (!/^(?:run_stat|runStat)$/u.test(enName)) return definition;
  const typicalValue = normalizeRunStatValue(definition.typicalValue, "1");
  return {
    ...definition,
    enName: "run_stat",
    valueType: "numberEnum",
    typicalValue: runStatEnumValues.includes(typicalValue) ? typicalValue : "1",
    enumValueType: "number",
    enumValues: [...runStatEnumValues],
    enumOptions: runStatEnumOptions.map((option) => ({ ...option }))
  };
}

export function serverSwitchingDeviceUsesClosedStatus(kind, params = {}) {
  const normalizedKind = String(kind ?? "").trim().toLowerCase();
  if (normalizedKind.includes("ground-disconnector")) return false;
  const section = inferESection(kind, params);
  return ["ACSwitch", "DCSwitch", "ACBreak", "DCBreak"].includes(section) ||
    normalizedKind.includes("switch") || normalizedKind.includes("breaker");
}

function normalizeDeviceLibraryParameterDefinitions(value) {
  if (!Array.isArray(value)) return value;
  const normalized = [];
  let socDefinitionIndex = -1;
  let socDefinitionIsCanonical = false;
  for (const rawDefinition of value) {
    if (!rawDefinition || typeof rawDefinition !== "object" || Array.isArray(rawDefinition)) {
      normalized.push(rawDefinition);
      continue;
    }
    const rawName = String(rawDefinition.enName ?? "").trim();
    const enName = /^(?:state_of_charge|stateOfCharge)$/u.test(rawName)
      ? "soc"
      : rawName === "status_set"
        ? "closed_status_set"
        : rawName;
    const rawExportName = rawDefinition.exportName;
    const definition = normalizeRunStatParameterDefinition({
      ...rawDefinition,
      cnName: meaningfulStoredDeviceParameterChineseName(enName, rawDefinition.cnName),
      enName,
      ...(enName === "soc" && String(rawDefinition.typicalValue ?? "").trim()
        ? { typicalValue: normalizeDeviceLibraryParams({ soc: rawDefinition.typicalValue }).soc }
        : {}),
      ...(typeof rawExportName === "string"
        ? {
            exportName: /^(?:state_of_charge|stateOfCharge)$/u.test(rawExportName.trim())
              ? "soc"
              : rawExportName.trim() === "status_set"
                ? "closed_status_set"
                : rawExportName
          }
        : {})
    });
    if (enName !== "soc") {
      normalized.push(definition);
      continue;
    }
    const canonical = rawName === "soc";
    if (socDefinitionIndex < 0) {
      socDefinitionIndex = normalized.length;
      socDefinitionIsCanonical = canonical;
      normalized.push(definition);
    } else if (canonical && !socDefinitionIsCanonical) {
      normalized[socDefinitionIndex] = definition;
      socDefinitionIsCanonical = true;
    }
  }
  return normalized;
}

function normalizeDeviceLibraryMeasurementDefinitions(value, kind = "") {
  if (!Array.isArray(value)) return value;
  const normalized = value.map((rawDefinition) => {
    if (!rawDefinition || typeof rawDefinition !== "object" || Array.isArray(rawDefinition)) {
      return rawDefinition;
    }
    const measurementTypeId = /^(?:state_of_charge|stateOfCharge)$/u.test(String(rawDefinition.measurementTypeId ?? "").trim())
      ? "soc"
      : rawDefinition.measurementTypeId;
    const associatedField = /^(?:state_of_charge|stateOfCharge)$/u.test(String(rawDefinition.associatedField ?? "").trim())
      ? "soc"
      : rawDefinition.associatedField;
    return { ...rawDefinition, measurementTypeId, associatedField };
  });
  if (normalized.length > 0 && serverSwitchingDeviceUsesClosedStatus(kind) &&
    !normalized.some((definition) => definition?.associatedField === "closed_status")) {
    normalized.splice(
      Math.max(0, normalized.findIndex((definition) => definition?.associatedField === "status") + 1),
      0,
      { measurementTypeId: "status", associatedField: "closed_status", labelOverride: "开合状态量测值" }
    );
  }
  return normalized;
}

export function normalizeDeviceLibraryParams(value, addRunStatDefault = false, kind = "") {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const params = { ...source };
  if (params.run_stat === undefined && params.runStat !== undefined) {
    params.run_stat = params.runStat;
  }
  delete params.runStat;
  if (params.closed_status_set === undefined && params.status_set !== undefined) {
    params.closed_status_set = params.status_set;
  }
  delete params.status_set;
  if (serverSwitchingDeviceUsesClosedStatus(kind, params) && params.closed_status === undefined && params.status !== undefined) {
    params.closed_status = params.status;
  }
  if (params.soc === undefined) {
    params.soc = params.state_of_charge ?? params.stateOfCharge;
  }
  delete params.state_of_charge;
  delete params.stateOfCharge;
  for (const key of ["soc", "soc_upper_limit", "soc_lower_limit"]) {
    if (params[key] === undefined || params[key] === null || String(params[key]).trim() === "") continue;
    const numeric = Number(String(params[key]).trim().replace(/%$/u, ""));
    if (Number.isFinite(numeric)) {
      params[key] = String(Math.abs(numeric) > 1 || String(params[key]).trim().endsWith("%") ? numeric / 100 : numeric);
    }
  }
  if (addRunStatDefault || Object.prototype.hasOwnProperty.call(params, "run_stat")) {
    params.run_stat = normalizeRunStatValue(params.run_stat, "1");
  }
  return params;
}

function migrateDeviceLibraryConfigV0ToV1(source) {
  return {
    ...source,
    customCategoryLibraries: source.customCategoryLibraries ?? source.customAttributeLibraries,
    customComponentLibraries: source.customComponentLibraries ?? source.customComponentTypes,
    schemaVersion: 1
  };
}

function migrateDeviceLibraryConfigV1ToV2(source) {
  const rawOverrides = source.deviceDefinitionOverrides && typeof source.deviceDefinitionOverrides === "object" &&
    !Array.isArray(source.deviceDefinitionOverrides)
    ? source.deviceDefinitionOverrides
    : {};
  const deviceDefinitionOverrides = Object.fromEntries(Object.entries(rawOverrides).map(([kind, rawOverride]) => {
    if (!rawOverride || typeof rawOverride !== "object" || Array.isArray(rawOverride)) {
      return [kind, rawOverride];
    }
    const override = { ...rawOverride };
    if (Array.isArray(override.parameterDefinitions) && override.parameterDefinitions.length === 0 &&
      override.parameterDefinitionsIntent !== "delete-all") {
      delete override.parameterDefinitions;
      delete override.parameterDefinitionsIntent;
    }
    return [kind, override];
  }));
  return { ...source, deviceDefinitionOverrides, schemaVersion: 2 };
}

function migrateDeviceLibraryConfigV2ToV3(source) {
  return { ...source, schemaVersion: 3 };
}

function migrateDeviceLibraryConfigV3ToV4(source) {
  const rawOverrides = source.deviceDefinitionOverrides && typeof source.deviceDefinitionOverrides === "object" &&
    !Array.isArray(source.deviceDefinitionOverrides)
    ? source.deviceDefinitionOverrides
    : {};
  const deviceDefinitionOverrides = Object.fromEntries(Object.entries(rawOverrides).map(([kind, rawOverride]) => {
    if (!rawOverride || typeof rawOverride !== "object" || Array.isArray(rawOverride)) {
      return [kind, rawOverride];
    }
    const override = { ...rawOverride };
    const explicitlyDeletesAllMeasurements = Array.isArray(override.measurementDefinitions) &&
      override.measurementDefinitions.length === 0 && override.measurementDefinitionsIntent === "delete-all";
    if (Array.isArray(override.measurementDefinitions) && override.measurementDefinitions.length === 0 &&
      !explicitlyDeletesAllMeasurements) {
      delete override.measurementDefinitions;
    }
    if (!explicitlyDeletesAllMeasurements) {
      delete override.measurementDefinitionsIntent;
    }
    return [kind, override];
  }));
  return { ...source, deviceDefinitionOverrides, schemaVersion: 4 };
}

export function migrateDeviceLibraryConfig(payload) {
  let source = payload && typeof payload === "object" && !Array.isArray(payload) ? { ...payload } : {};
  let version = Number.isInteger(Number(source.schemaVersion)) ? Number(source.schemaVersion) : 0;
  if (version < 1) {
    source = migrateDeviceLibraryConfigV0ToV1(source);
    version = 1;
  }
  if (version < 2) {
    source = migrateDeviceLibraryConfigV1ToV2(source);
    version = 2;
  }
  if (version < 3) {
    source = migrateDeviceLibraryConfigV2ToV3(source);
    version = 3;
  }
  if (version < 4) {
    source = migrateDeviceLibraryConfigV3ToV4(source);
  }
  return { ...source, schemaVersion: deviceLibrarySchemaVersion };
}

export function normalizeDeviceLibraryConfig(payload) {
  const source = migrateDeviceLibraryConfig(payload);
  const rawCustomDeviceTemplates = (Array.isArray(source.customDeviceTemplates) ? source.customDeviceTemplates : [])
    .filter((template) => template && typeof template === "object" && !Array.isArray(template))
    .map((template) => {
      const measurementDefinitions = Array.isArray(template.measurementDefinitions)
        ? normalizeDeviceLibraryMeasurementDefinitions(template.measurementDefinitions, template.kind)
        : undefined;
      const explicitlyDeletesAllMeasurements = measurementDefinitions?.length === 0 &&
        template.measurementDefinitionsIntent === "delete-all";
      return {
        ...template,
        categoryLibrary: template.categoryLibrary ?? template.attributeLibrary ?? "交流设备",
        params: normalizeDeviceLibraryParams(template.params, !String(template.kind ?? "").startsWith("static-"), template.kind),
        parameterDefinitions: normalizeDeviceLibraryParameterDefinitions(template.parameterDefinitions),
        ...(measurementDefinitions && (measurementDefinitions.length > 0 || explicitlyDeletesAllMeasurements)
          ? { measurementDefinitions }
          : { measurementDefinitions: undefined }),
        ...(explicitlyDeletesAllMeasurements
          ? { measurementDefinitionsIntent: "delete-all" }
          : { measurementDefinitionsIntent: undefined })
      };
    });
  const customCategoryLibraries = Array.isArray(source.customCategoryLibraries)
    ? source.customCategoryLibraries
    : Array.isArray(source.customAttributeLibraries)
      ? source.customAttributeLibraries
      : [];
  const customComponentLibraries = (Array.isArray(source.customComponentLibraries)
    ? source.customComponentLibraries
    : Array.isArray(source.customComponentTypes)
      ? source.customComponentTypes
      : [])
    .map((definition) => definition && typeof definition === "object" && !Array.isArray(definition)
      ? {
        ...definition,
        categoryLibraryName: definition.categoryLibraryName ?? definition.attributeLibraryName ?? "交流设备"
      }
      : definition);
  const customGraphTemplateTypes = Array.isArray(source.customGraphTemplateTypes) ? source.customGraphTemplateTypes : [];
  const customGraphTemplates = Array.isArray(source.customGraphTemplates) ? source.customGraphTemplates : [];
  const rawDeviceDefinitionOverrides =
    source.deviceDefinitionOverrides && typeof source.deviceDefinitionOverrides === "object" && !Array.isArray(source.deviceDefinitionOverrides)
      ? Object.fromEntries(Object.entries(source.deviceDefinitionOverrides).map(([kind, rawOverride]) => {
        if (!rawOverride || typeof rawOverride !== "object" || Array.isArray(rawOverride)) {
          return [kind, rawOverride];
        }
        const override = { ...rawOverride };
        const markedDeleteAll = Array.isArray(override.parameterDefinitions) &&
          override.parameterDefinitions.length === 0 && override.parameterDefinitionsIntent === "delete-all";
        if (Array.isArray(override.parameterDefinitions) && override.parameterDefinitions.length === 0 && !markedDeleteAll) {
          delete override.parameterDefinitions;
        }
        if (!markedDeleteAll) {
          delete override.parameterDefinitionsIntent;
        }
        const markedDeleteAllMeasurements = Array.isArray(override.measurementDefinitions) &&
          override.measurementDefinitions.length === 0 && override.measurementDefinitionsIntent === "delete-all";
        if (Array.isArray(override.measurementDefinitions) && override.measurementDefinitions.length === 0 &&
          !markedDeleteAllMeasurements) {
          delete override.measurementDefinitions;
        }
        if (!markedDeleteAllMeasurements) {
          delete override.measurementDefinitionsIntent;
        }
        return [kind, override];
      }))
      : {};
  const normalizedDeviceDefinitionOverrides = Object.fromEntries(
    Object.entries(rawDeviceDefinitionOverrides).map(([kind, override]) => {
      if (!override || typeof override !== "object" || Array.isArray(override)) {
        return [kind, override];
      }
      const parameterDefinitions = Array.isArray(override.parameterDefinitions)
        ? normalizeDeviceLibraryParameterDefinitions(override.parameterDefinitions)
        : undefined;
      const measurementDefinitions = Array.isArray(override.measurementDefinitions)
        ? normalizeDeviceLibraryMeasurementDefinitions(override.measurementDefinitions, kind)
        : undefined;
      const explicitlyDeletesAllParameters = parameterDefinitions?.length === 0 &&
        override.parameterDefinitionsIntent === "delete-all";
      const explicitlyDeletesAllMeasurements = measurementDefinitions?.length === 0 &&
        override.measurementDefinitionsIntent === "delete-all";
      return [kind, {
        ...override,
        params: normalizeDeviceLibraryParams(override.params, false, kind),
        ...(parameterDefinitions && (parameterDefinitions.length > 0 || explicitlyDeletesAllParameters)
          ? { parameterDefinitions }
          : {}),
        ...(measurementDefinitions && (measurementDefinitions.length > 0 || explicitlyDeletesAllMeasurements)
          ? { measurementDefinitions }
          : {}),
        ...(explicitlyDeletesAllParameters
          ? { parameterDefinitionsIntent: "delete-all" }
          : { parameterDefinitionsIntent: undefined }),
        ...(explicitlyDeletesAllMeasurements
          ? { measurementDefinitionsIntent: "delete-all" }
          : { measurementDefinitionsIntent: undefined })
      }];
    })
  );
  const deviceDefinitionSharedKeys = source.deviceDefinitionSharedKeys &&
    typeof source.deviceDefinitionSharedKeys === "object" &&
    !Array.isArray(source.deviceDefinitionSharedKeys)
    ? Object.fromEntries(Object.entries(source.deviceDefinitionSharedKeys).flatMap(([rawKind, rawSharedKey]) => {
        const kind = String(rawKind ?? "").trim();
        const sharedKey = String(rawSharedKey ?? "").trim();
        return kind && !kind.startsWith("shared:") && sharedKey.startsWith("shared:")
          ? [[kind, sharedKey]]
          : [];
      }))
    : {};
  const deviceDefinitionOverrides = { ...normalizedDeviceDefinitionOverrides };
  for (const template of rawCustomDeviceTemplates) {
    const kind = String(template.kind ?? "").trim();
    const sharedKey = deviceDefinitionSharedKeys[kind];
    if (!kind || !sharedKey) continue;
    const parameterDefinitions = Array.isArray(template.parameterDefinitions)
      ? template.parameterDefinitions
      : undefined;
    const measurementDefinitions = Array.isArray(template.measurementDefinitions)
      ? template.measurementDefinitions
      : undefined;
    if (!parameterDefinitions && !measurementDefinitions) continue;
    const existingConcrete = deviceDefinitionOverrides[kind] ?? {};
    deviceDefinitionOverrides[kind] = {
      ...template,
      ...existingConcrete,
      kind,
      params: {
        ...(template.params ?? {}),
        ...(existingConcrete.params ?? {})
      },
      ...(parameterDefinitions ? { parameterDefinitions } : {}),
      ...(measurementDefinitions ? { measurementDefinitions } : {}),
      ...(template.measurementDefinitionsIntent === "delete-all"
        ? { measurementDefinitionsIntent: "delete-all" }
        : {})
    };
  }
  for (const [kind, sharedKey] of Object.entries(deviceDefinitionSharedKeys)) {
    const rawConcrete = deviceDefinitionOverrides[kind];
    const concrete = rawConcrete && typeof rawConcrete === "object" && !Array.isArray(rawConcrete)
      ? rawConcrete
      : undefined;
    const concreteTemplate = rawCustomDeviceTemplates.find((template) => String(template.kind ?? "").trim() === kind);
    if (!concrete && !concreteTemplate) continue;
    const parameterDefinitions = Array.isArray(concrete?.parameterDefinitions)
      ? concrete.parameterDefinitions
      : undefined;
    const measurementDefinitions = Array.isArray(concrete?.measurementDefinitions)
      ? concrete.measurementDefinitions
      : undefined;
    const existingShared = deviceDefinitionOverrides[sharedKey] &&
      typeof deviceDefinitionOverrides[sharedKey] === "object" &&
      !Array.isArray(deviceDefinitionOverrides[sharedKey])
      ? deviceDefinitionOverrides[sharedKey]
      : {};
    const sharedAlreadyDefinesParameters = Array.isArray(existingShared.parameterDefinitions);
    const sharedAlreadyDefinesMeasurements = Array.isArray(existingShared.measurementDefinitions);
    const concreteBusinessParams = {
      ...sharedDeviceDefinitionParams(concreteTemplate?.params),
      ...sharedDeviceDefinitionParams(concrete?.params)
    };
    if (parameterDefinitions || measurementDefinitions || Object.keys(concreteBusinessParams).length > 0) {
      deviceDefinitionOverrides[sharedKey] = {
        ...existingShared,
        kind: sharedKey,
        params: {
          ...concreteBusinessParams,
          ...(existingShared.params ?? {})
        },
        ...(!sharedAlreadyDefinesParameters && parameterDefinitions ? { parameterDefinitions } : {}),
        ...(!sharedAlreadyDefinesParameters && concrete?.parameterDefinitionsIntent === "delete-all"
          ? { parameterDefinitionsIntent: "delete-all" }
          : {}),
        ...(!sharedAlreadyDefinesMeasurements && measurementDefinitions ? { measurementDefinitions } : {}),
        ...(!sharedAlreadyDefinesMeasurements && concrete?.measurementDefinitionsIntent === "delete-all"
          ? { measurementDefinitionsIntent: "delete-all" }
          : {}),
        updatedAt: existingShared.updatedAt ?? concrete?.updatedAt
      };
    }
    if (!concrete) continue;
    const visual = {
      ...concrete,
      params: concreteDeviceDefinitionParams(concrete.params)
    };
    delete visual.parameterDefinitions;
    delete visual.parameterDefinitionsIntent;
    delete visual.measurementDefinitions;
    delete visual.measurementDefinitionsIntent;
    const hasVisualContent = Object.entries(visual).some(([key, value]) => (
      !["kind", "updatedAt", "params"].includes(key) && value !== undefined
    )) || Object.keys(visual.params ?? {}).length > 0;
    if (hasVisualContent) {
      deviceDefinitionOverrides[kind] = visual;
    } else {
      delete deviceDefinitionOverrides[kind];
    }
  }
  const customDeviceTemplates = rawCustomDeviceTemplates.map((template) => {
    const next = {
      ...template,
      params: concreteDeviceDefinitionParams(template.params)
    };
    delete next.parameterDefinitions;
    delete next.parameterDefinitionsIntent;
    delete next.parameterDefinitionsComplete;
    delete next.measurementDefinitions;
    delete next.measurementDefinitionsIntent;
    return next;
  });
  const eDeviceDefinitionLabels =
    source.eDeviceDefinitionLabels && typeof source.eDeviceDefinitionLabels === "object" && !Array.isArray(source.eDeviceDefinitionLabels)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionLabels).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        const value = String(rawValue ?? "").trim();
        return key && value ? [[key, value]] : [];
      }))
      : {};
  const eDeviceDefinitionClassExportEnabled =
    source.eDeviceDefinitionClassExportEnabled && typeof source.eDeviceDefinitionClassExportEnabled === "object" && !Array.isArray(source.eDeviceDefinitionClassExportEnabled)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionClassExportEnabled).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        return key && typeof rawValue === "boolean" ? [[key, rawValue]] : [];
      }))
      : {};
  const eDeviceDefinitionFieldOrder =
    source.eDeviceDefinitionFieldOrder && typeof source.eDeviceDefinitionFieldOrder === "object" && !Array.isArray(source.eDeviceDefinitionFieldOrder)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionFieldOrder).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        if (!key || !Array.isArray(rawValue)) {
          return [];
        }
        const seen = new Set();
        const values = rawValue.flatMap((item) => {
          if (typeof item !== "string") {
            return [];
          }
          const value = normalizeGasQuantityFieldName(item);
          const normalizedValue = value.toLowerCase();
          if (!value || seen.has(normalizedValue)) {
            return [];
          }
          seen.add(normalizedValue);
          return [value];
        });
        return values.length > 0 ? [[key, values]] : [];
      }))
      : {};
  // 模板字段列定义（模板导入后用于 E 文件导出覆盖列名），必须持久化，
  // 否则重启后 node/unit 等表回退为旧列，与模板（如 sgcc.e）不一致。
  const eDeviceDefinitionTemplateFields =
    source.eDeviceDefinitionTemplateFields && typeof source.eDeviceDefinitionTemplateFields === "object" && !Array.isArray(source.eDeviceDefinitionTemplateFields)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionTemplateFields).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        if (!key || !Array.isArray(rawValue)) {
          return [];
        }
        const seen = new Set();
        const fields = rawValue.flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
          }
          const exportName = normalizeGasQuantityFieldName(item.exportName);
          if (!exportName) {
            return [];
          }
          const normalizedExportName = exportName.toLowerCase();
          if (seen.has(normalizedExportName)) {
            return [];
          }
          seen.add(normalizedExportName);
          const cnName = String(item.cnName ?? "").trim();
          const sourceName = typeof item.sourceName === "string" ? normalizeGasQuantityFieldName(item.sourceName) : "";
          return [{ sourceName: sourceName || undefined, exportName, cnName: cnName || exportName }];
        });
        return fields.length > 0 ? [[key, fields]] : [];
      }))
      : {};
  // 类 → 表号映射（如 ACGenerator -> "00411"），导出 E 文件时
  // 按 key_to_long(表号, 0, 行号) 计算 id 字段。必须持久化，否则重启
  // 后加载的实时库模板（ems_rtdb.e 等）导出的 id 仍为原值。
  const eDeviceDefinitionTableIds =
    source.eDeviceDefinitionTableIds && typeof source.eDeviceDefinitionTableIds === "object" && !Array.isArray(source.eDeviceDefinitionTableIds)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionTableIds).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        const value = typeof rawValue === "string" ? rawValue.trim() : "";
        if (!key || !value) {
          return [];
        }
        return [[key, value]];
      }))
      : {};
  return {
    schemaVersion: deviceLibrarySchemaVersion,
    customDeviceTemplates,
    customCategoryLibraries,
    customComponentLibraries,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides,
    deviceDefinitionSharedKeys,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds
  };
}
