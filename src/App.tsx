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
  resolveEffectiveTemplateParameterDefinitions,
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
  type ModelType,
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
import { parseSvgModel } from "./svgModelImport";
import {
  createCompleteImportedModelFeedback,
  createImportSvgModelFile,
  createOpenSvgModelImportFilePicker,
  createProgrammaticExportEDeviceDefinition,
  createProgrammaticImportEDeviceDefinition
} from "./appExtracted/appDeviceDefinitionFactories";
import { customParamId, deviceDefinitionRowId, stateDraftRowId, DEFAULT_STATE_ICON_DRAWING_FRAME, DEFAULT_STATE_PAGE_ID, isDefaultStatePageId, createStateDraftRow, createStateDraftRowFromDefaultVisual, defaultStateDraftRow, createDefinitionStateDraftRows, normalizeStateDraftRows, validateStateDraftRows, stateVisualFromDraftRow, activeStateDraftRow, normalizeStatePageId, stateDraftImageValue, stateIconDrawingDraftSourceImage, stateIconDrawingInlineNeedsDraftReload, stateIconDrawingInlineCanPersistDraft, stateVisualShapeLabel, generateStateVisualShapeImage, stateIconDrawingElementId, visibleStateIconColor, createStateIconDrawingElement, createImportedStateIconElement, svgSourceFromDataUrl, parseStateIconSvgSource, stateIconSvgElementSource, parseSvgStyleAttribute, stateIconSvgReactAttributes, stateIconSvgNodeChildren, stateIconSvgNodeToReact, stateIconSvgSourceToReactNodes, createEditableStateIconElementsFromSvgSource, createStateIconDrawingInitialElements, stateIconDrawingInitialFrame, svgSourceToDataUrl, stateIconDrawingSvgElementMarkup, stateIconDrawingElementMarkup, stateIconDrawingToImage, stateIconDrawingToPersistedImage, stateIconDrawingFrameRect, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, type StateVisualShapeKind, type StateIconDrawingElement, type DeviceDefinitionStateDraftRow } from "./stateIconDrawing";
import { fallbackComponentLibraryForCategoryLibrary, resolveTemplateComponentLibrary, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, isReservedDeviceDefinitionParamName, isDerivedComponentBaseParamName, createDefinitionDraftRows, normalizeCustomDeviceTerminalAnchorCoordinate, projectCustomDeviceTerminalAnchorToBoundary, customDeviceTerminalAnchorKey, hasOverlappingCustomDeviceTerminalAnchors, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, createCustomDeviceDraftFromTemplate, createDefinitionVisualDraft, defaultContainerAssociationForTerminalType, isAssociationAllowedForTerminal, normalizeContainerTerminalAssociations, customDefaultDefinitions, generateCustomDeviceImage, customDeviceImageWithTerminalConnectors, customDeviceGeneratedDefaultImageCandidates, syncInheritedCustomDeviceStateVisuals, parseCustomDefinitions, screenToSvgPoint, primaryOrthogonalAxis, constrainPointToOrthogonalAxis } from "./customDeviceUtils";
import { useBatchEditors } from "./hooks/useBatchEditors";
import { useGlobalLines } from "./hooks/useGlobalLines";
import { APP_STATIC_SCOPE } from "./appExtracted/appStaticScope";
import {
  sameOptionalPoint, sameConnectTarget, sameOptionalPointList,
  shouldFinalizeMovedNodeEdgesSynchronously, shouldDeferSingleNodeTerminalReconciliation,
  shouldPatchRouteCacheForHighFanoutMove,
  safeFilePart, serializeSchemeRecordForFile, isObjectRecord,
  topologyWarningDisplayMessage, isStaticButtonEnabledForNode,
  timestampForLibraryPackageFilename
} from "./appExtracted/appInlineUtilityFunctions";
import {
  createRenderLayerManager, createRenderLibraryDefinitionActions,
  createRenderGraphTemplateButton, createRenderGraphTemplateFlyout,
  createRenderProjectPanel, createRenderElementTreePanel
} from "./appExtracted/appRenderPanels";
import {
  createFloatingToolbarBounds, createCanvasPointToSurfaceCss,
  createRotateControlAvoidRectFromCanvas, createFloatingToolbarWrapperStyle,
  createMapPointToMinimap
} from "./appExtracted/appCanvasViewportCalculations";
import { createRuntimeWsClient } from "./runtimeWsClient";
import { createRuntimeSnapshotHandler } from "./runtimeSnapshot";
import { createRuntimeScreenshotHandler } from "./runtimeScreenshot";
import {
  buildUserCustomizationInventory,
  collectReferencedUserAssetIds,
  type UserCustomizationDomain,
  type UserCustomizationImportMode,
  type UserCustomizationImportPreview,
  type UserCustomizationSnapshot
} from "./userCustomizations";
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
} from "./appExtracted/appUserCustomizationFactories";
export * from "./appExtracted/appCoreCanvasUtilities";
export * from "./appExtracted/appPersistenceLibraryExport";
import { ENABLE_REACT_FLOW_PREVIEW, ReactFlowPreview, INTERACTION_MODE_STORAGE_KEY, CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR, CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR, CANVAS_KEYBOARD_BLOCKING_SELECTOR, CANVAS_KEYBOARD_SURFACE_SELECTOR, normalizeInteractionMode, isCanvasGraphicContextMenuTarget, isCanvasWheelZoomExcludedTarget, canvasWheelTargetIsRenderedCanvas, isCanvasKeyboardBlockingTarget, readStoredInteractionMode, writeStoredInteractionMode, CANVAS_SELECTION_DRAG_THRESHOLD, hasCanvasSelectionModifier, canvasWheelEventHasNoModifier, shouldZoomCanvasFromWheelEvent, isGroupTransformDrag, selectionRectCenter, combineSelectionRects, routeMidpoint, rotatePointAround, snapRotationDeltaToRightAngle, normalizedRotationDelta, transformPointAngle, rotationDeltaFromTransformPoint, rotationDeltaBetweenTransformPoints, rotationTrajectoryArcPath, mirrorPointAcrossAxis, localScaleKindForScreenHandle, groupTransformGeometry, transformGroupPoint, groupTransformSvgTransform, NODE_LABEL_DISPLAY_MODES, CONTEXT_MENU_VIEWPORT_PADDING, CONTEXT_MENU_FALLBACK_WIDTH, CONTEXT_MENU_FALLBACK_HEIGHT, CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH, CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT, NODE_LABEL_FOOTPRINT_PARAM_KEYS, isMultiNodeMoveState, reuseSetOrCreate, cloneMeasurementGroupForDraft, terminalColor, busEndpointColor, ENERGY_COLOR_ROWS, ELECTRIC_COLOR_TYPES, ELECTRIC_COLOR_TYPE_LABELS, isElectricPaletteType, terminalVbaseFallbackValue, voltageColorKeyForTerminal, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_BACKGROUND, MOVE_BOUNDARY_GUARD, CANVAS_AUTO_EXPAND_PADDING, CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE, CANVAS_RESIZE_HANDLE_SIZE, MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES, ORIGINAL_POSITION_REROUTE_PADDING, MOVE_ROUTE_LOCAL_SEARCH_PADDING, MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES, MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES, KEYBOARD_MOVE_COMMIT_DELAY_MS, KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND, KEYBOARD_MOVE_FRAME_INTERVAL_MS, ELEMENT_TREE_INITIAL_ITEM_LIMIT, ELEMENT_TREE_ITEM_LIMIT_STEP, TOPOLOGY_WARNING_PAGE_SIZE, CANVAS_MINIMAP_WIDTH, CANVAS_MINIMAP_HEIGHT, CANVAS_MINIMAP_PADDING, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH, NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH, NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT, NODE_DOUBLE_CLICK_DIALOG_MARGIN, DEVICE_DEFINITION_DIALOG_DEFAULT_WIDTH, DEVICE_DEFINITION_DIALOG_DEFAULT_HEIGHT, CUSTOM_DEVICE_DIALOG_DEFAULT_WIDTH, CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT, MEASUREMENT_CONFIG_DIALOG_DEFAULT_WIDTH, MEASUREMENT_CONFIG_DIALOG_DEFAULT_HEIGHT, DEVICE_LIBRARY_DIALOG_MIN_WIDTH, DEVICE_LIBRARY_DIALOG_MIN_HEIGHT, DEVICE_LIBRARY_DIALOG_MARGIN, DEVICE_LIBRARY_DIALOG_CONFIG, TOPOLOGY_WARNING_PANEL_DEFAULT_WIDTH, TOPOLOGY_WARNING_PANEL_MIN_WIDTH, TOPOLOGY_WARNING_PANEL_MAX_WIDTH, TOPOLOGY_WARNING_PANEL_MARGIN, CANVAS_MINIMAP_MAX_NODE_MARKS, CANVAS_MINIMAP_MAX_ROUTE_MARKS, CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD, FIT_SELECTION_MAX_ZOOM_PERCENT, TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD, CANVAS_LOD_NODE_DETAIL_LIMIT, CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT, CANVAS_LOD_MAX_ZOOM_PERCENT, CANVAS_LOD_MAX_NODE_SCREEN_SIZE, CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT, CANVAS_LOD_SELECTED_DETAIL_LIMIT, CANVAS_LOD_MARKUP_CHUNK_SIZE, CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE, CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS, CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS, CONNECTION_HIT_SCREEN_TOLERANCE, CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT, CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT, CANVAS_BULK_MOVE_EDGE_THRESHOLD, ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD, BULK_MOVE_PERF_LOG_THRESHOLD_MS, SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE, SMART_ALIGNMENT_GUIDE_PADDING, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, CANVAS_FLOATING_TOOLBAR_GAP, NODE_FLOATING_TOOLBAR_WIDTH, NODE_FLOATING_TOOLBAR_HEIGHT, EDGE_FLOATING_TOOLBAR_WIDTH, EDGE_FLOATING_TOOLBAR_HEIGHT, CONTEXT_MENU_AUTO_HIDE_MARGIN, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP, DEFAULT_POWER_UNIT, DEFAULT_VOLTAGE_UNIT, DEFAULT_CURRENT_UNIT, DEFAULT_POWER_BASE_VALUE, EMPTY_TOPOLOGY, INITIAL_TOPOLOGY_STATUS, E_SECTION_OPTIONS, COMPONENT_LIBRARY_LABELS, SCALE_HANDLE_CONFIGS, GROUP_SCALE_HANDLE_CONFIGS, POWER_UNIT_OPTIONS, VOLTAGE_UNIT_OPTIONS, CURRENT_UNIT_OPTIONS, DEFAULT_CATEGORY_LIBRARIES, CUSTOM_CATEGORY_LIBRARY_BASES, PROTECTED_CATEGORY_LIBRARIES, DEVICE_TYPE_NAME_PATTERN, MAX_CUSTOM_DEVICE_TERMINALS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET, CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN, TERMINAL_TYPE_OPTIONS, CONTAINER_TERMINAL_ASSOCIATION_OPTIONS, PARAM_VALUE_TYPE_OPTIONS, PROJECT_PANEL_MIN_HEIGHT, PROJECT_PANEL_MAX_HEIGHT, PROJECT_PANEL_DEFAULT_HEIGHT, LEFT_PANEL_DEFAULT_WIDTH, RIGHT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH, STATUSBAR_DEFAULT_HEIGHT, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT, VALIDATION_PANEL_DEFAULT_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT, CONNECT_TERMINAL_SNAP_TOLERANCE, CONNECT_BUS_SNAP_TOLERANCE, connectTargetSearchBounds, findNodeTerminalSnapTarget, applyNodeTerminalSnap, pointOnBusForSnap, findNodeBusSnapTarget, SAMPLE_NODES, SAMPLE_EDGES, PROJECT_STORAGE_KEY, SCHEME_STORAGE_KEY, ACTIVE_PROJECT_STORAGE_KEY, DRAFT_PROJECT_STORAGE_KEY, REFRESH_RECOVERY_STORAGE_KEY, EMPTY_VOLTAGE_COLOR_KEY_SET, EMPTY_ID_LIST, EMPTY_EDGE_ID_LIST, EMPTY_MODEL_GROUPS, EMPTY_MODEL_GROUP_BY_ID, EMPTY_CANVAS_LAYOUT_UNITS, EMPTY_CANVAS_SELECTION, IMAGE_STORAGE_KEY, CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, CUSTOM_CATEGORY_LIBRARIES_STORAGE_KEY, CUSTOM_COMPONENT_LIBRARIES_STORAGE_KEY, DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY, CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, COLOR_DISPLAY_MODE_STORAGE_KEY, COLOR_PALETTE_STORAGE_KEY, MEASUREMENT_CONFIG_STORAGE_KEY, LEFT_PANEL_MODE_STORAGE_KEY, RIGHT_PANEL_MODE_STORAGE_KEY, LEFT_PANEL_WIDTH_STORAGE_KEY, RIGHT_PANEL_WIDTH_STORAGE_KEY, STATUSBAR_HEIGHT_STORAGE_KEY, VALIDATION_PANEL_HEIGHT_STORAGE_KEY, DEFAULT_GRAPH_TEMPLATE_TYPES, scheduleIdleWork, elementTreeCacheSignature, CONNECTION_REDRAW_SCOPE_LABELS, VOLTAGE_BASE_CLEAR_SCOPES, VOLTAGE_BASE_CLEAR_SCOPE_LABELS, VOLTAGE_BASE_SET_SCOPES, VOLTAGE_BASE_SET_SCOPE_LABELS, VOLTAGE_BASE_SET_PRESETS, VIEWPORT_RENDER_PADDING_RATIO, VIEWPORT_RENDER_MIN_PADDING, CANVAS_VIEWPORT_QUERY_SNAP_SIZE, NODE_SPATIAL_BUCKET_SIZE, nextSpatialQueryMark, expandViewBoxForRendering, snapRenderViewportBoundsForQuery, sameCanvasViewBox, canvasFrameHasHorizontalScrollableRange, canvasFrameHasVerticalScrollableRange, canvasFrameHasScrollableRange, renderedCanvasFullyFitsFrame, canvasFrameViewportSizeChanged, visibleCanvasViewBoxFromRects, canvasScrollScaleFromViewBox, estimatedViewportNodeScreenSize, canvasScrollEdgeInset, canvasScrollSurfaceSize, canvasDisplayOffset, canvasFramePaddingOffset, anchoredCanvasScrollPosition, anchoredCanvasNoScrollOffset, initialVisibleCanvasViewBox, fitWholeCanvasViewBox, boxesIntersect, sameRenderViewportBounds, VIEWPORT_RESULT_CACHE_LIMIT, viewportBoundsCacheKey, viewportResultCacheOwnersEqual, resetViewportResultCache, readViewportResultCache, writeViewportResultCache, mergeRenderViewportBounds, smartAlignmentAxisAnchors, bestSmartAlignmentAxisSnap, nodeRenderBounds, nodeIntersectsRenderViewport, spatialBucketKey, spatialBucketRange, buildNodeSpatialIndex, queryNodeSpatialIndex, compactPreviewNodes, PARAM_LABELS, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, PARAM_OPTIONS, STATIC_BUTTON_ACTION_LABELS, STATIC_BUTTON_COMMAND_LABELS, PARAM_OPTION_LABELS, parseStaticButtonTargetLayerValues, serializeStaticButtonTargetLayerIds, resolveStaticButtonTargetLayers, paramOptionsForSection, READONLY_E_PARAM_KEYS, BATCH_PARAM_EXCLUDED_KEYS, BATCH_PARAM_EXCLUDED_PREFIXES, canBatchEditParam, BATCH_GRAPH_PARAM_KEYS, BATCH_GRAPH_PARAM_PREFIXES, isBatchGraphCommonParamKey, isRedundantBatchCommonParamRow, COLOR_PARAM_KEY_PATTERN, isColorParamKey, BATCH_MEASUREMENT_GROUP_KEYS, BATCH_MEASUREMENT_GROUP_LABELS, measurementGroupCommonValue, measurementGroupWithCommonSetting, normalizeLegacyPowerSystemLabel, normalizeSavedProjectIndexes, normalizeSavedSchemeIndexes, normalizeStoredDraftProject, readActiveProjectPointer, savedSchemePathForId, findSavedSchemeByPath, findSavedProjectByActivePointer, activeProjectPointerPayload, draftProjectFromSavedSchemes, readRefreshRecoveryProject, writeRefreshRecoveryProject, clearRefreshRecoveryProject, readImageAssets, saveImageAsset, resolveNodeImage, resolveNodeForegroundImage, resolveProjectImage, imageAssetsToMap, localImageAssetsFromStorage, pointsToPreviewPath, backendJsonHeaders, backendErrorMessage, fetchBackendJson, backendJsonRequest, fetchBackendImageFolders, createBackendImageFolder, renameBackendImageFolder, deleteBackendImageFolder, fetchBackendImages, fetchAllBackendImages, deleteBackendImageAsset, uploadBackendImage } from "./appExtracted/appCoreCanvasUtilities";
import { normalizeProjectForBackend, normalizeSchemesForBackendRuntime, normalizeSchemesForBackend, serializeSchemesForStorage, findProjectRecordInSchemes, findProjectRecordByNameInScheme, clonePoint, cloneNodesForUndo, cloneEdgesForUndo, cloneGroupsForUndo, cloneTopologyForUndo, cloneTopologyErrorsForUndo, clampCanvasDimension, fetchBackendSchemes, schemePathQueryParam, savedProjectRecordIsSummary, fetchBackendProjectRecord, downloadBackendSchemeArchive, uploadBackendSchemeArchive, saveBackendProjectRecord, deleteBackendProjectRecord, saveBackendSchemeRecord, deleteBackendSchemeRecord, normalizeColorDisplayMode, serializeColorConfigForStorage, fetchBackendColorConfig, saveBackendColorConfigPayload, serializeDeviceLibraryForStorage, fetchBackendDeviceLibrary, saveBackendDeviceLibraryPayload, serializeMeasurementConfigForStorage, fetchBackendMeasurementConfig, saveBackendMeasurementConfigPayload, createLibraryPackage, normalizeLibraryPackage, deviceLibraryPayloadForPackageScope, normalizeIconLibraryPersistencePayload, importBackendImageLibraryPayload, groupDeviceTemplatesByCategoryLibrary, groupDeviceTemplatesByCategoryLibraryAndComponentLibrary, normalizeLibrarySearchText, categoryLibraryComponentLibraryKey, componentLibraryDisplayParts, componentLibraryDisplayName, filterSelectionTreeLabel, filterSelectionTemplateComponentLibraryKey, libraryTemplateMatchesSearch, filterCategoryLibraryComponentLibraryGroups, normalizeCategoryLibraryName, normalizeCustomCategoryLibraries, normalizeComponentLibraryName, defaultCategoryLibraryForComponentLibrary, isBuiltInCategoryLibrary, isBuiltInComponentLibrary, categoryLibraryOptionClass, componentLibraryOptionClass, sourceSelectClassName, selectableCategoryLibraryList, isValidComponentLibraryName, normalizeCustomComponentLibraries, templateResizeTransformValue, templateAllowsResizeTransform, DEFAULT_PARAMETER_ENUM_VALUES, DEFAULT_PARAMETER_ENUM_OPTIONS, normalizeEnumValueList, definitionRowIsEnum, defaultEnumValuesForDefinitionRow, defaultEnumOptionsForDefinitionRow, normalizeEnumOption, normalizeEnumValueType, enumValueTypeForDefinitionRow, enumDefinitionValueTypeForEnumValueType, parameterValueTypeLabelForDefinitionRow, rawEnumValuesForRow, normalizeEnumOptionsForRow, enumValueFromOptions, enumDisplayText, enumValuesForRow, normalizeDefinitionRowEnumFields, renderTypicalValueEditor, renderEnumValuesEditor, normalizeCustomDeviceTemplates, normalizeGraphTemplateTypeName, normalizeGraphTemplateTypes, cloneTemplatePoint, cloneGraphTemplateClipboard, normalizeGraphTemplateClipboard, normalizeGraphTemplates, graphTemplateTypeList, groupGraphTemplatesByType, filterGraphTemplatesByType, uniqueGraphTemplateName, normalizeDefinitionRows, normalizeDefinitionResizePermission, normalizeDefinitionOverrideSize, normalizeDefinitionOverrideTerminalType, normalizeDefinitionOverrideTerminalTypes, normalizeDefinitionOverrideTerminalAnchors, normalizeDeviceDefinitionOverrides, normalizeDeviceLibraryPersistencePayload, readLocalStorageJson, readCustomDeviceTemplates, readCustomCategoryLibraries, readCustomComponentLibraries, readDeviceDefinitionOverrides, readCustomGraphTemplateTypes, readCustomGraphTemplates, readLocalDeviceLibraryPersistencePayload, writeLocalDeviceLibraryPersistencePayload, readMeasurementConfig, writeMeasurementConfig, readColorDisplayMode, readColorPalette, readSidePanelMode, clampPanelDimension, clampFloatingDialogLayout, clampNodeDoubleClickDialogLayout, clampDeviceLibraryDialogLayout, readStoredPanelDimension, SCHEME_EXPORT_DIRECTORY_PICKER_ID, fetchBackendImageDataUrl, imageExportPathByIdFromAssets, exportSvgImageHref, nodeGeometryTransform, nodeUprightScaleTransform, nodeImageContentTransform, defaultBackgroundLayerIdsForProject, backgroundPageCanvasTransform, nodeTransformedHalfExtents, nodeScaledLocalHalfExtents, nodeRotateHandleControlPoints, nodeUprightRotateHandleControlPoints, scaleHandleControlPoint, nodeScaleHandleControlPoint, scaleHandleCursorClass, nodeUsesUprightStaticSelectionOutline, TEXT_DOUBLE_CLICK_KINDS, IMAGE_DOUBLE_CLICK_KINDS, NODE_DOUBLE_CLICK_DIALOG_DEDUPE_MS, NODE_DOUBLE_CLICK_CLOSE_SUPPRESS_MS, cloneNodeForDoubleClickDraft, stringRecordShallowEqual, nodeDoubleClickDraftHasModelChanges, isTextDoubleClickKind, isImageDoubleClickKind, nodeHasInteractionDoubleClickEditor, nodeHasTextDoubleClickEditor, nodeHasImageDoubleClickEditor, doubleClickDialogKindForNode, nodeUprightSelectionOutlineRect, emptySmartAlignmentAnchorMap, positionedNodeForSmartAlignment, nodeTerminalOutflowSmartAlignmentAnchors, nodeSmartAlignmentBounds, nodeVisualInteractionBounds, buildSvgTerminalMarkup, CustomComponentManagerTree, tokenArraysEqual, customSingleTerminalAnchorToken, stableSvgMarkupChunks, buildSvgDocument } from "./appExtracted/appPersistenceLibraryExport";
import { createSetNodes, createSetEdges, createSetGraphArrays, createPatchGraphNodes, createPatchGraphEdges, createUpdateGraphNodeById, createSetSchemes, createUpdateSmartAlignmentGuides, createSetCanvasPanning, createSetContextMarqueeSelection, createMarkGraphicContextMenuHandled, createConsumeGraphicContextMenuHandled, createOpenGraphicContextMenu, createSetOperationLogText, createEdgeListForNodeIds, createBuildSingleNodeDragCache, createOrderedNodeFromList, createOrderedNodesForIds, createAddRoutingNodesForConnectionEdge, createRoutingNodesForConnectionEdge, createRoutingNodesForConnectionEdges, createCachedConnectionStrokeColor, createConnectionLineStyle, createMeasurementGroupAnchorPoint, createMeasurementGroupLocalOffset, createMeasurementGroupCanvasPosition, createMeasurementGroupRenderMetrics, createIncludeMeasurementGroupBounds, createBuildMeasurementGroupMarkup, createBuildRoutableLineDragGhostRoutesForNodeIds, createBuildMultiNodeDragOverlayPreview, createRenderMultiNodeDragOverlay, createGroupTransformPreviewNodeFromSnapshot, createRenderGroupTransformPhotoPreview, createRenderSingleTransformRotateOriginGhost, createRenderTransformRotationTrajectory, createRenderBoundaryBusInternalConnector, createCollectCurrentModelVoltageColorKeys, createNearestVoltageColor, createFillMissingVoltageColorRows, createToggleColorDisplayMode, createOpenColorPaletteDialog, createSaveColorPalette, createResetEnergyColors, createResetVoltageColors, createUpdateEnergyColor, createSetVoltageColorRows, createUpdateVoltageColorRow, createDeleteVoltageColorRow, createAddVoltageColorRow, createResolveNodeStateVisual, createStatusStatesForNode, createNodeKindAllowsResizeTransform, createClearLibraryFlyoutCloseTimer, createHideLibraryFlyout, createScheduleLibraryFlyoutClose, createLibraryFlyoutStyle, createFitLibraryFlyoutsToVisibleArea, createToggleCategoryLibrary, createToggleCategoryLibraryComponentLibrary, createResolveConfiguredBackgroundLayerIds, createToggleBackgroundLayer, createElementTreeItemChildren, createUpdateElementTreeDraft, createClearElementTreeDraft, createElementTreeCommittedDraftValue, createCommitElementTreeInputOnEnter, createMarkBusTerminalSyncDirty, createBusNodeIdsFromEdges, createMarkBusTerminalSyncDirtyForEdges, createBusTerminalSyncNodeIdsForGraphPatch, createSynchronizePendingBusTerminalsWithGraphStore, createApplyCanvasPanningVisualOffset, createCancelCanvasBoundsScrollSyncPendingRelease, createClearCanvasBoundsScrollSyncPending, createReleaseCanvasBoundsScrollSyncPending, createMarkCanvasBoundsScrollSyncPending, createCanvasBoundsForGraphContent, createApplyCanvasBounds, createRejectAutoCanvasExpansionForContent, createCanvasBoundsForAutoExpandedGraphContent, createTranslateStoredEdgeGeometryBy, createShiftCachedRoutesForCanvasOrigin, createLeftTopCanvasOriginShiftForContent, createMinimumCanvasBoundsForResizeEdge, createClampNodePositionToExpandableBounds, createClampPointToExpandableBounds, createClampEdgeGeometryToExpandableBounds, createCanvasNoScrollOffsetForCanvasResizeAnchor, createSetCanvasFrameScrollPosition, createCenterCanvasFrameScrollPosition, createSyncCanvasFrameScrollToViewBox, createSyncCanvasFrameScrollToCanvasResizeCommitAnchor, createSyncCanvasFrameScrollToWheelAnchor, createCurrentViewBoxFromCanvasFrameScroll, createScheduleCanvasVisibleViewBoxUpdate, createHandleCanvasFrameScroll, createUpdateCanvasFrameViewportSize, createUpdateCanvasFrameViewportAndVisibleBox, createNodeImage, createRenderNodePreviewImageContent, createBuildNodePreviewImageMarkup, createBuildConnectPreviewPath, createBuildRoutableLinePreviewPath, createPatchStoredRouteStoreForEdgeIds, createMarkRouteEdgesDirty, createMarkStoredRouteEdgesDirty, createEdgeListsHaveSameOrder, createEdgeReferenceDiffIds, createDirtyEdgeIdsAfterMove, createDirtyEdgeIdsForMovedLocalRoutes, createDirtyEdgeIdsAfterBulkMove, createLogBulkMoveCommitStats, createBuildMovedNodeUpdates, createNextNodesForMovedGraphCommit, createEdgePatchFromCandidateEdges, createGraphStorePatchStillCurrent, createShouldRunSynchronousMoveBlockerRepair, createMarkGraphDirtyForInteractiveCommit, createPatchSingleTerminalAnchorFromPoint, createRebuildEdgeUpdatesAfterNodeGeometryChange, createRebuildEdgesAfterNodeGeometryChange, createStoredRouteEndpointMatchPoint, createEndpointMatchedRoutePointsForEdge, createEdgeWithFrozenBusEndpointPoints, createPreviewStoredRoutePointsForEdge, createClearLocalSchemeModelCache, createRememberPersistedSchemesPayload, createRefreshSchemesFromBackendDirectory, createHandleBackendSchemeMutationFailure, createSaveSchemeTreeToBackend, createPersistSchemeTreeToBackend, createReplaceSchemeTreeInBackend, createPersistRefreshRecoveryNow, createClearRecordSelection, createBlurLayerManagementDropdownFocus, createSelectSingleScheme, createSelectSingleProject, createToggleSchemeSelection, createToggleProjectSelection, createUndoGraphSnapshotPatchPlan, createApplyUndoGraphSnapshot, createPushUndoSnapshot, createUniqueUndoScopeIds, createPushNodeOnlyUndoSnapshot, createSyncExistingNodesWithTemplateDefinitions, createUpdateMeasurementConfig, createPrepareMeasurementConfigDraft, createOpenMeasurementConfigDialog, createCloseMeasurementConfigDialog, createSaveMeasurementConfigDialog, createUpdateMeasurementType, createAddMeasurementType, createDeleteMeasurementType, createSetMeasurementProfileItems, createCreateMeasurementProfileItem, createAddMeasurementProfileItem, createUpdateMeasurementProfileItem, createDeleteMeasurementProfileItem, createMoveMeasurementProfileItem, createUpdateProjectMeasurementsWithUndo, createAddDefaultMeasurementsToNode, createRemoveMeasurementsFromNode, createMeasurementGroupShellOffsetForNode, createMeasurementSourcePointForNodeItem, createMeasurementTypeOptionsForMeasurementGroup, createCreateMeasurementItemForNode, createUpdateMeasurementGroupById, createUpdateSelectedMeasurementGroup, createUpdateSelectedMeasurementGroups, createAddMeasurementItemToGroup, createAddMeasurementItemToNode, createUpdateMeasurementItem, createRemoveMeasurementItem, createCreateMeasurementEditorGroupForPosition, createUpdateMeasurementEditorGroupSettings, createUpdateMeasurementEditorDraftItem, createAddMeasurementEditorDraftItem, createRemoveMeasurementEditorDraftItem, createMoveMeasurementEditorDraftItem, createUpdateMeasurementEditorDraftItemPosition, createDuplicateMeasurementEditorItemNames, createConfirmMeasurementEditorDialog, createRenderSelectedNodeMeasurementTable, createBeginMeasurementDrag, createUpdateMeasurementDrag, createFinishMeasurementDrag } from "./appExtracted/appGraphMeasurementFactories";
import { createFlushMeasurementConfigDialogDraftInputs } from "./appExtracted/appGraphMeasurementFactories";
import { createEnsureDraggingUndoSnapshot, createRequestCanvasFrameCenter, createUndoLastOperation, createCanvasPointerKeyboardShortcutAvailability, createRouteForCurrentEdgeSave, createCurrentProject, createAdjustSelectedDisplayLayer, createClearTransientSelectionState, createWriteOperationLog, createRequireEditMode, createPersistDeviceLibraryChange, createPersistTemplateLibraryChange, createConnectionCommitFailureMessage, createSwitchInspectorTabForCanvasSelection, createSelectCanvasGraphics, createSetModifierSelectionPress, createToggleNodeSelectionFromModifierClick, createToggleEdgeSelectionFromModifierClick, createToggleSelectionFromModifierClick, createRestoreCanvasSelectionSnapshot, createRestoreCanvasSelectionSnapshotWithInspector, createStartModifierSelectionPress, createCancelModifierSelectionPress, createFinishModifierSelectionPress, createStartNodeLabelDrag, createStartNodeLabelRotateDrag, createFinishNodeLabelDrag, createFinishNodeLabelRotateDrag, createSetSelectedNodeLabelDisplayMode, createToggleSelectedNodeLabelDisplay, createCopySelection, createCutSelection, createPasteSelection, createCreateGraphTemplateType, createCreateGroupDeviceIconSvg, createGroupDeviceTerminalAnchor, createGroupDeviceTerminalSortKey, createGroupDeviceTerminalAssociationFor, createGroupDeviceExternalTerminals, createValidateGroupDeviceIconReplacement, createReplaceBuiltinDeviceIconOverride, createOpenGroupDeviceDefinitionDialog, createConfirmCreateDeviceFromGroup, createConfirmReplaceDeviceIconFromGroup, createOpenAddTemplateDialog, createCancelTemplateDialog, createConfirmAddGraphTemplate, createDeleteGraphTemplate, createDeleteGraphTemplateType, createDropGraphTemplate, createFinishMarqueeSelectionFromPoints, createStartContextMarqueeSelection, createOpenFilterSelectionDialog, createToggleFilterSelectionType, createToggleFilterSelectionItem, createConfirmFilterSelectionDialog, createFinishMarqueeSelection, createDeleteSelection, createDeleteSelectedGraphicsFromCanvas, createGroupSelectedGraphics, createUngroupSelectedGraphics, createManualPointDeltaForEdge, createRoutePreserveEdgeIdsForMovedNodes, createRouteSnapshotEdgesForMove, createRouteTouchesExpandedBoxes, createBoundsForNodeSet, createMergeNodeUpdateLists, createMergeUniqueEdgesById, createCompleteNodeListForPartialPatch, createIsWholeActiveLayerMove, createInternalMoveEdgeIdsForMovedNodes, createExternalMoveCandidateEdges, createInternalMoveCandidateEdges, createTranslateInternalMoveCandidateEdges, createTranslateWholeMoveCandidateEdges, createInternalRoutableLineNodeUpdatesForMove, createRoutableLineRouteCandidateIdsForMovedNodes, createRebuildRoutableLineNodeUpdatesForChangedNodes, createScheduleDeferredRoutableLineRouteRepair, createLocalRouteOptimizationEdges, createLocalRouteOptimizationCandidateEdges, createRoutePointsForMovedNodeBlockers, createRoutePointsForMovedEdgesBlockedByStationaryNodes, createRoutePointsNearOriginalMovedNodes, createAdjustEdgesAfterNodeMove, createRebuildSingleAffectedConnectionRoute, createSynchronousEdgeAdjustmentCandidates, createShouldAdjustEdgeSynchronouslyAfterMove, createMergeAdjustedCandidateEdges, createTerminalReconcileNodeScope, createFinalizeMovedNodeEdgesFast, createOptimizeMovedNodeEdgeRoutes, createShouldRunDeferredMoveOptimization, createScheduleMovedEdgeOptimization, createScheduleDeferredMovedConnectionRepair, createMoveRouteRepairSeedEdges, createLightweightMovedEndpointRoute, createPatchCachedRoutesForHighFanoutMove, createPatchCachedRoutesForBulkTranslation, createPatchCachedRoutesForWholeMove, createPatchCachedRoutesForInternalMove, createStoredRouteDirtyIdsForMove, createBuildBulkMovePlan, createCommitFastMovedGraphPatches, createUpdateMouseStatus, createUpdateMultiNodeDragOverlayTransform, createShowImperativeMultiNodeDragOverlay, createHideImperativeMultiNodeDragOverlay, createResetMultiNodeDragOverlayTransform, createBuildSingleNodeDragPreviewNodeMarkup, createClearImperativeNodeDragEdgePreview, createShowImperativeSingleNodeDragPreview, createCssSelectorEscape, createClearImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOriginLines, createSetImperativeSingleNodeDragOrigin, createBindCanvasNodeElement, createHideImperativeSingleNodeDragPreview, createSingleNodeDragPreviewNodeFor, createSingleNodeDragRelevantEdges, createSingleNodeDragPreviewBounds, createSingleNodeDragEdgeTouchesBounds, createSingleNodeDragViewportLocalEdgesByScan, createSingleNodeDragScopedEdges, createSimpleOrthogonalDragPreviewPoints, createRoutableLineIdsConnectedToNodeIds, createRoutableLineEndpointPreviewRoutePoints, createBuildRoutableLinePreviewRoutesForNodeUpdates, createBuildRoutableLineEndpointPreviewNodeUpdates, createBuildTranslatedInternalRoutableLineDragPreviewRoutes, createBuildRoutableLineDragPreviewRoutes, createBuildCachedSingleNodeDragPreviewRoutes, createBuildDragPreviewEndpointPoints, createConnectionEndpointPreviewRoutePoints, createBuildLightweightNodeDragPreviewRoutes, createBuildLightweightNodeDragPreviewRouteMarkup, createSyncImperativeNodeDragPreviewPaths, createUpdateNodeDragLightweightEdgePreview, createSingleNodeDragInteractionNodes, createMultiNodeDragInteractionNodes, createUpdateImperativeNodeDragDropHint, createFindSingleNodeDragSnapTargetAtDelta, createFindMultiNodeDragSnapTargetAtDelta } from "./appExtracted/appSelectionDragFactories";
import { createUpdateSingleNodeDragImperativePreview, createStartDraggingState, createFlushConnectPreviewDom, createSetConnectPreviewDom, createApplyConnectPreviewState, createScheduleConnectPreviewPoint, createApplyRoutableLinePreviewState, createScheduleRoutableLinePreviewPoint, createReleaseRoutableLinePreviewAxisLock, createLockRoutableLinePreviewAxis, createAppendRoutableLinePreviewManualPoint, createResolveRoutableLinePreviewPoint, createResetRoutableLinePreviewState, createScheduleRewirePreviewPoint, createResetConnectPreviewState, createReleaseConnectPreviewAxisLock, createConnectSourceEndpointPoint, createLockConnectPreviewAxis, createAppendConnectPreviewManualPoint, createResolveConnectPreviewPoint, createBoundedDeltaForNodes, createBoundedDeltaForMultiNodeInteractiveMove, createNodeMoveGeometryInsideCanvas, createNearestBoundarySafeDelta, createBoundedDeltaForMoveGeometry, createCommitSafeDeltaForDraggingState, createCanvasBoundsForMovedNodeDelta, createDragBoundsForSmartAlignment, createTerminalOutflowAnchorsForSmartAlignmentDrag, createComputeSmartAlignmentSnap, createComputeNodeDragPreviewDelta, createComputeNodeDragDelta, createApplyNodeDragMove, createScheduleNodeDragMove, createFlushPendingNodeDragMove, createClearNodeDragMoveSchedule, createClearKeyboardMoveCommitSchedule, createClearKeyboardNudgeSchedule, createClearDraggingMoveState, createCancelActiveEditInteractions, createEnterBrowseMode, createRequestEnterBrowseMode, createToggleInteractionMode, createFinishDraggingMove, createFinishNodeDrag, createFinishTransformDrag, createFinishKeyboardMove, createScheduleKeyboardMoveCommit, createApplyKeyboardMoveDelta, createFlushPendingKeyboardMove, createKeyboardMoveActiveFrameDelta, createAppendPendingKeyboardMoveDelta, createScheduleKeyboardNudgeFrame, createReleaseKeyboardMoveKey, createStartKeyboardMoveSession, createNudgeSelectionByKeyboard, createMoveSelection, createUndoScopeForNodeFootprintPatch, createUpdateSelectedNode, createCommitNodeFootprintUpdates, createAssignSelectedNodesToModelLayer, createOpenLayerAssignmentDialog, createApplyLayerAssignmentDialog, createRotateSelectedLayoutUnits, createMirrorSelectedNodes, createUpdateCanvasSize, createCommitCanvasSizeDraft, createResetCanvasSizeDraft, createHandleCanvasSizeBlur, createHandleCanvasSizeKeyDown, createUpdateParam, createApplyBatchCommonParamPatch, createApplyBatchCommonParam, createApplyBatchCommonMeasurementGroupSetting, createCommitElementTreeNodeIdentity, createCommitElementTreeContainerChildParam, createTerminalVbaseFallback, createUpdateTerminalVbase, createRenderParamHeader, createRenderNodeDoubleClickDeviceParamRows, createRememberNodeDoubleClickDialogGuard, createSuppressNodeDoubleClickDialogEvent, createFinishNodeDoubleClickDialogPointerOperation, createStopNodeDoubleClickDialogEvent, createCurrentNodeDoubleClickDialogRect, createStartNodeDoubleClickDialogDrag, createStartNodeDoubleClickDialogResize, createCancelNodeDoubleClickDialog, createConfirmNodeDoubleClickDialog, createRenderNodeDoubleClickDialog, createContextMenuPlacement, createContextMenuStyle, createContextMenuClassName, createStopSidePanelEventPropagation, createSetSidePanelMode, createPointerClientTargetInside, createPointerInsideElementRect, createUpdateAutoPanelVisibility, createActivateInspectorFromCanvas, createOpenMeasurementEditorForNode, createHandleSidePanelPointerLeave, createHideAutoPanelsFromWorkspace, createAppendDistinctStaticDrawingPoint, createRenderStaticBoxDrawingPreview, createStartInteractiveStaticDrawing, createCancelInteractiveStaticDrawing, createFinishInteractiveStaticDrawing, createAppendStaticDrawingPoint, createUpdateInteractiveStaticDrawingPreview, createRenderInteractiveStaticDrawingPreview, createStartLibraryDevicePlacement, createStartLibraryGraphTemplatePlacement, createCancelLibraryPlacement, createUpdateLibraryPlacementPreview, createClearLibraryPlacementPreview, createPlaceLibraryDeviceAtPoint, createCommitLibraryPlacementAtPoint, createRenderLibraryPlacementPreview, createStartSidePanelResize, createStartCanvasResize, createStartCanvasResizeFromRightOverlay, createStartCanvasResizeFromLeftOverlay, createStartCanvasResizeFromBottomOverlay, createStartCanvasResizeFromTopOverlay, createStartStatusbarResize, createCurrentTopologyWarningPanelRect, createStartTopologyWarningPanelDrag, createStartTopologyWarningPanelResize, createRenderSidePanelModeControls, createRenderSidePanelEdgeTrigger, createNormalizeStaticBoxDimension, createToLocalNodePoint, createSingleTransformNodeUpdate, createSignedScaleFromRotatedHandleDelta, createSignedScaleFromUprightHandleDelta, createProportionalSignedScaleFromHandleDelta, createProportionalSignedScaleFromUprightHandleDelta, createCurrentStoredRoutePointsForEdge, createBuildMirrorLayoutUnitEdgeUpdates, createBuildRotateLayoutUnitEdgeUpdates, createBuildGroupTransformEdgeUpdates, createOverlayEdgeUpdatesForTransform, createStartGroupTransformDrag, createStartSingleTransformDrag, createStartGroupMoveDrag, createBuildGroupTransformNodeUpdates, createRotateLayoutUnitNodeUpdates, createMirrorLayoutUnitNodeUpdates, createBusAnchorFromEvent, createBusAnchorFromPoint, createIsPointOnBus, createIsPointNearBus, createFindRewireTargetAtPoint, createFindConnectTargetAtPoint, createFindRoutableLineEndpointTargetAtPoint } from "./appExtracted/appCanvasInteractionFactories";
import { createCommitRoutableLineDevice, createStartRoutableLineFromTerminal, createFinishRoutableLineToTarget, createUpdateRoutableLineEndpointDrag, createStartRoutableLineEndpointDrag, createFinishRoutableLineEndpointDrag, createCommitNewConnectionEdge, createFinishConnectToTarget, createFinishRewiring, createHandleDrop, createHandleRoutableLineNodePointerDown, createHandleNodePointerDown, createHandleRoutableLineNodePathPointerDown, createHandlePointerMove, createFinishCanvasPanning, createStartCanvasPanning, createHandleCanvasPointerDownCapture, createClientPointInsideRenderedCanvas, createFocusCanvasKeyboardShortcutHost, createWheelZoomAnchorFromClient, createFlushPendingWheelZoom, createScheduleWheelZoom, createZoomCanvasFromWheelEvent, createHandleWheel, createDeleteSelected, createRunContextMenuAction, createReadjustMovedBusConnectionRoutes, createReadjustActiveLayerBusEndpointRoutes, createCommitLayoutNodePositions, createApplySelectedNodeLayout, createAutoSpreadCanvasGraphics, createAutoAlignCanvasGraphics, createDefaultVoltageBaseSetValue, createRecommendedVoltageBaseSetMode, createDefaultVoltageBaseTerminalValues, createDefaultVoltageBaseTerminalKey, createActiveVoltageBaseTerminalValues, createSetVoltageBaseTerminalValue, createMergeVoltageBaseSetResults, createVoltageBaseSetReady, createVoltageBaseSetResultForScope, createOpenVoltageBaseSetDialog, createConfirmVoltageBaseSetDialog, createOpenVoltageBaseClearDialog, createConfirmVoltageBaseClearDialog, createConnectionRedrawViewportBounds, createConnectionRedrawEdgeIdsForScope, createConnectionRedrawLineNodeIdsForScope, createConnectionRedrawTargetsForScope, createRedrawConnectionRoutes, createOpenConnectionRedrawDialog, createConfirmConnectionRedrawDialog, createAlignSelected, createDistributeSelected, createToggleSchemeExpanded, createPromptUniqueRecordName, createCloneProjectRecordForPaste, createSchemePathForScheme, createSchemePathForProject, createSchemePathForRecord, createCloneSchemeRecord, createCloneSchemeRecordWithName, createCloneSchemeRecordForPaste, createClearActiveProjectDisplay, createLoadSavedProject, createLoadSavedProjectRecord, createRequestUnsavedChangeAction, createRequestLoadSavedProject, createResolveUnsavedChangeAction, createCreateSchemeRecord, createRenameSchemeRecord, createDuplicateSchemeRecord, createDeleteSchemeRecord, createCopySelectedRecord, createDeleteSelectedRecords, createCopyProjectRecord, createCopySchemeRecord, createPasteSchemeClipboardRecord, createPasteProjectClipboardRecord, createPasteSelectedRecord, createCommitProjectRecordMove, createResolveRecordPasteConflict, createMoveProjectRecordToScheme, createMoveSchemeRecordToScheme, createSaveActiveProjectPointer, createSetActiveLayer, createNextDefaultModelLayerName, createAddModelLayer, createClearLayerNameDraft, createCommitModelLayerName, createHandleLayerNameInputKeyDown, createToggleModelLayerVisibility, createSetAllModelLayersVisibility, createMoveModelLayer, createDeleteModelLayer, createRenderDeviceDefinitionMeasurementPanel, createRenderMeasurementConfigDialog, createRenderMeasurementEditorDialog, createSaveCurrentProject, createRenameProjectRecord, createDuplicateProjectRecord, createDuplicateSelectedProjectRecords, createDuplicateSelectedSchemeRecords, createDeleteProjectRecord, createCreateBlankProject, createLocateTopologyError, createRunTopologyCalculation, createGetEdgeEndpointPoint, createCenterViewOnPoint, createViewportCenterAnchorForPoint, createSetViewBoxAtViewportCenter, createCenterViewBoxOnPoint, createCenterViewOnPointAtZoom, createZoomViewportAtCenter, createResetViewportZoom, createFitWholeCanvasToFrame, createFitWholeCanvasFromBlankDoubleClick, createFitViewToBounds, createFitViewToContent, createFocusElementTreeItem, createJumpToElementTreeItem, createOpenElementTreeItemContextMenu, createSetEdgeManualPoints, createRouteManualPoints, createFinishManualPathDrag, createTidySelectedEdgeRoute, createTidyRoutableLineRoute } from "./appExtracted/appProjectCanvasFactories";
import { createOpenEdgeContextMenu, createCaptureCanvasPointer, createStartManualSegmentDrag, createStartManualPointDrag, createRouteSegmentPointerDistance, createFindEditableRouteSegmentIndex, createConnectionHitTolerance, createFindConnectionRouteHitAtPoint, createInsertManualBendAtPoint, createInsertManualBendFromPointer, createAddManualBendFromContextMenu, createAddRoutableLineBendFromContextMenu, createInsertManualBendFromEdgePath, createHandleEdgePathPointerDown, createDeleteManualBendPoint, createSetRoutableLineManualPathPoints, createInsertRoutableLineBendAtPoint, createInsertRoutableLineBendFromPointer, createStartRoutableLineSegmentDrag, createStartRoutableLinePointDrag, createDeleteRoutableLineBendPoint, createStartConnectFromTerminal, createFinishTerminalPress, createHandleTerminalPointerDown, createEnsureSavedBeforeExport, createSvgExportReferencedImageHrefById, createLoadSvgImageExportPathById, createExportSvg, createExportEFile, createExportSvgFile, createExportJsonFile, createExportEDeviceDefinitionFile, createImportEDeviceDefinitionFile, createIsProjectFilePayload, createCreateImportedSchemeRecord, createExportProjectRecordFile, createExportCurrentModelFile, createOpenModelImportFilePicker, createOpenSchemeImportFilePicker, createMergeImportedSchemeIntoExisting, createCommitImportedSchemeRecord, createApplyBackendSchemeArchiveImport, createImportSchemeFile, createCommitImportedModelRecord, createImportModelFile, createResolveDuplicateSchemeImport, createResolveDuplicateModelImport, createExportSchemeRecord, createChooseImage, createApplyExistingImage, createApplyIconLibraryCatalogIcon, createClearSelectedImage, createClearSelectedImageForNode, createCreateImageFolder, createRenameImageFolder, createDeleteImageFolder, createStartProjectRecordDrag, createFinishProjectRecordDrag, createStartSchemeRecordDrag, createFinishSchemeRecordDrag, createRenderProjectSchemeNode, createOpenBlankProjectLibraryContextMenu, createCustomDeviceDefaultStateVisualDraft, createSnapCustomDeviceTerminalAnchor, createCustomDeviceTerminalConnectorSegment, createUpdateCustomDeviceTerminalAnchor, createUpdateCustomDeviceStateDraftRow, createAddCustomDeviceStateDraftRow, createDeleteCustomDeviceStateDraftRow, createUpdateCustomDeviceTerminalAnchorFromPreview, createDefinitionDefaultStateVisualDraft, createSnapDefinitionTerminalAnchor, createDefinitionTerminalConnectorSegment, createUpdateDefinitionTerminalAnchor, createUpdateDefinitionTerminalAnchorFromPreview, createLoadDefinitionTemplateDraft, createFinishDeviceLibraryDialogPointerOperation, createCurrentDeviceLibraryDialogRect, createDeviceLibraryDialogStyle, createStartDeviceLibraryDialogDrag, createStartDeviceLibraryDialogResize, createStopDeviceLibraryDialogEvent, createOpenDeviceDefinitionDialog, createCloseDeviceDefinitionDialog, createCloseCustomDeviceDialog, createRequestCloseCustomDeviceDialog, createSetCustomDeviceDraftCleanBaseline, createCustomDeviceDraftHasUnsavedChanges, createRevertCustomDeviceDraftCurrentTab, createRevertCustomDeviceDraftAll, createToggleDefinitionGroup, createToggleDefinitionComponentLibrary, createToggleElementTreeGroup, createToggleElementTreeDeviceGroup, createUpdateDefinitionDraftRow, createAddDefinitionDraftRow, createDeleteDefinitionDraftRow, createUpdateDefinitionStateDraftRow, createAddDefinitionStateDraftRow, createDeleteDefinitionStateDraftRow, createUpdateSelectedDefinitionResizePermission, createSaveDeviceDefinitionStateVisualDraft, createSaveDeviceDefinitionVisualDraft, createSaveDeviceDefinitionDraft, createResetDeviceDefinitionDraft, createUpdateDefinitionComponentLibraryCommonParamExport, createUpdateCustomDraftTerminalCount, createChooseCustomDeviceBackground, createChooseDefinitionTemplateIcon, createChooseStateVisualImage, createChooseStateIconDrawingImport, createUpdateStateIconDrawingElement, createUpdateStateIconDrawingElements, createStateIconDrawingPointer, createStateIconDrawingSelection, createComputeStateIconDrawingSmartAlignmentSnap, createStartStateIconDrawingDrag, createDragStateIconDrawingSelection, createStopStateIconDrawingDrag, createDeleteSelectedStateIconDrawingElements, createStateIconDrawingKeyDown, createAddStateIconDrawingElement, createDeleteStateIconDrawingElement, createOpenStateIconDrawingDialog, createApplyStateIconDrawingDialog, createEnsureCustomComponentTreeExpanded, createCancelPendingCustomComponentTemplateLoad, createSelectCustomCategoryLibrary, createSelectCustomComponentLibrary, createSelectCustomComponentTemplate, createStartCustomComponentCreate, createConfirmCustomLibraryCreateDialog, createNextCustomCategoryLibraryName, createCreateCustomCategoryLibrary, createDeleteCustomCategoryLibrary, createNextCustomComponentLibraryName, createCreateCustomComponentLibrary, createDeleteCustomComponentLibrary, createRenameSelectedCustomDeviceTreeItem, createDeleteSelectedCustomDeviceTreeItem, createNextCustomTemplateKind, createSaveCustomDeviceTemplate, createSaveBuiltinDeviceDefinitionFromCustomDraft, createSaveComponentLibraryDefinition, createSaveCustomDeviceDefinitionDialog } from "./appExtracted/appDeviceDefinitionFactories";
import { createRenderStateVisualPager, createRenderDeviceDefinitionVisualPanel, createRenderGraphTemplatePreview, createRenderLibraryTemplateButton, createRenderLibraryFlyout, createLodNodeFromEvent, createLodTerminalIdFromEvent, createHandleLodNodePointerDown, createHandleLodNodeContextMenu } from "./appExtracted/appDeviceDefinitionRenderers";
import { createOpenNodeDoubleClickEditor, createHandleLodNodeDoubleClick, createClampFloatingToolbarPosition, createToolbarOverlapArea, createCanvasRectToSurfaceCssRect, createRotateControlAvoidRectFromCanvasPoints, createPlaceFloatingToolbar, createRenderMeasurementGroup, createHandleMinimapNavigate, createCenterSelectedInView, createFitViewToSelection, createClearStaticButtonFeedbackTimer, createSetStaticButtonFeedback, createClearStaticButtonFeedback, createBeginStaticButtonPointerFeedback, createResolveStaticButtonTargetProject, createExecuteStaticButtonCommand, createExecuteStaticButtonAction, createHandleStaticButtonClick, createBeginReadonlyBackgroundStaticButtonPointerFeedback, createRenderReadonlyBackgroundPage, createOpenTopologyWarningPanel, createAppHookCallback1, createAppHookCallback2, createAppHookCallback3, createAppHookCallback4, createAppHookCallback5, createAppHookCallback6, createAppHookCallback7, createAppHookCallback8, createAppHookCallback9, createAppHookCallback10, createAppHookCallback11, createAppHookCallback12, createAppHookCallback13, createAppHookCallback14, createAppHookCallback15, createAppHookCallback16, createAppHookCallback17, createAppHookCallback18, createAppHookCallback19, createAppHookCallback20, createAppHookCallback21, createAppHookCallback22, createAppHookCallback23, createAppHookCallback24, createAppHookCallback25, createAppHookCallback26, createAppHookCallback27, createAppHookCallback28, createAppHookCallback29, createAppHookCallback30, createAppHookCallback31, createAppHookCallback32, createAppHookCallback33, createAppHookCallback34, createAppHookCallback35, createAppHookCallback36, createAppHookCallback37, createAppHookCallback38, createAppHookCallback39, createAppHookCallback40, createAppHookCallback41, createAppHookCallback42, createAppHookCallback43, createAppHookCallback44, createAppHookCallback45, createAppHookCallback46, createAppHookCallback47, createAppHookCallback48, createAppHookCallback49, createAppHookCallback50, createAppHookCallback51, createAppHookCallback52, createAppHookCallback53, createAppHookCallback54, createAppHookCallback55, createAppHookCallback56, createAppHookCallback57, createAppHookCallback58, createAppHookCallback59, createAppHookCallback60, createAppHookCallback61, createAppHookCallback62, createAppHookCallback63, createAppHookCallback64, createAppHookCallback65, createAppHookCallback66, createAppHookCallback67, createAppHookCallback68, createAppHookCallback69, createAppHookCallback70, createAppHookCallback71, createAppHookCallback72, createAppHookCallback73, createAppHookCallback74, createAppHookCallback75, createAppHookCallback76, createAppHookCallback77, createAppHookCallback78, createAppHookCallback79, createAppHookCallback80, createAppHookCallback81, createAppHookCallback82, createAppHookCallback83, createAppHookCallback84, createAppHookCallback85, createAppHookCallback86, createAppHookCallback87, createAppHookCallback88, createAppHookCallback89, createAppHookCallback90, createAppHookCallback91, createAppHookCallback92, createAppHookCallback93, createAppHookCallback94, createAppHookCallback95, createAppHookCallback96, createAppHookCallback97, createAppHookCallback98, createAppHookCallback99, createAppHookCallback100, createAppHookCallback101, createAppHookCallback102, createAppHookCallback103, createAppHookCallback104, createAppHookCallback105, createAppHookCallback106, createAppHookCallback107, createAppHookCallback108, createAppHookCallback109, createAppHookCallback110, createAppHookCallback111, createAppHookCallback112, createAppHookCallback113, createAppHookCallback114, createAppHookCallback115, createAppHookCallback116, createAppHookCallback117, createAppHookCallback118, createAppHookCallback119, createAppHookCallback120, createAppHookCallback121, createAppHookCallback122, createAppHookCallback123, createAppHookCallback124, createAppHookCallback125, createAppHookCallback126, createAppHookCallback127, createAppHookCallback128, createAppHookCallback129, createAppHookCallback130, createAppHookCallback131, createAppHookCallback132, createAppHookCallback133, createAppHookCallback134, createAppHookCallback135, createAppHookCallback136, createAppHookCallback137, createAppHookCallback138, createAppHookCallback139, createAppHookCallback140, createAppHookCallback141, createAppHookCallback142 } from "./appExtracted/appToolbarHookFactories";
import { mergeBuiltinSharedIconAssets } from "./sharedIconLibrary";
import { VoltageLevelDialog } from "./VoltageLevelDialog";
import { createProgrammaticAddDevice, createProgrammaticCreateScheme, createProgrammaticCreateBlankProject, createProgrammaticSelectDevices, createProgrammaticGroupSelected, createProgrammaticDeleteDevices, createProgrammaticUpdateDeviceProperty, createProgrammaticSave, createProgrammaticSaveSelectionAsTemplate } from "./appExtracted/appControlFactories";
import {
  ICON_LIBRARY_PAGE_SIZE,
  createInitialIconLibraryPickerState,
  fetchIconLibraryCatalog,
  fetchIconLibraryManifest,
  flattenIconLibraryManifest,
  type IconLibraryPickerState
} from "./iconLibraryCatalog";
import { imagePickerUsesLibraryTabs, renderAppView } from "./appExtracted/appView";
import { MemoizedCanvasArea } from "./appExtracted/appCanvasArea";
import { useAppStateBatch } from "./appExtracted/appStateBatch";
import { useCanvasViewportBatch } from "./appExtracted/appCanvasViewportBatch";
import { useRenderBatch } from "./appExtracted/appRenderBatch";
type LibraryPackageDialogMode = "export" | "import";
type PendingUserCustomizationImport = {
  fileName: string;
  imported: Partial<UserCustomizationSnapshot>;
  mode: UserCustomizationImportMode;
  preview: UserCustomizationImportPreview;
};

