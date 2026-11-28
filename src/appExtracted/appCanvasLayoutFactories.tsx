/** 画布布局对齐、自动排布与连接线重绘工厂模块。 */

import type { ProjectCanvasScope } from "./appScopeTypes";
import { migrateLegacyCanvasBackground } from "../canvasTheme";
import { setSkipSaveCheck } from "./appDeviceDefinitionFactories";
import { switchToSpace } from "../spaceSwitch";
import { promptText } from "../globalDialogs";
import { findSavedProjectByIndex } from "../workspaceUrl";
import {
  rebuildContainerExemptConnectionRoutes,
  rebuildContainerExemptRoutableLineDeviceRoutes,
  reconcileTransformerSideVoltageParamsWithTerminals,
} from "../model-routing";
import { normalizeInboundContainerNode, withNodeUpdates } from "../acContainer";
import { runBatchRedrawRoutesInWorker, shouldOffloadBatchRerouteToWorker } from "../routing/routeWorkerClient";
import { modelTrace } from "../modelTrace";
import {
  fetchBackendProjectRecord as fetchBackendProjectRecordDirect,
  savedProjectRecordIsSummary as savedProjectRecordIsSummaryDirect,
} from "./appPersistenceLibraryExport";
import type {
  AlignMode,
  Edge,
  ModelLayer,
  ModelNode,
  SavedProjectRecord,
  SavedSchemeRecord,
} from "../model";
import type { ConnectionRedrawScope, UnsavedChangeAction } from "./appCoreCanvasUtilities";
import type { CanvasLayoutUnit } from "../selectionActions";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { projectMoveDebug } from "./appProjectRecordFactories";

export function createOpenVoltageBaseSetDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { defaultVoltageBaseSetValue, defaultVoltageBaseTerminalKey, defaultVoltageBaseTerminalValues, recommendedVoltageBaseSetMode, setActiveVoltageBaseTerminalKey, setVoltageBaseSetDialogOpen, setVoltageBaseSetMode, setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValues } = __appScope;
    const terminalValues = defaultVoltageBaseTerminalValues();
    setVoltageBaseSetScope("island");
    setVoltageBaseSetValue(defaultVoltageBaseSetValue());
    setVoltageBaseTerminalValues(terminalValues);
    setActiveVoltageBaseTerminalKey(defaultVoltageBaseTerminalKey());
    setVoltageBaseSetMode(recommendedVoltageBaseSetMode());
    setVoltageBaseSetDialogOpen(true);
  };
}

export function createConfirmVoltageBaseSetDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { VOLTAGE_BASE_SET_SCOPE_LABELS, activeVoltageBaseTerminalValues, hasVoltageBaseTerminalValues, patchGraphNodes, pushUndoSnapshot, undoScopeForGraphPatch, validateTwoTerminalVoltageBaseConsistency, voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetValue, writeOperationLog } = __appScope;
    const value = voltageBaseSetValue.trim();
    const terminalMode = voltageBaseSetMode === "terminal";
    if ((voltageBaseSetMode === "terminal" || (voltageBaseSetMode === "byDevice" && voltageBaseSetHasTerminalTargets)) && !hasVoltageBaseTerminalValues(activeVoltageBaseTerminalValues())) {
      writeOperationLog("端子电压基值不能为空");
      return;
    }
    if ((voltageBaseSetMode === "uniform" || (voltageBaseSetMode === "byDevice" && voltageBaseSetHasUniformTargets)) && !value) {
      writeOperationLog("设置电压基值不能为空");
      return;
    }
    const result = voltageBaseSetResultForScope(voltageBaseSetScope);
    const scopeLabel = VOLTAGE_BASE_SET_SCOPE_LABELS[voltageBaseSetScope];
    if (result.changedNodeIds.length === 0) {
      writeOperationLog(`${scopeLabel}没有需要设置的电压基值`);
      return;
    }
    const voltageBaseMismatches = validateTwoTerminalVoltageBaseConsistency(result.nodes);
    if (voltageBaseMismatches.length > 0) {
      const examples = voltageBaseMismatches.slice(0, 8).map((item: any) =>
        `${item.nodeName}：${item.sourceTerminalLabel} ${item.sourceVoltageBase} / ${item.targetTerminalLabel} ${item.targetVoltageBase}`
      );
      const suffix = voltageBaseMismatches.length > examples.length ? `\n等 ${voltageBaseMismatches.length} 个两端设备。` : "";
      showGlobalMessage(`两端设备的电压基值必须相同，无法保存本次人工设置。\n\n${examples.join("\n")}${suffix}`);
      writeOperationLog(`设置电压基值失败：${voltageBaseMismatches.length} 个两端设备电压基值不一致`);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
    patchGraphNodes(result.nodeUpdates);
    writeOperationLog(`设置电压基值（${scopeLabel}）：${result.changedNodeIds.length}/${result.targetNodeIds.length} 个设备，${voltageBaseSetModeLabel}${terminalMode ? "" : `，值 ${value}`}`);
  };
}

export function createOpenVoltageBaseClearDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { activeSelectedNodeIds, setVoltageBaseClearDialogOpen, setVoltageBaseClearScope } = __appScope;
    setVoltageBaseClearScope(activeSelectedNodeIds.length > 0 ? "selected" : "all");
    setVoltageBaseClearDialogOpen(true);
  };
}

export function createConfirmVoltageBaseClearDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { VOLTAGE_BASE_CLEAR_SCOPE_LABELS, patchGraphNodes, pushUndoSnapshot, setVoltageBaseClearDialogOpen, undoScopeForGraphPatch, voltageBaseClearResultForScope, voltageBaseClearScope, writeOperationLog } = __appScope;
    const result = voltageBaseClearResultForScope(voltageBaseClearScope);
    const scopeLabel = VOLTAGE_BASE_CLEAR_SCOPE_LABELS[voltageBaseClearScope];
    if (result.changedNodeIds.length === 0) {
      writeOperationLog(`${scopeLabel}没有可清空的电压基值`);
      setVoltageBaseClearDialogOpen(false);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
    patchGraphNodes(result.nodeUpdates);
    writeOperationLog(`清空电压基值（${scopeLabel}）：${result.changedNodeIds.length}/${result.targetNodeIds.length} 个设备`);
    setVoltageBaseClearDialogOpen(false);
  };
}

export function createConnectionRedrawViewportBounds(__appScope: ProjectCanvasScope) {
  return () => {
  const { canvasVisibleViewBoxRef, viewBox } = __appScope;
    const visible = canvasVisibleViewBoxRef.current.width > 0 && canvasVisibleViewBoxRef.current.height > 0
      ? canvasVisibleViewBoxRef.current
      : viewBox;
    return {
      left: visible.x,
      right: visible.x + visible.width,
      top: visible.y,
      bottom: visible.y + visible.height
    };
  };
}

export function createConnectionRedrawEdgeIdsForScope(__appScope: ProjectCanvasScope) {
  return (scope: ConnectionRedrawScope) => {
  const { activeLayerEdgeIdSet, activeLayerEdges, activeSelectedEdgeIds, connectionRedrawViewportBounds, queryRouteSpatialIndex, routedEdgeSpatialIndex } = __appScope;
    if (scope === "selected") {
      return activeSelectedEdgeIds.filter((edgeId: string, index: number, list: string[]) =>
        activeLayerEdgeIdSet.has(edgeId) && list.indexOf(edgeId) === index
      );
    }
    if (scope === "all") {
      return activeLayerEdges.map((edge: Edge) => edge.id);
    }

    const viewportBounds = connectionRedrawViewportBounds();
    const edgeIds: string[] = [];
    const seenEdgeIds = new Set<string>();
    for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, viewportBounds)) {
      if (seenEdgeIds.has(route.edgeId) || !activeLayerEdgeIdSet.has(route.edgeId)) {
        continue;
      }
      seenEdgeIds.add(route.edgeId);
      edgeIds.push(route.edgeId);
    }
    return edgeIds;
  };
}

export function createConnectionRedrawLineNodeIdsForScope(__appScope: ProjectCanvasScope) {
  return (scope: ConnectionRedrawScope) => {
  const { activeLayerNodeIdSet, activeLayerNodes, activeSelectedNodeIds, connectionRedrawViewportBounds, isRoutableLineDeviceKind, nodeById, queryNodeSpatialIndex, visibleNodeSpatialIndex } = __appScope;
    const appendLineNodeId = (node: ModelNode | undefined, lineNodeIds: string[], seenNodeIds: Set<string>) => {
      if (!node || seenNodeIds.has(node.id) || !activeLayerNodeIdSet.has(node.id) || !isRoutableLineDeviceKind(node.kind)) {
        return;
      }
      seenNodeIds.add(node.id);
      lineNodeIds.push(node.id);
    };

    if (scope === "selected") {
      const lineNodeIds: string[] = [];
      const seenNodeIds = new Set<string>();
      for (const nodeId of activeSelectedNodeIds) {
        appendLineNodeId(nodeById.get(nodeId), lineNodeIds, seenNodeIds);
      }
      return lineNodeIds;
    }
    if (scope === "all") {
      return activeLayerNodes.filter((node: ModelNode) => isRoutableLineDeviceKind(node.kind)).map((node: ModelNode) => node.id);
    }

    const viewportBounds = connectionRedrawViewportBounds();
    const lineNodeIds: string[] = [];
    const seenNodeIds = new Set<string>();
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, viewportBounds)) {
      appendLineNodeId(node, lineNodeIds, seenNodeIds);
    }
    return lineNodeIds;
  };
}

export function createConnectionRedrawTargetsForScope(__appScope: ProjectCanvasScope) {
  return (scope: ConnectionRedrawScope) => {
  const { connectionRedrawEdgeIdsForScope, connectionRedrawLineNodeIdsForScope } = __appScope;
    const edgeIds = connectionRedrawEdgeIdsForScope(scope);
    const lineNodeIds = connectionRedrawLineNodeIdsForScope(scope);
    return {
      edgeIds,
      lineNodeIds,
      total: edgeIds.length + lineNodeIds.length
    };
  };
}

let activeBatchRedrawAbortController: AbortController | null = null;

