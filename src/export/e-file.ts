import {
  E_SECTION_COLUMNS,
  electricGenerationDerivedComponentLibraryInfo,
  inferESection,
  resolveDeviceParameterDefinitionExportSettings,
  resolveEffectiveTemplateParameterDefinitionGroups,
  resolveEffectiveTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo
} from "../model.ts";
import {
  deviceDefinitionSharedKeyForTemplate,
  groupPeerKindsBySharedKey,
  normalizeSharedDeviceDefinitionOverrides
} from "./device-definition-shared.ts";

export const deviceDefinitionComplianceKey = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/_/g, "");

// 字段去重合并：按 complianceKey 去重，将 source 中 target 尚未包含的字段追加到 target
const appendUniqueFields = (target: any[], source: any[]) => {
  const seen = new Set(target.map((f) => deviceDefinitionComplianceKey(String(f.sourceName ?? f.exportName ?? "").trim())).filter(Boolean));
  for (const f of source) {
    const key = deviceDefinitionComplianceKey(String(f.sourceName ?? f.exportName ?? "").trim());
    if (key && !seen.has(key)) {
      target.push(f);
      seen.add(key);
    }
  }
};

// 反向解析类名：模板 section 的 componentLibrary 可能是导出标签（如 "estore"），映射为类名（如 "ACStorageGen"）
const resolveComponentLibrary = (section: any, reverseMap: Map<string, string>, rowsByComponentLibrary: Map<string, any>) => {
  const cl = String(section.componentLibrary ?? "").trim();
  if (rowsByComponentLibrary.has(cl)) return cl;
  const resolved = reverseMap.get(cl);
  if (resolved && rowsByComponentLibrary.has(resolved)) return resolved;
  const kind = String(section.kind ?? "").trim();
  if (kind && rowsByComponentLibrary.has(kind)) return kind;
  return cl;
};

const E_DEVICE_INTERFACE_CURRENT_FIELD_ALIASES: Record<string, string> = {
  max_current: "i_max",
  high_max_current: "i_i_max",
  high_i_max: "i_i_max",
  medium_max_current: "k_i_max",
  medium_i_max: "k_i_max",
  low_max_current: "j_i_max",
  low_i_max: "j_i_max"
};

function eDeviceInterfaceOrderFieldName(value: unknown) {
  const rawName = String(value ?? "").trim();
  const snakeName = rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return E_DEVICE_INTERFACE_CURRENT_FIELD_ALIASES[snakeName] ?? rawName;
}

function ensureEDeviceInterfaceParentBeforeDevType(fieldOrder: readonly string[]) {
  const normalizedOrder = fieldOrder
    .map((fieldName) => eDeviceInterfaceOrderFieldName(fieldName));
  const devTypeIndex = normalizedOrder.findIndex((fieldName) => String(fieldName).trim().toLowerCase() === "dev_type");
  if (devTypeIndex < 0) {
    return normalizedOrder;
  }
  const withoutParent = normalizedOrder.filter((fieldName) => String(fieldName).trim().toLowerCase() !== "parent");
  const normalizedDevTypeIndex = withoutParent.findIndex((fieldName) => String(fieldName).trim().toLowerCase() === "dev_type");
  withoutParent.splice(normalizedDevTypeIndex, 0, "parent");
  return withoutParent;
}

const E_DEVICE_INTERFACE_FIXED_FIELD_NAMES = new Set(["idx", "name", "parent", "dev_type"]);
const E_DEVICE_INTERFACE_DERIVED_BASE_ONLY_FIELD_NAMES = new Set(["parent", "dev_type"]);

function eDeviceInterfaceIsDerivedBaseOnlyField(value: unknown) {
  return E_DEVICE_INTERFACE_DERIVED_BASE_ONLY_FIELD_NAMES.has(
    String(eDeviceInterfaceOrderFieldName(value) ?? "").trim().toLowerCase()
  );
}

function eDeviceInterfaceDerivedFields(fields: readonly any[] = []) {
  return fields.filter((field) => (
    !eDeviceInterfaceIsDerivedBaseOnlyField(field?.sourceName) &&
    !eDeviceInterfaceIsDerivedBaseOnlyField(field?.exportName)
  ));
}

function eDeviceInterfaceDerivedFieldOrder(fieldOrder: readonly string[] = []) {
  return fieldOrder.filter((fieldName) => !eDeviceInterfaceIsDerivedBaseOnlyField(fieldName));
}
// 拓扑引用字段：生成 E 文件时由拓扑连接关系填入 ACNode 的 idx，不对应元件属性
const E_DEVICE_INTERFACE_TOPOLOGY_FIELD_NAMES = new Set(["ind", "znd", "nd"]);
// 量测字段：生成 E 文件时由量测系统填充，不对应元件属性
const E_DEVICE_INTERFACE_MEASUREMENT_FIELD_NAMES = new Set(["p", "q", "v", "i"]);
// 运行时派生字段：生成 E 文件时由运行时关系（所属厂站等）填充，不对应元件属性
const E_DEVICE_INTERFACE_RUNTIME_DERIVED_FIELD_NAMES: Record<string, string> = {
  ist: "（所属厂站）",
  zst: "（末端所属厂站）"
};
const E_DEVICE_INTERFACE_DERIVED_BASE_FIELD_NAMES = new Set([
  "idx",
  "name",
  "parent",
  "dev_type",
  "status",
  "run_stat",
  "node",
  "t1_node",
  "t2_node",
  "t3_node",
  "i_node",
  "j_node",
  "k_node",
  "control_type",
  "ac_control_type",
  "dc_control_type",
  "source_control_type",
  "p_set",
  "q_set",
  "v_set",
  "i_set",
  "alpha",
  "vbase",
  "rated_power",
  "rated_voltage",
  "rated_capacity",
  "source_type"
]);

