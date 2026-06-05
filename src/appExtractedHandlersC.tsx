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

export function createAddRoutingNodesForConnectionEdge(ctx: AppRuntimeContext) {
  return (edge: Edge, sourceNodes: ModelNode[], scopedNodes: Map<string, ModelNode>) => {
    const { nodeForRoutingList, visibleNodeSpatialIndex } = ctx;
    const source = nodeForRoutingList(sourceNodes, edge.sourceId);
    const target = nodeForRoutingList(sourceNodes, edge.targetId);
    if (!source || !target) {
      return;
    }
    const sourcePoint = getModelEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
    const targetPoint = getModelEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
    const padding = 512;
    const searchBounds = {
      left: Math.min(sourcePoint.x, targetPoint.x) - padding,
      right: Math.max(sourcePoint.x, targetPoint.x) + padding,
      top: Math.min(sourcePoint.y, targetPoint.y) - padding,
      bottom: Math.max(sourcePoint.y, targetPoint.y) + padding
    };
    scopedNodes.set(source.id, source);
    scopedNodes.set(target.id, target);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (!scopedNodes.has(node.id)) {
        scopedNodes.set(node.id, node);
      }
    }
  
  };
}

export function createBuildMultiNodeDragOverlayPreview(ctx: AppRuntimeContext) {
  return (dragNodeIds: string[], affectedEdgesForDrag: Edge[], originalPositionsForDrag: Record<string, Point>, originalRoutePointsForDrag: Record<string, Point[]>, movingEdgeIds: Iterable<string> = []): MultiNodeDragOverlayPreview => {
    const { colorDisplayMode, colorPalette, nodeById, nodeHasUprightBoundsContent, visibleEdgeIdSet, visibleNodeIdSet } = ctx;
    const movingNodeIdSet = new Set(dragNodeIds);
    const movingEdgeIdSet = new Set(movingEdgeIds);
    const movingBusNodeIdSet = new Set(
      dragNodeIds.filter((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && isBusNode(node);
      })
    );
    const useSimplifiedOverlay = dragNodeIds.length > CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT;
    const simplifiedNodeMarkup: string[] = [];
    const simplifiedEdgeMarkup: string[] = [];
    let bounds: RenderViewportBounds | null = null;
    const includePoint = (point: Point) => {
      bounds = bounds
        ? {
            left: Math.min(bounds.left, point.x),
            right: Math.max(bounds.right, point.x),
            top: Math.min(bounds.top, point.y),
            bottom: Math.max(bounds.bottom, point.y)
          }
        : { left: point.x, right: point.x, top: point.y, bottom: point.y };
    };
    const includeBox = (box: RenderViewportBounds) => {
      includePoint({ x: box.left, y: box.top });
      includePoint({ x: box.right, y: box.bottom });
    };
    for (const nodeId of dragNodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = originalPositionsForDrag[nodeId] ?? node?.position;
      if (!node || !originalPosition || !visibleNodeIdSet.has(node.id)) {
        continue;
      }
      const includeUprightContentInBounds = nodeHasUprightBoundsContent(node);
      includeBox(nodeVisualInteractionBounds(node, originalPosition, 0, includeUprightContentInBounds));
      if (useSimplifiedOverlay) {
        const nodeIsBus = isBusNode(node);
        const transform = `translate(${formatSvgNumber(originalPosition.x)} ${formatSvgNumber(originalPosition.y)}) ${nodeGeometryTransform(node)}`;
        const fill = node.params.backgroundColor || "#ffffff";
        const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
        const strokeWidth = Math.max(2, getDeviceStrokeWidth(node));
        simplifiedNodeMarkup.push(
          `<rect class="multi-node-drag-preview-node-lite${nodeIsBus ? " bus-node" : ""}" transform="${escapeXml(transform)}" x="${formatSvgNumber(-node.size.width / 2)}" y="${formatSvgNumber(-node.size.height / 2)}" width="${formatSvgNumber(node.size.width)}" height="${formatSvgNumber(node.size.height)}" rx="${nodeIsBus ? 0 : 6}" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}"><title>${escapeXml(node.name)}</title></rect>`
        );
      }
    }
    const edgeRoutes: MultiNodeDragOverlayPreview["edgeRoutes"] = [];
    const dynamicEdgePreviewEdges: Edge[] = [];
    for (const edge of affectedEdgesForDrag) {
      if (!visibleEdgeIdSet.has(edge.id)) {
        continue;
      }
      const edgeMovesWithDraggedGraphics =
        movingEdgeIdSet.has(edge.id) || (movingNodeIdSet.has(edge.sourceId) && movingNodeIdSet.has(edge.targetId));
      if (
        !edgeMovesWithDraggedGraphics &&
        dynamicEdgePreviewEdges.length < CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT &&
        (movingNodeIdSet.has(edge.sourceId) || movingNodeIdSet.has(edge.targetId))
      ) {
        dynamicEdgePreviewEdges.push(edge);
      }
      if (!edgeMovesWithDraggedGraphics) {
        continue;
      }
      const points = originalRoutePointsForDrag[edge.id];
      if (!points?.length) {
        continue;
      }
      for (const point of points) {
        includePoint(point);
      }
      const path = pointsToPreviewPath(points);
      if (useSimplifiedOverlay) {
        const color = getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette);
        simplifiedEdgeMarkup.push(
          `<path class="connection-line drag-preview" d="${escapeXml(path)}" style="--connection-color:${escapeXml(color)}"/>`
        );
      } else {
        edgeRoutes.push({ edgeId: edge.id, path });
      }
    }
    const previewBounds = bounds as RenderViewportBounds | null;
    const paddedBounds = previewBounds
      ? {
          left: previewBounds.left - 4,
          right: previewBounds.right + 4,
          top: previewBounds.top - 4,
          bottom: previewBounds.bottom + 4
        }
      : null;
    if (useSimplifiedOverlay && paddedBounds) {
      simplifiedNodeMarkup.push(
        `<rect class="multi-node-drag-bounds-preview" x="${formatSvgNumber(paddedBounds.left)}" y="${formatSvgNumber(paddedBounds.top)}" width="${formatSvgNumber(Math.max(1, paddedBounds.right - paddedBounds.left))}" height="${formatSvgNumber(Math.max(1, paddedBounds.bottom - paddedBounds.top))}"/>`
      );
    }
    return {
      bounds: paddedBounds,
      edgeRoutes,
      dynamicEdgePreviewEdges,
      movedNodeIds: movingNodeIdSet,
      draggedEdgeIds: movingEdgeIdSet,
      movedBusNodeIds: movingBusNodeIdSet,
      simplifiedMarkup: useSimplifiedOverlay
        ? `${simplifiedEdgeMarkup.join("")}${simplifiedNodeMarkup.join("")}`
        : undefined
    };
  
  };
}

