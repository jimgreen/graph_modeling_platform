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

export function createOrderedNodeFromList(ctx: AppRuntimeContext) {
  return (sourceNodes: ModelNode[], nodeId: string) => {
    const { graphStore, nodeById, nodePatchListLookupCacheRef, nodes } = ctx;
    const index = graphStore.nodeIndexById.get(nodeId);
    const indexedNode = index === undefined ? undefined : sourceNodes[index];
    if (indexedNode?.id === nodeId) {
      return indexedNode;
    }
    if (sourceNodes !== nodes && sourceNodes.length < graphStore.nodes.length) {
      let patchNodeById = nodePatchListLookupCacheRef.current.get(sourceNodes);
      if (!patchNodeById) {
        patchNodeById = new Map(sourceNodes.map((node) => [node.id, node]));
        nodePatchListLookupCacheRef.current.set(sourceNodes, patchNodeById);
      }
      const patchedNode = patchNodeById.get(nodeId);
      if (patchedNode) {
        return patchedNode;
      }
    }
    const currentNode = sourceNodes === nodes || sourceNodes.length < graphStore.nodes.length ? nodeById.get(nodeId) : undefined;
    return currentNode?.id === nodeId ? currentNode : undefined;
  
  };
}

export function createRoutingNodesForConnectionEdges(ctx: AppRuntimeContext) {
  return (candidateEdges: Edge[], sourceNodes: ModelNode[], extraNodeIds: Iterable<string> = []) => {
    const { addRoutingNodesForConnectionEdge, nodeById, orderedNodeFromList } = ctx;
    if (candidateEdges.length === 0) {
      return [];
    }
    const scopedNodes = new Map<string, ModelNode>();
    for (const nodeId of extraNodeIds) {
      const node = orderedNodeFromList(sourceNodes, nodeId) ?? nodeById.get(nodeId);
      if (node) {
        scopedNodes.set(node.id, node);
      }
    }
    for (const edge of candidateEdges) {
      addRoutingNodesForConnectionEdge(edge, sourceNodes, scopedNodes);
    }
    return scopedNodes.size > 0 ? Array.from(scopedNodes.values()) : sourceNodes;
  
  };
}

