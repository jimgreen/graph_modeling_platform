// @ts-nocheck
// 从 App.tsx 第 3053-6217 行提取
import { useMemo, useEffect, useCallback, useLayoutEffect } from "react";
import type { LibraryPackageScope } from "./appPersistenceLibraryExport";
const LIBRARY_PACKAGE_DIALOG_SCOPES: LibraryPackageScope[] = [
  "all",
  "component-library",
  "measurement",
  "device-library",
  "template-library",
  "icon-library"
];
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
  enumSelectOptionsWithCurrentValue,
  invalidEnumOptionLabel,
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
  INITIAL_MEASUREMENT_CONFIG,
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
import { customParamId, deviceDefinitionRowId, stateDraftRowId, DEFAULT_STATE_ICON_DRAWING_FRAME, DEFAULT_STATE_PAGE_ID, isDefaultStatePageId, createStateDraftRow, createStateDraftRowFromDefaultVisual, defaultStateDraftRow, createDefinitionStateDraftRows, normalizeStateDraftRows, validateStateDraftRows, stateVisualFromDraftRow, activeStateDraftRow, normalizeStatePageId, stateDraftImageValue, stateIconDrawingDraftSourceImage, stateIconDrawingInlineNeedsDraftReload, stateIconDrawingInlineCanPersistDraft, stateVisualShapeLabel, generateStateVisualShapeImage, stateIconDrawingElementId, visibleStateIconColor, createStateIconDrawingElement, createImportedStateIconElement, svgSourceFromDataUrl, parseStateIconSvgSource, stateIconSvgElementSource, parseSvgStyleAttribute, stateIconSvgReactAttributes, stateIconSvgNodeChildren, stateIconSvgNodeToReact, stateIconSvgSourceToReactNodes, createEditableStateIconElementsFromSvgSource, createStateIconDrawingInitialElements, svgSourceToDataUrl, stateIconDrawingSvgElementMarkup, stateIconDrawingElementMarkup, stateIconDrawingToImage, stateIconDrawingToPersistedImage, stateIconDrawingFrameRect, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, type StateVisualShapeKind, type StateIconDrawingElement, type DeviceDefinitionStateDraftRow } from "../stateIconDrawing";
import { createMeasurementFieldParameterDefinition } from "../measurementDefinitionTypes";
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