export function createRenderSingleTransformRotateOriginGhost(ctx: AppRuntimeContext) {
  return () => {
    const { colorDisplayMode, colorPalette, mode, nodeById, transformDrag, visibleNodeIdSet } = ctx;
    if (!transformDrag || isGroupTransformDrag(transformDrag) || transformDrag.kind !== "rotate" || !transformDrag.previewPoint) {
      return null;
    }
    const node = nodeById.get(transformDrag.nodeId);
    if (!node || !visibleNodeIdSet.has(node.id)) {
      return null;
    }
    const ghostNode = {
      ...node,
      position: { ...transformDrag.originalNode.position },
      rotation: transformDrag.originalNode.rotation,
      scale: transformDrag.originalNode.scale,
      scaleX: transformDrag.originalNode.scaleX,
      scaleY: transformDrag.originalNode.scaleY
    };
    return (
      <g
        className={`node-rotate-origin-ghost ${isBusNode(ghostNode) ? "bus-node" : ""}`}
        transform={`translate(${ghostNode.position.x} ${ghostNode.position.y})`}
      >
        <g className="node-geometry" transform={nodeGeometryTransform(ghostNode)}>
          <rect
            x={-ghostNode.size.width / 2}
            y={-ghostNode.size.height / 2}
            width={ghostNode.size.width}
            height={ghostNode.size.height}
            rx="8"
            className={`node-hitbox ${isBusNode(ghostNode) ? "bus-hitbox" : ""} ${isStaticNode(ghostNode) ? "static-hitbox" : ""}`}
          />
          <MemoDeviceGlyph node={ghostNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
          <MemoDeviceGlyph node={ghostNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
        </g>
      </g>
    );
  
  };
}

export function createRenderTransformRotationTrajectory(ctx: AppRuntimeContext) {
  return () => {
    const { transformDrag } = ctx;
    if (!transformDrag || transformDrag.kind !== "rotate" || !transformDrag.previewPoint) {
      return null;
    }
    const center = isGroupTransformDrag(transformDrag)
      ? transformDrag.center
      : transformDrag.originalNode.position;
    const delta = rotationDeltaBetweenTransformPoints(center, transformDrag.startPoint, transformDrag.previewPoint, false);
    const startPoint = transformDrag.rotationStartPoint ?? transformDrag.startPoint;
    const arcPath = rotationTrajectoryArcPath(center, startPoint, delta);
    const endPoint = rotatePointAround(startPoint, center, delta);
    return (
      <g className="rotation-trajectory">
        <line className="rotation-start-ray" x1={center.x} y1={center.y} x2={startPoint.x} y2={startPoint.y} />
        <line className="rotation-current-ray" x1={center.x} y1={center.y} x2={endPoint.x} y2={endPoint.y} />
        {arcPath && <path className="rotation-trajectory-arc" d={arcPath} />}
        <circle className="rotation-center-dot" cx={center.x} cy={center.y} r="4" />
        <circle className="rotation-current-dot" cx={endPoint.x} cy={endPoint.y} r="5" />
      </g>
    );
  
  };
}

export function createRenderBoundaryBusInternalConnector(ctx: AppRuntimeContext) {
  return (node: ModelNode | undefined, point: Point | undefined, key: string) => {
    if (!node || !point) {
      return null;
    }
    const segment = boundaryBusInternalConnectorSegment(node, point);
    if (!segment) {
      return null;
    }
    return (
      <line
        key={key}
        className="boundary-bus-internal-connector"
        x1={segment.from.x}
        y1={segment.from.y}
        x2={segment.to.x}
        y2={segment.to.y}
        strokeWidth={boundaryBusInternalConnectorStrokeWidth(node, segment)}
        strokeDasharray={svgStrokeDashArray(node.params.strokeStyle)}
      />
    );
  
  };
}

export function createElementTreeItemChildren(ctx: AppRuntimeContext) {
  return (item: ElementTreeItem): ElementTreeChildItem[] => {
    const { libraryTemplateByKind, visibleNodeById } = ctx;
    if (item.kind !== "node") {
      return [];
    }
    const node = visibleNodeById.get(item.id);
    if (!node) {
      return item.children ?? [];
    }
    return buildContainerDeviceParameterViews(node, libraryTemplateByKind.get(node.kind))
      .filter((view) => view.kind === "associated")
      .map<ElementTreeChildItem>((view) => ({
        id: `${node.id}:${view.id}`,
        label: view.label,
        componentType: view.componentType ?? "",
        idx: view.rows.find((row) => row.key === "idx")?.value ?? "",
        name: view.rows.find((row) => row.key === "name")?.value ?? "",
        nameKey: view.relationKeys?.[0] ? containerRelationNameKey(view.relationKeys[0]) : "",
        relationKeys: view.relationKeys ?? [],
        terminalLabels: view.terminalLabels ?? view.rows.find((row) => row.key === "terminals")?.value ?? ""
      }));
  
  };
}

export function createSynchronizePendingBusTerminalsWithGraphStore(ctx: AppRuntimeContext) {
  return (store: GraphStore, affectedBusIds: ReadonlySet<string>) => {
    if (affectedBusIds.size === 0) {
      return null;
    }
    const scopedNodeIds = new Set<string>();
    const scopedEdgeIds = new Set<string>();
    const scopePadding = 16;
    for (const busId of affectedBusIds) {
      const bus = store.nodeMap.get(busId);
      if (!bus || !isBusNode(bus)) {
        continue;
      }
      scopedNodeIds.add(bus.id);
      const busBounds = store.nodeSpatialIndex.nodeBoundsById.get(bus.id);
      if (busBounds) {
        for (const node of queryGraphStoreNodeSpatialIndex(store, {
          left: busBounds.left - scopePadding,
          right: busBounds.right + scopePadding,
          top: busBounds.top - scopePadding,
          bottom: busBounds.bottom + scopePadding
        })) {
          scopedNodeIds.add(node.id);
        }
      }
      for (const edge of store.edgesByNodeId.get(busId) ?? []) {
        scopedEdgeIds.add(edge.id);
        scopedNodeIds.add(edge.sourceId);
        scopedNodeIds.add(edge.targetId);
      }
    }
    if (scopedNodeIds.size === 0) {
      return null;
    }
    const nodeOrderIndex = (node: ModelNode) => store.nodeIndexById.get(node.id) ?? Number.MAX_SAFE_INTEGER;
    const edgeOrderIndex = (edge: Edge) => store.edgeIndexById.get(edge.id) ?? Number.MAX_SAFE_INTEGER;
    const scopedNodes = Array.from(scopedNodeIds)
      .flatMap((nodeId) => {
        const node = store.nodeMap.get(nodeId);
        return node ? [node] : [];
      })
      .sort((first, second) => nodeOrderIndex(first) - nodeOrderIndex(second));
    const scopedEdges = Array.from(scopedEdgeIds)
      .flatMap((edgeId) => {
        const edge = store.edgeMap.get(edgeId);
        return edge ? [edge] : [];
      })
      .sort((first, second) => edgeOrderIndex(first) - edgeOrderIndex(second));
    const synchronized = synchronizeBusTerminalsWithEdges(scopedNodes, scopedEdges, affectedBusIds);
    return {
      scopedNodes,
      scopedEdges,
      synchronized,
      nodeUpdates: synchronized.nodes.filter((node, index) => node !== scopedNodes[index]),
      edgeUpserts: synchronized.edges.filter((edge, index) => edge !== scopedEdges[index])
    };
  
  };
}

export function createSyncCanvasFrameScrollToViewBox(ctx: AppRuntimeContext) {
  return (targetViewBox = viewBoxRef.current, boundsScrollAnchor: CanvasBoundsScrollAnchor | null = null) => {
    const { canvasBoundsRef, canvasFrameRef, canvasHorizontalScrollbarsActiveRef, canvasVerticalScrollbarsActiveRef, clampCanvasNoScrollOffsetPoint, setCanvasFrameScrollPosition, setCanvasNoScrollOffset, skipNextCanvasScrollSyncRef } = ctx;
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const maxLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxTop = Math.max(0, frame.scrollHeight - frame.clientHeight);
    const { left: nextLeft, top: nextTop } = canvasFrameScrollTargetForViewBox({
      targetViewBox,
      canvasBounds: canvasBoundsRef.current,
      maxScrollLeft: maxLeft,
      maxScrollTop: maxTop,
      horizontalScrollbarsActive: canvasHorizontalScrollbarsActiveRef.current,
      verticalScrollbarsActive: canvasVerticalScrollbarsActiveRef.current
    });
    const scrollTarget = boundsScrollAnchor
      ? canvasBoundsScrollSyncTarget({
          anchorScrollLeft: boundsScrollAnchor.left,
          anchorScrollTop: boundsScrollAnchor.top,
          targetScrollLeft: nextLeft,
          targetScrollTop: nextTop,
          maxScrollLeft: maxLeft,
          maxScrollTop: maxTop,
          targetViewBox,
          canvasBounds: canvasBoundsRef.current
        })
      : { left: nextLeft, top: nextTop };
    const useHorizontalBoundsAnchor = Boolean(boundsScrollAnchor && targetViewBox.width >= canvasBoundsRef.current.width - 1);
    const useVerticalBoundsAnchor = Boolean(boundsScrollAnchor && targetViewBox.height >= canvasBoundsRef.current.height - 1);
    const hotzones = boundsScrollAnchor?.visualRect
      ? frame.querySelector<HTMLElement>(".canvas-resize-hotzones")
      : null;
    const hotzoneRect = hotzones?.getBoundingClientRect();
    const visualTarget = boundsScrollAnchor?.visualRect && hotzoneRect
      ? canvasVisualRectScrollTarget({
          desiredRect: boundsScrollAnchor.visualRect,
          currentRect: {
            left: hotzoneRect.left,
            top: hotzoneRect.top,
            width: hotzoneRect.width,
            height: hotzoneRect.height
          },
          currentScrollLeft: frame.scrollLeft,
          currentScrollTop: frame.scrollTop,
          maxScrollLeft: maxLeft,
          maxScrollTop: maxTop,
          affectsX: useHorizontalBoundsAnchor,
          affectsY: useVerticalBoundsAnchor
        })
      : null;
    const syncVisualScrollX = Boolean(visualTarget?.affectsX && maxLeft > 1);
    const syncVisualScrollY = Boolean(visualTarget?.affectsY && maxTop > 1);
    const targetLeft = syncVisualScrollX ? visualTarget!.left : scrollTarget.left;
    const targetTop = syncVisualScrollY ? visualTarget!.top : scrollTarget.top;
    if (Math.abs(frame.scrollLeft - targetLeft) > 1 || Math.abs(frame.scrollTop - targetTop) > 1) {
      setCanvasFrameScrollPosition(frame, targetLeft, targetTop);
      if (syncVisualScrollX || syncVisualScrollY) {
        skipNextCanvasScrollSyncRef.current = true;
      }
    }
    if (visualTarget && ((visualTarget.affectsX && !syncVisualScrollX) || (visualTarget.affectsY && !syncVisualScrollY))) {
      skipNextCanvasScrollSyncRef.current = true;
      setCanvasNoScrollOffset((current) => {
        const next = clampCanvasNoScrollOffsetPoint({
          x: visualTarget.affectsX && !syncVisualScrollX ? current.x - visualTarget.deltaX : current.x,
          y: visualTarget.affectsY && !syncVisualScrollY ? current.y - visualTarget.deltaY : current.y
        });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
  
  };
}

export function createScheduleCanvasVisibleViewBoxUpdate(ctx: AppRuntimeContext) {
  return () => {
    const { canvasBoundsRef, canvasFrameRef, canvasFrameUserScrollRef, canvasFullViewBoxRef, canvasScrollbarsActiveRef, canvasVisibleViewBoxFrameRef, currentViewBoxFromCanvasFrameScroll, setCanvasVisibleViewBox, setViewBox, skipNextCanvasScrollSyncRef, svgRef } = ctx;
    if (canvasVisibleViewBoxFrameRef.current !== null) {
      return;
    }
    canvasVisibleViewBoxFrameRef.current = window.requestAnimationFrame(() => {
      canvasVisibleViewBoxFrameRef.current = null;
      const frame = canvasFrameRef.current;
      const svg = svgRef.current;
      if (!frame || !svg) {
        return;
      }
      const frameScrollWasUserDriven = canvasFrameUserScrollRef.current;
      canvasFrameUserScrollRef.current = false;
      const frameRect = frame.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const fullViewBox = canvasFullViewBoxRef.current;
      const canvasFullyVisible = !canvasScrollbarsActiveRef.current && renderedCanvasFullyFitsFrame(frameRect, svgRect);
      const next = canvasFullyVisible ? fullViewBox : visibleCanvasViewBoxFromRects(frameRect, svgRect, fullViewBox);
      setCanvasVisibleViewBox((current) => (sameCanvasViewBox(current, next) ? current : next));
      if (canvasFullyVisible || !frameScrollWasUserDriven) {
        return;
      }
      const scrolledViewBox = currentViewBoxFromCanvasFrameScroll();
      setViewBox((current) => {
        const nextViewBox = normalizeViewBoxToCanvas({ ...current, x: scrolledViewBox.x, y: scrolledViewBox.y }, canvasBoundsRef.current);
        if (
          Math.round(nextViewBox.x) === Math.round(current.x) &&
          Math.round(nextViewBox.y) === Math.round(current.y)
        ) {
          return current;
        }
        skipNextCanvasScrollSyncRef.current = true;
        return nextViewBox;
      });
    });
  
  };
}

export function createBuildRoutableLinePreviewPath(ctx: AppRuntimeContext) {
  return (placement: RoutableLinePlacementState, point: Point | null, targetPoint: Point | null = null, target: ConnectTarget | null = null) => {
    const { canvasBounds, connectTargetPoint } = ctx;
    if (!placement?.source || !point) {
      return "";
    }
    const sourcePoint = connectTargetPoint(placement.source);
    const endPoint = targetPoint ?? point;
    const route = routeEdgesForStoredRendering(
      compactPreviewNodes(placement.source.node, target?.node),
      [{
        id: "routable-line-device-preview",
        sourceId: placement.source.node.id,
        targetId: target?.node.id ?? "floating-routable-line-target",
        sourceTerminalId: placement.source.terminalId,
        targetTerminalId: target?.terminalId ?? "t1",
        sourcePoint,
        targetPoint: target ? connectTargetPoint(target) : endPoint
      }],
      canvasBounds
    )[0];
    return route?.path ?? pointsToPreviewPath([sourcePoint, endPoint]);
  
  };
}

export function createBuildMovedNodeUpdates(ctx: AppRuntimeContext) {
  return (nodeIds: Iterable<string>, originalPositions: Record<string, Point>, delta: Point, bounds: CanvasBounds = canvasBounds) => {
    const { clampNodePositionToExpandableBounds, nodeById } = ctx;
    const updates: ModelNode[] = [];
    for (const nodeId of nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      updates.push({
        ...node,
        position: clampNodePositionToExpandableBounds(
          node,
          bounds,
          { x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }
        )
      });
    }
    return updates;
  
  };
}

export function createRebuildEdgeUpdatesAfterNodeGeometryChange(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], changedNodeIds: Iterable<string>, currentEdges: Edge[] = edges, preservedEdgeIds = new Set<string>()) => {
    const { canvasBounds, dirtyEdgeIdsAfterMove, edgeListForNodeIds, edges, markRouteEdgesDirty, markStoredRouteEdgesDirty, routingNodesForConnectionEdges } = ctx;
    const changedIds = Array.from(new Set(changedNodeIds));
    if (changedIds.length === 0) {
      return [];
    }
    const localEdges = currentEdges === edges
      ? edgeListForNodeIds(changedIds)
      : currentEdges.filter((edge) => changedIds.includes(edge.sourceId) || changedIds.includes(edge.targetId));
    const rerouteEdges = preservedEdgeIds.size > 0
      ? localEdges.filter((edge) => !preservedEdgeIds.has(edge.id))
      : localEdges;
    if (rerouteEdges.length === 0) {
      return [];
    }
    const routingNodes = routingNodesForConnectionEdges(rerouteEdges, nextNodes, changedIds);
    const nextLocalEdges = rebuildConnectionRoutesForNodes(routingNodes, rerouteEdges, changedIds, canvasBounds, rerouteEdges);
    const dirtyEdgeIds = dirtyEdgeIdsAfterMove(rerouteEdges, nextLocalEdges, changedIds);
    markRouteEdgesDirty(dirtyEdgeIds);
    markStoredRouteEdgesDirty(dirtyEdgeIds);
    if (dirtyEdgeIds.size === 0) {
      return [];
    }
    const previousLocalEdgeById = new Map(rerouteEdges.map((edge) => [edge.id, edge]));
    return nextLocalEdges.filter((edge) => previousLocalEdgeById.get(edge.id) !== edge);
  
  };
}

export function createUndoGraphSnapshotPatchPlan(ctx: AppRuntimeContext) {
  return (store: GraphStore, snapshot: UndoSnapshot): UndoGraphSnapshotPatchPlan => {
    const { canvasHeight, canvasWidth, fullUndoGraphDirtyEdgeIds } = ctx;
    if (
      snapshot.graphSnapshotMode !== "reference" ||
      snapshot.canvasWidth !== canvasWidth ||
      snapshot.canvasHeight !== canvasHeight ||
      snapshot.nodes.length !== store.nodes.length ||
      snapshot.edges.length !== store.edges.length
    ) {
      return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
    }
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const scopedNodeIds = snapshot.graphPatchScope?.nodeIds;
    const scopedEdgeIds = snapshot.graphPatchScope?.edgeIds;
    if (scopedNodeIds || scopedEdgeIds) {
      if (scopedNodeIds) {
        for (const nodeId of scopedNodeIds) {
          const index = store.nodeIndexById.get(nodeId);
          if (index === undefined || snapshot.nodes[index]?.id !== nodeId) {
            return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
          }
          if (store.nodes[index] !== snapshot.nodes[index]) {
            nodeIds.push(nodeId);
          }
        }
      }
      if (scopedEdgeIds) {
        for (const edgeId of scopedEdgeIds) {
          const index = store.edgeIndexById.get(edgeId);
          if (index === undefined || snapshot.edges[index]?.id !== edgeId) {
            return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
          }
          if (store.edges[index] !== snapshot.edges[index]) {
            edgeIds.push(edgeId);
          }
        }
      }
      const dirtyEdgeIds = new Set(edgeIds);
      const changedNodeIds = new Set(nodeIds);
      for (const nodeId of changedNodeIds) {
        for (const edge of store.edgesByNodeId.get(nodeId) ?? []) {
          dirtyEdgeIds.add(edge.id);
        }
      }
      return { mode: "patch", nodeIds, edgeIds, dirtyEdgeIds };
    }
    for (let index = 0; index < snapshot.nodes.length; index += 1) {
      const snapshotNode = snapshot.nodes[index];
      const currentNode = store.nodes[index];
      if (!currentNode || currentNode.id !== snapshotNode.id) {
        return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
      }
      if (currentNode !== snapshotNode) {
        nodeIds.push(snapshotNode.id);
      }
    }
    for (let index = 0; index < snapshot.edges.length; index += 1) {
      const snapshotEdge = snapshot.edges[index];
      const currentEdge = store.edges[index];
      if (!currentEdge || currentEdge.id !== snapshotEdge.id) {
        return { mode: "full", dirtyEdgeIds: fullUndoGraphDirtyEdgeIds(store, snapshot) };
      }
      if (currentEdge !== snapshotEdge) {
        edgeIds.push(snapshotEdge.id);
      }
    }
    const dirtyEdgeIds = new Set(edgeIds);
    const changedNodeIds = new Set(nodeIds);
    for (const nodeId of changedNodeIds) {
      for (const edge of store.edgesByNodeId.get(nodeId) ?? []) {
        dirtyEdgeIds.add(edge.id);
      }
    }
    return { mode: "patch", nodeIds, edgeIds, dirtyEdgeIds };
  
  };
}

export function createAdjustSelectedDisplayLayer(ctx: AppRuntimeContext) {
  return (action: DisplayLayerAction) => {
    const { activeSelectedEdgeIds, activeSelectedNodeIds, nodes, pushUndoSnapshot, requireEditMode, setCanvasSelectionScope, setContextMenu, setNodes, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
    if (!requireEditMode("调整显示层级")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      writeOperationLog("当前没有被选中元件。");
      return;
    }
    const nextNodes = reorderItemsByDisplayLayer(nodes, activeSelectedNodeIds, action);
    if (nextNodes === nodes) {
      writeOperationLog("选中元件显示层级未变化。");
      setContextMenu(null);
      return;
    }
    const actionLabels: Record<DisplayLayerAction, string> = {
      raise: "提升显示层级",
      lower: "降低显示层级",
      front: "顶层显示",
      back: "底层显示"
    };
    pushUndoSnapshot();
    setNodes(nextNodes);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(activeSelectedNodeIds);
    setSelectedEdgeIds(activeSelectedEdgeIds);
    setSelectedEdgeId(activeSelectedEdgeIds[0] ?? "");
    setContextMenu(null);
    writeOperationLog(`${actionLabels[action]}：${activeSelectedNodeIds.length} 个元件`);
  
  };
}

export function createStartModifierSelectionPress(ctx: AppRuntimeContext) {
  return (event: PointerEvent<Element>, target: ModifierSelectionPressTarget = { kind: "blank" }) => {
    const { clampPointToCanvas, lastCanvasPointerRef, lastEdgePointerClickRef, lastRawCanvasPointerRef, resetConnectPreviewState, setConnectSource, setContextMenu, setMarquee, setModifierSelectionPress, setProjectMenu, setRewiring, staticButtonPointerRef, svgRef, updateMouseStatus } = ctx;
    if (event.button !== 0 || !svgRef.current) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const pointer = clampPointToCanvas(rawPointer);
    lastRawCanvasPointerRef.current = rawPointer;
    lastCanvasPointerRef.current = pointer;
    updateMouseStatus(pointer);
    setContextMenu(null);
    setProjectMenu(null);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setMarquee(null);
    lastEdgePointerClickRef.current = null;
    staticButtonPointerRef.current = null;
    setModifierSelectionPress({
      pointerId: event.pointerId,
      startPoint: pointer,
      currentPoint: pointer,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
      target
    });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
    return true;
  
  };
}

export function createSetSelectedNodeLabelDisplayMode(ctx: AppRuntimeContext) {
  return (mode: NodeLabelDisplayMode) => {
    const { activeSelectedNodeIds, commitNodeFootprintUpdates, nodeById, pushUndoSnapshot, requireEditMode, writeOperationLog } = ctx;
    if (!requireEditMode("修改图元标识显示方式")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const updates = activeSelectedNodeIds.flatMap((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node || isStaticNode(node)) {
        return [];
      }
      if (nodeLabelDisplayMode(node) === mode && node.params._labelDisplayMode === mode) {
        return [];
      }
      return [{ ...node, params: { ...node.params, _labelDisplayMode: mode, _labelVisible: mode === "hidden" ? "0" : "1" } }];
    });
    if (updates.length === 0) {
      return;
    }
    const label = NODE_LABEL_DISPLAY_MODES.find((item) => item.value === mode)?.label ?? mode;
    pushUndoSnapshot();
    commitNodeFootprintUpdates(updates);
    writeOperationLog(`设置 ${updates.length} 个图元标识显示方式：${label}`);
  
  };
}

export function createCreateGraphTemplateType(ctx: AppRuntimeContext) {
  return () => {
    const { customGraphTemplateTypes, graphTemplateTypes, persistTemplateLibraryChange, requireEditMode, setCustomGraphTemplateTypes, setExpandedGraphTemplateTypes, setTemplateDraftType, writeOperationLog } = ctx;
    if (!requireEditMode("新增模板类型")) {
      return;
    }
    const rawName = window.prompt("请输入模板类型名称");
    const typeName = normalizeGraphTemplateTypeName(rawName ?? "");
    if (!typeName) {
      return;
    }
    const duplicate = graphTemplateTypes.some((item) => item.toLowerCase() === typeName.toLowerCase());
    if (duplicate) {
      window.alert("模板类型名称重复，请换一个名称。");
      return;
    }
    const nextTypes = [...customGraphTemplateTypes, typeName];
    setCustomGraphTemplateTypes(nextTypes);
    setExpandedGraphTemplateTypes((current) => current.includes(typeName) ? current : [...current, typeName]);
    setTemplateDraftType(typeName);
    persistTemplateLibraryChange({ customGraphTemplateTypes: nextTypes });
    writeOperationLog(`新增模板类型：${typeName}`);
  
  };
}

export function createOpenAddTemplateDialog(ctx: AppRuntimeContext) {
  return () => {
    const { activeGroupById, activeLayerGroups, activeSelectedGroupIds, canAddTemplateFromSelection, customGraphTemplates, graphTemplateTypes, groupExpandedCanvasSelection, requireEditMode, routedEdges, setTemplateDialog, setTemplateDraftName, setTemplateDraftType, templateDraftType, visibleEdges, visibleNodes } = ctx;
    if (!requireEditMode("添加模板")) {
      return;
    }
    if (!canAddTemplateFromSelection) {
      window.alert("请先选中一个图元组合，再添加模板。");
      return;
    }
    const clipboard = buildCanvasClipboard(
      visibleNodes,
      visibleEdges,
      routedEdges,
      groupExpandedCanvasSelection.nodeIds,
      groupExpandedCanvasSelection.edgeIds,
      activeLayerGroups,
      { expandGroups: true }
    );
    const bounds = canvasClipboardBounds(clipboard);
    if (!bounds || (clipboard.nodes.length === 0 && clipboard.edges.length === 0)) {
      window.alert("当前组合没有可保存为模板的图元。");
      return;
    }
    const typeName = graphTemplateTypes.includes(templateDraftType) ? templateDraftType : graphTemplateTypes[0] ?? DEFAULT_GRAPH_TEMPLATE_TYPES[0];
    const selectedGroup = activeGroupById.get(activeSelectedGroupIds[0]);
    setTemplateDialog({
      sourceGroupId: activeSelectedGroupIds[0],
      clipboard: cloneGraphTemplateClipboard(clipboard),
      sourceSize: {
        width: Math.max(1, Math.round(bounds.right - bounds.left)),
        height: Math.max(1, Math.round(bounds.bottom - bounds.top))
      }
    });
    setTemplateDraftType(typeName);
    setTemplateDraftName(uniqueGraphTemplateName(selectedGroup?.name ?? "自定义模板", typeName, customGraphTemplates));
  
  };
}

export function createDropGraphTemplate(ctx: AppRuntimeContext) {
  return (template: GraphTemplate, pointerPosition: Point) => {
    const { activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, markStoredRouteEdgesDirty, nodes, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, requireEditMode, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setDeviceIndexCounters, setGraphArrays, setGroups, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = ctx;
    if (!requireEditMode("放置模板")) {
      return;
    }
    const targetTopLeft = {
      x: pointerPosition.x - template.sourceSize.width / 2,
      y: pointerPosition.y - template.sourceSize.height / 2
    };
    const cloned = cloneCanvasClipboard(
      template.clipboard,
      targetTopLeft,
      () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      window.alert("模板内容为空或包含悬空联络线，无法生成。");
      return;
    }
    if (rejectAutoCanvasExpansionForContent([...nodes, ...cloned.nodes], [...edges, ...cloned.edges])) {
      return;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent(
      [...nodes, ...cloned.nodes],
      [...edges, ...cloned.edges]
    );
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const shiftedClonedNodes = hasCanvasOriginShift(dropOriginShift)
      ? cloned.nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : cloned.nodes;
    const shiftedClonedEdges = hasCanvasOriginShift(dropOriginShift)
      ? cloned.edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : cloned.edges;
    const shiftedPointerPosition = translatePointBy(pointerPosition, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, ...shiftedClonedNodes],
      [...dropSourceEdges, ...shiftedClonedEdges],
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges, shiftedClonedEdges);
    } else {
      markBusTerminalSyncDirtyForEdges(shiftedClonedEdges);
    }
    let nextDeviceIndexCounters = normalizeDeviceIndexCounters(deviceIndexCounters, dropSourceNodes);
    const pasted = shiftedClonedNodes.map((node) => {
      const draftNode = { ...node, layerId: activeLayerId, position: clampNodePositionToBounds(node, dropCanvasBounds, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = shiftedClonedEdges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, dropCanvasBounds) : undefined,
      targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, dropCanvasBounds) : undefined,
      manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, dropCanvasBounds)),
      routePoints: edge.routePoints?.map((point) => clampPointToBounds(point, dropCanvasBounds))
    }));
    const nextNodes = [...dropSourceNodes, ...pasted];
    const nextEdges = [...dropSourceEdges, ...pastedEdges];
    pushUndoSnapshot();
    markStoredRouteEdgesDirty(pastedEdges.map((edge) => edge.id));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setGraphArrays(nextNodes, nextEdges);
    setGroups((current) => normalizeModelGroups([...current, ...cloned.groups], nextNodes, nextEdges));
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(pasted.map((node) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    activateInspectorFromCanvas();
    writeOperationLog(`从模板新增：${template.typeName} / ${template.name}`);
  
  };
}

export function createLocalRouteOptimizationEdges(ctx: AppRuntimeContext) {
  return (previousNodes: ModelNode[], nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: string[], selectedEdgeIds: Set<string>, originalPositions?: Record<string, Point>) => {
    const { boundsForNodeSet, boxesOverlap, routedEdgeById, routedEdgeSpatialIndex } = ctx;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0) {
      return [];
    }
    const currentBounds = boundsForNodeSet(nextNodes, movedIds, undefined, MOVE_ROUTE_LOCAL_SEARCH_PADDING);
    const originalBounds = boundsForNodeSet(previousNodes, movedIds, originalPositions, MOVE_ROUTE_LOCAL_SEARCH_PADDING);
    return candidateEdges.filter((edge) => {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)) {
        return true;
      }
      const route = routedEdgeById.get(edge.id);
      if (!route) {
        return false;
      }
      const routeBounds = routeSpatialIndexRenderBounds(routedEdgeSpatialIndex, edge.id, 8) ?? routeRenderBounds(route, 8);
      return Boolean(
        routeBounds &&
          ((currentBounds && boxesOverlap(routeBounds, currentBounds)) ||
            (originalBounds && boxesOverlap(routeBounds, originalBounds)))
      );
    });
  
  };
}

