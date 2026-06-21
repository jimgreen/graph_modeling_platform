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
import { fallbackComponentTypeForAttributeLibrary, resolveTemplateComponentType, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, isReservedDeviceDefinitionParamName, createDefinitionDraftRows, normalizeCustomDeviceTerminalAnchorCoordinate, projectCustomDeviceTerminalAnchorToBoundary, customDeviceTerminalAnchorKey, hasOverlappingCustomDeviceTerminalAnchors, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, createCustomDeviceDraftFromTemplate, createDefinitionVisualDraft, defaultContainerAssociationForTerminalType, isAssociationAllowedForTerminal, normalizeContainerTerminalAssociations, customDefaultDefinitions, generateCustomDeviceImage, customDeviceGeneratedDefaultImageCandidates, syncInheritedCustomDeviceStateVisuals, parseCustomDefinitions, screenToSvgPoint, primaryOrthogonalAxis, constrainPointToOrthogonalAxis } from "../customDeviceUtils";
import { useBatchEditors } from "../hooks/useBatchEditors";

export const ENABLE_REACT_FLOW_PREVIEW = import.meta.env.DEV;

export const ReactFlowPreview = ENABLE_REACT_FLOW_PREVIEW ? lazy(() => import("../ReactFlowPreview")) : null;

export type ToolMode = "select" | "connect" | "static-draw";

export type InteractionMode = "browse" | "edit";

export const INTERACTION_MODE_STORAGE_KEY = "graph-modeling-platform:interaction-mode";

export const CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR = [
  ".diagram-node",
  ".lod-node",
  ".lod-node-layer",
  ".lod-node-selection-layer",
  ".connection-group",
  ".edge-endpoint-handle",
  ".manual-segment-handle",
  ".manual-bend-handle",
  ".transform-handles",
  ".group-selection-overlay",
  ".group-selection-hitbox",
  ".group-selection-outline",
  ".scale-handle",
  ".rotate-handle",
  ".canvas-resize-handles",
  ".node-device-label",
  ".node-label-rotate-control",
  ".measurement-group",
  ".terminal-dot",
  ".canvas-floating-toolbar"
].join(", ");

export const CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR = [
  ".floating-side-panel",
  ".side-panel-edge-trigger",
  "[role=\"dialog\"]",
  ".image-picker-backdrop",
  ".context-menu",
  ".topbar-dropdown-menu"
].join(", ");

export const CANVAS_KEYBOARD_BLOCKING_SELECTOR = [
  ".canvas-floating-toolbar",
  ".library-panel",
  ".inspector-panel",
  ".floating-side-panel",
  ".side-panel-edge-trigger",
  "[role=\"dialog\"]",
  "[class*='-dialog']",
  ".image-picker-backdrop",
  ".context-menu",
  ".topbar-dropdown-menu",
  ".viewport-controls",
  ".canvas-minimap",
  ".topology-warning-floating-panel"
].join(", ");

export const CANVAS_KEYBOARD_SURFACE_SELECTOR = ".diagram-canvas, .canvas-scroll-surface";

export function normalizeInteractionMode(value: unknown): InteractionMode {
  return value === "edit" ? "edit" : "browse";
}

export function isCanvasGraphicContextMenuTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR));
}

export function isCanvasWheelZoomExcludedTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return Boolean(element?.closest(CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR));
}

export function canvasWheelTargetIsRenderedCanvas(target: EventTarget | null) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return Boolean(element?.closest(".diagram-canvas"));
}

export function isCanvasKeyboardBlockingTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return Boolean(element?.closest(CANVAS_KEYBOARD_BLOCKING_SELECTOR));
}

export function readStoredInteractionMode(): InteractionMode {
  if (typeof window === "undefined") {
    return "browse";
  }
  try {
    return normalizeInteractionMode(window.localStorage.getItem(INTERACTION_MODE_STORAGE_KEY));
  } catch {
    return "browse";
  }
}

export function writeStoredInteractionMode(mode: InteractionMode) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(INTERACTION_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures; the visible mode state should still update.
  }
}

export type StaticButtonVisualState = "hover" | "pressed" | "clicked";

export type StaticButtonPointerSnapshot = {
  nodeId: string;
  clientX: number;
  clientY: number;
  moved: boolean;
};

export type CanvasWheelZoomEvent = {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  deltaY: number;
  clientX: number;
  clientY: number;
  defaultPrevented: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
};

export const CANVAS_SELECTION_DRAG_THRESHOLD = 4;

export type OrthogonalAxis = "x" | "y";

export function hasCanvasSelectionModifier(event: { ctrlKey: boolean; shiftKey: boolean; metaKey?: boolean }) {
  return event.ctrlKey || event.shiftKey || Boolean(event.metaKey);
}

export function canvasWheelEventHasNoModifier(event: { ctrlKey: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }) {
  return !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

export function shouldZoomCanvasFromWheelEvent(event: { ctrlKey: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }) {
  return event.ctrlKey || Boolean(event.metaKey) || canvasWheelEventHasNoModifier(event);
}

export type StaticDrawingState = {
  kind: DeviceKind;
  template: DeviceTemplate;
  points: Point[];
  previewPoint: Point;
};

export type LibraryPlacementState =
  | { kind: "device"; template: DeviceTemplate; previewPoint: Point | null }
  | { kind: "graph-template"; template: GraphTemplate; previewPoint: Point | null };

export type RoutableLinePlacementState = {
  template: DeviceTemplate;
  source: ConnectTarget | null;
  manualPoints?: Point[];
} | null;

export type AttributeLibrary = string;

export type CustomComponentTypeDefinition = {
  name: string;
  attributeLibraryName: AttributeLibrary;
};

export type AttributeLibraryComponentTypeGroup = {
  section: string;
  templates: DeviceTemplate[];
};

export type CustomComponentTreeSelection =
  | { kind: "attributeLibrary"; attributeLibraryName: AttributeLibrary }
  | { kind: "componentType"; attributeLibraryName: AttributeLibrary; section: string }
  | { kind: "component"; attributeLibraryName: AttributeLibrary; section: string; templateKind: string };

export type CustomDeviceDialogView = "terminals" | "icon" | "parameters" | "measurements";

export type CustomDeviceDefinitionMode = "create" | "edit";

export type EdgeEndpoint = "source" | "target";

export type ComponentLibraryDisplayMode = "expanded" | "right";

export type ScaleHandleKind = "scale-x" | "scale-y" | "scale-both";

export type GroupTransformNodeSnapshot = Pick<ModelNode, "position" | "rotation" | "scale" | "scaleX" | "scaleY">;

export type GroupTransformEdgeRouteSnapshot = {
  edgeId: string;
  points: Point[];
};

export type GroupTransformGeometry =
  | { kind: "rotate"; degrees: number }
  | { kind: "scale"; scaleX: number; scaleY: number };

export type GroupTransformDrag = {
  kind: "rotate" | ScaleHandleKind;
  groupId: string;
  nodeIds: string[];
  bounds: SelectionRect;
  center: Point;
  startPoint: Point;
  rotationStartPoint?: Point;
  originalNodes: Record<string, GroupTransformNodeSnapshot>;
  originalEdgeRoutes: GroupTransformEdgeRouteSnapshot[];
  previewPoint?: Point;
  handleXDirection?: -1 | 0 | 1;
  handleYDirection?: -1 | 0 | 1;
  proportionalScale?: boolean;
  historyCaptured?: boolean;
};

export type SingleTransformDrag = {
  kind: "rotate" | ScaleHandleKind;
  nodeId: string;
  originalNode: GroupTransformNodeSnapshot;
  startPoint: Point;
  rotationStartPoint?: Point;
  previewPoint?: Point;
  handleXDirection?: -1 | 0 | 1;
  handleYDirection?: -1 | 0 | 1;
  uprightStaticSelection?: boolean;
  proportionalScale?: boolean;
  historyCaptured?: boolean;
};

export type TransformDrag =
  | SingleTransformDrag
  | GroupTransformDrag;

export type ScaleHandleConfig = {
  id: string;
  kind: ScaleHandleKind;
  xDirection: -1 | 0 | 1;
  yDirection: -1 | 0 | 1;
  className: string;
};

export function isGroupTransformDrag(transform: TransformDrag): transform is GroupTransformDrag {
  return "groupId" in transform;
}

export function selectionRectCenter(rect: SelectionRect): Point {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  };
}

export function combineSelectionRects(rects: Array<SelectionRect | null | undefined>): SelectionRect | null {
  const validRects = rects.filter((rect): rect is SelectionRect => Boolean(rect));
  if (validRects.length === 0) {
    return null;
  }
  return {
    left: Math.min(...validRects.map((rect) => rect.left)),
    right: Math.max(...validRects.map((rect) => rect.right)),
    top: Math.min(...validRects.map((rect) => rect.top)),
    bottom: Math.max(...validRects.map((rect) => rect.bottom))
  };
}

export function routeMidpoint(points: Point[]): Point | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return points[0];
  }
  const segmentLengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  if (totalLength <= 0) {
    return points[Math.floor(points.length / 2)];
  }
  let walked = 0;
  const target = totalLength / 2;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index];
    if (walked + length >= target) {
      const from = points[index];
      const to = points[index + 1];
      const ratio = length <= 0 ? 0 : (target - walked) / length;
      return {
        x: Math.round(from.x + (to.x - from.x) * ratio),
        y: Math.round(from.y + (to.y - from.y) * ratio)
      };
    }
    walked += length;
  }
  return points[points.length - 1];
}

export function rotatePointAround(point: Point, center: Point, degrees: number): Point {
  const radians = degreesToRadians(degrees);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: Math.round(center.x + dx * Math.cos(radians) - dy * Math.sin(radians)),
    y: Math.round(center.y + dx * Math.sin(radians) + dy * Math.cos(radians))
  };
}

export function snapRotationDeltaToRightAngle(delta: number) {
  return clampNumber(Math.round(delta / 90) * 90, -180, 180);
}

export function normalizedRotationDelta(delta: number) {
  return ((delta + 180) % 360 + 360) % 360 - 180;
}

export function transformPointAngle(center: Point, point: Point) {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90;
}

export function rotationDeltaFromTransformPoint(center: Point, point: Point, snapRotation = false) {
  const rawDelta = transformPointAngle(center, point);
  const normalizedDelta = normalizedRotationDelta(rawDelta);
  return snapRotation ? snapRotationDeltaToRightAngle(normalizedDelta) : normalizedDelta;
}

export function rotationDeltaBetweenTransformPoints(center: Point, startPoint: Point, point: Point, snapRotation = false) {
  const rawDelta = transformPointAngle(center, point) - transformPointAngle(center, startPoint);
  const normalizedDelta = normalizedRotationDelta(rawDelta);
  return snapRotation ? snapRotationDeltaToRightAngle(normalizedDelta) : normalizedDelta;
}

export function rotationTrajectoryArcPath(center: Point, startPoint: Point, degrees: number) {
  if (Math.abs(degrees) < 0.5) {
    return "";
  }
  const safeRadius = Math.max(1, Math.hypot(startPoint.x - center.x, startPoint.y - center.y));
  const end = rotatePointAround(startPoint, center, degrees);
  const largeArcFlag = Math.abs(degrees) > 180 ? 1 : 0;
  const sweepFlag = degrees >= 0 ? 1 : 0;
  return `M ${formatSvgNumber(startPoint.x)} ${formatSvgNumber(startPoint.y)} A ${formatSvgNumber(safeRadius)} ${formatSvgNumber(safeRadius)} 0 ${largeArcFlag} ${sweepFlag} ${formatSvgNumber(end.x)} ${formatSvgNumber(end.y)}`;
}

export function mirrorPointAcrossAxis(point: Point, center: Point, axis: "horizontal" | "vertical"): Point {
  return axis === "horizontal"
    ? { x: Math.round(center.x * 2 - point.x), y: point.y }
    : { x: point.x, y: Math.round(center.y * 2 - point.y) };
}

export function localScaleKindForScreenHandle(kind: ScaleHandleKind, rotation: number): ScaleHandleKind {
  if (kind === "scale-both") {
    return kind;
  }
  const screenAxis = kind === "scale-x" ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const radians = degreesToRadians(-normalizeRotationDegrees(rotation));
  const localVector = {
    x: screenAxis.x * Math.cos(radians) - screenAxis.y * Math.sin(radians),
    y: screenAxis.x * Math.sin(radians) + screenAxis.y * Math.cos(radians)
  };
  return Math.abs(localVector.x) >= Math.abs(localVector.y) ? "scale-x" : "scale-y";
}

export { snapSingleTerminalAnchorToNearestSide, projectedProportionalScaleFromHandleDelta } from "../transformUtils";

export function groupTransformGeometry(drag: GroupTransformDrag, point: Point, options?: { snapRotation?: boolean }): GroupTransformGeometry {
  if (drag.kind === "rotate") {
    return { kind: "rotate", degrees: rotationDeltaBetweenTransformPoints(drag.center, drag.startPoint, point, Boolean(options?.snapRotation)) };
  }

  const halfWidth = Math.max(1, (drag.bounds.right - drag.bounds.left) / 2);
  const halfHeight = Math.max(1, (drag.bounds.bottom - drag.bounds.top) / 2);
  const rawScaleX = drag.handleXDirection
    ? normalizeScaleValue(Math.max(0, 1 + ((point.x - drag.startPoint.x) * drag.handleXDirection) / halfWidth))
    : 1;
  const rawScaleY = drag.handleYDirection
    ? normalizeScaleValue(Math.max(0, 1 + ((point.y - drag.startPoint.y) * drag.handleYDirection) / halfHeight))
    : 1;
  const proportionalScale = drag.proportionalScale || drag.kind === "scale-both";
  const unitScale = proportionalScale
    ? drag.kind === "scale-x"
      ? rawScaleX
      : drag.kind === "scale-y"
        ? rawScaleY
        : Math.max(rawScaleX, rawScaleY)
    : 1;
  return {
    kind: "scale",
    scaleX: proportionalScale ? unitScale : drag.kind === "scale-y" ? 1 : rawScaleX,
    scaleY: proportionalScale ? unitScale : drag.kind === "scale-x" ? 1 : rawScaleY
  };
}

export function transformGroupPoint(drag: GroupTransformDrag, geometry: GroupTransformGeometry, point: Point): Point {
  return geometry.kind === "rotate"
    ? rotatePointAround(point, drag.center, geometry.degrees)
    : {
        x: Math.round(drag.center.x + (point.x - drag.center.x) * geometry.scaleX),
        y: Math.round(drag.center.y + (point.y - drag.center.y) * geometry.scaleY)
      };
}

