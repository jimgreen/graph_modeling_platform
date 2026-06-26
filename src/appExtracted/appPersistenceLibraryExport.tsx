// @ts-nocheck
import { ChangeEvent, DragEvent, Fragment, Suspense, isValidElement, lazy, memo, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent, type CSSProperties, type ReactNode, type SetStateAction, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
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
  type SavedProjectRecord,
  getSafeNodeScaleX,
  getSafeNodeScaleY
} from "../model";
import { isGlobalSaveShortcut, resolveKeyboardShortcutScope } from "../keyboardShortcuts";
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
} from "../graphStore";
import {
  createRouteStore,
  queryRouteSpatialIndex,
  routeRenderBounds,
  routeSpatialIndexRenderBounds,
  routeStorePatchRoutes,
  routeStorePatchRoutesById,
  routeStoreSetRoutes,
  type RouteStore
} from "../routeStore";
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
} from "../selectionActions";
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
} from "../canvasViewport";
import {
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  shouldIgnoreWorkspaceAutoHide,
  type SidePanelMode,
  type SidePanelSide
} from "../sidePanelVisibility";
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
} from "../measurements";
import {
  StaticButtonLayerMultiSelect,
  TextStyleToggleButton,
  type StaticButtonLayerMultiSelectProps,
  type TextStyleToggleButtonProps,
} from "../components/StaticButtonComponents";
import {
  normalizeRotationDegrees,
  formatStatusNumber,
  formatInspectorScaleValue,
  formatStatusScalePercent,
  formatStatusRotationDegrees,
  degreesToRadians
} from "../formatUtils";
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
} from "../fileIO";
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
} from "../svgUtils";
import {
  DeferredColorInput,
  BufferedTextInput,
  BufferedTextarea,
  colorInputValue,
  type DeferredColorInputProps,
  type BufferedTextInputProps,
  type BufferedTextareaProps
} from "../components/InputComponents";
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
} from "../nodeLabelUtils";
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
} from "../staticRenderUtils";
import { snapSingleTerminalAnchorToNearestSide, projectedProportionalScaleFromHandleDelta } from "../transformUtils";
import { DeviceGlyph, MemoDeviceGlyph, SvgMarkupChunk } from "../DeviceGlyph";
import { buildSvgNodeLabelMarkup, svgDisplayAttribute, exportSvgSafeId, exportSvgLayerId, exportSvgUniqueId, exportSvgLayerScriptMarkup, exportDeviceMetadataAttributes, exportMeasurementGroupMetadataAttributes, exportMeasurementItemMetadataAttributes, exportMeasurementGroupBackgroundColor, exportMeasurementGroupBorderColor, exportMeasurementGroupBorderWidth, exportMeasurementGroupBorderDashArray, exportMeasurementGroupAnchorPoint, exportMeasurementGroupLocalOffset, exportMeasurementGroupMetrics, buildExportMeasurementGroupMarkup } from "../svgExportUtils";
import { customParamId, deviceDefinitionRowId, stateDraftRowId, DEFAULT_STATE_PAGE_ID, isDefaultStatePageId, createStateDraftRow, createStateDraftRowFromDefaultVisual, createDefinitionStateDraftRows, normalizeStateDraftRows, validateStateDraftRows, stateVisualFromDraftRow, activeStateDraftRow, normalizeStatePageId, stateDraftImageValue, stateVisualShapeLabel, generateStateVisualShapeImage, stateIconDrawingElementId, visibleStateIconColor, createStateIconDrawingElement, createImportedStateIconElement, svgSourceFromDataUrl, parseStateIconSvgSource, stateIconSvgElementSource, parseSvgStyleAttribute, stateIconSvgReactAttributes, stateIconSvgNodeChildren, stateIconSvgNodeToReact, stateIconSvgSourceToReactNodes, createEditableStateIconElementsFromSvgSource, createStateIconDrawingInitialElements, svgSourceToDataUrl, stateIconDrawingSvgElementMarkup, stateIconDrawingElementMarkup, stateIconDrawingToImage, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, type StateVisualShapeKind, type StateIconDrawingElement, type DeviceDefinitionStateDraftRow } from "../stateIconDrawing";
import { fallbackComponentTypeForAttributeLibrary, resolveTemplateComponentType, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, isReservedDeviceDefinitionParamName, createDefinitionDraftRows, normalizeCustomDeviceTerminalAnchorCoordinate, projectCustomDeviceTerminalAnchorToBoundary, customDeviceTerminalAnchorKey, hasOverlappingCustomDeviceTerminalAnchors, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, createCustomDeviceDraftFromTemplate, createDefinitionVisualDraft, defaultContainerAssociationForTerminalType, isAssociationAllowedForTerminal, normalizeContainerTerminalAssociations, customDefaultDefinitions, generateCustomDeviceImage, customDeviceImageWithTerminalConnectors, customDeviceGeneratedDefaultImageCandidates, syncInheritedCustomDeviceStateVisuals, parseCustomDefinitions, screenToSvgPoint, primaryOrthogonalAxis, constrainPointToOrthogonalAxis } from "../customDeviceUtils";
import { useBatchEditors } from "../hooks/useBatchEditors";
import { ENABLE_REACT_FLOW_PREVIEW, ReactFlowPreview, INTERACTION_MODE_STORAGE_KEY, CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR, CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR, CANVAS_KEYBOARD_BLOCKING_SELECTOR, CANVAS_KEYBOARD_SURFACE_SELECTOR, normalizeInteractionMode, isCanvasGraphicContextMenuTarget, isCanvasWheelZoomExcludedTarget, canvasWheelTargetIsRenderedCanvas, isCanvasKeyboardBlockingTarget, readStoredInteractionMode, writeStoredInteractionMode, CANVAS_SELECTION_DRAG_THRESHOLD, hasCanvasSelectionModifier, canvasWheelEventHasNoModifier, shouldZoomCanvasFromWheelEvent, isGroupTransformDrag, selectionRectCenter, combineSelectionRects, routeMidpoint, rotatePointAround, snapRotationDeltaToRightAngle, normalizedRotationDelta, transformPointAngle, rotationDeltaFromTransformPoint, rotationDeltaBetweenTransformPoints, rotationTrajectoryArcPath, mirrorPointAcrossAxis, localScaleKindForScreenHandle, groupTransformGeometry, transformGroupPoint, groupTransformSvgTransform, NODE_LABEL_DISPLAY_MODES, CONTEXT_MENU_VIEWPORT_PADDING, CONTEXT_MENU_FALLBACK_WIDTH, CONTEXT_MENU_FALLBACK_HEIGHT, CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH, CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT, NODE_LABEL_FOOTPRINT_PARAM_KEYS, isMultiNodeMoveState, reuseSetOrCreate, cloneMeasurementGroupForDraft, terminalColor, busEndpointColor, ENERGY_COLOR_ROWS, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, isElectricPaletteType, terminalVbaseFallbackValue, voltageColorKeyForTerminal, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_BACKGROUND, MOVE_BOUNDARY_GUARD, CANVAS_AUTO_EXPAND_PADDING, CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE, CANVAS_RESIZE_HANDLE_SIZE, MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, ORIGINAL_POSITION_REROUTE_PADDING, MOVE_ROUTE_LOCAL_SEARCH_PADDING, MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES, MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, KEYBOARD_MOVE_COMMIT_DELAY_MS, KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND, KEYBOARD_MOVE_FRAME_INTERVAL_MS, ELEMENT_TREE_INITIAL_ITEM_LIMIT, ELEMENT_TREE_ITEM_LIMIT_STEP, TOPOLOGY_WARNING_PAGE_SIZE, CANVAS_MINIMAP_WIDTH, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_PADDING, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH, NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MARGIN, DEVICE_DEFINITION_DIALOG_DEFAULT_WIDTH, DEVICE_DEFINITION_DIALOG_DEFAULT_HEIGHT, CUSTOM_DEVICE_DIALOG_DEFAULT_WIDTH, CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT, MEASUREMENT_CONFIG_DIALOG_DEFAULT_WIDTH, MEASUREMENT_CONFIG_DIALOG_DEFAULT_HEIGHT, DEVICE_LIBRARY_DIALOG_MIN_WIDTH, DEVICE_LIBRARY_DIALOG_MIN_HEIGHT, DEVICE_LIBRARY_DIALOG_MARGIN, DEVICE_LIBRARY_DIALOG_CONFIG, TOPOLOGY_WARNING_PANEL_DEFAULT_WIDTH, TOPOLOGY_WARNING_PANEL_MIN_WIDTH, TOPOLOGY_WARNING_PANEL_MAX_WIDTH, TOPOLOGY_WARNING_PANEL_MARGIN, CANVAS_MINIMAP_MAX_NODE_MARKS, CANVAS_MINIMAP_MAX_ROUTE_MARKS, CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD, FIT_SELECTION_MAX_ZOOM_PERCENT, TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD, CANVAS_LOD_NODE_DETAIL_LIMIT, CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, CANVAS_LOD_MAX_ZOOM_PERCENT, CANVAS_LOD_MAX_NODE_SCREEN_SIZE, CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT, CANVAS_LOD_SELECTED_DETAIL_LIMIT, CANVAS_LOD_MARKUP_CHUNK_SIZE, CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE, CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS, CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, CONNECTION_HIT_SCREEN_TOLERANCE, CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT, CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT, CANVAS_BULK_MOVE_EDGE_THRESHOLD, ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD, BULK_MOVE_PERF_LOG_THRESHOLD_MS, SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, SMART_ALIGNMENT_GUIDE_PADDING, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, CANVAS_FLOATING_TOOLBAR_GAP, NODE_FLOATING_TOOLBAR_WIDTH, NODE_FLOATING_TOOLBAR_HEIGHT, EDGE_FLOATING_TOOLBAR_WIDTH, EDGE_FLOATING_TOOLBAR_HEIGHT, CONTEXT_MENU_AUTO_HIDE_MARGIN, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, E_SECTION_OPTIONS, COMPONENT_TYPE_LABELS, SCALE_HANDLE_CONFIGS, GROUP_SCALE_HANDLE_CONFIGS, POWER_UNIT_OPTIONS, VOLTAGE_UNIT_OPTIONS, CURRENT_UNIT_OPTIONS, DEFAULT_ATTRIBUTE_LIBRARIES, CUSTOM_ATTRIBUTE_LIBRARY_BASES, PROTECTED_ATTRIBUTE_LIBRARIES, DEVICE_TYPE_NAME_PATTERN, MAX_CUSTOM_DEVICE_TERMINALS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, TERMINAL_TYPE_OPTIONS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, PARAM_VALUE_TYPE_OPTIONS, PROJECT_PANEL_MIN_HEIGHT, PROJECT_PANEL_MAX_HEIGHT, PROJECT_PANEL_DEFAULT_HEIGHT, LEFT_PANEL_DEFAULT_WIDTH, RIGHT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH, STATUSBAR_DEFAULT_HEIGHT, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT, VALIDATION_PANEL_DEFAULT_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT, CONNECT_TERMINAL_SNAP_TOLERANCE, CONNECT_BUS_SNAP_TOLERANCE, connectTargetSearchBounds, findNodeTerminalSnapTarget, applyNodeTerminalSnap, pointOnBusForSnap, findNodeBusSnapTarget, SAMPLE_NODES, SAMPLE_EDGES, PROJECT_STORAGE_KEY, SCHEME_STORAGE_KEY, ACTIVE_PROJECT_STORAGE_KEY, DRAFT_PROJECT_STORAGE_KEY, REFRESH_RECOVERY_STORAGE_KEY, EMPTY_VOLTAGE_COLOR_KEY_SET, EMPTY_ID_LIST, EMPTY_EDGE_ID_LIST, EMPTY_MODEL_GROUPS, EMPTY_MODEL_GROUP_BY_ID, EMPTY_CANVAS_LAYOUT_UNITS, EMPTY_CANVAS_SELECTION, IMAGE_STORAGE_KEY, CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY, CUSTOM_COMPONENT_TYPES_STORAGE_KEY, DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, COLOR_DISPLAY_MODE_STORAGE_KEY, COLOR_PALETTE_STORAGE_KEY, MEASUREMENT_CONFIG_STORAGE_KEY, LEFT_PANEL_MODE_STORAGE_KEY, RIGHT_PANEL_MODE_STORAGE_KEY, LEFT_PANEL_WIDTH_STORAGE_KEY, RIGHT_PANEL_WIDTH_STORAGE_KEY, STATUSBAR_HEIGHT_STORAGE_KEY, VALIDATION_PANEL_HEIGHT_STORAGE_KEY, DEFAULT_GRAPH_TEMPLATE_TYPES, scheduleIdleWork, elementTreeCacheSignature, CONNECTION_REDRAW_SCOPE_LABELS, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_BASE_SET_PRESETS, VIEWPORT_RENDER_PADDING_RATIO, VIEWPORT_RENDER_MIN_PADDING, CANVAS_VIEWPORT_QUERY_SNAP_SIZE, NODE_SPATIAL_BUCKET_SIZE, nextSpatialQueryMark, expandViewBoxForRendering, snapRenderViewportBoundsForQuery, sameCanvasViewBox, canvasFrameHasHorizontalScrollableRange, canvasFrameHasVerticalScrollableRange, canvasFrameHasScrollableRange, renderedCanvasFullyFitsFrame, canvasFrameViewportSizeChanged, visibleCanvasViewBoxFromRects, canvasScrollScaleFromViewBox, estimatedViewportNodeScreenSize, canvasScrollEdgeInset, canvasScrollSurfaceSize, canvasDisplayOffset, canvasFramePaddingOffset, anchoredCanvasScrollPosition, anchoredCanvasNoScrollOffset, initialVisibleCanvasViewBox, fitWholeCanvasViewBox, boxesIntersect, sameRenderViewportBounds, VIEWPORT_RESULT_CACHE_LIMIT, viewportBoundsCacheKey, viewportResultCacheOwnersEqual, resetViewportResultCache, readViewportResultCache, writeViewportResultCache, mergeRenderViewportBounds, smartAlignmentAxisAnchors, bestSmartAlignmentAxisSnap, nodeRenderBounds, nodeIntersectsRenderViewport, spatialBucketKey, spatialBucketRange, buildNodeSpatialIndex, queryNodeSpatialIndex, compactPreviewNodes, PARAM_LABELS, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, PARAM_OPTIONS, STATIC_BUTTON_ACTION_LABELS, STATIC_BUTTON_COMMAND_LABELS, PARAM_OPTION_LABELS, parseStaticButtonTargetLayerValues, serializeStaticButtonTargetLayerIds, resolveStaticButtonTargetLayers, paramOptionsForSection, READONLY_E_PARAM_KEYS, BATCH_PARAM_EXCLUDED_KEYS, BATCH_PARAM_EXCLUDED_PREFIXES, canBatchEditParam, BATCH_GRAPH_PARAM_KEYS, BATCH_GRAPH_PARAM_PREFIXES, isBatchGraphCommonParamKey, isRedundantBatchCommonParamRow, COLOR_PARAM_KEY_PATTERN, isColorParamKey, BATCH_MEASUREMENT_GROUP_KEYS, BATCH_MEASUREMENT_GROUP_LABELS, measurementGroupCommonValue, measurementGroupWithCommonSetting, normalizeLegacyPowerSystemLabel, normalizeSavedProjectIndexes, normalizeSavedSchemeIndexes, normalizeStoredDraftProject, readActiveProjectPointer, savedSchemePathForId, findSavedSchemeByPath, findSavedProjectByActivePointer, activeProjectPointerPayload, draftProjectFromSavedSchemes, readRefreshRecoveryProject, writeRefreshRecoveryProject, clearRefreshRecoveryProject, readImageAssets, saveImageAsset, resolveNodeImage, resolveNodeForegroundImage, resolveProjectImage, imageAssetsToMap, localImageAssetsFromStorage, pointsToPreviewPath, backendJsonHeaders, backendErrorMessage, fetchBackendJson, backendJsonRequest, fetchBackendImageFolders, createBackendImageFolder, renameBackendImageFolder, deleteBackendImageFolder, fetchBackendImages, fetchAllBackendImages, uploadBackendImage } from "./appCoreCanvasUtilities";