export function createRoutePointsForMovedEdgesBlockedByStationaryNodes(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: Iterable<string>, baseRoutePoints: DraggingState["originalRoutePoints"], bounds: CanvasBounds = canvasBounds): DraggingState["originalRoutePoints"] => {
    const { routingNodesForConnectionEdges } = ctx;
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const movedCandidateEdges = candidateEdges.filter((edge) => movedIds.has(edge.sourceId) || movedIds.has(edge.targetId));
    if (movedCandidateEdges.length === 0) {
      return baseRoutePoints;
    }
    const routingNodes = routingNodesForConnectionEdges(movedCandidateEdges, nextNodes, movedIds);
    const stationaryNodes = routingNodes.filter((node) => !movedIds.has(node.id));
    if (stationaryNodes.length === 0) {
      return baseRoutePoints;
    }
    const stationaryCandidates = getRouteBlockingCandidates(stationaryNodes);
    const routeByEdgeId = new Map(routeEdgesForStoredRendering(routingNodes, movedCandidateEdges, bounds).map((route) => [route.edgeId, route]));
    let nextRoutePoints = baseRoutePoints;
    for (const edge of movedCandidateEdges) {
      if (baseRoutePoints[edge.id]) {
        continue;
      }
      const route = routeByEdgeId.get(edge.id);
      if (!route) {
        continue;
      }
      const blockers = getRouteBlockingCandidateNodesFromBoxes(route.points, edge, stationaryCandidates);
      if (blockers.length === 0 || !routeIntersectsSpecificNodes(route.points, edge, blockers)) {
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

export function createAdjustEdgesAfterNodeMove(ctx: AppRuntimeContext) {
  return (currentEdges: Edge[], nextNodes: ModelNode[], movedNodeIds: Set<string>, originalEdgePoints: DraggingState["originalEdgePoints"], deltasByNode: Record<string, Point>, originalRoutePoints: DraggingState["originalRoutePoints"] = {}, preserveRouteEdgeIds = new Set<string>(), bounds: CanvasBounds = canvasBounds) => {
    const { allowAutoExpandCanvas, clampEdgeGeometryToExpandableBounds, clampNodePositionToExpandableBounds, hasCanvasOriginShift, leftTopCanvasOriginShiftForContent, manualPointDeltaForEdge, nodeById, nodes, routingNodesForConnectionEdge, sameOptionalPoint, sameOptionalPointList } = ctx;
    const movedBusIds = new Set<string>();
    const movedNextNodeById = new Map<string, ModelNode>();
    for (const movedNodeId of movedNodeIds) {
      const node = nodeById.get(movedNodeId);
      if (node && isBusNode(node)) {
        movedBusIds.add(movedNodeId);
      }
      const delta = deltasByNode[movedNodeId];
      if (node && delta) {
        movedNextNodeById.set(
          movedNodeId,
          { ...node, position: clampNodePositionToExpandableBounds(node, bounds, { x: node.position.x + delta.x, y: node.position.y + delta.y }) }
        );
      }
    }
    const nextNodeForEndpoint = (nodeId: string) => movedNextNodeById.get(nodeId) ?? nodeById.get(nodeId);
    const preserveAffectedRoutesForCanvasOriginShift =
      allowAutoExpandCanvas && hasCanvasOriginShift(leftTopCanvasOriginShiftForContent(Array.from(movedNextNodeById.values())));
    let changed = false;
    const nextEdges = currentEdges.map((edge) => {
      const sourceMoved = movedNodeIds.has(edge.sourceId);
      const targetMoved = movedNodeIds.has(edge.targetId);
      if (!sourceMoved && !targetMoved && !preserveRouteEdgeIds.has(edge.id)) {
        return edge;
      }
      const originalPoints = originalEdgePoints[edge.id];
      const sourceDelta = movedBusIds.has(edge.sourceId) ? deltasByNode[edge.sourceId] : undefined;
      const targetDelta = movedBusIds.has(edge.targetId) ? deltasByNode[edge.targetId] : undefined;
      const manualDelta = manualPointDeltaForEdge(edge, deltasByNode);
      const baseEdge = {
        ...edge,
        sourcePoint: sourceDelta && originalPoints?.sourcePoint
          ? { x: originalPoints.sourcePoint.x + sourceDelta.x, y: originalPoints.sourcePoint.y + sourceDelta.y }
          : edge.sourcePoint,
        targetPoint: targetDelta && originalPoints?.targetPoint
          ? { x: originalPoints.targetPoint.x + targetDelta.x, y: originalPoints.targetPoint.y + targetDelta.y }
          : edge.targetPoint,
        manualPoints: manualDelta && originalPoints?.manualPoints
          ? originalPoints.manualPoints.map((point) => ({ x: point.x + manualDelta.x, y: point.y + manualDelta.y }))
          : edge.manualPoints
      };
      const originalSource = nodeById.get(edge.sourceId);
      const originalTarget = nodeById.get(edge.targetId);
      const nextSource = nextNodeForEndpoint(edge.sourceId);
      const nextTarget = nextNodeForEndpoint(edge.targetId);
      const previousSlideNodes = routingNodesForConnectionEdge(edge, nodes);
      const nextSlideNodes = routingNodesForConnectionEdge(baseEdge, nextNodes);
      const slidePatch =
        sourceMoved !== targetMoved && originalSource && originalTarget && nextSource && nextTarget
          ? resolveStraightBusSlideEndpoint({
              edge: baseEdge,
              sourceNode: originalSource,
              targetNode: originalTarget,
              nextSourceNode: nextSource,
              nextTargetNode: nextTarget,
              movingEndpoint: sourceMoved ? "source" : "target",
              nodes: previousSlideNodes,
              nextNodes: nextSlideNodes
            })
          : null;
      const nextEdgeWithSlide = slidePatch ? { ...baseEdge, ...slidePatch } : baseEdge;
      const originalRoute = originalRoutePoints[edge.id];
      const shouldPreserveRoute = originalRoute?.length && (
        preserveRouteEdgeIds.has(edge.id) ||
        Boolean(edge.manualPoints?.length) ||
        (preserveAffectedRoutesForCanvasOriginShift && (sourceMoved || targetMoved))
      );
      const nextEdge = shouldPreserveRoute && nextSource && nextTarget
        ? (() => {
            const nextStart = getModelEdgeEndpointPoint(nextSource, nextEdgeWithSlide.sourcePoint, nextEdgeWithSlide.sourceTerminalId);
            const nextEnd = getModelEdgeEndpointPoint(nextTarget, nextEdgeWithSlide.targetPoint, nextEdgeWithSlide.targetTerminalId);
            const originalStart = originalRoute[0];
            const originalEnd = originalRoute[originalRoute.length - 1];
            const sourceNormal = getRouteEndpointNormal(nextSource, nextStart, nextEnd, nextEdgeWithSlide.sourceTerminalId);
            const targetNormal = getRouteEndpointNormal(nextTarget, nextEnd, nextStart, nextEdgeWithSlide.targetTerminalId);
            const preservedRoute = preserveDraggedRouteShape({
              routePoints: originalRoute,
              nextStart,
              nextEnd,
              sourceDelta: { x: nextStart.x - originalStart.x, y: nextStart.y - originalStart.y },
              targetDelta: { x: nextEnd.x - originalEnd.x, y: nextEnd.y - originalEnd.y },
              routeDelta: preserveRouteEdgeIds.has(edge.id) ? manualPointDeltaForEdge(edge, deltasByNode) ?? undefined : undefined,
              sourceNormal,
              targetNormal
            });
            return { ...nextEdgeWithSlide, manualPoints: preservedRoute.slice(1, -1).map((point) => ({ ...point })) };
          })()
        : nextEdgeWithSlide;
      const boundedNextEdge = clampEdgeGeometryToExpandableBounds(nextEdge, bounds);
      if (
        sameOptionalPoint(boundedNextEdge.sourcePoint, edge.sourcePoint) &&
        sameOptionalPoint(boundedNextEdge.targetPoint, edge.targetPoint) &&
        sameOptionalPointList(boundedNextEdge.manualPoints, edge.manualPoints)
      ) {
        return edge;
      }
      changed = true;
      return boundedNextEdge;
    });
    return changed ? nextEdges : currentEdges;
  
  };
}

export function createMoveRouteRepairSeedEdges(ctx: AppRuntimeContext) {
  return (candidateEdges: Edge[], movedNodeIds: string[], selectedEdgeIds: Set<string>, originalRoutePoints: DraggingState["originalRoutePoints"] = {}) => {
    const { busNodeIdSet } = ctx;
    if (candidateEdges.length <= MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES) {
      return candidateEdges;
    }
    const movedIds = reuseSetOrCreate(movedNodeIds);
    const movedBusNodeIds = new Set(movedNodeIds.filter((nodeId) => busNodeIdSet.has(nodeId)));
    return candidateEdges.filter((edge) => {
      const sourceMoved = movedIds.has(edge.sourceId);
      const targetMoved = movedIds.has(edge.targetId);
      return (
        selectedEdgeIds.has(edge.id) ||
        Boolean(originalRoutePoints[edge.id]?.length) ||
        Boolean(edge.manualPoints?.length) ||
        (sourceMoved && targetMoved) ||
        movedBusNodeIds.has(edge.sourceId) || movedBusNodeIds.has(edge.targetId)
      );
    });
  
  };
}

export function createLightweightMovedEndpointRoute(ctx: AppRuntimeContext) {
  return (edge: Edge, previousRoute: RoutedEdge, nextNodes: ModelNode[], movedNodeIds: Set<string>, bounds: CanvasBounds): RoutedEdge | null => {
    const { nodeForRoutingList, sameOptionalPointList } = ctx;
    if (previousRoute.points.length < 2) {
      return null;
    }
    const source = nodeForRoutingList(nextNodes, edge.sourceId);
    const target = nodeForRoutingList(nextNodes, edge.targetId);
    if (!source || !target) {
      return null;
    }
    const nextStart = getModelEdgeEndpointPoint(source, edge.sourcePoint, edge.sourceTerminalId);
    const nextEnd = getModelEdgeEndpointPoint(target, edge.targetPoint, edge.targetTerminalId);
    const originalStart = previousRoute.points[0];
    const originalEnd = previousRoute.points[previousRoute.points.length - 1];
    if (!originalStart || !originalEnd) {
      return null;
    }
    const sourceMoved = movedNodeIds.has(edge.sourceId);
    const targetMoved = movedNodeIds.has(edge.targetId);
    if (!sourceMoved && !targetMoved) {
      return null;
    }
    const sourceNormal = getRouteEndpointNormal(source, nextStart, nextEnd, edge.sourceTerminalId);
    const targetNormal = getRouteEndpointNormal(target, nextEnd, nextStart, edge.targetTerminalId);
    const points = preserveDraggedRouteShape({
      routePoints: previousRoute.points,
      nextStart,
      nextEnd,
      sourceDelta: sourceMoved ? { x: nextStart.x - originalStart.x, y: nextStart.y - originalStart.y } : { x: 0, y: 0 },
      targetDelta: targetMoved ? { x: nextEnd.x - originalEnd.x, y: nextEnd.y - originalEnd.y } : { x: 0, y: 0 },
      sourceNormal,
      targetNormal
    }).map((point) => clampPointToBounds(point, bounds));
    const path = pointsToOrthogonalPath(points);
    return sameOptionalPointList(points, previousRoute.points) && path === previousRoute.path
      ? previousRoute
      : { ...previousRoute, points, path };
  
  };
}

export function createPatchCachedRoutesForHighFanoutMove(ctx: AppRuntimeContext) {
  return (previousCandidateEdges: Edge[], committedCandidateEdges: Edge[], movedNodeIds: string[], nextNodes: ModelNode[], bounds: CanvasBounds) => {
    const { cachedRoutedEdgesRef, cachedRouteStoreRef, lightweightMovedEndpointRoute, shouldPatchRouteCacheForHighFanoutMove } = ctx;
    if (!shouldPatchRouteCacheForHighFanoutMove(movedNodeIds, previousCandidateEdges)) {
      return new Set<string>();
    }
    const routeStore = cachedRouteStoreRef.current;
    if (!routeStore || routeStore.routes.length === 0) {
      return new Set<string>();
    }
    const movedIds = new Set(movedNodeIds);
    const committedEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
    const routeUpdates: RoutedEdge[] = [];
    const patchedEdgeIds = new Set<string>();
    for (const previousEdge of previousCandidateEdges) {
      if (!movedIds.has(previousEdge.sourceId) && !movedIds.has(previousEdge.targetId)) {
        continue;
      }
      const edge = committedEdgeById.get(previousEdge.id) ?? previousEdge;
      const previousRoute = routeStore.routeMap.get(edge.id);
      if (!previousRoute) {
        continue;
      }
      const nextRoute = lightweightMovedEndpointRoute(edge, previousRoute, nextNodes, movedIds, bounds);
      if (!nextRoute || nextRoute === previousRoute) {
        continue;
      }
      routeUpdates.push(nextRoute);
      patchedEdgeIds.add(edge.id);
    }
    if (routeUpdates.length === 0) {
      return patchedEdgeIds;
    }
    const patchedRouteStore = routeStorePatchRoutes(routeStore, routeUpdates);
    cachedRouteStoreRef.current = patchedRouteStore;
    cachedRoutedEdgesRef.current = patchedRouteStore.routes;
    return patchedEdgeIds;
  
  };
}

export function createUpdateMouseStatus(ctx: AppRuntimeContext) {
  return (point: Point) => {
    const { lastMouseStatusRef, mousePositionTextRef, mouseStatusFrameRef, pendingMouseStatusRef } = ctx;
    const rounded = { x: Math.round(point.x), y: Math.round(point.y) };
    const previous = lastMouseStatusRef.current;
    if (previous?.x === rounded.x && previous.y === rounded.y) {
      return;
    }
    pendingMouseStatusRef.current = rounded;
    if (mouseStatusFrameRef.current !== null) {
      return;
    }
    mouseStatusFrameRef.current = window.requestAnimationFrame(() => {
      mouseStatusFrameRef.current = null;
      const next = pendingMouseStatusRef.current;
      pendingMouseStatusRef.current = null;
      if (!next) {
        return;
      }
      const latest = lastMouseStatusRef.current;
      if (latest?.x === next.x && latest.y === next.y) {
        return;
      }
      lastMouseStatusRef.current = next;
      if (mousePositionTextRef.current) {
        mousePositionTextRef.current.textContent = `X:${next.x} Y:${next.y}`;
      }
    });
  
  };
}

export function createBuildCachedSingleNodeDragPreviewRoutes(ctx: AppRuntimeContext) {
  return (cache: SingleNodeDragCache | undefined, delta: Point, previewEdges: Edge[]): NodeDragPreviewRoute[] | null => {
    const { shiftPreviewEndpointForDelta, simpleOrthogonalDragPreviewPoints } = ctx;
    if (!cache) {
      return null;
    }
    const routes: NodeDragPreviewRoute[] = [];
    for (const edge of previewEdges) {
      const endpoint = cache.previewEndpointByEdgeId.get(edge.id);
      if (!endpoint) {
        return null;
      }
      const start = shiftPreviewEndpointForDelta(endpoint.start, endpoint.startMoves, delta);
      const end = shiftPreviewEndpointForDelta(endpoint.end, endpoint.endMoves, delta);
      routes.push({
        edgeId: endpoint.edgeId,
        path: pointsToPreviewPath(simpleOrthogonalDragPreviewPoints(start, end)),
        color: endpoint.color
      });
    }
    return routes;
  
  };
}

export function createSyncImperativeNodeDragPreviewPaths(ctx: AppRuntimeContext) {
  return (edgePreview: SVGGElement, routes: NodeDragPreviewRoute[]) => {
    const { imperativeNodeDragEdgePreviewPathRefs } = ctx;
    const pathRefs = imperativeNodeDragEdgePreviewPathRefs.current;
    if (routes.length === 0) {
      for (const path of pathRefs.values()) {
        path.remove();
      }
      pathRefs.clear();
      edgePreview.style.display = "none";
      return;
    }
    const activeEdgeIds = new Set<string>();
    for (const route of routes) {
      activeEdgeIds.add(route.edgeId);
      let path = pathRefs.get(route.edgeId);
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connection-line drag-preview");
        path.setAttribute("data-drag-preview-edge-id", route.edgeId);
        pathRefs.set(route.edgeId, path);
        edgePreview.appendChild(path);
      } else if (path.parentNode !== edgePreview) {
        edgePreview.appendChild(path);
      }
      if (path.getAttribute("d") !== route.path) {
        path.setAttribute("d", route.path);
      }
      if (path.style.getPropertyValue("--connection-color") !== route.color) {
        path.style.setProperty("--connection-color", route.color);
      }
    }
    for (const [edgeId, path] of pathRefs) {
      if (activeEdgeIds.has(edgeId)) {
        continue;
      }
      path.remove();
      pathRefs.delete(edgeId);
    }
    edgePreview.style.display = routes.length > 0 ? "" : "none";
  
  };
}

export function createMultiNodeDragInteractionNodes(ctx: AppRuntimeContext) {
  return (dragState: DraggingState, delta: Point) => {
    const { dragMovedNodeIdSet, singleNodeDragPreviewNodeFor, visibleNodeIdSet, visibleNodeSpatialIndex } = ctx;
    if (!isMultiNodeMoveState(dragState)) {
      return [];
    }
    const movedNodeIds = dragMovedNodeIdSet(dragState);
    if (movedNodeIds.size === 0) {
      return [];
    }
    const padding = Math.max(160, CONNECT_TERMINAL_SNAP_TOLERANCE * 4);
    const snapEdges = dragState.overlayPreview?.dynamicEdgePreviewEdges ?? [];
    const snapMovedNodeIds = new Set<string>();
    if (movedNodeIds.size <= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
      for (const nodeId of dragState.nodeIds) {
        if (movedNodeIds.has(nodeId)) {
          snapMovedNodeIds.add(nodeId);
        }
      }
    } else {
      for (const edge of snapEdges) {
        if (movedNodeIds.has(edge.sourceId)) {
          snapMovedNodeIds.add(edge.sourceId);
        }
        if (movedNodeIds.has(edge.targetId)) {
          snapMovedNodeIds.add(edge.targetId);
        }
        if (snapMovedNodeIds.size >= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
          break;
        }
      }
      for (const nodeId of dragState.nodeIds) {
        if (snapMovedNodeIds.size >= CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT) {
          break;
        }
        if (movedNodeIds.has(nodeId)) {
          snapMovedNodeIds.add(nodeId);
        }
      }
    }
    if (snapMovedNodeIds.size === 0) {
      return [];
    }
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
    for (const nodeId of snapMovedNodeIds) {
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
    for (const nodeId of snapMovedNodeIds) {
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

export function createScheduleConnectPreviewPoint(ctx: AppRuntimeContext) {
  return (point: Point | null) => {
    const { applyConnectPreviewState, connectPreviewFrameRef, connectTargetSnapPoint, findConnectTargetAtPoint, pendingConnectPreviewRef } = ctx;
    pendingConnectPreviewRef.current = { point, ready: false, targetPoint: null, target: null };
    if (connectPreviewFrameRef.current !== null) {
      return;
    }
    connectPreviewFrameRef.current = window.requestAnimationFrame(() => {
      connectPreviewFrameRef.current = null;
      const next = pendingConnectPreviewRef.current;
      pendingConnectPreviewRef.current = null;
      if (!next) {
        return;
      }
      const target = next.point ? findConnectTargetAtPoint(next.point) : null;
      applyConnectPreviewState(
        next.point,
        Boolean(target),
        target ? connectTargetSnapPoint(target) : null,
        target ?? null
      );
    });
  
  };
}

export function createScheduleRewirePreviewPoint(ctx: AppRuntimeContext) {
  return (point: Point, rewiring: Exclude<RewiringState, null>) => {
    const { connectTargetSnapPoint, findRewireTargetAtPoint, pendingRewirePreviewRef, rewirePreviewFrameRef, sameConnectTarget, sameOptionalPoint, setRewiring } = ctx;
    pendingRewirePreviewRef.current = { point, rewiring };
    if (rewirePreviewFrameRef.current !== null) {
      return;
    }
    rewirePreviewFrameRef.current = window.requestAnimationFrame(() => {
      rewirePreviewFrameRef.current = null;
      const next = pendingRewirePreviewRef.current;
      pendingRewirePreviewRef.current = null;
      if (!next) {
        return;
      }
      const target = findRewireTargetAtPoint(next.point, next.rewiring);
      const snappedPreviewPoint = target ? connectTargetSnapPoint(target) : next.point;
      const dropTargetPoint = target ? connectTargetSnapPoint(target) : undefined;
      setRewiring((current) =>
        current && current.edgeId === next.rewiring.edgeId && current.endpoint === next.rewiring.endpoint
          ? sameOptionalPoint(current.previewPoint, snappedPreviewPoint) &&
            sameOptionalPoint(current.dropTargetPoint, dropTargetPoint) &&
            sameConnectTarget(current.dropTarget, target)
            ? current
            : { ...current, previewPoint: snappedPreviewPoint, dropTargetPoint, dropTarget: target ?? undefined }
          : current
      );
    });
  
  };
}

export function createNearestBoundarySafeDelta(ctx: AppRuntimeContext) {
  return (requestedDelta: Point, isSafeDelta: (delta: Point) => boolean, fallbackDelta: Point = { x: 0, y: 0 }): Point => {
    if (isSafeDelta(requestedDelta)) {
      return requestedDelta;
    }
    const safeFallback = isSafeDelta(fallbackDelta) ? fallbackDelta : { x: 0, y: 0 };
    if (!isSafeDelta(safeFallback)) {
      return safeFallback;
    }
    let low = safeFallback;
    let high = requestedDelta;
    for (let index = 0; index < 12; index += 1) {
      const middle = {
        x: (low.x + high.x) / 2,
        y: (low.y + high.y) / 2
      };
      if (isSafeDelta(middle)) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return { x: Math.round(low.x), y: Math.round(low.y) };
  
  };
}

export function createComputeSmartAlignmentSnap(ctx: AppRuntimeContext) {
  return (dragState: DraggingState, movementDelta: Point, axisLocked: boolean) => {
    const { canvasScrollScaleRef, canvasVisibleViewBoxRef, dragBoundsForSmartAlignment, isEditMode, nodeHasUprightBoundsContent, terminalOutflowAnchorsForSmartAlignmentDrag, viewBoxRef, visibleNodeSpatialIndex } = ctx;
    if (axisLocked || !isEditMode || dragState.nodeIds.length === 0) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const draggedBounds = dragBoundsForSmartAlignment(dragState, movementDelta);
    if (!draggedBounds) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const visible = canvasVisibleViewBoxRef.current.width > 0 && canvasVisibleViewBoxRef.current.height > 0
      ? canvasVisibleViewBoxRef.current
      : viewBoxRef.current;
    const snapThreshold = SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE / Math.max(0.2, Math.max(canvasScrollScaleRef.current.x, canvasScrollScaleRef.current.y));
    const verticalSearchBounds: RenderViewportBounds = {
      left: draggedBounds.left - snapThreshold,
      right: draggedBounds.right + snapThreshold,
      top: visible.y,
      bottom: visible.y + visible.height
    };
    const horizontalSearchBounds: RenderViewportBounds = {
      left: visible.x,
      right: visible.x + visible.width,
      top: draggedBounds.top - snapThreshold,
      bottom: draggedBounds.bottom + snapThreshold
    };
    const draggedNodeIds = new Set(dragState.nodeIds);
    const candidatesById = new Map<string, SmartAlignmentAxisCandidate>();
    const includeCandidate = (candidate: ModelNode) => {
      if (draggedNodeIds.has(candidate.id) || candidatesById.has(candidate.id)) {
        return;
      }
      candidatesById.set(candidate.id, {
        id: candidate.id,
        bounds: nodeSmartAlignmentBounds(candidate, candidate.position, nodeHasUprightBoundsContent(candidate)),
        anchors: nodeTerminalOutflowSmartAlignmentAnchors(candidate, candidate.position)
      });
    };
    for (const candidate of queryNodeSpatialIndex(visibleNodeSpatialIndex, verticalSearchBounds)) {
      includeCandidate(candidate);
    }
    for (const candidate of queryNodeSpatialIndex(visibleNodeSpatialIndex, horizontalSearchBounds)) {
      includeCandidate(candidate);
    }
    const candidates = Array.from(candidatesById.values());
    if (candidates.length === 0) {
      return { delta: movementDelta, guides: [] as SmartAlignmentGuide[] };
    }
    const draggedTerminalAnchors = terminalOutflowAnchorsForSmartAlignmentDrag(dragState, movementDelta);
    const xSnap = bestSmartAlignmentAxisSnap("x", draggedBounds, draggedTerminalAnchors.x, candidates, snapThreshold);
    const ySnap = bestSmartAlignmentAxisSnap("y", draggedBounds, draggedTerminalAnchors.y, candidates, snapThreshold);
    const guides = [xSnap?.guide, ySnap?.guide].filter((guide): guide is SmartAlignmentGuide => Boolean(guide));
    return {
      delta: {
        x: movementDelta.x + (xSnap?.adjustment ?? 0),
        y: movementDelta.y + (ySnap?.adjustment ?? 0)
      },
      guides
    };
  
  };
}

export function createFinishDraggingMove(ctx: AppRuntimeContext) {
  return (activeDragging: DraggingState | null, snapTarget: NodeTerminalSnapTarget | null, actionLabel: "拖拽" | "移动") => {
    const { adjustEdgesAfterNodeMove, applyCanvasBounds, boundedDeltaForMoveGeometry, buildMovedNodeUpdates, canvasBoundsForMoveDelta, canvasInteractionRef, clearDraggingMoveState, commitFastMovedGraphPatches, commitSafeDeltaForDraggingState, dragDraggedEdgeIdSet, dragMovedBusNodeIdSet, dragMovedNodeIdSet, ensureDraggingUndoSnapshot, finalizeMovedNodeEdgesFast, findMultiNodeDragSnapTargetAtDelta, findSingleNodeDragSnapTargetAtDelta, graphStore, mergeAdjustedCandidateEdges, nextNodesForMovedGraphCommit, nodes, projectListPointerInsideRef, restoreCanvasSelectionSnapshot, routePreserveEdgeIdsForMovedNodes, shouldFinalizeMovedNodeEdgesSynchronously, synchronousEdgeAdjustmentCandidates, writeOperationLog } = ctx;
    if (!activeDragging) {
      return false;
    }
    const delta = commitSafeDeltaForDraggingState(activeDragging);
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      restoreCanvasSelectionSnapshot(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      clearDraggingMoveState();
      return false;
    }
    ensureDraggingUndoSnapshot();
    const dragNodeIds = dragMovedNodeIdSet(activeDragging);
    const dragEdgeIds = dragDraggedEdgeIdSet(activeDragging);
    const dragBusNodeIds = dragMovedBusNodeIdSet(activeDragging);
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
    const releaseSnapTarget = snapTarget ?? (
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
      restoreCanvasSelectionSnapshot(activeDragging.selection);
      canvasInteractionRef.current = true;
      projectListPointerInsideRef.current = false;
      clearDraggingMoveState();
      return false;
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
    restoreCanvasSelectionSnapshot(activeDragging.selection);
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    clearDraggingMoveState();
    const snapText =
      effectiveSnapTarget &&
      finalDelta.x === snappedDelta.x &&
      finalDelta.y === snappedDelta.y
        ? "，端子已吸附"
        : "";
    writeOperationLog(`${actionLabel} ${activeDragging.nodeIds.length} 个图元 (${Math.round(finalDelta.x)}, ${Math.round(finalDelta.y)})${snapText}`);
    return true;
  
  };
}

export function createApplyKeyboardMoveDelta(ctx: AppRuntimeContext) {
  return (requestedDelta: Point, renderPreview = true, logBoundary = true) => {
    const { boundedDeltaForMoveGeometry, boundedDeltaForMultiNodeInteractiveMove, boundedDeltaForNodes, canvasBounds, canvasBoundsForMoveDelta, draggingRef, findMultiNodeDragSnapTargetAtDelta, keyboardMoveActiveKeyDeltasRef, nodeTerminalSnapTargetRef, scheduleKeyboardMoveCommit, setDragging, singleNodeDragRenderState, updateImperativeNodeDragDropHint, updateMultiNodeDragOverlayTransform, updateSingleNodeDragImperativePreview, writeOperationLog } = ctx;
    const activeDragging = draggingRef.current;
    if (activeDragging?.source !== "keyboard") {
      return false;
    }
    const previousDelta = activeDragging.currentDelta ?? { x: 0, y: 0 };
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
    const expandedBounds = multiNodeMove
      ? canvasBounds
      : canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, requestedDelta.x, requestedDelta.y);
    const boundedDelta = multiNodeMove
      ? boundedDeltaForMultiNodeInteractiveMove(activeDragging, requestedDelta)
      : renderPreview
        ? boundedDeltaForNodes(
            activeDragging.nodeIds,
            activeDragging.originalPositions,
            requestedDelta.x,
            requestedDelta.y,
            expandedBounds
          )
        : boundedDeltaForMoveGeometry(
            activeDragging.nodeIds,
            activeDragging.edgeIds,
            activeDragging.affectedEdges,
            activeDragging.originalPositions,
            activeDragging.originalEdgePoints,
            activeDragging.originalRoutePoints,
            requestedDelta.x,
            requestedDelta.y,
            previousDelta,
            expandedBounds
          );
    const multiNodeSnapTarget = multiNodeMove && renderPreview ? findMultiNodeDragSnapTargetAtDelta(activeDragging, boundedDelta) : null;
    const effectiveBoundedDelta = multiNodeSnapTarget
      ? boundedDeltaForMultiNodeInteractiveMove(activeDragging, applyNodeTerminalSnap(boundedDelta, multiNodeSnapTarget))
      : boundedDelta;
    if (effectiveBoundedDelta.x === previousDelta.x && effectiveBoundedDelta.y === previousDelta.y) {
      if (logBoundary) {
        writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      }
      return false;
    }
    const nextDragging = {
      ...activeDragging,
      currentDelta: effectiveBoundedDelta,
      historyCaptured: true
    };
    if (multiNodeMove) {
      draggingRef.current = nextDragging;
      if (renderPreview) {
        nodeTerminalSnapTargetRef.current = multiNodeSnapTarget;
        updateImperativeNodeDragDropHint(multiNodeSnapTarget);
        updateMultiNodeDragOverlayTransform(effectiveBoundedDelta);
      } else {
        nodeTerminalSnapTargetRef.current = null;
        updateImperativeNodeDragDropHint(null);
      }
      return true;
    }
    draggingRef.current = nextDragging;
    if (renderPreview) {
      updateSingleNodeDragImperativePreview(nextDragging, boundedDelta);
      if (!activeDragging.historyCaptured) {
        setDragging(singleNodeDragRenderState(nextDragging));
      }
      if (keyboardMoveActiveKeyDeltasRef.current.size === 0) {
        scheduleKeyboardMoveCommit();
      }
    }
    return true;
  
  };
}

export function createMoveSelection(ctx: AppRuntimeContext) {
  return (dx: number, dy: number) => {
    const { activeSelectedEdgeIds, activeSelectedNodeIds, adjustEdgesAfterNodeMove, applyCanvasBounds, boundedDeltaForMoveGeometry, boundedDeltaForNodes, buildMovedNodeUpdates, busNodeIdSet, canvasBoundsForMoveDelta, canvasSelectionScope, commitFastMovedGraphPatches, displaySelectedEdgeIds, displaySelectedNodeIds, edgeListForNodeIds, finalizeMovedNodeEdgesFast, graphStore, mergeAdjustedCandidateEdges, nextNodesForMovedGraphCommit, nodeById, nodes, pushUndoSnapshot, requireEditMode, routePointsSnapshotForMove, routePreserveEdgeIdsForMovedNodes, shouldFinalizeMovedNodeEdgesSynchronously, snapshotEdgePoints, synchronousEdgeAdjustmentCandidates, undoScopeForGraphPatch, writeOperationLog } = ctx;
    if (!requireEditMode("移动图元")) {
      return;
    }
    const moveNodeIds = canvasSelectionScope === "direct" ? displaySelectedNodeIds : activeSelectedNodeIds;
    const moveEdgeIds = canvasSelectionScope === "direct" ? displaySelectedEdgeIds : activeSelectedEdgeIds;
    if (moveNodeIds.length === 0) {
      return;
    }
    const originalPositions = Object.fromEntries(
      moveNodeIds.flatMap((id) => {
        const node = nodeById.get(id);
        return node ? [[id, node.position]] : [];
      })
    );
    const affectedEdgesForMove = edgeListForNodeIds(moveNodeIds, moveEdgeIds);
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForMove);
    const originalRoutePoints = routePointsSnapshotForMove(affectedEdgesForMove, moveNodeIds, moveEdgeIds);
    const movementDelta = { x: dx, y: dy };
    const expandedBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, movementDelta.x, movementDelta.y);
    const boundedDelta = moveNodeIds.length > 1
      ? boundedDeltaForNodes(
          moveNodeIds,
          originalPositions,
          movementDelta.x,
          movementDelta.y,
          expandedBounds
        )
      : boundedDeltaForMoveGeometry(
          moveNodeIds,
          moveEdgeIds,
          affectedEdgesForMove,
          originalPositions,
          originalEdgePoints,
          originalRoutePoints,
          movementDelta.x,
          movementDelta.y,
          undefined,
          expandedBounds
        );
    if (boundedDelta.x === 0 && boundedDelta.y === 0) {
      writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      return;
    }
    pushUndoSnapshot(true, false, undoScopeForGraphPatch(moveNodeIds, affectedEdgesForMove.map((edge) => edge.id)));
    const finalBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, boundedDelta.x, boundedDelta.y);
    applyCanvasBounds(finalBounds);
    const deltasByNode = Object.fromEntries(moveNodeIds.map((id) => [id, boundedDelta]));
    const selected = new Set(moveNodeIds);
    const movedNodeUpdates = buildMovedNodeUpdates(moveNodeIds, originalPositions, boundedDelta, finalBounds);
    const nextNodes = nextNodesForMovedGraphCommit(graphStore, movedNodeUpdates, selected);
    const multiNodeMove = moveNodeIds.length > 1;
    const selectedMoveEdgeIds = new Set(moveEdgeIds);
    const movedBusNodeIds = new Set(moveNodeIds.filter((nodeId) => busNodeIdSet.has(nodeId)));
    const synchronousCandidateEdges = synchronousEdgeAdjustmentCandidates(
      affectedEdgesForMove,
      selected,
      selectedMoveEdgeIds,
      movedBusNodeIds,
      originalRoutePoints
    );
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(affectedEdgesForMove, selected, selectedMoveEdgeIds);
    const adjustedSynchronousEdges = synchronousCandidateEdges.length > 0
      ? adjustEdgesAfterNodeMove(
          synchronousCandidateEdges,
          nextNodes,
          selected,
          originalEdgePoints,
          deltasByNode,
          originalRoutePoints,
          preserveRouteEdgeIds,
          finalBounds
        )
      : synchronousCandidateEdges;
    const adjustedAffectedEdges = mergeAdjustedCandidateEdges(affectedEdgesForMove, adjustedSynchronousEdges);
    const finalizedCandidateEdges = shouldFinalizeMovedNodeEdgesSynchronously(moveNodeIds, adjustedAffectedEdges)
      ? finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          moveNodeIds,
          adjustedAffectedEdges
        )
      : adjustedAffectedEdges;
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      affectedEdgesForMove,
      moveNodeIds,
      originalRoutePoints,
      selectedMoveEdgeIds,
      originalPositions,
      nodes,
      finalBounds
    );
    writeOperationLog(`移动 ${moveNodeIds.length} 个图元 (${Math.round(boundedDelta.x)}, ${Math.round(boundedDelta.y)})`);
  
  };
}

export function createAssignSelectedNodesToModelLayer(ctx: AppRuntimeContext) {
  return (layerId: string) => {
    const { activeSelectedNodeIds, layers, nodeById, nodes, patchGraphNodes, pushUndoSnapshot, requireEditMode, writeOperationLog } = ctx;
    if (!requireEditMode("修改图元所属图层")) {
      return;
    }
    if (activeSelectedNodeIds.length === 0) {
      return;
    }
    const layer = layers.find((item) => item.id === layerId);
    if (!layer) {
      return;
    }
    const selected = new Set(activeSelectedNodeIds);
    const changedCount = nodes.filter((node) => selected.has(node.id) && (node.layerId ?? DEFAULT_MODEL_LAYER_ID) !== layerId).length;
    if (changedCount === 0) {
      return;
    }
    pushUndoSnapshot();
    patchGraphNodes(
      activeSelectedNodeIds.flatMap((nodeId) => {
        const node = nodeById.get(nodeId);
        return node && selected.has(node.id) ? [{ ...node, layerId }] : [];
      })
    );
    writeOperationLog(`修改 ${changedCount} 个图元所属图层为：${layer.name}`);
  
  };
}

export function createCommitCanvasSizeDraft(ctx: AppRuntimeContext) {
  return (draft = canvasSizeDraft) => {
    const { canvasHeight, canvasWidth, edges, nodes, routedEdges, setCanvasSizeDraft, updateCanvasSize, writeOperationLog } = ctx;
    const nextWidth = draft.width.trim() === "" ? canvasWidth : Number(draft.width);
    const nextHeight = draft.height.trim() === "" ? canvasHeight : Number(draft.height);
    const requestedWidth = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth);
    const requestedHeight = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight);
    const requestedRoutes = routeEdgesForStoredRendering(nodes, edges, { width: requestedWidth, height: requestedHeight });
    const currentContentSize = calculateModelContentSize(nodes, edges, routedEdges);
    const requestedContentSize = calculateModelContentSize(nodes, edges, requestedRoutes);
    const contentSize = {
      width: Math.max(currentContentSize.width, requestedContentSize.width),
      height: Math.max(currentContentSize.height, requestedContentSize.height)
    };
    const requiredWidth = clampCanvasDimension(contentSize.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, requestedWidth);
    const requiredHeight = clampCanvasDimension(contentSize.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, requestedHeight);
    const width = Math.max(requestedWidth, requiredWidth);
    const height = Math.max(requestedHeight, requiredHeight);
    if (width !== requestedWidth || height !== requestedHeight) {
      const message = `输入的显示区域小于当前图上内容实际占用范围，已调整为 ${width} x ${height}。`;
      window.alert(message);
      writeOperationLog(message);
    }
    setCanvasSizeDraft({ width: String(width), height: String(height) });
    updateCanvasSize(width, height);
  
  };
}

