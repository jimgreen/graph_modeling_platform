// @ts-nocheck
/**
 * MemoizedCanvasArea - 画布区域 React.memo 组件
 *
 * 通过自定义比较器，在 tab 切换时跳过画布 SVG 协调。
 */
import { memo } from "react";

/**
 * 自定义比较器：深度比较画布相关的所有值。
 * 只有当画布实际使用的值发生变化时，才触发重渲染。
 */
function areCanvasPropsEqual(prevProps: any, nextProps: any) {
  const prev = prevProps.scope;
  const next = nextProps.scope;

  // 快速路径：如果引用相同，直接返回 true
  if (prev === next) {
    console.log('[memo] scope 引用相同，跳过');
    return true;
  }

  // 比较画布状态标志（这些是经常变化的）
  const stateKeys = [
    'panning', 'multiNodeDragging', 'singleNodeDragging', 'connectSource',
    'staticDrawing', 'libraryPlacement', 'contextMarqueeSelection', 'activeDropReady',
    'isEditMode', 'isBrowseMode', 'rewiring', 'routableLinePlacement',
    'routableLineEndpointDrag', 'transformDrag', 'nodeLabelDrag', 'nodeLabelRotateDrag',
    'manualPathDrag', 'hasCanvasSelectionModifier', 'isRepeatedEdgePointerClick'
  ];

  for (const key of stateKeys) {
    if (prev[key] !== next[key]) {
      console.log(`[memo] 状态变化: ${key}`, prev[key], '→', next[key]);
      return false;
    }
  }

  // 比较画布显示参数
  const displayKeys = [
    'canvasDisplayWidth', 'canvasDisplayHeight', 'canvasDisplayOffsetX', 'canvasDisplayOffsetY',
    'canvasScrollSurfaceWidth', 'canvasScrollSurfaceHeight',
    'canvasHorizontalScrollbarsActive', 'canvasVerticalScrollbarsActive',
    'canvasRenderBounds'
  ];

  for (const key of displayKeys) {
    if (prev[key] !== next[key]) {
      console.log(`[memo] 显示参数变化: ${key}`, prev[key], '→', next[key]);
      return false;
    }
  }

  // 比较渲染数据（节点、边等）- 使用浅比较
  const dataKeys = [
    'visibleNodes', 'visibleEdges', 'selectedNodeIdSet', 'selectedEdgeIds',
    'marquee', 'connectPreviewDom', 'routableLinePreview', 'resizeSizeHint',
    'draggingDelta', 'connectSource', 'libraryPlacement'
  ];

  for (const key of dataKeys) {
    if (prev[key] !== next[key]) {
      console.log(`[memo] 数据变化: ${key}`);
      return false;
    }
  }

  // 比较工具栏和覆盖层状态
  const overlayKeys = [
    'nodeFloatingToolbar', 'edgeFloatingToolbar',
    'canvasResizePreviewRect', 'minimapVisible'
  ];

  for (const key of overlayKeys) {
    if (prev[key] !== next[key]) {
      console.log(`[memo] 覆盖层变化: ${key}`);
      return false;
    }
  }

  console.log('[memo] ✅ 所有值相同，跳过重渲染');
  return true;
}

/**
 * MemoizedCanvasArea - 接收整个 __appScope，内部解构使用。
 */
