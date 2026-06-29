// @ts-nocheck
﻿import { ChangeEvent, DragEvent, Fragment, Suspense, isValidElement, lazy, memo, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent, type CSSProperties, type ReactNode, type SetStateAction, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal, flushSync } from "react-dom";
import { useTransition } from "react";
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowUp,
  Bell,
  Bold,
  BoxSelect,
  Cable,
  ChevronsDown,
  ChevronsUp,
  CircleDot,
  Download,
  FileInput,
  FileJson,
  FlipHorizontal,
  FlipVertical,
  Grid2X2,
  Copy,
  ChevronDown,
  ChevronRight,
  Group,
  Italic,
  Scissors,
  EyeOff,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  FolderOpen,
  Layers,
  Layers2,
  Minus,
  MousePointer2,
  PanelLeftOpen,
  PanelRightOpen,
  Palette,
  Paintbrush,
  Pencil,
  Pin,
  Plus,
  Route,
  RotateCcw,
  RotateCw,
  Save,
  ScanSearch,
  Search,
  Shrink,
  Trash2,
  Type,
  Underline,
  Undo2,
  Ungroup,
  X,
  Zap,
  ZapOff
} from "lucide-react";
import {
  buildContainerDeviceParameterViews,
  buildDefaultDeviceParameterDefinitions,
  buildElementTree,
  assignMissingDeviceIndexes,
  assignPermanentDeviceIndex,
  applyDeviceTemplateDefinitionOverride,
  buildEFileExport,
  buildEDeviceParameterFile,
  buildTopology,
  calculateElectricalTopology,
  calculateModelContentSize,
  calculateModelGeometryBounds,
  calculateNodeVisualBounds,
  canvasResizeBoundsFromPointerDrag,
  canvasResizeMinimumBoundsForGeometry,
  clampEdgeGeometryToBounds,
  clearVoltageBaseValuesForScope,
  setVoltageBaseTerminalValuesForScope,
  setVoltageBaseValuesForScope,
  canConnectTerminals,
  clampNodePositionToBounds,
  clampPointToBounds,
  clampViewBoxDimensionsForZoom,
  copySavedProjectWithUniqueName,
  copySavedSchemeWithUniqueName,
  createSavedScheme,
  createSavedProject,
  createDefaultNode,
  createInteractiveStaticDrawingNode,
  createNodeFromTemplate,
  createRoutableLineDeviceFromEndpoints,
  createStaticBoxNodeFromDrawing,
  containerRelationNameKey,
  CONVERTER_GLYPH_BORDER_INSET,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  ALLOW_RESIZE_TRANSFORM_PARAM,
  DEFAULT_COLOR_PALETTE,
  STATIC_ROUTE_AVOIDANCE_PARAM,
  describeContainerTerminalAssociations,
  deleteNodesWithConnectedEdges,
  deleteSavedProjectsFromSchemes,
  deleteSavedScheme,
  deleteSavedProject,
  DEVICE_LIBRARY,
  ACAC_CONVERTER_CONTROL_TYPES,
  AC_GENERATOR_CONTROL_TYPES,
  DCAC_CONVERTER_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  E_SECTION_COLUMNS,
  getEdgeEndpointPoint as getModelEdgeEndpointPoint,
  getNodeScaleX,
  getNodeScaleY,
  getDeviceGlyphVariant,
  getConnectionStrokeColor,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getTerminalDisplayColor,
  boundaryBusInternalConnectorSegment,
  boundaryBusInternalConnectorStrokeWidth,
  getElementFocusPoint,
  getMovableRouteSegmentIndexes,
  getBusTerminalType,
  getContainerTerminalAssociationSourceIndex,
  getSwitchVisualState,
  isInteractiveStaticDrawingKind,
  inferMissingRoutableLineDeviceEndpointRefs,
  isCanvasNodeMovable,
  isRoutableLineDeviceKind,
  getEParameterKeys,
  getEParamValue,
  getEExportWarnings,
  formatPowerBaseDisplayValue,
  getTemplateParameterDefinitions,
  findSavedProjectRecordInSchemes,
  findSavedSchemeById,
  findSavedSchemeParentById,
  flattenSavedProjects,
  flattenSavedSchemes,
  hydrateSavedSchemeRuntimeIds,
  nextSavedProjectAfterProjectBatchDeletion,
  nextSavedProjectAfterProjectDeletion,
  nextSavedProjectAfterSchemeDeletion,
  getOverlappingTerminalGroups,
  getRouteEndpointNormal,
  getRouteBlockingCandidates,
  getRouteBlockingCandidateNodesFromBoxes,
  routeIntersectsEndpointNodeBodies,
  routeIntersectsSpecificNodes,
  staticNodeParticipatesInRoutingAvoidance,
  getTerminalBusContactGroups,
  getTerminalPoint,
  createModelLayer,
  DEFAULT_MODEL_LAYER_ID,
  filterProjectByVisibleLayers,
  normalizeModelLayers,
  normalizeDeviceIndexCounters,
  normalizeNodeTerminalsByTemplate,
  normalizeNodeTerminalsWithTemplate,
  normalizeProjectLayers,
  normalizeModelGroups,
  orderNodesByModelLayer,
  defaultAllowsResizeTransformForKind,
  normalizeSavedProjectRecordNames,
  getTemplateStateDefinitions,
  normalizeDeviceStateDefinitions,
  savedProjectRecordNameKey,
  normalizeColorPalette,
  normalizeVoltageBaseInput,
  normalizeScaleValue,
  parseStaticDrawPoints,
  serializeProject,
  stripSavedSchemeRuntimeIds,
  deserializeProject,
  edgeWithSavedRouteGeometry,
  isBusNode,
  isContainerTerminalAssociationDependent,
  isDoubleContainerTerminalAssociation,
  isBlockingTopologyValidationError,
  isGeneratorNode,
  isRepeatedEdgePointerClick,
  isStaticButtonCapableKind,
  isStaticBoxLikeKind,
  isStaticBoxLikeNode,
  isStaticNode,
  inferESection,
  insertOrthogonalRouteBend,
  insertRoutableLineDeviceBend,
  insertChildSavedScheme,
  keyboardMoveStepForViewBox,
  lockProjectEdgeTerminals,
  pointsToOrthogonalPath,
  preserveConnectionEdgeRouteShape,
  preserveDraggedRouteShape,
  prepareConnectionEdgeForCommit,
  projectPointToBusCenterline,
  rebuildConnectionRoutesForNodes,
  rebuildExternalConnectionRoutesForMovedNodes,
  rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes,
  rebuildRoutableLineDeviceRouteUpdates,
  reconcileNodeParamsWithTemplateDefinitions,
  rebuildSingleConnectionRoute,
  redrawConnectionRoutesForEdges,
  redrawRoutableLineDeviceRoutes,
  reconcileOverlappingTerminalConnections,
  refreshCrossingArcPaths,
  rerouteEdgesAroundMovedNodes,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  routeRoutableLineDevice,
  routableLineDeviceCanvasPoints,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  setRoutableLineDeviceEndpoints,
  setRoutableLineDeviceEndpointsPreservingRoute,
  setRoutableLineDeviceCanvasPoints,
  syncRoutableLineDeviceEndpointsToRefs,
  synchronizeBusTerminalsWithEdges,
  validateTopology,
  validateConnectionEndpointRules,
  validateTwoTerminalVoltageBaseConsistency,
  voltageBaseSettingModeForNode,
  validateVoltageSetpointDeviations,
  resolveDeviceStateVisual,
  normalizeViewBoxToCanvas,
  type DeviceKind,
  type DeviceIndexCounters,
  type DeviceParameterDefinition,
  type DeviceParameterEnumOption,
  type DeviceParameterEnumValueType,
  type DeviceParameterValueType,
  type DeviceStateDefinition,
  type DeviceStateVisual,
  type DeviceTemplate,
  type DeviceTemplateDefinitionOverride,
  type ElementTreeGroup,
  type ElementTreeChildItem,
  type ElementTreeItem,
  type AlignMode,
  type Edge,
  type ModelNode,
  type ModelLayer,
  type ModelGroup,
  type Point,
  type ProjectFile,
  type RoutedEdge,
  type CanvasBounds,
  type ColorPalette,
  type ColorDisplayMode,
  type ContainerDeviceParameterView,
  type GeometryBounds,
  type Topology,
  type ContainerTerminalAssociationType,
  type ContainerTerminalAssociationValue,
  type ContainerTerminalRole,
  type TerminalType,
  type TopologyValidationError,
  type VoltageBaseClearScope,
  type VoltageBaseSetScope,
  type VoltageBaseTerminalValuesByNodeId,
  routeEdgesForCachedStoredRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForSavedPathRendering,
  routeEdgesForStoredRendering,
  modelGeometryInsideCanvasBounds,
  buildManualConnectionPreviewRoute,
  buildManualConnectionPreviewPath,
  mirrorNodes,
  moveSavedSchemeToParent,
  renameSavedScheme,
  renameSavedProject,
  replaceSavedSchemeById,
  savedChildSchemeNames,
  savedProjectPathOptions,
  savedSchemeSiblingNames,
  moveOrthogonalRouteSegment,
  moveRoutableLineDeviceSegment,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth,
  STATIC_DRAW_POINTS_PARAM,
  DEFAULT_DEVICE_LABEL_FONT_SIZE,
  TERMINAL_TYPE_LIBRARY_LABELS,
  terminalVoltageBaseNumber,
  terminalTypeColor,
  tidyOrthogonalRoute,
  topologyCalculationMessage,
  upsertSavedProject,
  upsertSavedProjectInScheme,
  uniqueRecordName,
  validateContainerTerminalAssociations,
  viewBoxZoomPercent,
  type PersistedSavedSchemeRecord,
  type SavedSchemeRecord,
  type SavedProjectRecord
} from "./model";
import { isGlobalSaveShortcut, resolveKeyboardShortcutScope } from "./keyboardShortcuts";
import {
  createGraphStore,
  graphStoreApplyPatch,
  graphStorePatchEdges,
  graphStorePatchGraph,
  graphStorePatchGraphFromArrays,
  graphStorePatchNodes,
  graphStoreSetEdges,
  graphStoreSetGraph,
  graphStoreSetNodes,
  overlayGraphStoreNodes,
  queryGraphStoreNodeSpatialIndex,
  type GraphStore
} from "./graphStore";
import {
  createRouteStore,
  queryRouteSpatialIndex,
  routeRenderBounds,
  routeSpatialIndexRenderBounds,
  routeStorePatchRoutes,
  routeStorePatchRoutesById,
  routeStoreSetRoutes,
  type RouteStore
} from "./routeStore";
import {
  EMPTY_CANVAS_CLIPBOARD,
  AUTO_ALIGN_DEFAULT_THRESHOLD_PX,
  AUTO_ALIGN_MAX_THRESHOLD_PX,
  AUTO_ALIGN_MIN_THRESHOLD_PX,
  alignNodeLayoutUnits,
  autoAlignNodeLayoutUnits,
  autoSpreadNodeLayoutUnits,
  buildCanvasLayoutUnits,
  buildCanvasClipboard,
  canDissolveSingleCanvasGroupSelection,
  canGroupCanvasSelection,
  canvasClipboardBounds,
  canvasGroupMemberNodeIds,
  cloneCanvasClipboard,
  createCanvasGroupFromSelection,
  distributeNodeLayoutUnits,
  dissolveSelectedCanvasGroups,
  expandSelectionByGroups,
  removeGraphicsFromGroups,
  reorderItemsByDisplayLayer,
  resolveCanvasDeleteAction,
  resolveCanvasSelection,
  selectedCanvasGroupIds,
  selectGraphicsInRect,
  type CanvasClipboard,
  type CanvasLayoutUnit,
  type SelectionRect,
  type CanvasSelectionScope,
  type DisplayLayerAction
} from "./selectionActions";
import {
  clampNumber,
  canvasResizeEdgeAnchorsStart,
  canvasResizeOriginShiftForBounds,
  canvasResizePreviewRectForDraft,
  canvasResizeScrollTargetForCommitAnchor,
  canvasVisualRectScrollTarget,
  canvasFrameScrollTargetForViewBox,
  canvasViewBoxFromFrameScrollPosition,
  canvasRenderViewBoxAfterBoundsDraft,
  viewBoxAfterCanvasBoundsChange,
  canvasBoundsChangeIsMeaningful,
  canvasFrameScrollIsUserDriven,
  canvasScrollSyncShouldRun,
  canvasBoundsScrollSyncTarget,
  scrollPositionToViewBoxStart,
  canvasResizeAnchoredDisplayOffset,
  canvasResizeKeepsScrollRange,
  clampCanvasNoScrollOffset,
  canvasFullViewBoxFromBounds,
  CANVAS_FRAME_INSET,
  CANVAS_SCROLL_EDGE_VIEWPORT_RATIO,
  CANVAS_FIT_SCROLLBAR_GUARD,
  type CanvasResizeEdge,
  type CanvasResizePreviewMetrics,
  type CanvasResizePreviewRect,
  type CanvasResizeCommitScrollTarget,
  type CanvasViewBox,
} from "./canvasViewport";
import {
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  shouldIgnoreWorkspaceAutoHide,
  type SidePanelMode,
  type SidePanelSide
} from "./sidePanelVisibility";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  EMPTY_PROJECT_MEASUREMENTS,
  createDefaultMeasurementGroupsForNode,
  formatMeasurementDisplayValue,
  measurementFontScaleForNode,
  measurementOffsetScaleForNode,
  measurementGroupForNode,
  measurementGroupsForNode,
  measurementProfileItemsForNodePosition,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  removeMeasurementGroupForNode,
  resolveMeasurementItemDisplay,
  upsertMeasurementGroup,
  upsertMeasurementGroups,
  type DeviceMeasurementProfileItem,
  type MeasurementGroup,
  type MeasurementItemBinding,
  type MeasurementTypeDefinition,
  type PlatformMeasurementConfig,
  type ProjectMeasurementConfig
} from "./measurements";
import {
  StaticButtonLayerMultiSelect,
  TextStyleToggleButton,
  type StaticButtonLayerMultiSelectProps,
  type TextStyleToggleButtonProps,
} from "./components/StaticButtonComponents";
import {
  normalizeRotationDegrees,
  formatStatusNumber,
  formatInspectorScaleValue,
  formatStatusScalePercent,
  formatStatusRotationDegrees
} from "./formatUtils";
import {
  downloadText,
  downloadBlob,
  saveTextFile,
  saveBlobFile,
  saveLazyBlobFile,
  writeTextFileToDirectory,
  isPickerAbort,
  type TextSaveOptions,
  type BlobSaveOptions,
  type LazyBlobSaveOptions,
  type WritableDirectoryHandle
} from "./fileIO";
import {
  svgStrokeDashArray,
  escapeXml,
  formatSvgNumber,
  backendImageIdFromHref,
  isImageDataUrl,
  imageArrayBufferToDataUrl,
  decodeBase64Text,
  decodeSvgImageSource,
  svgRootAttributeValue,
  svgLengthNumber,
  stripUnsafeInlineSvgMarkup,
  inlineSvgRootMarkup,
  svgImageContentMarkup,
  styleObjectToSvgAttribute,
  renderSvgElementMarkup
} from "./svgUtils";
import {
  DeferredColorInput,
  BufferedTextInput,
  BufferedTextarea,
  colorInputValue,
  type DeferredColorInputProps,
  type BufferedTextInputProps,
  type BufferedTextareaProps
} from "./components/InputComponents";
import {
  numericNodeParam,
  nodeLabelOffset,
  nodeLabelText,
  nodeLabelVisible,
  normalizeNodeLabelDisplayMode,
  nodeLabelDisplayMode,
  nodeLabelShouldRender,
  normalizeNodeLabelRotation,
  nodeLabelVertical,
  nodeLabelVerticalSegments,
  nodeLabelVerticalTokenY,
  nodeLabelTransform,
  nodeLabelCanvasCenter,
  nodeLabelRotationFromPoint,
  nodeLabelTextAnchor,
  nodeLabelFontSize,
  nodeLabelTextStyle,
  nodeLabelVerticalTokenStyle,
  type NodeLabelDisplayMode
} from "./nodeLabelUtils";
import {
  nodeCounterTransformMatrix,
  uprightText,
  staticNumericParam,
  staticSymbolShadowStyle,
  staticSymbolTextValue,
  staticSymbolMiniatureTextValue,
  staticShapeText,
  estimateSvgTextWidth,
  staticConnectorMarker,
  staticConnectorPath,
  staticDrawPointsForNode,
  staticHandleDot,
  staticFrameHandles,
  DEVICE_GLYPH_DESIGN_LONGEST_SIDE,
  renderBusGlyphRect,
  deviceStateVisualToken,
  stateVisualText,
  resolveStateVisualImageHref,
  routableLineDeviceRenderLocalPoints,
} from "./staticRenderUtils";
import { DeviceGlyph, MemoDeviceGlyph, SvgMarkupChunk } from "./DeviceGlyph";
import { buildSvgNodeLabelMarkup, svgDisplayAttribute, exportSvgSafeId, exportSvgLayerId, exportSvgUniqueId, exportSvgLayerScriptMarkup, exportDeviceMetadataAttributes, exportMeasurementGroupMetadataAttributes, exportMeasurementItemMetadataAttributes, exportMeasurementGroupBackgroundColor, exportMeasurementGroupBorderColor, exportMeasurementGroupBorderWidth, exportMeasurementGroupBorderDashArray, exportMeasurementGroupAnchorPoint, exportMeasurementGroupLocalOffset, exportMeasurementGroupMetrics, buildExportMeasurementGroupMarkup } from "./svgExportUtils";
import { customParamId, deviceDefinitionRowId, stateDraftRowId, DEFAULT_STATE_PAGE_ID, isDefaultStatePageId, createStateDraftRow, createStateDraftRowFromDefaultVisual, defaultStateDraftRow, createDefinitionStateDraftRows, normalizeStateDraftRows, validateStateDraftRows, stateVisualFromDraftRow, activeStateDraftRow, normalizeStatePageId, stateDraftImageValue, stateIconDrawingDraftSourceImage, stateIconDrawingInlineNeedsDraftReload, stateIconDrawingInlineCanPersistDraft, stateVisualShapeLabel, generateStateVisualShapeImage, stateIconDrawingElementId, visibleStateIconColor, createStateIconDrawingElement, createImportedStateIconElement, svgSourceFromDataUrl, parseStateIconSvgSource, stateIconSvgElementSource, parseSvgStyleAttribute, stateIconSvgReactAttributes, stateIconSvgNodeChildren, stateIconSvgNodeToReact, stateIconSvgSourceToReactNodes, createEditableStateIconElementsFromSvgSource, createStateIconDrawingInitialElements, svgSourceToDataUrl, stateIconDrawingSvgElementMarkup, stateIconDrawingElementMarkup, stateIconDrawingToImage, stateIconDrawingFrameRect, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, type StateVisualShapeKind, type StateIconDrawingElement, type DeviceDefinitionStateDraftRow } from "./stateIconDrawing";
import { fallbackComponentTypeForAttributeLibrary, resolveTemplateComponentType, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, isReservedDeviceDefinitionParamName, createDefinitionDraftRows, normalizeCustomDeviceTerminalAnchorCoordinate, projectCustomDeviceTerminalAnchorToBoundary, customDeviceTerminalAnchorKey, hasOverlappingCustomDeviceTerminalAnchors, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, createCustomDeviceDraftFromTemplate, createDefinitionVisualDraft, defaultContainerAssociationForTerminalType, isAssociationAllowedForTerminal, normalizeContainerTerminalAssociations, customDefaultDefinitions, generateCustomDeviceImage, customDeviceImageWithTerminalConnectors, customDeviceGeneratedDefaultImageCandidates, syncInheritedCustomDeviceStateVisuals, parseCustomDefinitions, screenToSvgPoint, primaryOrthogonalAxis, constrainPointToOrthogonalAxis } from "./customDeviceUtils";
import { useBatchEditors } from "./hooks/useBatchEditors";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import { createRuntimeWsClient } from "./runtimeWsClient";
import { createRuntimeSnapshotHandler } from "./runtimeSnapshot";
import { createRuntimeScreenshotHandler } from "./runtimeScreenshot";
export * from "./appExtracted/appCoreCanvasUtilities";
export * from "./appExtracted/appPersistenceLibraryExport";
import { ENABLE_REACT_FLOW_PREVIEW, ReactFlowPreview, INTERACTION_MODE_STORAGE_KEY, CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR, CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR, CANVAS_KEYBOARD_BLOCKING_SELECTOR, CANVAS_KEYBOARD_SURFACE_SELECTOR, normalizeInteractionMode, isCanvasGraphicContextMenuTarget, isCanvasWheelZoomExcludedTarget, canvasWheelTargetIsRenderedCanvas, isCanvasKeyboardBlockingTarget, readStoredInteractionMode, writeStoredInteractionMode, CANVAS_SELECTION_DRAG_THRESHOLD, hasCanvasSelectionModifier, canvasWheelEventHasNoModifier, shouldZoomCanvasFromWheelEvent, isGroupTransformDrag, selectionRectCenter, combineSelectionRects, routeMidpoint, rotatePointAround, snapRotationDeltaToRightAngle, normalizedRotationDelta, transformPointAngle, rotationDeltaFromTransformPoint, rotationDeltaBetweenTransformPoints, rotationTrajectoryArcPath, mirrorPointAcrossAxis, localScaleKindForScreenHandle, groupTransformGeometry, transformGroupPoint, groupTransformSvgTransform, NODE_LABEL_DISPLAY_MODES, CONTEXT_MENU_VIEWPORT_PADDING, CONTEXT_MENU_FALLBACK_WIDTH, CONTEXT_MENU_FALLBACK_HEIGHT, CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH, CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT, NODE_LABEL_FOOTPRINT_PARAM_KEYS, isMultiNodeMoveState, reuseSetOrCreate, cloneMeasurementGroupForDraft, terminalColor, busEndpointColor, ENERGY_COLOR_ROWS, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, isElectricPaletteType, terminalVbaseFallbackValue, voltageColorKeyForTerminal, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_BACKGROUND, MOVE_BOUNDARY_GUARD, CANVAS_AUTO_EXPAND_PADDING, CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE, CANVAS_RESIZE_HANDLE_SIZE, MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, ORIGINAL_POSITION_REROUTE_PADDING, MOVE_ROUTE_LOCAL_SEARCH_PADDING, MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES, MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, KEYBOARD_MOVE_COMMIT_DELAY_MS, KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND, KEYBOARD_MOVE_FRAME_INTERVAL_MS, ELEMENT_TREE_INITIAL_ITEM_LIMIT, ELEMENT_TREE_ITEM_LIMIT_STEP, TOPOLOGY_WARNING_PAGE_SIZE, CANVAS_MINIMAP_WIDTH, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_PADDING, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH, NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MARGIN, DEVICE_DEFINITION_DIALOG_DEFAULT_WIDTH, DEVICE_DEFINITION_DIALOG_DEFAULT_HEIGHT, CUSTOM_DEVICE_DIALOG_DEFAULT_WIDTH, CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT, MEASUREMENT_CONFIG_DIALOG_DEFAULT_WIDTH, MEASUREMENT_CONFIG_DIALOG_DEFAULT_HEIGHT, DEVICE_LIBRARY_DIALOG_MIN_WIDTH, DEVICE_LIBRARY_DIALOG_MIN_HEIGHT, DEVICE_LIBRARY_DIALOG_MARGIN, DEVICE_LIBRARY_DIALOG_CONFIG, TOPOLOGY_WARNING_PANEL_DEFAULT_WIDTH, TOPOLOGY_WARNING_PANEL_MIN_WIDTH, TOPOLOGY_WARNING_PANEL_MAX_WIDTH, TOPOLOGY_WARNING_PANEL_MARGIN, CANVAS_MINIMAP_MAX_NODE_MARKS, CANVAS_MINIMAP_MAX_ROUTE_MARKS, CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD, FIT_SELECTION_MAX_ZOOM_PERCENT, TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD, CANVAS_LOD_NODE_DETAIL_LIMIT, CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, CANVAS_LOD_MAX_ZOOM_PERCENT, CANVAS_LOD_MAX_NODE_SCREEN_SIZE, CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT, CANVAS_LOD_SELECTED_DETAIL_LIMIT, CANVAS_LOD_MARKUP_CHUNK_SIZE, CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE, CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS, CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, CONNECTION_HIT_SCREEN_TOLERANCE, CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT, CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT, CANVAS_BULK_MOVE_EDGE_THRESHOLD, ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD, BULK_MOVE_PERF_LOG_THRESHOLD_MS, SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, SMART_ALIGNMENT_GUIDE_PADDING, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, CANVAS_FLOATING_TOOLBAR_GAP, NODE_FLOATING_TOOLBAR_WIDTH, NODE_FLOATING_TOOLBAR_HEIGHT, EDGE_FLOATING_TOOLBAR_WIDTH, EDGE_FLOATING_TOOLBAR_HEIGHT, CONTEXT_MENU_AUTO_HIDE_MARGIN, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, E_SECTION_OPTIONS, COMPONENT_TYPE_LABELS, SCALE_HANDLE_CONFIGS, GROUP_SCALE_HANDLE_CONFIGS, POWER_UNIT_OPTIONS, VOLTAGE_UNIT_OPTIONS, CURRENT_UNIT_OPTIONS, DEFAULT_ATTRIBUTE_LIBRARIES, CUSTOM_ATTRIBUTE_LIBRARY_BASES, PROTECTED_ATTRIBUTE_LIBRARIES, DEVICE_TYPE_NAME_PATTERN, MAX_CUSTOM_DEVICE_TERMINALS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, TERMINAL_TYPE_OPTIONS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, PARAM_VALUE_TYPE_OPTIONS, PROJECT_PANEL_MIN_HEIGHT, PROJECT_PANEL_MAX_HEIGHT, PROJECT_PANEL_DEFAULT_HEIGHT, LEFT_PANEL_DEFAULT_WIDTH, RIGHT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH, STATUSBAR_DEFAULT_HEIGHT, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT, VALIDATION_PANEL_DEFAULT_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT, CONNECT_TERMINAL_SNAP_TOLERANCE, CONNECT_BUS_SNAP_TOLERANCE, connectTargetSearchBounds, findNodeTerminalSnapTarget, applyNodeTerminalSnap, pointOnBusForSnap, findNodeBusSnapTarget, SAMPLE_NODES, SAMPLE_EDGES, PROJECT_STORAGE_KEY, SCHEME_STORAGE_KEY, ACTIVE_PROJECT_STORAGE_KEY, DRAFT_PROJECT_STORAGE_KEY, REFRESH_RECOVERY_STORAGE_KEY, EMPTY_VOLTAGE_COLOR_KEY_SET, EMPTY_ID_LIST, EMPTY_EDGE_ID_LIST, EMPTY_MODEL_GROUPS, EMPTY_MODEL_GROUP_BY_ID, EMPTY_CANVAS_LAYOUT_UNITS, EMPTY_CANVAS_SELECTION, IMAGE_STORAGE_KEY, CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY, CUSTOM_COMPONENT_TYPES_STORAGE_KEY, DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, COLOR_DISPLAY_MODE_STORAGE_KEY, COLOR_PALETTE_STORAGE_KEY, MEASUREMENT_CONFIG_STORAGE_KEY, LEFT_PANEL_MODE_STORAGE_KEY, RIGHT_PANEL_MODE_STORAGE_KEY, LEFT_PANEL_WIDTH_STORAGE_KEY, RIGHT_PANEL_WIDTH_STORAGE_KEY, STATUSBAR_HEIGHT_STORAGE_KEY, VALIDATION_PANEL_HEIGHT_STORAGE_KEY, DEFAULT_GRAPH_TEMPLATE_TYPES, scheduleIdleWork, elementTreeCacheSignature, CONNECTION_REDRAW_SCOPE_LABELS, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_BASE_SET_PRESETS, VIEWPORT_RENDER_PADDING_RATIO, VIEWPORT_RENDER_MIN_PADDING, CANVAS_VIEWPORT_QUERY_SNAP_SIZE, NODE_SPATIAL_BUCKET_SIZE, nextSpatialQueryMark, expandViewBoxForRendering, snapRenderViewportBoundsForQuery, sameCanvasViewBox, canvasFrameHasHorizontalScrollableRange, canvasFrameHasVerticalScrollableRange, canvasFrameHasScrollableRange, renderedCanvasFullyFitsFrame, canvasFrameViewportSizeChanged, visibleCanvasViewBoxFromRects, canvasScrollScaleFromViewBox, estimatedViewportNodeScreenSize, canvasScrollEdgeInset, canvasScrollSurfaceSize, canvasDisplayOffset, canvasFramePaddingOffset, anchoredCanvasScrollPosition, anchoredCanvasNoScrollOffset, initialVisibleCanvasViewBox, fitWholeCanvasViewBox, boxesIntersect, sameRenderViewportBounds, VIEWPORT_RESULT_CACHE_LIMIT, viewportBoundsCacheKey, viewportResultCacheOwnersEqual, resetViewportResultCache, readViewportResultCache, writeViewportResultCache, mergeRenderViewportBounds, smartAlignmentAxisAnchors, bestSmartAlignmentAxisSnap, nodeRenderBounds, nodeIntersectsRenderViewport, spatialBucketKey, spatialBucketRange, buildNodeSpatialIndex, queryNodeSpatialIndex, compactPreviewNodes, PARAM_LABELS, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, PARAM_OPTIONS, STATIC_BUTTON_ACTION_LABELS, STATIC_BUTTON_COMMAND_LABELS, PARAM_OPTION_LABELS, parseStaticButtonTargetLayerValues, serializeStaticButtonTargetLayerIds, resolveStaticButtonTargetLayers, paramOptionsForSection, READONLY_E_PARAM_KEYS, BATCH_PARAM_EXCLUDED_KEYS, BATCH_PARAM_EXCLUDED_PREFIXES, canBatchEditParam, BATCH_GRAPH_PARAM_KEYS, BATCH_GRAPH_PARAM_PREFIXES, isBatchGraphCommonParamKey, isRedundantBatchCommonParamRow, COLOR_PARAM_KEY_PATTERN, isColorParamKey, BATCH_MEASUREMENT_GROUP_KEYS, BATCH_MEASUREMENT_GROUP_LABELS, measurementGroupCommonValue, measurementGroupWithCommonSetting, normalizeLegacyPowerSystemLabel, normalizeSavedProjectIndexes, normalizeSavedSchemeIndexes, normalizeStoredDraftProject, readActiveProjectPointer, savedSchemePathForId, findSavedSchemeByPath, findSavedProjectByActivePointer, activeProjectPointerPayload, draftProjectFromSavedSchemes, readRefreshRecoveryProject, writeRefreshRecoveryProject, clearRefreshRecoveryProject, readImageAssets, saveImageAsset, resolveNodeImage, resolveNodeForegroundImage, resolveProjectImage, imageAssetsToMap, localImageAssetsFromStorage, pointsToPreviewPath, backendJsonHeaders, backendErrorMessage, fetchBackendJson, backendJsonRequest, fetchBackendImageFolders, createBackendImageFolder, renameBackendImageFolder, deleteBackendImageFolder, fetchBackendImages, fetchAllBackendImages, deleteBackendImageAsset, uploadBackendImage } from "./appExtracted/appCoreCanvasUtilities";
import { normalizeProjectForBackend, normalizeSchemesForBackendRuntime, normalizeSchemesForBackend, serializeSchemesForStorage, findProjectRecordInSchemes, findProjectRecordByNameInScheme, clonePoint, cloneNodesForUndo, cloneEdgesForUndo, cloneGroupsForUndo, cloneTopologyForUndo, cloneTopologyErrorsForUndo, clampCanvasDimension, fetchBackendSchemes, schemePathQueryParam, savedProjectRecordIsSummary, fetchBackendProjectRecord, downloadBackendSchemeArchive, uploadBackendSchemeArchive, saveBackendProjectRecord, deleteBackendProjectRecord, saveBackendSchemeRecord, deleteBackendSchemeRecord, normalizeColorDisplayMode, serializeColorConfigForStorage, fetchBackendColorConfig, saveBackendColorConfigPayload, serializeDeviceLibraryForStorage, fetchBackendDeviceLibrary, saveBackendDeviceLibraryPayload, serializeMeasurementConfigForStorage, fetchBackendMeasurementConfig, saveBackendMeasurementConfigPayload, groupDeviceTemplatesByAttributeLibrary, groupDeviceTemplatesByAttributeLibraryAndComponentType, normalizeLibrarySearchText, attributeLibraryComponentTypeKey, componentTypeDisplayParts, componentTypeDisplayName, filterSelectionTreeLabel, filterSelectionTemplateComponentTypeKey, libraryTemplateMatchesSearch, filterAttributeLibraryComponentTypeGroups, normalizeAttributeLibraryName, normalizeCustomAttributeLibraries, normalizeComponentTypeName, defaultAttributeLibraryForComponentType, isBuiltInAttributeLibrary, isBuiltInComponentType, attributeLibraryOptionClass, componentTypeOptionClass, sourceSelectClassName, isValidComponentTypeName, normalizeCustomComponentTypes, templateResizeTransformValue, templateAllowsResizeTransform, DEFAULT_PARAMETER_ENUM_VALUES, DEFAULT_PARAMETER_ENUM_OPTIONS, normalizeEnumValueList, definitionRowIsEnum, defaultEnumValuesForDefinitionRow, defaultEnumOptionsForDefinitionRow, normalizeEnumOption, normalizeEnumValueType, enumValueTypeForDefinitionRow, enumDefinitionValueTypeForEnumValueType, parameterValueTypeLabelForDefinitionRow, rawEnumValuesForRow, normalizeEnumOptionsForRow, enumValueFromOptions, enumDisplayText, enumValuesForRow, normalizeDefinitionRowEnumFields, renderTypicalValueEditor, renderEnumValuesEditor, normalizeCustomDeviceTemplates, normalizeGraphTemplateTypeName, normalizeGraphTemplateTypes, cloneTemplatePoint, cloneGraphTemplateClipboard, normalizeGraphTemplateClipboard, normalizeGraphTemplates, graphTemplateTypeList, groupGraphTemplatesByType, filterGraphTemplatesByType, uniqueGraphTemplateName, normalizeDefinitionRows, normalizeDefinitionResizePermission, normalizeDefinitionOverrideSize, normalizeDefinitionOverrideTerminalType, normalizeDefinitionOverrideTerminalTypes, normalizeDefinitionOverrideTerminalAnchors, normalizeDeviceDefinitionOverrides, normalizeDeviceLibraryPersistencePayload, readLocalStorageJson, readCustomDeviceTemplates, readCustomAttributeLibraries, readCustomComponentTypes, readDeviceDefinitionOverrides, readCustomGraphTemplateTypes, readCustomGraphTemplates, readLocalDeviceLibraryPersistencePayload, writeLocalDeviceLibraryPersistencePayload, readMeasurementConfig, writeMeasurementConfig, readColorDisplayMode, readColorPalette, readSidePanelMode, clampPanelDimension, clampFloatingDialogLayout, clampNodeDoubleClickDialogLayout, clampDeviceLibraryDialogLayout, readStoredPanelDimension, SCHEME_EXPORT_DIRECTORY_PICKER_ID, fetchBackendImageDataUrl, imageExportPathByIdFromAssets, exportSvgImageHref, nodeGeometryTransform, nodeUprightScaleTransform, nodeImageContentTransform, defaultBackgroundLayerIdsForProject, backgroundPageCanvasTransform, nodeTransformedHalfExtents, nodeScaledLocalHalfExtents, nodeRotateHandleControlPoints, nodeUprightRotateHandleControlPoints, scaleHandleControlPoint, nodeScaleHandleControlPoint, scaleHandleCursorClass, nodeUsesUprightStaticSelectionOutline, TEXT_DOUBLE_CLICK_KINDS, IMAGE_DOUBLE_CLICK_KINDS, NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS, NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS, cloneNodeForDoubleClickDraft, stringRecordShallowEqual, nodeDoubleClickDraftHasModelChanges, isTextDoubleClickKind, isImageDoubleClickKind, nodeHasInteractionDoubleClickEditor, nodeHasTextDoubleClickEditor, nodeHasImageDoubleClickEditor, doubleClickDialogKindForNode, nodeUprightSelectionOutlineRect, emptySmartAlignmentAnchorMap, positionedNodeForSmartAlignment, nodeTerminalOutflowSmartAlignmentAnchors, nodeSmartAlignmentBounds, nodeVisualInteractionBounds, buildSvgTerminalMarkup, CustomComponentManagerTree, tokenArraysEqual, customSingleTerminalAnchorToken, stableSvgMarkupChunks, buildSvgDocument } from "./appExtracted/appPersistenceLibraryExport";
import { createSetNodes, createSetEdges, createSetGraphArrays, createPatchGraphNodes, createPatchGraphEdges, createUpdateGraphNodeById, createSetSchemes, createUpdateSmartAlignmentGuides, createSetCanvasPanning, createSetContextMarqueeSelection, createMarkGraphicContextMenuHandled, createConsumeGraphicContextMenuHandled, createOpenGraphicContextMenu, createSetOperationLogText, createEdgeListForNodeIds, createBuildSingleNodeDragCache, createOrderedNodeFromList, createOrderedNodesForIds, createAddRoutingNodesForConnectionEdge, createRoutingNodesForConnectionEdge, createRoutingNodesForConnectionEdges, createCachedConnectionStrokeColor, createConnectionLineStyle, createMeasurementGroupAnchorPoint, createMeasurementGroupLocalOffset, createMeasurementGroupCanvasPosition, createMeasurementGroupRenderMetrics, createIncludeMeasurementGroupBounds, createBuildMeasurementGroupMarkup, createBuildRoutableLineDragGhostRoutesForNodeIds, createBuildMultiNodeDragOverlayPreview, createRenderMultiNodeDragOverlay, createGroupTransformPreviewNodeFromSnapshot, createRenderGroupTransformPhotoPreview, createRenderSingleTransformRotateOriginGhost, createRenderTransformRotationTrajectory, createRenderBoundaryBusInternalConnector, createCollectCurrentModelVoltageColorKeys, createNearestVoltageColor, createFillMissingVoltageColorRows, createToggleColorDisplayMode, createOpenColorPaletteDialog, createSaveColorPalette, createResetEnergyColors, createResetVoltageColors, createUpdateEnergyColor, createSetVoltageColorRows, createUpdateVoltageColorRow, createDeleteVoltageColorRow, createAddVoltageColorRow, createResolveNodeStateVisual, createStatusStatesForNode, createNodeKindAllowsResizeTransform, createClearLibraryFlyoutCloseTimer, createHideLibraryFlyout, createScheduleLibraryFlyoutClose, createLibraryFlyoutStyle, createFitLibraryFlyoutsToVisibleArea, createToggleAttributeLibrary, createToggleAttributeLibraryComponentType, createResolveConfiguredBackgroundLayerIds, createToggleBackgroundLayer, createElementTreeItemChildren, createUpdateElementTreeDraft, createClearElementTreeDraft, createElementTreeCommittedDraftValue, createCommitElementTreeInputOnEnter, createMarkBusTerminalSyncDirty, createBusNodeIdsFromEdges, createMarkBusTerminalSyncDirtyForEdges, createBusTerminalSyncNodeIdsForGraphPatch, createSynchronizePendingBusTerminalsWithGraphStore, createApplyCanvasPanningVisualOffset, createCancelCanvasBoundsScrollSyncPendingRelease, createClearCanvasBoundsScrollSyncPending, createReleaseCanvasBoundsScrollSyncPending, createMarkCanvasBoundsScrollSyncPending, createCanvasBoundsForGraphContent, createApplyCanvasBounds, createRejectAutoCanvasExpansionForContent, createCanvasBoundsForAutoExpandedGraphContent, createTranslateStoredEdgeGeometryBy, createShiftCachedRoutesForCanvasOrigin, createLeftTopCanvasOriginShiftForContent, createMinimumCanvasBoundsForResizeEdge, createClampNodePositionToExpandableBounds, createClampPointToExpandableBounds, createClampEdgeGeometryToExpandableBounds, createCanvasNoScrollOffsetForCanvasResizeAnchor, createSetCanvasFrameScrollPosition, createCenterCanvasFrameScrollPosition, createSyncCanvasFrameScrollToViewBox, createSyncCanvasFrameScrollToCanvasResizeCommitAnchor, createSyncCanvasFrameScrollToWheelAnchor, createCurrentViewBoxFromCanvasFrameScroll, createScheduleCanvasVisibleViewBoxUpdate, createHandleCanvasFrameScroll, createUpdateCanvasFrameViewportSize, createUpdateCanvasFrameViewportAndVisibleBox, createNodeImage, createRenderNodePreviewImageContent, createBuildNodePreviewImageMarkup, createBuildConnectPreviewPath, createBuildRoutableLinePreviewPath, createPatchStoredRouteStoreForEdgeIds, createMarkRouteEdgesDirty, createMarkStoredRouteEdgesDirty, createEdgeListsHaveSameOrder, createEdgeReferenceDiffIds, createDirtyEdgeIdsAfterMove, createDirtyEdgeIdsForMovedLocalRoutes, createDirtyEdgeIdsAfterBulkMove, createLogBulkMoveCommitStats, createBuildMovedNodeUpdates, createNextNodesForMovedGraphCommit, createEdgePatchFromCandidateEdges, createGraphStorePatchStillCurrent, createShouldRunSynchronousMoveBlockerRepair, createMarkGraphDirtyForInteractiveCommit, createPatchSingleTerminalAnchorFromPoint, createRebuildEdgeUpdatesAfterNodeGeometryChange, createRebuildEdgesAfterNodeGeometryChange, createStoredRouteEndpointMatchPoint, createEndpointMatchedRoutePointsForEdge, createEdgeWithFrozenBusEndpointPoints, createPreviewStoredRoutePointsForEdge, createClearLocalSchemeModelCache, createRememberPersistedSchemesPayload, createRefreshSchemesFromBackendDirectory, createHandleBackendSchemeMutationFailure, createSaveSchemeTreeToBackend, createPersistSchemeTreeToBackend, createReplaceSchemeTreeInBackend, createPersistRefreshRecoveryNow, createClearRecordSelection, createBlurLayerManagementDropdownFocus, createSelectSingleScheme, createSelectSingleProject, createToggleSchemeSelection, createToggleProjectSelection, createUndoGraphSnapshotPatchPlan, createApplyUndoGraphSnapshot, createPushUndoSnapshot, createUniqueUndoScopeIds, createPushNodeOnlyUndoSnapshot, createSyncExistingNodesWithTemplateDefinitions, createUpdateMeasurementConfig, createPrepareMeasurementConfigDraft, createOpenMeasurementConfigDialog, createCloseMeasurementConfigDialog, createSaveMeasurementConfigDialog, createUpdateMeasurementType, createAddMeasurementType, createDeleteMeasurementType, createSetMeasurementProfileItems, createCreateMeasurementProfileItem, createAddMeasurementProfileItem, createUpdateMeasurementProfileItem, createDeleteMeasurementProfileItem, createMoveMeasurementProfileItem, createUpdateProjectMeasurementsWithUndo, createAddDefaultMeasurementsToNode, createRemoveMeasurementsFromNode, createMeasurementGroupShellOffsetForNode, createMeasurementSourcePointForNodeItem, createMeasurementTypeOptionsForMeasurementGroup, createCreateMeasurementItemForNode, createUpdateMeasurementGroupById, createUpdateSelectedMeasurementGroup, createUpdateSelectedMeasurementGroups, createAddMeasurementItemToGroup, createAddMeasurementItemToNode, createUpdateMeasurementItem, createRemoveMeasurementItem, createCreateMeasurementEditorGroupForPosition, createUpdateMeasurementEditorGroupSettings, createUpdateMeasurementEditorDraftItem, createAddMeasurementEditorDraftItem, createRemoveMeasurementEditorDraftItem, createMoveMeasurementEditorDraftItem, createUpdateMeasurementEditorDraftItemPosition, createDuplicateMeasurementEditorItemNames, createConfirmMeasurementEditorDialog, createRenderSelectedNodeMeasurementTable, createBeginMeasurementDrag, createUpdateMeasurementDrag, createFinishMeasurementDrag } from "./appExtracted/appGraphMeasurementFactories";
import { createFlushMeasurementConfigDialogDraftInputs } from "./appExtracted/appGraphMeasurementFactories";
import { createEnsureDraggingUndoSnapshot, createRequestCanvasFrameCenter, createUndoLastOperation, createCanvasPointerKeyboardShortcutAvailability, createRouteForCurrentEdgeSave, createCurrentProject, createAdjustSelectedDisplayLayer, createClearTransientSelectionState, createWriteOperationLog, createRequireEditMode, createPersistDeviceLibraryChange, createPersistTemplateLibraryChange, createConnectionCommitFailureMessage, createSwitchInspectorTabForCanvasSelection, createSelectCanvasGraphics, createSetModifierSelectionPress, createToggleNodeSelectionFromModifierClick, createToggleEdgeSelectionFromModifierClick, createToggleSelectionFromModifierClick, createRestoreCanvasSelectionSnapshot, createRestoreCanvasSelectionSnapshotWithInspector, createStartModifierSelectionPress, createCancelModifierSelectionPress, createFinishModifierSelectionPress, createStartNodeLabelDrag, createStartNodeLabelRotateDrag, createFinishNodeLabelDrag, createFinishNodeLabelRotateDrag, createSetSelectedNodeLabelDisplayMode, createToggleSelectedNodeLabelDisplay, createCopySelection, createCutSelection, createPasteSelection, createCreateGraphTemplateType, createCreateGroupDeviceIconSvg, createGroupDeviceTerminalAnchor, createGroupDeviceTerminalSortKey, createGroupDeviceTerminalAssociationFor, createGroupDeviceExternalTerminals, createValidateGroupDeviceIconReplacement, createReplaceBuiltinDeviceIconOverride, createOpenGroupDeviceDefinitionDialog, createConfirmCreateDeviceFromGroup, createConfirmReplaceDeviceIconFromGroup, createOpenAddTemplateDialog, createCancelTemplateDialog, createConfirmAddGraphTemplate, createDeleteGraphTemplate, createDeleteGraphTemplateType, createDropGraphTemplate, createFinishMarqueeSelectionFromPoints, createStartContextMarqueeSelection, createOpenFilterSelectionDialog, createToggleFilterSelectionType, createToggleFilterSelectionItem, createConfirmFilterSelectionDialog, createFinishMarqueeSelection, createDeleteSelection, createDeleteSelectedGraphicsFromCanvas, createGroupSelectedGraphics, createUngroupSelectedGraphics, createManualPointDeltaForEdge, createRoutePreserveEdgeIdsForMovedNodes, createRouteSnapshotEdgesForMove, createRouteTouchesExpandedBoxes, createBoundsForNodeSet, createMergeNodeUpdateLists, createMergeUniqueEdgesById, createCompleteNodeListForPartialPatch, createIsWholeActiveLayerMove, createInternalMoveEdgeIdsForMovedNodes, createExternalMoveCandidateEdges, createInternalMoveCandidateEdges, createTranslateInternalMoveCandidateEdges, createTranslateWholeMoveCandidateEdges, createInternalRoutableLineNodeUpdatesForMove, createRoutableLineRouteCandidateIdsForMovedNodes, createRebuildRoutableLineNodeUpdatesForChangedNodes, createScheduleDeferredRoutableLineRouteRepair, createLocalRouteOptimizationEdges, createLocalRouteOptimizationCandidateEdges, createRoutePointsForMovedNodeBlockers, createRoutePointsForMovedEdgesBlockedByStationaryNodes, createRoutePointsNearOriginalMovedNodes, createAdjustEdgesAfterNodeMove, createRebuildSingleAffectedConnectionRoute, createSynchronousEdgeAdjustmentCandidates, createShouldAdjustEdgeSynchronouslyAfterMove, createMergeAdjustedCandidateEdges, createTerminalReconcileNodeScope, createFinalizeMovedNodeEdgesFast, createOptimizeMovedNodeEdgeRoutes, createShouldRunDeferredMoveOptimization, createScheduleMovedEdgeOptimization, createScheduleDeferredMovedConnectionRepair, createMoveRouteRepairSeedEdges, createLightweightMovedEndpointRoute, createPatchCachedRoutesForHighFanoutMove, createPatchCachedRoutesForBulkTranslation, createPatchCachedRoutesForWholeMove, createPatchCachedRoutesForInternalMove, createStoredRouteDirtyIdsForMove, createBuildBulkMovePlan, createCommitFastMovedGraphPatches, createUpdateMouseStatus, createUpdateMultiNodeDragOverlayTransform, createShowImperativeMultiNodeDragOverlay, createHideImperativeMultiNodeDragOverlay, createResetMultiNodeDragOverlayTransform, createBuildSingleNodeDragPreviewNodeMarkup, createClearImperativeNodeDragEdgePreview, createShowImperativeSingleNodeDragPreview, createCssSelectorEscape, createClearImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOrigin, createBindCanvasNodeElement, createHideImperativeSingleNodeDragPreview, createSingleNodeDragPreviewNodeFor, createSingleNodeDragRelevantEdges, createSingleNodeDragPreviewBounds, createSingleNodeDragEdgeTouchesBounds, createSingleNodeDragViewportLocalEdgesByScan, createSingleNodeDragScopedEdges, createSimpleOrthogonalDragPreviewPoints, createRoutableLineIdsConnectedToNodeIds, createRoutableLineEndpointPreviewRoutePoints, createBuildRoutableLinePreviewRoutesForNodeUpdates, createBuildRoutableLineEndpointPreviewNodeUpdates, createBuildTranslatedInternalRoutableLineDragPreviewRoutes, createBuildRoutableLineDragPreviewRoutes, createBuildCachedSingleNodeDragPreviewRoutes, createBuildDragPreviewEndpointPoints, createConnectionEndpointPreviewRoutePoints, createBuildLightweightNodeDragPreviewRoutes, createBuildLightweightNodeDragPreviewRouteMarkup, createSyncImperativeNodeDragPreviewPaths, createUpdateNodeDragLightweightEdgePreview, createSingleNodeDragInteractionNodes, createMultiNodeDragInteractionNodes, createUpdateImperativeNodeDragDropHint, createFindSingleNodeDragSnapTargetAtDelta, createFindMultiNodeDragSnapTargetAtDelta } from "./appExtracted/appSelectionDragFactories";
import { createUpdateSingleNodeDragImperativePreview, createStartDraggingState, createFlushConnectPreviewDom, createSetConnectPreviewDom, createApplyConnectPreviewState, createScheduleConnectPreviewPoint, createApplyRoutableLinePreviewState, createScheduleRoutableLinePreviewPoint, createReleaseRoutableLinePreviewAxisLock, createLockRoutableLinePreviewAxis, createAppendRoutableLinePreviewManualPoint, createResolveRoutableLinePreviewPoint, createResetRoutableLinePreviewState, createScheduleRewirePreviewPoint, createResetConnectPreviewState, createReleaseConnectPreviewAxisLock, createConnectSourceEndpointPoint, createLockConnectPreviewAxis, createAppendConnectPreviewManualPoint, createResolveConnectPreviewPoint, createBoundedDeltaForNodes, createBoundedDeltaForMultiNodeInteractiveMove, createNodeMoveGeometryInsideCanvas, createNearestBoundarySafeDelta, createBoundedDeltaForMoveGeometry, createCommitSafeDeltaForDraggingState, createCanvasBoundsForMovedNodeDelta, createDragBoundsForSmartAlignment, createTerminalOutflowAnchorsForSmartAlignmentDrag, createComputeSmartAlignmentSnap, createComputeNodeDragPreviewDelta, createComputeNodeDragDelta, createApplyNodeDragMove, createScheduleNodeDragMove, createFlushPendingNodeDragMove, createClearNodeDragMoveSchedule, createClearKeyboardMoveCommitSchedule, createClearKeyboardNudgeSchedule, createClearDraggingMoveState, createCancelActiveEditInteractions, createEnterBrowseMode, createRequestEnterBrowseMode, createToggleInteractionMode, createFinishDraggingMove, createFinishNodeDrag, createFinishTransformDrag, createFinishKeyboardMove, createScheduleKeyboardMoveCommit, createApplyKeyboardMoveDelta, createFlushPendingKeyboardMove, createKeyboardMoveActiveFrameDelta, createAppendPendingKeyboardMoveDelta, createScheduleKeyboardNudgeFrame, createReleaseKeyboardMoveKey, createStartKeyboardMoveSession, createNudgeSelectionByKeyboard, createMoveSelection, createUndoScopeForNodeFootprintPatch, createUpdateSelectedNode, createCommitNodeFootprintUpdates, createAssignSelectedNodesToModelLayer, createOpenLayerAssignmentDialog, createApplyLayerAssignmentDialog, createRotateSelectedLayoutUnits, createMirrorSelectedNodes, createUpdateCanvasSize, createCommitCanvasSizeDraft, createResetCanvasSizeDraft, createHandleCanvasSizeBlur, createHandleCanvasSizeKeyDown, createUpdateParam, createApplyBatchCommonParamPatch, createApplyBatchCommonParam, createApplyBatchCommonMeasurementGroupSetting, createCommitElementTreeNodeIdentity, createCommitElementTreeContainerChildParam, createTerminalVbaseFallback, createUpdateTerminalVbase, createRenderParamHeader, createRenderNodeDoubleClickDeviceParamRows, createRememberNodeDoubleClickDialogGuard, createSuppressNodeDoubleClickDialogEvent, createFinishNodeDoubleClickDialogPointerOperation, createStopNodeDoubleClickDialogEvent, createCurrentNodeDoubleClickDialogRect, createStartNodeDoubleClickDialogDrag, createStartNodeDoubleClickDialogResize, createCancelNodeDoubleClickDialog, createConfirmNodeDoubleClickDialog, createRenderNodeDoubleClickDialog, createContextMenuPlacement, createContextMenuStyle, createContextMenuClassName, createStopSidePanelEventPropagation, createSetSidePanelMode, createPointerClientTargetInside, createPointerInsideElementRect, createUpdateAutoPanelVisibility, createActivateInspectorFromCanvas, createOpenMeasurementEditorForNode, createHandleSidePanelPointerLeave, createHideAutoPanelsFromWorkspace, createAppendDistinctStaticDrawingPoint, createRenderStaticBoxDrawingPreview, createStartInteractiveStaticDrawing, createCancelInteractiveStaticDrawing, createFinishInteractiveStaticDrawing, createAppendStaticDrawingPoint, createUpdateInteractiveStaticDrawingPreview, createRenderInteractiveStaticDrawingPreview, createStartLibraryDevicePlacement, createStartLibraryGraphTemplatePlacement, createCancelLibraryPlacement, createUpdateLibraryPlacementPreview, createClearLibraryPlacementPreview, createPlaceLibraryDeviceAtPoint, createCommitLibraryPlacementAtPoint, createRenderLibraryPlacementPreview, createStartSidePanelResize, createStartCanvasResize, createStartCanvasResizeFromRightOverlay, createStartCanvasResizeFromLeftOverlay, createStartCanvasResizeFromBottomOverlay, createStartCanvasResizeFromTopOverlay, createStartStatusbarResize, createCurrentTopologyWarningPanelRect, createStartTopologyWarningPanelDrag, createStartTopologyWarningPanelResize, createRenderSidePanelModeControls, createRenderSidePanelEdgeTrigger, createNormalizeStaticBoxDimension, createToLocalNodePoint, createSingleTransformNodeUpdate, createSignedScaleFromRotatedHandleDelta, createSignedScaleFromUprightHandleDelta, createProportionalSignedScaleFromHandleDelta, createProportionalSignedScaleFromUprightHandleDelta, createCurrentStoredRoutePointsForEdge, createBuildMirrorLayoutUnitEdgeUpdates, createBuildRotateLayoutUnitEdgeUpdates, createBuildGroupTransformEdgeUpdates, createOverlayEdgeUpdatesForTransform, createStartGroupTransformDrag, createStartSingleTransformDrag, createStartGroupMoveDrag, createBuildGroupTransformNodeUpdates, createRotateLayoutUnitNodeUpdates, createMirrorLayoutUnitNodeUpdates, createBusAnchorFromEvent, createBusAnchorFromPoint, createIsPointOnBus, createIsPointNearBus, createFindRewireTargetAtPoint, createFindConnectTargetAtPoint, createFindRoutableLineEndpointTargetAtPoint } from "./appExtracted/appCanvasInteractionFactories";
import { createCommitRoutableLineDevice, createStartRoutableLineFromTerminal, createFinishRoutableLineToTarget, createUpdateRoutableLineEndpointDrag, createStartRoutableLineEndpointDrag, createFinishRoutableLineEndpointDrag, createCommitNewConnectionEdge, createFinishConnectToTarget, createFinishRewiring, createHandleDrop, createHandleRoutableLineNodePointerDown, createHandleNodePointerDown, createHandleRoutableLineNodePathPointerDown, createHandlePointerMove, createFinishCanvasPanning, createStartCanvasPanning, createHandleCanvasPointerDownCapture, createClientPointInsideRenderedCanvas, createFocusCanvasKeyboardShortcutHost, createWheelZoomAnchorFromClient, createFlushPendingWheelZoom, createScheduleWheelZoom, createZoomCanvasFromWheelEvent, createHandleWheel, createDeleteSelected, createRunContextMenuAction, createReadjustMovedBusConnectionRoutes, createReadjustActiveLayerBusEndpointRoutes, createCommitLayoutNodePositions, createApplySelectedNodeLayout, createAutoSpreadCanvasGraphics, createAutoAlignCanvasGraphics, createDefaultVoltageBaseSetValue, createRecommendedVoltageBaseSetMode, createDefaultVoltageBaseTerminalValues, createDefaultVoltageBaseTerminalKey, createActiveVoltageBaseTerminalValues, createSetVoltageBaseTerminalValue, createMergeVoltageBaseSetResults, createVoltageBaseSetReady, createVoltageBaseSetResultForScope, createOpenVoltageBaseSetDialog, createConfirmVoltageBaseSetDialog, createOpenVoltageBaseClearDialog, createConfirmVoltageBaseClearDialog, createConnectionRedrawViewportBounds, createConnectionRedrawEdgeIdsForScope, createConnectionRedrawLineNodeIdsForScope, createConnectionRedrawTargetsForScope, createRedrawConnectionRoutes, createOpenConnectionRedrawDialog, createConfirmConnectionRedrawDialog, createAlignSelected, createDistributeSelected, createToggleSchemeExpanded, createPromptUniqueRecordName, createCloneProjectRecordForPaste, createSchemePathForScheme, createSchemePathForProject, createSchemePathForRecord, createCloneSchemeRecord, createCloneSchemeRecordWithName, createCloneSchemeRecordForPaste, createClearActiveProjectDisplay, createLoadSavedProject, createLoadSavedProjectRecord, createRequestUnsavedChangeAction, createRequestLoadSavedProject, createResolveUnsavedChangeAction, createCreateSchemeRecord, createRenameSchemeRecord, createDuplicateSchemeRecord, createDeleteSchemeRecord, createCopySelectedRecord, createDeleteSelectedRecords, createCopyProjectRecord, createCopySchemeRecord, createPasteSchemeClipboardRecord, createPasteProjectClipboardRecord, createPasteSelectedRecord, createCommitProjectRecordMove, createResolveRecordPasteConflict, createMoveProjectRecordToScheme, createMoveSchemeRecordToScheme, createSaveActiveProjectPointer, createSetActiveLayer, createNextDefaultModelLayerName, createAddModelLayer, createClearLayerNameDraft, createCommitModelLayerName, createHandleLayerNameInputKeyDown, createToggleModelLayerVisibility, createSetAllModelLayersVisibility, createMoveModelLayer, createDeleteModelLayer, createRenderDeviceDefinitionMeasurementPanel, createRenderMeasurementConfigDialog, createRenderMeasurementEditorDialog, createSaveCurrentProject, createRenameProjectRecord, createDuplicateProjectRecord, createDuplicateSelectedProjectRecords, createDuplicateSelectedSchemeRecords, createDeleteProjectRecord, createCreateBlankProject, createLocateTopologyError, createRunTopologyCalculation, createGetEdgeEndpointPoint, createCenterViewOnPoint, createViewportCenterAnchorForPoint, createSetViewBoxAtViewportCenter, createCenterViewBoxOnPoint, createCenterViewOnPointAtZoom, createZoomViewportAtCenter, createResetViewportZoom, createFitWholeCanvasToFrame, createFitWholeCanvasFromBlankDoubleClick, createFitViewToBounds, createFitViewToContent, createFocusElementTreeItem, createJumpToElementTreeItem, createOpenElementTreeItemContextMenu, createSetEdgeManualPoints, createRouteManualPoints, createFinishManualPathDrag, createTidySelectedEdgeRoute, createTidyRoutableLineRoute } from "./appExtracted/appProjectCanvasFactories";
import { createOpenEdgeContextMenu, createCaptureCanvasPointer, createStartManualSegmentDrag, createStartManualPointDrag, createRouteSegmentPointerDistance, createFindEditableRouteSegmentIndex, createConnectionHitTolerance, createFindConnectionRouteHitAtPoint, createInsertManualBendAtPoint, createInsertManualBendFromPointer, createAddManualBendFromContextMenu, createAddRoutableLineBendFromContextMenu, createInsertManualBendFromEdgePath, createHandleEdgePathPointerDown, createDeleteManualBendPoint, createSetRoutableLineManualPathPoints, createInsertRoutableLineBendAtPoint, createInsertRoutableLineBendFromPointer, createStartRoutableLineSegmentDrag, createStartRoutableLinePointDrag, createDeleteRoutableLineBendPoint, createStartConnectFromTerminal, createFinishTerminalPress, createHandleTerminalPointerDown, createEnsureSavedBeforeExport, createSvgExportReferencedImageHrefById, createLoadSvgImageExportPathById, createExportSvg, createExportEFile, createIsProjectFilePayload, createCreateImportedSchemeRecord, createExportProjectRecordFile, createExportCurrentModelFile, createOpenModelImportFilePicker, createOpenSchemeImportFilePicker, createMergeImportedSchemeIntoExisting, createCommitImportedSchemeRecord, createApplyBackendSchemeArchiveImport, createImportSchemeFile, createCommitImportedModelRecord, createImportModelFile, createResolveDuplicateSchemeImport, createResolveDuplicateModelImport, createExportSchemeRecord, createChooseImage, createApplyExistingImage, createApplyIconLibraryCatalogIcon, createClearSelectedImage, createClearSelectedImageForNode, createCreateImageFolder, createRenameImageFolder, createDeleteImageFolder, createStartProjectRecordDrag, createFinishProjectRecordDrag, createStartSchemeRecordDrag, createFinishSchemeRecordDrag, createRenderProjectSchemeNode, createOpenBlankProjectLibraryContextMenu, createCustomDeviceDefaultStateVisualDraft, createSnapCustomDeviceTerminalAnchor, createCustomDeviceTerminalConnectorSegment, createUpdateCustomDeviceTerminalAnchor, createUpdateCustomDeviceStateDraftRow, createAddCustomDeviceStateDraftRow, createDeleteCustomDeviceStateDraftRow, createUpdateCustomDeviceTerminalAnchorFromPreview, createDefinitionDefaultStateVisualDraft, createSnapDefinitionTerminalAnchor, createDefinitionTerminalConnectorSegment, createUpdateDefinitionTerminalAnchor, createUpdateDefinitionTerminalAnchorFromPreview, createLoadDefinitionTemplateDraft, createFinishDeviceLibraryDialogPointerOperation, createCurrentDeviceLibraryDialogRect, createDeviceLibraryDialogStyle, createStartDeviceLibraryDialogDrag, createStartDeviceLibraryDialogResize, createStopDeviceLibraryDialogEvent, createOpenDeviceDefinitionDialog, createCloseDeviceDefinitionDialog, createCloseCustomDeviceDialog, createRequestCloseCustomDeviceDialog, createSetCustomDeviceDraftCleanBaseline, createCustomDeviceDraftHasUnsavedChanges, createToggleDefinitionGroup, createToggleDefinitionComponentType, createToggleElementTreeGroup, createToggleElementTreeDeviceGroup, createUpdateDefinitionDraftRow, createAddDefinitionDraftRow, createDeleteDefinitionDraftRow, createUpdateDefinitionStateDraftRow, createAddDefinitionStateDraftRow, createDeleteDefinitionStateDraftRow, createUpdateSelectedDefinitionResizePermission, createSaveDeviceDefinitionStateVisualDraft, createSaveDeviceDefinitionVisualDraft, createSaveDeviceDefinitionDraft, createResetDeviceDefinitionDraft, createUpdateCustomDraftTerminalCount, createChooseCustomDeviceBackground, createChooseDefinitionTemplateIcon, createChooseStateVisualImage, createChooseStateIconDrawingImport, createUpdateStateIconDrawingElement, createUpdateStateIconDrawingElements, createStateIconDrawingPointer, createStateIconDrawingSelection, createComputeStateIconDrawingSmartAlignmentSnap, createStartStateIconDrawingDrag, createDragStateIconDrawingSelection, createStopStateIconDrawingDrag, createDeleteSelectedStateIconDrawingElements, createStateIconDrawingKeyDown, createAddStateIconDrawingElement, createDeleteStateIconDrawingElement, createOpenStateIconDrawingDialog, createApplyStateIconDrawingDialog, createEnsureCustomComponentTreeExpanded, createCancelPendingCustomComponentTemplateLoad, createSelectCustomAttributeLibrary, createSelectCustomComponentType, createSelectCustomComponentTemplate, createStartCustomComponentCreate, createNextCustomAttributeLibraryName, createCreateCustomAttributeLibrary, createDeleteCustomAttributeLibrary, createNextCustomComponentTypeName, createCreateCustomComponentType, createDeleteCustomComponentType, createRenameSelectedCustomDeviceTreeItem, createDeleteSelectedCustomDeviceTreeItem, createNextCustomTemplateKind, createSaveCustomDeviceTemplate, createSaveBuiltinDeviceDefinitionFromCustomDraft, createSaveCustomDeviceDefinitionDialog, createRenderStateVisualPager, createRenderDeviceDefinitionVisualPanel, createRenderGraphTemplatePreview, createRenderLibraryTemplateButton, createRenderLibraryFlyout, createLodNodeFromEvent, createLodTerminalIdFromEvent, createHandleLodNodePointerDown, createHandleLodNodeContextMenu } from "./appExtracted/appDeviceDefinitionFactories";
import { createOpenNodeDoubleClickEditor, createHandleLodNodeDoubleClick, createClampFloatingToolbarPosition, createToolbarOverlapArea, createCanvasRectToSurfaceCssRect, createRotateControlAvoidRectFromCanvasPoints, createPlaceFloatingToolbar, createRenderMeasurementGroup, createHandleMinimapNavigate, createCenterSelectedInView, createFitViewToSelection, createClearStaticButtonFeedbackTimer, createSetStaticButtonFeedback, createClearStaticButtonFeedback, createBeginStaticButtonPointerFeedback, createResolveStaticButtonTargetProject, createExecuteStaticButtonCommand, createExecuteStaticButtonAction, createHandleStaticButtonClick, createBeginReadonlyBackgroundStaticButtonPointerFeedback, createRenderReadonlyBackgroundPage, createOpenTopologyWarningPanel, createAppHookCallback1, createAppHookCallback2, createAppHookCallback3, createAppHookCallback4, createAppHookCallback5, createAppHookCallback6, createAppHookCallback7, createAppHookCallback8, createAppHookCallback9, createAppHookCallback10, createAppHookCallback11, createAppHookCallback12, createAppHookCallback13, createAppHookCallback14, createAppHookCallback15, createAppHookCallback16, createAppHookCallback17, createAppHookCallback18, createAppHookCallback19, createAppHookCallback20, createAppHookCallback21, createAppHookCallback22, createAppHookCallback23, createAppHookCallback24, createAppHookCallback25, createAppHookCallback26, createAppHookCallback27, createAppHookCallback28, createAppHookCallback29, createAppHookCallback30, createAppHookCallback31, createAppHookCallback32, createAppHookCallback33, createAppHookCallback34, createAppHookCallback35, createAppHookCallback36, createAppHookCallback37, createAppHookCallback38, createAppHookCallback39, createAppHookCallback40, createAppHookCallback41, createAppHookCallback42, createAppHookCallback43, createAppHookCallback44, createAppHookCallback45, createAppHookCallback46, createAppHookCallback47, createAppHookCallback48, createAppHookCallback49, createAppHookCallback50, createAppHookCallback51, createAppHookCallback52, createAppHookCallback53, createAppHookCallback54, createAppHookCallback55, createAppHookCallback56, createAppHookCallback57, createAppHookCallback58, createAppHookCallback59, createAppHookCallback60, createAppHookCallback61, createAppHookCallback62, createAppHookCallback63, createAppHookCallback64, createAppHookCallback65, createAppHookCallback66, createAppHookCallback67, createAppHookCallback68, createAppHookCallback69, createAppHookCallback70, createAppHookCallback71, createAppHookCallback72, createAppHookCallback73, createAppHookCallback74, createAppHookCallback75, createAppHookCallback76, createAppHookCallback77, createAppHookCallback78, createAppHookCallback79, createAppHookCallback80, createAppHookCallback81, createAppHookCallback82, createAppHookCallback83, createAppHookCallback84, createAppHookCallback85, createAppHookCallback86, createAppHookCallback87, createAppHookCallback88, createAppHookCallback89, createAppHookCallback90, createAppHookCallback91, createAppHookCallback92, createAppHookCallback93, createAppHookCallback94, createAppHookCallback95, createAppHookCallback96, createAppHookCallback97, createAppHookCallback98, createAppHookCallback99, createAppHookCallback100, createAppHookCallback101, createAppHookCallback102, createAppHookCallback103, createAppHookCallback104, createAppHookCallback105, createAppHookCallback106, createAppHookCallback107, createAppHookCallback108, createAppHookCallback109, createAppHookCallback110, createAppHookCallback111, createAppHookCallback112, createAppHookCallback113, createAppHookCallback114, createAppHookCallback115, createAppHookCallback116, createAppHookCallback117, createAppHookCallback118, createAppHookCallback119, createAppHookCallback120, createAppHookCallback121, createAppHookCallback122, createAppHookCallback123, createAppHookCallback124, createAppHookCallback125, createAppHookCallback126, createAppHookCallback127, createAppHookCallback128, createAppHookCallback129, createAppHookCallback130, createAppHookCallback131, createAppHookCallback132, createAppHookCallback133, createAppHookCallback134, createAppHookCallback135, createAppHookCallback136, createAppHookCallback137, createAppHookCallback138, createAppHookCallback139, createAppHookCallback140, createAppHookCallback141, createAppHookCallback142 } from "./appExtracted/appToolbarHookFactories";
import { mergeBuiltinSharedIconAssets } from "./sharedIconLibrary";
import { createProgrammaticAddDevice, createProgrammaticCreateScheme, createProgrammaticCreateBlankProject, createProgrammaticSelectDevices, createProgrammaticGroupSelected, createProgrammaticDeleteDevices, createProgrammaticUpdateDeviceProperty, createProgrammaticSave, createProgrammaticSaveSelectionAsTemplate } from "./appExtracted/appControlFactories";
import {
  ICON_LIBRARY_PAGE_SIZE,
  createInitialIconLibraryPickerState,
  fetchIconLibraryCatalog,
  fetchIconLibraryManifest,
  flattenIconLibraryManifest,
  type IconLibraryPickerState
} from "./iconLibraryCatalog";
import { renderAppView } from "./appExtracted/appView";
import { MemoizedCanvasArea } from "./appExtracted/appCanvasArea";
export function App() {
  const __renderCount = useRef(0);
  __renderCount.current++;
  const __currentRender = __renderCount.current;
  const __appScope: Record<string, any> = {};
// 稳定 ref 持有当前渲染的 __appScope，供空依赖 useEffect（如 runtime WS）闭包读取最新状态。
// __appScope 每帧重建，直接闭包捕获会冻结在首次渲染（activeProjectKey 等永远为旧值）。
const __appScopeRef = useRef(__appScope);
__appScopeRef.current = __appScope;
Object.assign(__appScope, APP_STATIC_SCOPE);
Object.assign(__appScope, { stateIconDrawingFrameRect });
const initialSavedSchemes = useMemo<SavedSchemeRecord[]>(() => [], []); Object.assign(__appScope, { initialSavedSchemes });
const initialProjectSources = useMemo(createAppHookCallback1(__appScope), []);
const initialDraft = initialProjectSources.draft; Object.assign(__appScope, { initialDraft });
const initialCanvasBounds = useMemo(() => ({
    width: initialDraft?.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
    height: initialDraft?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
  }), [initialDraft]);
Object.assign(__appScope, { initialCanvasBounds });
const initialLayeredProject = useMemo(() => normalizeProjectLayers({
    version: 1,
    name: initialDraft?.projectName ?? "",
    layers: initialDraft?.layers,
    activeLayerId: initialDraft?.activeLayerId,
    groups: initialDraft?.groups,
    measurements: initialDraft?.measurements,
    nodes: initialDraft?.nodes ?? [],
    edges: initialDraft?.edges ?? []
  }), [initialDraft]);
Object.assign(__appScope, { initialLayeredProject });
const initialIndexedNodes = useMemo(createAppHookCallback2(__appScope), [initialCanvasBounds, initialDraft?.deviceIndexCounters, initialLayeredProject.nodes]);
const initialDeviceLibrary = useMemo(() => readLocalDeviceLibraryPersistencePayload(), []); Object.assign(__appScope, { initialDeviceLibrary });
const svgRef = useRef<SVGSVGElement | null>(null); Object.assign(__appScope, { svgRef });
const imageInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { imageInputRef });
const imageArchiveInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { imageArchiveInputRef });
const customDeviceImageInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { customDeviceImageInputRef });
const definitionTemplateIconInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { definitionTemplateIconInputRef });
const stateVisualImageInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { stateVisualImageInputRef });
const stateIconDrawingImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { stateIconDrawingImportInputRef });
const stateIconDrawingSvgRef = useRef<SVGSVGElement | null>(null); Object.assign(__appScope, { stateIconDrawingSvgRef });
const stateIconDrawingDragRef = useRef<StateIconDrawingDragState | null>(null); Object.assign(__appScope, { stateIconDrawingDragRef });
const stateIconDrawingHistoryRef = useRef<StateIconDrawingElement[][]>([]); Object.assign(__appScope, { stateIconDrawingHistoryRef });
const stateIconDrawingClipboardRef = useRef<StateIconDrawingElement[]>([]); Object.assign(__appScope, { stateIconDrawingClipboardRef });
const stateIconDrawingInitialImageRef = useRef<{ key: string; image: string; sourceImage: string } | null>(null);
const modelImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { modelImportInputRef });
const modelImportTargetSchemeIdRef = useRef<string>(""); Object.assign(__appScope, { modelImportTargetSchemeIdRef });
const schemeImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { schemeImportInputRef });
const schemeImportParentSchemeIdRef = useRef<string>(""); Object.assign(__appScope, { schemeImportParentSchemeIdRef });
const layerManagementDropdownRef = useRef<HTMLDivElement | null>(null); Object.assign(__appScope, { layerManagementDropdownRef });
const canvasFrameRef = useRef<HTMLDivElement | null>(null); Object.assign(__appScope, { canvasFrameRef });
const canvasResizeHotzonesRef = useRef<HTMLDivElement | null>(null); Object.assign(__appScope, { canvasResizeHotzonesRef });
const canvasNodeElementRefs = useRef<Map<string, SVGGElement>>(new Map()); Object.assign(__appScope, { canvasNodeElementRefs });
const canvasInteractionRef = useRef(false); Object.assign(__appScope, { canvasInteractionRef });
const canvasSelectionShortcutActiveRef = useRef(false); Object.assign(__appScope, { canvasSelectionShortcutActiveRef });
const lastCanvasPointerRef = useRef<Point | null>(null); Object.assign(__appScope, { lastCanvasPointerRef });
const lastRawCanvasPointerRef = useRef<Point | null>(null); Object.assign(__appScope, { lastRawCanvasPointerRef });
const lastCanvasClientPointerRef = useRef<Point | null>(null); Object.assign(__appScope, { lastCanvasClientPointerRef });
const lastKeyboardShortcutClientPointerRef = useRef<Point | null>(null); Object.assign(__appScope, { lastKeyboardShortcutClientPointerRef });
const projectListPointerInsideRef = useRef(false); Object.assign(__appScope, { projectListPointerInsideRef });
const backendSchemesLoadedRef = useRef(false); Object.assign(__appScope, { backendSchemesLoadedRef });
const suppressNextBackendSchemeSyncRef = useRef(false); Object.assign(__appScope, { suppressNextBackendSchemeSyncRef });
const lastPersistedSchemesPayloadRef = useRef<string | null>(null); Object.assign(__appScope, { lastPersistedSchemesPayloadRef });
const backendSchemesLoadTokenRef = useRef(0); Object.assign(__appScope, { backendSchemesLoadTokenRef });
const latestSchemesRef = useRef<SavedSchemeRecord[]>([]); Object.assign(__appScope, { latestSchemesRef });
const latestActiveProjectPointerRef = useRef<ActiveProjectPointer | null>(readActiveProjectPointer()); Object.assign(__appScope, { latestActiveProjectPointerRef });
const backendColorConfigLoadedRef = useRef(false); Object.assign(__appScope, { backendColorConfigLoadedRef });
const suppressNextBackendColorSyncRef = useRef(false); Object.assign(__appScope, { suppressNextBackendColorSyncRef });
const lastPersistedColorConfigPayloadRef = useRef<string | null>(null); Object.assign(__appScope, { lastPersistedColorConfigPayloadRef });
const backendDeviceLibraryLoadedRef = useRef(false); Object.assign(__appScope, { backendDeviceLibraryLoadedRef });
const suppressNextBackendDeviceLibrarySyncRef = useRef(false); Object.assign(__appScope, { suppressNextBackendDeviceLibrarySyncRef });
const lastPersistedDeviceLibraryPayloadRef = useRef<string | null>(null); Object.assign(__appScope, { lastPersistedDeviceLibraryPayloadRef });
const backendMeasurementConfigLoadedRef = useRef(false); Object.assign(__appScope, { backendMeasurementConfigLoadedRef });
const lastPersistedMeasurementConfigPayloadRef = useRef<string | null>(null); Object.assign(__appScope, { lastPersistedMeasurementConfigPayloadRef });
const imageLibraryInitializedRef = useRef(false); Object.assign(__appScope, { imageLibraryInitializedRef });
const lastMouseStatusRef = useRef<Point | null>(null); Object.assign(__appScope, { lastMouseStatusRef });
const pendingMouseStatusRef = useRef<Point | null>(null); Object.assign(__appScope, { pendingMouseStatusRef });
const mouseStatusFrameRef = useRef<number | null>(null); Object.assign(__appScope, { mouseStatusFrameRef });
const transformDragChangedRef = useRef(false); Object.assign(__appScope, { transformDragChangedRef });
const connectPreviewPathElementRef = useRef<SVGPathElement | null>(null); Object.assign(__appScope, { connectPreviewPathElementRef });
const connectPreviewHandleElementRef = useRef<SVGCircleElement | null>(null); Object.assign(__appScope, { connectPreviewHandleElementRef });
const connectDropHintElementRef = useRef<SVGGElement | null>(null); Object.assign(__appScope, { connectDropHintElementRef });
const connectPreviewDomRef = useRef<{ path: string; targetPoint: Point | null }>({ path: "", targetPoint: null });
Object.assign(__appScope, { connectPreviewDomRef });
const connectPreviewPointRef = useRef<Point | null>(null); Object.assign(__appScope, { connectPreviewPointRef });
const connectPreviewAxisLockRef = useRef<{ axis: OrthogonalAxis; nodeId: string; terminalId: string } | null>(null);
Object.assign(__appScope, { connectPreviewAxisLockRef });
const connectDropTargetPointRef = useRef<Point | null>(null); Object.assign(__appScope, { connectDropTargetPointRef });
const connectDropTargetRef = useRef<ConnectTarget | null>(null); Object.assign(__appScope, { connectDropTargetRef });
const connectDropReadyRef = useRef(false); Object.assign(__appScope, { connectDropReadyRef });
const pendingConnectPreviewRef = useRef<{ point: Point | null; ready: boolean; targetPoint: Point | null; target: ConnectTarget | null } | null>(null);
Object.assign(__appScope, { pendingConnectPreviewRef });
const connectPreviewFrameRef = useRef<number | null>(null); Object.assign(__appScope, { connectPreviewFrameRef });
const routableLinePreviewPointRef = useRef<Point | null>(null); Object.assign(__appScope, { routableLinePreviewPointRef });
const routableLinePreviewAxisLockRef = useRef<{ axis: OrthogonalAxis; nodeId: string; terminalId: string } | null>(null);
Object.assign(__appScope, { routableLinePreviewAxisLockRef });
const routableLineDropTargetPointRef = useRef<Point | null>(null); Object.assign(__appScope, { routableLineDropTargetPointRef });
const routableLineDropTargetRef = useRef<ConnectTarget | null>(null); Object.assign(__appScope, { routableLineDropTargetRef });
const pendingRoutableLinePreviewRef = useRef<{ point: Point | null } | null>(null); Object.assign(__appScope, { pendingRoutableLinePreviewRef });
const routableLinePreviewFrameRef = useRef<number | null>(null); Object.assign(__appScope, { routableLinePreviewFrameRef });
const pendingRewirePreviewRef = useRef<{ point: Point; rewiring: Exclude<RewiringState, null>; ctrlKey?: boolean } | null>(null);
Object.assign(__appScope, { pendingRewirePreviewRef });
const rewirePreviewFrameRef = useRef<number | null>(null); Object.assign(__appScope, { rewirePreviewFrameRef });
const draggingRef = useRef<DraggingState | null>(null); Object.assign(__appScope, { draggingRef });
const modifierSelectionPressRef = useRef<ModifierSelectionPressState>(null); Object.assign(__appScope, { modifierSelectionPressRef });
const staticButtonPointerRef = useRef<StaticButtonPointerSnapshot | null>(null); Object.assign(__appScope, { staticButtonPointerRef });
const staticButtonFeedbackTimeoutRef = useRef<number | null>(null); Object.assign(__appScope, { staticButtonFeedbackTimeoutRef });
const multiNodeDragOverlayRef = useRef<SVGGElement | null>(null); Object.assign(__appScope, { multiNodeDragOverlayRef });
const imperativeMultiNodeDragOverlayRef = useRef<SVGGElement | null>(null); Object.assign(__appScope, { imperativeMultiNodeDragOverlayRef });
const imperativeMultiNodeDragActiveRef = useRef(false); Object.assign(__appScope, { imperativeMultiNodeDragActiveRef });
const multiNodeDragOverlayDeltaRef = useRef<Point>({ x: 0, y: 0 }); Object.assign(__appScope, { multiNodeDragOverlayDeltaRef });
const imperativeSingleNodeDragNodeOverlayRef = useRef<SVGGElement | null>(null); Object.assign(__appScope, { imperativeSingleNodeDragNodeOverlayRef });
const imperativeSingleNodeDragEdgePreviewRef = useRef<SVGGElement | null>(null); Object.assign(__appScope, { imperativeSingleNodeDragEdgePreviewRef });
const imperativeNodeDragDropHintRef = useRef<SVGGElement | null>(null); Object.assign(__appScope, { imperativeNodeDragDropHintRef });
const imperativeSingleNodeDragActiveRef = useRef(false); Object.assign(__appScope, { imperativeSingleNodeDragActiveRef });
const imperativeSingleNodeDragOriginNodeIdRef = useRef<string | null>(null); Object.assign(__appScope, { imperativeSingleNodeDragOriginNodeIdRef });
const imperativeSingleNodeDragOriginEdgeIdsRef = useRef<Set<string>>(new Set()); Object.assign(__appScope, { imperativeSingleNodeDragOriginEdgeIdsRef });
const imperativeSingleNodeDragOriginRoutableLineNodeIdsRef = useRef<Set<string>>(new Set()); Object.assign(__appScope, { imperativeSingleNodeDragOriginRoutableLineNodeIdsRef });
const imperativeNodeDragEdgePreviewPathRefs = useRef<Map<string, SVGPathElement>>(new Map()); Object.assign(__appScope, { imperativeNodeDragEdgePreviewPathRefs });
const imperativeNodeDragEdgePreviewKeyRef = useRef(""); Object.assign(__appScope, { imperativeNodeDragEdgePreviewKeyRef });
const nodePatchListLookupCacheRef = useRef<WeakMap<ModelNode[], Map<string, ModelNode>>>(new WeakMap()); Object.assign(__appScope, { nodePatchListLookupCacheRef });
const nodeTerminalSnapTargetRef = useRef<NodeTerminalSnapTarget | null>(null); Object.assign(__appScope, { nodeTerminalSnapTargetRef });
const pendingNodeDragMoveRef = useRef<{ point: Point; ctrlKey: boolean; shiftKey: boolean } | null>(null);
Object.assign(__appScope, { pendingNodeDragMoveRef });
const nodeDragMoveFrameRef = useRef<number | null>(null); Object.assign(__appScope, { nodeDragMoveFrameRef });
const pendingKeyboardMoveDeltaRef = useRef<Point | null>(null); Object.assign(__appScope, { pendingKeyboardMoveDeltaRef });
const keyboardMoveActiveKeyDeltasRef = useRef<Map<string, Point>>(new Map()); Object.assign(__appScope, { keyboardMoveActiveKeyDeltasRef });
const keyboardMoveLastFrameTimeRef = useRef<number | null>(null); Object.assign(__appScope, { keyboardMoveLastFrameTimeRef });
const keyboardMoveFrameElapsedMsRef = useRef(0); Object.assign(__appScope, { keyboardMoveFrameElapsedMsRef });
const keyboardMoveFrameRef = useRef<number | null>(null); Object.assign(__appScope, { keyboardMoveFrameRef });
const keyboardMoveCommitCancelRef = useRef<(() => void) | null>(null); Object.assign(__appScope, { keyboardMoveCommitCancelRef });
const dragUndoCapturedRef = useRef(false); Object.assign(__appScope, { dragUndoCapturedRef });
const canvasResizeUndoCapturedRef = useRef(false); Object.assign(__appScope, { canvasResizeUndoCapturedRef });
const canvasResizeDraftRef = useRef<CanvasBounds | null>(null); Object.assign(__appScope, { canvasResizeDraftRef });
const cachedRoutedEdgesRef = useRef<RoutedEdge[]>([]); Object.assign(__appScope, { cachedRoutedEdgesRef });
const cachedRouteStoreRef = useRef<RouteStore | null>(null); Object.assign(__appScope, { cachedRouteStoreRef });
const lodCanvasNodeChunkCacheRef = useRef<StableSvgMarkupChunkCache>({ chunks: [] }); Object.assign(__appScope, { lodCanvasNodeChunkCacheRef });
const lodCanvasRouteChunkCacheRef = useRef<StableSvgMarkupChunkCache>({ chunks: [] }); Object.assign(__appScope, { lodCanvasRouteChunkCacheRef });
const connectionStrokeColorCacheRef = useRef<ConnectionStrokeColorCache>({ nodeById: null, token: "", colors: new Map() }); Object.assign(__appScope, { connectionStrokeColorCacheRef });
const cachedRouteInputRef = useRef<{
    routeGeometryRevision: number;
    layerSignature: string;
    nodes: ModelNode[];
    edges: Edge[];
  } | null>(null);
Object.assign(__appScope, { cachedRouteInputRef });
const pendingRouteEdgeIdsRef = useRef<Set<string>>(new Set()); Object.assign(__appScope, { pendingRouteEdgeIdsRef });
const pendingStoredRouteEdgeIdsRef = useRef<Set<string>>(new Set()); Object.assign(__appScope, { pendingStoredRouteEdgeIdsRef });
const routeDirtyGenerationRef = useRef(0); Object.assign(__appScope, { routeDirtyGenerationRef });
const canvasVisibleViewBoxFrameRef = useRef<number | null>(null); Object.assign(__appScope, { canvasVisibleViewBoxFrameRef });
const viewportQueryBoundsCacheRef = useRef<RenderViewportBounds | null>(null); Object.assign(__appScope, { viewportQueryBoundsCacheRef });
const viewportRoutedEdgesResultCacheRef = useRef<ViewportResultCache<RoutedEdge[]>>({ ownerRefs: [], token: "", values: new Map() }); Object.assign(__appScope, { viewportRoutedEdgesResultCacheRef });
const viewportNodesResultCacheRef = useRef<ViewportResultCache<ModelNode[]>>({ ownerRefs: [], token: "", values: new Map() }); Object.assign(__appScope, { viewportNodesResultCacheRef });
const minimapSampleCacheRef = useRef<{
    nodeSource: ModelNode[] | null;
    nodeStep: number;
    nodes: ModelNode[];
    routeSource: RoutedEdge[] | null;
    routeStep: number;
    routes: RoutedEdge[];
  }>({ nodeSource: null, nodeStep: 1, nodes: [], routeSource: null, routeStep: 1, routes: [] });
Object.assign(__appScope, { minimapSampleCacheRef });
const elementTreeCacheRef = useRef<{ signature: string; tree: ElementTreeGroup[] }>({ signature: "", tree: [] });
Object.assign(__appScope, { elementTreeCacheRef });
const elementTreeSourceRef = useRef<ElementTreeSource | null>(null); Object.assign(__appScope, { elementTreeSourceRef });
const elementTreeItemRefs = useRef<Record<string, HTMLDivElement | null>>({}); Object.assign(__appScope, { elementTreeItemRefs });
const selectedLayoutUnitsCacheRef = useRef<CanvasLayoutUnit[]>([]); Object.assign(__appScope, { selectedLayoutUnitsCacheRef });
const graphDirtyBaselineRef = useRef<GraphDirtyBaseline | null>(null); Object.assign(__appScope, { graphDirtyBaselineRef });
const suppressNextGraphDirtyRef = useRef(false); Object.assign(__appScope, { suppressNextGraphDirtyRef });
const saveRequiredRef = useRef(false); Object.assign(__appScope, { saveRequiredRef });
const refreshRecoveryProjectRef = useRef<RefreshRecoveryProjectState | null>(null); Object.assign(__appScope, { refreshRecoveryProjectRef });
const latestNodesRef = useRef<ModelNode[]>([]); Object.assign(__appScope, { latestNodesRef });
const latestEdgesRef = useRef<Edge[]>([]); Object.assign(__appScope, { latestEdgesRef });
const latestGraphStoreRef = useRef<GraphStore | null>(null); Object.assign(__appScope, { latestGraphStoreRef });
const deferredMoveOptimizationCancelRef = useRef<(() => void) | null>(null); Object.assign(__appScope, { deferredMoveOptimizationCancelRef });
const deferredMoveRepairFrameRef = useRef<number | null>(null); Object.assign(__appScope, { deferredMoveRepairFrameRef });
const deferredRoutableLineRouteRepairCancelRef = useRef<(() => void) | null>(null); Object.assign(__appScope, { deferredRoutableLineRouteRepairCancelRef });
const lastBusTerminalSyncEndpointRevisionRef = useRef(-1); Object.assign(__appScope, { lastBusTerminalSyncEndpointRevisionRef });
const pendingBusTerminalSyncNodeIdsRef = useRef<Set<string>>(new Set()); Object.assign(__appScope, { pendingBusTerminalSyncNodeIdsRef });
const initialCanvasFitAppliedRef = useRef(false); Object.assign(__appScope, { initialCanvasFitAppliedRef });
const skipNextTopologyStaleRef = useRef(false); Object.assign(__appScope, { skipNextTopologyStaleRef });
const skipCanvasSizeBlurCommitRef = useRef(false); Object.assign(__appScope, { skipCanvasSizeBlurCommitRef });
const edgePointerBendInsertRef = useRef<{ edgeId: string; clientX: number; clientY: number; at: number } | null>(null);
Object.assign(__appScope, { edgePointerBendInsertRef });
const lastEdgePointerClickRef = useRef<{ edgeId: string; clientX: number; clientY: number; at: number } | null>(null);
Object.assign(__appScope, { lastEdgePointerClickRef });
const [graphStore, setGraphStore] = useState<GraphStore>(() => createGraphStore(initialIndexedNodes.nodes, initialLayeredProject.edges));
Object.assign(__appScope, { graphStore, setGraphStore });
const nodes = graphStore.nodes; Object.assign(__appScope, { nodes });
const edges = graphStore.edges; Object.assign(__appScope, { edges });
latestGraphStoreRef.current = graphStore;
const setNodes = createSetNodes(__appScope); Object.assign(__appScope, { setNodes });
const setEdges = createSetEdges(__appScope); Object.assign(__appScope, { setEdges });
const setGraphArrays = createSetGraphArrays(__appScope); Object.assign(__appScope, { setGraphArrays });
const patchGraphNodes = createPatchGraphNodes(__appScope); Object.assign(__appScope, { patchGraphNodes });
const patchGraphEdges = createPatchGraphEdges(__appScope); Object.assign(__appScope, { patchGraphEdges });
const updateGraphNodeById = createUpdateGraphNodeById(__appScope); Object.assign(__appScope, { updateGraphNodeById });
const [groups, setGroups] = useState<ModelGroup[]>(() => normalizeModelGroups(initialLayeredProject.groups, initialIndexedNodes.nodes, initialLayeredProject.edges));
Object.assign(__appScope, { groups, setGroups });
const [measurementConfig, setMeasurementConfig] = useState<PlatformMeasurementConfig>(() => readMeasurementConfig());
Object.assign(__appScope, { measurementConfig, setMeasurementConfig });
const [projectMeasurements, setProjectMeasurements] = useState<ProjectMeasurementConfig>(() =>
    normalizeProjectMeasurements(initialLayeredProject.measurements ?? EMPTY_PROJECT_MEASUREMENTS, initialIndexedNodes.nodes)
  );
Object.assign(__appScope, { projectMeasurements, setProjectMeasurements });
const [layers, setLayers] = useState<ModelLayer[]>(() => initialLayeredProject.layers ?? []);
Object.assign(__appScope, { layers, setLayers });
const [activeLayerId, setActiveLayerId] = useState(() => initialLayeredProject.activeLayerId ?? DEFAULT_MODEL_LAYER_ID);
Object.assign(__appScope, { activeLayerId, setActiveLayerId });
const [layerNameDrafts, setLayerNameDrafts] = useState<Record<string, string>>({});
Object.assign(__appScope, { layerNameDrafts, setLayerNameDrafts });
const [deviceIndexCounters, setDeviceIndexCounters] = useState<DeviceIndexCounters>(() => initialIndexedNodes.counters);
Object.assign(__appScope, { deviceIndexCounters, setDeviceIndexCounters });
const [projectName, setProjectName] = useState(() => initialDraft?.projectName ?? "");
Object.assign(__appScope, { projectName, setProjectName });
const [canvasWidth, setCanvasWidth] = useState(() => initialDraft?.canvasWidth ?? DEFAULT_CANVAS_WIDTH);
Object.assign(__appScope, { canvasWidth, setCanvasWidth });
const [canvasHeight, setCanvasHeight] = useState(() => initialDraft?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT);
Object.assign(__appScope, { canvasHeight, setCanvasHeight });
const [canvasSizeDraft, setCanvasSizeDraft] = useState(() => ({
    width: String(initialDraft?.canvasWidth ?? DEFAULT_CANVAS_WIDTH),
    height: String(initialDraft?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT)
  }));
Object.assign(__appScope, { canvasSizeDraft, setCanvasSizeDraft });
const [allowAutoExpandCanvas, setAllowAutoExpandCanvas] = useState(() => initialDraft?.allowAutoExpandCanvas ?? true);
Object.assign(__appScope, { allowAutoExpandCanvas, setAllowAutoExpandCanvas });
const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() => initialDraft?.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
Object.assign(__appScope, { canvasBackgroundColor, setCanvasBackgroundColor });
const [canvasBackgroundImage, setCanvasBackgroundImage] = useState(() => initialDraft?.canvasBackgroundImage ?? "");
Object.assign(__appScope, { canvasBackgroundImage, setCanvasBackgroundImage });
const [canvasBackgroundImageAssetId, setCanvasBackgroundImageAssetId] = useState(() => initialDraft?.canvasBackgroundImageAssetId ?? "");
Object.assign(__appScope, { canvasBackgroundImageAssetId, setCanvasBackgroundImageAssetId });
const [backgroundProjectId, setBackgroundProjectId] = useState(() => initialDraft?.backgroundProjectId ?? "");
Object.assign(__appScope, { backgroundProjectId, setBackgroundProjectId });
const [backgroundLayerIds, setBackgroundLayerIds] = useState<string[]>(() => initialDraft?.backgroundLayerIds ?? []);
Object.assign(__appScope, { backgroundLayerIds, setBackgroundLayerIds });
const [powerUnit, setPowerUnit] = useState(() => initialDraft?.powerUnit ?? DEFAULT_POWER_UNIT);
Object.assign(__appScope, { powerUnit, setPowerUnit });
const [voltageUnit, setVoltageUnit] = useState(() => initialDraft?.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
Object.assign(__appScope, { voltageUnit, setVoltageUnit });
const [currentUnit, setCurrentUnit] = useState(() => initialDraft?.currentUnit ?? DEFAULT_CURRENT_UNIT);
Object.assign(__appScope, { currentUnit, setCurrentUnit });
const [powerBaseValue, setPowerBaseValue] = useState(() => initialDraft?.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
Object.assign(__appScope, { powerBaseValue, setPowerBaseValue });
const [schemes, setSchemesState] = useState<SavedSchemeRecord[]>([]);
Object.assign(__appScope, { schemes, setSchemesState });
latestSchemesRef.current = schemes;
const setSchemes = createSetSchemes(__appScope); Object.assign(__appScope, { setSchemes });
const [activeProjectKey, setActiveProjectKey] = useState<string>(() => initialDraft?.activeProjectKey ?? "");
Object.assign(__appScope, { activeProjectKey, setActiveProjectKey });
const [activeSchemeKey, setActiveSchemeKey] = useState<string>(() => initialDraft?.activeSchemeKey ?? "");
Object.assign(__appScope, { activeSchemeKey, setActiveSchemeKey });
const [mode, setMode] = useState<ToolMode>("select");
Object.assign(__appScope, { mode, setMode });
const [interactionMode, setInteractionMode] = useState<InteractionMode>(() => readStoredInteractionMode());
Object.assign(__appScope, { interactionMode, setInteractionMode });
const isBrowseMode = interactionMode === "browse"; Object.assign(__appScope, { isBrowseMode });
const isEditMode = interactionMode === "edit"; Object.assign(__appScope, { isEditMode });
const isReadonlyCanvasMode = isBrowseMode; Object.assign(__appScope, { isReadonlyCanvasMode });
const editModeRouteRebuildOptions = { preserveManualPoints: isEditMode }; Object.assign(__appScope, { editModeRouteRebuildOptions });
const editModeRouteRenderOptions = { preserveManualRouteDisplay: isEditMode }; Object.assign(__appScope, { editModeRouteRenderOptions });
const [smartAlignmentEnabled, setSmartAlignmentEnabled] = useState(true);
Object.assign(__appScope, { smartAlignmentEnabled, setSmartAlignmentEnabled });
useEffect(createAppHookCallback3(__appScope), [interactionMode]);
const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
Object.assign(__appScope, { selectedNodeIds, setSelectedNodeIds });
const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
Object.assign(__appScope, { selectedEdgeId, setSelectedEdgeId });
const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
Object.assign(__appScope, { selectedEdgeIds, setSelectedEdgeIds });
const [canvasSelectionScope, setCanvasSelectionScope] = useState<CanvasSelectionScope>("group");
Object.assign(__appScope, { canvasSelectionScope, setCanvasSelectionScope });
const [voltageBaseClearDialogOpen, setVoltageBaseClearDialogOpen] = useState(false);
Object.assign(__appScope, { voltageBaseClearDialogOpen, setVoltageBaseClearDialogOpen });
const [voltageBaseClearScope, setVoltageBaseClearScope] = useState<VoltageBaseClearScope>("selected");
Object.assign(__appScope, { voltageBaseClearScope, setVoltageBaseClearScope });
const [voltageBaseSetDialogOpen, setVoltageBaseSetDialogOpen] = useState(false);
Object.assign(__appScope, { voltageBaseSetDialogOpen, setVoltageBaseSetDialogOpen });
const [voltageBaseSetScope, setVoltageBaseSetScope] = useState<VoltageBaseSetScope>("selected");
Object.assign(__appScope, { voltageBaseSetScope, setVoltageBaseSetScope });
const [voltageBaseSetValue, setVoltageBaseSetValue] = useState("110");
Object.assign(__appScope, { voltageBaseSetValue, setVoltageBaseSetValue });
const [voltageBaseSetMode, setVoltageBaseSetMode] = useState<VoltageBaseSetMode>("uniform");
Object.assign(__appScope, { voltageBaseSetMode, setVoltageBaseSetMode });
const [voltageBaseTerminalValues, setVoltageBaseTerminalValues] = useState<VoltageBaseTerminalValuesByNodeId>({});
Object.assign(__appScope, { voltageBaseTerminalValues, setVoltageBaseTerminalValues });
const [activeVoltageBaseTerminalKey, setActiveVoltageBaseTerminalKey] = useState("");
Object.assign(__appScope, { activeVoltageBaseTerminalKey, setActiveVoltageBaseTerminalKey });
const [connectionRedrawDialogOpen, setConnectionRedrawDialogOpen] = useState(false);
Object.assign(__appScope, { connectionRedrawDialogOpen, setConnectionRedrawDialogOpen });
const [connectionRedrawScope, setConnectionRedrawScope] = useState<ConnectionRedrawScope>("selected");
Object.assign(__appScope, { connectionRedrawScope, setConnectionRedrawScope });
const [filterSelectionDialogOpen, setFilterSelectionDialogOpen] = useState(false);
Object.assign(__appScope, { filterSelectionDialogOpen, setFilterSelectionDialogOpen });
const [filterSelectionTypeKeys, setFilterSelectionTypeKeys] = useState<string[]>([]);
Object.assign(__appScope, { filterSelectionTypeKeys, setFilterSelectionTypeKeys });
const [connectSource, setConnectSource] = useState<ConnectSourceState | null>(null);
Object.assign(__appScope, { connectSource, setConnectSource });
const [staticDrawing, setStaticDrawing] = useState<StaticDrawingState | null>(null);
Object.assign(__appScope, { staticDrawing, setStaticDrawing });
const [libraryPlacement, setLibraryPlacement] = useState<LibraryPlacementState | null>(null);
Object.assign(__appScope, { libraryPlacement, setLibraryPlacement });
const [routableLinePlacement, setRoutableLinePlacement] = useState<RoutableLinePlacementState>(null);
Object.assign(__appScope, { routableLinePlacement, setRoutableLinePlacement });
const [routableLinePreview, setRoutableLinePreview] = useState<{ path: string; targetPoint: Point | null }>({ path: "", targetPoint: null });
Object.assign(__appScope, { routableLinePreview, setRoutableLinePreview });
const [routableLineEndpointDrag, setRoutableLineEndpointDrag] = useState<RoutableLineEndpointDragState>(null);
Object.assign(__appScope, { routableLineEndpointDrag, setRoutableLineEndpointDrag });
const [staticButtonVisual, setStaticButtonVisual] = useState<{ nodeId: string; state: StaticButtonVisualState } | null>(null);
Object.assign(__appScope, { staticButtonVisual, setStaticButtonVisual });
const [connectDropReady, setConnectDropReady] = useState(false);
Object.assign(__appScope, { connectDropReady, setConnectDropReady });
const [dragging, setDragging] = useState<DraggingState | null>(null);
Object.assign(__appScope, { dragging, setDragging });
const [smartAlignmentGuides, setSmartAlignmentGuides] = useState<SmartAlignmentGuide[]>([]);
Object.assign(__appScope, { smartAlignmentGuides, setSmartAlignmentGuides });
const smartAlignmentGuidesRef = useRef<SmartAlignmentGuide[]>([]); Object.assign(__appScope, { smartAlignmentGuidesRef });
const smartAlignmentCandidateCacheRef = useRef<Map<string, SmartAlignmentAxisCandidate> | null>(null); Object.assign(__appScope, { smartAlignmentCandidateCacheRef });
const smartAlignmentSortedAnchorsRef = useRef<{ x: number[]; y: number[] } | null>(null);
Object.assign(__appScope, { smartAlignmentSortedAnchorsRef });
const smartAlignmentAnchorBoundsRef = useRef<Map<number, { minTop: number; maxBottom: number; minLeft: number; maxRight: number }> | null>(null);
Object.assign(__appScope, { smartAlignmentAnchorBoundsRef });
const smartAlignmentGuideSignature = (guides: SmartAlignmentGuide[]) =>
    guides.map((guide) => `${guide.orientation}:${Math.round(guide.position)}`).join("|");
Object.assign(__appScope, { smartAlignmentGuideSignature });
const updateSmartAlignmentGuides = createUpdateSmartAlignmentGuides(__appScope); Object.assign(__appScope, { updateSmartAlignmentGuides });
const [rewiring, setRewiring] = useState<RewiringState>(null);
Object.assign(__appScope, { rewiring, setRewiring });
const [terminalPress, setTerminalPress] = useState<TerminalPressState>(null);
Object.assign(__appScope, { terminalPress, setTerminalPress });
const [nodeLabelDrag, setNodeLabelDrag] = useState<NodeLabelDragState>(null);
Object.assign(__appScope, { nodeLabelDrag, setNodeLabelDrag });
const [nodeLabelRotateDrag, setNodeLabelRotateDrag] = useState<NodeLabelRotateDragState>(null);
Object.assign(__appScope, { nodeLabelRotateDrag, setNodeLabelRotateDrag });
const [manualPathDrag, setManualPathDrag] = useState<ManualPathDrag>(null);
Object.assign(__appScope, { manualPathDrag, setManualPathDrag });
const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
Object.assign(__appScope, { transformDrag, setTransformDrag });
const [canvasResizeDraft, setCanvasResizeDraft] = useState<CanvasBounds | null>(null);
Object.assign(__appScope, { canvasResizeDraft, setCanvasResizeDraft });
const [deviceLabelsVisible, setDeviceLabelsVisible] = useState(true);
Object.assign(__appScope, { deviceLabelsVisible, setDeviceLabelsVisible });
const [minimapVisible, setMinimapVisible] = useState(true);
Object.assign(__appScope, { minimapVisible, setMinimapVisible });
const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
Object.assign(__appScope, { viewBox, setViewBox });
const [canvasVisibleViewBox, setCanvasVisibleViewBox] = useState<CanvasViewBox>(() =>
    initialVisibleCanvasViewBox({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }, null)
  );
Object.assign(__appScope, { canvasVisibleViewBox, setCanvasVisibleViewBox });
const [canvasFrameViewportSize, setCanvasFrameViewportSize] = useState<CanvasBounds>({ width: 0, height: 0 });
Object.assign(__appScope, { canvasFrameViewportSize, setCanvasFrameViewportSize });
const [canvasNoScrollOffset, setCanvasNoScrollOffset] = useState<Point>({ x: 0, y: 0 });
Object.assign(__appScope, { canvasNoScrollOffset, setCanvasNoScrollOffset });
const viewBoxRef = useRef<CanvasViewBox>(viewBox); Object.assign(__appScope, { viewBoxRef });
viewBoxRef.current = viewBox;
const [canvasCenterRequest, setCanvasCenterRequest] = useState(0);
Object.assign(__appScope, { canvasCenterRequest, setCanvasCenterRequest });
const [panning, setPanning] = useState<CanvasPanningState>(null);
Object.assign(__appScope, { panning, setPanning });
const panningRef = useRef<CanvasPanningState>(null); Object.assign(__appScope, { panningRef });
const pendingCanvasNoScrollOffsetRef = useRef<Point | null>(null); Object.assign(__appScope, { pendingCanvasNoScrollOffsetRef });
const setCanvasPanning = createSetCanvasPanning(__appScope); Object.assign(__appScope, { setCanvasPanning });
const [marquee, setMarquee] = useState<Marquee>(null);
Object.assign(__appScope, { marquee, setMarquee });
const [contextMarqueeSelection, setContextMarqueeSelectionState] = useState<ContextMarqueeSelectionState>(null);
Object.assign(__appScope, { contextMarqueeSelection, setContextMarqueeSelectionState });
const contextMarqueeSelectionRef = useRef<ContextMarqueeSelectionState>(null); Object.assign(__appScope, { contextMarqueeSelectionRef });
const setContextMarqueeSelection = createSetContextMarqueeSelection(__appScope); Object.assign(__appScope, { setContextMarqueeSelection });
const [modifierSelectionPress, setModifierSelectionPressState] = useState<ModifierSelectionPressState>(null);
Object.assign(__appScope, { modifierSelectionPress, setModifierSelectionPressState });
const [canvasClipboard, setCanvasClipboard] = useState<CanvasClipboard>(EMPTY_CANVAS_CLIPBOARD);
Object.assign(__appScope, { canvasClipboard, setCanvasClipboard });
const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
Object.assign(__appScope, { contextMenu, setContextMenu });
const canvasGraphicContextMenuHandledRef = useRef(false); Object.assign(__appScope, { canvasGraphicContextMenuHandledRef });
const canvasGraphicContextMenuHandledTimerRef = useRef<number | null>(null); Object.assign(__appScope, { canvasGraphicContextMenuHandledTimerRef });
const markGraphicContextMenuHandled = createMarkGraphicContextMenuHandled(__appScope); Object.assign(__appScope, { markGraphicContextMenuHandled });
const consumeGraphicContextMenuHandled = createConsumeGraphicContextMenuHandled(__appScope); Object.assign(__appScope, { consumeGraphicContextMenuHandled });
const openGraphicContextMenu = createOpenGraphicContextMenu(__appScope); Object.assign(__appScope, { openGraphicContextMenu });
const [inspectorTab, setInspectorTab] = useState<"model" | "tree" | "graph" | "device">("graph");
Object.assign(__appScope, { inspectorTab, setInspectorTab });
const [selectedDeviceInfoView, setSelectedDeviceInfoView] = useState<"model" | "measurement">("model");
Object.assign(__appScope, { selectedDeviceInfoView, setSelectedDeviceInfoView });
const [leftPanelTab, setLeftPanelTab] = useState<"projects" | "library" | "templates">("projects");
Object.assign(__appScope, { leftPanelTab, setLeftPanelTab });
const [projectSearchQuery, setProjectSearchQuery] = useState("");
Object.assign(__appScope, { projectSearchQuery, setProjectSearchQuery });
const [librarySearchQuery, setLibrarySearchQuery] = useState("");
Object.assign(__appScope, { librarySearchQuery, setLibrarySearchQuery });
const [componentLibraryDisplayMode, setComponentLibraryDisplayMode] = useState<ComponentLibraryDisplayMode>("right");
Object.assign(__appScope, { componentLibraryDisplayMode, setComponentLibraryDisplayMode });
const [templateLibrarySearchQuery, setTemplateLibrarySearchQuery] = useState("");
Object.assign(__appScope, { templateLibrarySearchQuery, setTemplateLibrarySearchQuery });
const [templateLibraryDisplayMode, setTemplateLibraryDisplayMode] = useState<ComponentLibraryDisplayMode>("right");
Object.assign(__appScope, { templateLibraryDisplayMode, setTemplateLibraryDisplayMode });
const [leftPanelMode, setLeftPanelMode] = useState<SidePanelMode>(() => readSidePanelMode(LEFT_PANEL_MODE_STORAGE_KEY));
Object.assign(__appScope, { leftPanelMode, setLeftPanelMode });
const [rightPanelMode, setRightPanelMode] = useState<SidePanelMode>(() => readSidePanelMode(RIGHT_PANEL_MODE_STORAGE_KEY));
Object.assign(__appScope, { rightPanelMode, setRightPanelMode });
const [leftPanelWidth, setLeftPanelWidth] = useState(() =>
    readStoredPanelDimension(LEFT_PANEL_WIDTH_STORAGE_KEY, LEFT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH)
  );
Object.assign(__appScope, { leftPanelWidth, setLeftPanelWidth });
const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    readStoredPanelDimension(RIGHT_PANEL_WIDTH_STORAGE_KEY, RIGHT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH)
  );
Object.assign(__appScope, { rightPanelWidth, setRightPanelWidth });
const [statusbarHeight, setStatusbarHeight] = useState(() =>
    readStoredPanelDimension(STATUSBAR_HEIGHT_STORAGE_KEY, STATUSBAR_DEFAULT_HEIGHT, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT)
  );
Object.assign(__appScope, { statusbarHeight, setStatusbarHeight });
const [topologyWarningPanelHeight, setTopologyWarningPanelHeight] = useState(() =>
    readStoredPanelDimension(VALIDATION_PANEL_HEIGHT_STORAGE_KEY, VALIDATION_PANEL_DEFAULT_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT)
  );
Object.assign(__appScope, { topologyWarningPanelHeight, setTopologyWarningPanelHeight });
const [topologyWarningPanelWidth, setTopologyWarningPanelWidth] = useState(TOPOLOGY_WARNING_PANEL_DEFAULT_WIDTH);
Object.assign(__appScope, { topologyWarningPanelWidth, setTopologyWarningPanelWidth });
const [topologyWarningPanelPosition, setTopologyWarningPanelPosition] = useState<{ left: number; top: number } | null>(null);
Object.assign(__appScope, { topologyWarningPanelPosition, setTopologyWarningPanelPosition });
const [topologyWarningPanelClosed, setTopologyWarningPanelClosed] = useState(false);
Object.assign(__appScope, { topologyWarningPanelClosed, setTopologyWarningPanelClosed });
const [sidePanelResize, setSidePanelResize] = useState<SidePanelResizeState>(null);
Object.assign(__appScope, { sidePanelResize, setSidePanelResize });
const [statusbarResize, setStatusbarResize] = useState<StatusbarResizeState>(null);
Object.assign(__appScope, { statusbarResize, setStatusbarResize });
const [topologyWarningPanelDrag, setTopologyWarningPanelDrag] = useState<TopologyWarningPanelDragState>(null);
Object.assign(__appScope, { topologyWarningPanelDrag, setTopologyWarningPanelDrag });
const [topologyWarningPanelResize, setTopologyWarningPanelResize] = useState<TopologyWarningPanelResizeState>(null);
Object.assign(__appScope, { topologyWarningPanelResize, setTopologyWarningPanelResize });
const [canvasResizeDrag, setCanvasResizeDrag] = useState<CanvasResizeState>(null);
Object.assign(__appScope, { canvasResizeDrag, setCanvasResizeDrag });
const [leftPanelAutoVisible, setLeftPanelAutoVisible] = useState(false);
Object.assign(__appScope, { leftPanelAutoVisible, setLeftPanelAutoVisible });
const [rightPanelAutoVisible, setRightPanelAutoVisible] = useState(false);
Object.assign(__appScope, { rightPanelAutoVisible, setRightPanelAutoVisible });
const leftPanelRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { leftPanelRef });
const rightPanelRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { rightPanelRef });
const projectRecordDragActiveRef = useRef(false); Object.assign(__appScope, { projectRecordDragActiveRef });
const schemeRecordDragActiveRef = useRef(false); Object.assign(__appScope, { schemeRecordDragActiveRef });
const [containerParamViewId, setContainerParamViewId] = useState("container");
Object.assign(__appScope, { containerParamViewId, setContainerParamViewId });
const [expandedAttributeLibraries, setExpandedAttributeLibraries] = useState<AttributeLibrary[]>([...DEFAULT_ATTRIBUTE_LIBRARIES]);
Object.assign(__appScope, { expandedAttributeLibraries, setExpandedAttributeLibraries });
const [expandedAttributeLibraryComponentTypes, setExpandedAttributeLibraryComponentTypes] = useState<string[]>([]);
Object.assign(__appScope, { expandedAttributeLibraryComponentTypes, setExpandedAttributeLibraryComponentTypes });
const [collapsedExpandedModeAttributeLibraries, setCollapsedExpandedModeAttributeLibraries] = useState<AttributeLibrary[]>([]);
Object.assign(__appScope, { collapsedExpandedModeAttributeLibraries, setCollapsedExpandedModeAttributeLibraries });
const [collapsedExpandedModeComponentTypes, setCollapsedExpandedModeComponentTypes] = useState<string[]>([]);
Object.assign(__appScope, { collapsedExpandedModeComponentTypes, setCollapsedExpandedModeComponentTypes });
const [hoveredAttributeLibrary, setHoveredAttributeLibrary] = useState<AttributeLibrary | "">("");
Object.assign(__appScope, { hoveredAttributeLibrary, setHoveredAttributeLibrary });
const [hoveredAttributeLibraryComponentType, setHoveredAttributeLibraryComponentType] = useState("");
Object.assign(__appScope, { hoveredAttributeLibraryComponentType, setHoveredAttributeLibraryComponentType });
const [libraryFlyoutPositions, setLibraryFlyoutPositions] = useState<Record<string, { top: number; left: number }>>({});
Object.assign(__appScope, { libraryFlyoutPositions, setLibraryFlyoutPositions });
const libraryScrollRef = useRef<HTMLDivElement | null>(null); Object.assign(__appScope, { libraryScrollRef });
const libraryComponentListRefs = useRef<Map<string, HTMLDivElement>>(new Map()); Object.assign(__appScope, { libraryComponentListRefs });
const libraryComponentTypeHeaderRefs = useRef<Map<string, HTMLButtonElement>>(new Map()); Object.assign(__appScope, { libraryComponentTypeHeaderRefs });
const libraryFlyoutPositionsRef = useRef<Record<string, { top: number; left: number }>>({});
Object.assign(__appScope, { libraryFlyoutPositionsRef });
const libraryFlyoutCloseTimerRef = useRef<number | null>(null); Object.assign(__appScope, { libraryFlyoutCloseTimerRef });
const [collapsedElementTreeGroups, setCollapsedElementTreeGroups] = useState<string[]>([]);
Object.assign(__appScope, { collapsedElementTreeGroups, setCollapsedElementTreeGroups });
const [collapsedElementTreeDeviceGroups, setCollapsedElementTreeDeviceGroups] = useState<string[]>([]);
Object.assign(__appScope, { collapsedElementTreeDeviceGroups, setCollapsedElementTreeDeviceGroups });
const [elementTreeItemLimits, setElementTreeItemLimits] = useState<Record<string, number>>({});
Object.assign(__appScope, { elementTreeItemLimits, setElementTreeItemLimits });
// 图元树虚拟化窗口：每 deviceGroup 维护 [start, end) 可见区间，按可视高度动态滑动
const [elementTreeItemWindows, setElementTreeItemWindows] = useState<Record<string, { start: number; end: number }>>({});
Object.assign(__appScope, { elementTreeItemWindows, setElementTreeItemWindows });
// 每 deviceGroup 实测 item 平均高度（含 child 列表），供 render 计算 spacer 高度
const [elementTreeItemHeights, setElementTreeItemHeights] = useState<Record<string, number>>({});
Object.assign(__appScope, { elementTreeItemHeights, setElementTreeItemHeights });
const [elementTreeEditDrafts, setElementTreeEditDrafts] = useState<Record<string, string>>({});
Object.assign(__appScope, { elementTreeEditDrafts, setElementTreeEditDrafts });
const [elementTreeSearchQuery, setElementTreeSearchQuery] = useState("");
Object.assign(__appScope, { elementTreeSearchQuery, setElementTreeSearchQuery });
const [customAttributeLibraries, setCustomAttributeLibraries] = useState<AttributeLibrary[]>(() => initialDeviceLibrary.customAttributeLibraries);
Object.assign(__appScope, { customAttributeLibraries, setCustomAttributeLibraries });
const [customComponentTypes, setCustomComponentTypes] = useState<CustomComponentTypeDefinition[]>(() => initialDeviceLibrary.customComponentTypes);
Object.assign(__appScope, { customComponentTypes, setCustomComponentTypes });
const [customDeviceTemplates, setCustomDeviceTemplates] = useState<DeviceTemplate[]>(() => initialDeviceLibrary.customDeviceTemplates);
Object.assign(__appScope, { customDeviceTemplates, setCustomDeviceTemplates });
const [customGraphTemplateTypes, setCustomGraphTemplateTypes] = useState<string[]>(() => initialDeviceLibrary.customGraphTemplateTypes);
Object.assign(__appScope, { customGraphTemplateTypes, setCustomGraphTemplateTypes });
const [customGraphTemplates, setCustomGraphTemplates] = useState<GraphTemplate[]>(() => initialDeviceLibrary.customGraphTemplates);
Object.assign(__appScope, { customGraphTemplates, setCustomGraphTemplates });
const [expandedGraphTemplateTypes, setExpandedGraphTemplateTypes] = useState<string[]>([...DEFAULT_GRAPH_TEMPLATE_TYPES]);
Object.assign(__appScope, { expandedGraphTemplateTypes, setExpandedGraphTemplateTypes });
const [hoveredGraphTemplateType, setHoveredGraphTemplateType] = useState("");
Object.assign(__appScope, { hoveredGraphTemplateType, setHoveredGraphTemplateType });
const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>(null);
Object.assign(__appScope, { templateDialog, setTemplateDialog });
const [groupDeviceDefinitionDialog, setGroupDeviceDefinitionDialog] = useState<GroupDeviceDefinitionDialogState>(null);
Object.assign(__appScope, { groupDeviceDefinitionDialog, setGroupDeviceDefinitionDialog });
const [templateDraftType, setTemplateDraftType] = useState(DEFAULT_GRAPH_TEMPLATE_TYPES[0]);
Object.assign(__appScope, { templateDraftType, setTemplateDraftType });
const [templateDraftName, setTemplateDraftName] = useState("");
Object.assign(__appScope, { templateDraftName, setTemplateDraftName });
const [customDeviceDialogOpen, setCustomDeviceDialogOpen] = useState(false);
Object.assign(__appScope, { customDeviceDialogOpen, setCustomDeviceDialogOpen });
const [customDeviceDialogView, setCustomDeviceDialogView] = useState<CustomDeviceDialogView>("icon");
Object.assign(__appScope, { customDeviceDialogView, setCustomDeviceDialogView });
const [customDeviceDefinitionMode, setCustomDeviceDefinitionMode] = useState<CustomDeviceDefinitionMode>("create");
Object.assign(__appScope, { customDeviceDefinitionMode, setCustomDeviceDefinitionMode });
const [customDeviceStatePageId, setCustomDeviceStatePageId] = useState(DEFAULT_STATE_PAGE_ID);
Object.assign(__appScope, { customDeviceStatePageId, setCustomDeviceStatePageId });
const [customComponentTreeSelection, setCustomComponentTreeSelection] = useState<CustomComponentTreeSelection>({ kind: "attributeLibrary", attributeLibraryName: "交流设备" });
Object.assign(__appScope, { customComponentTreeSelection, setCustomComponentTreeSelection });
const [customComponentTreeSearchQuery, setCustomComponentTreeSearchQuery] = useState("");
Object.assign(__appScope, { customComponentTreeSearchQuery, setCustomComponentTreeSearchQuery });
const [collapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeLibraries] = useState<Set<string>>(new Set());
Object.assign(__appScope, { collapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeLibraries });
const [collapsedCustomComponentTreeTypes, setCollapsedCustomComponentTreeTypes] = useState<Set<string>>(new Set());
Object.assign(__appScope, { collapsedCustomComponentTreeTypes, setCollapsedCustomComponentTreeTypes });
const [editingCustomDeviceKind, setEditingCustomDeviceKind] = useState("");
Object.assign(__appScope, { editingCustomDeviceKind, setEditingCustomDeviceKind });
const [customDeviceDraft, setCustomDeviceDraft] = useState<CustomDeviceDraft>(() => createEmptyCustomDeviceDraft());
Object.assign(__appScope, { customDeviceDraft, setCustomDeviceDraft });
const customDeviceDraftCleanTokenRef = useRef("");
Object.assign(__appScope, { customDeviceDraftCleanTokenRef });
const [customDeviceSaveMessage, setCustomDeviceSaveMessage] = useState("");
Object.assign(__appScope, { customDeviceSaveMessage, setCustomDeviceSaveMessage });
const [customDeviceTerminalAnchorDragIndex, setCustomDeviceTerminalAnchorDragIndex] = useState<number | null>(null);
Object.assign(__appScope, { customDeviceTerminalAnchorDragIndex, setCustomDeviceTerminalAnchorDragIndex });
const [, startCustomComponentSelectionTransition] = useTransition();
Object.assign(__appScope, { startCustomComponentSelectionTransition });
const customComponentSelectionRequestRef = useRef(0); Object.assign(__appScope, { customComponentSelectionRequestRef });
const customComponentSelectionFrameRef = useRef<number | null>(null); Object.assign(__appScope, { customComponentSelectionFrameRef });
const [deviceDefinitionOverrides, setDeviceDefinitionOverrides] = useState<Record<string, DeviceTemplateDefinitionOverride>>(() => initialDeviceLibrary.deviceDefinitionOverrides);
Object.assign(__appScope, { deviceDefinitionOverrides, setDeviceDefinitionOverrides });
const [deviceDefinitionDialogOpen, setDeviceDefinitionDialogOpen] = useState(false);
Object.assign(__appScope, { deviceDefinitionDialogOpen, setDeviceDefinitionDialogOpen });
const [selectedDefinitionKind, setSelectedDefinitionKind] = useState<DeviceKind | "">("");
Object.assign(__appScope, { selectedDefinitionKind, setSelectedDefinitionKind });
const [deviceDefinitionView, setDeviceDefinitionView] = useState<"visual" | "parameters" | "measurements">("parameters");
Object.assign(__appScope, { deviceDefinitionView, setDeviceDefinitionView });
const [expandedDefinitionGroups, setExpandedDefinitionGroups] = useState<AttributeLibrary[]>([...DEFAULT_ATTRIBUTE_LIBRARIES]);
Object.assign(__appScope, { expandedDefinitionGroups, setExpandedDefinitionGroups });
const [collapsedDefinitionComponentTypes, setCollapsedDefinitionComponentTypes] = useState<string[]>([]);
Object.assign(__appScope, { collapsedDefinitionComponentTypes, setCollapsedDefinitionComponentTypes });
const [deviceDefinitionSearchQuery, setDeviceDefinitionSearchQuery] = useState("");
Object.assign(__appScope, { deviceDefinitionSearchQuery, setDeviceDefinitionSearchQuery });
const [definitionDraftRows, setDefinitionDraftRows] = useState<DeviceDefinitionDraftRow[]>([]);
Object.assign(__appScope, { definitionDraftRows, setDefinitionDraftRows });
const [definitionDraftSection, setDefinitionDraftSection] = useState("");
Object.assign(__appScope, { definitionDraftSection, setDefinitionDraftSection });
const [definitionDraftSectionEditing, setDefinitionDraftSectionEditing] = useState(false);
Object.assign(__appScope, { definitionDraftSectionEditing, setDefinitionDraftSectionEditing });
const [definitionDraftError, setDefinitionDraftError] = useState("");
Object.assign(__appScope, { definitionDraftError, setDefinitionDraftError });
const [definitionStateDraftRows, setDefinitionStateDraftRows] = useState<DeviceDefinitionStateDraftRow[]>([]);
Object.assign(__appScope, { definitionStateDraftRows, setDefinitionStateDraftRows });
const [definitionStatePageId, setDefinitionStatePageId] = useState(DEFAULT_STATE_PAGE_ID);
Object.assign(__appScope, { definitionStatePageId, setDefinitionStatePageId });
const [definitionVisualDraft, setDefinitionVisualDraft] = useState<DeviceDefinitionVisualDraft | null>(null);
Object.assign(__appScope, { definitionVisualDraft, setDefinitionVisualDraft });
const [definitionTerminalAnchorDragIndex, setDefinitionTerminalAnchorDragIndex] = useState<number | null>(null);
Object.assign(__appScope, { definitionTerminalAnchorDragIndex, setDefinitionTerminalAnchorDragIndex });
const [deviceLibraryDialogLayouts, setDeviceLibraryDialogLayouts] = useState<DeviceLibraryDialogLayouts>({});
Object.assign(__appScope, { deviceLibraryDialogLayouts, setDeviceLibraryDialogLayouts });
const [deviceLibraryDialogDrag, setDeviceLibraryDialogDrag] = useState<DeviceLibraryDialogPointerState>(null);
Object.assign(__appScope, { deviceLibraryDialogDrag, setDeviceLibraryDialogDrag });
const [deviceLibraryDialogResize, setDeviceLibraryDialogResize] = useState<DeviceLibraryDialogPointerState>(null);
Object.assign(__appScope, { deviceLibraryDialogResize, setDeviceLibraryDialogResize });
const deviceDefinitionDialogRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { deviceDefinitionDialogRef });
const customDeviceDialogRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { customDeviceDialogRef });
const measurementConfigDialogRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { measurementConfigDialogRef });
const [layerAssignmentDialogOpen, setLayerAssignmentDialogOpen] = useState(false);
Object.assign(__appScope, { layerAssignmentDialogOpen, setLayerAssignmentDialogOpen });
const [layerAssignmentTargetId, setLayerAssignmentTargetId] = useState("");
Object.assign(__appScope, { layerAssignmentTargetId, setLayerAssignmentTargetId });
const [reactFlowPreviewOpen, setReactFlowPreviewOpen] = useState(false);
Object.assign(__appScope, { reactFlowPreviewOpen, setReactFlowPreviewOpen });
const [measurementConfigDialogOpen, setMeasurementConfigDialogOpen] = useState(false);
Object.assign(__appScope, { measurementConfigDialogOpen, setMeasurementConfigDialogOpen });
const [measurementConfigDraft, setMeasurementConfigDraft] = useState<PlatformMeasurementConfig | null>(null);
Object.assign(__appScope, { measurementConfigDraft, setMeasurementConfigDraft });
const measurementConfigDraftRef = useRef<PlatformMeasurementConfig | null>(null); Object.assign(__appScope, { measurementConfigDraftRef });
const [measurementConfigSaveStatus, setMeasurementConfigSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
Object.assign(__appScope, { measurementConfigSaveStatus, setMeasurementConfigSaveStatus });
const [measurementEditorDialog, setMeasurementEditorDialog] = useState<MeasurementEditorDialogState>(null);
Object.assign(__appScope, { measurementEditorDialog, setMeasurementEditorDialog });
const [measurementDrag, setMeasurementDrag] = useState<MeasurementDragState>(null);
Object.assign(__appScope, { measurementDrag, setMeasurementDrag });
const [topologyErrors, setTopologyErrors] = useState<TopologyValidationError[]>([]);
Object.assign(__appScope, { topologyErrors, setTopologyErrors });
const [topologyWarningPage, setTopologyWarningPage] = useState(0);
Object.assign(__appScope, { topologyWarningPage, setTopologyWarningPage });
const [topology, setTopology] = useState<Topology>(EMPTY_TOPOLOGY);
Object.assign(__appScope, { topology, setTopology });
const [topologyStatus, setTopologyStatus] = useState<TopologyRunStatus>(INITIAL_TOPOLOGY_STATUS);
Object.assign(__appScope, { topologyStatus, setTopologyStatus });
const topologyWarningPanelRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { topologyWarningPanelRef });
const [routeRenderingReady, setRouteRenderingReady] = useState(false);
Object.assign(__appScope, { routeRenderingReady, setRouteRenderingReady });
const [initialCanvasLodActive, setInitialCanvasLodActive] = useState(false);
Object.assign(__appScope, { initialCanvasLodActive, setInitialCanvasLodActive });
const [initialCanvasDetailHydrationLimit, setInitialCanvasDetailHydrationLimit] = useState(0);
Object.assign(__appScope, { initialCanvasDetailHydrationLimit, setInitialCanvasDetailHydrationLimit });
const [backgroundPageRenderReady, setBackgroundPageRenderReady] = useState(false);
Object.assign(__appScope, { backgroundPageRenderReady, setBackgroundPageRenderReady });
const [minimapSamplingReady, setMinimapSamplingReady] = useState(false);
Object.assign(__appScope, { minimapSamplingReady, setMinimapSamplingReady });
const [staticTerminalOverlapReadyKey, setStaticTerminalOverlapReadyKey] = useState("");
Object.assign(__appScope, { staticTerminalOverlapReadyKey, setStaticTerminalOverlapReadyKey });
const [colorDisplayMode, setColorDisplayMode] = useState<ColorDisplayMode>(() => readColorDisplayMode());
Object.assign(__appScope, { colorDisplayMode, setColorDisplayMode });
const [colorPalette, setColorPalette] = useState<ColorPalette>(() => readColorPalette());
Object.assign(__appScope, { colorPalette, setColorPalette });
const [colorPaletteDraft, setColorPaletteDraft] = useState<ColorPalette>(() => readColorPalette());
Object.assign(__appScope, { colorPaletteDraft, setColorPaletteDraft });
const [colorPaletteDialogOpen, setColorPaletteDialogOpen] = useState(false);
Object.assign(__appScope, { colorPaletteDialogOpen, setColorPaletteDialogOpen });
const [colorPaletteTab, setColorPaletteTab] = useState<ColorDisplayMode>(() => readColorDisplayMode());
Object.assign(__appScope, { colorPaletteTab, setColorPaletteTab });
const [voltageColorVisibility, setVoltageColorVisibility] = useState<VoltageColorVisibility>("all");
Object.assign(__appScope, { voltageColorVisibility, setVoltageColorVisibility });
const [pendingUnsavedAction, setPendingUnsavedAction] = useState<UnsavedChangeAction | null>(null);
Object.assign(__appScope, { pendingUnsavedAction, setPendingUnsavedAction });
const [pendingModelImportConflict, setPendingModelImportConflict] = useState<PendingModelImportConflict>(null);
Object.assign(__appScope, { pendingModelImportConflict, setPendingModelImportConflict });
const [pendingSchemeImportConflict, setPendingSchemeImportConflict] = useState<PendingSchemeImportConflict>(null);
Object.assign(__appScope, { pendingSchemeImportConflict, setPendingSchemeImportConflict });
const [pendingRecordPasteConflict, setPendingRecordPasteConflict] = useState<PendingRecordPasteConflict>(null);
Object.assign(__appScope, { pendingRecordPasteConflict, setPendingRecordPasteConflict });
const mousePositionTextRef = useRef<HTMLSpanElement | null>(null); Object.assign(__appScope, { mousePositionTextRef });
const operationLogRef = useRef("就绪"); Object.assign(__appScope, { operationLogRef });
const operationLogStatusRef = useRef<HTMLSpanElement | null>(null); Object.assign(__appScope, { operationLogStatusRef });
const setOperationLogText = createSetOperationLogText(__appScope); Object.assign(__appScope, { setOperationLogText });
const [selectedProjectId, setSelectedProjectId] = useState<string>("");
Object.assign(__appScope, { selectedProjectId, setSelectedProjectId });
const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
Object.assign(__appScope, { selectedSchemeId, setSelectedSchemeId });
const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
Object.assign(__appScope, { selectedProjectIds, setSelectedProjectIds });
const [selectedSchemeIds, setSelectedSchemeIds] = useState<string[]>([]);
Object.assign(__appScope, { selectedSchemeIds, setSelectedSchemeIds });
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => initialProjectSources.recoveredFromRefresh);
Object.assign(__appScope, { hasUnsavedChanges, setHasUnsavedChanges });
const [expandedSchemeIds, setExpandedSchemeIds] = useState<string[]>(() => {
    const preferredSchemeId = initialDraft?.activeSchemeKey || schemes[0]?.id;
    return preferredSchemeId ? [preferredSchemeId] : [];
  });
Object.assign(__appScope, { expandedSchemeIds, setExpandedSchemeIds });
const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);
Object.assign(__appScope, { projectMenu, setProjectMenu });
const [templateMenu, setTemplateMenu] = useState<TemplateMenuState>(null);
Object.assign(__appScope, { templateMenu, setTemplateMenu });
const contextMenuRef = useRef<HTMLDivElement | null>(null); Object.assign(__appScope, { contextMenuRef });
const [contextMenuSize, setContextMenuSize] = useState<ContextMenuSize | null>(null);
Object.assign(__appScope, { contextMenuSize, setContextMenuSize });
const [projectPanelHeight, setProjectPanelHeight] = useState(PROJECT_PANEL_DEFAULT_HEIGHT);
Object.assign(__appScope, { projectPanelHeight, setProjectPanelHeight });
const [projectPanelResize, setProjectPanelResize] = useState<{ startY: number; startHeight: number } | null>(null);
Object.assign(__appScope, { projectPanelResize, setProjectPanelResize });
const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
Object.assign(__appScope, { undoStack, setUndoStack });
latestNodesRef.current = nodes;
latestEdgesRef.current = edges;
const [recordClipboard, setRecordClipboard] = useState<ClipboardRecord | null>(null);
Object.assign(__appScope, { recordClipboard, setRecordClipboard });
const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
Object.assign(__appScope, { imageTarget, setImageTarget });
const [nodeDoubleClickDialog, setNodeDoubleClickDialog] = useState<NodeDoubleClickDialogState>(null);
Object.assign(__appScope, { nodeDoubleClickDialog, setNodeDoubleClickDialog });
const [nodeDoubleClickDraft, setNodeDoubleClickDraft] = useState<NodeDoubleClickDialogDraftState>(null);
Object.assign(__appScope, { nodeDoubleClickDraft, setNodeDoubleClickDraft });
const [nodeDoubleClickDialogLayout, setNodeDoubleClickDialogLayout] = useState<NodeDoubleClickDialogLayout>(null);
Object.assign(__appScope, { nodeDoubleClickDialogLayout, setNodeDoubleClickDialogLayout });
const [nodeDoubleClickDialogDrag, setNodeDoubleClickDialogDrag] = useState<NodeDoubleClickDialogDragState>(null);
Object.assign(__appScope, { nodeDoubleClickDialogDrag, setNodeDoubleClickDialogDrag });
const [nodeDoubleClickDialogResize, setNodeDoubleClickDialogResize] = useState<NodeDoubleClickDialogResizeState>(null);
Object.assign(__appScope, { nodeDoubleClickDialogResize, setNodeDoubleClickDialogResize });
const nodeDoubleClickDialogRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { nodeDoubleClickDialogRef });
const nodeDoubleClickOpenGuardRef = useRef<{ key: string; time: number } | null>(null);
Object.assign(__appScope, { nodeDoubleClickOpenGuardRef });
const nodeDoubleClickCloseSuppressUntilRef = useRef(0); Object.assign(__appScope, { nodeDoubleClickCloseSuppressUntilRef });
const [stateImageUploadTarget, setStateImageUploadTarget] = useState<StateImageUploadTarget | null>(null);
Object.assign(__appScope, { stateImageUploadTarget, setStateImageUploadTarget });
const [stateIconDrawingDialog, setStateIconDrawingDialog] = useState<StateIconDrawingDialogState | null>(null);
Object.assign(__appScope, { stateIconDrawingDialog, setStateIconDrawingDialog });
const [stateIconDrawingImageVisibleFrames, setStateIconDrawingImageVisibleFrames] = useState<Record<string, { x: number; y: number; width: number; height: number; basisWidth?: number; basisHeight?: number }>>({});
Object.assign(__appScope, { stateIconDrawingImageVisibleFrames, setStateIconDrawingImageVisibleFrames });
const [stateIconDrawingSvgVisibleFrames, setStateIconDrawingSvgVisibleFrames] = useState<Record<string, { x: number; y: number; width: number; height: number; basisWidth?: number; basisHeight?: number }>>({});
Object.assign(__appScope, { stateIconDrawingSvgVisibleFrames, setStateIconDrawingSvgVisibleFrames });
const [stateIconDrawingContextMenu, setStateIconDrawingContextMenu] = useState<StateIconDrawingContextMenuState | null>(null);
Object.assign(__appScope, { stateIconDrawingContextMenu, setStateIconDrawingContextMenu });
const [stateIconDrawingImportMode, setStateIconDrawingImportMode] = useState<"svg" | "image">("svg");
Object.assign(__appScope, { stateIconDrawingImportMode, setStateIconDrawingImportMode });
const [imageFolders, setImageFolders] = useState<ImageFolder[]>([{ id: "root", name: "默认文件夹", imageCount: 0 }]);
Object.assign(__appScope, { imageFolders, setImageFolders });
const [activeImageFolderId, setActiveImageFolderId] = useState("root");
Object.assign(__appScope, { activeImageFolderId, setActiveImageFolderId });
const [imagePickerSourceFilter, setImagePickerSourceFilter] = useState("");
Object.assign(__appScope, { imagePickerSourceFilter, setImagePickerSourceFilter });
const [imagePickerCategoryFilter, setImagePickerCategoryFilter] = useState("");
Object.assign(__appScope, { imagePickerCategoryFilter, setImagePickerCategoryFilter });
const [imagePickerSearchQuery, setImagePickerSearchQuery] = useState("");
Object.assign(__appScope, { imagePickerSearchQuery, setImagePickerSearchQuery });
const [iconLibraryPicker, setIconLibraryPicker] = useState<IconLibraryPickerState>(() => createInitialIconLibraryPickerState());
Object.assign(__appScope, { iconLibraryPicker, setIconLibraryPicker });
const [imageAssetList, setImageAssetList] = useState<ImageAsset[]>([]);
Object.assign(__appScope, { imageAssetList, setImageAssetList });
const [imageAssets, setImageAssets] = useState<Record<string, string>>(() => imageAssetsToMap(imageAssetList));
Object.assign(__appScope, { imageAssets, setImageAssets });
const [imageAssetContextMenu, setImageAssetContextMenu] = useState<{ assetId: string; x: number; y: number } | null>(null);
Object.assign(__appScope, { imageAssetContextMenu, setImageAssetContextMenu });
useLayoutEffect(createAppHookCallback4(__appScope));
const nodeById = graphStore.nodeMap; Object.assign(__appScope, { nodeById });
const edgeById = graphStore.edgeMap; Object.assign(__appScope, { edgeById });
const edgesByNodeId = graphStore.edgesByNodeId; Object.assign(__appScope, { edgesByNodeId });
const busNodeIdSet = graphStore.busNodeIdSet; Object.assign(__appScope, { busNodeIdSet });
const routableLineNodeIdsByEndpointNodeId = useMemo(createAppHookCallback5(__appScope), [nodes]);
Object.assign(__appScope, { routableLineNodeIdsByEndpointNodeId });
const edgeListForNodeIds = createEdgeListForNodeIds(__appScope); Object.assign(__appScope, { edgeListForNodeIds });
const snapshotRouteBounds = (routePointsByEdgeId: Record<string, Point[]>) =>
    Object.fromEntries(
      Object.entries(routePointsByEdgeId).map(([edgeId, points]) => [
        edgeId,
        routeRenderBounds({ points }, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING)
      ])
    ) as Record<string, RenderViewportBounds | null>;
Object.assign(__appScope, { snapshotRouteBounds });
const buildSingleNodeDragCache = createBuildSingleNodeDragCache(__appScope); Object.assign(__appScope, { buildSingleNodeDragCache });
const orderedNodeFromList = createOrderedNodeFromList(__appScope); Object.assign(__appScope, { orderedNodeFromList });
const orderedNodesForIds = createOrderedNodesForIds(__appScope); Object.assign(__appScope, { orderedNodesForIds });
const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? layers[0],
    [activeLayerId, layers]
  );
Object.assign(__appScope, { activeLayer });
const allModelLayersVisible = layers.length === 0 || layers.every((layer) => layer.visible !== false); Object.assign(__appScope, { allModelLayersVisible });
const visibleProject = useMemo(createAppHookCallback6(__appScope), [allModelLayersVisible, edges, graphStore.edgeIdSet, graphStore.edgeIndexById, graphStore.edgesByNodeId, graphStore.nodeIdSet, graphStore.nodeMap, graphStore.nodeSpatialIndex, graphStore.nodesByLayerId, layers, nodes]);
const visibleNodes = visibleProject.nodes; Object.assign(__appScope, { visibleNodes });
const visibleEdges = visibleProject.edges; Object.assign(__appScope, { visibleEdges });
const visibleNodeById = visibleProject.nodeById; Object.assign(__appScope, { visibleNodeById });
const visibleNodeIdSet = visibleProject.nodeIdSet; Object.assign(__appScope, { visibleNodeIdSet });
const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex; Object.assign(__appScope, { visibleNodeSpatialIndex });
const visibleEdgeIdSet = visibleProject.edgeIdSet; Object.assign(__appScope, { visibleEdgeIdSet });
const nodeForRoutingList = (sourceNodes: ModelNode[], nodeId: string) =>
    sourceNodes === visibleNodes
      ? visibleNodeById.get(nodeId) ?? nodeById.get(nodeId)
      : orderedNodeFromList(sourceNodes, nodeId) ?? nodeById.get(nodeId);
Object.assign(__appScope, { nodeForRoutingList });
const addRoutingNodesForConnectionEdge = createAddRoutingNodesForConnectionEdge(__appScope); Object.assign(__appScope, { addRoutingNodesForConnectionEdge });
const routingNodesForConnectionEdge = createRoutingNodesForConnectionEdge(__appScope); Object.assign(__appScope, { routingNodesForConnectionEdge });
const routingNodesForConnectionEdges = createRoutingNodesForConnectionEdges(__appScope); Object.assign(__appScope, { routingNodesForConnectionEdges });
const visibleEdgesByTerminalRef = useMemo(createAppHookCallback7(__appScope), [edges, graphStore.edgesByTerminalRef, visibleEdges]);
Object.assign(__appScope, { visibleEdgesByTerminalRef });
const activeLayerNodes = useMemo(createAppHookCallback8(__appScope), [activeLayer?.visible, activeLayerId, graphStore.nodesByLayerId, nodes, visibleNodeIdSet, visibleNodes]);
Object.assign(__appScope, { activeLayerNodes });
const filterSelectionTemplateLabelByKind = useMemo(
    () => new Map([...DEVICE_LIBRARY, ...customDeviceTemplates].map((template) => [template.kind, template.label])),
    [customDeviceTemplates]
  );
Object.assign(__appScope, { filterSelectionTemplateLabelByKind });
const filterSelectionTemplateComponentTypeByKind = useMemo(
    () => new Map([...DEVICE_LIBRARY, ...customDeviceTemplates].map((template) => [template.kind, filterSelectionTemplateComponentTypeKey(template)])),
    [customDeviceTemplates]
  );
Object.assign(__appScope, { filterSelectionTemplateComponentTypeByKind });
const filterSelectionComponentTypeKey = (node: ModelNode) =>
    filterSelectionTemplateComponentTypeByKind.get(node.kind) ||
    inferESection(node.kind, {}) ||
    inferESection(node.kind, node.params) ||
    String(node.params.component_type || node.params.componentType || node.kind);
Object.assign(__appScope, { filterSelectionComponentTypeKey });
const filterSelectionSpecificTypeKey = (node: ModelNode) => node.kind; Object.assign(__appScope, { filterSelectionSpecificTypeKey });
const filterSelectionItemKey = (node: ModelNode) =>
    `${filterSelectionComponentTypeKey(node)}::${filterSelectionSpecificTypeKey(node)}`;
Object.assign(__appScope, { filterSelectionItemKey });
const filterSelectionTypeOptions = useMemo(createAppHookCallback9(__appScope), [activeLayerNodes, filterSelectionTemplateComponentTypeByKind, filterSelectionTemplateLabelByKind]);
Object.assign(__appScope, { filterSelectionTypeOptions });
const activeLayerNodeIdSet = useMemo(
    () => (activeLayerNodes === visibleNodes ? visibleNodeIdSet : new Set(activeLayerNodes.map((node) => node.id))),
    [activeLayerNodes, visibleNodeIdSet, visibleNodes]
  );
Object.assign(__appScope, { activeLayerNodeIdSet });
const activeLayerEdges = useMemo(
    () => activeLayerNodes === visibleNodes ? visibleEdges : (() => {
      const collected = new Map<string, Edge>();
      for (const node of activeLayerNodes) {
        for (const edge of edgesByNodeId.get(node.id) ?? []) {
          if (visibleEdgeIdSet.has(edge.id)) {
            collected.set(edge.id, edge);
          }
        }
      }
      return Array.from(collected.values()).sort(
        (first, second) =>
          (graphStore.edgeIndexById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
          (graphStore.edgeIndexById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      );
    })(),
    [activeLayerNodes, edgesByNodeId, graphStore.edgeIndexById, visibleEdgeIdSet, visibleEdges, visibleNodes]
  );
Object.assign(__appScope, { activeLayerEdges });
const activeLayerEdgeIdSet = useMemo(
    () => (activeLayerEdges === visibleEdges ? visibleEdgeIdSet : new Set(activeLayerEdges.map((edge) => edge.id))),
    [activeLayerEdges, visibleEdgeIdSet, visibleEdges]
  );
Object.assign(__appScope, { activeLayerEdgeIdSet });
const activeLayerGroups = useMemo(
    () => isEditMode ? normalizeModelGroups(groups, activeLayerNodes, activeLayerEdges) : EMPTY_MODEL_GROUPS,
    [activeLayer?.visible, activeLayerId, graphStore.elementTreeRevision, groups, isEditMode, layers]
  );
Object.assign(__appScope, { activeLayerGroups });
const rawActiveSelectedEdgeIds = useMemo(
    () => (selectedEdgeIds.length > 0 ? selectedEdgeIds : selectedEdgeId ? [selectedEdgeId] : [])
      .filter((edgeId) => activeLayerEdgeIdSet.has(edgeId)),
    [activeLayerEdgeIdSet, selectedEdgeId, selectedEdgeIds]
  );
Object.assign(__appScope, { rawActiveSelectedEdgeIds });
const rawActiveSelectedNodeIds = useMemo(
    () => selectedNodeIds.filter((nodeId) => activeLayerNodeIdSet.has(nodeId)),
    [activeLayerNodeIdSet, selectedNodeIds]
  );
Object.assign(__appScope, { rawActiveSelectedNodeIds });
const activeCanvasSelection = useMemo(
    createAppHookCallback10(__appScope),
    [activeLayerGroups, canvasSelectionScope, isEditMode, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds]
  );
Object.assign(__appScope, { activeCanvasSelection });
const groupExpandedCanvasSelection = useMemo(
    createAppHookCallback11(__appScope),
    [activeCanvasSelection, activeLayerGroups, isEditMode, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds]
  );
Object.assign(__appScope, { groupExpandedCanvasSelection });
const activeSelectedNodeIds = activeCanvasSelection.nodeIds; Object.assign(__appScope, { activeSelectedNodeIds });
const selectedNodeId = activeSelectedNodeIds[0] ?? ""; Object.assign(__appScope, { selectedNodeId });
const displaySelectedNodeIds = canvasSelectionScope === "direct" ? groupExpandedCanvasSelection.nodeIds : activeSelectedNodeIds; Object.assign(__appScope, { displaySelectedNodeIds });
const displaySelectedEdgeIds = canvasSelectionScope === "direct" ? groupExpandedCanvasSelection.edgeIds : activeCanvasSelection.edgeIds; Object.assign(__appScope, { displaySelectedEdgeIds });
canvasSelectionShortcutActiveRef.current = activeSelectedNodeIds.length > 0 || activeCanvasSelection.edgeIds.length > 0;
const selectedNodeIdSet = useMemo(() => new Set(displaySelectedNodeIds), [displaySelectedNodeIds]); Object.assign(__appScope, { selectedNodeIdSet });
const displaySelectedNodeKey = useMemo(() => displaySelectedNodeIds.join("|"), [displaySelectedNodeIds]); Object.assign(__appScope, { displaySelectedNodeKey });
const selectedNode = visibleNodeById.get(selectedNodeId); Object.assign(__appScope, { selectedNode });
const activeSelectedEdgeIds = activeCanvasSelection.edgeIds; Object.assign(__appScope, { activeSelectedEdgeIds });
const activeSelectionKey = useMemo(
    () => `${activeSelectedNodeIds.join("|")}::${activeSelectedEdgeIds.join("|")}`,
    [activeSelectedEdgeIds, activeSelectedNodeIds]
  );
Object.assign(__appScope, { activeSelectionKey });
const activeSelectedEdgeSet = useMemo(() => new Set(displaySelectedEdgeIds), [displaySelectedEdgeIds]); Object.assign(__appScope, { activeSelectedEdgeSet });
const displaySelectedEdgeKey = useMemo(() => displaySelectedEdgeIds.join("|"), [displaySelectedEdgeIds]); Object.assign(__appScope, { displaySelectedEdgeKey });
const batchCommonParamRows = useMemo<BatchCommonParamRow[]>(createAppHookCallback12(__appScope), [activeSelectedNodeIds, nodeById]);
const batchCommonParamKeySet = useMemo(
    () => new Set(batchCommonParamRows.map((row) => row.key)),
    [batchCommonParamRows]
  );
Object.assign(__appScope, { batchCommonParamKeySet });
const batchCommonGraphicParamRows = useMemo(
    () => batchCommonParamRows.filter((row) => isBatchGraphCommonParamKey(row.key) && !isRedundantBatchCommonParamRow(row, batchCommonParamKeySet)),
    [batchCommonParamKeySet, batchCommonParamRows]
  );
Object.assign(__appScope, { batchCommonGraphicParamRows });
const batchCommonModelParamRows = useMemo(
    () => batchCommonParamRows.filter((row) => !isBatchGraphCommonParamKey(row.key) && !isRedundantBatchCommonParamRow(row, batchCommonParamKeySet)),
    [batchCommonParamKeySet, batchCommonParamRows]
  );
Object.assign(__appScope, { batchCommonModelParamRows });
const selectedNodeIdsWithMeasurementGroups = useMemo(() => new Set(
    activeSelectedNodeIds.filter((nodeId) => measurementGroupsForNode(projectMeasurements, nodeId).length > 0)
  ), [activeSelectedNodeIds, projectMeasurements]);
Object.assign(__appScope, { selectedNodeIdsWithMeasurementGroups });
const batchCommonMeasurementGroupRows = useMemo<BatchCommonMeasurementGroupRow[]>(createAppHookCallback13(__appScope), [activeSelectedNodeIds, nodeById, projectMeasurements]);
const hasBatchCommonPropertyRows =
    batchCommonGraphicParamRows.length > 0 ||
    batchCommonModelParamRows.length > 0 ||
    batchCommonMeasurementGroupRows.length > 0;
Object.assign(__appScope, { hasBatchCommonPropertyRows });
const batchCommonPropertyRowCount =
    batchCommonGraphicParamRows.length +
    batchCommonModelParamRows.length +
    batchCommonMeasurementGroupRows.length;
Object.assign(__appScope, { batchCommonPropertyRowCount });
const selectedEdge = activeLayerEdgeIdSet.has(selectedEdgeId) ? edgeById.get(selectedEdgeId) : undefined; Object.assign(__appScope, { selectedEdge });
const inspectorSelectedNode = selectedNode; Object.assign(__appScope, { inspectorSelectedNode });
const singleSelectedDeviceForInspector = Boolean(
    inspectorSelectedNode &&
    !isStaticNode(inspectorSelectedNode) &&
    activeSelectedNodeIds.length === 1 &&
    activeSelectedEdgeIds.length === 0
  );
Object.assign(__appScope, { singleSelectedDeviceForInspector });
const selectedMeasurementGroups = useMemo(
    () => (inspectorSelectedNode ? measurementGroupsForNode(projectMeasurements, inspectorSelectedNode.id) : []),
    [inspectorSelectedNode, projectMeasurements]
  );
Object.assign(__appScope, { selectedMeasurementGroups });
const selectedMeasurementGroup = selectedMeasurementGroups[0]; Object.assign(__appScope, { selectedMeasurementGroup });
const selectedMeasurementGroupIdSet = useMemo(
    () => new Set(selectedMeasurementGroups.map((group) => group.id)),
    [selectedMeasurementGroups]
  );
Object.assign(__appScope, { selectedMeasurementGroupIdSet });
const visibleMeasurementGroups = useMemo(
    () => projectMeasurements.groups.filter((group) => group.visible && visibleNodeById.has(group.nodeId)),
    [projectMeasurements.groups, visibleNodeById]
  );
Object.assign(__appScope, { visibleMeasurementGroups });
const measurementTypeById = useMemo(
    () => new Map(measurementConfig.measurementTypes.map((item) => [item.id, item])),
    [measurementConfig.measurementTypes]
  );
Object.assign(__appScope, { measurementTypeById });
const measurementProfileByKind = useMemo(
    () => new Map(measurementConfig.deviceProfiles.map((profile) => [profile.deviceKind, profile])),
    [measurementConfig.deviceProfiles]
  );
Object.assign(__appScope, { measurementProfileByKind });
const editableMeasurementConfig = measurementConfigDraft ?? measurementConfig; Object.assign(__appScope, { editableMeasurementConfig });
const editableMeasurementTypeById = useMemo(
    () => new Map(editableMeasurementConfig.measurementTypes.map((item) => [item.id, item])),
    [editableMeasurementConfig.measurementTypes]
  );
Object.assign(__appScope, { editableMeasurementTypeById });
const editableMeasurementProfileByKind = useMemo(
    () => new Map(editableMeasurementConfig.deviceProfiles.map((profile) => [profile.deviceKind, profile])),
    [editableMeasurementConfig.deviceProfiles]
  );
Object.assign(__appScope, { editableMeasurementProfileByKind });
const inspectorSelectedEdge = selectedEdge; Object.assign(__appScope, { inspectorSelectedEdge });
const inspectorTopologyErrors = useDeferredValue(topologyErrors); Object.assign(__appScope, { inspectorTopologyErrors });
const connectionStrokeColorCacheToken = useMemo(
    () => `${colorDisplayMode}:${JSON.stringify(colorPalette)}`,
    [colorDisplayMode, colorPalette]
  );
Object.assign(__appScope, { connectionStrokeColorCacheToken });
const cachedConnectionStrokeColor = createCachedConnectionStrokeColor(__appScope); Object.assign(__appScope, { cachedConnectionStrokeColor });
const connectionLineStyle = createConnectionLineStyle(__appScope); Object.assign(__appScope, { connectionLineStyle });
const measurementGroupBackgroundColor = (group: MeasurementGroup) => group.backgroundColor ?? "rgba(255, 255, 255, 0.84)"; Object.assign(__appScope, { measurementGroupBackgroundColor });
const measurementGroupBorderColor = (group: MeasurementGroup) => group.borderColor ?? "rgba(100, 116, 139, 0.36)"; Object.assign(__appScope, { measurementGroupBorderColor });
const measurementGroupBorderWidth = (group: MeasurementGroup) =>
    group.borderStyle === "none" ? 0 : clampNumber(Number(group.borderWidth ?? 1), 0, 12);
Object.assign(__appScope, { measurementGroupBorderWidth });
const measurementGroupBorderDashArray = (group: MeasurementGroup) =>
    measurementGroupBorderWidth(group) <= 0 || group.borderStyle === "none"
      ? undefined
      : svgStrokeDashArray(group.borderStyle);
Object.assign(__appScope, { measurementGroupBorderDashArray });
const measurementGroupColorInputValue = (color: string | undefined, fallback: string) =>
    color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
Object.assign(__appScope, { measurementGroupColorInputValue });
const measurementGroupAnchorPoint = createMeasurementGroupAnchorPoint(__appScope); Object.assign(__appScope, { measurementGroupAnchorPoint });
const measurementGroupLocalOffset = createMeasurementGroupLocalOffset(__appScope); Object.assign(__appScope, { measurementGroupLocalOffset });
const measurementGroupCanvasPosition = createMeasurementGroupCanvasPosition(__appScope); Object.assign(__appScope, { measurementGroupCanvasPosition });
const measurementGroupRenderMetrics = createMeasurementGroupRenderMetrics(__appScope); Object.assign(__appScope, { measurementGroupRenderMetrics });
const includeMeasurementGroupBounds = createIncludeMeasurementGroupBounds(__appScope); Object.assign(__appScope, { includeMeasurementGroupBounds });
const buildMeasurementGroupMarkup = createBuildMeasurementGroupMarkup(__appScope); Object.assign(__appScope, { buildMeasurementGroupMarkup });
const buildMeasurementGroupsMarkup = (node: ModelNode, options: { absolute?: boolean; className?: string } = {}) =>
    measurementGroupsForNode(projectMeasurements, node.id)
      .map((group) => buildMeasurementGroupMarkup(node, group, options))
      .join("");
Object.assign(__appScope, { buildMeasurementGroupsMarkup });
const buildRoutableLineDragGhostRoutesForNodeIds = createBuildRoutableLineDragGhostRoutesForNodeIds(__appScope); Object.assign(__appScope, { buildRoutableLineDragGhostRoutesForNodeIds });
const buildMultiNodeDragOverlayPreview = createBuildMultiNodeDragOverlayPreview(__appScope); Object.assign(__appScope, { buildMultiNodeDragOverlayPreview });
const dragMovedNodeIdSet = (dragState: DraggingState) =>
    dragState.singleNodeDragCache?.movedNodeIds ?? dragState.overlayPreview?.movedNodeIds ?? new Set(dragState.nodeIds);
Object.assign(__appScope, { dragMovedNodeIdSet });
const dragDraggedEdgeIdSet = (dragState: DraggingState) =>
    dragState.singleNodeDragCache?.draggedEdgeIds ?? dragState.overlayPreview?.draggedEdgeIds ?? new Set(dragState.edgeIds);
Object.assign(__appScope, { dragDraggedEdgeIdSet });
const dragMovedBusNodeIdSet = (dragState: DraggingState) =>
    dragState.singleNodeDragCache?.movedBusNodeIds ?? dragState.overlayPreview?.movedBusNodeIds ?? new Set(
      dragState.nodeIds.filter((nodeId) => busNodeIdSet.has(nodeId))
    );
Object.assign(__appScope, { dragMovedBusNodeIdSet });
const renderMultiNodeDragOverlay = createRenderMultiNodeDragOverlay(__appScope); Object.assign(__appScope, { renderMultiNodeDragOverlay });
const groupTransformPreviewNodeFromSnapshot = createGroupTransformPreviewNodeFromSnapshot(__appScope); Object.assign(__appScope, { groupTransformPreviewNodeFromSnapshot });
const renderGroupTransformPhotoPreview = createRenderGroupTransformPhotoPreview(__appScope); Object.assign(__appScope, { renderGroupTransformPhotoPreview });
const renderSingleTransformRotateOriginGhost = createRenderSingleTransformRotateOriginGhost(__appScope); Object.assign(__appScope, { renderSingleTransformRotateOriginGhost });
const renderTransformRotationTrajectory = createRenderTransformRotationTrajectory(__appScope); Object.assign(__appScope, { renderTransformRotationTrajectory });
const renderBoundaryBusInternalConnector = createRenderBoundaryBusInternalConnector(__appScope); Object.assign(__appScope, { renderBoundaryBusInternalConnector });
const collectCurrentModelVoltageColorKeys = createCollectCurrentModelVoltageColorKeys(__appScope); Object.assign(__appScope, { collectCurrentModelVoltageColorKeys });
const currentModelVoltageColorKeys = useMemo(
    () => (
      colorPaletteDialogOpen
        ? collectCurrentModelVoltageColorKeys()
        : EMPTY_VOLTAGE_COLOR_KEY_SET
    ),
    [colorPaletteDialogOpen, nodes]
  );
Object.assign(__appScope, { currentModelVoltageColorKeys });
const nearestVoltageColor = createNearestVoltageColor(__appScope); Object.assign(__appScope, { nearestVoltageColor });
const fillMissingVoltageColorRows = createFillMissingVoltageColorRows(__appScope); Object.assign(__appScope, { fillMissingVoltageColorRows });
const toggleColorDisplayMode = createToggleColorDisplayMode(__appScope); Object.assign(__appScope, { toggleColorDisplayMode });
const openColorPaletteDialog = createOpenColorPaletteDialog(__appScope); Object.assign(__appScope, { openColorPaletteDialog });
const saveColorPalette = createSaveColorPalette(__appScope); Object.assign(__appScope, { saveColorPalette });
const resetEnergyColors = createResetEnergyColors(__appScope); Object.assign(__appScope, { resetEnergyColors });
const resetVoltageColors = createResetVoltageColors(__appScope); Object.assign(__appScope, { resetVoltageColors });
const updateEnergyColor = createUpdateEnergyColor(__appScope); Object.assign(__appScope, { updateEnergyColor });
const voltageColorRows = useMemo(
    () => Object.entries(colorPaletteDraft.voltage)
      .filter(([key]) => key.startsWith("ac:") || key.startsWith("dc:"))
      .map(([key, color]) => {
        const [type, ...voltageParts] = key.split(":");
        return {
          key,
          type: (type === "dc" ? "dc" : "ac") as "ac" | "dc",
          voltage: voltageParts.join(":") || "0",
          color
        };
      })
      .sort((left, right) => left.type.localeCompare(right.type) || Number(left.voltage) - Number(right.voltage) || left.voltage.localeCompare(right.voltage)),
    [colorPaletteDraft.voltage]
  );
Object.assign(__appScope, { voltageColorRows });
const visibleVoltageColorRows = useMemo(
    () => voltageColorVisibility === "current"
      ? voltageColorRows.filter((row) => currentModelVoltageColorKeys.has(row.key))
      : voltageColorRows,
    [currentModelVoltageColorKeys, voltageColorRows, voltageColorVisibility]
  );
Object.assign(__appScope, { visibleVoltageColorRows });
const setVoltageColorRows = createSetVoltageColorRows(__appScope); Object.assign(__appScope, { setVoltageColorRows });
const updateVoltageColorRow = createUpdateVoltageColorRow(__appScope); Object.assign(__appScope, { updateVoltageColorRow });
const deleteVoltageColorRow = createDeleteVoltageColorRow(__appScope); Object.assign(__appScope, { deleteVoltageColorRow });
const addVoltageColorRow = createAddVoltageColorRow(__appScope); Object.assign(__appScope, { addVoltageColorRow });
const projects = useMemo(() => flattenSavedProjects(schemes), [schemes]); Object.assign(__appScope, { projects });
const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]); Object.assign(__appScope, { projectById });
const projectSearchNeedle = normalizeLibrarySearchText(projectSearchQuery); Object.assign(__appScope, { projectSearchNeedle });
const filteredProjectSchemes = useMemo<SavedSchemeRecord[]>(createAppHookCallback14(__appScope), [projectSearchNeedle, schemes]);
const baseLibraryTemplates = useMemo<DeviceTemplate[]>(() => [...DEVICE_LIBRARY, ...customDeviceTemplates], [customDeviceTemplates]); Object.assign(__appScope, { baseLibraryTemplates });
const libraryTemplates = useMemo<DeviceTemplate[]>(
    () => baseLibraryTemplates.map((template) => applyDeviceTemplateDefinitionOverride(template, deviceDefinitionOverrideForTemplate(template, deviceDefinitionOverrides))),
    [baseLibraryTemplates, deviceDefinitionOverrides]
  );
Object.assign(__appScope, { libraryTemplates });
const libraryTemplateByKind = useMemo(() => new Map(libraryTemplates.map((template) => [template.kind, template])), [libraryTemplates]); Object.assign(__appScope, { libraryTemplateByKind });
useEffect(() => {
    if (nodes.length === 0 || libraryTemplateByKind.size === 0) {
      return;
    }
    let changed = false;
    const normalizedNodes = nodes.map((node) => {
      const normalized = normalizeNodeTerminalsWithTemplate(node, libraryTemplateByKind.get(node.kind));
      if (normalized !== node) {
        changed = true;
      }
      return normalized;
    });
    if (!changed) {
      return;
    }
    suppressNextGraphDirtyRef.current = true;
    setGraphArrays(normalizedNodes, edges);
  }, [edges, libraryTemplateByKind, nodes]);
const resolveNodeStateVisual = createResolveNodeStateVisual(__appScope); Object.assign(__appScope, { resolveNodeStateVisual });
useEffect(createAppHookCallback15(__appScope), [customDeviceDraft.stateDefinitions, customDeviceStatePageId]);
useEffect(createAppHookCallback16(__appScope), [definitionStateDraftRows, definitionStatePageId]);
const statusStatesForNode = createStatusStatesForNode(__appScope); Object.assign(__appScope, { statusStatesForNode });
const statusOptionsForNode = (node: ModelNode | undefined) =>
    statusStatesForNode(node).map((state) => state.value);
Object.assign(__appScope, { statusOptionsForNode });
const statusOptionLabelsForNode = (node: ModelNode | undefined) =>
    Object.fromEntries(statusStatesForNode(node).map((state) => [state.value, state.name || state.value]));
Object.assign(__appScope, { statusOptionLabelsForNode });
const nodeKindAllowsResizeTransform = createNodeKindAllowsResizeTransform(__appScope); Object.assign(__appScope, { nodeKindAllowsResizeTransform });
const groupDeviceReplacementTemplates = useMemo(
    () => libraryTemplates,
    [libraryTemplates]
  );
Object.assign(__appScope, { groupDeviceReplacementTemplates });
const baseLibraryTemplateByKind = useMemo(() => new Map(baseLibraryTemplates.map((template) => [template.kind, template])), [baseLibraryTemplates]); Object.assign(__appScope, { baseLibraryTemplateByKind });
const groupedAttributeLibrary = useMemo(() => groupDeviceTemplatesByAttributeLibrary(libraryTemplates), [libraryTemplates]); Object.assign(__appScope, { groupedAttributeLibrary });
const groupedAttributeLibraryByComponentType = useMemo(() => groupDeviceTemplatesByAttributeLibraryAndComponentType(libraryTemplates), [libraryTemplates]); Object.assign(__appScope, { groupedAttributeLibraryByComponentType });
const librarySearchNeedle = normalizeLibrarySearchText(librarySearchQuery); Object.assign(__appScope, { librarySearchNeedle });
const filteredAttributeLibraryByComponentType = useMemo(
    () => filterAttributeLibraryComponentTypeGroups(groupedAttributeLibraryByComponentType, librarySearchNeedle),
    [groupedAttributeLibraryByComponentType, librarySearchNeedle]
  );
Object.assign(__appScope, { filteredAttributeLibraryByComponentType });
const customComponentTreeSearchNeedle = normalizeLibrarySearchText(customComponentTreeSearchQuery); Object.assign(__appScope, { customComponentTreeSearchNeedle });
const filteredCustomComponentTreeByComponentType = useMemo(
    () => filterAttributeLibraryComponentTypeGroups(groupedAttributeLibraryByComponentType, customComponentTreeSearchNeedle),
    [customComponentTreeSearchNeedle, groupedAttributeLibraryByComponentType]
  );
Object.assign(__appScope, { filteredCustomComponentTreeByComponentType });
const deviceDefinitionSearchNeedle = normalizeLibrarySearchText(deviceDefinitionSearchQuery); Object.assign(__appScope, { deviceDefinitionSearchNeedle });
const filteredDeviceDefinitionByComponentType = useMemo(
    () => filterAttributeLibraryComponentTypeGroups(groupedAttributeLibraryByComponentType, deviceDefinitionSearchNeedle),
    [deviceDefinitionSearchNeedle, groupedAttributeLibraryByComponentType]
  );
Object.assign(__appScope, { filteredDeviceDefinitionByComponentType });
const libraryPreviewByKind = useMemo(
    () => new Map(libraryTemplates.map((template) => [template.kind, createNodeFromTemplate(template, { x: 0, y: 0 })])),
    [libraryTemplates]
  );
Object.assign(__appScope, { libraryPreviewByKind });
const graphTemplateTypes = useMemo(
    () => graphTemplateTypeList(customGraphTemplateTypes, customGraphTemplates),
    [customGraphTemplateTypes, customGraphTemplates]
  );
Object.assign(__appScope, { graphTemplateTypes });
const groupedGraphTemplates = useMemo(
    () => groupGraphTemplatesByType(customGraphTemplates, graphTemplateTypes),
    [customGraphTemplates, graphTemplateTypes]
  );
Object.assign(__appScope, { groupedGraphTemplates });
const templateLibrarySearchNeedle = normalizeLibrarySearchText(templateLibrarySearchQuery); Object.assign(__appScope, { templateLibrarySearchNeedle });
const filteredGroupedGraphTemplates = useMemo(
    () => filterGraphTemplatesByType(groupedGraphTemplates, templateLibrarySearchQuery),
    [groupedGraphTemplates, templateLibrarySearchQuery]
  );
Object.assign(__appScope, { filteredGroupedGraphTemplates });
const displayedGraphTemplateTypes = useMemo(
    () => templateLibrarySearchNeedle
      ? graphTemplateTypes.filter((typeName) => (filteredGroupedGraphTemplates[typeName] ?? []).length > 0)
      : graphTemplateTypes,
    [filteredGroupedGraphTemplates, graphTemplateTypes, templateLibrarySearchNeedle]
  );
Object.assign(__appScope, { displayedGraphTemplateTypes });
const attributeLibraries = useMemo<AttributeLibrary[]>(
    () => Array.from(new Set([...DEFAULT_ATTRIBUTE_LIBRARIES, ...customAttributeLibraries, ...libraryTemplates.map((item) => normalizeAttributeLibraryName(item.attributeLibrary))])),
    [customAttributeLibraries, libraryTemplates]
  );
Object.assign(__appScope, { attributeLibraries });
const displayedAttributeLibraries = useMemo(
    () => librarySearchNeedle
      ? attributeLibraries.filter((group) => (filteredAttributeLibraryByComponentType[group] ?? []).length > 0)
      : attributeLibraries,
    [attributeLibraries, filteredAttributeLibraryByComponentType, librarySearchNeedle]
  );
Object.assign(__appScope, { displayedAttributeLibraries });
const displayedCustomComponentTreeLibraries = useMemo(
    () => customComponentTreeSearchNeedle
      ? attributeLibraries.filter((group) => (filteredCustomComponentTreeByComponentType[group] ?? []).length > 0)
      : attributeLibraries,
    [attributeLibraries, customComponentTreeSearchNeedle, filteredCustomComponentTreeByComponentType]
  );
Object.assign(__appScope, { displayedCustomComponentTreeLibraries });
const displayedDeviceDefinitionLibraries = useMemo(
    () => deviceDefinitionSearchNeedle
      ? attributeLibraries.filter((group) => (filteredDeviceDefinitionByComponentType[group] ?? []).length > 0)
      : attributeLibraries,
    [attributeLibraries, deviceDefinitionSearchNeedle, filteredDeviceDefinitionByComponentType]
  );
Object.assign(__appScope, { displayedDeviceDefinitionLibraries });
useEffect(createAppHookCallback17(__appScope), [libraryFlyoutPositions]);
const libraryComponentListRefKey = (layout: "inline" | "flyout", componentTypeKey: string) => `${layout}:${componentTypeKey}`; Object.assign(__appScope, { libraryComponentListRefKey });
const setLibraryComponentListRef = (key: string) => (element: HTMLDivElement | null) => {
    if (element) {
      libraryComponentListRefs.current.set(key, element);
    } else {
      libraryComponentListRefs.current.delete(key);
    }
  };
Object.assign(__appScope, { setLibraryComponentListRef });
const setLibraryComponentTypeHeaderRef = (key: string) => (element: HTMLButtonElement | null) => {
    if (element) {
      libraryComponentTypeHeaderRefs.current.set(key, element);
    } else {
      libraryComponentTypeHeaderRefs.current.delete(key);
    }
  };
Object.assign(__appScope, { setLibraryComponentTypeHeaderRef });
const clearLibraryFlyoutCloseTimer = createClearLibraryFlyoutCloseTimer(__appScope); Object.assign(__appScope, { clearLibraryFlyoutCloseTimer });
const hideLibraryFlyout = createHideLibraryFlyout(__appScope); Object.assign(__appScope, { hideLibraryFlyout });
const scheduleLibraryFlyoutClose = createScheduleLibraryFlyoutClose(__appScope); Object.assign(__appScope, { scheduleLibraryFlyoutClose });
const scheduleGraphTemplateFlyoutClose = (typeName: string) => {
    clearLibraryFlyoutCloseTimer();
    libraryFlyoutCloseTimerRef.current = window.setTimeout(() => {
      setHoveredGraphTemplateType((current) => current === typeName ? "" : current);
      setLibraryFlyoutPositions((current) => {
        const key = libraryComponentListRefKey("flyout", `template:${typeName}`);
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      });
      libraryFlyoutCloseTimerRef.current = null;
    }, 120);
  };
Object.assign(__appScope, { scheduleGraphTemplateFlyoutClose });
useEffect(() => () => clearLibraryFlyoutCloseTimer(), []);
const libraryFlyoutStyle = createLibraryFlyoutStyle(__appScope); Object.assign(__appScope, { libraryFlyoutStyle });
const fitLibraryFlyoutsToVisibleArea = createFitLibraryFlyoutsToVisibleArea(__appScope); Object.assign(__appScope, { fitLibraryFlyoutsToVisibleArea });
useLayoutEffect(createAppHookCallback18(__appScope), [
    componentLibraryDisplayMode,
    displayedAttributeLibraries,
    displayedGraphTemplateTypes,
    expandedAttributeLibraryComponentTypes,
    filteredAttributeLibraryByComponentType,
    filteredGroupedGraphTemplates,
    hoveredAttributeLibraryComponentType,
    hoveredGraphTemplateType,
    leftPanelTab,
    librarySearchNeedle,
    templateLibraryDisplayMode,
    templateLibrarySearchNeedle
  ]);
useEffect(createAppHookCallback19(__appScope), [componentLibraryDisplayMode, leftPanelTab, librarySearchNeedle, templateLibraryDisplayMode, templateLibrarySearchNeedle]);
useEffect(createAppHookCallback20(__appScope), [componentLibraryDisplayMode, hoveredAttributeLibraryComponentType, hoveredGraphTemplateType, leftPanelTab, templateLibraryDisplayMode]);
const toggleAttributeLibrary = createToggleAttributeLibrary(__appScope); Object.assign(__appScope, { toggleAttributeLibrary });
const toggleAttributeLibraryComponentType = createToggleAttributeLibraryComponentType(__appScope); Object.assign(__appScope, { toggleAttributeLibraryComponentType });
const selectableAttributeLibraries = useMemo<AttributeLibrary[]>(
    () => Array.from(new Set([...CUSTOM_ATTRIBUTE_LIBRARY_BASES, ...customAttributeLibraries, ...attributeLibraries.filter((group) => group !== "静态图元")])),
    [customAttributeLibraries, attributeLibraries]
  );
Object.assign(__appScope, { selectableAttributeLibraries });
const componentTypeOptionsByAttributeLibrary = useMemo<Record<string, string[]>>(createAppHookCallback21(__appScope), [customComponentTypes, attributeLibraries, libraryTemplates]);
Object.assign(__appScope, { componentTypeOptionsByAttributeLibrary });
const componentTypeOptions = useMemo(
    () => Array.from(new Set([
      ...E_SECTION_OPTIONS,
      ...customComponentTypes.map((item) => item.name),
      ...libraryTemplates.filter((template) => template.custom).map(resolveTemplateComponentType).filter(Boolean)
    ])),
    [customComponentTypes, libraryTemplates]
  );
Object.assign(__appScope, { componentTypeOptions });
const currentAttributeLibraryComponentTypeOptions = useMemo(createAppHookCallback22(__appScope), [customDeviceDraft.componentType, customDeviceDraft.attributeLibraryName, componentTypeOptionsByAttributeLibrary]);
Object.assign(__appScope, { currentAttributeLibraryComponentTypeOptions });
const selectedDefinitionTemplate = selectedDefinitionKind ? libraryTemplateByKind.get(selectedDefinitionKind) ?? libraryTemplates[0] : libraryTemplates[0]; Object.assign(__appScope, { selectedDefinitionTemplate });
const selectedCustomComponentTemplate =
    customComponentTreeSelection.kind === "component"
      ? libraryTemplateByKind.get(customComponentTreeSelection.templateKind)
      : undefined;
Object.assign(__appScope, { selectedCustomComponentTemplate });
const definitionAttributeLibraryComponentTypeOptions = useMemo(createAppHookCallback23(__appScope), [customDeviceDraft.attributeLibraryName, definitionDraftSection, componentTypeOptionsByAttributeLibrary, selectedDefinitionTemplate?.attributeLibrary]);
Object.assign(__appScope, { definitionAttributeLibraryComponentTypeOptions });
const defaultComponentTypeForAttributeLibrary = (attributeLibraryName: string) => (
    componentTypeOptionsByAttributeLibrary[normalizeAttributeLibraryName(attributeLibraryName)]?.[0] ?? fallbackComponentTypeForAttributeLibrary(attributeLibraryName)
  );
Object.assign(__appScope, { defaultComponentTypeForAttributeLibrary });
const selectedDefinitionBaseTemplate = selectedDefinitionTemplate ? baseLibraryTemplateByKind.get(selectedDefinitionTemplate.kind) : undefined; Object.assign(__appScope, { selectedDefinitionBaseTemplate });
const selectedDefinitionTerminalAssociations = selectedDefinitionTemplate
    ? describeContainerTerminalAssociations(selectedDefinitionTemplate)
    : [];
Object.assign(__appScope, { selectedDefinitionTerminalAssociations });
const deviceParamPanelActive = inspectorTab === "device"; Object.assign(__appScope, { deviceParamPanelActive });
const selectedNodeTemplate = deviceParamPanelActive && inspectorSelectedNode ? libraryTemplateByKind.get(inspectorSelectedNode.kind) : undefined; Object.assign(__appScope, { selectedNodeTemplate });
const selectedContainerParameterViews = useMemo(
    () => deviceParamPanelActive && inspectorSelectedNode ? buildContainerDeviceParameterViews(inspectorSelectedNode, selectedNodeTemplate) : [],
    [deviceParamPanelActive, inspectorSelectedNode, selectedNodeTemplate]
  );
Object.assign(__appScope, { selectedContainerParameterViews });
useEffect(createAppHookCallback24(__appScope), [activeLayerId, layers]);
useEffect(createAppHookCallback25(__appScope), [activeLayerEdgeIdSet, activeLayerNodeIdSet]);
const selectedContainerParameterView =
    selectedContainerParameterViews.find((view) => view.id === containerParamViewId) ?? selectedContainerParameterViews[0]; Object.assign(__appScope, { selectedContainerParameterView });
const selectedProjectRecord = projectById.get(selectedProjectId); Object.assign(__appScope, { selectedProjectRecord });
const activeProjectRecord = projectById.get(activeProjectKey); Object.assign(__appScope, { activeProjectRecord });
const saveRequired = hasUnsavedChanges; Object.assign(__appScope, { saveRequired });
const canExportCurrentModel = !saveRequired; Object.assign(__appScope, { canExportCurrentModel });
const activeModelName = projectName || activeProjectRecord?.name || (activeProjectKey ? "未命名模型" : "未选择模型"); Object.assign(__appScope, { activeModelName });
const activeSchemeRecord =
    findSavedSchemeById(schemes, activeSchemeKey) ??
    findProjectRecordInSchemes(schemes, activeProjectKey)?.scheme;
Object.assign(__appScope, { activeSchemeRecord });
const activeModelPathName = `${activeSchemeRecord?.name ?? "未选择方案"} / ${activeModelName}`; Object.assign(__appScope, { activeModelPathName });
const currentModelRecord = useMemo<SavedProjectRecord>(() => (
    selectedProjectRecord ?? activeProjectRecord ?? {
      id: activeProjectKey || "current-project",
      name: projectName,
      updatedAt: new Date().toISOString(),
      project: {
        version: 1,
        name: projectName,
        canvasWidth,
        canvasHeight,
        allowAutoExpandCanvas,
        canvasBackgroundColor,
        canvasBackgroundImage,
        canvasBackgroundImageAssetId,
        backgroundProjectId,
        backgroundLayerIds,
        powerUnit,
        voltageUnit,
        currentUnit,
        powerBaseValue,
        deviceIndexCounters,
        layers,
        activeLayerId,
        groups,
        measurements: projectMeasurements,
        nodes,
        edges
      }
    }
  ), [
    activeLayerId,
    activeProjectKey,
    activeProjectRecord,
    allowAutoExpandCanvas,
    backgroundLayerIds,
    backgroundProjectId,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    canvasHeight,
    canvasWidth,
    currentUnit,
    deviceIndexCounters,
    edges,
    groups,
    layers,
    nodes,
    projectMeasurements,
    powerBaseValue,
    powerUnit,
    projectName,
    selectedProjectRecord,
    voltageUnit
  ]);
Object.assign(__appScope, { currentModelRecord });
saveRequiredRef.current = saveRequired;
const currentActiveProjectPointer = activeProjectPointerPayload(schemes, activeProjectKey, activeSchemeKey); Object.assign(__appScope, { currentActiveProjectPointer });
if (currentActiveProjectPointer || backendSchemesLoadedRef.current) {
    latestActiveProjectPointerRef.current = currentActiveProjectPointer;
  }
const refreshRecoveryProjectSnapshot = useMemo<RefreshRecoveryProjectState>(() => ({
    dirty: true,
    savedAt: new Date().toISOString(),
    projectName,
    activeProjectKey,
    activeSchemeKey,
    canvasWidth,
    canvasHeight,
    allowAutoExpandCanvas,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    backgroundProjectId,
    backgroundLayerIds,
    powerUnit,
    voltageUnit,
    currentUnit,
    powerBaseValue,
    deviceIndexCounters,
    layers,
    activeLayerId,
    groups,
    measurements: projectMeasurements,
    nodes,
    edges
  }), [
    activeLayerId,
    activeProjectKey,
    activeSchemeKey,
    allowAutoExpandCanvas,
    backgroundLayerIds,
    backgroundProjectId,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    canvasHeight,
    canvasWidth,
    currentUnit,
    deviceIndexCounters,
    edges,
    groups,
    layers,
    nodes,
    projectMeasurements,
    powerBaseValue,
    powerUnit,
    projectName,
    voltageUnit
  ]);
Object.assign(__appScope, { refreshRecoveryProjectSnapshot });
refreshRecoveryProjectRef.current = refreshRecoveryProjectSnapshot;
const selectedSchemeRecord = findSavedSchemeById(schemes, selectedSchemeId); Object.assign(__appScope, { selectedSchemeRecord });
const backgroundProjectOptions = useMemo(
    () => savedProjectPathOptions(schemes, activeProjectKey),
    [activeProjectKey, schemes]
  );
Object.assign(__appScope, { backgroundProjectOptions });
const backgroundProjectRecord = backgroundProjectId && backgroundProjectId !== activeProjectKey
    ? projectById.get(backgroundProjectId)
    : undefined;
Object.assign(__appScope, { backgroundProjectRecord });
const backgroundLayerOptions = useMemo(
    () => backgroundProjectRecord ? normalizeProjectLayers(backgroundProjectRecord.project).layers ?? [] : [],
    [backgroundProjectRecord]
  );
Object.assign(__appScope, { backgroundLayerOptions });
const resolveConfiguredBackgroundLayerIds = createResolveConfiguredBackgroundLayerIds(__appScope); Object.assign(__appScope, { resolveConfiguredBackgroundLayerIds });
const toggleBackgroundLayer = createToggleBackgroundLayer(__appScope); Object.assign(__appScope, { toggleBackgroundLayer });
const selectedNodeCount = activeSelectedNodeIds.length; Object.assign(__appScope, { selectedNodeCount });
const selectedCount = selectedNodeCount + activeSelectedEdgeIds.length; Object.assign(__appScope, { selectedCount });
const previousAutoInspectorSelectionKeyRef = useRef(activeSelectionKey); Object.assign(__appScope, { previousAutoInspectorSelectionKeyRef });
useEffect(createAppHookCallback26(__appScope), [activeSelectionKey, selectedCount]);
const selectedNodeTransformStatus = useMemo(createAppHookCallback27(__appScope), [activeSelectedNodeIds, visibleNodeById]);
Object.assign(__appScope, { selectedNodeTransformStatus });
const contextSelectionCount = activeSelectedNodeIds.length + activeSelectedEdgeIds.length; Object.assign(__appScope, { contextSelectionCount });
const activeSelectedGroupIds = useMemo(
    () => isEditMode
      ? selectedCanvasGroupIds(activeLayerGroups, groupExpandedCanvasSelection.nodeIds, groupExpandedCanvasSelection.edgeIds)
      : EMPTY_ID_LIST,
    [activeLayerGroups, groupExpandedCanvasSelection, isEditMode]
  );
Object.assign(__appScope, { activeSelectedGroupIds });
const activeGroupById = useMemo(() => isEditMode ? new Map(activeLayerGroups.map((group) => [group.id, group])) : EMPTY_MODEL_GROUP_BY_ID, [activeLayerGroups, isEditMode]); Object.assign(__appScope, { activeGroupById });
const canAddTemplateFromSelection = activeSelectedGroupIds.length === 1; Object.assign(__appScope, { canAddTemplateFromSelection });
const selectedGroupMemberNodeIds = useMemo(
    () => isEditMode ? canvasGroupMemberNodeIds(activeLayerGroups, activeSelectedGroupIds) : EMPTY_ID_LIST,
    [activeLayerGroups, activeSelectedGroupIds, isEditMode]
  );
Object.assign(__appScope, { selectedGroupMemberNodeIds });
const selectedGroupMemberNodeIdSet = useMemo(() => new Set(selectedGroupMemberNodeIds), [selectedGroupMemberNodeIds]); Object.assign(__appScope, { selectedGroupMemberNodeIdSet });
const focusedGroupedNodeMovesGroup =
    canvasSelectionScope === "direct" &&
    activeSelectedNodeIds.length === 1 &&
    activeSelectedEdgeIds.length === 0 &&
    selectedGroupMemberNodeIdSet.has(activeSelectedNodeIds[0]);
Object.assign(__appScope, { focusedGroupedNodeMovesGroup });
const canUngroupSelectedGraphics = useMemo(
    () => isEditMode && canDissolveSingleCanvasGroupSelection(activeLayerGroups, activeSelectedNodeIds, activeSelectedEdgeIds),
    [activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode]
  );
Object.assign(__appScope, { canUngroupSelectedGraphics });
const canGroupSelectedGraphics = useMemo(
    () => isEditMode && canGroupCanvasSelection(activeLayerGroups, activeSelectedNodeIds, activeSelectedEdgeIds),
    [activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode]
  );
Object.assign(__appScope, { canGroupSelectedGraphics });
const topologyWarningPageCount = Math.max(1, Math.ceil(inspectorTopologyErrors.length / TOPOLOGY_WARNING_PAGE_SIZE)); Object.assign(__appScope, { topologyWarningPageCount });
const normalizedTopologyWarningPage = Math.min(topologyWarningPage, topologyWarningPageCount - 1); Object.assign(__appScope, { normalizedTopologyWarningPage });
const visibleTopologyErrors = inspectorTopologyErrors.slice(
    normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE,
    normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE + TOPOLOGY_WARNING_PAGE_SIZE
  );
Object.assign(__appScope, { visibleTopologyErrors });
const hiddenTopologyErrorCount = Math.max(0, inspectorTopologyErrors.length - visibleTopologyErrors.length); Object.assign(__appScope, { hiddenTopologyErrorCount });
const draggingNodeIdSet = useMemo(() => new Set(dragging?.nodeIds ?? []), [dragging?.nodeIds]); Object.assign(__appScope, { draggingNodeIdSet });
const draggingNodeKey = useMemo(() => (dragging?.nodeIds ?? []).join("|"), [dragging?.nodeIds]); Object.assign(__appScope, { draggingNodeKey });
const editHotInteractionActive = isEditMode && Boolean(
    dragging ||
    transformDrag ||
    manualPathDrag ||
    rewiring ||
    terminalPress?.moved ||
    nodeLabelDrag ||
    nodeLabelRotateDrag ||
    canvasResizeDrag ||
    panning ||
    marquee ||
    modifierSelectionPress ||
    connectSource ||
    staticDrawing ||
    libraryPlacement
  );
Object.assign(__appScope, { editHotInteractionActive });
const graphTreePanelActive = inspectorTab === "tree"; Object.assign(__appScope, { graphTreePanelActive });
const elementTreeLayerSignature = useMemo(
    () => layers.map((layer) => `${layer.id}:${layer.visible !== false ? "1" : "0"}`).join("|"),
    [layers]
  );
Object.assign(__appScope, { elementTreeLayerSignature });
const elementTreeSource = useMemo(() => createAppHookCallback28(__appScope)(), [editHotInteractionActive, elementTreeLayerSignature, graphStore.elementTreeRevision, graphTreePanelActive, visibleEdges, visibleNodes]);
const deferredElementTreeSource = useDeferredValue(elementTreeSource); Object.assign(__appScope, { deferredElementTreeSource });
const elementTreeSignature = useMemo(
    () => graphTreePanelActive
      ? elementTreeCacheSignature(deferredElementTreeSource.revision, deferredElementTreeSource.layerSignature, libraryTemplates)
      : "",
    [deferredElementTreeSource, graphTreePanelActive, libraryTemplates]
  );
Object.assign(__appScope, { elementTreeSignature });
const elementTree = useMemo(() => createAppHookCallback29(__appScope)(), [deferredElementTreeSource, elementTreeSignature, graphTreePanelActive, libraryTemplates]);
Object.assign(__appScope, { elementTree });
const selectedElementTreeItemKey = useMemo(createAppHookCallback30(__appScope), [activeLayerEdgeIdSet, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, graphTreePanelActive]);
Object.assign(__appScope, { selectedElementTreeItemKey });
const elementTreeItemChildren = createElementTreeItemChildren(__appScope); Object.assign(__appScope, { elementTreeItemChildren });
const elementTreeSearchNeedle = elementTreeSearchQuery.trim().toLocaleLowerCase(); Object.assign(__appScope, { elementTreeSearchNeedle });
const filteredElementTree = useMemo(createAppHookCallback31(__appScope), [elementTree, elementTreeSearchNeedle, libraryTemplateByKind, visibleNodeById]);
const elementTreeDraftValue = (key: string, fallback: string) =>
    Object.prototype.hasOwnProperty.call(elementTreeEditDrafts, key) ? elementTreeEditDrafts[key] : fallback;
Object.assign(__appScope, { elementTreeDraftValue });
const updateElementTreeDraft = createUpdateElementTreeDraft(__appScope); Object.assign(__appScope, { updateElementTreeDraft });
const clearElementTreeDraft = createClearElementTreeDraft(__appScope); Object.assign(__appScope, { clearElementTreeDraft });
const elementTreeCommittedDraftValue = createElementTreeCommittedDraftValue(__appScope); Object.assign(__appScope, { elementTreeCommittedDraftValue });
const commitElementTreeInputOnEnter = createCommitElementTreeInputOnEnter(__appScope); Object.assign(__appScope, { commitElementTreeInputOnEnter });
useEffect(createAppHookCallback32(__appScope), [elementTreeEditDrafts, graphStore.elementTreeRevision, nodeById]);
useEffect(createAppHookCallback33(__appScope), [selectedEdgeId]);
const markBusTerminalSyncDirty = createMarkBusTerminalSyncDirty(__appScope); Object.assign(__appScope, { markBusTerminalSyncDirty });
const busNodeIdsFromEdges = createBusNodeIdsFromEdges(__appScope); Object.assign(__appScope, { busNodeIdsFromEdges });
const markBusTerminalSyncDirtyForEdges = createMarkBusTerminalSyncDirtyForEdges(__appScope); Object.assign(__appScope, { markBusTerminalSyncDirtyForEdges });
const busTerminalSyncNodeIdsForGraphPatch = createBusTerminalSyncNodeIdsForGraphPatch(__appScope); Object.assign(__appScope, { busTerminalSyncNodeIdsForGraphPatch });
const synchronizePendingBusTerminalsWithGraphStore = createSynchronizePendingBusTerminalsWithGraphStore(__appScope); Object.assign(__appScope, { synchronizePendingBusTerminalsWithGraphStore });
useEffect(createAppHookCallback34(__appScope), [busNodeIdSet, connectSource, dragging, graphStore.edgeEndpointRevision, manualPathDrag, rewiring, terminalPress?.moved]);
useEffect(createAppHookCallback35(__appScope), [elementTree, graphTreePanelActive]);
useEffect(createAppHookCallback36(__appScope), [elementTree, graphTreePanelActive, selectedElementTreeItemKey]);
useLayoutEffect(createAppHookCallback37(__appScope), [collapsedElementTreeDeviceGroups, collapsedElementTreeGroups, elementTreeItemLimits, graphTreePanelActive, selectedElementTreeItemKey]);
useEffect(createAppHookCallback38(__appScope), [inspectorTopologyErrors.length]);
useEffect(createAppHookCallback39(__appScope), [inspectorTopologyErrors.length]);
// 图元树虚拟化：按实际 item 高度算 N，窗口含缓冲区，rAF 节流滚动
useEffect(() => {
  if (!graphTreePanelActive || elementTreeSearchNeedle) {
    return;
  }
  const container = document.querySelector(".element-tree");
  if (!container) {
    return;
  }
  // 实测每 group 紧凑 item 高度：取该组 item 高度的下四分位（P25），
  // 避免少数展开 child 列表的特高 item 拉偏 spacer 估算
  const measureGroupItemHeight = (groupEl: HTMLElement): number => {
    const samples = groupEl.querySelectorAll<HTMLElement>(":scope > .element-tree-item");
    const heights: number[] = [];
    samples.forEach((el) => {
      if (el.offsetHeight > 0) heights.push(el.offsetHeight);
    });
    if (heights.length === 0) return 32;
    heights.sort((a, b) => a - b);
    // P25：偏紧凑，多数无 child 的 item 高度
    const idx = Math.max(0, Math.floor(heights.length * 0.25));
    return heights[idx] + 2; // +gap
  };
  // 典型紧凑 item 高度（无 child 列表），用于算 N/WINDOW/STEP
  const measureTypicalItemHeight = (): number => {
    const all = container.querySelectorAll<HTMLElement>(".element-tree-item");
    const heights: number[] = [];
    all.forEach((el) => {
      if (el.offsetHeight > 0) heights.push(el.offsetHeight);
    });
    if (heights.length === 0) return 32;
    heights.sort((a, b) => a - b);
    // 取下四分位作为典型紧凑高度
    const idx = Math.max(0, Math.floor(heights.length * 0.25));
    return heights[idx] + 2;
  };
  const typicalH = measureTypicalItemHeight();
  const viewportHeight = container.clientHeight || 600;
  // N = 可视范围能容纳的 item 数（基于典型紧凑高度）
  const N = Math.max(8, Math.floor(viewportHeight / typicalH));
  // 窗口 = 视口N + 前后各0.75N缓冲，保证滑动时视口内不增删
  const BUFFER = Math.ceil(0.75 * N);
  const WINDOW = N + 2 * BUFFER;
  // 滑动阈值：可视区进入缓冲区 0.4N 时移窗，步长 0.5N（小步减少单次增删量）
  const STEP = Math.max(4, Math.floor(0.5 * N));

  let rafId: number | null = null;
  let pending = false;
  const scheduleUpdate = () => {
    if (pending) {
      return;
    }
    pending = true;
    rafId = window.requestAnimationFrame(() => {
      pending = false;
      updateWindows();
    });
  };

  const updateWindows = () => {
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const viewTop = scrollTop;
    const viewBottom = scrollTop + viewportHeight;
    // 先收集本轮各 group 实测高度
    const groupHeights: Record<string, number> = {};
    container.querySelectorAll<HTMLElement>(".element-tree-device-items").forEach((groupEl) => {
      const deviceKey = groupEl.dataset.deviceKey;
      if (deviceKey) groupHeights[deviceKey] = measureGroupItemHeight(groupEl);
    });
    if (Object.keys(groupHeights).length > 0) {
      setElementTreeItemHeights((current) => {
        let changed = false;
        const next = { ...current };
        for (const [key, h] of Object.entries(groupHeights)) {
          if (current[key] !== h) {
            next[key] = h;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }
    setElementTreeItemWindows((current) => {
      let changed = false;
      const next: Record<string, { start: number; end: number }> = { ...current };
      const groups = container.querySelectorAll<HTMLElement>(".element-tree-device-items");
      groups.forEach((groupEl) => {
        const deviceKey = groupEl.dataset.deviceKey;
        const total = Number(groupEl.dataset.totalItems ?? 0);
        if (!deviceKey || total <= WINDOW) {
          if (next[deviceKey]) {
            delete next[deviceKey];
            changed = true;
          }
          return;
        }
        const groupRect = groupEl.getBoundingClientRect();
        const groupTop = groupRect.top - containerRect.top + scrollTop;
        // 用该 group 实测高度（而非全局），保证 spacer/索引对齐
        const itemH = groupHeights[deviceKey] ?? 32;
        const cur = next[deviceKey] ?? { start: 0, end: Math.min(total, WINDOW) };
        // 视口对应 item 索引：直接用像素算，不依赖 spacer（避免 spacer 失真→索引算偏→循环）
        const visibleTopInGroup = viewTop - groupTop;
        const visibleBottomInGroup = viewBottom - groupTop;
        const firstVisibleIndex = Math.floor(visibleTopInGroup / itemH);
        const lastVisibleIndex = Math.ceil(visibleBottomInGroup / itemH);
        // 视口像素驱动：窗口中心对齐视口中心，保证视口内始终有真实 item
        // 仅当视口索引移出当前窗口"安全区"（留 buffer 个 item 缓冲）时才移窗
        const safeStart = cur.start + Math.floor(0.25 * WINDOW);
        const safeEnd = cur.end - Math.floor(0.25 * WINDOW);
        let newStart = cur.start;
        let newEnd = cur.end;
        if (firstVisibleIndex < safeStart || lastVisibleIndex > safeEnd) {
          const center = Math.floor((firstVisibleIndex + lastVisibleIndex) / 2);
          let targetStart = center - Math.floor(WINDOW / 2);
          targetStart = clampNumber(targetStart, 0, total - WINDOW);
          if (total <= WINDOW) targetStart = 0;
          newStart = targetStart;
          newEnd = Math.min(total, newStart + WINDOW);
        }
        if (newStart !== cur.start || newEnd !== cur.end) {
          next[deviceKey] = { start: newStart, end: newEnd };
          changed = true;
        }
      });
      return changed ? next : current;
    });
  };
  updateWindows();
  container.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  return () => {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
    container.removeEventListener("scroll", scheduleUpdate);
    window.removeEventListener("resize", scheduleUpdate);
  };
}, [graphTreePanelActive, elementTreeSearchNeedle, elementTree, collapsedElementTreeGroups, collapsedElementTreeDeviceGroups]);
const canvasBounds = useMemo<CanvasBounds>(() => ({ width: canvasWidth, height: canvasHeight }), [canvasHeight, canvasWidth]); Object.assign(__appScope, { canvasBounds });
const canvasFullViewBox = useMemo<CanvasViewBox>(() => canvasFullViewBoxFromBounds(canvasBounds), [canvasBounds]); Object.assign(__appScope, { canvasFullViewBox });
const canvasRenderBounds = canvasBounds; Object.assign(__appScope, { canvasRenderBounds });
const canvasRenderViewBox = viewBox; Object.assign(__appScope, { canvasRenderViewBox });
const canvasScrollScale = canvasScrollScaleFromViewBox(canvasRenderViewBox, canvasRenderBounds); Object.assign(__appScope, { canvasScrollScale });
const canvasDisplayWidth = Math.max(1, Math.round(canvasRenderBounds.width * canvasScrollScale.x)); Object.assign(__appScope, { canvasDisplayWidth });
const canvasDisplayHeight = Math.max(1, Math.round(canvasRenderBounds.height * canvasScrollScale.y)); Object.assign(__appScope, { canvasDisplayHeight });
const computedCanvasHorizontalScrollbarsActive =
    canvasFrameViewportSize.width > 0 &&
    canvasDisplayWidth + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.width + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
Object.assign(__appScope, { computedCanvasHorizontalScrollbarsActive });
const computedCanvasVerticalScrollbarsActive =
    canvasFrameViewportSize.height > 0 &&
    canvasDisplayHeight + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.height + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
Object.assign(__appScope, { computedCanvasVerticalScrollbarsActive });
const canvasResizeKeepsHorizontalScrollRange = canvasResizeKeepsScrollRange(canvasResizeDrag, "x"); Object.assign(__appScope, { canvasResizeKeepsHorizontalScrollRange });
const canvasResizeKeepsVerticalScrollRange = canvasResizeKeepsScrollRange(canvasResizeDrag, "y"); Object.assign(__appScope, { canvasResizeKeepsVerticalScrollRange });
const canvasHorizontalScrollbarsActive = computedCanvasHorizontalScrollbarsActive || canvasResizeKeepsHorizontalScrollRange; Object.assign(__appScope, { canvasHorizontalScrollbarsActive });
const canvasVerticalScrollbarsActive = computedCanvasVerticalScrollbarsActive || canvasResizeKeepsVerticalScrollRange; Object.assign(__appScope, { canvasVerticalScrollbarsActive });
const canvasScrollbarsActive =
    canvasFrameViewportSize.width > 0 &&
    canvasFrameViewportSize.height > 0 &&
    (canvasHorizontalScrollbarsActive || canvasVerticalScrollbarsActive);
Object.assign(__appScope, { canvasScrollbarsActive });
const computedCanvasScrollSurfaceWidth = canvasScrollSurfaceSize(
    canvasDisplayWidth,
    canvasFrameViewportSize.width,
    canvasHorizontalScrollbarsActive
  );
Object.assign(__appScope, { computedCanvasScrollSurfaceWidth });
const computedCanvasScrollSurfaceHeight = canvasScrollSurfaceSize(
    canvasDisplayHeight,
    canvasFrameViewportSize.height,
    canvasVerticalScrollbarsActive
  );
Object.assign(__appScope, { computedCanvasScrollSurfaceHeight });
const canvasScrollSurfaceWidth =
    canvasResizeKeepsHorizontalScrollRange && canvasResizeDrag
      ? Math.max(computedCanvasScrollSurfaceWidth, canvasResizeDrag.startScrollSurfaceWidth)
      : computedCanvasScrollSurfaceWidth;
Object.assign(__appScope, { canvasScrollSurfaceWidth });
const canvasScrollSurfaceHeight =
    canvasResizeKeepsVerticalScrollRange && canvasResizeDrag
      ? Math.max(computedCanvasScrollSurfaceHeight, canvasResizeDrag.startScrollSurfaceHeight)
      : computedCanvasScrollSurfaceHeight;
Object.assign(__appScope, { canvasScrollSurfaceHeight });
const canvasBaseDisplayOffsetX = canvasDisplayOffset(
    canvasDisplayWidth,
    canvasScrollSurfaceWidth,
    canvasFrameViewportSize.width,
    canvasHorizontalScrollbarsActive
  );
Object.assign(__appScope, { canvasBaseDisplayOffsetX });
const canvasBaseDisplayOffsetY = canvasDisplayOffset(
    canvasDisplayHeight,
    canvasScrollSurfaceHeight,
    canvasFrameViewportSize.height,
    canvasVerticalScrollbarsActive
  );
Object.assign(__appScope, { canvasBaseDisplayOffsetY });
const clampedCanvasNoScrollOffset = {
    x: clampCanvasNoScrollOffset(
      canvasNoScrollOffset.x,
      canvasDisplayWidth,
      canvasFrameViewportSize.width,
      canvasBaseDisplayOffsetX,
      canvasHorizontalScrollbarsActive
    ),
    y: clampCanvasNoScrollOffset(
      canvasNoScrollOffset.y,
      canvasDisplayHeight,
      canvasFrameViewportSize.height,
      canvasBaseDisplayOffsetY,
      canvasVerticalScrollbarsActive
    )
  };
Object.assign(__appScope, { clampedCanvasNoScrollOffset });
const canvasDisplayOffsetX = canvasResizeAnchoredDisplayOffset(
    Math.round(canvasBaseDisplayOffsetX + clampedCanvasNoScrollOffset.x),
    canvasResizeDrag,
    "x",
    canvasDisplayWidth
  );
Object.assign(__appScope, { canvasDisplayOffsetX });
const canvasDisplayOffsetY = canvasResizeAnchoredDisplayOffset(
    Math.round(canvasBaseDisplayOffsetY + clampedCanvasNoScrollOffset.y),
    canvasResizeDrag,
    "y",
    canvasDisplayHeight
  );
Object.assign(__appScope, { canvasDisplayOffsetY });
const canvasResizeHotzoneWidth = Math.round(clampNumber(CANVAS_RESIZE_HANDLE_SIZE * canvasScrollScale.x, 10, 28)); Object.assign(__appScope, { canvasResizeHotzoneWidth });
const canvasResizeHotzoneHeight = Math.round(clampNumber(CANVAS_RESIZE_HANDLE_SIZE * canvasScrollScale.y, 10, 28)); Object.assign(__appScope, { canvasResizeHotzoneHeight });
const canvasResizeHotzoneStyle = {
    left: canvasDisplayOffsetX,
    top: canvasDisplayOffsetY,
    width: canvasDisplayWidth,
    height: canvasDisplayHeight,
    "--canvas-resize-hotzone-x": `${canvasResizeHotzoneWidth}px`,
    "--canvas-resize-hotzone-y": `${canvasResizeHotzoneHeight}px`
  } as CSSProperties;
Object.assign(__appScope, { canvasResizeHotzoneStyle });
const canvasResizePreviewRect = canvasResizeDrag && canvasResizeDraft
    ? canvasResizePreviewRectForDraft(canvasResizeDrag, canvasResizeDraft)
    : null;
Object.assign(__appScope, { canvasResizePreviewRect });
const canvasBoundsRef = useRef<CanvasBounds>(canvasBounds); Object.assign(__appScope, { canvasBoundsRef });
const canvasFullViewBoxRef = useRef<CanvasViewBox>(canvasFullViewBox); Object.assign(__appScope, { canvasFullViewBoxRef });
const canvasScrollScaleRef = useRef(canvasScrollScale); Object.assign(__appScope, { canvasScrollScaleRef });
const canvasNoScrollOffsetRef = useRef(clampedCanvasNoScrollOffset); Object.assign(__appScope, { canvasNoScrollOffsetRef });
const canvasScrollbarsActiveRef = useRef(canvasScrollbarsActive); Object.assign(__appScope, { canvasScrollbarsActiveRef });
const canvasHorizontalScrollbarsActiveRef = useRef(canvasHorizontalScrollbarsActive); Object.assign(__appScope, { canvasHorizontalScrollbarsActiveRef });
const canvasVerticalScrollbarsActiveRef = useRef(canvasVerticalScrollbarsActive); Object.assign(__appScope, { canvasVerticalScrollbarsActiveRef });
const canvasVisibleViewBoxRef = useRef<CanvasViewBox>(canvasVisibleViewBox); Object.assign(__appScope, { canvasVisibleViewBoxRef });
const skipNextCanvasScrollSyncRef = useRef(false); Object.assign(__appScope, { skipNextCanvasScrollSyncRef });
const canvasFrameUserScrollRef = useRef(false); Object.assign(__appScope, { canvasFrameUserScrollRef });
const canvasFrameProgrammaticScrollRef = useRef(false); Object.assign(__appScope, { canvasFrameProgrammaticScrollRef });
const canvasBoundsScrollSyncPendingRef = useRef(false); Object.assign(__appScope, { canvasBoundsScrollSyncPendingRef });
const canvasBoundsScrollSyncPendingFrameRef = useRef<number | null>(null); Object.assign(__appScope, { canvasBoundsScrollSyncPendingFrameRef });
const pendingCanvasBoundsScrollAnchorRef = useRef<CanvasBoundsScrollAnchor | null>(null); Object.assign(__appScope, { pendingCanvasBoundsScrollAnchorRef });
const pendingWheelZoomAnchorRef = useRef<WheelZoomAnchor | null>(null); Object.assign(__appScope, { pendingWheelZoomAnchorRef });
const pendingWheelZoomRequestRef = useRef<PendingWheelZoomRequest | null>(null); Object.assign(__appScope, { pendingWheelZoomRequestRef });
const wheelZoomFrameRef = useRef<number | null>(null); Object.assign(__appScope, { wheelZoomFrameRef });
const pendingCanvasResizeCommitAnchorRef = useRef<CanvasResizeCommitAnchor | null>(null); Object.assign(__appScope, { pendingCanvasResizeCommitAnchorRef });
canvasBoundsRef.current = canvasBounds;
canvasFullViewBoxRef.current = canvasFullViewBox;
canvasScrollScaleRef.current = canvasScrollScale;
canvasNoScrollOffsetRef.current = pendingCanvasNoScrollOffsetRef.current ?? clampedCanvasNoScrollOffset;
canvasScrollbarsActiveRef.current = canvasScrollbarsActive;
canvasHorizontalScrollbarsActiveRef.current = canvasHorizontalScrollbarsActive;
canvasVerticalScrollbarsActiveRef.current = canvasVerticalScrollbarsActive;
canvasVisibleViewBoxRef.current = canvasVisibleViewBox;
const applyCanvasPanningVisualOffset = createApplyCanvasPanningVisualOffset(__appScope); Object.assign(__appScope, { applyCanvasPanningVisualOffset });
const clampCanvasBounds = (bounds: CanvasBounds): CanvasBounds => ({
    width: clampCanvasDimension(bounds.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth),
    height: clampCanvasDimension(bounds.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight)
  });
Object.assign(__appScope, { clampCanvasBounds });
const cancelCanvasBoundsScrollSyncPendingRelease = createCancelCanvasBoundsScrollSyncPendingRelease(__appScope); Object.assign(__appScope, { cancelCanvasBoundsScrollSyncPendingRelease });
const clearCanvasBoundsScrollSyncPending = createClearCanvasBoundsScrollSyncPending(__appScope); Object.assign(__appScope, { clearCanvasBoundsScrollSyncPending });
const releaseCanvasBoundsScrollSyncPending = createReleaseCanvasBoundsScrollSyncPending(__appScope); Object.assign(__appScope, { releaseCanvasBoundsScrollSyncPending });
const markCanvasBoundsScrollSyncPending = createMarkCanvasBoundsScrollSyncPending(__appScope); Object.assign(__appScope, { markCanvasBoundsScrollSyncPending });
const canvasBoundsForGraphContent = createCanvasBoundsForGraphContent(__appScope); Object.assign(__appScope, { canvasBoundsForGraphContent });
const minimumCanvasBoundsForContent = (
    contentNodes: ModelNode[] = nodes,
    contentEdges: Edge[] = edges,
    contentRoutes: RoutedEdge[] = routedEdges,
    padding = MOVE_BOUNDARY_GUARD
  ) =>
    canvasBoundsForGraphContent(
      { width: MIN_CANVAS_WIDTH, height: MIN_CANVAS_HEIGHT },
      contentNodes,
      contentEdges,
      contentRoutes,
      padding
    );
Object.assign(__appScope, { minimumCanvasBoundsForContent });
const applyCanvasBounds = createApplyCanvasBounds(__appScope); Object.assign(__appScope, { applyCanvasBounds });
const edgeRoutesForGeometryBounds = (edgeList: Edge[]): Pick<RoutedEdge, "points">[] =>
    edgeList.flatMap((edge) => {
      const points = [
        edge.sourcePoint,
        ...(edge.manualPoints ?? []),
        edge.targetPoint
      ].filter((point): point is Point => Boolean(point));
      return points.length > 0 ? [{ points }] : [];
    });
Object.assign(__appScope, { edgeRoutesForGeometryBounds });
const autoCanvasExpansionBlockedMessage = "当前模型未允许自动扩界，请先人工调整画布边界。"; Object.assign(__appScope, { autoCanvasExpansionBlockedMessage });
const graphContentFitsFixedCanvasBounds = (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = [],
    bounds = canvasBounds
  ) =>
    modelGeometryInsideCanvasBounds(contentNodes, [...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)], bounds, 0);
Object.assign(__appScope, { graphContentFitsFixedCanvasBounds });
const rejectAutoCanvasExpansionForContent = createRejectAutoCanvasExpansionForContent(__appScope); Object.assign(__appScope, { rejectAutoCanvasExpansionForContent });
const canvasBoundsForAutoExpandedGraphContent = createCanvasBoundsForAutoExpandedGraphContent(__appScope); Object.assign(__appScope, { canvasBoundsForAutoExpandedGraphContent });
const expandCanvasToFitGraph = (
    contentNodes: ModelNode[] = nodes,
    contentEdges: Edge[] = edges,
    contentRoutes: RoutedEdge[] = routedEdges,
    padding = CANVAS_AUTO_EXPAND_PADDING,
    baseBounds = canvasBounds
  ) => applyCanvasBounds(canvasBoundsForAutoExpandedGraphContent(baseBounds, contentNodes, contentEdges, contentRoutes, padding));
Object.assign(__appScope, { expandCanvasToFitGraph });
const hasCanvasOriginShift = (shift: Point) => shift.x !== 0 || shift.y !== 0; Object.assign(__appScope, { hasCanvasOriginShift });
const translatePointBy = (point: Point, shift: Point): Point => ({
    x: Math.round(point.x + shift.x),
    y: Math.round(point.y + shift.y)
  });
Object.assign(__appScope, { translatePointBy });
const translateOptionalPointBy = (point: Point | undefined, shift: Point) =>
    point ? translatePointBy(point, shift) : undefined;
Object.assign(__appScope, { translateOptionalPointBy });
const translateRoutePathBy = (path: string, shift: Point): string =>
    hasCanvasOriginShift(shift)
      ? path.replace(/([MLQ])\s*([^MLQ]+)/g, (_match, command: string, coordinates: string) => {
          const shiftedCoordinates = coordinates
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((value, index) => {
              const parsed = Number(value);
              if (!Number.isFinite(parsed)) {
                return value;
              }
              return String(Math.round(parsed + (index % 2 === 0 ? shift.x : shift.y)));
            });
          return `${command} ${shiftedCoordinates.join(" ")}`;
        })
      : path;
Object.assign(__appScope, { translateRoutePathBy });
const translateNodeBy = (node: ModelNode, shift: Point): ModelNode =>
    hasCanvasOriginShift(shift)
      ? { ...node, position: translatePointBy(node.position, shift) }
      : node;
Object.assign(__appScope, { translateNodeBy });
const translateEdgeBy = (edge: Edge, shift: Point): Edge =>
    hasCanvasOriginShift(shift)
      ? {
          ...edge,
          sourcePoint: translateOptionalPointBy(edge.sourcePoint, shift),
          targetPoint: translateOptionalPointBy(edge.targetPoint, shift),
          manualPoints: edge.manualPoints?.map((point) => translatePointBy(point, shift)),
          routePoints: edge.routePoints?.map((point) => translatePointBy(point, shift))
        }
      : edge;
Object.assign(__appScope, { translateEdgeBy });
const translateStoredEdgeGeometryBy = createTranslateStoredEdgeGeometryBy(__appScope); Object.assign(__appScope, { translateStoredEdgeGeometryBy });
const translateRouteBy = (route: RoutedEdge, shift: Point): RoutedEdge =>
    hasCanvasOriginShift(shift)
      ? (() => {
          const shiftedPoints = route.points.map((point) => translatePointBy(point, shift));
          return {
            ...route,
            points: shiftedPoints,
            path: route.path ? translateRoutePathBy(route.path, shift) : pointsToPreviewPath(shiftedPoints)
          };
        })()
      : route;
Object.assign(__appScope, { translateRouteBy });
const shiftCachedRoutesForCanvasOrigin = createShiftCachedRoutesForCanvasOrigin(__appScope); Object.assign(__appScope, { shiftCachedRoutesForCanvasOrigin });
const leftTopCanvasOriginShiftForContent = createLeftTopCanvasOriginShiftForContent(__appScope); Object.assign(__appScope, { leftTopCanvasOriginShiftForContent });
const minimumCanvasBoundsForResizeEdge = createMinimumCanvasBoundsForResizeEdge(__appScope); Object.assign(__appScope, { minimumCanvasBoundsForResizeEdge });
const canvasBoundsWithOriginShift = (baseBounds: CanvasBounds, originShift: Point): CanvasBounds => ({
    width: baseBounds.width + originShift.x,
    height: baseBounds.height + originShift.y
  });
Object.assign(__appScope, { canvasBoundsWithOriginShift });
const clampNodePositionToExpandableBounds = createClampNodePositionToExpandableBounds(__appScope); Object.assign(__appScope, { clampNodePositionToExpandableBounds });
const clampPointToExpandableBounds = createClampPointToExpandableBounds(__appScope); Object.assign(__appScope, { clampPointToExpandableBounds });
const clampEdgeGeometryToExpandableBounds = createClampEdgeGeometryToExpandableBounds(__appScope); Object.assign(__appScope, { clampEdgeGeometryToExpandableBounds });
const clampCanvasNoScrollOffsetPoint = (offset: Point): Point => ({
    x: clampCanvasNoScrollOffset(
      offset.x,
      canvasDisplayWidth,
      canvasFrameViewportSize.width,
      canvasBaseDisplayOffsetX,
      canvasHorizontalScrollbarsActive
    ),
    y: clampCanvasNoScrollOffset(
      offset.y,
      canvasDisplayHeight,
      canvasFrameViewportSize.height,
      canvasBaseDisplayOffsetY,
      canvasVerticalScrollbarsActive
    )
  });
Object.assign(__appScope, { clampCanvasNoScrollOffsetPoint });
const canvasNoScrollOffsetForCanvasResizeAnchor = createCanvasNoScrollOffsetForCanvasResizeAnchor(__appScope); Object.assign(__appScope, { canvasNoScrollOffsetForCanvasResizeAnchor });
const setCanvasFrameScrollPosition = createSetCanvasFrameScrollPosition(__appScope); Object.assign(__appScope, { setCanvasFrameScrollPosition });
const centerCanvasFrameScrollPosition = createCenterCanvasFrameScrollPosition(__appScope); Object.assign(__appScope, { centerCanvasFrameScrollPosition });
const syncCanvasFrameScrollToViewBox = createSyncCanvasFrameScrollToViewBox(__appScope); Object.assign(__appScope, { syncCanvasFrameScrollToViewBox });
const syncCanvasFrameScrollToCanvasResizeCommitAnchor = createSyncCanvasFrameScrollToCanvasResizeCommitAnchor(__appScope); Object.assign(__appScope, { syncCanvasFrameScrollToCanvasResizeCommitAnchor });
const syncCanvasFrameScrollToWheelAnchor = createSyncCanvasFrameScrollToWheelAnchor(__appScope); Object.assign(__appScope, { syncCanvasFrameScrollToWheelAnchor });
const currentViewBoxFromCanvasFrameScroll = createCurrentViewBoxFromCanvasFrameScroll(__appScope); Object.assign(__appScope, { currentViewBoxFromCanvasFrameScroll });
const scheduleCanvasVisibleViewBoxUpdate = createScheduleCanvasVisibleViewBoxUpdate(__appScope); Object.assign(__appScope, { scheduleCanvasVisibleViewBoxUpdate });
const handleCanvasFrameScroll = createHandleCanvasFrameScroll(__appScope); Object.assign(__appScope, { handleCanvasFrameScroll });
const updateCanvasFrameViewportSize = createUpdateCanvasFrameViewportSize(__appScope); Object.assign(__appScope, { updateCanvasFrameViewportSize });
const updateCanvasFrameViewportAndVisibleBox = createUpdateCanvasFrameViewportAndVisibleBox(__appScope); Object.assign(__appScope, { updateCanvasFrameViewportAndVisibleBox });
useEffect(createAppHookCallback40(__appScope), [
    canvasBaseDisplayOffsetX,
    canvasBaseDisplayOffsetY,
    canvasDisplayHeight,
    canvasDisplayWidth,
    canvasFrameViewportSize.height,
    canvasFrameViewportSize.width,
    canvasHorizontalScrollbarsActive,
    canvasVerticalScrollbarsActive
  ]);
const leftPanelVisible = isSidePanelVisible(leftPanelMode, leftPanelAutoVisible); Object.assign(__appScope, { leftPanelVisible });
const rightPanelVisible = isSidePanelVisible(rightPanelMode, rightPanelAutoVisible); Object.assign(__appScope, { rightPanelVisible });
useEffect(createAppHookCallback41(__appScope), [leftPanelVisible]);
const nodeImage = createNodeImage(__appScope); Object.assign(__appScope, { nodeImage });
const nodeForegroundImage = (node: ModelNode) => resolveNodeForegroundImage(node, imageAssets); Object.assign(__appScope, { nodeForegroundImage });
const nodeHasUprightBoundsContent = (
    node: ModelNode,
    imageHref = nodeImage(node),
    foregroundImageHref = nodeForegroundImage(node)
  ) => !isBusNode(node) && Boolean(imageHref || foregroundImageHref || node.kind === "static-text" || node.kind === "static-image");
Object.assign(__appScope, { nodeHasUprightBoundsContent });
const renderNodePreviewImageContent = createRenderNodePreviewImageContent(__appScope); Object.assign(__appScope, { renderNodePreviewImageContent });
const buildNodePreviewImageMarkup = createBuildNodePreviewImageMarkup(__appScope); Object.assign(__appScope, { buildNodePreviewImageMarkup });
const canvasBackgroundImageUrl = resolveProjectImage(
    { canvasBackgroundImage, canvasBackgroundImageAssetId },
    imageAssets
  );
Object.assign(__appScope, { canvasBackgroundImageUrl });
useEffect(createAppHookCallback42(__appScope), [canvasDisplayHeight, canvasDisplayWidth, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth]);
useLayoutEffect(createAppHookCallback43(__appScope), [canvasBounds, canvasFrameViewportSize.height, canvasFrameViewportSize.width, canvasFullViewBox]);
useLayoutEffect(createAppHookCallback44(__appScope), [
    canvasDisplayHeight,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasDisplayWidth,
    canvasFrameViewportSize.height,
    canvasFrameViewportSize.width,
    canvasScrollSurfaceHeight,
    canvasScrollSurfaceWidth,
    viewBox.x,
    viewBox.y,
    viewBox.width,
    viewBox.height
  ]);
useEffect(createAppHookCallback45(__appScope), []);
useEffect(createAppHookCallback46(__appScope), [canvasHeight, canvasWidth]);
const buildConnectPreviewPath = createBuildConnectPreviewPath(__appScope); Object.assign(__appScope, { buildConnectPreviewPath });
const connectPreviewColor = useMemo(createAppHookCallback47(__appScope), [colorDisplayMode, colorPalette, connectSource, visibleNodeById]);
Object.assign(__appScope, { connectPreviewColor });
const routableLineTemplateTerminalType = (template: DeviceTemplate): TerminalType =>
    template.terminalTypes?.[0] ?? template.terminalType;
Object.assign(__appScope, { routableLineTemplateTerminalType });
const connectTargetTerminalType = (target: ConnectTarget): TerminalType | undefined =>
    isBusNode(target.node)
      ? getBusTerminalType(target.node)
      : target.node.terminals.find((terminal) => terminal.id === target.terminalId)?.type;
Object.assign(__appScope, { connectTargetTerminalType });
const connectTargetPoint = (target: ConnectTarget): Point =>
    target.point ?? getTerminalPoint(target.node, target.terminalId);
Object.assign(__appScope, { connectTargetPoint });
const buildRoutableLinePreviewPath = createBuildRoutableLinePreviewPath(__appScope); Object.assign(__appScope, { buildRoutableLinePreviewPath });
const routableLinePlacementColor = useMemo(createAppHookCallback48(__appScope), [colorPalette, routableLinePlacement]);
Object.assign(__appScope, { routableLinePlacementColor });
const routableLineEndpointDragColor = useMemo(createAppHookCallback49(__appScope), [colorPalette, nodeById, routableLineEndpointDrag]);
Object.assign(__appScope, { routableLineEndpointDragColor });
useEffect(createAppHookCallback50(__appScope), [connectSource, dragging, hasUnsavedChanges, manualPathDrag, rewiring, routableLineEndpointDrag, routableLinePlacement, routeRenderingReady, terminalPress?.moved]);
const routeInputLayerSignature = useMemo(
    () => layers.map((layer) => `${layer.id}:${layer.visible !== false ? "1" : "0"}`).join("|"),
    [layers]
  );
Object.assign(__appScope, { routeInputLayerSignature });
const routeInput = useMemo(createAppHookCallback51(__appScope), [graphStore.routeGeometryRevision, routeInputLayerSignature, visibleEdges, visibleNodes]);
Object.assign(__appScope, { routeInput });
const routingNodes = routeInput.nodes; Object.assign(__appScope, { routingNodes });
const routingEdges = routeInput.edges; Object.assign(__appScope, { routingEdges });
const affectedRoutingEdgeIds = useMemo(createAppHookCallback52(__appScope), []);
Object.assign(__appScope, { affectedRoutingEdgeIds });
const routeRenderingEnabled = routeRenderingReady; Object.assign(__appScope, { routeRenderingEnabled });
const patchStoredRouteStoreForEdgeIds = createPatchStoredRouteStoreForEdgeIds(__appScope); Object.assign(__appScope, { patchStoredRouteStoreForEdgeIds });
const routedRouteState = useMemo(createAppHookCallback53(__appScope), [affectedRoutingEdgeIds, canvasBounds, isEditMode, routeInput.edges, routeInput.nodes, routeRenderingEnabled, routingEdges, routingNodes]);
const routedEdges = routedRouteState.routes; Object.assign(__appScope, { routedEdges });
const routedEdgeStore = useMemo(
    () => routedRouteState.store ?? routeStoreSetRoutes(cachedRouteStoreRef.current, routedEdges),
    [routedEdges, routedRouteState]
  );
Object.assign(__appScope, { routedEdgeStore });
const routedEdgeSpatialIndex = routedEdgeStore.routeSpatialIndex; Object.assign(__appScope, { routedEdgeSpatialIndex });
const routedEdgeById = routedEdgeStore.routeMap; Object.assign(__appScope, { routedEdgeById });
const routedEdgeIndexById = routedEdgeStore.routeIndexById; Object.assign(__appScope, { routedEdgeIndexById });
const committedRouteDirtyGeneration = routeDirtyGenerationRef.current; Object.assign(__appScope, { committedRouteDirtyGeneration });
useEffect(createAppHookCallback54(__appScope), [committedRouteDirtyGeneration, routedEdgeStore, routedEdges]);
const renderViewportBounds = useMemo(() => expandViewBoxForRendering(canvasVisibleViewBox), [canvasVisibleViewBox]); Object.assign(__appScope, { renderViewportBounds });
const viewportQueryBounds = useMemo(createAppHookCallback55(__appScope), [renderViewportBounds]);
const deferredViewportQueryBounds = useDeferredValue(viewportQueryBounds); Object.assign(__appScope, { deferredViewportQueryBounds });
const viewportProjectKey = `${activeSchemeKey}:${activeProjectKey}`; Object.assign(__appScope, { viewportProjectKey });
const deferredViewportProjectKey = useDeferredValue(viewportProjectKey); Object.assign(__appScope, { deferredViewportProjectKey });
const effectiveViewportQueryBounds = deferredViewportProjectKey === viewportProjectKey
    ? deferredViewportQueryBounds
    : viewportQueryBounds;
Object.assign(__appScope, { effectiveViewportQueryBounds });
const routeRenderOrder = (first: RoutedEdge, second: RoutedEdge) =>
    (routedEdgeIndexById.get(first.edgeId) ?? Number.MAX_SAFE_INTEGER) -
    (routedEdgeIndexById.get(second.edgeId) ?? Number.MAX_SAFE_INTEGER);
Object.assign(__appScope, { routeRenderOrder });
const viewportRoutedEdges = useMemo(createAppHookCallback56(__appScope), [activeSelectedEdgeSet, effectiveViewportQueryBounds, displaySelectedEdgeKey, routedEdgeById, routedEdgeIndexById, routedEdgeSpatialIndex, routedEdgeStore]);
Object.assign(__appScope, { viewportRoutedEdges });
const viewportNodes = useMemo(createAppHookCallback57(__appScope), [connectSource?.nodeId, effectiveViewportQueryBounds, displaySelectedEdgeKey, displaySelectedNodeKey, draggingNodeIdSet, draggingNodeKey, edgeById, graphStore.nodeIndexById, routedEdgeStore, selectedNodeIdSet, viewportRoutedEdges, visibleNodeById, visibleNodeIdSet, visibleNodeSpatialIndex]);
Object.assign(__appScope, { viewportNodes });
const activeLayerRoutedEdges = useMemo(
    () => activeLayerEdges === visibleEdges ? routedEdges : (() => {
      const routes: RoutedEdge[] = [];
      activeLayerEdgeIdSet.forEach((edgeId) => {
        const route = routedEdgeById.get(edgeId);
        if (route) {
          routes.push(route);
        }
      });
      return routes.sort(routeRenderOrder);
    })(),
    [activeLayerEdgeIdSet, activeLayerEdges, routedEdgeById, routedEdgeIndexById, routedEdges, visibleEdges]
  );
Object.assign(__appScope, { activeLayerRoutedEdges });
const transformableActiveSelectedNodeIds = useMemo(
    () => activeSelectedNodeIds.filter((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && isCanvasNodeMovable(node.kind);
    }),
    [activeSelectedNodeIds, nodeById]
  );
Object.assign(__appScope, { transformableActiveSelectedNodeIds });
const selectedLayoutUnits = useMemo(
    createAppHookCallback58(__appScope),
    [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, editHotInteractionActive, isEditMode, routedEdges, transformableActiveSelectedNodeIds]
  );
Object.assign(__appScope, { selectedLayoutUnits });
const selectedGroupLayoutUnits = useMemo(
    () => selectedLayoutUnits.length === 0 ? EMPTY_CANVAS_LAYOUT_UNITS : selectedLayoutUnits.filter((unit) => unit.kind === "group"),
    [selectedLayoutUnits]
  );
Object.assign(__appScope, { selectedGroupLayoutUnits });
const visibleSelectedGroupLayoutUnits = focusedGroupedNodeMovesGroup ? [] : selectedGroupLayoutUnits; Object.assign(__appScope, { visibleSelectedGroupLayoutUnits });
const selectedTransformGroupUnit =
    canvasSelectionScope === "group" && selectedLayoutUnits.length === 1 && selectedGroupLayoutUnits.length === 1
      ? selectedGroupLayoutUnits[0]
      : null;
Object.assign(__appScope, { selectedTransformGroupUnit });
const selectedLayoutUnitCount = selectedLayoutUnits.length; Object.assign(__appScope, { selectedLayoutUnitCount });
const markRouteEdgesDirty = createMarkRouteEdgesDirty(__appScope); Object.assign(__appScope, { markRouteEdgesDirty });
const markStoredRouteEdgesDirty = createMarkStoredRouteEdgesDirty(__appScope); Object.assign(__appScope, { markStoredRouteEdgesDirty });
const edgeListsHaveSameOrder = createEdgeListsHaveSameOrder(__appScope); Object.assign(__appScope, { edgeListsHaveSameOrder });
const edgeReferenceDiffIds = createEdgeReferenceDiffIds(__appScope); Object.assign(__appScope, { edgeReferenceDiffIds });
const dirtyEdgeIdsAfterMove = createDirtyEdgeIdsAfterMove(__appScope); Object.assign(__appScope, { dirtyEdgeIdsAfterMove });
const dirtyEdgeIdsForMovedLocalRoutes = createDirtyEdgeIdsForMovedLocalRoutes(__appScope); Object.assign(__appScope, { dirtyEdgeIdsForMovedLocalRoutes });
const dirtyEdgeIdsAfterBulkMove = createDirtyEdgeIdsAfterBulkMove(__appScope); Object.assign(__appScope, { dirtyEdgeIdsAfterBulkMove });
const logBulkMoveCommitStats = createLogBulkMoveCommitStats(__appScope); Object.assign(__appScope, { logBulkMoveCommitStats });
const buildMovedNodeUpdates = createBuildMovedNodeUpdates(__appScope); Object.assign(__appScope, { buildMovedNodeUpdates });
const nextNodesForMovedGraphCommit = createNextNodesForMovedGraphCommit(__appScope); Object.assign(__appScope, { nextNodesForMovedGraphCommit });
const edgePatchFromCandidateEdges = createEdgePatchFromCandidateEdges(__appScope); Object.assign(__appScope, { edgePatchFromCandidateEdges });
const graphStorePatchStillCurrent = createGraphStorePatchStillCurrent(__appScope); Object.assign(__appScope, { graphStorePatchStillCurrent });
const shouldRunSynchronousMoveBlockerRepair = createShouldRunSynchronousMoveBlockerRepair(__appScope); Object.assign(__appScope, { shouldRunSynchronousMoveBlockerRepair });
const markGraphDirtyForInteractiveCommit = createMarkGraphDirtyForInteractiveCommit(__appScope); Object.assign(__appScope, { markGraphDirtyForInteractiveCommit });
const patchSingleTerminalAnchorFromPoint = createPatchSingleTerminalAnchorFromPoint(__appScope); Object.assign(__appScope, { patchSingleTerminalAnchorFromPoint });
const rebuildEdgeUpdatesAfterNodeGeometryChange = createRebuildEdgeUpdatesAfterNodeGeometryChange(__appScope); Object.assign(__appScope, { rebuildEdgeUpdatesAfterNodeGeometryChange });
const rebuildEdgesAfterNodeGeometryChange = createRebuildEdgesAfterNodeGeometryChange(__appScope); Object.assign(__appScope, { rebuildEdgesAfterNodeGeometryChange });
const selectedRoutedEdge = selectedEdge ? routedEdgeById.get(selectedEdge.id) : undefined; Object.assign(__appScope, { selectedRoutedEdge });
const routableLineEndpointHandles = useMemo(createAppHookCallback59(__appScope), [activeLayerNodeIdSet, activeSelectedNodeIds, isEditMode, routableLineEndpointDrag, visibleNodeById]);
Object.assign(__appScope, { routableLineEndpointHandles });
const sameStoredRouteEndpointPoint = (first?: Point, second?: Point) =>
    (!first && !second) || (Boolean(first && second) && first?.x === second?.x && first?.y === second?.y);
Object.assign(__appScope, { sameStoredRouteEndpointPoint });
const storedRouteEndpointMatchPoint = createStoredRouteEndpointMatchPoint(__appScope); Object.assign(__appScope, { storedRouteEndpointMatchPoint });
const endpointMatchedRoutePointsForEdge = createEndpointMatchedRoutePointsForEdge(__appScope); Object.assign(__appScope, { endpointMatchedRoutePointsForEdge });
const endpointMatchedStoredRoutePoints = (edge: Edge | undefined) =>
    endpointMatchedRoutePointsForEdge(edge, edge?.routePoints);
Object.assign(__appScope, { endpointMatchedStoredRoutePoints });
const edgeWithFrozenBusEndpointPoints = createEdgeWithFrozenBusEndpointPoints(__appScope); Object.assign(__appScope, { edgeWithFrozenBusEndpointPoints });
const previewStoredRoutePointsForEdge = createPreviewStoredRoutePointsForEdge(__appScope); Object.assign(__appScope, { previewStoredRoutePointsForEdge });
const rewiringPreviewRoute = useMemo(createAppHookCallback60(__appScope), [canvasBounds, edgeById, nodeById, previewStoredRoutePointsForEdge, routedEdgeById, rewiring]);
Object.assign(__appScope, { rewiringPreviewRoute });
const routableLineEndpointDragPreviewRoute = useMemo(createAppHookCallback61(__appScope), [canvasBounds, nodeById, nodes, routableLineEndpointDrag]);
Object.assign(__appScope, { routableLineEndpointDragPreviewRoute });
const manualPathPreviewRoute = useMemo(createAppHookCallback62(__appScope), [manualPathDrag]);
Object.assign(__appScope, { manualPathPreviewRoute });
const selectedRoutableLineManualPathRoute = useMemo(createAppHookCallback63(__appScope), [activeLayerNodeIdSet, isEditMode, manualPathPreviewRoute, selectedNode, selectedNodeCount]);
Object.assign(__appScope, { selectedRoutableLineManualPathRoute });
const terminalPressPreviewEdgeRoutes = useMemo(createAppHookCallback64(__appScope), [canvasBounds, nodeById, previewStoredRoutePointsForEdge, terminalPress, visibleEdgesByTerminalRef, visibleNodes]);
Object.assign(__appScope, { terminalPressPreviewEdgeRoutes });
const terminalPressPreviewEdgeIdSet = useMemo(
    () => new Set(terminalPressPreviewEdgeRoutes.map((route) => route.edgeId)),
    [terminalPressPreviewEdgeRoutes]
  );
Object.assign(__appScope, { terminalPressPreviewEdgeIdSet });
const draggingCommitDelta = dragging?.currentDelta; Object.assign(__appScope, { draggingCommitDelta });
const draggingDelta = dragging?.previewDelta ?? draggingCommitDelta; Object.assign(__appScope, { draggingDelta });
const multiNodeDragging = Boolean(dragging && isMultiNodeMoveState(dragging)); Object.assign(__appScope, { multiNodeDragging });
const singleNodeDragging = Boolean(dragging && !isMultiNodeMoveState(dragging)); Object.assign(__appScope, { singleNodeDragging });
const dragAffectedEdgeIdSet = useMemo(
    () => new Set((dragging?.affectedEdges ?? []).map((edge) => edge.id)),
    [dragging?.affectedEdges]
  );
Object.assign(__appScope, { dragAffectedEdgeIdSet });
const dragOverlayEdgeIdSet = useMemo(
    () => new Set((dragging?.overlayPreview?.edgeRoutes ?? []).map((route) => route.edgeId)),
    [dragging?.overlayPreview]
  );
Object.assign(__appScope, { dragOverlayEdgeIdSet });
const dragPreviewMovedNodeById = useMemo(createAppHookCallback65(__appScope), [dragging, draggingDelta, nodeById]);
Object.assign(__appScope, { dragPreviewMovedNodeById });
const dragPreviewNodeFor = (nodeId: string) => dragPreviewMovedNodeById.get(nodeId) ?? nodeById.get(nodeId); Object.assign(__appScope, { dragPreviewNodeFor });
const dragInteractionBounds = useMemo<RenderViewportBounds | null>(createAppHookCallback66(__appScope), [dragPreviewMovedNodeById, dragging, draggingDelta, draggingNodeIdSet, nodeById]);
Object.assign(__appScope, { dragInteractionBounds });
const candidateNodeIntersectsInteractionBounds = (node: ModelNode) =>
    !dragInteractionBounds || nodeIntersectsRenderViewport(node, dragInteractionBounds);
Object.assign(__appScope, { candidateNodeIntersectsInteractionBounds });
const dragInteractionNodes = useMemo(createAppHookCallback67(__appScope), [dragInteractionBounds, dragPreviewMovedNodeById, dragging, draggingDelta, nodeById, visibleNodeIdSet, visibleNodeSpatialIndex, visibleNodes]);
const suppressDragTerminalInteraction = Boolean(dragging && draggingDelta && isMultiNodeMoveState(dragging)); Object.assign(__appScope, { suppressDragTerminalInteraction });
const staticTerminalOverlapDeferred =
    isEditMode &&
    !dragging &&
    !connectSource &&
    !routableLinePlacement &&
    !routableLineEndpointDrag &&
    !terminalPress?.moved &&
    viewportNodes.length > TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD;
Object.assign(__appScope, { staticTerminalOverlapDeferred });
const staticTerminalOverlapSourceKey = staticTerminalOverlapDeferred
    ? `${viewportBoundsCacheKey(deferredViewportQueryBounds)}:${elementTreeLayerSignature}:${graphStore.routeGeometryRevision}:${graphStore.edgeEndpointRevision}:${viewportNodes.length}`
    : "";
Object.assign(__appScope, { staticTerminalOverlapSourceKey });
const staticTerminalOverlapReady =
    !staticTerminalOverlapDeferred || staticTerminalOverlapReadyKey === staticTerminalOverlapSourceKey; Object.assign(__appScope, { staticTerminalOverlapReady });
useEffect(createAppHookCallback68(__appScope), [staticTerminalOverlapDeferred, staticTerminalOverlapSourceKey]);
const terminalOverlapCalculationReady =
    Boolean(dragging && draggingDelta && !suppressDragTerminalInteraction) || staticTerminalOverlapReady; Object.assign(__appScope, { terminalOverlapCalculationReady });
const terminalOverlapNodes =
    dragging && draggingDelta && !suppressDragTerminalInteraction
      ? dragInteractionNodes
      : terminalOverlapCalculationReady
        ? viewportNodes
        : [];
Object.assign(__appScope, { terminalOverlapNodes });
const terminalOverlapAffectedNodeIds = dragging && draggingDelta && !suppressDragTerminalInteraction ? draggingNodeIdSet : undefined; Object.assign(__appScope, { terminalOverlapAffectedNodeIds });
const overlappedTerminalKeys = useMemo(
    createAppHookCallback69(__appScope),
    [isReadonlyCanvasMode, suppressDragTerminalInteraction, terminalOverlapAffectedNodeIds, terminalOverlapCalculationReady, terminalOverlapNodes]
  );
Object.assign(__appScope, { overlappedTerminalKeys });
const nodeTerminalSnapTarget = useMemo(
    () => (
      !isReadonlyCanvasMode && dragging && draggingDelta && !isMultiNodeMoveState(dragging)
        ? findNodeTerminalSnapTarget(dragInteractionNodes, draggingNodeIdSet) ??
          findNodeBusSnapTarget(dragInteractionNodes, draggingNodeIdSet)
        : null
    ),
    [dragInteractionNodes, dragging, draggingDelta, draggingNodeIdSet, isReadonlyCanvasMode]
  );
Object.assign(__appScope, { nodeTerminalSnapTarget });
if (!imperativeSingleNodeDragActiveRef.current) {
    nodeTerminalSnapTargetRef.current = nodeTerminalSnapTarget;
  }
const nodeTerminalSnapHintStyle = useMemo(createAppHookCallback70(__appScope), [colorPalette, dragPreviewMovedNodeById, nodeById, nodeTerminalSnapTarget]);
const activeDropHintPoint =
    routableLineEndpointDrag?.dropTargetPoint ??
    routableLinePreview.targetPoint ??
    rewiring?.dropTargetPoint ??
    nodeTerminalSnapTarget?.point ??
    null;
Object.assign(__appScope, { activeDropHintPoint });
const activeDropReady =
    connectDropReady ||
    Boolean(routableLinePreview.targetPoint) ||
    Boolean(routableLineEndpointDrag?.dropTargetPoint) ||
    Boolean(rewiring?.dropTargetPoint) ||
    Boolean(nodeTerminalSnapTarget);
Object.assign(__appScope, { activeDropReady });
const connectSourceNode = isEditMode && connectSource ? visibleNodeById.get(connectSource.nodeId) : undefined; Object.assign(__appScope, { connectSourceNode });
const connectTerminalCompatibilityActive = isEditMode && mode === "connect" && Boolean(connectSourceNode); Object.assign(__appScope, { connectTerminalCompatibilityActive });
const routableLineActiveTerminalType =
    routableLinePlacement
      ? routableLineTemplateTerminalType(routableLinePlacement.template)
      : routableLineEndpointDrag
        ? nodeById.get(routableLineEndpointDrag.nodeId)?.terminals[routableLineEndpointDrag.endpoint === "source" ? 0 : 1]?.type ??
          nodeById.get(routableLineEndpointDrag.nodeId)?.terminals[0]?.type
        : undefined;
Object.assign(__appScope, { routableLineActiveTerminalType });
const routableLineTerminalCompatibilityActive = isEditMode && Boolean(routableLinePlacement || routableLineEndpointDrag); Object.assign(__appScope, { routableLineTerminalCompatibilityActive });
const drawingModeActive = Boolean(libraryPlacement || staticDrawing || connectSource || routableLinePlacement); Object.assign(__appScope, { drawingModeActive });
const activeDropHintStyle = rewiring?.dropTargetPoint
    ? connectionLineStyle(rewiring.edgeId)
    : routableLinePlacementColor || routableLineEndpointDragColor
      ? ({ "--connection-color": routableLinePlacementColor || routableLineEndpointDragColor } as CSSProperties)
      : nodeTerminalSnapHintStyle;
Object.assign(__appScope, { activeDropHintStyle });
useEffect(createAppHookCallback71(__appScope), [activeDropReady, drawingModeActive]);
const groupTransformPreviewTransform = useMemo(
    () => transformDrag && isGroupTransformDrag(transformDrag) ? groupTransformSvgTransform(transformDrag, transformDrag.previewPoint) : "",
    [transformDrag]
  );
Object.assign(__appScope, { groupTransformPreviewTransform });
const groupTransformPreviewGroupId =
    transformDrag && isGroupTransformDrag(transformDrag) && groupTransformPreviewTransform
      ? `group:${transformDrag.groupId}`
      : "";
Object.assign(__appScope, { groupTransformPreviewGroupId });
const groupTransformPreviewNodeIdSet = useMemo(
    () => new Set(transformDrag && isGroupTransformDrag(transformDrag) && groupTransformPreviewTransform ? transformDrag.nodeIds : []),
    [groupTransformPreviewTransform, transformDrag]
  );
Object.assign(__appScope, { groupTransformPreviewNodeIdSet });
const groupTransformPreviewEdgeRoutes = useMemo(createAppHookCallback72(__appScope), [transformDrag, visibleEdgeIdSet]);
Object.assign(__appScope, { groupTransformPreviewEdgeRoutes });
const groupTransformPreviewEdgeIdSet = useMemo(
    () => new Set(groupTransformPreviewEdgeRoutes.map((route) => route.edgeId)),
    [groupTransformPreviewEdgeRoutes]
  );
Object.assign(__appScope, { groupTransformPreviewEdgeIdSet });
const groupTransformPreviewRoutableLineNodeIdSet = useMemo(createAppHookCallback73(__appScope), [routableLineNodeIdsByEndpointNodeId, transformDrag]);
Object.assign(__appScope, { groupTransformPreviewRoutableLineNodeIdSet });
const dragPreviewEdgeRoutes = useMemo(createAppHookCallback74(__appScope), [canvasBounds, colorDisplayMode, colorPalette, dragging, draggingDelta, nodeById, routableLineNodeIdsByEndpointNodeId, visibleEdgeIdSet, visibleNodeIdSet]);
Object.assign(__appScope, { dragPreviewEdgeRoutes });
const dragPreviewEdgeIdSet = useMemo(
    () => new Set(dragPreviewEdgeRoutes.map((route) => route.edgeId)),
    [dragPreviewEdgeRoutes]
  );
Object.assign(__appScope, { dragPreviewEdgeIdSet });
const dragGhostEdgeRoutes = useMemo(createAppHookCallback75(__appScope), [dragging, draggingDelta, draggingNodeIdSet, nodeById, visibleEdgeIdSet]);
Object.assign(__appScope, { dragGhostEdgeRoutes });
const dragGhostEdgeIdSet = useMemo(
    () => new Set(dragGhostEdgeRoutes.map((route) => route.edgeId)),
    [dragGhostEdgeRoutes]
  );
Object.assign(__appScope, { dragGhostEdgeIdSet });
const dragGhostRoutableLineNodeIdSet = useMemo(
    () => new Set(dragGhostEdgeRoutes.flatMap((route) => route.routableLineNodeId ? [route.routableLineNodeId] : [])),
    [dragGhostEdgeRoutes]
  );
Object.assign(__appScope, { dragGhostRoutableLineNodeIdSet });
useEffect(createAppHookCallback76(__appScope), [containerParamViewId, selectedContainerParameterViews]);
const clearLocalSchemeModelCache = createClearLocalSchemeModelCache(__appScope); Object.assign(__appScope, { clearLocalSchemeModelCache });
const rememberPersistedSchemesPayload = createRememberPersistedSchemesPayload(__appScope); Object.assign(__appScope, { rememberPersistedSchemesPayload });
const refreshSchemesFromBackendDirectory = createRefreshSchemesFromBackendDirectory(__appScope); Object.assign(__appScope, { refreshSchemesFromBackendDirectory });
const handleBackendSchemeMutationFailure = createHandleBackendSchemeMutationFailure(__appScope); Object.assign(__appScope, { handleBackendSchemeMutationFailure });
const saveSchemeTreeToBackend = createSaveSchemeTreeToBackend(__appScope); Object.assign(__appScope, { saveSchemeTreeToBackend });
const persistSchemeTreeToBackend = createPersistSchemeTreeToBackend(__appScope); Object.assign(__appScope, { persistSchemeTreeToBackend });
const replaceSchemeTreeInBackend = createReplaceSchemeTreeInBackend(__appScope); Object.assign(__appScope, { replaceSchemeTreeInBackend });
useEffect(createAppHookCallback77(__appScope), []);
useEffect(createAppHookCallback78(__appScope), []);
useEffect(createAppHookCallback79(__appScope), []);
useEffect(createAppHookCallback80(__appScope), []);
useEffect(createAppHookCallback81(__appScope), [schemes]);
useEffect(createAppHookCallback82(__appScope), [customDeviceTemplates, customAttributeLibraries, customComponentTypes, deviceDefinitionOverrides, customGraphTemplateTypes, customGraphTemplates]);
useEffect(createAppHookCallback83(__appScope), [colorDisplayMode, colorPalette]);
const refreshImageFolders = () =>
    fetchBackendImageFolders()
      .then((folders) => {
        setImageFolders(folders.length > 0 ? folders : [{ id: "root", name: "默认文件夹", imageCount: 0 }]);
      })
      .catch(() => {
        // 后端不可用时保留当前文件夹状态。
      });
Object.assign(__appScope, { refreshImageFolders });
const refreshImagesForFolder = (folderId = activeImageFolderId) =>
    fetchBackendImages(folderId)
      .then((assets) => {
        const mergedAssets = mergeBuiltinSharedIconAssets(assets);
        setImageAssetList(mergedAssets);
        setImageAssets((current) => ({ ...current, ...imageAssetsToMap(mergedAssets) }));
      })
      .catch(() => {
        // 后端不可用时保留浏览器本地图片，避免影响画布编辑。
      });
Object.assign(__appScope, { refreshImagesForFolder });
const deleteImageAssetFromContextMenu = () => {
    const menu = imageAssetContextMenu;
    if (!menu) {
      return;
    }
    const asset = imageAssetList.find((item) => item.id === menu.assetId);
    const assetName = asset?.name || asset?.filename || menu.assetId;
    if (!window.confirm(`确定删除“${assetName}”吗？如果该图片已被图元引用，删除后对应图元可能无法继续显示该图片。`)) {
      setImageAssetContextMenu(null);
      return;
    }
    void (async () => {
      try {
        await deleteBackendImageAsset(menu.assetId);
        setImageAssetList((current) => current.filter((item) => item.id !== menu.assetId));
        setImageAssets((current) => {
          if (!(menu.assetId in current)) {
            return current;
          }
          const next = { ...current };
          delete next[menu.assetId];
          return next;
        });
        setImageAssetContextMenu(null);
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "删除图片资源失败。");
      }
    })();
  };
Object.assign(__appScope, { deleteImageAssetFromContextMenu });
useEffect(createAppHookCallback84(__appScope), [activeImageFolderId, imageTarget]);
const iconLibraryPickerOpen = imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "catalogOnly";
Object.assign(__appScope, { iconLibraryPickerOpen });
useEffect(() => {
  if (!iconLibraryPickerOpen) {
    return;
  }
  setIconLibraryPicker((current) => ({
    ...current,
    selectedLibraryId: current.catalog?.libraries?.some((library) => library.id === current.selectedLibraryId)
      ? current.selectedLibraryId
      : current.catalog?.libraries?.[0]?.id ?? current.selectedLibraryId,
    selectedCategoryKey: "",
    searchQuery: "",
    visibleCount: ICON_LIBRARY_PAGE_SIZE
  }));
}, [iconLibraryPickerOpen]);
useEffect(() => {
  if (!iconLibraryPickerOpen || iconLibraryPicker.catalog) {
    return;
  }
  let cancelled = false;
  setIconLibraryPicker((current) => ({
    ...current,
    status: "loading",
    error: ""
  }));
  void fetchIconLibraryCatalog()
    .then((catalog) => {
      if (cancelled) {
        return;
      }
      const selectedLibraryId = catalog.libraries.some((library) => library.id === iconLibraryPicker.selectedLibraryId)
        ? iconLibraryPicker.selectedLibraryId
        : catalog.libraries[0]?.id ?? "";
      setIconLibraryPicker((current) => ({
        ...current,
        status: "ready",
        error: "",
        catalog,
        selectedLibraryId,
        selectedCategoryKey: "",
        visibleCount: ICON_LIBRARY_PAGE_SIZE
      }));
    })
    .catch((error) => {
      if (cancelled) {
        return;
      }
      setIconLibraryPicker((current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "读取分类图标库失败。"
      }));
    });
  return () => {
    cancelled = true;
  };
}, [iconLibraryPicker.catalog, iconLibraryPicker.selectedLibraryId, iconLibraryPickerOpen]);
useEffect(() => {
  const catalog = iconLibraryPicker.catalog;
  if (!iconLibraryPickerOpen || !catalog) {
    return;
  }
  const requestedLibraryIds = iconLibraryPicker.selectedLibraryId
    ? [iconLibraryPicker.selectedLibraryId]
    : catalog.libraries.map((library) => library.id);
  const loadedIds = new Set(iconLibraryPicker.loadedLibraryIds);
  const loadingIds = new Set(iconLibraryPicker.loadingLibraryIds);
  const missingLibraries = requestedLibraryIds
    .map((libraryId) => catalog.libraries.find((library) => library.id === libraryId))
    .filter((library): library is NonNullable<typeof library> => Boolean(library && !loadedIds.has(library.id) && !loadingIds.has(library.id)));
  if (missingLibraries.length === 0) {
    return;
  }
  const missingIds = missingLibraries.map((library) => library.id);
  setIconLibraryPicker((current) => ({
    ...current,
    status: "loading",
    error: "",
    loadingLibraryIds: Array.from(new Set([...current.loadingLibraryIds, ...missingIds]))
  }));
  void Promise.all(
    missingLibraries.map(async (library) => ({
      library,
      icons: flattenIconLibraryManifest(await fetchIconLibraryManifest(library), library)
    }))
  )
    .then((loadedGroups) => {
      setIconLibraryPicker((current) => {
        const nextEntriesById = new Map(current.entries.map((entry) => [entry.id, entry] as const));
        for (const group of loadedGroups) {
          for (const icon of group.icons) {
            nextEntriesById.set(icon.id, icon);
          }
        }
        const loadedIdSet = new Set(current.loadedLibraryIds);
        for (const group of loadedGroups) {
          loadedIdSet.add(group.library.id);
        }
        const loadingIdSet = new Set(current.loadingLibraryIds);
        for (const id of missingIds) {
          loadingIdSet.delete(id);
        }
        return {
          ...current,
          status: "ready",
          error: "",
          entries: Array.from(nextEntriesById.values()),
          loadedLibraryIds: Array.from(loadedIdSet),
          loadingLibraryIds: Array.from(loadingIdSet)
        };
      });
    })
    .catch((error) => {
      setIconLibraryPicker((current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "读取分类图标清单失败。",
        loadingLibraryIds: current.loadingLibraryIds.filter((id) => !missingIds.includes(id))
      }));
    });
}, [
  iconLibraryPicker.catalog,
  iconLibraryPicker.loadedLibraryIds,
  iconLibraryPicker.loadingLibraryIds,
  iconLibraryPicker.selectedLibraryId,
  iconLibraryPickerOpen
]);
useEffect(createAppHookCallback85(__appScope), [activeProjectKey, activeSchemeKey, schemes]);
useEffect(createAppHookCallback86(__appScope), [activeSchemeKey, schemes, selectedSchemeId]);
useEffect(createAppHookCallback87(__appScope), []);
useEffect(createAppHookCallback88(__appScope), []);
useEffect(createAppHookCallback89(__appScope), []);
useEffect(createAppHookCallback90(__appScope), [contextMenu]);
useEffect(createAppHookCallback91(__appScope), []);
const persistRefreshRecoveryNow = createPersistRefreshRecoveryNow(__appScope); Object.assign(__appScope, { persistRefreshRecoveryNow });
useEffect(createAppHookCallback92(__appScope), [saveRequired]);
useEffect(createAppHookCallback93(__appScope), [hasUnsavedChanges]);
useEffect(createAppHookCallback94(__appScope), [connectDropReady]);
useEffect(createAppHookCallback95(__appScope));
useEffect(createAppHookCallback96(__appScope), [dragging]);
useEffect(() => () => {
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
    pendingNodeDragMoveRef.current = null;
  }, []);
const clearRecordSelection = createClearRecordSelection(__appScope); Object.assign(__appScope, { clearRecordSelection });
const blurLayerManagementDropdownFocus = createBlurLayerManagementDropdownFocus(__appScope); Object.assign(__appScope, { blurLayerManagementDropdownFocus });
const selectSingleScheme = createSelectSingleScheme(__appScope); Object.assign(__appScope, { selectSingleScheme });
const selectSingleProject = createSelectSingleProject(__appScope); Object.assign(__appScope, { selectSingleProject });
const toggleSchemeSelection = createToggleSchemeSelection(__appScope); Object.assign(__appScope, { toggleSchemeSelection });
const toggleProjectSelection = createToggleProjectSelection(__appScope); Object.assign(__appScope, { toggleProjectSelection });
const cloneProjectState = (deepModelSnapshot = false, graphPatchScope?: UndoGraphPatchScope): UndoSnapshot => ({
    graphSnapshotMode: deepModelSnapshot ? "deep" : "reference",
    graphPatchScope: deepModelSnapshot ? undefined : graphPatchScope,
    projectName,
    layers: layers.map((layer) => ({ ...layer })),
    activeLayerId,
    canvasWidth,
    canvasHeight,
    allowAutoExpandCanvas,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    backgroundProjectId,
    backgroundLayerIds: [...backgroundLayerIds],
    powerUnit,
    voltageUnit,
    currentUnit,
    powerBaseValue,
    deviceIndexCounters: { ...deviceIndexCounters },
    nodes: deepModelSnapshot ? cloneNodesForUndo(nodes) : nodes,
    edges: deepModelSnapshot ? cloneEdgesForUndo(edges) : edges,
    groups: deepModelSnapshot ? cloneGroupsForUndo(groups) : groups,
    measurements: deepModelSnapshot
      ? normalizeProjectMeasurements(projectMeasurements, nodes)
      : projectMeasurements,
    topologyErrors: deepModelSnapshot ? cloneTopologyErrorsForUndo(topologyErrors) : topologyErrors,
    topology: deepModelSnapshot ? cloneTopologyForUndo(topology) : topology,
    topologyStatus: { ...topologyStatus }
  });
Object.assign(__appScope, { cloneProjectState });
const fullUndoGraphDirtyEdgeIds = (store: GraphStore, snapshot: UndoSnapshot) =>
    new Set([
      ...store.edges.map((edge) => edge.id),
      ...snapshot.edges.map((edge) => edge.id)
    ]);
Object.assign(__appScope, { fullUndoGraphDirtyEdgeIds });
const undoGraphSnapshotPatchPlan = createUndoGraphSnapshotPatchPlan(__appScope); Object.assign(__appScope, { undoGraphSnapshotPatchPlan });
const applyUndoGraphSnapshot = createApplyUndoGraphSnapshot(__appScope); Object.assign(__appScope, { applyUndoGraphSnapshot });
const pushUndoSnapshot = createPushUndoSnapshot(__appScope); Object.assign(__appScope, { pushUndoSnapshot });
const uniqueUndoScopeIds = createUniqueUndoScopeIds(__appScope); Object.assign(__appScope, { uniqueUndoScopeIds });
const undoScopeForGraphPatch = (
    nodeIds: Iterable<string | undefined> = [],
    edgeIds: Iterable<string | undefined> = []
  ): UndoGraphPatchScope => ({
    nodeIds: uniqueUndoScopeIds(nodeIds),
    edgeIds: uniqueUndoScopeIds(edgeIds)
  });
Object.assign(__appScope, { undoScopeForGraphPatch });
const undoScopeForDraggingState = (dragState: DraggingState | null | undefined): UndoGraphPatchScope | undefined =>
    dragState
      ? undoScopeForGraphPatch(
          dragState.nodeIds,
          [
            ...dragState.edgeIds,
            ...dragState.affectedEdges.map((edge) => edge.id)
          ]
        )
      : undefined;
Object.assign(__appScope, { undoScopeForDraggingState });
const pushNodeOnlyUndoSnapshot = createPushNodeOnlyUndoSnapshot(__appScope); Object.assign(__appScope, { pushNodeOnlyUndoSnapshot });
const syncExistingNodesWithTemplateDefinitions = createSyncExistingNodesWithTemplateDefinitions(__appScope); Object.assign(__appScope, { syncExistingNodesWithTemplateDefinitions });
const updateMeasurementConfig = createUpdateMeasurementConfig(__appScope); Object.assign(__appScope, { updateMeasurementConfig });
const prepareMeasurementConfigDraft = createPrepareMeasurementConfigDraft(__appScope); Object.assign(__appScope, { prepareMeasurementConfigDraft });
const openMeasurementConfigDialog = createOpenMeasurementConfigDialog(__appScope); Object.assign(__appScope, { openMeasurementConfigDialog });
const closeMeasurementConfigDialog = createCloseMeasurementConfigDialog(__appScope); Object.assign(__appScope, { closeMeasurementConfigDialog });
const flushMeasurementConfigDialogDraftInputs = createFlushMeasurementConfigDialogDraftInputs(__appScope); Object.assign(__appScope, { flushMeasurementConfigDialogDraftInputs });
const saveMeasurementConfigDialog = createSaveMeasurementConfigDialog(__appScope); Object.assign(__appScope, { saveMeasurementConfigDialog });
const updateMeasurementType = createUpdateMeasurementType(__appScope); Object.assign(__appScope, { updateMeasurementType });
const addMeasurementType = createAddMeasurementType(__appScope); Object.assign(__appScope, { addMeasurementType });
const deleteMeasurementType = createDeleteMeasurementType(__appScope); Object.assign(__appScope, { deleteMeasurementType });
const setMeasurementProfileItems = createSetMeasurementProfileItems(__appScope); Object.assign(__appScope, { setMeasurementProfileItems });
const createMeasurementProfileItem = createCreateMeasurementProfileItem(__appScope); Object.assign(__appScope, { createMeasurementProfileItem });
const addMeasurementProfileItem = createAddMeasurementProfileItem(__appScope); Object.assign(__appScope, { addMeasurementProfileItem });
const updateMeasurementProfileItem = createUpdateMeasurementProfileItem(__appScope); Object.assign(__appScope, { updateMeasurementProfileItem });
const deleteMeasurementProfileItem = createDeleteMeasurementProfileItem(__appScope); Object.assign(__appScope, { deleteMeasurementProfileItem });
const moveMeasurementProfileItem = createMoveMeasurementProfileItem(__appScope); Object.assign(__appScope, { moveMeasurementProfileItem });
const updateProjectMeasurementsWithUndo = createUpdateProjectMeasurementsWithUndo(__appScope); Object.assign(__appScope, { updateProjectMeasurementsWithUndo });
const addDefaultMeasurementsToNode = createAddDefaultMeasurementsToNode(__appScope); Object.assign(__appScope, { addDefaultMeasurementsToNode });
const removeMeasurementsFromNode = createRemoveMeasurementsFromNode(__appScope); Object.assign(__appScope, { removeMeasurementsFromNode });
const measurementGroupShellOffsetForNode = createMeasurementGroupShellOffsetForNode(__appScope); Object.assign(__appScope, { measurementGroupShellOffsetForNode });
const createMeasurementGroupShellForNode = (node: ModelNode, terminalId?: string): MeasurementGroup => ({
    id: terminalId ? `measurement-${node.id}-${terminalId}` : `measurement-${node.id}`,
    nodeId: node.id,
    terminalId,
    visible: true,
    labelVisible: true,
    unitVisible: true,
    backgroundColor: "#ffffff",
    borderColor: "#64748b",
    borderStyle: "solid",
    borderWidth: 1,
    anchor: "bottom",
    offset: measurementGroupShellOffsetForNode(node, terminalId),
    layout: "vertical",
    items: []
  });
Object.assign(__appScope, { createMeasurementGroupShellForNode });
const createMeasurementEditorGroupId = (nodeId: string, terminalId?: string) =>
    `measurement-${nodeId}${terminalId ? `-${terminalId}` : ""}-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
Object.assign(__appScope, { createMeasurementEditorGroupId });
const createMeasurementEditorGroupShellForNode = (node: ModelNode, terminalId?: string): MeasurementGroup => ({
    ...createMeasurementGroupShellForNode(node, terminalId),
    id: createMeasurementEditorGroupId(node.id, terminalId)
  });
Object.assign(__appScope, { createMeasurementEditorGroupShellForNode });
const measurementSourcePointForNodeItem = createMeasurementSourcePointForNodeItem(__appScope); Object.assign(__appScope, { measurementSourcePointForNodeItem });
const measurementProfileItemsForMeasurementGroup = (node: ModelNode, terminalId?: string) =>
    measurementProfileItemsForNodePosition(node, measurementConfig, terminalId);
Object.assign(__appScope, { measurementProfileItemsForMeasurementGroup });
const measurementTypeOptionsForMeasurementGroup = createMeasurementTypeOptionsForMeasurementGroup(__appScope); Object.assign(__appScope, { measurementTypeOptionsForMeasurementGroup });
const createMeasurementItemForNode = createCreateMeasurementItemForNode(__appScope); Object.assign(__appScope, { createMeasurementItemForNode });
const updateMeasurementGroupById = createUpdateMeasurementGroupById(__appScope); Object.assign(__appScope, { updateMeasurementGroupById });
const updateSelectedMeasurementGroup = createUpdateSelectedMeasurementGroup(__appScope); Object.assign(__appScope, { updateSelectedMeasurementGroup });
const updateSelectedMeasurementGroups = createUpdateSelectedMeasurementGroups(__appScope); Object.assign(__appScope, { updateSelectedMeasurementGroups });
const addMeasurementItemToGroup = createAddMeasurementItemToGroup(__appScope); Object.assign(__appScope, { addMeasurementItemToGroup });
const addMeasurementItemToNode = createAddMeasurementItemToNode(__appScope); Object.assign(__appScope, { addMeasurementItemToNode });
const updateMeasurementItem = createUpdateMeasurementItem(__appScope); Object.assign(__appScope, { updateMeasurementItem });
const removeMeasurementItem = createRemoveMeasurementItem(__appScope); Object.assign(__appScope, { removeMeasurementItem });
const applyMeasurementEditorGroupSettings = (group: MeasurementGroup, template: MeasurementGroup): MeasurementGroup => ({
    ...group,
    visible: template.visible,
    labelVisible: template.labelVisible,
    unitVisible: template.unitVisible,
    backgroundColor: template.backgroundColor,
    borderColor: template.borderColor,
    borderStyle: template.borderStyle,
    borderWidth: template.borderWidth,
    anchor: template.anchor,
    layout: template.layout,
    groupStyleOverride: template.groupStyleOverride ? { ...template.groupStyleOverride } : undefined
  });
Object.assign(__appScope, { applyMeasurementEditorGroupSettings });
const createMeasurementEditorGroupForPosition = createCreateMeasurementEditorGroupForPosition(__appScope); Object.assign(__appScope, { createMeasurementEditorGroupForPosition });
const updateMeasurementEditorGroupSettings = createUpdateMeasurementEditorGroupSettings(__appScope); Object.assign(__appScope, { updateMeasurementEditorGroupSettings });
const updateMeasurementEditorDraftItem = createUpdateMeasurementEditorDraftItem(__appScope); Object.assign(__appScope, { updateMeasurementEditorDraftItem });
const addMeasurementEditorDraftItem = createAddMeasurementEditorDraftItem(__appScope); Object.assign(__appScope, { addMeasurementEditorDraftItem });
const removeMeasurementEditorDraftItem = createRemoveMeasurementEditorDraftItem(__appScope); Object.assign(__appScope, { removeMeasurementEditorDraftItem });
const moveMeasurementEditorDraftItem = createMoveMeasurementEditorDraftItem(__appScope); Object.assign(__appScope, { moveMeasurementEditorDraftItem });
const updateMeasurementEditorDraftItemPosition = createUpdateMeasurementEditorDraftItemPosition(__appScope); Object.assign(__appScope, { updateMeasurementEditorDraftItemPosition });
const measurementEditorItemName = (item: MeasurementItemBinding) =>
    (item.name ?? measurementTypeById.get(item.measurementTypeId)?.name ?? item.measurementTypeId).trim();
Object.assign(__appScope, { measurementEditorItemName });
const duplicateMeasurementEditorItemNames = createDuplicateMeasurementEditorItemNames(__appScope); Object.assign(__appScope, { duplicateMeasurementEditorItemNames });
const confirmMeasurementEditorDialog = createConfirmMeasurementEditorDialog(__appScope); Object.assign(__appScope, { confirmMeasurementEditorDialog });
const renderSelectedNodeMeasurementTable = createRenderSelectedNodeMeasurementTable(__appScope); Object.assign(__appScope, { renderSelectedNodeMeasurementTable });
const beginMeasurementDrag = createBeginMeasurementDrag(__appScope); Object.assign(__appScope, { beginMeasurementDrag });
const updateMeasurementDrag = createUpdateMeasurementDrag(__appScope); Object.assign(__appScope, { updateMeasurementDrag });
const finishMeasurementDrag = createFinishMeasurementDrag(__appScope); Object.assign(__appScope, { finishMeasurementDrag });
const ensureDraggingUndoSnapshot = createEnsureDraggingUndoSnapshot(__appScope); Object.assign(__appScope, { ensureDraggingUndoSnapshot });
const requestCanvasFrameCenter = createRequestCanvasFrameCenter(__appScope); Object.assign(__appScope, { requestCanvasFrameCenter });
const undoLastOperation = createUndoLastOperation(__appScope); Object.assign(__appScope, { undoLastOperation });
useEffect(createAppHookCallback97(__appScope), [canvasBounds]);
useLayoutEffect(createAppHookCallback98(__appScope), [canvasCenterRequest]);
useEffect(createAppHookCallback99(__appScope), [projectPanelResize]);
useEffect(createAppHookCallback100(__appScope), [sidePanelResize]);
useEffect(createAppHookCallback101(__appScope), [canvasResizeDrag, canvasHeight, canvasWidth, edges, nodes, routedEdges]);
useEffect(createAppHookCallback102(__appScope), [statusbarResize]);
useEffect(createAppHookCallback103(__appScope), [topologyWarningPanelDrag, topologyWarningPanelHeight, topologyWarningPanelWidth]);
useEffect(createAppHookCallback104(__appScope), [topologyWarningPanelResize]);
useEffect(createAppHookCallback105(__appScope), [nodeDoubleClickDialogDrag]);
useEffect(createAppHookCallback106(__appScope), [nodeDoubleClickDialogResize]);
useEffect(createAppHookCallback107(__appScope), [deviceLibraryDialogDrag]);
useEffect(createAppHookCallback108(__appScope), [deviceLibraryDialogResize]);
const canvasPointerKeyboardShortcutAvailability = createCanvasPointerKeyboardShortcutAvailability(__appScope); Object.assign(__appScope, { canvasPointerKeyboardShortcutAvailability });
useEffect(createAppHookCallback109(__appScope), []);
useEffect(createAppHookCallback110(__appScope), [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, canvasBounds, canvasClipboard, canvasSelectionScope, connectSource, customDeviceDefinitionMode, customDeviceDialogOpen, customDeviceDraft, deviceIndexCounters, displaySelectedEdgeIds, displaySelectedNodeIds, edges, editingCustomDeviceKind, hasUnsavedChanges, hoveredAttributeLibraryComponentType, isEditMode, libraryPlacement, measurementConfigDraft, nodes, projectById, projectName, recordClipboard, routedEdgeById, saveRequired, schemes, selectedCustomComponentTemplate, selectedDefinitionKind, selectedDefinitionTemplate, selectedEdgeId, selectedEdgeIds, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, staticDrawing, topologyErrors, viewBox]);
useEffect(createAppHookCallback111(__appScope), [isBrowseMode, leftPanelTab]);
useEffect(createAppHookCallback112(__appScope), [leftPanelTab]);
useEffect(createAppHookCallback113(__appScope), [graphStore.topologyRevision, topologyStatus.state]);
useEffect(createAppHookCallback114(__appScope), [leftPanelMode]);
useEffect(createAppHookCallback115(__appScope), [rightPanelMode]);
useEffect(createAppHookCallback116(__appScope), [leftPanelWidth]);
useEffect(createAppHookCallback117(__appScope), [rightPanelWidth]);
useEffect(createAppHookCallback118(__appScope), [statusbarHeight]);
useEffect(createAppHookCallback119(__appScope), [topologyWarningPanelHeight]);
const routeForCurrentEdgeSave = createRouteForCurrentEdgeSave(__appScope); Object.assign(__appScope, { routeForCurrentEdgeSave });
const edgeWithCurrentRouteGeometryForSave = (edge: Edge): Edge =>
    edgeWithSavedRouteGeometry(edge, routeForCurrentEdgeSave(edge), nodeById.get(edge.sourceId), nodeById.get(edge.targetId));
Object.assign(__appScope, { edgeWithCurrentRouteGeometryForSave });
const currentProject = createCurrentProject(__appScope); Object.assign(__appScope, { currentProject });
const currentGraphDirtyBaseline = (): GraphDirtyBaseline => ({
    projectName,
    layers,
    activeLayerId,
    canvasWidth,
    canvasHeight,
    allowAutoExpandCanvas,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    backgroundProjectId,
    backgroundLayerIds,
    powerUnit,
    voltageUnit,
    currentUnit,
    powerBaseValue,
    deviceIndexCounters,
    nodes,
    edges,
    groups,
    measurements: projectMeasurements
  });
Object.assign(__appScope, { currentGraphDirtyBaseline });
const graphDirtyBaselineChanged = (previous: GraphDirtyBaseline, next: GraphDirtyBaseline) =>
    previous.projectName !== next.projectName ||
    previous.layers !== next.layers ||
    previous.activeLayerId !== next.activeLayerId ||
    previous.canvasWidth !== next.canvasWidth ||
    previous.canvasHeight !== next.canvasHeight ||
    previous.allowAutoExpandCanvas !== next.allowAutoExpandCanvas ||
    previous.canvasBackgroundColor !== next.canvasBackgroundColor ||
    previous.canvasBackgroundImage !== next.canvasBackgroundImage ||
    previous.canvasBackgroundImageAssetId !== next.canvasBackgroundImageAssetId ||
    previous.backgroundProjectId !== next.backgroundProjectId ||
    previous.backgroundLayerIds !== next.backgroundLayerIds ||
    previous.powerUnit !== next.powerUnit ||
    previous.voltageUnit !== next.voltageUnit ||
    previous.currentUnit !== next.currentUnit ||
    previous.powerBaseValue !== next.powerBaseValue ||
    previous.deviceIndexCounters !== next.deviceIndexCounters ||
    previous.nodes !== next.nodes ||
    previous.edges !== next.edges ||
    previous.groups !== next.groups ||
    previous.measurements !== next.measurements;
Object.assign(__appScope, { graphDirtyBaselineChanged });
useEffect(createAppHookCallback120(__appScope), [activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectMeasurements, projectName, voltageUnit]);
const canAdjustSelectedDisplayLayer = isEditMode && activeSelectedNodeIds.length > 0; Object.assign(__appScope, { canAdjustSelectedDisplayLayer });
const adjustSelectedDisplayLayer = createAdjustSelectedDisplayLayer(__appScope); Object.assign(__appScope, { adjustSelectedDisplayLayer });
const clearTransientSelectionState = createClearTransientSelectionState(__appScope); Object.assign(__appScope, { clearTransientSelectionState });
const writeOperationLog = createWriteOperationLog(__appScope); Object.assign(__appScope, { writeOperationLog });
const requireEditMode = createRequireEditMode(__appScope); Object.assign(__appScope, { requireEditMode });
const persistDeviceLibraryChange = createPersistDeviceLibraryChange(__appScope); Object.assign(__appScope, { persistDeviceLibraryChange });
const persistTemplateLibraryChange = createPersistTemplateLibraryChange(__appScope); Object.assign(__appScope, { persistTemplateLibraryChange });
const connectionCommitFailureMessage = createConnectionCommitFailureMessage(__appScope); Object.assign(__appScope, { connectionCommitFailureMessage });
const connectionEndpointRuleFailureMessage = (edge: Edge) =>
    validateConnectionEndpointRules(nodes, edges, edge)[0]?.message ?? "";
Object.assign(__appScope, { connectionEndpointRuleFailureMessage });
const expandActiveGroupSelection = (nodeIds: readonly string[] = [], edgeIds: readonly string[] = []) =>
    expandSelectionByGroups(activeLayerGroups, nodeIds, edgeIds);
Object.assign(__appScope, { expandActiveGroupSelection });
const switchInspectorTabForCanvasSelection = createSwitchInspectorTabForCanvasSelection(__appScope); Object.assign(__appScope, { switchInspectorTabForCanvasSelection });
const selectCanvasGraphics = createSelectCanvasGraphics(__appScope); Object.assign(__appScope, { selectCanvasGraphics });
const setModifierSelectionPress = createSetModifierSelectionPress(__appScope); Object.assign(__appScope, { setModifierSelectionPress });
const toggleNodeSelectionFromModifierClick = createToggleNodeSelectionFromModifierClick(__appScope); Object.assign(__appScope, { toggleNodeSelectionFromModifierClick });
const toggleEdgeSelectionFromModifierClick = createToggleEdgeSelectionFromModifierClick(__appScope); Object.assign(__appScope, { toggleEdgeSelectionFromModifierClick });
const toggleSelectionFromModifierClick = createToggleSelectionFromModifierClick(__appScope); Object.assign(__appScope, { toggleSelectionFromModifierClick });
const createCanvasSelectionSnapshot = (
    scope: CanvasSelectionScope,
    nodeIds: readonly string[],
    edgeIds: readonly string[],
    edgeId = edgeIds[0] ?? ""
  ): CanvasSelectionSnapshot => ({
    scope,
    nodeIds: [...nodeIds],
    edgeIds: [...edgeIds],
    edgeId
  });
Object.assign(__appScope, { createCanvasSelectionSnapshot });
const currentCanvasSelectionSnapshot = (): CanvasSelectionSnapshot =>
    createCanvasSelectionSnapshot(canvasSelectionScope, selectedNodeIds, selectedEdgeIds, selectedEdgeId);
Object.assign(__appScope, { currentCanvasSelectionSnapshot });
const restoreCanvasSelectionSnapshot = createRestoreCanvasSelectionSnapshot(__appScope); Object.assign(__appScope, { restoreCanvasSelectionSnapshot });
const restoreCanvasSelectionSnapshotWithInspector = createRestoreCanvasSelectionSnapshotWithInspector(__appScope); Object.assign(__appScope, { restoreCanvasSelectionSnapshotWithInspector });
const startModifierSelectionPress = createStartModifierSelectionPress(__appScope); Object.assign(__appScope, { startModifierSelectionPress });
const cancelModifierSelectionPress = createCancelModifierSelectionPress(__appScope); Object.assign(__appScope, { cancelModifierSelectionPress });
const finishModifierSelectionPress = createFinishModifierSelectionPress(__appScope); Object.assign(__appScope, { finishModifierSelectionPress });
const startNodeLabelDrag = createStartNodeLabelDrag(__appScope); Object.assign(__appScope, { startNodeLabelDrag });
const startNodeLabelRotateDrag = createStartNodeLabelRotateDrag(__appScope); Object.assign(__appScope, { startNodeLabelRotateDrag });
const finishNodeLabelDrag = createFinishNodeLabelDrag(__appScope); Object.assign(__appScope, { finishNodeLabelDrag });
const finishNodeLabelRotateDrag = createFinishNodeLabelRotateDrag(__appScope); Object.assign(__appScope, { finishNodeLabelRotateDrag });
const setSelectedNodeLabelDisplayMode = createSetSelectedNodeLabelDisplayMode(__appScope); Object.assign(__appScope, { setSelectedNodeLabelDisplayMode });
const toggleSelectedNodeLabelDisplay = createToggleSelectedNodeLabelDisplay(__appScope); Object.assign(__appScope, { toggleSelectedNodeLabelDisplay });
const copySelection = createCopySelection(__appScope); Object.assign(__appScope, { copySelection });
const cutSelection = createCutSelection(__appScope); Object.assign(__appScope, { cutSelection });
const pasteSelection = createPasteSelection(__appScope); Object.assign(__appScope, { pasteSelection });
const createGraphTemplateType = createCreateGraphTemplateType(__appScope); Object.assign(__appScope, { createGraphTemplateType });
const createGroupDeviceIconSvg = createCreateGroupDeviceIconSvg(__appScope); Object.assign(__appScope, { createGroupDeviceIconSvg });
const groupDeviceTerminalAnchor = createGroupDeviceTerminalAnchor(__appScope); Object.assign(__appScope, { groupDeviceTerminalAnchor });
const groupDeviceTerminalSortKey = createGroupDeviceTerminalSortKey(__appScope); Object.assign(__appScope, { groupDeviceTerminalSortKey });
const groupDeviceTerminalAssociationFor = createGroupDeviceTerminalAssociationFor(__appScope); Object.assign(__appScope, { groupDeviceTerminalAssociationFor });
const groupDeviceExternalTerminals = createGroupDeviceExternalTerminals(__appScope); Object.assign(__appScope, { groupDeviceExternalTerminals });
const groupDeviceTerminalSignature = (terminalTypes: readonly TerminalType[]) =>
    `${terminalTypes.length}|${TERMINAL_TYPE_OPTIONS.map((option) => `${option.value}:${terminalTypes.filter((type) => type === option.value).length}`).join("|")}`;
Object.assign(__appScope, { groupDeviceTerminalSignature });
const validateGroupDeviceIconReplacement = createValidateGroupDeviceIconReplacement(__appScope); Object.assign(__appScope, { validateGroupDeviceIconReplacement });
const replaceBuiltinDeviceIconOverride = createReplaceBuiltinDeviceIconOverride(__appScope); Object.assign(__appScope, { replaceBuiltinDeviceIconOverride });
const openGroupDeviceDefinitionDialog = createOpenGroupDeviceDefinitionDialog(__appScope); Object.assign(__appScope, { openGroupDeviceDefinitionDialog });
const confirmCreateDeviceFromGroup = createConfirmCreateDeviceFromGroup(__appScope); Object.assign(__appScope, { confirmCreateDeviceFromGroup });
const confirmReplaceDeviceIconFromGroup = createConfirmReplaceDeviceIconFromGroup(__appScope); Object.assign(__appScope, { confirmReplaceDeviceIconFromGroup });
const openAddTemplateDialog = createOpenAddTemplateDialog(__appScope); Object.assign(__appScope, { openAddTemplateDialog });
const cancelTemplateDialog = createCancelTemplateDialog(__appScope); Object.assign(__appScope, { cancelTemplateDialog });
const confirmAddGraphTemplate = createConfirmAddGraphTemplate(__appScope); Object.assign(__appScope, { confirmAddGraphTemplate });
const deleteGraphTemplate = createDeleteGraphTemplate(__appScope); Object.assign(__appScope, { deleteGraphTemplate });
const deleteGraphTemplateType = createDeleteGraphTemplateType(__appScope); Object.assign(__appScope, { deleteGraphTemplateType });
const dropGraphTemplate = createDropGraphTemplate(__appScope); Object.assign(__appScope, { dropGraphTemplate });
const finishMarqueeSelectionFromPoints = createFinishMarqueeSelectionFromPoints(__appScope); Object.assign(__appScope, { finishMarqueeSelectionFromPoints });
const startContextMarqueeSelection = createStartContextMarqueeSelection(__appScope); Object.assign(__appScope, { startContextMarqueeSelection });
const openFilterSelectionDialog = createOpenFilterSelectionDialog(__appScope); Object.assign(__appScope, { openFilterSelectionDialog });
const filterSelectionTypeSelected = (option: FilterSelectionTypeOption) =>
    option.items.length > 0 && option.items.every((item) => filterSelectionTypeKeys.includes(item.itemKey));
Object.assign(__appScope, { filterSelectionTypeSelected });
const filterSelectionTypePartial = (option: FilterSelectionTypeOption) =>
    option.items.some((item) => filterSelectionTypeKeys.includes(item.itemKey)) && !filterSelectionTypeSelected(option);
Object.assign(__appScope, { filterSelectionTypePartial });
const toggleFilterSelectionType = createToggleFilterSelectionType(__appScope); Object.assign(__appScope, { toggleFilterSelectionType });
const toggleFilterSelectionItem = createToggleFilterSelectionItem(__appScope); Object.assign(__appScope, { toggleFilterSelectionItem });
const confirmFilterSelectionDialog = createConfirmFilterSelectionDialog(__appScope); Object.assign(__appScope, { confirmFilterSelectionDialog });
const finishMarqueeSelection = createFinishMarqueeSelection(__appScope); Object.assign(__appScope, { finishMarqueeSelection });
const deleteSelection = createDeleteSelection(__appScope); Object.assign(__appScope, { deleteSelection });
const deleteSelectedGraphicsFromCanvas = createDeleteSelectedGraphicsFromCanvas(__appScope); Object.assign(__appScope, { deleteSelectedGraphicsFromCanvas });
const groupSelectedGraphics = createGroupSelectedGraphics(__appScope); Object.assign(__appScope, { groupSelectedGraphics });
const ungroupSelectedGraphics = createUngroupSelectedGraphics(__appScope); Object.assign(__appScope, { ungroupSelectedGraphics });
const manualPointDeltaForEdge = createManualPointDeltaForEdge(__appScope); Object.assign(__appScope, { manualPointDeltaForEdge });
const routePreserveEdgeIdsForMovedNodes = createRoutePreserveEdgeIdsForMovedNodes(__appScope); Object.assign(__appScope, { routePreserveEdgeIdsForMovedNodes });
const routeSnapshotEdgesForMove = createRouteSnapshotEdgesForMove(__appScope); Object.assign(__appScope, { routeSnapshotEdgesForMove });
const routePointsSnapshotForMove = (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds: Iterable<string> = []
  ) =>
    Object.fromEntries(
      routeSnapshotEdgesForMove(candidateEdges, movedNodeIds, selectedEdgeIds).map((edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
Object.assign(__appScope, { routePointsSnapshotForMove });
const snapshotEdgePoints = (sourceEdges = edges) =>
    Object.fromEntries(
      sourceEdges.map((edge) => [
        edge.id,
        {
          sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
          targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
          manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
          routePoints: edge.routePoints?.map((point) => ({ ...point }))
        }
      ])
    );
Object.assign(__appScope, { snapshotEdgePoints });
const routePointSnapshotToRoutes = (routePoints: Record<string, Point[]>): { edgeId: string; points: Point[]; path: string }[] =>
    Object.entries(routePoints).map(([edgeId, points]) => ({
      edgeId,
      points: points.map((point) => ({ ...point })),
      path: ""
    }));
Object.assign(__appScope, { routePointSnapshotToRoutes });
const boxesOverlap = (
    first: { left: number; right: number; top: number; bottom: number },
    second: { left: number; right: number; top: number; bottom: number }
  ) => first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
Object.assign(__appScope, { boxesOverlap });
const expandRouteBox = (
    box: { left: number; right: number; top: number; bottom: number },
    padding: number
  ) => ({
    left: box.left - padding,
    right: box.right + padding,
    top: box.top - padding,
    bottom: box.bottom + padding
  });
Object.assign(__appScope, { expandRouteBox });
const routeTouchesExpandedBoxes = createRouteTouchesExpandedBoxes(__appScope); Object.assign(__appScope, { routeTouchesExpandedBoxes });
const boundsForNodeSet = createBoundsForNodeSet(__appScope); Object.assign(__appScope, { boundsForNodeSet });
const mergeNodeUpdateLists = createMergeNodeUpdateLists(__appScope); Object.assign(__appScope, { mergeNodeUpdateLists });
const mergeUniqueEdgesById = createMergeUniqueEdgesById(__appScope); Object.assign(__appScope, { mergeUniqueEdgesById });
const completeNodeListForPartialPatch = createCompleteNodeListForPartialPatch(__appScope); Object.assign(__appScope, { completeNodeListForPartialPatch });
const movableCanvasNodeIds = (nodeIds: readonly string[]) =>
    nodeIds.filter((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && isCanvasNodeMovable(node.kind);
    });
Object.assign(__appScope, { movableCanvasNodeIds });
const isWholeActiveLayerMove = createIsWholeActiveLayerMove(__appScope); Object.assign(__appScope, { isWholeActiveLayerMove });
const internalMoveEdgeIdsForMovedNodes = createInternalMoveEdgeIdsForMovedNodes(__appScope); Object.assign(__appScope, { internalMoveEdgeIdsForMovedNodes });
const externalMoveCandidateEdges = createExternalMoveCandidateEdges(__appScope); Object.assign(__appScope, { externalMoveCandidateEdges });
const internalMoveCandidateEdges = createInternalMoveCandidateEdges(__appScope); Object.assign(__appScope, { internalMoveCandidateEdges });
const translateInternalMoveCandidateEdges = createTranslateInternalMoveCandidateEdges(__appScope); Object.assign(__appScope, { translateInternalMoveCandidateEdges });
const translateWholeMoveCandidateEdges = createTranslateWholeMoveCandidateEdges(__appScope); Object.assign(__appScope, { translateWholeMoveCandidateEdges });
const internalRoutableLineNodeUpdatesForMove = createInternalRoutableLineNodeUpdatesForMove(__appScope); Object.assign(__appScope, { internalRoutableLineNodeUpdatesForMove });
const wholeMoveRoutableLineNodeUpdates = (movedNodeIds: Iterable<string>, delta: Point) =>
    internalRoutableLineNodeUpdatesForMove(movedNodeIds, delta);
Object.assign(__appScope, { wholeMoveRoutableLineNodeUpdates });
const routableLineRouteCandidateIdsForMovedNodes = createRoutableLineRouteCandidateIdsForMovedNodes(__appScope); Object.assign(__appScope, { routableLineRouteCandidateIdsForMovedNodes });
const rebuildRoutableLineNodeUpdatesForChangedNodes = createRebuildRoutableLineNodeUpdatesForChangedNodes(__appScope); Object.assign(__appScope, { rebuildRoutableLineNodeUpdatesForChangedNodes });
const scheduleDeferredRoutableLineRouteRepair = createScheduleDeferredRoutableLineRouteRepair(__appScope); Object.assign(__appScope, { scheduleDeferredRoutableLineRouteRepair });
const localRouteOptimizationEdges = createLocalRouteOptimizationEdges(__appScope); Object.assign(__appScope, { localRouteOptimizationEdges });
const localRouteOptimizationCandidateEdges = createLocalRouteOptimizationCandidateEdges(__appScope); Object.assign(__appScope, { localRouteOptimizationCandidateEdges });
const routePointsForMovedNodeBlockers = createRoutePointsForMovedNodeBlockers(__appScope); Object.assign(__appScope, { routePointsForMovedNodeBlockers });
const routePointsForMovedEdgesBlockedByStationaryNodes = createRoutePointsForMovedEdgesBlockedByStationaryNodes(__appScope); Object.assign(__appScope, { routePointsForMovedEdgesBlockedByStationaryNodes });
const routePointsNearOriginalMovedNodes = createRoutePointsNearOriginalMovedNodes(__appScope); Object.assign(__appScope, { routePointsNearOriginalMovedNodes });
const sameOptionalPoint = (first?: Point, second?: Point) =>
    (!first && !second) || (Boolean(first && second) && first?.x === second?.x && first?.y === second?.y);
Object.assign(__appScope, { sameOptionalPoint });
const sameConnectTarget = (first?: ConnectTarget, second?: ConnectTarget | null) =>
    (!first && !second) ||
    Boolean(
      first &&
        second &&
        first.node.id === second.node.id &&
        first.terminalId === second.terminalId &&
        sameOptionalPoint(first.point, second.point)
    );
Object.assign(__appScope, { sameConnectTarget });
const sameOptionalPointList = (first?: Point[], second?: Point[]) =>
    (!first && !second) ||
    (Boolean(first && second) &&
      first?.length === second?.length &&
      first?.every((point, index) => point.x === second?.[index]?.x && point.y === second?.[index]?.y));
Object.assign(__appScope, { sameOptionalPointList });
const adjustEdgesAfterNodeMove = createAdjustEdgesAfterNodeMove(__appScope); Object.assign(__appScope, { adjustEdgesAfterNodeMove });
const rebuildSingleAffectedConnectionRoute = createRebuildSingleAffectedConnectionRoute(__appScope); Object.assign(__appScope, { rebuildSingleAffectedConnectionRoute });
const synchronousEdgeAdjustmentCandidates = createSynchronousEdgeAdjustmentCandidates(__appScope); Object.assign(__appScope, { synchronousEdgeAdjustmentCandidates });
const shouldAdjustEdgeSynchronouslyAfterMove = createShouldAdjustEdgeSynchronouslyAfterMove(__appScope); Object.assign(__appScope, { shouldAdjustEdgeSynchronouslyAfterMove });
const mergeAdjustedCandidateEdges = createMergeAdjustedCandidateEdges(__appScope); Object.assign(__appScope, { mergeAdjustedCandidateEdges });
const shouldFinalizeMovedNodeEdgesSynchronously = (movedNodeIds: string[], candidateEdges: Edge[]) =>
    movedNodeIds.length > 0 &&
    candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT &&
    (movedNodeIds.length > 1 || candidateEdges.length === 0);
Object.assign(__appScope, { shouldFinalizeMovedNodeEdgesSynchronously });
const shouldDeferSingleNodeTerminalReconciliation = (movedNodeIds: string[], candidateEdges: Edge[]) =>
    movedNodeIds.length === 1 &&
    candidateEdges.length > 0 &&
    candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT;
Object.assign(__appScope, { shouldDeferSingleNodeTerminalReconciliation });
const terminalReconcileNodeScope = createTerminalReconcileNodeScope(__appScope); Object.assign(__appScope, { terminalReconcileNodeScope });
const finalizeMovedNodeEdgesFast = createFinalizeMovedNodeEdgesFast(__appScope); Object.assign(__appScope, { finalizeMovedNodeEdgesFast });
const optimizeMovedNodeEdgeRoutes = createOptimizeMovedNodeEdgeRoutes(__appScope); Object.assign(__appScope, { optimizeMovedNodeEdgeRoutes });
const shouldRunDeferredMoveOptimization = createShouldRunDeferredMoveOptimization(__appScope); Object.assign(__appScope, { shouldRunDeferredMoveOptimization });
const scheduleMovedEdgeOptimization = createScheduleMovedEdgeOptimization(__appScope); Object.assign(__appScope, { scheduleMovedEdgeOptimization });
const scheduleDeferredMovedConnectionRepair = createScheduleDeferredMovedConnectionRepair(__appScope); Object.assign(__appScope, { scheduleDeferredMovedConnectionRepair });
const moveRouteRepairSeedEdges = createMoveRouteRepairSeedEdges(__appScope); Object.assign(__appScope, { moveRouteRepairSeedEdges });
const shouldPatchRouteCacheForHighFanoutMove = (movedNodeIds: string[], candidateEdges: Edge[]) =>
    movedNodeIds.length > 0 && candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES;
Object.assign(__appScope, { shouldPatchRouteCacheForHighFanoutMove });
const lightweightMovedEndpointRoute = createLightweightMovedEndpointRoute(__appScope); Object.assign(__appScope, { lightweightMovedEndpointRoute });
const patchCachedRoutesForHighFanoutMove = createPatchCachedRoutesForHighFanoutMove(__appScope); Object.assign(__appScope, { patchCachedRoutesForHighFanoutMove });
const patchCachedRoutesForBulkTranslation = createPatchCachedRoutesForBulkTranslation(__appScope); Object.assign(__appScope, { patchCachedRoutesForBulkTranslation });
const patchCachedRoutesForWholeMove = createPatchCachedRoutesForWholeMove(__appScope); Object.assign(__appScope, { patchCachedRoutesForWholeMove });
const patchCachedRoutesForInternalMove = createPatchCachedRoutesForInternalMove(__appScope); Object.assign(__appScope, { patchCachedRoutesForInternalMove });
const storedRouteDirtyIdsForMove = createStoredRouteDirtyIdsForMove(__appScope); Object.assign(__appScope, { storedRouteDirtyIdsForMove });
const buildBulkMovePlan = createBuildBulkMovePlan(__appScope); Object.assign(__appScope, { buildBulkMovePlan });
const commitFastMovedGraphPatches = createCommitFastMovedGraphPatches(__appScope); Object.assign(__appScope, { commitFastMovedGraphPatches });
const clampPointToCanvas = (point: Point) => clampPointToBounds(point, canvasBounds); Object.assign(__appScope, { clampPointToCanvas });
const clampNodeToCanvas = (node: ModelNode, position = node.position) => clampNodePositionToBounds(node, canvasBounds, position); Object.assign(__appScope, { clampNodeToCanvas });
const clampViewBoxToCanvas = (box: typeof viewBox) => normalizeViewBoxToCanvas(box, canvasBounds); Object.assign(__appScope, { clampViewBoxToCanvas });
const updateMouseStatus = createUpdateMouseStatus(__appScope); Object.assign(__appScope, { updateMouseStatus });
const updateMultiNodeDragOverlayTransform = createUpdateMultiNodeDragOverlayTransform(__appScope); Object.assign(__appScope, { updateMultiNodeDragOverlayTransform });
const showImperativeMultiNodeDragOverlay = createShowImperativeMultiNodeDragOverlay(__appScope); Object.assign(__appScope, { showImperativeMultiNodeDragOverlay });
const hideImperativeMultiNodeDragOverlay = createHideImperativeMultiNodeDragOverlay(__appScope); Object.assign(__appScope, { hideImperativeMultiNodeDragOverlay });
const resetMultiNodeDragOverlayTransform = createResetMultiNodeDragOverlayTransform(__appScope); Object.assign(__appScope, { resetMultiNodeDragOverlayTransform });
const singleNodeDragRenderState = (dragState: DraggingState): DraggingState => ({
    ...dragState,
    currentDelta: undefined,
    previewDelta: undefined
  });
Object.assign(__appScope, { singleNodeDragRenderState });
const buildSingleNodeDragPreviewNodeMarkup = createBuildSingleNodeDragPreviewNodeMarkup(__appScope); Object.assign(__appScope, { buildSingleNodeDragPreviewNodeMarkup });
const clearImperativeNodeDragEdgePreview = createClearImperativeNodeDragEdgePreview(__appScope); Object.assign(__appScope, { clearImperativeNodeDragEdgePreview });
const showImperativeSingleNodeDragPreview = createShowImperativeSingleNodeDragPreview(__appScope); Object.assign(__appScope, { showImperativeSingleNodeDragPreview });
const cssSelectorEscape = createCssSelectorEscape(__appScope); Object.assign(__appScope, { cssSelectorEscape });
const clearImperativeSingleNodeDragOriginLines = createClearImperativeSingleNodeDragOriginLines(__appScope); Object.assign(__appScope, { clearImperativeSingleNodeDragOriginLines });
const setImperativeSingleNodeDragOriginLines = createSetImperativeSingleNodeDragOriginLines(__appScope); Object.assign(__appScope, { setImperativeSingleNodeDragOriginLines });
const setImperativeSingleNodeDragOrigin = createSetImperativeSingleNodeDragOrigin(__appScope); Object.assign(__appScope, { setImperativeSingleNodeDragOrigin });
const bindCanvasNodeElement = createBindCanvasNodeElement(__appScope); Object.assign(__appScope, { bindCanvasNodeElement });
const hideImperativeSingleNodeDragPreview = createHideImperativeSingleNodeDragPreview(__appScope); Object.assign(__appScope, { hideImperativeSingleNodeDragPreview });
const singleNodeDragPreviewNodeFor = createSingleNodeDragPreviewNodeFor(__appScope); Object.assign(__appScope, { singleNodeDragPreviewNodeFor });
const singleNodeDragRelevantEdges = createSingleNodeDragRelevantEdges(__appScope); Object.assign(__appScope, { singleNodeDragRelevantEdges });
const singleNodeDragPreviewBounds = createSingleNodeDragPreviewBounds(__appScope); Object.assign(__appScope, { singleNodeDragPreviewBounds });
const singleNodeDragEdgeTouchesBounds = createSingleNodeDragEdgeTouchesBounds(__appScope); Object.assign(__appScope, { singleNodeDragEdgeTouchesBounds });
const singleNodeDragViewportLocalEdgesByScan = createSingleNodeDragViewportLocalEdgesByScan(__appScope); Object.assign(__appScope, { singleNodeDragViewportLocalEdgesByScan });
const singleNodeDragScopedEdges = createSingleNodeDragScopedEdges(__appScope); Object.assign(__appScope, { singleNodeDragScopedEdges });
const singleNodeDragPreviewEdges = (dragState: DraggingState, delta: Point) =>
    singleNodeDragScopedEdges(dragState, delta).previewEdges;
Object.assign(__appScope, { singleNodeDragPreviewEdges });
const singleNodeDragSnapEdges = (dragState: DraggingState, delta: Point) =>
    singleNodeDragScopedEdges(dragState, delta).snapEdges;
Object.assign(__appScope, { singleNodeDragSnapEdges });
const simpleOrthogonalDragPreviewPoints = createSimpleOrthogonalDragPreviewPoints(__appScope); Object.assign(__appScope, { simpleOrthogonalDragPreviewPoints });
const routableLineIdsConnectedToNodeIds = createRoutableLineIdsConnectedToNodeIds(__appScope); Object.assign(__appScope, { routableLineIdsConnectedToNodeIds });
const routableLineEndpointPreviewRoutePoints = createRoutableLineEndpointPreviewRoutePoints(__appScope); Object.assign(__appScope, { routableLineEndpointPreviewRoutePoints });
const buildRoutableLinePreviewRoutesForNodeUpdates = createBuildRoutableLinePreviewRoutesForNodeUpdates(__appScope); Object.assign(__appScope, { buildRoutableLinePreviewRoutesForNodeUpdates });
const buildRoutableLineEndpointPreviewNodeUpdates = createBuildRoutableLineEndpointPreviewNodeUpdates(__appScope); Object.assign(__appScope, { buildRoutableLineEndpointPreviewNodeUpdates });
const buildTranslatedInternalRoutableLineDragPreviewRoutes = createBuildTranslatedInternalRoutableLineDragPreviewRoutes(__appScope); Object.assign(__appScope, { buildTranslatedInternalRoutableLineDragPreviewRoutes });
const buildRoutableLineDragPreviewRoutes = createBuildRoutableLineDragPreviewRoutes(__appScope); Object.assign(__appScope, { buildRoutableLineDragPreviewRoutes });
const shiftedDragPreviewPoint = (point: Point | undefined, delta: Point | undefined) =>
    point && delta ? { x: point.x + delta.x, y: point.y + delta.y } : point;
Object.assign(__appScope, { shiftedDragPreviewPoint });
const shiftPreviewEndpointForDelta = (point: Point, moves: boolean, delta: Point) =>
    moves ? { x: point.x + delta.x, y: point.y + delta.y } : point;
Object.assign(__appScope, { shiftPreviewEndpointForDelta });
const buildCachedSingleNodeDragPreviewRoutes = createBuildCachedSingleNodeDragPreviewRoutes(__appScope); Object.assign(__appScope, { buildCachedSingleNodeDragPreviewRoutes });
const buildDragPreviewEndpointPoints = createBuildDragPreviewEndpointPoints(__appScope); Object.assign(__appScope, { buildDragPreviewEndpointPoints });
const connectionEndpointPreviewRoutePoints = createConnectionEndpointPreviewRoutePoints(__appScope); Object.assign(__appScope, { connectionEndpointPreviewRoutePoints });
const singleNodeDragPreviewKey = (dragState: DraggingState, roundedDelta: Point, previewEdges: Edge[]) =>
    `single:${dragState.nodeIds[0] ?? ""}:${roundedDelta.x},${roundedDelta.y}:${previewEdges.length}:${previewEdges[0]?.id ?? ""}:${previewEdges[previewEdges.length - 1]?.id ?? ""}`;
Object.assign(__appScope, { singleNodeDragPreviewKey });
const buildLightweightNodeDragPreviewRoutes = createBuildLightweightNodeDragPreviewRoutes(__appScope); Object.assign(__appScope, { buildLightweightNodeDragPreviewRoutes });
const buildLightweightNodeDragPreviewRouteMarkup = createBuildLightweightNodeDragPreviewRouteMarkup(__appScope); Object.assign(__appScope, { buildLightweightNodeDragPreviewRouteMarkup });
const syncImperativeNodeDragPreviewPaths = createSyncImperativeNodeDragPreviewPaths(__appScope); Object.assign(__appScope, { syncImperativeNodeDragPreviewPaths });
const updateNodeDragLightweightEdgePreview = createUpdateNodeDragLightweightEdgePreview(__appScope); Object.assign(__appScope, { updateNodeDragLightweightEdgePreview });
const singleNodeDragInteractionNodes = createSingleNodeDragInteractionNodes(__appScope); Object.assign(__appScope, { singleNodeDragInteractionNodes });
const multiNodeDragInteractionNodes = createMultiNodeDragInteractionNodes(__appScope); Object.assign(__appScope, { multiNodeDragInteractionNodes });
const updateImperativeNodeDragDropHint = createUpdateImperativeNodeDragDropHint(__appScope); Object.assign(__appScope, { updateImperativeNodeDragDropHint });
const findSingleNodeDragSnapTargetAtDelta = createFindSingleNodeDragSnapTargetAtDelta(__appScope); Object.assign(__appScope, { findSingleNodeDragSnapTargetAtDelta });
const findMultiNodeDragSnapTargetAtDelta = createFindMultiNodeDragSnapTargetAtDelta(__appScope); Object.assign(__appScope, { findMultiNodeDragSnapTargetAtDelta });
const updateSingleNodeDragImperativePreview = createUpdateSingleNodeDragImperativePreview(__appScope); Object.assign(__appScope, { updateSingleNodeDragImperativePreview });
const startDraggingState = createStartDraggingState(__appScope); Object.assign(__appScope, { startDraggingState });
const flushConnectPreviewDom = createFlushConnectPreviewDom(__appScope); Object.assign(__appScope, { flushConnectPreviewDom });
const setConnectPreviewDom = createSetConnectPreviewDom(__appScope); Object.assign(__appScope, { setConnectPreviewDom });
const applyConnectPreviewState = createApplyConnectPreviewState(__appScope); Object.assign(__appScope, { applyConnectPreviewState });
const scheduleConnectPreviewPoint = createScheduleConnectPreviewPoint(__appScope); Object.assign(__appScope, { scheduleConnectPreviewPoint });
const applyRoutableLinePreviewState = createApplyRoutableLinePreviewState(__appScope); Object.assign(__appScope, { applyRoutableLinePreviewState });
const scheduleRoutableLinePreviewPoint = createScheduleRoutableLinePreviewPoint(__appScope); Object.assign(__appScope, { scheduleRoutableLinePreviewPoint });
const releaseRoutableLinePreviewAxisLock = createReleaseRoutableLinePreviewAxisLock(__appScope); Object.assign(__appScope, { releaseRoutableLinePreviewAxisLock });
const routableLinePreviewAxisReferencePoint = () =>
    routableLinePlacement?.manualPoints?.[routableLinePlacement.manualPoints.length - 1] ??
    (routableLinePlacement?.source ? connectTargetPoint(routableLinePlacement.source) : null);
Object.assign(__appScope, { routableLinePreviewAxisReferencePoint });
const lockRoutableLinePreviewAxis = createLockRoutableLinePreviewAxis(__appScope); Object.assign(__appScope, { lockRoutableLinePreviewAxis });
const appendRoutableLinePreviewManualPoint = createAppendRoutableLinePreviewManualPoint(__appScope); Object.assign(__appScope, { appendRoutableLinePreviewManualPoint });
const resolveRoutableLinePreviewPoint = createResolveRoutableLinePreviewPoint(__appScope); Object.assign(__appScope, { resolveRoutableLinePreviewPoint });
const resetRoutableLinePreviewState = createResetRoutableLinePreviewState(__appScope); Object.assign(__appScope, { resetRoutableLinePreviewState });
const scheduleRewirePreviewPoint = createScheduleRewirePreviewPoint(__appScope); Object.assign(__appScope, { scheduleRewirePreviewPoint });
const resetConnectPreviewState = createResetConnectPreviewState(__appScope); Object.assign(__appScope, { resetConnectPreviewState });
// ESC 键取消连接预览
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && connectSource) {
      setConnectSource(null);
      resetConnectPreviewState();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [connectSource]);
const releaseConnectPreviewAxisLock = createReleaseConnectPreviewAxisLock(__appScope); Object.assign(__appScope, { releaseConnectPreviewAxisLock });
const connectSourceEndpointPoint = createConnectSourceEndpointPoint(__appScope); Object.assign(__appScope, { connectSourceEndpointPoint });
const connectPreviewAxisReferencePoint = () =>
    connectSource?.manualPoints?.[connectSource.manualPoints.length - 1] ?? connectSourceEndpointPoint();
Object.assign(__appScope, { connectPreviewAxisReferencePoint });
const lockConnectPreviewAxis = createLockConnectPreviewAxis(__appScope); Object.assign(__appScope, { lockConnectPreviewAxis });
const appendConnectPreviewManualPoint = createAppendConnectPreviewManualPoint(__appScope); Object.assign(__appScope, { appendConnectPreviewManualPoint });
const resolveConnectPreviewPoint = createResolveConnectPreviewPoint(__appScope); Object.assign(__appScope, { resolveConnectPreviewPoint });
const axisLockedDelta = (dx: number, dy: number): Point => (
    Math.abs(dx) >= Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy }
  );
Object.assign(__appScope, { axisLockedDelta });
const boundedDeltaForNodes = createBoundedDeltaForNodes(__appScope); Object.assign(__appScope, { boundedDeltaForNodes });
const boundedDeltaForMultiNodeInteractiveMove = createBoundedDeltaForMultiNodeInteractiveMove(__appScope); Object.assign(__appScope, { boundedDeltaForMultiNodeInteractiveMove });
const nodeMoveGeometryInsideCanvas = createNodeMoveGeometryInsideCanvas(__appScope); Object.assign(__appScope, { nodeMoveGeometryInsideCanvas });
const nearestBoundarySafeDelta = createNearestBoundarySafeDelta(__appScope); Object.assign(__appScope, { nearestBoundarySafeDelta });
const boundedDeltaForMoveGeometry = createBoundedDeltaForMoveGeometry(__appScope); Object.assign(__appScope, { boundedDeltaForMoveGeometry });
const commitSafeDeltaForDraggingState = createCommitSafeDeltaForDraggingState(__appScope); Object.assign(__appScope, { commitSafeDeltaForDraggingState });
const canvasBoundsForMoveDelta = (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number
  ) => canvasBoundsForMovedNodeDelta(nodeIds, originalPositions, dx, dy);
Object.assign(__appScope, { canvasBoundsForMoveDelta });
const canvasBoundsForMovedNodeDelta = createCanvasBoundsForMovedNodeDelta(__appScope); Object.assign(__appScope, { canvasBoundsForMovedNodeDelta });
const dragBoundsForSmartAlignment = createDragBoundsForSmartAlignment(__appScope); Object.assign(__appScope, { dragBoundsForSmartAlignment });
const terminalOutflowAnchorsForSmartAlignmentDrag = createTerminalOutflowAnchorsForSmartAlignmentDrag(__appScope); Object.assign(__appScope, { terminalOutflowAnchorsForSmartAlignmentDrag });
const computeSmartAlignmentSnap = createComputeSmartAlignmentSnap(__appScope); Object.assign(__appScope, { computeSmartAlignmentSnap });
const computeNodeDragPreviewDelta = createComputeNodeDragPreviewDelta(__appScope); Object.assign(__appScope, { computeNodeDragPreviewDelta });
const computeNodeDragDelta = createComputeNodeDragDelta(__appScope); Object.assign(__appScope, { computeNodeDragDelta });
const applyNodeDragMove = createApplyNodeDragMove(__appScope); Object.assign(__appScope, { applyNodeDragMove });
const scheduleNodeDragMove = createScheduleNodeDragMove(__appScope); Object.assign(__appScope, { scheduleNodeDragMove });
const flushPendingNodeDragMove = createFlushPendingNodeDragMove(__appScope); Object.assign(__appScope, { flushPendingNodeDragMove });
const clearNodeDragMoveSchedule = createClearNodeDragMoveSchedule(__appScope); Object.assign(__appScope, { clearNodeDragMoveSchedule });
const clearKeyboardMoveCommitSchedule = createClearKeyboardMoveCommitSchedule(__appScope); Object.assign(__appScope, { clearKeyboardMoveCommitSchedule });
const clearKeyboardNudgeSchedule = createClearKeyboardNudgeSchedule(__appScope); Object.assign(__appScope, { clearKeyboardNudgeSchedule });
const clearDraggingMoveState = createClearDraggingMoveState(__appScope); Object.assign(__appScope, { clearDraggingMoveState });
const cancelActiveEditInteractions = createCancelActiveEditInteractions(__appScope); Object.assign(__appScope, { cancelActiveEditInteractions });
const enterBrowseMode = createEnterBrowseMode(__appScope); Object.assign(__appScope, { enterBrowseMode });
const requestEnterBrowseMode = createRequestEnterBrowseMode(__appScope); Object.assign(__appScope, { requestEnterBrowseMode });
const toggleInteractionMode = createToggleInteractionMode(__appScope); Object.assign(__appScope, { toggleInteractionMode });
const finishDraggingMove = createFinishDraggingMove(__appScope); Object.assign(__appScope, { finishDraggingMove });
const finishNodeDrag = createFinishNodeDrag(__appScope); Object.assign(__appScope, { finishNodeDrag });
const finishTransformDrag = createFinishTransformDrag(__appScope); Object.assign(__appScope, { finishTransformDrag });
const finishKeyboardMove = createFinishKeyboardMove(__appScope); Object.assign(__appScope, { finishKeyboardMove });
const scheduleKeyboardMoveCommit = createScheduleKeyboardMoveCommit(__appScope); Object.assign(__appScope, { scheduleKeyboardMoveCommit });
const applyKeyboardMoveDelta = createApplyKeyboardMoveDelta(__appScope); Object.assign(__appScope, { applyKeyboardMoveDelta });
const flushPendingKeyboardMove = createFlushPendingKeyboardMove(__appScope); Object.assign(__appScope, { flushPendingKeyboardMove });
const keyboardMoveActiveFrameDelta = createKeyboardMoveActiveFrameDelta(__appScope); Object.assign(__appScope, { keyboardMoveActiveFrameDelta });
const appendPendingKeyboardMoveDelta = createAppendPendingKeyboardMoveDelta(__appScope); Object.assign(__appScope, { appendPendingKeyboardMoveDelta });
const scheduleKeyboardNudgeFrame = createScheduleKeyboardNudgeFrame(__appScope); Object.assign(__appScope, { scheduleKeyboardNudgeFrame });
const releaseKeyboardMoveKey = createReleaseKeyboardMoveKey(__appScope); Object.assign(__appScope, { releaseKeyboardMoveKey });
const startKeyboardMoveSession = createStartKeyboardMoveSession(__appScope); Object.assign(__appScope, { startKeyboardMoveSession });
const nudgeSelectionByKeyboard = createNudgeSelectionByKeyboard(__appScope); Object.assign(__appScope, { nudgeSelectionByKeyboard });
const moveSelection = createMoveSelection(__appScope); Object.assign(__appScope, { moveSelection });
const undoScopeForNodeFootprintPatch = createUndoScopeForNodeFootprintPatch(__appScope); Object.assign(__appScope, { undoScopeForNodeFootprintPatch });
const updateSelectedNode = createUpdateSelectedNode(__appScope); Object.assign(__appScope, { updateSelectedNode });
const commitNodeFootprintUpdates = createCommitNodeFootprintUpdates(__appScope); Object.assign(__appScope, { commitNodeFootprintUpdates });
const assignSelectedNodesToModelLayer = createAssignSelectedNodesToModelLayer(__appScope); Object.assign(__appScope, { assignSelectedNodesToModelLayer });
const openLayerAssignmentDialog = createOpenLayerAssignmentDialog(__appScope); Object.assign(__appScope, { openLayerAssignmentDialog });
const applyLayerAssignmentDialog = createApplyLayerAssignmentDialog(__appScope); Object.assign(__appScope, { applyLayerAssignmentDialog });
const rotateSelectedLayoutUnits = createRotateSelectedLayoutUnits(__appScope); Object.assign(__appScope, { rotateSelectedLayoutUnits });
const mirrorSelectedNodes = createMirrorSelectedNodes(__appScope); Object.assign(__appScope, { mirrorSelectedNodes });
const updateCanvasSize = createUpdateCanvasSize(__appScope); Object.assign(__appScope, { updateCanvasSize });
// 收紧画布到刚好包裹所有设备：以内容包围盒尺寸重设画布，复用 updateCanvasSize（含 editMode 守卫、undo、超出节点夹紧）
const shrinkCanvasToFitContent = () => {
  const { calculateModelContentSize, edges, nodes, routedEdges, updateCanvasSize } = __appScope;
  const contentSize = calculateModelContentSize(nodes, edges, routedEdges, 0);
  updateCanvasSize(contentSize.width, contentSize.height);
};
Object.assign(__appScope, { shrinkCanvasToFitContent });
const commitCanvasSizeDraft = createCommitCanvasSizeDraft(__appScope); Object.assign(__appScope, { commitCanvasSizeDraft });
const resetCanvasSizeDraft = createResetCanvasSizeDraft(__appScope); Object.assign(__appScope, { resetCanvasSizeDraft });
const handleCanvasSizeBlur = createHandleCanvasSizeBlur(__appScope); Object.assign(__appScope, { handleCanvasSizeBlur });
const handleCanvasSizeKeyDown = createHandleCanvasSizeKeyDown(__appScope); Object.assign(__appScope, { handleCanvasSizeKeyDown });
const updateParam = createUpdateParam(__appScope); Object.assign(__appScope, { updateParam });
const applyBatchCommonParamPatch = createApplyBatchCommonParamPatch(__appScope); Object.assign(__appScope, { applyBatchCommonParamPatch });
const applyBatchCommonParam = createApplyBatchCommonParam(__appScope); Object.assign(__appScope, { applyBatchCommonParam });
const applyBatchCommonMeasurementGroupSetting = createApplyBatchCommonMeasurementGroupSetting(__appScope); Object.assign(__appScope, { applyBatchCommonMeasurementGroupSetting });
const batchEditors = useBatchEditors({
    isBrowseMode,
    activeSelectedNodeIds,
    nodeById,
    selectedNode,
    inspectorSelectedNode,
    selectedNodeIdsWithMeasurementGroups,
    batchCommonGraphicParamRows,
    batchCommonModelParamRows,
    batchCommonMeasurementGroupRows,
    batchCommonPropertyRowCount,
    layers,
    schemes,
    projectMeasurements,
    nodeDoubleClickDraft,
    setNodeDoubleClickDraft,
    updateParam,
    applyBatchCommonParam,
    applyBatchCommonParamPatch,
    applyBatchCommonMeasurementGroupSetting,
    assignSelectedNodesToModelLayer,
    updateSelectedNode,
    requireEditMode,
    libraryTemplateByKind,
  });
Object.assign(__appScope, { batchEditors });
const commitElementTreeNodeIdentity = createCommitElementTreeNodeIdentity(__appScope); Object.assign(__appScope, { commitElementTreeNodeIdentity });
const commitElementTreeContainerChildParam = createCommitElementTreeContainerChildParam(__appScope); Object.assign(__appScope, { commitElementTreeContainerChildParam });
const terminalVbaseFallback = createTerminalVbaseFallback(__appScope); Object.assign(__appScope, { terminalVbaseFallback });
const updateTerminalVbase = createUpdateTerminalVbase(__appScope); Object.assign(__appScope, { updateTerminalVbase });
const formatDeviceModelParamDisplayValue = (key: string, value: string) =>
    formatPowerBaseDisplayValue(key, value);
Object.assign(__appScope, { formatDeviceModelParamDisplayValue });
const renderParamHeader = createRenderParamHeader(__appScope); Object.assign(__appScope, { renderParamHeader });
const renderChineseParamHeader = (key: string, fallback = key) => (
    batchEditors.renderParamHeader(key, key, PARAM_LABELS[key] ?? fallback)
  );
Object.assign(__appScope, { renderChineseParamHeader });
const renderNodeDoubleClickDeviceParamRows = createRenderNodeDoubleClickDeviceParamRows(__appScope); Object.assign(__appScope, { renderNodeDoubleClickDeviceParamRows });
const renderNodeDoubleClickContainerParamRows = (node: ModelNode, view: ContainerDeviceParameterView) => (
    view.rows.map((row) => {
      const options = paramOptionsForSection(row.key, view.componentType);
      const displayValue = formatDeviceModelParamDisplayValue(row.key, row.value);
      return (
        <tr key={row.key}>
          {batchEditors.renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}
          <td>
            {row.key === "name" && view.kind === "container" ? (
              <BufferedTextInput value={node.name} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftPatch(node.id, { name: nextValue })} />
            ) : row.readonly || !row.paramKey ? (
              <input value={displayValue} readOnly />
            ) : options ? (
              <select value={displayValue} onChange={(event) => batchEditors.updateNodeDoubleClickDraftParam(node.id, row.paramKey!, event.target.value)}>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <BufferedTextInput value={displayValue} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftParam(node.id, row.paramKey!, nextValue)} />
            )}
          </td>
        </tr>
      );
    })
  );
Object.assign(__appScope, { renderNodeDoubleClickContainerParamRows });
const renderNodeDoubleClickTextParamTable = (dialogNode: ModelNode) => (
    <table className="param-table node-double-click-param-table">
      <tbody>
        <tr>
          {batchEditors.renderChineseParamHeader("text")}
          <td><BufferedTextarea rows={7} value={dialogNode.params.text || ""} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "text", nextValue)} autoFocus /></td>
        </tr>
        <tr>
          {batchEditors.renderChineseParamHeader("fontFamily")}
          <td>{batchEditors.renderNodeDoubleClickParamEditor(dialogNode, "fontFamily", dialogNode.params.fontFamily || "Arial", false)}</td>
        </tr>
        <tr>
          {batchEditors.renderChineseParamHeader("fontSize")}
          <td><BufferedTextInput type="number" min="8" max="160" value={dialogNode.params.fontSize || "24"} onCommit={(nextValue) => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "fontSize", nextValue)} /></td>
        </tr>
        <tr>
          {batchEditors.renderChineseParamHeader("textColor")}
          <td>{batchEditors.renderNodeDoubleClickColorEditor(dialogNode, "textColor", dialogNode.params.textColor || "#111827", "#111827")}</td>
        </tr>
        <tr>
          <th>文字样式</th>
          <td>
            <div className="text-style-actions">
              <TextStyleToggleButton
                active={(dialogNode.params.fontWeight || "400") !== "400"}
                label="加粗"
                onClick={() => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "fontWeight", (dialogNode.params.fontWeight || "400") !== "400" ? "400" : "700")}
              >
                <Bold aria-hidden="true" />
              </TextStyleToggleButton>
              <TextStyleToggleButton
                active={(dialogNode.params.fontStyle || "normal") === "italic"}
                label="斜体"
                onClick={() => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "fontStyle", (dialogNode.params.fontStyle || "normal") === "italic" ? "normal" : "italic")}
              >
                <Italic aria-hidden="true" />
              </TextStyleToggleButton>
              <TextStyleToggleButton
                active={(dialogNode.params.textDecoration || "none") === "underline"}
                label="下划线"
                onClick={() => batchEditors.updateNodeDoubleClickDraftParam(dialogNode.id, "textDecoration", (dialogNode.params.textDecoration || "none") === "underline" ? "none" : "underline")}
              >
                <Underline aria-hidden="true" />
              </TextStyleToggleButton>
            </div>
          </td>
        </tr>
        <tr>
          {batchEditors.renderChineseParamHeader("textAlign")}
          <td>{batchEditors.renderNodeDoubleClickParamEditor(dialogNode, "textAlign", dialogNode.params.textAlign || "center", false)}</td>
        </tr>
        <tr>
          {batchEditors.renderChineseParamHeader("verticalAlign")}
          <td>{batchEditors.renderNodeDoubleClickParamEditor(dialogNode, "verticalAlign", dialogNode.params.verticalAlign || "middle", false)}</td>
        </tr>
      </tbody>
    </table>
  );
Object.assign(__appScope, { renderNodeDoubleClickTextParamTable });
const rememberNodeDoubleClickDialogGuard = createRememberNodeDoubleClickDialogGuard(__appScope); Object.assign(__appScope, { rememberNodeDoubleClickDialogGuard });
const suppressNodeDoubleClickDialogEvent = createSuppressNodeDoubleClickDialogEvent(__appScope); Object.assign(__appScope, { suppressNodeDoubleClickDialogEvent });
const finishNodeDoubleClickDialogPointerOperation = createFinishNodeDoubleClickDialogPointerOperation(__appScope); Object.assign(__appScope, { finishNodeDoubleClickDialogPointerOperation });
const stopNodeDoubleClickDialogEvent = createStopNodeDoubleClickDialogEvent(__appScope); Object.assign(__appScope, { stopNodeDoubleClickDialogEvent });
const currentNodeDoubleClickDialogRect = createCurrentNodeDoubleClickDialogRect(__appScope); Object.assign(__appScope, { currentNodeDoubleClickDialogRect });
const startNodeDoubleClickDialogDrag = createStartNodeDoubleClickDialogDrag(__appScope); Object.assign(__appScope, { startNodeDoubleClickDialogDrag });
const startNodeDoubleClickDialogResize = createStartNodeDoubleClickDialogResize(__appScope); Object.assign(__appScope, { startNodeDoubleClickDialogResize });
const cancelNodeDoubleClickDialog = createCancelNodeDoubleClickDialog(__appScope); Object.assign(__appScope, { cancelNodeDoubleClickDialog });
const confirmNodeDoubleClickDialog = createConfirmNodeDoubleClickDialog(__appScope); Object.assign(__appScope, { confirmNodeDoubleClickDialog });
const renderNodeDoubleClickDialog = createRenderNodeDoubleClickDialog(__appScope); Object.assign(__appScope, { renderNodeDoubleClickDialog });
const contextMenuPlacement = createContextMenuPlacement(__appScope); Object.assign(__appScope, { contextMenuPlacement });
const contextMenuStyle = createContextMenuStyle(__appScope); Object.assign(__appScope, { contextMenuStyle });
const contextMenuClassName = createContextMenuClassName(__appScope); Object.assign(__appScope, { contextMenuClassName });
const stopSidePanelEventPropagation = createStopSidePanelEventPropagation(__appScope); Object.assign(__appScope, { stopSidePanelEventPropagation });
const setSidePanelMode = createSetSidePanelMode(__appScope); Object.assign(__appScope, { setSidePanelMode });
const pointerRelatedTargetInside = (event: PointerEvent<HTMLElement>, selector: string) =>
    event.relatedTarget instanceof Element && Boolean(event.relatedTarget.closest(selector));
Object.assign(__appScope, { pointerRelatedTargetInside });
const pointerClientTargetInside = createPointerClientTargetInside(__appScope); Object.assign(__appScope, { pointerClientTargetInside });
const pointerInsideElementRect = createPointerInsideElementRect(__appScope); Object.assign(__appScope, { pointerInsideElementRect });
const pointerInsideFloatingPanelBounds = (event: PointerEvent<HTMLElement>) =>
    pointerInsideElementRect(event, leftPanelRef.current, 1) ||
    pointerInsideElementRect(event, rightPanelRef.current, 1);
Object.assign(__appScope, { pointerInsideFloatingPanelBounds });
const updateAutoPanelVisibility = createUpdateAutoPanelVisibility(__appScope); Object.assign(__appScope, { updateAutoPanelVisibility });
const activateInspectorFromCanvas = createActivateInspectorFromCanvas(__appScope); Object.assign(__appScope, { activateInspectorFromCanvas });
const openMeasurementEditorForNode = createOpenMeasurementEditorForNode(__appScope); Object.assign(__appScope, { openMeasurementEditorForNode });
const handleSidePanelPointerLeave = createHandleSidePanelPointerLeave(__appScope); Object.assign(__appScope, { handleSidePanelPointerLeave });
const hideAutoPanelsFromWorkspace = createHideAutoPanelsFromWorkspace(__appScope); Object.assign(__appScope, { hideAutoPanelsFromWorkspace });
const interactiveStaticDrawingNeedsExplicitFinish = (kind: DeviceKind) =>
    kind === "static-polyline" || kind === "static-elbow-connector";
Object.assign(__appScope, { interactiveStaticDrawingNeedsExplicitFinish });
const appendDistinctStaticDrawingPoint = createAppendDistinctStaticDrawingPoint(__appScope); Object.assign(__appScope, { appendDistinctStaticDrawingPoint });
const staticDrawingPreviewPoints = (drawing: StaticDrawingState) =>
    appendDistinctStaticDrawingPoint(drawing.points, drawing.previewPoint);
Object.assign(__appScope, { staticDrawingPreviewPoints });
const staticDrawingPathData = (points: Point[]) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
Object.assign(__appScope, { staticDrawingPathData });
const renderStaticBoxDrawingPreview = createRenderStaticBoxDrawingPreview(__appScope); Object.assign(__appScope, { renderStaticBoxDrawingPreview });
const startInteractiveStaticDrawing = createStartInteractiveStaticDrawing(__appScope); Object.assign(__appScope, { startInteractiveStaticDrawing });
const cancelInteractiveStaticDrawing = createCancelInteractiveStaticDrawing(__appScope); Object.assign(__appScope, { cancelInteractiveStaticDrawing });
const finishInteractiveStaticDrawing = createFinishInteractiveStaticDrawing(__appScope); Object.assign(__appScope, { finishInteractiveStaticDrawing });
const appendStaticDrawingPoint = createAppendStaticDrawingPoint(__appScope); Object.assign(__appScope, { appendStaticDrawingPoint });
const updateInteractiveStaticDrawingPreview = createUpdateInteractiveStaticDrawingPreview(__appScope); Object.assign(__appScope, { updateInteractiveStaticDrawingPreview });
const renderInteractiveStaticDrawingPreview = createRenderInteractiveStaticDrawingPreview(__appScope); Object.assign(__appScope, { renderInteractiveStaticDrawingPreview });
const startLibraryDevicePlacement = createStartLibraryDevicePlacement(__appScope); Object.assign(__appScope, { startLibraryDevicePlacement });
const startLibraryGraphTemplatePlacement = createStartLibraryGraphTemplatePlacement(__appScope); Object.assign(__appScope, { startLibraryGraphTemplatePlacement });
const cancelLibraryPlacement = createCancelLibraryPlacement(__appScope); Object.assign(__appScope, { cancelLibraryPlacement });
const updateLibraryPlacementPreview = createUpdateLibraryPlacementPreview(__appScope); Object.assign(__appScope, { updateLibraryPlacementPreview });
const clearLibraryPlacementPreview = createClearLibraryPlacementPreview(__appScope); Object.assign(__appScope, { clearLibraryPlacementPreview });
const placeLibraryDeviceAtPoint = createPlaceLibraryDeviceAtPoint(__appScope); Object.assign(__appScope, { placeLibraryDeviceAtPoint });
const commitLibraryPlacementAtPoint = createCommitLibraryPlacementAtPoint(__appScope); Object.assign(__appScope, { commitLibraryPlacementAtPoint });
const renderLibraryPlacementPreview = createRenderLibraryPlacementPreview(__appScope); Object.assign(__appScope, { renderLibraryPlacementPreview });
const startSidePanelResize = createStartSidePanelResize(__appScope); Object.assign(__appScope, { startSidePanelResize });
const startCanvasResize = createStartCanvasResize(__appScope); Object.assign(__appScope, { startCanvasResize });
const startCanvasResizeFromRightOverlay = createStartCanvasResizeFromRightOverlay(__appScope); Object.assign(__appScope, { startCanvasResizeFromRightOverlay });
const startCanvasResizeFromLeftOverlay = createStartCanvasResizeFromLeftOverlay(__appScope); Object.assign(__appScope, { startCanvasResizeFromLeftOverlay });
const startCanvasResizeFromBottomOverlay = createStartCanvasResizeFromBottomOverlay(__appScope); Object.assign(__appScope, { startCanvasResizeFromBottomOverlay });
const startCanvasResizeFromTopOverlay = createStartCanvasResizeFromTopOverlay(__appScope); Object.assign(__appScope, { startCanvasResizeFromTopOverlay });
const startStatusbarResize = createStartStatusbarResize(__appScope); Object.assign(__appScope, { startStatusbarResize });
const currentTopologyWarningPanelRect = createCurrentTopologyWarningPanelRect(__appScope); Object.assign(__appScope, { currentTopologyWarningPanelRect });
const startTopologyWarningPanelDrag = createStartTopologyWarningPanelDrag(__appScope); Object.assign(__appScope, { startTopologyWarningPanelDrag });
const startTopologyWarningPanelResize = createStartTopologyWarningPanelResize(__appScope); Object.assign(__appScope, { startTopologyWarningPanelResize });
const renderSidePanelModeControls = createRenderSidePanelModeControls(__appScope); Object.assign(__appScope, { renderSidePanelModeControls });
const renderSidePanelEdgeTrigger = createRenderSidePanelEdgeTrigger(__appScope); Object.assign(__appScope, { renderSidePanelEdgeTrigger });
const normalizeScale = (value: number, fallback = 1) => normalizeScaleValue(value, fallback); Object.assign(__appScope, { normalizeScale });
const signedScale = (value: number, signSource: number) => Math.abs(normalizeScale(value)) * (Math.sign(signSource) || 1); Object.assign(__appScope, { signedScale });
const normalizeStaticBoxDimension = createNormalizeStaticBoxDimension(__appScope); Object.assign(__appScope, { normalizeStaticBoxDimension });
const toLocalNodePoint = createToLocalNodePoint(__appScope); Object.assign(__appScope, { toLocalNodePoint });
const snapshotSingleTransformNode = (node: ModelNode): GroupTransformNodeSnapshot => ({
    position: { ...node.position },
    rotation: node.rotation,
    scale: node.scale,
    scaleX: node.scaleX,
    scaleY: node.scaleY
  });
Object.assign(__appScope, { snapshotSingleTransformNode });
const singleTransformBaseNode = (drag: SingleTransformDrag, node: ModelNode): ModelNode => ({
    ...node,
    position: { ...drag.originalNode.position },
    rotation: drag.originalNode.rotation,
    scale: drag.originalNode.scale,
    scaleX: drag.originalNode.scaleX,
    scaleY: drag.originalNode.scaleY
  });
Object.assign(__appScope, { singleTransformBaseNode });
const singleTransformNodeUpdate = createSingleTransformNodeUpdate(__appScope); Object.assign(__appScope, { singleTransformNodeUpdate });
const signedScaleFromRotatedHandleDelta = createSignedScaleFromRotatedHandleDelta(__appScope); Object.assign(__appScope, { signedScaleFromRotatedHandleDelta });
const signedScaleFromUprightHandleDelta = createSignedScaleFromUprightHandleDelta(__appScope); Object.assign(__appScope, { signedScaleFromUprightHandleDelta });
const proportionalSignedScaleFromHandleDelta = createProportionalSignedScaleFromHandleDelta(__appScope); Object.assign(__appScope, { proportionalSignedScaleFromHandleDelta });
const proportionalSignedScaleFromUprightHandleDelta = createProportionalSignedScaleFromUprightHandleDelta(__appScope); Object.assign(__appScope, { proportionalSignedScaleFromUprightHandleDelta });
const snapshotGroupTransformNodes = (unit: CanvasLayoutUnit) =>
    Object.fromEntries(
      unit.nodeIds.flatMap((nodeId) => {
        const node = nodeById.get(nodeId);
        return node
          ? [[
              node.id,
              {
                position: { ...node.position },
                rotation: node.rotation,
                scale: node.scale,
                scaleX: node.scaleX,
                scaleY: node.scaleY
              }
            ]]
          : [];
      })
    ) as Record<string, GroupTransformNodeSnapshot>;
Object.assign(__appScope, { snapshotGroupTransformNodes });
const edgeSnapshotFallbackPoints = (edge: Edge | undefined) =>
    edge
      ? [
          edge.sourcePoint ? { ...edge.sourcePoint } : null,
          ...(edge.manualPoints?.map((point) => ({ ...point })) ?? []),
          edge.targetPoint ? { ...edge.targetPoint } : null
        ].filter((point): point is Point => Boolean(point))
      : [];
Object.assign(__appScope, { edgeSnapshotFallbackPoints });
const currentStoredRoutePointsForEdge = createCurrentStoredRoutePointsForEdge(__appScope); Object.assign(__appScope, { currentStoredRoutePointsForEdge });
const snapshotGroupTransformEdgeRoutes = (unit: CanvasLayoutUnit): GroupTransformEdgeRouteSnapshot[] =>
    unit.edgeIds.flatMap((edgeId) => {
      const routePoints = currentStoredRoutePointsForEdge(edgeById.get(edgeId));
      return routePoints.length >= 2
        ? [{
            edgeId,
            points: routePoints.map((point) => ({ ...point }))
          }]
        : [];
    });
Object.assign(__appScope, { snapshotGroupTransformEdgeRoutes });
const buildMirrorLayoutUnitEdgeUpdates = createBuildMirrorLayoutUnitEdgeUpdates(__appScope); Object.assign(__appScope, { buildMirrorLayoutUnitEdgeUpdates });
const buildRotateLayoutUnitEdgeUpdates = createBuildRotateLayoutUnitEdgeUpdates(__appScope); Object.assign(__appScope, { buildRotateLayoutUnitEdgeUpdates });
const buildGroupTransformEdgeUpdates = createBuildGroupTransformEdgeUpdates(__appScope); Object.assign(__appScope, { buildGroupTransformEdgeUpdates });
const overlayEdgeUpdatesForTransform = createOverlayEdgeUpdatesForTransform(__appScope); Object.assign(__appScope, { overlayEdgeUpdatesForTransform });
const startGroupTransformDrag = createStartGroupTransformDrag(__appScope); Object.assign(__appScope, { startGroupTransformDrag });
const startSingleTransformDrag = createStartSingleTransformDrag(__appScope); Object.assign(__appScope, { startSingleTransformDrag });
const startGroupMoveDrag = createStartGroupMoveDrag(__appScope); Object.assign(__appScope, { startGroupMoveDrag });
const buildGroupTransformNodeUpdates = createBuildGroupTransformNodeUpdates(__appScope); Object.assign(__appScope, { buildGroupTransformNodeUpdates });
const rotateLayoutUnitNodeUpdates = createRotateLayoutUnitNodeUpdates(__appScope); Object.assign(__appScope, { rotateLayoutUnitNodeUpdates });
const mirrorLayoutUnitNodeUpdates = createMirrorLayoutUnitNodeUpdates(__appScope); Object.assign(__appScope, { mirrorLayoutUnitNodeUpdates });
const busAnchorFromEvent = createBusAnchorFromEvent(__appScope); Object.assign(__appScope, { busAnchorFromEvent });
const busAnchorFromPoint = createBusAnchorFromPoint(__appScope); Object.assign(__appScope, { busAnchorFromPoint });
const isPointOnBus = createIsPointOnBus(__appScope); Object.assign(__appScope, { isPointOnBus });
const isPointNearBus = createIsPointNearBus(__appScope); Object.assign(__appScope, { isPointNearBus });
const connectTargetSnapPoint = (target: ConnectTarget): Point =>
    target.point ?? getTerminalPoint(target.node, target.terminalId);
Object.assign(__appScope, { connectTargetSnapPoint });
const findRewireTargetAtPoint = createFindRewireTargetAtPoint(__appScope); Object.assign(__appScope, { findRewireTargetAtPoint });
const findConnectTargetAtPoint = createFindConnectTargetAtPoint(__appScope); Object.assign(__appScope, { findConnectTargetAtPoint });
const findRoutableLineEndpointTargetAtPoint = createFindRoutableLineEndpointTargetAtPoint(__appScope); Object.assign(__appScope, { findRoutableLineEndpointTargetAtPoint });
const commitRoutableLineDevice = createCommitRoutableLineDevice(__appScope); Object.assign(__appScope, { commitRoutableLineDevice });
const startRoutableLineFromTerminal = createStartRoutableLineFromTerminal(__appScope); Object.assign(__appScope, { startRoutableLineFromTerminal });
const finishRoutableLineToTarget = createFinishRoutableLineToTarget(__appScope); Object.assign(__appScope, { finishRoutableLineToTarget });
const updateRoutableLineEndpointDrag = createUpdateRoutableLineEndpointDrag(__appScope); Object.assign(__appScope, { updateRoutableLineEndpointDrag });
const startRoutableLineEndpointDrag = createStartRoutableLineEndpointDrag(__appScope); Object.assign(__appScope, { startRoutableLineEndpointDrag });
const finishRoutableLineEndpointDrag = createFinishRoutableLineEndpointDrag(__appScope); Object.assign(__appScope, { finishRoutableLineEndpointDrag });
const commitNewConnectionEdge = createCommitNewConnectionEdge(__appScope); Object.assign(__appScope, { commitNewConnectionEdge });
const finishConnectToTarget = createFinishConnectToTarget(__appScope); Object.assign(__appScope, { finishConnectToTarget });
const finishRewiring = createFinishRewiring(__appScope); Object.assign(__appScope, { finishRewiring });
const handleDrop = createHandleDrop(__appScope); Object.assign(__appScope, { handleDrop });
const handleRoutableLineNodePointerDown = createHandleRoutableLineNodePointerDown(__appScope); Object.assign(__appScope, { handleRoutableLineNodePointerDown });
const handleNodePointerDown = createHandleNodePointerDown(__appScope); Object.assign(__appScope, { handleNodePointerDown });
const handleRoutableLineNodePathPointerDown = createHandleRoutableLineNodePathPointerDown(__appScope); Object.assign(__appScope, { handleRoutableLineNodePathPointerDown });
const handlePointerMove = createHandlePointerMove(__appScope); Object.assign(__appScope, { handlePointerMove });
const finishCanvasPanning = createFinishCanvasPanning(__appScope); Object.assign(__appScope, { finishCanvasPanning });
const startCanvasPanning = createStartCanvasPanning(__appScope); Object.assign(__appScope, { startCanvasPanning });
const handleCanvasPointerDownCapture = createHandleCanvasPointerDownCapture(__appScope); Object.assign(__appScope, { handleCanvasPointerDownCapture });
const clientPointInsideRenderedCanvas = createClientPointInsideRenderedCanvas(__appScope); Object.assign(__appScope, { clientPointInsideRenderedCanvas });
const focusCanvasKeyboardShortcutHost = createFocusCanvasKeyboardShortcutHost(__appScope); Object.assign(__appScope, { focusCanvasKeyboardShortcutHost });
const wheelZoomAnchorFromClient = createWheelZoomAnchorFromClient(__appScope); Object.assign(__appScope, { wheelZoomAnchorFromClient });
const flushPendingWheelZoom = createFlushPendingWheelZoom(__appScope); Object.assign(__appScope, { flushPendingWheelZoom });
const scheduleWheelZoom = createScheduleWheelZoom(__appScope); Object.assign(__appScope, { scheduleWheelZoom });
const zoomCanvasFromWheelEvent = createZoomCanvasFromWheelEvent(__appScope); Object.assign(__appScope, { zoomCanvasFromWheelEvent });
const handleWheel = createHandleWheel(__appScope); Object.assign(__appScope, { handleWheel });
const deleteSelected = createDeleteSelected(__appScope); Object.assign(__appScope, { deleteSelected });
const runContextMenuAction = createRunContextMenuAction(__appScope); Object.assign(__appScope, { runContextMenuAction });
const readjustMovedBusConnectionRoutes = createReadjustMovedBusConnectionRoutes(__appScope); Object.assign(__appScope, { readjustMovedBusConnectionRoutes });
const readjustActiveLayerBusEndpointRoutes = createReadjustActiveLayerBusEndpointRoutes(__appScope); Object.assign(__appScope, { readjustActiveLayerBusEndpointRoutes });
const commitLayoutNodePositions = createCommitLayoutNodePositions(__appScope); Object.assign(__appScope, { commitLayoutNodePositions });
const applySelectedNodeLayout = createApplySelectedNodeLayout(__appScope); Object.assign(__appScope, { applySelectedNodeLayout });
const autoSpreadCanvasGraphics = createAutoSpreadCanvasGraphics(__appScope); Object.assign(__appScope, { autoSpreadCanvasGraphics });
const autoAlignCanvasGraphics = createAutoAlignCanvasGraphics(__appScope); Object.assign(__appScope, { autoAlignCanvasGraphics });
const voltageBaseSetOptions = useMemo(createAppHookCallback121(__appScope), [nodes]);
Object.assign(__appScope, { voltageBaseSetOptions });
const defaultVoltageBaseSetValue = createDefaultVoltageBaseSetValue(__appScope); Object.assign(__appScope, { defaultVoltageBaseSetValue });
const voltageBaseSetCandidateNodes = useMemo(createAppHookCallback122(__appScope), [activeSelectedNodeIds, nodes]);
Object.assign(__appScope, { voltageBaseSetCandidateNodes });
const voltageBaseSetHasUniformTargets = voltageBaseSetCandidateNodes.some((node) => voltageBaseSettingModeForNode(node) === "uniform"); Object.assign(__appScope, { voltageBaseSetHasUniformTargets });
const voltageBaseSetHasTerminalTargets = voltageBaseSetCandidateNodes.some((node) => voltageBaseSettingModeForNode(node) === "terminal"); Object.assign(__appScope, { voltageBaseSetHasTerminalTargets });
const recommendedVoltageBaseSetMode = createRecommendedVoltageBaseSetMode(__appScope); Object.assign(__appScope, { recommendedVoltageBaseSetMode });
const voltageBaseSetModeLabel =
    voltageBaseSetMode === "byDevice"
      ? "按设备类型自动设置"
      : voltageBaseSetMode === "terminal"
        ? "按端子设置"
        : "统一设置";
Object.assign(__appScope, { voltageBaseSetModeLabel });
const voltageBaseSetTerminalRows = useMemo(createAppHookCallback123(__appScope), [voltageBaseSetCandidateNodes, voltageBaseTerminalValues]);
Object.assign(__appScope, { voltageBaseSetTerminalRows });
const voltageBaseTerminalRowKey = (row: { nodeId: string; terminalId: string }) => `${row.nodeId}:${row.terminalId}`;
Object.assign(__appScope, { voltageBaseTerminalRowKey });
const activeVoltageBaseTerminalRow =
    voltageBaseSetTerminalRows.find((row) => voltageBaseTerminalRowKey(row) === activeVoltageBaseTerminalKey)
    ?? voltageBaseSetTerminalRows[0]
    ?? null;
Object.assign(__appScope, { activeVoltageBaseTerminalRow });
const defaultVoltageBaseTerminalValues = createDefaultVoltageBaseTerminalValues(__appScope); Object.assign(__appScope, { defaultVoltageBaseTerminalValues });
const defaultVoltageBaseTerminalKey = createDefaultVoltageBaseTerminalKey(__appScope); Object.assign(__appScope, { defaultVoltageBaseTerminalKey });
const hasVoltageBaseTerminalValues = (values: VoltageBaseTerminalValuesByNodeId) =>
    Object.values(values).some((terminalValues) =>
      Object.values(terminalValues).some((value) => value.trim().length > 0)
    );
Object.assign(__appScope, { hasVoltageBaseTerminalValues });
const activeVoltageBaseTerminalValues = createActiveVoltageBaseTerminalValues(__appScope); Object.assign(__appScope, { activeVoltageBaseTerminalValues });
const setVoltageBaseTerminalValue = createSetVoltageBaseTerminalValue(__appScope); Object.assign(__appScope, { setVoltageBaseTerminalValue });
const emptyVoltageBaseSetResult = () => ({ nodes, nodeUpdates: [], targetNodeIds: [], changedNodeIds: [] }); Object.assign(__appScope, { emptyVoltageBaseSetResult });
const mergeVoltageBaseSetResults = createMergeVoltageBaseSetResults(__appScope); Object.assign(__appScope, { mergeVoltageBaseSetResults });
const voltageBaseSetReady = createVoltageBaseSetReady(__appScope); Object.assign(__appScope, { voltageBaseSetReady });
const voltageBaseSetPreviewByScope = useMemo<Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>>(createAppHookCallback124(__appScope), [activeSelectedNodeIds, activeVoltageBaseTerminalKey, edges, nodes, voltageBaseSetDialogOpen, voltageBaseSetHasTerminalTargets, voltageBaseSetHasUniformTargets, voltageBaseSetMode, voltageBaseSetValue, voltageBaseTerminalValues]);
Object.assign(__appScope, { voltageBaseSetPreviewByScope });
const voltageBaseSetResultForScope = createVoltageBaseSetResultForScope(__appScope); Object.assign(__appScope, { voltageBaseSetResultForScope });
const openVoltageBaseSetDialog = createOpenVoltageBaseSetDialog(__appScope); Object.assign(__appScope, { openVoltageBaseSetDialog });
useEffect(createAppHookCallback125(__appScope), [activeVoltageBaseTerminalKey, voltageBaseSetDialogOpen, voltageBaseSetTerminalRows]);
const confirmVoltageBaseSetDialog = createConfirmVoltageBaseSetDialog(__appScope); Object.assign(__appScope, { confirmVoltageBaseSetDialog });
const voltageBaseClearPreviewByScope = useMemo<Partial<Record<VoltageBaseClearScope, ReturnType<typeof clearVoltageBaseValuesForScope>>>>(createAppHookCallback126(__appScope), [activeSelectedNodeIds, edges, nodes, voltageBaseClearDialogOpen]);
const voltageBaseClearResultForScope = (scope: VoltageBaseClearScope) =>
    voltageBaseClearPreviewByScope[scope] ?? clearVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope);
Object.assign(__appScope, { voltageBaseClearResultForScope });
const openVoltageBaseClearDialog = createOpenVoltageBaseClearDialog(__appScope); Object.assign(__appScope, { openVoltageBaseClearDialog });
const confirmVoltageBaseClearDialog = createConfirmVoltageBaseClearDialog(__appScope); Object.assign(__appScope, { confirmVoltageBaseClearDialog });
const connectionRedrawViewportBounds = createConnectionRedrawViewportBounds(__appScope); Object.assign(__appScope, { connectionRedrawViewportBounds });
const connectionRedrawEdgeIdsForScope = createConnectionRedrawEdgeIdsForScope(__appScope); Object.assign(__appScope, { connectionRedrawEdgeIdsForScope });
const connectionRedrawLineNodeIdsForScope = createConnectionRedrawLineNodeIdsForScope(__appScope); Object.assign(__appScope, { connectionRedrawLineNodeIdsForScope });
const connectionRedrawTargetsForScope = createConnectionRedrawTargetsForScope(__appScope); Object.assign(__appScope, { connectionRedrawTargetsForScope });
const redrawConnectionRoutes = createRedrawConnectionRoutes(__appScope); Object.assign(__appScope, { redrawConnectionRoutes });
const openConnectionRedrawDialog = createOpenConnectionRedrawDialog(__appScope); Object.assign(__appScope, { openConnectionRedrawDialog });
const confirmConnectionRedrawDialog = createConfirmConnectionRedrawDialog(__appScope); Object.assign(__appScope, { confirmConnectionRedrawDialog });
const alignSelected = createAlignSelected(__appScope); Object.assign(__appScope, { alignSelected });
const distributeSelected = createDistributeSelected(__appScope); Object.assign(__appScope, { distributeSelected });
const findSchemeForProject = (projectId: string) =>
    findProjectRecordInSchemes(schemes, projectId)?.scheme;
Object.assign(__appScope, { findSchemeForProject });
const toggleSchemeExpanded = createToggleSchemeExpanded(__appScope); Object.assign(__appScope, { toggleSchemeExpanded });
const promptUniqueRecordName = createPromptUniqueRecordName(__appScope); Object.assign(__appScope, { promptUniqueRecordName });
const cloneProjectRecord = (project: SavedProjectRecord, suffix = "副本", existingNames: string[] = []) =>
    copySavedProjectWithUniqueName(project, existingNames, suffix);
Object.assign(__appScope, { cloneProjectRecord });
const cloneProjectRecordWithName = (project: SavedProjectRecord, name: string) =>
    createSavedProject(name, project.project);
Object.assign(__appScope, { cloneProjectRecordWithName });
const hasSameName = (name: string, names: string[]) => names.some((item) => item.trim() === name.trim()); Object.assign(__appScope, { hasSameName });
const cloneProjectRecordForPaste = createCloneProjectRecordForPaste(__appScope); Object.assign(__appScope, { cloneProjectRecordForPaste });
const schemePathForScheme = createSchemePathForScheme(__appScope); Object.assign(__appScope, { schemePathForScheme });
const schemePathForProject = createSchemePathForProject(__appScope); Object.assign(__appScope, { schemePathForProject });
const schemePathForRecord = createSchemePathForRecord(__appScope); Object.assign(__appScope, { schemePathForRecord });
const cloneSchemeRecord = createCloneSchemeRecord(__appScope); Object.assign(__appScope, { cloneSchemeRecord });
const cloneSchemeRecordWithName = createCloneSchemeRecordWithName(__appScope); Object.assign(__appScope, { cloneSchemeRecordWithName });
const cloneSchemeRecordForPaste = createCloneSchemeRecordForPaste(__appScope); Object.assign(__appScope, { cloneSchemeRecordForPaste });
const clearActiveProjectDisplay = createClearActiveProjectDisplay(__appScope); Object.assign(__appScope, { clearActiveProjectDisplay });
const loadSavedProject = createLoadSavedProject(__appScope); Object.assign(__appScope, { loadSavedProject });
const loadSavedProjectRecord = createLoadSavedProjectRecord(__appScope); Object.assign(__appScope, { loadSavedProjectRecord });
const requestUnsavedChangeAction = createRequestUnsavedChangeAction(__appScope); Object.assign(__appScope, { requestUnsavedChangeAction });
const requestLoadSavedProject = createRequestLoadSavedProject(__appScope); Object.assign(__appScope, { requestLoadSavedProject });
const resolveUnsavedChangeAction = createResolveUnsavedChangeAction(__appScope); Object.assign(__appScope, { resolveUnsavedChangeAction });
const createSchemeRecord = createCreateSchemeRecord(__appScope); Object.assign(__appScope, { createSchemeRecord });
const renameSchemeRecord = createRenameSchemeRecord(__appScope); Object.assign(__appScope, { renameSchemeRecord });
const duplicateSchemeRecord = createDuplicateSchemeRecord(__appScope); Object.assign(__appScope, { duplicateSchemeRecord });
const deleteSchemeRecord = createDeleteSchemeRecord(__appScope); Object.assign(__appScope, { deleteSchemeRecord });
const copySelectedRecord = createCopySelectedRecord(__appScope); Object.assign(__appScope, { copySelectedRecord });
const deleteSelectedRecords = createDeleteSelectedRecords(__appScope); Object.assign(__appScope, { deleteSelectedRecords });
const copyProjectRecord = createCopyProjectRecord(__appScope); Object.assign(__appScope, { copyProjectRecord });
const copySchemeRecord = createCopySchemeRecord(__appScope); Object.assign(__appScope, { copySchemeRecord });
const pasteSchemeClipboardRecord = createPasteSchemeClipboardRecord(__appScope); Object.assign(__appScope, { pasteSchemeClipboardRecord });
const pasteProjectClipboardRecord = createPasteProjectClipboardRecord(__appScope); Object.assign(__appScope, { pasteProjectClipboardRecord });
const pasteSelectedRecord = createPasteSelectedRecord(__appScope); Object.assign(__appScope, { pasteSelectedRecord });
const commitProjectRecordMove = createCommitProjectRecordMove(__appScope); Object.assign(__appScope, { commitProjectRecordMove });
const resolveRecordPasteConflict = createResolveRecordPasteConflict(__appScope); Object.assign(__appScope, { resolveRecordPasteConflict });
const moveProjectRecordToScheme = createMoveProjectRecordToScheme(__appScope); Object.assign(__appScope, { moveProjectRecordToScheme });
const moveSchemeRecordToScheme = createMoveSchemeRecordToScheme(__appScope); Object.assign(__appScope, { moveSchemeRecordToScheme });
const saveActiveProjectPointer = createSaveActiveProjectPointer(__appScope); Object.assign(__appScope, { saveActiveProjectPointer });
const setActiveLayer = createSetActiveLayer(__appScope); Object.assign(__appScope, { setActiveLayer });
const nextDefaultModelLayerName = createNextDefaultModelLayerName(__appScope); Object.assign(__appScope, { nextDefaultModelLayerName });
const addModelLayer = createAddModelLayer(__appScope); Object.assign(__appScope, { addModelLayer });
const clearLayerNameDraft = createClearLayerNameDraft(__appScope); Object.assign(__appScope, { clearLayerNameDraft });
const commitModelLayerName = createCommitModelLayerName(__appScope); Object.assign(__appScope, { commitModelLayerName });
const handleLayerNameInputKeyDown = createHandleLayerNameInputKeyDown(__appScope); Object.assign(__appScope, { handleLayerNameInputKeyDown });
const toggleModelLayerVisibility = createToggleModelLayerVisibility(__appScope); Object.assign(__appScope, { toggleModelLayerVisibility });
const setAllModelLayersVisibility = createSetAllModelLayersVisibility(__appScope); Object.assign(__appScope, { setAllModelLayersVisibility });
const moveModelLayer = createMoveModelLayer(__appScope); Object.assign(__appScope, { moveModelLayer });
const deleteModelLayer = createDeleteModelLayer(__appScope); Object.assign(__appScope, { deleteModelLayer });
const renderLayerManager = () => (
    <div className="layer-manager">
      <div className="layer-manager-toolbar">
        <button type="button" onClick={addModelLayer}>新增图层</button>
        <button type="button" onClick={() => setAllModelLayersVisibility(true)}>全部显示</button>
        <button type="button" onClick={() => setAllModelLayersVisibility(false)}>全部隐藏</button>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => (
          <div key={layer.id} className={`layer-row ${layer.id === activeLayerId ? "active" : ""}`}>
            <label className="layer-row-control" title={layer.id === activeLayerId ? "激活图层必须显示" : "显示/隐藏图层"}>
              <input
                type="checkbox"
                checked={layer.visible}
                disabled={layer.id === activeLayerId}
                onChange={() => toggleModelLayerVisibility(layer.id)}
              />
              显示
            </label>
            <label className="layer-row-control">
              <input
                type="radio"
                name="active-layer"
                checked={layer.id === activeLayerId}
                onChange={() => setActiveLayer(layer.id)}
              />
              激活
            </label>
            <BufferedTextInput
              className="layer-name-input"
              aria-label={`图层名称：${layer.name}`}
              value={layer.name}
              disabled={isBrowseMode}
              onCommit={(nextValue) => commitModelLayerName(layer.id, nextValue)}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <button type="button" onClick={() => moveModelLayer(layer.id, -1)} disabled={index === 0} title="图层上移">上移</button>
            <button type="button" onClick={() => moveModelLayer(layer.id, 1)} disabled={index === layers.length - 1} title="图层下移">下移</button>
            <button type="button" onClick={() => deleteModelLayer(layer.id)} disabled={layers.length <= 1} title="删除图层">删除</button>
          </div>
        ))}
      </div>
    </div>
  );
Object.assign(__appScope, { renderLayerManager });
const renderDeviceDefinitionMeasurementPanel = createRenderDeviceDefinitionMeasurementPanel(__appScope); Object.assign(__appScope, { renderDeviceDefinitionMeasurementPanel });
const renderMeasurementConfigDialog = createRenderMeasurementConfigDialog(__appScope); Object.assign(__appScope, { renderMeasurementConfigDialog });
const renderMeasurementEditorDialog = createRenderMeasurementEditorDialog(__appScope); Object.assign(__appScope, { renderMeasurementEditorDialog });
const saveCurrentProject = createSaveCurrentProject(__appScope); Object.assign(__appScope, { saveCurrentProject });
const renameProjectRecord = createRenameProjectRecord(__appScope); Object.assign(__appScope, { renameProjectRecord });
const duplicateProjectRecord = createDuplicateProjectRecord(__appScope); Object.assign(__appScope, { duplicateProjectRecord });
const duplicateSelectedProjectRecords = createDuplicateSelectedProjectRecords(__appScope); Object.assign(__appScope, { duplicateSelectedProjectRecords });
const duplicateSelectedSchemeRecords = createDuplicateSelectedSchemeRecords(__appScope); Object.assign(__appScope, { duplicateSelectedSchemeRecords });
const deleteProjectRecord = createDeleteProjectRecord(__appScope); Object.assign(__appScope, { deleteProjectRecord });
const createBlankProject = createCreateBlankProject(__appScope); Object.assign(__appScope, { createBlankProject });
const programmaticAddDevice = createProgrammaticAddDevice(__appScope); Object.assign(__appScope, { programmaticAddDevice });
const programmaticCreateScheme = createProgrammaticCreateScheme(__appScope); Object.assign(__appScope, { programmaticCreateScheme });
const programmaticCreateBlankProject = createProgrammaticCreateBlankProject(__appScope); Object.assign(__appScope, { programmaticCreateBlankProject });
const programmaticSelectDevices = createProgrammaticSelectDevices(__appScope); Object.assign(__appScope, { programmaticSelectDevices });
const programmaticGroupSelected = createProgrammaticGroupSelected(__appScope); Object.assign(__appScope, { programmaticGroupSelected });
const programmaticDeleteDevices = createProgrammaticDeleteDevices(__appScope); Object.assign(__appScope, { programmaticDeleteDevices });
const programmaticUpdateDeviceProperty = createProgrammaticUpdateDeviceProperty(__appScope); Object.assign(__appScope, { programmaticUpdateDeviceProperty });
const programmaticSave = createProgrammaticSave(__appScope); Object.assign(__appScope, { programmaticSave });
const programmaticSaveSelectionAsTemplate = createProgrammaticSaveSelectionAsTemplate(__appScope); Object.assign(__appScope, { programmaticSaveSelectionAsTemplate });
const locateTopologyError = createLocateTopologyError(__appScope); Object.assign(__appScope, { locateTopologyError });
const runTopologyCalculation = createRunTopologyCalculation(__appScope); Object.assign(__appScope, { runTopologyCalculation });
const getEdgeEndpointPoint = createGetEdgeEndpointPoint(__appScope); Object.assign(__appScope, { getEdgeEndpointPoint });
const centerViewOnPoint = createCenterViewOnPoint(__appScope); Object.assign(__appScope, { centerViewOnPoint });
const viewportCenterAnchorForPoint = createViewportCenterAnchorForPoint(__appScope); Object.assign(__appScope, { viewportCenterAnchorForPoint });
const setViewBoxAtViewportCenter = createSetViewBoxAtViewportCenter(__appScope); Object.assign(__appScope, { setViewBoxAtViewportCenter });
const centerViewBoxOnPoint = createCenterViewBoxOnPoint(__appScope); Object.assign(__appScope, { centerViewBoxOnPoint });
const centerViewOnPointAtZoom = createCenterViewOnPointAtZoom(__appScope); Object.assign(__appScope, { centerViewOnPointAtZoom });
const zoomViewportAtCenter = createZoomViewportAtCenter(__appScope); Object.assign(__appScope, { zoomViewportAtCenter });
const resetViewportZoom = createResetViewportZoom(__appScope); Object.assign(__appScope, { resetViewportZoom });
const fitWholeCanvasToFrame = createFitWholeCanvasToFrame(__appScope); Object.assign(__appScope, { fitWholeCanvasToFrame });
const fitWholeCanvasFromBlankDoubleClick = createFitWholeCanvasFromBlankDoubleClick(__appScope); Object.assign(__appScope, { fitWholeCanvasFromBlankDoubleClick });
const fitViewToBounds = createFitViewToBounds(__appScope); Object.assign(__appScope, { fitViewToBounds });
const fitViewToContent = createFitViewToContent(__appScope); Object.assign(__appScope, { fitViewToContent });
const focusElementTreeItem = createFocusElementTreeItem(__appScope); Object.assign(__appScope, { focusElementTreeItem });
const jumpToElementTreeItem = createJumpToElementTreeItem(__appScope); Object.assign(__appScope, { jumpToElementTreeItem });
const openElementTreeItemContextMenu = createOpenElementTreeItemContextMenu(__appScope); Object.assign(__appScope, { openElementTreeItemContextMenu });
const setEdgeManualPoints = createSetEdgeManualPoints(__appScope); Object.assign(__appScope, { setEdgeManualPoints });
const routeManualPoints = createRouteManualPoints(__appScope); Object.assign(__appScope, { routeManualPoints });
const finishManualPathDrag = createFinishManualPathDrag(__appScope); Object.assign(__appScope, { finishManualPathDrag });
const tidySelectedEdgeRoute = createTidySelectedEdgeRoute(__appScope); Object.assign(__appScope, { tidySelectedEdgeRoute });
const tidyRoutableLineRoute = createTidyRoutableLineRoute(__appScope); Object.assign(__appScope, { tidyRoutableLineRoute });
const openEdgeContextMenu = createOpenEdgeContextMenu(__appScope); Object.assign(__appScope, { openEdgeContextMenu });
const captureCanvasPointer = createCaptureCanvasPointer(__appScope); Object.assign(__appScope, { captureCanvasPointer });
const startManualSegmentDrag = createStartManualSegmentDrag(__appScope); Object.assign(__appScope, { startManualSegmentDrag });
const startManualPointDrag = createStartManualPointDrag(__appScope); Object.assign(__appScope, { startManualPointDrag });
const routeSegmentPointerDistance = createRouteSegmentPointerDistance(__appScope); Object.assign(__appScope, { routeSegmentPointerDistance });
const findEditableRouteSegmentIndex = createFindEditableRouteSegmentIndex(__appScope); Object.assign(__appScope, { findEditableRouteSegmentIndex });
const findBendInsertRouteSegmentIndex = (routePoints: Point[], point: Point) =>
    routePoints
      .slice(0, -1)
      .map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y))
      .reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
        const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
        return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
      }, null)?.index ?? -1;
Object.assign(__appScope, { findBendInsertRouteSegmentIndex });
const connectionHitTolerance = createConnectionHitTolerance(__appScope); Object.assign(__appScope, { connectionHitTolerance });
const findConnectionRouteHitAtPoint = createFindConnectionRouteHitAtPoint(__appScope); Object.assign(__appScope, { findConnectionRouteHitAtPoint });
const insertManualBendAtPoint = createInsertManualBendAtPoint(__appScope); Object.assign(__appScope, { insertManualBendAtPoint });
const insertManualBendFromPointer = createInsertManualBendFromPointer(__appScope); Object.assign(__appScope, { insertManualBendFromPointer });
const addManualBendFromContextMenu = createAddManualBendFromContextMenu(__appScope); Object.assign(__appScope, { addManualBendFromContextMenu });
const addRoutableLineBendFromContextMenu = createAddRoutableLineBendFromContextMenu(__appScope); Object.assign(__appScope, { addRoutableLineBendFromContextMenu });
const insertManualBendFromEdgePath = createInsertManualBendFromEdgePath(__appScope); Object.assign(__appScope, { insertManualBendFromEdgePath });
const handleEdgePathPointerDown = createHandleEdgePathPointerDown(__appScope); Object.assign(__appScope, { handleEdgePathPointerDown });
const deleteManualBendPoint = createDeleteManualBendPoint(__appScope); Object.assign(__appScope, { deleteManualBendPoint });
const setRoutableLineManualPathPoints = createSetRoutableLineManualPathPoints(__appScope); Object.assign(__appScope, { setRoutableLineManualPathPoints });
const insertRoutableLineBendAtPoint = createInsertRoutableLineBendAtPoint(__appScope); Object.assign(__appScope, { insertRoutableLineBendAtPoint });
const insertRoutableLineBendFromPointer = createInsertRoutableLineBendFromPointer(__appScope); Object.assign(__appScope, { insertRoutableLineBendFromPointer });
const startRoutableLineSegmentDrag = createStartRoutableLineSegmentDrag(__appScope); Object.assign(__appScope, { startRoutableLineSegmentDrag });
const startRoutableLinePointDrag = createStartRoutableLinePointDrag(__appScope); Object.assign(__appScope, { startRoutableLinePointDrag });
const deleteRoutableLineBendPoint = createDeleteRoutableLineBendPoint(__appScope); Object.assign(__appScope, { deleteRoutableLineBendPoint });
const startConnectFromTerminal = createStartConnectFromTerminal(__appScope); Object.assign(__appScope, { startConnectFromTerminal });
const finishTerminalPress = createFinishTerminalPress(__appScope); Object.assign(__appScope, { finishTerminalPress });
const handleTerminalPointerDown = createHandleTerminalPointerDown(__appScope); Object.assign(__appScope, { handleTerminalPointerDown });
const ensureSavedBeforeExport = createEnsureSavedBeforeExport(__appScope); Object.assign(__appScope, { ensureSavedBeforeExport });
const svgExportReferencedImageHrefById = createSvgExportReferencedImageHrefById(__appScope); Object.assign(__appScope, { svgExportReferencedImageHrefById });
const loadSvgImageExportPathById = createLoadSvgImageExportPathById(__appScope); Object.assign(__appScope, { loadSvgImageExportPathById });
const exportSvg = createExportSvg(__appScope); Object.assign(__appScope, { exportSvg });
const exportEFile = createExportEFile(__appScope); Object.assign(__appScope, { exportEFile });
const safeFilePart = (name: string) => name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名"; Object.assign(__appScope, { safeFilePart });
const serializeSchemeRecordForFile = (scheme: SavedSchemeRecord): string =>
    JSON.stringify(
      {
        version: 1,
        name: scheme.name,
        projects: scheme.projects.map((project) => ({
          name: project.name,
          project: normalizeProjectLayers(lockProjectEdgeTerminals(project.project))
        })),
        children: (scheme.children ?? []).map((child): unknown => JSON.parse(serializeSchemeRecordForFile(child)))
      },
      null,
      2
    );
Object.assign(__appScope, { serializeSchemeRecordForFile });
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
Object.assign(__appScope, { isObjectRecord });
const isProjectFilePayload = createIsProjectFilePayload(__appScope); Object.assign(__appScope, { isProjectFilePayload });
const createImportedSchemeRecord = createCreateImportedSchemeRecord(__appScope); Object.assign(__appScope, { createImportedSchemeRecord });
const exportProjectRecordFile = createExportProjectRecordFile(__appScope); Object.assign(__appScope, { exportProjectRecordFile });
const exportCurrentModelFile = createExportCurrentModelFile(__appScope); Object.assign(__appScope, { exportCurrentModelFile });
const openModelImportFilePicker = createOpenModelImportFilePicker(__appScope); Object.assign(__appScope, { openModelImportFilePicker });
const openSchemeImportFilePicker = createOpenSchemeImportFilePicker(__appScope); Object.assign(__appScope, { openSchemeImportFilePicker });
const mergeImportedSchemeIntoExisting = createMergeImportedSchemeIntoExisting(__appScope); Object.assign(__appScope, { mergeImportedSchemeIntoExisting });
const commitImportedSchemeRecord = createCommitImportedSchemeRecord(__appScope); Object.assign(__appScope, { commitImportedSchemeRecord });
const applyBackendSchemeArchiveImport = createApplyBackendSchemeArchiveImport(__appScope); Object.assign(__appScope, { applyBackendSchemeArchiveImport });
const importSchemeFile = createImportSchemeFile(__appScope); Object.assign(__appScope, { importSchemeFile });
const commitImportedModelRecord = createCommitImportedModelRecord(__appScope); Object.assign(__appScope, { commitImportedModelRecord });
const importModelFile = createImportModelFile(__appScope); Object.assign(__appScope, { importModelFile });
const resolveDuplicateSchemeImport = createResolveDuplicateSchemeImport(__appScope); Object.assign(__appScope, { resolveDuplicateSchemeImport });
const resolveDuplicateModelImport = createResolveDuplicateModelImport(__appScope); Object.assign(__appScope, { resolveDuplicateModelImport });
const exportSchemeRecord = createExportSchemeRecord(__appScope); Object.assign(__appScope, { exportSchemeRecord });
const chooseImage = createChooseImage(__appScope); Object.assign(__appScope, { chooseImage });
const applyExistingImage = createApplyExistingImage(__appScope); Object.assign(__appScope, { applyExistingImage });
const applyIconLibraryCatalogIcon = createApplyIconLibraryCatalogIcon(__appScope); Object.assign(__appScope, { applyIconLibraryCatalogIcon });
const clearSelectedImage = createClearSelectedImage(__appScope); Object.assign(__appScope, { clearSelectedImage });
const clearSelectedImageForNode = createClearSelectedImageForNode(__appScope); Object.assign(__appScope, { clearSelectedImageForNode });
const createImageFolder = createCreateImageFolder(__appScope); Object.assign(__appScope, { createImageFolder });
const renameImageFolder = createRenameImageFolder(__appScope); Object.assign(__appScope, { renameImageFolder });
const deleteImageFolder = createDeleteImageFolder(__appScope); Object.assign(__appScope, { deleteImageFolder });
const startProjectRecordDrag = createStartProjectRecordDrag(__appScope); Object.assign(__appScope, { startProjectRecordDrag });
const finishProjectRecordDrag = createFinishProjectRecordDrag(__appScope); Object.assign(__appScope, { finishProjectRecordDrag });
const startSchemeRecordDrag = createStartSchemeRecordDrag(__appScope); Object.assign(__appScope, { startSchemeRecordDrag });
const finishSchemeRecordDrag = createFinishSchemeRecordDrag(__appScope); Object.assign(__appScope, { finishSchemeRecordDrag });
const renderProjectSchemeNode = createRenderProjectSchemeNode(__appScope); Object.assign(__appScope, { renderProjectSchemeNode });
const openBlankProjectLibraryContextMenu = createOpenBlankProjectLibraryContextMenu(__appScope); Object.assign(__appScope, { openBlankProjectLibraryContextMenu });
const renderProjectPanel = () => (
    <section className="project-panel" onContextMenu={openBlankProjectLibraryContextMenu}>
      <div className="library-search project-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={projectSearchQuery}
          onChange={(event) => setProjectSearchQuery(event.target.value)}
          placeholder="搜索方案/模型"
          aria-label="搜索模型库"
        />
        {projectSearchQuery && (
          <button type="button" aria-label="清空模型库搜索" title="清空" onClick={() => setProjectSearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div
        className="project-list listbox"
        role="listbox"
        aria-label="绘图模型列表"
        onPointerEnter={() => {
          projectListPointerInsideRef.current = true;
        }}
        onPointerLeave={() => {
          projectListPointerInsideRef.current = false;
        }}
        onContextMenu={openBlankProjectLibraryContextMenu}
      >
        {schemes.length === 0 ? (
          <p className="project-empty">暂无方案</p>
        ) : filteredProjectSchemes.length === 0 ? (
          <p className="project-empty project-search-empty">未找到匹配方案或模型</p>
        ) : (
          filteredProjectSchemes.map((scheme) => renderProjectSchemeNode(scheme))
        )}
      </div>
    </section>
  );
Object.assign(__appScope, { renderProjectPanel });
const customDraftTerminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount); Object.assign(__appScope, { customDraftTerminalTypes });
const customDraftTerminalAssociations = normalizeContainerTerminalAssociations(
    customDraftTerminalTypes,
    customDeviceDraft.terminalAssociations,
    customDeviceDraft.terminalCount
  );
Object.assign(__appScope, { customDraftTerminalAssociations });
const customDraftDefaultParams = customDefaultDefinitions(customDraftTerminalTypes, {
    isContainer: customDeviceDraft.isContainer,
    terminalAssociations: customDraftTerminalAssociations
  });
Object.assign(__appScope, { customDraftDefaultParams });
const customDeviceMeasurementTarget: DeviceDefinitionMeasurementPanelTarget = {
    deviceKind:
      normalizeComponentTypeName(customDeviceDraft.componentType) ||
      (selectedCustomComponentTemplate ? deviceDefinitionKeyForTemplate(selectedCustomComponentTemplate) : ""),
    label: customDeviceDraft.componentName.trim() || selectedCustomComponentTemplate?.label || customDeviceDraft.componentType || "未命名元件",
    terminalCount: Math.max(0, customDeviceDraft.terminalCount),
    terminalLabels: customDeviceDraft.terminalLabels
  };
Object.assign(__appScope, { customDeviceMeasurementTarget });
const customIconStatePageId = customDeviceStatePageId;
Object.assign(__appScope, { customIconStatePageId });
const customDevicePreviewLabel = customDeviceDraft.componentName.trim() || customDeviceDraft.componentType || "Unit"; Object.assign(__appScope, { customDevicePreviewLabel });
const customDevicePreviewSourceTemplate =
    customDeviceDefinitionMode === "edit"
      ? selectedCustomComponentTemplate ?? (selectedDefinitionKind ? selectedDefinitionTemplate : undefined)
      : undefined;
Object.assign(__appScope, { customDevicePreviewSourceTemplate });
const customDeviceDefaultStateVisualDraft = createCustomDeviceDefaultStateVisualDraft(__appScope); Object.assign(__appScope, { customDeviceDefaultStateVisualDraft });
const customStatePreviewRow = isDefaultStatePageId(customIconStatePageId)
    ? defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft())
    : activeStateDraftRow(customDeviceDraft.stateDefinitions, customIconStatePageId);
const customStatePreviewVisual = stateVisualFromDraftRow(customStatePreviewRow); Object.assign(__appScope, { customStatePreviewVisual });
const customStatePreviewText = stateVisualText(customStatePreviewVisual); Object.assign(__appScope, { customStatePreviewText });
const customDevicePreviewImageHref =
    resolveStateVisualImageHref(customStatePreviewVisual, imageAssets) ||
    customDeviceDraft.backgroundImage;
Object.assign(__appScope, { customDevicePreviewImageHref });
const customDevicePreviewImage =
    customDevicePreviewImageHref ||
    generateCustomDeviceImage(customDevicePreviewLabel, customDraftTerminalTypes.length > 0 ? customDraftTerminalTypes : ["ac"]);
Object.assign(__appScope, { customDevicePreviewImage });
const customDefaultStateSelected = isDefaultStatePageId(customDeviceStatePageId); Object.assign(__appScope, { customDefaultStateSelected });
const customDevicePreviewWidth = Math.max(1, customDeviceDraft.size.width || 104); Object.assign(__appScope, { customDevicePreviewWidth });
const customDevicePreviewHeight = Math.max(1, customDeviceDraft.size.height || 64); Object.assign(__appScope, { customDevicePreviewHeight });
const customDevicePreviewNode = useMemo(() => {
    if (!customDevicePreviewSourceTemplate) {
      return null;
    }
    const terminalCount = Math.max(0, customDeviceDraft.terminalCount);
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, terminalCount);
    const visualTemplate = {
      ...customDevicePreviewSourceTemplate,
      label: customDevicePreviewLabel || customDevicePreviewSourceTemplate.label,
      size: { ...customDeviceDraft.size },
      params: {
        ...customDevicePreviewSourceTemplate.params,
        ...(customStatePreviewVisual?.value !== undefined && customStatePreviewVisual.value !== "" ? { status: customStatePreviewVisual.value } : {}),
        backgroundImage: "",
        backgroundImageAssetId: ""
      },
      terminalType: terminalTypes[0] ?? customDevicePreviewSourceTemplate.terminalType,
      terminalCount,
      terminalTypes,
      terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalCount),
      terminalAnchors: createDefaultCustomDeviceTerminalAnchors(terminalCount, customDeviceDraft.terminalAnchors),
      stateDefinitions: customDeviceDraft.stateDefinitions
    };
    const previewNode = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
    return {
      ...previewNode,
      id: `custom-device-preview-${customDevicePreviewSourceTemplate.kind}`,
      name: customDevicePreviewLabel
    };
  }, [
    customDevicePreviewSourceTemplate,
    customDevicePreviewLabel,
    customDeviceDraft.size,
    customDeviceDraft.terminalCount,
    customDeviceDraft.terminalTypes,
    customDeviceDraft.terminalLabels,
    customDeviceDraft.terminalAnchors,
    customDeviceDraft.stateDefinitions,
    customStatePreviewVisual?.value
  ]);
Object.assign(__appScope, { customDevicePreviewNode });
const customDeviceTerminalAnchors = createDefaultCustomDeviceTerminalAnchors(customDeviceDraft.terminalCount, customDeviceDraft.terminalAnchors); Object.assign(__appScope, { customDeviceTerminalAnchors });
const customDeviceTerminalAnchorValue = (value: number) =>
    normalizeCustomDeviceTerminalAnchorCoordinate(value);
Object.assign(__appScope, { customDeviceTerminalAnchorValue });
const formatCustomDeviceTerminalAnchorValue = (value: number) =>
    formatSvgNumber(customDeviceTerminalAnchorValue(value));
Object.assign(__appScope, { formatCustomDeviceTerminalAnchorValue });
const snapCustomDeviceTerminalAnchor = createSnapCustomDeviceTerminalAnchor(__appScope); Object.assign(__appScope, { snapCustomDeviceTerminalAnchor });
const customDeviceTerminalConnectorSegment = createCustomDeviceTerminalConnectorSegment(__appScope); Object.assign(__appScope, { customDeviceTerminalConnectorSegment });
const updateCustomDeviceTerminalAnchor = createUpdateCustomDeviceTerminalAnchor(__appScope); Object.assign(__appScope, { updateCustomDeviceTerminalAnchor });
const updateCustomDeviceStateDraftRow = createUpdateCustomDeviceStateDraftRow(__appScope); Object.assign(__appScope, { updateCustomDeviceStateDraftRow });
const addCustomDeviceStateDraftRow = createAddCustomDeviceStateDraftRow(__appScope); Object.assign(__appScope, { addCustomDeviceStateDraftRow });
const deleteCustomDeviceStateDraftRow = createDeleteCustomDeviceStateDraftRow(__appScope); Object.assign(__appScope, { deleteCustomDeviceStateDraftRow });
const updateCustomDeviceTerminalAnchorFromPreview = createUpdateCustomDeviceTerminalAnchorFromPreview(__appScope); Object.assign(__appScope, { updateCustomDeviceTerminalAnchorFromPreview });
const definitionVisualPreviewWidth = Math.max(1, definitionVisualDraft?.size.width ?? selectedDefinitionTemplate?.size.width ?? 104); Object.assign(__appScope, { definitionVisualPreviewWidth });
const definitionVisualPreviewHeight = Math.max(1, definitionVisualDraft?.size.height ?? selectedDefinitionTemplate?.size.height ?? 64); Object.assign(__appScope, { definitionVisualPreviewHeight });
const definitionVisualTerminalAnchors = definitionVisualDraft
    ? createDefaultCustomDeviceTerminalAnchors(definitionVisualDraft.terminalCount, definitionVisualDraft.terminalAnchors)
    : [];
Object.assign(__appScope, { definitionVisualTerminalAnchors });
const definitionVisualTerminalTypes = definitionVisualDraft
    ? definitionVisualDraft.terminalTypes.slice(0, definitionVisualDraft.terminalCount)
    : [];
Object.assign(__appScope, { definitionVisualTerminalTypes });
const definitionDefaultStateVisualDraft = createDefinitionDefaultStateVisualDraft(__appScope); Object.assign(__appScope, { definitionDefaultStateVisualDraft });
const definitionStatePreviewRow = isDefaultStatePageId(definitionStatePageId)
    ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
    : activeStateDraftRow(definitionStateDraftRows, definitionStatePageId);
const definitionStatePreviewVisual = stateVisualFromDraftRow(definitionStatePreviewRow); Object.assign(__appScope, { definitionStatePreviewVisual });
const definitionVisualPreviewImage =
    resolveStateVisualImageHref(definitionStatePreviewVisual, imageAssets) ||
    definitionVisualDraft?.backgroundImage ||
    "";
Object.assign(__appScope, { definitionVisualPreviewImage });
const snapDefinitionTerminalAnchor = createSnapDefinitionTerminalAnchor(__appScope); Object.assign(__appScope, { snapDefinitionTerminalAnchor });
const definitionTerminalConnectorSegment = createDefinitionTerminalConnectorSegment(__appScope); Object.assign(__appScope, { definitionTerminalConnectorSegment });
const updateDefinitionTerminalAnchor = createUpdateDefinitionTerminalAnchor(__appScope); Object.assign(__appScope, { updateDefinitionTerminalAnchor });
const updateDefinitionTerminalAnchorFromPreview = createUpdateDefinitionTerminalAnchorFromPreview(__appScope); Object.assign(__appScope, { updateDefinitionTerminalAnchorFromPreview });
const loadDefinitionTemplateDraft = createLoadDefinitionTemplateDraft(__appScope); Object.assign(__appScope, { loadDefinitionTemplateDraft });
const finishDeviceLibraryDialogPointerOperation = createFinishDeviceLibraryDialogPointerOperation(__appScope); Object.assign(__appScope, { finishDeviceLibraryDialogPointerOperation });
const deviceLibraryDialogRefForKind = (kind: DeviceLibraryDialogKind) =>
    kind === "definition"
      ? deviceDefinitionDialogRef
      : kind === "measurementConfig"
        ? measurementConfigDialogRef
        : customDeviceDialogRef;
Object.assign(__appScope, { deviceLibraryDialogRefForKind });
const currentDeviceLibraryDialogRect = createCurrentDeviceLibraryDialogRect(__appScope); Object.assign(__appScope, { currentDeviceLibraryDialogRect });
const deviceLibraryDialogStyle = createDeviceLibraryDialogStyle(__appScope); Object.assign(__appScope, { deviceLibraryDialogStyle });
const startDeviceLibraryDialogDrag = createStartDeviceLibraryDialogDrag(__appScope); Object.assign(__appScope, { startDeviceLibraryDialogDrag });
const startDeviceLibraryDialogResize = createStartDeviceLibraryDialogResize(__appScope); Object.assign(__appScope, { startDeviceLibraryDialogResize });
const stopDeviceLibraryDialogEvent = createStopDeviceLibraryDialogEvent(__appScope); Object.assign(__appScope, { stopDeviceLibraryDialogEvent });
const openDeviceDefinitionDialog = createOpenDeviceDefinitionDialog(__appScope); Object.assign(__appScope, { openDeviceDefinitionDialog });
const closeDeviceDefinitionDialog = createCloseDeviceDefinitionDialog(__appScope); Object.assign(__appScope, { closeDeviceDefinitionDialog });
const closeCustomDeviceDialog = createCloseCustomDeviceDialog(__appScope); Object.assign(__appScope, { closeCustomDeviceDialog });
const requestCloseCustomDeviceDialog = createRequestCloseCustomDeviceDialog(__appScope); Object.assign(__appScope, { requestCloseCustomDeviceDialog });
const setCustomDeviceDraftCleanBaseline = createSetCustomDeviceDraftCleanBaseline(__appScope); Object.assign(__appScope, { setCustomDeviceDraftCleanBaseline });
const customDeviceDraftHasUnsavedChanges = createCustomDeviceDraftHasUnsavedChanges(__appScope); Object.assign(__appScope, { customDeviceDraftHasUnsavedChanges });
const toggleDefinitionGroup = createToggleDefinitionGroup(__appScope); Object.assign(__appScope, { toggleDefinitionGroup });
const toggleDefinitionComponentType = createToggleDefinitionComponentType(__appScope); Object.assign(__appScope, { toggleDefinitionComponentType });
const toggleElementTreeGroup = createToggleElementTreeGroup(__appScope); Object.assign(__appScope, { toggleElementTreeGroup });
const toggleElementTreeDeviceGroup = createToggleElementTreeDeviceGroup(__appScope); Object.assign(__appScope, { toggleElementTreeDeviceGroup });
const updateDefinitionDraftRow = createUpdateDefinitionDraftRow(__appScope); Object.assign(__appScope, { updateDefinitionDraftRow });
const addDefinitionDraftRow = createAddDefinitionDraftRow(__appScope); Object.assign(__appScope, { addDefinitionDraftRow });
const deleteDefinitionDraftRow = createDeleteDefinitionDraftRow(__appScope); Object.assign(__appScope, { deleteDefinitionDraftRow });
const updateDefinitionStateDraftRow = createUpdateDefinitionStateDraftRow(__appScope); Object.assign(__appScope, { updateDefinitionStateDraftRow });
const addDefinitionStateDraftRow = createAddDefinitionStateDraftRow(__appScope); Object.assign(__appScope, { addDefinitionStateDraftRow });
const deleteDefinitionStateDraftRow = createDeleteDefinitionStateDraftRow(__appScope); Object.assign(__appScope, { deleteDefinitionStateDraftRow });
const updateSelectedDefinitionResizePermission = createUpdateSelectedDefinitionResizePermission(__appScope); Object.assign(__appScope, { updateSelectedDefinitionResizePermission });
const saveDeviceDefinitionStateVisualDraft = createSaveDeviceDefinitionStateVisualDraft(__appScope); Object.assign(__appScope, { saveDeviceDefinitionStateVisualDraft });
const saveDeviceDefinitionVisualDraft = createSaveDeviceDefinitionVisualDraft(__appScope); Object.assign(__appScope, { saveDeviceDefinitionVisualDraft });
const saveDeviceDefinitionDraft = createSaveDeviceDefinitionDraft(__appScope); Object.assign(__appScope, { saveDeviceDefinitionDraft });
const resetDeviceDefinitionDraft = createResetDeviceDefinitionDraft(__appScope); Object.assign(__appScope, { resetDeviceDefinitionDraft });
const updateCustomDraftTerminalCount = createUpdateCustomDraftTerminalCount(__appScope); Object.assign(__appScope, { updateCustomDraftTerminalCount });
const chooseCustomDeviceBackground = createChooseCustomDeviceBackground(__appScope); Object.assign(__appScope, { chooseCustomDeviceBackground });
const chooseDefinitionTemplateIcon = createChooseDefinitionTemplateIcon(__appScope); Object.assign(__appScope, { chooseDefinitionTemplateIcon });
const chooseStateVisualImage = createChooseStateVisualImage(__appScope); Object.assign(__appScope, { chooseStateVisualImage });
const chooseStateIconDrawingImport = createChooseStateIconDrawingImport(__appScope); Object.assign(__appScope, { chooseStateIconDrawingImport });
const updateStateIconDrawingElement = createUpdateStateIconDrawingElement(__appScope); Object.assign(__appScope, { updateStateIconDrawingElement });
const updateStateIconDrawingElements = createUpdateStateIconDrawingElements(__appScope); Object.assign(__appScope, { updateStateIconDrawingElements });
const stateIconDrawingPointer = createStateIconDrawingPointer(__appScope); Object.assign(__appScope, { stateIconDrawingPointer });
const stateIconDrawingSelection = createStateIconDrawingSelection(__appScope); Object.assign(__appScope, { stateIconDrawingSelection });
const computeStateIconDrawingSmartAlignmentSnap = createComputeStateIconDrawingSmartAlignmentSnap(__appScope); Object.assign(__appScope, { computeStateIconDrawingSmartAlignmentSnap });
const startStateIconDrawingDrag = createStartStateIconDrawingDrag(__appScope); Object.assign(__appScope, { startStateIconDrawingDrag });
const dragStateIconDrawingSelection = createDragStateIconDrawingSelection(__appScope); Object.assign(__appScope, { dragStateIconDrawingSelection });
const stopStateIconDrawingDrag = createStopStateIconDrawingDrag(__appScope); Object.assign(__appScope, { stopStateIconDrawingDrag });
const deleteSelectedStateIconDrawingElements = createDeleteSelectedStateIconDrawingElements(__appScope); Object.assign(__appScope, { deleteSelectedStateIconDrawingElements });
const stateIconDrawingKeyDown = createStateIconDrawingKeyDown(__appScope); Object.assign(__appScope, { stateIconDrawingKeyDown });
const addStateIconDrawingElement = createAddStateIconDrawingElement(__appScope); Object.assign(__appScope, { addStateIconDrawingElement });
const deleteStateIconDrawingElement = createDeleteStateIconDrawingElement(__appScope); Object.assign(__appScope, { deleteStateIconDrawingElement });
const openStateIconDrawingDialog = createOpenStateIconDrawingDialog(__appScope); Object.assign(__appScope, { openStateIconDrawingDialog });
const applyStateIconDrawingDialog = createApplyStateIconDrawingDialog(__appScope); Object.assign(__appScope, { applyStateIconDrawingDialog });
const stateIconDrawingDefaultDraftRow = (scope: StateIconDrawingTarget["scope"]): DeviceDefinitionStateDraftRow =>
    scope === "definition"
      ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
      : defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft());
Object.assign(__appScope, { stateIconDrawingDefaultDraftRow });
const stateIconDrawingDraftRowForTarget = (target: StateIconDrawingTarget): DeviceDefinitionStateDraftRow | null => {
    if (isDefaultStatePageId(target.rowId)) {
      return stateIconDrawingDefaultDraftRow(target.scope);
    }
    return target.scope === "definition"
      ? definitionStateDraftRows.find((item) => item.id === target.rowId) ?? null
      : customDeviceDraft.stateDefinitions.find((item) => item.id === target.rowId) ?? null;
  };
Object.assign(__appScope, { stateIconDrawingDraftRowForTarget });
const stateIconDrawingInlineTarget =
    deviceDefinitionDialogOpen && deviceDefinitionView === "visual"
      ? { scope: "definition" as const, rowId: definitionStatePageId }
      : customDeviceDialogOpen && customDeviceDialogView === "icon"
        ? { scope: "custom" as const, rowId: customIconStatePageId }
        : null;
Object.assign(__appScope, { stateIconDrawingInlineTarget });
const stateIconDrawingInlineTargetKey = stateIconDrawingInlineTarget
    ? [
        stateIconDrawingInlineTarget.scope,
        stateIconDrawingInlineTarget.rowId,
        isDefaultStatePageId(stateIconDrawingInlineTarget.rowId)
          ? stateIconDrawingInlineTarget.scope === "definition"
            ? [
                selectedDefinitionTemplate?.kind ?? selectedDefinitionKind ?? "",
                definitionVisualDraft?.backgroundImageAssetId ?? "",
                definitionVisualDraft?.size.width ?? "",
                definitionVisualDraft?.size.height ?? "",
                definitionVisualDraft?.terminalCount ?? "",
                definitionVisualTerminalTypes.join(",")
              ].join("/")
            : [
                customDevicePreviewSourceTemplate?.kind ?? selectedCustomComponentTemplate?.kind ?? selectedDefinitionTemplate?.kind ?? editingCustomDeviceKind ?? "",
                customDeviceDraft.backgroundImageAssetId,
                customDeviceDraft.size.width,
                customDeviceDraft.size.height,
                customDeviceDraft.terminalCount,
                customDraftTerminalTypes.join(",")
              ].join("/")
          : ""
      ].join(":")
    : "";
Object.assign(__appScope, { stateIconDrawingInlineTargetKey });
const resolveStateIconDrawingImageHref = (href: string) => {
    const id = backendImageIdFromHref(href);
    if (id) {
      const cachedHref = imageAssets[id] ?? "";
      if (isImageDataUrl(cachedHref)) {
        return cachedHref;
      }
    }
    return href;
  };
Object.assign(__appScope, { resolveStateIconDrawingImageHref });
const stateIconDrawingInlineHasTerminals = stateIconDrawingDialog
    ? stateIconDrawingDialog.target.scope === "definition"
      ? (Number(definitionVisualDraft?.terminalCount) || definitionVisualTerminalTypes.length) > 0
      : (Number(customDeviceDraft.terminalCount) || customDraftTerminalTypes.length) > 0
    : false;
Object.assign(__appScope, { stateIconDrawingInlineHasTerminals });
const stateIconDrawingInlineImage = stateIconDrawingDialog
    ? stateIconDrawingDialog.elements.length > 0
      ? stateIconDrawingToImage(stateIconDrawingDialog.elements, {
          resolveImageHref: resolveStateIconDrawingImageHref,
          frame: stateIconDrawingDialog.frame,
          frameHasTerminals: stateIconDrawingInlineHasTerminals
        })
      : ""
    : "";
Object.assign(__appScope, { stateIconDrawingInlineImage });
useEffect(() => {
    if (!stateIconDrawingInlineTarget) {
      stateIconDrawingInitialImageRef.current = null;
      stateIconDrawingHistoryRef.current = [];
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => (current ? null : current));
      return;
    }
    const targetKey = stateIconDrawingInlineTargetKey;
    setStateIconDrawingDialog((current) => {
      const row = stateIconDrawingDraftRowForTarget(stateIconDrawingInlineTarget);
      const draftSourceImage = stateIconDrawingDraftSourceImage(row, imageAssets);
      const initialSnapshot = stateIconDrawingInitialImageRef.current;
      const targetMatches = Boolean(
        current?.target.scope === stateIconDrawingInlineTarget.scope &&
        current.target.rowId === stateIconDrawingInlineTarget.rowId
      );
      if (
        initialSnapshot &&
        !stateIconDrawingInlineNeedsDraftReload({
          targetMatches,
          keyMatches: initialSnapshot.key === targetKey,
          initialImage: initialSnapshot.image,
          inlineImage: stateIconDrawingInlineImage,
          initialSourceImage: initialSnapshot.sourceImage,
          draftSourceImage
        })
      ) {
        return current;
      }
      const initial = createStateIconDrawingInitialElements(row, imageAssets);
      stateIconDrawingHistoryRef.current = [];
      setStateIconDrawingContextMenu(null);
      stateIconDrawingInitialImageRef.current = {
        key: targetKey,
        sourceImage: draftSourceImage,
        image: initial.length > 0 ? stateIconDrawingToImage(initial, {
          resolveImageHref: resolveStateIconDrawingImageHref,
          frame: {
            strokeStyle: "dashed",
            strokeWidth: 1.2,
            strokeColor: "#94a3b8",
            fillColor: "#ffffff"
          },
          frameHasTerminals: stateIconDrawingInlineTarget.scope === "definition"
            ? (Number(definitionVisualDraft?.terminalCount) || definitionVisualTerminalTypes.length) > 0
            : (Number(customDeviceDraft.terminalCount) || customDraftTerminalTypes.length) > 0
        }) : ""
      };
      return {
        target: stateIconDrawingInlineTarget,
        elements: initial,
        selectedElementId: initial[0]?.id ?? "",
        selectedElementIds: initial[0]?.id ? [initial[0].id] : [],
        frame: {
          strokeStyle: "dashed",
          strokeWidth: 1.2,
          strokeColor: "#94a3b8",
          fillColor: "#ffffff"
        }
      };
    });
  }, [
    customDeviceDialogOpen,
    customDeviceDialogView,
    customDeviceDraft.backgroundImage,
    customDeviceDraft.backgroundImageAssetId,
    customDeviceDraft.backgroundImageCleared,
    customDeviceDraft.stateDefinitions,
    customDeviceDraft.terminalCount,
    customIconStatePageId,
    customDeviceStatePageId,
    definitionVisualDraft?.backgroundImage,
    definitionVisualDraft?.backgroundImageAssetId,
    definitionVisualDraft?.backgroundImageCleared,
    definitionStateDraftRows,
    definitionStatePageId,
    deviceDefinitionDialogOpen,
    deviceDefinitionView,
    imageAssets,
    stateIconDrawingInlineImage,
    stateIconDrawingInlineTargetKey,
    stateIconDrawingInlineTarget?.rowId,
    stateIconDrawingInlineTarget?.scope
  ]);
useEffect(() => {
    if (!stateIconDrawingDialog) {
      return;
    }
    const targetMatches = Boolean(
      stateIconDrawingInlineTarget &&
      stateIconDrawingDialog.target.scope === stateIconDrawingInlineTarget.scope &&
      stateIconDrawingDialog.target.rowId === stateIconDrawingInlineTarget.rowId
    );
    const initialSnapshot = stateIconDrawingInitialImageRef.current;
    if (
      !initialSnapshot ||
      !stateIconDrawingInlineCanPersistDraft({
        targetMatches,
        keyMatches: initialSnapshot.key === stateIconDrawingInlineTargetKey,
        initialImage: initialSnapshot.image,
        inlineImage: stateIconDrawingInlineImage
      })
    ) {
      return;
    }
    if (isDefaultStatePageId(stateIconDrawingDialog.target.rowId)) {
      if (stateIconDrawingDialog.target.scope === "definition") {
        if (!definitionVisualDraft) {
          return;
        }
        const imageFieldsAlreadySynced =
          definitionVisualDraft.backgroundImage === stateIconDrawingInlineImage &&
          !definitionVisualDraft.backgroundImageAssetId &&
          (definitionVisualDraft.backgroundImageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
        if (imageFieldsAlreadySynced) {
          return;
        }
        setDefinitionVisualDraft((current) =>
          current
            ? {
                ...current,
                backgroundImage: stateIconDrawingInlineImage,
                backgroundImageAssetId: "",
                backgroundImageCleared: stateIconDrawingInlineImage ? "" : "1",
                error: ""
              }
            : current
        );
      } else {
        const imageFieldsAlreadySynced =
          customDeviceDraft.backgroundImage === stateIconDrawingInlineImage &&
          !customDeviceDraft.backgroundImageAssetId &&
          (customDeviceDraft.backgroundImageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
        if (imageFieldsAlreadySynced) {
          return;
        }
        setCustomDeviceDraft((current) => ({
          ...current,
          backgroundImage: stateIconDrawingInlineImage,
          backgroundImageAssetId: "",
          backgroundImageCleared: stateIconDrawingInlineImage ? "" : "1",
          error: ""
        }));
      }
      return;
    }
    const row =
      stateIconDrawingDialog.target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === stateIconDrawingDialog.target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === stateIconDrawingDialog.target.rowId);
    if (!row) {
      return;
    }
    const imageFieldsAlreadySynced =
      (row.image ?? "") === stateIconDrawingInlineImage &&
      !row.imageAssetId &&
      !row.backgroundImage &&
      !row.backgroundImageAssetId &&
      (row.imageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
    if (imageFieldsAlreadySynced) {
      return;
    }
    const stateIconDrawingInlinePatch: Partial<DeviceDefinitionStateDraftRow> = {
      image: stateIconDrawingInlineImage,
      imageAssetId: "",
      backgroundImage: "",
      backgroundImageAssetId: "",
      imageCleared: stateIconDrawingInlineImage ? "" : "1"
    };
    if (stateIconDrawingDialog.target.scope === "definition") {
      updateDefinitionStateDraftRow(stateIconDrawingDialog.target.rowId, stateIconDrawingInlinePatch);
    } else {
      updateCustomDeviceStateDraftRow(stateIconDrawingDialog.target.rowId, stateIconDrawingInlinePatch);
    }
  }, [
    stateIconDrawingDialog,
    stateIconDrawingInlineImage,
    stateIconDrawingInlineTarget?.rowId,
    stateIconDrawingInlineTarget?.scope,
    stateIconDrawingInlineTargetKey
  ]);
const customComponentTreeTypeKey = (attributeLibraryName: string, componentType: string) =>
    `${normalizeAttributeLibraryName(attributeLibraryName)}::${normalizeComponentTypeName(componentType)}`;
Object.assign(__appScope, { customComponentTreeTypeKey });
const handleTreeCollapseChange = useCallback(createAppHookCallback127(__appScope), []);
Object.assign(__appScope, { handleTreeCollapseChange });
const ensureCustomComponentTreeExpanded = createEnsureCustomComponentTreeExpanded(__appScope); Object.assign(__appScope, { ensureCustomComponentTreeExpanded });
const cancelPendingCustomComponentTemplateLoad = createCancelPendingCustomComponentTemplateLoad(__appScope); Object.assign(__appScope, { cancelPendingCustomComponentTemplateLoad });
const selectCustomAttributeLibrary = createSelectCustomAttributeLibrary(__appScope); Object.assign(__appScope, { selectCustomAttributeLibrary });
const selectCustomComponentType = createSelectCustomComponentType(__appScope); Object.assign(__appScope, { selectCustomComponentType });
const selectCustomComponentTemplate = createSelectCustomComponentTemplate(__appScope); Object.assign(__appScope, { selectCustomComponentTemplate });
const startCustomComponentCreate = createStartCustomComponentCreate(__appScope); Object.assign(__appScope, { startCustomComponentCreate });
const nextCustomAttributeLibraryName = createNextCustomAttributeLibraryName(__appScope); Object.assign(__appScope, { nextCustomAttributeLibraryName });
const createCustomAttributeLibrary = createCreateCustomAttributeLibrary(__appScope); Object.assign(__appScope, { createCustomAttributeLibrary });
const deleteCustomAttributeLibrary = createDeleteCustomAttributeLibrary(__appScope); Object.assign(__appScope, { deleteCustomAttributeLibrary });
const nextCustomComponentTypeName = createNextCustomComponentTypeName(__appScope); Object.assign(__appScope, { nextCustomComponentTypeName });
const createCustomComponentType = createCreateCustomComponentType(__appScope); Object.assign(__appScope, { createCustomComponentType });
const deleteCustomComponentType = createDeleteCustomComponentType(__appScope); Object.assign(__appScope, { deleteCustomComponentType });
const renameSelectedCustomDeviceTreeItem = createRenameSelectedCustomDeviceTreeItem(__appScope); Object.assign(__appScope, { renameSelectedCustomDeviceTreeItem });
const deleteSelectedCustomDeviceTreeItem = createDeleteSelectedCustomDeviceTreeItem(__appScope); Object.assign(__appScope, { deleteSelectedCustomDeviceTreeItem });
const nextCustomTemplateKind = createNextCustomTemplateKind(__appScope); Object.assign(__appScope, { nextCustomTemplateKind });
const saveCustomDeviceTemplate = createSaveCustomDeviceTemplate(__appScope); Object.assign(__appScope, { saveCustomDeviceTemplate });
const saveBuiltinDeviceDefinitionFromCustomDraft = createSaveBuiltinDeviceDefinitionFromCustomDraft(__appScope); Object.assign(__appScope, { saveBuiltinDeviceDefinitionFromCustomDraft });
const saveCustomDeviceDefinitionDialog = createSaveCustomDeviceDefinitionDialog(__appScope); Object.assign(__appScope, { saveCustomDeviceDefinitionDialog });
const renderStateVisualPager = createRenderStateVisualPager(__appScope); Object.assign(__appScope, { renderStateVisualPager });
const renderDeviceDefinitionVisualPanel = createRenderDeviceDefinitionVisualPanel(__appScope); Object.assign(__appScope, { renderDeviceDefinitionVisualPanel });
const renderLibraryDefinitionActions = () => (
    <div className="library-definition-actions">
      <button
        type="button"
        className="custom-device-create-button measurement-config-open-button"
        disabled={isBrowseMode}
        onClick={openMeasurementConfigDialog}
      >
        量测定义
      </button>
      <button type="button" className="custom-device-create-button" disabled={isBrowseMode} onClick={openDeviceDefinitionDialog}>
        元件定义
      </button>
    </div>
  );
Object.assign(__appScope, { renderLibraryDefinitionActions });
const renderGraphTemplatePreview = createRenderGraphTemplatePreview(__appScope); Object.assign(__appScope, { renderGraphTemplatePreview });
const renderGraphTemplateButton = (template: GraphTemplate) => (
    <button
      key={template.id}
      type="button"
      className="template-library-item"
      draggable={isEditMode}
      disabled={isBrowseMode}
      title={`${template.typeName} / ${template.name} / ${template.sourceSize.width}×${template.sourceSize.height}`}
      onClick={() => startLibraryGraphTemplatePlacement(template)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        cancelLibraryPlacement();
        setContextMenu(null);
        setProjectMenu(null);
        if (templateLibraryDisplayMode === "right") {
          clearLibraryFlyoutCloseTimer();
          setHoveredGraphTemplateType(template.typeName);
        }
        setTemplateMenu({
          x: event.clientX,
          y: event.clientY,
          templateId: template.id
        });
      }}
      onDragStart={(event) => {
        if (!isEditMode) {
          event.preventDefault();
          return;
        }
        cancelLibraryPlacement();
        event.dataTransfer.setData("application/graph-template-id", template.id);
        event.dataTransfer.effectAllowed = "copy";
        if (templateLibraryDisplayMode === "right") {
          hideLibraryFlyout();
        }
      }}
    >
      <span className="template-library-icon">
        {renderGraphTemplatePreview(template)}
      </span>
      <span className="template-library-name">{template.name}</span>
      <small>{template.sourceSize.width}×{template.sourceSize.height}</small>
    </button>
  );
Object.assign(__appScope, { renderGraphTemplateButton });
const renderGraphTemplateFlyout = (flyoutListKey: string, typeName: string, templates: GraphTemplate[]) => {
    const flyout = (
      <div
        className="library-group flyout-library-group template-library-flyout"
        ref={setLibraryComponentListRef(flyoutListKey)}
        style={libraryFlyoutStyle(flyoutListKey)}
        onMouseEnter={() => {
          clearLibraryFlyoutCloseTimer();
          setHoveredGraphTemplateType(typeName);
        }}
        onMouseLeave={() => scheduleGraphTemplateFlyoutClose(typeName)}
      >
        {templates.map(renderGraphTemplateButton)}
      </div>
    );
    if (typeof document === "undefined") {
      return flyout;
    }
    return createPortal(flyout, document.body);
  };
Object.assign(__appScope, { renderGraphTemplateFlyout });
const renderTemplateLibraryPanel = () => (
    <div className="template-library-panel library-panel-stack">
      <div className="library-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={templateLibrarySearchQuery}
          onChange={(event) => setTemplateLibrarySearchQuery(event.target.value)}
          placeholder="搜索模板/类型"
          aria-label="搜索模板库"
        />
        {templateLibrarySearchQuery && (
          <button type="button" aria-label="清空模板库搜索" title="清空" onClick={() => setTemplateLibrarySearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="library-display-mode" role="radiogroup" aria-label="模板库展开方式">
        {([
          ["expanded", "向下展开"],
          ["right", "向右浮动"]
        ] as const).map(([mode, label]) => (
          <label key={mode} className={templateLibraryDisplayMode === mode ? "active" : ""}>
            <input
              type="radio"
              name="template-library-display-mode"
              value={mode}
              checked={templateLibraryDisplayMode === mode}
              onChange={() => setTemplateLibraryDisplayMode(mode)}
              onClick={() => {
                // 已选中时重复点击：切换折叠层全部展开/全部收缩
                if (templateLibraryDisplayMode !== mode) return;
                setExpandedGraphTemplateTypes((current) =>
                  current.length === 0 ? [...displayedGraphTemplateTypes] : []
                );
              }}
            />
            <span>{label}</span>
            {templateLibraryDisplayMode === mode && (() => {
              // 当前选中模式：图标反映折叠层全部展开/全部收缩
              const total = displayedGraphTemplateTypes.length;
              if (total === 0) return null;
              const allExpanded = expandedGraphTemplateTypes.length >= total;
              const allCollapsed = expandedGraphTemplateTypes.length === 0;
              if (allExpanded) return <ChevronDown size={12} aria-hidden="true" />;
              if (allCollapsed) return <ChevronRight size={12} aria-hidden="true" />;
              return null;
            })()}
          </label>
        ))}
      </div>
      <div
        className={`library-scroll ${templateLibraryDisplayMode === "right" ? "library-scroll-flyout" : ""}`}
        ref={libraryScrollRef}
        onScroll={() => {
          if (templateLibraryDisplayMode === "right") {
            hideLibraryFlyout();
          }
        }}
      >
        {displayedGraphTemplateTypes.length > 0 ? displayedGraphTemplateTypes.map((typeName) => {
          const templates = filteredGroupedGraphTemplates[typeName] ?? [];
          const templateExpanded = templateLibrarySearchNeedle
            ? true
            : templateLibraryDisplayMode === "expanded" && expandedGraphTemplateTypes.includes(typeName);
          const templateFlyoutVisible =
            templateLibraryDisplayMode === "right" &&
            !templateLibrarySearchNeedle &&
            hoveredGraphTemplateType === typeName &&
            templates.length > 0;
          const flyoutListKey = libraryComponentListRefKey("flyout", `template:${typeName}`);
          return (
            <section
              className={`library-group-section template-library-type-section ${templateLibraryDisplayMode === "right" ? "flyout-mode" : ""}`}
              key={typeName}
              onMouseEnter={() => {
                if (templateLibraryDisplayMode === "right" && !templateLibrarySearchNeedle) {
                  clearLibraryFlyoutCloseTimer();
                  setHoveredGraphTemplateType(typeName);
                }
              }}
              onMouseLeave={() => {
                if (templateLibraryDisplayMode === "right" && templateFlyoutVisible) {
                  scheduleGraphTemplateFlyoutClose(typeName);
                }
              }}
            >
              <button
                type="button"
                ref={setLibraryComponentTypeHeaderRef(flyoutListKey)}
                className={`library-group-toggle ${templateExpanded || templateFlyoutVisible ? "active" : ""}`}
                aria-expanded={templateExpanded || templateFlyoutVisible}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelLibraryPlacement();
                  setContextMenu(null);
                  setProjectMenu(null);
                  hideLibraryFlyout();
                  setTemplateMenu({
                    x: event.clientX,
                    y: event.clientY,
                    typeName
                  });
                }}
                onClick={() => {
                  if (templateLibraryDisplayMode === "right" && !templateLibrarySearchNeedle) {
                    clearLibraryFlyoutCloseTimer();
                    setHoveredGraphTemplateType(typeName);
                    return;
                  }
                  setExpandedGraphTemplateTypes((current) =>
                    current.includes(typeName) ? current.filter((item) => item !== typeName) : [...current, typeName]
                  );
                }}
              >
                {templateExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {typeName}
                <strong>{templates.length}</strong>
              </button>
              {templateExpanded && (
                templates.length > 0 ? (
                  <div className="template-library-grid">
                    {templates.map(renderGraphTemplateButton)}
                  </div>
                ) : (
                  <div className="template-library-empty">暂无模板</div>
                )
              )}
              {templateFlyoutVisible && renderGraphTemplateFlyout(flyoutListKey, typeName, templates)}
            </section>
          );
        }) : (
          <div className="library-empty">未找到匹配模板</div>
        )}
      </div>
    </div>
  );
Object.assign(__appScope, { renderTemplateLibraryPanel });
const renderLibraryTemplateButton = createRenderLibraryTemplateButton(__appScope); Object.assign(__appScope, { renderLibraryTemplateButton });
const renderLibraryFlyout = createRenderLibraryFlyout(__appScope); Object.assign(__appScope, { renderLibraryFlyout });
const renderLibraryPanel = () => (
    <div className="library-panel-stack">
      <div className="library-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={librarySearchQuery}
          onChange={(event) => setLibrarySearchQuery(event.target.value)}
          placeholder="搜索图元/类型"
          aria-label="搜索图元库"
        />
        {librarySearchQuery && (
          <button type="button" aria-label="清空图元库搜索" title="清空" onClick={() => setLibrarySearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="library-display-mode" role="radiogroup" aria-label="图元库展开方式">
        {([
          ["expanded", "向下展开"],
          ["right", "向右浮动"]
        ] as const).map(([mode, label]) => (
          <label key={mode} className={componentLibraryDisplayMode === mode ? "active" : ""}>
            <input
              type="radio"
              name="component-library-display-mode"
              value={mode}
              checked={componentLibraryDisplayMode === mode}
              onChange={() => setComponentLibraryDisplayMode(mode)}
              onClick={() => {
                // 已选中时重复点击：切换折叠层全部展开/全部收缩
                if (componentLibraryDisplayMode !== mode) return;
                if (mode === "expanded") {
                  setCollapsedExpandedModeAttributeLibraries((current) =>
                    current.length === 0 ? [...displayedAttributeLibraries] : []
                  );
                } else {
                  setExpandedAttributeLibraries((current) =>
                    current.length === 0 ? [...displayedAttributeLibraries] : []
                  );
                }
              }}
            />
            <span>{label}</span>
            {componentLibraryDisplayMode === mode && (() => {
              // 当前选中模式：图标反映折叠层全部展开/全部收缩
              const total = displayedAttributeLibraries.length;
              if (total === 0) return null;
              const allCollapsed = mode === "expanded"
                ? collapsedExpandedModeAttributeLibraries.length >= total
                : expandedAttributeLibraries.length === 0;
              const allExpanded = mode === "expanded"
                ? collapsedExpandedModeAttributeLibraries.length === 0
                : expandedAttributeLibraries.length >= total;
              if (allExpanded) return <ChevronDown size={12} aria-hidden="true" />;
              if (allCollapsed) return <ChevronRight size={12} aria-hidden="true" />;
              return null;
            })()}
          </label>
        ))}
      </div>
      <div
        className={`library-scroll ${componentLibraryDisplayMode === "right" ? "library-scroll-flyout" : ""}`}
        ref={libraryScrollRef}
        onScroll={() => {
          if (componentLibraryDisplayMode === "right") {
            hideLibraryFlyout();
          }
        }}
      >
        {displayedAttributeLibraries.length > 0 ? displayedAttributeLibraries.map((group) => {
          const libraryExpanded = componentLibraryDisplayMode === "expanded";
          const libraryFlyout = componentLibraryDisplayMode === "right";
          const expanded = librarySearchNeedle ? true : libraryExpanded
            ? !collapsedExpandedModeAttributeLibraries.includes(group)
            : expandedAttributeLibraries.includes(group);
          const typeGroups = filteredAttributeLibraryByComponentType[group] ?? [];
          return (
            <section
              className="library-group-section"
              key={group}
              onMouseEnter={() => {
                if (libraryFlyout) {
                  clearLibraryFlyoutCloseTimer();
                }
              }}
              onMouseLeave={() => {
                if (!libraryExpanded) {
                  if (libraryFlyout) {
                    scheduleLibraryFlyoutClose(group);
                  } else {
                    setHoveredAttributeLibrary((current) => current === group ? "" : current);
                    setHoveredAttributeLibraryComponentType("");
                  }
                }
              }}
            >
              <button
                className={`library-group-toggle ${expanded ? "active" : ""}`}
                onClick={() => toggleAttributeLibrary(group)}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {group}
              </button>
              {expanded && (
                <div className="attribute-library-component-type-list">
                  {typeGroups.map((typeGroup) => {
                    const componentTypeKey = attributeLibraryComponentTypeKey(group, typeGroup.section);
                    const componentTypeDisplay = componentTypeDisplayParts(typeGroup.section);
                    const componentTypeExpanded = librarySearchNeedle
                      ? true
                      : libraryExpanded
                        ? !collapsedExpandedModeComponentTypes.includes(componentTypeKey)
                        : libraryFlyout ? false : expandedAttributeLibraryComponentTypes.includes(componentTypeKey) || hoveredAttributeLibraryComponentType === componentTypeKey;
                    const componentTypeFlyoutVisible = libraryFlyout && !librarySearchNeedle && hoveredAttributeLibraryComponentType === componentTypeKey;
                    const inlineListKey = libraryComponentListRefKey("inline", componentTypeKey);
                    const flyoutListKey = libraryComponentListRefKey("flyout", componentTypeKey);
                    return (
                      <section
                        className={`attribute-library-component-type-section ${libraryFlyout ? "flyout-mode" : ""}`}
                        key={`${group}-${typeGroup.section}`}
                        onMouseEnter={() => {
                          if (!libraryExpanded) {
                            clearLibraryFlyoutCloseTimer();
                            setHoveredAttributeLibraryComponentType(componentTypeKey);
                          }
                        }}
                        onMouseLeave={() => {
                          if (!libraryExpanded) {
                            if (libraryFlyout) {
                              scheduleLibraryFlyoutClose(group, componentTypeKey);
                            } else {
                              setHoveredAttributeLibraryComponentType((current) => current === componentTypeKey ? "" : current);
                            }
                          }
                        }}
                      >
                        <button
                          type="button"
                          ref={setLibraryComponentTypeHeaderRef(flyoutListKey)}
                          className={`attribute-library-component-type-header ${componentTypeExpanded || componentTypeFlyoutVisible ? "active" : ""}`}
                          aria-expanded={componentTypeExpanded || componentTypeFlyoutVisible}
                          onClick={() => toggleAttributeLibraryComponentType(group, typeGroup.section)}
                        >
                          <span className="component-type-title">
                            {!libraryFlyout && (componentTypeExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
                            <span className="component-type-name" title={componentTypeDisplay.title}>
                              <span className="component-type-name-cn">{componentTypeDisplay.chinese}</span>
                              <span className="component-type-name-en">{componentTypeDisplay.english}</span>
                            </span>
                          </span>
                          <strong>{typeGroup.templates.length}</strong>
                        </button>
                        {componentTypeExpanded && (
                          <div className="library-group inline-library-group" ref={setLibraryComponentListRef(inlineListKey)}>
                            {typeGroup.templates.map((item) => renderLibraryTemplateButton(item, typeGroup.section))}
                          </div>
                        )}
                        {componentTypeFlyoutVisible && renderLibraryFlyout(flyoutListKey, componentTypeKey, group, typeGroup)}
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          );
        }) : (
          <div className="library-empty">未找到匹配图元</div>
        )}
      </div>
      {renderLibraryDefinitionActions()}
    </div>
  );
Object.assign(__appScope, { renderLibraryPanel });
const renderElementTreePanel = () => (
    <div className="element-tree" role="tree" aria-label="图元树">
      <div className="element-tree-search" role="presentation">
        <Search size={14} aria-hidden="true" />
        <input
          value={elementTreeSearchQuery}
          onChange={(event) => setElementTreeSearchQuery(event.target.value)}
          placeholder="搜索图元名称"
          aria-label="搜索图元树"
        />
        {elementTreeSearchQuery && (
          <button type="button" aria-label="清空图元树搜索" title="清空" onClick={() => setElementTreeSearchQuery("")}>
            <X size={13} />
          </button>
        )}
      </div>
      {elementTree.length === 0 ? (
        <div className="empty-state compact">
          <Grid2X2 size={24} />
          <p>当前画布暂无图元。</p>
        </div>
      ) : filteredElementTree.length === 0 ? (
        <div className="empty-state compact element-tree-search-empty">
          <Search size={22} />
          <p>未找到匹配图元。</p>
        </div>
      ) : (
        filteredElementTree.map((group) => {
          const expanded = Boolean(elementTreeSearchNeedle) || !collapsedElementTreeGroups.includes(group.typeKey);
          const deviceGroups = group.deviceGroups ?? [];
          return (
            <section className="element-tree-group" key={group.typeKey}>
              <button
                type="button"
                className="element-tree-type"
                role="treeitem"
                aria-expanded={expanded}
                onClick={() => toggleElementTreeGroup(group.typeKey)}
              >
                <span className="element-tree-type-label">
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="element-tree-bilingual">
                    <span>{group.typeLabel}</span>
                    {group.typeEnglishLabel ? <small>{group.typeEnglishLabel}</small> : null}
                  </span>
                </span>
                <strong>{group.items.length}</strong>
              </button>
              {expanded && (
                <div className="element-tree-items" role="group">
                  {deviceGroups.map((deviceGroup) => {
                    const deviceExpanded = Boolean(elementTreeSearchNeedle) || !collapsedElementTreeDeviceGroups.includes(deviceGroup.deviceKey);
                    const visibleLimit = elementTreeItemLimits[deviceGroup.deviceKey] ?? ELEMENT_TREE_INITIAL_ITEM_LIMIT;
                    // 虚拟化窗口：搜索时全量显示；否则按 [start,end) 滑窗
                    // windowState 由 effect 仅在 total > WINDOW 时设置，故存在即生效
                    const windowState = elementTreeItemWindows[deviceGroup.deviceKey];
                    const totalItems = deviceGroup.items.length;
                    let windowStart = 0;
                    let windowEnd = totalItems;
                    const windowEffective = !elementTreeSearchNeedle && Boolean(windowState);
                    if (windowEffective) {
                      windowStart = clampNumber(totalItems, 0, windowState!.start);
                      windowEnd = Math.min(totalItems, Math.max(windowStart + 1, windowState!.end));
                    }
                    // 窗口生效且非全显时由滚动接管，不显示"显示更多"
                    const windowActive = windowEffective && !(windowStart === 0 && windowEnd === totalItems);
                    const visibleItems = elementTreeSearchNeedle
                      ? deviceGroup.items
                      : (windowEffective
                          ? (windowStart === 0 && windowEnd === totalItems
                              ? deviceGroup.items
                              : deviceGroup.items.slice(windowStart, windowEnd))
                          : deviceGroup.items.slice(0, visibleLimit));
                    // 窗口激活时不显示"显示更多"（滚动已接管）；仅在非窗口回退模式下统计隐藏数
                    const hiddenItemCount = windowActive ? 0 : Math.max(0, deviceGroup.items.length - visibleItems.length);
                    // 前后占位高度：用该 group 实测高度，避免跨组高度差导致 spacer 失真
                    const ESTIMATED_ITEM_HEIGHT = elementTreeItemHeights[deviceGroup.deviceKey] ?? 32;
                    const spacerBeforeHeight = windowStart * ESTIMATED_ITEM_HEIGHT;
                    const spacerAfterHeight = Math.max(0, totalItems - windowEnd) * ESTIMATED_ITEM_HEIGHT;
                    return (
                      <section className="element-tree-device-group" key={deviceGroup.deviceKey}>
                        <button
                          type="button"
                          className="element-tree-device-type"
                          role="treeitem"
                          aria-level={2}
                          aria-expanded={deviceExpanded}
                          onClick={() => toggleElementTreeDeviceGroup(deviceGroup.deviceKey)}
                        >
                          <span className="element-tree-type-label">
                            {deviceExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            <span className="element-tree-bilingual">
                              <span>{deviceGroup.deviceLabel}</span>
                              {deviceGroup.deviceEnglishLabel ? <small>{deviceGroup.deviceEnglishLabel}</small> : null}
                            </span>
                          </span>
                          <strong>{deviceGroup.items.length}</strong>
                        </button>
                        {deviceExpanded && (
                          <div className="element-tree-device-items" role="group" data-device-key={deviceGroup.deviceKey} data-total-items={totalItems}>
                            {spacerBeforeHeight > 0 && (
                              <div className="element-tree-virtual-spacer" aria-hidden="true" style={{ height: spacerBeforeHeight }} />
                            )}
                            {visibleItems.map((item) => {
                              const editable = item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id);
                              const selected = editable && (item.kind === "node" ? selectedNodeIdSet.has(item.id) : activeSelectedEdgeSet.has(item.id));
                              const itemChildren = elementTreeItemChildren(item);
                              const treeItemKey = `${item.kind}:${item.id}`;
                              const selectTreeItem = () => {
                                if (!editable) {
                                  return;
                                }
                                if (item.kind === "node") {
                                  selectCanvasGraphics([item.id], []);
                                  clearRecordSelection();
                                } else {
                                  selectCanvasGraphics([], [item.id]);
                                }
                              };
                              return (
                                <div
                                  role="treeitem"
                                  aria-level={3}
                                  aria-selected={selected}
                                  className={`element-tree-item ${selected ? "selected" : ""}`}
                                  key={treeItemKey}
                                  ref={(element) => {
                                    elementTreeItemRefs.current[treeItemKey] = element;
                                  }}
                                  title="双击定位并选中图元"
                                  tabIndex={0}
                                  onPointerDown={selectTreeItem}
                                  onClick={selectTreeItem}
                                  onDoubleClick={() => focusElementTreeItem(item, true)}
                                  onContextMenu={(event) => openElementTreeItemContextMenu(event, item)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      focusElementTreeItem(item);
                                    }
                                  }}
                                >
                                  <div className="element-tree-item-main">
                                    {item.kind === "node" && item.editableDevice ? (
                                      <div className="element-tree-device-fields">
                                        <label>
                                          <span>idx</span>
                                          <BufferedTextInput
                                            value={item.idx ?? ""}
                                            inputMode="numeric"
                                            onClick={(event) => event.stopPropagation()}
                                            onDoubleClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                            disabled={!editable || isBrowseMode}
                                            onCommit={(nextValue) => commitElementTreeNodeIdentity(item.id, "idx", nextValue)}
                                          />
                                        </label>
                                        <label>
                                          <span>name</span>
                                          <BufferedTextInput
                                            value={item.name}
                                            onClick={(event) => event.stopPropagation()}
                                            onDoubleClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                            disabled={!editable || isBrowseMode}
                                            onCommit={(nextValue) => commitElementTreeNodeIdentity(item.id, "name", nextValue)}
                                          />
                                        </label>
                                      </div>
                                    ) : (
                                      <span className="element-tree-bilingual">
                                        <span>{item.name}</span>
                                      </span>
                                    )}
                                  </div>
                                  {itemChildren.length ? (
                                    <div className="element-tree-child-list" role="group" aria-label={`${item.name}关联子设备`}>
                                      {itemChildren.map((child) => {
                                        const childIdxKey = child.relationKeys[0] ?? "";
                                        return (
                                          <div className="element-tree-child-item" key={child.id}>
                                            <span className="element-tree-child-type" title={child.componentType}>
                                              <span>{child.componentTypeLabel || child.componentType}</span>
                                              {child.componentType ? <small>{child.componentType}</small> : null}
                                            </span>
                                            <label>
                                              <span>idx</span>
                                              <BufferedTextInput
                                                value={child.idx}
                                                inputMode="numeric"
                                                onClick={(event) => event.stopPropagation()}
                                                onDoubleClick={(event) => event.stopPropagation()}
                                                onKeyDown={(event) => event.stopPropagation()}
                                                disabled={!editable || isBrowseMode}
                                                onCommit={(nextValue) => commitElementTreeContainerChildParam(item.id, childIdxKey, nextValue)}
                                              />
                                            </label>
                                            <label className="element-tree-child-name-field">
                                              <span>name</span>
                                              <BufferedTextInput
                                                value={child.name}
                                                onClick={(event) => event.stopPropagation()}
                                                onDoubleClick={(event) => event.stopPropagation()}
                                                onKeyDown={(event) => event.stopPropagation()}
                                                disabled={!editable || isBrowseMode}
                                                onCommit={(nextValue) => commitElementTreeContainerChildParam(item.id, child.nameKey, nextValue)}
                                              />
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                  {selected ? (
                                    <button
                                      type="button"
                                      className="element-tree-jump-button"
                                      title="跳转到画布中心并以 100% 显示"
                                      aria-label={`跳转到图元：${item.name}`}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        jumpToElementTreeItem(item);
                                      }}
                                      onDoubleClick={(event) => event.stopPropagation()}
                                    >
                                      <LocateFixed size={13} />
                                      <span>跳转</span>
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                            {spacerAfterHeight > 0 && (
                              <div className="element-tree-virtual-spacer" aria-hidden="true" style={{ height: spacerAfterHeight }} />
                            )}
                            {hiddenItemCount > 0 && (
                              <button
                                type="button"
                                className="element-tree-more"
                                onClick={() =>
                                  setElementTreeItemLimits((current) => ({
                                    ...current,
                                    [deviceGroup.deviceKey]: visibleLimit + ELEMENT_TREE_ITEM_LIMIT_STEP
                                  }))
                                }
                              >
                                显示更多（还有 {hiddenItemCount} 个）
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
Object.assign(__appScope, { renderElementTreePanel });
const topologyWarningDisplayMessage = (message: string) =>
    message.replace(/^(?:图上拓扑失败|拓扑失败)\s*[:：]\s*/, "");
Object.assign(__appScope, { topologyWarningDisplayMessage });
const warningStatusText = topologyErrors.length > 0
    ? `告警 ${topologyErrors.length} 条：${topologyWarningDisplayMessage(topologyErrors[0]?.message ?? "请查看拓扑告警")}`
    : "告警 无";
Object.assign(__appScope, { warningStatusText });
const warningStatusTitle = topologyErrors.length > 0
    ? topologyErrors.slice(0, 5).map((error, index) => `${index + 1}. ${topologyWarningDisplayMessage(error.message)}`).join("\n")
    : "当前没有拓扑告警。";
Object.assign(__appScope, { warningStatusTitle });
const currentZoomPercent = viewBoxZoomPercent(viewBox, canvasBounds); Object.assign(__appScope, { currentZoomPercent });
const viewportNodeLodScreenSize = useMemo(
    () => estimatedViewportNodeScreenSize(viewportNodes, canvasScrollScale),
    [canvasScrollScale.x, canvasScrollScale.y, viewportNodes]
  );
Object.assign(__appScope, { viewportNodeLodScreenSize });
const useInitialCanvasLod =
    initialCanvasLodActive &&
    viewportNodes.length > CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT &&
    currentZoomPercent <= CANVAS_LOD_MAX_ZOOM_PERCENT &&
    !connectSource &&
    !staticDrawing;
Object.assign(__appScope, { useInitialCanvasLod });
const usePersistentCanvasLod =
    viewportNodes.length > CANVAS_LOD_NODE_DETAIL_LIMIT &&
    currentZoomPercent <= CANVAS_LOD_MAX_ZOOM_PERCENT &&
    viewportNodeLodScreenSize <= CANVAS_LOD_MAX_NODE_SCREEN_SIZE &&
    !connectSource &&
    !staticDrawing;
Object.assign(__appScope, { usePersistentCanvasLod });
const useSimplifiedCanvasNodes =
    usePersistentCanvasLod || useInitialCanvasLod; Object.assign(__appScope, { useSimplifiedCanvasNodes });
const initialCanvasDetailHydrationTarget = initialCanvasLodActive
    ? Math.max(viewportNodes.length, viewportRoutedEdges.length)
    : 0;
Object.assign(__appScope, { initialCanvasDetailHydrationTarget });
useEffect(createAppHookCallback128(__appScope), [
    activeProjectKey,
    initialCanvasDetailHydrationLimit,
    initialCanvasDetailHydrationTarget,
    initialCanvasLodActive
  ]);
const initialCanvasDetailedNodeIdSet = useMemo(createAppHookCallback129(__appScope), [
    groupTransformPreviewNodeIdSet,
    initialCanvasDetailHydrationLimit,
    useInitialCanvasLod,
    viewportNodes
  ]);
Object.assign(__appScope, { initialCanvasDetailedNodeIdSet });
const useSimplifiedSelectedCanvasNodes =
    useSimplifiedCanvasNodes &&
    selectedNodeIdSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT &&
    !transformDrag &&
    !nodeLabelDrag &&
    !nodeLabelRotateDrag;
Object.assign(__appScope, { useSimplifiedSelectedCanvasNodes });
const detailedViewportNodes = useMemo(createAppHookCallback130(__appScope), [
    groupTransformPreviewNodeIdSet,
    initialCanvasDetailedNodeIdSet,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    selectedNodeId,
    selectedNodeIdSet,
    transformDrag,
    useSimplifiedCanvasNodes,
    useSimplifiedSelectedCanvasNodes,
    viewportNodes
  ]);
Object.assign(__appScope, { detailedViewportNodes });
const useSimplifiedCanvasRoutes =
    useSimplifiedCanvasNodes &&
    !rewiring &&
    !manualPathDrag &&
    !terminalPress;
Object.assign(__appScope, { useSimplifiedCanvasRoutes });
const renderViewportRoutedEdges = viewportRoutedEdges; Object.assign(__appScope, { renderViewportRoutedEdges });
const useSimplifiedSelectedCanvasEdges =
    useSimplifiedCanvasRoutes &&
    activeSelectedEdgeSet.size > CANVAS_LOD_SELECTED_DETAIL_LIMIT &&
    !rewiring &&
    !manualPathDrag &&
    !terminalPress;
Object.assign(__appScope, { useSimplifiedSelectedCanvasEdges });
const detailedSelectedEdgeIdSet = useMemo(createAppHookCallback131(__appScope), [activeSelectedEdgeSet, selectedEdgeId, useSimplifiedSelectedCanvasEdges]);
Object.assign(__appScope, { detailedSelectedEdgeIdSet });
const initialCanvasDetailedEdgeIdSet = useMemo(createAppHookCallback132(__appScope), [initialCanvasDetailHydrationLimit, useInitialCanvasLod, viewportRoutedEdges]);
Object.assign(__appScope, { initialCanvasDetailedEdgeIdSet });
const lodCanvasRouteChunks = useMemo(createAppHookCallback133(__appScope), [
    activeLayerEdgeIdSet,
    activeSelectedEdgeSet,
    colorDisplayMode,
    colorPalette,
    detailedSelectedEdgeIdSet,
    dragGhostEdgeIdSet,
    dragOverlayEdgeIdSet,
    edgeById,
    groupTransformPreviewEdgeIdSet,
    initialCanvasDetailedEdgeIdSet,
    isEditMode,
    multiNodeDragging,
    nodeById,
    terminalPressPreviewEdgeIdSet,
    useSimplifiedCanvasRoutes,
    viewportRoutedEdges
  ]);
Object.assign(__appScope, { lodCanvasRouteChunks });
const lodCanvasNodeChunks = useMemo(createAppHookCallback134(__appScope), [
    activeLayerNodeIdSet,
    colorDisplayMode,
    colorPalette,
    dragGhostRoutableLineNodeIdSet,
    groupTransformPreviewNodeIdSet,
    imageAssets,
    initialCanvasDetailedNodeIdSet,
    isEditMode,
    libraryTemplateByKind,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    routableLineEndpointDrag?.nodeId,
    transformDrag,
    useSimplifiedCanvasNodes,
    viewportNodes
  ]);
Object.assign(__appScope, { lodCanvasNodeChunks });
const lodSelectedNodeMarkup = useMemo(createAppHookCallback135(__appScope), [
    displaySelectedNodeIds,
    groupTransformPreviewNodeIdSet,
    selectedNodeId,
    useSimplifiedSelectedCanvasNodes,
    visibleNodeById
  ]);
Object.assign(__appScope, { lodSelectedNodeMarkup });
const lodNodeFromEvent = createLodNodeFromEvent(__appScope); Object.assign(__appScope, { lodNodeFromEvent });
const lodTerminalIdFromEvent = createLodTerminalIdFromEvent(__appScope); Object.assign(__appScope, { lodTerminalIdFromEvent });
const handleLodNodePointerDown = createHandleLodNodePointerDown(__appScope); Object.assign(__appScope, { handleLodNodePointerDown });
const handleLodNodeContextMenu = createHandleLodNodeContextMenu(__appScope); Object.assign(__appScope, { handleLodNodeContextMenu });
const openNodeDoubleClickEditor = createOpenNodeDoubleClickEditor(__appScope); Object.assign(__appScope, { openNodeDoubleClickEditor });
const handleLodNodeDoubleClick = createHandleLodNodeDoubleClick(__appScope); Object.assign(__appScope, { handleLodNodeDoubleClick });
const connectPreviewDom = connectPreviewDomRef.current; Object.assign(__appScope, { connectPreviewDom });
const layerAssignmentUnchanged = activeSelectedNodeIds.length > 0 && activeSelectedNodeIds.every(
    (nodeId) => (nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerAssignmentTargetId
  );
Object.assign(__appScope, { layerAssignmentUnchanged });
const browseSelectedCanvasBounds = useMemo(createAppHookCallback136(__appScope), [activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode, routedEdgeById, visibleNodeById]);
const selectedCanvasBounds = isEditMode
    ? combineSelectionRects(selectedLayoutUnits.map((unit) => unit.bounds)) ??
      calculateModelGeometryBounds(
        [],
        activeSelectedEdgeIds.flatMap((edgeId) => {
          const route = routedEdgeById.get(edgeId);
          return route ? [{ points: route.points }] : [];
        }),
        24
      )
    : browseSelectedCanvasBounds;
Object.assign(__appScope, { selectedCanvasBounds });
const selectedFloatingToolbarBounds = isEditMode
    ? focusedGroupedNodeMovesGroup && selectedNode ? calculateNodeVisualBounds(selectedNode) : selectedCanvasBounds
    : null;
Object.assign(__appScope, { selectedFloatingToolbarBounds });
const selectedToolbarHidden = Boolean(
    dragging ||
    transformDrag ||
    panning ||
    marquee ||
    modifierSelectionPress ||
    connectSource ||
    staticDrawing ||
    rewiring ||
    terminalPress ||
    manualPathDrag ||
    nodeLabelDrag ||
    nodeLabelRotateDrag
  );
Object.assign(__appScope, { selectedToolbarHidden });
const contextMenuTarget = contextMenu?.target ?? (contextMenu?.edgeId ? "edge" : "blank"); Object.assign(__appScope, { contextMenuTarget });
const contextMenuFromElementTree = contextMenu?.source === "element-tree"; Object.assign(__appScope, { contextMenuFromElementTree });
const contextMenuForSelection = contextMenuTarget !== "blank"; Object.assign(__appScope, { contextMenuForSelection });
const contextMenuForNode = contextMenuTarget === "node" || contextMenuTarget === "group"; Object.assign(__appScope, { contextMenuForNode });
const contextMenuForEdge = contextMenuTarget === "edge"; Object.assign(__appScope, { contextMenuForEdge });
const contextRoutableLineNode = contextMenuForNode && contextMenu?.nodeId ? nodeById.get(contextMenu.nodeId) : undefined; Object.assign(__appScope, { contextRoutableLineNode });
const contextMenuForRoutableLine = Boolean(
    contextRoutableLineNode &&
    activeLayerNodeIdSet.has(contextRoutableLineNode.id) &&
    isRoutableLineDeviceKind(contextRoutableLineNode.kind)
  );
Object.assign(__appScope, { contextMenuForRoutableLine });
const contextMeasurementNode = contextMenuForNode && activeSelectedNodeIds.length === 1
    ? nodeById.get(activeSelectedNodeIds[0])
    : undefined;
Object.assign(__appScope, { contextMeasurementNode });
const contextMeasurementGroup = contextMeasurementNode
    ? measurementGroupForNode(projectMeasurements, contextMeasurementNode.id)
    : undefined;
Object.assign(__appScope, { contextMeasurementGroup });
const selectedViewportActionDisabled = !selectedCanvasBounds; Object.assign(__appScope, { selectedViewportActionDisabled });
const centerSelectedViewportTitle = selectedViewportActionDisabled ? "先选中图元或连接线后可居中" : "居中选中"; Object.assign(__appScope, { centerSelectedViewportTitle });
const fitSelectedViewportTitle = selectedViewportActionDisabled ? "先选中图元或连接线后可缩放到选中区域" : "缩放到选中区域"; Object.assign(__appScope, { fitSelectedViewportTitle });
const nodeFloatingToolbarActionCount =
    6 +
    (canGroupSelectedGraphics ? 1 : 0) +
    (canUngroupSelectedGraphics ? 1 : 0) +
    (canAddTemplateFromSelection ? 1 : 0);
Object.assign(__appScope, { nodeFloatingToolbarActionCount });
const nodeFloatingToolbarWidth = Math.max(NODE_FLOATING_TOOLBAR_WIDTH, nodeFloatingToolbarActionCount * 34 + 16); Object.assign(__appScope, { nodeFloatingToolbarWidth });
const svgUiUnitX = viewBox.width / Math.max(1, canvasWidth); Object.assign(__appScope, { svgUiUnitX });
const svgUiUnitY = viewBox.height / Math.max(1, canvasHeight); Object.assign(__appScope, { svgUiUnitY });
const floatingToolbarScreenScale = clampNumber(Math.sqrt(currentZoomPercent / 100), 0.78, 1); Object.assign(__appScope, { floatingToolbarScreenScale });
const floatingToolbarGap = Math.max(5, Math.round(CANVAS_FLOATING_TOOLBAR_GAP * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarGap });
const floatingToolbarPadding = Math.max(6, Math.round(8 * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarPadding });
const floatingToolbarButtonSize = Math.max(24, Math.round(30 * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarButtonSize });
const floatingToolbarIconSize = Math.max(12, Math.round(15 * floatingToolbarScreenScale)); Object.assign(__appScope, { floatingToolbarIconSize });
const floatingToolbarViewportCanvas =
    canvasVisibleViewBox.width > 0 && canvasVisibleViewBox.height > 0 ? canvasVisibleViewBox : viewBox; Object.assign(__appScope, { floatingToolbarViewportCanvas });
const canvasPointToSurfaceCss = (point: Point): Point => ({
    x: canvasDisplayOffsetX + point.x * canvasScrollScale.x,
    y: canvasDisplayOffsetY + point.y * canvasScrollScale.y
  });
Object.assign(__appScope, { canvasPointToSurfaceCss });
const floatingToolbarViewport = {
    left: canvasDisplayOffsetX + floatingToolbarViewportCanvas.x * canvasScrollScale.x,
    right: canvasDisplayOffsetX + (floatingToolbarViewportCanvas.x + floatingToolbarViewportCanvas.width) * canvasScrollScale.x,
    top: canvasDisplayOffsetY + floatingToolbarViewportCanvas.y * canvasScrollScale.y,
    bottom: canvasDisplayOffsetY + (floatingToolbarViewportCanvas.y + floatingToolbarViewportCanvas.height) * canvasScrollScale.y
  };
Object.assign(__appScope, { floatingToolbarViewport });
const clampFloatingToolbarPosition = createClampFloatingToolbarPosition(__appScope); Object.assign(__appScope, { clampFloatingToolbarPosition });
const floatingToolbarBounds = (toolbar: FloatingToolbarPlacement) => ({
    left: toolbar.x,
    right: toolbar.x + toolbar.width,
    top: toolbar.y,
    bottom: toolbar.y + toolbar.height
  });
Object.assign(__appScope, { floatingToolbarBounds });
const toolbarOverlapArea = createToolbarOverlapArea(__appScope); Object.assign(__appScope, { toolbarOverlapArea });
const canvasRectToSurfaceCssRect = createCanvasRectToSurfaceCssRect(__appScope); Object.assign(__appScope, { canvasRectToSurfaceCssRect });
const rotateControlAvoidRectFromCanvasPoints = createRotateControlAvoidRectFromCanvasPoints(__appScope); Object.assign(__appScope, { rotateControlAvoidRectFromCanvasPoints });
const rotateControlAvoidRectFromCanvas = (centerX: number, topY: number): RenderViewportBounds =>
    rotateControlAvoidRectFromCanvasPoints([
      { x: centerX, y: topY - 52 },
      { x: centerX, y: topY - 6 }
    ]);
Object.assign(__appScope, { rotateControlAvoidRectFromCanvas });
const selectedRotateControlAvoidRects: RenderViewportBounds[] = [];
Object.assign(__appScope, { selectedRotateControlAvoidRects });
if (isEditMode && !editHotInteractionActive && selectedTransformGroupUnit) {
    selectedRotateControlAvoidRects.push(
      rotateControlAvoidRectFromCanvas(selectionRectCenter(selectedTransformGroupUnit.bounds).x, selectedTransformGroupUnit.bounds.top)
    );
  } else if (isEditMode && !editHotInteractionActive && selectedNode && selectedNodeCount === 1 && activeSelectedEdgeIds.length === 0) {
    const selectedNodeUprightStaticSelectionOutline = nodeUsesUprightStaticSelectionOutline(selectedNode, nodeImage(selectedNode), nodeForegroundImage(selectedNode));
    const selectedNodeRotateHandle = selectedNodeUprightStaticSelectionOutline
      ? nodeUprightRotateHandleControlPoints(selectedNode, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
      : nodeRotateHandleControlPoints(selectedNode, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP);
    const selectedNodeRotateHandlePoints = [
      selectedNodeRotateHandle.stemStart,
      selectedNodeRotateHandle.stemEnd,
      selectedNodeRotateHandle.handle
    ].map((point) => ({
      x: selectedNode.position.x + point.x,
      y: selectedNode.position.y + point.y
    }));
    selectedRotateControlAvoidRects.push(
      rotateControlAvoidRectFromCanvasPoints(selectedNodeRotateHandlePoints)
    );
  }
const selectedFloatingToolbarAvoidRect = selectedFloatingToolbarBounds
    ? canvasRectToSurfaceCssRect(
        selectedFloatingToolbarBounds,
        Math.max(floatingToolbarGap, Math.round(8 * floatingToolbarScreenScale))
      )
    : null;
Object.assign(__appScope, { selectedFloatingToolbarAvoidRect });
const placeFloatingToolbar = createPlaceFloatingToolbar(__appScope); Object.assign(__appScope, { placeFloatingToolbar });
const nodeFloatingToolbar =
    isEditMode && !selectedToolbarHidden && activeSelectedNodeIds.length > 0 && selectedFloatingToolbarBounds
      ? (() => {
          const width = Math.round(nodeFloatingToolbarWidth * floatingToolbarScreenScale);
          const height = Math.round(NODE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale);
          const centerX = (selectedFloatingToolbarBounds.left + selectedFloatingToolbarBounds.right) / 2;
          const centerY = (selectedFloatingToolbarBounds.top + selectedFloatingToolbarBounds.bottom) / 2;
          const topCenter = canvasPointToSurfaceCss({ x: centerX, y: selectedFloatingToolbarBounds.top });
          const bottomCenter = canvasPointToSurfaceCss({ x: centerX, y: selectedFloatingToolbarBounds.bottom });
          const leftCenter = canvasPointToSurfaceCss({ x: selectedFloatingToolbarBounds.left, y: centerY });
          const rightCenter = canvasPointToSurfaceCss({ x: selectedFloatingToolbarBounds.right, y: centerY });
          const nodeFloatingToolbarAvoidRects = [
            ...(selectedFloatingToolbarAvoidRect ? [selectedFloatingToolbarAvoidRect] : []),
            ...selectedRotateControlAvoidRects
          ];
          const rotateAvoidTop = selectedRotateControlAvoidRects.length > 0
            ? Math.min(...selectedRotateControlAvoidRects.map((rect) => rect.top))
            : null;
          const nodeToolbarCandidates = [
            ...(rotateAvoidTop === null ? [] : [{ x: topCenter.x - width / 2, y: rotateAvoidTop - height - floatingToolbarGap }]),
            { x: topCenter.x - width / 2, y: topCenter.y - height - floatingToolbarGap },
            { x: bottomCenter.x - width / 2, y: bottomCenter.y + floatingToolbarGap },
            { x: rightCenter.x + floatingToolbarGap, y: rightCenter.y - height / 2 },
            { x: leftCenter.x - width - floatingToolbarGap, y: leftCenter.y - height / 2 }
          ];
          return placeFloatingToolbar(nodeToolbarCandidates, width, height, nodeFloatingToolbarAvoidRects);
        })()
      : null;
Object.assign(__appScope, { nodeFloatingToolbar });
const nodeFloatingToolbarRect = nodeFloatingToolbar ? floatingToolbarBounds(nodeFloatingToolbar) : null; Object.assign(__appScope, { nodeFloatingToolbarRect });
const selectedEdgeMidpoint = selectedRoutedEdge ? routeMidpoint(selectedRoutedEdge.points) : null; Object.assign(__appScope, { selectedEdgeMidpoint });
const edgeFloatingToolbar =
    isEditMode && !selectedToolbarHidden && selectedEdge && selectedRoutedEdge && selectedEdgeMidpoint
      ? (() => {
          const width = Math.round(EDGE_FLOATING_TOOLBAR_WIDTH * floatingToolbarScreenScale);
          const height = Math.round(EDGE_FLOATING_TOOLBAR_HEIGHT * floatingToolbarScreenScale);
          const midpoint = canvasPointToSurfaceCss(selectedEdgeMidpoint);
          const avoidRects = nodeFloatingToolbarRect ? [nodeFloatingToolbarRect] : [];
          return placeFloatingToolbar([
            { x: midpoint.x - width / 2, y: midpoint.y - height - floatingToolbarGap },
            { x: midpoint.x - width / 2, y: midpoint.y + floatingToolbarGap },
            { x: midpoint.x + floatingToolbarGap, y: midpoint.y - height / 2 },
            { x: midpoint.x - width - floatingToolbarGap, y: midpoint.y - height / 2 }
          ], width, height, avoidRects);
        })()
      : null;
Object.assign(__appScope, { edgeFloatingToolbar });
const floatingToolbarWrapperStyle = (toolbar: FloatingToolbarPlacement) => ({
    left: toolbar.x,
    top: toolbar.y,
    width: toolbar.width,
    height: toolbar.height,
    "--canvas-floating-toolbar-button-size": `${floatingToolbarButtonSize}px`,
    "--canvas-floating-toolbar-gap": `${Math.max(2, Math.round(4 * toolbar.scale))}px`,
    "--canvas-floating-toolbar-padding": `${Math.max(3, Math.round(4 * toolbar.scale))}px`,
    "--canvas-floating-toolbar-radius": `${Math.max(6, Math.round(8 * toolbar.scale))}px`
  } as CSSProperties);
Object.assign(__appScope, { floatingToolbarWrapperStyle });
const renderMeasurementGroup = createRenderMeasurementGroup(__appScope); Object.assign(__appScope, { renderMeasurementGroup });
const resizeSizeHint =
    transformDrag && transformDrag.kind !== "rotate"
      ? (() => {
          if (isGroupTransformDrag(transformDrag)) {
            const point = transformDrag.previewPoint;
            if (!point) {
              return null;
            }
            const geometry = groupTransformGeometry(transformDrag, point);
            if (geometry.kind !== "scale") {
              return null;
            }
            const width = Math.round((transformDrag.bounds.right - transformDrag.bounds.left) * geometry.scaleX);
            const height = Math.round((transformDrag.bounds.bottom - transformDrag.bounds.top) * geometry.scaleY);
            return {
              x: transformDrag.center.x,
              y: transformDrag.bounds.bottom + 26 * svgUiUnitY,
              text: `${width} x ${height}${transformDrag.proportionalScale ? " 等比" : ""}`
            };
          }
          const node = nodeById.get(transformDrag.nodeId);
          if (!node) {
            return null;
          }
          return {
            x: node.position.x,
            y: node.position.y + (node.size.height * Math.abs(getNodeScaleY(node))) / 2 + 30 * svgUiUnitY,
            text: `${Math.round(node.size.width * Math.abs(getNodeScaleX(node)))} x ${Math.round(node.size.height * Math.abs(getNodeScaleY(node)))}${transformDrag.proportionalScale || transformDrag.kind === "scale-both" ? " 等比" : ""}`
          };
        })()
      : null;
Object.assign(__appScope, { resizeSizeHint });
useEffect(createAppHookCallback137(__appScope), [editHotInteractionActive, routedEdges, visibleNodes]);
const minimapScale = Math.min(
    (CANVAS_MINIMAP_WIDTH - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasWidth),
    (CANVAS_MINIMAP_HEIGHT - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasHeight)
  );
Object.assign(__appScope, { minimapScale });
const minimapContentWidth = canvasWidth * minimapScale; Object.assign(__appScope, { minimapContentWidth });
const minimapContentHeight = canvasHeight * minimapScale; Object.assign(__appScope, { minimapContentHeight });
const minimapOffsetX = (CANVAS_MINIMAP_WIDTH - minimapContentWidth) / 2; Object.assign(__appScope, { minimapOffsetX });
const minimapOffsetY = (CANVAS_MINIMAP_HEIGHT - minimapContentHeight) / 2; Object.assign(__appScope, { minimapOffsetY });
const minimapNodeStep = Math.max(1, Math.ceil(visibleNodes.length / CANVAS_MINIMAP_MAX_NODE_MARKS)); Object.assign(__appScope, { minimapNodeStep });
const minimapRouteStep = Math.max(1, Math.ceil(routedEdges.length / CANVAS_MINIMAP_MAX_ROUTE_MARKS)); Object.assign(__appScope, { minimapRouteStep });
const minimapNodes = useMemo(createAppHookCallback138(__appScope), [editHotInteractionActive, minimapNodeStep, minimapSamplingReady, visibleNodes]);
Object.assign(__appScope, { minimapNodes });
const minimapRoutes = useMemo(createAppHookCallback139(__appScope), [editHotInteractionActive, minimapRouteStep, minimapSamplingReady, routedEdges]);
Object.assign(__appScope, { minimapRoutes });
const mapPointToMinimap = (point: Point) => ({
    x: minimapOffsetX + point.x * minimapScale,
    y: minimapOffsetY + point.y * minimapScale
  });
Object.assign(__appScope, { mapPointToMinimap });
const minimapViewportLeft = clampNumber(minimapOffsetX + canvasVisibleViewBox.x * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth); Object.assign(__appScope, { minimapViewportLeft });
const minimapViewportTop = clampNumber(minimapOffsetY + canvasVisibleViewBox.y * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight); Object.assign(__appScope, { minimapViewportTop });
const minimapViewportRight = clampNumber(minimapOffsetX + (canvasVisibleViewBox.x + canvasVisibleViewBox.width) * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth); Object.assign(__appScope, { minimapViewportRight });
const minimapViewportBottom = clampNumber(minimapOffsetY + (canvasVisibleViewBox.y + canvasVisibleViewBox.height) * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight); Object.assign(__appScope, { minimapViewportBottom });
const handleMinimapNavigate = createHandleMinimapNavigate(__appScope); Object.assign(__appScope, { handleMinimapNavigate });
const centerSelectedInView = createCenterSelectedInView(__appScope); Object.assign(__appScope, { centerSelectedInView });
const fitViewToSelection = createFitViewToSelection(__appScope); Object.assign(__appScope, { fitViewToSelection });
const isStaticButtonEnabledForNode = (node: ModelNode) =>
    isStaticButtonCapableKind(node.kind) && node.params.buttonEnabled === "1";
Object.assign(__appScope, { isStaticButtonEnabledForNode });
const clearStaticButtonFeedbackTimer = createClearStaticButtonFeedbackTimer(__appScope); Object.assign(__appScope, { clearStaticButtonFeedbackTimer });
const setStaticButtonFeedback = createSetStaticButtonFeedback(__appScope); Object.assign(__appScope, { setStaticButtonFeedback });
const clearStaticButtonFeedback = createClearStaticButtonFeedback(__appScope); Object.assign(__appScope, { clearStaticButtonFeedback });
const beginStaticButtonPointerFeedback = createBeginStaticButtonPointerFeedback(__appScope); Object.assign(__appScope, { beginStaticButtonPointerFeedback });
const resolveStaticButtonTargetProject = createResolveStaticButtonTargetProject(__appScope); Object.assign(__appScope, { resolveStaticButtonTargetProject });
const executeStaticButtonCommand = createExecuteStaticButtonCommand(__appScope); Object.assign(__appScope, { executeStaticButtonCommand });
const executeStaticButtonAction = createExecuteStaticButtonAction(__appScope); Object.assign(__appScope, { executeStaticButtonAction });
const handleStaticButtonClick = createHandleStaticButtonClick(__appScope); Object.assign(__appScope, { handleStaticButtonClick });
useEffect(createAppHookCallback140(__appScope), [activeProjectKey, backgroundProjectId, backgroundProjectRecord]);
const backgroundPageFrameRender = useMemo(createAppHookCallback141(__appScope), [activeProjectKey, backgroundProjectId, backgroundProjectRecord, canvasHeight, canvasWidth, imageAssets]);
Object.assign(__appScope, { backgroundPageFrameRender });
const backgroundPageRender = useMemo(createAppHookCallback142(__appScope), [backgroundLayerIds, backgroundPageFrameRender, backgroundPageRenderReady]);
Object.assign(__appScope, { backgroundPageRender });
const beginReadonlyBackgroundStaticButtonPointerFeedback = createBeginReadonlyBackgroundStaticButtonPointerFeedback(__appScope); Object.assign(__appScope, { beginReadonlyBackgroundStaticButtonPointerFeedback });
const renderReadonlyBackgroundPage = createRenderReadonlyBackgroundPage(__appScope); Object.assign(__appScope, { renderReadonlyBackgroundPage });
const viewportOverlayStyle = {
    "--viewport-overlay-right": `${rightPanelVisible ? rightPanelWidth + 28 : 16}px`,
    "--viewport-overlay-bottom": `${statusbarHeight + 14}px`
  } as CSSProperties;
Object.assign(__appScope, { viewportOverlayStyle });
const topologyWarningPanelVisible = inspectorTopologyErrors.length > 0 && !topologyWarningPanelClosed; Object.assign(__appScope, { topologyWarningPanelVisible });
const openTopologyWarningPanel = createOpenTopologyWarningPanel(__appScope); Object.assign(__appScope, { openTopologyWarningPanel });
const topologyWarningPanelDefaultRight =
    (rightPanelVisible ? rightPanelWidth + 28 : 16) + CANVAS_MINIMAP_WIDTH + TOPOLOGY_WARNING_PANEL_MARGIN; Object.assign(__appScope, { topologyWarningPanelDefaultRight });
const topologyWarningPanelStyle = topologyWarningPanelPosition
    ? {
        left: `${topologyWarningPanelPosition.left}px`,
        top: `${topologyWarningPanelPosition.top}px`,
        width: `${topologyWarningPanelWidth}px`,
        height: `${topologyWarningPanelHeight}px`
      } as CSSProperties
    : {
        right: `${topologyWarningPanelDefaultRight}px`,
        bottom: `${statusbarHeight + 14}px`,
        width: `${topologyWarningPanelWidth}px`,
        height: `${topologyWarningPanelHeight}px`
      } as CSSProperties;
Object.assign(__appScope, { topologyWarningPanelStyle });
const appShellStyle = {
    "--left-panel-width": `${leftPanelWidth}px`,
    "--right-panel-width": `${rightPanelWidth}px`,
    "--statusbar-height": `${statusbarHeight}px`
  } as CSSProperties;
Object.assign(__appScope, { appShellStyle });
const libraryPanelContent = useMemo(
    () => renderLibraryPanel(),
    [
      colorPalette,
      componentLibraryDisplayMode,
      collapsedExpandedModeAttributeLibraries,
      collapsedExpandedModeComponentTypes,
      displayedAttributeLibraries,
      expandedAttributeLibraries,
      expandedAttributeLibraryComponentTypes,
      filteredAttributeLibraryByComponentType,
      hoveredAttributeLibrary,
      hoveredAttributeLibraryComponentType,
      isBrowseMode,
      isEditMode,
      libraryFlyoutPositions,
      libraryPreviewByKind,
      librarySearchNeedle,
      librarySearchQuery
    ]
  );
Object.assign(__appScope, { libraryPanelContent });
const templateLibraryPanelContent = useMemo(
    () => renderTemplateLibraryPanel(),
    [
      colorPalette,
      displayedGraphTemplateTypes,
      expandedGraphTemplateTypes,
      filteredGroupedGraphTemplates,
      hoveredGraphTemplateType,
      isBrowseMode,
      isEditMode,
      libraryFlyoutPositions,
      templateLibraryDisplayMode,
      templateLibrarySearchNeedle,
      templateLibrarySearchQuery
    ]
  );
Object.assign(__appScope, { templateLibraryPanelContent });
const effectiveLeftPanelTab = isBrowseMode ? "projects" : leftPanelTab; Object.assign(__appScope, { effectiveLeftPanelTab });
const leftPanelContent = effectiveLeftPanelTab === "projects"
    ? renderProjectPanel()
    : effectiveLeftPanelTab === "templates"
      ? templateLibraryPanelContent
      : libraryPanelContent;
Object.assign(__appScope, { leftPanelContent });
const canvasResizeHandles = (
    <g className="canvas-resize-handles" aria-hidden="true">
      <rect
        className="canvas-resize-handle canvas-resize-handle-left"
        x={-CANVAS_RESIZE_HANDLE_SIZE / 2}
        y={CANVAS_RESIZE_HANDLE_SIZE}
        width={CANVAS_RESIZE_HANDLE_SIZE}
        height={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE * 2)}
        onPointerDown={(event) => startCanvasResize(event, "left")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-top"
        x={CANVAS_RESIZE_HANDLE_SIZE}
        y={-CANVAS_RESIZE_HANDLE_SIZE / 2}
        width={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE * 2)}
        height={CANVAS_RESIZE_HANDLE_SIZE}
        onPointerDown={(event) => startCanvasResize(event, "top")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-right"
        x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE / 2}
        y={CANVAS_RESIZE_HANDLE_SIZE}
        width={CANVAS_RESIZE_HANDLE_SIZE}
        height={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE * 2)}
        onPointerDown={(event) => startCanvasResize(event, "right")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-bottom"
        x={CANVAS_RESIZE_HANDLE_SIZE}
        y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE / 2}
        width={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE * 2)}
        height={CANVAS_RESIZE_HANDLE_SIZE}
        onPointerDown={(event) => startCanvasResize(event, "bottom")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-corner"
        x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE}
        y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE}
        width={CANVAS_RESIZE_HANDLE_SIZE}
        height={CANVAS_RESIZE_HANDLE_SIZE}
        onPointerDown={(event) => startCanvasResize(event, "corner")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-top-left"
        x={0}
        y={0}
        width={CANVAS_RESIZE_HANDLE_SIZE}
        height={CANVAS_RESIZE_HANDLE_SIZE}
        onPointerDown={(event) => startCanvasResize(event, "top-left")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-top-right"
        x={canvasRenderBounds.width - CANVAS_RESIZE_HANDLE_SIZE}
        y={0}
        width={CANVAS_RESIZE_HANDLE_SIZE}
        height={CANVAS_RESIZE_HANDLE_SIZE}
        onPointerDown={(event) => startCanvasResize(event, "top-right")}
      />
      <rect
        className="canvas-resize-handle canvas-resize-handle-bottom-left"
        x={0}
        y={canvasRenderBounds.height - CANVAS_RESIZE_HANDLE_SIZE}
        width={CANVAS_RESIZE_HANDLE_SIZE}
        height={CANVAS_RESIZE_HANDLE_SIZE}
        onPointerDown={(event) => startCanvasResize(event, "bottom-left")}
      />
    </g>
  );
Object.assign(__appScope, { canvasResizeHandles });

// 运行时态 WS 客户端：连入 server /ws，注册 clientId，响应 server 的 fetch 拉取。
// 第三方 /api/v1/runtime/* 经此桥接获取前端运行时态（snapshot/tab/selection/model/devices/e-file/svg/screenshot）。
// __appScope 每帧重建，用 __appScopeRef 读最新引用，避免闭包冻结在首次渲染。
const [runtimeWsStatus, setRuntimeWsStatus] = useState<"connecting" | "open" | "closed">("connecting");
const [runtimeWsBlinkSeq, setRuntimeWsBlinkSeq] = useState(0);
const [runtimeWsClientId, setRuntimeWsClientId] = useState("");
Object.assign(__appScope, { runtimeWsStatus, runtimeWsBlinkSeq, runtimeWsClientId });
useEffect(() => {
  const snapshotHandler = (resource: any, params?: any) => createRuntimeSnapshotHandler(__appScopeRef.current)(resource, params);
  const screenshotHandler = (params: any) => createRuntimeScreenshotHandler(__appScopeRef.current)(params);
  // 写指令分发：name → __appScope 上的 programmatic* 方法。
  // 方法逐个在 T4+ 装配到 __appScope；未装配时返 unknown-command，不阻断通道骨架。
  const commandHandler = async (name: string, params: any) => {
    const scope = __appScopeRef.current as any;
    const dispatch: Record<string, (p: any) => unknown> = {
      "control.scheme.create": (p) => scope.programmaticCreateScheme?.(p.name, p.parentSchemeId),
      "control.model.create": (p) => scope.programmaticCreateBlankProject?.(p.name, p.schemeId),
      "control.devices.select": (p) => scope.programmaticSelectDevices?.(p.ids, p.mode),
      "control.devices.group": () => scope.programmaticGroupSelected?.(),
      "control.template.saveFromSelection": (p) => scope.programmaticSaveSelectionAsTemplate?.(p),
      "control.device.property.update": (p) => scope.programmaticUpdateDeviceProperty?.(p.id, p.category, p.patch),
      "control.device.add": (p) => scope.programmaticAddDevice?.(p.kind, p.x, p.y, p.attrs),
      "control.device.delete": (p) => scope.programmaticDeleteDevices?.(p.ids),
      "control.save": (p) => scope.programmaticSave?.(p.scope)
    };
    const handler = dispatch[name];
    if (!handler) {
      const e: any = new Error(`未知指令：${name}`);
      e.code = "unknown-command";
      throw e;
    }
    return handler(params ?? {});
  };
  const client = createRuntimeWsClient(async (resource, params) => {
    if (resource === "runtime.screenshot") {
      return screenshotHandler(params as { width?: number; height?: number });
    }
    return snapshotHandler(resource as any, params);
  }, {
    onStatusChange: (s) => setRuntimeWsStatus(s),
    onActivity: () => setRuntimeWsBlinkSeq((n) => n + 1),
    commandHandler
  });
  setRuntimeWsClientId(client.clientId);
  client.connect();
  return () => {
    client.close();
  };
}, []);

const __appView = renderAppView(__appScope);
return __appView;
}
