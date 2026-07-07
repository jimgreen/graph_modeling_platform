// @ts-nocheck

export function createEnsureDraggingUndoSnapshot(__appScope: Record<string, any>) {
  return () => {
  const { dragUndoCapturedRef, draggingRef, pushUndoSnapshot, undoScopeForDraggingState } = __appScope;
    if (dragUndoCapturedRef.current) {
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForDraggingState(draggingRef.current));
    dragUndoCapturedRef.current = true;
  };
}

export function createRequestCanvasFrameCenter(__appScope: Record<string, any>) {
  return () => {
  const { setCanvasCenterRequest } = __appScope;
    setCanvasCenterRequest((current) => current + 1);
  };
}

export function createUndoLastOperation(__appScope: Record<string, any>) {
  return () => {
  const { applyUndoGraphSnapshot, deferredMoveOptimizationCancelRef, deferredRoutableLineRouteRepairCancelRef, pendingBusTerminalSyncNodeIdsRef, pendingStoredRouteEdgeIdsRef, resetConnectPreviewState, setActiveLayerId, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasBackgroundImageFit, setCanvasHeight, setCanvasSelectionScope, setCanvasWidth, setConnectSource, setContextMenu, setCurrentUnit, setDeviceIndexCounters, setGroups, setHasUnsavedChanges, setLayers, setOperationLogText, setPowerBaseValue, setPowerUnit, setProjectMeasurements, setProjectMenu, setProjectName, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTopology, setTopologyErrors, setTopologyStatus, setUndoStack, setVoltageUnit, skipNextTopologyStaleRef } = __appScope;
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    deferredRoutableLineRouteRepairCancelRef.current?.();
    deferredRoutableLineRouteRepairCancelRef.current = null;
    pendingStoredRouteEdgeIdsRef.current = new Set();
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    setUndoStack((current) => {
      const snapshot = current.at(-1);
      if (!snapshot) {
        return current;
      }
      setProjectName(snapshot.projectName);
      setLayers(snapshot.layers.map((layer) => ({ ...layer })));
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
      setHasUnsavedChanges(true);
      setOperationLogText("撤销上一步操作");
      return current.slice(0, -1);
    });
  };
}