export function groupTransformSvgTransform(drag: GroupTransformDrag, point: Point | undefined) {
  if (!point) {
    return "";
  }
  const geometry = groupTransformGeometry(drag, point);
  return geometry.kind === "rotate"
    ? `translate(${formatSvgNumber(drag.center.x)} ${formatSvgNumber(drag.center.y)}) rotate(${formatSvgNumber(geometry.degrees)}) translate(${formatSvgNumber(-drag.center.x)} ${formatSvgNumber(-drag.center.y)})`
    : `translate(${formatSvgNumber(drag.center.x)} ${formatSvgNumber(drag.center.y)}) scale(${formatSvgNumber(geometry.scaleX)} ${formatSvgNumber(geometry.scaleY)}) translate(${formatSvgNumber(-drag.center.x)} ${formatSvgNumber(-drag.center.y)})`;
}

export type Marquee = { start: Point; current: Point } | null;

export type ModifierSelectionPressTarget =
  | { kind: "blank" }
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; edgeId: string }
  | { kind: "selection"; nodeIds: string[]; edgeIds: string[] };

export type ModifierSelectionPressState = {
  pointerId: number;
  startPoint: Point;
  currentPoint: Point;
  startClientX: number;
  startClientY: number;
  moved: boolean;
  target: ModifierSelectionPressTarget;
} | null;

export type ContextMenuState = {
  x: number;
  y: number;
  target?: "blank" | "node" | "edge" | "group";
  source?: "canvas" | "element-tree";
  canvasPoint?: Point;
  nodeId?: string;
  edgeId?: string;
  routePoints?: Point[];
} | null;

export type ContextMenuSize = { width: number; height: number };

export type ContextMarqueeSelectionState = {
  start: Point;
} | null;

export const NODE_LABEL_DISPLAY_MODES: Array<{ value: NodeLabelDisplayMode; label: string }> = [
  { value: "always", label: "始终显示" },
  { value: "hidden", label: "始终隐藏" },
  { value: "follow", label: "跟随显示" }
];

export type ProjectMenuState = { x: number; y: number; schemeId?: string; projectId?: string } | null;

export type TemplateMenuState =
  | { x: number; y: number; templateId: string }
  | { x: number; y: number; typeName: string }
  | null;

export const CONTEXT_MENU_VIEWPORT_PADDING = 8;

export const CONTEXT_MENU_FALLBACK_WIDTH = 220;

export const CONTEXT_MENU_FALLBACK_HEIGHT = 180;

export const CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH = 172;

export const CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT = 156;

export type UnsavedChangeAction =
  | {
      kind: "load-project";
      project: SavedProjectRecord;
      schemeId: string;
      label: string;
    }
  | {
      kind: "enter-browse";
      label: string;
    };

export type PendingModelImportConflict = {
  targetSchemeId: string;
  importedProject: ProjectFile;
  importedName: string;
  duplicateProjectId: string;
  duplicateProjectName: string;
} | null;

export type PendingSchemeImportConflict = {
  importedScheme?: SavedSchemeRecord;
  importFile?: File;
  importedPath?: string[];
  importedName: string;
  duplicateSchemeId?: string;
  duplicateSchemeName: string;
  targetParentSchemeId?: string;
} | null;

export type PendingRecordPasteConflict =
  | {
      kind: "scheme";
      sourceScheme: SavedSchemeRecord;
      duplicateSchemeId: string;
      duplicateName: string;
      targetParentSchemeId?: string;
    }
  | {
      kind: "project";
      sourceProject: SavedProjectRecord;
      targetSchemeId: string;
      duplicateProjectId: string;
      duplicateName: string;
    }
  | {
      kind: "project-drag";
      projectId: string;
      sourceSchemeId: string;
      targetSchemeId: string;
      duplicateProjectId: string;
      duplicateName: string;
    }
  | {
      kind: "scheme-drag";
      schemeId: string;
      targetSchemeId: string;
      duplicateSchemeId: string;
      duplicateName: string;
    }
  | null;

export type SidePanelResizeState = { side: SidePanelSide; startX: number; startWidth: number } | null;

export type StatusbarResizeState = { startY: number; startHeight: number } | null;

export type TopologyWarningPanelDragState = {
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
} | null;

export type TopologyWarningPanelResizeState = {
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
} | null;

export type CanvasResizeState = {
  edge: CanvasResizeEdge;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  startDisplayWidth: number;
  startDisplayHeight: number;
  startDisplayOffsetX: number;
  startDisplayOffsetY: number;
  startScrollLeft: number;
  startScrollTop: number;
  startScrollSurfaceWidth: number;
  startScrollSurfaceHeight: number;
  startHorizontalScrollbarsActive: boolean;
  startVerticalScrollbarsActive: boolean;
  unitsPerCssX: number;
  unitsPerCssY: number;
  minBounds: CanvasBounds;
  historyCaptured?: boolean;
} | null;

export type CanvasResizeCommitAnchor = {
  edge: CanvasResizeEdge;
  desiredRect: CanvasResizePreviewRect;
};

export type CanvasBoundsScrollAnchor = {
  left: number;
  top: number;
  visualRect?: CanvasResizePreviewRect;
};

export type RewiringState = {
  edgeId: string;
  endpoint: EdgeEndpoint;
  previewPoint: Point;
  dropTargetPoint?: Point;
  dropTarget?: ConnectTarget;
  pointerId?: number;
} | null;

export type ConnectTarget = { node: ModelNode; terminalId: string; point?: Point };

export type RoutableLineEndpointDragState = {
  nodeId: string;
  endpoint: EdgeEndpoint;
  previewPoint: Point;
  dropTargetPoint?: Point;
  dropTarget?: ConnectTarget;
  pointerId?: number;
} | null;

export type NodeTerminalSnapTarget = {
  movingNodeId: string;
  movingTerminalId: string;
  targetNodeId: string;
  targetTerminalId: string;
  point: Point;
  delta: Point;
  distance: number;
  kind?: "terminal" | "bus";
};

export type TerminalPressState = {
  nodeId: string;
  terminalId: string;
  pointerId: number;
  startPoint: Point;
  currentPoint: Point;
  moved: boolean;
  historyCaptured?: boolean;
} | null;

export type NodeLabelDragState = {
  nodeId: string;
  pointerId: number;
  startPoint: Point;
  startOffset: Point;
  scaleX: number;
  scaleY: number;
  historyCaptured?: boolean;
} | null;

export type NodeLabelRotateDragState = {
  nodeId: string;
  pointerId: number;
  center: Point;
  startRotation: number;
  historyCaptured?: boolean;
} | null;

export const NODE_LABEL_FOOTPRINT_PARAM_KEYS = new Set([
  "_labelText",
  "_labelDisplayMode",
  "_labelVisible",
  "_labelX",
  "_labelY",
  "_labelFontSize",
  "_labelTextAnchor",
  "_labelRotation",
  "_labelFontFamily",
  "_labelFontWeight",
  "_labelFontStyle",
  "_labelTextDecoration"
]);

export type ManualPathDrag =
  | {
      edgeId?: string;
      nodeId?: string;
      segmentIndex: number;
      orientation: "horizontal" | "vertical";
      startPoint: Point;
      originalManualPoints: Point[];
      originalRoutePoints: Point[];
      previewRoutePoints?: Point[];
      historyCaptured?: boolean;
    }
  | {
      edgeId?: string;
      nodeId?: string;
      pointIndex: number;
      startPoint: Point;
      originalManualPoints: Point[];
      originalRoutePoints: Point[];
      previewRoutePoints?: Point[];
      historyCaptured?: boolean;
    }
  | null;

export type CanvasSelectionSnapshot = {
  scope: CanvasSelectionScope;
  nodeIds: string[];
  edgeIds: string[];
  edgeId: string;
};

export type SingleNodeDragPreviewEndpoint = {
  edgeId: string;
  color: string;
  start: Point;
  end: Point;
  sourceNode: ModelNode;
  targetNode: ModelNode;
  startMoves: boolean;
  endMoves: boolean;
  sourceNormal?: Point;
  targetNormal?: Point;
  routePoints?: Point[];
};

export type SingleNodeDragCache = {
  movedNodeIds: Set<string>;
  draggedEdgeIds: Set<string>;
  movedBusNodeIds: Set<string>;
  relevantEdges: Edge[];
  previewEdges: Edge[];
  snapEdges: Edge[];
  previewEndpointByEdgeId: Map<string, SingleNodeDragPreviewEndpoint>;
};

export type DraggingState = {
  source?: "pointer" | "keyboard";
  nodeIds: string[];
  edgeIds: string[];
  affectedEdges: Edge[];
  wholeLayerMove?: boolean;
  startPoint: Point;
  originalPositions: Record<string, Point>;
  originalEdgePoints: Record<string, { sourcePoint?: Point; targetPoint?: Point; manualPoints?: Point[]; routePoints?: Point[] }>;
  originalRoutePoints: Record<string, Point[]>;
  originalRouteBounds: Record<string, RenderViewportBounds | null>;
  singleNodeDragCache?: SingleNodeDragCache;
  currentDelta?: Point;
  previewDelta?: Point;
  historyCaptured?: boolean;
  overlayPreview?: MultiNodeDragOverlayPreview;
  selection?: CanvasSelectionSnapshot;
};

export type MultiNodeDragOverlayPreview = {
  bounds: RenderViewportBounds | null;
  edgeRoutes: DragGhostRoute[];
  ghostRoutes: DragGhostRoute[];
  dynamicEdgePreviewEdges: Edge[];
  movedNodeIds: Set<string>;
  draggedEdgeIds: Set<string>;
  movedBusNodeIds: Set<string>;
  simplifiedMarkup?: string;
};

export type DragGhostRoute = {
  edgeId: string;
  path: string;
  color?: string;
  routableLineNodeId?: string;
};

export type NodeDragPreviewRoute = {
  edgeId: string;
  path: string;
  color: string;
  routableLineNodeId?: string;
};

export type SingleNodeDeferredRepairOptions = {
  reconcileTerminalConnections?: boolean;
};

export type FastMovedGraphCommitOptions = {
  wholeLayerMove?: boolean;
  moveDelta?: Point;
  internalMovedEdgeIds?: Iterable<string>;
};

export type BulkMovePlan = {
  kind: "none" | "rigid" | "hybrid";
  internalEdgeIds: Set<string>;
  internalCandidateEdges: Edge[];
  boundaryCandidateEdges: Edge[];
  internalRepairCandidateEdges: Edge[];
  routeRepairSeedEdges: Edge[];
  routeRepairCandidateEdges: Edge[];
  deferredRepairCandidateEdges: Edge[];
  legacyDeferredRepairCandidateCount: number;
};

export type BulkMoveCommitStats = {
  kind: "none" | "rigid" | "hybrid";
  movedNodeCount: number;
  candidateEdgeCount: number;
  internalEdgeCount: number;
  boundaryEdgeCount: number;
  deferredRepairCandidateCount: number;
  legacyDeferredRepairCandidateCount: number;
  routeCachePatchedCount: number;
  legacyRouteDirtyCount: number;
  routeDirtyCount: number;
  storedRouteDirtyCount: number;
  routableLineUpdateCount: number;
  durationMs: number;
  bulkPlanMs: number;
  canvasBoundsMs: number;
  edgePatchMs: number;
  dirtyMs: number;
  markDirtyMs: number;
  busSyncMs: number;
  syncRepairMs: number;
  routeCacheMs: number;
  graphPatchMs: number;
};

export type BulkMoveDirtyResult = {
  dirtyIds: Set<string>;
  legacyDirtyCount: number;
};

export function isMultiNodeMoveState(dragState: Pick<DraggingState, "nodeIds"> | null | undefined) {
  return (dragState?.nodeIds.length ?? 0) > 1;
}

export function reuseSetOrCreate<T>(items: Iterable<T>): Set<T> {
  return items instanceof Set ? items : new Set(items);
}

