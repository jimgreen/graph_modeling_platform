/** 节点群组变换、旋转缩放控制柄与批量移动布线调度工厂模块。 */

import type { SelectionDragScope } from "./appScopeTypes";
import { useState } from "react";
import { Modal, Select } from "antd";
import { expandGlobalBoundaryDeletionNodeIds } from "../global-lines";
import { CONTAINER_KINDS, modelAssociationDevicesModelTypeFailureMessage } from "../model";
import {
  applyAddToContainer,
  applyRemoveFromContainer,
  buildNewContainer,
  containerAddIsNoop,
  containerAssignedIdsFromSelection,
  containerDeletionFinalize,
  containerDeletionWarning,
  containerGatewayUnbindNotice,
  containerKindOptions,
  containerKindSwitch,
  containerMemberIdsFromSelection,
  containerNameOptions,
  containerNamePick,
  containerNameSearch,
  commitContainerMembership,
  defaultContainerName,
  finalizeContainerAfterNodeDeletion,
  hasContainer,
  isContainerNode,
  withNodeUpdates,
  type ContainerDraft,
} from "../acContainer";
import type {
  CanvasBounds,
  ContainerTerminalAssociationValue,
  DeviceTemplate,
  Edge,
  ModelGroup,
  ModelLayer,
  ModelNode,
  Point,
  ProjectFile,
  RoutedEdge,
  Terminal,
  TerminalType,
} from "../model";
import { normalizeElectricFlowSettings } from "../export/electric-flow-markup.ts";
import type { GraphStore } from "../graphStore";
import type {
  CustomDeviceDraft,
  FilterSelectionTypeOption,
  UndoSnapshot,
  CanvasSelectionSnapshot,
  DeviceLibraryPersistencePayload,
  GraphTemplate,
  GroupDeviceTerminalDraft,
  ModifierSelectionPressState,
  ModifierSelectionPressTarget,
} from "./appCoreCanvasUtilities";
import type { CanvasClipboard, CanvasSelectionScope, DisplayLayerAction, SelectionRect } from "../selectionActions";
import type { MeasurementGroup, ProjectMeasurementConfig } from "../measurements";
import type { NodeLabelDisplayMode } from "../nodeLabelUtils";
import type { PointerEvent as ReactPointerEvent } from "react";

// 线路端点引用：设备端子 → 该端所属的线路端（source / target）。
export type RoutableLineDeviceEndpointRefs = { source?: { nodeId: string; terminalId: string }; target?: { nodeId: string; terminalId: string } };

// 拖拽预览连线的两端落点。
export type DragPreviewEndpointPoints = { start: Point; end: Point; source: ModelNode; target: ModelNode };

/**
 * ─── 本文件 9 处随机 id 的随机源单源（2026-10 审计收敛）─────────────────────────
 * 粘贴、模板落点、新建模板、组合、拖动后重叠端子自动补边这 9 处
 * `Math.random().toString(36)` 产出的都是**图元主键**，不是视觉抖动/临时 id：
 *   ① 节点/边 id 经 setGraphArrays 进图元状态 → createCurrentProject 落盘方案文件，
 *      并被 model-eexport 原样写进 E 导出（`id: node.id`）；
 *   ② 边 id 还被 cloneCanvasClipboard 的 idMap 改写 sourceId/targetId，漏了它整条边失联；
 *   ③ 组合 id 经 setGroups 进状态、模板 id 经 persistTemplateLibraryChange 落盘模板库。
 * 所以随机段必须可注入，测试才能确定化。
 * 约定与 appControlFactories 同一套：`__appScope.randomSource` 是注入缝，缺省或非函数
 * 一律回退 Math.random —— 默认行为逐字不变（读取时机仍是调用那一刻，外部对 Math.random
 * 的打桩照旧生效），且不要求 App.tsx 装配该字段。
 */
export function canvasIdRandom(__appScope: SelectionDragScope): () => number {
  const injected = __appScope?.randomSource;
  return typeof injected === "function" ? injected : Math.random;
}

// 前缀 / 长度 / Date.now() 那半截逐字照抄原表达式，只把随机段换成可注入源。
const createCanvasNodeId = (random: () => number) => `node-${Date.now()}-${random().toString(36).slice(2, 6)}`;

const createCanvasEdgeId = (random: () => number) => `edge-${Date.now()}-${random().toString(36).slice(2, 6)}`;

const createCanvasGroupId = (random: () => number) => `group-${Date.now()}-${random().toString(36).slice(2, 6)}`;

const createGraphTemplateId = (random: () => number) => `graph-template-${Date.now()}-${random().toString(36).slice(2, 8)}`;

export const createOverlapEdgeId = (random: () => number, index: number) => `edge-overlap-${Date.now()}-${index}-${random().toString(36).slice(2, 6)}`;

export function createEnsureDraggingUndoSnapshot(__appScope: SelectionDragScope) {
  return () => {
  const { dragUndoCapturedRef, draggingRef, nodeById, nodes, pushUndoSnapshot, undoScopeForDraggingState } = __appScope;
    if (dragUndoCapturedRef.current) {
      return;
    }
    const dragState = draggingRef.current;
    const nodeIds = dragState?.nodeIds ?? [];
    const target = nodeIds.length === 1 ? (() => { const n = nodeById?.get?.(nodeIds[0]); return n ? `${n.params?.idx || n.id} ${n.name ?? ""}`.trim() : ""; })() : (nodeIds.length > 1 ? `${nodeIds.length} 个设备` : "");
    // 有容器时作用域必须让位:容器几何重算 / 成员归属 / 关口解绑 / 挤出都在拖动集之外,
    // 一旦走 patch 通道这些节点就落在撤销计划外(Ctrl+Z 后残留新几何与新归属)。
    // undefined = 全量对比分支,正确性无损,只多一趟 O(n) 比较。
    const scope = nodes && hasContainer(nodes) ? undefined : undoScopeForDraggingState(dragState);
    pushUndoSnapshot(true, false, scope, "移动设备", target);
    dragUndoCapturedRef.current = true;
  };
}

export function createRequestCanvasFrameCenter(__appScope: SelectionDragScope) {
  return () => {
  const { setCanvasCenterRequest } = __appScope;
    setCanvasCenterRequest((current: number) => current + 1);
  };
}

function applyHistorySnapshot(__appScope: SelectionDragScope, snapshot: UndoSnapshot, operationLog: string) {
  const { applyUndoGraphSnapshot, currentMutationRevisionRef, resetConnectPreviewState, savedMutationRevisionRef, setActiveLayerId, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasBackgroundImageFit, setCanvasHeight, setCanvasSelectionScope, setCanvasWidth, setConnectSource, setContextMenu, setCurrentUnit, setDeviceIndexCounters, setFeeder, setGroups, setHasUnsavedChanges, setLayers, setModelType, setOperationLogText, setPowerBaseValue, setPowerUnit, setProjectMeasurements, setProjectMenu, setProjectName, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSubcontrolarea, setSubstation, setTaiqu, setTopology, setTopologyErrors, setTopologyStatus, setVoltageUnit, skipNextTopologyStaleRef } = __appScope;
  setProjectName(snapshot.projectName);
  setLayers(snapshot.layers.map((layer: ModelLayer) => ({ ...layer })));
  setActiveLayerId(snapshot.activeLayerId);
  setCanvasWidth(snapshot.canvasWidth);
  setCanvasHeight(snapshot.canvasHeight);
  setAllowAutoExpandCanvas(snapshot.allowAutoExpandCanvas);
  setCanvasBackgroundColor(snapshot.canvasBackgroundColor);
  setCanvasBackgroundImage(snapshot.canvasBackgroundImage);
  setCanvasBackgroundImageAssetId(snapshot.canvasBackgroundImageAssetId);
  setCanvasBackgroundImageFit?.(snapshot.canvasBackgroundImageFit ?? "cover");
  setBackgroundProjectId(snapshot.backgroundProjectId);
  setBackgroundLayerIds(snapshot.backgroundLayerIds);
  setPowerUnit(snapshot.powerUnit);
  setVoltageUnit(snapshot.voltageUnit);
  setCurrentUnit(snapshot.currentUnit);
  setPowerBaseValue(snapshot.powerBaseValue);
  setModelType(snapshot.modelType ?? "");
  setSubcontrolarea(snapshot.subcontrolarea ?? "");
  setSubstation(snapshot.substation ?? "");
  setFeeder(snapshot.feeder ?? "");
  setTaiqu(snapshot.taiqu ?? "");
  setDeviceIndexCounters(snapshot.deviceIndexCounters);
  skipNextTopologyStaleRef.current = true;
  applyUndoGraphSnapshot(snapshot);
  setGroups(snapshot.groups);
  setProjectMeasurements(snapshot.measurements);
  setTopologyErrors(snapshot.topologyErrors);
  setTopology(snapshot.topology);
  setTopologyStatus(snapshot.topologyStatus);
  setCanvasSelectionScope("group");
  setSelectedNodeIds([]);
  setSelectedEdgeId("");
  setSelectedEdgeIds([]);
  setConnectSource(null);
  resetConnectPreviewState();
  setRewiring(null);
  setContextMenu(null);
  setProjectMenu(null);
  if (currentMutationRevisionRef && typeof snapshot.revision === "number") {
    currentMutationRevisionRef.current = snapshot.revision;
    if (savedMutationRevisionRef) {
      setHasUnsavedChanges(currentMutationRevisionRef.current !== savedMutationRevisionRef.current);
    } else {
      setHasUnsavedChanges(true);
    }
  } else {
    setHasUnsavedChanges(true);
  }
  setOperationLogText(operationLog);
}

export function createUndoLastOperation(__appScope: SelectionDragScope) {
  return () => {
    const { cloneProjectState, currentMutationRevisionRef, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, pendingBusTerminalSyncNodeIdsRef, pendingStoredRouteEdgeIdsRef, redoStackRef, setRedoStack, setUndoStack, undoStackRef } = __appScope;
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    pendingStoredRouteEdgeIdsRef.current = new Set();
    pendingBusTerminalSyncNodeIdsRef.current = new Set();

    // 若具备 undoStackRef（生产路径），直接在事件处理内同步出栈并压入 redoStack，
    // 既支持「全部撤回」同帧连续调用，也避免在 React setState updater 内触发副作用。
    if (undoStackRef && Array.isArray(undoStackRef.current)) {
      const current = undoStackRef.current as UndoSnapshot[];
      const snapshot = current.at(-1);
      if (!snapshot) {
        return;
      }
      if (typeof cloneProjectState === "function" && setRedoStack) {
        const redoEntry: UndoSnapshot = cloneProjectState(false);
        redoEntry.label = snapshot.label;
        redoEntry.target = snapshot.target;
        if (currentMutationRevisionRef) {
          redoEntry.revision = currentMutationRevisionRef.current;
        }
        const prevRedo = Array.isArray(redoStackRef?.current) ? (redoStackRef.current as UndoSnapshot[]) : [];
        const nextRedo = [...prevRedo.slice(-49), redoEntry];
        if (redoStackRef) {
          redoStackRef.current = nextRedo;
        }
        setRedoStack(nextRedo);
      }
      const nextUndo = current.slice(0, -1);
      undoStackRef.current = nextUndo;
      setUndoStack(nextUndo);
      applyHistorySnapshot(__appScope, snapshot, "撤销上一步操作");
      return;
    }

    setUndoStack((current: UndoSnapshot[]) => {
      const snapshot = current.at(-1);
      if (!snapshot) {
        return current;
      }
      applyHistorySnapshot(__appScope, snapshot, "撤销上一步操作");
      return current.slice(0, -1);
    });
  };
}

export function createRedoLastOperation(__appScope: SelectionDragScope) {
  return () => {
    const { cloneProjectState, currentMutationRevisionRef, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, pendingBusTerminalSyncNodeIdsRef, pendingStoredRouteEdgeIdsRef, redoStackRef, setRedoStack, setUndoStack, undoStackRef } = __appScope;
    if (!setRedoStack) {
      return;
    }
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    pendingStoredRouteEdgeIdsRef.current = new Set();
    pendingBusTerminalSyncNodeIdsRef.current = new Set();

    if (redoStackRef && Array.isArray(redoStackRef.current)) {
      const currentRedo = redoStackRef.current as UndoSnapshot[];
      const snapshot = currentRedo.at(-1);
      if (!snapshot) {
        return;
      }
      if (typeof cloneProjectState === "function" && setUndoStack) {
        const undoEntry: UndoSnapshot = cloneProjectState(false);
        undoEntry.label = snapshot.label;
        undoEntry.target = snapshot.target;
        if (currentMutationRevisionRef) {
          undoEntry.revision = currentMutationRevisionRef.current;
        }
        const prevUndo = Array.isArray(undoStackRef?.current) ? (undoStackRef.current as UndoSnapshot[]) : [];
        const nextUndo = [...prevUndo.slice(-49), undoEntry];
        if (undoStackRef) {
          undoStackRef.current = nextUndo;
        }
        setUndoStack(nextUndo);
      }
      const nextRedo = currentRedo.slice(0, -1);
      redoStackRef.current = nextRedo;
      setRedoStack(nextRedo);
      applyHistorySnapshot(__appScope, snapshot, "重做上一步操作");
      return;
    }

    setRedoStack((currentRedo: UndoSnapshot[]) => {
      const snapshot = currentRedo.at(-1);
      if (!snapshot) {
        return currentRedo;
      }
      applyHistorySnapshot(__appScope, snapshot, "重做上一步操作");
      return currentRedo.slice(0, -1);
    });
  };
}

export function createCanvasPointerKeyboardShortcutAvailability(__appScope: SelectionDragScope) {
  return () => {
  const { CANVAS_KEYBOARD_SURFACE_SELECTOR, clientPointInsideRenderedCanvas, isCanvasKeyboardBlockingTarget, lastCanvasClientPointerRef, lastKeyboardShortcutClientPointerRef } = __appScope;
    const point = lastKeyboardShortcutClientPointerRef.current ?? lastCanvasClientPointerRef.current;
    if (!point) {
      return "unknown";
    }
    if (!clientPointInsideRenderedCanvas(point.x, point.y)) {
      return "blocked";
    }
    const topElement = document.elementFromPoint(point.x, point.y);
    if (!(topElement instanceof Element)) {
      return "blocked";
    }
    if (isCanvasKeyboardBlockingTarget(topElement)) {
      return "blocked";
    }
    return topElement.closest(CANVAS_KEYBOARD_SURFACE_SELECTOR) ? "unblocked" : "blocked";
  };
}