export function createCanvasPointerKeyboardShortcutAvailability(__appScope: Record<string, any>) {
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

export function createRouteForCurrentEdgeSave(__appScope: Record<string, any>) {
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

export function createCurrentProject(__appScope: Record<string, any>) {
  return (): ProjectFile => {
  const { activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageFit, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edgeWithCurrentRouteGeometryForSave, edges, groups, layers, lockProjectEdgeTerminals, nodes, normalizeModelGroups, normalizeProjectLayers, normalizeProjectMeasurements, powerBaseValue, powerUnit, projectMeasurements, projectName, voltageUnit } = __appScope;
    const projectEdges = edges.map(edgeWithCurrentRouteGeometryForSave);
    return normalizeProjectLayers(lockProjectEdgeTerminals({
      version: 1,
      name: projectName,
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
      backgroundLayerIds,
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      deviceIndexCounters,
      groups: normalizeModelGroups(groups, nodes, projectEdges),
      measurements: normalizeProjectMeasurements(projectMeasurements, nodes),
      nodes,
      edges: projectEdges
    }));
  };
}

export function createAdjustSelectedDisplayLayer(__appScope: Record<string, any>) {
  return (action: DisplayLayerAction) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, nodes, pushUndoSnapshot, reorderItemsByDisplayLayer, requireEditMode, setCanvasSelectionScope, setContextMenu, setNodes, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!requireEditMode("调整显示层级")) {
      return;
    }
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

export function createClearTransientSelectionState(__appScope: Record<string, any>) {
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

export function createWriteOperationLog(__appScope: Record<string, any>) {
  return (message: string) => {
  const { setOperationLogText } = __appScope;
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setOperationLogText(`${time} ${message}`);
  };
}

export function createRequireEditMode(__appScope: Record<string, any>) {
  return (action: string) => {
  const { isEditMode, writeOperationLog } = __appScope;
    if (isEditMode) {
      return true;
    }
    writeOperationLog(`浏览模式下不能${action}，请先切换到编辑模式`);
    return false;
  };
}

export function createPersistDeviceLibraryChange(__appScope: Record<string, any>) {
  return (
    overrides: Partial<DeviceLibraryPersistencePayload>,
    messages: { success?: string; failure?: string } = {}
  ) => {
  const { backendDeviceLibraryLoadedRef, customCategoryLibraries, customComponentLibraries, customDeviceTemplates, customGraphTemplateTypes, customGraphTemplates, deviceDefinitionOverrides, lastPersistedDeviceLibraryPayloadRef, normalizeDeviceLibraryPersistencePayload, saveBackendDeviceLibraryPayload, suppressNextBackendDeviceLibrarySyncRef, writeLocalDeviceLibraryPersistencePayload, writeOperationLog } = __appScope;
    const normalizedDeviceLibrary = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates,
      customCategoryLibraries,
      customComponentLibraries,
      deviceDefinitionOverrides,
      customGraphTemplateTypes,
      customGraphTemplates,
      ...overrides
    });
    const normalizedDeviceLibraryPayload = JSON.stringify(normalizedDeviceLibrary);
    writeLocalDeviceLibraryPersistencePayload(normalizedDeviceLibrary);
    if (normalizedDeviceLibraryPayload === lastPersistedDeviceLibraryPayloadRef.current) {
      return;
    }
    lastPersistedDeviceLibraryPayloadRef.current = normalizedDeviceLibraryPayload;
    suppressNextBackendDeviceLibrarySyncRef.current = false;
    if (!backendDeviceLibraryLoadedRef.current) {
      return;
    }
    void saveBackendDeviceLibraryPayload(normalizedDeviceLibraryPayload)
      .then(() => {
        if (messages.success) {
          writeOperationLog(messages.success);
        }
      })
      .catch(() => {
        lastPersistedDeviceLibraryPayloadRef.current = null;
        if (messages.failure) {
          writeOperationLog(messages.failure);
        }
      });
  };
}

export function createPersistTemplateLibraryChange(__appScope: Record<string, any>) {
  return (overrides: Pick<Partial<DeviceLibraryPersistencePayload>, "customGraphTemplateTypes" | "customGraphTemplates">) => {
  const { persistDeviceLibraryChange } = __appScope;
    persistDeviceLibraryChange(overrides, {
      success: "模板库已自动保存到后台",
      failure: "模板库自动保存到后台失败"
    });
  };
}

export function createConnectionCommitFailureMessage(__appScope: Record<string, any>) {
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

export function createSwitchInspectorTabForCanvasSelection(__appScope: Record<string, any>) {
  return (
    nodeIds: readonly string[] = [],
    edgeIds: readonly string[] = [],
    source: "single" | "marquee" | "blank" = "single"
  ) => {
  const { setInspectorTab } = __appScope;
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
      setInspectorTab("graph");
    }
  };
}

export function createSelectCanvasGraphics(__appScope: Record<string, any>) {
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

export function createSetModifierSelectionPress(__appScope: Record<string, any>) {
  return (next: ModifierSelectionPressState) => {
  const { modifierSelectionPressRef, setModifierSelectionPressState } = __appScope;
    modifierSelectionPressRef.current = next;
    setModifierSelectionPressState(next);
  };
}

export function createToggleNodeSelectionFromModifierClick(__appScope: Record<string, any>) {
  return (node: ModelNode) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, resetConnectPreviewState, selectedEdgeId, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    const nodeAlreadySelected = activeSelectedNodeIds.includes(node.id);
    const nextNodeIds = nodeAlreadySelected
      ? activeSelectedNodeIds.filter((nodeId) => nodeId !== node.id)
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

export function createToggleEdgeSelectionFromModifierClick(__appScope: Record<string, any>) {
  return (edge: Edge) => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, resetConnectPreviewState, selectedEdgeId, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    const edgeAlreadySelected = activeSelectedEdgeIds.includes(edge.id);
    const nextEdgeIds = edgeAlreadySelected
      ? activeSelectedEdgeIds.filter((edgeId) => edgeId !== edge.id)
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

export function createToggleSelectionFromModifierClick(__appScope: Record<string, any>) {
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
      ? activeSelectedNodeIds.filter((nodeId) => !targetNodeIdSet.has(nodeId))
      : [...activeSelectedNodeIds, ...targetNodeIds.filter((nodeId) => !activeSelectedNodeIds.includes(nodeId))];
    const nextEdgeIds = allTargetsSelected
      ? activeSelectedEdgeIds.filter((edgeId) => !targetEdgeIdSet.has(edgeId))
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

export function createRestoreCanvasSelectionSnapshot(__appScope: Record<string, any>) {
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

export function createRestoreCanvasSelectionSnapshotWithInspector(__appScope: Record<string, any>) {
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

export function createStartModifierSelectionPress(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<Element>,
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

export function createCancelModifierSelectionPress(__appScope: Record<string, any>) {
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

export function createFinishModifierSelectionPress(__appScope: Record<string, any>) {
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

export function createStartNodeLabelDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, clampPointToCanvas, getNodeScaleX, getNodeScaleY, getSafeNodeScaleX, getSafeNodeScaleY, hasCanvasSelectionModifier, isBrowseMode, nodeLabelOffset, screenToSvgPoint, selectCanvasGraphics, setInspectorTab, setNodeLabelDrag, startModifierSelectionPress, svgRef } = __appScope;
    if (!event.nativeEvent.defaultPrevented) {
      event.preventDefault();
    }
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      activateInspectorFromCanvas();
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

export function createStartNodeLabelRotateDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode) => {
  const { activateInspectorFromCanvas, activeLayerNodeIdSet, hasCanvasSelectionModifier, isBrowseMode, nodeLabelCanvasCenter, normalizeNodeLabelRotation, selectCanvasGraphics, setInspectorTab, setNodeLabelRotateDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      activateInspectorFromCanvas();
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

export function createFinishNodeLabelDrag(__appScope: Record<string, any>) {
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

export function createFinishNodeLabelRotateDrag(__appScope: Record<string, any>) {
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

export function createSetSelectedNodeLabelDisplayMode(__appScope: Record<string, any>) {
  return (mode: NodeLabelDisplayMode) => {
  const { NODE_LABEL_DISPLAY_MODES, activeSelectedNodeIds, commitNodeFootprintUpdates, isStaticNode, nodeById, nodeLabelDisplayMode, pushUndoSnapshot, requireEditMode, writeOperationLog } = __appScope;
    if (!requireEditMode("修改图元标识显示方式")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const updates = activeSelectedNodeIds.flatMap((nodeId) => {
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
    const label = NODE_LABEL_DISPLAY_MODES.find((item) => item.value === mode)?.label ?? mode;
    pushUndoSnapshot();
    commitNodeFootprintUpdates(updates);
    writeOperationLog(`设置 ${updates.length} 个图元标识显示方式：${label}`);
  };
}

export function createToggleSelectedNodeLabelDisplay(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedNodeIds, isStaticNode, nodeById, nodeLabelDisplayMode, setSelectedNodeLabelDisplayMode } = __appScope;
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const hasVisibleLabel = activeSelectedNodeIds.some((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && !isStaticNode(node) && nodeLabelDisplayMode(node) !== "hidden";
    });
    setSelectedNodeLabelDisplayMode(hasVisibleLabel ? "hidden" : "follow");
  };
}

export function createCopySelection(__appScope: Record<string, any>) {
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

export function createCutSelection(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, buildCanvasClipboard, canvasSelectionScope, deleteNodesWithConnectedEdges, edges, groups, nodes, normalizeModelGroups, normalizeProjectMeasurements, pushUndoSnapshot, removeGraphicsFromGroups, requireEditMode, resetConnectPreviewState, resetRoutableLinePreviewState, resolveCanvasDeleteAction, routedEdges, setCanvasClipboard, setCanvasSelectionScope, setConnectSource, setContextMenu, setGraphArrays, setGroups, setProjectMeasurements, setRewiring, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, visibleEdges, visibleNodes, writeOperationLog } = __appScope;
    if (!requireEditMode("剪切图元")) {
      return;
    }
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: activeSelectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      window.alert(action.message);
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
    const nextEdges = result.edges.filter((edge) => !selectedEdges.has(edge.id));
    setGraphArrays(result.nodes, nextEdges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, activeSelectedNodeIds, selectedEdges), result.nodes, nextEdges));
    setProjectMeasurements((current) => normalizeProjectMeasurements(current, result.nodes));
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
    writeOperationLog(`剪切 ${clipboard.nodes.length} 个图元、${clipboard.edges.length} 条联络线`);
  };
}

export function createPasteSelection(__appScope: Record<string, any>) {
  return () => {
  const { CANVAS_AUTO_EXPAND_PADDING, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, canvasClipboard, canvasClipboardBounds, canvasHeight, canvasWidth, clampNodePositionToBounds, clampPointToBounds, cloneCanvasClipboard, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, markStoredRouteEdgesDirty, nodes, normalizeDeviceIndexCounters, normalizeModelGroups, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, requireEditMode, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setDeviceIndexCounters, setGraphArrays, setGroups, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = __appScope;
    if (!requireEditMode("粘贴图元")) {
      return;
    }
    if (canvasClipboard.nodes.length === 0 && canvasClipboard.edges.length === 0) {
      return;
    }
    const targetPoint = lastRawCanvasPointerRef.current ?? lastCanvasPointerRef.current;
    if (!targetPoint) {
      window.alert("请先将鼠标移动到画布内，再执行粘贴操作。");
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
    const cloned = cloneCanvasClipboard(
      canvasClipboard,
      pasteTargetPoint,
      () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      if (canvasClipboard.edges.length > 0) {
        window.alert("不能粘贴悬空联络线：请同时复制联络线两端连接的设备或母线。");
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
      ? nodes.map((node) => translateNodeBy(node, pasteOriginShift))
      : nodes;
    const pasteSourceEdges = hasCanvasOriginShift(pasteOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, pasteOriginShift))
      : edges;
    const shiftedClonedNodes = hasCanvasOriginShift(pasteOriginShift)
      ? cloned.nodes.map((node) => translateNodeBy(node, pasteOriginShift))
      : cloned.nodes;
    const shiftedClonedEdges = hasCanvasOriginShift(pasteOriginShift)
      ? cloned.edges.map((edge) => translateEdgeBy(edge, pasteOriginShift))
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
    const pasted = shiftedClonedNodes.map((node) => {
      const draftNode = { ...node, layerId: activeLayerId, position: clampNodePositionToBounds(node, pastedCanvasBounds, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = shiftedClonedEdges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, pastedCanvasBounds) : undefined,
      targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, pastedCanvasBounds) : undefined,
      manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, pastedCanvasBounds)),
      routePoints: edge.routePoints?.map((point) => clampPointToBounds(point, pastedCanvasBounds))
    }));
    const nextNodes = [...pasteSourceNodes, ...pasted];
    const nextEdges = [...pasteSourceEdges, ...pastedEdges];
    markStoredRouteEdgesDirty(pastedEdges.map((edge) => edge.id));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setGraphArrays(nextNodes, nextEdges);
    const shiftedPasteTargetPoint = translatePointBy(targetPoint, pasteOriginShift);
    lastRawCanvasPointerRef.current = shiftedPasteTargetPoint;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPasteTargetPoint, pastedCanvasBounds);
    setGroups((current) => normalizeModelGroups([...current, ...cloned.groups], nextNodes, nextEdges));
    setCanvasSelectionScope("group");
    setSelectedNodeIds(pasted.map((node) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`粘贴 ${pasted.length} 个图元、${pastedEdges.length} 条联络线${pastedCanvasBounds.width > canvasWidth || pastedCanvasBounds.height > canvasHeight ? "，画布已扩展" : ""}`);
  };
}

export function createCreateGraphTemplateType(__appScope: Record<string, any>) {
  return () => {
  const { customGraphTemplateTypes, graphTemplateTypes, normalizeGraphTemplateTypeName, persistTemplateLibraryChange, requireEditMode, setCustomGraphTemplateTypes, setExpandedGraphTemplateTypes, setTemplateDraftType, writeOperationLog } = __appScope;
    if (!requireEditMode("新增模板类型")) {
      return;
    }
    const rawName = window.prompt("请输入模板类型名称");
    const typeName = normalizeGraphTemplateTypeName(rawName ?? "");
    if (!typeName) {
      return;
    }
    const duplicate = graphTemplateTypes.some((item) => item.toLowerCase() === typeName.toLowerCase());
    if (duplicate) {
      window.alert("模板类型名称重复，请换一个名称。");
      return;
    }
    const nextTypes = [...customGraphTemplateTypes, typeName];
    setCustomGraphTemplateTypes(nextTypes);
    setExpandedGraphTemplateTypes((current) => current.includes(typeName) ? current : [...current, typeName]);
    setTemplateDraftType(typeName);
    persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes });
    writeOperationLog(`新增模板类型：${typeName}`);
  };
}

export function createCreateGroupDeviceIconSvg(__appScope: Record<string, any>) {
  return (clipboard: CanvasClipboard) => {
  const { DeviceGlyph, canvasClipboardBounds, colorDisplayMode, colorPalette, escapeXml, formatSvgNumber, generateCustomDeviceImage, isBusNode, isStaticNode, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, pointsToPreviewPath, renderSvgElementMarkup, resolveNodeStateVisual } = __appScope;
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
        const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual }));
        const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual }));
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

export function createGroupDeviceTerminalAnchor(__appScope: Record<string, any>) {
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

export function createGroupDeviceTerminalSortKey(__appScope: Record<string, any>) {
  return (terminal: GroupDeviceTerminalDraft) => {
  const { formatSvgNumber } = __appScope;
    const anchor = terminal.anchor;
    const horizontal = Math.abs(anchor.x) >= Math.abs(anchor.y);
    const side = horizontal ? (anchor.x < 0 ? 0 : 1) : (anchor.y < 0 ? 2 : 3);
    const position = side <= 1 ? anchor.y : anchor.x;
    return `${side}:${formatSvgNumber(position + 0.5).padStart(8, "0")}:${terminal.sourceNodeId}:${terminal.sourceTerminalId}`;
  };
}

export function createGroupDeviceTerminalAssociationFor(__appScope: Record<string, any>) {
  return (node: ModelNode, terminalIndex: number, type: TerminalType): ContainerTerminalAssociationValue => {
  const { defaultContainerAssociationForTerminalType, libraryTemplateByKind, normalizeContainerTerminalAssociations } = __appScope;
    const template = libraryTemplateByKind.get(node.kind);
    if (!template?.isContainer) {
      return defaultContainerAssociationForTerminalType(type);
    }
    const terminalTypes = node.terminals.map((terminal) => terminal.type);
    return normalizeContainerTerminalAssociations(terminalTypes, template.terminalAssociations ?? [], node.terminals.length)[terminalIndex] ||
      defaultContainerAssociationForTerminalType(type);
  };
}

export function createGroupDeviceExternalTerminals(__appScope: Record<string, any>) {
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

export function createValidateGroupDeviceIconReplacement(__appScope: Record<string, any>) {
  return (target: DeviceTemplate, terminals: readonly GroupDeviceTerminalDraft[]) => {
  const { groupDeviceTerminalSignature } = __appScope;
    const targetTerminalTypes = (target.terminalTypes ?? Array.from({ length: target.terminalCount }, () => target.terminalType)).slice(0, target.terminalCount) as TerminalType[];
    const sourceTerminalTypes = terminals.map((terminal) => terminal.type);
    if (targetTerminalTypes.length !== sourceTerminalTypes.length || groupDeviceTerminalSignature(targetTerminalTypes) !== groupDeviceTerminalSignature(sourceTerminalTypes)) {
      return {
        valid: false,
        message: "图元组合对外端子数量和端子类型必须与已有元件相同，无法修改已有元件图标。"
      };
    }
    return { valid: true, message: "" };
  };
}

export function createReplaceBuiltinDeviceIconOverride(__appScope: Record<string, any>) {
  return (targetTemplate: DeviceTemplate, groupIcon: string) => {
  const { deviceDefinitionOverrideForTemplate, setDeviceDefinitionOverrides } = __appScope;
    setDeviceDefinitionOverrides((current) => {
      const existingOverride = deviceDefinitionOverrideForTemplate(targetTemplate, current);
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

export function createOpenGroupDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return () => {
  const { MAX_CUSTOM_DEVICE_TERMINALS, activeLayerGroups, activeSelectedGroupIds, buildCanvasClipboard, canAddTemplateFromSelection, canvasClipboardBounds, cloneGraphTemplateClipboard, createGroupDeviceIconSvg, customDeviceDraft, defaultComponentLibraryForCategoryLibrary, edges, groupDeviceExternalTerminals, groupDeviceReplacementTemplates, groupExpandedCanvasSelection, normalizeCategoryLibraryName, requireEditMode, routedEdges, setGroupDeviceDefinitionDialog, visibleEdges, visibleNodes } = __appScope;
    if (!requireEditMode("定义元件")) {
      return;
    }
    if (!canAddTemplateFromSelection) {
      window.alert("请先选中一个图元组合，再定义为元件。");
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
      window.alert("当前组合没有可定义为元件的图元。");
      return;
    }
    const terminals = groupDeviceExternalTerminals(clipboard, edges);
    if (terminals.length > MAX_CUSTOM_DEVICE_TERMINALS) {
      window.alert(`当前组合对外端子为 ${terminals.length} 个，暂时最多支持 ${MAX_CUSTOM_DEVICE_TERMINALS} 个端子。`);
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

export function createConfirmCreateDeviceFromGroup(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, MAX_CUSTOM_DEVICE_TERMINALS, activeGroupById, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, ensureCustomComponentTreeExpanded, groupDeviceDefinitionDialog, isValidComponentLibraryName, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, prepareMeasurementConfigDraft, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogOpen, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceStatePageId, setDeviceLibraryDialogLayouts, setEditingCustomDeviceKind, setGroupDeviceDefinitionDialog, setSelectedDefinitionKind, writeOperationLog } = __appScope;
    if (!groupDeviceDefinitionDialog) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(groupDeviceDefinitionDialog.categoryLibraryName);
    const componentLibrary = normalizeComponentLibraryName(groupDeviceDefinitionDialog.componentLibrary);
    if (!componentLibrary) {
      window.alert("请选择元件库。");
      return;
    }
    if (!isValidComponentLibraryName(componentLibrary)) {
      window.alert("元件库必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
      return;
    }
    const terminalTypes = groupDeviceDefinitionDialog.terminals.map((terminal) => terminal.type);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      groupDeviceDefinitionDialog.terminals.map((terminal) => terminal.association),
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
        groupDeviceDefinitionDialog.terminals.map((terminal) => terminal.anchor)
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

export function createConfirmReplaceDeviceIconFromGroup(__appScope: Record<string, any>) {
  return () => {
  const { editingCustomDeviceKind, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, replaceBuiltinDeviceIconOverride, setCustomDeviceDraft, setCustomDeviceTemplates, setGroupDeviceDefinitionDialog, validateGroupDeviceIconReplacement, writeOperationLog } = __appScope;
    if (!groupDeviceDefinitionDialog) {
      return;
    }
    const targetTemplate = groupDeviceReplacementTemplates.find((template) => template.kind === groupDeviceDefinitionDialog.targetKind);
    if (!targetTemplate) {
      window.alert("请选择要修改图标的已有元件。");
      return;
    }
    const validation = validateGroupDeviceIconReplacement(targetTemplate, groupDeviceDefinitionDialog.terminals);
    if (!validation.valid) {
      window.alert(validation.message);
      return;
    }
    const groupIcon = groupDeviceDefinitionDialog.iconImage;
    if (targetTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) =>
          template.kind === targetTemplate.kind
            ? { ...template, params: { ...template.params, backgroundImage: groupIcon, backgroundImageAssetId: "" } }
            : template
        )
      );
    } else {
      replaceBuiltinDeviceIconOverride(targetTemplate, groupIcon);
    }
    if (editingCustomDeviceKind === targetTemplate.kind) {
      setCustomDeviceDraft((current) => ({
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

export function createOpenAddTemplateDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_GRAPH_TEMPLATE_TYPES, activeGroupById, activeLayerGroups, activeSelectedGroupIds, buildCanvasClipboard, canAddTemplateFromSelection, canvasClipboardBounds, cloneGraphTemplateClipboard, customGraphTemplates, graphTemplateTypes, groupExpandedCanvasSelection, requireEditMode, routedEdges, setTemplateDialog, setTemplateDraftName, setTemplateDraftType, templateDraftType, uniqueGraphTemplateName, visibleEdges, visibleNodes } = __appScope;
    if (!requireEditMode("添加模板")) {
      return;
    }
    if (!canAddTemplateFromSelection) {
      window.alert("请先选中一个图元组合，再添加模板。");
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
      window.alert("当前组合没有可保存为模板的图元。");
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

export function createCancelTemplateDialog(__appScope: Record<string, any>) {
  return () => {
  const { setTemplateDialog, setTemplateDraftName } = __appScope;
    setTemplateDialog(null);
    setTemplateDraftName("");
  };
}

export function createConfirmAddGraphTemplate(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_GRAPH_TEMPLATE_TYPES, cloneGraphTemplateClipboard, customGraphTemplateTypes, customGraphTemplates, normalizeGraphTemplateTypeName, persistTemplateLibraryChange, setCustomGraphTemplateTypes, setCustomGraphTemplates, setExpandedGraphTemplateTypes, setLeftPanelTab, setTemplateDialog, setTemplateDraftName, templateDialog, templateDraftName, templateDraftType, writeOperationLog } = __appScope;
    if (!templateDialog) {
      return;
    }
    const typeName = normalizeGraphTemplateTypeName(templateDraftType) || DEFAULT_GRAPH_TEMPLATE_TYPES[0];
    const name = templateDraftName.trim();
    if (!name) {
      window.alert("请输入模板名字。");
      return;
    }
    if (customGraphTemplates.some((template) => template.typeName.toLowerCase() === typeName.toLowerCase() && template.name.toLowerCase() === name.toLowerCase())) {
      window.alert("模板名称重复，请换一个名称。");
      return;
    }
    const now = new Date().toISOString();
    const template: GraphTemplate = {
      id: `graph-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      typeName,
      name,
      sourceSize: { ...templateDialog.sourceSize },
      clipboard: cloneGraphTemplateClipboard(templateDialog.clipboard),
      createdAt: now,
      updatedAt: now
    };
    const nextTypes = DEFAULT_GRAPH_TEMPLATE_TYPES.some((item) => item.toLowerCase() === typeName.toLowerCase()) ||
      customGraphTemplateTypes.some((item) => item.toLowerCase() === typeName.toLowerCase())
      ? customGraphTemplateTypes
      : [...customGraphTemplateTypes, typeName];
    const nextTemplates = [...customGraphTemplates, template];
    if (nextTypes !== customGraphTemplateTypes) {
      setCustomGraphTemplateTypes(nextTypes);
    }
    setCustomGraphTemplates(nextTemplates);
    setExpandedGraphTemplateTypes((current) => current.includes(typeName) ? current : [...current, typeName]);
    setLeftPanelTab("templates");
    setTemplateDialog(null);
    setTemplateDraftName("");
    persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes, customGraphTemplates: nextTemplates });
    writeOperationLog(`添加模板：${typeName} / ${name}（${template.sourceSize.width}×${template.sourceSize.height}）`);
  };
}

export function createDeleteGraphTemplate(__appScope: Record<string, any>) {
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

export function createDeleteGraphTemplateType(__appScope: Record<string, any>) {
  return (typeName: string) => {
    const { customGraphTemplateTypes, customGraphTemplates, persistTemplateLibraryChange, requireEditMode, setCustomGraphTemplateTypes, setCustomGraphTemplates, setTemplateMenu, writeOperationLog } = __appScope;
    if (!requireEditMode("删除模板类型")) {
      return;
    }
    const deletingTemplates = customGraphTemplates.filter((template: GraphTemplate) => template.typeName === typeName);
    const nextTypes = customGraphTemplateTypes.filter((item: string) => item !== typeName);
    const nextTemplates = customGraphTemplates.filter((template: GraphTemplate) => template.typeName !== typeName);
    if (nextTypes.length === customGraphTemplateTypes.length && nextTemplates.length === customGraphTemplates.length) {
      setTemplateMenu(null);
      return;
    }
    if (!window.confirm(`删除模板类型“${typeName}”及其下 ${deletingTemplates.length} 个模板？`)) {
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

export function createDropGraphTemplate(__appScope: Record<string, any>) {
  return (template: GraphTemplate, pointerPosition: Point) => {
  const { CANVAS_AUTO_EXPAND_PADDING, activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, assignPermanentDeviceIndex, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, clampNodePositionToBounds, clampPointToBounds, cloneCanvasClipboard, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, markStoredRouteEdgesDirty, nodes, normalizeDeviceIndexCounters, normalizeModelGroups, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, requireEditMode, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setDeviceIndexCounters, setGraphArrays, setGroups, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = __appScope;
    if (!requireEditMode("放置模板")) {
      return;
    }
    const targetTopLeft = {
      x: pointerPosition.x - template.sourceSize.width / 2,
      y: pointerPosition.y - template.sourceSize.height / 2
    };
    const cloned = cloneCanvasClipboard(
      template.clipboard,
      targetTopLeft,
      () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      window.alert("模板内容为空或包含悬空联络线，无法生成。");
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
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const shiftedClonedNodes = hasCanvasOriginShift(dropOriginShift)
      ? cloned.nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : cloned.nodes;
    const shiftedClonedEdges = hasCanvasOriginShift(dropOriginShift)
      ? cloned.edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
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
    const pasted = shiftedClonedNodes.map((node) => {
      const draftNode = { ...node, layerId: activeLayerId, position: clampNodePositionToBounds(node, dropCanvasBounds, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = shiftedClonedEdges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, dropCanvasBounds) : undefined,
      targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, dropCanvasBounds) : undefined,
      manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, dropCanvasBounds)),
      routePoints: edge.routePoints?.map((point) => clampPointToBounds(point, dropCanvasBounds))
    }));
    const nextNodes = [...dropSourceNodes, ...pasted];
    const nextEdges = [...dropSourceEdges, ...pastedEdges];
    pushUndoSnapshot();
    markStoredRouteEdgesDirty(pastedEdges.map((edge) => edge.id));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setGraphArrays(nextNodes, nextEdges);
    setGroups((current) => normalizeModelGroups([...current, ...cloned.groups], nextNodes, nextEdges));
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(pasted.map((node) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    activateInspectorFromCanvas();
    writeOperationLog(`从模板新增：${template.typeName} / ${template.name}`);
  };
}

export function createFinishMarqueeSelectionFromPoints(__appScope: Record<string, any>) {
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

export function createStartContextMarqueeSelection(__appScope: Record<string, any>) {
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

export function createOpenFilterSelectionDialog(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerNodeIdSet, activeSelectedNodeIds, filterSelectionItemKey, nodeById, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys } = __appScope;
    const activeSelectedTypeKeys = Array.from(new Set(
      activeSelectedNodeIds
        .flatMap((nodeId) => {
          const node = nodeById.get(nodeId);
          return node && activeLayerNodeIdSet.has(node.id) ? [filterSelectionItemKey(node)] : [];
        })
    ));
    setFilterSelectionTypeKeys(activeSelectedTypeKeys);
    setFilterSelectionDialogOpen(true);
  };
}

export function createToggleFilterSelectionType(__appScope: Record<string, any>) {
  return (typeKey: string) => {
  const { filterSelectionTypeOptions, setFilterSelectionTypeKeys } = __appScope;
    const option = filterSelectionTypeOptions.find((item) => item.typeKey === typeKey);
    if (!option) {
      return;
    }
    const itemKeys = option.items.map((item) => item.itemKey);
    const itemKeySet = new Set(itemKeys);
    setFilterSelectionTypeKeys((current) => {
      const allSelected = itemKeys.every((itemKey) => current.includes(itemKey));
      return allSelected
        ? current.filter((item) => !itemKeySet.has(item))
        : [...current, ...itemKeys.filter((itemKey) => !current.includes(itemKey))];
    });
  };
}

export function createToggleFilterSelectionItem(__appScope: Record<string, any>) {
  return (itemKey: string) => {
  const { setFilterSelectionTypeKeys } = __appScope;
    setFilterSelectionTypeKeys((current) =>
      current.includes(itemKey)
        ? current.filter((item) => item !== itemKey)
        : [...current, itemKey]
    );
  };
}

export function createConfirmFilterSelectionDialog(__appScope: Record<string, any>) {
  return () => {
  const { activeLayerNodes, filterSelectionItemKey, filterSelectionTypeKeys, resetConnectPreviewState, selectCanvasGraphics, setConnectSource, setFilterSelectionDialogOpen, setRewiring, switchInspectorTabForCanvasSelection, writeOperationLog } = __appScope;
    const selectedItemKeys = new Set(filterSelectionTypeKeys);
    const nextSelectedNodes = selectedItemKeys.size > 0
      ? activeLayerNodes.filter((node) => selectedItemKeys.has(filterSelectionItemKey(node)))
      : [];
    selectCanvasGraphics(nextSelectedNodes.map((node) => node.id), [], { scope: "direct" });
    switchInspectorTabForCanvasSelection(nextSelectedNodes.map((node) => node.id), [], "marquee");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setFilterSelectionDialogOpen(false);
    writeOperationLog(`过滤选择：选中 ${nextSelectedNodes.length} 个图元`);
  };
}

export function createFinishMarqueeSelection(__appScope: Record<string, any>) {
  return () => {
  const { finishMarqueeSelectionFromPoints, marquee } = __appScope;
    if (!marquee) {
      return;
    }
    finishMarqueeSelectionFromPoints(marquee.start, marquee.current);
  };
}

export function createDeleteSelection(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, deleteNodesWithConnectedEdges, edgeById, edgeListForNodeIds, edges, groups, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, normalizeModelGroups, normalizeProjectMeasurements, pushUndoSnapshot, removeGraphicsFromGroups, requireEditMode, setCanvasSelectionScope, setEdges, setGraphArrays, setGroups, setProjectMeasurements, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!requireEditMode("删除图元")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0) {
      return;
    }
    const selectedEdges = new Set(activeSelectedEdgeIds);
    if (activeSelectedNodeIds.length === 0) {
      pushUndoSnapshot();
      const deletedEdges = activeSelectedEdgeIds.flatMap((edgeId) => {
        const edge = edgeById.get(edgeId);
        return edge ? [edge] : [];
      });
      markRouteEdgesDirty(selectedEdges);
      markStoredRouteEdgesDirty(selectedEdges);
      markBusTerminalSyncDirtyForEdges(deletedEdges);
      const nextEdges = edges.filter((edge) => !selectedEdges.has(edge.id));
      setEdges(nextEdges);
      setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, [], selectedEdges), nodes, nextEdges));
      setCanvasSelectionScope("group");
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      writeOperationLog(`删除 ${selectedEdges.size} 条联络线`);
      return;
    }
    pushUndoSnapshot();
    const deletedEdges = edgeListForNodeIds(activeSelectedNodeIds, selectedEdges);
    markRouteEdgesDirty(deletedEdges.map((edge) => edge.id));
    markStoredRouteEdgesDirty(deletedEdges.map((edge) => edge.id));
    markBusTerminalSyncDirtyForEdges(deletedEdges);
    const result = deleteNodesWithConnectedEdges(nodes, edges, activeSelectedNodeIds);
    const nextEdges = result.edges.filter((edge) => !selectedEdges.has(edge.id));
    setGraphArrays(result.nodes, nextEdges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, activeSelectedNodeIds, selectedEdges), result.nodes, nextEdges));
    setProjectMeasurements((current) => normalizeProjectMeasurements(current, result.nodes));
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    writeOperationLog(`删除 ${activeSelectedNodeIds.length} 个图元`);
  };
}

export function createDeleteSelectedGraphicsFromCanvas(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, deleteSelection, resolveCanvasDeleteAction } = __appScope;
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: activeSelectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      window.alert(action.message);
      return;
    }
    deleteSelection();
  };
}

export function createGroupSelectedGraphics(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, canGroupSelectedGraphics, createCanvasGroupFromSelection, edges, expandSelectionByGroups, groups, nodes, normalizeModelGroups, pushUndoSnapshot, requireEditMode, setCanvasSelectionScope, setGroups, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = __appScope;
    if (!requireEditMode("组合图元")) {
      return;
    }
    if (!canGroupSelectedGraphics) {
      return;
    }
    const result = createCanvasGroupFromSelection(
      groups,
      activeSelectedNodeIds,
      activeSelectedEdgeIds,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
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

export function createUngroupSelectedGraphics(__appScope: Record<string, any>) {
  return () => {
  const { activeSelectedEdgeIds, activeSelectedNodeIds, canUngroupSelectedGraphics, dissolveSelectedCanvasGroups, edges, groups, nodes, normalizeModelGroups, pushUndoSnapshot, requireEditMode, setGroups, writeOperationLog } = __appScope;
    if (!requireEditMode("解散组合")) {
      return;
    }
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

export function createManualPointDeltaForEdge(__appScope: Record<string, any>) {
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

export function createRoutePreserveEdgeIdsForMovedNodes(__appScope: Record<string, any>) {
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

export function createRouteSnapshotEdgesForMove(__appScope: Record<string, any>) {
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

export function createRouteTouchesExpandedBoxes(__appScope: Record<string, any>) {
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

export function createBoundsForNodeSet(__appScope: Record<string, any>) {
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

export function createMergeNodeUpdateLists(__appScope: Record<string, any>) {
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

export function createMergeUniqueEdgesById(__appScope: Record<string, any>) {
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

export function createCompleteNodeListForPartialPatch(__appScope: Record<string, any>) {
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

export function createIsWholeActiveLayerMove(__appScope: Record<string, any>) {
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

export function createInternalMoveEdgeIdsForMovedNodes(__appScope: Record<string, any>) {
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

export function createExternalMoveCandidateEdges(__appScope: Record<string, any>) {
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

export function createInternalMoveCandidateEdges(__appScope: Record<string, any>) {
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

export function createTranslateInternalMoveCandidateEdges(__appScope: Record<string, any>) {
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

export function createTranslateWholeMoveCandidateEdges(__appScope: Record<string, any>) {
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

export function createInternalRoutableLineNodeUpdatesForMove(__appScope: Record<string, any>) {
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

export function createRoutableLineRouteCandidateIdsForMovedNodes(__appScope: Record<string, any>) {
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
        orderedNodesForIds(sourceNodes, movedIds).map((node) => {
          const position = positions?.[node.id];
          return position ? { ...node, position } : node;
        })
      ).map((candidate) => expandRouteBox(candidate.box, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
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

export function createRebuildRoutableLineNodeUpdatesForChangedNodes(__appScope: Record<string, any>) {
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

export function createScheduleDeferredRoutableLineRouteRepair(__appScope: Record<string, any>) {
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
      setGraphStore((current) =>
        graphStorePatchStillCurrent(current, expectedNodeUpdates, [], [])
          ? graphStorePatchNodes(current, nodeUpdates)
          : current
      );
    }, 80, 1500);
  };
}

export function createLocalRouteOptimizationEdges(__appScope: Record<string, any>) {
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

export function createLocalRouteOptimizationCandidateEdges(__appScope: Record<string, any>) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalPositions: Record<string, Point> | undefined,
    directCandidateEdges: Edge[]
  ) => {
  const { MOVE_ROUTE_LOCAL_SEARCH_PADDING, boundsForNodeSet, edgeById, queryRouteSpatialIndex, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const collected = new Map<string, Edge>();
    const directEdgeById = new Map(directCandidateEdges.map((edge) => [edge.id, edge]));
    const addEdge = (edge: Edge | undefined) => {
      if (edge) {
        collected.set(edge.id, edge);
      }
    };
    for (const edge of directCandidateEdges) {
      addEdge(edge);
    }
    for (const edgeId of selectedEdgeIds) {
      addEdge(directEdgeById.get(edgeId) ?? edgeById.get(edgeId));
    }
    const addRoutesNearBounds = (bounds: ReturnType<typeof boundsForNodeSet>) => {
      if (!bounds) {
        return;
      }
      for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, bounds)) {
        addEdge(directEdgeById.get(route.edgeId) ?? edgeById.get(route.edgeId));
      }
    };
    addRoutesNearBounds(boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addRoutesNearBounds(boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return Array.from(collected.values());
  };
}

export function createRoutePointsForMovedNodeBlockers(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    baseRoutePoints: DraggingState["originalRoutePoints"]
  ): DraggingState["originalRoutePoints"] => {
  const { boxesOverlap, getRouteBlockingCandidateNodesFromBoxes, getRouteBlockingCandidates, orderedNodesForIds, routeRenderBounds, routeSpatialIndexRenderBounds, routedEdgeById, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const movedNodes = orderedNodesForIds(nextNodes, movedIds);
    if (movedNodes.length === 0) {
      return baseRoutePoints;
    }
    const movedCandidates = getRouteBlockingCandidates(movedNodes);
    const movedCandidateBounds = movedCandidates.reduce<{ left: number; right: number; top: number; bottom: number } | null>(
      (bounds, candidate) => {
        if (!bounds) {
          return { ...candidate.box };
        }
        return {
          left: Math.min(bounds.left, candidate.box.left),
          right: Math.max(bounds.right, candidate.box.right),
          top: Math.min(bounds.top, candidate.box.top),
          bottom: Math.max(bounds.bottom, candidate.box.bottom)
        };
      },
      null
    );
    if (!movedCandidateBounds) {
      return baseRoutePoints;
    }
    let nextRoutePoints = baseRoutePoints;
    for (const edge of candidateEdges) {
      if (baseRoutePoints[edge.id] || movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        continue;
      }
      const route = routedEdgeById.get(edge.id);
      const routeBounds = route ? routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8) : null;
      if (!route || !routeBounds || !boxesOverlap(routeBounds, movedCandidateBounds)) {
        continue;
      }
      if (getRouteBlockingCandidateNodesFromBoxes(route.points, edge, movedCandidates).length === 0) {
        continue;
      }
      if (nextRoutePoints === baseRoutePoints) {
        nextRoutePoints = { ...baseRoutePoints };
      }
      nextRoutePoints[edge.id] = route.points;
    }
    return nextRoutePoints;
  };
}

export function createRoutePointsForMovedEdgesBlockedByStationaryNodes(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    baseRoutePoints: DraggingState["originalRoutePoints"],
    bounds?: CanvasBounds
  ): DraggingState["originalRoutePoints"] => {
  const { canvasBounds, getRouteBlockingCandidateNodesFromBoxes, getRouteBlockingCandidates, routeEdgesForStoredRendering, routeIntersectsEndpointNodeBodies, routeIntersectsSpecificNodes, routingNodesForConnectionEdges } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const movedCandidateEdges = candidateEdges.filter((edge) => movedIds.has(edge.sourceId) || movedIds.has(edge.targetId));
    if (movedCandidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const routingNodes = routingNodesForConnectionEdges(movedCandidateEdges, nextNodes, movedIds);
    const stationaryNodes = routingNodes.filter((node) => !movedIds.has(node.id));
    const endpointNodeById = new Map(routingNodes.map((node) => [node.id, node]));
    if (stationaryNodes.length === 0 && endpointNodeById.size === 0) {
      return baseRoutePoints;
    }
    const stationaryCandidates = getRouteBlockingCandidates(stationaryNodes);
    const routeByEdgeId = new Map(routeEdgesForStoredRendering(
      routingNodes,
      movedCandidateEdges,
      bounds,
      { preserveManualRouteDisplay: true }
    ).map((route) => [route.edgeId, route]));
    let nextRoutePoints = baseRoutePoints;
    for (const edge of movedCandidateEdges) {
      if (baseRoutePoints[edge.id]) {
        continue;
      }
      const route = routeByEdgeId.get(edge.id);
      if (!route) {
        continue;
      }
      const endpointBlockers = [endpointNodeById.get(edge.sourceId), endpointNodeById.get(edge.targetId)].filter(Boolean);
      if (routeIntersectsEndpointNodeBodies(route.points, edge, endpointBlockers)) {
        if (nextRoutePoints === baseRoutePoints) {
          nextRoutePoints = { ...baseRoutePoints };
        }
        nextRoutePoints[edge.id] = route.points;
        continue;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, stationaryCandidates);
      if (blockers.length === 0 || !routeIntersectsSpecificNodes(route.points, edge, blockers)) {
        continue;
      }
      if (nextRoutePoints === baseRoutePoints) {
        nextRoutePoints = { ...baseRoutePoints };
      }
      nextRoutePoints[edge.id] = route.points;
    }
    return nextRoutePoints;
  };
}

export function createRoutePointsNearOriginalMovedNodes(__appScope: Record<string, any>) {
  return (
    previousNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    originalPositions: Record<string, Point> | undefined,
    baseRoutePoints: DraggingState["originalRoutePoints"]
  ): DraggingState["originalRoutePoints"] => {
  const { MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, ORIGINAL_POSITION_REROUTE_PADDING, boxesOverlap, expandRouteBox, getRouteBlockingCandidates, orderedNodesForIds, routeRenderBounds, routeSpatialIndexRenderBounds, routeTouchesExpandedBoxes, routedEdgeById, routedEdgeSpatialIndex } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (
      movedIds.size === 0 ||
      movedIds.size > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES ||
      !originalPositions ||
      candidateEdges.length === 0
    ) {
      return baseRoutePoints;
    }
    const originalMovedNodes = orderedNodesForIds(previousNodes, movedIds)
      .filter((node) => originalPositions[node.id])
      .map((node) => ({ ...node, position: originalPositions[node.id] }));
    if (originalMovedNodes.length === 0) {
      return baseRoutePoints;
    }
    const originalBoxes = getRouteBlockingCandidates(originalMovedNodes).map((candidate) =>
      expandRouteBox(candidate.box, ORIGINAL_POSITION_REROUTE_PADDING)
    );
    const originalBounds = originalBoxes.reduce<{ left: number; right: number; top: number; bottom: number } | null>(
      (bounds, box) => {
        if (!bounds) {
          return { ...box };
        }
        return {
          left: Math.min(bounds.left, box.left),
          right: Math.max(bounds.right, box.right),
          top: Math.min(bounds.top, box.top),
          bottom: Math.max(bounds.bottom, box.bottom)
        };
      },
      null
    );
    if (!originalBounds) {
      return baseRoutePoints;
    }
    let nextRoutePoints = baseRoutePoints;
    for (const edge of candidateEdges) {
      if (baseRoutePoints[edge.id] || movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        continue;
      }
      const route = routedEdgeById.get(edge.id);
      const routeBounds = route ? routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8) : null;
      if (!route || !routeBounds || !boxesOverlap(routeBounds, originalBounds)) {
        continue;
      }
      if (!routeTouchesExpandedBoxes(route.points, originalBoxes)) {
        continue;
      }
      if (nextRoutePoints === baseRoutePoints) {
        nextRoutePoints = { ...baseRoutePoints };
      }
      nextRoutePoints[edge.id] = route.points;
    }
    return nextRoutePoints;
  };
}

export function createAdjustEdgesAfterNodeMove(__appScope: Record<string, any>) {
  return (
    currentEdges: Edge[],
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    deltasByNode: Record<string, Point>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {},
    preserveRouteEdgeIds = new Set<string>(),
    bounds?: CanvasBounds
  ) => {
  const { allowAutoExpandCanvas, canvasBounds, clampEdgeGeometryToExpandableBounds, clampNodePositionToExpandableBounds, hasCanvasOriginShift, isBusNode, leftTopCanvasOriginShiftForContent, manualPointDeltaForEdge, nodeById, nodes, preserveConnectionEdgeRouteShape, resolveStraightBusSlideEndpoint, routingNodesForConnectionEdge, sameOptionalPoint, sameOptionalPointList } = __appScope;
    if (bounds === undefined) {
      bounds = canvasBounds;
    }
    const movedBusIds = new Set<string>();
    const movedNextNodeById = new Map<string, ModelNode>();
    for (const movedNodeId of movedNodeIds) {
      const node = nodeById.get(movedNodeId);
      if (node && isBusNode(node)) {
        movedBusIds.add(movedNodeId);
      }
      const delta = deltasByNode[movedNodeId];
      if (node && delta) {
        movedNextNodeById.set(
          movedNodeId,
          { ...node, position: clampNodePositionToExpandableBounds(node, bounds, { x: node.position.x + delta.x, y: node.position.y + delta.y }) }
        );
      }
    }
    const nextNodeForEndpoint = (nodeId: string) => movedNextNodeById.get(nodeId) ?? nodeById.get(nodeId);
    const preserveAffectedRoutesForCanvasOriginShift =
      allowAutoExpandCanvas && hasCanvasOriginShift(leftTopCanvasOriginShiftForContent(Array.from(movedNextNodeById.values())));
    let changed = false;
    const nextEdges = currentEdges.map((edge) => {
      const sourceMoved = movedNodeIds.has(edge.sourceId);
      const targetMoved = movedNodeIds.has(edge.targetId);
      if (!sourceMoved && !targetMoved && !preserveRouteEdgeIds.has(edge.id)) {
        return edge;
      }
      const originalPoints = originalEdgePoints[edge.id];
      const sourceDelta = movedBusIds.has(edge.sourceId) ? deltasByNode[edge.sourceId] : undefined;
      const targetDelta = movedBusIds.has(edge.targetId) ? deltasByNode[edge.targetId] : undefined;
      const manualDelta = manualPointDeltaForEdge(edge, deltasByNode);
      const baseEdge = {
        ...edge,
        sourcePoint: sourceDelta && originalPoints?.sourcePoint
          ? { x: originalPoints.sourcePoint.x + sourceDelta.x, y: originalPoints.sourcePoint.y + sourceDelta.y }
          : edge.sourcePoint,
        targetPoint: targetDelta && originalPoints?.targetPoint
          ? { x: originalPoints.targetPoint.x + targetDelta.x, y: originalPoints.targetPoint.y + targetDelta.y }
          : edge.targetPoint,
        manualPoints: manualDelta && originalPoints?.manualPoints
          ? originalPoints.manualPoints.map((point) => ({ x: point.x + manualDelta.x, y: point.y + manualDelta.y }))
          : edge.manualPoints
      };
      const originalSource = nodeById.get(edge.sourceId);
      const originalTarget = nodeById.get(edge.targetId);
      const nextSource = nextNodeForEndpoint(edge.sourceId);
      const nextTarget = nextNodeForEndpoint(edge.targetId);
      const previousSlideNodes = routingNodesForConnectionEdge(edge, nodes);
      const nextSlideNodes = routingNodesForConnectionEdge(baseEdge, nextNodes);
      const slidePatch =
        sourceMoved !== targetMoved && originalSource && originalTarget && nextSource && nextTarget
          ? resolveStraightBusSlideEndpoint({
              edge: baseEdge,
              sourceNode: originalSource,
              targetNode: originalTarget,
              nextSourceNode: nextSource,
              nextTargetNode: nextTarget,
              movingEndpoint: sourceMoved ? "source" : "target",
              nodes: previousSlideNodes,
              nextNodes: nextSlideNodes
            })
          : null;
      const nextEdgeWithSlide = slidePatch ? { ...baseEdge, ...slidePatch } : baseEdge;
      const originalRoute = originalRoutePoints[edge.id];
      const shouldPreserveRoute = originalRoute?.length && (
        preserveRouteEdgeIds.has(edge.id) ||
        Boolean(edge.manualPoints?.length) ||
        (preserveAffectedRoutesForCanvasOriginShift && (sourceMoved || targetMoved))
      );
      const nextEdge = shouldPreserveRoute && nextSource && nextTarget
        ? (() => {
            const routeDelta = preserveRouteEdgeIds.has(edge.id) ? manualPointDeltaForEdge(edge, deltasByNode) ?? undefined : undefined;
            return preserveConnectionEdgeRouteShape(nextSlideNodes, nextEdgeWithSlide, originalRoute, bounds, { routeDelta });
          })()
        : nextEdgeWithSlide;
      const boundedNextEdge = clampEdgeGeometryToExpandableBounds(nextEdge, bounds);
      if (
        sameOptionalPoint(boundedNextEdge.sourcePoint, edge.sourcePoint) &&
        sameOptionalPoint(boundedNextEdge.targetPoint, edge.targetPoint) &&
        sameOptionalPointList(boundedNextEdge.manualPoints, edge.manualPoints)
      ) {
        return edge;
      }
      changed = true;
      return boundedNextEdge;
    });
    return changed ? nextEdges : currentEdges;
  };
}

export function createRebuildSingleAffectedConnectionRoute(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds = new Set<string>(),
    searchEdges: Edge[] = candidateEdges
  ) => {
  const { canvasBounds, editModeRouteRebuildOptions, rebuildExternalConnectionRoutesForMovedNodes, rebuildSingleConnectionRoute, routingNodesForConnectionEdge } = __appScope;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size !== 1) {
      return candidateEdges;
    }
    const affectedEdgeIds = searchEdges
      .filter((edge) => movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id))
      .map((edge) => edge.id);
    if (affectedEdgeIds.length !== 1) {
      return candidateEdges;
    }
    const affectedEdge = searchEdges.find((edge) => edge.id === affectedEdgeIds[0]);
    const routingNodes = affectedEdge ? routingNodesForConnectionEdge(affectedEdge, nextNodes) : nextNodes;
    if (affectedEdge && (movedIds.has(affectedEdge.sourceId) || movedIds.has(affectedEdge.targetId))) {
      return rebuildExternalConnectionRoutesForMovedNodes(
        routingNodes,
        candidateEdges,
        movedNodeIds,
        canvasBounds,
        [affectedEdge],
        editModeRouteRebuildOptions
      );
    }
    return rebuildSingleConnectionRoute(routingNodes, candidateEdges, affectedEdgeIds[0], canvasBounds, editModeRouteRebuildOptions);
  };
}

export function createSynchronousEdgeAdjustmentCandidates(__appScope: Record<string, any>) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIdsInput: Iterable<string> = [],
    movedBusNodeIdsInput: Iterable<string> = [],
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
  const { reuseSetOrCreate, shouldAdjustEdgeSynchronouslyAfterMove } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const selectedEdgeIds = reuseSetOrCreate(selectedEdgeIdsInput);
    const movedBusNodeIds = reuseSetOrCreate(movedBusNodeIdsInput);
    return candidateEdges.filter((edge) =>
      shouldAdjustEdgeSynchronouslyAfterMove(edge, movedIds, selectedEdgeIds, movedBusNodeIds, originalRoutePoints)
    );
  };
}

export function createShouldAdjustEdgeSynchronouslyAfterMove(__appScope: Record<string, any>) {
  return (
    edge: Edge,
    movedNodeIds: Set<string>,
    selectedEdgeIds: Set<string>,
    movedBusNodeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    return (
      selectedEdgeIds.has(edge.id) ||
      (sourceMoved && targetMoved) ||
      Boolean(edge.manualPoints?.length) ||
      movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId) ||
      Boolean(originalRoutePoints[edge.id]?.length)
    );
  };
}

export function createMergeAdjustedCandidateEdges(__appScope: Record<string, any>) {
  return (candidateEdges: Edge[], adjustedCandidateEdges: Edge[]) => {
    if (adjustedCandidateEdges.length === 0) {
      return candidateEdges;
    }
    const adjustedEdgeById = new Map(adjustedCandidateEdges.map((edge) => [edge.id, edge]));
    let changed = false;
    const mergedEdges = candidateEdges.map((edge) => {
      const adjusted = adjustedEdgeById.get(edge.id);
      if (!adjusted) {
        return edge;
      }
      if (adjusted !== edge) {
        changed = true;
      }
      return adjusted;
    });
    return changed ? mergedEdges : candidateEdges;
  };
}

export function createTerminalReconcileNodeScope(__appScope: Record<string, any>) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>
  ) => {
  const { MOVE_ROUTE_LOCAL_SEARCH_PADDING, boundsForNodeSet, orderedNodesForIds, queryNodeSpatialIndex, visibleNodeSpatialIndex } = __appScope;
    const scopedNodeIds = new Set<string>(movedNodeIds);
    const addNodesNear = (bounds: ReturnType<typeof boundsForNodeSet>) => {
      if (!bounds) {
        return;
      }
      for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, bounds)) {
        scopedNodeIds.add(node.id);
      }
    };
    addNodesNear(boundsForNodeSet(previousNodes, movedNodeIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addNodesNear(boundsForNodeSet(nextNodes, movedNodeIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return {
      previous: orderedNodesForIds(previousNodes, scopedNodeIds),
      next: orderedNodesForIds(nextNodes, scopedNodeIds)
    };
  };
}

export function createFinalizeMovedNodeEdgesFast(__appScope: Record<string, any>) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    localCandidateEdges: Edge[] = candidateEdges
  ) => {
  const { canvasBounds, prepareConnectionEdgeForCommit, reconcileOverlappingTerminalConnections, routedEdges, routingNodesForConnectionEdge, terminalReconcileNodeScope } = __appScope;
    const movedNodeIdSet = new Set(movedNodeIds);
    const reconcileNodes = terminalReconcileNodeScope(previousNodes, nextNodes, movedNodeIdSet);
    const reconciled = reconcileOverlappingTerminalConnections(
      reconcileNodes.previous,
      reconcileNodes.next,
      candidateEdges,
      (_first, _second, index) => `edge-overlap-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      movedNodeIdSet,
      localCandidateEdges
    );
    let nextEdges = reconciled.edges;
    for (const edgeId of reconciled.addedEdgeIds) {
      const edge = nextEdges.find((item) => item.id === edgeId);
      if (!edge) {
        continue;
      }
      const prepared = prepareConnectionEdgeForCommit(routingNodesForConnectionEdge(edge, nextNodes), [edge], edgeId, canvasBounds, routedEdges);
      if (prepared.ok && prepared.edge) {
        nextEdges = nextEdges.map((edge) => edge.id === edgeId ? prepared.edge! : edge);
      }
    }
    return nextEdges;
  };
}

export function createOptimizeMovedNodeEdgeRoutes(__appScope: Record<string, any>) {
  return (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    precomputedBlockedRoutePoints: DraggingState["originalRoutePoints"] = {},
    forcedRerouteEdgeIds = new Set<string>(),
    routeSearchEdges: Edge[] = candidateEdges
  ) => {
  const { canvasBounds, editModeRouteRebuildOptions, rebuildSingleAffectedConnectionRoute, rerouteEdgesAroundMovedNodes, routePointSnapshotToRoutes, routePointsForMovedNodeBlockers, routingNodesForConnectionEdges } = __appScope;
    const hasPrecomputedBlockers = Object.keys(precomputedBlockedRoutePoints).length > 0;
    const routePointsForReroute = hasPrecomputedBlockers
      ? precomputedBlockedRoutePoints
      : routePointsForMovedNodeBlockers(
          nextNodes,
          routeSearchEdges,
          movedNodeIds,
          originalRoutePoints
        );
    const rebuiltAdjustedEdges = hasPrecomputedBlockers && forcedRerouteEdgeIds.size === 0
      ? candidateEdges
      : rebuildSingleAffectedConnectionRoute(
          nextNodes,
          candidateEdges,
          movedNodeIds,
          selectedEdgeIds,
          routeSearchEdges
        );
    if (Object.keys(routePointsForReroute).length === 0 && forcedRerouteEdgeIds.size === 0) {
      return {
        routePoints: routePointsForReroute,
        edges: rebuiltAdjustedEdges
      };
    }
    return {
      routePoints: routePointsForReroute,
      edges: rerouteEdgesAroundMovedNodes(
        routingNodesForConnectionEdges(routeSearchEdges, nextNodes, movedNodeIds),
        rebuiltAdjustedEdges,
        movedNodeIds,
        routePointSnapshotToRoutes(routePointsForReroute),
        canvasBounds,
        forcedRerouteEdgeIds,
        routeSearchEdges,
        editModeRouteRebuildOptions
      )
    };
  };
}

export function createShouldRunDeferredMoveOptimization(__appScope: Record<string, any>) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    blockedEdgeIds = new Set<string>()
  ) => {
    if (blockedEdgeIds.size > 0) {
      return true;
    }
    const movedIds = new Set(movedNodeIds);
    if (candidateEdges.some((edge) =>
      !movedIds.has(edge.sourceId) && !movedIds.has(edge.targetId) && !selectedEdgeIds.has(edge.id)
    )) {
      return true;
    }
    let affectedConnectionCount = 0;
    for (const edge of candidateEdges) {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)) {
        affectedConnectionCount += 1;
        if (affectedConnectionCount > 1) {
          return false;
        }
      }
    }
    return affectedConnectionCount === 1;
  };
}

export function createScheduleMovedEdgeOptimization(__appScope: Record<string, any>) {
  return (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    fastEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    originalPositions?: Record<string, Point>,
    moveCandidateEdges: Edge[] = [],
    expectedPatch?: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] }
  ) => {
  const { MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, deferredMoveOptimizationCancelRef, graphStorePatchEdges, graphStorePatchStillCurrent, latestEdgesRef, latestGraphStoreRef, latestNodesRef, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, optimizeMovedNodeEdgeRoutes, routePointsForMovedNodeBlockers, routePointsNearOriginalMovedNodes, scheduleIdleWork, setGraphStore, shouldRunDeferredMoveOptimization } = __appScope;
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const routeCandidateEdges = moveCandidateEdges.length > 0
      ? moveCandidateEdges
      : localRouteOptimizationCandidateEdges(
          previousNodes,
          nextNodes,
          movedNodeIds,
          selectedEdgeIds,
          originalPositions,
          moveCandidateEdges
        );
    const optimizationEdges = localRouteOptimizationEdges(
      previousNodes,
      nextNodes,
      routeCandidateEdges,
      movedNodeIds,
      selectedEdgeIds,
      originalPositions
    );
    if (
      optimizationEdges.length === 0 ||
      !shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds)
    ) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const optimizationEdgeIds = optimizationEdges.map((edge) => edge.id);
    deferredMoveOptimizationCancelRef.current = scheduleIdleWork(() => {
      deferredMoveOptimizationCancelRef.current = null;
      const latestStore = latestGraphStoreRef.current;
      if (!latestStore) {
        return;
      }
      if (expectedPatch) {
        if (!graphStorePatchStillCurrent(latestStore, expectedPatch.nodeUpdates, expectedPatch.edgeUpserts, expectedPatch.edgeDeleteIds)) {
          return;
        }
      } else if (latestNodesRef.current !== nextNodes || latestEdgesRef.current !== fastEdges) {
        return;
      }
      const expectedNodes = latestStore.nodes;
      const latestOptimizationEdges = optimizationEdgeIds.flatMap((edgeId) => {
        const edge = latestStore.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      });
      if (latestOptimizationEdges.length === 0) {
        return;
      }
      const blockedRoutePoints = routePointsForMovedNodeBlockers(expectedNodes, latestOptimizationEdges, movedNodeIds, {});
      const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));
      const routePointsForOptimization = routePointsNearOriginalMovedNodes(
        previousNodes,
        latestOptimizationEdges,
        movedNodeIds,
        originalPositions,
        blockedRoutePoints
      );
      const releasedEdgeIds = Object.keys(routePointsForOptimization).filter((edgeId) => !blockedRoutePoints[edgeId]);
      const forcedRerouteEdgeIds = new Set(releasedEdgeIds);
      for (const edgeId of releasedEdgeIds) {
        blockedEdgeIds.add(edgeId);
      }
      if (!shouldRunDeferredMoveOptimization(latestOptimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)) {
        return;
      }
      const optimized = optimizeMovedNodeEdgeRoutes(
        expectedNodes,
        latestOptimizationEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds,
        routePointsForOptimization,
        forcedRerouteEdgeIds,
        latestOptimizationEdges
      );
      if (optimized.edges === latestOptimizationEdges) {
        return;
      }
      const dirtyOptimizedEdgeIds = new Set<string>([...blockedEdgeIds, ...forcedRerouteEdgeIds]);
      for (const edgeId of Object.keys(optimized.routePoints)) {
        dirtyOptimizedEdgeIds.add(edgeId);
      }
      const previousOptimizedEdgeById = new Map(latestOptimizationEdges.map((edge) => [edge.id, edge]));
      const optimizedEdgeById = new Map(optimized.edges.map((edge) => [edge.id, edge]));
      const optimizedEdgeUpdates: Edge[] = [];
      for (const edgeId of dirtyOptimizedEdgeIds) {
        const optimizedEdge = optimizedEdgeById.get(edgeId);
        if (optimizedEdge && previousOptimizedEdgeById.get(edgeId) !== optimizedEdge) {
          optimizedEdgeUpdates.push(optimizedEdge);
        }
      }
      if (optimizedEdgeUpdates.length === 0) {
        return;
      }
      markRouteEdgesDirty(dirtyOptimizedEdgeIds);
      markStoredRouteEdgesDirty(dirtyOptimizedEdgeIds);
      setGraphStore((current) => graphStorePatchEdges(current, optimizedEdgeUpdates));
    }, 180, 1500);
  };
}

export function createScheduleDeferredMovedConnectionRepair(__appScope: Record<string, any>) {
  return (
    movedNodeIds: string[],
    candidateEdges: Edge[],
    expectedPatch: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] },
    effectiveCanvasBounds?: CanvasBounds,
    previousNodesForMove: ModelNode[] = [],
    originalPositions?: Record<string, Point>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {},
    selectedEdgeIds = new Set<string>(),
    options: SingleNodeDeferredRepairOptions = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES, busTerminalSyncNodeIdsForGraphPatch, canvasBounds, canvasBoundsForAutoExpandedGraphContent, deferredMoveOptimizationCancelRef, edgePatchFromCandidateEdges, finalizeMovedNodeEdgesFast, graphStoreApplyPatch, graphStorePatchStillCurrent, latestGraphStoreRef, markBusTerminalSyncDirty, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, optimizeMovedNodeEdgeRoutes, routePointsForMovedEdgesBlockedByStationaryNodes, routePointsForMovedNodeBlockers, routePointsNearOriginalMovedNodes, scheduleIdleWork, setGraphStore } = __appScope;
    if (effectiveCanvasBounds === undefined) {
      effectiveCanvasBounds = canvasBounds;
    }
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length === 0 || candidateEdges.length === 0) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    if (
      movedNodeIds.length > MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES ||
      candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES
    ) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const candidateEdgeIds = candidateEdges.map((edge) => edge.id);
    deferredMoveOptimizationCancelRef.current = scheduleIdleWork(() => {
      deferredMoveOptimizationCancelRef.current = null;
      const latestStore = latestGraphStoreRef.current;
      if (!latestStore || !graphStorePatchStillCurrent(latestStore, expectedPatch.nodeUpdates, expectedPatch.edgeUpserts, expectedPatch.edgeDeleteIds)) {
        return;
      }
      const latestNodes = latestStore.nodes;
      const latestCandidateEdges = candidateEdgeIds.flatMap((edgeId) => {
        const edge = latestStore.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      });
      if (latestCandidateEdges.length === 0) {
        return;
      }
      let workingCandidateEdges = latestCandidateEdges;
      const dirtyDeferredEdgeIds = new Set<string>();
      if (options.reconcileTerminalConnections) {
        const finalizedEdges = finalizeMovedNodeEdgesFast(
          previousNodesForMove.length > 0 ? previousNodesForMove : latestNodes,
          latestNodes,
          workingCandidateEdges,
          movedNodeIds,
          workingCandidateEdges
        );
        if (finalizedEdges !== workingCandidateEdges) {
          const terminalPatch = edgePatchFromCandidateEdges(workingCandidateEdges, finalizedEdges);
          for (const edge of terminalPatch.edgeUpserts) {
            dirtyDeferredEdgeIds.add(edge.id);
          }
          for (const edgeId of terminalPatch.edgeDeleteIds) {
            dirtyDeferredEdgeIds.add(edgeId);
          }
          workingCandidateEdges = finalizedEdges;
        }
      }
      const repairCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
        effectiveCanvasBounds,
        [],
        workingCandidateEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      const movedBlockerRoutePoints = routePointsForMovedNodeBlockers(latestNodes, workingCandidateEdges, movedNodeIds, {});
      const stationaryBlockerRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        latestNodes,
        workingCandidateEdges,
        movedNodeIds,
        movedBlockerRoutePoints,
        repairCanvasBounds
      );
      const blockerRoutePoints = { ...movedBlockerRoutePoints, ...stationaryBlockerRoutePoints };
      const repairRoutePoints = previousNodesForMove.length > 0
        ? routePointsNearOriginalMovedNodes(
            previousNodesForMove,
            workingCandidateEdges,
            movedNodeIds,
            originalPositions,
            blockerRoutePoints
          )
        : blockerRoutePoints;
      const repairEdgeIds = new Set(Object.keys(repairRoutePoints));
      let optimizedEdges = workingCandidateEdges;
      if (repairEdgeIds.size > 0) {
        const repairCandidateEdges = workingCandidateEdges.filter((edge) => repairEdgeIds.has(edge.id));
        const optimized = optimizeMovedNodeEdgeRoutes(
          latestNodes,
          workingCandidateEdges,
          movedNodeIds,
          originalRoutePoints,
          selectedEdgeIds,
          repairRoutePoints,
          repairEdgeIds,
          repairCandidateEdges
        );
        optimizedEdges = optimized.edges;
        for (const edgeId of repairEdgeIds) {
          dirtyDeferredEdgeIds.add(edgeId);
        }
      }
      const deferredEdgePatch = edgePatchFromCandidateEdges(latestCandidateEdges, optimizedEdges);
      if (deferredEdgePatch.edgeUpserts.length === 0 && deferredEdgePatch.edgeDeleteIds.length === 0) {
        return;
      }
      for (const edge of deferredEdgePatch.edgeUpserts) {
        dirtyDeferredEdgeIds.add(edge.id);
      }
      for (const edgeId of deferredEdgePatch.edgeDeleteIds) {
        dirtyDeferredEdgeIds.add(edgeId);
      }
      markRouteEdgesDirty(dirtyDeferredEdgeIds);
      markStoredRouteEdgesDirty(dirtyDeferredEdgeIds);
      markBusTerminalSyncDirty(
        busTerminalSyncNodeIdsForGraphPatch(
          movedNodeIds,
          latestCandidateEdges,
          deferredEdgePatch.edgeUpserts,
          deferredEdgePatch.edgeDeleteIds
        )
      );
      markGraphDirtyForInteractiveCommit();
      setGraphStore((current) =>
        graphStoreApplyPatch(current, {
          edgeUpserts: deferredEdgePatch.edgeUpserts,
          edgeDeleteIds: deferredEdgePatch.edgeDeleteIds
        })
      );
    }, 60, 1500);
  };
}

