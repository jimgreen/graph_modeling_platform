/** E 格式导出主入口与设备定义文件编解码（同时作为统一门面重导出已拆分子模块）。 */

import {
  type ModelNode,
  type ProjectFile,
  type DeviceTemplate,
  baseDeviceKind,
  templateDerivedComponentLibraryInfo,
  routableLineDeviceEndpointRefs,
  modelAssociationModelTypeForKind,
  resolveEffectiveTemplateParameterDefinitionGroups,
  ELEMENT_TREE_COMPONENT_LIBRARY_LABELS,
  COMPONENT_LIBRARY_REVERSE_MAPPING,
} from "./model.ts";
import type { GlobalLineEndpoint, GlobalLineRecord, GlobalLineReference } from "./global-lines.ts";

import {
  type EExportWarning,
  type EFileExportOptions,
  type EFileInterfaceSectionDefinition,
  DERIVED_COMPONENT_BASE_ONLY_FIELD_NAMES,
  DERIVED_COMPONENT_COMMON_PARAM_NAMES,
  E_FILE_COLUMN_GAP,
  applyEReferenceIdValues,
  buildEDeviceHeaderParameterRecords,
  buildEDeviceRecords,
  deriveSubstationIdv,
  derivedComponentBaseRelationKey,
  eFileCellDisplayWidth,
  eFileInterfaceDefinitionIndex,
  eFilePadCell,
  eParameterFieldsFromInterfaceDefinition,
  finalizeEDeviceCrossReferences,
  firstNumericToken,
  formatESection,
  getEExportWarningsFromRecords,
  hasTemplateConfig,
  normalizeEInterfaceFieldName,
  normalizeGasQuantityFieldName,
  resolveDerivedComponentParameterFields,
  resolveDeviceParameterDefinitionExportSettings,
  inferESection,
} from "./export/e-record-builders.ts";
import { type EDeviceExport, E_SECTION_COLUMNS } from "./export/e-section-schema.ts";

export * from "./export/e-section-schema.ts";
export * from "./export/e-record-builders.ts";

/**
 * 「查看/编辑E文件」预览用:把同一批记录(经 buildEDeviceRecords 产出)定稿到与导出文件一致的引用值。
 * 预览此前不过定稿步,成员关系表 device_id 恒停在构建期空占位(编辑器整列 0)、container_idx 停在局部值 ——
 * 与导出文件不一致(实机反馈轮 15「表内容为空」在平台侧的唯一可复现面)。
 */
export function finalizeEDevicePreviewRecords(
  project: ProjectFile,
  options: EFileExportOptions,
  records: readonly EDeviceExport[]
): void {
  finalizeEDeviceCrossReferences(project, options, records);
}

function buildEDeviceParameterFileFromRecords(
  project: ProjectFile,
  schemePath: string[],
  options: EFileExportOptions,
  records: readonly EDeviceExport[],
  preserveMergedIndexes = false
) {
  const { interfaceDefinitionBySection, sectionGroups, sectionedRecords } =
    finalizeEDeviceCrossReferences(project, options, records, preserveMergedIndexes);
  const sectionBlocks = sectionGroups.map(({ outputSection, section, allRecords }) =>
    formatESection(section, allRecords, outputSection, interfaceDefinitionBySection.get(section)?.tableId));
  // 头表（模板模式：basevalue/basevoltage/subcontrolarea/substation；非模板模式：Model/basevoltage），
  // 与「查看/编辑E文件」弹窗展示共用同一份记录，保证展示与导出完全一致
  const headerRecords = buildEDeviceHeaderParameterRecords(project, sectionedRecords, options, schemePath);
  // 头表引用字段（如 substation.subarea_id → subcontrolarea）同步为目标表 id
  applyEReferenceIdValues(project, headerRecords, options);
  const headerBlocks: string[] = [];
  for (let index = 0; index < headerRecords.length;) {
    const section = headerRecords[index].section;
    const group: EDeviceExport[] = [];
    while (index < headerRecords.length && headerRecords[index].section === section) {
      group.push(headerRecords[index]);
      index += 1;
    }
    headerBlocks.push(formatESection(section, group, section, interfaceDefinitionBySection.get(section)?.tableId));
  }
  return [...headerBlocks, ...sectionBlocks].join("\n\n") + "\n";
}

export function buildEDeviceParameterFile(
  project: ProjectFile,
  schemePath: string[] = ["默认方案"],
  options: EFileExportOptions = {}
) {
  return buildEDeviceParameterFileFromRecords(
    project,
    schemePath,
    options,
    buildEDeviceRecords(project, options)
  );
}

export type TextFileExport = {
  filename: string;
  text: string;
  mime: string;
};

export type EFileExport = TextFileExport & {
  warnings: EExportWarning[];
};

function safeModelFilePart(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
}

export function buildEFileExport(
  project: ProjectFile,
  schemePath: string[] = ["默认方案"],
  options: EFileExportOptions = {}
): EFileExport {
  const records = buildEDeviceRecords(project, options);
  return {
    filename: `${safeModelFilePart(project.name)}.e`,
    text: buildEDeviceParameterFileFromRecords(project, schemePath, options, records),
    mime: "text/plain",
    warnings: getEExportWarningsFromRecords(project, records, options)
  };
}

export type MultiModelEFileExportInput = {
  id: string;
  schemePath: string[];
  project: ProjectFile;
};

const MULTI_MODEL_NODE_REFERENCE_COLUMNS = new Set([
  "node",
  "i_node",
  "j_node",
  "k_node",
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
  "neutral_node",
  "node_id",
  "inode_id",
  "znode_id"
]);

const MULTI_MODEL_DEVICE_REFERENCE_COLUMNS = new Set([
  "aclnseg_id",
  "dcln_id",
  "tr_id",
  "itrfm",
  "trfm_id"
]);