export type GraphDirtyBaseline = {
  projectName: string;
  layers: ModelLayer[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
  allowAutoExpandCanvas: boolean;
  canvasBackgroundColor: string;
  canvasBackgroundImage: string;
  canvasBackgroundImageAssetId: string;
  backgroundProjectId: string;
  backgroundLayerIds: string[];
  powerUnit: string;
  voltageUnit: string;
  currentUnit: string;
  powerBaseValue: number;
  deviceIndexCounters: DeviceIndexCounters;
  nodes: ModelNode[];
  edges: Edge[];
  groups: ModelGroup[];
  measurements: ProjectMeasurementConfig;
};

export type MeasurementDragState = {
  groupId: string;
  pointerId: number;
  startPoint: Point;
  startOffset: Point;
  historyCaptured: boolean;
} | null;

export type MeasurementEditorDialogState = {
  nodeId: string;
  drafts: MeasurementGroup[];
} | null;

export const cloneMeasurementGroupForDraft = (group: MeasurementGroup): MeasurementGroup => ({
  ...group,
  offset: { ...group.offset },
  groupStyleOverride: group.groupStyleOverride ? { ...group.groupStyleOverride } : undefined,
  items: group.items.map((item) => ({
    ...item,
    name: item.name,
    styleOverride: item.styleOverride ? { ...item.styleOverride } : undefined
  }))
});

export type MeasurementEditorDialogValue = Exclude<MeasurementEditorDialogState, null>;

export type ClipboardRecord =
  | { kind: "scheme"; scheme: SavedSchemeRecord }
  | { kind: "project"; project: SavedProjectRecord };

export type TopologyRunStatus = {
  state: "idle" | "success" | "failed";
  message: string;
};

export type UndoSnapshot = {
  graphSnapshotMode: "deep" | "reference";
  graphPatchScope?: UndoGraphPatchScope;
  projectName: string;
  layers: ModelLayer[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
  allowAutoExpandCanvas: boolean;
  canvasBackgroundColor: string;
  canvasBackgroundImage: string;
  canvasBackgroundImageAssetId: string;
  backgroundProjectId: string;
  backgroundLayerIds: string[];
  powerUnit: string;
  voltageUnit: string;
  currentUnit: string;
  powerBaseValue: number;
  nodes: ModelNode[];
  edges: Edge[];
  topologyErrors: TopologyValidationError[];
  topology: Topology;
  topologyStatus: TopologyRunStatus;
  deviceIndexCounters: DeviceIndexCounters;
  groups: ModelGroup[];
  measurements: ProjectMeasurementConfig;
};

export type UndoGraphPatchScope = {
  nodeIds?: readonly string[];
  edgeIds?: readonly string[];
};

export type UndoGraphSnapshotPatchPlan =
  | { mode: "full"; dirtyEdgeIds: Set<string> }
  | { mode: "patch"; nodeIds: string[]; edgeIds: string[]; dirtyEdgeIds: Set<string> };

export type BatchCommonParamRow = {
  key: string;
  label: string;
  value: string;
  mixed: boolean;
  definition?: DeviceParameterDefinition;
};

export type BatchCommonParamPatch = Record<string, string>;

export type BatchCommonMeasurementGroupKey =
  | "visible"
  | "layout"
  | "labelVisible"
  | "unitVisible"
  | "backgroundVisible"
  | "backgroundColor"
  | "borderStyle"
  | "borderColor"
  | "borderWidth";

export type BatchCommonMeasurementGroupRow = {
  key: BatchCommonMeasurementGroupKey;
  label: string;
  value: string;
  mixed: boolean;
};

export type DraftProjectState = {
  projectName: string;
  activeProjectKey: string;
  activeSchemeKey: string;
  layers?: ModelLayer[];
  activeLayerId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  allowAutoExpandCanvas?: boolean;
  canvasBackgroundColor?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
  backgroundProjectId?: string;
  backgroundLayerIds?: string[];
  powerUnit?: string;
  voltageUnit?: string;
  currentUnit?: string;
  powerBaseValue?: number;
  deviceIndexCounters?: DeviceIndexCounters;
  groups?: ModelGroup[];
  measurements?: ProjectMeasurementConfig;
  nodes: ModelNode[];
  edges: Edge[];
};

export type ActiveProjectPointer = {
  activeProjectName: string;
  activeSchemePath: string[];
};

export type RefreshRecoveryProjectState = DraftProjectState & {
  dirty: true;
  savedAt: string;
};

export type ConnectSourceState = {
  nodeId: string;
  terminalId: string;
  point?: Point;
  manualPoints?: Point[];
};

export type ImageAsset = {
  id: string;
  name: string;
  filename?: string;
  folderId?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  url: string;
};

export type ImageFolder = {
  id: string;
  name: string;
  createdAt?: string;
  imageCount?: number;
};

export type ImageTarget =
  | { kind: "node"; nodeId: string }
  | { kind: "nodeForeground"; nodeId: string }
  | { kind: "canvas" }
  | { kind: "canvasIcon" }
  | { kind: "stateIconDrawing" };

export type NodeDoubleClickDialogKind = "interaction" | "text" | "device";

export type NodeDoubleClickDialogState = {
  kind: NodeDoubleClickDialogKind;
  nodeId: string;
  containerViewId?: string;
} | null;

export type NodeDoubleClickDialogDraftState = {
  nodeId: string;
  node: ModelNode;
} | null;

export type FloatingDialogLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
} | null;

export type FloatingDialogPointerState = {
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
} | null;

export type NodeDoubleClickDialogLayout = FloatingDialogLayout;

export type NodeDoubleClickDialogDragState = FloatingDialogPointerState;

export type NodeDoubleClickDialogResizeState = FloatingDialogPointerState;

export type DeviceLibraryDialogKind = "definition" | "custom" | "measurementConfig";

export type DeviceLibraryDialogLayouts = Partial<Record<DeviceLibraryDialogKind, FloatingDialogLayout>>;

export type DeviceLibraryDialogPointerState = (NonNullable<FloatingDialogPointerState> & {
  kind: DeviceLibraryDialogKind;
}) | null;

export type StateImageUploadTarget = {
  scope: "definition" | "custom";
  rowId: string;
};

export type StateIconDrawingTarget = StateImageUploadTarget;

export type StateIconDrawingDialogState = {
  target: StateIconDrawingTarget;
  elements: StateIconDrawingElement[];
  selectedElementId: string;
  selectedElementIds: string[];
  elementLibraryTab?: "basic" | "static";
  pendingElementKind?: StateVisualShapeKind;
  pendingStaticTemplate?: DeviceTemplate;
  drawingDraft?: {
    kind: StateVisualShapeKind;
    start: Point;
    current: Point;
    points?: Point[];
    element: StateIconDrawingElement;
  };
  frame?: {
    strokeStyle: "solid" | "dashed" | "dotted";
    strokeWidth: number;
    strokeColor: string;
    fillColor: string;
  };
};

export type StateIconDrawingContextMenuState = {
  x: number;
  y: number;
  kind: "canvas" | "element" | "state";
  elementId?: string;
  rowId?: string;
  pastePoint?: Point;
};

export type StateIconDrawingDragMode = "move" | "resize" | "rotate";

export type StateIconDrawingDragState = {
  mode: StateIconDrawingDragMode;
  elementIds: string[];
  start: Point;
  center: Point;
  startElements: StateIconDrawingElement[];
};

export type CanvasRenderOptions = CanvasBounds & {
  backgroundColor?: string;
  backgroundImage?: string;
  imageExportPathById?: Record<string, string>;
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: ColorPalette;
  deviceTemplates?: DeviceTemplate[];
  layers?: ModelLayer[];
  activeLayerId?: string;
  measurements?: ProjectMeasurementConfig;
  measurementConfig?: PlatformMeasurementConfig;
};

export type BackendSchemesResponse = {
  schemes: SavedSchemeRecord[];
};

export type BackendProjectLoadResponse = {
  ok?: boolean;
  project?: SavedProjectRecord;
  error?: string;
};

export type BackendSchemeArchiveImportResponse = BackendSchemesResponse & {
  ok?: boolean;
  conflict?: boolean;
  importedName?: string;
  duplicateSchemeName?: string;
  importedPath?: string[];
  parentPath?: string[];
  error?: string;
};

export type BackendProjectSaveResponse = {
  ok?: boolean;
  project?: SavedProjectRecord;
  savedAt?: string;
};

export type BackendColorConfigResponse = {
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: Partial<ColorPalette>;
  exists?: boolean;
  savedAt?: string;
};

export type DeviceLibraryPersistencePayload = {
  customDeviceTemplates: DeviceTemplate[];
  customAttributeLibraries: AttributeLibrary[];
  customComponentTypes: CustomComponentTypeDefinition[];
  deviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride>;
  customGraphTemplateTypes: string[];
  customGraphTemplates: GraphTemplate[];
};

export type BackendDeviceLibraryResponse = Partial<DeviceLibraryPersistencePayload> & {
  exists?: boolean;
  savedAt?: string;
};

export type BackendMeasurementConfigResponse = Partial<PlatformMeasurementConfig> & {
  exists?: boolean;
  savedAt?: string;
};

export type GraphTemplate = {
  id: string;
  typeName: string;
  name: string;
  sourceSize: { width: number; height: number };
  clipboard: CanvasClipboard;
  createdAt: string;
  updatedAt: string;
};

export type CustomParamDraft = DeviceParameterDefinition & {
  id: string;
  enumValues?: string[];
};

export type CustomDeviceDraft = {
  attributeLibraryName: string;
  componentType: string;
  componentName: string;
  backgroundImage: string;
  backgroundImageAssetId: string;
  size: { width: number; height: number };
  allowResizeTransform: string;
  terminalCount: number;
  terminalTypes: TerminalType[];
  terminalLabels: string[];
  terminalAnchors: Point[];
  terminalRoles: ContainerTerminalRole[];
  terminalAssociations: ContainerTerminalAssociationValue[];
  isContainer: boolean;
  params: CustomParamDraft[];
  stateDefinitions: DeviceDefinitionStateDraftRow[];
  error: string;
};

export type DeviceDefinitionVisualDraft = {
  backgroundImage: string;
  backgroundImageAssetId: string;
  size: { width: number; height: number };
  terminalCount: number;
  terminalTypes: TerminalType[];
  terminalLabels: string[];
  terminalAnchors: Point[];
  error: string;
};

export type DeviceDefinitionMeasurementPanelTarget = {
  deviceKind: string;
  label: string;
  terminalCount: number;
  terminalLabels?: readonly string[];
};

export type TemplateDialogState = {
  sourceGroupId: string;
  clipboard: CanvasClipboard;
  sourceSize: { width: number; height: number };
} | null;

export type GroupDeviceTerminalDraft = {
  id: string;
  label: string;
  type: TerminalType;
  anchor: Point;
  association: ContainerTerminalAssociationValue;
  sourceNodeId: string;
  sourceTerminalId: string;
};

export type GroupDeviceDefinitionMode = "new" | "replace";

export type GroupDeviceDefinitionDialogState = {
  sourceGroupId: string;
  clipboard: CanvasClipboard;
  sourceSize: { width: number; height: number };
  iconImage: string;
  terminals: GroupDeviceTerminalDraft[];
  mode: GroupDeviceDefinitionMode;
  attributeLibraryName: string;
  componentType: string;
  targetKind: string;
} | null;

export type DeviceDefinitionDraftRow = DeviceParameterDefinition & {
  id: string;
  enumValues?: string[];
};

export type VoltageColorVisibility = "all" | "current";

export const terminalColor = terminalTypeColor;

export const busEndpointColor = (node: ModelNode, colorPalette?: ColorPalette) => terminalColor(node.terminals[0]?.type, colorPalette);

export const ENERGY_COLOR_ROWS: Array<{ type: TerminalType; label: string }> = [
  { type: "ac", label: "交流电" },
  { type: "dc", label: "直流电" },
  { type: "h2", label: "氢能" },
  { type: "heat", label: "热能" }
];

export const ELECTRIC_COLOR_TYPES: Array<"ac" | "dc"> = ["ac", "dc"];

export const ELECTRIC_COLOR_TYPE_LABELS: Record<"ac" | "dc", string> = {
  ac: "AC",
  dc: "DC"
};

export const isElectricPaletteType = (type?: TerminalType): type is "ac" | "dc" => type === "ac" || type === "dc";

export const terminalVbaseFallbackValue = (node: ModelNode, terminalIndex: number) => {
  if (node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral") {
    return [node.params.highVbase, node.params.mediumVbase, node.params.lowVbase, node.params.neutral_vbase][terminalIndex] ?? node.params.vbase ?? "";
  }
  const sourceSide = node.params.i_vbase ?? node.params.sourceVbase ?? node.params.highVbase;
  const targetSide = node.params.j_vbase ?? node.params.targetVbase ?? node.params.lowVbase;
  return (terminalIndex === 0 ? sourceSide : targetSide) ?? node.params.vbase ?? node.params.voltageLevel ?? node.params.ratedVoltage ?? "";
};

export const voltageColorKeyForTerminal = (node: ModelNode, terminal: ModelNode["terminals"][number], terminalIndex: number) => {
  if (!isElectricPaletteType(terminal.type)) {
    return "";
  }
  const voltage = terminalVoltageBaseNumber(terminal.vbase ?? terminalVbaseFallbackValue(node, terminalIndex));
  return voltage ? `${terminal.type}:${voltage}` : "";
};

export const DEFAULT_CANVAS_WIDTH = 1920;

export const DEFAULT_CANVAS_HEIGHT = 1024;

export const MIN_CANVAS_WIDTH = 640;

export const MIN_CANVAS_HEIGHT = 360;

export const MAX_CANVAS_WIDTH = 50000;

export const MAX_CANVAS_HEIGHT = 50000;

export const DEFAULT_CANVAS_BACKGROUND = "#f1f5f9";

export const MOVE_BOUNDARY_GUARD = 8;

export const CANVAS_AUTO_EXPAND_PADDING = 96;

export const CANVAS_SCROLLBAR_VISIBILITY_TOLERANCE = 2;

export const CANVAS_RESIZE_HANDLE_SIZE = 18;

export const MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES = 5;

export const ORIGINAL_POSITION_REROUTE_PADDING = 64;

export const MOVE_ROUTE_LOCAL_SEARCH_PADDING = 96;

export const MAX_DEFERRED_MOVE_REPAIR_MOVED_NODES = 16;

export const MAX_DEFERRED_MOVE_REPAIR_CANDIDATE_EDGES = 96;

export const KEYBOARD_MOVE_COMMIT_DELAY_MS = 160;

export const KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND = 30;

export const KEYBOARD_MOVE_FRAME_INTERVAL_MS = 1000 / KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND;

export const ELEMENT_TREE_INITIAL_ITEM_LIMIT = 120;

export const ELEMENT_TREE_ITEM_LIMIT_STEP = 120;

export const TOPOLOGY_WARNING_PAGE_SIZE = 50;

export const CANVAS_MINIMAP_WIDTH = 220;

export const CANVAS_MINIMAP_HEIGHT = 142;

export const CANVAS_MINIMAP_PADDING = 9;

export const NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH = 640;

export const NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT = 560;

export const NODE_DOUBLE_CLICK_DIALOG_MIN_WIDTH = 420;

export const NODE_DOUBLE_CLICK_DIALOG_MIN_HEIGHT = 300;

export const NODE_DOUBLE_CLICK_DIALOG_MARGIN = 12;

export const DEVICE_DEFINITION_DIALOG_DEFAULT_WIDTH = 1120;

export const DEVICE_DEFINITION_DIALOG_DEFAULT_HEIGHT = 780;

export const CUSTOM_DEVICE_DIALOG_DEFAULT_WIDTH = 1180;

export const CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT = 760;

export const MEASUREMENT_CONFIG_DIALOG_DEFAULT_WIDTH = 1180;

export const MEASUREMENT_CONFIG_DIALOG_DEFAULT_HEIGHT = 760;

export const DEVICE_LIBRARY_DIALOG_MIN_WIDTH = 720;

export const DEVICE_LIBRARY_DIALOG_MIN_HEIGHT = 420;

export const DEVICE_LIBRARY_DIALOG_MARGIN = 12;

export const DEVICE_LIBRARY_DIALOG_CONFIG: Record<DeviceLibraryDialogKind, {
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  margin: number;
}> = {
  definition: {
    defaultWidth: DEVICE_DEFINITION_DIALOG_DEFAULT_WIDTH,
    defaultHeight: DEVICE_DEFINITION_DIALOG_DEFAULT_HEIGHT,
    minWidth: DEVICE_LIBRARY_DIALOG_MIN_WIDTH,
    minHeight: DEVICE_LIBRARY_DIALOG_MIN_HEIGHT,
    margin: DEVICE_LIBRARY_DIALOG_MARGIN
  },
  custom: {
    defaultWidth: CUSTOM_DEVICE_DIALOG_DEFAULT_WIDTH,
    defaultHeight: CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT,
    minWidth: DEVICE_LIBRARY_DIALOG_MIN_WIDTH,
    minHeight: DEVICE_LIBRARY_DIALOG_MIN_HEIGHT,
    margin: DEVICE_LIBRARY_DIALOG_MARGIN
  },
  measurementConfig: {
    defaultWidth: MEASUREMENT_CONFIG_DIALOG_DEFAULT_WIDTH,
    defaultHeight: MEASUREMENT_CONFIG_DIALOG_DEFAULT_HEIGHT,
    minWidth: DEVICE_LIBRARY_DIALOG_MIN_WIDTH,
    minHeight: DEVICE_LIBRARY_DIALOG_MIN_HEIGHT,
    margin: DEVICE_LIBRARY_DIALOG_MARGIN
  }
};

export const TOPOLOGY_WARNING_PANEL_DEFAULT_WIDTH = 520;

export const TOPOLOGY_WARNING_PANEL_MIN_WIDTH = 360;

export const TOPOLOGY_WARNING_PANEL_MAX_WIDTH = 640;

export const TOPOLOGY_WARNING_PANEL_MARGIN = 12;

export const CANVAS_MINIMAP_MAX_NODE_MARKS = 360;

export const CANVAS_MINIMAP_MAX_ROUTE_MARKS = 160;

export const CANVAS_MINIMAP_DEFER_SAMPLE_THRESHOLD = 1200;

export const FIT_SELECTION_MAX_ZOOM_PERCENT = 100;

export const TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD = 600;

export const CANVAS_LOD_NODE_DETAIL_LIMIT = 650;

export const CANVAS_INITIAL_LOD_NODE_DETAIL_LIMIT = 320;

export const CANVAS_LOD_MAX_ZOOM_PERCENT = 120;

export const CANVAS_LOD_MAX_NODE_SCREEN_SIZE = 18;

export const CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT = 96;

export const CANVAS_LOD_SELECTED_DETAIL_LIMIT = 12;

export const CANVAS_LOD_MARKUP_CHUNK_SIZE = 64;

export const CANVAS_INITIAL_LOD_DETAIL_CHUNK_SIZE = 192;

export const CANVAS_INITIAL_LOD_FIRST_DETAIL_DELAY_MS = 360;

export const CANVAS_INITIAL_LOD_NEXT_DETAIL_DELAY_MS = 90;

export const CONNECTION_HIT_SCREEN_TOLERANCE = 18;

export const CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT = 24;

export const CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT = 32;

export const CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT = 96;

export const CANVAS_BULK_MOVE_EDGE_THRESHOLD = 80;

export const ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD = 800;

export const BULK_MOVE_PERF_LOG_THRESHOLD_MS = 12;

export const SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE = 8;

export const SMART_ALIGNMENT_GUIDE_PADDING = 36;

export const CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT = 24;

export const CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT = 48;

export const CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT = 12;

export const CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING = 160;

export const CANVAS_FLOATING_TOOLBAR_GAP = 7;

export const NODE_FLOATING_TOOLBAR_WIDTH = 224;

export const NODE_FLOATING_TOOLBAR_HEIGHT = 38;

export const EDGE_FLOATING_TOOLBAR_WIDTH = 122;

export const EDGE_FLOATING_TOOLBAR_HEIGHT = 38;

export const CONTEXT_MENU_AUTO_HIDE_MARGIN = 28;

export const TRANSFORM_ROTATE_STEM_START = 12;

export const TRANSFORM_ROTATE_STEM_END = 36;

export const TRANSFORM_ROTATE_HANDLE_GAP = 42;

export const DEFAULT_POWER_UNIT = "MW";

export const DEFAULT_VOLTAGE_UNIT = "kV";

export const DEFAULT_CURRENT_UNIT = "A";

export const DEFAULT_POWER_BASE_VALUE = 100;

export const EMPTY_TOPOLOGY: Topology = { nodes: {}, connectedComponents: [] };

export const INITIAL_TOPOLOGY_STATUS: TopologyRunStatus = { state: "idle", message: "未拓扑" };

export const E_SECTION_OPTIONS = Object.keys(E_SECTION_COLUMNS);

export const COMPONENT_TYPE_LABELS: Record<string, string> = {
  StaticTextSymbol: "静态文本",
  StaticMediaSymbol: "静态媒体",
  StaticBasicShape: "基础图形",
  StaticFlowNode: "流程节点",
  StaticButton: "按钮图元",
  StaticContainerSymbol: "容器图元",
  StaticConnectorSymbol: "连接图元",
  StaticAnnotationSymbol: "标注图元",
  ACRealBs: "交流母线",
  DCRealBs: "直流母线",
  ACNode: "交流节点",
  DCNode: "直流节点",
  ACBranch: "交流支路",
  DCBranch: "直流支路",
  ACLoad: "交流负荷",
  DCLoad: "直流负荷",
  ACGenerator: "交流电源",
  DCGenerator: "直流电源",
  ACShuntCompensator: "交流无功补偿",
  ACZeroBranch: "交流零阻支路",
  DCZeroBranch: "直流零阻支路",
  ACSwitch: "交流开关",
  DCSwitch: "直流开关",
  ACBreak: "交流断路器",
  DCBreak: "直流断路器",
  GroundDisconnector: "接地刀闸",
  ACTransformer: "双绕组变压器",
  ACTransfomer3: "三绕组变压器",
  DCDCConverter: "直流变换器",
  DCACConverter: "交直流变换器",
  ACACConverter: "交流变换器",
  HydroSource: "氢源",
  HydroLoad: "氢负荷",
  HydroPipe: "输氢管道",
  HydroCompressor: "氢压缩机",
  HydroPressRegulator: "氢调压器",
  HydroStopValve: "氢截止阀",
  HydroBus: "氢母线",
  HydroStorage: "储氢",
  AcE2Hydro: "交流电制氢",
  DcE2Hydro: "直流电制氢",
  Hydro2AcE: "氢转交流电",
  Hydro2DcE: "氢转直流电",
  HeatSource: "单端热源",
  HeatSource2: "双端热源",
  HeatLoad: "单端热负荷",
  HeatLoad2: "双端热负荷",
  HeatPipe: "输热管道",
  HeatStopValve: "热截止阀",
  HeatBus: "热母线",
  HeatStorage: "储热",
  HeatBoiler: "单端锅炉",
  HeatBoiler2: "双端锅炉",
  AcElec2Heat: "交流电制热",
  DcElec2Heat: "直流电制热",
  AcElec2Heat2: "交流电制热双端",
  DcElec2Heat2: "直流电制热双端",
  HeatExchanger: "双端换热器",
  HeatExchanger3: "三端换热器",
  HeatExchanger4: "四端换热器",
  HeatPump: "热泵"
};

export const SCALE_HANDLE_CONFIGS: ScaleHandleConfig[] = [
  { id: "north-west", kind: "scale-both", xDirection: -1, yDirection: -1, className: "diagonal-nwse" },
  { id: "north", kind: "scale-y", xDirection: 0, yDirection: -1, className: "vertical" },
  { id: "north-east", kind: "scale-both", xDirection: 1, yDirection: -1, className: "diagonal-nesw" },
  { id: "east", kind: "scale-x", xDirection: 1, yDirection: 0, className: "horizontal" },
  { id: "south-east", kind: "scale-both", xDirection: 1, yDirection: 1, className: "diagonal-nwse" },
  { id: "south", kind: "scale-y", xDirection: 0, yDirection: 1, className: "vertical" },
  { id: "south-west", kind: "scale-both", xDirection: -1, yDirection: 1, className: "diagonal-nesw" },
  { id: "west", kind: "scale-x", xDirection: -1, yDirection: 0, className: "horizontal" }
];

export const GROUP_SCALE_HANDLE_CONFIGS = SCALE_HANDLE_CONFIGS.filter((handle) => handle.kind === "scale-both");

export const POWER_UNIT_OPTIONS = ["W", "kW", "MW"];

export const VOLTAGE_UNIT_OPTIONS = ["V", "kV"];

export const CURRENT_UNIT_OPTIONS = ["A", "kA"];

export const DEFAULT_ATTRIBUTE_LIBRARIES: AttributeLibrary[] = ["静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"];

export const CUSTOM_ATTRIBUTE_LIBRARY_BASES: AttributeLibrary[] = ["交流设备", "直流设备", "氢能设备", "热能设备"];

export const PROTECTED_ATTRIBUTE_LIBRARIES = new Set(CUSTOM_ATTRIBUTE_LIBRARY_BASES);

export const DEVICE_TYPE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export const MAX_CUSTOM_DEVICE_TERMINALS = 8;

export const CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES = [-0.25, -1 / 6, 0, 1 / 6, 0.25];

export const CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS = ["1/4", "1/3", "1/2", "2/3", "3/4"];

export const CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE = 8;

export const CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION = 1000;

export const CUSTOM_DEVICE_TERMINAL_PREVIEW_OUTWARD_OFFSET = 14;

export const CUSTOM_DEVICE_TERMINAL_PREVIEW_MARGIN = 30;

export const TERMINAL_TYPE_OPTIONS: Array<{ value: TerminalType; label: string }> = [
  { value: "ac", label: TERMINAL_TYPE_LIBRARY_LABELS.ac },
  { value: "dc", label: TERMINAL_TYPE_LIBRARY_LABELS.dc },
  { value: "h2", label: TERMINAL_TYPE_LIBRARY_LABELS.h2 },
  { value: "heat", label: TERMINAL_TYPE_LIBRARY_LABELS.heat }
];

export const CONTAINER_TERMINAL_ASSOCIATION_OPTIONS: Record<TerminalType, Array<{ value: ContainerTerminalAssociationType; label: string }>> = {
  ac: [
    { value: "ac-generator", label: "交流电源 / ACGenerator" },
    { value: "ac-load", label: "交流电负荷 / ACLoad" }
  ],
  dc: [
    { value: "dc-generator", label: "直流电源 / DCGenerator" },
    { value: "dc-load", label: "直流电负荷 / DCLoad" }
  ],
  h2: [
    { value: "h2-source", label: "氢源" },
    { value: "h2-load", label: "氢荷" }
  ],
  heat: [
    { value: "heat-source", label: "单端热源" },
    { value: "heat2-source", label: "双端热源" },
    { value: "heat-load", label: "单端热荷" },
    { value: "heat2-load", label: "双端热荷" }
  ]
};

export const PARAM_VALUE_TYPE_OPTIONS: Array<{ value: DeviceParameterValueType; label: string }> = [
  { value: "integer", label: "整数" },
  { value: "float", label: "浮点数" },
  { value: "string", label: "字符串" },
  { value: "stringEnum", label: "字符串枚举" },
  { value: "numberEnum", label: "数字枚举" }
];

export const PROJECT_PANEL_MIN_HEIGHT = 150;

export const PROJECT_PANEL_MAX_HEIGHT = 430;

export const PROJECT_PANEL_DEFAULT_HEIGHT = 260;

export const LEFT_PANEL_DEFAULT_WIDTH = 288;

export const RIGHT_PANEL_DEFAULT_WIDTH = 320;

export const SIDE_PANEL_MIN_WIDTH = 240;

export const SIDE_PANEL_MAX_WIDTH = 640;

export const STATUSBAR_DEFAULT_HEIGHT = 36;

export const STATUSBAR_MIN_HEIGHT = 32;

export const STATUSBAR_MAX_HEIGHT = 160;

export const VALIDATION_PANEL_DEFAULT_HEIGHT = 180;

export const VALIDATION_PANEL_MIN_HEIGHT = 96;

export const VALIDATION_PANEL_MAX_HEIGHT = 420;

export const CONNECT_TERMINAL_SNAP_TOLERANCE = 28;

export const CONNECT_BUS_SNAP_TOLERANCE = 18;

export const connectTargetSearchBounds = (point: Point): RenderViewportBounds => {
  const padding = Math.max(CONNECT_TERMINAL_SNAP_TOLERANCE, CONNECT_BUS_SNAP_TOLERANCE) + 64;
  return {
    left: point.x - padding,
    right: point.x + padding,
    top: point.y - padding,
    bottom: point.y + padding
  };
};

export const findNodeTerminalSnapTarget = (
  candidateNodes: ModelNode[],
  movedNodeIds: ReadonlySet<string>,
  tolerance = CONNECT_TERMINAL_SNAP_TOLERANCE
): NodeTerminalSnapTarget | null => {
  if (movedNodeIds.size === 0) {
    return null;
  }
  const bucketSize = Math.max(1, tolerance);
  const bucketKey = (point: Point) => `${Math.floor(point.x / bucketSize)}:${Math.floor(point.y / bucketSize)}`;
  const neighborBucketKeys = (point: Point) => {
    const bucketX = Math.floor(point.x / bucketSize);
    const bucketY = Math.floor(point.y / bucketSize);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        keys.push(`${bucketX + dx}:${bucketY + dy}`);
      }
    }
    return keys;
  };
  const fixedTerminalsByType = new Map<TerminalType, Map<string, Array<{ node: ModelNode; terminalId: string; point: Point }>>>();
  for (const node of candidateNodes) {
    if (movedNodeIds.has(node.id) || isBusNode(node) || isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      const point = getTerminalPoint(node, terminal.id);
      let buckets = fixedTerminalsByType.get(terminal.type);
      if (!buckets) {
        buckets = new Map();
        fixedTerminalsByType.set(terminal.type, buckets);
      }
      const key = bucketKey(point);
      const bucket = buckets.get(key);
      const entry = { node, terminalId: terminal.id, point };
      if (bucket) {
        bucket.push(entry);
      } else {
        buckets.set(key, [entry]);
      }
    }
  }
  let best: NodeTerminalSnapTarget | null = null;
  for (const node of candidateNodes) {
    if (!movedNodeIds.has(node.id) || isBusNode(node) || isStaticNode(node)) {
      continue;
    }
    for (const terminal of node.terminals) {
      const fixedTerminalBuckets = fixedTerminalsByType.get(terminal.type);
      if (!fixedTerminalBuckets || fixedTerminalBuckets.size === 0) {
        continue;
      }
      const movingPoint = getTerminalPoint(node, terminal.id);
      for (const key of neighborBucketKeys(movingPoint)) {
        const fixedTerminals = fixedTerminalBuckets.get(key);
        if (!fixedTerminals) {
          continue;
        }
        for (const target of fixedTerminals) {
          const dx = target.point.x - movingPoint.x;
          const dy = target.point.y - movingPoint.y;
          const distance = Math.hypot(dx, dy);
          if (distance > tolerance || (best && distance >= best.distance)) {
            continue;
          }
          best = {
            movingNodeId: node.id,
            movingTerminalId: terminal.id,
            targetNodeId: target.node.id,
            targetTerminalId: target.terminalId,
            point: target.point,
            delta: { x: dx, y: dy },
            distance,
            kind: "terminal"
          };
        }
      }
    }
  }
  return best;
};

