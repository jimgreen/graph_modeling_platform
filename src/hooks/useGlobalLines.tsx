import { useEffect, useMemo, useRef, useState } from "react";
import { apiPath } from "../config";
import type { DeviceTemplate, ModelNode, Point } from "../model";
import {
  applyGlobalLineRecordToNode,
  applyGlobalLineRecordsToNodes,
  candidateGlobalLines,
  deriveLocalDeviceIndexCounters,
  GLOBAL_LINE_MODEL_PAIR_PARAM,
  globalLineBoundaryAdjustmentConflictMessage as globalLineBoundaryAdjustmentConflictMessageForRecord,
  globalLineEnergyTypeForKind,
  globalLineEndpointPlacementFailureMessage,
  globalLineExistingPlacementConflictMessage,
  globalLineModelAssociationPlacementForEndpoints,
  globalLineModelKey,
  isGlobalLineBoundaryNode,
  previewGlobalLineRecordsForProject,
  removeGlobalLineIdentityForLocalNode,
  type GlobalLineChoice,
  type GlobalLineEndpoint,
  type GlobalLineEnergyType,
  type GlobalLineReference,
  type GlobalLineRecord
} from "../global-lines";

export type GlobalLinePlacementDialogState = {
  template?: DeviceTemplate;
  source?: ConnectTarget;
  target?: ConnectTarget;
  manualPoints?: Point[];
  transitionNode?: ModelNode;
  energyType: GlobalLineEnergyType;
  boundaryEndpoint: GlobalLineEndpoint;
  loading: boolean;
  saving: boolean;
  mode: "existing" | "new";
  selectedGlobalLineId: string;
  name: string;
  error: string;
};

export type GlobalLineTransitionDialogState = {
  originalNode: ModelNode;
  nextNode: ModelNode;
  direction: "local-to-global" | "global-to-local";
};

type ConnectTarget = { node: ModelNode; terminalId: string; point?: Point };

type GlobalLineListResponse = { ok?: boolean; records?: GlobalLineRecord[] };

async function responseError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload?.error === "string" ? payload.error : fallback;
}

async function fetchJson<T>(url: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await responseError(response, fallback));
  return await response.json() as T;
}

function schemePathFromScope(scope: Record<string, any>): string[] {
  const schemeId = scope.activeSchemeKey || scope.selectedSchemeId || "";
  const path = typeof scope.savedSchemePathForId === "function" ? scope.savedSchemePathForId(schemeId) : [];
  return Array.isArray(path) ? path.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
}

function modelReferenceFromScope(scope: Record<string, any>, nodeId: string, lineNode?: ModelNode) {
  const projectIdx = Number(scope.projectIdx);
  const schemePath = schemePathFromScope(scope);
  const projectName = String(scope.projectName ?? "").trim();
  const nodeById = new Map<ModelNode["id"], ModelNode>(
    (Array.isArray(scope.nodes) ? scope.nodes as ModelNode[] : []).map((node) => [node.id, node])
  );
  const sourceNodeId = String(lineNode?.params?._routableLineSourceNodeId ?? "").trim();
  const targetNodeId = String(lineNode?.params?._routableLineTargetNodeId ?? "").trim();
  const boundaryEndpoint = sourceNodeId && isGlobalLineBoundaryNode(nodeById.get(sourceNodeId) ?? { kind: "" as any, params: {} })
    ? "source"
    : targetNodeId && isGlobalLineBoundaryNode(nodeById.get(targetNodeId) ?? { kind: "" as any, params: {} })
      ? "target"
      : undefined;
  const boundaryNodeId = boundaryEndpoint === "source" ? sourceNodeId : boundaryEndpoint === "target" ? targetNodeId : "";
  const boundaryTerminalId = boundaryEndpoint === "source"
    ? String(lineNode?.params?._routableLineSourceTerminalId ?? "").trim()
    : boundaryEndpoint === "target"
      ? String(lineNode?.params?._routableLineTargetTerminalId ?? "").trim()
      : "";
  return {
    modelKey: globalLineModelKey(projectIdx, schemePath, projectName),
    ...(Number.isSafeInteger(projectIdx) && projectIdx > 0 ? { projectIdx } : {}),
    schemePath,
    projectName,
    nodeId,
    ...(boundaryEndpoint ? { boundaryEndpoint } : {}),
    ...(boundaryNodeId ? { boundaryNodeId } : {}),
    ...(boundaryTerminalId ? { boundaryTerminalId } : {})
  };
}

