/** 画布指针事件、滚轮缩放与连线交互主工厂模块（重导出 appStaticDrawingFactories）。 */

import type { CanvasInteractionScope } from "./appScopeTypes";
import { degreesToRadians } from "../formatUtils";
import { WindowCloseButton } from "../WindowCloseButton";
import {
  commitContainerMembership,
  containerDragGroup,
  foldContainerScaleIntoSize,
  isContainerNode,
  withNodeUpdates,
} from "../acContainer";
import {
  cloneEdgeEditablePoints,
  isLineOnlyConnectionNode,
  modelAssociationDeviceModelTypeFailureMessage,
  modelAssociationModelIdLocked,
  modelAssociationModelIdLockMessage,
  baseDeviceKind,
  getRatedCapacityDefaultForKind,
  syncedSwitchStatusPatch,
} from "../model";
import { setVoltageBaseTerminalValueForTopologySide, voltageBaseParamTerminalIndexForNode } from "../model-routing";
import { CONTAINER_BINDING_PARAM_KEYS } from "./appCoreCanvasUtilities";
import { Button, Input } from "antd";
import type {
  CanvasBounds,
  DeviceTemplate,
  Edge,
  ModelNode,
  Point,
  TerminalType,
} from "../model";
import type {
  BatchCommonMeasurementGroupKey,
  BatchCommonParamPatch,
  ConnectTarget,
  ContextMenuState,
  DraggingState,
  GraphTemplate,
  GroupTransformDrag,
  LibraryPlacementState,
  NodeDoubleClickDialogState,
  ProjectMenuState,
  RenderViewportBounds,
  RewiringState,
  ScaleHandleConfig,
  ScaleHandleKind,
  SingleTransformDrag,
  SmartAlignmentAnchorMap,
} from "./appCoreCanvasUtilities";
import type { SidePanelAutoEvent, SidePanelMode, SidePanelSide } from "../sidePanelVisibility";
import type { CanvasClipboardEdge, CanvasLayoutUnit } from "../selectionActions";
import type { GraphStore } from "../graphStore";
import type { CanvasResizeEdge } from "../canvasViewport";
import type { MeasurementGroup, ProjectMeasurementConfig } from "../measurements";
import type { DeviceParameterDefinition, Terminal } from "../model";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

import {
  type CanvasSizeDraft,
  createComputeSmartAlignmentGeometrySnap,
  isRatedCapacityInReasonableRange,
  transformerSideTerminalIdForVoltageParam,
} from "./appStaticDrawingFactories";

export * from "./appStaticDrawingFactories";

export function createCommitCanvasSizeDraft(__appScope: CanvasInteractionScope) {
  return (draft?: CanvasSizeDraft) => {
  const { MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, calculateModelContentSize, canvasHeight, canvasSizeDraft, canvasWidth, clampCanvasDimension, edges, nodes, routeEdgesForStoredRendering, routedEdges, setCanvasSizeDraft, updateCanvasSize, writeOperationLog } = __appScope;
    if (draft === undefined) {
      draft = canvasSizeDraft as CanvasSizeDraft;
    }
    const nextWidth = draft.width.trim() === "" ? canvasWidth : Number(draft.width);
    const nextHeight = draft.height.trim() === "" ? canvasHeight : Number(draft.height);
    const requestedWidth = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth);
    const requestedHeight = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight);
    const requestedRoutes = routeEdgesForStoredRendering(nodes, edges, { width: requestedWidth, height: requestedHeight });
    const currentContentSize = calculateModelContentSize(nodes, edges, routedEdges);
    const requestedContentSize = calculateModelContentSize(nodes, edges, requestedRoutes);
    const contentSize = {
      width: Math.max(currentContentSize.width, requestedContentSize.width),
      height: Math.max(currentContentSize.height, requestedContentSize.height)
    };
    const requiredWidth = clampCanvasDimension(contentSize.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, requestedWidth);
    const requiredHeight = clampCanvasDimension(contentSize.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, requestedHeight);
    const width = Math.max(requestedWidth, requiredWidth);
    const height = Math.max(requestedHeight, requiredHeight);
    if (width !== requestedWidth || height !== requestedHeight) {
      const message = `输入的显示区域小于当前图上内容实际占用范围，已调整为 ${width} x ${height}。`;
      showGlobalMessage(message);
      writeOperationLog(message);
    }
    setCanvasSizeDraft({ width: String(width), height: String(height) });
    updateCanvasSize(width, height);
  };
}

export function createResetCanvasSizeDraft(__appScope: CanvasInteractionScope) {
  return () => {
  const { canvasHeight, canvasWidth, setCanvasSizeDraft } = __appScope;
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  };
}

export function createHandleCanvasSizeBlur(__appScope: CanvasInteractionScope) {
  return () => {
  const { commitCanvasSizeDraft, flushSync, skipCanvasSizeBlurCommitRef } = __appScope;
    if (skipCanvasSizeBlurCommitRef.current) {
      skipCanvasSizeBlurCommitRef.current = false;
      return;
    }
    flushSync(() => commitCanvasSizeDraft());
  };
}

export function createHandleCanvasSizeKeyDown(__appScope: CanvasInteractionScope) {
  return (event: ReactKeyboardEvent<HTMLInputElement>) => {
  const { commitCanvasSizeDraft, flushSync, resetCanvasSizeDraft, skipCanvasSizeBlurCommitRef } = __appScope;
    if (event.key === "Enter") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      flushSync(() => commitCanvasSizeDraft());
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      resetCanvasSizeDraft();
      event.currentTarget.blur();
    }
  };
}

export function createUpdateParam(__appScope: CanvasInteractionScope) {
  return (key: string, value: string) => {
  const { NODE_LABEL_FOOTPRINT_PARAM_KEYS, commitNodeFootprintUpdates, inferESection, nodeById, normalizeNodeLabelDisplayMode, normalizeProjectMeasurements, normalizeRatioParameterInputValue, patchGraphNodes, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, selectedNodeId, setProjectMeasurements, undoScopeForNodeFootprintPatch, nodes, edges, undoScopeForGraphPatch } = __appScope;
    if (!selectedNodeId) {
      return;
    }
    const currentNode = nodeById.get(selectedNodeId);
    if (!currentNode) {
      return;
    }
    const storedValue = typeof normalizeRatioParameterInputValue === "function"
      ? normalizeRatioParameterInputValue(
          key,
          value,
          typeof inferESection === "function" ? inferESection(currentNode.kind, currentNode.params) : undefined
        )
      : value;
    if (storedValue === null) {
      return;
    }
    if (
      key === "model_id" &&
      currentNode.params.model_id !== storedValue &&
      modelAssociationModelIdLocked(currentNode, nodeById.values())
    ) {
      showGlobalMessage(modelAssociationModelIdLockMessage(currentNode));
      return;
    }
    if (key !== "_labelDisplayMode" && currentNode.params[key] === storedValue) {
      return;
    }
    // 变压器侧电压等级修改 → 只扩散到该侧分压岛（严禁跨分压侧）：
    // 该侧所有设备（同侧母线/线路/电源等）统一为新电压，变压器对侧不受影响。
    const transformerSideTerminalId = transformerSideTerminalIdForVoltageParam(currentNode, key);
    if (transformerSideTerminalId && nodes && edges && typeof setVoltageBaseTerminalValueForTopologySide === "function") {
      const islandResult = setVoltageBaseTerminalValueForTopologySide(nodes, edges, currentNode.id, transformerSideTerminalId, storedValue);
      if (islandResult.changedNodeIds.length > 0) {
        pushUndoSnapshot(true, false, undoScopeForGraphPatch(islandResult.changedNodeIds, []));
        patchGraphNodes(islandResult.nodeUpdates);
        return;
      }
    }
    const nextNode =
      key === "_labelDisplayMode"
        ? (() => {
            const mode = normalizeNodeLabelDisplayMode(storedValue);
            const visible = mode === "hidden" ? "0" : "1";
            if (currentNode.params._labelDisplayMode === mode && currentNode.params._labelVisible === visible) {
              return currentNode;
            }
            return { ...currentNode, params: { ...currentNode.params, _labelDisplayMode: mode, _labelVisible: visible } };
          })()
        : key === "rated_voltage"
          ? (() => {
              // 当额定电压变化时，联动更新额定容量默认值
              const newParams = { ...currentNode.params, [key]: storedValue };
              const ratedCapacityDefault = getRatedCapacityDefaultForKind(baseDeviceKind(currentNode.kind), storedValue);
              if (ratedCapacityDefault && !isRatedCapacityInReasonableRange(currentNode.params.rated_capacity ?? currentNode.params.ratedCapacity)) {
                // 优先写入 rated_capacity（snake_case），保持与 UI 字段一致
                if (Object.prototype.hasOwnProperty.call(currentNode.params, "rated_capacity") || !Object.prototype.hasOwnProperty.call(currentNode.params, "ratedCapacity")) {
                  newParams.rated_capacity = ratedCapacityDefault;
                } else {
                  newParams.ratedCapacity = ratedCapacityDefault;
                }
              }
              return { ...currentNode, params: newParams };
            })()
          : (() => {
              // 开关类 status↔closed_status 对称同写：渲染只认 closed_status，
              // status 行下拉标签却是“闭合/打开”，分叉即“切到打开仍显示闭合”。
              const patch = syncedSwitchStatusPatch(currentNode.kind, currentNode.params, { [key]: storedValue });
              const paramsNode = { ...currentNode, params: { ...currentNode.params, ...patch } };
              // 变压器侧电压参数(i_vbase/j_vbase/k_vbase)与对应端子 vbase 需保持一致：
              // 修改侧电压时同步对应端子 vbase，令拓扑着色与【设置电压基值】窗口读取一致。
              // 侧位同样取自 `voltageBaseParamTerminalIndexForNode`（唯一分侧表）。
              const terminalIndexForVbase = voltageBaseParamTerminalIndexForNode(currentNode, key);
              if (terminalIndexForVbase === undefined) {
                return paramsNode;
              }
              const targetTerminal = currentNode.terminals[terminalIndexForVbase];
              if (!targetTerminal || targetTerminal.vbase === storedValue) {
                return paramsNode;
              }
              return {
                ...paramsNode,
                terminals: currentNode.terminals.map((terminal: Terminal, index: number) =>
                  index === terminalIndexForVbase ? { ...terminal, vbase: storedValue } : terminal
                )
              };
            })()
    if (nextNode === currentNode) {
      return;
    }
    if (NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key)) {
      pushUndoSnapshot(true, false, undoScopeForNodeFootprintPatch(selectedNodeId, nextNode));
      commitNodeFootprintUpdates([nextNode]);
      return;
    }
    pushNodeOnlyUndoSnapshot(selectedNodeId, undefined, nodeById.get(selectedNodeId)?.name);
    patchGraphNodes([nextNode]);
    // 量测同步:绑定设备/关口开关决定容器量测组的存在性 → 走同一归一化出口收敛。
    // typeof 防御是给旧测试桩的既有惯例(见上方 setVoltageBaseTerminalValueForTopologySide 同款判断)
    if (CONTAINER_BINDING_PARAM_KEYS.has(key) && typeof normalizeProjectMeasurements === "function" && typeof setProjectMeasurements === "function") {
      setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, withNodeUpdates(nodes, [nextNode])));
    }
  };
}