export function createMoveRouteRepairSeedEdges(__appScope: Record<string, any>) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
  const { MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, busNodeIdSet, reuseSetOrCreate } = __appScope;
    if (candidateEdges.length <= MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES) {
      return candidateEdges;
    }
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const movedBusNodeIds = new Set(movedNodeIds.filter((nodeId) => busNodeIdSet.has(nodeId)));
    return candidateEdges.filter((edge) => {
      const sourceMoved = movedIds.has(edge.sourceId);
      const targetMoved = movedIds.has(edge.targetId);
      return (
        selectedEdgeIds.has(edge.id) ||
        Boolean(originalRoutePoints[edge.id]?.length) ||
        Boolean(edge.manualPoints?.length) ||
        (sourceMoved && targetMoved) ||
        movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)
      );
    });
  };
}

export function createLightweightMovedEndpointRoute(__appScope: Record<string, any>) {
  return (
    edge: Edge,
    previousRoute: RoutedEdge,
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>,
    bounds: CanvasBounds
  ): RoutedEdge | null => {
  const { clampPointToBounds, getModelEdgeEndpointPoint, getRouteBlockingCandidateNodesFromBoxes, getRouteBlockingCandidates, getRouteEndpointNormal, isBusNode, nodeForRoutingList, pointsToOrthogonalPath, preserveDraggedRouteShape, routeEdgesForStoredRendering, routeIntersectsEndpointNodeBodies, routeIntersectsSpecificNodes, sameOptionalPointList } = __appScope;
    if (previousRoute.points.length < 2) {
      return null;
    }
    const source = nodeForRoutingList(nextNodes, edge.sourceId);
    const target = nodeForRoutingList(nextNodes, edge.targetId);
    if (!source || !target) {
      return null;
    }
    const originalStart = previousRoute.points[0];
    const originalEnd = previousRoute.points[previousRoute.points.length - 1];
    if (!originalStart || !originalEnd) {
      return null;
    }
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    if (!sourceMoved && !targetMoved) {
      return null;
    }
    const sourceEndpointPoint = !sourceMoved && isBusNode(source) && !edge.sourcePoint ? originalStart : edge.sourcePoint;
    const targetEndpointPoint = !targetMoved && isBusNode(target) && !edge.targetPoint ? originalEnd : edge.targetPoint;
    const nextStart = getModelEdgeEndpointPoint(source, sourceEndpointPoint, edge.sourceTerminalId);
    const nextEnd = getModelEdgeEndpointPoint(target, targetEndpointPoint, edge.targetTerminalId);
    const sourceNormal = getRouteEndpointNormal(source, nextStart, nextEnd, edge.sourceTerminalId);
    const targetNormal = getRouteEndpointNormal(target, nextEnd, nextStart, edge.targetTerminalId);
    const preservedPoints = preserveDraggedRouteShape({
      routePoints: previousRoute.points,
      nextStart,
      nextEnd,
      sourceDelta: sourceMoved ? { x: nextStart.x - originalStart.x, y: nextStart.y - originalStart.y } : { x: 0, y: 0 },
      targetDelta: targetMoved ? { x: nextEnd.x - originalEnd.x, y: nextEnd.y - originalEnd.y } : { x: 0, y: 0 },
      sourceNormal,
      targetNormal
    }).map((point) => clampPointToBounds(point, bounds));
    const routeEdge = {
      ...edge,
      sourcePoint: isBusNode(source) ? sourceEndpointPoint ?? nextStart : edge.sourcePoint,
      targetPoint: isBusNode(target) ? targetEndpointPoint ?? nextEnd : edge.targetPoint,
      routePoints: preservedPoints,
      manualPoints: preservedPoints.length > 2 ? preservedPoints.slice(1, -1) : undefined
    };
    const repairedRoute = routeEdgesForStoredRendering([source, target], [routeEdge], bounds)[0];
    const points = (repairedRoute?.points ?? preservedPoints).map((point) => clampPointToBounds(point, bounds));
    const endpointBlockers = [source, target];
    if (routeIntersectsEndpointNodeBodies(points, routeEdge, endpointBlockers)) {
      return null;
    }
    const blockers = getRouteBlockingCandidateNodesFromBoxes(points, routeEdge, getRouteBlockingCandidates(nextNodes));
    if (blockers.length > 0 && routeIntersectsSpecificNodes(points, routeEdge, blockers)) {
      return null;
    }
    const path = pointsToOrthogonalPath(points);
    return sameOptionalPointList(points, previousRoute.points) && path === previousRoute.path
      ? previousRoute
      : { ...previousRoute, points, path };
  };
}

