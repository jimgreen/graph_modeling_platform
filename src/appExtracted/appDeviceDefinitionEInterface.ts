// @ts-nocheck
import { buildEDeviceDefinitionFileFromInterfaceDefinitions, E_SECTION_COLUMNS, electricGenerationDerivedComponentLibraryInfo, getTemplateParameterDefinitions, inferESection, parseEDeviceDefinitionFile, resolveDeviceParameterDefinitionExportSettings, templateDerivedComponentLibraryInfo } from "../model";
import { clampNumber } from "../canvasViewport";
import { IMAGE_FIT_MODE_OPTIONS, imageFitPreserveAspectRatio, normalizeImageFitMode } from "../imageFit";
import { apiPath } from "../config";
import { DEFAULT_STATE_ICON_DRAWING_FRAME, stateIconSvgVisibleViewBox } from "../stateIconDrawing";
import { decodeSvgImageSource } from "../svgUtils";
import { buildMeasurementProfilePositionDefinitions } from "../measurements";
import { measurementProfileItemsComplianceMessage } from "./appGraphMeasurementFactories";

export const STATE_ICON_DRAFT_FRAME = DEFAULT_STATE_ICON_DRAWING_FRAME;

function normalizeStateIconFrameText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeStateIconFrameNumber(value: unknown) {
  return Math.max(0, Number(value) || 0);
}

export function stateIconDrawingFrameHasPersistedContent(frame: any) {
  if (!frame) {
    return false;
  }
  const mergedFrame = { ...STATE_ICON_DRAFT_FRAME, ...frame };
  return Boolean(
    normalizeStateIconFrameText(mergedFrame.backgroundImage) ||
    normalizeStateIconFrameText(mergedFrame.backgroundImageAssetId) ||
    normalizeStateIconFrameText(mergedFrame.fillColor) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.fillColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeColor) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.strokeColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeStyle) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.strokeStyle) ||
    normalizeStateIconFrameNumber(mergedFrame.strokeWidth) !== normalizeStateIconFrameNumber(STATE_ICON_DRAFT_FRAME.strokeWidth)
  );
}

export const STATE_ICON_LINE_SHAPE_KINDS = new Set(["line", "polyline", "arc", "semicircle"]);
export const STATE_ICON_CLOSED_SHAPE_KINDS = new Set(["point", "triangle", "rectangle", "square", "hexagon", "polygon", "circle", "semicircle", "ellipse", "text"]);
export const STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER = [
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape",
  "StaticMediaSymbol",
  "StaticFlowNode",
  "StaticContainerSymbol",
  "StaticAnnotationSymbol",
  "StaticButton"
];
export const STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS = new Set([
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape"
]);
export const STATE_ICON_DRAWING_FRAME_WIDTH = 240;
export const STATE_ICON_DRAWING_FRAME_HEIGHT = 160;

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

// 反向解析元件库名：模板 section 的 componentLibrary 可能是导出标签（如 "estore"），映射为元件库名（如 "ACStorageGen"）
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
  high_max_current: "high_i_max",
  medium_max_current: "medium_i_max",
  low_max_current: "low_i_max"
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

const E_DEVICE_INTERFACE_FIXED_FIELD_NAMES = new Set(["idx", "name", "dev_type"]);
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
  "dev_type",
  "status",
  "run_stat",
  "node",
  "t1_node",
  "t2_node",
  "t3_node",
  "i_node",
  "j_node",
  "control_type",
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

