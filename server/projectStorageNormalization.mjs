// 方案与模型存储边界归一化纯逻辑模块
// 从 server/server.mjs 抽离，无模块级路径常量、无磁盘 IO。
import { apiPath } from "./config.mjs";
import { inferESection } from "./eSectionMetadata.mjs";
import {
  meaningfulStoredDeviceParameterChineseName,
  normalizeDeviceLibraryParams,
  normalizeRunStatParameterDefinition,
  normalizeRunStatValue,
  serverSwitchingDeviceUsesClosedStatus
} from "./deviceLibraryNormalization.mjs";
import { maxFilePartLength, safeFilePart } from "./imageAssetHelpers.mjs";

const defaultPowerUnit = "MW";
const defaultVoltageUnit = "kV";
const defaultCurrentUnit = "A";
const defaultPowerBaseValue = 100;

const enumDefinitionIsEnum = (definition) => ["stringEnum", "numberEnum", "enum"].includes(definition?.valueType);

function enumOptionsForStoredDefinition(definition) {
  const source = Array.isArray(definition?.enumOptions) && definition.enumOptions.length > 0
    ? definition.enumOptions
    : Array.isArray(definition?.enumValues)
      ? definition.enumValues
      : [];
  const seen = new Set();
  const options = [];
  for (const rawOption of source) {
    const value = String(rawOption && typeof rawOption === "object" ? rawOption.value : rawOption ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = String(rawOption && typeof rawOption === "object" ? rawOption.label ?? "" : "").trim();
    options.push({ value, label });
  }
  return options;
}

function sectionEnumValues(section, name) {
  if (["status", "closed_status", "closed_status_set", "run_stat"].includes(name)) return ["1", "0"];
  if (name === "control_type") {
    if (section === "ACGenerator") return ["PV", "PQ", "PH"];
    if (section === "DCGenerator") return ["P", "V", "I", "NONE"];
    if (section === "HydroSource" || section === "HydroLoad") return ["FLOW", "PRESSURE"];
    if (["AcE2Hydro", "DcE2Hydro", "Hydro2AcE", "Hydro2DcE"].includes(section)) return ["P", "FLOW"];
    if (["AcE2Heat", "DcE2Heat", "AcE2Heat2", "DcE2Heat2"].includes(section)) return ["P", "T"];
  }
  if (section === "DCACConverter" && name === "ac_control_type") return ["PQ", "PV", "PH", "NONE"];
  if (section === "DCACConverter" && name === "dc_control_type") return ["P", "V", "I", "NONE"];
  if (section === "ACACConverter" && (name === "i_control_type" || name === "j_control_type")) return ["PQ", "PV", "PH", "NONE"];
  if (section === "DCDCConverter" && (name === "i_control_type" || name === "j_control_type")) return ["P", "V", "I", "NONE"];
  return [];
}

function containerEnumSection(paramKey) {
  const match = /^(?:control_type|status|run_stat)_(ac2|dc2|h22|heat2|ac|dc|h2|heat)_(unit|load|transformer)_t\d+$/.exec(paramKey);
  if (!match) return "";
  const mapping = {
    ac_unit: "ACGenerator",
    ac_load: "ACLoad",
    dc_unit: "DCGenerator",
    dc_load: "DCLoad",
    h2_unit: "HydroSource",
    h2_load: "HydroLoad",
    heat_unit: "HeatSource",
    heat_load: "HeatLoad"
  };
  return mapping[`${match[1].replace(/2$/, "")}_${match[2]}`] ?? "";
}

function storedNodeEnumBindings(node) {
  const params = node?.params ?? {};
  const section = inferESection(node?.kind, params);
  const definitions = storedEParameterDefinitions(params).filter(enumDefinitionIsEnum);
  const definitionByName = new Map(definitions.map((definition) => [definition.enName, definition]));
  const bindings = definitions.flatMap((definition) => {
    const sectionValues = params._customDeviceTemplate === "1" ? [] : sectionEnumValues(section, definition.enName);
    const options = sectionValues.length > 0
      ? sectionValues.map((value) => ({ value, label: "" }))
      : enumOptionsForStoredDefinition(definition);
    if (options.length === 0) return [];
    return [{ paramKey: definition.enName, definition, options, section, value: String(params[definition.enName] ?? "").trim() }];
  });
  for (const paramKey of ["control_type", "ac_control_type", "dc_control_type", "i_control_type", "j_control_type"]) {
    if (definitionByName.has(paramKey) || !Object.prototype.hasOwnProperty.call(params, paramKey)) continue;
    const values = sectionEnumValues(section, paramKey);
    if (values.length === 0) continue;
    bindings.push({
      paramKey,
      definition: { enName: paramKey, cnName: paramKey, valueType: "stringEnum" },
      options: values.map((value) => ({ value, label: "" })),
      section,
      value: String(params[paramKey] ?? "").trim()
    });
  }
  for (const paramKey of Object.keys(params)) {
    const associatedSection = containerEnumSection(paramKey);
    if (!associatedSection) continue;
    const enumName = paramKey.replace(/_(?:ac2|dc2|h22|heat2|ac|dc|h2|heat)_(?:unit|load|transformer)_t\d+$/, "");
    const values = sectionEnumValues(associatedSection, enumName);
    if (values.length === 0) continue;
    bindings.push({
      paramKey,
      definition: { enName: enumName, cnName: enumName, valueType: "stringEnum" },
      options: values.map((value) => ({ value, label: "" })),
      section: associatedSection,
      value: String(params[paramKey] ?? "").trim()
    });
  }
  return bindings;
}

function normalizeKnownStoredEnumValue(binding) {
  const { options, paramKey, section } = binding;
  const value = binding.value;
  const values = options.map((option) => option.value);
  if (values.includes(value)) return value;
  const labelMatch = options.find((option) => option.label === value);
  if (labelMatch) return labelMatch.value;
  const caseInsensitiveMatch = values.find((candidate) => candidate.toUpperCase() === value.toUpperCase());
  if (caseInsensitiveMatch) return caseInsensitiveMatch;
  if (paramKey === "status" || paramKey === "closed_status" || paramKey === "closed_status_set") {
    const lower = value.toLowerCase();
    const normalized = ["0", "打开", "开断", "打开/开断", "分闸", "open", "off", "false"].includes(lower) ? "0"
      : ["1", "闭合", "合闸", "closed", "on", "true"].includes(lower) ? "1" : value;
    if (values.includes(normalized)) return normalized;
  }
  if (paramKey === "run_stat") {
    const normalized = normalizeRunStatValue(value, "1");
    const aliases = normalized === "1" ? ["1", "运行", "投运"] : normalized === "0" ? ["0", "停运", "检修"] : [];
    const match = aliases.find((candidate) => values.includes(candidate));
    if (match) return match;
  }
  if (paramKey.includes("control_type")) {
    const aliases = { 定P: "P", 定V: "V", 定I: "I", 定PQ: "PQ", 定PV: "PV", 定PH: "PH", 不定: "0" };
    const normalized = String(aliases[value] ?? value).toUpperCase();
    if (values.includes(normalized)) return normalized;
    if (["AcE2Hydro", "DcE2Hydro", "Hydro2AcE", "Hydro2DcE"].includes(section) && ["PQ", "PV", "PH"].includes(normalized) && values.includes("P")) {
      return "P";
    }
    if (["0", "SLACK"].includes(normalized) && values.includes("NONE")) return "NONE";
  }
  return value;
}

function normalizeProjectEnumValuesForStorage(project) {
  let changed = false;
  const nodes = (Array.isArray(project?.nodes) ? project.nodes : []).map((node) => {
    let params = node?.params ?? {};
    for (const binding of storedNodeEnumBindings(node)) {
      const normalized = normalizeKnownStoredEnumValue(binding);
      if (normalized === binding.value) continue;
      if (params === node.params) params = { ...params };
      params[binding.paramKey] = normalized;
    }
    if (params === node.params) return node;
    changed = true;
    return { ...node, params };
  });
  return changed ? { ...project, nodes } : project;
}

function normalizeStoredDeviceParameterDefinitionNames(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return value;
    const normalized = parsed.map((definition) => {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) return definition;
      const normalizeName = (name) => {
        const text = String(name ?? "").trim();
        if (/^(?:gasQuantity|gasquantity)$/u.test(text)) return "gas_quantity";
        if (/^(?:state_of_charge|stateOfCharge)$/u.test(text)) return "soc";
        if (text === "status_set") return "closed_status_set";
        return text;
      };
      const enName = normalizeName(definition.enName);
      const exportName = typeof definition.exportName === "string" ? normalizeName(definition.exportName) : definition.exportName;
      return normalizeRunStatParameterDefinition({
        ...definition,
        cnName: meaningfulStoredDeviceParameterChineseName(enName, definition.cnName),
        enName,
        ...(enName === "soc" && String(definition.typicalValue ?? "").trim()
          ? { typicalValue: normalizeDeviceLibraryParams({ soc: definition.typicalValue }).soc }
          : {}),
        ...(definition.exportName !== undefined ? { exportName } : {})
      });
    });
    const serialized = JSON.stringify(normalized);
    return serialized === value ? value : serialized;
  } catch {
    return value;
  }
}

