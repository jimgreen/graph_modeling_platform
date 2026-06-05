// @ts-nocheck
import {
  ChangeEvent,
  DragEvent,
  Fragment,
  Suspense,
  lazy,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent,
  type CSSProperties,
  type SetStateAction,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState } from "react";
import { createPortal,
  flushSync } from "react-dom";
import {
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
  createSavedScheme,
  createSavedProject,
  createDefaultNode,
  createInteractiveStaticDrawingNode,
  createNodeFromTemplate,
  createRoutableLineDeviceFromEndpoints,
  createStaticBoxNodeFromDrawing,
  containerRelationNameKey,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  DEFAULT_COLOR_PALETTE,
  STATIC_ROUTE_AVOIDANCE_PARAM,
  describeContainerTerminalAssociations,
  deleteNodesWithConnectedEdges,
  DEVICE_LIBRARY,
  ACAC_CONVERTER_CONTROL_TYPES,
  AC_GENERATOR_CONTROL_TYPES,
  DCAC_CONVERTER_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  E_SECTION_COLUMNS,
  getEdgeEndpointPoint as getModelEdgeEndpointPoint,
  getNodeScaleX,
  getNodeScaleY,
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
  isInteractiveStaticDrawingKind,
  isRoutableLineDeviceKind,
  getEParameterKeys,
  getEParamValue,
  getEExportWarnings,
  getTemplateParameterDefinitions,
  findSavedSchemeById,
  flattenSavedProjects,
  flattenSavedSchemes,
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
  savedProjectRecordNameKey,
  normalizeColorPalette,
  normalizeVoltageBaseInput,
  normalizeScaleValue,
  parseStaticDrawPoints,
  serializeProject,
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
  insertChildSavedScheme,
  keyboardMoveStepForViewBox,
  lockProjectEdgeTerminals,
  pointsToOrthogonalPath,
  preserveDraggedRouteShape,
  prepareConnectionEdgeForCommit,
  projectPointToBusCenterline,
  rebuildConnectionRoutesForNodes,
  rebuildExternalConnectionRoutesForMovedNodes,
  rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes,
  rebuildRoutableLineDeviceRouteUpdates,
  repairUnsafeRoutableLineDeviceRoutes,
  rebuildSingleConnectionRoute,
  redrawConnectionRoutesForEdges,
  reconcileOverlappingTerminalConnections,
  refreshCrossingArcPaths,
  rerouteEdgesAroundMovedNodes,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  routeRoutableLineDevice,
  routableLineDeviceCanvasPoints,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  routableLineDeviceLocalPoints,
  setRoutableLineDeviceEndpoints,
  synchronizeBusTerminalsWithEdges,
  validateTopology,
  validateConnectionEndpointRules,
  validateVoltageSetpointDeviations,
  normalizeViewBoxToCanvas,
  type DeviceKind,
  type DeviceIndexCounters,
  type DeviceParameterDefinition,
  type DeviceParameterValueType,
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
  mirrorNodes,
  replaceSavedSchemeById,
  savedChildSchemeNames,
  savedProjectPathOptions,
  moveOrthogonalRouteSegment,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth,
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
  type SavedSchemeRecord,
  type SavedProjectRecord
} from "./model";
import { isGlobalSaveShortcut,
  resolveKeyboardShortcutScope } from "./keyboardShortcuts";
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
  queryRouteSpatialIndex,
  routeRenderBounds,
  routeSpatialIndexRenderBounds,
  routeStorePatchRoutes,
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
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  type SidePanelMode,
  type SidePanelSide
} from "./sidePanelVisibility";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  createDefaultMeasurementGroupForNode,
  formatMeasurementDisplayValue,
  normalizeMeasurementConfig,
  normalizeProjectMeasurements,
  removeMeasurementGroupsForNodeIds,
  resolveMeasurementItemDisplay,
  type MeasurementGroup,
  type PlatformMeasurementConfig,
  type ProjectMeasurementConfig
} from "./measurements";
import {
  fetchMeasurementCatalog,
  fetchMeasurementConfig,
  fetchMeasurementSnapshot,
  openMeasurementStream,
  type MeasurementCatalogPoint
} from "./measurementClient";
import { createMeasurementRuntimeStore,
  type MeasurementRuntimeStore } from "./measurementRuntimeStore";
import {
  DeviceGlyph,
  MemoDeviceGlyph,
  SvgMarkupChunk,
  buildSvgTerminalMarkup,
  customSingleTerminalAnchorToken,
  escapeXml,
  formatSvgNumber,
  nodeGeometryTransform,
  nodeUprightScaleTransform,
  renderSvgElementMarkup,
  stableSvgMarkupChunks,
  svgStrokeDashArray,
  type ConnectionStrokeColorCache,
  type ElementTreeSource,
  type StableSvgMarkupChunkCache
} from "./DeviceGlyph";
import {
  canvasBoundsChangeIsMeaningful,
  canvasBoundsScrollSyncTarget,
  canvasFrameScrollIsUserDriven,
  canvasFrameScrollTargetForViewBox,
  canvasFullViewBoxFromBounds,
  canvasRenderViewBoxAfterBoundsDraft,
  canvasResizeEdgeAnchorsStart,
  canvasResizeOriginShiftForBounds,
  canvasResizePreviewRectForDraft,
  canvasResizeScrollTargetForCommitAnchor,
  canvasScrollSyncShouldRun,
  canvasViewBoxFromFrameScrollPosition,
  canvasVisualRectScrollTarget,
  scrollPositionToViewBoxStart,
  viewBoxAfterCanvasBoundsChange
} from "./canvasViewport";
import { RightInspectorPanel } from "./RightInspectorPanel";
import { AppDialogs } from "./AppDialogs";
import { MainWorkspace } from "./MainWorkspace";
import { useLeftPanelRenderers } from "./useLeftPanelRenderers";
import { useCanvasAuxiliaryRenderers,
  useCanvasLodRenderLayers } from "./useCanvasRenderLayers";
import {
  useCanvasFloatingToolbarLayout,
  useCanvasMinimapState,
  useCanvasSelectionBounds,
  useCanvasStatusDerivations
} from "./useCanvasViewportDerivations";
import { useProjectPersistenceController } from "./useProjectPersistenceController";
import {
  hasSameName,
  promptUniqueRecordName,
  useProjectRecordActions,
  type ProjectMenuState
} from "./useProjectRecordActions";
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CURRENT_UNIT,
  DEFAULT_POWER_BASE_VALUE,
  DEFAULT_POWER_UNIT,
  DEFAULT_VOLTAGE_UNIT,
  backendJsonRequest,
  clearRefreshRecoveryProject,
  createBackendImageFolder,
  deleteBackendImageFolder,
  fetchBackendImageFolders,
  fetchBackendImages,
  fetchBackendJson,
  findProjectRecordByNameInScheme,
  findProjectRecordInSchemes,
  imageAssetsToMap,
  localImageAssetsFromStorage,
  readImageAssets,
  renameBackendImageFolder,
  resolveNodeForegroundImage,
  resolveNodeImage,
  resolveProjectImage,
  savedSchemePathForId,
  saveImageAsset,
  serializeSchemesForStorage,
  uploadBackendImage,
  writeRefreshRecoveryProject,
  type ImageAsset,
  type ImageFolder,
  type RefreshRecoveryProjectState
} from "./projectPersistence";
import { anchoredCanvasNoScrollOffset,
  anchoredCanvasScrollPosition,
  applyNodeTerminalSnap,
  AttributeLibrary,
  AttributeLibraryComponentTypeGroup,
  attributeLibraryComponentTypeKey,
  attributeLibraryOptionClass,
  BackendColorConfigResponse,
  BackendDeviceLibraryResponse,
  backgroundPageCanvasTransform,
  bestSmartAlignmentAxisSnap,
  boxesIntersect,
  buildNodeSpatialIndex,
  buildSvgDocument,
  buildSvgNodeLabelMarkup,
  buildSvgNodeLabelTextMarkup,
  busEndpointColor,
  CANVAS_AUTO_EXPAND_PADDING,
  CANVAS_FIT_SCROLLBAR_GUARD,
  CANVAS_FRAME_INSET,
  CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR,
  CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT,
  CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT,
  CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT,
  CANVAS_RESIZE_HANDLE_SIZE,
  CANVAS_SCROLL_EDGE_VIEWPORT_RATIO,
  CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE,
  CANVAS_SELECTION_DRAG_THRESHOLD,
  CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT,
  CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING,
  CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT,
  CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT,
  CANVAS_VIEWPORT_QUERY_SNAP_SIZE,
  CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR,
  CanvasBoundsScrollAnchor,
  canvasDisplayOffset,
  canvasFrameHasHorizontalScrollableRange,
  canvasFrameHasScrollableRange,
  canvasFrameHasVerticalScrollableRange,
  canvasFramePaddingOffset,
  canvasFrameViewportSizeChanged,
  CanvasPanningState,
  CanvasRenderOptions,
  canvasResizeAnchoredDisplayOffset,
  CanvasResizeCommitAnchor,
  CanvasResizeCommitScrollTarget,
  CanvasResizeEdge,
  canvasResizeKeepsScrollRange,
  CanvasResizePreviewMetrics,
  CanvasResizePreviewRect,
  CanvasResizeState,
  canvasScrollEdgeInset,
  canvasScrollScaleFromViewBox,
  canvasScrollSurfaceSize,
  CanvasSelectionSnapshot,
  CanvasViewBox,
  canvasWheelEventHasNoModifier,
  CanvasWheelZoomEvent,
  clampCanvasDimension,
  clampCanvasNoScrollOffset,
  clampNumber,
  clampPanelDimension,
  cloneEdgesForUndo,
  cloneGraphTemplateClipboard,
  cloneGroupsForUndo,
  cloneNodesForUndo,
  clonePoint,
  cloneTemplatePoint,
  cloneTopologyErrorsForUndo,
  cloneTopologyForUndo,
  COLOR_DISPLAY_MODE_STORAGE_KEY,
  COLOR_PALETTE_STORAGE_KEY,
  combineSelectionRects,
  compactPreviewNodes,
  COMPONENT_TYPE_LABELS,
  ComponentLibraryDisplayMode,
  componentTypeDisplayName,
  componentTypeDisplayParts,
  componentTypeOptionClass,
  CONNECT_BUS_SNAP_TOLERANCE,
  CONNECT_TERMINAL_SNAP_TOLERANCE,
  CONNECTION_HIT_SCREEN_TOLERANCE,
  CONNECTION_REDRAW_SCOPE_LABELS,
  ConnectionRedrawScope,
  ConnectTarget,
  connectTargetSearchBounds,
  constrainPointToOrthogonalAxis,
  CONTAINER_TERMINAL_ASSOCIATION_OPTIONS,
  CONTEXT_MENU_AUTO_HIDE_MARGIN,
  ContextMenuState,
  createDefinitionDraftRows,
  createEmptyCustomDeviceDraft,
  CURRENT_UNIT_OPTIONS,
  CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY,
  CUSTOM_ATTRIBUTE_LIBRARY_BASES,
  CUSTOM_COMPONENT_TYPES_STORAGE_KEY,
  CUSTOM_DEVICE_LIBRARY_STORAGE_KEY,
  CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY,
  CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY,
  CustomComponentTreeSelection,
  CustomComponentTypeDefinition,
  customDefaultDefinitions,
  CustomDeviceDraft,
  CustomParamDraft,
  customParamId,
  DEFAULT_ATTRIBUTE_LIBRARIES,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_GRAPH_TEMPLATE_TYPES,
  defaultAttributeLibraryForComponentType,
  defaultBackgroundLayerIdsForProject,
  defaultContainerAssociationForTerminalType,
  DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY,
  DEVICE_TYPE_NAME_PATTERN,
  DeviceDefinitionDraftRow,
  deviceDefinitionRowId,
  DeviceLibraryPersistencePayload,
  DirectoryFileHandle,
  DirectoryPickerWindow,
  downloadText,
  DraggingState,
  E_SECTION_OPTIONS,
  EdgeEndpoint,
  ELECTRIC_COLOR_TYPE_LABELS,
  ELECTRIC_COLOR_TYPES,
  ELEMENT_TREE_INITIAL_ITEM_LIMIT,
  ELEMENT_TREE_ITEM_LIMIT_STEP,
  elementTreeCacheSignature,
  EMPTY_CANVAS_LAYOUT_UNITS,
  EMPTY_CANVAS_SELECTION,
  EMPTY_EDGE_ID_LIST,
  EMPTY_ID_LIST,
  EMPTY_MODEL_GROUP_BY_ID,
  EMPTY_MODEL_GROUPS,
  EMPTY_TOPOLOGY,
  EMPTY_VOLTAGE_COLOR_KEY_SET,
  emptySmartAlignmentAnchorMap,
  ENABLE_REACT_FLOW_PREVIEW,
  ENERGY_COLOR_ROWS,
  expandViewBoxForRendering,
  EXPORT_SAVE_PICKER_ID,
  exportSvgLayerScriptMarkup,
  fallbackComponentTypeForAttributeLibrary,
  fetchBackendColorConfig,
  fetchBackendDeviceLibrary,
  findNodeBusSnapTarget,
  findNodeTerminalSnapTarget,
  fitWholeCanvasViewBox,
  FONT_FAMILY_OPTION_LABELS,
  FONT_FAMILY_OPTIONS,
  formatInspectorScaleValue,
  generateCustomDeviceImage,
  GraphDirtyBaseline,
  GraphTemplate,
  graphTemplateTypeList,
  groupDeviceTemplatesByAttributeLibrary,
  groupDeviceTemplatesByAttributeLibraryAndComponentType,
  groupGraphTemplatesByType,
  GroupTransformDrag,
  GroupTransformEdgeRouteSnapshot,
  groupTransformGeometry,
  GroupTransformGeometry,
  GroupTransformNodeSnapshot,
  groupTransformSvgTransform,
  hasCanvasSelectionModifier,
  IdleCapableWindow,
  ImageTarget,
  INITIAL_TOPOLOGY_STATUS,
  initialVisibleCanvasViewBox,
  INTERACTION_MODE_STORAGE_KEY,
  InteractionMode,
  isAssociationAllowedForTerminal,
  isBuiltInAttributeLibrary,
  isBuiltInComponentType,
  isCanvasGraphicContextMenuTarget,
  isCanvasWheelZoomExcludedTarget,
  isElectricPaletteType,
  isGroupTransformDrag,
  isMultiNodeMoveState,
  isPickerAbort,
  isValidComponentTypeName,
  KEYBOARD_MOVE_COMMIT_DELAY_MS,
  KEYBOARD_MOVE_FRAME_INTERVAL_MS,
  KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND,
  LEFT_PANEL_DEFAULT_WIDTH,
  LEFT_PANEL_MODE_STORAGE_KEY,
  LEFT_PANEL_WIDTH_STORAGE_KEY,
  LibraryPlacementState,
  libraryTemplateMatchesSearch,
  localScaleKindForScreenHandle,
  ManualPathDrag,
  Marquee,
  MAX_CANVAS_HEIGHT,
  MAX_CANVAS_WIDTH,
  MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES,
  MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES,
  MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES,
  mergeRenderViewportBounds,
  MIN_CANVAS_HEIGHT,
  MIN_CANVAS_WIDTH,
  mirrorPointAcrossAxis,
  ModifierSelectionPressState,
  ModifierSelectionPressTarget,
  MOVE_BOUNDARY_GUARD,
  MOVE_ROUTE_LOCAL_SEARCH_PADDING,
  MultiNodeDragOverlayPreview,
  nextSpatialQueryMark,
  NODE_LABEL_DISPLAY_MODES,
  NODE_LABEL_FOOTPRINT_PARAM_KEYS,
  NODE_SPATIAL_BUCKET_SIZE,
  NodeDragPreviewRoute,
  nodeIntersectsRenderViewport,
  nodeLabelCanvasCenter,
  nodeLabelDisplayMode,
  NodeLabelDisplayMode,
  NodeLabelDragState,
  nodeLabelFontSize,
  nodeLabelNumericTokenPattern,
  nodeLabelNumericTokenRegex,
  nodeLabelOffset,
  NodeLabelRotateDragState,
  nodeLabelRotationFromPoint,
  nodeLabelShouldRender,
  nodeLabelText,
  nodeLabelTextAnchor,
  nodeLabelTextStyle,
  nodeLabelTransform,
  nodeLabelVertical,
  nodeLabelVerticalSegments,
  nodeLabelVerticalTokenStyle,
  nodeLabelVerticalTokenY,
  nodeLabelVisible,
  nodeRenderBounds,
  nodeRotateHandleControlPoints,
  nodeScaledLocalHalfExtents,
  nodeScaleHandleControlPoint,
  nodeSmartAlignmentBounds,
  NodeSpatialIndex,
  nodeTerminalOutflowSmartAlignmentAnchors,
  NodeTerminalSnapTarget,
  nodeTransformedHalfExtents,
  nodeUprightRotateHandleControlPoints,
  nodeUprightSelectionOutlineRect,
  nodeUsesUprightStaticSelectionOutline,
  nodeVisualInteractionBounds,
  normalizeAttributeLibraryName,
  normalizeColorDisplayMode,
  normalizeComponentTypeName,
  normalizeContainerTerminalAssociations,
  normalizeCustomAttributeLibraries,
  normalizeCustomComponentTypes,
  normalizeCustomDeviceTemplates,
  normalizeDefinitionRows,
  normalizeDeviceDefinitionOverrides,
  normalizeDeviceLibraryPersistencePayload,
  normalizedRotationDelta,
  normalizeGraphTemplateClipboard,
  normalizeGraphTemplates,
  normalizeGraphTemplateTypeName,
  normalizeGraphTemplateTypes,
  normalizeInteractionMode,
  normalizeLibrarySearchText,
  normalizeNodeLabelDisplayMode,
  normalizeNodeLabelRotation,
  normalizeRotationDegrees,
  numericNodeParam,
  ORIGINAL_POSITION_REROUTE_PADDING,
  PARAM_LABELS,
  PARAM_OPTION_LABELS,
  PARAM_OPTIONS,
  PARAM_VALUE_TYPE_OPTIONS,
  paramOptionsForSection,
  parseCustomDefinitions,
  parseStaticButtonTargetLayerValues,
  PendingModelImportConflict,
  PendingSchemeImportConflict,
  pointOnBusForSnap,
  pointsToPreviewPath,
  positionedNodeForSmartAlignment,
  POWER_UNIT_OPTIONS,
  PROJECT_PANEL_DEFAULT_HEIGHT,
  PROJECT_PANEL_MAX_HEIGHT,
  PROJECT_PANEL_MIN_HEIGHT,
  PROTECTED_ATTRIBUTE_LIBRARIES,
  queryNodeSpatialIndex,
  ReactFlowPreview,
  readColorDisplayMode,
  readColorPalette,
  readCustomAttributeLibraries,
  readCustomComponentTypes,
  readCustomDeviceTemplates,
  readCustomGraphTemplates,
  readCustomGraphTemplateTypes,
  readDeviceDefinitionOverrides,
  readLocalDeviceLibraryPersistencePayload,
  readLocalStorageJson,
  READONLY_E_PARAM_KEYS,
  readSidePanelMode,
  readStoredInteractionMode,
  readStoredPanelDimension,
  readViewportResultCache,
  RectLike,
  renderedCanvasFullyFitsFrame,
  RenderViewportBounds,
  resetViewportResultCache,
  resolveStaticButtonTargetLayers,
  resolveTemplateComponentType,
  reuseSetOrCreate,
  RewiringState,
  RIGHT_PANEL_DEFAULT_WIDTH,
  RIGHT_PANEL_MODE_STORAGE_KEY,
  RIGHT_PANEL_WIDTH_STORAGE_KEY,
  rotatePointAround,
  rotationDeltaBetweenTransformPoints,
  rotationDeltaFromTransformPoint,
  rotationTrajectoryArcPath,
  RoutableLineEndpointDragState,
  RoutableLinePlacementState,
  routeMidpoint,
  sameCanvasViewBox,
  sameRenderViewportBounds,
  SAMPLE_EDGES,
  SAMPLE_NODES,
  saveBackendColorConfigPayload,
  saveBackendDeviceLibraryPayload,
  SaveFilePickerWindow,
  saveTextFile,
  SCALE_HANDLE_CONFIGS,
  ScaleHandleConfig,
  scaleHandleControlPoint,
  scaleHandleCursorClass,
  ScaleHandleKind,
  scheduleIdleWork,
  SCHEME_EXPORT_DIRECTORY_PICKER_ID,
  screenToSvgPoint,
  selectionRectCenter,
  serializeColorConfigForStorage,
  serializeDeviceLibraryForStorage,
  serializeStaticButtonTargetLayerIds,
  shouldZoomCanvasFromWheelEvent,
  SIDE_PANEL_MAX_WIDTH,
  SIDE_PANEL_MIN_WIDTH,
  SidePanelResizeState,
  SingleNodeDeferredRepairOptions,
  SingleNodeDragCache,
  SingleNodeDragPreviewEndpoint,
  SingleTransformDrag,
  SMART_ALIGNMENT_GUIDE_PADDING,
  SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE,
  SmartAlignmentAnchor,
  SmartAlignmentAnchorMap,
  SmartAlignmentAxis,
  smartAlignmentAxisAnchors,
  SmartAlignmentAxisCandidate,
  SmartAlignmentAxisSnap,
  SmartAlignmentGuide,
  snapRenderViewportBoundsForQuery,
  snapRotationDeltaToRightAngle,
  snapSingleTerminalAnchorToNearestSide,
  sourceSelectClassName,
  spatialBucketKey,
  spatialBucketRange,
  SpatialQueryState,
  STATIC_BUTTON_ACTION_LABELS,
  STATIC_BUTTON_COMMAND_LABELS,
  StaticButtonPointerSnapshot,
  StaticButtonVisualState,
  StaticDrawingState,
  STATUSBAR_DEFAULT_HEIGHT,
  STATUSBAR_HEIGHT_STORAGE_KEY,
  STATUSBAR_MAX_HEIGHT,
  STATUSBAR_MIN_HEIGHT,
  StatusbarResizeState,
  svgDisplayAttribute,
  TemplateDialogState,
  TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD,
  TERMINAL_TYPE_OPTIONS,
  terminalColor,
  TerminalPressState,
  terminalVbaseFallbackValue,
  TextSaveOptions,
  ToolMode,
  TOPOLOGY_WARNING_PAGE_SIZE,
  TopologyRunStatus,
  TRANSFORM_ROTATE_HANDLE_GAP,
  TRANSFORM_ROTATE_STEM_END,
  TRANSFORM_ROTATE_STEM_START,
  TransformDrag,
  transformGroupPoint,
  transformPointAngle,
  UndoGraphPatchScope,
  UndoGraphSnapshotPatchPlan,
  UndoSnapshot,
  uniqueGraphTemplateName,
  UnsavedChangeAction,
  useMeasurementRuntimeSnapshot,
  VALIDATION_PANEL_DEFAULT_HEIGHT,
  VALIDATION_PANEL_HEIGHT_STORAGE_KEY,
  VALIDATION_PANEL_MAX_HEIGHT,
  VALIDATION_PANEL_MIN_HEIGHT,
  ValidationPanelResizeState,
  VIEWPORT_RENDER_MIN_PADDING,
  VIEWPORT_RENDER_PADDING_RATIO,
  VIEWPORT_RESULT_CACHE_LIMIT,
  viewportBoundsCacheKey,
  ViewportResultCache,
  viewportResultCacheOwnersEqual,
  visibleCanvasViewBoxFromRects,
  VOLTAGE_BASE_CLEAR_SCOPE_LABELS,
  VOLTAGE_BASE_CLEAR_SCOPES,
  VOLTAGE_BASE_SET_PRESETS,
  VOLTAGE_BASE_SET_SCOPE_LABELS,
  VOLTAGE_BASE_SET_SCOPES,
  VOLTAGE_UNIT_OPTIONS,
  VoltageBaseSetMode,
  voltageColorKeyForTerminal,
  VoltageColorVisibility,
  WheelZoomAnchor,
  WritableDirectoryHandle,
  writeLocalDeviceLibraryPersistencePayload,
  writeStoredInteractionMode,
  writeTextFileToDirectory,
  writeViewportResultCache
} from "./GraphModelingAppSupport";

