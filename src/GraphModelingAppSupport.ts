import { ChangeEvent, DragEvent, Fragment, Suspense, lazy, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent, type CSSProperties, type SetStateAction, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
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
import { createMeasurementRuntimeStore, type MeasurementRuntimeStore } from "./measurementRuntimeStore";
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
import { useCanvasAuxiliaryRenderers, useCanvasLodRenderLayers } from "./useCanvasRenderLayers";
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

export const ENABLE_REACT_FLOW_PREVIEW = import.meta.env.DEV;

export const ReactFlowPreview = ENABLE_REACT_FLOW_PREVIEW ? lazy(() => import("./ReactFlowPreview")) : null;


export function useMeasurementRuntimeSnapshot(store: MeasurementRuntimeStore) {
  const [, forceVersion] = useState(0);
  useEffect(() => store.subscribe(() => forceVersion((value) => value + 1)), [store]);
  return store.getSnapshot();
}


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
  ".terminal-dot",
  ".canvas-floating-toolbar"
].join(", ");

export const CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR = [
  ".floating-side-panel",
  ".side-panel-edge-trigger"
].join(", ");


export function normalizeInteractionMode(value: unknown): InteractionMode {
  return value === "edit" ? "edit" : "browse";
}


export function isCanvasGraphicContextMenuTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(CANVAS_GRAPHIC_CONTEXT_MENU_TARGET_SELECTOR));
}


export function isCanvasWheelZoomExcludedTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(CANVAS_WHEEL_ZOOM_EXCLUSION_SELECTOR));
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


export function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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


export function normalizeRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}


export function snapSingleTerminalAnchorToNearestSide(node: ModelNode, point: Point): Point {
  const radians = (-normalizeRotationDegrees(node.rotation) * Math.PI) / 180;
  const dx = point.x - node.position.x;
  const dy = point.y - node.position.y;
  const local = {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
  const signedWidth = node.size.width * (getNodeScaleX(node) || 1);
  const signedHeight = node.size.height * (getNodeScaleY(node) || 1);
  const candidates: Point[] = [
    { x: 0.5, y: 0 },
    { x: -0.5, y: 0 },
    { x: 0, y: 0.5 },
    { x: 0, y: -0.5 }
  ];
  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const candidateLocal = {
      x: candidate.x * signedWidth,
      y: candidate.y * signedHeight
    };
    const distance = (local.x - candidateLocal.x) ** 2 + (local.y - candidateLocal.y) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return { ...best };
}


export const formatInspectorScaleValue = (value: number) => Number.isFinite(value) ? value.toFixed(3) : "1.000";


export function rotatePointAround(point: Point, center: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
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
  const radians = (-normalizeRotationDegrees(rotation) * Math.PI) / 180;
  const localVector = {
    x: screenAxis.x * Math.cos(radians) - screenAxis.y * Math.sin(radians),
    y: screenAxis.x * Math.sin(radians) + screenAxis.y * Math.cos(radians)
  };
  return Math.abs(localVector.x) >= Math.abs(localVector.y) ? "scale-x" : "scale-y";
}


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
  canvasPoint?: Point;
  nodeId?: string;
  edgeId?: string;
  routePoints?: Point[];
} | null;

export type NodeLabelDisplayMode = "always" | "hidden" | "follow";

export const NODE_LABEL_DISPLAY_MODES: Array<{ value: NodeLabelDisplayMode; label: string }> = [
  { value: "always", label: "始终显示" },
  { value: "hidden", label: "始终隐藏" },
  { value: "follow", label: "跟随显示" }
];

export type UnsavedChangeAction = {
  kind: "load-project";
  project: SavedProjectRecord;
  schemeId: string;
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
  importedScheme: SavedSchemeRecord;
  importedName: string;
  duplicateSchemeId: string;
  duplicateSchemeName: string;
  targetParentSchemeId?: string;
} | null;

export type SidePanelResizeState = { side: SidePanelSide; startX: number; startWidth: number } | null;

export type StatusbarResizeState = { startY: number; startHeight: number } | null;

export type ValidationPanelResizeState = { startY: number; startHeight: number } | null;

export type CanvasResizeEdge = "right" | "bottom" | "corner" | "left" | "top" | "top-left" | "top-right" | "bottom-left";

export type CanvasResizePreviewMetrics = {
  edge: CanvasResizeEdge;
  startWidth: number;
  startHeight: number;
  startDisplayWidth: number;
  startDisplayHeight: number;
  startDisplayOffsetX: number;
  startDisplayOffsetY: number;
};

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

export type CanvasResizePreviewRect = { left: number; top: number; width: number; height: number };

export type CanvasResizeCommitAnchor = {
  edge: CanvasResizeEdge;
  desiredRect: CanvasResizePreviewRect;
};