function normalizeStoredDeviceParams(params = {}) {
  const next = {};
  const priorities = new Map();
  for (const [key, value] of Object.entries(params)) {
    const normalizedKey = /^(?:gasQuantity|gasquantity)$/u.test(key)
      ? "gas_quantity"
      : /^(?:state_of_charge|stateOfCharge)$/u.test(key)
        ? "soc"
      : key === "runStat"
        ? "run_stat"
        : key === "status_set"
          ? "closed_status_set"
        : key;
    const priority = normalizedKey === "soc"
      ? key === "soc" ? 2 : 1
      : normalizedKey === "run_stat"
      ? key === "run_stat" ? 2 : 1
      : normalizedKey !== "gas_quantity"
      ? 0
      : key === "gas_quantity"
        ? 3
        : key === "gasQuantity"
          ? 2
          : 1;
    if ((priorities.get(normalizedKey) ?? -1) > priority) continue;
    priorities.set(normalizedKey, priority);
    next[normalizedKey] = key === "_customParamDefinitions"
      ? normalizeStoredDeviceParameterDefinitionNames(value)
      : normalizedKey === "run_stat"
        ? normalizeRunStatValue(value, "1")
        : ["soc", "soc_upper_limit", "soc_lower_limit"].includes(normalizedKey) && String(value ?? "").trim()
          ? (() => {
              const text = String(value).trim();
              const numeric = Number(text.replace(/%$/u, ""));
              return Number.isFinite(numeric)
                ? String(Math.abs(numeric) > 1 || text.endsWith("%") ? numeric / 100 : numeric)
                : value;
            })()
          : value;
  }
  return next;
}

const hydrogenStorageKinds = new Set([
  "hydrogen-tank",
  "hydrogen-tank-horizontal",
  "hydrogen-tank-container"
]);

function normalizeStoredHydrogenStorageParameterDefinitions(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return value;
    let ratedCapacityIndex = -1;
    let ratedCapacityIsCanonical = false;
    const normalized = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        normalized.push(entry);
        continue;
      }
      const rawName = String(entry.enName ?? "").trim();
      if (rawName !== "capacity" && rawName !== "rated_capacity") {
        normalized.push(entry);
        continue;
      }
      const normalizedDefinition = {
        ...entry,
        cnName: "额定容量(m3)",
        enName: "rated_capacity",
        valueType: "float",
        ...(entry.exportName !== undefined
          ? { exportName: String(entry.exportName).trim() === "capacity" ? "rated_capacity" : entry.exportName }
          : {})
      };
      const canonical = rawName === "rated_capacity";
      if (ratedCapacityIndex < 0) {
        ratedCapacityIndex = normalized.length;
        ratedCapacityIsCanonical = canonical;
        normalized.push(normalizedDefinition);
      } else if (canonical && !ratedCapacityIsCanonical) {
        normalized[ratedCapacityIndex] = normalizedDefinition;
        ratedCapacityIsCanonical = true;
      }
    }
    const serialized = JSON.stringify(normalized);
    return serialized === value ? value : serialized;
  } catch {
    return value;
  }
}