const E_DEVICE_INTERFACE_DISPLAY_FIXED_FIELDS = new Set(["idx", "name", "dev_type"]);

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
  configuredOrder: readonly string[] = []
) {
  if ((configuredOrder ?? []).length > 0) {
    return applyEDeviceInterfaceFieldOrder(fields, configuredOrder);
  }
  const preferredOrder = [...(E_SECTION_COLUMNS[componentLibrary] ?? [])].map((fieldName) => fieldName.toLowerCase());
  if (!preferredOrder.includes("dev_type")) {
    const nameIndex = preferredOrder.indexOf("name");
    preferredOrder.splice(nameIndex >= 0 ? nameIndex + 1 : 0, 0, "dev_type");
  }
  const preferredIndex = new Map(
    preferredOrder
      .filter((fieldName) => eDeviceInterfaceDisplayCoreFieldName(fieldName))
      .map((fieldName, index) => [fieldName, index])
  );

  return fields
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
    for (const definition of getTemplateParameterDefinitions(template) ?? []) {
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
    for (const definition of getTemplateParameterDefinitions(template) ?? []) {
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
    groups.set("ACTransWinding", {
      ...acTransformerGroup,
      componentLibrary: "ACTransWinding",
      label: "变压器绕组",
      exportName: eDeviceDefinitionLabels["ACTransWinding"] ?? "ACTransWinding",
      exportEnabled: eDeviceDefinitionClassExportEnabled["ACTransWinding"] !== false,
      fields: acTransformerGroup.fields.map((field: any) => ({ ...field })),
      fieldBySourceName: new Map(acTransformerGroup.fieldBySourceName)
    });
  }
  return Array.from(groups.values()).map((group) => {
    const { fieldBySourceName, ...row } = group;
    const orderedFields = applyEDeviceInterfaceFieldOrder(row.fields, eDeviceDefinitionFieldOrder[row.componentLibrary] ?? []);
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
      const remappedFields = orderedFields.map((field) => {
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
        options.eDeviceDefinitionFieldOrder?.[definition.componentLibrary] ?? []
      )
    })),
    eDeviceDefinitionLabels: options.eDeviceDefinitionLabels ?? {},
    eDeviceDefinitionTemplateFields: options.eDeviceDefinitionTemplateFields ?? {},
    eDeviceDefinitionTableIds: options.eDeviceDefinitionTableIds ?? {}
  };
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

function eDeviceInterfacePatchesForRow(row: any, section: any | undefined) {
  const patches = new Map<string, { exportEnabled: boolean; exportName: string }>();
  const availableFields = section
    ? (section.fields ?? []).filter((field: any) => !E_DEVICE_INTERFACE_FIXED_FIELD_NAMES.has(String(field.sourceName ?? field.exportName ?? "").trim()))
    : [];
  const usedFieldIndexes = new Set<number>();
  const findSectionFieldIndex = (field: any) => {
    const fieldKeys = [
      field.exportName,
      field.sourceName,
      field.cnName
    ].map(deviceDefinitionComplianceKey).filter(Boolean);
    for (let index = 0; index < availableFields.length; index += 1) {
      if (usedFieldIndexes.has(index)) {
        continue;
      }
      const sectionField = availableFields[index];
      const sectionKeys = [
        sectionField.sourceName,
        sectionField.exportName,
        sectionField.cnName
      ].map(deviceDefinitionComplianceKey).filter(Boolean);
      if (fieldKeys.some((key) => sectionKeys.includes(key))) {
        return index;
      }
    }
    for (let index = 0; index < availableFields.length; index += 1) {
      if (!usedFieldIndexes.has(index)) {
        return index;
      }
    }
    return -1;
  };
  for (const field of row.fields ?? []) {
    if (field.readonly) {
      continue;
    }
    const sourceName = String(field.sourceName ?? "").trim();
    if (!sourceName) {
      continue;
    }
    const sectionFieldIndex = section ? findSectionFieldIndex(field) : -1;
    if (sectionFieldIndex >= 0) {
      usedFieldIndexes.add(sectionFieldIndex);
      const sectionField = availableFields[sectionFieldIndex];
      patches.set(deviceDefinitionComplianceKey(sourceName), {
        exportEnabled: sectionField.exportEnabled !== false,
        exportName: String(sectionField.exportName || field.exportName || sourceName).trim()
      });
    } else {
      patches.set(deviceDefinitionComplianceKey(sourceName), {
        exportEnabled: false,
        exportName: String(field.exportName || sourceName).trim()
      });
    }
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
  // 单行表（dms_def_bulk/feeder/source）由头表逻辑构建，不参与元件匹配但需存储模板字段；
  // 连接节点表（dms_def_node，元件库=ACNode）由拓扑节点生成，模板字段存 ACNode 名下
  "dms_def_lnseg_dot", "dms_def_bulk", "dms_def_feeder", "dms_def_source", "dms_def_node"
]);
// 独立导出表：运行时生成的表中，导出代码按 kind 名查找接口定义（如 aclineend/dclineend），
// 模板字段需存储在 sectionKind 名下。
// 非 standalone 的运行时表（如 trans/transformerwinding）是元件库的导出别名，
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
  deviceDefinitionKeyForTemplate?: (template: any) => string;
  deviceDefinitionOverrideForTemplate?: (template: any, overrides: Record<string, any>) => any;
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
    deviceDefinitionKeyForTemplate,
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

  // 从模板角度出发，检查每个模板section是否匹配元件库
  const matched: Array<{ section: string; fields: string[] }> = [];
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

  // 构建反向映射：导出标签 → 元件库名（如 "estore" → "ACStorageGen"）
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
  // 从模板 sections 构建「元件库名 -> 模板字段」映射（含反向映射解析）
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
        exportName
      });
      if (keyName) newlyAddedDeviceFields.add(keyName);
      if (keyName) existingKeys.add(keyName);
    }
  }

  sectionByComponentLibrary = eDeviceInterfaceSectionByComponentLibrary(mergedSections);

  for (const section of mergedSections) {
    const componentLibrary = resolveComponentLibrary(section, reverseLabelToComponentLibrary, rowsByComponentLibrary);
    const sectionKind = section.kind;

    // 运行时生成的表，不参与元件匹配（即使 componentLibrary 对应已有元件库行也跳过）
    // 包括：basevalue/basevoltage/subcontrolarea/substation（基础表）、trans/transformerwinding（绕组表别名）、
    // aclineend/dclineend（线段端点表，导出时从 ACBranch/DCBranch 派生）
    if (RUNTIME_GENERATED_SECTIONS.has(sectionKind)) {
      const isStandalone = RUNTIME_GENERATED_STANDALONE_SECTIONS.has(sectionKind);
      const storageKey = isStandalone ? sectionKind : componentLibrary;

      // 非 standalone 的运行时表（如 trans→ACTransWinding, transformerwinding→ACTransWinding）
      // 设置导出标签映射，使导出时元件库行输出为对应的表名
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

    // 查找对应的元件库行（node 表特殊：合并 ACNode+ACRealBs 两行匹配）
    const row = rowsByComponentLibrary.get(componentLibrary);
    const isNodeMergedSection = componentLibrary === "node" || sectionKind === "node";
    const nodeSecondaryRows = isNodeMergedSection && !row
      ? [rowsByComponentLibrary.get("ACNode"), rowsByComponentLibrary.get("ACRealBs")].filter(Boolean)
      : [];

    if (!row && nodeSecondaryRows.length === 0) {
      skipped.push({
        section: sectionKind,
        reason: `未找到对应的元件库设备：${componentLibrary}`
      });
      continue;
    }

    // 找到了对应的设备（或多行合并），为每个模板字段找到对应的设备属性名
    // 多行合并时（node 表 = ACNode + ACRealBs），以第一个匹配行为准显示 device 来源
    const candidateRows: any[] = row ? [row] : nodeSecondaryRows;
    const rowFieldsByKey = new Map<string, string>();
    const rowFieldsByCnName = new Map<string, string>();
    const fieldSourceRowByCandidate = new Map<string, string>(); // 候选 key → 来源 sourceName
    const fieldSourceRowByCnKey = new Map<string, string>();
    for (const r of candidateRows) {
      for (const rf of r.fields ?? []) {
        const sourceName = String(rf.sourceName ?? "").trim();
        const exportName = String(rf.exportName ?? "").trim();
        // 同时以 sourceName 与 exportName 作为匹配键（覆盖 "run_stat"/"runstat" 等命名差异）
        for (const keyName of [sourceName, exportName]) {
          const key = deviceDefinitionComplianceKey(keyName);
          if (key && !rowFieldsByKey.has(key)) {
            rowFieldsByKey.set(key, sourceName || exportName);
          }
        }
        const cnKey = deviceDefinitionComplianceKey(String(rf.cnName ?? "").trim());
        if (cnKey && !rowFieldsByCnName.has(cnKey)) {
          rowFieldsByCnName.set(cnKey, sourceName || exportName);
        }
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
        // node 表（sgcc.e 的 <node 元件库="ACNode+交流母线">）解析为 ACNode/ACRealBs 两个 section，
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

  // 确保所有元件库都设置导出标志（即使没有匹配的section）
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
    return (getTemplateParameterDefinitions(template) ?? []).map((definition: any) => {
      const enName = String(definition.enName ?? "").trim();
      const definitionKey = deviceDefinitionComplianceKey(enName);
      const derivedSpecific = derivedInfo
        ? !eDeviceInterfaceIsDerivedBaseField(enName, derivedInfo.baseComponentLibrary)
        : false;
      const patch = derivedSpecific && derivedPatches.has(definitionKey)
        ? derivedPatches.get(definitionKey)
        : basePatches.get(definitionKey);
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

  const customTemplateKinds = new Set((customDeviceTemplates ?? []).map((template: any) => template.kind));
  const nextCustomDeviceTemplates = (customDeviceTemplates ?? []).map((template: any) => ({
    ...template,
    parameterDefinitions: patchDefinitions(template)
  }));
  const nextDeviceDefinitionOverrides: Record<string, any> = { ...deviceDefinitionOverrides };
  for (const template of libraryTemplates ?? []) {
    if (template.custom || customTemplateKinds.has(template.kind)) {
      continue;
    }
    // 派生元件库模板（风电/光伏/储能等）的 definitionKey 塌缩到基类（如 ACGenerator），
    // 写入共享 key 会被后遍历的派生模板覆盖，导致基类（交流电源）经 override 合并派生专属参数
    // （如储能的 storage_technology 出现在交流电源下）。派生模板的参数定义与 E 文件导出均走
    // template.parameterDefinitions（不依赖此 override），故跳过避免污染基类。
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    if (derivedInfo) {
      continue;
    }
    const definitionKey = typeof deviceDefinitionKeyForTemplate === "function"
      ? deviceDefinitionKeyForTemplate(template)
      : (eDeviceInterfaceComponentLibraryForTemplate(template, resolveDefinitionComponentLibrary) || template.kind);
    const existingOverride = typeof deviceDefinitionOverrideForTemplate === "function"
      ? deviceDefinitionOverrideForTemplate(template, nextDeviceDefinitionOverrides)
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
    deviceDefinitionOverrides: nextDeviceDefinitionOverrides,
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
 * 从模板 sections 提取「元件库 -> 表号」映射（如 ACGenerator -> "00411"）。
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
    // 同一元件库映射多个表段（如 交流线路→acline+aclinesegment）时取首个表段（与 labels 先写一致），
    // 保证「输出段名」与「表号」对应同一张表（如 ACBranch→acline→00413）
    if (resolved && !tableIds[resolved]) {
      tableIds[resolved] = tableId;
    }
  }
  return tableIds;
}