export function createApplyBatchCommonParamPatch(__appScope: CanvasInteractionScope) {
  return (
    operationLabel: string,
    patchForNode: (node: ModelNode) => BatchCommonParamPatch,
    allowMissingParamKeys: readonly string[] = []
  ) => {
  const { NODE_LABEL_FOOTPRINT_PARAM_KEYS, activeSelectedNodeIds, canBatchEditParam, commitNodeFootprintUpdates, edgeListForNodeIds, nodeById, nodes, normalizeProjectMeasurements, patchGraphNodes, pushUndoSnapshot, setProjectMeasurements, undoScopeForGraphPatch, writeOperationLog } = __appScope;
    const allowedMissingParamKeySet = new Set(allowMissingParamKeys);
    const targetNodes = activeSelectedNodeIds.flatMap((nodeId: string) => nodeById.get(nodeId) ?? []);
    const changedPatchKeys = new Set<string>();
    let lockedModelAssociationNode: ModelNode | undefined;
    const nextNodes = targetNodes
      .map((node: ModelNode) => {
        const patch = Object.fromEntries(
          Object.entries(patchForNode(node))
            .filter(([patchKey]) => canBatchEditParam(patchKey))
            .filter(([patchKey]) =>
              Object.prototype.hasOwnProperty.call(node.params, patchKey) ||
              allowedMissingParamKeySet.has(patchKey)
            )
        );
        if (
          Object.prototype.hasOwnProperty.call(patch, "model_id") &&
          patch.model_id !== node.params.model_id &&
          modelAssociationModelIdLocked(node, nodeById.values())
        ) {
          lockedModelAssociationNode ??= node;
          delete patch.model_id;
        }
        if (Object.keys(patch).length === 0) {
          return node;
        }
        if (Object.entries(patch).every(([patchKey, patchValue]) => node.params[patchKey] === patchValue)) {
          return node;
        }
        Object.keys(patch).forEach((patchKey) => changedPatchKeys.add(patchKey));
        return { ...node, params: { ...node.params, ...patch } };
      })
      .filter((node: ModelNode, index: number) => node !== targetNodes[index]);
    if (lockedModelAssociationNode) {
      showGlobalMessage(modelAssociationModelIdLockMessage(lockedModelAssociationNode));
    }
    if (nextNodes.length === 0) {
      return;
    }
    const nextNodeIds = nextNodes.map((node: ModelNode) => node.id);
    // 量测同步:批量键白名单不排除 is_gateway/bound_device_id(多选容器会出现这两个批量行),
    // 两条提交分支都要喂归一化出口,容器量测组才会随批量绑定/关关口收敛;
    // 但只有真改了这两键才需要——归一化只按容器 params/归属算组,其余键喂旧图等价,省一趟 O(n) 合并
    const changedContainerBinding = Array.from(changedPatchKeys).some((key) => CONTAINER_BINDING_PARAM_KEYS.has(key));
    const graphAfterBatchPatch = changedContainerBinding ? withNodeUpdates(nodes, nextNodes) : nodes;
    const hasFootprintParam = Array.from(changedPatchKeys).some((key) => NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key));
    if (hasFootprintParam) {
      const affectedEdges = edgeListForNodeIds(nextNodeIds);
      pushUndoSnapshot(true, false, undoScopeForGraphPatch(nextNodeIds, affectedEdges.map((edge: Edge) => edge.id)));
      commitNodeFootprintUpdates(nextNodes);
      setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, graphAfterBatchPatch));
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(nextNodeIds, []));
    patchGraphNodes(nextNodes);
    setProjectMeasurements((current: any) => normalizeProjectMeasurements(current, graphAfterBatchPatch));
    writeOperationLog(`批量修改共同属性：${operationLabel}`);
  };
}

export function createApplyBatchCommonParam(__appScope: CanvasInteractionScope) {
  return (key: string, value: string) => {
  const { PARAM_LABELS, applyBatchCommonParamPatch, canBatchEditParam, inferESection, nodeById, normalizeNodeLabelDisplayMode, normalizeRatioParameterInputValue, selectedNodeIds } = __appScope;
    if (!canBatchEditParam(key)) {
      return;
    }
    const selectedSections = typeof inferESection === "function" && nodeById instanceof Map && selectedNodeIds
      ? new Set(Array.from(selectedNodeIds as Iterable<string>).map((nodeId) => {
          const node = nodeById.get(nodeId);
          return node ? inferESection(node.kind, node.params) : "";
        }).filter(Boolean))
      : new Set<string>();
    let storedValue = value;
    if (typeof normalizeRatioParameterInputValue === "function") {
      const sections = selectedSections.size > 0 ? Array.from(selectedSections) : [undefined];
      const normalizedValues = sections.map((section) => normalizeRatioParameterInputValue(key, value, section));
      if (normalizedValues.some((normalizedValue) => normalizedValue === null)) {
        return;
      }
      storedValue = normalizedValues[0] ?? value;
    }
    const normalizedLabelDisplayMode = key === "_labelDisplayMode" ? normalizeNodeLabelDisplayMode(storedValue) : undefined;
    const normalizedLabelVisible = normalizedLabelDisplayMode === "hidden" ? "0" : "1";
    applyBatchCommonParamPatch(
      PARAM_LABELS[key] ?? key,
      (node: ModelNode) => {
        if (normalizedLabelDisplayMode) {
          return { _labelDisplayMode: normalizedLabelDisplayMode, _labelVisible: normalizedLabelVisible };
        }
        // 开关类 status↔closed_status 对称同写；node 缺省（部分旧调用方无参调用）时退化为原 patch
        const targetNode = node ?? (nodeById instanceof Map ? nodeById.values().next().value : undefined);
        return syncedSwitchStatusPatch(targetNode?.kind ?? "", targetNode?.params ?? {}, { [key]: storedValue });
      },
      normalizedLabelDisplayMode ? ["_labelDisplayMode", "_labelVisible"] : [key]
    );
  };
}

export function createApplyBatchCommonMeasurementGroupSetting(__appScope: CanvasInteractionScope) {
  return (key: BatchCommonMeasurementGroupKey, value: string) => {
  const { BATCH_MEASUREMENT_GROUP_LABELS, measurementGroupCommonValue, measurementGroupWithCommonSetting, projectMeasurements, selectedNodeIdsWithMeasurementGroups, updateProjectMeasurementsWithUndo } = __appScope;
    if (!value || selectedNodeIdsWithMeasurementGroups.size === 0) {
      return;
    }
    const changedGroupIds = new Set(
      projectMeasurements.groups
        .filter((group: MeasurementGroup) => selectedNodeIdsWithMeasurementGroups.has(group.nodeId))
        .filter((group: MeasurementGroup) => measurementGroupCommonValue(group, key) !== value)
        .map((group: MeasurementGroup) => group.id)
    );
    if (changedGroupIds.size === 0) {
      return;
    }
    updateProjectMeasurementsWithUndo(
      (current: ProjectMeasurementConfig) => ({
        version: 1,
        groups: current.groups.map((group: MeasurementGroup) => changedGroupIds.has(group.id)
          ? measurementGroupWithCommonSetting(group, key, value)
          : group
        )
      }),
      `批量修改量测属性：${BATCH_MEASUREMENT_GROUP_LABELS[key]}`
    );
  };
}

export function createCommitElementTreeNodeIdentity(__appScope: CanvasInteractionScope) {
  return (nodeId: string, field: "idx" | "name", value: string, draftKey?: string) => {
  const { activeLayerNodeIdSet, clearElementTreeDraft, nodeById, pushNodeOnlyUndoSnapshot, updateElementTreeDraft, updateGraphNodeById } = __appScope;
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    const node = nodeById.get(nodeId);
    if (!node) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    const currentValue = field === "name" ? node.name : node.params.idx ?? "";
    if (currentValue === value) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if (draftKey) {
      updateElementTreeDraft(draftKey, value);
    }
    pushNodeOnlyUndoSnapshot(nodeId, undefined, nodeById.get(nodeId)?.name);
    updateGraphNodeById(nodeId, (node: ModelNode) =>
      field === "name" ? { ...node, name: value } : { ...node, params: { ...node.params, idx: value } }
    );
  };
}

export function createCommitElementTreeContainerChildParam(__appScope: CanvasInteractionScope) {
  return (nodeId: string, key: string, value: string, draftKey?: string) => {
  const { activeLayerNodeIdSet, clearElementTreeDraft, nodeById, pushNodeOnlyUndoSnapshot, updateElementTreeDraft, updateGraphNodeById } = __appScope;
    if (!key) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    const node = nodeById.get(nodeId);
    if (!node) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if ((node.params[key] ?? "") === value) {
      if (draftKey) {
        clearElementTreeDraft(draftKey);
      }
      return;
    }
    if (draftKey) {
      updateElementTreeDraft(draftKey, value);
    }
    pushNodeOnlyUndoSnapshot(nodeId, undefined, nodeById.get(nodeId)?.name);
    updateGraphNodeById(nodeId, (node: ModelNode) => ({ ...node, params: { ...node.params, [key]: value } }));
  };
}

export function createTerminalVbaseFallback(__appScope: CanvasInteractionScope) {
  return (node: ModelNode, terminalIndex: number) => {
  const { terminalVbaseFallbackValue } = __appScope;
    return terminalVbaseFallbackValue(node, terminalIndex);
  };
}

export function createUpdateTerminalVbase(__appScope: CanvasInteractionScope) {
  return (terminalId: string, value: string) => {
  const { normalizeVoltageBaseInput, pushNodeOnlyUndoSnapshot, selectedNodeId, updateGraphNodeById } = __appScope;
    if (!selectedNodeId) {
      return;
    }
    const numericValue = normalizeVoltageBaseInput(value);
    pushNodeOnlyUndoSnapshot(selectedNodeId);
    updateGraphNodeById(selectedNodeId, (node: ModelNode) => ({
      ...node,
      terminals: node.terminals.map((terminal: Terminal) =>
        terminal.id === terminalId ? { ...terminal, vbase: numericValue } : terminal
      )
    }));
  };
}

export function createRenderParamHeader(__appScope: CanvasInteractionScope) {
  return (key: string, displayName = key, title?: string) => {
  const { PARAM_LABELS, small, span, th } = __appScope;
    if (title === undefined) {
      title = PARAM_LABELS[key] ?? displayName;
    }
    const visibleLabel = displayName === key ? title : displayName;
    const englishLabel = key.trim();
    return (
      <th title={englishLabel ? `${visibleLabel} / ${englishLabel}` : visibleLabel}>
        <span className="param-header-bilingual">
          <span>{visibleLabel}</span>
          {englishLabel && englishLabel !== visibleLabel ? <small>{englishLabel}</small> : null}
        </span>
      </th>
    );
  };
}

export function createRenderNodeDoubleClickDeviceParamRows(__appScope: CanvasInteractionScope) {
  return (node: ModelNode) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, BufferedTextInput, PARAM_LABELS, READONLY_E_PARAM_KEYS, batchEditors, formatDeviceModelParamDisplayValue, getEParamValue, getEParameterKeys, input, parseCustomDefinitions, td, tr } = __appScope;
    const eKeys = getEParameterKeys(node.kind, node.params);
    const customDefinitions = parseCustomDefinitions(node.params);
    const customKeys = customDefinitions.map((definition: DeviceParameterDefinition) => definition.enName);
    const customExtraKeys = customKeys.filter((key: string) => !eKeys.includes(key));
    const keys =
      eKeys.length > 0
        ? [...eKeys, ...customExtraKeys]
        : customKeys.length > 0
          ? ["name", ...customKeys.filter((key: string) => key !== "name")]
          : ["name", ...Object.keys(node.params).filter((key) => !key.startsWith("_") && key !== "is_container" && key !== ALLOW_RESIZE_TRANSFORM_PARAM)];
    return keys.map((key) => {
      const value = eKeys.length > 0 ? getEParamValue(key, node) : key === "name" ? node.name : node.params[key] ?? "";
      const displayValue = formatDeviceModelParamDisplayValue(key, value);
      const definition = customDefinitions.find((item: DeviceParameterDefinition) => item.enName === key);
      return (
        <tr key={key}>
          {batchEditors.renderParamHeader(key, key, definition?.cnName === key ? PARAM_LABELS[key] ?? key : (definition?.cnName ?? PARAM_LABELS[key] ?? key))}
          <td>
            {key === "name" ? (
              <BufferedTextInput value={node.name} onCommit={(nextValue: unknown) => batchEditors.updateNodeDoubleClickDraftPatch(node.id, { name: nextValue })} />
            ) : READONLY_E_PARAM_KEYS.has(key) || batchEditors.definitionMakesValueReadonly(definition) ? (
              <Input value={displayValue} readOnly />
            ) : (
              batchEditors.renderNodeDoubleClickParamEditor(node, key, displayValue, false, definition)
            )}
          </td>
        </tr>
      );
    });
  };
}

export function createRememberNodeDoubleClickDialogGuard(__appScope: CanvasInteractionScope) {
  return (dialog: NonNullable<NodeDoubleClickDialogState>) => {
  const { NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS, nodeDoubleClickCloseSuppressUntilRef, nodeDoubleClickOpenGuardRef } = __appScope;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    nodeDoubleClickOpenGuardRef.current = { key: `${dialog.nodeId}:${dialog.kind}`, time: now };
    nodeDoubleClickCloseSuppressUntilRef.current = now + NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS;
  };
}

export function createSuppressNodeDoubleClickDialogEvent(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) => {
  const { nodeDoubleClickDialog, rememberNodeDoubleClickDialogGuard } = __appScope;
    event.stopPropagation();
    if (nodeDoubleClickDialog) {
      rememberNodeDoubleClickDialogGuard(nodeDoubleClickDialog);
    }
  };
}

export function createFinishNodeDoubleClickDialogPointerOperation(__appScope: CanvasInteractionScope) {
  return () => {
  const { setNodeDoubleClickDialogDrag, setNodeDoubleClickDialogResize } = __appScope;
    setNodeDoubleClickDialogDrag(null);
    setNodeDoubleClickDialogResize(null);
  };
}

export function createStopNodeDoubleClickDialogEvent(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) => {
  const { finishNodeDoubleClickDialogPointerOperation } = __appScope;
    event.stopPropagation();
    if (
      event.type === "pointerup" ||
      event.type === "pointercancel" ||
      event.type === "lostpointercapture"
    ) {
      finishNodeDoubleClickDialogPointerOperation();
    }
  };
}