export type CanvasBoundsScrollAnchor = {
  left: number;
  top: number;
  visualRect?: CanvasResizePreviewRect;
};

export type CanvasResizeCommitScrollTarget = {
  left: number;
  top: number;
  deltaX: number;
  deltaY: number;
  affectsX: boolean;
  affectsY: boolean;
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
      edgeId: string;
      segmentIndex: number;
      orientation: "horizontal" | "vertical";
      startPoint: Point;
      originalManualPoints: Point[];
      originalRoutePoints: Point[];
      previewRoutePoints?: Point[];
      historyCaptured?: boolean;
    }
  | {
      edgeId: string;
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
  startMoves: boolean;
  endMoves: boolean;
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
  edgeRoutes: { edgeId: string; path: string }[];
  dynamicEdgePreviewEdges: Edge[];
  movedNodeIds: Set<string>;
  draggedEdgeIds: Set<string>;
  movedBusNodeIds: Set<string>;
  simplifiedMarkup?: string;
};

export type NodeDragPreviewRoute = {
  edgeId: string;
  path: string;
  color: string;
};

export type SingleNodeDeferredRepairOptions = {
  reconcileTerminalConnections?: boolean;
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
};

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
};

export type UndoGraphPatchScope = {
  nodeIds?: readonly string[];
  edgeIds?: readonly string[];
};

export type UndoGraphSnapshotPatchPlan =
  | { mode: "full"; dirtyEdgeIds: Set<string> }
  | { mode: "patch"; nodeIds: string[]; edgeIds: string[]; dirtyEdgeIds: Set<string> };

export type ImageTarget =
  | { kind: "node"; nodeId: string }
  | { kind: "nodeForeground"; nodeId: string }
  | { kind: "canvas" };

export type CanvasRenderOptions = CanvasBounds & {
  backgroundColor?: string;
  backgroundImage?: string;
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: ColorPalette;
  layers?: ModelLayer[];
  activeLayerId?: string;
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
};

export type CustomDeviceDraft = {
  attributeLibraryName: string;
  componentType: string;
  componentName: string;
  backgroundImage: string;
  terminalCount: number;
  terminalTypes: TerminalType[];
  terminalRoles: ContainerTerminalRole[];
  terminalAssociations: ContainerTerminalAssociationValue[];
  isContainer: boolean;
  params: CustomParamDraft[];
  error: string;
};

export type TemplateDialogState = {
  sourceGroupId: string;
  clipboard: CanvasClipboard;
  sourceSize: { width: number; height: number };
} | null;

