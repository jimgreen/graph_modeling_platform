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
import * as appExtractedHandlersA from "./appExtractedHandlersA";
import * as appExtractedHandlersB from "./appExtractedHandlersB";
import * as appExtractedHandlersC from "./appExtractedHandlersC";


export { buildSvgDocument, snapSingleTerminalAnchorToNearestSide } from "./GraphModelingAppSupport";


export function App() {
  const appRuntimeCtx: Record<string, any> = {};

  const saveRequiredRef = useRef(false);
  const operationLogRef = useRef("就绪");
  const operationLogStatusRef = useRef<HTMLSpanElement | null>(null);
  const setOperationLogText = (nextLog: string) => {
    operationLogRef.current = nextLog;
    const element = operationLogStatusRef.current;
    if (!element) {
      return;
    }
    element.title = nextLog;
    element.textContent = `日志 ${nextLog}`;
  };
  const writeOperationLog = (message: string) => {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setOperationLogText(`${time} ${message}`);
  };
  const {
    activeProjectKey,
    activeSchemeKey,
    backendProjectLoadRequest,
    clearBackendProjectLoadRequest,
    initialDraft,
    initialProjectSources,
    persistSchemesPayloadToStorageAndBackend,
    saveActiveProjectPointer,
    schemes,
    setActiveProjectKey,
    setActiveSchemeKey,
    setSchemes
  } = useProjectPersistenceController({
    saveRequiredRef,
    onOperationLog: writeOperationLog
  });
  const initialLayeredProject = useMemo(() => normalizeProjectLayers({
    version: 1,
    name: initialDraft?.projectName ?? "电力能源系统图上模型",
    layers: initialDraft?.layers,
    activeLayerId: initialDraft?.activeLayerId,
    groups: initialDraft?.groups,
    measurements: initialDraft?.measurements,
    nodes: initialDraft?.nodes ?? SAMPLE_NODES,
    edges: initialDraft?.edges ?? SAMPLE_EDGES
  }), [initialDraft]);
  const initialIndexedNodes = useMemo(
    () => assignMissingDeviceIndexes(initialLayeredProject.nodes, initialDraft?.deviceIndexCounters),
    [initialDraft?.deviceIndexCounters, initialLayeredProject.nodes]
  );
  const initialDeviceLibrary = useMemo(() => readLocalDeviceLibraryPersistencePayload(), []);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const customDeviceImageInputRef = useRef<HTMLInputElement | null>(null);
  const modelImportInputRef = useRef<HTMLInputElement | null>(null);
  const modelImportTargetSchemeIdRef = useRef<string>("");
  const schemeImportInputRef = useRef<HTMLInputElement | null>(null);
  const schemeImportParentSchemeIdRef = useRef<string>("");
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const canvasInteractionRef = useRef(false);
  const canvasSelectionShortcutActiveRef = useRef(false);
  const lastCanvasPointerRef = useRef<Point | null>(null);
  const lastRawCanvasPointerRef = useRef<Point | null>(null);
  const projectListPointerInsideRef = useRef(false);
  const backendColorConfigLoadedRef = useRef(false);
  const suppressNextBackendColorSyncRef = useRef(false);
  const lastPersistedColorConfigPayloadRef = useRef<string | null>(null);
  const backendDeviceLibraryLoadedRef = useRef(false);
  const suppressNextBackendDeviceLibrarySyncRef = useRef(false);
  const lastPersistedDeviceLibraryPayloadRef = useRef<string | null>(null);
  const imageLibraryInitializedRef = useRef(false);
  const lastMouseStatusRef = useRef<Point | null>(null);
  const pendingMouseStatusRef = useRef<Point | null>(null);
  const mouseStatusFrameRef = useRef<number | null>(null);
  const transformDragChangedRef = useRef(false);
  const connectPreviewPathElementRef = useRef<SVGPathElement | null>(null);
  const connectDropHintElementRef = useRef<SVGGElement | null>(null);
  const connectPreviewDomRef = useRef<{ path: string; targetPoint: Point | null }>({ path: "", targetPoint: null });
  const connectPreviewPointRef = useRef<Point | null>(null);
  const connectDropTargetPointRef = useRef<Point | null>(null);
  const connectDropTargetRef = useRef<ConnectTarget | null>(null);
  const connectDropReadyRef = useRef(false);
  const pendingConnectPreviewRef = useRef<{ point: Point | null; ready: boolean; targetPoint: Point | null; target: ConnectTarget | null } | null>(null);
  const connectPreviewFrameRef = useRef<number | null>(null);
  const routableLinePreviewPointRef = useRef<Point | null>(null);
  const routableLineDropTargetPointRef = useRef<Point | null>(null);
  const routableLineDropTargetRef = useRef<ConnectTarget | null>(null);
  const pendingRoutableLinePreviewRef = useRef<{ point: Point | null } | null>(null);
  const routableLinePreviewFrameRef = useRef<number | null>(null);
  const pendingRewirePreviewRef = useRef<{ point: Point; rewiring: Exclude<RewiringState, null> } | null>(null);
  const rewirePreviewFrameRef = useRef<number | null>(null);
  const draggingRef = useRef<DraggingState | null>(null);
  const modifierSelectionPressRef = useRef<ModifierSelectionPressState>(null);
  const staticButtonPointerRef = useRef<StaticButtonPointerSnapshot | null>(null);
  const staticButtonFeedbackTimeoutRef = useRef<number | null>(null);
  const multiNodeDragOverlayRef = useRef<SVGGElement | null>(null);
  const imperativeMultiNodeDragOverlayRef = useRef<SVGGElement | null>(null);
  const imperativeMultiNodeDragActiveRef = useRef(false);
  const multiNodeDragOverlayDeltaRef = useRef<Point>({ x: 0, y: 0 });
  const imperativeSingleNodeDragNodeOverlayRef = useRef<SVGGElement | null>(null);
  const imperativeSingleNodeDragEdgePreviewRef = useRef<SVGGElement | null>(null);
  const imperativeNodeDragDropHintRef = useRef<SVGGElement | null>(null);
  const imperativeSingleNodeDragActiveRef = useRef(false);
  const imperativeNodeDragEdgePreviewPathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const imperativeNodeDragEdgePreviewKeyRef = useRef("");
  const nodePatchListLookupCacheRef = useRef<WeakMap<ModelNode[], Map<string, ModelNode>>>(new WeakMap());
  const nodeTerminalSnapTargetRef = useRef<NodeTerminalSnapTarget | null>(null);
  const pendingNodeDragMoveRef = useRef<{ point: Point; ctrlKey: boolean; shiftKey: boolean } | null>(null);
  const nodeDragMoveFrameRef = useRef<number | null>(null);
  const pendingKeyboardMoveDeltaRef = useRef<Point | null>(null);
  const keyboardMoveActiveKeyDeltasRef = useRef<Map<string, Point>>(new Map());
  const keyboardMoveLastFrameTimeRef = useRef<number | null>(null);
  const keyboardMoveFrameElapsedMsRef = useRef(0);
  const keyboardMoveFrameRef = useRef<number | null>(null);
  const keyboardMoveCommitCancelRef = useRef<(() => void) | null>(null);
  const dragUndoCapturedRef = useRef(false);
  const canvasResizeUndoCapturedRef = useRef(false);
  const canvasResizeDraftRef = useRef<CanvasBounds | null>(null);
  const cachedRoutedEdgesRef = useRef<RoutedEdge[]>([]);
  const cachedRouteStoreRef = useRef<RouteStore | null>(null);
  const lodCanvasNodeChunkCacheRef = useRef<StableSvgMarkupChunkCache>({ chunks: [] });
  const lodCanvasRouteChunkCacheRef = useRef<StableSvgMarkupChunkCache>({ chunks: [] });
  const connectionStrokeColorCacheRef = useRef<ConnectionStrokeColorCache>({ nodeById: null, token: "", colors: new Map() });
  const cachedRouteInputRef = useRef<{
    routeGeometryRevision: number;
    layerSignature: string;
    nodes: ModelNode[];
    edges: Edge[];
  } | null>(null);
  const pendingRouteEdgeIdsRef = useRef<Set<string>>(new Set());
  const pendingStoredRouteEdgeIdsRef = useRef<Set<string>>(new Set());
  const routeDirtyGenerationRef = useRef(0);
  const canvasVisibleViewBoxFrameRef = useRef<number | null>(null);
  const viewportQueryBoundsCacheRef = useRef<RenderViewportBounds | null>(null);
  const viewportRoutedEdgesResultCacheRef = useRef<ViewportResultCache<RoutedEdge[]>>({ ownerRefs: [], token: "", values: new Map() });
  const viewportNodesResultCacheRef = useRef<ViewportResultCache<ModelNode[]>>({ ownerRefs: [], token: "", values: new Map() });
  const minimapSampleCacheRef = useRef<{
    nodeSource: ModelNode[] | null;
    nodeStep: number;
    nodes: ModelNode[];
    routeSource: RoutedEdge[] | null;
    routeStep: number;
    routes: RoutedEdge[];
  }>({ nodeSource: null, nodeStep: 1, nodes: [], routeSource: null, routeStep: 1, routes: [] });
  const elementTreeCacheRef = useRef<{ signature: string; tree: ElementTreeGroup[] }>({ signature: "", tree: [] });
  const elementTreeSourceRef = useRef<ElementTreeSource | null>(null);
  const selectedLayoutUnitsCacheRef = useRef<CanvasLayoutUnit[]>([]);
  const graphDirtyBaselineRef = useRef<GraphDirtyBaseline | null>(null);
  const suppressNextGraphDirtyRef = useRef(false);
  const refreshRecoveryProjectRef = useRef<RefreshRecoveryProjectState | null>(null);
  const latestNodesRef = useRef<ModelNode[]>([]);
  const latestEdgesRef = useRef<Edge[]>([]);
  const latestGraphStoreRef = useRef<GraphStore | null>(null);
  const deferredMoveOptimizationCancelRef = useRef<(() => void) | null>(null);
  const deferredMoveRepairFrameRef = useRef<number | null>(null);
  const lastBusTerminalSyncEndpointRevisionRef = useRef(-1);
  const pendingBusTerminalSyncNodeIdsRef = useRef<Set<string>>(new Set());
  const initialCanvasFitAppliedRef = useRef(false);
  const skipNextTopologyStaleRef = useRef(false);
  const skipCanvasSizeBlurCommitRef = useRef(false);
  const edgePointerBendInsertRef = useRef<{ edgeId: string; clientX: number; clientY: number; at: number } | null>(null);
  const lastEdgePointerClickRef = useRef<{ edgeId: string; clientX: number; clientY: number; at: number } | null>(null);
  const [graphStore, setGraphStore] = useState<GraphStore>(() => createGraphStore(initialIndexedNodes.nodes, initialLayeredProject.edges));
  const nodes = graphStore.nodes;
  const edges = graphStore.edges;
  latestGraphStoreRef.current = graphStore;
  const setNodes = (value: SetStateAction<ModelNode[]>) => {
    setGraphStore((current) => {
      const nextNodes = typeof value === "function" ? value(current.nodes) : value;
      return graphStoreSetNodes(current, nextNodes);
    });
  };
  const setEdges = (value: SetStateAction<Edge[]>) => {
    setGraphStore((current) => {
      const nextEdges = typeof value === "function" ? value(current.edges) : value;
      return graphStoreSetEdges(current, nextEdges);
    });
  };
  const setGraphArrays = (nextNodes: ModelNode[], nextEdges: Edge[]) => {
    setGraphStore((current) => graphStoreSetGraph(current, nextNodes, nextEdges));
  };
  const patchGraphNodes = (nodeUpdates: Iterable<ModelNode>) => {
    setGraphStore((current) => graphStorePatchNodes(current, nodeUpdates));
  };
  const patchGraphEdges = (edgeUpdates: Iterable<Edge>) => {
    setGraphStore((current) => graphStorePatchEdges(current, edgeUpdates));
  };
  const updateGraphNodeById = (nodeId: string, updater: (node: ModelNode) => ModelNode) => {
    setGraphStore((current) => {
      const node = current.nodeMap.get(nodeId);
      if (!node) {
        return current;
      }
      const nextNode = updater(node);
      return nextNode === node ? current : graphStorePatchNodes(current, [nextNode]);
    });
  };
  const [groups, setGroups] = useState<ModelGroup[]>(() => normalizeModelGroups(initialLayeredProject.groups, initialIndexedNodes.nodes, initialLayeredProject.edges));
  const [layers, setLayers] = useState<ModelLayer[]>(() => initialLayeredProject.layers ?? []);
  const [activeLayerId, setActiveLayerId] = useState(() => initialLayeredProject.activeLayerId ?? DEFAULT_MODEL_LAYER_ID);
  const [deviceIndexCounters, setDeviceIndexCounters] = useState<DeviceIndexCounters>(() => initialIndexedNodes.counters);
  const [projectName, setProjectName] = useState(() => initialDraft?.projectName ?? "电力能源系统图上模型");
  const [canvasWidth, setCanvasWidth] = useState(() => initialDraft?.canvasWidth ?? DEFAULT_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(() => initialDraft?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT);
  const [canvasSizeDraft, setCanvasSizeDraft] = useState(() => ({
    width: String(initialDraft?.canvasWidth ?? DEFAULT_CANVAS_WIDTH),
    height: String(initialDraft?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT)
  }));
  const [allowAutoExpandCanvas, setAllowAutoExpandCanvas] = useState(() => initialDraft?.allowAutoExpandCanvas ?? true);
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() => initialDraft?.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
  const [canvasBackgroundImage, setCanvasBackgroundImage] = useState(() => initialDraft?.canvasBackgroundImage ?? "");
  const [canvasBackgroundImageAssetId, setCanvasBackgroundImageAssetId] = useState(() => initialDraft?.canvasBackgroundImageAssetId ?? "");
  const [backgroundProjectId, setBackgroundProjectId] = useState(() => initialDraft?.backgroundProjectId ?? "");
  const [backgroundLayerIds, setBackgroundLayerIds] = useState<string[]>(() => initialDraft?.backgroundLayerIds ?? []);
  const [powerUnit, setPowerUnit] = useState(() => initialDraft?.powerUnit ?? DEFAULT_POWER_UNIT);
  const [voltageUnit, setVoltageUnit] = useState(() => initialDraft?.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
  const [currentUnit, setCurrentUnit] = useState(() => initialDraft?.currentUnit ?? DEFAULT_CURRENT_UNIT);
  const [powerBaseValue, setPowerBaseValue] = useState(() => initialDraft?.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
  const [platformMeasurementConfig, setPlatformMeasurementConfig] = useState<PlatformMeasurementConfig>(() => normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG));
  const [measurementCatalog, setMeasurementCatalog] = useState<MeasurementCatalogPoint[]>([]);
  const [measurements, setMeasurements] = useState<ProjectMeasurementConfig>(() =>
    normalizeProjectMeasurements(initialDraft?.measurements, initialIndexedNodes.nodes)
  );
  const [measurementDrag, setMeasurementDrag] = useState<{
    groupId: string;
    pointerId: number;
    startCanvasPoint: Point;
    startOffset: Point;
    changed: boolean;
  } | null>(null);
  const measurementRuntimeStoreRef = useRef(createMeasurementRuntimeStore());
  const [mode, setMode] = useState<ToolMode>("select");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() => readStoredInteractionMode());
  const isBrowseMode = interactionMode === "browse";
  const isEditMode = interactionMode === "edit";
  const isReadonlyCanvasMode = isBrowseMode;
  const requireEditMode = (action: string) => {
    if (isEditMode) {
      return true;
    }
    writeOperationLog(`浏览模式下不能${action}，请先切换到编辑模式`);
    return false;
  };

  useEffect(() => {
    writeStoredInteractionMode(interactionMode);
  }, [interactionMode]);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [canvasSelectionScope, setCanvasSelectionScope] = useState<CanvasSelectionScope>("group");
  const [voltageBaseClearDialogOpen, setVoltageBaseClearDialogOpen] = useState(false);
  const [voltageBaseClearScope, setVoltageBaseClearScope] = useState<VoltageBaseClearScope>("selected");
  const [voltageBaseSetDialogOpen, setVoltageBaseSetDialogOpen] = useState(false);
  const [voltageBaseSetScope, setVoltageBaseSetScope] = useState<VoltageBaseSetScope>("selected");
  const [voltageBaseSetValue, setVoltageBaseSetValue] = useState("110");
  const [voltageBaseSetMode, setVoltageBaseSetMode] = useState<VoltageBaseSetMode>("uniform");
  const [voltageBaseTerminalValues, setVoltageBaseTerminalValues] = useState<VoltageBaseTerminalValuesByNodeId>({});
  const [connectionRedrawDialogOpen, setConnectionRedrawDialogOpen] = useState(false);
  const [connectionRedrawScope, setConnectionRedrawScope] = useState<ConnectionRedrawScope>("selected");
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string; point?: Point } | null>(null);
  const [staticDrawing, setStaticDrawing] = useState<StaticDrawingState | null>(null);
  const [libraryPlacement, setLibraryPlacement] = useState<LibraryPlacementState | null>(null);
  const [routableLinePlacement, setRoutableLinePlacement] = useState<RoutableLinePlacementState>(null);
  const [routableLinePreview, setRoutableLinePreview] = useState<{ path: string; targetPoint: Point | null }>({ path: "", targetPoint: null });
  const [routableLineEndpointDrag, setRoutableLineEndpointDrag] = useState<RoutableLineEndpointDragState>(null);
  const [staticButtonVisual, setStaticButtonVisual] = useState<{ nodeId: string; state: StaticButtonVisualState } | null>(null);
  const [connectDropReady, setConnectDropReady] = useState(false);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [smartAlignmentGuides, setSmartAlignmentGuides] = useState<SmartAlignmentGuide[]>([]);
  const smartAlignmentGuidesRef = useRef<SmartAlignmentGuide[]>([]);
  const smartAlignmentGuideSignature = (guides: SmartAlignmentGuide[]) =>
    guides.map((guide) => `${guide.id}:${Math.round(guide.position)}:${Math.round(guide.start)}:${Math.round(guide.end)}`).join("|");
  const updateSmartAlignmentGuides = (guides: SmartAlignmentGuide[]) => {
    if (smartAlignmentGuideSignature(smartAlignmentGuidesRef.current) === smartAlignmentGuideSignature(guides)) {
      return;
    }
    smartAlignmentGuidesRef.current = guides;
    setSmartAlignmentGuides(guides);
  };
  const [rewiring, setRewiring] = useState<RewiringState>(null);
  const [terminalPress, setTerminalPress] = useState<TerminalPressState>(null);
  const [nodeLabelDrag, setNodeLabelDrag] = useState<NodeLabelDragState>(null);
  const [nodeLabelRotateDrag, setNodeLabelRotateDrag] = useState<NodeLabelRotateDragState>(null);
  const [manualPathDrag, setManualPathDrag] = useState<ManualPathDrag>(null);
  const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
  const [canvasResizeDraft, setCanvasResizeDraft] = useState<CanvasBounds | null>(null);
  const [deviceLabelsVisible, setDeviceLabelsVisible] = useState(true);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
  const [canvasVisibleViewBox, setCanvasVisibleViewBox] = useState<CanvasViewBox>(() =>
    initialVisibleCanvasViewBox({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }, null)
  );
  const [canvasFrameViewportSize, setCanvasFrameViewportSize] = useState<CanvasBounds>({ width: 0, height: 0 });
  const [canvasNoScrollOffset, setCanvasNoScrollOffset] = useState<Point>({ x: 0, y: 0 });
  const viewBoxRef = useRef<CanvasViewBox>(viewBox);
  viewBoxRef.current = viewBox;
  const [canvasCenterRequest, setCanvasCenterRequest] = useState(0);
  const [panning, setPanning] = useState<CanvasPanningState>(null);
  const panningRef = useRef<CanvasPanningState>(null);
  const setCanvasPanning = (next: CanvasPanningState) => {
    panningRef.current = next;
    setPanning(next);
  };
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [modifierSelectionPress, setModifierSelectionPressState] = useState<ModifierSelectionPressState>(null);
  const [canvasClipboard, setCanvasClipboard] = useState<CanvasClipboard>(EMPTY_CANVAS_CLIPBOARD);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const canvasGraphicContextMenuHandledRef = useRef(false);
  const canvasGraphicContextMenuHandledTimerRef = useRef<number | null>(null);
  const markGraphicContextMenuHandled = () => {
    canvasGraphicContextMenuHandledRef.current = true;
    if (canvasGraphicContextMenuHandledTimerRef.current !== null) {
      window.clearTimeout(canvasGraphicContextMenuHandledTimerRef.current);
    }
    canvasGraphicContextMenuHandledTimerRef.current = window.setTimeout(() => {
      canvasGraphicContextMenuHandledRef.current = false;
      canvasGraphicContextMenuHandledTimerRef.current = null;
    }, 0);
  };
  const consumeGraphicContextMenuHandled = () => {
    const handled = canvasGraphicContextMenuHandledRef.current;
    canvasGraphicContextMenuHandledRef.current = false;
    if (canvasGraphicContextMenuHandledTimerRef.current !== null) {
      window.clearTimeout(canvasGraphicContextMenuHandledTimerRef.current);
      canvasGraphicContextMenuHandledTimerRef.current = null;
    }
    return handled;
  };
  const openGraphicContextMenu = (menu: NonNullable<ContextMenuState>) => {
    markGraphicContextMenuHandled();
    setContextMenu(menu);
  };
  const [inspectorTab, setInspectorTab] = useState<"model" | "graph" | "device">("graph");
  const [graphInfoView, setGraphInfoView] = useState<"tree" | "selected">("selected");
  const [leftPanelTab, setLeftPanelTab] = useState<"projects" | "library" | "templates">("projects");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [componentLibraryDisplayMode, setComponentLibraryDisplayMode] = useState<ComponentLibraryDisplayMode>("right");
  const [leftPanelMode, setLeftPanelMode] = useState<SidePanelMode>(() => readSidePanelMode(LEFT_PANEL_MODE_STORAGE_KEY));
  const [rightPanelMode, setRightPanelMode] = useState<SidePanelMode>(() => readSidePanelMode(RIGHT_PANEL_MODE_STORAGE_KEY));
  const [leftPanelWidth, setLeftPanelWidth] = useState(() =>
    readStoredPanelDimension(LEFT_PANEL_WIDTH_STORAGE_KEY, LEFT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH)
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    readStoredPanelDimension(RIGHT_PANEL_WIDTH_STORAGE_KEY, RIGHT_PANEL_DEFAULT_WIDTH, SIDE_PANEL_MIN_WIDTH, SIDE_PANEL_MAX_WIDTH)
  );
  const [statusbarHeight, setStatusbarHeight] = useState(() =>
    readStoredPanelDimension(STATUSBAR_HEIGHT_STORAGE_KEY, STATUSBAR_DEFAULT_HEIGHT, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT)
  );
  const [validationPanelHeight, setValidationPanelHeight] = useState(() =>
    readStoredPanelDimension(VALIDATION_PANEL_HEIGHT_STORAGE_KEY, VALIDATION_PANEL_DEFAULT_HEIGHT, VALIDATION_PANEL_MIN_HEIGHT, VALIDATION_PANEL_MAX_HEIGHT)
  );
  const [sidePanelResize, setSidePanelResize] = useState<SidePanelResizeState>(null);
  const [statusbarResize, setStatusbarResize] = useState<StatusbarResizeState>(null);
  const [validationPanelResize, setValidationPanelResize] = useState<ValidationPanelResizeState>(null);
  const [canvasResizeDrag, setCanvasResizeDrag] = useState<CanvasResizeState>(null);
  const [leftPanelAutoVisible, setLeftPanelAutoVisible] = useState(false);
  const [rightPanelAutoVisible, setRightPanelAutoVisible] = useState(false);
  const projectRecordDragActiveRef = useRef(false);
  const schemeRecordDragActiveRef = useRef(false);
  const [containerParamViewId, setContainerParamViewId] = useState("container");
  const [expandedAttributeLibraries, setExpandedAttributeLibraries] = useState<AttributeLibrary[]>([...DEFAULT_ATTRIBUTE_LIBRARIES]);
  const [expandedAttributeLibraryComponentTypes, setExpandedAttributeLibraryComponentTypes] = useState<string[]>([]);
  const [collapsedExpandedModeAttributeLibraries, setCollapsedExpandedModeAttributeLibraries] = useState<AttributeLibrary[]>([]);
  const [collapsedExpandedModeComponentTypes, setCollapsedExpandedModeComponentTypes] = useState<string[]>([]);
  const [hoveredAttributeLibrary, setHoveredAttributeLibrary] = useState<AttributeLibrary | "">("");
  const [hoveredAttributeLibraryComponentType, setHoveredAttributeLibraryComponentType] = useState("");
  const [libraryFlyoutPositions, setLibraryFlyoutPositions] = useState<Record<string, { top: number; left: number }>>({});
  const libraryScrollRef = useRef<HTMLDivElement | null>(null);
  const libraryComponentListRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const libraryComponentTypeHeaderRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const libraryFlyoutPositionsRef = useRef<Record<string, { top: number; left: number }>>({});
  const libraryFlyoutCloseTimerRef = useRef<number | null>(null);
  const [collapsedElementTreeGroups, setCollapsedElementTreeGroups] = useState<string[]>([]);
  const [elementTreeItemLimits, setElementTreeItemLimits] = useState<Record<string, number>>({});
  const [customAttributeLibraries, setCustomAttributeLibraries] = useState<AttributeLibrary[]>(() => initialDeviceLibrary.customAttributeLibraries);
  const [customComponentTypes, setCustomComponentTypes] = useState<CustomComponentTypeDefinition[]>(() => initialDeviceLibrary.customComponentTypes);
  const [customDeviceTemplates, setCustomDeviceTemplates] = useState<DeviceTemplate[]>(() => initialDeviceLibrary.customDeviceTemplates);
  const [customGraphTemplateTypes, setCustomGraphTemplateTypes] = useState<string[]>(() => initialDeviceLibrary.customGraphTemplateTypes);
  const [customGraphTemplates, setCustomGraphTemplates] = useState<GraphTemplate[]>(() => initialDeviceLibrary.customGraphTemplates);
  const [expandedGraphTemplateTypes, setExpandedGraphTemplateTypes] = useState<string[]>([...DEFAULT_GRAPH_TEMPLATE_TYPES]);
  const [hoveredGraphTemplateType, setHoveredGraphTemplateType] = useState("");
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>(null);
  const [templateDraftType, setTemplateDraftType] = useState(DEFAULT_GRAPH_TEMPLATE_TYPES[0]);
  const [templateDraftName, setTemplateDraftName] = useState("");
  const [customDeviceDialogOpen, setCustomDeviceDialogOpen] = useState(false);
  const [customComponentTreeSelection, setCustomComponentTreeSelection] = useState<CustomComponentTreeSelection>({ kind: "attributeLibrary", attributeLibraryName: "交流设备" });
  const [collapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeLibraries] = useState<AttributeLibrary[]>([]);
  const [collapsedCustomComponentTreeTypes, setCollapsedCustomComponentTreeTypes] = useState<string[]>([]);
  const [editingCustomDeviceKind, setEditingCustomDeviceKind] = useState("");
  const [customDeviceDraft, setCustomDeviceDraft] = useState<CustomDeviceDraft>(() => createEmptyCustomDeviceDraft());
  const [deviceDefinitionOverrides, setDeviceDefinitionOverrides] = useState<Record<string, DeviceTemplateDefinitionOverride>>(() => initialDeviceLibrary.deviceDefinitionOverrides);
  const [deviceDefinitionDialogOpen, setDeviceDefinitionDialogOpen] = useState(false);
  const [selectedDefinitionKind, setSelectedDefinitionKind] = useState<DeviceKind | "">("");
  const [expandedDefinitionGroups, setExpandedDefinitionGroups] = useState<AttributeLibrary[]>([...DEFAULT_ATTRIBUTE_LIBRARIES]);
  const [definitionDraftRows, setDefinitionDraftRows] = useState<DeviceDefinitionDraftRow[]>([]);
  const [definitionDraftSection, setDefinitionDraftSection] = useState("");
  const [definitionDraftError, setDefinitionDraftError] = useState("");
  const [layerDialogOpen, setLayerDialogOpen] = useState(false);
  const [layerAssignmentDialogOpen, setLayerAssignmentDialogOpen] = useState(false);
  const [layerAssignmentTargetId, setLayerAssignmentTargetId] = useState("");
  const [reactFlowPreviewOpen, setReactFlowPreviewOpen] = useState(false);
  const [topologyErrors, setTopologyErrors] = useState<TopologyValidationError[]>([]);
  const [topologyWarningPage, setTopologyWarningPage] = useState(0);
  const [topology, setTopology] = useState<Topology>(EMPTY_TOPOLOGY);
  const [topologyStatus, setTopologyStatus] = useState<TopologyRunStatus>(INITIAL_TOPOLOGY_STATUS);
  const [routeRenderingReady, setRouteRenderingReady] = useState(false);
  const [savedRouteCrossingArcsReady, setSavedRouteCrossingArcsReady] = useState(false);
  const [backgroundPageRenderReady, setBackgroundPageRenderReady] = useState(false);
  const [minimapSamplingReady, setMinimapSamplingReady] = useState(false);
  const [staticTerminalOverlapReadyKey, setStaticTerminalOverlapReadyKey] = useState("");
  const [colorDisplayMode, setColorDisplayMode] = useState<ColorDisplayMode>(() => readColorDisplayMode());
  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => readColorPalette());
  const [colorPaletteDraft, setColorPaletteDraft] = useState<ColorPalette>(() => readColorPalette());
  const [colorPaletteDialogOpen, setColorPaletteDialogOpen] = useState(false);
  const [colorPaletteTab, setColorPaletteTab] = useState<ColorDisplayMode>(() => readColorDisplayMode());
  const [voltageColorVisibility, setVoltageColorVisibility] = useState<VoltageColorVisibility>("all");
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<UnsavedChangeAction | null>(null);
  const [pendingModelImportConflict, setPendingModelImportConflict] = useState<PendingModelImportConflict>(null);
  const [pendingSchemeImportConflict, setPendingSchemeImportConflict] = useState<PendingSchemeImportConflict>(null);
  const mousePositionTextRef = useRef<HTMLSpanElement | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => initialProjectSources.recoveredFromRefresh);
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);
  const [projectPanelHeight, setProjectPanelHeight] = useState(PROJECT_PANEL_DEFAULT_HEIGHT);
  const [projectPanelResize, setProjectPanelResize] = useState<{ startY: number; startHeight: number } | null>(null);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  latestNodesRef.current = nodes;
  latestEdgesRef.current = edges;
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [imageFolders, setImageFolders] = useState<ImageFolder[]>([{ id: "root", name: "默认文件夹", imageCount: 0 }]);
  const [activeImageFolderId, setActiveImageFolderId] = useState("root");
  const [imageAssetList, setImageAssetList] = useState<ImageAsset[]>([]);
  const [imageAssets, setImageAssets] = useState<Record<string, string>>(() => imageAssetsToMap(imageAssetList));

  const nodeById = graphStore.nodeMap;
  const edgeById = graphStore.edgeMap;
  const edgesByNodeId = graphStore.edgesByNodeId;
  const busNodeIdSet = graphStore.busNodeIdSet;
  const edgeListForNodeIds = (nodeIds: Iterable<string>, extraEdgeIds: Iterable<string> = []) => {
    const collected = new Map<string, Edge>();
    for (const nodeId of nodeIds) {
      for (const edge of edgesByNodeId.get(nodeId) ?? []) {
        collected.set(edge.id, edge);
      }
    }
    for (const edgeId of extraEdgeIds) {
      const edge = edgeById.get(edgeId);
      if (edge) {
        collected.set(edge.id, edge);
      }
    }
    return Array.from(collected.values());
  };
  const snapshotRouteBounds = (routePointsByEdgeId: Record<string, Point[]>) =>
    Object.fromEntries(
      Object.entries(routePointsByEdgeId).map(([edgeId, points]) => [
        edgeId,
        routeRenderBounds({ points }, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING)
      ])
    ) as Record<string, RenderViewportBounds | null>;
  const buildSingleNodeDragCache = appExtractedHandlersA.createBuildSingleNodeDragCache(appRuntimeCtx);
  const orderedNodeFromList = appExtractedHandlersB.createOrderedNodeFromList(appRuntimeCtx);
  const orderedNodesForIds = (sourceNodes: ModelNode[], nodeIds: Iterable<string>) => {
    const selectedNodes: ModelNode[] = [];
    for (const nodeId of nodeIds) {
      const node = orderedNodeFromList(sourceNodes, nodeId);
      if (node) {
        selectedNodes.push(node);
      }
    }
    return selectedNodes;
  };
  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? layers[0],
    [activeLayerId, layers]
  );
  const allModelLayersVisible = layers.length === 0 || layers.every((layer) => layer.visible !== false);
  const visibleProject = useMemo(() => {
    const normalizedLayers = normalizeModelLayers(layers, nodes);
    const visibleNodesByLayer: ModelNode[] = [];
    for (const layer of normalizedLayers) {
      if (layer.visible) {
        visibleNodesByLayer.push(...(graphStore.nodesByLayerId.get(layer.id) ?? []));
      }
    }
    const visibleProjectNodesMatchGraphStoreOrder =
      visibleNodesByLayer.length === nodes.length &&
      visibleNodesByLayer.every((node, index) => node === nodes[index]);
    if (allModelLayersVisible && visibleProjectNodesMatchGraphStoreOrder) {
      return {
        nodes,
        edges,
        nodeById: graphStore.nodeMap,
        nodeIdSet: graphStore.nodeIdSet,
        edgeIdSet: graphStore.edgeIdSet,
        nodeSpatialIndex: graphStore.nodeSpatialIndex
      };
    }
    const visibleProjectIncludesAllNodes = allModelLayersVisible && visibleNodesByLayer.length === nodes.length;
    const visibleNodeIdSetForLayers = visibleProjectIncludesAllNodes
      ? graphStore.nodeIdSet
      : new Set(visibleNodesByLayer.map((node) => node.id));
    const visibleNodeByIdForLayers = visibleProjectIncludesAllNodes
      ? graphStore.nodeMap
      : new Map(visibleNodesByLayer.map((node) => [node.id, node]));
    let visibleEdgesByLayer = edges;
    let visibleEdgeIdSetForLayers = graphStore.edgeIdSet;
    if (!visibleProjectIncludesAllNodes) {
      const visibleEdgeById = new Map<string, Edge>();
      for (const node of visibleNodesByLayer) {
        for (const edge of graphStore.edgesByNodeId.get(node.id) ?? []) {
          if (visibleNodeIdSetForLayers.has(edge.sourceId) && visibleNodeIdSetForLayers.has(edge.targetId)) {
            visibleEdgeById.set(edge.id, edge);
          }
        }
      }
      visibleEdgesByLayer = Array.from(visibleEdgeById.values()).sort(
        (first, second) =>
          (graphStore.edgeIndexById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
          (graphStore.edgeIndexById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      );
      visibleEdgeIdSetForLayers = new Set(visibleEdgeById.keys());
    }
    return {
      nodes: visibleNodesByLayer,
      edges: visibleEdgesByLayer,
      nodeById: visibleNodeByIdForLayers,
      nodeIdSet: visibleNodeIdSetForLayers,
      edgeIdSet: visibleEdgeIdSetForLayers,
      nodeSpatialIndex: visibleProjectIncludesAllNodes
        ? graphStore.nodeSpatialIndex
        : buildNodeSpatialIndex(visibleNodesByLayer)
    };
  }, [allModelLayersVisible, edges, graphStore.edgeIdSet, graphStore.edgeIndexById, graphStore.edgesByNodeId, graphStore.nodeIdSet, graphStore.nodeMap, graphStore.nodeSpatialIndex, graphStore.nodesByLayerId, layers, nodes]);
  const visibleNodes = visibleProject.nodes;
  const visibleEdges = visibleProject.edges;
  const visibleNodeById = visibleProject.nodeById;
  const visibleNodeIdSet = visibleProject.nodeIdSet;
  const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex;
  const measurementRuntimeSnapshot = useMeasurementRuntimeSnapshot(measurementRuntimeStoreRef.current);
  const visibleMeasurementGroups = useMemo(
    () => measurements.groups.filter((group) => group.visible && visibleNodeById.has(group.nodeId)),
    [measurements.groups, visibleNodeById]
  );
  const visibleEdgeIdSet = visibleProject.edgeIdSet;
  const nodeForRoutingList = (sourceNodes: ModelNode[], nodeId: string) =>
    sourceNodes === visibleNodes
      ? visibleNodeById.get(nodeId) ?? nodeById.get(nodeId)
      : orderedNodeFromList(sourceNodes, nodeId) ?? nodeById.get(nodeId);
  const addRoutingNodesForConnectionEdge = appExtractedHandlersC.createAddRoutingNodesForConnectionEdge(appRuntimeCtx);
  const routingNodesForConnectionEdge = (edge: Edge, sourceNodes: ModelNode[] = visibleNodes) => {
    const scopedNodes = new Map<string, ModelNode>();
    addRoutingNodesForConnectionEdge(edge, sourceNodes, scopedNodes);
    return scopedNodes.size > 0 ? Array.from(scopedNodes.values()) : sourceNodes;
  };
  const routingNodesForConnectionEdges = appExtractedHandlersB.createRoutingNodesForConnectionEdges(appRuntimeCtx);
  const visibleEdgesByTerminalRef = useMemo(() => {
    if (visibleEdges === edges) {
      return graphStore.edgesByTerminalRef;
    }
    const map = new Map<string, Edge[]>();
    const add = (nodeId: string, terminalId: string | undefined, edge: Edge) => {
      if (!terminalId) {
        return;
      }
      const key = `${nodeId}:${terminalId}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(edge);
      } else {
        map.set(key, [edge]);
      }
    };
    for (const edge of visibleEdges) {
      add(edge.sourceId, edge.sourceTerminalId, edge);
      add(edge.targetId, edge.targetTerminalId, edge);
    }
    return map;
  }, [edges, graphStore.edgesByTerminalRef, visibleEdges]);
  const activeLayerNodes = useMemo(() => {
    if (!activeLayer?.visible) {
      return [];
    }
    const layerNodes = graphStore.nodesByLayerId.get(activeLayerId) ?? [];
    return visibleNodes === nodes && layerNodes.length === nodes.length ? visibleNodes : visibleNodes === nodes ? layerNodes : layerNodes.filter((node) => visibleNodeIdSet.has(node.id));
  }, [activeLayer?.visible, activeLayerId, graphStore.nodesByLayerId, nodes, visibleNodeIdSet, visibleNodes]);
  const activeLayerNodeIdSet = useMemo(
    () => (activeLayerNodes === visibleNodes ? visibleNodeIdSet : new Set(activeLayerNodes.map((node) => node.id))),
    [activeLayerNodes, visibleNodeIdSet, visibleNodes]
  );
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
  const activeLayerEdgeIdSet = useMemo(
    () => (activeLayerEdges === visibleEdges ? visibleEdgeIdSet : new Set(activeLayerEdges.map((edge) => edge.id))),
    [activeLayerEdges, visibleEdgeIdSet, visibleEdges]
  );
  const activeLayerGroups = useMemo(
    () => isEditMode ? normalizeModelGroups(groups, activeLayerNodes, activeLayerEdges) : EMPTY_MODEL_GROUPS,
    [activeLayer?.visible, activeLayerId, graphStore.elementTreeRevision, groups, isEditMode, layers]
  );
  const rawActiveSelectedEdgeIds = useMemo(
    () => (selectedEdgeIds.length > 0 ? selectedEdgeIds : selectedEdgeId ? [selectedEdgeId] : [])
      .filter((edgeId) => activeLayerEdgeIdSet.has(edgeId)),
    [activeLayerEdgeIdSet, selectedEdgeId, selectedEdgeIds]
  );
  const rawActiveSelectedNodeIds = useMemo(
    () => selectedNodeIds.filter((nodeId) => activeLayerNodeIdSet.has(nodeId)),
    [activeLayerNodeIdSet, selectedNodeIds]
  );
  const activeCanvasSelection = useMemo(
    () => {
      if (rawActiveSelectedNodeIds.length === 0 && rawActiveSelectedEdgeIds.length === 0) {
        return EMPTY_CANVAS_SELECTION;
      }
      if (!isEditMode) {
        return resolveCanvasSelection([], rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, "direct");
      }
      return resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, canvasSelectionScope);
    },
    [activeLayerGroups, canvasSelectionScope, isEditMode, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds]
  );
  const groupExpandedCanvasSelection = useMemo(
    () => {
      if (!isEditMode || (rawActiveSelectedNodeIds.length === 0 && rawActiveSelectedEdgeIds.length === 0)) {
        return activeCanvasSelection;
      }
      return resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, "group");
    },
    [activeCanvasSelection, activeLayerGroups, isEditMode, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds]
  );
  const activeSelectedNodeIds = activeCanvasSelection.nodeIds;
  const selectedNodeId = activeSelectedNodeIds[0] ?? "";
  const displaySelectedNodeIds = canvasSelectionScope === "direct" ? groupExpandedCanvasSelection.nodeIds : activeSelectedNodeIds;
  const displaySelectedEdgeIds = canvasSelectionScope === "direct" ? groupExpandedCanvasSelection.edgeIds : activeCanvasSelection.edgeIds;
  canvasSelectionShortcutActiveRef.current = activeSelectedNodeIds.length > 0 || activeCanvasSelection.edgeIds.length > 0;
  const selectedNodeIdSet = useMemo(() => new Set(displaySelectedNodeIds), [displaySelectedNodeIds]);
  const displaySelectedNodeKey = useMemo(() => displaySelectedNodeIds.join("|"), [displaySelectedNodeIds]);
  const selectedNode = visibleNodeById.get(selectedNodeId);
  const activeSelectedEdgeIds = activeCanvasSelection.edgeIds;
  const activeSelectedEdgeSet = useMemo(() => new Set(displaySelectedEdgeIds), [displaySelectedEdgeIds]);
  const displaySelectedEdgeKey = useMemo(() => displaySelectedEdgeIds.join("|"), [displaySelectedEdgeIds]);
  const selectedEdge = activeLayerEdgeIdSet.has(selectedEdgeId) ? edgeById.get(selectedEdgeId) : undefined;
  const inspectorSelectedNode = selectedNode;
  const inspectorSelectedEdge = selectedEdge;
  const selectedMeasurementGroup = useMemo(
    () => (selectedNodeId ? measurements.groups.find((group) => group.nodeId === selectedNodeId) : undefined),
    [measurements.groups, selectedNodeId]
  );
  const measurementTypeById = useMemo(
    () => new Map(platformMeasurementConfig.measurementTypes.map((type) => [type.id, type])),
    [platformMeasurementConfig.measurementTypes]
  );
  const inspectorTopologyErrors = useDeferredValue(topologyErrors);
  const connectionStrokeColorCacheToken = useMemo(
    () => `${colorDisplayMode}:${JSON.stringify(colorPalette)}`,
    [colorDisplayMode, colorPalette]
  );
  const cachedConnectionStrokeColor = (edge: Edge) => {
    const cache = connectionStrokeColorCacheRef.current;
    if (cache.nodeById !== nodeById || cache.token !== connectionStrokeColorCacheToken) {
      cache.nodeById = nodeById;
      cache.token = connectionStrokeColorCacheToken;
      cache.colors = new Map();
    }
    const cached = cache.colors.get(edge.id);
    if (cached && cached.edge === edge) {
      return cached.color;
    }
    const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette);
    cache.colors.set(edge.id, { edge, color });
    return color;
  };
  const connectionLineStyle = (edgeId: string) => {
    const edge = edgeById.get(edgeId);
    return edge ? ({ "--connection-color": cachedConnectionStrokeColor(edge) } as CSSProperties) : undefined;
  };
  const buildMultiNodeDragOverlayPreview = appExtractedHandlersC.createBuildMultiNodeDragOverlayPreview(appRuntimeCtx);
  const dragMovedNodeIdSet = (dragState: DraggingState) =>
    dragState.singleNodeDragCache?.movedNodeIds ?? dragState.overlayPreview?.movedNodeIds ?? new Set(dragState.nodeIds);
  const dragDraggedEdgeIdSet = (dragState: DraggingState) =>
    dragState.singleNodeDragCache?.draggedEdgeIds ?? dragState.overlayPreview?.draggedEdgeIds ?? new Set(dragState.edgeIds);
  const dragMovedBusNodeIdSet = (dragState: DraggingState) =>
    dragState.singleNodeDragCache?.movedBusNodeIds ?? dragState.overlayPreview?.movedBusNodeIds ?? new Set(
      dragState.nodeIds.filter((nodeId) => busNodeIdSet.has(nodeId))
    );
  const renderMultiNodeDragOverlay = appExtractedHandlersB.createRenderMultiNodeDragOverlay(appRuntimeCtx);
  const groupTransformPreviewNodeFromSnapshot = (node: ModelNode) => {
    if (!transformDrag || !isGroupTransformDrag(transformDrag)) {
      return node;
    }
    const snapshot = transformDrag.originalNodes[node.id];
    return snapshot
      ? {
          ...node,
          position: { ...snapshot.position },
          rotation: snapshot.rotation,
          scale: snapshot.scale,
          scaleX: snapshot.scaleX,
          scaleY: snapshot.scaleY
        }
      : node;
  };
  const renderGroupTransformPhotoPreview = appExtractedHandlersA.createRenderGroupTransformPhotoPreview(appRuntimeCtx);
  const renderSingleTransformRotateOriginGhost = appExtractedHandlersC.createRenderSingleTransformRotateOriginGhost(appRuntimeCtx);
  const renderTransformRotationTrajectory = appExtractedHandlersC.createRenderTransformRotationTrajectory(appRuntimeCtx);
  const renderBoundaryBusInternalConnector = appExtractedHandlersC.createRenderBoundaryBusInternalConnector(appRuntimeCtx);
  const collectCurrentModelVoltageColorKeys = (sourceNodes: ModelNode[] = nodes) => {
    const keys = new Set<string>();
    for (const node of sourceNodes) {
      node.terminals.forEach((terminal, terminalIndex) => {
        const key = voltageColorKeyForTerminal(node, terminal, terminalIndex);
        if (key) {
          keys.add(key);
        }
      });
    }
    return keys;
  };
  const currentModelVoltageColorKeys = useMemo(
    () => (
      colorPaletteDialogOpen
        ? collectCurrentModelVoltageColorKeys()
        : EMPTY_VOLTAGE_COLOR_KEY_SET
    ),
    [colorPaletteDialogOpen, nodes]
  );
  const nearestVoltageColor = (missingKey: string, voltageColors: Record<string, string>) => {
    const [targetType, ...targetVoltageParts] = missingKey.split(":");
    const targetVoltage = Number(targetVoltageParts.join(":"));
    const candidates = Object.entries(voltageColors)
      .filter(([key, color]) => key.startsWith(`${targetType}:`) && color)
      .map(([key, color]) => ({
        key,
        color,
        voltage: Number(key.slice(targetType.length + 1))
      }))
      .filter((entry) => Number.isFinite(entry.voltage));
    if (Number.isFinite(targetVoltage) && candidates.length > 0) {
      return candidates
        .sort((left, right) => Math.abs(left.voltage - targetVoltage) - Math.abs(right.voltage - targetVoltage) || left.key.localeCompare(right.key))[0]
        .color;
    }
    return DEFAULT_COLOR_PALETTE.voltage[missingKey] ?? DEFAULT_COLOR_PALETTE.voltage[`${targetType}:0`] ?? "#64748b";
  };
  const fillMissingVoltageColorRows = (palette: ColorPalette, sourceKeys = collectCurrentModelVoltageColorKeys()) => {
    const missingKeys = Array.from(sourceKeys).filter((key) => !palette.voltage[key]);
    if (missingKeys.length === 0) {
      return { palette, missingKeys };
    }
    const voltage = { ...palette.voltage };
    for (const key of missingKeys) {
      voltage[key] = nearestVoltageColor(key, voltage);
    }
    return {
      palette: { ...palette, voltage },
      missingKeys
    };
  };
  const toggleColorDisplayMode = (nextMode?: ColorDisplayMode) => {
    setColorDisplayMode((current) => nextMode ?? (current === "energy" ? "voltage" : "energy"));
  };
  const openColorPaletteDialog = () => {
    if (!requireEditMode("设置配色")) {
      return;
    }
    const filled = fillMissingVoltageColorRows(normalizeColorPalette(colorPalette), collectCurrentModelVoltageColorKeys());
    setColorPaletteDraft(filled.palette);
    setColorPaletteTab(colorDisplayMode);
    setColorPaletteDialogOpen(true);
    if (filled.missingKeys.length > 0) {
      setColorPalette(filled.palette);
      window.setTimeout(() => {
        window.alert(`当前模型存在 ${filled.missingKeys.length} 个未配置颜色的电压等级，已按相近电压等级自动赋默认颜色：${filled.missingKeys.join("，")}`);
      }, 0);
    }
  };
  const saveColorPalette = () => {
    if (!requireEditMode("保存配色")) {
      return;
    }
    const normalized = normalizeColorPalette(colorPaletteDraft);
    setColorPalette(normalized);
    setColorDisplayMode(colorPaletteTab);
    setColorPaletteDialogOpen(false);
  };
  const resetEnergyColors = () => {
    setColorPaletteDraft((current) => ({
      ...current,
      energy: { ...DEFAULT_COLOR_PALETTE.energy }
    }));
  };
  const resetVoltageColors = () => {
    setColorPaletteDraft((current) => ({
      ...current,
      voltage: { ...DEFAULT_COLOR_PALETTE.voltage }
    }));
  };
  const updateEnergyColor = (type: TerminalType, color: string) => {
    setColorPaletteDraft((current) => ({
      ...current,
      energy: {
        ...current.energy,
        [type]: color
      }
    }));
  };
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
  const visibleVoltageColorRows = useMemo(
    () => voltageColorVisibility === "current"
      ? voltageColorRows.filter((row) => currentModelVoltageColorKeys.has(row.key))
      : voltageColorRows,
    [currentModelVoltageColorKeys, voltageColorRows, voltageColorVisibility]
  );
  const setVoltageColorRows = (rows: Array<{ type: "ac" | "dc"; voltage: string; color: string }>) => {
    const fallbackNumericEntries = Object.fromEntries(
      Object.entries(colorPaletteDraft.voltage).filter(([key]) => !key.startsWith("ac:") && !key.startsWith("dc:"))
    );
    const typedEntries = rows.reduce<Record<string, string>>((result, row) => {
      const voltage = normalizeVoltageBaseInput(row.voltage) || row.voltage.trim() || "0";
      result[`${row.type}:${voltage}`] = row.color;
      return result;
    }, {});
    setColorPaletteDraft((current) => ({
      ...current,
      voltage: {
        ...fallbackNumericEntries,
        ...typedEntries
      }
    }));
  };
  const updateVoltageColorRow = (rowKey: string, patch: Partial<{ type: "ac" | "dc"; voltage: string; color: string }>) => {
    const rows = voltageColorRows.map((row) => row.key === rowKey ? { ...row, ...patch } : row);
    setVoltageColorRows(rows);
  };
  const deleteVoltageColorRow = (rowKey: string) => {
    setVoltageColorRows(voltageColorRows.filter((row) => row.key !== rowKey));
  };
  const addVoltageColorRow = () => {
    const existingKeys = new Set(voltageColorRows.map((row) => row.key));
    const baseVoltages = ["10", "35", "110", "220", "500", "750", "800"];
    const voltage = baseVoltages.find((item) => !existingKeys.has(`ac:${item}`)) ?? `${voltageColorRows.length + 1}`;
    setVoltageColorRows([...voltageColorRows, { type: "ac", voltage, color: DEFAULT_COLOR_PALETTE.voltage[`ac:${voltage}`] ?? "#2563eb" }]);
  };
  const projects = useMemo(() => flattenSavedProjects(schemes), [schemes]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const {
    clearRecordSelection,
    copyProjectRecord,
    copySchemeRecord,
    copySelectedRecord,
    createSchemeRecord,
    deleteProjectRecord,
    deleteSchemeRecord,
    deleteSelectedRecords,
    duplicateProjectRecord,
    duplicateSchemeRecord,
    duplicateSelectedProjectRecords,
    duplicateSelectedSchemeRecords,
    expandedSchemeIds,
    findSchemeForProject,
    moveProjectRecordToScheme,
    moveSchemeRecordToScheme,
    pasteProjectClipboardRecord,
    pasteSchemeClipboardRecord,
    pasteSelectedRecord,
    pendingRecordPasteConflict,
    recordClipboard,
    renameProjectRecord,
    renameSchemeRecord,
    resolveRecordPasteConflict,
    selectSingleProject,
    selectSingleScheme,
    selectedProjectId,
    selectedProjectIds,
    selectedSchemeId,
    selectedSchemeIds,
    setExpandedSchemeIds,
    setSelectedProjectId,
    setSelectedProjectIds,
    setSelectedSchemeId,
    setSelectedSchemeIds,
    toggleProjectSelection,
    toggleSchemeExpanded,
    toggleSchemeSelection
  } = useProjectRecordActions({
    activeProjectKey,
    activeSchemeKey,
    projects,
    projectById,
    requireEditMode,
    schemes,
    setActiveProjectKey,
    setActiveSchemeKey,
    setProjectName,
    setSchemes,
    writeOperationLog
  });
  const projectSearchNeedle = normalizeLibrarySearchText(projectSearchQuery);
  const filteredProjectSchemes = useMemo<SavedSchemeRecord[]>(() => {
    if (!projectSearchNeedle) {
      return schemes;
    }
    const filterScheme = (scheme: SavedSchemeRecord): SavedSchemeRecord | null => {
      const schemeMatches = normalizeLibrarySearchText(scheme.name).includes(projectSearchNeedle);
      const filteredProjects = schemeMatches
        ? scheme.projects
        : scheme.projects.filter((project) => normalizeLibrarySearchText(project.name).includes(projectSearchNeedle));
      const filteredChildren = schemeMatches
        ? (scheme.children ?? [])
        : (scheme.children ?? []).map(filterScheme).filter((child): child is SavedSchemeRecord => Boolean(child));
      return schemeMatches || filteredProjects.length > 0 || filteredChildren.length > 0
        ? { ...scheme, projects: filteredProjects, children: filteredChildren }
        : null;
    };
    return schemes.map(filterScheme).filter((scheme): scheme is SavedSchemeRecord => Boolean(scheme));
  }, [projectSearchNeedle, schemes]);
  const baseLibraryTemplates = useMemo<DeviceTemplate[]>(() => [...DEVICE_LIBRARY, ...customDeviceTemplates], [customDeviceTemplates]);
  const libraryTemplates = useMemo<DeviceTemplate[]>(
    () => baseLibraryTemplates.map((template) => applyDeviceTemplateDefinitionOverride(template, deviceDefinitionOverrides[template.kind])),
    [baseLibraryTemplates, deviceDefinitionOverrides]
  );
  const libraryTemplateByKind = useMemo(() => new Map(libraryTemplates.map((template) => [template.kind, template])), [libraryTemplates]);
  const baseLibraryTemplateByKind = useMemo(() => new Map(baseLibraryTemplates.map((template) => [template.kind, template])), [baseLibraryTemplates]);
  const groupedAttributeLibrary = useMemo(() => groupDeviceTemplatesByAttributeLibrary(libraryTemplates), [libraryTemplates]);
  const groupedAttributeLibraryByComponentType = useMemo(() => groupDeviceTemplatesByAttributeLibraryAndComponentType(libraryTemplates), [libraryTemplates]);
  const librarySearchNeedle = normalizeLibrarySearchText(librarySearchQuery);
  const filteredAttributeLibraryByComponentType = useMemo(() => {
    if (!librarySearchNeedle) {
      return groupedAttributeLibraryByComponentType;
    }
    const filteredEntries = Object.entries(groupedAttributeLibraryByComponentType)
      .map(([group, typeGroups]) => {
        const groupMatches = normalizeLibrarySearchText(group).includes(librarySearchNeedle);
        const filteredTypeGroups = typeGroups
          .map((typeGroup) => {
            const sectionMatches = normalizeLibrarySearchText(typeGroup.section).includes(librarySearchNeedle);
            const templates = groupMatches || sectionMatches
              ? typeGroup.templates
              : typeGroup.templates.filter((item) => libraryTemplateMatchesSearch(item, group, typeGroup.section, librarySearchNeedle));
            return templates.length ? { ...typeGroup, templates } : null;
          })
          .filter((typeGroup): typeGroup is AttributeLibraryComponentTypeGroup => Boolean(typeGroup));
        return filteredTypeGroups.length ? [group, filteredTypeGroups] as const : null;
      })
      .filter((entry): entry is readonly [string, AttributeLibraryComponentTypeGroup[]] => Boolean(entry));
    return Object.fromEntries(filteredEntries);
  }, [groupedAttributeLibraryByComponentType, librarySearchNeedle]);
  const libraryPreviewByKind = useMemo(
    () => new Map(libraryTemplates.map((template) => [template.kind, createNodeFromTemplate(template, { x: 0, y: 0 })])),
    [libraryTemplates]
  );
  const graphTemplateTypes = useMemo(
    () => graphTemplateTypeList(customGraphTemplateTypes, customGraphTemplates),
    [customGraphTemplateTypes, customGraphTemplates]
  );
  const groupedGraphTemplates = useMemo(
    () => groupGraphTemplatesByType(customGraphTemplates, graphTemplateTypes),
    [customGraphTemplates, graphTemplateTypes]
  );
  const attributeLibraries = useMemo<AttributeLibrary[]>(
    () => Array.from(new Set([...DEFAULT_ATTRIBUTE_LIBRARIES, ...customAttributeLibraries, ...libraryTemplates.map((item) => normalizeAttributeLibraryName(item.attributeLibrary))])),
    [customAttributeLibraries, libraryTemplates]
  );
  const displayedAttributeLibraries = useMemo(
    () => librarySearchNeedle
      ? attributeLibraries.filter((group) => (filteredAttributeLibraryByComponentType[group] ?? []).length > 0)
      : attributeLibraries,
    [attributeLibraries, filteredAttributeLibraryByComponentType, librarySearchNeedle]
  );
  useEffect(() => {
    libraryFlyoutPositionsRef.current = libraryFlyoutPositions;
  }, [libraryFlyoutPositions]);
  const libraryComponentListRefKey = (layout: "inline" | "flyout", componentTypeKey: string) => `${layout}:${componentTypeKey}`;
  const setLibraryComponentListRef = (key: string) => (element: HTMLDivElement | null) => {
    if (element) {
      libraryComponentListRefs.current.set(key, element);
    } else {
      libraryComponentListRefs.current.delete(key);
    }
  };
  const setLibraryComponentTypeHeaderRef = (key: string) => (element: HTMLButtonElement | null) => {
    if (element) {
      libraryComponentTypeHeaderRefs.current.set(key, element);
    } else {
      libraryComponentTypeHeaderRefs.current.delete(key);
    }
  };
  const clearLibraryFlyoutCloseTimer = () => {
    if (libraryFlyoutCloseTimerRef.current !== null) {
      window.clearTimeout(libraryFlyoutCloseTimerRef.current);
      libraryFlyoutCloseTimerRef.current = null;
    }
  };
  const hideLibraryFlyout = () => {
    clearLibraryFlyoutCloseTimer();
    setHoveredAttributeLibrary("");
    setHoveredAttributeLibraryComponentType("");
    if (Object.keys(libraryFlyoutPositionsRef.current).length > 0) {
      setLibraryFlyoutPositions({});
    }
  };
  const scheduleLibraryFlyoutClose = appExtractedHandlersA.createScheduleLibraryFlyoutClose(appRuntimeCtx);
  useEffect(() => () => clearLibraryFlyoutCloseTimer(), []);
  const libraryFlyoutStyle = (key: string) => {
    const position = libraryFlyoutPositions[key];
    return {
      "--library-flyout-top": `${position?.top ?? 0}px`,
      "--library-flyout-left": `${position?.left ?? 0}px`,
      visibility: position ? "visible" : "hidden"
    } as CSSProperties;
  };
  const fitLibraryFlyoutsToVisibleArea = appExtractedHandlersB.createFitLibraryFlyoutsToVisibleArea(appRuntimeCtx);
  useLayoutEffect(() => {
    if (leftPanelTab !== "library") {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (componentLibraryDisplayMode === "right") {
        fitLibraryFlyoutsToVisibleArea();
        return;
      }
      if (Object.keys(libraryFlyoutPositionsRef.current).length > 0) {
        setLibraryFlyoutPositions({});
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    componentLibraryDisplayMode,
    displayedAttributeLibraries,
    expandedAttributeLibraryComponentTypes,
    filteredAttributeLibraryByComponentType,
    hoveredAttributeLibraryComponentType,
    leftPanelTab,
    librarySearchNeedle
  ]);
  useEffect(() => {
    if (leftPanelTab !== "library" || componentLibraryDisplayMode !== "right" || librarySearchNeedle) {
      hideLibraryFlyout();
    }
  }, [componentLibraryDisplayMode, leftPanelTab, librarySearchNeedle]);
  useEffect(() => {
    if (leftPanelTab !== "library" || componentLibraryDisplayMode !== "right" || !hoveredAttributeLibraryComponentType) {
      return;
    }
    const hideLibraryFlyoutOnOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      const targetElement = target instanceof Element ? target : target.parentElement;
      const flyoutElement = document.querySelector(".flyout-library-group");
      const activeTypeSection = targetElement?.closest(".attribute-library-component-type-section.flyout-mode");
      if (flyoutElement?.contains(target) || activeTypeSection) {
        return;
      }
      hideLibraryFlyout();
    };
    window.addEventListener("pointerdown", hideLibraryFlyoutOnOutsidePointerDown, true);
    return () => window.removeEventListener("pointerdown", hideLibraryFlyoutOnOutsidePointerDown, true);
  }, [componentLibraryDisplayMode, hoveredAttributeLibraryComponentType, leftPanelTab]);
  const toggleAttributeLibrary = (group: AttributeLibrary) => {
    if (componentLibraryDisplayMode === "expanded") {
      setCollapsedExpandedModeAttributeLibraries((current) =>
        current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
      );
      return;
    }
    setExpandedAttributeLibraries((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
    );
  };

  const toggleAttributeLibraryComponentType = (attributeLibraryName: string, sectionName: string) => {
    const key = attributeLibraryComponentTypeKey(attributeLibraryName, sectionName);
    if (componentLibraryDisplayMode === "expanded") {
      setCollapsedExpandedModeComponentTypes((current) =>
        current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      );
      return;
    }
    setExpandedAttributeLibraryComponentTypes((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };
  const selectableAttributeLibraries = useMemo<AttributeLibrary[]>(
    () => Array.from(new Set([...CUSTOM_ATTRIBUTE_LIBRARY_BASES, ...customAttributeLibraries, ...attributeLibraries.filter((group) => group !== "静态图元")])),
    [customAttributeLibraries, attributeLibraries]
  );
  const componentTypeOptionsByAttributeLibrary = useMemo<Record<string, string[]>>(() => {
    const groupedOptions = new Map<string, string[]>();
    const addOption = (attributeLibraryName: string, sectionName: string) => {
      const group = normalizeAttributeLibraryName(attributeLibraryName);
      const section = normalizeComponentTypeName(sectionName);
      if (!group || !section) {
        return;
      }
      const current = groupedOptions.get(group) ?? [];
      if (!current.some((item) => item.toLowerCase() === section.toLowerCase())) {
        groupedOptions.set(group, [...current, section]);
      }
    };
    for (const section of E_SECTION_OPTIONS) {
      addOption(defaultAttributeLibraryForComponentType(section), section);
    }
    for (const componentType of customComponentTypes) {
      addOption(componentType.attributeLibraryName, componentType.name);
    }
    for (const template of libraryTemplates) {
      addOption(template.attributeLibrary, resolveTemplateComponentType(template));
    }
    return Object.fromEntries(attributeLibraries.map((group) => [group, groupedOptions.get(group) ?? []]));
  }, [customComponentTypes, attributeLibraries, libraryTemplates]);
  const componentTypeOptions = useMemo(
    () => Array.from(new Set([
      ...E_SECTION_OPTIONS,
      ...customComponentTypes.map((item) => item.name),
      ...libraryTemplates.filter((template) => template.custom).map(resolveTemplateComponentType).filter(Boolean)
    ])),
    [customComponentTypes, libraryTemplates]
  );
  const currentAttributeLibraryComponentTypeOptions = useMemo(() => {
    const group = normalizeAttributeLibraryName(customDeviceDraft.attributeLibraryName);
    const options = componentTypeOptionsByAttributeLibrary[group] ?? [];
    const currentSection = normalizeComponentTypeName(customDeviceDraft.componentType);
    return currentSection && !options.some((item) => item.toLowerCase() === currentSection.toLowerCase()) ? [currentSection, ...options] : options;
  }, [customDeviceDraft.componentType, customDeviceDraft.attributeLibraryName, componentTypeOptionsByAttributeLibrary]);
  const selectedDefinitionTemplate = selectedDefinitionKind ? libraryTemplateByKind.get(selectedDefinitionKind) ?? libraryTemplates[0] : libraryTemplates[0];
  const definitionAttributeLibraryComponentTypeOptions = useMemo(() => {
    const group = normalizeAttributeLibraryName(selectedDefinitionTemplate?.attributeLibrary ?? customDeviceDraft.attributeLibraryName);
    const options = componentTypeOptionsByAttributeLibrary[group] ?? [];
    const currentSection = normalizeComponentTypeName(definitionDraftSection);
    return currentSection && !options.some((item) => item.toLowerCase() === currentSection.toLowerCase()) ? [currentSection, ...options] : options;
  }, [customDeviceDraft.attributeLibraryName, definitionDraftSection, componentTypeOptionsByAttributeLibrary, selectedDefinitionTemplate?.attributeLibrary]);
  const defaultComponentTypeForAttributeLibrary = (attributeLibraryName: string) => (
    componentTypeOptionsByAttributeLibrary[normalizeAttributeLibraryName(attributeLibraryName)]?.[0] ?? fallbackComponentTypeForAttributeLibrary(attributeLibraryName)
  );
  const selectedDefinitionBaseTemplate = selectedDefinitionTemplate ? baseLibraryTemplateByKind.get(selectedDefinitionTemplate.kind) : undefined;
  const selectedDefinitionTerminalAssociations = selectedDefinitionTemplate
    ? describeContainerTerminalAssociations(selectedDefinitionTemplate)
    : [];
  const deviceParamPanelActive = inspectorTab === "device";
  const selectedNodeTemplate = deviceParamPanelActive && inspectorSelectedNode ? libraryTemplateByKind.get(inspectorSelectedNode.kind) : undefined;
  const selectedContainerParameterViews = useMemo(
    () => (deviceParamPanelActive && inspectorSelectedNode ? buildContainerDeviceParameterViews(inspectorSelectedNode, selectedNodeTemplate) : []),
    [deviceParamPanelActive, inspectorSelectedNode, selectedNodeTemplate]
  );

  useEffect(() => {
    if (!layers.some((layer) => layer.id === activeLayerId)) {
      const fallbackId = layers[0]?.id ?? DEFAULT_MODEL_LAYER_ID;
      setActiveLayerId(fallbackId);
      return;
    }
    if (layers.some((layer) => layer.id === activeLayerId && !layer.visible)) {
      setLayers((current) => current.map((layer) => layer.id === activeLayerId ? { ...layer, visible: true } : layer));
    }
  }, [activeLayerId, layers]);

  useEffect(() => {
    setSelectedNodeIds((current) => current.filter((nodeId) => activeLayerNodeIdSet.has(nodeId)));
    setSelectedEdgeIds((current) => current.filter((edgeId) => activeLayerEdgeIdSet.has(edgeId)));
    setSelectedEdgeId((current) => current && activeLayerEdgeIdSet.has(current) ? current : "");
    setConnectSource((current) => current && activeLayerNodeIdSet.has(current.nodeId) ? current : null);
    setRewiring((current) => current && activeLayerEdgeIdSet.has(current.edgeId) ? current : null);
    setTerminalPress((current) => current && activeLayerNodeIdSet.has(current.nodeId) ? current : null);
  }, [activeLayerEdgeIdSet, activeLayerNodeIdSet]);

  const selectedContainerParameterView =
    selectedContainerParameterViews.find((view) => view.id === containerParamViewId) ?? selectedContainerParameterViews[0];
  const selectedProjectRecord = projectById.get(selectedProjectId);
  const activeProjectRecord = projectById.get(activeProjectKey);
  const saveRequired = hasUnsavedChanges;
  const canExportCurrentModel = !saveRequired;
  const activeModelName = projectName || activeProjectRecord?.name || "未命名模型";
  const activeSchemeRecord =
    findSavedSchemeById(schemes, activeSchemeKey) ??
    findProjectRecordInSchemes(schemes, activeProjectKey)?.scheme;
  const activeModelPathName = `${activeSchemeRecord?.name ?? "未选择方案"} / ${activeModelName}`;
  const activeMeasurementSchemePath = useMemo(
    () => activeSchemeKey
      ? savedSchemePathForId(schemes, activeSchemeKey) ?? (activeSchemeRecord ? [activeSchemeRecord.name] : [])
      : [],
    [activeSchemeKey, activeSchemeRecord, schemes]
  );

  useEffect(() => {
    const nodeIds = new Set(nodes.map((node) => node.id));
    setMeasurements((current) => {
      const groups = removeMeasurementGroupsForNodeIds(current.groups, new Set<string>());
      const filtered = groups.filter((group) => nodeIds.has(group.nodeId));
      return filtered.length === current.groups.length ? current : { version: 1, groups: filtered };
    });
  }, [nodes]);

  useEffect(() => {
    let canceled = false;
    fetchMeasurementConfig()
      .then((config) => {
        if (!canceled) {
          setPlatformMeasurementConfig(normalizeMeasurementConfig(config));
        }
      })
      .catch(() => {
        if (!canceled) {
          setPlatformMeasurementConfig(normalizeMeasurementConfig(DEFAULT_MEASUREMENT_CONFIG));
        }
      });
    fetchMeasurementCatalog()
      .then((catalog) => {
        if (!canceled) {
          setMeasurementCatalog(catalog.points);
        }
      })
      .catch(() => {
        if (!canceled) {
          setMeasurementCatalog([]);
        }
      });
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let closed = false;
    const schemePath = activeMeasurementSchemePath.join("/");
    fetchMeasurementSnapshot(schemePath, projectName)
      .then((snapshot) => {
        if (!closed) {
          const startedAt = performance.now();
          measurementRuntimeStoreRef.current.applySnapshot(snapshot);
          if (import.meta.env.DEV && snapshot.values.length > 0) {
            console.debug(`[measurement] snapshot values=${snapshot.values.length} applyMs=${(performance.now() - startedAt).toFixed(2)}`);
          }
        }
      })
      .catch(() => undefined);
    const closeStream = openMeasurementStream({
      schemePath,
      modelName: projectName,
      onPatch: (patch) => {
        const startedAt = performance.now();
        measurementRuntimeStoreRef.current.applyPatch(patch);
        if (import.meta.env.DEV && patch.values.length > 0) {
          console.debug(`[measurement] patch values=${patch.values.length} applyMs=${(performance.now() - startedAt).toFixed(2)}`);
        }
      }
    });
    return () => {
      closed = true;
      closeStream();
    };
  }, [activeMeasurementSchemePath, projectName]);
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
        measurements: normalizeProjectMeasurements(measurements, nodes),
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
    measurements,
    nodes,
    powerBaseValue,
    powerUnit,
    projectName,
    selectedProjectRecord,
    voltageUnit
  ]);
  saveRequiredRef.current = saveRequired;
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
    measurements: normalizeProjectMeasurements(measurements, nodes),
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
    measurements,
    nodes,
    powerBaseValue,
    powerUnit,
    projectName,
    voltageUnit
  ]);
  refreshRecoveryProjectRef.current = refreshRecoveryProjectSnapshot;
  const selectedSchemeRecord = findSavedSchemeById(schemes, selectedSchemeId);
  const backgroundProjectOptions = useMemo(
    () => savedProjectPathOptions(schemes, activeProjectKey),
    [activeProjectKey, schemes]
  );
  const backgroundProjectRecord = backgroundProjectId && backgroundProjectId !== activeProjectKey
    ? projectById.get(backgroundProjectId)
    : undefined;
  const backgroundLayerOptions = useMemo(
    () => backgroundProjectRecord ? normalizeProjectLayers(backgroundProjectRecord.project).layers ?? [] : [],
    [backgroundProjectRecord]
  );
  const resolveConfiguredBackgroundLayerIds = (projectId?: string, configuredLayerIds?: string[]) => {
    if (!projectId) {
      return [];
    }
    const backgroundProject = projectById.get(projectId);
    if (!backgroundProject) {
      return configuredLayerIds ?? [];
    }
    const validLayerIds = new Set((normalizeProjectLayers(backgroundProject.project).layers ?? []).map((layer) => layer.id));
    if (!configuredLayerIds) {
      return defaultBackgroundLayerIdsForProject(backgroundProject.project);
    }
    return configuredLayerIds.filter((layerId) => validLayerIds.has(layerId));
  };
  const toggleBackgroundLayer = (layerId: string) => {
    if (!requireEditMode("修改背景页面图层")) {
      return;
    }
    pushUndoSnapshot();
    setBackgroundLayerIds((current) => current.includes(layerId)
      ? current.filter((item) => item !== layerId)
      : [...current, layerId]
    );
  };
  const {
    selectedCount,
    selectedNodeCount,
    selectedNodeTransformStatus,
    topologyWarningDisplayMessage,
    warningStatusText,
    warningStatusTitle
  } = useCanvasStatusDerivations({
    activeSelectedEdgeIds,
    activeSelectedNodeIds,
    topologyErrors,
    visibleNodeById
  });
  const contextSelectionCount = activeSelectedNodeIds.length + activeSelectedEdgeIds.length;
  const activeSelectedGroupIds = useMemo(
    () => isEditMode
      ? selectedCanvasGroupIds(activeLayerGroups, groupExpandedCanvasSelection.nodeIds, groupExpandedCanvasSelection.edgeIds)
      : EMPTY_ID_LIST,
    [activeLayerGroups, groupExpandedCanvasSelection, isEditMode]
  );
  const activeGroupById = useMemo(() => isEditMode ? new Map(activeLayerGroups.map((group) => [group.id, group])) : EMPTY_MODEL_GROUP_BY_ID, [activeLayerGroups, isEditMode]);
  const canAddTemplateFromSelection = activeSelectedGroupIds.length === 1;
  const selectedGroupMemberNodeIds = useMemo(
    () => isEditMode ? canvasGroupMemberNodeIds(activeLayerGroups, activeSelectedGroupIds) : EMPTY_ID_LIST,
    [activeLayerGroups, activeSelectedGroupIds, isEditMode]
  );
  const selectedGroupMemberNodeIdSet = useMemo(() => new Set(selectedGroupMemberNodeIds), [selectedGroupMemberNodeIds]);
  const focusedGroupedNodeMovesGroup =
    canvasSelectionScope === "direct" &&
    activeSelectedNodeIds.length === 1 &&
    activeSelectedEdgeIds.length === 0 &&
    selectedGroupMemberNodeIdSet.has(activeSelectedNodeIds[0]);
  const canUngroupSelectedGraphics = useMemo(
    () => isEditMode && canDissolveSingleCanvasGroupSelection(activeLayerGroups, activeSelectedNodeIds, activeSelectedEdgeIds),
    [activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode]
  );
  const canGroupSelectedGraphics = useMemo(
    () => isEditMode && canGroupCanvasSelection(activeLayerGroups, activeSelectedNodeIds, activeSelectedEdgeIds),
    [activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds, isEditMode]
  );
  const topologyWarningPageCount = Math.max(1, Math.ceil(inspectorTopologyErrors.length / TOPOLOGY_WARNING_PAGE_SIZE));
  const normalizedTopologyWarningPage = Math.min(topologyWarningPage, topologyWarningPageCount - 1);
  const visibleTopologyErrors = inspectorTopologyErrors.slice(
    normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE,
    normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE + TOPOLOGY_WARNING_PAGE_SIZE
  );
  const hiddenTopologyErrorCount = Math.max(0, inspectorTopologyErrors.length - visibleTopologyErrors.length);
  const draggingNodeIdSet = useMemo(() => new Set(dragging?.nodeIds ?? []), [dragging?.nodeIds]);
  const draggingNodeKey = useMemo(() => (dragging?.nodeIds ?? []).join("|"), [dragging?.nodeIds]);
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
  const graphTreePanelActive = inspectorTab === "graph" && graphInfoView === "tree";
  const elementTreeLayerSignature = useMemo(
    () => layers.map((layer) => `${layer.id}:${layer.visible !== false ? "1" : "0"}`).join("|"),
    [layers]
  );
  const elementTreeSource = useMemo(() => {
    const current = elementTreeSourceRef.current;
    if (
      !current ||
      (graphTreePanelActive &&
        !editHotInteractionActive &&
        (current.revision !== graphStore.elementTreeRevision || current.layerSignature !== elementTreeLayerSignature))
    ) {
      const next = {
        revision: graphStore.elementTreeRevision,
        layerSignature: elementTreeLayerSignature,
        nodes: visibleNodes,
        edges: visibleEdges
      };
      elementTreeSourceRef.current = next;
      return next;
    }
    return current;
  }, [editHotInteractionActive, elementTreeLayerSignature, graphStore.elementTreeRevision, graphTreePanelActive, visibleEdges, visibleNodes]);
  const deferredElementTreeSource = useDeferredValue(elementTreeSource);
  const elementTreeSignature = useMemo(
    () => graphTreePanelActive
      ? elementTreeCacheSignature(deferredElementTreeSource.revision, deferredElementTreeSource.layerSignature, libraryTemplates)
      : "",
    [deferredElementTreeSource, graphTreePanelActive, libraryTemplates]
  );
  const elementTree = useMemo(() => {
    if (!graphTreePanelActive) {
      return [];
    }
    if (elementTreeCacheRef.current.signature === elementTreeSignature) {
      return elementTreeCacheRef.current.tree;
    }
    const tree = buildElementTree(deferredElementTreeSource.nodes, deferredElementTreeSource.edges, libraryTemplates, { includeContainerChildren: false });
    elementTreeCacheRef.current = { signature: elementTreeSignature, tree };
    return tree;
  }, [deferredElementTreeSource, elementTreeSignature, graphTreePanelActive, libraryTemplates]);
  const elementTreeItemChildren = appExtractedHandlersC.createElementTreeItemChildren(appRuntimeCtx);

  useEffect(() => {
    setSelectedEdgeIds((current) => {
      if (!selectedEdgeId) {
        return current.length === 0 ? current : [];
      }
      return current.includes(selectedEdgeId) ? current : [selectedEdgeId];
    });
  }, [selectedEdgeId]);

  const markBusTerminalSyncDirty = (nodeIds: Iterable<string | undefined>) => {
    const next = new Set(pendingBusTerminalSyncNodeIdsRef.current);
    for (const nodeId of nodeIds) {
      if (nodeId) {
        next.add(nodeId);
      }
    }
    pendingBusTerminalSyncNodeIdsRef.current = next;
  };
  const busNodeIdsFromEdges = (edgeItems: Iterable<Edge | undefined>) => {
    const ids = new Set<string>();
    for (const edge of edgeItems) {
      if (!edge) {
        continue;
      }
      if (busNodeIdSet.has(edge.sourceId)) {
        ids.add(edge.sourceId);
      }
      if (busNodeIdSet.has(edge.targetId)) {
        ids.add(edge.targetId);
      }
    }
    return ids;
  };
  const markBusTerminalSyncDirtyForEdges = (...edgeCollections: Array<Iterable<Edge | undefined>>) => {
    const ids = new Set<string>();
    for (const edgeCollection of edgeCollections) {
      for (const busId of busNodeIdsFromEdges(edgeCollection)) {
        ids.add(busId);
      }
    }
    markBusTerminalSyncDirty(ids);
  };
  const busTerminalSyncNodeIdsForGraphPatch = appExtractedHandlersA.createBusTerminalSyncNodeIdsForGraphPatch(appRuntimeCtx);
  const synchronizePendingBusTerminalsWithGraphStore = appExtractedHandlersC.createSynchronizePendingBusTerminalsWithGraphStore(appRuntimeCtx);

  useEffect(() => {
    const pendingBusSyncNodeIds = pendingBusTerminalSyncNodeIdsRef.current;
    if (
      dragging ||
      manualPathDrag ||
      rewiring ||
      terminalPress?.moved ||
      connectSource ||
      (pendingBusSyncNodeIds.size === 0 && busNodeIdSet.size === 0)
    ) {
      return;
    }
    const scheduledBusSyncNodeIds = new Set(pendingBusSyncNodeIds);
    if (scheduledBusSyncNodeIds.size === 0) {
      if (lastBusTerminalSyncEndpointRevisionRef.current === graphStore.edgeEndpointRevision) {
        return;
      }
      lastBusTerminalSyncEndpointRevisionRef.current = graphStore.edgeEndpointRevision;
      return;
    } else {
      pendingBusTerminalSyncNodeIdsRef.current = new Set();
    }
    let busSyncCompleted = false;
    const cancelBusSync = scheduleIdleWork(() => {
      busSyncCompleted = true;
      const latestStore = latestGraphStoreRef.current;
      if (scheduledBusSyncNodeIds.size > 0 && latestStore) {
        const synchronized = synchronizePendingBusTerminalsWithGraphStore(latestStore, scheduledBusSyncNodeIds);
        if (!synchronized || (synchronized.nodeUpdates.length === 0 && synchronized.edgeUpserts.length === 0)) {
          lastBusTerminalSyncEndpointRevisionRef.current = latestStore.edgeEndpointRevision;
          return;
        }
        markRouteEdgesDirty(dirtyEdgeIdsAfterMove(
          synchronized.scopedEdges,
          synchronized.synchronized.edges,
          synchronized.nodeUpdates.map((node) => node.id)
        ));
        markStoredRouteEdgesDirty(synchronized.edgeUpserts.map((edge) => edge.id));
        suppressNextGraphDirtyRef.current = true;
        setGraphStore((current) => {
          const next = graphStoreApplyPatch(current, {
            nodeUpdates: synchronized.nodeUpdates,
            edgeUpserts: synchronized.edgeUpserts
          });
          lastBusTerminalSyncEndpointRevisionRef.current = next.edgeEndpointRevision;
          return next;
        });
        return;
      }
      lastBusTerminalSyncEndpointRevisionRef.current = graphStore.edgeEndpointRevision;
    }, 300, 1000);
    return () => {
      cancelBusSync();
      if (busSyncCompleted || scheduledBusSyncNodeIds.size === 0) {
        return;
      }
      const next = new Set(pendingBusTerminalSyncNodeIdsRef.current);
      for (const nodeId of scheduledBusSyncNodeIds) {
        next.add(nodeId);
      }
      pendingBusTerminalSyncNodeIdsRef.current = next;
    };
  }, [busNodeIdSet, connectSource, dragging, graphStore.edgeEndpointRevision, manualPathDrag, rewiring, terminalPress?.moved]);

  useEffect(() => {
    if (!graphTreePanelActive) {
      return;
    }
    const existingKeys = new Set(elementTree.map((group) => group.typeKey));
    setCollapsedElementTreeGroups((current) => current.filter((key) => existingKeys.has(key)));
    setElementTreeItemLimits((current) => {
      const next: Record<string, number> = {};
      for (const group of elementTree) {
        if (current[group.typeKey]) {
          next[group.typeKey] = current[group.typeKey];
        }
      }
      const changed = Object.keys(current).length !== Object.keys(next).length;
      return changed ? next : current;
    });
  }, [elementTree, graphTreePanelActive]);

  useEffect(() => {
    setTopologyWarningPage((current) => Math.min(current, Math.max(0, Math.ceil(inspectorTopologyErrors.length / TOPOLOGY_WARNING_PAGE_SIZE) - 1)));
  }, [inspectorTopologyErrors.length]);

  const canvasBounds = useMemo<CanvasBounds>(() => ({ width: canvasWidth, height: canvasHeight }), [canvasHeight, canvasWidth]);
  const currentZoomPercent = viewBoxZoomPercent(viewBox, canvasBounds);
  const canvasFullViewBox = useMemo<CanvasViewBox>(() => canvasFullViewBoxFromBounds(canvasBounds), [canvasBounds]);
  const canvasRenderBounds = canvasBounds;
  const canvasRenderViewBox = viewBox;
  const canvasScrollScale = canvasScrollScaleFromViewBox(canvasRenderViewBox, canvasRenderBounds);
  const canvasDisplayWidth = Math.max(1, Math.round(canvasRenderBounds.width * canvasScrollScale.x));
  const canvasDisplayHeight = Math.max(1, Math.round(canvasRenderBounds.height * canvasScrollScale.y));
  const computedCanvasHorizontalScrollbarsActive =
    canvasFrameViewportSize.width > 0 &&
    canvasDisplayWidth + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.width + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
  const computedCanvasVerticalScrollbarsActive =
    canvasFrameViewportSize.height > 0 &&
    canvasDisplayHeight + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.height + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
  const canvasResizeKeepsHorizontalScrollRange = canvasResizeKeepsScrollRange(canvasResizeDrag, "x");
  const canvasResizeKeepsVerticalScrollRange = canvasResizeKeepsScrollRange(canvasResizeDrag, "y");
  const canvasHorizontalScrollbarsActive = computedCanvasHorizontalScrollbarsActive || canvasResizeKeepsHorizontalScrollRange;
  const canvasVerticalScrollbarsActive = computedCanvasVerticalScrollbarsActive || canvasResizeKeepsVerticalScrollRange;
  const canvasScrollbarsActive =
    canvasFrameViewportSize.width > 0 &&
    canvasFrameViewportSize.height > 0 &&
    (canvasHorizontalScrollbarsActive || canvasVerticalScrollbarsActive);
  const computedCanvasScrollSurfaceWidth = canvasScrollSurfaceSize(
    canvasDisplayWidth,
    canvasFrameViewportSize.width,
    canvasHorizontalScrollbarsActive
  );
  const computedCanvasScrollSurfaceHeight = canvasScrollSurfaceSize(
    canvasDisplayHeight,
    canvasFrameViewportSize.height,
    canvasVerticalScrollbarsActive
  );
  const canvasScrollSurfaceWidth =
    canvasResizeKeepsHorizontalScrollRange && canvasResizeDrag
      ? Math.max(computedCanvasScrollSurfaceWidth, canvasResizeDrag.startScrollSurfaceWidth)
      : computedCanvasScrollSurfaceWidth;
  const canvasScrollSurfaceHeight =
    canvasResizeKeepsVerticalScrollRange && canvasResizeDrag
      ? Math.max(computedCanvasScrollSurfaceHeight, canvasResizeDrag.startScrollSurfaceHeight)
      : computedCanvasScrollSurfaceHeight;
  const canvasBaseDisplayOffsetX = canvasDisplayOffset(
    canvasDisplayWidth,
    canvasScrollSurfaceWidth,
    canvasFrameViewportSize.width,
    canvasHorizontalScrollbarsActive
  );
  const canvasBaseDisplayOffsetY = canvasDisplayOffset(
    canvasDisplayHeight,
    canvasScrollSurfaceHeight,
    canvasFrameViewportSize.height,
    canvasVerticalScrollbarsActive
  );
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
  const canvasDisplayOffsetX = canvasResizeAnchoredDisplayOffset(
    Math.round(canvasBaseDisplayOffsetX + clampedCanvasNoScrollOffset.x),
    canvasResizeDrag,
    "x",
    canvasDisplayWidth
  );
  const canvasDisplayOffsetY = canvasResizeAnchoredDisplayOffset(
    Math.round(canvasBaseDisplayOffsetY + clampedCanvasNoScrollOffset.y),
    canvasResizeDrag,
    "y",
    canvasDisplayHeight
  );
  const canvasResizeHotzoneWidth = Math.round(clampNumber(CANVAS_RESIZE_HANDLE_SIZE * canvasScrollScale.x, 10, 28));
  const canvasResizeHotzoneHeight = Math.round(clampNumber(CANVAS_RESIZE_HANDLE_SIZE * canvasScrollScale.y, 10, 28));
  const canvasResizeHotzoneStyle = {
    left: canvasDisplayOffsetX,
    top: canvasDisplayOffsetY,
    width: canvasDisplayWidth,
    height: canvasDisplayHeight,
    "--canvas-resize-hotzone-x": `${canvasResizeHotzoneWidth}px`,
    "--canvas-resize-hotzone-y": `${canvasResizeHotzoneHeight}px`
  } as CSSProperties;
  const canvasResizePreviewRect = canvasResizeDrag && canvasResizeDraft
    ? canvasResizePreviewRectForDraft(canvasResizeDrag, canvasResizeDraft)
    : null;
  const canvasBoundsRef = useRef<CanvasBounds>(canvasBounds);
  const canvasFullViewBoxRef = useRef<CanvasViewBox>(canvasFullViewBox);
  const canvasScrollScaleRef = useRef(canvasScrollScale);
  const canvasNoScrollOffsetRef = useRef(clampedCanvasNoScrollOffset);
  const canvasScrollbarsActiveRef = useRef(canvasScrollbarsActive);
  const canvasHorizontalScrollbarsActiveRef = useRef(canvasHorizontalScrollbarsActive);
  const canvasVerticalScrollbarsActiveRef = useRef(canvasVerticalScrollbarsActive);
  const canvasVisibleViewBoxRef = useRef<CanvasViewBox>(canvasVisibleViewBox);
  const skipNextCanvasScrollSyncRef = useRef(false);
  const canvasFrameUserScrollRef = useRef(false);
  const canvasFrameProgrammaticScrollRef = useRef(false);
  const canvasBoundsScrollSyncPendingRef = useRef(false);
  const canvasBoundsScrollSyncPendingFrameRef = useRef<number | null>(null);
  const pendingCanvasBoundsScrollAnchorRef = useRef<CanvasBoundsScrollAnchor | null>(null);
  const pendingWheelZoomAnchorRef = useRef<WheelZoomAnchor | null>(null);
  const pendingCanvasResizeCommitAnchorRef = useRef<CanvasResizeCommitAnchor | null>(null);
  canvasBoundsRef.current = canvasBounds;
  canvasFullViewBoxRef.current = canvasFullViewBox;
  canvasScrollScaleRef.current = canvasScrollScale;
  canvasNoScrollOffsetRef.current = clampedCanvasNoScrollOffset;
  canvasScrollbarsActiveRef.current = canvasScrollbarsActive;
  canvasHorizontalScrollbarsActiveRef.current = canvasHorizontalScrollbarsActive;
  canvasVerticalScrollbarsActiveRef.current = canvasVerticalScrollbarsActive;
  canvasVisibleViewBoxRef.current = canvasVisibleViewBox;
  const clampCanvasBounds = (bounds: CanvasBounds): CanvasBounds => ({
    width: clampCanvasDimension(bounds.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth),
    height: clampCanvasDimension(bounds.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight)
  });
  const cancelCanvasBoundsScrollSyncPendingRelease = () => {
    if (canvasBoundsScrollSyncPendingFrameRef.current !== null) {
      window.cancelAnimationFrame(canvasBoundsScrollSyncPendingFrameRef.current);
      canvasBoundsScrollSyncPendingFrameRef.current = null;
    }
  };
  const clearCanvasBoundsScrollSyncPending = () => {
    cancelCanvasBoundsScrollSyncPendingRelease();
    canvasBoundsScrollSyncPendingRef.current = false;
    pendingCanvasBoundsScrollAnchorRef.current = null;
  };
  const releaseCanvasBoundsScrollSyncPending = () => {
    cancelCanvasBoundsScrollSyncPendingRelease();
    canvasBoundsScrollSyncPendingFrameRef.current = window.requestAnimationFrame(() => {
      canvasBoundsScrollSyncPendingFrameRef.current = window.requestAnimationFrame(() => {
        canvasBoundsScrollSyncPendingFrameRef.current = null;
        canvasBoundsScrollSyncPendingRef.current = false;
        pendingCanvasBoundsScrollAnchorRef.current = null;
      });
    });
  };
  const markCanvasBoundsScrollSyncPending = appExtractedHandlersA.createMarkCanvasBoundsScrollSyncPending(appRuntimeCtx);
  const canvasBoundsForGraphContent = (
    baseBounds: CanvasBounds,
    contentNodes: ModelNode[] = nodes,
    contentEdges: Edge[] = edges,
    contentRoutes: RoutedEdge[] = routedEdges,
    padding = MOVE_BOUNDARY_GUARD
  ): CanvasBounds => {
    const contentSize = calculateModelContentSize(contentNodes, contentEdges, contentRoutes, padding);
    return clampCanvasBounds({
      width: Math.max(baseBounds.width, contentSize.width),
      height: Math.max(baseBounds.height, contentSize.height)
    });
  };
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
  const applyCanvasBounds = appExtractedHandlersB.createApplyCanvasBounds(appRuntimeCtx);
  const edgeRoutesForGeometryBounds = (edgeList: Edge[]): Pick<RoutedEdge, "points">[] =>
    edgeList.flatMap((edge) => {
      const points = [
        edge.sourcePoint,
        ...(edge.manualPoints ?? []),
        edge.targetPoint
      ].filter((point): point is Point => Boolean(point));
      return points.length > 0 ? [{ points }] : [];
    });
  const autoCanvasExpansionBlockedMessage = "当前模型未允许自动扩界，请先人工调整画布边界。";
  const graphContentFitsFixedCanvasBounds = (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = [],
    bounds = canvasBounds
  ) =>
    modelGeometryInsideCanvasBounds(contentNodes, [...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)], bounds, 0);
  const rejectAutoCanvasExpansionForContent = (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = [],
    bounds = canvasBounds
  ) => {
    if (allowAutoExpandCanvas || graphContentFitsFixedCanvasBounds(contentNodes, contentEdges, contentRoutes, bounds)) {
      return false;
    }
    writeOperationLog(autoCanvasExpansionBlockedMessage);
    return true;
  };
  const canvasBoundsForAutoExpandedGraphContent = (
    baseBounds: CanvasBounds,
    contentNodes: ModelNode[] = nodes,
    contentEdges: Edge[] = edges,
    contentRoutes: RoutedEdge[] = routedEdges,
    padding = CANVAS_AUTO_EXPAND_PADDING
  ): CanvasBounds => {
    if (!allowAutoExpandCanvas) {
      return baseBounds;
    }
    return canvasBoundsForGraphContent(baseBounds, contentNodes, contentEdges, contentRoutes, padding);
  };
  const expandCanvasToFitGraph = (
    contentNodes: ModelNode[] = nodes,
    contentEdges: Edge[] = edges,
    contentRoutes: RoutedEdge[] = routedEdges,
    padding = CANVAS_AUTO_EXPAND_PADDING,
    baseBounds = canvasBounds
  ) => applyCanvasBounds(canvasBoundsForAutoExpandedGraphContent(baseBounds, contentNodes, contentEdges, contentRoutes, padding));
  const hasCanvasOriginShift = (shift: Point) => shift.x !== 0 || shift.y !== 0;
  const translatePointBy = (point: Point, shift: Point): Point => ({
    x: Math.round(point.x + shift.x),
    y: Math.round(point.y + shift.y)
  });
  const translateOptionalPointBy = (point: Point | undefined, shift: Point) =>
    point ? translatePointBy(point, shift) : undefined;
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
  const translateNodeBy = (node: ModelNode, shift: Point): ModelNode =>
    hasCanvasOriginShift(shift)
      ? { ...node, position: translatePointBy(node.position, shift) }
      : node;
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
  const shiftCachedRoutesForCanvasOrigin = (originShift: Point) => {
    if (!hasCanvasOriginShift(originShift) || cachedRoutedEdgesRef.current.length === 0) {
      return;
    }
    const shiftedRoutes = cachedRoutedEdgesRef.current.map((route) => translateRouteBy(route, originShift));
    cachedRoutedEdgesRef.current = shiftedRoutes;
    cachedRouteStoreRef.current = routeStoreSetRoutes(cachedRouteStoreRef.current, shiftedRoutes);
  };
  const leftTopCanvasOriginShiftForContent = (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = [],
    padding = 0
  ): Point => {
    const geometryBounds = calculateModelGeometryBounds(
      contentNodes,
      [...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)],
      padding
    );
    const positiveCeil = (value: number) => Math.ceil(Math.max(0, value));
    return {
      x: geometryBounds && geometryBounds.left < 0 ? positiveCeil(-geometryBounds.left) : 0,
      y: geometryBounds && geometryBounds.top < 0 ? positiveCeil(-geometryBounds.top) : 0
    };
  };
  const minimumCanvasBoundsForResizeEdge = (edge: CanvasResizeEdge): CanvasBounds => {
    const geometryBounds = calculateModelGeometryBounds(
      nodes,
      [...routedEdges, ...edgeRoutesForGeometryBounds(edges)],
      MOVE_BOUNDARY_GUARD
    );
    return clampCanvasBounds(canvasResizeMinimumBoundsForGeometry(
      edge,
      canvasBounds,
      geometryBounds,
      { width: MIN_CANVAS_WIDTH, height: MIN_CANVAS_HEIGHT }
    ));
  };
  const canvasBoundsWithOriginShift = (baseBounds: CanvasBounds, originShift: Point): CanvasBounds => ({
    width: baseBounds.width + originShift.x,
    height: baseBounds.height + originShift.y
  });
  const clampNodePositionToExpandableBounds = (node: ModelNode, bounds: CanvasBounds, position = node.position): Point => {
    const clamped = clampNodePositionToBounds(node, bounds, position);
    if (!allowAutoExpandCanvas) {
      return clamped;
    }
    return {
      x: position.x < clamped.x ? Math.round(position.x) : clamped.x,
      y: position.y < clamped.y ? Math.round(position.y) : clamped.y
    };
  };
  const clampPointToExpandableBounds = (point: Point, bounds: CanvasBounds): Point => {
    const clamped = clampPointToBounds(point, bounds);
    if (!allowAutoExpandCanvas) {
      return clamped;
    }
    return {
      x: point.x < clamped.x ? Math.round(point.x) : clamped.x,
      y: point.y < clamped.y ? Math.round(point.y) : clamped.y
    };
  };
  const clampEdgeGeometryToExpandableBounds = appExtractedHandlersA.createClampEdgeGeometryToExpandableBounds(appRuntimeCtx);
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
  const canvasNoScrollOffsetForCanvasResizeAnchor = appExtractedHandlersB.createCanvasNoScrollOffsetForCanvasResizeAnchor(appRuntimeCtx);
  const setCanvasFrameScrollPosition = (frame: HTMLElement, left: number, top: number) => {
    canvasFrameProgrammaticScrollRef.current = true;
    frame.scrollLeft = left;
    frame.scrollTop = top;
    window.requestAnimationFrame(() => {
      canvasFrameProgrammaticScrollRef.current = false;
    });
  };
  const centerCanvasFrameScrollPosition = (frame: HTMLElement) => {
    setCanvasFrameScrollPosition(
      frame,
      Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2),
      Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2)
    );
  };
  const syncCanvasFrameScrollToViewBox = appExtractedHandlersC.createSyncCanvasFrameScrollToViewBox(appRuntimeCtx);
  const syncCanvasFrameScrollToCanvasResizeCommitAnchor = appExtractedHandlersA.createSyncCanvasFrameScrollToCanvasResizeCommitAnchor(appRuntimeCtx);
  const syncCanvasFrameScrollToWheelAnchor = appExtractedHandlersB.createSyncCanvasFrameScrollToWheelAnchor(appRuntimeCtx);
  const currentViewBoxFromCanvasFrameScroll = () => {
    const frame = canvasFrameRef.current;
    if (!frame) {
      return viewBoxRef.current;
    }
    const maxLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
    return canvasViewBoxFromFrameScrollPosition({
      currentViewBox: viewBoxRef.current,
      canvasBounds: canvasBoundsRef.current,
      scrollLeft: frame.scrollLeft,
      scrollTop: frame.scrollTop,
      maxScrollLeft: maxLeft,
      maxScrollTop: maxTop,
      horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current,
      verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current
    });
  };
  const scheduleCanvasVisibleViewBoxUpdate = appExtractedHandlersC.createScheduleCanvasVisibleViewBoxUpdate(appRuntimeCtx);
  const handleCanvasFrameScroll = () => {
    if (canvasFrameScrollIsUserDriven({
      programmaticScroll: canvasFrameProgrammaticScrollRef.current,
      boundsScrollSyncPending: canvasBoundsScrollSyncPendingRef.current
    })) {
      canvasFrameUserScrollRef.current = true;
    }
    scheduleCanvasVisibleViewBoxUpdate();
  };
  const updateCanvasFrameViewportSize = () => {
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const nextSize = { width: frame.clientWidth, height: frame.clientHeight };
    setCanvasFrameViewportSize((current) =>
      current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
    );
  };
  const updateCanvasFrameViewportAndVisibleBox = () => {
    updateCanvasFrameViewportSize();
    scheduleCanvasVisibleViewBoxUpdate();
  };
  useEffect(() => {
    setCanvasNoScrollOffset((current) => {
      const next = clampCanvasNoScrollOffsetPoint(current);
      return next.x === current.x && next.y === current.y ? current : next;
    });
  }, [
    canvasBaseDisplayOffsetX,
    canvasBaseDisplayOffsetY,
    canvasDisplayHeight,
    canvasDisplayWidth,
    canvasFrameViewportSize.height,
    canvasFrameViewportSize.width,
    canvasHorizontalScrollbarsActive,
    canvasVerticalScrollbarsActive
  ]);
  const leftPanelVisible = isSidePanelVisible(leftPanelMode, leftPanelAutoVisible);
  const rightPanelVisible = isSidePanelVisible(rightPanelMode, rightPanelAutoVisible);
  useEffect(() => {
    if (!leftPanelVisible) {
      hideLibraryFlyout();
    }
  }, [leftPanelVisible]);
  const nodeImage = (node: ModelNode) => resolveNodeImage(node, imageAssets);
  const nodeForegroundImage = (node: ModelNode) => resolveNodeForegroundImage(node, imageAssets);
  const nodeHasUprightBoundsContent = (
    node: ModelNode,
    imageHref = nodeImage(node),
    foregroundImageHref = nodeForegroundImage(node)
  ) => !isBusNode(node) && Boolean(imageHref || foregroundImageHref || node.kind === "static-text" || node.kind === "static-image");
  const canvasBackgroundImageUrl = resolveProjectImage(
    { canvasBackgroundImage, canvasBackgroundImageAssetId },
    imageAssets
  );

  useEffect(() => {
    updateCanvasFrameViewportAndVisibleBox();
  }, [canvasDisplayHeight, canvasDisplayWidth, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth]);

  useLayoutEffect(() => {
    if (initialCanvasFitAppliedRef.current) {
      return;
    }
    if (canvasFrameViewportSize.width <= 0 || canvasFrameViewportSize.height <= 0) {
      return;
    }
    initialCanvasFitAppliedRef.current = true;
    setViewBox(fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current));
    setCanvasVisibleViewBox(canvasFullViewBox);
    scheduleCanvasVisibleViewBoxUpdate();
  }, [canvasBounds, canvasFrameViewportSize.height, canvasFrameViewportSize.width, canvasFullViewBox]);

  useLayoutEffect(() => {
    const pendingWheelZoomAnchor = pendingWheelZoomAnchorRef.current;
    if (pendingWheelZoomAnchor) {
      pendingWheelZoomAnchorRef.current = null;
      syncCanvasFrameScrollToWheelAnchor(pendingWheelZoomAnchor);
      const wheelZoomViewportChanged = canvasFrameViewportSizeChanged(canvasFrameRef.current, canvasFrameViewportSize);
      if (wheelZoomViewportChanged) {
        pendingWheelZoomAnchorRef.current = pendingWheelZoomAnchor;
        updateCanvasFrameViewportSize();
      }
      scheduleCanvasVisibleViewBoxUpdate();
      return;
    }
    const pendingCanvasResizeCommitAnchor = pendingCanvasResizeCommitAnchorRef.current;
    if (pendingCanvasResizeCommitAnchor) {
      pendingCanvasResizeCommitAnchorRef.current = null;
      syncCanvasFrameScrollToCanvasResizeCommitAnchor(pendingCanvasResizeCommitAnchor);
      window.requestAnimationFrame(() => {
        syncCanvasFrameScrollToCanvasResizeCommitAnchor(pendingCanvasResizeCommitAnchor);
        scheduleCanvasVisibleViewBoxUpdate();
      });
      scheduleCanvasVisibleViewBoxUpdate();
      return;
    }
    if (!canvasScrollSyncShouldRun({
      skipNextScrollSync: skipNextCanvasScrollSyncRef.current,
      boundsScrollSyncPending: canvasBoundsScrollSyncPendingRef.current
    })) {
      skipNextCanvasScrollSyncRef.current = false;
      return;
    }
    skipNextCanvasScrollSyncRef.current = false;
    syncCanvasFrameScrollToViewBox(
      viewBox,
      canvasBoundsScrollSyncPendingRef.current ? pendingCanvasBoundsScrollAnchorRef.current : null
    );
    scheduleCanvasVisibleViewBoxUpdate();
  }, [
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

  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    frame.addEventListener("scroll", handleCanvasFrameScroll, { passive: true });
    window.addEventListener("resize", updateCanvasFrameViewportAndVisibleBox);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateCanvasFrameViewportAndVisibleBox);
    observer?.observe(frame);
    updateCanvasFrameViewportAndVisibleBox();
    return () => {
      frame.removeEventListener("scroll", handleCanvasFrameScroll);
      window.removeEventListener("resize", updateCanvasFrameViewportAndVisibleBox);
      observer?.disconnect();
    };
    // 事件处理函数只读取 ref 中的最新 viewBox；监听器不需要随每次渲染重建。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  }, [canvasHeight, canvasWidth]);
  const buildConnectPreviewPath = appExtractedHandlersA.createBuildConnectPreviewPath(appRuntimeCtx);
  const connectPreviewColor = useMemo(() => {
    if (!connectSource) {
      return "";
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    const terminal =
      sourceNode?.terminals.find((item) => item.id === connectSource.terminalId) ??
      sourceNode?.terminals[0];
    const terminalType = terminal?.type ?? (sourceNode ? getBusTerminalType(sourceNode) : undefined);
    return sourceNode && terminal
      ? getTerminalDisplayColor(sourceNode, terminal, colorDisplayMode, colorPalette)
      : terminalType
        ? terminalColor(terminalType, colorPalette)
        : "";
  }, [colorDisplayMode, colorPalette, connectSource, visibleNodeById]);
  const routableLineTemplateTerminalType = (template: DeviceTemplate): TerminalType =>
    template.terminalTypes?.[0] ?? template.terminalType;
  const connectTargetTerminalType = (target: ConnectTarget): TerminalType | undefined =>
    isBusNode(target.node)
      ? getBusTerminalType(target.node)
      : target.node.terminals.find((terminal) => terminal.id === target.terminalId)?.type;
  const connectTargetPoint = (target: ConnectTarget): Point =>
    target.point ?? getTerminalPoint(target.node, target.terminalId);
  const buildRoutableLinePreviewPath = appExtractedHandlersC.createBuildRoutableLinePreviewPath(appRuntimeCtx);
  const routableLinePlacementColor = useMemo(() => {
    if (!routableLinePlacement) {
      return "";
    }
    return terminalColor(routableLineTemplateTerminalType(routableLinePlacement.template), colorPalette);
  }, [colorPalette, routableLinePlacement]);
  const routableLineEndpointDragColor = useMemo(() => {
    if (!routableLineEndpointDrag) {
      return "";
    }
    const node = nodeById.get(routableLineEndpointDrag.nodeId);
    const terminal = node?.terminals[routableLineEndpointDrag.endpoint === "source" ? 0 : 1] ?? node?.terminals[0];
    return terminal ? terminalColor(terminal.type, colorPalette) : "";
  }, [colorPalette, nodeById, routableLineEndpointDrag]);
  useEffect(() => {
    if (routeRenderingReady) {
      return;
    }
    if (hasUnsavedChanges || manualPathDrag || rewiring || routableLinePlacement || routableLineEndpointDrag || terminalPress?.moved || dragging || connectSource) {
      setRouteRenderingReady(true);
    }
  }, [connectSource, dragging, hasUnsavedChanges, manualPathDrag, rewiring, routableLineEndpointDrag, routableLinePlacement, routeRenderingReady, terminalPress?.moved]);

  const routeInputLayerSignature = useMemo(
    () => layers.map((layer) => `${layer.id}:${layer.visible !== false ? "1" : "0"}`).join("|"),
    [layers]
  );
  const routeInput = useMemo(() => {
    const cachedRouteInput = cachedRouteInputRef.current;
    if (
      cachedRouteInput &&
      cachedRouteInput.routeGeometryRevision === graphStore.routeGeometryRevision &&
      cachedRouteInput.layerSignature === routeInputLayerSignature
    ) {
      return cachedRouteInput;
    }
    const nextRouteInput = {
      routeGeometryRevision: graphStore.routeGeometryRevision,
      layerSignature: routeInputLayerSignature,
      nodes: visibleNodes,
      edges: visibleEdges
    };
    cachedRouteInputRef.current = nextRouteInput;
    return nextRouteInput;
  }, [graphStore.routeGeometryRevision, routeInputLayerSignature, visibleEdges, visibleNodes]);
  const routingNodes = routeInput.nodes;
  const routingEdges = routeInput.edges;
  const affectedRoutingEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    return ids;
  }, []);
  useEffect(() => {
    if (isBrowseMode || routeRenderingReady || savedRouteCrossingArcsReady || routingEdges.length === 0) {
      return;
    }
    return scheduleIdleWork(() => {
      setSavedRouteCrossingArcsReady(true);
    }, 120, 3000);
  }, [isBrowseMode, routeInput.routeGeometryRevision, routeRenderingReady, routingEdges.length, savedRouteCrossingArcsReady]);
  const routeRenderingEnabled = routeRenderingReady;
  const patchStoredRouteStoreForEdgeIds = (
    store: RouteStore | null | undefined,
    edgeIds: ReadonlySet<string>,
    bounds: CanvasBounds,
    routeNodes: ModelNode[]
  ): RouteStore | null => {
    if (!store || edgeIds.size === 0 || store.routes.length === 0) {
      return null;
    }
    const changedRouteIds = new Set<string>();
    const routeDeleteIds: string[] = [];
    const routeDeleteIdSet = new Set<string>();
    const localRouteById = new Map<string, RoutedEdge>();
    const previousLocalRouteById = new Map<string, RoutedEdge>();
    const addLocalRoute = (route: RoutedEdge | undefined, options: { replaceChanged?: boolean } = {}) => {
      if (!route || routeDeleteIdSet.has(route.edgeId)) {
        return;
      }
      if (changedRouteIds.has(route.edgeId) && localRouteById.has(route.edgeId) && !options.replaceChanged) {
        return;
      }
      localRouteById.set(route.edgeId, route);
    };
    const addStoredRoutesNearBounds = (boundsToQuery: ReturnType<typeof routeRenderBounds>) => {
      if (!boundsToQuery) {
        return;
      }
      for (const route of queryRouteSpatialIndex(store.routeSpatialIndex, boundsToQuery)) {
        addLocalRoute(route);
      }
    };

    for (const edgeId of edgeIds) {
      const previousRoute = store.routeMap.get(edgeId);
      if (previousRoute) {
        previousLocalRouteById.set(edgeId, previousRoute);
        addStoredRoutesNearBounds(routeRenderBounds(previousRoute, 8));
      }
      const edge = edgeById.get(edgeId);
      if (!edge || !visibleEdgeIdSet.has(edge.id)) {
        changedRouteIds.add(edgeId);
        routeDeleteIds.push(edgeId);
        routeDeleteIdSet.add(edgeId);
        localRouteById.delete(edgeId);
        continue;
      }
      const routeNodesForEdge = routingNodesForConnectionEdge(edge, routeNodes);
      const nextRoute = routeEdgesForStoredRendering(routeNodesForEdge, [edge], bounds)[0];
      if (!nextRoute) {
        changedRouteIds.add(edgeId);
        routeDeleteIds.push(edgeId);
        routeDeleteIdSet.add(edgeId);
        localRouteById.delete(edgeId);
        continue;
      }
      changedRouteIds.add(edgeId);
      addStoredRoutesNearBounds(routeRenderBounds(nextRoute, 8));
      addLocalRoute(nextRoute, { replaceChanged: true });
    }

    if (changedRouteIds.size === 0 && routeDeleteIds.length === 0) {
      return null;
    }
    const refreshSeedRoutes = Array.from(localRouteById.values());
    for (const route of refreshSeedRoutes) {
      addStoredRoutesNearBounds(routeRenderBounds(route, 8));
    }
    const localRoutes = Array.from(localRouteById.values()).sort(
      (first, second) =>
        (store.routeIndexById.get(first.edgeId) ?? Number.MAX_SAFE_INTEGER) -
        (store.routeIndexById.get(second.edgeId) ?? Number.MAX_SAFE_INTEGER)
    );
    const refreshedRoutes = localRoutes.length > 0
      ? refreshCrossingArcPaths(localRoutes, changedRouteIds, Array.from(previousLocalRouteById.values()))
      : [];
    return routeStorePatchRoutes(store, refreshedRoutes, routeDeleteIds);
  };
  const routedRouteState = useMemo((): { routes: RoutedEdge[]; store: RouteStore | null } => {
    if (!routeRenderingEnabled) {
      return {
        routes: routeEdgesForSavedPathRendering(routingNodes, routingEdges, canvasBounds, { refreshCrossingArcs: savedRouteCrossingArcsReady }),
        store: null
      };
    }
    const committedStoredEdgeIds = pendingStoredRouteEdgeIdsRef.current;
    if (committedStoredEdgeIds.size > 0) {
      const patchedStoredRouteStore = patchStoredRouteStoreForEdgeIds(
        cachedRouteStoreRef.current,
        committedStoredEdgeIds,
        canvasBounds,
        routeInput.nodes
      );
      if (patchedStoredRouteStore) {
        return { routes: patchedStoredRouteStore.routes, store: patchedStoredRouteStore };
      }
      return {
        routes: routeEdgesForCachedStoredRendering(
          routeInput.nodes,
          routeInput.edges,
          committedStoredEdgeIds,
          canvasBounds,
          cachedRoutedEdgesRef.current
        ),
        store: null
      };
    }
    const committedAffectedEdgeIds = pendingRouteEdgeIdsRef.current;
    const affectedEdgeIds = committedAffectedEdgeIds.size > 0
      ? new Set([...affectedRoutingEdgeIds, ...committedAffectedEdgeIds])
      : affectedRoutingEdgeIds;
    return {
      routes: routeEdgesForIncrementalRendering(
        routingNodes,
        routingEdges,
        affectedEdgeIds,
        canvasBounds,
        cachedRoutedEdgesRef.current
      ),
      store: null
    };
  }, [affectedRoutingEdgeIds, canvasBounds, routeInput.edges, routeInput.nodes, routeRenderingEnabled, routingEdges, routingNodes, savedRouteCrossingArcsReady]);
  const routedEdges = routedRouteState.routes;
  const routedEdgeStore = useMemo(
    () => routedRouteState.store ?? routeStoreSetRoutes(cachedRouteStoreRef.current, routedEdges),
    [routedEdges, routedRouteState]
  );
  const routedEdgeSpatialIndex = routedEdgeStore.routeSpatialIndex;
  const routedEdgeById = routedEdgeStore.routeMap;
  const routedEdgeIndexById = routedEdgeStore.routeIndexById;
  // A delayed passive effect from an older drag frame must not clear dirtiness from a newer drag commit.
  const committedRouteDirtyGeneration = routeDirtyGenerationRef.current;
  useEffect(() => {
    if (routeDirtyGenerationRef.current !== committedRouteDirtyGeneration) {
      return;
    }
    cachedRoutedEdgesRef.current = routedEdges;
    cachedRouteStoreRef.current = routedEdgeStore;
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
  }, [committedRouteDirtyGeneration, routedEdgeStore, routedEdges]);
  const renderViewportBounds = useMemo(() => expandViewBoxForRendering(canvasVisibleViewBox), [canvasVisibleViewBox]);
  const viewportQueryBounds = useMemo(() => {
    const nextViewportQueryBounds = snapRenderViewportBoundsForQuery(renderViewportBounds);
    const previousViewportQueryBounds = viewportQueryBoundsCacheRef.current;
    if (
      previousViewportQueryBounds &&
      sameRenderViewportBounds(previousViewportQueryBounds, nextViewportQueryBounds)
    ) {
      return previousViewportQueryBounds;
    }
    viewportQueryBoundsCacheRef.current = nextViewportQueryBounds;
    return nextViewportQueryBounds;
  }, [renderViewportBounds]);
  const deferredViewportQueryBounds = useDeferredValue(viewportQueryBounds);
  const routeRenderOrder = (first: RoutedEdge, second: RoutedEdge) =>
    (routedEdgeIndexById.get(first.edgeId) ?? Number.MAX_SAFE_INTEGER) -
    (routedEdgeIndexById.get(second.edgeId) ?? Number.MAX_SAFE_INTEGER);
  const viewportRoutedEdges = useMemo(() => {
    const viewportQueryCacheKey = viewportBoundsCacheKey(deferredViewportQueryBounds);
    const cacheOwnerRefs = [routedEdgeStore, routedEdgeSpatialIndex, routedEdgeById, routedEdgeIndexById];
    const cachedRoutes = readViewportResultCache(viewportRoutedEdgesResultCacheRef.current, cacheOwnerRefs, displaySelectedEdgeKey, viewportQueryCacheKey);
    if (cachedRoutes) {
      return cachedRoutes;
    }
    let routes: RoutedEdge[];
    if (activeSelectedEdgeSet.size === 0) {
      routes = queryRouteSpatialIndex(routedEdgeSpatialIndex, deferredViewportQueryBounds).sort(routeRenderOrder);
      writeViewportResultCache(viewportRoutedEdgesResultCacheRef.current, viewportQueryCacheKey, routes);
      return routes;
    }
    const regularRoutes: RoutedEdge[] = [];
    const selectedRoutes: RoutedEdge[] = [];
    const selectedRouteIds = new Set<string>();
    for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, deferredViewportQueryBounds)) {
      if (activeSelectedEdgeSet.has(route.edgeId)) {
        selectedRoutes.push(route);
        selectedRouteIds.add(route.edgeId);
      } else {
        regularRoutes.push(route);
      }
    }
    for (const edgeId of activeSelectedEdgeSet) {
      if (selectedRouteIds.has(edgeId)) {
        continue;
      }
      const route = routedEdgeById.get(edgeId);
      if (route) {
        selectedRoutes.push(route);
      }
    }
    regularRoutes.sort(routeRenderOrder);
    selectedRoutes.sort(routeRenderOrder);
    routes = selectedRoutes.length > 0 ? [...regularRoutes, ...selectedRoutes] : regularRoutes;
    writeViewportResultCache(viewportRoutedEdgesResultCacheRef.current, viewportQueryCacheKey, routes);
    return routes;
  }, [activeSelectedEdgeSet, deferredViewportQueryBounds, displaySelectedEdgeKey, routedEdgeById, routedEdgeIndexById, routedEdgeSpatialIndex, routedEdgeStore]);
  const viewportNodes = useMemo(() => {
    const viewportQueryCacheKey = viewportBoundsCacheKey(deferredViewportQueryBounds);
    const cacheOwnerRefs = [visibleNodeSpatialIndex, visibleNodeById, visibleNodeIdSet, edgeById, graphStore.nodeIndexById, routedEdgeStore];
    const cacheToken = `${displaySelectedNodeKey}/${draggingNodeKey}/${connectSource?.nodeId ?? ""}/${displaySelectedEdgeKey}`;
    const cachedNodes = readViewportResultCache(viewportNodesResultCacheRef.current, cacheOwnerRefs, cacheToken, viewportQueryCacheKey);
    if (cachedNodes) {
      return cachedNodes;
    }
    const viewportNodeById = new Map<string, ModelNode>();
    const addVisibleNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id)) {
        viewportNodeById.set(node.id, node);
      }
    };
    const addVisibleNodeId = (nodeId: string | undefined) => {
      addVisibleNode(nodeId ? visibleNodeById.get(nodeId) : undefined);
    };
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, deferredViewportQueryBounds)) {
      addVisibleNode(node);
    }
    selectedNodeIdSet.forEach(addVisibleNodeId);
    draggingNodeIdSet.forEach(addVisibleNodeId);
    addVisibleNodeId(connectSource?.nodeId);
    for (const route of viewportRoutedEdges) {
      const edge = edgeById.get(route.edgeId);
      if (edge) {
        addVisibleNodeId(edge.sourceId);
        addVisibleNodeId(edge.targetId);
      }
    }
    const nodes = Array.from(viewportNodeById.values()).sort(
      (first, second) =>
        (graphStore.nodeIndexById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (graphStore.nodeIndexById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
    );
    writeViewportResultCache(viewportNodesResultCacheRef.current, viewportQueryCacheKey, nodes);
    return nodes;
  }, [connectSource?.nodeId, deferredViewportQueryBounds, displaySelectedEdgeKey, displaySelectedNodeKey, draggingNodeIdSet, draggingNodeKey, edgeById, graphStore.nodeIndexById, routedEdgeStore, selectedNodeIdSet, viewportRoutedEdges, visibleNodeById, visibleNodeIdSet, visibleNodeSpatialIndex]);
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
  const selectedLayoutUnits = useMemo(
    () => {
      if (!isEditMode) {
        selectedLayoutUnitsCacheRef.current = EMPTY_CANVAS_LAYOUT_UNITS;
        return EMPTY_CANVAS_LAYOUT_UNITS;
      }
      if (editHotInteractionActive && selectedLayoutUnitsCacheRef.current.length > 0) {
        return selectedLayoutUnitsCacheRef.current;
      }
      if (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0) {
        selectedLayoutUnitsCacheRef.current = EMPTY_CANVAS_LAYOUT_UNITS;
        return EMPTY_CANVAS_LAYOUT_UNITS;
      }
      const units = buildCanvasLayoutUnits(activeLayerGroups, activeLayerNodes, activeSelectedNodeIds, activeSelectedEdgeIds, activeLayerEdges, routedEdges);
      selectedLayoutUnitsCacheRef.current = units;
      return units;
    },
    [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, editHotInteractionActive, isEditMode, routedEdges]
  );
  const selectedGroupLayoutUnits = useMemo(
    () => selectedLayoutUnits.length === 0 ? EMPTY_CANVAS_LAYOUT_UNITS : selectedLayoutUnits.filter((unit) => unit.kind === "group"),
    [selectedLayoutUnits]
  );
  const visibleSelectedGroupLayoutUnits = focusedGroupedNodeMovesGroup ? [] : selectedGroupLayoutUnits;
  const selectedTransformGroupUnit =
    canvasSelectionScope === "group" && selectedLayoutUnits.length === 1 && selectedGroupLayoutUnits.length === 1
      ? selectedGroupLayoutUnits[0]
      : null;
  const selectedLayoutUnitCount = selectedLayoutUnits.length;
  const markRouteEdgesDirty = (edgeIds: Iterable<string | undefined>) => {
    const next = new Set(pendingRouteEdgeIdsRef.current);
    let changed = false;
    for (const edgeId of edgeIds) {
      if (edgeId) {
        next.add(edgeId);
        changed = true;
      }
    }
    pendingRouteEdgeIdsRef.current = next;
    if (changed) {
      routeDirtyGenerationRef.current += 1;
    }
  };
  const markStoredRouteEdgesDirty = (edgeIds: Iterable<string | undefined>) => {
    const next = new Set(pendingStoredRouteEdgeIdsRef.current);
    let changed = false;
    for (const edgeId of edgeIds) {
      if (edgeId) {
        next.add(edgeId);
        changed = true;
      }
    }
    pendingStoredRouteEdgeIdsRef.current = next;
    if (changed) {
      routeDirtyGenerationRef.current += 1;
    }
  };
  const edgeListsHaveSameOrder = (previousEdges: Edge[], nextEdges: Edge[]) => {
    if (previousEdges.length !== nextEdges.length) {
      return false;
    }
    for (let index = 0; index < previousEdges.length; index += 1) {
      if (previousEdges[index].id !== nextEdges[index].id) {
        return false;
      }
    }
    return true;
  };
  const edgeReferenceDiffIds = appExtractedHandlersA.createEdgeReferenceDiffIds(appRuntimeCtx);
  const dirtyEdgeIdsAfterMove = (
    previousEdges: Edge[],
    nextEdges: Edge[],
    movedNodeIds: Iterable<string>,
    extraEdgeIds: Iterable<string> = []
  ) => {
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const dirty = edgeReferenceDiffIds(previousEdges, nextEdges);
    for (const edge of previousEdges) {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        dirty.add(edge.id);
      }
    }
    for (const edgeId of extraEdgeIds) {
      dirty.add(edgeId);
    }
    return dirty;
  };
  const dirtyEdgeIdsForMovedLocalRoutes = (
    selectedEdgeIds: Iterable<string> = [],
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
    const dirty = new Set<string>(Object.keys(originalRoutePoints));
    for (const edgeId of selectedEdgeIds) {
      dirty.add(edgeId);
    }
    return dirty;
  };
  const buildMovedNodeUpdates = appExtractedHandlersC.createBuildMovedNodeUpdates(appRuntimeCtx);
  const nextNodesForMovedGraphCommit = (
    store: GraphStore,
    movedNodeUpdates: ModelNode[],
    movedNodeIds: Iterable<string>
  ) => {
    const uniqueMovedNodeIds = reuseSetOrCreate(movedNodeIds);
    return uniqueMovedNodeIds.size > 0 && movedNodeUpdates.length < store.nodes.length ? movedNodeUpdates : overlayGraphStoreNodes(store, movedNodeUpdates);
  };
  const edgePatchFromCandidateEdges = (previousCandidateEdges: Edge[], nextCandidateEdges: Edge[]) => {
    if (edgeListsHaveSameOrder(previousCandidateEdges, nextCandidateEdges)) {
      const edgeUpserts: Edge[] = [];
      for (let index = 0; index < previousCandidateEdges.length; index += 1) {
        if (previousCandidateEdges[index] !== nextCandidateEdges[index]) {
          edgeUpserts.push(nextCandidateEdges[index]);
        }
      }
      return { edgeUpserts, edgeDeleteIds: [] };
    }
    const previousById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    const nextIds = new Set(nextCandidateEdges.map((edge) => edge.id));
    const edgeUpserts = nextCandidateEdges.filter((edge) => previousById.get(edge.id) !== edge);
    const edgeDeleteIds = previousCandidateEdges
      .filter((edge) => !nextIds.has(edge.id))
      .map((edge) => edge.id);
    return { edgeUpserts, edgeDeleteIds };
  };
  const graphStorePatchStillCurrent = appExtractedHandlersB.createGraphStorePatchStillCurrent(appRuntimeCtx);
  const shouldRunSynchronousMoveBlockerRepair = (
    movedNodeIds: string[],
    previousCandidateEdges: Edge[],
    nextCandidateEdges: Edge[]
  ) => {
    if (movedNodeIds.length === 0) {
      return false;
    }
    if (movedNodeIds.length !== 1 || previousCandidateEdges.length <= MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES) {
      return true;
    }
    const previousById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    return nextCandidateEdges.some((edge) => previousById.get(edge.id) !== edge);
  };
  const markGraphDirtyForInteractiveCommit = () => {
    suppressNextGraphDirtyRef.current = true;
    setHasUnsavedChanges(true);
    setRouteRenderingReady(true);
  };
  const patchSingleTerminalAnchorFromPoint = appExtractedHandlersA.createPatchSingleTerminalAnchorFromPoint(appRuntimeCtx);
  const rebuildEdgeUpdatesAfterNodeGeometryChange = appExtractedHandlersC.createRebuildEdgeUpdatesAfterNodeGeometryChange(appRuntimeCtx);
  const rebuildEdgesAfterNodeGeometryChange = appExtractedHandlersB.createRebuildEdgesAfterNodeGeometryChange(appRuntimeCtx);
  const selectedRoutedEdge = selectedEdge ? routedEdgeById.get(selectedEdge.id) : undefined;
  const routableLineEndpointHandles = useMemo(() => {
    if (!isEditMode) {
      return [];
    }
    return activeSelectedNodeIds.flatMap((nodeId) => {
      const node = visibleNodeById.get(nodeId);
      if (!node || !activeLayerNodeIdSet.has(node.id) || !isRoutableLineDeviceKind(node.kind)) {
        return [];
      }
      const points = routableLineDeviceCanvasPoints(node);
      const start = points[0];
      const end = points[points.length - 1];
      if (!start || !end) {
        return [];
      }
      const sourcePoint =
        routableLineEndpointDrag?.nodeId === node.id && routableLineEndpointDrag.endpoint === "source"
          ? routableLineEndpointDrag.previewPoint
          : start;
      const targetPoint =
        routableLineEndpointDrag?.nodeId === node.id && routableLineEndpointDrag.endpoint === "target"
          ? routableLineEndpointDrag.previewPoint
          : end;
      return [
        { node, endpoint: "source" as const, point: sourcePoint },
        { node, endpoint: "target" as const, point: targetPoint }
      ];
    });
  }, [activeLayerNodeIdSet, activeSelectedNodeIds, isEditMode, routableLineEndpointDrag, visibleNodeById]);
  const rewiringPreviewRoute = useMemo(() => {
    if (!rewiring) {
      return null;
    }
    const edge = edgeById.get(rewiring.edgeId);
    if (!edge) {
      return null;
    }
    const sourceNode = nodeById.get(edge.sourceId);
    const targetNode = nodeById.get(edge.targetId);
    if (!sourceNode || !targetNode) {
      return null;
    }
    const slidePatch = resolveStraightBusSlideEndpointToPoint({
      edge,
      sourceNode,
      targetNode,
      movingEndpoint: rewiring.endpoint,
      movingPoint: rewiring.previewPoint,
      nodes
    });
    const previewEdge = slidePatch ? { ...edge, ...slidePatch } : edge;
    const movingTarget = rewiring.dropTarget;
    const previewRouteEdge: Edge = {
      ...previewEdge,
      sourceId:
        rewiring.endpoint === "source"
          ? movingTarget?.node.id ?? "floating-rewire-source"
          : edge.sourceId,
      targetId:
        rewiring.endpoint === "target"
          ? movingTarget?.node.id ?? "floating-rewire-target"
          : edge.targetId,
      sourceTerminalId:
        rewiring.endpoint === "source"
          ? movingTarget?.terminalId ?? "t1"
          : previewEdge.sourceTerminalId,
      targetTerminalId:
        rewiring.endpoint === "target"
          ? movingTarget?.terminalId ?? "t1"
          : previewEdge.targetTerminalId,
      sourcePoint:
        rewiring.endpoint === "source"
          ? movingTarget && isBusNode(movingTarget.node)
            ? movingTarget.point
            : rewiring.previewPoint
          : previewEdge.sourcePoint,
      targetPoint:
        rewiring.endpoint === "target"
          ? movingTarget && isBusNode(movingTarget.node)
            ? movingTarget.point
            : rewiring.previewPoint
          : previewEdge.targetPoint
    };
    const previewNodes = compactPreviewNodes(
      rewiring.endpoint === "source" ? movingTarget?.node : sourceNode,
      rewiring.endpoint === "target" ? movingTarget?.node : targetNode
    );
    const route = routeEdgesForStoredRendering(previewNodes, [previewRouteEdge], canvasBounds)[0];
    return {
      edgeId: edge.id,
      path: route?.path ?? ""
    };
  }, [canvasBounds, edgeById, nodeById, rewiring]);
  const routableLineEndpointDragPreviewRoute = useMemo(() => {
    if (!routableLineEndpointDrag) {
      return null;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    if (!lineNode || !isRoutableLineDeviceKind(lineNode.kind)) {
      return null;
    }
    const points = routableLineDeviceCanvasPoints(lineNode);
    const currentStart = points[0];
    const currentEnd = points[points.length - 1];
    if (!currentStart || !currentEnd) {
      return null;
    }
    const nextStart = routableLineEndpointDrag.endpoint === "source" ? routableLineEndpointDrag.previewPoint : currentStart;
    const nextEnd = routableLineEndpointDrag.endpoint === "target" ? routableLineEndpointDrag.previewPoint : currentEnd;
    const refs = routableLineDeviceEndpointRefs(lineNode);
    const movingTarget = routableLineEndpointDrag.dropTarget;
    const movingRef = movingTarget ? routableLineDeviceEndpointRefForNode(movingTarget.node, movingTarget.terminalId, movingTarget.point) : undefined;
    const previewRefs = {
      source: routableLineEndpointDrag.endpoint === "source" ? movingRef : refs.source,
      target: routableLineEndpointDrag.endpoint === "target" ? movingRef : refs.target
    };
    const rawLine = setRoutableLineDeviceEndpoints(lineNode, nextStart, nextEnd, previewRefs);
    const nextNodesForRouting = nodes.map((node) => (node.id === rawLine.id ? rawLine : node));
    const routedLine = routeRoutableLineDevice(rawLine, nextNodesForRouting, canvasBounds);
    const routePoints = routableLineDeviceCanvasPoints(routedLine);
    return {
      nodeId: lineNode.id,
      path: pointsToPreviewPath(routePoints)
    };
  }, [canvasBounds, nodeById, nodes, routableLineEndpointDrag]);
  const manualPathPreviewRoute = useMemo(() => {
    if (!manualPathDrag?.previewRoutePoints?.length) {
      return null;
    }
    return {
      edgeId: manualPathDrag.edgeId,
      points: manualPathDrag.previewRoutePoints,
      path: pointsToPreviewPath(manualPathDrag.previewRoutePoints)
    };
  }, [manualPathDrag]);
  const terminalPressPreviewEdgeRoutes = useMemo(() => {
    if (!terminalPress?.moved) {
      return [];
    }
    const connectedEdges = visibleEdgesByTerminalRef.get(`${terminalPress.nodeId}:${terminalPress.terminalId}`) ?? [];
    return connectedEdges.flatMap((edge) => {
      const sourceAffected = edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId;
      const targetAffected = edge.targetId === terminalPress.nodeId && edge.targetTerminalId === terminalPress.terminalId;
      if (!sourceAffected && !targetAffected) {
        return [];
      }
      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) {
        return [];
      }
      const slidePatch = resolveStraightBusSlideEndpoint({
        edge,
        sourceNode,
        targetNode,
        nextSourceNode: sourceNode,
        nextTargetNode: targetNode,
        movingEndpoint: sourceAffected ? "source" : "target",
        nodes: visibleNodes,
        originalMovingPoint: terminalPress.startPoint
      });
      const previewEdge = slidePatch ? { ...edge, ...slidePatch } : edge;
      const previewNodes = compactPreviewNodes(sourceNode, targetNode);
      const route = routeEdgesForStoredRendering(previewNodes, [previewEdge], canvasBounds)[0];
      return route ? [{
        edgeId: edge.id,
        path: route.path
      }] : [];
    });
  }, [canvasBounds, nodeById, terminalPress, visibleEdgesByTerminalRef, visibleNodes]);
  const terminalPressPreviewEdgeIdSet = useMemo(
    () => new Set(terminalPressPreviewEdgeRoutes.map((route) => route.edgeId)),
    [terminalPressPreviewEdgeRoutes]
  );
  const draggingCommitDelta = dragging?.currentDelta;
  const draggingDelta = dragging?.previewDelta ?? draggingCommitDelta;
  const multiNodeDragging = Boolean(dragging && isMultiNodeMoveState(dragging));
  const singleNodeDragging = Boolean(dragging && !isMultiNodeMoveState(dragging));
  const dragAffectedEdgeIdSet = useMemo(
    () => new Set((dragging?.affectedEdges ?? []).map((edge) => edge.id)),
    [dragging?.affectedEdges]
  );
  const dragOverlayEdgeIdSet = useMemo(
    () => new Set((dragging?.overlayPreview?.edgeRoutes ?? []).map((route) => route.edgeId)),
    [dragging?.overlayPreview]
  );
  const dragPreviewMovedNodeById = useMemo(() => {
    const preview = new Map<string, ModelNode>();
    if (!dragging || !draggingDelta) {
      return preview;
    }
    for (const nodeId of dragging.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragging.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      preview.set(nodeId, {
        ...node,
        position: {
          x: originalPosition.x + draggingDelta.x,
          y: originalPosition.y + draggingDelta.y
        }
      });
    }
    return preview;
  }, [dragging, draggingDelta, nodeById]);
  const dragPreviewNodeFor = (nodeId: string) => dragPreviewMovedNodeById.get(nodeId) ?? nodeById.get(nodeId);
  const dragInteractionBounds = useMemo<RenderViewportBounds | null>(() => {
    if (!dragging || !draggingDelta || isMultiNodeMoveState(dragging)) {
      return null;
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const draggedEdgeIds = new Set(dragging.edgeIds);
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
    const includePoint = (point: Point) => {
      includeBox({ left: point.x, right: point.x, top: point.y, bottom: point.y });
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
    for (const nodeId of dragging.nodeIds) {
      includeNode(nodeById.get(nodeId));
      includeNode(dragPreviewMovedNodeById.get(nodeId));
    }
    for (const edge of dragging.affectedEdges) {
      includeNode(dragPreviewMovedNodeById.get(edge.sourceId) ?? nodeById.get(edge.sourceId));
      includeNode(dragPreviewMovedNodeById.get(edge.targetId) ?? nodeById.get(edge.targetId));
      const originalRoute = dragging.originalRoutePoints[edge.id];
      if (originalRoute?.length) {
        const shiftWholeRoute = draggedEdgeIds.has(edge.id);
        for (const point of originalRoute) {
          includePoint(point);
          if (shiftWholeRoute) {
            includePoint({ x: point.x + draggingDelta.x, y: point.y + draggingDelta.y });
          }
        }
      }
      const originalEdgePoints = dragging.originalEdgePoints[edge.id];
      if (originalEdgePoints?.sourcePoint) {
        includePoint(originalEdgePoints.sourcePoint);
        if (draggingNodeIdSet.has(edge.sourceId)) {
          includePoint({ x: originalEdgePoints.sourcePoint.x + draggingDelta.x, y: originalEdgePoints.sourcePoint.y + draggingDelta.y });
        }
      }
      if (originalEdgePoints?.targetPoint) {
        includePoint(originalEdgePoints.targetPoint);
        if (draggingNodeIdSet.has(edge.targetId)) {
          includePoint({ x: originalEdgePoints.targetPoint.x + draggingDelta.x, y: originalEdgePoints.targetPoint.y + draggingDelta.y });
        }
      }
    }
    if (!bounds) {
      return null;
    }
    const finalBounds = bounds as RenderViewportBounds;
    return {
      left: finalBounds.left - padding,
      right: finalBounds.right + padding,
      top: finalBounds.top - padding,
      bottom: finalBounds.bottom + padding
    };
  }, [dragPreviewMovedNodeById, dragging, draggingDelta, draggingNodeIdSet, nodeById]);
  const candidateNodeIntersectsInteractionBounds = (node: ModelNode) =>
    !dragInteractionBounds || nodeIntersectsRenderViewport(node, dragInteractionBounds);
  const dragInteractionNodes = useMemo(() => {
    if (isMultiNodeMoveState(dragging)) {
      return [];
    }
    if (!dragging || !draggingDelta || !dragInteractionBounds) {
      return visibleNodes;
    }
    const requiredNodeIds = new Set<string>(dragging.nodeIds);
    for (const edge of dragging.affectedEdges) {
      requiredNodeIds.add(edge.sourceId);
      requiredNodeIds.add(edge.targetId);
    }
    const candidatesById = new Map<string, ModelNode>();
    for (const nodeId of requiredNodeIds) {
      if (!visibleNodeIdSet.has(nodeId)) {
        continue;
      }
      const movedNode = dragPreviewMovedNodeById.get(nodeId);
      const node = movedNode ?? nodeById.get(nodeId);
      if (node) {
        candidatesById.set(node.id, node);
      }
    }
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, dragInteractionBounds)) {
      const movedNode = dragPreviewMovedNodeById.get(node.id);
      const candidateNode = movedNode ?? node;
      if (candidateNodeIntersectsInteractionBounds(candidateNode)) {
        candidatesById.set(candidateNode.id, candidateNode);
      }
    }
    return Array.from(candidatesById.values());
  }, [dragInteractionBounds, dragPreviewMovedNodeById, dragging, draggingDelta, nodeById, visibleNodeIdSet, visibleNodeSpatialIndex, visibleNodes]);
  const suppressDragTerminalInteraction = Boolean(dragging && draggingDelta && isMultiNodeMoveState(dragging));
  const staticTerminalOverlapDeferred =
    isEditMode &&
    !dragging &&
    !connectSource &&
    !routableLinePlacement &&
    !routableLineEndpointDrag &&
    !terminalPress?.moved &&
    viewportNodes.length > TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD;
  const staticTerminalOverlapSourceKey = staticTerminalOverlapDeferred
    ? `${viewportBoundsCacheKey(deferredViewportQueryBounds)}:${elementTreeLayerSignature}:${graphStore.routeGeometryRevision}:${graphStore.edgeEndpointRevision}:${viewportNodes.length}`
    : "";
  const staticTerminalOverlapReady =
    !staticTerminalOverlapDeferred || staticTerminalOverlapReadyKey === staticTerminalOverlapSourceKey;
  useEffect(() => {
    if (!staticTerminalOverlapDeferred) {
      setStaticTerminalOverlapReadyKey("");
      return;
    }
    setStaticTerminalOverlapReadyKey((current) => (current === staticTerminalOverlapSourceKey ? current : ""));
    return scheduleIdleWork(() => setStaticTerminalOverlapReadyKey(staticTerminalOverlapSourceKey), 120, 1500);
  }, [staticTerminalOverlapDeferred, staticTerminalOverlapSourceKey]);
  const terminalOverlapCalculationReady =
    Boolean(dragging && draggingDelta && !suppressDragTerminalInteraction) || staticTerminalOverlapReady;
  const terminalOverlapNodes =
    dragging && draggingDelta && !suppressDragTerminalInteraction
      ? dragInteractionNodes
      : terminalOverlapCalculationReady
        ? viewportNodes
        : [];
  const terminalOverlapAffectedNodeIds = dragging && draggingDelta && !suppressDragTerminalInteraction ? draggingNodeIdSet : undefined;
  const overlappedTerminalKeys = useMemo(
    () => {
      if (isReadonlyCanvasMode) {
        return new Set<string>();
      }
      if (suppressDragTerminalInteraction) {
        return new Set<string>();
      }
      if (!terminalOverlapCalculationReady) {
        return new Set<string>();
      }
      return new Set(
        [
          ...getOverlappingTerminalGroups(terminalOverlapNodes, terminalOverlapAffectedNodeIds).flatMap((group) =>
            group.terminals.map((terminal) => `${terminal.nodeId}:${terminal.terminalId}`)
          ),
          ...getTerminalBusContactGroups(terminalOverlapNodes, 0, terminalOverlapAffectedNodeIds).flatMap((group) =>
            group.contacts.map((contact) => `${contact.nodeId}:${contact.terminalId}`)
          )
        ]
      );
    },
    [isReadonlyCanvasMode, suppressDragTerminalInteraction, terminalOverlapAffectedNodeIds, terminalOverlapCalculationReady, terminalOverlapNodes]
  );
  const nodeTerminalSnapTarget = useMemo(
    () => (
      !isReadonlyCanvasMode && dragging && draggingDelta && !isMultiNodeMoveState(dragging)
        ? findNodeTerminalSnapTarget(dragInteractionNodes, draggingNodeIdSet) ??
          findNodeBusSnapTarget(dragInteractionNodes, draggingNodeIdSet)
        : null
    ),
    [dragInteractionNodes, dragging, draggingDelta, draggingNodeIdSet, isReadonlyCanvasMode]
  );
  if (!imperativeSingleNodeDragActiveRef.current) {
    nodeTerminalSnapTargetRef.current = nodeTerminalSnapTarget;
  }
  const nodeTerminalSnapHintStyle = useMemo(() => {
    if (!nodeTerminalSnapTarget) {
      return undefined;
    }
    const targetNode = dragPreviewNodeFor(nodeTerminalSnapTarget.targetNodeId);
    const terminalType = targetNode && isBusNode(targetNode)
      ? getBusTerminalType(targetNode)
      : targetNode?.terminals.find((terminal) => terminal.id === nodeTerminalSnapTarget.targetTerminalId)?.type;
    return terminalType ? ({ "--connection-color": terminalColor(terminalType, colorPalette) } as CSSProperties) : undefined;
  }, [colorPalette, dragPreviewMovedNodeById, nodeById, nodeTerminalSnapTarget]);
  const activeDropHintPoint =
    routableLineEndpointDrag?.dropTargetPoint ??
    routableLinePreview.targetPoint ??
    rewiring?.dropTargetPoint ??
    nodeTerminalSnapTarget?.point ??
    null;
  const activeDropReady =
    connectDropReady ||
    Boolean(routableLinePreview.targetPoint) ||
    Boolean(routableLineEndpointDrag?.dropTargetPoint) ||
    Boolean(rewiring?.dropTargetPoint) ||
    Boolean(nodeTerminalSnapTarget);
  const connectSourceNode = isEditMode && connectSource ? visibleNodeById.get(connectSource.nodeId) : undefined;
  const connectTerminalCompatibilityActive = isEditMode && mode === "connect" && Boolean(connectSourceNode);
  const routableLineActiveTerminalType =
    routableLinePlacement
      ? routableLineTemplateTerminalType(routableLinePlacement.template)
      : routableLineEndpointDrag
        ? nodeById.get(routableLineEndpointDrag.nodeId)?.terminals[routableLineEndpointDrag.endpoint === "source" ? 0 : 1]?.type ??
          nodeById.get(routableLineEndpointDrag.nodeId)?.terminals[0]?.type
        : undefined;
  const routableLineTerminalCompatibilityActive = isEditMode && Boolean(routableLinePlacement || routableLineEndpointDrag);
  const drawingModeActive = Boolean(libraryPlacement || staticDrawing || connectSource || routableLinePlacement);
  const activeDropHintStyle = rewiring?.dropTargetPoint
    ? connectionLineStyle(rewiring.edgeId)
    : routableLinePlacementColor || routableLineEndpointDragColor
      ? ({ "--connection-color": routableLinePlacementColor || routableLineEndpointDragColor } as CSSProperties)
      : nodeTerminalSnapHintStyle;
  useEffect(() => {
    document.body.classList.toggle("canvas-drawing-mode", drawingModeActive);
    document.body.classList.toggle("canvas-connect-drop-ready", drawingModeActive && activeDropReady);
    return () => {
      document.body.classList.remove("canvas-drawing-mode");
      document.body.classList.remove("canvas-connect-drop-ready");
    };
  }, [activeDropReady, drawingModeActive]);
  const groupTransformPreviewTransform = useMemo(
    () => transformDrag && isGroupTransformDrag(transformDrag) ? groupTransformSvgTransform(transformDrag, transformDrag.previewPoint) : "",
    [transformDrag]
  );
  const groupTransformPreviewGroupId =
    transformDrag && isGroupTransformDrag(transformDrag) && groupTransformPreviewTransform
      ? `group:${transformDrag.groupId}`
      : "";
  const groupTransformPreviewNodeIdSet = useMemo(
    () => new Set(transformDrag && isGroupTransformDrag(transformDrag) && groupTransformPreviewTransform ? transformDrag.nodeIds : []),
    [groupTransformPreviewTransform, transformDrag]
  );
  const groupTransformPreviewEdgeRoutes = useMemo(() => {
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !transformDrag.previewPoint) {
      return [];
    }
    const geometry = groupTransformGeometry(transformDrag, transformDrag.previewPoint);
    return transformDrag.originalEdgeRoutes.flatMap((route) => {
      if (!visibleEdgeIdSet.has(route.edgeId)) {
        return [];
      }
      const points = route.points.map((routePoint) => transformGroupPoint(transformDrag, geometry, routePoint));
      return [{
        edgeId: route.edgeId,
        path: pointsToPreviewPath(points)
      }];
    });
  }, [transformDrag, visibleEdgeIdSet]);
  const groupTransformPreviewEdgeIdSet = useMemo(
    () => new Set(groupTransformPreviewEdgeRoutes.map((route) => route.edgeId)),
    [groupTransformPreviewEdgeRoutes]
  );
  const dragPreviewEdgeRoutes = useMemo(() => {
    if (!dragging || !draggingDelta) {
      return [];
    }
    const previewEdges = isMultiNodeMoveState(dragging)
      ? dragging.overlayPreview?.dynamicEdgePreviewEdges ?? []
      : singleNodeDragPreviewEdges(dragging, draggingDelta);
    return buildLightweightNodeDragPreviewRoutes(dragging, draggingDelta, previewEdges);
  }, [colorDisplayMode, colorPalette, dragging, draggingDelta, nodeById, visibleEdgeIdSet]);
  const dragPreviewEdgeIdSet = useMemo(
    () => new Set(dragPreviewEdgeRoutes.map((route) => route.edgeId)),
    [dragPreviewEdgeRoutes]
  );
  const dragGhostEdgeRoutes = useMemo(() => {
    if (!dragging || (!draggingDelta && !isMultiNodeMoveState(dragging))) {
      return [];
    }
    if (isMultiNodeMoveState(dragging)) {
      return dragging.overlayPreview?.edgeRoutes ?? [];
    }
    const draggedEdgeIds = new Set(dragging.edgeIds);
    return dragging.affectedEdges.flatMap((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return [];
      }
      if (!draggingNodeIdSet.has(edge.sourceId) && !draggingNodeIdSet.has(edge.targetId) && !draggedEdgeIds.has(edge.id)) {
        return [];
      }
      const points = dragging.originalRoutePoints[edge.id];
      return points?.length ? [{ edgeId: edge.id, path: pointsToPreviewPath(points) }] : [];
    });
  }, [dragging, draggingDelta, draggingNodeIdSet, visibleEdgeIdSet]);

  useEffect(() => {
    if (selectedContainerParameterViews.length === 0) {
      if (containerParamViewId !== "container") {
        setContainerParamViewId("container");
      }
      return;
    }
    if (!selectedContainerParameterViews.some((view) => view.id === containerParamViewId)) {
      setContainerParamViewId(selectedContainerParameterViews[0].id);
    }
  }, [containerParamViewId, selectedContainerParameterViews]);

  useEffect(() => {
    fetchBackendColorConfig()
      .then((backendColorConfig) => {
        backendColorConfigLoadedRef.current = true;
        if (backendColorConfig.exists) {
          const backendPayload = serializeColorConfigForStorage(backendColorConfig.colorDisplayMode, backendColorConfig.colorPalette);
          lastPersistedColorConfigPayloadRef.current = backendPayload;
          suppressNextBackendColorSyncRef.current = true;
          setColorDisplayMode(backendColorConfig.colorDisplayMode);
          setColorPalette(backendColorConfig.colorPalette);
          setColorPaletteDraft(backendColorConfig.colorPalette);
          setColorPaletteTab(backendColorConfig.colorDisplayMode);
          return;
        }
        const localPayload = serializeColorConfigForStorage(colorDisplayMode, colorPalette);
        lastPersistedColorConfigPayloadRef.current = localPayload;
        void saveBackendColorConfigPayload(localPayload).catch(() => {
          // 后台暂不可写时仍保留浏览器本地配色缓存。
        });
      })
      .catch(() => {
        backendColorConfigLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地配色缓存。
      });
    // 仅在启动时从后台拉取一次，避免后台配置刷新打断当前操作。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBackendDeviceLibrary()
      .then((backendDeviceLibrary) => {
        backendDeviceLibraryLoadedRef.current = true;
        if (backendDeviceLibrary.exists) {
          const backendPayload = serializeDeviceLibraryForStorage(backendDeviceLibrary);
          lastPersistedDeviceLibraryPayloadRef.current = backendPayload;
          suppressNextBackendDeviceLibrarySyncRef.current = true;
          setCustomDeviceTemplates(backendDeviceLibrary.customDeviceTemplates);
          setCustomAttributeLibraries(backendDeviceLibrary.customAttributeLibraries);
          setCustomComponentTypes(backendDeviceLibrary.customComponentTypes);
          setDeviceDefinitionOverrides(backendDeviceLibrary.deviceDefinitionOverrides);
          setCustomGraphTemplateTypes(backendDeviceLibrary.customGraphTemplateTypes);
          setCustomGraphTemplates(backendDeviceLibrary.customGraphTemplates);
          return;
        }
        const localPayload = serializeDeviceLibraryForStorage({
          customDeviceTemplates,
          customAttributeLibraries,
          customComponentTypes,
          deviceDefinitionOverrides,
          customGraphTemplateTypes,
          customGraphTemplates
        });
        lastPersistedDeviceLibraryPayloadRef.current = localPayload;
        void saveBackendDeviceLibraryPayload(localPayload).catch(() => {
          // 后台暂不可写时仍保留浏览器本地图元库缓存。
        });
      })
      .catch(() => {
        backendDeviceLibraryLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地图元库缓存。
      });
    // 仅在启动时从后台拉取一次，避免后台定义刷新打断当前编辑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedDeviceLibrary = normalizeDeviceLibraryPersistencePayload({
        customDeviceTemplates,
        customAttributeLibraries,
        customComponentTypes,
        deviceDefinitionOverrides,
        customGraphTemplateTypes,
        customGraphTemplates
      });
      const normalizedDeviceLibraryPayload = JSON.stringify(normalizedDeviceLibrary);
      writeLocalDeviceLibraryPersistencePayload(normalizedDeviceLibrary);
      if (normalizedDeviceLibraryPayload === lastPersistedDeviceLibraryPayloadRef.current) {
        if (suppressNextBackendDeviceLibrarySyncRef.current) {
          suppressNextBackendDeviceLibrarySyncRef.current = false;
        }
        return;
      }
      lastPersistedDeviceLibraryPayloadRef.current = normalizedDeviceLibraryPayload;
      if (!backendDeviceLibraryLoadedRef.current) {
        return;
      }
      if (suppressNextBackendDeviceLibrarySyncRef.current) {
        suppressNextBackendDeviceLibrarySyncRef.current = false;
        return;
      }
      void saveBackendDeviceLibraryPayload(normalizedDeviceLibraryPayload).catch(() => {
        // 后台保存失败时不阻塞本地编辑；下一次图元库变更会继续尝试同步。
      });
    }, 800);
    return () => window.clearTimeout(timeoutId);
  }, [customDeviceTemplates, customAttributeLibraries, customComponentTypes, deviceDefinitionOverrides, customGraphTemplateTypes, customGraphTemplates]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedPalette = normalizeColorPalette(colorPalette);
      const normalizedColorConfigPayload = serializeColorConfigForStorage(colorDisplayMode, normalizedPalette);
      try {
        window.localStorage.setItem(COLOR_DISPLAY_MODE_STORAGE_KEY, colorDisplayMode);
        window.localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, JSON.stringify(normalizedPalette));
      } catch {
        // 浏览器缓存不可写时不阻断当前编辑，后台同步仍会继续尝试。
      }
      if (normalizedColorConfigPayload === lastPersistedColorConfigPayloadRef.current) {
        if (suppressNextBackendColorSyncRef.current) {
          suppressNextBackendColorSyncRef.current = false;
        }
        return;
      }
      lastPersistedColorConfigPayloadRef.current = normalizedColorConfigPayload;
      if (!backendColorConfigLoadedRef.current) {
        return;
      }
      if (suppressNextBackendColorSyncRef.current) {
        suppressNextBackendColorSyncRef.current = false;
        return;
      }
      void saveBackendColorConfigPayload(normalizedColorConfigPayload).catch(() => {
        // 后台保存失败时不阻塞本地编辑；下一次配色变更会继续尝试同步。
      });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [colorDisplayMode, colorPalette]);

  const refreshImageFolders = () =>
    fetchBackendImageFolders()
      .then((folders) => {
        setImageFolders(folders.length > 0 ? folders : [{ id: "root", name: "默认文件夹", imageCount: 0 }]);
      })
      .catch(() => {
        // 后端不可用时保留当前文件夹状态。
      });

  const refreshImagesForFolder = (folderId = activeImageFolderId) =>
    fetchBackendImages(folderId)
      .then((assets) => {
        setImageAssetList(assets);
        setImageAssets((current) => ({ ...current, ...imageAssetsToMap(assets) }));
      })
      .catch(() => {
        // 后端不可用时保留浏览器本地图片，避免影响画布编辑。
      });

  useEffect(() => {
    if (!imageTarget) {
      return;
    }
    if (!imageLibraryInitializedRef.current) {
      imageLibraryInitializedRef.current = true;
      const localAssets = localImageAssetsFromStorage();
      if (localAssets.length > 0) {
        setImageAssetList(localAssets);
        setImageAssets((current) => ({ ...imageAssetsToMap(localAssets), ...current }));
      }
      void refreshImageFolders();
    }
    void refreshImagesForFolder(activeImageFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageFolderId, imageTarget]);

  useEffect(() => {
    const preventPageWheelZoom = (event: WheelEvent) => {
      if (isCanvasWheelZoomExcludedTarget(event.target)) {
        return;
      }
      const cursorInsideCanvas = clientPointInsideRenderedCanvas(event.clientX, event.clientY);
      if (cursorInsideCanvas && shouldZoomCanvasFromWheelEvent(event)) {
        zoomCanvasFromWheelEvent(event);
      }
    };
    window.addEventListener("wheel", preventPageWheelZoom, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", preventPageWheelZoom, { capture: true });
  }, []);

  useEffect(() => {
    const closeContextMenus = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest(".context-menu")) {
        return;
      }
      setContextMenu(null);
      setProjectMenu(null);
    };
    window.addEventListener("pointerdown", closeContextMenus, { capture: true });
    return () => window.removeEventListener("pointerdown", closeContextMenus, { capture: true });
  }, []);

  useEffect(() => {
    if (!contextMenu || contextMenu.target !== "blank") {
      return;
    }
    const closeBlankContextMenuIfPointerLeaves = (event: globalThis.PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".context-menu")) {
        return;
      }
      const menu = document.querySelector<HTMLElement>("[data-canvas-context-menu='true']");
      if (!menu) {
        setContextMenu(null);
        return;
      }
      const rect = menu.getBoundingClientRect();
      const withinMenuSafeZone =
        event.clientX >= rect.left - CONTEXT_MENU_AUTO_HIDE_MARGIN &&
        event.clientX <= rect.right + CONTEXT_MENU_AUTO_HIDE_MARGIN &&
        event.clientY >= rect.top - CONTEXT_MENU_AUTO_HIDE_MARGIN &&
        event.clientY <= rect.bottom + CONTEXT_MENU_AUTO_HIDE_MARGIN;
      if (!withinMenuSafeZone) {
        setContextMenu(null);
      }
    };
    const closeBlankContextMenuOnCanvasMotion = () => setContextMenu(null);
    const closeBlankContextMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("pointermove", closeBlankContextMenuIfPointerLeaves);
    window.addEventListener("wheel", closeBlankContextMenuOnCanvasMotion, { capture: true });
    window.addEventListener("keydown", closeBlankContextMenuOnEscape);
    return () => {
      window.removeEventListener("pointermove", closeBlankContextMenuIfPointerLeaves);
      window.removeEventListener("wheel", closeBlankContextMenuOnCanvasMotion, { capture: true });
      window.removeEventListener("keydown", closeBlankContextMenuOnEscape);
    };
  }, [contextMenu]);

  useEffect(() => {
    return () => {
      if (mouseStatusFrameRef.current !== null) {
        window.cancelAnimationFrame(mouseStatusFrameRef.current);
        mouseStatusFrameRef.current = null;
      }
      if (connectPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(connectPreviewFrameRef.current);
        connectPreviewFrameRef.current = null;
      }
      if (canvasVisibleViewBoxFrameRef.current !== null) {
        window.cancelAnimationFrame(canvasVisibleViewBoxFrameRef.current);
        canvasVisibleViewBoxFrameRef.current = null;
      }
      keyboardMoveCommitCancelRef.current?.();
      keyboardMoveCommitCancelRef.current = null;
      if (keyboardMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(keyboardMoveFrameRef.current);
        keyboardMoveFrameRef.current = null;
      }
      if (staticButtonFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(staticButtonFeedbackTimeoutRef.current);
        staticButtonFeedbackTimeoutRef.current = null;
      }
      keyboardMoveActiveKeyDeltasRef.current.clear();
      keyboardMoveLastFrameTimeRef.current = null;
      keyboardMoveFrameElapsedMsRef.current = 0;
      pendingKeyboardMoveDeltaRef.current = null;
    };
  }, []);

  const persistRefreshRecoveryNow = () => {
    if (!saveRequiredRef.current) {
      clearRefreshRecoveryProject();
      return;
    }
    const recoveryProjectSnapshot = refreshRecoveryProjectRef.current;
    if (!recoveryProjectSnapshot) {
      return;
    }
    const recoveryProject = {
      ...recoveryProjectSnapshot,
      savedAt: new Date().toISOString()
    };
    writeRefreshRecoveryProject(recoveryProject);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      persistRefreshRecoveryNow();
      if (!saveRequired) {
        return;
      }
      event.preventDefault();
      event.returnValue = "当前模型尚未保存，关闭网页会丢失未保存修改。";
      return event.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", persistRefreshRecoveryNow);
    window.addEventListener("vite:beforeFullReload", persistRefreshRecoveryNow);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", persistRefreshRecoveryNow);
      window.removeEventListener("vite:beforeFullReload", persistRefreshRecoveryNow);
    };
  }, [saveRequired]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      clearRefreshRecoveryProject();
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    connectDropReadyRef.current = connectDropReady;
  }, [connectDropReady]);

  useEffect(() => {
    if (!connectSource || !connectPreviewPointRef.current) {
      setConnectPreviewDom("", null);
      return;
    }
    setConnectPreviewDom(
      buildConnectPreviewPath(connectSource, connectPreviewPointRef.current, connectDropTargetPointRef.current, connectDropTargetRef.current),
      connectDropTargetPointRef.current
    );
  });

  useEffect(() => {
    if (imperativeMultiNodeDragActiveRef.current && !dragging) {
      updateSmartAlignmentGuides([]);
      return;
    }
    draggingRef.current = dragging;
    if (!dragging) {
      updateSmartAlignmentGuides([]);
      resetMultiNodeDragOverlayTransform();
      dragUndoCapturedRef.current = false;
    } else if (isMultiNodeMoveState(dragging)) {
      updateMultiNodeDragOverlayTransform(dragging.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
    }
  }, [dragging]);

  useEffect(() => () => {
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
    pendingNodeDragMoveRef.current = null;
  }, []);
  const cloneProjectState = appExtractedHandlersB.createCloneProjectState(appRuntimeCtx);

  const fullUndoGraphDirtyEdgeIds = (store: GraphStore, snapshot: UndoSnapshot) =>
    new Set([
      ...store.edges.map((edge) => edge.id),
      ...snapshot.edges.map((edge) => edge.id)
    ]);
  const undoGraphSnapshotPatchPlan = appExtractedHandlersC.createUndoGraphSnapshotPatchPlan(appRuntimeCtx);

  const applyUndoGraphSnapshot = (snapshot: UndoSnapshot) => {
    const currentStore = latestGraphStoreRef.current ?? graphStore;
    const plan = undoGraphSnapshotPatchPlan(currentStore, snapshot);
    markRouteEdgesDirty(plan.dirtyEdgeIds);
    markStoredRouteEdgesDirty(plan.dirtyEdgeIds);
    if (plan.mode === "full") {
      setGraphStore((current) => graphStoreSetGraph(current, snapshot.nodes, snapshot.edges));
      return;
    }
    setGraphStore((current) => {
      const currentPlan = undoGraphSnapshotPatchPlan(current, snapshot);
      return currentPlan.mode === "patch"
        ? graphStorePatchGraphFromArrays(current, snapshot.nodes, snapshot.edges, currentPlan.nodeIds, currentPlan.edgeIds)
        : graphStoreSetGraph(current, snapshot.nodes, snapshot.edges);
    });
  };

  const pushUndoSnapshot = (markDirty = true, deepModelSnapshot = false, graphPatchScope?: UndoGraphPatchScope) => {
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    const snapshot = cloneProjectState(deepModelSnapshot, graphPatchScope);
    setUndoStack((current) => [...current.slice(-49), snapshot]);
    if (markDirty) {
      setHasUnsavedChanges(true);
    }
  };

  const uniqueUndoScopeIds = (ids: Iterable<string | undefined>) => {
    const uniqueIds = new Set<string>();
    for (const id of ids) {
      if (id) {
        uniqueIds.add(id);
      }
    }
    return Array.from(uniqueIds);
  };

  const undoScopeForGraphPatch = (
    nodeIds: Iterable<string | undefined> = [],
    edgeIds: Iterable<string | undefined> = []
  ): UndoGraphPatchScope => ({
    nodeIds: uniqueUndoScopeIds(nodeIds),
    edgeIds: uniqueUndoScopeIds(edgeIds)
  });

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

  const pushNodeOnlyUndoSnapshot = (nodeId: string) => {
    pushUndoSnapshot(true, false, undoScopeForGraphPatch([nodeId], []));
  };

  const ensureDraggingUndoSnapshot = () => {
    if (dragUndoCapturedRef.current) {
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForDraggingState(draggingRef.current));
    dragUndoCapturedRef.current = true;
  };

  const requestCanvasFrameCenter = () => {
    setCanvasCenterRequest((current) => current + 1);
  };
  const undoLastOperation = appExtractedHandlersA.createUndoLastOperation(appRuntimeCtx);

  useEffect(() => {
    setViewBox((current) => normalizeViewBoxToCanvas(current, canvasBounds));
  }, [canvasBounds]);

  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      setCanvasFrameScrollPosition(
        frame,
        Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2),
        Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2)
      );
      scheduleCanvasVisibleViewBoxUpdate();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [canvasCenterRequest]);

  useEffect(() => {
    if (!projectPanelResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const deltaY = event.clientY - projectPanelResize.startY;
      setProjectPanelHeight(
        Math.min(PROJECT_PANEL_MAX_HEIGHT, Math.max(PROJECT_PANEL_MIN_HEIGHT, projectPanelResize.startHeight + deltaY))
      );
    };
    const handlePointerUp = () => {
      setProjectPanelResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [projectPanelResize]);

  useEffect(() => {
    if (!sidePanelResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const viewportMax = Math.max(SIDE_PANEL_MIN_WIDTH, Math.min(SIDE_PANEL_MAX_WIDTH, window.innerWidth - 96));
      const deltaX = event.clientX - sidePanelResize.startX;
      const nextWidth =
        sidePanelResize.side === "left"
          ? sidePanelResize.startWidth + deltaX
          : sidePanelResize.startWidth - deltaX;
      const clampedWidth = clampPanelDimension(nextWidth, SIDE_PANEL_MIN_WIDTH, viewportMax);
      if (sidePanelResize.side === "left") {
        setLeftPanelWidth(clampedWidth);
      } else {
        setRightPanelWidth(clampedWidth);
      }
    };
    const handlePointerUp = () => {
      setSidePanelResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [sidePanelResize]);

  useEffect(() => {
    if (!canvasResizeDrag) {
      return;
    }
    const commitCanvasResizeBounds = (draftBounds: CanvasBounds, originShift: Point = { x: 0, y: 0 }) => {
      const changed = draftBounds.width !== canvasWidth || draftBounds.height !== canvasHeight;
      const shifted = hasCanvasOriginShift(originShift);
      if ((changed || shifted) && !canvasResizeUndoCapturedRef.current) {
        pushUndoSnapshot();
        canvasResizeUndoCapturedRef.current = true;
      }
      if (shifted) {
        setGraphArrays(
          nodes.map((node) => translateNodeBy(node, originShift)),
          edges.map((edge) => translateEdgeBy(edge, originShift))
        );
        shiftCachedRoutesForCanvasOrigin(originShift);
      }
      applyCanvasBounds(draftBounds, originShift, { preserveScrollAnchor: false });
      canvasResizeDraftRef.current = null;
      setCanvasResizeDraft(null);
    };
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      const nextBounds = canvasResizeBoundsFromPointerDrag(canvasResizeDrag, event, canvasResizeDrag.minBounds);
      const clampedBounds = clampCanvasBounds(nextBounds);
      canvasResizeDraftRef.current = clampedBounds;
      flushSync(() => setCanvasResizeDraft(clampedBounds));
    };
    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const draftBounds = canvasResizeDraftRef.current;
      let resizeCommitAnchor: CanvasResizeCommitAnchor | null = null;
      if (draftBounds) {
        const nextCanvasNoScrollOffset = canvasNoScrollOffsetForCanvasResizeAnchor(canvasResizeDrag, draftBounds);
        const desiredSurfaceRect = canvasResizePreviewRectForDraft(canvasResizeDrag, draftBounds);
        const frameRect = canvasFrameRef.current?.getBoundingClientRect();
        resizeCommitAnchor = {
          edge: canvasResizeDrag.edge,
          desiredRect: {
            left: Math.round((frameRect?.left ?? 0) - canvasResizeDrag.startScrollLeft + desiredSurfaceRect.left),
            top: Math.round((frameRect?.top ?? 0) - canvasResizeDrag.startScrollTop + desiredSurfaceRect.top),
            width: desiredSurfaceRect.width,
            height: desiredSurfaceRect.height
          }
        };
        pendingCanvasResizeCommitAnchorRef.current = resizeCommitAnchor;
        const resizeOriginShift = canvasResizeOriginShiftForBounds(
          canvasResizeDrag.edge,
          { width: canvasResizeDrag.startWidth, height: canvasResizeDrag.startHeight },
          draftBounds
        );
        flushSync(() => {
          setCanvasNoScrollOffset((current) =>
            Math.round(current.x) === Math.round(nextCanvasNoScrollOffset.x) &&
            Math.round(current.y) === Math.round(nextCanvasNoScrollOffset.y)
              ? current
              : nextCanvasNoScrollOffset
          );
          commitCanvasResizeBounds(draftBounds, resizeOriginShift);
          setCanvasResizeDrag(null);
        });
        window.requestAnimationFrame(() => {
          if (!resizeCommitAnchor) {
            return;
          }
          syncCanvasFrameScrollToCanvasResizeCommitAnchor(resizeCommitAnchor);
          window.requestAnimationFrame(() => {
            if (resizeCommitAnchor) {
              syncCanvasFrameScrollToCanvasResizeCommitAnchor(resizeCommitAnchor);
              scheduleCanvasVisibleViewBoxUpdate();
            }
          });
        });
      }
      if (canvasResizeUndoCapturedRef.current) {
        const currentBounds = draftBounds ?? canvasBoundsRef.current;
        writeOperationLog(`调整画布尺寸为 ${currentBounds.width} x ${currentBounds.height}`);
      }
      canvasResizeUndoCapturedRef.current = false;
      canvasResizeDraftRef.current = null;
      if (!draftBounds) {
        setCanvasResizeDraft(null);
        setCanvasResizeDrag(null);
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [canvasResizeDrag, canvasHeight, canvasWidth, edges, nodes, routedEdges]);

  useEffect(() => {
    if (!statusbarResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const deltaY = statusbarResize.startY - event.clientY;
      setStatusbarHeight(clampPanelDimension(statusbarResize.startHeight + deltaY, STATUSBAR_MIN_HEIGHT, STATUSBAR_MAX_HEIGHT));
    };
    const handlePointerUp = () => {
      setStatusbarResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [statusbarResize]);

  useEffect(() => {
    if (!validationPanelResize) {
      return;
    }
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const deltaY = event.clientY - validationPanelResize.startY;
      const viewportMax = Math.max(VALIDATION_PANEL_MIN_HEIGHT, Math.min(VALIDATION_PANEL_MAX_HEIGHT, window.innerHeight - 240));
      setValidationPanelHeight(
        clampPanelDimension(validationPanelResize.startHeight - deltaY, VALIDATION_PANEL_MIN_HEIGHT, viewportMax)
      );
    };
    const handlePointerUp = () => {
      setValidationPanelResize(null);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [validationPanelResize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGlobalSaveShortcut(event)) {
        event.preventDefault();
        if (!isEditMode) {
          writeOperationLog("浏览模式下不能保存，请先切换到编辑模式");
        } else if (saveRequired) {
          saveCurrentProject();
        }
        return;
      }
      const target = event.target as HTMLElement | null;
      const shortcutScope = resolveKeyboardShortcutScope({
        isCanvasTarget: Boolean(target?.closest(".diagram-canvas")),
        isCanvasInteractionActive: canvasInteractionRef.current,
        isProjectListPointerInside: projectListPointerInsideRef.current
      });
      const isCanvasShortcutTarget = shortcutScope === "canvas";
      const isRecordShortcutTarget = shortcutScope === "records";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (isEditMode) {
          undoLastOperation();
        } else {
          writeOperationLog("浏览模式下不能撤销编辑操作，请先切换到编辑模式");
        }
        return;
      }
      if (event.key === "Escape" && hoveredAttributeLibraryComponentType) {
        event.preventDefault();
        hideLibraryFlyout();
        return;
      }
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      if (!isEditMode) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && isCanvasShortcutTarget) {
          event.preventDefault();
          writeOperationLog("浏览模式下不执行全画布全选，请先切换到编辑模式");
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
          if (isRecordShortcutTarget && (selectedProjectId || selectedSchemeId || selectedProjectIds.length > 0 || selectedSchemeIds.length > 0)) {
            event.preventDefault();
            copySelectedRecord();
          } else if (isCanvasShortcutTarget) {
            event.preventDefault();
            copySelection();
          }
          return;
        }
        if (
          ((event.ctrlKey || event.metaKey) && ["x", "v"].includes(event.key.toLowerCase())) ||
          event.key === "Delete" ||
          event.key === "Backspace" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight" ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          releaseKeyboardMoveKey(event.key);
          writeOperationLog("浏览模式下不能修改图元，请先切换到编辑模式");
        }
        return;
      }
      if (libraryPlacement && isCanvasShortcutTarget) {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelLibraryPlacement();
          return;
        }
      }
      if (routableLinePlacement && isCanvasShortcutTarget) {
        if (event.key === "Escape") {
          event.preventDefault();
          setRoutableLinePlacement(null);
          resetRoutableLinePreviewState();
          setMode("select");
          return;
        }
      }
      if (staticDrawing && isCanvasShortcutTarget) {
        if (event.key === "Enter") {
          event.preventDefault();
          finishInteractiveStaticDrawing();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelInteractiveStaticDrawing();
          return;
        }
        if (event.key === "Backspace" && staticDrawing.points.length > 1) {
          event.preventDefault();
          setStaticDrawing({
            ...staticDrawing,
            points: staticDrawing.points.slice(0, -1)
          });
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          const selectableEdgeIds = activeLayerEdges.map((edge) => edge.id);
          setCanvasSelectionScope("group");
          setSelectedNodeIds(activeLayerNodes.map((node) => node.id));
          setSelectedEdgeIds(selectableEdgeIds);
          setSelectedEdgeId(selectableEdgeIds[0] ?? "");
          setConnectSource(null);
          resetConnectPreviewState();
          setRewiring(null);
          clearRecordSelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (isRecordShortcutTarget && (selectedProjectId || selectedSchemeId || selectedProjectIds.length > 0 || selectedSchemeIds.length > 0)) {
          event.preventDefault();
          copySelectedRecord();
        } else if (isCanvasShortcutTarget) {
          event.preventDefault();
          copySelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          cutSelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        if (isRecordShortcutTarget && recordClipboard) {
          event.preventDefault();
          pasteSelectedRecord();
        } else if (isCanvasShortcutTarget) {
          event.preventDefault();
          pasteSelection();
        }
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          deleteSelectedGraphicsFromCanvas();
        } else if (isRecordShortcutTarget) {
          event.preventDefault();
          if (selectedProjectIds.length > 1 || selectedSchemeIds.length > 1) {
            deleteSelectedRecords();
          } else if (selectedProjectId) {
            const project = projectById.get(selectedProjectId);
            if (project) deleteProjectRecord(project);
          } else if (selectedSchemeId) {
            const scheme = findSavedSchemeById(schemes, selectedSchemeId);
            if (scheme) deleteSchemeRecord(scheme);
          }
        }
      } else if (isCanvasShortcutTarget && event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), 0, event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), 0, event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, 0, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, 0, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 25 : 1), event.repeat);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
        releaseKeyboardMoveKey(event.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, canvasBounds, canvasClipboard, canvasSelectionScope, deviceIndexCounters, displaySelectedEdgeIds, displaySelectedNodeIds, edges, hasUnsavedChanges, hoveredAttributeLibraryComponentType, isEditMode, libraryPlacement, nodes, projectById, projectName, recordClipboard, routedEdgeById, saveRequired, schemes, selectedEdgeId, selectedEdgeIds, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, staticDrawing, topologyErrors, viewBox]);

  useEffect(() => {
    if (isBrowseMode && leftPanelTab !== "projects") {
      setLeftPanelTab("projects");
    }
  }, [isBrowseMode, leftPanelTab]);

  useEffect(() => {
    if (leftPanelTab !== "projects") {
      projectListPointerInsideRef.current = false;
    }
  }, [leftPanelTab]);

  useEffect(() => {
    if (skipNextTopologyStaleRef.current) {
      skipNextTopologyStaleRef.current = false;
      return;
    }
    if (topologyStatus.state === "idle") {
      return;
    }
    return scheduleIdleWork(() => {
      setTopologyStatus((current) =>
        current.state === "idle" ? current : { state: "idle", message: "拓扑结果已过期" }
      );
    }, 200, 500);
  }, [graphStore.topologyRevision, topologyStatus.state]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LEFT_PANEL_MODE_STORAGE_KEY, leftPanelMode);
    } catch {
      // Ignore storage failures; panel mode still works for the active session.
    }
  }, [leftPanelMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RIGHT_PANEL_MODE_STORAGE_KEY, rightPanelMode);
    } catch {
      // Ignore storage failures; panel mode still works for the active session.
    }
  }, [rightPanelMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LEFT_PANEL_WIDTH_STORAGE_KEY, String(leftPanelWidth));
    } catch {
      // Ignore storage failures; panel width still works for the active session.
    }
  }, [leftPanelWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RIGHT_PANEL_WIDTH_STORAGE_KEY, String(rightPanelWidth));
    } catch {
      // Ignore storage failures; panel width still works for the active session.
    }
  }, [rightPanelWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATUSBAR_HEIGHT_STORAGE_KEY, String(statusbarHeight));
    } catch {
      // Ignore storage failures; status bar height still works for the active session.
    }
  }, [statusbarHeight]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VALIDATION_PANEL_HEIGHT_STORAGE_KEY, String(validationPanelHeight));
    } catch {
      // Ignore storage failures; validation panel height still works for the active session.
    }
  }, [validationPanelHeight]);
  const routeForCurrentEdgeSave = appExtractedHandlersB.createRouteForCurrentEdgeSave(appRuntimeCtx);

  const edgeWithCurrentRouteGeometryForSave = (edge: Edge): Edge =>
    edgeWithSavedRouteGeometry(edge, routeForCurrentEdgeSave(edge), nodeById.get(edge.sourceId), nodeById.get(edge.targetId));
  const currentProject = appExtractedHandlersB.createCurrentProject(appRuntimeCtx);
  const currentGraphDirtyBaseline = appExtractedHandlersA.createCurrentGraphDirtyBaseline(appRuntimeCtx);
  const graphDirtyBaselineChanged = appExtractedHandlersB.createGraphDirtyBaselineChanged(appRuntimeCtx);

  useEffect(() => {
    const nextBaseline = currentGraphDirtyBaseline();
    const previousBaseline = graphDirtyBaselineRef.current;
    graphDirtyBaselineRef.current = nextBaseline;
    if (!previousBaseline) {
      return;
    }
    if (suppressNextGraphDirtyRef.current) {
      suppressNextGraphDirtyRef.current = false;
      return;
    }
    if (graphDirtyBaselineChanged(previousBaseline, nextBaseline)) {
      setHasUnsavedChanges(true);
    }
  }, [activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectName, voltageUnit]);

  const canAdjustSelectedDisplayLayer = isEditMode && activeSelectedNodeIds.length > 0;
  const adjustSelectedDisplayLayer = appExtractedHandlersC.createAdjustSelectedDisplayLayer(appRuntimeCtx);

  const clearTransientSelectionState = () => {
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
  const persistDeviceLibraryChange = appExtractedHandlersA.createPersistDeviceLibraryChange(appRuntimeCtx);

  const persistTemplateLibraryChange = (overrides: Pick<Partial<DeviceLibraryPersistencePayload>, "customGraphTemplateTypes" | "customGraphTemplates">) => {
    persistDeviceLibraryChange(overrides, {
      success: "模板库已自动保存到后台",
      failure: "模板库自动保存到后台失败"
    });
  };

  const connectionCommitFailureMessage = (issues: { type?: string; message?: string }[] = []) => {
    const needsReroute = issues.some((issue) =>
      issue.type === "blocked-by-node" ||
      issue.type === "out-of-bounds"
    );
    if (needsReroute) {
      return "已自动尝试避让设备和静态图元，但当前空间不足以形成安全正交路径，请稍微移动相关图元或扩大显示区域后重试。";
    }
    return issues[0]?.message ?? "联络线不满足正交、避让、端子垂直或最优路径约束。";
  };

  const connectionEndpointRuleFailureMessage = (edge: Edge) =>
    validateConnectionEndpointRules(nodes, edges, edge)[0]?.message ?? "";

  const expandActiveGroupSelection = (nodeIds: readonly string[] = [], edgeIds: readonly string[] = []) =>
    expandSelectionByGroups(activeLayerGroups, nodeIds, edgeIds);

  const selectCanvasGraphics = (
    nodeIds: readonly string[] = [],
    edgeIds: readonly string[] = [],
    options: { scope?: CanvasSelectionScope } = {}
  ) => {
    const scope = options.scope ?? "group";
    const selection = scope === "direct"
      ? resolveCanvasSelection([], nodeIds, edgeIds, "direct")
      : expandActiveGroupSelection(nodeIds, edgeIds);
    canvasSelectionShortcutActiveRef.current = selection.nodeIds.length > 0 || selection.edgeIds.length > 0;
    setCanvasSelectionScope(scope);
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    return selection;
  };

  const setModifierSelectionPress = (next: ModifierSelectionPressState) => {
    modifierSelectionPressRef.current = next;
    setModifierSelectionPressState(next);
  };

  const toggleNodeSelectionFromModifierClick = (node: ModelNode) => {
    const nodeAlreadySelected = activeSelectedNodeIds.includes(node.id);
    const nextNodeIds = nodeAlreadySelected
      ? activeSelectedNodeIds.filter((nodeId) => nodeId !== node.id)
      : [...activeSelectedNodeIds, node.id];
    const nextEdgeIds = [...activeSelectedEdgeIds];
    setCanvasSelectionScope("direct");
    setSelectedNodeIds(nextNodeIds);
    setSelectedEdgeIds(nextEdgeIds);
    setSelectedEdgeId(nextEdgeIds.includes(selectedEdgeId) ? selectedEdgeId : nextEdgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };

  const toggleEdgeSelectionFromModifierClick = (edge: Edge) => {
    const edgeAlreadySelected = activeSelectedEdgeIds.includes(edge.id);
    const nextEdgeIds = edgeAlreadySelected
      ? activeSelectedEdgeIds.filter((edgeId) => edgeId !== edge.id)
      : [...activeSelectedEdgeIds, edge.id];
    const nextNodeIds = [...activeSelectedNodeIds];
    setCanvasSelectionScope("direct");
    setSelectedNodeIds(nextNodeIds);
    setSelectedEdgeIds(nextEdgeIds);
    setSelectedEdgeId(nextEdgeIds.includes(selectedEdgeId) ? selectedEdgeId : nextEdgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };
  const toggleSelectionFromModifierClick = appExtractedHandlersB.createToggleSelectionFromModifierClick(appRuntimeCtx);

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

  const currentCanvasSelectionSnapshot = (): CanvasSelectionSnapshot =>
    createCanvasSelectionSnapshot(canvasSelectionScope, selectedNodeIds, selectedEdgeIds, selectedEdgeId);

  const restoreCanvasSelectionSnapshot = (snapshot: CanvasSelectionSnapshot | undefined) => {
    if (!snapshot) {
      return;
    }
    canvasSelectionShortcutActiveRef.current = snapshot.nodeIds.length > 0 || snapshot.edgeIds.length > 0;
    setCanvasSelectionScope(snapshot.scope);
    setSelectedNodeIds(snapshot.nodeIds);
    setSelectedEdgeIds(snapshot.edgeIds);
    setSelectedEdgeId(snapshot.edgeIds.includes(snapshot.edgeId) ? snapshot.edgeId : snapshot.edgeIds[0] ?? "");
  };
  const startModifierSelectionPress = appExtractedHandlersC.createStartModifierSelectionPress(appRuntimeCtx);

  const cancelModifierSelectionPress = () => {
    if (!modifierSelectionPressRef.current) {
      return false;
    }
    setModifierSelectionPress(null);
    setMarquee(null);
    return true;
  };
  const finishModifierSelectionPress = appExtractedHandlersB.createFinishModifierSelectionPress(appRuntimeCtx);
  const startNodeLabelDrag = appExtractedHandlersA.createStartNodeLabelDrag(appRuntimeCtx);
  const startNodeLabelRotateDrag = appExtractedHandlersB.createStartNodeLabelRotateDrag(appRuntimeCtx);

  const finishNodeLabelDrag = () => {
    if (nodeLabelDrag?.historyCaptured) {
      const currentNode = nodeById.get(nodeLabelDrag.nodeId);
      if (currentNode) {
        const previousNode = {
          ...currentNode,
          params: {
            ...currentNode.params,
            _labelX: String(nodeLabelDrag.startOffset.x),
            _labelY: String(nodeLabelDrag.startOffset.y)
          }
        };
        commitNodeFootprintUpdates([currentNode], {
          previousNodes: overlayGraphStoreNodes(graphStore, [previousNode])
        });
      }
    }
    setNodeLabelDrag(null);
  };

  const finishNodeLabelRotateDrag = () => {
    if (nodeLabelRotateDrag?.historyCaptured) {
      const currentNode = nodeById.get(nodeLabelRotateDrag.nodeId);
      if (currentNode) {
        const previousNode = {
          ...currentNode,
          params: {
            ...currentNode.params,
            _labelRotation: String(nodeLabelRotateDrag.startRotation)
          }
        };
        commitNodeFootprintUpdates([currentNode], {
          previousNodes: overlayGraphStoreNodes(graphStore, [previousNode])
        });
      }
    }
    setNodeLabelRotateDrag(null);
  };
  const setSelectedNodeLabelDisplayMode = appExtractedHandlersC.createSetSelectedNodeLabelDisplayMode(appRuntimeCtx);

  const toggleSelectedNodeLabelDisplay = () => {
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const hasVisibleLabel = activeSelectedNodeIds.some((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && !isStaticNode(node) && nodeLabelDisplayMode(node) !== "hidden";
    });
    setSelectedNodeLabelDisplayMode(hasVisibleLabel ? "hidden" : "follow");
  };

  const copySelection = () => {
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
    writeOperationLog(`复制 ${clipboard.nodes.length} 个图元、${clipboard.edges.length} 条联络线`);
  };
  const cutSelection = appExtractedHandlersA.createCutSelection(appRuntimeCtx);
  const pasteSelection = appExtractedHandlersB.createPasteSelection(appRuntimeCtx);
  const createGraphTemplateType = appExtractedHandlersC.createCreateGraphTemplateType(appRuntimeCtx);
  const openAddTemplateDialog = appExtractedHandlersC.createOpenAddTemplateDialog(appRuntimeCtx);

  const cancelTemplateDialog = () => {
    setTemplateDialog(null);
    setTemplateDraftName("");
  };
  const confirmAddGraphTemplate = appExtractedHandlersA.createConfirmAddGraphTemplate(appRuntimeCtx);
  const dropGraphTemplate = appExtractedHandlersC.createDropGraphTemplate(appRuntimeCtx);

  function finishMarqueeSelectionFromPoints(start: Point, current: Point) {
    const left = Math.min(start.x, current.x);
    const right = Math.max(start.x, current.x);
    const top = Math.min(start.y, current.y);
    const bottom = Math.max(start.y, current.y);
    if (right - left < 8 || bottom - top < 8) {
      setMarquee(null);
      return false;
    }
    const selection = selectGraphicsInRect(activeLayerNodes, activeLayerRoutedEdges, { left, right, top, bottom });
    selectCanvasGraphics(selection.nodeIds, selection.edgeIds);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMarquee(null);
    return true;
  }

  const finishMarqueeSelection = () => {
    if (!marquee) {
      return;
    }
    finishMarqueeSelectionFromPoints(marquee.start, marquee.current);
  };
  const deleteSelection = appExtractedHandlersA.createDeleteSelection(appRuntimeCtx);

  const deleteSelectedGraphicsFromCanvas = () => {
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: activeSelectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      window.alert(action.message);
      return;
    }
    deleteSelection();
  };
  const groupSelectedGraphics = appExtractedHandlersB.createGroupSelectedGraphics(appRuntimeCtx);

  const ungroupSelectedGraphics = () => {
    if (!requireEditMode("解散组合")) {
      return;
    }
    if (!canUngroupSelectedGraphics) {
      return;
    }
    const result = dissolveSelectedCanvasGroups(groups, activeSelectedNodeIds, activeSelectedEdgeIds);
    if (result.removedGroupIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    setGroups(normalizeModelGroups(result.groups, nodes, edges));
    writeOperationLog(`解散 ${result.removedGroupIds.length} 个组合`);
  };

  const manualPointDeltaForEdge = (edge: Edge, deltas: Record<string, Point>): Point | null => {
    const endpointDeltas = [deltas[edge.sourceId], deltas[edge.targetId]].filter(Boolean);
    if (endpointDeltas.length === 0) {
      return null;
    }
    return {
      x: endpointDeltas.reduce((sum, delta) => sum + delta.x, 0) / endpointDeltas.length,
      y: endpointDeltas.reduce((sum, delta) => sum + delta.y, 0) / endpointDeltas.length
    };
  };

  const routePreserveEdgeIdsForMovedNodes = (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    requestedEdgeIds: Iterable<string> = []
  ) => {
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const candidateEdgeById = new Map(candidateEdges.map((edge) => [edge.id, edge]));
    const preserveIds = new Set<string>();
    const addIfBothEndpointsMove = (edge: Edge | undefined) => {
      if (edge && movedIds.has(edge.sourceId) && movedIds.has(edge.targetId)) {
        preserveIds.add(edge.id);
      }
    };
    candidateEdges.forEach(addIfBothEndpointsMove);
    for (const edgeId of requestedEdgeIds) {
      addIfBothEndpointsMove(candidateEdgeById.get(edgeId) ?? edgeById.get(edgeId));
    }
    return preserveIds;
  };

  const routeSnapshotEdgesForMove = (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIdsInput: Iterable<string> = []
  ) => {
    const movedIds = new Set(movedNodeIds);
    const selectedEdgeIds = new Set(selectedEdgeIdsInput);
    return candidateEdges.filter((edge) =>
      selectedEdgeIds.has(edge.id) ||
      (movedIds.has(edge.sourceId) && movedIds.has(edge.targetId)) ||
      Boolean(edge.manualPoints?.length || edge.routePoints?.length)
    );
  };

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

  const routePointSnapshotToRoutes = (routePoints: Record<string, Point[]>): { edgeId: string; points: Point[]; path: string }[] =>
    Object.entries(routePoints).map(([edgeId, points]) => ({
      edgeId,
      points: points.map((point) => ({ ...point })),
      path: ""
    }));

  const boxesOverlap = (
    first: { left: number; right: number; top: number; bottom: number },
    second: { left: number; right: number; top: number; bottom: number }
  ) => first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;

  const expandRouteBox = (
    box: { left: number; right: number; top: number; bottom: number },
    padding: number
  ) => ({
    left: box.left - padding,
    right: box.right + padding,
    top: box.top - padding,
    bottom: box.bottom + padding
  });
  const routeTouchesExpandedBoxes = appExtractedHandlersA.createRouteTouchesExpandedBoxes(appRuntimeCtx);
  const boundsForNodeSet = appExtractedHandlersB.createBoundsForNodeSet(appRuntimeCtx);

  const mergeNodeUpdateLists = (baseUpdates: ModelNode[], extraUpdates: ModelNode[]) => {
    if (extraUpdates.length === 0) {
      return baseUpdates;
    }
    const updateById = new Map(baseUpdates.map((node) => [node.id, node]));
    const orderedIds = baseUpdates.map((node) => node.id);
    for (const node of extraUpdates) {
      if (!updateById.has(node.id)) {
        orderedIds.push(node.id);
      }
      updateById.set(node.id, node);
    }
    return orderedIds.flatMap((id) => {
      const node = updateById.get(id);
      return node ? [node] : [];
    });
  };
  const routableLineRouteCandidateIdsForMovedNodes = appExtractedHandlersA.createRoutableLineRouteCandidateIdsForMovedNodes(appRuntimeCtx);
  const localRouteOptimizationEdges = appExtractedHandlersC.createLocalRouteOptimizationEdges(appRuntimeCtx);
  const localRouteOptimizationCandidateEdges = appExtractedHandlersB.createLocalRouteOptimizationCandidateEdges(appRuntimeCtx);
  const routePointsForMovedNodeBlockers = appExtractedHandlersA.createRoutePointsForMovedNodeBlockers(appRuntimeCtx);
  const routePointsForMovedEdgesBlockedByStationaryNodes = appExtractedHandlersC.createRoutePointsForMovedEdgesBlockedByStationaryNodes(appRuntimeCtx);
  const routePointsNearOriginalMovedNodes = appExtractedHandlersB.createRoutePointsNearOriginalMovedNodes(appRuntimeCtx);

  const sameOptionalPoint = (first?: Point, second?: Point) =>
    (!first && !second) || (Boolean(first && second) && first?.x === second?.x && first?.y === second?.y);

  const sameConnectTarget = (first?: ConnectTarget, second?: ConnectTarget | null) =>
    (!first && !second) ||
    Boolean(
      first &&
        second &&
        first.node.id === second.node.id &&
        first.terminalId === second.terminalId &&
        sameOptionalPoint(first.point, second.point)
    );

  const sameOptionalPointList = (first?: Point[], second?: Point[]) =>
    (!first && !second) ||
    (Boolean(first && second) &&
      first?.length === second?.length &&
      first?.every((point, index) => point.x === second?.[index]?.x && point.y === second?.[index]?.y));
  const adjustEdgesAfterNodeMove = appExtractedHandlersC.createAdjustEdgesAfterNodeMove(appRuntimeCtx);
  const rebuildSingleAffectedConnectionRoute = appExtractedHandlersA.createRebuildSingleAffectedConnectionRoute(appRuntimeCtx);

  const synchronousEdgeAdjustmentCandidates = (
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIdsInput: Iterable<string> = [],
    movedBusNodeIdsInput: Iterable<string> = [],
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
    const movedIds = reuseSetOrCreate(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const selectedEdgeIds = reuseSetOrCreate(selectedEdgeIdsInput);
    const movedBusNodeIds = reuseSetOrCreate(movedBusNodeIdsInput);
    return candidateEdges.filter((edge) =>
      shouldAdjustEdgeSynchronouslyAfterMove(edge, movedIds, selectedEdgeIds, movedBusNodeIds, originalRoutePoints)
    );
  };

  const shouldAdjustEdgeSynchronouslyAfterMove = (
    edge: Edge,
    movedNodeIds: Set<string>,
    selectedEdgeIds: Set<string>,
    movedBusNodeIds: Set<string>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {}
  ) => {
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    return (
      selectedEdgeIds.has(edge.id) ||
      (sourceMoved && targetMoved) ||
      Boolean(edge.manualPoints?.length) ||
      movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId) ||
      Boolean(originalRoutePoints[edge.id]?.length)
    );
  };

  const mergeAdjustedCandidateEdges = (candidateEdges: Edge[], adjustedCandidateEdges: Edge[]) => {
    if (adjustedCandidateEdges.length === 0) {
      return candidateEdges;
    }
    const adjustedEdgeById = new Map(adjustedCandidateEdges.map((edge) => [edge.id, edge]));
    let changed = false;
    const mergedEdges = candidateEdges.map((edge) => {
      const adjusted = adjustedEdgeById.get(edge.id);
      if (!adjusted) {
        return edge;
      }
      if (adjusted !== edge) {
        changed = true;
      }
      return adjusted;
    });
    return changed ? mergedEdges : candidateEdges;
  };

  const shouldFinalizeMovedNodeEdgesSynchronously = (movedNodeIds: string[], candidateEdges: Edge[]) =>
    movedNodeIds.length > 0 &&
    candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT &&
    (movedNodeIds.length > 1 || candidateEdges.length === 0);

  const shouldDeferSingleNodeTerminalReconciliation = (movedNodeIds: string[], candidateEdges: Edge[]) =>
    movedNodeIds.length === 1 &&
    candidateEdges.length > 0 &&
    candidateEdges.length <= CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT;
  const terminalReconcileNodeScope = appExtractedHandlersA.createTerminalReconcileNodeScope(appRuntimeCtx);
  const finalizeMovedNodeEdgesFast = appExtractedHandlersB.createFinalizeMovedNodeEdgesFast(appRuntimeCtx);
  const optimizeMovedNodeEdgeRoutes = appExtractedHandlersA.createOptimizeMovedNodeEdgeRoutes(appRuntimeCtx);
  const shouldRunDeferredMoveOptimization = appExtractedHandlersB.createShouldRunDeferredMoveOptimization(appRuntimeCtx);
  const scheduleMovedEdgeOptimization = appExtractedHandlersB.createScheduleMovedEdgeOptimization(appRuntimeCtx);
  const scheduleDeferredMovedConnectionRepair = appExtractedHandlersA.createScheduleDeferredMovedConnectionRepair(appRuntimeCtx);
  const moveRouteRepairSeedEdges = appExtractedHandlersC.createMoveRouteRepairSeedEdges(appRuntimeCtx);

  const shouldPatchRouteCacheForHighFanoutMove = (movedNodeIds: string[], candidateEdges: Edge[]) =>
    movedNodeIds.length > 0 && candidateEdges.length > MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES;
  const lightweightMovedEndpointRoute = appExtractedHandlersC.createLightweightMovedEndpointRoute(appRuntimeCtx);
  const patchCachedRoutesForHighFanoutMove = appExtractedHandlersC.createPatchCachedRoutesForHighFanoutMove(appRuntimeCtx);

  const storedRouteDirtyIdsForMove = (dirtyEdgeIds: Set<string>, routeCachePatchedEdgeIds: Set<string>) => {
    if (routeCachePatchedEdgeIds.size === 0) {
      return dirtyEdgeIds;
    }
    const storedDirty = new Set<string>();
    for (const edgeId of dirtyEdgeIds) {
      if (!routeCachePatchedEdgeIds.has(edgeId)) {
        storedDirty.add(edgeId);
      }
    }
    if (storedDirty.size === 0) {
      const firstPatchedEdgeId = routeCachePatchedEdgeIds.values().next().value;
      if (firstPatchedEdgeId) {
        storedDirty.add(firstPatchedEdgeId);
      }
    }
    return storedDirty;
  };
  const commitFastMovedGraphPatches = appExtractedHandlersB.createCommitFastMovedGraphPatches(appRuntimeCtx);

  const clampPointToCanvas = (point: Point) => clampPointToBounds(point, canvasBounds);
  const clampNodeToCanvas = (node: ModelNode, position = node.position) => clampNodePositionToBounds(node, canvasBounds, position);
  const clampViewBoxToCanvas = (box: typeof viewBox) => normalizeViewBoxToCanvas(box, canvasBounds);
  const updateMouseStatus = appExtractedHandlersC.createUpdateMouseStatus(appRuntimeCtx);
  const updateMultiNodeDragOverlayTransform = (delta: Point | null) => {
    const nextDelta = delta ?? { x: 0, y: 0 };
    multiNodeDragOverlayDeltaRef.current = nextDelta;
    const roundedDelta = { x: Math.round(nextDelta.x), y: Math.round(nextDelta.y) };
    const transform = `translate(${roundedDelta.x} ${roundedDelta.y})`;
    multiNodeDragOverlayRef.current?.setAttribute("transform", transform);
    imperativeMultiNodeDragOverlayRef.current?.setAttribute("transform", transform);
    const activeDragging = draggingRef.current;
    if (activeDragging && isMultiNodeMoveState(activeDragging)) {
      updateNodeDragLightweightEdgePreview(activeDragging, roundedDelta, activeDragging.overlayPreview?.dynamicEdgePreviewEdges ?? []);
    }
  };
  const showImperativeMultiNodeDragOverlay = (markup: string) => {
    const overlay = imperativeMultiNodeDragOverlayRef.current;
    if (!overlay) {
      return false;
    }
    imperativeMultiNodeDragActiveRef.current = true;
    overlay.innerHTML = markup;
    overlay.style.display = "";
    updateMultiNodeDragOverlayTransform(multiNodeDragOverlayDeltaRef.current);
    return true;
  };
  const hideImperativeMultiNodeDragOverlay = () => {
    imperativeMultiNodeDragActiveRef.current = false;
    const overlay = imperativeMultiNodeDragOverlayRef.current;
    if (overlay) {
      overlay.innerHTML = "";
      overlay.style.display = "none";
    }
    clearImperativeNodeDragEdgePreview();
  };
  const resetMultiNodeDragOverlayTransform = () => {
    updateMultiNodeDragOverlayTransform({ x: 0, y: 0 });
  };
  const singleNodeDragRenderState = (dragState: DraggingState): DraggingState => ({
    ...dragState,
    currentDelta: undefined,
    previewDelta: undefined
  });
  const buildSingleNodeDragPreviewNodeMarkup = appExtractedHandlersA.createBuildSingleNodeDragPreviewNodeMarkup(appRuntimeCtx);
  const clearImperativeNodeDragEdgePreview = () => {
    imperativeNodeDragEdgePreviewPathRefs.current.clear();
    imperativeNodeDragEdgePreviewKeyRef.current = "";
    const edgePreview = imperativeSingleNodeDragEdgePreviewRef.current;
    if (edgePreview) {
      edgePreview.innerHTML = "";
      edgePreview.style.display = "none";
    }
  };
  const showImperativeSingleNodeDragPreview = (dragState: DraggingState) => {
    const markup = buildSingleNodeDragPreviewNodeMarkup(dragState);
    const nodeOverlay = imperativeSingleNodeDragNodeOverlayRef.current;
    if (!nodeOverlay || !markup) {
      return false;
    }
    imperativeSingleNodeDragActiveRef.current = true;
    nodeOverlay.innerHTML = markup;
    nodeOverlay.style.display = "";
    nodeOverlay.setAttribute("transform", "translate(0 0)");
    clearImperativeNodeDragEdgePreview();
    return true;
  };
  const hideImperativeSingleNodeDragPreview = () => {
    imperativeSingleNodeDragActiveRef.current = false;
    const nodeOverlay = imperativeSingleNodeDragNodeOverlayRef.current;
    if (nodeOverlay) {
      nodeOverlay.innerHTML = "";
      nodeOverlay.style.display = "none";
      nodeOverlay.setAttribute("transform", "translate(0 0)");
    }
    clearImperativeNodeDragEdgePreview();
    const dropHint = imperativeNodeDragDropHintRef.current;
    if (dropHint) {
      dropHint.style.display = "none";
    }
    nodeTerminalSnapTargetRef.current = null;
  };
  const singleNodeDragPreviewNodeFor = (dragState: DraggingState, nodeId: string, delta: Point) => {
    const node = nodeById.get(nodeId);
    const originalPosition = dragState.originalPositions[nodeId];
    return node && originalPosition
      ? {
          ...node,
          position: {
            x: originalPosition.x + delta.x,
            y: originalPosition.y + delta.y
          }
        }
      : node;
  };
  const singleNodeDragRelevantEdges = (dragState: DraggingState) => {
    if (isMultiNodeMoveState(dragState) || dragState.nodeIds.length !== 1) {
      return [];
    }
    if (dragState.singleNodeDragCache) {
      return dragState.singleNodeDragCache.relevantEdges;
    }
    const movedNodeIds = new Set(dragState.nodeIds);
    const draggedEdgeIds = new Set(dragState.edgeIds);
    return dragState.affectedEdges.filter((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return false;
      }
      return movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || draggedEdgeIds.has(edge.id);
    });
  };
  const singleNodeDragPreviewBounds = (dragState: DraggingState, delta: Point): RenderViewportBounds => {
    const baseBounds = expandRouteBox(renderViewportBounds, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING);
    const nodeId = dragState.nodeIds[0];
    const movedNode = nodeId ? singleNodeDragPreviewNodeFor(dragState, nodeId, delta) : undefined;
    return movedNode
      ? mergeRenderViewportBounds(baseBounds, nodeVisualInteractionBounds(movedNode, movedNode.position, CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING, nodeHasUprightBoundsContent(movedNode)))
      : baseBounds;
  };
  const singleNodeDragEdgeTouchesBounds = (dragState: DraggingState, edge: Edge, delta: Point, bounds: RenderViewportBounds) => {
    const routeBounds = dragState.originalRouteBounds[edge.id];
    if (routeBounds && boxesOverlap(routeBounds, bounds)) {
      return true;
    }
    const sourcePreviewNode = singleNodeDragPreviewNodeFor(dragState, edge.sourceId, delta);
    const targetPreviewNode = singleNodeDragPreviewNodeFor(dragState, edge.targetId, delta);
    const sourceMoved = dragState.nodeIds.includes(edge.sourceId);
    const targetMoved = dragState.nodeIds.includes(edge.targetId);
    const stationaryEndpoint = sourceMoved ? targetPreviewNode : targetMoved ? sourcePreviewNode : undefined;
    return Boolean(stationaryEndpoint && nodeIntersectsRenderViewport(stationaryEndpoint, bounds));
  };
  const singleNodeDragViewportLocalEdgesByScan = (
    dragState: DraggingState,
    edgesToCheck: Edge[],
    delta: Point,
    bounds: RenderViewportBounds,
    localLimit = Number.POSITIVE_INFINITY
  ) => {
    const viewportLocalEdges: Edge[] = [];
    for (const edge of edgesToCheck) {
      if (!singleNodeDragEdgeTouchesBounds(dragState, edge, delta, bounds)) {
        continue;
      }
      viewportLocalEdges.push(edge);
      if (viewportLocalEdges.length >= localLimit) {
        break;
      }
    }
    return viewportLocalEdges;
  };
  const singleNodeDragScopedEdges = (dragState: DraggingState, delta: Point) => {
    if (dragState.singleNodeDragCache) {
      return { previewEdges: dragState.singleNodeDragCache.previewEdges, snapEdges: dragState.singleNodeDragCache.snapEdges };
    }
    const relevantEdges = singleNodeDragRelevantEdges(dragState);
    if (relevantEdges.length <= CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT) {
      return { previewEdges: relevantEdges, snapEdges: relevantEdges };
    }
    const bounds = singleNodeDragPreviewBounds(dragState, delta);
    const localLimit = Math.max(CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT);
    const viewportLocalEdges = singleNodeDragViewportLocalEdgesByScan(dragState, relevantEdges, delta, bounds, localLimit);
    const scopedEdges = viewportLocalEdges.length > 0 ? viewportLocalEdges : relevantEdges;
    return {
      previewEdges: scopedEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT),
      snapEdges: scopedEdges.slice(0, CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT)
    };
  };
  const singleNodeDragPreviewEdges = (dragState: DraggingState, delta: Point) =>
    singleNodeDragScopedEdges(dragState, delta).previewEdges;
  const singleNodeDragSnapEdges = (dragState: DraggingState, delta: Point) =>
    singleNodeDragScopedEdges(dragState, delta).snapEdges;
  const simpleOrthogonalDragPreviewPoints = (start: Point, end: Point) => {
    if (Math.round(start.x) === Math.round(end.x) || Math.round(start.y) === Math.round(end.y)) {
      return [start, end];
    }
    return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: start.x, y: end.y }, end];
  };
  const shiftedDragPreviewPoint = (point: Point | undefined, delta: Point | undefined) =>
    point && delta ? { x: point.x + delta.x, y: point.y + delta.y } : point;
  const shiftPreviewEndpointForDelta = (point: Point, moves: boolean, delta: Point) =>
    moves ? { x: point.x + delta.x, y: point.y + delta.y } : point;
  const buildCachedSingleNodeDragPreviewRoutes = appExtractedHandlersC.createBuildCachedSingleNodeDragPreviewRoutes(appRuntimeCtx);
  const buildDragPreviewEndpointPoints = appExtractedHandlersA.createBuildDragPreviewEndpointPoints(appRuntimeCtx);
  const singleNodeDragPreviewKey = (dragState: DraggingState, roundedDelta: Point, previewEdges: Edge[]) =>
    `single:${dragState.nodeIds[0] ?? ""}:${roundedDelta.x},${roundedDelta.y}:${previewEdges.length}:${previewEdges[0]?.id ?? ""}:${previewEdges[previewEdges.length - 1]?.id ?? ""}`;
  const buildLightweightNodeDragPreviewRoutes = (
    dragState: DraggingState,
    delta: Point,
    scopedPreviewEdges?: Edge[]
  ): NodeDragPreviewRoute[] => {
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, delta)
    );
    const multiNodeMove = isMultiNodeMoveState(dragState);
    const dragCache = dragState.singleNodeDragCache;
    const cachedSingleNodePreviewRoutes = !multiNodeMove
      ? buildCachedSingleNodeDragPreviewRoutes(dragCache, delta, previewEdges)
      : null;
    if (cachedSingleNodePreviewRoutes) {
      return cachedSingleNodePreviewRoutes;
    }
    const overlayPreviewCache = multiNodeMove ? dragState.overlayPreview : undefined;
    const movedNodeIds = dragCache?.movedNodeIds ?? overlayPreviewCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    const draggedEdgeIds = dragCache?.draggedEdgeIds ?? overlayPreviewCache?.draggedEdgeIds ?? new Set(dragState.edgeIds);
    const movedBusIds = dragCache?.movedBusNodeIds ?? overlayPreviewCache?.movedBusNodeIds ?? new Set(
      dragState.nodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    return previewEdges.flatMap((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return [];
      }
      const sourceMoved = movedNodeIds.has(edge.sourceId);
      const targetMoved = movedNodeIds.has(edge.targetId);
      if (multiNodeMove && sourceMoved && targetMoved) {
        return [];
      }
      if (!sourceMoved && !targetMoved && !draggedEdgeIds.has(edge.id)) {
        return [];
      }
      const endpoints = buildDragPreviewEndpointPoints(dragState, edge, delta, movedNodeIds, draggedEdgeIds, movedBusIds);
      if (!endpoints) {
        return [];
      }
      const color = cachedConnectionStrokeColor(edge);
      return [{
        edgeId: edge.id,
        path: pointsToPreviewPath(simpleOrthogonalDragPreviewPoints(endpoints.start, endpoints.end)),
        color
      }];
    });
  };
  const buildLightweightNodeDragPreviewRouteMarkup = (dragState: DraggingState, delta: Point, scopedPreviewEdges?: Edge[]) => {
    const previewEdges = scopedPreviewEdges ?? (
      isMultiNodeMoveState(dragState) ? dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [] : singleNodeDragPreviewEdges(dragState, delta)
    );
    return buildLightweightNodeDragPreviewRoutes(dragState, delta, previewEdges)
      .map((route) => `<path class="connection-line drag-preview" data-drag-preview-edge-id="${escapeXml(route.edgeId)}" d="${escapeXml(route.path)}" style="--connection-color:${escapeXml(route.color)}"/>`)
      .join("");
  };
  const syncImperativeNodeDragPreviewPaths = appExtractedHandlersC.createSyncImperativeNodeDragPreviewPaths(appRuntimeCtx);
  const updateNodeDragLightweightEdgePreview = appExtractedHandlersA.createUpdateNodeDragLightweightEdgePreview(appRuntimeCtx);
  const singleNodeDragInteractionNodes = appExtractedHandlersA.createSingleNodeDragInteractionNodes(appRuntimeCtx);
  const multiNodeDragInteractionNodes = appExtractedHandlersC.createMultiNodeDragInteractionNodes(appRuntimeCtx);
  const updateImperativeNodeDragDropHint = (snapTarget: NodeTerminalSnapTarget | null) => {
    const dropHint = imperativeNodeDragDropHintRef.current;
    if (!dropHint) {
      return;
    }
    if (!snapTarget) {
      dropHint.style.display = "none";
      return;
    }
    const targetNode = nodeById.get(snapTarget.targetNodeId);
    const terminalType = targetNode && isBusNode(targetNode)
      ? getBusTerminalType(targetNode)
      : targetNode?.terminals.find((terminal) => terminal.id === snapTarget.targetTerminalId)?.type;
    if (terminalType) {
      dropHint.style.setProperty("--connection-color", terminalColor(terminalType, colorPalette));
    }
    dropHint.setAttribute("transform", `translate(${Math.round(snapTarget.point.x)} ${Math.round(snapTarget.point.y)})`);
    dropHint.style.display = "";
  };
  const findSingleNodeDragSnapTargetAtDelta = (dragState: DraggingState, delta: Point, scopedSnapEdges?: Edge[]) => {
    if (isMultiNodeMoveState(dragState)) {
      return null;
    }
    const candidates = singleNodeDragInteractionNodes(dragState, delta, scopedSnapEdges ?? []);
    const movedNodeIds = dragState.singleNodeDragCache?.movedNodeIds ?? new Set(dragState.nodeIds);
    return findNodeTerminalSnapTarget(candidates, movedNodeIds) ?? findNodeBusSnapTarget(candidates, movedNodeIds);
  };
  const findMultiNodeDragSnapTargetAtDelta = (dragState: DraggingState, delta: Point) => {
    if (!isMultiNodeMoveState(dragState)) {
      return null;
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    const candidates = multiNodeDragInteractionNodes(dragState, delta);
    return findNodeTerminalSnapTarget(candidates, movedNodeIds) ?? findNodeBusSnapTarget(candidates, movedNodeIds);
  };
  const updateSingleNodeDragImperativePreview = (dragState: DraggingState, previewDelta: Point) => {
    if (isMultiNodeMoveState(dragState)) {
      return;
    }
    if (!imperativeSingleNodeDragActiveRef.current && !showImperativeSingleNodeDragPreview(dragState)) {
      return;
    }
    const scopedEdges = singleNodeDragScopedEdges(dragState, previewDelta);
    const snapTarget = findSingleNodeDragSnapTargetAtDelta(dragState, previewDelta, scopedEdges.snapEdges);
    const visualDelta = applyNodeTerminalSnap(previewDelta, snapTarget);
    const visualTransform = `translate(${Math.round(visualDelta.x)} ${Math.round(visualDelta.y)})`;
    imperativeSingleNodeDragNodeOverlayRef.current?.setAttribute("transform", visualTransform);
    updateNodeDragLightweightEdgePreview(dragState, visualDelta, scopedEdges.previewEdges);
    nodeTerminalSnapTargetRef.current = snapTarget;
    updateImperativeNodeDragDropHint(snapTarget);
  };
  const startDraggingState = (nextDragging: DraggingState) => {
    draggingRef.current = nextDragging;
    updateSmartAlignmentGuides([]);
    resetMultiNodeDragOverlayTransform();
    const simplifiedMarkup = isMultiNodeMoveState(nextDragging) ? nextDragging.overlayPreview?.simplifiedMarkup : "";
    if (simplifiedMarkup && showImperativeMultiNodeDragOverlay(simplifiedMarkup)) {
      hideImperativeSingleNodeDragPreview();
      return;
    }
    hideImperativeMultiNodeDragOverlay();
    if (!isMultiNodeMoveState(nextDragging)) {
      showImperativeSingleNodeDragPreview(nextDragging);
    } else {
      hideImperativeSingleNodeDragPreview();
    }
    setDragging(nextDragging);
  };
  const flushConnectPreviewDom = appExtractedHandlersA.createFlushConnectPreviewDom(appRuntimeCtx);
  const setConnectPreviewDom = (path: string, targetPoint: Point | null) => {
    const previous = connectPreviewDomRef.current;
    if (previous.path === path && sameOptionalPoint(previous.targetPoint ?? undefined, targetPoint ?? undefined)) {
      return;
    }
    connectPreviewDomRef.current = { path, targetPoint };
    flushConnectPreviewDom();
  };
  const applyConnectPreviewState = appExtractedHandlersA.createApplyConnectPreviewState(appRuntimeCtx);
  const scheduleConnectPreviewPoint = appExtractedHandlersC.createScheduleConnectPreviewPoint(appRuntimeCtx);
  const applyRoutableLinePreviewState = appExtractedHandlersB.createApplyRoutableLinePreviewState(appRuntimeCtx);
  const scheduleRoutableLinePreviewPoint = appExtractedHandlersA.createScheduleRoutableLinePreviewPoint(appRuntimeCtx);
  const resetRoutableLinePreviewState = () => {
    pendingRoutableLinePreviewRef.current = null;
    if (routableLinePreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(routableLinePreviewFrameRef.current);
      routableLinePreviewFrameRef.current = null;
    }
    routableLinePreviewPointRef.current = null;
    routableLineDropTargetPointRef.current = null;
    routableLineDropTargetRef.current = null;
    setRoutableLinePreview((current) => current.path || current.targetPoint ? { path: "", targetPoint: null } : current);
  };
  const scheduleRewirePreviewPoint = appExtractedHandlersC.createScheduleRewirePreviewPoint(appRuntimeCtx);
  const resetConnectPreviewState = () => {
    pendingConnectPreviewRef.current = null;
    if (connectPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(connectPreviewFrameRef.current);
      connectPreviewFrameRef.current = null;
    }
    applyConnectPreviewState(null, false);
  };
  const resolveConnectPreviewPoint = (point: Point, event: { shiftKey: boolean; ctrlKey: boolean }) => {
    if (!connectSource || (!event.shiftKey && !event.ctrlKey)) {
      return point;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (!sourceNode) {
      return point;
    }
    const start = connectSource.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, connectSource.terminalId);
    return clampPointToCanvas(constrainPointToOrthogonalAxis(start, point));
  };
  const axisLockedDelta = (dx: number, dy: number): Point => (
    Math.abs(dx) >= Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy }
  );
  const boundedDeltaForNodes = appExtractedHandlersA.createBoundedDeltaForNodes(appRuntimeCtx);
  const boundedDeltaForMultiNodeInteractiveMove = (dragState: DraggingState, delta: Point) => {
    if (allowAutoExpandCanvas) {
      return delta;
    }
    const bounds =
      dragState.overlayPreview?.bounds ??
      boundsForNodeSet(nodes, new Set(dragState.nodeIds), dragState.originalPositions, 0);
    if (!bounds) {
      return delta;
    }
    const clampAxis = (value: number, min: number, max: number) =>
      min <= max ? clampNumber(value, min, max) : value;
    return {
      x: clampAxis(delta.x, -bounds.left, canvasBounds.width - bounds.right),
      y: clampAxis(delta.y, -bounds.top, canvasBounds.height - bounds.bottom)
    };
  };
  const nodeMoveGeometryInsideCanvas = appExtractedHandlersB.createNodeMoveGeometryInsideCanvas(appRuntimeCtx);
  const nearestBoundarySafeDelta = appExtractedHandlersC.createNearestBoundarySafeDelta(appRuntimeCtx);

  const boundedDeltaForMoveGeometry = (
    nodeIds: string[],
    edgeIds: string[],
    affectedEdgesForMove: Edge[],
    originalPositions: Record<string, Point>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    dx: number,
    dy: number,
    fallbackDelta?: Point,
    bounds: CanvasBounds = canvasBounds
  ) => {
    const nodeBoundedDelta = boundedDeltaForNodes(nodeIds, originalPositions, dx, dy, bounds);
    return nearestBoundarySafeDelta(
      nodeBoundedDelta,
      (delta) => nodeMoveGeometryInsideCanvas(nodeIds, edgeIds, affectedEdgesForMove, originalPositions, originalEdgePoints, originalRoutePoints, delta, bounds),
      fallbackDelta
    );
  };

  const commitSafeDeltaForDraggingState = (dragState: DraggingState) => {
    const delta = dragState.currentDelta;
    if (!delta || isMultiNodeMoveState(dragState)) {
      return delta;
    }
    return boundedDeltaForMoveGeometry(
      dragState.nodeIds,
      dragState.edgeIds,
      dragState.affectedEdges,
      dragState.originalPositions,
      dragState.originalEdgePoints,
      dragState.originalRoutePoints,
      delta.x,
      delta.y,
      delta,
      canvasBoundsForMoveDelta(dragState.nodeIds, dragState.originalPositions, delta.x, delta.y)
    );
  };

  const canvasBoundsForMoveDelta = (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number
  ) => canvasBoundsForMovedNodeDelta(nodeIds, originalPositions, dx, dy);
  const canvasBoundsForMovedNodeDelta = appExtractedHandlersA.createCanvasBoundsForMovedNodeDelta(appRuntimeCtx);

  const dragBoundsForSmartAlignment = (dragState: DraggingState, delta: Point): RenderViewportBounds | null => {
    let bounds: RenderViewportBounds | null = null;
    for (const nodeId of dragState.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragState.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      const movedPosition = {
        x: originalPosition.x + delta.x,
        y: originalPosition.y + delta.y
      };
      const nodeBounds = nodeSmartAlignmentBounds(node, movedPosition, nodeHasUprightBoundsContent(node));
      bounds = bounds ? mergeRenderViewportBounds(bounds, nodeBounds) : nodeBounds;
    }
    return bounds;
  };

  const terminalOutflowAnchorsForSmartAlignmentDrag = (dragState: DraggingState, delta: Point): SmartAlignmentAnchorMap => {
    const anchors = emptySmartAlignmentAnchorMap();
    for (const nodeId of dragState.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragState.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      const movedPosition = {
        x: originalPosition.x + delta.x,
        y: originalPosition.y + delta.y
      };
      const nodeAnchors = nodeTerminalOutflowSmartAlignmentAnchors(node, movedPosition);
      anchors.x.push(...nodeAnchors.x);
      anchors.y.push(...nodeAnchors.y);
    }
    return anchors;
  };
  const computeSmartAlignmentSnap = appExtractedHandlersC.createComputeSmartAlignmentSnap(appRuntimeCtx);

  const computeNodeDragPreviewDelta = (
    dragState: DraggingState,
    point: Point,
    ctrlKey: boolean,
    shiftKey: boolean
  ) => {
    const rawDx = point.x - dragState.startPoint.x;
    const rawDy = point.y - dragState.startPoint.y;
    const movementDelta = ctrlKey || shiftKey ? axisLockedDelta(rawDx, rawDy) : { x: rawDx, y: rawDy };
    const smartSnap = computeSmartAlignmentSnap(dragState, movementDelta, ctrlKey || shiftKey);
    updateSmartAlignmentGuides(smartSnap.guides);
    return smartSnap.delta;
  };
  const computeNodeDragDelta = appExtractedHandlersA.createComputeNodeDragDelta(appRuntimeCtx);
  const applyNodeDragMove = appExtractedHandlersB.createApplyNodeDragMove(appRuntimeCtx);

  const scheduleNodeDragMove = (point: Point, ctrlKey: boolean, shiftKey: boolean) => {
    pendingNodeDragMoveRef.current = { point, ctrlKey, shiftKey };
    if (nodeDragMoveFrameRef.current !== null) {
      return;
    }
    nodeDragMoveFrameRef.current = window.requestAnimationFrame(() => {
      nodeDragMoveFrameRef.current = null;
      const pending = pendingNodeDragMoveRef.current;
      pendingNodeDragMoveRef.current = null;
      if (pending) {
        applyNodeDragMove(pending.point, pending.ctrlKey, pending.shiftKey);
      }
    });
  };

  const flushPendingNodeDragMove = (renderPreview = true) => {
    const pending = pendingNodeDragMoveRef.current;
    if (!pending) {
      return;
    }
    pendingNodeDragMoveRef.current = null;
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
    applyNodeDragMove(pending.point, pending.ctrlKey, pending.shiftKey, renderPreview);
  };

  const clearNodeDragMoveSchedule = () => {
    pendingNodeDragMoveRef.current = null;
    if (nodeDragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(nodeDragMoveFrameRef.current);
      nodeDragMoveFrameRef.current = null;
    }
  };

  const clearKeyboardMoveCommitSchedule = () => {
    keyboardMoveCommitCancelRef.current?.();
    keyboardMoveCommitCancelRef.current = null;
  };

  const clearKeyboardNudgeSchedule = () => {
    pendingKeyboardMoveDeltaRef.current = null;
    keyboardMoveActiveKeyDeltasRef.current.clear();
    keyboardMoveLastFrameTimeRef.current = null;
    keyboardMoveFrameElapsedMsRef.current = 0;
    if (keyboardMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(keyboardMoveFrameRef.current);
      keyboardMoveFrameRef.current = null;
    }
  };

  const clearDraggingMoveState = () => {
    clearNodeDragMoveSchedule();
    clearKeyboardNudgeSchedule();
    clearKeyboardMoveCommitSchedule();
    resetMultiNodeDragOverlayTransform();
    hideImperativeMultiNodeDragOverlay();
    hideImperativeSingleNodeDragPreview();
    draggingRef.current = null;
    setDragging(null);
    dragUndoCapturedRef.current = false;
  };
  const cancelActiveEditInteractions = appExtractedHandlersA.createCancelActiveEditInteractions(appRuntimeCtx);

  const toggleInteractionMode = () => {
    if (isEditMode) {
      cancelActiveEditInteractions();
      setInteractionMode("browse");
      writeOperationLog("切换到浏览模式");
      return;
    }
    setInteractionMode("edit");
    writeOperationLog("切换到编辑模式");
  };
  const finishDraggingMove = appExtractedHandlersC.createFinishDraggingMove(appRuntimeCtx);
  const finishNodeDrag = appExtractedHandlersA.createFinishNodeDrag(appRuntimeCtx);
  const finishTransformDrag = appExtractedHandlersB.createFinishTransformDrag(appRuntimeCtx);

  const finishKeyboardMove = () => {
    clearKeyboardMoveCommitSchedule();
    keyboardMoveActiveKeyDeltasRef.current.clear();
    keyboardMoveLastFrameTimeRef.current = null;
    keyboardMoveFrameElapsedMsRef.current = 0;
    flushPendingKeyboardMove(false);
    if (keyboardMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(keyboardMoveFrameRef.current);
      keyboardMoveFrameRef.current = null;
    }
    const activeDragging = draggingRef.current ?? dragging;
    if (activeDragging?.source !== "keyboard") {
      return;
    }
    finishDraggingMove(activeDragging, nodeTerminalSnapTargetRef.current, "移动");
  };

  const scheduleKeyboardMoveCommit = () => {
    clearKeyboardMoveCommitSchedule();
    keyboardMoveCommitCancelRef.current = scheduleIdleWork(() => {
      keyboardMoveCommitCancelRef.current = null;
      finishKeyboardMove();
    }, KEYBOARD_MOVE_COMMIT_DELAY_MS, 1200);
  };
  const applyKeyboardMoveDelta = appExtractedHandlersC.createApplyKeyboardMoveDelta(appRuntimeCtx);

  const flushPendingKeyboardMove = (renderPreview = true) => {
    const pendingDelta = pendingKeyboardMoveDeltaRef.current;
    if (!pendingDelta) {
      return false;
    }
    pendingKeyboardMoveDeltaRef.current = null;
    if (keyboardMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(keyboardMoveFrameRef.current);
      keyboardMoveFrameRef.current = null;
    }
    return applyKeyboardMoveDelta(pendingDelta, renderPreview, keyboardMoveActiveKeyDeltasRef.current.size === 0);
  };

  const keyboardMoveActiveFrameDelta = (elapsedMs: number) => {
    if (elapsedMs <= 0 || keyboardMoveActiveKeyDeltasRef.current.size === 0) {
      return null;
    }
    let dx = 0;
    let dy = 0;
    for (const delta of keyboardMoveActiveKeyDeltasRef.current.values()) {
      dx += delta.x;
      dy += delta.y;
    }
    if (dx === 0 && dy === 0) {
      return null;
    }
    const multiplier = (elapsedMs / 1000) * KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND;
    return { x: dx * multiplier, y: dy * multiplier };
  };

  const appendPendingKeyboardMoveDelta = (delta: Point) => {
    if (delta.x === 0 && delta.y === 0) {
      return;
    }
    const baseDelta = pendingKeyboardMoveDeltaRef.current ?? draggingRef.current?.currentDelta ?? { x: 0, y: 0 };
    pendingKeyboardMoveDeltaRef.current = { x: baseDelta.x + delta.x, y: baseDelta.y + delta.y };
  };
  const scheduleKeyboardNudgeFrame = appExtractedHandlersA.createScheduleKeyboardNudgeFrame(appRuntimeCtx);

  const releaseKeyboardMoveKey = (key: string) => {
    keyboardMoveActiveKeyDeltasRef.current.delete(key);
    if (keyboardMoveActiveKeyDeltasRef.current.size === 0) {
      keyboardMoveLastFrameTimeRef.current = null;
      keyboardMoveFrameElapsedMsRef.current = 0;
      flushPendingKeyboardMove(true);
      if (draggingRef.current?.source === "keyboard") {
        scheduleKeyboardMoveCommit();
      }
    }
  };
  const startKeyboardMoveSession = appExtractedHandlersA.createStartKeyboardMoveSession(appRuntimeCtx);
  const nudgeSelectionByKeyboard = appExtractedHandlersB.createNudgeSelectionByKeyboard(appRuntimeCtx);
  const moveSelection = appExtractedHandlersC.createMoveSelection(appRuntimeCtx);

  const undoScopeForNodeFootprintPatch = (nodeId: string, nextNode: ModelNode | undefined): UndoGraphPatchScope => {
    const directCandidateEdges = edgeListForNodeIds([nodeId]);
    if (!nextNode) {
      return undoScopeForGraphPatch([nodeId], directCandidateEdges.map((edge) => edge.id));
    }
    const nextNodesForScope = overlayGraphStoreNodes(graphStore, [nextNode]);
    const candidateEdges = localRouteOptimizationCandidateEdges(
      nodes,
      nextNodesForScope,
      [nodeId],
      new Set<string>(),
      undefined,
      directCandidateEdges
    );
    return undoScopeForGraphPatch([nodeId], candidateEdges.map((edge) => edge.id));
  };
  const updateSelectedNode = appExtractedHandlersB.createUpdateSelectedNode(appRuntimeCtx);
  const commitNodeFootprintUpdates = appExtractedHandlersA.createCommitNodeFootprintUpdates(appRuntimeCtx);
  const assignSelectedNodesToModelLayer = appExtractedHandlersC.createAssignSelectedNodesToModelLayer(appRuntimeCtx);

  const openLayerAssignmentDialog = () => {
    if (!requireEditMode("修改图元所属图层")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const selectedLayerIds = activeSelectedNodeIds
      .map((nodeId) => nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID)
      .filter((layerId) => layers.some((layer) => layer.id === layerId));
    const commonLayerId =
      selectedLayerIds.length > 0 && selectedLayerIds.every((layerId) => layerId === selectedLayerIds[0])
        ? selectedLayerIds[0]
        : "";
    setLayerAssignmentTargetId(commonLayerId || activeLayerId || layers[0]?.id || DEFAULT_MODEL_LAYER_ID);
    setLayerAssignmentDialogOpen(true);
  };

  const applyLayerAssignmentDialog = () => {
    assignSelectedNodesToModelLayer(layerAssignmentTargetId);
    setLayerAssignmentDialogOpen(false);
  };
  const rotateSelectedLayoutUnits = appExtractedHandlersB.createRotateSelectedLayoutUnits(appRuntimeCtx);
  const mirrorSelectedNodes = appExtractedHandlersA.createMirrorSelectedNodes(appRuntimeCtx);

  const updateCanvasSize = (nextWidth: number, nextHeight: number) => {
    if (!requireEditMode("修改画布尺寸")) {
      return;
    }
    const currentBounds = canvasBoundsRef.current;
    const width = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    const nextBounds = { width, height };
    if (!canvasBoundsChangeIsMeaningful(currentBounds, nextBounds)) {
      return;
    }
    pushUndoSnapshot();
    applyCanvasBounds(nextBounds);
    setGraphArrays(
      nodes.map((node) => ({ ...node, position: clampNodePositionToBounds(node, nextBounds) })),
      edges.map((edge) => clampEdgeGeometryToBounds(edge, nextBounds))
    );
  };
  const commitCanvasSizeDraft = appExtractedHandlersC.createCommitCanvasSizeDraft(appRuntimeCtx);

  const resetCanvasSizeDraft = () => {
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  };

  const handleCanvasSizeBlur = () => {
    if (skipCanvasSizeBlurCommitRef.current) {
      skipCanvasSizeBlurCommitRef.current = false;
      return;
    }
    flushSync(() => commitCanvasSizeDraft());
  };

  const handleCanvasSizeKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      flushSync(() => commitCanvasSizeDraft());
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      resetCanvasSizeDraft();
      event.currentTarget.blur();
    }
  };
  const updateParam = appExtractedHandlersB.createUpdateParam(appRuntimeCtx);

  const updateMeasurementGroup = (groupId: string, updater: (group: MeasurementGroup) => MeasurementGroup) => {
    if (!requireEditMode("修改动态量测")) {
      return;
    }
    setMeasurements((current) => ({
      version: 1,
      groups: current.groups.map((group) => (group.id === groupId ? updater(group) : group))
    }));
    setHasUnsavedChanges(true);
  };

  const addDefaultMeasurementGroupForSelectedNode = () => {
    if (!requireEditMode("添加动态量测")) {
      return;
    }
    if (!inspectorSelectedNode || selectedMeasurementGroup || isStaticNode(inspectorSelectedNode)) {
      return;
    }
    const group = createDefaultMeasurementGroupForNode({ node: inspectorSelectedNode, config: platformMeasurementConfig });
    if (!group) {
      window.alert("当前图元类型还没有默认量测模板。");
      return;
    }
    setMeasurements((current) => ({ version: 1, groups: [...current.groups, group] }));
    setHasUnsavedChanges(true);
    writeOperationLog(`添加动态量测：${inspectorSelectedNode.name}`);
  };

  const removeSelectedMeasurementGroup = () => {
    if (!requireEditMode("删除动态量测")) {
      return;
    }
    if (!selectedMeasurementGroup) {
      return;
    }
    setMeasurements((current) => ({
      version: 1,
      groups: current.groups.filter((group) => group.id !== selectedMeasurementGroup.id)
    }));
    setHasUnsavedChanges(true);
    writeOperationLog("删除动态量测");
  };

  const updateElementTreeNodeIdentity = (nodeId: string, field: "idx" | "name", value: string) => {
    if (!requireEditMode("修改图元树参数")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    pushNodeOnlyUndoSnapshot(nodeId);
    updateGraphNodeById(nodeId, (node) =>
      field === "name" ? { ...node, name: value } : { ...node, params: { ...node.params, idx: value } }
    );
  };

  const updateElementTreeContainerChildParam = (nodeId: string, key: string, value: string) => {
    if (!requireEditMode("修改图元树参数")) {
      return;
    }
    if (!key) {
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    pushNodeOnlyUndoSnapshot(nodeId);
    updateGraphNodeById(nodeId, (node) => ({ ...node, params: { ...node.params, [key]: value } }));
  };

  const terminalVbaseFallback = (node: ModelNode, terminalIndex: number) => {
    return terminalVbaseFallbackValue(node, terminalIndex);
  };

  const updateTerminalVbase = (terminalId: string, value: string) => {
    if (!requireEditMode("修改端子参数")) {
      return;
    }
    if (!selectedNodeId) {
      return;
    }
    const numericValue = normalizeVoltageBaseInput(value);
    pushNodeOnlyUndoSnapshot(selectedNodeId);
    updateGraphNodeById(selectedNodeId, (node) => ({
      ...node,
      terminals: node.terminals.map((terminal) =>
        terminal.id === terminalId ? { ...terminal, vbase: numericValue } : terminal
      )
    }));
  };

  const renderColorEditor = (key: string, value: string, fallback = "#ffffff") => {
    const colorValue = !value || value === "transparent" ? fallback : value;
    return (
      <div className="color-field with-none">
        <input type="color" value={colorValue} disabled={isBrowseMode} onChange={(event) => updateParam(key, event.target.value)} />
        <input value={value === "transparent" ? "无颜色" : value || ""} disabled={isBrowseMode} onChange={(event) => updateParam(key, event.target.value === "无颜色" ? "transparent" : event.target.value)} />
        <button type="button" disabled={isBrowseMode} onClick={() => updateParam(key, "transparent")}>无颜色</button>
      </div>
    );
  };
  const renderParamEditor = appExtractedHandlersC.createRenderParamEditor(appRuntimeCtx);
  const renderStaticButtonActionEditor = appExtractedHandlersA.createRenderStaticButtonActionEditor(appRuntimeCtx);

  const renderParamHeader = (key: string, displayName = key, title = PARAM_LABELS[key] ?? displayName) => {
    const visibleLabel = displayName === key ? title : displayName;
    return <th title={key}>{visibleLabel}</th>;
  };

  const renderChineseParamHeader = (key: string, fallback = key) => (
    <th title={key}>{PARAM_LABELS[key] ?? fallback}</th>
  );

  const contextMenuStyle = (menu: ContextMenuState | ProjectMenuState) => {
    const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;
    const top = Math.max(8, Math.min(menu?.y ?? 8, Math.max(8, viewportHeight - 180)));
    return {
      left: menu?.x ?? 8,
      top,
      maxHeight: Math.max(120, viewportHeight - top - 8)
    };
  };

  const setSidePanelMode = (side: SidePanelSide, mode: SidePanelMode) => {
    if (side === "left") {
      setLeftPanelMode(mode);
      setLeftPanelAutoVisible(mode === "auto");
    } else {
      setRightPanelMode(mode);
      setRightPanelAutoVisible(mode === "auto");
    }
  };

  const updateAutoPanelVisibility = (side: SidePanelSide, event: Parameters<typeof nextSidePanelAutoVisible>[3]) => {
    if (sidePanelResize || validationPanelResize) {
      return;
    }
    if (side === "left" && event === "panel-leave" && projectMenu) {
      return;
    }
    if (side === "left" && event === "panel-leave" && projectRecordDragActiveRef.current) {
      return;
    }
    if (side === "left" && event === "panel-leave" && schemeRecordDragActiveRef.current) {
      return;
    }
    if (side === "left") {
      setLeftPanelAutoVisible((current) => nextSidePanelAutoVisible("left", leftPanelMode, current, event));
    } else {
      setRightPanelAutoVisible((current) => nextSidePanelAutoVisible("right", rightPanelMode, current, event));
    }
  };

  const activateInspectorFromCanvas = () => {
    updateAutoPanelVisibility("right", "canvas-activate");
  };
  const hideAutoPanelsFromWorkspace = appExtractedHandlersC.createHideAutoPanelsFromWorkspace(appRuntimeCtx);

  const interactiveStaticDrawingNeedsExplicitFinish = (kind: DeviceKind) =>
    kind === "static-polyline" || kind === "static-elbow-connector";

  const appendDistinctStaticDrawingPoint = (points: Point[], point: Point) => {
    const previous = points.at(-1);
    return previous && sameOptionalPoint(previous, point) ? points : [...points, point];
  };

  const staticDrawingPreviewPoints = (drawing: StaticDrawingState) =>
    appendDistinctStaticDrawingPoint(drawing.points, drawing.previewPoint);

  const staticDrawingPathData = (points: Point[]) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const renderStaticBoxDrawingPreview = appExtractedHandlersB.createRenderStaticBoxDrawingPreview(appRuntimeCtx);
  const startInteractiveStaticDrawing = appExtractedHandlersC.createStartInteractiveStaticDrawing(appRuntimeCtx);

  const cancelInteractiveStaticDrawing = () => {
    if (!staticDrawing) {
      return;
    }
    setStaticDrawing(null);
    setMode("select");
    writeOperationLog("取消绘制图元");
  };
  const finishInteractiveStaticDrawing = appExtractedHandlersC.createFinishInteractiveStaticDrawing(appRuntimeCtx);

  const appendStaticDrawingPoint = (point: Point, forceFinish = false) => {
    if (!staticDrawing) {
      return;
    }
    const nextPoint = clampPointToCanvas(point);
    const nextPoints = appendDistinctStaticDrawingPoint(staticDrawing.points, nextPoint);
    if (forceFinish || (!interactiveStaticDrawingNeedsExplicitFinish(staticDrawing.kind) && nextPoints.length >= 2)) {
      finishInteractiveStaticDrawing(nextPoint);
      return;
    }
    setStaticDrawing({
      ...staticDrawing,
      points: nextPoints,
      previewPoint: nextPoint
    });
  };

  const updateInteractiveStaticDrawingPreview = (point: Point) => {
    const previewPoint = clampPointToCanvas(point);
    setStaticDrawing((current) => {
      if (!current || sameOptionalPoint(current.previewPoint, previewPoint)) {
        return current;
      }
      return { ...current, previewPoint };
    });
  };

  const renderInteractiveStaticDrawingPreview = () => {
    if (!staticDrawing) {
      return null;
    }
    if (isStaticBoxLikeKind(staticDrawing.kind)) {
      return renderStaticBoxDrawingPreview();
    }
    const points = staticDrawingPreviewPoints(staticDrawing);
    return (
      <g className="static-drawing-preview">
        {points.length >= 2 && <path d={staticDrawingPathData(points)} className="static-drawing-preview-line" />}
        {staticDrawing.points.map((point, index) => (
          <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
        ))}
      </g>
    );
  };
  const startLibraryDevicePlacement = appExtractedHandlersB.createStartLibraryDevicePlacement(appRuntimeCtx);

  const startLibraryGraphTemplatePlacement = (template: GraphTemplate) => {
    if (!requireEditMode("放置模板")) {
      return;
    }
    setLibraryPlacement({ kind: "graph-template", template, previewPoint: null });
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setStaticDrawing(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMode("select");
    writeOperationLog(`进入模板绘制模式：${template.typeName} / ${template.name}`);
  };

  const cancelLibraryPlacement = () => {
    setLibraryPlacement(null);
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setMode("select");
    setContextMenu(null);
  };

  const updateLibraryPlacementPreview = (point: Point) => {
    const previewPoint = clampPointToCanvas(point);
    setLibraryPlacement((current) => {
      if (!current || (current.previewPoint && sameOptionalPoint(current.previewPoint, previewPoint))) {
        return current;
      }
      return { ...current, previewPoint };
    });
  };

  const clearLibraryPlacementPreview = () => {
    setLibraryPlacement((current) => current?.previewPoint ? { ...current, previewPoint: null } : current);
  };
  const placeLibraryDeviceAtPoint = appExtractedHandlersC.createPlaceLibraryDeviceAtPoint(appRuntimeCtx);

  const commitLibraryPlacementAtPoint = (point: Point) => {
    if (!requireEditMode("放置图元")) {
      return;
    }
    if (!libraryPlacement) {
      return;
    }
    const placement = libraryPlacement;
    setLibraryPlacement(null);
    if (placement.kind === "graph-template") {
      dropGraphTemplate(placement.template, point);
      return;
    }
    placeLibraryDeviceAtPoint(placement.template, point);
  };
  const renderLibraryPlacementPreview = appExtractedHandlersB.createRenderLibraryPlacementPreview(appRuntimeCtx);

  const startSidePanelResize = (event: PointerEvent<HTMLDivElement>, side: SidePanelSide) => {
    event.preventDefault();
    event.stopPropagation();
    setSidePanelResize({
      side,
      startX: event.clientX,
      startWidth: side === "left" ? leftPanelWidth : rightPanelWidth
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const startCanvasResize = appExtractedHandlersA.createStartCanvasResize(appRuntimeCtx);
  const startCanvasResizeFromRightOverlay = appExtractedHandlersB.createStartCanvasResizeFromRightOverlay(appRuntimeCtx);
  const startCanvasResizeFromLeftOverlay = appExtractedHandlersC.createStartCanvasResizeFromLeftOverlay(appRuntimeCtx);
  const startCanvasResizeFromBottomOverlay = appExtractedHandlersA.createStartCanvasResizeFromBottomOverlay(appRuntimeCtx);
  const startCanvasResizeFromTopOverlay = appExtractedHandlersB.createStartCanvasResizeFromTopOverlay(appRuntimeCtx);

  const startStatusbarResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setStatusbarResize({
      startY: event.clientY,
      startHeight: statusbarHeight
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startValidationPanelResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setValidationPanelResize({
      startY: event.clientY,
      startHeight: validationPanelHeight
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const renderSidePanelModeControls = appExtractedHandlersC.createRenderSidePanelModeControls(appRuntimeCtx);
  const renderSidePanelEdgeTrigger = appExtractedHandlersA.createRenderSidePanelEdgeTrigger(appRuntimeCtx);

  const normalizeScale = (value: number, fallback = 1) => normalizeScaleValue(value, fallback);
  const signedScale = (value: number, signSource: number) => Math.abs(normalizeScale(value)) * (Math.sign(signSource) || 1);
  const normalizeStaticBoxDimension = (value: number, fallback: number, max: number) => {
    const nextValue = Number.isFinite(value) ? value : fallback;
    return Math.round(clampNumber(nextValue, 4, max) * 10) / 10;
  };

  const toLocalNodePoint = (node: ModelNode, point: Point): Point => {
    const radians = (-node.rotation * Math.PI) / 180;
    const dx = point.x - node.position.x;
    const dy = point.y - node.position.y;
    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians)
    };
  };

  const snapshotSingleTransformNode = (node: ModelNode): GroupTransformNodeSnapshot => ({
    position: { ...node.position },
    rotation: node.rotation,
    scale: node.scale,
    scaleX: node.scaleX,
    scaleY: node.scaleY
  });

  const singleTransformBaseNode = (drag: SingleTransformDrag, node: ModelNode): ModelNode => ({
    ...node,
    position: { ...drag.originalNode.position },
    rotation: drag.originalNode.rotation,
    scale: drag.originalNode.scale,
    scaleX: drag.originalNode.scaleX,
    scaleY: drag.originalNode.scaleY
  });

  const singleTransformNodeUpdate = (drag: SingleTransformDrag, point: Point, store: GraphStore, snapRotation: boolean): ModelNode | null => {
    const node = store.nodeMap.get(drag.nodeId);
    if (!node || drag.kind !== "rotate") {
      return null;
    }
    const baseNode = singleTransformBaseNode(drag, node);
    const rotationDelta = rotationDeltaBetweenTransformPoints(baseNode.position, drag.startPoint, point, snapRotation);
    return {
      ...node,
      position: baseNode.position,
      rotation: normalizeRotationDegrees(baseNode.rotation + rotationDelta),
      scale: baseNode.scale,
      scaleX: baseNode.scaleX,
      scaleY: baseNode.scaleY
    };
  };

  const signedScaleFromRotatedHandleDelta = (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const startLocal = toLocalNodePoint(baseNode, drag.startPoint);
    const currentLocal = toLocalNodePoint(baseNode, point);
    const localDelta = localScaleKind === "scale-x"
      ? currentLocal.x - startLocal.x
      : currentLocal.y - startLocal.y;
    const localDirection = localScaleKind === "scale-x"
      ? drag.handleXDirection || Math.sign(startLocal.x) || 1
      : drag.handleYDirection || Math.sign(startLocal.y) || 1;
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (localDelta * localDirection * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };

  const signedScaleFromUprightHandleDelta = (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const screenDelta = localScaleKind === "scale-x"
      ? (point.x - drag.startPoint.x) * (drag.handleXDirection || 1)
      : (point.y - drag.startPoint.y) * (drag.handleYDirection || 1);
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (screenDelta * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };
  const proportionalSignedScaleFromHandleDelta = appExtractedHandlersB.createProportionalSignedScaleFromHandleDelta(appRuntimeCtx);
  const proportionalSignedScaleFromUprightHandleDelta = appExtractedHandlersC.createProportionalSignedScaleFromUprightHandleDelta(appRuntimeCtx);

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

  const edgeSnapshotFallbackPoints = (edge: Edge | undefined) =>
    edge
      ? [
          edge.sourcePoint ? { ...edge.sourcePoint } : null,
          ...(edge.manualPoints?.map((point) => ({ ...point })) ?? []),
          edge.targetPoint ? { ...edge.targetPoint } : null
        ].filter((point): point is Point => Boolean(point))
      : [];
  const currentStoredRoutePointsForEdge = appExtractedHandlersA.createCurrentStoredRoutePointsForEdge(appRuntimeCtx);

  const snapshotGroupTransformEdgeRoutes = (unit: CanvasLayoutUnit): GroupTransformEdgeRouteSnapshot[] =>
    unit.edgeIds.flatMap((edgeId) => {
      const routePoints = currentStoredRoutePointsForEdge(edgeById.get(edgeId));
      return routePoints.length >= 2
        ? [{
            edgeId,
            points: routePoints.map((point: Point) => ({ ...point }))
          }]
        : [];
    });
  const buildMirrorLayoutUnitEdgeUpdates = appExtractedHandlersB.createBuildMirrorLayoutUnitEdgeUpdates(appRuntimeCtx);
  const buildRotateLayoutUnitEdgeUpdates = appExtractedHandlersC.createBuildRotateLayoutUnitEdgeUpdates(appRuntimeCtx);
  const buildGroupTransformEdgeUpdates = appExtractedHandlersA.createBuildGroupTransformEdgeUpdates(appRuntimeCtx);

  const overlayEdgeUpdatesForTransform = (sourceEdges: Edge[], edgeUpdates: Edge[]) => {
    if (edgeUpdates.length === 0) {
      return sourceEdges;
    }
    const edgeUpdateById = new Map(edgeUpdates.map((edge) => [edge.id, edge]));
    let changed = false;
    const nextEdges = sourceEdges.map((edge) => {
      const update = edgeUpdateById.get(edge.id);
      if (!update) {
        return edge;
      }
      changed = true;
      return update;
    });
    return changed ? nextEdges : sourceEdges;
  };
  const startGroupTransformDrag = appExtractedHandlersB.createStartGroupTransformDrag(appRuntimeCtx);
  const startSingleTransformDrag = appExtractedHandlersA.createStartSingleTransformDrag(appRuntimeCtx);
  const startGroupMoveDrag = appExtractedHandlersC.createStartGroupMoveDrag(appRuntimeCtx);
  const buildGroupTransformNodeUpdates = appExtractedHandlersB.createBuildGroupTransformNodeUpdates(appRuntimeCtx);
  const rotateLayoutUnitNodeUpdates = appExtractedHandlersA.createRotateLayoutUnitNodeUpdates(appRuntimeCtx);
  const mirrorLayoutUnitNodeUpdates = appExtractedHandlersB.createMirrorLayoutUnitNodeUpdates(appRuntimeCtx);

  const busAnchorFromEvent = (node: ModelNode, event: PointerEvent<SVGGElement | SVGCircleElement>): Point | undefined => {
    if (!isBusNode(node) || !svgRef.current) {
      return undefined;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    return busAnchorFromPoint(node, point);
  };

  const busAnchorFromPoint = (node: ModelNode, point: Point): Point | undefined => {
    if (!isBusNode(node)) {
      return undefined;
    }
    return projectPointToBusCenterline(node, point);
  };

  const isPointOnBus = (node: ModelNode, point: Point) => {
    return isPointNearBus(node, point, 0);
  };

  const isPointNearBus = (node: ModelNode, point: Point, tolerance = 0) => {
    return Boolean(pointOnBusForSnap(node, point, tolerance));
  };

  const connectTargetSnapPoint = (target: ConnectTarget): Point =>
    target.point ?? getTerminalPoint(target.node, target.terminalId);
  const findRewireTargetAtPoint = appExtractedHandlersA.createFindRewireTargetAtPoint(appRuntimeCtx);
  const findConnectTargetAtPoint = appExtractedHandlersC.createFindConnectTargetAtPoint(appRuntimeCtx);
  const findRoutableLineEndpointTargetAtPoint = appExtractedHandlersB.createFindRoutableLineEndpointTargetAtPoint(appRuntimeCtx);
  const commitRoutableLineDevice = appExtractedHandlersA.createCommitRoutableLineDevice(appRuntimeCtx);
  const startRoutableLineFromTerminal = appExtractedHandlersC.createStartRoutableLineFromTerminal(appRuntimeCtx);

  const finishRoutableLineToTarget = (target: ConnectTarget) => {
    if (!routableLinePlacement?.source) {
      return false;
    }
    if (connectTargetTerminalType(target) !== routableLineTemplateTerminalType(routableLinePlacement.template)) {
      return false;
    }
    const committed = commitRoutableLineDevice(routableLinePlacement.template, routableLinePlacement.source, target);
    if (committed) {
      writeOperationLog(`线路终点：${target.node.name}`);
    }
    return committed;
  };
  const updateRoutableLineEndpointDrag = appExtractedHandlersC.createUpdateRoutableLineEndpointDrag(appRuntimeCtx);
  const startRoutableLineEndpointDrag = appExtractedHandlersB.createStartRoutableLineEndpointDrag(appRuntimeCtx);
  const finishRoutableLineEndpointDrag = appExtractedHandlersA.createFinishRoutableLineEndpointDrag(appRuntimeCtx);
  const commitNewConnectionEdge = appExtractedHandlersC.createCommitNewConnectionEdge(appRuntimeCtx);
  const finishConnectToTarget = appExtractedHandlersB.createFinishConnectToTarget(appRuntimeCtx);
  const finishRewiring = appExtractedHandlersB.createFinishRewiring(appRuntimeCtx);
  const handleDrop = appExtractedHandlersA.createHandleDrop(appRuntimeCtx);
  const handleNodePointerDown = appExtractedHandlersC.createHandleNodePointerDown(appRuntimeCtx);
  const handlePointerMove = appExtractedHandlersA.createHandlePointerMove(appRuntimeCtx);
  const startCanvasPanning = appExtractedHandlersB.createStartCanvasPanning(appRuntimeCtx);

  const handleCanvasPointerDownCapture = (event: PointerEvent<SVGSVGElement>) => {
    if (!hasCanvasSelectionModifier(event) || staticDrawing || connectSource) {
      return;
    }
  };

  const clientPointInsideRenderedCanvas = (clientX: number, clientY: number) => {
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) {
      return false;
    }
    const frameRect = frame.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    return (
      clientX >= frameRect.left &&
      clientX <= frameRect.right &&
      clientY >= frameRect.top &&
      clientY <= frameRect.bottom &&
      clientX >= svgRect.left &&
      clientX <= svgRect.right &&
      clientY >= svgRect.top &&
      clientY <= svgRect.bottom
    );
  };
  const wheelZoomAnchorFromClient = appExtractedHandlersB.createWheelZoomAnchorFromClient(appRuntimeCtx);
  const zoomCanvasFromWheelEvent = appExtractedHandlersB.createZoomCanvasFromWheelEvent(appRuntimeCtx);

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    if (!shouldZoomCanvasFromWheelEvent(event)) {
      return;
    }
    if (event.nativeEvent.defaultPrevented) {
      event.stopPropagation();
      return;
    }
    zoomCanvasFromWheelEvent(event);
  };

  const deleteSelected = () => {
    deleteSelection();
  };

  const runContextMenuAction = (action: () => void) => {
    action();
    setContextMenu(null);
    setProjectMenu(null);
  };
  const readjustMovedBusConnectionRoutes = appExtractedHandlersC.createReadjustMovedBusConnectionRoutes(appRuntimeCtx);
  const commitLayoutNodePositions = appExtractedHandlersB.createCommitLayoutNodePositions(appRuntimeCtx);

  const applySelectedNodeLayout = (
    minimumUnitCount: number,
    layoutNodes: (currentNodes: ModelNode[], currentLayoutUnits: typeof selectedLayoutUnits) => ModelNode[]
  ) => {
    if (selectedLayoutUnits.length < minimumUnitCount) {
      return;
    }
    const layoutNodeIds = Array.from(new Set(selectedLayoutUnits.flatMap((unit) => unit.nodeIds)));
    if (layoutNodeIds.length === 0) {
      return;
    }
    const arranged = layoutNodes(nodes, selectedLayoutUnits);
    commitLayoutNodePositions(layoutNodeIds, arranged);
  };
  const autoSpreadCanvasGraphics = appExtractedHandlersC.createAutoSpreadCanvasGraphics(appRuntimeCtx);
  const autoAlignCanvasGraphics = appExtractedHandlersC.createAutoAlignCanvasGraphics(appRuntimeCtx);

  const voltageBaseSetOptions = useMemo(() => {
    const values = new Set(VOLTAGE_BASE_SET_PRESETS);
    const includeValue = (value: string | undefined) => {
      const normalized = normalizeVoltageBaseInput(value);
      if (normalized) {
        values.add(normalized);
      }
    };
    const paramKeys = ["vbase", "v_base", "highVbase", "mediumVbase", "lowVbase", "neutral_vbase", "sourceVbase", "targetVbase", "i_vbase", "j_vbase", "v_set", "i_v_set", "j_v_set", "ac_v_set", "dc_v_set", "voltage"];
    for (const node of nodes) {
      for (const terminal of node.terminals) {
        includeValue(terminal.vbase);
      }
      for (const key of paramKeys) {
        includeValue(node.params[key]);
      }
    }
    return Array.from(values).sort((left, right) => Number(left) - Number(right));
  }, [nodes]);
  const defaultVoltageBaseSetValue = appExtractedHandlersC.createDefaultVoltageBaseSetValue(appRuntimeCtx);

  const voltageBaseSetTerminalRows = useMemo(() => {
    const selected = new Set(activeSelectedNodeIds);
    return nodes
      .filter((node) => selected.has(node.id) && !isBusNode(node) && !isStaticNode(node) && node.terminals.length > 1)
      .flatMap((node) => node.terminals.map((terminal, index) => ({
        nodeId: node.id,
        nodeName: node.name,
        terminalId: terminal.id,
        terminalLabel: terminal.label || `端子${index + 1}`,
        terminalType: terminal.type.toUpperCase(),
        value: voltageBaseTerminalValues[node.id]?.[terminal.id] ?? ""
      })));
  }, [activeSelectedNodeIds, nodes, voltageBaseTerminalValues]);

  const defaultVoltageBaseTerminalValues = () => {
    const fallback = defaultVoltageBaseSetValue();
    const values: VoltageBaseTerminalValuesByNodeId = {};
    const selected = new Set(activeSelectedNodeIds);
    for (const node of nodes) {
      if (!selected.has(node.id) || isBusNode(node) || isStaticNode(node) || node.terminals.length <= 1) {
        continue;
      }
      values[node.id] = Object.fromEntries(
        node.terminals.map((terminal) => [
          terminal.id,
          normalizeVoltageBaseInput(terminal.vbase) || fallback
        ])
      );
    }
    return values;
  };

  const hasVoltageBaseTerminalValues = (values: VoltageBaseTerminalValuesByNodeId) =>
    Object.values(values).some((terminalValues) =>
      Object.values(terminalValues).some((value) => value.trim().length > 0)
    );

  const setVoltageBaseTerminalValue = (nodeId: string, terminalId: string, value: string) => {
    setVoltageBaseTerminalValues((current) => ({
      ...current,
      [nodeId]: {
        ...(current[nodeId] ?? {}),
        [terminalId]: value
      }
    }));
  };

  const voltageBaseSetPreviewByScope = useMemo<Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>>(() => {
    if (!voltageBaseSetDialogOpen) {
      return {};
    }
    if (voltageBaseSetMode === "terminal") {
      if (!hasVoltageBaseTerminalValues(voltageBaseTerminalValues)) {
        return {};
      }
      return Object.fromEntries(
        VOLTAGE_BASE_SET_SCOPES.map((scope) => [
          scope,
          setVoltageBaseTerminalValuesForScope(nodes, edges, voltageBaseTerminalValues, scope)
        ])
      ) as Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>;
    }
    if (voltageBaseSetValue.trim().length === 0) {
      return {};
    }
    return Object.fromEntries(
      VOLTAGE_BASE_SET_SCOPES.map((scope) => [
        scope,
        setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim())
      ])
    ) as Partial<Record<VoltageBaseSetScope, ReturnType<typeof setVoltageBaseValuesForScope>>>;
  }, [activeSelectedNodeIds, edges, nodes, voltageBaseSetDialogOpen, voltageBaseSetMode, voltageBaseSetValue, voltageBaseTerminalValues]);

  const voltageBaseSetResultForScope = (scope: VoltageBaseSetScope) => {
    if (voltageBaseSetMode === "terminal") {
      return hasVoltageBaseTerminalValues(voltageBaseTerminalValues)
        ? voltageBaseSetPreviewByScope[scope] ?? setVoltageBaseTerminalValuesForScope(nodes, edges, voltageBaseTerminalValues, scope)
        : { nodes, nodeUpdates: [], targetNodeIds: [], changedNodeIds: [] };
    }
    return voltageBaseSetValue.trim().length === 0
      ? { nodes, nodeUpdates: [], targetNodeIds: [], changedNodeIds: [] }
      : voltageBaseSetPreviewByScope[scope] ?? setVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope, voltageBaseSetValue.trim());
  };

  const openVoltageBaseSetDialog = () => {
    if (!requireEditMode("设置电压基值")) {
      return;
    }
    const terminalValues = defaultVoltageBaseTerminalValues();
    setVoltageBaseSetScope("selected");
    setVoltageBaseSetValue(defaultVoltageBaseSetValue());
    setVoltageBaseTerminalValues(terminalValues);
    setVoltageBaseSetMode(Object.keys(terminalValues).length > 0 ? "terminal" : "uniform");
    setVoltageBaseSetDialogOpen(true);
  };
  const confirmVoltageBaseSetDialog = appExtractedHandlersB.createConfirmVoltageBaseSetDialog(appRuntimeCtx);

  const voltageBaseClearPreviewByScope = useMemo<Partial<Record<VoltageBaseClearScope, ReturnType<typeof clearVoltageBaseValuesForScope>>>>(() => {
    if (!voltageBaseClearDialogOpen) {
      return {};
    }
    return Object.fromEntries(
      VOLTAGE_BASE_CLEAR_SCOPES.map((scope) => [
        scope,
        clearVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope)
      ])
    ) as Partial<Record<VoltageBaseClearScope, ReturnType<typeof clearVoltageBaseValuesForScope>>>;
  }, [activeSelectedNodeIds, edges, nodes, voltageBaseClearDialogOpen]);

  const voltageBaseClearResultForScope = (scope: VoltageBaseClearScope) =>
    voltageBaseClearPreviewByScope[scope] ?? clearVoltageBaseValuesForScope(nodes, edges, activeSelectedNodeIds, scope);

  const openVoltageBaseClearDialog = () => {
    if (!requireEditMode("清空电压基值")) {
      return;
    }
    setVoltageBaseClearScope(activeSelectedNodeIds.length > 0 ? "selected" : "all");
    setVoltageBaseClearDialogOpen(true);
  };

  const confirmVoltageBaseClearDialog = () => {
    if (!requireEditMode("清空电压基值")) {
      setVoltageBaseClearDialogOpen(false);
      return;
    }
    const result = voltageBaseClearResultForScope(voltageBaseClearScope);
    const scopeLabel = VOLTAGE_BASE_CLEAR_SCOPE_LABELS[voltageBaseClearScope];
    if (result.changedNodeIds.length === 0) {
      writeOperationLog(`${scopeLabel}没有可清空的电压基值`);
      setVoltageBaseClearDialogOpen(false);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
    patchGraphNodes(result.nodeUpdates);
    writeOperationLog(`清空电压基值（${scopeLabel}）：${result.changedNodeIds.length}/${result.targetNodeIds.length} 个设备`);
    setVoltageBaseClearDialogOpen(false);
  };

  const connectionRedrawViewportBounds = () => {
    const visible = canvasVisibleViewBoxRef.current.width > 0 && canvasVisibleViewBoxRef.current.height > 0
      ? canvasVisibleViewBoxRef.current
      : viewBox;
    return {
      left: visible.x,
      right: visible.x + visible.width,
      top: visible.y,
      bottom: visible.y + visible.height
    };
  };
  const connectionRedrawEdgeIdsForScope = appExtractedHandlersC.createConnectionRedrawEdgeIdsForScope(appRuntimeCtx);
  const redrawConnectionRoutes = appExtractedHandlersB.createRedrawConnectionRoutes(appRuntimeCtx);

  const openConnectionRedrawDialog = () => {
    if (!requireEditMode("重绘连接线")) {
      return;
    }
    setConnectionRedrawScope(activeSelectedEdgeIds.some((edgeId) => activeLayerEdgeIdSet.has(edgeId)) ? "selected" : "viewport");
    setConnectionRedrawDialogOpen(true);
  };

  const confirmConnectionRedrawDialog = () => {
    if (!requireEditMode("重绘连接线")) {
      setConnectionRedrawDialogOpen(false);
      return;
    }
    redrawConnectionRoutes(connectionRedrawScope);
    setConnectionRedrawDialogOpen(false);
  };

  const alignSelected = (direction: AlignMode) => {
    if (!requireEditMode("对齐图元")) {
      return;
    }
    applySelectedNodeLayout(2, (currentNodes, currentLayoutUnits) => alignNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 2) {
      const labelByDirection: Record<AlignMode, string> = {
        horizontal: "横向",
        vertical: "纵向",
        left: "左",
        right: "右",
        top: "上",
        bottom: "下"
      };
      writeOperationLog(`${labelByDirection[direction]}对齐 ${selectedLayoutUnitCount} 个单元`);
    }
  };

  const distributeSelected = (direction: "horizontal" | "vertical") => {
    if (!requireEditMode("分布图元")) {
      return;
    }
    applySelectedNodeLayout(3, (currentNodes, currentLayoutUnits) => distributeNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 3) {
      writeOperationLog(`${direction === "horizontal" ? "横向" : "纵向"}平均 ${selectedLayoutUnitCount} 个单元`);
    }
  };
  const loadSavedProject = appExtractedHandlersC.createLoadSavedProject(appRuntimeCtx);

  useEffect(() => {
    if (!backendProjectLoadRequest) {
      return;
    }
    loadSavedProject(backendProjectLoadRequest.project, backendProjectLoadRequest.schemeId);
    clearBackendProjectLoadRequest(backendProjectLoadRequest.id);
  }, [backendProjectLoadRequest]);

  const requestUnsavedChangeAction = (action: UnsavedChangeAction) => {
    if (!saveRequired) {
      loadSavedProject(action.project, action.schemeId);
      return;
    }
    setPendingUnsavedAction(action);
  };

  const requestLoadSavedProject = (project: SavedProjectRecord, schemeId = findSchemeForProject(project.id)?.id ?? "") => {
    requestUnsavedChangeAction({
      kind: "load-project",
      project,
      schemeId,
      label: `切换到模型“${project.name}”`
    });
  };

  const resolveUnsavedChangeAction = (resolution: "discard" | "save" | "cancel") => {
    const action = pendingUnsavedAction;
    if (!action || resolution === "cancel") {
      setPendingUnsavedAction(null);
      return;
    }
    if (resolution === "save") {
      saveCurrentProject();
    }
    setPendingUnsavedAction(null);
    if (action.kind === "load-project") {
      loadSavedProject(action.project, action.schemeId);
    }
  };

  const setActiveLayer = (layerId: string) => {
    if (!requireEditMode("激活图层")) {
      return;
    }
    pushUndoSnapshot();
    setActiveLayerId(layerId);
    setLayers((current) => current.map((layer) => layer.id === layerId ? { ...layer, visible: true } : layer));
    writeOperationLog(`激活图层：${layers.find((layer) => layer.id === layerId)?.name ?? layerId}`);
  };

  const nextDefaultModelLayerName = () => {
    const usedNames = new Set(layers.map((layer) => layer.name.trim()));
    let index = 1;
    while (usedNames.has(`图层${index}`)) {
      index += 1;
    }
    return `图层${index}`;
  };

  const addModelLayer = () => {
    if (!requireEditMode("新增图层")) {
      return;
    }
    pushUndoSnapshot();
    const layer = createModelLayer(nextDefaultModelLayerName(), layers);
    setLayers((current) => [...current, layer]);
    setActiveLayerId(layer.id);
    writeOperationLog(`新增图层：${layer.name}`);
  };

  const toggleModelLayerVisibility = (layerId: string) => {
    if (!requireEditMode("修改图层显示状态")) {
      return;
    }
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      return;
    }
    if (layer.id === activeLayerId && layer.visible) {
      window.alert("激活图层必须显示，不能隐藏。");
      return;
    }
    pushUndoSnapshot();
    setLayers((current) => current.map((item) => item.id === layerId ? { ...item, visible: !item.visible } : item));
  };

  const moveModelLayer = (layerId: string, direction: -1 | 1) => {
    if (!requireEditMode("调整图层顺序")) {
      return;
    }
    const index = layers.findIndex((layer) => layer.id === layerId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= layers.length) {
      return;
    }
    pushUndoSnapshot();
    setLayers((current) => {
      const next = [...current];
      const [layer] = next.splice(index, 1);
      next.splice(targetIndex, 0, layer);
      return next;
    });
  };
  const deleteModelLayer = appExtractedHandlersB.createDeleteModelLayer(appRuntimeCtx);
  const renderLayerManager = appExtractedHandlersB.createRenderLayerManager(appRuntimeCtx);
  const saveCurrentProject = appExtractedHandlersA.createSaveCurrentProject(appRuntimeCtx);
  const createBlankProject = appExtractedHandlersC.createCreateBlankProject(appRuntimeCtx);
  const locateTopologyError = appExtractedHandlersB.createLocateTopologyError(appRuntimeCtx);
  const runTopologyCalculation = appExtractedHandlersC.createRunTopologyCalculation(appRuntimeCtx);

  const getEdgeEndpointPoint = (edge: Edge, endpoint: EdgeEndpoint): Point | null => {
    const node = nodeById.get(endpoint === "source" ? edge.sourceId : edge.targetId);
    const terminalId = endpoint === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
    const endpointPoint = endpoint === "source" ? edge.sourcePoint : edge.targetPoint;
    if (!node) {
      return endpointPoint ?? null;
    }
    return getModelEdgeEndpointPoint(node, endpointPoint, terminalId);
  };

  const centerViewOnPoint = (point: Point) => {
    const visible = canvasVisibleViewBoxRef.current;
    setViewBox(clampViewBoxToCanvas({
      x: point.x - (visible.width > 0 ? visible.width : viewBox.width) / 2,
      y: point.y - (visible.height > 0 ? visible.height : viewBox.height) / 2,
      width: viewBox.width,
      height: viewBox.height
    }));
  };

  const centerViewBoxOnPoint = (point: Point) => {
    setViewBox((current) =>
      {
        const visible = canvasVisibleViewBoxRef.current;
        return clampViewBoxToCanvas({
          x: point.x - (visible.width > 0 ? visible.width : current.width) / 2,
          y: point.y - (visible.height > 0 ? visible.height : current.height) / 2,
          width: current.width,
          height: current.height
        });
      }
    );
  };
  const zoomViewportAtCenter = appExtractedHandlersB.createZoomViewportAtCenter(appRuntimeCtx);

  const resetViewport = () => {
    setViewBox(normalizeViewBoxToCanvas({ x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height }, canvasBounds));
  };

  const fitWholeCanvasToFrame = () => {
    const nextViewBox = fitWholeCanvasViewBox(canvasBounds, canvasFrameRef.current);
    skipNextCanvasScrollSyncRef.current = true;
    setViewBox(nextViewBox);
    setCanvasNoScrollOffset({ x: 0, y: 0 });
    setCanvasVisibleViewBox(canvasFullViewBox);
    window.requestAnimationFrame(() => {
      const frame = canvasFrameRef.current;
      if (!frame) {
        return;
      }
      centerCanvasFrameScrollPosition(frame);
      scheduleCanvasVisibleViewBoxUpdate();
    });
  };

  const fitWholeCanvasFromBlankDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || staticDrawing || connectSource || routableLinePlacement) {
      return;
    }
    const target = event.target as Element | null;
    if (target?.closest(".diagram-node, .connection-group, .edge-endpoint-handle, .manual-segment-handle, .transform-handles, .group-selection-overlay, .canvas-resize-handles")) {
      return;
    }
    if (svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      if (findConnectionRouteHitAtPoint(pointer)) {
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    setMarquee(null);
    fitWholeCanvasToFrame();
  };
  const fitViewToBounds = appExtractedHandlersA.createFitViewToBounds(appRuntimeCtx);

  const fitViewToContent = () => {
    fitViewToBounds(calculateModelGeometryBounds(visibleNodes, routedEdges, 0), 120);
  };
  const focusElementTreeItem = appExtractedHandlersB.createFocusElementTreeItem(appRuntimeCtx);

  const setEdgeManualPoints = (edgeId: string, manualPoints: Point[]) => {
    if (!requireEditMode("修改连接线路径")) {
      return;
    }
    const normalizedManualPoints = manualPoints.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    const edge = edgeById.get(edgeId);
    if (!edge || sameOptionalPointList(edge.manualPoints, normalizedManualPoints)) {
      return;
    }
    markRouteEdgesDirty([edgeId]);
    markStoredRouteEdgesDirty([edgeId]);
    patchGraphEdges([{ ...edge, manualPoints: normalizedManualPoints }]);
  };

  const routeManualPoints = (routePoints: Point[]) => {
    const manualPoints = routePoints.length > 4 ? routePoints.slice(2, -2) : routePoints.slice(1, -1);
    return manualPoints.map((point) => ({ ...point }));
  };

  const finishManualPathDrag = () => {
    if (!manualPathDrag) {
      return;
    }
    if (manualPathDrag.historyCaptured && manualPathDrag.previewRoutePoints?.length) {
      setEdgeManualPoints(manualPathDrag.edgeId, routeManualPoints(manualPathDrag.previewRoutePoints));
    }
    setManualPathDrag(null);
  };

  const tidySelectedEdgeRoute = () => {
    if (!requireEditMode("整理连接线")) {
      return;
    }
    if (!selectedEdge || !selectedRoutedEdge) {
      return;
    }
    const tidiedPoints = tidyOrthogonalRoute(selectedRoutedEdge.points, { blockers: nodes });
    const nextManualPoints = routeManualPoints(tidiedPoints);
    const currentManualPoints = selectedEdge.manualPoints ?? [];
    const unchanged =
      currentManualPoints.length === nextManualPoints.length &&
      currentManualPoints.every((point, index) => point.x === nextManualPoints[index]?.x && point.y === nextManualPoints[index]?.y);
    if (unchanged) {
      return;
    }
    pushUndoSnapshot();
    setEdgeManualPoints(selectedEdge.id, nextManualPoints);
  };

  const addManualBendToSelectedEdgeCenter = () => {
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (!selectedEdge || !selectedRoutedEdge) {
      return;
    }
    const midpoint = routeMidpoint(selectedRoutedEdge.points);
    if (!midpoint) {
      return;
    }
    insertManualBendFromPointer(selectedEdge.id, selectedRoutedEdge.points, midpoint);
  };
  const openEdgeContextMenu = appExtractedHandlersC.createOpenEdgeContextMenu(appRuntimeCtx);

  const captureCanvasPointer = (pointerId: number) => {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
  };
  const startManualSegmentDrag = appExtractedHandlersA.createStartManualSegmentDrag(appRuntimeCtx);
  const startManualPointDrag = appExtractedHandlersB.createStartManualPointDrag(appRuntimeCtx);

  const routeSegmentPointerDistance = (point: Point, from: Point, to: Point) => {
    if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      if (point.x >= minX && point.x <= maxX) {
        return Math.abs(point.y - from.y);
      }
    } else if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      if (point.y >= minY && point.y <= maxY) {
        return Math.abs(point.x - from.x);
      }
    }
    return Math.min(
      Math.hypot(point.x - from.x, point.y - from.y),
      Math.hypot(point.x - to.x, point.y - to.y)
    );
  };

  const findEditableRouteSegmentIndex = (routePoints: Point[], point: Point) => {
    const candidates = routePoints
      .slice(1, -2)
      .map((from, offset) => {
        const segmentIndex = offset + 1;
        const to = routePoints[segmentIndex + 1];
        return { from, to, segmentIndex };
      })
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    const fallbackCandidates = candidates.length > 0
      ? candidates
      : routePoints.slice(0, -1).map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
        .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    return fallbackCandidates.reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
      const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
      return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
    }, null)?.index ?? -1;
  };

  const findBendInsertRouteSegmentIndex = (routePoints: Point[], point: Point) =>
    routePoints
      .slice(0, -1)
      .map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y))
      .reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
        const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
        return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
      }, null)?.index ?? -1;

  const connectionHitTolerance = () => {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!svg || !rect || rect.width <= 0 || rect.height <= 0) {
      return 16;
    }
    const svgViewBox = svg.viewBox.baseVal;
    const xTolerance = (svgViewBox.width / rect.width) * CONNECTION_HIT_SCREEN_TOLERANCE;
    const yTolerance = (svgViewBox.height / rect.height) * CONNECTION_HIT_SCREEN_TOLERANCE;
    return Math.max(xTolerance, yTolerance);
  };
  const findConnectionRouteHitAtPoint = appExtractedHandlersC.createFindConnectionRouteHitAtPoint(appRuntimeCtx);

  const insertManualBendAtPoint = (edgeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = insertOrthogonalRouteBend(routePoints, segmentIndex, clickPoint, canvasBounds);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints));
  };

  const insertManualBendFromPointer = (edgeId: string, routePoints: Point[], clickPoint: Point) => {
    const segmentIndex = findBendInsertRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, clickPoint);
      return true;
    }
    return false;
  };

  const addManualBendFromContextMenu = () => {
    const edgeId = contextMenu?.edgeId ?? selectedEdgeId;
    const routePoints = contextMenu?.routePoints ?? selectedRoutedEdge?.points;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!edgeId || !routePoints?.length || !point) {
      return;
    }
    insertManualBendFromPointer(edgeId, routePoints, point);
  };
  const insertManualBendFromEdgePath = appExtractedHandlersA.createInsertManualBendFromEdgePath(appRuntimeCtx);
  const handleEdgePathPointerDown = appExtractedHandlersB.createHandleEdgePathPointerDown(appRuntimeCtx);

  const deleteManualBendPoint = (edgeId: string, routePointIndex: number, routePoints: Point[]) => {
    if (!requireEditMode("删除连接线拐点")) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints));
  };

  const startConnectFromTerminal = (node: ModelNode, terminalId: string, point?: Point) => {
    if (!requireEditMode("建立连接线")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const sourcePoint = point ?? getModelEdgeEndpointPoint(node, undefined, terminalId);
    const nextConnectSource: NonNullable<typeof connectSource> = point ? { nodeId: node.id, terminalId, point } : { nodeId: node.id, terminalId };
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setConnectSource(nextConnectSource);
    applyConnectPreviewState(sourcePoint, false, null, null, nextConnectSource);
    setMode("connect");
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
  };
  const finishTerminalPress = appExtractedHandlersC.createFinishTerminalPress(appRuntimeCtx);
  const handleTerminalPointerDown = appExtractedHandlersA.createHandleTerminalPointerDown(appRuntimeCtx);

  const ensureSavedBeforeExport = () => {
    if (canExportCurrentModel) {
      return true;
    }
    window.alert("当前模型存在未保存修改，请先保存后再导出文件。");
    return false;
  };
  const exportSvg = appExtractedHandlersC.createExportSvg(appRuntimeCtx);
  const exportEFile = appExtractedHandlersB.createExportEFile(appRuntimeCtx);

  const safeFilePart = (name: string) => name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";

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

  const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const isProjectFilePayload = (value: unknown): value is ProjectFile => {
    if (!isObjectRecord(value)) {
      return false;
    }
    return value.version === 1 && Array.isArray(value.nodes) && Array.isArray(value.edges);
  };
  const createImportedSchemeRecord = appExtractedHandlersC.createCreateImportedSchemeRecord(appRuntimeCtx);

  const exportProjectRecordFile = async (project: SavedProjectRecord) => {
    const projectFile = project.id === activeProjectKey ? currentProject() : project.project;
    const exportName = project.id === activeProjectKey ? projectName : project.name;
    await saveTextFile({
      filename: `${safeFilePart(exportName)}.json`,
      text: serializeProject(projectFile),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"]
    });
    writeOperationLog(`导出模型文件：${exportName}.json`);
  };

  const exportCurrentModelFile = async () => {
    await saveTextFile({
      filename: `${safeFilePart(projectName)}.json`,
      text: serializeProject(currentProject()),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"]
    });
    writeOperationLog(`导出当前模型文件：${projectName}.json`);
  };

  const openModelImportFilePicker = (targetSchemeId = "") => {
    if (!requireEditMode("导入模型")) {
      return;
    }
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    modelImportInputRef.current?.click();
  };

  const openSchemeImportFilePicker = (parentSchemeId = "") => {
    if (!requireEditMode("导入方案")) {
      return;
    }
    schemeImportParentSchemeIdRef.current = parentSchemeId;
    schemeImportInputRef.current?.click();
  };
  const mergeImportedSchemeIntoExisting = appExtractedHandlersB.createMergeImportedSchemeIntoExisting(appRuntimeCtx);

  const commitImportedSchemeRecord = (importedScheme: SavedSchemeRecord, parentSchemeId = "") => {
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, importedScheme));
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    setExpandedSchemeIds((current) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
    selectSingleScheme(importedScheme.id);
    writeOperationLog(`导入方案：${importedScheme.name}`);
  };
  const importSchemeFile = appExtractedHandlersC.createImportSchemeFile(appRuntimeCtx);

  const commitImportedModelRecord = (targetScheme: SavedSchemeRecord, importedRecord: SavedProjectRecord) => {
    setSchemes((current) => {
      const fallback = current.length > 0 ? current : [targetScheme];
      const nextSchemes = findSavedSchemeById(fallback, targetScheme.id) ? fallback : [...fallback, targetScheme];
      return upsertSavedProjectInScheme(nextSchemes, targetScheme.id, importedRecord);
    });
    setExpandedSchemeIds((current) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    loadSavedProject(importedRecord, targetScheme.id);
    writeOperationLog(`导入模型文件：${importedRecord.name}`);
  };
  const importModelFile = appExtractedHandlersB.createImportModelFile(appRuntimeCtx);
  const resolveDuplicateSchemeImport = appExtractedHandlersC.createResolveDuplicateSchemeImport(appRuntimeCtx);
  const resolveDuplicateModelImport = appExtractedHandlersB.createResolveDuplicateModelImport(appRuntimeCtx);
  const exportSchemeRecord = appExtractedHandlersA.createExportSchemeRecord(appRuntimeCtx);
  const chooseImage = appExtractedHandlersC.createChooseImage(appRuntimeCtx);
  const applyExistingImage = appExtractedHandlersB.createApplyExistingImage(appRuntimeCtx);
  const clearSelectedImage = appExtractedHandlersC.createClearSelectedImage(appRuntimeCtx);

  const clearSelectedImageForNode = (nodeId: string, target: "background" | "foreground") => {
    if (!requireEditMode("清除图片")) {
      return;
    }
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node) => ({
      ...node,
      params:
        target === "foreground"
          ? { ...node.params, foregroundImage: "", foregroundImageAssetId: "" }
          : { ...node.params, backgroundImage: "", backgroundImageAssetId: "" }
    }));
  };
  const createImageFolder = appExtractedHandlersA.createCreateImageFolder(appRuntimeCtx);
  const renameImageFolder = appExtractedHandlersB.createRenameImageFolder(appRuntimeCtx);
  const deleteImageFolder = appExtractedHandlersA.createDeleteImageFolder(appRuntimeCtx);

  const startProjectRecordDrag = (event: DragEvent<HTMLDivElement>, projectId: string) => {
    projectRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/project-id", projectId);
    event.dataTransfer.effectAllowed = "move";
  };

  const finishProjectRecordDrag = () => {
    projectRecordDragActiveRef.current = false;
  };

  const startSchemeRecordDrag = (event: DragEvent<HTMLDivElement>, schemeId: string) => {
    schemeRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/scheme-id", schemeId);
    event.dataTransfer.effectAllowed = "move";
  };

  const finishSchemeRecordDrag = () => {
    schemeRecordDragActiveRef.current = false;
  };

  const customDraftTerminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
  const customDraftTerminalAssociations = normalizeContainerTerminalAssociations(
    customDraftTerminalTypes,
    customDeviceDraft.terminalAssociations,
    customDeviceDraft.terminalCount
  );
  const customDraftDefaultParams = customDefaultDefinitions(customDraftTerminalTypes, {
    isContainer: customDeviceDraft.isContainer,
    terminalAssociations: customDraftTerminalAssociations
  });
  const customDevicePreviewLabel = customDeviceDraft.componentName.trim() || customDeviceDraft.componentType || "Unit";
  const customDevicePreviewImage =
    customDeviceDraft.backgroundImage ||
    generateCustomDeviceImage(customDevicePreviewLabel, customDraftTerminalTypes.length > 0 ? customDraftTerminalTypes : ["ac"]);

  const loadDefinitionTemplateDraft = (template: DeviceTemplate) => {
    setSelectedDefinitionKind(template.kind);
    const group = normalizeAttributeLibraryName(template.attributeLibrary);
    setExpandedDefinitionGroups((current) => (current.includes(group) ? current : [...current, group]));
    setDefinitionDraftRows(createDefinitionDraftRows(template));
    setDefinitionDraftSection(resolveTemplateComponentType(template));
    setDefinitionDraftError("");
  };

  const openDeviceDefinitionDialog = () => {
    if (!requireEditMode("修改元件")) {
      return;
    }
    const template = selectedDefinitionTemplate ?? libraryTemplates[0];
    if (template) {
      loadDefinitionTemplateDraft(template);
    }
    setDeviceDefinitionDialogOpen(true);
  };

  const toggleDefinitionGroup = (attributeLibrary: AttributeLibrary) => {
    setExpandedDefinitionGroups((current) =>
      current.includes(attributeLibrary) ? current.filter((item) => item !== attributeLibrary) : [...current, attributeLibrary]
    );
  };

  const toggleElementTreeGroup = (typeKey: string) => {
    setCollapsedElementTreeGroups((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
    );
  };

  const updateDefinitionDraftRow = (rowId: string, patch: Partial<DeviceDefinitionDraftRow>) => {
    setDefinitionDraftRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    setDefinitionDraftError("");
  };

  const addDefinitionDraftRow = () => {
    setDefinitionDraftRows((current) => [
      ...current,
      {
        id: deviceDefinitionRowId(),
        cnName: "",
        enName: "",
        valueType: "string",
        typicalValue: ""
      }
    ]);
    setDefinitionDraftError("");
  };

  const deleteDefinitionDraftRow = (rowId: string) => {
    if (!requireEditMode("修改元件定义")) {
      return;
    }
    setDefinitionDraftRows((current) => current.filter((row) => row.id !== rowId || row.readonly));
    setDefinitionDraftError("");
  };
  const saveDeviceDefinitionDraft = appExtractedHandlersB.createSaveDeviceDefinitionDraft(appRuntimeCtx);

  const resetDeviceDefinitionDraft = () => {
    if (!requireEditMode("重置元件定义")) {
      return;
    }
    if (!selectedDefinitionBaseTemplate) {
      return;
    }
    loadDefinitionTemplateDraft(selectedDefinitionBaseTemplate);
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[selectedDefinitionBaseTemplate.kind];
      return next;
    });
  };
  const updateCustomDraftTerminalCount = appExtractedHandlersC.createUpdateCustomDraftTerminalCount(appRuntimeCtx);

  const chooseCustomDeviceBackground = (event: ChangeEvent<HTMLInputElement>) => {
    if (!requireEditMode("选择元件图片")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomDeviceDraft((current) => ({ ...current, backgroundImage: String(reader.result ?? ""), error: "" }));
    };
    reader.readAsDataURL(file);
  };

  const customComponentTreeTypeKey = (attributeLibraryName: string, componentType: string) =>
    `${normalizeAttributeLibraryName(attributeLibraryName)}::${normalizeComponentTypeName(componentType)}`;

  const ensureCustomComponentTreeExpanded = (attributeLibraryName: string, componentType?: string) => {
    const normalizedLibrary = normalizeAttributeLibraryName(attributeLibraryName);
    setCollapsedCustomComponentTreeLibraries((current) => current.filter((item) => normalizeAttributeLibraryName(item) !== normalizedLibrary));
    if (componentType) {
      const typeKey = customComponentTreeTypeKey(normalizedLibrary, componentType);
      setCollapsedCustomComponentTreeTypes((current) => current.filter((item) => item !== typeKey));
    }
  };

  const toggleCustomComponentTreeLibrary = (attributeLibraryName: string) => {
    const normalizedLibrary = normalizeAttributeLibraryName(attributeLibraryName);
    setCollapsedCustomComponentTreeLibraries((current) =>
      current.some((item) => normalizeAttributeLibraryName(item) === normalizedLibrary)
        ? current.filter((item) => normalizeAttributeLibraryName(item) !== normalizedLibrary)
        : [...current, normalizedLibrary]
    );
  };

  const toggleCustomComponentTreeType = (attributeLibraryName: string, componentType: string) => {
    const typeKey = customComponentTreeTypeKey(attributeLibraryName, componentType);
    setCollapsedCustomComponentTreeTypes((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
    );
  };

  const selectCustomAttributeLibrary = (attributeLibraryName: string, options: { expand?: boolean } = {}) => {
    const group = normalizeAttributeLibraryName(attributeLibraryName);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group);
    }
    setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName: group });
    setEditingCustomDeviceKind("");
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName: group,
      componentType: defaultComponentTypeForAttributeLibrary(group),
      componentName: "",
      error: ""
    }));
  };

  const selectCustomComponentType = (attributeLibraryName: string, sectionName: string, options: { expand?: boolean } = {}) => {
    const group = normalizeAttributeLibraryName(attributeLibraryName);
    const section = normalizeComponentTypeName(sectionName);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group, section);
    }
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName: group, section });
    setEditingCustomDeviceKind("");
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName: group,
      componentType: section,
      componentName: "",
      error: ""
    }));
  };
  const selectCustomComponentTemplate = appExtractedHandlersA.createSelectCustomComponentTemplate(appRuntimeCtx);

  const startCustomComponentCreate = () => {
    if (!requireEditMode("新建元件")) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(customComponentTreeSelection.attributeLibraryName);
    const section =
      customComponentTreeSelection.kind === "componentType" || customComponentTreeSelection.kind === "component"
        ? customComponentTreeSelection.section
        : defaultComponentTypeForAttributeLibrary(attributeLibraryName);
    setEditingCustomDeviceKind("");
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName, section });
    setCustomDeviceDraft({
      ...createEmptyCustomDeviceDraft(attributeLibraryName),
      componentType: section,
      componentName: "",
      error: ""
    });
  };

  const nextCustomAttributeLibraryName = () => {
    const existingGroups = new Set(attributeLibraries.map((group) => group.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `属性库${index}`;
      if (!existingGroups.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `属性库${Date.now()}`;
  };
  const createCustomAttributeLibrary = appExtractedHandlersC.createCreateCustomAttributeLibrary(appRuntimeCtx);
  const deleteCustomAttributeLibrary = appExtractedHandlersA.createDeleteCustomAttributeLibrary(appRuntimeCtx);

  const nextCustomComponentTypeName = () => {
    const existingTypes = new Set(componentTypeOptions.map((componentType) => componentType.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `CustomDevice${index}`;
      if (!existingTypes.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `CustomDevice${Date.now()}`;
  };
  const createCustomComponentType = appExtractedHandlersB.createCreateCustomComponentType(appRuntimeCtx);
  const deleteCustomComponentType = appExtractedHandlersC.createDeleteCustomComponentType(appRuntimeCtx);
  const renameSelectedCustomDeviceTreeItem = appExtractedHandlersB.createRenameSelectedCustomDeviceTreeItem(appRuntimeCtx);
  const deleteSelectedCustomDeviceTreeItem = appExtractedHandlersC.createDeleteSelectedCustomDeviceTreeItem(appRuntimeCtx);

  const nextCustomTemplateKind = (componentType: string) => {
    const safeType = componentType.replace(/[^A-Za-z0-9_]+/g, "_") || "CustomDevice";
    const existingKinds = new Set(libraryTemplates.map((template) => template.kind.toLowerCase()));
    const base = `custom-${safeType}`;
    if (!existingKinds.has(base.toLowerCase())) {
      return base;
    }
    for (let index = 2; index <= 999; index += 1) {
      const candidate = `${base}-${index}`;
      if (!existingKinds.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `${base}-${Date.now()}`;
  };
  const saveCustomDeviceTemplate = appExtractedHandlersA.createSaveCustomDeviceTemplate(appRuntimeCtx);

  const {
    detailedSelectedEdgeIdSet,
    detailedViewportNodes,
    lodCanvasNodeChunks,
    lodCanvasRouteChunks,
    lodSelectedNodeMarkup,
    renderViewportRoutedEdges,
    useSimplifiedCanvasNodes,
    useSimplifiedCanvasRoutes,
    useSimplifiedSelectedCanvasNodes
  } = useCanvasLodRenderLayers({
    activeLayerEdgeIdSet,
    activeLayerNodeIdSet,
    activeSelectedEdgeSet,
    cachedConnectionStrokeColor,
    canvasScrollScale,
    colorDisplayMode,
    colorPalette,
    connectSource,
    currentZoomPercent,
    displaySelectedNodeIds,
    dragAffectedEdgeIdSet,
    dragOverlayEdgeIdSet,
    dragPreviewEdgeIdSet,
    draggingDelta,
    edgeById,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewNodeIdSet,
    isBrowseMode,
    isEditMode,
    libraryTemplateByKind,
    lodCanvasNodeChunkCacheRef,
    lodCanvasRouteChunkCacheRef,
    manualPathDrag,
    multiNodeDragging,
    nodeById,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodeUprightSelectionOutlineRect,
    nodeUsesUprightStaticSelectionOutline,
    rewiring,
    savedRouteCrossingArcsReady,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIdSet,
    singleNodeDragging,
    staticDrawing,
    terminalPress,
    terminalPressPreviewEdgeIdSet,
    transformDrag,
    viewportNodes,
    viewportRoutedEdges,
    visibleNodeById
  });
  const lodNodeFromEvent = (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
    const target = event.target instanceof Element
      ? event.target.closest(".lod-node[data-node-id]")
      : null;
    const nodeId = target?.getAttribute("data-node-id") ?? "";
    return nodeId ? nodeById.get(nodeId) : undefined;
  };
  const handleLodNodePointerDown = (event: PointerEvent<SVGGElement>) => {
    const node = lodNodeFromEvent(event);
    if (node) {
      handleNodePointerDown(event, node);
    }
  };
  const handleLodNodeContextMenu = appExtractedHandlersC.createHandleLodNodeContextMenu(appRuntimeCtx);
  const handleLodNodeDoubleClick = (event: MouseEvent<SVGGElement>) => {
    const node = lodNodeFromEvent(event);
    if (!node) {
      return;
    }
    event.stopPropagation();
    if (!activeLayerNodeIdSet.has(node.id) || isBusNode(node)) {
      return;
    }
    selectCanvasGraphics([node.id], []);
    setImageTarget({ kind: "node", nodeId: node.id });
  };
  const connectPreviewDom = connectPreviewDomRef.current;
  const layerAssignmentUnchanged = activeSelectedNodeIds.length > 0 && activeSelectedNodeIds.every(
    (nodeId) => (nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerAssignmentTargetId
  );
  const {
    selectedCanvasBounds,
    selectedFloatingToolbarBounds
  } = useCanvasSelectionBounds({
    activeSelectedEdgeIds,
    activeSelectedNodeIds,
    focusedGroupedNodeMovesGroup,
    isEditMode,
    routedEdgeById,
    selectedLayoutUnits,
    selectedNode,
    visibleNodeById
  });
  const contextMenuTarget = contextMenu?.target ?? (contextMenu?.edgeId ? "edge" : "blank");
  const contextMenuForSelection = contextMenuTarget !== "blank";
  const contextMenuForNode = contextMenuTarget === "node" || contextMenuTarget === "group";
  const contextMenuForEdge = contextMenuTarget === "edge";
  const {
    edgeFloatingToolbar,
    floatingToolbarIconSize,
    floatingToolbarWrapperStyle,
    nodeFloatingToolbar,
    resizeSizeHint
  } = useCanvasFloatingToolbarLayout({
    activeSelectedEdgeIds,
    activeSelectedNodeIds,
    canAddTemplateFromSelection,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasHeight,
    canvasScrollScale,
    canvasVisibleViewBox,
    canvasWidth,
    connectSource,
    currentZoomPercent,
    dragging,
    editHotInteractionActive,
    groupTransformGeometry,
    isEditMode,
    manualPathDrag,
    marquee,
    modifierSelectionPress,
    nodeById,
    nodeForegroundImage,
    nodeImage,
    nodeLabelDrag,
    nodeLabelRotateDrag,
    nodeRotateHandleControlPoints,
    nodeUprightRotateHandleControlPoints,
    nodeUsesUprightStaticSelectionOutline,
    panning,
    rewiring,
    selectedCanvasBounds,
    selectedEdge,
    selectedFloatingToolbarBounds,
    selectedNode,
    selectedNodeCount,
    selectedRoutedEdge,
    selectedTransformGroupUnit,
    staticDrawing,
    terminalPress,
    transformDrag,
    viewBox
  });
  const {
    CANVAS_MINIMAP_HEIGHT,
    CANVAS_MINIMAP_WIDTH,
    mapPointToMinimap,
    minimapContentHeight,
    minimapContentWidth,
    minimapNodes,
    minimapOffsetX,
    minimapOffsetY,
    minimapRoutes,
    minimapScale,
    minimapViewportBottom,
    minimapViewportLeft,
    minimapViewportRight,
    minimapViewportTop
  } = useCanvasMinimapState({
    canvasHeight,
    canvasVisibleViewBox,
    canvasWidth,
    editHotInteractionActive,
    minimapSampleCacheRef,
    minimapSamplingReady,
    routedEdges,
    scheduleIdleWork,
    setMinimapSamplingReady,
    visibleNodes
  });
  const handleMinimapNavigate = (event: PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasPoint = {
      x: clampNumber((event.clientX - rect.left - minimapOffsetX) / minimapScale, 0, canvasWidth),
      y: clampNumber((event.clientY - rect.top - minimapOffsetY) / minimapScale, 0, canvasHeight)
    };
    centerViewBoxOnPoint(canvasPoint);
  };
  const centerSelectedInView = () => {
    if (!selectedCanvasBounds) {
      return;
    }
    centerViewBoxOnPoint(selectionRectCenter(selectedCanvasBounds));
  };
  const fitViewToSelection = () => {
    fitViewToBounds(selectedCanvasBounds, 80);
  };

  const isStaticButtonEnabledForNode = (node: ModelNode) =>
    isStaticButtonCapableKind(node.kind) && node.params.buttonEnabled === "1";

  const clearStaticButtonFeedbackTimer = () => {
    if (staticButtonFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(staticButtonFeedbackTimeoutRef.current);
      staticButtonFeedbackTimeoutRef.current = null;
    }
  };

  const setStaticButtonFeedback = (nodeId: string, state: StaticButtonVisualState) => {
    clearStaticButtonFeedbackTimer();
    setStaticButtonVisual({ nodeId, state });
  };

  const clearStaticButtonFeedback = (nodeId?: string) => {
    clearStaticButtonFeedbackTimer();
    setStaticButtonVisual((current) => (!current || (nodeId && current.nodeId !== nodeId) ? current : null));
  };

  const beginStaticButtonPointerFeedback = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    if (!isBrowseMode || !isStaticButtonEnabledForNode(node) || staticDrawing || connectSource || mode === "connect") {
      return;
    }
    staticButtonPointerRef.current = {
      nodeId: node.id,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false
    };
    setStaticButtonFeedback(node.id, "pressed");
  };
  const resolveStaticButtonTargetProject = appExtractedHandlersC.createResolveStaticButtonTargetProject(appRuntimeCtx);
  const executeStaticButtonCommand = appExtractedHandlersC.createExecuteStaticButtonCommand(appRuntimeCtx);
  const executeStaticButtonAction = appExtractedHandlersA.createExecuteStaticButtonAction(appRuntimeCtx);
  const handleStaticButtonClick = appExtractedHandlersB.createHandleStaticButtonClick(appRuntimeCtx);

  useEffect(() => {
    if (!backgroundProjectId || backgroundProjectId === activeProjectKey || !backgroundProjectRecord) {
      setBackgroundPageRenderReady(false);
      return;
    }
    setBackgroundPageRenderReady(false);
    return scheduleIdleWork(() => setBackgroundPageRenderReady(true), 80, 1500);
  }, [activeProjectKey, backgroundLayerIds, backgroundProjectId, backgroundProjectRecord, savedRouteCrossingArcsReady]);

  const backgroundPageFrameRender = useMemo(() => {
    if (!backgroundProjectId || backgroundProjectId === activeProjectKey || !backgroundProjectRecord) {
      return null;
    }
    const backgroundProject = backgroundProjectRecord.project;
    const backgroundBounds = {
      width: backgroundProject.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      height: backgroundProject.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
    };
    return {
      project: backgroundProject,
      backgroundBounds,
      backgroundColor: backgroundProject.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
      backgroundImageUrl: resolveProjectImage(backgroundProject, imageAssets),
      transform: backgroundPageCanvasTransform(backgroundBounds, { width: canvasWidth, height: canvasHeight })
    };
  }, [activeProjectKey, backgroundProjectId, backgroundProjectRecord, canvasHeight, canvasWidth, imageAssets]);

  const backgroundPageRender = useMemo(() => {
    if (!backgroundPageFrameRender || !backgroundPageRenderReady) {
      return backgroundPageFrameRender
        ? {
            ...backgroundPageFrameRender,
            nodes: [] as ModelNode[],
            edges: [] as Edge[],
            routes: [] as RoutedEdge[],
            nodeById: new Map<string, ModelNode>(),
            edgeById: new Map<string, Edge>()
          }
        : null;
    }
    const backgroundProject = normalizeProjectLayers(backgroundPageFrameRender.project);
    const visibleBackgroundLayerIds = new Set(backgroundLayerIds);
    const backgroundLayers = (backgroundProject.layers ?? []).map((layer) => ({
      ...layer,
      visible: visibleBackgroundLayerIds.has(layer.id)
    }));
    const { nodes: backgroundNodes, edges: backgroundEdges } =
      filterProjectByVisibleLayers(backgroundProject.nodes, backgroundProject.edges, backgroundLayers);
    const routes = routeEdgesForSavedPathRendering(backgroundNodes, backgroundEdges, backgroundPageFrameRender.backgroundBounds, { refreshCrossingArcs: savedRouteCrossingArcsReady });
    return {
      ...backgroundPageFrameRender,
      nodes: backgroundNodes,
      edges: backgroundEdges,
      routes,
      nodeById: new Map(backgroundNodes.map((node) => [node.id, node])),
      edgeById: new Map(backgroundEdges.map((edge) => [edge.id, edge]))
    };
  }, [backgroundLayerIds, backgroundPageFrameRender, backgroundPageRenderReady, savedRouteCrossingArcsReady]);

  const beginReadonlyBackgroundStaticButtonPointerFeedback = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    event.preventDefault();
    event.stopPropagation();
    beginStaticButtonPointerFeedback(event, node);
  };

  const beginMeasurementDrag = (event: PointerEvent<SVGGElement>, group: MeasurementGroup) => {
    if (isBrowseMode || !svgRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setMeasurementDrag({
      groupId: group.id,
      pointerId: event.pointerId,
      startCanvasPoint: screenToSvgPoint(svgRef.current, event.clientX, event.clientY),
      startOffset: group.offset,
      changed: false
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateMeasurementDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!measurementDrag || event.pointerId !== measurementDrag.pointerId || !svgRef.current) {
      return false;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const offset = {
      x: measurementDrag.startOffset.x + point.x - measurementDrag.startCanvasPoint.x,
      y: measurementDrag.startOffset.y + point.y - measurementDrag.startCanvasPoint.y
    };
    setMeasurements((current) => ({
      version: 1,
      groups: current.groups.map((group) => group.id === measurementDrag.groupId ? { ...group, offset, anchor: "custom" } : group)
    }));
    setMeasurementDrag((current) => current && current.pointerId === event.pointerId ? { ...current, changed: true } : current);
    return true;
  };

  const finishMeasurementDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!measurementDrag || event.pointerId !== measurementDrag.pointerId) {
      return false;
    }
    if (measurementDrag.changed) {
      setHasUnsavedChanges(true);
      writeOperationLog("调整动态量测位置");
    }
    setMeasurementDrag(null);
    return true;
  };

  const {
    renderMeasurementGroup,
    renderReadonlyBackgroundPage
  } = useCanvasAuxiliaryRenderers({
    backgroundPageRender,
    beginMeasurementDrag,
    beginReadonlyBackgroundStaticButtonPointerFeedback,
    clearStaticButtonFeedback,
    colorDisplayMode,
    colorPalette,
    defaultCanvasBackground: DEFAULT_CANVAS_BACKGROUND,
    deviceLabelsVisible,
    dragPreviewMovedNodeById,
    handleStaticButtonClick,
    isBrowseMode,
    isStaticButtonEnabledForNode,
    measurementRuntimeSnapshot,
    nodeForegroundImage,
    nodeImage,
    nodeLabelShouldRender,
    nodeLabelText,
    nodeLabelTextAnchor,
    nodeLabelTextStyle,
    nodeLabelTransform,
    nodeLabelVertical,
    nodeLabelVerticalSegments,
    nodeLabelVerticalTokenStyle,
    nodeLabelVerticalTokenY,
    platformMeasurementConfig,
    setStaticButtonFeedback,
    staticButtonPointerRef,
    staticButtonVisual,
    visibleNodeById
  });

  const viewportOverlayStyle = {
    "--viewport-overlay-right": `${rightPanelVisible ? rightPanelWidth + 28 : 16}px`,
    "--viewport-overlay-bottom": `${statusbarHeight + 14}px`
  } as CSSProperties;
  const appShellStyle = {
    "--left-panel-width": `${leftPanelWidth}px`,
    "--right-panel-width": `${rightPanelWidth}px`,
    "--statusbar-height": `${statusbarHeight}px`,
    "--validation-panel-height": `${validationPanelHeight}px`
  } as CSSProperties;
  Object.assign(appRuntimeCtx, {
    activateInspectorFromCanvas, activeGroupById, activeImageFolderId, activeLayerEdgeIdSet, activeLayerEdges, activeLayerGroups, activeLayerId, activeLayerNodeIdSet, activeLayerNodes, activeSchemeKey,
    activeSchemeRecord, activeSelectedEdgeIds, activeSelectedGroupIds, activeSelectedNodeIds, addModelLayer, addRoutingNodesForConnectionEdge, adjustEdgesAfterNodeMove, allowAutoExpandCanvas, appendDistinctStaticDrawingPoint, appendPendingKeyboardMoveDelta,
    appendStaticDrawingPoint, applyCanvasBounds, applyConnectPreviewState, applyRoutableLinePreviewState, applyUndoGraphSnapshot, attributeLibraries, backendDeviceLibraryLoadedRef, backgroundLayerIds, backgroundProjectId, beginStaticButtonPointerFeedback,
    boundedDeltaForMoveGeometry, boundedDeltaForMultiNodeInteractiveMove, boundedDeltaForNodes, boundsForNodeSet, boxesOverlap, buildConnectPreviewPath, buildGroupTransformEdgeUpdates, buildGroupTransformNodeUpdates, buildLightweightNodeDragPreviewRoutes, buildMirrorLayoutUnitEdgeUpdates,
    buildMovedNodeUpdates, buildMultiNodeDragOverlayPreview, buildRotateLayoutUnitEdgeUpdates, buildRoutableLinePreviewPath, buildSingleNodeDragCache, busAnchorFromEvent, busAnchorFromPoint, busNodeIdSet, busNodeIdsFromEdges, busTerminalSyncNodeIdsForGraphPatch,
    cachedRoutedEdgesRef, cachedRouteStoreRef, canAddTemplateFromSelection, canGroupSelectedGraphics, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageUrl, canvasBaseDisplayOffsetX, canvasBaseDisplayOffsetY,
    canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsForMoveDelta, canvasBoundsForMovedNodeDelta, canvasBoundsRef, canvasBoundsScrollSyncPendingRef, canvasBoundsWithOriginShift, canvasClipboard, canvasDisplayHeight,
    canvasDisplayOffsetX, canvasDisplayOffsetY, canvasDisplayWidth, canvasFrameRef, canvasFrameUserScrollRef, canvasFrameViewportSize, canvasFullViewBoxRef, canvasHeight, canvasHorizontalScrollbarsActive, canvasHorizontalScrollbarsActiveRef,
    canvasInteractionRef, canvasNoScrollOffsetRef, canvasResizeDraftRef, canvasResizeUndoCapturedRef, canvasScrollbarsActiveRef, canvasScrollScaleRef, canvasScrollSurfaceHeight, canvasScrollSurfaceWidth, canvasSelectionScope, canvasVerticalScrollbarsActive,
    canvasVerticalScrollbarsActiveRef, canvasVisibleViewBoxFrameRef, canvasVisibleViewBoxRef, canvasWidth, captureCanvasPointer, centerSelectedInView, centerViewOnPoint, clampCanvasBounds, clampCanvasNoScrollOffsetPoint, clampEdgeGeometryToExpandableBounds,
    clampNodePositionToExpandableBounds, clampPointToCanvas, clampPointToExpandableBounds, clampViewBoxToCanvas, clearCanvasBoundsScrollSyncPending, clearDraggingMoveState, clearKeyboardMoveCommitSchedule, clearLibraryFlyoutCloseTimer, clearNodeDragMoveSchedule, clearRecordSelection,
    clearStaticButtonFeedback, colorDisplayMode, colorPalette, commitFastMovedGraphPatches, commitImportedModelRecord, commitImportedSchemeRecord, commitLayoutNodePositions, commitNewConnectionEdge, commitNodeFootprintUpdates, commitSafeDeltaForDraggingState,
    componentLibraryDisplayMode, componentTypeOptions, computeNodeDragDelta, computeNodeDragPreviewDelta, connectDropHintElementRef, connectDropReadyRef, connectDropTargetPointRef, connectDropTargetRef, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage,
    connectionHitTolerance, connectionLineStyle, connectionRedrawEdgeIdsForScope, connectionRedrawViewportBounds, connectPreviewDomRef, connectPreviewFrameRef, connectPreviewPathElementRef, connectPreviewPointRef, connectSource, connectTargetPoint,
    connectTargetSnapPoint, connectTargetTerminalType, createCanvasSelectionSnapshot, createImportedSchemeRecord, currentCanvasSelectionSnapshot, currentGraphDirtyBaseline, currentProject, currentStoredRoutePointsForEdge, currentUnit, currentViewBoxFromCanvasFrameScroll,
    customAttributeLibraries, customComponentTreeSelection, customComponentTreeTypeKey, customComponentTypes, customDeviceDraft, customDeviceTemplates, customGraphTemplates, customGraphTemplateTypes, defaultComponentTypeForAttributeLibrary, deferredMoveOptimizationCancelRef,
    deferredMoveRepairFrameRef, definitionDraftRows, definitionDraftSection, deleteCustomAttributeLibrary, deleteCustomComponentType, deleteModelLayer, deviceDefinitionOverrides, deviceIndexCounters, dirtyEdgeIdsAfterMove, dirtyEdgeIdsForMovedLocalRoutes,
    displaySelectedEdgeIds, displaySelectedNodeIds, dragBoundsForSmartAlignment, dragDraggedEdgeIdSet, dragging, draggingRef, dragMovedBusNodeIdSet, dragMovedNodeIdSet, dragUndoCapturedRef, dropGraphTemplate,
    edgeById, edgeListForNodeIds, edgeListsHaveSameOrder, edgePatchFromCandidateEdges, edgePointerBendInsertRef, edgeReferenceDiffIds, edges, edgeSnapshotFallbackPoints, edgeWithCurrentRouteGeometryForSave, editingCustomDeviceKind,
    ensureCustomComponentTreeExpanded, ensureDraggingUndoSnapshot, ensureSavedBeforeExport, executeStaticButtonAction, executeStaticButtonCommand, expandActiveGroupSelection, expandCanvasToFitGraph, expandRouteBox, finalizeMovedNodeEdgesFast, findBendInsertRouteSegmentIndex,
    findConnectTargetAtPoint, findMultiNodeDragSnapTargetAtDelta, findRewireTargetAtPoint, findRoutableLineEndpointTargetAtPoint, findSchemeForProject, findSingleNodeDragSnapTargetAtDelta, finishConnectToTarget, finishMarqueeSelectionFromPoints, finishRoutableLineToTarget, fitViewToSelection,
    fitWholeCanvasToFrame, flushPendingKeyboardMove, flushPendingNodeDragMove, focusedGroupedNodeMovesGroup, fullUndoGraphDirtyEdgeIds, graphDirtyBaselineRef, graphStore, graphStorePatchStillCurrent, graphTemplateTypes, groupExpandedCanvasSelection,
    groups, groupTransformPreviewEdgeRoutes, groupTransformPreviewNodeFromSnapshot, groupTransformPreviewTransform, handleTerminalPointerDown, hasCanvasOriginShift, hasVoltageBaseTerminalValues, hideImperativeMultiNodeDragOverlay, hideImperativeSingleNodeDragPreview, hideLibraryFlyout,
    imageAssets, imageFolders, imageTarget, imperativeNodeDragEdgePreviewKeyRef, imperativeNodeDragEdgePreviewPathRefs, imperativeSingleNodeDragEdgePreviewRef, insertManualBendAtPoint, insertManualBendFromPointer, inspectorSelectedNode, isBrowseMode,
    isEditMode, isObjectRecord, isPointNearBus, isProjectFilePayload, isStaticButtonEnabledForNode, keyboardMoveActiveFrameDelta, keyboardMoveActiveKeyDeltasRef, keyboardMoveFrameElapsedMsRef, keyboardMoveFrameRef, keyboardMoveLastFrameTimeRef,
    lastBusTerminalSyncEndpointRevisionRef, lastCanvasPointerRef, lastEdgePointerClickRef, lastMouseStatusRef, lastPersistedDeviceLibraryPayloadRef, lastRawCanvasPointerRef, latestEdgesRef, latestGraphStoreRef, latestNodesRef, layers,
    leftPanelMode, leftPanelVisible, leftTopCanvasOriginShiftForContent, libraryComponentListRefKey, libraryComponentListRefs, libraryComponentTypeHeaderRefs, libraryFlyoutCloseTimerRef, libraryFlyoutPositionsRef, libraryPlacement, libraryScrollRef,
    libraryTemplateByKind, libraryTemplates, lightweightMovedEndpointRoute, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, locateTopologyError, lodNodeFromEvent, manualPathDrag, manualPointDeltaForEdge, markBusTerminalSyncDirty,
    markBusTerminalSyncDirtyForEdges, markCanvasBoundsScrollSyncPending, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, marquee, measurements, mergeAdjustedCandidateEdges, mergeImportedSchemeIntoExisting, mergeNodeUpdateLists,
    minimumCanvasBoundsForResizeEdge, mirrorLayoutUnitNodeUpdates, mode, modelImportTargetSchemeIdRef, modifierSelectionPressRef, mousePositionTextRef, mouseStatusFrameRef, moveModelLayer, moveRouteRepairSeedEdges, moveSelection,
    multiNodeDragOverlayDeltaRef, multiNodeDragOverlayRef, nextCustomAttributeLibraryName, nextCustomComponentTypeName, nextCustomTemplateKind, nextNodesForMovedGraphCommit, nodeById, nodeForegroundImage, nodeForRoutingList, nodeHasUprightBoundsContent,
    nodeImage, nodeLabelDrag, nodeLabelRotateDrag, nodePatchListLookupCacheRef, nodes, nodeTerminalSnapTargetRef, normalizeScale, openGraphicContextMenu, optimizeMovedNodeEdgeRoutes, orderedNodeFromList,
    orderedNodesForIds, overlayEdgeUpdatesForTransform, panning, panningRef, patchCachedRoutesForHighFanoutMove, patchGraphEdges, patchGraphNodes, patchSingleTerminalAnchorFromPoint, pendingBusTerminalSyncNodeIdsRef, pendingCanvasBoundsScrollAnchorRef,
    pendingCanvasResizeCommitAnchorRef, pendingConnectPreviewRef, pendingModelImportConflict, pendingMouseStatusRef, pendingRewirePreviewRef, pendingRoutableLinePreviewRef, pendingRouteEdgeIdsRef, pendingSchemeImportConflict, pendingStoredRouteEdgeIdsRef, pendingWheelZoomAnchorRef,
    persistSchemesPayloadToStorageAndBackend, persistTemplateLibraryChange, placeLibraryDeviceAtPoint, powerBaseValue, powerUnit, projectById, projectListPointerInsideRef, projectMenu, projectName, projectRecordDragActiveRef,
    proportionalSignedScaleFromHandleDelta, proportionalSignedScaleFromUprightHandleDelta, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, readjustMovedBusConnectionRoutes, rebuildEdgesAfterNodeGeometryChange, rebuildEdgeUpdatesAfterNodeGeometryChange, rebuildSingleAffectedConnectionRoute, refreshImageFolders, rejectAutoCanvasExpansionForContent,
    releaseCanvasBoundsScrollSyncPending, renderChineseParamHeader, requestCanvasFrameCenter, requestLoadSavedProject, requireEditMode, resetConnectPreviewState, resetMultiNodeDragOverlayTransform, resetRoutableLinePreviewState, resetViewport, resolveConfiguredBackgroundLayerIds,
    resolveConnectPreviewPoint, resolveStaticButtonTargetProject, restoreCanvasSelectionSnapshot, rewirePreviewFrameRef, rewiring, rightPanelMode, rightPanelVisible, rotateLayoutUnitNodeUpdates, routableLineDropTargetPointRef, routableLineDropTargetRef,
    routableLineEndpointDrag, routableLinePlacement, routableLinePreviewFrameRef, routableLinePreviewPointRef, routableLineRouteCandidateIdsForMovedNodes, routableLineTemplateTerminalType, routedEdgeById, routedEdgeIndexById, routedEdges, routedEdgeSpatialIndex,
    routeManualPoints, routePointsForMovedEdgesBlockedByStationaryNodes, routePointsForMovedNodeBlockers, routePointSnapshotToRoutes, routePointsNearOriginalMovedNodes, routePointsSnapshotForMove, routePreserveEdgeIdsForMovedNodes, routeSegmentPointerDistance, routeTouchesExpandedBoxes, routingNodesForConnectionEdge,
    routingNodesForConnectionEdges, runTopologyCalculation, safeFilePart, sameConnectTarget, sameOptionalPoint, sameOptionalPointList, saveActiveProjectPointer, saveCurrentProject, scheduleCanvasVisibleViewBoxUpdate, scheduleConnectPreviewPoint,
    scheduleDeferredMovedConnectionRepair, scheduleKeyboardMoveCommit, scheduleKeyboardNudgeFrame, scheduleMovedEdgeOptimization, scheduleNodeDragMove, scheduleRewirePreviewPoint, scheduleRoutableLinePreviewPoint, schemeImportParentSchemeIdRef, schemeRecordDragActiveRef, schemes,
    selectCanvasGraphics, selectedCanvasBounds, selectedDefinitionTemplate, selectedEdgeId, selectedEdgeIds, selectedGroupMemberNodeIdSet, selectedLayoutUnits, selectedNode, selectedNodeId, selectedNodeIds,
    selectedNodeIdSet, selectedSchemeId, selectedSchemeRecord, selectSingleProject, selectSingleScheme, serializeSchemeRecordForFile, setActiveImageFolderId, setActiveLayer, setActiveLayerId, setActiveProjectKey,
    setActiveSchemeKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasClipboard, setCanvasFrameScrollPosition, setCanvasHeight,
    setCanvasNoScrollOffset, setCanvasPanning, setCanvasResizeDraft, setCanvasResizeDrag, setCanvasSelectionScope, setCanvasSizeDraft, setCanvasVisibleViewBox, setCanvasWidth, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes,
    setConnectDropReady, setConnectPreviewDom, setConnectSource, setContextMenu, setCurrentUnit, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates,
    setCustomGraphTemplates, setCustomGraphTemplateTypes, setDefinitionDraftError, setDefinitionDraftRows, setDefinitionDraftSection, setDeviceDefinitionOverrides, setDeviceIndexCounters, setDragging, setEdges, setEditingCustomDeviceKind,
    setExpandedAttributeLibraries, setExpandedDefinitionGroups, setExpandedGraphTemplateTypes, setExpandedSchemeIds, setGraphArrays, setGraphInfoView, setGraphStore, setGroups, setHasUnsavedChanges, setHoveredAttributeLibrary,
    setHoveredAttributeLibraryComponentType, setImageAssetList, setImageAssets, setImageTarget, setInspectorTab, setLayers, setLeftPanelAutoVisible, setLeftPanelTab, setLibraryFlyoutPositions, setLibraryPlacement,
    setManualPathDrag, setMarquee, setMeasurements, setMode, setModifierSelectionPress, setNodeLabelDrag, setNodeLabelRotateDrag, setNodes, setOperationLogText, setPendingModelImportConflict,
    setPendingSchemeImportConflict, setPowerBaseValue, setPowerUnit, setProjectMenu, setProjectName, setRewiring, setRightPanelAutoVisible, setRoutableLineEndpointDrag, setRoutableLinePlacement, setRoutableLinePreview,
    setRouteRenderingReady, setSavedRouteCrossingArcsReady, setSchemes, setSelectedDefinitionKind, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setSidePanelMode, setStaticButtonFeedback, setStaticButtonVisual,
    setStaticDrawing, setTemplateDialog, setTemplateDraftName, setTemplateDraftType, setTerminalPress, setTopology, setTopologyErrors, setTopologyStatus, setTransformDrag, setUndoStack,
    setViewBox, setVoltageBaseSetDialogOpen, setVoltageUnit, shiftCachedRoutesForCanvasOrigin, shiftedDragPreviewPoint, shiftPreviewEndpointForDelta, shouldDeferSingleNodeTerminalReconciliation, shouldFinalizeMovedNodeEdgesSynchronously, shouldPatchRouteCacheForHighFanoutMove, shouldRunDeferredMoveOptimization,
    shouldRunSynchronousMoveBlockerRepair, sidePanelResize, signedScale, signedScaleFromRotatedHandleDelta, signedScaleFromUprightHandleDelta, simpleOrthogonalDragPreviewPoints, singleNodeDragPreviewEdges, singleNodeDragPreviewKey, singleNodeDragPreviewNodeFor, singleNodeDragRenderState,
    singleNodeDragSnapEdges, singleTransformBaseNode, singleTransformNodeUpdate, skipNextCanvasScrollSyncRef, skipNextTopologyStaleRef, snapshotEdgePoints, snapshotGroupTransformEdgeRoutes, snapshotGroupTransformNodes, snapshotRouteBounds, snapshotSingleTransformNode,
    startCanvasResize, startCanvasResizeFromLeftOverlay, startCanvasResizeFromRightOverlay, startConnectFromTerminal, startDraggingState, startInteractiveStaticDrawing, startKeyboardMoveSession, startLibraryDevicePlacement, startModifierSelectionPress, startRoutableLineFromTerminal,
    staticButtonFeedbackTimeoutRef, staticButtonPointerRef, staticDrawing, staticDrawingPreviewPoints, storedRouteDirtyIdsForMove, suppressNextBackendDeviceLibrarySyncRef, suppressNextGraphDirtyRef, svgRef, synchronousEdgeAdjustmentCandidates, syncImperativeNodeDragPreviewPaths,
    templateDialog, templateDraftName, templateDraftType, terminalOutflowAnchorsForSmartAlignmentDrag, terminalPress, terminalReconcileNodeScope, toggleEdgeSelectionFromModifierClick, toggleModelLayerVisibility, toggleNodeSelectionFromModifierClick, toggleSelectionFromModifierClick,
    toLocalNodePoint, topology, topologyErrors, topologyStatus, transformDrag, transformDragChangedRef, translateEdgeBy, translateNodeBy, translatePointBy, translateRouteBy,
    undoScopeForGraphPatch, undoScopeForNodeFootprintPatch, updateAutoPanelVisibility, updateCanvasSize, updateGraphNodeById, updateImperativeNodeDragDropHint, updateInteractiveStaticDrawingPreview, updateLibraryPlacementPreview, updateMouseStatus, updateMultiNodeDragOverlayTransform,
    updateParam, updateRoutableLineEndpointDrag, updateSelectedNode, updateSingleNodeDragImperativePreview, validationPanelResize, viewBox, viewBoxRef, visibleEdgeIdSet, visibleEdges, visibleNodeById,
    visibleNodeIdSet, visibleNodes, visibleNodeSpatialIndex, voltageBaseSetMode, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetValue, voltageBaseTerminalValues, voltageUnit, wheelZoomAnchorFromClient,
    writeOperationLog, zoomViewportAtCenter
  });

  const leftPanelRenderers = useLeftPanelRenderers({
    ELEMENT_TREE_ITEM_LIMIT_STEP,
    activeLayerEdgeIdSet,
    activeLayerNodeIdSet,
    activeProjectKey,
    activeSelectedEdgeSet,
    attributeLibraries,
    attributeLibraryComponentTypeKey,
    cancelLibraryPlacement,
    clearLibraryFlyoutCloseTimer,
    clearRecordSelection,
    collapsedCustomComponentTreeLibraries,
    collapsedCustomComponentTreeTypes,
    collapsedElementTreeGroups,
    collapsedExpandedModeAttributeLibraries,
    collapsedExpandedModeComponentTypes,
    colorPalette,
    componentLibraryDisplayMode,
    componentTypeDisplayParts,
    createCustomAttributeLibrary,
    createCustomComponentType,
    createEmptyCustomDeviceDraft,
    customComponentTreeSelection,
    customComponentTreeTypeKey,
    deleteSelectedCustomDeviceTreeItem,
    displayedAttributeLibraries,
    elementTree,
    elementTreeItemChildren,
    elementTreeItemLimits,
    expandedAttributeLibraries,
    expandedAttributeLibraryComponentTypes,
    expandedGraphTemplateTypes,
    expandedSchemeIds,
    filteredAttributeLibraryByComponentType,
    filteredProjectSchemes,
    finishProjectRecordDrag,
    finishSchemeRecordDrag,
    focusElementTreeItem,
    graphTemplateTypes,
    groupedAttributeLibraryByComponentType,
    groupedGraphTemplates,
    hideLibraryFlyout,
    hoveredAttributeLibrary,
    hoveredAttributeLibraryComponentType,
    hoveredGraphTemplateType,
    isBrowseMode,
    isEditMode,
    leftPanelTab,
    libraryComponentListRefKey,
    libraryFlyoutPositions,
    libraryFlyoutStyle,
    libraryPreviewByKind,
    libraryScrollRef,
    librarySearchNeedle,
    librarySearchQuery,
    moveProjectRecordToScheme,
    moveSchemeRecordToScheme,
    normalizeAttributeLibraryName,
    openDeviceDefinitionDialog,
    pointsToPreviewPath,
    projectListPointerInsideRef,
    projectSearchNeedle,
    projectSearchQuery,
    renameSelectedCustomDeviceTreeItem,
    requestLoadSavedProject,
    requireEditMode,
    scheduleLibraryFlyoutClose,
    schemes,
    selectCanvasGraphics,
    selectCustomAttributeLibrary,
    selectCustomComponentTemplate,
    selectCustomComponentType,
    selectSingleProject,
    selectSingleScheme,
    selectedNodeIdSet,
    selectedProjectId,
    selectedProjectIds,
    selectedSchemeId,
    selectedSchemeIds,
    setComponentLibraryDisplayMode,
    setCustomDeviceDialogOpen,
    setCustomDeviceDraft,
    setElementTreeItemLimits,
    setExpandedGraphTemplateTypes,
    setHoveredAttributeLibrary,
    setHoveredAttributeLibraryComponentType,
    setHoveredGraphTemplateType,
    setInspectorTab,
    setLibraryComponentListRef,
    setLibraryComponentTypeHeaderRef,
    setLibrarySearchQuery,
    setProjectMenu,
    setProjectSearchQuery,
    startCustomComponentCreate,
    startLibraryDevicePlacement,
    startLibraryGraphTemplatePlacement,
    startProjectRecordDrag,
    startSchemeRecordDrag,
    toggleAttributeLibrary,
    toggleAttributeLibraryComponentType,
    toggleCustomComponentTreeLibrary,
    toggleCustomComponentTreeType,
    toggleElementTreeGroup,
    toggleProjectSelection,
    toggleSchemeExpanded,
    toggleSchemeSelection,
    updateElementTreeContainerChildParam,
    updateElementTreeNodeIdentity
  });
  const {
    effectiveLeftPanelTab,
    leftPanelContent,
    renderCustomComponentManagerTree,
    renderElementTreePanel,
    renderGraphTemplatePreview
  } = leftPanelRenderers;
  const appDialogsProps = {
    activeImageFolderId,
    activeLayer,
    activeLayerNodes,
    activeSelectedNodeIds,
    addDefinitionDraftRow,
    addManualBendFromContextMenu,
    addVoltageColorRow,
    adjustSelectedDisplayLayer,
    applyExistingImage,
    applyLayerAssignmentDialog,
    attributeLibraries,
    attributeLibraryOptionClass,
    autoAlignCanvasGraphics,
    autoSpreadCanvasGraphics,
    canAddTemplateFromSelection,
    cancelTemplateDialog,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    canvasClipboard,
    clearSelectedImage,
    colorPaletteDialogOpen,
    colorPaletteDraft,
    colorPaletteTab,
    componentTypeOptionClass,
    confirmAddGraphTemplate,
    confirmConnectionRedrawDialog,
    confirmVoltageBaseClearDialog,
    confirmVoltageBaseSetDialog,
    CONNECTION_REDRAW_SCOPE_LABELS,
    connectionRedrawDialogOpen,
    connectionRedrawEdgeIdsForScope,
    connectionRedrawScope,
    CONTAINER_TERMINAL_ASSOCIATION_OPTIONS,
    contextMenu,
    contextMenuForEdge,
    contextMenuForNode,
    contextMenuForSelection,
    contextMenuStyle,
    contextMenuTarget,
    contextSelectionCount,
    copyProjectRecord,
    copySchemeRecord,
    copySelection,
    createBlankProject,
    createGraphTemplateType,
    createImageFolder,
    createSchemeRecord,
    currentAttributeLibraryComponentTypeOptions,
    currentModelVoltageColorKeys,
    customDeviceDialogOpen,
    customDeviceDraft,
    customDeviceImageInputRef,
    customDevicePreviewImage,
    customDraftDefaultParams,
    customParamId,
    cutSelection,
    DEFAULT_COLOR_PALETTE,
    defaultContainerAssociationForTerminalType,
    definitionAttributeLibraryComponentTypeOptions,
    definitionDraftError,
    definitionDraftRows,
    definitionDraftSection,
    deleteDefinitionDraftRow,
    deleteImageFolder,
    deleteProjectRecord,
    deleteSchemeRecord,
    deleteSelection,
    deleteVoltageColorRow,
    deviceDefinitionDialogOpen,
    deviceDefinitionOverrides,
    ELECTRIC_COLOR_TYPE_LABELS,
    ELECTRIC_COLOR_TYPES,
    ENABLE_REACT_FLOW_PREVIEW,
    ENERGY_COLOR_ROWS,
    expandedDefinitionGroups,
    exportProjectRecordFile,
    exportSchemeRecord,
    findSavedSchemeById,
    generateCustomDeviceImage,
    getContainerTerminalAssociationSourceIndex,
    graphTemplateTypes,
    groupedAttributeLibrary,
    groupedAttributeLibraryByComponentType,
    groupSelectedGraphics,
    hasVoltageBaseTerminalValues,
    imageAssetList,
    imageAssets,
    imageFolders,
    imageInputRef,
    imageTarget,
    isBrowseMode,
    isBuiltInAttributeLibrary,
    isBuiltInComponentType,
    isContainerTerminalAssociationDependent,
    isDoubleContainerTerminalAssociation,
    isEditMode,
    layerAssignmentDialogOpen,
    layerAssignmentTargetId,
    layerAssignmentUnchanged,
    layerDialogOpen,
    layers,
    loadDefinitionTemplateDraft,
    nodes,
    normalizeAttributeLibraryName,
    normalizeContainerTerminalAssociations,
    openAddTemplateDialog,
    openConnectionRedrawDialog,
    openLayerAssignmentDialog,
    openModelImportFilePicker,
    openSchemeImportFilePicker,
    openVoltageBaseClearDialog,
    openVoltageBaseSetDialog,
    PARAM_VALUE_TYPE_OPTIONS,
    pasteProjectClipboardRecord,
    pasteSchemeClipboardRecord,
    pasteSelection,
    pendingModelImportConflict,
    pendingRecordPasteConflict,
    pendingSchemeImportConflict,
    pendingUnsavedAction,
    projectById,
    projectMenu,
    projectName,
    ReactFlowPreview,
    reactFlowPreviewOpen,
    recordClipboard,
    renameImageFolder,
    renameProjectRecord,
    renameSchemeRecord,
    renderCustomComponentManagerTree,
    renderGraphTemplatePreview,
    renderLayerManager,
    resetDeviceDefinitionDraft,
    resetEnergyColors,
    resetVoltageColors,
    resolveDuplicateModelImport,
    resolveDuplicateSchemeImport,
    resolveRecordPasteConflict,
    resolveUnsavedChangeAction,
    runContextMenuAction,
    saveColorPalette,
    saveCurrentProject,
    saveCustomDeviceTemplate,
    saveDeviceDefinitionDraft,
    saveRequired,
    schemes,
    selectableAttributeLibraries,
    selectCustomAttributeLibrary,
    selectCustomComponentType,
    selectedDefinitionBaseTemplate,
    selectedDefinitionTemplate,
    selectedDefinitionTerminalAssociations,
    selectedEdge,
    setActiveImageFolderId,
    setColorPaletteDialogOpen,
    setColorPaletteTab,
    setConnectionRedrawDialogOpen,
    setConnectionRedrawScope,
    setCustomDeviceDialogOpen,
    setCustomDeviceDraft,
    setDefinitionDraftError,
    setDefinitionDraftSection,
    setDeviceDefinitionDialogOpen,
    setImageTarget,
    setLayerAssignmentDialogOpen,
    setLayerAssignmentTargetId,
    setLayerDialogOpen,
    setReactFlowPreviewOpen,
    setSelectedNodeLabelDisplayMode,
    setTemplateDraftName,
    setTemplateDraftType,
    setVoltageBaseClearDialogOpen,
    setVoltageBaseClearScope,
    setVoltageBaseSetDialogOpen,
    setVoltageBaseSetMode,
    setVoltageBaseSetScope,
    setVoltageBaseSetValue,
    setVoltageBaseTerminalValue,
    setVoltageColorVisibility,
    sourceSelectClassName,
    templateDialog,
    templateDraftName,
    templateDraftType,
    TERMINAL_TYPE_OPTIONS,
    tidySelectedEdgeRoute,
    toggleColorDisplayMode,
    toggleDefinitionGroup,
    undoLastOperation,
    undoStack,
    ungroupSelectedGraphics,
    updateCustomDraftTerminalCount,
    updateDefinitionDraftRow,
    updateEnergyColor,
    updateVoltageColorRow,
    visibleEdges,
    visibleNodes,
    visibleVoltageColorRows,
    VOLTAGE_BASE_CLEAR_SCOPE_LABELS,
    VOLTAGE_BASE_CLEAR_SCOPES,
    VOLTAGE_BASE_SET_SCOPE_LABELS,
    VOLTAGE_BASE_SET_SCOPES,
    voltageBaseClearDialogOpen,
    voltageBaseClearResultForScope,
    voltageBaseClearScope,
    voltageBaseSetDialogOpen,
    voltageBaseSetMode,
    voltageBaseSetOptions,
    voltageBaseSetResultForScope,
    voltageBaseSetScope,
    voltageBaseSetTerminalRows,
    voltageBaseSetValue,
    voltageBaseTerminalValues,
    voltageColorVisibility
  };
  const rightInspectorPanelProps = {
    rightPanelVisible,
    updateAutoPanelVisibility,
    startSidePanelResize,
    renderSidePanelModeControls,
    inspectorSelectedNode,
    currentModelRecord,
    inspectorTab,
    setInspectorTab,
    renderChineseParamHeader,
    selectedSchemeRecord,
    MIN_CANVAS_WIDTH,
    MAX_CANVAS_WIDTH,
    MIN_CANVAS_HEIGHT,
    MAX_CANVAS_HEIGHT,
    canvasSizeDraft,
    isBrowseMode,
    setCanvasSizeDraft,
    handleCanvasSizeBlur,
    handleCanvasSizeKeyDown,
    allowAutoExpandCanvas,
    pushUndoSnapshot,
    setAllowAutoExpandCanvas,
    canvasBackgroundColor,
    DEFAULT_CANVAS_BACKGROUND,
    setCanvasBackgroundColor,
    canvasBackgroundImage,
    setImageTarget,
    setCanvasBackgroundImage,
    setCanvasBackgroundImageAssetId,
    backgroundProjectId,
    setBackgroundProjectId,
    projectById,
    defaultBackgroundLayerIdsForProject,
    setBackgroundLayerIds,
    backgroundProjectOptions,
    backgroundProjectRecord,
    backgroundLayerOptions,
    backgroundLayerIds,
    toggleBackgroundLayer,
    powerUnit,
    setPowerUnit,
    POWER_UNIT_OPTIONS,
    voltageUnit,
    setVoltageUnit,
    VOLTAGE_UNIT_OPTIONS,
    currentUnit,
    setCurrentUnit,
    CURRENT_UNIT_OPTIONS,
    powerBaseValue,
    setPowerBaseValue,
    DEFAULT_POWER_BASE_VALUE,
    graphInfoView,
    setGraphInfoView,
    renderElementTreePanel,
    updateSelectedNode,
    normalizeStaticBoxDimension,
    formatInspectorScaleValue,
    normalizeScale,
    layers,
    nodeLabelDisplayMode,
    updateParam,
    renderColorEditor,
    renderParamEditor,
    normalizeNodeLabelRotation,
    nodeLabelTextAnchor,
    nodeLabelOffset,
    selectedMeasurementGroup,
    addDefaultMeasurementGroupForSelectedNode,
    removeSelectedMeasurementGroup,
    updateMeasurementGroup,
    measurementTypeById,
    platformMeasurementConfig,
    measurementCatalog,
    terminalVbaseFallback,
    updateTerminalVbase,
    renderStaticButtonActionEditor,
    clearSelectedImageForNode,
    terminalColor,
    colorPalette,
    selectedContainerParameterViews,
    selectedContainerParameterView,
    setContainerParamViewId,
    paramOptionsForSection,
    renderParamHeader,
    PARAM_LABELS,
    parseCustomDefinitions,
    READONLY_E_PARAM_KEYS,
    inspectorSelectedEdge,
    nodeById,
    inspectorTopologyErrors,
    startValidationPanelResize,
    visibleTopologyErrors,
    locateTopologyError,
    topologyWarningDisplayMessage,
    TOPOLOGY_WARNING_PAGE_SIZE,
    setTopologyWarningPage,
    normalizedTopologyWarningPage,
    topologyWarningPageCount,
    hiddenTopologyErrorCount,
    topology
  };
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

  const mainWorkspaceProps = {
    activateInspectorFromCanvas,
    activeDropHintPoint,
    activeDropHintStyle,
    activeDropReady,
    activeLayer,
    activeLayerEdgeIdSet,
    activeLayerId,
    activeLayerNodeIdSet,
    activeModelPathName,
    activeProjectKey,
    activeSchemeKey,
    activeSelectedEdgeSet,
    addManualBendToSelectedEdgeCenter,
    adjustSelectedDisplayLayer,
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalDistributeCenter,
    alignSelected,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalDistributeCenter,
    appendStaticDrawingPoint,
    applyConnectPreviewState,
    applyRoutableLinePreviewState,
    ArrowDown,
    ArrowUp,
    assignSelectedNodesToModelLayer,
    busEndpointColor,
    canAddTemplateFromSelection,
    canAdjustSelectedDisplayLayer,
    cancelLibraryPlacement,
    cancelModifierSelectionPress,
    canConnectTerminals,
    canExportCurrentModel,
    canGroupSelectedGraphics,
    canUngroupSelectedGraphics,
    CANVAS_MINIMAP_HEIGHT,
    CANVAS_MINIMAP_WIDTH,
    canvasBackgroundColor,
    canvasBackgroundImageUrl,
    canvasDisplayHeight,
    canvasDisplayOffsetX,
    canvasDisplayOffsetY,
    canvasDisplayWidth,
    canvasFrameRef,
    canvasHorizontalScrollbarsActive,
    canvasInteractionRef,
    canvasRenderBounds,
    canvasResizeHandles,
    canvasResizeHotzoneStyle,
    canvasResizePreviewRect,
    canvasScrollSurfaceHeight,
    canvasScrollSurfaceWidth,
    canvasSelectionShortcutActiveRef,
    canvasVerticalScrollbarsActive,
    centerSelectedInView,
    ChevronDown,
    ChevronsDown,
    ChevronsUp,
    chooseCustomDeviceBackground,
    chooseImage,
    CircleDot,
    clampPointToCanvas,
    clearLibraryPlacementPreview,
    clearRecordSelection,
    clearStaticButtonFeedback,
    colorDisplayMode,
    colorPalette,
    commitLibraryPlacementAtPoint,
    connectDropHintElementRef,
    connectionLineStyle,
    connectPreviewColor,
    connectPreviewDom,
    connectPreviewPathElementRef,
    connectSource,
    connectSourceNode,
    connectTargetPoint,
    connectTargetSnapPoint,
    connectTerminalCompatibilityActive,
    consumeGraphicContextMenuHandled,
    Copy,
    copySelection,
    currentZoomPercent,
    customDeviceImageInputRef,
    cutSelection,
    DEFAULT_CANVAS_BACKGROUND,
    deleteManualBendPoint,
    deleteSelection,
    detailedSelectedEdgeIdSet,
    detailedViewportNodes,
    deviceLabelsVisible,
    distributeSelected,
    Download,
    dragAffectedEdgeIdSet,
    dragGhostEdgeRoutes,
    dragging,
    draggingDelta,
    draggingNodeIdSet,
    draggingRef,
    dragOverlayEdgeIdSet,
    dragPreviewEdgeIdSet,
    dragPreviewEdgeRoutes,
    edgeById,
    edgeFloatingToolbar,
    edges,
    ENABLE_REACT_FLOW_PREVIEW,
    exportEFile,
    exportSvg,
    EyeOff,
    FileJson,
    findConnectionRouteHitAtPoint,
    findConnectTargetAtPoint,
    findRewireTargetAtPoint,
    findRoutableLineEndpointTargetAtPoint,
    finishConnectToTarget,
    finishInteractiveStaticDrawing,
    finishManualPathDrag,
    finishMarqueeSelection,
    finishMeasurementDrag,
    finishModifierSelectionPress,
    finishNodeDrag,
    finishNodeLabelDrag,
    finishNodeLabelRotateDrag,
    finishRewiring,
    finishRoutableLineEndpointDrag,
    finishRoutableLineToTarget,
    finishTerminalPress,
    finishTransformDrag,
    fitViewToContent,
    fitViewToSelection,
    fitWholeCanvasFromBlankDoubleClick,
    fitWholeCanvasToFrame,
    FlipHorizontal,
    FlipVertical,
    floatingToolbarIconSize,
    floatingToolbarWrapperStyle,
    flushConnectPreviewDom,
    formatSvgNumber,
    getEdgeEndpointPoint,
    getMovableRouteSegmentIndexes,
    getNodeScaleX,
    getNodeScaleY,
    getTerminalDisplayColor,
    Grid2X2,
    Group,
    groupSelectedGraphics,
    groupTransformPreviewEdgeIdSet,
    groupTransformPreviewGroupId,
    groupTransformPreviewNodeIdSet,
    handleCanvasPointerDownCapture,
    handleDrop,
    handleEdgePathPointerDown,
    handleLodNodeContextMenu,
    handleLodNodeDoubleClick,
    handleLodNodePointerDown,
    handleMinimapNavigate,
    handleNodePointerDown,
    handlePointerMove,
    handleStaticButtonClick,
    handleTerminalPointerDown,
    handleWheel,
    hasCanvasSelectionModifier,
    hideAutoPanelsFromWorkspace,
    imageInputRef,
    imperativeMultiNodeDragOverlayRef,
    imperativeNodeDragDropHintRef,
    imperativeSingleNodeDragEdgePreviewRef,
    imperativeSingleNodeDragNodeOverlayRef,
    importModelFile,
    importSchemeFile,
    insertManualBendFromEdgePath,
    insertManualBendFromPointer,
    isBrowseMode,
    isBusNode,
    isCanvasGraphicContextMenuTarget,
    isEditMode,
    isGroupTransformDrag,
    isReadonlyCanvasMode,
    isRepeatedEdgePointerClick,
    isRoutableLineDeviceKind,
    isStaticButtonEnabledForNode,
    isStaticNode,
    lastCanvasPointerRef,
    lastEdgePointerClickRef,
    lastRawCanvasPointerRef,
    Layers,
    Layers2,
    libraryPlacement,
    LocateFixed,
    lodCanvasNodeChunks,
    lodCanvasRouteChunks,
    lodSelectedNodeMarkup,
    manualPathDrag,
    manualPathPreviewRoute,
    MapIcon,
    mapPointToMinimap,
    marquee,
    Maximize2,
    MemoDeviceGlyph,
    minimapContentHeight,
    minimapContentWidth,
    minimapNodes,
    minimapOffsetX,
    minimapOffsetY,
    minimapRoutes,
    minimapScale,
    minimapViewportBottom,
    minimapViewportLeft,
    minimapViewportRight,
    minimapViewportTop,
    minimapVisible,
    Minus,
    mirrorSelectedNodes,
    mode,
    modelImportInputRef,
    modifierSelectionPressRef,
    mousePositionTextRef,
    multiNodeDragging,
    nodeById,
    nodeFloatingToolbar,
    nodeForegroundImage,
    nodeGeometryTransform,
    nodeImage,
    nodeLabelDrag,
    nodeLabelFontSize,
    nodeLabelRotateDrag,
    nodeLabelShouldRender,
    nodeLabelText,
    nodeLabelTextAnchor,
    nodeLabelTextStyle,
    nodeLabelTransform,
    nodeLabelVertical,
    nodeLabelVerticalSegments,
    nodeLabelVerticalTokenStyle,
    nodeLabelVerticalTokenY,
    nodeRotateHandleControlPoints,
    nodes,
    nodeScaleHandleControlPoint,
    nodeUprightRotateHandleControlPoints,
    nodeUprightScaleTransform,
    nodeUprightSelectionOutlineRect,
    nodeUsesUprightStaticSelectionOutline,
    openAddTemplateDialog,
    openColorPaletteDialog,
    openEdgeContextMenu,
    openGraphicContextMenu,
    openLayerAssignmentDialog,
    operationLogRef,
    operationLogStatusRef,
    overlappedTerminalKeys,
    Paintbrush,
    Palette,
    panning,
    panningRef,
    Pencil,
    Plus,
    projectListPointerInsideRef,
    renderBoundaryBusInternalConnector,
    renderGroupTransformPhotoPreview,
    renderInteractiveStaticDrawingPreview,
    renderLibraryPlacementPreview,
    renderMeasurementGroup,
    renderMultiNodeDragOverlay,
    renderReadonlyBackgroundPage,
    renderSingleTransformRotateOriginGhost,
    renderTransformRotationTrajectory,
    renderViewportRoutedEdges,
    resetConnectPreviewState,
    resetRoutableLinePreviewState,
    resetViewport,
    resizeSizeHint,
    resolveConnectPreviewPoint,
    rewiring,
    rewiringPreviewRoute,
    RotateCcw,
    RotateCw,
    rotateSelectedLayoutUnits,
    routableLineActiveTerminalType,
    routableLineEndpointDragColor,
    routableLineEndpointDragPreviewRoute,
    routableLineEndpointHandles,
    routableLinePlacement,
    routableLinePlacementColor,
    routableLinePreview,
    routableLineTerminalCompatibilityActive,
    Route,
    runTopologyCalculation,
    Save,
    saveCurrentProject,
    saveRequired,
    SCALE_HANDLE_CONFIGS,
    scaleHandleCursorClass,
    ScanSearch,
    scheduleRoutableLinePreviewPoint,
    schemeImportInputRef,
    Scissors,
    screenToSvgPoint,
    selectCanvasGraphics,
    selectedCanvasBounds,
    selectedCount,
    selectedEdge,
    selectedLayoutUnitCount,
    selectedNodeCount,
    selectedNodeId,
    selectedNodeIdSet,
    selectedNodeTransformStatus,
    selectedRoutedEdge,
    selectedTransformGroupUnit,
    selectionRectCenter,
    setCanvasPanning,
    setCanvasSelectionScope,
    setConnectSource,
    setContextMenu,
    setDeviceLabelsVisible,
    setImageTarget,
    setInspectorTab,
    setLayerDialogOpen,
    setMarquee,
    setMeasurementDrag,
    setMinimapVisible,
    setMode,
    setReactFlowPreviewOpen,
    setRewiring,
    setRoutableLineEndpointDrag,
    setRoutableLinePlacement,
    setSelectedEdgeId,
    setSelectedEdgeIds,
    setSelectedNodeIds,
    setSelectedProjectId,
    setSelectedProjectIds,
    setSelectedSchemeId,
    setSelectedSchemeIds,
    setStaticButtonFeedback,
    setTerminalPress,
    singleNodeDragging,
    smartAlignmentGuides,
    startCanvasPanning,
    startCanvasResize,
    startCanvasResizeFromBottomOverlay,
    startCanvasResizeFromLeftOverlay,
    startCanvasResizeFromRightOverlay,
    startCanvasResizeFromTopOverlay,
    startGroupMoveDrag,
    startGroupTransformDrag,
    startManualPointDrag,
    startManualSegmentDrag,
    startModifierSelectionPress,
    startNodeLabelDrag,
    startNodeLabelRotateDrag,
    startRoutableLineEndpointDrag,
    startRoutableLineFromTerminal,
    startSingleTransformDrag,
    startStatusbarResize,
    staticButtonPointerRef,
    staticButtonVisual,
    staticDrawing,
    SvgMarkupChunk,
    svgRef,
    svgStrokeDashArray,
    terminalPressPreviewEdgeIdSet,
    terminalPressPreviewEdgeRoutes,
    terminalRenderLocalPoint,
    terminalStubSegment,
    terminalStubStrokeWidth,
    tidySelectedEdgeRoute,
    toggleColorDisplayMode,
    toggleInteractionMode,
    toggleSelectedNodeLabelDisplay,
    topologyErrors,
    topologyStatus,
    TRANSFORM_ROTATE_HANDLE_GAP,
    TRANSFORM_ROTATE_STEM_END,
    TRANSFORM_ROTATE_STEM_START,
    transformDrag,
    Trash2,
    Type,
    Ungroup,
    ungroupSelectedGraphics,
    updateLibraryPlacementPreview,
    updateMeasurementDrag,
    updateMouseStatus,
    useSimplifiedCanvasNodes,
    useSimplifiedCanvasRoutes,
    useSimplifiedSelectedCanvasNodes,
    viewportOverlayStyle,
    visibleMeasurementGroups,
    visibleSelectedGroupLayoutUnits,
    warningStatusText,
    warningStatusTitle,
    zoomViewportAtCenter
  };
  return (
    <div
      className={`app-shell ${isBrowseMode ? "browse-mode" : "edit-mode"} left-panel-${leftPanelMode} right-panel-${rightPanelMode} ${sidePanelResize ? "side-panel-resizing" : ""} ${statusbarResize ? "statusbar-resizing" : ""} ${validationPanelResize ? "validation-panel-resizing" : ""} ${canvasResizeDrag ? "canvas-resizing" : ""}`}
      style={appShellStyle}
    >
      {renderSidePanelEdgeTrigger("left")}
      {renderSidePanelEdgeTrigger("right")}
      <aside
        className={`library-panel floating-side-panel ${leftPanelVisible ? "visible" : "hidden"}`}
        onPointerEnter={() => updateAutoPanelVisibility("left", "panel-enter")}
        onPointerLeave={() => updateAutoPanelVisibility("left", "panel-leave")}
      >
        <div
          className="side-panel-resize-handle right-edge"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整左侧栏宽度"
          title="拖拽调整左侧栏宽度"
          onPointerDown={(event) => startSidePanelResize(event, "left")}
        />
        {renderSidePanelModeControls("left")}
        <div className="left-panel-tabs" role="tablist" aria-label="左侧资源库">
          <button className={effectiveLeftPanelTab === "projects" ? "active" : ""} onClick={() => setLeftPanelTab("projects")} role="tab" aria-selected={effectiveLeftPanelTab === "projects"}>
            模型库
          </button>
          {isEditMode && (
            <>
              <button className={leftPanelTab === "library" ? "active" : ""} onClick={() => setLeftPanelTab("library")} role="tab" aria-selected={leftPanelTab === "library"}>
                图元库
              </button>
              <button className={leftPanelTab === "templates" ? "active" : ""} onClick={() => setLeftPanelTab("templates")} role="tab" aria-selected={leftPanelTab === "templates"}>
                模板库
              </button>
            </>
          )}
        </div>
        <div className="left-panel-content">
          {leftPanelContent}
        </div>
      </aside>

      <MainWorkspace {...mainWorkspaceProps} />

      <RightInspectorPanel {...rightInspectorPanelProps} />
      <AppDialogs {...appDialogsProps} />
    </div>
  );
}