export function normalizeProjectForBackend(project: ProjectFile): ProjectFile {
  const projectBackground =
    project.canvasBackgroundImageAssetId && typeof project.canvasBackgroundImage === "string" && project.canvasBackgroundImage.startsWith("data:")
      ? `/api/images/${project.canvasBackgroundImageAssetId}`
      : project.canvasBackgroundImage;
  return {
    ...project,
    canvasBackgroundColor: project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
    canvasBackgroundImage: projectBackground,
    powerUnit: project.powerUnit ?? DEFAULT_POWER_UNIT,
    voltageUnit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
    currentUnit: project.currentUnit ?? DEFAULT_CURRENT_UNIT,
    powerBaseValue:
      typeof project.powerBaseValue === "number" && Number.isFinite(project.powerBaseValue)
        ? project.powerBaseValue
        : DEFAULT_POWER_BASE_VALUE,
    nodes: project.nodes.map((node) => {
      const assetId = node.params.backgroundImageAssetId;
      const backgroundImage = node.params.backgroundImage;
      const params: Record<string, string> =
        assetId && typeof backgroundImage === "string" && backgroundImage.startsWith("data:")
          ? { ...node.params, backgroundImage: `/api/images/${assetId}` }
          : { ...node.params };
      if (params.foregroundImageAssetId && typeof params.foregroundImage === "string" && params.foregroundImage.startsWith("data:")) {
        params.foregroundImage = `/api/images/${params.foregroundImageAssetId}`;
      }
      return {
        ...node,
        params,
        terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
      };
    }),
    edges: project.edges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
      targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
      manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
      routePoints: edge.routePoints?.map((point) => ({ ...point }))
    })),
    groups: normalizeModelGroups(project.groups, project.nodes, project.edges)
  };
}

export function normalizeSchemesForBackendRuntime(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  return schemes.map((scheme) => ({
    ...scheme,
    projects: normalizeSavedProjectRecordNames(
      scheme.projects.map((project) => ({
        ...project,
        project: normalizeProjectForBackend(project.project)
      }))
    ),
    children: Array.isArray(scheme.children) ? normalizeSchemesForBackendRuntime(scheme.children) : []
  }));
}

export function normalizeSchemesForBackend(schemes: SavedSchemeRecord[]): PersistedSavedSchemeRecord[] {
  return stripSavedSchemeRuntimeIds(normalizeSchemesForBackendRuntime(schemes));
}

export function serializeSchemesForStorage(schemes: SavedSchemeRecord[]) {
  return JSON.stringify(normalizeSchemesForBackend(schemes));
}

export function findProjectRecordInSchemes(
  schemes: SavedSchemeRecord[],
  projectId: string,
  preferredSchemeId = ""
): { scheme: SavedSchemeRecord; project: SavedProjectRecord } | null {
  return findSavedProjectRecordInSchemes(schemes, projectId, preferredSchemeId);
}

export function findProjectRecordByNameInScheme(
  scheme: SavedSchemeRecord | undefined,
  projectName: string
): SavedProjectRecord | null {
  if (!scheme) {
    return null;
  }
  const key = savedProjectRecordNameKey(projectName);
  return scheme.projects.find((project) => savedProjectRecordNameKey(project.name) === key) ?? null;
}

export const clonePoint = (point: Point): Point => ({ x: point.x, y: point.y });

export function cloneNodesForUndo(sourceNodes: ModelNode[]): ModelNode[] {
  return sourceNodes.map((node) => ({
    ...node,
    position: clonePoint(node.position),
    size: { ...node.size },
    terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: clonePoint(terminal.anchor) })),
    params: { ...node.params }
  }));
}

export function cloneEdgesForUndo(sourceEdges: Edge[]): Edge[] {
  return sourceEdges.map((edge) => ({
    ...edge,
    sourcePoint: edge.sourcePoint ? clonePoint(edge.sourcePoint) : undefined,
    targetPoint: edge.targetPoint ? clonePoint(edge.targetPoint) : undefined,
    manualPoints: edge.manualPoints?.map(clonePoint),
    routePoints: edge.routePoints?.map(clonePoint)
  }));
}

export function cloneGroupsForUndo(sourceGroups: ModelGroup[]): ModelGroup[] {
  return sourceGroups.map((group) => ({
    ...group,
    nodeIds: [...group.nodeIds],
    edgeIds: [...group.edgeIds],
    childGroupIds: group.childGroupIds ? [...group.childGroupIds] : undefined
  }));
}

export function cloneTopologyForUndo(sourceTopology: Topology): Topology {
  return {
    nodes: Object.fromEntries(
      Object.entries(sourceTopology.nodes).map(([id, node]) => [
        id,
        {
          ...node,
          neighbors: [...node.neighbors],
          edgeIds: [...node.edgeIds]
        }
      ])
    ),
    connectedComponents: sourceTopology.connectedComponents.map((component) => [...component])
  };
}

export function cloneTopologyErrorsForUndo(errors: TopologyValidationError[]): TopologyValidationError[] {
  return errors.map((error) => ({ ...error, relatedNodeIds: [...error.relatedNodeIds] }));
}

export function clampCanvasDimension(value: number, min: number, max: number, fallback: number) {
  return Math.round(clampNumber(Number.isFinite(value) ? value : fallback, min, max));
}

export async function fetchBackendSchemes(): Promise<SavedSchemeRecord[]> {
  const payload = await fetchBackendJson<BackendSchemesResponse | SavedSchemeRecord[]>("/api/schemes", "读取后台方案/模型失败。");
  const schemes = Array.isArray(payload) ? payload : Array.isArray(payload.schemes) ? payload.schemes : [];
  return hydrateSavedSchemeRuntimeIds(schemes.map(normalizeSavedSchemeIndexes));
}

export function schemePathQueryParam(name: string, path: string[]) {
  return `${name}=${encodeURIComponent(JSON.stringify(path))}`;
}

export function savedProjectRecordIsSummary(record: SavedProjectRecord | null | undefined) {
  return Boolean((record?.project as ProjectFile & { __summaryOnly?: boolean } | undefined)?.__summaryOnly);
}

export async function fetchBackendProjectRecord(schemePath: string[], name: string): Promise<SavedProjectRecord> {
  const payload = await fetchBackendJson<BackendProjectLoadResponse>(
    `/api/schemes/project?${schemePathQueryParam("schemePath", schemePath)}&name=${encodeURIComponent(name)}`,
    "读取后台模型失败。"
  );
  if (!payload.project) {
    throw new Error(payload.error || "后台未返回模型数据。");
  }
  return normalizeSavedProjectIndexes(payload.project);
}

export async function downloadBackendSchemeArchive(schemePath: string[], filename: string): Promise<boolean> {
  return saveLazyBlobFile({
    filename,
    mime: "application/zip",
    description: "方案压缩包",
    extensions: [".zip"],
    pickerId: SCHEME_EXPORT_DIRECTORY_PICKER_ID,
    loadBlob: async () => {
      const response = await fetch(`/api/schemes/export?${schemePathQueryParam("schemePath", schemePath)}`);
      if (!response.ok) {
        throw new Error(await backendErrorMessage(response, "导出方案压缩包失败。"));
      }
      return response.blob();
    }
  });
}

