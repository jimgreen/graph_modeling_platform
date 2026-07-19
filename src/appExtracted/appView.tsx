// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { MemoizedCanvasArea } from "./appCanvasArea";
import { IMAGE_FIT_MODE_OPTIONS, normalizeImageFitMode } from "../imageFit";
import {
  ICON_LIBRARY_PAGE_SIZE,
  iconLibraryCategoriesForSelection,
  visibleIconLibraryIcons
} from "../iconLibraryCatalog";
import { buildExportDeviceIdMap } from "../svgExportUtils";
import { inferESection, getTemplateParameterDefinitions, resolveDeviceParameterDefinitionExportSettings, templateDerivedComponentLibraryInfo } from "../model";
import { buildEDeviceInterfaceDefinitionRows } from "./appDeviceDefinitionFactories";

export type ImagePickerLibraryTab = "image" | "icon";

export function imagePickerAssetIsBuiltinIcon(asset: any) {
  return (
    asset?.createdAt === "builtin" ||
    String(asset?.folderId ?? "") === "builtin-shared-icons" ||
    String(asset?.id ?? "").startsWith("builtin-shared-icon-")
  );
}

export function imagePickerAssetsForLibraryTab(assets: any[] = [], tab: ImagePickerLibraryTab) {
  return (assets ?? []).filter((asset) =>
    tab === "icon" ? imagePickerAssetIsBuiltinIcon(asset) : !imagePickerAssetIsBuiltinIcon(asset)
  );
}

export function imagePickerUsesLibraryTabs(imageTarget: any) {
  return Boolean(imageTarget && imageTarget.kind !== "canvasIcon" && imageTarget.kind !== "stateIconDrawing");
}

export function resolveInspectorTopologyEntry(topology: any, inspectorTopology: any, nodeId: string) {
  return inspectorTopology?.nodes?.[nodeId] ?? topology?.nodes?.[nodeId];
}

export function inspectorTabShowsDevicePanel(inspectorTab: string, hasSelectedNode: boolean) {
  return inspectorTab === "device" && hasSelectedNode;
}

export function resolveDeviceModelPanelParameterKeys(
  eKeys: readonly string[] = [],
  customDefinitions: readonly Record<string, unknown>[] = [],
  fallbackKeys: readonly string[] = []
): string[] {
  const customKeys = customDefinitions
    .map((definition) => String(definition.enName ?? "").trim())
    .filter(Boolean);
  const exportKeyToCustomKey = new Map<string, string>();
  customDefinitions.forEach((definition) => {
    const customKey = String(definition.enName ?? "").trim();
    const exportKey = String(definition.exportName ?? "").trim();
    if (customKey && exportKey && exportKey !== customKey) {
      exportKeyToCustomKey.set(exportKey, customKey);
    }
  });
  const mergedKeys: string[] = [];
  const appendKey = (key: string) => {
    const normalizedKey = String(key ?? "").trim();
    if (normalizedKey && !mergedKeys.includes(normalizedKey)) {
      mergedKeys.push(normalizedKey);
    }
  };
  eKeys.forEach((key) => appendKey(exportKeyToCustomKey.get(key) ?? key));
  customKeys.forEach(appendKey);
  if (mergedKeys.length > 0) {
    return mergedKeys;
  }
  fallbackKeys.forEach(appendKey);
  return mergedKeys;
}

export function buildEDeviceInterfaceDefinitionTree(rows: readonly any[] = []) {
  const categories = new Map<string, { key: string; label: string; rows: any[] }>();
  for (const row of rows ?? []) {
    const label = String(row?.categoryLibrary ?? "").trim() || "未分类";
    const key = label.toLowerCase();
    const category = categories.get(key) ?? { key: `category:${key}`, label, rows: [] };
    category.rows.push(row);
    categories.set(key, category);
  }

  return Array.from(categories.values()).map((category) => {
    const rowByLibrary = new Map(
      category.rows.map((row) => [String(row?.componentLibrary ?? "").trim().toLowerCase(), row])
    );
    const nestedLibraries = new Set<string>();
    const childrenByBaseLibrary = new Map<string, any[]>();

    for (const row of category.rows) {
      const componentLibrary = String(row?.componentLibrary ?? "").trim().toLowerCase();
      const baseComponentLibrary = String(row?.derivedFromComponentLibrary ?? "").trim().toLowerCase();
      if (
        !row?.isDerivedComponentLibrary ||
        !componentLibrary ||
        !baseComponentLibrary ||
        componentLibrary === baseComponentLibrary ||
        !rowByLibrary.has(baseComponentLibrary)
      ) {
        continue;
      }
      nestedLibraries.add(componentLibrary);
      const children = childrenByBaseLibrary.get(baseComponentLibrary) ?? [];
      children.push(row);
      childrenByBaseLibrary.set(baseComponentLibrary, children);
    }

    return {
      key: category.key,
      label: category.label,
      classCount: category.rows.length,
      items: category.rows
        .filter((row) => !nestedLibraries.has(String(row?.componentLibrary ?? "").trim().toLowerCase()))
        .map((row) => ({
          row,
          children: childrenByBaseLibrary.get(String(row?.componentLibrary ?? "").trim().toLowerCase()) ?? []
        }))
    };
  });
}

export function eDeviceInterfaceDefinitionSignature(rows: readonly any[] = []) {
  const normalizedRows = (rows ?? []).map((row) => ({
    componentLibrary: String(row?.componentLibrary ?? "").trim(),
    exportEnabled: Boolean(row?.exportEnabled),
    exportName: String(row?.exportName ?? row?.componentLibrary ?? "").trim(),
    fields: (row?.fields ?? [])
      .map((field: any) => ({
        sourceName: String(field?.sourceName ?? "").trim(),
        exportEnabled: Boolean(field?.exportEnabled),
        exportName: String(field?.exportName ?? field?.sourceName ?? "").trim()
      }))
      .sort((left: any, right: any) => left.sourceName.localeCompare(right.sourceName))
  }));
  normalizedRows.sort((left, right) => left.componentLibrary.localeCompare(right.componentLibrary));
  return JSON.stringify(normalizedRows);
}

export function eDeviceInterfaceClassDefinitionSignature(row: any) {
  if (!row) {
    return "";
  }
  return JSON.stringify({
    componentLibrary: String(row.componentLibrary ?? "").trim(),
    exportEnabled: Boolean(row.exportEnabled),
    exportName: String(row.exportName ?? row.componentLibrary ?? "").trim(),
    fields: (row.fields ?? [])
      .map((field: any) => ({
        sourceName: String(field?.sourceName ?? "").trim(),
        exportEnabled: Boolean(field?.exportEnabled),
        exportName: String(field?.exportName ?? field?.sourceName ?? "").trim()
      }))
      .sort((left: any, right: any) => left.sourceName.localeCompare(right.sourceName))
  });
}

export function eDeviceInterfaceFieldDefinitionMatches(left: any, right: any) {
  if (!left || !right) {
    return false;
  }
  return (
    String(left.sourceName ?? "").trim() === String(right.sourceName ?? "").trim() &&
    Boolean(left.exportEnabled) === Boolean(right.exportEnabled) &&
    String(left.exportName ?? left.sourceName ?? "").trim() ===
      String(right.exportName ?? right.sourceName ?? "").trim()
  );
}

export function customDeviceDefinitionUsesIconOnly(selection: any, draft: any) {
  if (selection?.kind !== "component") {
    return false;
  }
  const categoryLibraryName = String(selection?.categoryLibraryName ?? draft?.categoryLibraryName ?? "").trim();
  const templateKind = String(selection?.templateKind ?? draft?.componentKind ?? "").trim().toLowerCase();
  return categoryLibraryName === "静态图元" || templateKind.startsWith("static-");
}

export function resolveDeviceDefinitionParameterRowsForDisplay<T extends { enName?: unknown }>(
  rows: readonly T[] = [],
  allowedRows?: readonly { enName?: unknown }[] | null,
  options: {
    baseComponentLibrary?: string;
    isDerivedComponentBaseParamName?: (fieldName: unknown, baseComponentLibrary?: string) => boolean;
  } = {}
): T[] {
  if (typeof options.isDerivedComponentBaseParamName === "function") {
    return rows.filter((row) => {
      const enName = String(row.enName ?? "").trim();
      if (!enName) {
        return true;
      }
      return !options.isDerivedComponentBaseParamName?.(enName, options.baseComponentLibrary);
    });
  }
  if (!allowedRows || allowedRows.length === 0) {
    return [...rows];
  }
  const allowedNames = new Set(
    allowedRows.map((row) => String(row.enName ?? "").trim()).filter(Boolean)
  );
  if (allowedNames.size === 0) {
    return [...rows];
  }
  return rows.filter((row) => {
    const enName = String(row.enName ?? "").trim();
    return !enName || allowedNames.has(enName);
  });
}

export function resolveCustomDeviceParameterRowsForDisplay<T extends { enName?: unknown }>(
  defaultRows: readonly T[] = [],
  customRows: readonly T[] = [],
  options: {
    isDerivedComponentLibrary?: boolean;
    baseComponentLibrary?: string;
    isDerivedComponentBaseParamName?: (fieldName: unknown, baseComponentLibrary?: string) => boolean;
  } = {}
): { defaultRows: T[]; customRows: T[] } {
  const isHiddenDerivedBaseRow = (row: T) => {
    const enName = String(row.enName ?? "").trim();
    return Boolean(
      enName &&
        options.isDerivedComponentLibrary &&
        typeof options.isDerivedComponentBaseParamName === "function" &&
        options.isDerivedComponentBaseParamName(enName, options.baseComponentLibrary)
    );
  };
  return {
    defaultRows: defaultRows.filter((row) => !isHiddenDerivedBaseRow(row)),
    customRows: customRows.filter((row) => !isHiddenDerivedBaseRow(row))
  };
}

export function resolveInspectorGraphId(nodes: any[], node: any) {
  return buildExportDeviceIdMap(nodes, new Set<string>()).get(node.id) ?? node.id;
}

