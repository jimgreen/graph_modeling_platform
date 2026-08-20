import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_POWER_UNIT,
  DEFAULT_VOLTAGE_UNIT,
  calculateElectricalTopology,
  equivalentBoundaryModelInteractionType,
  isBlockingTopologyValidationError,
  isModelInteractionNode,
  isRoutableLineDeviceKind,
  modelAssociationModelTypeForKind,
  normalizeDeviceOperatingLimitsAfterTopology,
  routableLineDeviceEndpointRefs,
  validateTopology,
  validateVoltageSetpointDeviations,
  type ModelNode,
  type ModelType,
  type SavedProjectRecord,
  type SavedSchemeRecord,
  type TopologyValidationError
} from "./model";
import {
  GLOBAL_LINE_ID_PARAM,
  globalLineEndpointReference,
  globalLineEnergyTypeForNode,
  globalLineModelKey,
  globalLineSharedParamsFromNode,
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

function differingGlobalLineParamKeys(
  recordParams: Readonly<Record<string, string>>,
  modelParams: Readonly<Record<string, string>>
) {
  return [...new Set([...Object.keys(recordParams), ...Object.keys(modelParams)])]
    .filter((key) => String(recordParams[key] ?? "") !== String(modelParams[key] ?? ""))
    .sort((left, right) => left.localeCompare(right));
}

function globalLineDefinitionDifferences(
  record: GlobalLineRecord,
  reference: GlobalLineReference,
  endpoint: GlobalLineEndpoint,
  model: AllNetworkTopologyReferenceModel
): string[] {
  const line = model.record.project.nodes.find((node) => node.id === reference.nodeId);
  if (!line) {
    return [`模型文件中缺少 nodeId=${reference.nodeId} 的线路记录`];
  }
  const differences: string[] = [];
  const modelGlobalLineId = String(line.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
  if (modelGlobalLineId !== record.id) {
    differences.push(`全局线路ID不一致（模型=${modelGlobalLineId || "空"}，全局=${record.id}）`);
  }
  const modelEnergyType = globalLineEnergyTypeForNode(line);
  if (modelEnergyType !== record.energyType) {
    differences.push(`能源类型不一致（模型=${modelEnergyType || "未知"}，全局=${record.energyType}）`);
  }
  if (line.name !== record.name) {
    differences.push(`名称不一致（模型=${line.name || "空"}，全局=${record.name}）`);
  }
  const modelIndex = String(line.params.idx ?? "").trim();
  if (modelIndex !== String(record.idx)) {
    differences.push(`idx不一致（模型=${modelIndex || "空"}，全局=${record.idx}）`);
  }
  const differingParams = differingGlobalLineParamKeys(
    record.params,
    globalLineSharedParamsFromNode(line)
  );
  if (differingParams.length > 0) {
    differences.push(`共享参数不一致（${differingParams.join("、")}）`);
  }
  const modelEndpoint = routableLineDeviceEndpointRefs(line)[endpoint];
  const referenceEndpoint = normalizedGlobalLineReferenceEndpoint(reference);
  if (referenceEndpoint !== endpoint) {
    differences.push(`首末端方向不一致（模型检查=${globalLineEndpointLabel(endpoint)}，全局引用=${referenceEndpoint ? globalLineEndpointLabel(referenceEndpoint) : "未定义"}）`);
  }
  if (!modelEndpoint) {
    differences.push(`模型文件中的${globalLineEndpointLabel(endpoint)}连接定义缺失`);
  } else {
    if (modelEndpoint.nodeId !== String(reference.boundaryNodeId ?? "")) {
      differences.push(`边界设备不一致（模型=${modelEndpoint.nodeId}，全局=${reference.boundaryNodeId || "空"}）`);
    }
    if (modelEndpoint.terminalId !== String(reference.boundaryTerminalId ?? "")) {
      differences.push(`边界端子不一致（模型=${modelEndpoint.terminalId}，全局=${reference.boundaryTerminalId || "空"}）`);
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

function topologyErrorsForModel(model: AllNetworkTopologyModel): AllNetworkTopologyAlert[] {
  const project = model.record.project;
  const calculatedNodes = calculateElectricalTopology(project.nodes, project.edges);
  const initialErrors = validateTopology(calculatedNodes, project.edges, {
    includeVoltageSetpointDeviations: false,
    modelType: project.modelType
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

function selectedTargetKeys(models: readonly AllNetworkTopologyModel[]) {
  const ids = new Set(models.map((model) => model.projectId).filter(Boolean));
  return { ids };
}

function missingModelWarnings(
  selectedModels: readonly AllNetworkTopologyModel[],
  availableModels: readonly AllNetworkTopologyReferenceModel[]
): AllNetworkTopologyAlert[] {
  const selectedTargets = selectedTargetKeys(selectedModels);
  const availableTargetById = new Map(availableModels.map((model) => [model.projectId, model]));
  const warnings: AllNetworkTopologyAlert[] = [];
  for (const model of selectedModels) {
    const nodes = model.record.project.nodes;
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    for (const line of nodes) {
      if (!isRoutableLineDeviceKind(line.kind)) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(line);
      for (const side of ["source", "target"] as const) {
        const boundaryNode = refs[side] ? nodeById.get(refs[side]!.nodeId) : undefined;
        const equivalentBoundaryType = boundaryNode ? equivalentBoundaryModelInteractionType(boundaryNode) : "";
        const boundaryType = boundaryNode && isModelInteractionNode(boundaryNode)
          ? equivalentBoundaryType || String(boundaryNode.params.modelInteractionType ?? "").trim() || "模型交互"
          : "";
        if (!boundaryNode || !boundaryType) {
          continue;
        }
        const targetProjectId = String(boundaryNode.params.buttonTargetProjectId ?? "").trim();
        const targetProjectName = String(boundaryNode.params.buttonTargetProjectName ?? "").trim();
        const selfReferenced = Boolean(targetProjectId && targetProjectId === model.projectId);
        const selected = Boolean(targetProjectId && selectedTargets.ids.has(targetProjectId));
        const targetModel = targetProjectId ? availableTargetById.get(targetProjectId) : undefined;
        const endpointLabel = side === "source" ? "首端" : "末端";
        const message = !targetProjectId
          ? `线路“${line.name || line.id}”的${endpointLabel}连接到${boundaryType}模型按钮，但该按钮的关联模型字段 buttonTargetProjectId 未定义。`
          : selfReferenced
            ? `线路“${line.name || line.id}”的${endpointLabel}连接到${boundaryType}模型按钮，但其 buttonTargetProjectId=${targetProjectId} 与当前模型“${model.name}”的 projectId 相同，不允许关联本模型。`
          : !targetModel
            ? `线路“${line.name || line.id}”的${endpointLabel}连接到${boundaryType}模型“${targetProjectName || targetProjectId}”（buttonTargetProjectId=${targetProjectId}），但该模型不存在，无法参与本轮全网拓扑。`
          : equivalentBoundaryType && !selected
            ? `线路“${line.name || line.id}”的${endpointLabel}连接到${boundaryType}模型“${targetModel.name}”，但该模型未参与本轮全网拓扑。`
            : "";
        if (!message) {
          continue;
        }
        warnings.push({
          id: `${model.projectId}:missing-related-model:${line.id}:${side}`,
          projectId: model.projectId,
          schemeId: model.schemeId,
          modelName: model.name,
          deviceName: line.name || line.id,
          message,
          nodeId: line.id,
          relatedNodeIds: [line.id]
        });
      }
    }
  }
  return warnings;
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
  const associationModelType = modelAssociationModelTypeForKind(node.kind) ||
    equivalentBoundaryModelInteractionType(node);
  if (associationModelType !== expectedModelType) return undefined;

  const modelIndex = normalizedModelIndex(node.params.model_id);
  const byModelIndex = modelIndex > 0
    ? availableModels.find((model) => model.idx === modelIndex)
    : undefined;
  if (byModelIndex?.modelType === expectedModelType) return byModelIndex;

  const projectId = String(node.params.buttonTargetProjectId ?? "").trim();
  const byProjectId = projectId
    ? availableModels.find((model) => model.projectId === projectId)
    : undefined;
  if (byProjectId?.modelType === expectedModelType) return byProjectId;

  const projectName = String(node.params.buttonTargetProjectName ?? "").trim();
  return projectName
    ? availableModels.find((model) => model.modelType === expectedModelType && model.name === projectName)
    : undefined;
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
  const modelInteractionWarnings = missingModelWarnings(orderedModels, availableModels);
  const hierarchyErrors = duplicateHierarchyParentErrors(orderedModels, availableModels);
  return {
    errors: [...hierarchyErrors, ...orderedModels.flatMap(topologyErrorsForModel)],
    warnings: modelInteractionWarnings
  };
}