export const MemoizedCanvasArea = memo(function CanvasAreaInner({ scope }: { scope: Record<string, any> }) {
  console.log(`[perf] MemoizedCanvasArea render at ${performance.now().toFixed(2)}ms`);
  // 从 scope 解构所有画布需要的变量
  const {
    svgRef, canvasFrameRef, canvasInteractionRef, projectListPointerInsideRef,
    lastRawCanvasPointerRef, lastCanvasPointerRef, lastCanvasClientPointerRef,
    canvasSelectionShortcutActiveRef, draggingRef, panningRef, modifierSelectionPressRef,
    lastEdgePointerClickRef, connectDropHintElementRef, connectPreviewHandleElementRef,
    connectPreviewPathElementRef, connectPreviewPointRef, imperativeMultiNodeDragOverlayRef,
    imperativeNodeDragDropHintRef, imperativeSingleNodeDragEdgePreviewRef,
    imperativeSingleNodeDragNodeOverlayRef, staticButtonPointerRef, contextMarqueeSelectionRef,
    canvasResizeHotzonesRef,
    canvasDisplayWidth, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY,
    canvasRenderBounds, canvasScrollSurfaceWidth, canvasScrollSurfaceHeight,
    canvasHorizontalScrollbarsActive, canvasVerticalScrollbarsActive,
    canvasBackgroundColor, canvasBackgroundImageUrl,
    connectSource, staticDrawing, libraryPlacement, contextMarqueeSelection,
    activeDropReady, panning, multiNodeDragging, singleNodeDragging,
    isEditMode, isBrowseMode, isReadonlyCanvasMode, mode,
    nodeLabelDrag, nodeLabelRotateDrag, manualPathDrag, transformDrag,
    isGroupTransformDrag, rewiring, routableLinePlacement, routableLineEndpointDrag,
    hasCanvasSelectionModifier, isRepeatedEdgePointerClick,
    handleCanvasPointerDownCapture, handlePointerMove, handleWheel, handleDrop,
    handleNodePointerDown, handleLodNodePointerDown, handleLodNodeContextMenu,
    handleLodNodeDoubleClick, handleStaticButtonClick, handleEdgePathPointerDown,
    handleRoutableLineNodePathPointerDown, handleTerminalPointerDown, handleMinimapNavigate,
    startCanvasPanning, startCanvasResize, startCanvasResizeFromTopOverlay,
    startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay,
    startCanvasResizeFromBottomOverlay, startGroupMoveDrag, startGroupTransformDrag,
    startSingleTransformDrag, startNodeLabelDrag, startNodeLabelRotateDrag,
    startManualPointDrag, startManualSegmentDrag, startRoutableLineEndpointDrag,
    startRoutableLineFromTerminal, startRoutableLinePointDrag, startRoutableLineSegmentDrag,
    startModifierSelectionPress, finishCanvasPanning, finishNodeDrag,
    finishNodeLabelDrag, finishNodeLabelRotateDrag, finishManualPathDrag,
    finishMarqueeSelection, finishMarqueeSelectionFromPoints, finishMeasurementDrag,
    finishModifierSelectionPress, finishRewiring, finishRoutableLineEndpointDrag,
    finishRoutableLineToTarget, finishTerminalPress, finishTransformDrag,
    finishConnectToTarget, finishInteractiveStaticDrawing,
    fitWholeCanvasFromBlankDoubleClick,
    selectCanvasGraphics, deleteSelection, copySelection, cutSelection,
    groupSelectedGraphics, ungroupSelectedGraphics, assignSelectedNodesToModelLayer,
    toggleSelectedNodeLabelDisplay, clearLibraryPlacementPreview, clearRecordSelection,
    clearStaticButtonFeedback, centerSelectedInView, fitViewToSelection,
    fitWholeCanvasToFrame, zoomViewportAtCenter, tidySelectedEdgeRoute,
    cancelLibraryPlacement, cancelModifierSelectionPress,
    setCanvasSelectionScope, setConnectSource, setContextMarqueeSelection,
    setMarquee, setMinimapVisible, setMode, setRewiring,
    setRoutableLineEndpointDrag, setRoutableLinePlacement,
    setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds,
    setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds,
    setStaticButtonFeedback, setTerminalPress,
    resetConnectPreviewState, resetRoutableLinePreviewState, resetViewportZoom,
    applyConnectPreviewState, applyRoutableLinePreviewState,
    updateLibraryPlacementPreview, updateMouseStatus,
    commitLibraryPlacementAtPoint, flushConnectPreviewDom,
    focusCanvasKeyboardShortcutHost, consumeGraphicContextMenuHandled,
    activateInspectorFromCanvas, switchInspectorTabForCanvasSelection,
    screenToSvgPoint, clampPointToCanvas, mapPointToMinimap,
    findConnectTargetAtPoint, findConnectionRouteHitAtPoint,
    findRewireTargetAtPoint, findRoutableLineEndpointTargetAtPoint,
    getEdgeEndpointPoint, getMovableRouteSegmentIndexes,
    getNodeScaleX, getNodeScaleY, getTerminalDisplayColor,
    renderViewportRoutedEdges, renderBoundaryBusInternalConnector,
    renderGroupTransformPhotoPreview, renderInteractiveStaticDrawingPreview,
    renderLibraryPlacementPreview, renderMeasurementGroup,
    renderMultiNodeDragOverlay, renderNodePreviewImageContent,
    renderReadonlyBackgroundPage, renderSingleTransformRotateOriginGhost,
    renderTransformRotationTrajectory,
    busEndpointColor, scaleHandleCursorClass, svgStrokeDashArray,
    terminalStubSegment, terminalStubStrokeWidth, terminalRenderLocalPoint,
    nodeKindAllowsResizeTransform, nodeLabelShouldRender, nodeLabelText,
    nodeLabelTextAnchor, nodeLabelVertical, nodeLabelVerticalSegments,
    nodeLabelVerticalTokenY, nodeLabelVerticalTokenStyle,
    nodeLabelTextStyle, nodeLabelTransform,
    nodeUsesUprightStaticSelectionOutline, nodeUprightSelectionOutlineRect,
    isBusNode, isStaticNode, isRoutableLineDeviceKind,
    canConnectTerminals,
    isCanvasGraphicContextMenuTarget,
    isStaticButtonEnabledForNode, isStaticBoxLikeNode,
    resolveNodeStateVisual, resolveConnectPreviewPoint, resolveRoutableLinePreviewPoint,
    sameOptionalPoint, pointsToOrthogonalPath,
    routableLineDeviceCanvasPoints, routableLineDeviceRenderLocalPoints,
    formatSvgNumber,
    appendConnectPreviewManualPoint, appendRoutableLinePreviewManualPoint,
    appendStaticDrawingPoint, insertManualBendFromEdgePath, insertManualBendFromPointer,
    deleteManualBendPoint, deleteRoutableLineBendPoint,
    scheduleRoutableLinePreviewPoint,
    openAddTemplateDialog, openGroupDeviceDefinitionDialog, openLayerAssignmentDialog,
    openEdgeContextMenu, openGraphicContextMenu, openNodeDoubleClickEditor,
    useSimplifiedCanvasNodes, useSimplifiedCanvasRoutes, useSimplifiedSelectedCanvasNodes,
    canGroupSelectedGraphics, canUngroupSelectedGraphics, canAddTemplateFromSelection,
    CANVAS_MINIMAP_WIDTH, CANVAS_MINIMAP_HEIGHT, DEFAULT_CANVAS_BACKGROUND,
    TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP,
    SCALE_HANDLE_CONFIGS, GROUP_SCALE_HANDLE_CONFIGS,
    Copy, Grid2X2, Group, Layers, Layers2, LocateFixed, MapIcon,
    Maximize2, MemoDeviceGlyph, Minus, Plus, RotateCcw, Route,
    ScanSearch, Scissors, Trash2, Type, Ungroup, X,
    SvgMarkupChunk,
    nodeById, detailedViewportNodes, nodeImage, nodeForegroundImage,
    nodeGeometryTransform, nodeImageContentTransform,
    nodeLabelFontSize, nodeRotateHandleControlPoints, nodeScaleHandleControlPoint,
    nodeUprightRotateHandleControlPoints,
    edgeById, connectionLineStyle, initialCanvasDetailedEdgeIdSet,
    detailedSelectedEdgeIdSet, selectedRoutableLineManualPathRoute, selectedRoutedEdge,
    terminalPressPreviewEdgeIdSet, terminalPressPreviewEdgeRoutes,
    connectPreviewDom, connectPreviewColor, routableLinePreview,
    routableLinePlacementColor, routableLineEndpointDragPreviewRoute,
    rewiringPreviewRoute, manualPathPreviewRoute, resizeSizeHint, marquee,
    selectedNodeId, selectedNodeIdSet, selectedEdge, selectedNodeCount,
    selectedTransformGroupUnit, visibleSelectedGroupLayoutUnits,
    selectedViewportActionDisabled, selectionRectCenter,
    activeLayer, activeLayerId, activeLayerEdgeIdSet, activeLayerNodeIdSet,
    activeProjectKey, activeSchemeKey, activeSelectedEdgeSet,
    activeDropHintPoint, activeDropHintStyle,
    lodCanvasNodeChunks, lodCanvasRouteChunks, lodSelectedNodeMarkup,
    minimapVisible, minimapNodes, minimapRoutes,
    minimapContentWidth, minimapContentHeight,
    minimapOffsetX, minimapOffsetY, minimapScale,
    minimapViewportLeft, minimapViewportRight, minimapViewportTop, minimapViewportBottom,
    nodeFloatingToolbar, edgeFloatingToolbar,
    floatingToolbarIconSize, floatingToolbarWrapperStyle,
    viewportOverlayStyle, canvasResizeHandles, canvasResizePreviewRect,
    canvasResizeHotzoneStyle,
    colorDisplayMode, colorPalette, deviceLabelsVisible,
    overlappedTerminalKeys, visibleMeasurementGroups, smartAlignmentGuides,
    draggingDelta, draggingNodeIdSet, dragAffectedEdgeIdSet,
    dragGhostEdgeIdSet, dragGhostEdgeRoutes, dragGhostRoutableLineNodeIdSet,
    dragOverlayEdgeIdSet, dragPreviewEdgeIdSet, dragPreviewEdgeRoutes,
    connectTerminalCompatibilityActive, connectSourceNode, connectTargetPoint, connectTargetSnapPoint,
    routableLineTerminalCompatibilityActive, routableLineActiveTerminalType,
    groupTransformPreviewGroupId, groupTransformPreviewEdgeIdSet, groupTransformPreviewNodeIdSet,
    groupTransformPreviewRoutableLineNodeIdSet,
    dragging, bindCanvasNodeElement, staticButtonVisual,
    centerSelectedViewportTitle, fitSelectedViewportTitle,
    routableLineEndpointHandles, routableLineEndpointDragColor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } = scope;

  return (
    <>
        <section className="canvas-frame" ref={canvasFrameRef} tabIndex={-1} onPointerEnter={focusCanvasKeyboardShortcutHost} onPointerMove={focusCanvasKeyboardShortcutHost} style={{
        overflowX: canvasHorizontalScrollbarsActive ? "auto" : "hidden",
        overflowY: canvasVerticalScrollbarsActive ? "auto" : "hidden"
    }}>
          <div className="canvas-scroll-surface" style={{ width: canvasScrollSurfaceWidth, height: canvasScrollSurfaceHeight }} onPointerDown={(event) => {
        if (event.button !== 0 || event.target !== event.currentTarget || staticDrawing || libraryPlacement || connectSource) {
            return;
        }
        if (isEditMode && startCanvasResizeFromTopOverlay(event)) {
            return;
        }
        if (isEditMode && startCanvasResizeFromLeftOverlay(event)) {
            return;
        }
        if (isEditMode && startCanvasResizeFromRightOverlay(event)) {
            return;
        }
        if (isEditMode && startCanvasResizeFromBottomOverlay(event)) {
            return;
        }
        if (isEditMode && hasCanvasSelectionModifier(event)) {
            startModifierSelectionPress(event);
            return;
        }
        startCanvasPanning(event);
    }} onPointerMove={(event) => {
        if (panningRef.current || modifierSelectionPressRef.current) {
            handlePointerMove(event as unknown as PointerEvent<SVGSVGElement>);
        }
    }} onPointerUp={(event) => {
        finishModifierSelectionPress(event.pointerId);
        finishCanvasPanning();
    }} onPointerCancel={() => {
        cancelModifierSelectionPress();
        finishCanvasPanning();
    }} onLostPointerCapture={() => {
        cancelModifierSelectionPress();
        finishCanvasPanning();
    }} onDoubleClick={(event) => {
        if (event.button !== 0 || event.target !== event.currentTarget) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        fitWholeCanvasToFrame();
    }}>
            <svg ref={svgRef} className={`diagram-canvas ${connectSource ? "connect-mode" : ""} ${staticDrawing ? "static-draw-mode" : ""} ${libraryPlacement ? "library-place-mode" : ""} ${contextMarqueeSelection ? "context-marquee-mode" : ""} ${activeDropReady ? "connect-drop-ready" : ""} ${panning ? "panning" : ""} ${multiNodeDragging ? "multi-node-dragging" : ""} ${singleNodeDragging ? "single-node-dragging" : ""}`} style={{ width: canvasDisplayWidth, height: canvasDisplayHeight, left: canvasDisplayOffsetX, top: canvasDisplayOffsetY }} viewBox={`0 0 ${canvasRenderBounds.width} ${canvasRenderBounds.height}`} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} onWheel={handleWheel} onDoubleClick={fitWholeCanvasFromBlankDoubleClick} onPointerDownCapture={handleCanvasPointerDownCapture} onPointerMove={handlePointerMove} onPointerEnter={(event) => {
        canvasInteractionRef.current = true;
        projectListPointerInsideRef.current = false;
        const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
        const pointer = clampPointToCanvas(rawPointer);
        lastRawCanvasPointerRef.current = rawPointer;
        lastCanvasPointerRef.current = pointer;
        lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
        updateMouseStatus(pointer);
        if (libraryPlacement) {
            updateLibraryPlacementPreview(pointer);
        }
        if (routableLinePlacement) {
            const previewPoint = resolveRoutableLinePreviewPoint(pointer, event);
            scheduleRoutableLinePreviewPoint(previewPoint);
        }
    }} onPointerUp={(event) => {
        if (finishMeasurementDrag(event.pointerId)) {
            return;
        }
        if (finishModifierSelectionPress(event.pointerId)) {
            return;
        }
        finishRewiring(event);
        finishRoutableLineEndpointDrag();
        finishTerminalPress();
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishMarqueeSelection();
        finishNodeDrag();
        finishManualPathDrag();
        finishTransformDrag();
        finishCanvasPanning();
    }} onPointerLeave={() => {
        clearLibraryPlacementPreview();
        lastCanvasClientPointerRef.current = null;
        if (routableLinePlacement) {
            resetRoutableLinePreviewState();
        }
        if (draggingRef.current) {
            canvasInteractionRef.current = true;
            projectListPointerInsideRef.current = false;
            return;
        }
        if (canvasSelectionShortcutActiveRef.current) {
            canvasInteractionRef.current = true;
            projectListPointerInsideRef.current = false;
            return;
        }
        canvasInteractionRef.current = false;
        if (manualPathDrag) {
            return;
        }
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishNodeDrag();
        if (panningRef.current) {
            return;
        }
        if (modifierSelectionPressRef.current) {
            return;
        }
        if (contextMarqueeSelectionRef.current) {
            return;
        }
        setTerminalPress(null);
        setRoutableLineEndpointDrag(null);
        finishManualPathDrag();
        finishTransformDrag();
        setMarquee(null);
        setRewiring(null);
    }} onPointerCancel={() => {
        finishMeasurementDrag();
        cancelModifierSelectionPress();
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishNodeDrag();
        setTerminalPress(null);
        setRoutableLineEndpointDrag(null);
        finishManualPathDrag();
        finishTransformDrag();
        finishCanvasPanning();
        setContextMarqueeSelection(null);
        setMarquee(null);
        setRewiring(null);
    }} onLostPointerCapture={() => {
        finishMeasurementDrag();
        cancelModifierSelectionPress();
        finishNodeLabelDrag();
        finishNodeLabelRotateDrag();
        finishNodeDrag();
        setTerminalPress(null);
        setRoutableLineEndpointDrag(null);
        finishManualPathDrag();
        finishTransformDrag();
        finishCanvasPanning();
        setContextMarqueeSelection(null);
    }} onPointerDown={(event) => {
        if (event.button !== 0) {
            return;
        }
        activateInspectorFromCanvas();
        canvasInteractionRef.current = true;
        projectListPointerInsideRef.current = false;
        const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
        const pointer = clampPointToCanvas(rawPointer);
        lastRawCanvasPointerRef.current = rawPointer;
        lastCanvasPointerRef.current = pointer;
        lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
        updateMouseStatus(pointer);
        if (routableLinePlacement) {
            const previewPoint = resolveRoutableLinePreviewPoint(pointer, event);
            const target = findRoutableLineEndpointTargetAtPoint(previewPoint);
            applyRoutableLinePreviewState(previewPoint, target ? connectTargetPoint(target) : null, target);
            if (target) {
                if (routableLinePlacement.source) {
                    finishRoutableLineToTarget(target, routableLinePlacement.manualPoints);
                }
                else {
                    startRoutableLineFromTerminal(target.node, target.terminalId, target.point);
                }
            }
            else if (routableLinePlacement.source) {
                const nextPlacement = appendRoutableLinePreviewManualPoint(previewPoint);
                applyRoutableLinePreviewState(previewPoint, null, null, nextPlacement ?? routableLinePlacement);
            }
            return;
        }
        if (libraryPlacement) {
            commitLibraryPlacementAtPoint(pointer);
            return;
        }
        if (staticDrawing) {
            appendStaticDrawingPoint(pointer, event.detail >= 2);
            return;
        }
        if (connectSource) {
            const previewPoint = resolveConnectPreviewPoint(pointer, event);
            const target = findConnectTargetAtPoint(previewPoint);
            applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
            if (target) {
                finishConnectToTarget(target, previewPoint);
            }
            else {
                const nextConnectSource = appendConnectPreviewManualPoint(previewPoint);
                applyConnectPreviewState(previewPoint, false, null, null, nextConnectSource ?? connectSource);
            }
            return;
        }
        if (contextMarqueeSelectionRef.current) {
            finishMarqueeSelectionFromPoints(contextMarqueeSelectionRef.current.start, pointer);
            setContextMarqueeSelection(null);
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const routeHit = isReadonlyCanvasMode ? null : findConnectionRouteHitAtPoint(pointer);
        if (hasCanvasSelectionModifier(event)) {
            startModifierSelectionPress(event, routeHit ? { kind: "edge", edgeId: routeHit.edgeId } : undefined);
            return;
        }
        if (routeHit) {
            const edgeClick = {
                edgeId: routeHit.edgeId,
                clientX: event.clientX,
                clientY: event.clientY,
                at: Date.now()
            };
            const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
            lastEdgePointerClickRef.current = edgeClick;
            selectCanvasGraphics([], [routeHit.edgeId]);
            setConnectSource(null);
            resetConnectPreviewState();
            setRewiring(null);
            clearRecordSelection();
            if (event.detail >= 2 || repeatedClick) {
                insertManualBendFromPointer(routeHit.edgeId, routeHit.routePoints, pointer);
                lastEdgePointerClickRef.current = null;
            }
            return;
        }
        lastEdgePointerClickRef.current = null;
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
        if (event.detail >= 2) {
            event.preventDefault();
            setMarquee(null);
            fitWholeCanvasToFrame();
            return;
        }
        startCanvasPanning(event);
        return;
    }} onContextMenu={(event) => {
        event.preventDefault();
        if (consumeGraphicContextMenuHandled()) {
            event.stopPropagation();
            return;
        }
        if (isCanvasGraphicContextMenuTarget(event.target)) {
            event.stopPropagation();
            return;
        }
        const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
        const pointer = clampPointToCanvas(rawPointer);
        lastRawCanvasPointerRef.current = rawPointer;
        lastCanvasPointerRef.current = pointer;
        lastCanvasClientPointerRef.current = { x: event.clientX, y: event.clientY };
        updateMouseStatus(pointer);
        if (libraryPlacement) {
            cancelLibraryPlacement();
            return;
        }
        if (routableLinePlacement) {
            setRoutableLinePlacement(null);
            resetRoutableLinePreviewState();
            setMode("select");
            return;
        }
        if (staticDrawing) {
            finishInteractiveStaticDrawing(pointer);
            return;
        }
        if (connectSource) {
            setConnectSource(null);
            resetConnectPreviewState();
            setMode("select");
            return;
        }
        if (isReadonlyCanvasMode) {
            setContextMenu(null);
            return;
        }
        const routeHit = findConnectionRouteHitAtPoint(pointer);
        if (routeHit) {
            selectCanvasGraphics([], [routeHit.edgeId]);
            setConnectSource(null);
            resetConnectPreviewState();
            setRewiring(null);
            clearRecordSelection();
            setContextMenu({
                x: event.clientX,
                y: event.clientY,
                target: "edge",
                canvasPoint: pointer,
                edgeId: routeHit.edgeId,
                routePoints: routeHit.routePoints.map((point) => ({ ...point }))
            });
            return;
        }
        setContextMenu({ x: event.clientX, y: event.clientY, target: "blank", canvasPoint: pointer });
    }}>
            <defs>
              <pattern id="small-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e2e8f0" strokeWidth="0.45"/>
              </pattern>
              <pattern id="large-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <rect width="25" height="25" fill="url(#small-grid)"/>
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#cbd5e1" strokeWidth="0.8"/>
              </pattern>
            </defs>
            <rect width={canvasRenderBounds.width} height={canvasRenderBounds.height} fill={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND}/>
            {canvasBackgroundImageUrl && (<image href={canvasBackgroundImageUrl} x="0" y="0" width={canvasRenderBounds.width} height={canvasRenderBounds.height} preserveAspectRatio="xMidYMid slice" pointerEvents="none"/>)}
            <rect width={canvasRenderBounds.width} height={canvasRenderBounds.height} fill="url(#large-grid)"/>
            <rect className="canvas-boundary" x="0" y="0" width={canvasRenderBounds.width} height={canvasRenderBounds.height}/>
            {renderReadonlyBackgroundPage()}
            <g className="canvas-content">
            {marquee && (<rect className="marquee-box" x={Math.min(marquee.start.x, marquee.current.x)} y={Math.min(marquee.start.y, marquee.current.y)} width={Math.abs(marquee.current.x - marquee.start.x)} height={Math.abs(marquee.current.y - marquee.start.y)}/>)}
            {renderLibraryPlacementPreview()}
            {renderInteractiveStaticDrawingPreview()}
            {smartAlignmentGuides.map((guide) => (<line key={guide.id} className={`smart-alignment-guide smart-alignment-guide-${guide.orientation}`} x1={guide.orientation === "vertical" ? guide.position : guide.start} y1={guide.orientation === "vertical" ? guide.start : guide.position} x2={guide.orientation === "vertical" ? guide.position : guide.end} y2={guide.orientation === "vertical" ? guide.end : guide.position} vectorEffect="non-scaling-stroke"/>))}
            {dragGhostEdgeRoutes.map((route) => (<path key={`drag-ghost-edge-${route.edgeId}`} d={route.path} className="connection-line drag-ghost" style={route.color ? ({ "--connection-color": route.color } as CSSProperties) : connectionLineStyle(route.edgeId)}/>))}
            {lodCanvasRouteChunks.length > 0 && (<g className="lod-route-layer">
                {lodCanvasRouteChunks.map((chunk) => (<SvgMarkupChunk key={chunk.key} className="lod-route-layer-chunk" markup={chunk.markup}/>))}
              </g>)}
            {dragging?.historyCaptured && !multiNodeDragging && dragging.nodeIds.map((nodeId) => {
        const node = nodeById.get(nodeId);
        const originalPosition = dragging.originalPositions[nodeId];
        if (!node || !originalPosition) {
            return null;
        }
        const ghostNode = { ...node, position: originalPosition };
        const ghostNodeIsBus = isBusNode(ghostNode);
        return (<g key={`drag-ghost-${node.id}`} className={`node-drag-ghost ${ghostNodeIsBus ? "bus-node" : ""}`} transform={`translate(${ghostNode.position.x} ${ghostNode.position.y})`}>
                  <g transform={nodeGeometryTransform(ghostNode)}>
                    <rect x={-ghostNode.size.width / 2} y={-ghostNode.size.height / 2} width={ghostNode.size.width} height={ghostNode.size.height} rx="8" className="node-drag-ghost-box"/>
                    <MemoDeviceGlyph node={ghostNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(ghostNode)}/>
                    <MemoDeviceGlyph node={ghostNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(ghostNode)}/>
                  </g>
                  {renderNodePreviewImageContent(ghostNode, `drag-ghost-preview-clip-${ghostNode.id}`)}
                </g>);
    })}
            {renderViewportRoutedEdges.map((route) => {
        const edge = edgeById.get(route.edgeId);
        if (!edge)
            return null;
        const selected = activeSelectedEdgeSet.has(edge.id);
        if (dragGhostEdgeIdSet.has(edge.id) ||
            (multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id)) ||
            groupTransformPreviewEdgeIdSet.has(edge.id) ||
            terminalPressPreviewEdgeIdSet.has(edge.id) ||
            rewiring?.edgeId === edge.id) {
            return null;
        }
        const detailedByInitialHydration = initialCanvasDetailedEdgeIdSet.has(edge.id);
        if (useSimplifiedCanvasRoutes && !selected && !detailedByInitialHydration) {
            return null;
        }
        if (useSimplifiedCanvasRoutes && selected && !detailedSelectedEdgeIdSet.has(edge.id) && !detailedByInitialHydration) {
            return null;
        }
        const sourcePoint = getEdgeEndpointPoint(edge, "source");
        const targetPoint = getEdgeEndpointPoint(edge, "target");
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const editable = isEditMode && activeLayerEdgeIdSet.has(edge.id);
        const inactiveLayerGraphic = isEditMode && !editable;
        const rewiringSource = rewiring?.edgeId === edge.id && rewiring.endpoint === "source";
        const rewiringTarget = rewiring?.edgeId === edge.id && rewiring.endpoint === "target";
        const rewireTarget = rewiring?.edgeId === edge.id ? findRewireTargetAtPoint(rewiring.previewPoint, rewiring) : null;
        const sourceBusDotPoint = rewiringSource
            ? rewireTarget?.node && isBusNode(rewireTarget.node)
                ? rewireTarget.point
                : undefined
            : sourcePoint && sourceNode && isBusNode(sourceNode)
                ? sourcePoint
                : undefined;
        const targetBusDotPoint = rewiringTarget
            ? rewireTarget?.node && isBusNode(rewireTarget.node)
                ? rewireTarget.point
                : undefined
            : targetPoint && targetNode && isBusNode(targetNode)
                ? targetPoint
                : undefined;
        return (<g key={edge.id} className={`connection-group ${selected ? "selected" : ""} ${inactiveLayerGraphic ? "inactive-layer-graphic" : ""}`} style={connectionLineStyle(edge.id)} data-edge-id={edge.id}>
                  <path d={route.path} className="connection-hitline" onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined} onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined} onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}/>
                  <path d={route.path} className="connection-line" onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined} onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined} onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}/>
                  {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-source-internal-connector`)}
                  {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-target-internal-connector`)}
                  {isEditMode && sourceBusDotPoint && (<circle className="bus-connection-dot" cx={sourceBusDotPoint.x} cy={sourceBusDotPoint.y} r={7} fill={busEndpointColor((rewiringSource ? rewireTarget?.node : sourceNode) ?? sourceNode!, colorPalette)} onPointerDown={editable ? (event) => {
                    event.stopPropagation();
                    if (event.button !== 0 || !svgRef.current) {
                        return;
                    }
                    selectCanvasGraphics([], [edge.id]);
                    setRewiring({
                        edgeId: edge.id,
                        endpoint: "source",
                        previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                        pointerId: event.pointerId
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                } : undefined}/>)}
                  {isEditMode && targetBusDotPoint && (<circle className="bus-connection-dot" cx={targetBusDotPoint.x} cy={targetBusDotPoint.y} r={7} fill={busEndpointColor((rewiringTarget ? rewireTarget?.node : targetNode) ?? targetNode!, colorPalette)} onPointerDown={editable ? (event) => {
                    event.stopPropagation();
                    if (event.button !== 0 || !svgRef.current) {
                        return;
                    }
                    selectCanvasGraphics([], [edge.id]);
                    setRewiring({
                        edgeId: edge.id,
                        endpoint: "target",
                        previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                        pointerId: event.pointerId
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                } : undefined}/>)}
                  {isEditMode && selected && sourcePoint && (<circle className="edge-endpoint-handle" cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x} cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y} r={8} onPointerDown={(event) => {
                    event.stopPropagation();
                    if (event.button !== 0 || !svgRef.current) {
                        return;
                    }
                    if (hasCanvasSelectionModifier(event)) {
                        startModifierSelectionPress(event, { kind: "edge", edgeId: edge.id });
                        return;
                    }
                    setRewiring({
                        edgeId: edge.id,
                        endpoint: "source",
                        previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                        pointerId: event.pointerId
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}/>)}
                  {isEditMode && selected && targetPoint && (<circle className="edge-endpoint-handle" cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x} cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y} r={8} onPointerDown={(event) => {
                    event.stopPropagation();
                    if (event.button !== 0 || !svgRef.current) {
                        return;
                    }
                    if (hasCanvasSelectionModifier(event)) {
                        startModifierSelectionPress(event, { kind: "edge", edgeId: edge.id });
                        return;
                    }
                    setRewiring({
                        edgeId: edge.id,
                        endpoint: "target",
                        previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                        pointerId: event.pointerId
                    });
                    event.currentTarget.setPointerCapture(event.pointerId);
                }}/>)}
                </g>);
    })}
            {visibleSelectedGroupLayoutUnits.map((unit) => {
        const transforming = groupTransformPreviewGroupId === unit.id;
        const focused = selectedTransformGroupUnit?.id === unit.id;
        const bounds = unit.bounds;
        const width = Math.max(1, bounds.right - bounds.left);
        const height = Math.max(1, bounds.bottom - bounds.top);
        const center = selectionRectCenter(bounds);
        const handleGapX = 14;
        const handleGapY = 14;
        const rotateStemStart = TRANSFORM_ROTATE_STEM_START;
        const rotateStemEnd = TRANSFORM_ROTATE_STEM_END;
        const rotateHandleGap = TRANSFORM_ROTATE_HANDLE_GAP;
        return (<g key={`group-selection-${unit.id}`} className={`group-selection-overlay ${focused ? "focused" : ""} ${transforming ? "transforming" : ""}`}>
                  <rect className="group-selection-hitbox" x={bounds.left} y={bounds.top} width={width} height={height} onPointerDown={(event) => startGroupMoveDrag(event, unit)} onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!activeLayer?.visible) {
                    return;
                }
                canvasInteractionRef.current = true;
                projectListPointerInsideRef.current = false;
                let pointer: Point | undefined;
                if (svgRef.current) {
                    pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
                    lastCanvasPointerRef.current = pointer;
                    updateMouseStatus(pointer);
                }
                if (connectSource) {
                    setConnectSource(null);
                    resetConnectPreviewState();
                    setMode("select");
                    return;
                }
                if (routableLinePlacement) {
                    setRoutableLinePlacement(null);
                    resetRoutableLinePreviewState();
                    setMode("select");
                    return;
                }
                openGraphicContextMenu({ x: event.clientX, y: event.clientY, target: "group", canvasPoint: pointer });
            }}/>
                  <rect className="group-selection-outline" x={bounds.left} y={bounds.top} width={width} height={height}/>
                  {focused && (<g className={`transform-handles group-transform-handles ${transformDrag && isGroupTransformDrag(transformDrag) && transformDrag.groupId === unit.id.replace(/^group:/, "") && transformDrag.kind !== "rotate" ? "resizing" : ""}`}>
                      <line x1={center.x} y1={bounds.top - rotateStemStart} x2={center.x} y2={bounds.top - rotateStemEnd}/>
                      <g transform={`translate(${center.x} ${bounds.top - rotateHandleGap})`}>
                        <circle className="rotate-handle" cx="0" cy="0" r="8" onPointerDown={(event) => startGroupTransformDrag(event, unit, "rotate")}/>
                      </g>
                      {GROUP_SCALE_HANDLE_CONFIGS.map((handle) => {
                    const handleCursorClass = scaleHandleCursorClass(handle, 0);
                    const x = handle.xDirection === 0
                        ? center.x
                        : handle.xDirection < 0
                            ? bounds.left - handleGapX
                            : bounds.right + handleGapX;
                    const y = handle.yDirection === 0
                        ? center.y
                        : handle.yDirection < 0
                            ? bounds.top - handleGapY
                            : bounds.bottom + handleGapY;
                    return (<g key={handle.id} transform={`translate(${x} ${y})`}>
                            <rect className={`scale-handle ${handleCursorClass}`} x="-8" y="-8" width="16" height="16" rx="3" onPointerDown={(event) => startGroupTransformDrag(event, unit, handle.kind)}/>
                          </g>);
                })}
                    </g>)}
                </g>);
    })}
            {lodCanvasNodeChunks.length > 0 && (<g className="lod-node-layer" onPointerDown={handleLodNodePointerDown} onContextMenu={handleLodNodeContextMenu} onDoubleClick={handleLodNodeDoubleClick}>
                {lodCanvasNodeChunks.map((chunk) => (<SvgMarkupChunk key={chunk.key} className="lod-node-layer-chunk" markup={chunk.markup}/>))}
              </g>)}
            {lodSelectedNodeMarkup && (<g className="lod-node-selection-layer" dangerouslySetInnerHTML={{ __html: lodSelectedNodeMarkup }}/>)}
            {detailedViewportNodes.map((node) => {
        if (groupTransformPreviewNodeIdSet.has(node.id)) {
            return null;
        }
        const selected = selectedNodeIdSet.has(node.id);
        const focused = node.id === selectedNodeId;
        const editable = activeLayerNodeIdSet.has(node.id);
        const inactiveLayerGraphic = isEditMode && !editable;
        const nodeIsBus = isBusNode(node);
        const nodeIsStatic = isStaticNode(node);
        const nodeIsRoutableLineDevice = isRoutableLineDeviceKind(node.kind);
        if (nodeIsRoutableLineDevice &&
            (dragGhostRoutableLineNodeIdSet.has(node.id) ||
                groupTransformPreviewRoutableLineNodeIdSet.has(node.id) ||
                routableLineEndpointDrag?.nodeId === node.id)) {
            return null;
        }
        const isStorageBus = node.kind === "hydrogen-tank" ||
            node.kind === "hydrogen-tank-horizontal" ||
            node.kind === "hydrogen-tank-container" ||
            node.kind === "thermal-storage-tank";
        const isConnectSource = node.id === connectSource?.nodeId;
        const originalDragPosition = dragging?.originalPositions[node.id];
        const renderPosition = draggingDelta && originalDragPosition
            ? {
                x: originalDragPosition.x + draggingDelta.x,
                y: originalDragPosition.y + draggingDelta.y
            }
            : node.position;
        const renderSimplifiedNode = useSimplifiedCanvasNodes &&
            !nodeIsStatic &&
            (!selected || (useSimplifiedSelectedCanvasNodes && !focused)) &&
            !isConnectSource &&
            !transformDrag &&
            !nodeLabelDrag &&
            !nodeLabelRotateDrag;
        if (renderSimplifiedNode) {
            return null;
        }
        const imageHref = nodeImage(node);
        const foregroundImageHref = nodeForegroundImage(node);
        const uprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(node, imageHref, foregroundImageHref);
        const uprightSelectionOutlineRect = uprightStaticSelectionOutline ? nodeUprightSelectionOutlineRect(node) : null;
        const nodeGeometryTransformValue = nodeGeometryTransform(node);
        const nodeScaleX = getNodeScaleX(node);
        const nodeScaleY = getNodeScaleY(node);
        const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
        const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
        const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
        const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
        const handleTransform = (x: number, y: number) => `translate(${x} ${y})`;
        const handleGapX = 14;
        const handleGapY = 14;
        const rotateStemStart = TRANSFORM_ROTATE_STEM_START;
        const rotateStemEnd = TRANSFORM_ROTATE_STEM_END;
        const rotateHandleGap = TRANSFORM_ROTATE_HANDLE_GAP;
        const rotateHandlePoints = uprightStaticSelectionOutline
            ? nodeUprightRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap)
            : nodeRotateHandleControlPoints(node, rotateStemStart, rotateStemEnd, rotateHandleGap);
        const scaleHandleConfigsForNode = nodeKindAllowsResizeTransform(node.kind)
            ? SCALE_HANDLE_CONFIGS
            : SCALE_HANDLE_CONFIGS.filter((handle) => handle.kind === "scale-both");
        const staticButtonEnabled = isBrowseMode && isStaticButtonEnabledForNode(node);
        const staticButtonState = staticButtonVisual?.nodeId === node.id ? staticButtonVisual.state : "";
        const staticButtonCornerRadius = Math.max(0, Number(node.params.cornerRadius || 8));
        const showStaticSelectionFrame = nodeIsStatic && selected && !uprightStaticSelectionOutline;
        const staticSelectionPadding = 10;
        const staticSelectionCornerSize = 12;
        const staticSelectionX = -node.size.width / 2 - staticSelectionPadding;
        const staticSelectionY = -node.size.height / 2 - staticSelectionPadding;
        const staticSelectionWidth = node.size.width + staticSelectionPadding * 2;
        const staticSelectionHeight = node.size.height + staticSelectionPadding * 2;
        const staticSelectionCornerPoints = [
            { x: staticSelectionX, y: staticSelectionY },
            { x: staticSelectionX + staticSelectionWidth - staticSelectionCornerSize, y: staticSelectionY },
            { x: staticSelectionX, y: staticSelectionY + staticSelectionHeight - staticSelectionCornerSize },
            { x: staticSelectionX + staticSelectionWidth - staticSelectionCornerSize, y: staticSelectionY + staticSelectionHeight - staticSelectionCornerSize }
        ];
        const nodeLabelVisible = nodeLabelShouldRender(node, deviceLabelsVisible);
        const nodeLabelContent = nodeLabelVisible ? nodeLabelText(node) : "";
        const nodeLabelIsVertical = nodeLabelVisible && nodeLabelVertical(node);
        const nodeLabelVerticalTokens = nodeLabelIsVertical ? nodeLabelVerticalSegments(nodeLabelContent) : [];
        const nodeLabelFontSizeValue = nodeLabelVisible ? nodeLabelFontSize(node) : 0;
        const routableLineDeviceHitPath = nodeIsRoutableLineDevice
            ? pointsToOrthogonalPath(routableLineDeviceRenderLocalPoints(node))
            : "";
        return (<g key={node.id} ref={(element) => bindCanvasNodeElement(node.id, element)} className={`diagram-node ${nodeIsBus ? "bus-node" : ""} ${nodeIsRoutableLineDevice ? "routable-line-node" : ""} ${isStorageBus ? "storage-node" : ""} ${uprightStaticSelectionOutline ? "static-upright-selection-node" : ""} ${staticButtonEnabled ? "static-button-enabled" : ""} ${staticButtonState ? `static-button-${staticButtonState}` : ""} ${multiNodeDragging && draggingNodeIdSet.has(node.id) ? "multi-drag-origin" : ""} ${singleNodeDragging && draggingNodeIdSet.has(node.id) ? "single-drag-origin" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${isConnectSource ? "connect-source" : ""} ${inactiveLayerGraphic ? "inactive-layer-graphic" : ""}`} transform={`translate(${renderPosition.x} ${renderPosition.y})`} data-node-id={node.id} data-export-device-id={nodeIsStatic ? undefined : node.id} data-export-device-idx={nodeIsStatic ? undefined : node.params.idx ?? ""} data-export-device-name={nodeIsStatic ? undefined : node.name} data-export-device-kind={nodeIsStatic ? undefined : node.kind} onPointerDown={nodeIsRoutableLineDevice ? undefined : (event) => handleNodePointerDown(event, node)} onPointerEnter={() => {
                if (staticButtonEnabled) {
                    setStaticButtonFeedback(node.id, "hover");
                }
            }} onPointerLeave={() => {
                if (staticButtonEnabled) {
                    staticButtonPointerRef.current = null;
                    clearStaticButtonFeedback(node.id);
                }
            }} onPointerUp={() => {
                if (staticButtonEnabled && staticButtonVisual?.nodeId === node.id && staticButtonVisual.state === "pressed") {
                    setStaticButtonFeedback(node.id, "hover");
                }
            }} onClick={(event) => handleStaticButtonClick(event, node)} onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!editable) {
                    return;
                }
                canvasInteractionRef.current = true;
                projectListPointerInsideRef.current = false;
                let pointer: Point | undefined;
                if (svgRef.current) {
                    pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
                    lastCanvasPointerRef.current = pointer;
                    updateMouseStatus(pointer);
                }
                if (routableLinePlacement) {
                    setRoutableLinePlacement(null);
                    resetRoutableLinePreviewState();
                    setMode("select");
                    return;
                }
                if (connectSource) {
                    setConnectSource(null);
                    resetConnectPreviewState();
                    setMode("select");
                    return;
                }
                if (!selectedNodeIdSet.has(node.id)) {
                    selectCanvasGraphics([node.id], []);
                }
                openGraphicContextMenu({
                    x: event.clientX,
                    y: event.clientY,
                    target: "node",
                    canvasPoint: pointer,
                    nodeId: node.id,
                    routePoints: nodeIsRoutableLineDevice ? routableLineDeviceCanvasPoints(node) : undefined
                });
            }} onDoubleClick={(event) => {
                event.stopPropagation();
                openNodeDoubleClickEditor(node);
            }}>
                  <title>{node.name}</title>
                  {imageHref && !nodeIsBus && (<clipPath id={`clip-${node.id}`}>
                      <rect x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} rx="8"/>
                    </clipPath>)}
                  <g className="node-geometry" transform={nodeGeometryTransformValue}>
                    <rect x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} rx="8" className={`node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${nodeIsStatic ? "static-hitbox" : ""}`}/>
                    <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)}/>
                    <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)}/>
                    {routableLineDeviceHitPath && (<path className="routable-line-device-hitline" d={routableLineDeviceHitPath} onPointerDown={(event) => handleRoutableLineNodePathPointerDown(event, node)}/>)}
                    {staticButtonEnabled && (<rect x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} rx={staticButtonCornerRadius} className="static-button-feedback-surface"/>)}
                    {showStaticSelectionFrame && (<g className="node-static-selection-frame">
                        <rect x={staticSelectionX} y={staticSelectionY} width={staticSelectionWidth} height={staticSelectionHeight} rx={Math.max(8, staticButtonCornerRadius + staticSelectionPadding)} className="node-static-selection-glow"/>
                        {staticSelectionCornerPoints.map((point, index) => (<rect key={`static-selection-corner-${index}`} x={point.x} y={point.y} width={staticSelectionCornerSize} height={staticSelectionCornerSize} rx="3" className="node-static-selection-corner"/>))}
                      </g>)}
                  </g>
                  {!nodeIsBus && (imageHref || foregroundImageHref) && (<g className="node-upright-content" transform={nodeImageContentTransform(node)}>
                      {imageHref && nodeIsStatic && (<image href={imageHref} x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${node.id})`} className="node-background-image"/>)}
                      {imageHref && !nodeIsStatic && (<rect x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} rx="8" className="node-image-cover"/>)}
                      {imageHref && !nodeIsStatic && (<image href={imageHref} x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${node.id})`} className="node-background-image"/>)}
                      {foregroundImageHref && (<image href={foregroundImageHref} x={-node.size.width / 2} y={-node.size.height / 2} width={node.size.width} height={node.size.height} preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${node.id})`} className="node-foreground-image"/>)}
                    </g>)}
                  {uprightSelectionOutlineRect && (<rect className="node-upright-selection-outline" x={uprightSelectionOutlineRect.x} y={uprightSelectionOutlineRect.y} width={uprightSelectionOutlineRect.width} height={uprightSelectionOutlineRect.height} rx="4"/>)}
                  {nodeLabelVisible && (<g className={`node-device-label ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${nodeLabelIsVertical ? "vertical" : "horizontal"}`} data-node-id={node.id} data-label-owner="device" transform={nodeLabelTransform(node)} onPointerDown={isEditMode ? (event) => startNodeLabelDrag(event, node) : undefined}>
                      {nodeLabelIsVertical ? (nodeLabelVerticalTokens.map((segment, index) => (<text key={`${segment.text}-${index}`} className={`node-label-vertical-token ${segment.numeric ? "numeric" : ""}`} x="0" y={nodeLabelVerticalTokenY(index, nodeLabelVerticalTokens.length, node)} dominantBaseline="middle" textAnchor="middle" style={nodeLabelVerticalTokenStyle(node)}>
                            {segment.text}
                          </text>))) : (<text x="0" y="0" dominantBaseline="middle" textAnchor={nodeLabelTextAnchor(node)} style={nodeLabelTextStyle(node)}>
                          {nodeLabelContent}
                        </text>)}
                      {isEditMode && selected && focused && selectedNodeCount === 1 && (<g className="node-label-rotate-control" transform={`translate(0 ${formatSvgNumber(-nodeLabelFontSizeValue - 18)})`}>
                          <line x1="0" y1="8" x2="0" y2="0"/>
                          <circle cx="0" cy="0" r="6" onPointerDown={(event) => startNodeLabelRotateDrag(event, node)}>
                            <title>旋转标识</title>
                          </circle>
                        </g>)}
                    </g>)}
                  <g className="node-terminal-layer" transform={nodeGeometryTransformValue}>
                    {node.terminals.map((terminal) => {
                const hideFixedTerminal = nodeIsBus || isStaticNode(node) || isRoutableLineDeviceKind(node.kind);
                const disabled = !hideFixedTerminal &&
                    ((connectTerminalCompatibilityActive &&
                        !canConnectTerminals(connectSourceNode!, connectSource!.terminalId, node, terminal.id)) ||
                        (routableLineTerminalCompatibilityActive &&
                            Boolean(routableLineActiveTerminalType) &&
                            terminal.type !== routableLineActiveTerminalType));
                const overlapped = isEditMode && overlappedTerminalKeys.has(`${node.id}:${terminal.id}`);
                const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                return hideFixedTerminal ? null : (<g key={terminal.id} transform={terminalControlTransform(renderPoint.x, renderPoint.y)}>
                          <line className={`terminal-stub ${terminal.type} ${disabled ? "disabled" : ""}`} strokeDasharray={terminalStubDashArray} style={{
                        stroke: disabled ? "#cbd5e1" : terminalDisplayColor,
                        strokeWidth: terminalStubStrokeWidth(node, terminal)
                    }} x1={stub.from.x} y1={stub.from.y} x2={stub.to.x} y2={stub.to.y}/>
                          <circle className={`terminal-dot ${terminal.type} ${overlapped ? "overlapped" : ""} ${disabled ? "disabled" : ""}`} style={{ "--terminal-color": terminalDisplayColor } as CSSProperties} cx="0" cy="0" r={overlapped ? 7.2 : 6} onPointerDown={isEditMode ? (event) => handleTerminalPointerDown(event, node, terminal.id) : undefined}>
                            <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                          </circle>
                        </g>);
            })}
                  </g>
                  {selected && focused && selectedNodeCount === 1 && !nodeIsRoutableLineDevice && (isEditMode ? (<g className={`transform-handles ${transformDrag && !isGroupTransformDrag(transformDrag) && transformDrag.nodeId === node.id && transformDrag.kind !== "rotate" ? "resizing" : ""}`}>
                      <line x1={rotateHandlePoints.stemStart.x} y1={rotateHandlePoints.stemStart.y} x2={rotateHandlePoints.stemEnd.x} y2={rotateHandlePoints.stemEnd.y}/>
                      <g transform={handleTransform(rotateHandlePoints.handle.x, rotateHandlePoints.handle.y)}>
                        <circle className="rotate-handle" cx="0" cy="0" r="8" onPointerDown={(event) => startSingleTransformDrag(event, node, "rotate")}/>
                      </g>
                      {scaleHandleConfigsForNode.map((handle) => {
                    const handlePoint = nodeScaleHandleControlPoint(node, handle, handleGapX, handleGapY, uprightStaticSelectionOutline);
                    const handleCursorClass = scaleHandleCursorClass(handle, uprightStaticSelectionOutline ? 0 : node.rotation);
                    return (<g key={handle.id} transform={handleTransform(handlePoint.x, handlePoint.y)}>
                            <rect className={`scale-handle ${handleCursorClass}`} x="-8" y="-8" width="16" height="16" rx="3" onPointerDown={(event) => startSingleTransformDrag(event, node, handle.kind, handle)}/>
                          </g>);
                })}
                    </g>) : null)}
                </g>);
    })}
            {visibleMeasurementGroups.length > 0 && (<g className="measurement-layer" pointerEvents={isBrowseMode ? "none" : "auto"}>
                {visibleMeasurementGroups.map(renderMeasurementGroup)}
              </g>)}
            {renderSingleTransformRotateOriginGhost()}
            {renderGroupTransformPhotoPreview()}
            {renderTransformRotationTrajectory()}
            </g>
            <g ref={imperativeMultiNodeDragOverlayRef} className="multi-node-drag-overlay imperative-multi-node-drag-overlay" style={{ display: "none" }} aria-hidden="true"/>
            {renderMultiNodeDragOverlay()}
            <g ref={imperativeSingleNodeDragEdgePreviewRef} className="single-node-drag-overlay imperative-single-node-drag-edge-preview" style={{ display: "none" }} aria-hidden="true"/>
            <g ref={imperativeSingleNodeDragNodeOverlayRef} className="single-node-drag-overlay imperative-single-node-drag-node-overlay" style={{ display: "none" }} aria-hidden="true"/>
            {dragPreviewEdgeRoutes.map((route) => (<path key={`drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={{ "--connection-color": route.color } as CSSProperties}/>))}
            {terminalPressPreviewEdgeRoutes.map((route) => (<path key={`terminal-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)}/>))}
            {rewiringPreviewRoute && (<path key={`rewiring-preview-edge-${rewiringPreviewRoute.edgeId}`} d={rewiringPreviewRoute.path} className="connection-line drag-preview" style={connectionLineStyle(rewiringPreviewRoute.edgeId)}/>)}
            {rewiring && (<circle className="edge-endpoint-handle active-drag-handle" cx={rewiring.previewPoint.x} cy={rewiring.previewPoint.y} r={8}>
                <title>{rewiring.endpoint === "source" ? "拖拽线路起点" : "拖拽线路终点"}</title>
              </circle>)}
            {connectSource && (<path ref={(element) => {
            connectPreviewPathElementRef.current = element;
            if (element) {
                flushConnectPreviewDom();
            }
        }} d={connectPreviewDom.path} className="connection-preview-line" style={connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined}/>)}
            {connectSource && (<circle ref={(element) => {
            connectPreviewHandleElementRef.current = element;
            if (element) {
                flushConnectPreviewDom();
            }
        }} className="connection-preview-active-endpoint" cx={connectPreviewDom.targetPoint?.x ?? connectPreviewPointRef.current?.x ?? 0} cy={connectPreviewDom.targetPoint?.y ?? connectPreviewPointRef.current?.y ?? 0} r={7} style={{
            ...(connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : {}),
            display: (connectPreviewDom.targetPoint ?? connectPreviewPointRef.current) ? undefined : "none"
        }}>
                <title>拖拽连接线终点</title>
              </circle>)}
            {connectSource && (<>
                {connectSource.manualPoints?.map((point, index) => (<circle key={`connect-preview-bend-${index}`} className="connection-preview-bend-point" cx={point.x} cy={point.y} r={5} style={connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined}/>))}
              </>)}
            {routableLinePlacement && routableLinePreview.path && (<path d={routableLinePreview.path} className="routable-line-drawing-preview" style={routableLinePlacementColor ? ({ "--connection-color": routableLinePlacementColor } as CSSProperties) : undefined}/>)}
            {routableLinePlacement && (<>
                {routableLinePlacement.manualPoints?.map((point, index) => (<circle key={`routable-line-preview-bend-${index}`} className="connection-preview-bend-point routable-line-preview-bend-point" cx={point.x} cy={point.y} r={5} style={routableLinePlacementColor ? ({ "--connection-color": routableLinePlacementColor } as CSSProperties) : undefined}/>))}
              </>)}
            {routableLineEndpointDragPreviewRoute && (<path d={routableLineEndpointDragPreviewRoute.path} className="routable-line-drawing-preview endpoint-retarget-preview" style={routableLineEndpointDragColor ? ({ "--connection-color": routableLineEndpointDragColor } as CSSProperties) : undefined}/>)}
            {routableLineEndpointDrag && (<circle className={`routable-line-endpoint-handle active-drag-handle ${routableLineEndpointDrag.endpoint}`} cx={routableLineEndpointDrag.previewPoint.x} cy={routableLineEndpointDrag.previewPoint.y} r="7" style={routableLineEndpointDragColor ? ({ "--connection-color": routableLineEndpointDragColor } as CSSProperties) : undefined}>
                <title>{routableLineEndpointDrag.endpoint === "source" ? "拖拽线路起点" : "拖拽线路终点"}</title>
              </circle>)}
            {connectSource && (<g ref={(element) => {
            connectDropHintElementRef.current = element;
            if (element) {
                flushConnectPreviewDom();
            }
        }} className="connect-drop-hint" transform={connectPreviewDom.targetPoint
            ? `translate(${Math.round(connectPreviewDom.targetPoint.x)} ${Math.round(connectPreviewDom.targetPoint.y)})`
            : undefined} style={{
            ...(connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : {}),
            display: connectPreviewDom.targetPoint ? undefined : "none"
        }}>
                <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24"/>
                <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16"/>
                <circle className="connect-drop-hint-core" cx="0" cy="0" r="5"/>
              </g>)}
            {activeDropHintPoint && (<g className="connect-drop-hint" transform={`translate(${activeDropHintPoint.x} ${activeDropHintPoint.y})`} style={activeDropHintStyle}>
                <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24"/>
                <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16"/>
                <circle className="connect-drop-hint-core" cx="0" cy="0" r="5"/>
              </g>)}
            <g ref={imperativeNodeDragDropHintRef} className="connect-drop-hint imperative-node-drag-drop-hint" style={{ display: "none" }} aria-hidden="true">
              <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24"/>
              <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16"/>
              <circle className="connect-drop-hint-core" cx="0" cy="0" r="5"/>
            </g>
            {selectedRoutableLineManualPathRoute &&
        !routableLineEndpointDrag &&
        !dragGhostRoutableLineNodeIdSet.has(selectedRoutableLineManualPathRoute.node.id) &&
        (<g className="routable-line-manual-path-layer" data-node-id={selectedRoutableLineManualPathRoute.node.id}>
                <path d={selectedRoutableLineManualPathRoute.path} className="routable-line-manual-path-preview"/>
                {selectedRoutableLineManualPathRoute.points.slice(1).map((point, index) => {
                const from = selectedRoutableLineManualPathRoute.points[index];
                const segmentIndex = index;
                if (!from || sameOptionalPoint(from, point) || (from.x !== point.x && from.y !== point.y)) {
                    return null;
                }
                const orientation = from.y === point.y ? "horizontal" : "vertical";
                return (<path key={`routable-line-segment-${segmentIndex}`} d={`M ${from.x} ${from.y} L ${point.x} ${point.y}`} className={`manual-segment-handle ${orientation}`} onPointerDown={(event) => startRoutableLineSegmentDrag(event, selectedRoutableLineManualPathRoute.node, segmentIndex, orientation, selectedRoutableLineManualPathRoute.points)}/>);
            })}
                {selectedRoutableLineManualPathRoute.points.slice(1, -1).map((point, index) => {
                const routePointIndex = index + 1;
                return (<circle key={`routable-line-bend-${routePointIndex}`} className="manual-bend-handle user-manual-bend" cx={point.x} cy={point.y} r={5.5} onPointerDown={(event) => startRoutableLinePointDrag(event, selectedRoutableLineManualPathRoute.node, routePointIndex, selectedRoutableLineManualPathRoute.points)} onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteRoutableLineBendPoint(selectedRoutableLineManualPathRoute.node.id, routePointIndex, selectedRoutableLineManualPathRoute.points);
                    }}/>);
            })}
              </g>)}
            {!routableLineEndpointDrag && routableLineEndpointHandles.length > 0 && (<g className="routable-line-endpoint-handle-layer">
                {routableLineEndpointHandles
            .filter((handle) => !dragGhostRoutableLineNodeIdSet.has(handle.node.id))
            .map((handle) => (<circle key={`${handle.node.id}-${handle.endpoint}`} className={`routable-line-endpoint-handle ${handle.endpoint}`} data-node-id={handle.node.id} cx={handle.point.x} cy={handle.point.y} r="7" onPointerDown={(event) => startRoutableLineEndpointDrag(event, handle.node, handle.endpoint)}>
                    <title>{handle.endpoint === "source" ? "调整线路起点" : "调整线路终点"}</title>
                  </circle>))}
              </g>)}
            {selectedRoutedEdge &&
        selectedEdge &&
        !dragGhostEdgeIdSet.has(selectedEdge.id) &&
        !(singleNodeDragging && dragAffectedEdgeIdSet.has(selectedEdge.id)) &&
        !(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id)) &&
        !(multiNodeDragging && dragOverlayEdgeIdSet.has(selectedEdge.id)) &&
        !groupTransformPreviewEdgeIdSet.has(selectedEdge.id) &&
        !terminalPressPreviewEdgeIdSet.has(selectedEdge.id) &&
        rewiring?.edgeId !== selectedEdge.id &&
        (() => {
            const edge = selectedEdge;
            const route = selectedRoutedEdge;
            const isRewiringSelectedEdge = rewiring?.edgeId === edge.id;
            const isManualPathSelectedEdge = manualPathPreviewRoute?.edgeId === edge.id;
            const routePoints = isManualPathSelectedEdge ? manualPathPreviewRoute.points : route.points;
            const displayPath = isRewiringSelectedEdge && rewiringPreviewRoute
                ? rewiringPreviewRoute.path
                : isManualPathSelectedEdge
                    ? manualPathPreviewRoute.path
                    : route.path;
            const sourcePoint = getEdgeEndpointPoint(edge, "source");
            const targetPoint = getEdgeEndpointPoint(edge, "target");
            const sourceNode = nodeById.get(edge.sourceId);
            const targetNode = nodeById.get(edge.targetId);
            const sourceBusDotPoint = sourcePoint && sourceNode && isBusNode(sourceNode) ? sourcePoint : undefined;
            const targetBusDotPoint = targetPoint && targetNode && isBusNode(targetNode) ? targetPoint : undefined;
            const movableSegmentIndexes = new Set(getMovableRouteSegmentIndexes(routePoints));
            const manualRoutePointKey = (point: Point) => `${Math.round(point.x)},${Math.round(point.y)}`;
            const manualRoutePointKeys = new Set((edge.manualPoints ?? []).map(manualRoutePointKey));
            return (<g className="connection-group selected topmost" style={connectionLineStyle(edge.id)} data-edge-id={edge.id}>
                  <path d={displayPath} className="connection-hitline" onContextMenu={isEditMode ? (event) => openEdgeContextMenu(event, edge.id, routePoints) : undefined} onDoubleClick={isEditMode ? (event) => insertManualBendFromEdgePath(event, edge.id, routePoints) : undefined} onPointerDown={isEditMode ? (event) => handleEdgePathPointerDown(event, edge.id, routePoints) : undefined}/>
                  <path d={displayPath} className="connection-line" onContextMenu={isEditMode ? (event) => openEdgeContextMenu(event, edge.id, routePoints) : undefined} onDoubleClick={isEditMode ? (event) => insertManualBendFromEdgePath(event, edge.id, routePoints) : undefined} onPointerDown={isEditMode ? (event) => handleEdgePathPointerDown(event, edge.id, routePoints) : undefined}/>
                  {isEditMode && !isRewiringSelectedEdge && routePoints.slice(1).map((point, index) => {
                    const from = routePoints[index];
                    const segmentIndex = index;
                    if (!movableSegmentIndexes.has(segmentIndex)) {
                        return null;
                    }
                    const orientation = from.y === point.y ? "horizontal" : "vertical";
                    return (<path key={`segment-${segmentIndex}`} d={`M ${from.x} ${from.y} L ${point.x} ${point.y}`} className={`manual-segment-handle ${orientation}`} onPointerDown={(event) => startManualSegmentDrag(event, edge.id, segmentIndex, orientation, routePoints)} onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)} onContextMenu={(event) => openEdgeContextMenu(event, edge.id, routePoints)}/>);
                })}
                  {isEditMode && !isRewiringSelectedEdge && routePoints.slice(2, -2).map((point, index) => {
                    const routePointIndex = index + 2;
                    const isUserManualBend = manualRoutePointKeys.has(manualRoutePointKey(point));
                    return (<circle key={`bend-${routePointIndex}`} className={isUserManualBend ? "manual-bend-handle user-manual-bend" : "manual-bend-handle"} cx={point.x} cy={point.y} r={5.5} onPointerDown={(event) => startManualPointDrag(event, edge.id, routePointIndex, routePoints)} onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)} onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            deleteManualBendPoint(edge.id, routePointIndex, routePoints);
                        }}/>);
                })}
                  {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-topmost-source-internal-connector`)}
                  {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-topmost-target-internal-connector`)}
                  {isEditMode && !isRewiringSelectedEdge && sourcePoint && (<circle className="edge-endpoint-handle" cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x} cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y} r={8} onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                            return;
                        }
                        setRewiring({
                            edgeId: edge.id,
                            endpoint: "source",
                            previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                            pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}/>)}
                  {isEditMode && !isRewiringSelectedEdge && targetPoint && (<circle className="edge-endpoint-handle" cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x} cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y} r={8} onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                            return;
                        }
                        setRewiring({
                            edgeId: edge.id,
                            endpoint: "target",
                            previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                            pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}/>)}
                </g>);
        })()}
            {resizeSizeHint && (<g className="resize-size-badge" transform={`translate(${resizeSizeHint.x} ${resizeSizeHint.y})`}>
                <rect x="-48" y="-13" width="96" height="26" rx="6"/>
                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">{resizeSizeHint.text}</text>
              </g>)}
            {isEditMode && canvasResizeHandles}
            </svg>
            {canvasResizePreviewRect && (<div className="canvas-resize-preview" style={{
            left: canvasResizePreviewRect.left,
            top: canvasResizePreviewRect.top,
            width: canvasResizePreviewRect.width,
            height: canvasResizePreviewRect.height
        }}/>)}
            {isEditMode && (<div ref={canvasResizeHotzonesRef} className="canvas-resize-hotzones" style={canvasResizeHotzoneStyle} aria-hidden="true">
                <div className="canvas-resize-hotzone canvas-resize-hotzone-left" onPointerDown={(event) => startCanvasResize(event, "left")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top" onPointerDown={(event) => startCanvasResize(event, "top")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-right" onPointerDown={(event) => startCanvasResize(event, "right")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom" onPointerDown={(event) => startCanvasResize(event, "bottom")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top-left" onPointerDown={(event) => startCanvasResize(event, "top-left")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-top-right" onPointerDown={(event) => startCanvasResize(event, "top-right")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom-left" onPointerDown={(event) => startCanvasResize(event, "bottom-left")}/>
                <div className="canvas-resize-hotzone canvas-resize-hotzone-bottom-right" onPointerDown={(event) => startCanvasResize(event, "corner")}/>
              </div>)}
            {isEditMode && (nodeFloatingToolbar || edgeFloatingToolbar) && (<div className="canvas-floating-toolbar-layer">
                {nodeFloatingToolbar && (<div className="canvas-floating-toolbar-wrapper" style={floatingToolbarWrapperStyle(nodeFloatingToolbar)}>
                    <div className="canvas-floating-toolbar node-toolbar" role="toolbar" aria-label="选中图元快捷操作" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                      <button type="button" title="复制" aria-label="复制" onClick={copySelection}>
                        <Copy size={floatingToolbarIconSize}/>
                      </button>
                      <button type="button" title="剪切" aria-label="剪切" onClick={cutSelection}>
                        <Scissors size={floatingToolbarIconSize}/>
                      </button>
                      <button type="button" title="删除" aria-label="删除" onClick={deleteSelection}>
                        <Trash2 size={floatingToolbarIconSize}/>
                      </button>
                      <button type="button" title="图层修改" aria-label="图层修改" onClick={openLayerAssignmentDialog}>
                        <Layers size={floatingToolbarIconSize}/>
                      </button>
                      <button type="button" title="置于当前图层" aria-label="置于当前图层" onClick={() => assignSelectedNodesToModelLayer(activeLayerId)}>
                        <Layers2 size={floatingToolbarIconSize}/>
                      </button>
                      {canGroupSelectedGraphics && (<button type="button" title="组合" aria-label="组合" onClick={groupSelectedGraphics}>
                          <Group size={floatingToolbarIconSize}/>
                        </button>)}
                      {canUngroupSelectedGraphics && (<button type="button" title="解散" aria-label="解散" onClick={ungroupSelectedGraphics}>
                          <Ungroup size={floatingToolbarIconSize}/>
                        </button>)}
                      {canAddTemplateFromSelection && (<button type="button" title="添加到模板库" aria-label="添加到模板库" onClick={openAddTemplateDialog}>
                          <Grid2X2 size={floatingToolbarIconSize}/>
                        </button>)}
                      {canAddTemplateFromSelection && (<button type="button" title="定义为元件" aria-label="定义为元件" onClick={openGroupDeviceDefinitionDialog}>
                          <Plus size={floatingToolbarIconSize}/>
                        </button>)}
                      <button type="button" title="标识显示" aria-label="标识显示" onClick={toggleSelectedNodeLabelDisplay}>
                        <Type size={floatingToolbarIconSize}/>
                      </button>
                    </div>
                  </div>)}
                {edgeFloatingToolbar && (<div className="canvas-floating-toolbar-wrapper" style={floatingToolbarWrapperStyle(edgeFloatingToolbar)}>
                    <div className="canvas-floating-toolbar edge-toolbar" role="toolbar" aria-label="选中连接线快捷操作" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                      <button type="button" title="复制连接线" aria-label="复制连接线" onClick={copySelection}>
                        <Copy size={floatingToolbarIconSize}/>
                      </button>
                      <button type="button" title="整理连接线" aria-label="整理连接线" onClick={tidySelectedEdgeRoute}>
                        <Route size={floatingToolbarIconSize}/>
                      </button>
                      <button type="button" title="删除连接线" aria-label="删除连接线" onClick={deleteSelection}>
                        <Trash2 size={floatingToolbarIconSize}/>
                      </button>
                    </div>
                  </div>)}
              </div>)}
          </div>
        </section>
        <div className="viewport-overlay" style={viewportOverlayStyle} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          <div className="viewport-controls" role="group" aria-label="视口控制">
            <button type="button" title="适配视图" aria-label="适配视图" onClick={fitWholeCanvasToFrame}>
              <Maximize2 size={16}/>
            </button>
            <button type="button" title={centerSelectedViewportTitle} aria-label="居中选中" disabled={selectedViewportActionDisabled} onClick={centerSelectedInView}>
              <LocateFixed size={16}/>
            </button>
            <button type="button" title={fitSelectedViewportTitle} aria-label="缩放到选中区域" disabled={selectedViewportActionDisabled} onClick={fitViewToSelection}>
              <ScanSearch size={16}/>
            </button>
            <button type="button" title="放大" aria-label="放大" onClick={() => zoomViewportAtCenter(0.82)}>
              <Plus size={16}/>
            </button>
            <button type="button" title="缩小" aria-label="缩小" onClick={() => zoomViewportAtCenter(1.18)}>
              <Minus size={16}/>
            </button>
            <button type="button" title="重置缩放" aria-label="重置缩放" onClick={resetViewportZoom}>
              <RotateCcw size={16}/>
            </button>
            <button type="button" className={minimapVisible ? "active" : ""} title={minimapVisible ? "隐藏小地图" : "显示小地图"} aria-label={minimapVisible ? "隐藏小地图" : "显示小地图"} onClick={() => setMinimapVisible((current) => !current)}>
              <MapIcon size={16}/>
            </button>
          </div>
          {minimapVisible && (<div className="canvas-minimap" aria-label="鸟瞰导航">
              <svg viewBox={`0 0 ${CANVAS_MINIMAP_WIDTH} ${CANVAS_MINIMAP_HEIGHT}`} onPointerDown={(event) => {
            handleMinimapNavigate(event);
            event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={(event) => {
            if (event.buttons & 1) {
                handleMinimapNavigate(event);
            }
        }}>
                <rect className="minimap-canvas" x={minimapOffsetX} y={minimapOffsetY} width={minimapContentWidth} height={minimapContentHeight}/>
                {minimapRoutes.map((route) => (<polyline key={`minimap-route-${route.edgeId}`} className="minimap-route" points={route.points.map(mapPointToMinimap).map((point) => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`).join(" ")}/>))}
                {minimapNodes.map((node) => {
            const center = mapPointToMinimap(node.position);
            const width = Math.max(1.8, Math.abs(getNodeScaleX(node)) * node.size.width * minimapScale);
            const height = Math.max(1.8, Math.abs(getNodeScaleY(node)) * node.size.height * minimapScale);
            return (<rect key={`minimap-node-${node.id}`} className={`minimap-node ${selectedNodeIdSet.has(node.id) ? "selected" : ""}`} x={center.x - width / 2} y={center.y - height / 2} width={width} height={height} rx="1"/>);
        })}
                <rect className="minimap-viewport" x={minimapViewportLeft} y={minimapViewportTop} width={Math.max(4, minimapViewportRight - minimapViewportLeft)} height={Math.max(4, minimapViewportBottom - minimapViewportTop)}/>
              </svg>
            </div>)}
        </div>
    </>
  );
}, areCanvasPropsEqual);