export function createRedrawConnectionRoutes(__appScope: ProjectCanvasScope) {
  return (scope: ConnectionRedrawScope) => {
  const { CONNECTION_REDRAW_SCOPE_LABELS, activeProjectKey, canvasBounds, connectionRedrawTargetsForScope, edges, latestEdgesRef, latestNodesRef, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, patchGraphEdges, patchGraphNodes, pushUndoSnapshot, redrawConnectionRoutesForEdges, redrawRoutableLineDeviceRoutes, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    const { edgeIds: targetEdgeIds, lineNodeIds: targetLineNodeIds, total: targetCount } = connectionRedrawTargetsForScope(scope);
    const scopeLabel = CONNECTION_REDRAW_SCOPE_LABELS[scope];
    if (targetCount === 0) {
      writeOperationLog(`${scopeLabel}为空，未执行连接线重绘`);
      return;
    }

    const commitRedrawResult = (changedEdges: Edge[], changedLineNodes: ModelNode[]) => {
      const latestScope = (__appScope.__appScopeRef?.current as Record<string, any> | undefined) ?? __appScope;
      if (changedEdges.length === 0 && changedLineNodes.length === 0) {
        (latestScope.writeOperationLog ?? writeOperationLog)(`${scopeLabel}重绘未产生变化`);
        return;
      }

      const changedEdgeIds = changedEdges.map((edge) => edge.id);
      const changedNodeIds = changedLineNodes.map((node: ModelNode) => node.id);
      (latestScope.pushUndoSnapshot ?? pushUndoSnapshot)(true, false, (latestScope.undoScopeForGraphPatch ?? undoScopeForGraphPatch)(changedNodeIds, changedEdgeIds));
      if (changedEdgeIds.length > 0) {
        (latestScope.markRouteEdgesDirty ?? markRouteEdgesDirty)(changedEdgeIds);
        (latestScope.markStoredRouteEdgesDirty ?? markStoredRouteEdgesDirty)(changedEdgeIds);
        (latestScope.patchGraphEdges ?? patchGraphEdges)(changedEdges);
      }
      if (changedLineNodes.length > 0) {
        (latestScope.patchGraphNodes ?? patchGraphNodes)(changedLineNodes);
      }
      (latestScope.writeOperationLog ?? writeOperationLog)(`重绘${scopeLabel}：${changedEdges.length}/${targetEdgeIds.length} 条连接线，${changedLineNodes.length}/${targetLineNodeIds.length} 条可变线路`);
    };

    if (shouldOffloadBatchRerouteToWorker(targetCount)) {
      activeBatchRedrawAbortController?.abort();
      const controller = new AbortController();
      activeBatchRedrawAbortController = controller;
      const startProjectKey = activeProjectKey;
      const startNodes = nodes;
      const startEdges = edges;
      writeOperationLog(`正在后台重绘${scopeLabel}（${targetCount} 条）...`);
      void runBatchRedrawRoutesInWorker(
        { nodes, edges, targetEdgeIds, targetLineNodeIds, bounds: canvasBounds },
        { signal: controller.signal }
      )
        .then(({ changedEdges, changedLineNodes }) => {
          if (controller.signal.aborted) {
            return;
          }
          if (activeBatchRedrawAbortController === controller) {
            activeBatchRedrawAbortController = null;
          }
          const latestScope = (__appScope.__appScopeRef?.current as Record<string, any> | undefined) ?? __appScope;
          if (
            latestScope.activeProjectKey !== startProjectKey ||
            (latestNodesRef && latestNodesRef.current !== startNodes) ||
            (latestEdgesRef && latestEdgesRef.current !== startEdges)
          ) {
            return;
          }
          commitRedrawResult(changedEdges, changedLineNodes);
        })
        .catch((error: any) => {
          if (error?.name === "AbortError" || controller.signal.aborted) {
            return;
          }
          if (activeBatchRedrawAbortController === controller) {
            activeBatchRedrawAbortController = null;
          }
        });
      return;
    }

    const nextEdges = targetEdgeIds.length > 0
      ? redrawConnectionRoutesForEdges(nodes, edges, targetEdgeIds, canvasBounds)
      : edges;
    const changedEdges: Edge[] = [];
    for (let index = 0; index < nextEdges.length; index += 1) {
      if (nextEdges[index] !== edges[index]) {
        changedEdges.push(nextEdges[index]);
      }
    }
    const changedLineNodes = targetLineNodeIds.length > 0
      ? redrawRoutableLineDeviceRoutes(nodes, targetLineNodeIds, canvasBounds)
      : [];
    commitRedrawResult(changedEdges, changedLineNodes);
  };
}

export function createOpenConnectionRedrawDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { connectionRedrawTargetsForScope, setConnectionRedrawDialogOpen, setConnectionRedrawScope } = __appScope;
    setConnectionRedrawScope(connectionRedrawTargetsForScope("selected").total > 0 ? "selected" : "viewport");
    setConnectionRedrawDialogOpen(true);
  };
}

export function createConfirmConnectionRedrawDialog(__appScope: ProjectCanvasScope) {
  return () => {
  const { connectionRedrawScope, redrawConnectionRoutes, setConnectionRedrawDialogOpen } = __appScope;
    redrawConnectionRoutes(connectionRedrawScope);
    setConnectionRedrawDialogOpen(false);
  };
}

export function createAlignSelected(__appScope: ProjectCanvasScope) {
  return (direction: AlignMode) => {
  const { alignNodeLayoutUnits, applySelectedNodeLayout, selectedLayoutUnitCount, writeOperationLog } = __appScope;
    applySelectedNodeLayout(2, (currentNodes: ModelNode[], currentLayoutUnits: CanvasLayoutUnit[]) => alignNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 2) {
      const labelByDirection: Record<AlignMode, string> = {
        horizontal: "横向",
        vertical: "纵向",
        left: "左",
        right: "右",
        top: "上",
        bottom: "下"
      };
      writeOperationLog(`${labelByDirection[direction]}对齐 ${selectedLayoutUnitCount} 个单元`);
    }
  };
}

export function createDistributeSelected(__appScope: ProjectCanvasScope) {
  return (direction: "horizontal" | "vertical") => {
  const { applySelectedNodeLayout, distributeNodeLayoutUnits, selectedLayoutUnitCount, writeOperationLog } = __appScope;
    applySelectedNodeLayout(3, (currentNodes: ModelNode[], currentLayoutUnits: CanvasLayoutUnit[]) => distributeNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 3) {
      writeOperationLog(`${direction === "horizontal" ? "横向" : "纵向"}平均 ${selectedLayoutUnitCount} 个单元`);
    }
  };
}

export function createToggleSchemeExpanded(__appScope: ProjectCanvasScope) {
  return (schemeId: string) => {
  const { setExpandedSchemeIds } = __appScope;
    setExpandedSchemeIds((current: string[]) =>
      current.includes(schemeId) ? current.filter((id: string) => id !== schemeId) : [...current, schemeId]
    );
  };
}

export function createPromptUniqueRecordName(__appScope: ProjectCanvasScope) {
  return (
    promptText: string,
    defaultName: string,
    existingNames: string[],
    emptyMessage: string,
    duplicateMessage: string
  ) => {
  const { hasSameName } = __appScope;
    const inputName = window.prompt(promptText, defaultName);
    if (inputName === null) {
      return null;
    }
    const name = inputName.trim();
    if (!name) {
      showGlobalMessage(emptyMessage);
      return null;
    }
    if (hasSameName(name, existingNames)) {
      showGlobalMessage(duplicateMessage);
      return null;
    }
    return name;
  };
}

export function createCloneProjectRecordForPaste(__appScope: ProjectCanvasScope) {
  return (project: SavedProjectRecord, name = project.name, existingProjectId?: string) => {
  const { cloneProjectRecordWithName } = __appScope;
    const record = cloneProjectRecordWithName(project, name);
    return existingProjectId
      ? { ...record, id: existingProjectId, name: record.name, project: { ...record.project, name: record.name } }
      : record;
  };
}

export function createSchemePathForScheme(__appScope: ProjectCanvasScope) {
  return (schemeId: string, sourceSchemes?: SavedSchemeRecord[]) => {
  const { findSavedSchemeById, savedSchemePathForId, schemes } = __appScope;
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const scheme = findSavedSchemeById(sourceSchemes, schemeId);
    return scheme ? savedSchemePathForId(sourceSchemes, scheme.id) ?? [scheme.name] : [];
  };
}

export function createSchemePathForProject(__appScope: ProjectCanvasScope) {
  return (projectId: string, sourceSchemes?: SavedSchemeRecord[]) => {
  const { findSavedProjectRecordInSchemes, savedSchemePathForId, schemes } = __appScope;
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const owner = findSavedProjectRecordInSchemes(sourceSchemes, projectId);
    return owner ? savedSchemePathForId(sourceSchemes, owner.scheme.id) ?? [owner.scheme.name] : [];
  };
}

export function createSchemePathForRecord(__appScope: ProjectCanvasScope) {
  return (scheme: SavedSchemeRecord) => {
  const { schemePathForScheme } = __appScope;
    const existingPath = schemePathForScheme(scheme.id);
    return existingPath.length > 0 ? existingPath : [scheme.name];
  };
}

export function createCloneSchemeRecord(__appScope: ProjectCanvasScope) {
  return (scheme: SavedSchemeRecord, existingNames?: string[], suffix = "副本"): SavedSchemeRecord => {
  const { copySavedSchemeWithUniqueName, savedChildSchemeNames, schemes } = __appScope;
    if (existingNames === undefined) {
      existingNames = savedChildSchemeNames(schemes);
    }
    return copySavedSchemeWithUniqueName(scheme, existingNames, suffix);
  };
}

export function createCloneSchemeRecordWithName(__appScope: ProjectCanvasScope) {
  return (scheme: SavedSchemeRecord, name: string): SavedSchemeRecord => {
  const { cloneSchemeRecordForPaste } = __appScope;
    return cloneSchemeRecordForPaste(scheme, name);
  };
}

export function createCloneSchemeRecordForPaste(__appScope: ProjectCanvasScope) {
  return (scheme: SavedSchemeRecord, name = scheme.name, existingScheme?: SavedSchemeRecord): SavedSchemeRecord => {
  const { cloneProjectRecordForPaste, cloneSchemeRecordForPaste, createSavedScheme, hasSameName, upsertSavedProject } = __appScope;
    const projects = scheme.projects.reduce<SavedProjectRecord[]>((current, project) => {
      const duplicateProject = existingScheme?.projects.find((item) => hasSameName(item.name, [project.name]));
      return upsertSavedProject(current, cloneProjectRecordForPaste(project, project.name, duplicateProject?.id));
    }, []);
    const existingChildren = existingScheme?.children ?? [];
    const children = (scheme.children ?? []).reduce<SavedSchemeRecord[]>((current, child) => {
      const duplicateChild = existingChildren.find((item) => hasSameName(item.name, [child.name]));
      return [...current, cloneSchemeRecordForPaste(child, child.name, duplicateChild)];
    }, []);
    const record = createSavedScheme(name, projects, children);
    return existingScheme ? { ...record, id: existingScheme.id, name: record.name } : record;
  };
}

