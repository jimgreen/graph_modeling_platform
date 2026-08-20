import type { DeviceKind, ModelNode, ModelType } from "./model";
import {
  ROUTABLE_LINE_SOURCE_NODE_PARAM,
  ROUTABLE_LINE_TARGET_NODE_PARAM,
  baseDeviceKind,
  deriveDeviceIndexCounters,
  equivalentBoundaryModelInteractionType,
  modelAssociationModelTypeForKind
} from "./model";

export const GLOBAL_LINE_ID_PARAM = "_globalLineId";
export const GLOBAL_LINE_MODEL_PAIR_PARAM = "_globalLineModelPair";

export type GlobalLineEnergyType = "ac" | "dc";
export type GlobalLineEndpoint = "source" | "target";

export type GlobalLineReference = {
  modelKey: string;
  projectIdx?: number;
  schemePath: string[];
  projectName: string;
  nodeId: string;
  terminalSlot?: "i" | "j";
  boundaryEndpoint?: GlobalLineEndpoint;
  boundaryNodeId?: string;
  boundaryTerminalId?: string;
};

export type GlobalLineRecord = {
  id: string;
  idx: number;
  name: string;
  energyType: GlobalLineEnergyType;
  params: Record<string, string>;
  references: GlobalLineReference[];
  endpointSlots?: Record<GlobalLineEndpoint, GlobalLineReference | null>;
  terminalSlots?: { i: GlobalLineReference | null; j: GlobalLineReference | null };
  degree: number;
  createdAt: string;
  updatedAt: string;
};

export type GlobalLineChoice =
  | { mode: "existing"; globalLineId: string }
  | { mode: "new"; name: string };

export type PendingGlobalLinePlacement = {
  template: unknown;
  source: unknown;
  target: unknown;
  manualPoints?: unknown[];
  energyType: GlobalLineEnergyType;
};

const GLOBAL_LINE_MODEL_TYPES = new Set<ModelType>(["厂站", "馈线", "台区"]);
const GLOBAL_LINE_LOCAL_PARAM_KEYS = new Set([
  "idx",
  "i_node",
  "j_node",
  "t1_node",
  "t2_node"
]);

export function isManagedGlobalLineModelType(modelType: string | undefined): boolean {
  return GLOBAL_LINE_MODEL_TYPES.has(modelType as ModelType);
}

export function isGlobalLineBoundaryNode(node: Pick<ModelNode, "kind" | "params">): boolean {
  return Boolean(
    equivalentBoundaryModelInteractionType(node) ||
    modelAssociationModelTypeForKind(node.kind)
  );
}

export function modelAssociationGlobalLineEndpointForNode(
  node: Pick<ModelNode, "kind" | "params">
): GlobalLineEndpoint | "" {
  if (!modelAssociationModelTypeForKind(node.kind)) return "";
  const kind = String(baseDeviceKind(node.kind));
  if (kind.endsWith("-source")) return "source";
  if (kind.endsWith("-load")) return "target";
  return "";
}

function globalLineEndpointLabel(endpoint: GlobalLineEndpoint): string {
  return endpoint === "source" ? "首端" : "末端";
}

function oppositeGlobalLineEndpoint(endpoint: GlobalLineEndpoint): GlobalLineEndpoint {
  return endpoint === "source" ? "target" : "source";
}

export function globalLineSourcePlacementFailureMessage(
  node: Pick<ModelNode, "kind" | "params"> & Partial<Pick<ModelNode, "name">>
): string {
  if (modelAssociationGlobalLineEndpointForNode(node) !== "target") return "";
  const name = String(node.name ?? "该模型关联负荷").trim() || "该模型关联负荷";
  return `“${name}”属于厂站/馈线/台区负荷，只能位于线路末端。`;
}

export function globalLineTargetPlacementFailureMessage(
  node: Pick<ModelNode, "kind" | "params"> & Partial<Pick<ModelNode, "name">>
): string {
  if (modelAssociationGlobalLineEndpointForNode(node) !== "source") return "";
  const name = String(node.name ?? "该模型关联电源").trim() || "该模型关联电源";
  return `“${name}”属于厂站/馈线/台区电源，只能位于线路首端。`;
}

