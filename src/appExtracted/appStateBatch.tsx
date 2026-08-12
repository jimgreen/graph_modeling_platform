// @ts-nocheck
// 从 App.tsx 第 901-2261 行提取
import { useMemo, useEffect, useLayoutEffect, useRef, useTransition, useDeferredValue } from "react";
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
import { createOpenEdgeContextMenu, createCaptureCanvasPointer, createStartManualSegmentDrag, createStartManualPointDrag, createRouteSegmentPointerDistance, createFindEditableRouteSegmentIndex, createConnectionHitTolerance, createFindConnectionRouteHitAtPoint, createInsertManualBendAtPoint, createInsertManualBendFromPointer, createAddManualBendFromContextMenu, createAddRoutableLineBendFromContextMenu, createInsertManualBendFromEdgePath, createHandleEdgePathPointerDown, createDeleteManualBendPoint, createSetRoutableLineManualPathPoints, createInsertRoutableLineBendAtPoint, createInsertRoutableLineBendFromPointer, createStartRoutableLineSegmentDrag, createStartRoutableLinePointDrag, createDeleteRoutableLineBendPoint, createStartConnectFromTerminal, createFinishTerminalPress, createHandleTerminalPointerDown, createEnsureSavedBeforeExport, createSvgExportReferencedImageHrefById, createLoadSvgImageExportPathById, createExportSvg, createExportEFile, createExportSvgFile, createExportJsonFile, createExportEDeviceDefinitionFile, createImportEDeviceDefinitionFile, createIsProjectFilePayload, createCreateImportedSchemeRecord, createExportProjectRecordFile, createExportCurrentModelFile, createOpenModelImportFilePicker, createOpenSchemeImportFilePicker, createMergeImportedSchemeIntoExisting, createCommitImportedSchemeRecord, createApplyBackendSchemeArchiveImport, createImportSchemeFile, createCommitImportedModelRecord, createImportModelFile, createResolveDuplicateSchemeImport, createResolveDuplicateModelImport, createExportSchemeRecord, createChooseImage, createApplyExistingImage, createApplyIconLibraryCatalogIcon, createClearSelectedImage, createClearSelectedImageForNode, createCreateImageFolder, createRenameImageFolder, createDeleteImageFolder, createStartProjectRecordDrag, createFinishProjectRecordDrag, createStartSchemeRecordDrag, createFinishSchemeRecordDrag, createRenderProjectSchemeNode, createOpenBlankProjectLibraryContextMenu, createCustomDeviceDefaultStateVisualDraft, createSnapCustomDeviceTerminalAnchor, createCustomDeviceTerminalConnectorSegment, createUpdateCustomDeviceTerminalAnchor, createUpdateCustomDeviceStateDraftRow, createAddCustomDeviceStateDraftRow, createDeleteCustomDeviceStateDraftRow, createUpdateCustomDeviceTerminalAnchorFromPreview, createDefinitionDefaultStateVisualDraft, createSnapDefinitionTerminalAnchor, createDefinitionTerminalConnectorSegment, createUpdateDefinitionTerminalAnchor, createUpdateDefinitionTerminalAnchorFromPreview, createLoadDefinitionTemplateDraft, createFinishDeviceLibraryDialogPointerOperation, createCurrentDeviceLibraryDialogRect, createDeviceLibraryDialogStyle, createStartDeviceLibraryDialogDrag, createStartDeviceLibraryDialogResize, createStopDeviceLibraryDialogEvent, createOpenDeviceDefinitionDialog, createCloseDeviceDefinitionDialog, createCloseCustomDeviceDialog, createRequestCloseCustomDeviceDialog, createSetCustomDeviceDraftCleanBaseline, createCustomDeviceDraftHasUnsavedChanges, createRevertCustomDeviceDraftCurrentTab, createRevertCustomDeviceDraftAll, createToggleDefinitionGroup, createToggleDefinitionComponentLibrary, createToggleElementTreeGroup, createToggleElementTreeDeviceGroup, createUpdateDefinitionDraftRow, createAddDefinitionDraftRow, createDeleteDefinitionDraftRow, createUpdateDefinitionStateDraftRow, createAddDefinitionStateDraftRow, createDeleteDefinitionStateDraftRow, createUpdateSelectedDefinitionResizePermission, createSaveDeviceDefinitionStateVisualDraft, createSaveDeviceDefinitionVisualDraft, createSaveDeviceDefinitionDraft, createResetDeviceDefinitionDraft, createUpdateDefinitionComponentLibraryCommonParamExport, createUpdateCustomDraftTerminalCount, createChooseCustomDeviceBackground, createChooseDefinitionTemplateIcon, createChooseStateVisualImage, createChooseStateIconDrawingImport, createUpdateStateIconDrawingElement, createUpdateStateIconDrawingElements, createStateIconDrawingPointer, createStateIconDrawingSelection, createComputeStateIconDrawingSmartAlignmentSnap, createStartStateIconDrawingDrag, createDragStateIconDrawingSelection, createStopStateIconDrawingDrag, createDeleteSelectedStateIconDrawingElements, createStateIconDrawingKeyDown, createAddStateIconDrawingElement, createDeleteStateIconDrawingElement, createOpenStateIconDrawingDialog, createApplyStateIconDrawingDialog, createEnsureCustomComponentTreeExpanded, createCancelPendingCustomComponentTemplateLoad, createSelectCustomCategoryLibrary, createSelectCustomComponentLibrary, createSelectCustomComponentTemplate, createStartCustomComponentCreate, createConfirmCustomLibraryCreateDialog, createNextCustomCategoryLibraryName, createCreateCustomCategoryLibrary, createDeleteCustomCategoryLibrary, createNextCustomComponentLibraryName, createCreateCustomComponentLibrary, createDeleteCustomComponentLibrary, createRenameSelectedCustomDeviceTreeItem, createDeleteSelectedCustomDeviceTreeItem, createNextCustomTemplateKind, createSaveCustomDeviceTemplate, createSaveBuiltinDeviceDefinitionFromCustomDraft, createSaveCustomDeviceDefinitionDialog, createRenderStateVisualPager, createRenderDeviceDefinitionVisualPanel, createRenderGraphTemplatePreview, createRenderLibraryTemplateButton, createRenderLibraryFlyout, createLodNodeFromEvent, createLodTerminalIdFromEvent, createHandleLodNodePointerDown, createHandleLodNodeContextMenu } from "./appDeviceDefinitionFactories";
import { createOpenNodeDoubleClickEditor, createHandleLodNodeDoubleClick, createClampFloatingToolbarPosition, createToolbarOverlapArea, createCanvasRectToSurfaceCssRect, createRotateControlAvoidRectFromCanvasPoints, createPlaceFloatingToolbar, createRenderMeasurementGroup, createHandleMinimapNavigate, createCenterSelectedInView, createFitViewToSelection, createClearStaticButtonFeedbackTimer, createSetStaticButtonFeedback, createClearStaticButtonFeedback, createBeginStaticButtonPointerFeedback, createResolveStaticButtonTargetProject, createExecuteStaticButtonCommand, createExecuteStaticButtonAction, createHandleStaticButtonClick, createBeginReadonlyBackgroundStaticButtonPointerFeedback, createRenderReadonlyBackgroundPage, createOpenTopologyWarningPanel, createAppHookCallback1, createAppHookCallback2, createAppHookCallback3, createAppHookCallback4, createAppHookCallback5, createAppHookCallback6, createAppHookCallback7, createAppHookCallback8, createAppHookCallback9, createAppHookCallback10, createAppHookCallback11, createAppHookCallback12, createAppHookCallback13, createAppHookCallback14, createAppHookCallback15, createAppHookCallback16, createAppHookCallback17, createAppHookCallback18, createAppHookCallback19, createAppHookCallback20, createAppHookCallback21, createAppHookCallback22, createAppHookCallback23, createAppHookCallback24, createAppHookCallback25, createAppHookCallback26, createAppHookCallback27, createAppHookCallback28, createAppHookCallback29, createAppHookCallback30, createAppHookCallback31, createAppHookCallback32, createAppHookCallback33, createAppHookCallback34, createAppHookCallback35, createAppHookCallback36, createAppHookCallback37, createAppHookCallback38, createAppHookCallback39, createAppHookCallback40, createAppHookCallback41, createAppHookCallback42, createAppHookCallback43, createAppHookCallback44, createAppHookCallback45, createAppHookCallback46, createAppHookCallback47, createAppHookCallback48, createAppHookCallback49, createAppHookCallback50, createAppHookCallback51, createAppHookCallback52, createAppHookCallback53, createAppHookCallback54, createAppHookCallback55, createAppHookCallback56, createAppHookCallback57, createAppHookCallback58, createAppHookCallback59, createAppHookCallback60, createAppHookCallback61, createAppHookCallback62, createAppHookCallback63, createAppHookCallback64, createAppHookCallback65, createAppHookCallback66, createAppHookCallback67, createAppHookCallback68, createAppHookCallback69, createAppHookCallback70, createAppHookCallback71, createAppHookCallback72, createAppHookCallback73, createAppHookCallback74, createAppHookCallback75, createAppHookCallback76, createAppHookCallback77, createAppHookCallback78, createAppHookCallback79, createAppHookCallback80, createAppHookCallback81, createAppHookCallback82, createAppHookCallback83, createAppHookCallback84, createAppHookCallback85, createAppHookCallback86, createAppHookCallback87, createAppHookCallback88, createAppHookCallback89, createAppHookCallback90, createAppHookCallback91, createAppHookCallback92, createAppHookCallback93, createAppHookCallback94, createAppHookCallback95, createAppHookCallback96, createAppHookCallback97, createAppHookCallback98, createAppHookCallback99, createAppHookCallback100, createAppHookCallback101, createAppHookCallback102, createAppHookCallback103, createAppHookCallback104, createAppHookCallback105, createAppHookCallback106, createAppHookCallback107, createAppHookCallback108, createAppHookCallback109, createAppHookCallback110, createAppHookCallback111, createAppHookCallback112, createAppHookCallback113, createAppHookCallback114, createAppHookCallback115, createAppHookCallback116, createAppHookCallback117, createAppHookCallback118, createAppHookCallback119, createAppHookCallback120, createAppHookCallback121, createAppHookCallback122, createAppHookCallback123, createAppHookCallback124, createAppHookCallback125, createAppHookCallback126, createAppHookCallback127, createAppHookCallback128, createAppHookCallback129, createAppHookCallback130, createAppHookCallback131, createAppHookCallback132, createAppHookCallback133, createAppHookCallback134, createAppHookCallback135, createAppHookCallback136, createAppHookCallback137, createAppHookCallback138, createAppHookCallback139, createAppHookCallback140, createAppHookCallback141, createAppHookCallback142 } from "./appToolbarHookFactories";
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