export function createRenderParamEditor(ctx: AppRuntimeContext) {
  return (key: string, value: string, wrapLabel = true) => {
    const { inspectorSelectedNode, isBrowseMode, selectedNode, updateParam } = ctx;
    const label = PARAM_LABELS[key] ?? key;
    const editorNode = inspectorSelectedNode ?? selectedNode;
    const options = paramOptionsForSection(key, editorNode ? inferESection(editorNode.kind, editorNode.params) : undefined);
    const optionLabels = PARAM_OPTION_LABELS[key] ?? {};
    const control = options ? (
      <select value={value} disabled={isBrowseMode} onChange={(event) => updateParam(key, event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
    ) : (
      <input value={value} disabled={isBrowseMode} onChange={(event) => updateParam(key, event.target.value)} />
    );
    return wrapLabel ? (
      <label key={key}>
        {label}
        {control}
      </label>
    ) : (
      control
    );
  
  };
}

export function createHideAutoPanelsFromWorkspace(ctx: AppRuntimeContext) {
  return () => {
    const { leftPanelMode, projectMenu, projectRecordDragActiveRef, rightPanelMode, schemeRecordDragActiveRef, setLeftPanelAutoVisible, setRightPanelAutoVisible, sidePanelResize, validationPanelResize } = ctx;
    if (sidePanelResize || validationPanelResize) {
      return;
    }
    if (projectRecordDragActiveRef.current) {
      return;
    }
    if (schemeRecordDragActiveRef.current) {
      return;
    }
    if (projectMenu) {
      return;
    }
    if (leftPanelMode === "auto") {
      setLeftPanelAutoVisible(false);
    }
    if (rightPanelMode === "auto") {
      setRightPanelAutoVisible(false);
    }
  
  };
}

export function createStartInteractiveStaticDrawing(ctx: AppRuntimeContext) {
  return (template: DeviceTemplate, startPoint: Point) => {
    const { activateInspectorFromCanvas, clampPointToCanvas, requireEditMode, resetConnectPreviewState, setCanvasSelectionScope, setConnectSource, setContextMenu, setMode, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, writeOperationLog } = ctx;
    if (!requireEditMode("绘制图元")) {
      return;
    }
    const pointer = clampPointToCanvas(startPoint);
    setMode("static-draw");
    setStaticDrawing({
      kind: template.kind,
      template,
      points: [pointer],
      previewPoint: pointer
    });
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    activateInspectorFromCanvas();
    writeOperationLog(`开始绘制图元：${template.label}`);
  
  };
}

export function createFinishInteractiveStaticDrawing(ctx: AppRuntimeContext) {
  return (finalPoint?: Point) => {
    const { activateInspectorFromCanvas, activeLayerId, appendDistinctStaticDrawingPoint, clampPointToCanvas, edges, nodes, pushUndoSnapshot, requireEditMode, setCanvasSelectionScope, setGraphArrays, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setStaticDrawing, staticDrawing, staticDrawingPreviewPoints, writeOperationLog } = ctx;
    if (!requireEditMode("绘制图元")) {
      return;
    }
    if (!staticDrawing) {
      return;
    }
    const points = finalPoint
      ? appendDistinctStaticDrawingPoint(staticDrawing.points, clampPointToCanvas(finalPoint))
      : staticDrawingPreviewPoints(staticDrawing);
    if (points.length < 2) {
      writeOperationLog("绘制图元至少需要两个落点");
      return;
    }
    const node = isStaticBoxLikeKind(staticDrawing.kind)
      ? createStaticBoxNodeFromDrawing(staticDrawing.template, points, activeLayerId)
      : createInteractiveStaticDrawingNode(staticDrawing.template, points, activeLayerId);
    pushUndoSnapshot();
    setGraphArrays([...nodes, node], edges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setStaticDrawing(null);
    setMode("select");
    activateInspectorFromCanvas();
    writeOperationLog(`新增图元：${node.name}`);
  
  };
}

export function createPlaceLibraryDeviceAtPoint(ctx: AppRuntimeContext) {
  return (template: DeviceTemplate, pointerPosition: Point) => {
    const { activateInspectorFromCanvas, activeLayerId, applyCanvasBounds, canvasBounds, canvasBoundsForAutoExpandedGraphContent, canvasBoundsWithOriginShift, deviceIndexCounters, edges, hasCanvasOriginShift, lastCanvasPointerRef, lastRawCanvasPointerRef, leftTopCanvasOriginShiftForContent, markBusTerminalSyncDirtyForEdges, nodes, pushUndoSnapshot, rejectAutoCanvasExpansionForContent, requireEditMode, setCanvasSelectionScope, setDeviceIndexCounters, setGraphArrays, setLibraryPlacement, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, shiftCachedRoutesForCanvasOrigin, startInteractiveStaticDrawing, startLibraryDevicePlacement, translateEdgeBy, translateNodeBy, translatePointBy, writeOperationLog } = ctx;
    if (!requireEditMode("放置图元")) {
      return;
    }
    const kind = template.kind;
    if (isRoutableLineDeviceKind(kind)) {
      startLibraryDevicePlacement(template);
      return;
    }
    if (isInteractiveStaticDrawingKind(kind) || isStaticBoxLikeKind(kind)) {
      startInteractiveStaticDrawing(template, pointerPosition);
      return;
    }
    const position = { x: pointerPosition.x, y: pointerPosition.y };
    const createdNode = { ...createNodeFromTemplate(template, position), layerId: activeLayerId };
    const rawNode = isRoutableLineDeviceKind(createdNode.kind)
      ? routeRoutableLineDevice(createdNode, [...nodes, createdNode], canvasBounds)
      : createdNode;
    if (rejectAutoCanvasExpansionForContent([...nodes, rawNode], edges)) {
      setLibraryPlacement(null);
      setMode("select");
      return;
    }
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, rawNode], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const node = translateNodeBy(rawNode, dropOriginShift);
    const shiftedPointerPosition = translatePointBy(pointerPosition, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForAutoExpandedGraphContent(
      canvasBoundsWithOriginShift(canvasBounds, dropOriginShift),
      [...dropSourceNodes, node],
      dropSourceEdges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(dropCanvasBounds, dropOriginShift);
    shiftCachedRoutesForCanvasOrigin(dropOriginShift);
    if (hasCanvasOriginShift(dropOriginShift)) {
      markBusTerminalSyncDirtyForEdges(dropSourceEdges);
    }
    const placedNode = { ...node, position: clampNodePositionToBounds(node, dropCanvasBounds, shiftedPointerPosition) };
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    const indexed = assignPermanentDeviceIndex(placedNode, deviceIndexCounters);
    pushUndoSnapshot();
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays([...dropSourceNodes, indexed.node], dropSourceEdges);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([indexed.node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    activateInspectorFromCanvas();
    writeOperationLog(`新增图元：${indexed.node.name}`);
  
  };
}

export function createStartCanvasResizeFromLeftOverlay(ctx: AppRuntimeContext) {
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
    const leftEdgeHotspot = Math.max(10, handleHalfWidthCss + 3);
    const insideLeftEdge =
      Math.abs(event.clientX - svgRect.left) <= leftEdgeHotspot &&
      event.clientY >= svgRect.top &&
      event.clientY <= svgRect.bottom;
    if (!insideLeftEdge) {
      return false;
    }
    startCanvasResize(event, "left");
    return true;
  
  };
}

export function createRenderSidePanelModeControls(ctx: AppRuntimeContext) {
  return (side: SidePanelSide) => {
    const { leftPanelMode, rightPanelMode, setSidePanelMode } = ctx;
    const mode = side === "left" ? leftPanelMode : rightPanelMode;
    const label = side === "left" ? "左侧栏" : "右侧栏";
    const options: Array<{ mode: SidePanelMode; title: string; icon: typeof Pin }> = [
      { mode: "pinned", title: `${label}永久显示`, icon: Pin },
      { mode: "auto", title: `${label}自动显示/隐藏`, icon: MousePointer2 },
      { mode: "hidden", title: `${label}永久隐藏`, icon: EyeOff }
    ];
    return (
      <div className="side-panel-mode-controls" role="group" aria-label={`${label}显示模式`}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              type="button"
              key={option.mode}
              className={mode === option.mode ? "active" : ""}
              title={option.title}
              aria-label={option.title}
              onClick={() => setSidePanelMode(side, option.mode)}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    );
  
  };
}

export function createProportionalSignedScaleFromUprightHandleDelta(ctx: AppRuntimeContext) {
  return (drag: SingleTransformDrag, point: Point, baseNode: ModelNode) => {
    const { normalizeScale, signedScale } = ctx;
    const currentSignedScaleX = getNodeScaleX(baseNode);
    const currentSignedScaleY = getNodeScaleY(baseNode);
    const scaleXDeltaRatio = drag.handleXDirection
      ? ((point.x - drag.startPoint.x) * drag.handleXDirection * 2) / Math.max(1, baseNode.size.width)
      : 0;
    const scaleYDeltaRatio = drag.handleYDirection
      ? ((point.y - drag.startPoint.y) * drag.handleYDirection * 2) / Math.max(1, baseNode.size.height)
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

export function createBuildRotateLayoutUnitEdgeUpdates(ctx: AppRuntimeContext) {
  return (units: CanvasLayoutUnit[], currentEdges: Edge[], degrees: number) => {
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
        const points = routePoints.map((point) => rotatePointAround(point, center, degrees));
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

export function createStartGroupMoveDrag(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGRectElement>, unit: CanvasLayoutUnit) => {
    const { activateInspectorFromCanvas, activeLayerNodeIdSet, activeSelectedNodeIds, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clampPointToCanvas, clearNodeDragMoveSchedule, connectSource, createCanvasSelectionSnapshot, dragUndoCapturedRef, edgeListForNodeIds, expandActiveGroupSelection, groupExpandedCanvasSelection, mode, nodeById, requireEditMode, routePointsSnapshotForMove, setCanvasSelectionScope, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, snapshotRouteBounds, startDraggingState, startModifierSelectionPress, svgRef } = ctx;
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || mode === "connect" || connectSource) {
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "selection", nodeIds: unit.nodeIds, edgeIds: unit.edgeIds });
      return;
    }
    if (!requireEditMode("拖拽图元")) {
      return;
    }
    if (unit.nodeIds.length === 0 || unit.nodeIds.some((nodeId) => !activeLayerNodeIdSet.has(nodeId))) {
      return;
    }
    activateInspectorFromCanvas();
    const currentGroupSelectionContainsUnit =
      canvasSelectionScope === "group" && unit.nodeIds.every((nodeId) => activeSelectedNodeIds.includes(nodeId));
    const dragSelection = currentGroupSelectionContainsUnit
      ? {
          nodeIds: groupExpandedCanvasSelection.nodeIds,
          edgeIds: groupExpandedCanvasSelection.edgeIds
        }
      : expandActiveGroupSelection(unit.nodeIds, []);
    setCanvasSelectionScope("group");
    setSelectedNodeIds(dragSelection.nodeIds);
    setSelectedEdgeIds(dragSelection.edgeIds);
    setSelectedEdgeId(dragSelection.edgeIds[0] ?? "");
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const dragNodeIds = dragSelection.nodeIds;
    if (dragNodeIds.length === 0) {
      return;
    }
    const edgeIdsForDrag = dragSelection.edgeIds;
    const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag);
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag);
    const nextDragging: DraggingState = {
      source: "pointer",
      nodeIds: dragNodeIds,
      edgeIds: edgeIdsForDrag,
      affectedEdges: affectedEdgesForDrag,
      startPoint: point,
      originalPositions: originalPositionsForDrag,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForDrag.map((edge) => [
          edge.id,
          {
            sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
            manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
            routePoints: edge.routePoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForDrag),
      singleNodeDragCache: buildSingleNodeDragCache(dragNodeIds, edgeIdsForDrag, affectedEdgesForDrag),
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined,
      selection: createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "")
    };
    startDraggingState(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createFindConnectTargetAtPoint(ctx: AppRuntimeContext) {
  return (point: Point): ConnectTarget | null => {
    const { activeLayerNodeIdSet, busAnchorFromPoint, connectSource, isPointNearBus, visibleNodeById, visibleNodeSpatialIndex } = ctx;
    if (!connectSource) {
      return null;
    }
    const sourceNode = activeLayerNodeIdSet.has(connectSource.nodeId) ? visibleNodeById.get(connectSource.nodeId) : undefined;
    if (!sourceNode) {
      return null;
    }
    const searchBounds = connectTargetSearchBounds(point);
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, searchBounds)) {
      if (isBusNode(node) && isPointNearBus(node, point, CONNECT_BUS_SNAP_TOLERANCE)) {
        const terminalId = node.terminals[0]?.id ?? "t1";
        if (
          !(node.id === sourceNode.id && terminalId === connectSource.terminalId) &&
          canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)
        ) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        if (node.id === sourceNode.id && terminal.id === connectSource.terminalId) {
          continue;
        }
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= CONNECT_TERMINAL_SNAP_TOLERANCE && canConnectTerminals(sourceNode, connectSource.terminalId, node, terminal.id)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  
  };
}

export function createStartRoutableLineFromTerminal(ctx: AppRuntimeContext) {
  return (node: ModelNode, terminalId: string, point?: Point) => {
    const { activeLayerNodeIdSet, applyRoutableLinePreviewState, connectTargetPoint, connectTargetTerminalType, routableLinePlacement, routableLineTemplateTerminalType, setCanvasSelectionScope, setContextMenu, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
    if (!routableLinePlacement || !activeLayerNodeIdSet.has(node.id)) {
      return false;
    }
    const source: ConnectTarget = { node, terminalId, point };
    if (connectTargetTerminalType(source) !== routableLineTemplateTerminalType(routableLinePlacement.template)) {
      return false;
    }
    const nextPlacement: RoutableLinePlacementState = { ...routableLinePlacement, source };
    setRoutableLinePlacement(nextPlacement);
    applyRoutableLinePreviewState(connectTargetPoint(source), null, null, nextPlacement);
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setContextMenu(null);
    setMode("connect");
    writeOperationLog(`线路起点：${node.name}`);
    return true;
  
  };
}

export function createUpdateRoutableLineEndpointDrag(ctx: AppRuntimeContext) {
  return (point: Point) => {
    const { connectTargetPoint, findRoutableLineEndpointTargetAtPoint, nodeById, routableLineEndpointDrag, sameConnectTarget, sameOptionalPoint, setRoutableLineEndpointDrag } = ctx;
    if (!routableLineEndpointDrag) {
      return;
    }
    const lineNode = nodeById.get(routableLineEndpointDrag.nodeId);
    if (!lineNode) {
      return;
    }
    const terminalIndex = routableLineEndpointDrag.endpoint === "source" ? 0 : 1;
    const terminalType = lineNode.terminals[terminalIndex]?.type ?? lineNode.terminals[0]?.type;
    const target = terminalType
      ? findRoutableLineEndpointTargetAtPoint(point, { terminalType, excludedNodeId: lineNode.id })
      : null;
    const snappedPoint = target ? connectTargetPoint(target) : point;
    setRoutableLineEndpointDrag((current) =>
      current && current.nodeId === routableLineEndpointDrag.nodeId && current.endpoint === routableLineEndpointDrag.endpoint
        ? sameOptionalPoint(current.previewPoint, snappedPoint) &&
          sameOptionalPoint(current.dropTargetPoint, target ? snappedPoint : undefined) &&
          sameConnectTarget(current.dropTarget, target)
          ? current
          : {
              ...current,
              previewPoint: snappedPoint,
              dropTargetPoint: target ? snappedPoint : undefined,
              dropTarget: target ?? undefined
            }
        : current
    );
  
  };
}

export function createCommitNewConnectionEdge(ctx: AppRuntimeContext) {
  return (newEdge: Edge, sourceName: string, targetName: string) => {
    const { canvasBounds, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, pushUndoSnapshot, resetConnectPreviewState, routedEdges, routingNodesForConnectionEdge, setCanvasSelectionScope, setConnectSource, setGraphStore, setMode, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, writeOperationLog } = ctx;
    const endpointRuleMessage = connectionEndpointRuleFailureMessage(newEdge);
    if (endpointRuleMessage) {
      window.alert(`联络线绘制失败：${endpointRuleMessage}`);
      writeOperationLog(`联络线绘制失败：${endpointRuleMessage}`);
      return false;
    }
    const prepared = prepareConnectionEdgeForCommit(
      routingNodesForConnectionEdge(newEdge),
      [newEdge],
      newEdge.id,
      canvasBounds,
      routedEdges
    );
    if (!prepared.ok || !prepared.edge) {
      const message = connectionCommitFailureMessage(prepared.issues);
      window.alert(`联络线绘制失败：${message}`);
      writeOperationLog(`联络线绘制失败：${message}`);
      return false;
    }
    const preparedEdge = prepared.edge;
    pushUndoSnapshot();
    markRouteEdgesDirty([preparedEdge.id]);
    markStoredRouteEdgesDirty([preparedEdge.id]);
    markBusTerminalSyncDirtyForEdges([preparedEdge]);
    setGraphStore((current) => graphStoreApplyPatch(current, { edgeUpserts: [preparedEdge] }));
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId(preparedEdge.id);
    setSelectedEdgeIds([preparedEdge.id]);
    setConnectSource(null);
    resetConnectPreviewState();
    setMode("select");
    writeOperationLog(`新增联络线：${sourceName} -> ${targetName}`);
    return true;
  
  };
}

export function createHandleNodePointerDown(ctx: AppRuntimeContext) {
  return (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    const { activateInspectorFromCanvas, activeLayerNodeIdSet, activeSelectedEdgeIds, activeSelectedNodeIds, appendStaticDrawingPoint, applyConnectPreviewState, beginStaticButtonPointerFeedback, buildMultiNodeDragOverlayPreview, buildSingleNodeDragCache, canvasSelectionScope, clampPointToCanvas, clearNodeDragMoveSchedule, connectSource, connectTargetSnapPoint, createCanvasSelectionSnapshot, dragUndoCapturedRef, edgeListForNodeIds, expandActiveGroupSelection, findConnectTargetAtPoint, finishConnectToTarget, groupExpandedCanvasSelection, handleTerminalPointerDown, isBrowseMode, isStaticButtonEnabledForNode, lastCanvasPointerRef, mode, nodeById, resetConnectPreviewState, resolveConnectPreviewPoint, routableLinePlacement, routePointsSnapshotForMove, selectCanvasGraphics, selectedEdgeId, selectedEdgeIds, selectedGroupMemberNodeIdSet, selectedNodeIds, selectedNodeIdSet, setCanvasSelectionScope, setConnectSource, setContextMenu, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, snapshotRouteBounds, startDraggingState, startModifierSelectionPress, staticDrawing, svgRef, updateMouseStatus } = ctx;
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    if (staticDrawing && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    activateInspectorFromCanvas();
    if (isBrowseMode) {
      if (isStaticButtonEnabledForNode(node)) {
        beginStaticButtonPointerFeedback(event, node);
        return;
      }
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setContextMenu(null);
      return;
    }
    if (routableLinePlacement && isBusNode(node)) {
      handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      return;
    }
    if (connectSource && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
      const previewPoint = resolveConnectPreviewPoint(pointer, event);
      const target = findConnectTargetAtPoint(previewPoint);
      applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
      if (target) {
        finishConnectToTarget(target, previewPoint);
      }
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    beginStaticButtonPointerFeedback(event, node);
    const nodeWasSelected = selectedNodeIdSet.has(node.id);
    const clickedSelectedGroupMember =
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.metaKey &&
      nodeWasSelected &&
      selectedGroupMemberNodeIdSet.has(node.id);
    const keepEdgeSelection = nodeWasSelected && activeSelectedEdgeIds.length > 0;
    let dragSelectionSnapshot = createCanvasSelectionSnapshot(
      canvasSelectionScope,
      selectedNodeIds,
      keepEdgeSelection ? selectedEdgeIds : [],
      keepEdgeSelection ? selectedEdgeId : ""
    );
    if (!keepEdgeSelection) {
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
    }
    const groupDragSelection = {
      nodeIds: groupExpandedCanvasSelection.nodeIds,
      edgeIds: groupExpandedCanvasSelection.edgeIds
    };
    let dragSelection = nodeWasSelected
      ? groupDragSelection
      : expandActiveGroupSelection([node.id], []);
    if (clickedSelectedGroupMember) {
      setCanvasSelectionScope("direct");
      setSelectedNodeIds([node.id]);
      setSelectedEdgeIds([]);
      setSelectedEdgeId("");
      dragSelectionSnapshot = createCanvasSelectionSnapshot("direct", [node.id], [], "");
    } else if (event.ctrlKey || event.shiftKey || event.metaKey) {
      setCanvasSelectionScope("group");
      dragSelection = nodeWasSelected
        ? groupDragSelection
        : expandActiveGroupSelection([...activeSelectedNodeIds, node.id], activeSelectedEdgeIds);
      if (!nodeWasSelected) {
        setSelectedNodeIds(dragSelection.nodeIds);
        setSelectedEdgeIds(dragSelection.edgeIds);
        setSelectedEdgeId(dragSelection.edgeIds[0] ?? "");
      }
      dragSelectionSnapshot = createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "");
    } else if (!nodeWasSelected) {
      dragSelection = expandActiveGroupSelection([node.id], []);
      setCanvasSelectionScope("group");
      setSelectedNodeIds(dragSelection.nodeIds);
      setSelectedEdgeIds(dragSelection.edgeIds);
      setSelectedEdgeId(dragSelection.edgeIds[0] ?? "");
      dragSelectionSnapshot = createCanvasSelectionSnapshot("group", dragSelection.nodeIds, dragSelection.edgeIds, dragSelection.edgeIds[0] ?? "");
    }
    const dragNodeIds = dragSelection.nodeIds;
    if (mode === "connect") {
      if (isBusNode(node)) {
        handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      }
      return;
    }
    if (connectSource && isBusNode(node)) {
      handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0]?.id ?? "t1");
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (dragNodeIds.length === 0) {
      return;
    }
    const edgeIdsForDrag = dragSelection.edgeIds;
    const affectedEdgesForDrag = edgeListForNodeIds(dragNodeIds, edgeIdsForDrag);
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = routePointsSnapshotForMove(affectedEdgesForDrag, dragNodeIds, edgeIdsForDrag);
    const nextDragging: DraggingState = {
      source: "pointer",
      nodeIds: dragNodeIds,
      edgeIds: edgeIdsForDrag,
      affectedEdges: affectedEdgesForDrag,
      startPoint: point,
      originalPositions: originalPositionsForDrag,
      originalEdgePoints: Object.fromEntries(
        affectedEdgesForDrag.map((edge) => [
          edge.id,
          {
            sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
            manualPoints: edge.manualPoints?.map((point) => ({ ...point })),
            routePoints: edge.routePoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      originalRouteBounds: snapshotRouteBounds(originalRoutePointsForDrag),
      singleNodeDragCache: buildSingleNodeDragCache(dragNodeIds, edgeIdsForDrag, affectedEdgesForDrag),
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined,
      selection: dragSelectionSnapshot
    };
    startDraggingState(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  
  };
}

export function createReadjustMovedBusConnectionRoutes(ctx: AppRuntimeContext) {
  return (nextNodes: ModelNode[], candidateEdges: Edge[], movedNodeIds: Iterable<string>, bounds: CanvasBounds) => {
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size === 0 || candidateEdges.length === 0) {
      return candidateEdges;
    }
    const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
    const busConnectedEdgeIds: string[] = [];
    for (const edge of candidateEdges) {
      if (!(movedIds.has(edge.sourceId) || movedIds.has(edge.targetId))) {
        continue;
      }
      const source = nextNodeById.get(edge.sourceId);
      const target = nextNodeById.get(edge.targetId);
      if (!source || !target || (!isBusNode(source) && !isBusNode(target))) {
        continue;
      }
      busConnectedEdgeIds.push(edge.id);
    }
    return busConnectedEdgeIds.length > 0
      ? redrawConnectionRoutesForEdges(nextNodes, candidateEdges, busConnectedEdgeIds, bounds)
      : candidateEdges;
  
  };
}

export function createAutoSpreadCanvasGraphics(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerEdges, activeLayerGroups, activeLayerNodes, canvasBounds, commitLayoutNodePositions, nodes, requireEditMode, routedEdges, writeOperationLog } = ctx;
    if (!requireEditMode("自动散开")) {
      return;
    }
    const activeNodeIds = activeLayerNodes.map((node) => node.id);
    if (activeNodeIds.length < 2) {
      writeOperationLog("自动散开需要至少 2 个可操作图元");
      return;
    }
    const layoutUnits = buildCanvasLayoutUnits(
      activeLayerGroups,
      activeLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges
    );
    if (layoutUnits.length < 2) {
      writeOperationLog("自动散开没有发现可调整的图元");
      return;
    }
    const arranged = autoSpreadNodeLayoutUnits(nodes, layoutUnits, { padding: 4, bounds: canvasBounds });
    const movedCount = commitLayoutNodePositions(
      Array.from(new Set(layoutUnits.flatMap((unit) => unit.nodeIds))),
      arranged
    );
    writeOperationLog(movedCount > 0 ? `自动散开 ${movedCount} 个图元` : "自动散开未发现重叠图元");
  
  };
}

export function createAutoAlignCanvasGraphics(ctx: AppRuntimeContext) {
  return () => {
    const { activeLayerEdges, activeLayerGroups, activeLayerNodes, commitLayoutNodePositions, nodes, requireEditMode, routedEdges, writeOperationLog } = ctx;
    if (!requireEditMode("自动对齐")) {
      return;
    }
    const activeNodeIds = activeLayerNodes.map((node) => node.id);
    if (activeNodeIds.length < 2) {
      writeOperationLog("自动对齐需要至少 2 个可操作图元");
      return;
    }
    const rawThreshold = window.prompt(
      `请输入自动对齐判定门槛（${AUTO_ALIGN_MIN_THRESHOLD_PX}-${AUTO_ALIGN_MAX_THRESHOLD_PX}px）`,
      String(AUTO_ALIGN_DEFAULT_THRESHOLD_PX)
    );
    if (rawThreshold === null) {
      return;
    }
    const parsedThreshold = Number.parseFloat(rawThreshold.trim());
    if (!Number.isFinite(parsedThreshold)) {
      writeOperationLog("自动对齐判定门槛无效");
      return;
    }
    const threshold = Math.max(AUTO_ALIGN_MIN_THRESHOLD_PX, Math.min(AUTO_ALIGN_MAX_THRESHOLD_PX, Math.round(parsedThreshold)));
    const layoutUnits = buildCanvasLayoutUnits(
      activeLayerGroups,
      activeLayerNodes,
      activeNodeIds,
      [],
      activeLayerEdges,
      routedEdges
    );
    if (layoutUnits.length < 2) {
      writeOperationLog("自动对齐没有发现可调整的图元");
      return;
    }
    const arranged = autoAlignNodeLayoutUnits(nodes, layoutUnits, threshold);
    const movedCount = commitLayoutNodePositions(
      Array.from(new Set(layoutUnits.flatMap((unit) => unit.nodeIds))),
      arranged,
      { readjustBusEndpoints: true }
    );
    writeOperationLog(movedCount > 0 ? `自动对齐 ${movedCount} 个图元，门槛 ${threshold}px` : `自动对齐未发现坐标相近图元，门槛 ${threshold}px`);
  
  };
}

export function createDefaultVoltageBaseSetValue(ctx: AppRuntimeContext) {
  return () => {
    const { activeSelectedNodeIds, nodeById } = ctx;
    for (const nodeId of activeSelectedNodeIds) {
      const node = nodeById.get(nodeId);
      if (!node) {
        continue;
      }
      const candidates = [
        node.terminals[0]?.vbase,
        node.params.vbase,
        node.params.highVbase,
        node.params.sourceVbase,
        node.params.i_vbase,
        node.params.v_set,
        node.params.ac_v_set,
        node.params.dc_v_set,
        node.params.voltage
      ];
      for (const candidate of candidates) {
        const normalized = normalizeVoltageBaseInput(candidate);
        if (normalized) {
          return normalized;
        }
      }
    }
    return "110";
  
  };
}

export function createConnectionRedrawEdgeIdsForScope(ctx: AppRuntimeContext) {
  return (scope: ConnectionRedrawScope) => {
    const { activeLayerEdgeIdSet, activeLayerEdges, activeSelectedEdgeIds, connectionRedrawViewportBounds, routedEdgeSpatialIndex } = ctx;
    if (scope === "selected") {
      return activeSelectedEdgeIds.filter((edgeId, index, list) =>
        activeLayerEdgeIdSet.has(edgeId) && list.indexOf(edgeId) === index
      );
    }
    if (scope === "all") {
      return activeLayerEdges.map((edge) => edge.id);
    }

    const viewportBounds = connectionRedrawViewportBounds();
    const edgeIds: string[] = [];
    const seenEdgeIds = new Set<string>();
    for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, viewportBounds)) {
      if (seenEdgeIds.has(route.edgeId) || !activeLayerEdgeIdSet.has(route.edgeId)) {
        continue;
      }
      seenEdgeIds.add(route.edgeId);
      edgeIds.push(route.edgeId);
    }
    return edgeIds;
  
  };
}

export function createLoadSavedProject(ctx: AppRuntimeContext) {
  return (project: SavedProjectRecord, schemeId = findSchemeForProject(project.id)?.id ?? "") => {
    const { cachedRoutedEdgesRef, canvasFrameRef, clearNodeDragMoveSchedule, deferredMoveOptimizationCancelRef, draggingRef, dragUndoCapturedRef, hideImperativeMultiNodeDragOverlay, lastBusTerminalSyncEndpointRevisionRef, pendingBusTerminalSyncNodeIdsRef, pendingRouteEdgeIdsRef, pendingStoredRouteEdgeIdsRef, requestCanvasFrameCenter, resetConnectPreviewState, resolveConfiguredBackgroundLayerIds, selectSingleProject, setActiveLayerId, setActiveProjectKey, setActiveSchemeKey, setAllowAutoExpandCanvas, setBackgroundLayerIds, setBackgroundProjectId, setCanvasBackgroundColor, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasHeight, setCanvasPanning, setCanvasSelectionScope, setCanvasVisibleViewBox, setCanvasWidth, setConnectSource, setCurrentUnit, setDeviceIndexCounters, setDragging, setGraphArrays, setGroups, setHasUnsavedChanges, setLayers, setManualPathDrag, setMarquee, setMeasurements, setModifierSelectionPress, setPowerBaseValue, setPowerUnit, setProjectName, setRewiring, setRouteRenderingReady, setSavedRouteCrossingArcsReady, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, setTopology, setTopologyErrors, setTopologyStatus, setTransformDrag, setUndoStack, setViewBox, setVoltageUnit, suppressNextGraphDirtyRef, writeOperationLog } = ctx;
    clearRefreshRecoveryProject();
    const normalizedNodes = project.project.nodes.map(normalizeNodeTerminalsByTemplate);
    const indexed = assignMissingDeviceIndexes(normalizedNodes, project.project.deviceIndexCounters);
    const lockedProject = lockProjectEdgeTerminals({
      ...project.project,
      nodes: indexed.nodes
    });
    const layeredProject = normalizeProjectLayers(lockedProject);
    const nextCanvasBounds = {
      width: project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
      height: project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT
    };
    const repairedNodes = repairUnsafeRoutableLineDeviceRoutes(layeredProject.nodes, nextCanvasBounds);
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
    hideImperativeMultiNodeDragOverlay();
    dragUndoCapturedRef.current = false;
    cachedRoutedEdgesRef.current = [];
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
    lastBusTerminalSyncEndpointRevisionRef.current = -1;
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    suppressNextGraphDirtyRef.current = true;
    setUndoStack([]);
    setProjectName(project.name);
    setCanvasWidth(nextCanvasBounds.width);
    setCanvasHeight(nextCanvasBounds.height);
    setAllowAutoExpandCanvas(project.project.allowAutoExpandCanvas ?? true);
    setCanvasBackgroundColor(project.project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage(project.project.canvasBackgroundImage ?? "");
    setCanvasBackgroundImageAssetId(project.project.canvasBackgroundImageAssetId ?? "");
    setBackgroundProjectId(project.project.backgroundProjectId ?? "");
    setBackgroundLayerIds(resolveConfiguredBackgroundLayerIds(project.project.backgroundProjectId, project.project.backgroundLayerIds));
    setPowerUnit(project.project.powerUnit ?? DEFAULT_POWER_UNIT);
    setVoltageUnit(project.project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
    setCurrentUnit(project.project.currentUnit ?? DEFAULT_CURRENT_UNIT);
    setPowerBaseValue(project.project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
    setViewBox(fitWholeCanvasViewBox(nextCanvasBounds, canvasFrameRef.current));
    setCanvasVisibleViewBox(canvasFullViewBoxFromBounds(nextCanvasBounds));
    setLayers(layeredProject.layers ?? []);
    setActiveLayerId(layeredProject.activeLayerId ?? DEFAULT_MODEL_LAYER_ID);
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays(repairedNodes, layeredProject.edges);
    setGroups(normalizeModelGroups(layeredProject.groups, repairedNodes, layeredProject.edges));
    setMeasurements(normalizeProjectMeasurements(project.project.measurements, repairedNodes));
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setSavedRouteCrossingArcsReady(false);
    setActiveProjectKey(project.id);
    setActiveSchemeKey(schemeId);
    selectSingleProject(schemeId, project.id);
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setTerminalPress(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setDragging(null);
    hideImperativeMultiNodeDragOverlay();
    setMarquee(null);
    setModifierSelectionPress(null);
    setCanvasPanning(null);
    setHasUnsavedChanges(false);
    writeOperationLog(`加载模型：${project.name}`);
    requestCanvasFrameCenter();
  
  };
}

export function createCreateBlankProject(ctx: AppRuntimeContext) {
  return (preferredSchemeId = selectedSchemeId || activeSchemeKey || schemes[0]?.id || "") => {
    const { requestLoadSavedProject, requireEditMode, schemes, selectSingleProject, setSchemes, writeOperationLog } = ctx;
    if (!requireEditMode("新建模型")) {
      return;
    }
    const targetScheme = findSavedSchemeById(schemes, preferredSchemeId) ?? schemes[0];
    const targetSchemeId = targetScheme?.id ?? preferredSchemeId;
    const inputName = window.prompt("请输入模型名称", "新建模型");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("模型名称不能为空。");
      return;
    }
    if (targetScheme && hasSameName(name, targetScheme.projects.map((project) => project.name))) {
      window.alert("模型名称重复，无法新建模型。");
      return;
    }
    const record = createSavedProject(name, {
      version: 1,
      name,
      canvasWidth: DEFAULT_CANVAS_WIDTH,
      canvasHeight: DEFAULT_CANVAS_HEIGHT,
      allowAutoExpandCanvas: true,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND,
      powerUnit: DEFAULT_POWER_UNIT,
      voltageUnit: DEFAULT_VOLTAGE_UNIT,
      currentUnit: DEFAULT_CURRENT_UNIT,
      powerBaseValue: DEFAULT_POWER_BASE_VALUE,
      deviceIndexCounters: {},
      nodes: [],
      edges: []
    });
    setSchemes((current) => upsertSavedProjectInScheme(current, targetSchemeId || current[0]?.id || "", record));
    selectSingleProject(targetSchemeId ?? schemes[0]?.id ?? "", record.id);
    requestLoadSavedProject(record, targetSchemeId ?? schemes[0]?.id ?? "");
    writeOperationLog(`新建模型：${record.name}`);
  
  };
}

export function createRunTopologyCalculation(ctx: AppRuntimeContext) {
  return () => {
    const { edges, locateTopologyError, nodes, pushUndoSnapshot, requireEditMode, setNodes, setTopology, setTopologyErrors, setTopologyStatus, skipNextTopologyStaleRef, writeOperationLog } = ctx;
    if (!requireEditMode("执行图上拓扑计算")) {
      return;
    }
    const errors = validateTopology(nodes, edges, { includeVoltageSetpointDeviations: false });
    const blockingErrors = errors.filter(isBlockingTopologyValidationError);
    const nonBlockingWarnings = errors.filter((error) => !isBlockingTopologyValidationError(error));
    setTopologyErrors(errors);
    if (blockingErrors.length === 0) {
      pushUndoSnapshot();
      const calculatedNodes = calculateElectricalTopology(nodes, edges);
      const nextTopology = buildTopology(calculatedNodes, edges);
      const voltageSetpointWarnings = validateVoltageSetpointDeviations(calculatedNodes, edges);
      const nextWarnings = [...nonBlockingWarnings, ...voltageSetpointWarnings];
      skipNextTopologyStaleRef.current = true;
      setNodes(calculatedNodes);
      setTopology(nextTopology);
      setTopologyErrors(nextWarnings);
      if (nextWarnings.length === 0) {
        setTopologyStatus({ state: "success", message: `成功，${nextTopology.connectedComponents.length} 个拓扑岛` });
        writeOperationLog(`图上拓扑成功，${nextTopology.connectedComponents.length} 个拓扑岛`);
        window.alert(topologyCalculationMessage(0));
      } else {
        setTopologyStatus({ state: "failed", message: `完成，${nextWarnings.length} 条告警` });
        writeOperationLog(`图上拓扑完成，${nextWarnings.length} 条告警`);
        locateTopologyError(nextWarnings[0]);
        window.alert(topologyCalculationMessage(nextWarnings.length));
      }
    } else {
      setTopology(EMPTY_TOPOLOGY);
      setTopologyStatus({ state: "failed", message: `失败，${blockingErrors.length} 条阻断错误` });
      writeOperationLog(`图上拓扑失败，${blockingErrors.length} 条阻断错误`);
      locateTopologyError(blockingErrors[0]);
      window.alert(topologyCalculationMessage(blockingErrors.length));
    }
  
  };
}

export function createOpenEdgeContextMenu(ctx: AppRuntimeContext) {
  return (event: MouseEvent<SVGPathElement>, edgeId: string, routePoints?: Point[]) => {
    const { activateInspectorFromCanvas, activeLayerEdgeIdSet, canvasInteractionRef, clampPointToCanvas, lastCanvasPointerRef, lastRawCanvasPointerRef, openGraphicContextMenu, projectListPointerInsideRef, selectCanvasGraphics, svgRef, updateMouseStatus } = ctx;
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      pointer = clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    selectCanvasGraphics([], [edgeId]);
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "edge",
      canvasPoint: pointer,
      edgeId,
      routePoints: routePoints?.map((point) => ({ ...point }))
    });
  
  };
}

export function createFindConnectionRouteHitAtPoint(ctx: AppRuntimeContext) {
  return (point: Point) => {
    const { activeLayerEdgeIdSet, connectionHitTolerance, routedEdgeIndexById, routedEdgeSpatialIndex, routeSegmentPointerDistance } = ctx;
    const tolerance = connectionHitTolerance();
    const hitBounds = {
      left: point.x - tolerance,
      right: point.x + tolerance,
      top: point.y - tolerance,
      bottom: point.y + tolerance
    };
    return queryRouteSpatialIndex(routedEdgeSpatialIndex, hitBounds)
      .filter((route) => activeLayerEdgeIdSet.has(route.edgeId))
      .flatMap((route) =>
        route.points.slice(0, -1).map((from, segmentIndex) => ({
          edgeId: route.edgeId,
          routePoints: route.points,
          distance: routeSegmentPointerDistance(point, from, route.points[segmentIndex + 1]),
          routeOrder: routedEdgeIndexById.get(route.edgeId) ?? -1,
          segmentIndex
        }))
      )
      .filter((candidate) => candidate.distance <= tolerance)
      .sort((first, second) =>
        first.distance - second.distance ||
        second.routeOrder - first.routeOrder ||
        first.segmentIndex - second.segmentIndex
      )[0] ?? null;
  
  };
}

export function createFinishTerminalPress(ctx: AppRuntimeContext) {
  return () => {
    const { busAnchorFromPoint, nodeById, patchSingleTerminalAnchorFromPoint, setTerminalPress, startConnectFromTerminal, terminalPress } = ctx;
    if (!terminalPress) {
      return;
    }
    const node = nodeById.get(terminalPress.nodeId);
    if (!node) {
      setTerminalPress(null);
      return;
    }
    const busPoint = isBusNode(node) ? busAnchorFromPoint(node, terminalPress.startPoint) : undefined;
    if (!terminalPress.moved) {
      startConnectFromTerminal(node, terminalPress.terminalId, busPoint);
      setTerminalPress(null);
      return;
    }
    if (!isBusNode(node) && node.terminals.length === 1) {
      patchSingleTerminalAnchorFromPoint(
        terminalPress.nodeId,
        terminalPress.terminalId,
        terminalPress.currentPoint,
        terminalPress.startPoint
      );
    }
    setTerminalPress(null);
  
  };
}

export function createExportSvg(ctx: AppRuntimeContext) {
  return async () => {
    const { activeLayerId, canvasBackgroundColor, canvasBackgroundImageUrl, canvasBounds, colorDisplayMode, colorPalette, edges, ensureSavedBeforeExport, layers, nodes, projectName, safeFilePart, writeOperationLog } = ctx;
    if (!ensureSavedBeforeExport()) {
      return;
    }
    await saveTextFile({
      filename: `${safeFilePart(projectName)}.svg`,
      text: buildSvgDocument(nodes, edges, {
        ...canvasBounds,
        backgroundColor: canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND,
        backgroundImage: canvasBackgroundImageUrl,
        colorDisplayMode,
        colorPalette,
        layers,
        activeLayerId
      }),
      mime: "image/svg+xml",
      description: "SVG 图形文件",
      extensions: [".svg"]
    });
    writeOperationLog(`导出图形文件：${projectName}.svg`);
  
  };
}

export function createCreateImportedSchemeRecord(ctx: AppRuntimeContext) {
  return (text: string, fileName: string): SavedSchemeRecord => {
    const { isObjectRecord, isProjectFilePayload } = ctx;
    const payload = JSON.parse(text) as unknown;
    const payloadRecord = isObjectRecord(payload) ? payload : null;
    const rawScheme =
      payloadRecord && isObjectRecord(payloadRecord.scheme)
        ? payloadRecord.scheme
        : payloadRecord && Array.isArray(payloadRecord.schemes) && isObjectRecord(payloadRecord.schemes[0])
          ? payloadRecord.schemes[0]
          : payloadRecord;
    if (!rawScheme || !Array.isArray(rawScheme.projects)) {
      throw new Error("方案文件格式不正确。");
    }
    const fileBaseName = fileName.replace(/\.scheme\.json$/i, "").replace(/\.json$/i, "");
    const importedName = typeof rawScheme.name === "string" && rawScheme.name.trim() ? rawScheme.name.trim() : fileBaseName || "导入方案";
    const importedProjects = rawScheme.projects.map((projectPayload, index) => {
      const projectRecord = isObjectRecord(projectPayload) ? projectPayload : null;
      const projectFile = projectRecord && isProjectFilePayload(projectRecord.project)
        ? projectRecord.project
        : isProjectFilePayload(projectPayload)
          ? projectPayload
          : null;
      if (!projectFile) {
        throw new Error(`方案文件中的第 ${index + 1} 个模型格式不正确。`);
      }
      const importedProjectName =
        projectRecord && typeof projectRecord.name === "string" && projectRecord.name.trim()
          ? projectRecord.name.trim()
          : projectFile.name || `导入模型${index + 1}`;
      return createSavedProject(importedProjectName, projectFile);
    });
    const importedChildren: SavedSchemeRecord[] = Array.isArray(rawScheme.children)
      ? rawScheme.children.map((childPayload, index): SavedSchemeRecord => {
          try {
            return createImportedSchemeRecord(JSON.stringify(childPayload), `子方案${index + 1}.json`);
          } catch (error) {
            throw new Error(error instanceof Error ? `子方案${index + 1}：${error.message}` : `子方案${index + 1}格式不正确。`);
          }
        })
      : [];
    return createSavedScheme(importedName, importedProjects, importedChildren);
  
  };
}

export function createImportSchemeFile(ctx: AppRuntimeContext) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
    const { commitImportedSchemeRecord, createImportedSchemeRecord, requireEditMode, schemeImportParentSchemeIdRef, schemes, setPendingSchemeImportConflict } = ctx;
    const input = event.currentTarget;
    if (!requireEditMode("导入方案")) {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedScheme = createImportedSchemeRecord(text, file.name);
      const parentSchemeId = schemeImportParentSchemeIdRef.current;
      const targetSchemes = parentSchemeId ? findSavedSchemeById(schemes, parentSchemeId)?.children ?? [] : schemes;
      const duplicateScheme = targetSchemes.find((scheme) => hasSameName(importedScheme.name, [scheme.name]));
      if (duplicateScheme) {
        setPendingSchemeImportConflict({
          importedScheme,
          importedName: importedScheme.name,
          duplicateSchemeId: duplicateScheme.id,
          duplicateSchemeName: duplicateScheme.name,
          targetParentSchemeId: parentSchemeId
        });
        return;
      }
      commitImportedSchemeRecord(importedScheme, parentSchemeId);
    } catch (error) {
      window.alert(error instanceof Error ? `导入方案失败：${error.message}` : "导入方案失败。");
    } finally {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
    }
  
  };
}

export function createResolveDuplicateSchemeImport(ctx: AppRuntimeContext) {
  return (action: "merge" | "rename" | "cancel") => {
    const { commitImportedSchemeRecord, mergeImportedSchemeIntoExisting, pendingSchemeImportConflict, requireEditMode, schemes, selectSingleScheme, setExpandedSchemeIds, setPendingSchemeImportConflict, setSchemes, writeOperationLog } = ctx;
    const conflict = pendingSchemeImportConflict;
    if (!conflict || action === "cancel") {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (!requireEditMode("处理方案导入冲突")) {
      setPendingSchemeImportConflict(null);
      return;
    }
    const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId);
    const targetParentSchemeId = conflict.targetParentSchemeId ?? "";
    const siblingNames = savedChildSchemeNames(schemes, targetParentSchemeId);
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的方案名称",
        uniqueRecordName(conflict.importedName, siblingNames, "导入方案"),
        siblingNames,
        "方案名称不能为空。",
        "方案名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord({ ...conflict.importedScheme, name: renamed, updatedAt: new Date().toISOString() }, targetParentSchemeId);
      return;
    }
    if (!duplicateScheme) {
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord(conflict.importedScheme, targetParentSchemeId);
      return;
    }
    setPendingSchemeImportConflict(null);
    const mergedScheme = mergeImportedSchemeIntoExisting(duplicateScheme, conflict.importedScheme);
    setSchemes((current) => replaceSavedSchemeById(current, duplicateScheme.id, mergedScheme));
    setExpandedSchemeIds((current) => (current.includes(duplicateScheme.id) ? current : [...current, duplicateScheme.id]));
    selectSingleScheme(duplicateScheme.id);
    writeOperationLog(`合并覆盖导入方案：${duplicateScheme.name}`);
  
  };
}

export function createChooseImage(ctx: AppRuntimeContext) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const { activeImageFolderId, imageTarget, refreshImageFolders, requireEditMode, setImageAssetList, setImageAssets } = ctx;
    if (!requireEditMode("上传图片")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file || !imageTarget) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset;
      try {
        asset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传图片到后台失败。");
        const fallbackId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        saveImageAsset(fallbackId, imageData);
        asset = { id: fallbackId, name: file.name || "本地图片", folderId: activeImageFolderId, url: imageData };
      }
      setImageAssetList((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setImageAssets((current) => ({ ...current, [asset.id]: asset.url }));
      void refreshImageFolders();
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  
  };
}

export function createClearSelectedImage(ctx: AppRuntimeContext) {
  return () => {
    const { imageTarget, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, updateGraphNodeById } = ctx;
    if (!requireEditMode("清除图片")) {
      return;
    }
    if (!imageTarget) {
      return;
    }
    pushUndoSnapshot();
    if (imageTarget.kind === "canvas") {
      setCanvasBackgroundImage("");
      setCanvasBackgroundImageAssetId("");
    } else {
      updateGraphNodeById(imageTarget.nodeId, (node) =>
        imageTarget.kind === "nodeForeground"
          ? {
              ...node,
              params: {
                ...node.params,
                foregroundImage: "",
                foregroundImageAssetId: ""
              }
            }
          : {
              ...node,
              params: {
                ...node.params,
                backgroundImage: "",
                backgroundImageAssetId: ""
              }
            }
      );
    }
    setImageTarget(null);
  
  };
}

export function createUpdateCustomDraftTerminalCount(ctx: AppRuntimeContext) {
  return (value: number) => {
    const { setCustomDeviceDraft } = ctx;
    const count = Math.max(0, Math.min(4, Math.round(value || 0)));
    setCustomDeviceDraft((current) => {
      const fallback = current.attributeLibraryName.includes("直流")
        ? "dc"
        : current.attributeLibraryName.includes("氢")
          ? "h2"
          : current.attributeLibraryName.includes("热")
            ? "heat"
            : "ac";
      const terminalTypes = [...current.terminalTypes];
      while (terminalTypes.length < count) {
        terminalTypes.push(fallback);
      }
      const terminalRoles = [...current.terminalRoles];
      while (terminalRoles.length < count) {
        terminalRoles.push("single-load");
      }
      const terminalAssociations = normalizeContainerTerminalAssociations([...terminalTypes], current.terminalAssociations, count);
      return { ...current, terminalCount: count, terminalTypes, terminalRoles, terminalAssociations, error: "" };
    });
  
  };
}

export function createCreateCustomAttributeLibrary(ctx: AppRuntimeContext) {
  return () => {
    const { attributeLibraries, defaultComponentTypeForAttributeLibrary, nextCustomAttributeLibraryName, requireEditMode, setCustomAttributeLibraries, setCustomComponentTreeSelection, setCustomDeviceDraft, setExpandedAttributeLibraries } = ctx;
    if (!requireEditMode("新建属性库")) {
      return;
    }
    const defaultName = nextCustomAttributeLibraryName();
    const rawName = window.prompt("请输入新属性库名称", defaultName);
    if (rawName === null) {
      return;
    }
    const attributeLibraryName = normalizeAttributeLibraryName(rawName.trim());
    if (!attributeLibraryName) {
      window.alert("属性库名称不能为空。");
      return;
    }
    const existingGroups = new Set(attributeLibraries.map((group) => group.toLowerCase()));
    if (existingGroups.has(attributeLibraryName.toLowerCase())) {
      window.alert("属性库名称已存在，无法新增同名属性库。");
      return;
    }
    setCustomAttributeLibraries((current) => normalizeCustomAttributeLibraries([...current, attributeLibraryName]));
    setExpandedAttributeLibraries((current) => Array.from(new Set([...current, attributeLibraryName])));
    setCustomComponentTreeSelection({ kind: "attributeLibrary", attributeLibraryName });
    setCustomDeviceDraft((current) => ({
      ...current,
      attributeLibraryName,
      componentType: defaultComponentTypeForAttributeLibrary(attributeLibraryName),
      error: ""
    }));
  
  };
}

export function createDeleteCustomComponentType(ctx: AppRuntimeContext) {
  return (targetSection = customDeviceDraft.componentType) => {
    const { customComponentTreeSelection, customDeviceDraft, defaultComponentTypeForAttributeLibrary, libraryTemplates, requireEditMode, setCollapsedCustomComponentTreeTypes, setCustomComponentTreeSelection, setCustomComponentTypes, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setSelectedDefinitionKind } = ctx;
    if (!requireEditMode("删除元件类型")) {
      return;
    }
    const componentType = normalizeComponentTypeName(targetSection);
    if (!componentType || E_SECTION_OPTIONS.some((section) => section.toLowerCase() === componentType.toLowerCase())) {
      window.alert("内置元件类型无法删除。");
      return;
    }
    const templatesWithType = libraryTemplates.filter((template) => template.custom && resolveTemplateComponentType(template).toLowerCase() === componentType.toLowerCase());
    if (templatesWithType.length > 0) {
      const confirmed = window.confirm(`元件类型“${componentType}”下共有 ${templatesWithType.length} 个自定义元件，删除元件类型会同时删除这些元件，是否继续？`);
      if (!confirmed) {
        return;
      }
    }
    const deletedKinds = new Set(templatesWithType.map((template) => template.kind));
    setCustomComponentTypes((current) => current.filter((item) => item.name.toLowerCase() !== componentType.toLowerCase()));
    setCustomDeviceTemplates((current) => current.filter((template) => !deletedKinds.has(template.kind)));
    setSelectedDefinitionKind((current) => (deletedKinds.has(current) ? "" : current));
    setEditingCustomDeviceKind((current) => (deletedKinds.has(current) ? "" : current));
    setCollapsedCustomComponentTreeTypes((current) => current.filter((key) => !key.endsWith(`::${componentType}`)));
    if (deletedKinds.size > 0) {
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of deletedKinds) {
          delete next[kind];
        }
        return next;
      });
    }
    const fallbackAttributeLibraryName = customComponentTreeSelection.kind === "componentType" ? customComponentTreeSelection.attributeLibraryName : customDeviceDraft.attributeLibraryName;
    const fallbackSection = defaultComponentTypeForAttributeLibrary(fallbackAttributeLibraryName);
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName: normalizeAttributeLibraryName(fallbackAttributeLibraryName), section: fallbackSection });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentType: fallbackSection,
      error: ""
    }));
    setDefinitionDraftSection((current) => (current.toLowerCase() === componentType.toLowerCase() ? fallbackSection : current));
  
  };
}