export const applyNodeTerminalSnap = (delta: Point, snapTarget: NodeTerminalSnapTarget | null): Point =>
  snapTarget ? { x: delta.x + snapTarget.delta.x, y: delta.y + snapTarget.delta.y } : delta;

export const pointOnBusForSnap = (bus: ModelNode, point: Point, tolerance = CONNECT_BUS_SNAP_TOLERANCE): Point | null => {
  if (!isBusNode(bus)) {
    return null;
  }
  const radians = degreesToRadians(-bus.rotation);
  const dx = point.x - bus.position.x;
  const dy = point.y - bus.position.y;
  const local = {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
  const halfWidth = (bus.size.width * Math.abs(getNodeScaleX(bus))) / 2;
  const halfHeight = Math.max(4, (bus.size.height * Math.abs(getNodeScaleY(bus))) / 2);
  if (local.x < -halfWidth - tolerance || local.x > halfWidth + tolerance || Math.abs(local.y) > halfHeight + tolerance) {
    return null;
  }
  return projectPointToBusCenterline(bus, point);
};

export const findNodeBusSnapTarget = (
  candidateNodes: ModelNode[],
  movedNodeIds: ReadonlySet<string>,
  tolerance = CONNECT_BUS_SNAP_TOLERANCE
): NodeTerminalSnapTarget | null => {
  if (movedNodeIds.size === 0) {
    return null;
  }
  const movedBuses = candidateNodes.filter((node) => movedNodeIds.has(node.id) && isBusNode(node));
  const fixedBuses = candidateNodes.filter((node) => !movedNodeIds.has(node.id) && isBusNode(node));
  const movedDevices = candidateNodes.filter((node) => movedNodeIds.has(node.id) && !isBusNode(node) && !isStaticNode(node));
  const fixedDevices = candidateNodes.filter((node) => !movedNodeIds.has(node.id) && !isBusNode(node) && !isStaticNode(node));
  let best: NodeTerminalSnapTarget | null = null;
  const inspect = (device: ModelNode, buses: ModelNode[], deviceMoved: boolean) => {
    for (const terminal of device.terminals) {
      const terminalPoint = getTerminalPoint(device, terminal.id);
      for (const bus of buses) {
        if (getBusTerminalType(bus) !== terminal.type) {
          continue;
        }
        const snappedPoint = pointOnBusForSnap(bus, terminalPoint, tolerance);
        if (!snappedPoint) {
          continue;
        }
        const dx = snappedPoint.x - terminalPoint.x;
        const dy = snappedPoint.y - terminalPoint.y;
        const distance = Math.hypot(dx, dy);
        if (distance > tolerance || (best && distance >= best.distance)) {
          continue;
        }
        best = {
          movingNodeId: deviceMoved ? device.id : bus.id,
          movingTerminalId: deviceMoved ? terminal.id : bus.terminals[0]?.id ?? "t1",
          targetNodeId: deviceMoved ? bus.id : device.id,
          targetTerminalId: deviceMoved ? bus.terminals[0]?.id ?? "t1" : terminal.id,
          point: snappedPoint,
          delta: deviceMoved ? { x: dx, y: dy } : { x: -dx, y: -dy },
          distance,
          kind: "bus"
        };
      }
    }
  };
  for (const device of movedDevices) {
    inspect(device, fixedBuses, true);
  }
  for (const device of fixedDevices) {
    inspect(device, movedBuses, false);
  }
  return best;
};

export const SAMPLE_NODES: ModelNode[] = [
  createDefaultNode("ac-source", { x: 190, y: 210 }),
  createDefaultNode("ac-switch", { x: 360, y: 210 }),
  createDefaultNode("ac-bus", { x: 540, y: 210 }),
  createDefaultNode("ac-transformer", { x: 760, y: 210 }),
  createDefaultNode("dc-bus", { x: 1010, y: 210 }),
  createDefaultNode("dc-load", { x: 1210, y: 210 })
].map((node, index) => ({
  ...node,
  id: `seed-${index + 1}`,
  layerId: DEFAULT_MODEL_LAYER_ID,
  name: ["交流电源A", "进线开关", "10kV母线", "双绕组主变", "750V直流母线", "直流负荷"][index]
}));

export const SAMPLE_EDGES: Edge[] = [
  { id: "seed-e1", sourceId: "seed-1", targetId: "seed-2", sourceTerminalId: "t1", targetTerminalId: "t1" },
  { id: "seed-e2", sourceId: "seed-2", targetId: "seed-3", sourceTerminalId: "t2", targetTerminalId: "t1" },
  { id: "seed-e3", sourceId: "seed-3", targetId: "seed-4", sourceTerminalId: "t1", targetTerminalId: "t1" },
  { id: "seed-e4", sourceId: "seed-4", targetId: "seed-5", sourceTerminalId: "t2", targetTerminalId: "t1" },
  { id: "seed-e5", sourceId: "seed-5", targetId: "seed-6", sourceTerminalId: "t1", targetTerminalId: "t1" }
];

export const PROJECT_STORAGE_KEY = "power-system-model-projects";

export const SCHEME_STORAGE_KEY = "power-system-model-schemes";

export const ACTIVE_PROJECT_STORAGE_KEY = "power-system-active-project";

export const DRAFT_PROJECT_STORAGE_KEY = "power-system-current-draft";

export const REFRESH_RECOVERY_STORAGE_KEY = "power-system-refresh-recovery";

export const EMPTY_VOLTAGE_COLOR_KEY_SET = new Set<string>();

export const EMPTY_ID_LIST: string[] = [];

export const EMPTY_EDGE_ID_LIST: string[] = [];

export const EMPTY_MODEL_GROUPS: ModelGroup[] = [];

export const EMPTY_MODEL_GROUP_BY_ID = new Map<string, ModelGroup>();

export const EMPTY_CANVAS_LAYOUT_UNITS: CanvasLayoutUnit[] = [];

export const EMPTY_CANVAS_SELECTION: ReturnType<typeof resolveCanvasSelection> = {
  nodeIds: EMPTY_ID_LIST,
  edgeIds: EMPTY_EDGE_ID_LIST
};

export const IMAGE_STORAGE_KEY = "power-system-image-assets";

export const CUSTOM_DEVICE_LIBRARY_STORAGE_KEY = "power-system-custom-device-library";

export const CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY = "power-system-custom-attribute-libraries";

export const CUSTOM_COMPONENT_TYPES_STORAGE_KEY = "power-system-custom-component-types";

export const DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY = "power-system-device-definition-overrides";

export const CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY = "power-system-custom-graph-template-types";

export const CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY = "power-system-custom-graph-templates";

export const COLOR_DISPLAY_MODE_STORAGE_KEY = "power-system-color-display-mode";

export const COLOR_PALETTE_STORAGE_KEY = "power-system-color-palette";

export const MEASUREMENT_CONFIG_STORAGE_KEY = "power-system-platform-measurements";

export const LEFT_PANEL_MODE_STORAGE_KEY = "power-system-left-panel-mode";

export const RIGHT_PANEL_MODE_STORAGE_KEY = "power-system-right-panel-mode";

export const LEFT_PANEL_WIDTH_STORAGE_KEY = "power-system-left-panel-width";

export const RIGHT_PANEL_WIDTH_STORAGE_KEY = "power-system-right-panel-width";

export const STATUSBAR_HEIGHT_STORAGE_KEY = "power-system-statusbar-height";

export const VALIDATION_PANEL_HEIGHT_STORAGE_KEY = "power-system-validation-panel-height";

export const DEFAULT_GRAPH_TEMPLATE_TYPES = ["常用模板"];

export type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export const scheduleIdleWork = (callback: () => void, delayMs = 0, timeoutMs = 1000) => {
  let cancelled = false;
  let idleHandle: number | null = null;
  const timeoutHandle = window.setTimeout(() => {
    const idleWindow = window as IdleCapableWindow;
    const run = () => {
      if (!cancelled) {
        callback();
      }
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(run, { timeout: timeoutMs });
      return;
    }
    run();
  }, delayMs);
  return () => {
    cancelled = true;
    window.clearTimeout(timeoutHandle);
    if (idleHandle !== null) {
      (window as IdleCapableWindow).cancelIdleCallback?.(idleHandle);
    }
  };
};

export const elementTreeCacheSignature = (
  graphRevision: number,
  layerSignature: string,
  templates: readonly DeviceTemplate[]
) => {
  const templateSignature = templates.map((template) => `${template.kind}:${template.label}`).join("|");
  return `${graphRevision}#${layerSignature}#${templateSignature}`;
};

export type RenderViewportBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type CanvasPanningState = {
  clientX: number;
  clientY: number;
  viewBox: CanvasViewBox;
  canvasOffset: Point;
  scrollLeft: number;
  scrollTop: number;
  horizontalScrollMode: boolean;
  verticalScrollMode: boolean;
} | null;

export type SmartAlignmentGuide = {
  id: string;
  orientation: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
};

export type ConnectionRedrawScope = "selected" | "viewport" | "all";

export const CONNECTION_REDRAW_SCOPE_LABELS: Record<ConnectionRedrawScope, string> = {
  selected: "选中连接线",
  viewport: "视图内连接线",
  all: "全部连接线"
};

export const VOLTAGE_BASE_CLEAR_SCOPES: VoltageBaseClearScope[] = ["selected", "island", "all"];

export const VOLTAGE_BASE_CLEAR_SCOPE_LABELS: Record<VoltageBaseClearScope, string> = {
  selected: "选中设备",
  island: "所在拓扑岛",
  all: "全网"
};

export const VOLTAGE_BASE_SET_SCOPES: VoltageBaseSetScope[] = ["selected", "island"];

export const VOLTAGE_BASE_SET_SCOPE_LABELS: Record<VoltageBaseSetScope, string> = {
  selected: "选中设备",
  island: "所在拓扑岛"
};

export const VOLTAGE_BASE_SET_PRESETS = ["0.4", "6", "10", "35", "66", "110", "220", "330", "500", "750", "1000"];

export type VoltageBaseSetMode = "uniform" | "terminal" | "byDevice";

export type FilterSelectionTypeOption = {
  typeKey: string;
  label: string;
  count: number;
  items: Array<{ itemKey: string; typeKey: string; label: string; count: number; nodeIds: string[] }>;
};

export type WheelZoomAnchor = {
  point: Point;
  cursorOffsetX: number;
  cursorOffsetY: number;
};

export type PendingWheelZoomRequest = {
  anchor: WheelZoomAnchor;
  zoomFactor: number;
};

export type FloatingToolbarPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

export type RectLike = Pick<DOMRectReadOnly, "left" | "right" | "top" | "bottom" | "width" | "height">;

export type SpatialQueryState = {
  mark: number;
  seenById: Map<string, number>;
};

export type NodeSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, ModelNode[]>;
  queryState: SpatialQueryState;
};