export function createCurrentNodeDoubleClickDialogRect(__appScope: CanvasInteractionScope) {
  return () => {
  const { NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH, clampNodeDoubleClickDialogLayout, nodeDoubleClickDialogLayout, nodeDoubleClickDialogRef } = __appScope;
    const rect = nodeDoubleClickDialogRef.current?.getBoundingClientRect();
    if (rect) {
      return clampNodeDoubleClickDialogLayout({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
    const viewportWidth = typeof window === "undefined" ? NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT : window.innerHeight;
    return clampNodeDoubleClickDialogLayout(nodeDoubleClickDialogLayout ?? {
      left: (viewportWidth - NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH) / 2,
      top: (viewportHeight - NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT) / 2,
      width: NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH,
      height: NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT
    });
  };
}

export function createStartNodeDoubleClickDialogDrag(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement>) => {
  const { currentNodeDoubleClickDialogRect, setNodeDoubleClickDialogDrag, setNodeDoubleClickDialogLayout } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentNodeDoubleClickDialogRect();
    setNodeDoubleClickDialogLayout(rect);
    setNodeDoubleClickDialogDrag({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartNodeDoubleClickDialogResize(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLDivElement>) => {
  const { currentNodeDoubleClickDialogRect, setNodeDoubleClickDialogLayout, setNodeDoubleClickDialogResize } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentNodeDoubleClickDialogRect();
    setNodeDoubleClickDialogLayout(rect);
    setNodeDoubleClickDialogResize({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createCancelNodeDoubleClickDialog(__appScope: CanvasInteractionScope) {
  return () => {
  const { finishNodeDoubleClickDialogPointerOperation, nodeDoubleClickDialog, rememberNodeDoubleClickDialogGuard, setNodeDoubleClickDialog, setNodeDoubleClickDraft } = __appScope;
    const dialog = nodeDoubleClickDialog;
    if (dialog) {
      rememberNodeDoubleClickDialogGuard(dialog);
    }
    finishNodeDoubleClickDialogPointerOperation();
    setNodeDoubleClickDialog(null);
    setNodeDoubleClickDraft(null);
  };
}

export function createConfirmNodeDoubleClickDialog(__appScope: CanvasInteractionScope) {
  return () => {
  const { finishNodeDoubleClickDialogPointerOperation, nodeById, nodeDoubleClickDialog, nodeDoubleClickDraft, nodeDoubleClickDraftHasModelChanges, patchGraphNodes, pushNodeOnlyUndoSnapshot, rememberNodeDoubleClickDialogGuard, setNodeDoubleClickDialog, setNodeDoubleClickDraft } = __appScope;
    const dialog = nodeDoubleClickDialog;
    if (!dialog) {
      return;
    }
    rememberNodeDoubleClickDialogGuard(dialog);
    const currentNode = nodeById.get(dialog.nodeId);
    const draftNode =
      nodeDoubleClickDraft?.nodeId === dialog.nodeId ? nodeDoubleClickDraft.node : undefined;
    const committedDraftNode = currentNode && draftNode &&
      currentNode.params.model_id !== draftNode.params.model_id &&
      modelAssociationModelIdLocked(currentNode, nodeById.values())
      ? (() => {
          showGlobalMessage(modelAssociationModelIdLockMessage(currentNode));
          return {
            ...draftNode,
            params: { ...draftNode.params, model_id: currentNode.params.model_id }
          };
        })()
      : draftNode;
    if (currentNode && committedDraftNode && nodeDoubleClickDraftHasModelChanges(currentNode, committedDraftNode)) {
      pushNodeOnlyUndoSnapshot(currentNode.id, undefined, currentNode.name);
      patchGraphNodes([
        {
          ...currentNode,
          name: committedDraftNode.name,
          params: { ...committedDraftNode.params }
        }
      ]);
    }
    finishNodeDoubleClickDialogPointerOperation();
    setNodeDoubleClickDialog(null);
    setNodeDoubleClickDraft(null);
  };
}

export function createRenderNodeDoubleClickDialog(__appScope: CanvasInteractionScope) {
  return () => {
  const { batchEditors, buildContainerDeviceParameterViews, button, cancelNodeDoubleClickDialog, clampNodeDoubleClickDialogLayout, cloneNodeForDoubleClickDraft, confirmNodeDoubleClickDialog, div, h2, h3, isStaticButtonCapableNode, libraryTemplateByKind, nodeById, nodeDoubleClickDialog, nodeDoubleClickDialogLayout, nodeDoubleClickDialogRef, nodeDoubleClickDraft, nodeHasTextDoubleClickEditor, p, renderNodeDoubleClickContainerParamRows, renderNodeDoubleClickDeviceParamRows, renderNodeDoubleClickTextParamTable, section, setNodeDoubleClickDialog, startNodeDoubleClickDialogDrag, startNodeDoubleClickDialogResize, stopNodeDoubleClickDialogEvent, suppressNodeDoubleClickDialogEvent, table, tbody } = __appScope;
    if (!nodeDoubleClickDialog) {
      return null;
    }
    const node = nodeById.get(nodeDoubleClickDialog.nodeId);
    if (!node) {
      return null;
    }
    const dialogNode =
      nodeDoubleClickDraft?.nodeId === node.id ? nodeDoubleClickDraft.node : cloneNodeForDoubleClickDraft(node);
    const containerViews =
      nodeDoubleClickDialog.kind === "device"
        ? buildContainerDeviceParameterViews(dialogNode, libraryTemplateByKind.get(dialogNode.kind))
        : [];
    const activeContainerView =
      containerViews.find((view: { id: string; label: string }) => view.id === nodeDoubleClickDialog.containerViewId) ?? containerViews[0];
    const title =
      nodeDoubleClickDialog.kind === "interaction"
        ? "修改交互操作"
        : nodeDoubleClickDialog.kind === "text"
          ? "修改文本"
          : "修改设备参数";
    const dialogLayout = nodeDoubleClickDialogLayout ? clampNodeDoubleClickDialogLayout(nodeDoubleClickDialogLayout) : null;
    const dialogStyle = dialogLayout
      ? {
          left: `${dialogLayout.left}px`,
          top: `${dialogLayout.top}px`,
          width: `${dialogLayout.width}px`,
          height: `${dialogLayout.height}px`
        } as CSSProperties
      : undefined;
    return (
      <div className="image-picker-backdrop" onPointerDown={cancelNodeDoubleClickDialog}>
        <section
          ref={nodeDoubleClickDialogRef}
          className={`node-double-click-dialog window-close-host${dialogLayout ? " floating" : ""}`}
          style={dialogStyle}
          onPointerDown={stopNodeDoubleClickDialogEvent}
          onPointerUp={stopNodeDoubleClickDialogEvent}
          onPointerCancel={stopNodeDoubleClickDialogEvent}
          onLostPointerCapture={stopNodeDoubleClickDialogEvent}
          onClick={stopNodeDoubleClickDialogEvent}
          onDoubleClick={suppressNodeDoubleClickDialogEvent}
          role="dialog"
          aria-modal="true"
          aria-labelledby="node-double-click-dialog-title"
        >
          <WindowCloseButton label={`关闭${title}窗口`} onClick={cancelNodeDoubleClickDialog} />
          <div className="image-picker-title node-double-click-dialog-title" onPointerDown={startNodeDoubleClickDialogDrag}>
            <div>
              <h2 id="node-double-click-dialog-title">{title}</h2>
              <p>{dialogNode.name}</p>
            </div>
          </div>
          <div className="node-double-click-dialog-body">
            {nodeDoubleClickDialog.kind === "interaction" ? (
              <>
                <div className="node-double-click-dialog-section">
                  <h3>修改交互操作</h3>
                  <table className="param-table node-double-click-param-table">
                    <tbody>
                      {batchEditors.renderStaticButtonActionEditor(dialogNode, {
                        updateParam: (key: string, value: string) => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, key, value),
                        updateNode: (patch: BatchCommonParamPatch) => batchEditors.updateNodeDoubleClickDraftPatch(dialogNode.id, patch)
                      })}
                    </tbody>
                  </table>
                </div>
                {(nodeHasTextDoubleClickEditor(dialogNode) || isStaticButtonCapableNode(dialogNode)) && (
                  <div className="node-double-click-dialog-section">
                    <h3>修改文本</h3>
                    {renderNodeDoubleClickTextParamTable(dialogNode)}
                  </div>
                )}
              </>
            ) : nodeDoubleClickDialog.kind === "text" ? (
              renderNodeDoubleClickTextParamTable(dialogNode)
            ) : activeContainerView ? (
              <>
                <div className="container-param-tabs node-double-click-container-tabs" role="tablist" aria-label="容器设备参数切换">
                  {containerViews.map((view: { id: string; label: string }) => (
                    <Button
                      key={view.id}
                      htmlType="button"
                      className={activeContainerView.id === view.id ? "active" : ""}
                      onClick={() => {
                        setNodeDoubleClickDialog((current: NodeDoubleClickDialogState | null) =>
                          current && current.kind === "device" && current.nodeId === dialogNode.id
                            ? { ...current, containerViewId: view.id }
                            : current
                        );
                      }}
                    >
                      {view.label}
                    </Button>
                  ))}
                </div>
                <table className="param-table node-double-click-param-table">
                  <tbody>{renderNodeDoubleClickContainerParamRows(dialogNode, activeContainerView)}</tbody>
                </table>
              </>
            ) : (
              <table className="param-table node-double-click-param-table">
                <tbody>{renderNodeDoubleClickDeviceParamRows(dialogNode)}</tbody>
              </table>
            )}
          </div>
          <div className="node-double-click-dialog-actions nodeDoubleClickDialogActions">
            <Button
              type="primary"
              onPointerDown={suppressNodeDoubleClickDialogEvent}
              onDoubleClick={suppressNodeDoubleClickDialogEvent}
              onClick={(event) => {
                suppressNodeDoubleClickDialogEvent(event);
                confirmNodeDoubleClickDialog();
              }}
            >
              确定
            </Button>
            <Button
              htmlType="button"
              onPointerDown={suppressNodeDoubleClickDialogEvent}
              onDoubleClick={suppressNodeDoubleClickDialogEvent}
              onClick={(event) => {
                suppressNodeDoubleClickDialogEvent(event);
                cancelNodeDoubleClickDialog();
              }}
            >
              取消
            </Button>
          </div>
          <div
            className="node-double-click-dialog-resize"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整双击编辑窗口大小"
            title="拖拽调整窗口大小"
            onPointerDown={startNodeDoubleClickDialogResize}
          />
        </section>
      </div>
    );
  };
}

export function createContextMenuPlacement(__appScope: CanvasInteractionScope) {
  return (menu: ContextMenuState | ProjectMenuState) => {
  const { CONTEXT_MENU_FALLBACK_HEIGHT, CONTEXT_MENU_FALLBACK_WIDTH, CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT, CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH, CONTEXT_MENU_VIEWPORT_PADDING, clampNumber, contextMenuSize } = __appScope;
    const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;
    const maxWidth = Math.max(128, viewportWidth - CONTEXT_MENU_VIEWPORT_PADDING * 2);
    const maxHeight = Math.max(120, viewportHeight - CONTEXT_MENU_VIEWPORT_PADDING * 2);
    const menuWidth = Math.min(contextMenuSize?.width ?? CONTEXT_MENU_FALLBACK_WIDTH, maxWidth);
    const menuHeight = Math.min(contextMenuSize?.height ?? CONTEXT_MENU_FALLBACK_HEIGHT, maxHeight);
    const left = clampNumber(
      menu?.x ?? CONTEXT_MENU_VIEWPORT_PADDING,
      CONTEXT_MENU_VIEWPORT_PADDING,
      Math.max(CONTEXT_MENU_VIEWPORT_PADDING, viewportWidth - menuWidth - CONTEXT_MENU_VIEWPORT_PADDING)
    );
    const top = clampNumber(
      menu?.y ?? CONTEXT_MENU_VIEWPORT_PADDING,
      CONTEXT_MENU_VIEWPORT_PADDING,
      Math.max(CONTEXT_MENU_VIEWPORT_PADDING, viewportHeight - menuHeight - CONTEXT_MENU_VIEWPORT_PADDING)
    );
    const submenuOpensLeft =
      left + menuWidth + CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH + CONTEXT_MENU_VIEWPORT_PADDING > viewportWidth;
    const submenuOpensUp =
      top + menuHeight + CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT + CONTEXT_MENU_VIEWPORT_PADDING > viewportHeight;
    return { left, top, maxWidth, maxHeight, submenuOpensLeft, submenuOpensUp };
  };
}

export function createContextMenuStyle(__appScope: CanvasInteractionScope) {
  return (menu: ContextMenuState | ProjectMenuState): CSSProperties => {
  const { contextMenuPlacement, contextMenuSize } = __appScope;
    const placement = contextMenuPlacement(menu);
    return {
      left: placement.left,
      top: placement.top,
      maxWidth: placement.maxWidth,
      maxHeight: placement.maxHeight,
      overflowY: contextMenuSize && contextMenuSize.height > placement.maxHeight ? "auto" : "visible"
    };
  };
}

export function createContextMenuClassName(__appScope: CanvasInteractionScope) {
  return (menu: ContextMenuState | ProjectMenuState) => {
  const { contextMenuPlacement } = __appScope;
    const placement = contextMenuPlacement(menu);
    return [
      "context-menu",
      placement.submenuOpensLeft ? "context-menu--submenu-left" : "",
      placement.submenuOpensUp ? "context-menu--submenu-up" : ""
    ].filter(Boolean).join(" ");
  };
}

export function createStopSidePanelEventPropagation(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  };
}

export function createSetSidePanelMode(__appScope: CanvasInteractionScope) {
  return (side: SidePanelSide, mode: SidePanelMode) => {
  const { setLeftPanelAutoVisible, setLeftPanelMode, setRightPanelAutoVisible, setRightPanelMode, tourBlockedSidePanelMode } = __appScope;
    // 新手引导锚定该侧边栏时禁止最小化 / 隐藏：由工厂统一收口，
    // 这样模式按钮、边缘触发器、快捷键等所有入口都被同一道闸挡住。
    if (mode !== "pinned" && typeof tourBlockedSidePanelMode === "function" && tourBlockedSidePanelMode(side)) {
      return;
    }
    if (side === "left") {
      setLeftPanelMode(mode);
      setLeftPanelAutoVisible(mode === "auto");
    } else {
      setRightPanelMode(mode);
      setRightPanelAutoVisible(mode === "auto");
    }
  };
}

export function createPointerClientTargetInside(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement>, selector: string) => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    return target instanceof Element && Boolean(target.closest(selector));
  };
}

export function createPointerInsideElementRect(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement>, element: HTMLElement | null, padding = 0) => {
    if (!element) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return (
      event.clientX >= rect.left - padding &&
      event.clientX <= rect.right + padding &&
      event.clientY >= rect.top - padding &&
      event.clientY <= rect.bottom + padding
    );
  };
}

export function createUpdateAutoPanelVisibility(__appScope: CanvasInteractionScope) {
  return (side: SidePanelSide, event: SidePanelAutoEvent) => {
  const { leftPanelMode, nextSidePanelAutoVisible, projectMenu, projectRecordDragActiveRef, rightPanelMode, schemeRecordDragActiveRef, setLeftPanelAutoVisible, setRightPanelAutoVisible, sidePanelResize, templateMenu, topologyWarningPanelDrag, topologyWarningPanelResize, tourBlockedSidePanelMode } = __appScope;
    if (sidePanelResize || topologyWarningPanelDrag || topologyWarningPanelResize) {
      return;
    }
    // 引导锚定该侧边栏时，鼠标移开 / 画布激活不得把它收起（「禁止最小化」的另一半）。
    if (typeof tourBlockedSidePanelMode === "function" && tourBlockedSidePanelMode(side)) {
      return;
    }
    if (side === "left" && event === "panel-leave" && projectMenu) {
      return;
    }
    if (side === "left" && event === "panel-leave" && templateMenu) {
      return;
    }
    if (side === "left" && event === "panel-leave" && projectRecordDragActiveRef.current) {
      return;
    }
    if (side === "left" && event === "panel-leave" && schemeRecordDragActiveRef.current) {
      return;
    }
    if (side === "left") {
      setLeftPanelAutoVisible((current: boolean) => nextSidePanelAutoVisible("left", leftPanelMode, current, event));
    } else {
      setRightPanelAutoVisible((current: boolean) => nextSidePanelAutoVisible("right", rightPanelMode, current, event));
    }
  };
}

export function createActivateInspectorFromCanvas(__appScope: CanvasInteractionScope) {
  return () => {
  const { rightPanelMode, updateAutoPanelVisibility } = __appScope;
    if (rightPanelMode !== "auto") {
      return;
    }
    updateAutoPanelVisibility("right", "canvas-activate");
  };
}

export function createOpenMeasurementEditorForNode(__appScope: CanvasInteractionScope) {
  return (node: ModelNode) => {
  const { cloneMeasurementGroupForDraft, isStaticNode, measurementGroupsForNode, projectMeasurements, selectCanvasGraphics, setMeasurementEditorDialog } = __appScope;
    if (isStaticNode(node)) {
      return;
    }
    const groups = measurementGroupsForNode(projectMeasurements, node.id);
    if (groups.length === 0) {
      showGlobalMessage("当前设备还没有添加显示量测。");
      return;
    }
    const drafts = groups.map((group: MeasurementGroup) => cloneMeasurementGroupForDraft(group));
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setMeasurementEditorDialog({
      nodeId: node.id,
      drafts
    });
  };
}

export function createHandleSidePanelPointerLeave(__appScope: CanvasInteractionScope) {
  return (side: SidePanelSide, event: ReactPointerEvent<HTMLElement>) => {
  const { isPointerInsideSidePanelViewportEdgeBridge, pointerInsideElementRect, updateAutoPanelVisibility } = __appScope;
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    if (pointerInsideElementRect(event, event.currentTarget, 1)) {
      return;
    }
    if (isPointerInsideSidePanelViewportEdgeBridge(
      side,
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      window.innerWidth
    )) {
      return;
    }
    updateAutoPanelVisibility(side, "panel-leave");
  };
}

export function createHideAutoPanelsFromWorkspace(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement>) => {
  const { leftPanelMode, pointerClientTargetInside, pointerInsideFloatingPanelBounds, pointerRelatedTargetInside, projectMenu, projectRecordDragActiveRef, rightPanelMode, schemeRecordDragActiveRef, setLeftPanelAutoVisible, setRightPanelAutoVisible, shouldIgnoreWorkspaceAutoHide, sidePanelResize, templateMenu, topologyWarningPanelDrag, topologyWarningPanelResize, tourBlockedSidePanelMode } = __appScope;
    if (sidePanelResize || topologyWarningPanelDrag || topologyWarningPanelResize) {
      return;
    }
    if (shouldIgnoreWorkspaceAutoHide(
      pointerRelatedTargetInside(event, ".floating-side-panel, .side-panel-edge-trigger"),
      pointerClientTargetInside(event, ".floating-side-panel, .side-panel-edge-trigger"),
      pointerInsideFloatingPanelBounds(event)
    )) {
      return;
    }
    if (projectRecordDragActiveRef.current) {
      return;
    }
    if (schemeRecordDragActiveRef.current) {
      return;
    }
    if (projectMenu) {
      return;
    }
    if (templateMenu) {
      return;
    }
    if (typeof tourBlockedSidePanelMode === "function") {
      if (tourBlockedSidePanelMode("left") && tourBlockedSidePanelMode("right")) {
        return;
      }
      if (tourBlockedSidePanelMode("left")) {
        if (rightPanelMode === "auto") {
          setRightPanelAutoVisible(false);
        }
        return;
      }
      if (tourBlockedSidePanelMode("right")) {
        if (leftPanelMode === "auto") {
          setLeftPanelAutoVisible(false);
        }
        return;
      }
    }
    if (leftPanelMode === "auto") {
      setLeftPanelAutoVisible(false);
    }
    if (rightPanelMode === "auto") {
      setRightPanelAutoVisible(false);
    }
  };
}

export function createAppendDistinctStaticDrawingPoint(__appScope: CanvasInteractionScope) {
  return (points: Point[], point: Point) => {
  const { sameOptionalPoint } = __appScope;
    const previous = points.at(-1);
    return previous && sameOptionalPoint(previous, point) ? points : [...points, point];
  };
}

export function createRenderStaticBoxDrawingPreview(__appScope: CanvasInteractionScope) {
  return () => {
  const { MemoDeviceGlyph, activeLayerId, circle, colorDisplayMode, colorPalette, themeMode, createStaticBoxNodeFromDrawing, formatSvgNumber, g, nodeGeometryTransform, rect, renderNodePreviewImageContent, resolveNodeStateVisual, staticDrawing, staticDrawingPreviewPoints } = __appScope;
    if (!staticDrawing) {
      return null;
    }
    const points = staticDrawingPreviewPoints(staticDrawing);
    if (points.length < 2) {
      return (
        <g className="static-drawing-preview">
          {staticDrawing.points.map((point: Point, index: number) => (
            <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
          ))}
        </g>
      );
    }
    const previewNode = createStaticBoxNodeFromDrawing(staticDrawing.template, points, activeLayerId);
    return (
      <g className="static-drawing-preview static-drawing-preview-box">
        <rect
          className="static-drawing-preview-rect"
          x={previewNode.position.x - previewNode.size.width / 2}
          y={previewNode.position.y - previewNode.size.height / 2}
          width={previewNode.size.width}
          height={previewNode.size.height}
        />
        <g transform={`translate(${formatSvgNumber(previewNode.position.x)} ${formatSvgNumber(previewNode.position.y)})`}>
          <g className="node-geometry" transform={nodeGeometryTransform(previewNode)}>
            <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(previewNode)} />
            <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(previewNode)} />
          </g>
          {renderNodePreviewImageContent(previewNode, `static-drawing-preview-clip-${staticDrawing.kind.replace(/[^A-Za-z0-9_-]/g, "-")}`)}
        </g>
        {staticDrawing.points.map((point: Point, index: number) => (
          <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
        ))}
      </g>
    );
  };
}

export function createStartInteractiveStaticDrawing(__appScope: CanvasInteractionScope) {
  return (template: DeviceTemplate, startPoint: Point) => {
  const { activateInspectorFromCanvas, clampPointToCanvas, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setMode, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, writeOperationLog } = __appScope;
    const pointer = clampPointToCanvas(startPoint);
    setMode("static-draw");
    setStaticDrawing({
      kind: template.kind,
      template,
      points: [pointer],
      previewPoint: pointer
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    activateInspectorFromCanvas();
    writeOperationLog(`开始绘制图元：${template.label}`);
  };
}

export function createCancelInteractiveStaticDrawing(__appScope: CanvasInteractionScope) {
  return () => {
  const { setMode, setStaticDrawing, staticDrawing, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
    updateSmartAlignmentGuides([]);
    if (!staticDrawing) {
      return;
    }
    setStaticDrawing(null);
    setMode("select");
    writeOperationLog("取消绘制图元");
  };
}

export function createFinishInteractiveStaticDrawing(__appScope: CanvasInteractionScope) {
  return (finalPoint?: Point) => {
  const { activateInspectorFromCanvas, activeLayerId, appendDistinctStaticDrawingPoint, clampPointToCanvas, createInteractiveStaticDrawingNode, createStaticBoxNodeFromDrawing, edges, isStaticBoxLikeTemplate, nodes, pushRecentGlyph, pushUndoSnapshot, setCanvasSelectionScope, setGraphArrays, setMode, setRecentGlyphKinds, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, staticDrawing, staticDrawingPreviewPoints, updateSmartAlignmentGuides, writeOperationLog } = __appScope;
    if (!staticDrawing) {
      return;
    }
    const points = finalPoint
      ? appendDistinctStaticDrawingPoint(staticDrawing.points, clampPointToCanvas(finalPoint))
      : staticDrawingPreviewPoints(staticDrawing);
    if (points.length < 2) {
      writeOperationLog("绘制图元至少需要两个落点");
      return;
    }
    const node = isStaticBoxLikeTemplate(staticDrawing.template)
      ? createStaticBoxNodeFromDrawing(staticDrawing.template, points, activeLayerId)
      : createInteractiveStaticDrawingNode(staticDrawing.template, points, activeLayerId);
    pushUndoSnapshot(true, false, undefined, "绘制图元", node.name);
    setGraphArrays([...nodes, node], edges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setStaticDrawing(null);
    updateSmartAlignmentGuides([]);
    activateInspectorFromCanvas();
    writeOperationLog(`新增图元：${node.name}`);
    setRecentGlyphKinds?.((prev: string[]) => pushRecentGlyph(prev, staticDrawing.template.kind));
    setMode("select");
  };
}

export function createResolveStaticDrawingSmartAlignmentPoint(__appScope: CanvasInteractionScope) {
  const computeSmartAlignmentGeometrySnap = createComputeSmartAlignmentGeometrySnap(__appScope);
  return (point: Point) => {
  const { clampPointToCanvas, emptySmartAlignmentAnchorMap, updateSmartAlignmentGuides } = __appScope;
    const clampedPoint = clampPointToCanvas(point);
    const draggedBounds: RenderViewportBounds = {
      left: clampedPoint.x,
      right: clampedPoint.x,
      top: clampedPoint.y,
      bottom: clampedPoint.y
    };
    const smartSnap = computeSmartAlignmentGeometrySnap(draggedBounds, emptySmartAlignmentAnchorMap());
    const snappedPoint = clampPointToCanvas({
      x: clampedPoint.x + smartSnap.adjustment.x,
      y: clampedPoint.y + smartSnap.adjustment.y
    });
    updateSmartAlignmentGuides(smartSnap.guides);
    return snappedPoint;
  };
}

export function createAppendStaticDrawingPoint(__appScope: CanvasInteractionScope) {
  const resolveStaticDrawingSmartAlignmentPoint = createResolveStaticDrawingSmartAlignmentPoint(__appScope);
  return (point: Point, forceFinish = false) => {
  const { appendDistinctStaticDrawingPoint, finishInteractiveStaticDrawing, interactiveStaticDrawingNeedsExplicitFinish, setStaticDrawing, staticDrawing } = __appScope;
    if (!staticDrawing) {
      return;
    }
    const nextPoint = resolveStaticDrawingSmartAlignmentPoint(point);
    const nextPoints = appendDistinctStaticDrawingPoint(staticDrawing.points, nextPoint);
    if (forceFinish || (!interactiveStaticDrawingNeedsExplicitFinish(staticDrawing.kind) && nextPoints.length >= 2)) {
      finishInteractiveStaticDrawing(nextPoint);
      return;
    }
    setStaticDrawing({
      ...staticDrawing,
      points: nextPoints,
      previewPoint: nextPoint
    });
  };
}

export function createUpdateInteractiveStaticDrawingPreview(__appScope: CanvasInteractionScope) {
  const resolveStaticDrawingSmartAlignmentPoint = createResolveStaticDrawingSmartAlignmentPoint(__appScope);
  return (point: Point) => {
  const { sameOptionalPoint, setStaticDrawing } = __appScope;
    const previewPoint = resolveStaticDrawingSmartAlignmentPoint(point);
    setStaticDrawing((current: unknown) => {
      if (!current || sameOptionalPoint((current as { previewPoint?: Point }).previewPoint, previewPoint)) {
        return current;
      }
      return { ...current, previewPoint };
    });
  };
}

export function createRenderInteractiveStaticDrawingPreview(__appScope: CanvasInteractionScope) {
  return () => {
  const { circle, g, isStaticBoxLikeTemplate, path, renderStaticBoxDrawingPreview, staticDrawing, staticDrawingPathData, staticDrawingPreviewPoints } = __appScope;
    if (!staticDrawing) {
      return null;
    }
    if (isStaticBoxLikeTemplate(staticDrawing.template)) {
      return renderStaticBoxDrawingPreview();
    }
    const points = staticDrawingPreviewPoints(staticDrawing);
    return (
      <g className="static-drawing-preview">
        {points.length >= 2 && <path d={staticDrawingPathData(staticDrawing.kind, points)} className="static-drawing-preview-line" />}
        {staticDrawing.points.map((point: Point, index: number) => (
          <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
        ))}
      </g>
    );
  };
}

export function createStartLibraryDevicePlacement(__appScope: CanvasInteractionScope) {
  return (template: DeviceTemplate) => {
  const { componentLibraryDisplayMode, hideLibraryFlyout, isRoutableLineDeviceKind, modelType, resetConnectPreviewState, resetRoutableLinePreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setLibraryPlacement, setMode, setRewiring, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, writeOperationLog } = __appScope;
    const modelTypeFailureMessage = modelAssociationDeviceModelTypeFailureMessage(modelType, template.kind);
    if (modelTypeFailureMessage) {
      showGlobalMessage(modelTypeFailureMessage);
      writeOperationLog(`拒绝放置图元：${modelTypeFailureMessage}`);
      return;
    }
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    if (isRoutableLineDeviceKind(template.kind)) {
      setRoutableLinePlacement({ template, source: null });
      resetRoutableLinePreviewState();
      setLibraryPlacement(null);
      setStaticDrawing(null);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setContextMenu(null);
      setMode("connect");
      if (componentLibraryDisplayMode === "right") {
        hideLibraryFlyout();
      }
      writeOperationLog(`进入线路绘制模式：${template.label}`);
      return;
    }
    setLibraryPlacement({ kind: "device", template, previewPoint: null });
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setStaticDrawing(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMode("select");
    if (componentLibraryDisplayMode === "right") {
      hideLibraryFlyout();
    }
    writeOperationLog(`进入图元绘制模式：${template.label}`);
  };
}

export function createStartLibraryGraphTemplatePlacement(__appScope: CanvasInteractionScope) {
  return (template: GraphTemplate) => {
  const { resetConnectPreviewState, resetRoutableLinePreviewState, setConnectSource, setContextMenu, setLibraryPlacement, setMode, setRewiring, setRoutableLinePlacement, setStaticDrawing, writeOperationLog } = __appScope;
    setLibraryPlacement({ kind: "graph-template", template, previewPoint: null });
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setStaticDrawing(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMode("select");
    writeOperationLog(`进入模板绘制模式：${template.typeName} / ${template.name}`);
  };
}

export function createResolveLibraryPlacementSmartAlignmentPoint(__appScope: CanvasInteractionScope) {
  const computeSmartAlignmentGeometrySnap = createComputeSmartAlignmentGeometrySnap(__appScope);
  return (placement: LibraryPlacementState, point: Point) => {
  const { clampPointToCanvas, createNodeFromTemplate, emptySmartAlignmentAnchorMap, isInteractiveStaticDrawingKind, isStaticBoxLikeTemplate, nodeHasUprightBoundsContent, nodeSmartAlignmentBounds, nodeTerminalOutflowSmartAlignmentAnchors, updateSmartAlignmentGuides } = __appScope;
    const clampedPoint = clampPointToCanvas(point);
    const alignPlacementAsPoint =
      placement.kind !== "device" ||
      isInteractiveStaticDrawingKind(placement.template.kind) ||
      isStaticBoxLikeTemplate(placement.template);
    let draggedBounds: RenderViewportBounds;
    let draggedAnchors: SmartAlignmentAnchorMap;
    if (alignPlacementAsPoint) {
      draggedBounds = {
        left: clampedPoint.x,
        right: clampedPoint.x,
        top: clampedPoint.y,
        bottom: clampedPoint.y
      };
      draggedAnchors = emptySmartAlignmentAnchorMap();
    }
    else {
      const previewNode = createNodeFromTemplate(placement.template, clampedPoint);
      draggedBounds = nodeSmartAlignmentBounds(previewNode, clampedPoint, nodeHasUprightBoundsContent(previewNode));
      draggedAnchors = nodeTerminalOutflowSmartAlignmentAnchors(previewNode, clampedPoint);
    }
    const smartSnap = computeSmartAlignmentGeometrySnap(draggedBounds, draggedAnchors);
    const snappedPoint = clampPointToCanvas({
      x: clampedPoint.x + smartSnap.adjustment.x,
      y: clampedPoint.y + smartSnap.adjustment.y
    });
    updateSmartAlignmentGuides(smartSnap.guides);
    return snappedPoint;
  };
}

export function createCancelLibraryPlacement(__appScope: CanvasInteractionScope) {
  return () => {
  const { resetRoutableLinePreviewState, setContextMenu, setLibraryPlacement, setMode, setRoutableLinePlacement, updateSmartAlignmentGuides } = __appScope;
    updateSmartAlignmentGuides([]);
    setLibraryPlacement(null);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    setContextMenu(null);
  };
}

export function createUpdateLibraryPlacementPreview(__appScope: CanvasInteractionScope) {
  const resolveLibraryPlacementSmartAlignmentPoint = createResolveLibraryPlacementSmartAlignmentPoint(__appScope);
  return (point: Point) => {
  const { libraryPlacement, sameOptionalPoint, setLibraryPlacement, updateSmartAlignmentGuides } = __appScope;
    if (!libraryPlacement) {
      updateSmartAlignmentGuides([]);
      return;
    }
    const previewPoint = resolveLibraryPlacementSmartAlignmentPoint(libraryPlacement, point);
    setLibraryPlacement((current: LibraryPlacementState | null) => {
      if (!current || (current.previewPoint && sameOptionalPoint(current.previewPoint, previewPoint))) {
        return current;
      }
      return { ...current, previewPoint };
    });
  };
}

export function createClearLibraryPlacementPreview(__appScope: CanvasInteractionScope) {
  return () => {
  const { setLibraryPlacement, updateSmartAlignmentGuides } = __appScope;
    updateSmartAlignmentGuides([]);
    setLibraryPlacement((current: LibraryPlacementState | null) => current?.previewPoint ? { ...current, previewPoint: null } : current);
  };
}

export function createPlaceLibraryDeviceAtPoint(__appScope: CanvasInteractionScope) {
  return (template: DeviceTemplate, pointerPosition: Point) => {
  const { CANVAS_AUTO_EXPAND_PADDING, activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, clampNodePositionToBounds, clampPointToBounds, createNodeFromTemplate, deviceIndexCounters, edges, hasCanvasOriginShift, isInteractiveStaticDrawingKind, isRoutableLineDeviceKind, isStaticBoxLikeTemplate, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, modelType, nodes, pushRecentGlyph, pushUndoSnapshot, rebuildRoutableLineDeviceRouteUpdates, rejectAutoCanvasExpansionForContent, routeRoutableLineDevice, setCanvasSelectionScope, setDeviceIndexCounters, setGraphArrays, setLibraryPlacement, setMode, setRecentGlyphKinds, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, startInteractiveStaticDrawing, startLibraryDevicePlacement, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = __appScope;
    const modelTypeFailureMessage = modelAssociationDeviceModelTypeFailureMessage(modelType, template.kind);
    if (modelTypeFailureMessage) {
      showGlobalMessage(modelTypeFailureMessage);
      writeOperationLog(`拒绝放置图元：${modelTypeFailureMessage}`);
      return;
    }
    const kind = template.kind;
    if (isRoutableLineDeviceKind(kind)) {
      startLibraryDevicePlacement(template);
      return;
    }
    if (isInteractiveStaticDrawingKind(kind) || isStaticBoxLikeTemplate(template)) {
      startInteractiveStaticDrawing(template, pointerPosition);
      return;
    }
    const position = { x: pointerPosition.x, y: pointerPosition.y };
    const createdNode = { ...createNodeFromTemplate(template, position), layerId: activeLayerId };
    const rawNode = isRoutableLineDeviceKind(createdNode.kind)
      ? routeRoutableLineDevice(createdNode, [...nodes, createdNode], canvasBounds)
      : createdNode;
    if (rejectAutoCanvasExpansionForContent([...nodes, rawNode], edges)) {
      setLibraryPlacement(null);
      setMode("select");
      return;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, rawNode], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node: ModelNode) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge: Edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const node = translateNodeBy(rawNode, dropOriginShift);
    const shiftedPointerPosition = translatePointBy(pointerPosition, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, node],
      dropSourceEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges);
    }
    const placedNode = { ...node, position: clampNodePositionToBounds(node, dropCanvasBounds, shiftedPointerPosition) };
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    const indexed = assignPermanentDeviceIndex(placedNode, deviceIndexCounters);
    const placedNodes = [...dropSourceNodes, indexed.node];
    const existingRoutableLineNodeIds = dropSourceNodes
      .filter((candidate: ModelNode) => isRoutableLineDeviceKind(candidate.kind))
      .map((candidate: ModelNode) => candidate.id);
    const repairedLineNodes = existingRoutableLineNodeIds.length > 0
      ? rebuildRoutableLineDeviceRouteUpdates(
          placedNodes,
          existingRoutableLineNodeIds,
          dropCanvasBounds,
          dropSourceNodes,
          { movedNodeIds: [indexed.node.id] }
        )
      : [];
    const repairedLineNodeById = new Map(repairedLineNodes.map((candidate: ModelNode) => [candidate.id, candidate]));
    const nextNodes = repairedLineNodes.length > 0
      ? placedNodes.map((candidate) => repairedLineNodeById.get(candidate.id) ?? candidate)
      : placedNodes;
    // 归属落地:落点在容器矩形内的图元并入该容器(与程序化加图元/粘贴同一出口);只判新放置的这一个,
    // 线路重画结果不参与本次判定(线路可入组,但入组应由用户操作决定;挤出侧对线路另有豁免,不推出框外)
    const committedNodes = commitContainerMembership(nextNodes, [indexed.node.id]);
    pushUndoSnapshot(true, false, undefined, "放置图元", indexed.node.name);
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays(committedNodes, dropSourceEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([indexed.node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    activateInspectorFromCanvas();
    writeOperationLog(`新增图元：${indexed.node.name}`);
    setRecentGlyphKinds?.((prev: string[]) => pushRecentGlyph(prev, kind));
    __appScope.lastPlacedNodeIdRef && (__appScope.lastPlacedNodeIdRef.current = indexed.node.id);
  };
}

export function createCommitLibraryPlacementAtPoint(__appScope: CanvasInteractionScope) {
  const resolveLibraryPlacementSmartAlignmentPoint = createResolveLibraryPlacementSmartAlignmentPoint(__appScope);
  return (point: Point) => {
  const { dropGraphTemplate, libraryPlacement, placeLibraryDeviceAtPoint, setLibraryPlacement, updateSmartAlignmentGuides } = __appScope;
    if (!libraryPlacement) {
      return;
    }
    const placement = libraryPlacement;
    const placementPoint = resolveLibraryPlacementSmartAlignmentPoint(placement, point);
    setLibraryPlacement(null);
    updateSmartAlignmentGuides([]);
    if (placement.kind === "graph-template") {
      dropGraphTemplate(placement.template, placementPoint);
      return;
    }
    placeLibraryDeviceAtPoint(placement.template, placementPoint);
  };
}

export function createRenderLibraryPlacementPreview(__appScope: CanvasInteractionScope) {
  return () => {
  const { MemoDeviceGlyph, activeLayerId, canvasClipboardBounds, colorDisplayMode, colorPalette, themeMode, createNodeFromTemplate, formatSvgNumber, g, libraryPlacement, nodeGeometryTransform, path, pointsToPreviewPath, renderNodePreviewImageContent, resolveNodeStateVisual } = __appScope;
    if (!libraryPlacement?.previewPoint) {
      return null;
    }
    const previewPoint = libraryPlacement.previewPoint;
    if (libraryPlacement.kind === "device") {
      const previewNode = { ...createNodeFromTemplate(libraryPlacement.template, previewPoint), layerId: activeLayerId };
      return (
        <g className="library-placement-preview library-placement-preview-device">
          <g transform={`translate(${formatSvgNumber(previewNode.position.x)} ${formatSvgNumber(previewNode.position.y)})`}>
            <g transform={nodeGeometryTransform(previewNode)}>
              <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(previewNode)} />
              <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(previewNode)} />
            </g>
            {renderNodePreviewImageContent(previewNode, `library-placement-preview-clip-${libraryPlacement.template.kind.replace(/[^A-Za-z0-9_-]/g, "-")}`)}
          </g>
        </g>
      );
    }
    const bounds = canvasClipboardBounds(libraryPlacement.template.clipboard);
    if (!bounds) {
      return null;
    }
    const targetTopLeft = {
      x: previewPoint.x - libraryPlacement.template.sourceSize.width / 2,
      y: previewPoint.y - libraryPlacement.template.sourceSize.height / 2
    };
    const offset = { x: targetTopLeft.x - bounds.left, y: targetTopLeft.y - bounds.top };
    return (
      <g className="library-placement-preview library-placement-preview-template" transform={`translate(${formatSvgNumber(offset.x)} ${formatSvgNumber(offset.y)})`}>
        {libraryPlacement.template.clipboard.edges.map((item: CanvasClipboardEdge) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            className="library-placement-preview-line"
          />
        ))}
        {libraryPlacement.template.clipboard.nodes.map((node: ModelNode) => (
          <g key={node.id} transform={`translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})`}>
            <g transform={nodeGeometryTransform(node)}>
              <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(node)} />
              <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} themeMode={themeMode} stateVisual={resolveNodeStateVisual(node)} />
            </g>
            {renderNodePreviewImageContent(node, `library-placement-template-preview-clip-${node.id}`)}
          </g>
        ))}
      </g>
    );
  };
}

export function createStartSidePanelResize(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLDivElement>, side: SidePanelSide) => {
  const { leftPanelWidth, rightPanelWidth, setSidePanelResize } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    setSidePanelResize({
      side,
      startX: event.clientX,
      startWidth: side === "left" ? leftPanelWidth : rightPanelWidth
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartCanvasResize(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<Element>, edge: CanvasResizeEdge) => {
  const { canvasBoundsRef, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasHorizontalScrollbarsActive, canvasResizeUndoCapturedRef, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasVerticalScrollbarsActive, clearCanvasBoundsScrollSyncPending, minimumCanvasBoundsForResizeEdge, pendingCanvasResizeCommitAnchorRef, setCanvasResizeDrag, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!svgRef.current) {
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    const currentCanvasBounds = canvasBoundsRef.current;
    canvasResizeUndoCapturedRef.current = false;
    clearCanvasBoundsScrollSyncPending();
    pendingCanvasResizeCommitAnchorRef.current = null;
    setCanvasResizeDrag({
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: currentCanvasBounds.width,
      startHeight: currentCanvasBounds.height,
      startDisplayWidth: canvasDisplayWidth,
      startDisplayHeight: canvasDisplayHeight,
      startDisplayOffsetX: canvasDisplayOffsetX,
      startDisplayOffsetY: canvasDisplayOffsetY,
      startScrollLeft: canvasFrameRef.current?.scrollLeft ?? 0,
      startScrollTop: canvasFrameRef.current?.scrollTop ?? 0,
      startScrollSurfaceWidth: canvasScrollSurfaceWidth,
      startScrollSurfaceHeight: canvasScrollSurfaceHeight,
      startHorizontalScrollbarsActive: canvasHorizontalScrollbarsActive,
      startVerticalScrollbarsActive: canvasVerticalScrollbarsActive,
      unitsPerCssX: svgRect.width > 0 ? currentCanvasBounds.width / svgRect.width : 1,
      unitsPerCssY: svgRect.height > 0 ? currentCanvasBounds.height / svgRect.height : 1,
      minBounds: minimumCanvasBoundsForResizeEdge(edge)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartCanvasResizeFromRightOverlay(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssX = canvasBounds.width / svgRect.width;
    const handleHalfWidthCss = unitsPerCssX > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssX
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const rightEdgeHotspot = Math.max(10, handleHalfWidthCss + 3);
    const insideRightEdge =
      Math.abs(event.clientX - svgRect.right) <= rightEdgeHotspot &&
      event.clientY >= svgRect.top &&
      event.clientY <= svgRect.bottom;
    if (!insideRightEdge) {
      return false;
    }
    startCanvasResize(event, "right");
    return true;
  };
}

export function createStartCanvasResizeFromLeftOverlay(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssX = canvasBounds.width / svgRect.width;
    const handleHalfWidthCss = unitsPerCssX > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssX
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const leftEdgeHotspot = Math.max(10, handleHalfWidthCss + 3);
    const insideLeftEdge =
      Math.abs(event.clientX - svgRect.left) <= leftEdgeHotspot &&
      event.clientY >= svgRect.top &&
      event.clientY <= svgRect.bottom;
    if (!insideLeftEdge) {
      return false;
    }
    startCanvasResize(event, "left");
    return true;
  };
}

export function createStartCanvasResizeFromBottomOverlay(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssY = canvasBounds.height / svgRect.height;
    const handleHalfHeightCss = unitsPerCssY > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssY
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const bottomEdgeHotspot = Math.max(10, handleHalfHeightCss + 3);
    const insideBottomEdge =
      Math.abs(event.clientY - svgRect.bottom) <= bottomEdgeHotspot &&
      event.clientX >= svgRect.left &&
      event.clientX <= svgRect.right;
    if (!insideBottomEdge) {
      return false;
    }
    startCanvasResize(event, "bottom");
    return true;
  };
}

export function createStartCanvasResizeFromTopOverlay(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<Element>) => {
  const { CANVAS_RESIZE_HANDLE_SIZE, canvasBounds, startCanvasResize, svgRef } = __appScope;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssY = canvasBounds.height / svgRect.height;
    const handleHalfHeightCss = unitsPerCssY > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssY
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const topEdgeHotspot = Math.max(10, handleHalfHeightCss + 3);
    const insideTopEdge =
      Math.abs(event.clientY - svgRect.top) <= topEdgeHotspot &&
      event.clientX >= svgRect.left &&
      event.clientX <= svgRect.right;
    if (!insideTopEdge) {
      return false;
    }
    startCanvasResize(event, "top");
    return true;
  };
}

export function createStartStatusbarResize(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLDivElement>) => {
  const { setStatusbarResize, statusbarHeight } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    setStatusbarResize({
      startY: event.clientY,
      startHeight: statusbarHeight
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createCurrentTopologyWarningPanelRect(__appScope: CanvasInteractionScope) {
  return () => {
  const { CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_WIDTH, TOPOLOGY_WARNING_PANEL_MARGIN, rightPanelVisible, rightPanelWidth, statusbarHeight, topologyWarningPanelHeight, topologyWarningPanelRef, topologyWarningPanelWidth } = __appScope;
    const rect = topologyWarningPanelRef.current?.getBoundingClientRect();
    return rect
      ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        }
      : {
          left: Math.max(
            TOPOLOGY_WARNING_PANEL_MARGIN,
            window.innerWidth -
              (rightPanelVisible ? rightPanelWidth + 28 : 16) -
              CANVAS_MINIMAP_WIDTH -
              TOPOLOGY_WARNING_PANEL_MARGIN -
              topologyWarningPanelWidth
          ),
          top: Math.max(
            TOPOLOGY_WARNING_PANEL_MARGIN,
            window.innerHeight - statusbarHeight - 14 - CANVAS_MINIMAP_HEIGHT
          ),
          width: topologyWarningPanelWidth,
          height: topologyWarningPanelHeight
        };
  };
}

export function createStartTopologyWarningPanelDrag(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLElement>) => {
  const { currentTopologyWarningPanelRect, setTopologyWarningPanelDrag, setTopologyWarningPanelPosition } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const rect = currentTopologyWarningPanelRect();
    setTopologyWarningPanelPosition({ left: rect.left, top: rect.top });
    setTopologyWarningPanelDrag({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartTopologyWarningPanelResize(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<HTMLDivElement>) => {
  const { currentTopologyWarningPanelRect, setTopologyWarningPanelPosition, setTopologyWarningPanelResize } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    const rect = currentTopologyWarningPanelRect();
    setTopologyWarningPanelPosition({ left: rect.left, top: rect.top });
    setTopologyWarningPanelResize({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createRenderSidePanelModeControls(__appScope: CanvasInteractionScope) {
  return (side: SidePanelSide) => {
  const { EyeOff, MousePointer2, Pin, button, div, leftPanelMode, rightPanelMode, setSidePanelMode, tourBlockedSidePanelMode } = __appScope;
    const mode = side === "left" ? leftPanelMode : rightPanelMode;
    const label = side === "left" ? "左侧栏" : "右侧栏";
    // 引导期间该侧边栏被锁定为展开：三个模式按钮一并禁用，避免点了没反应。
    const tourLocked = typeof tourBlockedSidePanelMode === "function" && Boolean(tourBlockedSidePanelMode(side));
    const options: Array<{ mode: SidePanelMode; title: string; icon: typeof Pin }> = [
      { mode: "pinned", title: `${label}永久显示`, icon: Pin },
      { mode: "auto", title: `${label}自动显示/隐藏`, icon: MousePointer2 },
      { mode: "hidden", title: `${label}永久隐藏`, icon: EyeOff }
    ];
    return (
      <div
        className="side-panel-mode-controls"
        role="group"
        aria-label={`${label}显示模式`}
        data-tour-locked={tourLocked ? "true" : undefined}
      >
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Button
              htmlType="button"
              key={option.mode}
              className={mode === option.mode ? "active" : ""}
              title={tourLocked ? `新手引导进行中，${label}暂时保持展开` : option.title}
              aria-label={option.title}
              disabled={tourLocked}
              onClick={() => setSidePanelMode(side, option.mode)}
            >
              <Icon size={15} />
            </Button>
          );
        })}
      </div>
    );
  };
}

export function createRenderSidePanelEdgeTrigger(__appScope: CanvasInteractionScope) {
  return (side: SidePanelSide) => {
  const { PanelLeftOpen, PanelRightOpen, button, div, leftPanelMode, leftPanelVisible, rightPanelMode, rightPanelVisible, setSidePanelMode, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, tourBlockedSidePanelMode, updateAutoPanelVisibility } = __appScope;
    const mode = side === "left" ? leftPanelMode : rightPanelMode;
    const visible = side === "left" ? leftPanelVisible : rightPanelVisible;
    if (visible) {
      return null;
    }
    // 引导强制展开该侧边栏时，边缘触发器本就该消失（visible 为 true）；
    // 这里再加一道保险：万一渲染时序错位，也别让触发器去改 mode。
    if (typeof tourBlockedSidePanelMode === "function" && tourBlockedSidePanelMode(side)) {
      return null;
    }
    const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
    const label = side === "left" ? "显示左侧栏" : "显示右侧栏";
    return (
      <div
        className={`side-panel-edge-trigger ${side} mode-${mode}`}
        onPointerEnter={() => updateAutoPanelVisibility(side, "edge-enter")}
      >
        <Button
          htmlType="button"
          title={mode === "hidden" ? `${label}并切换为永久显示` : label}
          aria-label={label}
          onPointerEnter={() => updateAutoPanelVisibility(side, "edge-enter")}
          onPointerDown={(event) => {
            if (side === "left" && startCanvasResizeFromLeftOverlay(event)) {
              return;
            }
            if (side === "right" && startCanvasResizeFromRightOverlay(event)) {
              return;
            }
          }}
          onClick={() => {
            if (mode === "hidden") {
              setSidePanelMode(side, "pinned");
            } else {
              updateAutoPanelVisibility(side, "edge-enter");
            }
          }}
        >
          <Icon size={17} />
        </Button>
      </div>
    );
  };
}

export function createNormalizeStaticBoxDimension(__appScope: CanvasInteractionScope) {
  return (value: number, fallback: number, max: number) => {
  const { clampNumber } = __appScope;
    const nextValue = Number.isFinite(value) ? value : fallback;
    return Math.round(clampNumber(nextValue, 4, max) * 10) / 10;
  };
}

export function createToLocalNodePoint(__appScope: CanvasInteractionScope) {
  return (node: ModelNode, point: Point): Point => {
    const radians = degreesToRadians(-node.rotation);
    const dx = point.x - node.position.x;
    const dy = point.y - node.position.y;
    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians)
    };
  };
}

export function createSingleTransformNodeUpdate(__appScope: CanvasInteractionScope) {
  return (drag: SingleTransformDrag, point: Point, store: GraphStore, snapRotation: boolean): ModelNode | null => {
  const { normalizeRotationDegrees, rotationDeltaBetweenTransformPoints, singleTransformBaseNode } = __appScope;
    const node = store.nodeMap.get(drag.nodeId);
    if (!node || drag.kind !== "rotate") {
      return null;
    }
    const baseNode = singleTransformBaseNode(drag, node);
    const rotationDelta = rotationDeltaBetweenTransformPoints(baseNode.position, drag.startPoint, point, snapRotation);
    return {
      ...node,
      position: baseNode.position,
      rotation: normalizeRotationDegrees(baseNode.rotation + rotationDelta),
      scale: baseNode.scale,
      scaleX: baseNode.scaleX,
      scaleY: baseNode.scaleY
    };
  };
}

export function createSignedScaleFromRotatedHandleDelta(__appScope: CanvasInteractionScope) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
  const { getNodeScaleX, getNodeScaleY, signedScale, toLocalNodePoint } = __appScope;
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const startLocal = toLocalNodePoint(baseNode, drag.startPoint);
    const currentLocal = toLocalNodePoint(baseNode, point);
    const localDelta = localScaleKind === "scale-x"
      ? currentLocal.x - startLocal.x
      : currentLocal.y - startLocal.y;
    const localDirection = localScaleKind === "scale-x"
      ? drag.handleXDirection || Math.sign(startLocal.x) || 1
      : drag.handleYDirection || Math.sign(startLocal.y) || 1;
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (localDelta * localDirection * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };
}

export function createSignedScaleFromUprightHandleDelta(__appScope: CanvasInteractionScope) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
  const { getNodeScaleX, getNodeScaleY, signedScale } = __appScope;
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const screenDelta = localScaleKind === "scale-x"
      ? (point.x - drag.startPoint.x) * (drag.handleXDirection || 1)
      : (point.y - drag.startPoint.y) * (drag.handleYDirection || 1);
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (screenDelta * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };
}

export function createProportionalSignedScaleFromHandleDelta(__appScope: CanvasInteractionScope) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode
  ) => {
  const { getNodeScaleX, getNodeScaleY, projectedProportionalScaleFromHandleDelta, signedScale, toLocalNodePoint } = __appScope;
    const currentSignedScaleX = getNodeScaleX(baseNode);
    const currentSignedScaleY = getNodeScaleY(baseNode);
    const startLocal = toLocalNodePoint(baseNode, drag.startPoint);
    const currentLocal = toLocalNodePoint(baseNode, point);
    const currentScale = Math.max(Math.abs(currentSignedScaleX), Math.abs(currentSignedScaleY));
    const nextScale = projectedProportionalScaleFromHandleDelta({
      currentScale,
      width: baseNode.size.width,
      height: baseNode.size.height,
      handleXDirection: drag.handleXDirection,
      handleYDirection: drag.handleYDirection,
      deltaX: currentLocal.x - startLocal.x,
      deltaY: currentLocal.y - startLocal.y
    });
    return {
      scale: nextScale,
      scaleX: signedScale(nextScale, currentSignedScaleX),
      scaleY: signedScale(nextScale, currentSignedScaleY)
    };
  };
}

export function createProportionalSignedScaleFromUprightHandleDelta(__appScope: CanvasInteractionScope) {
  return (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode
  ) => {
  const { getNodeScaleX, getNodeScaleY, projectedProportionalScaleFromHandleDelta, signedScale } = __appScope;
    const currentSignedScaleX = getNodeScaleX(baseNode);
    const currentSignedScaleY = getNodeScaleY(baseNode);
    const currentScale = Math.max(Math.abs(currentSignedScaleX), Math.abs(currentSignedScaleY));
    const nextScale = projectedProportionalScaleFromHandleDelta({
      currentScale,
      width: baseNode.size.width,
      height: baseNode.size.height,
      handleXDirection: drag.handleXDirection,
      handleYDirection: drag.handleYDirection,
      deltaX: point.x - drag.startPoint.x,
      deltaY: point.y - drag.startPoint.y
    });
    return {
      scale: nextScale,
      scaleX: signedScale(nextScale, currentSignedScaleX),
      scaleY: signedScale(nextScale, currentSignedScaleY)
    };
  };
}

export function createCurrentStoredRoutePointsForEdge(__appScope: CanvasInteractionScope) {
  return (edge: Edge | undefined, bounds?: CanvasBounds) => {
  const { canvasBounds, compactPreviewNodes, edgeSnapshotFallbackPoints, endpointMatchedRoutePointsForEdge, endpointMatchedStoredRoutePoints, nodeById, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routeEdgesForStoredRendering, routedEdgeById } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    if (!edge) {
      return [];
    }
    const storedRoute = endpointMatchedStoredRoutePoints(edge);
    if (storedRoute.length) {
      return storedRoute;
    }
    const cachedRoute =
      !pendingStoredRouteEdgeIdsRef.current.has(edge.id) && !pendingRouteEdgeIdsRef.current.has(edge.id)
        ? routedEdgeById.get(edge.id)
        : undefined;
    const matchedCachedRoute = endpointMatchedRoutePointsForEdge(edge, cachedRoute?.points);
    if (matchedCachedRoute.length) {
      return matchedCachedRoute;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && target) {
      const route = routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], bounds)[0];
      if (route?.points.length) {
        return route.points.map((point: Point) => ({ ...point }));
      }
    }
    return (routedEdgeById.get(edge.id)?.points ?? edgeSnapshotFallbackPoints(edge)).map((point: Point) => ({ ...point }));
  };
}

export function createBuildMirrorLayoutUnitEdgeUpdates(__appScope: CanvasInteractionScope) {
  return (
    units: CanvasLayoutUnit[],
    currentEdges: Edge[],
    axis: "horizontal" | "vertical"
  ) => {
  const { currentStoredRoutePointsForEdge, edgeById, edges, mirrorPointAcrossAxis, selectionRectCenter } = __appScope;
    const currentEdgeById = currentEdges === edges ? edgeById : new Map(currentEdges.map((edge) => [edge.id, edge]));
    const updates = new Map<string, Edge>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      const unitNodeIds = new Set(unit.nodeIds);
      for (const edgeId of unit.edgeIds) {
        if (updates.has(edgeId)) {
          continue;
        }
        const edge = currentEdgeById.get(edgeId);
        if (!edge || !unitNodeIds.has(edge.sourceId) || !unitNodeIds.has(edge.targetId)) {
          continue;
        }
        const routePoints = currentStoredRoutePointsForEdge(edge);
        if (routePoints.length < 2) {
          continue;
        }
        const points = routePoints.map((point: Point) => mirrorPointAcrossAxis(point, center, axis));
        updates.set(edge.id, {
          ...edge,
          sourcePoint: { ...points[0] },
          targetPoint: { ...points[points.length - 1] },
          manualPoints: points.slice(1, -1).map((point: Point) => ({ ...point }))
        });
      }
    }
    return Array.from(updates.values());
  };
}

export function createBuildRotateLayoutUnitEdgeUpdates(__appScope: CanvasInteractionScope) {
  return (
    units: CanvasLayoutUnit[],
    currentEdges: Edge[],
    degrees: number
  ) => {
  const { currentStoredRoutePointsForEdge, edgeById, edges, rotatePointAround, selectionRectCenter } = __appScope;
    const currentEdgeById = currentEdges === edges ? edgeById : new Map(currentEdges.map((edge) => [edge.id, edge]));
    const updates = new Map<string, Edge>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      const unitNodeIds = new Set(unit.nodeIds);
      for (const edgeId of unit.edgeIds) {
        if (updates.has(edgeId)) {
          continue;
        }
        const edge = currentEdgeById.get(edgeId);
        if (!edge || !unitNodeIds.has(edge.sourceId) || !unitNodeIds.has(edge.targetId)) {
          continue;
        }
        const routePoints = currentStoredRoutePointsForEdge(edge);
        if (routePoints.length < 2) {
          continue;
        }
        const points = routePoints.map((point: Point) => rotatePointAround(point, center, degrees));
        updates.set(edge.id, {
          ...edge,
          sourcePoint: { ...points[0] },
          targetPoint: { ...points[points.length - 1] },
          manualPoints: points.slice(1, -1).map((point: Point) => ({ ...point }))
        });
      }
    }
    return Array.from(updates.values());
  };
}