function boundaryEndpointForConnectTargets(source: ConnectTarget, target: ConnectTarget): GlobalLineEndpoint | "" {
  if (isGlobalLineBoundaryNode(source.node)) return "source";
  if (isGlobalLineBoundaryNode(target.node)) return "target";
  return "";
}

function nextDefaultLineName(records: readonly GlobalLineRecord[], energyType: GlobalLineEnergyType, template?: DeviceTemplate) {
  const nextIndex = Math.max(0, ...records.map((record) => Number(record.idx) || 0)) + 1;
  const base = String(template?.label ?? "").trim() || `${energyType === "ac" ? "交流" : "直流"}线路`;
  return `${base}-${nextIndex}`;
}

export function useGlobalLines(scope: Record<string, any>) {
  const [records, setRecords] = useState<GlobalLineRecord[]>([]);
  const [dialog, setDialog] = useState<GlobalLinePlacementDialogState | null>(null);
  const [transitionDialog, setTransitionDialog] = useState<GlobalLineTransitionDialogState | null>(null);
  const latestScopeRef = useRef(scope);
  latestScopeRef.current = scope;

  const projectIdx = Number(scope.projectIdx);
  const projectName = String(scope.projectName ?? "").trim();
  const modelType = String(scope.modelType ?? "");
  const schemePath = schemePathFromScope(scope);
  const modelKey = globalLineModelKey(projectIdx, schemePath, projectName);
  const nodes = Array.isArray(scope.nodes) ? scope.nodes as ModelNode[] : [];
  const schemePathKey = schemePath.join("\u0000");
  const localModelReference = useMemo<GlobalLineReference>(() => ({
    modelKey,
    ...(Number.isSafeInteger(projectIdx) && projectIdx > 0 ? { projectIdx } : {}),
    schemePath,
    projectName,
    nodeId: ""
  }), [modelKey, projectIdx, projectName, schemePathKey]);
  const displayRecords = useMemo(() => previewGlobalLineRecordsForProject(
    records,
    nodes,
    modelType,
    localModelReference
  ), [localModelReference, modelType, nodes, records]);

  const candidates = useMemo(() => dialog
    ? candidateGlobalLines(
        records,
        dialog.energyType,
        modelKey,
        dialog.boundaryEndpoint,
        dialog.source && dialog.target ? { source: dialog.source.node, target: dialog.target.node } : undefined
      )
    : [], [dialog?.boundaryEndpoint, dialog?.energyType, dialog?.source?.node, dialog?.target?.node, modelKey, records]);

  function globalLinePlacementConflictMessageForId(
    globalLineId: string,
    placementDialog: GlobalLinePlacementDialogState | null = dialog,
    candidateRecords: readonly GlobalLineRecord[] = records
  ) {
    if (!placementDialog?.source || !placementDialog.target) return "";
    return globalLineExistingPlacementConflictMessage(
      candidateRecords.find((record) => record.id === globalLineId),
      placementDialog.source.node,
      placementDialog.target.node,
      localModelReference
    );
  }

  function previewRecords(baseRecords: readonly GlobalLineRecord[], requestNodes?: readonly ModelNode[]) {
    const latestNodes = requestNodes ?? (
      Array.isArray(latestScopeRef.current.nodes) ? latestScopeRef.current.nodes as ModelNode[] : []
    );
    return previewGlobalLineRecordsForProject(baseRecords, latestNodes, modelType, localModelReference);
  }

  async function loadRecords() {
    const payload = await fetchJson<GlobalLineListResponse>(apiPath("/global-lines"), "读取全局线路列表失败。");
    const nextRecords = Array.isArray(payload.records) ? payload.records : [];
    setRecords(nextRecords);
    return nextRecords;
  }

  async function loadGlobalLineRecords() {
    const nextRecords = await loadRecords();
    return previewRecords(nextRecords);
  }

  async function syncGlobalLineProjectNodes(requestNodes: ModelNode[], _applyHydration = true) {
    return previewRecords(records, requestNodes);
  }

  useEffect(() => {
    let cancelled = false;
    void loadRecords().then((nextRecords) => {
      if (cancelled) return;
      const latestScope = latestScopeRef.current;
      const latestNodes = Array.isArray(latestScope.nodes) ? latestScope.nodes as ModelNode[] : [];
      const hydratedNodes = applyGlobalLineRecordsToNodes(latestNodes, nextRecords, modelKey);
      if (hydratedNodes !== latestNodes) {
        latestScope.setNodes?.(hydratedNodes);
      }
    }).catch((error) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : "读取全局线路列表失败。";
      latestScopeRef.current.writeOperationLog?.(message);
    });
    return () => {
      cancelled = true;
    };
  }, [modelKey]);

  function requestGlobalLinePlacement(
    template: DeviceTemplate,
    source: ConnectTarget,
    target: ConnectTarget,
    manualPoints?: Point[]
  ) {
    const energyType = globalLineEnergyTypeForKind(template.kind);
    if (!energyType) return false;
    const endpointIssue = globalLineEndpointPlacementFailureMessage(source.node, target.node);
    if (endpointIssue) {
      latestScopeRef.current.writeOperationLog?.(`全局线路绘制失败：${endpointIssue}`);
      return false;
    }
    const boundaryEndpoint = boundaryEndpointForConnectTargets(source, target);
    if (!boundaryEndpoint) return false;
    const placementNodes = { source: source.node, target: target.node };
    const initialCandidates = candidateGlobalLines(records, energyType, modelKey, boundaryEndpoint, placementNodes);
    const initialDialog: GlobalLinePlacementDialogState = {
      template,
      source,
      target,
      manualPoints,
      energyType,
      boundaryEndpoint,
      loading: true,
      saving: false,
      mode: initialCandidates.length > 0 ? "existing" : "new",
      selectedGlobalLineId: initialCandidates[0]?.id ?? "",
      name: nextDefaultLineName(displayRecords, energyType, template),
      error: ""
    };
    initialDialog.error = initialCandidates[0]
      ? globalLinePlacementConflictMessageForId(initialCandidates[0].id, initialDialog)
      : "";
    setDialog(initialDialog);
    void loadRecords().then((nextRecords) => {
      const nextDisplayRecords = previewRecords(nextRecords);
      const nextCandidates = candidateGlobalLines(nextRecords, energyType, modelKey, boundaryEndpoint, placementNodes);
      setDialog((current) => {
        if (!current) return current;
        const selectedGlobalLineId = nextCandidates.some((item) => item.id === current.selectedGlobalLineId)
          ? current.selectedGlobalLineId
          : nextCandidates[0]?.id ?? "";
        const mode = current.mode === "existing" && nextCandidates.length === 0 ? "new" : current.mode;
        return {
          ...current,
          loading: false,
          mode,
          selectedGlobalLineId,
          name: current.name || nextDefaultLineName(nextDisplayRecords, energyType, template),
          error: mode === "existing"
            ? globalLinePlacementConflictMessageForId(selectedGlobalLineId, current, nextRecords)
            : ""
        };
      });
    }).catch((error) => {
      setDialog((current) => current ? { ...current, loading: false, mode: "new", error: error instanceof Error ? error.message : "读取全局线路列表失败。" } : current);
    });
    return true;
  }

  function requestExistingNodeGlobalLinePlacement(node: ModelNode) {
    const energyType = globalLineEnergyTypeForKind(node.kind);
    if (!energyType) return false;
    const boundaryEndpoint = modelReferenceFromScope(latestScopeRef.current, node.id, node).boundaryEndpoint as GlobalLineEndpoint | undefined;
    if (!boundaryEndpoint) return false;
    const initialCandidates = candidateGlobalLines(records, energyType, modelKey, boundaryEndpoint);
    setDialog({
      transitionNode: node,
      energyType,
      boundaryEndpoint,
      loading: true,
      saving: false,
      mode: initialCandidates.length > 0 ? "existing" : "new",
      selectedGlobalLineId: initialCandidates[0]?.id ?? "",
      name: node.name.trim() || nextDefaultLineName(displayRecords, energyType),
      error: ""
    });
    void loadRecords().then((nextRecords) => {
      const nextCandidates = candidateGlobalLines(nextRecords, energyType, modelKey, boundaryEndpoint);
      setDialog((current) => current ? {
        ...current,
        loading: false,
        mode: current.mode === "existing" && nextCandidates.length === 0 ? "new" : current.mode,
        selectedGlobalLineId: nextCandidates.some((item) => item.id === current.selectedGlobalLineId)
          ? current.selectedGlobalLineId
          : nextCandidates[0]?.id ?? ""
      } : current);
    }).catch((error) => {
      setDialog((current) => current ? { ...current, loading: false, mode: "new", error: error instanceof Error ? error.message : "读取全局线路列表失败。" } : current);
    });
    return true;
  }

  async function attachGlobalLineForNode(node: ModelNode, choice: GlobalLineChoice): Promise<GlobalLineRecord> {
    const energyType = globalLineEnergyTypeForKind(node.kind);
    if (!energyType) throw new Error("仅支持交流或直流线路进入全局线路表。");
    const existingRecord = choice.mode === "existing"
      ? records.find((record) => record.id === choice.globalLineId)
      : undefined;
    if (choice.mode === "existing" && !existingRecord) throw new Error("选择的全局线路不存在。");
    if (existingRecord && existingRecord.energyType !== energyType) throw new Error("选择的全局线路能源类型不一致。");
    const draftId = existingRecord?.id ?? `draft-global-line:${node.id}`;
    const draftIndex = existingRecord?.idx ?? Math.max(0, ...displayRecords.map((record) => Number(record.idx) || 0)) + 1;
    const latestNodes = Array.isArray(latestScopeRef.current.nodes) ? latestScopeRef.current.nodes as ModelNode[] : [];
    const nodeById = new Map(latestNodes.map((item) => [item.id, item]));
    const sourceNode = nodeById.get(String(node.params._routableLineSourceNodeId ?? "").trim());
    const targetNode = nodeById.get(String(node.params._routableLineTargetNodeId ?? "").trim());
    const associationPlacement = sourceNode && targetNode
      ? globalLineModelAssociationPlacementForEndpoints(sourceNode, targetNode)
      : null;
    if (choice.mode === "existing" && existingRecord && sourceNode && targetNode) {
      const conflict = globalLineExistingPlacementConflictMessage(existingRecord, sourceNode, targetNode, localModelReference);
      if (conflict) throw new Error(conflict);
    }
    const modelPairMode = choice.mode === "new"
      ? "1"
      : associationPlacement
        ? associationPlacement.endpoint
        : "";
    const namedNode = choice.mode === "existing"
      ? applyGlobalLineRecordToNode(node, existingRecord!)
      : { ...node, name: choice.name };
    const draftNode = {
      ...namedNode,
      params: {
        ...namedNode.params,
        idx: String(draftIndex),
        _globalLineId: draftId,
        ...(modelPairMode ? { [GLOBAL_LINE_MODEL_PAIR_PARAM]: modelPairMode } : {})
      }
    };
    if (!modelPairMode) delete draftNode.params[GLOBAL_LINE_MODEL_PAIR_PARAM];
    const previewNodes = [...latestNodes.filter((item) => item.id !== node.id), draftNode];
    const previewRecord = previewRecords(records, previewNodes).find((record) => record.id === draftId);
    if (!previewRecord || previewRecord.energyType !== energyType) throw new Error("未能生成全局线路页面草稿。");
    return modelPairMode
      ? { ...previewRecord, params: { ...previewRecord.params, [GLOBAL_LINE_MODEL_PAIR_PARAM]: modelPairMode } }
      : previewRecord;
  }

  async function confirmGlobalLinePlacement() {
    if (!dialog || dialog.loading || dialog.saving) return;
    const choice: GlobalLineChoice = dialog.mode === "existing"
      ? { mode: "existing", globalLineId: dialog.selectedGlobalLineId }
      : { mode: "new", name: dialog.name.trim() };
    if (choice.mode === "existing" && !choice.globalLineId) {
      setDialog((current) => current ? { ...current, error: "请选择一条出线度小于2的既有线路。" } : current);
      return;
    }
    if (choice.mode === "new" && !choice.name) {
      setDialog((current) => current ? { ...current, error: "请输入新线路名称。" } : current);
      return;
    }
    if (choice.mode === "existing") {
      const conflict = globalLinePlacementConflictMessageForId(choice.globalLineId);
      if (conflict) {
        setDialog((current) => current ? { ...current, error: conflict } : current);
        return;
      }
    }
    setDialog((current) => current ? { ...current, saving: true, error: "" } : current);
    try {
      if (dialog.transitionNode) {
        const record = await attachGlobalLineForNode(dialog.transitionNode, choice);
        const globalNode = applyGlobalLineRecordToNode(dialog.transitionNode, record);
        const latestScope = latestScopeRef.current;
        latestScope.pushUndoSnapshot?.(true, false, undefined, "线路切换为全局维护", globalNode.name);
        latestScope.patchGraphNodes?.([globalNode]);
        latestScope.setCanvasSelectionScope?.("group");
        latestScope.setSelectedNodeIds?.([globalNode.id]);
        latestScope.setSelectedEdgeId?.("");
        latestScope.setSelectedEdgeIds?.([]);
        latestScope.writeOperationLog?.(`线路切换为全局维护：${globalNode.name}`);
        setDialog(null);
        return;
      }
      if (!dialog.template || !dialog.source || !dialog.target) {
        throw new Error("待添加线路信息不完整。");
      }
      const committed = await latestScopeRef.current.commitRoutableLineDevice?.(
        dialog.template,
        dialog.source,
        dialog.target,
        dialog.manualPoints,
        choice
      );
      if (!committed) {
        setDialog((current) => current ? { ...current, saving: false, error: "线路超出画布范围，未能添加。" } : current);
        return;
      }
      setDialog(null);
    } catch (error) {
      setDialog((current) => current ? { ...current, saving: false, error: error instanceof Error ? error.message : "保存全局线路失败。" } : current);
    }
  }

  function cancelGlobalLinePlacement() {
    setDialog(null);
    const latestScope = latestScopeRef.current;
    latestScope.setRoutableLinePlacement?.(null);
    latestScope.resetRoutableLinePreviewState?.();
    latestScope.setMode?.("select");
  }

  function requestGlobalLineTransition(originalNode: ModelNode, nextNode: ModelNode, direction: GlobalLineTransitionDialogState["direction"]) {
    setTransitionDialog({ originalNode, nextNode, direction });
    return true;
  }

  function globalLineBoundaryAdjustmentConflictMessage(originalNode: ModelNode, nextNode: ModelNode) {
    const globalLineId = String(originalNode.params["_globalLineId"] ?? "").trim();
    const record = displayRecords.find((item) => item.id === globalLineId);
    const currentReference = modelReferenceFromScope(latestScopeRef.current, originalNode.id, originalNode) as GlobalLineReference;
    const nextReference = modelReferenceFromScope(latestScopeRef.current, nextNode.id, nextNode) as GlobalLineReference;
    return globalLineBoundaryAdjustmentConflictMessageForRecord(record, currentReference, nextReference);
  }

  function cancelGlobalLineTransition() {
    setTransitionDialog(null);
  }

  function confirmGlobalLineTransition() {
    if (!transitionDialog) return;
    if (transitionDialog.direction === "local-to-global") {
      const nextNode = transitionDialog.nextNode;
      setTransitionDialog(null);
      requestExistingNodeGlobalLinePlacement(nextNode);
      return;
    }
    const latestScope = latestScopeRef.current;
    const currentNodes = Array.isArray(latestScope.nodes) ? latestScope.nodes as ModelNode[] : [];
    const localBaseNode = removeGlobalLineIdentityForLocalNode(transitionDialog.nextNode);
    const localCounters = deriveLocalDeviceIndexCounters(currentNodes);
    const indexed = latestScope.assignPermanentDeviceIndex?.(localBaseNode, localCounters) ?? { node: localBaseNode, counters: localCounters };
    latestScope.pushUndoSnapshot?.(true, false, undefined, "线路切换为本图维护", indexed.node.name);
    latestScope.setDeviceIndexCounters?.(indexed.counters);
    latestScope.patchGraphNodes?.([indexed.node]);
    latestScope.setCanvasSelectionScope?.("group");
    latestScope.setSelectedNodeIds?.([indexed.node.id]);
    latestScope.setSelectedEdgeId?.("");
    latestScope.setSelectedEdgeIds?.([]);
    latestScope.writeOperationLog?.(`线路切换为本图维护：${indexed.node.name}`);
    const nextNodes = currentNodes.map((node) => node.id === indexed.node.id ? indexed.node : node);
    void syncGlobalLineProjectNodes(nextNodes, false).catch((error) => {
      latestScope.writeOperationLog?.(error instanceof Error ? error.message : "同步全局线路失败。");
    });
    setTransitionDialog(null);
  }

  async function finalizeSavedGlobalLineProjectNodes(savedNodes: ModelNode[]) {
    const latestScope = latestScopeRef.current;
    let nextRecords = records;
    try {
      nextRecords = await loadRecords();
    } catch (error) {
      latestScope.writeOperationLog?.(error instanceof Error ? error.message : "保存后刷新全局线路列表失败。");
    }
    const canonicalNodes = applyGlobalLineRecordsToNodes(savedNodes, nextRecords, modelKey);
    const latestNodes = Array.isArray(latestScope.nodes) ? latestScope.nodes as ModelNode[] : [];
    if (JSON.stringify(latestNodes) === JSON.stringify(canonicalNodes)) return latestNodes;
    if (latestScope.suppressNextGraphDirtyRef?.current !== undefined) {
      latestScope.suppressNextGraphDirtyRef.current += 1;
    }
    latestScope.setNodes?.(canonicalNodes);
    return canonicalNodes;
  }

  Object.assign(scope, {
    globalLineRecords: displayRecords,
    globalLinePlacementDialog: dialog,
    globalLinePlacementCandidates: candidates,
    globalLineTransitionDialog: transitionDialog,
    setGlobalLinePlacementDialog: setDialog,
    requestGlobalLinePlacement,
    attachGlobalLineForNode,
    confirmGlobalLinePlacement,
    cancelGlobalLinePlacement,
    requestGlobalLineTransition,
    globalLineBoundaryAdjustmentConflictMessage,
    confirmGlobalLineTransition,
    cancelGlobalLineTransition,
    syncGlobalLineProjectNodes,
    loadGlobalLineRecords,
    globalLinePlacementConflictMessageForId,
    finalizeSavedGlobalLineProjectNodes
  });

  return { records: displayRecords, persistedRecords: records, dialog, candidates, transitionDialog };
}
