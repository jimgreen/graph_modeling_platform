import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_POWER_UNIT,
  DEFAULT_VOLTAGE_UNIT,
  buildModelAssociationProjectIndexes,
  calculateElectricalTopology,
  isBlockingTopologyValidationError,
  modelAssociationModelTypeForKind,
  normalizeDeviceOperatingLimitsAfterTopology,
  routableLineDeviceEndpointRefs,
  validateTopology,
  validateVoltageSetpointDeviations,
  type ModelNode,
  type ModelAssociationProjectIndexes,
  type ModelType,
  type SavedProjectRecord,
  type SavedSchemeRecord,
  type TopologyValidationError
} from "./model";
import {
  GLOBAL_LINE_ID_PARAM,
  GLOBAL_LINE_MODEL_PAIR_PARAM,
  globalLineEndpointReference,
  globalLineEnergyTypeForNode,
  globalLineModelKey,
  type GlobalLineEndpoint,
  type GlobalLineRecord,
  type GlobalLineReference
} from "./global-lines";

export type AllNetworkTopologyModelType = Extract<ModelType, "厂站" | "馈线" | "台区">;

export type AllNetworkTopologyReferenceModel = {
  projectId: string;
  schemeId: string;
  schemePath: string[];
  name: string;
  idx: number;
  modelType: ModelType | "";
  record: SavedProjectRecord;
};

export type AllNetworkTopologyModel = Omit<AllNetworkTopologyReferenceModel, "modelType"> & {
  modelType: AllNetworkTopologyModelType;
};

export type AllNetworkTopologyAlert = {
  id: string;
  projectId: string;
  schemeId: string;
  modelName: string;
  deviceName: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  relatedNodeIds: string[];
  topologyError?: TopologyValidationError;
};

export type AllNetworkTopologyResult = {
  errors: AllNetworkTopologyAlert[];
  warnings: AllNetworkTopologyAlert[];
};

const ALL_NETWORK_MODEL_TYPES = new Set<AllNetworkTopologyModelType>(["厂站", "馈线", "台区"]);

function normalizedModelIndex(value: unknown) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : 0;
}

export function collectAllNetworkTopologyReferenceModels(
  schemes: readonly SavedSchemeRecord[]
): AllNetworkTopologyReferenceModel[] {
  const models: AllNetworkTopologyReferenceModel[] = [];
  const visit = (items: readonly SavedSchemeRecord[], parentPath: readonly string[]) => {
    for (const scheme of items) {
      const schemePath = [...parentPath, scheme.name];
      for (const record of scheme.projects ?? []) {
        const modelType = String(record.project?.modelType ?? "").trim() as ModelType | "";
        models.push({
          projectId: record.id,
          schemeId: scheme.id,
          schemePath,
          name: record.name || record.project.name,
          idx: normalizedModelIndex(record.project.idx),
          modelType,
          record
        });
      }
      visit(scheme.children ?? [], schemePath);
    }
  };
  visit(schemes, []);
  return models.sort((left, right) =>
    (left.idx || Number.MAX_SAFE_INTEGER) - (right.idx || Number.MAX_SAFE_INTEGER) ||
    left.name.localeCompare(right.name, "zh-CN") ||
    left.projectId.localeCompare(right.projectId)
  );
}

export function collectAllNetworkTopologyModels(schemes: readonly SavedSchemeRecord[]): AllNetworkTopologyModel[] {
  return collectAllNetworkTopologyReferenceModels(schemes).filter(
    (model): model is AllNetworkTopologyModel =>
      ALL_NETWORK_MODEL_TYPES.has(model.modelType as AllNetworkTopologyModelType)
  );
}

export function defaultAllNetworkTopologySelection(models: readonly AllNetworkTopologyModel[]): string[] {
  return models.map((model) => model.projectId);
}