export function createBuildGroupTransformEdgeUpdates(__appScope: CanvasInteractionScope) {
  return (drag: GroupTransformDrag, point: Point, store: GraphStore, options?: { snapRotation?: boolean }) => {
  const { groupTransformGeometry, transformGroupPoint } = __appScope;
    const geometry = groupTransformGeometry(drag, point, options);
    const transformedNodeIdSet = new Set(drag.nodeIds);
    return drag.originalEdgeRoutes.flatMap((route) => {
      const edge = store.edgeMap.get(route.edgeId);
      if (!edge || !transformedNodeIdSet.has(edge.sourceId) || !transformedNodeIdSet.has(edge.targetId)) {
        return [];
      }
      const points = route.points.map((routePoint) => transformGroupPoint(drag, geometry, routePoint));
      if (points.length < 2) {
        return [];
      }
      return [{
        ...edge,
        sourcePoint: { ...points[0] },
        targetPoint: { ...points[points.length - 1] },
        manualPoints: points.slice(1, -1).map((routePoint) => ({ ...routePoint }))
      }];
    });
  };
}

export function createOverlayEdgeUpdatesForTransform(__appScope: CanvasInteractionScope) {
  return (sourceEdges: Edge[], edgeUpdates: Edge[]) => {
    if (edgeUpdates.length === 0) {
      return sourceEdges;
    }
    const edgeUpdateById = new Map(edgeUpdates.map((edge) => [edge.id, edge]));
    let changed = false;
    const nextEdges = sourceEdges.map((edge) => {
      const update = edgeUpdateById.get(edge.id);
      if (!update) {
        return edge;
      }
      changed = true;
      return update;
    });
    return changed ? nextEdges : sourceEdges;
  };
}