export function createPatchCachedRoutesForHighFanoutMove(__appScope: Record<string, any>) {
  return (
    previousCandidateEdges: Edge[],
    committedCandidateEdges: Edge[],
    movedNodeIds: string[],
    nextNodes: ModelNode[],
    bounds: CanvasBounds
  ) => {
  const { cachedRouteStoreRef, cachedRoutedEdgesRef, lightweightMovedEndpointRoute, routeStorePatchRoutes, shouldPatchRouteCacheForHighFanoutMove } = __appScope;
    if (!shouldPatchRouteCacheForHighFanoutMove(movedNodeIds, previousCandidateEdges)) {
      return new Set<string>();
    }
    const routeStore = cachedRouteStoreRef.current;
    if (!routeStore || routeStore.routes.length === 0) {
      return new Set<string>();
    }
    const movedIds = new Set(movedNodeIds);
    const committedEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
    const routeUpdates: RoutedEdge[] = [];
    const patchedEdgeIds = new Set<string>();
    for (const previousEdge of previousCandidateEdges) {
      if (!movedIds.has(previousEdge.sourceId) && !movedIds.has(previousEdge.targetId)) {
        continue;
      }
      const edge = committedEdgeById.get(previousEdge.id) ?? previousEdge;
      const previousRoute = routeStore.routeMap.get(edge.id);
      if (!previousRoute) {
        continue;
      }
      const nextRoute = lightweightMovedEndpointRoute(edge, previousRoute, nextNodes, movedIds, bounds);
      if (!nextRoute || nextRoute === previousRoute) {
        continue;
      }
      routeUpdates.push(nextRoute);
      patchedEdgeIds.add(edge.id);
    }
    if (routeUpdates.length === 0) {
      return patchedEdgeIds;
    }
    const patchedRouteStore = routeStorePatchRoutes(routeStore, routeUpdates);
    cachedRouteStoreRef.current = patchedRouteStore;
    cachedRoutedEdgesRef.current = patchedRouteStore.routes;
    return patchedEdgeIds;
  };
}