export async function uploadBackendSchemeArchive(
  file: File,
  parentPath: string[],
  options: { mode?: "check" | "overwrite"; targetName?: string } = {}
): Promise<BackendSchemeArchiveImportResponse> {
  const params = new URLSearchParams({
    parentPath: JSON.stringify(parentPath),
    fileName: file.name,
    mode: options.mode ?? "check"
  });
  if (options.targetName) {
    params.set("targetName", options.targetName);
  }
  const response = await fetch(`/api/schemes/import?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": file.type || "application/zip" },
    body: file
  });
  const payload = (await response.json().catch(() => ({}))) as BackendSchemeArchiveImportResponse;
  if (response.status === 409 && payload.conflict) {
    return { ...payload, conflict: true };
  }
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "导入方案压缩包失败。");
  }
  return payload;
}

export async function saveBackendProjectRecord(schemePath: string[], record: SavedProjectRecord, previousName = ""): Promise<SavedProjectRecord> {
  if (savedProjectRecordIsSummary(record)) {
    throw new Error(`模型“${record.name}”仍是目录摘要，尚未读取完整内容，不能写回后台。`);
  }
  const payload = await fetchBackendJson<BackendProjectSaveResponse>(
    "/api/schemes/project",
    "保存模型到后台失败。",
    backendJsonRequest("PUT", JSON.stringify({
      schemePath,
      previousName,
      record: normalizeSchemesForBackend([createSavedScheme("__single_project__", [record])])[0]?.projects?.[0] ?? record
    }))
  );
  return payload.project ? { ...normalizeSavedProjectIndexes(payload.project), id: record.id } : record;
}

export async function deleteBackendProjectRecord(schemePath: string[], name: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/schemes/project",
    "删除后台模型失败。",
    backendJsonRequest("DELETE", JSON.stringify({ schemePath, name }))
  );
}

export async function saveBackendSchemeRecord(schemePath: string[], previousSchemePath?: string[]): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/schemes/scheme",
    "保存方案到后台失败。",
    backendJsonRequest("PUT", JSON.stringify({ schemePath, previousSchemePath }))
  );
}

export async function deleteBackendSchemeRecord(schemePath: string[]): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/schemes/scheme",
    "删除后台方案失败。",
    backendJsonRequest("DELETE", JSON.stringify({ schemePath }))
  );
}

export function normalizeColorDisplayMode(value?: string): ColorDisplayMode {
  return value === "voltage" ? "voltage" : "energy";
}

export function serializeColorConfigForStorage(mode: ColorDisplayMode, palette: ColorPalette) {
  return JSON.stringify({
    colorDisplayMode: mode,
    colorPalette: normalizeColorPalette(palette)
  });
}

export async function fetchBackendColorConfig(): Promise<{ colorDisplayMode: ColorDisplayMode; colorPalette: ColorPalette; exists: boolean }> {
  const payload = await fetchBackendJson<BackendColorConfigResponse>("/api/color-config", "读取后台配色配置失败。");
  return {
    colorDisplayMode: normalizeColorDisplayMode(payload.colorDisplayMode),
    colorPalette: normalizeColorPalette(payload.colorPalette),
    exists: Boolean(payload.exists)
  };
}

export async function saveBackendColorConfigPayload(normalizedColorConfigPayload: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/color-config",
    "保存配色配置到后台失败。",
    backendJsonRequest("PUT", normalizedColorConfigPayload)
  );
}

export function serializeDeviceLibraryForStorage(payload: DeviceLibraryPersistencePayload) {
  return JSON.stringify(normalizeDeviceLibraryPersistencePayload(payload));
}

export async function fetchBackendDeviceLibrary(): Promise<DeviceLibraryPersistencePayload & { exists: boolean }> {
  const payload = await fetchBackendJson<BackendDeviceLibraryResponse>("/api/device-library", "读取后台图元库失败。");
  return {
    ...normalizeDeviceLibraryPersistencePayload(payload),
    exists: Boolean(payload.exists)
  };
}

export async function saveBackendDeviceLibraryPayload(normalizedDeviceLibraryPayload: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/device-library",
    "保存图元库到后台失败。",
    backendJsonRequest("PUT", normalizedDeviceLibraryPayload)
  );
}

export function serializeMeasurementConfigForStorage(config: PlatformMeasurementConfig) {
  return JSON.stringify(normalizeMeasurementConfig(config));
}

export async function fetchBackendMeasurementConfig(): Promise<PlatformMeasurementConfig & { exists: boolean }> {
  const payload = await fetchBackendJson<BackendMeasurementConfigResponse>("/api/measurement-config", "读取后台动态量测配置失败。");
  return {
    ...normalizeMeasurementConfig(payload),
    exists: Boolean(payload.exists)
  };
}

export async function saveBackendMeasurementConfigPayload(normalizedMeasurementConfigPayload: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    "/api/measurement-config",
    "保存动态量测配置到后台失败。",
    backendJsonRequest("PUT", normalizedMeasurementConfigPayload)
  );
}

export function groupDeviceTemplatesByAttributeLibrary(templates: DeviceTemplate[]): Record<string, DeviceTemplate[]> {
  return templates.reduce<Record<string, DeviceTemplate[]>>((groups, item) => {
    const group = normalizeAttributeLibraryName(item.attributeLibrary);
    groups[group] = groups[group] ? [...groups[group], { ...item, attributeLibrary: group }] : [{ ...item, attributeLibrary: group }];
    return groups;
  }, {});
}

export function groupDeviceTemplatesByAttributeLibraryAndComponentType(templates: DeviceTemplate[]): Record<string, AttributeLibraryComponentTypeGroup[]> {
  const grouped = new Map<string, Map<string, DeviceTemplate[]>>();
  for (const template of templates) {
    const group = normalizeAttributeLibraryName(template.attributeLibrary);
    const section = resolveTemplateComponentType(template);
    if (!grouped.has(group)) {
      grouped.set(group, new Map());
    }
    const typeMap = grouped.get(group);
    if (!typeMap) {
      continue;
    }
    typeMap.set(section, [...(typeMap.get(section) ?? []), { ...template, attributeLibrary: group }]);
  }
  return Object.fromEntries(
    Array.from(grouped.entries()).map(([group, typeMap]) => [
      group,
      Array.from(typeMap.entries()).map(([section, typedTemplates]) => ({ section, templates: typedTemplates }))
    ])
  );
}

export function normalizeLibrarySearchText(value: string) {
  return value.trim().toLowerCase();
}

export const attributeLibraryComponentTypeKey = (attributeLibraryName: string, sectionName: string) =>
  `${normalizeAttributeLibraryName(attributeLibraryName)}::${sectionName}`;

export function componentTypeDisplayParts(sectionName: string) {
  const english = normalizeComponentTypeName(sectionName);
  const chinese = COMPONENT_TYPE_LABELS[english] ?? "自定义元件类型";
  return {
    chinese,
    english,
    title: `${chinese} / ${english}`
  };
}

export function componentTypeDisplayName(sectionName: string) {
  const display = componentTypeDisplayParts(sectionName);
  return display.english ? display.title : display.chinese;
}

export function filterSelectionTreeLabel(label: string, typeKey: string) {
  const normalizedLabel = label.trim();
  const normalizedTypeKey = typeKey.trim();
  if (!normalizedLabel) {
    return normalizedTypeKey;
  }
  if (!normalizedTypeKey) {
    return normalizedLabel;
  }
  const labelHasTypeKey = normalizedLabel
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .includes(normalizedTypeKey.toLowerCase());
  return labelHasTypeKey || normalizedLabel.toLowerCase() === normalizedTypeKey.toLowerCase()
    ? normalizedLabel
    : `${normalizedLabel} / ${normalizedTypeKey}`;
}

export const filterSelectionTemplateComponentTypeKey = (template: DeviceTemplate) =>
  inferESection(template.kind, {}) ||
  inferESection(template.kind, template.params) ||
  String(template.params.component_type || template.params.componentType || template.kind);

export function libraryTemplateMatchesSearch(template: DeviceTemplate, group: string, section: string, needle: string) {
  if (!needle) {
    return true;
  }
  return [group, section, componentTypeDisplayName(section), template.label, template.kind, template.params?.component_type]
    .filter((value): value is string => typeof value === "string")
    .some((value) => normalizeLibrarySearchText(value).includes(needle));
}

export function filterAttributeLibraryComponentTypeGroups(
  grouped: Record<string, AttributeLibraryComponentTypeGroup[]>,
  needle: string
) {
  if (!needle) {
    return grouped;
  }
  const filteredEntries = Object.entries(grouped)
    .map(([group, typeGroups]) => {
      const groupMatches = normalizeLibrarySearchText(group).includes(needle);
      const filteredTypeGroups = typeGroups
        .map((typeGroup) => {
          const sectionMatches = normalizeLibrarySearchText(componentTypeDisplayName(typeGroup.section)).includes(needle);
          const templates = groupMatches || sectionMatches
            ? typeGroup.templates
            : typeGroup.templates.filter((item) => libraryTemplateMatchesSearch(item, group, typeGroup.section, needle));
          return templates.length ? { ...typeGroup, templates } : null;
        })
        .filter((typeGroup): typeGroup is AttributeLibraryComponentTypeGroup => Boolean(typeGroup));
      return filteredTypeGroups.length ? [group, filteredTypeGroups] as const : null;
    })
    .filter((entry): entry is readonly [string, AttributeLibraryComponentTypeGroup[]] => Boolean(entry));
  return Object.fromEntries(filteredEntries);
}

export function normalizeAttributeLibraryName(attributeLibraryName: string): string {
  if (attributeLibraryName === "交流系统") {
    return "交流设备";
  }
  if (attributeLibraryName === "直流系统") {
    return "直流设备";
  }
  if (attributeLibraryName === "变流设备") {
    return "直流设备";
  }
  return attributeLibraryName;
}

export function normalizeCustomAttributeLibraries(value: unknown, reservedGroups: readonly AttributeLibrary[] = DEFAULT_ATTRIBUTE_LIBRARIES): AttributeLibrary[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const reserved = new Set(reservedGroups.map((group) => normalizeAttributeLibraryName(group).toLowerCase()));
  const seen = new Set<string>();
  return value
    .map((item) => normalizeAttributeLibraryName(String(item ?? "").trim()))
    .filter((group) => {
      if (!group) {
        return false;
      }
      const key = group.toLowerCase();
      if (reserved.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function normalizeComponentTypeName(name: string): string {
  return name.trim();
}

export function defaultAttributeLibraryForComponentType(sectionName: string): AttributeLibrary {
  const section = normalizeComponentTypeName(sectionName);
  if (section.startsWith("Static")) {
    return "静态图元";
  }
  if (section.startsWith("Hydro")) {
    return "氢能设备";
  }
  if (section.startsWith("Heat")) {
    return "热能设备";
  }
  if (section === "ACDCConverter" || section.startsWith("DC") || section.startsWith("DCDC") || section.startsWith("DCAC")) {
    return "直流设备";
  }
  if (section.startsWith("AC") || section === "GroundDisconnector") {
    return "交流设备";
  }
  return "交流设备";
}

export function isBuiltInAttributeLibrary(attributeLibraryName: string): boolean {
  return PROTECTED_ATTRIBUTE_LIBRARIES.has(normalizeAttributeLibraryName(attributeLibraryName));
}

export function isBuiltInComponentType(sectionName: string): boolean {
  const normalized = normalizeComponentTypeName(sectionName).toLowerCase();
  return E_SECTION_OPTIONS.some((section) => section.toLowerCase() === normalized);
}

export function attributeLibraryOptionClass(attributeLibraryName: string): string {
  return isBuiltInAttributeLibrary(attributeLibraryName) ? "builtin-option" : "custom-option";
}

export function componentTypeOptionClass(sectionName: string): string {
  return isBuiltInComponentType(sectionName) ? "builtin-option" : "custom-option";
}

export function sourceSelectClassName(isBuiltIn: boolean): string {
  return `source-select ${isBuiltIn ? "builtin-source" : "custom-source"}`;
}

export function isValidComponentTypeName(name: string): boolean {
  return DEVICE_TYPE_NAME_PATTERN.test(name);
}

export function normalizeCustomComponentTypes(value: unknown, reservedTypes: readonly string[] = E_SECTION_OPTIONS): CustomComponentTypeDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const reserved = new Set(reservedTypes.map((type) => type.toLowerCase()));
  const seen = new Set<string>();
  return value
    .map((item) => {
      const raw = item && typeof item === "object" ? item as Partial<CustomComponentTypeDefinition> : undefined;
      const name = normalizeComponentTypeName(String(raw?.name ?? item ?? ""));
      const attributeLibraryName = normalizeAttributeLibraryName(String(raw?.attributeLibraryName ?? defaultAttributeLibraryForComponentType(name)));
      return { name, attributeLibraryName };
    })
    .filter((componentType) => {
      if (!isValidComponentTypeName(componentType.name)) {
        return false;
      }
      const key = componentType.name.toLowerCase();
      if (reserved.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export const templateResizeTransformValue = (template: Pick<DeviceTemplate, "kind" | "params" | "allowResizeTransform">) => {
  if (template.allowResizeTransform !== undefined) {
    return template.allowResizeTransform ? "1" : "0";
  }
  return template.params[ALLOW_RESIZE_TRANSFORM_PARAM] ??
    (defaultAllowsResizeTransformForKind(template.kind) ? "1" : "0");
};

export const templateAllowsResizeTransform = (template: Pick<DeviceTemplate, "kind" | "params" | "allowResizeTransform">) =>
  templateResizeTransformValue(template) === "1";

export const DEFAULT_PARAMETER_ENUM_VALUES: Record<string, string[]> = {
  status: ["1", "0"],
  run_stat: ["运行", "停运"]
};

export const DEFAULT_PARAMETER_ENUM_OPTIONS: Record<string, DeviceParameterEnumOption[]> = {
  status: [
    { value: "1", label: "闭合" },
    { value: "0", label: "打开/开断" }
  ],
  run_stat: [
    { value: "运行" },
    { value: "停运" }
  ]
};

export const normalizeEnumValueList = (values: unknown, typicalValue = ""): string[] => {
  const sourceValues = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const enumValues: string[] = [];
  for (const value of sourceValues) {
    const text = String(value ?? "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    enumValues.push(text);
  }
  const typical = typicalValue.trim();
  if (typical && !seen.has(typical)) {
    enumValues.push(typical);
  }
  return enumValues;
};

export const definitionRowIsEnum = (row: Pick<DeviceParameterDefinition, "valueType"> | undefined) => {
  if (!row) {
    return false;
  }
  return row.valueType === "stringEnum" || row.valueType === "numberEnum" || row.valueType === "enum";
};

export const defaultEnumValuesForDefinitionRow = (row: Pick<DeviceParameterDefinition, "enName">) =>
  DEFAULT_PARAMETER_ENUM_VALUES[row.enName.trim()] ?? [];

export const defaultEnumOptionsForDefinitionRow = (row: Pick<DeviceParameterDefinition, "enName">) =>
  DEFAULT_PARAMETER_ENUM_OPTIONS[row.enName.trim()] ?? [];

export const normalizeEnumOption = (option: unknown): DeviceParameterEnumOption | null => {
  if (option && typeof option === "object" && !Array.isArray(option)) {
    const enumOption = option as Partial<DeviceParameterEnumOption>;
    const value = String(enumOption.value ?? "").trim();
    if (!value) {
      return null;
    }
    const label = String(enumOption.label ?? "").trim();
    return label ? { value, label } : { value };
  }
  const value = String(option ?? "").trim();
  return value ? { value } : null;
};

export const normalizeEnumValueType = (
  value: unknown,
  enumOptions: readonly DeviceParameterEnumOption[] = []
): DeviceParameterEnumValueType => {
  if (value === "number" || value === "string") {
    return value;
  }
  const optionValues = enumOptions.map((option) => option.value.trim()).filter(Boolean);
  return optionValues.length > 0 && optionValues.every((optionValue) => /^-?\d+(?:\.\d+)?$/.test(optionValue)) ? "number" : "string";
};

export const enumValueTypeForDefinitionRow = (
  row: Pick<DeviceParameterDefinition, "valueType" | "enumValueType">,
  enumOptions: readonly DeviceParameterEnumOption[] = []
): DeviceParameterEnumValueType => {
  if (row.valueType === "numberEnum") {
    return "number";
  }
  if (row.valueType === "stringEnum") {
    return "string";
  }
  return normalizeEnumValueType(row.enumValueType, enumOptions);
};

export const enumDefinitionValueTypeForEnumValueType = (enumValueType: DeviceParameterEnumValueType): DeviceParameterValueType =>
  enumValueType === "number" ? "numberEnum" : "stringEnum";

export const parameterValueTypeLabelForDefinitionRow = (row: DeviceParameterDefinition) => {
  const option = PARAM_VALUE_TYPE_OPTIONS.find((item) => item.value === row.valueType);
  if (option) {
    return option.label;
  }
  if (!definitionRowIsEnum(row)) {
    return row.valueType;
  }
  return enumValueTypeForDefinitionRow(row, normalizeEnumOptionsForRow(row)) === "number" ? "数字枚举" : "字符串枚举";
};

export const rawEnumValuesForRow = (row: Pick<DeviceParameterDefinition, "enName" | "typicalValue" | "enumValues" | "enumOptions">): string[] => {
  if (Array.isArray(row.enumValues) && row.enumValues.length > 0) {
    return row.enumValues.map((value) => String(value ?? ""));
  }
  if (Array.isArray(row.enumOptions) && row.enumOptions.length > 0) {
    return row.enumOptions.map((option) => String(option?.value ?? ""));
  }
  const defaultValues = defaultEnumValuesForDefinitionRow(row);
  if (defaultValues.length > 0) {
    return [...defaultValues];
  }
  const typicalValue = String(row.typicalValue ?? "").trim();
  return typicalValue ? [typicalValue] : [];
};

export const normalizeEnumOptionsForRow = (
  row: Pick<DeviceParameterDefinition, "enName" | "typicalValue" | "enumValues" | "enumOptions">
): DeviceParameterEnumOption[] => {
  const sourceOptions = Array.isArray(row.enumOptions) && row.enumOptions.length > 0
    ? row.enumOptions
    : (defaultEnumOptionsForDefinitionRow(row).length > 0 ? defaultEnumOptionsForDefinitionRow(row) : rawEnumValuesForRow(row));
  const seen = new Set<string>();
  const enumOptions: DeviceParameterEnumOption[] = [];
  const addOption = (option: unknown) => {
    const normalizedOption = normalizeEnumOption(option);
    if (!normalizedOption || seen.has(normalizedOption.value)) {
      return;
    }
    seen.add(normalizedOption.value);
    enumOptions.push(normalizedOption);
  };
  sourceOptions.forEach(addOption);
  if (Array.isArray(row.enumOptions) && row.enumOptions.length > 0) {
    rawEnumValuesForRow({ ...row, enumOptions: undefined }).forEach(addOption);
  }
  const typicalValue = String(row.typicalValue ?? "").trim();
  const typicalExists = enumOptions.some((option) => option.value === typicalValue || option.label === typicalValue);
  if (typicalValue && !typicalExists) {
    addOption(typicalValue);
  }
  return enumOptions;
};

export const enumValueFromOptions = (value: string, enumOptions: readonly DeviceParameterEnumOption[]) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return enumOptions.find((option) => option.value === text)?.value ??
    enumOptions.find((option) => option.label === text)?.value ??
    text;
};

export const enumDisplayText = (option: DeviceParameterEnumOption, enumValueType?: DeviceParameterEnumValueType) => {
  const label = String(option.label ?? "").trim();
  if (!label || label === option.value) {
    return option.value;
  }
  return enumValueType === "number" ? `${label} (${option.value})` : `${option.value} / ${label}`;
};

export const enumValuesForRow = (row: Pick<DeviceParameterDefinition, "enName" | "typicalValue" | "enumValues" | "enumOptions">): string[] => {
  const enumValues = normalizeEnumValueList(normalizeEnumOptionsForRow(row).map((option) => option.value), String(row.typicalValue ?? ""));
  return enumValues;
};

export const normalizeDefinitionRowEnumFields = <T extends DeviceParameterDefinition>(row: T): T => {
  if (!definitionRowIsEnum(row)) {
    const { enumValues: _enumValues, enumValueType: _enumValueType, enumOptions: _enumOptions, ...plainRow } = row;
    return plainRow as T;
  }
  const enumOptions = normalizeEnumOptionsForRow(row);
  const enumValueType = enumValueTypeForDefinitionRow(row, enumOptions);
  const enumValues = normalizeEnumValueList(enumOptions.map((option) => option.value), "");
  const typicalValue = enumValueFromOptions(String(row.typicalValue ?? ""), enumOptions);
  const { enumValueType: _enumValueType, ...plainRow } = row;
  return {
    ...plainRow,
    valueType: enumDefinitionValueTypeForEnumValueType(enumValueType),
    typicalValue: typicalValue || enumValues[0] || "",
    enumOptions,
    enumValues
  } as T;
};

export const renderTypicalValueEditor = <T extends DeviceParameterDefinition & { id: string }>(
  row: T,
  updateRow: (rowId: string, patch: Partial<T>) => void,
  disabled = false
) => {
  if (definitionRowIsEnum(row)) {
    const enumOptions = normalizeEnumOptionsForRow(row);
    const enumValueType = enumValueTypeForDefinitionRow(row, enumOptions);
    const selectedTypicalValue = enumValueFromOptions(String(row.typicalValue ?? ""), enumOptions);
    return (
      <select
        value={selectedTypicalValue}
        disabled={disabled}
        onChange={(event) => updateRow(row.id, { typicalValue: event.target.value } as Partial<T>)}
      >
        {enumOptions.length === 0 && <option value="">未设置</option>}
        {enumOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {enumDisplayText(option, enumValueType)}
          </option>
        ))}
      </select>
    );
  }
  return (
    <BufferedTextInput
      value={String(row.typicalValue ?? "")}
      disabled={disabled}
      onCommit={(value) => updateRow(row.id, { typicalValue: value } as Partial<T>)}
    />
  );
};

export const renderEnumValuesEditor = <T extends DeviceParameterDefinition & { id: string }>(
  row: T,
  updateRow: (rowId: string, patch: Partial<T>) => void,
  disabled = false
) => {
  if (!definitionRowIsEnum(row)) {
    return <span className="custom-param-enum-placeholder">-</span>;
  }
  const enumValueType = enumValueTypeForDefinitionRow(row, normalizeEnumOptionsForRow(row));
  const rawOptions = Array.isArray(row.enumOptions) && row.enumOptions.length > 0
    ? row.enumOptions.map((option) => ({ value: String(option?.value ?? ""), label: String(option?.label ?? "") }))
    : rawEnumValuesForRow(row).map((value) => ({ value, label: "" }));
  const editorOptions = rawOptions.length > 0 ? rawOptions : [{ value: "", label: "" }];
  const updateValues = (nextOptions: DeviceParameterEnumOption[], nextTypicalValue = row.typicalValue) => {
    const enumValues = normalizeEnumValueList(nextOptions.map((option) => option.value), "");
    updateRow(row.id, {
      enumOptions: nextOptions,
      enumValues,
      typicalValue: enumValueFromOptions(String(nextTypicalValue ?? ""), nextOptions) || enumValues[0] || ""
    } as Partial<T>);
  };
  return (
    <div className={`custom-param-enum-values ${enumValueType === "number" ? "with-label" : ""}`}>
      {editorOptions.map((option, index) => (
        <div className="custom-param-enum-row" key={`${row.id}-${index}`}>
          <BufferedTextInput
            value={option.value}
            disabled={disabled}
            inputMode={enumValueType === "number" ? "decimal" : undefined}
            onCommit={(value) => {
              const nextOptions = editorOptions.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item));
              const nextTypicalValue = row.typicalValue === option.value ? value : row.typicalValue;
              updateValues(nextOptions, nextTypicalValue);
            }}
          />
          {enumValueType === "number" && (
            <BufferedTextInput
              value={option.label ?? ""}
              disabled={disabled}
              placeholder="含义"
              onCommit={(value) => {
                const nextOptions = editorOptions.map((item, itemIndex) => (itemIndex === index ? { ...item, label: value } : item));
                const nextTypicalValue = row.typicalValue === option.label ? option.value : row.typicalValue;
                updateValues(nextOptions, nextTypicalValue);
              }}
            />
          )}
          {!disabled && (
            <button
              type="button"
              title="删除枚举值"
              disabled={editorOptions.length <= 1}
              onClick={() => {
                const nextOptions = editorOptions.filter((_, itemIndex) => itemIndex !== index);
                const normalizedValues = normalizeEnumValueList(nextOptions.map((item) => item.value), "");
                const currentTypical = enumValueFromOptions(String(row.typicalValue ?? ""), editorOptions);
                const nextTypicalValue = normalizedValues.includes(currentTypical) ? currentTypical : normalizedValues[0] ?? "";
                updateValues(nextOptions, nextTypicalValue);
              }}
            >
              删除
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="custom-param-enum-row custom-param-enum-add-row">
          <span className="custom-param-enum-spacer" aria-hidden="true" />
          {enumValueType === "number" && <span className="custom-param-enum-spacer" aria-hidden="true" />}
          <button
            type="button"
            className="custom-param-enum-add"
            onClick={() => updateValues([...editorOptions, { value: "", label: "" }], row.typicalValue)}
          >
            新增枚举值
          </button>
        </div>
      )}
    </div>
  );
};

export function normalizeCustomDeviceTemplates(value: unknown): DeviceTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is DeviceTemplate => Boolean(item && typeof item === "object"))
    .map((item) => {
      const template = item as DeviceTemplate;
      const rawParams = template.params ?? {};
      const stateDefinitions = normalizeDeviceStateDefinitions(template.stateDefinitions ?? []);
      const terminalCount = clampNumber(Number(template.terminalCount ?? 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
      const sourceTerminalTypes = (template.terminalTypes ?? []) as TerminalType[];
      const terminalTypes = Array.from(
        { length: MAX_CUSTOM_DEVICE_TERMINALS },
        (_, index) => sourceTerminalTypes[index] ?? template.terminalType ?? "ac"
      ) as TerminalType[];
      const terminalAnchors = createDefaultCustomDeviceTerminalAnchors(terminalCount, template.terminalAnchors);
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([key]) =>
          key !== ALLOW_RESIZE_TRANSFORM_PARAM && !(key === "status" && stateDefinitions.length > 0)
        )
      );
      const backgroundImage = customDeviceImageWithTerminalConnectors(
        String(params.backgroundImage ?? ""),
        terminalTypes.slice(0, terminalCount),
        terminalAnchors
      );
      if (backgroundImage) {
        params.backgroundImage = backgroundImage;
        params.backgroundImageAssetId = params.backgroundImageAssetId && backgroundImage === `/api/images/${params.backgroundImageAssetId}`
          ? params.backgroundImageAssetId
          : "";
      }
      return {
        ...template,
        kind: String(template.kind ?? ""),
        label: String(template.label ?? template.kind ?? ""),
        attributeLibrary: normalizeAttributeLibraryName(String(template.attributeLibrary ?? "自定义属性库")),
        size: template.size ?? { width: 96, height: 62 },
        params,
        terminalType: (template.terminalType ?? "ac") as TerminalType,
        terminalCount,
        terminalTypes,
        terminalLabels: (template.terminalLabels ?? []).slice(0, MAX_CUSTOM_DEVICE_TERMINALS),
        terminalAnchors,
        terminalRoles: (template.terminalRoles ?? []).slice(0, MAX_CUSTOM_DEVICE_TERMINALS) as ContainerTerminalRole[],
        terminalAssociations: (template.terminalAssociations ?? []).slice(0, MAX_CUSTOM_DEVICE_TERMINALS) as ContainerTerminalAssociationValue[],
        isContainer: Boolean(template.isContainer),
        allowResizeTransform: templateAllowsResizeTransform({ ...template, params: rawParams }),
        custom: true,
        parameterDefinitions: normalizeDefinitionRows(template.parameterDefinitions ?? []),
        stateDefinitions
      };
    })
    .filter((item) => item.kind.trim() && item.label.trim());
}

export function normalizeGraphTemplateTypeName(name: string): string {
  return name.trim();
}

export function normalizeGraphTemplateTypes(value: unknown, reservedTypes: readonly string[] = DEFAULT_GRAPH_TEMPLATE_TYPES): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const reserved = new Set(reservedTypes.map((type) => normalizeGraphTemplateTypeName(type).toLowerCase()));
  const seen = new Set<string>();
  return value
    .map((item) => normalizeGraphTemplateTypeName(String(item ?? "")))
    .filter((typeName) => {
      if (!typeName) {
        return false;
      }
      const key = typeName.toLowerCase();
      if (reserved.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function cloneTemplatePoint(point: Point | undefined): Point | undefined {
  return point ? { x: Number(point.x) || 0, y: Number(point.y) || 0 } : undefined;
}

export function cloneGraphTemplateClipboard(clipboard: CanvasClipboard): CanvasClipboard {
  return {
    nodes: clipboard.nodes.map((node) => ({
      ...node,
      size: { ...node.size },
      position: { ...node.position },
      params: { ...node.params },
      terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
    })),
    edges: clipboard.edges.map((item) => ({
      edge: {
        ...item.edge,
        sourcePoint: cloneTemplatePoint(item.edge.sourcePoint),
        targetPoint: cloneTemplatePoint(item.edge.targetPoint),
        manualPoints: item.edge.manualPoints?.map((point) => ({ ...point })),
        routePoints: item.edge.routePoints?.map((point) => ({ ...point }))
      },
      routePoints: item.routePoints.map((point) => ({ ...point }))
    })),
    groups: clipboard.groups.map((group) => ({
      ...group,
      nodeIds: [...group.nodeIds],
      edgeIds: [...group.edgeIds],
      childGroupIds: group.childGroupIds ? [...group.childGroupIds] : undefined
    }))
  };
}

export function normalizeGraphTemplateClipboard(value: unknown): CanvasClipboard {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<CanvasClipboard> : {};
  const nodes = Array.isArray(source.nodes)
    ? source.nodes.filter((node): node is ModelNode => Boolean(node && typeof node === "object"))
    : [];
  const edges = Array.isArray(source.edges)
    ? source.edges
      .filter((item): item is CanvasClipboard["edges"][number] => Boolean(item && typeof item === "object" && (item as CanvasClipboard["edges"][number]).edge))
      .map((item) => {
        const routePoints = Array.isArray(item.routePoints) && item.routePoints.length > 0
          ? item.routePoints
          : item.edge.routePoints && item.edge.routePoints.length > 0
            ? item.edge.routePoints
            : [item.edge.sourcePoint, ...(item.edge.manualPoints ?? []), item.edge.targetPoint].filter((point): point is Point => Boolean(point));
        return { edge: item.edge, routePoints };
      })
    : [];
  const groups = Array.isArray(source.groups)
    ? source.groups.filter((group): group is ModelGroup => Boolean(group && typeof group === "object"))
    : [];
  return cloneGraphTemplateClipboard({ nodes, edges, groups });
}

export function normalizeGraphTemplates(value: unknown): GraphTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  return value
    .filter((item): item is Partial<GraphTemplate> => Boolean(item && typeof item === "object"))
    .map((item, index) => {
      const clipboard = normalizeGraphTemplateClipboard(item.clipboard);
      const bounds = canvasClipboardBounds(clipboard);
      const fallbackWidth = bounds ? Math.max(1, Math.round(bounds.right - bounds.left)) : 1;
      const fallbackHeight = bounds ? Math.max(1, Math.round(bounds.bottom - bounds.top)) : 1;
      const rawSize = item.sourceSize && typeof item.sourceSize === "object" ? item.sourceSize : undefined;
      const sourceSize = {
        width: Math.max(1, Math.round(Number(rawSize?.width) || fallbackWidth)),
        height: Math.max(1, Math.round(Number(rawSize?.height) || fallbackHeight))
      };
      const id = String(item.id ?? `graph-template-${index + 1}`).trim() || `graph-template-${index + 1}`;
      const typeName = normalizeGraphTemplateTypeName(String(item.typeName ?? DEFAULT_GRAPH_TEMPLATE_TYPES[0]));
      const name = String(item.name ?? "").trim();
      return {
        id,
        typeName: typeName || DEFAULT_GRAPH_TEMPLATE_TYPES[0],
        name: name || `模板${index + 1}`,
        sourceSize,
        clipboard,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date(0).toISOString()
      };
    })
    .filter((template) => {
      if (!template.id || (template.clipboard.nodes.length === 0 && template.clipboard.edges.length === 0)) {
        return false;
      }
      const key = template.id.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function graphTemplateTypeList(customTypes: readonly string[], templates: readonly GraphTemplate[]) {
  return Array.from(new Set([
    ...DEFAULT_GRAPH_TEMPLATE_TYPES,
    ...customTypes.map(normalizeGraphTemplateTypeName).filter(Boolean),
    ...templates.map((template) => normalizeGraphTemplateTypeName(template.typeName)).filter(Boolean)
  ]));
}

export function groupGraphTemplatesByType(templates: readonly GraphTemplate[], typeNames: readonly string[]) {
  const grouped = Object.fromEntries(typeNames.map((typeName) => [typeName, [] as GraphTemplate[]]));
  for (const template of templates) {
    const typeName = normalizeGraphTemplateTypeName(template.typeName) || DEFAULT_GRAPH_TEMPLATE_TYPES[0];
    grouped[typeName] = grouped[typeName] ? [...grouped[typeName], template] : [template];
  }
  return grouped;
}

export function graphTemplateMatchesSearch(template: GraphTemplate, typeName: string, needle: string) {
  if (!needle) {
    return true;
  }
  return [typeName, template.typeName, template.name, template.id]
    .some((value) => normalizeLibrarySearchText(value).includes(needle));
}

export function filterGraphTemplatesByType(grouped: Record<string, GraphTemplate[]>, searchQuery: string) {
  const needle = normalizeLibrarySearchText(searchQuery);
  if (!needle) {
    return grouped;
  }
  return Object.fromEntries(
    Object.entries(grouped)
      .map(([typeName, templates]) => {
        const typeMatches = normalizeLibrarySearchText(typeName).includes(needle);
        const filteredTemplates = typeMatches
          ? templates
          : templates.filter((template) => graphTemplateMatchesSearch(template, typeName, needle));
        return [typeName, filteredTemplates] as const;
      })
      .filter(([, templates]) => templates.length > 0)
  );
}

export function uniqueGraphTemplateName(baseName: string, typeName: string, templates: readonly GraphTemplate[]) {
  const normalizedBase = baseName.trim() || "自定义模板";
  const existing = new Set(
    templates
      .filter((template) => template.typeName.toLowerCase() === typeName.toLowerCase())
      .map((template) => template.name.toLowerCase())
  );
  if (!existing.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }
  for (let index = 2; index < 10000; index += 1) {
    const candidate = `${normalizedBase}-${index}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `${normalizedBase}-${Date.now()}`;
}

export function normalizeDefinitionRows(value: unknown): DeviceParameterDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is DeviceParameterDefinition => Boolean(item && typeof item === "object"))
    .map((item) => {
      const enName = String((item as DeviceParameterDefinition).enName ?? "").trim();
      const cnName = String((item as DeviceParameterDefinition).cnName ?? enName).trim() || enName;
      const valueType = (["integer", "float", "string", "stringEnum", "numberEnum", "enum"].includes((item as DeviceParameterDefinition).valueType)
        ? (item as DeviceParameterDefinition).valueType
        : "string") as DeviceParameterValueType;
      return normalizeDefinitionRowEnumFields({
        cnName,
        enName,
        valueType,
        typicalValue: String((item as DeviceParameterDefinition).typicalValue ?? ""),
        enumValues: (item as DeviceParameterDefinition).enumValues,
        enumValueType: (item as DeviceParameterDefinition).enumValueType,
        enumOptions: (item as DeviceParameterDefinition).enumOptions,
        readonly: Boolean((item as DeviceParameterDefinition).readonly)
      });
    })
    .filter((item) => item.enName && !isReservedDeviceDefinitionParamName(item.enName));
}