export const VIEWPORT_RENDER_PADDING_RATIO = 0.15;

export const VIEWPORT_RENDER_MIN_PADDING = 260;

export const CANVAS_VIEWPORT_QUERY_SNAP_SIZE = 256;

export const NODE_SPATIAL_BUCKET_SIZE = 256;

export const nextSpatialQueryMark = (state: SpatialQueryState) => {
  state.mark += 1;
  if (!Number.isSafeInteger(state.mark)) {
    state.mark = 1;
    state.seenById.clear();
  }
  return state.mark;
};

export const expandViewBoxForRendering = (viewBox: { x: number; y: number; width: number; height: number }): RenderViewportBounds => {
  const padding = Math.max(VIEWPORT_RENDER_MIN_PADDING, Math.max(viewBox.width, viewBox.height) * VIEWPORT_RENDER_PADDING_RATIO);
  return {
    left: viewBox.x - padding,
    right: viewBox.x + viewBox.width + padding,
    top: viewBox.y - padding,
    bottom: viewBox.y + viewBox.height + padding
  };
};

export const snapRenderViewportBoundsForQuery = (
  bounds: RenderViewportBounds,
  snapSize = CANVAS_VIEWPORT_QUERY_SNAP_SIZE
): RenderViewportBounds => ({
  left: Math.floor(bounds.left / snapSize) * snapSize - snapSize,
  right: Math.ceil(bounds.right / snapSize) * snapSize + snapSize,
  top: Math.floor(bounds.top / snapSize) * snapSize - snapSize,
  bottom: Math.ceil(bounds.bottom / snapSize) * snapSize + snapSize
});

export const sameCanvasViewBox = (first: CanvasViewBox, second: CanvasViewBox) =>
  Math.round(first.x) === Math.round(second.x) &&
  Math.round(first.y) === Math.round(second.y) &&
  Math.round(first.width) === Math.round(second.width) &&
  Math.round(first.height) === Math.round(second.height);

export function canvasFrameHasHorizontalScrollableRange(frame: HTMLElement) {
  return frame.scrollWidth - frame.clientWidth > 1;
}

export function canvasFrameHasVerticalScrollableRange(frame: HTMLElement) {
  return frame.scrollHeight - frame.clientHeight > 1;
}

export function canvasFrameHasScrollableRange(frame: HTMLElement) {
  return canvasFrameHasHorizontalScrollableRange(frame) || canvasFrameHasVerticalScrollableRange(frame);
}

export function renderedCanvasFullyFitsFrame(frameRect: RectLike, svgRect: RectLike) {
  return svgRect.width <= frameRect.width + 1 &&
    svgRect.height <= frameRect.height + 1 &&
    svgRect.left >= frameRect.left - 1 &&
    svgRect.right <= frameRect.right + 1 &&
    svgRect.top >= frameRect.top - 1 &&
    svgRect.bottom <= frameRect.bottom + 1;
}

export function canvasFrameViewportSizeChanged(
  frame: Pick<HTMLElement, "clientWidth" | "clientHeight"> | null,
  viewportSize: Pick<CanvasBounds, "width" | "height">
) {
  return Boolean(
    frame &&
    (Math.abs(frame.clientWidth - viewportSize.width) > 1 ||
      Math.abs(frame.clientHeight - viewportSize.height) > 1)
  );
}

export function visibleCanvasViewBoxFromRects(frameRect: RectLike, svgRect: RectLike, viewBox: CanvasViewBox): CanvasViewBox {
  if (svgRect.width <= 0 || svgRect.height <= 0 || viewBox.width <= 0 || viewBox.height <= 0) {
    return viewBox;
  }
  const leftCss = clampNumber(frameRect.left - svgRect.left, 0, svgRect.width);
  const rightCss = clampNumber(frameRect.right - svgRect.left, 0, svgRect.width);
  const topCss = clampNumber(frameRect.top - svgRect.top, 0, svgRect.height);
  const bottomCss = clampNumber(frameRect.bottom - svgRect.top, 0, svgRect.height);
  if (rightCss <= leftCss || bottomCss <= topCss) {
    return viewBox;
  }
  const scaleX = viewBox.width / svgRect.width;
  const scaleY = viewBox.height / svgRect.height;
  return {
    x: viewBox.x + leftCss * scaleX,
    y: viewBox.y + topCss * scaleY,
    width: (rightCss - leftCss) * scaleX,
    height: (bottomCss - topCss) * scaleY
  };
}

export function canvasScrollScaleFromViewBox(viewBox: Pick<CanvasViewBox, "width" | "height">, bounds: CanvasBounds) {
  return {
    x: bounds.width > 0 && viewBox.width > 0 ? bounds.width / viewBox.width : 1,
    y: bounds.height > 0 && viewBox.height > 0 ? bounds.height / viewBox.height : 1
  };
}