export function globalLineEndpointPlacementFailureMessage(
  sourceNode: Pick<ModelNode, "kind" | "params"> & Partial<Pick<ModelNode, "name">>,
  targetNode: Pick<ModelNode, "kind" | "params"> & Partial<Pick<ModelNode, "name">>
): string {
  const sourceAssociationEndpoint = modelAssociationGlobalLineEndpointForNode(sourceNode);
  const targetAssociationEndpoint = modelAssociationGlobalLineEndpointForNode(targetNode);
  if (sourceAssociationEndpoint && targetAssociationEndpoint) {
    return "线路两端不能同时连接厂站/馈线/台区电源或负荷；请保留一个模型关联端，另一个端点连接本地设备。";
  }
  return globalLineSourcePlacementFailureMessage(sourceNode) ||
    globalLineTargetPlacementFailureMessage(targetNode);
}

export function globalLineEnergyTypeForKind(kind: string): GlobalLineEnergyType | "" {
  const baseKind = baseDeviceKind(kind);
  if (baseKind === "ac-routable-line" || baseKind === "ac-zero-routable-branch") {
    return "ac";
  }
  if (baseKind === "dc-routable-line" || baseKind === "dc-zero-routable-branch") {
    return "dc";
  }
  return "";
}

export function globalLineEnergyTypeForNode(node: Pick<ModelNode, "kind">): GlobalLineEnergyType | "" {
  return globalLineEnergyTypeForKind(node.kind);
}

export function globalLineModelKey(projectIdx: number | undefined, schemePath: string[], projectName: string): string {
  const numericIndex = Number(projectIdx);
  if (Number.isSafeInteger(numericIndex) && numericIndex > 0) {
    return `model:${numericIndex}`;
  }
  return `path:${[...schemePath, projectName].map((part) => String(part ?? "").trim()).filter(Boolean).join("/")}`;
}

type GlobalLinePlacementTarget = {
  node: Pick<ModelNode, "id" | "kind" | "params">;
  terminalId: string;
};

type GlobalLinePlacementEndpoints = {
  source: GlobalLinePlacementTarget;
  target: GlobalLinePlacementTarget;
};

function positiveModelAssociationProjectIdx(node: Pick<ModelNode, "kind" | "params">): number {
  if (!modelAssociationModelTypeForKind(node.kind)) return 0;
  const modelId = Number(node.params.model_id);
  return Number.isSafeInteger(modelId) && modelId > 0 ? modelId : 0;
}

export type GlobalLineModelAssociationPlacement = {
  endpoint: GlobalLineEndpoint;
  projectIdx: number;
  modelKey: string;
};

export function globalLineModelAssociationPlacementForEndpoints(
  sourceNode: Pick<ModelNode, "kind" | "params">,
  targetNode: Pick<ModelNode, "kind" | "params">
): GlobalLineModelAssociationPlacement | null {
  if (globalLineEndpointPlacementFailureMessage(sourceNode, targetNode)) return null;
  const sourceEndpoint = modelAssociationGlobalLineEndpointForNode(sourceNode);
  const targetEndpoint = modelAssociationGlobalLineEndpointForNode(targetNode);
  const endpoint = sourceEndpoint || targetEndpoint;
  if (!endpoint) return null;
  const associationNode = endpoint === "source" ? sourceNode : targetNode;
  const projectIdx = positiveModelAssociationProjectIdx(associationNode);
  return projectIdx > 0
    ? { endpoint, projectIdx, modelKey: globalLineModelKey(projectIdx, [], "") }
    : null;
}

function globalLineReferenceForEndpoint(
  reference: GlobalLineReference,
  endpoint: GlobalLineEndpoint,
  boundary?: GlobalLinePlacementTarget
): GlobalLineReference {
  return {
    modelKey: reference.modelKey,
    ...(reference.projectIdx ? { projectIdx: reference.projectIdx } : {}),
    schemePath: [...reference.schemePath],
    projectName: reference.projectName,
    nodeId: reference.nodeId,
    boundaryEndpoint: endpoint,
    ...(boundary?.node.id ? { boundaryNodeId: boundary.node.id } : {}),
    ...(boundary?.terminalId ? { boundaryTerminalId: boundary.terminalId } : {})
  };
}