export function normalizeDefinitionResizePermission(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "允许" || text === "是";
}

export function normalizeDefinitionOverrideSize(value: unknown): DeviceTemplate["size"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const source = value as Partial<DeviceTemplate["size"]>;
  const width = Number(source.width);
  const height = Number(source.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

export function normalizeDefinitionOverrideTerminalType(value: unknown): TerminalType | undefined {
  const text = String(value ?? "").trim() as TerminalType;
  return TERMINAL_TYPE_OPTIONS.some((option) => option.value === text) ? text : undefined;
}

export function normalizeDefinitionOverrideTerminalTypes(value: unknown, count: number): TerminalType[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .slice(0, clampNumber(count || value.length, 0, MAX_CUSTOM_DEVICE_TERMINALS))
    .map(normalizeDefinitionOverrideTerminalType)
    .filter((type): type is TerminalType => Boolean(type));
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeDefinitionOverrideTerminalAnchors(value: unknown, count: number): Point[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const anchors = value
    .slice(0, clampNumber(count || value.length, 0, MAX_CUSTOM_DEVICE_TERMINALS))
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const point = item as Partial<Point>;
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return projectCustomDeviceTerminalAnchorToBoundary({ x, y });
    })
    .filter((anchor): anchor is Point => Boolean(anchor));
  return anchors.length > 0 ? anchors : undefined;
}

export function normalizeDeviceDefinitionOverrides(value: unknown): Record<string, DeviceTemplateDefinitionOverride> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value as Record<string, DeviceTemplateDefinitionOverride>).reduce<Record<string, DeviceTemplateDefinitionOverride>>(
    (overrides, [kind, override]) => {
      if (!override || typeof override !== "object") {
        return overrides;
      }
      const normalizedKind = String(override.kind ?? kind).trim();
      if (!normalizedKind) {
        return overrides;
      }
      const rawOverride = override as DeviceTemplateDefinitionOverride & Partial<DeviceTemplate>;
      const terminalCount = clampNumber(Math.round(Number(rawOverride.terminalCount ?? 0) || 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
      const terminalTypes = normalizeDefinitionOverrideTerminalTypes(rawOverride.terminalTypes, terminalCount);
      const terminalAnchors = normalizeDefinitionOverrideTerminalAnchors(rawOverride.terminalAnchors, terminalCount || terminalTypes?.length || 0);
      const stateDefinitions = Array.isArray(rawOverride.stateDefinitions)
        ? normalizeDeviceStateDefinitions(rawOverride.stateDefinitions)
        : undefined;
      const normalizedOverride: DeviceTemplateDefinitionOverride = {
        kind: normalizedKind,
        params: Object.fromEntries(
          Object.entries(override.params ?? {})
            .filter(([key]) => !isReservedDeviceDefinitionParamName(key))
            .map(([key, val]) => [key, String(val ?? "")])
        ),
        size: normalizeDefinitionOverrideSize(rawOverride.size),
        terminalType: normalizeDefinitionOverrideTerminalType(rawOverride.terminalType),
        terminalCount: terminalCount > 0 ? terminalCount : undefined,
        terminalTypes,
        terminalLabels: Array.isArray(rawOverride.terminalLabels)
          ? rawOverride.terminalLabels.slice(0, terminalCount || MAX_CUSTOM_DEVICE_TERMINALS).map((label) => String(label ?? ""))
          : undefined,
        terminalAnchors,
        terminalRoles: Array.isArray(rawOverride.terminalRoles)
          ? rawOverride.terminalRoles.slice(0, terminalCount || MAX_CUSTOM_DEVICE_TERMINALS) as ContainerTerminalRole[]
          : undefined,
        terminalAssociations: Array.isArray(rawOverride.terminalAssociations)
          ? rawOverride.terminalAssociations.slice(0, terminalCount || MAX_CUSTOM_DEVICE_TERMINALS) as ContainerTerminalAssociationValue[]
          : undefined,
        isContainer: typeof rawOverride.isContainer === "boolean" ? rawOverride.isContainer : undefined,
        allowResizeTransform: normalizeDefinitionResizePermission(rawOverride.allowResizeTransform),
        parameterDefinitions: normalizeDefinitionRows(override.parameterDefinitions),
        stateDefinitions,
        updatedAt: typeof override.updatedAt === "string" ? override.updatedAt : undefined
      };
      overrides[normalizedKind] = Object.fromEntries(
        Object.entries(normalizedOverride).filter(([, val]) => val !== undefined)
      ) as DeviceTemplateDefinitionOverride;
      return overrides;
    },
    {}
  );
}

export function normalizeDeviceLibraryPersistencePayload(value: unknown): DeviceLibraryPersistencePayload {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<DeviceLibraryPersistencePayload> : {};
  return {
    customDeviceTemplates: normalizeCustomDeviceTemplates(source.customDeviceTemplates),
    customAttributeLibraries: normalizeCustomAttributeLibraries(source.customAttributeLibraries),
    customComponentTypes: normalizeCustomComponentTypes(source.customComponentTypes),
    deviceDefinitionOverrides: normalizeDeviceDefinitionOverrides(source.deviceDefinitionOverrides),
    customGraphTemplateTypes: normalizeGraphTemplateTypes(source.customGraphTemplateTypes),
    customGraphTemplates: normalizeGraphTemplates(source.customGraphTemplates)
  };
}

export function readLocalStorageJson<T>(storageKey: string, emptyJson: string, normalize: (value: unknown) => T, fallback: T): T {
  try {
    return normalize(JSON.parse(window.localStorage.getItem(storageKey) ?? emptyJson));
  } catch {
    return fallback;
  }
}

export function readCustomDeviceTemplates(): DeviceTemplate[] {
  return readLocalStorageJson(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, "[]", normalizeCustomDeviceTemplates, []);
}

export function readCustomAttributeLibraries(): AttributeLibrary[] {
  return readLocalStorageJson(CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY, "[]", normalizeCustomAttributeLibraries, []);
}

export function readCustomComponentTypes(): CustomComponentTypeDefinition[] {
  return readLocalStorageJson(CUSTOM_COMPONENT_TYPES_STORAGE_KEY, "[]", normalizeCustomComponentTypes, []);
}

export function readDeviceDefinitionOverrides(): Record<string, DeviceTemplateDefinitionOverride> {
  return readLocalStorageJson(DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, "{}", normalizeDeviceDefinitionOverrides, {});
}

export function readCustomGraphTemplateTypes(): string[] {
  return readLocalStorageJson(CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY, "[]", normalizeGraphTemplateTypes, []);
}

export function readCustomGraphTemplates(): GraphTemplate[] {
  return readLocalStorageJson(CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, "[]", normalizeGraphTemplates, []);
}

export function readLocalDeviceLibraryPersistencePayload(): DeviceLibraryPersistencePayload {
  return {
    customDeviceTemplates: readCustomDeviceTemplates(),
    customAttributeLibraries: readCustomAttributeLibraries(),
    customComponentTypes: readCustomComponentTypes(),
    deviceDefinitionOverrides: readDeviceDefinitionOverrides(),
    customGraphTemplateTypes: readCustomGraphTemplateTypes(),
    customGraphTemplates: readCustomGraphTemplates()
  };
}

export function writeLocalDeviceLibraryPersistencePayload(normalizedDeviceLibrary: DeviceLibraryPersistencePayload): void {
  try {
    window.localStorage.setItem(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, JSON.stringify(normalizedDeviceLibrary.customDeviceTemplates));
    window.localStorage.setItem(CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY, JSON.stringify(normalizedDeviceLibrary.customAttributeLibraries));
    window.localStorage.setItem(CUSTOM_COMPONENT_TYPES_STORAGE_KEY, JSON.stringify(normalizedDeviceLibrary.customComponentTypes));
    window.localStorage.setItem(DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, JSON.stringify(normalizedDeviceLibrary.deviceDefinitionOverrides));
    window.localStorage.setItem(CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY, JSON.stringify(normalizedDeviceLibrary.customGraphTemplateTypes));
    window.localStorage.setItem(CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, JSON.stringify(normalizedDeviceLibrary.customGraphTemplates));
  } catch {
    // 浏览器缓存不可写时不阻断当前编辑，后台同步仍会继续尝试。
  }
}

export function readMeasurementConfig(): PlatformMeasurementConfig {
  try {
    const raw = window.localStorage.getItem(MEASUREMENT_CONFIG_STORAGE_KEY);
    return normalizeMeasurementConfig(raw ? JSON.parse(raw) as Partial<PlatformMeasurementConfig> : DEFAULT_MEASUREMENT_CONFIG);
  } catch {
    return normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG);
  }
}