export function createRouteForCurrentEdgeSave(__appScope: SelectionDragScope) {
  return (edge: Edge): RoutedEdge | undefined => {
  const { canvasBounds, compactPreviewNodes, nodeById, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routeEdgesForStoredRendering, routedEdgeById } = __appScope;
    const cachedRoute =
      !pendingStoredRouteEdgeIdsRef.current.has(edge.id) && !pendingRouteEdgeIdsRef.current.has(edge.id)
        ? routedEdgeById.get(edge.id)
        : undefined;
    if (cachedRoute?.points.length) {
      return cachedRoute;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && target) {
      const route = routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], canvasBounds)[0];
      if (route?.points.length) {
        return route;
      }
    }
    return edge.routePoints && edge.routePoints.length >= 2
      ? { edgeId: edge.id, points: edge.routePoints.map((point) => ({ ...point })), path: "" }
      : undefined;
  };
}

export function createCurrentProject(__appScope: SelectionDragScope) {
  return (): ProjectFile => {
  const { activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, backgroundProjectRecord, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageFit, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edgeWithCurrentRouteGeometryForSave, edges, electricFlowVisible, electricFlowSettings, groups, layers, lockProjectEdgeTerminals, nodes, normalizeModelGroups, normalizeProjectLayers, normalizeProjectMeasurements, powerBaseValue, powerUnit, projectMeasurements, projectName, projectIdx, voltageUnit, substation, feeder, modelType, subcontrolarea, taiqu } = __appScope;
    // 背景页引用键取模型全局 idx：SavedProjectRecord 顶层无 idx，模型自身落盘才有（同 nextGlobalProjectIndex 口径）
    const backgroundProjectIdx = Number(backgroundProjectRecord?.project?.idx);
    const projectEdges = edges.map(edgeWithCurrentRouteGeometryForSave);
    return normalizeProjectLayers(lockProjectEdgeTerminals({
      version: 1,
      name: projectName,
      ...(projectIdx > 0 ? { idx: projectIdx } : {}),
      layers,
      activeLayerId,
      canvasWidth,
      canvasHeight,
      allowAutoExpandCanvas,
      canvasBackgroundColor,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      canvasBackgroundImageFit,
      backgroundProjectId,
      ...(backgroundProjectIdx > 0 ? { backgroundProjectIdx } : {}),
      backgroundLayerIds,
      // 电流流水线开关落盘：服务端导出链（svgExport.mjs 等）只读存档，不看前端内存态，
      // 不带这个字段的话「导出 SVG 文件」永远看不到用户自己打开的流水线。
      // 显式 `!!` 是为了不把 undefined 写进 JSON —— 缺字段的旧存档读回来走 `?? false`。
      electricFlowVisible: !!electricFlowVisible,
      // 外观设置随开关一起落盘：全空对象也显式写入（四项缺省走内置默认），
      // 让存档里「开关开 + 外观」始终成对出现，读回侧不用猜。
      electricFlowSettings: normalizeElectricFlowSettings(electricFlowSettings),
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      subcontrolarea,
      modelType,
      substation,
      feeder,
      taiqu,
      deviceIndexCounters,
      groups: normalizeModelGroups(groups, nodes, projectEdges),
      measurements: normalizeProjectMeasurements(projectMeasurements, nodes),
      nodes,
      edges: projectEdges
    }));
  };
}

export function createAdjustSelectedDisplayLayer(__appScope: SelectionDragScope) {
  return (action: DisplayLayerAction) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, nodes, pushUndoSnapshot, reorderItemsByDisplayLayer, setCanvasSelectionScope, setContextMenu, setNodes, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      writeOperationLog("当前没有被选中元件。");
      return;
    }
    const nextNodes = reorderItemsByDisplayLayer(nodes, activeSelectedNodeIds, action);
    if (nextNodes === nodes) {
      writeOperationLog("选中元件显示层级未变化。");
      setContextMenu(null);
      return;
    }
    const actionLabels: Record<DisplayLayerAction, string> = {
      raise: "提升显示层级",
      lower: "降低显示层级",
      front: "顶层显示",
      back: "底层显示"
    };
    pushUndoSnapshot();
    setNodes(nextNodes);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(activeSelectedNodeIds);
    setSelectedEdgeIds(activeSelectedEdgeIds);
    setSelectedEdgeId(activeSelectedEdgeIds[0] ?? "");
    setContextMenu(null);
    writeOperationLog(`${actionLabels[action]}：${activeSelectedNodeIds.length} 个元件`);
  };
}

export function createClearTransientSelectionState(__appScope: SelectionDragScope) {
  return () => {
  const { resetConnectPreviewState, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds } = __appScope;
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
}

/**
 * 空白画布按下时只「登记」待清除的选中，真正的清空推迟到指针抬起。
 * 平移画布（拖空白）是高频操作，若在 pointerdown 就清选，用户每挪一次视图都会丢掉已选设备。
 */
export function createQueuePendingBlankCanvasDeselect(__appScope: SelectionDragScope) {
  return (event: { clientX: number; clientY: number }) => {
  const { pendingBlankCanvasDeselectRef } = __appScope;
    if (!pendingBlankCanvasDeselectRef) {
      return;
    }
    pendingBlankCanvasDeselectRef.current = { clientX: event.clientX, clientY: event.clientY };
  };
}

/** 平移过程中指针一旦越过位移阈值就作废待清除标记，保住已选设备。 */
export function createCancelPendingBlankCanvasDeselectOnMove(__appScope: SelectionDragScope) {
  return (clientX: number, clientY: number, threshold: number) => {
  const { pendingBlankCanvasDeselectRef } = __appScope;
    const pending = pendingBlankCanvasDeselectRef?.current;
    if (!pending) {
      return;
    }
    if (Math.hypot(clientX - pending.clientX, clientY - pending.clientY) > threshold) {
      pendingBlankCanvasDeselectRef.current = null;
    }
  };
}

/** 指针抬起且未发生平移时执行：清空选中并回到「空白」检查器。 */
export function createFlushPendingBlankCanvasDeselect(__appScope: SelectionDragScope) {
  return () => {
  const { activeProjectKey, activeSchemeKey, pendingBlankCanvasDeselectRef, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, switchInspectorTabForCanvasSelection } = __appScope;
    if (!pendingBlankCanvasDeselectRef?.current) {
      return;
    }
    pendingBlankCanvasDeselectRef.current = null;
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    switchInspectorTabForCanvasSelection([], [], "blank");
    if (activeProjectKey) {
      setSelectedProjectId(activeProjectKey);
      setSelectedProjectIds([activeProjectKey]);
      setSelectedSchemeId(activeSchemeKey);
      setSelectedSchemeIds([]);
    }
  };
}

export function createWriteOperationLog(__appScope: SelectionDragScope) {
  return (message: string) => {
  const { setOperationLogText } = __appScope;
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setOperationLogText(`${time} ${message}`);
  };
}

const pendingDeviceLibraryPersistenceByRef = new WeakMap<
  object,
  { payload: string; promise: Promise<boolean> }
>();

export function createPersistDeviceLibraryChange(__appScope: SelectionDragScope) {
  return (
    overrides: Partial<DeviceLibraryPersistencePayload>,
    messages: { success?: string; failure?: string } = {}
  ) => {
  const { backendDeviceLibraryLoadedRef, customCategoryLibraries, customComponentLibraries, customDeviceTemplates, customGraphTemplateTypes, customGraphTemplates, deviceDefinitionOverrides, eDeviceDefinitionLabels, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, eDeviceDefinitionTemplateFields, lastPersistedDeviceLibraryPayloadRef, normalizeDeviceLibraryPersistencePayload, saveBackendDeviceLibraryPayload, serializeDeviceLibraryForStorage, suppressNextBackendDeviceLibrarySyncRef, writeLocalDeviceLibraryPersistencePayload, writeOperationLog } = __appScope;
    const normalizedDeviceLibrary = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates,
      customCategoryLibraries,
      customComponentLibraries,
      deviceDefinitionOverrides,
      eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields,
      customGraphTemplateTypes,
      customGraphTemplates,
      ...overrides
    });
    const normalizedDeviceLibraryPayload = serializeDeviceLibraryForStorage(normalizedDeviceLibrary);
    writeLocalDeviceLibraryPersistencePayload(normalizedDeviceLibrary);
    if (normalizedDeviceLibraryPayload === lastPersistedDeviceLibraryPayloadRef.current) {
      const pendingPersistence = pendingDeviceLibraryPersistenceByRef.get(lastPersistedDeviceLibraryPayloadRef);
      return pendingPersistence?.payload === normalizedDeviceLibraryPayload
        ? pendingPersistence!.promise
        : Promise.resolve(true);
    }
    lastPersistedDeviceLibraryPayloadRef.current = normalizedDeviceLibraryPayload;
    suppressNextBackendDeviceLibrarySyncRef.current = false;
    if (!backendDeviceLibraryLoadedRef.current) {
      lastPersistedDeviceLibraryPayloadRef.current = null;
      if (messages.failure) {
        writeOperationLog(messages.failure);
      }
      return Promise.resolve(false);
    }
    let persistencePromise: Promise<boolean>;
    persistencePromise = saveBackendDeviceLibraryPayload(normalizedDeviceLibraryPayload)
      .then(() => {
        if (messages.success) {
          writeOperationLog(messages.success);
        }
        return true;
      })
      .catch(() => {
        if (lastPersistedDeviceLibraryPayloadRef.current === normalizedDeviceLibraryPayload) {
          lastPersistedDeviceLibraryPayloadRef.current = null;
        }
        if (messages.failure) {
          writeOperationLog(messages.failure);
        }
        return false;
      })
      .finally(() => {
        const pendingPersistence = pendingDeviceLibraryPersistenceByRef.get(lastPersistedDeviceLibraryPayloadRef);
        if (pendingPersistence?.promise === persistencePromise) {
          pendingDeviceLibraryPersistenceByRef.delete(lastPersistedDeviceLibraryPayloadRef);
        }
      });
    pendingDeviceLibraryPersistenceByRef.set(lastPersistedDeviceLibraryPayloadRef, {
      payload: normalizedDeviceLibraryPayload,
      promise: persistencePromise
    });
    return persistencePromise;
  };
}

export function createPersistTemplateLibraryChange(__appScope: SelectionDragScope) {
  return (overrides: Pick<Partial<DeviceLibraryPersistencePayload>, "customGraphTemplateTypes" | "customGraphTemplates">) => {
  const { persistDeviceLibraryChange } = __appScope;
    persistDeviceLibraryChange(overrides, {
      success: "模板库已自动保存到后台",
      failure: "模板库自动保存到后台失败"
    });
  };
}

export function createConnectionCommitFailureMessage(__appScope: SelectionDragScope) {
  return (issues: { type?: string; message?: string }[] = []) => {
    const needsReroute = issues.some((issue) =>
      issue.type === "blocked-by-node" ||
      issue.type === "out-of-bounds"
    );
    if (needsReroute) {
      return "已自动尝试避让设备和静态图元，但当前空间不足以形成安全正交路径，请稍微移动相关图元或扩大显示区域后重试。";
    }
    return issues[0]?.message ?? "联络线不满足正交、避让、端子垂直或最优路径约束。";
  };
}

export function createSwitchInspectorTabForCanvasSelection(__appScope: SelectionDragScope) {
  return (
    nodeIds: readonly string[] = [],
    edgeIds: readonly string[] = [],
    source: "single" | "marquee" | "blank" = "single"
  ) => {
  const { isStaticGraphicNode, nodeById, setInspectorTab, setSelectedDeviceInfoView } = __appScope;
    if (source === "blank" || (nodeIds.length === 0 && edgeIds.length === 0)) {
      setInspectorTab("model");
      return;
    }
    const selectedGraphicCount = nodeIds.length + edgeIds.length;
    if (selectedGraphicCount > 1) {
      setInspectorTab("tree");
      return;
    }
    if (selectedGraphicCount === 1) {
      const selectedNode = nodeIds.length === 1 && edgeIds.length === 0
        ? nodeById?.get(nodeIds[0])
        : undefined;
      if (selectedNode && !isStaticGraphicNode(selectedNode)) {
        setInspectorTab("device");
        setSelectedDeviceInfoView("model");
        return;
      }
      setInspectorTab("graph");
    }
  };
}