function globalLineReferenceMatchesModel(
  reference: GlobalLineReference,
  model: AllNetworkTopologyReferenceModel
): boolean {
  if (reference.modelKey === globalLineModelKey(model.idx, model.schemePath, model.name)) {
    return true;
  }
  if (reference.projectIdx && reference.projectIdx === model.idx) {
    return true;
  }
  return Boolean(
    reference.projectName &&
    reference.projectName === model.name &&
    JSON.stringify(reference.schemePath) === JSON.stringify(model.schemePath)
  );
}

export function modelForGlobalLineReference(
  reference: GlobalLineReference | null,
  models: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyReferenceModel | undefined {
  return reference
    ? models.find((model) => globalLineReferenceMatchesModel(reference, model))
    : undefined;
}

export function referencedModelsForGlobalLines(
  records: readonly GlobalLineRecord[],
  models: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyReferenceModel[] {
  const references = records.flatMap((record) => record.references);
  return models.filter((model) => references.some((reference) => (
    globalLineReferenceMatchesModel(reference, model)
  )));
}

function globalLineEndpointLabel(endpoint: GlobalLineEndpoint) {
  return endpoint === "source" ? "首端" : "末端";
}

function normalizedGlobalLineReferenceEndpoint(reference: GlobalLineReference): GlobalLineEndpoint | "" {
  if (reference.boundaryEndpoint === "source" || reference.boundaryEndpoint === "target") {
    return reference.boundaryEndpoint;
  }
  if (reference.terminalSlot === "i") return "source";
  if (reference.terminalSlot === "j") return "target";
  return "";
}

type GlobalLineEndpointModelIdentity = {
  projectIdx: number;
  modelKey: string;
  label: string;
  endpointNodeExists: boolean;
};

function globalLineReferenceModelIdentityLabel(reference: GlobalLineReference): string {
  const projectIdx = normalizedModelIndex(reference.projectIdx);
  return projectIdx > 0 ? `model_id=${projectIdx}` : reference.modelKey || "未定义模型";
}

function globalLineEndpointModelIdentity(
  line: ModelNode,
  endpoint: GlobalLineEndpoint,
  model: AllNetworkTopologyReferenceModel
): GlobalLineEndpointModelIdentity | null {
  const endpointRef = routableLineDeviceEndpointRefs(line)[endpoint];
  if (!endpointRef) return null;
  const endpointNode = model.record.project.nodes.find((node) => node.id === endpointRef.nodeId);
  if (!endpointNode) {
    return {
      projectIdx: 0,
      modelKey: "",
      label: `端点设备不存在（nodeId=${endpointRef.nodeId}）`,
      endpointNodeExists: false
    };
  }
  if (modelAssociationModelTypeForKind(endpointNode.kind)) {
    const projectIdx = normalizedModelIndex(endpointNode.params.model_id);
    return {
      projectIdx,
      modelKey: projectIdx > 0 ? globalLineModelKey(projectIdx, [], "") : "",
      label: projectIdx > 0 ? `model_id=${projectIdx}` : "未定义model_id",
      endpointNodeExists: true
    };
  }
  return {
    projectIdx: model.idx,
    modelKey: globalLineModelKey(model.idx, model.schemePath, model.name),
    label: model.idx > 0 ? `model_id=${model.idx}` : globalLineModelKey(model.idx, model.schemePath, model.name),
    endpointNodeExists: true
  };
}

function globalLineReferenceMatchesEndpointModelIdentity(
  reference: GlobalLineReference,
  identity: GlobalLineEndpointModelIdentity
): boolean {
  const referenceProjectIdx = normalizedModelIndex(reference.projectIdx);
  if (identity.projectIdx > 0) {
    return referenceProjectIdx > 0
      ? referenceProjectIdx === identity.projectIdx
      : reference.modelKey === identity.modelKey;
  }
  return Boolean(identity.modelKey) && reference.modelKey === identity.modelKey;
}

function globalLineDefinitionDifferences(
  record: GlobalLineRecord,
  reference: GlobalLineReference,
  endpoint: GlobalLineEndpoint,
  model: AllNetworkTopologyReferenceModel
): string[] {
  const matchingLines = model.record.project.nodes.filter((node) => (
    String(node.params[GLOBAL_LINE_ID_PARAM] ?? "").trim() === record.id
  ));
  if (matchingLines.length === 0) {
    return [`模型文件中缺少全局线路ID=${record.id}的线路记录`];
  }
  const line = matchingLines.find((node) => node.id === reference.nodeId) ?? matchingLines[0];
  const differences: string[] = [];
  if (matchingLines.length > 1) {
    differences.push(`模型文件中同一全局线路存在${matchingLines.length}条线路记录`);
  }
  const modelGlobalLineId = String(line.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
  if (modelGlobalLineId !== record.id) {
    differences.push(`全局线路ID不一致（模型=${modelGlobalLineId || "空"}，全局=${record.id}）`);
  }
  const modelEnergyType = globalLineEnergyTypeForNode(line);
  if (modelEnergyType !== record.energyType) {
    differences.push(`能源类型不一致（模型=${modelEnergyType || "未知"}，全局=${record.energyType}）`);
  }
  // 名称和全局业务参数只存在于全局线路表，不参与模型文件一致性判断。
  // 模型文件持久化设备 idx；加载后的运行态节点再补充 _globalLineId 以兼容交互流程。
  const modelIndex = String(line.params.idx ?? "").trim();
  if (modelIndex !== String(record.idx)) {
    differences.push(`idx不一致（模型=${modelIndex || "空"}，全局=${record.idx}）`);
  }
  const modelEndpoint = routableLineDeviceEndpointRefs(line)[endpoint];
  const referenceEndpoint = normalizedGlobalLineReferenceEndpoint(reference);
  if (referenceEndpoint !== endpoint) {
    differences.push(`首末端方向不一致（模型检查=${globalLineEndpointLabel(endpoint)}，全局引用=${referenceEndpoint ? globalLineEndpointLabel(referenceEndpoint) : "未定义"}）`);
  }
  if (!modelEndpoint) {
    differences.push(`模型文件中的${globalLineEndpointLabel(endpoint)}连接定义缺失`);
  } else {
    const endpointModelIdentity = globalLineEndpointModelIdentity(line, endpoint, model);
    if (endpointModelIdentity && !endpointModelIdentity.endpointNodeExists) {
      differences.push(endpointModelIdentity.label);
    } else if (
      endpointModelIdentity &&
      !globalLineReferenceMatchesEndpointModelIdentity(reference, endpointModelIdentity)
    ) {
      differences.push(
        `端点所在模型ID不一致（模型=${endpointModelIdentity.label}，全局=${globalLineReferenceModelIdentityLabel(reference)}）`
      );
    }
  }
  return differences;
}

function globalLineTopologyAlert(
  record: GlobalLineRecord,
  endpoint: GlobalLineEndpoint,
  kind: "missing-endpoint" | "missing-model" | "definition-mismatch",
  message: string,
  model?: AllNetworkTopologyReferenceModel,
  reference?: GlobalLineReference | null
): AllNetworkTopologyAlert {
  return {
    id: `global-line:${record.id}:${kind}:${endpoint}`,
    projectId: model?.projectId ?? "",
    schemeId: model?.schemeId ?? "",
    modelName: model?.name || reference?.projectName || "全局线路注册表",
    deviceName: record.name || record.id,
    message,
    ...(reference?.nodeId ? { nodeId: reference.nodeId } : {}),
    relatedNodeIds: reference?.nodeId ? [reference.nodeId] : []
  };
}

export function analyzeGlobalLinesForAllNetworkTopology(
  records: readonly GlobalLineRecord[],
  models: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyResult {
  const errors: AllNetworkTopologyAlert[] = [];
  const warnings: AllNetworkTopologyAlert[] = [];
  const orderedRecords = [...records].sort((left, right) => (
    left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN") || left.id.localeCompare(right.id)
  ));
  for (const record of orderedRecords) {
    for (const endpoint of ["source", "target"] as const) {
      const reference = globalLineEndpointReference(record, endpoint);
      const endpointLabel = globalLineEndpointLabel(endpoint);
      if (!reference) {
        const oppositeEndpoint = endpoint === "source" ? "target" : "source";
        const oppositeReference = globalLineEndpointReference(record, oppositeEndpoint);
        const oppositeModel = modelForGlobalLineReference(oppositeReference, models);
        warnings.push(globalLineTopologyAlert(
          record,
          endpoint,
          "missing-endpoint",
          `全局线路“${record.name}”的${endpointLabel}为空，请补充该端关联。`,
          oppositeModel,
          oppositeReference
        ));
        continue;
      }
      const model = modelForGlobalLineReference(reference, models);
      if (!model) {
        warnings.push(globalLineTopologyAlert(
          record,
          endpoint,
          "missing-model",
          `全局线路“${record.name}”的${endpointLabel}对应模型“${reference.projectName || reference.modelKey}”的模型文件不存在。`,
          undefined,
          reference
        ));
        continue;
      }
      const differences = globalLineDefinitionDifferences(record, reference, endpoint, model);
      if (differences.length > 0) {
        errors.push(globalLineTopologyAlert(
          record,
          endpoint,
          "definition-mismatch",
          `全局线路“${record.name}”的${endpointLabel}在模型文件“${model.name}”中的定义与全局线路定义不一致：${differences.join("；")}。`,
          model,
          reference
        ));
      }
    }
  }
  return { errors, warnings };
}

type GlobalLineModelOccurrence = {
  model: AllNetworkTopologyReferenceModel;
  line: ModelNode;
  globalLineId: string;
  declaredEndpoint: GlobalLineEndpoint | "";
};

function oppositeGlobalLineEndpoint(endpoint: GlobalLineEndpoint): GlobalLineEndpoint {
  return endpoint === "source" ? "target" : "source";
}

function declaredGlobalLineEndpointForModelLine(line: ModelNode): GlobalLineEndpoint | "" {
  const pairMode = String(line.params[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
  if (pairMode === "source") return "target";
  if (pairMode === "target") return "source";
  return "";
}

function globalLineModelOccurrenceAlert(
  occurrence: GlobalLineModelOccurrence,
  id: string,
  message: string
): AllNetworkTopologyAlert {
  return {
    id,
    projectId: occurrence.model.projectId,
    schemeId: occurrence.model.schemeId,
    modelName: occurrence.model.name,
    deviceName: occurrence.line.name || occurrence.line.id,
    message,
    nodeId: occurrence.line.id,
    relatedNodeIds: [occurrence.line.id]
  };
}

function globalLineModelOccurrences(
  models: readonly AllNetworkTopologyReferenceModel[]
): GlobalLineModelOccurrence[] {
  return models.flatMap((model) => model.record.project.nodes.flatMap((line) => {
    const globalLineId = String(line.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
    if (!globalLineId || !globalLineEnergyTypeForNode(line)) return [];
    return [{
      model,
      line,
      globalLineId,
      declaredEndpoint: declaredGlobalLineEndpointForModelLine(line)
    }];
  }));
}

function setPreferLocatableAlert(
  alerts: Map<string, AllNetworkTopologyAlert>,
  alert: AllNetworkTopologyAlert
) {
  const current = alerts.get(alert.id);
  if (!current || (!current.projectId && alert.projectId) || (!current.nodeId && alert.nodeId)) {
    alerts.set(alert.id, alert);
  }
}

/**
 * Checks the global-line registry in both directions: registry -> model files,
 * then every managed model line -> registry and the opposite endpoint model.
 */
export function analyzeGlobalLineConsistency(
  records: readonly GlobalLineRecord[],
  models: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyResult {
  const forward = analyzeGlobalLinesForAllNetworkTopology(records, models);
  const errors = new Map(forward.errors.map((alert) => [alert.id, alert]));
  const warnings = new Map(forward.warnings.map((alert) => [alert.id, alert]));
  const recordById = new Map(records.map((record) => [record.id, record]));
  const occurrences = globalLineModelOccurrences(models);

  for (const occurrence of occurrences) {
    const record = recordById.get(occurrence.globalLineId);
    if (!record) {
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${occurrence.globalLineId}:missing-record:${occurrence.model.projectId}:${occurrence.line.id}`,
        `模型“${occurrence.model.name}”中的线路“${occurrence.line.name || occurrence.line.id}”定义了全局线路ID“${occurrence.globalLineId}”，但全局线路表中不存在对应记录。`
      );
      errors.set(alert.id, alert);
      continue;
    }

    const references = (["source", "target"] as const).map((endpoint) => ({
      endpoint,
      reference: globalLineEndpointReference(record, endpoint)
    }));
    const modelEndpoints = references
      .filter(({ reference }) => Boolean(reference && globalLineReferenceMatchesModel(reference, occurrence.model)))
      .map(({ endpoint }) => endpoint);
    if (modelEndpoints.length === 0) {
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${record.id}:model-unreferenced:${occurrence.model.projectId}:${occurrence.line.id}`,
        `模型“${occurrence.model.name}”中的全局线路“${occurrence.line.name || occurrence.line.id}”未作为首端或末端引用登记在全局线路表中。`
      );
      errors.set(alert.id, alert);
    } else if (modelEndpoints.length > 1) {
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${record.id}:model-double-endpoint:${occurrence.model.projectId}:${occurrence.line.id}`,
        `模型“${occurrence.model.name}”中的同一条全局线路同时被全局线路表登记为首端和末端。`
      );
      errors.set(alert.id, alert);
    }

    if (
      occurrence.declaredEndpoint &&
      modelEndpoints.length > 0 &&
      !modelEndpoints.includes(occurrence.declaredEndpoint)
    ) {
      const actualLabels = modelEndpoints.map(globalLineEndpointLabel).join("、");
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${record.id}:model-direction-mismatch:${occurrence.model.projectId}:${occurrence.line.id}`,
        `模型“${occurrence.model.name}”中的线路声明自身属于${globalLineEndpointLabel(occurrence.declaredEndpoint)}，但全局线路表登记为${actualLabels}，首末端角色与全局线路表不一致。`
      );
      errors.set(alert.id, alert);
    }

    const currentEndpoint = modelEndpoints.length === 1
      ? modelEndpoints[0]
      : occurrence.declaredEndpoint;
    if (!currentEndpoint) continue;
    const otherEndpoint = oppositeGlobalLineEndpoint(currentEndpoint);
    const otherReference = globalLineEndpointReference(record, otherEndpoint);
    if (!otherReference) {
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${record.id}:missing-endpoint:${otherEndpoint}`,
        `模型“${occurrence.model.name}”中的全局线路“${record.name}”已登记为${globalLineEndpointLabel(currentEndpoint)}，但另一端${globalLineEndpointLabel(otherEndpoint)}为空。`
      );
      setPreferLocatableAlert(warnings, alert);
      continue;
    }
    const otherModel = modelForGlobalLineReference(otherReference, models);
    if (!otherModel) {
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${record.id}:missing-model:${otherEndpoint}`,
        `模型“${occurrence.model.name}”中的全局线路“${record.name}”所登记的另一端${globalLineEndpointLabel(otherEndpoint)}模型“${otherReference.projectName || otherReference.modelKey}”不存在，或未在厂站/馈线/台区模型列表中定义。`
      );
      setPreferLocatableAlert(warnings, alert);
      continue;
    }
    const otherLine = otherModel.record.project.nodes.find((line) => (
      String(line.params[GLOBAL_LINE_ID_PARAM] ?? "").trim() === record.id &&
      Boolean(globalLineEnergyTypeForNode(line))
    ));
    if (!otherLine) {
      errors.delete(`global-line:${record.id}:definition-mismatch:${otherEndpoint}`);
      const alert = globalLineModelOccurrenceAlert(
        occurrence,
        `global-line:${record.id}:other-model-missing-line:${otherEndpoint}:${occurrence.model.projectId}:${occurrence.line.id}`,
        `全局线路“${record.name}”的另一端模型“${otherModel.name}”中缺少全局线路ID“${record.id}”对应的线路记录。`
      );
      errors.set(alert.id, alert);
    }
  }

  return {
    errors: [...errors.values()],
    warnings: [...warnings.values()]
  };
}

function deviceNameForTopologyError(
  error: TopologyValidationError,
  nodeById: ReadonlyMap<string, ModelNode>,
  edgeById: ReadonlyMap<string, { sourceId: string; targetId: string }>
) {
  const candidateNodeIds = [error.nodeId, ...error.relatedNodeIds].filter(Boolean) as string[];
  for (const nodeId of candidateNodeIds) {
    const node = nodeById.get(nodeId);
    if (node) {
      return node.name || node.id;
    }
  }
  if (error.edgeId) {
    const edge = edgeById.get(error.edgeId);
    if (edge) {
      const sourceName = nodeById.get(edge.sourceId)?.name || edge.sourceId;
      const targetName = nodeById.get(edge.targetId)?.name || edge.targetId;
      return `${sourceName} - ${targetName}`;
    }
    return error.edgeId;
  }
  return "模型";
}

function topologyAlert(
  model: AllNetworkTopologyModel,
  error: TopologyValidationError,
  nodes: readonly ModelNode[]
): AllNetworkTopologyAlert {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(model.record.project.edges.map((edge) => [edge.id, edge]));
  return {
    id: `${model.projectId}:${error.id}`,
    projectId: model.projectId,
    schemeId: model.schemeId,
    modelName: model.name,
    deviceName: deviceNameForTopologyError(error, nodeById, edgeById),
    message: error.message,
    nodeId: error.nodeId,
    edgeId: error.edgeId,
    relatedNodeIds: [...error.relatedNodeIds],
    topologyError: error
  };
}

function topologyErrorsForModel(
  model: AllNetworkTopologyModel,
  modelAssociationProjectIndexes: ModelAssociationProjectIndexes
): AllNetworkTopologyAlert[] {
  const project = model.record.project;
  const calculatedNodes = calculateElectricalTopology(project.nodes, project.edges);
  const initialErrors = validateTopology(calculatedNodes, project.edges, {
    includeVoltageSetpointDeviations: false,
    modelType: project.modelType,
    modelAssociationProjectIndexes
  });
  const invalidVoltageBaseNodeIds = new Set(
    initialErrors
      .filter((error) => [
        "voltage-mismatch",
        "missing-island-voltage",
        "island-voltage-mismatch",
        "transformer-island-short"
      ].includes(error.type))
      .flatMap((error) => error.relatedNodeIds)
  );
  const normalizedLimits = normalizeDeviceOperatingLimitsAfterTopology(calculatedNodes, {
    powerUnit: project.powerUnit ?? DEFAULT_POWER_UNIT,
    voltageUnit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
    currentUnit: project.currentUnit ?? DEFAULT_CURRENT_UNIT,
    skipVoltageNodeIds: invalidVoltageBaseNodeIds,
    sourceNodes: project.nodes
  });
  const errors = [...initialErrors, ...normalizedLimits.warnings];
  if (!errors.some(isBlockingTopologyValidationError)) {
    errors.push(...validateVoltageSetpointDeviations(normalizedLimits.nodes, project.edges));
  }
  return errors.map((error) => topologyAlert(model, error, normalizedLimits.nodes));
}

type HierarchyAssociationOccurrence = {
  parent: AllNetworkTopologyModel;
  child: AllNetworkTopologyReferenceModel;
  node: ModelNode;
};

function hierarchyAssociationTarget(
  node: ModelNode,
  expectedModelType: Extract<AllNetworkTopologyModelType, "馈线" | "台区">,
  availableModels: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyReferenceModel | undefined {
  const associationModelType = modelAssociationModelTypeForKind(node.kind);
  if (associationModelType !== expectedModelType) return undefined;

  const modelIndex = normalizedModelIndex(node.params.model_id);
  const byModelIndex = modelIndex > 0
    ? availableModels.find((model) => model.idx === modelIndex)
    : undefined;
  if (byModelIndex?.modelType === expectedModelType) return byModelIndex;

  return undefined;
}

function hierarchyModelIdentity(model: AllNetworkTopologyReferenceModel) {
  const projectId = String(model.projectId ?? "").trim();
  if (projectId) return `project:${projectId}`;
  if (model.idx > 0) return `model:${model.idx}`;
  return `path:${model.schemePath.join("/")}:${model.name}`;
}

function duplicateHierarchyParentErrors(
  selectedModels: readonly AllNetworkTopologyModel[],
  availableModels: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyAlert[] {
  const occurrencesByChild = new Map<string, Map<string, HierarchyAssociationOccurrence>>();
  for (const parent of selectedModels) {
    const childModelType = parent.modelType === "厂站"
      ? "馈线"
      : parent.modelType === "馈线"
        ? "台区"
        : "";
    if (!childModelType) continue;
    for (const node of parent.record.project.nodes) {
      const child = hierarchyAssociationTarget(node, childModelType, availableModels);
      if (!child) continue;
      const childKey = hierarchyModelIdentity(child);
      const parentKey = hierarchyModelIdentity(parent);
      const parentOccurrences = occurrencesByChild.get(childKey) ?? new Map();
      if (!parentOccurrences.has(parentKey)) {
        parentOccurrences.set(parentKey, { parent, child, node });
        occurrencesByChild.set(childKey, parentOccurrences);
      }
    }
  }

  const errors: AllNetworkTopologyAlert[] = [];
  for (const [childKey, occurrencesByParent] of occurrencesByChild) {
    const occurrences = [...occurrencesByParent.values()].sort((left, right) => (
      left.parent.idx - right.parent.idx ||
      left.parent.name.localeCompare(right.parent.name, "zh-CN") ||
      left.parent.projectId.localeCompare(right.parent.projectId)
    ));
    if (occurrences.length < 2) continue;
    const child = occurrences[0]!.child;
    const parentType = child.modelType === "馈线" ? "厂站" : "馈线";
    const parentNames = occurrences.map(({ parent }) => `“${parent.name}”`).join("、");
    const childIndex = child.idx > 0 ? `（idx=${child.idx}）` : "";
    const message = `${child.modelType}模型“${child.name}”${childIndex}同时出现在多个${parentType}模型中：${parentNames}。同一个${child.modelType}只能归属一个${parentType}，请修正模型关联后重新执行全网拓扑。`;
    for (const { parent, node } of occurrences) {
      errors.push({
        id: `${parent.projectId}:duplicate-hierarchy-parent:${childKey}:${node.id}`,
        projectId: parent.projectId,
        schemeId: parent.schemeId,
        modelName: parent.name,
        deviceName: node.name || child.name,
        message,
        nodeId: node.id,
        relatedNodeIds: [node.id]
      });
    }
  }
  return errors;
}

export function analyzeAllNetworkTopology(
  selectedModels: readonly AllNetworkTopologyModel[],
  availableModels: readonly AllNetworkTopologyReferenceModel[] = selectedModels
): AllNetworkTopologyResult {
  const orderedModels = [...selectedModels].sort((left, right) => left.idx - right.idx);
  const hierarchyErrors = duplicateHierarchyParentErrors(orderedModels, availableModels);
  const modelAssociationProjectIndexes = buildModelAssociationProjectIndexes(availableModels);
  return {
    errors: [
      ...hierarchyErrors,
      ...orderedModels.flatMap((model) => topologyErrorsForModel(model, modelAssociationProjectIndexes))
    ],
    warnings: []
  };
}