export function writeMeasurementConfig(config: PlatformMeasurementConfig): void {
  try {
    window.localStorage.setItem(MEASUREMENT_CONFIG_STORAGE_KEY, JSON.stringify(normalizeMeasurementConfig(config)));
  } catch {
    // 平台量测配置不可写时，不影响当前模型编辑。
  }
}

export function readColorDisplayMode(): ColorDisplayMode {
  try {
    return window.localStorage.getItem(COLOR_DISPLAY_MODE_STORAGE_KEY) === "voltage" ? "voltage" : "energy";
  } catch {
    return "energy";
  }
}

export function readColorPalette(): ColorPalette {
  try {
    return normalizeColorPalette(JSON.parse(window.localStorage.getItem(COLOR_PALETTE_STORAGE_KEY) ?? "{}"));
  } catch {
    return normalizeColorPalette(DEFAULT_COLOR_PALETTE);
  }
}

export function readSidePanelMode(storageKey: string): SidePanelMode {
  try {
    return normalizeSidePanelMode(window.localStorage.getItem(storageKey));
  } catch {
    return "pinned";
  }
}

export function clampPanelDimension(value: number, min: number, max: number) {
  return clampNumber(Math.round(value), min, max);
}

export function clampFloatingDialogLayout(
  layout: NonNullable<FloatingDialogLayout>,
  config: { defaultWidth: number; defaultHeight: number; minWidth: number; minHeight: number; margin: number }
): NonNullable<FloatingDialogLayout> {
  const viewportWidth = typeof window === "undefined" ? layout.left + layout.width + config.margin : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? layout.top + layout.height + config.margin : window.innerHeight;
  const maxWidth = Math.max(config.minWidth, viewportWidth - config.margin * 2);
  const maxHeight = Math.max(config.minHeight, viewportHeight - config.margin * 2);
  const width = clampPanelDimension(
    Number.isFinite(layout.width) ? layout.width : config.defaultWidth,
    config.minWidth,
    maxWidth
  );
  const height = clampPanelDimension(
    Number.isFinite(layout.height) ? layout.height : config.defaultHeight,
    config.minHeight,
    maxHeight
  );
  const left = clampNumber(
    Number.isFinite(layout.left) ? layout.left : (viewportWidth - width) / 2,
    config.margin,
    Math.max(config.margin, viewportWidth - width - config.margin)
  );
  const top = clampNumber(
    Number.isFinite(layout.top) ? layout.top : (viewportHeight - height) / 2,
    config.margin,
    Math.max(config.margin, viewportHeight - height - config.margin)
  );
  return {
    left: Math.round(left),
    top: Math.round(top),
    width,
    height
  };
}