export function createStartGroupTransformDrag(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<SVGElement>, unit: CanvasLayoutUnit, kind: "rotate" | ScaleHandleKind) => {
  const { TRANSFORM_ROTATE_HANDLE_GAP, clampPointToCanvas, hasCanvasSelectionModifier, screenToSvgPoint, selectionRectCenter, setTransformDrag, snapshotGroupTransformEdgeRoutes, snapshotGroupTransformNodes, startModifierSelectionPress, svgRef, transformDragChangedRef } = __appScope;
    event.stopPropagation();
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "selection", nodeIds: unit.nodeIds, edgeIds: unit.edgeIds });
      return;
    }
    if (kind !== "rotate" && kind !== "scale-both") {
      return;
    }
    const center = selectionRectCenter(unit.bounds);
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...center };
    transformDragChangedRef.current = false;
    setTransformDrag({
      kind,
      groupId: unit.id.replace(/^group:/, ""),
      nodeIds: unit.nodeIds,
      bounds: unit.bounds,
      center,
      startPoint,
      rotationStartPoint: kind === "rotate" ? { x: center.x, y: unit.bounds.top - TRANSFORM_ROTATE_HANDLE_GAP } : undefined,
      originalNodes: snapshotGroupTransformNodes(unit),
      originalEdgeRoutes: snapshotGroupTransformEdgeRoutes(unit),
      proportionalScale: kind !== "rotate",
      handleXDirection: kind === "rotate" ? 0 : startPoint.x >= center.x ? 1 : -1,
      handleYDirection: kind === "rotate" ? 0 : startPoint.y >= center.y ? 1 : -1
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartSingleTransformDrag(__appScope: CanvasInteractionScope) {
  return (
    event: ReactPointerEvent<SVGElement>,
    node: ModelNode,
    kind: "rotate" | ScaleHandleKind,
    handle?: ScaleHandleConfig
  ) => {
  const { TRANSFORM_ROTATE_HANDLE_GAP, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_STEM_START, clampPointToCanvas, hasCanvasSelectionModifier, isLineSegmentBusNode, nodeForegroundImage, nodeImage, nodeKindAllowsResizeTransform, nodeRotateHandleControlPoints, nodeUprightRotateHandleControlPoints, nodeUsesUprightStaticSelectionOutline, screenToSvgPoint, setTransformDrag, snapshotSingleTransformNode, startModifierSelectionPress, svgRef, transformDragChangedRef } = __appScope;
    event.stopPropagation();
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const lineSegmentBusResize = isLineSegmentBusNode(node);
    if (kind !== "rotate" && kind !== "scale-both" && !lineSegmentBusResize && !nodeKindAllowsResizeTransform(node.kind)) {
      return;
    }
    transformDragChangedRef.current = false;
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...node.position };
    const uprightStaticSelection = nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node));
    const rotateHandleStart = (
      uprightStaticSelection
        ? nodeUprightRotateHandleControlPoints(node, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
        : nodeRotateHandleControlPoints(node, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
    ).handle;
    setTransformDrag({
      kind,
      nodeId: node.id,
      originalNode: snapshotSingleTransformNode(node),
      originalSize: { ...node.size },
      startPoint,
      rotationStartPoint: kind === "rotate"
        ? { x: node.position.x + rotateHandleStart.x, y: node.position.y + rotateHandleStart.y }
        : undefined,
      handleXDirection: handle?.xDirection,
      handleYDirection: handle?.yDirection,
      uprightStaticSelection: nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node))
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartGroupMoveDrag(__appScope: CanvasInteractionScope) {
  return (event: ReactPointerEvent<SVGRectElement>, unit: CanvasLayoutUnit) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, activeSelectedNodeIds, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clampPointToCanvas, clearNodeDragMoveSchedule, connectSource, createCanvasSelectionSnapshot, dragUndoCapturedRef, edgeListForNodeIds, expandActiveGroupSelection, groupExpandedCanvasSelection, hasCanvasSelectionModifier, isMultiNodeMoveState, isWholeActiveLayerMove, mode, movableCanvasNodeIds, nodeById, nodes, routePointsSnapshotForMove, screenToSvgPoint, setCanvasSelectionScope, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, snapshotRouteBounds, startDraggingState, startModifierSelectionPress, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || mode === "connect" || connectSource) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "selection", nodeIds: unit.nodeIds, edgeIds: unit.edgeIds });
      return;
    }
    if (unit.nodeIds.length === 0 || unit.nodeIds.some((nodeId) => !activeLayerNodeIdSet.has(nodeId))) {
      return;
    }
    activateInspectorFromCanvas();
    const currentGroupSelectionContainsUnit =
      canvasSelectionScope === "group" && unit.nodeIds.every((nodeId) => activeSelectedNodeIds.includes(nodeId));
    const dragSelection = currentGroupSelectionContainsUnit
      ? {
          nodeIds: groupExpandedCanvasSelection.nodeIds,
          edgeIds: groupExpandedCanvasSelection.edgeIds
        }
      : expandActiveGroupSelection(unit.nodeIds, []);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(dragSelection.nodeIds);
    setSelectedEdgeIds(dragSelection.edgeIds);
    setSelectedEdgeId(dragSelection.edgeIds[0] ?? "");
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    // 拖容器 = 整组:组合框拖动同样把成员并入拖动集合
    const dragNodeIds = movableCanvasNodeIds(containerDragGroup(nodes, dragSelection.nodeIds));
    if (dragNodeIds.length === 0) {
      return;
    }
    const edgeIdsForDrag = dragSelection.edgeIds;
    const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag);
    const wholeLayerMove = isWholeActiveLayerMove(dragNodeIds);
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id: string) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag);
    const nextDragging: DraggingState = {
      source: "pointer",
      nodeIds: dragNodeIds,
      grabbedNodeIds: dragSelection.nodeIds,
      edgeIds: edgeIdsForDrag,
      affectedEdges: affectedEdgesForDrag,
      wholeLayerMove,
      startPoint: point,
      originalPositions: originalPositionsForDrag,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForDrag.map((edge: Edge) => [
          edge.id,
          {
            ...cloneEdgeEditablePoints(edge),
            routePoints: edge.routePoints?.map((point: Point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForDrag),
      singleNodeDragCache: buildSingleNodeDragCache(dragNodeIds, edgeIdsForDrag, affectedEdgesForDrag),
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined,
      selection: createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "")
    };
    startDraggingState(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createBuildGroupTransformNodeUpdates(__appScope: CanvasInteractionScope) {
  return (drag: GroupTransformDrag, point: Point, store: GraphStore, options?: { snapRotation?: boolean }) => {
  const { groupTransformGeometry, normalizeRotationDegrees, transformGroupPoint } = __appScope;
    const updates: ModelNode[] = [];
    const geometry = groupTransformGeometry(drag, point, options);
    if (geometry.kind === "rotate") {
      for (const nodeId of drag.nodeIds) {
        const snapshot = drag.originalNodes[nodeId];
        const node = store!.nodeMap.get(nodeId);
        if (!node || !snapshot) {
          continue;
        }
        updates.push({
          ...node,
          position: transformGroupPoint(drag, geometry, snapshot.position),
          rotation: normalizeRotationDegrees(snapshot.rotation + geometry.degrees)
        });
      }
      return updates;
    }

    for (const nodeId of drag.nodeIds) {
      const snapshot = drag.originalNodes[nodeId];
      const node = store!.nodeMap.get(nodeId);
      if (!node || !snapshot) {
        continue;
      }
      const nextScaleX = (snapshot.scaleX ?? snapshot.scale ?? 1) * geometry.scaleX;
      const nextScaleY = (snapshot.scaleY ?? snapshot.scale ?? 1) * geometry.scaleY;
      // 交流容器:几何恒在 size —— 整组缩放同样把 scale 吃进 size(与拖角 resize 同一出口),
      // 否则容器渲染矩形 = size × |scale| 又和 eject/入组用的 size 矩形分叉(fb10 根因)
      if (isContainerNode(node)) {
        updates.push({
          ...foldContainerScaleIntoSize({
            ...node,
            scale: Math.max(Math.abs(nextScaleX), Math.abs(nextScaleY)),
            scaleX: nextScaleX,
            scaleY: nextScaleY
          }),
          position: transformGroupPoint(drag, geometry, snapshot.position)
        });
        continue;
      }
      updates.push({
        ...node,
        position: transformGroupPoint(drag, geometry, snapshot.position),
        scale: Math.max(Math.abs(nextScaleX), Math.abs(nextScaleY)),
        scaleX: nextScaleX,
        scaleY: nextScaleY
      });
    }
    return updates;
  };
}

export function createRotateLayoutUnitNodeUpdates(__appScope: CanvasInteractionScope) {
  return (
    units: CanvasLayoutUnit[],
    degrees: number,
    store?: GraphStore
  ) => {
  const { graphStore, normalizeRotationDegrees, rotatePointAround, selectionRectCenter } = __appScope;
    if (store === undefined) {
      store = graphStore;
    }
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = store!.nodeMap.get(nodeId);
        if (!node) {
          continue;
        }
        updates.set(nodeId, {
          ...node,
          position: unit.kind === "group" ? rotatePointAround(node.position, center, degrees) : node.position,
          rotation: normalizeRotationDegrees(node.rotation + degrees)
        });
      }
    }
    return Array.from(updates.values());
  };
}

export function createMirrorLayoutUnitNodeUpdates(__appScope: CanvasInteractionScope) {
  return (
    units: CanvasLayoutUnit[],
    axis: "horizontal" | "vertical",
    store?: GraphStore
  ) => {
  const { getNodeScaleX, getNodeScaleY, graphStore, mirrorPointAcrossAxis, normalizeRotationDegrees, selectionRectCenter } = __appScope;
    if (store === undefined) {
      store = graphStore;
    }
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = store!.nodeMap.get(nodeId);
        if (!node) {
          continue;
        }
        const mirroredPosition =
          unit.kind === "group"
            ? mirrorPointAcrossAxis(node.position, center, axis)
            : node.position;
        const mirroredNode = { ...node, position: mirroredPosition, rotation: normalizeRotationDegrees(-node.rotation) };
        updates.set(
          nodeId,
          axis === "horizontal"
            ? { ...mirroredNode, scaleX: -getNodeScaleX(node) }
            : { ...mirroredNode, scaleY: -getNodeScaleY(node) }
        );
      }
    }
    return Array.from(updates.values());
  };
}