export function estimatedViewportNodeScreenSize(
  nodes: readonly ModelNode[],
  scale: { x: number; y: number },
  sampleLimit = CANVAS_LOD_NODE_SCREEN_SAMPLE_LIMIT
) {
  if (nodes.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const step = Math.max(1, Math.ceil(nodes.length / sampleLimit));
  let maxSize = 0;
  let sampled = 0;
  for (let index = 0; index < nodes.length && sampled < sampleLimit; index += step) {
    const node = nodes[index];
    const width = node.size.width * Math.abs(getNodeScaleX(node)) * scale.x;
    const height = node.size.height * Math.abs(getNodeScaleY(node)) * scale.y;
    maxSize = Math.max(maxSize, width, height);
    sampled += 1;
  }
  return maxSize;
}

export function canvasScrollEdgeInset(viewportSize: number) {
  return Math.max(CANVAS_FRAME_INSET, Math.round(viewportSize * CANVAS_SCROLL_EDGE_VIEWPORT_RATIO));
}

export function canvasScrollSurfaceSize(displaySize: number, viewportSize: number, scrollActive: boolean) {
  const edgeInset = scrollActive ? canvasScrollEdgeInset(viewportSize) : CANVAS_FRAME_INSET;
  return Math.max(displaySize + edgeInset * 2, viewportSize);
}

export function canvasDisplayOffset(displaySize: number, surfaceSize: number, viewportSize: number, scrollActive: boolean) {
  return scrollActive
    ? canvasScrollEdgeInset(viewportSize)
    : Math.max(CANVAS_FRAME_INSET, Math.round((surfaceSize - displaySize) / 2));
}

export function canvasFramePaddingOffset(frame: HTMLElement, svg?: SVGSVGElement | null) {
  if (svg) {
    const frameRect = frame.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    return {
      left: Math.max(0, frame.scrollLeft + svgRect.left - frameRect.left),
      top: Math.max(0, frame.scrollTop + svgRect.top - frameRect.top)
    };
  }
  const style = window.getComputedStyle(frame);
  return {
    left: Number.parseFloat(style.paddingLeft || "0") || 0,
    top: Number.parseFloat(style.paddingTop || "0") || 0
  };
}

export function anchoredCanvasScrollPosition(
  anchor: WheelZoomAnchor,
  scale: { x: number; y: number },
  canvasOffset: { left: number; top: number },
  maxScroll: { left: number; top: number }
) {
  return {
    left: clampNumber(canvasOffset.left + anchor.point.x * scale.x - anchor.cursorOffsetX, 0, maxScroll.left),
    top: clampNumber(canvasOffset.top + anchor.point.y * scale.y - anchor.cursorOffsetY, 0, maxScroll.top)
  };
}

export function anchoredCanvasNoScrollOffset(
  anchor: WheelZoomAnchor,
  scale: { x: number; y: number },
  baseDisplayOffset: { left: number; top: number }
) {
  return {
    x: anchor.cursorOffsetX - anchor.point.x * scale.x - baseDisplayOffset.left,
    y: anchor.cursorOffsetY - anchor.point.y * scale.y - baseDisplayOffset.top
  };
}

export function initialVisibleCanvasViewBox(canvasBounds: CanvasBounds, frame: Pick<HTMLElement, "clientWidth" | "clientHeight"> | null): CanvasViewBox {
  const framePadding = CANVAS_FRAME_INSET * 2;
  const visibleWidth = Math.min(
    canvasBounds.width,
    Math.max(1, (frame?.clientWidth ? frame.clientWidth - framePadding : DEFAULT_CANVAS_WIDTH))
  );
  const visibleHeight = Math.min(
    canvasBounds.height,
    Math.max(1, (frame?.clientHeight ? frame.clientHeight - framePadding : DEFAULT_CANVAS_HEIGHT))
  );
  return {
    x: Math.max(0, (canvasBounds.width - visibleWidth) / 2),
    y: Math.max(0, (canvasBounds.height - visibleHeight) / 2),
    width: visibleWidth,
    height: visibleHeight
  };
}

export function fitWholeCanvasViewBox(canvasBounds: CanvasBounds, frame: Pick<HTMLElement, "clientWidth" | "clientHeight"> | null): CanvasViewBox {
  const availableWidth = Math.max(1, (frame?.clientWidth ?? DEFAULT_CANVAS_WIDTH) - CANVAS_FRAME_INSET * 2 - CANVAS_FIT_SCROLLBAR_GUARD);
  const availableHeight = Math.max(1, (frame?.clientHeight ?? DEFAULT_CANVAS_HEIGHT) - CANVAS_FRAME_INSET * 2 - CANVAS_FIT_SCROLLBAR_GUARD);
  const cssScale = Math.max(
    0.0001,
    Math.min(
      20,
      availableWidth / Math.max(1, canvasBounds.width),
      availableHeight / Math.max(1, canvasBounds.height)
    )
  );
  const width = canvasBounds.width / cssScale;
  const height = canvasBounds.height / cssScale;
  return normalizeViewBoxToCanvas({
    x: (canvasBounds.width - width) / 2,
    y: (canvasBounds.height - height) / 2,
    width,
    height
  }, canvasBounds);
}

export const boxesIntersect = (
  first: RenderViewportBounds,
  second: RenderViewportBounds
) => first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;

export const sameRenderViewportBounds = (first: RenderViewportBounds, second: RenderViewportBounds) =>
  first.left === second.left &&
  first.right === second.right &&
  first.top === second.top &&
  first.bottom === second.bottom;

export const VIEWPORT_RESULT_CACHE_LIMIT = 24;

export type ViewportResultCache<T> = {
  ownerRefs: readonly unknown[];
  token: string;
  values: Map<string, T>;
};

export function viewportBoundsCacheKey(bounds: RenderViewportBounds) {
  return `${bounds.left}:${bounds.right}:${bounds.top}:${bounds.bottom}`;
}

export function viewportResultCacheOwnersEqual(first: readonly unknown[], second: readonly unknown[]) {
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

export function resetViewportResultCache<T>(
  cache: ViewportResultCache<T>,
  ownerRefs: readonly unknown[],
  token: string
) {
  cache.ownerRefs = ownerRefs;
  cache.token = token;
  cache.values = new Map();
}

export function readViewportResultCache<T>(
  cache: ViewportResultCache<T>,
  ownerRefs: readonly unknown[],
  token: string,
  key: string
): T | null {
  if (cache.token !== token || !viewportResultCacheOwnersEqual(cache.ownerRefs, ownerRefs)) {
    resetViewportResultCache(cache, ownerRefs, token);
    return null;
  }
  return cache.values.get(key) ?? null;
}

export function writeViewportResultCache<T>(
  cache: ViewportResultCache<T>,
  key: string,
  value: T,
  limit = VIEWPORT_RESULT_CACHE_LIMIT
) {
  if (cache.values.has(key)) {
    cache.values.delete(key);
  }
  cache.values.set(key, value);
  while (cache.values.size > limit) {
    const oldestKey = cache.values.keys().next().value;
    if (typeof oldestKey !== "string") {
      break;
    }
    cache.values.delete(oldestKey);
  }
}

export function mergeRenderViewportBounds(first: RenderViewportBounds, second: RenderViewportBounds): RenderViewportBounds {
  return {
    left: Math.min(first.left, second.left),
    right: Math.max(first.right, second.right),
    top: Math.min(first.top, second.top),
    bottom: Math.max(first.bottom, second.bottom)
  };
}

export type SmartAlignmentAxis = "x" | "y";

export type SmartAlignmentAnchor = {
  key: string;
  value: number;
  priority: number;
};

export type SmartAlignmentAnchorMap = Record<SmartAlignmentAxis, SmartAlignmentAnchor[]>;

export type SmartAlignmentAxisCandidate = {
  id: string;
  bounds: RenderViewportBounds;
  anchors?: SmartAlignmentAnchorMap;
};

export type SmartAlignmentAxisSnap = {
  adjustment: number;
  distance: number;
  priority: number;
  guide: SmartAlignmentGuide;
};

export const smartAlignmentAxisAnchors = (bounds: RenderViewportBounds, axis: SmartAlignmentAxis): SmartAlignmentAnchor[] => axis === "x"
  ? [
      { key: "start", value: bounds.left, priority: 1 },
      { key: "center", value: (bounds.left + bounds.right) / 2, priority: 0 },
      { key: "end", value: bounds.right, priority: 1 }
    ]
  : [
      { key: "start", value: bounds.top, priority: 1 },
      { key: "center", value: (bounds.top + bounds.bottom) / 2, priority: 0 },
      { key: "end", value: bounds.bottom, priority: 1 }
    ];

export function bestSmartAlignmentAxisSnap(
  axis: SmartAlignmentAxis,
  draggedBounds: RenderViewportBounds,
  draggedExtraAnchors: SmartAlignmentAnchor[],
  candidates: SmartAlignmentAxisCandidate[],
  threshold: number
): SmartAlignmentAxisSnap | null {
  let best: SmartAlignmentAxisSnap | null = null;
  const draggedAnchors = [
    ...smartAlignmentAxisAnchors(draggedBounds, axis),
    ...draggedExtraAnchors
  ];
  for (const candidate of candidates) {
    const candidateAnchors = [
      ...smartAlignmentAxisAnchors(candidate.bounds, axis),
      ...(candidate.anchors?.[axis] ?? [])
    ];
    for (const draggedAnchor of draggedAnchors) {
      for (const candidateAnchor of candidateAnchors) {
        const adjustment = candidateAnchor.value - draggedAnchor.value;
        const distance = Math.abs(adjustment);
        const priority = draggedAnchor.priority + candidateAnchor.priority;
        if (distance > threshold) {
          continue;
        }
        if (best && (distance > best.distance || (distance === best.distance && priority >= best.priority))) {
          continue;
        }
        const position = candidateAnchor.value;
        const guide =
          axis === "x"
            ? {
                id: `vertical:${candidate.id}:${candidateAnchor.key}:${draggedAnchor.key}`,
                orientation: "vertical" as const,
                position,
                start: Math.min(draggedBounds.top, candidate.bounds.top) - SMART_ALIGNMENT_GUIDE_PADDING,
                end: Math.max(draggedBounds.bottom, candidate.bounds.bottom) + SMART_ALIGNMENT_GUIDE_PADDING
              }
            : {
                id: `horizontal:${candidate.id}:${candidateAnchor.key}:${draggedAnchor.key}`,
                orientation: "horizontal" as const,
                position,
                start: Math.min(draggedBounds.left, candidate.bounds.left) - SMART_ALIGNMENT_GUIDE_PADDING,
                end: Math.max(draggedBounds.right, candidate.bounds.right) + SMART_ALIGNMENT_GUIDE_PADDING
              };
        best = { adjustment, distance, priority, guide };
      }
    }
  }
  return best;
}

export const nodeRenderBounds = (node: ModelNode): RenderViewportBounds => {
  const labelAwareBounds = calculateNodeVisualBounds(node, 24);
  const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
  const bodyBounds = {
    left: node.position.x - halfDiagonal,
    right: node.position.x + halfDiagonal,
    top: node.position.y - halfDiagonal,
    bottom: node.position.y + halfDiagonal
  };
  return mergeRenderViewportBounds(labelAwareBounds, bodyBounds);
};

export const nodeIntersectsRenderViewport = (node: ModelNode, viewport: RenderViewportBounds) =>
  boxesIntersect(nodeRenderBounds(node), viewport);

export const spatialBucketKey = (x: number, y: number) => `${x}:${y}`;

export const spatialBucketRange = (bounds: RenderViewportBounds, bucketSize: number) => ({
  left: Math.floor(bounds.left / bucketSize),
  right: Math.floor(bounds.right / bucketSize),
  top: Math.floor(bounds.top / bucketSize),
  bottom: Math.floor(bounds.bottom / bucketSize)
});

export function buildNodeSpatialIndex(nodes: ModelNode[], bucketSize = NODE_SPATIAL_BUCKET_SIZE): NodeSpatialIndex {
  const buckets = new Map<string, ModelNode[]>();
  for (const node of nodes) {
    const range = spatialBucketRange(nodeRenderBounds(node), bucketSize);
    for (let x = range.left; x <= range.right; x += 1) {
      for (let y = range.top; y <= range.bottom; y += 1) {
        const key = spatialBucketKey(x, y);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(node);
        } else {
          buckets.set(key, [node]);
        }
      }
    }
  }
  return { bucketSize, buckets, queryState: { mark: 0, seenById: new Map() } };
}

export function queryNodeSpatialIndex(index: NodeSpatialIndex, bounds: RenderViewportBounds): ModelNode[] {
  const range = spatialBucketRange(bounds, index.bucketSize);
  const matches: ModelNode[] = [];
  const queryMark = nextSpatialQueryMark(index.queryState);
  const seenById = index.queryState.seenById;
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(spatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const node of bucket) {
        if (seenById.get(node.id) === queryMark || !nodeIntersectsRenderViewport(node, bounds)) {
          continue;
        }
        seenById.set(node.id, queryMark);
        matches.push(node);
      }
    }
  }
  return matches;
}

export const compactPreviewNodes = (...nodes: Array<ModelNode | null | undefined>): ModelNode[] => {
  const compacted = new Map<string, ModelNode>();
  for (const node of nodes) {
    if (node && !compacted.has(node.id)) {
      compacted.set(node.id, node);
    }
  }
  return Array.from(compacted.values());
};