export function clampNodeDoubleClickDialogLayout(layout: NonNullable<NodeDoubleClickDialogLayout>): NonNullable<NodeDoubleClickDialogLayout> {
  return clampFloatingDialogLayout(layout, {
    defaultWidth: NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH,
    defaultHeight: NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT,
    minWidth: NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH,
    minHeight: NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT,
    margin: NODE_DOUBLE_CLICK_DIALOG_MARGIN
  });
}

export function clampDeviceLibraryDialogLayout(
  kind: DeviceLibraryDialogKind,
  layout: NonNullable<FloatingDialogLayout>
): NonNullable<FloatingDialogLayout> {
  return clampFloatingDialogLayout(layout, DEVICE_LIBRARY_DIALOG_CONFIG[kind]);
}

export function readStoredPanelDimension(storageKey: string, fallback: number, min: number, max: number) {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(value) ? clampPanelDimension(value, min, max) : fallback;
  } catch {
    return fallback;
  }
}

export const SCHEME_EXPORT_DIRECTORY_PICKER_ID = "scheme-export";

export async function fetchBackendImageDataUrl(asset: ImageAsset) {
  const response = await fetch(asset.url || `/api/images/${encodeURIComponent(asset.id)}`);
  if (!response.ok) {
    throw new Error("读取后台图片失败。");
  }
  const mimeType = response.headers.get("content-type") || asset.mimeType || "image/png";
  return imageArrayBufferToDataUrl(await response.arrayBuffer(), mimeType);
}

export function imageExportPathByIdFromAssets(assets: ImageAsset[], storedAssets: Record<string, string> = readImageAssets()) {
  return assets.reduce<Record<string, string>>((result, asset) => {
    const id = String(asset.id ?? "").trim();
    const dataUrl = storedAssets[id] || asset.url || "";
    if (id && isImageDataUrl(dataUrl)) {
      result[id] = dataUrl;
    }
    return result;
  }, {});
}

export function exportSvgImageHref(value: string, imageExportPathById: Record<string, string> = {}) {
  const href = String(value ?? "");
  const id = backendImageIdFromHref(href);
  if (!id) {
    return href;
  }
  return imageExportPathById[id] || href;
}

export function nodeGeometryTransform(node: ModelNode) {
  if (isRoutableLineDeviceKind(node.kind)) {
    return "rotate(0) scale(1 1)";
  }
  return `rotate(${formatSvgNumber(node.rotation)}) scale(${formatSvgNumber(getNodeScaleX(node))} ${formatSvgNumber(getNodeScaleY(node))})`;
}

export function nodeUprightScaleTransform(node: ModelNode) {
  return `scale(${formatSvgNumber(getSafeNodeScaleX(node))} ${formatSvgNumber(getSafeNodeScaleY(node))})`;
}

export function nodeImageContentTransform(node: ModelNode) {
  return nodeGeometryTransform(node);
}

export function defaultBackgroundLayerIdsForProject(project: ProjectFile) {
  return (normalizeProjectLayers(project).layers ?? [])
    .filter((layer) => layer.visible !== false)
    .map((layer) => layer.id);
}

export function backgroundPageCanvasTransform(sourceBounds: CanvasBounds, targetBounds: CanvasBounds) {
  const sourceWidth = Math.max(1, sourceBounds.width);
  const sourceHeight = Math.max(1, sourceBounds.height);
  const targetWidth = Math.max(1, targetBounds.width);
  const targetHeight = Math.max(1, targetBounds.height);
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const x = (targetWidth - sourceWidth * safeScale) / 2;
  const y = (targetHeight - sourceHeight * safeScale) / 2;
  return `translate(${formatSvgNumber(x)} ${formatSvgNumber(y)}) scale(${formatSvgNumber(safeScale)})`;
}

export function nodeTransformedHalfExtents(node: ModelNode, includeUprightContent = false) {
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
  const radians = degreesToRadians(node.rotation);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotatedHalfWidth = halfWidth * cos + halfHeight * sin;
  const rotatedHalfHeight = halfWidth * sin + halfHeight * cos;
  return {
    halfWidth: includeUprightContent ? Math.max(halfWidth, rotatedHalfWidth) : rotatedHalfWidth,
    halfHeight: includeUprightContent ? Math.max(halfHeight, rotatedHalfHeight) : rotatedHalfHeight
  };
}

export function nodeScaledLocalHalfExtents(node: ModelNode) {
  return {
    halfWidth: (node.size.width * Math.abs(getNodeScaleX(node))) / 2,
    halfHeight: (node.size.height * Math.abs(getNodeScaleY(node))) / 2
  };
}

export function nodeRotateHandleControlPoints(
  node: ModelNode,
  rotateStemStart: number,
  rotateStemEnd: number,
  rotateHandleGap: number
) {
  const { halfHeight } = nodeScaledLocalHalfExtents(node);
  const origin = { x: 0, y: 0 };
  return {
    stemStart: rotatePointAround({ x: 0, y: -halfHeight - rotateStemStart }, origin, node.rotation),
    stemEnd: rotatePointAround({ x: 0, y: -halfHeight - rotateStemEnd }, origin, node.rotation),
    handle: rotatePointAround({ x: 0, y: -halfHeight - rotateHandleGap }, origin, node.rotation)
  };
}

export function nodeUprightRotateHandleControlPoints(
  node: ModelNode,
  rotateStemStart: number,
  rotateStemEnd: number,
  rotateHandleGap: number
) {
  const rect = nodeUprightSelectionOutlineRect(node);
  const halfHeight = rect.height / 2;
  return {
    stemStart: { x: 0, y: -halfHeight - rotateStemStart },
    stemEnd: { x: 0, y: -halfHeight - rotateStemEnd },
    handle: { x: 0, y: -halfHeight - rotateHandleGap }
  };
}

export function scaleHandleControlPoint(
  node: ModelNode,
  handle: ScaleHandleConfig,
  handleGapX: number,
  handleGapY: number
) {
  const { halfWidth, halfHeight } = nodeScaledLocalHalfExtents(node);
  const localPoint = {
    x: handle.xDirection === 0 ? 0 : handle.xDirection * (halfWidth + handleGapX),
    y: handle.yDirection === 0 ? 0 : handle.yDirection * (halfHeight + handleGapY)
  };
  return rotatePointAround(localPoint, { x: 0, y: 0 }, node.rotation);
}

export function nodeScaleHandleControlPoint(
  node: ModelNode,
  handle: ScaleHandleConfig,
  handleGapX: number,
  handleGapY: number,
  uprightStaticSelectionOutline = false
) {
  if (!uprightStaticSelectionOutline) {
    return scaleHandleControlPoint(node, handle, handleGapX, handleGapY);
  }
  const rect = nodeUprightSelectionOutlineRect(node);
  return {
    x: handle.xDirection === 0 ? 0 : handle.xDirection * (rect.width / 2 + handleGapX),
    y: handle.yDirection === 0 ? 0 : handle.yDirection * (rect.height / 2 + handleGapY)
  };
}

export function scaleHandleCursorClass(handle: ScaleHandleConfig, rotationDegrees: number) {
  const direction = rotatePointAround(
    { x: handle.xDirection, y: handle.yDirection },
    { x: 0, y: 0 },
    rotationDegrees
  );
  if (Math.abs(direction.x) < 0.0001 && Math.abs(direction.y) < 0.0001) {
    return handle.className;
  }
  const angle = ((Math.atan2(direction.y, direction.x) * 180) / Math.PI + 180) % 180;
  if (angle < 22.5 || angle >= 157.5) {
    return "horizontal";
  }
  if (angle < 67.5) {
    return "diagonal-nwse";
  }
  if (angle < 112.5) {
    return "vertical";
  }
  return "diagonal-nesw";
}

export function nodeUsesUprightStaticSelectionOutline(
  node: ModelNode,
  imageHref = "",
  foregroundImageHref = ""
) {
  return (
    isStaticNode(node) &&
    Boolean(
      node.kind === "static-text" ||
      node.kind === "static-image" ||
      imageHref ||
      foregroundImageHref ||
      node.params.backgroundImage ||
      node.params.backgroundImageAssetId ||
      node.params.foregroundImage ||
      node.params.foregroundImageAssetId
    )
  );
}

export const TEXT_DOUBLE_CLICK_KINDS = new Set<string>([
  "static-text",
  "static-date",
  "static-time",
  "static-datetime",
  "static-edge-label"
]);

export const IMAGE_DOUBLE_CLICK_KINDS = new Set<string>([
  "static-image",
  "static-web"
]);

export const NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS = 350;

export const NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS = 900;

export const cloneNodeForDoubleClickDraft = (node: ModelNode): ModelNode => ({
  ...node,
  position: { ...node.position },
  size: { ...node.size },
  params: { ...node.params },
  terminals: node.terminals.map((terminal) => ({ ...terminal }))
});

export const stringRecordShallowEqual = (first: Record<string, string>, second: Record<string, string>) => {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);
  return firstKeys.length === secondKeys.length && firstKeys.every((key) => first[key] === second[key]);
};

export const nodeDoubleClickDraftHasModelChanges = (currentNode: ModelNode, draftNode: ModelNode) =>
  currentNode.name !== draftNode.name || !stringRecordShallowEqual(currentNode.params, draftNode.params);

export const isTextDoubleClickKind = (kind: string) => TEXT_DOUBLE_CLICK_KINDS.has(kind);

export const isImageDoubleClickKind = (kind: string) => IMAGE_DOUBLE_CLICK_KINDS.has(kind);

export const nodeHasInteractionDoubleClickEditor = (node: ModelNode) =>
  isStaticButtonCapableKind(node.kind) &&
  (
    node.kind === "static-button" ||
    node.params.buttonEnabled === "1" ||
    (node.params.buttonActionType ?? "none") !== "none"
  );

export const nodeHasTextDoubleClickEditor = (node: ModelNode) =>
  Object.prototype.hasOwnProperty.call(node.params, "text");

export const nodeHasImageDoubleClickEditor = (node: ModelNode) =>
  Boolean(
    node.params.backgroundImage ||
    node.params.backgroundImageAssetId ||
    node.params.foregroundImage ||
    node.params.foregroundImageAssetId
  );

export const doubleClickDialogKindForNode = (node: ModelNode): NodeDoubleClickDialogKind | "image" | "none" => {
  if (nodeHasInteractionDoubleClickEditor(node)) {
    return "interaction";
  }
  if (isTextDoubleClickKind(node.kind)) {
    return "text";
  }
  if (isImageDoubleClickKind(node.kind)) {
    return "image";
  }
  if (!isStaticNode(node)) {
    return "device";
  }
  if (nodeHasTextDoubleClickEditor(node)) {
    return "text";
  }
  if (nodeHasImageDoubleClickEditor(node)) {
    return "image";
  }
  return "none";
};

export function nodeUprightSelectionOutlineRect(node: ModelNode) {
  const width = Math.max(1, node.size.width * Math.abs(getNodeScaleX(node)));
  const height = Math.max(1, node.size.height * Math.abs(getNodeScaleY(node)));
  return {
    x: -width / 2,
    y: -height / 2,
    width,
    height
  };
}

export function emptySmartAlignmentAnchorMap(): SmartAlignmentAnchorMap {
  return { x: [], y: [] };
}

export function positionedNodeForSmartAlignment(node: ModelNode, position: Point): ModelNode {
  return position.x === node.position.x && position.y === node.position.y ? node : { ...node, position };
}

export function nodeTerminalOutflowSmartAlignmentAnchors(
  node: ModelNode,
  position: Point = node.position
): SmartAlignmentAnchorMap {
  const anchors = emptySmartAlignmentAnchorMap();
  if (isBusNode(node) || isStaticNode(node)) {
    return anchors;
  }
  const positionedNode = positionedNodeForSmartAlignment(node, position);
  for (const terminal of positionedNode.terminals) {
    const terminalPoint = getTerminalPoint(positionedNode, terminal.id);
    const normal = getRouteEndpointNormal(positionedNode, terminalPoint, {
      x: terminalPoint.x + 1,
      y: terminalPoint.y + 1
    }, terminal.id);
    if (normal.x !== 0) {
      anchors.y.push({
        key: `terminal-${terminal.id}`,
        value: terminalPoint.y,
        priority: 0
      });
    }
    if (normal.y !== 0) {
      anchors.x.push({
        key: `terminal-${terminal.id}`,
        value: terminalPoint.x,
        priority: 0
      });
    }
  }
  return anchors;
}

export function nodeSmartAlignmentBounds(
  node: ModelNode,
  position: Point = node.position,
  includeUprightContent = false
): RenderViewportBounds {
  const halfExtents = nodeTransformedHalfExtents(node, includeUprightContent);
  return {
    left: position.x - halfExtents.halfWidth,
    right: position.x + halfExtents.halfWidth,
    top: position.y - halfExtents.halfHeight,
    bottom: position.y + halfExtents.halfHeight
  };
}

export function nodeVisualInteractionBounds(
  node: ModelNode,
  position: Point = node.position,
  padding = 0,
  includeUprightContent = false
): RenderViewportBounds {
  const labelAwareBounds = calculateNodeVisualBounds(node, padding, position);
  if (!includeUprightContent) {
    return labelAwareBounds;
  }
  const halfExtents = nodeTransformedHalfExtents(node, true);
  return mergeRenderViewportBounds(labelAwareBounds, {
    left: position.x - halfExtents.halfWidth - padding,
    right: position.x + halfExtents.halfWidth + padding,
    top: position.y - halfExtents.halfHeight - padding,
    bottom: position.y + halfExtents.halfHeight + padding
  });
}