export function createDeleteSelectedCustomDeviceTreeItem(ctx: AppRuntimeContext) {
  return () => {
    const { customComponentTreeSelection, deleteCustomAttributeLibrary, deleteCustomComponentType, libraryTemplateByKind, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceTemplates, setDeviceDefinitionOverrides, setEditingCustomDeviceKind } = ctx;
    if (!requireEditMode("删除元件库条目")) {
      return;
    }
    if (customComponentTreeSelection.kind === "attributeLibrary") {
      deleteCustomAttributeLibrary(customComponentTreeSelection.attributeLibraryName);
      return;
    }
    if (customComponentTreeSelection.kind === "componentType") {
      deleteCustomComponentType(customComponentTreeSelection.section);
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      window.alert("系统内置元件不能在这里删除。");
      return;
    }
    const confirmed = window.confirm(`确认删除元件“${template.label}”？`);
    if (!confirmed) {
      return;
    }
    setCustomDeviceTemplates((current) => current.filter((item) => item.kind !== template.kind));
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[template.kind];
      return next;
    });
    setEditingCustomDeviceKind((current) => current === template.kind ? "" : current);
    setCustomComponentTreeSelection({ kind: "componentType", attributeLibraryName: customComponentTreeSelection.attributeLibraryName, section: customComponentTreeSelection.section });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentName: "",
      error: ""
    }));
  
  };
}