export function useRenderBatch(__appScope: Record<string, any>) {
  const {
    activeImageFolderId,
    activeLayerEdgeIdSet,
    activeLayerEdges,
    activeLayerGroups,
    activeLayerId,
    activeLayerNodeIdSet,
    activeLayerNodes,
    activeProjectKey,
    activeSchemeKey,
    activeSelectedEdgeIds,
    activeSelectedEdgeSet,
    activeSelectedNodeIds,
    activeVoltageBaseTerminalKey,
    allowAutoExpandCanvas,
    applyCanvasBounds,
    backendMeasurementConfigLoadedRef,
    backgroundLayerIds,
    backgroundPageRenderReady,
    backgroundProjectId,
    backgroundProjectRecord,
    batchCommonGraphicParamRows,
    batchCommonMeasurementGroupRows,
    batchCommonModelParamRows,
    batchCommonPropertyRowCount,
    canAddTemplateFromSelection,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    canvasBackgroundImageFit,
    canvasBounds,
    canvasCenterRequest,
    canvasClipboard,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasHeight,
    canvasRenderBounds,
    canvasResizeDrag,
    canvasScrollScale,
    canvasSelectionScope,
    canvasVisibleViewBox,
    canvasWidth,
    clearLibraryFlyoutCloseTimer,
    collapsedExpandedModeCategoryLibraries,
    collapsedExpandedModeComponentLibraries,
    colorDisplayMode,
    colorPalette,
    componentLibraryDisplayMode,
    connectDropReady,
    connectPreviewDomRef,
    connectSource,
    connectTargetPoint,
    contextMenu,
    currentUnit,
    customCategoryLibraries,
    customComponentLibraries,
    customDeviceDefinitionMode,
    customDeviceDialogOpen,
    customDeviceDialogRef,
    customDeviceDialogView,
    customDeviceDraft,
    customDeviceStatePageId,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    definitionStateDraftRows,
    definitionStatePageId,
    definitionVisualDraft,
    deviceDefinitionDialogOpen,
    deviceDefinitionDialogRef,
    deviceDefinitionOverrides,
    deviceDefinitionView,
    deviceIndexCounters,
    deviceLibraryDialogDrag,
    deviceLibraryDialogResize,
    displaySelectedEdgeIds,
    displaySelectedNodeIds,
    displayedCategoryLibraries,
    displayedGraphTemplateTypes,
    dragGhostEdgeIdSet,
    dragGhostRoutableLineNodeIdSet,
    dragOverlayEdgeIdSet,
    dragging,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    eDeviceDefinitionTableIds,
    eDeviceDefinitionTemplateFields,
    edgeById,
    edges,
    editHotInteractionActive,
    editingCustomDeviceKind,
    expandedCategoryLibraries,
    expandedCategoryLibraryComponentLibraries,
    expandedGraphTemplateTypes,
    filterSelectionTypeKeys,
    filteredCategoryLibraryByComponentLibrary,
    filteredGroupedGraphTemplates,
    focusedGroupedNodeMovesGroup,
    graphStore,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewNodeIdSet,
    groups,
    hasUnsavedChanges,
    hideLibraryFlyout,
    hoveredCategoryLibrary,
    hoveredCategoryLibraryComponentLibrary,
    hoveredGraphTemplateType,
    iconLibraryPicker,
    imageAssetContextMenu,
    imageAssetList,
    imageAssets,
    imageFolders,
    imagePickerSourceFilter,
    imageTarget,
    includeMeasurementGroupBounds,
    initialCanvasDetailHydrationLimit,
    initialCanvasLodActive,
    inspectorSelectedNode,
    inspectorTopologyErrors,
    isBrowseMode,
    isEditMode,
    isObjectRecord,
    isStaticButtonEnabledForNode,
    lastPersistedMeasurementConfigPayloadRef,
    layerAssignmentTargetId,
    layers,
    leftPanelMode,
    leftPanelRef,
    leftPanelTab,
    leftPanelWidth,
    libraryComponentListRefKey,
    libraryFlyoutPositions,
    libraryPackageDialogMode,
    libraryPackageDialogScope,
    libraryPackageImportInputRef,
    libraryPackageImportScopeRef,
    libraryPlacement,
    libraryPreviewByKind,
    libraryScrollRef,
    librarySearchNeedle,
    librarySearchQuery,
    libraryTemplateByKind,
    libraryTemplates,
    manualPathDrag,
    marquee,
    measurementConfig,
    measurementConfigDialogOpen,
    measurementConfigDialogRef,
    measurementConfigDraft,
    measurementConfigDraftRef,
    measurementEditorDialogRef,
    measurementTypeById,
    minimapSamplingReady,
    mode,
    modifierSelectionPress,
    multiNodeDragging,
    nodeById,
    nodeDoubleClickDialogDrag,
    nodeDoubleClickDialogResize,
    nodeDoubleClickDraft,
    nodeDragMoveFrameRef,
    nodeForegroundImage,
    nodeImage,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodes,
    panning,
    pendingNodeDragMoveRef,
    points,
    powerBaseValue,
    powerUnit,
    projectById,
    projectMeasurements,
    projectName,
    projectPanelResize,
    recordClipboard,
    rewiring,
    rightPanelMode,
    rightPanelRef,
    rightPanelVisible,
    rightPanelWidth,
    routableLineEndpointDrag,
    subcontrolarea,
    substation,
    feeder,
    modelType,
    taiqu,
    routableLinePlacement,
    routedEdgeById,
    routedEdges,
    safeFilePart,
    sameConnectTarget,
    sameOptionalPoint,
    sameOptionalPointList,
    saveRequired,
    scheduleGraphTemplateFlyoutClose,
    scheduleLibraryFlyoutClose,
    schemes,
    selectedCustomComponentTemplate,
    selectedDefinitionKind,
    selectedDefinitionTemplate,
    selectedEdge,
    selectedEdgeId,
    selectedEdgeIds,
    selectedLayoutUnits,
    selectedNode,
    selectedNodeCount,
    selectedNodeId,
    selectedNodeIdSet,
    selectedNodeIds,
    selectedNodeIdsWithMeasurementGroups,
    selectedProjectId,
    selectedProjectIds,
    selectedRoutedEdge,
    selectedSchemeId,
    selectedSchemeIds,
    selectedTransformGroupUnit,
    serializeSchemeRecordForFile,
    setActiveImageFolderId,
    setCollapsedExpandedModeCategoryLibraries,
    setComponentLibraryDisplayMode,
    setConnectSource,
    setContextMenu,
    setCustomCategoryLibraries,
    setCustomComponentLibraries,
    setCustomDeviceDraft,
    setCustomDeviceTemplates,
    setCustomGraphTemplateTypes,
    setCustomGraphTemplates,
    setDefinitionVisualDraft,
    setDeviceDefinitionOverrides,
    setEDeviceDefinitionClassExportEnabled,
    setEDeviceDefinitionFieldOrder,
    setEDeviceDefinitionLabels,
    setEDeviceDefinitionTableIds,
    setEDeviceDefinitionTemplateFields,
    setExpandedCategoryLibraries,
    setExpandedGraphTemplateTypes,
    setGraphArrays,
    setHoveredCategoryLibrary,
    setHoveredCategoryLibraryComponentLibrary,
    setHoveredGraphTemplateType,
    setIconLibraryPicker,
    setImageAssetContextMenu,
    setImageAssetList,
    setImageAssets,
    setImageFolders,
    setLibraryComponentLibraryHeaderRef,
    setLibraryComponentListRef,
    setLibraryPackageDialogMode,
    setLibraryPackageDialogScope,
    setLibrarySearchQuery,
    setMeasurementConfig,
    setMeasurementConfigDraft,
    setMeasurementConfigSaveStatus,
    setNodeDoubleClickDraft,
    setProjectMenu,
    setStateIconDrawingContextMenu,
    setStateIconDrawingDialog,
    setTemplateLibraryDisplayMode,
    setTemplateLibrarySearchQuery,
    setTemplateMenu,
    shiftCachedRoutesForCanvasOrigin,
    shouldDeferSingleNodeTerminalReconciliation,
    shouldFinalizeMovedNodeEdgesSynchronously,
    shouldPatchRouteCacheForHighFanoutMove,
    sidePanelResize,
    stateIconDrawingDialog,
    stateIconDrawingHistoryRef,
    stateIconDrawingInitialFrame,
    stateIconDrawingInitialImageRef,
    staticDrawing,
    statusbarHeight,
    statusbarResize,
    templateLibraryDisplayMode,
    templateLibrarySearchNeedle,
    templateLibrarySearchQuery,
    terminalPress,
    terminalPressPreviewEdgeIdSet,
    timestampForLibraryPackageFilename,
    toggleCategoryLibrary,
    toggleCategoryLibraryComponentLibrary,
    topology,
    topologyErrors,
    topologyStatus,
    topologyWarningDisplayMessage,
    topologyWarningPanelClosed,
    topologyWarningPanelDrag,
    topologyWarningPanelHeight,
    topologyWarningPanelPosition,
    topologyWarningPanelResize,
    topologyWarningPanelWidth,
    transformDrag,
    translateEdgeBy,
    translateNodeBy,
    userCustomizationSnapshotView,
    viewBox,
    viewportNodes,
    viewportRoutedEdges,
    visibleNodeById,
    visibleNodes,
    voltageBaseClearDialogOpen,
    voltageBaseSetDialogOpen,
    voltageBaseSetMode,
    voltageBaseSetValue,
    voltageBaseTerminalValues,
    voltageUnit
  } = __appScope;
  const refreshSchemesFromBackendDirectory = createRefreshSchemesFromBackendDirectory(__appScope);
  const handleBackendSchemeMutationFailure = createHandleBackendSchemeMutationFailure(__appScope);
  const saveSchemeTreeToBackend = createSaveSchemeTreeToBackend(__appScope);
  const persistSchemeTreeToBackend = createPersistSchemeTreeToBackend(__appScope);
  const replaceSchemeTreeInBackend = createReplaceSchemeTreeInBackend(__appScope);
  Object.assign(__appScope, { refreshSchemesFromBackendDirectory, handleBackendSchemeMutationFailure, saveSchemeTreeToBackend, persistSchemeTreeToBackend, replaceSchemeTreeInBackend });
  useEffect(createAppHookCallback77(__appScope), []);
  useEffect(createAppHookCallback78(__appScope), []);
  useEffect(createAppHookCallback79(__appScope), []);
  useEffect(createAppHookCallback80(__appScope), []);
  useEffect(createAppHookCallback81(__appScope), [schemes]);
  useEffect(createAppHookCallback82(__appScope), [customDeviceTemplates, customCategoryLibraries, customComponentLibraries, deviceDefinitionOverrides, eDeviceDefinitionLabels, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, customGraphTemplateTypes, customGraphTemplates]);
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
  const deleteImageAssetFromContextMenu = async () => {
      const menu = imageAssetContextMenu;
      if (!menu) {
        return;
      }
      const asset = imageAssetList.find((item) => item.id === menu.assetId);
      const assetName = asset?.name || asset?.filename || menu.assetId;
      if (!await showGlobalConfirm(`确定删除”${assetName}”吗？如果该图片已被图元引用，删除后对应图元可能无法继续显示该图片。`)) {
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
          showGlobalMessage(error instanceof Error ? error.message : "删除图片资源失败。");
        }
      })();
    };
  Object.assign(__appScope, { deleteImageAssetFromContextMenu });
  useEffect(createAppHookCallback84(__appScope), [activeImageFolderId, imageTarget]);
  // 直接在本地计算 imagePickerUsesIconSourcesCatalog，避免依赖 __appScope 的重建
  const imagePickerUsesIconSources = imageTarget?.kind === "canvasIcon" || (imageTarget?.kind === "stateIconDrawing" && imageTarget?.sourceMode !== "catalogOnly");
  const imagePickerActiveSourceFilter = imagePickerUsesIconSources
    ? imageTarget?.sourceMode === "externalOnly"
      ? "external"
      : imageTarget?.sourceMode === "builtinOnly"
        ? "builtin"
        : imageTarget?.sourceMode === "catalogOnly"
          ? "catalog"
          : imagePickerSourceFilter === "external" ? "external" : imagePickerSourceFilter === "catalog" ? "catalog" : "builtin"
    : "builtin";
  const imagePickerUsesIconSourcesCatalog = imagePickerUsesIconSources && imagePickerActiveSourceFilter === "catalog";
  const iconLibraryPickerOpen =
    (imageTarget?.kind === "stateIconDrawing" && imageTarget.sourceMode === "catalogOnly") ||
    (imagePickerUsesLibraryTabs(imageTarget) && imagePickerSourceFilter === "icon-library") ||
    imagePickerUsesIconSourcesCatalog;
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
      canvasBackgroundImageFit,
      backgroundProjectId,
      backgroundLayerIds: [...backgroundLayerIds],
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      modelType,
      subcontrolarea,
      substation,
      feeder,
      taiqu,
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
      backgroundColor: DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
      borderColor: DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
      borderStyle: DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
      borderWidth: DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH,
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
      measurementProfileItemsForNodePosition(node, measurementConfig, terminalId, libraryTemplates);
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
  useEffect(createAppHookCallback110(__appScope), [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, canvasBounds, canvasClipboard, canvasSelectionScope, connectSource, customDeviceDefinitionMode, customDeviceDialogOpen, customDeviceDraft, deviceIndexCounters, displaySelectedEdgeIds, displaySelectedNodeIds, edges, editingCustomDeviceKind, hasUnsavedChanges, hoveredCategoryLibraryComponentLibrary, isEditMode, libraryPlacement, measurementConfigDraft, nodes, projectById, projectName, recordClipboard, routedEdgeById, saveRequired, schemes, selectedCustomComponentTemplate, selectedDefinitionKind, selectedDefinitionTemplate, selectedEdgeId, selectedEdgeIds, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, staticDrawing, topologyErrors, viewBox]);
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
      canvasBackgroundImageFit,
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
      previous.canvasBackgroundImageFit !== next.canvasBackgroundImageFit ||
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
  useEffect(createAppHookCallback120(__appScope), [activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageFit, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectMeasurements, projectName, voltageUnit]);
  const canAdjustSelectedDisplayLayer = isEditMode && activeSelectedNodeIds.length > 0; Object.assign(__appScope, { canAdjustSelectedDisplayLayer });
  const adjustSelectedDisplayLayer = createAdjustSelectedDisplayLayer(__appScope); Object.assign(__appScope, { adjustSelectedDisplayLayer });
  const clearTransientSelectionState = createClearTransientSelectionState(__appScope); Object.assign(__appScope, { clearTransientSelectionState });
  const writeOperationLog = createWriteOperationLog(__appScope); Object.assign(__appScope, { writeOperationLog });
  const requireEditMode = createRequireEditMode(__appScope); Object.assign(__appScope, { requireEditMode });
  const persistDeviceLibraryChange = createPersistDeviceLibraryChange(__appScope); Object.assign(__appScope, { persistDeviceLibraryChange });
  const persistTemplateLibraryChange = createPersistTemplateLibraryChange(__appScope); Object.assign(__appScope, { persistTemplateLibraryChange });
  const libraryPackageScopeLabels: Record<LibraryPackageScope, string> = {
    measurement: "量测定义",
    "device-library": "元件库",
    "template-library": "模板库",
    "icon-library": "图标库",
    "component-library": "元件相关库",
    all: "全部库"
  };
  Object.assign(__appScope, { libraryPackageScopeLabels });
  const libraryPackageDialogScopeOptions = LIBRARY_PACKAGE_DIALOG_SCOPES.map((scope) => ({
    scope,
    label: libraryPackageScopeLabels[scope] ?? scope
  }));
  Object.assign(__appScope, { libraryPackageDialogScopeOptions });
  const libraryPackageScopeMatches = (packageScope: LibraryPackageScope, targetScope: LibraryPackageScope) =>
    packageScope === targetScope || packageScope === "all";
  Object.assign(__appScope, { libraryPackageScopeMatches });
  const currentDeviceLibraryPersistencePayload = () => normalizeDeviceLibraryPersistencePayload({
    customDeviceTemplates,
    customCategoryLibraries,
    customComponentLibraries,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds,
    customGraphTemplateTypes,
    customGraphTemplates
  });
  Object.assign(__appScope, { currentDeviceLibraryPersistencePayload });
  Object.assign(__appScope, { timestampForLibraryPackageFilename });
  const userIconLibraryAssets = async () => {
    const folders = await fetchBackendImageFolders();
    const assets = (await fetchAllBackendImages()).filter((asset) =>
      String(asset.folderId ?? "") !== "builtin-shared-icons" &&
      !String(asset.id ?? "").startsWith("builtin-shared-icon-")
    );
    const exportedAssets = [];
    for (const asset of assets) {
      exportedAssets.push({
        ...asset,
        dataUrl: await fetchBackendImageDataUrl(asset)
      });
    }
    return normalizeIconLibraryPersistencePayload({ folders, assets: exportedAssets });
  };
  Object.assign(__appScope, { userIconLibraryAssets });
  const referencedUserAssetIds = useMemo(() => collectReferencedUserAssetIds({
    nodes,
    projectMeasurements,
    schemes,
    deviceLibrary: currentDeviceLibraryPersistencePayload()
  }), [
    customCategoryLibraries,
    customComponentLibraries,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    nodes,
    projectMeasurements,
    schemes
  ]);
  Object.assign(__appScope, { referencedUserAssetIds });
  const userCustomizationInventory = useMemo(() => buildUserCustomizationInventory(
    userCustomizationSnapshotView ?? {
      deviceLibrary: currentDeviceLibraryPersistencePayload(),
      measurementConfig,
      colorConfig: { colorDisplayMode, colorPalette },
      imageLibrary: { folders: imageFolders, assets: [] }
    },
    DEVICE_LIBRARY,
    referencedUserAssetIds
  ), [
    colorDisplayMode,
    colorPalette,
    customCategoryLibraries,
    customComponentLibraries,
    customDeviceTemplates,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    imageFolders,
    measurementConfig,
    referencedUserAssetIds,
    userCustomizationSnapshotView
  ]);
  Object.assign(__appScope, { userCustomizationInventory });
  const captureUserCustomizationSnapshot = createCaptureUserCustomizationSnapshot(__appScope);
  Object.assign(__appScope, { captureUserCustomizationSnapshot });
  const persistUserCustomizationSnapshot = createPersistUserCustomizationSnapshot(__appScope);
  Object.assign(__appScope, { persistUserCustomizationSnapshot });
  const applyUserCustomizationSnapshotToState = createApplyUserCustomizationSnapshotToState(__appScope);
  Object.assign(__appScope, { applyUserCustomizationSnapshotToState });
  const reconcileOpenModelAfterCustomizationChange = createReconcileOpenModelAfterCustomizationChange(__appScope);
  Object.assign(__appScope, { reconcileOpenModelAfterCustomizationChange });
  const refreshUserCustomizationManager = createRefreshUserCustomizationManager(__appScope);
  Object.assign(__appScope, { refreshUserCustomizationManager });
  const saveUserCustomizationSnapshotFile = createSaveUserCustomizationSnapshotFile(__appScope);
  Object.assign(__appScope, { saveUserCustomizationSnapshotFile });
  const applyUserCustomizationSnapshot = createApplyUserCustomizationSnapshot(__appScope);
  Object.assign(__appScope, { applyUserCustomizationSnapshot });
  const exportAllUserCustomizations = createExportAllUserCustomizations(__appScope);
  Object.assign(__appScope, { exportAllUserCustomizations });
  const openUserCustomizationManager = createOpenUserCustomizationManager(__appScope);
  Object.assign(__appScope, { openUserCustomizationManager });
  const closeUserCustomizationManager = createCloseUserCustomizationManager(__appScope);
  Object.assign(__appScope, { closeUserCustomizationManager });
  const openUserCustomizationImportFilePicker = createOpenUserCustomizationImportFilePicker(__appScope);
  Object.assign(__appScope, { openUserCustomizationImportFilePicker });
  const importUserCustomizationFile = createImportUserCustomizationFile(__appScope);
  Object.assign(__appScope, { importUserCustomizationFile });
  const changePendingUserCustomizationImportMode = createChangePendingUserCustomizationImportMode(__appScope);
  Object.assign(__appScope, { changePendingUserCustomizationImportMode });
  const confirmUserCustomizationImport = createConfirmUserCustomizationImport(__appScope);
  Object.assign(__appScope, { confirmUserCustomizationImport });
  const cancelPendingUserCustomizationImport = createCancelPendingUserCustomizationImport(__appScope);
  Object.assign(__appScope, { cancelPendingUserCustomizationImport });
  const restoreUserCustomizations = createRestoreUserCustomizations(__appScope);
  Object.assign(__appScope, { restoreUserCustomizations });
  const exportLibraryPackage = async (scope: LibraryPackageScope) => {
    try {
      flushMeasurementConfigDialogDraftInputs?.();
      const measurementConfigForExport = normalizeMeasurementConfig(measurementConfigDraftRef.current ?? measurementConfigDraft ?? measurementConfig);
      const packagePayload = createLibraryPackage({
        scope,
        measurementConfig: measurementConfigForExport,
        deviceLibrary: currentDeviceLibraryPersistencePayload(),
      iconLibrary: scope === "icon-library" || scope === "component-library" || scope === "all" ? await userIconLibraryAssets() : undefined
      });
      const label = libraryPackageScopeLabels[scope] ?? "库";
      const saved = await saveTextFile({
        filename: `${safeFilePart(label)}-${timestampForLibraryPackageFilename()}.json`,
        text: JSON.stringify(packagePayload, null, 2),
        mime: "application/json",
        description: "图形建模平台库文件",
        extensions: [".json"]
      });
      if (saved) {
        writeOperationLog(`导出${label}`);
        if (scope === "device-library") {
          writeOperationLog("元件库导出不包含图标库；若元件引用了自定义图标，请单独导出图标库。");
        }
      }
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "导出库文件失败。");
    }
  };
  Object.assign(__appScope, { exportLibraryPackage });
  const openLibraryPackageImportFilePicker = (scope: LibraryPackageScope) => {
    if (!requireEditMode(`导入${libraryPackageScopeLabels[scope] ?? "库"}`)) {
      return;
    }
    libraryPackageImportScopeRef.current = scope;
    if (libraryPackageImportInputRef.current) {
      libraryPackageImportInputRef.current.value = "";
      libraryPackageImportInputRef.current.click();
    }
  };
  Object.assign(__appScope, { openLibraryPackageImportFilePicker });
  const openLibraryPackageDialog = (scope: LibraryPackageScope = "all") => {
    setLibraryPackageDialogScope(scope);
    setLibraryPackageDialogMode("export");
    setLibraryPackageDialogOpen(true);
  };
  Object.assign(__appScope, { openLibraryPackageDialog });
  const closeLibraryPackageDialog = () => setLibraryPackageDialogOpen(false);
  Object.assign(__appScope, { closeLibraryPackageDialog });
  const componentLibraryImportMessage = "当前元件、量测定义、图标和设备定义会被导入文件中的对应配置覆盖；模板库不会变更。";
  Object.assign(__appScope, { componentLibraryImportMessage });
  const applyImportedMeasurementLibrary = async (packagePayload: LibraryPackagePayload) => {
    if (!packagePayload.measurementConfig) {
      throw new Error("导入文件中没有量测定义。");
    }
    const normalized = normalizeMeasurementConfig(packagePayload.measurementConfig);
    const payload = serializeMeasurementConfigForStorage(normalized);
    writeMeasurementConfig(normalized);
    setMeasurementConfig(normalized);
    measurementConfigDraftRef.current = measurementConfigDialogOpen ? normalized : null;
    setMeasurementConfigDraft(measurementConfigDialogOpen ? normalized : null);
    setMeasurementConfigSaveStatus("saving");
    lastPersistedMeasurementConfigPayloadRef.current = payload;
    try {
      await saveBackendMeasurementConfigPayload(payload);
      backendMeasurementConfigLoadedRef.current = true;
      setMeasurementConfigSaveStatus("saved");
    } catch {
      setMeasurementConfigSaveStatus("error");
      throw new Error("量测定义已导入到本地，但保存到后台失败，请检查后台服务。");
    }
  };
  Object.assign(__appScope, { applyImportedMeasurementLibrary });
  const applyImportedDeviceOrTemplateLibrary = (packagePayload: LibraryPackagePayload, targetScope: LibraryPackageScope) => {
    if (!packagePayload.deviceLibrary) {
      throw new Error(`导入文件中没有${libraryPackageScopeLabels[targetScope] ?? "库"}数据。`);
    }
    const next = deviceLibraryPayloadForPackageScope(
      currentDeviceLibraryPersistencePayload(),
      packagePayload.deviceLibrary,
      targetScope
    );
    setCustomDeviceTemplates(next.customDeviceTemplates);
    setCustomCategoryLibraries(next.customCategoryLibraries);
    setCustomComponentLibraries(next.customComponentLibraries);
    setDeviceDefinitionOverrides(next.deviceDefinitionOverrides);
    setEDeviceDefinitionLabels(next.eDeviceDefinitionLabels ?? {});
    setEDeviceDefinitionClassExportEnabled(next.eDeviceDefinitionClassExportEnabled ?? {});
    setEDeviceDefinitionFieldOrder(next.eDeviceDefinitionFieldOrder ?? {});
    setEDeviceDefinitionTemplateFields(next.eDeviceDefinitionTemplateFields ?? {});
    setEDeviceDefinitionTableIds(next.eDeviceDefinitionTableIds ?? {});
    setCustomGraphTemplateTypes(next.customGraphTemplateTypes);
    setCustomGraphTemplates(next.customGraphTemplates);
    persistDeviceLibraryChange(next, {
      success: `${libraryPackageScopeLabels[targetScope]}已导入并保存到后台`,
      failure: `${libraryPackageScopeLabels[targetScope]}已导入到本地，但保存到后台失败`
    });
  };
  Object.assign(__appScope, { applyImportedDeviceOrTemplateLibrary });
  const applyImportedIconLibrary = async (packagePayload: LibraryPackagePayload) => {
    if (!packagePayload.iconLibrary) {
      throw new Error("导入文件中没有图标库数据。");
    }
    const result = await importBackendImageLibraryPayload(packagePayload.iconLibrary);
    const importedAssets = Array.isArray(result.assets) ? result.assets : [];
    const nextFolderId = importedAssets[0]?.folderId ?? activeImageFolderId ?? "root";
    setImageAssets((current) => ({ ...current, ...imageAssetsToMap(importedAssets) }));
    setActiveImageFolderId(nextFolderId);
    await refreshImageFolders();
    await refreshImagesForFolder(nextFolderId);
  };
  Object.assign(__appScope, { applyImportedIconLibrary });
  const applyImportedComponentLibrary = async (packagePayload: LibraryPackagePayload) => {
    let applied = false;
    if (packagePayload.measurementConfig) {
      await applyImportedMeasurementLibrary(packagePayload);
      applied = true;
    }
    if (packagePayload.deviceLibrary) {
      applyImportedDeviceOrTemplateLibrary(packagePayload, "component-library");
      applied = true;
    }
    if (packagePayload.iconLibrary) {
      await applyImportedIconLibrary(packagePayload);
      applied = true;
    }
    if (!applied) {
      throw new Error("导入文件中没有元件相关库数据。");
    }
  };
  Object.assign(__appScope, { applyImportedComponentLibrary });
  const applyImportedAllLibraries = async (packagePayload: LibraryPackagePayload) => {
    let applied = false;
    if (packagePayload.measurementConfig) {
      await applyImportedMeasurementLibrary(packagePayload);
      applied = true;
    }
    if (packagePayload.deviceLibrary) {
      applyImportedDeviceOrTemplateLibrary(packagePayload, "all");
      applied = true;
    }
    if (packagePayload.iconLibrary) {
      await applyImportedIconLibrary(packagePayload);
      applied = true;
    }
    if (!applied) {
      throw new Error("导入文件中没有可恢复的库数据。");
    }
  };
  Object.assign(__appScope, { applyImportedAllLibraries });
  const confirmLibraryPackageDialog = () => {
    const scope = libraryPackageDialogScope;
    setLibraryPackageDialogOpen(false);
    if (libraryPackageDialogMode === "import") {
      openLibraryPackageImportFilePicker(scope);
      return;
    }
    void exportLibraryPackage(scope);
  };
  Object.assign(__appScope, { confirmLibraryPackageDialog });
  const importLibraryPackageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const targetScope = libraryPackageImportScopeRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const packagePayload = normalizeLibraryPackage(JSON.parse(String(reader.result ?? "{}")));
          if (!libraryPackageScopeMatches(packagePayload.scope, targetScope)) {
            throw new Error(`当前选择导入${libraryPackageScopeLabels[targetScope]}，但文件类型是${libraryPackageScopeLabels[packagePayload.scope] ?? packagePayload.scope}。`);
          }
          const label = libraryPackageScopeLabels[targetScope] ?? "库";
          const confirmMessage = targetScope === "all"
            ? "确定导入全部库吗？当前量测定义、元件库、模板库会被导入文件中的对应配置覆盖，同 ID 图标会被覆盖。"
            : targetScope === "component-library"
            ? `确定导入${label}吗？${componentLibraryImportMessage}`
            : targetScope === "icon-library"
            ? `确定导入${label}吗？同 ID 图标会被覆盖，其他图标会保留。`
            : `确定导入${label}吗？当前${label}配置会被导入文件中的对应配置覆盖。`;
          if (!await showGlobalConfirm(confirmMessage)) {
            return;
          }
          if (targetScope === "all") {
            await applyImportedAllLibraries(packagePayload);
          } else if (targetScope === "component-library") {
            await applyImportedComponentLibrary(packagePayload);
          } else if (targetScope === "measurement") {
            await applyImportedMeasurementLibrary(packagePayload);
          } else if (targetScope === "device-library" || targetScope === "template-library") {
            applyImportedDeviceOrTemplateLibrary(packagePayload, targetScope);
          } else if (targetScope === "icon-library") {
            await applyImportedIconLibrary(packagePayload);
          }
          writeOperationLog(`导入${label}：${file.name}`);
          showGlobalMessage(`导入${label}成功。`);
        } catch (error) {
          showGlobalMessage(error instanceof Error ? error.message : "导入库文件失败。");
        }
      })();
    };
    reader.onerror = () => {
      showGlobalMessage("读取库文件失败。");
    };
    reader.readAsText(file, "utf-8");
  };
  Object.assign(__appScope, { importLibraryPackageFile });
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
  Object.assign(__appScope, { sameOptionalPoint, sameConnectTarget });
  Object.assign(__appScope, { sameOptionalPointList });
  const adjustEdgesAfterNodeMove = createAdjustEdgesAfterNodeMove(__appScope); Object.assign(__appScope, { adjustEdgesAfterNodeMove });
  const rebuildSingleAffectedConnectionRoute = createRebuildSingleAffectedConnectionRoute(__appScope); Object.assign(__appScope, { rebuildSingleAffectedConnectionRoute });
  const synchronousEdgeAdjustmentCandidates = createSynchronousEdgeAdjustmentCandidates(__appScope); Object.assign(__appScope, { synchronousEdgeAdjustmentCandidates });
  const shouldAdjustEdgeSynchronouslyAfterMove = createShouldAdjustEdgeSynchronouslyAfterMove(__appScope); Object.assign(__appScope, { shouldAdjustEdgeSynchronouslyAfterMove });
  const mergeAdjustedCandidateEdges = createMergeAdjustedCandidateEdges(__appScope); Object.assign(__appScope, { mergeAdjustedCandidateEdges });
  Object.assign(__appScope, { shouldFinalizeMovedNodeEdgesSynchronously });
  Object.assign(__appScope, { shouldDeferSingleNodeTerminalReconciliation });
  const terminalReconcileNodeScope = createTerminalReconcileNodeScope(__appScope); Object.assign(__appScope, { terminalReconcileNodeScope });
  const finalizeMovedNodeEdgesFast = createFinalizeMovedNodeEdgesFast(__appScope); Object.assign(__appScope, { finalizeMovedNodeEdgesFast });
  const optimizeMovedNodeEdgeRoutes = createOptimizeMovedNodeEdgeRoutes(__appScope); Object.assign(__appScope, { optimizeMovedNodeEdgeRoutes });
  const shouldRunDeferredMoveOptimization = createShouldRunDeferredMoveOptimization(__appScope); Object.assign(__appScope, { shouldRunDeferredMoveOptimization });
  const scheduleMovedEdgeOptimization = createScheduleMovedEdgeOptimization(__appScope); Object.assign(__appScope, { scheduleMovedEdgeOptimization });
  const scheduleDeferredMovedConnectionRepair = createScheduleDeferredMovedConnectionRepair(__appScope); Object.assign(__appScope, { scheduleDeferredMovedConnectionRepair });
  const moveRouteRepairSeedEdges = createMoveRouteRepairSeedEdges(__appScope); Object.assign(__appScope, { moveRouteRepairSeedEdges });
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
  // 收紧画布：以内容包围盒 + 2*GAP 重设画布，四边均留间隙；某方向达到最小值时内容在该方向居中
  const shrinkCanvasToFitContent = () => {
    const { canvasWidth, canvasHeight, edges, nodes, routedEdges, translateNodeBy, translateEdgeBy, shiftCachedRoutesForCanvasOrigin, clampNodePositionToBounds, clampEdgeGeometryToBounds, setGraphArrays, pushUndoSnapshot, requireEditMode, applyCanvasBounds, includeMeasurementGroupBounds } = __appScope;
    if (!requireEditMode("收紧画布")) {
      return;
    }
    // 设备量测文本画在节点外部，calculateNodeVisualBounds 未纳入，需合并量测组边界，避免收紧后量测溢出画布
    const baseBounds = calculateModelGeometryBounds(nodes, routedEdges, 0);
    let left = baseBounds ? baseBounds.left : Number.POSITIVE_INFINITY;
    let right = baseBounds ? baseBounds.right : Number.NEGATIVE_INFINITY;
    let top = baseBounds ? baseBounds.top : Number.POSITIVE_INFINITY;
    let bottom = baseBounds ? baseBounds.bottom : Number.NEGATIVE_INFINITY;
    let hasBounds = Boolean(baseBounds);
    if (includeMeasurementGroupBounds) {
      for (const node of nodes) {
        includeMeasurementGroupBounds(node, (box: { left: number; right: number; top: number; bottom: number }) => {
          left = Math.min(left, box.left);
          right = Math.max(right, box.right);
          top = Math.min(top, box.top);
          bottom = Math.max(bottom, box.bottom);
          hasBounds = true;
        });
      }
    }
    const bounds = hasBounds ? { left, right, top, bottom } : null;
    const GAP = MOVE_BOUNDARY_GUARD;
    const contentWidth = bounds ? bounds.right - bounds.left : 0;
    const contentHeight = bounds ? bounds.bottom - bounds.top : 0;
    const width = clampCanvasDimension(Math.ceil(contentWidth + 2 * GAP), MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(Math.ceil(contentHeight + 2 * GAP), MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    // 未缩小时四边均留 GAP 间隙；某方向达到最小值时内容在该方向居中
    const shift = bounds ? {
      x: Math.round((width - contentWidth) / 2) - bounds.left,
      y: Math.round((height - contentHeight) / 2) - bounds.top
    } : { x: 0, y: 0 };
    const shifted = shift.x !== 0 || shift.y !== 0;
    if (width === canvasWidth && height === canvasHeight && !shifted) {
      return;
    }
    pushUndoSnapshot();
    const nextBounds = { width, height };
    const nextNodes = nodes.map((node) => {
      const moved = shifted ? translateNodeBy(node, shift) : node;
      return { ...moved, position: clampNodePositionToBounds(moved, nextBounds) };
    });
    const nextEdges = edges.map((edge) => clampEdgeGeometryToBounds(shifted ? translateEdgeBy(edge, shift) : edge, nextBounds));
    if (shifted) {
      shiftCachedRoutesForCanvasOrigin(shift);
    }
    setGraphArrays(nextNodes, nextEdges);
    applyCanvasBounds(nextBounds);
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
        const displayValue = formatDeviceModelParamDisplayValue(row.key, row.value);
        const optionConfig = enumSelectOptionsWithCurrentValue(paramOptionsForSection(row.key, view.componentLibrary), displayValue);
        const options = optionConfig.options;
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
                    <option key={option} value={option} disabled={option === optionConfig.invalidValue}>
                      {option === optionConfig.invalidValue ? invalidEnumOptionLabel(option) : option}
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
  const renderLayerManager = createRenderLayerManager(__appScope);
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
  const exportSvgFile = createExportSvgFile(__appScope); Object.assign(__appScope, { exportSvgFile });
  const exportJsonFile = createExportJsonFile(__appScope); Object.assign(__appScope, { exportJsonFile });
  const exportEDeviceDefinitionFile = createExportEDeviceDefinitionFile(__appScope); Object.assign(__appScope, { exportEDeviceDefinitionFile });
  const importEDeviceDefinitionFile = createImportEDeviceDefinitionFile(__appScope); Object.assign(__appScope, { importEDeviceDefinitionFile });
  const programmaticExportEDeviceDefinition = createProgrammaticExportEDeviceDefinition(__appScope); Object.assign(__appScope, { programmaticExportEDeviceDefinition });
  const programmaticImportEDeviceDefinition = createProgrammaticImportEDeviceDefinition(__appScope); Object.assign(__appScope, { programmaticImportEDeviceDefinition });
  Object.assign(__appScope, { safeFilePart });
  Object.assign(__appScope, { serializeSchemeRecordForFile });
  Object.assign(__appScope, { isObjectRecord });
  const isProjectFilePayload = createIsProjectFilePayload(__appScope); Object.assign(__appScope, { isProjectFilePayload });
  const createImportedSchemeRecord = createCreateImportedSchemeRecord(__appScope); Object.assign(__appScope, { createImportedSchemeRecord });
  const exportProjectRecordFile = createExportProjectRecordFile(__appScope); Object.assign(__appScope, { exportProjectRecordFile });
  const exportCurrentModelFile = createExportCurrentModelFile(__appScope); Object.assign(__appScope, { exportCurrentModelFile });
  const openModelImportFilePicker = createOpenModelImportFilePicker(__appScope); Object.assign(__appScope, { openModelImportFilePicker });
  const openSvgModelImportFilePicker = createOpenSvgModelImportFilePicker(__appScope); Object.assign(__appScope, { openSvgModelImportFilePicker });
  const openSchemeImportFilePicker = createOpenSchemeImportFilePicker(__appScope); Object.assign(__appScope, { openSchemeImportFilePicker });
  const mergeImportedSchemeIntoExisting = createMergeImportedSchemeIntoExisting(__appScope); Object.assign(__appScope, { mergeImportedSchemeIntoExisting });
  const commitImportedSchemeRecord = createCommitImportedSchemeRecord(__appScope); Object.assign(__appScope, { commitImportedSchemeRecord });
  const applyBackendSchemeArchiveImport = createApplyBackendSchemeArchiveImport(__appScope); Object.assign(__appScope, { applyBackendSchemeArchiveImport });
  const importSchemeFile = createImportSchemeFile(__appScope); Object.assign(__appScope, { importSchemeFile });
  const commitImportedModelRecord = createCommitImportedModelRecord(__appScope); Object.assign(__appScope, { commitImportedModelRecord });
  const completeImportedModelFeedback = createCompleteImportedModelFeedback(__appScope); Object.assign(__appScope, { completeImportedModelFeedback });
  const importModelFile = createImportModelFile(__appScope); Object.assign(__appScope, { importModelFile });
  const importSvgModelFile = createImportSvgModelFile(__appScope); Object.assign(__appScope, { importSvgModelFile });
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
  const renderProjectPanel = createRenderProjectPanel(__appScope); Object.assign(__appScope, { renderProjectPanel });
  const customDraftTerminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount); Object.assign(__appScope, { customDraftTerminalTypes });
  const customDraftTerminalAssociations = normalizeContainerTerminalAssociations(
      customDraftTerminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
  Object.assign(__appScope, { customDraftTerminalAssociations });
  const customDraftDefaultParams = customDefaultDefinitions(customDraftTerminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      isDerivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary,
      terminalAssociations: customDraftTerminalAssociations,
      existingDefinitions: customDeviceDraft.params
    }).map((definition) => ({
      ...definition,
      ...resolveDeviceParameterDefinitionExportSettings(
        customDeviceDraft.componentKind || customDeviceDraft.componentLibrary,
        { component_type: customDeviceDraft.componentLibrary },
        definition
      )
    }));
  Object.assign(__appScope, { customDraftDefaultParams });
  const customDraftDefaultParamKeySet = new Set(customDraftDefaultParams.map((row) => row.enName.trim().toLowerCase()));
  const customDraftDefaultParamOverrideMap = new Map(
    customDeviceDraft.params
      .filter((row) => customDraftDefaultParamKeySet.has(row.enName.trim().toLowerCase()))
      .map((row) => [row.enName.trim().toLowerCase(), row])
  );
  const customDraftMergedDefaultParams = customDraftDefaultParams.map((row) => {
    const override = customDraftDefaultParamOverrideMap.get(row.enName.trim().toLowerCase());
    return override
      ? normalizeDefinitionRowEnumFields({
          ...row,
          valueType: override.valueType,
          typicalValue: override.typicalValue,
          enumOptions: override.enumOptions,
          enumValues: override.enumValues,
          readonly: row.readonly,
          ...(typeof override.exportEnabled === "boolean" ? { exportEnabled: override.exportEnabled } : {}),
          ...(typeof override.exportName === "string" ? { exportName: override.exportName } : {})
        })
      : row;
  });
  const customDraftDerivedBaseComponentLibrary =
    customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary;
  const customDraftParamIsHiddenDerivedBaseRow = (row: { enName?: unknown }) =>
    customDeviceDraft.isDerivedComponentLibrary &&
    isDerivedComponentBaseParamName(row.enName, customDraftDerivedBaseComponentLibrary);
  const customDraftVisibleParams = customDeviceDraft.params.filter((row) =>
    !customDraftDefaultParamKeySet.has(row.enName.trim().toLowerCase()) &&
    !customDraftParamIsHiddenDerivedBaseRow(row)
  );
  Object.assign(__appScope, { customDraftDefaultParamKeySet, customDraftMergedDefaultParams, customDraftVisibleParams });
  const customDeviceMeasurementParameterDefinitions = [...customDraftMergedDefaultParams, ...customDraftVisibleParams];
  const customDeviceMeasurementPositionDefinitions = buildMeasurementProfilePositionDefinitions({
      source: {
        kind:
          customDeviceDraft.componentKind ||
          editingCustomDeviceKind ||
          selectedCustomComponentTemplate?.kind ||
          selectedDefinitionTemplate?.kind ||
          "custom-device-draft",
        label: customDeviceDraft.componentName,
        params: {
          component_type: customDeviceDraft.componentLibrary,
          ...(customDeviceDraft.isDerivedComponentLibrary ? {
            derived_from_component_type: customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary,
            derived_component_type: customDeviceDraft.derivedComponentLibrary,
            derived_component_library_label: customDeviceDraft.derivedComponentLibraryLabel,
            is_derived_component_library: "1"
          } : {})
        },
        isDerivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary,
        derivedFromComponentLibrary: customDeviceDraft.isDerivedComponentLibrary
          ? customDeviceDraft.derivedFromComponentLibrary || customDeviceDraft.componentLibrary
          : "",
        derivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary ? customDeviceDraft.derivedComponentLibrary : "",
        derivedComponentLibraryLabel: customDeviceDraft.isDerivedComponentLibrary ? customDeviceDraft.derivedComponentLibraryLabel : "",
        terminalType: customDraftTerminalTypes[0] ?? "ac",
        terminalCount: customDraftTerminalTypes.length,
        terminalTypes: customDraftTerminalTypes,
        terminalLabels: customDeviceDraft.terminalLabels.slice(0, customDraftTerminalTypes.length),
        terminalRoles: customDeviceDraft.terminalRoles.slice(0, customDraftTerminalTypes.length),
        terminalAssociations: customDeviceDraft.isContainer ? customDraftTerminalAssociations : undefined,
        isContainer: customDeviceDraft.isContainer,
        parameterDefinitions: customDeviceMeasurementParameterDefinitions
      },
      parameterDefinitions: customDeviceMeasurementParameterDefinitions,
      libraryTemplates
    });
  const customDeviceMeasurementTarget: DeviceDefinitionMeasurementPanelTarget = {
      deviceKind:
        normalizeComponentLibraryName(customDeviceDraft.componentLibrary) ||
        (selectedCustomComponentTemplate ? deviceDefinitionKeyForTemplate(selectedCustomComponentTemplate) : ""),
      label: customDeviceDraft.componentName.trim() || selectedCustomComponentTemplate?.label || customDeviceDraft.componentLibrary || "未命名元件",
      terminalCount: Math.max(0, customDeviceDraft.terminalCount),
      terminalLabels: customDeviceDraft.terminalLabels,
      parameterDefinitions: customDeviceMeasurementParameterDefinitions,
      positionDefinitions: customDeviceMeasurementPositionDefinitions,
      items: customDeviceDraft.measurementDefinitions,
      setItems: (items) => setCustomDeviceDraft((current) => ({ ...current, measurementDefinitions: items, error: "" })),
      ensureAssociatedField: (position, associatedField, measurementTypeId) => {
        if (position !== "device") return;
        const measurementType = (measurementConfigDraft ?? measurementConfig).measurementTypes
          .find((type) => type.id === measurementTypeId);
        const definition = createMeasurementFieldParameterDefinition(associatedField, {
          cnName: measurementType?.name,
          valueType: measurementType?.valueType === "string" || measurementType?.valueType === "boolean" ? "string" : "float"
        });
        if (!definition) return;
        setCustomDeviceDraft((current) => current.params.some((row) => row.enName.trim().toLowerCase() === definition.enName.toLowerCase())
          ? current
          : { ...current, params: [...current.params, { ...definition, id: customParamId() }], error: "" });
      }
    };
  Object.assign(__appScope, { customDeviceMeasurementTarget });
  const customIconStatePageId = customDeviceStatePageId;
  Object.assign(__appScope, { customIconStatePageId });
  const customDevicePreviewLabel = customDeviceDraft.componentName.trim() || customDeviceDraft.componentLibrary || "Unit"; Object.assign(__appScope, { customDevicePreviewLabel });
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
          : kind === "measurementEditor"
            ? measurementEditorDialogRef
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
  const revertCustomDeviceDraftCurrentTab = createRevertCustomDeviceDraftCurrentTab(__appScope); Object.assign(__appScope, { revertCustomDeviceDraftCurrentTab });
  const revertCustomDeviceDraftAll = createRevertCustomDeviceDraftAll(__appScope); Object.assign(__appScope, { revertCustomDeviceDraftAll });
  const toggleDefinitionGroup = createToggleDefinitionGroup(__appScope); Object.assign(__appScope, { toggleDefinitionGroup });
  const toggleDefinitionComponentLibrary = createToggleDefinitionComponentLibrary(__appScope); Object.assign(__appScope, { toggleDefinitionComponentLibrary });
  const updateDefinitionComponentLibraryCommonParamExport = createUpdateDefinitionComponentLibraryCommonParamExport(__appScope); Object.assign(__appScope, { updateDefinitionComponentLibraryCommonParamExport });
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
                  definitionVisualDraft?.backgroundImageFit ?? "",
                  definitionVisualDraft?.size.width ?? "",
                  definitionVisualDraft?.size.height ?? "",
                  definitionVisualDraft?.terminalCount ?? "",
                  definitionVisualTerminalTypes.join(",")
                ].join("/")
              : [
                  customDevicePreviewSourceTemplate?.kind ?? selectedCustomComponentTemplate?.kind ?? selectedDefinitionTemplate?.kind ?? editingCustomDeviceKind ?? "",
                  customDeviceDraft.backgroundImageAssetId,
                  customDeviceDraft.backgroundImageFit,
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
      ? stateIconDrawingToPersistedImage(stateIconDrawingDialog.elements, {
            resolveImageHref: resolveStateIconDrawingImageHref,
            frame: stateIconDrawingDialog.frame,
            frameHasTerminals: stateIconDrawingInlineHasTerminals
          })
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
        const initialFrame = stateIconDrawingInitialFrame(row, imageAssets, DEFAULT_STATE_ICON_DRAWING_FRAME);
        stateIconDrawingHistoryRef.current = [];
        setStateIconDrawingContextMenu(null);
        stateIconDrawingInitialImageRef.current = {
          key: targetKey,
          sourceImage: draftSourceImage,
          image: stateIconDrawingToPersistedImage(initial, {
            resolveImageHref: resolveStateIconDrawingImageHref,
            frame: initialFrame,
            frameHasTerminals: stateIconDrawingInlineTarget.scope === "definition"
              ? (Number(definitionVisualDraft?.terminalCount) || definitionVisualTerminalTypes.length) > 0
              : (Number(customDeviceDraft.terminalCount) || customDraftTerminalTypes.length) > 0
          })
        };
        return {
          target: stateIconDrawingInlineTarget,
          elements: initial,
          selectedElementId: initial[0]?.id ?? "",
          selectedElementIds: initial[0]?.id ? [initial[0].id] : [],
          frame: initialFrame
        };
      });
    }, [
      customDeviceDialogOpen,
      customDeviceDialogView,
      customDeviceDraft.backgroundImage,
      customDeviceDraft.backgroundImageAssetId,
      customDeviceDraft.backgroundImageCleared,
      customDeviceDraft.backgroundImageFit,
      customDeviceDraft.stateDefinitions,
      customDeviceDraft.terminalCount,
      customIconStatePageId,
      customDeviceStatePageId,
      definitionVisualDraft?.backgroundImage,
      definitionVisualDraft?.backgroundImageAssetId,
      definitionVisualDraft?.backgroundImageCleared,
      definitionVisualDraft?.backgroundImageFit,
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
            (definitionVisualDraft.backgroundImageFit ?? "fixed") === "fixed" &&
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
                  backgroundImageFit: "fixed",
                  backgroundImageCleared: stateIconDrawingInlineImage ? "" : "1",
                  error: ""
                }
              : current
          );
        } else {
          const imageFieldsAlreadySynced =
            customDeviceDraft.backgroundImage === stateIconDrawingInlineImage &&
            !customDeviceDraft.backgroundImageAssetId &&
            (customDeviceDraft.backgroundImageFit ?? "fixed") === "fixed" &&
            (customDeviceDraft.backgroundImageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
          if (imageFieldsAlreadySynced) {
            return;
          }
          setCustomDeviceDraft((current) => ({
            ...current,
            backgroundImage: stateIconDrawingInlineImage,
            backgroundImageAssetId: "",
            backgroundImageFit: "fixed",
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
        (row.imageFit ?? "fixed") === "fixed" &&
        !row.backgroundImage &&
        !row.backgroundImageAssetId &&
        (row.backgroundImageFit ?? "fixed") === "fixed" &&
        (row.imageCleared ?? "") === (stateIconDrawingInlineImage ? "" : "1");
      if (imageFieldsAlreadySynced) {
        return;
      }
      const stateIconDrawingInlinePatch: Partial<DeviceDefinitionStateDraftRow> = {
        image: stateIconDrawingInlineImage,
        imageAssetId: "",
        imageFit: "fixed",
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageFit: "fixed",
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
  const customComponentTreeTypeKey = (categoryLibraryName: string, componentLibrary: string) =>
      `${normalizeCategoryLibraryName(categoryLibraryName)}::${normalizeComponentLibraryName(componentLibrary)}`;
  Object.assign(__appScope, { customComponentTreeTypeKey });
  const handleTreeCollapseChange = useCallback(createAppHookCallback127(__appScope), []);
  Object.assign(__appScope, { handleTreeCollapseChange });
  const ensureCustomComponentTreeExpanded = createEnsureCustomComponentTreeExpanded(__appScope); Object.assign(__appScope, { ensureCustomComponentTreeExpanded });
  const cancelPendingCustomComponentTemplateLoad = createCancelPendingCustomComponentTemplateLoad(__appScope); Object.assign(__appScope, { cancelPendingCustomComponentTemplateLoad });
  const selectCustomCategoryLibrary = createSelectCustomCategoryLibrary(__appScope); Object.assign(__appScope, { selectCustomCategoryLibrary });
  const selectCustomComponentLibrary = createSelectCustomComponentLibrary(__appScope); Object.assign(__appScope, { selectCustomComponentLibrary });
  const selectCustomComponentTemplate = createSelectCustomComponentTemplate(__appScope); Object.assign(__appScope, { selectCustomComponentTemplate });
  const startCustomComponentCreate = createStartCustomComponentCreate(__appScope); Object.assign(__appScope, { startCustomComponentCreate });
  const confirmCustomLibraryCreateDialog = createConfirmCustomLibraryCreateDialog(__appScope); Object.assign(__appScope, { confirmCustomLibraryCreateDialog });
  const nextCustomCategoryLibraryName = createNextCustomCategoryLibraryName(__appScope); Object.assign(__appScope, { nextCustomCategoryLibraryName });
  const createCustomCategoryLibrary = createCreateCustomCategoryLibrary(__appScope); Object.assign(__appScope, { createCustomCategoryLibrary });
  const deleteCustomCategoryLibrary = createDeleteCustomCategoryLibrary(__appScope); Object.assign(__appScope, { deleteCustomCategoryLibrary });
  const nextCustomComponentLibraryName = createNextCustomComponentLibraryName(__appScope); Object.assign(__appScope, { nextCustomComponentLibraryName });
  const createCustomComponentLibrary = createCreateCustomComponentLibrary(__appScope); Object.assign(__appScope, { createCustomComponentLibrary });
  const deleteCustomComponentLibrary = createDeleteCustomComponentLibrary(__appScope); Object.assign(__appScope, { deleteCustomComponentLibrary });
  const renameSelectedCustomDeviceTreeItem = createRenameSelectedCustomDeviceTreeItem(__appScope); Object.assign(__appScope, { renameSelectedCustomDeviceTreeItem });
  const deleteSelectedCustomDeviceTreeItem = createDeleteSelectedCustomDeviceTreeItem(__appScope); Object.assign(__appScope, { deleteSelectedCustomDeviceTreeItem });
  const nextCustomTemplateKind = createNextCustomTemplateKind(__appScope); Object.assign(__appScope, { nextCustomTemplateKind });
  const saveCustomDeviceTemplate = createSaveCustomDeviceTemplate(__appScope); Object.assign(__appScope, { saveCustomDeviceTemplate });
  const saveBuiltinDeviceDefinitionFromCustomDraft = createSaveBuiltinDeviceDefinitionFromCustomDraft(__appScope); Object.assign(__appScope, { saveBuiltinDeviceDefinitionFromCustomDraft });
  const saveCustomDeviceDefinitionDialog = createSaveCustomDeviceDefinitionDialog(__appScope); Object.assign(__appScope, { saveCustomDeviceDefinitionDialog });
  const renderStateVisualPager = createRenderStateVisualPager(__appScope); Object.assign(__appScope, { renderStateVisualPager });
  const renderDeviceDefinitionVisualPanel = createRenderDeviceDefinitionVisualPanel(__appScope); Object.assign(__appScope, { renderDeviceDefinitionVisualPanel });
  const renderLibraryDefinitionActions = createRenderLibraryDefinitionActions(__appScope); Object.assign(__appScope, { renderLibraryDefinitionActions });
  const renderGraphTemplatePreview = createRenderGraphTemplatePreview(__appScope); Object.assign(__appScope, { renderGraphTemplatePreview });
  const renderGraphTemplateButton = createRenderGraphTemplateButton(__appScope); Object.assign(__appScope, { renderGraphTemplateButton });
  const renderGraphTemplateFlyout = createRenderGraphTemplateFlyout(__appScope); Object.assign(__appScope, { renderGraphTemplateFlyout });
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
        <div className="template-library-actions library-scope-actions" aria-label="模板库导入导出">
          <button
            type="button"
            className="library-icon-action"
            title="导入模板库"
            disabled={isBrowseMode}
            onClick={() => openLibraryPackageImportFilePicker("template-library")}
          >
            <FileInput size={14} aria-hidden="true" />
            <span>导入</span>
          </button>
          <button
            type="button"
            className="library-icon-action"
            title="导出模板库"
            onClick={() => void exportLibraryPackage("template-library")}
          >
            <Download size={14} aria-hidden="true" />
            <span>导出</span>
          </button>
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
                  ref={setLibraryComponentLibraryHeaderRef(flyoutListKey)}
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
            placeholder="搜索图元/元件库"
            aria-label="搜索图元库"
          />
          {librarySearchQuery && (
            <button type="button" aria-label="清空图元库搜索" title="清空" onClick={() => setLibrarySearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="component-library-actions library-scope-actions" aria-label="元件库导入导出">
          <button
            type="button"
            className="library-icon-action"
            title="导入元件库"
            disabled={isBrowseMode}
            onClick={() => openLibraryPackageImportFilePicker("component-library")}
          >
            <FileInput size={14} aria-hidden="true" />
            <span>导入</span>
          </button>
          <button
            type="button"
            className="library-icon-action"
            title="导出元件库"
            onClick={() => void exportLibraryPackage("component-library")}
          >
            <Download size={14} aria-hidden="true" />
            <span>导出</span>
          </button>
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
                    setCollapsedExpandedModeCategoryLibraries((current) =>
                      current.length === 0 ? [...displayedCategoryLibraries] : []
                    );
                  } else {
                    setExpandedCategoryLibraries((current) =>
                      current.length === 0 ? [...displayedCategoryLibraries] : []
                    );
                  }
                }}
              />
              <span>{label}</span>
              {componentLibraryDisplayMode === mode && (() => {
                // 当前选中模式：图标反映折叠层全部展开/全部收缩
                const total = displayedCategoryLibraries.length;
                if (total === 0) return null;
                const allCollapsed = mode === "expanded"
                  ? collapsedExpandedModeCategoryLibraries.length >= total
                  : expandedCategoryLibraries.length === 0;
                const allExpanded = mode === "expanded"
                  ? collapsedExpandedModeCategoryLibraries.length === 0
                  : expandedCategoryLibraries.length >= total;
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
          {displayedCategoryLibraries.length > 0 ? displayedCategoryLibraries.map((group) => {
            const libraryExpanded = componentLibraryDisplayMode === "expanded";
            const libraryFlyout = componentLibraryDisplayMode === "right";
            const expanded = librarySearchNeedle ? true : libraryExpanded
              ? !collapsedExpandedModeCategoryLibraries.includes(group)
              : expandedCategoryLibraries.includes(group);
            const typeGroups = filteredCategoryLibraryByComponentLibrary[group] ?? [];
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
                      setHoveredCategoryLibrary((current) => current === group ? "" : current);
                      setHoveredCategoryLibraryComponentLibrary("");
                    }
                  }
                }}
              >
                <button
                  className={`library-group-toggle ${expanded ? "active" : ""}`}
                  onClick={() => toggleCategoryLibrary(group)}
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {group}
                </button>
                {expanded && (
                  <div className="category-library-component-library-list">
                    {typeGroups.map((typeGroup) => {
                      const componentLibraryKey = categoryLibraryComponentLibraryKey(group, typeGroup.section);
                      const componentLibraryDisplay = componentLibraryDisplayParts(typeGroup.section, customComponentLibraries);
                      const componentLibraryExpanded = librarySearchNeedle
                        ? true
                        : libraryExpanded
                          ? !collapsedExpandedModeComponentLibraries.includes(componentLibraryKey)
                          : libraryFlyout ? false : expandedCategoryLibraryComponentLibraries.includes(componentLibraryKey) || hoveredCategoryLibraryComponentLibrary === componentLibraryKey;
                      const componentLibraryFlyoutVisible = libraryFlyout && !librarySearchNeedle && hoveredCategoryLibraryComponentLibrary === componentLibraryKey;
                      const inlineListKey = libraryComponentListRefKey("inline", componentLibraryKey);
                      const flyoutListKey = libraryComponentListRefKey("flyout", componentLibraryKey);
                      return (
                        <section
                          className={`category-library-component-library-section ${libraryFlyout ? "flyout-mode" : ""}`}
                          key={`${group}-${typeGroup.section}`}
                          onMouseEnter={() => {
                            if (!libraryExpanded) {
                              clearLibraryFlyoutCloseTimer();
                              setHoveredCategoryLibraryComponentLibrary(componentLibraryKey);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!libraryExpanded) {
                              if (libraryFlyout) {
                                scheduleLibraryFlyoutClose(group, componentLibraryKey);
                              } else {
                                setHoveredCategoryLibraryComponentLibrary((current) => current === componentLibraryKey ? "" : current);
                              }
                            }
                          }}
                        >
                          <button
                            type="button"
                            ref={setLibraryComponentLibraryHeaderRef(flyoutListKey)}
                            className={`category-library-component-library-header ${componentLibraryExpanded || componentLibraryFlyoutVisible ? "active" : ""}`}
                            aria-expanded={componentLibraryExpanded || componentLibraryFlyoutVisible}
                            onClick={() => toggleCategoryLibraryComponentLibrary(group, typeGroup.section)}
                          >
                            <span className="component-library-title">
                              {!libraryFlyout && (componentLibraryExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
                              <span className="component-library-name" title={componentLibraryDisplay.title}>
                                <span className="component-library-name-cn">{componentLibraryDisplay.chinese}</span>
                                <span className="component-library-name-en">{componentLibraryDisplay.english}</span>
                              </span>
                            </span>
                            <strong>{typeGroup.templates.length}</strong>
                          </button>
                          {componentLibraryExpanded && (
                            <div className="library-group inline-library-group" ref={setLibraryComponentListRef(inlineListKey)}>
                              {typeGroup.templates.map((item) => renderLibraryTemplateButton(item, typeGroup.section))}
                            </div>
                          )}
                          {componentLibraryFlyoutVisible && renderLibraryFlyout(flyoutListKey, componentLibraryKey, group, typeGroup)}
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
  const renderElementTreePanel = createRenderElementTreePanel(__appScope); Object.assign(__appScope, { renderElementTreePanel });
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
  const canvasPointToSurfaceCss = createCanvasPointToSurfaceCss(__appScope);
  Object.assign(__appScope, { canvasPointToSurfaceCss });
  const floatingToolbarViewport = {
      left: canvasDisplayOffsetX + floatingToolbarViewportCanvas.x * canvasScrollScale.x,
      right: canvasDisplayOffsetX + (floatingToolbarViewportCanvas.x + floatingToolbarViewportCanvas.width) * canvasScrollScale.x,
      top: canvasDisplayOffsetY + floatingToolbarViewportCanvas.y * canvasScrollScale.y,
      bottom: canvasDisplayOffsetY + (floatingToolbarViewportCanvas.y + floatingToolbarViewportCanvas.height) * canvasScrollScale.y
    };
  Object.assign(__appScope, { floatingToolbarViewport });
  const clampFloatingToolbarPosition = createClampFloatingToolbarPosition(__appScope); Object.assign(__appScope, { clampFloatingToolbarPosition });
  const floatingToolbarBounds = createFloatingToolbarBounds(__appScope);
  Object.assign(__appScope, { floatingToolbarBounds });
  const toolbarOverlapArea = createToolbarOverlapArea(__appScope); Object.assign(__appScope, { toolbarOverlapArea });
  const canvasRectToSurfaceCssRect = createCanvasRectToSurfaceCssRect(__appScope); Object.assign(__appScope, { canvasRectToSurfaceCssRect });
  const rotateControlAvoidRectFromCanvasPoints = createRotateControlAvoidRectFromCanvasPoints(__appScope); Object.assign(__appScope, { rotateControlAvoidRectFromCanvasPoints });
  const rotateControlAvoidRectFromCanvas = createRotateControlAvoidRectFromCanvas(__appScope);
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
  const floatingToolbarWrapperStyle = createFloatingToolbarWrapperStyle(__appScope);
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
  const mapPointToMinimap = createMapPointToMinimap(__appScope);
  Object.assign(__appScope, { mapPointToMinimap });
  const minimapViewportLeft = clampNumber(minimapOffsetX + canvasVisibleViewBox.x * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth); Object.assign(__appScope, { minimapViewportLeft });
  const minimapViewportTop = clampNumber(minimapOffsetY + canvasVisibleViewBox.y * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight); Object.assign(__appScope, { minimapViewportTop });
  const minimapViewportRight = clampNumber(minimapOffsetX + (canvasVisibleViewBox.x + canvasVisibleViewBox.width) * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth); Object.assign(__appScope, { minimapViewportRight });
  const minimapViewportBottom = clampNumber(minimapOffsetY + (canvasVisibleViewBox.y + canvasVisibleViewBox.height) * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight); Object.assign(__appScope, { minimapViewportBottom });
  const handleMinimapNavigate = createHandleMinimapNavigate(__appScope); Object.assign(__appScope, { handleMinimapNavigate });
  const centerSelectedInView = createCenterSelectedInView(__appScope); Object.assign(__appScope, { centerSelectedInView });
  const fitViewToSelection = createFitViewToSelection(__appScope); Object.assign(__appScope, { fitViewToSelection });
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
        collapsedExpandedModeCategoryLibraries,
        collapsedExpandedModeComponentLibraries,
        displayedCategoryLibraries,
        expandedCategoryLibraries,
        expandedCategoryLibraryComponentLibraries,
        filteredCategoryLibraryByComponentLibrary,
        hoveredCategoryLibrary,
        hoveredCategoryLibraryComponentLibrary,
        isBrowseMode,
        isEditMode,
        libraryFlyoutPositions,
        libraryPreviewByKind,
        librarySearchNeedle,
        librarySearchQuery,
        measurementConfig
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
}
