import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_POWER_UNIT,
  DEFAULT_VOLTAGE_UNIT,
  calculateElectricalTopology,
  equivalentBoundaryModelInteractionType,
  isBlockingTopologyValidationError,
  isModelInteractionNode,
  isRoutableLineDeviceKind,
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

export function analyzeAllNetworkTopology(
  selectedModels: readonly AllNetworkTopologyModel[],
  availableModels: readonly AllNetworkTopologyReferenceModel[] = selectedModels
): AllNetworkTopologyResult {
  const orderedModels = [...selectedModels].sort((left, right) => left.idx - right.idx);
  const modelInteractionWarnings = missingModelWarnings(orderedModels, availableModels);
  return {
    errors: orderedModels.flatMap(topologyErrorsForModel),
    warnings: modelInteractionWarnings
  };
}