function positiveIntegerValue(value: unknown) {
  const token = firstNumericToken(String(value ?? ""));
  const numeric = Number.parseInt(token, 10);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

function collapsedModelAssociationNodeIds(
  project: ProjectFile,
  globalLineNodes: readonly { globalLineId: string; node: ModelNode }[],
  fullyExportedGlobalLineIds: ReadonlySet<string>
) {
  const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  const collapsedNodeIds = new Set<string>();
  for (const { globalLineId, node: line } of globalLineNodes) {
    if (!fullyExportedGlobalLineIds.has(globalLineId)) continue;
    const refs = routableLineDeviceEndpointRefs(line);
    for (const ref of [refs.source, refs.target]) {
      const endpointNode = ref ? nodeById.get(ref.nodeId) : undefined;
      if (endpointNode && modelAssociationModelTypeForKind(endpointNode.kind)) {
        collapsedNodeIds.add(endpointNode.id);
      }
    }
  }
  return collapsedNodeIds;
}

function recordBelongsToCollapsedModelAssociationNode(
  recordId: string,
  collapsedNodeIds: ReadonlySet<string>
) {
  for (const nodeId of collapsedNodeIds) {
    if (recordId === nodeId || recordId.startsWith(`${nodeId}:`)) {
      return true;
    }
  }
  return false;
}

function offsetMultiModelRecordIndexes(records: EDeviceExport[], modelIndex: number) {
  const offset = modelIndex * 10000;
  const nextLocalIndexBySection = new Map<string, number>();
  for (const record of records) {
    const localIndex = positiveIntegerValue(record.params.idx) ||
      (nextLocalIndexBySection.get(record.section) ?? 0) + 1;
    nextLocalIndexBySection.set(
      record.section,
      Math.max(nextLocalIndexBySection.get(record.section) ?? 0, localIndex)
    );
    record.params.idx = String(offset + localIndex);
    for (const column of [...MULTI_MODEL_NODE_REFERENCE_COLUMNS, ...MULTI_MODEL_DEVICE_REFERENCE_COLUMNS]) {
      const localReference = positiveIntegerValue(record.params[column]);
      if (localReference > 0) {
        record.params[column] = String(offset + localReference);
      }
    }
  }
}

function alignMultiModelDerivedBaseReferenceIndexes(
  records: EDeviceExport[],
  modelIndex: number,
  options: EFileExportOptions
) {
  const recordById = new Map(records.map((record) => [record.id, record] as const));
  const interfaceDefinitionBySection = new Map(
    (options.interfaceDefinitions ?? []).map((definition) => [definition.componentLibrary, definition] as const)
  );
  for (const record of records) {
    const markerIndex = record.id.lastIndexOf(":derived:");
    if (markerIndex < 0) continue;
    const baseRecord = recordById.get(record.id.slice(0, markerIndex));
    const interfaceDefinition = interfaceDefinitionBySection.get(record.section);
    const baseComponentLibrary = baseRecord?.section || interfaceDefinition?.derivedFromComponentLibrary || "";
    if (!baseComponentLibrary) continue;
    const relationSourceName = derivedComponentBaseRelationKey(baseComponentLibrary);
    const relationExportName = interfaceDefinition
      ? eParameterFieldsFromInterfaceDefinition(record.section, interfaceDefinition)
          .find((field) => field.sourceName === relationSourceName)?.exportName ?? relationSourceName
      : relationSourceName;
    if (!(record.columns ?? []).includes(relationExportName) && !(relationExportName in record.params)) {
      continue;
    }
    const localReference = positiveIntegerValue(record.params[relationExportName]);
    const exportedBaseIndex = positiveIntegerValue(baseRecord?.params.idx) ||
      (localReference > 0 ? modelIndex * 10000 + localReference : 0);
    if (exportedBaseIndex > 0) {
      record.params[relationExportName] = String(exportedBaseIndex);
    }
  }
}

type MultiModelHierarchyType = Extract<NonNullable<ProjectFile["modelType"]>, "厂站" | "馈线" | "台区">;

const MULTI_MODEL_HIERARCHY_SECTIONS: ReadonlyArray<{
  modelType: MultiModelHierarchyType;
  section: "Station" | "Feeder" | "District";
}> = [
  { modelType: "厂站", section: "Station" },
  { modelType: "馈线", section: "Feeder" },
  { modelType: "台区", section: "District" }
];

function buildMultiModelHierarchyRecords(
  orderedInputs: readonly MultiModelEFileExportInput[],
  templateMode = false
): EDeviceExport[] {
  const modelIndexByInput = new Map<MultiModelEFileExportInput, number>();
  const inputByModelIndex = new Map<number, MultiModelEFileExportInput>();

  orderedInputs.forEach((input, inputIndex) => {
    const modelIndex = positiveIntegerValue(input.project.idx) || inputIndex + 1;
    modelIndexByInput.set(input, modelIndex);
    const persistedModelIndex = positiveIntegerValue(input.project.idx);
    if (persistedModelIndex > 0) inputByModelIndex.set(persistedModelIndex, input);
  });

  const resolveAssociatedInput = (
    node: ModelNode,
    expectedModelType: MultiModelHierarchyType
  ): MultiModelEFileExportInput | undefined => {
    const associationModelType = modelAssociationModelTypeForKind(node.kind);
    if (associationModelType !== expectedModelType) return undefined;

    const modelIndex = positiveIntegerValue(node.params.model_id);
    const byModelIndex = modelIndex > 0 ? inputByModelIndex.get(modelIndex) : undefined;
    if (byModelIndex?.project.modelType === expectedModelType) return byModelIndex;

    return undefined;
  };

  const parentIndexByInput = new Map<MultiModelEFileExportInput, number>();
  for (const parentInput of orderedInputs) {
    const childModelType = parentInput.project.modelType === "厂站"
      ? "馈线"
      : parentInput.project.modelType === "馈线"
        ? "台区"
        : "";
    if (!childModelType) continue;
    const parentIndex = modelIndexByInput.get(parentInput) ?? 0;
    for (const node of parentInput.project.nodes) {
      const childInput = resolveAssociatedInput(node, childModelType);
      if (childInput && !parentIndexByInput.has(childInput)) {
        parentIndexByInput.set(childInput, parentIndex);
      }
    }
  }

  return MULTI_MODEL_HIERARCHY_SECTIONS.flatMap(({ modelType, section }) => {
    // 模板模式（国网E格式/主网等）下，厂站模型列表写入模板定义的 <substation>（由
    // buildMultiModelEFileExport 补充为 substation 记录），不再输出合成 <Station> 表。
    if (templateMode && section === "Station") {
      return [];
    }
    return orderedInputs
      .filter((input) => input.project.modelType === modelType)
      .map((input, rowIndex) => ({
        id: `model-hierarchy:${section}:${String(input.id ?? "").trim() || rowIndex + 1}`,
        kind: "model",
        section,
        columns: section === "Station" ? ["idx", "name"] : ["idx", "name", "parent"],
        params: {
          idx: String(modelIndexByInput.get(input) ?? rowIndex + 1),
          name: String(input.project.name ?? "").trim() || `${modelType}${rowIndex + 1}`,
          ...(section === "Station" ? {} : { parent: String(parentIndexByInput.get(input) ?? 0) })
        }
      }));
  });
}

const MULTI_MODEL_GLOBAL_LINE_ID_PARAM = "_globalLineId";

const MULTI_MODEL_GLOBAL_LINE_PAIR_PARAM = "_globalLineModelPair";

type MultiModelGlobalLineOccurrence = {
  globalLineId: string;
  input: MultiModelEFileExportInput;
  modelIndex: number;
  node: ModelNode;
  records: EDeviceExport[];
};

type MultiModelGlobalLineEndpointRecord = {
  occurrence: MultiModelGlobalLineOccurrence;
  slot: "i" | "j";
  nodeNumber: string;
};

export function multiModelRecordWithParent(record: EDeviceExport, parent: number): EDeviceExport {
  const isDerivedRecord = record.id.includes(":derived:") && record.kind.includes(":derived:");
  const originalColumns = record.columns ?? E_SECTION_COLUMNS[record.section] ?? Object.keys(record.params);
  const hadParentColumn = originalColumns.includes("parent");
  const columns = [...originalColumns]
    .filter((column) => column !== "parent" && (!isDerivedRecord || column !== "dev_type"));
  if (isDerivedRecord) {
    const params = { ...record.params };
    delete params.parent;
    delete params.dev_type;
    return { ...record, params, columns };
  }
  const parentParams = { ...record.params, parent: String(parent) };
  // 模板（如国网E格式/实时库）接口字段不含 parent：不强行注入 parent 列，
  // 多厂站归属由模板 ist 字段表达；parent 仅留在 params 内供引用。
  if (!hadParentColumn) {
    return { ...record, params: parentParams, columns };
  }
  const devTypeIndex = columns.indexOf("dev_type");
  if (devTypeIndex >= 0) {
    columns.splice(devTypeIndex, 1);
  }
  const nameIndex = columns.indexOf("name");
  const idxIndex = columns.indexOf("idx");
  const parentIndex = nameIndex >= 0 ? nameIndex + 1 : idxIndex >= 0 ? idxIndex + 1 : 0;
  columns.splice(parentIndex, 0, "parent");
  if (devTypeIndex >= 0) {
    columns.splice(parentIndex + 1, 0, "dev_type");
  }
  return { ...record, params: parentParams, columns };
}

function multiModelGlobalLineNodes(project: ProjectFile) {
  return project.nodes.flatMap((node) => {
    const globalLineId = String(node.params[MULTI_MODEL_GLOBAL_LINE_ID_PARAM] ?? "").trim();
    const kind = baseDeviceKind(node.kind);
    const isGlobalLineKind = kind === "ac-routable-line" || kind === "ac-zero-routable-branch" ||
      kind === "dc-routable-line" || kind === "dc-zero-routable-branch";
    return globalLineId && isGlobalLineKind ? [{ globalLineId, node }] : [];
  });
}

function multiModelGlobalLineIdForRecord(
  recordId: string,
  globalLineNodeIdMap: ReadonlyMap<string, string>
) {
  for (const [nodeId, globalLineId] of globalLineNodeIdMap) {
    if (recordId === nodeId || recordId.startsWith(`${nodeId}:`)) {
      return globalLineId;
    }
  }
  return "";
}

function multiModelGlobalLineEndpointReference(
  record: GlobalLineRecord,
  endpoint: GlobalLineEndpoint
): GlobalLineReference | null {
  const endpointSlot = record.endpointSlots?.[endpoint];
  if (endpointSlot !== undefined) return endpointSlot;
  return record.references.find((reference) => (
    reference.boundaryEndpoint === endpoint ||
    (!reference.boundaryEndpoint && reference.terminalSlot === (endpoint === "source" ? "i" : "j"))
  )) ?? null;
}

const MULTI_MODEL_GLOBAL_LINE_ENDPOINT_COLUMNS = {
  i: ["i_node", "ind", "inode_id"],
  j: ["j_node", "znd", "znode_id"]
} as const;

function multiModelGlobalLineEndpointValue(record: EDeviceExport, slot: "i" | "j") {
  for (const column of MULTI_MODEL_GLOBAL_LINE_ENDPOINT_COLUMNS[slot]) {
    const value = positiveIntegerValue(record.params[column]);
    if (value > 0) return String(value);
  }
  return "";
}

function multiModelGlobalLineOccurrenceForReference(
  occurrences: readonly MultiModelGlobalLineOccurrence[],
  reference: GlobalLineReference
) {
  const projectIndex = positiveIntegerValue(reference.projectIdx);
  const modelMatches = occurrences.filter((occurrence) => (
    (projectIndex > 0 && occurrence.modelIndex === projectIndex) ||
    reference.modelKey === `model:${occurrence.modelIndex}` ||
    (
      reference.projectName === occurrence.input.project.name &&
      JSON.stringify(reference.schemePath) === JSON.stringify(occurrence.input.schemePath)
    )
  ));
  return modelMatches.find((occurrence) => occurrence.node.id === reference.nodeId) ?? modelMatches[0];
}

function multiModelGlobalLineBoundaryEndpoint(node: ModelNode): GlobalLineEndpoint | "" {
  if (!modelAssociationModelTypeForKind(node.kind)) return "";
  const kind = String(baseDeviceKind(node.kind));
  if (kind.endsWith("-source")) return "source";
  if (kind.endsWith("-load")) return "target";
  return "";
}

function multiModelGlobalLineFallbackEndpoint(
  occurrences: readonly MultiModelGlobalLineOccurrence[],
  endpoint: GlobalLineEndpoint
): MultiModelGlobalLineEndpointRecord | null {
  for (const occurrence of occurrences) {
    const refs = routableLineDeviceEndpointRefs(occurrence.node);
    const nodeById = new Map(occurrence.input.project.nodes.map((node) => [node.id, node]));
    const endpoints = [
      { slot: "i" as const, reference: refs.source },
      { slot: "j" as const, reference: refs.target }
    ];
    for (const candidate of endpoints) {
      const boundaryNode = candidate.reference ? nodeById.get(candidate.reference.nodeId) : undefined;
      if (!boundaryNode || !modelAssociationModelTypeForKind(boundaryNode.kind)) {
        continue;
      }
      const boundaryEndpoint = multiModelGlobalLineBoundaryEndpoint(boundaryNode) ||
        String(occurrence.node.params[MULTI_MODEL_GLOBAL_LINE_PAIR_PARAM] ?? "").trim();
      const localEndpoint = boundaryEndpoint === "source" ? "target" : boundaryEndpoint === "target" ? "source" : "";
      if (localEndpoint !== endpoint) continue;
      const localSlot = candidate.slot === "i" ? "j" : "i";
      const lineRecord = occurrence.records.find((record) => record.id === occurrence.node.id);
      const nodeNumber = lineRecord ? multiModelGlobalLineEndpointValue(lineRecord, localSlot) : "";
      if (lineRecord && nodeNumber) return { occurrence, slot: localSlot, nodeNumber };
    }
  }
  return null;
}

function multiModelGlobalLineEndpointRecord(
  occurrences: readonly MultiModelGlobalLineOccurrence[],
  globalLineRecord: GlobalLineRecord | undefined,
  endpoint: GlobalLineEndpoint
): MultiModelGlobalLineEndpointRecord | null {
  const reference = globalLineRecord
    ? multiModelGlobalLineEndpointReference(globalLineRecord, endpoint)
    : null;
  if (reference) {
    const occurrence = multiModelGlobalLineOccurrenceForReference(occurrences, reference);
    const slot = reference.terminalSlot;
    const lineRecord = occurrence?.records.find((record) => record.id === occurrence.node.id);
    if (occurrence && slot && lineRecord) {
      const nodeNumber = multiModelGlobalLineEndpointValue(lineRecord, slot);
      if (nodeNumber) return { occurrence, slot, nodeNumber };
    }
  }
  return multiModelGlobalLineFallbackEndpoint(occurrences, endpoint);
}

function setMultiModelGlobalLineEndpointValue(
  record: EDeviceExport,
  slot: "i" | "j",
  value: string
) {
  const candidateColumns = MULTI_MODEL_GLOBAL_LINE_ENDPOINT_COLUMNS[slot];
  let matched = false;
  for (const column of candidateColumns) {
    if (column in record.params || record.columns?.includes(column)) {
      record.params[column] = value;
      matched = true;
    }
  }
  if (!matched) {
    record.params[slot === "i" ? "i_node" : "j_node"] = value;
  }
}

function buildMultiModelGlobalLineRecords(
  occurrences: readonly MultiModelGlobalLineOccurrence[],
  globalLineRecords: readonly GlobalLineRecord[],
  regularRecords: readonly EDeviceExport[],
  options: EFileExportOptions
) {
  const recordById = new Map(globalLineRecords.map((record) => [record.id, record]));
  const interfaceDefinitionBySection = eFileInterfaceDefinitionIndex(options);
  const occurrencesById = new Map<string, MultiModelGlobalLineOccurrence[]>();
  for (const occurrence of occurrences) {
    occurrencesById.set(
      occurrence.globalLineId,
      [...(occurrencesById.get(occurrence.globalLineId) ?? []), occurrence]
    );
  }
  const nextIndexBySection = new Map<string, number>();
  for (const record of regularRecords) {
    nextIndexBySection.set(
      record.section,
      Math.max(nextIndexBySection.get(record.section) ?? 0, positiveIntegerValue(record.params.idx))
    );
  }
  const orderedGlobalLineIds = [...occurrencesById.keys()].sort((left, right) => {
    const leftRecord = recordById.get(left);
    const rightRecord = recordById.get(right);
    return positiveIntegerValue(leftRecord?.idx) - positiveIntegerValue(rightRecord?.idx) ||
      String(leftRecord?.name ?? left).localeCompare(String(rightRecord?.name ?? right), "zh-CN");
  });

  return orderedGlobalLineIds.flatMap((globalLineId, globalLineOrder) => {
    const lineOccurrences = occurrencesById.get(globalLineId) ?? [];
    const templateOccurrence = lineOccurrences.find((occurrence) =>
      occurrence.records.some((record) => record.id === occurrence.node.id)
    );
    const templateRecord = templateOccurrence?.records.find((record) => record.id === templateOccurrence.node.id);
    if (!templateOccurrence || !templateRecord) return [];

    const registryRecord = recordById.get(globalLineId);
    const globalLineIndex = positiveIntegerValue(registryRecord?.idx) ||
      positiveIntegerValue(templateOccurrence.node.params.idx) || globalLineOrder + 1;
    const globalLineName = String(registryRecord?.name ?? templateOccurrence.node.name ?? "").trim() ||
      `全局线路-${globalLineIndex}`;
    const baseRecord = multiModelRecordWithParent({
      ...templateRecord,
      id: `global-line:${globalLineId}`,
      params: { ...templateRecord.params },
      columns: [...(templateRecord.columns ?? [])]
    }, 0);
    const interfaceFields = interfaceDefinitionBySection.get(baseRecord.section)?.fields ?? [];
    for (const [key, value] of Object.entries(registryRecord?.params ?? {})) {
      const exportName = String(interfaceFields.find((field) => (
        String(field.sourceName ?? field.exportName ?? "").trim() === key
      ))?.exportName ?? key).trim();
      if (!key.startsWith("_") && exportName && (
        exportName in baseRecord.params || baseRecord.columns?.includes(exportName)
      )) {
        baseRecord.params[exportName] = String(value ?? "");
      }
    }
    baseRecord.params.idx = String(globalLineIndex);
    baseRecord.params.name = globalLineName;
    const source = multiModelGlobalLineEndpointRecord(lineOccurrences, registryRecord, "source");
    const target = multiModelGlobalLineEndpointRecord(lineOccurrences, registryRecord, "target");
    if (source) setMultiModelGlobalLineEndpointValue(baseRecord, "i", source.nodeNumber);
    if (target) setMultiModelGlobalLineEndpointValue(baseRecord, "j", target.nodeNumber);

    const records = [baseRecord];
    for (const [endpoint, endpointRecord, label] of [
      ["source", source, "首端"],
      ["target", target, "末端"]
    ] as const) {
      if (!endpointRecord) continue;
      const side = endpointRecord.slot === "i" ? 0 : 1;
      const templateEndRecord = endpointRecord.occurrence.records.find(
        (record) => record.id === `${endpointRecord.occurrence.node.id}:end:${side}`
      );
      if (!templateEndRecord) continue;
      const endRecord = multiModelRecordWithParent({
        ...templateEndRecord,
        id: `global-line:${globalLineId}:end:${endpoint}`,
        params: { ...templateEndRecord.params },
        columns: [...(templateEndRecord.columns ?? [])]
      }, 0);
      const nextEndIndex = (nextIndexBySection.get(endRecord.section) ?? 0) + 1;
      nextIndexBySection.set(endRecord.section, nextEndIndex);
      endRecord.params.idx = String(nextEndIndex);
      endRecord.params.name = `${globalLineName}_${label}`;
      for (const linkColumn of ["aclnseg_id", "dcln_id"]) {
        if (linkColumn in endRecord.params || endRecord.columns?.includes(linkColumn)) {
          endRecord.params[linkColumn] = String(globalLineIndex);
        }
      }
      for (const nodeColumn of ["nd", "node_id"]) {
        if (nodeColumn in endRecord.params || endRecord.columns?.includes(nodeColumn)) {
          endRecord.params[nodeColumn] = endpointRecord.nodeNumber;
        }
      }
      records.push(endRecord);
    }
    return records;
  });
}

export function buildMultiModelEFileExport(
  inputs: readonly MultiModelEFileExportInput[],
  options: EFileExportOptions = {},
  globalLineRecords: readonly GlobalLineRecord[] = []
): EFileExport {
  const orderedInputs = [...inputs].sort((left, right) =>
    positiveIntegerValue(left.project.idx) - positiveIntegerValue(right.project.idx) ||
    left.project.name.localeCompare(right.project.name, "zh-CN")
  );
  const templateMode = hasTemplateConfig(options);
  const templateSubstationInputs: Array<{ input: MultiModelEFileExportInput; modelIndex: number; records: EDeviceExport[] }> = [];
  const records: EDeviceExport[] = buildMultiModelHierarchyRecords(orderedInputs, templateMode);
  const warnings: EExportWarning[] = [];
  const globalLineOccurrences: MultiModelGlobalLineOccurrence[] = [];
  const globalLineNodesByInput = new Map(
    orderedInputs.map((input) => [input, multiModelGlobalLineNodes(input.project)] as const)
  );
  const globalLineInputsById = new Map<string, Set<MultiModelEFileExportInput>>();
  for (const [input, globalLineNodes] of globalLineNodesByInput) {
    for (const { globalLineId } of globalLineNodes) {
      const inputsForLine = globalLineInputsById.get(globalLineId) ?? new Set<MultiModelEFileExportInput>();
      inputsForLine.add(input);
      globalLineInputsById.set(globalLineId, inputsForLine);
    }
  }
  const fullyExportedGlobalLineIds = new Set(
    [...globalLineInputsById]
      .filter(([, lineInputs]) => lineInputs.size >= 2)
      .map(([globalLineId]) => globalLineId)
  );

  orderedInputs.forEach((input, inputIndex) => {
    const modelIndex = positiveIntegerValue(input.project.idx) || inputIndex + 1;
    const globalLineNodes = globalLineNodesByInput.get(input) ?? [];
    const collapsedAssociationNodeIds = collapsedModelAssociationNodeIds(
      input.project,
      globalLineNodes,
      fullyExportedGlobalLineIds
    );
    const globalLineIdByNodeId = new Map(globalLineNodes.map(({ globalLineId, node }) => [node.id, globalLineId]));
    const allModelRecords = buildEDeviceRecords(input.project, options)
      .filter((record) => (
        !recordBelongsToCollapsedModelAssociationNode(record.id, collapsedAssociationNodeIds)
      ))
      .map((record) => multiModelRecordWithParent(record, modelIndex));
    // 模板模式下 厂站模型列表写入 <substation>：记录重编号前记录以推导每站 idv，
    // 并把 ist(所属厂站) 置为模型序号（formatEColumnValue 现会读该值），多站可经 ist 区分。
    if (templateMode && input.project.modelType === "厂站") {
      const ownerIndex = String(modelIndex);
      for (const record of allModelRecords) {
        record.params.ist = ownerIndex;
      }
      templateSubstationInputs.push({ input, modelIndex, records: allModelRecords });
    }
    offsetMultiModelRecordIndexes(allModelRecords, modelIndex);
    alignMultiModelDerivedBaseReferenceIndexes(allModelRecords, modelIndex, options);
    for (const { globalLineId, node } of globalLineNodes) {
      globalLineOccurrences.push({
        globalLineId,
        input,
        modelIndex,
        node,
        records: allModelRecords.filter((record) => (
          record.id === node.id || record.id.startsWith(`${node.id}:`)
        ))
      });
    }
    const modelRecords = allModelRecords.filter(
      (record) => !multiModelGlobalLineIdForRecord(record.id, globalLineIdByNodeId)
    );
    const intentionallyOmittedNodeIds = new Set([
      ...collapsedAssociationNodeIds,
      ...globalLineNodes.map(({ node }) => node.id)
    ]);
    const warningProject = intentionallyOmittedNodeIds.size === 0
      ? input.project
      : {
          ...input.project,
          nodes: input.project.nodes.filter((node) => !intentionallyOmittedNodeIds.has(node.id))
        };
    warnings.push(...getEExportWarningsFromRecords(warningProject, modelRecords, options));
    records.push(...modelRecords);
  });
  // 模板模式下把每个厂站模型写为 <substation> 记录（idx=模型序号, name=模型名, idv=推导），
  // 替代合成 <Station>；头表因此不再追加默认厂站行（见 buildEDeviceHeaderParameterRecords 的 hasSubstationRecords 判断）。
  records.push(...templateSubstationInputs.map(({ input, modelIndex, records: modelRecords }) => ({
    id: `model-hierarchy:substation:${String(input.id ?? "").trim() || modelIndex}`,
    kind: "model",
    section: "substation",
    columns: ["idx", "name", "idv"],
    params: {
      idx: String(modelIndex),
      name: String(input.project.name ?? "").trim() || "默认厂站",
      idv: deriveSubstationIdv(input.project, modelRecords)
    }
  })));
  records.push(...buildMultiModelGlobalLineRecords(globalLineOccurrences, globalLineRecords, records, options));

  const firstProject = orderedInputs[0]?.project;
  const aggregateProject: ProjectFile = {
    version: 1,
    name: "全网拓扑",
    idx: 0,
    modelType: "其他",
    powerUnit: firstProject?.powerUnit,
    voltageUnit: firstProject?.voltageUnit,
    currentUnit: firstProject?.currentUnit,
    powerBaseValue: firstProject?.powerBaseValue,
    nodes: [],
    edges: []
  };
  return {
    filename: "全网拓扑.e",
    text: buildEDeviceParameterFileFromRecords(aggregateProject, ["全网拓扑"], options, records, true),
    mime: "text/plain",
    warnings
  };
}

// 元件定义 E 文件：每个元件一个 section，标签=英文名（带属性），@ 字段行 + // 注释行，无 # 数据行
export type EDeviceDefinitionField = {
  sourceName?: string;
  exportEnabled?: boolean;
  exportName: string;
  cnName: string;
};

export type EDeviceDefinitionSection = {
  kind: string;
  label: string;
  categoryLibrary: string;
  componentLibrary: string;
  originalComponentLibrary?: string;
  derivedFromComponentLibrary?: string;
  isDerivedComponentLibrary?: boolean;
  isContainerComponentLibrary?: boolean;
  exportEnabled?: boolean;
  tableId?: string;
  fields: EDeviceDefinitionField[];
};

function escapeEDefinitionAttr(value: string): string {
  return String(value ?? "").replace(/"/g, "'");
}

function formatEDeviceDefinitionSection(section: EDeviceDefinitionSection): string {
  const enabledFields = section.fields.filter((field) => field.exportEnabled !== false);
  const columns = enabledFields.map((field) => field.exportName);
  const comments = enabledFields.map((field) => field.cnName);
  const widths = columns.map((_, index) =>
    Math.max(eFileCellDisplayWidth(columns[index]), eFileCellDisplayWidth(comments[index]))
  );
  const fieldRow = ["@", ...columns.map((cell, index) => eFilePadCell(cell, widths[index]))]
    .join(E_FILE_COLUMN_GAP)
    .trimEnd();
  const commentRow = ["//", ...comments.map((cell, index) => eFilePadCell(cell, widths[index]))]
    .join(E_FILE_COLUMN_GAP)
    .trimEnd();
  const libraryAttr = section.originalComponentLibrary ? ` 类="${escapeEDefinitionAttr(section.originalComponentLibrary)}"` : "";
  const derivedAttr = section.isDerivedComponentLibrary ? ` 是否派生新类="是"` : "";
  const derivedBaseAttr = section.derivedFromComponentLibrary ? ` 派生基类="${escapeEDefinitionAttr(section.derivedFromComponentLibrary)}"` : "";
  const containerAttr = section.isContainerComponentLibrary ? ` 是否容器="是"` : "";
  const classExportAttr = section.exportEnabled === false ? ` 是否导出="否"` : "";
  const interfaceConfig = section.fields.some((field) => Boolean(field.sourceName))
    ? encodeURIComponent(JSON.stringify(section.fields.map((field) => ({
        sourceName: String(field.sourceName ?? field.exportName).trim(),
        cnName: String(field.cnName ?? field.sourceName ?? field.exportName).trim(),
        exportEnabled: field.exportEnabled !== false,
        exportName: String(field.exportName ?? field.sourceName ?? "").trim()
      }))))
    : "";
  const interfaceConfigAttr = interfaceConfig ? ` 接口配置="${interfaceConfig}"` : "";
  const attrs = `中文名="${escapeEDefinitionAttr(section.label)}" 类别库="${escapeEDefinitionAttr(section.categoryLibrary)}"${libraryAttr}${derivedAttr}${derivedBaseAttr}${containerAttr}${classExportAttr}${interfaceConfigAttr}`;
  return [`<${section.kind} ${attrs}>`, fieldRow, commentRow, `</${section.kind}>`].join("\n");
}

function matchEDefinitionAttr(attrText: string, key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attrText.match(new RegExp(`(?:^|\\s)${escapedKey}="([^"]*)"`));
  return match ? match[1] : "";
}

function eDefinitionAttrIsYes(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "是" || normalized === "1" || normalized === "true" || normalized === "yes";
}

function splitEDefinitionCells(line: string): string[] {
  return line.split(/\s{2,}|\|/).map((cell) => cell.trim()).filter((cell) => cell.length > 0);
}

export function buildEDeviceDefinitionFile(
  templates: DeviceTemplate[],
  labels?: Record<string, string>,
  eDeviceDefinitionLabels?: Record<string, string>,
  eDeviceDefinitionClassExportEnabled?: Record<string, boolean>
): TextFileExport {
  // 按类（E section）分组：同类的所有图元合并为一个 section，字段取勾选导出的并集
  type EDeviceDefinitionGroup = {
    categoryLibrary: string;
    label: string;
    derivedFromComponentLibrary?: string;
    isDerivedComponentLibrary?: boolean;
    isContainerComponentLibrary?: boolean;
    fields: Map<string, string[]>;
  };
  const groups = new Map<string, EDeviceDefinitionGroup>();
  const ensureGroup = (
    componentLibrary: string,
    options: Partial<Omit<EDeviceDefinitionGroup, "fields">> = {}
  ): EDeviceDefinitionGroup => {
    let group = groups.get(componentLibrary);

    if (!group) {
      group = {
        categoryLibrary: options.categoryLibrary ?? "",
        label: options.label ?? "",
        derivedFromComponentLibrary: options.derivedFromComponentLibrary,
        isDerivedComponentLibrary: options.isDerivedComponentLibrary,
        isContainerComponentLibrary: options.isContainerComponentLibrary,
        fields: new Map()
      };
      groups.set(componentLibrary, group);
      return group;
    }
    if (!group.categoryLibrary && options.categoryLibrary) {
      group.categoryLibrary = options.categoryLibrary;
    }
    if (!group.label && options.label) {
      group.label = options.label;
    }
    if (!group.derivedFromComponentLibrary && options.derivedFromComponentLibrary) {
      group.derivedFromComponentLibrary = options.derivedFromComponentLibrary;
    }
    if (options.isDerivedComponentLibrary !== undefined) {
      group.isDerivedComponentLibrary = options.isDerivedComponentLibrary;
    }
    if (options.isContainerComponentLibrary !== undefined) {
      group.isContainerComponentLibrary = options.isContainerComponentLibrary;
    }
    return group;
  };
  const appendGroupField = (group: EDeviceDefinitionGroup, exportName: string, cnName: string) => {
    const normalizedExportName = exportName.trim();
    if (!normalizedExportName) {
      return;
    }
    let cnNames = group.fields.get(normalizedExportName);
    if (!cnNames) {
      cnNames = [];
      group.fields.set(normalizedExportName, cnNames);
    }
    const normalizedCnName = cnName.trim();
    if (normalizedCnName && !cnNames.includes(normalizedCnName)) {
      cnNames.push(normalizedCnName);
    }
  };
  for (const template of templates) {
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    const componentLibrary = derivedInfo?.componentLibrary ?? inferESection(template.kind, template.params ?? {});
    if (!componentLibrary) {
      continue;
    }
    const definitionParams = derivedInfo
      ? { ...(template.params ?? {}), component_type: componentLibrary }
      : template.params ?? {};
    // 无 parameterDefinitions 的图元（如 ac-source）按 E 分区推导内置列参数，避免整类丢失
    const definitionGroups = resolveEffectiveTemplateParameterDefinitionGroups(template, templates);
    const definitions = derivedInfo ? definitionGroups.baseDefinitions : definitionGroups.derivedDefinitions;
    const derivedFields = derivedInfo
      ? resolveDerivedComponentParameterFields(
          template.kind,
          template.params ?? {},
          definitionGroups.derivedDefinitions,
          derivedInfo.baseComponentLibrary,
          derivedInfo.derivedComponentLibrary
        )
      : [];
    const derivedFieldNames = new Set(
      derivedFields.flatMap((field) => [field.sourceName, field.exportName])
    );
    const group = ensureGroup(componentLibrary, {
      categoryLibrary: derivedInfo?.categoryLibrary ?? template.categoryLibrary ?? ""
    });
    for (const definition of definitions) {
      const settings = resolveDeviceParameterDefinitionExportSettings(template.kind, definitionParams, definition);
      if (!settings.exportEnabled) {
        continue;
      }
      const exportName = (settings.exportName || definition.enName).trim();
      if (!exportName) {
        continue;
      }
      if (derivedInfo && (derivedFieldNames.has(definition.enName) || derivedFieldNames.has(exportName))) {
        continue;
      }
      const rawCnName = (definition.cnName ?? "").trim();
      // cnName 为英文 key 时用 labels 转中文（与 UI PARAM_LABELS 一致）
      const cnName = (rawCnName === exportName && labels?.[exportName]) ? labels[exportName] : rawCnName;
      appendGroupField(group, exportName, cnName);
    }
    if (derivedInfo) {
      const derivedGroup = ensureGroup(derivedInfo.derivedComponentLibrary, {
        categoryLibrary: derivedInfo.categoryLibrary || template.categoryLibrary || "",
        label: derivedInfo.label || (ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[derivedInfo.derivedComponentLibrary] ?? derivedInfo.derivedComponentLibrary),
        derivedFromComponentLibrary: derivedInfo.baseComponentLibrary,
        isDerivedComponentLibrary: true,
        isContainerComponentLibrary: false
      });
      appendGroupField(derivedGroup, derivedComponentBaseRelationKey(derivedInfo.baseComponentLibrary), "原类关联idx");
      for (const field of derivedFields) {
        const rawCnName = (field.definition?.cnName ?? "").trim();
        const cnName = (rawCnName === field.exportName && labels?.[field.exportName]) ? labels[field.exportName] : rawCnName;
        appendGroupField(derivedGroup, field.exportName, cnName || field.exportName);
      }
    }
  }

  const sections: EDeviceDefinitionSection[] = [];
  for (const [componentLibrary, group] of groups) {
    if (eDeviceDefinitionClassExportEnabled?.[componentLibrary] === false) {
      continue;
    }
    const hasExportedBusinessField = Array.from(group.fields.keys()).some((exportName) => (
      !["idx", "name", "parent", "dev_type"].includes(exportName)
    ));
    if (!hasExportedBusinessField) {
      continue;
    }
    // 字段顺序：基类固定为 idx/name/parent/dev_type；派生类只保留 idx、原类关联字段和个性化字段
    const fields: EDeviceDefinitionField[] = [];
    // E 文件固定标准列的中文名映射（不取图元 cnName 并集，避免混入英文 key）
    const fixedCnName: Record<string, string> = {
      idx: "序号",
      name: "名称",
      parent: "所属模型",
      dev_type: "设备类型",
      node: "节点",
      i_node: "首节点",
      j_node: "末节点",
      status: "运行状态",
      run_stat: "工作状态（0:停运，1:运行）"
    };
    fields.push({ exportName: "idx", cnName: fixedCnName.idx });
    if (!group.isDerivedComponentLibrary) {
      fields.push({ exportName: "name", cnName: fixedCnName.name });
      fields.push({ exportName: "parent", cnName: fixedCnName.parent });
      fields.push({ exportName: "dev_type", cnName: fixedCnName.dev_type });
    }
    for (const [exportName, cnNames] of group.fields) {
      if (
        exportName === "idx" ||
        exportName === "name" ||
        exportName === "parent" ||
        exportName === "dev_type" ||
        (group.isDerivedComponentLibrary && DERIVED_COMPONENT_COMMON_PARAM_NAMES.has(exportName))
      ) {
        continue;
      }
      if (fixedCnName[exportName]) {
        fields.push({ exportName, cnName: fixedCnName[exportName] });
        continue;
      }
      // 过滤掉与 enName 相同的英文 key，只保留真正的中文名；全被过滤则回退到字段名
      const meaningfulCnNames = cnNames.filter((cnName) => cnName && cnName !== exportName);
      fields.push({ exportName, cnName: meaningfulCnNames.length > 0 ? meaningfulCnNames.join("/") : exportName });
    }
    const eLabel = eDeviceDefinitionLabels?.[componentLibrary]?.trim();
    sections.push({
      kind: eLabel || componentLibrary,
      label: group.label || (ELEMENT_TREE_COMPONENT_LIBRARY_LABELS[componentLibrary] ?? componentLibrary),
      categoryLibrary: group.categoryLibrary,
      componentLibrary,
      originalComponentLibrary: eLabel && eLabel !== componentLibrary ? componentLibrary : undefined,
      derivedFromComponentLibrary: group.derivedFromComponentLibrary,
      isDerivedComponentLibrary: group.isDerivedComponentLibrary,
      isContainerComponentLibrary: group.isContainerComponentLibrary,
      fields
    });
  }
  const text = sections.length > 0
    ? sections.map(formatEDeviceDefinitionSection).join("\n\n") + "\n"
    : "";
  return {
    filename: "图元E文件定义.e",
    text,
    mime: "text/plain"
  };
}

export function buildEDeviceDefinitionFileFromInterfaceDefinitions(
  definitions: readonly EFileInterfaceSectionDefinition[] = []
): TextFileExport {
  const fixedFieldNames = new Set(["idx", "name", "parent", "dev_type"]);
  const sections = (definitions ?? []).flatMap((definition): EDeviceDefinitionSection[] => {
    const componentLibrary = String(definition.componentLibrary ?? "").trim();
    const kind = String(definition.exportName ?? componentLibrary).trim() || componentLibrary;
    const fields = (definition.fields ?? []).flatMap((field): EDeviceDefinitionField[] => {
      const sourceName = normalizeEInterfaceFieldName(componentLibrary, field.sourceName);
      const exportName = normalizeEInterfaceFieldName(componentLibrary, field.exportName ?? sourceName);
      if (!sourceName || !exportName) {
        return [];
      }
      if (
        definition.isDerivedComponentLibrary &&
        (DERIVED_COMPONENT_BASE_ONLY_FIELD_NAMES.has(sourceName.toLowerCase()) ||
          DERIVED_COMPONENT_BASE_ONLY_FIELD_NAMES.has(exportName.toLowerCase()))
      ) {
        return [];
      }
      return [{
        sourceName,
        cnName: String(field.cnName ?? sourceName).trim() || sourceName,
        exportEnabled: field.exportEnabled !== false,
        exportName
      }];
    });
    const hasExportedBusinessField = fields.some((field) => (
      field.exportEnabled !== false && !fixedFieldNames.has(field.exportName)
    ));
    if (!componentLibrary || definition.exportEnabled === false || !hasExportedBusinessField) {
      return [];
    }
    return [{
      kind,
      label: String(definition.label ?? componentLibrary).trim() || componentLibrary,
      categoryLibrary: String(definition.categoryLibrary ?? "").trim(),
      componentLibrary,
      originalComponentLibrary: kind !== componentLibrary ? componentLibrary : undefined,
      derivedFromComponentLibrary: definition.derivedFromComponentLibrary,
      isDerivedComponentLibrary: Boolean(definition.isDerivedComponentLibrary),
      isContainerComponentLibrary: Boolean(definition.isContainerComponentLibrary),
      exportEnabled: true,
      fields
    }];
  });
  return {
    filename: "图元E文件定义.e",
    text: sections.length > 0 ? `${sections.map(formatEDeviceDefinitionSection).join("\n\n")}\n` : "",
    mime: "text/plain"

  };
}

export function parseEDeviceDefinitionFile(text: string): EDeviceDefinitionSection[] {
  const sections: EDeviceDefinitionSection[] = [];
  const sectionRegex = /<(\S+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(text)) !== null) {
    const kind = match[1];
    const attrText = match[2];
    const body = match[3];
    const exportNames: string[] = [];
    const cnNames: string[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("@")) {
        exportNames.push(...splitEDefinitionCells(line.slice(1)));
      } else if (line.startsWith("//")) {
        cnNames.push(...splitEDefinitionCells(line.slice(2)));
      }
    }
    const interfaceConfigAttr = matchEDefinitionAttr(attrText, "接口配置");
    let fields: EDeviceDefinitionField[] = [];
    if (interfaceConfigAttr) {
      try {
        const configuredFields = JSON.parse(decodeURIComponent(interfaceConfigAttr));
        if (Array.isArray(configuredFields)) {
          fields = configuredFields.flatMap((field): EDeviceDefinitionField[] => {
            if (!field || typeof field !== "object") {
              return [];
            }
            const sourceName = normalizeGasQuantityFieldName(field.sourceName);
            const exportName = normalizeGasQuantityFieldName(field.exportName ?? sourceName);
            if (!sourceName || !exportName) {
              return [];
            }
            return [{
              sourceName,
              cnName: String(field.cnName ?? sourceName).trim() || sourceName,
              exportEnabled: field.exportEnabled !== false,
              exportName
            }];
          });
        }
      } catch {
        fields = [];
      }
    }
    if (fields.length === 0) {
      const count = Math.max(exportNames.length, cnNames.length);
      for (let index = 0; index < count; index += 1) {
        fields.push({
          exportName: normalizeGasQuantityFieldName(exportNames[index]),
          cnName: cnNames[index] ?? ""
        });
      }
    }
    const legacyClassAttributeName = ["元件", "库"].join("");
    const componentLibraryAttr =
      matchEDefinitionAttr(attrText, "类")
      || matchEDefinitionAttr(attrText, legacyClassAttributeName);
    const derivedAttr = matchEDefinitionAttr(attrText, "是否派生新类");
    const containerAttr = matchEDefinitionAttr(attrText, "是否容器");
    const exportEnabledAttr = matchEDefinitionAttr(attrText, "是否导出");

    // 支持 + 号分割的多对一映射（如 "双绕组变压器+三绕组变压器" → 同一个 exportName）
    const componentLibraryParts = componentLibraryAttr.includes("+")
      ? componentLibraryAttr.split("+").map((part) => part.trim()).filter(Boolean)
      : [componentLibraryAttr];

    for (const part of componentLibraryParts) {
      // 如果类是中文名，反向映射为英文类名
      const resolvedComponentLibrary = part ? (COMPONENT_LIBRARY_REVERSE_MAPPING[part] ?? part) : kind;
      const normalizedFields = fields.map((field) => ({
        ...field,
        ...(field.sourceName !== undefined
          ? { sourceName: normalizeEInterfaceFieldName(resolvedComponentLibrary, field.sourceName) }
          : {}),
        exportName: normalizeEInterfaceFieldName(resolvedComponentLibrary, field.exportName)
      }));
      sections.push({
        kind,
        label: matchEDefinitionAttr(attrText, "中文名"),
        categoryLibrary: matchEDefinitionAttr(attrText, "类别库"),
        componentLibrary: resolvedComponentLibrary,
        originalComponentLibrary: part && resolvedComponentLibrary !== part ? part : undefined,
        derivedFromComponentLibrary: matchEDefinitionAttr(attrText, "派生基类") || undefined,
        isDerivedComponentLibrary: derivedAttr ? eDefinitionAttrIsYes(derivedAttr) : undefined,
        isContainerComponentLibrary: containerAttr ? eDefinitionAttrIsYes(containerAttr) : undefined,
        exportEnabled: exportEnabledAttr ? eDefinitionAttrIsYes(exportEnabledAttr) : true,
        tableId: matchEDefinitionAttr(attrText, "表号") || undefined,
        fields: normalizedFields
      });
    }
  }
  return sections;
}