export function createBusAnchorFromEvent(__appScope: CanvasInteractionScope) {
  return (node: ModelNode, event: ReactPointerEvent<SVGGElement | SVGCircleElement>): Point | undefined => {
  const { busAnchorFromPoint, clampPointToCanvas, isBusNode, screenToSvgPoint, svgRef } = __appScope;
    if (!isBusNode(node) || !svgRef.current) {
      return undefined;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    return busAnchorFromPoint(node, point);
  };
}

export function createBusAnchorFromPoint(__appScope: CanvasInteractionScope) {
  return (node: ModelNode, point: Point): Point | undefined => {
  const { isBusNode, projectPointToBusCenterline } = __appScope;
    if (!isBusNode(node)) {
      return undefined;
    }
    return projectPointToBusCenterline(node, point);
  };
}

export function createIsPointOnBus(__appScope: CanvasInteractionScope) {
  return (node: ModelNode, point: Point) => {
  const { isPointNearBus } = __appScope;
    return isPointNearBus(node, point, 0);
  };
}

export function createIsPointNearBus(__appScope: CanvasInteractionScope) {
  return (node: ModelNode, point: Point, tolerance = 0) => {
  const { pointOnBusForSnap } = __appScope;
    return Boolean(pointOnBusForSnap(node, point, tolerance));
  };
}

export function createFindRewireTargetAtPoint(__appScope: CanvasInteractionScope) {
  return (point: Point, state: Exclude<RewiringState, null>) => {
  const { CONNECT_BUS_SNAP_TOLERANCE, CONNECT_TERMINAL_SNAP_TOLERANCE, activeLayerEdgeIdSet, busAnchorFromPoint, canConnectTerminals, connectTargetSearchBounds, edgeById, getTerminalPoint, isBusNode, isPointNearBus, queryNodeSpatialIndex, visibleNodeById, visibleNodeSpatialIndex } = __appScope;
    const edge = edgeById.get(state.edgeId);
    if (!edge) {
      return null;
    }
    if (!activeLayerEdgeIdSet.has(edge.id)) {
      return null;
    }
    const otherNode = visibleNodeById.get(state.endpoint === "source" ? edge.targetId : edge.sourceId);
    const otherTerminalId = state.endpoint === "source" ? edge.targetTerminalId : edge.sourceTerminalId;
    if (!otherNode || !otherTerminalId || isLineOnlyConnectionNode(otherNode)) {
      return null;
    }
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (node.id === otherNode.id || isLineOnlyConnectionNode(node)) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE && canConnectTerminals(node, terminal.id, otherNode, otherTerminalId)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };
}

export function createFindConnectTargetAtPoint(__appScope: CanvasInteractionScope) {
  return (point: Point): ConnectTarget | null => {
  const { CONNECT_BUS_SNAP_TOLERANCE, CONNECT_TERMINAL_SNAP_TOLERANCE, activeLayerNodeIdSet, busAnchorFromPoint, canConnectTerminals, connectSource, connectTargetSearchBounds, getTerminalPoint, isBusNode, isPointNearBus, queryNodeSpatialIndex, visibleNodeById, visibleNodeSpatialIndex } = __appScope;
    if (!connectSource) {
      return null;
    }
    const sourceNode = activeLayerNodeIdSet.has(connectSource.nodeId) ? visibleNodeById.get(connectSource.nodeId) : undefined;
    if (!sourceNode || isLineOnlyConnectionNode(sourceNode)) {
      return null;
    }
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (isLineOnlyConnectionNode(node)) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (
          !(node.id === sourceNode.id && terminalId === connectSource.terminalId) &&
          canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)
        ) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        if (node.id === sourceNode.id && terminal.id === connectSource.terminalId) {
          continue;
        }
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE && canConnectTerminals(sourceNode, connectSource.terminalId, node, terminal.id)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };
}

