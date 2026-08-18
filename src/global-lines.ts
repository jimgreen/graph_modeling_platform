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
  if (!node.params[GLOBAL_LINE_ID_PARAM] && !node.params.idx) {
    return node;
  }
  const params = { ...node.params };
  delete params[GLOBAL_LINE_ID_PARAM];
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

export function candidateGlobalLines(
  records: readonly GlobalLineRecord[],
  energyType: GlobalLineEnergyType,
  modelKey: string,
  boundaryEndpoint: GlobalLineEndpoint
): GlobalLineRecord[] {
  const oppositeEndpoint: GlobalLineEndpoint = boundaryEndpoint === "source" ? "target" : "source";
  return records
    .filter((record) => (
      record.energyType === energyType &&
      record.degree === 1 &&
      !record.references.some((reference) => reference.modelKey === modelKey) &&
      globalLineEndpointReference(record, boundaryEndpoint) === null &&
      globalLineEndpointReference(record, oppositeEndpoint) !== null
    ))
    .sort((left, right) => left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN"));
}

export function globalLineKindForEnergy(energyType: GlobalLineEnergyType): DeviceKind {
  return (energyType === "ac" ? "ac-routable-line" : "dc-routable-line") as DeviceKind;
}