export function buildSvgTerminalMarkup(node: ModelNode, colorDisplayMode: ColorDisplayMode = "energy", colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE) {
  if (isBusNode(node) || isStaticNode(node) || isRoutableLineDeviceKind(node.kind)) {
    return "";
  }
  const nodeScaleX = getNodeScaleX(node);
  const nodeScaleY = getNodeScaleY(node);
  const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
  const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
  const dashArray = svgStrokeDashArray(node.params.strokeStyle);
  const dashAttribute = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
  return node.terminals
    .map((terminal) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
      const strokeWidth = terminalStubStrokeWidth(node, terminal);
      const terminalColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
      const label = `${terminal.label} / ${terminal.type.toUpperCase()}`;
      return `<g class="export-terminal ${terminal.type}" data-terminal-id="${escapeXml(terminal.id)}" transform="translate(${formatSvgNumber(renderPoint.x)} ${formatSvgNumber(renderPoint.y)}) scale(${inverseScaleX} ${inverseScaleY})">
  <line class="export-terminal-stub ${terminal.type}" x1="${stub.from.x}" y1="${stub.from.y}" x2="${stub.to.x}" y2="${stub.to.y}" stroke="${terminalColor}" stroke-width="${formatSvgNumber(strokeWidth)}" stroke-linecap="round"${dashAttribute}/>
  <circle class="export-terminal-dot ${terminal.type}" cx="0" cy="0" r="6" fill="${terminalColor}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"><title>${escapeXml(label)}</title></circle>
</g>`;
    })
    .join("\n");
}

export type CustomComponentTreeProps = {
  libraries: string[];
  filteredByComponentType: Record<string, { section: string; templates: DeviceTemplate[] }[]>;
  initialCollapsedLibraries: Set<string>;
  initialCollapsedTypes: Set<string>;
  initialSelection: CustomComponentTreeSelection;
  searchQuery: string;
  onSelectAttributeLibrary: (attributeLibraryName: string) => void;
  onSelectComponent: (template: DeviceTemplate, section: string) => void;
  onSelectComponentType: (attributeLibraryName: string, sectionName: string, options?: { expand?: boolean }) => void;
  onCreateAttributeLibrary: () => void;
  onCreateComponentType: () => void;
  onCreateComponent: () => void;
  onRenameSelection: () => void;
  onDeleteSelection: () => void;
  onSearchChange: (query: string) => void;
  onCollapseChange: (libraries: Set<string>, types: Set<string>) => void;
  onSelectionChange: (selection: CustomComponentTreeSelection) => void;
};

function customComponentTreeSelectionsEqual(first: CustomComponentTreeSelection, second: CustomComponentTreeSelection) {
  if (first.kind !== second.kind || first.attributeLibraryName !== second.attributeLibraryName) {
    return false;
  }
  if (first.kind === "attributeLibrary" || second.kind === "attributeLibrary") {
    return true;
  }
  if (first.section !== second.section) {
    return false;
  }
  if (first.kind === "component" || second.kind === "component") {
    return first.kind === second.kind && first.templateKind === second.templateKind;
  }
  return true;
}