type AppRuntimeContext = Record<string, any>;

export function createBuildSingleNodeDragCache(ctx: AppRuntimeContext) {
  return (nodeIds: string[], edgeIds: string[], affectedEdges: Edge[]): SingleNodeDragCache | undefined => {
    const { colorDisplayMode, colorPalette, nodeById, visibleEdgeIdSet } = ctx;
    if (nodeIds.length !== 1) {
      return undefined;
    }
    const movedNodeIds = new Set(nodeIds);
    const draggedEdgeIds = new Set(edgeIds);
    const movedBusNodeIds = new Set(
      nodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    const relevantEdges = affectedEdges.filter((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return false;
      }
      return movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id);
    });
    const previewEdges = relevantEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT);
    const previewEndpointByEdgeId = new Map<string, SingleNodeDragPreviewEndpoint>();
    for (const edge of previewEdges) {
      const sourceMoves = movedNodeIds.has(edge.sourceId);
      const targetMoves = movedNodeIds.has(edge.targetId);
      const wholeEdgeMoves = draggedEdgeIds.has(edge.id) && !sourceMoves && !targetMoves;
      if (wholeEdgeMoves || movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)) {
        continue;
      }
      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) {
        continue;
      }
      if ((isBusNode(sourceNode) && !edge.sourcePoint) || (isBusNode(targetNode) && !edge.targetPoint)) {
        continue;
      }
      previewEndpointByEdgeId.set(edge.id, {
        edgeId: edge.id,
        color: getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette),
        start: getModelEdgeEndpointPoint(sourceNode, edge.sourcePoint, edge.sourceTerminalId),
        end: getModelEdgeEndpointPoint(targetNode, edge.targetPoint, edge.targetTerminalId),
        startMoves: sourceMoves,
        endMoves: targetMoves
      });
    }
    return {
      movedNodeIds,
      draggedEdgeIds,
      movedBusNodeIds,
      relevantEdges,
      previewEdges,
      snapEdges: relevantEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT),
      previewEndpointByEdgeId
    };
  
  };
}