export const PARAM_LABELS: Record<string, string> = {
  name: "名称",
  schemeName: "所属方案",
  updatedAt: "更新时间",
  canvasWidth: "显示宽度",
  canvasHeight: "显示高度",
  allowAutoExpandCanvas: "允许自动扩界",
  canvasBackgroundColor: "背景色",
  canvasBackgroundImage: "背景图片",
  backgroundProjectId: "背景页面",
  backgroundLayerIds: "背景图层",
  powerUnit: "功率单位",
  voltageUnit: "电压单位",
  currentUnit: "电流单位",
  powerBaseValue: "功率基值",
  p_unit: "功率单位",
  u_unit: "电压单位",
  i_unit: "电流单位",
  p_base: "功率基值",
  nodeNumber: "节点号",
  acTopologyNode: "交流拓扑节点序号",
  dcTopologyNode: "直流拓扑节点序号",
  graph_x: "X坐标",
  graph_y: "Y坐标",
  staticWidth: "宽度",
  staticHeight: "高度",
  allowResizeTransform: "是否允许变形",
  rotation: "旋转角度",
  scaleX: "横向倍率",
  scaleY: "纵向倍率",
  _labelVisible: "显示标识",
  _labelDisplayMode: "标识显示方式",
  _labelText: "标识内容",
  _labelX: "标识X偏移",
  _labelY: "标识Y偏移",
  _labelColor: "标识颜色",
  _labelFontFamily: "标识字体",
  _labelFontSize: "标识字号",
  _labelFontWeight: "标识字重",
  _labelFontStyle: "标识字体样式",
  _labelTextDecoration: "标识文字修饰",
  _labelTextAnchor: "标识对齐",
  _labelRotation: "标识方向",
  terminalCount: "端子数量",
  terminalVbase: "端子电压基值",
  ratedCapacity: "额定容量",
  ratedVoltage: "额定电压",
  frequency: "频率",
  shortCircuitCapacity: "短路容量",
  controlType: "控制类型",
  cutInWindSpeed: "切入风速",
  ratedWindSpeed: "额定风速",
  cutOutWindSpeed: "切出风速",
  ratedActivePower: "额定有功",
  pv0: "pv0系数",
  pv1: "pv1系数",
  pv2: "pv2系数",
  ratedReactivePower: "额定无功",
  qv0: "qv0系数",
  qv1: "qv1系数",
  qv2: "qv2系数",
  resistancePu: "电阻（标幺值）",
  reactancePu: "电抗（标幺值）",
  halfChargingSusceptancePu: "半充电电纳（标幺值）",
  magnetizingConductancePu: "励磁电导（标幺值）",
  magnetizingSusceptancePu: "励磁电纳（标幺值）",
  tapRatio: "分接头档位/变比",
  highRatedCapacity: "高压侧额定容量",
  highResistancePu: "高压侧电阻（标幺值）",
  highReactancePu: "高压侧电抗（标幺值）",
  highMagnetizingConductancePu: "高压侧励磁电导（标幺值）",
  highMagnetizingSusceptancePu: "高压侧励磁电纳（标幺值）",
  highTapRatio: "高压侧分接头档位/变比",
  mediumRatedCapacity: "中压侧额定容量",
  mediumResistancePu: "中压侧电阻（标幺值）",
  mediumReactancePu: "中压侧电抗（标幺值）",
  mediumMagnetizingConductancePu: "中压侧励磁电导（标幺值）",
  mediumMagnetizingSusceptancePu: "中压侧励磁电纳（标幺值）",
  mediumTapRatio: "中压侧分接头档位/变比",
  lowRatedCapacity: "低压侧额定容量",
  lowResistancePu: "低压侧电阻（标幺值）",
  lowReactancePu: "低压侧电抗（标幺值）",
  lowMagnetizingConductancePu: "低压侧励磁电导（标幺值）",
  lowMagnetizingSusceptancePu: "低压侧励磁电纳（标幺值）",
  lowTapRatio: "低压侧分接头档位/变比",
  sourceEquivalentResistance: "首端等值电阻",
  targetEquivalentResistance: "末端等值电阻",
  sourceControlType: "首端控制类型",
  targetControlType: "末端控制类型",
  i_control_type: "首端控制类型",
  j_control_type: "末端控制类型",
  acControlType: "AC端控制类型",
  dcControlType: "DC端控制类型",
  closedStatus: "闭合状态",
  status: "运行状态",
  run_stat: "工作状态",
  backgroundImage: "背景图片",
  backgroundImageAssetId: "背景图片资产",
  foregroundColor: "前景色",
  foregroundImage: "前景图片",
  foregroundImageAssetId: "前景图片资产",
  fillColor: "背景色",
  strokeColor: "线条颜色",
  textColor: "文字颜色",
  lineWidth: "线条宽度",
  fontSize: "字号",
  fontFamily: "字体",
  fontWeight: "字重",
  fontStyle: "字体样式",
  textDecoration: "文字修饰",
  strokeStyle: "边框样式",
  text: "文字内容",
  cornerRadius: "圆角半径",
  accentColor: "强调色",
  shadowEnabled: "阴影",
  padding: "内边距",
  textAlign: "水平对齐",
  verticalAlign: "垂直对齐",
  markerStart: "首端标记",
  markerEnd: "末端标记",
  arrowSize: "箭头尺寸",
  handleColor: "端口颜色",
  handleSize: "端口大小",
  routeAvoidance: "参与连接线避障",
  layerId: "所属图层",
  buttonEnabled: "按钮功能",
  buttonActionType: "按钮动作",
  buttonTargetSchemeId: "目标方案",
  buttonTargetProjectId: "目标模型",
  buttonTargetProjectName: "目标模型名称",
  buttonTargetLayerId: "目标图层",
  buttonTargetLayerName: "目标图层名称",
  buttonTargetLayerIds: "目标图层",
  buttonTargetLayerNames: "目标图层名称",
  buttonCommand: "执行命令",
  vbase: "电压等级",
  highVbase: "高压侧电压等级",
  mediumVbase: "中压侧电压等级",
  lowVbase: "低压侧电压等级",
  sourceVbase: "首端电压等级",
  targetVbase: "末端电压等级",
  i_vbase: "首端电压等级",
  j_vbase: "末端电压等级",
  voltageLevel: "电压等级",
  section: "母线分段",
  pole: "极性",
  source_file: "参数来源文件",
  component_type: "元件类型",
  idx: "外部序号",
  node: "节点号",
  i_node: "首端节点号",
  j_node: "末端节点号",
  ac_node: "交流侧节点号",
  dc_node: "直流侧节点号",
  voltage: "电压初值",
  angle: "电压相角",
  isl: "孤岛标志",
  control_type: "控制类型",
  p_set: "有功设定值",
  q_set: "无功设定值",
  p_ac_set: "交流侧有功设定值",
  q_ac_set: "交流侧无功设定值",
  v_set: "电压设定值",
  v_ac_set: "交流侧电压设定值",
  v_dc_set: "直流电压设定值",
  i_v_set: "首端电压设定值",
  j_v_set: "末端电压设定值",
  i_set: "电流设定值",
  i_q_set: "首端无功设定值",
  j_q_set: "末端无功设定值",
  alpha: "调节系数",
  shift: "相移角",
  r: "电阻（标幺值）",
  x_pu: "电抗（标幺值）",
  x: "电抗（标幺值）",
  b: "半充电电纳（标幺值）",
  gt: "励磁电导（标幺值）",
  bt: "励磁电纳（标幺值）",
  tap: "分接头档位/变比",
  r1: "首端等值电阻",
  r2: "末端等值电阻",
  g_set: "电导设定值",
  b_set: "电纳设定值",
  pbase: "有功基准",
  qbase: "无功基准"
};

export const FONT_FAMILY_OPTIONS = ["Arial", "Microsoft YaHei", "SimSun", "KaiTi", "SimHei"];

export const FONT_FAMILY_OPTION_LABELS: Record<string, string> = {
  Arial: "Arial",
  "Microsoft YaHei": "微软雅黑",
  SimSun: "宋体",
  KaiTi: "楷体",
  SimHei: "黑体"
};

export const PARAM_OPTIONS: Record<string, string[]> = {
  controlType: ["PV", "PQ", "PH", "P", "V"],
  control_type: ["PV", "PQ", "PH", "P", "V", "I", "Q", "Z", "DCV", "ACV", "ACP", "PQQ"],
  sourceControlType: ["定P", "定V", "定I", "定PQ", "定PV", "定PH", "不定"],
  targetControlType: ["定P", "定V", "定I", "定PQ", "定PV", "定PH", "不定"],
  i_control_type: ["CTRL_P", "CTRL_V", "CTRL_I", "SLACK"],
  j_control_type: ["CTRL_P", "CTRL_V", "CTRL_I", "SLACK"],
  acControlType: ["定PQ", "定PV", "定PH", "不定"],
  dcControlType: ["定P", "定V", "定I", "不定"],
  closedStatus: ["闭合", "打开"],
  status: ["1", "0"],
  run_stat: ["1", "0"],
  fontFamily: FONT_FAMILY_OPTIONS,
  _labelFontFamily: FONT_FAMILY_OPTIONS,
  _labelDisplayMode: ["always", "hidden", "follow"],
  _labelVisible: ["1", "0"],
  _labelTextAnchor: ["start", "middle", "end"],
  _labelRotation: ["0", "90", "180", "270"],
  _labelFontStyle: ["normal", "italic"],
  _labelTextDecoration: ["none", "underline"],
  _labelFontWeight: ["400", "500", "700", "900"],
  fontWeight: ["400", "700", "900"],
  fontStyle: ["normal", "italic"],
  textDecoration: ["none", "underline"],
  strokeStyle: ["solid", "dashed", "dotted"],
  shadowEnabled: ["1", "0"],
  textAlign: ["left", "center", "right"],
  verticalAlign: ["top", "middle", "bottom"],
  markerStart: ["none", "arrow", "dot"],
  markerEnd: ["none", "arrow", "dot"],
  allowResizeTransform: ["1", "0"],
  buttonEnabled: ["1", "0"],
  buttonActionType: ["none", "project", "layer", "command"],
  buttonCommand: ["none", "save", "fitCanvas", "centerSelected", "fitSelection", "runTopology", "zoomIn", "zoomOut", "resetZoom"],
  routeAvoidance: ["1", "0"]
};

export const STATIC_BUTTON_ACTION_LABELS: Record<string, string> = {
  none: "无动作",
  project: "模型切换",
  layer: "图层切换",
  command: "命令执行"
};

export const STATIC_BUTTON_COMMAND_LABELS: Record<string, string> = {
  none: "无命令",
  save: "保存模型",
  fitCanvas: "适配全画布",
  centerSelected: "居中选中",
  fitSelection: "缩放到选中区域",
  runTopology: "图上拓扑",
  zoomIn: "放大",
  zoomOut: "缩小",
  resetZoom: "重置缩放"
};

export const PARAM_OPTION_LABELS: Record<string, Record<string, string>> = {
  fontFamily: FONT_FAMILY_OPTION_LABELS,
  _labelFontFamily: FONT_FAMILY_OPTION_LABELS,
  _labelDisplayMode: { always: "始终显示", hidden: "始终隐藏", follow: "跟随显示" },
  _labelVisible: { "1": "显示", "0": "隐藏" },
  _labelTextAnchor: { start: "左对齐", middle: "居中", end: "右对齐" },
  _labelRotation: { "0": "0° 横排", "90": "90° 纵排", "180": "180° 横排", "270": "270° 纵排" },
  _labelFontStyle: { normal: "常规", italic: "斜体" },
  _labelTextDecoration: { none: "无", underline: "下划线" },
  _labelFontWeight: { "400": "常规", "500": "中等", "700": "加粗", "900": "特粗" },
  allowResizeTransform: { "1": "允许", "0": "不允许" },
  buttonEnabled: { "1": "启用", "0": "禁用" },
  buttonActionType: STATIC_BUTTON_ACTION_LABELS,
  buttonCommand: STATIC_BUTTON_COMMAND_LABELS,
  routeAvoidance: { "1": "参与", "0": "不参与" },
  shadowEnabled: { "1": "启用", "0": "禁用" },
  status: { "1": "闭合", "0": "打开" },
  run_stat: { "1": "投运", "0": "停运" },
  strokeStyle: { solid: "实线", dashed: "虚线", dotted: "点线" },
  fontStyle: { normal: "常规", italic: "斜体" },
  textDecoration: { none: "无", underline: "下划线" },
  textAlign: { left: "左对齐", center: "居中", right: "右对齐" },
  verticalAlign: { top: "顶部", middle: "居中", bottom: "底部" },
  markerStart: { none: "无", arrow: "箭头", dot: "圆点" },
  markerEnd: { none: "无", arrow: "箭头", dot: "圆点" }
};

export const parseStaticButtonTargetLayerValues = (value?: string) => {
  const text = value?.trim();
  if (!text) {
    return [];
  }
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map((item) => String(item).trim()).filter(Boolean)));
      }
    } catch {
      // Fall through to legacy delimiter parsing.
    }
  }
  return Array.from(new Set(text.split(/[,\n;|]/).map((item) => item.trim()).filter(Boolean)));
};

export const serializeStaticButtonTargetLayerIds = (layerIds: string[]) => JSON.stringify(layerIds);

export const resolveStaticButtonTargetLayers = (node: ModelNode, availableLayers: ModelLayer[]) => {
  const layerById = new Map(availableLayers.map((layer) => [layer.id, layer]));
  const layerByName = new Map(availableLayers.map((layer) => [layer.name.trim(), layer]));
  const targetLayerIds = parseStaticButtonTargetLayerValues(node.params.buttonTargetLayerIds);
  const targetLayerNames = parseStaticButtonTargetLayerValues(node.params.buttonTargetLayerNames);
  const legacyTargetLayerId = node.params.buttonTargetLayerId?.trim();
  const legacyTargetLayerName = node.params.buttonTargetLayerName?.trim();
  const idCandidates = targetLayerIds.length > 0 ? targetLayerIds : legacyTargetLayerId ? [legacyTargetLayerId] : [];
  const nameCandidates = targetLayerNames.length > 0 ? targetLayerNames : legacyTargetLayerName ? [legacyTargetLayerName] : [];
  const selectedLayers: ModelLayer[] = [];
  const selectedLayerIds = new Set<string>();
  const addLayer = (layer?: ModelLayer) => {
    if (!layer || selectedLayerIds.has(layer.id)) {
      return;
    }
    selectedLayerIds.add(layer.id);
    selectedLayers.push(layer);
  };
  for (const layerId of idCandidates) {
    addLayer(layerById.get(layerId));
  }
  for (const layerName of nameCandidates) {
    addLayer(layerByName.get(layerName));
  }
  return selectedLayers;
};

export function paramOptionsForSection(key: string, section?: string) {
  if (key === "control_type" && section === "ACGenerator") {
    return [...AC_GENERATOR_CONTROL_TYPES];
  }
  if (key === "control_type" && section === "DCGenerator") {
    return [...DC_GENERATOR_CONTROL_TYPES];
  }
  if (key === "control_type" && section === "DCACConverter") {
    return [...DCAC_CONVERTER_CONTROL_TYPES];
  }
  if (key === "control_type" && section === "ACACConverter") {
    return [...ACAC_CONVERTER_CONTROL_TYPES];
  }
  return PARAM_OPTIONS[key];
}

export const READONLY_E_PARAM_KEYS = new Set(["idx", "node", "i_node", "j_node", "ac_node", "dc_node"]);

export const BATCH_PARAM_EXCLUDED_KEYS = new Set([
  "idx",
  "name",
  "graph_x",
  "graph_y",
  "layerId",
  "terminalCount",
  "component_type",
  "is_container",
  ALLOW_RESIZE_TRANSFORM_PARAM,
  "node",
  "i_node",
  "j_node",
  "ac_node",
  "dc_node",
  "_labelText",
  "_labelX",
  "_labelY",
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY
]);

export const BATCH_PARAM_EXCLUDED_PREFIXES = [
  "_routableLine",
  "idx_"
];

export const canBatchEditParam = (key: string) =>
  Boolean(key) &&
  !BATCH_PARAM_EXCLUDED_KEYS.has(key) &&
  !BATCH_PARAM_EXCLUDED_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
  !READONLY_E_PARAM_KEYS.has(key) &&
  !/(^|_)node$/i.test(key) &&
  !/_node$/i.test(key);

export const BATCH_GRAPH_PARAM_KEYS = new Set([
  "layerId",
  "staticWidth",
  "staticHeight",
  "rotation",
  "scaleX",
  "scaleY",
  "backgroundImage",
  "backgroundImageAssetId",
  "foregroundColor",
  "foregroundImage",
  "foregroundImageAssetId",
  "fillColor",
  "strokeColor",
  "textColor",
  "lineWidth",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "strokeStyle",
  "text",
  "cornerRadius",
  "accentColor",
  "shadowEnabled",
  "padding",
  "textAlign",
  "verticalAlign",
  "markerStart",
  "markerEnd",
  "arrowSize",
  "handleColor",
  "handleSize",
  "routeAvoidance"
]);

export const BATCH_GRAPH_PARAM_PREFIXES = [
  "_label",
  "button"
];

export const isBatchGraphCommonParamKey = (key: string) =>
  BATCH_GRAPH_PARAM_KEYS.has(key) ||
  BATCH_GRAPH_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix));

export const isRedundantBatchCommonParamRow = (row: BatchCommonParamRow, availableKeys: Set<string>) => {
  if (row.key === "buttonTargetSchemeId" || row.key === "buttonTargetProjectName") {
    return availableKeys.has("buttonTargetProjectId");
  }
  if (row.key === "buttonTargetLayerId") {
    return availableKeys.has("buttonTargetLayerIds");
  }
  if (row.key === "buttonTargetLayerName") {
    return availableKeys.has("buttonTargetLayerIds") || availableKeys.has("buttonTargetLayerId");
  }
  if (row.key === "buttonTargetLayerNames") {
    return availableKeys.has("buttonTargetLayerIds");
  }
  return false;
};