function normalizeStoredHydrogenStorageParams(kind, params) {
  if (!hydrogenStorageKinds.has(String(kind ?? ""))) return params;
  const next = { ...params };
  if (Object.prototype.hasOwnProperty.call(next, "capacity")) {
    if (!String(next.rated_capacity ?? "").trim()) {
      next.rated_capacity = next.capacity;
    }
    delete next.capacity;
  }
  if (next._customParamDefinitions !== undefined) {
    next._customParamDefinitions = normalizeStoredHydrogenStorageParameterDefinitions(next._customParamDefinitions);
  }
  return next;
}

function normalizeStoredSwitchingDeviceParams(kind, params) {
  if (!serverSwitchingDeviceUsesClosedStatus(kind, params) ||
    Object.prototype.hasOwnProperty.call(params, "closed_status") ||
    !Object.prototype.hasOwnProperty.call(params, "status")) {
    return params;
  }
  return { ...params, closed_status: params.status };
}

const acBranchMeasurementContract = {
  fields: ["i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i"],
  aliases: { p: "i_p", q: "i_q", u: "i_u", i: "i_i" }
};
const dcBranchMeasurementContract = {
  fields: ["i_p", "i_u", "i_i", "j_p", "j_u", "j_i"],
  aliases: { p: "i_p", q: undefined, u: "i_u", i: "i_i" }
};

function storedBranchMeasurementContract(kind) {
  const normalizedKind = String(kind ?? "").replace(/-vertical$/u, "");
  if (normalizedKind === "ac-line" || normalizedKind === "ac-routable-line") return acBranchMeasurementContract;
  if (normalizedKind === "dc-line" || normalizedKind === "dc-routable-line") return dcBranchMeasurementContract;
  return undefined;
}

function normalizeStoredBranchParameterDefinitions(value, contract) {
  if (value === undefined) return value;
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return value;
    const canonicalFields = new Set(contract.fields);
    const overrides = new Map();
    const extras = [];
    for (const rawDefinition of parsed) {
      if (!rawDefinition || typeof rawDefinition !== "object" || Array.isArray(rawDefinition)) {
        extras.push(rawDefinition);
        continue;
      }
      const rawName = String(rawDefinition.enName ?? "").trim();
      const hasAlias = Object.prototype.hasOwnProperty.call(contract.aliases, rawName);
      const canonicalName = hasAlias ? contract.aliases[rawName] : rawName;
      if (!canonicalName) continue;
      const rawExportName = typeof rawDefinition.exportName === "string" ? rawDefinition.exportName.trim() : undefined;
      const exportName = rawExportName && Object.prototype.hasOwnProperty.call(contract.aliases, rawExportName)
        ? contract.aliases[rawExportName]
        : rawExportName;
      const definition = {
        ...rawDefinition,
        cnName: meaningfulStoredDeviceParameterChineseName(canonicalName, rawDefinition.cnName),
        enName: canonicalName,
        ...(rawDefinition.exportName !== undefined ? { exportName: exportName || canonicalName } : {})
      };
      if (!canonicalFields.has(canonicalName)) {
        extras.push(definition);
        continue;
      }
      const canonical = canonicalName === rawName;
      const existing = overrides.get(canonicalName);
      if (!existing || (canonical && !existing.canonical)) overrides.set(canonicalName, { definition, canonical });
    }
    return JSON.stringify([
      ...contract.fields.map((field) => {
        const override = overrides.get(field)?.definition;
        return {
          ...override,
          cnName: meaningfulStoredDeviceParameterChineseName(field, override?.cnName),
          enName: field,
          valueType: "float",
          typicalValue: String(override?.typicalValue ?? "").trim() || "0",
          readonly: false,
          exportEnabled: true,
          exportName: field
        };
      }),
      ...extras
    ]);
  } catch {
    return value;
  }
}

function normalizeStoredBranchParams(kind, params) {
  const contract = storedBranchMeasurementContract(kind);
  if (!contract) return params;
  const next = { ...params };
  for (const [legacyField, canonicalField] of Object.entries(contract.aliases)) {
    if (
      canonicalField &&
      !String(next[canonicalField] ?? "").trim() &&
      Object.prototype.hasOwnProperty.call(next, legacyField)
    ) {
      next[canonicalField] = next[legacyField];
    }
    delete next[legacyField];
  }
  for (const field of contract.fields) {
    if (!Object.prototype.hasOwnProperty.call(next, field)) next[field] = "0";
  }
  if (next._customParamDefinitions !== undefined) {
    next._customParamDefinitions = normalizeStoredBranchParameterDefinitions(next._customParamDefinitions, contract);
  }
  return next;
}

function normalizeStoredBranchMeasurementItem(nodeId, item, contract) {
  const associatedField = String(item?.associatedField ?? "").trim();
  const hasAssociatedAlias = Object.prototype.hasOwnProperty.call(contract.aliases, associatedField);
  const canonicalAssociatedField = hasAssociatedAlias ? contract.aliases[associatedField] : associatedField;
  const sourcePoint = String(item?.sourcePoint ?? "").trim();
  let canonicalSourcePoint = sourcePoint;
  const nodePrefix = `${nodeId}.`;
  if (sourcePoint.startsWith(nodePrefix)) {
    const sourceSegments = sourcePoint.slice(nodePrefix.length).split(".");
    const sourceField = sourceSegments[sourceSegments.length - 1];
    if (Object.prototype.hasOwnProperty.call(contract.aliases, sourceField)) {
      const canonicalSourceField = contract.aliases[sourceField];
      canonicalSourcePoint = canonicalSourceField
        ? `${nodePrefix}${[...sourceSegments.slice(0, -1), canonicalSourceField].join(".")}`
        : "";
    }
  }
  return {
    ...item,
    ...(canonicalAssociatedField ? { associatedField: canonicalAssociatedField } : { associatedField: undefined }),
    sourcePoint: canonicalSourcePoint
  };
}

const twoWindingTransformerKinds = new Set([
  "ac-transformer",
  "ac-two-winding-transformer"
]);

const twoWindingTransformerMeasurementDefinitionsForStorage = [
  { cnName: "高压侧有功值", enName: "i_p" },
  { cnName: "高压侧无功值", enName: "i_q" },
  { cnName: "高压侧电压值", enName: "i_u" },
  { cnName: "高压侧电流值", enName: "i_i" },
  { cnName: "低压侧有功值", enName: "j_p" },
  { cnName: "低压侧无功值", enName: "j_q" },
  { cnName: "低压侧电压值", enName: "j_u" },
  { cnName: "低压侧电流值", enName: "j_i" },
  { cnName: "分接头档位", enName: "tap" }
];

