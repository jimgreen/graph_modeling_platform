// @ts-nocheck
// 从 App.tsx 第 2265-3048 行提取
import { useMemo, useEffect, useRef, useLayoutEffect, useDeferredValue } from "react";
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
  Eye,
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
  readVoltageLevelSettings,
  writeVoltageLevelSettings,
  VoltageLevelSettings,
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
  resolveDeviceParameterDefinitionExportSettings,
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
  isStaticButtonCapableNode,
  isStaticGraphicNode,
  isStaticBoxLikeNode,
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
  DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
  DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH,
  EMPTY_PROJECT_MEASUREMENTS,
  buildMeasurementProfilePositionDefinitions,
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
  formatStatusRotationDegrees
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
import { DeviceGlyph, MemoDeviceGlyph, SvgMarkupChunk } from "../DeviceGlyph";
import { buildSvgNodeLabelMarkup, svgDisplayAttribute, exportSvgSafeId, exportSvgLayerId, exportSvgUniqueId, exportSvgLayerScriptMarkup, exportDeviceMetadataAttributes, exportMeasurementGroupMetadataAttributes, exportMeasurementItemMetadataAttributes, exportMeasurementGroupBackgroundColor, exportMeasurementGroupBorderColor, exportMeasurementGroupBorderWidth, exportMeasurementGroupBorderDashArray, exportMeasurementGroupAnchorPoint, exportMeasurementGroupLocalOffset, exportMeasurementGroupMetrics, buildExportMeasurementGroupMarkup } from "../svgExportUtils";
import { parseSvgModel } from "../svgModelImport";
import {
  createCompleteImportedModelFeedback,
  createImportSvgModelFile,
  createOpenSvgModelImportFilePicker,
  createProgrammaticExportEDeviceDefinition,
  createProgrammaticImportEDeviceDefinition
} from "./appDeviceDefinitionFactories";
import { customParamId, deviceDefinitionRowId, stateDraftRowId, DEFAULT_STATE_ICON_DRAWING_FRAME, DEFAULT_STATE_PAGE_ID, isDefaultStatePageId, createStateDraftRow, createStateDraftRowFromDefaultVisual, defaultStateDraftRow, createDefinitionStateDraftRows, normalizeStateDraftRows, validateStateDraftRows, stateVisualFromDraftRow, activeStateDraftRow, normalizeStatePageId, stateDraftImageValue, stateIconDrawingDraftSourceImage, stateIconDrawingInlineNeedsDraftReload, stateIconDrawingInlineCanPersistDraft, stateVisualShapeLabel, generateStateVisualShapeImage, stateIconDrawingElementId, visibleStateIconColor, createStateIconDrawingElement, createImportedStateIconElement, svgSourceFromDataUrl, parseStateIconSvgSource, stateIconSvgElementSource, parseSvgStyleAttribute, stateIconSvgReactAttributes, stateIconSvgNodeChildren, stateIconSvgNodeToReact, stateIconSvgSourceToReactNodes, createEditableStateIconElementsFromSvgSource, createStateIconDrawingInitialElements, stateIconDrawingInitialFrame, svgSourceToDataUrl, stateIconDrawingSvgElementMarkup, stateIconDrawingElementMarkup, stateIconDrawingToImage, stateIconDrawingToPersistedImage, stateIconDrawingFrameRect, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, type StateVisualShapeKind, type StateIconDrawingElement, type DeviceDefinitionStateDraftRow } from "../stateIconDrawing";
import { fallbackComponentLibraryForCategoryLibrary, resolveTemplateComponentLibrary, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, isReservedDeviceDefinitionParamName, isDerivedComponentBaseParamName, createDefinitionDraftRows, normalizeCustomDeviceTerminalAnchorCoordinate, projectCustomDeviceTerminalAnchorToBoundary, customDeviceTerminalAnchorKey, hasOverlappingCustomDeviceTerminalAnchors, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, createCustomDeviceDraftFromTemplate, createDefinitionVisualDraft, defaultContainerAssociationForTerminalType, isAssociationAllowedForTerminal, normalizeContainerTerminalAssociations, customDefaultDefinitions, generateCustomDeviceImage, customDeviceImageWithTerminalConnectors, customDeviceGeneratedDefaultImageCandidates, syncInheritedCustomDeviceStateVisuals, parseCustomDefinitions, screenToSvgPoint, primaryOrthogonalAxis, constrainPointToOrthogonalAxis } from "../customDeviceUtils";
import { useBatchEditors } from "../hooks/useBatchEditors";
import { APP_STATIC_SCOPE } from "./appStaticScope";
import {
  sameOptionalPoint, sameConnectTarget, sameOptionalPointList,
  shouldFinalizeMovedNodeEdgesSynchronously, shouldDeferSingleNodeTerminalReconciliation,
  shouldPatchRouteCacheForHighFanoutMove,
  safeFilePart, serializeSchemeRecordForFile, isObjectRecord,
  topologyWarningDisplayMessage, isStaticButtonEnabledForNode,
  timestampForLibraryPackageFilename
} from "./appInlineUtilityFunctions";
import {
  createRenderLayerManager, createRenderLibraryDefinitionActions,
  createRenderGraphTemplateButton, createRenderGraphTemplateFlyout,
  createRenderProjectPanel, createRenderElementTreePanel
} from "./appRenderPanels";
import {
  createFloatingToolbarBounds, createCanvasPointToSurfaceCss,
  createRotateControlAvoidRectFromCanvas, createFloatingToolbarWrapperStyle,
  createMapPointToMinimap
} from "./appCanvasViewportCalculations";
import { createRuntimeWsClient } from "../runtimeWsClient";
import { createRuntimeSnapshotHandler } from "../runtimeSnapshot";
import { createRuntimeScreenshotHandler } from "../runtimeScreenshot";
import {
  buildUserCustomizationInventory,
  collectReferencedUserAssetIds,
  type UserCustomizationDomain,
  type UserCustomizationImportMode,
  type UserCustomizationImportPreview,
  type UserCustomizationSnapshot
} from "../userCustomizations";
import {
  createApplyUserCustomizationSnapshot,
  createApplyUserCustomizationSnapshotToState,
  createCancelPendingUserCustomizationImport,
  createCaptureUserCustomizationSnapshot,
  createChangePendingUserCustomizationImportMode,
  createCloseUserCustomizationManager,
  createConfirmUserCustomizationImport,
  createExportAllUserCustomizations,
  createImportUserCustomizationFile,
  createOpenUserCustomizationImportFilePicker,
  createOpenUserCustomizationManager,
  createPersistUserCustomizationSnapshot,
  createReconcileOpenModelAfterCustomizationChange,
  createRefreshUserCustomizationManager,
  createRestoreUserCustomizations,
  createSaveUserCustomizationSnapshotFile
} from "./appUserCustomizationFactories";
import { ENABLE_REACT_FLOW_PREVIEW, ReactFlowPreview, INTERACTION_MODE_STORAGE_KEY, CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR, CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR, CANVAS_KEYBOARD_BLOCKING_SELECTOR, CANVAS_KEYBOARD_SURFACE_SELECTOR, normalizeInteractionMode, isCanvasGraphicContextMenuTarget, isCanvasWheelZoomExcludedTarget, canvasWheelTargetIsRenderedCanvas, isCanvasKeyboardBlockingTarget, readStoredInteractionMode, writeStoredInteractionMode, CANVAS_SELECTION_DRAG_THRESHOLD, hasCanvasSelectionModifier, canvasWheelEventHasNoModifier, shouldZoomCanvasFromWheelEvent, isGroupTransformDrag, selectionRectCenter, combineSelectionRects, routeMidpoint, rotatePointAround, snapRotationDeltaToRightAngle, normalizedRotationDelta, transformPointAngle, rotationDeltaFromTransformPoint, rotationDeltaBetweenTransformPoints, rotationTrajectoryArcPath, mirrorPointAcrossAxis, localScaleKindForScreenHandle, groupTransformGeometry, transformGroupPoint, groupTransformSvgTransform, NODE_LABEL_DISPLAY_MODES, CONTEXT_MENU_VIEWPORT_PADDING, CONTEXT_MENU_FALLBACK_WIDTH, CONTEXT_MENU_FALLBACK_HEIGHT, CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH, CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT, NODE_LABEL_FOOTPRINT_PARAM_KEYS, isMultiNodeMoveState, reuseSetOrCreate, cloneMeasurementGroupForDraft, terminalColor, busEndpointColor, ENERGY_COLOR_ROWS, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, isElectricPaletteType, terminalVbaseFallbackValue, voltageColorKeyForTerminal, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_BACKGROUND, MOVE_BOUNDARY_GUARD, CANVAS_AUTO_EXPAND_PADDING, CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE, CANVAS_RESIZE_HANDLE_SIZE, MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, ORIGINAL_POSITION_REROUTE_PADDING, MOVE_ROUTE_LOCAL_SEARCH_PADDING, MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES, MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, KEYBOARD_MOVE_COMMIT_DELAY_MS, KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND, KEYBOARD_MOVE_FRAME_INTERVAL_MS, ELEMENT_TREE_INITIAL_ITEM_LIMIT, ELEMENT_TREE_ITEM_LIMIT_STEP, TOPOLOGY_WARNING_PAGE_SIZE, CANVAS_MINIMAP_WIDTH, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_PADDING, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH, NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MARGIN, DEVICE_DEFINITION_DIALOG_DEFAULT_WIDTH, DEVICE_DEFINITION_DIALOG_DEFAULT_HEIGHT, CUSTOM_DEVICE_DIALOG_DEFAULT_WIDTH, CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT, MEASUREMENT_CONFIG_DIALOG_DEFAULT_WIDTH, MEASUREMENT_CONFIG_DIALOG_DEFAULT_HEIGHT, DEVICE_LIBRARY_DIALOG_MIN_WIDTH, DEVICE_LIBRARY_DIALOG_MIN_HEIGHT, DEVICE_LIBRARY_DIALOG_MARGIN, DEVICE_LIBRARY_DIALOG_CONFIG, TOPOLOGY_WARNING_PANEL_DEFAULT_WIDTH, TOPOLOGY_WARNING_PANEL_MIN_WIDTH, TOPOLOGY_WARNING_PANEL_MAX_WIDTH, TOPOLOGY_WARNING_PANEL_MARGIN, CANVAS_MINIMAP_MAX_NODE_MARKS, CANVAS_MINIMAP_MAX_ROUTE_MARKS, CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD, FIT_SELECTION_MAX_ZOOM_PERCENT, TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD, CANVAS_LOD_NODE_DETAIL_LIMIT, CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, CANVAS_LOD_MAX_ZOOM_PERCENT, CANVAS_LOD_MAX_NODE_SCREEN_SIZE, CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT, CANVAS_LOD_SELECTED_DETAIL_LIMIT, CANVAS_LOD_MARKUP_CHUNK_SIZE, CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE, CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS, CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, CONNECTION_HIT_SCREEN_TOLERANCE, CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT, CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT, CANVAS_BULK_MOVE_EDGE_THRESHOLD, ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD, BULK_MOVE_PERF_LOG_THRESHOLD_MS, SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, SMART_ALIGNMENT_GUIDE_PADDING, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, CANVAS_FLOATING_TOOLBAR_GAP, NODE_FLOATING_TOOLBAR_WIDTH, NODE_FLOATING_TOOLBAR_HEIGHT, EDGE_FLOATING_TOOLBAR_WIDTH, EDGE_FLOATING_TOOLBAR_HEIGHT, CONTEXT_MENU_AUTO_HIDE_MARGIN, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, E_SECTION_OPTIONS, COMPONENT_LIBRARY_LABELS, SCALE_HANDLE_CONFIGS, GROUP_SCALE_HANDLE_CONFIGS, POWER_UNIT_OPTIONS, VOLTAGE_UNIT_OPTIONS, CURRENT_UNIT_OPTIONS, DEFAULT_CATEGORY_LIBRARIES, CUSTOM_CATEGORY_LIBRARY_BASES, PROTECTED_CATEGORY_LIBRARIES, DEVICE_TYPE_NAME_PATTERN, MAX_CUSTOM_DEVICE_TERMINALS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, TERMINAL_TYPE_OPTIONS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, PARAM_VALUE_TYPE_OPTIONS, PROJECT_PANEL_MIN_HEIGHT, PROJECT_PANEL_MAX_HEIGHT, PROJECT_PANEL_DEFAULT_HEIGHT, LEFT_PANEL_DEFAULT_WIDTH, RIGHT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH, STATUSBAR_DEFAULT_HEIGHT, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT, VALIDATION_PANEL_DEFAULT_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT, CONNECT_TERMINAL_SNAP_TOLERANCE, CONNECT_BUS_SNAP_TOLERANCE, connectTargetSearchBounds, findNodeTerminalSnapTarget, applyNodeTerminalSnap, pointOnBusForSnap, findNodeBusSnapTarget, SAMPLE_NODES, SAMPLE_EDGES, PROJECT_STORAGE_KEY, SCHEME_STORAGE_KEY, ACTIVE_PROJECT_STORAGE_KEY, DRAFT_PROJECT_STORAGE_KEY, REFRESH_RECOVERY_STORAGE_KEY, EMPTY_VOLTAGE_COLOR_KEY_SET, EMPTY_ID_LIST, EMPTY_EDGE_ID_LIST, EMPTY_MODEL_GROUPS, EMPTY_MODEL_GROUP_BY_ID, EMPTY_CANVAS_LAYOUT_UNITS, EMPTY_CANVAS_SELECTION, IMAGE_STORAGE_KEY, CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, CUSTOM_CATEGORY_LIBRARIES_STORAGE_KEY, CUSTOM_COMPONENT_LIBRARIES_STORAGE_KEY, DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, COLOR_DISPLAY_MODE_STORAGE_KEY, COLOR_PALETTE_STORAGE_KEY, MEASUREMENT_CONFIG_STORAGE_KEY, LEFT_PANEL_MODE_STORAGE_KEY, RIGHT_PANEL_MODE_STORAGE_KEY, LEFT_PANEL_WIDTH_STORAGE_KEY, RIGHT_PANEL_WIDTH_STORAGE_KEY, STATUSBAR_HEIGHT_STORAGE_KEY, VALIDATION_PANEL_HEIGHT_STORAGE_KEY, DEFAULT_GRAPH_TEMPLATE_TYPES, scheduleIdleWork, elementTreeCacheSignature, CONNECTION_REDRAW_SCOPE_LABELS, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_BASE_SET_PRESETS, VIEWPORT_RENDER_PADDING_RATIO, VIEWPORT_RENDER_MIN_PADDING, CANVAS_VIEWPORT_QUERY_SNAP_SIZE, NODE_SPATIAL_BUCKET_SIZE, nextSpatialQueryMark, expandViewBoxForRendering, snapRenderViewportBoundsForQuery, sameCanvasViewBox, canvasFrameHasHorizontalScrollableRange, canvasFrameHasVerticalScrollableRange, canvasFrameHasScrollableRange, renderedCanvasFullyFitsFrame, canvasFrameViewportSizeChanged, visibleCanvasViewBoxFromRects, canvasScrollScaleFromViewBox, estimatedViewportNodeScreenSize, canvasScrollEdgeInset, canvasScrollSurfaceSize, canvasDisplayOffset, canvasFramePaddingOffset, anchoredCanvasScrollPosition, anchoredCanvasNoScrollOffset, initialVisibleCanvasViewBox, fitWholeCanvasViewBox, boxesIntersect, sameRenderViewportBounds, VIEWPORT_RESULT_CACHE_LIMIT, viewportBoundsCacheKey, viewportResultCacheOwnersEqual, resetViewportResultCache, readViewportResultCache, writeViewportResultCache, mergeRenderViewportBounds, smartAlignmentAxisAnchors, bestSmartAlignmentAxisSnap, nodeRenderBounds, nodeIntersectsRenderViewport, spatialBucketKey, spatialBucketRange, buildNodeSpatialIndex, queryNodeSpatialIndex, compactPreviewNodes, PARAM_LABELS, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, PARAM_OPTIONS, STATIC_BUTTON_ACTION_LABELS, STATIC_BUTTON_COMMAND_LABELS, PARAM_OPTION_LABELS, parseStaticButtonTargetLayerValues, serializeStaticButtonTargetLayerIds, resolveStaticButtonTargetLayers, paramOptionsForSection, READONLY_E_PARAM_KEYS, BATCH_PARAM_EXCLUDED_KEYS, BATCH_PARAM_EXCLUDED_PREFIXES, canBatchEditParam, BATCH_GRAPH_PARAM_KEYS, BATCH_GRAPH_PARAM_PREFIXES, isBatchGraphCommonParamKey, isRedundantBatchCommonParamRow, COLOR_PARAM_KEY_PATTERN, isColorParamKey, BATCH_MEASUREMENT_GROUP_KEYS, BATCH_MEASUREMENT_GROUP_LABELS, measurementGroupCommonValue, measurementGroupWithCommonSetting, normalizeLegacyPowerSystemLabel, normalizeSavedProjectIndexes, normalizeSavedSchemeIndexes, normalizeStoredDraftProject, readActiveProjectPointer, savedSchemePathForId, findSavedSchemeByPath, findSavedProjectByActivePointer, activeProjectPointerPayload, draftProjectFromSavedSchemes, readRefreshRecoveryProject, writeRefreshRecoveryProject, clearRefreshRecoveryProject, readImageAssets, saveImageAsset, resolveNodeImage, resolveNodeForegroundImage, resolveProjectImage, imageAssetsToMap, localImageAssetsFromStorage, pointsToPreviewPath, backendJsonHeaders, backendErrorMessage, fetchBackendJson, backendJsonRequest, fetchBackendImageFolders, createBackendImageFolder, renameBackendImageFolder, deleteBackendImageFolder, fetchBackendImages, fetchAllBackendImages, deleteBackendImageAsset, uploadBackendImage } from "./appCoreCanvasUtilities";
import { normalizeProjectForBackend, normalizeSchemesForBackendRuntime, normalizeSchemesForBackend, serializeSchemesForStorage, findProjectRecordInSchemes, findProjectRecordByNameInScheme, clonePoint, cloneNodesForUndo, cloneEdgesForUndo, cloneGroupsForUndo, cloneTopologyForUndo, cloneTopologyErrorsForUndo, clampCanvasDimension, fetchBackendSchemes, schemePathQueryParam, savedProjectRecordIsSummary, fetchBackendProjectRecord, downloadBackendSchemeArchive, uploadBackendSchemeArchive, saveBackendProjectRecord, deleteBackendProjectRecord, saveBackendSchemeRecord, deleteBackendSchemeRecord, normalizeColorDisplayMode, serializeColorConfigForStorage, fetchBackendColorConfig, saveBackendColorConfigPayload, serializeDeviceLibraryForStorage, fetchBackendDeviceLibrary, saveBackendDeviceLibraryPayload, serializeMeasurementConfigForStorage, fetchBackendMeasurementConfig, saveBackendMeasurementConfigPayload, createLibraryPackage, normalizeLibraryPackage, deviceLibraryPayloadForPackageScope, normalizeIconLibraryPersistencePayload, importBackendImageLibraryPayload, groupDeviceTemplatesByCategoryLibrary, groupDeviceTemplatesByCategoryLibraryAndComponentLibrary, normalizeLibrarySearchText, categoryLibraryComponentLibraryKey, componentLibraryDisplayParts, componentLibraryDisplayName, filterSelectionTreeLabel, filterSelectionTemplateComponentLibraryKey, libraryTemplateMatchesSearch, filterCategoryLibraryComponentLibraryGroups, normalizeCategoryLibraryName, normalizeCustomCategoryLibraries, normalizeComponentLibraryName, defaultCategoryLibraryForComponentLibrary, isBuiltInCategoryLibrary, isBuiltInComponentLibrary, categoryLibraryOptionClass, componentLibraryOptionClass, sourceSelectClassName, selectableCategoryLibraryList, isValidComponentLibraryName, normalizeCustomComponentLibraries, templateResizeTransformValue, templateAllowsResizeTransform, DEFAULT_PARAMETER_ENUM_VALUES, DEFAULT_PARAMETER_ENUM_OPTIONS, normalizeEnumValueList, definitionRowIsEnum, defaultEnumValuesForDefinitionRow, defaultEnumOptionsForDefinitionRow, normalizeEnumOption, normalizeEnumValueType, enumValueTypeForDefinitionRow, enumDefinitionValueTypeForEnumValueType, parameterValueTypeLabelForDefinitionRow, rawEnumValuesForRow, normalizeEnumOptionsForRow, enumValueFromOptions, enumDisplayText, enumValuesForRow, normalizeDefinitionRowEnumFields, renderTypicalValueEditor, renderEnumValuesEditor, normalizeCustomDeviceTemplates, normalizeGraphTemplateTypeName, normalizeGraphTemplateTypes, cloneTemplatePoint, cloneGraphTemplateClipboard, normalizeGraphTemplateClipboard, normalizeGraphTemplates, graphTemplateTypeList, groupGraphTemplatesByType, filterGraphTemplatesByType, uniqueGraphTemplateName, normalizeDefinitionRows, normalizeDefinitionResizePermission, normalizeDefinitionOverrideSize, normalizeDefinitionOverrideTerminalType, normalizeDefinitionOverrideTerminalTypes, normalizeDefinitionOverrideTerminalAnchors, normalizeDeviceDefinitionOverrides, normalizeDeviceLibraryPersistencePayload, readLocalStorageJson, readCustomDeviceTemplates, readCustomCategoryLibraries, readCustomComponentLibraries, readDeviceDefinitionOverrides, readCustomGraphTemplateTypes, readCustomGraphTemplates, readLocalDeviceLibraryPersistencePayload, writeLocalDeviceLibraryPersistencePayload, readMeasurementConfig, writeMeasurementConfig, readColorDisplayMode, readColorPalette, readSidePanelMode, clampPanelDimension, clampFloatingDialogLayout, clampNodeDoubleClickDialogLayout, clampDeviceLibraryDialogLayout, readStoredPanelDimension, SCHEME_EXPORT_DIRECTORY_PICKER_ID, fetchBackendImageDataUrl, imageExportPathByIdFromAssets, exportSvgImageHref, nodeGeometryTransform, nodeUprightScaleTransform, nodeImageContentTransform, defaultBackgroundLayerIdsForProject, backgroundPageCanvasTransform, nodeTransformedHalfExtents, nodeScaledLocalHalfExtents, nodeRotateHandleControlPoints, nodeUprightRotateHandleControlPoints, scaleHandleControlPoint, nodeScaleHandleControlPoint, scaleHandleCursorClass, nodeUsesUprightStaticSelectionOutline, TEXT_DOUBLE_CLICK_KINDS, IMAGE_DOUBLE_CLICK_KINDS, NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS, NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS, cloneNodeForDoubleClickDraft, stringRecordShallowEqual, nodeDoubleClickDraftHasModelChanges, isTextDoubleClickKind, isImageDoubleClickKind, nodeHasInteractionDoubleClickEditor, nodeHasTextDoubleClickEditor, nodeHasImageDoubleClickEditor, doubleClickDialogKindForNode, nodeUprightSelectionOutlineRect, emptySmartAlignmentAnchorMap, positionedNodeForSmartAlignment, nodeTerminalOutflowSmartAlignmentAnchors, nodeSmartAlignmentBounds, nodeVisualInteractionBounds, buildSvgTerminalMarkup, CustomComponentManagerTree, tokenArraysEqual, customSingleTerminalAnchorToken, stableSvgMarkupChunks, buildSvgDocument } from "./appPersistenceLibraryExport";
import { createSetNodes, createSetEdges, createSetGraphArrays, createPatchGraphNodes, createPatchGraphEdges, createUpdateGraphNodeById, createSetSchemes, createUpdateSmartAlignmentGuides, createSetCanvasPanning, createSetContextMarqueeSelection, createMarkGraphicContextMenuHandled, createConsumeGraphicContextMenuHandled, createOpenGraphicContextMenu, createSetOperationLogText, createEdgeListForNodeIds, createBuildSingleNodeDragCache, createOrderedNodeFromList, createOrderedNodesForIds, createAddRoutingNodesForConnectionEdge, createRoutingNodesForConnectionEdge, createRoutingNodesForConnectionEdges, createCachedConnectionStrokeColor, createConnectionLineStyle, createMeasurementGroupAnchorPoint, createMeasurementGroupLocalOffset, createMeasurementGroupCanvasPosition, createMeasurementGroupRenderMetrics, createIncludeMeasurementGroupBounds, createBuildMeasurementGroupMarkup, createBuildRoutableLineDragGhostRoutesForNodeIds, createBuildMultiNodeDragOverlayPreview, createRenderMultiNodeDragOverlay, createGroupTransformPreviewNodeFromSnapshot, createRenderGroupTransformPhotoPreview, createRenderSingleTransformRotateOriginGhost, createRenderTransformRotationTrajectory, createRenderBoundaryBusInternalConnector, createCollectCurrentModelVoltageColorKeys, createNearestVoltageColor, createFillMissingVoltageColorRows, createToggleColorDisplayMode, createOpenColorPaletteDialog, createSaveColorPalette, createResetEnergyColors, createResetVoltageColors, createUpdateEnergyColor, createSetVoltageColorRows, createUpdateVoltageColorRow, createDeleteVoltageColorRow, createAddVoltageColorRow, createResolveNodeStateVisual, createStatusStatesForNode, createNodeKindAllowsResizeTransform, createClearLibraryFlyoutCloseTimer, createHideLibraryFlyout, createScheduleLibraryFlyoutClose, createLibraryFlyoutStyle, createFitLibraryFlyoutsToVisibleArea, createToggleCategoryLibrary, createToggleCategoryLibraryComponentLibrary, createResolveConfiguredBackgroundLayerIds, createToggleBackgroundLayer, createElementTreeItemChildren, createUpdateElementTreeDraft, createClearElementTreeDraft, createElementTreeCommittedDraftValue, createCommitElementTreeInputOnEnter, createMarkBusTerminalSyncDirty, createBusNodeIdsFromEdges, createMarkBusTerminalSyncDirtyForEdges, createBusTerminalSyncNodeIdsForGraphPatch, createSynchronizePendingBusTerminalsWithGraphStore, createApplyCanvasPanningVisualOffset, createCancelCanvasBoundsScrollSyncPendingRelease, createClearCanvasBoundsScrollSyncPending, createReleaseCanvasBoundsScrollSyncPending, createMarkCanvasBoundsScrollSyncPending, createCanvasBoundsForGraphContent, createApplyCanvasBounds, createRejectAutoCanvasExpansionForContent, createCanvasBoundsForAutoExpandedGraphContent, createTranslateStoredEdgeGeometryBy, createShiftCachedRoutesForCanvasOrigin, createLeftTopCanvasOriginShiftForContent, createMinimumCanvasBoundsForResizeEdge, createClampNodePositionToExpandableBounds, createClampPointToExpandableBounds, createClampEdgeGeometryToExpandableBounds, createCanvasNoScrollOffsetForCanvasResizeAnchor, createSetCanvasFrameScrollPosition, createCenterCanvasFrameScrollPosition, createSyncCanvasFrameScrollToViewBox, createSyncCanvasFrameScrollToCanvasResizeCommitAnchor, createSyncCanvasFrameScrollToWheelAnchor, createCurrentViewBoxFromCanvasFrameScroll, createScheduleCanvasVisibleViewBoxUpdate, createHandleCanvasFrameScroll, createUpdateCanvasFrameViewportSize, createUpdateCanvasFrameViewportAndVisibleBox, createNodeImage, createRenderNodePreviewImageContent, createBuildNodePreviewImageMarkup, createBuildConnectPreviewPath, createBuildRoutableLinePreviewPath, createPatchStoredRouteStoreForEdgeIds, createMarkRouteEdgesDirty, createMarkStoredRouteEdgesDirty, createEdgeListsHaveSameOrder, createEdgeReferenceDiffIds, createDirtyEdgeIdsAfterMove, createDirtyEdgeIdsForMovedLocalRoutes, createDirtyEdgeIdsAfterBulkMove, createLogBulkMoveCommitStats, createBuildMovedNodeUpdates, createNextNodesForMovedGraphCommit, createEdgePatchFromCandidateEdges, createGraphStorePatchStillCurrent, createShouldRunSynchronousMoveBlockerRepair, createMarkGraphDirtyForInteractiveCommit, createPatchSingleTerminalAnchorFromPoint, createRebuildEdgeUpdatesAfterNodeGeometryChange, createRebuildEdgesAfterNodeGeometryChange, createStoredRouteEndpointMatchPoint, createEndpointMatchedRoutePointsForEdge, createEdgeWithFrozenBusEndpointPoints, createPreviewStoredRoutePointsForEdge, createClearLocalSchemeModelCache, createRememberPersistedSchemesPayload, createRefreshSchemesFromBackendDirectory, createHandleBackendSchemeMutationFailure, createSaveSchemeTreeToBackend, createPersistSchemeTreeToBackend, createReplaceSchemeTreeInBackend, createPersistRefreshRecoveryNow, createClearRecordSelection, createBlurLayerManagementDropdownFocus, createSelectSingleScheme, createSelectSingleProject, createToggleSchemeSelection, createToggleProjectSelection, createUndoGraphSnapshotPatchPlan, createApplyUndoGraphSnapshot, createPushUndoSnapshot, createUniqueUndoScopeIds, createPushNodeOnlyUndoSnapshot, createSyncExistingNodesWithTemplateDefinitions, createUpdateMeasurementConfig, createPrepareMeasurementConfigDraft, createOpenMeasurementConfigDialog, createCloseMeasurementConfigDialog, createSaveMeasurementConfigDialog, createUpdateMeasurementType, createAddMeasurementType, createDeleteMeasurementType, createSetMeasurementProfileItems, createCreateMeasurementProfileItem, createAddMeasurementProfileItem, createUpdateMeasurementProfileItem, createDeleteMeasurementProfileItem, createMoveMeasurementProfileItem, createUpdateProjectMeasurementsWithUndo, createAddDefaultMeasurementsToNode, createRemoveMeasurementsFromNode, createMeasurementGroupShellOffsetForNode, createMeasurementSourcePointForNodeItem, createMeasurementTypeOptionsForMeasurementGroup, createCreateMeasurementItemForNode, createUpdateMeasurementGroupById, createUpdateSelectedMeasurementGroup, createUpdateSelectedMeasurementGroups, createAddMeasurementItemToGroup, createAddMeasurementItemToNode, createUpdateMeasurementItem, createRemoveMeasurementItem, createCreateMeasurementEditorGroupForPosition, createUpdateMeasurementEditorGroupSettings, createUpdateMeasurementEditorDraftItem, createAddMeasurementEditorDraftItem, createRemoveMeasurementEditorDraftItem, createMoveMeasurementEditorDraftItem, createUpdateMeasurementEditorDraftItemPosition, createDuplicateMeasurementEditorItemNames, createConfirmMeasurementEditorDialog, createRenderSelectedNodeMeasurementTable, createBeginMeasurementDrag, createUpdateMeasurementDrag, createFinishMeasurementDrag } from "./appGraphMeasurementFactories";
import { createFlushMeasurementConfigDialogDraftInputs } from "./appGraphMeasurementFactories";
import { createEnsureDraggingUndoSnapshot, createRequestCanvasFrameCenter, createUndoLastOperation, createCanvasPointerKeyboardShortcutAvailability, createRouteForCurrentEdgeSave, createCurrentProject, createAdjustSelectedDisplayLayer, createClearTransientSelectionState, createWriteOperationLog, createRequireEditMode, createPersistDeviceLibraryChange, createPersistTemplateLibraryChange, createConnectionCommitFailureMessage, createSwitchInspectorTabForCanvasSelection, createSelectCanvasGraphics, createSetModifierSelectionPress, createToggleNodeSelectionFromModifierClick, createToggleEdgeSelectionFromModifierClick, createToggleSelectionFromModifierClick, createRestoreCanvasSelectionSnapshot, createRestoreCanvasSelectionSnapshotWithInspector, createStartModifierSelectionPress, createCancelModifierSelectionPress, createFinishModifierSelectionPress, createStartNodeLabelDrag, createStartNodeLabelRotateDrag, createFinishNodeLabelDrag, createFinishNodeLabelRotateDrag, createSetSelectedNodeLabelDisplayMode, createToggleSelectedNodeLabelDisplay, createCopySelection, createCutSelection, createPasteSelection, createCreateGraphTemplateType, createCreateGroupDeviceIconSvg, createGroupDeviceTerminalAnchor, createGroupDeviceTerminalSortKey, createGroupDeviceTerminalAssociationFor, createGroupDeviceExternalTerminals, createValidateGroupDeviceIconReplacement, createReplaceBuiltinDeviceIconOverride, createOpenGroupDeviceDefinitionDialog, createConfirmCreateDeviceFromGroup, createConfirmReplaceDeviceIconFromGroup, createOpenAddTemplateDialog, createCancelTemplateDialog, createConfirmAddGraphTemplate, createDeleteGraphTemplate, createDeleteGraphTemplateType, createDropGraphTemplate, createFinishMarqueeSelectionFromPoints, createStartContextMarqueeSelection, createOpenFilterSelectionDialog, createToggleFilterSelectionType, createToggleFilterSelectionItem, createConfirmFilterSelectionDialog, createFinishMarqueeSelection, createDeleteSelection, createDeleteSelectedGraphicsFromCanvas, createGroupSelectedGraphics, createUngroupSelectedGraphics, createManualPointDeltaForEdge, createRoutePreserveEdgeIdsForMovedNodes, createRouteSnapshotEdgesForMove, createRouteTouchesExpandedBoxes, createBoundsForNodeSet, createMergeNodeUpdateLists, createMergeUniqueEdgesById, createCompleteNodeListForPartialPatch, createIsWholeActiveLayerMove, createInternalMoveEdgeIdsForMovedNodes, createExternalMoveCandidateEdges, createInternalMoveCandidateEdges, createTranslateInternalMoveCandidateEdges, createTranslateWholeMoveCandidateEdges, createInternalRoutableLineNodeUpdatesForMove, createRoutableLineRouteCandidateIdsForMovedNodes, createRebuildRoutableLineNodeUpdatesForChangedNodes, createScheduleDeferredRoutableLineRouteRepair, createLocalRouteOptimizationEdges, createLocalRouteOptimizationCandidateEdges, createRoutePointsForMovedNodeBlockers, createRoutePointsForMovedEdgesBlockedByStationaryNodes, createRoutePointsNearOriginalMovedNodes, createAdjustEdgesAfterNodeMove, createRebuildSingleAffectedConnectionRoute, createSynchronousEdgeAdjustmentCandidates, createShouldAdjustEdgeSynchronouslyAfterMove, createMergeAdjustedCandidateEdges, createTerminalReconcileNodeScope, createFinalizeMovedNodeEdgesFast, createOptimizeMovedNodeEdgeRoutes, createShouldRunDeferredMoveOptimization, createScheduleMovedEdgeOptimization, createScheduleDeferredMovedConnectionRepair, createMoveRouteRepairSeedEdges, createLightweightMovedEndpointRoute, createPatchCachedRoutesForHighFanoutMove, createPatchCachedRoutesForBulkTranslation, createPatchCachedRoutesForWholeMove, createPatchCachedRoutesForInternalMove, createStoredRouteDirtyIdsForMove, createBuildBulkMovePlan, createCommitFastMovedGraphPatches, createUpdateMouseStatus, createUpdateMultiNodeDragOverlayTransform, createShowImperativeMultiNodeDragOverlay, createHideImperativeMultiNodeDragOverlay, createResetMultiNodeDragOverlayTransform, createBuildSingleNodeDragPreviewNodeMarkup, createClearImperativeNodeDragEdgePreview, createShowImperativeSingleNodeDragPreview, createCssSelectorEscape, createClearImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOrigin, createBindCanvasNodeElement, createHideImperativeSingleNodeDragPreview, createSingleNodeDragPreviewNodeFor, createSingleNodeDragRelevantEdges, createSingleNodeDragPreviewBounds, createSingleNodeDragEdgeTouchesBounds, createSingleNodeDragViewportLocalEdgesByScan, createSingleNodeDragScopedEdges, createSimpleOrthogonalDragPreviewPoints, createRoutableLineIdsConnectedToNodeIds, createRoutableLineEndpointPreviewRoutePoints, createBuildRoutableLinePreviewRoutesForNodeUpdates, createBuildRoutableLineEndpointPreviewNodeUpdates, createBuildTranslatedInternalRoutableLineDragPreviewRoutes, createBuildRoutableLineDragPreviewRoutes, createBuildCachedSingleNodeDragPreviewRoutes, createBuildDragPreviewEndpointPoints, createConnectionEndpointPreviewRoutePoints, createBuildLightweightNodeDragPreviewRoutes, createBuildLightweightNodeDragPreviewRouteMarkup, createSyncImperativeNodeDragPreviewPaths, createUpdateNodeDragLightweightEdgePreview, createSingleNodeDragInteractionNodes, createMultiNodeDragInteractionNodes, createUpdateImperativeNodeDragDropHint, createFindSingleNodeDragSnapTargetAtDelta, createFindMultiNodeDragSnapTargetAtDelta } from "./appSelectionDragFactories";
import { createUpdateSingleNodeDragImperativePreview, createStartDraggingState, createFlushConnectPreviewDom, createSetConnectPreviewDom, createApplyConnectPreviewState, createScheduleConnectPreviewPoint, createApplyRoutableLinePreviewState, createScheduleRoutableLinePreviewPoint, createReleaseRoutableLinePreviewAxisLock, createLockRoutableLinePreviewAxis, createAppendRoutableLinePreviewManualPoint, createResolveRoutableLinePreviewPoint, createResetRoutableLinePreviewState, createScheduleRewirePreviewPoint, createResetConnectPreviewState, createReleaseConnectPreviewAxisLock, createConnectSourceEndpointPoint, createLockConnectPreviewAxis, createAppendConnectPreviewManualPoint, createResolveConnectPreviewPoint, createBoundedDeltaForNodes, createBoundedDeltaForMultiNodeInteractiveMove, createNodeMoveGeometryInsideCanvas, createNearestBoundarySafeDelta, createBoundedDeltaForMoveGeometry, createCommitSafeDeltaForDraggingState, createCanvasBoundsForMovedNodeDelta, createDragBoundsForSmartAlignment, createTerminalOutflowAnchorsForSmartAlignmentDrag, createComputeSmartAlignmentSnap, createComputeNodeDragPreviewDelta, createComputeNodeDragDelta, createApplyNodeDragMove, createScheduleNodeDragMove, createFlushPendingNodeDragMove, createClearNodeDragMoveSchedule, createClearKeyboardMoveCommitSchedule, createClearKeyboardNudgeSchedule, createClearDraggingMoveState, createCancelActiveEditInteractions, createEnterBrowseMode, createRequestEnterBrowseMode, createToggleInteractionMode, createFinishDraggingMove, createFinishNodeDrag, createFinishTransformDrag, createFinishKeyboardMove, createScheduleKeyboardMoveCommit, createApplyKeyboardMoveDelta, createFlushPendingKeyboardMove, createKeyboardMoveActiveFrameDelta, createAppendPendingKeyboardMoveDelta, createScheduleKeyboardNudgeFrame, createReleaseKeyboardMoveKey, createStartKeyboardMoveSession, createNudgeSelectionByKeyboard, createMoveSelection, createUndoScopeForNodeFootprintPatch, createUpdateSelectedNode, createCommitNodeFootprintUpdates, createAssignSelectedNodesToModelLayer, createOpenLayerAssignmentDialog, createApplyLayerAssignmentDialog, createRotateSelectedLayoutUnits, createMirrorSelectedNodes, createUpdateCanvasSize, createCommitCanvasSizeDraft, createResetCanvasSizeDraft, createHandleCanvasSizeBlur, createHandleCanvasSizeKeyDown, createUpdateParam, createApplyBatchCommonParamPatch, createApplyBatchCommonParam, createApplyBatchCommonMeasurementGroupSetting, createCommitElementTreeNodeIdentity, createCommitElementTreeContainerChildParam, createTerminalVbaseFallback, createUpdateTerminalVbase, createRenderParamHeader, createRenderNodeDoubleClickDeviceParamRows, createRememberNodeDoubleClickDialogGuard, createSuppressNodeDoubleClickDialogEvent, createFinishNodeDoubleClickDialogPointerOperation, createStopNodeDoubleClickDialogEvent, createCurrentNodeDoubleClickDialogRect, createStartNodeDoubleClickDialogDrag, createStartNodeDoubleClickDialogResize, createCancelNodeDoubleClickDialog, createConfirmNodeDoubleClickDialog, createRenderNodeDoubleClickDialog, createContextMenuPlacement, createContextMenuStyle, createContextMenuClassName, createStopSidePanelEventPropagation, createSetSidePanelMode, createPointerClientTargetInside, createPointerInsideElementRect, createUpdateAutoPanelVisibility, createActivateInspectorFromCanvas, createOpenMeasurementEditorForNode, createHandleSidePanelPointerLeave, createHideAutoPanelsFromWorkspace, createAppendDistinctStaticDrawingPoint, createRenderStaticBoxDrawingPreview, createStartInteractiveStaticDrawing, createCancelInteractiveStaticDrawing, createFinishInteractiveStaticDrawing, createAppendStaticDrawingPoint, createUpdateInteractiveStaticDrawingPreview, createRenderInteractiveStaticDrawingPreview, createStartLibraryDevicePlacement, createStartLibraryGraphTemplatePlacement, createCancelLibraryPlacement, createUpdateLibraryPlacementPreview, createClearLibraryPlacementPreview, createPlaceLibraryDeviceAtPoint, createCommitLibraryPlacementAtPoint, createRenderLibraryPlacementPreview, createStartSidePanelResize, createStartCanvasResize, createStartCanvasResizeFromRightOverlay, createStartCanvasResizeFromLeftOverlay, createStartCanvasResizeFromBottomOverlay, createStartCanvasResizeFromTopOverlay, createStartStatusbarResize, createCurrentTopologyWarningPanelRect, createStartTopologyWarningPanelDrag, createStartTopologyWarningPanelResize, createRenderSidePanelModeControls, createRenderSidePanelEdgeTrigger, createNormalizeStaticBoxDimension, createToLocalNodePoint, createSingleTransformNodeUpdate, createSignedScaleFromRotatedHandleDelta, createSignedScaleFromUprightHandleDelta, createProportionalSignedScaleFromHandleDelta, createProportionalSignedScaleFromUprightHandleDelta, createCurrentStoredRoutePointsForEdge, createBuildMirrorLayoutUnitEdgeUpdates, createBuildRotateLayoutUnitEdgeUpdates, createBuildGroupTransformEdgeUpdates, createOverlayEdgeUpdatesForTransform, createStartGroupTransformDrag, createStartSingleTransformDrag, createStartGroupMoveDrag, createBuildGroupTransformNodeUpdates, createRotateLayoutUnitNodeUpdates, createMirrorLayoutUnitNodeUpdates, createBusAnchorFromEvent, createBusAnchorFromPoint, createIsPointOnBus, createIsPointNearBus, createFindRewireTargetAtPoint, createFindConnectTargetAtPoint, createFindRoutableLineEndpointTargetAtPoint } from "./appCanvasInteractionFactories";
import { createCommitRoutableLineDevice, createStartRoutableLineFromTerminal, createFinishRoutableLineToTarget, createUpdateRoutableLineEndpointDrag, createStartRoutableLineEndpointDrag, createFinishRoutableLineEndpointDrag, createCommitNewConnectionEdge, createFinishConnectToTarget, createFinishRewiring, createHandleDrop, createHandleRoutableLineNodePointerDown, createHandleNodePointerDown, createHandleRoutableLineNodePathPointerDown, createHandlePointerMove, createFinishCanvasPanning, createStartCanvasPanning, createHandleCanvasPointerDownCapture, createClientPointInsideRenderedCanvas, createFocusCanvasKeyboardShortcutHost, createWheelZoomAnchorFromClient, createFlushPendingWheelZoom, createScheduleWheelZoom, createZoomCanvasFromWheelEvent, createHandleWheel, createDeleteSelected, createRunContextMenuAction, createReadjustMovedBusConnectionRoutes, createReadjustActiveLayerBusEndpointRoutes, createCommitLayoutNodePositions, createApplySelectedNodeLayout, createAutoSpreadCanvasGraphics, createAutoAlignCanvasGraphics, createDefaultVoltageBaseSetValue, createRecommendedVoltageBaseSetMode, createDefaultVoltageBaseTerminalValues, createDefaultVoltageBaseTerminalKey, createActiveVoltageBaseTerminalValues, createSetVoltageBaseTerminalValue, createMergeVoltageBaseSetResults, createVoltageBaseSetReady, createVoltageBaseSetResultForScope, createOpenVoltageBaseSetDialog, createConfirmVoltageBaseSetDialog, createOpenVoltageBaseClearDialog, createConfirmVoltageBaseClearDialog, createConnectionRedrawViewportBounds, createConnectionRedrawEdgeIdsForScope, createConnectionRedrawLineNodeIdsForScope, createConnectionRedrawTargetsForScope, createRedrawConnectionRoutes, createOpenConnectionRedrawDialog, createConfirmConnectionRedrawDialog, createAlignSelected, createDistributeSelected, createToggleSchemeExpanded, createPromptUniqueRecordName, createCloneProjectRecordForPaste, createSchemePathForScheme, createSchemePathForProject, createSchemePathForRecord, createCloneSchemeRecord, createCloneSchemeRecordWithName, createCloneSchemeRecordForPaste, createClearActiveProjectDisplay, createLoadSavedProject, createLoadSavedProjectRecord, createRequestUnsavedChangeAction, createRequestLoadSavedProject, createResolveUnsavedChangeAction, createCreateSchemeRecord, createRenameSchemeRecord, createDuplicateSchemeRecord, createDeleteSchemeRecord, createCopySelectedRecord, createDeleteSelectedRecords, createCopyProjectRecord, createCopySchemeRecord, createPasteSchemeClipboardRecord, createPasteProjectClipboardRecord, createPasteSelectedRecord, createCommitProjectRecordMove, createResolveRecordPasteConflict, createMoveProjectRecordToScheme, createMoveSchemeRecordToScheme, createSaveActiveProjectPointer, createSetActiveLayer, createNextDefaultModelLayerName, createAddModelLayer, createClearLayerNameDraft, createCommitModelLayerName, createHandleLayerNameInputKeyDown, createToggleModelLayerVisibility, createSetAllModelLayersVisibility, createMoveModelLayer, createDeleteModelLayer, createRenderDeviceDefinitionMeasurementPanel, createRenderMeasurementConfigDialog, createRenderMeasurementEditorDialog, createSaveCurrentProject, createRenameProjectRecord, createDuplicateProjectRecord, createDuplicateSelectedProjectRecords, createDuplicateSelectedSchemeRecords, createDeleteProjectRecord, createCreateBlankProject, createLocateTopologyError, createRunTopologyCalculation, createGetEdgeEndpointPoint, createCenterViewOnPoint, createViewportCenterAnchorForPoint, createSetViewBoxAtViewportCenter, createCenterViewBoxOnPoint, createCenterViewOnPointAtZoom, createZoomViewportAtCenter, createResetViewportZoom, createFitWholeCanvasToFrame, createFitWholeCanvasFromBlankDoubleClick, createFitViewToBounds, createFitViewToContent, createFocusElementTreeItem, createJumpToElementTreeItem, createOpenElementTreeItemContextMenu, createSetEdgeManualPoints, createRouteManualPoints, createFinishManualPathDrag, createTidySelectedEdgeRoute, createTidyRoutableLineRoute } from "./appProjectCanvasFactories";
import { createOpenEdgeContextMenu, createCaptureCanvasPointer, createStartManualSegmentDrag, createStartManualPointDrag, createRouteSegmentPointerDistance, createFindEditableRouteSegmentIndex, createConnectionHitTolerance, createFindConnectionRouteHitAtPoint, createInsertManualBendAtPoint, createInsertManualBendFromPointer, createAddManualBendFromContextMenu, createAddRoutableLineBendFromContextMenu, createInsertManualBendFromEdgePath, createHandleEdgePathPointerDown, createDeleteManualBendPoint, createSetRoutableLineManualPathPoints, createInsertRoutableLineBendAtPoint, createInsertRoutableLineBendFromPointer, createStartRoutableLineSegmentDrag, createStartRoutableLinePointDrag, createDeleteRoutableLineBendPoint, createStartConnectFromTerminal, createFinishTerminalPress, createHandleTerminalPointerDown, createEnsureSavedBeforeExport, createSvgExportReferencedImageHrefById, createLoadSvgImageExportPathById, createExportSvg, createExportEFile, createExportSvgFile, createExportJsonFile, createExportEDeviceDefinitionFile, createImportEDeviceDefinitionFile, createIsProjectFilePayload, createCreateImportedSchemeRecord, createExportProjectRecordFile, createExportCurrentModelFile, createOpenModelImportFilePicker, createOpenSchemeImportFilePicker, createMergeImportedSchemeIntoExisting, createCommitImportedSchemeRecord, createApplyBackendSchemeArchiveImport, createImportSchemeFile, createCommitImportedModelRecord, createImportModelFile, createResolveDuplicateSchemeImport, createResolveDuplicateModelImport, createExportSchemeRecord, createChooseImage, createApplyExistingImage, createApplyIconLibraryCatalogIcon, createClearSelectedImage, createClearSelectedImageForNode, createCreateImageFolder, createRenameImageFolder, createDeleteImageFolder, createStartProjectRecordDrag, createFinishProjectRecordDrag, createStartSchemeRecordDrag, createFinishSchemeRecordDrag, createRenderProjectSchemeNode, createOpenBlankProjectLibraryContextMenu, createCustomDeviceDefaultStateVisualDraft, createSnapCustomDeviceTerminalAnchor, createCustomDeviceTerminalConnectorSegment, createUpdateCustomDeviceTerminalAnchor, createUpdateCustomDeviceStateDraftRow, createAddCustomDeviceStateDraftRow, createDeleteCustomDeviceStateDraftRow, createUpdateCustomDeviceTerminalAnchorFromPreview, createDefinitionDefaultStateVisualDraft, createSnapDefinitionTerminalAnchor, createDefinitionTerminalConnectorSegment, createUpdateDefinitionTerminalAnchor, createUpdateDefinitionTerminalAnchorFromPreview, createLoadDefinitionTemplateDraft, createFinishDeviceLibraryDialogPointerOperation, createCurrentDeviceLibraryDialogRect, createDeviceLibraryDialogStyle, createStartDeviceLibraryDialogDrag, createStartDeviceLibraryDialogResize, createStopDeviceLibraryDialogEvent, createOpenDeviceDefinitionDialog, createCloseDeviceDefinitionDialog, createCloseCustomDeviceDialog, createRequestCloseCustomDeviceDialog, createSetCustomDeviceDraftCleanBaseline, createCustomDeviceDraftHasUnsavedChanges, createRevertCustomDeviceDraftCurrentTab, createRevertCustomDeviceDraftAll, createToggleDefinitionGroup, createToggleDefinitionComponentLibrary, createToggleElementTreeGroup, createToggleElementTreeDeviceGroup, createUpdateDefinitionDraftRow, createAddDefinitionDraftRow, createDeleteDefinitionDraftRow, createUpdateDefinitionStateDraftRow, createAddDefinitionStateDraftRow, createDeleteDefinitionStateDraftRow, createUpdateSelectedDefinitionResizePermission, createSaveDeviceDefinitionStateVisualDraft, createSaveDeviceDefinitionVisualDraft, createSaveDeviceDefinitionDraft, createResetDeviceDefinitionDraft, createUpdateDefinitionComponentLibraryCommonParamExport, createUpdateCustomDraftTerminalCount, createChooseCustomDeviceBackground, createChooseDefinitionTemplateIcon, createChooseStateVisualImage, createChooseStateIconDrawingImport, createUpdateStateIconDrawingElement, createUpdateStateIconDrawingElements, createStateIconDrawingPointer, createStateIconDrawingSelection, createComputeStateIconDrawingSmartAlignmentSnap, createStartStateIconDrawingDrag, createDragStateIconDrawingSelection, createStopStateIconDrawingDrag, createDeleteSelectedStateIconDrawingElements, createStateIconDrawingKeyDown, createAddStateIconDrawingElement, createDeleteStateIconDrawingElement, createOpenStateIconDrawingDialog, createApplyStateIconDrawingDialog, createEnsureCustomComponentTreeExpanded, createCancelPendingCustomComponentTemplateLoad, createSelectCustomCategoryLibrary, createSelectCustomComponentLibrary, createSelectCustomComponentTemplate, createStartCustomComponentCreate, createConfirmCustomLibraryCreateDialog, createNextCustomCategoryLibraryName, createCreateCustomCategoryLibrary, createDeleteCustomCategoryLibrary, createNextCustomComponentLibraryName, createCreateCustomComponentLibrary, createDeleteCustomComponentLibrary, createRenameSelectedCustomDeviceTreeItem, createDeleteSelectedCustomDeviceTreeItem, createNextCustomTemplateKind, createSaveCustomDeviceTemplate, createSaveBuiltinDeviceDefinitionFromCustomDraft, createSaveCustomDeviceDefinitionDialog } from "./appDeviceDefinitionFactories";
import { createRenderStateVisualPager, createRenderDeviceDefinitionVisualPanel, createRenderGraphTemplatePreview, createRenderLibraryTemplateButton, createRenderLibraryFlyout, createLodNodeFromEvent, createLodTerminalIdFromEvent, createHandleLodNodePointerDown, createHandleLodNodeContextMenu } from "./appDeviceDefinitionRenderers";
import { createOpenNodeDoubleClickEditor, createHandleLodNodeDoubleClick, createClampFloatingToolbarPosition, createToolbarOverlapArea, createCanvasRectToSurfaceCssRect, createRotateControlAvoidRectFromCanvasPoints, createPlaceFloatingToolbar, createRenderMeasurementGroup, createHandleMinimapNavigate, createCenterSelectedInView, createFitViewToSelection, createClearStaticButtonFeedbackTimer, createSetStaticButtonFeedback, createClearStaticButtonFeedback, createBeginStaticButtonPointerFeedback, createResolveStaticButtonTargetProject, createExecuteStaticButtonCommand, createExecuteStaticButtonAction, createHandleStaticButtonClick, createBeginReadonlyBackgroundStaticButtonPointerFeedback, createRenderReadonlyBackgroundPage, createOpenTopologyWarningPanel, createAppHookCallback1, createAppHookCallback2, createAppHookCallback3, createAppHookCallback4, createAppHookCallback5, createAppHookCallback6, createAppHookCallback7, createAppHookCallback8, createAppHookCallback9, createAppHookCallback10, createAppHookCallback11, createAppHookCallback12, createAppHookCallback13, createAppHookCallback14, createAppHookCallback15, createAppHookCallback16, createAppHookCallback17, createAppHookCallback18, createAppHookCallback19, createAppHookCallback20, createAppHookCallback21, createAppHookCallback22, createAppHookCallback23, createAppHookCallback24, createAppHookCallback25, createAppHookCallback26, createAppHookCallback27, createAppHookCallback28, createAppHookCallback29, createAppHookCallback30, createAppHookCallback31, createAppHookCallback32, createAppHookCallback33, createAppHookCallback34, createAppHookCallback35, createAppHookCallback36, createAppHookCallback37, createAppHookCallback39, createAppHookCallback40, createAppHookCallback41, createAppHookCallback42, createAppHookCallback43, createAppHookCallback44, createAppHookCallback45, createAppHookCallback46, createAppHookCallback47, createAppHookCallback48, createAppHookCallback49, createAppHookCallback50, createAppHookCallback51, createAppHookCallback52, createAppHookCallback53, createAppHookCallback54, createAppHookCallback55, createAppHookCallback56, createAppHookCallback57, createAppHookCallback58, createAppHookCallback59, createAppHookCallback60, createAppHookCallback61, createAppHookCallback62, createAppHookCallback63, createAppHookCallback64, createAppHookCallback65, createAppHookCallback66, createAppHookCallback67, createAppHookCallback68, createAppHookCallback69, createAppHookCallback70, createAppHookCallback71, createAppHookCallback72, createAppHookCallback73, createAppHookCallback74, createAppHookCallback75, createAppHookCallback76, createAppHookCallback77, createAppHookCallback78, createAppHookCallback79, createAppHookCallback80, createAppHookCallback81, createAppHookCallback82, createAppHookCallback83, createAppHookCallback84, createAppHookCallback85, createAppHookCallback86, createAppHookCallback87, createAppHookCallback88, createAppHookCallback89, createAppHookCallback90, createAppHookCallback91, createAppHookCallback92, createAppHookCallback93, createAppHookCallback94, createAppHookCallback95, createAppHookCallback96, createAppHookCallback97, createAppHookCallback98, createAppHookCallback99, createAppHookCallback100, createAppHookCallback101, createAppHookCallback102, createAppHookCallback103, createAppHookCallback104, createAppHookCallback105, createAppHookCallback106, createAppHookCallback107, createAppHookCallback108, createAppHookCallback109, createAppHookCallback110, createAppHookCallback111, createAppHookCallback112, createAppHookCallback113, createAppHookCallback114, createAppHookCallback115, createAppHookCallback116, createAppHookCallback117, createAppHookCallback118, createAppHookCallback119, createAppHookCallback120, createAppHookCallback121, createAppHookCallback122, createAppHookCallback123, createAppHookCallback124, createAppHookCallback125, createAppHookCallback126, createAppHookCallback127, createAppHookCallback128, createAppHookCallback129, createAppHookCallback130, createAppHookCallback131, createAppHookCallback132, createAppHookCallback133, createAppHookCallback134, createAppHookCallback135, createAppHookCallback136, createAppHookCallback137, createAppHookCallback138, createAppHookCallback139, createAppHookCallback140, createAppHookCallback141, createAppHookCallback142 } from "./appToolbarHookFactories";
import { mergeBuiltinSharedIconAssets } from "../sharedIconLibrary";
import { VoltageLevelDialog } from "../VoltageLevelDialog";
import { createProgrammaticAddDevice, createProgrammaticCreateScheme, createProgrammaticCreateBlankProject, createProgrammaticSelectDevices, createProgrammaticGroupSelected, createProgrammaticDeleteDevices, createProgrammaticUpdateDeviceProperty, createProgrammaticSave, createProgrammaticSaveSelectionAsTemplate } from "./appControlFactories";
import {
  ICON_LIBRARY_PAGE_SIZE,
  createInitialIconLibraryPickerState,
  fetchIconLibraryCatalog,
  fetchIconLibraryManifest,
  flattenIconLibraryManifest,
  type IconLibraryPickerState
} from "../iconLibraryCatalog";
import { imagePickerUsesLibraryTabs, renderAppView } from "./appView";
import { MemoizedCanvasArea } from "./appCanvasArea";