export function createPatchCachedRoutesForBulkTranslation(__appScope: Record<string, any>) {
  return (
    edgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD, cachedRouteStoreRef, cachedRoutedEdgesRef, createRouteStore, hasCanvasOriginShift, reuseSetOrCreate, routeStorePatchRoutesById, store, translateRouteBy } = __appScope;
    const routeStore = cachedRouteStoreRef.current;
    const ids = reuseSetOrCreate(edgeIds);
    if (!hasCanvasOriginShift(delta) || ids.size === 0 || !routeStore || routeStore.routes.length === 0) {
      return { patchedEdgeIds: new Set<string>(), durationMs: 0 };
    }
    const start = performance.now();
    const shouldRebuildRouteStore =
      ids.size >= ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD &&
      ids.size / routeStore.routes.length >= 0.5;
    if (shouldRebuildRouteStore) {
      const patchedEdgeIds = new Set<string>();
      const routeUpdates: RoutedEdge[] = [];
      const nextRoutes = routeStore.routes.map((route) => {
        if (!ids.has(route.edgeId)) {
          return route;
        }
        const nextRoute = translateRouteBy(route, delta);
        patchedEdgeIds.add(route.edgeId);
        routeUpdates.push(nextRoute);
        return nextRoute;
      });
      if (routeUpdates.length === 0) {
        return { patchedEdgeIds, durationMs: performance.now() - start };
      }
      const patchedRouteStore = createRouteStore(nextRoutes);
      cachedRouteStoreRef.current = patchedRouteStore;
      cachedRoutedEdgesRef.current = patchedRouteStore.routes;
      return { patchedEdgeIds, durationMs: performance.now() - start };
    }
    const { store: patchedRouteStore, patchedEdgeIds } = routeStorePatchRoutesById(
      routeStore,
      ids,
      (route) => translateRouteBy(route, delta)
    );
    if (patchedEdgeIds.size === 0) {
      return { patchedEdgeIds, durationMs: performance.now() - start };
    }
    cachedRouteStoreRef.current = patchedRouteStore;
    cachedRoutedEdgesRef.current = patchedRouteStore.routes;
    return { patchedEdgeIds, durationMs: performance.now() - start };
  };
}

export function createPatchCachedRoutesForWholeMove(__appScope: Record<string, any>) {
  return (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { patchCachedRoutesForBulkTranslation, reuseSetOrCreate } = __appScope;
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const selectedIds = reuseSetOrCreate(selectedEdgeIds);
    const routeEdgeIds = new Set<string>();
    for (const edge of candidateEdges) {
      if (!selectedIds.has(edge.id) && (!movedIds.has(edge.sourceId) || !movedIds.has(edge.targetId))) {
        continue;
      }
      routeEdgeIds.add(edge.id);
    }
    return patchCachedRoutesForBulkTranslation(routeEdgeIds, delta).patchedEdgeIds;
  };
}

export function createPatchCachedRoutesForInternalMove(__appScope: Record<string, any>) {
  return (
    candidateEdges: Edge[],
    internalMovedEdgeIds: Iterable<string>,
    delta: Point
  ) => {
  const { hasCanvasOriginShift, patchCachedRoutesForBulkTranslation, reuseSetOrCreate } = __appScope;
    if (!hasCanvasOriginShift(delta)) {
      return new Set<string>();
    }
    const internalIds = reuseSetOrCreate(internalMovedEdgeIds);
    if (internalIds.size === 0) {
      return new Set<string>();
    }
    const routeEdgeIds = new Set<string>();
    for (const edge of candidateEdges) {
      if (internalIds.has(edge.id)) {
        routeEdgeIds.add(edge.id);
      }
    }
    return patchCachedRoutesForBulkTranslation(routeEdgeIds, delta).patchedEdgeIds;
  };
}

export function createStoredRouteDirtyIdsForMove(__appScope: Record<string, any>) {
  return (dirtyEdgeIds: Set<string>, routeCachePatchedEdgeIds: Set<string>) => {
    if (routeCachePatchedEdgeIds.size === 0) {
      return dirtyEdgeIds;
    }
    const storedDirty = new Set<string>();
    for (const edgeId of dirtyEdgeIds) {
      if (!routeCachePatchedEdgeIds.has(edgeId)) {
        storedDirty.add(edgeId);
      }
    }
    if (storedDirty.size === 0) {
      const firstPatchedEdgeId = routeCachePatchedEdgeIds.values().next().value;
      if (firstPatchedEdgeId) {
        storedDirty.add(firstPatchedEdgeId);
      }
    }
    return storedDirty;
  };
}

export function createBuildBulkMovePlan(__appScope: Record<string, any>) {
  return (
    committedCandidateEdges: Edge[],
    internalMovedEdgeIds: Set<string>,
    wholeLayerMove: boolean,
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"],
    previousNodes: ModelNode[],
    committedNextNodes: ModelNode[],
    originalPositions?: Record<string, Point>
  ): BulkMovePlan => {
  const { CANVAS_BULK_MOVE_EDGE_THRESHOLD, externalMoveCandidateEdges, internalMoveCandidateEdges, localRouteOptimizationCandidateEdges, mergeUniqueEdgesById, moveRouteRepairSeedEdges } = __appScope;
    const internalCandidateEdges = internalMoveCandidateEdges(committedCandidateEdges, internalMovedEdgeIds);
    const boundaryCandidateEdges = externalMoveCandidateEdges(committedCandidateEdges, internalMovedEdgeIds);
    const pureInternalBulkMove =
      !wholeLayerMove &&
      internalMovedEdgeIds.size >= CANVAS_BULK_MOVE_EDGE_THRESHOLD &&
      boundaryCandidateEdges.length === 0;
    const kind: BulkMovePlan["kind"] =
      wholeLayerMove || pureInternalBulkMove
        ? "rigid"
        : internalMovedEdgeIds.size >= CANVAS_BULK_MOVE_EDGE_THRESHOLD
          ? "hybrid"
          : "none";
    const skipInternalRepair = wholeLayerMove || internalMovedEdgeIds.size >= CANVAS_BULK_MOVE_EDGE_THRESHOLD;
    const skipRouteRepairSearch = wholeLayerMove || pureInternalBulkMove;
    const routeRepairSeedEdges = skipRouteRepairSearch
      ? []
      : moveRouteRepairSeedEdges(
          boundaryCandidateEdges,
          movedNodeIds,
          selectedEdgeIds,
          originalRoutePoints
        );
    const rawRouteRepairCandidateEdges = skipRouteRepairSearch
      ? []
      : localRouteOptimizationCandidateEdges(
          previousNodes,
          committedNextNodes,
          movedNodeIds,
          selectedEdgeIds,
          originalPositions,
          routeRepairSeedEdges
        );
    const routeRepairCandidateEdges = skipInternalRepair
      ? externalMoveCandidateEdges(rawRouteRepairCandidateEdges, internalMovedEdgeIds)
      : rawRouteRepairCandidateEdges;
    const internalRepairCandidateEdges = skipInternalRepair ? [] : internalCandidateEdges;
    const legacyDeferredRepairCandidateEdges = mergeUniqueEdgesById(rawRouteRepairCandidateEdges, internalCandidateEdges);
    const deferredRepairCandidateEdges = mergeUniqueEdgesById(routeRepairCandidateEdges, internalRepairCandidateEdges);
    return {
      kind,
      internalEdgeIds: internalMovedEdgeIds,
      internalCandidateEdges,
      boundaryCandidateEdges,
      internalRepairCandidateEdges,
      routeRepairSeedEdges,
      routeRepairCandidateEdges,
      deferredRepairCandidateEdges,
      legacyDeferredRepairCandidateCount: legacyDeferredRepairCandidateEdges.length
    };
  };
}

export function createCommitFastMovedGraphPatches(__appScope: Record<string, any>) {
  return (
    movedNodeUpdates: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    previousCandidateEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    originalPositions?: Record<string, Point>,
    previousNodes?: ModelNode[],
    effectiveCanvasBounds?: CanvasBounds,
    options: FastMovedGraphCommitOptions = {}
  ) => {
  const { CANVAS_AUTO_EXPAND_PADDING, allowAutoExpandCanvas, applyCanvasBounds, buildBulkMovePlan, busTerminalSyncNodeIdsForGraphPatch, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsWithOriginShift, deferredMoveOptimizationCancelRef, deferredMoveRepairFrameRef, deferredRoutableLineRouteRepairCancelRef, dirtyEdgeIdsAfterBulkMove, dirtyEdgeIdsForMovedLocalRoutes, edgePatchFromCandidateEdges, edgeReferenceDiffIds, edges, editModeRouteRebuildOptions, expandCanvasToFitGraph, externalMoveCandidateEdges, graphStore, graphStoreApplyPatch, graphStoreSetGraph, hasCanvasOriginShift, internalRoutableLineNodeUpdatesForMove, leftTopCanvasOriginShiftForContent, logBulkMoveCommitStats, markBusTerminalSyncDirty, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, mergeNodeUpdateLists, nextNodesForMovedGraphCommit, nodes, overlayGraphStoreNodes, patchCachedRoutesForHighFanoutMove, patchCachedRoutesForInternalMove, patchCachedRoutesForWholeMove, rebuildExternalConnectionRoutesForMovedNodes, rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes, reuseSetOrCreate, routePointsForMovedEdgesBlockedByStationaryNodes, routingNodesForConnectionEdges, scheduleDeferredMovedConnectionRepair, scheduleDeferredRoutableLineRouteRepair, scheduleMovedEdgeOptimization, setGraphStore, shiftCachedRoutesForCanvasOrigin, shouldDeferSingleNodeTerminalReconciliation, shouldRunSynchronousMoveBlockerRepair, storedRouteDirtyIdsForMove, translateEdgeBy, translateNodeBy, wholeMoveRoutableLineNodeUpdates } = __appScope;
    if (previousNodes === undefined) {
      previousNodes = nodes;
    }
    if (effectiveCanvasBounds === undefined) {
      effectiveCanvasBounds = canvasBounds;
    }
    const wholeLayerMove = options.wholeLayerMove === true;
    const wholeLayerMoveDelta = options.moveDelta;
    const internalMovedEdgeIds = options.internalMovedEdgeIds ? reuseSetOrCreate(options.internalMovedEdgeIds) : new Set<string>();
    if (wholeLayerMove) {
      if (deferredMoveRepairFrameRef.current !== null) {
        window.cancelAnimationFrame(deferredMoveRepairFrameRef.current);
        deferredMoveRepairFrameRef.current = null;
      }
      deferredMoveOptimizationCancelRef.current?.();
      deferredMoveOptimizationCancelRef.current = null;
      deferredRoutableLineRouteRepairCancelRef.current?.();
      deferredRoutableLineRouteRepairCancelRef.current = null;
    }
    const commitStart = performance.now();
    let bulkPlanMs = 0;
    let canvasBoundsMs = 0;
    let edgePatchMs = 0;
    let dirtyMs = 0;
    let markDirtyMs = 0;
    let busSyncMs = 0;
    let syncRepairMs = 0;
    let routeCacheMs = 0;
    let graphPatchMs = 0;
    let committedCandidateEdges = candidateEdges;
    const wholeMoveRoutableLineUpdates =
      wholeLayerMove && wholeLayerMoveDelta
        ? wholeMoveRoutableLineNodeUpdates(movedNodeIds, wholeLayerMoveDelta)
        : [];
    const internalRoutableLineUpdates =
      !wholeLayerMove && wholeLayerMoveDelta
        ? internalRoutableLineNodeUpdatesForMove(movedNodeIds, wholeLayerMoveDelta)
        : [];
    const committedNodeUpdates =
      wholeMoveRoutableLineUpdates.length > 0
        ? mergeNodeUpdateLists(movedNodeUpdates, wholeMoveRoutableLineUpdates)
        : internalRoutableLineUpdates.length > 0
          ? mergeNodeUpdateLists(movedNodeUpdates, internalRoutableLineUpdates)
          : movedNodeUpdates;
    const committedNextNodes =
      committedNodeUpdates !== movedNodeUpdates
        ? nextNodesForMovedGraphCommit(graphStore, committedNodeUpdates, committedNodeUpdates.map((node) => node.id))
        : nextNodes;
    const bulkPlanStart = performance.now();
    const bulkPlan = buildBulkMovePlan(
      committedCandidateEdges,
      internalMovedEdgeIds,
      wholeLayerMove,
      movedNodeIds,
      selectedEdgeIds,
      originalRoutePoints,
      previousNodes,
      committedNextNodes,
      originalPositions
    );
    bulkPlanMs += performance.now() - bulkPlanStart;
    const synchronousRepairCandidateEdges = bulkPlan.boundaryCandidateEdges;
    const routeRepairCandidateEdges = bulkPlan.routeRepairCandidateEdges;
    const deferredRepairCandidateEdges = bulkPlan.deferredRepairCandidateEdges;
    const initialStoredRouteDirtyIds = dirtyEdgeIdsForMovedLocalRoutes(selectedEdgeIds, originalRoutePoints);
    const translatedLocalRouteIds = new Set<string>();
    if (wholeLayerMove) {
      const movedIdSet = new Set(movedNodeIds);
      for (const edge of committedCandidateEdges) {
        if (selectedEdgeIds.has(edge.id) || (movedIdSet.has(edge.sourceId) && movedIdSet.has(edge.targetId))) {
          translatedLocalRouteIds.add(edge.id);
        }
      }
    } else if (wholeLayerMoveDelta && internalMovedEdgeIds.size > 0) {
      for (const edgeId of internalMovedEdgeIds) {
        translatedLocalRouteIds.add(edgeId);
      }
    }
    const nonTranslatedInitialStoredRouteDirtyIds = [...initialStoredRouteDirtyIds].filter((edgeId) => !translatedLocalRouteIds.has(edgeId));
    const initialMarkDirtyStart = performance.now();
    markStoredRouteEdgesDirty(nonTranslatedInitialStoredRouteDirtyIds);
    markDirtyMs += performance.now() - initialMarkDirtyStart;
    const deferSingleNodeTerminalReconciliation =
      !wholeLayerMove &&
      shouldDeferSingleNodeTerminalReconciliation(
        movedNodeIds,
        synchronousRepairCandidateEdges
      );
    const deferMovedRouteRepair =
      !wholeLayerMove &&
      movedNodeIds.length > 0 &&
      (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation);
    const bulkCommitKind = bulkPlan.kind;
    const timingStats = () => ({
      durationMs: performance.now() - commitStart,
      bulkPlanMs,
      canvasBoundsMs,
      edgePatchMs,
      dirtyMs,
      markDirtyMs,
      busSyncMs,
      syncRepairMs,
      routeCacheMs,
      graphPatchMs
    });
    const originShiftStart = performance.now();
    const originShift = allowAutoExpandCanvas ? leftTopCanvasOriginShiftForContent(committedNodeUpdates, committedCandidateEdges) : { x: 0, y: 0 };
    canvasBoundsMs += performance.now() - originShiftStart;
    if (hasCanvasOriginShift(originShift)) {
      const candidateEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
      const rawNextEdges = edges.map((edge) => candidateEdgeById.get(edge.id) ?? edge);
      const rawNextNodes = overlayGraphStoreNodes(graphStore, committedNodeUpdates);
      const shiftedNextNodes = rawNextNodes.map((node) => translateNodeBy(node, originShift));
      const shiftedNextEdges = rawNextEdges.map((edge) => translateEdgeBy(edge, originShift));
      const committedNodeIdSet = new Set(committedNodeUpdates.map((node) => node.id));
      const shiftedExpectedNodeUpdates = shiftedNextNodes.filter((node) => committedNodeIdSet.has(node.id));
      const shiftedCanvasBoundsStart = performance.now();
      const shiftedCanvasBounds = canvasBoundsForGraphContent(
        canvasBoundsWithOriginShift(effectiveCanvasBounds, originShift),
        shiftedNextNodes,
        shiftedNextEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(shiftedCanvasBounds, originShift);
      canvasBoundsMs += performance.now() - shiftedCanvasBoundsStart;
      const routeCacheStart = performance.now();
      shiftCachedRoutesForCanvasOrigin(originShift);
      routeCacheMs += performance.now() - routeCacheStart;
      const candidateEdgeIds = committedCandidateEdges.map((edge) => edge.id);
      const markDirtyStart = performance.now();
      markRouteEdgesDirty(candidateEdgeIds);
      markStoredRouteEdgesDirty(candidateEdgeIds);
      markGraphDirtyForInteractiveCommit();
      markDirtyMs += performance.now() - markDirtyStart;
      const graphPatchStart = performance.now();
      setGraphStore((current) => graphStoreSetGraph(current, shiftedNextNodes, shiftedNextEdges));
      graphPatchMs += performance.now() - graphPatchStart;
      logBulkMoveCommitStats({
        kind: bulkCommitKind,
        movedNodeCount: movedNodeIds.length,
        candidateEdgeCount: previousCandidateEdges.length,
        internalEdgeCount: internalMovedEdgeIds.size,
        boundaryEdgeCount: synchronousRepairCandidateEdges.length,
        deferredRepairCandidateCount: deferredRepairCandidateEdges.length,
        legacyDeferredRepairCandidateCount: bulkPlan.legacyDeferredRepairCandidateCount,
        routeCachePatchedCount: candidateEdgeIds.length,
        legacyRouteDirtyCount: candidateEdgeIds.length,
        routeDirtyCount: candidateEdgeIds.length,
        storedRouteDirtyCount: candidateEdgeIds.length,
        routableLineUpdateCount: wholeMoveRoutableLineUpdates.length + internalRoutableLineUpdates.length,
        ...timingStats()
      });
      if (!wholeLayerMove) {
        scheduleDeferredRoutableLineRouteRepair(
          previousNodes,
          movedNodeIds,
          originalPositions,
          shiftedExpectedNodeUpdates,
          shiftedCanvasBounds
        );
      }
      return;
    }
    const commitCanvasBoundsStart = performance.now();
    const commitCanvasBounds = canvasBoundsForAutoExpandedGraphContent(effectiveCanvasBounds, committedNodeUpdates, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING);
    canvasBoundsMs += performance.now() - commitCanvasBoundsStart;
    if (deferMovedRouteRepair) {
      const edgePatchStart = performance.now();
      const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
      const expectedPatch = { nodeUpdates: committedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
      const edgePatchDirtyIds = [
        ...edgePatch.edgeUpserts.map((edge) => edge.id),
        ...edgePatch.edgeDeleteIds
      ];
      edgePatchMs += performance.now() - edgePatchStart;
      const routeCacheStart = performance.now();
      const routeCachePatchedEdgeIds = patchCachedRoutesForHighFanoutMove(
        previousCandidateEdges,
        committedCandidateEdges,
        movedNodeIds,
        committedNextNodes,
        commitCanvasBounds
      );
      if (!wholeLayerMove && wholeLayerMoveDelta && internalMovedEdgeIds.size > 0) {
        for (const edgeId of patchCachedRoutesForInternalMove(committedCandidateEdges, internalMovedEdgeIds, wholeLayerMoveDelta)) {
          routeCachePatchedEdgeIds.add(edgeId);
        }
      }
      routeCacheMs += performance.now() - routeCacheStart;
      const dirtyStart = performance.now();
      const movedRouteDirtyResult = dirtyEdgeIdsAfterBulkMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds);
      const movedRouteDirtyIds = movedRouteDirtyResult.dirtyIds;
      const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);
      dirtyMs += performance.now() - dirtyStart;
      const busSyncStart = performance.now();
      const busTerminalSyncNodeIds = busTerminalSyncNodeIdsForGraphPatch(
        movedNodeIds,
        previousCandidateEdges,
        edgePatch.edgeUpserts,
        edgePatch.edgeDeleteIds
      );
      busSyncMs += performance.now() - busSyncStart;
      const markDirtyStart = performance.now();
      markRouteEdgesDirty(movedRouteDirtyIds);
      markStoredRouteEdgesDirty(storedRouteDirtyIds);
      markBusTerminalSyncDirty(busTerminalSyncNodeIds);
      markGraphDirtyForInteractiveCommit();
      markDirtyMs += performance.now() - markDirtyStart;
      const graphPatchStart = performance.now();
      setGraphStore((current) =>
        graphStoreApplyPatch(current, {
          nodeUpdates: expectedPatch.nodeUpdates,
          edgeUpserts: expectedPatch.edgeUpserts,
          edgeDeleteIds: expectedPatch.edgeDeleteIds
        })
      );
      graphPatchMs += performance.now() - graphPatchStart;
      logBulkMoveCommitStats({
        kind: bulkCommitKind,
        movedNodeCount: movedNodeIds.length,
        candidateEdgeCount: previousCandidateEdges.length,
        internalEdgeCount: internalMovedEdgeIds.size,
        boundaryEdgeCount: synchronousRepairCandidateEdges.length,
        deferredRepairCandidateCount: deferredRepairCandidateEdges.length,
        legacyDeferredRepairCandidateCount: bulkPlan.legacyDeferredRepairCandidateCount,
        routeCachePatchedCount: routeCachePatchedEdgeIds.size,
        legacyRouteDirtyCount: movedRouteDirtyResult.legacyDirtyCount,
        routeDirtyCount: movedRouteDirtyIds.size,
        storedRouteDirtyCount: storedRouteDirtyIds.size,
        routableLineUpdateCount: wholeMoveRoutableLineUpdates.length + internalRoutableLineUpdates.length,
        ...timingStats()
      });
      scheduleDeferredRoutableLineRouteRepair(
        previousNodes,
        movedNodeIds,
        originalPositions,
        expectedPatch.nodeUpdates,
        commitCanvasBounds
      );
      if (deferredMoveRepairFrameRef.current !== null) {
        window.cancelAnimationFrame(deferredMoveRepairFrameRef.current);
        deferredMoveRepairFrameRef.current = null;
      }
      deferredMoveOptimizationCancelRef.current?.();
      deferredMoveOptimizationCancelRef.current = null;
      if (deferredRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation) {
        deferredMoveRepairFrameRef.current = window.requestAnimationFrame(() => {
          deferredMoveRepairFrameRef.current = null;
          scheduleDeferredMovedConnectionRepair(
            movedNodeIds,
            deferredRepairCandidateEdges.length > 0 ? deferredRepairCandidateEdges : synchronousRepairCandidateEdges,
            expectedPatch,
            commitCanvasBounds,
            previousNodes,
            originalPositions,
            originalRoutePoints,
            selectedEdgeIds,
            { reconcileTerminalConnections: deferSingleNodeTerminalReconciliation }
          );
        });
      }
      return;
    }
    const syncRepairStart = performance.now();
    if (
      !wholeLayerMove &&
      shouldRunSynchronousMoveBlockerRepair(
        movedNodeIds,
        externalMoveCandidateEdges(previousCandidateEdges, internalMovedEdgeIds),
        synchronousRepairCandidateEdges
      )
    ) {
      const blockedConnectedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        committedNextNodes,
        synchronousRepairCandidateEdges,
        movedNodeIds,
        {},
        commitCanvasBounds
      );
      const blockedConnectedEdgeIds = new Set(Object.keys(blockedConnectedRoutePoints));
      if (blockedConnectedEdgeIds.size > 0) {
        let blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        let routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, committedNextNodes, movedNodeIds);
        const rebuiltEdges = rebuildExternalConnectionRoutesForMovedNodes(
          routingNodes,
          committedCandidateEdges,
          movedNodeIds,
          commitCanvasBounds,
          blockedCandidateEdges,
          editModeRouteRebuildOptions
        );
        if (rebuiltEdges !== committedCandidateEdges) {
          const rebuiltDirtyEdgeIds = edgeReferenceDiffIds(committedCandidateEdges, rebuiltEdges);
          markRouteEdgesDirty(rebuiltDirtyEdgeIds);
          markStoredRouteEdgesDirty(rebuiltDirtyEdgeIds);
          committedCandidateEdges = rebuiltEdges;
        }
        blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, committedNextNodes, movedNodeIds);
        if (internalMovedEdgeIds.size === 0) {
          const rebuiltInternalEdges = rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(
            routingNodes,
            committedCandidateEdges,
            movedNodeIds,
            commitCanvasBounds,
            blockedCandidateEdges,
            editModeRouteRebuildOptions
          );
          if (rebuiltInternalEdges !== committedCandidateEdges) {
            const rebuiltDirtyEdgeIds = edgeReferenceDiffIds(committedCandidateEdges, rebuiltInternalEdges);
            markRouteEdgesDirty(rebuiltDirtyEdgeIds);
            markStoredRouteEdgesDirty(rebuiltDirtyEdgeIds);
            committedCandidateEdges = rebuiltInternalEdges;
          }
        }
      }
    }
    syncRepairMs += performance.now() - syncRepairStart;
    const edgePatchStart = performance.now();
    const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
    const nextEdgesForBounds = edgePatch.edgeUpserts;
    const edgePatchDirtyIds = [
      ...edgePatch.edgeUpserts.map((edge) => edge.id),
      ...edgePatch.edgeDeleteIds
    ];
    const expectedPatch = { nodeUpdates: committedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
    edgePatchMs += performance.now() - edgePatchStart;
    const expandCanvasStart = performance.now();
    expandCanvasToFitGraph(committedNodeUpdates, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);
    canvasBoundsMs += performance.now() - expandCanvasStart;
    const routeCacheStart = performance.now();
    const routeCachePatchedEdgeIds =
      wholeLayerMove && wholeLayerMoveDelta
        ? patchCachedRoutesForWholeMove(
            committedCandidateEdges,
            movedNodeIds,
            selectedEdgeIds,
            wholeLayerMoveDelta
          )
        : patchCachedRoutesForHighFanoutMove(
            previousCandidateEdges,
            committedCandidateEdges,
            movedNodeIds,
            committedNextNodes,
            commitCanvasBounds
          );
    if (!wholeLayerMove && wholeLayerMoveDelta && internalMovedEdgeIds.size > 0) {
      for (const edgeId of patchCachedRoutesForInternalMove(committedCandidateEdges, internalMovedEdgeIds, wholeLayerMoveDelta)) {
        routeCachePatchedEdgeIds.add(edgeId);
      }
    }
    routeCacheMs += performance.now() - routeCacheStart;
    const dirtyStart = performance.now();
    const movedRouteDirtyResult = dirtyEdgeIdsAfterBulkMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds);
    const movedRouteDirtyIds = movedRouteDirtyResult.dirtyIds;
    const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);
    dirtyMs += performance.now() - dirtyStart;
    const busSyncStart = performance.now();
    const busTerminalSyncNodeIds = busTerminalSyncNodeIdsForGraphPatch(
      movedNodeIds,
      previousCandidateEdges,
      edgePatch.edgeUpserts,
      edgePatch.edgeDeleteIds
    );
    busSyncMs += performance.now() - busSyncStart;
    const markDirtyStart = performance.now();
    markRouteEdgesDirty(movedRouteDirtyIds);
    markStoredRouteEdgesDirty(storedRouteDirtyIds);
    markBusTerminalSyncDirty(busTerminalSyncNodeIds);
    markGraphDirtyForInteractiveCommit();
    markDirtyMs += performance.now() - markDirtyStart;
    const graphPatchStart = performance.now();
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: expectedPatch.nodeUpdates,
        edgeUpserts: expectedPatch.edgeUpserts,
        edgeDeleteIds: expectedPatch.edgeDeleteIds
      })
    );
    graphPatchMs += performance.now() - graphPatchStart;
    logBulkMoveCommitStats({
      kind: bulkCommitKind,
      movedNodeCount: movedNodeIds.length,
      candidateEdgeCount: previousCandidateEdges.length,
      internalEdgeCount: internalMovedEdgeIds.size,
      boundaryEdgeCount: synchronousRepairCandidateEdges.length,
      deferredRepairCandidateCount: deferredRepairCandidateEdges.length,
      legacyDeferredRepairCandidateCount: bulkPlan.legacyDeferredRepairCandidateCount,
      routeCachePatchedCount: routeCachePatchedEdgeIds.size,
      legacyRouteDirtyCount: movedRouteDirtyResult.legacyDirtyCount,
      routeDirtyCount: movedRouteDirtyIds.size,
      storedRouteDirtyCount: storedRouteDirtyIds.size,
      routableLineUpdateCount: wholeMoveRoutableLineUpdates.length + internalRoutableLineUpdates.length,
      ...timingStats()
    });
    if (!wholeLayerMove) {
      scheduleDeferredRoutableLineRouteRepair(
        previousNodes,
        movedNodeIds,
        originalPositions,
        expectedPatch.nodeUpdates,
        commitCanvasBounds
      );
      scheduleMovedEdgeOptimization(
        previousNodes,
        committedNextNodes,
        routeRepairCandidateEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds,
        originalPositions,
        deferredRepairCandidateEdges,
        expectedPatch
      );
    }
  };
}