export function useAppStateBatch(__appScope: Record<string, any>) {
  const {
    BatchCommonMeasurementGroupRow,
    BatchCommonParamRow,
    DraggingState,
    RefreshRecoveryProjectState,
    RenderViewportBounds,
    StaticButtonComponents,
    activeLayerId,
    activeProjectKey,
    activeSchemeKey,
    allowAutoExpandCanvas,
    backendSchemesLoadedRef,
    backgroundLayerIds,
    backgroundProjectId,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    canvasBackgroundImageFit,
    canvasHeight,
    canvasResizeDrag,
    canvasSelectionScope,
    canvasSelectionShortcutActiveRef,
    canvasWidth,
    colorDisplayMode,
    colorPalette,
    colorPaletteDialogOpen,
    colorPaletteDraft,
    componentLibraryDisplayMode,
    componentLibraryKey,
    connectSource,
    containerParamViewId,
    currentUnit,
    customCategoryLibraries,
    customComponentLibraries,
    customComponentTreeSearchQuery,
    customComponentTreeSelection,
    customDeviceDraft,
    customDeviceStatePageId,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    definitionDraftRows,
    definitionDraftSection,
    definitionStateDraftRows,
    definitionStatePageId,
    deviceDefinitionOverrides,
    deviceDefinitionSearchQuery,
    deviceIndexCounters,
    draggedEdgeIds,
    dragging,
    edges,
    edgesByTerminalRef,
    expandedCategoryLibraryComponentLibraries,
    globalMessage,
    globalMessageTimerRef,
    graphStore,
    groups,
    hasUnsavedChanges,
    hoveredCategoryLibraryComponentLibrary,
    hoveredGraphTemplateType,
    inspectorTab,
    interactionMode,
    latestActiveProjectPointerRef,
    latestEdgesRef,
    latestNodesRef,
    layerSignature,
    layers,
    leftPanelTab,
    libraryFlyoutCloseTimerRef,
    libraryFlyoutPositions,
    libraryPlacement,
    librarySearchQuery,
    manualPathDrag,
    marquee,
    measurementConfig,
    measurementConfigDraft,
    measurementEditorColumnWidths,
    modifierSelectionPress,
    moved,
    movedBusNodeIds,
    movedNodeIds,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodeSpatialIndex,
    nodes,
    nodesByLayerId,
    panning,
    powerBaseValue,
    powerUnit,
    projectMeasurements,
    projectName,
    projectSearchQuery,
    refreshRecoveryProjectRef,
    revision,
    rewiring,
    routePointsByEdgeId,
    saveRequiredRef,
    selectedDefinitionKind,
    selectedEdgeId,
    selectedEdgeIds,
    subcontrolarea,
    substation,
    feeder,
    modelType,
    taiqu,
    selectedNodeIds,
    selectedProjectId,
    selectedSchemeId,
    setGlobalMessage,
    setGraphArrays,
    setHoveredGraphTemplateType,
    setLibraryFlyoutPositions,
    setMeasurementEditorColumnWidths,
    singleNodeDragCache,
    stateIconDrawing,
    staticDrawing,
    suppressNextGraphDirtyRef,
    templateLibraryDisplayMode,
    templateLibrarySearchQuery,
    terminalPress,
    topologyErrors,
    topologyWarningPage,
    transformDrag,
    tree,
    undoStack,
    viewBox,
    viewBoxRef,
    voltageColorVisibility,
    voltageUnit
  } = __appScope;
  const { latestSchemesRef, schemes } = __appScope;
  latestSchemesRef.current = schemes;
  const setSchemes = createSetSchemes(__appScope); Object.assign(__appScope, { setSchemes });
  const isBrowseMode = interactionMode === "browse"; Object.assign(__appScope, { isBrowseMode });
  const isEditMode = interactionMode === "edit"; Object.assign(__appScope, { isEditMode });
  const isReadonlyCanvasMode = isBrowseMode; Object.assign(__appScope, { isReadonlyCanvasMode });
  const editModeRouteRebuildOptions = { preserveManualPoints: isEditMode }; Object.assign(__appScope, { editModeRouteRebuildOptions });
  const editModeRouteRenderOptions = { preserveManualRouteDisplay: isEditMode }; Object.assign(__appScope, { editModeRouteRenderOptions });
  useEffect(createAppHookCallback3(__appScope), [interactionMode]);
  const smartAlignmentGuideSignature = (guides: SmartAlignmentGuide[]) =>
      guides.map((guide) => `${guide.orientation}:${Math.round(guide.position)}`).join("|");
  Object.assign(__appScope, { smartAlignmentGuideSignature });
  const updateSmartAlignmentGuides = createUpdateSmartAlignmentGuides(__appScope); Object.assign(__appScope, { updateSmartAlignmentGuides });
  viewBoxRef.current = viewBox;
  const setCanvasPanning = createSetCanvasPanning(__appScope); Object.assign(__appScope, { setCanvasPanning });
  const setContextMarqueeSelection = createSetContextMarqueeSelection(__appScope); Object.assign(__appScope, { setContextMarqueeSelection });
  const markGraphicContextMenuHandled = createMarkGraphicContextMenuHandled(__appScope); Object.assign(__appScope, { markGraphicContextMenuHandled });
  const consumeGraphicContextMenuHandled = createConsumeGraphicContextMenuHandled(__appScope); Object.assign(__appScope, { consumeGraphicContextMenuHandled });
  const openGraphicContextMenu = createOpenGraphicContextMenu(__appScope); Object.assign(__appScope, { openGraphicContextMenu });
  const libraryComponentListRefs = useRef<Map<string, HTMLDivElement>>(new Map()); Object.assign(__appScope, { libraryComponentListRefs });
  const libraryComponentLibraryHeaderRefs = useRef<Map<string, HTMLButtonElement>>(new Map()); Object.assign(__appScope, { libraryComponentLibraryHeaderRefs });
  // 图元树虚拟化窗口：每 deviceGroup 维护 [start, end) 可见区间，按可视高度动态滑动
  // 每 deviceGroup 实测 item 平均高度（含 child 列表），供 render 计算 spacer 高度
  const showGlobalMessage = (text: string, type: "success" | "error" | "info" = "info", duration = 2000) => {
    if (globalMessageTimerRef.current) clearTimeout(globalMessageTimerRef.current);
    setGlobalMessage({ text, type });
    globalMessageTimerRef.current = setTimeout(() => setGlobalMessage(null), duration);
  };
  Object.assign(__appScope, { globalMessage, showGlobalMessage });
  const [, startCustomComponentSelectionTransition] = useTransition();
  Object.assign(__appScope, { startCustomComponentSelectionTransition });
  const startMeasurementEditorTableColumnResize = (columnKey: string, defaultWidth: number, event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const resizeHandle = event.currentTarget;
    const pointerId = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(pointerId);
    } catch {
      // Window-level fallback listeners below still guarantee cleanup if capture is unavailable.
    }
    const startX = event.clientX;
    const headerCell = resizeHandle.parentElement;
    const startWidth = measurementEditorColumnWidths[columnKey] ?? headerCell?.getBoundingClientRect().width ?? defaultWidth;
    let handlePointerMove: (moveEvent: globalThis.PointerEvent) => void;
    const finishColumnResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishColumnResize);
      window.removeEventListener("pointercancel", finishColumnResize);
      window.removeEventListener("mouseup", finishColumnResize);
      window.removeEventListener("blur", finishColumnResize);
      window.removeEventListener("contextmenu", finishColumnResize);
      try {
        if (resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore release errors from detached handles or browsers without pointer capture support.
      }
    };
    handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.buttons === 0) {
        finishColumnResize();
        return;
      }
      moveEvent.preventDefault();
      const nextWidth = clampNumber(Math.round(startWidth + moveEvent.clientX - startX), 56, 520);
      setMeasurementEditorColumnWidths((current) => ({ ...current, [columnKey]: nextWidth }));
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishColumnResize, { once: true });
    window.addEventListener("pointercancel", finishColumnResize, { once: true });
    window.addEventListener("mouseup", finishColumnResize, { once: true });
    window.addEventListener("blur", finishColumnResize, { once: true });
    window.addEventListener("contextmenu", finishColumnResize, { once: true });
  };
  Object.assign(__appScope, { measurementEditorColumnWidths, setMeasurementEditorColumnWidths, startMeasurementEditorTableColumnResize });
  const inspectorTopology = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);
  Object.assign(__appScope, { inspectorTopology });
  const setOperationLogText = createSetOperationLogText(__appScope); Object.assign(__appScope, { setOperationLogText });
  // 刷新恢复只还原画布数据，undoStack（未保存清单）未持久化、恢复后为空；
  // 故恢复后视为无未保存操作，避免显示"未保存"标签却弹出空清单
  latestNodesRef.current = nodes;
  latestEdgesRef.current = edges;
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
  const filterSelectionTemplateComponentLibraryByKind = useMemo(
      () => new Map([...DEVICE_LIBRARY, ...customDeviceTemplates].map((template) => [template.kind, filterSelectionTemplateComponentLibraryKey(template)])),
      [customDeviceTemplates]
    );
  Object.assign(__appScope, { filterSelectionTemplateComponentLibraryByKind });
  const filterSelectionComponentLibraryKey = (node: ModelNode) =>
      filterSelectionTemplateComponentLibraryByKind.get(node.kind) ||
      inferESection(node.kind, {}) ||
      inferESection(node.kind, node.params) ||
      String(node.params.component_type || node.params.componentLibrary || node.params.componentType || node.kind);
  Object.assign(__appScope, { filterSelectionComponentLibraryKey });
  const filterSelectionSpecificTypeKey = (node: ModelNode) => node.kind; Object.assign(__appScope, { filterSelectionSpecificTypeKey });
  const filterSelectionItemKey = (node: ModelNode) =>
      `${filterSelectionComponentLibraryKey(node)}::${filterSelectionSpecificTypeKey(node)}`;
  Object.assign(__appScope, { filterSelectionItemKey });
  const filterSelectionTypeOptions = useMemo(createAppHookCallback9(__appScope), [activeLayerNodes, filterSelectionTemplateComponentLibraryByKind, filterSelectionTemplateLabelByKind]);
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
  const previousAutoInspectorSelectionKeyRef = useRef(activeSelectionKey); Object.assign(__appScope, { previousAutoInspectorSelectionKeyRef });
  const activeSelectedEdgeSet = useMemo(() => new Set(displaySelectedEdgeIds), [displaySelectedEdgeIds]); Object.assign(__appScope, { activeSelectedEdgeSet });
  const displaySelectedEdgeKey = useMemo(() => displaySelectedEdgeIds.join("|"), [displaySelectedEdgeIds]); Object.assign(__appScope, { displaySelectedEdgeKey });
  const batchCommonParamRows = useMemo<BatchCommonParamRow[]>(
      createAppHookCallback12(__appScope),
      [activeSelectedNodeIds, customDeviceTemplates, deviceDefinitionOverrides, nodeById]
    );
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
      activeSelectedNodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && !isStaticGraphicNode(node) && measurementGroupsForNode(projectMeasurements, nodeId).length > 0;
      })
    ), [activeSelectedNodeIds, nodeById, projectMeasurements]);
  Object.assign(__appScope, { selectedNodeIdsWithMeasurementGroups });
  const batchCommonMeasurementGroupRows = useMemo<BatchCommonMeasurementGroupRow[]>(createAppHookCallback13(__appScope), [activeSelectedNodeIds, nodeById, projectMeasurements]);
  Object.assign(__appScope, { batchCommonMeasurementGroupRows });
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
      !isStaticGraphicNode(inspectorSelectedNode) &&
      activeSelectedNodeIds.length === 1 &&
      activeSelectedEdgeIds.length === 0
    );
  Object.assign(__appScope, { singleSelectedDeviceForInspector });
  const selectedMeasurementGroups = useMemo(
      () => (inspectorSelectedNode && !isStaticGraphicNode(inspectorSelectedNode) ? measurementGroupsForNode(projectMeasurements, inspectorSelectedNode.id) : []),
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
  const measurementGroupBackgroundColor = (group: MeasurementGroup) => group.backgroundColor ?? DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR; Object.assign(__appScope, { measurementGroupBackgroundColor });
  const measurementGroupBorderColor = (group: MeasurementGroup) => group.borderColor ?? DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR; Object.assign(__appScope, { measurementGroupBorderColor });
  const measurementGroupBorderWidth = (group: MeasurementGroup) =>
      (group.borderStyle ?? DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE) === "none"
        ? 0
        : clampNumber(Number(group.borderWidth ?? 1), 0, 12);
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
  const filteredProjectSchemes = useMemo<SavedSchemeRecord[]>(createAppHookCallback14(__appScope), [projectSearchNeedle, schemes]); Object.assign(__appScope, { filteredProjectSchemes });
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
      suppressNextGraphDirtyRef.current += 1;
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
  const groupedCategoryLibrary = useMemo(() => groupDeviceTemplatesByCategoryLibrary(libraryTemplates), [libraryTemplates]); Object.assign(__appScope, { groupedCategoryLibrary });
  const groupedCategoryLibraryByComponentLibrary = useMemo(() => groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(libraryTemplates, customComponentLibraries), [customComponentLibraries, libraryTemplates]); Object.assign(__appScope, { groupedCategoryLibraryByComponentLibrary });
  const librarySearchNeedle = normalizeLibrarySearchText(librarySearchQuery); Object.assign(__appScope, { librarySearchNeedle });
  const filteredCategoryLibraryByComponentLibrary = useMemo(
      () => filterCategoryLibraryComponentLibraryGroups(groupedCategoryLibraryByComponentLibrary, librarySearchNeedle, customComponentLibraries),
      [customComponentLibraries, groupedCategoryLibraryByComponentLibrary, librarySearchNeedle]
    );
  Object.assign(__appScope, { filteredCategoryLibraryByComponentLibrary });
  const customComponentTreeSearchNeedle = normalizeLibrarySearchText(customComponentTreeSearchQuery); Object.assign(__appScope, { customComponentTreeSearchNeedle });
  const filteredCustomComponentTreeByComponentLibrary = useMemo(
      () => filterCategoryLibraryComponentLibraryGroups(groupedCategoryLibraryByComponentLibrary, customComponentTreeSearchNeedle, customComponentLibraries),
      [customComponentLibraries, customComponentTreeSearchNeedle, groupedCategoryLibraryByComponentLibrary]
    );
  Object.assign(__appScope, { filteredCustomComponentTreeByComponentLibrary });
  const deviceDefinitionSearchNeedle = normalizeLibrarySearchText(deviceDefinitionSearchQuery); Object.assign(__appScope, { deviceDefinitionSearchNeedle });
  const filteredDeviceDefinitionByComponentLibrary = useMemo(
      () => filterCategoryLibraryComponentLibraryGroups(groupedCategoryLibraryByComponentLibrary, deviceDefinitionSearchNeedle, customComponentLibraries),
      [customComponentLibraries, deviceDefinitionSearchNeedle, groupedCategoryLibraryByComponentLibrary]
    );
  Object.assign(__appScope, { filteredDeviceDefinitionByComponentLibrary });
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
  const categoryLibraries = useMemo<CategoryLibrary[]>(
      () => Array.from(new Set([...DEFAULT_CATEGORY_LIBRARIES, ...customCategoryLibraries, ...libraryTemplates.map((item) => normalizeCategoryLibraryName(item.categoryLibrary))])),
      [customCategoryLibraries, libraryTemplates]
    );
  Object.assign(__appScope, { categoryLibraries });
  const displayedCategoryLibraries = useMemo(
      () => librarySearchNeedle
        ? categoryLibraries.filter((group) => (filteredCategoryLibraryByComponentLibrary[group] ?? []).length > 0)
        : categoryLibraries,
      [categoryLibraries, filteredCategoryLibraryByComponentLibrary, librarySearchNeedle]
    );
  Object.assign(__appScope, { displayedCategoryLibraries });
  const displayedCustomComponentTreeLibraries = useMemo(
      () => customComponentTreeSearchNeedle
        ? categoryLibraries.filter((group) => (filteredCustomComponentTreeByComponentLibrary[group] ?? []).length > 0)
        : categoryLibraries,
      [categoryLibraries, customComponentTreeSearchNeedle, filteredCustomComponentTreeByComponentLibrary]
    );
  Object.assign(__appScope, { displayedCustomComponentTreeLibraries });
  const displayedDeviceDefinitionLibraries = useMemo(
      () => deviceDefinitionSearchNeedle
        ? categoryLibraries.filter((group) => (filteredDeviceDefinitionByComponentLibrary[group] ?? []).length > 0)
        : categoryLibraries,
      [categoryLibraries, deviceDefinitionSearchNeedle, filteredDeviceDefinitionByComponentLibrary]
    );
  Object.assign(__appScope, { displayedDeviceDefinitionLibraries });
  useEffect(createAppHookCallback17(__appScope), [libraryFlyoutPositions]);
  const libraryComponentListRefKey = (layout: "inline" | "flyout", componentLibraryKey: string) => `${layout}:${componentLibraryKey}`; Object.assign(__appScope, { libraryComponentListRefKey });
  const setLibraryComponentListRef = (key: string) => (element: HTMLDivElement | null) => {
      if (element) {
        libraryComponentListRefs.current.set(key, element);
      } else {
        libraryComponentListRefs.current.delete(key);
      }
    };
  Object.assign(__appScope, { setLibraryComponentListRef });
  const setLibraryComponentLibraryHeaderRef = (key: string) => (element: HTMLButtonElement | null) => {
      if (element) {
        libraryComponentLibraryHeaderRefs.current.set(key, element);
      } else {
        libraryComponentLibraryHeaderRefs.current.delete(key);
      }
    };
  Object.assign(__appScope, { setLibraryComponentLibraryHeaderRef });
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
      displayedCategoryLibraries,
      displayedGraphTemplateTypes,
      expandedCategoryLibraryComponentLibraries,
      filteredCategoryLibraryByComponentLibrary,
      filteredGroupedGraphTemplates,
      hoveredCategoryLibraryComponentLibrary,
      hoveredGraphTemplateType,
      leftPanelTab,
      librarySearchNeedle,
      templateLibraryDisplayMode,
      templateLibrarySearchNeedle
    ]);
  useEffect(createAppHookCallback19(__appScope), [componentLibraryDisplayMode, leftPanelTab, librarySearchNeedle, templateLibraryDisplayMode, templateLibrarySearchNeedle]);
  useEffect(createAppHookCallback20(__appScope), [componentLibraryDisplayMode, hoveredCategoryLibraryComponentLibrary, hoveredGraphTemplateType, leftPanelTab, templateLibraryDisplayMode]);
  const toggleCategoryLibrary = createToggleCategoryLibrary(__appScope); Object.assign(__appScope, { toggleCategoryLibrary });
  const toggleCategoryLibraryComponentLibrary = createToggleCategoryLibraryComponentLibrary(__appScope); Object.assign(__appScope, { toggleCategoryLibraryComponentLibrary });
  const selectableCategoryLibraries = useMemo<CategoryLibrary[]>(
      () => selectableCategoryLibraryList(categoryLibraries, customCategoryLibraries),
      [customCategoryLibraries, categoryLibraries]
    );
  Object.assign(__appScope, { selectableCategoryLibraries });
  const componentLibraryOptionsByCategoryLibrary = useMemo<Record<string, string[]>>(createAppHookCallback21(__appScope), [customComponentLibraries, categoryLibraries, libraryTemplates]);
  Object.assign(__appScope, { componentLibraryOptionsByCategoryLibrary });
  const componentLibraryOptions = useMemo(
      () => Array.from(new Set([
        ...E_SECTION_OPTIONS,
        ...customComponentLibraries.map((item) => item.name),
        ...libraryTemplates.filter((template) => template.custom).map(resolveTemplateComponentLibrary).filter(Boolean)
      ])),
      [customComponentLibraries, libraryTemplates]
    );
  Object.assign(__appScope, { componentLibraryOptions });
  const currentCategoryLibraryComponentLibraryOptions = useMemo(createAppHookCallback22(__appScope), [customDeviceDraft.componentLibrary, customDeviceDraft.categoryLibraryName, componentLibraryOptionsByCategoryLibrary]);
  Object.assign(__appScope, { currentCategoryLibraryComponentLibraryOptions });
  const selectedDefinitionTemplate = selectedDefinitionKind ? libraryTemplateByKind.get(selectedDefinitionKind) ?? libraryTemplates[0] : libraryTemplates[0]; Object.assign(__appScope, { selectedDefinitionTemplate });
  const selectedCustomComponentTemplate =
      customComponentTreeSelection.kind === "component"
        ? libraryTemplateByKind.get(customComponentTreeSelection.templateKind)
        : undefined;
  Object.assign(__appScope, { selectedCustomComponentTemplate });
  const definitionCategoryLibraryComponentLibraryOptions = useMemo(createAppHookCallback23(__appScope), [customDeviceDraft.categoryLibraryName, definitionDraftSection, componentLibraryOptionsByCategoryLibrary, selectedDefinitionTemplate?.categoryLibrary]);
  Object.assign(__appScope, { definitionCategoryLibraryComponentLibraryOptions });
  const defaultComponentLibraryForCategoryLibrary = (categoryLibraryName: string) => (
      componentLibraryOptionsByCategoryLibrary[normalizeCategoryLibraryName(categoryLibraryName)]?.[0] ?? fallbackComponentLibraryForCategoryLibrary(categoryLibraryName)
    );
  Object.assign(__appScope, { defaultComponentLibraryForCategoryLibrary });
  const selectedDefinitionBaseTemplate = selectedDefinitionTemplate ? baseLibraryTemplateByKind.get(selectedDefinitionTemplate.kind) : undefined; Object.assign(__appScope, { selectedDefinitionBaseTemplate });
  const selectedDefinitionTerminalAssociations = selectedDefinitionTemplate
      ? describeContainerTerminalAssociations(selectedDefinitionTemplate)
      : [];
  Object.assign(__appScope, { selectedDefinitionTerminalAssociations });
  const selectedDefinitionMeasurementPositionDefinitions = selectedDefinitionTemplate
      ? buildMeasurementProfilePositionDefinitions({
          source: selectedDefinitionTemplate,
          parameterDefinitions: definitionDraftRows,
          libraryTemplates
        })
      : [];
  Object.assign(__appScope, { selectedDefinitionMeasurementPositionDefinitions });
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
          canvasBackgroundImageFit,
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
      canvasBackgroundImageFit,
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
      canvasBackgroundImageFit,
      backgroundProjectId,
      backgroundLayerIds,
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      modelType,
      subcontrolarea,
      substation,
      feeder,
      taiqu,
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
      canvasBackgroundImageFit,
      canvasHeight,
      canvasWidth,
      currentUnit,
      deviceIndexCounters,
      edges,
      feeder,
      groups,
      layers,
      modelType,
      nodes,
      projectMeasurements,
      powerBaseValue,
      powerUnit,
      projectName,
      subcontrolarea,
      substation,
      taiqu,
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
  const elementTreeItemChildren = createElementTreeItemChildren(__appScope); Object.assign(__appScope, { elementTreeItemChildren });
}