export function App() {
  const __renderCount = useRef(0);
  __renderCount.current++;
  const __currentRender = __renderCount.current;
  const __appScope: Record<string, any> = {};
// 稳定 ref 持有当前渲染的 __appScope，供空依赖 useEffect（如 runtime WS）闭包读取最新状态。
// __appScope 每帧重建，直接闭包捕获会冻结在首次渲染（activeProjectKey 等永远为旧值）。
const __appScopeRef = useRef(__appScope);
__appScopeRef.current = __appScope;
Object.assign(__appScope, { __appScopeRef });
Object.assign(__appScope, APP_STATIC_SCOPE);
Object.assign(__appScope, { stateIconDrawingFrameRect, stateIconDrawingInitialFrame });
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

// IndexedDB 迁移：应用启动时自动执行 localStorage → IndexedDB 迁移
useEffect(() => {
  import("./lib/deviceLibraryMigration").then(async ({ migrateFromLocalStorage, getMigrationStatus }) => {
    const status = await getMigrationStatus();
    if (status?.completed) return;

    console.log("[IndexedDB] 开始迁移图元库数据...");
    const result = await migrateFromLocalStorage();

    if (result.success) {
      console.log(`[IndexedDB] 迁移完成:`, result.migrated, `耗时 ${result.duration}ms`);
    } else {
      console.warn(`[IndexedDB] 迁移完成但有错误:`, result.errors);
    }
  }).catch((error) => {
    console.warn("[IndexedDB] 迁移失败:", error);
  });
}, []);

const svgRef = useRef<SVGSVGElement | null>(null); Object.assign(__appScope, { svgRef });
const imageInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { imageInputRef });
const imageArchiveInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { imageArchiveInputRef });
const customDeviceImageInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { customDeviceImageInputRef });
const customComponentSvgImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { customComponentSvgImportInputRef });
const definitionTemplateIconInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { definitionTemplateIconInputRef });
const definitionDeleteAllParametersRequestedRef = useRef(false); Object.assign(__appScope, { definitionDeleteAllParametersRequestedRef });
const stateVisualImageInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { stateVisualImageInputRef });
const stateIconDrawingImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { stateIconDrawingImportInputRef });
const stateIconDrawingSvgRef = useRef<SVGSVGElement | null>(null); Object.assign(__appScope, { stateIconDrawingSvgRef });
const stateIconDrawingDragRef = useRef<StateIconDrawingDragState | null>(null); Object.assign(__appScope, { stateIconDrawingDragRef });
const stateIconDrawingDragDeltaRef = useRef<{ overrides: Record<string, any>; guides?: any[] } | null>(null); Object.assign(__appScope, { stateIconDrawingDragDeltaRef });
const stateIconDrawingHistoryRef = useRef<StateIconDrawingElement[][]>([]); Object.assign(__appScope, { stateIconDrawingHistoryRef });
const stateIconDrawingClipboardRef = useRef<StateIconDrawingElement[]>([]); Object.assign(__appScope, { stateIconDrawingClipboardRef });
const stateIconDrawingInitialImageRef = useRef<{ key: string; image: string; sourceImage: string } | null>(null); Object.assign(__appScope, { stateIconDrawingInitialImageRef });
const modelImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { modelImportInputRef });
const svgModelImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { svgModelImportInputRef, parseSvgModel });
const modelImportTargetSchemeIdRef = useRef<string>(""); Object.assign(__appScope, { modelImportTargetSchemeIdRef });
const schemeImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { schemeImportInputRef });
const schemeImportParentSchemeIdRef = useRef<string>(""); Object.assign(__appScope, { schemeImportParentSchemeIdRef });
const libraryPackageImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { libraryPackageImportInputRef });
const libraryPackageImportScopeRef = useRef<LibraryPackageScope>("device-library"); Object.assign(__appScope, { libraryPackageImportScopeRef });
const userCustomizationImportInputRef = useRef<HTMLInputElement | null>(null); Object.assign(__appScope, { userCustomizationImportInputRef });
const [libraryPackageDialogOpen, setLibraryPackageDialogOpen] = useState(false);
const [libraryPackageDialogMode, setLibraryPackageDialogMode] = useState<LibraryPackageDialogMode>("export");
const [libraryPackageDialogScope, setLibraryPackageDialogScope] = useState<LibraryPackageScope>("all");
const [userCustomizationManagerOpen, setUserCustomizationManagerOpen] = useState(false);
const [userCustomizationActiveDomain, setUserCustomizationActiveDomain] = useState<UserCustomizationDomain>("custom-devices");
const [userCustomizationBusy, setUserCustomizationBusy] = useState(false);
const [userCustomizationStatus, setUserCustomizationStatus] = useState("");
const [userCustomizationSnapshotView, setUserCustomizationSnapshotView] = useState<UserCustomizationSnapshot | null>(null);
const [pendingUserCustomizationImport, setPendingUserCustomizationImport] = useState<PendingUserCustomizationImport | null>(null);
Object.assign(__appScope, {
  libraryPackageDialogOpen,
  libraryPackageDialogMode,
  libraryPackageDialogScope,
  setLibraryPackageDialogMode,
  setLibraryPackageDialogScope,
  userCustomizationManagerOpen,
  setUserCustomizationManagerOpen,
  userCustomizationActiveDomain,
  setUserCustomizationActiveDomain,
  userCustomizationBusy,
  setUserCustomizationBusy,
  userCustomizationStatus,
  setUserCustomizationStatus,
  userCustomizationSnapshotView,
  setUserCustomizationSnapshotView,
  pendingUserCustomizationImport,
  setPendingUserCustomizationImport
});
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
const suppressNextGraphDirtyRef = useRef(0); Object.assign(__appScope, { suppressNextGraphDirtyRef });
const saveRequiredRef = useRef(false); Object.assign(__appScope, { saveRequiredRef });
const savedUndoStackLengthRef = useRef(0); Object.assign(__appScope, { savedUndoStackLengthRef });
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
const [projectIdx, setProjectIdx] = useState(() => Number((initialDraft as any)?.idx) || 0);
Object.assign(__appScope, { projectIdx, setProjectIdx });
const [subcontrolarea, setSubcontrolarea] = useState(() => initialDraft?.subcontrolarea || "默认区域");
Object.assign(__appScope, { subcontrolarea, setSubcontrolarea });
const [modelType, setModelType] = useState(() => initialDraft?.modelType ?? "厂站");
Object.assign(__appScope, { modelType, setModelType });
const [createModelDialog, setCreateModelDialog] = useState<null | {
  schemeId: string;
  name: string;
  modelType: ModelType;
  saving: boolean;
  error: string;
}>(null);
Object.assign(__appScope, { createModelDialog, setCreateModelDialog });
const [substation, setSubstation] = useState(() => initialDraft?.substation || "默认厂站");
Object.assign(__appScope, { substation, setSubstation });
const [feeder, setFeeder] = useState(() => initialDraft?.feeder || "默认馈线");
Object.assign(__appScope, { feeder, setFeeder });
const [taiqu, setTaiqu] = useState(() => (initialDraft as any)?.taiqu ?? "");
Object.assign(__appScope, { taiqu, setTaiqu });
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
const [canvasBackgroundImageFit, setCanvasBackgroundImageFit] = useState(() => initialDraft?.canvasBackgroundImageFit ?? "cover");
Object.assign(__appScope, { canvasBackgroundImageFit, setCanvasBackgroundImageFit });
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
const [activeProjectKey, setActiveProjectKey] = useState<string>(() => initialDraft?.activeProjectKey ?? "");
Object.assign(__appScope, { activeProjectKey, setActiveProjectKey });
const [activeSchemeKey, setActiveSchemeKey] = useState<string>(() => initialDraft?.activeSchemeKey ?? "");
Object.assign(__appScope, { activeSchemeKey, setActiveSchemeKey });
const [mode, setMode] = useState<ToolMode>("select");
Object.assign(__appScope, { mode, setMode });
const [interactionMode, setInteractionMode] = useState<InteractionMode>(() => readStoredInteractionMode());
Object.assign(__appScope, { interactionMode, setInteractionMode });
const [smartAlignmentEnabled, setSmartAlignmentEnabled] = useState(true);
Object.assign(__appScope, { smartAlignmentEnabled, setSmartAlignmentEnabled });
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
const [canvasCenterRequest, setCanvasCenterRequest] = useState(0);
Object.assign(__appScope, { canvasCenterRequest, setCanvasCenterRequest });
const [panning, setPanning] = useState<CanvasPanningState>(null);
Object.assign(__appScope, { panning, setPanning });
const [pointerButtonsPressed, setPointerButtonsPressed] = useState(false);
Object.assign(__appScope, { pointerButtonsPressed, setPointerButtonsPressed });
const panningRef = useRef<CanvasPanningState>(null); Object.assign(__appScope, { panningRef });
const pendingCanvasNoScrollOffsetRef = useRef<Point | null>(null); Object.assign(__appScope, { pendingCanvasNoScrollOffsetRef });
const [marquee, setMarquee] = useState<Marquee>(null);
Object.assign(__appScope, { marquee, setMarquee });
const [contextMarqueeSelection, setContextMarqueeSelectionState] = useState<ContextMarqueeSelectionState>(null);
Object.assign(__appScope, { contextMarqueeSelection, setContextMarqueeSelectionState });
const contextMarqueeSelectionRef = useRef<ContextMarqueeSelectionState>(null); Object.assign(__appScope, { contextMarqueeSelectionRef });
const [modifierSelectionPress, setModifierSelectionPressState] = useState<ModifierSelectionPressState>(null);
Object.assign(__appScope, { modifierSelectionPress, setModifierSelectionPressState });
const [canvasClipboard, setCanvasClipboard] = useState<CanvasClipboard>(EMPTY_CANVAS_CLIPBOARD);
Object.assign(__appScope, { canvasClipboard, setCanvasClipboard });
const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
Object.assign(__appScope, { contextMenu, setContextMenu });
const canvasGraphicContextMenuHandledRef = useRef(false); Object.assign(__appScope, { canvasGraphicContextMenuHandledRef });
const canvasGraphicContextMenuHandledTimerRef = useRef<number | null>(null); Object.assign(__appScope, { canvasGraphicContextMenuHandledTimerRef });
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
const [expandedCategoryLibraries, setExpandedCategoryLibraries] = useState<CategoryLibrary[]>([...DEFAULT_CATEGORY_LIBRARIES]);
Object.assign(__appScope, { expandedCategoryLibraries, setExpandedCategoryLibraries });
const [expandedCategoryLibraryComponentLibraries, setExpandedCategoryLibraryComponentLibraries] = useState<string[]>([]);
Object.assign(__appScope, { expandedCategoryLibraryComponentLibraries, setExpandedCategoryLibraryComponentLibraries });
const [collapsedExpandedModeCategoryLibraries, setCollapsedExpandedModeCategoryLibraries] = useState<CategoryLibrary[]>([]);
Object.assign(__appScope, { collapsedExpandedModeCategoryLibraries, setCollapsedExpandedModeCategoryLibraries });
const [collapsedExpandedModeComponentLibraries, setCollapsedExpandedModeComponentLibraries] = useState<string[]>([]);
Object.assign(__appScope, { collapsedExpandedModeComponentLibraries, setCollapsedExpandedModeComponentLibraries });
const [hoveredCategoryLibrary, setHoveredCategoryLibrary] = useState<CategoryLibrary | "">("");
Object.assign(__appScope, { hoveredCategoryLibrary, setHoveredCategoryLibrary });
const [hoveredCategoryLibraryComponentLibrary, setHoveredCategoryLibraryComponentLibrary] = useState("");
Object.assign(__appScope, { hoveredCategoryLibraryComponentLibrary, setHoveredCategoryLibraryComponentLibrary });
const [libraryFlyoutPositions, setLibraryFlyoutPositions] = useState<Record<string, { top: number; left: number }>>({});
Object.assign(__appScope, { libraryFlyoutPositions, setLibraryFlyoutPositions });
const libraryScrollRef = useRef<HTMLDivElement | null>(null); Object.assign(__appScope, { libraryScrollRef });
const libraryFlyoutPositionsRef = useRef<Record<string, { top: number; left: number }>>({});
Object.assign(__appScope, { libraryFlyoutPositionsRef });
const libraryFlyoutCloseTimerRef = useRef<number | null>(null); Object.assign(__appScope, { libraryFlyoutCloseTimerRef });
const [collapsedElementTreeGroups, setCollapsedElementTreeGroups] = useState<string[]>([]);
Object.assign(__appScope, { collapsedElementTreeGroups, setCollapsedElementTreeGroups });
const [collapsedElementTreeDeviceGroups, setCollapsedElementTreeDeviceGroups] = useState<string[]>([]);
Object.assign(__appScope, { collapsedElementTreeDeviceGroups, setCollapsedElementTreeDeviceGroups });
const [elementTreeItemLimits, setElementTreeItemLimits] = useState<Record<string, number>>({});
Object.assign(__appScope, { elementTreeItemLimits, setElementTreeItemLimits });
const [elementTreeItemWindows, setElementTreeItemWindows] = useState<Record<string, { start: number; end: number }>>({});
Object.assign(__appScope, { elementTreeItemWindows, setElementTreeItemWindows });
const [elementTreeItemHeights, setElementTreeItemHeights] = useState<Record<string, number>>({});
Object.assign(__appScope, { elementTreeItemHeights, setElementTreeItemHeights });
const [elementTreeEditDrafts, setElementTreeEditDrafts] = useState<Record<string, string>>({});
Object.assign(__appScope, { elementTreeEditDrafts, setElementTreeEditDrafts });
const [elementTreeSearchQuery, setElementTreeSearchQuery] = useState("");
Object.assign(__appScope, { elementTreeSearchQuery, setElementTreeSearchQuery });
const [customCategoryLibraries, setCustomCategoryLibraries] = useState<CategoryLibrary[]>(() => initialDeviceLibrary.customCategoryLibraries);
Object.assign(__appScope, { customCategoryLibraries, setCustomCategoryLibraries });
const [customComponentLibraries, setCustomComponentLibraries] = useState<CustomComponentLibraryDefinition[]>(() => initialDeviceLibrary.customComponentLibraries);
Object.assign(__appScope, { customComponentLibraries, setCustomComponentLibraries });
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
const [customComponentTreeSelection, setCustomComponentTreeSelection] = useState<CustomComponentTreeSelection>({ kind: "categoryLibrary", categoryLibraryName: "交流设备" });
Object.assign(__appScope, { customComponentTreeSelection, setCustomComponentTreeSelection });
const [copiedCustomComponentTemplate, setCopiedCustomComponentTemplate] = useState<DeviceTemplate | null>(null);
Object.assign(__appScope, { copiedCustomComponentTemplate, setCopiedCustomComponentTemplate });
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
const [customLibraryCreateDialog, setCustomLibraryCreateDialog] = useState(null);
Object.assign(__appScope, { customLibraryCreateDialog, setCustomLibraryCreateDialog });
const customDeviceDraftCleanTokenRef = useRef("");
Object.assign(__appScope, { customDeviceDraftCleanTokenRef });
const customDeviceDraftBaselineRef = useRef<CustomDeviceDraft | null>(null);
Object.assign(__appScope, { customDeviceDraftBaselineRef });
const [customDeviceUnsavedPrompt, setCustomDeviceUnsavedPrompt] = useState<{
  kind: "close" | "switch-view" | "switch-selection";
  section: CustomDeviceDialogView | null;
  actionLabel: string;
  targetLabel: string;
} | null>(null);
const customDevicePendingActionRef = useRef<(() => void) | null>(null);
Object.assign(__appScope, {
  customDeviceUnsavedPrompt,
  setCustomDeviceUnsavedPrompt,
  customDevicePendingActionRef
});
const [customDeviceSaveMessage, setCustomDeviceSaveMessage] = useState("");
Object.assign(__appScope, { customDeviceSaveMessage, setCustomDeviceSaveMessage });
const [globalMessage, setGlobalMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
const globalMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
Object.assign(__appScope, { globalMessage, setGlobalMessage, globalMessageTimerRef });
const [exportCompletionDialog, setExportCompletionDialog] = useState<{
  title: string;
  message: string;
  details?: string[];
} | null>(null);
const [exportCompletionCountdown, setExportCompletionCountdown] = useState(5);
Object.assign(__appScope, {
  exportCompletionDialog,
  setExportCompletionDialog,
  exportCompletionCountdown
});
useEffect(() => {
  if (!exportCompletionDialog) {
    setExportCompletionCountdown(5);
    return;
  }
  const autoCloseMs = 5000;
  const deadline = Date.now() + autoCloseMs;
  setExportCompletionCountdown(5);
  const countdownTimer = window.setInterval(() => {
    const remainingSeconds = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
    setExportCompletionCountdown(remainingSeconds);
  }, 1000);
  const closeTimer = window.setTimeout(() => {
    setExportCompletionDialog(null);
  }, autoCloseMs);
  return () => {
    window.clearInterval(countdownTimer);
    window.clearTimeout(closeTimer);
  };
}, [exportCompletionDialog]);
const [customDeviceTerminalAnchorDragIndex, setCustomDeviceTerminalAnchorDragIndex] = useState<number | null>(null);
Object.assign(__appScope, { customDeviceTerminalAnchorDragIndex, setCustomDeviceTerminalAnchorDragIndex });
const customComponentSelectionRequestRef = useRef(0); Object.assign(__appScope, { customComponentSelectionRequestRef });
const customComponentSelectionFrameRef = useRef<number | null>(null); Object.assign(__appScope, { customComponentSelectionFrameRef });
const [deviceDefinitionOverrides, setDeviceDefinitionOverrides] = useState<Record<string, DeviceTemplateDefinitionOverride>>(() => initialDeviceLibrary.deviceDefinitionOverrides);
Object.assign(__appScope, { deviceDefinitionOverrides, setDeviceDefinitionOverrides });
const [eDeviceDefinitionLabels, setEDeviceDefinitionLabels] = useState<Record<string, string>>(() => (initialDeviceLibrary as any).eDeviceDefinitionLabels ?? {});
Object.assign(__appScope, { eDeviceDefinitionLabels, setEDeviceDefinitionLabels });
const [eDeviceDefinitionClassExportEnabled, setEDeviceDefinitionClassExportEnabled] = useState<Record<string, boolean>>(() => (initialDeviceLibrary as any).eDeviceDefinitionClassExportEnabled ?? {});
Object.assign(__appScope, { eDeviceDefinitionClassExportEnabled, setEDeviceDefinitionClassExportEnabled });
const [eDeviceDefinitionFieldOrder, setEDeviceDefinitionFieldOrder] = useState<Record<string, string[]>>(() => (initialDeviceLibrary as any).eDeviceDefinitionFieldOrder ?? {});
Object.assign(__appScope, { eDeviceDefinitionFieldOrder, setEDeviceDefinitionFieldOrder });
const [eDeviceDefinitionTemplateFields, setEDeviceDefinitionTemplateFields] = useState<Record<string, Array<{ sourceName?: string; exportName: string; cnName: string }>>>(() => (initialDeviceLibrary as any).eDeviceDefinitionTemplateFields ?? {});
Object.assign(__appScope, { eDeviceDefinitionTemplateFields, setEDeviceDefinitionTemplateFields });
const [eDeviceDefinitionTableIds, setEDeviceDefinitionTableIds] = useState<Record<string, string>>(() => (initialDeviceLibrary as any).eDeviceDefinitionTableIds ?? {});
Object.assign(__appScope, { eDeviceDefinitionTableIds, setEDeviceDefinitionTableIds });
const [customDeviceSaveToast, setCustomDeviceSaveToast] = useState("");
const customDeviceSaveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
Object.assign(__appScope, { customDeviceSaveToast, setCustomDeviceSaveToast, customDeviceSaveToastTimerRef });
const [eDeviceDefinitionInterfaceDialogOpen, setEDeviceDefinitionInterfaceDialogOpen] = useState(false);
Object.assign(__appScope, { eDeviceDefinitionInterfaceDialogOpen, setEDeviceDefinitionInterfaceDialogOpen });
const [eFileEditorDialogOpen, setEFileEditorDialogOpen] = useState(false);
Object.assign(__appScope, { eFileEditorDialogOpen, setEFileEditorDialogOpen });
const [deviceDefinitionDialogOpen, setDeviceDefinitionDialogOpen] = useState(false);
Object.assign(__appScope, { deviceDefinitionDialogOpen, setDeviceDefinitionDialogOpen });
const [selectedDefinitionKind, setSelectedDefinitionKind] = useState<DeviceKind | "">("");
Object.assign(__appScope, { selectedDefinitionKind, setSelectedDefinitionKind });
const [deviceDefinitionView, setDeviceDefinitionView] = useState<"visual" | "parameters" | "measurements">("parameters");
Object.assign(__appScope, { deviceDefinitionView, setDeviceDefinitionView });
const [expandedDefinitionGroups, setExpandedDefinitionGroups] = useState<CategoryLibrary[]>([...DEFAULT_CATEGORY_LIBRARIES]);
Object.assign(__appScope, { expandedDefinitionGroups, setExpandedDefinitionGroups });
const [collapsedDefinitionComponentLibraries, setCollapsedDefinitionComponentLibraries] = useState<string[]>([]);
Object.assign(__appScope, { collapsedDefinitionComponentLibraries, setCollapsedDefinitionComponentLibraries });
const [deviceDefinitionSearchQuery, setDeviceDefinitionSearchQuery] = useState("");
Object.assign(__appScope, { deviceDefinitionSearchQuery, setDeviceDefinitionSearchQuery });
const [definitionDraftRows, setDefinitionDraftRows] = useState<DeviceDefinitionDraftRow[]>([]);
Object.assign(__appScope, { definitionDraftRows, setDefinitionDraftRows });
const [selectedDefinitionParameterRowIds, setSelectedDefinitionParameterRowIds] = useState<string[]>([]);
const definitionParameterSelectionAnchorRef = useRef<string | null>(null);
Object.assign(__appScope, {
  selectedDefinitionParameterRowIds,
  setSelectedDefinitionParameterRowIds,
  definitionParameterSelectionAnchorRef
});
const [selectedCustomParameterRowIds, setSelectedCustomParameterRowIds] = useState<string[]>([]);
const customParameterSelectionAnchorRef = useRef<string | null>(null);
Object.assign(__appScope, {
  selectedCustomParameterRowIds,
  setSelectedCustomParameterRowIds,
  customParameterSelectionAnchorRef
});
const [definitionMeasurementDraft, setDefinitionMeasurementDraft] = useState<DeviceMeasurementProfileItem[]>([]);
Object.assign(__appScope, { definitionMeasurementDraft, setDefinitionMeasurementDraft });
const [selectedDefinitionMeasurementRowIndexes, setSelectedDefinitionMeasurementRowIndexes] = useState<number[]>([]);
const definitionMeasurementSelectionAnchorRef = useRef<number | null>(null);
Object.assign(__appScope, {
  selectedDefinitionMeasurementRowIndexes,
  setSelectedDefinitionMeasurementRowIndexes,
  definitionMeasurementSelectionAnchorRef
});
const [selectedCustomMeasurementRowIndexes, setSelectedCustomMeasurementRowIndexes] = useState<number[]>([]);
const customMeasurementSelectionAnchorRef = useRef<number | null>(null);
Object.assign(__appScope, {
  selectedCustomMeasurementRowIndexes,
  setSelectedCustomMeasurementRowIndexes,
  customMeasurementSelectionAnchorRef
});
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
const measurementEditorDialogRef = useRef<HTMLElement | null>(null); Object.assign(__appScope, { measurementEditorDialogRef });
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
const measurementConfigBaselineRef = useRef<PlatformMeasurementConfig | null>(null); Object.assign(__appScope, { measurementConfigBaselineRef });
const [measurementConfigSaveStatus, setMeasurementConfigSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
Object.assign(__appScope, { measurementConfigSaveStatus, setMeasurementConfigSaveStatus });
const [measurementEditorDialog, setMeasurementEditorDialog] = useState<MeasurementEditorDialogState>(null);
Object.assign(__appScope, { measurementEditorDialog, setMeasurementEditorDialog });
const [measurementEditorColumnWidths, setMeasurementEditorColumnWidths] = useState<Record<string, number>>({});
Object.assign(__appScope, { measurementEditorColumnWidths, setMeasurementEditorColumnWidths });
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
const [allNetworkTopologyDialogOpen, setAllNetworkTopologyDialogOpen] = useState(false);
Object.assign(__appScope, { allNetworkTopologyDialogOpen, setAllNetworkTopologyDialogOpen });
const [colorPaletteTab, setColorPaletteTab] = useState<ColorDisplayMode>(() => readColorDisplayMode());
Object.assign(__appScope, { colorPaletteTab, setColorPaletteTab });
const [voltageLevelSettings, setVoltageLevelSettings] = useState<VoltageLevelSettings>(() => readVoltageLevelSettings());
Object.assign(__appScope, { voltageLevelSettings, setVoltageLevelSettings });
const [voltageLevelDialogOpen, setVoltageLevelDialogOpen] = useState(false);
Object.assign(__appScope, { voltageLevelDialogOpen, setVoltageLevelDialogOpen });
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
const [selectedProjectId, setSelectedProjectId] = useState<string>("");
Object.assign(__appScope, { selectedProjectId, setSelectedProjectId });
const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
Object.assign(__appScope, { selectedSchemeId, setSelectedSchemeId });
const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
Object.assign(__appScope, { selectedProjectIds, setSelectedProjectIds });
const [selectedSchemeIds, setSelectedSchemeIds] = useState<string[]>([]);
Object.assign(__appScope, { selectedSchemeIds, setSelectedSchemeIds });
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false); Object.assign(__appScope, { unsavedChangesDialogOpen, setUnsavedChangesDialogOpen });

// 提取到 useAppStateBatch（原第 901-2261 行）
useAppStateBatch(__appScope);
// 提取到 useCanvasViewportBatch（原第 2265-3048 行）
useCanvasViewportBatch(__appScope);
// 跨厂站/馈线/台区边界的交流、直流线路由后台全局注册表统一维护。
// 必须在 useRenderBatch 之前注入弹窗状态，否则本轮视图永远只能读到 undefined。
useGlobalLines(__appScope);
// 提取到 useRenderBatch（原第 3053-6217 行）
useRenderBatch(__appScope);

// 运行时态 WS 客户端：连入 server /ws，注册 clientId，响应 server 的 fetch 拉取。
// 第三方 /webgrp/v1/runtime/* 经此桥接获取前端运行时态（snapshot/tab/selection/model/devices/e-file/svg/screenshot）。
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
      "control.model.create": (p) => scope.programmaticCreateBlankProject?.(p.name, p.schemeId, p.modelType),
      "control.devices.select": (p) => scope.programmaticSelectDevices?.(p.ids, p.mode),
      "control.devices.group": () => scope.programmaticGroupSelected?.(),
      "control.template.saveFromSelection": (p) => scope.programmaticSaveSelectionAsTemplate?.(p),
      "control.device.property.update": (p) => scope.programmaticUpdateDeviceProperty?.(p.id, p.category, p.patch),
      "control.device.add": (p) => scope.programmaticAddDevice?.(p.kind, p.x, p.y, p.attrs),
      "control.device.delete": (p) => scope.programmaticDeleteDevices?.(p.ids),
      "control.save": (p) => scope.programmaticSave?.(p.scope),
      "control.e-device-definition.export": () => scope.programmaticExportEDeviceDefinition?.(),
      "control.e-device-definition.import": (p) => scope.programmaticImportEDeviceDefinition?.(p.text)
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