export const CustomComponentManagerTree = memo(function CustomComponentManagerTree({
  libraries,
  filteredByComponentType,
  initialCollapsedLibraries,
  initialCollapsedTypes,
  initialSelection,
  searchQuery,
  onSelectAttributeLibrary,
  onSelectComponent,
  onSelectComponentType,
  onCreateAttributeLibrary,
  onCreateComponentType,
  onCreateComponent,
  onRenameSelection,
  onDeleteSelection,
  onSearchChange,
  onCollapseChange,
  onSelectionChange
}: CustomComponentTreeProps) {
  // 内部管理 collapsed 状态，展开/收缩不触发父组件重渲染
  const [collapsedLibraries, setCollapsedLibraries] = useState<Set<string>>(initialCollapsedLibraries);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(initialCollapsedTypes);
  // 内部管理 selection 状态，点击立即显示选中效果
  const [selection, setSelection] = useState<CustomComponentTreeSelection>(initialSelection);

  // 同步 collapsed 到父组件（用于删除、重命名等操作）
  useEffect(() => {
    onCollapseChange(collapsedLibraries, collapsedTypes);
  }, [collapsedLibraries, collapsedTypes, onCollapseChange]);

  // 同步 selection 到父组件（用于右侧面板更新）
  useEffect(() => {
    onSelectionChange(selection);
  }, [selection, onSelectionChange]);

  useEffect(() => {
    setSelection((current) => customComponentTreeSelectionsEqual(current, initialSelection) ? current : initialSelection);
  }, [initialSelection]);

  const handleToggleLibrary = useCallback((name: string) => {
    setCollapsedLibraries((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleSelectAttributeLibrary = useCallback((attributeLibraryName: string) => {
    const selection = { kind: "attributeLibrary" as const, attributeLibraryName };
    setSelection(selection);
    onSelectAttributeLibrary(attributeLibraryName);
  }, [onSelectAttributeLibrary]);

  const handleToggleType = useCallback((library: string, type: string) => {
    const typeKey = `${library}::${type}`;
    setCollapsedTypes((current) => {
      const next = new Set(current);
      if (next.has(typeKey)) {
        next.delete(typeKey);
      } else {
        next.add(typeKey);
      }
      return next;
    });
  }, []);

  const handleSelectComponentType = useCallback((attributeLibraryName: string, section: string) => {
    const selection = { kind: "componentType" as const, attributeLibraryName, section };
    setSelection(selection);
    onSelectComponentType(attributeLibraryName, section, { expand: false });
  }, [onSelectComponentType]);

  const handleSelectComponent = useCallback((template: DeviceTemplate, section: string) => {
    const attributeLibraryName = normalizeAttributeLibraryName(template.attributeLibrary);
    // 立即更新内部 selection，显示选中效果
    setSelection({ kind: "component", attributeLibraryName, section, templateKind: template.kind });
    // 调用父组件回调（更新右侧面板，已延迟处理）
    onSelectComponent(template, section);
  }, [onSelectComponent]);

  const searchNeedle = normalizeLibrarySearchText(searchQuery);
  return (
    <aside className="custom-component-manager-panel" aria-label="属性库元件类型元件管理">
      <div className="custom-component-manager-title">
        <strong>元件结构</strong>
        <span>属性库 / 元件类型 / 元件</span>
      </div>
      <div className="custom-component-manager-actions">
        <button type="button" onClick={onCreateAttributeLibrary} title="新建属性库">
          <Plus size={12} aria-hidden="true" />
          <span>新建属性</span>
        </button>
        <button type="button" onClick={onCreateComponentType} title="在当前属性库下新建元件类型">
          <Plus size={12} aria-hidden="true" />
          <span>新建类型</span>
        </button>
        <button type="button" className="custom-component-manager-primary-action" onClick={onCreateComponent} title="在当前元件类型下新建元件">
          <Plus size={13} aria-hidden="true" />
          <span>新建元件</span>
        </button>
        <button type="button" onClick={onRenameSelection} title="重命名当前选中的自定义条目">
          <Pencil size={12} aria-hidden="true" />
          <span>重命名</span>
        </button>
        <button type="button" className="danger" onClick={onDeleteSelection} title="删除当前选中的自定义条目">
          <Trash2 size={12} aria-hidden="true" />
          <span>删除</span>
        </button>
        <span className="custom-component-tree-actions-note">先选属性/类型/元件</span>
      </div>
      <div className="custom-component-tree-search-row">
        <div className="dialog-tree-search">
          <Search size={14} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索属性库/元件类型/元件"
            aria-label="搜索元件结构"
          />
          {searchQuery && (
            <button type="button" aria-label="清空元件结构搜索" title="清空" onClick={() => onSearchChange("")}>
              <X size={13} />
            </button>
          )}
        </div>
        {(() => {
          // 切换折叠层全部展开/全部收缩
          const total = libraries.length;
          if (total === 0) return null;
          const allExpanded = collapsedLibraries.size === 0;
          return (
            <button
              type="button"
              className="custom-component-tree-toggle-all"
              aria-label={allExpanded ? "全部收缩" : "全部展开"}
              title={allExpanded ? "全部收缩" : "全部展开"}
              onClick={() => {
                if (allExpanded) {
                  setCollapsedLibraries(new Set(libraries));
                  setCollapsedTypes(new Set());
                } else {
                  setCollapsedLibraries(new Set());
                  setCollapsedTypes(new Set());
                }
              }}
            >
              {allExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          );
        })()}
      </div>
      <div className="custom-component-manager-tree dialog-compact-tree" role="tree">
        {libraries.length > 0 ? libraries.map((group) => {
          const typeGroups = filteredByComponentType[group] ?? [];
          const librarySelected = selection.kind === "attributeLibrary" && selection.attributeLibraryName === group;
          const libraryCollapsed = searchNeedle ? false : collapsedLibraries.has(group);
          return (
            <section className="custom-component-tree-library" key={group}>
              <button
                type="button"
                className={`custom-component-tree-row library ${librarySelected ? "active" : ""}`}
                role="treeitem"
                aria-selected={librarySelected}
                aria-expanded={!libraryCollapsed}
                onClick={() => {
                  handleSelectAttributeLibrary(group);
                  handleToggleLibrary(group);
                }}
              >
                {libraryCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span>{group}</span>
                <strong>{typeGroups.reduce((sum, typeGroup) => sum + typeGroup.templates.length, 0)}</strong>
              </button>
              {!libraryCollapsed && <div className="custom-component-tree-type-list" role="group">
                {typeGroups.map((typeGroup) => {
                  const typeKey = `${group}::${typeGroup.section}`;
                  const typeCollapsed = searchNeedle ? false : collapsedTypes.has(typeKey);
                  const typeDisplay = componentTypeDisplayParts(typeGroup.section);
                  const typeSelected =
                    selection.kind === "componentType" &&
                    selection.attributeLibraryName === group &&
                    selection.section === typeGroup.section;
                  return (
                    <section className="custom-component-tree-type" key={`${group}-${typeGroup.section}`}>
                      <button
                        type="button"
                        className={`custom-component-tree-row type ${typeSelected ? "active" : ""}`}
                        role="treeitem"
                        aria-selected={typeSelected}
                        aria-expanded={!typeCollapsed}
                        onClick={() => {
                          handleSelectComponentType(group, typeGroup.section);
                          handleToggleType(group, typeGroup.section);
                        }}
                      >
                        {typeCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <span className="dialog-tree-bilingual" title={typeDisplay.title}>
                          <span>{typeDisplay.chinese}</span>
                          <small>{typeDisplay.english}</small>
                        </span>
                        <strong>{typeGroup.templates.length}</strong>
                      </button>
                      {!typeCollapsed && <div className="custom-component-tree-components" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                        {typeGroup.templates.map((template) => {
                          const componentSelected =
                            selection.kind === "component" &&
                            selection.templateKind === template.kind;
                          return (
                            <button
                              type="button"
                              key={template.kind}
                              className={`custom-component-tree-row component ${componentSelected ? "active" : ""}`}
                              role="treeitem"
                              aria-selected={componentSelected}
                              title={`${template.label} / ${typeGroup.section} / ${template.custom ? "自定义" : "系统内置"}`}
                              onClick={() => handleSelectComponent(template, typeGroup.section)}
                            >
                              <span className="dialog-tree-bilingual dialog-tree-component-label" title={`${template.label} / ${template.kind}`}>
                                <span>{template.label}</span>
                                <small>{template.kind}</small>
                              </span>
                              <small>{template.custom ? "自定义" : "内置"}</small>
                            </button>
                          );
                        })}
                      </div>}
                    </section>
                  );
                })}
              </div>}
            </section>
          );
        }) : (
          <div className="dialog-tree-empty">未找到匹配元件</div>
        )}
      </div>
    </aside>
  );
});

export type StableSvgMarkupChunk = {
  key: string;
  markup: string;
};

export type CachedStableSvgMarkupChunk = StableSvgMarkupChunk & {
  itemKeys: string[];
  tokens: unknown[];
};

export type StableSvgMarkupChunkCache = {
  chunks: CachedStableSvgMarkupChunk[];
};

export type ConnectionStrokeColorCache = {
  nodeById: ReadonlyMap<string, Pick<ModelNode, "kind" | "terminals" | "params">> | null;
  token: string;
  colors: Map<string, { edge: Edge; color: string }>;
};

export type ElementTreeSource = {
  revision: number;
  layerSignature: string;
  nodes: ModelNode[];
  edges: Edge[];
};

export function tokenArraysEqual(first: readonly unknown[], second: readonly unknown[]) {
  if (first.length !== second.length) {
    return false;
  }
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }
  return true;
}

export function customSingleTerminalAnchorToken(node: ModelNode, template?: DeviceTemplate): string {
  if (isBusNode(node) || isStaticNode(node) || node.terminals.length !== 1) {
    return "";
  }
  const anchor = node.terminals[0]?.anchor;
  const templateAnchor = template?.terminalAnchors?.[0] ?? { x: 0.5, y: 0 };
  return anchor && (anchor.x !== templateAnchor.x || anchor.y !== templateAnchor.y)
    ? `${formatSvgNumber(anchor.x)},${formatSvgNumber(anchor.y)}`
    : "";
}

export function stableSvgMarkupChunks<T>(
  items: readonly T[],
  cache: StableSvgMarkupChunkCache,
  options: {
    chunkSize: number;
    keyPrefix: string;
    itemKey: (item: T, index: number) => string;
    itemTokens: (item: T, index: number) => readonly unknown[];
    itemMarkup: (item: T, index: number) => string;
  }
): StableSvgMarkupChunk[] {
  if (items.length === 0) {
    cache.chunks = [];
    return [];
  }
  const nextChunks: CachedStableSvgMarkupChunk[] = [];
  for (let start = 0; start < items.length; start += options.chunkSize) {
    const end = Math.min(items.length, start + options.chunkSize);
    const chunkIndex = nextChunks.length;
    const itemKeys: string[] = [];
    const tokens: unknown[] = [];
    for (let index = start; index < end; index += 1) {
      const item = items[index];
      itemKeys.push(options.itemKey(item, index));
      tokens.push(...options.itemTokens(item, index));
    }
    const key = `${options.keyPrefix}-${chunkIndex}-${itemKeys[0] ?? "empty"}-${itemKeys[itemKeys.length - 1] ?? "empty"}`;
    const previous = cache.chunks[chunkIndex];
    if (
      previous &&
      previous.key === key &&
      tokenArraysEqual(previous.itemKeys, itemKeys) &&
      tokenArraysEqual(previous.tokens, tokens)
    ) {
      nextChunks.push(previous);
      continue;
    }
    let markup = "";
    for (let index = start; index < end; index += 1) {
      markup += options.itemMarkup(items[index], index);
    }
    nextChunks.push({ key, itemKeys, tokens, markup });
  }
  cache.chunks = nextChunks;
  return nextChunks.map(({ key, markup }) => ({ key, markup }));
}

export function buildSvgDocument(nodes: ModelNode[], edges: Edge[], canvasSize: CanvasRenderOptions = { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }) {
  const imageAssets = readImageAssets();
  const imageExportPathById = canvasSize.imageExportPathById ?? {};
  const svgTemplateByKind = new Map((canvasSize.deviceTemplates ?? DEVICE_LIBRARY).map((template) => [template.kind, template]));
  const resolveSvgNodeStateVisual = (node: ModelNode) => {
    const template = svgTemplateByKind.get(node.kind);
    return template ? resolveDeviceStateVisual(template, node) : null;
  };
  const backgroundColor = canvasSize.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND;
  const backgroundImage = exportSvgImageHref(canvasSize.backgroundImage ?? "", imageExportPathById);
  const escapedBackgroundColor = escapeXml(backgroundColor);
  const colorDisplayMode = canvasSize.colorDisplayMode ?? "energy";
  const colorPalette = normalizeColorPalette(canvasSize.colorPalette ?? DEFAULT_COLOR_PALETTE);
  const normalizedLayers = normalizeModelLayers(canvasSize.layers, nodes, canvasSize.activeLayerId);
  const exportNodes = orderNodesByModelLayer(nodes, normalizedLayers);
  const activeExportLayerId = normalizedLayers.some((layer) => layer.id === canvasSize.activeLayerId)
    ? canvasSize.activeLayerId!
    : normalizedLayers[0]?.id ?? DEFAULT_MODEL_LAYER_ID;
  const layerById = new Map(normalizedLayers.map((layer) => [layer.id, layer]));
  const layerVisible = (layerId: string) => layerById.get(layerId)?.visible !== false;
  const nodeLayerId = (node: ModelNode) =>
    layerById.has(node.layerId ?? "") ? node.layerId! : DEFAULT_MODEL_LAYER_ID;
  const usedSvgIds = new Set<string>(["root_g"]);
  const rootId = "root_g";
  const defsId = exportSvgUniqueId("svg_defs", usedSvgIds, "svg_defs");
  const backgroundLayerId = exportSvgUniqueId(exportSvgLayerId("Background", "Background"), usedSvgIds, "Background_Layer");
  const segmentLayerId = exportSvgUniqueId(exportSvgLayerId("Segment", "Segment"), usedSvgIds, "Segment_Layer");
  const textLayerId = exportSvgUniqueId(exportSvgLayerId("Text", "Text"), usedSvgIds, "Text_Layer");
  const measurementLayerId = exportSvgUniqueId(exportSvgLayerId("Measurement", "Measurement"), usedSvgIds, "Measurement_Layer");
  const otherLayerId = exportSvgUniqueId(exportSvgLayerId("Other", "Other"), usedSvgIds, "Other_Layer");
  const exportNodeType = (node: ModelNode) => inferESection(node.kind, node.params) || node.kind || "Other";
  const exportNodeLayerKey = (node: ModelNode) => isStaticNode(node) ? "Other" : exportNodeType(node);
  const nodeTypeLayerIds = new Map<string, string>();
  for (const node of exportNodes) {
    const layerKey = exportNodeLayerKey(node);
    if (!nodeTypeLayerIds.has(layerKey)) {
      nodeTypeLayerIds.set(layerKey, exportSvgUniqueId(exportSvgLayerId(layerKey, "Device"), usedSvgIds, "Device_Layer"));
    }
  }
  const resolveExportLayerButtonTargetIds = (node: ModelNode) => {
    if (!isStaticButtonCapableKind(node.kind) || node.params.buttonEnabled !== "1" || node.params.buttonActionType !== "layer") {
      return [];
    }
    return resolveStaticButtonTargetLayers(node, normalizedLayers).map((layer) => layer.id);
  };
  const exportLayerDefinitionsMarkup = normalizedLayers
    .map((layer) =>
      `<g data-export-layer-def="${escapeXml(layer.id)}" data-export-layer-name="${escapeXml(layer.name)}" data-export-layer-visible="${layer.visible === false ? "0" : "1"}" data-export-layer-active="${layer.id === activeExportLayerId ? "1" : "0"}"/>`
    )
    .join("\n");
  const hasLayerButtons = exportNodes.some((node) => resolveExportLayerButtonTargetIds(node).length > 0);
  const includeLayerScript = hasLayerButtons || normalizedLayers.length > 1;
  const nodeById = new Map(exportNodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const buildBoundaryBusInternalConnectorMarkup = (edge: Edge, endpoint: "source" | "target", stroke: string) => {
    const node = nodeById.get(endpoint === "source" ? edge.sourceId : edge.targetId);
    if (!node) {
      return "";
    }
    const point = getModelEdgeEndpointPoint(
      node,
      endpoint === "source" ? edge.sourcePoint : edge.targetPoint,
      endpoint === "source" ? edge.sourceTerminalId : edge.targetTerminalId
    );
    const segment = boundaryBusInternalConnectorSegment(node, point);
    if (!segment) {
      return "";
    }
    const dashArray = svgStrokeDashArray(node.params.strokeStyle);
    const dashAttribute = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
    return `<line class="export-boundary-bus-internal-connector" x1="${formatSvgNumber(segment.from.x)}" y1="${formatSvgNumber(segment.from.y)}" x2="${formatSvgNumber(segment.to.x)}" y2="${formatSvgNumber(segment.to.y)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(boundaryBusInternalConnectorStrokeWidth(node, segment))}" stroke-linecap="round"${dashAttribute}/>`;
  };
  const edgeMarkup = routeEdgesForStoredRendering(exportNodes, edges, canvasSize)
    .map((route) => {
      const edge = edgeById.get(route.edgeId);
      const stroke = edge ? getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette) : "#334155";
      const sourceNode = edge ? nodeById.get(edge.sourceId) : undefined;
      const targetNode = edge ? nodeById.get(edge.targetId) : undefined;
      const sourceLayerId = sourceNode ? nodeLayerId(sourceNode) : DEFAULT_MODEL_LAYER_ID;
      const targetLayerId = targetNode ? nodeLayerId(targetNode) : DEFAULT_MODEL_LAYER_ID;
      const edgeVisible = layerVisible(sourceLayerId) && layerVisible(targetLayerId);
      const internalConnectors = edge
        ? [buildBoundaryBusInternalConnectorMarkup(edge, "source", stroke), buildBoundaryBusInternalConnectorMarkup(edge, "target", stroke)]
            .filter(Boolean)
            .join("\n")
        : "";
      const edgeElementId = exportSvgUniqueId(`edge_${route.edgeId}`, usedSvgIds, "edge");
      return `<g id="${escapeXml(edgeElementId)}" class="export-edge" data-export-edge-id="${escapeXml(route.edgeId)}" data-export-source-layer-id="${escapeXml(sourceLayerId)}" data-export-target-layer-id="${escapeXml(targetLayerId)}"${svgDisplayAttribute(edgeVisible)}>
<path d="${route.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${internalConnectors ? `\n${internalConnectors}` : ""}
</g>`;
    })
    .join("\n");
  const nodeLayerMarkup = new Map<string, string[]>();
  for (const layerId of nodeTypeLayerIds.values()) {
    nodeLayerMarkup.set(layerId, []);
  }
  const nodeSymbolMarkup: string[] = [];
  exportNodes.forEach((node) => {
      const layerId = nodeLayerId(node);
      const typeLayerId = nodeTypeLayerIds.get(exportNodeLayerKey(node)) ?? otherLayerId;
      const targetLayerIds = resolveExportLayerButtonTargetIds(node);
      const exportButtonAttributes = targetLayerIds.length > 0
        ? ` data-export-button-action="layer" data-export-button-target-layer-id="${escapeXml(targetLayerIds[0])}" data-export-button-target-layer-ids="${escapeXml(targetLayerIds.join(","))}"`
        : "";
      const exportButtonClass = targetLayerIds.length > 0 ? " export-static-button" : "";
      const stateVisual = resolveSvgNodeStateVisual(node);
      const imageHref = exportSvgImageHref(resolveStateVisualImageHref(stateVisual, imageAssets) || resolveNodeImage(node, imageAssets), imageExportPathById);
      const foregroundHref = exportSvgImageHref(resolveNodeForegroundImage(node, imageAssets), imageExportPathById);
      const allowNodeImage = !isBusNode(node);
      const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual }));
      const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual }));
      const deviceMetadataAttributes = exportDeviceMetadataAttributes(node);
      const geometryTransform = nodeGeometryTransform(node);
      const imageContentTransform = nodeImageContentTransform(node);
      const imageMarkup = imageHref
        ? svgImageContentMarkup(imageHref, {
            x: -node.size.width / 2,
            y: -node.size.height / 2,
            width: node.size.width,
            height: node.size.height,
            className: "node-background-image"
          })
        : "";
      const foregroundMarkup = foregroundHref
        ? svgImageContentMarkup(foregroundHref, {
            x: -node.size.width / 2,
            y: -node.size.height / 2,
            width: node.size.width,
            height: node.size.height,
            className: "node-foreground-image"
          })
        : "";
      const imageCoverMarkup =
        imageHref && allowNodeImage && !isStaticNode(node)
          ? `<rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="8" fill="#ffffff" stroke="none"/>`
          : "";
      const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
      const labelMarkup = buildSvgNodeLabelMarkup(node);
      const symbolId = exportSvgUniqueId(`symbol_${exportNodeType(node)}_${node.id}`, usedSvgIds, "device_symbol");
      const useId = exportSvgUniqueId(node.id, usedSvgIds, "device");
      nodeSymbolMarkup.push(`<symbol id="${escapeXml(symbolId)}" viewBox="${formatSvgNumber(-node.size.width / 2)} ${formatSvgNumber(-node.size.height / 2)} ${formatSvgNumber(node.size.width)} ${formatSvgNumber(node.size.height)}" overflow="visible">
  <title>${escapeXml(node.name)}</title>
  <g class="export-node-geometry" transform="${geometryTransform}">
  ${glyphMarkup}
  ${glyphTextMarkup}
  </g>
  <g class="export-node-upright-content" transform="${imageContentTransform}">
  ${isStaticNode(node) ? imageMarkup : ""}
  ${imageCoverMarkup}
  ${allowNodeImage && !isStaticNode(node) ? imageMarkup : ""}
  ${allowNodeImage ? foregroundMarkup : ""}
  </g>
  <g class="export-node-terminals" transform="${geometryTransform}">
  ${terminalMarkup}
  </g>
  ${labelMarkup}
</symbol>`);
      nodeLayerMarkup.get(typeLayerId)?.push(`<use id="${escapeXml(useId)}" class="export-node${exportButtonClass}" href="#${escapeXml(symbolId)}" xlink:href="#${escapeXml(symbolId)}" x="${formatSvgNumber(node.position.x - node.size.width / 2)}" y="${formatSvgNumber(node.position.y - node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" data-export-node-id="${escapeXml(node.id)}" data-export-layer-id="${escapeXml(layerId)}"${deviceMetadataAttributes ? ` ${deviceMetadataAttributes}` : ""}${exportButtonAttributes}${svgDisplayAttribute(layerVisible(layerId))}/>`);
  });
  const measurementConfig = canvasSize.measurementConfig ?? DEFAULT_MEASUREMENT_CONFIG;
  const measurements = canvasSize.measurements ?? EMPTY_PROJECT_MEASUREMENTS;
  const measurementNodeById = new Map(exportNodes.map((node) => [node.id, node]));
  const measurementMarkup = measurements.groups
    .map((group) => {
      const node = measurementNodeById.get(group.nodeId);
      if (!node || isStaticNode(node)) {
        return "";
      }
      const layerId = nodeLayerId(node);
      const groupMarkup = buildExportMeasurementGroupMarkup(node, group, measurementConfig, usedSvgIds);
      if (!groupMarkup) {
        return "";
      }
      const measurementWrapperId = exportSvgUniqueId(`measurement_${group.id}`, usedSvgIds, "measurement");
      return `<g id="${escapeXml(measurementWrapperId)}" class="export-measurement-layer" data-export-layer-id="${escapeXml(layerId)}"${svgDisplayAttribute(layerVisible(layerId))}>
${groupMarkup}
</g>`;
    })
    .filter(Boolean)
    .join("\n");
  const backgroundMarkup = `<rect width="100%" height="100%" fill="${escapedBackgroundColor}"/>
${backgroundImage ? svgImageContentMarkup(backgroundImage, {
    x: 0,
    y: 0,
    width: canvasSize.width,
    height: canvasSize.height,
    className: "export-canvas-background-image"
  }) : ""}`;
  const deviceLayerMarkup = Array.from(nodeTypeLayerIds.entries())
    .map(([layerKey, layerId]) => `<g id="${escapeXml(layerId)}" data-export-device-type="${escapeXml(layerKey)}">
${(nodeLayerMarkup.get(layerId) ?? []).join("\n")}
</g>`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" height="100%" width="100%" viewBox="0,0,${canvasSize.width},${canvasSize.height}" data-export-active-layer-id="${escapeXml(activeExportLayerId)}">
<defs id="${escapeXml(defsId)}">
${nodeSymbolMarkup.join("\n")}
<g class="export-layer-definitions" style="display:none">
${exportLayerDefinitionsMarkup}
</g>
</defs>
<g id="${rootId}">
<g id="${escapeXml(backgroundLayerId)}">
${backgroundMarkup}
</g>
<g id="${escapeXml(segmentLayerId)}">
${edgeMarkup}
</g>
${deviceLayerMarkup}
<g id="${escapeXml(textLayerId)}">
</g>
<g id="${escapeXml(measurementLayerId)}">
${measurementMarkup}
</g>
<g id="${escapeXml(otherLayerId)}">
</g>
</g>
${exportSvgLayerScriptMarkup(includeLayerScript)}
</svg>`;
}