function eDeviceInterfaceRelationKey(baseComponentLibrary: string) {
  const normalizedBase = String(baseComponentLibrary ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalizedBase ? `idx_${normalizedBase}` : "idx_base";
}

function eDeviceInterfaceIsDerivedBaseField(fieldName: unknown, baseComponentLibrary = "") {
  const enName = String(fieldName ?? "").trim();
  if (!enName || enName === "component_type" || enName.startsWith("_")) {
    return true;
  }
  if (E_DEVICE_INTERFACE_DERIVED_BASE_FIELD_NAMES.has(enName)) {
    return true;
  }
  return Boolean(baseComponentLibrary && E_SECTION_COLUMNS[baseComponentLibrary]?.includes(enName));
}

function eDeviceInterfaceComponentLibraryForTemplate(template: any, resolveDefinitionComponentLibrary?: (template: any) => string) {
  const resolved = typeof resolveDefinitionComponentLibrary === "function"
    ? resolveDefinitionComponentLibrary(template)
    : "";
  return String(resolved || templateDerivedComponentLibraryInfo(template)?.componentLibrary || inferESection(template.kind, template.params ?? {}) || "").trim();
}

function eDeviceInterfaceFieldCnName(definition: any, labels?: Record<string, string>) {
  const cnName = String(definition?.cnName ?? definition?.enName ?? "").trim();
  const enName = String(definition?.enName ?? "").trim();
  return cnName === enName ? labels?.[enName] ?? cnName : cnName;
}

export function applyEDeviceInterfaceFieldOrder(fields: readonly any[] = [], configuredOrder: readonly string[] = []) {
  if ((configuredOrder ?? []).length === 0) {
    return fields;
  }
  const fieldByName = new Map(
    (fields ?? []).map((field) => [deviceDefinitionComplianceKey(eDeviceInterfaceOrderFieldName(field?.sourceName)), field] as const)
  );
  const ordered: any[] = [];
  const used = new Set<string>();
  // 严格按模板字段顺序：设备有匹配用设备 field，无匹配用占位 field（sourceName=exportName），不追加设备独有字段
  for (const sourceName of configuredOrder) {
    const canonicalSourceName = eDeviceInterfaceOrderFieldName(sourceName);
    const key = deviceDefinitionComplianceKey(canonicalSourceName);
    if (!key || used.has(key)) {
      continue;
    }
    used.add(key);
    const field = fieldByName.get(key);
    ordered.push(field ?? { sourceName: canonicalSourceName, cnName: canonicalSourceName, exportEnabled: true, exportName: canonicalSourceName });
  }
  return ordered;
}

const E_DEVICE_INTERFACE_DISPLAY_FIXED_FIELDS = new Set(["idx", "name", "parent", "dev_type"]);

function eDeviceInterfaceDisplayCoreFieldName(value: unknown) {
  const fieldName = String(value ?? "").trim().toLowerCase();
  return (
    E_DEVICE_INTERFACE_DISPLAY_FIXED_FIELDS.has(fieldName) ||
    /^node\d*$/u.test(fieldName) ||
    /_node$/u.test(fieldName) ||
    fieldName === "status" ||
    fieldName === "run_stat" ||
    fieldName === "vbase" ||
    fieldName === "alpha" ||
    fieldName === "source_type" ||
    fieldName === "p_max" ||
    fieldName === "p_min" ||
    fieldName === "q_max" ||
    fieldName === "q_min" ||
    fieldName.endsWith("control_type") ||
    fieldName.endsWith("_set")
  ) ? fieldName : "";
}

export function orderEDeviceInterfaceFields(
  componentLibrary: string,
  fields: readonly any[] = [],
  configuredOrder: readonly string[] = [],
  isDerivedComponentLibrary = false
) {
  const availableFields = isDerivedComponentLibrary ? eDeviceInterfaceDerivedFields(fields) : fields;
  const availableConfiguredOrder = isDerivedComponentLibrary
    ? eDeviceInterfaceDerivedFieldOrder(configuredOrder)
    : configuredOrder;
  if ((availableConfiguredOrder ?? []).length > 0) {
    return applyEDeviceInterfaceFieldOrder(
      availableFields,
      ensureEDeviceInterfaceParentBeforeDevType(availableConfiguredOrder)
    );
  }
  const preferredOrder = [...(E_SECTION_COLUMNS[componentLibrary] ?? ["idx", "name"])]
    .map((fieldName) => fieldName.toLowerCase());
  if (!preferredOrder.includes("dev_type")) {
    const nameIndex = preferredOrder.indexOf("name");
    const idxIndex = preferredOrder.indexOf("idx");
    preferredOrder.splice(nameIndex >= 0 ? nameIndex + 1 : idxIndex >= 0 ? idxIndex + 1 : 0, 0, "dev_type");
  }
  const normalizedPreferredOrder = ensureEDeviceInterfaceParentBeforeDevType(preferredOrder);
  const preferredIndex = new Map(
    normalizedPreferredOrder
      .filter((fieldName) => eDeviceInterfaceDisplayCoreFieldName(fieldName))
      .map((fieldName, index) => [fieldName, index])
  );

  return availableFields
    .map((field, index) => {
      const candidateNames = [field?.sourceName, field?.exportName]
        .map((fieldName) => eDeviceInterfaceDisplayCoreFieldName(fieldName))
        .filter(Boolean);
      const coreName = candidateNames.find((fieldName) => preferredIndex.has(fieldName)) ?? candidateNames[0] ?? "";
      return {
        field,
        index,
        core: Boolean(coreName),
        preferredIndex: preferredIndex.get(coreName) ?? Number.MAX_SAFE_INTEGER
      };
    })
    .sort((first, second) => {
      if (first.core !== second.core) {
        return first.core ? -1 : 1;
      }
      if (first.core && first.preferredIndex !== second.preferredIndex) {
        return first.preferredIndex - second.preferredIndex;
      }
      return first.index - second.index;
    })
    .map(({ field }) => field);
}

export function buildEDeviceInterfaceDefinitionRows(options: {
  libraryTemplates?: readonly any[];
  labels?: Record<string, string>;
  eDeviceDefinitionLabels?: Record<string, string>;
  eDeviceDefinitionClassExportEnabled?: Record<string, boolean>;
  eDeviceDefinitionFieldOrder?: Record<string, readonly string[]>;
  eDeviceDefinitionTemplateFields?: Record<string, Array<{ sourceName?: string; exportName: string; cnName: string }>>;
  resolveDefinitionComponentLibrary?: (template: any) => string;
}) {
  const {
    libraryTemplates = [],
    labels,
    eDeviceDefinitionLabels = {},
    eDeviceDefinitionClassExportEnabled = {},
    eDeviceDefinitionFieldOrder = {},
    eDeviceDefinitionTemplateFields = {},
    resolveDefinitionComponentLibrary
  } = options;
  const groups = new Map<string, any>();
  const ensureGroup = (componentLibrary: string, template: any, extra: Record<string, any> = {}) => {
    const key = String(componentLibrary ?? "").trim();
    if (!key || key.startsWith("Static")) {
      return null;
    }
    let group = groups.get(key);
    if (!group) {
      group = {
        componentLibrary: key,
        categoryLibrary: extra.categoryLibrary ?? template?.categoryLibrary ?? "",
        label: extra.label ?? template?.label ?? key,
        exportEnabled: eDeviceDefinitionClassExportEnabled[key] !== false,
        exportName: eDeviceDefinitionLabels[key] ?? key,
        derivedFromComponentLibrary: extra.derivedFromComponentLibrary,
        isDerivedComponentLibrary: Boolean(extra.isDerivedComponentLibrary),
        fields: [],
        fieldBySourceName: new Map<string, any>()
      };
      groups.set(key, group);
      return group;
    }
    if (!group.categoryLibrary && (extra.categoryLibrary || template?.categoryLibrary)) {
      group.categoryLibrary = extra.categoryLibrary ?? template?.categoryLibrary ?? "";
    }
    if (!group.label && (extra.label || template?.label)) {
      group.label = extra.label ?? template?.label ?? key;
    }
    return group;
  };
  const appendField = (group: any, field: any) => {
    const sourceName = String(field.sourceName ?? field.enName ?? "").trim();
    if (!sourceName || sourceName === "component_type" || sourceName.startsWith("_")) {
      return;
    }
    const fieldKey = deviceDefinitionComplianceKey(sourceName);
    const existing = group.fieldBySourceName.get(fieldKey);
    const fixedField = E_DEVICE_INTERFACE_FIXED_FIELD_NAMES.has(sourceName);
    const exportName = String(field.exportName ?? sourceName).trim();
    if (existing) {
      existing.exportEnabled = fixedField || Boolean(existing.exportEnabled || field.exportEnabled);
      if (!existing.definition && field.definition) {
        existing.definition = field.definition;
      }
      if (fixedField) {
        existing.exportName = sourceName;
        existing.readonly = true;
      } else if (!existing.exportName && exportName) {
        existing.exportName = exportName;
      }
      return;
    }
    const row = {
      sourceName,
      cnName: String(field.cnName ?? sourceName).trim(),
      exportEnabled: fixedField || Boolean(field.exportEnabled),
      exportName: fixedField ? sourceName : exportName,
      readonly: Boolean(field.readonly || fixedField),
      definition: field.definition
    };
    group.fieldBySourceName.set(fieldKey, row);
    group.fields.push(row);
  };

  for (const template of libraryTemplates ?? []) {
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    const derivedFieldBoundaryInfo = derivedInfo ?? electricGenerationDerivedComponentLibraryInfo(template.kind);
    const componentLibrary = derivedInfo?.componentLibrary ?? eDeviceInterfaceComponentLibraryForTemplate(template, resolveDefinitionComponentLibrary);
    const baseGroup = ensureGroup(componentLibrary, template, {
      categoryLibrary: derivedInfo?.categoryLibrary ?? template?.categoryLibrary ?? ""
    });
    if (!baseGroup) {
      continue;
    }
    const baseParams = derivedInfo
      ? { ...(template.params ?? {}), component_type: derivedInfo.baseComponentLibrary }
      : template.params ?? {};
    const definitionGroups = resolveEffectiveTemplateParameterDefinitionGroups(template, libraryTemplates);
    const baseDefinitions = derivedInfo ? definitionGroups.baseDefinitions : definitionGroups.derivedDefinitions;
    for (const definition of baseDefinitions) {
      const enName = String(definition.enName ?? "").trim();
      const settings = resolveDeviceParameterDefinitionExportSettings(template.kind, baseParams, definition);
      const exportName = String(settings.exportName || enName).trim();
      if (
        derivedFieldBoundaryInfo &&
        !eDeviceInterfaceIsDerivedBaseField(enName, derivedFieldBoundaryInfo.baseComponentLibrary) &&
        !eDeviceInterfaceIsDerivedBaseField(exportName, derivedFieldBoundaryInfo.baseComponentLibrary)
      ) {
        continue;
      }
      appendField(baseGroup, {
        sourceName: enName,
        cnName: eDeviceInterfaceFieldCnName(definition, labels),
        exportEnabled: settings.exportEnabled,
        exportName,
        definition
      });
    }
    if (!derivedInfo) {
      continue;
    }
    const derivedGroup = ensureGroup(derivedInfo.derivedComponentLibrary, template, {
      categoryLibrary: derivedInfo.categoryLibrary || template?.categoryLibrary || "",
      label: derivedInfo.label || derivedInfo.derivedComponentLibrary,
      derivedFromComponentLibrary: derivedInfo.baseComponentLibrary,
      isDerivedComponentLibrary: true
    });
    if (!derivedGroup) {
      continue;
    }
    appendField(derivedGroup, {
      sourceName: "idx",
      cnName: "序号",
      exportEnabled: true,
      exportName: "idx",
      readonly: true
    });
    appendField(derivedGroup, {
      sourceName: eDeviceInterfaceRelationKey(derivedInfo.baseComponentLibrary),
      cnName: "原类关联idx",
      exportEnabled: true,
      exportName: eDeviceInterfaceRelationKey(derivedInfo.baseComponentLibrary),
      readonly: true
    });
    const derivedParams = { ...(template.params ?? {}), component_type: derivedInfo.derivedComponentLibrary };
    for (const definition of definitionGroups.derivedDefinitions) {
      const enName = String(definition.enName ?? "").trim();
      const settings = resolveDeviceParameterDefinitionExportSettings(template.kind, derivedParams, definition);
      const exportName = String(settings.exportName || enName).trim();
      if (
        eDeviceInterfaceIsDerivedBaseField(enName, derivedInfo.baseComponentLibrary) ||
        eDeviceInterfaceIsDerivedBaseField(exportName, derivedInfo.baseComponentLibrary)
      ) {
        continue;
      }
      appendField(derivedGroup, {
        sourceName: enName,
        cnName: eDeviceInterfaceFieldCnName(definition, labels),
        exportEnabled: settings.exportEnabled,
        exportName,
        definition
      });
    }
  }

  // ac-transformer 同时导出 ACTransWinding（绕组表），字段镜像 ACTransformer
  const acTransformerGroup = groups.get("ACTransformer");
  if (acTransformerGroup && !groups.has("ACTransWinding")) {
    // 绕组表的列以模板 <trans> 段声明的列为准（eDeviceDefinitionTemplateFields["ACTransWinding"]）。
    // 基类 <trfm> 段没有 tap 这类绕组专属列，泛化的兜底补丁会把它们标成不导出（exportEnabled:false）；
    // 镜像时若不按绕组段重算，绕组段明确声明的列会连带丢失。段内无声明（未加载模板）时维持继承值。
    const windingColumnKeys = new Set(
      (eDeviceDefinitionTemplateFields["ACTransWinding"] ?? [])
        .map((field: any) => deviceDefinitionComplianceKey(field.sourceName || field.exportName))
        .filter(Boolean)
    );
    groups.set("ACTransWinding", {
      ...acTransformerGroup,
      componentLibrary: "ACTransWinding",
      label: "变压器绕组",
      exportName: eDeviceDefinitionLabels["ACTransWinding"] ?? "ACTransWinding",
      exportEnabled: eDeviceDefinitionClassExportEnabled["ACTransWinding"] !== false,
      fields: acTransformerGroup.fields.map((field: any) =>
        windingColumnKeys.size > 0 && !field.readonly
          ? { ...field, exportEnabled: windingColumnKeys.has(deviceDefinitionComplianceKey(field.sourceName)) }
          : { ...field }
      ),
      fieldBySourceName: new Map(acTransformerGroup.fieldBySourceName)
    });
  }
  return Array.from(groups.values()).map((group) => {
    const { fieldBySourceName, ...row } = group;
    const configuredOrder = eDeviceDefinitionFieldOrder[row.componentLibrary] ?? [];
    const orderedFields = configuredOrder.length > 0
      ? orderEDeviceInterfaceFields(row.componentLibrary, row.fields, configuredOrder, row.isDerivedComponentLibrary)
      : row.fields;
    // 有模板字段定义时，用模板字段的 exportName 覆盖设备参数名
    const templateFields = eDeviceDefinitionTemplateFields[row.componentLibrary];
    if (templateFields && templateFields.length > 0) {
      const templateFieldsBySourceName = new Map<string, { sourceName?: string; exportName: string; cnName: string }>();
      for (const tf of templateFields) {
        const key = deviceDefinitionComplianceKey(tf.sourceName || tf.exportName);
        if (key) {
          templateFieldsBySourceName.set(key, tf);
        }
      }
      const remappedFields = orderedFields.map((field: any) => {
        const sourceKey = deviceDefinitionComplianceKey(field.sourceName);
        const templateField = sourceKey ? templateFieldsBySourceName.get(sourceKey) : undefined;
        if (templateField) {
          return { ...field, exportName: templateField.exportName, cnName: templateField.cnName || field.cnName };
        }
        return field;
      });
      return { ...row, fields: remappedFields };
    }
    return {
      ...row,
      fields: orderedFields
    };
  });
}

export function buildEFileExportOptionsFromLibrary(options: {
  libraryTemplates?: readonly any[];
  labels?: Record<string, string>;
  eDeviceDefinitionLabels?: Record<string, string>;
  eDeviceDefinitionClassExportEnabled?: Record<string, boolean>;
  eDeviceDefinitionFieldOrder?: Record<string, readonly string[]>;
  eDeviceDefinitionTemplateFields?: Record<string, Array<{ sourceName?: string; exportName: string; cnName: string }>>;
  eDeviceDefinitionTableIds?: Record<string, string>;
  resolveDefinitionComponentLibrary?: (template: any) => string;
}) {
  const interfaceDefinitions = buildEDeviceInterfaceDefinitionRows(options);
  // 独立运行时表（aclineend/dclineend）：模板解析时已按 sectionKind 存储字段/表号，
  // 但 buildEDeviceInterfaceDefinitionRows 仅遍历 libraryTemplates，不会包含这些
  // 无对应设备模板的段。此处按 sectionKind 注入，使导出时
  // interfaceDefinitionBySection.get(sectionKind) 可命中，保证表号/字段/过滤均生效。
  for (const sectionKind of RUNTIME_GENERATED_STANDALONE_SECTIONS) {
    const templateFields = options.eDeviceDefinitionTemplateFields?.[sectionKind];
    if (!templateFields || templateFields.length === 0) {
      continue;
    }
    const existing = interfaceDefinitions.find((definition) => definition.componentLibrary === sectionKind);
    if (existing) {
      continue;
    }
    interfaceDefinitions.push({
      componentLibrary: sectionKind,
      categoryLibrary: "",
      label: sectionKind,
      exportEnabled: true,
      tableId: options.eDeviceDefinitionTableIds?.[sectionKind],
      fields: templateFields.map((field) => ({
        sourceName: field.sourceName || field.exportName,
        exportName: field.exportName,
        cnName: field.cnName || field.exportName
      }))
    });
  }
  return {
    interfaceDefinitions: interfaceDefinitions.map((definition) => ({
      ...definition,
      fields: orderEDeviceInterfaceFields(
        definition.componentLibrary,
        definition.fields,
        options.eDeviceDefinitionFieldOrder?.[definition.componentLibrary] ?? [],
        definition.isDerivedComponentLibrary
      )
    })),
    eDeviceDefinitionLabels: options.eDeviceDefinitionLabels ?? {},
    eDeviceDefinitionTemplateFields: options.eDeviceDefinitionTemplateFields ?? {},
    eDeviceDefinitionTableIds: options.eDeviceDefinitionTableIds ?? {}
  };
}

// 预定义模板（国网/实时库 .e）应用的唯一入口：前端「加载模板」与后端 `?template=` 共用同一套语义。
// 语义 = 先撤销库中已有的 E 文件接口自定义（标签/导出开关/字段顺序/模板字段四张表一律从空基线开始），
// 再按模板 sections 重建；不得在「上次模板写回的 exportName」之上叠加，否则字段名会串列
// （见 eDeviceInterfacePatchesForRow / 下面两轮建键的注释）。
// 两侧的差异只在数据来源：前端传「撤销基线后的库快照」，后端传磁盘库并显式传空 override 基线。
export function applyPredefinedEDeviceTemplateToLibraryState(options: {
  sections: readonly any[];
  customDeviceTemplates?: readonly any[];
  libraryTemplates?: readonly any[];
  deviceDefinitionOverrides?: Record<string, any>;
  labels?: Record<string, string>;
  deviceDefinitionOverrideForTemplate?: (template: any, overrides: Record<string, any>, templates?: readonly any[], peerKindsBySharedKey?: Map<string, readonly string[]>) => any;
  resolveDefinitionComponentLibrary?: (template: any) => string;
}) {
  return applyEDeviceDefinitionSectionsToLibraryState({
    sections: options.sections,
    customDeviceTemplates: options.customDeviceTemplates ?? [],
    libraryTemplates: options.libraryTemplates ?? [],
    deviceDefinitionOverrides: options.deviceDefinitionOverrides ?? {},
    eDeviceDefinitionLabels: {},
    eDeviceDefinitionClassExportEnabled: {},
    eDeviceDefinitionFieldOrder: {},
    eDeviceDefinitionTemplateFields: {},
    labels: options.labels,
    deviceDefinitionOverrideForTemplate: options.deviceDefinitionOverrideForTemplate,
    resolveDefinitionComponentLibrary: options.resolveDefinitionComponentLibrary
  });
}

function eDeviceInterfaceSectionByComponentLibrary(sections: readonly any[] = []) {
  const sectionByComponentLibrary = new Map<string, any>();
  for (const section of sections ?? []) {
    const componentLibrary = String(section.componentLibrary || section.originalComponentLibrary || section.kind || "").trim();
    if (componentLibrary) {
      sectionByComponentLibrary.set(componentLibrary, section);
    }
  }
  return sectionByComponentLibrary;
}

// matched = 该属性确实出现在本段模板的列里（区别于「本段没有这一列」的兜底关闭补丁，
// 派生类取补丁时要靠它区分「基类段没声明」与「基类段显式不导出」）
type EDeviceInterfaceFieldPatch = { exportEnabled: boolean; exportName: string; matched: boolean };

function eDeviceInterfacePatchesForRow(row: any, section: any | undefined) {
  const patches = new Map<string, EDeviceInterfaceFieldPatch>();
  const availableFields = section
    ? (section.fields ?? []).filter((field: any) => !E_DEVICE_INTERFACE_FIXED_FIELD_NAMES.has(String(field.sourceName ?? field.exportName ?? "").trim()))
    : [];
  const usedFieldIndexes = new Set<number>();
  // 两轮匹配：先按字段名（exportName/sourceName），再退回中文名。
  // 单轮「名称+中文名混着比」会让中文名相同的无关属性先到先得——实测变压器行的 status
  // （中文名同为「运行状态」）抢走模板 runstat 列，真正的 run_stat 被标 exportEnabled:false
  // 而从导出中消失。
  const findSectionFieldIndex = (field: any, allowCnName: boolean) => {
    const fieldKeys = [
      field.exportName,
      field.sourceName,
      ...(allowCnName ? [field.cnName] : [])
    ].map(deviceDefinitionComplianceKey).filter(Boolean);
    for (let index = 0; index < availableFields.length; index += 1) {
      if (usedFieldIndexes.has(index)) {
        continue;
      }
      const sectionField = availableFields[index];
      const sectionKeys = [
        sectionField.sourceName,
        sectionField.exportName,
        ...(allowCnName ? [sectionField.cnName] : [])
      ].map(deviceDefinitionComplianceKey).filter(Boolean);
      if (fieldKeys.some((key) => sectionKeys.includes(key))) {
        return index;
      }
    }
    // 不做「位置兜底」：未按名称命中的模板字段不得派给无关设备属性。
    // 否则模板列名会写到别的参数上（实测 ACLoad 的 rdf_id 被写成 runstat），并随模板应用持久化进库。
    return -1;
  };
  const rowFields = row.fields ?? [];
  const unclaimedFields: any[] = [];
  const claimSectionField = (field: any, allowCnName: boolean) => {
    const sourceName = String(field.sourceName ?? "").trim();
    if (!sourceName) {
      return false;
    }
    const sectionFieldIndex = section ? findSectionFieldIndex(field, allowCnName) : -1;
    if (sectionFieldIndex < 0) {
      return false;
    }
    usedFieldIndexes.add(sectionFieldIndex);
    const sectionField = availableFields[sectionFieldIndex];
    patches.set(deviceDefinitionComplianceKey(sourceName), {
      exportEnabled: sectionField.exportEnabled !== false,
      exportName: String(sectionField.exportName || field.exportName || sourceName).trim(),
      matched: true
    });
    return true;
  };
  for (const field of rowFields) {
    // readonly（固定列）与新增占位字段不参与列匹配：占位字段的 sourceName 由模板列名生成，
    // 让它参与会把同名的真实设备属性挤成「未命中」而关闭导出。
    if (field.readonly || field.newlyAdded) {
      continue;
    }
    if (!claimSectionField(field, false)) {
      unclaimedFields.push(field);
    }
  }
  for (const field of unclaimedFields) {
    if (claimSectionField(field, true)) {
      continue;
    }
    const sourceName = String(field.sourceName ?? "").trim();
    if (!sourceName) {
      continue;
    }
    patches.set(deviceDefinitionComplianceKey(sourceName), {
      exportEnabled: false,
      exportName: String(field.exportName || sourceName).trim(),
      matched: false
    });
  }
  return patches;
}

// 模板导出名 → 元件属性名：模板 id 字段对应元件 idx 属性（导出名为 id，元件属性仍为 idx）
function templateFieldToDeviceSourceName(sectionField: any): string {
  const templateExportName = String(sectionField.exportName ?? sectionField.sourceName ?? "").trim();
  return templateExportName === "id" ? "idx" : templateExportName;
}

function eDeviceInterfaceFieldOrderForRow(row: any, section: any | undefined) {
  if (!section) {
    return [];
  }
  const rowFields = row.fields ?? [];
  const used = new Set<string>();
  const ordered: string[] = [];
  const findMatchingField = (sectionField: any) => {
    const exportKey = deviceDefinitionComplianceKey(templateFieldToDeviceSourceName(sectionField));
    // 优先按 exportName/sourceName 精确匹配（如 runstat<->run_stat），避免误匹配同中文不同字段
    const exact = rowFields.find((field: any) => {
      const sourceName = String(field.sourceName ?? "").trim();
      const sourceKey = deviceDefinitionComplianceKey(sourceName);
      if (!sourceKey || used.has(sourceKey)) {
        return false;
      }
      return sourceKey === exportKey || deviceDefinitionComplianceKey(field.exportName) === exportKey;
    });
    if (exact) {
      return exact;
    }
    // 再按 cnName 模糊匹配
    const sectionKeys = [sectionField.sourceName, sectionField.exportName, sectionField.cnName]
      .map(deviceDefinitionComplianceKey)
      .filter(Boolean);
    return rowFields.find((field: any) => {
      const sourceName = String(field.sourceName ?? "").trim();
      const sourceKey = deviceDefinitionComplianceKey(sourceName);
      if (!sourceKey || used.has(sourceKey)) {
        return false;
      }
      const fieldKeys = [field.sourceName, field.exportName, field.cnName]
        .map(deviceDefinitionComplianceKey)
        .filter(Boolean);
      return sectionKeys.some((key) => fieldKeys.includes(key));
    });
  };
  // 严格按模板字段顺序：设备有匹配用设备 sourceName，无匹配用模板 exportName 占位（值由导出时默认/引用解析填充）
  for (const sectionField of section.fields ?? []) {
    const field = findMatchingField(sectionField);
    const sourceName = String(field?.sourceName ?? "").trim() || templateFieldToDeviceSourceName(sectionField);
    const sourceKey = deviceDefinitionComplianceKey(sourceName);
    if (!sourceKey || used.has(sourceKey)) {
      continue;
    }
    used.add(sourceKey);
    ordered.push(sourceName);
  }
  return ordered;
}

// 运行时生成内容的表，不参与元件匹配
// aclineend/dclineend/transformerwinding 也是运行时生成（从线段/变压器派生），需加入此集合
const RUNTIME_GENERATED_SECTIONS = new Set([
  "basevalue", "basevoltage", "subcontrolarea", "substation", "trans",
  "aclineend", "dclineend", "transformerwinding",
  // 配网实时库：线段端点表（dms_def_lnseg_dot）由线段派生，等同主网 aclineend；
  // 单行表（dms_def_area/bulk/feeder/source）由头表逻辑构建，不参与元件匹配但需存储模板字段；
  // 连接节点表（dms_def_node，类=ACNode）由拓扑节点生成，模板字段存 ACNode 名下
  "dms_def_lnseg_dot", "dms_def_area", "dms_def_bulk", "dms_def_feeder", "dms_def_source", "dms_def_node"
]);
// 独立导出表：运行时生成的表中，导出代码按 kind 名查找接口定义（如 aclineend/dclineend），
// 模板字段需存储在 sectionKind 名下。
// 非 standalone 的运行时表（如 trans/transformerwinding）是类的导出别名，
// 模板字段存储在 componentLibrary 名下（如 ACTransWinding）。
const RUNTIME_GENERATED_STANDALONE_SECTIONS = new Set(["aclineend", "dclineend", "dms_def_lnseg_dot"]);

export function applyEDeviceDefinitionSectionsToLibraryState(options: {
  sections: readonly any[];
  customDeviceTemplates?: readonly any[];
  libraryTemplates?: readonly any[];
  deviceDefinitionOverrides?: Record<string, any>;
  eDeviceDefinitionLabels?: Record<string, string>;
  eDeviceDefinitionClassExportEnabled?: Record<string, boolean>;
  eDeviceDefinitionFieldOrder?: Record<string, string[]>;
  eDeviceDefinitionTemplateFields?: Record<string, Array<{ sourceName?: string; exportName: string; cnName: string }>>;
  labels?: Record<string, string>;
  deviceDefinitionOverrideForTemplate?: (template: any, overrides: Record<string, any>, templates?: readonly any[], peerKindsBySharedKey?: Map<string, readonly string[]>) => any;
  resolveDefinitionComponentLibrary?: (template: any) => string;
}) {
  const {
    sections,
    customDeviceTemplates = [],
    libraryTemplates = [],
    deviceDefinitionOverrides = {},
    eDeviceDefinitionLabels = {},
    eDeviceDefinitionClassExportEnabled = {},
    eDeviceDefinitionFieldOrder = {},
    eDeviceDefinitionTemplateFields = {},
    labels,
    deviceDefinitionOverrideForTemplate,
    resolveDefinitionComponentLibrary
  } = options;
  const rows = buildEDeviceInterfaceDefinitionRows({
    libraryTemplates,
    labels,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields,
    resolveDefinitionComponentLibrary
  });
  let sectionByComponentLibrary = eDeviceInterfaceSectionByComponentLibrary(sections);
  const nextLabels: Record<string, string> = { ...eDeviceDefinitionLabels };
  const nextClassExportEnabled: Record<string, boolean> = { ...eDeviceDefinitionClassExportEnabled };
  const nextFieldOrder: Record<string, string[]> = { ...eDeviceDefinitionFieldOrder };
  const nextTemplateFields: Record<string, Array<{ sourceName?: string; exportName: string; cnName: string }>> = {};
  const fieldPatchesByComponentLibrary = new Map<string, Map<string, { exportEnabled: boolean; exportName: string }>>();

  // 从模板角度出发，检查每个模板 section 是否匹配类
  const matched: Array<{ section: string; device: string; fields: Array<{ template: string; device: string }> }> = [];
  const skipped: Array<{ section: string; reason: string; fields?: string[] }> = [];
  const runtimeGenerated: Array<{ section: string; fields?: string[] }> = [];
  // standalone 运行时表的表号映射（sectionKind -> tableId），合并到最终 eDeviceDefinitionTableIds
  const runtimeGeneratedTableIds: Record<string, string> = {};

  // 预构建行索引，避免 O(n*m) 查找
  const rowsByComponentLibrary = new Map<string, any>(
    (rows ?? []).map((r) => [r.componentLibrary, r])
  );

  // 合并同名模板表：多个 section 拥有相同 componentLibrary 时，合并其字段（保留首个 section 的元信息）。
  // 运行时生成表（basevalue/aclineend/dms_def_lnseg_dot 等）按 kind 独立保留——它们可能共享同一
  // componentLibrary（如 dms_def_node 与 dms_def_lnseg_dot 都是 ACNode）但各自独立导出，不能合并。
  const mergedSections: any[] = [];
  const mergedByComponentLibrary = new Map<string, any>();
  for (const section of sections) {
    const sectionKind = String(section.kind || "").trim();
    const isRuntime = RUNTIME_GENERATED_SECTIONS.has(sectionKind);
    const key = isRuntime ? sectionKind : String(section.componentLibrary || section.kind || "").trim();
    const existing = mergedByComponentLibrary.get(key);
    if (!existing) {
      const merged = {
        ...section,
        fields: [...(section.fields ?? [])]
      };
      mergedByComponentLibrary.set(key, merged);
      mergedSections.push(merged);
    } else {
      appendUniqueFields(existing.fields, section.fields ?? []);
    }
  }

  // 构建反向映射：导出标签 → 类名（如 "estore" → "ACStorageGen"）
  const reverseLabelToComponentLibrary = new Map<string, string>();
  for (const [componentLibraryKey, label] of Object.entries(eDeviceDefinitionLabels)) {
    if (label && label !== componentLibraryKey) {
      reverseLabelToComponentLibrary.set(label, componentLibraryKey);
    }
  }

  // 元件字段补充：eDeviceDefinitionTemplateFields / eDeviceDefinitionFieldOrder / 模板 sections 中已声明但 row.fields 尚未列出的字段
  // 补齐后匹配逻辑可识别（解决首次导入时 UI 已显示字段仍判未匹配）
  // 记录本次根据模板新增的设备字段（用于 UI 标记「（新增）」）
  const newlyAddedDeviceFields = new Set<string>();
  // 从模板 sections 构建「类名 -> 模板字段」映射（含反向映射解析）
  const sectionFieldsByComponentLibrary = new Map<string, any[]>();
  for (const section of mergedSections) {
    const resolved = resolveComponentLibrary(section, reverseLabelToComponentLibrary, rowsByComponentLibrary);
    const existing = sectionFieldsByComponentLibrary.get(resolved) ?? [];
    appendUniqueFields(existing, section.fields ?? []);
    sectionFieldsByComponentLibrary.set(resolved, existing);
  }
  for (const row of rows ?? []) {
    const key = row.componentLibrary;
    const remembered = eDeviceDefinitionTemplateFields?.[key]
      ?? (eDeviceDefinitionFieldOrder?.[key]
        ? eDeviceDefinitionFieldOrder[key].map((exportName: string) => ({
            sourceName: exportName,
            exportName,
            cnName: exportName
          }))
        : undefined);
    const fromTemplate = sectionFieldsByComponentLibrary.get(key);
    const supplementFields = [...(remembered ?? []), ...(fromTemplate ?? [])];
    if (supplementFields.length === 0) continue;
    const existingKeys = new Set(
      (row.fields ?? []).map((f: any) =>
        deviceDefinitionComplianceKey(String(f.sourceName ?? f.exportName ?? "").trim())
      ).filter(Boolean)
    );
    for (const f of supplementFields) {
      const sourceName = String(f.sourceName ?? f.exportName ?? "").trim();
      const exportName = String(f.exportName ?? sourceName).trim();
      if (!exportName) continue;
      const keyName = deviceDefinitionComplianceKey(sourceName || exportName);
      if (keyName && existingKeys.has(keyName)) continue;
      if (!row.fields) row.fields = [];
      row.fields.push({
        sourceName: sourceName || undefined,
        cnName: String(f.cnName ?? exportName).trim() || exportName,
        exportEnabled: true,
        exportName,
        // 占位字段（设备本身没有该属性）：其 sourceName 就是从模板列名抄来的，
        // 参与列匹配等于「列匹配到自己」，会把真正能按中文名对上该列的设备属性挤成兜底关闭
        // （实测负荷的 p 被占位字段 p_custom 抢走列，p 反而被标不导出）。
        newlyAdded: true
      });
      if (keyName) newlyAddedDeviceFields.add(keyName);
      if (keyName) existingKeys.add(keyName);
    }
  }

  sectionByComponentLibrary = eDeviceInterfaceSectionByComponentLibrary(mergedSections);

  for (const section of mergedSections) {
    const componentLibrary = resolveComponentLibrary(section, reverseLabelToComponentLibrary, rowsByComponentLibrary);
    const sectionKind = section.kind;

    // 运行时生成的表，不参与元件匹配（即使 componentLibrary 对应已有类行也跳过）
    // 包括：basevalue/basevoltage/subcontrolarea/substation（基础表）、trans/transformerwinding（绕组表别名）、
    // aclineend/dclineend（线段端点表，导出时从 ACBranch/DCBranch 派生）
    if (RUNTIME_GENERATED_SECTIONS.has(sectionKind)) {
      const isStandalone = RUNTIME_GENERATED_STANDALONE_SECTIONS.has(sectionKind);
      const storageKey = isStandalone ? sectionKind : componentLibrary;

      // 非 standalone 的运行时表（如 trans→ACTransWinding, transformerwinding→ACTransWinding）
      // 设置导出标签映射，使导出时类行输出为对应的表名
      if (!isStandalone && componentLibrary && sectionKind && sectionKind !== componentLibrary) {
        nextLabels[componentLibrary] = sectionKind;
      }
      // 存储模板字段定义，供导出时使用
      // standalone 表存储在 sectionKind 名下（导出代码按 kind 查找），非 standalone 存储在 componentLibrary 名下
      if (section.fields && section.fields.length > 0 && storageKey) {
        const templateFields = section.fields.map((f: any) => {
          const exportName = String(f.exportName ?? "").trim();
          // 模板 id 字段对应元件 idx 属性（sourceName=idx, exportName=id），与匹配逻辑一致
          const sourceName = templateFieldToDeviceSourceName(f) === "idx" ? "idx" : undefined;
          return {
            sourceName: sourceName as string | undefined,
            exportName,
            cnName: String(f.cnName ?? "").trim() || exportName
          };
        }).filter((f: any) => f.exportName);
        if (templateFields.length > 0) {
          nextTemplateFields[storageKey] = templateFields;
          // 字段顺序用 sourceName（如 idx），确保 applyEDeviceInterfaceFieldOrder 能匹配到设备库行字段
          nextFieldOrder[storageKey] = templateFields.map((f: any) => f.sourceName || f.exportName);
        }
      }
      // standalone 表的表号也存储在 sectionKind 名下（导出时按 sectionKind 查找表号计算 id）
      if (isStandalone && section.tableId && storageKey) {
        runtimeGeneratedTableIds[storageKey] = String(section.tableId).trim();
      }
      runtimeGenerated.push({
        section: sectionKind,
        fields: section.fields && section.fields.length > 0
          ? section.fields.map((f: any) => String(f.exportName ?? "").trim()).filter(Boolean)
          : undefined
      });
      continue;
    }

    // 查找对应的类行（node 表特殊：合并 ACNode+ACRealBs 两行匹配）
    const row = rowsByComponentLibrary.get(componentLibrary);
    const isNodeMergedSection = componentLibrary === "node" || sectionKind === "node";
    const nodeSecondaryRows = isNodeMergedSection && !row
      ? [rowsByComponentLibrary.get("ACNode"), rowsByComponentLibrary.get("ACRealBs")].filter(Boolean)
      : [];

    if (!row && nodeSecondaryRows.length === 0) {
      skipped.push({
        section: sectionKind,
        reason: `未找到对应的类设备：${componentLibrary}`
      });
      continue;
    }

    // 找到了对应的设备（或多行合并），为每个模板字段找到对应的设备属性名
    // 多行合并时（node 表 = ACNode + ACRealBs），以第一个匹配行为准显示 device 来源
    const candidateRows: any[] = row ? [row] : nodeSecondaryRows;
    const rowFieldsByKey = new Map<string, string>();
    const rowFieldsByCnName = new Map<string, string>();
    // 两轮建键：先 sourceName（设备属性的权威名），exportName 仅作兜底补键（如模板列名与属性名
    // 确实不同）。单轮「先到先得」会让被写回污染的 exportName（如 rdf_id.exportName="runstat"）
    // 劫持模板同名键，令真正的 run_stat 永远匹配不上。
    const registerRowKey = (keyName: string, deviceName: string) => {
      const key = deviceDefinitionComplianceKey(keyName);
      if (key && !rowFieldsByKey.has(key)) {
        rowFieldsByKey.set(key, deviceName);
      }
    };
    for (const r of candidateRows) {
      for (const rf of r.fields ?? []) {
        const sourceName = String(rf.sourceName ?? "").trim();
        const exportName = String(rf.exportName ?? "").trim();
        registerRowKey(sourceName, sourceName || exportName);
        const cnKey = deviceDefinitionComplianceKey(String(rf.cnName ?? "").trim());
        if (cnKey && !rowFieldsByCnName.has(cnKey)) {
          rowFieldsByCnName.set(cnKey, sourceName || exportName);
        }
      }
    }
    for (const r of candidateRows) {
      for (const rf of r.fields ?? []) {
        const sourceName = String(rf.sourceName ?? "").trim();
        const exportName = String(rf.exportName ?? "").trim();
        registerRowKey(exportName, sourceName || exportName);
      }
    }
    const matchedDeviceLabel = row
      ? componentLibrary
      : (candidateRows.length > 1 ? "ACNode+交流母线" : (candidateRows[0]?.componentLibrary ?? componentLibrary));
    const sectionMatchedFields: Array<{ template: string; device: string }> = [];
    const sectionUnmatchedFields: string[] = [];
    for (const f of section.fields) {
      const templateField = String(f.exportName ?? "").trim();
      const cnName = String(f.cnName ?? "").trim();
      // 固定字段（idx/name/dev_type）视为始终匹配
      if (E_DEVICE_INTERFACE_FIXED_FIELD_NAMES.has(templateField)) {
        sectionMatchedFields.push({ template: templateField, device: templateField });
        continue;
      }
      // XX实时库模板：模板 id 字段对应元件的 idx 属性（导出时经 key_to_long 计算为 id）
      if (templateField === "id") {
        sectionMatchedFields.push({ template: templateField, device: "idx" });
        continue;
      }
      // 拓扑引用字段（ind/znd/nd）由拓扑关系填充，视为匹配
      if (E_DEVICE_INTERFACE_TOPOLOGY_FIELD_NAMES.has(templateField)) {
        sectionMatchedFields.push({ template: templateField, device: "（拓扑生成）" });
        continue;
      }
      // 量测字段（p/q/v/i）由量测系统填充，视为匹配
      if (E_DEVICE_INTERFACE_MEASUREMENT_FIELD_NAMES.has(templateField)) {
        sectionMatchedFields.push({ template: templateField, device: "（量测生成）" });
        continue;
      }
      // 运行时派生字段（ist 所属厂站等）由运行时关系填充，视为匹配
      if (templateField in E_DEVICE_INTERFACE_RUNTIME_DERIVED_FIELD_NAMES) {
        sectionMatchedFields.push({ template: templateField, device: E_DEVICE_INTERFACE_RUNTIME_DERIVED_FIELD_NAMES[templateField] });
        continue;
      }
      // 按 exportName/sourceName 或 cnName 精确匹配设备属性
      const candidates = [templateField, cnName].map(deviceDefinitionComplianceKey).filter(Boolean);
      let deviceField = "";
      for (const candidate of candidates) {
        if (rowFieldsByKey.has(candidate)) {
          deviceField = rowFieldsByKey.get(candidate) ?? "";
          break;
        }
        if (rowFieldsByCnName.has(candidate)) {
          deviceField = rowFieldsByCnName.get(candidate) ?? "";
          break;
        }
      }
      if (deviceField) {
        // 根据模板新增的设备属性，追加「（新增）」标记
        const deviceFieldKey = deviceDefinitionComplianceKey(deviceField);
        const isNewlyAdded = newlyAddedDeviceFields.has(deviceFieldKey);
        sectionMatchedFields.push({ template: templateField, device: isNewlyAdded ? `${deviceField}（新增）` : deviceField });
      } else {
        sectionUnmatchedFields.push(templateField);
      }
    }
    if (sectionMatchedFields.length > 0) {
      const existingMatched = matched.find((m) => m.section === sectionKind && m.device === matchedDeviceLabel);
      if (existingMatched) {
        // node 表（sgcc.e 的 <node 类="ACNode+交流母线">）解析为 ACNode/ACRealBs 两个 section，
        // 两者匹配到同一设备行且表名均为 node，合并字段避免「已匹配」出现重复行
        const seenTemplates = new Set((existingMatched.fields as any[]).map((f: any) => f.template));
        for (const f of sectionMatchedFields) {
          if (!seenTemplates.has(f.template)) {
            (existingMatched.fields as any[]).push(f);
            seenTemplates.add(f.template);
          }
        }
      } else {
        matched.push({
          section: sectionKind,
          device: matchedDeviceLabel,
          fields: sectionMatchedFields
        });
      }
    }
    if (sectionUnmatchedFields.length > 0) {
      skipped.push({
        section: sectionKind,
        reason: `字段未匹配设备属性`,
        fields: sectionUnmatchedFields
      });
    }

    // 存储模板字段定义（含匹配的设备字段名），供导出时覆盖 exportName；未匹配字段以模板字段名作为 sourceName，加入元件属性列表
    if (section.fields && section.fields.length > 0) {
      const templateFields = section.fields.map((f: any) => {
        const templateExportName = String(f.exportName ?? "").trim();
        const matchedField = sectionMatchedFields.find((mf) => mf.template === templateExportName);
        // 去掉「（新增）」标记后缀，确保 sourceName 为纯字段名（避免破坏 exportName 覆盖匹配）
        const rawDevice = matchedField && !matchedField.device.startsWith("（") ? matchedField.device : "";
        const deviceSourceName = rawDevice ? rawDevice.replace(/（新增）$/, "") : "";
        return {
          sourceName: deviceSourceName || templateExportName || undefined,
          exportName: templateExportName,
          cnName: String(f.cnName ?? "").trim() || templateExportName
        };
      }).filter((f: any) => f.exportName);
      if (templateFields.length > 0) {
        nextTemplateFields[componentLibrary] = templateFields;
      }
    }

    // 继续原有的应用逻辑
    nextClassExportEnabled[componentLibrary] = Boolean(section.exportEnabled !== false);
    const exportName = String(sectionKind ?? "").trim();
    if (exportName && exportName !== componentLibrary) {
      nextLabels[componentLibrary] = exportName;
    } else {
      delete nextLabels[componentLibrary];
    }
    fieldPatchesByComponentLibrary.set(componentLibrary, eDeviceInterfacePatchesForRow(row ?? candidateRows[0], section));
    nextFieldOrder[componentLibrary] = eDeviceInterfaceFieldOrderForRow(row ?? candidateRows[0], section);
  }

  // 确保所有类都设置导出标志（即使没有匹配的 section）
  for (const row of rows) {
    const componentLibrary = row.componentLibrary;
    const section = sectionByComponentLibrary.get(componentLibrary);
    if (!(componentLibrary in nextClassExportEnabled)) {
      nextClassExportEnabled[componentLibrary] = Boolean(section && section.exportEnabled !== false);
    }
    // 为所有行生成字段补丁（即使没有匹配的section）
    if (!fieldPatchesByComponentLibrary.has(componentLibrary)) {
      fieldPatchesByComponentLibrary.set(componentLibrary, eDeviceInterfacePatchesForRow(row, section));
    }
  }

  const patchDefinitions = (template: any, derivedInfo?: any) => {
    derivedInfo = derivedInfo ?? templateDerivedComponentLibraryInfo(template);
    const componentLibrary = derivedInfo?.componentLibrary ?? eDeviceInterfaceComponentLibraryForTemplate(template, resolveDefinitionComponentLibrary);
    const basePatches = fieldPatchesByComponentLibrary.get(componentLibrary) ?? new Map();
    const derivedPatches = derivedInfo
      ? fieldPatchesByComponentLibrary.get(derivedInfo.derivedComponentLibrary) ?? new Map()
      : new Map();
    return (resolveEffectiveTemplateParameterDefinitions(template, libraryTemplates) ?? []).map((definition: any) => {
      const enName = String(definition.enName ?? "").trim();
      const definitionKey = deviceDefinitionComplianceKey(enName);
      const derivedSpecific = derivedInfo
        ? !eDeviceInterfaceIsDerivedBaseField(enName, derivedInfo.baseComponentLibrary)
        : false;
      const basePatch: EDeviceInterfaceFieldPatch | undefined = basePatches.get(definitionKey);
      const derivedPatch: EDeviceInterfaceFieldPatch | undefined = derivedPatches.get(definitionKey);
      const patch = derivedSpecific ? (derivedPatch ?? basePatch) : (basePatch ?? derivedPatch);
      if (!patch) {
        return definition;
      }
      return {
        ...definition,
        exportEnabled: patch.exportEnabled,
        exportName: patch.exportName
      };
    });
  };

  const nextCustomDeviceTemplates = (customDeviceTemplates ?? []).map((template: any) => {
    const next = { ...template };
    delete next.parameterDefinitions;
    delete next.parameterDefinitionsIntent;
    delete next.measurementDefinitions;
    delete next.measurementDefinitionsIntent;
    return next;
  });
  const nextDeviceDefinitionOverrides: Record<string, any> = { ...deviceDefinitionOverrides };
  // peer 分组建一次表给整轮模板复用（原实现每轮对全量模板 filter 一遍，O(N²)）
  const peerKindsBySharedKey = groupPeerKindsBySharedKey(libraryTemplates ?? []);
  for (const template of libraryTemplates ?? []) {
    // 派生类模板（风电/光伏/储能等）的 definitionKey 塌缩到基类（如 ACGenerator），
    // 写入共享 key 会被后遍历的派生模板覆盖，导致基类（交流电源）经 override 合并派生专属参数
    // （如储能的 storage_technology 出现在交流电源下）。派生模板的参数定义与 E 文件导出均走
    // 统一的有效定义解析器（不依赖此 override），故跳过避免污染基类。
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    if (derivedInfo) {
      continue;
    }
    const definitionKey = deviceDefinitionSharedKeyForTemplate(template);
    const existingOverride = typeof deviceDefinitionOverrideForTemplate === "function"
      ? deviceDefinitionOverrideForTemplate(template, nextDeviceDefinitionOverrides, libraryTemplates, peerKindsBySharedKey)
      : (nextDeviceDefinitionOverrides[template.kind] ?? nextDeviceDefinitionOverrides[definitionKey] ?? {});
    const parameterDefinitions = patchDefinitions(template, derivedInfo);
    delete nextDeviceDefinitionOverrides[template.kind];
    nextDeviceDefinitionOverrides[definitionKey] = {
      ...existingOverride,
      kind: definitionKey,
      params: { ...(existingOverride?.params ?? {}) },
      parameterDefinitions,
      stateDefinitions: Array.isArray(existingOverride?.stateDefinitions)
        ? existingOverride.stateDefinitions
        : template.stateDefinitions,
      updatedAt: new Date().toISOString()
    };
  }

  return {
    customDeviceTemplates: nextCustomDeviceTemplates,
    deviceDefinitionOverrides: normalizeSharedDeviceDefinitionOverrides(nextDeviceDefinitionOverrides, libraryTemplates),
    eDeviceDefinitionLabels: nextLabels,
    eDeviceDefinitionClassExportEnabled: nextClassExportEnabled,
    eDeviceDefinitionFieldOrder: nextFieldOrder,
    eDeviceDefinitionTemplateFields: nextTemplateFields,
    eDeviceDefinitionTableIds: {
      ...eDeviceDefinitionTableIdsFromSections(sections, reverseLabelToComponentLibrary),
      ...runtimeGeneratedTableIds
    },
    matched,
    skipped,
    runtimeGenerated
  };
}

/**
 * 从模板 sections 提取「类 -> 表号」映射（如 ACGenerator -> "00411"）。
 * 表号用于导出时按 key_to_long(表号, 0, 行号) 计算 id 字段。
 */
function eDeviceDefinitionTableIdsFromSections(
  sections: readonly any[],
  reverseLabelToComponentLibrary: Map<string, string>
): Record<string, string> {
  const tableIds: Record<string, string> = {};
  for (const section of sections ?? []) {
    const tableId = String(section.tableId ?? "").trim();
    if (!tableId) {
      continue;
    }
    const componentLibrary = String(section.componentLibrary || section.originalComponentLibrary || section.kind || "").trim();
    const resolved = componentLibrary
      ? (reverseLabelToComponentLibrary.get(componentLibrary) ?? componentLibrary)
      : "";
    // 同一类映射多个表段（如 交流线路→acline+aclinesegment）时取首个表段（与 labels 先写一致），
    // 保证「输出段名」与「表号」对应同一张表（如 ACBranch→acline→00413）
    if (resolved && !tableIds[resolved]) {
      tableIds[resolved] = tableId;
    }
  }
  return tableIds;
}