export function createRenderMultiNodeDragOverlay(ctx: AppRuntimeContext) {
  return () => {
    const { colorDisplayMode, colorPalette, connectionLineStyle, dragging, draggingRef, mode, multiNodeDragOverlayDeltaRef, multiNodeDragOverlayRef, nodeById, nodeForegroundImage, nodeImage, updateMultiNodeDragOverlayTransform, visibleNodeIdSet } = ctx;
    if (!dragging || !isMultiNodeMoveState(dragging)) {
      return null;
    }
    const overlay = dragging.overlayPreview ?? {
      bounds: null,
      edgeRoutes: [],
      dynamicEdgePreviewEdges: [],
      movedNodeIds: new Set<string>(),
      draggedEdgeIds: new Set<string>(),
      movedBusNodeIds: new Set<string>()
    };
    if (overlay.simplifiedMarkup) {
      return (
        <g
          ref={(element) => {
            multiNodeDragOverlayRef.current = element;
            if (element) {
              updateMultiNodeDragOverlayTransform(draggingRef.current?.previewDelta ?? draggingRef.current?.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
            }
          }}
          className="multi-node-drag-overlay"
          transform={`translate(${Math.round(multiNodeDragOverlayDeltaRef.current.x)} ${Math.round(multiNodeDragOverlayDeltaRef.current.y)})`}
          dangerouslySetInnerHTML={{ __html: overlay.simplifiedMarkup }}
        />
      );
    }
    return (
      <g
        ref={(element) => {
          multiNodeDragOverlayRef.current = element;
          if (element) {
            updateMultiNodeDragOverlayTransform(draggingRef.current?.previewDelta ?? draggingRef.current?.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
          }
        }}
        className="multi-node-drag-overlay"
        transform={`translate(${Math.round(multiNodeDragOverlayDeltaRef.current.x)} ${Math.round(multiNodeDragOverlayDeltaRef.current.y)})`}
      >
        {overlay.edgeRoutes.map((route) => (
          <path key={`multi-drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
        ))}
        {dragging.nodeIds.map((nodeId) => {
          const node = nodeById.get(nodeId);
          const originalPosition = dragging.originalPositions[nodeId] ?? node?.position;
          if (!node || !originalPosition || !visibleNodeIdSet.has(node.id)) {
            return null;
          }
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
              key={`multi-drag-preview-node-${node.id}`}
              className={`multi-node-drag-preview-node ${nodeIsBus ? "bus-node" : ""}`}
              transform={`translate(${originalPosition.x} ${originalPosition.y})`}
            >
              <title>{node.name}</title>
              {imageHref && !nodeIsBus && (
                <clipPath id={`multi-drag-preview-clip-${node.id}`}>
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
                      clipPath={`url(#multi-drag-preview-clip-${node.id})`}
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
                      clipPath={`url(#multi-drag-preview-clip-${node.id})`}
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
                      clipPath={`url(#multi-drag-preview-clip-${node.id})`}
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
        {overlay.bounds && (
          <rect
            className="multi-node-drag-bounds-preview"
            x={overlay.bounds.left}
            y={overlay.bounds.top}
            width={Math.max(1, overlay.bounds.right - overlay.bounds.left)}
            height={Math.max(1, overlay.bounds.bottom - overlay.bounds.top)}
          />
        )}
      </g>
    );
  
  };
}

export function createFitLibraryFlyoutsToVisibleArea(ctx: AppRuntimeContext) {
  return () => {
    const { libraryComponentListRefs, libraryComponentTypeHeaderRefs, libraryFlyoutPositionsRef, libraryScrollRef, setLibraryFlyoutPositions } = ctx;
    const scrollElement = libraryScrollRef.current;
    if (!scrollElement) {
      return;
    }
    const margin = 8;
    const scrollRect = scrollElement.getBoundingClientRect();
    const minTop = scrollRect.top + margin;
    const maxBottom = scrollRect.bottom - margin;
    const viewportRight = window.innerWidth || document.documentElement.clientWidth || scrollRect.right;
    const maxRight = viewportRight - margin;
    const gap = 8;
    const nextPositions: Record<string, { top: number; left: number }> = {};
    libraryComponentListRefs.current.forEach((element, key) => {
      if (!key.startsWith("flyout:")) {
        return;
      }
      const headerElement = libraryComponentTypeHeaderRefs.current.get(key);
      if (!headerElement) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const headerRect = headerElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const desiredLeft = headerRect.right + gap;
      let left = Math.min(desiredLeft, Math.max(margin, maxRight - width));
      left = Math.max(margin, left);
      const maxTop = Math.max(minTop, maxBottom - height);
      let top = Math.min(Math.max(headerRect.top, minTop), maxTop);
      const horizontallyOverlapsHeader =
        left < headerRect.right + gap &&
        left + width > headerRect.left - gap;
      if (horizontallyOverlapsHeader) {
        const belowTop = headerRect.bottom + gap;
        const aboveTop = headerRect.top - gap - height;
        const belowOverflow = Math.max(0, belowTop + height - maxBottom) + Math.max(0, minTop - belowTop);
        const aboveOverflow = Math.max(0, aboveTop + height - maxBottom) + Math.max(0, minTop - aboveTop);
        top = belowOverflow <= aboveOverflow ? belowTop : aboveTop;
        top = Math.min(Math.max(top, minTop), maxTop);
      }
      nextPositions[key] = {
        top: Math.round(top),
        left: Math.round(left)
      };
    });
    const currentPositions = libraryFlyoutPositionsRef.current;
    const currentKeys = Object.keys(currentPositions);
    const nextKeys = Object.keys(nextPositions);
    const unchanged =
      currentKeys.length === nextKeys.length &&
      nextKeys.every((key) => {
        const currentPosition = currentPositions[key];
        const nextPosition = nextPositions[key];
        return currentPosition?.top === nextPosition.top && currentPosition?.left === nextPosition.left;
      });
    if (!unchanged) {
      setLibraryFlyoutPositions(nextPositions);
    }
  
  };
}

export function createApplyCanvasBounds(ctx: AppRuntimeContext) {
  return (bounds: CanvasBounds, originShift: Point = { x: 0, y: 0 }, options: { preserveScrollAnchor?: boolean } = {}) => {
    const { canvasBoundsRef, clampCanvasBounds, markCanvasBoundsScrollSyncPending, setCanvasHeight, setCanvasSizeDraft, setCanvasWidth, setViewBox } = ctx;
    const currentBoundsForApply = canvasBoundsRef.current;
    const nextBounds = clampCanvasBounds(bounds);
    if (!canvasBoundsChangeIsMeaningful(currentBoundsForApply, nextBounds, originShift)) {
      return false;
    }
    if (options.preserveScrollAnchor !== false) {
      markCanvasBoundsScrollSyncPending();
    }
    canvasBoundsRef.current = nextBounds;
    setCanvasWidth(nextBounds.width);
    setCanvasHeight(nextBounds.height);
    setCanvasSizeDraft({ width: String(nextBounds.width), height: String(nextBounds.height) });
    setViewBox((current) => {
      return viewBoxAfterCanvasBoundsChange(current, nextBounds, originShift, currentBoundsForApply);
    });
    return true;
  
  };
}

export function createCanvasNoScrollOffsetForCanvasResizeAnchor(ctx: AppRuntimeContext) {
  return (drag: NonNullable<CanvasResizeState>, nextBounds: CanvasBounds): Point => {
    const { canvasBoundsRef, canvasFrameViewportSize, viewBoxRef } = ctx;
    const currentBounds = canvasBoundsRef.current;
    const currentViewBox = viewBoxRef.current;
    const nextViewBox = canvasRenderViewBoxAfterBoundsDraft(currentViewBox, currentBounds, nextBounds);
    const nextScrollScale = canvasScrollScaleFromViewBox(nextViewBox, nextBounds);
    const nextDisplayWidth = Math.max(1, Math.round(nextBounds.width * nextScrollScale.x));
    const nextDisplayHeight = Math.max(1, Math.round(nextBounds.height * nextScrollScale.y));
    const nextHorizontalScrollbarsActive =
      canvasFrameViewportSize.width > 0 &&
      nextDisplayWidth + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.width + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
    const nextVerticalScrollbarsActive =
      canvasFrameViewportSize.height > 0 &&
      nextDisplayHeight + CANVAS_FRAME_INSET * 2 > canvasFrameViewportSize.height + CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE;
    const nextScrollSurfaceWidth = canvasScrollSurfaceSize(
      nextDisplayWidth,
      canvasFrameViewportSize.width,
      nextHorizontalScrollbarsActive
    );
    const nextScrollSurfaceHeight = canvasScrollSurfaceSize(
      nextDisplayHeight,
      canvasFrameViewportSize.height,
      nextVerticalScrollbarsActive
    );
    const nextBaseDisplayOffsetX = canvasDisplayOffset(
      nextDisplayWidth,
      nextScrollSurfaceWidth,
      canvasFrameViewportSize.width,
      nextHorizontalScrollbarsActive
    );
    const nextBaseDisplayOffsetY = canvasDisplayOffset(
      nextDisplayHeight,
      nextScrollSurfaceHeight,
      canvasFrameViewportSize.height,
      nextVerticalScrollbarsActive
    );
    const desiredLeft = canvasResizeEdgeAnchorsStart(drag.edge, "x")
      ? drag.startDisplayOffsetX + drag.startDisplayWidth - nextDisplayWidth
      : drag.startDisplayOffsetX;
    const desiredTop = canvasResizeEdgeAnchorsStart(drag.edge, "y")
      ? drag.startDisplayOffsetY + drag.startDisplayHeight - nextDisplayHeight
      : drag.startDisplayOffsetY;
    return {
      x: clampCanvasNoScrollOffset(
        desiredLeft - nextBaseDisplayOffsetX,
        nextDisplayWidth,
        canvasFrameViewportSize.width,
        nextBaseDisplayOffsetX,
        nextHorizontalScrollbarsActive
      ),
      y: clampCanvasNoScrollOffset(
        desiredTop - nextBaseDisplayOffsetY,
        nextDisplayHeight,
        canvasFrameViewportSize.height,
        nextBaseDisplayOffsetY,
        nextVerticalScrollbarsActive
      )
    };
  
  };
}

export function createSyncCanvasFrameScrollToWheelAnchor(ctx: AppRuntimeContext) {
  return (anchor: WheelZoomAnchor) => {
    const { canvasBaseDisplayOffsetX, canvasBaseDisplayOffsetY, canvasBoundsRef, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasScrollScaleRef, canvasVerticalScrollbarsActiveRef, clampCanvasNoScrollOffsetPoint, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, setViewBox, skipNextCanvasScrollSyncRef, svgRef, viewBoxRef } = ctx;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    const bounds = canvasBoundsRef.current;
    if (!frame || !svg || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    const svgRect = svg.getBoundingClientRect();
    const scale = {
      x: svgRect.width > 0 ? svgRect.width / bounds.width : canvasScrollScaleRef.current.x,
      y: svgRect.height > 0 ? svgRect.height / bounds.height : canvasScrollScaleRef.current.y
    };
    const maxScroll = {
      left: Math.max(0, frame.scrollWidth - frame.clientWidth),
      top: Math.max(0, frame.scrollHeight - frame.clientHeight)
    };
    const scrollPosition = anchoredCanvasScrollPosition(
      anchor,
      scale,
      canvasFramePaddingOffset(frame, svg),
      maxScroll
    );
    const noScrollOffset = anchoredCanvasNoScrollOffset(
      anchor,
      scale,
      {
        left: canvasBaseDisplayOffsetX,
        top: canvasBaseDisplayOffsetY
      }
    );
    const nextCanvasNoScrollOffset = clampCanvasNoScrollOffsetPoint({
      x: canvasHorizontalScrollbarsActiveRef.current ? 0 : noScrollOffset.x,
      y: canvasVerticalScrollbarsActiveRef.current ? 0 : noScrollOffset.y
    });
    const targetScrollLeft = canvasHorizontalScrollbarsActiveRef.current ? scrollPosition.left : 0;
    const targetScrollTop = canvasVerticalScrollbarsActiveRef.current ? scrollPosition.top : 0;
    const currentViewBox = viewBoxRef.current;
    const nextViewBox = normalizeViewBoxToCanvas({
      ...currentViewBox,
      x: canvasHorizontalScrollbarsActiveRef.current
        ? scrollPositionToViewBoxStart(targetScrollLeft, currentViewBox.width, bounds.width, maxScroll.left, currentViewBox.x)
        : currentViewBox.x,
      y: canvasVerticalScrollbarsActiveRef.current
        ? scrollPositionToViewBoxStart(targetScrollTop, currentViewBox.height, bounds.height, maxScroll.top, currentViewBox.y)
        : currentViewBox.y
    }, bounds);
    setCanvasFrameScrollPosition(
      frame,
      targetScrollLeft,
      targetScrollTop
    );
    setViewBox((current) => {
      const updated = normalizeViewBoxToCanvas({
        ...current,
        x: canvasHorizontalScrollbarsActiveRef.current ? nextViewBox.x : current.x,
        y: canvasVerticalScrollbarsActiveRef.current ? nextViewBox.y : current.y
      }, canvasBoundsRef.current);
      if (
        Math.round(updated.x) === Math.round(current.x) &&
        Math.round(updated.y) === Math.round(current.y) &&
        Math.round(updated.width) === Math.round(current.width) &&
        Math.round(updated.height) === Math.round(current.height)
      ) {
        return current;
      }
      skipNextCanvasScrollSyncRef.current = true;
      return updated;
    });
    if (!canvasHorizontalScrollbarsActiveRef.current || !canvasVerticalScrollbarsActiveRef.current) {
      skipNextCanvasScrollSyncRef.current = true;
      setCanvasNoScrollOffset((current) => {
        if (
          Math.round(current.x) === Math.round(nextCanvasNoScrollOffset.x) &&
          Math.round(current.y) === Math.round(nextCanvasNoScrollOffset.y)
        ) {
          return current;
        }
        return nextCanvasNoScrollOffset;
      });
    }
  
  };
}

export function createGraphStorePatchStillCurrent(ctx: AppRuntimeContext) {
  return (store: GraphStore, nodeUpdates: readonly ModelNode[], edgeUpserts: readonly Edge[], edgeDeleteIds: readonly string[]) => {
    for (const node of nodeUpdates) {
      if (store.nodeMap.get(node.id) !== node) {
        return false;
      }
    }
    for (const edge of edgeUpserts) {
      if (store.edgeMap.get(edge.id) !== edge) {
        return false;
      }
    }
    for (const edgeId of edgeDeleteIds) {
      if (store.edgeMap.has(edgeId)) {
        return false;
      }
    }
    return true;
  
  };
}

export function createRebuildEdgesAfterNodeGeometryChange(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], changedNodeIds: Iterable<string>, currentEdges: Edge[] = edges, preservedEdgeIds = new Set<string>()) => {
    const { rebuildEdgeUpdatesAfterNodeGeometryChange } = ctx;
    const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, changedNodeIds, currentEdges, preservedEdgeIds);
    if (edgeUpdates.length === 0) {
      return currentEdges;
    }
    const edgeUpdateById = new Map(edgeUpdates.map((edge) => [edge.id, edge]));
    let changed = false;
    const nextEdges = currentEdges.map((edge) => {
      const update = edgeUpdateById.get(edge.id);
      if (!update) {
        return edge;
      }
      changed = true;
      return update;
    });
    return changed ? nextEdges : currentEdges;
  
  };
}

export function createCloneProjectState(ctx: AppRuntimeContext) {
  return (deepModelSnapshot = false, graphPatchScope?: UndoGraphPatchScope): UndoSnapshot => {
    const { activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectName, topology, topologyErrors, topologyStatus, voltageUnit } = ctx;
    return ({
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
    topologyErrors: deepModelSnapshot ? cloneTopologyErrorsForUndo(topologyErrors) : topologyErrors,
    topology: deepModelSnapshot ? cloneTopologyForUndo(topology) : topology,
    topologyStatus: { ...topologyStatus }
  });
  };
}

export function createRouteForCurrentEdgeSave(ctx: AppRuntimeContext) {
  return (edge: Edge): RoutedEdge | undefined => {
    const { canvasBounds, nodeById, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, routedEdgeById } = ctx;
    const cachedRoute =
      !pendingStoredRouteEdgeIdsRef.current.has(edge.id) && !pendingRouteEdgeIdsRef.current.has(edge.id)
        ? routedEdgeById.get(edge.id)
        : undefined;
    if (cachedRoute?.points.length) {
      return cachedRoute;
    }
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (source && target) {
      const route = routeEdgesForStoredRendering(compactPreviewNodes(source, target), [edge], canvasBounds)[0];
      if (route?.points.length) {
        return route;
      }
    }
    return edge.routePoints && edge.routePoints.length >= 2
      ? { edgeId: edge.id, points: edge.routePoints.map((point) => ({ ...point })), path: "" }
      : undefined;
  
  };
}

export function createCurrentProject(ctx: AppRuntimeContext) {
  return (): ProjectFile => {
    const { activeLayerId, allowAutoExpandCanvas, backgroundLayerIds, backgroundProjectId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, edgeWithCurrentRouteGeometryForSave, groups, layers, measurements, nodes, powerBaseValue, powerUnit, projectName, voltageUnit } = ctx;
    const projectEdges = edges.map(edgeWithCurrentRouteGeometryForSave);
    return normalizeProjectLayers(lockProjectEdgeTerminals({
      version: 1,
      name: projectName,
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
      groups: normalizeModelGroups(groups, nodes, projectEdges),
      measurements: normalizeProjectMeasurements(measurements, nodes),
      nodes,
      edges: projectEdges
    }));
  
  };
}

export function createGraphDirtyBaselineChanged(ctx: AppRuntimeContext) {
  return (previous: GraphDirtyBaseline, next: GraphDirtyBaseline) => {
    return previous.projectName !== next.projectName ||
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
    previous.groups !== next.groups;
  };
}

export function createToggleSelectionFromModifierClick(ctx: AppRuntimeContext) {
  return (nodeIds: readonly string[], edgeIds: readonly string[] = []) => {
    const { activeLayerEdgeIdSet, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, resetConnectPreviewState, selectedEdgeId, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = ctx;
    const targetNodeIds = nodeIds.filter((nodeId) => activeLayerNodeIdSet.has(nodeId));
    const targetEdgeIds = edgeIds.filter((edgeId) => activeLayerEdgeIdSet.has(edgeId));
    if (targetNodeIds.length === 0 && targetEdgeIds.length === 0) {
      return;
    }
    const allTargetsSelected =
      targetNodeIds.every((nodeId) => activeSelectedNodeIds.includes(nodeId)) &&
      targetEdgeIds.every((edgeId) => activeSelectedEdgeIds.includes(edgeId));
    const targetNodeIdSet = new Set(targetNodeIds);
    const targetEdgeIdSet = new Set(targetEdgeIds);
    const nextNodeIds = allTargetsSelected
      ? activeSelectedNodeIds.filter((nodeId) => !targetNodeIdSet.has(nodeId))
      : [...activeSelectedNodeIds, ...targetNodeIds.filter((nodeId) => !activeSelectedNodeIds.includes(nodeId))];
    const nextEdgeIds = allTargetsSelected
      ? activeSelectedEdgeIds.filter((edgeId) => !targetEdgeIdSet.has(edgeId))
      : [...activeSelectedEdgeIds, ...targetEdgeIds.filter((edgeId) => !activeSelectedEdgeIds.includes(edgeId))];
    setCanvasSelectionScope("direct");
    setSelectedNodeIds(nextNodeIds);
    setSelectedEdgeIds(nextEdgeIds);
    setSelectedEdgeId(nextEdgeIds.includes(selectedEdgeId) ? selectedEdgeId : nextEdgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  
  };
}

export function createFinishModifierSelectionPress(ctx: AppRuntimeContext) {
  return (pointerId?: number) => {
    const { activeLayerEdgeIdSet, activeLayerNodeIdSet, edgeById, finishMarqueeSelectionFromPoints, modifierSelectionPressRef, nodeById, setMarquee, setModifierSelectionPress, toggleEdgeSelectionFromModifierClick, toggleNodeSelectionFromModifierClick, toggleSelectionFromModifierClick } = ctx;
    const press = modifierSelectionPressRef.current;
    if (!press || (pointerId !== undefined && press.pointerId !== pointerId)) {
      return false;
    }
    setModifierSelectionPress(null);
    if (press.moved) {
      finishMarqueeSelectionFromPoints(press.startPoint, press.currentPoint);
      return true;
    }
    setMarquee(null);
    if (press.target.kind === "node") {
      const node = nodeById.get(press.target.nodeId);
      if (node && activeLayerNodeIdSet.has(node.id)) {
        toggleNodeSelectionFromModifierClick(node);
      }
    } else if (press.target.kind === "edge") {
      const edge = edgeById.get(press.target.edgeId);
      if (edge && activeLayerEdgeIdSet.has(edge.id)) {
        toggleEdgeSelectionFromModifierClick(edge);
      }
    } else if (press.target.kind === "selection") {
      toggleSelectionFromModifierClick(press.target.nodeIds, press.target.edgeIds);
    }
    return true;
  
  };
}

export function createStartNodeLabelRotateDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode) => {
    const { activateInspectorFromCanvas, activeLayerNodeIdSet, isBrowseMode, selectCanvasGraphics, setGraphInfoView, setInspectorTab, setNodeLabelRotateDrag, startModifierSelectionPress, svgRef } = ctx;
    event.preventDefault();
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
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setInspectorTab("graph");
    setGraphInfoView("selected");
    activateInspectorFromCanvas();
    setNodeLabelRotateDrag({
      nodeId: node.id,
      pointerId: event.pointerId,
      center: nodeLabelCanvasCenter(node),
      startRotation: normalizeNodeLabelRotation(node.params._labelRotation)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createPasteSelection(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerId, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, canvasClipboard, canvasHeight, canvasWidth, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, markStoredRouteEdgesDirty, nodes, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, requireEditMode, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setDeviceIndexCounters, setGraphArrays, setGroups, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = ctx;
    if (!requireEditMode("粘贴图元")) {
      return;
    }
    if (canvasClipboard.nodes.length === 0 && canvasClipboard.edges.length === 0) {
      return;
    }
    const targetPoint = lastRawCanvasPointerRef.current ?? lastCanvasPointerRef.current;
    if (!targetPoint) {
      window.alert("请先将鼠标移动到画布内，再执行粘贴操作。");
      return;
    }
    const bounds = canvasClipboardBounds(canvasClipboard);
    if (!bounds) {
      return;
    }
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const pasteTargetPoint = {
      x: targetPoint.x,
      y: targetPoint.y
    };
    const cloned = cloneCanvasClipboard(
      canvasClipboard,
      pasteTargetPoint,
      () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      if (canvasClipboard.edges.length > 0) {
        window.alert("不能粘贴悬空联络线：请同时复制联络线两端连接的设备或母线。");
      }
      return;
    }
    if (rejectAutoCanvasExpansionForContent([...nodes, ...cloned.nodes], [...edges, ...cloned.edges])) {
      return;
    }
    pushUndoSnapshot();
    const pasteOriginShift = leftTopCanvasOriginShiftForContent(
      [...nodes, ...cloned.nodes],
      [...edges, ...cloned.edges]
    );
    const pasteSourceNodes = hasCanvasOriginShift(pasteOriginShift)
      ? nodes.map((node) => translateNodeBy(node, pasteOriginShift))
      : nodes;
    const pasteSourceEdges = hasCanvasOriginShift(pasteOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, pasteOriginShift))
      : edges;
    const shiftedClonedNodes = hasCanvasOriginShift(pasteOriginShift)
      ? cloned.nodes.map((node) => translateNodeBy(node, pasteOriginShift))
      : cloned.nodes;
    const shiftedClonedEdges = hasCanvasOriginShift(pasteOriginShift)
      ? cloned.edges.map((edge) => translateEdgeBy(edge, pasteOriginShift))
      : cloned.edges;
    const pastedCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, pasteOriginShift),
      [...pasteSourceNodes, ...shiftedClonedNodes],
      [...pasteSourceEdges, ...shiftedClonedEdges],
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(pastedCanvasBounds, pasteOriginShift);
    shiftCachedRoutesForCanvasOrigin(pasteOriginShift);
    if (hasCanvasOriginShift(pasteOriginShift)) {
      markBusTerminalSyncDirtyForEdges(pasteSourceEdges, shiftedClonedEdges);
    }
    let nextDeviceIndexCounters = normalizeDeviceIndexCounters(deviceIndexCounters, pasteSourceNodes);
    const pasted = shiftedClonedNodes.map((node) => {
      const draftNode = { ...node, layerId: activeLayerId, position: clampNodePositionToBounds(node, pastedCanvasBounds, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = shiftedClonedEdges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, pastedCanvasBounds) : undefined,
      targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, pastedCanvasBounds) : undefined,
      manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, pastedCanvasBounds)),
      routePoints: edge.routePoints?.map((point) => clampPointToBounds(point, pastedCanvasBounds))
    }));
    const nextNodes = [...pasteSourceNodes, ...pasted];
    const nextEdges = [...pasteSourceEdges, ...pastedEdges];
    markStoredRouteEdgesDirty(pastedEdges.map((edge) => edge.id));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setGraphArrays(nextNodes, nextEdges);
    const shiftedPasteTargetPoint = translatePointBy(targetPoint, pasteOriginShift);
    lastRawCanvasPointerRef.current = shiftedPasteTargetPoint;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPasteTargetPoint, pastedCanvasBounds);
    setGroups((current) => normalizeModelGroups([...current, ...cloned.groups], nextNodes, nextEdges));
    setCanvasSelectionScope("group");
    setSelectedNodeIds(pasted.map((node) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`粘贴 ${pasted.length} 个图元、${pastedEdges.length} 条联络线${pastedCanvasBounds.width > canvasWidth || pastedCanvasBounds.height > canvasHeight ? "，画布已扩展" : ""}`);
  
  };
}

export function createGroupSelectedGraphics(ctx: AppRuntimeContext) {
  return () => {
    const { activeSelectedEdgeIds, activeSelectedNodeIds, canGroupSelectedGraphics, edges, groups, nodes, pushUndoSnapshot, requireEditMode, setCanvasSelectionScope, setGroups, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
    if (!requireEditMode("组合图元")) {
      return;
    }
    if (!canGroupSelectedGraphics) {
      return;
    }
    const result = createCanvasGroupFromSelection(
      groups,
      activeSelectedNodeIds,
      activeSelectedEdgeIds,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (!result.group) {
      return;
    }
    pushUndoSnapshot();
    const nextGroups = normalizeModelGroups(result.groups, nodes, edges);
    setGroups(nextGroups);
    const selection = expandSelectionByGroups(nextGroups, activeSelectedNodeIds, activeSelectedEdgeIds);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    writeOperationLog(`组合 ${selection.nodeIds.length} 个图元、${selection.edgeIds.length} 条联络线`);
  
  };
}

export function createBoundsForNodeSet(ctx: AppRuntimeContext) {
  return (sourceNodes: ModelNode[], movedIds: Set<string>, positions?: Record<string, Point>, padding = 0) => {
    const { orderedNodesForIds } = ctx;
    let bounds: { left: number; right: number; top: number; bottom: number } | null = null;
    for (const node of orderedNodesForIds(sourceNodes, movedIds)) {
      const position = positions?.[node.id] ?? node.position;
      const nodeBounds = nodeVisualInteractionBounds(node, position, padding);
      bounds = bounds
        ? {
            left: Math.min(bounds.left, nodeBounds.left),
            right: Math.max(bounds.right, nodeBounds.right),
            top: Math.min(bounds.top, nodeBounds.top),
            bottom: Math.max(bounds.bottom, nodeBounds.bottom)
          }
        : nodeBounds;
    }
    return bounds;
  
  };
}

export function createLocalRouteOptimizationCandidateEdges(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[], movedNodeIds: string[], selectedEdgeIds: Set<string>, originalPositions: Record<string, Point> | undefined, directCandidateEdges: Edge[]) => {
    const { boundsForNodeSet, edgeById, routedEdgeSpatialIndex } = ctx;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const collected = new Map<string, Edge>();
    const directEdgeById = new Map(directCandidateEdges.map((edge) => [edge.id, edge]));
    const addEdge = (edge: Edge | undefined) => {
      if (edge) {
        collected.set(edge.id, edge);
      }
    };
    for (const edge of directCandidateEdges) {
      addEdge(edge);
    }
    for (const edgeId of selectedEdgeIds) {
      addEdge(directEdgeById.get(edgeId) ?? edgeById.get(edgeId));
    }
    const addRoutesNearBounds = (bounds: ReturnType<typeof boundsForNodeSet>) => {
      if (!bounds) {
        return;
      }
      for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, bounds)) {
        addEdge(directEdgeById.get(route.edgeId) ?? edgeById.get(route.edgeId));
      }
    };
    addRoutesNearBounds(boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    addRoutesNearBounds(boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING));
    return Array.from(collected.values());
  
  };
}

export function createRoutePointsNearOriginalMovedNodes(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: Iterable<string>, originalPositions: Record<string, Point> | undefined, baseRoutePoints: DraggingState["originalRoutePoints"]): DraggingState["originalRoutePoints"] => {
    const { boxesOverlap, expandRouteBox, orderedNodesForIds, routedEdgeById, routedEdgeSpatialIndex, routeTouchesExpandedBoxes } = ctx;
    const movedIds = new Set(movedNodeIds);
    if (
      movedIds.size === 0 ||
      movedIds.size > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES ||
      !originalPositions ||
      candidateEdges.length === 0
    ) {
      return baseRoutePoints;
    }
    const originalMovedNodes = orderedNodesForIds(previousNodes, movedIds)
      .filter((node) => originalPositions[node.id])
      .map((node) => ({ ...node, position: originalPositions[node.id] }));
    if (originalMovedNodes.length === 0) {
      return baseRoutePoints;
    }
    const originalBoxes = getRouteBlockingCandidates(originalMovedNodes).map((candidate) =>
      expandRouteBox(candidate.box, ORIGINAL_POSITION_REROUTE_PADDING)
    );
    const originalBounds = originalBoxes.reduce<{ left: number; right: number; top: number; bottom: number } | null>(
      (bounds, box) => {
        if (!bounds) {
          return { ...box };
        }
        return {
          left: Math.min(bounds.left, box.left),
          right: Math.max(bounds.right, box.right),
          top: Math.min(bounds.top, box.top),
          bottom: Math.max(bounds.bottom, box.bottom)
        };
      },
      null
    );
    if (!originalBounds) {
      return baseRoutePoints;
    }
    let nextRoutePoints = baseRoutePoints;
    for (const edge of candidateEdges) {
      if (baseRoutePoints[edge.id] || movedIds.has(edge.sourceId) || movedIds.has(edge.targetId)) {
        continue;
      }
      const route = routedEdgeById.get(edge.id);
      const routeBounds = route ? routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8) : null;
      if (!route || !routeBounds || !boxesOverlap(routeBounds, originalBounds)) {
        continue;
      }
      if (!routeTouchesExpandedBoxes(route.points, originalBoxes)) {
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

export function createFinalizeMovedNodeEdgesFast(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: string[], localCandidateEdges: Edge[] = candidateEdges) => {
    const { canvasBounds, routedEdges, routingNodesForConnectionEdge, terminalReconcileNodeScope } = ctx;
    const movedNodeIdSet = new Set(movedNodeIds);
    const reconcileNodes = terminalReconcileNodeScope(previousNodes, nextNodes, movedNodeIdSet);
    const reconciled = reconcileOverlappingTerminalConnections(
      reconcileNodes.previous,
      reconcileNodes.next,
      candidateEdges,
      (_first, _second, index) => `edge-overlap-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      movedNodeIdSet,
      localCandidateEdges
    );
    let nextEdges = reconciled.edges;
    for (const edgeId of reconciled.addedEdgeIds) {
      const edge = nextEdges.find((item) => item.id === edgeId);
      if (!edge) {
        continue;
      }
      const prepared = prepareConnectionEdgeForCommit(routingNodesForConnectionEdge(edge, nextNodes), [edge], edgeId, canvasBounds, routedEdges);
      if (prepared.ok && prepared.edge) {
        nextEdges = nextEdges.map((edge) => edge.id === edgeId ? prepared.edge! : edge);
      }
    }
    return nextEdges;
  
  };
}

export function createShouldRunDeferredMoveOptimization(ctx: AppRuntimeContext) {
  return (candidateEdges: Edge[], movedNodeIds: string[], selectedEdgeIds: Set<string>, blockedEdgeIds = new Set<string>()) => {
    if (blockedEdgeIds.size > 0) {
      return true;
    }
    const movedIds = new Set(movedNodeIds);
    let affectedConnectionCount = 0;
    for (const edge of candidateEdges) {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)) {
        affectedConnectionCount += 1;
        if (affectedConnectionCount > 1) {
          return false;
        }
      }
    }
    return affectedConnectionCount === 1;
  
  };
}

export function createScheduleMovedEdgeOptimization(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[], fastEdges: Edge[], movedNodeIds: string[], originalRoutePoints: DraggingState["originalRoutePoints"], selectedEdgeIds = new Set<string>(), originalPositions?: Record<string, Point>, moveCandidateEdges: Edge[] = [], expectedPatch?: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] }) => {
    const { deferredMoveOptimizationCancelRef, graphStorePatchStillCurrent, latestEdgesRef, latestGraphStoreRef, latestNodesRef, localRouteOptimizationCandidateEdges, localRouteOptimizationEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, optimizeMovedNodeEdgeRoutes, routePointsForMovedNodeBlockers, routePointsNearOriginalMovedNodes, setGraphStore, shouldRunDeferredMoveOptimization } = ctx;
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const routeCandidateEdges = moveCandidateEdges.length > 0
      ? moveCandidateEdges
      : localRouteOptimizationCandidateEdges(
          previousNodes,
          nextNodes,
          movedNodeIds,
          selectedEdgeIds,
          originalPositions,
          moveCandidateEdges
        );
    const optimizationEdges = localRouteOptimizationEdges(
      previousNodes,
      nextNodes,
      routeCandidateEdges,
      movedNodeIds,
      selectedEdgeIds,
      originalPositions
    );
    if (
      optimizationEdges.length === 0 ||
      !shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds)
    ) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const optimizationEdgeIds = optimizationEdges.map((edge) => edge.id);
    deferredMoveOptimizationCancelRef.current = scheduleIdleWork(() => {
      deferredMoveOptimizationCancelRef.current = null;
      const latestStore = latestGraphStoreRef.current;
      if (!latestStore) {
        return;
      }
      if (expectedPatch) {
        if (!graphStorePatchStillCurrent(latestStore, expectedPatch.nodeUpdates, expectedPatch.edgeUpserts, expectedPatch.edgeDeleteIds)) {
          return;
        }
      } else if (latestNodesRef.current !== nextNodes || latestEdgesRef.current !== fastEdges) {
        return;
      }
      const expectedNodes = latestStore.nodes;
      const latestOptimizationEdges = optimizationEdgeIds.flatMap((edgeId) => {
        const edge = latestStore.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      });
      if (latestOptimizationEdges.length === 0) {
        return;
      }
      const blockedRoutePoints = routePointsForMovedNodeBlockers(expectedNodes, latestOptimizationEdges, movedNodeIds, {});
      const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));
      const routePointsForOptimization = routePointsNearOriginalMovedNodes(
        previousNodes,
        latestOptimizationEdges,
        movedNodeIds,
        originalPositions,
        blockedRoutePoints
      );
      const releasedEdgeIds = Object.keys(routePointsForOptimization).filter((edgeId) => !blockedRoutePoints[edgeId]);
      const forcedRerouteEdgeIds = new Set(releasedEdgeIds);
      for (const edgeId of releasedEdgeIds) {
        blockedEdgeIds.add(edgeId);
      }
      if (!shouldRunDeferredMoveOptimization(latestOptimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)) {
        return;
      }
      const optimized = optimizeMovedNodeEdgeRoutes(
        expectedNodes,
        latestOptimizationEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds,
        routePointsForOptimization,
        forcedRerouteEdgeIds,
        latestOptimizationEdges
      );
      if (optimized.edges === latestOptimizationEdges) {
        return;
      }
      const dirtyOptimizedEdgeIds = new Set<string>([...blockedEdgeIds, ...forcedRerouteEdgeIds]);
      for (const edgeId of Object.keys(optimized.routePoints)) {
        dirtyOptimizedEdgeIds.add(edgeId);
      }
      const previousOptimizedEdgeById = new Map(latestOptimizationEdges.map((edge) => [edge.id, edge]));
      const optimizedEdgeById = new Map(optimized.edges.map((edge) => [edge.id, edge]));
      const optimizedEdgeUpdates: Edge[] = [];
      for (const edgeId of dirtyOptimizedEdgeIds) {
        const optimizedEdge = optimizedEdgeById.get(edgeId);
        if (optimizedEdge && previousOptimizedEdgeById.get(edgeId) !== optimizedEdge) {
          optimizedEdgeUpdates.push(optimizedEdge);
        }
      }
      if (optimizedEdgeUpdates.length === 0) {
        return;
      }
      markRouteEdgesDirty(dirtyOptimizedEdgeIds);
      markStoredRouteEdgesDirty(dirtyOptimizedEdgeIds);
      setGraphStore((current) => graphStorePatchEdges(current, optimizedEdgeUpdates));
    }, 180, 1500);
  
  };
}

export function createCommitFastMovedGraphPatches(ctx: AppRuntimeContext) {
  return (movedNodeUpdates: ModelNode[], nextNodes: ModelNode[], candidateEdges: Edge[], previousCandidateEdges: Edge[], movedNodeIds: string[], originalRoutePoints: DraggingState["originalRoutePoints"], selectedEdgeIds = new Set<string>(), originalPositions?: Record<string, Point>, previousNodes: ModelNode[] = nodes, effectiveCanvasBounds: CanvasBounds = canvasBounds) => {
    const { allowAutoExpandCanvas, applyCanvasBounds, busTerminalSyncNodeIdsForGraphPatch, canvasBoundsForAutoExpandedGraphContent, canvasBoundsForGraphContent, canvasBoundsWithOriginShift, deferredMoveOptimizationCancelRef, deferredMoveRepairFrameRef, dirtyEdgeIdsAfterMove, dirtyEdgeIdsForMovedLocalRoutes, edgePatchFromCandidateEdges, edgeReferenceDiffIds, edges, expandCanvasToFitGraph, graphStore, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, localRouteOptimizationCandidateEdges, markBusTerminalSyncDirty, markGraphDirtyForInteractiveCommit, markRouteEdgesDirty, markStoredRouteEdgesDirty, mergeNodeUpdateLists, moveRouteRepairSeedEdges, patchCachedRoutesForHighFanoutMove, routableLineRouteCandidateIdsForMovedNodes, routePointsForMovedEdgesBlockedByStationaryNodes, routingNodesForConnectionEdges, scheduleDeferredMovedConnectionRepair, scheduleMovedEdgeOptimization, setGraphStore, shiftCachedRoutesForCanvasOrigin, shouldDeferSingleNodeTerminalReconciliation, shouldRunSynchronousMoveBlockerRepair, storedRouteDirtyIdsForMove, translateEdgeBy, translateNodeBy } = ctx;
    markStoredRouteEdgesDirty(dirtyEdgeIdsForMovedLocalRoutes(selectedEdgeIds, originalRoutePoints));
    let committedCandidateEdges = candidateEdges;
    const routeRepairSeedEdges = moveRouteRepairSeedEdges(
      committedCandidateEdges,
      movedNodeIds,
      selectedEdgeIds,
      originalRoutePoints
    );
    const routeRepairCandidateEdges = localRouteOptimizationCandidateEdges(
      previousNodes,
      nextNodes,
      movedNodeIds,
      selectedEdgeIds,
      originalPositions,
      routeRepairSeedEdges
    );
    const deferSingleNodeTerminalReconciliation = shouldDeferSingleNodeTerminalReconciliation(
      movedNodeIds,
      committedCandidateEdges
    );
    const deferMovedRouteRepair =
      movedNodeIds.length > 0 && (routeRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation);
    const routableLineCandidateIds = routableLineRouteCandidateIdsForMovedNodes(
      previousNodes,
      nextNodes,
      movedNodeIds,
      originalPositions
    );
    const routableLineRouteBounds = routableLineCandidateIds.size > 0
      ? canvasBoundsForAutoExpandedGraphContent(effectiveCanvasBounds, movedNodeUpdates, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING)
      : effectiveCanvasBounds;
    const fullNextNodesForRoutableLines = routableLineCandidateIds.size > 0
      ? overlayGraphStoreNodes(graphStore, movedNodeUpdates)
      : nextNodes;
    const routableLineNodeUpdates = routableLineCandidateIds.size > 0
      ? rebuildRoutableLineDeviceRouteUpdates(fullNextNodesForRoutableLines, routableLineCandidateIds, routableLineRouteBounds)
      : [];
    const committedNodeUpdates = mergeNodeUpdateLists(movedNodeUpdates, routableLineNodeUpdates);
    const committedNextNodes = routableLineNodeUpdates.length > 0
      ? overlayGraphStoreNodes(graphStore, committedNodeUpdates)
      : nextNodes;
    const originShift = allowAutoExpandCanvas ? leftTopCanvasOriginShiftForContent(committedNodeUpdates, committedCandidateEdges) : { x: 0, y: 0 };
    if (hasCanvasOriginShift(originShift)) {
      const candidateEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
      const rawNextEdges = edges.map((edge) => candidateEdgeById.get(edge.id) ?? edge);
      const rawNextNodes = overlayGraphStoreNodes(graphStore, committedNodeUpdates);
      const shiftedNextNodes = rawNextNodes.map((node) => translateNodeBy(node, originShift));
      const shiftedNextEdges = rawNextEdges.map((edge) => translateEdgeBy(edge, originShift));
      const shiftedCanvasBounds = canvasBoundsForGraphContent(
        canvasBoundsWithOriginShift(effectiveCanvasBounds, originShift),
        shiftedNextNodes,
        shiftedNextEdges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(shiftedCanvasBounds, originShift);
      shiftCachedRoutesForCanvasOrigin(originShift);
      const candidateEdgeIds = committedCandidateEdges.map((edge) => edge.id);
      markRouteEdgesDirty(candidateEdgeIds);
      markStoredRouteEdgesDirty(candidateEdgeIds);
      markGraphDirtyForInteractiveCommit();
      setGraphStore((current) => graphStoreSetGraph(current, shiftedNextNodes, shiftedNextEdges));
      return;
    }
    const commitCanvasBounds = canvasBoundsForAutoExpandedGraphContent(effectiveCanvasBounds, committedNodeUpdates, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING);
    if (deferMovedRouteRepair) {
      const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
      const expectedPatch = { nodeUpdates: committedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
      const edgePatchDirtyIds = [
        ...edgePatch.edgeUpserts.map((edge) => edge.id),
        ...edgePatch.edgeDeleteIds
      ];
      const routeCachePatchedEdgeIds = patchCachedRoutesForHighFanoutMove(
        previousCandidateEdges,
        committedCandidateEdges,
        movedNodeIds,
        committedNextNodes,
        commitCanvasBounds
      );
      const movedRouteDirtyIds = dirtyEdgeIdsAfterMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, edgePatchDirtyIds);
      const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);
      markRouteEdgesDirty(movedRouteDirtyIds);
      markStoredRouteEdgesDirty(storedRouteDirtyIds);
      markBusTerminalSyncDirty(
        busTerminalSyncNodeIdsForGraphPatch(
          movedNodeIds,
          previousCandidateEdges,
          edgePatch.edgeUpserts,
          edgePatch.edgeDeleteIds
        )
      );
      markGraphDirtyForInteractiveCommit();
      setGraphStore((current) =>
        graphStoreApplyPatch(current, {
          nodeUpdates: expectedPatch.nodeUpdates,
          edgeUpserts: expectedPatch.edgeUpserts,
          edgeDeleteIds: expectedPatch.edgeDeleteIds
        })
      );
      if (deferredMoveRepairFrameRef.current !== null) {
        window.cancelAnimationFrame(deferredMoveRepairFrameRef.current);
        deferredMoveRepairFrameRef.current = null;
      }
      deferredMoveOptimizationCancelRef.current?.();
      deferredMoveOptimizationCancelRef.current = null;
      if (routeRepairCandidateEdges.length > 0 || deferSingleNodeTerminalReconciliation) {
        const deferredRepairCandidateEdges =
          routeRepairCandidateEdges.length > 0 ? routeRepairCandidateEdges : committedCandidateEdges;
        deferredMoveRepairFrameRef.current = window.requestAnimationFrame(() => {
          deferredMoveRepairFrameRef.current = null;
          scheduleDeferredMovedConnectionRepair(
            movedNodeIds,
            deferredRepairCandidateEdges,
            expectedPatch,
            commitCanvasBounds,
            previousNodes,
            originalPositions,
            originalRoutePoints,
            selectedEdgeIds,
            { reconcileTerminalConnections: deferSingleNodeTerminalReconciliation }
          );
        });
      }
      return;
    }
    if (shouldRunSynchronousMoveBlockerRepair(movedNodeIds, previousCandidateEdges, committedCandidateEdges)) {
      const blockedConnectedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        committedNextNodes,
        committedCandidateEdges,
        movedNodeIds,
        {},
        commitCanvasBounds
      );
      const blockedConnectedEdgeIds = new Set(Object.keys(blockedConnectedRoutePoints));
      if (blockedConnectedEdgeIds.size > 0) {
        let blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        let routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, committedNextNodes, movedNodeIds);
        const rebuiltEdges = rebuildExternalConnectionRoutesForMovedNodes(
          routingNodes,
          committedCandidateEdges,
          movedNodeIds,
          commitCanvasBounds,
          blockedCandidateEdges
        );
        if (rebuiltEdges !== committedCandidateEdges) {
          const rebuiltDirtyEdgeIds = edgeReferenceDiffIds(committedCandidateEdges, rebuiltEdges);
          markRouteEdgesDirty(rebuiltDirtyEdgeIds);
          markStoredRouteEdgesDirty(rebuiltDirtyEdgeIds);
          committedCandidateEdges = rebuiltEdges;
        }
        blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, committedNextNodes, movedNodeIds);
        const rebuiltInternalEdges = rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes(
          routingNodes,
          committedCandidateEdges,
          movedNodeIds,
          commitCanvasBounds,
          blockedCandidateEdges
        );
        if (rebuiltInternalEdges !== committedCandidateEdges) {
          const rebuiltDirtyEdgeIds = edgeReferenceDiffIds(committedCandidateEdges, rebuiltInternalEdges);
          markRouteEdgesDirty(rebuiltDirtyEdgeIds);
          markStoredRouteEdgesDirty(rebuiltDirtyEdgeIds);
          committedCandidateEdges = rebuiltInternalEdges;
        }
      }
    }
    const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
    const nextEdgesForBounds = edgePatch.edgeUpserts;
    expandCanvasToFitGraph(committedNodeUpdates, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);
    const edgePatchDirtyIds = [
      ...edgePatch.edgeUpserts.map((edge) => edge.id),
      ...edgePatch.edgeDeleteIds
    ];
    const expectedPatch = { nodeUpdates: committedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
    const routeCachePatchedEdgeIds = patchCachedRoutesForHighFanoutMove(
      previousCandidateEdges,
      committedCandidateEdges,
      movedNodeIds,
      committedNextNodes,
      commitCanvasBounds
    );
    const movedRouteDirtyIds = dirtyEdgeIdsAfterMove(previousCandidateEdges, committedCandidateEdges, movedNodeIds, edgePatchDirtyIds);
    const storedRouteDirtyIds = storedRouteDirtyIdsForMove(movedRouteDirtyIds, routeCachePatchedEdgeIds);
    markRouteEdgesDirty(movedRouteDirtyIds);
    markStoredRouteEdgesDirty(storedRouteDirtyIds);
    markBusTerminalSyncDirty(
      busTerminalSyncNodeIdsForGraphPatch(
        movedNodeIds,
        previousCandidateEdges,
        edgePatch.edgeUpserts,
        edgePatch.edgeDeleteIds
      )
    );
    markGraphDirtyForInteractiveCommit();
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: expectedPatch.nodeUpdates,
        edgeUpserts: expectedPatch.edgeUpserts,
        edgeDeleteIds: expectedPatch.edgeDeleteIds
      })
    );
    scheduleMovedEdgeOptimization(
      previousNodes,
      committedNextNodes,
      routeRepairCandidateEdges,
      movedNodeIds,
      originalRoutePoints,
      selectedEdgeIds,
      originalPositions,
      routeRepairCandidateEdges,
      expectedPatch
    );
  
  };
}

export function createApplyRoutableLinePreviewState(ctx: AppRuntimeContext) {
  return (point: Point | null, targetPoint: Point | null = null, target: ConnectTarget | null = null, placementOverride: RoutableLinePlacementState = routableLinePlacement) => {
    const { buildRoutableLinePreviewPath, routableLineDropTargetPointRef, routableLineDropTargetRef, routableLinePreviewPointRef, sameConnectTarget, sameOptionalPoint, setRoutableLinePreview } = ctx;
    if (!sameOptionalPoint(routableLinePreviewPointRef.current ?? undefined, point ?? undefined)) {
      routableLinePreviewPointRef.current = point;
    }
    if (!sameOptionalPoint(routableLineDropTargetPointRef.current ?? undefined, targetPoint ?? undefined)) {
      routableLineDropTargetPointRef.current = targetPoint;
    }
    if (!sameConnectTarget(routableLineDropTargetRef.current ?? undefined, target)) {
      routableLineDropTargetRef.current = target;
    }
    const path = buildRoutableLinePreviewPath(placementOverride, point, targetPoint, target);
    setRoutableLinePreview((current) =>
      current.path === path && sameOptionalPoint(current.targetPoint ?? undefined, targetPoint ?? undefined)
        ? current
        : { path, targetPoint }
    );
  
  };
}

export function createNodeMoveGeometryInsideCanvas(ctx: AppRuntimeContext) {
  return (nodeIds: string[], edgeIds: string[], affectedEdgesForMove: Edge[], originalPositions: Record<string, Point>, originalEdgePoints: DraggingState["originalEdgePoints"], originalRoutePoints: DraggingState["originalRoutePoints"], delta: Point, bounds: CanvasBounds = canvasBounds) => {
    const { adjustEdgesAfterNodeMove, allowAutoExpandCanvas, canvasBoundsWithOriginShift, clampNodePositionToExpandableBounds, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, nodes, orderedNodesForIds, routePreserveEdgeIdsForMovedNodes, translateNodeBy, translateRouteBy } = ctx;
    const movedNodeIds = new Set(nodeIds);
    const selectedEdgeIds = new Set(edgeIds);
    const relevantNodeIds = new Set(nodeIds);
    for (const edge of affectedEdgesForMove) {
      relevantNodeIds.add(edge.sourceId);
      relevantNodeIds.add(edge.targetId);
    }
    const nextNodes = orderedNodesForIds(nodes, relevantNodeIds).map((node) => {
      const originalPosition = originalPositions[node.id];
      return movedNodeIds.has(node.id) && originalPosition
        ? { ...node, position: clampNodePositionToExpandableBounds(node, bounds, { x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }) }
        : node;
    });
    const movedNodes = nextNodes.filter((node) => movedNodeIds.has(node.id));
    const deltasByNode = Object.fromEntries(nodeIds.map((id) => [id, delta]));
    const affectedEdges = affectedEdgesForMove.filter(
      (edge) => movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)
    );
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(affectedEdges, nodeIds, edgeIds);
    const nextAffectedEdges =
      affectedEdges.length > 0
        ? adjustEdgesAfterNodeMove(
            affectedEdges,
            nextNodes,
            movedNodeIds,
            originalEdgePoints,
            deltasByNode,
            originalRoutePoints,
            preserveRouteEdgeIds,
            bounds
          )
        : [];
    const affectedRoutes =
      nextAffectedEdges.length > 0 ? routeEdgesForStoredRendering(nextNodes, nextAffectedEdges, bounds) : [];
    const originShift = allowAutoExpandCanvas
      ? leftTopCanvasOriginShiftForContent(movedNodes, [], affectedRoutes, MOVE_BOUNDARY_GUARD)
      : { x: 0, y: 0 };
    const shiftedBounds = canvasBoundsWithOriginShift(bounds, originShift);
    const shiftedMovedNodes = hasCanvasOriginShift(originShift)
      ? movedNodes.map((node) => translateNodeBy(node, originShift))
      : movedNodes;
    const shiftedAffectedRoutes = hasCanvasOriginShift(originShift)
      ? affectedRoutes.map((route) => translateRouteBy(route, originShift))
      : affectedRoutes;
    return modelGeometryInsideCanvasBounds(shiftedMovedNodes, shiftedAffectedRoutes, shiftedBounds, MOVE_BOUNDARY_GUARD);
  
  };
}

export function createApplyNodeDragMove(ctx: AppRuntimeContext) {
  return (point: Point, ctrlKey: boolean, shiftKey: boolean, renderPreview = true) => {
    const { boundedDeltaForMultiNodeInteractiveMove, boundedDeltaForNodes, canvasBoundsForMovedNodeDelta, computeNodeDragDelta, computeNodeDragPreviewDelta, draggingRef, findMultiNodeDragSnapTargetAtDelta, nodeTerminalSnapTargetRef, setDragging, singleNodeDragRenderState, updateImperativeNodeDragDropHint, updateMultiNodeDragOverlayTransform, updateSingleNodeDragImperativePreview } = ctx;
    const currentDrag = draggingRef.current;
    if (!currentDrag) {
      return;
    }
    const previewDelta = computeNodeDragPreviewDelta(currentDrag, point, ctrlKey, shiftKey);
    const boundedDelta =
      renderPreview && !isMultiNodeMoveState(currentDrag)
        ? boundedDeltaForNodes(
            currentDrag.nodeIds,
            currentDrag.originalPositions,
            previewDelta.x,
            previewDelta.y,
            canvasBoundsForMovedNodeDelta(currentDrag.nodeIds, currentDrag.originalPositions, previewDelta.x, previewDelta.y)
          )
        : computeNodeDragDelta(currentDrag, point, ctrlKey, shiftKey);
    const multiNodeMove = isMultiNodeMoveState(currentDrag);
    const multiNodeSnapTarget = multiNodeMove && renderPreview ? findMultiNodeDragSnapTargetAtDelta(currentDrag, boundedDelta) : null;
    const effectiveBoundedDelta = multiNodeSnapTarget
      ? boundedDeltaForMultiNodeInteractiveMove(currentDrag, applyNodeTerminalSnap(boundedDelta, multiNodeSnapTarget))
      : boundedDelta;
    const effectivePreviewDelta = multiNodeSnapTarget
      ? boundedDeltaForMultiNodeInteractiveMove(currentDrag, applyNodeTerminalSnap(previewDelta, multiNodeSnapTarget))
      : previewDelta;
    if (
      currentDrag.historyCaptured &&
      currentDrag.currentDelta?.x === effectiveBoundedDelta.x &&
      currentDrag.currentDelta?.y === effectiveBoundedDelta.y &&
      currentDrag.previewDelta?.x === effectivePreviewDelta.x &&
      currentDrag.previewDelta?.y === effectivePreviewDelta.y
    ) {
      draggingRef.current = currentDrag;
      return;
    }
    if (multiNodeMove) {
      draggingRef.current = {
        ...currentDrag,
        currentDelta: effectiveBoundedDelta,
        previewDelta: effectivePreviewDelta,
        historyCaptured: true
      };
      if (renderPreview) {
        nodeTerminalSnapTargetRef.current = multiNodeSnapTarget;
        updateImperativeNodeDragDropHint(multiNodeSnapTarget);
        updateMultiNodeDragOverlayTransform(effectivePreviewDelta);
      } else {
        nodeTerminalSnapTargetRef.current = null;
        updateImperativeNodeDragDropHint(null);
      }
      return;
    }
    const nextDragState = {
      ...currentDrag,
      currentDelta: boundedDelta,
      previewDelta,
      historyCaptured: true
    };
    draggingRef.current = nextDragState;
    if (!renderPreview) {
      nodeTerminalSnapTargetRef.current = null;
      return;
    }
    updateSingleNodeDragImperativePreview(nextDragState, previewDelta);
    if (!currentDrag.historyCaptured) {
      setDragging(singleNodeDragRenderState(nextDragState));
    }
  
  };
}

export function createFinishTransformDrag(ctx: AppRuntimeContext) {
  return () => {
    const { applyCanvasBounds, buildGroupTransformEdgeUpdates, buildGroupTransformNodeUpdates, canvasBounds, canvasBoundsForAutoExpandedGraphContent, graphStore, latestGraphStoreRef, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, overlayEdgeUpdatesForTransform, rebuildEdgesAfterNodeGeometryChange, rebuildEdgeUpdatesAfterNodeGeometryChange, rejectAutoCanvasExpansionForContent, setGraphStore, setTransformDrag, singleTransformNodeUpdate, transformDrag, transformDragChangedRef, writeOperationLog } = ctx;
    const activeTransform = transformDrag;
    if (!activeTransform) {
      return;
    }
    const shouldReroute = transformDragChangedRef.current || Boolean(activeTransform.historyCaptured);
    transformDragChangedRef.current = false;
    if (shouldReroute) {
      const transformedNodeIds = isGroupTransformDrag(activeTransform) ? activeTransform.nodeIds : [activeTransform.nodeId];
      if (isGroupTransformDrag(activeTransform)) {
        const finalPreviewPoint = activeTransform.previewPoint;
        if (finalPreviewPoint) {
          const currentStore = latestGraphStoreRef.current ?? graphStore;
          let transformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, currentStore, { snapRotation: activeTransform.kind === "rotate" });
          const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, currentStore, { snapRotation: activeTransform.kind === "rotate" });
          const transformedEdges = overlayEdgeUpdatesForTransform(currentStore.edges, transformedEdgeUpdates);
          if (rejectAutoCanvasExpansionForContent(transformedNodeUpdates, transformedEdgeUpdates)) {
            setTransformDrag(null);
            return;
          }
          const transformBounds = canvasBoundsForAutoExpandedGraphContent(
            canvasBounds,
            overlayGraphStoreNodes(currentStore, transformedNodeUpdates),
            transformedEdges,
            [],
            CANVAS_AUTO_EXPAND_PADDING
          );
          applyCanvasBounds(transformBounds);
          transformedNodeUpdates = transformedNodeUpdates.map((node) => ({
            ...node,
            position: clampNodePositionToBounds(node, transformBounds, node.position)
          }));
          setGraphStore((current) => {
            let currentTransformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === "rotate" });
            const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, current, { snapRotation: activeTransform.kind === "rotate" });
            const transformedRouteEdgeIds = new Set(transformedEdgeUpdates.map((edge) => edge.id));
            const transformedEdges = overlayEdgeUpdatesForTransform(current.edges, transformedEdgeUpdates);
            currentTransformedNodeUpdates = currentTransformedNodeUpdates.map((node) => ({
              ...node,
              position: clampNodePositionToBounds(node, transformBounds, node.position)
            }));
            const nextNodes = overlayGraphStoreNodes(current, currentTransformedNodeUpdates);
            markRouteEdgesDirty(transformedRouteEdgeIds);
            markStoredRouteEdgesDirty(transformedRouteEdgeIds);
            const nextEdges = rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, transformedEdges, transformedRouteEdgeIds);
            const transformedNodeIdSet = new Set(transformedNodeIds);
            const transformedEdgeIds = Array.from(new Set([
              ...current.edges
              .filter((edge) => transformedNodeIdSet.has(edge.sourceId) || transformedNodeIdSet.has(edge.targetId))
                .map((edge) => edge.id),
              ...transformedRouteEdgeIds
            ]));
            return graphStorePatchGraphFromArrays(current, nextNodes, nextEdges, transformedNodeIds, transformedEdgeIds);
          });
        }
      } else if (activeTransform.kind === "rotate" && activeTransform.previewPoint) {
        const currentStore = latestGraphStoreRef.current ?? graphStore;
        let singleNodeUpdate = singleTransformNodeUpdate(activeTransform, activeTransform.previewPoint, currentStore, true);
        if (singleNodeUpdate) {
          if (rejectAutoCanvasExpansionForContent([singleNodeUpdate])) {
            setTransformDrag(null);
            return;
          }
          const transformBounds = canvasBoundsForAutoExpandedGraphContent(
            canvasBounds,
            [singleNodeUpdate],
            [],
            [],
            CANVAS_AUTO_EXPAND_PADDING
          );
          applyCanvasBounds(transformBounds);
          singleNodeUpdate = {
            ...singleNodeUpdate,
            position: clampNodePositionToBounds(singleNodeUpdate, transformBounds, singleNodeUpdate.position)
          };
          setGraphStore((current) => {
            if (!activeTransform.previewPoint) {
              return current;
            }
            let currentSingleNodeUpdate = singleTransformNodeUpdate(activeTransform, activeTransform.previewPoint, current, true);
            if (!currentSingleNodeUpdate) {
              return current;
            }
            currentSingleNodeUpdate = {
              ...currentSingleNodeUpdate,
              position: clampNodePositionToBounds(currentSingleNodeUpdate, transformBounds, currentSingleNodeUpdate.position)
            };
            const nextNodes = overlayGraphStoreNodes(current, [currentSingleNodeUpdate]);
            const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, current.edges);
            return graphStoreApplyPatch(current, {
              nodeUpdates: [currentSingleNodeUpdate],
              edgeUpserts: edgeUpdates
            });
          });
        }
      } else {
        const currentStore = latestGraphStoreRef.current ?? graphStore;
        const currentSingleNode = currentStore.nodeMap.get(activeTransform.nodeId);
        if (currentSingleNode) {
          if (rejectAutoCanvasExpansionForContent([currentSingleNode])) {
            setTransformDrag(null);
            return;
          }
          const transformBounds = canvasBoundsForAutoExpandedGraphContent(
            canvasBounds,
            [currentSingleNode],
            [],
            [],
            CANVAS_AUTO_EXPAND_PADDING
          );
          applyCanvasBounds(transformBounds);
          setGraphStore((current) => {
            const currentNode = current.nodeMap.get(activeTransform.nodeId);
            if (!currentNode) {
              return current;
            }
            const clampedPosition = clampNodePositionToBounds(currentNode, transformBounds, currentNode.position);
            const nodeUpdates =
              clampedPosition.x === currentNode.position.x && clampedPosition.y === currentNode.position.y
                ? []
                : [{ ...currentNode, position: clampedPosition }];
            const nextNodes = nodeUpdates.length > 0 ? overlayGraphStoreNodes(current, nodeUpdates) : current.nodes;
            const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, current.edges);
            return graphStoreApplyPatch(current, {
              nodeUpdates,
              edgeUpserts: edgeUpdates
            });
          });
        }
      }
      const transformedNode = isGroupTransformDrag(activeTransform) ? null : nodeById.get(activeTransform.nodeId);
      writeOperationLog(
        isGroupTransformDrag(activeTransform)
          ? `调整组合几何：${transformedNodeIds.length} 个图元`
          : `调整图元几何：${transformedNode?.name ?? activeTransform.nodeId}`
      );
    }
    setTransformDrag(null);
  
  };
}

export function createNudgeSelectionByKeyboard(ctx: AppRuntimeContext) {
  return (key: string, dx: number, dy: number, repeated = false) => {
    const { appendPendingKeyboardMoveDelta, clearKeyboardMoveCommitSchedule, draggingRef, flushPendingKeyboardMove, keyboardMoveActiveKeyDeltasRef, keyboardMoveLastFrameTimeRef, moveSelection, requireEditMode, scheduleKeyboardNudgeFrame, startKeyboardMoveSession } = ctx;
    if (!requireEditMode("移动图元")) {
      return;
    }
    clearKeyboardMoveCommitSchedule();
    const wasActive = keyboardMoveActiveKeyDeltasRef.current.has(key);
    if (!repeated && !wasActive && !draggingRef.current) {
      moveSelection(dx, dy);
      return;
    }
    const activeDragging = startKeyboardMoveSession(false);
    if (!activeDragging) {
      return;
    }
    keyboardMoveActiveKeyDeltasRef.current.set(key, { x: dx, y: dy });
    if (!wasActive && !repeated) {
      appendPendingKeyboardMoveDelta({ x: dx, y: dy });
      flushPendingKeyboardMove(true);
    }
    if (keyboardMoveLastFrameTimeRef.current === null) {
      keyboardMoveLastFrameTimeRef.current = performance.now();
    }
    scheduleKeyboardNudgeFrame();
  
  };
}

export function createUpdateSelectedNode(ctx: AppRuntimeContext) {
  return (patch: Partial<ModelNode>) => {
    const { adjustEdgesAfterNodeMove, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, clampNodePositionToExpandableBounds, commitFastMovedGraphPatches, currentStoredRoutePointsForEdge, edgeListForNodeIds, expandCanvasToFitGraph, finalizeMovedNodeEdgesFast, focusedGroupedNodeMovesGroup, graphStore, moveSelection, nodeById, nodes, patchGraphNodes, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, rejectAutoCanvasExpansionForContent, requireEditMode, selectedNode, selectedNodeId, setGraphStore, snapshotEdgePoints, undoScopeForGraphPatch } = ctx;
    if (!requireEditMode("修改图元")) {
      return;
    }
    if (!selectedNodeId) {
      return;
    }
    if (patch.position && focusedGroupedNodeMovesGroup && selectedNode) {
      const nextPosition = { x: patch.position.x, y: patch.position.y };
      if (nextPosition.x === selectedNode.position.x && nextPosition.y === selectedNode.position.y) {
        return;
      }
      moveSelection(nextPosition.x - selectedNode.position.x, nextPosition.y - selectedNode.position.y);
      return;
    }
    const nextPatch = { ...patch };
    const geometryPatch =
      patch.rotation !== undefined ||
      patch.scale !== undefined ||
      patch.scaleX !== undefined ||
      patch.scaleY !== undefined ||
      patch.size !== undefined;
    const currentSelectedNode = nodeById.get(selectedNodeId);
    if (!currentSelectedNode) {
      return;
    }
    const changesCanvasFootprint = Boolean(patch.position) || geometryPatch;
    let selectedNodeCanvasBounds = canvasBounds;
    const footprintSourceNode = selectedNode ?? currentSelectedNode;
    if (footprintSourceNode) {
      if (changesCanvasFootprint) {
        const requestedPosition = nextPatch.position
          ? { x: nextPatch.position.x, y: nextPatch.position.y }
          : footprintSourceNode.position;
        const candidateNode = { ...footprintSourceNode, ...nextPatch, position: requestedPosition };
        if (rejectAutoCanvasExpansionForContent([candidateNode])) {
          return;
        }
        selectedNodeCanvasBounds = canvasBoundsForAutoExpandedGraphContent(canvasBounds, [candidateNode], [], [], CANVAS_AUTO_EXPAND_PADDING);
        applyCanvasBounds(selectedNodeCanvasBounds);
        nextPatch.position = clampNodePositionToExpandableBounds(candidateNode, selectedNodeCanvasBounds, requestedPosition);
      }
    }
    if (changesCanvasFootprint) {
      const footprintEdges = edgeListForNodeIds([selectedNodeId]);
      pushUndoSnapshot(true, false, undoScopeForGraphPatch([selectedNodeId], footprintEdges.map((edge) => edge.id)));
    } else {
      pushNodeOnlyUndoSnapshot(selectedNodeId);
    }
    const nextSelectedNode = { ...currentSelectedNode, ...nextPatch };
    const nextNodes = overlayGraphStoreNodes(graphStore, [nextSelectedNode]);
    if (patch.position && selectedNode) {
      const delta = {
        x: nextPatch.position!.x - selectedNode.position.x,
        y: nextPatch.position!.y - selectedNode.position.y
      };
      const affectedEdgesForMove = edgeListForNodeIds([selectedNodeId]);
      const originalPositions = { [selectedNodeId]: selectedNode.position };
      const originalEdgePoints = snapshotEdgePoints(affectedEdgesForMove);
      const originalRoutePoints = Object.fromEntries(
        affectedEdgesForMove.map((edge) => [
          edge.id,
          currentStoredRoutePointsForEdge(edge)
        ])
      );
      const adjustedAffectedEdges = adjustEdgesAfterNodeMove(
        affectedEdgesForMove,
        nextNodes,
        new Set([selectedNodeId]),
        originalEdgePoints,
        {
          [selectedNodeId]: delta
        },
        originalRoutePoints,
        new Set<string>(),
        selectedNodeCanvasBounds
      );
      const finalizedCandidateEdges = finalizeMovedNodeEdgesFast(
        nodes,
        nextNodes,
        adjustedAffectedEdges,
        [selectedNodeId],
        adjustedAffectedEdges
      );
      commitFastMovedGraphPatches(
        nextSelectedNode ? [nextSelectedNode] : [],
        nextNodes,
        finalizedCandidateEdges,
        affectedEdgesForMove,
        [selectedNodeId],
        originalRoutePoints,
        new Set<string>(),
        originalPositions,
        nodes,
        selectedNodeCanvasBounds
      );
      return;
    }
    if (geometryPatch) {
      const edgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, [selectedNodeId]);
      expandCanvasToFitGraph([nextSelectedNode], edgeUpdates, [], CANVAS_AUTO_EXPAND_PADDING, selectedNodeCanvasBounds);
      setGraphStore((current) =>
        graphStoreApplyPatch(current, {
          nodeUpdates: [nextSelectedNode],
          edgeUpserts: edgeUpdates
        })
      );
      return;
    }
    patchGraphNodes([nextSelectedNode]);
  
  };
}

export function createRotateSelectedLayoutUnits(ctx: AppRuntimeContext) {
  return (direction: "left" | "right") => {
    const { buildRotateLayoutUnitEdgeUpdates, edges, expandCanvasToFitGraph, graphStore, markRouteEdgesDirty, markStoredRouteEdgesDirty, pushUndoSnapshot, rebuildEdgeUpdatesAfterNodeGeometryChange, requireEditMode, rotateLayoutUnitNodeUpdates, selectedLayoutUnits, setGraphStore, setSelectedEdgeId, writeOperationLog } = ctx;
    if (!requireEditMode("旋转图元")) {
      return;
    }
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    const degrees = direction === "left" ? -90 : 90;
    pushUndoSnapshot();
    setSelectedEdgeId("");
    const nodeUpdates = rotateLayoutUnitNodeUpdates(selectedLayoutUnits, degrees);
    const transformedNodeIds = nodeUpdates.map((node) => node.id);
    const nextNodes = overlayGraphStoreNodes(graphStore, nodeUpdates);
    const rotatedEdgeUpdates = buildRotateLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, degrees);
    const preservedRotateEdgeIds = new Set(rotatedEdgeUpdates.map((edge) => edge.id));
    markRouteEdgesDirty(preservedRotateEdgeIds);
    markStoredRouteEdgesDirty(preservedRotateEdgeIds);
    const reroutedEdgeUpdates = rebuildEdgeUpdatesAfterNodeGeometryChange(nextNodes, transformedNodeIds, edges, preservedRotateEdgeIds);
    const edgeUpdates = [...rotatedEdgeUpdates, ...reroutedEdgeUpdates];
    expandCanvasToFitGraph(nodeUpdates, edgeUpdates);
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates,
        edgeUpserts: edgeUpdates
      })
    );
    writeOperationLog(`${direction === "left" ? "向左" : "向右"}旋转90度 ${selectedLayoutUnits.length} 个选中单元`);
  
  };
}

export function createUpdateParam(ctx: AppRuntimeContext) {
  return (key: string, value: string) => {
    const { commitNodeFootprintUpdates, nodeById, patchGraphNodes, pushNodeOnlyUndoSnapshot, pushUndoSnapshot, requireEditMode, selectedNodeId, undoScopeForNodeFootprintPatch } = ctx;
    if (!requireEditMode("修改图元参数")) {
      return;
    }
    if (!selectedNodeId) {
      return;
    }
    const currentNode = nodeById.get(selectedNodeId);
    if (!currentNode) {
      return;
    }
    if (key !== "_labelDisplayMode" && currentNode.params[key] === value) {
      return;
    }
    const nextNode =
      key === "_labelDisplayMode"
        ? (() => {
            const mode = normalizeNodeLabelDisplayMode(value);
            const visible = mode === "hidden" ? "0" : "1";
            if (currentNode.params._labelDisplayMode === mode && currentNode.params._labelVisible === visible) {
              return currentNode;
            }
            return { ...currentNode, params: { ...currentNode.params, _labelDisplayMode: mode, _labelVisible: visible } };
          })()
        : { ...currentNode, params: { ...currentNode.params, [key]: value } };
    if (nextNode === currentNode) {
      return;
    }
    if (NODE_LABEL_FOOTPRINT_PARAM_KEYS.has(key)) {
      pushUndoSnapshot(true, false, undoScopeForNodeFootprintPatch(selectedNodeId, nextNode));
      commitNodeFootprintUpdates([nextNode]);
      return;
    }
    pushNodeOnlyUndoSnapshot(selectedNodeId);
    patchGraphNodes([nextNode]);
  
  };
}

export function createRenderStaticBoxDrawingPreview(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerId, colorDisplayMode, colorPalette, mode, staticDrawing, staticDrawingPreviewPoints } = ctx;
    if (!staticDrawing) {
      return null;
    }
    const points = staticDrawingPreviewPoints(staticDrawing);
    if (points.length < 2) {
      return (
        <g className="static-drawing-preview">
          {staticDrawing.points.map((point, index) => (
            <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
          ))}
        </g>
      );
    }
    const previewNode = createStaticBoxNodeFromDrawing(staticDrawing.template, points, activeLayerId);
    return (
      <g className="static-drawing-preview static-drawing-preview-box">
        <rect
          className="static-drawing-preview-rect"
          x={previewNode.position.x - previewNode.size.width / 2}
          y={previewNode.position.y - previewNode.size.height / 2}
          width={previewNode.size.width}
          height={previewNode.size.height}
        />
        <g transform={`translate(${formatSvgNumber(previewNode.position.x)} ${formatSvgNumber(previewNode.position.y)})`}>
          <g className="node-geometry" transform={nodeGeometryTransform(previewNode)}>
            <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
            <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
          </g>
        </g>
        {staticDrawing.points.map((point, index) => (
          <circle key={index} className="static-drawing-preview-point" cx={point.x} cy={point.y} r="4.5" />
        ))}
      </g>
    );
  
  };
}

export function createStartLibraryDevicePlacement(ctx: AppRuntimeContext) {
  return (template: DeviceTemplate) => {
    const { componentLibraryDisplayMode, hideLibraryFlyout, requireEditMode, resetConnectPreviewState, resetRoutableLinePreviewState, setConnectSource, setContextMenu, setLibraryPlacement, setMode, setRewiring, setRoutableLinePlacement, setStaticDrawing, writeOperationLog } = ctx;
    if (!requireEditMode("放置图元")) {
      return;
    }
    if (isRoutableLineDeviceKind(template.kind)) {
      setRoutableLinePlacement({ template, source: null });
      resetRoutableLinePreviewState();
      setLibraryPlacement(null);
      setStaticDrawing(null);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setContextMenu(null);
      setMode("connect");
      if (componentLibraryDisplayMode === "right") {
        hideLibraryFlyout();
      }
      writeOperationLog(`进入线路绘制模式：${template.label}`);
      return;
    }
    setLibraryPlacement({ kind: "device", template, previewPoint: null });
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setStaticDrawing(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMode("select");
    if (componentLibraryDisplayMode === "right") {
      hideLibraryFlyout();
    }
    writeOperationLog(`进入图元绘制模式：${template.label}`);
  
  };
}

export function createRenderLibraryPlacementPreview(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerId, colorDisplayMode, colorPalette, libraryPlacement, mode } = ctx;
    if (!libraryPlacement?.previewPoint) {
      return null;
    }
    const previewPoint = libraryPlacement.previewPoint;
    if (libraryPlacement.kind === "device") {
      const previewNode = { ...createNodeFromTemplate(libraryPlacement.template, previewPoint), layerId: activeLayerId };
      return (
        <g className="library-placement-preview library-placement-preview-device">
          <g transform={`translate(${formatSvgNumber(previewNode.position.x)} ${formatSvgNumber(previewNode.position.y)})`}>
            <g transform={nodeGeometryTransform(previewNode)}>
              <MemoDeviceGlyph node={previewNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
              <MemoDeviceGlyph node={previewNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
            </g>
          </g>
        </g>
      );
    }
    const bounds = canvasClipboardBounds(libraryPlacement.template.clipboard);
    if (!bounds) {
      return null;
    }
    const targetTopLeft = {
      x: previewPoint.x - libraryPlacement.template.sourceSize.width / 2,
      y: previewPoint.y - libraryPlacement.template.sourceSize.height / 2
    };
    const offset = { x: targetTopLeft.x - bounds.left, y: targetTopLeft.y - bounds.top };
    return (
      <g className="library-placement-preview library-placement-preview-template" transform={`translate(${formatSvgNumber(offset.x)} ${formatSvgNumber(offset.y)})`}>
        {libraryPlacement.template.clipboard.edges.map((item) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            className="library-placement-preview-line"
          />
        ))}
        {libraryPlacement.template.clipboard.nodes.map((node) => (
          <g key={node.id} transform={`translate(${formatSvgNumber(node.position.x)} ${formatSvgNumber(node.position.y)})`}>
            <g transform={nodeGeometryTransform(node)}>
              <MemoDeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
              <MemoDeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
            </g>
          </g>
        ))}
      </g>
    );
  
  };
}

export function createStartCanvasResizeFromRightOverlay(ctx: AppRuntimeContext) {
  return (event: PointerEvent<Element>) => {
    const { canvasBounds, startCanvasResize, svgRef } = ctx;
    if (!svgRef.current) {
      return false;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return false;
    }
    const unitsPerCssX = canvasBounds.width / svgRect.width;
    const handleHalfWidthCss = unitsPerCssX > 0
      ? CANVAS_RESIZE_HANDLE_SIZE / 2 / unitsPerCssX
      : CANVAS_RESIZE_HANDLE_SIZE / 2;
    const rightEdgeHotspot = Math.max(10, handleHalfWidthCss + 3);
    const insideRightEdge =
      Math.abs(event.clientX - svgRect.right) <= rightEdgeHotspot &&
      event.clientY >= svgRect.top &&
      event.clientY <= svgRect.bottom;
    if (!insideRightEdge) {
      return false;
    }
    startCanvasResize(event, "right");
    return true;
  
  };
}

export function createStartCanvasResizeFromTopOverlay(ctx: AppRuntimeContext) {
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
    const topEdgeHotspot = Math.max(10, handleHalfHeightCss + 3);
    const insideTopEdge =
      Math.abs(event.clientY - svgRect.top) <= topEdgeHotspot &&
      event.clientX >= svgRect.left &&
      event.clientX <= svgRect.right;
    if (!insideTopEdge) {
      return false;
    }
    startCanvasResize(event, "top");
    return true;
  
  };
}

export function createProportionalSignedScaleFromHandleDelta(ctx: AppRuntimeContext) {
  return (drag: SingleTransformDrag, point: Point, baseNode: ModelNode) => {
    const { normalizeScale, signedScale, toLocalNodePoint } = ctx;
    const currentSignedScaleX = getNodeScaleX(baseNode);
    const currentSignedScaleY = getNodeScaleY(baseNode);
    const startLocal = toLocalNodePoint(baseNode, drag.startPoint);
    const currentLocal = toLocalNodePoint(baseNode, point);
    const scaleXDeltaRatio = drag.handleXDirection
      ? ((currentLocal.x - startLocal.x) * drag.handleXDirection * 2) / Math.max(1, baseNode.size.width)
      : 0;
    const scaleYDeltaRatio = drag.handleYDirection
      ? ((currentLocal.y - startLocal.y) * drag.handleYDirection * 2) / Math.max(1, baseNode.size.height)
      : 0;
    const scaleDeltaRatio = Math.abs(scaleXDeltaRatio) >= Math.abs(scaleYDeltaRatio) ? scaleXDeltaRatio : scaleYDeltaRatio;
    const currentScale = Math.max(Math.abs(currentSignedScaleX), Math.abs(currentSignedScaleY));
    const nextScale = normalizeScale(Math.max(0, currentScale + scaleDeltaRatio), currentScale);
    return {
      scale: nextScale,
      scaleX: signedScale(nextScale, currentSignedScaleX),
      scaleY: signedScale(nextScale, currentSignedScaleY)
    };
  
  };
}

export function createBuildMirrorLayoutUnitEdgeUpdates(ctx: AppRuntimeContext) {
  return (units: CanvasLayoutUnit[], currentEdges: Edge[], axis: "horizontal" | "vertical") => {
    const { currentStoredRoutePointsForEdge, edgeById, edges } = ctx;
    const currentEdgeById = currentEdges === edges ? edgeById : new Map(currentEdges.map((edge) => [edge.id, edge]));
    const updates = new Map<string, Edge>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      const unitNodeIds = new Set(unit.nodeIds);
      for (const edgeId of unit.edgeIds) {
        if (updates.has(edgeId)) {
          continue;
        }
        const edge = currentEdgeById.get(edgeId);
        if (!edge || !unitNodeIds.has(edge.sourceId) || !unitNodeIds.has(edge.targetId)) {
          continue;
        }
        const routePoints = currentStoredRoutePointsForEdge(edge);
        if (routePoints.length < 2) {
          continue;
        }
        const points = routePoints.map((point) => mirrorPointAcrossAxis(point, center, axis));
        updates.set(edge.id, {
          ...edge,
          sourcePoint: { ...points[0] },
          targetPoint: { ...points[points.length - 1] },
          manualPoints: points.slice(1, -1).map((point) => ({ ...point }))
        });
      }
    }
    return Array.from(updates.values());
  
  };
}

export function createStartGroupTransformDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGElement>, unit: CanvasLayoutUnit, kind: "rotate" | ScaleHandleKind) => {
    const { clampPointToCanvas, requireEditMode, setTransformDrag, snapshotGroupTransformEdgeRoutes, snapshotGroupTransformNodes, startModifierSelectionPress, svgRef, transformDragChangedRef } = ctx;
    event.stopPropagation();
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "selection", nodeIds: unit.nodeIds, edgeIds: unit.edgeIds });
      return;
    }
    if (!requireEditMode("拖拽图元")) {
      return;
    }
    const center = selectionRectCenter(unit.bounds);
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...center };
    transformDragChangedRef.current = false;
    setTransformDrag({
      kind,
      groupId: unit.id.replace(/^group:/, ""),
      nodeIds: unit.nodeIds,
      bounds: unit.bounds,
      center,
      startPoint,
      rotationStartPoint: kind === "rotate" ? { x: center.x, y: unit.bounds.top - TRANSFORM_ROTATE_HANDLE_GAP } : undefined,
      originalNodes: snapshotGroupTransformNodes(unit),
      originalEdgeRoutes: snapshotGroupTransformEdgeRoutes(unit),
      handleXDirection: kind === "scale-y" ? 0 : startPoint.x >= center.x ? 1 : -1,
      handleYDirection: kind === "scale-x" ? 0 : startPoint.y >= center.y ? 1 : -1
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createBuildGroupTransformNodeUpdates(ctx: AppRuntimeContext) {
  return (drag: GroupTransformDrag, point: Point, store: GraphStore, options?: { snapRotation?: boolean }) => {
    const updates: ModelNode[] = [];
    const geometry = groupTransformGeometry(drag, point, options);
    if (geometry.kind === "rotate") {
      for (const nodeId of drag.nodeIds) {
        const snapshot = drag.originalNodes[nodeId];
        const node = store.nodeMap.get(nodeId);
        if (!node || !snapshot) {
          continue;
        }
        updates.push({
          ...node,
          position: transformGroupPoint(drag, geometry, snapshot.position),
          rotation: normalizeRotationDegrees(snapshot.rotation + geometry.degrees)
        });
      }
      return updates;
    }

    for (const nodeId of drag.nodeIds) {
      const snapshot = drag.originalNodes[nodeId];
      const node = store.nodeMap.get(nodeId);
      if (!node || !snapshot) {
        continue;
      }
      const nextScaleX = (snapshot.scaleX ?? snapshot.scale ?? 1) * geometry.scaleX;
      const nextScaleY = (snapshot.scaleY ?? snapshot.scale ?? 1) * geometry.scaleY;
      updates.push({
        ...node,
        position: transformGroupPoint(drag, geometry, snapshot.position),
        scale: Math.max(Math.abs(nextScaleX), Math.abs(nextScaleY)),
        scaleX: nextScaleX,
        scaleY: nextScaleY
      });
    }
    return updates;
  
  };
}

export function createMirrorLayoutUnitNodeUpdates(ctx: AppRuntimeContext) {
  return (units: CanvasLayoutUnit[], axis: "horizontal" | "vertical", store: GraphStore = graphStore) => {
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
        const mirroredPosition =
          unit.kind === "group"
            ? mirrorPointAcrossAxis(node.position, center, axis)
            : node.position;
        const mirroredNode = { ...node, position: mirroredPosition, rotation: normalizeRotationDegrees(-node.rotation) };
        updates.set(
          nodeId,
          axis === "horizontal"
            ? { ...mirroredNode, scaleX: -getNodeScaleX(node) }
            : { ...mirroredNode, scaleY: -getNodeScaleY(node) }
        );
      }
    }
    return Array.from(updates.values());
  
  };
}

export function createFindRoutableLineEndpointTargetAtPoint(ctx: AppRuntimeContext) {
  return (point: Point, options: { terminalType?: TerminalType; source?: ConnectTarget | null; excludedNodeId?: string } = {}): ConnectTarget | null => {
    const { activeLayerNodeIdSet, busAnchorFromPoint, isPointNearBus, routableLinePlacement, routableLineTemplateTerminalType, visibleNodeSpatialIndex } = ctx;
    const terminalType = options.terminalType ?? (routableLinePlacement ? routableLineTemplateTerminalType(routableLinePlacement.template) : undefined);
    if (!terminalType) {
      return null;
    }
    const source = options.source ?? routableLinePlacement?.source ?? null;
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (!activeLayerNodeIdSet.has(node.id) || node.id === options.excludedNodeId || isRoutableLineDeviceKind(node.kind)) {
        continue;
      }
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (
          getBusTerminalType(node) === terminalType &&
          !(source && source.node.id === node.id && source.terminalId === terminalId)
        ) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        if (terminal.type !== terminalType) {
          continue;
        }
        if (source && source.node.id === node.id && source.terminalId === terminal.id) {
          continue;
        }
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  
  };
}

export function createStartRoutableLineEndpointDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode, endpoint: EdgeEndpoint) => {
    const { activeLayerNodeIdSet, isBrowseMode, setCanvasSelectionScope, setContextMenu, setRoutableLineEndpointDrag, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = ctx;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || isBrowseMode || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const points = routableLineDeviceCanvasPoints(node);
    const previewPoint = endpoint === "source" ? points[0] : points[points.length - 1];
    if (!previewPoint) {
      return;
    }
    setRoutableLineEndpointDrag({
      nodeId: node.id,
      endpoint,
      previewPoint,
      pointerId: event.pointerId
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setContextMenu(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createFinishConnectToTarget(ctx: AppRuntimeContext) {
  return (target: NonNullable<ReturnType<typeof findConnectTargetAtPoint>>, endpointPoint = connectPreviewPointRef.current) => {
    const { busAnchorFromPoint, commitNewConnectionEdge, connectSource, visibleNodeById } = ctx;
    if (!connectSource) {
      return false;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, target.node, target.terminalId)) {
      return false;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: target.node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      targetTerminalId: target.terminalId,
      targetPoint: isBusNode(target.node)
        ? target.point ?? busAnchorFromPoint(target.node, endpointPoint ?? getTerminalPoint(target.node, target.terminalId))
        : target.point
    };
    return commitNewConnectionEdge(newEdge, sourceNode.name, target.node.name);
  
  };
}

export function createFinishRewiring(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGSVGElement>) => {
    const { canvasBounds, clampPointToCanvas, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, findRewireTargetAtPoint, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, pushUndoSnapshot, rewiring, routedEdges, routingNodesForConnectionEdge, selectCanvasGraphics, setRewiring, svgRef, writeOperationLog } = ctx;
    if (!rewiring || !svgRef.current) {
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const target = findRewireTargetAtPoint(point, rewiring);
    if (target) {
      const edge = edgeById.get(rewiring.edgeId);
      const movingPoint = target.point ?? getTerminalPoint(target.node, target.terminalId);
      const sourceNode = edge ? nodeById.get(edge.sourceId) : undefined;
      const targetNode = edge ? nodeById.get(edge.targetId) : undefined;
      const rewiredEdge = edge
        ? rewiring.endpoint === "source"
          ? {
              ...edge,
              sourceId: target.node.id,
              sourceTerminalId: target.terminalId,
              sourcePoint: target.point
            }
          : {
              ...edge,
              targetId: target.node.id,
              targetTerminalId: target.terminalId,
              targetPoint: target.point
            }
        : null;
      const slidePatch = edge && sourceNode && targetNode
        ? resolveStraightBusSlideEndpointToPoint({
            edge,
            sourceNode,
            targetNode,
            movingEndpoint: rewiring.endpoint,
            movingPoint,
            nodes,
            movingNode: target.node,
            movingTerminalId: target.terminalId
          })
        : null;
      const candidateEdge = rewiredEdge ? (slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge) : null;
      const endpointRuleMessage = candidateEdge ? connectionEndpointRuleFailureMessage(candidateEdge) : "";
      const prepared = candidateEdge && !endpointRuleMessage
        ? prepareConnectionEdgeForCommit(
            routingNodesForConnectionEdge(candidateEdge, nodes),
            [candidateEdge],
            rewiring.edgeId,
            canvasBounds,
            routedEdges
          )
        : null;
      if (prepared?.ok && prepared.edge) {
        const preparedEdge = prepared.edge;
        pushUndoSnapshot();
        markRouteEdgesDirty([rewiring.edgeId]);
        markStoredRouteEdgesDirty([rewiring.edgeId]);
        markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
        patchGraphEdges([preparedEdge]);
        writeOperationLog(`调整联络线端子：${rewiring.edgeId}`);
      } else {
        const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
        window.alert(`联络线端子调整失败：${message}`);
        writeOperationLog(`联络线端子调整失败：${message}`);
      }
    } else {
      window.alert("联络线端子必须连接到同类型端子或母线，已保持原连接。");
      writeOperationLog("联络线端子调整失败");
    }
    selectCanvasGraphics([], [rewiring.edgeId]);
    setRewiring(null);
  
  };
}

export function createStartCanvasPanning(ctx: AppRuntimeContext) {
  return (event: PointerEvent<Element>) => {
    const { activateInspectorFromCanvas, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasInteractionRef, canvasNoScrollOffsetRef, canvasVerticalScrollbarsActiveRef, clampPointToCanvas, currentViewBoxFromCanvasFrameScroll, lastCanvasPointerRef, lastRawCanvasPointerRef, projectListPointerInsideRef, resetConnectPreviewState, setCanvasPanning, setConnectSource, setContextMenu, setProjectMenu, setRewiring, svgRef, updateMouseStatus } = ctx;
    const svg = svgRef.current;
    if (event.button !== 0 || !svg) {
      return false;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    const rawPointer = screenToSvgPoint(svg, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    updateMouseStatus(pointer);
    setContextMenu(null);
    setProjectMenu(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    const frame = canvasFrameRef.current;
    const panningViewBox = currentViewBoxFromCanvasFrameScroll();
    setCanvasPanning({
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox: panningViewBox,
      canvasOffset: canvasNoScrollOffsetRef.current,
      scrollLeft: frame?.scrollLeft ?? 0,
      scrollTop: frame?.scrollTop ?? 0,
      horizontalScrollMode: frame ? canvasHorizontalScrollbarsActiveRef.current && canvasFrameHasHorizontalScrollableRange(frame) : false,
      verticalScrollMode: frame ? canvasVerticalScrollbarsActiveRef.current && canvasFrameHasVerticalScrollableRange(frame) : false
    });
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  
  };
}

export function createWheelZoomAnchorFromClient(ctx: AppRuntimeContext) {
  return (clientX: number, clientY: number): WheelZoomAnchor | null => {
    const { canvasBoundsRef, canvasFrameRef, canvasVisibleViewBoxRef, svgRef, viewBoxRef } = ctx;
    const frame = canvasFrameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) {
      return null;
    }
    const frameRect = frame.getBoundingClientRect();
    const cursorInsideFrame =
      clientX >= frameRect.left &&
      clientX <= frameRect.right &&
      clientY >= frameRect.top &&
      clientY <= frameRect.bottom;
    if (cursorInsideFrame) {
      return {
        point: clampPointToBounds(screenToSvgPoint(svg, clientX, clientY), canvasBoundsRef.current),
        cursorOffsetX: clampNumber(clientX - frameRect.left, 0, frameRect.width),
        cursorOffsetY: clampNumber(clientY - frameRect.top, 0, frameRect.height)
      };
    }
    const visible = canvasVisibleViewBoxRef.current;
    const current = viewBoxRef.current;
    const fallbackPoint = visible.width > 0 && visible.height > 0
      ? {
          x: visible.x + visible.width / 2,
          y: visible.y + visible.height / 2
        }
      : {
          x: current.x + current.width / 2,
          y: current.y + current.height / 2
        };
    return {
      point: clampPointToBounds(fallbackPoint, canvasBoundsRef.current),
      cursorOffsetX: frameRect.width / 2,
      cursorOffsetY: frameRect.height / 2
    };
  
  };
}

export function createZoomCanvasFromWheelEvent(ctx: AppRuntimeContext) {
  return (event: CanvasWheelZoomEvent) => {
    const { canvasBoundsRef, pendingWheelZoomAnchorRef, setViewBox, wheelZoomAnchorFromClient } = ctx;
    if (!shouldZoomCanvasFromWheelEvent(event)) {
      return false;
    }
    if (!event.defaultPrevented) {
      event.preventDefault();
    }
    event.stopPropagation();
    const anchor = wheelZoomAnchorFromClient(event.clientX, event.clientY);
    if (!anchor) {
      return true;
    }
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
    pendingWheelZoomAnchorRef.current = anchor;
    setViewBox((current) => {
      const bounds = canvasBoundsRef.current;
      const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
        { width: current.width * zoomFactor, height: current.height * zoomFactor },
        bounds
      );
      const nextScaleX = bounds.width / Math.max(1, nextWidth);
      const nextScaleY = bounds.height / Math.max(1, nextHeight);
      return normalizeViewBoxToCanvas({
        x: anchor.point.x - anchor.cursorOffsetX / nextScaleX,
        y: anchor.point.y - anchor.cursorOffsetY / nextScaleY,
        width: nextWidth,
        height: nextHeight
      }, bounds);
    });
    return true;
  
  };
}

export function createCommitLayoutNodePositions(ctx: AppRuntimeContext) {
  return (layoutNodeIds: string[], arranged: ModelNode[], options: { readjustBusEndpoints?: boolean } = {}) => {
    const { adjustEdgesAfterNodeMove, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, commitFastMovedGraphPatches, currentStoredRoutePointsForEdge, edgeListForNodeIds, edges, finalizeMovedNodeEdgesFast, nodeById, nodes, orderedNodeFromList, pushUndoSnapshot, readjustMovedBusConnectionRoutes, rejectAutoCanvasExpansionForContent, snapshotEdgePoints, undoScopeForGraphPatch } = ctx;
    const uniqueLayoutNodeIds = Array.from(new Set(layoutNodeIds));
    if (uniqueLayoutNodeIds.length === 0) {
      return 0;
    }
    const movedNodeUpdates = uniqueLayoutNodeIds.flatMap((nodeId) => {
      const previous = nodeById.get(nodeId);
      const nextNode = orderedNodeFromList(arranged, nodeId);
      if (!previous || !nextNode) {
        return [];
      }
      return previous.position.x !== nextNode.position.x || previous.position.y !== nextNode.position.y ? [nextNode] : [];
    });
    if (movedNodeUpdates.length === 0) {
      return 0;
    }
    const movedNodeIds = movedNodeUpdates.map((node) => node.id);
    const movedNodeIdSet = new Set(movedNodeIds);
    const affectedEdgesForLayout = edgeListForNodeIds(movedNodeIds);
    if (rejectAutoCanvasExpansionForContent(movedNodeUpdates, affectedEdgesForLayout)) {
      return 0;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(movedNodeIds, affectedEdgesForLayout.map((edge) => edge.id)));
    const layoutCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBounds,
      arranged,
      edges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(layoutCanvasBounds);
    const originalPositions = Object.fromEntries(
      movedNodeIds.flatMap((id) => {
        const node = nodeById.get(id);
        return node ? [[id, node.position]] : [];
      })
    );
    const deltas = Object.fromEntries(
      movedNodeUpdates.map((node) => {
        const previous = nodeById.get(node.id);
        return [
          node.id,
          {
            x: node.position.x - (previous?.position.x ?? node.position.x),
            y: node.position.y - (previous?.position.y ?? node.position.y)
          }
        ];
      })
    );
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForLayout);
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForLayout.map((edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
    const adjustedAffectedEdges = affectedEdgesForLayout.length > 0
      ? adjustEdgesAfterNodeMove(
          affectedEdgesForLayout,
          arranged,
          movedNodeIdSet,
          originalEdgePoints,
          deltas,
          originalRoutePoints,
          new Set<string>(),
          layoutCanvasBounds
        )
      : affectedEdgesForLayout;
    const finalizedCandidateEdges = adjustedAffectedEdges.length > 0
      ? finalizeMovedNodeEdgesFast(
          nodes,
          arranged,
          adjustedAffectedEdges,
          movedNodeIds,
          adjustedAffectedEdges
        )
      : adjustedAffectedEdges;
    const committedCandidateEdges = options.readjustBusEndpoints
      ? readjustMovedBusConnectionRoutes(
          arranged,
          finalizedCandidateEdges,
          movedNodeIds,
          layoutCanvasBounds
        )
      : finalizedCandidateEdges;
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      arranged,
      committedCandidateEdges,
      affectedEdgesForLayout,
      movedNodeIds,
      originalRoutePoints,
      new Set<string>(),
      originalPositions,
      nodes,
      layoutCanvasBounds
    );
    return movedNodeUpdates.length;
  
  };
}

export function createConfirmVoltageBaseSetDialog(ctx: AppRuntimeContext) {
  return () => {
    const { hasVoltageBaseTerminalValues, patchGraphNodes, pushUndoSnapshot, requireEditMode, setVoltageBaseSetDialogOpen, undoScopeForGraphPatch, voltageBaseSetMode, voltageBaseSetResultForScope, voltageBaseSetScope, voltageBaseSetValue, voltageBaseTerminalValues, writeOperationLog } = ctx;
    if (!requireEditMode("设置电压基值")) {
      setVoltageBaseSetDialogOpen(false);
      return;
    }
    const value = voltageBaseSetValue.trim();
    const terminalMode = voltageBaseSetMode === "terminal";
    if (terminalMode && !hasVoltageBaseTerminalValues(voltageBaseTerminalValues)) {
      writeOperationLog("端子电压基值不能为空");
      return;
    }
    if (!terminalMode && !value) {
      writeOperationLog("设置电压基值不能为空");
      return;
    }
    const result = voltageBaseSetResultForScope(voltageBaseSetScope);
    const scopeLabel = VOLTAGE_BASE_SET_SCOPE_LABELS[voltageBaseSetScope];
    if (result.changedNodeIds.length === 0) {
      writeOperationLog(`${scopeLabel}没有需要设置的电压基值`);
      setVoltageBaseSetDialogOpen(false);
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(result.changedNodeIds, []));
    patchGraphNodes(result.nodeUpdates);
    writeOperationLog(`设置电压基值（${scopeLabel}）：${result.changedNodeIds.length}/${result.targetNodeIds.length} 个设备，${terminalMode ? "按端子设置" : `值 ${value}`}`);
    setVoltageBaseSetDialogOpen(false);
  
  };
}

export function createRedrawConnectionRoutes(ctx: AppRuntimeContext) {
  return (scope: ConnectionRedrawScope) => {
    const { canvasBounds, connectionRedrawEdgeIdsForScope, edges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodes, patchGraphEdges, pushUndoSnapshot, requireEditMode, undoScopeForGraphPatch, writeOperationLog } = ctx;
    if (!requireEditMode("重绘连接线")) {
      return;
    }
    const targetEdgeIds = connectionRedrawEdgeIdsForScope(scope);
    const scopeLabel = CONNECTION_REDRAW_SCOPE_LABELS[scope];
    if (targetEdgeIds.length === 0) {
      writeOperationLog(`${scopeLabel}为空，未执行连接线重绘`);
      return;
    }

    const nextEdges = redrawConnectionRoutesForEdges(nodes, edges, targetEdgeIds, canvasBounds);
    const changedEdges: Edge[] = [];
    for (let index = 0; index < nextEdges.length; index += 1) {
      if (nextEdges[index] !== edges[index]) {
        changedEdges.push(nextEdges[index]);
      }
    }
    if (changedEdges.length === 0) {
      writeOperationLog(`${scopeLabel}重绘未产生变化`);
      return;
    }

    const changedEdgeIds = changedEdges.map((edge) => edge.id);
    pushUndoSnapshot(true, false, undoScopeForGraphPatch([], changedEdgeIds));
    markRouteEdgesDirty(changedEdgeIds);
    markStoredRouteEdgesDirty(changedEdgeIds);
    patchGraphEdges(changedEdges);
    writeOperationLog(`重绘${scopeLabel}：${changedEdges.length}/${targetEdgeIds.length} 条`);
  
  };
}

export function createDeleteModelLayer(ctx: AppRuntimeContext) {
  return (layerId: string) => {
    const { activeLayerId, edges, groups, layers, nodes, pushUndoSnapshot, requireEditMode, resetConnectPreviewState, setActiveLayerId, setConnectSource, setContextMenu, setGraphArrays, setGroups, setLayers, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
    if (!requireEditMode("删除图层")) {
      return;
    }
    if (layers.length <= 1) {
      window.alert("至少需要保留一个图层。");
      return;
    }
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      return;
    }
    const nodeIdsInLayer = nodes
      .filter((node) => (node.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerId)
      .map((node) => node.id);
    if (nodeIdsInLayer.length > 0 && !window.confirm(`删除图层“${layer.name}”？该图层内共有 ${nodeIdsInLayer.length} 个图元，继续删除将同时删除这些图元及相关联络线。是否继续？`)) {
      return;
    }
    pushUndoSnapshot();
    const result = deleteNodesWithConnectedEdges(nodes, edges, nodeIdsInLayer);
    const remainingLayers = layers.filter((item) => item.id !== layerId);
    const nextActiveLayerId = activeLayerId === layerId
      ? remainingLayers.find((item) => item.visible)?.id ?? remainingLayers[0]?.id ?? DEFAULT_MODEL_LAYER_ID
      : activeLayerId;
    const nextLayers = remainingLayers.map((item) => item.id === nextActiveLayerId ? { ...item, visible: true } : item);
    const remainingEdgeIds = new Set(result.edges.map((edge) => edge.id));
    const removedEdgeIds = edges.filter((edge) => !remainingEdgeIds.has(edge.id)).map((edge) => edge.id);
    setGraphArrays(result.nodes, result.edges);
    setGroups(normalizeModelGroups(removeGraphicsFromGroups(groups, nodeIdsInLayer, removedEdgeIds), result.nodes, result.edges));
    setLayers(nextLayers);
    setActiveLayerId(nextActiveLayerId);
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`删除图层：${layer.name}，删除 ${nodeIdsInLayer.length} 个图元`);
  
  };
}

export function createRenderLayerManager(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerId, addModelLayer, deleteModelLayer, layers, moveModelLayer, setActiveLayer, toggleModelLayerVisibility } = ctx;
    return (
    <div className="layer-manager">
      <div className="layer-manager-toolbar">
        <button type="button" onClick={addModelLayer}>新增图层</button>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => (
          <div key={layer.id} className={`layer-row ${layer.id === activeLayerId ? "active" : ""}`}>
            <label title={layer.id === activeLayerId ? "激活图层必须显示" : "显示/隐藏图层"}>
              <input
                type="checkbox"
                checked={layer.visible}
                disabled={layer.id === activeLayerId}
                onChange={() => toggleModelLayerVisibility(layer.id)}
              />
              显示
            </label>
            <label>
              <input
                type="radio"
                name="active-layer"
                checked={layer.id === activeLayerId}
                onChange={() => setActiveLayer(layer.id)}
              />
              激活
            </label>
            <input
              className="layer-name-input"
              value={layer.name}
              readOnly
            />
            <button type="button" onClick={() => moveModelLayer(layer.id, -1)} disabled={index === 0} title="图层上移">上移</button>
            <button type="button" onClick={() => moveModelLayer(layer.id, 1)} disabled={index === layers.length - 1} title="图层下移">下移</button>
            <button type="button" onClick={() => deleteModelLayer(layer.id)} disabled={layers.length <= 1} title="删除图层">删除</button>
          </div>
        ))}
      </div>
    </div>
  );
  };
}

export function createLocateTopologyError(ctx: AppRuntimeContext) {
  return (error: TopologyValidationError) => {
    const { activateInspectorFromCanvas, activeLayerEdgeIdSet, activeLayerNodeIdSet, clampViewBoxToCanvas, clearRecordSelection, nodeById, setCanvasSelectionScope, setInspectorTab, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setViewBox, viewBox } = ctx;
    activateInspectorFromCanvas();
    const firstNodeId = error.relatedNodeIds[0] ?? error.nodeId;
    const node = firstNodeId ? nodeById.get(firstNodeId) : undefined;
    const editableNode = Boolean(firstNodeId && activeLayerNodeIdSet.has(firstNodeId));
    const editableEdge = Boolean(error.edgeId && activeLayerEdgeIdSet.has(error.edgeId));
    setCanvasSelectionScope("group");
    setSelectedNodeIds(editableNode && firstNodeId ? [firstNodeId] : []);
    setSelectedEdgeId(editableEdge && error.edgeId ? error.edgeId : "");
    setSelectedEdgeIds(editableEdge && error.edgeId ? [error.edgeId] : []);
    if (node) {
      setViewBox(clampViewBoxToCanvas({
        x: node.position.x - viewBox.width / 2,
        y: node.position.y - viewBox.height / 2,
        width: viewBox.width,
        height: viewBox.height
      }));
      setInspectorTab("device");
      clearRecordSelection();
    }
  
  };
}

export function createZoomViewportAtCenter(ctx: AppRuntimeContext) {
  return (zoomFactor: number) => {
    const { canvasBounds, canvasVisibleViewBoxRef, clampViewBoxToCanvas, setViewBox } = ctx;
    setViewBox((current) => {
      const visible = canvasVisibleViewBoxRef.current;
      const center = visible.width > 0 && visible.height > 0
        ? {
            x: visible.x + visible.width / 2,
            y: visible.y + visible.height / 2
          }
        : {
            x: current.x + current.width / 2,
            y: current.y + current.height / 2
          };
      const size = clampViewBoxDimensionsForZoom(
        { width: current.width * zoomFactor, height: current.height * zoomFactor },
        canvasBounds
      );
      return clampViewBoxToCanvas({
        x: center.x - size.width / 2,
        y: center.y - size.height / 2,
        width: size.width,
        height: size.height
      });
    });
  
  };
}

export function createFocusElementTreeItem(ctx: AppRuntimeContext) {
  return (item: ElementTreeItem, openDeviceTab = false) => {
    const { activeLayerEdgeIdSet, activeLayerNodeIdSet, centerViewOnPoint, clearRecordSelection, edges, nodes, resetConnectPreviewState, selectCanvasGraphics, setConnectSource, setContextMenu, setInspectorTab, setRewiring } = ctx;
    if (item.kind === "node") {
      selectCanvasGraphics(activeLayerNodeIdSet.has(item.id) ? [item.id] : [], []);
    } else {
      const editableEdge = activeLayerEdgeIdSet.has(item.id);
      selectCanvasGraphics([], editableEdge ? [item.id] : []);
    }
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    clearRecordSelection();
    if (openDeviceTab && (item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id))) {
      setInspectorTab("device");
    }
    const point = getElementFocusPoint(item, nodes, edges);
    if (point) {
      centerViewOnPoint(point);
    }
  
  };
}

export function createStartManualPointDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGCircleElement>, edgeId: string, pointIndex: number, routePoints: Point[]) => {
    const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, findBendInsertRouteSegmentIndex, insertManualBendAtPoint, isBrowseMode, routeManualPoints, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = ctx;
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
      const segmentIndex = findBendInsertRouteSegmentIndex(routePoints, pointer);
      if (segmentIndex >= 0) {
        edgePointerBendInsertRef.current = {
          edgeId,
          clientX: event.clientX,
          clientY: event.clientY,
          at: Date.now()
        };
        insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      }
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  
  };
}

export function createHandleEdgePathPointerDown(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGPathElement>, edgeId: string, routePoints: Point[]) => {
    const { activateInspectorFromCanvas, activeLayerEdgeIdSet, appendStaticDrawingPoint, clampPointToCanvas, edgePointerBendInsertRef, insertManualBendFromPointer, isBrowseMode, lastEdgePointerClickRef, selectCanvasGraphics, startModifierSelectionPress, staticDrawing, svgRef } = ctx;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    if (staticDrawing) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      activateInspectorFromCanvas();
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const edgeClick = {
      edgeId,
      clientX: event.clientX,
      clientY: event.clientY,
      at: Date.now()
    };
    const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
    lastEdgePointerClickRef.current = edgeClick;
    if (event.detail < 2 && !repeatedClick) {
      return;
    }
    event.preventDefault();
    if (insertManualBendFromPointer(edgeId, routePoints, clickPoint)) {
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      lastEdgePointerClickRef.current = null;
    }
  
  };
}

export function createExportEFile(ctx: AppRuntimeContext) {
  return async () => {
    const { currentProject, ensureSavedBeforeExport, writeOperationLog } = ctx;
    if (!ensureSavedBeforeExport()) {
      return;
    }
    const project = currentProject();
    const warnings = getEExportWarnings(project);
    if (warnings.length > 0) {
      window.alert(
        [
          `有 ${warnings.length} 个图上设备未导出到 E 文件：`,
          ...warnings.slice(0, 20).map((warning) => `- ${warning.nodeName}（${warning.kind}）：${warning.reason}`),
          warnings.length > 20 ? `... 还有 ${warnings.length - 20} 个设备未列出。` : ""
        ].filter(Boolean).join("\n")
      );
    }
    const file = buildEFileExport(project);
    await saveTextFile({
      filename: file.filename,
      text: file.text,
      mime: file.mime,
      description: "E 模型文件",
      extensions: [".e"]
    });
    writeOperationLog(`导出模型文件：${file.filename}`);
  
  };
}

export function createMergeImportedSchemeIntoExisting(ctx: AppRuntimeContext) {
  return (existingScheme: SavedSchemeRecord, importedScheme: SavedSchemeRecord): SavedSchemeRecord => {
    const now = new Date().toISOString();
    const nextProjects = importedScheme.projects.reduce<SavedProjectRecord[]>((current, importedProject) => {
      const duplicateProject = current.find((project) => hasSameName(project.name, [importedProject.name]));
      if (!duplicateProject) {
        return upsertSavedProject(current, importedProject);
      }
      return upsertSavedProject(current, {
        ...importedProject,
        id: duplicateProject.id,
        name: duplicateProject.name,
        project: { ...importedProject.project, name: duplicateProject.name }
      });
    }, existingScheme.projects);
    const nextChildren = (importedScheme.children ?? []).reduce<SavedSchemeRecord[]>((current, importedChild) => {
      const duplicateChild = current.find((child) => hasSameName(child.name, [importedChild.name]));
      if (!duplicateChild) {
        return [...current, importedChild];
      }
      return current.map((child) => child.id === duplicateChild.id ? mergeImportedSchemeIntoExisting(child, importedChild) : child);
    }, existingScheme.children ?? []);
    return { ...existingScheme, updatedAt: now, projects: nextProjects, children: nextChildren };
  
  };
}

export function createImportModelFile(ctx: AppRuntimeContext) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
    const { activeSchemeRecord, commitImportedModelRecord, modelImportTargetSchemeIdRef, requireEditMode, schemes, selectedSchemeRecord, setPendingModelImportConflict } = ctx;
    const input = event.currentTarget;
    if (!requireEditMode("导入模型")) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedProject = deserializeProject(text);
      const importTargetSchemeId = modelImportTargetSchemeIdRef.current;
      const targetScheme =
        findSavedSchemeById(schemes, importTargetSchemeId) ??
        activeSchemeRecord ??
        selectedSchemeRecord ??
        schemes[0] ??
        createSavedScheme("默认方案");
      const fileBaseName = file.name.replace(/\.json$/i, "");
      const importedName = (importedProject.name || fileBaseName || "导入模型").trim() || "导入模型";
      const duplicateProject = targetScheme.projects.find((project) => project.name.trim() === importedName.trim());
      if (duplicateProject) {
        setPendingModelImportConflict({
          targetSchemeId: targetScheme.id,
          importedProject,
          importedName,
          duplicateProjectId: duplicateProject.id,
          duplicateProjectName: duplicateProject.name
        });
        return;
      }
      commitImportedModelRecord(targetScheme, createSavedProject(importedName, importedProject));
    } catch (error) {
      window.alert(error instanceof Error ? `导入模型文件失败：${error.message}` : "导入模型文件失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  
  };
}

export function createResolveDuplicateModelImport(ctx: AppRuntimeContext) {
  return (action: "overwrite" | "rename" | "cancel") => {
    const { activeSchemeRecord, commitImportedModelRecord, pendingModelImportConflict, requireEditMode, schemes, selectedSchemeRecord, setPendingModelImportConflict } = ctx;
    const conflict = pendingModelImportConflict;
    if (!conflict || action === "cancel") {
      setPendingModelImportConflict(null);
      return;
    }
    if (!requireEditMode("处理模型导入冲突")) {
      setPendingModelImportConflict(null);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0] ??
      createSavedScheme("默认方案");
    const existingNames = targetScheme.projects.map((project) => project.name);
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的模型名称",
        uniqueRecordName(conflict.importedName, existingNames, "导入模型"),
        existingNames,
        "模型名称不能为空。",
        "模型名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingModelImportConflict(null);
      commitImportedModelRecord(targetScheme, createSavedProject(renamed, conflict.importedProject));
      return;
    }
    const duplicateProject = targetScheme.projects.find((project) => project.id === conflict.duplicateProjectId);
    const targetName = duplicateProject?.name ?? conflict.duplicateProjectName;
    const overwrittenRecord = createSavedProject(targetName, conflict.importedProject);
    setPendingModelImportConflict(null);
    commitImportedModelRecord(targetScheme, {
      ...overwrittenRecord,
      id: conflict.duplicateProjectId,
      name: targetName,
      project: { ...overwrittenRecord.project, name: targetName }
    });
  
  };
}

export function createApplyExistingImage(ctx: AppRuntimeContext) {
  return (assetId: string) => {
    const { imageAssets, imageTarget, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, updateGraphNodeById } = ctx;
    if (!requireEditMode("应用图片")) {
      return;
    }
    const imageData = imageAssets[assetId];
    if (!imageTarget || !imageData) {
      return;
    }
    pushUndoSnapshot();
    if (imageTarget.kind === "canvas") {
      setCanvasBackgroundImageAssetId(assetId);
      setCanvasBackgroundImage(imageData);
    } else {
      updateGraphNodeById(imageTarget.nodeId, (node) =>
        imageTarget.kind === "nodeForeground"
          ? { ...node, params: { ...node.params, foregroundImageAssetId: assetId, foregroundImage: imageData } }
          : { ...node, params: { ...node.params, backgroundImageAssetId: assetId, backgroundImage: imageData } }
      );
    }
    setImageTarget(null);
  
  };
}

export function createRenameImageFolder(ctx: AppRuntimeContext) {
  return async () => {
    const { activeImageFolderId, imageFolders, refreshImageFolders, requireEditMode } = ctx;
    if (!requireEditMode("重命名图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      window.alert("默认文件夹不能重命名。");
      return;
    }
    const inputName = window.prompt("请输入新的图片文件夹名称", folder.name);
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("图片文件夹名称不能为空。");
      return;
    }
    try {
      await renameBackendImageFolder(folder.id, name);
      await refreshImageFolders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "重命名图片文件夹失败。");
    }
  
  };
}

export function createSaveDeviceDefinitionDraft(ctx: AppRuntimeContext) {
  return () => {
    const { definitionDraftRows, definitionDraftSection, requireEditMode, selectedDefinitionTemplate, setDefinitionDraftError, setDefinitionDraftRows, setDeviceDefinitionOverrides } = ctx;
    if (!requireEditMode("保存元件定义")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const normalizedRows: DeviceParameterDefinition[] = [];
    const seenNames = new Set<string>();
    for (const row of definitionDraftRows) {
      const enName = row.enName.trim();
      const cnName = row.cnName.trim();
      if (!enName || !cnName) {
        setDefinitionDraftError("中文名称和英文名称不能为空。");
        return;
      }
      const key = enName.toLowerCase();
      if (seenNames.has(key)) {
        setDefinitionDraftError(`英文名称 ${enName} 重复，无法保存。`);
        return;
      }
      seenNames.add(key);
      normalizedRows.push({
        cnName,
        enName,
        valueType: row.valueType,
        typicalValue: row.typicalValue,
        readonly: Boolean(row.readonly)
      });
    }
    const params = normalizedRows.reduce<Record<string, string>>((acc, row) => {
      if (row.enName !== "name") {
        acc[row.enName] = row.typicalValue;
      }
      return acc;
    }, {
      component_type: definitionDraftSection || resolveTemplateComponentType(selectedDefinitionTemplate)
    });
    setDeviceDefinitionOverrides((current) => ({
      ...current,
      [selectedDefinitionTemplate.kind]: {
        kind: selectedDefinitionTemplate.kind,
        params,
        parameterDefinitions: normalizedRows,
        updatedAt: new Date().toISOString()
      }
    }));
    setDefinitionDraftRows(normalizedRows.map((row) => ({ ...row, id: deviceDefinitionRowId() })));
    setDefinitionDraftError("");
  
  };
}

export function createCreateCustomComponentType(ctx: AppRuntimeContext) {
  return () => {
    const { componentTypeOptions, customDeviceDraft, nextCustomComponentTypeName, requireEditMode, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft } = ctx;
    if (!requireEditMode("新建元件类型")) {
      return;
    }
    const rawName = window.prompt("请输入新元件类型英文名称", nextCustomComponentTypeName());
    if (rawName === null) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(customDeviceDraft.attributeLibraryName);
    const componentType = normalizeComponentTypeName(rawName);
    if (!componentType) {
      window.alert("元件类型名称不能为空。");
      return;
    }
    if (!isValidComponentTypeName(componentType)) {
      window.alert("元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
      return;
    }
    const existingTypes = new Set(componentTypeOptions.map((item) => item.toLowerCase()));
    if (existingTypes.has(componentType.toLowerCase())) {
      window.alert("元件类型已存在，无法新增同名元件类型。");
      return;
    }
    setCustomComponentTypes((current) => normalizeCustomComponentTypes([...current, { name: componentType, attributeLibraryName }]));
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName, section: componentType });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentType: componentType,
      error: ""
    }));
  
  };
}

export function createRenameSelectedCustomDeviceTreeItem(ctx: AppRuntimeContext) {
  return () => {
    const { attributeLibraries, componentTypeOptions, customComponentTreeSelection, customComponentTreeTypeKey, libraryTemplateByKind, libraryTemplates, requireEditMode, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setExpandedAttributeLibraries, setExpandedDefinitionGroups } = ctx;
    if (!requireEditMode("重命名元件库条目")) {
      return;
    }
    if (customComponentTreeSelection.kind === "attributeLibrary") {
      const oldAttributeLibraryName = normalizeAttributeLibraryName(customComponentTreeSelection.attributeLibraryName);
      if (PROTECTED_ATTRIBUTE_LIBRARIES.has(oldAttributeLibraryName) || oldAttributeLibraryName === "静态图元") {
        window.alert("系统内置属性库不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的属性库名称", oldAttributeLibraryName);
      if (rawName === null) {
        return;
      }
      const newAttributeLibraryName = normalizeAttributeLibraryName(rawName.trim());
      if (!newAttributeLibraryName) {
        window.alert("属性库名称不能为空。");
        return;
      }
      if (attributeLibraries.some((group) => normalizeAttributeLibraryName(group).toLowerCase() === newAttributeLibraryName.toLowerCase() && normalizeAttributeLibraryName(group) !== oldAttributeLibraryName)) {
        window.alert("属性库名称已存在，无法重命名。");
        return;
      }
      setCustomAttributeLibraries((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setCustomComponentTypes((current) => current.map((componentType) => normalizeAttributeLibraryName(componentType.attributeLibraryName) === oldAttributeLibraryName ? { ...componentType, attributeLibraryName: newAttributeLibraryName } : componentType));
      setCustomDeviceTemplates((current) => current.map((template) => normalizeAttributeLibraryName(template.attributeLibrary) === oldAttributeLibraryName ? { ...template, attributeLibrary: newAttributeLibraryName } : template));
      setExpandedAttributeLibraries((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setExpandedDefinitionGroups((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setCollapsedCustomComponentTreeLibraries((current) => current.map((group) => normalizeAttributeLibraryName(group) === oldAttributeLibraryName ? newAttributeLibraryName : group));
      setCollapsedCustomComponentTreeTypes((current) => current.map((key) => key.startsWith(`${oldAttributeLibraryName}::`) ? key.replace(`${oldAttributeLibraryName}::`, `${newAttributeLibraryName}::`) : key));
      setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName: newAttributeLibraryName });
      setCustomDeviceDraft((current) => ({
        ...current,
        attributeLibraryName: normalizeAttributeLibraryName(current.attributeLibraryName) === oldAttributeLibraryName ? newAttributeLibraryName : current.attributeLibraryName,
        error: ""
      }));
      return;
    }
    if (customComponentTreeSelection.kind === "componentType") {
      const oldSection = normalizeComponentTypeName(customComponentTreeSelection.section);
      if (isBuiltInComponentType(oldSection)) {
        window.alert("系统内置元件类型不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的元件类型英文名称", oldSection);
      if (rawName === null) {
        return;
      }
      const newSection = normalizeComponentTypeName(rawName);
      if (!isValidComponentTypeName(newSection)) {
        window.alert("元件类型必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
        return;
      }
      if (componentTypeOptions.some((section) => section.toLowerCase() === newSection.toLowerCase() && section.toLowerCase() !== oldSection.toLowerCase())) {
        window.alert("元件类型已存在，无法重命名。");
        return;
      }
      const attributeLibraryName = normalizeAttributeLibraryName(customComponentTreeSelection.attributeLibraryName);
      const affectedKinds = new Set(
        libraryTemplates
          .filter((template) => template.custom && normalizeAttributeLibraryName(template.attributeLibrary) === attributeLibraryName && resolveTemplateComponentType(template).toLowerCase() === oldSection.toLowerCase())
          .map((template) => template.kind)
      );
      setCustomComponentTypes((current) => current.map((componentType) =>
        componentType.name.toLowerCase() === oldSection.toLowerCase() ? { ...componentType, name: newSection, attributeLibraryName } : componentType
      ));
      setCollapsedCustomComponentTreeTypes((current) => current.map((key) =>
        key === customComponentTreeTypeKey(attributeLibraryName, oldSection) ? customComponentTreeTypeKey(attributeLibraryName, newSection) : key
      ));
      setCustomDeviceTemplates((current) => current.map((template) =>
        affectedKinds.has(template.kind)
          ? { ...template, params: { ...template.params, component_type: newSection } }
          : template
      ));
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of affectedKinds) {
          const override = next[kind];
          if (override) {
            next[kind] = { ...override, params: { ...(override.params ?? {}), component_type: newSection } };
          }
        }
        return next;
      });
      setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName, section: newSection });
      setCustomDeviceDraft((current) => ({
        ...current,
        attributeLibraryName,
        componentType: current.componentType.toLowerCase() === oldSection.toLowerCase() ? newSection : current.componentType,
        error: ""
      }));
      setDefinitionDraftSection((current) => current.toLowerCase() === oldSection.toLowerCase() ? newSection : current);
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      window.alert("系统内置元件不能在这里重命名。");
      return;
    }
    const rawName = window.prompt("请输入新的元件名称", template.label);
    if (rawName === null) {
      return;
    }
    const newLabel = rawName.trim();
    if (!newLabel) {
      window.alert("元件名称不能为空。");
      return;
    }
    setCustomDeviceTemplates((current) => current.map((item) => item.kind === template.kind ? { ...item, label: newLabel } : item));
    setCustomDeviceDraft((current) => ({
      ...current,
      componentName: current.componentName === template.label ? newLabel : current.componentName,
      error: ""
    }));
  
  };
}

export function createHandleStaticButtonClick(ctx: AppRuntimeContext) {
  return (event: MouseEvent<SVGGElement>, node: ModelNode) => {
    const { clearStaticButtonFeedback, executeStaticButtonAction, isBrowseMode, isStaticButtonEnabledForNode, setStaticButtonFeedback, setStaticButtonVisual, staticButtonFeedbackTimeoutRef, staticButtonPointerRef } = ctx;
    if (!isBrowseMode || !isStaticButtonEnabledForNode(node)) {
      return;
    }
    const pointerSnapshot = staticButtonPointerRef.current;
    staticButtonPointerRef.current = null;
    if (
      !pointerSnapshot ||
      pointerSnapshot.nodeId !== node.id ||
      pointerSnapshot.moved ||
      Math.hypot(event.clientX - pointerSnapshot.clientX, event.clientY - pointerSnapshot.clientY) > 4
    ) {
      clearStaticButtonFeedback(node.id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setStaticButtonFeedback(node.id, "clicked");
    staticButtonFeedbackTimeoutRef.current = window.setTimeout(() => {
      staticButtonFeedbackTimeoutRef.current = null;
      setStaticButtonVisual((current) => (current?.nodeId === node.id && current.state === "clicked" ? null : current));
    }, 160);
    executeStaticButtonAction(node);
  
  };
}