const twoWindingTransformerLegacyMeasurementFieldAliases = {
  p: "i_p",
  q: "i_q",
  u: "i_u",
  i: "i_i"
};

const twoWindingTransformerLegacyParameterFieldAliases = {
  high_vbase: "i_vbase",
  highVbase: "i_vbase",
  high_i_max: "i_i_max",
  highIMax: "i_i_max",
  high_max_current: "i_i_max",
  highMaxCurrent: "i_i_max",
  low_vbase: "j_vbase",
  lowVbase: "j_vbase",
  low_i_max: "j_i_max",
  lowIMax: "j_i_max",
  low_max_current: "j_i_max",
  lowMaxCurrent: "j_i_max",
  ...twoWindingTransformerLegacyMeasurementFieldAliases
};

const twoWindingTransformerParameterChineseNames = {
  rdf_id: "原始ID",
  idx: "序号",
  name: "名称",
  parent: "所属模型",
  dev_type: "设备类型",
  status: "运行状态",
  run_stat: "工作状态",
  i_node: "高压侧节点号",
  j_node: "低压侧节点号",
  i_vbase: "高压侧电压等级",
  i_i_max: "高压侧最大电流",
  j_vbase: "低压侧电压等级",
  j_i_max: "低压侧最大电流",
  rated_capacity: "额定容量",
  ratedCapacity: "额定容量",
  r: "电阻",
  x: "电抗",
  gt: "励磁电导",
  bt: "励磁电纳",
  tap: "分接头档位",
  tap_set: "分接头档位设定值",
  shift: "相移（度）",
  ...Object.fromEntries(twoWindingTransformerMeasurementDefinitionsForStorage.map(({ enName, cnName }) => [enName, cnName]))
};

function normalizeStoredTwoWindingTransformerParameterDefinitions(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return value;
    const canonicalFields = new Set(twoWindingTransformerMeasurementDefinitionsForStorage.map((definition) => definition.enName));
    const overrides = new Map();
    const extras = [];
    for (const definition of parsed) {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
        extras.push(definition);
        continue;
      }
      const rawField = String(definition.enName ?? "").trim();
      const canonicalField = twoWindingTransformerLegacyParameterFieldAliases[rawField] ?? rawField;
      const cnName = twoWindingTransformerParameterChineseNames[canonicalField];
      const normalizedDefinition = {
        ...definition,
        ...(cnName ? { cnName } : {}),
        enName: canonicalField,
        ...(definition.exportName !== undefined && twoWindingTransformerLegacyParameterFieldAliases[definition.exportName]
          ? { exportName: twoWindingTransformerLegacyParameterFieldAliases[definition.exportName] }
          : {})
      };
      if (!canonicalFields.has(canonicalField)) {
        extras.push(normalizedDefinition);
        continue;
      }
      const canonical = canonicalField === rawField;
      const existing = overrides.get(canonicalField);
      if (!existing || (canonical && !existing.canonical)) {
        overrides.set(canonicalField, { canonical, definition: normalizedDefinition });
      }
    }
    return JSON.stringify([
      ...twoWindingTransformerMeasurementDefinitionsForStorage.map((baseDefinition) => {
        const override = overrides.get(baseDefinition.enName)?.definition;
        return {
          ...override,
          cnName: baseDefinition.cnName,
          enName: baseDefinition.enName,
          valueType: "float",
          typicalValue: String(override?.typicalValue ?? "").trim() || "0",
          readonly: false,
          exportEnabled: true
        };
      }),
      ...extras
    ]);
  } catch {
    return value;
  }
}

function normalizeStoredTwoWindingTransformerParams(kind, params) {
  if (!twoWindingTransformerKinds.has(String(kind ?? ""))) return params;
  const next = { ...params };
  for (const [legacyField, canonicalField] of Object.entries(twoWindingTransformerLegacyParameterFieldAliases)) {
    if (!String(next[canonicalField] ?? "").trim() && Object.prototype.hasOwnProperty.call(next, legacyField)) {
      next[canonicalField] = next[legacyField];
    }
    delete next[legacyField];
  }
  for (const { enName } of twoWindingTransformerMeasurementDefinitionsForStorage) {
    if (!String(next[enName] ?? "").trim()) {
      next[enName] = "0";
    }
  }
  next._customParamDefinitions = normalizeStoredTwoWindingTransformerParameterDefinitions(next._customParamDefinitions);
  return next;
}

function normalizeStoredTwoWindingTransformerMeasurementItem(nodeId, item) {
  const associatedField = String(item?.associatedField ?? "").trim();
  const canonicalAssociatedField = twoWindingTransformerLegacyMeasurementFieldAliases[associatedField] ?? associatedField;
  const sourcePoint = String(item?.sourcePoint ?? "").trim();
  let canonicalSourcePoint = sourcePoint;
  const nodePrefix = `${nodeId}.`;
  if (sourcePoint.startsWith(nodePrefix)) {
    const sourceSegments = sourcePoint.slice(nodePrefix.length).split(".");
    const legacySourceField = sourceSegments[sourceSegments.length - 1];
    const canonicalSourceField = twoWindingTransformerLegacyMeasurementFieldAliases[legacySourceField];
    if (canonicalSourceField) {
      sourceSegments[sourceSegments.length - 1] = canonicalSourceField;
      canonicalSourcePoint = `${nodePrefix}${sourceSegments.join(".")}`;
    }
  }
  return {
    ...item,
    ...(canonicalAssociatedField ? { associatedField: canonicalAssociatedField } : {}),
    sourcePoint: canonicalSourcePoint
  };
}

const threeWindingTransformerKinds = new Set([
  "ac-three-winding-transformer",
  "ac-three-winding-transformer-neutral"
]);

const threeWindingTransformerMeasurementDefinitionsForStorage = [
  { cnName: "高压侧有功量测", enName: "i_p" },
  { cnName: "高压侧无功量测", enName: "i_q" },
  { cnName: "高压侧电压量测", enName: "i_u" },
  { cnName: "高压侧电流量测", enName: "i_i" },
  { cnName: "中压侧有功量测", enName: "k_p" },
  { cnName: "中压侧无功量测", enName: "k_q" },
  { cnName: "中压侧电压量测", enName: "k_u" },
  { cnName: "中压侧电流量测", enName: "k_i" },
  { cnName: "低压侧有功量测", enName: "j_p" },
  { cnName: "低压侧无功量测", enName: "j_q" },
  { cnName: "低压侧电压量测", enName: "j_u" },
  { cnName: "低压侧电流量测", enName: "j_i" }
];