export function createClearActiveProjectDisplay(__appScope: ProjectCanvasScope) {
  return (logMessage: string) => {
  const { DEFAULT_CANVAS_BACKGROUND, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, DEFAULT_CURRENT_UNIT, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, EMPTY_PROJECT_MEASUREMENTS, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, cachedRoutedEdgesRef, canvasFrameRef, canvasFullViewBoxFromBounds, clearNodeDragMoveSchedule, clearRecordSelection, clearRefreshRecoveryProject, currentModelSelectionRef, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, dragUndoCapturedRef, draggingRef, fitWholeCanvasViewBox, hideImperativeMultiNodeDragOverlay, lastBusTerminalSyncEndpointRevisionRef, normalizeModelLayers, pendingBusTerminalSyncNodeIdsRef, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, requestCanvasFrameCenter, resetConnectPreviewState, saveActiveProjectPointer, setActiveLayerId, setActiveProjectKey, setActiveSchemeKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasHeight, setCanvasPanning, setCanvasResizeDraft, setCanvasSelectionScope, setCanvasSizeDraft, setCanvasVisibleViewBox, setCanvasWidth, setConnectSource, setContextMarqueeSelection, setContextMenu, setCurrentUnit, setDeviceIndexCounters, setDragging, setGraphArrays, setGroups, setHasUnsavedChanges, setInitialCanvasDetailHydrationLimit, setInitialCanvasLodActive, setLayers, setLibraryPlacement, setManualPathDrag, setMarquee, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setPowerBaseValue, setPowerUnit, setProjectMeasurements, setProjectMenu, setProjectName, setRewiring, setRoutableLineEndpointDrag, setRoutableLinePlacement, setRoutableLinePreview, setRouteRenderingReady, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, setTerminalPress, setTopology, setTopologyErrors, setTopologyStatus, setTransformDrag, setUndoStack, setViewBox, setVoltageUnit, suppressNextGraphDirtyRef, writeOperationLog } = __appScope;
    currentModelSelectionRef.current = { projectKey: "", schemeKey: "", loading: false };
    clearRefreshRecoveryProject();
    const emptyCanvasBounds = {
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT
    };
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
    hideImperativeMultiNodeDragOverlay();
    dragUndoCapturedRef.current = false;
    cachedRoutedEdgesRef.current = [];
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
    lastBusTerminalSyncEndpointRevisionRef.current = -1;
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    suppressNextGraphDirtyRef.current += 1;
    if (__appScope.undoStackRef) __appScope.undoStackRef.current = [];
    if (__appScope.redoStackRef) __appScope.redoStackRef.current = [];
    if (__appScope.currentMutationRevisionRef) __appScope.currentMutationRevisionRef.current = 0;
    if (__appScope.savedMutationRevisionRef) __appScope.savedMutationRevisionRef.current = 0;
    if (__appScope.savedUndoStackLengthRef) __appScope.savedUndoStackLengthRef.current = 0;
    setUndoStack([]);
    __appScope.setRedoStack?.([]);
    setProjectName("");
    setCanvasWidth(emptyCanvasBounds.width);
    setCanvasHeight(emptyCanvasBounds.height);
    setCanvasSizeDraft({ width: String(emptyCanvasBounds.width), height: String(emptyCanvasBounds.height) });
    setAllowAutoExpandCanvas(true);
    setCanvasBackgroundColor(DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage("");
    setCanvasBackgroundImageAssetId("");
    setBackgroundProjectId("");
    setBackgroundLayerIds([]);
    setPowerUnit(DEFAULT_POWER_UNIT);
    setVoltageUnit(DEFAULT_VOLTAGE_UNIT);
    setCurrentUnit(DEFAULT_CURRENT_UNIT);
    setPowerBaseValue(DEFAULT_POWER_BASE_VALUE);
    setViewBox(fitWholeCanvasViewBox(emptyCanvasBounds, canvasFrameRef.current));
    setCanvasVisibleViewBox(canvasFullViewBoxFromBounds(emptyCanvasBounds));
    setLayers(normalizeModelLayers());
    setActiveLayerId(DEFAULT_MODEL_LAYER_ID);
    setDeviceIndexCounters({});
    setGraphArrays([], []);
    setGroups([]);
    setProjectMeasurements(EMPTY_PROJECT_MEASUREMENTS);
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setInitialCanvasLodActive(false);
    setInitialCanvasDetailHydrationLimit(0);
    setActiveProjectKey("");
    setActiveSchemeKey("");
    clearRecordSelection();
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRoutableLinePreview({ path: "", targetPoint: null });
    setStaticDrawing(null);
    setLibraryPlacement(null);
    setRoutableLinePlacement(null);
    setRoutableLineEndpointDrag(null);
    setRewiring(null);
    setTerminalPress(null);
    setNodeLabelDrag(null);
    setNodeLabelRotateDrag(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setCanvasResizeDraft(null);
    setDragging(null);
    hideImperativeMultiNodeDragOverlay();
    setMarquee(null);
    setContextMarqueeSelection(null);
    setModifierSelectionPress(null);
    setCanvasPanning(null);
    setContextMenu(null);
    setProjectMenu(null);
    setHasUnsavedChanges(false);
    saveActiveProjectPointer("", "");
    writeOperationLog(logMessage);
    requestCanvasFrameCenter();
  };
}

function findSchemeForProjectInList(
  records: readonly SavedSchemeRecord[] | undefined,
  projectId: string
): SavedSchemeRecord | undefined {
  if (!Array.isArray(records) || !projectId) {
    return undefined;
  }
  for (const scheme of records) {
    if (Array.isArray(scheme.projects) && scheme.projects.some((item: SavedProjectRecord) => item.id === projectId)) {
      return scheme;
    }
    const nested = findSchemeForProjectInList(scheme.children, projectId);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

export function createLoadSavedProject(__appScope: ProjectCanvasScope) {
  return (project: SavedProjectRecord, schemeId?: string) => {
    modelTrace("load-project-commit-start", {
      projectId: project.id,
      projectName: project.name,
      schemeId,
      previousActiveProjectKey: __appScope.activeProjectKey,
      previousProjectName: __appScope.projectName,
      nodeCount: project.project?.nodes?.length ?? 0
    });
  const { CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH, DEFAULT_CURRENT_UNIT, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, assignMissingDeviceIndexes, cachedRoutedEdgesRef, canvasFrameRef, clearNodeDragMoveSchedule, clearRefreshRecoveryProject, currentModelSelectionRef, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, dragUndoCapturedRef, draggingRef, findSchemeForProject, fitWholeCanvasViewBox, hideImperativeMultiNodeDragOverlay, isLineSegmentBusNode, isRoutableLineDeviceKind, lastBusTerminalSyncEndpointRevisionRef, libraryTemplateByKind, lockProjectEdgeTerminals, measurementConfig, normalizeModelGroups, normalizeNodeTerminalsByTemplate, normalizeNodeTerminalsWithTemplate, normalizeProjectLayers, normalizeProjectMeasurements, pendingBusTerminalSyncNodeIdsRef, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, rebuildRoutableLineDeviceRouteUpdates, reconcileNodeWithDefinition, reconcileProjectMeasurementsWithConfig, requestCanvasFrameCenter, resetConnectPreviewState, resolveConfiguredBackgroundLayerIds, selectSingleProject, setActiveLayerId, setActiveProjectKey, setActiveSchemeKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasHeight, setCanvasPanning, setCanvasSelectionScope, setCanvasVisibleViewBox, setCanvasWidth, setConnectSource, setCurrentUnit, setDeviceIndexCounters, setDragging, setElectricFlowSettings, setElectricFlowVisible, setFeeder, setGraphArrays, setGroups, setHasUnsavedChanges, setInitialCanvasDetailHydrationLimit, setInitialCanvasLodActive, setLayers, setManualPathDrag, setMarquee, setModelType, setModifierSelectionPress, setPowerBaseValue, setPowerUnit, setProjectIdx, setProjectMeasurements, setProjectName, setRewiring, setRouteRenderingReady, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSubcontrolarea, setSubstation, setTaiqu, setTerminalPress, setTopology, setTopologyErrors, setTopologyStatus, setTransformDrag, setUndoStack, setViewBox, setVoltageUnit, suppressNextGraphDirtyRef, writeOperationLog } = __appScope;
    const latestScope = (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    if (!schemeId) {
      schemeId =
        findSchemeForProjectInList(latestScope.schemes ?? __appScope.schemes, project.id)?.id ??
        findSchemeForProject(project.id)?.id ??
        "";
    }
    clearRefreshRecoveryProject();
    // 存量数据修复：分侧电压参数与端子 vbase 曾因侧位表写错而分叉（右侧面板读参数、
    // 【设置电压基值】与着色读端子），以**端子为准**对齐一次；不修则那对值永不收敛。
    const normalizedNodes = reconcileTransformerSideVoltageParamsWithTerminals(project.project.nodes.map((node) => {
      const template = libraryTemplateByKind?.get(node.kind);
      // 交流容器:几何恒在 size —— 存量/导入数据里遗留的 scale(改造前的拖角写的就是它)折算进 size。
      // 矩形不变(不跳变),但从此「所见矩形 == eject/入组所用矩形」,不必等用户再拖一次
      if (template) {
        const normalized = normalizeNodeTerminalsWithTemplate(node, template);
        const reconciled = reconcileNodeWithDefinition(normalized, template);
        // Line-segment bus dragging changes instance geometry rather than transform scale.
        // Keep that persisted geometry while still applying parameter/terminal definition updates.
        return normalizeInboundContainerNode(isLineSegmentBusNode(node) && (
          reconciled.size.width !== node.size.width || reconciled.size.height !== node.size.height
        )
          ? { ...reconciled, size: { ...node.size } }
          : reconciled);
      }
      return normalizeInboundContainerNode(libraryTemplateByKind ? node : normalizeNodeTerminalsByTemplate(node));
    }));
    const indexed = assignMissingDeviceIndexes(normalizedNodes, project.project.deviceIndexCounters);
    const lockedProject = lockProjectEdgeTerminals({
      ...project.project,
      nodes: indexed.nodes
    });
    const layeredProject = normalizeProjectLayers(lockedProject);
    const nextCanvasBounds = {
      width: project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      height: project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
    };
    const nextProjectIdx = Number(project.project.idx) || 0;
    const routableLineNodeIds = layeredProject.nodes
      .filter((node: ModelNode) => isRoutableLineDeviceKind(node.kind))
      .map((node: ModelNode) => node.id);
    const shouldRepairStoredRoutesSynchronously =
      routableLineNodeIds.length > 0 &&
      layeredProject.nodes.length <= CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT;
    const repairedLineNodes = shouldRepairStoredRoutesSynchronously
      ? rebuildRoutableLineDeviceRouteUpdates(layeredProject.nodes, routableLineNodeIds, nextCanvasBounds)
      : [];
    const repairedLineNodeById = new Map(repairedLineNodes.map((node: ModelNode) => [node.id, node]));
    const routeSafeNodes = repairedLineNodes.length > 0
      ? layeredProject.nodes.map((node: ModelNode) => repairedLineNodeById.get(node.id) ?? node)
      : layeredProject.nodes;
    // 容器豁免存量回填(设备型线路):端点 refs 连容器内设备的线路设备,存量路径按豁免口径重算(同不写盘,随保存落盘)
    const containerExemptedLineNodes = rebuildContainerExemptRoutableLineDeviceRoutes(routeSafeNodes, nextCanvasBounds);
    const containerSafeNodes = containerExemptedLineNodes.length > 0
      ? withNodeUpdates(routeSafeNodes, containerExemptedLineNodes)
      : routeSafeNodes;
    // 容器豁免存量回填:端点连容器内设备的连线按豁免口径重算(不写盘,随保存落盘)
    const containerExemptedEdges = rebuildContainerExemptConnectionRoutes(containerSafeNodes, layeredProject.edges, nextCanvasBounds);
    const normalizedMeasurements = normalizeProjectMeasurements(layeredProject.measurements, containerSafeNodes);
    const runtimeMeasurementConfig = __appScope.runtimeMeasurementConfig ?? measurementConfig;
    const reconciledMeasurements = typeof reconcileProjectMeasurementsWithConfig === "function" && runtimeMeasurementConfig
      ? reconcileProjectMeasurementsWithConfig(normalizedMeasurements, containerSafeNodes, runtimeMeasurementConfig)
      : normalizedMeasurements;
    const nextViewBox = fitWholeCanvasViewBox(nextCanvasBounds, canvasFrameRef.current);
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
    hideImperativeMultiNodeDragOverlay();
    dragUndoCapturedRef.current = false;
    cachedRoutedEdgesRef.current = [];
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
    lastBusTerminalSyncEndpointRevisionRef.current = -1;
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    suppressNextGraphDirtyRef.current += 1;
    if (__appScope.undoStackRef) __appScope.undoStackRef.current = [];
    if (__appScope.redoStackRef) __appScope.redoStackRef.current = [];
    if (__appScope.currentMutationRevisionRef) __appScope.currentMutationRevisionRef.current = 0;
    if (__appScope.savedMutationRevisionRef) __appScope.savedMutationRevisionRef.current = 0;
    if (__appScope.savedUndoStackLengthRef) __appScope.savedUndoStackLengthRef.current = 0;
    setUndoStack([]);
    __appScope.setRedoStack?.([]);
    setProjectName(project.name);
    setProjectIdx(nextProjectIdx);
    setCanvasWidth(nextCanvasBounds.width);
    setCanvasHeight(nextCanvasBounds.height);
    setAllowAutoExpandCanvas(project.project.allowAutoExpandCanvas ?? true);
    setCanvasBackgroundColor(migrateLegacyCanvasBackground(project.project.canvasBackgroundColor));
    setCanvasBackgroundImage(project.project.canvasBackgroundImage ?? "");
    setCanvasBackgroundImageAssetId(project.project.canvasBackgroundImageAssetId ?? "");
    setBackgroundProjectId(project.project.backgroundProjectId ?? "");
    setBackgroundLayerIds(resolveConfiguredBackgroundLayerIds(project.project.backgroundProjectId, project.project.backgroundLayerIds));
    setElectricFlowVisible(project.project.electricFlowVisible ?? false);
    setElectricFlowSettings(project.project.electricFlowSettings ?? {});
    setPowerUnit(project.project.powerUnit ?? DEFAULT_POWER_UNIT);
    setVoltageUnit(project.project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
    setCurrentUnit(project.project.currentUnit ?? DEFAULT_CURRENT_UNIT);
    setPowerBaseValue(project.project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
    setModelType(project.project.modelType ?? "");
    setSubcontrolarea(project.project.subcontrolarea ?? "");
    setSubstation(project.project.substation ?? "");
    setFeeder(project.project.feeder ?? "");
    setTaiqu(project.project.taiqu ?? "");
    setViewBox(nextViewBox);
    setCanvasVisibleViewBox(nextViewBox);
    setLayers(layeredProject.layers ?? []);
    setActiveLayerId(layeredProject.activeLayerId ?? DEFAULT_MODEL_LAYER_ID);
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays(containerSafeNodes, containerExemptedEdges, nextProjectIdx);
    setGroups(normalizeModelGroups(layeredProject.groups, containerSafeNodes, layeredProject.edges));
    setProjectMeasurements(reconciledMeasurements);
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setInitialCanvasLodActive(containerSafeNodes.length > CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT);
    setInitialCanvasDetailHydrationLimit(0);
    const previousActiveProjectKey = latestScope.activeProjectKey ?? __appScope.activeProjectKey;
    const previousActiveSchemeKey = latestScope.activeSchemeKey ?? __appScope.activeSchemeKey;
    setActiveProjectKey(project.id);
    setActiveSchemeKey(schemeId);
    if (currentModelSelectionRef) {
      // 当目标模型与方案和当前已提交状态一致时，React 会跳过重渲染且不触发解锁 useLayoutEffect，需同步解除 loading。
      const activeKeysUnchanged =
        previousActiveProjectKey === project.id &&
        (!schemeId || !previousActiveSchemeKey || previousActiveSchemeKey === schemeId);
      currentModelSelectionRef.current = {
        projectKey: project.id,
        schemeKey: schemeId,
        loading: !activeKeysUnchanged && Boolean(currentModelSelectionRef.current?.loading)
      };
    }
    selectSingleProject(schemeId, project.id);
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setTerminalPress(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setDragging(null);
    hideImperativeMultiNodeDragOverlay();
    setMarquee(null);
    setModifierSelectionPress(null);
    setCanvasPanning(null);
    // ponytail: normalize/reconcile 是幂等函数，对已存储的归一化数据返回相同引用/结构，旧 dirty flag 永远为 false
    setHasUnsavedChanges(false);
    modelTrace("load-project-commit-state-writes", {
      projectId: project.id,
      projectName: project.name,
      schemeId,
      nodeCount: containerSafeNodes.length,
      selection: currentModelSelectionRef.current
    });
    writeOperationLog(`加载模型：${project.name}`);
    requestCanvasFrameCenter();
  };
}

export function createLoadSavedProjectRecord(__appScope: ProjectCanvasScope) {
  return async (
    project: SavedProjectRecord,
    schemeId?: string,
    sourceSchemes?: SavedSchemeRecord[]
  ) => {
  const { fetchBackendProjectRecord, findSchemeForProject, loadSavedProject, savedProjectRecordIsSummary, schemePathForProject, schemePathForScheme, schemes, setSchemes, suppressNextBackendSchemeSyncRef, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    const projectLoadTokenRef = __appScope.projectLoadTokenRef as { current: number } | undefined;
    const currentModelSelectionRef = __appScope.currentModelSelectionRef as
      | { current: { projectKey: string; schemeKey: string; loading: boolean } }
      | undefined;
    const loadToken = projectLoadTokenRef ? ++projectLoadTokenRef.current : 0;
    const isCurrentLoad = () => !projectLoadTokenRef || projectLoadTokenRef.current === loadToken;
    const setLoadingModel = __appScope.setLoadingModel as
      ((value: { projectId: string; progress: number } | null) => void)
      | undefined;
    let lastProgress: number | null = null;
    const reportProgress = (progress: number) => {
      if (!isCurrentLoad() || progress === lastProgress) {
        return;
      }
      lastProgress = progress;
      setLoadingModel?.({ projectId: project.id, progress });
    };
    const yieldAtProgress = async (progress: number) => {
      reportProgress(progress);
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
        });
      }
      return isCurrentLoad();
    };
    modelTrace("load-record-start", {
      projectId: project.id,
      projectName: project.name,
      schemeId,
      loadToken,
      activeProjectKey: __appScope.activeProjectKey,
      activeSchemeKey: __appScope.activeSchemeKey,
      selection: currentModelSelectionRef?.current,
      initialPointer: __appScope.latestActiveProjectPointerRef?.current
    });
    const latestSchemes = ((__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined)?.schemes) ?? schemes;
    if (sourceSchemes === undefined) {
      sourceSchemes = latestSchemes;
    }
    const sourceRecords = sourceSchemes ?? latestSchemes;
    const resolvedSchemeId =
      schemeId ||
      findSchemeForProjectInList(sourceRecords, project.id)?.id ||
      findSchemeForProject(project.id)?.id ||
      "";
    if (currentModelSelectionRef) {
      currentModelSelectionRef.current = { projectKey: project.id, schemeKey: resolvedSchemeId, loading: true };
    }
    const activeProjectPointerPayload = __appScope.activeProjectPointerPayload as
      | ((records: SavedSchemeRecord[], projectKey: string, schemeKey: string) => unknown)
      | undefined;
    const latestActiveProjectPointerRef = __appScope.latestActiveProjectPointerRef as
      | { current: unknown }
      | undefined;
    if (activeProjectPointerPayload && latestActiveProjectPointerRef) {
      latestActiveProjectPointerRef.current = activeProjectPointerPayload(sourceRecords, project.id, resolvedSchemeId);
    }
    const isSummaryRecord = savedProjectRecordIsSummary(project);
    reportProgress(0);
    let loadCompleted = false;
    try {
      if (!await yieldAtProgress(0)) {
        return false;
      }
      let projectToLoad = project;
      if (isSummaryRecord) {
        const ownerSchemePath = resolvedSchemeId ? schemePathForScheme(resolvedSchemeId, sourceRecords) : [];
        const schemePath = ownerSchemePath.length > 0 ? ownerSchemePath : schemePathForProject(project.id, sourceRecords);
        if (schemePath.length === 0) {
          if (isCurrentLoad() && currentModelSelectionRef) {
            currentModelSelectionRef.current.loading = false;
          }
          showGlobalMessage(`无法读取模型“${project.name}”：未找到所属方案路径。`);
          writeOperationLog(`读取模型失败：${project.name}`);
          return false;
        }
        reportProgress(15);
        try {
          const loadedProject = await fetchBackendProjectRecord(schemePath, project.name);
          if (!isCurrentLoad()) {
            return false;
          }
          if (!await yieldAtProgress(65)) {
            return false;
          }
          projectToLoad = {
            ...loadedProject,
            id: project.id || loadedProject.id,
            name: loadedProject.name || project.name
          };
          if (resolvedSchemeId) {
            suppressNextBackendSchemeSyncRef.current = true;
            setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, resolvedSchemeId, projectToLoad));
          }
          if (!await yieldAtProgress(85)) {
            return false;
          }
        } catch (error) {
          if (!isCurrentLoad()) {
            return false;
          }
          if (currentModelSelectionRef) {
            currentModelSelectionRef.current.loading = false;
          }
          const message = error instanceof Error ? error.message : `读取模型失败：${project.name}`;
          showGlobalMessage(message);
          writeOperationLog(`读取模型失败：${project.name}`);
          return false;
        }
      } else {
        if (!await yieldAtProgress(35) || !await yieldAtProgress(70)) {
          return false;
        }
      }
      if (!isCurrentLoad()) {
        modelTrace("load-record-stale-before-apply", { projectId: project.id, projectName: project.name, loadToken, currentToken: projectLoadTokenRef?.current });
        return false;
      }
      modelTrace("load-record-apply", { projectId: projectToLoad.id, projectName: projectToLoad.name, schemeId: resolvedSchemeId, loadToken, nodeCount: projectToLoad.project?.nodes?.length ?? 0 });
      loadSavedProject(projectToLoad, resolvedSchemeId);
      loadCompleted = true;
      return true;
    } finally {
      if (isCurrentLoad()) {
        if (loadCompleted) {
          reportProgress(100);
          // 帧提交后兜底复位 loading，防止相同 key bailout 或非完整树环境下锁残留。
          const releaseSelectionLoading = () => {
            if (isCurrentLoad() && currentModelSelectionRef?.current.projectKey === project.id) {
              currentModelSelectionRef.current.loading = false;
            }
          };
          if (typeof queueMicrotask === "function") {
            queueMicrotask(releaseSelectionLoading);
          } else {
            releaseSelectionLoading();
          }
          const clearCompletedProgress = () => {
            if (isCurrentLoad()) {
              releaseSelectionLoading();
              setLoadingModel?.(null);
            }
          };
          if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
            window.setTimeout(clearCompletedProgress, 180);
          } else {
            clearCompletedProgress();
          }
        } else {
          if (currentModelSelectionRef) {
            currentModelSelectionRef.current.loading = false;
          }
          setLoadingModel?.(null);
        }
      }
    }
  };
}

// 地址栏指定了模型（`#space=…&model=<idx>&scheme=<schemeId>`）时按它打开。
//
// 与顶栏/方案树点击走**同一条** `requestLoadSavedProject`：有未保存修改会弹确认框，
// 而不是绕过它把用户的草稿直接冲掉。找不到记录时返回 false 且不打扰用户 ——
// 提示由调用方（App.tsx 的地址栏同步 effect）按重试计数决定，避免每次刷新都弹一次。
//
// 定位顺序：**先 idx，后 key**。
// - idx（`project.idx`）是后端分配的稳定序号，跨方案唯一、改名或移动方案后不变
//   （`server/server.mjs:3835` `allocateStableProjectIndex`），地址栏里放的就是它；
// - key（`project:<编码后的路径>`）只在旧格式地址里出现，兼容历史书签/聊天记录。
// 两者都定位不到才返回 false —— 不要一失败就回退成「打开第一个模型」，那会静默打开错的东西。
export function createOpenProjectFromUrl(__appScope: ProjectCanvasScope) {
  return async (target: string, schemeHint?: string, legacyModelKey?: string): Promise<boolean> => {
    const { findSavedProjectRecordInSchemes, requestLoadSavedProject, schemes, setExpandedSchemeIds } = __appScope;
    const raw = String(target ?? "");
    const keyHint = String(legacyModelKey ?? "");
    if (!raw && !keyHint) {
      return false;
    }
    let found: { record: any; scheme: any } | null = null;
    if (Number.isSafeInteger(Number(raw)) && Number(raw) > 0) {
      found = findSavedProjectByIndex(schemes, Number(raw));
    }
    if (!found) {
      // 旧格式（`project:…`）或 idx 已失效：退回按运行期 key 找
      const byKey = keyHint || raw;
      if (byKey && !/^\d+$/u.test(byKey)) {
        found = findSavedProjectRecordInSchemes?.(schemes, byKey) ?? null;
      }
    }
    if (!found) {
      modelTrace("url-model-not-found", { target, legacyModelKey, schemeHint });
      return false;
    }
    if (found.record.id === __appScope.activeProjectKey) {
      return true;
    }
    // 地址栏只携带数字 schemeId；加载时仍使用已解析方案记录的内部树键，
    // 这样方案路径计算继续从当前树单源派生，不把 URL 字符串当作路径。
    const targetSchemeId = String(found.scheme?.id ?? "");
    modelTrace("url-model-resolved", {
      target,
      legacyModelKey,
      targetProjectId: found.record?.id ?? "",
      targetProjectName: found.record?.name ?? "",
      targetSchemeId,
      activeProjectKey: __appScope.activeProjectKey
    });
    if (targetSchemeId && typeof setExpandedSchemeIds === "function") {
      const pathToScheme = (records: readonly any[], ancestors: string[] = []): string[] => {
        for (const record of records ?? []) {
          const nextPath = [...ancestors, String(record?.id ?? "")].filter(Boolean);
          if (String(record?.id ?? "") === targetSchemeId) {
            return nextPath;
          }
          const nested = pathToScheme(record?.children ?? [], nextPath);
          if (nested.length > 0) {
            return nested;
          }
        }
        return [];
      };
      const expandedPath = pathToScheme(schemes ?? []);
      if (expandedPath.length > 0) {
        // URL 是明确的导航意图：只展开目标方案的祖先链，其他方案收缩。
        setExpandedSchemeIds(expandedPath);
      }
    }
    requestLoadSavedProject?.(found.record, targetSchemeId || undefined);
    return true;
  };
}

export function createRequestUnsavedChangeAction(__appScope: ProjectCanvasScope) {
  return (action: UnsavedChangeAction) => {
    const { loadSavedProjectRecord, saveRequired, setPendingUnsavedAction } = __appScope;
    if (!saveRequired) {
      if (action.kind === "load-project") {
        void (async () => {
          const loaded = await loadSavedProjectRecord(action.project, action.schemeId);
          if (loaded) {
            action.onLoaded?.();
          }
        })();
      } else if (action.kind === "export") {
        action.onResolved();
      } else if (action.kind === "switch-space") {
        // 没有未保存修改：不必过确认框，直接切
        void switchToSpace(action.spaceId);
      }
      return;
    }
    setPendingUnsavedAction(action);
  };
}

export function createRequestLoadSavedProject(__appScope: ProjectCanvasScope) {
  return (project: SavedProjectRecord, schemeId?: string) => {
  const { currentModelSelectionRef, findSchemeForProject, manualModelSelectionRef, requestUnsavedChangeAction, saveRequired } = __appScope;
    if (manualModelSelectionRef) {
      manualModelSelectionRef.current = true;
    }
    modelTrace("request-load-model", {
      projectId: project.id,
      projectName: project.name,
      schemeId,
      activeProjectKey: __appScope.activeProjectKey,
      activeSchemeKey: __appScope.activeSchemeKey,
      saveRequired,
      currentSelection: currentModelSelectionRef?.current
    });
    if (schemeId === undefined) {
      schemeId = findSchemeForProject(project.id)?.id ?? "";
    }
    if (!saveRequired && currentModelSelectionRef) {
      currentModelSelectionRef.current = { projectKey: project.id, schemeKey: schemeId, loading: true };
    }
    requestUnsavedChangeAction({
      kind: "load-project",
      project,
      schemeId,
      label: `切换到模型“${project.name}”`
    });
  };
}

export function createResolveUnsavedChangeAction(__appScope: ProjectCanvasScope) {
  return async (resolution: "discard" | "save" | "cancel") => {
  const { loadSavedProjectRecord, pendingUnsavedAction, saveCurrentProject, setPendingUnsavedAction, showGlobalMessage: showScopedGlobalMessage, writeOperationLog } = __appScope;
    const action = pendingUnsavedAction;
    if (action?.resolving) {
      return;
    }
    if (!action || resolution === "cancel") {
      setPendingUnsavedAction(null);
      return;
    }
    if (resolution === "save") {
      setPendingUnsavedAction({ ...action, resolving: true, resolutionError: "" });
      let saved = false;
      try {
        saved = await saveCurrentProject();
      } catch (error) {
        const message = error instanceof Error ? error.message : "保存模型时发生未知错误。";
        setPendingUnsavedAction({
          ...action,
          resolving: false,
          resolutionError: `保存失败：${message}`
        });
        showScopedGlobalMessage?.(`保存失败：${message}`, "error", 5000);
        writeOperationLog?.(`保存模型失败：${message}`);
        return;
      }
      if (!saved) {
        setPendingUnsavedAction({
          ...action,
          resolving: false,
          resolutionError: "保存未完成，请根据页面顶部提示处理后重试。"
        });
        return;
      }
    }
    setPendingUnsavedAction(null);
    if (action.kind === "load-project") {
      const loaded = await loadSavedProjectRecord(action.project, action.schemeId);
      if (loaded) {
        action.onLoaded?.();
      }
    } else if (action.kind === "switch-space") {
      // 走到这里说明保存（若选了保存）已成功；放弃则直接切
      void switchToSpace(action.spaceId);
    } else if (action.kind === "export" && resolution === "save") {
      // 设置标志跳过保存检查，因为刚刚保存完成
      setSkipSaveCheck(true);
      try {
        await action.onResolved();
      } finally {
        // 重置标志
        setSkipSaveCheck(false);
      }
    }
  };
}

export function createCreateSchemeRecord(__appScope: ProjectCanvasScope) {
  return async (parentSchemeId = "") => {
  const { createSavedScheme, handleBackendSchemeMutationFailure, hasSameName, insertChildSavedScheme, saveBackendSchemeRecord, savedChildSchemeNames, schemePathForScheme, selectSingleScheme, setExpandedSchemeIds, setSchemes, writeOperationLog } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const inputName = await promptText("请输入方案名称", "新建方案");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      showGlobalMessage("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, savedChildSchemeNames(latestScope().schemes, parentSchemeId))) {
      showGlobalMessage("方案名称重复，无法新建方案。");
      return;
    }
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    const recordPath = [...parentPath, name];
    let receipt: { schemeId?: number };
    try {
      receipt = await saveBackendSchemeRecord(recordPath);
    } catch (error) {
      handleBackendSchemeMutationFailure(`新建方案同步后台：${name}`, error);
      return;
    }
    const schemeId = receipt?.schemeId;
    if (typeof schemeId !== "number" || !Number.isSafeInteger(schemeId) || schemeId <= 0) {
      handleBackendSchemeMutationFailure(`新建方案同步后台：${name}`, new Error("后台未返回有效的 schemeId。"));
      return;
    }
    const record = { ...createSavedScheme(name), id: String(schemeId), schemeId };
    setSchemes((current: SavedSchemeRecord[]) => insertChildSavedScheme(current, parentSchemeId, record));
    if (parentSchemeId) {
      setExpandedSchemeIds((current: string[]) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    selectSingleScheme(record.id);
    writeOperationLog(`新建方案：${record.name}`);
  };
}

export function createRenameSchemeRecord(__appScope: ProjectCanvasScope) {
  return async (scheme: SavedSchemeRecord) => {
  const { handleBackendSchemeMutationFailure, hasSameName, renameSavedScheme, saveBackendSchemeRecord, savedSchemeSiblingNames, schemePathForScheme, setSchemes } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const nextName = await promptText("请输入新的方案名称", scheme.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    if (!name) {
      showGlobalMessage("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, savedSchemeSiblingNames(latestScope().schemes, scheme.id, scheme.id))) {
      showGlobalMessage("方案名称重复，无法修改。");
      return;
    }
    const previousPath = schemePathForScheme(scheme.id);
    const nextPath = previousPath.length > 0 ? [...previousPath.slice(0, -1), name] : [name];
    setSchemes((current: SavedSchemeRecord[]) => renameSavedScheme(current, scheme.id, nextName));
    void saveBackendSchemeRecord(nextPath, previousPath)
      .catch((error: unknown) => handleBackendSchemeMutationFailure(`重命名方案同步后台：${name}`, error));
  };
}

export function createDuplicateSchemeRecord(__appScope: ProjectCanvasScope) {
  return (scheme: SavedSchemeRecord) => {
  const { cloneSchemeRecordWithName, findSavedSchemeParentById, insertChildSavedScheme, persistSchemeTreeToBackend, promptUniqueRecordName, savedSchemeSiblingNames, schemePathForScheme, schemes, setExpandedSchemeIds, setSchemes, uniqueRecordName } = __appScope;
    const defaultName = uniqueRecordName(
      `${scheme.name} 副本`,
      savedSchemeSiblingNames(schemes, scheme.id),
      "未命名方案"
    );
    const name = promptUniqueRecordName(
      "请输入新方案名称",
      defaultName,
      savedSchemeSiblingNames(schemes, scheme.id),
      "方案名称不能为空。",
      "方案名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    const parentSchemeId = findSavedSchemeParentById(schemes, scheme.id)?.id ?? "";
    const record = cloneSchemeRecordWithName(scheme, name);
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current: SavedSchemeRecord[]) => insertChildSavedScheme(current, parentSchemeId, record));
    persistSchemeTreeToBackend(record, parentPath, `复制方案：${record.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current: string[]) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
  };
}

export function createDeleteSchemeRecord(__appScope: ProjectCanvasScope) {
  return async (scheme: SavedSchemeRecord) => {
  const { clearActiveProjectDisplay, clearRecordSelection, deleteBackendSchemeRecord, deleteSavedScheme, flattenSavedSchemes, handleBackendSchemeMutationFailure, loadSavedProjectRecord, nextSavedProjectAfterSchemeDeletion, schemePathForScheme, setSchemes } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const deletingSchemeIds = new Set(flattenSavedSchemes([scheme]).map((item: SavedSchemeRecord) => item.id));
    const initialScope = latestScope();
    const initialDeletingActive = Boolean(initialScope.activeSchemeKey && deletingSchemeIds.has(initialScope.activeSchemeKey));
    const confirmationMessage = initialDeletingActive
      ? `当前加载模型所在方案“${scheme.name}”将被删除。删除后会自动切换到相邻方案的模型；若没有可用模型，将清空画布。是否继续？`
      : `删除方案“${scheme.name}”及其全部模型？`;
    if (!await showGlobalConfirm(confirmationMessage)) {
      return;
    }
    const latest = latestScope();
    const emptyDisplayMessage = flattenSavedSchemes(latest.schemes).some((item: SavedSchemeRecord) => !deletingSchemeIds.has(item.id))
      ? "剩余方案没有可显示模型，画布已清空。"
      : "所有方案已删除，画布已清空。";
    const deletingActiveScheme = Boolean(latest.activeSchemeKey && deletingSchemeIds.has(latest.activeSchemeKey));
    const fallbackSelection = deletingActiveScheme
      ? nextSavedProjectAfterSchemeDeletion(latest.schemes, latest.activeSchemeKey, deletingSchemeIds)
      : null;
    const schemePath = schemePathForScheme(scheme.id);
    const nextSchemes = deleteSavedScheme(latest.schemes, scheme.id);
    const noSchemesAfterDeletion = nextSchemes.length === 0;
    setSchemes(nextSchemes);
    if (schemePath.length > 0) {
      void deleteBackendSchemeRecord(schemePath)
        .catch((error: unknown) => handleBackendSchemeMutationFailure(`删除后台方案：${scheme.name}`, error));
    }
    if (noSchemesAfterDeletion) {
      showGlobalMessage("所有方案已删除，画布已清空。");
      clearActiveProjectDisplay("所有方案已删除，画布已清空");
      return;
    }
    if (deletingActiveScheme) {
      if (fallbackSelection) {
        void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
      } else {
        showGlobalMessage(emptyDisplayMessage);
        clearActiveProjectDisplay("删除当前方案后已清空画布");
      }
      return;
    }
    if (latest.selectedSchemeId && deletingSchemeIds.has(latest.selectedSchemeId)) {
      clearRecordSelection();
    }
  };
}

export function createCopySelectedRecord(__appScope: ProjectCanvasScope) {
  return () => {
  const { copyProjectRecord, copySchemeRecord, findSavedSchemeById, projectById, schemes, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds } = __appScope;
    const projectId = selectedProjectIds[0] ?? selectedProjectId;
    if (projectId) {
      const project = projectById.get(projectId);
      if (project) {
        copyProjectRecord(project);
      }
      return;
    }
    const schemeId = selectedSchemeIds[0] ?? selectedSchemeId;
    if (schemeId) {
      const scheme = findSavedSchemeById(schemes, schemeId);
      if (scheme) {
        copySchemeRecord(scheme);
      }
    }
  };
}

export function createDeleteSelectedRecords(__appScope: ProjectCanvasScope) {
  return async () => {
  const { clearActiveProjectDisplay, clearRecordSelection, deleteBackendProjectRecord, deleteBackendSchemeRecord, deleteSavedProjectsFromSchemes, deleteSavedScheme, findSavedSchemeById, flattenSavedSchemes, handleBackendSchemeMutationFailure, loadSavedProjectRecord, nextSavedProjectAfterProjectBatchDeletion, nextSavedProjectAfterSchemeDeletion, schemePathForProject, schemePathForScheme, setSchemes } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ProjectCanvasScope | undefined) ?? __appScope;
    const initial = latestScope();
    if (initial.selectedProjectIds.length > 0) {
      const names = initial.projects.filter((project: SavedProjectRecord) => initial.selectedProjectIds.includes(project.id)).map((project: SavedProjectRecord) => project.name);
      const selected = new Set(initial.selectedProjectIds);
      const initialDeletingActive = Boolean(initial.activeProjectKey && selected.has(initial.activeProjectKey));
      const confirmationMessage = initialDeletingActive
        ? `选中的 ${names.length} 个模型包含当前加载模型。删除后会自动切换到同方案的相邻模型；若没有相邻模型，将清空画布。是否继续？`
        : `删除选中的 ${names.length} 个模型？`;
      if (!await showGlobalConfirm(confirmationMessage)) {
        return;
      }
      const latest = latestScope();
      const deletingActiveProject = Boolean(latest.activeProjectKey && selected.has(latest.activeProjectKey));
      const fallbackSelection = deletingActiveProject
        ? nextSavedProjectAfterProjectBatchDeletion(latest.schemes, latest.activeProjectKey, selected)
        : null;
      const backendDeletes = latest.projects
        .filter((project: SavedProjectRecord) => selected.has(project.id))
        .map((project: SavedProjectRecord) => ({ project, schemePath: schemePathForProject(project.id) }))
        .filter((item: { project: SavedProjectRecord; schemePath: string[] }) => item.schemePath.length > 0);
      setSchemes((current: SavedSchemeRecord[]) => deleteSavedProjectsFromSchemes(current, selected));
      for (const item of backendDeletes) {
        void deleteBackendProjectRecord(item.schemePath, item.project.name)
          .catch((error: unknown) => handleBackendSchemeMutationFailure(`删除后台模型：${item.project.name}`, error));
      }
      if (deletingActiveProject) {
        if (fallbackSelection) {
          void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
        } else {
          showGlobalMessage("当前方案已无模型，画布已清空。");
          clearActiveProjectDisplay("删除当前模型后已清空画布");
        }
        return;
      }
      clearRecordSelection();
      return;
    }
    if (initial.selectedSchemeIds.length > 0) {
      const targetSchemeIds = [...initial.selectedSchemeIds];
      const deletingSchemeIds = new Set(
        targetSchemeIds.flatMap((schemeId: string) => {
          const scheme = findSavedSchemeById(initial.schemes, schemeId);
          return scheme ? flattenSavedSchemes([scheme]).map((item: SavedSchemeRecord) => item.id) : [schemeId];
        })
      );
      const initialDeletingActiveScheme = Boolean(initial.activeSchemeKey && deletingSchemeIds.has(initial.activeSchemeKey));
      const confirmationMessage = initialDeletingActiveScheme
        ? `选中的 ${targetSchemeIds.length} 个方案包含当前加载模型所在方案。删除后会自动切换到相邻方案的模型；若没有可用模型，将清空画布。是否继续？`
        : `删除选中的 ${targetSchemeIds.length} 个方案及其全部模型？`;
      if (!await showGlobalConfirm(confirmationMessage)) {
        return;
      }
      const latest = latestScope();
      const emptyDisplayMessage = flattenSavedSchemes(latest.schemes).some((item: SavedSchemeRecord) => !deletingSchemeIds.has(item.id))
        ? "剩余方案没有可显示模型，画布已清空。"
        : "所有方案已删除，画布已清空。";
      const deletingActiveScheme = Boolean(latest.activeSchemeKey && deletingSchemeIds.has(latest.activeSchemeKey));
      const fallbackSelection = deletingActiveScheme
        ? nextSavedProjectAfterSchemeDeletion(latest.schemes, latest.activeSchemeKey, deletingSchemeIds)
        : null;
      const backendSchemeDeletes = targetSchemeIds
        .map((schemeId: string) => ({ schemeId, schemePath: schemePathForScheme(schemeId), scheme: findSavedSchemeById(latest.schemes, schemeId) }))
        .filter((item: { schemeId: string; schemePath: string[]; scheme?: SavedSchemeRecord }) => item.schemePath.length > 0 && item.scheme);
      const nextSchemes = targetSchemeIds.reduce((updatedSchemes: SavedSchemeRecord[], schemeId: string) => deleteSavedScheme(updatedSchemes, schemeId), latest.schemes);
      const noSchemesAfterDeletion = nextSchemes.length === 0;
      setSchemes(nextSchemes);
      for (const item of backendSchemeDeletes) {
        void deleteBackendSchemeRecord(item.schemePath)
          .catch((error: unknown) => handleBackendSchemeMutationFailure(`删除后台方案：${item.scheme?.name ?? item.schemeId}`, error));
      }
      if (noSchemesAfterDeletion) {
        showGlobalMessage("所有方案已删除，画布已清空。");
        clearActiveProjectDisplay("所有方案已删除，画布已清空");
        return;
      }
      if (deletingActiveScheme) {
        if (fallbackSelection) {
          void loadSavedProjectRecord(fallbackSelection.project, fallbackSelection.scheme.id);
        } else {
          showGlobalMessage(emptyDisplayMessage);
          clearActiveProjectDisplay("删除当前方案后已清空画布");
        }
        return;
      }
      clearRecordSelection();
    }
  };
}

export function createCopyProjectRecord(__appScope: ProjectCanvasScope) {
  return (project: SavedProjectRecord) => {
  const { setRecordClipboard, writeOperationLog } = __appScope;
    setRecordClipboard({ kind: "project", project });
    writeOperationLog(`复制模型记录：${project.name}`);
  };
}

export function createCopySchemeRecord(__appScope: ProjectCanvasScope) {
  return (scheme: SavedSchemeRecord) => {
  const { setRecordClipboard, writeOperationLog } = __appScope;
    setRecordClipboard({ kind: "scheme", scheme });
    writeOperationLog(`复制方案记录：${scheme.name}`);
  };
}

export function createPasteSchemeClipboardRecord(__appScope: ProjectCanvasScope) {
  return (parentSchemeId = "") => {
  const { cloneSchemeRecordForPaste, findSavedSchemeById, hasSameName, insertChildSavedScheme, persistSchemeTreeToBackend, recordClipboard, schemePathForScheme, schemes, setExpandedSchemeIds, setPendingRecordPasteConflict, setSchemes, writeOperationLog } = __appScope;
    if (recordClipboard?.kind !== "scheme") {
      return;
    }
    const sourceScheme = recordClipboard.scheme;
    const targetSchemes = parentSchemeId ? findSavedSchemeById(schemes, parentSchemeId)?.children ?? [] : schemes;
    const duplicateScheme = targetSchemes.find((scheme: SavedSchemeRecord) => hasSameName(scheme.name, [sourceScheme.name]));
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme",
        sourceScheme,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name,
        targetParentSchemeId: parentSchemeId
      });
      return;
    }
    const record = cloneSchemeRecordForPaste(sourceScheme, sourceScheme.name);
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current: SavedSchemeRecord[]) => insertChildSavedScheme(current, parentSchemeId, record));
    persistSchemeTreeToBackend(record, parentPath, `粘贴方案：${record.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current: string[]) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    writeOperationLog(`粘贴方案记录：${sourceScheme.name}`);
  };
}

export function createPasteProjectClipboardRecord(__appScope: ProjectCanvasScope) {
  return (targetSchemeId?: string) => {
  const { activeSchemeKey, cloneProjectRecordForPaste, findSavedSchemeById, handleBackendSchemeMutationFailure, hasSameName, recordClipboard, saveBackendProjectRecord, schemePathForRecord, schemes, selectedSchemeId, setPendingRecordPasteConflict, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    if (targetSchemeId === undefined) {
      targetSchemeId = selectedSchemeId || activeSchemeKey || schemes[0]?.id;
    }
    if (recordClipboard?.kind !== "project") {
      return;
    }
    const sourceProject = recordClipboard.project;
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId) ?? schemes[0];
    if (!targetScheme) {
      return;
    }
    const duplicateProject = targetScheme.projects.find((project: SavedProjectRecord) => hasSameName(project.name, [sourceProject.name]));
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project",
        sourceProject,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    const pastedProject = cloneProjectRecordForPaste(sourceProject, sourceProject.name);
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, targetScheme.id, pastedProject));
    void saveBackendProjectRecord(targetPath, pastedProject)
      .then((saved: SavedProjectRecord) => setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, targetScheme.id, saved)))
      .catch((error: unknown) => handleBackendSchemeMutationFailure(`粘贴模型同步后台：${pastedProject.name}`, error));
    writeOperationLog(`粘贴模型记录：${sourceProject.name}`);
  };
}

export function createPasteSelectedRecord(__appScope: ProjectCanvasScope) {
  return () => {
  const { pasteProjectClipboardRecord, pasteSchemeClipboardRecord, recordClipboard } = __appScope;
    if (!recordClipboard) {
      return;
    }
    if (recordClipboard.kind === "scheme") {
      pasteSchemeClipboardRecord();
      return;
    }
    pasteProjectClipboardRecord();
  };
}

export function createCommitProjectRecordMove(__appScope: ProjectCanvasScope) {
  return (
    projectId: string,
    targetSchemeId: string,
    options: { targetName?: string; overwriteProjectId?: string } = {},
    sourceProjectOverride?: SavedProjectRecord
  ) => {
  const { activeProjectKey, deleteBackendProjectRecord, deleteSavedProjectsFromSchemes, findSavedProjectRecordInSchemes, findSavedSchemeById, handleBackendSchemeMutationFailure, saveBackendProjectRecord, schemePathForRecord, schemes, selectedProjectId, selectedProjectIds, setActiveProjectKey, setActiveSchemeKey, setExpandedSchemeIds, setProjectName, setSchemes, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, upsertSavedProjectInScheme } = __appScope;
    const targetName = options.targetName?.trim();
    const nextProjectId = options.overwriteProjectId ?? projectId;
    const sourceRecord = findSavedProjectRecordInSchemes(schemes, projectId);
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
    const project = sourceProjectOverride ?? sourceRecord?.project;
    const sourceScheme = sourceRecord?.scheme;
    if (!sourceScheme || !targetScheme || !project || sourceScheme.id === targetSchemeId) {
      return;
    }
    const now = new Date().toISOString();
    const movedName = targetName || project.name;
    const movedProject: SavedProjectRecord = {
      ...project,
      id: nextProjectId,
      name: movedName,
      updatedAt: now,
      project: { ...project.project, name: movedName }
    };
    const sourcePath = schemePathForRecord(sourceScheme);
    const targetPath = schemePathForRecord(targetScheme);
    const overwrittenProject = options.overwriteProjectId
      ? targetScheme.projects.find((item: SavedProjectRecord) => item.id === options.overwriteProjectId)
      : undefined;
    setSchemes((current: SavedSchemeRecord[]) => {
      const withoutSourceProject = deleteSavedProjectsFromSchemes(current, new Set([projectId]));
      return upsertSavedProjectInScheme(withoutSourceProject, targetScheme.id, movedProject);
    });
    void saveBackendProjectRecord(targetPath, movedProject, overwrittenProject?.name ?? "")
      .then(() => deleteBackendProjectRecord(sourcePath, project.name))
      .catch((error: unknown) => handleBackendSchemeMutationFailure(`移动模型同步后台：${movedProject.name}`, error));
    setExpandedSchemeIds((current: string[]) => (current.includes(targetSchemeId) ? current : [...current, targetSchemeId]));
    if (
      selectedProjectId === projectId ||
      selectedProjectIds.includes(projectId) ||
      (options.overwriteProjectId && (selectedProjectId === options.overwriteProjectId || selectedProjectIds.includes(options.overwriteProjectId)))
    ) {
      setSelectedSchemeId(targetSchemeId);
      setSelectedProjectIds([nextProjectId]);
      setSelectedProjectId(nextProjectId);
      setSelectedSchemeIds([]);
    }
    if (activeProjectKey === projectId || activeProjectKey === options.overwriteProjectId) {
      setActiveProjectKey(nextProjectId);
      setActiveSchemeKey(targetSchemeId);
      if (targetName) {
        setProjectName(targetName);
      }
    }
  };
}

export function createResolveRecordPasteConflict(__appScope: ProjectCanvasScope) {
  return (action: "overwrite" | "rename" | "cancel") => {
  const { activeSchemeRecord, cloneProjectRecordForPaste, cloneSchemeRecordForPaste, commitProjectRecordMove, deleteBackendSchemeRecord, findSavedSchemeById, handleBackendSchemeMutationFailure, insertChildSavedScheme, moveSavedSchemeToParent, pendingRecordPasteConflict, persistSchemeTreeToBackend, promptUniqueRecordName, replaceSavedSchemeById, replaceSchemeTreeInBackend, saveBackendProjectRecord, saveBackendSchemeRecord, savedChildSchemeNames, schemePathForRecord, schemePathForScheme, schemes, selectedSchemeRecord, setExpandedSchemeIds, setPendingRecordPasteConflict, setSchemes, uniqueRecordName, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    const conflict = pendingRecordPasteConflict;
    if (!conflict || action === "cancel") {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (conflict.kind === "scheme") {
      const targetParentSchemeId = conflict.targetParentSchemeId ?? "";
      const siblingNames = savedChildSchemeNames(schemes, targetParentSchemeId);
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入粘贴后的方案名称",
          uniqueRecordName(conflict.sourceScheme.name, siblingNames, "未命名方案"),
          siblingNames,
          "方案名称不能为空。",
          "方案名称重复，无法粘贴。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        const record = cloneSchemeRecordForPaste(conflict.sourceScheme, renamed);
        const parentPath = targetParentSchemeId ? schemePathForScheme(targetParentSchemeId) : [];
        setSchemes((current: SavedSchemeRecord[]) => insertChildSavedScheme(current, targetParentSchemeId, record));
        persistSchemeTreeToBackend(record, parentPath, `新命名粘贴方案：${record.name}`);
        if (targetParentSchemeId) {
          setExpandedSchemeIds((current: string[]) => (current.includes(targetParentSchemeId) ? current : [...current, targetParentSchemeId]));
        }
        writeOperationLog(`新命名粘贴方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId);
      const parentPath = targetParentSchemeId ? schemePathForScheme(targetParentSchemeId) : [];
      const replacement = duplicateScheme
        ? cloneSchemeRecordForPaste(conflict.sourceScheme, duplicateScheme.name, duplicateScheme)
        : cloneSchemeRecordForPaste(conflict.sourceScheme, conflict.duplicateName);
      setSchemes((current: SavedSchemeRecord[]) => {
        if (!findSavedSchemeById(current, conflict.duplicateSchemeId)) {
          return insertChildSavedScheme(current, targetParentSchemeId, replacement);
        }
        return replaceSavedSchemeById(current, conflict.duplicateSchemeId, replacement);
      });
      if (duplicateScheme) {
        const duplicatePath = schemePathForRecord(duplicateScheme);
        replaceSchemeTreeInBackend(replacement, parentPath, duplicatePath, `覆盖粘贴方案：${replacement.name}`);
      } else {
        persistSchemeTreeToBackend(replacement, parentPath, `覆盖粘贴方案：${replacement.name}`);
      }
      writeOperationLog(`覆盖粘贴方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "scheme-drag") {
      const sourceScheme = findSavedSchemeById(schemes, conflict.schemeId);
      const targetScheme = findSavedSchemeById(schemes, conflict.targetSchemeId);
      if (!sourceScheme || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      const targetChildNames = (targetScheme.children ?? []).map((scheme: SavedSchemeRecord) => scheme.name);
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的方案名称",
          uniqueRecordName(sourceScheme.name, targetChildNames, "未命名方案"),
          targetChildNames,
          "方案名称不能为空。",
          "方案名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        const sourcePath = schemePathForRecord(sourceScheme);
        const targetParentPath = schemePathForRecord(targetScheme);
        const nextPath = [...targetParentPath, renamed];
        setSchemes((current: SavedSchemeRecord[]) => moveSavedSchemeToParent(current, conflict.schemeId, conflict.targetSchemeId, { targetName: renamed }));
        void saveBackendSchemeRecord(nextPath, sourcePath)
          .catch((error: unknown) => handleBackendSchemeMutationFailure(`拖拽方案同步后台：${renamed}`, error));
        setExpandedSchemeIds((current: string[]) => (current.includes(conflict.targetSchemeId) ? current : [...current, conflict.targetSchemeId]));
        writeOperationLog(`新命名拖拽方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      const sourcePath = schemePathForRecord(sourceScheme);
      const targetParentPath = schemePathForRecord(targetScheme);
      const nextPath = [...targetParentPath, conflict.duplicateName];
      const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId);
      setSchemes((current: SavedSchemeRecord[]) => moveSavedSchemeToParent(current, conflict.schemeId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteSchemeId: conflict.duplicateSchemeId
      }));
      const backendMove = duplicateScheme
        ? deleteBackendSchemeRecord(schemePathForRecord(duplicateScheme)).then(() => saveBackendSchemeRecord(nextPath, sourcePath))
        : saveBackendSchemeRecord(nextPath, sourcePath);
      void backendMove.catch((error: unknown) => handleBackendSchemeMutationFailure(`覆盖拖拽方案同步后台：${conflict.duplicateName}`, error));
      setExpandedSchemeIds((current: string[]) => (current.includes(conflict.targetSchemeId) ? current : [...current, conflict.targetSchemeId]));
      writeOperationLog(`覆盖拖拽方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "project-drag") {
      const sourceScheme = findSavedSchemeById(schemes, conflict.sourceSchemeId);
      const sourceProject = sourceScheme?.projects.find((project: SavedProjectRecord) => project.id === conflict.projectId);
      const targetScheme = findSavedSchemeById(schemes, conflict.targetSchemeId);
      if (!sourceProject || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的模型名称",
          uniqueRecordName(sourceProject.name, targetScheme.projects.map((project: SavedProjectRecord) => project.name), "未命名模型"),
          targetScheme.projects.map((project: SavedProjectRecord) => project.name),
          "模型名称不能为空。",
          "模型名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, { targetName: renamed });
        writeOperationLog(`新命名拖拽模型记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteProjectId: conflict.duplicateProjectId
      });
      writeOperationLog(`覆盖拖拽模型记录：${conflict.duplicateName}`);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0];
    if (!targetScheme) {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入粘贴后的模型名称",
        uniqueRecordName(conflict.sourceProject.name, targetScheme.projects.map((project: SavedProjectRecord) => project.name), "未命名模型"),
        targetScheme.projects.map((project: SavedProjectRecord) => project.name),
        "模型名称不能为空。",
        "模型名称重复，无法粘贴。"
      );
      if (!renamed) {
        return;
      }
      setPendingRecordPasteConflict(null);
      const pastedProject = cloneProjectRecordForPaste(conflict.sourceProject, renamed);
      const targetPath = schemePathForRecord(targetScheme);
      setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, targetScheme.id, pastedProject));
      void saveBackendProjectRecord(targetPath, pastedProject)
        .then((saved: SavedProjectRecord) => setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, targetScheme.id, saved)))
        .catch((error: unknown) => handleBackendSchemeMutationFailure(`新命名粘贴模型同步后台：${pastedProject.name}`, error));
      writeOperationLog(`新命名粘贴模型记录：${renamed}`);
      return;
    }
    setPendingRecordPasteConflict(null);
    const duplicateProject = targetScheme.projects.find((project: SavedProjectRecord) => project.id === conflict.duplicateProjectId);
    const targetName = duplicateProject?.name ?? conflict.duplicateName;
    const pastedProject = cloneProjectRecordForPaste(conflict.sourceProject, targetName, conflict.duplicateProjectId);
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current: SavedSchemeRecord[]) => {
      const currentTargetScheme = findSavedSchemeById(current, targetScheme.id);
      if (!currentTargetScheme) {
        return current;
      }
      return upsertSavedProjectInScheme(current, currentTargetScheme.id, pastedProject);
    });
    void saveBackendProjectRecord(targetPath, pastedProject, duplicateProject?.name ?? "")
      .then((saved: SavedProjectRecord) => setSchemes((current: SavedSchemeRecord[]) => upsertSavedProjectInScheme(current, targetScheme.id, saved)))
      .catch((error: unknown) => handleBackendSchemeMutationFailure(`覆盖粘贴模型同步后台：${pastedProject.name}`, error));
    writeOperationLog(`覆盖粘贴模型记录：${conflict.duplicateName}`);
  };
}

export function createMoveProjectRecordToScheme(__appScope: ProjectCanvasScope) {
  return async (projectId: string, schemeId: string) => {
  const {
    commitProjectRecordMove, fetchBackendProjectRecord, findSavedSchemeById, findSchemeForProject,
    handleBackendSchemeMutationFailure, hasSameName,
    schemePathForRecord, schemes, setPendingRecordPasteConflict
  } = __appScope;
    const sourceScheme = findSchemeForProject(projectId);
    const sourceProject = sourceScheme?.projects.find((project: SavedProjectRecord) => project.id === projectId);
    const targetScheme = findSavedSchemeById(schemes, schemeId);
    const sourceIsSummary = savedProjectRecordIsSummaryDirect(sourceProject);
    projectMoveDebug("start", {
      projectId,
      targetSchemeId: schemeId,
      sourceSchemeId: sourceScheme?.id ?? "",
      sourceIsSummary,
      hasFetchOverride: typeof fetchBackendProjectRecord === "function"
    });
    if (!sourceScheme || !sourceProject || !targetScheme || sourceScheme.id === targetScheme.id) {
      projectMoveDebug("early-return:lookup", {
        sourceFound: Boolean(sourceScheme),
        projectFound: Boolean(sourceProject),
        targetFound: Boolean(targetScheme),
        sameScheme: sourceScheme?.id === targetScheme?.id,
        projectId,
        targetSchemeId: schemeId
      });
      return;
    }
    let completeProject = sourceProject;
    if (sourceIsSummary) {
      try {
        const fetchFullProject = typeof fetchBackendProjectRecord === "function"
          ? fetchBackendProjectRecord
          : fetchBackendProjectRecordDirect;
        projectMoveDebug("fetch-full:start", { schemePath: schemePathForRecord(sourceScheme), name: sourceProject.name });
        completeProject = await fetchFullProject(schemePathForRecord(sourceScheme), sourceProject.name);
        projectMoveDebug("fetch-full:done", {
          name: completeProject.name,
          stillSummary: savedProjectRecordIsSummaryDirect(completeProject),
          hasProjectPayload: Boolean(completeProject.project)
        });
      } catch (error) {
        projectMoveDebug("fetch-full:error", { name: sourceProject.name, message: error instanceof Error ? error.message : String(error) });
        handleBackendSchemeMutationFailure(`移动模型读取完整内容：${sourceProject.name}`, error);
        return;
      }
    }
    const duplicateProject = targetScheme.projects.find(
      (project: SavedProjectRecord) => project.id !== sourceProject.id && hasSameName(project.name, [sourceProject.name])
    );
    projectMoveDebug("duplicate-check", {
      projectId,
      targetSchemeId: schemeId,
      projectName: sourceProject.name,
      targetProjectNames: targetScheme.projects.map((project: SavedProjectRecord) => project.name),
      duplicateName: duplicateProject?.name ?? ""
    });
    if (duplicateProject) {
      projectMoveDebug("early-return:duplicate", {
        projectId,
        targetSchemeId: schemeId,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      setPendingRecordPasteConflict({
        kind: "project-drag",
        projectId,
        sourceSchemeId: sourceScheme.id,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    projectMoveDebug("commit", {
      projectId,
      targetSchemeId: schemeId,
      stillSummary: savedProjectRecordIsSummaryDirect(completeProject),
      hasProjectPayload: Boolean(completeProject.project)
    });
    commitProjectRecordMove(projectId, schemeId, {}, completeProject);
  };
}

export function createMoveSchemeRecordToScheme(__appScope: ProjectCanvasScope) {
  return (schemeId: string, targetSchemeId: string) => {
  const { findSavedSchemeById, flattenSavedSchemes, handleBackendSchemeMutationFailure, hasSameName, moveSavedSchemeToParent, saveBackendSchemeRecord, schemePathForRecord, schemes, selectedSchemeId, selectedSchemeIds, setExpandedSchemeIds, setPendingRecordPasteConflict, setSchemes, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, writeOperationLog } = __appScope;
    const sourceScheme = findSavedSchemeById(schemes, schemeId);
    const targetScheme = findSavedSchemeById(schemes, targetSchemeId);
    if (!sourceScheme || !targetScheme || sourceScheme.id === targetScheme.id) {
      return;
    }
    const movedSchemeIds = new Set(flattenSavedSchemes([sourceScheme]).map((scheme: SavedSchemeRecord) => scheme.id));
    if (movedSchemeIds.has(targetScheme.id)) {
      return;
    }
    const duplicateScheme = (targetScheme.children ?? []).find(
      (scheme: SavedSchemeRecord) => scheme.id !== sourceScheme.id && hasSameName(scheme.name, [sourceScheme.name])
    );
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme-drag",
        schemeId,
        targetSchemeId: targetScheme.id,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name
      });
      return;
    }
    const sourcePath = schemePathForRecord(sourceScheme);
    const targetParentPath = schemePathForRecord(targetScheme);
    const nextPath = [...targetParentPath, sourceScheme.name];
    setSchemes((current: SavedSchemeRecord[]) => moveSavedSchemeToParent(current, schemeId, targetScheme.id));
    void saveBackendSchemeRecord(nextPath, sourcePath)
      .catch((error: unknown) => handleBackendSchemeMutationFailure(`移动方案同步后台：${sourceScheme.name}`, error));
    setExpandedSchemeIds((current: string[]) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    if (selectedSchemeId === schemeId || selectedSchemeIds.includes(schemeId)) {
      setSelectedSchemeId(schemeId);
      setSelectedSchemeIds([]);
      setSelectedProjectId("");
      setSelectedProjectIds([]);
    }
    writeOperationLog(`移动方案“${sourceScheme.name}”到“${targetScheme.name}”下`);
  };
}

/**
 * 面板拖动排序的**跨层级**方案移动（带插入位）：
 *   · targetParentSchemeId 为空串 → 移到**根层**（顶层）；
 *   · insertBeforeId 指定插到该兄弟之前（为空则追加到该父级末尾）；
 *   · 走既有落库路径（saveBackendSchemeRecord + 失败回滚提示），与跨方案移动一致。
 */
export function createMoveSchemeRecordToPosition(__appScope: ProjectCanvasScope) {
  return (schemeId: string, targetParentSchemeId: string, insertBeforeId?: string) => {
  const {
    findSavedSchemeById, flattenSavedSchemes, handleBackendSchemeMutationFailure, hasSameName,
    moveSavedSchemeToPosition, saveBackendSchemeRecord, schemePathForRecord,
    schemePathForScheme, schemes, selectedSchemeId, selectedSchemeIds, setExpandedSchemeIds,
    setPendingRecordPasteConflict, setSchemes, setSelectedProjectId, setSelectedProjectIds,
    setSelectedSchemeId, setSelectedSchemeIds, writeOperationLog
  } = __appScope;
    const sourceScheme = findSavedSchemeById(schemes, schemeId);
    if (!sourceScheme) {
      return;
    }
    const targetScheme = targetParentSchemeId ? findSavedSchemeById(schemes, targetParentSchemeId) : null;
    if (targetParentSchemeId && !targetScheme) {
      return;
    }
    const movedSchemeIds = new Set(flattenSavedSchemes([sourceScheme]).map((scheme: SavedSchemeRecord) => scheme.id));
    if (targetScheme && movedSchemeIds.has(targetScheme.id)) {
      return;
    }
    // 同名冲突：沿用既有冲突对话框（与跨方案移动同一套机制）。
    const siblings = targetScheme ? (targetScheme.children ?? []) : schemes;
    const duplicateScheme = siblings.find(
      (scheme: SavedSchemeRecord) => scheme.id !== sourceScheme.id && hasSameName(scheme.name, [sourceScheme.name])
    );
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme-drag",
        schemeId,
        targetSchemeId: targetParentSchemeId,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name
      });
      return;
    }
    const sourcePath = schemePathForRecord(sourceScheme);
    const targetParentPath = targetScheme ? schemePathForScheme(targetScheme) : [];
    const nextPath = [...targetParentPath, sourceScheme.name];
    setSchemes((current: SavedSchemeRecord[]) => moveSavedSchemeToPosition(current, schemeId, targetParentSchemeId, insertBeforeId));
    void saveBackendSchemeRecord(nextPath, sourcePath)
      .catch((error: unknown) => handleBackendSchemeMutationFailure(`移动方案同步后台：${sourceScheme.name}`, error));
    if (targetScheme) {
      setExpandedSchemeIds((current: string[]) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    }
    if (selectedSchemeId === schemeId || selectedSchemeIds.includes(schemeId)) {
      setSelectedSchemeId(schemeId);
      setSelectedSchemeIds([]);
      setSelectedProjectId("");
      setSelectedProjectIds([]);
    }
    const targetName = targetScheme ? `“${targetScheme.name}”下` : "顶层";
    writeOperationLog(`移动方案“${sourceScheme.name}”到${targetName}`);
  };
}

export function createSaveActiveProjectPointer(__appScope: ProjectCanvasScope) {
  return (draftProjectId: string, draftSchemeId: string, sourceSchemes?: SavedSchemeRecord[]) => {
  const { ACTIVE_PROJECT_STORAGE_KEY, DRAFT_PROJECT_STORAGE_KEY, activeProjectPointerPayload, schemes } = __appScope;
    if (sourceSchemes === undefined) {
      sourceSchemes = schemes;
    }
    const pointerPayload = activeProjectPointerPayload(sourceSchemes, draftProjectId, draftSchemeId);
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(pointerPayload ?? {}));
      window.localStorage.removeItem(DRAFT_PROJECT_STORAGE_KEY);
    } catch {
      // 活动模型指针只是加速下次打开/刷新，写入失败不阻断手动保存。
    }
  };
}

export function createSetActiveLayer(__appScope: ProjectCanvasScope) {
  return (layerId: string) => {
  const { layers, pushUndoSnapshot, setActiveLayerId, setLayers, writeOperationLog } = __appScope;
    pushUndoSnapshot(true, false, undefined, "切换图层", layers.find((layer: ModelLayer) => layer.id === layerId)?.name ?? layerId);
    setActiveLayerId(layerId);
    setLayers((current: ModelLayer[]) => current.map((layer: ModelLayer) => layer.id === layerId ? { ...layer, visible: true } : layer));
    writeOperationLog(`激活图层：${layers.find((layer: ModelLayer) => layer.id === layerId)?.name ?? layerId}`);
  };
}

export function createNextDefaultModelLayerName(__appScope: ProjectCanvasScope) {
  return () => {
  const { layers } = __appScope;
    const usedNames = new Set(layers.map((layer: ModelLayer) => layer.name.trim()));
    let index = 1;
    while (usedNames.has(`图层${index}`)) {
      index += 1;
    }
    return `图层${index}`;
  };
}

export function createAddModelLayer(__appScope: ProjectCanvasScope) {
  return () => {
  const { createModelLayer, layers, nextDefaultModelLayerName, pushUndoSnapshot, setActiveLayerId, setLayers, writeOperationLog } = __appScope;
    pushUndoSnapshot(true, false, undefined, "添加图层");
    const layer = createModelLayer(nextDefaultModelLayerName(), layers);
    setLayers((current: ModelLayer[]) => [...current, layer]);
    setActiveLayerId(layer.id);
    writeOperationLog(`新增图层：${layer.name}`);
  };
}

export function createClearLayerNameDraft(__appScope: ProjectCanvasScope) {
  return (layerId: string) => {
  const { setLayerNameDrafts } = __appScope;
    setLayerNameDrafts((current: Record<string, string>) => {
      if (!(layerId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[layerId];
      return next;
    });
  };
}

export function createCommitModelLayerName(__appScope: ProjectCanvasScope) {
  return (layerId: string, draftName: string) => {
  const { clearLayerNameDraft, layers, pushUndoSnapshot, setLayers, uniqueRecordName, writeOperationLog } = __appScope;
    const layer = layers.find((item: ModelLayer) => item.id === layerId);
    if (!layer) {
      clearLayerNameDraft(layerId);
      return;
    }
    const nextName = uniqueRecordName(
      draftName.trim() || "未命名图层",
      layers.filter((item: ModelLayer) => item.id !== layerId).map((item: ModelLayer) => item.name),
      "未命名图层"
    );
    clearLayerNameDraft(layerId);
    if (nextName === layer.name) {
      return;
    }
    pushUndoSnapshot(true, false, undefined, "重命名图层");
    setLayers((current: ModelLayer[]) => current.map((item: ModelLayer) => item.id === layerId ? { ...item, name: nextName } : item));
    writeOperationLog(`重命名图层：${layer.name} -> ${nextName}`);
  };
}

export function createHandleLayerNameInputKeyDown(__appScope: ProjectCanvasScope) {
  return (event: ReactKeyboardEvent<HTMLInputElement>, layer: ModelLayer) => {
  const { clearLayerNameDraft } = __appScope;
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      clearLayerNameDraft(layer.id);
      event.currentTarget.value = layer.name;
      event.currentTarget.blur();
    }
  };
}

export function createToggleModelLayerVisibility(__appScope: ProjectCanvasScope) {
  return (layerId: string) => {
  const { activeLayerId, layers, pushUndoSnapshot, setLayers } = __appScope;
    const layer = layers.find((item: ModelLayer) => item.id === layerId);
    if (!layer) {
      return;
    }
    if (layer.id === activeLayerId && layer.visible) {
      showGlobalMessage("激活图层必须显示，不能隐藏。");
      return;
    }
    pushUndoSnapshot();
    setLayers((current: ModelLayer[]) => current.map((item: ModelLayer) => item.id === layerId ? { ...item, visible: !item.visible } : item));
  };
}

export function createSetAllModelLayersVisibility(__appScope: ProjectCanvasScope) {
  return (visible: boolean) => {
  const { activeLayerId, layers, pushUndoSnapshot, setLayers, writeOperationLog } = __appScope;
    const nextLayers = layers.map((item: ModelLayer) => ({
      ...item,
      visible: visible || item.id === activeLayerId
    }));
    if (nextLayers.every((item: ModelLayer, index: number) => item.visible === layers[index]?.visible)) {
      return;
    }
    pushUndoSnapshot();
    setLayers(nextLayers);
    writeOperationLog(visible ? "显示全部图层" : "隐藏全部非激活图层");
  };
}