export function createSelectCanvasGraphics(__appScope: SelectionDragScope) {
  return (
    nodeIds: readonly string[] = [],
    edgeIds: readonly string[] = [],
    options: { scope?: CanvasSelectionScope } = {}
  ) => {
  const { canvasSelectionShortcutActiveRef, expandActiveGroupSelection, resolveCanvasSelection, setCanvasSelectionScope, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    const scope = options.scope ?? "group";
    const selection = scope === "direct"
      ? resolveCanvasSelection([], nodeIds, edgeIds, "direct")
      : expandActiveGroupSelection(nodeIds, edgeIds);
    canvasSelectionShortcutActiveRef.current = selection.nodeIds.length > 0 || selection.edgeIds.length > 0;
    setCanvasSelectionScope(scope);
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    return selection;
  };
}

export function createSetModifierSelectionPress(__appScope: SelectionDragScope) {
  return (next: ModifierSelectionPressState) => {
  const { modifierSelectionPressRef, setModifierSelectionPressState } = __appScope;
    modifierSelectionPressRef.current = next;
    setModifierSelectionPressState(next);
  };
}

export function createToggleNodeSelectionFromModifierClick(__appScope: SelectionDragScope) {
  return (node: ModelNode) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, resetConnectPreviewState, selectedEdgeId, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    const nodeAlreadySelected = activeSelectedNodeIds.includes(node.id);
    const nextNodeIds = nodeAlreadySelected
      ? activeSelectedNodeIds.filter((nodeId: string) => nodeId !== node.id)
      : [...activeSelectedNodeIds, node.id];
    const nextEdgeIds = [...activeSelectedEdgeIds];
    setCanvasSelectionScope("direct");
    setSelectedNodeIds(nextNodeIds);
    setSelectedEdgeIds(nextEdgeIds);
    setSelectedEdgeId(nextEdgeIds.includes(selectedEdgeId) ? selectedEdgeId : nextEdgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
}

export function createToggleEdgeSelectionFromModifierClick(__appScope: SelectionDragScope) {
  return (edge: Edge) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, resetConnectPreviewState, selectedEdgeId, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    const edgeAlreadySelected = activeSelectedEdgeIds.includes(edge.id);
    const nextEdgeIds = edgeAlreadySelected
      ? activeSelectedEdgeIds.filter((edgeId: string) => edgeId !== edge.id)
      : [...activeSelectedEdgeIds, edge.id];
    const nextNodeIds = [...activeSelectedNodeIds];
    setCanvasSelectionScope("direct");
    setSelectedNodeIds(nextNodeIds);
    setSelectedEdgeIds(nextEdgeIds);
    setSelectedEdgeId(nextEdgeIds.includes(selectedEdgeId) ? selectedEdgeId : nextEdgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
}

export function createToggleSelectionFromModifierClick(__appScope: SelectionDragScope) {
  return (nodeIds: readonly string[], edgeIds: readonly string[] = []) => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, resetConnectPreviewState, selectedEdgeId, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    const targetNodeIds = nodeIds.filter((nodeId) => activeLayerNodeIdSet.has(nodeId));
    const targetEdgeIds = edgeIds.filter((edgeId) => activeLayerEdgeIdSet.has(edgeId));
    if (targetNodeIds.length === 0 && targetEdgeIds.length === 0) {
      return;
    }
    const allTargetsSelected =
      targetNodeIds.every((nodeId) => activeSelectedNodeIds.includes(nodeId)) &&
      targetEdgeIds.every((edgeId) => activeSelectedEdgeIds.includes(edgeId));
    const targetNodeIdSet = new Set(targetNodeIds);
    const targetEdgeIdSet = new Set(targetEdgeIds);
    const nextNodeIds = allTargetsSelected
      ? activeSelectedNodeIds.filter((nodeId: string) => !targetNodeIdSet.has(nodeId))
      : [...activeSelectedNodeIds, ...targetNodeIds.filter((nodeId) => !activeSelectedNodeIds.includes(nodeId))];
    const nextEdgeIds = allTargetsSelected
      ? activeSelectedEdgeIds.filter((edgeId: string) => !targetEdgeIdSet.has(edgeId))
      : [...activeSelectedEdgeIds, ...targetEdgeIds.filter((edgeId) => !activeSelectedEdgeIds.includes(edgeId))];
    setCanvasSelectionScope("direct");
    setSelectedNodeIds(nextNodeIds);
    setSelectedEdgeIds(nextEdgeIds);
    setSelectedEdgeId(nextEdgeIds.includes(selectedEdgeId) ? selectedEdgeId : nextEdgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
}

export function createRestoreCanvasSelectionSnapshot(__appScope: SelectionDragScope) {
  return (snapshot: CanvasSelectionSnapshot | undefined) => {
  const { canvasSelectionShortcutActiveRef, setCanvasSelectionScope, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    if (!snapshot) {
      return;
    }
    canvasSelectionShortcutActiveRef.current = snapshot.nodeIds.length > 0 || snapshot.edgeIds.length > 0;
    setCanvasSelectionScope(snapshot.scope);
    setSelectedNodeIds(snapshot.nodeIds);
    setSelectedEdgeIds(snapshot.edgeIds);
    setSelectedEdgeId(snapshot.edgeIds.includes(snapshot.edgeId) ? snapshot.edgeId : snapshot.edgeIds[0] ?? "");
  };
}

export function createRestoreCanvasSelectionSnapshotWithInspector(__appScope: SelectionDragScope) {
  return (
    snapshot: CanvasSelectionSnapshot | undefined,
    source: "single" | "marquee" | "blank" = "single"
  ) => {
  const { restoreCanvasSelectionSnapshot, switchInspectorTabForCanvasSelection } = __appScope;
    restoreCanvasSelectionSnapshot(snapshot);
    if (snapshot) {
      switchInspectorTabForCanvasSelection(snapshot.nodeIds, snapshot.edgeIds, source);
    }
  };
}

export function createStartModifierSelectionPress(__appScope: SelectionDragScope) {
  return (
    event: ReactPointerEvent<Element>,
    target: ModifierSelectionPressTarget = { kind: "blank" }
  ) => {
  const { clampPointToCanvas, lastCanvasPointerRef, lastEdgePointerClickRef, lastRawCanvasPointerRef, resetConnectPreviewState, screenToSvgPoint, setConnectSource, setContextMenu, setMarquee, setModifierSelectionPress, setProjectMenu, setRewiring, staticButtonPointerRef, svgRef, updateMouseStatus } = __appScope;
    if (event.button !== 0 || !svgRef.current) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    updateMouseStatus(pointer);
    setContextMenu(null);
    setProjectMenu(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setMarquee(null);
    lastEdgePointerClickRef.current = null;
    staticButtonPointerRef.current = null;
    setModifierSelectionPress({
      pointerId: event.pointerId,
      startPoint: pointer,
      currentPoint: pointer,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
      target
    });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
    return true;
  };
}

export function createCancelModifierSelectionPress(__appScope: SelectionDragScope) {
  return () => {
  const { modifierSelectionPressRef, setMarquee, setModifierSelectionPress } = __appScope;
    if (!modifierSelectionPressRef.current) {
      return false;
    }
    setModifierSelectionPress(null);
    setMarquee(null);
    return true;
  };
}

export function createFinishModifierSelectionPress(__appScope: SelectionDragScope) {
  return (pointerId?: number) => {
  const { activeLayerEdgeIdSet, activeLayerNodeIdSet, edgeById, finishMarqueeSelectionFromPoints, modifierSelectionPressRef, nodeById, setMarquee, setModifierSelectionPress, toggleEdgeSelectionFromModifierClick, toggleNodeSelectionFromModifierClick, toggleSelectionFromModifierClick } = __appScope;
    const press = modifierSelectionPressRef.current;
    if (!press || (pointerId !== undefined && press.pointerId !== pointerId)) {
      return false;
    }
    setModifierSelectionPress(null);
    if (press.moved) {
      finishMarqueeSelectionFromPoints(press.startPoint, press.currentPoint);
      return true;
    }
    setMarquee(null);
    if (press.target.kind === "node") {
      const node = nodeById.get(press.target.nodeId);
      if (node && activeLayerNodeIdSet.has(node.id)) {
        toggleNodeSelectionFromModifierClick(node);
      }
    } else if (press.target.kind === "edge") {
      const edge = edgeById.get(press.target.edgeId);
      if (edge && activeLayerEdgeIdSet.has(edge.id)) {
        toggleEdgeSelectionFromModifierClick(edge);
      }
    } else if (press.target.kind === "selection") {
      toggleSelectionFromModifierClick(press.target.nodeIds, press.target.edgeIds);
    }
    return true;
  };
}

export function createStartNodeLabelDrag(__appScope: SelectionDragScope) {
  return (event: ReactPointerEvent<SVGGElement>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, clampPointToCanvas, getNodeScaleX, getNodeScaleY, getSafeNodeScaleX, getSafeNodeScaleY, hasCanvasSelectionModifier, nodeLabelOffset, screenToSvgPoint, selectCanvasGraphics, setInspectorTab, setNodeLabelDrag, startModifierSelectionPress, svgRef } = __appScope;
    if (!event.nativeEvent.defaultPrevented) {
      event.preventDefault();
    }
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setInspectorTab("graph");
    activateInspectorFromCanvas();
    setNodeLabelDrag({
      nodeId: node.id,
      pointerId: event.pointerId,
      startPoint: point,
      startOffset: nodeLabelOffset(node),
      scaleX: getSafeNodeScaleX(node),
      scaleY: getSafeNodeScaleY(node)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartNodeLabelRotateDrag(__appScope: SelectionDragScope) {
  return (event: ReactPointerEvent<SVGCircleElement>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, hasCanvasSelectionModifier, nodeLabelCanvasCenter, normalizeNodeLabelRotation, selectCanvasGraphics, setInspectorTab, setNodeLabelRotateDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setInspectorTab("graph");
    activateInspectorFromCanvas();
    setNodeLabelRotateDrag({
      nodeId: node.id,
      pointerId: event.pointerId,
      center: nodeLabelCanvasCenter(node),
      startRotation: normalizeNodeLabelRotation(node.params._labelRotation)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createFinishNodeLabelDrag(__appScope: SelectionDragScope) {
  return () => {
  const { commitNodeFootprintUpdates, graphStore, nodeById, nodeLabelDrag, overlayGraphStoreNodes, setNodeLabelDrag } = __appScope;
    if (nodeLabelDrag?.historyCaptured) {
      const currentNode = nodeById.get(nodeLabelDrag.nodeId);
      if (currentNode) {
        const previousNode = {
          ...currentNode,
          params: {
            ...currentNode.params,
            _labelX: String(nodeLabelDrag.startOffset.x),
            _labelY: String(nodeLabelDrag.startOffset.y)
          }
        };
        commitNodeFootprintUpdates([currentNode], {
          previousNodes: overlayGraphStoreNodes(graphStore, [previousNode])
        });
      }
    }
    setNodeLabelDrag(null);
  };
}

export function createFinishNodeLabelRotateDrag(__appScope: SelectionDragScope) {
  return () => {
  const { commitNodeFootprintUpdates, graphStore, nodeById, nodeLabelRotateDrag, overlayGraphStoreNodes, setNodeLabelRotateDrag } = __appScope;
    if (nodeLabelRotateDrag?.historyCaptured) {
      const currentNode = nodeById.get(nodeLabelRotateDrag.nodeId);
      if (currentNode) {
        const previousNode = {
          ...currentNode,
          params: {
            ...currentNode.params,
            _labelRotation: String(nodeLabelRotateDrag.startRotation)
          }
        };
        commitNodeFootprintUpdates([currentNode], {
          previousNodes: overlayGraphStoreNodes(graphStore, [previousNode])
        });
      }
    }
    setNodeLabelRotateDrag(null);
  };
}

export function createSetSelectedNodeLabelDisplayMode(__appScope: SelectionDragScope) {
  return (mode: NodeLabelDisplayMode) => {
  const { NODE_LABEL_DISPLAY_MODES, activeSelectedNodeIds, commitNodeFootprintUpdates, isStaticNode, nodeById, nodeLabelDisplayMode, pushUndoSnapshot, writeOperationLog } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const updates = activeSelectedNodeIds.flatMap((nodeId: string) => {
      const node = nodeById.get(nodeId);
      if (!node || isStaticNode(node)) {
        return [];
      }
      if (nodeLabelDisplayMode(node) === mode && node.params._labelDisplayMode === mode) {
        return [];
      }
      return [{ ...node, params: { ...node.params, _labelDisplayMode: mode, _labelVisible: mode === "hidden" ? "0" : "1" } }];
    });
    if (updates.length === 0) {
      return;
    }
    const label = NODE_LABEL_DISPLAY_MODES.find((item: { value: string; label: string }) => item.value === mode)?.label ?? mode;
    pushUndoSnapshot();
    commitNodeFootprintUpdates(updates);
    writeOperationLog(`设置 ${updates.length} 个图元标识显示方式：${label}`);
  };
}

export function createToggleSelectedNodeLabelDisplay(__appScope: SelectionDragScope) {
  return () => {
  const { activeSelectedNodeIds, isStaticNode, nodeById, nodeLabelDisplayMode, setSelectedNodeLabelDisplayMode } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const hasVisibleLabel = activeSelectedNodeIds.some((nodeId: string) => {
      const node = nodeById.get(nodeId);
      return node && !isStaticNode(node) && nodeLabelDisplayMode(node) !== "hidden";
    });
    setSelectedNodeLabelDisplayMode(hasVisibleLabel ? "hidden" : "follow");
  };
}

export function createCopySelection(__appScope: SelectionDragScope) {
  return () => {
  const { activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, buildCanvasClipboard, canvasSelectionScope, routedEdges, setCanvasClipboard, visibleEdges, visibleNodes, writeOperationLog } = __appScope;
    const clipboard = buildCanvasClipboard(
      visibleNodes,
      visibleEdges,
      routedEdges,
      activeSelectedNodeIds,
      activeSelectedEdgeIds,
      activeLayerGroups,
      { expandGroups: canvasSelectionScope === "group" }
    );
    setCanvasClipboard(clipboard);
    writeOperationLog(`复制 ${clipboard.nodes.length} 个图元、${clipboard.edges.length} 条联络线`);
  };
}

export function createCutSelection(__appScope: SelectionDragScope) {
  return () => {
  const { activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, buildCanvasClipboard, canvasSelectionScope, deleteNodesWithConnectedEdges, edges, groups, nodes, normalizeModelGroups, normalizeProjectMeasurements, pushUndoSnapshot, removeGraphicsFromGroups, resetConnectPreviewState, resetRoutableLinePreviewState, resolveCanvasDeleteAction, routedEdges, setCanvasClipboard, setCanvasSelectionScope, setConnectSource, setContextMenu, setGraphArrays, setGroups, setProjectMeasurements, setRewiring, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, showGlobalMessage, visibleEdges, visibleNodes, writeOperationLog } = __appScope;
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: activeSelectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      showGlobalMessage(action.message);
      return;
    }
    const clipboard = buildCanvasClipboard(
      visibleNodes,
      visibleEdges,
      routedEdges,
      activeSelectedNodeIds,
      activeSelectedEdgeIds,
      activeLayerGroups,
      { expandGroups: canvasSelectionScope === "group" }
    );
    setCanvasClipboard(clipboard);
    pushUndoSnapshot();
    const selectedEdges = new Set(activeSelectedEdgeIds);
    const result = activeSelectedNodeIds.length > 0
      ? deleteNodesWithConnectedEdges(nodes, edges, activeSelectedNodeIds)
      : { nodes, edges };
    const nextEdges = result.edges.filter((edge: Edge) => !selectedEdges.has(edge.id));
    // 剪切 = 复制 + 删除:剪走容器要清成员归属、剪走绑定设备要解绑 + 容器重算收缩
    // (半程 enforce:不挤出,否则会搬动刚散出的成员)—— 三步走单源 helper
    const scattered = containerDeletionFinalize(nodes, activeSelectedNodeIds);
    const nextNodes = finalizeContainerAfterNodeDeletion(nodes, result.nodes, activeSelectedNodeIds);
    const unbindNotice = containerGatewayUnbindNotice(nodes, activeSelectedNodeIds);
    setGraphArrays(nextNodes, nextEdges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, activeSelectedNodeIds, selectedEdges), nextNodes, nextEdges));
    setProjectMeasurements((current: ProjectMeasurementConfig) => normalizeProjectMeasurements(current, nextNodes));
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    // 剪切无确认框(剪贴板语义下确认招烦),散出信息靠日志留痕 —— 后缀与删除路径同一措辞
    writeOperationLog(`剪切 ${clipboard.nodes.length} 个图元、${clipboard.edges.length} 条联络线${scattered.length > 0 ? `（${scattered.length} 个成员散出）` : ""}`);
    if (unbindNotice) {
      showGlobalMessage(unbindNotice);
    }
  };
}

export function createPasteSelection(__appScope: SelectionDragScope) {
  return () => {
  const { CANVAS_AUTO_EXPAND_PADDING, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, canvasClipboard, canvasClipboardBounds, canvasHeight, canvasWidth, clampNodePositionToBounds, clampPointToBounds, cloneCanvasClipboard, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, markStoredRouteEdgesDirty, modelType, nodes, normalizeDeviceIndexCounters, normalizeModelGroups, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setDeviceIndexCounters, setGraphArrays, setGroups, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = __appScope;
    if (canvasClipboard.nodes.length === 0 && canvasClipboard.edges.length === 0) {
      return;
    }
    const modelTypeFailureMessage = modelAssociationDevicesModelTypeFailureMessage(modelType, canvasClipboard.nodes);
    if (modelTypeFailureMessage) {
      showGlobalMessage(`无法粘贴：${modelTypeFailureMessage}`);
      writeOperationLog(`拒绝粘贴图元：${modelTypeFailureMessage}`);
      return;
    }
    const targetPoint = lastRawCanvasPointerRef.current ?? lastCanvasPointerRef.current;
    if (!targetPoint) {
      showGlobalMessage("请先将鼠标移动到画布内，再执行粘贴操作。");
      return;
    }
    const bounds = canvasClipboardBounds(canvasClipboard);
    if (!bounds) {
      return;
    }
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const pasteTargetPoint = {
      x: targetPoint.x,
      y: targetPoint.y
    };
    const pasteIdRandom = canvasIdRandom(__appScope);
    const cloned = cloneCanvasClipboard(
      canvasClipboard,
      pasteTargetPoint,
      () => createCanvasNodeId(pasteIdRandom),
      () => createCanvasEdgeId(pasteIdRandom),
      () => createCanvasGroupId(pasteIdRandom)
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      if (canvasClipboard.edges.length > 0) {
        showGlobalMessage("不能粘贴悬空联络线：请同时复制联络线两端连接的设备或母线。");
      }
      return;
    }
    if (rejectAutoCanvasExpansionForContent([...nodes, ...cloned.nodes], [...edges, ...cloned.edges])) {
      return;
    }
    pushUndoSnapshot();
    const pasteOriginShift = leftTopCanvasOriginShiftForContent(
      [...nodes, ...cloned.nodes],
      [...edges, ...cloned.edges]
    );
    const pasteSourceNodes = hasCanvasOriginShift(pasteOriginShift)
      ? nodes.map((node: ModelNode) => translateNodeBy(node, pasteOriginShift))
      : nodes;
    const pasteSourceEdges = hasCanvasOriginShift(pasteOriginShift)
      ? edges.map((edge: Edge) => translateEdgeBy(edge, pasteOriginShift))
      : edges;
    const shiftedClonedNodes = hasCanvasOriginShift(pasteOriginShift)
      ? cloned.nodes.map((node: ModelNode) => translateNodeBy(node, pasteOriginShift))
      : cloned.nodes;
    const shiftedClonedEdges = hasCanvasOriginShift(pasteOriginShift)
      ? cloned.edges.map((edge: Edge) => translateEdgeBy(edge, pasteOriginShift))
      : cloned.edges;
    const pastedCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, pasteOriginShift),
      [...pasteSourceNodes, ...shiftedClonedNodes],
      [...pasteSourceEdges, ...shiftedClonedEdges],
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(pastedCanvasBounds, pasteOriginShift);
    shiftCachedRoutesForCanvasOrigin(pasteOriginShift);
    if (hasCanvasOriginShift(pasteOriginShift)) {
      markBusTerminalSyncDirtyForEdges(pasteSourceEdges, shiftedClonedEdges);
    }
    let nextDeviceIndexCounters = normalizeDeviceIndexCounters(deviceIndexCounters, pasteSourceNodes);
    const pasted = shiftedClonedNodes.map((node: ModelNode) => {
      const draftNode = { ...node, layerId: activeLayerId, position: clampNodePositionToBounds(node, pastedCanvasBounds, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = shiftedClonedEdges.map((edge: Edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, pastedCanvasBounds) : undefined,
      targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, pastedCanvasBounds) : undefined,
      manualPoints: edge.manualPoints?.map((point: Point) => clampPointToBounds(point, pastedCanvasBounds)),
      routePoints: edge.routePoints?.map((point: Point) => clampPointToBounds(point, pastedCanvasBounds))
    }));
    // 归属落地:副本不继承归属(剥离在 buildCanvasClipboard),落点在容器矩形内的副本并入该容器
    const nextNodes = commitContainerMembership([...pasteSourceNodes, ...pasted], pasted.map((node: ModelNode) => node.id));
    const nextEdges = [...pasteSourceEdges, ...pastedEdges];
    markStoredRouteEdgesDirty(pastedEdges.map((edge: Edge) => edge.id));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setGraphArrays(nextNodes, nextEdges);
    const shiftedPasteTargetPoint = translatePointBy(targetPoint, pasteOriginShift);
    lastRawCanvasPointerRef.current = shiftedPasteTargetPoint;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPasteTargetPoint, pastedCanvasBounds);
    setGroups((current: ModelGroup[]) => normalizeModelGroups([...current, ...cloned.groups], nextNodes, nextEdges));
    setCanvasSelectionScope("group");
    setSelectedNodeIds(pasted.map((node: ModelNode) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge: Edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`粘贴 ${pasted.length} 个图元、${pastedEdges.length} 条联络线${pastedCanvasBounds.width > canvasWidth || pastedCanvasBounds.height > canvasHeight ? "，画布已扩展" : ""}`);
  };
}

export function createCreateGraphTemplateType(__appScope: SelectionDragScope) {
  return () => {
    const { customGraphTemplateTypes, graphTemplateTypes, normalizeGraphTemplateTypeName, persistTemplateLibraryChange, setCustomGraphTemplateTypes, setExpandedGraphTemplateTypes, setTemplateDraftType, writeOperationLog } = __appScope;
    const applyTemplateTypeName = (rawName: string | null) => {
      const typeName = normalizeGraphTemplateTypeName(rawName ?? "");
      if (!typeName) {
        return;
      }
      const duplicate = graphTemplateTypes.some((item: string) => item.toLowerCase() === typeName.toLowerCase());
      if (duplicate) {
        showGlobalMessage("模板类型名称重复，请换一个名称。");
        return;
      }
      const nextTypes = [...customGraphTemplateTypes, typeName];
      setCustomGraphTemplateTypes(nextTypes);
      setExpandedGraphTemplateTypes((current: string[]) => current.includes(typeName) ? current : [...current, typeName]);
      setTemplateDraftType(typeName);
      persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes });
      writeOperationLog(`新增模板类型：${typeName}`);
    };
    const globalPrompt = (
      globalThis as { showGlobalPrompt?: (text: string, value?: string) => Promise<string | null> }
    ).showGlobalPrompt;
    if (typeof globalPrompt === "function") {
      void globalPrompt("请输入模板类型名称", "").then(applyTemplateTypeName);
      return;
    }
    applyTemplateTypeName(window.prompt("请输入模板类型名称"));
  };
}

export function createCreateGroupDeviceIconSvg(__appScope: SelectionDragScope) {
  return (clipboard: CanvasClipboard) => {
  const { DeviceGlyph, canvasClipboardBounds, colorDisplayMode, colorPalette, escapeXml, formatSvgNumber, generateCustomDeviceImage, isBusNode, isStaticNode, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, pointsToPreviewPath, renderSvgElementMarkup, resolveNodeStateVisual, themeMode } = __appScope;
    const bounds = canvasClipboardBounds(clipboard);
    if (!bounds) {
      return generateCustomDeviceImage("Group", ["ac"]);
    }
    const padding = 12;
    const viewBoxX = bounds.left - padding;
    const viewBoxY = bounds.top - padding;
    const width = Math.max(1, bounds.right - bounds.left + padding * 2);
    const height = Math.max(1, bounds.bottom - bounds.top + padding * 2);
    const edgeMarkup = clipboard.edges
      .map((item) => `<path d="${escapeXml(pointsToPreviewPath(item.routePoints))}" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join("");
    const nodeMarkup = clipboard.nodes
      .map((node) => {
        const stateVisual = resolveNodeStateVisual(node);
        const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, themeMode, stateVisual }));
        const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, themeMode, stateVisual }));
        const imageHref = nodeImage(node);
        const foregroundHref = nodeForegroundImage(node);
        const nodeIsBus = isBusNode(node);
        const imageMarkup = imageHref
          ? `<image href="${escapeXml(imageHref)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" preserveAspectRatio="xMidYMid slice"/>`
          : "";
        const foregroundMarkup = foregroundHref
          ? `<image href="${escapeXml(foregroundHref)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" preserveAspectRatio="xMidYMid slice"/>`
          : "";
        const imageCoverMarkup = imageHref && !nodeIsBus && !isStaticNode(node)
          ? `<rect x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="8" fill="#ffffff" stroke="none"/>`
          : "";
        const uprightMarkup = !nodeIsBus && (imageMarkup || foregroundMarkup)
          ? `<g transform="${escapeXml(nodeImageContentTransform(node))}">${isStaticNode(node) ? imageMarkup : ""}${imageCoverMarkup}${!isStaticNode(node) ? imageMarkup : ""}${foregroundMarkup}</g>`
          : "";
        const transform = `translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})`;
        return `<g transform="${escapeXml(transform)}"><g transform="${escapeXml(nodeGeometryTransform(node))}">${glyphMarkup}${glyphTextMarkup}</g>${uprightMarkup}</g>`;
      })
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" viewBox="${formatSvgNumber(viewBoxX)} ${formatSvgNumber(viewBoxY)} ${formatSvgNumber(width)} ${formatSvgNumber(height)}">${edgeMarkup}${nodeMarkup}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
}

export function createGroupDeviceTerminalAnchor(__appScope: SelectionDragScope) {
  return (point: Point, bounds: SelectionRect): Point => {
  const { clampNumber, selectionRectCenter } = __appScope;
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const center = selectionRectCenter(bounds);
    return {
      x: clampNumber((point.x - center.x) / width, -0.5, 0.5),
      y: clampNumber((point.y - center.y) / height, -0.5, 0.5)
    };
  };
}

export function createGroupDeviceTerminalSortKey(__appScope: SelectionDragScope) {
  return (terminal: GroupDeviceTerminalDraft) => {
  const { formatSvgNumber } = __appScope;
    const anchor = terminal.anchor;
    const horizontal = Math.abs(anchor.x) >= Math.abs(anchor.y);
    const side = horizontal ? (anchor.x < 0 ? 0 : 1) : (anchor.y < 0 ? 2 : 3);
    const position = side <= 1 ? anchor.y : anchor.x;
    return `${side}:${formatSvgNumber(position + 0.5).padStart(8, "0")}:${terminal.sourceNodeId}:${terminal.sourceTerminalId}`;
  };
}

export function createGroupDeviceTerminalAssociationFor(__appScope: SelectionDragScope) {
  return (node: ModelNode, terminalIndex: number, type: TerminalType): ContainerTerminalAssociationValue => {
  const { defaultContainerAssociationForTerminalType, libraryTemplateByKind, normalizeContainerTerminalAssociations } = __appScope;
    const template = libraryTemplateByKind.get(node.kind);
    if (!template?.isContainer) {
      return defaultContainerAssociationForTerminalType(type);
    }
    const terminalTypes = node.terminals.map((terminal: { type: TerminalType }) => terminal.type);
    return normalizeContainerTerminalAssociations(terminalTypes, template.terminalAssociations ?? [], node.terminals.length)[terminalIndex] ||
      defaultContainerAssociationForTerminalType(type);
  };
}

export function createGroupDeviceExternalTerminals(__appScope: SelectionDragScope) {
  return (clipboard: CanvasClipboard, sourceEdges: Edge[]) => {
  const { TERMINAL_TYPE_LIBRARY_LABELS, canvasClipboardBounds, getTerminalPoint, groupDeviceTerminalAnchor, groupDeviceTerminalAssociationFor, groupDeviceTerminalSortKey, nodeById } = __appScope;
    const bounds = canvasClipboardBounds(clipboard);
    if (!bounds) {
      return [] as GroupDeviceTerminalDraft[];
    }
    const clipboardNodeById = new Map(clipboard.nodes.map((node) => [node.id, node]));
    const selectedNodeIds = new Set(clipboard.nodes.map((node) => node.id));
    const terminals: GroupDeviceTerminalDraft[] = [];
    const terminalKeys = new Set<string>();
    const appendTerminal = (node: ModelNode, terminalId?: string) => {
      const terminal = terminalId ? node.terminals.find((item) => item.id === terminalId) : node.terminals[0];
      if (!terminal) {
        return;
      }
      const key = `${node.id}:${terminal.id}`;
      if (terminalKeys.has(key)) {
        return;
      }
      const terminalIndex = node.terminals.findIndex((item) => item.id === terminal.id);
      const point = getTerminalPoint(node, terminal.id);
      terminalKeys.add(key);
      terminals.push({
        id: key,
        label: terminal.label || `${TERMINAL_TYPE_LIBRARY_LABELS[terminal.type] ?? terminal.type}端${terminals.length + 1}`,
        type: terminal.type,
        anchor: groupDeviceTerminalAnchor(point, bounds),
        association: groupDeviceTerminalAssociationFor(node, Math.max(0, terminalIndex), terminal.type),
        sourceNodeId: node.id,
        sourceTerminalId: terminal.id
      });
    };
    for (const edge of sourceEdges) {
      const sourceInside = selectedNodeIds.has(edge.sourceId);
      const targetInside = selectedNodeIds.has(edge.targetId);
      if (sourceInside === targetInside) {
        continue;
      }
      const nodeId = sourceInside ? edge.sourceId : edge.targetId;
      const terminalId = sourceInside ? edge.sourceTerminalId : edge.targetTerminalId;
      const node = clipboardNodeById.get(nodeId) ?? nodeById.get(nodeId);
      if (node) {
        appendTerminal(node, terminalId);
      }
    }
    if (terminals.length === 0) {
      const tolerance = Math.max(8, Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.08);
      for (const node of clipboard.nodes) {
        for (const terminal of node.terminals) {
          const point = getTerminalPoint(node, terminal.id);
          const nearBoundary =
            Math.abs(point.x - bounds.left) <= tolerance ||
            Math.abs(point.x - bounds.right) <= tolerance ||
            Math.abs(point.y - bounds.top) <= tolerance ||
            Math.abs(point.y - bounds.bottom) <= tolerance;
          if (nearBoundary) {
            appendTerminal(node, terminal.id);
          }
        }
      }
    }
    return terminals.sort((left, right) => groupDeviceTerminalSortKey(left).localeCompare(groupDeviceTerminalSortKey(right)));
  };
}

export function createValidateGroupDeviceIconReplacement(__appScope: SelectionDragScope) {
  return (target: DeviceTemplate, terminals: readonly GroupDeviceTerminalDraft[]) => {
  const { groupDeviceTerminalSignature } = __appScope;
    const targetTerminalTypes = (target.terminalTypes ?? Array.from({ length: target.terminalCount }, () => target.terminalType)).slice(0, target.terminalCount) as TerminalType[];
    const sourceTerminalTypes = terminals.map((terminal: { type: TerminalType }) => terminal.type);
    if (targetTerminalTypes.length !== sourceTerminalTypes.length || groupDeviceTerminalSignature(targetTerminalTypes) !== groupDeviceTerminalSignature(sourceTerminalTypes)) {
      return {
        valid: false,
        message: "图元组合对外端子数量和端子类型必须与已有元件相同，无法修改已有元件图标。"
      };
    }
    return { valid: true, message: "" };
  };
}

export function createReplaceBuiltinDeviceIconOverride(__appScope: SelectionDragScope) {
  return (targetTemplate: DeviceTemplate, groupIcon: string) => {
  const { deviceDefinitionOverrideForTemplate, libraryTemplates, setDeviceDefinitionOverrides } = __appScope;
    setDeviceDefinitionOverrides((current: Record<string, DeviceTemplate>) => {
      const existingOverride = deviceDefinitionOverrideForTemplate(targetTemplate, current, libraryTemplates);
      return {
        ...current,
        [targetTemplate.kind]: {
          ...existingOverride,
          kind: targetTemplate.kind,
          params: {
            ...(existingOverride?.params ?? {}),
            backgroundImage: groupIcon,
            backgroundImageAssetId: ""
          },
          updatedAt: new Date().toISOString()
        }
      };
    });
  };
}

export function createOpenGroupDeviceDefinitionDialog(__appScope: SelectionDragScope) {
  return () => {
  const { MAX_CUSTOM_DEVICE_TERMINALS, activeLayerGroups, activeSelectedGroupIds, buildCanvasClipboard, canAddTemplateFromSelection, canvasClipboardBounds, cloneGraphTemplateClipboard, createGroupDeviceIconSvg, customDeviceDraft, defaultComponentLibraryForCategoryLibrary, edges, groupDeviceExternalTerminals, groupDeviceReplacementTemplates, groupExpandedCanvasSelection, normalizeCategoryLibraryName, routedEdges, setGroupDeviceDefinitionDialog, visibleEdges, visibleNodes } = __appScope;
    if (!canAddTemplateFromSelection) {
      showGlobalMessage("请先选中一个图元组合，再定义为元件。");
      return;
    }
    const clipboard = buildCanvasClipboard(
      visibleNodes,
      visibleEdges,
      routedEdges,
      groupExpandedCanvasSelection.nodeIds,
      groupExpandedCanvasSelection.edgeIds,
      activeLayerGroups,
      { expandGroups: true }
    );
    const bounds = canvasClipboardBounds(clipboard);
    if (!bounds || (clipboard.nodes.length === 0 && clipboard.edges.length === 0)) {
      showGlobalMessage("当前组合没有可定义为元件的图元。");
      return;
    }
    const terminals = groupDeviceExternalTerminals(clipboard, edges);
    if (terminals.length > MAX_CUSTOM_DEVICE_TERMINALS) {
      showGlobalMessage(`当前组合对外端子为 ${terminals.length} 个，暂时最多支持 ${MAX_CUSTOM_DEVICE_TERMINALS} 个端子。`);
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(customDeviceDraft.categoryLibraryName || "交流设备");
    const componentLibrary = defaultComponentLibraryForCategoryLibrary(categoryLibraryName);
    setGroupDeviceDefinitionDialog({
      sourceGroupId: activeSelectedGroupIds[0],
      clipboard: cloneGraphTemplateClipboard(clipboard),
      sourceSize: {
        width: Math.max(1, Math.round(bounds.right - bounds.left)),
        height: Math.max(1, Math.round(bounds.bottom - bounds.top))
      },
      iconImage: createGroupDeviceIconSvg(clipboard),
      terminals,
      mode: "new",
      categoryLibraryName,
      componentLibrary,
      targetKind: groupDeviceReplacementTemplates[0]?.kind ?? ""
    });
  };
}

export function createConfirmCreateDeviceFromGroup(__appScope: SelectionDragScope) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, MAX_CUSTOM_DEVICE_TERMINALS, activeGroupById, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, ensureCustomComponentTreeExpanded, groupDeviceDefinitionDialog, isValidComponentLibraryName, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, prepareMeasurementConfigDraft, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogOpen, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceStatePageId, setDeviceLibraryDialogLayouts, setEditingCustomDeviceKind, setGroupDeviceDefinitionDialog, setSelectedDefinitionKind, writeOperationLog } = __appScope;
    if (!groupDeviceDefinitionDialog) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(groupDeviceDefinitionDialog.categoryLibraryName);
    const componentLibrary = normalizeComponentLibraryName(groupDeviceDefinitionDialog.componentLibrary);
    if (!componentLibrary) {
      showGlobalMessage("请选择类。");
      return;
    }
    if (!isValidComponentLibraryName(componentLibrary)) {
      showGlobalMessage("类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。");
      return;
    }
    const terminalTypes = groupDeviceDefinitionDialog.terminals.map((terminal: { type: TerminalType }) => terminal.type);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      groupDeviceDefinitionDialog.terminals.map((terminal: Terminal) => (terminal as { association?: string }).association),
      terminalTypes.length
    );
    const sourceGroup = activeGroupById.get(groupDeviceDefinitionDialog.sourceGroupId);
    ensureCustomComponentTreeExpanded(categoryLibraryName, componentLibrary);
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName, section: componentLibrary });
    setEditingCustomDeviceKind("");
    setSelectedDefinitionKind("");
    setCustomDeviceDefinitionMode("create");
    setCustomDeviceDialogView("terminals");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    const nextDraft = {
      ...createEmptyCustomDeviceDraft(categoryLibraryName),
      componentLibrary,
      componentName: sourceGroup?.name ?? "",
      backgroundImage: groupDeviceDefinitionDialog.iconImage,
      backgroundImageAssetId: "",
      size: groupDeviceDefinitionDialog.sourceSize,
      terminalCount: groupDeviceDefinitionDialog.terminals.length,
      terminalTypes: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => terminalTypes[index] ?? "ac") as TerminalType[],
      terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => groupDeviceDefinitionDialog.terminals[index]?.label ?? ""),
      terminalAnchors: createDefaultCustomDeviceTerminalAnchors(
        groupDeviceDefinitionDialog.terminals.length,
        groupDeviceDefinitionDialog.terminals.map((terminal: Terminal) => terminal.anchor)
      ),
      terminalAssociations: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => terminalAssociations[index] ?? "ac-load") as ContainerTerminalAssociationValue[],
      isContainer: groupDeviceDefinitionDialog.terminals.length > 0,
      error: ""
    };
    setCustomDeviceDraft(nextDraft);
    setGroupDeviceDefinitionDialog(null);
    prepareMeasurementConfigDraft();
    setCustomDeviceDraftCleanBaseline(nextDraft);
    setDeviceLibraryDialogLayouts((current: Record<string, any>) => {
      const { custom: _custom, ...rest } = current;
      return rest;
    });
    setCustomDeviceDialogOpen(true);
    writeOperationLog("从图元组合生成新元件草稿");
  };
}

export function createConfirmReplaceDeviceIconFromGroup(__appScope: SelectionDragScope) {
  return () => {
  const { editingCustomDeviceKind, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, replaceBuiltinDeviceIconOverride, setCustomDeviceDraft, setCustomDeviceTemplates, setGroupDeviceDefinitionDialog, validateGroupDeviceIconReplacement, writeOperationLog } = __appScope;
    if (!groupDeviceDefinitionDialog) {
      return;
    }
    const targetTemplate = groupDeviceReplacementTemplates.find((template: DeviceTemplate) => template.kind === groupDeviceDefinitionDialog.targetKind);
    if (!targetTemplate) {
      showGlobalMessage("请选择要修改图标的已有元件。");
      return;
    }
    const validation = validateGroupDeviceIconReplacement(targetTemplate, groupDeviceDefinitionDialog.terminals);
    if (!validation.valid) {
      showGlobalMessage(validation.message);
      return;
    }
    const groupIcon = groupDeviceDefinitionDialog.iconImage;
    if (targetTemplate.custom) {
      setCustomDeviceTemplates((current: DeviceTemplate[]) =>
        current.map((template: DeviceTemplate) =>
          template.kind === targetTemplate.kind
            ? { ...template, params: { ...template.params, backgroundImage: groupIcon, backgroundImageAssetId: "" } }
            : template
        )
      );
    } else {
      replaceBuiltinDeviceIconOverride(targetTemplate, groupIcon);
    }
    if (editingCustomDeviceKind === targetTemplate.kind) {
      setCustomDeviceDraft((current: CustomDeviceDraft) => ({
        ...current,
        backgroundImage: groupIcon,
        backgroundImageAssetId: "",
        error: ""
      }));
    }
    setGroupDeviceDefinitionDialog(null);
    writeOperationLog(`修改元件图标：${targetTemplate.label}`);
  };
}

export function createOpenAddTemplateDialog(__appScope: SelectionDragScope) {
  return () => {
  const { DEFAULT_GRAPH_TEMPLATE_TYPES, activeGroupById, activeLayerGroups, activeSelectedGroupIds, buildCanvasClipboard, canAddTemplateFromSelection, canvasClipboardBounds, cloneGraphTemplateClipboard, customGraphTemplates, graphTemplateTypes, groupExpandedCanvasSelection, routedEdges, setTemplateDialog, setTemplateDraftName, setTemplateDraftType, templateDraftType, uniqueGraphTemplateName, visibleEdges, visibleNodes } = __appScope;
    if (!canAddTemplateFromSelection) {
      showGlobalMessage("请先选中一个图元组合，再添加模板。");
      return;
    }
    const clipboard = buildCanvasClipboard(
      visibleNodes,
      visibleEdges,
      routedEdges,
      groupExpandedCanvasSelection.nodeIds,
      groupExpandedCanvasSelection.edgeIds,
      activeLayerGroups,
      { expandGroups: true }
    );
    const bounds = canvasClipboardBounds(clipboard);
    if (!bounds || (clipboard.nodes.length === 0 && clipboard.edges.length === 0)) {
      showGlobalMessage("当前组合没有可保存为模板的图元。");
      return;
    }
    const typeName = graphTemplateTypes.includes(templateDraftType) ? templateDraftType : graphTemplateTypes[0] ?? DEFAULT_GRAPH_TEMPLATE_TYPES[0];
    const selectedGroup = activeGroupById.get(activeSelectedGroupIds[0]);
    setTemplateDialog({
      sourceGroupId: activeSelectedGroupIds[0],
      clipboard: cloneGraphTemplateClipboard(clipboard),
      sourceSize: {
        width: Math.max(1, Math.round(bounds.right - bounds.left)),
        height: Math.max(1, Math.round(bounds.bottom - bounds.top))
      }
    });
    setTemplateDraftType(typeName);
    setTemplateDraftName(uniqueGraphTemplateName(selectedGroup?.name ?? "自定义模板", typeName, customGraphTemplates));
  };
}

export function createCancelTemplateDialog(__appScope: SelectionDragScope) {
  return () => {
  const { setTemplateDialog, setTemplateDraftName } = __appScope;
    setTemplateDialog(null);
    setTemplateDraftName("");
  };
}

export function createConfirmAddGraphTemplate(__appScope: SelectionDragScope) {
  return () => {
  const { DEFAULT_GRAPH_TEMPLATE_TYPES, cloneGraphTemplateClipboard, customGraphTemplateTypes, customGraphTemplates, normalizeGraphTemplateTypeName, persistTemplateLibraryChange, setCustomGraphTemplateTypes, setCustomGraphTemplates, setExpandedGraphTemplateTypes, setLeftPanelTab, setTemplateDialog, setTemplateDraftName, templateDialog, templateDraftName, templateDraftType, writeOperationLog } = __appScope;
    if (!templateDialog) {
      return;
    }
    const typeName = normalizeGraphTemplateTypeName(templateDraftType) || DEFAULT_GRAPH_TEMPLATE_TYPES[0];
    const name = templateDraftName.trim();
    if (!name) {
      showGlobalMessage("请输入模板名字。");
      return;
    }
    if (customGraphTemplates.some((template: GraphTemplate) => template.typeName.toLowerCase() === typeName.toLowerCase() && template.name.toLowerCase() === name.toLowerCase())) {
      showGlobalMessage("模板名称重复，请换一个名称。");
      return;
    }
    const now = new Date().toISOString();
    const template: GraphTemplate = {
      id: createGraphTemplateId(canvasIdRandom(__appScope)),
      typeName,
      name,
      sourceSize: { ...templateDialog.sourceSize },
      clipboard: cloneGraphTemplateClipboard(templateDialog.clipboard),
      createdAt: now,
      updatedAt: now
    };
    const nextTypes = DEFAULT_GRAPH_TEMPLATE_TYPES.some((item: string) => item.toLowerCase() === typeName.toLowerCase()) ||
      customGraphTemplateTypes.some((item: string) => item.toLowerCase() === typeName.toLowerCase())
      ? customGraphTemplateTypes
      : [...customGraphTemplateTypes, typeName];
    const nextTemplates = [...customGraphTemplates, template];
    if (nextTypes !== customGraphTemplateTypes) {
      setCustomGraphTemplateTypes(nextTypes);
    }
    setCustomGraphTemplates(nextTemplates);
    setExpandedGraphTemplateTypes((current: string[]) => current.includes(typeName) ? current : [...current, typeName]);
    setLeftPanelTab("templates");
    setTemplateDialog(null);
    setTemplateDraftName("");
    persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes, customGraphTemplates: nextTemplates });
    writeOperationLog(`添加模板：${typeName} / ${name}（${template.sourceSize.width}×${template.sourceSize.height}）`);
  };
}

export function createDeleteGraphTemplate(__appScope: SelectionDragScope) {
  return (template: GraphTemplate) => {
    const { customGraphTemplateTypes, customGraphTemplates, persistTemplateLibraryChange, setCustomGraphTemplates, setTemplateMenu, writeOperationLog } = __appScope;
    const nextTemplates = customGraphTemplates.filter((item: GraphTemplate) => item.id !== template.id);
    if (nextTemplates.length === customGraphTemplates.length) {
      setTemplateMenu(null);
      return;
    }
    setCustomGraphTemplates(nextTemplates);
    setTemplateMenu(null);
    persistTemplateLibraryChange({
      customGraphTemplateTypes,
      customGraphTemplates: nextTemplates
    });
    writeOperationLog(`删除模板：${template.typeName} / ${template.name}`);
  };
}

export function createDeleteGraphTemplateType(__appScope: SelectionDragScope) {
  return async (typeName: string) => {
    const { customGraphTemplateTypes, customGraphTemplates, persistTemplateLibraryChange, setCustomGraphTemplateTypes, setCustomGraphTemplates, setTemplateMenu, writeOperationLog } = __appScope;
    const deletingTemplates = customGraphTemplates.filter((template: GraphTemplate) => template.typeName === typeName);
    const nextTypes = customGraphTemplateTypes.filter((item: string) => item !== typeName);
    const nextTemplates = customGraphTemplates.filter((template: GraphTemplate) => template.typeName !== typeName);
    if (nextTypes.length === customGraphTemplateTypes.length && nextTemplates.length === customGraphTemplates.length) {
      setTemplateMenu(null);
      return;
    }
    if (!await showGlobalConfirm(`删除模板类型”${typeName}”及其下 ${deletingTemplates.length} 个模板？`)) {
      setTemplateMenu(null);
      return;
    }
    setCustomGraphTemplateTypes(nextTypes);
    setCustomGraphTemplates(nextTemplates);
    setTemplateMenu(null);
    persistTemplateLibraryChange({
      customGraphTemplateTypes: nextTypes,
      customGraphTemplates: nextTemplates
    });
    writeOperationLog(`删除模板类型：${typeName}（${deletingTemplates.length} 个模板）`);
  };
}

export function createDropGraphTemplate(__appScope: SelectionDragScope) {
  return (template: GraphTemplate, pointerPosition: Point) => {
  const { CANVAS_AUTO_EXPAND_PADDING, activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, clampNodePositionToBounds, clampPointToBounds, cloneCanvasClipboard, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, markStoredRouteEdgesDirty, modelType, nodes, normalizeDeviceIndexCounters, normalizeModelGroups, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setDeviceIndexCounters, setGraphArrays, setGroups, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = __appScope;
    const modelTypeFailureMessage = modelAssociationDevicesModelTypeFailureMessage(modelType, template.clipboard.nodes);
    if (modelTypeFailureMessage) {
      showGlobalMessage(`无法放置模板：${modelTypeFailureMessage}`);
      writeOperationLog(`拒绝放置模板：${modelTypeFailureMessage}`);
      return;
    }
    const targetTopLeft = {
      x: pointerPosition.x - template.sourceSize.width / 2,
      y: pointerPosition.y - template.sourceSize.height / 2
    };
    const dropIdRandom = canvasIdRandom(__appScope);
    const cloned = cloneCanvasClipboard(
      template.clipboard,
      targetTopLeft,
      () => createCanvasNodeId(dropIdRandom),
      () => createCanvasEdgeId(dropIdRandom),
      () => createCanvasGroupId(dropIdRandom)
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      showGlobalMessage("模板内容为空或包含悬空联络线，无法生成。");
      return;
    }
    if (rejectAutoCanvasExpansionForContent([...nodes, ...cloned.nodes], [...edges, ...cloned.edges])) {
      return;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent(
      [...nodes, ...cloned.nodes],
      [...edges, ...cloned.edges]
    );
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node: ModelNode) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge: Edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const shiftedClonedNodes = hasCanvasOriginShift(dropOriginShift)
      ? cloned.nodes.map((node: ModelNode) => translateNodeBy(node, dropOriginShift))
      : cloned.nodes;
    const shiftedClonedEdges = hasCanvasOriginShift(dropOriginShift)
      ? cloned.edges.map((edge: Edge) => translateEdgeBy(edge, dropOriginShift))
      : cloned.edges;
    const shiftedPointerPosition = translatePointBy(pointerPosition, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, ...shiftedClonedNodes],
      [...dropSourceEdges, ...shiftedClonedEdges],
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges, shiftedClonedEdges);
    } else {
      markBusTerminalSyncDirtyForEdges(shiftedClonedEdges);
    }
    let nextDeviceIndexCounters = normalizeDeviceIndexCounters(deviceIndexCounters, dropSourceNodes);
    const pasted = shiftedClonedNodes.map((node: ModelNode) => {
      const draftNode = { ...node, layerId: activeLayerId, position: clampNodePositionToBounds(node, dropCanvasBounds, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = shiftedClonedEdges.map((edge: Edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, dropCanvasBounds) : undefined,
      targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, dropCanvasBounds) : undefined,
      manualPoints: edge.manualPoints?.map((point: Point) => clampPointToBounds(point, dropCanvasBounds)),
      routePoints: edge.routePoints?.map((point: Point) => clampPointToBounds(point, dropCanvasBounds))
    }));
    // 归属落地:与粘贴同一出口(落点在容器矩形内的模板图元并入该容器,容器随成员重算 + 挤出非成员)
    const nextNodes = commitContainerMembership([...dropSourceNodes, ...pasted], pasted.map((node: ModelNode) => node.id));
    const nextEdges = [...dropSourceEdges, ...pastedEdges];
    pushUndoSnapshot();
    markStoredRouteEdgesDirty(pastedEdges.map((edge: Edge) => edge.id));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setGraphArrays(nextNodes, nextEdges);
    setGroups((current: ModelGroup[]) => normalizeModelGroups([...current, ...cloned.groups], nextNodes, nextEdges));
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(pasted.map((node: ModelNode) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge: Edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    activateInspectorFromCanvas();
    writeOperationLog(`从模板新增：${template.typeName} / ${template.name}`);
  };
}

export function createFinishMarqueeSelectionFromPoints(__appScope: SelectionDragScope) {
  return function finishMarqueeSelectionFromPoints(start: Point, current: Point) {
  const { activeLayerNodes, activeLayerRoutedEdges, resetConnectPreviewState, selectCanvasGraphics, selectGraphicsInRect, setConnectSource, setContextMenu, setMarquee, setRewiring, switchInspectorTabForCanvasSelection } = __appScope;
    const left = Math.min(start.x, current.x);
    const right = Math.max(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const bottom = Math.max(start.y, current.y);
    if (right - left < 8 || bottom - top < 8) {
      setMarquee(null);
      return false;
    }
    const selection = selectGraphicsInRect(activeLayerNodes, activeLayerRoutedEdges, { left, right, top, bottom });
    selectCanvasGraphics(selection.nodeIds, selection.edgeIds);
    switchInspectorTabForCanvasSelection(selection.nodeIds, selection.edgeIds, "marquee");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMarquee(null);
    return true;
  };
}

export function createStartContextMarqueeSelection(__appScope: SelectionDragScope) {
  return () => {
  const { contextMenu, resetConnectPreviewState, setConnectSource, setContextMarqueeSelection, setMarquee, setRewiring, writeOperationLog } = __appScope;
    if (!contextMenu?.canvasPoint) {
      return;
    }
    setContextMarqueeSelection({ start: contextMenu.canvasPoint });
    setMarquee({ start: contextMenu.canvasPoint, current: contextMenu.canvasPoint });
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    writeOperationLog("框选模式：移动鼠标确定范围，左键落点完成选择");
  };
}

export function createOpenFilterSelectionDialog(__appScope: SelectionDragScope) {
  return () => {
  const { activeLayerNodeIdSet, activeSelectedNodeIds, filterSelectionItemKey, nodeById, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys } = __appScope;
    const activeSelectedTypeKeys = Array.from(new Set(
      activeSelectedNodeIds
        .flatMap((nodeId: string) => {
          const node = nodeById.get(nodeId);
          return node && activeLayerNodeIdSet.has(node.id) ? [filterSelectionItemKey(node)] : [];
        })
    ));
    setFilterSelectionTypeKeys(activeSelectedTypeKeys);
    setFilterSelectionDialogOpen(true);
  };
}

export function createToggleFilterSelectionType(__appScope: SelectionDragScope) {
  return (typeKey: string) => {
  const { filterSelectionTypeOptions, setFilterSelectionTypeKeys } = __appScope;
    const option = filterSelectionTypeOptions.find((item: FilterSelectionTypeOption) => item.typeKey === typeKey);
    if (!option) {
      return;
    }
    const itemKeys = (option.items ?? []).map((item: { itemKey: string }) => item.itemKey);
    const itemKeySet = new Set(itemKeys);
    setFilterSelectionTypeKeys((current: string[]) => {
      const allSelected = itemKeys.every((itemKey: string) => current.includes(itemKey));
      return allSelected
        ? current.filter((item: string) => !itemKeySet.has(item))
        : [...current, ...itemKeys.filter((itemKey: string) => !current.includes(itemKey))];
    });
  };
}

export function createToggleFilterSelectionItem(__appScope: SelectionDragScope) {
  return (itemKey: string) => {
  const { setFilterSelectionTypeKeys } = __appScope;
    setFilterSelectionTypeKeys((current: string[]) =>
      current.includes(itemKey)
        ? current.filter((item: string) => item !== itemKey)
        : [...current, itemKey]
    );
  };
}

export function createConfirmFilterSelectionDialog(__appScope: SelectionDragScope) {
  return () => {
  const { activeLayerNodes, filterSelectionItemKey, filterSelectionTypeKeys, resetConnectPreviewState, selectCanvasGraphics, setConnectSource, setFilterSelectionDialogOpen, setRewiring, switchInspectorTabForCanvasSelection, writeOperationLog } = __appScope;
    const selectedItemKeys = new Set(filterSelectionTypeKeys);
    const nextSelectedNodes = selectedItemKeys.size > 0
      ? activeLayerNodes.filter((node: ModelNode) => selectedItemKeys.has(filterSelectionItemKey(node)))
      : [];
    selectCanvasGraphics(nextSelectedNodes.map((node: ModelNode) => node.id), [], { scope: "direct" });
    switchInspectorTabForCanvasSelection(nextSelectedNodes.map((node: ModelNode) => node.id), [], "marquee");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setFilterSelectionDialogOpen(false);
    writeOperationLog(`过滤选择：选中 ${nextSelectedNodes.length} 个图元`);
  };
}

export function createFinishMarqueeSelection(__appScope: SelectionDragScope) {
  return () => {
  const { finishMarqueeSelectionFromPoints, marquee } = __appScope;
    if (!marquee) {
      return;
    }
    finishMarqueeSelectionFromPoints(marquee.start, marquee.current);
  };
}

export function createDeleteSelection(__appScope: SelectionDragScope) {
  return async () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, deleteNodesWithConnectedEdges, edgeById, edgeListForNodeIds, edges, groups, lastCanvasClickTarget, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, normalizeModelGroups, normalizeProjectMeasurements, pushUndoSnapshot, removeGraphicsFromGroups, setCanvasSelectionScope, setEdges, setGraphArrays, setGroups, setLastCanvasClickTarget, setProjectMeasurements, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, showGlobalMessage, syncGlobalLineProjectNodes, writeOperationLog } = __appScope;
    // 量测框点击 → 仅删量测，保留设备
    if (lastCanvasClickTarget === "measurement" && activeSelectedNodeIds.length > 0) {
      const targetNodeIds = new Set(activeSelectedNodeIds);
      pushUndoSnapshot();
      setProjectMeasurements((current: ProjectMeasurementConfig) => ({
        version: 1,
        groups: (current?.groups ?? []).filter((g: MeasurementGroup) => !targetNodeIds.has(g.nodeId))
      }));
      setCanvasSelectionScope("group");
      setSelectedNodeIds([]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      setLastCanvasClickTarget(null);
      writeOperationLog(`删除 ${targetNodeIds.size} 个图元的量测`);
      return;
    }
    if (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0) {
      setLastCanvasClickTarget(null); // 该分支不开确认框,无取消顾虑:点击目标不许残留到下一次 Delete
      return;
    }
    const selectedEdges = new Set(activeSelectedEdgeIds);
    if (activeSelectedNodeIds.length === 0) {
      pushUndoSnapshot();
      setLastCanvasClickTarget(null); // 清点击目标属删除提交的一部分:容器确认框取消时不得留下(见 doDelete)
      const deletedEdges = activeSelectedEdgeIds.flatMap((edgeId: string) => {
        const edge = edgeById.get(edgeId);
        return edge ? [edge] : [];
      });
      markRouteEdgesDirty(selectedEdges);
      markStoredRouteEdgesDirty(selectedEdges);
      markBusTerminalSyncDirtyForEdges(deletedEdges);
      const nextEdges = edges.filter((edge: Edge) => !selectedEdges.has(edge.id));
      setEdges(nextEdges);
      setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, [], selectedEdges), nodes, nextEdges));
      setCanvasSelectionScope("group");
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      writeOperationLog(`删除 ${selectedEdges.size} 条联络线`);
      return;
    }
    // 选中口径在点击瞬间定死;nodes/edges 一律在提交时刻现取(容器确认框横跨交互窗口,
    // 持点击快照会漏掉其间的并发改动,如第三方 WS control 已改图)
    const clickedNodeIds = [...activeSelectedNodeIds];
    const doDelete = () => {
      const latestNodes = __appScope.nodes ?? nodes;
      const latestEdges = __appScope.edges ?? edges;
      const expandedNodeIds = expandGlobalBoundaryDeletionNodeIds(latestNodes, clickedNodeIds);
      setLastCanvasClickTarget(null); // 取消确认时不得留下副作用,故挪进提交体(确认前不写)
      pushUndoSnapshot();
      const deletedEdges = edgeListForNodeIds(expandedNodeIds, selectedEdges);
      markRouteEdgesDirty(deletedEdges.map((edge: Edge) => edge.id));
      markStoredRouteEdgesDirty(deletedEdges.map((edge: Edge) => edge.id));
      markBusTerminalSyncDirtyForEdges(deletedEdges);
      const result = deleteNodesWithConnectedEdges(latestNodes, latestEdges, expandedNodeIds);
      const nextEdges = result.edges.filter((edge: Edge) => !selectedEdges.has(edge.id));
      // 删除收尾(spec「其它交互边界」):① 被删容器的成员清 containerId,成员保留 —— 否则悬空值随保存持久化;
      // ② 绑定设备被删 → 解绑 + 关关口;③ 成员被删/散出后容器几何重算收缩(半程 enforce:不挤出,否则会搬动刚散出的成员)。
      // 全部与删除同一次提交(单一撤销单元),故 undo 一次即可连归属与容器几何一起还原。
      // 散出计数只给日志后缀用(容器收尾三步走单源 helper,内部另算一次同结果)
      const scattered = containerDeletionFinalize(latestNodes, expandedNodeIds);
      const nextNodes = finalizeContainerAfterNodeDeletion(latestNodes, result.nodes, expandedNodeIds);
      const unbindNotice = containerGatewayUnbindNotice(latestNodes, expandedNodeIds);
      setGraphArrays(nextNodes, nextEdges);
      void syncGlobalLineProjectNodes?.(nextNodes, false);
      // groups 走函数式:确认窗口横跨交互窗口,持点击快照会覆盖期间的并发改动
      setGroups((current: any) => normalizeModelGroups(removeGraphicsFromGroups(current, expandedNodeIds, selectedEdges), nextNodes, nextEdges));
      setProjectMeasurements((current: ProjectMeasurementConfig) => normalizeProjectMeasurements(current, nextNodes));
      setCanvasSelectionScope("group");
      setSelectedNodeIds([]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      const cascadedLineCount = expandedNodeIds.length - clickedNodeIds.length;
      writeOperationLog(`删除 ${expandedNodeIds.length} 个图元${cascadedLineCount > 0 ? `（含级联线路 ${cascadedLineCount} 条）` : ""}${scattered.length > 0 ? `（${scattered.length} 个成员散出）` : ""}`);
      if (unbindNotice) {
        showGlobalMessage(unbindNotice);
      }
    };
    // 删除集含「有成员的容器」→ 先确认:成员会散出(不随容器删除)。
    // 走仓库统一的 showGlobalConfirm(审查收口:antd 静态 Modal.confirm 不继承 ConfigProvider 主题、
    // 与既有确认体系分裂);确认框横跨交互窗口,提交体 doDelete 内部一律现取最新图
    const warning = containerDeletionWarning(nodes, expandGlobalBoundaryDeletionNodeIds(nodes, clickedNodeIds));
    if (warning) {
      // showGlobalConfirm 只有正文、没有标题 —— 前缀补回「删除容器」语义锚点(原 Modal.confirm 的 title)
      if (!await showGlobalConfirm(`删除容器：${warning}`)) {
        return;
      }
    }
    doDelete();
  };
}

export function createDeleteSelectedGraphicsFromCanvas(__appScope: SelectionDragScope) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, deleteSelection, resolveCanvasDeleteAction } = __appScope;
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: activeSelectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      showGlobalMessage(action.message);
      return;
    }
    deleteSelection();
  };
}

export function createGroupSelectedGraphics(__appScope: SelectionDragScope) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, canGroupSelectedGraphics, createCanvasGroupFromSelection, edges, expandSelectionByGroups, groups, nodes, normalizeModelGroups, pushUndoSnapshot, setCanvasSelectionScope, setGroups, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!canGroupSelectedGraphics) {
      return;
    }
    const groupIdRandom = canvasIdRandom(__appScope);
    const result = createCanvasGroupFromSelection(
      groups,
      activeSelectedNodeIds,
      activeSelectedEdgeIds,
      () => createCanvasGroupId(groupIdRandom)
    );
    if (!result.group) {
      return;
    }
    pushUndoSnapshot();
    const nextGroups = normalizeModelGroups(result.groups, nodes, edges);
    setGroups(nextGroups);
    const selection = expandSelectionByGroups(nextGroups, activeSelectedNodeIds, activeSelectedEdgeIds);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    writeOperationLog(`组合 ${selection.nodeIds.length} 个图元、${selection.edgeIds.length} 条联络线`);
  };
}

export function createUngroupSelectedGraphics(__appScope: SelectionDragScope) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, canUngroupSelectedGraphics, dissolveSelectedCanvasGroups, edges, groups, nodes, normalizeModelGroups, pushUndoSnapshot, setGroups, writeOperationLog } = __appScope;
    if (!canUngroupSelectedGraphics) {
      return;
    }
    const result = dissolveSelectedCanvasGroups(groups, activeSelectedNodeIds, activeSelectedEdgeIds);
    if (result.removedGroupIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    setGroups(normalizeModelGroups(result.groups, nodes, edges));
    writeOperationLog(`解散 ${result.removedGroupIds.length} 个组合`);
  };
}

/**
 * 【添加到容器】弹窗表单:类型 + 名称双下拉,两者都**受控**。
 * 名称下拉可搜索:候选 = 所选类型的已有容器(选中 = 加入该容器,不新建);
 * 输入清单以外的名字 = 新建该类型容器(候选末尾出现「新建“X”」项)。
 * 名称必须走 state 而非命令式改 DOM —— antd 的 Select ref 是包装对象(不是原生 input),
 * 写 `ref.current.value` 是空操作:切类型后名称框会留在旧默认名,提交却落库新默认名(显示与数据分叉)。
 * 每次变更同步回 `draft`,onOk 读闭包 draft(单一提交口径)。
 * 清空输入框**不回落**到上一个选择:antd 受控 Select 下「清空搜索」与「放弃已输入的新名」无法区分,
 * 统一按「显示即落库」处理 —— 输入框里是什么,确定后就建什么(containerNameSearch 对空白输入原样返回,用例已锁定)。
 */
function ContainerPickerForm({ draft, nodes }: { draft: ContainerDraft; nodes: any[] }) {
  const [form, setForm] = useState<ContainerDraft>({ ...draft });
  const apply = (next: ContainerDraft) => {
    setForm(next);
    Object.assign(draft, next);
  };
  const existing = containerNameOptions(form.kind, nodes);
  // 新建项:当前值(未命中已有容器时才看名字)排除掉已有清单 —— 输入即写入 form.name(见 containerNameSearch),无需另存一份输入文本
  const newNames = (form.containerId || !form.name ? [] : [form.name])
    .filter((name) => !existing.some((option) => option.value === name || option.label === name));
  return (
    <>
      <Select
        value={form.kind}
        style={{ width: "100%", marginBottom: 8 }}
        onChange={(value) => {
          apply(containerKindSwitch(value as ContainerDraft["kind"], nodes));
        }}
        options={containerKindOptions()}
      />
      <Select
        showSearch
        autoFocus
        style={{ width: "100%" }}
        value={form.containerId || form.name}
        onChange={(value) => {
          apply(containerNamePick(String(value), form.kind, nodes));
        }}
        onSearch={(value) => {
          // 空输入不落 draft:antd 选中选项后会回送一次 onSearch(""),此时 apply 会用旧闭包 form
          // 覆盖掉 onChange 刚写入的 containerId
          if (value.trim()) {
            apply(containerNameSearch(value, form));
          }
        }}
        options={[...existing, ...newNames.map((name) => ({ value: name, label: `新建“${name}”` }))]}
      />
    </>
  );
}

export function createAddToContainer(__appScope: SelectionDragScope) {
  return () => {
  const { activeSelectedNodeIds, setAddToContainerDialog, showGlobalMessage } = __appScope;
    // 点击瞬间只定「选中口径」;nodes/edges 一律在提交时刻现取(见 createConfirmAddToContainer)
    // —— 弹窗横跨交互窗口,持点击快照会覆盖其间的并发改动
    const clickNodes = __appScope.nodes;
    const memberIds = containerMemberIdsFromSelection(clickNodes, activeSelectedNodeIds);
    if (memberIds.length === 0) {
      showGlobalMessage("请选中至少一个普通图元（容器自身不参与归属）。");
      return;
    }
    // 弹窗:类型 + 名称双下拉(见 ContainerPickerForm)。名称候选 = 所选类型的已有容器 ——
    // 选中即加入该容器;输入清单以外的名字则新建该类型容器。两种情况同一弹窗,不再串两级 Modal
    // (无该类型容器时名称框预填默认名,直接点确定即可创建)。
    // 受控对话框(审查收口:原 antd 静态 Modal.confirm 不继承 ConfigProvider 主题、与既有确认体系分裂):
    // 打开与提交分家 —— 打开只写状态,提交在「确定」时现取最新图(createConfirmAddToContainer)
    const draft: ContainerDraft = containerKindSwitch(CONTAINER_KINDS[0], clickNodes);
    setAddToContainerDialog({ memberIds, draft, nodes: clickNodes });
  };
}

/**
 * 【添加到容器】受控对话框:挂在画布对话框宿主(AppCanvasDialogs),状态在 `__appScope.addToContainerDialog`。
 * 打开时只存点击快照(候选清单用),提交一律现取最新图 —— 与打开路径的注释同口径。
 */
export function ContainerAddDialog({ scope }: { scope: Record<string, any> }) {
  const dialog = scope.addToContainerDialog as { memberIds: string[]; draft: ContainerDraft; nodes: any[] } | null;
  return (
    <Modal
      open={Boolean(dialog)}
      title="添加到容器"
      okText="确定"
      cancelText="取消"
      destroyOnHidden
      onOk={() => scope.confirmAddToContainer?.()}
      onCancel={() => scope.setAddToContainerDialog?.(null)}
    >
      {dialog ? <ContainerPickerForm draft={dialog.draft} nodes={dialog.nodes} /> : null}
    </Modal>
  );
}

/**
 * 【添加到容器】弹窗「确定」的提交:自点击快照只取 memberIds/草稿,图数据一律现取 ——
 * 弹窗横跨交互窗口,期间第三方 WS control 可能已改图,持快照会覆盖并发改动。
 * 纯函数算出完整 nextNodes(新容器已插入、成员已打 containerId、几何已重算),单次撤销点 + 单次落图;
 * 改归属(成员原属其它容器)时,原关口容器会一并解绑 + 关关口(与移出同一出口)。
 */
export function createConfirmAddToContainer(__appScope: SelectionDragScope) {
  return () => {
  const dialog = __appScope.addToContainerDialog as { memberIds: string[]; draft: ContainerDraft } | null;
  __appScope.setAddToContainerDialog?.(null);
  if (!dialog) {
    return;
  }
  const { memberIds, draft } = dialog;
  const { assignPermanentDeviceIndex, normalizeProjectMeasurements, pushUndoSnapshot, setDeviceIndexCounters, setGraphArrays, setProjectMeasurements, showGlobalMessage, writeOperationLog } = __appScope;
    const commitAdd = (container: any) => {
      const { edges, nodes } = __appScope;
      if (containerAddIsNoop(nodes, container.id, memberIds)) {
        showGlobalMessage("选中的图元已在该容器内。");
        return;
      }
      const nextNodes = applyAddToContainer(nodes, container, memberIds);
      pushUndoSnapshot(true, false, undefined, "添加到容器");
      setGraphArrays(nextNodes, edges);
      // 量测同步:改归属解绑原关口容器后,原容器量测组须随归一化删除
      setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, nextNodes));
      writeOperationLog(`添加 ${memberIds.length} 个图元到容器 ${container.name ?? ""}`.trim());
    };
    const { deviceIndexCounters: latestCounters, nodes: latestNodes } = __appScope;
    const nodeById = __appScope.nodeById ?? new Map(latestNodes.map((node: any) => [node.id, node]));
    const picked: any = draft.containerId
      ? latestNodes.find((node: any) => node.id === draft.containerId && isContainerNode(node))
      : undefined;
    if (picked) {
      commitAdd(picked);
      return;
    }
    // 新建:名称取名称下拉的输入(空则回落到所选类型的默认名);包围盒按当前成员几何
    const members = memberIds.map((id) => nodeById.get(id)).filter(Boolean);
    // 计数器现取:弹窗期间若有并发分配(如其它入口占了 ACLoad 4),用点击快照回写会整对象倒退 → 重号。
    // (audit:names 抓不到这类:名字有定义,只是过期)
    // idx 走同源分配器(容器落 ac_container 分段,与图元库放置/粘贴同一计数)
    const indexed = assignPermanentDeviceIndex(
      buildNewContainer(draft.kind, draft.name.trim() || defaultContainerName(draft.kind, latestNodes), members, ""),
      latestCounters
    );
    setDeviceIndexCounters(indexed.counters);
    commitAdd(indexed.node);
  };
}

export function createRemoveFromContainer(__appScope: SelectionDragScope) {
  return () => {
  const { activeSelectedNodeIds, normalizeProjectMeasurements, patchGraphNodes, pushUndoSnapshot, setProjectMeasurements, showGlobalMessage, writeOperationLog } = __appScope;
    // 与添加路径同一口径:图在使用点现取(本路径同步执行、无弹窗窗口)
    const nodes = __appScope.nodes;
    const memberIds = containerAssignedIdsFromSelection(nodes, activeSelectedNodeIds);
    if (memberIds.length === 0) {
      showGlobalMessage("选中的图元不在任何容器内。");
      return;
    }
    // 纯函数给出变更节点(成员 + 解绑的关口容器 + 重算的容器矩形/被挤出的非成员),单次撤销点 + 单次 patch
    const updates = applyRemoveFromContainer(nodes, memberIds);
    if (updates.length === 0) {
      return;
    }
    pushUndoSnapshot(true, false, undefined, "移出容器");
    patchGraphNodes(updates);
    // 量测同步:绑定设备被移出会解绑原关口容器,容器量测组须随归一化删除(改归属路径见 commitAdd)
    setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, withNodeUpdates(nodes, updates)));
    writeOperationLog(`从容器移出 ${memberIds.length} 个图元`);
    // 移出的正是某关口容器的绑定设备 → 自动解绑 + 关关口,同源提示(spec:解绑要弹提示)
    const unbindNotice = containerGatewayUnbindNotice(nodes, memberIds);
    if (unbindNotice) {
      showGlobalMessage(unbindNotice);
    }
  };
}

export function createManualPointDeltaForEdge(__appScope: SelectionDragScope) {
  return (edge: Edge, deltas: Record<string, Point>): Point | null => {
    const endpointDeltas = [deltas[edge.sourceId], deltas[edge.targetId]].filter(Boolean);
    if (endpointDeltas.length === 0) {
      return null;
    }
    return {
      x: endpointDeltas.reduce((sum, delta) => sum + delta.x, 0) / endpointDeltas.length,
      y: endpointDeltas.reduce((sum, delta) => sum + delta.y, 0) / endpointDeltas.length
    };
  };
}

export function createRoutePreserveEdgeIdsForMovedNodes(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    requestedEdgeIds: Iterable<string> = []
  ) => {
  const { edgeById, reuseSetOrCreate } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const candidateEdgeById = new Map(candidateEdges.map((edge) => [edge.id, edge]));
    const preserveIds = new Set<string>();
    const addIfBothEndpointsMove = (edge: Edge | undefined) => {
      if (edge && movedIds.has(edge.sourceId) && movedIds.has(edge.targetId)) {
        preserveIds.add(edge.id);
      }
    };
    candidateEdges.forEach(addIfBothEndpointsMove);
    for (const edgeId of requestedEdgeIds) {
      addIfBothEndpointsMove(candidateEdgeById.get(edgeId) ?? edgeById.get(edgeId));
    }
    return preserveIds;
  };
}

export function createRouteSnapshotEdgesForMove(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIdsInput: Iterable<string> = []
  ) => {
  const { busNodeIdSet } = __appScope;
    const movedIds = new Set(movedNodeIds);
    const selectedEdgeIds = new Set(selectedEdgeIdsInput);
    return candidateEdges.filter((edge) => {
      const sourceMoved = movedIds.has(edge.sourceId);
      const targetMoved = movedIds.has(edge.targetId);
      const endpointMoves = sourceMoved || targetMoved;
      const edgeTouchesBus = busNodeIdSet.has(edge.sourceId) || busNodeIdSet.has(edge.targetId);
      const exactlyOneEndpointMoves = sourceMoved !== targetMoved;
      return (
        selectedEdgeIds.has(edge.id) ||
        endpointMoves ||
        (exactlyOneEndpointMoves && edgeTouchesBus) ||
        Boolean(edge.manualPoints?.length || edge.routePoints?.length)
      );
    });
  };
}

export function createRouteTouchesExpandedBoxes(__appScope: SelectionDragScope) {
  return (
    points: Point[],
    boxes: Array<{ left: number; right: number; top: number; bottom: number }>
  ) => {
  const { boxesOverlap } = __appScope;
    if (points.length < 2 || boxes.length === 0) {
      return false;
    }
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const segmentBox = {
        left: Math.min(previous.x, current.x),
        right: Math.max(previous.x, current.x),
        top: Math.min(previous.y, current.y),
        bottom: Math.max(previous.y, current.y)
      };
      if (boxes.some((box) => boxesOverlap(segmentBox, box))) {
        return true;
      }
    }
    return false;
  };
}

export function createBoundsForNodeSet(__appScope: SelectionDragScope) {
  return (
    sourceNodes: ModelNode[],
    movedIds: Set<string>,
    positions?: Record<string, Point>,
    padding = 0
  ) => {
  const { nodeVisualInteractionBounds, orderedNodesForIds } = __appScope;
    let bounds: { left: number; right: number; top: number; bottom: number } | null = null;
    for (const node of orderedNodesForIds(sourceNodes, movedIds)) {
      const position = positions?.[node.id] ?? node.position;
      const nodeBounds = nodeVisualInteractionBounds(node, position, padding);
      bounds = bounds
        ? {
            left: Math.min(bounds.left, nodeBounds.left),
            right: Math.max(bounds.right, nodeBounds.right),
            top: Math.min(bounds.top, nodeBounds.top),
            bottom: Math.max(bounds.bottom, nodeBounds.bottom)
          }
        : nodeBounds;
    }
    return bounds;
  };
}

export function createMergeNodeUpdateLists(__appScope: SelectionDragScope) {
  return (baseUpdates: ModelNode[], extraUpdates: ModelNode[]) => {
    if (extraUpdates.length === 0) {
      return baseUpdates;
    }
    const updateById = new Map(baseUpdates.map((node) => [node.id, node]));
    const orderedIds = baseUpdates.map((node) => node.id);
    for (const node of extraUpdates) {
      if (!updateById.has(node.id)) {
        orderedIds.push(node.id);
      }
      updateById.set(node.id, node);
    }
    return orderedIds.flatMap((id) => {
      const node = updateById.get(id);
      return node ? [node] : [];
    });
  };
}

export function createMergeUniqueEdgesById(__appScope: SelectionDragScope) {
  return (firstEdges: Edge[], secondEdges: Edge[]) => {
    if (firstEdges.length === 0) {
      return secondEdges;
    }
    if (secondEdges.length === 0) {
      return firstEdges;
    }
    const edgeById = new Map(firstEdges.map((edge) => [edge.id, edge]));
    const orderedIds = firstEdges.map((edge) => edge.id);
    for (const edge of secondEdges) {
      if (!edgeById.has(edge.id)) {
        orderedIds.push(edge.id);
      }
      edgeById.set(edge.id, edge);
    }
    return orderedIds.flatMap((id) => {
      const edge = edgeById.get(id);
      return edge ? [edge] : [];
    });
  };
}

export function createCompleteNodeListForPartialPatch(__appScope: SelectionDragScope) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[]) => {
    if (nextNodes.length >= previousNodes.length) {
      return nextNodes;
    }
    const patchById = new Map(nextNodes.map((node) => [node.id, node]));
    if (patchById.size === 0) {
      return previousNodes;
    }
    const completedNodes = previousNodes.map((node) => {
      const patchedNode = patchById.get(node.id);
      if (!patchedNode) {
        return node;
      }
      patchById.delete(node.id);
      return patchedNode;
    });
    if (patchById.size === 0) {
      return completedNodes;
    }
    return [
      ...completedNodes,
      ...nextNodes.filter((node) => patchById.has(node.id))
    ];
  };
}

export function createIsWholeActiveLayerMove(__appScope: SelectionDragScope) {
  return (nodeIds: readonly string[]) => {
  const { activeLayerNodes, isCanvasNodeMovable } = __appScope;
    const movedIds = new Set(nodeIds);
    if (movedIds.size === 0 || activeLayerNodes.length === 0) {
      return false;
    }
    let movableActiveLayerNodeCount = 0;
    for (const node of activeLayerNodes) {
      if (!isCanvasNodeMovable(node.kind)) {
        continue;
      }
      movableActiveLayerNodeCount += 1;
      if (!movedIds.has(node.id)) {
        return false;
      }
    }
    return movableActiveLayerNodeCount > 0 && movedIds.size === movableActiveLayerNodeCount;
  };
}

export function createInternalMoveEdgeIdsForMovedNodes(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>
  ) => {
  const { reuseSetOrCreate } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return new Set<string>();
    }
    const internalEdgeIds = new Set<string>();
    for (const edge of candidateEdges) {
      if (movedIds.has(edge.sourceId) && movedIds.has(edge.targetId)) {
        internalEdgeIds.add(edge.id);
      }
    }
    return internalEdgeIds;
  };
}

export function createExternalMoveCandidateEdges(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    internalMovedEdgeIds: Iterable<string>
  ) => {
  const { reuseSetOrCreate } = __appScope;
    const internalIds = reuseSetOrCreate(internalMovedEdgeIds);
    return internalIds.size > 0
      ? candidateEdges.filter((edge) => !internalIds.has(edge.id))
      : candidateEdges;
  };
}

export function createInternalMoveCandidateEdges(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    internalMovedEdgeIds: Iterable<string>
  ) => {
  const { reuseSetOrCreate } = __appScope;
    const internalIds = reuseSetOrCreate(internalMovedEdgeIds);
    return internalIds.size > 0
      ? candidateEdges.filter((edge) => internalIds.has(edge.id))
      : [];
  };
}

export function createTranslateInternalMoveCandidateEdges(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    internalMovedEdgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { hasCanvasOriginShift, reuseSetOrCreate, translateStoredEdgeGeometryBy } = __appScope;
    if (!hasCanvasOriginShift(delta) || candidateEdges.length === 0) {
      return candidateEdges;
    }
    const internalIds = reuseSetOrCreate(internalMovedEdgeIds);
    if (internalIds.size === 0) {
      return candidateEdges;
    }
    let changed = false;
    const nextEdges = candidateEdges.map((edge) => {
      if (!internalIds.has(edge.id)) {
        return edge;
      }
      const nextEdge = translateStoredEdgeGeometryBy(edge, delta);
      if (nextEdge !== edge) {
        changed = true;
      }
      return nextEdge;
    });
    return changed ? nextEdges : candidateEdges;
  };
}

export function createTranslateWholeMoveCandidateEdges(__appScope: SelectionDragScope) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { hasCanvasOriginShift, reuseSetOrCreate, translateStoredEdgeGeometryBy } = __appScope;
    if (!hasCanvasOriginShift(delta) || candidateEdges.length === 0) {
      return candidateEdges;
    }
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const selectedIds = reuseSetOrCreate(selectedEdgeIds);
    let changed = false;
    const nextEdges = candidateEdges.map((edge) => {
      if (!selectedIds.has(edge.id) && (!movedIds.has(edge.sourceId) || !movedIds.has(edge.targetId))) {
        return edge;
      }
      const nextEdge = translateStoredEdgeGeometryBy(edge, delta);
      if (nextEdge !== edge) {
        changed = true;
      }
      return nextEdge;
    });
    return changed ? nextEdges : candidateEdges;
  };
}

export function createInternalRoutableLineNodeUpdatesForMove(__appScope: SelectionDragScope) {
  return (movedNodeIds: Iterable<string>, delta: Point) => {
  const { activeLayerNodeIdSet, hasCanvasOriginShift, inferMissingRoutableLineDeviceEndpointRefs, isRoutableLineDeviceKind, nodeById, nodes, reuseSetOrCreate, routableLineDeviceEndpointRefs, routableLineNodeIdsByEndpointNodeId, translateNodeBy } = __appScope;
    if (!hasCanvasOriginShift(delta)) {
      return [];
    }
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const lineUpdates: ModelNode[] = [];
    const seenLineIds = new Set<string>();
    for (const nodeId of movedIds) {
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        if (seenLineIds.has(lineId)) {
          continue;
        }
        seenLineIds.add(lineId);
        const lineNode = nodeById.get(lineId);
        if (!lineNode || !activeLayerNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
          continue;
        }
        const refs = routableLineDeviceEndpointRefs(inferMissingRoutableLineDeviceEndpointRefs(lineNode, nodes));
        if (!refs.source?.nodeId || !refs.target?.nodeId || !movedIds.has(refs.source.nodeId) || !movedIds.has(refs.target.nodeId)) {
          continue;
        }
        lineUpdates.push(translateNodeBy(lineNode, delta));
      }
    }
    return lineUpdates;
  };
}

export function createRoutableLineRouteCandidateIdsForMovedNodes(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: string[],
    originalPositions?: Record<string, Point>
  ) => {
  const { MOVE_ROUTE_LOCAL_SEARCH_PADDING, boundsForNodeSet, expandRouteBox, getRouteBlockingCandidates, isRoutableLineDeviceKind, orderedNodesForIds, queryNodeSpatialIndex, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefs, routableLineNodeIdsByEndpointNodeId, routeTouchesExpandedBoxes, visibleNodeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    const candidateIds = new Set<string>();
    if (movedIds.size === 0) {
      return candidateIds;
    }
    const routeBlockerBoxesForMovedNodes = (sourceNodes: ModelNode[], positions?: Record<string, Point>) =>
      getRouteBlockingCandidates(
        orderedNodesForIds(sourceNodes, movedIds).map((node: ModelNode) => {
          const position = positions?.[node.id];
          return position ? { ...node, position } : node;
        })
      ).map((candidate: { box: SelectionRect }) => expandRouteBox(candidate.box, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    const movedRouteBlockerBoxes = [
      ...routeBlockerBoxesForMovedNodes(previousNodes, originalPositions),
      ...routeBlockerBoxesForMovedNodes(nextNodes)
    ];
    for (const nodeId of movedIds) {
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        candidateIds.add(lineId);
      }
    }
    for (const node of orderedNodesForIds(nextNodes, movedIds)) {
      if (isRoutableLineDeviceKind(node.kind)) {
        candidateIds.add(node.id);
      }
    }
    for (const node of nextNodes) {
      if (!isRoutableLineDeviceKind(node.kind)) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(node);
      if ((refs.source && movedIds.has(refs.source.nodeId)) || (refs.target && movedIds.has(refs.target.nodeId))) {
        candidateIds.add(node.id);
      }
      if (routeTouchesExpandedBoxes(routableLineDeviceCanvasPoints(node), movedRouteBlockerBoxes)) {
        candidateIds.add(node.id);
      }
    }
    const addLinesNearBounds = (bounds: ReturnType<typeof boundsForNodeSet>) => {
      if (!bounds) {
        return;
      }
      for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, bounds)) {
        if (
          isRoutableLineDeviceKind(node.kind) &&
          (candidateIds.has(node.id) || routeTouchesExpandedBoxes(routableLineDeviceCanvasPoints(node), movedRouteBlockerBoxes))
        ) {
          candidateIds.add(node.id);
        }
      }
    };
    addLinesNearBounds(boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addLinesNearBounds(boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return candidateIds;
  };
}

export function createRebuildRoutableLineNodeUpdatesForChangedNodes(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    changedNodeIds: string[],
    bounds: CanvasBounds,
    originalPositions?: Record<string, Point>
  ) => {
  const { completeNodeListForPartialPatch, rebuildRoutableLineDeviceRouteUpdates, routableLineRouteCandidateIdsForMovedNodes } = __appScope;
    const fullNextNodes = completeNodeListForPartialPatch(previousNodes, nextNodes);
    const candidateIds = routableLineRouteCandidateIdsForMovedNodes(previousNodes, fullNextNodes, changedNodeIds, originalPositions);
    return candidateIds.size > 0
      ? rebuildRoutableLineDeviceRouteUpdates(fullNextNodes, candidateIds, bounds, previousNodes, { movedNodeIds: changedNodeIds })
      : [];
  };
}

export function createScheduleDeferredRoutableLineRouteRepair(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    movedNodeIds: string[],
    originalPositions: Record<string, Point> | undefined,
    expectedNodeUpdates: ModelNode[],
    effectiveCanvasBounds: CanvasBounds
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, deferredRoutableLineRouteRepairCancelRef, expandCanvasToFitGraph, graphStorePatchNodes, graphStorePatchStillCurrent, latestGraphStoreRef, markGraphDirtyForInteractiveCommit, rebuildRoutableLineDeviceRouteUpdates, routableLineRouteCandidateIdsForMovedNodes, scheduleIdleWork, setGraphStore } = __appScope;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    if (movedNodeIds.length === 0 || expectedNodeUpdates.length === 0) {
      deferredRoutableLineRouteRepairCancelRef.current = null;
      return;
    }
    const movedNodeIdList = [...new Set(movedNodeIds)];
    deferredRoutableLineRouteRepairCancelRef.current = scheduleIdleWork(() => {
      deferredRoutableLineRouteRepairCancelRef.current = null;
      const latestStore = latestGraphStoreRef.current;
      if (!latestStore || !graphStorePatchStillCurrent(latestStore, expectedNodeUpdates, [], [])) {
        return;
      }
      const candidateIds = routableLineRouteCandidateIdsForMovedNodes(
        previousNodes,
        latestStore.nodes,
        movedNodeIdList,
        originalPositions
      );
      if (candidateIds.size === 0) {
        return;
      }
      const nodeUpdates = rebuildRoutableLineDeviceRouteUpdates(
        latestStore.nodes,
        candidateIds,
        effectiveCanvasBounds,
        previousNodes,
        { movedNodeIds: movedNodeIdList }
      );
      if (nodeUpdates.length === 0) {
        return;
      }
      expandCanvasToFitGraph(nodeUpdates, [], [], CANVAS_AUTO_EXPAND_PADDING, effectiveCanvasBounds);
      markGraphDirtyForInteractiveCommit();
      setGraphStore((current: GraphStore) =>
        graphStorePatchStillCurrent(current, expectedNodeUpdates, [], [])
          ? graphStorePatchNodes(current, nodeUpdates)
          : current
      );
    }, 80, 1500);
  };
}

export function createLocalRouteOptimizationEdges(__appScope: SelectionDragScope) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalPositions?: Record<string, Point>
  ) => {
  const { MOVE_ROUTE_LOCAL_SEARCH_PADDING, boundsForNodeSet, boxesOverlap, routeRenderBounds, routeSpatialIndexRenderBounds, routedEdgeById, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const currentBounds = boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING);
    const originalBounds = boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING);
    return candidateEdges.filter((edge) => {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)) {
        return true;
      }
      const route = routedEdgeById.get(edge.id);
      if (!route) {
        return false;
      }
      const routeBounds = routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8);
      return Boolean(
        routeBounds &&
          ((currentBounds && boxesOverlap(routeBounds, currentBounds)) ||
            (originalBounds && boxesOverlap(routeBounds, originalBounds)))
      );
    });
  };
}