const threeWindingTransformerLegacyParameterFieldAliases = {
  t1_node: "i_node",
  t2_node: "k_node",
  t3_node: "j_node",
  high_vbase: "i_vbase",
  highVbase: "i_vbase",
  high_rated_capacity: "i_rated_capacity",
  highRatedCapacity: "i_rated_capacity",
  high_i_max: "i_i_max",
  highIMax: "i_i_max",
  high_max_current: "i_i_max",
  highMaxCurrent: "i_i_max",
  medium_vbase: "k_vbase",
  mediumVbase: "k_vbase",
  medium_rated_capacity: "k_rated_capacity",
  mediumRatedCapacity: "k_rated_capacity",
  medium_i_max: "k_i_max",
  mediumIMax: "k_i_max",
  medium_max_current: "k_i_max",
  mediumMaxCurrent: "k_i_max",
  low_vbase: "j_vbase",
  lowVbase: "j_vbase",
  low_rated_capacity: "j_rated_capacity",
  lowRatedCapacity: "j_rated_capacity",
  low_i_max: "j_i_max",
  lowIMax: "j_i_max",
  low_max_current: "j_i_max",
  lowMaxCurrent: "j_i_max",
  r1: "i_r",
  x1: "i_x",
  gt1: "i_gt",
  bt1: "i_bt",
  tap1: "i_tap",
  shift1: "i_shift",
  high_resistance_pu: "i_r",
  highResistancePu: "i_r",
  high_reactance_pu: "i_x",
  highReactancePu: "i_x",
  high_magnetizing_conductance_pu: "i_gt",
  highMagnetizingConductancePu: "i_gt",
  high_magnetizing_susceptance_pu: "i_bt",
  highMagnetizingSusceptancePu: "i_bt",
  high_tap_ratio: "i_tap",
  highTapRatio: "i_tap",
  high_shift: "i_shift",
  highShift: "i_shift",
  r2: "k_r",
  x2: "k_x",
  gt2: "k_gt",
  bt2: "k_bt",
  tap2: "k_tap",
  shift2: "k_shift",
  medium_resistance_pu: "k_r",
  mediumResistancePu: "k_r",
  medium_reactance_pu: "k_x",
  mediumReactancePu: "k_x",
  medium_magnetizing_conductance_pu: "k_gt",
  mediumMagnetizingConductancePu: "k_gt",
  medium_magnetizing_susceptance_pu: "k_bt",
  mediumMagnetizingSusceptancePu: "k_bt",
  medium_tap_ratio: "k_tap",
  mediumTapRatio: "k_tap",
  medium_shift: "k_shift",
  mediumShift: "k_shift",
  r3: "j_r",
  x3: "j_x",
  gt3: "j_gt",
  bt3: "j_bt",
  tap3: "j_tap",
  shift3: "j_shift",
  low_resistance_pu: "j_r",
  lowResistancePu: "j_r",
  low_reactance_pu: "j_x",
  lowReactancePu: "j_x",
  low_magnetizing_conductance_pu: "j_gt",
  lowMagnetizingConductancePu: "j_gt",
  low_magnetizing_susceptance_pu: "j_bt",
  lowMagnetizingSusceptancePu: "j_bt",
  low_tap_ratio: "j_tap",
  lowTapRatio: "j_tap",
  low_shift: "j_shift",
  lowShift: "j_shift",
  p: "i_p",
  q: "i_q",
  u: "i_u",
  i: "i_i"
};

const threeWindingTransformerParameterChineseNames = {
  rdf_id: "原始ID",
  idx: "序号",
  name: "名称",
  parent: "所属模型",
  dev_type: "设备类型",
  status: "运行状态",
  run_stat: "工作状态",
  i_node: "高压侧节点号",
  k_node: "中压侧节点号",
  j_node: "低压侧节点号",
  neutral_node: "中性点节点号",
  i_vbase: "高压侧电压等级",
  i_rated_capacity: "高压侧额定容量",
  i_i_max: "高压侧最大电流",
  k_vbase: "中压侧电压等级",
  k_rated_capacity: "中压侧额定容量",
  k_i_max: "中压侧最大电流",
  j_vbase: "低压侧电压等级",
  j_rated_capacity: "低压侧额定容量",
  j_i_max: "低压侧最大电流",
  neutral_vbase: "中性点电压等级",
  i_r: "高压侧电阻",
  i_x: "高压侧电抗",
  i_gt: "高压侧励磁电导",
  i_bt: "高压侧励磁电纳",
  i_tap: "高压侧变比",
  i_shift: "高压侧相移（度）",
  k_r: "中压侧电阻",
  k_x: "中压侧电抗",
  k_gt: "中压侧励磁电导",
  k_bt: "中压侧励磁电纳",
  k_tap: "中压侧变比",
  k_shift: "中压侧相移（度）",
  j_r: "低压侧电阻",
  j_x: "低压侧电抗",
  j_gt: "低压侧励磁电导",
  j_bt: "低压侧励磁电纳",
  j_tap: "低压侧变比",
  j_shift: "低压侧相移（度）",
  ...Object.fromEntries(threeWindingTransformerMeasurementDefinitionsForStorage.map(({ enName, cnName }) => [enName, cnName]))
};

