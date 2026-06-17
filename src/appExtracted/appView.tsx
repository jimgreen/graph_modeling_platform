// @ts-nocheck

export function renderAppView(__appScope: Record<string, any>) {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, Bell, Bold, BoxSelect, BufferedTextInput, BufferedTextarea, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_WIDTH, CONNECTION_REDRAW_SCOPE_LABELS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, CURRENT_UNIT_OPTIONS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, Cable, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, CircleDot, Copy, CustomComponentManagerTree, DEFAULT_CANVAS_BACKGROUND, DEFAULT_COLOR_PALETTE, DEFAULT_DEVICE_LABEL_FONT_SIZE, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DeferredColorInput, Download, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, ENABLE_REACT_FLOW_PREVIEW, ENERGY_COLOR_ROWS, EyeOff, FileInput, FileJson, FlipHorizontal, FlipVertical, FolderOpen, Fragment, GROUP_SCALE_HANDLE_CONFIGS, Grid2X2, Group, Italic, Layers, Layers2, LocateFixed, MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CUSTOM_DEVICE_TERMINALS, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MapIcon, Maximize2, MemoDeviceGlyph, Minus, PARAM_LABELS, PARAM_VALUE_TYPE_OPTIONS, POWER_UNIT_OPTIONS, Paintbrush, Palette, Pencil, Plus, READONLY_E_PARAM_KEYS, ReactFlowPreview, RotateCcw, RotateCw, Route, SCALE_HANDLE_CONFIGS, STATIC_ROUTE_AVOIDANCE_PARAM, Save, ScanSearch, Scissors, Search, Suspense, SvgMarkupChunk, TERMINAL_TYPE_LIBRARY_LABELS, TERMINAL_TYPE_OPTIONS, TOPOLOGY_WARNING_PAGE_SIZE, TRANSFORM_ROTATE_HANDLE_GAP, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_STEM_START, TextStyleToggleButton, Trash2, Type, Underline, Undo2, Ungroup, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_UNIT_OPTIONS, X, Zap, ZapOff, activateInspectorFromCanvas, activeDropHintPoint, activeDropHintStyle, activeDropReady, activeImageFolderId, activeLayer, activeLayerEdgeIdSet, activeLayerId, activeLayerNodeIdSet, activeLayerNodes, activeModelPathName, activeProjectKey, activeSchemeKey, activeSelectedEdgeSet, activeSelectedNodeIds, activeVoltageBaseTerminalKey, activeVoltageBaseTerminalRow, addCustomDeviceStateDraftRow, addDefaultMeasurementsToNode, addDefinitionDraftRow, addManualBendFromContextMenu, addRoutableLineBendFromContextMenu, addStateIconDrawingElement, addVoltageColorRow, adjustSelectedDisplayLayer, alignSelected, allowAutoExpandCanvas, appShellStyle, appendConnectPreviewManualPoint, appendRoutableLinePreviewManualPoint, appendStaticDrawingPoint, applyConnectPreviewState, applyExistingImage, applyLayerAssignmentDialog, applyRoutableLinePreviewState, applyStateIconDrawingDialog, aside, assignSelectedNodesToModelLayer, attributeLibraryComponentTypeKey, attributeLibraryOptionClass, autoAlignCanvasGraphics, autoSpreadCanvasGraphics, backgroundLayerIds, backgroundLayerOptions, backgroundProjectId, backgroundProjectOptions, backgroundProjectRecord, batchEditors, bindCanvasNodeElement, busEndpointColor, button, canAddTemplateFromSelection, canAdjustSelectedDisplayLayer, canConnectTerminals, canExportCurrentModel, canGroupSelectedGraphics, canUngroupSelectedGraphics, cancelLibraryPlacement, cancelModifierSelectionPress, cancelTemplateDialog, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageUrl, canvasClipboard, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasHorizontalScrollbarsActive, canvasInteractionRef, canvasRenderBounds, canvasResizeDrag, canvasResizeHandles, canvasResizeHotzoneStyle, canvasResizeHotzonesRef, canvasResizePreviewRect, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasSelectionShortcutActiveRef, canvasSizeDraft, canvasVerticalScrollbarsActive, centerSelectedInView, centerSelectedViewportTitle, chooseCustomDeviceBackground, chooseDefinitionTemplateIcon, chooseImage, chooseStateIconDrawingImport, chooseStateVisualImage, circle, clampPointToCanvas, clearLibraryPlacementPreview, clearRecordSelection, clearSelectedImage, clearSelectedImageForNode, clearStaticButtonFeedback, clipPath, closeCustomDeviceDialog, closeDeviceDefinitionDialog, code, collapsedCustomComponentTreeLibraries, collapsedCustomComponentTreeTypes, collapsedDefinitionComponentTypes, colorDisplayMode, colorPalette, colorPaletteDialogOpen, colorPaletteDraft, colorPaletteTab, commitCanvasSizeDraft, commitLibraryPlacementAtPoint, componentTypeDisplayParts, componentTypeOptionClass, componentTypeOptionsByAttributeLibrary, confirmAddGraphTemplate, confirmConnectionRedrawDialog, confirmCreateDeviceFromGroup, confirmFilterSelectionDialog, confirmReplaceDeviceIconFromGroup, confirmVoltageBaseClearDialog, confirmVoltageBaseSetDialog, connectDropHintElementRef, connectPreviewColor, connectPreviewDom, connectPreviewHandleElementRef, connectPreviewPathElementRef, connectPreviewPointRef, connectSource, connectSourceNode, connectTargetPoint, connectTargetSnapPoint, connectTerminalCompatibilityActive, connectionLineStyle, connectionRedrawDialogOpen, connectionRedrawScope, connectionRedrawTargetsForScope, consumeGraphicContextMenuHandled, contextMarqueeSelection, contextMarqueeSelectionRef, contextMeasurementGroup, contextMeasurementNode, contextMenu, contextMenuClassName, contextMenuForEdge, contextMenuForNode, contextMenuForRoutableLine, contextMenuForSelection, contextMenuFromElementTree, contextMenuRef, contextMenuStyle, contextMenuTarget, contextSelectionCount, copyProjectRecord, copySchemeRecord, copySelection, createBlankProject, createGraphTemplateType, createImageFolder, createSchemeRecord, currentAttributeLibraryComponentTypeOptions, currentModelRecord, currentModelVoltageColorKeys, currentUnit, currentZoomPercent, customComponentTreeSearchQuery, customComponentTreeSelection, customDefaultStateSelected, customDeviceDefinitionMode, customDeviceDialogOpen, customDeviceDialogRef, customDeviceDialogView, customDeviceDraft, customDeviceImageInputRef, customDeviceMeasurementTarget, customDevicePreviewHeight, customDevicePreviewImage, customDevicePreviewWidth, customDeviceSaveMessage, customDeviceStatePageId, customDeviceTerminalAnchorDragIndex, customDeviceTerminalAnchorValue, customDeviceTerminalAnchors, customDeviceTerminalConnectorSegment, customDraftDefaultParams, customParamId, customStatePreviewText, customStatePreviewVisual, cutSelection, datalist, defaultBackgroundLayerIdsForProject, defaultComponentTypeForAttributeLibrary, defaultContainerAssociationForTerminalType, definitionAttributeLibraryComponentTypeOptions, definitionDraftError, definitionDraftRows, definitionDraftSection, definitionDraftSectionEditing, definitionTemplateIconInputRef, defs, deleteCustomDeviceStateDraftRow, deleteDefinitionDraftRow, deleteImageFolder, deleteManualBendPoint, deleteProjectRecord, deleteRoutableLineBendPoint, deleteSchemeRecord, deleteSelectedStateIconDrawingElements, deleteSelection, deleteStateIconDrawingElement, deleteVoltageColorRow, detailedSelectedEdgeIdSet, detailedViewportNodes, deviceDefinitionDialogOpen, deviceDefinitionDialogRef, deviceDefinitionKeyForTemplate, deviceDefinitionSearchNeedle, deviceDefinitionSearchQuery, deviceDefinitionView, deviceLabelsVisible, deviceLibraryDialogDrag, deviceLibraryDialogLayouts, deviceLibraryDialogResize, deviceLibraryDialogStyle, displayedCustomComponentTreeLibraries, displayedDeviceDefinitionLibraries, distributeSelected, div, dragAffectedEdgeIdSet, dragGhostEdgeIdSet, dragGhostEdgeRoutes, dragGhostRoutableLineNodeIdSet, dragOverlayEdgeIdSet, dragPreviewEdgeIdSet, dragPreviewEdgeRoutes, dragStateIconDrawingSelection, draggingDelta, draggingNodeIdSet, draggingRef, edgeById, edgeFloatingToolbar, edges, effectiveLeftPanelTab, em, expandedDefinitionGroups, exportEFile, exportProjectRecordFile, exportSchemeRecord, exportSvg, filterSelectionDialogOpen, filterSelectionTreeLabel, filterSelectionTypeKeys, filterSelectionTypeOptions, filterSelectionTypePartial, filterSelectionTypeSelected, filteredCustomComponentTreeByComponentType, filteredDeviceDefinitionByComponentType, findConnectTargetAtPoint, findConnectionRouteHitAtPoint, findRewireTargetAtPoint, findRoutableLineEndpointTargetAtPoint, findSavedSchemeById, finishCanvasPanning, finishConnectToTarget, finishInteractiveStaticDrawing, finishManualPathDrag, finishMarqueeSelection, finishMarqueeSelectionFromPoints, finishMeasurementDrag, finishModifierSelectionPress, finishNodeDrag, finishNodeLabelDrag, finishNodeLabelRotateDrag, finishRewiring, finishRoutableLineEndpointDrag, finishRoutableLineToTarget, finishTerminalPress, finishTransformDrag, fitSelectedViewportTitle, fitViewToSelection, fitWholeCanvasFromBlankDoubleClick, fitWholeCanvasToFrame, floatingToolbarIconSize, floatingToolbarWrapperStyle, flushConnectPreviewDom, focusCanvasKeyboardShortcutHost, footer, formatCustomDeviceTerminalAnchorValue, formatDeviceModelParamDisplayValue, formatInspectorScaleValue, formatSvgNumber, g, generateCustomDeviceImage, getContainerTerminalAssociationSourceIndex, getEParamValue, getEParameterKeys, getEdgeEndpointPoint, getMovableRouteSegmentIndexes, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, graphTemplateTypes, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, groupSelectedGraphics, groupTransformPreviewEdgeIdSet, groupTransformPreviewGroupId, groupTransformPreviewNodeIdSet, groupTransformPreviewRoutableLineNodeIdSet, h1, h2, h3, handleCanvasPointerDownCapture, handleDrop, handleEdgePathPointerDown, handleLodNodeContextMenu, handleLodNodeDoubleClick, handleLodNodePointerDown, handleMinimapNavigate, handleNodePointerDown, handlePointerMove, handleRoutableLineNodePathPointerDown, handleSidePanelPointerLeave, handleStaticButtonClick, handleTerminalPointerDown, handleTreeCollapseChange, handleWheel, hasBatchCommonPropertyRows, hasCanvasSelectionModifier, header, hiddenTopologyErrorCount, hideAutoPanelsFromWorkspace, image, imageAssetList, imageAssets, imageFolders, imageInputRef, imageTarget, img, imperativeMultiNodeDragOverlayRef, imperativeNodeDragDropHintRef, imperativeSingleNodeDragEdgePreviewRef, imperativeSingleNodeDragNodeOverlayRef, importModelFile, importSchemeFile, initialCanvasDetailedEdgeIdSet, insertManualBendFromEdgePath, insertManualBendFromPointer, inspectorSelectedEdge, inspectorSelectedNode, inspectorTab, inspectorTopologyErrors, isBlockingTopologyValidationError, isBrowseMode, isBuiltInAttributeLibrary, isBuiltInComponentType, isBusNode, isCanvasGraphicContextMenuTarget, isContainerTerminalAssociationDependent, isDoubleContainerTerminalAssociation, isEditMode, isGroupTransformDrag, isReadonlyCanvasMode, isRepeatedEdgePointerClick, isRoutableLineDeviceKind, isStaticBoxLikeNode, isStaticButtonEnabledForNode, isStaticNode, lastCanvasClientPointerRef, lastCanvasPointerRef, lastEdgePointerClickRef, lastRawCanvasPointerRef, layerAssignmentDialogOpen, layerAssignmentTargetId, layerAssignmentUnchanged, layerManagementDropdownRef, layers, leftPanelContent, leftPanelMode, leftPanelRef, leftPanelTab, leftPanelVisible, libraryPlacement, line, loadDefinitionTemplateDraft, locateTopologyError, lodCanvasNodeChunks, lodCanvasRouteChunks, lodSelectedNodeMarkup, main, manualPathDrag, manualPathPreviewRoute, mapPointToMinimap, marquee, minimapContentHeight, minimapContentWidth, minimapNodes, minimapOffsetX, minimapOffsetY, minimapRoutes, minimapScale, minimapViewportBottom, minimapViewportLeft, minimapViewportRight, minimapViewportTop, minimapVisible, mirrorSelectedNodes, mode, modelImportInputRef, modifierSelectionPressRef, mousePositionTextRef, multiNodeDragging, nodeById, nodeDoubleClickDialogDrag, nodeDoubleClickDialogResize, nodeFloatingToolbar, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, nodeKindAllowsResizeTransform, nodeLabelDisplayMode, nodeLabelDrag, nodeLabelFontSize, nodeLabelOffset, nodeLabelRotateDrag, nodeLabelShouldRender, nodeLabelText, nodeLabelTextAnchor, nodeLabelTextStyle, nodeLabelTransform, nodeLabelVertical, nodeLabelVerticalSegments, nodeLabelVerticalTokenStyle, nodeLabelVerticalTokenY, nodeRotateHandleControlPoints, nodeScaleHandleControlPoint, nodeUprightRotateHandleControlPoints, nodeUprightSelectionOutlineRect, nodeUsesUprightStaticSelectionOutline, nodes, normalizeAttributeLibraryName, normalizeComponentTypeName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, normalizeNodeLabelRotation, normalizeScale, normalizeStaticBoxDimension, normalizedTopologyWarningPage, openAddTemplateDialog, openColorPaletteDialog, openConnectionRedrawDialog, openEdgeContextMenu, openFilterSelectionDialog, openGraphicContextMenu, openGroupDeviceDefinitionDialog, openLayerAssignmentDialog, openMeasurementEditorForNode, openModelImportFilePicker, openNodeDoubleClickEditor, openSchemeImportFilePicker, openStateIconDrawingDialog, openTopologyWarningPanel, openVoltageBaseClearDialog, openVoltageBaseSetDialog, operationLogRef, operationLogStatusRef, overlappedTerminalKeys, p, panning, panningRef, paramOptionsForSection, parameterValueTypeLabelForDefinitionRow, parseCustomDefinitions, pasteProjectClipboardRecord, pasteSchemeClipboardRecord, pasteSelection, path, pattern, pendingModelImportConflict, pendingRecordPasteConflict, pendingSchemeImportConflict, pendingUnsavedAction, pointsToOrthogonalPath, polyline, powerBaseValue, powerUnit, projectById, projectListPointerInsideRef, projectMenu, projectName, pushUndoSnapshot, reactFlowPreviewOpen, recordClipboard, rect, removeMeasurementsFromNode, renameImageFolder, renameProjectRecord, renameSchemeRecord, renderBoundaryBusInternalConnector, renderDeviceDefinitionMeasurementPanel, renderDeviceDefinitionVisualPanel, renderElementTreePanel, renderEnumValuesEditor, renderGraphTemplatePreview, renderGroupTransformPhotoPreview, renderInteractiveStaticDrawingPreview, renderLayerManager, renderLibraryPlacementPreview, renderMeasurementConfigDialog, renderMeasurementEditorDialog, renderMeasurementGroup, renderMultiNodeDragOverlay, renderNodeDoubleClickDialog, renderNodePreviewImageContent, renderReadonlyBackgroundPage, renderSelectedNodeMeasurementTable, renderSidePanelEdgeTrigger, renderSidePanelModeControls, renderSingleTransformRotateOriginGhost, renderStateVisualPager, renderTransformRotationTrajectory, renderTypicalValueEditor, renderViewportRoutedEdges, resetConnectPreviewState, resetDeviceDefinitionDraft, resetEnergyColors, resetRoutableLinePreviewState, resetViewportZoom, resetVoltageColors, resizeSizeHint, resolveConnectPreviewPoint, resolveDuplicateModelImport, resolveDuplicateSchemeImport, resolveNodeStateVisual, resolveRecordPasteConflict, resolveRoutableLinePreviewPoint, resolveTemplateComponentType, resolveUnsavedChangeAction, rewiring, rewiringPreviewRoute, rightPanelMode, rightPanelRef, rightPanelVisible, rotateSelectedLayoutUnits, routableLineActiveTerminalType, routableLineDeviceCanvasPoints, routableLineDeviceRenderLocalPoints, routableLineEndpointDrag, routableLineEndpointDragColor, routableLineEndpointDragPreviewRoute, routableLineEndpointHandles, routableLinePlacement, routableLinePlacementColor, routableLinePreview, routableLineTerminalCompatibilityActive, runContextMenuAction, runTopologyCalculation, sameOptionalPoint, saveColorPalette, saveCurrentProject, saveCustomDeviceDefinitionDialog, saveDeviceDefinitionDraft, saveRequired, scaleHandleCursorClass, scheduleRoutableLinePreviewPoint, schemeImportInputRef, schemes, screenToSvgPoint, select, selectCanvasGraphics, selectCustomAttributeLibrary, selectCustomComponentTemplate, selectCustomComponentType, selectableAttributeLibraries, selectedContainerParameterView, selectedContainerParameterViews, selectedCount, selectedDefinitionBaseTemplate, selectedDefinitionTemplate, selectedDefinitionTerminalAssociations, selectedDeviceInfoView, selectedEdge, selectedLayoutUnitCount, selectedNodeCount, selectedNodeId, selectedNodeIdSet, selectedNodeTransformStatus, selectedRoutableLineManualPathRoute, selectedRoutedEdge, selectedSchemeRecord, selectedTransformGroupUnit, selectedViewportActionDisabled, selectionRectCenter, setActiveImageFolderId, setActiveVoltageBaseTerminalKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasSelectionScope, setColorPaletteDialogOpen, setColorPaletteTab, setConnectSource, setConnectionRedrawDialogOpen, setConnectionRedrawScope, setContainerParamViewId, setContextMarqueeSelection, setContextMenu, setCurrentUnit, setCustomComponentTreeSearchQuery, setCustomComponentTreeSelection, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceStatePageId, setCustomDeviceTerminalAnchorDragIndex, setDefinitionDraftError, setDefinitionDraftSection, setDefinitionDraftSectionEditing, setDeviceDefinitionSearchQuery, setDeviceDefinitionView, setDeviceLabelsVisible, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys, setGroupDeviceDefinitionDialog, setImageTarget, setInspectorTab, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId, setLeftPanelTab, setMarquee, setMinimapVisible, setMode, setPowerBaseValue, setPowerUnit, setReactFlowPreviewOpen, setRewiring, setRoutableLineEndpointDrag, setRoutableLinePlacement, setSelectedDeviceInfoView, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSelectedNodeLabelDisplayMode, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, setSmartAlignmentEnabled, setStateIconDrawingDialog, setStateIconDrawingImportMode, setStateImageUploadTarget, setStaticButtonFeedback, setTemplateDraftName, setTemplateDraftType, setTerminalPress, setTopologyWarningPage, setTopologyWarningPanelClosed, setVoltageBaseClearDialogOpen, setVoltageBaseClearScope, setVoltageBaseSetDialogOpen, setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValue, setVoltageColorVisibility, setVoltageUnit, sidePanelResize, singleNodeDragging, singleSelectedDeviceForInspector, small, smartAlignmentEnabled, smartAlignmentGuides, sourceSelectClassName, span, startCanvasPanning, startCanvasResize, startCanvasResizeFromBottomOverlay, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, startCanvasResizeFromTopOverlay, startContextMarqueeSelection, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, startGroupMoveDrag, startGroupTransformDrag, startManualPointDrag, startManualSegmentDrag, startModifierSelectionPress, startNodeLabelDrag, startNodeLabelRotateDrag, startRoutableLineEndpointDrag, startRoutableLineFromTerminal, startRoutableLinePointDrag, startRoutableLineSegmentDrag, startSidePanelResize, startSingleTransformDrag, startStateIconDrawingDrag, startStatusbarResize, startTopologyWarningPanelDrag, startTopologyWarningPanelResize, stateIconDrawingDialog, stateIconDrawingImportInputRef, stateIconDrawingKeyDown, stateIconDrawingSelection, stateIconDrawingSvgRef, stateIconDrawingToImage, stateVisualImageInputRef, stateVisualShapeLabel, staticButtonPointerRef, staticButtonVisual, staticDrawing, staticNodeParticipatesInRoutingAvoidance, statusbarResize, stopDeviceLibraryDialogEvent, stopSidePanelEventPropagation, stopStateIconDrawingDrag, strong, svgRef, svgStrokeDashArray, switchInspectorTabForCanvasSelection, table, tbody, td, templateDialog, templateDraftName, templateDraftType, templateResizeTransformValue, terminalColor, terminalPressPreviewEdgeIdSet, terminalPressPreviewEdgeRoutes, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, terminalVbaseFallback, terminalVoltageBaseNumber, text, th, thead, tidyRoutableLineRoute, tidySelectedEdgeRoute, title, toggleBackgroundLayer, toggleColorDisplayMode, toggleDefinitionComponentType, toggleDefinitionGroup, toggleFilterSelectionItem, toggleFilterSelectionType, toggleInteractionMode, toggleSelectedNodeLabelDisplay, topology, topologyErrors, topologyStatus, topologyWarningDisplayMessage, topologyWarningPageCount, topologyWarningPanelClosed, topologyWarningPanelRef, topologyWarningPanelResize, topologyWarningPanelStyle, topologyWarningPanelVisible, tr, transformDrag, undoLastOperation, undoStack, ungroupSelectedGraphics, updateAutoPanelVisibility, updateCustomDeviceStateDraftRow, updateCustomDeviceTerminalAnchor, updateCustomDeviceTerminalAnchorFromPreview, updateCustomDraftTerminalCount, updateDefinitionDraftRow, updateEnergyColor, updateLibraryPlacementPreview, updateMouseStatus, updateParam, updateSelectedDefinitionResizePermission, updateSelectedNode, updateStateIconDrawingElement, updateTerminalVbase, updateVoltageColorRow, useSimplifiedCanvasNodes, useSimplifiedCanvasRoutes, useSimplifiedSelectedCanvasNodes, viewportOverlayStyle, visibleEdges, visibleMeasurementGroups, visibleNodes, visibleSelectedGroupLayoutUnits, visibleStateIconColor, visibleTopologyErrors, visibleVoltageColorRows, voltageBaseClearDialogOpen, voltageBaseClearResultForScope, voltageBaseClearScope, voltageBaseSetDialogOpen, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetOptions, voltageBaseSetReady, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetTerminalRows, voltageBaseSetValue, voltageBaseTerminalRowKey, voltageColorVisibility, voltageUnit, warningStatusText, warningStatusTitle, zoomViewportAtCenter } = __appScope;
  return (<div className={`app-shell ${isBrowseMode ? "browse-mode" : "edit-mode"} left-panel-${leftPanelMode} right-panel-${rightPanelMode} ${sidePanelResize ? "side-panel-resizing" : ""} ${statusbarResize ? "statusbar-resizing" : ""} ${topologyWarningPanelResize ? "topology-warning-panel-resizing" : ""} ${nodeDoubleClickDialogDrag || nodeDoubleClickDialogResize ? "node-double-click-dialog-moving" : ""} ${deviceLibraryDialogDrag || deviceLibraryDialogResize ? "device-library-dialog-moving" : ""} ${canvasResizeDrag ? "canvas-resizing" : ""}`} style={appShellStyle}>
      {renderSidePanelEdgeTrigger("left")}
      {renderSidePanelEdgeTrigger("right")}
      <aside ref={leftPanelRef} className={`library-panel floating-side-panel ${leftPanelVisible ? "visible" : "hidden"}`} onPointerDown={stopSidePanelEventPropagation} onPointerMoveCapture={stopSidePanelEventPropagation} onPointerMove={stopSidePanelEventPropagation} onPointerEnter={() => updateAutoPanelVisibility("left", "panel-enter")} onPointerLeave={(event) => handleSidePanelPointerLeave("left", event)} onMouseMoveCapture={stopSidePanelEventPropagation} onMouseMove={stopSidePanelEventPropagation} onClick={stopSidePanelEventPropagation} onDoubleClick={stopSidePanelEventPropagation} onContextMenu={stopSidePanelEventPropagation} onKeyDown={stopSidePanelEventPropagation} onKeyUp={stopSidePanelEventPropagation}>
        <div className="side-panel-resize-handle right-edge" role="separator" aria-orientation="vertical" aria-label="调整左侧栏宽度" title="拖拽调整左侧栏宽度" onPointerDown={(event) => startSidePanelResize(event, "left")}/>
        {renderSidePanelModeControls("left")}
        <div className="left-panel-tabs" role="tablist" aria-label="左侧资源库">
          <button className={effectiveLeftPanelTab === "projects" ? "active" : ""} onClick={() => setLeftPanelTab("projects")} role="tab" aria-selected={effectiveLeftPanelTab === "projects"}>
            模型库
          </button>
          {isEditMode && (<>
              <button className={leftPanelTab === "library" ? "active" : ""} onClick={() => setLeftPanelTab("library")} role="tab" aria-selected={leftPanelTab === "library"}>
                图元库
              </button>
              <button className={leftPanelTab === "templates" ? "active" : ""} onClick={() => setLeftPanelTab("templates")} role="tab" aria-selected={leftPanelTab === "templates"}>
                模板库
              </button>
            </>)}
        </div>
        <div className="left-panel-content">
          {leftPanelContent}
        </div>
      </aside>

      <main className="workspace" onPointerEnter={hideAutoPanelsFromWorkspace}>
        <header className="topbar">
          <div className="brand topbar-brand">
            <div className="brand-mark">PS</div>
            <div>
              <h1>电力能源系统图上建模平台</h1>
              <p>拖拽建模、拓扑关联、参数维护</p>
            </div>
          </div>
          <div className="topbar-model" title={`当前模型：${activeModelPathName}`}>
            <span>当前模型</span>
            <strong>{activeModelPathName}</strong>
          </div>
          <div ref={layerManagementDropdownRef} className="topbar-dropdown layer-management-dropdown">
            <button type="button" className="topbar-dropdown-trigger layer-management-trigger" disabled={isBrowseMode} title={`激活图层：${activeLayer?.name ?? "默认图层"}`} aria-label="图层管理">
              <Layers size={15}/>
              <span>{activeLayer?.name ?? "默认图层"}</span>
              <ChevronDown size={13}/>
            </button>
            <div className="topbar-dropdown-menu layer-management-dropdown-menu" role="menu" aria-label="图层管理">
              {renderLayerManager()}
            </div>
          </div>
          <button type="button" className={`topbar-primary-button mode-toggle-button ${isEditMode ? "active" : ""}`} onClick={toggleInteractionMode} title={isEditMode ? "当前为编辑模式，点击切换到浏览模式" : "当前为浏览模式，点击切换到编辑模式"} aria-label={isEditMode ? "切换到浏览模式" : "切换到编辑模式"}>
            {isEditMode ? <Pencil size={16}/> : <EyeOff size={16}/>}
            <span>{isEditMode ? "编辑模式" : "浏览模式"}</span>
          </button>
          <button type="button" className={`topbar-primary-button ${smartAlignmentEnabled ? "active" : ""}`} onClick={() => setSmartAlignmentEnabled((current) => !current)} title={smartAlignmentEnabled ? "对齐到标线已开启，点击关闭" : "对齐到标线已关闭，点击开启"} aria-label={smartAlignmentEnabled ? "关闭对齐到标线" : "开启对齐到标线"}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="5" width="12" height="6" rx="1"/>
              <line x1="8" y1="0" x2="8" y2="16" strokeDasharray="2 2"/>
            </svg>
          </button>
          <button className="topbar-primary-button" onClick={runTopologyCalculation} disabled={isBrowseMode} title="图上拓扑" aria-label="图上拓扑">
            <Grid2X2 size={16}/>
          </button>
          <button className={`topbar-primary-button ${topologyErrors.length > 0 && !topologyWarningPanelClosed ? "active" : ""}`} onClick={openTopologyWarningPanel} disabled={topologyErrors.length === 0} title={topologyErrors.length > 0 ? "显示告警窗口" : "当前没有拓扑告警"} aria-label="告警窗口">
            <Bell size={16}/>
          </button>
          <button className="topbar-primary-button" onClick={() => void saveCurrentProject()} disabled={isBrowseMode || !saveRequired} title={saveRequired ? "保存当前模型" : "当前模型没有新的修改"} aria-label="保存">
            <Save size={16}/>
          </button>
          <button className={`topbar-primary-button ${colorDisplayMode === "voltage" ? "active" : ""}`} onClick={() => toggleColorDisplayMode()} title={colorDisplayMode === "voltage" ? "当前交流/直流按电压等级显示，点击切换为按能源类型显示；氢能、热能始终按能源类型显示" : "当前交流/直流按能源类型显示，点击切换为按电压等级显示；氢能、热能始终按能源类型显示"} aria-label="颜色切换">
            <Paintbrush size={16}/>
          </button>
          <button className="topbar-primary-button" onClick={openColorPaletteDialog} disabled={isBrowseMode} title="配色设置" aria-label="配色设置">
            <Palette size={16}/>
          </button>
          <button className={`topbar-primary-button ${deviceLabelsVisible ? "active" : ""}`} onClick={() => setDeviceLabelsVisible((current) => !current)} title={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"} aria-label={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"}>
            <Type size={16}/>
          </button>
          {ENABLE_REACT_FLOW_PREVIEW && (<button className="topbar-primary-button react-flow-preview-button" onClick={() => setReactFlowPreviewOpen(true)} title="React Flow 预览" aria-label="React Flow 预览">
              <Route size={16}/>
            </button>)}
          <div className="action-cluster">
            
            <button onClick={groupSelectedGraphics} disabled={isBrowseMode || !canGroupSelectedGraphics} title="组合" aria-label="组合">
              <Group size={16}/>
            </button>
            <button onClick={ungroupSelectedGraphics} disabled={isBrowseMode || !canUngroupSelectedGraphics} title="解散" aria-label="解散">
              <Ungroup size={16}/>
            </button>
            <div className="topbar-dropdown display-layer-dropdown">
              <button type="button" className="topbar-dropdown-trigger" disabled={!canAdjustSelectedDisplayLayer} title="显示层级" aria-label="显示层级">
                <Layers2 size={16}/>
                <ChevronDown size={13}/>
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="显示层级">
                <button onClick={() => adjustSelectedDisplayLayer("raise")} disabled={!canAdjustSelectedDisplayLayer} title="提升显示层级" aria-label="提升显示层级">
                  <ArrowUp size={16}/>
                  <span>提升显示层级</span>
                </button>
                <button onClick={() => adjustSelectedDisplayLayer("lower")} disabled={!canAdjustSelectedDisplayLayer} title="降低显示层级" aria-label="降低显示层级">
                  <ArrowDown size={16}/>
                  <span>降低显示层级</span>
                </button>
                <button onClick={() => adjustSelectedDisplayLayer("front")} disabled={!canAdjustSelectedDisplayLayer} title="顶层显示" aria-label="顶层显示">
                  <ChevronsUp size={16}/>
                  <span>顶层显示</span>
                </button>
                <button onClick={() => adjustSelectedDisplayLayer("back")} disabled={!canAdjustSelectedDisplayLayer} title="底层显示" aria-label="底层显示">
                  <ChevronsDown size={16}/>
                  <span>底层显示</span>
                </button>
              </div>
            </div>
            <div className="topbar-dropdown align-dropdown">
              <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode} title="对齐操作" aria-label="对齐操作">
                <AlignCenterHorizontal size={16}/>
                <ChevronDown size={13}/>
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="对齐操作">
                <button onClick={() => alignSelected("left")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="左对齐" aria-label="左对齐">
                  <AlignStartVertical size={16}/>
                  <span>左对齐</span>
                </button>
                <button onClick={() => alignSelected("right")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="右对齐" aria-label="右对齐">
                  <AlignEndVertical size={16}/>
                  <span>右对齐</span>
                </button>
                <button onClick={() => alignSelected("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="横向居中" aria-label="横向居中">
                  <AlignCenterHorizontal size={16}/>
                  <span>横向居中</span>
                </button>
                <button onClick={() => alignSelected("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="纵向居中" aria-label="纵向居中">
                  <AlignCenterVertical size={16}/>
                  <span>纵向居中</span>
                </button>
                <button onClick={() => alignSelected("top")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="上对齐" aria-label="上对齐">
                  <AlignStartHorizontal size={16}/>
                  <span>上对齐</span>
                </button>
                <button onClick={() => alignSelected("bottom")} disabled={isBrowseMode || selectedLayoutUnitCount < 2} title="下对齐" aria-label="下对齐">
                  <AlignEndHorizontal size={16}/>
                  <span>下对齐</span>
                </button>
                <button onClick={() => distributeSelected("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 3} title="横向分布" aria-label="横向分布">
                  <AlignHorizontalDistributeCenter size={16}/>
                  <span>横向分布</span>
                </button>
                <button onClick={() => distributeSelected("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 3} title="纵向分布" aria-label="纵向分布">
                  <AlignVerticalDistributeCenter size={16}/>
                  <span>纵向分布</span>
                </button>
              </div>
            </div>
            <div className="topbar-dropdown rotate-dropdown">
              <button type="button" className="topbar-dropdown-trigger" disabled={isBrowseMode} title="旋转操作" aria-label="旋转操作">
                <RotateCw size={16}/>
                <ChevronDown size={13}/>
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="旋转操作">
                <button onClick={() => rotateSelectedLayoutUnits("left")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="向左旋转90度" aria-label="向左旋转90度">
                  <RotateCcw size={16}/>
                  <span>左转90度</span>
                </button>
                <button onClick={() => rotateSelectedLayoutUnits("right")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="向右旋转90度" aria-label="向右旋转90度">
                  <RotateCw size={16}/>
                  <span>右转90度</span>
                </button>
                <button onClick={() => mirrorSelectedNodes("horizontal")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="水平镜像" aria-label="水平镜像">
                  <FlipHorizontal size={16}/>
                  <span>水平镜像</span>
                </button>
                <button onClick={() => mirrorSelectedNodes("vertical")} disabled={isBrowseMode || selectedLayoutUnitCount < 1} title="垂直镜像" aria-label="垂直镜像">
                  <FlipVertical size={16}/>
                  <span>垂直镜像</span>
                </button>
              </div>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseImage}/>
            <input ref={customDeviceImageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseCustomDeviceBackground}/>
            <input ref={definitionTemplateIconInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseDefinitionTemplateIcon}/>
            <input ref={stateVisualImageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseStateVisualImage}/>
            <input ref={stateIconDrawingImportInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseStateIconDrawingImport}/>
            <input ref={modelImportInputRef} type="file" accept=".json,application/json" hidden onChange={importModelFile}/>
            <input ref={schemeImportInputRef} type="file" accept=".zip,application/zip,.json,application/json" hidden onChange={importSchemeFile}/>
            <button onClick={exportSvg} disabled={!canExportCurrentModel} title={canExportCurrentModel ? "导出 SVG 图形文件" : "请先保存当前模型后再导出图形文件"} aria-label="导出图形文件">
              <Download size={16}/>
            </button>
            <button onClick={exportEFile} disabled={!canExportCurrentModel} title={canExportCurrentModel ? "导出 E 模型文件" : "请先保存当前模型后再导出模型文件"} aria-label="导出模型文件">
              <FileJson size={16}/>
            </button>
          </div>
        </header>

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
        {topologyWarningPanelVisible && (<section ref={topologyWarningPanelRef} className="topology-warning-floating-panel" style={topologyWarningPanelStyle} aria-label="拓扑警告信息" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <header className="topology-warning-floating-title" onPointerDown={startTopologyWarningPanelDrag}>
              <div>
                <h2>拓扑警告信息</h2>
                <span>{inspectorTopologyErrors.length}条</span>
              </div>
              <button type="button" title="关闭拓扑警告信息" aria-label="关闭拓扑警告信息" onPointerDown={(event) => event.stopPropagation()} onClick={() => setTopologyWarningPanelClosed(true)}>
                <X size={14}/>
              </button>
            </header>
            <div className="topology-warning-floating-body">
              <table className="topology-warning-table">
                <thead>
                  <tr>
                    <th>状态</th>
                    <th>信息</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTopologyErrors.map((error) => {
            const blocking = isBlockingTopologyValidationError(error);
            return (<tr key={error.id} className={blocking ? "error" : "warning"}>
                        <td>{blocking ? "错误" : "告警"}</td>
                        <td>
                          <button type="button" onClick={() => locateTopologyError(error)} onDoubleClick={() => locateTopologyError(error)}>
                            {topologyWarningDisplayMessage(error.message)}
                          </button>
                        </td>
                      </tr>);
        })}
                </tbody>
              </table>
            </div>
            {inspectorTopologyErrors.length > TOPOLOGY_WARNING_PAGE_SIZE && (<div className="validation-pagination topology-warning-floating-pagination">
                <button type="button" onClick={() => setTopologyWarningPage((current) => Math.max(0, current - 1))} disabled={normalizedTopologyWarningPage === 0}>
                  上一页
                </button>
                <span>
                  {normalizedTopologyWarningPage + 1} / {topologyWarningPageCount}
                </span>
                <button type="button" onClick={() => setTopologyWarningPage((current) => Math.min(topologyWarningPageCount - 1, current + 1))} disabled={normalizedTopologyWarningPage >= topologyWarningPageCount - 1}>
                  下一页
                </button>
              </div>)}
            {hiddenTopologyErrorCount > 0 && (<p className="validation-more topology-warning-floating-more">每页显示 {TOPOLOGY_WARNING_PAGE_SIZE} 条告警，请分页处理或重新拓扑。</p>)}
            <div className="topology-warning-floating-resize" role="separator" aria-orientation="horizontal" title="拖拽调整拓扑警告信息窗口大小" onPointerDown={startTopologyWarningPanelResize}/>
          </section>)}
        <footer className="bottom-statusbar" aria-label="运行状态">
          <div className="statusbar-resize-handle" role="separator" aria-orientation="horizontal" aria-label="调整提示信息栏高度" title="拖拽调整提示信息栏高度" onPointerDown={startStatusbarResize}/>
          <span className="status-pill">
            坐标 <span ref={mousePositionTextRef}>X:- Y:-</span>
          </span>
          <span className="status-pill" title={`当前视图缩放比 ${currentZoomPercent}%`}>
            缩放 {currentZoomPercent}%
          </span>
          <span className={`status-pill topology-${topologyStatus.state}`} title={topologyStatus.message}>
            拓扑 {topologyStatus.message}
          </span>
          <span className={`status-pill warning-${topologyErrors.length > 0 ? "active" : "idle"}`} title={topologyErrors.length > 0 ? `${warningStatusTitle}；点击打开拓扑告警窗口。` : warningStatusTitle} onClick={() => topologyErrors.length > 0 && setTopologyWarningPanelClosed(false)}>
            {warningStatusText}
          </span>
          <span ref={operationLogStatusRef} className="status-pill status-log" title={operationLogRef.current}>
            日志 {operationLogRef.current}
          </span>
          <span className="status-pill">
            <Grid2X2 size={15}/>
            元件 {nodes.length}
          </span>
          <span className="status-pill">联络线 {edges.length}</span>
          <span className="status-pill">选中 {selectedCount}</span>
          {selectedNodeTransformStatus && (<span className="status-pill status-transform" title={selectedNodeTransformStatus.title}>
              图元 缩放 {selectedNodeTransformStatus.scaleText} 旋转 {selectedNodeTransformStatus.rotationText}
            </span>)}
          {saveRequired && <strong>未保存</strong>}
          {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
          {mode === "static-draw" && <strong>点击落点，双击或 Enter 完成，Esc 取消</strong>}
        </footer>
      </main>

      <aside ref={rightPanelRef} className={`inspector-panel floating-side-panel ${rightPanelVisible ? "visible" : "hidden"}`} onPointerDown={stopSidePanelEventPropagation} onPointerMoveCapture={stopSidePanelEventPropagation} onPointerMove={stopSidePanelEventPropagation} onPointerEnter={() => updateAutoPanelVisibility("right", "panel-enter")} onPointerLeave={(event) => handleSidePanelPointerLeave("right", event)} onMouseMoveCapture={stopSidePanelEventPropagation} onMouseMove={stopSidePanelEventPropagation} onClick={stopSidePanelEventPropagation} onDoubleClick={stopSidePanelEventPropagation} onContextMenu={stopSidePanelEventPropagation} onKeyDown={stopSidePanelEventPropagation} onKeyUp={stopSidePanelEventPropagation}>
        <div className="side-panel-resize-handle left-edge" role="separator" aria-orientation="vertical" aria-label="调整右侧栏宽度" title="拖拽调整右侧栏宽度" onPointerDown={(event) => startSidePanelResize(event, "right")}/>
        <div className="inspector-title">
          <div className="inspector-title-actions">
            {renderSidePanelModeControls("right")}
          </div>
        </div>
        {inspectorSelectedNode || currentModelRecord ? (<div className={`form-stack ${inspectorTab === "tree" ? "graph-form-stack" : ""}`}>
            <div className="inspector-tabs">
              <button className={inspectorTab === "model" ? "active" : ""} onClick={() => setInspectorTab("model")} disabled={!currentModelRecord}>
                基础
              </button>
              <button className={inspectorTab === "tree" ? "active" : ""} onClick={() => setInspectorTab("tree")}>
                图元树
              </button>
              <button className={inspectorTab === "graph" || inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图元
              </button>
            </div>
            {inspectorTab === "model" && currentModelRecord ? (<table className="param-table">
                <tbody>
                  <tr>
                    {batchEditors.renderChineseParamHeader("name", "模型名称")}
                    <td><input value={currentModelRecord.name} readOnly/></td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("schemeName")}
                    <td><input value={selectedSchemeRecord?.name ?? "未选择方案"} readOnly/></td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("updatedAt", "模型更新时间")}
                    <td><input value={new Date(currentModelRecord.updatedAt).toLocaleString()} readOnly/></td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasWidth")}
                    <td>
                      <BufferedTextInput type="number" min={MIN_CANVAS_WIDTH} max={MAX_CANVAS_WIDTH} step="10" value={canvasSizeDraft.width} disabled={isBrowseMode} onCommit={(nextValue) => commitCanvasSizeDraft({ ...canvasSizeDraft, width: nextValue })}/>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasHeight")}
                    <td>
                      <BufferedTextInput type="number" min={MIN_CANVAS_HEIGHT} max={MAX_CANVAS_HEIGHT} step="10" value={canvasSizeDraft.height} disabled={isBrowseMode} onCommit={(nextValue) => commitCanvasSizeDraft({ ...canvasSizeDraft, height: nextValue })}/>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("allowAutoExpandCanvas")}
                    <td>
                      <select value={allowAutoExpandCanvas ? "allow" : "deny"} disabled={isBrowseMode} onChange={(event) => {
                pushUndoSnapshot();
                setAllowAutoExpandCanvas(event.target.value === "allow");
            }}>
                        <option value="allow">允许</option>
                        <option value="deny">不允许</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasBackgroundColor")}
                    <td>
                      <div className="color-field with-clear">
                        <DeferredColorInput value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND} fallback={DEFAULT_CANVAS_BACKGROUND} disabled={isBrowseMode} onCommit={(value) => {
                pushUndoSnapshot();
                setCanvasBackgroundColor(value);
            }}/>
                        <BufferedTextInput value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND} disabled={isBrowseMode} onCommit={(nextValue) => {
                pushUndoSnapshot();
                setCanvasBackgroundColor(nextValue || DEFAULT_CANVAS_BACKGROUND);
            }}/>
                        <button type="button" onClick={() => {
                pushUndoSnapshot();
                setCanvasBackgroundColor("");
            }} disabled={isBrowseMode || !canvasBackgroundColor || canvasBackgroundColor === DEFAULT_CANVAS_BACKGROUND}>
                          删除背景色
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasBackgroundImage")}
                    <td>
                      <div className="image-field-actions">
                        <input value={canvasBackgroundImage ? "已设置" : "未设置"} readOnly/>
                        <button type="button" disabled={isBrowseMode} onClick={() => setImageTarget({ kind: "canvas" })}>选择</button>
                        <button type="button" onClick={() => {
                pushUndoSnapshot();
                setCanvasBackgroundImage("");
                setCanvasBackgroundImageAssetId("");
            }} disabled={isBrowseMode || !canvasBackgroundImage}>
                          清除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("backgroundProjectId")}
                    <td>
                      <div className="background-page-field">
                        <select value={backgroundProjectId} disabled={isBrowseMode} onChange={(event) => {
                pushUndoSnapshot();
                const nextProjectId = event.target.value;
                setBackgroundProjectId(nextProjectId);
                const backgroundProject = projectById.get(nextProjectId);
                if (backgroundProject) {
                    setBackgroundLayerIds(defaultBackgroundLayerIdsForProject(backgroundProject.project));
                }
                else {
                    setBackgroundLayerIds([]);
                }
            }}>
                          <option value="">不使用背景页面</option>
                          {backgroundProjectOptions.map(({ project, label }) => (<option key={project.id} value={project.id}>
                              {label}
                            </option>))}
                        </select>
                        <button type="button" onClick={() => {
                pushUndoSnapshot();
                setBackgroundProjectId("");
                setBackgroundLayerIds([]);
            }} disabled={isBrowseMode || !backgroundProjectId}>
                          清空背景页面
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("backgroundLayerIds")}
                    <td>
                      {backgroundProjectRecord ? (<div className="background-layer-checklist">
                          {backgroundLayerOptions.map((layer) => (<label key={layer.id} className="background-layer-option">
                              <input type="checkbox" checked={backgroundLayerIds.includes(layer.id)} disabled={isBrowseMode} onChange={() => toggleBackgroundLayer(layer.id)}/>
                              <span>{layer.name}</span>
                            </label>))}
                          {backgroundLayerOptions.length === 0 && <span className="muted-inline-text">背景页面没有可配置图层</span>}
                        </div>) : (<span className="muted-inline-text">未设置背景页面</span>)}
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("powerUnit")}
                    <td>
                      <select value={powerUnit} disabled={isBrowseMode} onChange={(event) => {
                pushUndoSnapshot();
                setPowerUnit(event.target.value);
            }}>
                        {POWER_UNIT_OPTIONS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("voltageUnit")}
                    <td>
                      <select value={voltageUnit} disabled={isBrowseMode} onChange={(event) => {
                pushUndoSnapshot();
                setVoltageUnit(event.target.value);
            }}>
                        {VOLTAGE_UNIT_OPTIONS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("currentUnit")}
                    <td>
                      <select value={currentUnit} disabled={isBrowseMode} onChange={(event) => {
                pushUndoSnapshot();
                setCurrentUnit(event.target.value);
            }}>
                        {CURRENT_UNIT_OPTIONS.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("powerBaseValue")}
                    <td>
                      <div className="unit-value-field">
                        <BufferedTextInput type="number" min="0" step="0.1" value={powerBaseValue} disabled={isBrowseMode} onCommit={(nextValue) => {
                pushUndoSnapshot();
                const numericValue = Number(nextValue);
                setPowerBaseValue(Number.isFinite(numericValue) ? numericValue : DEFAULT_POWER_BASE_VALUE);
            }}/>
                        <span>{powerUnit}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>) : inspectorTab === "tree" ? (renderElementTreePanel()) : inspectorTab === "graph" ? ((() => {
            const multiNodeGraphSelection = activeSelectedNodeIds.length > 1;
            const selectedNodeAllowsIndependentScale = inspectorSelectedNode
                ? nodeKindAllowsResizeTransform(inspectorSelectedNode.kind)
                : true;
            return (<div className="graph-info-panel">
                <div className="graph-info-toolbar" role="tablist" aria-label="图元属性分类">
                  <button type="button" className={multiNodeGraphSelection ? "" : "active"} onClick={() => setInspectorTab("graph")} role="tab" aria-selected={!multiNodeGraphSelection} disabled={multiNodeGraphSelection || !inspectorSelectedNode}>
                    图形
                  </button>
                  <button type="button" className="" onClick={() => {
                    setInspectorTab("device");
                    setSelectedDeviceInfoView("model");
                }} role="tab" aria-selected={false} disabled={multiNodeGraphSelection || !inspectorSelectedNode || isStaticNode(inspectorSelectedNode)}>
                    模型
                  </button>
                  <button type="button" className="" onClick={() => {
                    setInspectorTab("device");
                    setSelectedDeviceInfoView("measurement");
                }} role="tab" aria-selected={false} disabled={multiNodeGraphSelection || !inspectorSelectedNode || isStaticNode(inspectorSelectedNode)}>
                    量测
                  </button>
                  {multiNodeGraphSelection && (<button type="button" className="active" role="tab" aria-selected={true}>
                      共同属性
                    </button>)}
                </div>
                {multiNodeGraphSelection ? (<div className="batch-common-scroll-area">
                    {hasBatchCommonPropertyRows ? batchEditors.renderBatchCommonPropertyPanel() : (<div className="empty-state compact">
                        <FileJson size={24}/>
                        <p>当前选中的图元没有可批量修改的共同属性。</p>
                      </div>)}
                  </div>) : inspectorSelectedNode ? (<div className="graph-param-table-wrap">
                  <table className="param-table">
                  <tbody>
                    <tr>
                      {batchEditors.renderChineseParamHeader("graph_x", "X坐标")}
                      <td><BufferedTextInput type="number" value={Math.round(inspectorSelectedNode.position.x)} onCommit={(nextValue) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, x: Number(nextValue) } })}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("graph_y", "Y坐标")}
                      <td><BufferedTextInput type="number" value={Math.round(inspectorSelectedNode.position.y)} onCommit={(nextValue) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, y: Number(nextValue) } })}/></td>
                    </tr>
                    {isStaticBoxLikeNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader("staticWidth", "宽度")}
                          <td>
                            <BufferedTextInput type="number" min="4" max={MAX_CANVAS_WIDTH} step="1" value={Math.round(inspectorSelectedNode.size.width * 10) / 10} onCommit={(nextValue) => {
                            const width = normalizeStaticBoxDimension(Number(nextValue), inspectorSelectedNode.size.width, MAX_CANVAS_WIDTH);
                            updateSelectedNode({ size: { ...inspectorSelectedNode.size, width: width } });
                        }}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("staticHeight", "高度")}
                          <td>
                            <BufferedTextInput type="number" min="4" max={MAX_CANVAS_HEIGHT} step="1" value={Math.round(inspectorSelectedNode.size.height * 10) / 10} onCommit={(nextValue) => {
                            const height = normalizeStaticBoxDimension(Number(nextValue), inspectorSelectedNode.size.height, MAX_CANVAS_HEIGHT);
                            updateSelectedNode({ size: { ...inspectorSelectedNode.size, height: height } });
                        }}/>
                          </td>
                        </tr>
                      </>)}
                    <tr>
                      {batchEditors.renderChineseParamHeader("rotation")}
                      <td><BufferedTextInput type="number" value={inspectorSelectedNode.rotation} onCommit={(nextValue) => updateSelectedNode({ rotation: Number(nextValue) })}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("scaleX")}
                      <td><BufferedTextInput type="number" step="0.1" value={formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))} onCommit={(nextValue) => {
                        const scaleX = normalizeScale(Number(nextValue), getNodeScaleX(inspectorSelectedNode));
                        const nextScaleY = selectedNodeAllowsIndependentScale
                            ? getNodeScaleY(inspectorSelectedNode)
                            : scaleX;
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(nextScaleY)), scaleX, scaleY: nextScaleY });
                    }}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("scaleY")}
                      <td><BufferedTextInput type="number" step="0.1" value={selectedNodeAllowsIndependentScale ? formatInspectorScaleValue(getNodeScaleY(inspectorSelectedNode)) : formatInspectorScaleValue(getNodeScaleX(inspectorSelectedNode))} disabled={!selectedNodeAllowsIndependentScale} title={!selectedNodeAllowsIndependentScale ? "当前图元不允许变形，纵向倍率跟随横向倍率" : undefined} onCommit={(nextValue) => {
                        const scaleY = normalizeScale(Number(nextValue), getNodeScaleY(inspectorSelectedNode));
                        const scaleX = getNodeScaleX(inspectorSelectedNode);
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(scaleY)), scaleX, scaleY });
                    }}/></td>
                    </tr>
                    <tr>
                      {batchEditors.renderChineseParamHeader("layerId", "所属图层")}
                      <td>
                        <select value={inspectorSelectedNode.layerId ?? DEFAULT_MODEL_LAYER_ID} onChange={(event) => updateSelectedNode({ layerId: event.target.value })}>
                          {layers.map((layer) => (<option key={layer.id} value={layer.id}>{layer.name}</option>))}
                        </select>
                      </td>
                    </tr>
                    {!isStaticNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelDisplayMode")}
                          <td>
                            <select value={nodeLabelDisplayMode(inspectorSelectedNode)} onChange={(event) => updateParam("_labelDisplayMode", event.target.value)}>
                              <option value="always">始终显示</option>
                              <option value="hidden">始终隐藏</option>
                              <option value="follow">跟随显示</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelText")}
                          <td>
                            <BufferedTextInput value={inspectorSelectedNode.params._labelText ?? inspectorSelectedNode.name} onCommit={(nextValue) => updateParam("_labelText", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelColor")}
                          <td>{batchEditors.renderColorEditor("_labelColor", inspectorSelectedNode.params._labelColor || "#334155", "#334155")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelFontFamily")}
                          <td>{batchEditors.renderParamEditor("_labelFontFamily", inspectorSelectedNode.params._labelFontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelFontSize")}
                          <td>
                            <BufferedTextInput type="number" min="6" max="96" value={inspectorSelectedNode.params._labelFontSize || String(DEFAULT_DEVICE_LABEL_FONT_SIZE)} onCommit={(nextValue) => updateParam("_labelFontSize", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelRotation")}
                          <td>
                            <select value={String(normalizeNodeLabelRotation(inspectorSelectedNode.params._labelRotation))} onChange={(event) => updateParam("_labelRotation", String(normalizeNodeLabelRotation(event.target.value)))}>
                              <option value="0">0° 横排</option>
                              <option value="90">90° 纵排</option>
                              <option value="180">180° 横排</option>
                              <option value="270">270° 纵排</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>标识样式</th>
                          <td>
                            <div className="device-label-style-actions">
                              <TextStyleToggleButton active={(inspectorSelectedNode.params._labelFontWeight || "500") !== "400"} label="标识加粗" onClick={() => updateParam("_labelFontWeight", (inspectorSelectedNode.params._labelFontWeight || "500") !== "400" ? "400" : "700")}>
                                <Bold aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params._labelFontStyle || "normal") === "italic"} label="标识斜体" onClick={() => updateParam("_labelFontStyle", (inspectorSelectedNode.params._labelFontStyle || "normal") === "italic" ? "normal" : "italic")}>
                                <Italic aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params._labelTextDecoration || "none") === "underline"} label="标识下划线" onClick={() => updateParam("_labelTextDecoration", (inspectorSelectedNode.params._labelTextDecoration || "none") === "underline" ? "none" : "underline")}>
                                <Underline aria-hidden="true"/>
                              </TextStyleToggleButton>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelTextAnchor")}
                          <td>
                            <select value={nodeLabelTextAnchor(inspectorSelectedNode)} onChange={(event) => updateParam("_labelTextAnchor", event.target.value)}>
                              <option value="start">左对齐</option>
                              <option value="middle">居中</option>
                              <option value="end">右对齐</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelX")}
                          <td>
                            <BufferedTextInput type="number" step="0.1" value={nodeLabelOffset(inspectorSelectedNode).x} onCommit={(nextValue) => updateParam("_labelX", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("_labelY")}
                          <td>
                            <BufferedTextInput type="number" step="0.1" value={nodeLabelOffset(inspectorSelectedNode).y} onCommit={(nextValue) => updateParam("_labelY", nextValue)}/>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("terminalCount")}
                          <td>
                            <span className="graph-readonly-value" title={isBusNode(inspectorSelectedNode) ? "母线端子数量由已连接联络线端点数自动生成" : "端子数量由元件定义决定"}>
                              {inspectorSelectedNode.terminals.length}
                            </span>
                          </td>
                        </tr>
                        {inspectorSelectedNode.terminals.map((terminal, terminalIndex) => (<Fragment key={terminal.id}>
                            <tr>
                              <th title={terminal.id}>{terminal.label}</th>
                              <td>{`${terminal.type.toUpperCase()} / ${terminal.nodeNumber}`}</td>
                            </tr>
                            {(terminal.type === "ac" || terminal.type === "dc") && (<tr>
                                <th title={`${terminal.id}:vbase`}>{`${terminal.label}电压基值`}</th>
                                <td>
                                  <div className="unit-value-field">
                                    <BufferedTextInput inputMode="decimal" value={terminalVoltageBaseNumber(terminal.vbase ?? terminalVbaseFallback(inspectorSelectedNode, terminalIndex))} onCommit={(nextValue) => updateTerminalVbase(terminal.id, nextValue)}/>
                                    <span>{voltageUnit}</span>
                                  </div>
                                </td>
                              </tr>)}
                          </Fragment>))}
                      </>)}
                    {isStaticNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader(STATIC_ROUTE_AVOIDANCE_PARAM)}
                          <td>
                            <select value={staticNodeParticipatesInRoutingAvoidance(inspectorSelectedNode) ? "1" : "0"} onChange={(event) => updateParam(STATIC_ROUTE_AVOIDANCE_PARAM, event.target.value)}>
                              <option value="1">参与</option>
                              <option value="0">不参与</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("text")}
                          <td><BufferedTextarea rows={4} value={inspectorSelectedNode.params.text || ""} onCommit={(nextValue) => updateParam("text", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("fontFamily")}
                          <td>{batchEditors.renderParamEditor("fontFamily", inspectorSelectedNode.params.fontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          <th title="fontSize">字体大小（100%）</th>
                          <td><BufferedTextInput type="number" min="8" max="160" value={inspectorSelectedNode.params.fontSize || "24"} onCommit={(nextValue) => updateParam("fontSize", nextValue)}/></td>
                        </tr>
                        <tr>
                          <th>文字样式</th>
                          <td>
                            <div className="text-style-actions">
                              <TextStyleToggleButton active={(inspectorSelectedNode.params.fontWeight || "400") !== "400"} label="加粗" onClick={() => updateParam("fontWeight", (inspectorSelectedNode.params.fontWeight || "400") !== "400" ? "400" : "700")}>
                                <Bold aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params.fontStyle || "normal") === "italic"} label="斜体" onClick={() => updateParam("fontStyle", (inspectorSelectedNode.params.fontStyle || "normal") === "italic" ? "normal" : "italic")}>
                                <Italic aria-hidden="true"/>
                              </TextStyleToggleButton>
                              <TextStyleToggleButton active={(inspectorSelectedNode.params.textDecoration || "none") === "underline"} label="下划线" onClick={() => updateParam("textDecoration", (inspectorSelectedNode.params.textDecoration || "none") === "underline" ? "none" : "underline")}>
                                <Underline aria-hidden="true"/>
                              </TextStyleToggleButton>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("fillColor")}
                          <td>{batchEditors.renderColorEditor("fillColor", inspectorSelectedNode.params.fillColor || "transparent", "#ffffff")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("strokeColor")}
                          <td>{batchEditors.renderColorEditor("strokeColor", inspectorSelectedNode.params.strokeColor || "transparent", "#334155")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("textColor")}
                          <td>{batchEditors.renderColorEditor("textColor", inspectorSelectedNode.params.textColor || "#111827", "#111827")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("lineWidth")}
                          <td><BufferedTextInput type="number" min="0" max="20" value={inspectorSelectedNode.params.lineWidth || "2"} onCommit={(nextValue) => updateParam("lineWidth", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("strokeStyle")}
                          <td>{batchEditors.renderParamEditor("strokeStyle", inspectorSelectedNode.params.strokeStyle || "solid", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("cornerRadius")}
                          <td><BufferedTextInput type="number" min="0" max="999" value={inspectorSelectedNode.params.cornerRadius || "8"} onCommit={(nextValue) => updateParam("cornerRadius", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("accentColor")}
                          <td>{batchEditors.renderColorEditor("accentColor", inspectorSelectedNode.params.accentColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("shadowEnabled")}
                          <td>{batchEditors.renderParamEditor("shadowEnabled", inspectorSelectedNode.params.shadowEnabled || "0", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("padding")}
                          <td><BufferedTextInput type="number" min="0" max="120" value={inspectorSelectedNode.params.padding || "12"} onCommit={(nextValue) => updateParam("padding", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("textAlign")}
                          <td>{batchEditors.renderParamEditor("textAlign", inspectorSelectedNode.params.textAlign || "center", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("verticalAlign")}
                          <td>{batchEditors.renderParamEditor("verticalAlign", inspectorSelectedNode.params.verticalAlign || "middle", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("markerStart")}
                          <td>{batchEditors.renderParamEditor("markerStart", inspectorSelectedNode.params.markerStart || "none", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("markerEnd")}
                          <td>{batchEditors.renderParamEditor("markerEnd", inspectorSelectedNode.params.markerEnd || "none", false)}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("arrowSize")}
                          <td><BufferedTextInput type="number" min="4" max="80" value={inspectorSelectedNode.params.arrowSize || "10"} onCommit={(nextValue) => updateParam("arrowSize", nextValue)}/></td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("handleColor")}
                          <td>{batchEditors.renderColorEditor("handleColor", inspectorSelectedNode.params.handleColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("handleSize")}
                          <td><BufferedTextInput type="number" min="3" max="40" value={inspectorSelectedNode.params.handleSize || "8"} onCommit={(nextValue) => updateParam("handleSize", nextValue)}/></td>
                        </tr>
                        {batchEditors.renderStaticButtonActionEditor(inspectorSelectedNode)}
                        <tr>
                          {batchEditors.renderChineseParamHeader("backgroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={inspectorSelectedNode.params.backgroundImage ? "已设置" : "未设置"} readOnly/>
                              <button type="button" onClick={() => setImageTarget({ kind: "node", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "background")} disabled={!inspectorSelectedNode.params.backgroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>)}
                    {!isStaticNode(inspectorSelectedNode) && (<>
                        <tr>
                          {batchEditors.renderChineseParamHeader("foregroundColor")}
                          <td>{batchEditors.renderColorEditor("foregroundColor", inspectorSelectedNode.params.foregroundColor || "", terminalColor(inspectorSelectedNode.terminals[0]?.type, colorPalette))}</td>
                        </tr>
                        <tr>
                          {batchEditors.renderChineseParamHeader("foregroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={inspectorSelectedNode.params.foregroundImage ? "已设置" : "未设置"} readOnly/>
                              <button type="button" onClick={() => setImageTarget({ kind: "nodeForeground", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "foreground")} disabled={!inspectorSelectedNode.params.foregroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>)}
                    </tbody>
                  </table>
                  </div>) : (<div className="empty-state compact">
                    <FileJson size={24}/>
                    <p>当前没有被选中图元。</p>
                  </div>)}
              </div>);
        })()) : inspectorSelectedNode ? (<div className="device-param-stack">
                {!isStaticNode(inspectorSelectedNode) && (<div className="device-info-tabs" role="tablist" aria-label="图元属性分类">
                    <button type="button" className="" onClick={() => setInspectorTab("graph")} role="tab" aria-selected={false}>
                      图形
                    </button>
                    <button type="button" className={selectedDeviceInfoView === "model" ? "active" : ""} onClick={() => setSelectedDeviceInfoView("model")} role="tab" aria-selected={selectedDeviceInfoView === "model"}>
                      模型
                    </button>
                    <button type="button" className={selectedDeviceInfoView === "measurement" ? "active" : ""} onClick={() => setSelectedDeviceInfoView("measurement")} role="tab" aria-selected={selectedDeviceInfoView === "measurement"}>
                      量测
                    </button>
                  </div>)}
                {selectedDeviceInfoView === "measurement" && !isStaticNode(inspectorSelectedNode) ? (renderSelectedNodeMeasurementTable(inspectorSelectedNode)) : (<>
                    {selectedContainerParameterViews.length > 0 && (<div className="container-param-tabs" role="tablist" aria-label="容器设备参数切换">
                        {selectedContainerParameterViews.map((view) => (<button key={view.id} type="button" className={selectedContainerParameterView?.id === view.id ? "active" : ""} onClick={() => setContainerParamViewId(view.id)}>
                            {view.label}
                          </button>))}
                      </div>)}
                    {selectedContainerParameterView ? (<table className="param-table">
                        <tbody>
                          {selectedContainerParameterView.rows.map((row) => {
                        const options = paramOptionsForSection(row.key, selectedContainerParameterView.componentType);
                        const displayValue = formatDeviceModelParamDisplayValue(row.key, row.value);
                        return (<tr key={row.key}>
                                  {batchEditors.renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}
                                  <td>
                                    {row.key === "name" && selectedContainerParameterView.kind === "container" ? (<BufferedTextInput value={inspectorSelectedNode.name} onCommit={(nextValue) => updateSelectedNode({ name: nextValue })}/>) : row.readonly || !row.paramKey ? (<input value={displayValue} readOnly/>) : options ? (<select value={displayValue} onChange={(event) => updateParam(row.paramKey!, event.target.value)}>
                                      {options.map((option) => (<option key={option} value={option}>
                                          {option}
                                        </option>))}
                                    </select>) : (<BufferedTextInput value={displayValue} onCommit={(nextValue) => updateParam(row.paramKey!, nextValue)}/>)}
                                </td>
                              </tr>);
                    })}
                        </tbody>
                      </table>) : (<table className="param-table">
                        <tbody>
                          {(() => {
                        const eKeys = getEParameterKeys(inspectorSelectedNode.kind, inspectorSelectedNode.params);
                        const customDefinitions = parseCustomDefinitions(inspectorSelectedNode.params);
                        const customKeys = customDefinitions.map((definition) => definition.enName);
                        const keys = customKeys.length > 0
                            ? customKeys
                            : eKeys.length > 0
                                ? eKeys
                                : Object.keys(inspectorSelectedNode.params).filter((key) => !key.startsWith("_") && key !== "is_container" && key !== ALLOW_RESIZE_TRANSFORM_PARAM);
                        return keys.map((key) => {
                            const value = key === "name" ? inspectorSelectedNode.name : eKeys.includes(key) ? getEParamValue(key, inspectorSelectedNode) : inspectorSelectedNode.params[key] ?? "";
                            const displayValue = formatDeviceModelParamDisplayValue(key, value);
                            const definition = customDefinitions.find((item) => item.enName === key);
                            return (<tr key={key}>
                                  {batchEditors.renderParamHeader(key, key, definition?.cnName ?? PARAM_LABELS[key] ?? key)}
                                  <td>
                                    {key === "name" ? (<BufferedTextInput value={inspectorSelectedNode.name} onCommit={(nextValue) => updateSelectedNode({ name: nextValue })}/>) : READONLY_E_PARAM_KEYS.has(key) || batchEditors.definitionMakesValueReadonly(definition) ? (<input value={displayValue} readOnly/>) : (batchEditors.renderParamEditor(key, displayValue, false, definition))}
                                  </td>
                                </tr>);
                        });
                    })()}
                        </tbody>
                      </table>)}
                  </>)}
              </div>) : (<div className="empty-state">
                <FileJson size={28}/>
                <p>选择画布设备后，可切换查看图形、模型和量测。</p>
              </div>)}
            {singleSelectedDeviceForInspector && inspectorSelectedNode && inspectorTab === "graph" && (<div className="topology-card">
                <span>连接度</span>
                <strong>{topology.nodes[inspectorSelectedNode.id]?.degree ?? 0}</strong>
                <small>
                  {(topology.nodes[inspectorSelectedNode.id]?.neighbors ?? [])
                .map((id) => nodeById.get(id)?.name)
                .filter(Boolean)
                .join("、") || "暂无相邻元件"}
                </small>
              </div>)}
          </div>) : inspectorSelectedEdge ? (<div className="form-stack">
            <div className="topology-card">
              <span>联络线</span>
              <strong>{inspectorSelectedEdge.id}</strong>
              <small>
                {(nodeById.get(inspectorSelectedEdge.sourceId)?.name ?? "未知设备") +
            " -> " +
            (nodeById.get(inspectorSelectedEdge.targetId)?.name ?? "未知设备")}
              </small>
            </div>
            <div className="empty-state">
              <Cable size={28}/>
              <p>拖拽线两端的圆形控制点到其他同类型端子，可调整联络线首端或末端。</p>
            </div>
          </div>) : (<div className="empty-state">
            <Save size={28}/>
            <p>从左侧拖入元件，或使用联络线模式点击两个元件建立拓扑关系。</p>
          </div>)}
      </aside>
      {contextMenu && (<div ref={contextMenuRef} className={contextMenuClassName(contextMenu)} data-canvas-context-menu="true" style={contextMenuStyle(contextMenu)}>
          {isEditMode && contextMenuFromElementTree && contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(deleteSelection)}>
              <Trash2 size={14}/>
              删除
            </button>)}
          {!contextMenuFromElementTree && (<>
              {isEditMode && contextMenuTarget === "blank" && contextMenu.canvasPoint && (<button onClick={() => runContextMenuAction(startContextMarqueeSelection)}>
                  <BoxSelect size={14}/>
                  框选
                </button>)}
              {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 0 && (<button onClick={() => runContextMenuAction(openFilterSelectionDialog)}>
                  <ScanSearch size={14}/>
                  过滤选择
                </button>)}
              {isEditMode && undoStack.length > 0 && (<button onClick={() => runContextMenuAction(undoLastOperation)}>
                  <Undo2 size={14}/>
                  撤销
                </button>)}
              {contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(copySelection)}>
                  <Copy size={14}/>
                  复制
                </button>)}
              {isEditMode && contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(cutSelection)}>
                  <Scissors size={14}/>
                  剪切
                </button>)}
              {isEditMode && saveRequired && (<button onClick={() => runContextMenuAction(() => { void saveCurrentProject(); })}>
                  <Save size={14}/>
                  保存
                </button>)}
              {isEditMode && (canvasClipboard.nodes.length > 0 || canvasClipboard.edges.length > 0) && (<button onClick={() => runContextMenuAction(pasteSelection)}>
                  <FileInput size={14}/>
                  粘贴
                </button>)}
              {isEditMode && nodes.length > 0 && (<div className="context-menu-submenu">
                  <button type="button" className="context-menu-submenu-trigger">
                    <Zap size={14}/>
                    电压基值
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button onClick={() => runContextMenuAction(openVoltageBaseSetDialog)}>
                      <Zap size={14}/>
                      设置电压基值
                    </button>
                    <button onClick={() => runContextMenuAction(openVoltageBaseClearDialog)}>
                      <ZapOff size={14}/>
                      清空电压基值
                    </button>
                  </div>
                </div>)}
              {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 1 && (<button onClick={() => runContextMenuAction(autoAlignCanvasGraphics)}>
                  <AlignCenterHorizontal size={14}/>
                  自动对齐
                </button>)}
              {isEditMode && contextMenuTarget === "blank" && activeLayerNodes.length > 1 && (<button onClick={() => runContextMenuAction(autoSpreadCanvasGraphics)}>
                  <ScanSearch size={14}/>
                  自动散开
                </button>)}
              {contextMenuForEdge && selectedEdge && (isEditMode ? (<button onClick={() => runContextMenuAction(tidySelectedEdgeRoute)}>
                  <Route size={14}/>
                  整理连接线
                </button>) : null)}
              {contextMenuForEdge && contextMenu.edgeId && (isEditMode ? (<button onClick={() => runContextMenuAction(addManualBendFromContextMenu)}>
                  <Pencil size={14}/>
                  添加拐点
                </button>) : null)}
              {contextMenuForRoutableLine && contextMenu.nodeId && contextMenu.canvasPoint && (isEditMode ? (<>
                  <button onClick={() => runContextMenuAction(() => tidyRoutableLineRoute(contextMenu.nodeId))}>
                    <Route size={14}/>
                    整理连接线
                  </button>
                  <button onClick={() => runContextMenuAction(addRoutableLineBendFromContextMenu)}>
                    <Pencil size={14}/>
                    添加拐点
                  </button>
                </>) : null)}
              {isEditMode && contextMenuTarget === "blank" && (<button onClick={() => runContextMenuAction(openConnectionRedrawDialog)}>
                  <Route size={14}/>
                  连接线重绘
                </button>)}
              {contextMenuForNode && canGroupSelectedGraphics && (isEditMode ? (<button onClick={() => runContextMenuAction(groupSelectedGraphics)}>
                  <Group size={14}/>
                  组合
                </button>) : null)}
              {contextMenuForNode && canUngroupSelectedGraphics && (isEditMode ? (<button onClick={() => runContextMenuAction(ungroupSelectedGraphics)}>
                  <Ungroup size={14}/>
                  解散
                </button>) : null)}
              {contextMenuForNode && canAddTemplateFromSelection && (isEditMode ? (<button onClick={() => runContextMenuAction(openAddTemplateDialog)}>
                  <Grid2X2 size={14}/>
                  添加到模板库
                </button>) : null)}
              {contextMenuForNode && canAddTemplateFromSelection && (isEditMode ? (<button onClick={() => runContextMenuAction(openGroupDeviceDefinitionDialog)}>
                  <Plus size={14}/>
                  定义为元件
                </button>) : null)}
              {isEditMode && contextMeasurementNode && !isStaticNode(contextMeasurementNode) && (<div className="context-menu-submenu">
                  <button type="button" className="context-menu-submenu-trigger">
                    <CircleDot size={14}/>
                    量测显示
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button disabled={Boolean(contextMeasurementGroup)} onClick={() => runContextMenuAction(() => addDefaultMeasurementsToNode(contextMeasurementNode))}>
                      <Plus size={14}/>
                      添加量测
                    </button>
                    <button disabled={!contextMeasurementGroup} onClick={() => runContextMenuAction(() => openMeasurementEditorForNode(contextMeasurementNode))}>
                      <Pencil size={14}/>
                      修改量测
                    </button>
                    <button disabled={!contextMeasurementGroup} onClick={() => runContextMenuAction(() => removeMeasurementsFromNode(contextMeasurementNode))}>
                      <Trash2 size={14}/>
                      删除量测
                    </button>
                  </div>
                </div>)}
              {contextMenuForNode && activeSelectedNodeIds.length > 0 && (isEditMode ? (<button onClick={() => runContextMenuAction(openLayerAssignmentDialog)}>
                  <Layers size={14}/>
                  图层修改
                </button>) : null)}
              {contextMenuForNode && activeSelectedNodeIds.length > 0 && (isEditMode ? (<div className="context-menu-submenu">
                  <button type="button" className="context-menu-submenu-trigger">
                    <Layers2 size={14}/>
                    显示层级
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("raise"))}>
                      <ArrowUp size={14}/>
                      提升显示层级
                    </button>
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("lower"))}>
                      <ArrowDown size={14}/>
                      降低显示层级
                    </button>
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("front"))}>
                      <ChevronsUp size={14}/>
                      顶层显示
                    </button>
                    <button onClick={() => runContextMenuAction(() => adjustSelectedDisplayLayer("back"))}>
                      <ChevronsDown size={14}/>
                      底层显示
                    </button>
                  </div>
                </div>) : null)}
              {contextMenuForNode && activeSelectedNodeIds.length > 0 && (isEditMode ? (<div className="context-menu-submenu">
                  <button type="button" className="context-menu-submenu-trigger">
                    <Type size={14}/>
                    标识显示
                    <ChevronRight size={14}/>
                  </button>
                  <div className="context-menu-submenu-panel">
                    <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("always"))}>
                      <Type size={14}/>
                      标识始终显示
                    </button>
                    <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("hidden"))}>
                      <Type size={14}/>
                      标识始终隐藏
                    </button>
                    <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("follow"))}>
                      <Type size={14}/>
                      标识跟随显示
                    </button>
                  </div>
                </div>) : null)}
              {isEditMode && contextMenuForSelection && contextSelectionCount > 0 && (<button onClick={() => runContextMenuAction(deleteSelection)}>
                  <Trash2 size={14}/>
                  删除
                </button>)}
            </>)}
        </div>)}
      {projectMenu && (<div ref={contextMenuRef} className={contextMenuClassName(projectMenu)} style={contextMenuStyle(projectMenu)}>
          {projectMenu.projectId && (<>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const project = projectById.get(projectMenu.projectId ?? "");
                    if (project)
                        deleteProjectRecord(project);
                })}>
                <Trash2 size={14}/>
                模型删除
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const project = projectById.get(projectMenu.projectId ?? "");
                if (project)
                    void exportProjectRecordFile(project);
            })}>
                <Download size={14}/>
                模型导出
              </button>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const project = projectById.get(projectMenu.projectId ?? "");
                    if (project)
                        renameProjectRecord(project);
                })}>
                <Pencil size={14}/>
                模型重命名
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const project = projectById.get(projectMenu.projectId ?? "");
                if (project)
                    copyProjectRecord(project);
            })}>
                <Copy size={14}/>
                模型复制
              </button>
              {recordClipboard?.kind === "project" && projectMenu.projectId && (isEditMode ? (<button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14}/>
                  模型粘贴
                </button>) : null)}
            </>)}
          {!projectMenu.projectId && projectMenu.schemeId && (<>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => createSchemeRecord(projectMenu.schemeId ?? ""))}>
                <FolderOpen size={14}/>
                方案新增
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                    if (scheme)
                        deleteSchemeRecord(scheme);
                })}>
                <Trash2 size={14}/>
                方案删除
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                if (scheme)
                    void exportSchemeRecord(scheme);
            })}>
                <Download size={14}/>
                方案导出
              </button>
              {isEditMode && (<button onClick={() => runContextMenuAction(() => openSchemeImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14}/>
                方案导入
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => {
                    const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                    if (scheme)
                        renameSchemeRecord(scheme);
                })}>
                <Pencil size={14}/>
                方案重命名
              </button>)}
              <button onClick={() => runContextMenuAction(() => {
                const scheme = findSavedSchemeById(schemes, projectMenu.schemeId ?? "");
                if (scheme)
                    copySchemeRecord(scheme);
            })}>
                <Copy size={14}/>
                方案复制
              </button>
              {recordClipboard?.kind === "scheme" && (isEditMode ? (<button onClick={() => runContextMenuAction(() => pasteSchemeClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14}/>
                  方案粘贴
                </button>) : null)}
              {isEditMode && <div className="context-menu-separator" role="separator" aria-label="方案操作和模型操作分隔"/>}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => createBlankProject(projectMenu.schemeId ?? ""))}>
                <Plus size={14}/>
                模型新建
              </button>)}
              {isEditMode && (<button onClick={() => runContextMenuAction(() => openModelImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14}/>
                模型导入
              </button>)}
              {recordClipboard?.kind === "project" && projectMenu.schemeId && (isEditMode ? (<button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId ?? ""))}>
                  <FileInput size={14}/>
                  模型粘贴
                </button>) : null)}
            </>)}
          {!projectMenu.projectId && !projectMenu.schemeId && (<>
              {isEditMode && (<button onClick={() => runContextMenuAction(createSchemeRecord)}>
                <FolderOpen size={14}/>
                方案新增
              </button>)}
              {recordClipboard?.kind === "scheme" && (isEditMode ? (<button onClick={() => runContextMenuAction(pasteSchemeClipboardRecord)}>
                  <FileInput size={14}/>
                  方案粘贴
                </button>) : null)}
              {isEditMode && (<button onClick={() => runContextMenuAction(openSchemeImportFilePicker)}>
                <FileInput size={14}/>
                方案导入
              </button>)}
            </>)}
        </div>)}
      {renderMeasurementConfigDialog()}
      {renderMeasurementEditorDialog()}
      {pendingRecordPasteConflict && (<div className="image-picker-backdrop" onPointerDown={() => resolveRecordPasteConflict("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="record-paste-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="record-paste-conflict-title">名称重复</h2>
                <p>
                  当前{pendingRecordPasteConflict.kind === "scheme" ? "模型库" : pendingRecordPasteConflict.kind === "scheme-drag" ? "目标方案" : "方案"}中已存在“{pendingRecordPasteConflict.duplicateName}”。请选择{pendingRecordPasteConflict.kind === "project-drag" || pendingRecordPasteConflict.kind === "scheme-drag" ? "拖拽" : "粘贴"}处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveRecordPasteConflict("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("rename")}>新命名</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("cancel")}>{pendingRecordPasteConflict.kind === "project-drag" || pendingRecordPasteConflict.kind === "scheme-drag" ? "取消拖拽" : "取消粘贴"}</button>
            </div>
          </section>
        </div>)}
      {pendingModelImportConflict && (<div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateModelImport("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="model-import-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="model-import-conflict-title">模型名称重复</h2>
                <p>
                  当前方案中已存在模型“{pendingModelImportConflict.duplicateProjectName}”。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateModelImport("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("rename")}>重命名</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>)}
      {pendingSchemeImportConflict && (<div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateSchemeImport("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="scheme-import-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="scheme-import-conflict-title">方案名称重复</h2>
                <p>
                  当前模型库中已存在方案“{pendingSchemeImportConflict.duplicateSchemeName}”。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateSchemeImport("merge")}>合并覆盖</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("rename")}>重新命名</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>)}
      {pendingUnsavedAction && (<div className="image-picker-backdrop" onPointerDown={() => resolveUnsavedChangeAction("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unsaved-change-title">
            <div className="image-picker-title">
              <div>
                <h2 id="unsaved-change-title">当前模型尚未保存</h2>
                <p>当前模型“{projectName}”存在未保存修改。{pendingUnsavedAction.label}之前，请选择如何处理这些修改。</p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveUnsavedChangeAction("discard")}>
                {pendingUnsavedAction.kind === "enter-browse" ? "不保存直接浏览" : "不保存继续切换/关闭"}
              </button>
              <button type="button" onClick={() => resolveUnsavedChangeAction("save")}>
                {pendingUnsavedAction.kind === "enter-browse" ? "保存后浏览" : "保存后切换/关闭"}
              </button>
              <button type="button" onClick={() => resolveUnsavedChangeAction("cancel")}>退出操作</button>
            </div>
            <p className="unsaved-change-note">关闭网页时，浏览器也会在离开前提示当前模型未保存。</p>
          </section>
        </div>)}
      {voltageBaseSetDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setVoltageBaseSetDialogOpen(false)}>
          <section className="connection-redraw-dialog voltage-base-set-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="voltage-base-set-title">
            <div className="image-picker-title">
              <div>
                <h2 id="voltage-base-set-title">设置电压基值</h2>
                <p>将指定范围内设备端子和电压相关参数中的 vbase、v_base、v_set 等值设为输入值；多端设备可按端子分别设置。</p>
              </div>
              <button type="button" onClick={() => setVoltageBaseSetDialogOpen(false)}>关闭</button>
            </div>
            <label className="voltage-base-set-value-row">
              <span>设置方式</span>
              <strong>{voltageBaseSetModeLabel}</strong>
            </label>
            {(voltageBaseSetMode === "uniform" || voltageBaseSetMode === "byDevice") && voltageBaseSetHasUniformTargets && (<label className="voltage-base-set-value-row">
                <span>{voltageBaseSetMode === "byDevice" ? "普通设备电压基值" : "电压基值"}</span>
                <BufferedTextInput type="text" value={voltageBaseSetValue} onCommit={setVoltageBaseSetValue} list="voltage-base-set-options" placeholder="例如 110" autoFocus/>
              </label>)}
            {(voltageBaseSetMode === "terminal" || voltageBaseSetMode === "byDevice") && voltageBaseSetTerminalRows.length > 0 && (<div className="voltage-base-terminal-grid" aria-label="按端子设置电压基值">
                <label className="voltage-base-set-value-row">
                  <span>端子</span>
                  <select value={activeVoltageBaseTerminalKey} onChange={(event) => setActiveVoltageBaseTerminalKey(event.target.value)}>
                    {voltageBaseSetTerminalRows.map((row) => (<option key={voltageBaseTerminalRowKey(row)} value={voltageBaseTerminalRowKey(row)}>
                        {row.nodeName} / {row.terminalLabel} / {row.terminalType}
                      </option>))}
                  </select>
                </label>
                {activeVoltageBaseTerminalRow && (<label className="voltage-base-set-value-row">
                    <span>端子电压基值</span>
                    <BufferedTextInput type="text" value={activeVoltageBaseTerminalRow.value} onCommit={(nextValue) => setVoltageBaseTerminalValue(activeVoltageBaseTerminalRow.nodeId, activeVoltageBaseTerminalRow.terminalId, nextValue)} list="voltage-base-set-options" placeholder="例如 110" autoFocus={voltageBaseSetMode === "terminal"}/>
                  </label>)}
              </div>)}
            <datalist id="voltage-base-set-options">
              {voltageBaseSetOptions.map((value) => (<option key={value} value={value}/>))}
            </datalist>
            <div className="connection-redraw-options voltage-base-set-options" role="radiogroup" aria-label="设置电压基值范围">
              {VOLTAGE_BASE_SET_SCOPES.map((scope) => {
            const result = voltageBaseSetResultForScope(scope);
            const count = result.changedNodeIds.length;
            const disabled = count === 0 || !voltageBaseSetReady();
            return (<button key={scope} type="button" className={voltageBaseSetScope === scope ? "active" : ""} role="radio" aria-checked={voltageBaseSetScope === scope} onClick={() => setVoltageBaseSetScope(scope)} disabled={disabled}>
                    <span>{VOLTAGE_BASE_SET_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>);
        })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setVoltageBaseSetDialogOpen(false)}>退出</button>
              <button type="button" onClick={confirmVoltageBaseSetDialog} disabled={!voltageBaseSetReady() || voltageBaseSetResultForScope(voltageBaseSetScope).changedNodeIds.length === 0}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {voltageBaseClearDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setVoltageBaseClearDialogOpen(false)}>
          <section className="connection-redraw-dialog voltage-base-clear-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="voltage-base-clear-title">
            <div className="image-picker-title">
              <div>
                <h2 id="voltage-base-clear-title">清空电压基值</h2>
                <p>将指定范围内设备端子和电压相关参数中的 vbase、v_base、v_set 等值统一设为 0.0。</p>
              </div>
              <button type="button" onClick={() => setVoltageBaseClearDialogOpen(false)}>关闭</button>
            </div>
            <div className="connection-redraw-options voltage-base-clear-options" role="radiogroup" aria-label="清空电压基值范围">
              {VOLTAGE_BASE_CLEAR_SCOPES.map((scope) => {
            const result = voltageBaseClearResultForScope(scope);
            const count = result.changedNodeIds.length;
            const disabled = count === 0;
            return (<button key={scope} type="button" className={voltageBaseClearScope === scope ? "active" : ""} role="radio" aria-checked={voltageBaseClearScope === scope} onClick={() => setVoltageBaseClearScope(scope)} disabled={disabled}>
                    <span>{VOLTAGE_BASE_CLEAR_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>);
        })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setVoltageBaseClearDialogOpen(false)}>取消</button>
              <button type="button" onClick={confirmVoltageBaseClearDialog} disabled={voltageBaseClearResultForScope(voltageBaseClearScope).changedNodeIds.length === 0}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {connectionRedrawDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setConnectionRedrawDialogOpen(false)}>
          <section className="connection-redraw-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="connection-redraw-title">
            <div className="image-picker-title">
              <div>
                <h2 id="connection-redraw-title">连接线重绘</h2>
                <p>清除指定连接线的旧路径几何，并按当前端子、母线落点和避障规则重新生成。</p>
              </div>
              <button type="button" onClick={() => setConnectionRedrawDialogOpen(false)}>关闭</button>
            </div>
            <div className="connection-redraw-options" role="radiogroup" aria-label="连接线重绘范围">
              {(["selected", "viewport", "all"] as const).map((scope) => {
            const count = connectionRedrawTargetsForScope(scope).total;
            const disabled = count === 0;
            return (<button key={scope} type="button" className={connectionRedrawScope === scope ? "active" : ""} role="radio" aria-checked={connectionRedrawScope === scope} onClick={() => setConnectionRedrawScope(scope)} disabled={disabled}>
                    <span>{CONNECTION_REDRAW_SCOPE_LABELS[scope]}</span>
                    <strong>{count}</strong>
                  </button>);
        })}
            </div>
            <div className="image-picker-actions connection-redraw-actions">
              <button type="button" onClick={() => setConnectionRedrawDialogOpen(false)}>取消</button>
              <button type="button" onClick={confirmConnectionRedrawDialog} disabled={connectionRedrawTargetsForScope(connectionRedrawScope).total === 0}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {groupDeviceDefinitionDialog && (<div className="image-picker-backdrop" onPointerDown={() => setGroupDeviceDefinitionDialog(null)}>
          <section className="group-device-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="group-device-dialog-title">
            <div className="image-picker-title">
              <div>
                <h2 id="group-device-dialog-title">定义为元件</h2>
                <p>把当前图元组合生成新元件图标，或替换已有元件的图标。</p>
              </div>
              <button type="button" onClick={() => setGroupDeviceDefinitionDialog(null)}>关闭</button>
            </div>
            <div className="group-device-dialog-grid">
              <div className="template-dialog-preview group-device-preview">
                <img src={groupDeviceDefinitionDialog.iconImage} alt="图元组合生成的元件图标预览"/>
                <small>组合尺寸：{groupDeviceDefinitionDialog.sourceSize.width}×{groupDeviceDefinitionDialog.sourceSize.height}</small>
              </div>
              <div className="template-dialog-fields group-device-fields">
                <div className="group-device-mode-options" role="radiogroup" aria-label="定义方式">
                  {([
            ["new", "新建元件"],
            ["replace", "修改已有元件图标"]
        ] as const).map(([modeValue, label]) => (<button key={modeValue} type="button" className={groupDeviceDefinitionDialog.mode === modeValue ? "active" : ""} role="radio" aria-checked={groupDeviceDefinitionDialog.mode === modeValue} onClick={() => setGroupDeviceDefinitionDialog((current) => current ? { ...current, mode: modeValue } : current)}>
                      {label}
                    </button>))}
                </div>
                {groupDeviceDefinitionDialog.mode === "new" ? (<>
                    <label>
                      <span>属性库</span>
                      <select value={groupDeviceDefinitionDialog.attributeLibraryName} onChange={(event) => {
                const attributeLibraryName = normalizeAttributeLibraryName(event.target.value);
                setGroupDeviceDefinitionDialog((current) => current ? {
                    ...current,
                    attributeLibraryName,
                    componentType: defaultComponentTypeForAttributeLibrary(attributeLibraryName)
                } : current);
            }}>
                        {selectableAttributeLibraries.map((group) => (<option key={group} value={group}>{group}</option>))}
                      </select>
                    </label>
                    <label>
                      <span>选择元件类型</span>
                      <select value={groupDeviceDefinitionDialog.componentType} onChange={(event) => setGroupDeviceDefinitionDialog((current) => current ? { ...current, componentType: event.target.value } : current)}>
                        {Array.from(new Set([
                groupDeviceDefinitionDialog.componentType,
                ...(componentTypeOptionsByAttributeLibrary[groupDeviceDefinitionDialog.attributeLibraryName] ?? [])
            ].filter(Boolean))).map((section) => (<option key={section} value={section}>{section}</option>))}
                      </select>
                    </label>
                  </>) : (<label>
                    <span>已有元件</span>
                    <select value={groupDeviceDefinitionDialog.targetKind} disabled={groupDeviceReplacementTemplates.length === 0} onChange={(event) => setGroupDeviceDefinitionDialog((current) => current ? { ...current, targetKind: event.target.value } : current)}>
                      {groupDeviceReplacementTemplates.length === 0 ? (<option value="">暂无元件</option>) : groupDeviceReplacementTemplates.map((template) => (<option key={template.kind} value={template.kind}>
                          {template.label} / {resolveTemplateComponentType(template)}
                        </option>))}
                    </select>
                  </label>)}
                <div className="group-device-terminal-summary">
                  <strong>对外端子</strong>
                  <span>{groupDeviceDefinitionDialog.terminals.length} 个</span>
                </div>
                <div className="group-device-terminal-list">
                  {groupDeviceDefinitionDialog.terminals.length > 0 ? groupDeviceDefinitionDialog.terminals.map((terminal, index) => (<div key={terminal.id} className="group-device-terminal-row">
                      <span>{index + 1}</span>
                      <strong>{terminal.label}</strong>
                      <em>{TERMINAL_TYPE_LIBRARY_LABELS[terminal.type] ?? terminal.type}</em>
                    </div>)) : (<p>未识别到对外端子，新元件会按 0 端子创建。</p>)}
                </div>
              </div>
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={() => setGroupDeviceDefinitionDialog(null)}>取消</button>
              <button type="button" onClick={groupDeviceDefinitionDialog.mode === "new" ? confirmCreateDeviceFromGroup : confirmReplaceDeviceIconFromGroup}>
                确定
              </button>
            </div>
          </section>
        </div>)}
      {templateDialog && (<div className="image-picker-backdrop" onPointerDown={cancelTemplateDialog}>
          <section className="template-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
            <div className="image-picker-title">
              <div>
                <h2 id="template-dialog-title">添加模板</h2>
                <p>将当前选中的图元组合保存到模板库，后续可按原始尺寸拖拽生成。</p>
              </div>
              <button type="button" onClick={cancelTemplateDialog}>关闭</button>
            </div>
            <div className="template-dialog-grid">
              <div className="template-dialog-preview">
                {renderGraphTemplatePreview({
            id: "template-dialog-preview",
            typeName: templateDraftType,
            name: templateDraftName || "新模板",
            sourceSize: templateDialog.sourceSize,
            clipboard: templateDialog.clipboard,
            createdAt: "",
            updatedAt: ""
        })}
                <small>真实尺寸：{templateDialog.sourceSize.width}×{templateDialog.sourceSize.height}</small>
              </div>
              <div className="template-dialog-fields">
                <label>
                  <span>模板类型</span>
                  <div className="template-type-row">
                    <select value={templateDraftType} onChange={(event) => setTemplateDraftType(event.target.value)}>
                      {graphTemplateTypes.map((typeName) => (<option key={typeName} value={typeName}>{typeName}</option>))}
                    </select>
                    <button type="button" onClick={createGraphTemplateType}>新增模板类型</button>
                  </div>
                </label>
                <label>
                  <span>模板名字</span>
                  <BufferedTextInput value={templateDraftName} onCommit={setTemplateDraftName} placeholder="请输入模板名字" autoFocus/>
                </label>
              </div>
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={cancelTemplateDialog}>取消</button>
              <button type="button" onClick={confirmAddGraphTemplate}>确认</button>
            </div>
          </section>
        </div>)}
      {layerAssignmentDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setLayerAssignmentDialogOpen(false)}>
          <section className="layer-assignment-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layer-assignment-title">
            <div className="image-picker-title">
              <div>
                <h2 id="layer-assignment-title">图层修改</h2>
                <p>当前选中 {activeSelectedNodeIds.length} 个图元。选择目标图层后，确认应用到这些图元。</p>
              </div>
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>关闭</button>
            </div>
            <label className="layer-assignment-field">
              <span>目标图层</span>
              <select value={layerAssignmentTargetId} onChange={(event) => setLayerAssignmentTargetId(event.target.value)}>
                {layers.map((layer) => (<option key={layer.id} value={layer.id}>
                    {layer.visible ? layer.name : `${layer.name}（隐藏）`}
                  </option>))}
              </select>
            </label>
            <p className="layer-assignment-note">如果目标图层处于隐藏状态，应用后这些图元会按图层显示规则从画布上隐藏。</p>
            <div className="image-picker-actions layer-assignment-actions">
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>取消</button>
              <button type="button" onClick={applyLayerAssignmentDialog} disabled={activeSelectedNodeIds.length === 0 || !layers.some((layer) => layer.id === layerAssignmentTargetId) || layerAssignmentUnchanged}>
                应用
              </button>
            </div>
          </section>
        </div>)}
      {filterSelectionDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setFilterSelectionDialogOpen(false)}>
          <section className="filter-selection-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="filter-selection-title">
            <div className="image-picker-title">
              <div>
                <h2 id="filter-selection-title">过滤选择</h2>
                <p>元件类型列表：{filterSelectionTypeOptions.length} 类，已选择 {filterSelectionTypeKeys.length} 种。</p>
              </div>
              <button type="button" onClick={() => setFilterSelectionDialogOpen(false)}>关闭</button>
            </div>
            <div className="filter-selection-toolbar">
              <button type="button" onClick={() => setFilterSelectionTypeKeys(filterSelectionTypeOptions.flatMap((option) => option.items.map((item) => item.itemKey)))}>全选</button>
              <button type="button" onClick={() => setFilterSelectionTypeKeys([])}>清空</button>
            </div>
            <div className="filter-selection-list" role="group" aria-label="元件类型列表">
              {filterSelectionTypeOptions.map((option) => (<div key={option.typeKey} className="filter-selection-option">
                  <label className="filter-selection-type-row">
                    <input type="checkbox" ref={(input) => {
                if (input) {
                    input.indeterminate = filterSelectionTypePartial(option);
                }
            }} checked={filterSelectionTypeSelected(option)} onChange={() => toggleFilterSelectionType(option.typeKey)}/>
                    <span>
                      <strong>{filterSelectionTreeLabel(option.label, option.typeKey)}</strong>
                    </span>
                    <em>{option.count}</em>
                  </label>
                  <div className="filter-selection-tree" aria-label={`${option.label}元件类型树`}>
                    <div className="filter-selection-tree-children">
                      {option.items.map((item) => (<div key={item.itemKey} className="filter-selection-tree-child" title={filterSelectionTreeLabel(item.label, item.typeKey)}>
                          <label className="filter-selection-kind-row">
                            <input type="checkbox" checked={filterSelectionTypeKeys.includes(item.itemKey)} onChange={() => toggleFilterSelectionItem(item.itemKey)}/>
                            <span>
                              <strong>{filterSelectionTreeLabel(item.label, item.typeKey)}</strong>
                            </span>
                            <em>{item.count}</em>
                          </label>
                        </div>))}
                    </div>
                  </div>
                </div>))}
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={() => setFilterSelectionDialogOpen(false)}>取消</button>
              <button type="button" disabled={filterSelectionTypeKeys.length === 0} onClick={confirmFilterSelectionDialog}>确认选择</button>
            </div>
          </section>
        </div>)}
      {ENABLE_REACT_FLOW_PREVIEW && ReactFlowPreview && reactFlowPreviewOpen && (<div className="image-picker-backdrop react-flow-preview-backdrop" onPointerDown={() => setReactFlowPreviewOpen(false)}>
          <section className="react-flow-preview-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="react-flow-preview-title">
            <div className="image-picker-title">
              <div>
                <h2 id="react-flow-preview-title">React Flow 预览</h2>
                <p>开发态验证入口：仅展示当前可见模型，主画布、拓扑、布线和导出逻辑保持不变。</p>
              </div>
              <button type="button" onClick={() => setReactFlowPreviewOpen(false)}>关闭</button>
            </div>
            <div className="react-flow-preview-stage">
              <Suspense fallback={<div className="react-flow-preview-loading">正在加载 React Flow 预览...</div>}>
                <ReactFlowPreview nodes={visibleNodes} edges={visibleEdges}/>
              </Suspense>
            </div>
          </section>
        </div>)}
      {colorPaletteDialogOpen && (<div className="image-picker-backdrop" onPointerDown={() => setColorPaletteDialogOpen(false)}>
          <section className="color-palette-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>配色设置</h2>
                <p>配置能流类型和电压等级颜色，保存后用于图元、端子、联络线和导出图形。</p>
              </div>
              <button onClick={() => setColorPaletteDialogOpen(false)}>关闭</button>
            </div>
            <div className="color-palette-tabs" role="tablist" aria-label="配色方式">
              <button className={colorPaletteTab === "energy" ? "active" : ""} onClick={() => {
            setColorPaletteTab("energy");
            toggleColorDisplayMode("energy");
        }} type="button">
                按能流类型
              </button>
              <button className={colorPaletteTab === "voltage" ? "active" : ""} onClick={() => {
            setColorPaletteTab("voltage");
            toggleColorDisplayMode("voltage");
        }} type="button">
                按电压等级
              </button>
            </div>
            {colorPaletteTab === "energy" ? (<div className="color-palette-table" aria-label="能流类型配色">
                {ENERGY_COLOR_ROWS.map((row) => {
                const color = colorPaletteDraft.energy[row.type] ?? DEFAULT_COLOR_PALETTE.energy[row.type];
                return (<label className="color-palette-row" key={row.type}>
                      <span>{row.label}</span>
                      <DeferredColorInput value={color} fallback={DEFAULT_COLOR_PALETTE.energy[row.type]} onCommit={(value) => updateEnergyColor(row.type, value)} aria-label={`${row.label}颜色`}/>
                      <BufferedTextInput value={color} onCommit={(nextValue) => updateEnergyColor(row.type, nextValue)} aria-label={`${row.label}颜色值`}/>
                    </label>);
            })}
              </div>) : (<div className="voltage-color-panel">
                <div className="voltage-color-toolbar" role="group" aria-label="电压等级显示范围">
                  <button type="button" className={voltageColorVisibility === "all" ? "active" : ""} onClick={() => setVoltageColorVisibility("all")}>
                    全部电压等级
                  </button>
                  <button type="button" className={voltageColorVisibility === "current" ? "active" : ""} onClick={() => setVoltageColorVisibility("current")}>
                    当前模型电压等级
                  </button>
                  <span>{`当前模型 ${currentModelVoltageColorKeys.size} 项`}</span>
                </div>
                <div className="voltage-color-header">
                  <span>AC/DC</span>
                  <span>电压基值</span>
                  <span>颜色</span>
                  <span>操作</span>
                </div>
                <div className="voltage-color-list">
                  {visibleVoltageColorRows.length > 0 ? (visibleVoltageColorRows.map((row) => (<div className="voltage-color-row" key={row.key}>
                        <select value={row.type} onChange={(event) => updateVoltageColorRow(row.key, { type: event.target.value as "ac" | "dc" })} aria-label="AC/DC">
                          {ELECTRIC_COLOR_TYPES.map((type) => (<option key={type} value={type}>{ELECTRIC_COLOR_TYPE_LABELS[type]}</option>))}
                        </select>
                        <BufferedTextInput value={row.voltage} onCommit={(nextValue) => updateVoltageColorRow(row.key, { voltage: nextValue })} aria-label="电压基值"/>
                        <div className="color-field">
                          <DeferredColorInput value={row.color} fallback="#64748b" onCommit={(value) => updateVoltageColorRow(row.key, { color: value })} aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色`}/>
                          <BufferedTextInput value={row.color} onCommit={(nextValue) => updateVoltageColorRow(row.key, { color: nextValue })} aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色值`}/>
                        </div>
                        <button type="button" onClick={() => deleteVoltageColorRow(row.key)}>删除</button>
                      </div>))) : (<div className="voltage-color-empty">当前模型暂无交流/直流电压等级。</div>)}
                </div>
                {voltageColorVisibility === "all" && (<button type="button" className="secondary-action" onClick={addVoltageColorRow}>新增电压等级</button>)}
              </div>)}
            <div className="image-picker-actions color-palette-actions">
              <button type="button" onClick={colorPaletteTab === "energy" ? resetEnergyColors : resetVoltageColors}>
                {colorPaletteTab === "energy" ? "恢复默认能流配色" : "恢复默认电压配色"}
              </button>
              <button type="button" onClick={saveColorPalette}>保存</button>
            </div>
          </section>
        </div>)}
      {deviceDefinitionDialogOpen && (<div className="image-picker-backdrop" onPointerDown={closeDeviceDefinitionDialog}>
          <section ref={deviceDefinitionDialogRef} className={`device-definition-dialog${deviceLibraryDialogLayouts.definition ? " floating" : ""}`} style={deviceLibraryDialogStyle("definition")} onPointerDown={stopDeviceLibraryDialogEvent} onPointerUp={stopDeviceLibraryDialogEvent} onPointerCancel={stopDeviceLibraryDialogEvent} onLostPointerCapture={stopDeviceLibraryDialogEvent} onClick={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("definition", event)}>
                <h2>修改元件</h2>
                <p>查看内置和自定义元件定义，维护新建图元时使用的设备属性。</p>
              </div>
              <button onClick={closeDeviceDefinitionDialog}>关闭</button>
            </div>
            <div className="device-definition-layout">
              <aside className="device-definition-list" aria-label="元件定义列表">
                <div className="dialog-tree-search">
                  <Search size={14} aria-hidden="true"/>
                  <input value={deviceDefinitionSearchQuery} onChange={(event) => setDeviceDefinitionSearchQuery(event.target.value)} placeholder="搜索属性库/元件类型/元件" aria-label="搜索元件定义"/>
                  {deviceDefinitionSearchQuery && (<button type="button" aria-label="清空元件定义搜索" title="清空" onClick={() => setDeviceDefinitionSearchQuery("")}>
                      <X size={13}/>
                    </button>)}
                </div>
                <div className="device-definition-tree-scroll dialog-compact-tree" role="tree">
                  {displayedDeviceDefinitionLibraries.length > 0 ? displayedDeviceDefinitionLibraries.map((group) => {
            const typeGroups = filteredDeviceDefinitionByComponentType[group] ?? [];
            const expanded = deviceDefinitionSearchNeedle ? true : expandedDefinitionGroups.includes(group);
            return (<section className="device-definition-group" key={group}>
                        <button type="button" className="device-definition-group-toggle" role="treeitem" aria-expanded={expanded} onClick={() => toggleDefinitionGroup(group)}>
                          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          <span>{group}</span>
                          <strong>{typeGroups.reduce((sum, typeGroup) => sum + typeGroup.templates.length, 0)}</strong>
                        </button>
                        {expanded && (<div className="component-definition-type-list" role="group" aria-label={`${group}元件类型列表`}>
                            {typeGroups.map((typeGroup) => {
                        const typeKey = attributeLibraryComponentTypeKey(group, typeGroup.section);
                        const typeCollapsed = deviceDefinitionSearchNeedle ? false : collapsedDefinitionComponentTypes.includes(typeKey);
                        const typeDisplay = componentTypeDisplayParts(typeGroup.section);
                        return (<section className="component-definition-type-group" key={`${group}-${typeGroup.section}`}>
                                  <button type="button" className={`component-definition-type-header ${typeCollapsed ? "" : "active"}`} role="treeitem" aria-expanded={!typeCollapsed} onClick={() => toggleDefinitionComponentType(group, typeGroup.section)}>
                                    {typeCollapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
                                    <span className="dialog-tree-bilingual" title={typeDisplay.title}>
                                      <span>{typeDisplay.chinese}</span>
                                      <small>{typeDisplay.english}</small>
                                    </span>
                                    <strong>{typeGroup.templates.length}</strong>
                                  </button>
                                  {!typeCollapsed && <div className="device-definition-items" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                                    {typeGroup.templates.map((template) => (<button type="button" key={template.kind} className={`device-definition-item ${selectedDefinitionTemplate?.kind === template.kind ? "active" : ""}`} role="treeitem" aria-selected={selectedDefinitionTemplate?.kind === template.kind} onClick={() => loadDefinitionTemplateDraft(template)}>
                                        <span className="dialog-tree-bilingual dialog-tree-component-label" title={`${template.label} / ${template.kind}`}>
                                          <span>{template.label}</span>
                                          <small>{template.kind}</small>
                                        </span>
                                      </button>))}
                                  </div>}
                                </section>);
                    })}
                          </div>)}
                      </section>);
        }) : (<div className="dialog-tree-empty">未找到匹配元件</div>)}
                </div>
              </aside>
              <section className="device-definition-detail">
                {selectedDefinitionTemplate ? (<>
                    <div className="device-definition-summary">
                      <div>
                        <span>属性库</span>
                        <strong>{normalizeAttributeLibraryName(selectedDefinitionTemplate.attributeLibrary)}</strong>
                      </div>
                      <div>
                        <span>元件类型</span>
                        {definitionDraftSectionEditing ? (<select className={sourceSelectClassName(isBuiltInComponentType(definitionDraftSection))} value={definitionDraftSection} autoFocus onBlur={() => setDefinitionDraftSectionEditing(false)} onChange={(event) => {
                    setDefinitionDraftSection(event.target.value);
                    setDefinitionDraftError("");
                    setDefinitionDraftSectionEditing(false);
                }}>
                            {definitionAttributeLibraryComponentTypeOptions.map((section) => (<option key={section} value={section} className={componentTypeOptionClass(section)} title={isBuiltInComponentType(section) ? "系统内置元件类型，无法删除" : "用户自定义元件类型，可以删除"}>
                                {section}
                              </option>))}
                          </select>) : (<button type="button" className={`device-definition-summary-value ${isBuiltInComponentType(definitionDraftSection) ? "builtin-source" : "custom-source"}`} title="点击选择元件类型" onClick={() => setDefinitionDraftSectionEditing(true)}>
                            {definitionDraftSection}
                          </button>)}
                      </div>
                      <div>
                        <span>元件名称</span>
                        <strong>{selectedDefinitionTemplate.label}</strong>
                      </div>
                      <div>
                        <span>图元类型</span>
                        <strong>{selectedDefinitionTemplate.kind}</strong>
                      </div>
                      <div>
                        <span>来源</span>
                        <strong>{selectedDefinitionTemplate.custom ? "自定义" : "内置"}</strong>
                      </div>
                      <div>
                        <span>端子数量</span>
                        <strong>{selectedDefinitionTemplate.terminalCount}</strong>
                      </div>
                      <div>
                        <span>是否容器</span>
                        <strong>{selectedDefinitionTemplate.isContainer ? "是" : "否"}</strong>
                      </div>
                      <div>
                        <span>是否允许变形</span>
                        <select className="device-definition-summary-value" value={templateResizeTransformValue(selectedDefinitionTemplate)} onChange={(event) => updateSelectedDefinitionResizePermission(event.target.value)}>
                          <option value="0">否</option>
                          <option value="1">是</option>
                        </select>
                      </div>
                      <div>
                        <span>能源属性</span>
                        <strong>
                          {(selectedDefinitionTemplate.terminalTypes ?? Array.from({ length: selectedDefinitionTemplate.terminalCount }, () => selectedDefinitionTemplate.terminalType))
                .map((type) => TERMINAL_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type)
                .join(" / ") || "无端子"}
                        </strong>
                      </div>
                    </div>
                    <div className="device-definition-tabs" role="tablist" aria-label="元件修改内容切换">
                      <button type="button" className={deviceDefinitionView === "visual" ? "active" : ""} onClick={() => setDeviceDefinitionView("visual")}>
                        端子定义
                      </button>
                      <button type="button" className={deviceDefinitionView === "parameters" ? "active" : ""} onClick={() => setDeviceDefinitionView("parameters")}>
                        参数定义
                      </button>
                      <button type="button" className={deviceDefinitionView === "measurements" ? "active" : ""} onClick={() => setDeviceDefinitionView("measurements")}>
                        量测定义
                      </button>
                    </div>
                    {deviceDefinitionView === "visual" ? (renderDeviceDefinitionVisualPanel(selectedDefinitionTemplate)) : deviceDefinitionView === "parameters" ? (<>
                        {selectedDefinitionTemplate.isContainer && selectedDefinitionTerminalAssociations.length > 0 && (<section className="device-definition-associations">
                            <div className="device-definition-section-title">
                              <h3>端子关联信息</h3>
                              <span>{selectedDefinitionTerminalAssociations.length} 个端子</span>
                            </div>
                            <div className="custom-param-table-wrap compact-table-wrap">
                              <table className="custom-param-table">
                                <thead>
                                  <tr>
                                    <th>端子</th>
                                    <th>能源属性</th>
                                    <th>关联对象</th>
                                    <th>关联字段</th>
                                    <th>说明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedDefinitionTerminalAssociations.map((association) => (<tr key={`${selectedDefinitionTemplate.kind}-terminal-${association.terminalIndex}`}>
                                      <td>{association.terminalLabel}</td>
                                      <td>{TERMINAL_TYPE_OPTIONS.find((option) => option.value === association.terminalType)?.label ?? association.terminalType}</td>
                                      <td>{association.deviceModel ? `${association.roleLabel} / ${association.deviceModel}` : association.roleLabel}</td>
                                      <td><code>{association.relationKey || "-"}</code></td>
                                      <td>
                                        {association.dependent
                            ? `随端子${association.sourceTerminalIndex + 1}分配到同一个关联设备`
                            : association.relationName}
                                      </td>
                                    </tr>))}
                                </tbody>
                              </table>
                            </div>
                          </section>)}
                        {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
                        <div className="custom-param-table-wrap device-definition-table-wrap">
                          <table className="custom-param-table">
                            <thead>
                              <tr>
                                <th>中文名称</th>
                                <th>英文名称</th>
                                <th>取值类型</th>
                                <th>典型取值</th>
                                <th>枚举值</th>
                                <th>操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {definitionDraftRows.map((row) => (<tr key={row.id} className={row.readonly ? "readonly-row" : ""}>
                                  <td>
                                    <BufferedTextInput value={row.cnName} disabled={row.readonly} onCommit={(value) => updateDefinitionDraftRow(row.id, { cnName: value })}/>
                                  </td>
                                  <td>
                                    <BufferedTextInput value={row.enName} disabled={row.readonly} onCommit={(value) => updateDefinitionDraftRow(row.id, { enName: value })}/>
                                  </td>
                                  <td>
                                    <select value={row.valueType} disabled={row.readonly} onChange={(event) => {
                        const nextRow = normalizeDefinitionRowEnumFields({
                            ...row,
                            valueType: event.target.value as DeviceParameterValueType
                        });
                        updateDefinitionDraftRow(row.id, {
                            valueType: nextRow.valueType,
                            typicalValue: nextRow.typicalValue,
                            enumOptions: nextRow.enumOptions,
                            enumValues: nextRow.enumValues
                        });
                    }}>
                                      {PARAM_VALUE_TYPE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>))}
                                    </select>
                                  </td>
                                  <td>
                                    {renderTypicalValueEditor(row, updateDefinitionDraftRow, row.readonly)}
                                  </td>
                                  <td>
                                    {renderEnumValuesEditor(row, updateDefinitionDraftRow, row.readonly)}
                                  </td>
                                  <td>
                                    <div className="custom-param-actions">
                                      <button type="button" onClick={() => deleteDefinitionDraftRow(row.id)} disabled={row.readonly}>
                                        删除
                                      </button>
                                    </div>
                                  </td>
                                </tr>))}
                            </tbody>
                          </table>
                        </div>
                        <div className="custom-device-actions">
                          <button type="button" onClick={addDefinitionDraftRow}>新增参数</button>
                          <button type="button" onClick={saveDeviceDefinitionDraft}>保存定义</button>
                          <button type="button" onClick={resetDeviceDefinitionDraft} disabled={!selectedDefinitionBaseTemplate}>
                            恢复默认
                          </button>
                        </div>
                      </>) : (renderDeviceDefinitionMeasurementPanel({
                deviceKind: normalizeComponentTypeName(definitionDraftSection) || deviceDefinitionKeyForTemplate(selectedDefinitionTemplate),
                label: selectedDefinitionTemplate.label,
                terminalCount: selectedDefinitionTemplate.terminalCount,
                terminalLabels: selectedDefinitionTemplate.terminalLabels
            }))}
                  </>) : (<div className="empty-state compact">
                    <Grid2X2 size={24}/>
                    <p>当前属性库暂无元件。</p>
                  </div>)}
              </section>
            </div>
            <div className="device-library-dialog-resize" role="separator" aria-orientation="horizontal" aria-label="调整修改元件窗口大小" title="拖拽调整窗口大小" onPointerDown={(event) => startDeviceLibraryDialogResize("definition", event)}/>
          </section>
        </div>)}
      {customDeviceDialogOpen && (<div className="image-picker-backdrop" onPointerDown={closeCustomDeviceDialog}>
          <section ref={customDeviceDialogRef} className={`custom-device-dialog${deviceLibraryDialogLayouts.custom ? " floating" : ""}`} style={deviceLibraryDialogStyle("custom")} onPointerDown={stopDeviceLibraryDialogEvent} onPointerUp={stopDeviceLibraryDialogEvent} onPointerCancel={stopDeviceLibraryDialogEvent} onLostPointerCapture={stopDeviceLibraryDialogEvent} onClick={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("custom", event)}>
                <h2>元件定义</h2>
                <p>维护元件图标、端子、参数和量测绑定，保存后用于图元库和画布建模。</p>
              </div>
              <button onClick={closeCustomDeviceDialog}>关闭</button>
            </div>
            {customDeviceDraft.error && <p className="custom-device-error">{customDeviceDraft.error}</p>}
            {customDeviceSaveMessage && <p className="custom-device-save-status">{customDeviceSaveMessage}</p>}
            <div className="custom-device-dialog-layout">
              <CustomComponentManagerTree libraries={displayedCustomComponentTreeLibraries} filteredByComponentType={filteredCustomComponentTreeByComponentType} initialCollapsedLibraries={collapsedCustomComponentTreeLibraries} initialCollapsedTypes={collapsedCustomComponentTreeTypes} initialSelection={customComponentTreeSelection} searchQuery={customComponentTreeSearchQuery} onSelectComponent={selectCustomComponentTemplate} onSearchChange={setCustomComponentTreeSearchQuery} onCollapseChange={handleTreeCollapseChange} onSelectionChange={setCustomComponentTreeSelection}/>
              <div className="custom-device-editor-panel">
            <div className="custom-device-form-grid">
              <label className="custom-attribute-library-field">
                <span>属性库类型</span>
                <div className="custom-attribute-library-select-row single-control">
                  <select className={sourceSelectClassName(isBuiltInAttributeLibrary(customDeviceDraft.attributeLibraryName))} value={customDeviceDraft.attributeLibraryName} onChange={(event) => selectCustomAttributeLibrary(event.target.value)}>
                    {selectableAttributeLibraries.map((group) => (<option key={group} value={group} className={attributeLibraryOptionClass(group)} title={isBuiltInAttributeLibrary(group) ? "系统内置属性库，无法删除" : "用户自定义属性库，可以删除"}>
                        {group}
                      </option>))}
                  </select>
                </div>
              </label>
              <label className="custom-component-type-field">
                <span>元件类型</span>
                <div className="custom-attribute-library-select-row single-control">
                  <select className={sourceSelectClassName(isBuiltInComponentType(customDeviceDraft.componentType))} value={customDeviceDraft.componentType} onChange={(event) => selectCustomComponentType(customDeviceDraft.attributeLibraryName, event.target.value)}>
                    {currentAttributeLibraryComponentTypeOptions.map((section) => (<option key={section} value={section} className={componentTypeOptionClass(section)} title={isBuiltInComponentType(section) ? "系统内置元件类型，无法删除" : "用户自定义元件类型，可以删除"}>
                        {section}
                      </option>))}
                  </select>
                </div>
              </label>
              <label className="custom-device-name-field">
                元件名称
                <BufferedTextInput value={customDeviceDraft.componentName} placeholder="例如 水电、核电、风电、光伏" onCommit={(value) => setCustomDeviceDraft((current) => ({ ...current, componentName: value, error: "" }))}/>
              </label>
              <label className="custom-device-container-field">
                是否容器
                <select value={customDeviceDraft.isContainer ? "1" : "0"} onChange={(event) => setCustomDeviceDraft((current) => ({
            ...current,
            isContainer: event.target.value === "1",
            error: ""
        }))}>
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              <label className="custom-device-resize-field">
                是否允许变形
                <select value={customDeviceDraft.allowResizeTransform} onChange={(event) => setCustomDeviceDraft((current) => ({
            ...current,
            allowResizeTransform: event.target.value,
            error: ""
        }))}>
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              <label className="custom-device-terminal-count-field">
                端子数量
                <BufferedTextInput type="number" min="0" max={MAX_CUSTOM_DEVICE_TERMINALS} value={customDeviceDraft.terminalCount} disabled={customDeviceDialogView === "terminals" && !customDefaultStateSelected} onCommit={(value) => updateCustomDraftTerminalCount(Number(value))}/>
              </label>
            </div>
            <div className="device-definition-tabs custom-device-tabs" role="tablist" aria-label="元件定义内容切换">
              <button type="button" className={customDeviceDialogView === "terminals" ? "active" : ""} onClick={() => setCustomDeviceDialogView("terminals")}>
                端子定义
              </button>
              <button type="button" className={customDeviceDialogView === "icon" ? "active" : ""} onClick={() => setCustomDeviceDialogView("icon")}>
                图标定义
              </button>
              <button type="button" className={customDeviceDialogView === "parameters" ? "active" : ""} onClick={() => setCustomDeviceDialogView("parameters")}>
                参数定义
              </button>
              <button type="button" className={customDeviceDialogView === "measurements" ? "active" : ""} onClick={() => setCustomDeviceDialogView("measurements")}>
                量测定义
              </button>
            </div>
            <div className="custom-device-tab-panel">
            {customDeviceDialogView === "terminals" || customDeviceDialogView === "icon" ? (<>
            {customDeviceDialogView === "icon" && renderStateVisualPager(customDeviceDraft.stateDefinitions, customDeviceStatePageId, setCustomDeviceStatePageId, {
                update: updateCustomDeviceStateDraftRow,
                add: addCustomDeviceStateDraftRow,
                remove: deleteCustomDeviceStateDraftRow,
                uploadStateImage: (rowId) => {
                    setStateImageUploadTarget({ scope: "custom", rowId });
                    stateVisualImageInputRef.current?.click();
                },
                drawStateIcon: (rowId) => openStateIconDrawingDialog({ scope: "custom", rowId }),
                preview: !customDefaultStateSelected ? (<div className="custom-device-preview">
                  <span>状态预览</span>
                  <div className="custom-device-preview-stage">
                    <svg className="custom-device-anchor-preview" viewBox={`${formatSvgNumber(-customDevicePreviewWidth / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(-customDevicePreviewHeight / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(customDevicePreviewWidth + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)} ${formatSvgNumber(customDevicePreviewHeight + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)}`} role="img" aria-label="自定义元件状态预览">
                      <image href={customDevicePreviewImage} x={-customDevicePreviewWidth / 2} y={-customDevicePreviewHeight / 2} width={customDevicePreviewWidth} height={customDevicePreviewHeight} preserveAspectRatio="xMidYMid slice"/>
                      {customStatePreviewText && (<text className="custom-device-state-preview-text" x="0" y="0" fill={customStatePreviewVisual?.textColor || customStatePreviewVisual?.color || "#1d4ed8"}>
                          {customStatePreviewText}
                        </text>)}
                      <rect className="custom-device-preview-frame" x={-customDevicePreviewWidth / 2} y={-customDevicePreviewHeight / 2} width={customDevicePreviewWidth} height={customDevicePreviewHeight} rx="8"/>
                    </svg>
                  </div>
                  <small>{customStatePreviewVisual && customDevicePreviewImage ? "当前显示状态图形" : customDeviceDraft.backgroundImageAssetId ? "当前显示后台图标预览" : customDeviceDraft.backgroundImage ? "当前显示本地图标预览" : "当前显示默认样例预览"}</small>
                </div>) : undefined
            })}
            {customDeviceDialogView === "icon" && customDefaultStateSelected && <div className="custom-device-image-row">
              <span>SVG/图片图标</span>
              <button type="button" onClick={() => customDeviceImageInputRef.current?.click()}>上传SVG/图片到后台</button>
              <button type="button" onClick={() => setCustomDeviceDraft((current) => ({
                    ...current,
                    backgroundImage: generateCustomDeviceImage(current.componentName.trim() || current.componentType || "Unit", current.terminalTypes.slice(0, current.terminalCount)),
                    backgroundImageAssetId: "",
                    error: ""
                }))}>
                程序自动生成
              </button>
              <button type="button" onClick={() => setCustomDeviceDraft((current) => ({ ...current, backgroundImage: "", backgroundImageAssetId: "", error: "" }))}>清除</button>
              <strong>{customDeviceDraft.backgroundImageAssetId ? "后台已保存" : customDeviceDraft.backgroundImage ? "已设置" : "未设置"}</strong>
            </div>}
            {customDefaultStateSelected && customDeviceDialogView === "terminals" && <div className="custom-device-preview">
              <span>端子位置预览</span>
              <div className="custom-device-preview-stage">
                <svg className="custom-device-anchor-preview" viewBox={`${formatSvgNumber(-customDevicePreviewWidth / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(-customDevicePreviewHeight / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(customDevicePreviewWidth + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)} ${formatSvgNumber(customDevicePreviewHeight + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)}`} role="img" aria-label="自定义元件图标和端子位置预览" onPointerMove={(event) => {
                    if (!customDefaultStateSelected || customDeviceTerminalAnchorDragIndex === null) {
                        return;
                    }
                    updateCustomDeviceTerminalAnchorFromPreview(customDeviceTerminalAnchorDragIndex, event.currentTarget, event);
                }} onPointerUp={(event) => {
                    if (customDeviceTerminalAnchorDragIndex !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    setCustomDeviceTerminalAnchorDragIndex(null);
                }} onPointerCancel={(event) => {
                    if (customDeviceTerminalAnchorDragIndex !== null && event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    setCustomDeviceTerminalAnchorDragIndex(null);
                }}>
                  <image href={customDevicePreviewImage} x={-customDevicePreviewWidth / 2} y={-customDevicePreviewHeight / 2} width={customDevicePreviewWidth} height={customDevicePreviewHeight} preserveAspectRatio="xMidYMid slice"/>
                  {customStatePreviewText && (<text className="custom-device-state-preview-text" x="0" y="0" fill={customStatePreviewVisual?.textColor || customStatePreviewVisual?.color || "#1d4ed8"}>
                      {customStatePreviewText}
                    </text>)}
                  <rect className="custom-device-preview-frame" x={-customDevicePreviewWidth / 2} y={-customDevicePreviewHeight / 2} width={customDevicePreviewWidth} height={customDevicePreviewHeight} rx="8"/>
                  {customDefaultStateSelected && customDeviceTerminalAnchorDragIndex !== null && (<>
                      {CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.map((guideValue, guideIndex) => {
                        const activeAnchor = customDeviceTerminalAnchors[customDeviceTerminalAnchorDragIndex];
                        const active = Boolean(activeAnchor &&
                            (Math.abs(customDeviceTerminalAnchorValue(activeAnchor.x) - guideValue) <= 1 / CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION ||
                                Math.abs(customDeviceTerminalAnchorValue(activeAnchor.y) - guideValue) <= 1 / CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION));
                        return (<Fragment key={`custom-terminal-guide-${guideIndex}`}>
                            <line className={`custom-device-terminal-guide ${active ? "active" : ""}`} x1={guideValue * customDevicePreviewWidth} y1={-customDevicePreviewHeight / 2} x2={guideValue * customDevicePreviewWidth} y2={customDevicePreviewHeight / 2}/>
                            <line className={`custom-device-terminal-guide ${active ? "active" : ""}`} x1={-customDevicePreviewWidth / 2} y1={guideValue * customDevicePreviewHeight} x2={customDevicePreviewWidth / 2} y2={guideValue * customDevicePreviewHeight}/>
                            <text className="custom-device-terminal-guide-label" x={guideValue * customDevicePreviewWidth} y={-customDevicePreviewHeight / 2 - 5}>
                              {CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS[guideIndex]}
                            </text>
                            <text className="custom-device-terminal-guide-label horizontal" x={-customDevicePreviewWidth / 2 - 5} y={guideValue * customDevicePreviewHeight}>
                              {CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS[guideIndex]}
                            </text>
                          </Fragment>);
                    })}
                    </>)}
                  {customDefaultStateSelected && customDeviceTerminalAnchors.map((anchor, index) => {
                    const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                    const segment = customDeviceTerminalConnectorSegment(anchor);
                    return (<line key={`custom-terminal-connector-${index}`} className="custom-device-terminal-connector" x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}/>);
                })}
                  {customDefaultStateSelected && customDeviceTerminalAnchors.map((anchor, index) => {
                    const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                    const segment = customDeviceTerminalConnectorSegment(anchor);
                    const x = segment.to.x;
                    const y = segment.to.y;
                    const dragging = customDeviceTerminalAnchorDragIndex === index;
                    return (<g key={`custom-terminal-anchor-${index}`} className={`custom-device-terminal-anchor ${dragging ? "dragging" : ""}`} transform={`translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})`} style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}>
                        <circle r="8" onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const svg = event.currentTarget.ownerSVGElement;
                            if (!svg) {
                                return;
                            }
                            setCustomDeviceTerminalAnchorDragIndex(index);
                            svg.setPointerCapture(event.pointerId);
                            updateCustomDeviceTerminalAnchorFromPreview(index, svg, event);
                        }}>
                          <title>{`拖动调整端子${index + 1}位置`}</title>
                        </circle>
                        <text x="0" y="0">{index + 1}</text>
                      </g>);
                })}
                </svg>
              </div>
              <small>{customDeviceDraft.backgroundImageAssetId ? "当前显示后台图标预览" : customDeviceDraft.backgroundImage ? "当前显示本地图标预览" : "当前显示默认样例预览"}</small>
            </div>}
            {customDeviceDialogView === "icon" && customDefaultStateSelected && <div className="custom-device-preview">
              <span>背景预览</span>
              <div className="custom-device-preview-stage">
                <svg className="custom-device-anchor-preview" viewBox={`${formatSvgNumber(-customDevicePreviewWidth / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(-customDevicePreviewHeight / 2 - CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN)} ${formatSvgNumber(customDevicePreviewWidth + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)} ${formatSvgNumber(customDevicePreviewHeight + CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN * 2)}`} role="img" aria-label="自定义元件图标预览">
                  <image href={customDevicePreviewImage} x={-customDevicePreviewWidth / 2} y={-customDevicePreviewHeight / 2} width={customDevicePreviewWidth} height={customDevicePreviewHeight} preserveAspectRatio="xMidYMid slice"/>
                  {customStatePreviewText && (<text className="custom-device-state-preview-text" x="0" y="0" fill={customStatePreviewVisual?.textColor || customStatePreviewVisual?.color || "#1d4ed8"}>
                      {customStatePreviewText}
                    </text>)}
                  <rect className="custom-device-preview-frame" x={-customDevicePreviewWidth / 2} y={-customDevicePreviewHeight / 2} width={customDevicePreviewWidth} height={customDevicePreviewHeight} rx="8"/>
                </svg>
              </div>
              <small>{customDeviceDraft.backgroundImageAssetId ? "当前显示后台图标预览" : customDeviceDraft.backgroundImage ? "当前显示本地图标预览" : "当前显示默认样例预览"}</small>
            </div>}
            {customDefaultStateSelected && customDeviceDialogView === "terminals" && <div className="custom-terminal-grid">
              {Array.from({ length: customDeviceDraft.terminalCount }).map((_, index) => {
                    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
                    const terminalAssociations = normalizeContainerTerminalAssociations(terminalTypes, customDeviceDraft.terminalAssociations, customDeviceDraft.terminalCount);
                    const associationSourceIndex = getContainerTerminalAssociationSourceIndex(terminalAssociations, index);
                    const associationDependent = customDeviceDraft.isContainer && isContainerTerminalAssociationDependent(terminalAssociations, index);
                    const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                    const associationOptions = CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[terminalType];
                    const terminalAnchor = customDeviceTerminalAnchors[index] ?? { x: 0, y: 0 };
                    return (<label key={index} className={associationDependent ? "custom-terminal-dependent" : ""}>
                    {`端子${index + 1}能源属性`}
                    <select value={terminalType} disabled={associationDependent} onChange={(event) => setCustomDeviceDraft((current) => {
                            const terminalTypes = [...current.terminalTypes];
                            terminalTypes[index] = event.target.value as TerminalType;
                            const terminalAssociations = [...current.terminalAssociations];
                            if (current.isContainer) {
                                if (isDoubleContainerTerminalAssociation(terminalAssociations[index]) && index + 1 < current.terminalCount) {
                                    terminalAssociations[index + 1] = defaultContainerAssociationForTerminalType(terminalTypes[index + 1] ?? "ac");
                                }
                                terminalAssociations[index] = defaultContainerAssociationForTerminalType(terminalTypes[index]);
                            }
                            return {
                                ...current,
                                terminalTypes,
                                terminalAssociations: normalizeContainerTerminalAssociations(terminalTypes.slice(0, current.terminalCount), terminalAssociations, current.terminalCount),
                                error: ""
                            };
                        })}>
                      {TERMINAL_TYPE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>
                          {option.label}
                        </option>))}
                    </select>
                    <span>端子位置</span>
                    <div className="custom-terminal-anchor-inputs">
                      <span>X</span>
                      <BufferedTextInput type="number" min="-0.5" max="0.5" step="0.01" value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.x)} onCommit={(value) => updateCustomDeviceTerminalAnchor(index, { x: Number(value) })} aria-label={`端子${index + 1} X位置`}/>
                      <span>Y</span>
                      <BufferedTextInput type="number" min="-0.5" max="0.5" step="0.01" value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.y)} onCommit={(value) => updateCustomDeviceTerminalAnchor(index, { y: Number(value) })} aria-label={`端子${index + 1} Y位置`}/>
                    </div>
                    {customDeviceDraft.isContainer && (<>
                        <span>关联设备</span>
                        <select value={associationDependent ? "" : terminalAssociations[index] || defaultContainerAssociationForTerminalType(terminalType)} disabled={associationDependent} onChange={(event) => setCustomDeviceDraft((current) => {
                                const selectedAssociation = event.target.value as ContainerTerminalAssociationType;
                                if (isDoubleContainerTerminalAssociation(selectedAssociation) && index + 1 >= current.terminalCount) {
                                    const message = `端子${index + 1}是最后一个端子，不能设置为双端热源/热荷。`;
                                    window.alert(message);
                                    return { ...current, error: message };
                                }
                                const terminalTypes = [...current.terminalTypes];
                                const terminalAssociations = [...current.terminalAssociations];
                                const previousAssociation = terminalAssociations[index];
                                terminalAssociations[index] = selectedAssociation;
                                if (isDoubleContainerTerminalAssociation(selectedAssociation) && index + 1 < current.terminalCount) {
                                    terminalTypes[index + 1] = terminalTypes[index] ?? "heat";
                                    terminalAssociations[index + 1] = "";
                                }
                                else if (isDoubleContainerTerminalAssociation(previousAssociation) && index + 1 < current.terminalCount) {
                                    terminalAssociations[index + 1] = defaultContainerAssociationForTerminalType(terminalTypes[index + 1] ?? "ac");
                                }
                                return {
                                    ...current,
                                    terminalTypes,
                                    terminalAssociations: normalizeContainerTerminalAssociations(terminalTypes.slice(0, current.terminalCount), terminalAssociations, current.terminalCount),
                                    error: ""
                                };
                            })}>
                          {associationDependent && <option value="">随上一个端子关联同一个双端元件</option>}
                          {associationOptions.map((option) => (<option key={option.value} value={option.value}>
                              {option.label}
                            </option>))}
                        </select>
                        {associationDependent && <small>{`随端子${associationSourceIndex + 1}分配到同一个双端元件，关联属性为空。`}</small>}
                      </>)}
                  </label>);
                })}
            </div>}
              </>) : customDeviceDialogView === "parameters" ? (<>
            <div className="custom-param-table-wrap">
              <table className="custom-param-table">
                <thead>
                  <tr>
                    <th>中文名称</th>
                    <th>英文名称</th>
                    <th>取值类型</th>
                    <th>典型取值</th>
                    <th>枚举值</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customDraftDefaultParams.map((row) => {
                const readonlyRow: CustomParamDraft = { ...row, id: `default-${row.enName}` };
                return (<tr key={`default-${row.enName}`} className="readonly-row">
                        <td>{row.cnName}</td>
                        <td>{row.enName}</td>
                        <td>{parameterValueTypeLabelForDefinitionRow(row)}</td>
                        <td>{renderTypicalValueEditor(readonlyRow, () => undefined, true)}</td>
                        <td>{renderEnumValuesEditor(readonlyRow, () => undefined, true)}</td>
                        <td>默认</td>
                      </tr>);
            })}
                  {customDeviceDraft.params.map((row, index) => (<tr key={row.id}>
                      <td>
                        <BufferedTextInput value={row.cnName} onCommit={(value) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => (item.id === row.id ? { ...item, cnName: value } : item)),
                    error: ""
                }))}/>
                      </td>
                      <td>
                        <BufferedTextInput value={row.enName} onCommit={(value) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => (item.id === row.id ? { ...item, enName: value } : item)),
                    error: ""
                }))}/>
                      </td>
                      <td>
                        <select value={row.valueType} onChange={(event) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => item.id === row.id
                        ? normalizeDefinitionRowEnumFields({ ...item, valueType: event.target.value as DeviceParameterValueType })
                        : item),
                    error: ""
                }))}>
                          {PARAM_VALUE_TYPE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>
                              {option.label}
                            </option>))}
                        </select>
                      </td>
                      <td>
                        {renderTypicalValueEditor(row, (rowId, patch) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
                    error: ""
                })))}
                      </td>
                      <td>
                        {renderEnumValuesEditor(row, (rowId, patch) => setCustomDeviceDraft((current) => ({
                    ...current,
                    params: current.params.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
                    error: ""
                })))}
                      </td>
                      <td>
                        <div className="custom-param-actions">
                          <button type="button" onClick={() => setCustomDeviceDraft((current) => {
                    if (index === 0)
                        return current;
                    const params = [...current.params];
                    [params[index - 1], params[index]] = [params[index], params[index - 1]];
                    return { ...current, params };
                })} disabled={index === 0}>
                            上移
                          </button>
                          <button type="button" onClick={() => setCustomDeviceDraft((current) => {
                    if (index >= current.params.length - 1)
                        return current;
                    const params = [...current.params];
                    [params[index + 1], params[index]] = [params[index], params[index + 1]];
                    return { ...current, params };
                })} disabled={index >= customDeviceDraft.params.length - 1}>
                            下移
                          </button>
                          <button type="button" onClick={() => setCustomDeviceDraft((current) => ({ ...current, params: current.params.filter((item) => item.id !== row.id) }))}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
            <div className="custom-device-actions">
              <button type="button" onClick={() => setCustomDeviceDraft((current) => ({
                ...current,
                params: [
                    ...current.params,
                    { id: customParamId(), cnName: "", enName: "", valueType: "string", typicalValue: "" }
                ]
            }))}>
                新增参数
              </button>
            </div>
              </>) : (renderDeviceDefinitionMeasurementPanel(customDeviceMeasurementTarget))}
            </div>
              </div>
            </div>
            <footer className="custom-device-dialog-footer">
              <button type="button" onClick={closeCustomDeviceDialog}>取消</button>
              <button type="button" className="primary" onClick={() => saveCustomDeviceDefinitionDialog({ closeAfterSave: true })}>
                {customDeviceDefinitionMode === "edit" ? "保存元件定义" : "保存自定义设备"}
              </button>
            </footer>
            <div className="device-library-dialog-resize" role="separator" aria-orientation="horizontal" aria-label="调整新建元件窗口大小" title="拖拽调整窗口大小" onPointerDown={(event) => startDeviceLibraryDialogResize("custom", event)}/>
          </section>
        </div>)}
      {stateIconDrawingDialog && (<div className="state-icon-drawing-backdrop" onPointerDown={() => setStateIconDrawingDialog(null)}>
          <section className="state-icon-drawing-dialog" onPointerDown={(event) => event.stopPropagation()} onKeyDown={stateIconDrawingKeyDown} tabIndex={-1} aria-label="状态图标绘制器">
            <header>
              <div>
                <h2>绘制状态图标</h2>
                <p>多个图案会合成为一个 SVG 状态图标，保存后用于当前状态显示。</p>
              </div>
              <button type="button" onClick={() => setStateIconDrawingDialog(null)}>关闭</button>
            </header>
            <div className="state-icon-drawing-layout">
              <div className="state-icon-drawing-canvas">
                <svg ref={stateIconDrawingSvgRef} viewBox="0 0 240 160" role="img" aria-label="状态图标绘制预览" onPointerMove={dragStateIconDrawingSelection} onPointerUp={stopStateIconDrawingDrag} onPointerCancel={stopStateIconDrawingDrag} onPointerDown={(event) => {
            (event.currentTarget.closest(".state-icon-drawing-dialog") as HTMLElement | null)?.focus();
            setStateIconDrawingDialog((current) => current ? { ...current, selectedElementId: "", selectedElementIds: [] } : current);
        }}>
                  <rect x="0" y="0" width="240" height="160" rx="10" className="state-icon-drawing-canvas-bg"/>
                  <image href={stateIconDrawingToImage(stateIconDrawingDialog.elements)} x="0" y="0" width="240" height="160" preserveAspectRatio="xMidYMid meet" className="state-icon-drawing-composite-preview"/>
                  {stateIconDrawingDialog.elements.map((element) => {
            const selectedIds = stateIconDrawingDialog.selectedElementIds.length > 0
                ? stateIconDrawingDialog.selectedElementIds
                : [stateIconDrawingDialog.selectedElementId].filter(Boolean);
            const selected = selectedIds.includes(element.id);
            const halfWidth = Math.max(1, element.width) / 2;
            const halfHeight = Math.max(1, element.height) / 2;
            return (<g key={element.id} className={`state-icon-drawing-element ${selected ? "selected" : ""}`} transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`} onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "move")}>
                        <rect x={formatSvgNumber(-halfWidth)} y={formatSvgNumber(-halfHeight)} width={formatSvgNumber(element.width)} height={formatSvgNumber(element.height)} className="state-icon-drawing-hitbox"/>
                        {selected && (<>
                            <rect x={formatSvgNumber(-halfWidth)} y={formatSvgNumber(-halfHeight)} width={formatSvgNumber(element.width)} height={formatSvgNumber(element.height)} className="state-icon-drawing-selection-box"/>
                            <circle cx={formatSvgNumber(halfWidth)} cy={formatSvgNumber(halfHeight)} r="5" className="state-icon-drawing-resize-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize")}/>
                            <line x1="0" y1={formatSvgNumber(-halfHeight)} x2="0" y2={formatSvgNumber(-halfHeight - 16)} className="state-icon-drawing-rotate-stem"/>
                            <circle cx="0" cy={formatSvgNumber(-halfHeight - 20)} r="5" className="state-icon-drawing-rotate-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "rotate")}/>
                          </>)}
                      </g>);
        })}
                </svg>
              </div>
              <div className="state-icon-drawing-side">
              <div className="state-icon-drawing-library">
                <span>添加图案</span>
                <div className="state-icon-drawing-import-actions">
                  <button type="button" onClick={() => {
            setStateIconDrawingImportMode("svg");
            stateIconDrawingImportInputRef.current?.click();
        }}>
                    导入SVG
                  </button>
                  <button type="button" onClick={() => {
            setStateIconDrawingImportMode("image");
            stateIconDrawingImportInputRef.current?.click();
        }}>
                    导入图片
                  </button>
                </div>
                <div>
                  {([
            "switch-open",
            "switch-closed",
            "valve-open",
            "valve-closed",
            "line",
            "point",
            "triangle",
            "square",
            "hexagon",
            "polygon",
            "circle",
            "semicircle",
            "ellipse",
            "arc",
            "text"
        ] as StateVisualShapeKind[]).map((kind) => (<button key={kind} type="button" onClick={() => addStateIconDrawingElement(kind)}>
                      {stateVisualShapeLabel(kind)}
                    </button>))}
                </div>
              </div>
              <div className="state-icon-drawing-layers">
                <span>图案图层</span>
                <div>
                  {stateIconDrawingDialog.elements.length === 0 ? (<p>暂无图案</p>) : (stateIconDrawingDialog.elements.map((element, index) => (<button key={element.id} type="button" className={(stateIconDrawingDialog.selectedElementIds.length > 0 ? stateIconDrawingDialog.selectedElementIds : [stateIconDrawingDialog.selectedElementId]).includes(element.id) ? "active" : ""} onClick={(event) => stateIconDrawingSelection(element.id, event.shiftKey || event.ctrlKey || event.metaKey)}>
                        {index + 1}. {stateVisualShapeLabel(element.kind)}
                      </button>)))}
                </div>
              </div>
              <div className="state-icon-drawing-properties">
                {(() => {
            const selected = stateIconDrawingDialog.elements.find((element) => element.id === stateIconDrawingDialog.selectedElementId) ?? null;
            if (!selected) {
                return <p>选择一个图案后调整属性。</p>;
            }
            const visibleStrokeColor = visibleStateIconColor("#2563eb", selected.strokeColor);
            const visibleTextColor = visibleStateIconColor("#111827", selected.textColor, selected.strokeColor);
            return (<>
                      <div className="state-icon-drawing-property-title">
                        <strong>{stateVisualShapeLabel(selected.kind)}</strong>
                        <button type="button" onClick={() => {
                    const selectedIds = stateIconDrawingDialog.selectedElementIds.length > 0
                        ? stateIconDrawingDialog.selectedElementIds
                        : [selected.id];
                    if (selectedIds.length > 1) {
                        deleteSelectedStateIconDrawingElements();
                    }
                    else {
                        deleteStateIconDrawingElement(selected.id);
                    }
                }}>
                          {stateIconDrawingDialog.selectedElementIds.length > 1 ? "删除选中" : "删除图案"}
                        </button>
                      </div>
                      <div className="state-icon-drawing-property-grid">
                        <label>
                          形状
                          <select value={selected.kind} onChange={(event) => updateStateIconDrawingElement(selected.id, { kind: event.target.value as StateVisualShapeKind, strokeColor: visibleStrokeColor, textColor: visibleTextColor })}>
                            {([
                    "switch-open",
                    "switch-closed",
                    "valve-open",
                    "valve-closed",
                    "line",
                    "point",
                    "triangle",
                    "square",
                    "hexagon",
                    "polygon",
                    "circle",
                    "semicircle",
                    "ellipse",
                    "arc",
                    "text",
                    "imported-svg",
                    "image"
                ] as StateVisualShapeKind[]).map((kind) => (<option key={kind} value={kind}>{stateVisualShapeLabel(kind)}</option>))}
                          </select>
                        </label>
                        <label>
                          X
                          <BufferedTextInput type="number" value={selected.x} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { x: Number(nextValue) || 0 })}/>
                        </label>
                        <label>
                          Y
                          <BufferedTextInput type="number" value={selected.y} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { y: Number(nextValue) || 0 })}/>
                        </label>
                        <label>
                          宽
                          <BufferedTextInput type="number" min="1" value={selected.width} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { width: Math.max(1, Number(nextValue) || 1) })}/>
                        </label>
                        <label>
                          高
                          <BufferedTextInput type="number" min="1" value={selected.height} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { height: Math.max(1, Number(nextValue) || 1) })}/>
                        </label>
                        <label>
                          角度
                          <BufferedTextInput type="number" value={selected.rotation} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { rotation: Number(nextValue) || 0 })}/>
                        </label>
                        <label>
                          粗细
                          <BufferedTextInput type="number" min="0" value={selected.strokeWidth} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { strokeWidth: Math.max(0, Number(nextValue) || 0) })}/>
                        </label>
                        <label>
                          线色
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={visibleStrokeColor} fallback="#2563eb" onCommit={(value) => updateStateIconDrawingElement(selected.id, { strokeColor: value })}/>
                            <span className="device-state-color-swatch" title={visibleStrokeColor} style={{ "--state-color": visibleStrokeColor } as CSSProperties}/>
                          </div>
                        </label>
                        <label>
                          填充
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={selected.fillColor} fallback="#ffffff" onCommit={(value) => updateStateIconDrawingElement(selected.id, { fillColor: value })}/>
                            <span className={`device-state-color-swatch ${selected.fillColor === "transparent" ? "transparent" : ""}`} title={selected.fillColor || "未设置"} style={{ "--state-color": selected.fillColor === "transparent" ? "#ffffff" : selected.fillColor || "#ffffff" } as CSSProperties}/>
                          </div>
                        </label>
                        <label>
                          文字色
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={visibleTextColor} fallback="#111827" onCommit={(value) => updateStateIconDrawingElement(selected.id, { textColor: value })}/>
                            <span className="device-state-color-swatch" title={visibleTextColor} style={{ "--state-color": visibleTextColor } as CSSProperties}/>
                          </div>
                        </label>
                        <label className="state-icon-drawing-text-field">
                          文字
                          <BufferedTextInput value={selected.text} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { text: nextValue })}/>
                        </label>
                        {selected.kind === "imported-svg" && (<label className="state-icon-drawing-svg-field">
                            SVG源码
                            <BufferedTextarea value={selected.svgSource ?? ""} spellCheck={false} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { svgSource: nextValue })}/>
                          </label>)}
                        {selected.kind === "image" && (<>
                            <label>
                              图片缩放
                              <BufferedTextInput type="number" min="0.05" step="0.05" value={selected.imageScale ?? 1} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { imageScale: Math.max(0.05, Number(nextValue) || 0.05) })}/>
                            </label>
                            <label>
                              裁剪X
                              <BufferedTextInput type="number" value={selected.cropX ?? 0} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropX: Number(nextValue) || 0 })}/>
                            </label>
                            <label>
                              裁剪Y
                              <BufferedTextInput type="number" value={selected.cropY ?? 0} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropY: Number(nextValue) || 0 })}/>
                            </label>
                          </>)}
                      </div>
                    </>);
        })()}
              </div>
              </div>
            </div>
            <footer>
              <button type="button" onClick={() => addStateIconDrawingElement("line")}>添加线</button>
              <button type="button" onClick={applyStateIconDrawingDialog} disabled={stateIconDrawingDialog.elements.length === 0}>应用到状态图标</button>
            </footer>
          </section>
        </div>)}
      {renderNodeDoubleClickDialog()}
      {imageTarget && (<div className="image-picker-backdrop" onPointerDown={() => setImageTarget(null)}>
          <section className="image-picker-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>{imageTarget.kind === "canvas" ? "选择模型背景图片" : imageTarget.kind === "nodeForeground" ? "选择设备前景图片" : "选择设备图片"}</h2>
                <p>本地图片会先上传到后台图片库；请再从后台可用图片列表中选择应用。</p>
              </div>
              <button onClick={() => setImageTarget(null)}>关闭</button>
            </div>
            <div className="image-picker-actions">
              <select value={activeImageFolderId} onChange={(event) => setActiveImageFolderId(event.target.value)}>
                {imageFolders.map((folder) => (<option key={folder.id} value={folder.id}>
                    {folder.name}{typeof folder.imageCount === "number" ? ` (${folder.imageCount})` : ""}
                  </option>))}
              </select>
              <button onClick={createImageFolder} disabled={isBrowseMode}>新建文件夹</button>
              <button onClick={renameImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>重命名</button>
              <button onClick={deleteImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>删除文件夹</button>
              <button onClick={() => imageInputRef.current?.click()} disabled={isBrowseMode}>上传本地图片到后台</button>
              <button onClick={clearSelectedImage} disabled={isBrowseMode}>取消当前图片</button>
            </div>
            <div className="image-asset-list">
              {imageAssetList.length === 0 ? (<p className="image-empty">后台暂无图片，请先加载本地图片。</p>) : (imageAssetList.map((asset, index) => (<button key={asset.id} className="image-asset-option" disabled={isBrowseMode} onClick={() => applyExistingImage(asset.id)}>
                    <img src={imageAssets[asset.id] ?? asset.url} alt={asset.name || `后台图片 ${index + 1}`}/>
                    <span>{asset.name || `后台图片 ${index + 1}`}</span>
                  </button>)))}
            </div>
          </section>
        </div>)}
    </div>);
}