export function createUpdateMouseStatus(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { lastMouseStatusRef, mousePositionTextRef, mouseStatusFrameRef, pendingMouseStatusRef } = __appScope;
    const rounded = { x: Math.round(point.x), y: Math.round(point.y) };
    const previous = lastMouseStatusRef.current;
    if (previous?.x === rounded.x && previous.y === rounded.y) {
      return;
    }
    pendingMouseStatusRef.current = rounded;
    if (mouseStatusFrameRef.current !== null) {
      return;
    }
    mouseStatusFrameRef.current = window.requestAnimationFrame(() => {
      mouseStatusFrameRef.current = null;
      const next = pendingMouseStatusRef.current;
      pendingMouseStatusRef.current = null;
      if (!next) {
        return;
      }
      const latest = lastMouseStatusRef.current;
      if (latest?.x === next.x && latest.y === next.y) {
        return;
      }
      lastMouseStatusRef.current = next;
      if (mousePositionTextRef.current) {
        mousePositionTextRef.current.textContent = `X:${next.x} Y:${next.y}`;
      }
    });
  };
}

export function createUpdateMultiNodeDragOverlayTransform(__appScope: Record<string, any>) {
  return (delta: Point | null) => {
  const { draggingRef, imperativeMultiNodeDragOverlayRef, isMultiNodeMoveState, multiNodeDragOverlayDeltaRef, multiNodeDragOverlayRef, updateNodeDragLightweightEdgePreview } = __appScope;
    const nextDelta = delta ?? { x: 0, y: 0 };
    multiNodeDragOverlayDeltaRef.current = nextDelta;
    const roundedDelta = { x: Math.round(nextDelta.x), y: Math.round(nextDelta.y) };
    const transform = `translate(${roundedDelta.x} ${roundedDelta.y})`;
    multiNodeDragOverlayRef.current?.setAttribute("transform", transform);
    imperativeMultiNodeDragOverlayRef.current?.setAttribute("transform", transform);
    const activeDragging = draggingRef.current;
    if (activeDragging && isMultiNodeMoveState(activeDragging)) {
      updateNodeDragLightweightEdgePreview(activeDragging, roundedDelta, activeDragging.overlayPreview?.dynamicEdgePreviewEdges ?? []);
    }
  };
}

export function createShowImperativeMultiNodeDragOverlay(__appScope: Record<string, any>) {
  return (markup: string) => {
  const { imperativeMultiNodeDragActiveRef, imperativeMultiNodeDragOverlayRef, multiNodeDragOverlayDeltaRef, updateMultiNodeDragOverlayTransform } = __appScope;
    const overlay = imperativeMultiNodeDragOverlayRef.current;
    if (!overlay) {
      return false;
    }
    imperativeMultiNodeDragActiveRef.current = true;
    overlay.innerHTML = markup;
    overlay.style.display = "";
    updateMultiNodeDragOverlayTransform(multiNodeDragOverlayDeltaRef.current);
    return true;
  };
}

export function createHideImperativeMultiNodeDragOverlay(__appScope: Record<string, any>) {
  return () => {
  const { clearImperativeNodeDragEdgePreview, imperativeMultiNodeDragActiveRef, imperativeMultiNodeDragOverlayRef } = __appScope;
    imperativeMultiNodeDragActiveRef.current = false;
    const overlay = imperativeMultiNodeDragOverlayRef.current;
    if (overlay) {
      overlay.innerHTML = "";
      overlay.style.display = "none";
    }
    clearImperativeNodeDragEdgePreview();
  };
}

export function createResetMultiNodeDragOverlayTransform(__appScope: Record<string, any>) {
  return () => {
  const { updateMultiNodeDragOverlayTransform } = __appScope;
    updateMultiNodeDragOverlayTransform({ x: 0, y: 0 });
  };
}

export function createBuildSingleNodeDragPreviewNodeMarkup(__appScope: Record<string, any>) {
  return (dragState: DraggingState) => {
  const { DeviceGlyph, buildMeasurementGroupsMarkup, buildNodePreviewImageMarkup, buildSvgNodeLabelMarkup, buildSvgTerminalMarkup, colorDisplayMode, colorPalette, escapeXml, formatSvgNumber, isBusNode, isMultiNodeMoveState, isStaticNode, nodeById, nodeGeometryTransform, renderSvgElementMarkup, resolveNodeStateVisual, visibleNodeIdSet } = __appScope;
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return "";
    }
    const nodeId = dragState.nodeIds[0];
    const node = nodeById.get(nodeId);
    const originalPosition = dragState.originalPositions[nodeId] ?? node?.position;
    if (!node || !originalPosition || !visibleNodeIdSet.has(node.id)) {
      return "";
    }
    const nodeIsBus = isBusNode(node);
    const stateVisual = resolveNodeStateVisual(node);
    const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual }));
    const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual }));
    const imageMarkup = buildNodePreviewImageMarkup(node, `single-node-drag-preview-clip-${node.id}`);
    const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
    const labelMarkup = buildSvgNodeLabelMarkup(node);
    const previewNode = originalPosition === node.position ? node : { ...node, position: originalPosition };
    const measurementMarkup = buildMeasurementGroupsMarkup(previewNode);
    return `<g class="single-node-drag-preview-node ${nodeIsBus ? "bus-node" : ""}" transform="translate(${formatSvgNumber(originalPosition.x)} ${formatSvgNumber(originalPosition.y)})">
  <title>${escapeXml(node.name)}</title>
  <g class="node-geometry" transform="${escapeXml(nodeGeometryTransform(node))}">
    <rect class="node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${isStaticNode(node) ? "static-hitbox" : ""}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 8}"/>
    ${glyphMarkup}
    ${glyphTextMarkup}
  </g>
  ${imageMarkup}
  <g class="node-terminal-layer" transform="${escapeXml(nodeGeometryTransform(node))}">
    ${terminalMarkup}
  </g>
  ${labelMarkup}
  ${measurementMarkup}
</g>`;
  };
}

export function createClearImperativeNodeDragEdgePreview(__appScope: Record<string, any>) {
  return () => {
  const { imperativeNodeDragEdgePreviewKeyRef, imperativeNodeDragEdgePreviewPathRefs, imperativeSingleNodeDragEdgePreviewRef } = __appScope;
    imperativeNodeDragEdgePreviewPathRefs.current.clear();
    imperativeNodeDragEdgePreviewKeyRef.current = "";
    const edgePreview = imperativeSingleNodeDragEdgePreviewRef.current;
    if (edgePreview) {
      edgePreview.innerHTML = "";
      edgePreview.style.display = "none";
    }
  };
}

export function createShowImperativeSingleNodeDragPreview(__appScope: Record<string, any>) {
  return (dragState: DraggingState) => {
  const { buildSingleNodeDragPreviewNodeMarkup, clearImperativeNodeDragEdgePreview, imperativeSingleNodeDragActiveRef, imperativeSingleNodeDragNodeOverlayRef } = __appScope;
    const markup = buildSingleNodeDragPreviewNodeMarkup(dragState);
    const nodeOverlay = imperativeSingleNodeDragNodeOverlayRef.current;
    if (!nodeOverlay || !markup) {
      return false;
    }
    imperativeSingleNodeDragActiveRef.current = true;
    nodeOverlay.innerHTML = markup;
    nodeOverlay.style.display = "";
    nodeOverlay.setAttribute("transform", "translate(0 0)");
    clearImperativeNodeDragEdgePreview();
    return true;
  };
}

export function createCssSelectorEscape(__appScope: Record<string, any>) {
  return (value: string) => {
  const { CSS } = __appScope;
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  };
}

export function createClearImperativeSingleNodeDragOriginLines(__appScope: Record<string, any>) {
  return () => {
  const { cssSelectorEscape, imperativeSingleNodeDragOriginEdgeIdsRef, imperativeSingleNodeDragOriginRoutableLineNodeIdsRef, svgRef } = __appScope;
    const svg = svgRef.current;
    if (svg) {
      for (const edgeId of imperativeSingleNodeDragOriginEdgeIdsRef.current) {
        svg.querySelectorAll<SVGElement>(`[data-edge-id="${cssSelectorEscape(edgeId)}"]`).forEach((element) => {
          element.classList.remove("single-drag-origin-line");
        });
      }
      for (const nodeId of imperativeSingleNodeDragOriginRoutableLineNodeIdsRef.current) {
        svg.querySelectorAll<SVGElement>(`[data-node-id="${cssSelectorEscape(nodeId)}"]`).forEach((element) => {
          element.classList.remove("single-drag-origin-line");
        });
      }
    }
    imperativeSingleNodeDragOriginEdgeIdsRef.current.clear();
    imperativeSingleNodeDragOriginRoutableLineNodeIdsRef.current.clear();
  };
}