/**
 * Builds the two directional references for a newly-created line that touches a
 * model-association source/load. The association endpoint points at model_id;
 * the physical line's opposite endpoint remains owned by the current model.
 * Legacy ModelInteraction buttons without model_id keep their one-reference
 * behavior so they can still be paired with a line from another model.
 */
export function globalLineReferencesForPlacement(
  localReference: GlobalLineReference,
  endpoints: GlobalLinePlacementEndpoints
): GlobalLineReference[] {
  if (globalLineEndpointPlacementFailureMessage(endpoints.source.node, endpoints.target.node)) return [];
  const endpointEntries = (["source", "target"] as const).map((endpoint) => ({
    endpoint,
    target: endpoints[endpoint],
    associatedProjectIdx: positiveModelAssociationProjectIdx(endpoints[endpoint].node)
  }));
  const hasModelAssociationEndpoint = endpointEntries.some((entry) => entry.associatedProjectIdx > 0);
  if (hasModelAssociationEndpoint) {
    return endpointEntries.map(({ endpoint, target, associatedProjectIdx }) => (
      associatedProjectIdx > 0
        ? globalLineReferenceForEndpoint({
            modelKey: globalLineModelKey(associatedProjectIdx, [], ""),
            projectIdx: associatedProjectIdx,
            schemePath: [],
            projectName: "",
            nodeId: localReference.nodeId
          }, endpoint, target)
        : globalLineReferenceForEndpoint(localReference, endpoint)
    ));
  }

  const boundaryEntry = endpointEntries.find(({ target }) => isGlobalLineBoundaryNode(target.node));
  return boundaryEntry
    ? [globalLineReferenceForEndpoint(localReference, boundaryEntry.endpoint, boundaryEntry.target)]
    : [];
}

export function globalLineEndpointNodeIds(node: Pick<ModelNode, "params">): string[] {
  return [
    String(node.params[ROUTABLE_LINE_SOURCE_NODE_PARAM] ?? "").trim(),
    String(node.params[ROUTABLE_LINE_TARGET_NODE_PARAM] ?? "").trim()
  ].filter(Boolean);
}

export function lineTouchesGlobalBoundary(
  line: Pick<ModelNode, "kind" | "params">,
  nodeById: ReadonlyMap<string, ModelNode>
): boolean {
  if (!globalLineEnergyTypeForNode(line as Pick<ModelNode, "kind">)) {
    return false;
  }
  return globalLineEndpointNodeIds(line).some((nodeId) => {
    const endpointNode = nodeById.get(nodeId);
    return Boolean(endpointNode && isGlobalLineBoundaryNode(endpointNode));
  });
}

export function shouldManageLineGlobally(
  line: Pick<ModelNode, "kind" | "params">,
  nodes: readonly ModelNode[],
  modelType: string | undefined
): boolean {
  if (!isManagedGlobalLineModelType(modelType)) {
    return false;
  }
  return lineTouchesGlobalBoundary(line, new Map(nodes.map((node) => [node.id, node])));
}

export function shouldUseGlobalLineForEndpoints(
  modelType: string | undefined,
  lineKind: string,
  sourceNode: Pick<ModelNode, "kind" | "params">,
  targetNode: Pick<ModelNode, "kind" | "params">
): boolean {
  return Boolean(
    isManagedGlobalLineModelType(modelType) &&
    globalLineEnergyTypeForKind(lineKind) &&
    (isGlobalLineBoundaryNode(sourceNode) || isGlobalLineBoundaryNode(targetNode))
  );
}

export function globalLineSharedParamsFromNode(node: Pick<ModelNode, "params">): Record<string, string> {
  return Object.fromEntries(
    Object.entries(node.params).filter(([key]) => (
      key !== GLOBAL_LINE_ID_PARAM &&
      !key.startsWith("_") &&
      !GLOBAL_LINE_LOCAL_PARAM_KEYS.has(key)
    ))
  );
}