export function useCanvasViewportBatch(__appScope: Record<string, any>) {
  const {
    activeLayerEdgeIdSet,
    activeLayerEdges,
    activeLayerGroups,
    activeLayerNodeIdSet,
    activeLayerNodes,
    activeProjectKey,
    activeSchemeKey,
    activeSelectedEdgeIds,
    activeSelectedEdgeSet,
    activeSelectedNodeIds,
    busNodeIdSet,
    cachedRouteStoreRef,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    canvasFrameViewportSize,
    canvasHeight,
    canvasNoScrollOffset,
    canvasResizeDraft,
    canvasResizeDrag,
    canvasSelectionScope,
    canvasVisibleViewBox,
    canvasWidth,
    collapsedElementTreeDeviceGroups,
    collapsedElementTreeGroups,
    colorDisplayMode,
    colorPalette,
    connectDropReady,
    connectSource,
    connectionLineStyle,
    containerParamViewId,
    displaySelectedEdgeKey,
    displaySelectedNodeKey,
    dragging,
    draggingNodeIdSet,
    draggingNodeKey,
    edgeById,
    edges,
    editHotInteractionActive,
    elementTree,
    elementTreeEditDrafts,
    elementTreeItemLimits,
    elementTreeLayerSignature,
    elementTreeSearchQuery,
    focusedGroupedNodeMovesGroup,
    graphStore,
    graphTreePanelActive,
    hasUnsavedChanges,
    imageAssets,
    imperativeSingleNodeDragActiveRef,
    inspectorTopologyErrors,
    isEditMode,
    isReadonlyCanvasMode,
    layers,
    leftPanelAutoVisible,
    leftPanelMode,
    libraryPlacement,
    libraryTemplateByKind,
    manualPathDrag,
    mode,
    nodeById,
    nodeTerminalSnapTargetRef,
    nodes,
    pendingCanvasNoScrollOffsetRef,
    rewiring,
    rightPanelAutoVisible,
    rightPanelMode,
    routableLineEndpointDrag,
    routableLineNodeIdsByEndpointNodeId,
    routableLinePlacement,
    routableLinePreview,
    routeDirtyGenerationRef,
    routeRenderingReady,
    selectedContainerParameterViews,
    selectedEdge,
    selectedEdgeId,
    selectedNode,
    selectedNodeCount,
    selectedNodeIdSet,
    setElementTreeItemHeights,
    setElementTreeItemWindows,
    staticDrawing,
    staticTerminalOverlapReadyKey,
    terminalPress,
    transformDrag,
    viewBox,
    visibleEdgeIdSet,
    visibleEdges,
    visibleEdgesByTerminalRef,
    visibleNodeById,
    visibleNodeIdSet,
    visibleNodeSpatialIndex,
    visibleNodes
  } = __appScope;
  const selectedElementTreeItemKey = useMemo(createAppHookCallback30(__appScope), [activeLayerEdgeIdSet, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, graphTreePanelActive]); Object.assign(__appScope, { selectedElementTreeItemKey });
  const elementTreeSearchNeedle = elementTreeSearchQuery.trim().toLocaleLowerCase(); Object.assign(__appScope, { elementTreeSearchNeedle });
  const filteredElementTree = useMemo(createAppHookCallback31(__appScope), [elementTree, elementTreeSearchNeedle, libraryTemplateByKind, visibleNodeById]); Object.assign(__appScope, { filteredElementTree });
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
  const routableLineEndpointPreviewRoutePoints = createRoutableLineEndpointPreviewRoutePoints(__appScope); Object.assign(__appScope, { routableLineEndpointPreviewRoutePoints });
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
}