export function createHandleLodNodeContextMenu(ctx: AppRuntimeContext) {
  return (event: MouseEvent<SVGGElement>) => {
    const { activeLayerNodeIdSet, canvasInteractionRef, clampPointToCanvas, connectSource, lastCanvasPointerRef, lodNodeFromEvent, openGraphicContextMenu, projectListPointerInsideRef, resetConnectPreviewState, resetRoutableLinePreviewState, routableLinePlacement, selectCanvasGraphics, selectedNodeIdSet, setConnectSource, setMode, setRoutableLinePlacement, svgRef, updateMouseStatus } = ctx;
    const node = lodNodeFromEvent(event);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    if (svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    if (connectSource) {
      setConnectSource(null);
      resetConnectPreviewState();
      setMode("select");
      return;
    }
    if (routableLinePlacement) {
      setRoutableLinePlacement(null);
      resetRoutableLinePreviewState();
      setMode("select");
      return;
    }
    if (!selectedNodeIdSet.has(node.id)) {
      selectCanvasGraphics([node.id], []);
    }
    openGraphicContextMenu({ x: event.clientX, y: event.clientY, target: "node", nodeId: node.id });
  
  };
}

export function createResolveStaticButtonTargetProject(ctx: AppRuntimeContext) {
  return (node: ModelNode) => {
    const { schemes } = ctx;
    const targetProjectId = node.params.buttonTargetProjectId?.trim();
    if (targetProjectId) {
      for (const scheme of flattenSavedSchemes(schemes)) {
        const project = scheme.projects.find((item) => item.id === targetProjectId);
        if (project) {
          return { scheme, project };
        }
      }
    }
    const targetName = node.params.buttonTargetProjectName?.trim();
    if (targetName) {
      for (const scheme of flattenSavedSchemes(schemes)) {
        const project = scheme.projects.find((item) => item.name.trim() === targetName);
        if (project) {
          return { scheme, project };
        }
      }
    }
    return null;
  
  };
}

export function createExecuteStaticButtonCommand(ctx: AppRuntimeContext) {
  return (command: string) => {
    const { centerSelectedInView, fitViewToSelection, fitWholeCanvasToFrame, resetViewport, runTopologyCalculation, saveCurrentProject, selectedCanvasBounds, zoomViewportAtCenter } = ctx;
    if (command === "save") {
      saveCurrentProject();
      return true;
    }
    if (command === "fitCanvas") {
      fitWholeCanvasToFrame();
      return true;
    }
    if (command === "centerSelected") {
      if (!selectedCanvasBounds) {
        window.alert("当前没有选中图元，无法居中选中。");
        return false;
      }
      centerSelectedInView();
      return true;
    }
    if (command === "fitSelection") {
      if (!selectedCanvasBounds) {
        window.alert("当前没有选中图元，无法缩放到选中区域。");
        return false;
      }
      fitViewToSelection();
      return true;
    }
    if (command === "runTopology") {
      runTopologyCalculation();
      return true;
    }
    if (command === "zoomIn") {
      zoomViewportAtCenter(0.82);
      return true;
    }
    if (command === "zoomOut") {
      zoomViewportAtCenter(1.18);
      return true;
    }
    if (command === "resetZoom") {
      resetViewport();
      return true;
    }
    return false;
  
  };
}