export function createRenderGroupTransformPhotoPreview(ctx: AppRuntimeContext) {
  return () => {
    const { colorDisplayMode, colorPalette, connectionLineStyle, groupTransformPreviewEdgeRoutes, groupTransformPreviewNodeFromSnapshot, groupTransformPreviewTransform, mode, nodeById, nodeForegroundImage, nodeImage, transformDrag, visibleNodeIdSet } = ctx;
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !groupTransformPreviewTransform) {
      return null;
    }
    const bounds = transformDrag.bounds;
    return (
      <g className="group-transform-photo-preview">
        <g className="group-transform-origin-ghost">
          {transformDrag.originalEdgeRoutes.map((route) => (
            <path
              key={`group-transform-origin-edge-${route.edgeId}`}
              d={pointsToPreviewPath(route.points)}
              className="connection-line group-transform-origin-edge"
              style={connectionLineStyle(route.edgeId)}
            />
          ))}
          <rect
            className="group-transform-origin-outline"
            x={bounds.left}
            y={bounds.top}
            width={Math.max(1, bounds.right - bounds.left)}
            height={Math.max(1, bounds.bottom - bounds.top)}
          />
        </g>
        {groupTransformPreviewEdgeRoutes.map((route) => (
          <path key={`group-transform-photo-edge-${route.edgeId}`} d={route.path} className="connection-line group-transform-preview" style={connectionLineStyle(route.edgeId)} />
        ))}
        <g className="group-transform-photo-content" transform={groupTransformPreviewTransform}>
          {transformDrag.nodeIds.map((nodeId) => {
            const originalNode = nodeById.get(nodeId);
            if (!originalNode || !visibleNodeIdSet.has(originalNode.id)) {
              return null;
            }
            const node = groupTransformPreviewNodeFromSnapshot(originalNode);
            const imageHref = nodeImage(node);
            const foregroundImageHref = nodeForegroundImage(node);
            const nodeScaleX = getNodeScaleX(node);
            const nodeScaleY = getNodeScaleY(node);
            const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
            const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
            const nodeIsBus = isBusNode(node);
            const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
            const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
            return (
              <g
                key={`group-transform-photo-node-${node.id}`}
                className={`group-transform-photo-node ${nodeIsBus ? "bus-node" : ""}`}
                transform={`translate(${node.position.x} ${node.position.y})`}
              >
                <title>{node.name}</title>
                {imageHref && !nodeIsBus && (
                  <clipPath id={`group-transform-preview-clip-${node.id}`}>
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                    />
                  </clipPath>
                )}
                <g className="node-geometry" transform={nodeGeometryTransform(node)}>
                  <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                  <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                </g>
                {!nodeIsBus && (imageHref || foregroundImageHref) && (
                  <g className="node-upright-content" transform={nodeUprightScaleTransform(node)}>
                    {imageHref && isStaticNode(node) && (
                      <image
                        href={imageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#group-transform-preview-clip-${node.id})`}
                        className="node-background-image"
                      />
                    )}
                    {imageHref && !isStaticNode(node) && (
                      <rect
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        rx="8"
                        className="node-image-cover"
                      />
                    )}
                    {imageHref && !isStaticNode(node) && (
                      <image
                        href={imageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#group-transform-preview-clip-${node.id})`}
                        className="node-background-image"
                      />
                    )}
                    {foregroundImageHref && (
                      <image
                        href={foregroundImageHref}
                        x={-node.size.width / 2}
                        y={-node.size.height / 2}
                        width={node.size.width}
                        height={node.size.height}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#group-transform-preview-clip-${node.id})`}
                        className="node-foreground-image"
                      />
                    )}
                  </g>
                )}
                {!nodeIsBus && !isStaticNode(node) && !isRoutableLineDeviceKind(node.kind) && (
                  <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                    {node.terminals.map((terminal) => {
                      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind, node.size);
                      const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                      return (
                        <g key={terminal.id} transform={terminalControlTransform(renderPoint.x, renderPoint.y)}>
                          <line
                            className={`terminal-stub ${terminal.type}`}
                            strokeDasharray={terminalStubDashArray}
                            style={{
                              stroke: terminalDisplayColor,
                              strokeWidth: terminalStubStrokeWidth(node, terminal)
                            }}
                            x1={stub.from.x}
                            y1={stub.from.y}
                            x2={stub.to.x}
                            y2={stub.to.y}
                          />
                          <circle
                            className={`terminal-dot ${terminal.type}`}
                            style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                            cx="0"
                            cy="0"
                            r={6}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}
          <rect
            className="group-transform-photo-outline"
            x={bounds.left}
            y={bounds.top}
            width={Math.max(1, bounds.right - bounds.left)}
            height={Math.max(1, bounds.bottom - bounds.top)}
          />
        </g>
      </g>
    );
  
  };
}

export function createScheduleLibraryFlyoutClose(ctx: AppRuntimeContext) {
  return (group: AttributeLibrary, componentTypeKey?: string) => {
    const { clearLibraryFlyoutCloseTimer, libraryComponentListRefKey, libraryFlyoutCloseTimerRef, setHoveredAttributeLibrary, setHoveredAttributeLibraryComponentType, setLibraryFlyoutPositions } = ctx;
    clearLibraryFlyoutCloseTimer();
    libraryFlyoutCloseTimerRef.current = window.setTimeout(() => {
      setHoveredAttributeLibrary((current) => current === group ? "" : current);
      setHoveredAttributeLibraryComponentType((current) => componentTypeKey ? current === componentTypeKey ? "" : current : "");
      setLibraryFlyoutPositions((current) => {
        if (!componentTypeKey) {
          return Object.keys(current).length > 0 ? {} : current;
        }
        const key = libraryComponentListRefKey("flyout", componentTypeKey);
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
}

export function createBusTerminalSyncNodeIdsForGraphPatch(ctx: AppRuntimeContext) {
  return (movedNodeIds: Iterable<string>, previousCandidateEdges: Edge[], edgeUpserts: Edge[], edgeDeleteIds: string[]) => {
    const { busNodeIdsFromEdges } = ctx;
    const ids = new Set<string>();
    // Moving a bus or a device only changes endpoint coordinates. Bus terminal
    // counts/ids need resync only when an edge is added, deleted, or reattached.
    void movedNodeIds;
    const previousEdgeById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    const edgeAttachmentChanged = (previousEdge: Edge | undefined, nextEdge: Edge) =>
      !previousEdge ||
      previousEdge.sourceId !== nextEdge.sourceId ||
      previousEdge.targetId !== nextEdge.targetId ||
      previousEdge.sourceTerminalId !== nextEdge.sourceTerminalId ||
      previousEdge.targetTerminalId !== nextEdge.targetTerminalId;
    for (const nextEdge of edgeUpserts) {
      const previousEdge = previousEdgeById.get(nextEdge.id);
      if (!edgeAttachmentChanged(previousEdge, nextEdge)) {
        continue;
      }
      for (const busId of busNodeIdsFromEdges([previousEdge, nextEdge])) {
        ids.add(busId);
      }
    }
    if (edgeDeleteIds.length > 0) {
      const deleted = new Set(edgeDeleteIds);
      for (const busId of busNodeIdsFromEdges(previousCandidateEdges.filter((edge) => deleted.has(edge.id)))) {
        ids.add(busId);
      }
    }
    return ids;
  
  };
}

export function createMarkCanvasBoundsScrollSyncPending(ctx: AppRuntimeContext) {
  return () => {
    const { canvasBoundsScrollSyncPendingRef, canvasFrameRef, pendingCanvasBoundsScrollAnchorRef, releaseCanvasBoundsScrollSyncPending } = ctx;
    const frame = canvasFrameRef.current;
    if (!pendingCanvasBoundsScrollAnchorRef.current) {
      const hotzones = frame?.querySelector<HTMLElement>(".canvas-resize-hotzones");
      const visualRect = hotzones
        ? (() => {
            const rect = hotzones.getBoundingClientRect();
            return {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            };
          })()
        : undefined;
      pendingCanvasBoundsScrollAnchorRef.current = frame
        ? { left: frame.scrollLeft, top: frame.scrollTop, visualRect }
        : null;
    }
    canvasBoundsScrollSyncPendingRef.current = true;
    releaseCanvasBoundsScrollSyncPending();
  
  };
}

export function createClampEdgeGeometryToExpandableBounds(ctx: AppRuntimeContext) {
  return (edge: Edge, bounds: CanvasBounds): Edge => {
    const { clampPointToExpandableBounds } = ctx;
    let changed = false;
    const clampOptionalPoint = (point?: Point) => {
      if (!point) {
        return undefined;
      }
      const clamped = clampPointToExpandableBounds(point, bounds);
      if (clamped.x !== point.x || clamped.y !== point.y) {
        changed = true;
      }
      return clamped;
    };
    const sourcePoint = clampOptionalPoint(edge.sourcePoint);
    const targetPoint = clampOptionalPoint(edge.targetPoint);
    const manualPoints = edge.manualPoints?.map(clampOptionalPoint).filter((point): point is Point => Boolean(point));
    if (manualPoints && (!edge.manualPoints || manualPoints.some((point, index) => point.x !== edge.manualPoints?.[index]?.x || point.y !== edge.manualPoints?.[index]?.y))) {
      changed = true;
    }
    return changed ? { ...edge, sourcePoint, targetPoint, manualPoints } : edge;
  
  };
}

export function createSyncCanvasFrameScrollToCanvasResizeCommitAnchor(ctx: AppRuntimeContext) {
  return (anchor: CanvasResizeCommitAnchor) => {
    const { canvasBoundsRef, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasVerticalScrollbarsActiveRef, clampCanvasNoScrollOffsetPoint, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, setViewBox, skipNextCanvasScrollSyncRef, viewBoxRef } = ctx;
    const frame = canvasFrameRef.current;
    const hotzones = frame?.querySelector<HTMLElement>(".canvas-resize-hotzones");
    if (!frame || !hotzones) {
      return;
    }
    const hotzoneRect = hotzones.getBoundingClientRect();
    const currentRect: CanvasResizePreviewRect = {
      left: hotzoneRect.left,
      top: hotzoneRect.top,
      width: hotzoneRect.width,
      height: hotzoneRect.height
    };
    const maxScrollLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxScrollTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
    const target = canvasResizeScrollTargetForCommitAnchor({
      edge: anchor.edge,
      desiredRect: anchor.desiredRect,
      currentRect,
      currentScrollLeft: frame.scrollLeft,
      currentScrollTop: frame.scrollTop,
      maxScrollLeft,
      maxScrollTop
    });
    const syncScrollX = target.affectsX && maxScrollLeft > 1;
    const syncScrollY = target.affectsY && maxScrollTop > 1;
    const nextScrollLeft = syncScrollX ? target.left : frame.scrollLeft;
    const nextScrollTop = syncScrollY ? target.top : frame.scrollTop;
    if (
      Math.abs(frame.scrollLeft - nextScrollLeft) > 1 ||
      Math.abs(frame.scrollTop - nextScrollTop) > 1
    ) {
      setCanvasFrameScrollPosition(frame, nextScrollLeft, nextScrollTop);
      skipNextCanvasScrollSyncRef.current = true;
    }
    if (syncScrollX || syncScrollY) {
      const scrolledViewBox = canvasViewBoxFromFrameScrollPosition({
        currentViewBox: viewBoxRef.current,
        canvasBounds: canvasBoundsRef.current,
        scrollLeft: nextScrollLeft,
        scrollTop: nextScrollTop,
        maxScrollLeft,
        maxScrollTop,
        horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current || maxScrollLeft > 1,
        verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current || maxScrollTop > 1
      });
      skipNextCanvasScrollSyncRef.current = true;
      setViewBox((current) => {
        const nextViewBox = normalizeViewBoxToCanvas({
          ...current,
          x: syncScrollX ? scrolledViewBox.x : current.x,
          y: syncScrollY ? scrolledViewBox.y : current.y
        }, canvasBoundsRef.current);
        return sameCanvasViewBox(current, nextViewBox) ? current : nextViewBox;
      });
    }
    if ((target.affectsX && !syncScrollX) || (target.affectsY && !syncScrollY)) {
      setCanvasNoScrollOffset((current) => {
        const next = clampCanvasNoScrollOffsetPoint({
          x: target.affectsX && !syncScrollX ? current.x - target.deltaX : current.x,
          y: target.affectsY && !syncScrollY ? current.y - target.deltaY : current.y
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
  
  };
}

export function createBuildConnectPreviewPath(ctx: AppRuntimeContext) {
  return (source: typeof connectSource, point: Point | null, targetPoint: Point | null = null, target: ConnectTarget | null = null) => {
    const { canvasBounds, visibleNodeById } = ctx;
    const endPoint = targetPoint ?? point;
    if (!source || !endPoint) {
      return "";
    }
    const sourceNode = visibleNodeById.get(source.nodeId);
    if (!sourceNode) {
      return "";
    }
    const sourcePoint = source.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, source.terminalId);
    const previewTarget = target;
    const previewNodes = previewTarget?.node && previewTarget.node.id !== sourceNode.id
      ? [sourceNode, previewTarget.node]
      : [sourceNode];
    const route = routeEdgesForStoredRendering(
      previewNodes,
      [{
        id: "connect-preview",
        sourceId: sourceNode.id,
        targetId: previewTarget?.node.id ?? "floating-connect-preview-target",
        sourceTerminalId: source.terminalId,
        targetTerminalId: previewTarget?.terminalId ?? "t1",
        sourcePoint,
        targetPoint: previewTarget
          ? isBusNode(previewTarget.node)
            ? previewTarget.point ?? endPoint
            : previewTarget.point
          : endPoint
      }],
      canvasBounds
    )[0];
    return route?.path ?? "";
  
  };
}

export function createEdgeReferenceDiffIds(ctx: AppRuntimeContext) {
  return (previousEdges: Edge[], nextEdges: Edge[]) => {
    const { edgeListsHaveSameOrder } = ctx;
    if (edgeListsHaveSameOrder(previousEdges, nextEdges)) {
      const changed = new Set<string>();
      for (let index = 0; index < previousEdges.length; index += 1) {
        if (previousEdges[index] !== nextEdges[index]) {
          changed.add(nextEdges[index].id);
        }
      }
      return changed;
    }
    const previousById = new Map(previousEdges.map((edge) => [edge.id, edge]));
    const nextById = new Map(nextEdges.map((edge) => [edge.id, edge]));
    const changed = new Set<string>();
    for (const edge of nextEdges) {
      if (previousById.get(edge.id) !== edge) {
        changed.add(edge.id);
      }
    }
    for (const edge of previousEdges) {
      if (!nextById.has(edge.id)) {
        changed.add(edge.id);
      }
    }
    return changed;
  
  };
}

export function createPatchSingleTerminalAnchorFromPoint(ctx: AppRuntimeContext) {
  return (nodeId: string, terminalId: string, point: Point, originalMovingPoint: Point) => {
    const { markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, sameOptionalPoint, setGraphStore } = ctx;
    markGraphDirtyForInteractiveCommit();
    setGraphStore((current) => {
      const currentNode = current.nodeMap.get(nodeId);
      if (!currentNode || isBusNode(currentNode) || currentNode.terminals.length !== 1) {
        return current;
      }
      const anchor = snapSingleTerminalAnchorToNearestSide(currentNode, point);
      let changed = false;
      const nextTerminals = currentNode.terminals.map((terminal) => {
        if (terminal.id !== terminalId || sameOptionalPoint(terminal.anchor, anchor)) {
          return terminal;
        }
        changed = true;
        return { ...terminal, anchor };
      });
      if (!changed) {
        return current;
      }
      const nextNode = { ...currentNode, terminals: nextTerminals };
      const nextNodes = overlayGraphStoreNodes(current, [nextNode]);
      const dirtyEdges = (current.edgesByNodeId.get(nodeId) ?? []).filter((edge) =>
        (edge.sourceId === nodeId && edge.sourceTerminalId === terminalId) ||
        (edge.targetId === nodeId && edge.targetTerminalId === terminalId)
      );
      const dirtyEdgeIds = dirtyEdges.map((edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      markStoredRouteEdgesDirty(dirtyEdgeIds);
      const nextEdges = dirtyEdges.map((edge) => {
        const sourceAffected = edge.sourceId === nodeId && edge.sourceTerminalId === terminalId;
        const sourceNode = current.nodeMap.get(edge.sourceId);
        const targetNode = current.nodeMap.get(edge.targetId);
        const nextSourceNode = edge.sourceId === nodeId ? nextNode : sourceNode;
        const nextTargetNode = edge.targetId === nodeId ? nextNode : targetNode;
        const slidePatch = sourceNode && targetNode && nextSourceNode && nextTargetNode
          ? resolveStraightBusSlideEndpoint({
              edge,
              sourceNode,
              targetNode,
              nextSourceNode,
              nextTargetNode,
              movingEndpoint: sourceAffected ? "source" : "target",
              nodes: current.nodes,
              nextNodes,
              originalMovingPoint
            })
          : null;
        return slidePatch ? { ...edge, ...slidePatch } : edge;
      });
      return graphStoreApplyPatch(current, {
        nodeUpdates: [nextNode],
        edgeUpserts: nextEdges
      });
    });
  
  };
}

export function createUndoLastOperation(ctx: AppRuntimeContext) {
  return () => {
    const { applyUndoGraphSnapshot, deferredMoveOptimizationCancelRef, pendingBusTerminalSyncNodeIdsRef, pendingStoredRouteEdgeIdsRef, resetConnectPreviewState, setActiveLayerId, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasHeight, setCanvasSelectionScope, setCanvasWidth, setConnectSource, setContextMenu, setCurrentUnit, setDeviceIndexCounters, setGroups, setHasUnsavedChanges, setLayers, setOperationLogText, setPowerBaseValue, setPowerUnit, setProjectMenu, setProjectName, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTopology, setTopologyErrors, setTopologyStatus, setUndoStack, setVoltageUnit, skipNextTopologyStaleRef } = ctx;
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
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

export function createCurrentGraphDirtyBaseline(ctx: AppRuntimeContext) {
  return (): GraphDirtyBaseline => {
    const { activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectName, voltageUnit } = ctx;
    return ({
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
    groups
  });
  };
}

export function createPersistDeviceLibraryChange(ctx: AppRuntimeContext) {
  return (overrides: Partial<DeviceLibraryPersistencePayload>, messages: { success?: string; failure?: string } = {}) => {
    const { backendDeviceLibraryLoadedRef, customAttributeLibraries, customComponentTypes, customDeviceTemplates, customGraphTemplates, customGraphTemplateTypes, deviceDefinitionOverrides, lastPersistedDeviceLibraryPayloadRef, suppressNextBackendDeviceLibrarySyncRef, writeOperationLog } = ctx;
    const normalizedDeviceLibrary = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates,
      customAttributeLibraries,
      customComponentTypes,
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

export function createStartNodeLabelDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    const { activateInspectorFromCanvas, activeLayerNodeIdSet, clampPointToCanvas, isBrowseMode, selectCanvasGraphics, setGraphInfoView, setInspectorTab, setNodeLabelDrag, startModifierSelectionPress, svgRef } = ctx;
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
    setGraphInfoView("selected");
    activateInspectorFromCanvas();
    setNodeLabelDrag({
      nodeId: node.id,
      pointerId: event.pointerId,
      startPoint: point,
      startOffset: nodeLabelOffset(node),
      scaleX: Math.abs(getNodeScaleX(node)) || 1,
      scaleY: Math.abs(getNodeScaleY(node)) || 1
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createCutSelection(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, canvasSelectionScope, edges, groups, nodes, pushUndoSnapshot, requireEditMode, resetConnectPreviewState, resetRoutableLinePreviewState, routedEdges, setCanvasClipboard, setCanvasSelectionScope, setConnectSource, setContextMenu, setGraphArrays, setGroups, setRewiring, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, visibleEdges, visibleNodes, writeOperationLog } = ctx;
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

export function createConfirmAddGraphTemplate(ctx: AppRuntimeContext) {
  return () => {
    const { customGraphTemplates, customGraphTemplateTypes, persistTemplateLibraryChange, setCustomGraphTemplates, setCustomGraphTemplateTypes, setExpandedGraphTemplateTypes, setLeftPanelTab, setTemplateDialog, setTemplateDraftName, templateDialog, templateDraftName, templateDraftType, writeOperationLog } = ctx;
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

export function createDeleteSelection(ctx: AppRuntimeContext) {
  return () => {
    const { activeSelectedEdgeIds, activeSelectedNodeIds, edgeById, edgeListForNodeIds, edges, groups, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, pushUndoSnapshot, requireEditMode, setCanvasSelectionScope, setEdges, setGraphArrays, setGroups, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
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
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    writeOperationLog(`删除 ${activeSelectedNodeIds.length} 个图元`);
  
  };
}

export function createRouteTouchesExpandedBoxes(ctx: AppRuntimeContext) {
  return (points: Point[], boxes: Array<{ left: number; right: number; top: number; bottom: number }>) => {
    const { boxesOverlap } = ctx;
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

export function createRoutableLineRouteCandidateIdsForMovedNodes(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[], movedNodeIds: string[], originalPositions?: Record<string, Point>) => {
    const { boundsForNodeSet, orderedNodesForIds, visibleNodeSpatialIndex } = ctx;
    const movedIds = new Set(movedNodeIds);
    const candidateIds = new Set<string>();
    if (movedIds.size === 0) {
      return candidateIds;
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
        if (isRoutableLineDeviceKind(node.kind)) {
          candidateIds.add(node.id);
        }
      }
    };
    addLinesNearBounds(boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addLinesNearBounds(boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return candidateIds;
  
  };
}

export function createRoutePointsForMovedNodeBlockers(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: Iterable<string>, baseRoutePoints: DraggingState["originalRoutePoints"]): DraggingState["originalRoutePoints"] => {
    const { boxesOverlap, orderedNodesForIds, routedEdgeById, routedEdgeSpatialIndex } = ctx;
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

export function createRebuildSingleAffectedConnectionRoute(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: Iterable<string>, selectedEdgeIds = new Set<string>(), searchEdges: Edge[] = candidateEdges) => {
    const { canvasBounds, routingNodesForConnectionEdge } = ctx;
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
    return rebuildSingleConnectionRoute(routingNodes, candidateEdges, affectedEdgeIds[0], canvasBounds);
  
  };
}

export function createTerminalReconcileNodeScope(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[], movedNodeIds: Set<string>) => {
    const { boundsForNodeSet, orderedNodesForIds, visibleNodeSpatialIndex } = ctx;
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

export function createOptimizeMovedNodeEdgeRoutes(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: string[], originalRoutePoints: DraggingState["originalRoutePoints"], selectedEdgeIds = new Set<string>(), precomputedBlockedRoutePoints: DraggingState["originalRoutePoints"] = {}, forcedRerouteEdgeIds = new Set<string>(), routeSearchEdges: Edge[] = candidateEdges) => {
    const { canvasBounds, rebuildSingleAffectedConnectionRoute, routePointsForMovedNodeBlockers, routePointSnapshotToRoutes, routingNodesForConnectionEdges } = ctx;
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
        routeSearchEdges
      )
    };
  
  };
}

export function createScheduleDeferredMovedConnectionRepair(ctx: AppRuntimeContext) {
  return (movedNodeIds: string[], candidateEdges: Edge[], expectedPatch: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] }, effectiveCanvasBounds: CanvasBounds = canvasBounds, previousNodesForMove: ModelNode[] = [], originalPositions?: Record<string, Point>, originalRoutePoints: DraggingState["originalRoutePoints"] = {}, selectedEdgeIds = new Set<string>(), options: SingleNodeDeferredRepairOptions = {}) => {
    const { busTerminalSyncNodeIdsForGraphPatch, canvasBoundsForAutoExpandedGraphContent, deferredMoveOptimizationCancelRef, edgePatchFromCandidateEdges, finalizeMovedNodeEdgesFast, graphStorePatchStillCurrent, latestGraphStoreRef, markBusTerminalSyncDirty, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, optimizeMovedNodeEdgeRoutes, routePointsForMovedEdgesBlockedByStationaryNodes, routePointsForMovedNodeBlockers, routePointsNearOriginalMovedNodes, setGraphStore } = ctx;
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

export function createBuildSingleNodeDragPreviewNodeMarkup(ctx: AppRuntimeContext) {
  return (dragState: DraggingState) => {
    const { colorDisplayMode, colorPalette, nodeById, visibleNodeIdSet } = ctx;
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
    const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette }));
    const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette }));
    const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
    const labelMarkup = buildSvgNodeLabelMarkup(node);
    return `<g class="single-node-drag-preview-node ${nodeIsBus ? "bus-node" : ""}" transform="translate(${formatSvgNumber(originalPosition.x)} ${formatSvgNumber(originalPosition.y)})">
  <title>${escapeXml(node.name)}</title>
  <g class="node-geometry" transform="${escapeXml(nodeGeometryTransform(node))}">
    <rect class="node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${isStaticNode(node) ? "static-hitbox" : ""}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 8}"/>
    ${glyphMarkup}
    ${glyphTextMarkup}
  </g>
  <g class="node-terminal-layer" transform="${escapeXml(nodeGeometryTransform(node))}">
    ${terminalMarkup}
  </g>
  ${labelMarkup}
</g>`;
  
  };
}

export function createBuildDragPreviewEndpointPoints(ctx: AppRuntimeContext) {
  return (dragState: DraggingState, edge: Edge, delta: Point, movedNodeIds: Set<string>, draggedEdgeIds: Set<string>, movedBusIds: Set<string>) => {
    const { shiftedDragPreviewPoint, singleNodeDragPreviewNodeFor } = ctx;
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    const wholeEdgeMoves = draggedEdgeIds.has(edge.id) && !sourceMoved && !targetMoved;
    const originalPoints = dragState.originalEdgePoints[edge.id];
    const sourcePoint = movedBusIds.has(edge.sourceId) || wholeEdgeMoves
      ? shiftedDragPreviewPoint(originalPoints?.sourcePoint, delta) ?? edge.sourcePoint
      : edge.sourcePoint;
    const targetPoint = movedBusIds.has(edge.targetId) || wholeEdgeMoves
      ? shiftedDragPreviewPoint(originalPoints?.targetPoint, delta) ?? edge.targetPoint
      : edge.targetPoint;
    const source = singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta);
    const target = singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta);
    if (!source || !target) {
      return null;
    }
    let start = getModelEdgeEndpointPoint(source, sourcePoint, edge.sourceTerminalId);
    let end = getModelEdgeEndpointPoint(target, targetPoint, edge.targetTerminalId);
    if (isBusNode(source) && !sourcePoint) {
      start = projectPointToBusCenterline(source, end);
    }
    if (isBusNode(target) && !targetPoint) {
      end = projectPointToBusCenterline(target, start);
    }
    return { start, end };
  
  };
}

export function createUpdateNodeDragLightweightEdgePreview(ctx: AppRuntimeContext) {
  return (dragState: DraggingState, previewDelta: Point, scopedPreviewEdges?: Edge[]) => {
    const { buildLightweightNodeDragPreviewRoutes, imperativeNodeDragEdgePreviewKeyRef, imperativeSingleNodeDragEdgePreviewRef, singleNodeDragPreviewEdges, singleNodeDragPreviewKey, syncImperativeNodeDragPreviewPaths } = ctx;
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

export function createSingleNodeDragInteractionNodes(ctx: AppRuntimeContext) {
  return (dragState: DraggingState, delta: Point, scopedSnapEdges?: Edge[]) => {
    const { nodeById, singleNodeDragPreviewNodeFor, singleNodeDragSnapEdges, visibleNodeIdSet, visibleNodeSpatialIndex } = ctx;
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

export function createFlushConnectPreviewDom(ctx: AppRuntimeContext) {
  return () => {
    const { connectDropHintElementRef, connectPreviewDomRef, connectPreviewPathElementRef } = ctx;
    const { path, targetPoint } = connectPreviewDomRef.current;
    const previewPath = connectPreviewPathElementRef.current;
    if (previewPath) {
      if (path) {
        previewPath.setAttribute("d", path);
        previewPath.style.display = "";
      } else {
        previewPath.removeAttribute("d");
        previewPath.style.display = "none";
      }
    }
    const dropHint = connectDropHintElementRef.current;
    if (dropHint) {
      if (targetPoint) {
        dropHint.setAttribute("transform", `translate(${Math.round(targetPoint.x)} ${Math.round(targetPoint.y)})`);
        dropHint.style.display = "";
      } else {
        dropHint.style.display = "none";
      }
    }
  
  };
}

export function createApplyConnectPreviewState(ctx: AppRuntimeContext) {
  return (point: Point | null, ready: boolean, targetPoint: Point | null = null, target: ConnectTarget | null = null, sourceOverride: typeof connectSource = connectSource) => {
    const { buildConnectPreviewPath, connectDropReadyRef, connectDropTargetPointRef, connectDropTargetRef, connectPreviewPointRef, sameConnectTarget, sameOptionalPoint, setConnectDropReady, setConnectPreviewDom } = ctx;
    const previousPoint = connectPreviewPointRef.current;
    if (!sameOptionalPoint(previousPoint ?? undefined, point ?? undefined)) {
      connectPreviewPointRef.current = point;
    }
    const previousTargetPoint = connectDropTargetPointRef.current;
    const nextTargetPoint = ready ? targetPoint : null;
    if (!sameOptionalPoint(previousTargetPoint ?? undefined, nextTargetPoint ?? undefined)) {
      connectDropTargetPointRef.current = nextTargetPoint;
    }
    const previousTarget = connectDropTargetRef.current;
    const nextTarget = ready ? target : null;
    if (!sameConnectTarget(previousTarget ?? undefined, nextTarget)) {
      connectDropTargetRef.current = nextTarget;
    }
    setConnectPreviewDom(buildConnectPreviewPath(sourceOverride, point, nextTargetPoint, nextTarget), nextTargetPoint);
    if (connectDropReadyRef.current !== ready) {
      connectDropReadyRef.current = ready;
      setConnectDropReady(ready);
    }
  
  };
}

export function createScheduleRoutableLinePreviewPoint(ctx: AppRuntimeContext) {
  return (point: Point | null) => {
    const { applyRoutableLinePreviewState, connectTargetPoint, findRoutableLineEndpointTargetAtPoint, pendingRoutableLinePreviewRef, routableLinePreviewFrameRef } = ctx;
    pendingRoutableLinePreviewRef.current = { point };
    if (routableLinePreviewFrameRef.current !== null) {
      return;
    }
    routableLinePreviewFrameRef.current = window.requestAnimationFrame(() => {
      routableLinePreviewFrameRef.current = null;
      const next = pendingRoutableLinePreviewRef.current;
      pendingRoutableLinePreviewRef.current = null;
      if (!next) {
        return;
      }
      const target = next.point ? findRoutableLineEndpointTargetAtPoint(next.point) : null;
      applyRoutableLinePreviewState(
        next.point,
        target ? connectTargetPoint(target) : null,
        target
      );
    });
  
  };
}

export function createBoundedDeltaForNodes(ctx: AppRuntimeContext) {
  return (nodeIds: string[], originalPositions: Record<string, Point>, dx: number, dy: number, bounds: CanvasBounds = canvasBounds) => {
    const { clampNodePositionToExpandableBounds, nodes, orderedNodesForIds } = ctx;
    let boundedDx = dx;
    let boundedDy = dy;
    const selected = new Set(nodeIds);
    for (const node of orderedNodesForIds(nodes, selected)) {
      const original = originalPositions[node.id];
      if (!selected.has(node.id) || !original) {
        continue;
      }
      const clamped = clampNodePositionToExpandableBounds(node, bounds, { x: original.x + boundedDx, y: original.y + boundedDy });
      boundedDx = clamped.x - original.x;
      boundedDy = clamped.y - original.y;
    }
    return { x: boundedDx, y: boundedDy };
  
  };
}

export function createCanvasBoundsForMovedNodeDelta(ctx: AppRuntimeContext) {
  return (nodeIds: string[], originalPositions: Record<string, Point>, dx: number, dy: number) => {
    const { allowAutoExpandCanvas, canvasBounds, canvasBoundsForGraphContent, nodeById } = ctx;
    if (nodeIds.length === 0) {
      return canvasBounds;
    }
    if (!allowAutoExpandCanvas) {
      return canvasBounds;
    }
    const movedNodes: ModelNode[] = [];
    const seen = new Set<string>();
    for (const nodeId of nodeIds) {
      if (seen.has(nodeId)) {
        continue;
      }
      seen.add(nodeId);
      const node = nodeById.get(nodeId);
      const originalPosition = originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      movedNodes.push({
        ...node,
        position: {
          x: Math.round(originalPosition.x + dx),
          y: Math.round(originalPosition.y + dy)
        }
      });
    }
    return movedNodes.length > 0
      ? canvasBoundsForGraphContent(canvasBounds, movedNodes, [], [], CANVAS_AUTO_EXPAND_PADDING)
      : canvasBounds;
  
  };
}

export function createComputeNodeDragDelta(ctx: AppRuntimeContext) {
  return (dragState: DraggingState, point: Point, ctrlKey: boolean, shiftKey: boolean) => {
    const { boundedDeltaForMoveGeometry, boundedDeltaForMultiNodeInteractiveMove, canvasBoundsForMoveDelta, computeNodeDragPreviewDelta } = ctx;
    const movementDelta = computeNodeDragPreviewDelta(dragState, point, ctrlKey, shiftKey);
    if (isMultiNodeMoveState(dragState)) {
      return boundedDeltaForMultiNodeInteractiveMove(dragState, movementDelta);
    }
    const expandedBounds = canvasBoundsForMoveDelta(dragState.nodeIds, dragState.originalPositions, movementDelta.x, movementDelta.y);
    return boundedDeltaForMoveGeometry(
      dragState.nodeIds,
      dragState.edgeIds,
      dragState.affectedEdges,
      dragState.originalPositions,
      dragState.originalEdgePoints,
      dragState.originalRoutePoints,
      movementDelta.x,
      movementDelta.y,
      dragState.currentDelta ?? { x: 0, y: 0 },
      expandedBounds
    );
  
  };
}

export function createCancelActiveEditInteractions(ctx: AppRuntimeContext) {
  return () => {
    const { canvasResizeDraftRef, clearDraggingMoveState, resetConnectPreviewState, setCanvasResizeDraft, setCanvasResizeDrag, setConnectDropReady, setConnectSource, setLibraryPlacement, setManualPathDrag, setMarquee, setMode, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setRewiring, setStaticDrawing, setTerminalPress, setTransformDrag, staticButtonPointerRef } = ctx;
    clearDraggingMoveState();
    setMode("select");
    setStaticDrawing(null);
    setLibraryPlacement(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setConnectDropReady(false);
    setRewiring(null);
    setTerminalPress(null);
    setNodeLabelDrag(null);
    setNodeLabelRotateDrag(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setCanvasResizeDrag(null);
    canvasResizeDraftRef.current = null;
    setCanvasResizeDraft(null);
    setMarquee(null);
    setModifierSelectionPress(null);
    staticButtonPointerRef.current = null;
  
  };
}

export function createFinishNodeDrag(ctx: AppRuntimeContext) {
  return () => {
    const { adjustEdgesAfterNodeMove, applyCanvasBounds, boundedDeltaForMoveGeometry, buildMovedNodeUpdates, canvasBoundsForMoveDelta, canvasInteractionRef, clearNodeDragMoveSchedule, commitFastMovedGraphPatches, commitSafeDeltaForDraggingState, dragDraggedEdgeIdSet, draggingRef, dragMovedBusNodeIdSet, dragMovedNodeIdSet, dragUndoCapturedRef, ensureDraggingUndoSnapshot, finalizeMovedNodeEdgesFast, findMultiNodeDragSnapTargetAtDelta, findSingleNodeDragSnapTargetAtDelta, flushPendingNodeDragMove, graphStore, hideImperativeMultiNodeDragOverlay, hideImperativeSingleNodeDragPreview, mergeAdjustedCandidateEdges, nextNodesForMovedGraphCommit, nodes, nodeTerminalSnapTargetRef, projectListPointerInsideRef, resetMultiNodeDragOverlayTransform, restoreCanvasSelectionSnapshot, routePreserveEdgeIdsForMovedNodes, setDragging, shouldFinalizeMovedNodeEdgesSynchronously, synchronousEdgeAdjustmentCandidates, writeOperationLog } = ctx;
    flushPendingNodeDragMove(false);
    const activeDragging = draggingRef.current;
    if (!activeDragging) {
      return;
    }
    const delta = commitSafeDeltaForDraggingState(activeDragging);
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      clearNodeDragMoveSchedule();
      resetMultiNodeDragOverlayTransform();
      hideImperativeMultiNodeDragOverlay();
      hideImperativeSingleNodeDragPreview();
      draggingRef.current = null;
      setDragging(null);
      restoreCanvasSelectionSnapshot(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      return;
    }
    ensureDraggingUndoSnapshot();
    const dragNodeIds = dragMovedNodeIdSet(activeDragging);
    const dragEdgeIds = dragDraggedEdgeIdSet(activeDragging);
    const dragBusNodeIds = dragMovedBusNodeIdSet(activeDragging);
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
    const releaseSnapTarget = nodeTerminalSnapTargetRef.current ?? (
      multiNodeMove
        ? findMultiNodeDragSnapTargetAtDelta(activeDragging, delta)
        : findSingleNodeDragSnapTargetAtDelta(activeDragging, delta)
    );
    const effectiveSnapTarget = releaseSnapTarget;
    const snappedDelta = applyNodeTerminalSnap(delta, effectiveSnapTarget);
    const finalDelta =
      snappedDelta.x !== delta.x || snappedDelta.y !== delta.y
        ? boundedDeltaForMoveGeometry(
            activeDragging.nodeIds,
            activeDragging.edgeIds,
            activeDragging.affectedEdges,
            activeDragging.originalPositions,
            activeDragging.originalEdgePoints,
            activeDragging.originalRoutePoints,
            snappedDelta.x,
            snappedDelta.y,
            delta,
            canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, snappedDelta.x, snappedDelta.y)
          )
        : delta;
    if (finalDelta.x === 0 && finalDelta.y === 0) {
      clearNodeDragMoveSchedule();
      resetMultiNodeDragOverlayTransform();
      hideImperativeMultiNodeDragOverlay();
      hideImperativeSingleNodeDragPreview();
      draggingRef.current = null;
      setDragging(null);
      restoreCanvasSelectionSnapshot(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      return;
    }
    const finalBounds = canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta.x, finalDelta.y);
    applyCanvasBounds(finalBounds);
    const movedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
    const nextNodes = nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, dragNodeIds);
    const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(
      activeDragging.affectedEdges,
      dragNodeIds,
      dragEdgeIds,
      dragBusNodeIds,
      activeDragging.originalRoutePoints
    );
    const preserveRouteEdgeIds = synchronousCandidateEdges.length > 0
      ? routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, dragNodeIds, dragEdgeIds)
      : new Set<string>();
    const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0
      ? adjustEdgesAfterNodeMove(
          synchronousCandidateEdges,
          nextNodes,
          dragNodeIds,
          activeDragging.originalEdgePoints,
          Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta])),
          activeDragging.originalRoutePoints,
          preserveRouteEdgeIds,
          finalBounds
        )
      : synchronousCandidateEdges;
    const adjustedAffectedEdges = mergeAdjustedCandidateEdges(activeDragging.affectedEdges, adjustedSynchronousEdges);
    const finalizedCandidateEdges = shouldFinalizeMovedNodeEdgesSynchronously(activeDragging.nodeIds, adjustedAffectedEdges)
      ? finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          activeDragging.nodeIds,
          adjustedAffectedEdges
        )
      : adjustedAffectedEdges;
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      activeDragging.affectedEdges,
      activeDragging.nodeIds,
      activeDragging.originalRoutePoints,
      dragEdgeIds,
      activeDragging.originalPositions,
      nodes,
      finalBounds
    );
    clearNodeDragMoveSchedule();
    resetMultiNodeDragOverlayTransform();
    hideImperativeMultiNodeDragOverlay();
    hideImperativeSingleNodeDragPreview();
    draggingRef.current = null;
    setDragging(null);
    restoreCanvasSelectionSnapshot(activeDragging.selection);
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    dragUndoCapturedRef.current = false;
    const snapText =
      effectiveSnapTarget &&
      finalDelta.x === snappedDelta.x &&
      finalDelta.y === snappedDelta.y
        ? "，端子已吸附"
        : "";
    writeOperationLog(`拖拽 ${activeDragging.nodeIds.length} 个图元 (${Math.round(finalDelta.x)}, ${Math.round(finalDelta.y)})${snapText}`);
  
  };
}

export function createScheduleKeyboardNudgeFrame(ctx: AppRuntimeContext) {
  return () => {
    const { appendPendingKeyboardMoveDelta, flushPendingKeyboardMove, keyboardMoveActiveFrameDelta, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef } = ctx;
    if (keyboardMoveFrameRef.current !== null) {
      return;
    }
    keyboardMoveFrameRef.current = window.requestAnimationFrame((timestamp) => {
      keyboardMoveFrameRef.current = null;
      const previousTimestamp = keyboardMoveLastFrameTimeRef.current;
      keyboardMoveLastFrameTimeRef.current = timestamp;
      const elapsedMs = previousTimestamp === null ? 0 : Math.min(50, timestamp - previousTimestamp);
      if (elapsedMs > 0) {
        keyboardMoveFrameElapsedMsRef.current += elapsedMs;
      }
      if (keyboardMoveFrameElapsedMsRef.current >= KEYBOARD_MOVE_FRAME_INTERVAL_MS) {
        const elapsedToApply = keyboardMoveFrameElapsedMsRef.current;
        keyboardMoveFrameElapsedMsRef.current = 0;
        const frameDelta = keyboardMoveActiveFrameDelta(elapsedToApply);
        if (frameDelta) {
          appendPendingKeyboardMoveDelta(frameDelta);
        }
      }
      flushPendingKeyboardMove(true);
      if (keyboardMoveActiveKeyDeltasRef.current.size > 0) {
        scheduleKeyboardNudgeFrame();
      }
    });
  
  };
}

export function createStartKeyboardMoveSession(ctx: AppRuntimeContext) {
  return (renderInitial = true) => {
    const { activeSelectedEdgeIds, activeSelectedNodeIds, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clearNodeDragMoveSchedule, currentCanvasSelectionSnapshot, displaySelectedEdgeIds, displaySelectedNodeIds, dragging, draggingRef, dragUndoCapturedRef, edgeListForNodeIds, nodeById, requireEditMode, routePointsSnapshotForMove, snapshotRouteBounds, startDraggingState } = ctx;
    if (!requireEditMode("移动图元")) {
      return null;
    }
    const moveNodeIds = canvasSelectionScope === "direct" ? displaySelectedNodeIds : activeSelectedNodeIds;
    const moveEdgeIds = canvasSelectionScope === "direct" ? displaySelectedEdgeIds : activeSelectedEdgeIds;
    if (moveNodeIds.length === 0) {
      return null;
    }
    const activeDragging = draggingRef.current ?? dragging;
    if (activeDragging?.source === "keyboard") {
      return activeDragging;
    }
    if (activeDragging) {
      return null;
    }
    const affectedEdgesForMove = edgeListForNodeIds(moveNodeIds, moveEdgeIds);
    const originalPositionsForMove = Object.fromEntries(
      moveNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForMove = routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds);
    const nextDragging: DraggingState = {
      source: "keyboard",
      nodeIds: moveNodeIds,
      edgeIds: moveEdgeIds,
      affectedEdges: affectedEdgesForMove,
      startPoint: { x: 0, y: 0 },
      originalPositions: originalPositionsForMove,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForMove.map((edge) => [
          edge.id,
          {
            sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
            manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
            routePoints: edge.routePoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForMove,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForMove),
      singleNodeDragCache: buildSingleNodeDragCache(moveNodeIds, moveEdgeIds, affectedEdgesForMove),
      overlayPreview: isMultiNodeMoveState({ nodeIds: moveNodeIds })
        ? buildMultiNodeDragOverlayPreview(moveNodeIds, affectedEdgesForMove, originalPositionsForMove, originalRoutePointsForMove, moveEdgeIds)
        : undefined,
      selection: currentCanvasSelectionSnapshot()
    };
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    if (renderInitial || isMultiNodeMoveState(nextDragging)) {
      startDraggingState(nextDragging);
    } else {
      draggingRef.current = nextDragging;
    }
    return nextDragging;
  
  };
}

export function createCommitNodeFootprintUpdates(ctx: AppRuntimeContext) {
  return (nodeUpdates: ModelNode[], options: { previousNodes?: ModelNode[] } = {}) => {
    const { allowAutoExpandCanvas, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsWithOriginShift, edgeListForNodeIds, edgePatchFromCandidateEdges, edges, expandCanvasToFitGraph, graphStore, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, optimizeMovedNodeEdgeRoutes, rejectAutoCanvasExpansionForContent, requireEditMode, routePointsForMovedNodeBlockers, setGraphStore, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy } = ctx;
    if (!requireEditMode("修改图元")) {
      return;
    }
    const existingUpdates = nodeUpdates.filter((node) => nodeById.has(node.id));
    if (existingUpdates.length === 0) {
      return;
    }
    const changedNodeIds = Array.from(new Set(existingUpdates.map((node) => node.id)));
    const previousNodes = options.previousNodes ?? nodes;
    const nextNodes = overlayGraphStoreNodes(graphStore, existingUpdates);
    const directCandidateEdges = edgeListForNodeIds(changedNodeIds);
    if (rejectAutoCanvasExpansionForContent(existingUpdates, directCandidateEdges)) {
      return;
    }
    const originShift = allowAutoExpandCanvas ? leftTopCanvasOriginShiftForContent(existingUpdates, directCandidateEdges) : { x: 0, y: 0 };
    if (hasCanvasOriginShift(originShift)) {
      const shiftedNodes = nextNodes.map((node) => translateNodeBy(node, originShift));
      const shiftedEdges = edges.map((edge) => translateEdgeBy(edge, originShift));
      const shiftedBounds = canvasBoundsForGraphContent(
        canvasBoundsWithOriginShift(canvasBounds, originShift),
        shiftedNodes,
        shiftedEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(shiftedBounds, originShift);
      shiftCachedRoutesForCanvasOrigin(originShift);
      const shiftedEdgeIds = shiftedEdges.map((edge) => edge.id);
      markRouteEdgesDirty(shiftedEdgeIds);
      markStoredRouteEdgesDirty(shiftedEdgeIds);
      markBusTerminalSyncDirtyForEdges(shiftedEdges);
      setGraphStore((current) => graphStoreSetGraph(current, shiftedNodes, shiftedEdges));
      return;
    }
    const footprintCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBounds,
      existingUpdates,
      directCandidateEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    const candidateEdges = localRouteOptimizationCandidateEdges(
      previousNodes,
      nextNodes,
      changedNodeIds,
      new Set<string>(),
      undefined,
      directCandidateEdges
    );
    const optimizationEdges = localRouteOptimizationEdges(
      previousNodes,
      nextNodes,
      candidateEdges,
      changedNodeIds,
      new Set<string>(),
      undefined
    );
    const blockedRoutePoints = routePointsForMovedNodeBlockers(nextNodes, optimizationEdges, changedNodeIds, {});
    const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));
    const optimizedEdges = blockedEdgeIds.size > 0
      ? optimizeMovedNodeEdgeRoutes(
          nextNodes,
          optimizationEdges,
          changedNodeIds,
          {},
          new Set<string>(),
          blockedRoutePoints,
          blockedEdgeIds,
          optimizationEdges
        ).edges
      : optimizationEdges;
    const edgeUpdates = optimizedEdges === optimizationEdges
      ? []
      : edgePatchFromCandidateEdges(optimizationEdges, optimizedEdges).edgeUpserts;
    if (edgeUpdates.length > 0) {
      const dirtyEdgeIds = edgeUpdates.map((edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      markStoredRouteEdgesDirty(dirtyEdgeIds);
      markBusTerminalSyncDirtyForEdges(edgeUpdates);
    }
    expandCanvasToFitGraph(existingUpdates, edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, footprintCanvasBounds);
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: existingUpdates,
        edgeUpserts: edgeUpdates
      })
    );
  
  };
}

export function createMirrorSelectedNodes(ctx: AppRuntimeContext) {
  return (axis: "horizontal" | "vertical") => {
    const { buildMirrorLayoutUnitEdgeUpdates, edges, expandCanvasToFitGraph, graphStore, markRouteEdgesDirty, markStoredRouteEdgesDirty, mirrorLayoutUnitNodeUpdates, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, requireEditMode, selectedLayoutUnits, setGraphStore, setSelectedEdgeId, writeOperationLog } = ctx;
    if (!requireEditMode("镜像图元")) {
      return;
    }
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    pushUndoSnapshot();
    setSelectedEdgeId("");
    const nodeUpdates = mirrorLayoutUnitNodeUpdates(selectedLayoutUnits, axis);
    const transformedNodeIds = nodeUpdates.map((node) => node.id);
    const nextNodes = overlayGraphStoreNodes(graphStore, nodeUpdates);
    const mirroredEdgeUpdates = buildMirrorLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, axis);
    const preservedMirrorEdgeIds = new Set(mirroredEdgeUpdates.map((edge) => edge.id));
    markRouteEdgesDirty(preservedMirrorEdgeIds);
    markStoredRouteEdgesDirty(preservedMirrorEdgeIds);
    const reroutedEdgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedMirrorEdgeIds);
    const edgeUpdates = [...mirroredEdgeUpdates, ...reroutedEdgeUpdates];
    expandCanvasToFitGraph(nodeUpdates, edgeUpdates);
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates,
        edgeUpserts: edgeUpdates
      })
    );
    writeOperationLog(`${axis === "horizontal" ? "水平" : "垂直"}镜像 ${selectedLayoutUnits.length} 个选中单元`);
  
  };
}

export function createRenderStaticButtonActionEditor(ctx: AppRuntimeContext) {
  return (node: ModelNode) => {
    const { isBrowseMode, layers, renderChineseParamHeader, schemes, updateParam, updateSelectedNode } = ctx;
    if (!isStaticButtonCapableKind(node.kind)) {
      return null;
    }
    const buttonEnabled = node.params.buttonEnabled === "1";
    const actionType = node.params.buttonActionType || "none";
    const projectOptions = flattenSavedSchemes(schemes).flatMap((scheme) =>
      scheme.projects.map((project) => ({
        schemeId: scheme.id,
        schemeName: scheme.name,
        project
      }))
    );
    return (
      <>
        <tr>
          {renderChineseParamHeader("buttonEnabled")}
          <td>
            <select
              value={buttonEnabled ? "1" : "0"}
              disabled={isBrowseMode}
              onChange={(event) => updateParam("buttonEnabled", event.target.value)}
            >
              <option value="1">启用</option>
              <option value="0">禁用</option>
            </select>
          </td>
        </tr>
        {buttonEnabled && (
          <>
            <tr>
              {renderChineseParamHeader("buttonActionType")}
              <td>
                <select value={actionType} disabled={isBrowseMode} onChange={(event) => updateParam("buttonActionType", event.target.value)}>
                  {Object.entries(STATIC_BUTTON_ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
            </tr>
            {actionType === "project" && (
              <tr>
                {renderChineseParamHeader("buttonTargetProjectId")}
                <td>
                  <select
                    value={node.params.buttonTargetProjectId || ""}
                    disabled={isBrowseMode}
                    onChange={(event) => {
                      const selected = projectOptions.find((item) => item.project.id === event.target.value);
                      updateSelectedNode({
                        params: {
                          ...node.params,
                          buttonTargetProjectId: selected?.project.id ?? "",
                          buttonTargetProjectName: selected?.project.name ?? "",
                          buttonTargetSchemeId: selected?.schemeId ?? ""
                        }
                      });
                    }}
                  >
                    <option value="">请选择目标模型</option>
                    {projectOptions.map(({ schemeId, schemeName, project }) => (
                      <option key={`${schemeId}:${project.id}`} value={project.id}>
                        {schemeName} / {project.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )}
            {actionType === "layer" && (
              <tr>
                {renderChineseParamHeader("buttonTargetLayerIds")}
                <td>
                  <select
                    className="static-button-layer-select"
                    multiple
                    size={Math.min(Math.max(layers.length, 2), 6)}
                    value={resolveStaticButtonTargetLayers(node, layers).map((layer) => layer.id)}
                    disabled={isBrowseMode}
                    onChange={(event) => {
                      const selectedLayerIds = Array.from(event.target.selectedOptions).map((option) => option.value);
                      const selectedLayers = selectedLayerIds
                        .map((layerId) => layers.find((layer) => layer.id === layerId))
                        .filter((layer): layer is ModelLayer => Boolean(layer));
                      updateSelectedNode({
                        params: {
                          ...node.params,
                          buttonTargetLayerId: selectedLayers[0]?.id ?? "",
                          buttonTargetLayerName: selectedLayers[0]?.name ?? "",
                          buttonTargetLayerIds: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.id)),
                          buttonTargetLayerNames: serializeStaticButtonTargetLayerIds(selectedLayers.map((layer) => layer.name))
                        }
                      });
                    }}
                  >
                    {layers.map((layer) => (
                      <option key={layer.id} value={layer.id}>{layer.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            )}
            {actionType === "command" && (
              <tr>
                {renderChineseParamHeader("buttonCommand")}
                <td>
                  <select value={node.params.buttonCommand || "none"} disabled={isBrowseMode} onChange={(event) => updateParam("buttonCommand", event.target.value)}>
                    {Object.entries(STATIC_BUTTON_COMMAND_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            )}
          </>
        )}
      </>
    );
  
  };
}

export function createStartCanvasResize(ctx: AppRuntimeContext) {
  return (event: PointerEvent<Element>, edge: CanvasResizeEdge) => {
    const { canvasBoundsRef, canvasDisplayHeight, canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasHorizontalScrollbarsActive, canvasResizeUndoCapturedRef, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasVerticalScrollbarsActive, clearCanvasBoundsScrollSyncPending, minimumCanvasBoundsForResizeEdge, pendingCanvasResizeCommitAnchorRef, requireEditMode, setCanvasResizeDrag, svgRef } = ctx;
    event.preventDefault();
    event.stopPropagation();
    if (!requireEditMode("调整画布边界")) {
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    const currentCanvasBounds = canvasBoundsRef.current;
    canvasResizeUndoCapturedRef.current = false;
    clearCanvasBoundsScrollSyncPending();
    pendingCanvasResizeCommitAnchorRef.current = null;
    setCanvasResizeDrag({
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: currentCanvasBounds.width,
      startHeight: currentCanvasBounds.height,
      startDisplayWidth: canvasDisplayWidth,
      startDisplayHeight: canvasDisplayHeight,
      startDisplayOffsetX: canvasDisplayOffsetX,
      startDisplayOffsetY: canvasDisplayOffsetY,
      startScrollLeft: canvasFrameRef.current?.scrollLeft ?? 0,
      startScrollTop: canvasFrameRef.current?.scrollTop ?? 0,
      startScrollSurfaceWidth: canvasScrollSurfaceWidth,
      startScrollSurfaceHeight: canvasScrollSurfaceHeight,
      startHorizontalScrollbarsActive: canvasHorizontalScrollbarsActive,
      startVerticalScrollbarsActive: canvasVerticalScrollbarsActive,
      unitsPerCssX: svgRect.width > 0 ? currentCanvasBounds.width / svgRect.width : 1,
      unitsPerCssY: svgRect.height > 0 ? currentCanvasBounds.height / svgRect.height : 1,
      minBounds: minimumCanvasBoundsForResizeEdge(edge)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createStartCanvasResizeFromBottomOverlay(ctx: AppRuntimeContext) {
  return (event: PointerEvent<Element>) => {
    const { canvasBounds, startCanvasResize, svgRef } = ctx;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssY = canvasBounds.height / svgRect.height;
    const handleHalfHeightCss = unitsPerCssY > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssY
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const bottomEdgeHotspot = Math.max(10, handleHalfHeightCss + 3);
    const insideBottomEdge =
      Math.abs(event.clientY - svgRect.bottom) <= bottomEdgeHotspot &&
      event.clientX >= svgRect.left &&
      event.clientX <= svgRect.right;
    if (!insideBottomEdge) {
      return false;
    }
    startCanvasResize(event, "bottom");
    return true;
  
  };
}

export function createRenderSidePanelEdgeTrigger(ctx: AppRuntimeContext) {
  return (side: SidePanelSide) => {
    const { leftPanelMode, leftPanelVisible, rightPanelMode, rightPanelVisible, setSidePanelMode, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, updateAutoPanelVisibility } = ctx;
    const mode = side === "left" ? leftPanelMode : rightPanelMode;
    const visible = side === "left" ? leftPanelVisible : rightPanelVisible;
    if (visible) {
      return null;
    }
    const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
    const label = side === "left" ? "显示左侧栏" : "显示右侧栏";
    return (
      <div
        className={`side-panel-edge-trigger ${side} mode-${mode}`}
        onPointerEnter={() => updateAutoPanelVisibility(side, "edge-enter")}
      >
        <button
          type="button"
          title={mode === "hidden" ? `${label}并切换为永久显示` : label}
          aria-label={label}
          onPointerEnter={() => updateAutoPanelVisibility(side, "edge-enter")}
          onPointerDown={(event) => {
            if (side === "left" && startCanvasResizeFromLeftOverlay(event)) {
              return;
            }
            if (side === "right" && startCanvasResizeFromRightOverlay(event)) {
              return;
            }
          }}
          onClick={() => {
            if (mode === "hidden") {
              setSidePanelMode(side, "pinned");
            } else {
              updateAutoPanelVisibility(side, "edge-enter");
            }
          }}
        >
          <Icon size={17} />
        </button>
      </div>
    );
  
  };
}

export function createCurrentStoredRoutePointsForEdge(ctx: AppRuntimeContext) {
  return (edge: Edge | undefined, bounds: CanvasBounds = canvasBounds) => {
    const { edgeSnapshotFallbackPoints, nodeById, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routedEdgeById } = ctx;
    if (!edge) {
      return [];
    }
    const cachedRoute =
      !pendingStoredRouteEdgeIdsRef.current.has(edge.id) && !pendingRouteEdgeIdsRef.current.has(edge.id)
        ? routedEdgeById.get(edge.id)
        : undefined;
    if (cachedRoute?.points.length) {
      return cachedRoute.points.map((point) => ({ ...point }));
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && target) {
      const route = routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], bounds)[0];
      if (route?.points.length) {
        return route.points.map((point) => ({ ...point }));
      }
    }
    return (routedEdgeById.get(edge.id)?.points ?? edgeSnapshotFallbackPoints(edge)).map((point) => ({ ...point }));
  
  };
}

export function createBuildGroupTransformEdgeUpdates(ctx: AppRuntimeContext) {
  return (drag: GroupTransformDrag, point: Point, store: GraphStore, options?: { snapRotation?: boolean }) => {
    const geometry = groupTransformGeometry(drag, point, options);
    const transformedNodeIdSet = new Set(drag.nodeIds);
    return drag.originalEdgeRoutes.flatMap((route) => {
      const edge = store.edgeMap.get(route.edgeId);
      if (!edge || !transformedNodeIdSet.has(edge.sourceId) || !transformedNodeIdSet.has(edge.targetId)) {
        return [];
      }
      const points = route.points.map((routePoint) => transformGroupPoint(drag, geometry, routePoint));
      if (points.length < 2) {
        return [];
      }
      return [{
        ...edge,
        sourcePoint: { ...points[0] },
        targetPoint: { ...points[points.length - 1] },
        manualPoints: points.slice(1, -1).map((routePoint) => ({ ...routePoint }))
      }];
    });
  
  };
}

export function createStartSingleTransformDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGElement>, node: ModelNode, kind: "rotate" | ScaleHandleKind, handle?: ScaleHandleConfig) => {
    const { clampPointToCanvas, nodeForegroundImage, nodeImage, requireEditMode, setTransformDrag, snapshotSingleTransformNode, startModifierSelectionPress, svgRef, transformDragChangedRef } = ctx;
    event.stopPropagation();
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    if (!requireEditMode("拖拽图元")) {
      return;
    }
    transformDragChangedRef.current = false;
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...node.position };
    const uprightStaticSelection = nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node));
    const rotateHandleStart = (
      uprightStaticSelection
        ? nodeUprightRotateHandleControlPoints(node, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
        : nodeRotateHandleControlPoints(node, TRANSFORM_ROTATE_STEM_START, TRANSFORM_ROTATE_STEM_END, TRANSFORM_ROTATE_HANDLE_GAP)
    ).handle;
    setTransformDrag({
      kind,
      nodeId: node.id,
      originalNode: snapshotSingleTransformNode(node),
      startPoint,
      rotationStartPoint: kind === "rotate"
        ? { x: node.position.x + rotateHandleStart.x, y: node.position.y + rotateHandleStart.y }
        : undefined,
      handleXDirection: handle?.xDirection,
      handleYDirection: handle?.yDirection,
      uprightStaticSelection: nodeUsesUprightStaticSelectionOutline(node, nodeImage(node), nodeForegroundImage(node))
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createRotateLayoutUnitNodeUpdates(ctx: AppRuntimeContext) {
  return (units: CanvasLayoutUnit[], degrees: number, store: GraphStore = graphStore) => {
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = store.nodeMap.get(nodeId);
        if (!node) {
          continue;
        }
        updates.set(nodeId, {
          ...node,
          position: unit.kind === "group" ? rotatePointAround(node.position, center, degrees) : node.position,
          rotation: normalizeRotationDegrees(node.rotation + degrees)
        });
      }
    }
    return Array.from(updates.values());
  
  };
}

export function createFindRewireTargetAtPoint(ctx: AppRuntimeContext) {
  return (point: Point, state: Exclude<RewiringState, null>) => {
    const { activeLayerEdgeIdSet, busAnchorFromPoint, edgeById, isPointNearBus, visibleNodeById, visibleNodeSpatialIndex } = ctx;
    const edge = edgeById.get(state.edgeId);
    if (!edge) {
      return null;
    }
    if (!activeLayerEdgeIdSet.has(edge.id)) {
      return null;
    }
    const otherNode = visibleNodeById.get(state.endpoint === "source" ? edge.targetId : edge.sourceId);
    const otherTerminalId = state.endpoint === "source" ? edge.targetTerminalId : edge.sourceTerminalId;
    if (!otherNode || !otherTerminalId) {
      return null;
    }
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (node.id === otherNode.id) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE && canConnectTerminals(node, terminal.id, otherNode, otherTerminalId)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  
  };
}

export function createCommitRoutableLineDevice(ctx: AppRuntimeContext) {
  return (template: DeviceTemplate, source: ConnectTarget, target: ConnectTarget) => {
    const { activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, connectTargetPoint, deviceIndexCounters, edges, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, nodes, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, resetRoutableLinePreviewState, setCanvasSelectionScope, setDeviceIndexCounters, setGraphArrays, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, writeOperationLog } = ctx;
    const sourcePoint = connectTargetPoint(source);
    const targetPoint = connectTargetPoint(target);
    const rawLine = createRoutableLineDeviceFromEndpoints(
      template,
      sourcePoint,
      targetPoint,
      activeLayerId,
      {
        source: routableLineDeviceEndpointRefForNode(source.node, source.terminalId, source.point),
        target: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point)
      }
    );
    const routedLine = routeRoutableLineDevice(rawLine, [...nodes, rawLine], canvasBounds);
    if (rejectAutoCanvasExpansionForContent([...nodes, routedLine], edges)) {
      return false;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, routedLine], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const shiftedLine = translateNodeBy(routedLine, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, shiftedLine],
      dropSourceEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges);
    }
    const indexed = assignPermanentDeviceIndex(shiftedLine, deviceIndexCounters);
    pushUndoSnapshot();
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([indexed.node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    activateInspectorFromCanvas();
    writeOperationLog(`新增线路：${indexed.node.name}`);
    return true;
  
  };
}

export function createFinishRoutableLineEndpointDrag(ctx: AppRuntimeContext) {
  return () => {
    const { canvasBounds, connectTargetPoint, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, routableLineEndpointDrag, setCanvasSelectionScope, setRoutableLineEndpointDrag, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
    if (!routableLineEndpointDrag) {
      return;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    const target = routableLineEndpointDrag.dropTarget;
    if (lineNode && target) {
      const points = routableLineDeviceCanvasPoints(lineNode);
      const currentStart = points[0];
      const currentEnd = points[points.length - 1];
      if (currentStart && currentEnd) {
        const targetPoint = connectTargetPoint(target);
        const nextStart = routableLineEndpointDrag.endpoint === "source" ? targetPoint : currentStart;
        const nextEnd = routableLineEndpointDrag.endpoint === "target" ? targetPoint : currentEnd;
        const refs = routableLineDeviceEndpointRefs(lineNode);
        const nextRefs =
          routableLineEndpointDrag.endpoint === "source"
            ? {
                source: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point),
                target: refs.target
              }
            : {
                source: refs.source,
                target: routableLineDeviceEndpointRefForNode(target.node, target.terminalId, target.point)
              };
        const rawLine = setRoutableLineDeviceEndpoints(lineNode, nextStart, nextEnd, nextRefs);
        const nextNodesForRouting = nodes.map((node) => (node.id === rawLine.id ? rawLine : node));
        const routedLine = routeRoutableLineDevice(rawLine, nextNodesForRouting, canvasBounds);
        pushUndoSnapshot();
        patchGraphNodes([routedLine]);
        setCanvasSelectionScope("group");
        setSelectedNodeIds([routedLine.id]);
        setSelectedEdgeId("");
        setSelectedEdgeIds([]);
        writeOperationLog(`调整线路端点：${routedLine.name}`);
      }
    } else if (lineNode) {
      window.alert("线路端点必须连接到同类型设备端子或母线，已保持原连接。");
      writeOperationLog("线路端点调整失败");
    }
    setRoutableLineEndpointDrag(null);
  
  };
}

export function createHandleDrop(ctx: AppRuntimeContext) {
  return (event: DragEvent<SVGSVGElement>) => {
    const { customGraphTemplates, dropGraphTemplate, libraryTemplates, placeLibraryDeviceAtPoint, requireEditMode, svgRef } = ctx;
    event.preventDefault();
    if (!requireEditMode("拖入图元")) {
      return;
    }
    const graphTemplateId = event.dataTransfer.getData("application/graph-template-id");
    if (graphTemplateId && svgRef.current) {
      const template = customGraphTemplates.find((item) => item.id === graphTemplateId);
      if (!template) {
        return;
      }
      const pointerPosition = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      dropGraphTemplate(template, pointerPosition);
      return;
    }
    const kind = event.dataTransfer.getData("application/device-kind") as DeviceKind;
    if (!kind || !svgRef.current) {
      return;
    }
    const pointerPosition = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const position = { x: pointerPosition.x, y: pointerPosition.y };
    const template = libraryTemplates.find((item) => item.kind === kind);
    if (!template) {
      return;
    }
    placeLibraryDeviceAtPoint(template, position);
  
  };
}

export function createHandlePointerMove(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGSVGElement>) => {
    const { buildGroupTransformNodeUpdates, canvasBounds, canvasFrameRef, canvasFrameUserScrollRef, clampCanvasNoScrollOffsetPoint, clampPointToCanvas, clampViewBoxToCanvas, connectSource, draggingRef, graphStore, lastCanvasPointerRef, lastRawCanvasPointerRef, latestGraphStoreRef, libraryPlacement, manualPathDrag, marquee, modifierSelectionPressRef, nodeById, nodeLabelDrag, nodeLabelRotateDrag, panning, panningRef, patchGraphNodes, patchSingleTerminalAnchorFromPoint, proportionalSignedScaleFromHandleDelta, proportionalSignedScaleFromUprightHandleDelta, pushUndoSnapshot, resolveConnectPreviewPoint, rewiring, routableLineEndpointDrag, routableLinePlacement, sameOptionalPoint, sameOptionalPointList, scheduleCanvasVisibleViewBoxUpdate, scheduleConnectPreviewPoint, scheduleNodeDragMove, scheduleRewirePreviewPoint, scheduleRoutableLinePreviewPoint, setCanvasNoScrollOffset, setManualPathDrag, setMarquee, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setTerminalPress, setTransformDrag, setViewBox, signedScaleFromRotatedHandleDelta, signedScaleFromUprightHandleDelta, singleTransformBaseNode, staticButtonPointerRef, staticDrawing, svgRef, terminalPress, transformDrag, transformDragChangedRef, updateGraphNodeById, updateInteractiveStaticDrawingPreview, updateLibraryPlacementPreview, updateMouseStatus, updateRoutableLineEndpointDrag } = ctx;
    const staticButtonPointer = staticButtonPointerRef.current;
    if (
      staticButtonPointer &&
      !staticButtonPointer.moved &&
      Math.hypot(event.clientX - staticButtonPointer.clientX, event.clientY - staticButtonPointer.clientY) > 4
    ) {
      staticButtonPointerRef.current = { ...staticButtonPointer, moved: true };
    }
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const pointer = draggingRef.current ? rawPointer : clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
      if (libraryPlacement) {
        updateLibraryPlacementPreview(pointer);
      }
      if (routableLinePlacement) {
        scheduleRoutableLinePreviewPoint(pointer);
      }
      if (routableLineEndpointDrag) {
        updateRoutableLineEndpointDrag(pointer);
      }
      if (connectSource) {
        const previewPoint = resolveConnectPreviewPoint(pointer, event);
        scheduleConnectPreviewPoint(previewPoint);
      }
      if (staticDrawing && !connectSource) {
        updateInteractiveStaticDrawingPreview(pointer);
      }
    }
    const modifierPress = modifierSelectionPressRef.current;
    if (modifierPress && svgRef.current && modifierPress.pointerId === event.pointerId) {
      const currentPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const moved =
        modifierPress.moved ||
        Math.hypot(event.clientX - modifierPress.startClientX, event.clientY - modifierPress.startClientY) > CANVAS_SELECTION_DRAG_THRESHOLD;
      const nextPress = sameOptionalPoint(modifierPress.currentPoint, currentPoint) && modifierPress.moved === moved
        ? modifierPress
        : { ...modifierPress, currentPoint, moved };
      if (nextPress !== modifierPress) {
        setModifierSelectionPress(nextPress);
      }
      if (moved) {
        setMarquee({ start: modifierPress.startPoint, current: currentPoint });
      } else {
        setMarquee(null);
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (nodeLabelRotateDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const nextRotation = String(nodeLabelRotationFromPoint(nodeLabelRotateDrag.center, point));
      const currentNode = nodeById.get(nodeLabelRotateDrag.nodeId);
      if (!currentNode || normalizeNodeLabelRotation(currentNode.params._labelRotation) === Number(nextRotation)) {
        return;
      }
      if (!nodeLabelRotateDrag.historyCaptured) {
        pushUndoSnapshot();
      }
      updateGraphNodeById(nodeLabelRotateDrag.nodeId, (node) => ({
        ...node,
        params: { ...node.params, _labelRotation: nextRotation }
      }));
      setNodeLabelRotateDrag((current) =>
        current && current.nodeId === nodeLabelRotateDrag.nodeId
          ? { ...current, historyCaptured: true }
          : current
      );
      return;
    }
    if (nodeLabelDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      const nextOffset = {
        x: Math.round((nodeLabelDrag.startOffset.x + (point.x - nodeLabelDrag.startPoint.x) / nodeLabelDrag.scaleX) * 10) / 10,
        y: Math.round((nodeLabelDrag.startOffset.y + (point.y - nodeLabelDrag.startPoint.y) / nodeLabelDrag.scaleY) * 10) / 10
      };
      if (sameOptionalPoint(nextOffset, nodeLabelDrag.startOffset) && !nodeLabelDrag.historyCaptured) {
        return;
      }
      if (!nodeLabelDrag.historyCaptured) {
        pushUndoSnapshot();
      }
      updateGraphNodeById(nodeLabelDrag.nodeId, (node) => {
        const currentX = node.params._labelX ?? "";
        const currentY = node.params._labelY ?? "";
        const nextX = String(nextOffset.x);
        const nextY = String(nextOffset.y);
        if (currentX === nextX && currentY === nextY) {
          return node;
        }
        return { ...node, params: { ...node.params, _labelX: nextX, _labelY: nextY } };
      });
      setNodeLabelDrag((current) =>
        current && current.nodeId === nodeLabelDrag.nodeId
          ? { ...current, historyCaptured: current.historyCaptured || nodeLabelDrag.historyCaptured || !sameOptionalPoint(nextOffset, nodeLabelDrag.startOffset) }
          : current
      );
      return;
    }
    if (terminalPress && svgRef.current) {
      const point = lastCanvasPointerRef.current;
      const node = nodeById.get(terminalPress.nodeId);
      if (!node || !point) {
        return;
      }
      const distance = Math.hypot(point.x - terminalPress.startPoint.x, point.y - terminalPress.startPoint.y);
      const nextPress = { ...terminalPress, currentPoint: point, moved: terminalPress.moved || distance > 4 };
      if (!nextPress.moved) {
        setTerminalPress(nextPress);
        return;
      }
      if (isBusNode(node) || node.terminals.length !== 1) {
        setTerminalPress(nextPress);
        return;
      }
      if (!nextPress.historyCaptured) {
        pushUndoSnapshot();
        nextPress.historyCaptured = true;
      }
      setTerminalPress(nextPress);
      patchSingleTerminalAnchorFromPoint(terminalPress.nodeId, terminalPress.terminalId, point, terminalPress.startPoint);
      return;
    }
    if (manualPathDrag && svgRef.current) {
      const point = lastCanvasPointerRef.current;
      if (!point) {
        return;
      }
      const nextDrag = { ...manualPathDrag };
      if (!nextDrag.historyCaptured) {
        pushUndoSnapshot();
        nextDrag.historyCaptured = true;
      }
      const originalRoutePoints = nextDrag.originalRoutePoints;
      if (originalRoutePoints.length < 2) {
        return;
      }
      const nextPoints = originalRoutePoints.map((item) => ({ ...item }));
      if ("pointIndex" in nextDrag) {
        if (nextDrag.pointIndex > 0 && nextDrag.pointIndex < originalRoutePoints.length - 1) {
          const originalPoint = originalRoutePoints[nextDrag.pointIndex];
          nextPoints[nextDrag.pointIndex] = clampPointToCanvas({
            x: originalPoint.x + point.x - nextDrag.startPoint.x,
            y: originalPoint.y + point.y - nextDrag.startPoint.y
          });
        }
      } else {
        nextPoints.splice(
          0,
          nextPoints.length,
          ...moveOrthogonalRouteSegment(originalRoutePoints, nextDrag.segmentIndex, nextDrag.orientation, point, canvasBounds)
        );
      }
      const previewRoutePoints = nextPoints.map((item) => ({ ...item }));
      if (!modelGeometryInsideCanvasBounds([], [{ points: previewRoutePoints }], canvasBounds, MOVE_BOUNDARY_GUARD)) {
        return;
      }
      if (
        nextDrag.historyCaptured === manualPathDrag.historyCaptured &&
        sameOptionalPointList(previewRoutePoints, manualPathDrag.previewRoutePoints)
      ) {
        return;
      }
      setManualPathDrag({ ...nextDrag, previewRoutePoints });
      return;
    }
    if (rewiring && svgRef.current) {
      const previewPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      scheduleRewirePreviewPoint(previewPoint, rewiring);
      return;
    }
    if (marquee && svgRef.current) {
      const currentPoint = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      setMarquee((current) =>
        current && !sameOptionalPoint(current.current, currentPoint)
          ? { ...current, current: currentPoint }
          : current
      );
      return;
    }
    const activePanning = panningRef.current ?? panning;
    if (activePanning && svgRef.current) {
      const frame = canvasFrameRef.current;
      const useHorizontalScrollPanning = Boolean(frame && activePanning.horizontalScrollMode);
      const useVerticalScrollPanning = Boolean(frame && activePanning.verticalScrollMode);
      if (frame) {
        const maxLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
        const maxTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
        let scrollChanged = false;
        if (useHorizontalScrollPanning) {
          const nextLeft = clampNumber(activePanning.scrollLeft - (event.clientX - activePanning.clientX), 0, maxLeft);
          if (Math.abs(frame.scrollLeft - nextLeft) > 0.5) {
            frame.scrollLeft = nextLeft;
            scrollChanged = true;
          }
        }
        if (useVerticalScrollPanning) {
          const nextTop = clampNumber(activePanning.scrollTop - (event.clientY - activePanning.clientY), 0, maxTop);
          if (Math.abs(frame.scrollTop - nextTop) > 0.5) {
            frame.scrollTop = nextTop;
            scrollChanged = true;
          }
        }
        const nextOffset = clampCanvasNoScrollOffsetPoint({
          x: useHorizontalScrollPanning ? activePanning.canvasOffset.x : activePanning.canvasOffset.x + event.clientX - activePanning.clientX,
          y: useVerticalScrollPanning ? activePanning.canvasOffset.y : activePanning.canvasOffset.y + event.clientY - activePanning.clientY
        });
        setCanvasNoScrollOffset((current) =>
          current.x === nextOffset.x && current.y === nextOffset.y ? current : nextOffset
        );
        if (scrollChanged) {
          canvasFrameUserScrollRef.current = true;
        }
        scheduleCanvasVisibleViewBoxUpdate();
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const dx = rect.width > 0 ? ((event.clientX - activePanning.clientX) / rect.width) * canvasBounds.width : 0;
      const dy = rect.height > 0 ? ((event.clientY - activePanning.clientY) / rect.height) * canvasBounds.height : 0;
      const nextViewBox = clampViewBoxToCanvas({ ...activePanning.viewBox, x: activePanning.viewBox.x - dx, y: activePanning.viewBox.y - dy });
      setViewBox((current) =>
        current.x === nextViewBox.x &&
        current.y === nextViewBox.y &&
        current.width === nextViewBox.width &&
        current.height === nextViewBox.height
          ? current
          : nextViewBox
      );
      return;
    }
    if (transformDrag && svgRef.current) {
      const rawPoint = lastRawCanvasPointerRef.current ?? screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const point = transformDrag.kind === "rotate" ? clampPointToCanvas(rawPoint) : rawPoint;
      transformDragChangedRef.current = true;
      if (!transformDrag.historyCaptured) {
        pushUndoSnapshot();
        if (!isGroupTransformDrag(transformDrag)) {
          setTransformDrag({ ...transformDrag, historyCaptured: true });
        }
      }
      const currentStore = latestGraphStoreRef.current ?? graphStore;
      if (isGroupTransformDrag(transformDrag)) {
        const transformForMove = transformDrag.kind === "rotate"
          ? transformDrag
          : { ...transformDrag, proportionalScale: event.shiftKey };
        const nextNodeUpdates = buildGroupTransformNodeUpdates(transformForMove, point, currentStore);
        if (nextNodeUpdates.length === 0) {
          return;
        }
        setTransformDrag((current) =>
          current && isGroupTransformDrag(current) && current.groupId === transformDrag.groupId
            ? current.historyCaptured && current.proportionalScale === transformForMove.proportionalScale && sameOptionalPoint(current.previewPoint, point)
              ? current
              : { ...current, historyCaptured: true, proportionalScale: transformForMove.proportionalScale, previewPoint: point }
            : current
        );
        return;
      }
      const node = currentStore.nodeMap.get(transformDrag.nodeId);
      if (!node) {
        return;
      }
      const baseNode = singleTransformBaseNode(transformDrag, node);
      let nextNode: ModelNode;
      if (transformDrag.kind === "rotate") {
        const rotationDelta = rotationDeltaBetweenTransformPoints(baseNode.position, transformDrag.startPoint, point, false);
        nextNode = {
          ...node,
          position: baseNode.position,
          rotation: normalizeRotationDegrees(baseNode.rotation + rotationDelta),
          scale: baseNode.scale,
          scaleX: baseNode.scaleX,
          scaleY: baseNode.scaleY
        };
        setTransformDrag((current) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && sameOptionalPoint(current.previewPoint, point)
              ? current
              : { ...current, historyCaptured: true, previewPoint: point }
            : current
        );
      } else {
        const currentSignedScaleX = getNodeScaleX(baseNode);
        const currentSignedScaleY = getNodeScaleY(baseNode);
        const localScaleKind = event.shiftKey || transformDrag.kind === "scale-both"
          ? "scale-both"
          : transformDrag.kind;
        const proportionalScale = localScaleKind === "scale-both";
        const signedScaleFromHandleDelta = transformDrag.uprightStaticSelection
          ? signedScaleFromUprightHandleDelta
          : signedScaleFromRotatedHandleDelta;
        setTransformDrag((current) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && current.proportionalScale === proportionalScale
              ? current
              : { ...current, historyCaptured: true, proportionalScale }
            : current
        );
        if (localScaleKind === "scale-x") {
          const nextSignedScaleX = signedScaleFromHandleDelta(transformDrag, point, baseNode, "scale-x");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(nextSignedScaleX), Math.abs(currentSignedScaleY)),
            scaleX: nextSignedScaleX,
            scaleY: currentSignedScaleY
          };
        } else if (localScaleKind === "scale-y") {
          const nextSignedScaleY = signedScaleFromHandleDelta(transformDrag, point, baseNode, "scale-y");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(currentSignedScaleX), Math.abs(nextSignedScaleY)),
            scaleX: currentSignedScaleX,
            scaleY: nextSignedScaleY
          };
        } else {
          const nextSignedScale = transformDrag.uprightStaticSelection
            ? proportionalSignedScaleFromUprightHandleDelta(transformDrag, point, baseNode)
            : proportionalSignedScaleFromHandleDelta(transformDrag, point, baseNode);
          nextNode = { ...node, position: baseNode.position, rotation: baseNode.rotation, scale: nextSignedScale.scale, scaleX: nextSignedScale.scaleX, scaleY: nextSignedScale.scaleY };
        }
      }
      patchGraphNodes([nextNode]);
      return;
    }
    if (!draggingRef.current || !svgRef.current) {
      return;
    }
    const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    scheduleNodeDragMove(point, event.ctrlKey, event.shiftKey);
  
  };
}

export function createSaveCurrentProject(ctx: AppRuntimeContext) {
  return (targetId = activeProjectKey) => {
    const { activeSchemeKey, currentGraphDirtyBaseline, currentProject, deferredMoveOptimizationCancelRef, findSchemeForProject, graphDirtyBaselineRef, persistSchemesPayloadToStorageAndBackend, projectById, projectName, requireEditMode, saveActiveProjectPointer, schemes, selectedSchemeId, setActiveProjectKey, setActiveSchemeKey, setHasUnsavedChanges, setProjectName, setSchemes, suppressNextGraphDirtyRef, writeOperationLog } = ctx;
    if (!requireEditMode("保存模型")) {
      return;
    }
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    if (targetId) {
      const existing = projectById.get(targetId);
      if (existing) {
        const record: SavedProjectRecord = {
          ...existing,
          name: projectName,
          project: currentProject(),
          updatedAt: new Date().toISOString()
        };
        let savedRecord = record;
        const ownerScheme = findSchemeForProject(targetId);
        const nextSchemes = ownerScheme ? upsertSavedProjectInScheme(schemes, ownerScheme.id, record) : schemes;
        savedRecord = findProjectRecordInSchemes(nextSchemes, targetId)?.project ?? record;
        setSchemes(nextSchemes);
        persistSchemesPayloadToStorageAndBackend(serializeSchemesForStorage(nextSchemes));
        setActiveProjectKey(targetId);
        if (savedRecord.name !== projectName) {
          suppressNextGraphDirtyRef.current = true;
          setProjectName(savedRecord.name);
        }
        graphDirtyBaselineRef.current = currentGraphDirtyBaseline();
        setHasUnsavedChanges(false);
        saveActiveProjectPointer(targetId, activeSchemeKey || findSchemeForProject(targetId)?.id || selectedSchemeId);
        clearRefreshRecoveryProject();
        writeOperationLog(`保存模型：${savedRecord.name}`);
        return;
      }
    }
    const targetSchemeId = activeSchemeKey || selectedSchemeId || schemes[0]?.id || createSavedScheme("默认方案").id;
    const fallbackSchemes = schemes.length > 0 ? schemes : [createSavedScheme("默认方案")];
    const resolvedSchemeId = findSavedSchemeById(fallbackSchemes, targetSchemeId) ? targetSchemeId : fallbackSchemes[0].id;
    const targetScheme = findSavedSchemeById(fallbackSchemes, resolvedSchemeId);
    const recoveredRecord = findProjectRecordByNameInScheme(targetScheme, projectName);
    const projectSnapshot = currentProject();
    const createdRecord = createSavedProject(projectName, projectSnapshot);
    const record: SavedProjectRecord = recoveredRecord
      ? {
          ...recoveredRecord,
          name: projectName,
          project: projectSnapshot,
          updatedAt: new Date().toISOString()
        }
      : createdRecord;
    let savedRecord = record;
    const nextSchemes = upsertSavedProjectInScheme(fallbackSchemes, resolvedSchemeId, record);
    savedRecord =
      findProjectRecordInSchemes(nextSchemes, record.id)?.project ??
      findSavedSchemeById(nextSchemes, resolvedSchemeId)?.projects.find((project) => savedProjectRecordNameKey(project.name) === savedProjectRecordNameKey(record.name)) ??
      record;
    setSchemes(nextSchemes);
    persistSchemesPayloadToStorageAndBackend(serializeSchemesForStorage(nextSchemes));
    setActiveProjectKey(savedRecord.id);
    setActiveSchemeKey(resolvedSchemeId);
    graphDirtyBaselineRef.current = currentGraphDirtyBaseline();
    setHasUnsavedChanges(false);
    saveActiveProjectPointer(savedRecord.id, resolvedSchemeId);
    clearRefreshRecoveryProject();
    writeOperationLog(`保存模型：${savedRecord.name}`);
  
  };
}

export function createFitViewToBounds(ctx: AppRuntimeContext) {
  return (bounds: GeometryBounds | SelectionRect | null, padding = 96) => {
    const { canvasBounds, clampViewBoxToCanvas, resetViewport, setViewBox, viewBox } = ctx;
    if (!bounds) {
      resetViewport();
      return;
    }
    const targetWidth = Math.max(80, bounds.right - bounds.left + padding * 2);
    const targetHeight = Math.max(80, bounds.bottom - bounds.top + padding * 2);
    const currentAspect = viewBox.width > 0 && viewBox.height > 0
      ? viewBox.width / viewBox.height
      : canvasBounds.width / Math.max(1, canvasBounds.height);
    const fitSize = targetWidth / targetHeight > currentAspect
      ? { width: targetWidth, height: targetWidth / currentAspect }
      : { width: targetHeight * currentAspect, height: targetHeight };
    const size = clampViewBoxDimensionsForZoom(fitSize, canvasBounds);
    const center = {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    };
    setViewBox(clampViewBoxToCanvas({
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
      width: size.width,
      height: size.height
    }));
  
  };
}

export function createStartManualSegmentDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGPathElement>, edgeId: string, segmentIndex: number, orientation: "horizontal" | "vertical", routePoints: Point[]) => {
    const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, insertManualBendAtPoint, isBrowseMode, routeManualPoints, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = ctx;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  
  };
}

export function createInsertManualBendFromEdgePath(ctx: AppRuntimeContext) {
  return (event: MouseEvent<SVGElement>, edgeId: string, routePoints: Point[]) => {
    const { activateInspectorFromCanvas, activeLayerEdgeIdSet, clampPointToCanvas, edgePointerBendInsertRef, insertManualBendFromPointer, requireEditMode, selectCanvasGraphics, staticDrawing, svgRef } = ctx;
    event.preventDefault();
    event.stopPropagation();
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (staticDrawing) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const pointerInsertedBend = edgePointerBendInsertRef.current;
    if (
      pointerInsertedBend &&
      pointerInsertedBend.edgeId === edgeId &&
      Date.now() - pointerInsertedBend.at < 800 &&
      Math.hypot(event.clientX - pointerInsertedBend.clientX, event.clientY - pointerInsertedBend.clientY) <= 8
    ) {
      edgePointerBendInsertRef.current = null;
      return;
    }
    if (!svgRef.current) {
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    insertManualBendFromPointer(edgeId, routePoints, clickPoint);
  
  };
}

export function createHandleTerminalPointerDown(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode, terminalId: string) => {
    const { activeLayerNodeIdSet, appendStaticDrawingPoint, busAnchorFromEvent, busAnchorFromPoint, canvasBounds, clampPointToCanvas, commitNewConnectionEdge, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, connectPreviewPointRef, connectSource, connectTargetTerminalType, edgeById, finishRoutableLineToTarget, isBrowseMode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, pushUndoSnapshot, resetConnectPreviewState, rewiring, routableLinePlacement, routableLineTemplateTerminalType, routedEdges, routingNodesForConnectionEdge, setCanvasSelectionScope, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, startModifierSelectionPress, startRoutableLineFromTerminal, staticDrawing, svgRef, visibleNodeById, writeOperationLog } = ctx;
    event.stopPropagation();
    if (staticDrawing && event.button === 0 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      setCanvasSelectionScope("direct");
      setSelectedNodeIds([node.id]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      return;
    }
    if (routableLinePlacement && event.button === 0 && svgRef.current) {
      const busPoint = busAnchorFromEvent(node, event);
      const target: ConnectTarget = { node, terminalId, point: busPoint };
      if (routableLinePlacement.source) {
        if (connectTargetTerminalType(target) === routableLineTemplateTerminalType(routableLinePlacement.template)) {
          finishRoutableLineToTarget(target);
        }
      } else {
        startRoutableLineFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    const busPoint = busAnchorFromEvent(node, event);
    if (rewiring) {
      const edge = edgeById.get(rewiring.edgeId);
      const otherNode = edge ? nodeById.get(rewiring.endpoint === "source" ? edge.targetId : edge.sourceId) : undefined;
      const otherTerminalId = rewiring.endpoint === "source" ? edge?.targetTerminalId : edge?.sourceTerminalId;
      if (edge && otherNode && otherTerminalId && canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
        const movingPoint = busPoint ?? getTerminalPoint(node, terminalId);
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const rewiredEdge =
          rewiring.endpoint === "source"
            ? { ...edge, sourceId: node.id, sourceTerminalId: terminalId, sourcePoint: busPoint }
            : { ...edge, targetId: node.id, targetTerminalId: terminalId, targetPoint: busPoint };
        const slidePatch = sourceNode && targetNode
          ? resolveStraightBusSlideEndpointToPoint({
              edge,
              sourceNode,
              targetNode,
              movingEndpoint: rewiring.endpoint,
              movingPoint,
              nodes,
              movingNode: node,
              movingTerminalId: terminalId
            })
          : null;
        const candidateEdge = slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge;
        const endpointRuleMessage = connectionEndpointRuleFailureMessage(candidateEdge);
        const prepared = endpointRuleMessage
          ? null
          : prepareConnectionEdgeForCommit(
          routingNodesForConnectionEdge(candidateEdge, nodes),
          [candidateEdge],
          edge.id,
          canvasBounds,
          routedEdges
        );
        if (prepared?.ok && prepared.edge) {
          const preparedEdge = prepared.edge;
          pushUndoSnapshot();
          markRouteEdgesDirty([edge.id]);
          markStoredRouteEdgesDirty([edge.id]);
          markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
          patchGraphEdges([preparedEdge]);
        } else {
          const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
          window.alert(`联络线端子调整失败：${message}`);
          writeOperationLog(`联络线端子调整失败：${message}`);
        }
      }
      setRewiring(null);
      return;
    }
    if (!connectSource) {
      const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      setTerminalPress({
        nodeId: node.id,
        terminalId,
        pointerId: event.pointerId,
        startPoint: point,
        currentPoint: point,
        moved: false
      });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (sourceNode?.id === node.id && connectSource.terminalId === terminalId) {
      return;
    }
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)) {
      return;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      targetTerminalId: terminalId,
      targetPoint: isBusNode(node) ? busAnchorFromPoint(node, connectPreviewPointRef.current ?? busPoint ?? getTerminalPoint(node, terminalId)) : busPoint
    };
    commitNewConnectionEdge(newEdge, sourceNode.name, node.name);
  
  };
}

export function createExportSchemeRecord(ctx: AppRuntimeContext) {
  return async (scheme: SavedSchemeRecord) => {
    const { colorDisplayMode, colorPalette, safeFilePart, serializeSchemeRecordForFile, writeOperationLog } = ctx;
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    const writeSchemeFiles = async (writer: (filename: string, text: string, mime: string) => Promise<void> | void) => {
      await writer(`${safeFilePart(scheme.name)}.scheme.json`, serializeSchemeRecordForFile(scheme), "application/json");
      for (const project of flattenSavedProjects([scheme])) {
        const prefix = `${safeFilePart(scheme.name)}_${safeFilePart(project.name)}`;
        await writer(`${prefix}.json`, serializeProject(project.project), "application/json");
        await writer(
          `${prefix}.svg`,
          buildSvgDocument(project.project.nodes, project.project.edges, {
            width: project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
            height: project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
            backgroundColor: project.project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
            backgroundImage: resolveProjectImage(project.project),
            colorDisplayMode,
            colorPalette,
            layers: project.project.layers,
            activeLayerId: project.project.activeLayerId
          }),
          "image/svg+xml"
        );
        await writer(`${prefix}.e`, buildEDeviceParameterFile(project.project), "text/plain");
      }
    };
    if (typeof picker !== "function") {
      window.alert("当前浏览器不支持目录选择，已改为逐个下载。");
      await writeSchemeFiles((filename, text, mime) => downloadText(filename, text, mime));
      writeOperationLog(`导出方案：${scheme.name}`);
      return;
    }
    try {
      const directoryHandle = await picker.call(window, {
        id: SCHEME_EXPORT_DIRECTORY_PICKER_ID,
        mode: "readwrite"
      });
      await writeSchemeFiles((filename, text, mime) => writeTextFileToDirectory(directoryHandle, filename, text, mime));
      writeOperationLog(`导出方案：${scheme.name}`);
      window.alert(`已导出方案“${scheme.name}”，共 ${flattenSavedProjects([scheme]).length} 个模型。`);
    } catch (error) {
      if (isPickerAbort(error)) {
        return;
      }
      window.alert(error instanceof Error ? `导出方案失败：${error.message}` : "导出方案失败。");
    }
  
  };
}

export function createCreateImageFolder(ctx: AppRuntimeContext) {
  return async () => {
    const { refreshImageFolders, requireEditMode, setActiveImageFolderId } = ctx;
    if (!requireEditMode("新建图片文件夹")) {
      return;
    }
    const inputName = window.prompt("请输入图片文件夹名称", "新建文件夹");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("图片文件夹名称不能为空。");
      return;
    }
    try {
      const folder = await createBackendImageFolder(name);
      await refreshImageFolders();
      setActiveImageFolderId(folder.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "新建图片文件夹失败。");
    }
  
  };
}

export function createDeleteImageFolder(ctx: AppRuntimeContext) {
  return async () => {
    const { activeImageFolderId, imageFolders, refreshImageFolders, requireEditMode, setActiveImageFolderId } = ctx;
    if (!requireEditMode("删除图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      window.alert("默认文件夹不能删除。");
      return;
    }
    if (!window.confirm(`删除图片文件夹“${folder.name}”？文件夹内图片将移回默认文件夹。`)) {
      return;
    }
    try {
      await deleteBackendImageFolder(folder.id);
      setActiveImageFolderId("root");
      await refreshImageFolders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除图片文件夹失败。");
    }
  
  };
}

export function createSelectCustomComponentTemplate(ctx: AppRuntimeContext) {
  return (template: DeviceTemplate, sectionName = resolveTemplateComponentType(template)) => {
    const { ensureCustomComponentTreeExpanded, setCustomComponentTreeSelection, setCustomDeviceDraft, setEditingCustomDeviceKind } = ctx;
    const attributeLibraryName = normalizeAttributeLibraryName(template.attributeLibrary);
    const section = normalizeComponentTypeName(sectionName);
    const terminalTypes = (template.terminalTypes ?? Array.from({ length: template.terminalCount }, () => template.terminalType)).slice(0, 4) as TerminalType[];
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      template.terminalAssociations ?? [],
      Math.max(0, Math.min(4, template.terminalCount))
    );
    const defaultDefinitions = new Set(customDefaultDefinitions(terminalTypes, {
      isContainer: template.isContainer,
      terminalAssociations
    }).map((definition) => definition.enName.toLowerCase()));
    const customParams = (template.parameterDefinitions ?? parseCustomDefinitions(template.params))
      .filter((definition) => !defaultDefinitions.has(definition.enName.toLowerCase()) && definition.enName !== "component_type" && definition.enName !== "is_container")
      .map((definition) => ({ ...definition, id: customParamId() }));
    ensureCustomComponentTreeExpanded(attributeLibraryName, section);
    setCustomComponentTreeSelection({ kind: "component", attributeLibraryName, section, templateKind: template.kind });
    setEditingCustomDeviceKind(template.custom ? template.kind : "");
    setCustomDeviceDraft({
      attributeLibraryName,
      componentType: section,
      componentName: template.label,
      backgroundImage: template.params.backgroundImage ?? "",
      terminalCount: Math.max(0, Math.min(4, template.terminalCount)),
      terminalTypes: [...terminalTypes, "ac", "ac", "ac", "ac"].slice(0, 4) as TerminalType[],
      terminalRoles: [...(template.terminalRoles ?? []), "single-load", "single-load", "single-load", "single-load"].slice(0, 4) as ContainerTerminalRole[],
      terminalAssociations: [...terminalAssociations, "ac-load", "ac-load", "ac-load", "ac-load"].slice(0, 4) as ContainerTerminalAssociationValue[],
      isContainer: Boolean(template.isContainer),
      params: customParams,
      error: template.custom ? "" : "当前选中的是系统内置元件，可查看并复制为新自定义元件，不能直接覆盖内置定义。"
    });
  
  };
}

export function createDeleteCustomAttributeLibrary(ctx: AppRuntimeContext) {
  return (targetAttributeLibraryName = customDeviceDraft.attributeLibraryName) => {
    const { customComponentTypes, customDeviceTemplates, defaultComponentTypeForAttributeLibrary, requireEditMode, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setExpandedAttributeLibraries, setExpandedDefinitionGroups, setSelectedDefinitionKind } = ctx;
    if (!requireEditMode("删除属性库")) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(targetAttributeLibraryName);
    if (!attributeLibraryName || attributeLibraryName === "静态图元" || PROTECTED_ATTRIBUTE_LIBRARIES.has(attributeLibraryName)) {
      window.alert("默认属性库无法删除。");
      return;
    }
    const templatesInGroup = customDeviceTemplates.filter((template) => normalizeAttributeLibraryName(template.attributeLibrary) === attributeLibraryName);
    if (templatesInGroup.length > 0) {
      const confirmed = window.confirm(`属性库“${attributeLibraryName}”中共有 ${templatesInGroup.length} 个元件，删除属性库会同时删除这些元件及其自定义元件类型，是否继续？`);
      if (!confirmed) {
        return;
      }
    }
    const deletedKinds = new Set(templatesInGroup.map((template) => template.kind));
    const deletedComponentTypeKeys = new Set(
      [
        ...templatesInGroup.map(resolveTemplateComponentType),
        ...customComponentTypes
          .filter((componentType) => normalizeAttributeLibraryName(componentType.attributeLibraryName) === attributeLibraryName)
          .map((componentType) => componentType.name)
      ]
        .filter((section) => section && !isBuiltInComponentType(section))
        .map((section) => section.toLowerCase())
    );
    setCustomDeviceTemplates((current) => current.filter((template) => normalizeAttributeLibraryName(template.attributeLibrary) !== attributeLibraryName));
    if (deletedComponentTypeKeys.size > 0) {
      setCustomComponentTypes((current) => current.filter((componentType) => !deletedComponentTypeKeys.has(componentType.name.toLowerCase())));
      setDefinitionDraftSection((current) =>
        deletedComponentTypeKeys.has(current.toLowerCase()) ? defaultComponentTypeForAttributeLibrary("交流设备") : current
      );
    }
    setCustomAttributeLibraries((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setExpandedAttributeLibraries((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setExpandedDefinitionGroups((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setCollapsedCustomComponentTreeLibraries((current) => current.filter((group) => normalizeAttributeLibraryName(group) !== attributeLibraryName));
    setCollapsedCustomComponentTreeTypes((current) => current.filter((key) => !key.startsWith(`${attributeLibraryName}::`)));
    setSelectedDefinitionKind((current) => (deletedKinds.has(current) ? "" : current));
    setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName: "交流设备" });
    setEditingCustomDeviceKind("");
    if (deletedKinds.size > 0) {
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of deletedKinds) {
          delete next[kind];
        }
        return next;
      });
    }
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName: "交流设备",
      componentType: defaultComponentTypeForAttributeLibrary("交流设备"),
      error: ""
    }));
  
  };
}

export function createSaveCustomDeviceTemplate(ctx: AppRuntimeContext) {
  return () => {
    const { customDeviceDraft, defaultComponentTypeForAttributeLibrary, editingCustomDeviceKind, ensureCustomComponentTreeExpanded, nextCustomTemplateKind, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceTemplates, setEditingCustomDeviceKind, setExpandedAttributeLibraries } = ctx;
    if (!requireEditMode("保存元件")) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(customDeviceDraft.attributeLibraryName);
    const componentType = normalizeComponentTypeName(customDeviceDraft.componentType);
    const componentLabel = customDeviceDraft.componentName.trim() || componentType;
    if (!componentType) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请选择元件类型。" }));
      return;
    }
    if (!isValidComponentTypeName(componentType)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。" }));
      return;
    }
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    if (customDeviceDraft.isContainer) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        window.alert(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return;
      }
    }
    const customRows: DeviceParameterDefinition[] = customDeviceDraft.params
      .map((row) => ({
        cnName: row.cnName.trim(),
        enName: row.enName.trim(),
        valueType: row.valueType,
        typicalValue: row.typicalValue.trim()
      }))
      .filter((row) => row.cnName || row.enName);
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "属性行的中文名称和英文名称不能为空。" }));
      return;
    }
    const definitions = [...customDefaultDefinitions(terminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      terminalAssociations
    }), ...customRows];
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current) => ({ ...current, error: `属性英文名称重复：${duplicateDefinition.enName}` }));
      return;
    }
    const backgroundImage =
      customDeviceDraft.backgroundImage || generateCustomDeviceImage(componentLabel, terminalTypes.length > 0 ? terminalTypes : ["ac"]);
    const customKind = editingCustomDeviceKind || nextCustomTemplateKind(componentType);
    const template: DeviceTemplate = {
      kind: customKind,
      label: componentLabel,
      attributeLibrary: attributeLibraryName,
      size: { width: 104, height: 64 },
      params: {
        component_type: customDeviceDraft.componentType || defaultComponentTypeForAttributeLibrary(attributeLibraryName),
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage
      },
      terminalType: terminalTypes[0] ?? "ac",
      terminalCount: terminalTypes.length,
      terminalTypes,
      terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
      terminalLabels: terminalTypes.map((type, index) => `${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${index + 1}`),
      isContainer: customDeviceDraft.isContainer,
      custom: true,
      parameterDefinitions: definitions
    };
    setCustomDeviceTemplates((current) => {
      if (editingCustomDeviceKind && current.some((item) => item.kind === editingCustomDeviceKind)) {
        return current.map((item) => item.kind === editingCustomDeviceKind ? template : item);
      }
      return [...current, template];
    });
    setExpandedAttributeLibraries((current) => Array.from(new Set([...current, attributeLibraryName])));
    ensureCustomComponentTreeExpanded(attributeLibraryName, componentType);
    setCustomComponentTreeSelection({ kind: "component", attributeLibraryName, section: componentType, templateKind: customKind });
    setEditingCustomDeviceKind(customKind);
    setCustomDeviceDraft((current) => ({ ...current, error: "" }));
  
  };
}

export function createExecuteStaticButtonAction(ctx: AppRuntimeContext) {
  return (node: ModelNode) => {
    const { executeStaticButtonCommand, isStaticButtonEnabledForNode, layers, requestLoadSavedProject, resolveStaticButtonTargetProject, setActiveLayerId, setLayers, writeOperationLog } = ctx;
    if (!isStaticButtonEnabledForNode(node)) {
      return;
    }
    const actionType = node.params.buttonActionType || "none";
    if (actionType === "project") {
      const target = resolveStaticButtonTargetProject(node);
      if (!target) {
        window.alert("按钮动作未找到目标模型，请在右侧图元参数中重新选择。");
        return;
      }
      writeOperationLog(`按钮切换模型：${target.project.name}`);
      requestLoadSavedProject(target.project, target.scheme.id);
      return;
    }
    if (actionType === "layer") {
      const targetLayers = resolveStaticButtonTargetLayers(node, layers);
      if (targetLayers.length === 0) {
        window.alert("按钮动作未找到目标图层，请在右侧图元参数中重新选择。");
        return;
      }
      const targetLayerIdSet = new Set(targetLayers.map((layer) => layer.id));
      setActiveLayerId(targetLayers[0].id);
      setLayers((current) => current.map((item) => ({ ...item, visible: targetLayerIdSet.has(item.id) })));
      writeOperationLog(`按钮切换图层：${targetLayers.map((layer) => layer.name).join("、")}`);
      return;
    }
    if (actionType === "command") {
      const command = node.params.buttonCommand || "none";
      if (!executeStaticButtonCommand(command)) {
        window.alert("按钮动作未配置有效命令，请在右侧图元参数中重新选择。");
      } else {
        writeOperationLog(`按钮执行命令：${STATIC_BUTTON_COMMAND_LABELS[command] ?? command}`);
      }
    }
  
  };
}