function normalizeStoredThreeWindingTransformerParameterDefinitions(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return value;
    const measurementFields = new Set(threeWindingTransformerMeasurementDefinitionsForStorage.map(({ enName }) => enName));
    const overrides = new Map();
    const extras = [];
    for (const definition of parsed) {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
        extras.push(definition);
        continue;
      }
      const rawField = String(definition.enName ?? "").trim();
      const canonicalField = threeWindingTransformerLegacyParameterFieldAliases[rawField] ?? rawField;
      const cnName = threeWindingTransformerParameterChineseNames[canonicalField];
      const normalizedDefinition = {
        ...definition,
        ...(cnName ? { cnName } : {}),
        enName: canonicalField,
        ...(definition.exportName !== undefined && threeWindingTransformerLegacyParameterFieldAliases[definition.exportName]
          ? { exportName: threeWindingTransformerLegacyParameterFieldAliases[definition.exportName] }
          : {})
      };
      if (!measurementFields.has(canonicalField)) {
        extras.push(normalizedDefinition);
        continue;
      }
      const canonical = canonicalField === rawField;
      const existing = overrides.get(canonicalField);
      if (!existing || (canonical && !existing.canonical)) {
        overrides.set(canonicalField, { canonical, definition: normalizedDefinition });
      }
    }
    return JSON.stringify([
      ...threeWindingTransformerMeasurementDefinitionsForStorage.map((baseDefinition) => {
        const override = overrides.get(baseDefinition.enName)?.definition;
        return {
          ...override,
          cnName: baseDefinition.cnName,
          enName: baseDefinition.enName,
          valueType: "float",
          typicalValue: String(override?.typicalValue ?? "").trim() || "0",
          readonly: false,
          exportEnabled: true,
          exportName: baseDefinition.enName
        };
      }),
      ...extras
    ]);
  } catch {
    return value;
  }
}

function normalizeStoredThreeWindingTransformerParams(kind, params) {
  if (!threeWindingTransformerKinds.has(String(kind ?? ""))) return params;
  const next = { ...params };
  for (const [legacyField, canonicalField] of Object.entries(threeWindingTransformerLegacyParameterFieldAliases)) {
    if (!String(next[canonicalField] ?? "").trim() && Object.prototype.hasOwnProperty.call(next, legacyField)) {
      next[canonicalField] = next[legacyField];
    }
    if (legacyField !== canonicalField) delete next[legacyField];
  }
  for (const { enName } of threeWindingTransformerMeasurementDefinitionsForStorage) {
    if (!String(next[enName] ?? "").trim()) next[enName] = "0";
  }
  next._customParamDefinitions = normalizeStoredThreeWindingTransformerParameterDefinitions(next._customParamDefinitions);
  return next;
}

function normalizeStoredThreeWindingTransformerMeasurementItem(nodeId, item) {
  const associatedField = String(item?.associatedField ?? "").trim();
  const canonicalAssociatedField = threeWindingTransformerLegacyParameterFieldAliases[associatedField] ?? associatedField;
  const sourcePoint = String(item?.sourcePoint ?? "").trim();
  let canonicalSourcePoint = sourcePoint;
  const nodePrefix = `${nodeId}.`;
  if (sourcePoint.startsWith(nodePrefix)) {
    const sourceSegments = sourcePoint.slice(nodePrefix.length).split(".");
    const legacySourceField = sourceSegments[sourceSegments.length - 1];
    const canonicalSourceField = threeWindingTransformerLegacyParameterFieldAliases[legacySourceField];
    if (canonicalSourceField) {
      sourceSegments[sourceSegments.length - 1] = canonicalSourceField;
      canonicalSourcePoint = `${nodePrefix}${sourceSegments.join(".")}`;
    }
  }
  return {
    ...item,
    ...(canonicalAssociatedField ? { associatedField: canonicalAssociatedField } : {}),
    sourcePoint: canonicalSourcePoint
  };
}

function normalizeProjectDeviceParameterNamesForStorage(project) {
  const sourceNodes = Array.isArray(project?.nodes) ? project.nodes : [];
  const branchMeasurementContractsByNodeId = new Map(sourceNodes.flatMap((node) => {
    const nodeId = String(node?.id ?? "");
    const contract = storedBranchMeasurementContract(node?.kind);
    return nodeId && contract ? [[nodeId, contract]] : [];
  }));
  const twoWindingTransformerNodeIds = new Set(sourceNodes
    .filter((node) => twoWindingTransformerKinds.has(String(node?.kind ?? "")))
    .map((node) => String(node?.id ?? ""))
    .filter(Boolean));
  const threeWindingTransformerNodeIds = new Set(sourceNodes
    .filter((node) => threeWindingTransformerKinds.has(String(node?.kind ?? "")))
    .map((node) => String(node?.id ?? ""))
    .filter(Boolean));
  const nodes = sourceNodes.map((node) => ({
    ...node,
    params: normalizeStoredThreeWindingTransformerParams(
      node?.kind,
      normalizeStoredTwoWindingTransformerParams(
        node?.kind,
        normalizeStoredBranchParams(
          node?.kind,
          normalizeStoredHydrogenStorageParams(
            node?.kind,
            normalizeStoredSwitchingDeviceParams(node?.kind, normalizeStoredDeviceParams(node?.params ?? {}))
          )
        )
      )
    )
  }));
  const measurements = project?.measurements && typeof project.measurements === "object"
    ? {
        ...project.measurements,
        groups: (Array.isArray(project.measurements.groups) ? project.measurements.groups : []).map((group) => ({
          ...group,
          items: (Array.isArray(group?.items) ? group.items : []).map((item) => {
            const normalizedItem = {
              ...item,
              measurementTypeId: /^(?:state_of_charge|stateOfCharge)$/u.test(String(item?.measurementTypeId ?? "").trim())
                ? "soc"
                : item?.measurementTypeId,
              associatedField: /^(?:state_of_charge|stateOfCharge)$/u.test(String(item?.associatedField ?? "").trim())
                ? "soc"
                : item?.associatedField,
              sourcePoint: String(item?.sourcePoint ?? "")
                .trim()
                .replace(/(^|\.)(?:gasQuantity|gasquantity)$/u, "$1gas_quantity")
                .replace(/(^|\.)(?:state_of_charge|stateOfCharge)$/u, "$1soc")
            };
            if (threeWindingTransformerNodeIds.has(String(group?.nodeId ?? ""))) {
              return normalizeStoredThreeWindingTransformerMeasurementItem(group.nodeId, normalizedItem);
            }
            if (twoWindingTransformerNodeIds.has(String(group?.nodeId ?? ""))) {
              return normalizeStoredTwoWindingTransformerMeasurementItem(group.nodeId, normalizedItem);
            }
            const branchContract = branchMeasurementContractsByNodeId.get(String(group?.nodeId ?? ""));
            return branchContract
              ? normalizeStoredBranchMeasurementItem(group.nodeId, normalizedItem, branchContract)
              : normalizedItem;
          })
        }))
      }
    : project?.measurements;
  return { ...project, nodes, ...(measurements ? { measurements } : {}) };
}