export function createFindRoutableLineEndpointTargetAtPoint(__appScope: CanvasInteractionScope) {
  return (
    point: Point,
    options: { terminalType?: TerminalType; source?: ConnectTarget | null; excludedNodeId?: string; excludedEndpoint?: "source" | "target" } = {}
  ): ConnectTarget | null => {
  const { CONNECT_BUS_SNAP_TOLERANCE, CONNECT_TERMINAL_SNAP_TOLERANCE, activeLayerNodeIdSet, busAnchorFromPoint, connectTargetSearchBounds, getBusTerminalType, getTerminalPoint, isBusNode, isPointNearBus, isRoutableLineDeviceKind, nodeById, queryNodeSpatialIndex, routableLinePlacement, routableLineTemplateTerminalType, visibleNodeSpatialIndex } = __appScope;
    const terminalType = options.terminalType ?? (routableLinePlacement ? routableLineTemplateTerminalType(routableLinePlacement.template) : undefined);
    if (!terminalType) {
      return null;
    }
    const source = options.source ?? routableLinePlacement?.source ?? null;
    const searchBounds = connectTargetSearchBounds(point);
    for (const indexedNode of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      // The spatial index is geometry-oriented and intentionally skips
      // parameter-only updates. Always resolve its hit back to the live node
      // before checking terminals or model-association parameters.
      const node = nodeById.get(indexedNode.id) ?? indexedNode;
      if (!activeLayerNodeIdSet.has(node.id) || node.id === options.excludedNodeId || isRoutableLineDeviceKind(node.kind)) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (
          getBusTerminalType(node) === terminalType &&
          !(source && source.node.id === node.id && source.terminalId === terminalId)
        ) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        if (terminal.type !== terminalType) {
          continue;
        }
        if (source && source.node.id === node.id && source.terminalId === terminal.id) {
          continue;
        }
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };
}