export const COLOR_PARAM_KEY_PATTERN = /color$/i;

export const isColorParamKey = (key: string) => COLOR_PARAM_KEY_PATTERN.test(key);

export const BATCH_MEASUREMENT_GROUP_KEYS: BatchCommonMeasurementGroupKey[] = [
  "visible",
  "layout",
  "labelVisible",
  "unitVisible",
  "backgroundVisible",
  "backgroundColor",
  "borderStyle",
  "borderColor",
  "borderWidth"
];

export const BATCH_MEASUREMENT_GROUP_LABELS: Record<BatchCommonMeasurementGroupKey, string> = {
  visible: "量测显示",
  layout: "量测布局",
  labelVisible: "标签显示",
  unitVisible: "单位显示",
  backgroundVisible: "背景显示",
  backgroundColor: "背景颜色",
  borderStyle: "边框样式",
  borderColor: "边框颜色",
  borderWidth: "边框宽度"
};

export const measurementGroupCommonValue = (group: MeasurementGroup, key: BatchCommonMeasurementGroupKey) => {
  switch (key) {
    case "visible":
      return group.visible ? "1" : "0";
    case "layout":
      return group.layout;
    case "labelVisible":
      return group.labelVisible === false ? "0" : "1";
    case "unitVisible":
      return group.unitVisible === false ? "0" : "1";
    case "backgroundVisible":
      return group.backgroundColor === "transparent" ? "0" : "1";
    case "backgroundColor":
      return group.backgroundColor ?? "#ffffff";
    case "borderStyle":
      return group.borderStyle ?? "solid";
    case "borderColor":
      return group.borderColor ?? "#64748b";
    case "borderWidth":
      return String(group.borderWidth ?? 1);
    default:
      return "";
  }
};

export const measurementGroupWithCommonSetting = (
  group: MeasurementGroup,
  key: BatchCommonMeasurementGroupKey,
  value: string
): MeasurementGroup => {
  switch (key) {
    case "visible":
      return { ...group, visible: value === "1" };
    case "layout":
      return { ...group, layout: value as MeasurementGroup["layout"] };
    case "labelVisible":
      return { ...group, labelVisible: value === "1" };
    case "unitVisible":
      return { ...group, unitVisible: value === "1" };
    case "backgroundVisible":
      return {
        ...group,
        backgroundColor: value === "1"
          ? group.backgroundColor === "transparent" ? "#ffffff" : group.backgroundColor ?? "#ffffff"
          : "transparent"
      };
    case "backgroundColor":
      return { ...group, backgroundColor: value || "#ffffff" };
    case "borderStyle":
      return {
        ...group,
        borderStyle: value as MeasurementGroup["borderStyle"],
        borderWidth: group.borderWidth ?? 1
      };
    case "borderColor":
      return { ...group, borderColor: value || "#64748b" };
    case "borderWidth":
      return { ...group, borderWidth: clampNumber(Number(value), 0, 12) };
    default:
      return group;
  }
};

export function normalizeLegacyPowerSystemLabel(value: string) {
  return value.replace(/电力系统/g, "电力能源系统");
}

export function normalizeSavedProjectIndexes(project: SavedProjectRecord): SavedProjectRecord {
  const normalizedName = normalizeLegacyPowerSystemLabel(project.name);
  const normalizedProject = normalizeProjectLayers({
    ...project.project,
    name: normalizeLegacyPowerSystemLabel(project.project.name ?? normalizedName),
    nodes: project.project.nodes.map(normalizeNodeTerminalsByTemplate)
  });
  return {
    ...project,
    name: normalizedName,
    project: normalizedProject
  };
}

export function normalizeSavedSchemeIndexes(scheme: SavedSchemeRecord): SavedSchemeRecord {
  return {
    ...scheme,
    name: normalizeLegacyPowerSystemLabel(scheme.name),
    projects: Array.isArray(scheme.projects)
      ? normalizeSavedProjectRecordNames(scheme.projects.map(normalizeSavedProjectIndexes))
      : [],
    children: Array.isArray(scheme.children)
      ? scheme.children.map(normalizeSavedSchemeIndexes)
      : []
  };
}

export function normalizeStoredDraftProject(parsed: DraftProjectState): DraftProjectState | null {
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    return null;
  }
  return {
    ...parsed,
    projectName: normalizeLegacyPowerSystemLabel(parsed.projectName),
    ...normalizeProjectLayers({
      version: 1,
      name: parsed.projectName,
      layers: parsed.layers,
      activeLayerId: parsed.activeLayerId,
      groups: parsed.groups,
      measurements: parsed.measurements,
      nodes: parsed.nodes.map(normalizeNodeTerminalsByTemplate),
      edges: parsed.edges
    }),
    activeProjectKey: parsed.activeProjectKey,
    activeSchemeKey: parsed.activeSchemeKey,
    canvasWidth: parsed.canvasWidth,
    canvasHeight: parsed.canvasHeight,
    allowAutoExpandCanvas: parsed.allowAutoExpandCanvas,
    canvasBackgroundColor: parsed.canvasBackgroundColor,
    canvasBackgroundImage: parsed.canvasBackgroundImage,
    canvasBackgroundImageAssetId: parsed.canvasBackgroundImageAssetId,
    backgroundProjectId: parsed.backgroundProjectId,
    backgroundLayerIds: parsed.backgroundLayerIds,
    powerUnit: parsed.powerUnit,
    voltageUnit: parsed.voltageUnit,
    currentUnit: parsed.currentUnit,
    powerBaseValue: parsed.powerBaseValue,
    deviceIndexCounters: parsed.deviceIndexCounters
  };
}

export function readActiveProjectPointer(): ActiveProjectPointer | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ActiveProjectPointer;
    const activeProjectName = typeof parsed.activeProjectName === "string" ? parsed.activeProjectName : "";
    const activeSchemePath = Array.isArray(parsed.activeSchemePath)
      ? parsed.activeSchemePath.filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      : [];
    if (!activeProjectName) {
      return null;
    }
    return {
      activeProjectName,
      activeSchemePath
    };
  } catch {
    return null;
  }
}

export function savedSchemePathForId(
  schemes: SavedSchemeRecord[],
  schemeId: string,
  parentPath: string[] = []
): string[] | null {
  for (const scheme of schemes) {
    const path = [...parentPath, scheme.name];
    if (scheme.id === schemeId) {
      return path;
    }
    const childPath = savedSchemePathForId(scheme.children ?? [], schemeId, path);
    if (childPath) {
      return childPath;
    }
  }
  return null;
}

export function findSavedSchemeByPath(
  schemes: SavedSchemeRecord[],
  schemePath: string[]
): SavedSchemeRecord | undefined {
  if (schemePath.length === 0) {
    return undefined;
  }
  const [head, ...tail] = schemePath;
  const scheme = schemes.find((item) => item.name.trim() === head.trim());
  if (!scheme || tail.length === 0) {
    return scheme;
  }
  return findSavedSchemeByPath(scheme.children ?? [], tail);
}

export function findSavedProjectByActivePointer(
  schemes: SavedSchemeRecord[],
  pointer: ActiveProjectPointer | null
): { scheme: SavedSchemeRecord; project: SavedProjectRecord } | null {
  const projectName = pointer?.activeProjectName?.trim();
  if (!projectName) {
    return null;
  }
  const projectNameKey = savedProjectRecordNameKey(projectName);
  const activeSchemePath = pointer?.activeSchemePath ?? [];
  const preferredScheme = findSavedSchemeByPath(schemes, activeSchemePath);
  const searchSchemes = preferredScheme
    ? [preferredScheme, ...flattenSavedSchemes(schemes).filter((scheme) => scheme.id !== preferredScheme.id)]
    : flattenSavedSchemes(schemes);
  for (const scheme of searchSchemes) {
    const project = scheme.projects.find((item) => savedProjectRecordNameKey(item.name) === projectNameKey);
    if (project) {
      return { scheme, project };
    }
  }
  return null;
}

export function activeProjectPointerPayload(
  schemes: SavedSchemeRecord[],
  projectKey: string,
  schemeKey: string
): ActiveProjectPointer | null {
  if (!projectKey) {
    return null;
  }
  const found = findSavedProjectRecordInSchemes(schemes, projectKey, schemeKey);
  if (!found) {
    return null;
  }
  return {
    activeProjectName: found.project.name,
    activeSchemePath: savedSchemePathForId(schemes, found.scheme.id) ?? [found.scheme.name]
  };
}

export function draftProjectFromSavedSchemes(
  schemes: SavedSchemeRecord[],
  pointer: ActiveProjectPointer | null
): DraftProjectState | null {
  if (!pointer?.activeProjectName) {
    return null;
  }
  const found = findSavedProjectByActivePointer(schemes, pointer);
  if (found) {
    const { scheme, project: record } = found;
    return normalizeStoredDraftProject({
      projectName: record.project.name ?? record.name,
      activeProjectKey: record.id,
      activeSchemeKey: scheme.id,
      canvasWidth: record.project.canvasWidth,
      canvasHeight: record.project.canvasHeight,
      allowAutoExpandCanvas: record.project.allowAutoExpandCanvas,
      canvasBackgroundColor: record.project.canvasBackgroundColor,
      canvasBackgroundImage: record.project.canvasBackgroundImage,
      canvasBackgroundImageAssetId: record.project.canvasBackgroundImageAssetId,
      backgroundProjectId: record.project.backgroundProjectId,
      backgroundLayerIds: record.project.backgroundLayerIds,
      powerUnit: record.project.powerUnit,
      voltageUnit: record.project.voltageUnit,
      currentUnit: record.project.currentUnit,
      powerBaseValue: record.project.powerBaseValue,
      deviceIndexCounters: record.project.deviceIndexCounters,
      layers: record.project.layers,
      activeLayerId: record.project.activeLayerId,
      groups: record.project.groups,
      measurements: record.project.measurements,
      nodes: record.project.nodes,
      edges: record.project.edges
    });
  }
  return null;
}

export function readRefreshRecoveryProject(): DraftProjectState | null {
  try {
    const raw = window.sessionStorage.getItem(REFRESH_RECOVERY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as RefreshRecoveryProjectState;
    if (!parsed.dirty) {
      return null;
    }
    return normalizeStoredDraftProject(parsed);
  } catch {
    return null;
  }
}

export function writeRefreshRecoveryProject(state: RefreshRecoveryProjectState) {
  try {
    window.sessionStorage.setItem(REFRESH_RECOVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 恢复缓存只是防止页面自动刷新丢失未保存内容，写入失败不阻断编辑。
  }
}

export function clearRefreshRecoveryProject() {
  try {
    window.sessionStorage.removeItem(REFRESH_RECOVERY_STORAGE_KEY);
  } catch {
    // 忽略浏览器会话缓存不可写/不可删的情况。
  }
}

export function readImageAssets(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(IMAGE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveImageAsset(id: string, dataUrl: string) {
  const assets = readImageAssets();
  window.localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify({ ...assets, [id]: dataUrl }));
}

export function resolveNodeImage(node: ModelNode, assets = readImageAssets()) {
  const assetId = node.params.backgroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.backgroundImage || "";
}

export function resolveNodeForegroundImage(node: ModelNode, assets = readImageAssets()) {
  const assetId = node.params.foregroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.foregroundImage || "";
}

export function resolveProjectImage(project: Pick<ProjectFile, "canvasBackgroundImage" | "canvasBackgroundImageAssetId">, assets = readImageAssets()) {
  const assetId = project.canvasBackgroundImageAssetId;
  return (assetId && assets[assetId]) || project.canvasBackgroundImage || "";
}

export const imageAssetsToMap = (assets: ImageAsset[]) =>
  Object.fromEntries(assets.map((asset) => [asset.id, asset.url]));

export const localImageAssetsFromStorage = (): ImageAsset[] =>
  Object.entries(readImageAssets()).map(([id, url], index) => ({ id, name: `本地图片 ${index + 1}`, folderId: "root", url }));

export function pointsToPreviewPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${Math.round(point.x)} ${Math.round(point.y)}`).join(" ");
}

export const backendJsonHeaders = { "content-type": "application/json" };

export async function backendErrorMessage(response: Response, fallbackMessage: string) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.error === "string" ? payload.error : fallbackMessage;
}

export async function fetchBackendJson<T>(url: string, fallbackMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, fallbackMessage));
  }
  return (await response.json()) as T;
}

export function backendJsonRequest(method: "POST" | "PUT" | "DELETE", body: string): RequestInit {
  return {
    method,
    headers: backendJsonHeaders,
    body
  };
}

export async function fetchBackendImageFolders(): Promise<ImageFolder[]> {
  return fetchBackendJson<ImageFolder[]>("/api/image-folders", "读取后台图片文件夹失败。");
}

export async function createBackendImageFolder(name: string): Promise<ImageFolder> {
  return fetchBackendJson<ImageFolder>(
    "/api/image-folders",
    "新建图片文件夹失败。",
    backendJsonRequest("POST", JSON.stringify({ name }))
  );
}

export async function renameBackendImageFolder(folderId: string, name: string): Promise<ImageFolder> {
  return fetchBackendJson<ImageFolder>(
    `/api/image-folders/${encodeURIComponent(folderId)}`,
    "重命名图片文件夹失败。",
    backendJsonRequest("PUT", JSON.stringify({ name }))
  );
}

export async function deleteBackendImageFolder(folderId: string): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(`/api/image-folders/${encodeURIComponent(folderId)}`, "删除图片文件夹失败。", {
    method: "DELETE"
  });
}

export async function fetchBackendImages(folderId = "root"): Promise<ImageAsset[]> {
  return fetchBackendJson<ImageAsset[]>(`/api/images?folderId=${encodeURIComponent(folderId)}`, "读取后台图片列表失败。");
}

export async function fetchAllBackendImages(): Promise<ImageAsset[]> {
  return fetchBackendJson<ImageAsset[]>("/api/images", "读取后台图片列表失败。");
}

export async function uploadBackendImage(fileName: string, dataUrl: string, folderId = "root"): Promise<ImageAsset> {
  return fetchBackendJson<ImageAsset>(
    "/api/images",
    "上传图片到后台失败。",
    backendJsonRequest("POST", JSON.stringify({ name: fileName, dataUrl, folderId }))
  );
}

export async function importBackendIconLibraryFile(fileName: string, dataUrl: string, folderId = "root"): Promise<ImageAsset[]> {
  const payload = await fetchBackendJson<{ assets?: ImageAsset[] }>(
    "/api/icon-library/import",
    "导入图标库文件失败。",
    backendJsonRequest("POST", JSON.stringify({ name: fileName, dataUrl, folderId }))
  );
  return Array.isArray(payload.assets) ? payload.assets : [];
}