// 运行时态 WS 指示灯：open=绿、connecting=黄、closed=灰；收发消息时闪烁一次。
// runtimeWsBlinkSeq 递增 → key 变化 → 重放 blink 动画。
// 悬浮提示「点击复制 clientId」，点击复制当前页面 clientId 到剪贴板。
function RuntimeWsIndicator({ __appScope }: { __appScope: Record<string, any> }) {
  const status = __appScope.runtimeWsStatus ?? "connecting";
  const blinkSeq = __appScope.runtimeWsBlinkSeq ?? 0;
  const clientId = __appScope.runtimeWsClientId ?? "";
  const [copied, setCopied] = useState(false);
  const color = status === "open" ? "#22c55e" : status === "connecting" ? "#f59e0b" : "#9ca3af";
  const label = status === "open" ? "运行时态 WS 已连接" : status === "connecting" ? "运行时态 WS 连接中" : "运行时态 WS 已断开";
  const copyClientId = async () => {
    if (!clientId) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(clientId);
      ok = true;
    } catch {
      // clipboard API 不可用（非 HTTPS/非聚焦），回退选区
      try {
        const ta = document.createElement("textarea");
        ta.value = clientId;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* 忽略 */
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 10, padding: "0 8px", fontSize: 12, color: "#6b7280", cursor: clientId ? "pointer" : "default", userSelect: "none", position: "relative" }}
      title={clientId ? `点击复制 clientId：${clientId}` : label}
      onClick={copyClientId}
    >
      <span key={blinkSeq} style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        animation: "runtime-ws-blink 0.6s ease-out"
      }}/>
      <span>RT-WS</span>
      {copied && (
        <span style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 6,
          background: "#22c55e",
          color: "#fff",
          padding: "3px 10px",
          borderRadius: 4,
          fontSize: 12,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
          pointerEvents: "none"
        }}>已复制</span>
      )}
      <style>{`@keyframes runtime-ws-blink { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.8); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </span>
  );
}

export function renderAppView(__appScope: Record<string, any>) {
  const { confirmLibraryPackageDialog, closeLibraryPackageDialog, libraryPackageDialogMode, libraryPackageDialogOpen, libraryPackageDialogScope, libraryPackageDialogScopeOptions, openLibraryPackageDialog, requestCloseCustomDeviceDialog, setExpandedDefinitionGroups, setCollapsedDefinitionComponentLibraries, setLibraryPackageDialogMode, setLibraryPackageDialogScope } = __appScope;
  const { ALLOW_RESIZE_TRANSFORM_PARAM, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, Bell, Bold, BoxSelect, BufferedTextInput, BufferedTextarea, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_WIDTH, CONNECTION_REDRAW_SCOPE_LABELS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, CURRENT_UNIT_OPTIONS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, Cable, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, CircleDot, Copy, CustomComponentManagerTree, DEFAULT_CANVAS_BACKGROUND, DEFAULT_COLOR_PALETTE, DEFAULT_DEVICE_LABEL_FONT_SIZE, DEFAULT_MODEL_LAYER_ID, DEFAULT_POWER_BASE_VALUE, DeferredColorInput, Download, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, ENABLE_REACT_FLOW_PREVIEW, ENERGY_COLOR_ROWS, Eye, EyeOff, FileInput, FileJson, FlipHorizontal, FlipVertical, FolderOpen, Fragment, GROUP_SCALE_HANDLE_CONFIGS, Grid2X2, Group, Italic, Layers, Layers2, LocateFixed, MAX_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CUSTOM_DEVICE_TERMINALS, MIN_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MapIcon, Maximize2, MemoDeviceGlyph, Minus, PARAM_LABELS, PARAM_VALUE_TYPE_OPTIONS, POWER_UNIT_OPTIONS, Paintbrush, Palette, Pencil, Plus, READONLY_E_PARAM_KEYS, ReactFlowPreview, RotateCcw, RotateCw, Route, SCALE_HANDLE_CONFIGS, STATIC_ROUTE_AVOIDANCE_PARAM, Save, ScanSearch, Scissors, Search, Suspense, SvgMarkupChunk, TERMINAL_TYPE_LIBRARY_LABELS, TERMINAL_TYPE_OPTIONS, TOPOLOGY_WARNING_PAGE_SIZE, TRANSFORM_ROTATE_HANDLE_GAP, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_STEM_START, TextStyleToggleButton, Trash2, Type, Underline, Undo2, Ungroup, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_UNIT_OPTIONS, X, Zap, ZapOff, activateInspectorFromCanvas, activeDropHintPoint, activeDropHintStyle, activeDropReady, activeImageFolderId, activeLayer, activeLayerEdgeIdSet, activeLayerId, activeLayerNodeIdSet, activeLayerNodes, activeModelPathName, activeProjectKey, activeSchemeKey, activeSelectedEdgeSet, activeSelectedNodeIds, activeVoltageBaseTerminalKey, activeVoltageBaseTerminalRow, addCustomDeviceStateDraftRow, addDefaultMeasurementsToNode, addDefinitionDraftRow, addManualBendFromContextMenu, addRoutableLineBendFromContextMenu, addStateIconDrawingElement, addVoltageColorRow, adjustSelectedDisplayLayer, alignSelected, allowAutoExpandCanvas, appShellStyle, appendConnectPreviewManualPoint, appendRoutableLinePreviewManualPoint, appendStaticDrawingPoint, applyConnectPreviewState, applyExistingImage, applyLayerAssignmentDialog, applyRoutableLinePreviewState, applyStateIconDrawingDialog, aside, assignSelectedNodesToModelLayer, categoryLibraryComponentLibraryKey, categoryLibraryOptionClass, autoAlignCanvasGraphics, autoSpreadCanvasGraphics, backgroundLayerIds, backgroundLayerOptions, backgroundProjectId, backgroundProjectOptions, backgroundProjectRecord, batchEditors, bindCanvasNodeElement, busEndpointColor, button, canAddTemplateFromSelection, canAdjustSelectedDisplayLayer, canConnectTerminals, canExportCurrentModel, canGroupSelectedGraphics, canUngroupSelectedGraphics, cancelLibraryPlacement, cancelModifierSelectionPress, cancelTemplateDialog, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageUrl, canvasClipboard, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasHorizontalScrollbarsActive, canvasInteractionRef, canvasRenderBounds, canvasResizeDrag, canvasResizeHandles, canvasResizeHotzoneStyle, canvasResizeHotzonesRef, canvasResizePreviewRect, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasSelectionShortcutActiveRef, canvasSizeDraft, canvasVerticalScrollbarsActive, centerSelectedInView, centerSelectedViewportTitle, chooseCustomDeviceBackground, chooseDefinitionTemplateIcon, chooseImage, chooseStateIconDrawingImport, chooseStateVisualImage, circle, clampPointToCanvas, clearLibraryPlacementPreview, clearRecordSelection, clearSelectedImage, clearSelectedImageForNode, clearStaticButtonFeedback, clipPath, closeCustomDeviceDialog, closeDeviceDefinitionDialog, code, collapsedCustomComponentTreeLibraries, collapsedCustomComponentTreeTypes, collapsedDefinitionComponentLibraries, colorDisplayMode, colorPalette, colorPaletteDialogOpen, colorPaletteDraft, colorPaletteTab, commitCanvasSizeDraft, commitLibraryPlacementAtPoint, componentLibraryDisplayParts, componentLibraryOptionClass, componentLibraryOptionsByCategoryLibrary, confirmAddGraphTemplate, confirmConnectionRedrawDialog, confirmCreateDeviceFromGroup, confirmFilterSelectionDialog, confirmReplaceDeviceIconFromGroup, confirmVoltageBaseClearDialog, confirmVoltageBaseSetDialog, connectDropHintElementRef, connectPreviewColor, connectPreviewDom, connectPreviewHandleElementRef, connectPreviewPathElementRef, connectPreviewPointRef, connectSource, connectSourceNode, connectTargetPoint, connectTargetSnapPoint, connectTerminalCompatibilityActive, connectionLineStyle, connectionRedrawDialogOpen, connectionRedrawScope, connectionRedrawTargetsForScope, consumeGraphicContextMenuHandled, contextMarqueeSelection, contextMarqueeSelectionRef, contextMeasurementGroup, contextMeasurementNode, contextMenu, contextMenuClassName, contextMenuForEdge, contextMenuForNode, contextMenuForRoutableLine, contextMenuForSelection, contextMenuFromElementTree, contextMenuRef, contextMenuStyle, contextMenuTarget, contextSelectionCount, copyProjectRecord, copySchemeRecord, copySelection, createBlankProject, createGraphTemplateType, createImageFolder, createSchemeRecord, currentCategoryLibraryComponentLibraryOptions, currentModelRecord, currentModelVoltageColorKeys, currentUnit, currentZoomPercent, customComponentTreeSearchQuery, customComponentTreeSelection, customDefaultStateSelected, customDeviceDefinitionMode, customDeviceDialogOpen, customDeviceDialogRef, customDeviceDialogView, customDeviceDraft, customDeviceImageInputRef, customDeviceMeasurementTarget, customDevicePreviewHeight, customDevicePreviewImage, customDevicePreviewSourceTemplate, customDevicePreviewWidth, customDeviceSaveMessage, customDeviceStatePageId, customDeviceTerminalAnchorDragIndex, customDeviceTerminalAnchorValue, customDeviceTerminalAnchors, customDeviceTerminalConnectorSegment, customDraftDefaultParams, customParamId, customStatePreviewText, customStatePreviewVisual, cutSelection, datalist, defaultBackgroundLayerIdsForProject, defaultComponentLibraryForCategoryLibrary, defaultContainerAssociationForTerminalType, definitionCategoryLibraryComponentLibraryOptions, definitionDraftError, definitionDraftRows, definitionDraftSection, definitionDraftSectionEditing, definitionTemplateIconInputRef, defs, deleteCustomDeviceStateDraftRow, deleteDefinitionDraftRow, deleteImageFolder, deleteManualBendPoint, deleteProjectRecord, deleteRoutableLineBendPoint, deleteSchemeRecord, deleteSelectedStateIconDrawingElements, deleteSelection, deleteStateIconDrawingElement, deleteVoltageColorRow, detailedSelectedEdgeIdSet, detailedViewportNodes, deviceDefinitionDialogOpen, deviceDefinitionDialogRef, deviceDefinitionKeyForTemplate, deviceDefinitionSearchNeedle, deviceDefinitionSearchQuery, deviceDefinitionView, deviceLabelsVisible, deviceLibraryDialogDrag, deviceLibraryDialogLayouts, deviceLibraryDialogResize, deviceLibraryDialogStyle, displayedCustomComponentTreeLibraries, displayedDeviceDefinitionLibraries, distributeSelected, div, dragAffectedEdgeIdSet, dragGhostEdgeIdSet, dragGhostEdgeRoutes, dragGhostRoutableLineNodeIdSet, dragOverlayEdgeIdSet, dragPreviewEdgeIdSet, dragPreviewEdgeRoutes, dragStateIconDrawingSelection, draggingDelta, draggingNodeIdSet, draggingRef, edgeById, edgeFloatingToolbar, edges, effectiveLeftPanelTab, em, expandedDefinitionGroups, exportEFile, exportProjectRecordFile, exportSchemeRecord, exportSvg, filterSelectionDialogOpen, filterSelectionTreeLabel, filterSelectionTypeKeys, filterSelectionTypeOptions, filterSelectionTypePartial, filterSelectionTypeSelected, filteredCustomComponentTreeByComponentLibrary, filteredDeviceDefinitionByComponentLibrary, findConnectTargetAtPoint, findConnectionRouteHitAtPoint, findRewireTargetAtPoint, findRoutableLineEndpointTargetAtPoint, findSavedSchemeById, finishCanvasPanning, finishConnectToTarget, finishInteractiveStaticDrawing, finishManualPathDrag, finishMarqueeSelection, finishMarqueeSelectionFromPoints, finishMeasurementDrag, finishModifierSelectionPress, finishNodeDrag, finishNodeLabelDrag, finishNodeLabelRotateDrag, finishRewiring, finishRoutableLineEndpointDrag, finishRoutableLineToTarget, finishTerminalPress, finishTransformDrag, fitSelectedViewportTitle, fitViewToSelection, fitWholeCanvasFromBlankDoubleClick, fitWholeCanvasToFrame, floatingToolbarIconSize, floatingToolbarWrapperStyle, flushConnectPreviewDom, focusCanvasKeyboardShortcutHost, footer, formatCustomDeviceTerminalAnchorValue, formatDeviceModelParamDisplayValue, formatInspectorScaleValue, formatSvgNumber, g, generateCustomDeviceImage, getContainerTerminalAssociationSourceIndex, getEParamValue, getEParameterKeys, getEdgeEndpointPoint, getMovableRouteSegmentIndexes, getNodeScaleX, getNodeScaleY, getTerminalDisplayColor, graphTemplateTypes, groupDeviceDefinitionDialog, groupDeviceReplacementTemplates, groupSelectedGraphics, groupTransformPreviewEdgeIdSet, groupTransformPreviewGroupId, groupTransformPreviewNodeIdSet, groupTransformPreviewRoutableLineNodeIdSet, h1, h2, h3, handleCanvasPointerDownCapture, handleDrop, handleEdgePathPointerDown, handleLodNodeContextMenu, handleLodNodeDoubleClick, handleLodNodePointerDown, handleMinimapNavigate, handleNodePointerDown, handlePointerMove, handleRoutableLineNodePathPointerDown, handleSidePanelPointerLeave, handleStaticButtonClick, handleTerminalPointerDown, handleTreeCollapseChange, handleWheel, hasBatchCommonPropertyRows, hasCanvasSelectionModifier, header, hiddenTopologyErrorCount, hideAutoPanelsFromWorkspace, image, imageAssetList, imageAssets, imageFolders, imageInputRef, imageTarget, img, imperativeMultiNodeDragOverlayRef, imperativeNodeDragDropHintRef, imperativeSingleNodeDragEdgePreviewRef, imperativeSingleNodeDragNodeOverlayRef, importModelFile, importSchemeFile, initialCanvasDetailedEdgeIdSet, insertManualBendFromEdgePath, insertManualBendFromPointer, inspectorSelectedEdge, inspectorSelectedNode, inspectorTab, inspectorTopologyErrors, isBlockingTopologyValidationError, isBrowseMode, isBuiltInCategoryLibrary, isBuiltInComponentLibrary, isBusNode, isCanvasGraphicContextMenuTarget, isContainerTerminalAssociationDependent, isDoubleContainerTerminalAssociation, isEditMode, isGroupTransformDrag, isReadonlyCanvasMode, isRepeatedEdgePointerClick, isRoutableLineDeviceKind, isStaticBoxLikeNode, isStaticButtonEnabledForNode, isStaticNode, lastCanvasClientPointerRef, lastCanvasPointerRef, lastEdgePointerClickRef, lastRawCanvasPointerRef, layerAssignmentDialogOpen, layerAssignmentTargetId, layerAssignmentUnchanged, layerManagementDropdownRef, layers, leftPanelContent, leftPanelMode, leftPanelRef, leftPanelTab, leftPanelVisible, libraryPlacement, line, loadDefinitionTemplateDraft, locateTopologyError, lodCanvasNodeChunks, lodCanvasRouteChunks, lodSelectedNodeMarkup, main, manualPathDrag, manualPathPreviewRoute, mapPointToMinimap, marquee, minimapContentHeight, minimapContentWidth, minimapNodes, minimapOffsetX, minimapOffsetY, minimapRoutes, minimapScale, minimapViewportBottom, minimapViewportLeft, minimapViewportRight, minimapViewportTop, minimapVisible, mirrorSelectedNodes, mode, modelImportInputRef, modifierSelectionPressRef, mousePositionTextRef, multiNodeDragging, nodeById, nodeDoubleClickDialogDrag, nodeDoubleClickDialogResize, nodeFloatingToolbar, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, nodeKindAllowsResizeTransform, nodeLabelDisplayMode, nodeLabelDrag, nodeLabelFontSize, nodeLabelOffset, nodeLabelRotateDrag, nodeLabelShouldRender, nodeLabelText, nodeLabelTextAnchor, nodeLabelTextStyle, nodeLabelTransform, nodeLabelVertical, nodeLabelVerticalSegments, nodeLabelVerticalTokenStyle, nodeLabelVerticalTokenY, nodeRotateHandleControlPoints, nodeScaleHandleControlPoint, nodeUprightRotateHandleControlPoints, nodeUprightSelectionOutlineRect, nodeUsesUprightStaticSelectionOutline, nodes, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, normalizeNodeLabelRotation, normalizeScale, normalizeStaticBoxDimension, normalizedTopologyWarningPage, openAddTemplateDialog, openColorPaletteDialog, openConnectionRedrawDialog, openEdgeContextMenu, openFilterSelectionDialog, openGraphicContextMenu, openGroupDeviceDefinitionDialog, openLayerAssignmentDialog, openMeasurementEditorForNode, openModelImportFilePicker, openNodeDoubleClickEditor, openSchemeImportFilePicker, openStateIconDrawingDialog, openTopologyWarningPanel, openVoltageBaseClearDialog, openVoltageBaseSetDialog, operationLogRef, operationLogStatusRef, overlappedTerminalKeys, p, panning, panningRef, paramOptionsForSection, parameterValueTypeLabelForDefinitionRow, parseCustomDefinitions, pasteProjectClipboardRecord, pasteSchemeClipboardRecord, pasteSelection, path, pattern, pendingModelImportConflict, pendingRecordPasteConflict, pendingSchemeImportConflict, pendingUnsavedAction, pointsToOrthogonalPath, polyline, powerBaseValue, powerUnit, projectById, projectListPointerInsideRef, projectMenu, projectName, pushUndoSnapshot, reactFlowPreviewOpen, recordClipboard, rect, removeMeasurementsFromNode, renameImageFolder, renameProjectRecord, renameSchemeRecord, renderBoundaryBusInternalConnector, renderDeviceDefinitionMeasurementPanel, renderDeviceDefinitionVisualPanel, renderElementTreePanel, renderEnumValuesEditor, renderGraphTemplatePreview, renderGroupTransformPhotoPreview, renderInteractiveStaticDrawingPreview, renderLayerManager, renderLibraryPlacementPreview, renderMeasurementConfigDialog, renderMeasurementEditorDialog, renderMeasurementGroup, renderMultiNodeDragOverlay, renderNodeDoubleClickDialog, renderNodePreviewImageContent, renderReadonlyBackgroundPage, renderSelectedNodeMeasurementTable, renderSidePanelEdgeTrigger, renderSidePanelModeControls, renderSingleTransformRotateOriginGhost, renderStateVisualPager, renderTransformRotationTrajectory, renderTypicalValueEditor, renderViewportRoutedEdges, resetConnectPreviewState, resetDeviceDefinitionDraft, revertCustomDeviceDraftCurrentTab, revertCustomDeviceDraftAll, resetEnergyColors, resetRoutableLinePreviewState, resetViewportZoom, resetVoltageColors, resizeSizeHint, resolveConnectPreviewPoint, resolveDuplicateModelImport, resolveDuplicateSchemeImport, resolveNodeStateVisual, resolveRecordPasteConflict, resolveRoutableLinePreviewPoint, resolveTemplateComponentLibrary, resolveUnsavedChangeAction, rewiring, rewiringPreviewRoute, rightPanelMode, rightPanelRef, rightPanelVisible, rotateSelectedLayoutUnits, routableLineActiveTerminalType, routableLineDeviceCanvasPoints, routableLineDeviceRenderLocalPoints, routableLineEndpointDrag, routableLineEndpointDragColor, routableLineEndpointDragPreviewRoute, routableLineEndpointHandles, routableLinePlacement, routableLinePlacementColor, routableLinePreview, routableLineTerminalCompatibilityActive, runContextMenuAction, runTopologyCalculation, sameOptionalPoint, saveColorPalette, saveCurrentProject, saveCustomDeviceDefinitionDialog, saveDeviceDefinitionDraft, saveRequired, scaleHandleCursorClass, scheduleRoutableLinePreviewPoint, schemeImportInputRef, schemes, screenToSvgPoint, select, selectCanvasGraphics, selectCustomCategoryLibrary, selectCustomComponentTemplate, selectCustomComponentLibrary, selectableCategoryLibraries, selectedContainerParameterView, selectedContainerParameterViews, selectedCount, selectedDefinitionBaseTemplate, selectedDefinitionTemplate, selectedDefinitionTerminalAssociations, selectedDeviceInfoView, selectedEdge, selectedLayoutUnitCount, selectedNodeCount, selectedNodeId, selectedNodeIdSet, selectedNodeTransformStatus, selectedRoutableLineManualPathRoute, selectedRoutedEdge, selectedSchemeRecord, selectedTransformGroupUnit, selectedViewportActionDisabled, selectionRectCenter, setActiveImageFolderId, setActiveVoltageBaseTerminalKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasSelectionScope, setColorPaletteDialogOpen, setColorPaletteTab, setConnectSource, setConnectionRedrawDialogOpen, setConnectionRedrawScope, setContainerParamViewId, setContextMarqueeSelection, setContextMenu, setCurrentUnit, setCustomComponentTreeSearchQuery, setCustomComponentTreeSelection, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceStatePageId, setCustomDeviceTerminalAnchorDragIndex, setDefinitionDraftError, setDefinitionDraftSection, setDefinitionDraftSectionEditing, setDeviceDefinitionSearchQuery, setDeviceDefinitionView, setDeviceLabelsVisible, setFilterSelectionDialogOpen, setFilterSelectionTypeKeys, setGroupDeviceDefinitionDialog, setImageTarget, setInspectorTab, setLayerAssignmentDialogOpen, setLayerAssignmentTargetId, setLeftPanelTab, setMarquee, setMinimapVisible, setMode, setPowerBaseValue, setPowerUnit, setReactFlowPreviewOpen, setRewiring, setRoutableLineEndpointDrag, setRoutableLinePlacement, setSelectedDeviceInfoView, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSelectedNodeLabelDisplayMode, setSelectedProjectId, setSelectedProjectIds, setSelectedSchemeId, setSelectedSchemeIds, setSmartAlignmentEnabled, setStateIconDrawingDialog, setStateIconDrawingImportMode, setStateImageUploadTarget, setStaticButtonFeedback, setTemplateDraftName, setTemplateDraftType, setTerminalPress, setTopologyWarningPage, setTopologyWarningPanelClosed, setVoltageBaseClearDialogOpen, setVoltageBaseClearScope, setVoltageBaseSetDialogOpen, setVoltageBaseSetScope, setVoltageBaseSetValue, setVoltageBaseTerminalValue, setVoltageColorVisibility, setVoltageUnit, sidePanelResize, singleNodeDragging, singleSelectedDeviceForInspector, small, smartAlignmentEnabled, smartAlignmentGuides, sourceSelectClassName, span, startCanvasPanning, startCanvasResize, startCanvasResizeFromBottomOverlay, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, startCanvasResizeFromTopOverlay, startContextMarqueeSelection, startDeviceLibraryDialogDrag, startDeviceLibraryDialogResize, startGroupMoveDrag, startGroupTransformDrag, startManualPointDrag, startManualSegmentDrag, startModifierSelectionPress, startNodeLabelDrag, startNodeLabelRotateDrag, startRoutableLineEndpointDrag, startRoutableLineFromTerminal, startRoutableLinePointDrag, startRoutableLineSegmentDrag, startSidePanelResize, startSingleTransformDrag, startStateIconDrawingDrag, startStatusbarResize, startTopologyWarningPanelDrag, startTopologyWarningPanelResize, stateIconDrawingDialog, stateIconDrawingImportInputRef, stateIconDrawingKeyDown, stateIconDrawingSelection, stateIconDrawingSvgRef, stateIconDrawingToImage, stateVisualImageInputRef, stateVisualShapeLabel, staticButtonPointerRef, staticButtonVisual, staticDrawing, staticNodeParticipatesInRoutingAvoidance, statusbarResize, stopDeviceLibraryDialogEvent, stopSidePanelEventPropagation, stopStateIconDrawingDrag, strong, svgRef, svgStrokeDashArray, switchInspectorTabForCanvasSelection, table, tbody, td, templateDialog, templateDraftName, templateDraftType, templateResizeTransformValue, terminalColor, terminalPressPreviewEdgeIdSet, terminalPressPreviewEdgeRoutes, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, terminalVbaseFallback, terminalVoltageBaseNumber, text, th, thead, tidyRoutableLineRoute, tidySelectedEdgeRoute, title, toggleBackgroundLayer, toggleColorDisplayMode, toggleDefinitionComponentLibrary, toggleDefinitionGroup, toggleFilterSelectionItem, toggleFilterSelectionType, toggleInteractionMode, toggleSelectedNodeLabelDisplay, topology, topologyErrors, topologyStatus, topologyWarningDisplayMessage, topologyWarningPageCount, topologyWarningPanelClosed, topologyWarningPanelRef, topologyWarningPanelResize, topologyWarningPanelStyle, topologyWarningPanelVisible, tr, transformDrag, undoLastOperation, undoStack, ungroupSelectedGraphics, updateAutoPanelVisibility, updateCustomDeviceStateDraftRow, updateCustomDeviceTerminalAnchor, updateCustomDeviceTerminalAnchorFromPreview, updateCustomDraftTerminalCount, updateDefinitionDraftRow, updateEnergyColor, updateLibraryPlacementPreview, updateMouseStatus, updateParam, updateSelectedDefinitionResizePermission, updateSelectedNode, updateStateIconDrawingElement, updateTerminalVbase, updateVoltageColorRow, useSimplifiedCanvasNodes, useSimplifiedCanvasRoutes, useSimplifiedSelectedCanvasNodes, viewportOverlayStyle, visibleEdges, visibleMeasurementGroups, visibleNodes, visibleSelectedGroupLayoutUnits, visibleStateIconColor, visibleTopologyErrors, visibleVoltageColorRows, voltageBaseClearDialogOpen, voltageBaseClearResultForScope, voltageBaseClearScope, voltageBaseSetDialogOpen, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetModeLabel, voltageBaseSetOptions, voltageBaseSetReady, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetTerminalRows, voltageBaseSetValue, voltageBaseTerminalRowKey, voltageColorVisibility, voltageUnit, warningStatusText, warningStatusTitle, zoomViewportAtCenter } = __appScope;
  const {
    confirmCustomLibraryCreateDialog,
    createCustomCategoryLibrary,
    createCustomComponentLibrary,
    clearLibraryFlyoutCloseTimer,
    customComponentLibraries,
    customGraphTemplates,
    customLibraryCreateDialog,
    deleteGraphTemplate,
    deleteGraphTemplateType,
    deleteSelectedCustomDeviceTreeItem,
    renameSelectedCustomDeviceTreeItem,
    scheduleGraphTemplateFlyoutClose,
    setCustomLibraryCreateDialog,
    setHoveredGraphTemplateType,
    startCustomComponentCreate,
    templateMenu
  } = __appScope;
  const { dragging } = __appScope;
  const {
    customDeviceTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    setEDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    setEDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionInterfaceDialogOpen,
    setEDeviceDefinitionInterfaceDialogOpen,
    libraryTemplates,
    persistDeviceLibraryChange,
    setCustomDeviceTemplates,
    setDeviceDefinitionOverrides,
    updateDefinitionComponentLibraryCommonParamExport,
    writeOperationLog
  } = __appScope;
  const { globalMessage } = __appScope;
  // 选中元件库节点（"元件定义"对话框）时：计算该库共有参数（enName 交集，排除 dev_type）+ E 文件标签 key
  const componentLibrarySectionKey = customComponentTreeSelection?.kind === "componentLibrary" ? normalizeComponentLibraryName(customComponentTreeSelection?.section ?? "") : "";
  const componentLibraryTemplates = componentLibrarySectionKey
    ? libraryTemplates.filter((template) => normalizeComponentLibraryName(resolveTemplateComponentLibrary(template)) === componentLibrarySectionKey)
    : [];
  const componentLibraryCommonParams = (() => {
    if (componentLibraryTemplates.length === 0) {
      return [];
    }
    const perTemplateEnNames = componentLibraryTemplates.map((template) =>
      new Set(getTemplateParameterDefinitions(template).filter((definition) => definition.enName !== "dev_type").map((definition) => definition.enName))
    );
    const intersection = perTemplateEnNames.reduce(
      (acc, set) => new Set(Array.from(acc).filter((name) => set.has(name))),
      perTemplateEnNames[0]
    );
    const firstTemplate = componentLibraryTemplates[0];
    const firstDefinitions = getTemplateParameterDefinitions(firstTemplate);
    return Array.from(intersection).map((enName) => {
      const definition = firstDefinitions.find((item) => item.enName === enName);
      const settings = definition ? resolveDeviceParameterDefinitionExportSettings(firstTemplate.kind, firstTemplate.params ?? {}, definition) : { exportEnabled: false, exportName: enName };
      const rawCn = definition?.cnName ?? enName;
      return { enName, cnName: rawCn === enName ? PARAM_LABELS[enName] ?? rawCn : rawCn, exportEnabled: Boolean(settings.exportEnabled), exportName: settings.exportName ?? enName };
    });
  })();
  const componentLibraryLabelKey = componentLibraryTemplates.length > 0
    ? inferESection(componentLibraryTemplates[0].kind, componentLibraryTemplates[0].params ?? {})
    : componentLibrarySectionKey;
  const componentLibraryLabelValue = eDeviceDefinitionLabels[componentLibraryLabelKey] ?? componentLibraryLabelKey;
  const eDeviceInterfaceDefinitionRows = buildEDeviceInterfaceDefinitionRows({
    libraryTemplates,
    labels: PARAM_LABELS,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
  });
  const [selectedEDeviceInterfaceComponentLibrary, setSelectedEDeviceInterfaceComponentLibrary] = useState("");
  const [collapsedEDeviceInterfaceTreeNodes, setCollapsedEDeviceInterfaceTreeNodes] = useState<Record<string, boolean>>({});
  const [eDeviceInterfaceDefinitionBaseline, setEDeviceInterfaceDefinitionBaseline] = useState<any>(null);
  const [eDeviceInterfaceSelectedClassBaseline, setEDeviceInterfaceSelectedClassBaseline] = useState<any>(null);
  const [eDeviceInterfaceClassSwitchTarget, setEDeviceInterfaceClassSwitchTarget] = useState("");
  const [eDeviceInterfaceExitPromptOpen, setEDeviceInterfaceExitPromptOpen] = useState(false);
  const eDeviceInterfaceSaveRef = useRef<(options?: { closeAfterSave?: boolean }) => void>(() => undefined);
  const eDeviceInterfaceExportFileRef = useRef<() => void>(() => undefined);
  const eDeviceInterfaceSaveAndSwitchRef = useRef<() => void>(() => undefined);
  const eDeviceInterfaceClassSelectRef = useRef<(componentLibrary: string) => void>(() => undefined);
  const selectedEDeviceInterfaceRow =
    eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === selectedEDeviceInterfaceComponentLibrary) ??
    eDeviceInterfaceDefinitionRows[0] ??
    null;
  const eDeviceInterfaceClassSwitchTargetRow =
    eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === eDeviceInterfaceClassSwitchTarget) ??
    null;
  const eDeviceInterfaceDefinitionTree = buildEDeviceInterfaceDefinitionTree(eDeviceInterfaceDefinitionRows);
  const eDeviceInterfaceCurrentSignature = eDeviceInterfaceDefinitionSignature(eDeviceInterfaceDefinitionRows);
  const eDeviceInterfaceHasUnsavedChanges = Boolean(
    eDeviceInterfaceDefinitionBaseline &&
    eDeviceInterfaceDefinitionBaseline.signature !== eDeviceInterfaceCurrentSignature
  );
  const eDeviceInterfaceSelectedClassSignature = eDeviceInterfaceClassDefinitionSignature(selectedEDeviceInterfaceRow);
  const eDeviceInterfaceSelectedClassHasUnsavedChanges = Boolean(
    selectedEDeviceInterfaceRow &&
    eDeviceInterfaceSelectedClassBaseline?.componentLibrary === selectedEDeviceInterfaceRow.componentLibrary &&
    eDeviceInterfaceSelectedClassBaseline.signature !== eDeviceInterfaceSelectedClassSignature
  );
  const captureEDeviceInterfaceClassBaseline = (row: any) => {
    if (!row) {
      return null;
    }
    const componentLibrary = String(row.componentLibrary ?? "").trim();
    const hasLabelOverride = Object.prototype.hasOwnProperty.call(eDeviceDefinitionLabels, componentLibrary);
    const hasClassExportOverride = Object.prototype.hasOwnProperty.call(eDeviceDefinitionClassExportEnabled, componentLibrary);
    const rowSnapshot = {
      componentLibrary,
      exportEnabled: Boolean(row.exportEnabled),
      exportName: String(row.exportName ?? componentLibrary).trim(),
      fields: (row.fields ?? []).map((field: any) => ({
        sourceName: String(field?.sourceName ?? "").trim(),
        exportEnabled: Boolean(field?.exportEnabled),
        exportName: String(field?.exportName ?? field?.sourceName ?? "").trim()
      }))
    };
    return {
      componentLibrary,
      signature: eDeviceInterfaceClassDefinitionSignature(rowSnapshot),
      row: rowSnapshot,
      labelOverride: hasLabelOverride ? eDeviceDefinitionLabels[componentLibrary] : undefined,
      classExportOverride: hasClassExportOverride ? eDeviceDefinitionClassExportEnabled[componentLibrary] : undefined
    };
  };
  const captureEDeviceInterfaceDefinitionSnapshot = () => ({
    signature: eDeviceInterfaceCurrentSignature,
    customDeviceTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled
  });
  const runAfterEDeviceInterfaceInputCommit = (callback: () => void) => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest(".e-device-interface-dialog")) {
      activeElement.blur();
    }
    window.setTimeout(callback, 0);
  };
  const closeEDeviceInterfaceDefinition = () => {
    setEDeviceInterfaceClassSwitchTarget("");
    setEDeviceInterfaceExitPromptOpen(false);
    setEDeviceDefinitionInterfaceDialogOpen(false);
  };
  const saveEDeviceInterfaceDefinition = (options: { closeAfterSave?: boolean } = {}) => {
    const snapshot = captureEDeviceInterfaceDefinitionSnapshot();
    persistDeviceLibraryChange?.({
      customDeviceTemplates: snapshot.customDeviceTemplates,
      deviceDefinitionOverrides: snapshot.deviceDefinitionOverrides,
      eDeviceDefinitionLabels: snapshot.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: snapshot.eDeviceDefinitionClassExportEnabled
    }, {
      failure: "E文件接口定义保存到后台失败"
    });
    setEDeviceInterfaceDefinitionBaseline(snapshot);
    setEDeviceInterfaceSelectedClassBaseline(captureEDeviceInterfaceClassBaseline(selectedEDeviceInterfaceRow));
    setEDeviceInterfaceExitPromptOpen(false);
    writeOperationLog?.("E文件接口定义已保存");
    if (options.closeAfterSave) {
      setEDeviceDefinitionInterfaceDialogOpen(false);
    }
  };
  eDeviceInterfaceSaveRef.current = saveEDeviceInterfaceDefinition;
  eDeviceInterfaceExportFileRef.current = __appScope.exportEDeviceDefinitionFile ?? (() => undefined);
  const requestSaveEDeviceInterfaceDefinition = (options: { closeAfterSave?: boolean } = {}) => {
    runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceSaveRef.current(options));
  };
  const requestExportEDeviceInterfaceDefinitionFile = () => {
    runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceExportFileRef.current());
  };
  const selectEDeviceInterfaceComponentLibrary = (componentLibrary: string) => {
    const targetRow = eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === componentLibrary);
    if (!targetRow) {
      setEDeviceInterfaceClassSwitchTarget("");
      return;
    }
    setSelectedEDeviceInterfaceComponentLibrary(componentLibrary);
    setEDeviceInterfaceSelectedClassBaseline(captureEDeviceInterfaceClassBaseline(targetRow));
    setEDeviceInterfaceClassSwitchTarget("");
  };
  const restoreEDeviceInterfaceSelectedClass = () => {
    const baseline = eDeviceInterfaceSelectedClassBaseline;
    if (!baseline?.row?.componentLibrary) {
      return;
    }
    const componentLibrary = baseline.row.componentLibrary;
    const currentRow = eDeviceInterfaceDefinitionRows.find((row) => row.componentLibrary === componentLibrary);
    setEDeviceDefinitionLabels((current) => {
      const next = { ...current };
      if (baseline.labelOverride === undefined) {
        delete next[componentLibrary];
      } else {
        next[componentLibrary] = baseline.labelOverride;
      }
      return next;
    });
    setEDeviceDefinitionClassExportEnabled((current) => {
      const next = { ...current };
      if (baseline.classExportOverride === undefined) {
        delete next[componentLibrary];
      } else {
        next[componentLibrary] = baseline.classExportOverride;
      }
      return next;
    });
    for (const field of baseline.row.fields ?? []) {
      const currentField = currentRow?.fields?.find((item: any) => item.sourceName === field.sourceName);
      if (!field.sourceName || eDeviceInterfaceFieldDefinitionMatches(currentField, field)) {
        continue;
      }
      updateDefinitionComponentLibraryCommonParamExport(componentLibrary, field.sourceName, {
        exportEnabled: field.exportEnabled,
        exportName: field.exportName
      });
    }
  };
  const discardEDeviceInterfaceClassAndSwitch = () => {
    const target = eDeviceInterfaceClassSwitchTarget;
    restoreEDeviceInterfaceSelectedClass();
    if (target) {
      selectEDeviceInterfaceComponentLibrary(target);
    }
    writeOperationLog?.("已放弃当前设备类的E文件接口定义修改");
  };
  const saveEDeviceInterfaceClassAndSwitch = () => {
    const target = eDeviceInterfaceClassSwitchTarget;
    saveEDeviceInterfaceDefinition();
    if (target) {
      selectEDeviceInterfaceComponentLibrary(target);
    }
  };
  eDeviceInterfaceSaveAndSwitchRef.current = saveEDeviceInterfaceClassAndSwitch;
  eDeviceInterfaceClassSelectRef.current = (componentLibrary: string) => {
    if (!componentLibrary || componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary) {
      setEDeviceInterfaceClassSwitchTarget("");
      return;
    }
    if (eDeviceInterfaceSelectedClassHasUnsavedChanges) {
      setEDeviceInterfaceClassSwitchTarget(componentLibrary);
      return;
    }
    selectEDeviceInterfaceComponentLibrary(componentLibrary);
  };
  const requestSelectEDeviceInterfaceComponentLibrary = (componentLibrary: string) => {
    runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceClassSelectRef.current(componentLibrary));
  };
  const discardEDeviceInterfaceDefinitionChanges = () => {
    const baseline = eDeviceInterfaceDefinitionBaseline;
    if (baseline) {
      setCustomDeviceTemplates(baseline.customDeviceTemplates);
      setDeviceDefinitionOverrides(baseline.deviceDefinitionOverrides);
      setEDeviceDefinitionLabels(baseline.eDeviceDefinitionLabels);
      setEDeviceDefinitionClassExportEnabled(baseline.eDeviceDefinitionClassExportEnabled);
      persistDeviceLibraryChange?.({
        customDeviceTemplates: baseline.customDeviceTemplates,
        deviceDefinitionOverrides: baseline.deviceDefinitionOverrides,
        eDeviceDefinitionLabels: baseline.eDeviceDefinitionLabels,
        eDeviceDefinitionClassExportEnabled: baseline.eDeviceDefinitionClassExportEnabled
      }, {
        failure: "放弃E文件接口定义修改时恢复后台数据失败"
      });
    }
    writeOperationLog?.("已放弃E文件接口定义的未保存修改");
    closeEDeviceInterfaceDefinition();
  };
  const requestCloseEDeviceInterfaceDefinition = () => {
    if (eDeviceInterfaceHasUnsavedChanges) {
      setEDeviceInterfaceExitPromptOpen(true);
      return;
    }
    closeEDeviceInterfaceDefinition();
  };
  useEffect(() => {
    if (eDeviceDefinitionInterfaceDialogOpen) {
      setEDeviceInterfaceDefinitionBaseline((current: any) => current ?? captureEDeviceInterfaceDefinitionSnapshot());
      setEDeviceInterfaceSelectedClassBaseline((current: any) =>
        current?.componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary
          ? current
          : captureEDeviceInterfaceClassBaseline(selectedEDeviceInterfaceRow)
      );
      return;
    }
    setEDeviceInterfaceDefinitionBaseline(null);
    setEDeviceInterfaceSelectedClassBaseline(null);
    setEDeviceInterfaceClassSwitchTarget("");
    setEDeviceInterfaceExitPromptOpen(false);
  }, [eDeviceDefinitionInterfaceDialogOpen]);
  useEffect(() => {
    if (!eDeviceDefinitionInterfaceDialogOpen) {
      return undefined;
    }
    const handleEDeviceInterfaceShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        runAfterEDeviceInterfaceInputCommit(() => {
          if (eDeviceInterfaceClassSwitchTarget) {
            eDeviceInterfaceSaveAndSwitchRef.current();
            return;
          }
          eDeviceInterfaceSaveRef.current({ closeAfterSave: eDeviceInterfaceExitPromptOpen });
        });
      }
    };
    window.addEventListener("keydown", handleEDeviceInterfaceShortcut);
    return () => window.removeEventListener("keydown", handleEDeviceInterfaceShortcut);
  }, [
    eDeviceDefinitionInterfaceDialogOpen,
    eDeviceInterfaceClassSwitchTarget,
    eDeviceInterfaceExitPromptOpen,
    eDeviceInterfaceHasUnsavedChanges,
    eDeviceInterfaceCurrentSignature,
    customDeviceTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled
  ]);
  const toggleEDeviceInterfaceTreeNode = (key: string) => {
    setCollapsedEDeviceInterfaceTreeNodes((current) => ({
      ...current,
      [key]: !current[key]
    }));
  };
  const {
    applyIconLibraryCatalogIcon,
    deleteImageAssetFromContextMenu,
    iconLibraryPicker,
    imageAssetContextMenu,
    imagePickerCategoryFilter,
    imagePickerSearchQuery,
    imagePickerSourceFilter,
    setIconLibraryPicker,
    setImageAssetContextMenu,
    setImagePickerCategoryFilter,
    setImagePickerSearchQuery,
    setImagePickerSourceFilter
  } = __appScope;
  const { customDevicePreviewNode } = __appScope;
  const selectedDefinitionDerivedInfo = selectedDefinitionTemplate
    ? templateDerivedComponentLibraryInfo(selectedDefinitionTemplate)
    : null;
  const definitionDraftRowsForDisplay = selectedDefinitionTemplate && selectedDefinitionDerivedInfo && typeof __appScope.createDefinitionDraftRows === "function"
    ? resolveDeviceDefinitionParameterRowsForDisplay(definitionDraftRows, __appScope.createDefinitionDraftRows(selectedDefinitionTemplate), {
        baseComponentLibrary: selectedDefinitionDerivedInfo.baseComponentLibrary,
        isDerivedComponentBaseParamName: __appScope.isDerivedComponentBaseParamName
      })
    : definitionDraftRows;
  const customDeviceDerivedBaseLibrary = normalizeComponentLibraryName(
    customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary || ""
  );
  const derivedComponentLibraryOptionMap = new Map<string, { name: string; label: string; base: string; categoryLibraryName: string }>();
  for (const item of customComponentLibraries ?? []) {
    const name = normalizeComponentLibraryName(item.name ?? "");
    const base = normalizeComponentLibraryName(item.derivedFromComponentLibrary ?? "");
    const categoryLibraryName = normalizeCategoryLibraryName(item.categoryLibraryName ?? "");
    if (!name || !base || !item.isDerivedComponentLibrary) {
      continue;
    }
    derivedComponentLibraryOptionMap.set(`${categoryLibraryName.toLowerCase()}::${name.toLowerCase()}`, { name, label: String(item.label ?? "").trim(), base, categoryLibraryName });
  }
  for (const template of libraryTemplates ?? []) {
    const info = templateDerivedComponentLibraryInfo(template);
    if (!info) {
      continue;
    }
    const name = normalizeComponentLibraryName(info.derivedComponentLibrary);
    const base = normalizeComponentLibraryName(info.componentLibrary || info.baseComponentLibrary);
    const categoryLibraryName = normalizeCategoryLibraryName(info.categoryLibrary || template.categoryLibrary || "");
    if (!name || !base) {
      continue;
    }
    const key = `${categoryLibraryName.toLowerCase()}::${name.toLowerCase()}`;
    if (!derivedComponentLibraryOptionMap.has(key)) {
      derivedComponentLibraryOptionMap.set(key, { name, label: info.label, base, categoryLibraryName });
    }
  }
  const derivedComponentLibraryOptionsFor = (categoryLibraryName: string, baseComponentLibrary: string) => Array.from(derivedComponentLibraryOptionMap.values())
    .filter((item) => normalizeCategoryLibraryName(item.categoryLibraryName).toLowerCase() === normalizeCategoryLibraryName(categoryLibraryName).toLowerCase())
    .filter((item) => !baseComponentLibrary || item.base.toLowerCase() === baseComponentLibrary.toLowerCase())
    .sort((a, b) => a.name.localeCompare(b.name));
  const currentCategoryDerivedComponentLibraryNameSet = new Set(
    derivedComponentLibraryOptionsFor(customDeviceDraft.categoryLibraryName, "")
      .map((item) => item.name.toLowerCase())
  );
  const customDeviceBaseComponentLibraryOptions = customDeviceDraft.isDerivedComponentLibrary
    ? currentCategoryLibraryComponentLibraryOptions.filter((section) => !currentCategoryDerivedComponentLibraryNameSet.has(normalizeComponentLibraryName(section).toLowerCase()))
    : currentCategoryLibraryComponentLibraryOptions;
  const customLibraryCreateDialogCategoryLibraryName = normalizeCategoryLibraryName(
    customLibraryCreateDialog?.categoryLibraryName || customDeviceDraft.categoryLibraryName || ""
  );
  const customLibraryCreateDialogBaseComponentLibrary = normalizeComponentLibraryName(
    customLibraryCreateDialog?.derivedFromComponentLibrary || customLibraryCreateDialog?.componentLibrary || customDeviceDerivedBaseLibrary || ""
  );
  const customLibraryCreateDialogDerivedOptions = customLibraryCreateDialog?.kind === "component"
    ? derivedComponentLibraryOptionsFor(customLibraryCreateDialogCategoryLibraryName, customLibraryCreateDialogBaseComponentLibrary)
    : [];
  const customLibraryCreateDialogSelectedDerivedComponentLibrary = normalizeComponentLibraryName(
    customLibraryCreateDialog?.derivedComponentLibrary ?? ""
  );
  const customLibraryCreateDialogDerivedSelectValue = customLibraryCreateDialogSelectedDerivedComponentLibrary &&
    customLibraryCreateDialogDerivedOptions.some((item) => item.name.toLowerCase() === customLibraryCreateDialogSelectedDerivedComponentLibrary.toLowerCase())
    ? customLibraryCreateDialogSelectedDerivedComponentLibrary
    : "__new__";
  const renderCustomDevicePreviewContent = (clipId = "custom-device-preview-clip") => {
    const fallbackPreviewNode = {
      id: "custom-device-preview-fallback",
      kind: "custom-device-preview",
      name: customDeviceDraft.componentName.trim() || customDeviceDraft.componentLibrary || "Unit",
      layerId: DEFAULT_MODEL_LAYER_ID,
      nodeNumber: "",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: { x: 0, y: 0 },
      size: { width: customDevicePreviewWidth, height: customDevicePreviewHeight },
      rotation: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      terminals: [],
      params: {
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage: "",
        backgroundImageAssetId: "",
        foregroundImage: "",
        foregroundImageAssetId: ""
      }
    };
    const previewNode = customDevicePreviewNode ?? fallbackPreviewNode;
    const previewFrameNode = {
      ...previewNode,
      size: { width: customDevicePreviewWidth, height: customDevicePreviewHeight }
    };
    const previewStateVisual = customStatePreviewVisual ?? resolveNodeStateVisual(previewFrameNode);
    const previewImageHref = customDevicePreviewImage;
    const previewForegroundHref = customDevicePreviewNode ? nodeForegroundImage(previewFrameNode) : "";
    const previewUsesStateImage = Boolean(
      customStatePreviewVisual?.image ||
      customStatePreviewVisual?.imageAssetId ||
      customStatePreviewVisual?.backgroundImage ||
      customStatePreviewVisual?.backgroundImageAssetId
    );
    const previewImageFit = normalizeImageFitMode(
      previewUsesStateImage
        ? customStatePreviewVisual?.imageFit ?? customStatePreviewVisual?.backgroundImageFit ?? "fixed"
        : customDeviceDraft.backgroundImageFit
    );
    return (
      <>
        <g className="node-geometry" transform={nodeGeometryTransform(previewFrameNode)}>
          <MemoDeviceGlyph node={previewFrameNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual}/>
          <MemoDeviceGlyph node={previewFrameNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual}/>
        </g>
        {renderNodePreviewImageContent(previewFrameNode, clipId, {
          imageHref: previewImageHref,
          foregroundImageHref: previewForegroundHref,
          imageFit: previewImageFit
        })}
      </>
    );
  };
  const keepTemplateContextMenuFlyoutOpen = (typeName?: string) => {
    if (!typeName) {
      return;
    }
    clearLibraryFlyoutCloseTimer();
    setHoveredGraphTemplateType(typeName);
  };
  const customDeviceDefinitionIconOnly = customDeviceDefinitionUsesIconOnly(customComponentTreeSelection, customDeviceDraft);
  const visibleCustomDeviceDialogView = customDeviceDefinitionIconOnly ? "icon" : customDeviceDialogView;
  useEffect(() => {
    if (customDeviceDefinitionIconOnly && customDeviceDialogView !== "icon") {
      setCustomDeviceDialogView("icon");
    }
  }, [customDeviceDefinitionIconOnly, customDeviceDialogView, setCustomDeviceDialogView]);
  const imagePickerUsesCatalogSource = imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "catalogOnly";
  const imagePickerUsesSeparateLibraryTabs = imagePickerUsesLibraryTabs(imageTarget);
  const imagePickerActiveLibraryTab: ImagePickerLibraryTab = imagePickerUsesSeparateLibraryTabs && imagePickerSourceFilter === "icon-library" ? "icon" : "image";
  const imagePickerUsesCatalogTab = imagePickerUsesSeparateLibraryTabs && imagePickerActiveLibraryTab === "icon";
  const imagePickerRendersCatalogSource = imagePickerUsesCatalogSource || imagePickerUsesCatalogTab;
  const imagePickerTitle =
    imageTarget?.kind === "canvas"
      ? "选择模型背景图片"
      : imageTarget?.kind === "stateIconFrameBackground"
        ? "选择图案背景图片"
      : imageTarget?.kind === "nodeForeground"
        ? "选择设备前景图片"
        : imageTarget?.kind === "canvasIcon"
          ? "分类图标库"
        : imagePickerUsesCatalogSource
          ? "分类图标"
          : imageTarget?.kind === "stateIconDrawing"
            ? "选择元件图标素材"
            : "选择设备图片";
  const imagePickerHint =
    imageTarget?.kind === "canvasIcon"
      ? "内置 SVG 通过下方列表选择；外部 SVG/PNG 可直接导入，文档图片/图标导入会抽取图片并将可识别矢量图形转成 SVG 素材。"
      : imagePickerUsesSeparateLibraryTabs
        ? "图片(含SVG)从后台图片库读取；图标从分类图标库读取。切换分页后再选择要应用的资源。"
      : imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "builtinOnly"
        ? "从内置 SVG 分类中选择图标，选择后插入当前元件图标编辑区。"
      : imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "externalOnly"
          ? "从已导入的外部 SVG/PNG 分类中选择图标，选择后插入当前元件图标编辑区。"
        : imagePickerUsesCatalogSource
          ? "从 icon-library 按图库和分类检索 SVG 图标；清单按需加载并缓存，选择后插入当前元件图标编辑区。"
          : imageTarget?.kind === "stateIconDrawing"
            ? "内置 SVG 通过下方列表选择；外部 SVG/PNG 可直接导入，文档图片/图标导入会抽取图片并将可识别矢量图形转成 SVG 素材。"
        : "本地图片会先上传到后台图片库；请再从后台可用图片列表中选择应用。";
  const imagePickerCanClear = imageTarget && imageTarget.kind !== "canvasIcon" && imageTarget.kind !== "stateIconDrawing";
  const imagePickerUsesIconSources = imageTarget?.kind === "canvasIcon" || (imageTarget?.kind === "stateIconDrawing" && !imagePickerUsesCatalogSource);
  const imagePickerLockedSourceMode = imageTarget?.kind === "stateIconDrawing" ? imageTarget.sourceMode ?? "" : "";
  const imagePickerSourceLocked = imagePickerLockedSourceMode === "builtinOnly" || imagePickerLockedSourceMode === "externalOnly" || imagePickerLockedSourceMode === "catalogOnly";
  const imagePickerShowsLibraryActions = !imagePickerRendersCatalogSource && (!imagePickerSourceLocked || imagePickerLockedSourceMode === "externalOnly");
  const imagePickerActiveSourceFilter = imagePickerUsesIconSources
    ? imagePickerLockedSourceMode === "externalOnly"
      ? "external"
      : imagePickerLockedSourceMode === "builtinOnly"
        ? "builtin"
        : imagePickerSourceFilter === "external" ? "external" : "builtin"
    : "builtin";
  const sourceFilteredImageAssetList = imagePickerUsesIconSources
    ? (imageAssetList ?? []).filter((asset) => imagePickerActiveSourceFilter === "builtin" ? imagePickerAssetIsBuiltinIcon(asset) : !imagePickerAssetIsBuiltinIcon(asset))
    : imagePickerUsesSeparateLibraryTabs
      ? imagePickerAssetsForLibraryTab(imageAssetList ?? [], imagePickerActiveLibraryTab)
      : (imageAssetList ?? []);
  const imagePickerAssetNoun = imagePickerUsesSeparateLibraryTabs && imagePickerActiveLibraryTab === "image" ? "图片" : "图标";
  const imagePickerFolderNameById = new Map((imageFolders ?? []).map((folder) => [folder.id, folder.name]));
  const imagePickerAssetCategory = (asset: any) => {
    const assetName = String(asset?.name ?? "").trim();
    const separatedParts = assetName.split(/\s+\/\s+/u).map((part) => part.trim()).filter(Boolean);
    if (separatedParts.length > 1) {
      return separatedParts.slice(0, -1).join(" / ");
    }
    const folderName = imagePickerFolderNameById.get(asset?.folderId);
    if (folderName && asset?.folderId !== "root") {
      return folderName;
    }
    return String(asset?.mimeType ?? "").includes("svg") || String(asset?.filename ?? "").toLowerCase().endsWith(".svg")
      ? "SVG图标"
      : "图片素材";
  };
  const imagePickerCategoryOptions = Array.from(new Set(sourceFilteredImageAssetList.map((asset) => imagePickerAssetCategory(asset)))).sort((left, right) =>
    left.localeCompare(right, "zh-Hans-CN")
  );
  const imagePickerActiveCategoryFilter = imagePickerCategoryOptions.includes(imagePickerCategoryFilter) ? imagePickerCategoryFilter : "";
  const normalizedImagePickerSearchQuery = String(imagePickerSearchQuery ?? "").trim().toLowerCase();
  const filteredImageAssetList = sourceFilteredImageAssetList.filter((asset) => {
    const category = imagePickerAssetCategory(asset);
    if (imagePickerActiveCategoryFilter && category !== imagePickerActiveCategoryFilter) {
      return false;
    }
    if (!normalizedImagePickerSearchQuery) {
      return true;
    }
    const folderName = imagePickerFolderNameById.get(asset?.folderId) ?? "";
    const haystack = [
      asset?.name,
      asset?.filename,
      asset?.id,
      asset?.folderId,
      asset?.mimeType,
      category,
      folderName
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");
    return haystack.includes(normalizedImagePickerSearchQuery);
  });
  const imagePickerDialogClassName = [
    "image-picker-dialog",
    imagePickerUsesIconSources ? "icon-library" : "",
    imagePickerUsesSeparateLibraryTabs ? "image-library-tabs" : "",
    imagePickerRendersCatalogSource ? "icon-library catalog-icon-library" : "",
    imagePickerUsesIconSources && imagePickerActiveSourceFilter === "external" ? "external-icon-library" : "",
    imagePickerSourceLocked ? "source-locked-icon-library" : ""
  ].filter(Boolean).join(" ");
  const iconLibraryCatalog = iconLibraryPicker?.catalog ?? null;
  const iconLibraryLibraries = iconLibraryCatalog?.libraries ?? [];
  const iconLibrarySelectedLibraryId = iconLibraryPicker?.selectedLibraryId ?? "";
  const iconLibraryCategoryOptions = iconLibraryCategoriesForSelection(iconLibraryCatalog, iconLibrarySelectedLibraryId);
  const iconLibraryVisibleResult = visibleIconLibraryIcons(
    iconLibraryPicker?.entries ?? [],
    {
      libraryId: iconLibrarySelectedLibraryId,
      categoryKey: iconLibraryPicker?.selectedCategoryKey ?? "",
      query: iconLibraryPicker?.searchQuery ?? ""
    },
    iconLibraryPicker?.visibleCount ?? ICON_LIBRARY_PAGE_SIZE
  );
  const iconLibraryRequestedTotal =
    iconLibrarySelectedLibraryId
      ? iconLibraryLibraries.find((library) => library.id === iconLibrarySelectedLibraryId)?.totalIcons
      : iconLibraryCatalog?.totalIcons;
  const iconLibraryLoadedText = `${iconLibraryVisibleResult.total} / ${iconLibraryPicker?.entries?.length ?? 0}${typeof iconLibraryRequestedTotal === "number" ? ` / ${iconLibraryRequestedTotal}` : ""}`;
  const inspectorTopologyEntry = inspectorSelectedNode
    ? resolveInspectorTopologyEntry(topology, __appScope.inspectorTopology, inspectorSelectedNode.id)
    : undefined;
  const inspectorGraphId = inspectorSelectedNode
    ? resolveInspectorGraphId(nodes, inspectorSelectedNode)
    : "";
  return (<>{globalMessage && <div className={`global-message global-message-${globalMessage.type}`}><span className="global-message-icon">{globalMessage.type === "success" ? "✓" : globalMessage.type === "error" ? "✕" : "ℹ"}</span>{globalMessage.text}</div>}<div className={`app-shell ${isBrowseMode ? "browse-mode" : "edit-mode"} left-panel-${leftPanelMode} right-panel-${rightPanelMode} ${sidePanelResize ? "side-panel-resizing" : ""} ${statusbarResize ? "statusbar-resizing" : ""} ${topologyWarningPanelResize ? "topology-warning-panel-resizing" : ""} ${nodeDoubleClickDialogDrag || nodeDoubleClickDialogResize ? "node-double-click-dialog-moving" : ""} ${deviceLibraryDialogDrag || deviceLibraryDialogResize ? "device-library-dialog-moving" : ""} ${canvasResizeDrag ? "canvas-resizing" : ""}`} style={appShellStyle}>
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
        <div className="left-panel-footer">
          <span className="left-panel-footer-item">
            <span className="left-panel-footer-label">方案：</span>
            <span className="id-copy-cell" title="点击复制方案 ID" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const raw = activeSchemeKey || "";
              const id = raw ? decodeURIComponent(raw.replace(/^[^:]+:/, "")) : "—";
              navigator.clipboard.writeText(id).then(() => {
                const toast = document.createElement("span");
                toast.className = "id-copy-toast";
                toast.textContent = "已复制";
                toast.style.position = "fixed";
                toast.style.left = (rect.left + rect.width / 2) + "px";
                toast.style.top = (rect.top - 8) + "px";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1000);
              });
            }}>{activeSchemeKey ? decodeURIComponent(activeSchemeKey.replace(/^[^:]+:/, "")) : "—"}</span>
          </span>
          <span className="left-panel-footer-item">
            <span className="left-panel-footer-label">模型：</span>
            <span className="id-copy-cell" title="点击复制模型 ID" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const raw = activeProjectKey || "";
              const stripped = raw.replace(/^[^:]+:/, "").split("/").pop() || "";
              const id = stripped ? decodeURIComponent(stripped) : "—";
              navigator.clipboard.writeText(id).then(() => {
                const toast = document.createElement("span");
                toast.className = "id-copy-toast";
                toast.textContent = "已复制";
                toast.style.position = "fixed";
                toast.style.left = (rect.left + rect.width / 2) + "px";
                toast.style.top = (rect.top - 8) + "px";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1000);
              });
            }}>{activeProjectKey ? decodeURIComponent((activeProjectKey.replace(/^[^:]+:/, "").split("/").pop() || "")) : "—"}</span>
          </span>
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
            {isEditMode ? <Pencil size={16}/> : <Eye size={16}/>}
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
          <button className="topbar-primary-button" onClick={() => setImageTarget({ kind: "canvasIcon" })} disabled={isBrowseMode} title="分类图标库" aria-label="分类图标库">
            <FolderOpen size={16}/>
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
            <input ref={imageInputRef} type="file" accept="image/*,.svg,image/svg+xml" data-image-import-kind="image" hidden multiple onChange={chooseImage}/>
            <input ref={__appScope.imageArchiveInputRef} type="file" accept=".docx,.docm,.pptx,.pptm,.ppsx,.ppsm,.xlsx,.xlsm,.vsdx,.wps,.dps,.zip" data-image-import-kind="archive" hidden multiple onChange={chooseImage}/>
            <input ref={customDeviceImageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseCustomDeviceBackground}/>
            <input ref={definitionTemplateIconInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseDefinitionTemplateIcon}/>
            <input ref={stateVisualImageInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseStateVisualImage}/>
            <input ref={stateIconDrawingImportInputRef} type="file" accept="image/*,.svg,image/svg+xml" hidden onChange={chooseStateIconDrawingImport}/>
            <input ref={modelImportInputRef} type="file" accept=".json,application/json" hidden onChange={importModelFile}/>
            <input ref={__appScope.svgModelImportInputRef} type="file" accept=".svg,image/svg+xml" hidden onChange={__appScope.importSvgModelFile}/>
            <input ref={schemeImportInputRef} type="file" accept=".zip,application/zip,.json,application/json" hidden onChange={importSchemeFile}/>
            <input ref={__appScope.libraryPackageImportInputRef} type="file" accept=".json,application/json" hidden onChange={__appScope.importLibraryPackageFile}/>
            <button onClick={exportSvg} disabled={!canExportCurrentModel} title={canExportCurrentModel ? "导出 SVG 图形文件" : "请先保存当前模型后再导出图形文件"} aria-label="导出图形文件">
              <Download size={16}/>
            </button>
            <button onClick={exportEFile} disabled={!canExportCurrentModel} title={canExportCurrentModel ? "导出 E 模型文件" : "请先保存当前模型后再导出模型文件"} aria-label="导出模型文件">
              <FileJson size={16}/>
            </button>
          </div>
          <RuntimeWsIndicator __appScope={__appScope}/>
        </header>

        <MemoizedCanvasArea scope={__appScope} />
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
            return (<tr key={error.id} className={`${blocking ? "error" : "warning"} topology-warning-row`} onClick={() => locateTopologyError(error)}>
                        <td>{blocking ? "错误" : "告警"}</td>
                        <td>
                          <button type="button" onClick={(event) => {
                    event.stopPropagation();
                    locateTopologyError(error);
                  }} onDoubleClick={(event) => {
                    event.stopPropagation();
                    locateTopologyError(error);
                  }}>
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
            {currentModelRecord ? <div hidden={inspectorTab !== "model"}><table className="param-table">
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
                __appScope.setCanvasBackgroundImageFit?.("cover");
            }} disabled={isBrowseMode || !canvasBackgroundImage}>
                          清除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {batchEditors.renderChineseParamHeader("canvasBackgroundImageFit")}
                    <td>
                      <select value={normalizeImageFitMode(__appScope.canvasBackgroundImageFit)} disabled={isBrowseMode} onChange={(event) => {
                pushUndoSnapshot();
                __appScope.setCanvasBackgroundImageFit?.(event.target.value);
            }}>
                        {IMAGE_FIT_MODE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </select>
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
              </table></div> : null}{inspectorTab === "tree" ? (renderElementTreePanel()) : inspectorTab === "graph" ? ((() => {
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
                }} role="tab" aria-selected={false} disabled={multiNodeGraphSelection || !inspectorSelectedNode || __appScope.isStaticGraphicNode(inspectorSelectedNode)}>
                    模型
                  </button>
                  <button type="button" className="" onClick={() => {
                    setInspectorTab("device");
                    setSelectedDeviceInfoView("measurement");
                }} role="tab" aria-selected={false} disabled={multiNodeGraphSelection || !inspectorSelectedNode || __appScope.isStaticGraphicNode(inspectorSelectedNode)}>
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
                      {batchEditors.renderChineseParamHeader("graph_id", "ID")}
                      <td>
                        <span
                          className="id-copy-cell"
                          title="点击复制 ID"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            navigator.clipboard.writeText(inspectorGraphId).then(() => {
                              const toast = document.createElement("span");
                              toast.className = "id-copy-toast";
                              toast.textContent = "已复制";
                              toast.style.position = "fixed";
                              toast.style.left = (rect.left + rect.width / 2) + "px";
                              toast.style.top = (rect.top + rect.height / 2) + "px";
                              document.body.appendChild(toast);
                              setTimeout(() => toast.remove(), 1000);
                            });
                          }}
                        >{inspectorGraphId}</span>
                      </td>
                    </tr>
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
                    {!__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<>
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
                    {__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<>
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
                        <tr>
                          {batchEditors.renderChineseParamHeader("backgroundImageFit")}
                          <td>
                            <select value={normalizeImageFitMode(inspectorSelectedNode.params.backgroundImageFit)} onChange={(event) => updateParam("backgroundImageFit", event.target.value)}>
                              {IMAGE_FIT_MODE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
                          </td>
                        </tr>
                      </>)}
                    {!__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<>
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
                        <tr>
                          {batchEditors.renderChineseParamHeader("foregroundImageFit")}
                          <td>
                            <select value={normalizeImageFitMode(inspectorSelectedNode.params.foregroundImageFit)} onChange={(event) => updateParam("foregroundImageFit", event.target.value)}>
                              {IMAGE_FIT_MODE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                            </select>
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
        })()) : inspectorTabShowsDevicePanel(inspectorTab, Boolean(inspectorSelectedNode)) ? (<div className="device-param-stack">
                {!__appScope.isStaticGraphicNode(inspectorSelectedNode) && (<div className="device-info-tabs" role="tablist" aria-label="图元属性分类">
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
                {selectedDeviceInfoView === "measurement" && !__appScope.isStaticGraphicNode(inspectorSelectedNode) ? (renderSelectedNodeMeasurementTable(inspectorSelectedNode)) : (<>
                    {selectedContainerParameterViews.length > 0 && (<div className="container-param-tabs" role="tablist" aria-label="容器设备参数切换">
                        {selectedContainerParameterViews.map((view) => (<button key={view.id} type="button" className={selectedContainerParameterView?.id === view.id ? "active" : ""} onClick={() => setContainerParamViewId(view.id)}>
                            {view.label}
                          </button>))}
                      </div>)}
                    {selectedContainerParameterView ? (<table className="param-table">
                        <tbody>
                          {selectedContainerParameterView.rows.map((row) => {
                        const options = paramOptionsForSection(row.key, selectedContainerParameterView.componentLibrary);
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
                        const keys = resolveDeviceModelPanelParameterKeys(
                            eKeys,
                            customDefinitions,
                            Object.keys(inspectorSelectedNode.params).filter((key) => !key.startsWith("_") && key !== "is_container" && key !== ALLOW_RESIZE_TRANSFORM_PARAM)
                        );
                        return keys.map((key) => {
                            const value = key === "name" ? inspectorSelectedNode.name : eKeys.length > 0 ? getEParamValue(key, inspectorSelectedNode) : inspectorSelectedNode.params[key] ?? "";
                            const displayValue = formatDeviceModelParamDisplayValue(key, value);
                            const definition = customDefinitions.find((item) => item.enName === key);
                            return (<tr key={key}>
                                  {batchEditors.renderParamHeader(key, key, definition?.cnName === key ? PARAM_LABELS[key] ?? key : (definition?.cnName ?? PARAM_LABELS[key] ?? key))}
                                  <td>
                                    {key === "name" ? (<BufferedTextInput value={inspectorSelectedNode.name} onCommit={(nextValue) => updateSelectedNode({ name: nextValue })}/>) : READONLY_E_PARAM_KEYS.has(key) || batchEditors.definitionMakesValueReadonly(definition) ? (<input value={displayValue} readOnly/>) : (batchEditors.renderParamEditor(key, displayValue, false, definition))}
                                  </td>
                                </tr>);
                        });
                    })()}
                        </tbody>
                      </table>)}
                  </>)}
              </div>) : inspectorTab === "device" ? (<div className="empty-state">
                <FileJson size={28}/>
                <p>选择画布设备后，可切换查看图形、模型和量测。</p>
              </div>) : null}
            {singleSelectedDeviceForInspector && inspectorSelectedNode && inspectorTab === "graph" && (<div className="topology-card">
                <span>连接度</span>
                <strong>{inspectorTopologyEntry?.degree ?? 0}</strong>
                <small>
                  {(inspectorTopologyEntry?.neighbors ?? [])
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
              {isEditMode && contextMeasurementNode && !__appScope.isStaticGraphicNode(contextMeasurementNode) && (<div className="context-menu-submenu">
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
              {isEditMode && (<button onClick={() => runContextMenuAction(() => __appScope.openSvgModelImportFilePicker(projectMenu.schemeId ?? ""))}>
                <FileInput size={14}/>
                从 SVG 生成模型
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
      {templateMenu && (() => {
        if ("typeName" in templateMenu) {
          return (
            <div
              ref={contextMenuRef}
              className={contextMenuClassName(templateMenu)}
              style={contextMenuStyle(templateMenu)}
              onMouseEnter={() => keepTemplateContextMenuFlyoutOpen(templateMenu.typeName)}
              onMouseLeave={() => scheduleGraphTemplateFlyoutClose(templateMenu.typeName)}
            >
              {isEditMode && (<button onClick={() => runContextMenuAction(() => deleteGraphTemplateType(templateMenu.typeName))}>
                <Trash2 size={14}/>
                删除类型
              </button>)}
            </div>
          );
        }
        const template = customGraphTemplates.find((item: any) => item.id === templateMenu.templateId);
        return template ? (
          <div
            ref={contextMenuRef}
            className={contextMenuClassName(templateMenu)}
            style={contextMenuStyle(templateMenu)}
            onMouseEnter={() => keepTemplateContextMenuFlyoutOpen(template.typeName)}
            onMouseLeave={() => scheduleGraphTemplateFlyoutClose(template.typeName)}
          >
            {isEditMode && (<button onClick={() => runContextMenuAction(() => deleteGraphTemplate(template))}>
              <Trash2 size={14}/>
              删除
            </button>)}
          </div>
        ) : null;
      })()}
      {libraryPackageDialogOpen && (
        <div className="image-picker-backdrop library-package-backdrop" onPointerDown={closeLibraryPackageDialog}>
          <section className="library-package-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="library-package-title">
            <div className="image-picker-title">
              <div>
                <h2 id="library-package-title">导入/导出库</h2>
              </div>
              <button type="button" onClick={closeLibraryPackageDialog}>关闭</button>
            </div>
            <div className="library-package-mode-toggle" role="radiogroup" aria-label="选择导入或导出">
              {[
                ["export", "导出", Download],
                ["import", "导入", FileInput]
              ].map(([mode, label, Icon]) => (
                <label key={mode} className={libraryPackageDialogMode === mode ? "active" : ""}>
                  <input
                    type="radio"
                    name="library-package-mode"
                    value={mode}
                    checked={libraryPackageDialogMode === mode}
                    onChange={() => setLibraryPackageDialogMode?.(mode)}
                  />
                  <Icon size={15}/>
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="library-package-scope-grid" role="radiogroup" aria-label="选择库类型">
              {(libraryPackageDialogScopeOptions ?? []).map((option: any) => (
                <label key={option.scope} className={libraryPackageDialogScope === option.scope ? "active" : ""}>
                  <input
                    type="radio"
                    name="library-package-scope"
                    value={option.scope}
                    checked={libraryPackageDialogScope === option.scope}
                    onChange={() => setLibraryPackageDialogScope?.(option.scope)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <div className="library-package-dialog-actions">
              <button type="button" onClick={closeLibraryPackageDialog}>取消</button>
              <button
                type="button"
                className="primary"
                disabled={libraryPackageDialogMode === "import" && isBrowseMode}
                onClick={() => void confirmLibraryPackageDialog?.()}
              >
                {libraryPackageDialogMode === "import" ? "导入" : "导出"}
              </button>
            </div>
          </section>
        </div>
      )}
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
                      <span>类别库</span>
                      <select value={groupDeviceDefinitionDialog.categoryLibraryName} onChange={(event) => {
                const categoryLibraryName = normalizeCategoryLibraryName(event.target.value);
                setGroupDeviceDefinitionDialog((current) => current ? {
                    ...current,
                    categoryLibraryName,
                    componentLibrary: defaultComponentLibraryForCategoryLibrary(categoryLibraryName)
                } : current);
            }}>
                        {selectableCategoryLibraries.map((group) => (<option key={group} value={group}>{group}</option>))}
                      </select>
                    </label>
                    <label>
                      <span>选择元件库</span>
                      <select value={groupDeviceDefinitionDialog.componentLibrary} onChange={(event) => setGroupDeviceDefinitionDialog((current) => current ? { ...current, componentLibrary: event.target.value } : current)}>
                        {Array.from(new Set([
                groupDeviceDefinitionDialog.componentLibrary,
                ...(componentLibraryOptionsByCategoryLibrary[groupDeviceDefinitionDialog.categoryLibraryName] ?? [])
            ].filter(Boolean))).map((section) => (<option key={section} value={section}>{section}</option>))}
                      </select>
                    </label>
                  </>) : (<label>
                    <span>已有元件</span>
                    <select value={groupDeviceDefinitionDialog.targetKind} disabled={groupDeviceReplacementTemplates.length === 0} onChange={(event) => setGroupDeviceDefinitionDialog((current) => current ? { ...current, targetKind: event.target.value } : current)}>
                      {groupDeviceReplacementTemplates.length === 0 ? (<option value="">暂无元件</option>) : groupDeviceReplacementTemplates.map((template) => (<option key={template.kind} value={template.kind}>
                          {template.label} / {resolveTemplateComponentLibrary(template)}
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
                <p>元件库列表：{filterSelectionTypeOptions.length} 类，已选择 {filterSelectionTypeKeys.length} 种。</p>
              </div>
              <button type="button" onClick={() => setFilterSelectionDialogOpen(false)}>关闭</button>
            </div>
            <div className="filter-selection-toolbar">
              <button type="button" onClick={() => setFilterSelectionTypeKeys(filterSelectionTypeOptions.flatMap((option) => option.items.map((item) => item.itemKey)))}>全选</button>
              <button type="button" onClick={() => setFilterSelectionTypeKeys([])}>清空</button>
            </div>
            <div className="filter-selection-list" role="group" aria-label="元件库列表">
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
                  <div className="filter-selection-tree" aria-label={`${option.label}元件库树`}>
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
                  <input value={deviceDefinitionSearchQuery} onChange={(event) => setDeviceDefinitionSearchQuery(event.target.value)} placeholder="搜索类别库/元件库/元件" aria-label="搜索元件定义"/>
                  {deviceDefinitionSearchQuery && (<button type="button" aria-label="清空元件定义搜索" title="清空" onClick={() => setDeviceDefinitionSearchQuery("")}>
                      <X size={13}/>
                    </button>)}
                </div>
                {(() => {
                  // 切换折叠层全部展开/全部收缩
                  const total = displayedDeviceDefinitionLibraries.length;
                  if (total === 0) return null;
                  const allExpanded = expandedDefinitionGroups.length >= total;
                  return (<button type="button" className="device-definition-toggle-all" aria-label={allExpanded ? "全部收缩" : "全部展开"} title={allExpanded ? "全部收缩" : "全部展开"} onClick={() => {
                    if (allExpanded) {
                      setExpandedDefinitionGroups([]);
                    } else {
                      setExpandedDefinitionGroups([...displayedDeviceDefinitionLibraries]);
                      setCollapsedDefinitionComponentLibraries([]);
                    }
                  }}>
                    {allExpanded ? "全部收缩" : "全部展开"}
                    {allExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                  </button>);
                })()}
                <div className="device-definition-tree-scroll dialog-compact-tree" role="tree">
                  {displayedDeviceDefinitionLibraries.length > 0 ? displayedDeviceDefinitionLibraries.map((group) => {
            const typeGroups = filteredDeviceDefinitionByComponentLibrary[group] ?? [];
            const expanded = deviceDefinitionSearchNeedle ? true : expandedDefinitionGroups.includes(group);
            return (<section className="device-definition-group" key={group}>
                        <button type="button" className="device-definition-group-toggle" role="treeitem" aria-expanded={expanded} onClick={() => toggleDefinitionGroup(group)}>
                          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                          <span>{group}</span>
                          <strong>{typeGroups.reduce((sum, typeGroup) => sum + typeGroup.templates.length, 0)}</strong>
                        </button>
                        {expanded && (<div className="component-definition-type-list" role="group" aria-label={`${group}元件库列表`}>
                            {typeGroups.map((typeGroup) => {
                        const typeKey = categoryLibraryComponentLibraryKey(group, typeGroup.section);
                        const typeCollapsed = deviceDefinitionSearchNeedle ? false : collapsedDefinitionComponentLibraries.includes(typeKey);
                        const typeDisplay = componentLibraryDisplayParts(typeGroup.section, customComponentLibraries);
                        return (<section className="component-definition-type-group" key={`${group}-${typeGroup.section}`}>
                                  <button type="button" className={`component-definition-type-header ${typeCollapsed ? "" : "active"}`} role="treeitem" aria-expanded={!typeCollapsed} onClick={() => toggleDefinitionComponentLibrary(group, typeGroup.section)}>
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
                        <span>类别库</span>
                        <strong>{normalizeCategoryLibraryName(selectedDefinitionTemplate.categoryLibrary)}</strong>
                      </div>
                      <div>
                        <span>元件库</span>
                        {definitionDraftSectionEditing ? (<select className={sourceSelectClassName(isBuiltInComponentLibrary(definitionDraftSection))} value={definitionDraftSection} autoFocus onBlur={() => setDefinitionDraftSectionEditing(false)} onChange={(event) => {
                    setDefinitionDraftSection(event.target.value);
                    setDefinitionDraftError("");
                    setDefinitionDraftSectionEditing(false);
                }}>
                            {definitionCategoryLibraryComponentLibraryOptions.map((section) => (<option key={section} value={section} className={componentLibraryOptionClass(section)} title={isBuiltInComponentLibrary(section) ? "系统内置元件库，无法删除" : "用户自定义元件库，可以删除"}>
                                {section}
                              </option>))}
                          </select>) : (<button type="button" className={`device-definition-summary-value ${isBuiltInComponentLibrary(definitionDraftSection) ? "builtin-source" : "custom-source"}`} title="点击选择元件库" onClick={() => setDefinitionDraftSectionEditing(true)}>
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
                                 <th>默认值</th>
                                 <th>枚举项</th>
                                 <th>操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {definitionDraftRowsForDisplay.map((row) => (<tr key={row.id} className={row.readonly ? "readonly-row" : ""}>
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
                deviceKind: normalizeComponentLibraryName(definitionDraftSection) || deviceDefinitionKeyForTemplate(selectedDefinitionTemplate),
                label: selectedDefinitionTemplate.label,
                terminalCount: selectedDefinitionTemplate.terminalCount,
                terminalLabels: selectedDefinitionTemplate.terminalLabels,
                parameterDefinitions: definitionDraftRows,
                positionDefinitions: __appScope.selectedDefinitionMeasurementPositionDefinitions
            }))}
                  </>) : (<div className="empty-state compact">
                    <Grid2X2 size={24}/>
                    <p>当前类别库暂无元件。</p>
                  </div>)}
              </section>
            </div>
            <div className="device-library-dialog-resize" role="separator" aria-orientation="horizontal" aria-label="调整修改元件窗口大小" title="拖拽调整窗口大小" onPointerDown={(event) => startDeviceLibraryDialogResize("definition", event)}/>
          </section>
        </div>)}
      {customLibraryCreateDialog && (<div className="custom-library-create-backdrop" onPointerDown={() => setCustomLibraryCreateDialog(null)}>
          <form
            className="custom-library-create-dialog"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              confirmCustomLibraryCreateDialog();
            }}
          >
            <div className="custom-library-create-title">
              <h3>{customLibraryCreateDialog.title}</h3>
              <button type="button" aria-label="关闭" title="关闭" onClick={() => setCustomLibraryCreateDialog(null)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {customLibraryCreateDialog.error && <p className="custom-library-create-error">{customLibraryCreateDialog.error}</p>}
            <label>
              <span>{customLibraryCreateDialog.kind === "categoryLibrary" ? "类别中文名称" : customLibraryCreateDialog.kind === "componentLibrary" ? "元件库中文名称" : "元件中文名称"}</span>
              <input
                autoFocus
                value={customLibraryCreateDialog.cnName}
                onChange={(event) => setCustomLibraryCreateDialog((current) => current ? { ...current, cnName: event.target.value, error: "" } : current)}
              />
            </label>
            <label>
              <span>{customLibraryCreateDialog.kind === "categoryLibrary" ? "类别英文名称" : customLibraryCreateDialog.kind === "componentLibrary" ? "元件库英文名称" : "元件英文名称"}</span>
              <input
                value={customLibraryCreateDialog.enName}
                onChange={(event) => setCustomLibraryCreateDialog((current) => current ? { ...current, enName: event.target.value, error: "" } : current)}
              />
            </label>
            {customLibraryCreateDialog.kind === "component" && (<>
              <label className="custom-library-create-derived-field">
                <span>是否派生类</span>
                <select value={customLibraryCreateDialog.isDerivedComponentLibrary ? "1" : "0"} onChange={(event) => {
                  const enabled = event.target.value === "1";
                  setCustomLibraryCreateDialog((current) => {
                    if (!current) {
                      return current;
                    }
                    const baseComponentLibrary = normalizeComponentLibraryName(current.derivedFromComponentLibrary || current.componentLibrary || customLibraryCreateDialogBaseComponentLibrary);
                    return {
                      ...current,
                      isDerivedComponentLibrary: enabled,
                      derivedFromComponentLibrary: baseComponentLibrary,
                      derivedComponentLibrary: enabled ? (current.derivedComponentLibrary ?? "") : "",
                      derivedComponentLibraryLabel: enabled ? (current.derivedComponentLibraryLabel ?? "") : "",
                      error: ""
                    };
                  });
                }}>
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              {customLibraryCreateDialog.isDerivedComponentLibrary && (<>
                <label className="custom-library-create-derived-base-field">
                  <span>关联原类</span>
                  <input value={customLibraryCreateDialogBaseComponentLibrary} disabled readOnly />
                </label>
                <label className="custom-library-create-derived-select-field">
                  <span>派生类</span>
                  <select value={customLibraryCreateDialogDerivedSelectValue} onChange={(event) => {
                    if (event.target.value === "__new__") {
                      setCustomLibraryCreateDialog((current) => current ? {
                        ...current,
                        derivedFromComponentLibrary: normalizeComponentLibraryName(current.derivedFromComponentLibrary || current.componentLibrary || customLibraryCreateDialogBaseComponentLibrary),
                        derivedComponentLibrary: "",
                        derivedComponentLibraryLabel: "",
                        error: ""
                      } : current);
                      return;
                    }
                    const selected = customLibraryCreateDialogDerivedOptions.find((item) => item.name === event.target.value);
                    if (!selected) {
                      return;
                    }
                    setCustomLibraryCreateDialog((current) => current ? {
                      ...current,
                      componentLibrary: selected.base,
                      derivedFromComponentLibrary: selected.base,
                      derivedComponentLibrary: selected.name,
                      derivedComponentLibraryLabel: selected.label,
                      error: ""
                    } : current);
                  }}>
                    <option value="__new__">新建派生类</option>
                    {customLibraryCreateDialogDerivedOptions.map((option) => (<option key={option.name} value={option.name}>
                      {option.label ? `${option.label} / ${option.name}` : option.name}
                    </option>))}
                  </select>
                </label>
                <label className="custom-library-create-derived-cn-field">
                  <span>派生类中文名称</span>
                  <input
                    value={customLibraryCreateDialog.derivedComponentLibraryLabel ?? ""}
                    placeholder="例如 交流风电"
                    onChange={(event) => setCustomLibraryCreateDialog((current) => current ? { ...current, derivedComponentLibraryLabel: event.target.value, error: "" } : current)}
                  />
                </label>
                <label className="custom-library-create-derived-en-field">
                  <span>派生类英文名称</span>
                  <input
                    value={customLibraryCreateDialog.derivedComponentLibrary ?? ""}
                    placeholder="例如 ACWindGen"
                    onChange={(event) => setCustomLibraryCreateDialog((current) => current ? { ...current, derivedComponentLibrary: event.target.value, error: "" } : current)}
                  />
                </label>
              </>)}
            </>)}
            <div className="custom-library-create-actions">
              <button type="button" onClick={() => setCustomLibraryCreateDialog(null)}>取消</button>
              <button type="submit" className="primary">确定</button>
            </div>
          </form>
        </div>)}
      {customDeviceDialogOpen && (<div className="image-picker-backdrop" onPointerDown={requestCloseCustomDeviceDialog}>
          <section ref={customDeviceDialogRef} className={`custom-device-dialog${deviceLibraryDialogLayouts.custom ? " floating" : ""}`} style={deviceLibraryDialogStyle("custom")} onPointerDown={stopDeviceLibraryDialogEvent} onPointerUp={stopDeviceLibraryDialogEvent} onPointerCancel={stopDeviceLibraryDialogEvent} onLostPointerCapture={stopDeviceLibraryDialogEvent} onClick={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div className="device-library-dialog-title" onPointerDown={(event) => startDeviceLibraryDialogDrag("custom", event)}>
                <h2>元件定义</h2>
              </div>
            </div>
            {customDeviceDraft.error && <p className="custom-device-error">{customDeviceDraft.error}</p>}
            {customDeviceSaveMessage && <p className="custom-device-save-status">{customDeviceSaveMessage}</p>}
            <div className="custom-device-dialog-layout">
              <CustomComponentManagerTree
                libraries={displayedCustomComponentTreeLibraries}
                filteredByComponentLibrary={filteredCustomComponentTreeByComponentLibrary}
                customComponentLibraries={customComponentLibraries}
                initialCollapsedLibraries={collapsedCustomComponentTreeLibraries}
                initialCollapsedTypes={collapsedCustomComponentTreeTypes}
                initialSelection={customComponentTreeSelection}
                searchQuery={customComponentTreeSearchQuery}
                onSelectCategoryLibrary={selectCustomCategoryLibrary}
                onSelectComponent={selectCustomComponentTemplate}
                onSelectComponentLibrary={selectCustomComponentLibrary}
                onCreateCategoryLibrary={createCustomCategoryLibrary}
                onCreateComponentLibrary={createCustomComponentLibrary}
                onCreateComponent={startCustomComponentCreate}
                onRenameSelection={renameSelectedCustomDeviceTreeItem}
                onDeleteSelection={deleteSelectedCustomDeviceTreeItem}
                onSearchChange={setCustomComponentTreeSearchQuery}
                onCollapseChange={handleTreeCollapseChange}
                onSelectionChange={setCustomComponentTreeSelection}
                onOpenEDeviceDefinitionInterface={() => setEDeviceDefinitionInterfaceDialogOpen(true)}
              />
              <div className="custom-device-editor-panel">
            <div className="custom-device-form-grid">
              <label className="custom-category-library-field">
                <span>类别库</span>
                <div className="custom-category-library-select-row single-control">
                  <select className={sourceSelectClassName(isBuiltInCategoryLibrary(customDeviceDraft.categoryLibraryName))} value={customDeviceDraft.categoryLibraryName} onChange={(event) => selectCustomCategoryLibrary(event.target.value)}>
                    {selectableCategoryLibraries.map((group) => (<option key={group} value={group} className={categoryLibraryOptionClass(group)} title={isBuiltInCategoryLibrary(group) ? "系统内置类别库，无法删除" : "用户自定义类别库，可以删除"}>
                        {group}
                      </option>))}
                  </select>
                </div>
              </label>
              <label className="custom-component-library-field">
                <span>元件库</span>
                <div className="custom-category-library-select-row single-control">
                  <select className={sourceSelectClassName(isBuiltInComponentLibrary(customDeviceDraft.componentLibrary))} value={customDeviceDraft.componentLibrary} onChange={(event) => {
                    if (customDeviceDraft.isDerivedComponentLibrary) {
                      const base = normalizeComponentLibraryName(event.target.value);
                      setCustomDeviceDraft((current) => ({
                        ...current,
                        componentLibrary: base,
                        derivedFromComponentLibrary: base,
                        derivedComponentLibrary: "",
                        derivedComponentLibraryLabel: "",
                        error: ""
                      }));
                      return;
                    }
                    selectCustomComponentLibrary(customDeviceDraft.categoryLibraryName, event.target.value);
                  }}>
                    {customDeviceBaseComponentLibraryOptions.map((section) => {
                      const sectionDisplay = componentLibraryDisplayParts(section, customComponentLibraries);
                      return (<option key={section} value={section} className={componentLibraryOptionClass(section)} title={isBuiltInComponentLibrary(section) ? "系统内置元件库，无法删除" : "用户自定义元件库，可以删除"}>
                        {sectionDisplay.title}
                      </option>);
                    })}
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
                <BufferedTextInput type="number" min="0" max={MAX_CUSTOM_DEVICE_TERMINALS} value={customDeviceDraft.terminalCount} onCommit={(value) => updateCustomDraftTerminalCount(Number(value))}/>
              </label>
              <label className="custom-device-derived-field">
                是否派生类
                <select value={customDeviceDraft.isDerivedComponentLibrary ? "1" : "0"} onChange={(event) => {
                  const enabled = event.target.value === "1";
                  setCustomDeviceDraft((current) => {
                    const base = normalizeComponentLibraryName(current.derivedFromComponentLibrary || current.componentLibrary || customDeviceDerivedBaseLibrary);
                    return {
                      ...current,
                      isDerivedComponentLibrary: enabled,
                      derivedFromComponentLibrary: enabled ? base : "",
                      derivedComponentLibrary: enabled ? (current.derivedComponentLibrary ?? "") : "",
                      derivedComponentLibraryLabel: enabled ? (current.derivedComponentLibraryLabel ?? "") : "",
                      error: ""
                    };
                  });
                }}>
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              {customDeviceDraft.isDerivedComponentLibrary && (<>
                <label className="custom-device-derived-cn-field">
                  派生类中文名称
                  <BufferedTextInput value={customDeviceDraft.derivedComponentLibraryLabel ?? ""} placeholder="例如 交流风电" onCommit={(value) => setCustomDeviceDraft((current) => ({ ...current, derivedComponentLibraryLabel: value, error: "" }))}/>
                </label>
                <label className="custom-device-derived-en-field">
                  派生类英文名称
                  <BufferedTextInput value={customDeviceDraft.derivedComponentLibrary ?? ""} placeholder="例如 ACWindGen" onCommit={(value) => setCustomDeviceDraft((current) => ({ ...current, derivedComponentLibrary: value, error: "" }))}/>
                </label>
              </>)}
            </div>
            <div className="device-definition-tabs custom-device-tabs" role="tablist" aria-label="元件定义内容切换">
              {customComponentTreeSelection?.kind !== "componentLibrary" && (<button type="button" className={visibleCustomDeviceDialogView === "icon" ? "active" : ""} onClick={() => setCustomDeviceDialogView("icon")}>
                图标定义
              </button>)}
              {!customDeviceDefinitionIconOnly && (<>
                  <button type="button" className={visibleCustomDeviceDialogView === "parameters" ? "active" : ""} onClick={() => setCustomDeviceDialogView("parameters")}>
                    参数定义
                  </button>
                  <button type="button" className={visibleCustomDeviceDialogView === "measurements" ? "active" : ""} onClick={() => setCustomDeviceDialogView("measurements")}>
                    量测定义
                  </button>
                </>)}
              <span className="device-definition-tabs-spacer" />
              <button type="button" className="device-definition-tab-action" onClick={revertCustomDeviceDraftCurrentTab} title="还原当前分页的修改到预设定义">
                还原
              </button>
              <button type="button" className="device-definition-tab-action" onClick={revertCustomDeviceDraftAll} title="还原所有分页的修改到预设定义">
                还原所有
              </button>
            </div>
            <div className={`custom-device-tab-panel custom-device-tab-panel-${visibleCustomDeviceDialogView}`}>
            {visibleCustomDeviceDialogView === "icon" ? (<>
            {renderStateVisualPager(customDeviceDraft.stateDefinitions, customDeviceStatePageId, setCustomDeviceStatePageId, {
                update: updateCustomDeviceStateDraftRow,
                add: addCustomDeviceStateDraftRow,
                remove: deleteCustomDeviceStateDraftRow,
                drawingScope: "custom",
                terminalGeometryTemplate: customDevicePreviewSourceTemplate
            })}
            {customDeviceDraft.terminalCount > 0 && <div className="custom-terminal-grid" style={{ "--custom-terminal-count": Math.max(1, customDeviceDraft.terminalCount) } as CSSProperties}>
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
              </>) : visibleCustomDeviceDialogView === "parameters" ? (customComponentTreeSelection?.kind === "componentLibrary" ? (
                <section className="device-definition-component-library-panel">
                  <div className="device-definition-component-library-header">
                    <h3>元件库：{customComponentTreeSelection?.section}</h3>
                    <span className="device-definition-count">{componentLibraryTemplates.length} 个元件</span>
                    <label>
                      <span>E 文件标签</span>
                      <BufferedTextInput
                        value={componentLibraryLabelValue}
                        onCommit={(value) => {
                          const trimmed = value.trim();
                          setEDeviceDefinitionLabels((prev) => {
                            const next = { ...prev };
                            if (!trimmed || trimmed === componentLibraryLabelKey) {
                              delete next[componentLibraryLabelKey];
                            } else {
                              next[componentLibraryLabelKey] = trimmed;
                            }
                            return next;
                          });
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => setEDeviceDefinitionLabels((prev) => { const next = { ...prev }; delete next[componentLibraryLabelKey]; return next; })} disabled={eDeviceDefinitionLabels[componentLibraryLabelKey] === undefined}>
                      还原
                    </button>
                  </div>
                  <div className="custom-param-table-wrap device-definition-table-wrap">
                    <table className="custom-param-table">
                      <thead>
                        <tr>
                           <th>中文名称</th>
                           <th>英文名称</th>
                         </tr>
                      </thead>
                      <tbody>
                        {componentLibraryCommonParams.map((param) => (<tr key={param.enName}>
                           <td>{param.cnName}</td>
                           <td><code>{param.enName}</code></td>
                         </tr>))}
                      </tbody>
                    </table>
                  </div>
                  {componentLibraryCommonParams.length === 0 && <p className="custom-device-error">该元件库下元件无共有参数。</p>}
                </section>
              ) : (<>
            <div className="custom-param-table-wrap">
              <table className="custom-param-table">
                <thead>
                  <tr>
                    <th>中文名称</th>
                    <th>英文名称</th>
                     <th>取值类型</th>
                     <th>默认值</th>
                     <th>枚举项</th>
                     <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                const defaultParamKeySet = new Set(customDraftDefaultParams.map((item) => item.enName.trim().toLowerCase()));
                const customDefaultParamOverrideMap = new Map(customDeviceDraft.params
                    .filter((item) => defaultParamKeySet.has(item.enName.trim().toLowerCase()))
                    .map((item) => [item.enName.trim().toLowerCase(), item]));
                const mergedDefaultParams = customDraftDefaultParams.map((item) => {
                    const override = customDefaultParamOverrideMap.get(item.enName.trim().toLowerCase());
                    return override
                        ? normalizeDefinitionRowEnumFields({
                            ...item,
                            valueType: override.valueType,
                            typicalValue: override.typicalValue,
                            enumOptions: override.enumOptions,
                            enumValues: override.enumValues,
                            readonly: item.readonly,
                            ...(typeof override.exportEnabled === "boolean" ? { exportEnabled: override.exportEnabled } : {}),
                            ...(typeof override.exportName === "string" ? { exportName: override.exportName } : {})
                        })
                        : item;
                });
                const visibleCustomParams = customDeviceDraft.params.filter((item) => !defaultParamKeySet.has(item.enName.trim().toLowerCase()));
                const displayedCustomRows = resolveCustomDeviceParameterRowsForDisplay(mergedDefaultParams, visibleCustomParams, {
                    isDerivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary,
                    baseComponentLibrary: customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary,
                    isDerivedComponentBaseParamName: __appScope.isDerivedComponentBaseParamName
                });
                const displayedMergedDefaultParams = displayedCustomRows.defaultRows;
                const displayedVisibleCustomParams = displayedCustomRows.customRows;
                const updateDefaultParamRow = (rowId: string, patch: Partial<CustomParamDraft>) => {
                    const enName = rowId.replace(/^default-/, "");
                    const sourceRow = mergedDefaultParams.find((item) => item.enName === enName) ?? customDraftDefaultParams.find((item) => item.enName === enName);
                    const exportOnlyPatch = Object.keys(patch).every((key) => key === "exportEnabled" || key === "exportName");
                    if (!sourceRow || (sourceRow.readonly && !exportOnlyPatch)) {
                        return;
                    }
                    setCustomDeviceDraft((current) => {
                        const key = sourceRow.enName.trim().toLowerCase();
                        const existing = current.params.find((item) => item.enName.trim().toLowerCase() === key);
                        const nextRow = normalizeDefinitionRowEnumFields({
                            ...sourceRow,
                            ...(existing ?? {}),
                            ...patch,
                            id: existing?.id ?? customParamId(),
                            cnName: sourceRow.cnName,
                            enName: sourceRow.enName,
                            readonly: sourceRow.readonly
                        });
                        return {
                            ...current,
                            params: existing
                                ? current.params.map((item) => (item.id === existing.id ? nextRow : item))
                                : [...current.params, nextRow],
                            error: ""
                        };
                    });
                };
                const moveVisibleCustomParam = (rowId: string, direction: -1 | 1) => {
                    setCustomDeviceDraft((current) => {
                        const visibleIds = current.params
                            .filter((item) => {
                            if (defaultParamKeySet.has(item.enName.trim().toLowerCase())) {
                                return false;
                            }
                            return resolveCustomDeviceParameterRowsForDisplay([], [item], {
                                isDerivedComponentLibrary: current.isDerivedComponentLibrary,
                                baseComponentLibrary: current.derivedFromComponentLibrary || current.componentLibrary,
                                isDerivedComponentBaseParamName: __appScope.isDerivedComponentBaseParamName
                            }).customRows.length > 0;
                        })
                            .map((item) => item.id);
                        const visibleIndex = visibleIds.indexOf(rowId);
                        const targetId = visibleIds[visibleIndex + direction];
                        if (visibleIndex < 0 || !targetId) {
                            return current;
                        }
                        const params = [...current.params];
                        const currentIndex = params.findIndex((item) => item.id === rowId);
                        const targetIndex = params.findIndex((item) => item.id === targetId);
                        if (currentIndex < 0 || targetIndex < 0) {
                            return current;
                        }
                        [params[currentIndex], params[targetIndex]] = [params[targetIndex], params[currentIndex]];
                        return { ...current, params };
                    });
                };
                return (<>
                    {displayedMergedDefaultParams.map((row) => {
                        const defaultRow: CustomParamDraft = { ...row, id: `default-${row.enName}` };
                        const defaultRowDisabled = Boolean(row.readonly);
                        return (<tr key={`default-${row.enName}`} className={defaultRowDisabled ? "readonly-row" : ""}>
                            <td>{row.cnName}</td>
                            <td>{row.enName}</td>
                             <td>{parameterValueTypeLabelForDefinitionRow(row)}</td>
                             <td>{renderTypicalValueEditor(defaultRow, updateDefaultParamRow, defaultRowDisabled)}</td>
                             <td>{renderEnumValuesEditor(defaultRow, updateDefaultParamRow, defaultRowDisabled)}</td>
                             <td>默认</td>
                          </tr>);
                    })}
                    {displayedVisibleCustomParams.map((row, index) => (<tr key={row.id}>
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
                          <button type="button" onClick={() => moveVisibleCustomParam(row.id, -1)} disabled={index === 0}>
                            上移
                          </button>
                          <button type="button" onClick={() => moveVisibleCustomParam(row.id, 1)} disabled={index >= displayedVisibleCustomParams.length - 1}>
                            下移
                          </button>
                          <button type="button" onClick={() => setCustomDeviceDraft((current) => ({ ...current, params: current.params.filter((item) => item.id !== row.id) }))}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>))}
                  </>);
            })()}
                </tbody>
              </table>
            </div>
            <div className="custom-device-actions">
              <button type="button" onClick={() => setCustomDeviceDraft((current) => ({
                ...current,
                params: [
                    ...current.params,
                    {
                        id: customParamId(),
                        cnName: "",
                        enName: "",
                        valueType: "string",
                        typicalValue: "",
                        exportEnabled: false,
                        exportName: ""
                    }
                ]
            }))}>
                新增参数
              </button>
            </div>
              </>)) : (renderDeviceDefinitionMeasurementPanel(customDeviceMeasurementTarget))}
            </div>
              </div>
            </div>
            <footer className="custom-device-dialog-footer">
              <button type="button" onClick={requestCloseCustomDeviceDialog}>取消</button>
              <button type="button" className="primary" onClick={() => saveCustomDeviceDefinitionDialog({ closeAfterSave: false })}>
                {customDeviceDefinitionMode === "edit" ? "保存元件定义" : "保存自定义设备"}
              </button>
            </footer>
            <div className="device-library-dialog-resize" role="separator" aria-orientation="horizontal" aria-label="调整新建元件窗口大小" title="拖拽调整窗口大小" onPointerDown={(event) => startDeviceLibraryDialogResize("custom", event)}/>
          </section>
        </div>)}
      {eDeviceDefinitionInterfaceDialogOpen && (<div className="image-picker-backdrop" onPointerDown={requestCloseEDeviceInterfaceDefinition}>
          <section className="e-device-interface-dialog" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>E文件接口定义</h2>
              </div>
              <button type="button" aria-label="关闭E文件接口定义" title="关闭" onClick={requestCloseEDeviceInterfaceDefinition}>
                <X size={16} />
              </button>
            </div>
            <div className="e-device-interface-actions">
              <button type="button" onClick={requestExportEDeviceInterfaceDefinitionFile}>
                <Download size={14} aria-hidden="true" />
                <span>保存成文件</span>
              </button>
              <label className="e-device-interface-file-button">
                <FileInput size={14} aria-hidden="true" />
                <span>从文件加载</span>
                <input type="file" accept=".e,text/plain" hidden onChange={__appScope.importEDeviceDefinitionFile} />
              </label>
            </div>
            <div className="e-device-interface-layout">
              <aside className="e-device-interface-class-list" aria-label="设备类树" role="tree">
                {eDeviceInterfaceDefinitionTree.map((category) => {
                  const categoryCollapsed = Boolean(collapsedEDeviceInterfaceTreeNodes[category.key]);
                  return (
                    <div className="e-device-interface-tree-category" key={category.key}>
                      <button
                        type="button"
                        className="e-device-interface-tree-category-toggle"
                        role="treeitem"
                        aria-level={1}
                        aria-expanded={!categoryCollapsed}
                        onClick={() => toggleEDeviceInterfaceTreeNode(category.key)}
                      >
                        {categoryCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                        <FolderOpen size={14} aria-hidden="true" />
                        <span>{category.label}</span>
                        <small>{category.classCount} 类</small>
                      </button>
                      {!categoryCollapsed ? (
                        <div className="e-device-interface-tree-category-children" role="group">
                          {category.items.map((item) => {
                            const classRow = item.row;
                            const branchKey = `class:${classRow.componentLibrary}`;
                            const branchCollapsed = Boolean(collapsedEDeviceInterfaceTreeNodes[branchKey]);
                            const active = classRow.componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary;
                            return (
                              <div className="e-device-interface-tree-branch" key={classRow.componentLibrary}>
                                <div className="e-device-interface-tree-node-row">
                                  {item.children.length > 0 ? (
                                    <button
                                      type="button"
                                      className="e-device-interface-tree-toggle"
                                      aria-label={`${branchCollapsed ? "展开" : "收起"}${classRow.label || classRow.componentLibrary}`}
                                      aria-expanded={!branchCollapsed}
                                      onClick={() => toggleEDeviceInterfaceTreeNode(branchKey)}
                                    >
                                      {branchCollapsed ? <ChevronRight size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
                                    </button>
                                  ) : (
                                    <span className="e-device-interface-tree-toggle-spacer" aria-hidden="true" />
                                  )}
                                  <button
                                    type="button"
                                    className={`e-device-interface-class-option${active ? " active" : ""}`}
                                    role="treeitem"
                                    aria-level={2}
                                    aria-selected={active}
                                    aria-expanded={item.children.length > 0 ? !branchCollapsed : undefined}
                                    onClick={() => requestSelectEDeviceInterfaceComponentLibrary(classRow.componentLibrary)}
                                  >
                                    <span className="e-device-interface-class-label">{classRow.label || classRow.componentLibrary}</span>
                                    <span className="e-device-interface-class-meta">
                                      <code>{classRow.componentLibrary}</code>
                                      <small>{classRow.fields.length} 参数</small>
                                    </span>
                                  </button>
                                </div>
                                {item.children.length > 0 && !branchCollapsed ? (
                                  <div className="e-device-interface-tree-children" role="group">
                                    {item.children.map((childRow) => {
                                      const childActive = childRow.componentLibrary === selectedEDeviceInterfaceRow?.componentLibrary;
                                      return (
                                        <button
                                          type="button"
                                          key={childRow.componentLibrary}
                                          className={`e-device-interface-class-option e-device-interface-tree-derived${childActive ? " active" : ""}`}
                                          role="treeitem"
                                          aria-level={3}
                                          aria-selected={childActive}
                                          onClick={() => requestSelectEDeviceInterfaceComponentLibrary(childRow.componentLibrary)}
                                        >
                                          <span className="e-device-interface-class-label">{childRow.label || childRow.componentLibrary}</span>
                                          <span className="e-device-interface-class-meta">
                                            <code>{childRow.componentLibrary}</code>
                                            <small>{childRow.fields.length} 参数</small>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {eDeviceInterfaceDefinitionRows.length === 0 ? <p className="e-device-interface-empty">暂无可配置设备类</p> : null}
              </aside>
              <div className="e-device-interface-detail">
                {selectedEDeviceInterfaceRow ? (<>
                  <div className="e-device-interface-class-form">
                    <div className="e-device-interface-selected-class">
                      <span>当前设备类</span>
                      <strong>{selectedEDeviceInterfaceRow.label || selectedEDeviceInterfaceRow.componentLibrary}</strong>
                      <code>{selectedEDeviceInterfaceRow.componentLibrary}</code>
                    </div>
                    <label className="e-device-interface-export-switch">
                      <input
                        className="custom-param-export-checkbox"
                        type="checkbox"
                        checked={selectedEDeviceInterfaceRow.exportEnabled}
                        aria-label={`${selectedEDeviceInterfaceRow.componentLibrary}是否导出`}
                        onChange={(event) => setEDeviceDefinitionClassExportEnabled((current) => ({
                          ...current,
                          [selectedEDeviceInterfaceRow.componentLibrary]: event.target.checked
                        }))}
                      />
                      <span>是否导出</span>
                    </label>
                    <label className="e-device-interface-export-name">
                      <span>导出名称</span>
                      <BufferedTextInput
                        value={selectedEDeviceInterfaceRow.exportName ?? selectedEDeviceInterfaceRow.componentLibrary}
                        onCommit={(value) => {
                          const trimmed = value.trim();
                          setEDeviceDefinitionLabels((prev) => {
                            const next = { ...prev };
                            if (!trimmed || trimmed === selectedEDeviceInterfaceRow.componentLibrary) {
                              delete next[selectedEDeviceInterfaceRow.componentLibrary];
                            } else {
                              next[selectedEDeviceInterfaceRow.componentLibrary] = trimmed;
                            }
                            return next;
                          });
                        }}
                      />
                    </label>
                  </div>
                  <div className="e-device-interface-table-wrap">
                    <table className="custom-param-table e-device-interface-table">
                      <thead>
                        <tr>
                          <th>参数</th>
                          <th>英文名称</th>
                          <th>是否导出</th>
                          <th>导出名称</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEDeviceInterfaceRow?.fields.map((field) => (<tr key={`${selectedEDeviceInterfaceRow.componentLibrary}:${field.sourceName}`} className={selectedEDeviceInterfaceRow.exportEnabled ? "" : "disabled"}>
                          <td className="e-device-interface-param-name">{field.cnName || field.sourceName}</td>
                          <td><code>{field.sourceName}</code></td>
                          <td className="custom-param-export-toggle">
                            <input
                              className="custom-param-export-checkbox"
                              type="checkbox"
                              checked={Boolean(field.exportEnabled)}
                              disabled={!selectedEDeviceInterfaceRow.exportEnabled || field.readonly}
                              aria-label={`${field.cnName || field.sourceName}是否导出`}
                              onChange={(event) => updateDefinitionComponentLibraryCommonParamExport(selectedEDeviceInterfaceRow.componentLibrary, field.sourceName, { exportEnabled: event.target.checked, exportName: field.exportName?.trim() || field.sourceName })}
                            />
                          </td>
                          <td>
                            <BufferedTextInput
                              value={field.exportName ?? ""}
                              disabled={!selectedEDeviceInterfaceRow.exportEnabled || !field.exportEnabled || field.readonly}
                              onCommit={(value) => updateDefinitionComponentLibraryCommonParamExport(selectedEDeviceInterfaceRow.componentLibrary, field.sourceName, { exportName: value })}
                            />
                          </td>
                        </tr>))}
                        {selectedEDeviceInterfaceRow.fields.length === 0 ? (<tr>
                          <td colSpan={4}>该设备类暂无可配置参数</td>
                        </tr>) : null}
                      </tbody>
                    </table>
                  </div>
                </>) : (
                  <div className="e-device-interface-empty e-device-interface-empty-detail">暂无可配置设备类</div>
                )}
              </div>
            </div>
            <footer className="e-device-interface-footer">
              <span className={eDeviceInterfaceHasUnsavedChanges ? "dirty" : ""} aria-live="polite">
                {eDeviceInterfaceHasUnsavedChanges ? "有未保存修改" : "当前无未保存修改"}
              </span>
              <div className="e-device-interface-footer-actions">
                <button type="button" onClick={requestCloseEDeviceInterfaceDefinition}>退出</button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => requestSaveEDeviceInterfaceDefinition()}
                >
                  <Save size={14} aria-hidden="true" />
                  保存
                </button>
              </div>
            </footer>
          </section>
        </div>)}
      {eDeviceInterfaceExitPromptOpen && (<div className="image-picker-backdrop" onPointerDown={() => setEDeviceInterfaceExitPromptOpen(false)}>
          <section className="unsaved-change-dialog e-device-interface-unsaved-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="e-device-interface-unsaved-title">
            <div className="image-picker-title">
              <div>
                <h2 id="e-device-interface-unsaved-title">E文件接口定义尚未保存</h2>
                <p>当前接口定义存在未保存修改。退出之前，请选择如何处理这些修改。</p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={discardEDeviceInterfaceDefinitionChanges}>不保存直接退出</button>
              <button type="button" onClick={() => requestSaveEDeviceInterfaceDefinition({ closeAfterSave: true })}>保存后退出</button>
              <button type="button" onClick={() => setEDeviceInterfaceExitPromptOpen(false)}>继续编辑</button>
            </div>
          </section>
        </div>)}
      {eDeviceInterfaceClassSwitchTarget && (<div className="image-picker-backdrop" onPointerDown={() => setEDeviceInterfaceClassSwitchTarget("")}>
          <section className="unsaved-change-dialog e-device-interface-unsaved-dialog e-device-interface-class-switch-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="e-device-interface-class-switch-title">
            <div className="image-picker-title">
              <div>
                <h2 id="e-device-interface-class-switch-title">当前设备类定义尚未保存</h2>
                <p>
                  “{selectedEDeviceInterfaceRow?.label || selectedEDeviceInterfaceRow?.componentLibrary}”存在未保存修改。
                  切换到“{eDeviceInterfaceClassSwitchTargetRow?.label || eDeviceInterfaceClassSwitchTarget}”之前，请选择如何处理这些修改。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={discardEDeviceInterfaceClassAndSwitch}>不保存并切换</button>
              <button type="button" onClick={() => runAfterEDeviceInterfaceInputCommit(() => eDeviceInterfaceSaveAndSwitchRef.current())}>保存并切换</button>
              <button type="button" onClick={() => setEDeviceInterfaceClassSwitchTarget("")}>继续编辑</button>
            </div>
          </section>
        </div>)}
      {renderNodeDoubleClickDialog()}
      {imageTarget && (<div className="image-picker-backdrop" onPointerDown={() => {
          setImageAssetContextMenu(null);
          setImagePickerSourceFilter("");
          setImagePickerCategoryFilter("");
          setImagePickerSearchQuery("");
          setImageTarget(null);
        }}>
          <section className={imagePickerDialogClassName} onPointerDown={(event) => {
            setImageAssetContextMenu(null);
            event.stopPropagation();
          }}>
            <div className="image-picker-title">
              <div>
                <h2>{imagePickerTitle}</h2>
                <p>{imagePickerHint}</p>
              </div>
              <button onClick={() => {
                setImageAssetContextMenu(null);
                setImagePickerSourceFilter("");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget(null);
              }}>关闭</button>
            </div>
            {imagePickerUsesSeparateLibraryTabs && (
              <div className="image-picker-source-tabs" role="tablist" aria-label="资源类型">
                <button
                  type="button"
                  role="tab"
                  aria-selected={imagePickerActiveLibraryTab === "image"}
                  className={imagePickerActiveLibraryTab === "image" ? "active" : ""}
                  onClick={() => {
                    setImageAssetContextMenu(null);
                    setImagePickerSourceFilter("");
                    setImagePickerCategoryFilter("");
                    setImagePickerSearchQuery("");
                  }}
                >
                  图片(含SVG)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={imagePickerActiveLibraryTab === "icon"}
                  className={imagePickerActiveLibraryTab === "icon" ? "active" : ""}
                  onClick={() => {
                    setImageAssetContextMenu(null);
                    setImagePickerSourceFilter("icon-library");
                    setImagePickerCategoryFilter("");
                    setImagePickerSearchQuery("");
                    setIconLibraryPicker((current: any) => ({
                      ...current,
                      selectedCategoryKey: "",
                      searchQuery: "",
                      visibleCount: ICON_LIBRARY_PAGE_SIZE
                    }));
                  }}
                >
                  图标
                </button>
              </div>
            )}
            {imagePickerShowsLibraryActions && (
              <div className="image-picker-actions">
                <select value={activeImageFolderId} onChange={(event) => setActiveImageFolderId(event.target.value)}>
                  {imageFolders.map((folder) => (<option key={folder.id} value={folder.id}>
                      {folder.name}{typeof folder.imageCount === "number" ? ` (${folder.imageCount})` : ""}
                    </option>))}
                </select>
                <button onClick={createImageFolder} disabled={isBrowseMode}>新建文件夹</button>
                <button onClick={renameImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>重命名</button>
                <button onClick={deleteImageFolder} disabled={isBrowseMode || activeImageFolderId === "root"}>删除文件夹</button>
                <button onClick={() => {
                  setImagePickerSourceFilter("external");
                  imageInputRef.current?.click();
                }} disabled={isBrowseMode}>导入外部 SVG/PNG</button>
                <button onClick={() => {
                  setImagePickerSourceFilter("external");
                  __appScope.imageArchiveInputRef.current?.click();
                }} disabled={isBrowseMode}>导入文档图片/图标</button>
                {imagePickerCanClear && <button onClick={clearSelectedImage} disabled={isBrowseMode}>取消当前图片</button>}
              </div>
            )}
            {imagePickerRendersCatalogSource ? (
              <div className="icon-library-browser">
                <div className="image-picker-filters icon-library-browser-filters" role="search" aria-label="分类图标筛选检索">
                  <label>
                    图库
                    <select
                      value={iconLibrarySelectedLibraryId}
                      onChange={(event) => {
                        const nextLibraryId = event.target.value;
                        setIconLibraryPicker((current: any) => ({
                          ...current,
                          selectedLibraryId: nextLibraryId,
                          selectedCategoryKey: "",
                          visibleCount: ICON_LIBRARY_PAGE_SIZE
                        }));
                      }}
                      disabled={!iconLibraryCatalog}
                    >
                      <option value="">全部图库</option>
                      {iconLibraryLibraries.map((library: any) => (
                        <option key={library.id} value={library.id}>
                          {library.label}{typeof library.totalIcons === "number" ? ` (${library.totalIcons})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    分类
                    <select
                      value={iconLibraryPicker?.selectedCategoryKey ?? ""}
                      onChange={(event) => {
                        setIconLibraryPicker((current: any) => ({
                          ...current,
                          selectedCategoryKey: event.target.value,
                          visibleCount: ICON_LIBRARY_PAGE_SIZE
                        }));
                      }}
                      disabled={!iconLibraryCatalog}
                    >
                      <option value="">全部分类</option>
                      {iconLibraryCategoryOptions.map((category: any) => (
                        <option key={category.key} value={category.key}>
                          {category.label}{typeof category.count === "number" ? ` (${category.count})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    检索
                    <input
                      type="search"
                      value={iconLibraryPicker?.searchQuery ?? ""}
                      placeholder="搜索名称/标签/来源"
                      onChange={(event) => {
                        const nextQuery = event.target.value;
                        setIconLibraryPicker((current: any) => ({
                          ...current,
                          searchQuery: nextQuery,
                          visibleCount: ICON_LIBRARY_PAGE_SIZE
                        }));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIconLibraryPicker((current: any) => ({
                        ...current,
                        selectedLibraryId: current.catalog?.libraries?.[0]?.id ?? "",
                        selectedCategoryKey: "",
                        searchQuery: "",
                        visibleCount: ICON_LIBRARY_PAGE_SIZE
                      }));
                    }}
                    disabled={!iconLibrarySelectedLibraryId && !(iconLibraryPicker?.selectedCategoryKey) && !(iconLibraryPicker?.searchQuery)}
                  >
                    清空
                  </button>
                  <span>{iconLibraryLoadedText}</span>
                </div>
                {iconLibraryPicker?.status === "error" ? (
                  <p className="image-empty">{iconLibraryPicker.error || "读取分类图标库失败。"}</p>
                ) : !iconLibraryCatalog ? (
                  <p className="image-empty">正在加载分类图标库目录...</p>
                ) : iconLibraryPicker?.status === "loading" && iconLibraryVisibleResult.visible.length === 0 ? (
                  <p className="image-empty">正在按需加载图标清单...</p>
                ) : iconLibraryVisibleResult.visible.length === 0 ? (
                  <p className="image-empty">没有匹配的分类图标，请调整图库、分类或搜索关键字。</p>
                ) : (
                  <>
                    <div className="image-asset-list icon-library-catalog-list">
                      {iconLibraryVisibleResult.visible.map((icon: any, index: number) => (
                        <button
                          key={icon.id}
                          className="image-asset-option icon-library-catalog-option"
                          disabled={isBrowseMode}
                          onClick={() => applyIconLibraryCatalogIcon(icon.id)}
                          title={`${icon.libraryLabel} / ${icon.categoryLabel} / ${icon.name}`}
                        >
                          <img src={icon.url} alt={icon.name || `分类图标 ${index + 1}`} loading="lazy"/>
                          <span>{icon.name || `分类图标 ${index + 1}`}</span>
                          <small>{icon.categoryLabel}</small>
                        </button>
                      ))}
                    </div>
                    <div className="icon-library-load-more">
                      <span>
                        已显示 {iconLibraryVisibleResult.visible.length} / {iconLibraryVisibleResult.total}
                        {iconLibraryPicker?.status === "loading" ? "，正在加载..." : ""}
                      </span>
                      {iconLibraryVisibleResult.hasMore && (
                        <button
                          type="button"
                          onClick={() => {
                            setIconLibraryPicker((current: any) => ({
                              ...current,
                              visibleCount: (current.visibleCount || ICON_LIBRARY_PAGE_SIZE) + ICON_LIBRARY_PAGE_SIZE
                            }));
                          }}
                        >
                          加载更多
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : imageAssetList.length > 0 && (
              <div className={`image-picker-filters ${imagePickerSourceLocked ? "source-locked" : ""}`} role="search" aria-label={`${imagePickerAssetNoun}筛选检索`}>
                {!imagePickerSourceLocked && imagePickerUsesIconSources && (
                    <label>
                      来源
                      <select value={imagePickerActiveSourceFilter} onChange={(event) => {
                        setImagePickerSourceFilter(event.target.value);
                        setImagePickerCategoryFilter("");
                      }}>
                        <option value="builtin">内置 SVG</option>
                        <option value="external">外部导入</option>
                      </select>
                    </label>
                  )}
                <label>
                  分类
                  <select value={imagePickerActiveCategoryFilter} onChange={(event) => setImagePickerCategoryFilter(event.target.value)}>
                    <option value="">全部分类</option>
                    {imagePickerCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                {!imagePickerSourceLocked && (
                  <>
                    <label>
                      检索
                      <input
                        type="search"
                        value={imagePickerSearchQuery}
                        placeholder="搜索名称/文件名/分类"
                        onChange={(event) => setImagePickerSearchQuery(event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePickerSourceFilter("");
                        setImagePickerCategoryFilter("");
                        setImagePickerSearchQuery("");
                      }}
                      disabled={(!imagePickerUsesIconSources || imagePickerActiveSourceFilter === "builtin") && !imagePickerActiveCategoryFilter && !imagePickerSearchQuery}
                    >
                      清空
                    </button>
                  </>
                )}
                <span>{filteredImageAssetList.length} / {sourceFilteredImageAssetList.length}</span>
              </div>
            )}
            {!imagePickerRendersCatalogSource && (<div className="image-asset-list">
              {imageAssetList.length === 0 || (imagePickerUsesSeparateLibraryTabs && imagePickerActiveLibraryTab === "image" && sourceFilteredImageAssetList.length === 0) ? (<p className="image-empty">后台暂无图片，请先加载本地图片。</p>) : sourceFilteredImageAssetList.length === 0 ? (<p className="image-empty">{imagePickerUsesIconSources && imagePickerActiveSourceFilter === "external" ? "暂无外部导入图标，请使用上方外部导入按钮。" : `暂无可用${imagePickerAssetNoun}。`}</p>) : filteredImageAssetList.length === 0 ? (<p className="image-empty">{`没有匹配的${imagePickerAssetNoun}，请调整来源、分类或搜索关键字。`}</p>) : (filteredImageAssetList.map((asset, index) => {
                const canDeleteImageAsset = !isBrowseMode && !imagePickerAssetIsBuiltinIcon(asset) && (!imagePickerUsesIconSources || imagePickerActiveSourceFilter === "external");
                return (<button key={asset.id} className="image-asset-option" disabled={isBrowseMode} onClick={() => {
                    setImageAssetContextMenu(null);
                    applyExistingImage(asset.id);
                  }} onContextMenu={(event) => {
                    if (!canDeleteImageAsset) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setImageAssetContextMenu({
                      assetId: asset.id,
                      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 148)),
                      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 52))
                    });
                  }} title={asset.name || asset.filename || `后台图片 ${index + 1}`}>
                    <img src={imageAssets[asset.id] ?? asset.url} alt={asset.name || `后台图片 ${index + 1}`}/>
                    <span>{asset.name || `后台图片 ${index + 1}`}</span>
                </button>);
              }))}
            </div>)}
            {!imagePickerRendersCatalogSource && imageAssetContextMenu && (
              <div
                className="context-menu image-asset-context-menu"
                role="menu"
                style={{ left: imageAssetContextMenu.x, top: imageAssetContextMenu.y }}
                onPointerDown={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <button type="button" role="menuitem" onClick={deleteImageAssetFromContextMenu} disabled={isBrowseMode}>
                  <Trash2 size={14} aria-hidden="true"/>
                  删除
                </button>
              </div>
            )}
          </section>
        </div>)}
    </div></>);
}