export function createSetImperativeSingleNodeDragOriginLines(__appScope: Record<string, any>) {
  return (dragState: DraggingState) => {
  const { clearImperativeSingleNodeDragOriginLines, cssSelectorEscape, dragDraggedEdgeIdSet, dragMovedNodeIdSet, imperativeSingleNodeDragOriginEdgeIdsRef, imperativeSingleNodeDragOriginRoutableLineNodeIdsRef, isMultiNodeMoveState, isRoutableLineDeviceKind, nodeById, routableLineNodeIdsByEndpointNodeId, singleNodeDragRelevantEdges, svgRef, visibleEdgeIdSet, visibleNodeIdSet } = __appScope;
    clearImperativeSingleNodeDragOriginLines();
    const svg = svgRef.current;
    if (!svg || isMultiNodeMoveState(dragState)) {
      return;
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    const draggedEdgeIds = dragDraggedEdgeIdSet(dragState);
    const edgeIds = new Set<string>();
    for (const edge of singleNodeDragRelevantEdges(dragState)) {
      if (
        visibleEdgeIdSet.has(edge.id) &&
        (movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id))
      ) {
        edgeIds.add(edge.id);
      }
    }
    const routableLineNodeIds = new Set<string>();
    for (const nodeId of movedNodeIds) {
      const node = nodeById.get(nodeId);
      if (node && visibleNodeIdSet.has(node.id) && isRoutableLineDeviceKind(node.kind)) {
        routableLineNodeIds.add(node.id);
      }
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        if (visibleNodeIdSet.has(lineId)) {
          routableLineNodeIds.add(lineId);
        }
      }
    }
    for (const edgeId of edgeIds) {
      svg.querySelectorAll<SVGElement>(`[data-edge-id="${cssSelectorEscape(edgeId)}"]`).forEach((element) => {
        element.classList.add("single-drag-origin-line");
      });
    }
    for (const nodeId of routableLineNodeIds) {
      svg.querySelectorAll<SVGElement>(`[data-node-id="${cssSelectorEscape(nodeId)}"]`).forEach((element) => {
        element.classList.add("single-drag-origin-line");
      });
    }
    imperativeSingleNodeDragOriginEdgeIdsRef.current = edgeIds;
    imperativeSingleNodeDragOriginRoutableLineNodeIdsRef.current = routableLineNodeIds;
  };
}

export function createSetImperativeSingleNodeDragOrigin(__appScope: Record<string, any>) {
  return (nodeId: string | null) => {
  const { canvasNodeElementRefs, clearImperativeSingleNodeDragOriginLines, cssSelectorEscape, imperativeSingleNodeDragOriginNodeIdRef, svgRef } = __appScope;
    const setMeasurementOriginClass = (originNodeId: string, enabled: boolean) => {
      const svg = svgRef.current;
      if (!svg) {
        return;
      }
      svg.querySelectorAll<SVGElement>(`.measurement-group[data-export-device-id="${cssSelectorEscape(originNodeId)}"]`).forEach((element) => {
        if (enabled) {
          element.classList.add("drag-origin");
        } else {
          element.classList.remove("drag-origin");
        }
      });
    };
    const previousNodeId = imperativeSingleNodeDragOriginNodeIdRef.current;
    if (previousNodeId && previousNodeId !== nodeId) {
      canvasNodeElementRefs.current.get(previousNodeId)?.classList.remove("single-drag-origin");
      setMeasurementOriginClass(previousNodeId, false);
    }
    imperativeSingleNodeDragOriginNodeIdRef.current = nodeId;
    svgRef.current?.classList.toggle("single-node-dragging", Boolean(nodeId));
    if (!nodeId) {
      clearImperativeSingleNodeDragOriginLines();
    }
    if (nodeId) {
      canvasNodeElementRefs.current.get(nodeId)?.classList.add("single-drag-origin");
      setMeasurementOriginClass(nodeId, true);
    }
  };
}

export function createBindCanvasNodeElement(__appScope: Record<string, any>) {
  return (nodeId: string, element: SVGGElement | null) => {
  const { canvasNodeElementRefs, imperativeSingleNodeDragOriginNodeIdRef } = __appScope;
    if (!element) {
      canvasNodeElementRefs.current.delete(nodeId);
      return;
    }
    canvasNodeElementRefs.current.set(nodeId, element);
    if (imperativeSingleNodeDragOriginNodeIdRef.current === nodeId) {
      element.classList.add("single-drag-origin");
    } else {
      element.classList.remove("single-drag-origin");
    }
  };
}

export function createHideImperativeSingleNodeDragPreview(__appScope: Record<string, any>) {
  return () => {
  const { clearImperativeNodeDragEdgePreview, imperativeNodeDragDropHintRef, imperativeSingleNodeDragActiveRef, imperativeSingleNodeDragNodeOverlayRef, nodeTerminalSnapTargetRef, setImperativeSingleNodeDragOrigin } = __appScope;
    imperativeSingleNodeDragActiveRef.current = false;
    setImperativeSingleNodeDragOrigin(null);
    const nodeOverlay = imperativeSingleNodeDragNodeOverlayRef.current;
    if (nodeOverlay) {
      nodeOverlay.innerHTML = "";
      nodeOverlay.style.display = "none";
      nodeOverlay.setAttribute("transform", "translate(0 0)");
    }
    clearImperativeNodeDragEdgePreview();
    const dropHint = imperativeNodeDragDropHintRef.current;
    if (dropHint) {
      dropHint.style.display = "none";
    }
    nodeTerminalSnapTargetRef.current = null;
  };
}

export function createSingleNodeDragPreviewNodeFor(__appScope: Record<string, any>) {
  return (dragState: DraggingState, nodeId: string, delta: Point) => {
  const { nodeById } = __appScope;
    const node = nodeById.get(nodeId);
    const originalPosition = dragState.originalPositions[nodeId];
    return node && originalPosition
      ? {
          ...node,
          position: {
            x: originalPosition.x + delta.x,
            y: originalPosition.y + delta.y
          }
        }
      : node;
  };
}

export function createSingleNodeDragRelevantEdges(__appScope: Record<string, any>) {
  return (dragState: DraggingState) => {
  const { isMultiNodeMoveState, visibleEdgeIdSet } = __appScope;
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return [];
    }
    if (dragState.singleNodeDragCache) {
      return dragState.singleNodeDragCache.relevantEdges;
    }
    const movedNodeIds = new Set(dragState.nodeIds);
    const draggedEdgeIds = new Set(dragState.edgeIds);
    return dragState.affectedEdges.filter((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return false;
      }
      return movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id);
    });
  };
}

export function createSingleNodeDragPreviewBounds(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point): RenderViewportBounds => {
  const { CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, expandRouteBox, mergeRenderViewportBounds, nodeHasUprightBoundsContent, nodeVisualInteractionBounds, renderViewportBounds, singleNodeDragPreviewNodeFor } = __appScope;
    const baseBounds = expandRouteBox(renderViewportBounds, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING);
    const nodeId = dragState.nodeIds[0];
    const movedNode = nodeId ? singleNodeDragPreviewNodeFor(dragState, nodeId, delta) : undefined;
    return movedNode
      ? mergeRenderViewportBounds(baseBounds, nodeVisualInteractionBounds(movedNode, movedNode.position, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, nodeHasUprightBoundsContent(movedNode)))
      : baseBounds;
  };
}

export function createSingleNodeDragEdgeTouchesBounds(__appScope: Record<string, any>) {
  return (dragState: DraggingState, edge: Edge, delta: Point, bounds: RenderViewportBounds) => {
  const { boxesOverlap, nodeIntersectsRenderViewport, singleNodeDragPreviewNodeFor } = __appScope;
    const routeBounds = dragState.originalRouteBounds[edge.id];
    if (routeBounds && boxesOverlap(routeBounds, bounds)) {
      return true;
    }
    const sourcePreviewNode = singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta);
    const targetPreviewNode = singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta);
    const sourceMoved = dragState.nodeIds.includes(edge.sourceId);
    const targetMoved = dragState.nodeIds.includes(edge.targetId);
    const stationaryEndpoint = sourceMoved ? targetPreviewNode : targetMoved ? sourcePreviewNode : undefined;
    return Boolean(stationaryEndpoint && nodeIntersectsRenderViewport(stationaryEndpoint, bounds));
  };
}

export function createSingleNodeDragViewportLocalEdgesByScan(__appScope: Record<string, any>) {
  return (
    dragState: DraggingState,
    edgesToCheck: Edge[],
    delta: Point,
    bounds: RenderViewportBounds,
    localLimit = Number.POSITIVE_INFINITY
  ) => {
  const { singleNodeDragEdgeTouchesBounds } = __appScope;
    const viewportLocalEdges: Edge[] = [];
    for (const edge of edgesToCheck) {
      if (!singleNodeDragEdgeTouchesBounds(dragState, edge, delta, bounds)) {
        continue;
      }
      viewportLocalEdges.push(edge);
      if (viewportLocalEdges.length >= localLimit) {
        break;
      }
    }
    return viewportLocalEdges;
  };
}

export function createSingleNodeDragScopedEdges(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point) => {
  const { CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, singleNodeDragPreviewBounds, singleNodeDragRelevantEdges, singleNodeDragViewportLocalEdgesByScan } = __appScope;
    if (dragState.singleNodeDragCache) {
      return { previewEdges: dragState.singleNodeDragCache.previewEdges, snapEdges: dragState.singleNodeDragCache.snapEdges };
    }
    const relevantEdges = singleNodeDragRelevantEdges(dragState);
    if (relevantEdges.length <= CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT) {
      return { previewEdges: relevantEdges, snapEdges: relevantEdges };
    }
    const bounds = singleNodeDragPreviewBounds(dragState, delta);
    const localLimit = Math.max(CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT);
    const viewportLocalEdges = singleNodeDragViewportLocalEdgesByScan(dragState, relevantEdges, delta, bounds, localLimit);
    const scopedEdges = viewportLocalEdges.length > 0 ? viewportLocalEdges : relevantEdges;
    return {
      previewEdges: scopedEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT),
      snapEdges: scopedEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT)
    };
  };
}

export function createSimpleOrthogonalDragPreviewPoints(__appScope: Record<string, any>) {
  return (start: Point, end: Point) => {
    if (Math.round(start.x) === Math.round(end.x) || Math.round(start.y) === Math.round(end.y)) {
      return [start, end];
    }
    return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: start.x, y: end.y }, end];
  };
}

export function createRoutableLineIdsConnectedToNodeIds(__appScope: Record<string, any>) {
  return (nodeIds: Iterable<string>) => {
  const { routableLineNodeIdsByEndpointNodeId } = __appScope;
    const lineIds = new Set<string>();
    for (const nodeId of nodeIds) {
      for (const lineId of routableLineNodeIdsByEndpointNodeId.get(nodeId) ?? []) {
        lineIds.add(lineId);
      }
    }
    return lineIds;
  };
}

export function createRoutableLineEndpointPreviewRoutePoints(__appScope: Record<string, any>) {
  return function routableLineEndpointPreviewRoutePoints(
    refs: ReturnType<typeof routableLineDeviceEndpointRefs>,
    start: Point,
    end: Point,
    previewNodeById: Map<string, ModelNode>,
    bounds?: CanvasBounds
  ) {
  const { compactPreviewNodes, isBusNode, routeEdgesForStoredRendering } = __appScope;
    const sourceRef = refs.source;
    const targetRef = refs.target;
    const sourceEndpointNode = sourceRef ? previewNodeById.get(sourceRef.nodeId) : undefined;
    const targetEndpointNode = targetRef ? previewNodeById.get(targetRef.nodeId) : undefined;
    if (!sourceRef && !targetRef) {
      return null;
    }
    const route = routeEdgesForStoredRendering(compactPreviewNodes(sourceEndpointNode, targetEndpointNode), [{
      id: "routable-line-endpoint-preview",
      sourceId: sourceEndpointNode?.id ?? "floating-routable-line-preview-source",
      targetId: targetEndpointNode?.id ?? "floating-routable-line-preview-target",
      sourceTerminalId: sourceRef?.terminalId,
      targetTerminalId: targetRef?.terminalId,
      sourcePoint: !sourceEndpointNode || isBusNode(sourceEndpointNode) ? start : undefined,
      targetPoint: !targetEndpointNode || isBusNode(targetEndpointNode) ? end : undefined
    }], bounds)[0];
    return route?.points.length ? route.points : null;
  };
}

export function createBuildRoutableLinePreviewRoutesForNodeUpdates(__appScope: Record<string, any>) {
  return (
    baseNodeById: Map<string, ModelNode>,
    changedNodeIds: Iterable<string>,
    nodeUpdates: Iterable<ModelNode>,
    options: { routeFully?: boolean; bounds?: CanvasBounds } = {}
  ): NodeDragPreviewRoute[] => {
  const { colorDisplayMode, colorPalette, getDeviceStrokeColor, isRoutableLineDeviceKind, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefs, routableLineEndpointPreviewRoutePoints, routableLineIdsConnectedToNodeIds, routeRoutableLineDevice, simpleOrthogonalDragPreviewPoints, syncRoutableLineDeviceEndpointsToRefs, visibleNodeIdSet } = __appScope;
    const changedNodeIdList = Array.from(changedNodeIds);
    if (changedNodeIdList.length === 0) {
      return [];
    }
    const previewNodeById = new Map(baseNodeById);
    for (const node of nodeUpdates) {
      previewNodeById.set(node.id, node);
    }
    const lineIds = routableLineIdsConnectedToNodeIds(changedNodeIdList);
    if (lineIds.size === 0) {
      return [];
    }
    const routeFully = options.routeFully === true;
    const referenceNodes = Array.from(baseNodeById.values());
    const previewNodes = routeFully
      ? referenceNodes.map((node) => previewNodeById.get(node.id) ?? node)
      : [];
    const routes: NodeDragPreviewRoute[] = [];
    for (const lineId of lineIds) {
      const lineNode = baseNodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const syncedLine = syncRoutableLineDeviceEndpointsToRefs(lineNode, previewNodes, previewNodeById, referenceNodes);
      const displayLine = routeFully
        ? routeRoutableLineDevice(syncedLine, previewNodes, options.bounds)
        : syncedLine;
      const points = routableLineDeviceCanvasPoints(displayLine);
      const start = points[0];
      const end = points[points.length - 1];
      if (!start || !end) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(syncedLine);
      const endpointRoutePoints = !routeFully && points.length <= 2
        ? routableLineEndpointPreviewRoutePoints(refs, start, end, previewNodeById, options.bounds)
        : null;
      const previewPoints = routeFully || points.length > 2 ? points : endpointRoutePoints ?? simpleOrthogonalDragPreviewPoints(start, end);
      routes.push({
        edgeId: `routable-line:${lineNode.id}`,
        routableLineNodeId: lineNode.id,
        path: pointsToPreviewPath(previewPoints),
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette)
      });
    }
    return routes;
  };
}

export function createBuildRoutableLineEndpointPreviewNodeUpdates(__appScope: Record<string, any>) {
  return (
    sourceNodes: ModelNode[],
    baseNodeById: Map<string, ModelNode>,
    changedNodeIds: Iterable<string>,
    nodeUpdates: Iterable<ModelNode>,
    canvasBounds: CanvasBounds
  ) => {
  const { isRoutableLineDeviceKind, routableLineIdsConnectedToNodeIds, routeRoutableLineDevice, syncRoutableLineDeviceEndpointsToRefs } = __appScope;
    const lineIds = routableLineIdsConnectedToNodeIds(changedNodeIds);
    if (lineIds.size === 0) {
      return [];
    }
    const previewNodeById = new Map(baseNodeById);
    for (const node of nodeUpdates) {
      previewNodeById.set(node.id, node);
    }
    const previewNodes = sourceNodes.map((node) => previewNodeById.get(node.id) ?? node);
    const updates: ModelNode[] = [];
    for (const lineId of lineIds) {
      const lineNode = baseNodeById.get(lineId);
      if (!lineNode || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const syncedLine = syncRoutableLineDeviceEndpointsToRefs(lineNode, previewNodes, previewNodeById, sourceNodes);
      if (syncedLine !== lineNode) {
        const routingNodes = previewNodes.map((node) => (node.id === syncedLine.id ? syncedLine : node));
        updates.push(routeRoutableLineDevice(syncedLine, routingNodes, canvasBounds));
      }
    }
    return updates;
  };
}

export function createBuildTranslatedInternalRoutableLineDragPreviewRoutes(__appScope: Record<string, any>) {
  return (
    dragState: DraggingState,
    delta: Point,
    movedNodeIds: string[]
  ) => {
  const { colorDisplayMode, colorPalette, getDeviceStrokeColor, inferMissingRoutableLineDeviceEndpointRefs, isMultiNodeMoveState, isRoutableLineDeviceKind, nodeById, nodes, pointsToPreviewPath, routableLineDeviceCanvasPoints, routableLineDeviceEndpointRefs, routableLineIdsConnectedToNodeIds, translatePointBy, visibleNodeIdSet } = __appScope;
    if (!dragState.wholeLayerMove && !isMultiNodeMoveState(dragState)) {
      return [];
    }
    const movedIds = new Set(movedNodeIds);
    const routes: NodeDragPreviewRoute[] = [];
    const seenLineIds = new Set<string>();
    for (const lineId of routableLineIdsConnectedToNodeIds(movedNodeIds)) {
      if (seenLineIds.has(lineId)) {
        continue;
      }
      seenLineIds.add(lineId);
      const lineNode = nodeById.get(lineId);
      if (!lineNode || !visibleNodeIdSet.has(lineNode.id) || !isRoutableLineDeviceKind(lineNode.kind)) {
        continue;
      }
      const refs = routableLineDeviceEndpointRefs(inferMissingRoutableLineDeviceEndpointRefs(lineNode, nodes));
      if (!refs.source?.nodeId || !refs.target?.nodeId || !movedIds.has(refs.source.nodeId) || !movedIds.has(refs.target.nodeId)) {
        continue;
      }
      const points = routableLineDeviceCanvasPoints(lineNode).map((point) => translatePointBy(point, delta));
      routes.push({
        edgeId: `routable-line:${lineNode.id}`,
        routableLineNodeId: lineNode.id,
        path: pointsToPreviewPath(points),
        color: getDeviceStrokeColor(lineNode, colorDisplayMode, colorPalette)
      });
    }
    return routes;
  };
}

export function createBuildRoutableLineDragPreviewRoutes(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point) => {
  const { buildRoutableLinePreviewRoutesForNodeUpdates, buildTranslatedInternalRoutableLineDragPreviewRoutes, dragMovedNodeIdSet, nodeById, singleNodeDragPreviewNodeFor } = __appScope;
    const movedNodeIds = Array.from(dragMovedNodeIdSet(dragState));
    if (movedNodeIds.length === 0) {
      return [];
    }
    const translatedInternalRoutableLinePreviewRoutes = buildTranslatedInternalRoutableLineDragPreviewRoutes(dragState, delta, movedNodeIds);
    if (dragState.wholeLayerMove) {
      return translatedInternalRoutableLinePreviewRoutes;
    }
    const previewNodeUpdates = movedNodeIds.flatMap((nodeId) => {
      const node = singleNodeDragPreviewNodeFor(dragState, nodeId, delta);
      return node ? [node] : [];
    });
    const translatedInternalRoutableLineNodeIds = new Set(
      translatedInternalRoutableLinePreviewRoutes.flatMap((route) =>
        route.routableLineNodeId ? [route.routableLineNodeId] : []
      )
    );
    const endpointPreviewRoutes = buildRoutableLinePreviewRoutesForNodeUpdates(nodeById, movedNodeIds, previewNodeUpdates)
      .filter((route) => !route.routableLineNodeId || !translatedInternalRoutableLineNodeIds.has(route.routableLineNodeId));
    return [...endpointPreviewRoutes, ...translatedInternalRoutableLinePreviewRoutes];
  };
}