export type DeviceDefinitionDraftRow = DeviceParameterDefinition & {
  id: string;
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

export const MOVE_BOUNDARY_GUARD = 8;

export const CANVAS_AUTO_EXPAND_PADDING = 96;

export const CANVAS_FRAME_INSET = 16;

export const CANVAS_SCROLL_EDGE_VIEWPORT_RATIO = 1 / 3;

export const CANVAS_FIT_SCROLLBAR_GUARD = 4;

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

export const TERMINAL_OVERLAP_DEFER_NODE_THRESHOLD = 600;

export const CONNECTION_HIT_SCREEN_TOLERANCE = 18;

export const CANVAS_MULTI_NODE_DRAG_OVERLAY_DETAIL_LIMIT = 24;

export const CANVAS_MULTI_NODE_DRAG_PREVIEW_EDGE_LIMIT = 32;

export const CANVAS_MULTI_NODE_DRAG_SNAP_NODE_LIMIT = 96;

export const SMART_ALIGNMENT_SNAP_SCREEN_TOLERANCE = 8;

export const SMART_ALIGNMENT_GUIDE_PADDING = 36;

export const CANVAS_SINGLE_NODE_DRAG_PREVIEW_EDGE_LIMIT = 24;

export const CANVAS_SINGLE_NODE_DRAG_SNAP_EDGE_LIMIT = 48;

export const CANVAS_SINGLE_NODE_DRAG_SYNC_EDGE_LIMIT = 12;

export const CANVAS_SINGLE_NODE_DRAG_PREVIEW_PADDING = 160;

export const CONTEXT_MENU_AUTO_HIDE_MARGIN = 28;

export const TRANSFORM_ROTATE_STEM_START = 12;

export const TRANSFORM_ROTATE_STEM_END = 36;

export const TRANSFORM_ROTATE_HANDLE_GAP = 42;

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

export const POWER_UNIT_OPTIONS = ["W", "kW", "MW"];

export const VOLTAGE_UNIT_OPTIONS = ["V", "kV"];

export const CURRENT_UNIT_OPTIONS = ["A", "kA"];

export const DEFAULT_ATTRIBUTE_LIBRARIES: AttributeLibrary[] = ["静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"];

export const CUSTOM_ATTRIBUTE_LIBRARY_BASES: AttributeLibrary[] = ["交流设备", "直流设备", "氢能设备", "热能设备"];

export const PROTECTED_ATTRIBUTE_LIBRARIES = new Set(CUSTOM_ATTRIBUTE_LIBRARY_BASES);

export const DEVICE_TYPE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

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
  { value: "enum", label: "枚举量" }
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
  const radians = (-bus.rotation * Math.PI) / 180;
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

export const CUSTOM_DEVICE_LIBRARY_STORAGE_KEY = "power-system-custom-device-library";

export const CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY = "power-system-custom-attribute-libraries";

export const CUSTOM_COMPONENT_TYPES_STORAGE_KEY = "power-system-custom-component-types";

export const DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY = "power-system-device-definition-overrides";

export const CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY = "power-system-custom-graph-template-types";

export const CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY = "power-system-custom-graph-templates";

export const COLOR_DISPLAY_MODE_STORAGE_KEY = "power-system-color-display-mode";

export const COLOR_PALETTE_STORAGE_KEY = "power-system-color-palette";

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

export type CanvasViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
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

export type VoltageBaseSetMode = "uniform" | "terminal";

export type WheelZoomAnchor = {
  point: Point;
  cursorOffsetX: number;
  cursorOffsetY: number;
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
  const leftCss = Math.max(0, Math.min(svgRect.width, frameRect.left - svgRect.left));
  const rightCss = Math.max(0, Math.min(svgRect.width, frameRect.right - svgRect.left));
  const topCss = Math.max(0, Math.min(svgRect.height, frameRect.top - svgRect.top));
  const bottomCss = Math.max(0, Math.min(svgRect.height, frameRect.bottom - svgRect.top));
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

export function canvasResizeAnchoredDisplayOffset(offset: number, drag: CanvasResizeState, axis: "x" | "y", displaySize: number) {
  if (!drag) {
    return Math.round(offset);
  }
  if (canvasResizeEdgeAnchorsStart(drag.edge, axis)) {
    const startDisplaySize = axis === "x" ? drag.startDisplayWidth : drag.startDisplayHeight;
    const startDisplayOffset = axis === "x" ? drag.startDisplayOffsetX : drag.startDisplayOffsetY;
    return Math.round(startDisplayOffset - (displaySize - startDisplaySize));
  }
  return Math.round(axis === "x" ? drag.startDisplayOffsetX : drag.startDisplayOffsetY);
}

export function canvasResizeKeepsScrollRange(drag: CanvasResizeState, axis: "x" | "y") {
  if (!drag) {
    return false;
  }
  return axis === "x" ? drag.startHorizontalScrollbarsActive : drag.startVerticalScrollbarsActive;
}

export function clampCanvasNoScrollOffset(
  offset: number,
  displaySize: number,
  viewportSize: number,
  baseOffset: number,
  scrollActive: boolean
) {
  if (scrollActive || viewportSize <= 0 || displaySize <= 0) {
    return 0;
  }
  const firstEdgePosition = viewportSize * CANVAS_SCROLL_EDGE_VIEWPORT_RATIO;
  const secondEdgePosition = viewportSize * (1 - CANVAS_SCROLL_EDGE_VIEWPORT_RATIO) - displaySize;
  const minLeft = Math.min(firstEdgePosition, secondEdgePosition);
  const maxLeft = Math.max(firstEdgePosition, secondEdgePosition);
  return clampNumber(baseOffset + offset, minLeft, maxLeft) - baseOffset;
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
  status: "开关状态",
  run_stat: "运行状态",
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
  fontWeight: ["400", "700", "900"],
  fontStyle: ["normal", "italic"],
  textDecoration: ["none", "underline"],
  strokeStyle: ["solid", "dashed", "dotted"],
  shadowEnabled: ["1", "0"],
  textAlign: ["left", "center", "right"],
  verticalAlign: ["top", "middle", "bottom"],
  markerStart: ["none", "arrow", "dot"],
  markerEnd: ["none", "arrow", "dot"],
  buttonEnabled: ["1", "0"],
  buttonActionType: ["none", "project", "layer", "command"],
  buttonCommand: ["none", "save", "fitCanvas", "centerSelected", "fitSelection", "runTopology", "zoomIn", "zoomOut", "resetZoom"]
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
  buttonEnabled: { "1": "启用", "0": "禁用" },
  buttonActionType: STATIC_BUTTON_ACTION_LABELS,
  buttonCommand: STATIC_BUTTON_COMMAND_LABELS,
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


export function pointsToPreviewPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${Math.round(point.x)} ${Math.round(point.y)}`).join(" ");
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
  return Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback)));
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


export function libraryTemplateMatchesSearch(template: DeviceTemplate, group: string, section: string, needle: string) {
  if (!needle) {
    return true;
  }
  return [group, section, componentTypeDisplayName(section), template.label, template.kind, template.params?.component_type]
    .filter((value): value is string => typeof value === "string")
    .some((value) => normalizeLibrarySearchText(value).includes(needle));
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


export function normalizeCustomDeviceTemplates(value: unknown): DeviceTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is DeviceTemplate => Boolean(item && typeof item === "object"))
    .map((item) => ({
      ...item,
      kind: String((item as DeviceTemplate).kind ?? ""),
      label: String((item as DeviceTemplate).label ?? (item as DeviceTemplate).kind ?? ""),
      attributeLibrary: normalizeAttributeLibraryName(String((item as DeviceTemplate).attributeLibrary ?? "自定义属性库")),
      size: (item as DeviceTemplate).size ?? { width: 96, height: 62 },
      params: (item as DeviceTemplate).params ?? {},
      terminalType: ((item as DeviceTemplate).terminalType ?? "ac") as TerminalType,
      terminalCount: Math.max(0, Math.min(4, Number((item as DeviceTemplate).terminalCount ?? 0))),
      terminalTypes: ((item as DeviceTemplate).terminalTypes ?? []).slice(0, 4) as TerminalType[],
      terminalLabels: ((item as DeviceTemplate).terminalLabels ?? []).slice(0, 4),
      terminalRoles: ((item as DeviceTemplate).terminalRoles ?? []).slice(0, 4) as ContainerTerminalRole[],
      terminalAssociations: ((item as DeviceTemplate).terminalAssociations ?? []).slice(0, 4) as ContainerTerminalAssociationValue[],
      isContainer: Boolean((item as DeviceTemplate).isContainer),
      custom: true,
      parameterDefinitions: normalizeDefinitionRows((item as DeviceTemplate).parameterDefinitions ?? [])
    }))
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
      const valueType = (["integer", "float", "string", "enum"].includes((item as DeviceParameterDefinition).valueType)
        ? (item as DeviceParameterDefinition).valueType
        : "string") as DeviceParameterValueType;
      return {
        cnName,
        enName,
        valueType,
        typicalValue: String((item as DeviceParameterDefinition).typicalValue ?? ""),
        readonly: Boolean((item as DeviceParameterDefinition).readonly)
      };
    })
    .filter((item) => item.enName && item.enName !== "is_container");
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
      overrides[normalizedKind] = {
        kind: normalizedKind,
        params: Object.fromEntries(
          Object.entries(override.params ?? {}).map(([key, val]) => [key, String(val ?? "")])
        ),
        parameterDefinitions: normalizeDefinitionRows(override.parameterDefinitions),
        updatedAt: typeof override.updatedAt === "string" ? override.updatedAt : undefined
      };
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
  return Math.max(min, Math.min(max, Math.round(value)));
}


export function readStoredPanelDimension(storageKey: string, fallback: number, min: number, max: number) {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(value) ? clampPanelDimension(value, min, max) : fallback;
  } catch {
    return fallback;
  }
}


export function customParamId() {
  return `param-${Math.random().toString(36).slice(2, 9)}`;
}


export function deviceDefinitionRowId() {
  return `def-${Math.random().toString(36).slice(2, 9)}`;
}


export function fallbackComponentTypeForAttributeLibrary(attributeLibraryName: string) {
  const normalized = normalizeAttributeLibraryName(attributeLibraryName);
  if (normalized.includes("静态")) return "StaticBasicShape";
  if (normalized.includes("直流")) return "DCLoad";
  if (normalized.includes("变流")) return "DCDCConverter";
  if (normalized.includes("氢")) return "HydroLoad";
  if (normalized.includes("热")) return "HeatLoad";
  return "ACLoad";
}


export function resolveTemplateComponentType(template: DeviceTemplate) {
  const inferred = inferESection(template.kind, template.params);
  if (inferred) {
    return inferred;
  }
  return fallbackComponentTypeForAttributeLibrary(template.attributeLibrary);
}


export function createDefinitionDraftRows(template: DeviceTemplate): DeviceDefinitionDraftRow[] {
  return getTemplateParameterDefinitions(template)
    .filter((definition) => definition.enName !== "component_type" && definition.enName !== "is_container")
    .map((definition) => ({
      ...definition,
      cnName: definition.cnName === definition.enName ? PARAM_LABELS[definition.enName] ?? definition.cnName : definition.cnName,
      id: deviceDefinitionRowId()
    }));
}


export function createEmptyCustomDeviceDraft(attributeLibraryName = "交流设备"): CustomDeviceDraft {
  return {
    attributeLibraryName,
    componentType: fallbackComponentTypeForAttributeLibrary(attributeLibraryName),
    componentName: "",
    backgroundImage: "",
    terminalCount: 2,
    terminalTypes: ["ac", "ac", "ac", "ac"],
    terminalRoles: ["single-load", "single-load", "single-load", "single-load"],
    terminalAssociations: ["ac-load", "ac-load", "ac-load", "ac-load"],
    isContainer: false,
    params: [],
    error: ""
  };
}


export function defaultContainerAssociationForTerminalType(type: TerminalType): ContainerTerminalAssociationType {
  return CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type][0].value;
}


export function isAssociationAllowedForTerminal(type: TerminalType, association: ContainerTerminalAssociationValue): association is ContainerTerminalAssociationType {
  return Boolean(association && CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type].some((option) => option.value === association));
}


export function normalizeContainerTerminalAssociations(
  terminalTypes: TerminalType[],
  terminalAssociations: ContainerTerminalAssociationValue[],
  terminalCount: number
): ContainerTerminalAssociationValue[] {
  const next = terminalAssociations.slice(0, terminalCount);
  while (next.length < terminalCount) {
    next.push(defaultContainerAssociationForTerminalType(terminalTypes[next.length] ?? "ac"));
  }
  for (let index = 0; index < terminalCount; index += 1) {
    if (index > 0 && isDoubleContainerTerminalAssociation(next[index - 1])) {
      next[index] = "";
      continue;
    }
    const type = terminalTypes[index] ?? "ac";
    if (!isAssociationAllowedForTerminal(type, next[index])) {
      next[index] = defaultContainerAssociationForTerminalType(type);
    }
  }
  return next;
}


export function customDefaultDefinitions(
  terminalTypes: TerminalType[],
  options: {
    isContainer?: boolean;
    terminalRoles?: ContainerTerminalRole[];
    terminalAssociations?: ContainerTerminalAssociationValue[];
  } = {}
): DeviceParameterDefinition[] {
  return buildDefaultDeviceParameterDefinitions(terminalTypes, options);
}


export function generateCustomDeviceImage(label: string, terminalTypes: TerminalType[]) {
  const first = terminalTypes[0] ?? "ac";
  const color = terminalColor(first);
  const safeLabel = escapeXml(label || "Unit");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="18" fill="#f8fafc"/><circle cx="70" cy="80" r="38" fill="${color}" fill-opacity="0.14"/><path d="M48 80h44M70 58v44" stroke="${color}" stroke-width="9" stroke-linecap="round"/><text x="132" y="77" font-family="Arial, Microsoft YaHei" font-size="22" font-weight="700" fill="#0f172a">${safeLabel}</text><text x="132" y="104" font-family="Arial" font-size="15" fill="${color}">${terminalTypes.map((type) => type.toUpperCase()).join(" / ")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}


export function parseCustomDefinitions(params: Record<string, string>): DeviceParameterDefinition[] {
  try {
    const parsed = JSON.parse(params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]");
    return normalizeDefinitionRows(parsed);
  } catch {
    return [];
  }
}


export function screenToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: clientX, y: clientY };
  }
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
}


export function constrainPointToOrthogonalAxis(start: Point, point: Point): Point {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: start.y };
  }
  return { x: start.x, y: point.y };
}


export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}


export type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    id?: string;
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};


export type DirectoryFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void> | void;
    close: () => Promise<void> | void;
  }>;
};


export type WritableDirectoryHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryFileHandle>;
};


export type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<WritableDirectoryHandle>;
};


export type TextSaveOptions = {
  filename: string;
  text: string;
  mime: string;
  description: string;
  extensions: string[];
};


export const EXPORT_SAVE_PICKER_ID = "model-export";

export const SCHEME_EXPORT_DIRECTORY_PICKER_ID = "scheme-export";


export function isPickerAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}


export async function saveTextFile(options: TextSaveOptions) {
  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (typeof picker !== "function") {
    downloadText(options.filename, options.text, options.mime);
    return;
  }
  try {
    const handle = await picker.call(window, {
      // Chromium uses this id to reopen the save dialog in the last directory used for this export purpose.
      id: EXPORT_SAVE_PICKER_ID,
      suggestedName: options.filename,
      types: [
        {
          description: options.description,
          accept: {
            [options.mime]: options.extensions
          }
        }
      ],
      excludeAcceptAllOption: false
    });
    const writable = await handle.createWritable();
    await writable.write(new Blob([options.text], { type: options.mime }));
    await writable.close();
  } catch (error) {
    if (isPickerAbort(error)) {
      return;
    }
    window.alert("保存文件失败，已改为浏览器下载。");
    downloadText(options.filename, options.text, options.mime);
  }
}


export const writeTextFileToDirectory = async (
  directoryHandle: WritableDirectoryHandle,
  filename: string,
  text: string,
  mime: string
) => {
  const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([text], { type: mime }));
  await writable.close();
};


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


export function numericNodeParam(node: ModelNode, key: string, fallback: number) {
  const parsed = Number(node.params[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}


export function nodeLabelOffset(node: ModelNode): Point {
  return {
    x: numericNodeParam(node, "_labelX", 0),
    y: numericNodeParam(node, "_labelY", Math.round(node.size.height / 2 + 22))
  };
}


export const nodeLabelText = (node: ModelNode) => node.params._labelText ?? node.name;


export const nodeLabelVisible = (node: ModelNode) => !isStaticNode(node) && node.params._labelVisible !== "0";


export function normalizeNodeLabelDisplayMode(value: string | undefined): NodeLabelDisplayMode {
  return value === "always" || value === "hidden" || value === "follow" ? value : "follow";
}


export const nodeLabelDisplayMode = (node: ModelNode): NodeLabelDisplayMode => {
  const mode = node.params._labelDisplayMode;
  if (mode === "always" || mode === "hidden" || mode === "follow") {
    return mode;
  }
  return node.params._labelVisible === "0" ? "hidden" : "follow";
};


export const nodeLabelShouldRender = (node: ModelNode, globalVisible: boolean) => {
  if (!nodeLabelVisible(node)) {
    return false;
  }
  const mode = nodeLabelDisplayMode(node);
  return mode === "always" || (mode === "follow" && globalVisible);
};


export function normalizeNodeLabelRotation(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  const snapped = Math.round((Number.isFinite(parsed) ? parsed : 0) / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}


export const nodeLabelVertical = (node: ModelNode) => {
  const rotation = normalizeNodeLabelRotation(node.params._labelRotation);
  return rotation === 90 || rotation === 270;
};


export const nodeLabelNumericTokenPattern = String.raw`\d+(?:[./:：-]\d+)*`;

export const nodeLabelNumericTokenRegex = new RegExp(`^${nodeLabelNumericTokenPattern}`);


export function nodeLabelVerticalSegments(text: string) {
  const segments: Array<{ text: string; numeric: boolean }> = [];
  let remaining = text;
  while (remaining) {
    const numericMatch = remaining.match(nodeLabelNumericTokenRegex);
    if (numericMatch?.[0]) {
      segments.push({ text: numericMatch[0], numeric: true });
      remaining = remaining.slice(numericMatch[0].length);
      continue;
    }
    const [char] = Array.from(remaining);
    if (!char) {
      break;
    }
    segments.push({ text: char, numeric: false });
    remaining = remaining.slice(char.length);
  }
  return segments;
}


export function nodeLabelVerticalTokenY(index: number, count: number, node: ModelNode) {
  const step = nodeLabelFontSize(node) * 1.2;
  return (index - (count - 1) / 2) * step;
}


export const nodeLabelTransform = (node: ModelNode) => {
  const offset = nodeLabelOffset(node);
  const scaleX = Math.abs(getNodeScaleX(node)) || 1;
  const scaleY = Math.abs(getNodeScaleY(node)) || 1;
  return `translate(${formatSvgNumber(offset.x * scaleX)} ${formatSvgNumber(offset.y * scaleY)})`;
};


export function nodeLabelCanvasCenter(node: ModelNode): Point {
  const offset = nodeLabelOffset(node);
  return {
    x: node.position.x + offset.x * (Math.abs(getNodeScaleX(node)) || 1),
    y: node.position.y + offset.y * (Math.abs(getNodeScaleY(node)) || 1)
  };
}


export const nodeLabelRotationFromPoint = (center: Point, point: Point) =>
  normalizeNodeLabelRotation((Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90);


export function nodeLabelTextAnchor(node: ModelNode) {
  const anchor = node.params._labelTextAnchor;
  return anchor === "start" || anchor === "end" || anchor === "middle" ? anchor : "middle";
}


export function nodeLabelFontSize(node: ModelNode) {
  const baseSize = numericNodeParam(node, "_labelFontSize", 12);
  const scaleX = Math.abs(getNodeScaleX(node)) || 1;
  const scaleY = Math.abs(getNodeScaleY(node)) || 1;
  return baseSize * Math.sqrt(scaleX * scaleY);
}


export function nodeLabelTextStyle(node: ModelNode): CSSProperties {
  return {
    fill: node.params._labelColor || "#334155",
    fontFamily: node.params._labelFontFamily || "Arial",
    fontSize: nodeLabelFontSize(node),
    fontWeight: node.params._labelFontWeight || "500",
    fontStyle: node.params._labelFontStyle || "normal",
    textDecoration: node.params._labelTextDecoration || "none",
    writingMode: nodeLabelVertical(node) ? "vertical-rl" : "horizontal-tb",
    textOrientation: nodeLabelVertical(node) ? "upright" : undefined,
    userSelect: "none"
  };
}


export function nodeLabelVerticalTokenStyle(node: ModelNode): CSSProperties {
  return {
    ...nodeLabelTextStyle(node),
    writingMode: "horizontal-tb",
    textOrientation: "mixed"
  };
}


export function nodeTransformedHalfExtents(node: ModelNode, includeUprightContent = false) {
  const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
  const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
  const radians = (node.rotation * Math.PI) / 180;
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


export function buildSvgNodeLabelTextMarkup(node: ModelNode) {
  const text = nodeLabelText(node);
  if (!text) {
    return "";
  }
  const baseAttributes = `dominant-baseline="middle" fill="${escapeXml(node.params._labelColor || "#334155")}" font-family="${escapeXml(node.params._labelFontFamily || "Arial")}" font-size="${formatSvgNumber(nodeLabelFontSize(node))}" font-weight="${escapeXml(node.params._labelFontWeight || "500")}" font-style="${escapeXml(node.params._labelFontStyle || "normal")}" text-decoration="${escapeXml(node.params._labelTextDecoration || "none")}" paint-order="stroke" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linejoin="round"`;
  if (nodeLabelVertical(node)) {
    return nodeLabelVerticalSegments(text)
      .map(
        (segment, index) =>
          `<text class="node-label-vertical-token ${segment.numeric ? "numeric" : ""}" x="0" y="${formatSvgNumber(nodeLabelVerticalTokenY(index, nodeLabelVerticalSegments(text).length, node))}" text-anchor="middle" ${baseAttributes} style="writing-mode: horizontal-tb; text-orientation: mixed; letter-spacing: 0;">${escapeXml(segment.text)}</text>`
      )
      .join("");
  }
  return `<text x="0" y="0" text-anchor="${escapeXml(nodeLabelTextAnchor(node))}" ${baseAttributes} style="writing-mode: horizontal-tb;">${escapeXml(text)}</text>`;
}


export function buildSvgNodeLabelMarkup(node: ModelNode) {
  const text = nodeLabelText(node);
  if (!nodeLabelShouldRender(node, true) || !text) {
    return "";
  }
  return `<g class="export-node-label ${nodeLabelVertical(node) ? "vertical" : "horizontal"}" transform="${nodeLabelTransform(node)}">${buildSvgNodeLabelTextMarkup(node)}</g>`;
}


export function svgDisplayAttribute(visible: boolean) {
  return visible ? "" : ' style="display:none"';
}


export function exportSvgLayerScriptMarkup(includeScript: boolean) {
  if (!includeScript) {
    return "";
  }
  return `<style><![CDATA[
.export-static-button { cursor: pointer; }
.export-static-button.export-active-layer-button { filter: drop-shadow(0 0 5px rgba(37, 99, 235, 0.42)); }
]]></style>
<script><![CDATA[
(function () {
  const root = document.currentScript && document.currentScript.ownerSVGElement;
  if (!root) {
    return;
  }
  const layerState = Object.create(null);
  const layerDefs = root.querySelectorAll("[data-export-layer-def]");
  layerDefs.forEach((layer) => {
    const id = layer.getAttribute("data-export-layer-def");
    if (id) {
      layerState[id] = layer.getAttribute("data-export-layer-visible") !== "0";
    }
  });
  function exportSvgLayerVisible(layerId) {
    return !layerId || layerState[layerId] !== false;
  }
  function exportSvgApplyLayerVisibility() {
    root.querySelectorAll("[data-export-node-id][data-export-layer-id]").forEach((node) => {
      const layerId = node.getAttribute("data-export-layer-id") || "";
      node.style.display = exportSvgLayerVisible(layerId) ? "" : "none";
    });
    root.querySelectorAll("[data-export-edge-id]").forEach((edge) => {
      const sourceLayerId = edge.getAttribute("data-export-source-layer-id") || "";
      const targetLayerId = edge.getAttribute("data-export-target-layer-id") || "";
      edge.style.display = exportSvgLayerVisible(sourceLayerId) && exportSvgLayerVisible(targetLayerId) ? "" : "none";
    });
    const activeLayerId = root.getAttribute("data-export-active-layer-id") || "";
    root.querySelectorAll("[data-export-button-action='layer']").forEach((button) => {
      const targetLayerIds = exportSvgButtonTargetLayerIds(button);
      button.classList.toggle("export-active-layer-button", targetLayerIds.includes(activeLayerId));
    });
  }
  function exportSvgButtonTargetLayerIds(button) {
    const encodedLayerIds = button.getAttribute("data-export-button-target-layer-ids") || button.getAttribute("data-export-button-target-layer-id") || "";
    return encodedLayerIds.split(",").map((id) => id.trim()).filter(Boolean);
  }
  function exportSvgActivateLayers(layerIds) {
    const validLayerIds = layerIds.filter((layerId) => layerId && layerId in layerState);
    if (validLayerIds.length === 0) {
      return;
    }
    const targetLayerIdSet = new Set(validLayerIds);
    Object.keys(layerState).forEach((layerId) => {
      layerState[layerId] = targetLayerIdSet.has(layerId);
    });
    root.setAttribute("data-export-active-layer-id", validLayerIds[0]);
    exportSvgApplyLayerVisibility();
  }
  function exportSvgActivateLayer(layerId) {
    exportSvgActivateLayers([layerId]);
  }
  root.exportSvgApplyLayerVisibility = exportSvgApplyLayerVisibility;
  root.exportSvgActivateLayer = exportSvgActivateLayer;
  root.exportSvgActivateLayers = exportSvgActivateLayers;
  root.querySelectorAll("[data-export-button-action='layer']").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetLayerIds = exportSvgButtonTargetLayerIds(button);
      exportSvgActivateLayers(targetLayerIds);
    });
  });
  exportSvgApplyLayerVisibility();
})();
]]></script>`;
}


export function buildSvgDocument(nodes: ModelNode[], edges: Edge[], canvasSize: CanvasRenderOptions = { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }) {
  const imageAssets = readImageAssets();
  const backgroundColor = canvasSize.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND;
  const backgroundImage = canvasSize.backgroundImage ?? "";
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
      return `<g class="export-edge" data-export-edge-id="${escapeXml(route.edgeId)}" data-export-source-layer-id="${escapeXml(sourceLayerId)}" data-export-target-layer-id="${escapeXml(targetLayerId)}"${svgDisplayAttribute(edgeVisible)}>
<path d="${route.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${internalConnectors ? `\n${internalConnectors}` : ""}
</g>`;
    })
    .join("\n");
  const nodeMarkup = exportNodes
    .map((node) => {
      const layerId = nodeLayerId(node);
      const targetLayerIds = resolveExportLayerButtonTargetIds(node);
      const exportButtonAttributes = targetLayerIds.length > 0
        ? ` data-export-button-action="layer" data-export-button-target-layer-id="${escapeXml(targetLayerIds[0])}" data-export-button-target-layer-ids="${escapeXml(targetLayerIds.join(","))}"`
        : "";
      const exportButtonClass = targetLayerIds.length > 0 ? " export-static-button" : "";
      const imageHref = resolveNodeImage(node, imageAssets);
      const foregroundHref = resolveNodeForegroundImage(node, imageAssets);
      const allowNodeImage = !isBusNode(node);
      const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette }));
      const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette }));
      const escapedImageHref = escapeXml(imageHref);
      const escapedForegroundHref = escapeXml(foregroundHref);
      const geometryTransform = nodeGeometryTransform(node);
      const uprightTransform = nodeUprightScaleTransform(node);
      const imageMarkup = imageHref
        ? `<image href="${escapedImageHref}" x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" preserveAspectRatio="xMidYMid slice"/>`
        : "";
      const foregroundMarkup = foregroundHref
        ? `<image href="${escapedForegroundHref}" x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" preserveAspectRatio="xMidYMid slice"/>`
        : "";
      const imageCoverMarkup =
        imageHref && allowNodeImage && !isStaticNode(node)
          ? `<rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="8" fill="#ffffff" stroke="none"/>`
          : "";
      const terminalMarkup = buildSvgTerminalMarkup(node, colorDisplayMode, colorPalette);
      const labelMarkup = buildSvgNodeLabelMarkup(node);
      return `<g class="export-node${exportButtonClass}" transform="translate(${node.position.x} ${node.position.y})" data-export-node-id="${escapeXml(node.id)}" data-export-layer-id="${escapeXml(layerId)}"${exportButtonAttributes}${svgDisplayAttribute(layerVisible(layerId))}>
  <title>${escapeXml(node.name)}</title>
  <g class="export-node-geometry" transform="${geometryTransform}">
  ${glyphMarkup}
  ${glyphTextMarkup}
  </g>
  <g class="export-node-upright-content" transform="${uprightTransform}">
  ${isStaticNode(node) ? imageMarkup : ""}
  ${imageCoverMarkup}
  ${allowNodeImage && !isStaticNode(node) ? imageMarkup : ""}
  ${allowNodeImage ? foregroundMarkup : ""}
  </g>
  <g class="export-node-terminals" transform="${geometryTransform}">
  ${terminalMarkup}
  </g>
  ${labelMarkup}
</g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.width}" height="${canvasSize.height}" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}" data-export-active-layer-id="${escapeXml(activeExportLayerId)}">
<g class="export-layer-definitions" style="display:none">
${exportLayerDefinitionsMarkup}
</g>
<rect width="100%" height="100%" fill="${backgroundColor}"/>
${backgroundImage ? `<image href="${backgroundImage}" x="0" y="0" width="${canvasSize.width}" height="${canvasSize.height}" preserveAspectRatio="xMidYMid slice"/>` : ""}
${edgeMarkup}
${nodeMarkup}
${exportSvgLayerScriptMarkup(includeLayerScript)}
</svg>`;
}