function invalidProjectEnumParameters(project) {
  return (Array.isArray(project?.nodes) ? project.nodes : []).flatMap((node) => storedNodeEnumBindings(node).flatMap((binding) => {
    const allowedValues = binding.options.map((option) => option.value);
    if (!binding.value && binding.definition?.typicalValue && allowedValues.includes(String(binding.definition.typicalValue).trim())) return [];
    return allowedValues.includes(binding.value) ? [] : [{ node, binding, allowedValues }];
  }));
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

// 量测配置同样按「渲染层可无条件解引用」的形状归一：svg.ts 的 measurementMarkup 直接
// `measurements.groups.map(...)`，而 measurements 不是对象时（手写 JSON 里写成字符串、
// 数组，或整个缺失）就会抛 `reading 'map'`，SVG 导出 500。
// 缺 measurements 时返回 undefined，JSON.stringify 会直接省掉这个键 —— 不凭空给每个模型
// 造一个空量测配置。
function normalizeStoredMeasurements(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const source = typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...source,
    groups: (Array.isArray(source.groups) ? source.groups : [])
      .filter((group) => group && typeof group === "object")
  };
}

function normalizeProjectForStorage(project) {
  // 非对象节点必须**在本函数第一行**滤掉，不能等到分配 idx 之前，更不能等到下面两个归一化
  // 之后：它们对每个元素做 `{ ...node, params: {...} }`，null / 字符串 / 数字元素在那里被
  // 就地摊成「看起来合法、却没有 id/kind/size」的节点（探针实测：filter 放在分配 idx 之前
  // 仍漏，落盘里就是一个 `{"params":{}}`），SVG 导出随即在 exportSvgSafeId(node.id) 上崩。
  project = {
    ...project,
    nodes: Array.isArray(project?.nodes)
      ? project.nodes.filter((node) => node && typeof node === "object")
      : []
  };
  project = normalizeProjectDeviceParameterNamesForStorage(project);
  project = normalizeProjectEnumValuesForStorage(project);
  const indexed = assignMissingDeviceIndexes(
    Array.isArray(project?.nodes) ? project.nodes : [],
    project?.deviceIndexCounters
  );
  return {
    ...project,
    powerUnit: project.powerUnit ?? defaultPowerUnit,
    voltageUnit: project.voltageUnit ?? defaultVoltageUnit,
    currentUnit: project.currentUnit ?? defaultCurrentUnit,
    powerBaseValue:
      typeof project.powerBaseValue === "number" && Number.isFinite(project.powerBaseValue)
        ? project.powerBaseValue
        : defaultPowerBaseValue,
    deviceIndexCounters: indexed.counters,
    measurements: normalizeStoredMeasurements(project.measurements),
    // 下面是**边界归一化**，把「存储里的模型 JSON」补成渲染层可以无条件解引用的形状。
    // 保存接口对 record.project 不做结构校验（手写 JSON、ZIP 导入、外部工具产出都可能缺字段），
    // 而 SVG / E 文件 / CIM 三条服务端导出链（以及复用同一批渲染器的方案 ZIP 导出）各自按
    // 结构假设解引用，结果是一个缺 size 的节点就能让多个导出端点一起 500 —— 用户视角是
    // 「存得好好的，怎么导不出来」。
    //
    // 选在这里而不是各渲染点补 `?.`：入口只有一处，所有消费方一次受益，且这里本来就是
    // 「读到的模型一律先过 normalizeProjectForStorage」的唯一位置。
    // 真实模型本来就带齐这些字段，下面的补全对正常数据是恒等变换。
    nodes: indexed.nodes
      .map((node) => {
        const assetId = node?.params?.backgroundImageAssetId;
        const backgroundImage = node?.params?.backgroundImage;
        const params = {
          ...(node?.params ?? {}),
          ...(assetId && typeof backgroundImage === "string" && backgroundImage.startsWith("data:")
            ? { backgroundImage: apiPath(`/images/${assetId}`) }
            : {})
        };
        return {
          ...node,
          kind: String(node.kind ?? ""),
          // 已经是对象就**原样复用**，不另造一份：本函数在每次模型读取时都跑（方案树
          // 带 includeProjects=1 时是每个模型一次），按节点新造 position/size/anchor
          // 会给正常数据平白加三份分配。只有畸形输入才落到默认值分支。
          // 缺位置按画布原点算；缺尺寸按 0 —— 节点没声明时，这是诚实的取值。
          position: isPlainObject(node.position) ? node.position : { x: 0, y: 0 },
          size: isPlainObject(node.size) ? node.size : { width: 0, height: 0 },
          params,
          terminals: (Array.isArray(node.terminals) ? node.terminals : [])
            .filter((terminal) => terminal && typeof terminal === "object")
            // 端子锚点同理：缺 anchor 的端子在 SVG 导出里撞 `anchor.x`。
            // 全仓没有任何地方靠「anchor 缺席」分支（grep 过），补默认值是安全的。
            // 缺锚点按节点原点算 —— 端子没声明位置时，这是诚实的取值。
            .map((terminal) => (isPlainObject(terminal.anchor)
              ? terminal
              : { ...terminal, anchor: { x: 0, y: 0 } }))
        };
      }),
    edges: (Array.isArray(project?.edges) ? project.edges : [])
      .filter((edge) => edge && typeof edge === "object")
  };
}

function uniqueRecordNameForFilePartStorage(baseName, existingNames, fallback) {
  const base = String(baseName || "").trim() || fallback;
  const usedNames = new Set(existingNames.map((name) => String(name || "").trim()).filter(Boolean));
  const usedFileParts = new Set(existingNames.map((name) => safeFilePart(name, fallback)).filter(Boolean));
  const available = (name) => !usedNames.has(name) && !usedFileParts.has(safeFilePart(name, fallback));
  if (available(base)) {
    return base;
  }
  let index = 2;
  let candidate = base;
  do {
    const suffix = ` (${index})`;
    const baseLimit = Math.max(1, maxFilePartLength - suffix.length);
    const visibleBase = base.slice(0, baseLimit).trim() || fallback.slice(0, baseLimit).trim() || fallback;
    candidate = `${visibleBase}${suffix}`;
    index += 1;
  } while (!available(candidate));
  return candidate;
}

function savedRecordTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function storageProjectDisplayName(name, fallback = "未命名模型") {
  // 与前端 src/model-routing.ts 的 savedProjectDisplayName 保持一致：名称即标识。
  // 若把 “(N)” 折叠掉，重命名/导入产生的 “模型A (2)” 会被认成已有的 “模型A”，
  // 复用同一个 idx 并覆盖原文件，前端模型列表看不到新模型。
  return String(name || "").trim().replace(/电力系统/g, "电力能源系统") || fallback;
}

function storageProjectNameKey(name) {
  return storageProjectDisplayName(name).toLocaleLowerCase();
}

function normalizeSchemeProjectRecordNamesForStorage(projects) {
  const normalized = [];
  const indexByNameKey = new Map();
  for (const record of projects) {
    const { id: _projectRuntimeId, ...recordWithoutRuntimeId } = record ?? {};
    const name = storageProjectDisplayName(record?.name);
    const nextRecord = {
      ...recordWithoutRuntimeId,
      name,
      project: {
        ...(record?.project ?? {}),
        name
      }
    };
    const key = storageProjectNameKey(name);
    const existingIndex = indexByNameKey.get(key);
    if (existingIndex === undefined) {
      indexByNameKey.set(key, normalized.length);
      normalized.push(nextRecord);
      continue;
    }
    const existing = normalized[existingIndex];
    if (savedRecordTimestamp(nextRecord.updatedAt) >= savedRecordTimestamp(existing.updatedAt)) {
      normalized[existingIndex] = nextRecord;
    }
  }
  return normalized;
}

function normalizeSchemeRecordNamesForStorage(schemes) {
  const usedNames = [];
  return schemes.map((scheme) => {
    const { id: _schemeRuntimeId, ...schemeWithoutRuntimeId } = scheme ?? {};
    const name = uniqueRecordNameForFilePartStorage(scheme?.name, usedNames, "未命名方案");
    usedNames.push(name);
    return {
      ...schemeWithoutRuntimeId,
      name,
      children: Array.isArray(scheme?.children) ? normalizeSchemeRecordNamesForStorage(scheme.children) : []
    };
  });
}

function normalizeSchemesForStorage(schemes) {
  return normalizeSchemeRecordNamesForStorage(schemes).map((scheme) => ({
    ...scheme,
    projects: Array.isArray(scheme.projects)
      ? normalizeSchemeProjectRecordNamesForStorage(
          scheme.projects.map((project) => ({
            ...project,
            project: normalizeProjectForStorage(project.project)
          }))
        )
      : [],
    children: Array.isArray(scheme.children) ? normalizeSchemesForStorage(scheme.children) : []
  }));
}

// inferESection 已拆离至 ./eSectionMetadata.mjs

function parseDeviceIndex(value) {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text)) {
    return 0;
  }
  return Number.parseInt(text, 10);
}

function deriveDeviceIndexCounters(nodes) {
  const counters = {};
  for (const node of nodes) {
    const section = inferESection(node?.kind, node?.params ?? {});
    if (!section) {
      continue;
    }
    const idx = parseDeviceIndex(node?.params?.idx);
    if (idx > (counters[section] ?? 0)) {
      counters[section] = idx;
    }
  }
  return counters;
}

function normalizeDeviceIndexCounters(counters, nodes = []) {
  const normalized = {};
  for (const [section, value] of Object.entries(counters ?? {})) {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
    if (safeValue > 0) {
      normalized[section] = safeValue;
    }
  }
  const derived = deriveDeviceIndexCounters(nodes);
  for (const [section, value] of Object.entries(derived)) {
    normalized[section] = Math.max(normalized[section] ?? 0, value);
  }
  return normalized;
}

function assignPermanentDeviceIndex(node, counters = {}) {
  const section = inferESection(node?.kind, node?.params ?? {});
  if (!section) {
    return { node, counters };
  }
  const existingIdx = parseDeviceIndex(node?.params?.idx);
  if (existingIdx > 0) {
    if (existingIdx <= (counters[section] ?? 0)) {
      return { node, counters };
    }
    return { node, counters: { ...counters, [section]: existingIdx } };
  }
  const idx = (counters[section] ?? 0) + 1;
  return {
    node: { ...node, params: { ...(node?.params ?? {}), idx: String(idx) } },
    counters: { ...counters, [section]: idx }
  };
}

function assignMissingDeviceIndexes(nodes, counters) {
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

// 同一份坏载荷只告警一次：storedEParameterDefinitions 是**逐节点**调用的，
// 一个模型带了坏定义就会在导出时刷出成百上千条同样的告警，把真正有用的日志淹掉。
// 以原始载荷为键去重，坏数据通常只有一两种，Set 的增长可以忽略。
const warnedCustomParamDefinitions = new Set();

function storedEParameterDefinitions(params = {}) {
  try {
    const parsed = JSON.parse(params._customParamDefinitions ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((definition) => definition && typeof definition === "object")
      .map((definition) => ({
        ...definition,
        enName: String(definition.enName ?? "").trim(),
        exportName: typeof definition.exportName === "string" ? definition.exportName.trim() : definition.exportName
      }))
      .filter((definition) => definition.enName && !definition.enName.startsWith("_") && definition.enName !== "component_type");
  } catch (error) {
    // 归 [] 是既有降级，但代价很具体：E 导出会**静默丢掉**这个元件的全部自定义参数定义，
    // 生成的 .e 文件参数变少，而界面与导出都不报错，事后只有拿到文件比对才发现。
    // 触发面也不只是「JSON 写坏了」—— _customParamDefinitions 存成对象/数组时
    // JSON.parse 同样抛，两种都归到这里。
    const raw = typeof params?._customParamDefinitions === "string" ? params._customParamDefinitions : "";
    if (!warnedCustomParamDefinitions.has(raw)) {
      warnedCustomParamDefinitions.add(raw);
      console.warn(
        `[E导出] 自定义参数定义解析失败（${error?.message ?? error}），已按「无自定义参数」导出，` +
        "该元件的参数会在 .e 文件里缺失"
      );
    }
    return [];
  }
}

export {
  assignMissingDeviceIndexes,
  invalidProjectEnumParameters,
  normalizeProjectForStorage,
  normalizeSchemesForStorage,
  storageProjectDisplayName,
  storageProjectNameKey,
  storedEParameterDefinitions,
  uniqueRecordNameForFilePartStorage
};