export function createBuildCachedSingleNodeDragPreviewRoutes(__appScope: Record<string, any>) {
  return (
    cache: SingleNodeDragCache | undefined,
    delta: Point,
    previewEdges: Edge[]
  ): NodeDragPreviewRoute[] | null => {
  const { pointsToPreviewPath, preserveDraggedRouteShape, shiftPreviewEndpointForDelta, simpleOrthogonalDragPreviewPoints } = __appScope;
    if (!cache) {
      return null;
    }
    const routes: NodeDragPreviewRoute[] = [];
    for (const edge of previewEdges) {
      const endpoint = cache.previewEndpointByEdgeId.get(edge.id);
      if (!endpoint) {
        return null;
      }
      const start = shiftPreviewEndpointForDelta(endpoint.start, endpoint.startMoves, delta);
      const end = shiftPreviewEndpointForDelta(endpoint.end, endpoint.endMoves, delta);
      const previewPoints = endpoint.routePoints?.length
        ? preserveDraggedRouteShape({
            routePoints: endpoint.routePoints,
            nextStart: start,
            nextEnd: end,
            sourceDelta: { x: start.x - endpoint.routePoints[0].x, y: start.y - endpoint.routePoints[0].y },
            targetDelta: {
              x: end.x - endpoint.routePoints[endpoint.routePoints.length - 1].x,
              y: end.y - endpoint.routePoints[endpoint.routePoints.length - 1].y
            },
            sourceNormal: endpoint.sourceNormal,
            targetNormal: endpoint.targetNormal
          })
        : simpleOrthogonalDragPreviewPoints(start, end);
      routes.push({
        edgeId: endpoint.edgeId,
        path: pointsToPreviewPath(previewPoints),
        color: endpoint.color
      });
    }
    return routes;
  };
}

export function createBuildDragPreviewEndpointPoints(__appScope: Record<string, any>) {
  return (
    dragState: DraggingState,
    edge: Edge,
    delta: Point,
    movedNodeIds: Set<string>,
    draggedEdgeIds: Set<string>,
    movedBusIds: Set<string>
  ) => {
  const { getModelEdgeEndpointPoint, isBusNode, projectPointToBusCenterline, shiftedDragPreviewPoint, singleNodeDragPreviewNodeFor } = __appScope;
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    const wholeEdgeMoves = draggedEdgeIds.has(edge.id) && !sourceMoved && !targetMoved;
    const originalPoints = dragState.originalEdgePoints[edge.id];
    const source = singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta);
    const target = singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta);
    if (!source || !target) {
      return null;
    }
    const originalRoute = dragState.originalRoutePoints[edge.id];
    const frozenSourceBusPoint = originalRoute?.[0];
    const frozenTargetBusPoint = originalRoute?.[originalRoute.length - 1];
    const sourcePoint = movedBusIds.has(edge.sourceId) || wholeEdgeMoves
      ? shiftedDragPreviewPoint(originalPoints?.sourcePoint, delta) ??
        (isBusNode(source) ? shiftedDragPreviewPoint(frozenSourceBusPoint, delta) : undefined) ??
        edge.sourcePoint
      : edge.sourcePoint ?? (isBusNode(source) ? frozenSourceBusPoint : undefined);
    const targetPoint = movedBusIds.has(edge.targetId) || wholeEdgeMoves
      ? shiftedDragPreviewPoint(originalPoints?.targetPoint, delta) ??
        (isBusNode(target) ? shiftedDragPreviewPoint(frozenTargetBusPoint, delta) : undefined) ??
        edge.targetPoint
      : edge.targetPoint ?? (isBusNode(target) ? frozenTargetBusPoint : undefined);
    let start = getModelEdgeEndpointPoint(source, sourcePoint, edge.sourceTerminalId);
    let end = getModelEdgeEndpointPoint(target, targetPoint, edge.targetTerminalId);
    if (isBusNode(source) && !sourcePoint) {
      start = projectPointToBusCenterline(source, end);
    }
    if (isBusNode(target) && !targetPoint) {
      end = projectPointToBusCenterline(target, start);
    }
    return { start, end, source, target };
  };
}

export function createConnectionEndpointPreviewRoutePoints(__appScope: Record<string, any>) {
  return (
    edge: Edge,
    endpoints: NonNullable<ReturnType<typeof buildDragPreviewEndpointPoints>>
  ) => {
  const { canvasBounds, compactPreviewNodes, isBusNode, routeEdgesForStoredRendering, simpleOrthogonalDragPreviewPoints } = __appScope;
    const previewEdge = {
      ...edge,
      sourcePoint: isBusNode(endpoints.source) ? endpoints.start : edge.sourcePoint,
      targetPoint: isBusNode(endpoints.target) ? endpoints.end : edge.targetPoint
    };
    const route = routeEdgesForStoredRendering(compactPreviewNodes(endpoints.source, endpoints.target), [previewEdge], canvasBounds)[0];
    return route?.points.length
      ? route.points
      : simpleOrthogonalDragPreviewPoints(endpoints.start, endpoints.end);
  };
}

export function createBuildLightweightNodeDragPreviewRoutes(__appScope: Record<string, any>) {
  return (
    dragState: DraggingState,
    delta: Point,
    scopedPreviewEdges?: Edge[]
  ): NodeDragPreviewRoute[] => {
  const { buildCachedSingleNodeDragPreviewRoutes, buildDragPreviewEndpointPoints, buildRoutableLineDragPreviewRoutes, cachedConnectionStrokeColor, connectionEndpointPreviewRoutePoints, getRouteEndpointNormal, isBusNode, isMultiNodeMoveState, nodeById, pointsToPreviewPath, preserveDraggedRouteShape, singleNodeDragPreviewEdges, visibleEdgeIdSet } = __appScope;
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, delta)
    );
    const multiNodeMove = isMultiNodeMoveState(dragState);
    const dragCache = dragState.singleNodeDragCache;
    const cachedSingleNodePreviewRoutes = !multiNodeMove
      ? buildCachedSingleNodeDragPreviewRoutes(dragCache, delta, previewEdges)
      : null;
    const routableLinePreviewRoutes = buildRoutableLineDragPreviewRoutes(dragState, delta);
    if (cachedSingleNodePreviewRoutes) {
      return [...cachedSingleNodePreviewRoutes, ...routableLinePreviewRoutes];
    }
    const overlayPreviewCache = multiNodeMove ? dragState.overlayPreview : undefined;
    const movedNodeIds = dragCache?.movedNodeIds ?? overlayPreviewCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    const draggedEdgeIds = dragCache?.draggedEdgeIds ?? overlayPreviewCache?.draggedEdgeIds ?? new Set(dragState.edgeIds);
    const movedBusIds = dragCache?.movedBusNodeIds ?? overlayPreviewCache?.movedBusNodeIds ?? new Set(
      dragState.nodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    const edgePreviewRoutes = previewEdges.flatMap((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return [];
      }
      const sourceMoved = movedNodeIds.has(edge.sourceId);
      const targetMoved = movedNodeIds.has(edge.targetId);
      if (multiNodeMove && sourceMoved && targetMoved) {
        return [];
      }
      if (!sourceMoved && !targetMoved && !draggedEdgeIds.has(edge.id)) {
        return [];
      }
      const endpoints = buildDragPreviewEndpointPoints(dragState, edge, delta, movedNodeIds, draggedEdgeIds, movedBusIds);
      if (!endpoints) {
        return [];
      }
      const color = cachedConnectionStrokeColor(edge);
      const originalRoute = dragState.originalRoutePoints[edge.id];
      const previewPoints = originalRoute?.length
        ? preserveDraggedRouteShape({
            routePoints: originalRoute,
            nextStart: endpoints.start,
            nextEnd: endpoints.end,
            sourceDelta: { x: endpoints.start.x - originalRoute[0].x, y: endpoints.start.y - originalRoute[0].y },
            targetDelta: {
              x: endpoints.end.x - originalRoute[originalRoute.length - 1].x,
              y: endpoints.end.y - originalRoute[originalRoute.length - 1].y
            },
            sourceNormal: getRouteEndpointNormal(endpoints.source, endpoints.start, endpoints.end, edge.sourceTerminalId),
            targetNormal: getRouteEndpointNormal(endpoints.target, endpoints.end, endpoints.start, edge.targetTerminalId)
          })
        : connectionEndpointPreviewRoutePoints(edge, endpoints);
      return [{
        edgeId: edge.id,
        path: pointsToPreviewPath(previewPoints),
        color
      }];
    });
    return [...edgePreviewRoutes, ...routableLinePreviewRoutes];
  };
}

export function createBuildLightweightNodeDragPreviewRouteMarkup(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point, scopedPreviewEdges?: Edge[]) => {
  const { buildLightweightNodeDragPreviewRoutes, escapeXml, isMultiNodeMoveState, singleNodeDragPreviewEdges } = __appScope;
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, delta)
    );
    return buildLightweightNodeDragPreviewRoutes(dragState, delta, previewEdges)
      .map((route) => `<path class="connection-line drag-preview" data-drag-preview-edge-id="${escapeXml(route.edgeId)}" d="${escapeXml(route.path)}" style="--connection-color:${escapeXml(route.color)}"/>`)
      .join("");
  };
}

export function createSyncImperativeNodeDragPreviewPaths(__appScope: Record<string, any>) {
  return (edgePreview: SVGGElement, routes: NodeDragPreviewRoute[]) => {
  const { imperativeNodeDragEdgePreviewPathRefs } = __appScope;
    const pathRefs = imperativeNodeDragEdgePreviewPathRefs.current;
    if (routes.length === 0) {
      for (const path of pathRefs.values()) {
        path.remove();
      }
      pathRefs.clear();
      edgePreview.style.display = "none";
      return;
    }
    const activeEdgeIds = new Set<string>();
    for (const route of routes) {
      activeEdgeIds.add(route.edgeId);
      let path = pathRefs.get(route.edgeId);
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connection-line drag-preview");
        path.setAttribute("data-drag-preview-edge-id", route.edgeId);
        pathRefs.set(route.edgeId, path);
        edgePreview.appendChild(path);
      } else if (path.parentNode !== edgePreview) {
        edgePreview.appendChild(path);
      }
      if (path.getAttribute("d") !== route.path) {
        path.setAttribute("d", route.path);
      }
      if (path.style.getPropertyValue("--connection-color") !== route.color) {
        path.style.setProperty("--connection-color", route.color);
      }
    }
    for (const [edgeId, path] of pathRefs) {
      if (activeEdgeIds.has(edgeId)) {
        continue;
      }
      path.remove();
      pathRefs.delete(edgeId);
    }
    edgePreview.style.display = routes.length > 0 ? "" : "none";
  };
}

export function createUpdateNodeDragLightweightEdgePreview(__appScope: Record<string, any>) {
  return (dragState: DraggingState, previewDelta: Point, scopedPreviewEdges?: Edge[]) => {
  const { buildLightweightNodeDragPreviewRoutes, imperativeNodeDragEdgePreviewKeyRef, imperativeSingleNodeDragEdgePreviewRef, isMultiNodeMoveState, singleNodeDragPreviewEdges, singleNodeDragPreviewKey, syncImperativeNodeDragPreviewPaths } = __appScope;
    const edgePreview = imperativeSingleNodeDragEdgePreviewRef.current;
    if (!edgePreview) {
      return;
    }
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, previewDelta)
    );
    const roundedPreviewDelta = { x: Math.round(previewDelta.x), y: Math.round(previewDelta.y) };
    const previewKey = isMultiNodeMoveState(dragState)
      ? `multi:${roundedPreviewDelta.x},${roundedPreviewDelta.y}:${previewEdges.length}:${previewEdges[0]?.id ?? ""}:${previewEdges[previewEdges.length - 1]?.id ?? ""}`
      : singleNodeDragPreviewKey(dragState, roundedPreviewDelta, previewEdges);
    if (imperativeNodeDragEdgePreviewKeyRef.current === previewKey) {
      if (previewKey) {
        return;
      }
    }
    const routes = buildLightweightNodeDragPreviewRoutes(dragState, roundedPreviewDelta, previewEdges);
    syncImperativeNodeDragPreviewPaths(edgePreview, routes);
    imperativeNodeDragEdgePreviewKeyRef.current = previewKey;
  };
}

export function createSingleNodeDragInteractionNodes(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point, scopedSnapEdges?: Edge[]) => {
  const { CONNECT_TERMINAL_SNAP_TOLERANCE, getNodeScaleX, getNodeScaleY, isMultiNodeMoveState, nodeById, nodeIntersectsRenderViewport, queryNodeSpatialIndex, singleNodeDragPreviewNodeFor, singleNodeDragSnapEdges, visibleNodeIdSet, visibleNodeSpatialIndex } = __appScope;
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return [];
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const dragCache = dragState.singleNodeDragCache;
    const movedNodeIds = dragCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    const snapEdges = scopedSnapEdges ?? singleNodeDragSnapEdges(dragState, delta);
    let bounds: RenderViewportBounds | null = null;
    const includeBox = (box: RenderViewportBounds) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, box.left),
            right: Math.max(bounds.right, box.right),
            top: Math.min(bounds.top, box.top),
            bottom: Math.max(bounds.bottom, box.bottom)
          }
        : { ...box };
    };
    const includeNode = (node: ModelNode | undefined) => {
      if (!node) {
        return;
      }
      const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
      includeBox({
        left: node.position.x - halfDiagonal,
        right: node.position.x + halfDiagonal,
        top: node.position.y - halfDiagonal,
        bottom: node.position.y + halfDiagonal
      });
    };
    for (const nodeId of dragState.nodeIds) {
      includeNode(nodeById.get(nodeId));
      includeNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    if (!bounds) {
      return [];
    }
    const finalBounds = bounds as RenderViewportBounds;
    const queryBounds = {
      left: finalBounds.left - padding,
      right: finalBounds.right + padding,
      top: finalBounds.top - padding,
      bottom: finalBounds.bottom + padding
    };
    const candidatesById = new Map<string, ModelNode>();
    const addNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id) && nodeIntersectsRenderViewport(node, queryBounds)) {
        candidatesById.set(node.id, node);
      }
    };
    for (const nodeId of dragState.nodeIds) {
      addNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, queryBounds)) {
      addNode(movedNodeIds.has(node.id) ? singleNodeDragPreviewNodeFor(dragState, node.id, delta) : node);
    }
    return Array.from(candidatesById.values());
  };
}

export function createMultiNodeDragInteractionNodes(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point) => {
  const { CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT, CONNECT_TERMINAL_SNAP_TOLERANCE, dragMovedNodeIdSet, getNodeScaleX, getNodeScaleY, isMultiNodeMoveState, nodeIntersectsRenderViewport, queryNodeSpatialIndex, singleNodeDragPreviewNodeFor, visibleNodeIdSet, visibleNodeSpatialIndex } = __appScope;
    if (!isMultiNodeMoveState(dragState)) {
      return [];
    }
    if (dragState.wholeLayerMove) {
      return [];
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    if (movedNodeIds.size === 0) {
      return [];
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const snapEdges = dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [];
    const snapMovedNodeIds = new Set<string>();
    if (movedNodeIds.size <= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
      for (const nodeId of dragState.nodeIds) {
        if (movedNodeIds.has(nodeId)) {
          snapMovedNodeIds.add(nodeId);
        }
      }
    } else {
      for (const edge of snapEdges) {
        if (movedNodeIds.has(edge.sourceId)) {
          snapMovedNodeIds.add(edge.sourceId);
        }
        if (movedNodeIds.has(edge.targetId)) {
          snapMovedNodeIds.add(edge.targetId);
        }
        if (snapMovedNodeIds.size >= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
          break;
        }
      }
      for (const nodeId of dragState.nodeIds) {
        if (snapMovedNodeIds.size >= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
          break;
        }
        if (movedNodeIds.has(nodeId)) {
          snapMovedNodeIds.add(nodeId);
        }
      }
    }
    if (snapMovedNodeIds.size === 0) {
      return [];
    }
    let bounds: RenderViewportBounds | null = null;
    const includeBox = (box: RenderViewportBounds) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, box.left),
            right: Math.max(bounds.right, box.right),
            top: Math.min(bounds.top, box.top),
            bottom: Math.max(bounds.bottom, box.bottom)
          }
        : { ...box };
    };
    const includeNode = (node: ModelNode | undefined) => {
      if (!node) {
        return;
      }
      const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
      includeBox({
        left: node.position.x - halfDiagonal,
        right: node.position.x + halfDiagonal,
        top: node.position.y - halfDiagonal,
        bottom: node.position.y + halfDiagonal
      });
    };
    for (const nodeId of snapMovedNodeIds) {
      includeNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      includeNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    if (!bounds) {
      return [];
    }
    const finalBounds = bounds as RenderViewportBounds;
    const queryBounds = {
      left: finalBounds.left - padding,
      right: finalBounds.right + padding,
      top: finalBounds.top - padding,
      bottom: finalBounds.bottom + padding
    };
    const candidatesById = new Map<string, ModelNode>();
    const addNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id) && nodeIntersectsRenderViewport(node, queryBounds)) {
        candidatesById.set(node.id, node);
      }
    };
    for (const nodeId of snapMovedNodeIds) {
      addNode(singleNodeDragPreviewNodeFor(dragState, nodeId, delta));
    }
    for (const edge of snapEdges) {
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta));
      addNode(singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta));
    }
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, queryBounds)) {
      addNode(movedNodeIds.has(node.id) ? singleNodeDragPreviewNodeFor(dragState, node.id, delta) : node);
    }
    return Array.from(candidatesById.values());
  };
}

export function createUpdateImperativeNodeDragDropHint(__appScope: Record<string, any>) {
  return (snapTarget: NodeTerminalSnapTarget | null) => {
  const { colorPalette, getBusTerminalType, imperativeNodeDragDropHintRef, isBusNode, nodeById, terminalColor } = __appScope;
    const dropHint = imperativeNodeDragDropHintRef.current;
    if (!dropHint) {
      return;
    }
    if (!snapTarget) {
      dropHint.style.display = "none";
      return;
    }
    const targetNode = nodeById.get(snapTarget.targetNodeId);
    const terminalType = targetNode && isBusNode(targetNode)
      ? getBusTerminalType(targetNode)
      : targetNode?.terminals.find((terminal) => terminal.id === snapTarget.targetTerminalId)?.type;
    if (terminalType) {
      dropHint.style.setProperty("--connection-color", terminalColor(terminalType, colorPalette));
    }
    dropHint.setAttribute("transform", `translate(${Math.round(snapTarget.point.x)} ${Math.round(snapTarget.point.y)})`);
    dropHint.style.display = "";
  };
}

export function createFindSingleNodeDragSnapTargetAtDelta(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point, scopedSnapEdges?: Edge[]) => {
  const { findNodeBusSnapTarget, findNodeTerminalSnapTarget, isMultiNodeMoveState, singleNodeDragInteractionNodes } = __appScope;
    if (isMultiNodeMoveState(dragState)) {
      return null;
    }
    const candidates = singleNodeDragInteractionNodes(dragState, delta, scopedSnapEdges ?? []);
    const movedNodeIds = dragState.singleNodeDragCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    return findNodeTerminalSnapTarget(candidates, movedNodeIds) ?? findNodeBusSnapTarget(candidates, movedNodeIds);
  };
}

export function createFindMultiNodeDragSnapTargetAtDelta(__appScope: Record<string, any>) {
  return (dragState: DraggingState, delta: Point) => {
  const { dragMovedNodeIdSet, findNodeBusSnapTarget, findNodeTerminalSnapTarget, isMultiNodeMoveState, multiNodeDragInteractionNodes } = __appScope;
    if (!isMultiNodeMoveState(dragState)) {
      return null;
    }
    if (dragState.wholeLayerMove) {
      return null;
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    const candidates = multiNodeDragInteractionNodes(dragState, delta);
    return findNodeTerminalSnapTarget(candidates, movedNodeIds) ?? findNodeBusSnapTarget(candidates, movedNodeIds);
  };
}