export function removeGlobalLineIdentityForLocalNode<T extends ModelNode>(node: T): T {
  if (!node.params[GLOBAL_LINE_ID_PARAM] && !node.params[GLOBAL_LINE_MODEL_PAIR_PARAM] && !node.params.idx) {
    return node;
  }
  const params = { ...node.params };
  delete params[GLOBAL_LINE_ID_PARAM];
  delete params[GLOBAL_LINE_MODEL_PAIR_PARAM];
  delete params.idx;
  return { ...node, params };
}

export function deriveLocalDeviceIndexCounters(nodes: readonly ModelNode[]) {
  return deriveDeviceIndexCounters(nodes.filter((node) => !String(node.params[GLOBAL_LINE_ID_PARAM] ?? "").trim()));
}

export function applyGlobalLineRecordToNode<T extends ModelNode>(node: T, record: GlobalLineRecord): T {
  const nextParams = {
    ...node.params,
    ...record.params,
    idx: String(record.idx),
    [GLOBAL_LINE_ID_PARAM]: record.id
  };
  if (node.name === record.name && JSON.stringify(nextParams) === JSON.stringify(node.params)) {
    return node;
  }
  return { ...node, name: record.name, params: nextParams };
}

export function applyGlobalLineRecordsToNodes(
  nodes: readonly ModelNode[],
  records: readonly GlobalLineRecord[],
  modelKey?: string
): ModelNode[] {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const recordByReferencedNodeId = new Map<string, GlobalLineRecord>();
  if (modelKey) {
    for (const record of records) {
      for (const reference of record.references) {
        if (reference.modelKey === modelKey) {
          recordByReferencedNodeId.set(reference.nodeId, record);
        }
      }
    }
  }
  let changed = false;
  const nextNodes = nodes.map((node) => {
    const id = String(node.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
    const record = (id ? recordById.get(id) : undefined) ?? recordByReferencedNodeId.get(node.id);
    if (!record || globalLineEnergyTypeForNode(node) !== record.energyType) {
      return node;
    }
    const nextNode = applyGlobalLineRecordToNode(node, record);
    changed ||= nextNode !== node;
    return nextNode;
  });
  return changed ? nextNodes : nodes as ModelNode[];
}

function globalLineReferenceOwnerModelKey(record: GlobalLineRecord, reference: GlobalLineReference): string {
  if (reference.boundaryNodeId) {
    const physicalModelReference = record.references.find((candidate) => (
      candidate !== reference &&
      candidate.nodeId === reference.nodeId &&
      !candidate.boundaryNodeId
    ));
    if (physicalModelReference) return physicalModelReference.modelKey;
  }
  return reference.modelKey;
}

function globalLineRecordWithReferences(
  record: GlobalLineRecord,
  references: GlobalLineReference[]
): GlobalLineRecord {
  const source = references.find((reference) => reference.boundaryEndpoint === "source") ?? null;
  const target = references.find((reference) => reference.boundaryEndpoint === "target") ?? null;
  return {
    ...record,
    references,
    endpointSlots: { source, target },
    terminalSlots: { i: source, j: target },
    degree: references.length
  };
}

function mergeGlobalLineReferences(
  current: readonly GlobalLineReference[],
  additions: readonly GlobalLineReference[]
): GlobalLineReference[] {
  const next = current.map((reference) => ({ ...reference, schemePath: [...reference.schemePath] }));
  for (const addition of additions) {
    const sameReferenceIndex = next.findIndex((reference) => (
      reference.modelKey === addition.modelKey && reference.nodeId === addition.nodeId
    ));
    if (sameReferenceIndex >= 0) {
      next[sameReferenceIndex] = addition;
      continue;
    }
    const endpointIndex = next.findIndex((reference) => reference.boundaryEndpoint === addition.boundaryEndpoint);
    if (endpointIndex >= 0) {
      next[endpointIndex] = addition;
    } else {
      next.push(addition);
    }
  }
  return next;
}

function globalLinePlacementEndpointsForNode(
  node: ModelNode,
  nodeById: ReadonlyMap<string, ModelNode>
): GlobalLinePlacementEndpoints | null {
  const sourceNode = nodeById.get(String(node.params[ROUTABLE_LINE_SOURCE_NODE_PARAM] ?? "").trim());
  const targetNode = nodeById.get(String(node.params[ROUTABLE_LINE_TARGET_NODE_PARAM] ?? "").trim());
  if (!sourceNode || !targetNode) return null;
  return {
    source: {
      node: sourceNode,
      terminalId: String(node.params._routableLineSourceTerminalId ?? "").trim()
    },
    target: {
      node: targetNode,
      terminalId: String(node.params._routableLineTargetTerminalId ?? "").trim()
    }
  };
}

/**
 * Overlays the current page graph onto the persisted global-line registry.
 * The result is display-only: callers can show unsaved additions/edits/deletes,
 * and Ctrl+Z naturally restores the previous view when the node array rewinds.
 */
export function previewGlobalLineRecordsForProject(
  persistedRecords: readonly GlobalLineRecord[],
  nodes: readonly ModelNode[],
  modelType: string | undefined,
  localModelReference: GlobalLineReference
): GlobalLineRecord[] {
  if (!isManagedGlobalLineModelType(modelType)) {
    return persistedRecords.map((record) => globalLineRecordWithReferences(record, [...record.references]));
  }

  const localModelKey = localModelReference.modelKey;
  const persistedById = new Map(persistedRecords.map((record) => [record.id, record]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const activePersistedRecordIds = new Set(nodes.flatMap((node) => {
    const globalLineId = String(node.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
    return globalLineId && globalLineEnergyTypeForNode(node) && lineTouchesGlobalBoundary(node, nodeById)
      ? [globalLineId]
      : [];
  }));
  const reuseOnlyRecordIds = new Set(nodes.flatMap((node) => {
    const pairMode = String(node.params[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
    const globalLineId = String(node.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
    return globalLineId && (pairMode === "source" || pairMode === "target") ? [globalLineId] : [];
  }));
  const previewById = new Map<string, GlobalLineRecord>();
  for (const record of persistedRecords) {
    const ownedByLocalModel = record.references.some((reference) => (
      globalLineReferenceOwnerModelKey(record, reference) === localModelKey
    ));
    const hasOtherEndpointModel = record.references.some((reference) => reference.modelKey !== localModelKey);
    if (!activePersistedRecordIds.has(record.id) && ownedByLocalModel) {
      if (hasOtherEndpointModel) {
        previewById.set(record.id, globalLineRecordWithReferences(record, [...record.references]));
      }
      continue;
    }
    const references = reuseOnlyRecordIds.has(record.id)
      ? [...record.references]
      : record.references.filter((reference) => (
          globalLineReferenceOwnerModelKey(record, reference) !== localModelKey
        ));
    previewById.set(record.id, globalLineRecordWithReferences(record, references));
  }

  let nextDraftIndex = Math.max(0, ...persistedRecords.map((record) => Number(record.idx) || 0)) + 1;
  for (const node of nodes) {
    if (!globalLineEnergyTypeForNode(node) || !lineTouchesGlobalBoundary(node, nodeById)) continue;
    const requestedId = String(node.params[GLOBAL_LINE_ID_PARAM] ?? "").trim();
    const persisted = requestedId ? persistedById.get(requestedId) : undefined;
    const id = persisted?.id ?? (requestedId || `draft-global-line:${node.id}`);
    const pairMode = String(node.params[GLOBAL_LINE_MODEL_PAIR_PARAM] ?? "").trim();
    const repairingModelAssociationReuse = Boolean(
      persisted && persisted.degree <= 1 && (pairMode === "source" || pairMode === "target")
    );
    if (persisted && (pairMode === "source" || pairMode === "target") && !repairingModelAssociationReuse) {
      previewById.set(id, globalLineRecordWithReferences(persisted, [...persisted.references]));
      continue;
    }
    let preview = previewById.get(id);
    if (!preview) {
      const requestedIndex = Number(node.params.idx);
      const idx = Number.isSafeInteger(requestedIndex) && requestedIndex > 0 ? requestedIndex : nextDraftIndex;
      nextDraftIndex = Math.max(nextDraftIndex, idx + 1);
      const now = new Date(0).toISOString();
      preview = globalLineRecordWithReferences({
        id,
        idx,
        name: node.name,
        energyType: globalLineEnergyTypeForNode(node) as GlobalLineEnergyType,
        params: globalLineSharedParamsFromNode(node),
        references: [],
        degree: 0,
        createdAt: now,
        updatedAt: now
      }, []);
    }

    const endpoints = globalLinePlacementEndpointsForNode(node, nodeById);
    if (!endpoints) continue;
    const localReference = {
      ...localModelReference,
      schemePath: [...localModelReference.schemePath],
      nodeId: node.id
    };
    const references = pairMode === "1" || repairingModelAssociationReuse
      ? globalLineReferencesForPlacement(localReference, endpoints)
      : (() => {
          const boundaryEndpoint = isGlobalLineBoundaryNode(endpoints.source.node)
            ? "source"
            : isGlobalLineBoundaryNode(endpoints.target.node)
              ? "target"
              : "";
          if (!boundaryEndpoint) return [];
          return [globalLineReferenceForEndpoint(
            localReference,
            boundaryEndpoint,
            endpoints[boundaryEndpoint]
          )];
        })();
    const nextReferences = repairingModelAssociationReuse
      ? references
      : mergeGlobalLineReferences(preview.references, references);
    previewById.set(id, globalLineRecordWithReferences({
      ...preview,
      name: node.name,
      energyType: globalLineEnergyTypeForNode(node) as GlobalLineEnergyType,
      params: globalLineSharedParamsFromNode(node),
      updatedAt: preview.updatedAt
    }, nextReferences));
  }

  return [...previewById.values()].sort((left, right) => (
    left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN")
  ));
}

export function expandGlobalBoundaryDeletionNodeIds(nodes: readonly ModelNode[], selectedIds: readonly string[]): string[] {
  const selected = new Set(selectedIds);
  const selectedBoundaryIds = new Set(
    nodes
      .filter((node) => selected.has(node.id) && isGlobalLineBoundaryNode(node))
      .map((node) => node.id)
  );
  if (selectedBoundaryIds.size === 0) {
    return [...selected];
  }
  for (const node of nodes) {
    if (!globalLineEnergyTypeForNode(node)) {
      continue;
    }
    if (globalLineEndpointNodeIds(node).some((nodeId) => selectedBoundaryIds.has(nodeId))) {
      selected.add(node.id);
    }
  }
  return [...selected];
}

export function globalLineEndpointReference(
  record: GlobalLineRecord,
  endpoint: GlobalLineEndpoint
): GlobalLineReference | null {
  const endpointSlot = record.endpointSlots?.[endpoint];
  if (endpointSlot !== undefined) return endpointSlot;
  const legacySlot = endpoint === "source" ? record.terminalSlots?.i : record.terminalSlots?.j;
  if (legacySlot !== undefined) return legacySlot;
  return record.references.find((reference) => (
    reference.boundaryEndpoint === endpoint ||
    (!reference.boundaryEndpoint && reference.terminalSlot === (endpoint === "source" ? "i" : "j"))
  )) ?? null;
}

export function globalLineBoundaryAdjustmentConflictMessage(
  record: GlobalLineRecord | undefined,
  currentReference: GlobalLineReference | undefined,
  nextReference: GlobalLineReference | undefined
): string {
  if (!record || record.degree < 2 || !currentReference?.boundaryEndpoint || !nextReference?.boundaryEndpoint) {
    return "";
  }
  const boundaryChanged = currentReference.boundaryEndpoint !== nextReference.boundaryEndpoint ||
    String(currentReference.boundaryNodeId ?? "") !== String(nextReference.boundaryNodeId ?? "") ||
    String(currentReference.boundaryTerminalId ?? "") !== String(nextReference.boundaryTerminalId ?? "");
  return boundaryChanged
    ? `全局线路“${record.name}”的首末端都已关联，不能调整当前边界端；请先删除另一端关联，再调整本端。`
    : "";
}

function globalLineReferenceMatchesModel(
  reference: GlobalLineReference | null,
  expected: Pick<GlobalLineReference, "modelKey" | "projectIdx">
): boolean {
  if (!reference) return false;
  const expectedProjectIdx = Number(expected.projectIdx);
  const referenceProjectIdx = Number(reference.projectIdx);
  if (Number.isSafeInteger(expectedProjectIdx) && expectedProjectIdx > 0) {
    return Number.isSafeInteger(referenceProjectIdx) && referenceProjectIdx > 0
      ? referenceProjectIdx === expectedProjectIdx
      : reference.modelKey === globalLineModelKey(expectedProjectIdx, [], "");
  }
  return reference.modelKey === expected.modelKey;
}

function globalLineReferenceModelLabel(
  reference: Pick<GlobalLineReference, "modelKey" | "projectIdx" | "projectName"> | null
): string {
  if (!reference) return "未定义模型";
  const projectIdx = Number(reference.projectIdx);
  const identity = Number.isSafeInteger(projectIdx) && projectIdx > 0 ? `model_id=${projectIdx}` : reference.modelKey;
  return reference.projectName ? `${reference.projectName}（${identity}）` : identity;
}

export function globalLineExistingPlacementConflictMessage(
  record: GlobalLineRecord | undefined,
  sourceNode: Pick<ModelNode, "kind" | "params">,
  targetNode: Pick<ModelNode, "kind" | "params">,
  localModelReference: Pick<GlobalLineReference, "modelKey" | "projectIdx" | "projectName">
): string {
  const placement = globalLineModelAssociationPlacementForEndpoints(sourceNode, targetNode);
  if (!record || !placement) return "";
  if (record.degree <= 1) return "";
  const associationReference = globalLineEndpointReference(record, placement.endpoint);
  const oppositeEndpoint = oppositeGlobalLineEndpoint(placement.endpoint);
  const localReference = globalLineEndpointReference(record, oppositeEndpoint);
  const associationMatches = globalLineReferenceMatchesModel(associationReference, placement);
  const localMatches = globalLineReferenceMatchesModel(localReference, localModelReference);
  if (associationMatches && localMatches) return "";
  const retry = "请重新选择已有全局线路，或新建全局线路，或取消本次全局线路绘制。";
  if (
    globalLineReferenceMatchesModel(localReference, placement) ||
    globalLineReferenceMatchesModel(associationReference, localModelReference)
  ) {
    return `全局线路“${record.name}”中 model_id=${placement.projectIdx} 位于${globalLineEndpointLabel(oppositeEndpoint)}，当前模型关联设备要求位于${globalLineEndpointLabel(placement.endpoint)}，首末端方向不一致。${retry}`;
  }
  if (!associationMatches) {
    return `全局线路“${record.name}”的${globalLineEndpointLabel(placement.endpoint)}已关联“${globalLineReferenceModelLabel(associationReference)}”，与当前模型关联设备 model_id=${placement.projectIdx} 不一致。${retry}`;
  }
  return `全局线路“${record.name}”的${globalLineEndpointLabel(oppositeEndpoint)}已关联“${globalLineReferenceModelLabel(localReference)}”，与本地模型“${globalLineReferenceModelLabel(localModelReference)}”不一致。${retry}`;
}

export function candidateGlobalLines(
  records: readonly GlobalLineRecord[],
  energyType: GlobalLineEnergyType,
  modelKey: string,
  boundaryEndpoint: GlobalLineEndpoint,
  placementNodes?: {
    source: Pick<ModelNode, "kind" | "params">;
    target: Pick<ModelNode, "kind" | "params">;
  },
  usedGlobalLineIds: ReadonlySet<string> = new Set()
): GlobalLineRecord[] {
  const modelAssociationPlacement = placementNodes
    ? globalLineModelAssociationPlacementForEndpoints(placementNodes.source, placementNodes.target)
    : null;
  return records
    .filter((record) => (
      record.energyType === energyType &&
      !usedGlobalLineIds.has(record.id) &&
      !record.references.some((reference) => reference.modelKey === modelKey) &&
      (modelAssociationPlacement !== null || (
        record.degree < 2 &&
        globalLineEndpointReference(record, boundaryEndpoint) === null
      ))
    ))
    .sort((left, right) => left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN"));
}

export function globalLineKindForEnergy(energyType: GlobalLineEnergyType): DeviceKind {
  return (energyType === "ac" ? "ac-routable-line" : "dc-routable-line") as DeviceKind;
}
