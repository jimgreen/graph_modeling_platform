import { useEffect, useMemo, useRef, useState } from "react";
import { apiPath } from "../config";
import type { DeviceTemplate, ModelNode, Point } from "../model";
import {
  applyGlobalLineRecordToNode,
  applyGlobalLineRecordsToNodes,
  candidateGlobalLines,
  deriveLocalDeviceIndexCounters,
  globalLineBoundaryAdjustmentConflictMessage as globalLineBoundaryAdjustmentConflictMessageForRecord,
  globalLineEnergyTypeForKind,
  globalLineModelKey,
  globalLineSharedParamsFromNode,
  isManagedGlobalLineModelType,
  isGlobalLineBoundaryNode,
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
type GlobalLineRecordResponse = { ok?: boolean; record?: GlobalLineRecord; error?: string };
type GlobalLineSyncResponse = GlobalLineListResponse & { nodes?: ModelNode[]; assignments?: Record<string, string> };

async function responseError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload?.error === "string" ? payload.error : fallback;
}

async function fetchJson<T>(url: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await responseError(response, fallback));
  return await response.json() as T;
}

function jsonRequest(method: "POST" | "PUT", body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
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
  const [readyModelKey, setReadyModelKey] = useState("");
  const latestScopeRef = useRef(scope);
  latestScopeRef.current = scope;

  const projectIdx = Number(scope.projectIdx);
  const projectName = String(scope.projectName ?? "").trim();
  const modelType = String(scope.modelType ?? "");
  const schemePath = schemePathFromScope(scope);
  const modelKey = globalLineModelKey(projectIdx, schemePath, projectName);
  const nodes = Array.isArray(scope.nodes) ? scope.nodes as ModelNode[] : [];

  const candidates = useMemo(() => dialog
    ? candidateGlobalLines(records, dialog.energyType, modelKey, dialog.boundaryEndpoint)
    : [], [dialog?.boundaryEndpoint, dialog?.energyType, modelKey, records]);

  async function loadRecords() {
    const payload = await fetchJson<GlobalLineListResponse>(apiPath("/global-lines"), "读取全局线路列表失败。");
    const nextRecords = Array.isArray(payload.records) ? payload.records : [];
    setRecords(nextRecords);
    return nextRecords;
  }

  async function syncGlobalLineProjectNodes(requestNodes: ModelNode[], applyHydration = true) {
    if (!isManagedGlobalLineModelType(modelType)) return [] as GlobalLineRecord[];
    const payload = {
      projectIdx,
      projectName,
      schemePath,
      modelType,
      nodes: requestNodes
    };
    const result = await fetchJson<GlobalLineSyncResponse>(
      apiPath("/global-lines/sync-project"),
      "同步全局线路失败。",
      jsonRequest("POST", payload)
    );
    const nextRecords = Array.isArray(result.records) ? result.records : [];
    setRecords(nextRecords);
    if (applyHydration) {
      const latestScope = latestScopeRef.current;
      const latestNodes = Array.isArray(latestScope.nodes) ? latestScope.nodes as ModelNode[] : [];
      if (latestNodes === requestNodes) {
        const hydratedNodes = applyGlobalLineRecordsToNodes(latestNodes, nextRecords, modelKey);
        if (hydratedNodes !== latestNodes) latestScope.setNodes?.(hydratedNodes);
      }
    }
    return nextRecords;
  }

  useEffect(() => {
    let cancelled = false;
    setReadyModelKey("");
    void loadRecords().then((nextRecords) => {
      if (cancelled) return;
      const latestScope = latestScopeRef.current;
      const latestNodes = Array.isArray(latestScope.nodes) ? latestScope.nodes as ModelNode[] : [];
      const hydratedNodes = applyGlobalLineRecordsToNodes(latestNodes, nextRecords, modelKey);
      if (hydratedNodes !== latestNodes) {
        latestScope.setNodes?.(hydratedNodes);
      }
      setReadyModelKey(modelKey);
    }).catch((error) => {
      if (cancelled) return;
      setReadyModelKey(modelKey);
      const message = error instanceof Error ? error.message : "读取全局线路列表失败。";
      latestScopeRef.current.writeOperationLog?.(message);
    });
    return () => {
      cancelled = true;
    };
  }, [modelKey]);

  useEffect(() => {
    if (readyModelKey !== modelKey || !isManagedGlobalLineModelType(modelType)) return;
    const requestNodes = nodes;
    const timer = window.setTimeout(() => {
      void syncGlobalLineProjectNodes(requestNodes).catch((error) => {
        const message = error instanceof Error ? error.message : "同步全局线路失败。";
        latestScopeRef.current.writeOperationLog?.(message);
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [modelKey, modelType, nodes, projectIdx, projectName, readyModelKey, schemePath.join("\u0000")]);

  function requestGlobalLinePlacement(
    template: DeviceTemplate,
    source: ConnectTarget,
    target: ConnectTarget,
    manualPoints?: Point[]
  ) {
    const energyType = globalLineEnergyTypeForKind(template.kind);
    if (!energyType) return false;
    const boundaryEndpoint = boundaryEndpointForConnectTargets(source, target);
    if (!boundaryEndpoint) return false;
    const initialCandidates = candidateGlobalLines(records, energyType, modelKey, boundaryEndpoint);
    setDialog({
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
      name: nextDefaultLineName(records, energyType, template),
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
          : nextCandidates[0]?.id ?? "",
        name: current.name || nextDefaultLineName(nextRecords, energyType, template)
      } : current);
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
      name: node.name.trim() || nextDefaultLineName(records, energyType),
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
    const payload = {
      ...(choice.mode === "existing" ? { globalLineId: choice.globalLineId } : { name: choice.name }),
      energyType,
      node: { id: node.id, kind: node.kind, name: choice.mode === "new" ? choice.name : node.name, params: globalLineSharedParamsFromNode(node) },
      reference: modelReferenceFromScope(latestScopeRef.current, node.id, node)
    };
    const result = await fetchJson<GlobalLineRecordResponse>(
      apiPath("/global-lines/attach"),
      "保存全局线路失败。",
      jsonRequest("POST", payload)
    );
    if (!result.record) throw new Error("后台没有返回全局线路记录。");
    setRecords((current) => [...current.filter((item) => item.id !== result.record!.id), result.record!].sort((a, b) => a.idx - b.idx));
    return result.record;
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
        void loadRecords();
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
      void loadRecords();
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
    const record = records.find((item) => item.id === globalLineId);
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

  Object.assign(scope, {
    globalLineRecords: records,
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
    syncGlobalLineProjectNodes
  });

  return { records, dialog, candidates, transitionDialog };
}
