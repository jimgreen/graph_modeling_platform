import { ChangeEvent, DragEvent, Fragment, Suspense, isValidElement, lazy, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent, type CSSProperties, type ReactNode, type SetStateAction, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Cable,
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
  X
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
  canvasResizeBoundsFromPointerDrag,
  clampEdgeGeometryToBounds,
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
  containerRelationNameKey,
  CUSTOM_DEVICE_TEMPLATE_KEY,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  DEFAULT_COLOR_PALETTE,
  describeContainerTerminalAssociations,
  deleteNodesWithConnectedEdges,
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
  getTerminalDisplayColor,
  boundaryBusInternalConnectorSegment,
  boundaryBusInternalConnectorStrokeWidth,
  getElementFocusPoint,
  getMovableRouteSegmentIndexes,
  getBusTerminalType,
  getContainerTerminalAssociationSourceIndex,
  getSwitchVisualState,
  isInteractiveStaticDrawingKind,
  getEParameterKeys,
  getEParamValue,
  getEExportWarnings,
  getTemplateParameterDefinitions,
  getOverlappingTerminalGroups,
  getRouteEndpointNormal,
  getRouteBlockingCandidates,
  getRouteBlockingCandidateNodesFromBoxes,
  routeIntersectsSpecificNodes,
  getTerminalBusContactGroups,
  getTerminalPoint,
  createModelLayer,
  DEFAULT_MODEL_LAYER_ID,
  filterProjectByVisibleLayers,
  normalizeDeviceIndexCounters,
  normalizeNodeTerminalsByTemplate,
  normalizeProjectLayers,
  normalizeModelGroups,
  normalizeColorPalette,
  normalizeVoltageBaseInput,
  normalizeScaleValue,
  parseStaticDrawPoints,
  serializeProject,
  deserializeProject,
  isBusNode,
  isContainerTerminalAssociationDependent,
  isDoubleContainerTerminalAssociation,
  isBlockingTopologyValidationError,
  isGeneratorNode,
  isRepeatedEdgePointerClick,
  isStaticNode,
  inferESection,
  insertOrthogonalRouteBend,
  keyboardMoveStepForViewBox,
  lockProjectEdgeTerminals,
  preserveDraggedRouteShape,
  prepareConnectionEdgeForCommit,
  projectPointToBusCenterline,
  rebuildConnectionRoutesForNodes,
  rebuildExternalConnectionRoutesForMovedNodes,
  rebuildMovedInternalConnectionRoutesBlockedByStationaryNodes,
  rebuildSingleConnectionRoute,
  reconcileOverlappingTerminalConnections,
  rerouteEdgesAroundMovedNodes,
  resolveStraightBusSlideEndpoint,
  resolveStraightBusSlideEndpointToPoint,
  synchronizeBusTerminalsWithEdges,
  validateTopology,
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
  routeEdgesForCachedStoredRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForStoredRendering,
  modelGeometryInsideCanvasBounds,
  mirrorNodes,
  renameSavedScheme,
  renameSavedProject,
  moveOrthogonalRouteSegment,
  terminalRenderLocalPoint,
  terminalStubSegment,
  terminalStubStrokeWidth,
  STATIC_DRAW_POINTS_PARAM,
  TERMINAL_TYPE_LIBRARY_LABELS,
  terminalVoltageBaseNumber,
  terminalTypeColor,
  tidyOrthogonalRoute,
  topologyCalculationMessage,
  upsertSavedProject,
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
  graphStorePatchEdgesFromArray,
  graphStorePatchGraph,
  graphStorePatchGraphFromArrays,
  graphStorePatchNodes,
  graphStoreSetEdges,
  graphStoreSetGraph,
  graphStoreSetNodes,
  overlayGraphStoreNodes,
  type GraphStore
} from "./graphStore";
import {
  queryRouteSpatialIndex,
  routeStoreSetRoutes,
  type RouteStore
} from "./routeStore";
import {
  EMPTY_CANVAS_CLIPBOARD,
  alignNodeLayoutUnits,
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
  resolveCanvasDeleteAction,
  resolveCanvasSelection,
  selectedCanvasGroupIds,
  selectGraphicsInRect,
  type CanvasClipboard,
  type CanvasLayoutUnit,
  type SelectionRect,
  type CanvasSelectionScope
} from "./selectionActions";
import {
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  type SidePanelMode,
  type SidePanelSide
} from "./sidePanelVisibility";

const ENABLE_REACT_FLOW_PREVIEW = import.meta.env.DEV;
const ReactFlowPreview = ENABLE_REACT_FLOW_PREVIEW ? lazy(() => import("./ReactFlowPreview")) : null;

type ToolMode = "select" | "connect" | "static-draw";
type StaticDrawingState = {
  kind: DeviceKind;
  template: DeviceTemplate;
  points: Point[];
  previewPoint: Point;
};
type AttributeLibrary = string;
type CustomComponentTypeDefinition = {
  name: string;
  attributeLibraryName: AttributeLibrary;
};
type AttributeLibraryComponentTypeGroup = {
  section: string;
  templates: DeviceTemplate[];
};
type CustomComponentTreeSelection =
  | { kind: "attributeLibrary"; attributeLibraryName: AttributeLibrary }
  | { kind: "componentType"; attributeLibraryName: AttributeLibrary; section: string }
  | { kind: "component"; attributeLibraryName: AttributeLibrary; section: string; templateKind: string };
type EdgeEndpoint = "source" | "target";
type ScaleHandleKind = "scale-x" | "scale-y" | "scale-both";
type GroupTransformNodeSnapshot = Pick<ModelNode, "position" | "rotation" | "scale" | "scaleX" | "scaleY">;
type GroupTransformEdgeRouteSnapshot = {
  edgeId: string;
  points: Point[];
};
type GroupTransformGeometry =
  | { kind: "rotate"; degrees: number }
  | { kind: "scale"; scaleX: number; scaleY: number };
type GroupTransformDrag = {
  kind: "rotate" | ScaleHandleKind;
  groupId: string;
  nodeIds: string[];
  bounds: SelectionRect;
  center: Point;
  originalNodes: Record<string, GroupTransformNodeSnapshot>;
  originalEdgeRoutes: GroupTransformEdgeRouteSnapshot[];
  previewPoint?: Point;
  proportionalScale?: boolean;
  historyCaptured?: boolean;
};
type SingleTransformDrag = {
  kind: "rotate" | ScaleHandleKind;
  nodeId: string;
  originalNode: GroupTransformNodeSnapshot;
  startPoint: Point;
  handleXDirection?: -1 | 0 | 1;
  handleYDirection?: -1 | 0 | 1;
  proportionalScale?: boolean;
  historyCaptured?: boolean;
};
type TransformDrag =
  | SingleTransformDrag
  | GroupTransformDrag;
type ScaleHandleConfig = {
  id: string;
  kind: ScaleHandleKind;
  xDirection: -1 | 0 | 1;
  yDirection: -1 | 0 | 1;
  className: string;
};

function isGroupTransformDrag(transform: TransformDrag): transform is GroupTransformDrag {
  return "groupId" in transform;
}

function selectionRectCenter(rect: SelectionRect): Point {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function combineSelectionRects(rects: Array<SelectionRect | null | undefined>): SelectionRect | null {
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

function routeMidpoint(points: Point[]): Point | null {
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

function normalizeRotationDegrees(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

function rotatePointAround(point: Point, center: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: Math.round(center.x + dx * Math.cos(radians) - dy * Math.sin(radians)),
    y: Math.round(center.y + dx * Math.sin(radians) + dy * Math.cos(radians))
  };
}

function mirrorPointAcrossAxis(point: Point, center: Point, axis: "horizontal" | "vertical"): Point {
  return axis === "horizontal"
    ? { x: Math.round(center.x * 2 - point.x), y: point.y }
    : { x: point.x, y: Math.round(center.y * 2 - point.y) };
}

function localScaleKindForScreenHandle(kind: ScaleHandleKind, rotation: number): ScaleHandleKind {
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

function groupTransformGeometry(drag: GroupTransformDrag, point: Point): GroupTransformGeometry {
  if (drag.kind === "rotate") {
    const angle = (Math.atan2(point.y - drag.center.y, point.x - drag.center.x) * 180) / Math.PI + 90;
    return { kind: "rotate", degrees: normalizeRotationDegrees(Math.round(angle / 90) * 90) };
  }

  const halfWidth = Math.max(1, (drag.bounds.right - drag.bounds.left) / 2);
  const halfHeight = Math.max(1, (drag.bounds.bottom - drag.bounds.top) / 2);
  const rawScaleX = normalizeScaleValue(Math.abs(point.x - drag.center.x) / halfWidth);
  const rawScaleY = normalizeScaleValue(Math.abs(point.y - drag.center.y) / halfHeight);
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

function transformGroupPoint(drag: GroupTransformDrag, geometry: GroupTransformGeometry, point: Point): Point {
  return geometry.kind === "rotate"
    ? rotatePointAround(point, drag.center, geometry.degrees)
    : {
        x: Math.round(drag.center.x + (point.x - drag.center.x) * geometry.scaleX),
        y: Math.round(drag.center.y + (point.y - drag.center.y) * geometry.scaleY)
      };
}

function groupTransformSvgTransform(drag: GroupTransformDrag, point: Point | undefined) {
  if (!point) {
    return "";
  }
  const geometry = groupTransformGeometry(drag, point);
  return geometry.kind === "rotate"
    ? `translate(${formatSvgNumber(drag.center.x)} ${formatSvgNumber(drag.center.y)}) rotate(${formatSvgNumber(geometry.degrees)}) translate(${formatSvgNumber(-drag.center.x)} ${formatSvgNumber(-drag.center.y)})`
    : `translate(${formatSvgNumber(drag.center.x)} ${formatSvgNumber(drag.center.y)}) scale(${formatSvgNumber(geometry.scaleX)} ${formatSvgNumber(geometry.scaleY)}) translate(${formatSvgNumber(-drag.center.x)} ${formatSvgNumber(-drag.center.y)})`;
}

type Marquee = { start: Point; current: Point } | null;
type ContextMenuState = {
  x: number;
  y: number;
  target?: "blank" | "node" | "edge";
  canvasPoint?: Point;
  nodeId?: string;
  edgeId?: string;
  routePoints?: Point[];
} | null;
type NodeLabelDisplayMode = "always" | "hidden" | "follow";
const NODE_LABEL_DISPLAY_MODES: Array<{ value: NodeLabelDisplayMode; label: string }> = [
  { value: "always", label: "始终显示" },
  { value: "hidden", label: "始终隐藏" },
  { value: "follow", label: "跟随显示" }
];
type ProjectMenuState = { x: number; y: number; schemeId?: string; projectId?: string } | null;
type UnsavedChangeAction = {
  kind: "load-project";
  project: SavedProjectRecord;
  schemeId: string;
  label: string;
};
type PendingModelImportConflict = {
  targetSchemeId: string;
  importedProject: ProjectFile;
  importedName: string;
  duplicateProjectId: string;
  duplicateProjectName: string;
} | null;
type PendingSchemeImportConflict = {
  importedScheme: SavedSchemeRecord;
  importedName: string;
  duplicateSchemeId: string;
  duplicateSchemeName: string;
} | null;
type PendingRecordPasteConflict =
  | {
      kind: "scheme";
      sourceScheme: SavedSchemeRecord;
      duplicateSchemeId: string;
      duplicateName: string;
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
  | null;
type SidePanelResizeState = { side: SidePanelSide; startX: number; startWidth: number } | null;
type StatusbarResizeState = { startY: number; startHeight: number } | null;
type ValidationPanelResizeState = { startY: number; startHeight: number } | null;
type CanvasResizeEdge = "right" | "bottom" | "corner";
type CanvasResizeState = {
  edge: CanvasResizeEdge;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  unitsPerCssX: number;
  unitsPerCssY: number;
  minBounds: CanvasBounds;
  historyCaptured?: boolean;
} | null;
type RewiringState = {
  edgeId: string;
  endpoint: EdgeEndpoint;
  previewPoint: Point;
  dropTargetPoint?: Point;
  dropTarget?: ConnectTarget;
  pointerId?: number;
} | null;
type ConnectTarget = { node: ModelNode; terminalId: string; point?: Point };
type NodeTerminalSnapTarget = {
  movingNodeId: string;
  movingTerminalId: string;
  targetNodeId: string;
  targetTerminalId: string;
  point: Point;
  delta: Point;
  distance: number;
  kind?: "terminal" | "bus";
};
type TerminalPressState = {
  nodeId: string;
  terminalId: string;
  pointerId: number;
  startPoint: Point;
  currentPoint: Point;
  moved: boolean;
  historyCaptured?: boolean;
} | null;
type NodeLabelDragState = {
  nodeId: string;
  pointerId: number;
  startPoint: Point;
  startOffset: Point;
  scaleX: number;
  scaleY: number;
  historyCaptured?: boolean;
} | null;
type NodeLabelRotateDragState = {
  nodeId: string;
  pointerId: number;
  center: Point;
  historyCaptured?: boolean;
} | null;
type ManualPathDrag =
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
type DraggingState = {
  source?: "pointer" | "keyboard";
  nodeIds: string[];
  edgeIds: string[];
  affectedEdges: Edge[];
  startPoint: Point;
  originalPositions: Record<string, Point>;
  originalEdgePoints: Record<string, { sourcePoint?: Point; targetPoint?: Point; manualPoints?: Point[] }>;
  originalRoutePoints: Record<string, Point[]>;
  currentDelta?: Point;
  historyCaptured?: boolean;
  overlayPreview?: MultiNodeDragOverlayPreview;
};
type MultiNodeDragOverlayPreview = {
  bounds: RenderViewportBounds | null;
  edgeRoutes: { edgeId: string; path: string }[];
};
function isMultiNodeMoveState(dragState: Pick<DraggingState, "nodeIds"> | null | undefined) {
  return (dragState?.nodeIds.length ?? 0) > 1;
}
type GraphDirtyBaseline = {
  projectName: string;
  layers: ModelLayer[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasBackgroundColor: string;
  canvasBackgroundImage: string;
  canvasBackgroundImageAssetId: string;
  powerUnit: string;
  voltageUnit: string;
  currentUnit: string;
  powerBaseValue: number;
  deviceIndexCounters: DeviceIndexCounters;
  nodes: ModelNode[];
  edges: Edge[];
  groups: ModelGroup[];
};
type ClipboardRecord =
  | { kind: "scheme"; scheme: SavedSchemeRecord }
  | { kind: "project"; project: SavedProjectRecord };
type TopologyRunStatus = {
  state: "idle" | "success" | "failed";
  message: string;
};
type UndoSnapshot = {
  projectName: string;
  layers: ModelLayer[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasBackgroundColor: string;
  canvasBackgroundImage: string;
  canvasBackgroundImageAssetId: string;
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
type DraftProjectState = {
  projectName: string;
  activeProjectId: string;
  activeSchemeId: string;
  layers?: ModelLayer[];
  activeLayerId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBackgroundColor?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
  powerUnit?: string;
  voltageUnit?: string;
  currentUnit?: string;
  powerBaseValue?: number;
  deviceIndexCounters?: DeviceIndexCounters;
  groups?: ModelGroup[];
  nodes: ModelNode[];
  edges: Edge[];
};
type ImageAsset = {
  id: string;
  name: string;
  folderId?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  url: string;
};
type ImageFolder = {
  id: string;
  name: string;
  createdAt?: string;
  imageCount?: number;
};
type ImageTarget =
  | { kind: "node"; nodeId: string }
  | { kind: "nodeForeground"; nodeId: string }
  | { kind: "canvas" };
type CanvasRenderOptions = CanvasBounds & {
  backgroundColor?: string;
  backgroundImage?: string;
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: ColorPalette;
};
type BackendSchemesResponse = {
  schemes: SavedSchemeRecord[];
};
type BackendColorConfigResponse = {
  colorDisplayMode?: ColorDisplayMode;
  colorPalette?: Partial<ColorPalette>;
  exists?: boolean;
  savedAt?: string;
};
type DeviceLibraryPersistencePayload = {
  customDeviceTemplates: DeviceTemplate[];
  customAttributeLibraries: AttributeLibrary[];
  customComponentTypes: CustomComponentTypeDefinition[];
  deviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride>;
  customGraphTemplateTypes: string[];
  customGraphTemplates: GraphTemplate[];
};
type BackendDeviceLibraryResponse = Partial<DeviceLibraryPersistencePayload> & {
  exists?: boolean;
  savedAt?: string;
};
type GraphTemplate = {
  id: string;
  typeName: string;
  name: string;
  sourceSize: { width: number; height: number };
  clipboard: CanvasClipboard;
  createdAt: string;
  updatedAt: string;
};
type CustomParamDraft = DeviceParameterDefinition & {
  id: string;
};
type CustomDeviceDraft = {
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
type TemplateDialogState = {
  sourceGroupId: string;
  clipboard: CanvasClipboard;
  sourceSize: { width: number; height: number };
} | null;
type DeviceDefinitionDraftRow = DeviceParameterDefinition & {
  id: string;
};
type VoltageColorVisibility = "all" | "current";

const terminalColor = terminalTypeColor;
const busEndpointColor = (node: ModelNode, colorPalette?: ColorPalette) => terminalColor(node.terminals[0]?.type, colorPalette);
const ENERGY_COLOR_ROWS: Array<{ type: TerminalType; label: string }> = [
  { type: "ac", label: "交流电" },
  { type: "dc", label: "直流电" },
  { type: "h2", label: "氢能" },
  { type: "heat", label: "热能" }
];
const ELECTRIC_COLOR_TYPES: Array<"ac" | "dc"> = ["ac", "dc"];
const ELECTRIC_COLOR_TYPE_LABELS: Record<"ac" | "dc", string> = {
  ac: "AC",
  dc: "DC"
};

const isElectricPaletteType = (type?: TerminalType): type is "ac" | "dc" => type === "ac" || type === "dc";

const terminalVbaseFallbackValue = (node: ModelNode, terminalIndex: number) => {
  if (node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral") {
    return [node.params.highVbase, node.params.mediumVbase, node.params.lowVbase, node.params.neutral_vbase][terminalIndex] ?? node.params.vbase ?? "";
  }
  const sourceSide = node.params.i_vbase ?? node.params.sourceVbase ?? node.params.highVbase;
  const targetSide = node.params.j_vbase ?? node.params.targetVbase ?? node.params.lowVbase;
  return (terminalIndex === 0 ? sourceSide : targetSide) ?? node.params.vbase ?? node.params.voltageLevel ?? node.params.ratedVoltage ?? "";
};

const voltageColorKeyForTerminal = (node: ModelNode, terminal: ModelNode["terminals"][number], terminalIndex: number) => {
  if (!isElectricPaletteType(terminal.type)) {
    return "";
  }
  const voltage = terminalVoltageBaseNumber(terminal.vbase ?? terminalVbaseFallbackValue(node, terminalIndex));
  return voltage ? `${terminal.type}:${voltage}` : "";
};

const DEFAULT_CANVAS_WIDTH = 1980;
const DEFAULT_CANVAS_HEIGHT = 1024;
const MIN_CANVAS_WIDTH = 640;
const MIN_CANVAS_HEIGHT = 360;
const MAX_CANVAS_WIDTH = 50000;
const MAX_CANVAS_HEIGHT = 50000;
const DEFAULT_CANVAS_BACKGROUND = "#f1f5f9";
const MOVE_BOUNDARY_GUARD = 8;
const CANVAS_AUTO_EXPAND_PADDING = 96;
const CANVAS_RESIZE_HANDLE_SIZE = 18;
const MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES = 5;
const ORIGINAL_POSITION_REROUTE_PADDING = 64;
const MOVE_ROUTE_LOCAL_SEARCH_PADDING = 96;
const KEYBOARD_MOVE_COMMIT_DELAY_MS = 160;
const KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND = 30;
const KEYBOARD_MOVE_FRAME_INTERVAL_MS = 1000 / KEYBOARD_MOVE_REPEAT_RATE_PER_SECOND;
const ELEMENT_TREE_INITIAL_ITEM_LIMIT = 120;
const ELEMENT_TREE_ITEM_LIMIT_STEP = 120;
const TOPOLOGY_WARNING_PAGE_SIZE = 50;
const CANVAS_MINIMAP_WIDTH = 220;
const CANVAS_MINIMAP_HEIGHT = 142;
const CANVAS_MINIMAP_PADDING = 9;
const CANVAS_MINIMAP_MAX_NODE_MARKS = 1800;
const CANVAS_MINIMAP_MAX_ROUTE_MARKS = 420;
const CANVAS_FLOATING_TOOLBAR_GAP = 7;
const NODE_FLOATING_TOOLBAR_WIDTH = 224;
const NODE_FLOATING_TOOLBAR_HEIGHT = 38;
const EDGE_FLOATING_TOOLBAR_WIDTH = 160;
const EDGE_FLOATING_TOOLBAR_HEIGHT = 38;
const DEFAULT_POWER_UNIT = "MW";
const DEFAULT_VOLTAGE_UNIT = "kV";
const DEFAULT_CURRENT_UNIT = "A";
const DEFAULT_POWER_BASE_VALUE = 100;
const EMPTY_TOPOLOGY: Topology = { nodes: {}, connectedComponents: [] };
const INITIAL_TOPOLOGY_STATUS: TopologyRunStatus = { state: "idle", message: "未拓扑" };
const E_SECTION_OPTIONS = Object.keys(E_SECTION_COLUMNS);
const SCALE_HANDLE_CONFIGS: ScaleHandleConfig[] = [
  { id: "north-west", kind: "scale-both", xDirection: -1, yDirection: -1, className: "diagonal-nwse" },
  { id: "north", kind: "scale-y", xDirection: 0, yDirection: -1, className: "vertical" },
  { id: "north-east", kind: "scale-both", xDirection: 1, yDirection: -1, className: "diagonal-nesw" },
  { id: "east", kind: "scale-x", xDirection: 1, yDirection: 0, className: "horizontal" },
  { id: "south-east", kind: "scale-both", xDirection: 1, yDirection: 1, className: "diagonal-nwse" },
  { id: "south", kind: "scale-y", xDirection: 0, yDirection: 1, className: "vertical" },
  { id: "south-west", kind: "scale-both", xDirection: -1, yDirection: 1, className: "diagonal-nesw" },
  { id: "west", kind: "scale-x", xDirection: -1, yDirection: 0, className: "horizontal" }
];
const POWER_UNIT_OPTIONS = ["W", "kW", "MW"];
const VOLTAGE_UNIT_OPTIONS = ["V", "kV"];
const CURRENT_UNIT_OPTIONS = ["A", "kA"];
const DEFAULT_ATTRIBUTE_LIBRARIES: AttributeLibrary[] = ["静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"];
const CUSTOM_ATTRIBUTE_LIBRARY_BASES: AttributeLibrary[] = ["交流设备", "直流设备", "氢能设备", "热能设备"];
const PROTECTED_ATTRIBUTE_LIBRARIES = new Set(CUSTOM_ATTRIBUTE_LIBRARY_BASES);
const DEVICE_TYPE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const TERMINAL_TYPE_OPTIONS: Array<{ value: TerminalType; label: string }> = [
  { value: "ac", label: TERMINAL_TYPE_LIBRARY_LABELS.ac },
  { value: "dc", label: TERMINAL_TYPE_LIBRARY_LABELS.dc },
  { value: "h2", label: TERMINAL_TYPE_LIBRARY_LABELS.h2 },
  { value: "heat", label: TERMINAL_TYPE_LIBRARY_LABELS.heat }
];
const CONTAINER_TERMINAL_ASSOCIATION_OPTIONS: Record<TerminalType, Array<{ value: ContainerTerminalAssociationType; label: string }>> = {
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
const PARAM_VALUE_TYPE_OPTIONS: Array<{ value: DeviceParameterValueType; label: string }> = [
  { value: "integer", label: "整数" },
  { value: "float", label: "浮点数" },
  { value: "string", label: "字符串" },
  { value: "enum", label: "枚举量" }
];
const PROJECT_PANEL_MIN_HEIGHT = 150;
const PROJECT_PANEL_MAX_HEIGHT = 430;
const PROJECT_PANEL_DEFAULT_HEIGHT = 260;
const LEFT_PANEL_DEFAULT_WIDTH = 288;
const RIGHT_PANEL_DEFAULT_WIDTH = 320;
const SIDE_PANEL_MIN_WIDTH = 240;
const SIDE_PANEL_MAX_WIDTH = 640;
const STATUSBAR_DEFAULT_HEIGHT = 36;
const STATUSBAR_MIN_HEIGHT = 32;
const STATUSBAR_MAX_HEIGHT = 160;
const VALIDATION_PANEL_DEFAULT_HEIGHT = 180;
const VALIDATION_PANEL_MIN_HEIGHT = 96;
const VALIDATION_PANEL_MAX_HEIGHT = 420;
const CONNECT_TERMINAL_SNAP_TOLERANCE = 28;
const CONNECT_BUS_SNAP_TOLERANCE = 18;
const connectTargetSearchBounds = (point: Point): RenderViewportBounds => {
  const padding = Math.max(CONNECT_TERMINAL_SNAP_TOLERANCE, CONNECT_BUS_SNAP_TOLERANCE) + 64;
  return {
    left: point.x - padding,
    right: point.x + padding,
    top: point.y - padding,
    bottom: point.y + padding
  };
};
const findNodeTerminalSnapTarget = (
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
const applyNodeTerminalSnap = (delta: Point, snapTarget: NodeTerminalSnapTarget | null): Point =>
  snapTarget ? { x: delta.x + snapTarget.delta.x, y: delta.y + snapTarget.delta.y } : delta;
const pointOnBusForSnap = (bus: ModelNode, point: Point, tolerance = CONNECT_BUS_SNAP_TOLERANCE): Point | null => {
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
const findNodeBusSnapTarget = (
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
const SAMPLE_NODES: ModelNode[] = [
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

const SAMPLE_EDGES: Edge[] = [
  { id: "seed-e1", sourceId: "seed-1", targetId: "seed-2", sourceTerminalId: "t1", targetTerminalId: "t1" },
  { id: "seed-e2", sourceId: "seed-2", targetId: "seed-3", sourceTerminalId: "t2", targetTerminalId: "t1" },
  { id: "seed-e3", sourceId: "seed-3", targetId: "seed-4", sourceTerminalId: "t1", targetTerminalId: "t1" },
  { id: "seed-e4", sourceId: "seed-4", targetId: "seed-5", sourceTerminalId: "t2", targetTerminalId: "t1" },
  { id: "seed-e5", sourceId: "seed-5", targetId: "seed-6", sourceTerminalId: "t1", targetTerminalId: "t1" }
];

const PROJECT_STORAGE_KEY = "power-system-model-projects";
const SCHEME_STORAGE_KEY = "power-system-model-schemes";
const ACTIVE_PROJECT_STORAGE_KEY = "power-system-active-project";
const DRAFT_PROJECT_STORAGE_KEY = "power-system-current-draft";
const EMPTY_VOLTAGE_COLOR_KEY_SET = new Set<string>();
const IMAGE_STORAGE_KEY = "power-system-image-assets";
const CUSTOM_DEVICE_LIBRARY_STORAGE_KEY = "power-system-custom-device-library";
const CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY = "power-system-custom-attribute-libraries";
const CUSTOM_COMPONENT_TYPES_STORAGE_KEY = "power-system-custom-component-types";
const DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY = "power-system-device-definition-overrides";
const CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY = "power-system-custom-graph-template-types";
const CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY = "power-system-custom-graph-templates";
const COLOR_DISPLAY_MODE_STORAGE_KEY = "power-system-color-display-mode";
const COLOR_PALETTE_STORAGE_KEY = "power-system-color-palette";
const LEFT_PANEL_MODE_STORAGE_KEY = "power-system-left-panel-mode";
const RIGHT_PANEL_MODE_STORAGE_KEY = "power-system-right-panel-mode";
const LEFT_PANEL_WIDTH_STORAGE_KEY = "power-system-left-panel-width";
const RIGHT_PANEL_WIDTH_STORAGE_KEY = "power-system-right-panel-width";
const STATUSBAR_HEIGHT_STORAGE_KEY = "power-system-statusbar-height";
const VALIDATION_PANEL_HEIGHT_STORAGE_KEY = "power-system-validation-panel-height";
const DEFAULT_GRAPH_TEMPLATE_TYPES = ["常用模板"];
type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};
const scheduleIdleWork = (callback: () => void, delayMs = 0, timeoutMs = 1000) => {
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
const elementTreeCacheSignature = (
  graphRevision: number,
  layerSignature: string,
  templates: readonly DeviceTemplate[]
) => {
  const templateSignature = templates.map((template) => `${template.kind}:${template.label}`).join("|");
  return `${graphRevision}#${layerSignature}#${templateSignature}`;
};
type RenderViewportBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
type CanvasViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type RectLike = Pick<DOMRectReadOnly, "left" | "right" | "top" | "bottom" | "width" | "height">;
type NodeSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, ModelNode[]>;
};
const VIEWPORT_RENDER_PADDING_RATIO = 0.15;
const VIEWPORT_RENDER_MIN_PADDING = 260;
const NODE_SPATIAL_BUCKET_SIZE = 256;
const expandViewBoxForRendering = (viewBox: { x: number; y: number; width: number; height: number }): RenderViewportBounds => {
  const padding = Math.max(VIEWPORT_RENDER_MIN_PADDING, Math.max(viewBox.width, viewBox.height) * VIEWPORT_RENDER_PADDING_RATIO);
  return {
    left: viewBox.x - padding,
    right: viewBox.x + viewBox.width + padding,
    top: viewBox.y - padding,
    bottom: viewBox.y + viewBox.height + padding
  };
};
const sameCanvasViewBox = (first: CanvasViewBox, second: CanvasViewBox) =>
  Math.round(first.x) === Math.round(second.x) &&
  Math.round(first.y) === Math.round(second.y) &&
  Math.round(first.width) === Math.round(second.width) &&
  Math.round(first.height) === Math.round(second.height);
function visibleCanvasViewBoxFromRects(frameRect: RectLike, svgRect: RectLike, viewBox: CanvasViewBox): CanvasViewBox {
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
function initialVisibleCanvasViewBox(canvasBounds: CanvasBounds, frame: Pick<HTMLElement, "clientWidth" | "clientHeight"> | null): CanvasViewBox {
  const framePadding = 32;
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
const boxesIntersect = (
  first: RenderViewportBounds,
  second: RenderViewportBounds
) => first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
const nodeRenderBounds = (node: ModelNode): RenderViewportBounds => {
  const halfDiagonal = Math.hypot(node.size.width * getNodeScaleX(node), node.size.height * getNodeScaleY(node)) / 2 + 24;
  return {
    left: node.position.x - halfDiagonal,
    right: node.position.x + halfDiagonal,
    top: node.position.y - halfDiagonal,
    bottom: node.position.y + halfDiagonal
  };
};
const nodeIntersectsRenderViewport = (node: ModelNode, viewport: RenderViewportBounds) =>
  boxesIntersect(nodeRenderBounds(node), viewport);
const spatialBucketKey = (x: number, y: number) => `${x}:${y}`;
const spatialBucketRange = (bounds: RenderViewportBounds, bucketSize: number) => ({
  left: Math.floor(bounds.left / bucketSize),
  right: Math.floor(bounds.right / bucketSize),
  top: Math.floor(bounds.top / bucketSize),
  bottom: Math.floor(bounds.bottom / bucketSize)
});
function buildNodeSpatialIndex(nodes: ModelNode[], bucketSize = NODE_SPATIAL_BUCKET_SIZE): NodeSpatialIndex {
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
  return { bucketSize, buckets };
}
function queryNodeSpatialIndex(index: NodeSpatialIndex, bounds: RenderViewportBounds): ModelNode[] {
  const range = spatialBucketRange(bounds, index.bucketSize);
  const matches: ModelNode[] = [];
  const seen = new Set<string>();
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(spatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const node of bucket) {
        if (seen.has(node.id) || !nodeIntersectsRenderViewport(node, bounds)) {
          continue;
        }
        seen.add(node.id);
        matches.push(node);
      }
    }
  }
  return matches;
}
const compactPreviewNodes = (...nodes: Array<ModelNode | null | undefined>): ModelNode[] => {
  const compacted = new Map<string, ModelNode>();
  for (const node of nodes) {
    if (node && !compacted.has(node.id)) {
      compacted.set(node.id, node);
    }
  }
  return Array.from(compacted.values());
};
const PARAM_LABELS: Record<string, string> = {
  name: "名称",
  schemeName: "所属方案",
  updatedAt: "更新时间",
  canvasWidth: "显示宽度",
  canvasHeight: "显示高度",
  canvasBackgroundColor: "背景色",
  canvasBackgroundImage: "背景图片",
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

const PARAM_OPTIONS: Record<string, string[]> = {
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
  fontFamily: ["Arial", "Microsoft YaHei", "SimSun", "KaiTi", "SimHei"],
  fontWeight: ["400", "700", "900"],
  fontStyle: ["normal", "italic"],
  textDecoration: ["none", "underline"],
  strokeStyle: ["solid", "dashed", "dotted"],
  shadowEnabled: ["1", "0"],
  textAlign: ["left", "center", "right"],
  verticalAlign: ["top", "middle", "bottom"],
  markerStart: ["none", "arrow", "dot"],
  markerEnd: ["none", "arrow", "dot"]
};

function paramOptionsForSection(key: string, section?: string) {
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

const READONLY_E_PARAM_KEYS = new Set(["idx", "node", "i_node", "j_node", "ac_node", "dc_node"]);

function readSavedProjects(): SavedProjectRecord[] {
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedProjectRecord[]) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeSavedProjectIndexes) : [];
  } catch {
    return [];
  }
}

function normalizeLegacyPowerSystemLabel(value: string) {
  return value.replace(/电力系统/g, "电力能源系统");
}

function normalizeSavedProjectIndexes(project: SavedProjectRecord): SavedProjectRecord {
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

function normalizeSavedSchemeIndexes(scheme: SavedSchemeRecord): SavedSchemeRecord {
  return {
    ...scheme,
    name: normalizeLegacyPowerSystemLabel(scheme.name),
    projects: Array.isArray(scheme.projects) ? scheme.projects.map(normalizeSavedProjectIndexes) : []
  };
}

function readSavedSchemes(): SavedSchemeRecord[] {
  try {
    const raw = window.localStorage.getItem(SCHEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSchemeRecord[];
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeSavedSchemeIndexes);
      }
    }
    const legacyProjects = readSavedProjects();
    return legacyProjects.length > 0 ? [createSavedScheme("默认方案", legacyProjects)] : [createSavedScheme("默认方案")];
  } catch {
    return [createSavedScheme("默认方案")];
  }
}

function readDraftProject(): DraftProjectState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PROJECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as DraftProjectState;
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
        nodes: parsed.nodes.map(normalizeNodeTerminalsByTemplate),
        edges: parsed.edges
      }),
      activeProjectId: parsed.activeProjectId,
      activeSchemeId: parsed.activeSchemeId,
      canvasWidth: parsed.canvasWidth,
      canvasHeight: parsed.canvasHeight,
      canvasBackgroundColor: parsed.canvasBackgroundColor,
      canvasBackgroundImage: parsed.canvasBackgroundImage,
      canvasBackgroundImageAssetId: parsed.canvasBackgroundImageAssetId,
      powerUnit: parsed.powerUnit,
      voltageUnit: parsed.voltageUnit,
      currentUnit: parsed.currentUnit,
      powerBaseValue: parsed.powerBaseValue,
      deviceIndexCounters: parsed.deviceIndexCounters
    };
  } catch {
    return null;
  }
}

function readImageAssets(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(IMAGE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveImageAsset(id: string, dataUrl: string) {
  const assets = readImageAssets();
  window.localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify({ ...assets, [id]: dataUrl }));
}

function resolveNodeImage(node: ModelNode, assets = readImageAssets()) {
  const assetId = node.params.backgroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.backgroundImage || "";
}

function resolveNodeForegroundImage(node: ModelNode, assets = readImageAssets()) {
  const assetId = node.params.foregroundImageAssetId;
  return (assetId && assets[assetId]) || node.params.foregroundImage || "";
}

function resolveProjectImage(project: Pick<ProjectFile, "canvasBackgroundImage" | "canvasBackgroundImageAssetId">, assets = readImageAssets()) {
  const assetId = project.canvasBackgroundImageAssetId;
  return (assetId && assets[assetId]) || project.canvasBackgroundImage || "";
}

const imageAssetsToMap = (assets: ImageAsset[]) =>
  Object.fromEntries(assets.map((asset) => [asset.id, asset.url]));

const localImageAssetsFromStorage = (): ImageAsset[] =>
  Object.entries(readImageAssets()).map(([id, url], index) => ({ id, name: `本地图片 ${index + 1}`, folderId: "root", url }));

function pointsToPreviewPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${Math.round(point.x)} ${Math.round(point.y)}`).join(" ");
}

async function fetchBackendImageFolders(): Promise<ImageFolder[]> {
  const response = await fetch("/api/image-folders");
  if (!response.ok) {
    throw new Error("读取后台图片文件夹失败。");
  }
  return (await response.json()) as ImageFolder[];
}

async function createBackendImageFolder(name: string): Promise<ImageFolder> {
  const response = await fetch("/api/image-folders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "新建图片文件夹失败。");
  }
  return (await response.json()) as ImageFolder;
}

async function renameBackendImageFolder(folderId: string, name: string): Promise<ImageFolder> {
  const response = await fetch(`/api/image-folders/${encodeURIComponent(folderId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "重命名图片文件夹失败。");
  }
  return (await response.json()) as ImageFolder;
}

async function deleteBackendImageFolder(folderId: string): Promise<void> {
  const response = await fetch(`/api/image-folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "删除图片文件夹失败。");
  }
}

async function fetchBackendImages(folderId = "root"): Promise<ImageAsset[]> {
  const response = await fetch(`/api/images?folderId=${encodeURIComponent(folderId)}`);
  if (!response.ok) {
    throw new Error("读取后台图片列表失败。");
  }
  return (await response.json()) as ImageAsset[];
}

async function uploadBackendImage(fileName: string, dataUrl: string, folderId = "root"): Promise<ImageAsset> {
  const response = await fetch("/api/images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: fileName, dataUrl, folderId })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "上传图片到后台失败。");
  }
  return (await response.json()) as ImageAsset;
}

function normalizeProjectForBackend(project: ProjectFile): ProjectFile {
  const projectBackground =
    project.canvasBackgroundImageAssetId && typeof project.canvasBackgroundImage === "string" && project.canvasBackgroundImage.startsWith("data:")
      ? `/api/images/${project.canvasBackgroundImageAssetId}`
      : project.canvasBackgroundImage;
  return {
    ...project,
    canvasBackgroundColor: project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
    canvasBackgroundImage: projectBackground,
    powerUnit: project.powerUnit ?? DEFAULT_POWER_UNIT,
    voltageUnit: project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT,
    currentUnit: project.currentUnit ?? DEFAULT_CURRENT_UNIT,
    powerBaseValue:
      typeof project.powerBaseValue === "number" && Number.isFinite(project.powerBaseValue)
        ? project.powerBaseValue
        : DEFAULT_POWER_BASE_VALUE,
    nodes: project.nodes.map((node) => {
      const assetId = node.params.backgroundImageAssetId;
      const backgroundImage = node.params.backgroundImage;
      const params: Record<string, string> =
        assetId && typeof backgroundImage === "string" && backgroundImage.startsWith("data:")
          ? { ...node.params, backgroundImage: `/api/images/${assetId}` }
          : { ...node.params };
      if (params.foregroundImageAssetId && typeof params.foregroundImage === "string" && params.foregroundImage.startsWith("data:")) {
        params.foregroundImage = `/api/images/${params.foregroundImageAssetId}`;
      }
      return {
        ...node,
        params,
        terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
      };
    }),
    edges: project.edges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
      targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
      manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
    })),
    groups: normalizeModelGroups(project.groups, project.nodes, project.edges)
  };
}

function normalizeSchemesForBackend(schemes: SavedSchemeRecord[]): SavedSchemeRecord[] {
  return schemes.map((scheme) => ({
    ...scheme,
    projects: scheme.projects.map((project) => ({
      ...project,
      project: normalizeProjectForBackend(project.project)
    }))
  }));
}

function serializeSchemesForStorage(schemes: SavedSchemeRecord[]) {
  return JSON.stringify(normalizeSchemesForBackend(schemes));
}

const clonePoint = (point: Point): Point => ({ x: point.x, y: point.y });

function cloneNodesForUndo(sourceNodes: ModelNode[]): ModelNode[] {
  return sourceNodes.map((node) => ({
    ...node,
    position: clonePoint(node.position),
    size: { ...node.size },
    terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: clonePoint(terminal.anchor) })),
    params: { ...node.params }
  }));
}

function cloneEdgesForUndo(sourceEdges: Edge[]): Edge[] {
  return sourceEdges.map((edge) => ({
    ...edge,
    sourcePoint: edge.sourcePoint ? clonePoint(edge.sourcePoint) : undefined,
    targetPoint: edge.targetPoint ? clonePoint(edge.targetPoint) : undefined,
    manualPoints: edge.manualPoints?.map(clonePoint)
  }));
}

function cloneGroupsForUndo(sourceGroups: ModelGroup[]): ModelGroup[] {
  return sourceGroups.map((group) => ({
    ...group,
    nodeIds: [...group.nodeIds],
    edgeIds: [...group.edgeIds],
    childGroupIds: group.childGroupIds ? [...group.childGroupIds] : undefined
  }));
}

function cloneTopologyForUndo(sourceTopology: Topology): Topology {
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

function cloneTopologyErrorsForUndo(errors: TopologyValidationError[]): TopologyValidationError[] {
  return errors.map((error) => ({ ...error, relatedNodeIds: [...error.relatedNodeIds] }));
}

function clampCanvasDimension(value: number, min: number, max: number, fallback: number) {
  return Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback)));
}

async function fetchBackendSchemes(): Promise<SavedSchemeRecord[]> {
  const response = await fetch("/api/schemes");
  if (!response.ok) {
    throw new Error("读取后台方案/模型失败。");
  }
  const payload = (await response.json()) as BackendSchemesResponse | SavedSchemeRecord[];
  const schemes = Array.isArray(payload) ? payload : Array.isArray(payload.schemes) ? payload.schemes : [];
  return schemes.map(normalizeSavedSchemeIndexes);
}

async function saveBackendSchemes(schemes: SavedSchemeRecord[]): Promise<void> {
  return saveBackendSchemesPayload(serializeSchemesForStorage(schemes));
}

async function saveBackendSchemesPayload(normalizedSchemesPayload: string): Promise<void> {
  const response = await fetch("/api/schemes", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: `{"schemes":${normalizedSchemesPayload}}`
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "保存方案/模型到后台失败。");
  }
}

function normalizeColorDisplayMode(value?: string): ColorDisplayMode {
  return value === "voltage" ? "voltage" : "energy";
}

function serializeColorConfigForStorage(mode: ColorDisplayMode, palette: ColorPalette) {
  return JSON.stringify({
    colorDisplayMode: mode,
    colorPalette: normalizeColorPalette(palette)
  });
}

async function fetchBackendColorConfig(): Promise<{ colorDisplayMode: ColorDisplayMode; colorPalette: ColorPalette; exists: boolean }> {
  const response = await fetch("/api/color-config");
  if (!response.ok) {
    throw new Error("读取后台配色配置失败。");
  }
  const payload = (await response.json()) as BackendColorConfigResponse;
  return {
    colorDisplayMode: normalizeColorDisplayMode(payload.colorDisplayMode),
    colorPalette: normalizeColorPalette(payload.colorPalette),
    exists: Boolean(payload.exists)
  };
}

async function saveBackendColorConfigPayload(normalizedColorConfigPayload: string): Promise<void> {
  const response = await fetch("/api/color-config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: normalizedColorConfigPayload
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "保存配色配置到后台失败。");
  }
}

function serializeDeviceLibraryForStorage(payload: DeviceLibraryPersistencePayload) {
  return JSON.stringify(normalizeDeviceLibraryPersistencePayload(payload));
}

async function fetchBackendDeviceLibrary(): Promise<DeviceLibraryPersistencePayload & { exists: boolean }> {
  const response = await fetch("/api/device-library");
  if (!response.ok) {
    throw new Error("读取后台图元库失败。");
  }
  const payload = (await response.json()) as BackendDeviceLibraryResponse;
  return {
    ...normalizeDeviceLibraryPersistencePayload(payload),
    exists: Boolean(payload.exists)
  };
}

async function saveBackendDeviceLibraryPayload(normalizedDeviceLibraryPayload: string): Promise<void> {
  const response = await fetch("/api/device-library", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: normalizedDeviceLibraryPayload
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "保存图元库到后台失败。");
  }
}

function groupDeviceTemplatesByAttributeLibrary(templates: DeviceTemplate[]): Record<string, DeviceTemplate[]> {
  return templates.reduce<Record<string, DeviceTemplate[]>>((groups, item) => {
    const group = normalizeAttributeLibraryName(item.attributeLibrary);
    groups[group] = groups[group] ? [...groups[group], { ...item, attributeLibrary: group }] : [{ ...item, attributeLibrary: group }];
    return groups;
  }, {});
}

function groupDeviceTemplatesByAttributeLibraryAndComponentType(templates: DeviceTemplate[]): Record<string, AttributeLibraryComponentTypeGroup[]> {
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

function normalizeLibrarySearchText(value: string) {
  return value.trim().toLowerCase();
}

const attributeLibraryComponentTypeKey = (attributeLibraryName: string, sectionName: string) =>
  `${normalizeAttributeLibraryName(attributeLibraryName)}::${sectionName}`;

function libraryTemplateMatchesSearch(template: DeviceTemplate, group: string, section: string, needle: string) {
  if (!needle) {
    return true;
  }
  return [group, section, template.label, template.kind, template.params?.component_type]
    .filter((value): value is string => typeof value === "string")
    .some((value) => normalizeLibrarySearchText(value).includes(needle));
}

function normalizeAttributeLibraryName(attributeLibraryName: string): string {
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

function normalizeCustomAttributeLibraries(value: unknown, reservedGroups: readonly AttributeLibrary[] = DEFAULT_ATTRIBUTE_LIBRARIES): AttributeLibrary[] {
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

function normalizeComponentTypeName(name: string): string {
  return name.trim();
}

function defaultAttributeLibraryForComponentType(sectionName: string): AttributeLibrary {
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

function isBuiltInAttributeLibrary(attributeLibraryName: string): boolean {
  return PROTECTED_ATTRIBUTE_LIBRARIES.has(normalizeAttributeLibraryName(attributeLibraryName));
}

function isBuiltInComponentType(sectionName: string): boolean {
  const normalized = normalizeComponentTypeName(sectionName).toLowerCase();
  return E_SECTION_OPTIONS.some((section) => section.toLowerCase() === normalized);
}

function attributeLibraryOptionClass(attributeLibraryName: string): string {
  return isBuiltInAttributeLibrary(attributeLibraryName) ? "builtin-option" : "custom-option";
}

function componentTypeOptionClass(sectionName: string): string {
  return isBuiltInComponentType(sectionName) ? "builtin-option" : "custom-option";
}

function sourceSelectClassName(isBuiltIn: boolean): string {
  return `source-select ${isBuiltIn ? "builtin-source" : "custom-source"}`;
}

function isValidComponentTypeName(name: string): boolean {
  return DEVICE_TYPE_NAME_PATTERN.test(name);
}

function normalizeCustomComponentTypes(value: unknown, reservedTypes: readonly string[] = E_SECTION_OPTIONS): CustomComponentTypeDefinition[] {
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

function normalizeCustomDeviceTemplates(value: unknown): DeviceTemplate[] {
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

function normalizeGraphTemplateTypeName(name: string): string {
  return name.trim();
}

function normalizeGraphTemplateTypes(value: unknown, reservedTypes: readonly string[] = DEFAULT_GRAPH_TEMPLATE_TYPES): string[] {
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

function cloneTemplatePoint(point: Point | undefined): Point | undefined {
  return point ? { x: Number(point.x) || 0, y: Number(point.y) || 0 } : undefined;
}

function cloneGraphTemplateClipboard(clipboard: CanvasClipboard): CanvasClipboard {
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
        manualPoints: item.edge.manualPoints?.map((point) => ({ ...point }))
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

function normalizeGraphTemplateClipboard(value: unknown): CanvasClipboard {
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
          : [item.edge.sourcePoint, ...(item.edge.manualPoints ?? []), item.edge.targetPoint].filter((point): point is Point => Boolean(point));
        return { edge: item.edge, routePoints };
      })
    : [];
  const groups = Array.isArray(source.groups)
    ? source.groups.filter((group): group is ModelGroup => Boolean(group && typeof group === "object"))
    : [];
  return cloneGraphTemplateClipboard({ nodes, edges, groups });
}

function normalizeGraphTemplates(value: unknown): GraphTemplate[] {
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

function graphTemplateTypeList(customTypes: readonly string[], templates: readonly GraphTemplate[]) {
  return Array.from(new Set([
    ...DEFAULT_GRAPH_TEMPLATE_TYPES,
    ...customTypes.map(normalizeGraphTemplateTypeName).filter(Boolean),
    ...templates.map((template) => normalizeGraphTemplateTypeName(template.typeName)).filter(Boolean)
  ]));
}

function groupGraphTemplatesByType(templates: readonly GraphTemplate[], typeNames: readonly string[]) {
  const grouped = Object.fromEntries(typeNames.map((typeName) => [typeName, [] as GraphTemplate[]]));
  for (const template of templates) {
    const typeName = normalizeGraphTemplateTypeName(template.typeName) || DEFAULT_GRAPH_TEMPLATE_TYPES[0];
    grouped[typeName] = grouped[typeName] ? [...grouped[typeName], template] : [template];
  }
  return grouped;
}

function uniqueGraphTemplateName(baseName: string, typeName: string, templates: readonly GraphTemplate[]) {
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

function normalizeDefinitionRows(value: unknown): DeviceParameterDefinition[] {
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

function normalizeDeviceDefinitionOverrides(value: unknown): Record<string, DeviceTemplateDefinitionOverride> {
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

function normalizeDeviceLibraryPersistencePayload(value: unknown): DeviceLibraryPersistencePayload {
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

function readCustomDeviceTemplates(): DeviceTemplate[] {
  try {
    return normalizeCustomDeviceTemplates(JSON.parse(window.localStorage.getItem(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readCustomAttributeLibraries(): AttributeLibrary[] {
  try {
    return normalizeCustomAttributeLibraries(JSON.parse(window.localStorage.getItem(CUSTOM_ATTRIBUTE_LIBRARIES_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readCustomComponentTypes(): CustomComponentTypeDefinition[] {
  try {
    return normalizeCustomComponentTypes(JSON.parse(window.localStorage.getItem(CUSTOM_COMPONENT_TYPES_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readDeviceDefinitionOverrides(): Record<string, DeviceTemplateDefinitionOverride> {
  try {
    return normalizeDeviceDefinitionOverrides(JSON.parse(window.localStorage.getItem(DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY) ?? "{}"));
  } catch {
    return {};
  }
}

function readCustomGraphTemplateTypes(): string[] {
  try {
    return normalizeGraphTemplateTypes(JSON.parse(window.localStorage.getItem(CUSTOM_GRAPH_TEMPLATE_TYPES_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readCustomGraphTemplates(): GraphTemplate[] {
  try {
    return normalizeGraphTemplates(JSON.parse(window.localStorage.getItem(CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readLocalDeviceLibraryPersistencePayload(): DeviceLibraryPersistencePayload {
  return {
    customDeviceTemplates: readCustomDeviceTemplates(),
    customAttributeLibraries: readCustomAttributeLibraries(),
    customComponentTypes: readCustomComponentTypes(),
    deviceDefinitionOverrides: readDeviceDefinitionOverrides(),
    customGraphTemplateTypes: readCustomGraphTemplateTypes(),
    customGraphTemplates: readCustomGraphTemplates()
  };
}

function writeLocalDeviceLibraryPersistencePayload(normalizedDeviceLibrary: DeviceLibraryPersistencePayload): void {
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

function readColorDisplayMode(): ColorDisplayMode {
  try {
    return window.localStorage.getItem(COLOR_DISPLAY_MODE_STORAGE_KEY) === "voltage" ? "voltage" : "energy";
  } catch {
    return "energy";
  }
}

function readColorPalette(): ColorPalette {
  try {
    return normalizeColorPalette(JSON.parse(window.localStorage.getItem(COLOR_PALETTE_STORAGE_KEY) ?? "{}"));
  } catch {
    return normalizeColorPalette(DEFAULT_COLOR_PALETTE);
  }
}

function readSidePanelMode(storageKey: string): SidePanelMode {
  try {
    return normalizeSidePanelMode(window.localStorage.getItem(storageKey));
  } catch {
    return "pinned";
  }
}

function clampPanelDimension(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readStoredPanelDimension(storageKey: string, fallback: number, min: number, max: number) {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(value) ? clampPanelDimension(value, min, max) : fallback;
  } catch {
    return fallback;
  }
}

function customParamId() {
  return `param-${Math.random().toString(36).slice(2, 9)}`;
}

function deviceDefinitionRowId() {
  return `def-${Math.random().toString(36).slice(2, 9)}`;
}

function fallbackComponentTypeForAttributeLibrary(attributeLibraryName: string) {
  const normalized = normalizeAttributeLibraryName(attributeLibraryName);
  if (normalized.includes("静态")) return "StaticBasicShape";
  if (normalized.includes("直流")) return "DCLoad";
  if (normalized.includes("变流")) return "DCDCConverter";
  if (normalized.includes("氢")) return "HydroLoad";
  if (normalized.includes("热")) return "HeatLoad";
  return "ACLoad";
}

function resolveTemplateComponentType(template: DeviceTemplate) {
  const inferred = inferESection(template.kind, template.params);
  if (inferred) {
    return inferred;
  }
  return fallbackComponentTypeForAttributeLibrary(template.attributeLibrary);
}

function createDefinitionDraftRows(template: DeviceTemplate): DeviceDefinitionDraftRow[] {
  return getTemplateParameterDefinitions(template)
    .filter((definition) => definition.enName !== "component_type" && definition.enName !== "is_container")
    .map((definition) => ({
      ...definition,
      cnName: definition.cnName === definition.enName ? PARAM_LABELS[definition.enName] ?? definition.cnName : definition.cnName,
      id: deviceDefinitionRowId()
    }));
}

function createEmptyCustomDeviceDraft(attributeLibraryName = "交流设备"): CustomDeviceDraft {
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

function defaultContainerAssociationForTerminalType(type: TerminalType): ContainerTerminalAssociationType {
  return CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type][0].value;
}

function isAssociationAllowedForTerminal(type: TerminalType, association: ContainerTerminalAssociationValue): association is ContainerTerminalAssociationType {
  return Boolean(association && CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type].some((option) => option.value === association));
}

function normalizeContainerTerminalAssociations(
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

function customDefaultDefinitions(
  terminalTypes: TerminalType[],
  options: {
    isContainer?: boolean;
    terminalRoles?: ContainerTerminalRole[];
    terminalAssociations?: ContainerTerminalAssociationValue[];
  } = {}
): DeviceParameterDefinition[] {
  return buildDefaultDeviceParameterDefinitions(terminalTypes, options);
}

function generateCustomDeviceImage(label: string, terminalTypes: TerminalType[]) {
  const first = terminalTypes[0] ?? "ac";
  const color = terminalColor(first);
  const safeLabel = escapeXml(label || "Unit");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="18" fill="#f8fafc"/><circle cx="70" cy="80" r="38" fill="${color}" fill-opacity="0.14"/><path d="M48 80h44M70 58v44" stroke="${color}" stroke-width="9" stroke-linecap="round"/><text x="132" y="77" font-family="Arial, Microsoft YaHei" font-size="22" font-weight="700" fill="#0f172a">${safeLabel}</text><text x="132" y="104" font-family="Arial" font-size="15" fill="${color}">${terminalTypes.map((type) => type.toUpperCase()).join(" / ")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function parseCustomDefinitions(params: Record<string, string>): DeviceParameterDefinition[] {
  try {
    const parsed = JSON.parse(params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]");
    return normalizeDefinitionRows(parsed);
  } catch {
    return [];
  }
}

function screenToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
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

function constrainPointToOrthogonalAxis(start: Point, point: Point): Point {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: start.y };
  }
  return { x: start.x, y: point.y };
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type SaveFilePickerWindow = Window & {
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

type DirectoryFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void> | void;
    close: () => Promise<void> | void;
  }>;
};

type WritableDirectoryHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<WritableDirectoryHandle>;
};

type TextSaveOptions = {
  filename: string;
  text: string;
  mime: string;
  description: string;
  extensions: string[];
};

const EXPORT_SAVE_PICKER_ID = "model-export";
const SCHEME_EXPORT_DIRECTORY_PICKER_ID = "scheme-export";

function isPickerAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function saveTextFile(options: TextSaveOptions) {
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

const writeTextFileToDirectory = async (
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

function svgStrokeDashArray(style?: string) {
  if (style === "dashed") {
    return "10 6";
  }
  if (style === "dotted") {
    return "2 6";
  }
  return undefined;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SVG_ATTRIBUTE_NAMES: Record<string, string> = {
  className: "class",
  dominantBaseline: "dominant-baseline",
  fillOpacity: "fill-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontStyle: "font-style",
  fontWeight: "font-weight",
  strokeDasharray: "stroke-dasharray",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration"
};

function styleObjectToSvgAttribute(style: Record<string, string | number>) {
  return Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${String(value)}`)
    .join(";");
}

function renderSvgElementMarkup(value: unknown): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return escapeXml(String(value));
  }
  if (Array.isArray(value)) {
    return value.map(renderSvgElementMarkup).join("");
  }
  if (!isValidElement(value)) {
    return "";
  }
  const props = value.props as Record<string, unknown>;
  if (value.type === Fragment) {
    return renderSvgElementMarkup(props.children);
  }
  if (typeof value.type !== "string") {
    return "";
  }
  const attrs = Object.entries(props)
    .filter(([key, attrValue]) => key !== "children" && key !== "key" && key !== "ref" && attrValue !== undefined && attrValue !== null && attrValue !== false)
    .map(([key, attrValue]) => {
      const attrName = SVG_ATTRIBUTE_NAMES[key] ?? key;
      const renderedValue =
        key === "style" && typeof attrValue === "object" && !Array.isArray(attrValue)
          ? styleObjectToSvgAttribute(attrValue as Record<string, string | number>)
          : attrValue === true
            ? "true"
            : String(attrValue);
      return ` ${attrName}="${escapeXml(renderedValue)}"`;
    })
    .join("");
  return `<${value.type}${attrs}>${renderSvgElementMarkup(props.children)}</${value.type}>`;
}

type DeviceGlyphMode = "full" | "geometry" | "text";

function formatSvgNumber(value: number) {
  const rounded = Math.round(value * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function nodeGeometryTransform(node: ModelNode) {
  return `rotate(${formatSvgNumber(node.rotation)}) scale(${formatSvgNumber(getNodeScaleX(node))} ${formatSvgNumber(getNodeScaleY(node))})`;
}

function nodeUprightScaleTransform(node: ModelNode) {
  return `scale(${formatSvgNumber(Math.abs(getNodeScaleX(node)) || 1)} ${formatSvgNumber(Math.abs(getNodeScaleY(node)) || 1)})`;
}

function numericNodeParam(node: ModelNode, key: string, fallback: number) {
  const parsed = Number(node.params[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nodeLabelOffset(node: ModelNode): Point {
  return {
    x: numericNodeParam(node, "_labelX", 0),
    y: numericNodeParam(node, "_labelY", Math.round(node.size.height / 2 + 22))
  };
}

const nodeLabelText = (node: ModelNode) => node.params._labelText ?? node.name;

const nodeLabelVisible = (node: ModelNode) => !isStaticNode(node) && node.params._labelVisible !== "0";

function normalizeNodeLabelDisplayMode(value: string | undefined): NodeLabelDisplayMode {
  return value === "always" || value === "hidden" || value === "follow" ? value : "follow";
}

const nodeLabelDisplayMode = (node: ModelNode): NodeLabelDisplayMode => {
  const mode = node.params._labelDisplayMode;
  if (mode === "always" || mode === "hidden" || mode === "follow") {
    return mode;
  }
  return node.params._labelVisible === "0" ? "hidden" : "follow";
};

const nodeLabelShouldRender = (node: ModelNode, globalVisible: boolean) => {
  if (!nodeLabelVisible(node)) {
    return false;
  }
  const mode = nodeLabelDisplayMode(node);
  return mode === "always" || (mode === "follow" && globalVisible);
};

function normalizeNodeLabelRotation(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  const snapped = Math.round((Number.isFinite(parsed) ? parsed : 0) / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

const nodeLabelVertical = (node: ModelNode) => {
  const rotation = normalizeNodeLabelRotation(node.params._labelRotation);
  return rotation === 90 || rotation === 270;
};

const nodeLabelNumericTokenPattern = String.raw`\d+(?:[./:：-]\d+)*`;
const nodeLabelNumericTokenRegex = new RegExp(`^${nodeLabelNumericTokenPattern}`);

function nodeLabelVerticalSegments(text: string) {
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

function nodeLabelVerticalTokenY(index: number, count: number, node: ModelNode) {
  const step = nodeLabelFontSize(node) * 1.2;
  return (index - (count - 1) / 2) * step;
}

const nodeLabelTransform = (node: ModelNode) => {
  const offset = nodeLabelOffset(node);
  const scaleX = Math.abs(getNodeScaleX(node)) || 1;
  const scaleY = Math.abs(getNodeScaleY(node)) || 1;
  return `translate(${formatSvgNumber(offset.x * scaleX)} ${formatSvgNumber(offset.y * scaleY)})`;
};

function nodeLabelCanvasCenter(node: ModelNode): Point {
  const offset = nodeLabelOffset(node);
  return {
    x: node.position.x + offset.x * (Math.abs(getNodeScaleX(node)) || 1),
    y: node.position.y + offset.y * (Math.abs(getNodeScaleY(node)) || 1)
  };
}

const nodeLabelRotationFromPoint = (center: Point, point: Point) =>
  normalizeNodeLabelRotation((Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90);

function nodeLabelTextAnchor(node: ModelNode) {
  const anchor = node.params._labelTextAnchor;
  return anchor === "start" || anchor === "end" || anchor === "middle" ? anchor : "middle";
}

function nodeLabelFontSize(node: ModelNode) {
  const baseSize = numericNodeParam(node, "_labelFontSize", 14);
  const scaleX = Math.abs(getNodeScaleX(node)) || 1;
  const scaleY = Math.abs(getNodeScaleY(node)) || 1;
  return baseSize * Math.sqrt(scaleX * scaleY);
}

function nodeLabelTextStyle(node: ModelNode): CSSProperties {
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

function nodeLabelVerticalTokenStyle(node: ModelNode): CSSProperties {
  return {
    ...nodeLabelTextStyle(node),
    writingMode: "horizontal-tb",
    textOrientation: "mixed"
  };
}

function nodeTransformedHalfExtents(node: ModelNode, includeUprightContent = false) {
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

function nodeCounterTransformMatrix(node: ModelNode, preserveScale = true) {
  const scaleX = getNodeScaleX(node) || 1;
  const scaleY = getNodeScaleY(node) || 1;
  const desiredScaleX = preserveScale ? Math.abs(scaleX) || 1 : 1;
  const desiredScaleY = preserveScale ? Math.abs(scaleY) || 1 : 1;
  const radians = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const a = (cos * desiredScaleX) / scaleX;
  const b = (-sin * desiredScaleX) / scaleY;
  const c = (sin * desiredScaleY) / scaleX;
  const d = (cos * desiredScaleY) / scaleY;
  return `matrix(${formatSvgNumber(a)} ${formatSvgNumber(b)} ${formatSvgNumber(c)} ${formatSvgNumber(d)} 0 0)`;
}

function uprightText(
  node: ModelNode,
  x: number,
  y: number,
  props: Record<string, string | number | CSSProperties | undefined>,
  children: ReactNode
) {
  const { style, ...textProps } = props;
  return (
    <g transform={`translate(${formatSvgNumber(x)} ${formatSvgNumber(y)}) ${nodeCounterTransformMatrix(node)}`}>
      <text x="0" y="0" {...textProps} style={style as CSSProperties | undefined}>
        {children}
      </text>
    </g>
  );
}

function staticNumericParam(node: ModelNode, key: string, fallback: number, min = 0): number {
  const parsed = Number(node.params[key]);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

function staticSymbolShadowStyle(node: ModelNode): CSSProperties | undefined {
  return node.params.shadowEnabled === "1"
    ? { filter: "drop-shadow(0 4px 8px rgba(15, 23, 42, 0.18))" }
    : undefined;
}

function staticShapeText(node: ModelNode, width: number, height: number, miniature = false) {
  const fontSize = miniature ? 12 : staticNumericParam(node, "fontSize", 16, 8);
  const padding = Math.min(staticNumericParam(node, "padding", 12, 0), Math.max(0, Math.min(width, height) / 2 - 2));
  const align = node.params.textAlign || "center";
  const verticalAlign = node.params.verticalAlign || "middle";
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const x = align === "left" ? -width / 2 + padding : align === "right" ? width / 2 - padding : 0;
  const y =
    verticalAlign === "top"
      ? -height / 2 + padding + fontSize / 2
      : verticalAlign === "bottom"
        ? height / 2 - padding - fontSize / 2
        : 0;
  const text = miniature ? node.params.text?.slice(0, 2) || "图元" : node.params.text || node.name;
  const lines = text.split(/\r?\n/);
  return uprightText(
    node,
    x,
    y - ((lines.length - 1) * fontSize * 0.6),
    {
      fill: node.params.textColor || "#111827",
      fontSize,
      fontFamily: node.params.fontFamily || "Arial",
      fontWeight: node.params.fontWeight || "500",
      fontStyle: node.params.fontStyle || "normal",
      textDecoration: node.params.textDecoration || "none",
      textAnchor,
      dominantBaseline: "middle",
      style: { userSelect: "none", pointerEvents: "none" }
    },
    <>
      {lines.map((line, index) => (
        <tspan key={index} x="0" dy={index === 0 ? 0 : fontSize * 1.2}>
          {line || " "}
        </tspan>
      ))}
    </>
  );
}

function staticConnectorMarker(
  marker: string,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  size: number,
  color: string,
  lineWidth: number
): ReactNode {
  if (marker === "dot") {
    return <circle cx={x} cy={y} r={Math.max(size * 0.36, lineWidth * 1.4)} fill={color} stroke={color} />;
  }
  if (marker !== "arrow") {
    return null;
  }
  const length = Math.hypot(directionX, directionY) || 1;
  const ux = directionX / length;
  const uy = directionY / length;
  const px = -uy;
  const py = ux;
  const baseX = x - ux * size;
  const baseY = y - uy * size;
  const halfWidth = size * 0.42;
  const points = `${x},${y} ${baseX + px * halfWidth},${baseY + py * halfWidth} ${baseX - px * halfWidth},${baseY - py * halfWidth}`;
  return <polygon points={points} fill={color} stroke={color} strokeLinejoin="round" />;
}

function staticConnectorPath(
  node: ModelNode,
  points: Point[],
  stroke: string,
  lineWidth: number,
  dashArray: string | undefined
) {
  const markerStart = node.params.markerStart || "none";
  const markerEnd = node.params.markerEnd || "none";
  const arrowSize = staticNumericParam(node, "arrowSize", 10, 4);
  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const first = points[0];
  const second = points[1] ?? first;
  const previous = points[points.length - 2] ?? first;
  const last = points[points.length - 1] ?? first;
  return (
    <g>
      <path d={pathData} fill="none" stroke={stroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />
      {staticConnectorMarker(markerStart, first.x, first.y, first.x - second.x, first.y - second.y, arrowSize, stroke, lineWidth)}
      {staticConnectorMarker(markerEnd, last.x, last.y, last.x - previous.x, last.y - previous.y, arrowSize, stroke, lineWidth)}
    </g>
  );
}

function staticDrawPointsForNode(node: ModelNode, fallback: Point[]) {
  const customPoints = parseStaticDrawPoints(node.params[STATIC_DRAW_POINTS_PARAM]);
  return customPoints.length >= 2 ? customPoints : fallback;
}

function staticHandleDot(node: ModelNode, x: number, y: number, stroke = "#ffffff") {
  const size = staticNumericParam(node, "handleSize", 8, 3);
  const color = node.params.handleColor || node.params.accentColor || "#2563eb";
  return <circle cx={x} cy={y} r={size / 2} fill={color} stroke={stroke} strokeWidth="2" />;
}

function staticFrameHandles(node: ModelNode, width: number, height: number) {
  return (
    <>
      {[
        [-width / 2, -height / 2],
        [0, -height / 2],
        [width / 2, -height / 2],
        [width / 2, 0],
        [width / 2, height / 2],
        [0, height / 2],
        [-width / 2, height / 2],
        [-width / 2, 0]
      ].map(([x, y], index) => (
        <g key={index}>{staticHandleDot(node, x, y, node.params.accentColor || "#2563eb")}</g>
      ))}
    </>
  );
}

function buildSvgTerminalMarkup(node: ModelNode, colorDisplayMode: ColorDisplayMode = "energy", colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE) {
  if (isBusNode(node) || isStaticNode(node)) {
    return "";
  }
  const nodeScaleX = getNodeScaleX(node);
  const nodeScaleY = getNodeScaleY(node);
  const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
  const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
  const dashArray = svgStrokeDashArray(node.params.strokeStyle);
  const dashAttribute = dashArray ? ` stroke-dasharray="${escapeXml(dashArray)}"` : "";
  return node.terminals
    .map((terminal) => {
      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind);
      const strokeWidth = terminalStubStrokeWidth(node, terminal);
      const terminalColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
      const label = `${terminal.label} / ${terminal.type.toUpperCase()}`;
      return `<g class="export-terminal ${terminal.type}" transform="translate(${formatSvgNumber(renderPoint.x)} ${formatSvgNumber(renderPoint.y)}) scale(${inverseScaleX} ${inverseScaleY})">
  <line class="export-terminal-stub ${terminal.type}" x1="${stub.from.x}" y1="${stub.from.y}" x2="${stub.to.x}" y2="${stub.to.y}" stroke="${terminalColor}" stroke-width="${formatSvgNumber(strokeWidth)}" stroke-linecap="round"${dashAttribute}/>
  <circle class="export-terminal-dot ${terminal.type}" cx="0" cy="0" r="6" fill="${terminalColor}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"><title>${escapeXml(label)}</title></circle>
</g>`;
    })
    .join("\n");
}

function renderBusGlyphRect(width: number, height: number, color: string) {
  const thickness = Math.max(8, height / 3);
  return <rect className="bus-glyph" x={-width / 2} y={-thickness / 2} width={width} height={thickness} fill={color} stroke={color} strokeWidth="0" />;
}

function DeviceGlyph({ node, miniature = false, mode = "full", colorDisplayMode = "energy", colorPalette = DEFAULT_COLOR_PALETTE }: { node: ModelNode; miniature?: boolean; mode?: DeviceGlyphMode; colorDisplayMode?: ColorDisplayMode; colorPalette?: ColorPalette }) {
  const w = miniature ? 58 : node.size.width;
  const h = miniature ? 38 : node.size.height;
  const glyphVariant = getDeviceGlyphVariant(node.kind);
  const renderGeometry = mode !== "text";
  const renderText = mode !== "geometry";
  const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
  const fill = glyphVariant.includes("converter")
    ? "#ecfeff"
    : glyphVariant === "ac-generator"
      ? "#eff6ff"
      : glyphVariant === "dc-generator"
        ? "#ecfdf5"
        : glyphVariant === "battery-storage"
          ? "#f0fdf4"
          : glyphVariant.startsWith("hydrogen")
            ? "#faf5ff"
            : glyphVariant.startsWith("heat")
              ? "#fff1f2"
              : glyphVariant === "switch" || glyphVariant === "disconnector"
                ? "#fff7ed"
                : glyphVariant === "ground-disconnector" || glyphVariant === "ground-disconnector-vertical"
                  ? "#fff7ed"
                  : glyphVariant === "terminal-transformer-load"
                    ? "#f8fafc"
                    : glyphVariant === "box-breaker"
                      ? "#f8fafc"
                      : glyphVariant === "breaker"
                      ? "#eef2ff"
                      : "#ffffff";
  if (isStaticNode(node)) {
    const staticStroke = node.params.strokeColor || stroke;
    const staticFill = node.params.fillColor || "transparent";
    const lineWidth = Number(node.params.lineWidth || 2);
    const dashArray = svgStrokeDashArray(node.params.strokeStyle);
    const cornerRadius = staticNumericParam(node, "cornerRadius", 8, 0);
    const accentColor = node.params.accentColor || staticStroke;
    const hasStaticText = Boolean(node.params.text?.trim());
    if (node.kind === "static-text") {
      if (!renderText) {
        return null;
      }
      const fontSize = miniature ? 18 : Number(node.params.fontSize || 24);
      const textLines = (miniature ? "文" : node.params.text || node.name).split(/\r?\n/);
      return uprightText(
        node,
        0,
        -((textLines.length - 1) * fontSize * 0.6),
        {
          fill: node.params.textColor || staticStroke,
          fontSize,
          fontFamily: node.params.fontFamily || "Arial",
          fontWeight: node.params.fontWeight || "400",
          fontStyle: node.params.fontStyle || "normal",
          textDecoration: node.params.textDecoration || "none",
          textAnchor: "middle",
          dominantBaseline: "middle",
          style: { userSelect: "none" }
        },
        <>
          {textLines.map((line, index) => (
            <tspan key={index} x="0" dy={index === 0 ? 0 : fontSize * 1.2}>
              {line || " "}
            </tspan>
          ))}
        </>
      );
    }
    if (node.kind === "static-line") {
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return renderGeometry ? staticConnectorPath(node, points, staticStroke, lineWidth, dashArray) : null;
    }
    if (node.kind === "static-polyline") {
      const points = staticDrawPointsForNode(node, [
        { x: -w / 2, y: h / 3 },
        { x: 0, y: -h / 3 },
        { x: w / 2, y: h / 3 }
      ]);
      return renderGeometry ? staticConnectorPath(node, points, staticStroke, lineWidth, dashArray) : null;
    }
    if (node.kind === "static-circle") {
      return renderGeometry ? <circle cx="0" cy="0" r={Math.min(w, h) / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} /> : null;
    }
    if (node.kind === "static-ellipse") {
      return renderGeometry ? <ellipse cx="0" cy="0" rx={w / 2} ry={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} /> : null;
    }
    if (node.kind === "static-image") {
      if (mode === "text") {
        return !node.params.backgroundImage
          ? uprightText(
              node,
              0,
              0,
              {
                fill: node.params.textColor || "#64748b",
                fontSize: miniature ? 14 : Number(node.params.fontSize || 16),
                textAnchor: "middle",
                dominantBaseline: "middle"
              },
              "图片"
            )
          : null;
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && !node.params.backgroundImage && uprightText(node, 0, 0, { fill: node.params.textColor || "#64748b", fontSize: miniature ? 14 : Number(node.params.fontSize || 16), textAnchor: "middle", dominantBaseline: "middle" }, "图片")}
        </g>
      );
    }
    if (node.kind === "static-rounded-rect") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-diamond") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const points = `0,${-h / 2} ${w / 2},0 0,${h / 2} ${-w / 2},0`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.7, h * 0.7, miniature)}
        </g>
      );
    }
    if (node.kind === "static-pill") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-database") {
      if (mode === "text") {
        return staticShapeText(node, w, h * 0.72, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const capHeight = Math.max(14, h * 0.22);
      return (
        <g style={staticSymbolShadowStyle(node)} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round">
          <path d={`M ${-w / 2} ${-h / 2 + capHeight / 2} V ${h / 2 - capHeight / 2} C ${-w / 2} ${h / 2 + capHeight * 0.22}, ${w / 2} ${h / 2 + capHeight * 0.22}, ${w / 2} ${h / 2 - capHeight / 2} V ${-h / 2 + capHeight / 2}`} />
          <ellipse cx="0" cy={-h / 2 + capHeight / 2} rx={w / 2} ry={capHeight / 2} />
          <path d={`M ${-w / 2} ${-h / 2 + capHeight / 2} C ${-w / 2} ${-h / 2 + capHeight * 1.22}, ${w / 2} ${-h / 2 + capHeight * 1.22}, ${w / 2} ${-h / 2 + capHeight / 2}`} fill="none" stroke={accentColor} />
          {renderText && staticShapeText(node, w, h * 0.68, miniature)}
        </g>
      );
    }
    if (node.kind === "static-document") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const fold = Math.min(24, Math.min(w, h) * 0.22);
      return (
        <g style={staticSymbolShadowStyle(node)} strokeLinejoin="round">
          <path d={`M ${-w / 2} ${-h / 2} H ${w / 2 - fold} L ${w / 2} ${-h / 2 + fold} V ${h / 2} H ${-w / 2} Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <path d={`M ${w / 2 - fold} ${-h / 2} V ${-h / 2 + fold} H ${w / 2}`} fill="none" stroke={accentColor} strokeWidth={lineWidth} />
          <path d={`M ${-w / 2 + 16} ${-h / 2 + 34} H ${w / 2 - 16} M ${-w / 2 + 16} ${-h / 2 + 50} H ${w / 2 - 16} M ${-w / 2 + 16} ${-h / 2 + 66} H ${w / 2 - 28}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth * 0.8)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-note") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const fold = Math.min(22, Math.min(w, h) * 0.24);
      return (
        <g style={staticSymbolShadowStyle(node)} strokeLinejoin="round">
          <path d={`M ${-w / 2} ${-h / 2} H ${w / 2} V ${h / 2 - fold} L ${w / 2 - fold} ${h / 2} H ${-w / 2} Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <path d={`M ${w / 2} ${h / 2 - fold} H ${w / 2 - fold} V ${h / 2}`} fill="none" stroke={accentColor} strokeWidth={lineWidth} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-group-box") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray || "6 4"} />
          <path d={`M ${-w / 2 + 12} ${-h / 2 + 24} H ${w / 2 - 12}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-swimlane") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const headerHeight = Math.max(28, Math.min(h * 0.32, 42));
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height={headerHeight} rx={cornerRadius} fill={accentColor} stroke="none" />
          <path d={`M ${-w / 2} ${-h / 2 + headerHeight} H ${w / 2}`} stroke={staticStroke} strokeWidth={lineWidth} />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-point") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const radius = Math.max(4, Math.min(w, h) / 2 - lineWidth / 2);
      return (
        <g>
          <circle cx="0" cy="0" r={radius} fill={staticFill || accentColor} stroke={staticStroke} strokeWidth={lineWidth} />
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-ring") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const radius = Math.max(5, Math.min(w, h) / 2 - lineWidth / 2);
      return (
        <g>
          <circle cx="0" cy="0" r={radius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <circle cx="0" cy="0" r={Math.max(1.8, radius * 0.28)} fill={accentColor} stroke="none" />
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-circle-node") {
      if (mode === "text") {
        return staticShapeText(node, Math.min(w, h), Math.min(w, h), miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const radius = Math.max(8, Math.min(w, h) / 2 - lineWidth / 2);
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <circle cx="0" cy="0" r={radius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && staticShapeText(node, radius * 1.45, radius * 1.45, miniature)}
        </g>
      );
    }
    if (node.kind === "static-straight-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-arrow-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-double-arrow-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-elbow-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [
        { x: -w / 2, y: h / 3 },
        { x: -w / 6, y: h / 3 },
        { x: -w / 6, y: -h / 3 },
        { x: w / 2, y: -h / 3 }
      ]);
      return (
        <g>
          {staticConnectorPath(node, points, staticStroke, lineWidth, dashArray)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-hexagon") {
      if (mode === "text") {
        return staticShapeText(node, w * 0.78, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const inset = w * 0.18;
      const points = `${-w / 2 + inset},${-h / 2} ${w / 2 - inset},${-h / 2} ${w / 2},0 ${w / 2 - inset},${h / 2} ${-w / 2 + inset},${h / 2} ${-w / 2},0`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.78, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-parallelogram") {
      if (mode === "text") {
        return staticShapeText(node, w * 0.76, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const skew = w * 0.18;
      const points = `${-w / 2 + skew},${-h / 2} ${w / 2},${-h / 2} ${w / 2 - skew},${h / 2} ${-w / 2},${h / 2}`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.72, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-triangle") {
      if (mode === "text") {
        return staticShapeText(node, w * 0.66, h * 0.66, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const points = `0,${-h / 2} ${w / 2},${h / 2} ${-w / 2},${h / 2}`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <polygon points={points} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {renderText && staticShapeText(node, w * 0.66, h * 0.58, miniature)}
        </g>
      );
    }
    if (node.kind === "static-callout") {
      if (mode === "text") {
        return staticShapeText(node, w, h * 0.82, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const tail = Math.min(24, h * 0.26);
      const bodyBottom = h / 2 - tail;
      const path = `M ${-w / 2 + cornerRadius} ${-h / 2} H ${w / 2 - cornerRadius} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + cornerRadius} V ${bodyBottom - cornerRadius} Q ${w / 2} ${bodyBottom} ${w / 2 - cornerRadius} ${bodyBottom} H ${w * 0.1} L ${-w * 0.08} ${h / 2} L ${-w * 0.08} ${bodyBottom} H ${-w / 2 + cornerRadius} Q ${-w / 2} ${bodyBottom} ${-w / 2} ${bodyBottom - cornerRadius} V ${-h / 2 + cornerRadius} Q ${-w / 2} ${-h / 2} ${-w / 2 + cornerRadius} ${-h / 2} Z`;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <path d={path} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          <path d={`M ${-w / 2 + 14} ${-h / 2 + 24} H ${w / 2 - 14}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h * 0.82, miniature)}
        </g>
      );
    }
    if (node.kind === "static-default-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {staticHandleDot(node, -w / 2, 0)}
          {staticHandleDot(node, w / 2, 0)}
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-input-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <path d={`M ${-w / 2 + 14} ${-h / 2} H ${w / 2} V ${h / 2} H ${-w / 2 + 14} L ${-w / 2} 0 Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {staticHandleDot(node, w / 2, 0)}
          {renderText && staticShapeText(node, w * 0.78, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-output-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <path d={`M ${-w / 2} ${-h / 2} H ${w / 2 - 14} L ${w / 2} 0 L ${w / 2 - 14} ${h / 2} H ${-w / 2} Z`} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinejoin="round" />
          {staticHandleDot(node, -w / 2, 0)}
          {renderText && staticShapeText(node, w * 0.78, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-port-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {staticHandleDot(node, -w / 2, 0)}
          {staticHandleDot(node, w / 2, 0)}
          {staticHandleDot(node, 0, -h / 2)}
          {staticHandleDot(node, 0, h / 2)}
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-card-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const headerHeight = Math.max(24, Math.min(36, h * 0.32));
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height={headerHeight} rx={cornerRadius} fill={accentColor} opacity="0.14" stroke="none" />
          <path d={`M ${-w / 2 + 12} ${-h / 2 + headerHeight + 14} H ${w / 2 - 12} M ${-w / 2 + 12} ${-h / 2 + headerHeight + 30} H ${w / 2 - 32}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth * 0.75)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-toolbar-node") {
      if (mode === "text") {
        return staticShapeText(node, w, h * 0.7, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const toolbarY = -h / 2 - 18;
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-52} y={toolbarY} width="104" height="24" rx="6" fill={accentColor} stroke={staticStroke} strokeWidth="1" opacity="0.92" />
          <circle cx="-28" cy={toolbarY + 12} r="4" fill="#ffffff" />
          <rect x="-4" y={toolbarY + 8} width="8" height="8" rx="2" fill="#ffffff" />
          <path d={`M 24 ${toolbarY + 16} L 32 ${toolbarY + 8} M 24 ${toolbarY + 8} L 32 ${toolbarY + 16}`} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h * 0.7, miniature)}
        </g>
      );
    }
    if (node.kind === "static-resizer-frame") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray || "6 4"} />
          {staticFrameHandles(node, w, h)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-subflow-box") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      const headerHeight = Math.max(26, Math.min(38, h * 0.28));
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={cornerRadius} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height={headerHeight} rx={cornerRadius} fill={accentColor} stroke="none" />
          <path d={`M ${-w / 2} ${-h / 2 + headerHeight} H ${w / 2}`} stroke={staticStroke} strokeWidth={lineWidth} />
          <rect x={-w / 2 + 16} y={-h / 2 + headerHeight + 22} width={w * 0.34} height={h * 0.28} rx="6" fill="#ffffff" stroke={accentColor} strokeWidth="1.5" />
          <rect x={w / 2 - w * 0.34 - 16} y={h / 2 - h * 0.28 - 16} width={w * 0.34} height={h * 0.28} rx="6" fill="#ffffff" stroke={accentColor} strokeWidth="1.5" />
          <path d={`M ${-w * 0.08} ${-h * 0.02} H ${w * 0.08}`} stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-bezier-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: h / 4 }, { x: w / 2, y: -h / 4 }]);
      const start = points[0];
      const end = points[points.length - 1];
      const controlDx = Math.max(24, Math.abs(end.x - start.x) * 0.5);
      const direction = end.x >= start.x ? 1 : -1;
      return (
        <g>
          <path d={`M ${start.x} ${start.y} C ${start.x + controlDx * direction} ${start.y}, ${end.x - controlDx * direction} ${end.y}, ${end.x} ${end.y}`} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" />
          {staticConnectorMarker(node.params.markerStart || "none", start.x, start.y, -1, 0.4, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {staticConnectorMarker(node.params.markerEnd || "none", end.x, end.y, 1, -0.4, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-smoothstep-connector") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const points = staticDrawPointsForNode(node, [{ x: -w / 2, y: h / 4 }, { x: w / 2, y: -h / 2 }]);
      const start = points[0];
      const end = points[points.length - 1];
      const midX = (start.x + end.x) / 2;
      const path = points.length > 2
        ? points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
        : `M ${start.x} ${start.y} H ${midX} V ${end.y} H ${end.x}`;
      return (
        <g>
          <path d={path} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />
          {staticConnectorMarker(node.params.markerStart || "none", start.x, start.y, -1, 0, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {staticConnectorMarker(node.params.markerEnd || "none", end.x, end.y, 1, 0, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-self-loop") {
      if (mode === "text") {
        return hasStaticText ? staticShapeText(node, w, h, miniature) : null;
      }
      if (!renderGeometry) {
        return null;
      }
      const rx = w * 0.32;
      const ry = h * 0.32;
      const endX = w * 0.18;
      const endY = h * 0.2;
      return (
        <g>
          <path d={`M ${-endX} ${endY} C ${-w / 2} ${h / 2}, ${-w / 2} ${-h / 2}, 0 ${-h / 2} C ${w / 2} ${-h / 2}, ${w / 2} ${h / 2}, ${endX} ${endY}`} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" />
          <ellipse cx="0" cy="-3" rx={rx} ry={ry} fill="none" stroke={accentColor} strokeWidth="1" opacity="0.16" />
          {staticConnectorMarker(node.params.markerEnd || "arrow", endX, endY, 0.7, 0.7, staticNumericParam(node, "arrowSize", 10, 4), staticStroke, lineWidth)}
          {renderText && hasStaticText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-edge-label") {
      if (mode === "text") {
        return staticShapeText(node, w, h, miniature);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g style={staticSymbolShadowStyle(node)}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <path d={`M ${-w / 2 - 22} 0 H ${-w / 2} M ${w / 2} 0 H ${w / 2 + 22}`} stroke={accentColor} strokeWidth={Math.max(1, lineWidth)} strokeLinecap="round" />
          {renderText && staticShapeText(node, w, h, miniature)}
        </g>
      );
    }
    if (node.kind === "static-web") {
      if (mode === "text") {
        return uprightText(node, 0, 12, { fill: node.params.textColor || "#334155", fontSize: miniature ? 10 : 13, textAnchor: "middle" }, miniature ? "WEB" : node.params.text || "https://");
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height="22" rx="4" fill="#e2e8f0" />
          {renderText && uprightText(node, 0, 12, { fill: node.params.textColor || "#334155", fontSize: miniature ? 10 : 13, textAnchor: "middle" }, miniature ? "WEB" : node.params.text || "https://")}
        </g>
      );
    }
    if (["static-date", "static-time", "static-datetime", "static-input"].includes(node.kind)) {
      if (mode === "text") {
        return uprightText(node, -w / 2 + 10, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 11 : Number(node.params.fontSize || 16), dominantBaseline: "middle" }, miniature ? "控件" : node.params.text || node.name);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && uprightText(node, -w / 2 + 10, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 11 : Number(node.params.fontSize || 16), dominantBaseline: "middle" }, miniature ? "控件" : node.params.text || node.name)}
        </g>
      );
    }
    if (node.kind === "static-button") {
      if (mode === "text") {
        return uprightText(node, 0, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 12 : Number(node.params.fontSize || 16), textAnchor: "middle", dominantBaseline: "middle" }, miniature ? "按钮" : node.params.text || node.name);
      }
      if (!renderGeometry) {
        return null;
      }
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {renderText && uprightText(node, 0, 0, { fill: node.params.textColor || "#111827", fontSize: miniature ? 12 : Number(node.params.fontSize || 16), textAnchor: "middle", dominantBaseline: "middle" }, miniature ? "按钮" : node.params.text || node.name)}
        </g>
      );
    }
    return renderGeometry ? <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} /> : null;
  }

  if (glyphVariant === "ac-generator" || glyphVariant === "dc-generator") {
    const radius = miniature ? 15 : Math.min(w, h) * 0.37;
    const markerTextSize = miniature ? 7 : 10;
    const symbolY = miniature ? 2 : 1;
    const markerText = glyphVariant === "ac-generator" ? "AC" : "DC";
    if (mode === "text") {
      return uprightText(node, radius + 9, -radius * 0.42, { fill: stroke, stroke: "none", fontSize: markerTextSize, fontWeight: "800", textAnchor: "middle" }, markerText);
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={radius} fill={fill} />
        {glyphVariant === "ac-generator" ? (
          <>
            <path d={`M ${-radius * 0.58} ${symbolY} C ${-radius * 0.35} ${symbolY - radius * 0.42}, ${-radius * 0.12} ${symbolY - radius * 0.42}, 0 ${symbolY} C ${radius * 0.14} ${symbolY + radius * 0.42}, ${radius * 0.38} ${symbolY + radius * 0.42}, ${radius * 0.6} ${symbolY}`} />
            {renderText && uprightText(node, radius + 9, -radius * 0.42, { fill: stroke, stroke: "none", fontSize: markerTextSize, fontWeight: "800", textAnchor: "middle" }, "AC")}
          </>
        ) : (
          <>
            <path d={`M ${-radius * 0.58} ${symbolY - radius * 0.18} H ${radius * 0.58} M ${-radius * 0.42} ${symbolY + radius * 0.28} H ${radius * 0.42} M ${radius * 0.24} ${symbolY + radius * 0.12} V ${symbolY + radius * 0.44}`} />
            {renderText && uprightText(node, radius + 9, -radius * 0.42, { fill: stroke, stroke: "none", fontSize: markerTextSize, fontWeight: "800", textAnchor: "middle" }, "DC")}
          </>
        )}
        <path d={`M ${radius * 0.58} ${-radius * 0.76} L ${radius * 0.96} ${-radius * 0.76} L ${radius * 0.72} ${-radius * 0.28} L ${radius * 1.08} ${-radius * 0.28}`} />
      </g>
    );
  }

  if (glyphVariant === "battery-storage") {
    if (mode === "text") {
      return null;
    }
    const bodyWidth = miniature ? 34 : Math.min(w * 0.68, 56);
    const bodyHeight = miniature ? 20 : Math.min(h * 0.58, 32);
    const capWidth = miniature ? 4 : 6;
    const capHeight = bodyHeight * 0.44;
    const cellGap = bodyWidth / 6;
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-bodyWidth / 2} y={-bodyHeight / 2} width={bodyWidth} height={bodyHeight} rx="4" fill={fill} />
        <rect x={bodyWidth / 2} y={-capHeight / 2} width={capWidth} height={capHeight} rx="1.5" fill={fill} />
        <path d={`M ${-bodyWidth / 2 + cellGap * 2} ${-bodyHeight / 2 + 5} V ${bodyHeight / 2 - 5}`} />
        <path d={`M ${-bodyWidth / 2 + cellGap * 4} ${-bodyHeight / 2 + 5} V ${bodyHeight / 2 - 5}`} />
        <path d={`M ${-bodyWidth / 2 + 7} 0 H ${-bodyWidth / 2 + 15} M ${bodyWidth / 2 - 15} 0 H ${bodyWidth / 2 - 7} M ${bodyWidth / 2 - 11} -4 V 4`} />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-source") {
    const radius = miniature ? 15 : Math.min(w, h) * 0.35;
    if (mode === "text") {
      return uprightText(node, 0, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={radius} fill={fill} />
        {renderText && uprightText(node, 0, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
        <path d={`M ${radius * 0.8} ${-radius * 0.65} H ${radius * 1.22} M ${radius * 1.02} ${-radius * 0.85} L ${radius * 1.22} ${-radius * 0.65} L ${radius * 1.02} ${-radius * 0.45}`} />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-load") {
    if (mode === "text") {
      return uprightText(node, 0, -4, { fill: stroke, stroke: "none", fontSize: miniature ? 8 : 12, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} fill={fill} />
        {renderText && uprightText(node, 0, -4, { fill: stroke, stroke: "none", fontSize: miniature ? 8 : 12, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (
    glyphVariant === "hydrogen-electrolyzer" ||
    glyphVariant === "ac-hydrogen-electrolyzer" ||
    glyphVariant === "dc-hydrogen-electrolyzer"
  ) {
    if (mode === "text") {
      return uprightText(node, 11, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    const electrolyzerClass =
      glyphVariant === "ac-hydrogen-electrolyzer"
        ? "ac-electrolyzer-glyph"
        : glyphVariant === "dc-hydrogen-electrolyzer"
          ? "dc-electrolyzer-glyph"
          : "hydrogen-electrolyzer-glyph";
    return (
      <g className={electrolyzerClass} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2 + 6} y={-h / 2 + 5} width={w - 12} height={h - 10} rx="6" fill={fill} />
        <path d="M -24 0 H -12 M 12 0 H 24" />
        {glyphVariant === "ac-hydrogen-electrolyzer" && (
          <path className="ac-wave-marker" d="M -29 -13 C -25 -19 -20 -19 -16 -13 S -7 -7 -3 -13" />
        )}
        {glyphVariant === "dc-hydrogen-electrolyzer" && (
          <g className="dc-battery-marker">
            <rect x="-32" y="-18" width="20" height="12" rx="2" />
            <path d="M -10 -14 H -7" />
            <path d="M -28 -12 H -24 M -26 -14 V -10 M -20 -12 H -15" />
          </g>
        )}
        <path d="M -7 -12 L -1 -2 H -7 L -1 12" />
        {renderText && uprightText(node, 11, 1, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (
    glyphVariant === "hydrogen-fuel-cell" ||
    glyphVariant === "ac-hydrogen-fuel-cell" ||
    glyphVariant === "dc-hydrogen-fuel-cell"
  ) {
    if (mode === "text") {
      return uprightText(node, -20, -12, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    const fuelCellClass =
      glyphVariant === "ac-hydrogen-fuel-cell"
        ? "ac-fuel-cell-glyph"
        : glyphVariant === "dc-hydrogen-fuel-cell"
          ? "dc-fuel-cell-glyph"
          : "hydrogen-fuel-cell-glyph";
    return (
      <g className={fuelCellClass} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2 + 7} y={-h / 2 + 6} width={w - 14} height={h - 12} rx="6" fill={fill} />
        <path d="M -24 0 H -12 M 12 0 H 24" />
        {glyphVariant === "ac-hydrogen-fuel-cell" && (
          <path className="fuel-cell-ac-wave-marker" d="M -35 -13 C -31 -19 -26 -19 -22 -13 S -13 -7 -9 -13" />
        )}
        {glyphVariant === "dc-hydrogen-fuel-cell" && (
          <g className="fuel-cell-dc-battery-marker">
            <rect x="-36" y="-18" width="20" height="12" rx="2" />
            <path d="M -14 -14 H -11" />
            <path d="M -32 -12 H -28 M -30 -14 V -10 M -24 -12 H -19" />
          </g>
        )}
        <path d="M -10 -10 H 8 M -10 0 H 8 M -10 10 H 8" />
        <path d="M 13 -8 L 20 0 L 13 8" />
        {renderText && uprightText(node, -20, -12, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, "H2")}
      </g>
    );
  }

  if (glyphVariant === "hydrogen-storage") {
    if (mode === "text") {
      return uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2");
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} ${-h / 2}, ${w / 3} ${-h / 2}, ${w / 2 - 10} ${-h / 4} V ${h / 4} C ${w / 3} ${h / 2}, ${-w / 3} ${h / 2}, ${-w / 2 + 10} ${h / 4} Z`} fill={fill} />
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} 0, ${w / 3} 0, ${w / 2 - 10} ${-h / 4}`} />
        {renderText && uprightText(node, 0, 4, { fill: stroke, stroke: "none", fontSize: miniature ? 9 : 13, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, "H2")}
      </g>
    );
  }

  if (glyphVariant === "hydrogen-bus") {
    if (mode === "text") {
      return null;
    }
    return renderBusGlyphRect(w, h, stroke);
  }

  if (glyphVariant === "hydrogen-pipeline") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="-5" x2={w / 2 - 8} y2="-5" />
        <line x1={-w / 2 + 8} y1="5" x2={w / 2 - 8} y2="5" />
        <path d="M -20 -10 V 10 M 0 -10 V 10 M 20 -10 V 10" strokeWidth="1.6" />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-compressor") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 15 : 20} fill={fill} />
        <path d="M -24 0 H -9 M 10 0 H 24" />
        <path d="M -5 -10 L 10 0 L -5 10 Z" fill={fill} />
      </g>
    );
  }

  if (glyphVariant === "hydrogen-regulator" || glyphVariant === "hydrogen-valve") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -28 0 H -12 M 12 0 H 28" />
        <path d="M -12 -12 L 0 0 L -12 12 Z M 12 -12 L 0 0 L 12 12 Z" fill={fill} />
        {glyphVariant === "hydrogen-regulator" ? <path d="M 0 -20 V -8 M -6 -14 H 6 M -5 10 H 5" /> : <path d="M 0 -18 V -3 M -8 -18 H 8" />}
      </g>
    );
  }

  if (
    glyphVariant === "heat-boiler" ||
    glyphVariant === "single-heat-boiler" ||
    glyphVariant === "two-port-heat-boiler" ||
    glyphVariant === "heat-source" ||
    glyphVariant === "single-heat-source" ||
    glyphVariant === "two-port-heat-source"
  ) {
    if (mode === "text") {
      return null;
    }
    const isSourceGlyph = glyphVariant === "heat-source" || glyphVariant === "single-heat-source" || glyphVariant === "two-port-heat-source";
    const isTwoPortGlyph = glyphVariant === "two-port-heat-boiler" || glyphVariant === "two-port-heat-source";
    const heatGlyphClass =
      glyphVariant === "two-port-heat-boiler"
        ? "two-port-heat-boiler-glyph"
        : glyphVariant === "two-port-heat-source"
          ? "two-port-heat-source-glyph"
          : isSourceGlyph
            ? "single-heat-source-glyph"
            : "single-heat-boiler-glyph";
    const bodyWidth = miniature ? 34 : Math.min(w * 0.66, 58);
    const bodyHeight = miniature ? 26 : Math.min(h * 0.66, 40);
    const sourceRadius = miniature ? 15 : Math.min(w, h) * 0.27;
    return (
      <g className={heatGlyphClass} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {isSourceGlyph ? (
          <circle cx="0" cy="2" r={sourceRadius} fill={fill} />
        ) : (
          <rect x={-bodyWidth / 2} y={-bodyHeight / 2 + 5} width={bodyWidth} height={bodyHeight} rx="6" fill={fill} />
        )}
        <path d="M -8 2 C -16 -8 -2 -13 -6 -24 C 4 -17 13 -10 6 2 C 3 8 -4 8 -8 2 Z" fill={fill} />
        {isSourceGlyph ? <path d="M -11 16 H 11" /> : <path d="M -18 18 H 18" />}
        {isTwoPortGlyph ? (
          <>
            <path className="two-port-heat-flow-marker" d="M -30 -12 H -18 M -25 -16 L -31 -12 L -25 -8" />
            <path className="two-port-heat-return-marker" d="M 18 12 H 30 M 25 8 L 19 12 L 25 16" />
          </>
        ) : (
          <path d="M 20 -8 H 30 M 26 -12 L 31 -8 L 26 -4" />
        )}
      </g>
    );
  }

  if (
    glyphVariant === "heat-electric-heater" ||
    glyphVariant === "ac-heat-electric-heater" ||
    glyphVariant === "ac-two-port-heat-electric-heater" ||
    glyphVariant === "dc-heat-electric-heater" ||
    glyphVariant === "dc-two-port-heat-electric-heater"
  ) {
    if (mode === "text") {
      return null;
    }
    const isAcHeater = glyphVariant === "ac-heat-electric-heater" || glyphVariant === "ac-two-port-heat-electric-heater";
    const isDcHeater = glyphVariant === "dc-heat-electric-heater" || glyphVariant === "dc-two-port-heat-electric-heater";
    const isTwoPortHeater = glyphVariant === "ac-two-port-heat-electric-heater" || glyphVariant === "dc-two-port-heat-electric-heater";
    const heaterClass =
      glyphVariant === "ac-heat-electric-heater"
        ? "ac-heat-electric-heater-glyph"
        : glyphVariant === "ac-two-port-heat-electric-heater"
          ? "ac-two-port-heat-electric-heater-glyph"
          : glyphVariant === "dc-heat-electric-heater"
            ? "dc-heat-electric-heater-glyph"
            : glyphVariant === "dc-two-port-heat-electric-heater"
              ? "dc-two-port-heat-electric-heater-glyph"
              : "heat-electric-heater-glyph";
    return (
      <g className={heaterClass} fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2 + 7} y={-h / 2 + 6} width={w - 14} height={h - 12} rx="6" fill={fill} />
        <path d="M -28 0 H -16 M 16 0 H 28" />
        {isAcHeater && <path className="heater-ac-wave-marker" d="M -36 -14 C -32 -20 -27 -20 -23 -14 S -14 -8 -10 -14" />}
        {isDcHeater && (
          <g className="heater-dc-battery-marker">
            <rect x="-37" y="-19" width="20" height="12" rx="2" />
            <path d="M -15 -15 H -12" />
            <path d="M -33 -13 H -29 M -31 -15 V -11 M -25 -13 H -20" />
          </g>
        )}
        <path d="M -8 -13 L -1 -2 H -8 L -1 13" />
        <path d="M 9 -12 C 15 -7 15 -2 9 3 C 15 8 15 13 9 18" />
        {isTwoPortHeater ? (
          <g className="heater-two-port-heat-marker">
            <path className="heater-two-port-supply-marker" d="M 23 -13 H 34 M 29 -17 L 35 -13 L 29 -9" />
            <path className="heater-two-port-return-marker" d="M 23 13 H 34 M 29 9 L 23 13 L 29 17" />
          </g>
        ) : (
          <path d="M 25 -11 H 34 M 30 -15 L 35 -11 L 30 -7" />
        )}
      </g>
    );
  }

  if (glyphVariant === "heat-exchanger-two" || glyphVariant === "heat-exchanger-three" || glyphVariant === "heat-exchanger-four") {
    const exchangerKind = glyphVariant === "heat-exchanger-two" ? "two" : glyphVariant === "heat-exchanger-three" ? "three" : "four";
    const tag = exchangerKind === "two" ? "2" : exchangerKind === "three" ? "3" : "4";
    if (mode === "text") {
      return uprightText(node, 0, miniature ? 15 : 23, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, `${tag}P`);
    }
    if (!renderGeometry) {
      return null;
    }
    const coilRadius = miniature ? 10 : 16;
    const branchY = miniature ? 11 : 15;
    return (
      <g className={`heat-exchanger-${exchangerKind}-glyph`} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="-13" cy="0" r={coilRadius} fill={fill} />
        <circle cx="13" cy="0" r={coilRadius} fill={fill} />
        {exchangerKind === "two" && <path d="M -28 0 H -23 M 23 0 H 28" />}
        {exchangerKind === "three" && (
          <>
            <path d="M -30 0 H -23" />
            <path className="three-port-heat-exchanger-branch" d={`M 23 0 H 30 V ${-branchY} H 36 M 30 0 V ${branchY} H 36`} />
            <path className="three-port-heat-exchanger-supply-arrow" d={`M 31 ${-branchY} H 38 M 32 ${-branchY - 4} L 38 ${-branchY} L 32 ${-branchY + 4}`} />
            <path className="three-port-heat-exchanger-return-arrow" d={`M 31 ${branchY} H 38 M 34 ${branchY - 4} L 28 ${branchY} L 34 ${branchY + 4}`} />
          </>
        )}
        {exchangerKind === "four" && (
          <>
            <path className="four-port-heat-exchanger-left-branch" d={`M -23 0 H -30 V ${-branchY} H -36 M -30 0 V ${branchY} H -36`} />
            <path className="four-port-heat-exchanger-right-branch" d={`M 23 0 H 30 V ${-branchY} H 36 M 30 0 V ${branchY} H 36`} />
            <path className="four-port-heat-exchanger-left-supply-arrow" d={`M -38 ${-branchY} H -31 M -37 ${-branchY - 4} L -31 ${-branchY} L -37 ${-branchY + 4}`} />
            <path className="four-port-heat-exchanger-left-return-arrow" d={`M -31 ${branchY} H -38 M -32 ${branchY - 4} L -38 ${branchY} L -32 ${branchY + 4}`} />
            <path className="four-port-heat-exchanger-right-supply-arrow" d={`M 31 ${-branchY} H 38 M 32 ${-branchY - 4} L 38 ${-branchY} L 32 ${-branchY + 4}`} />
            <path className="four-port-heat-exchanger-right-return-arrow" d={`M 31 ${branchY} H 38 M 34 ${branchY - 4} L 28 ${branchY} L 34 ${branchY + 4}`} />
          </>
        )}
        <path d="M -15 -9 C -6 -3 -22 3 -13 9 M 15 -9 C 6 -3 22 3 13 9" />
        {renderText && uprightText(node, 0, miniature ? 15 : 23, { fill: stroke, stroke: "none", fontSize: miniature ? 7 : 10, fontWeight: "800", textAnchor: "middle" }, `${tag}P`)}
      </g>
    );
  }

  if (glyphVariant === "heat-storage") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} ${-h / 2}, ${w / 3} ${-h / 2}, ${w / 2 - 10} ${-h / 4} V ${h / 4} C ${w / 3} ${h / 2}, ${-w / 3} ${h / 2}, ${-w / 2 + 10} ${h / 4} Z`} fill={fill} />
        <path d={`M ${-w / 2 + 10} ${-h / 4} C ${-w / 3} 0, ${w / 3} 0, ${w / 2 - 10} ${-h / 4}`} />
        <path d="M -10 -1 C -4 4 -4 9 -10 14 M 3 -1 C 9 4 9 9 3 14" />
      </g>
    );
  }

  if (glyphVariant === "heat-load" || glyphVariant === "single-heat-load" || glyphVariant === "two-port-heat-load") {
    if (mode === "text") {
      return null;
    }
    const isTwoPortLoad = glyphVariant === "two-port-heat-load";
    const loadClass =
      glyphVariant === "two-port-heat-load"
        ? "two-port-heat-load-glyph"
        : glyphVariant === "single-heat-load"
          ? "single-heat-load-glyph"
          : "heat-load-glyph";
    return (
      <g className={loadClass} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {isTwoPortLoad ? (
          <rect x={-w / 2 + 10} y={-h / 2 + 8} width={w - 20} height={h - 16} rx="5" fill={fill} />
        ) : (
          <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} fill={fill} />
        )}
        <path d="M -13 -4 H 13 M -10 3 H 10 M -7 10 H 7" />
        {isTwoPortLoad ? (
          <path className="heat-load-two-port-marker" d="M -30 -13 H -17 M -23 -17 L -17 -13 L -23 -9 M 17 13 H 30 M 24 9 L 31 13 L 24 17" />
        ) : (
          <path className="heat-load-single-marker" d="M 18 -10 H 30 M 25 -14 L 31 -10 L 25 -6" />
        )}
      </g>
    );
  }

  if (glyphVariant === "heat-bus") {
    if (mode === "text") {
      return null;
    }
    return renderBusGlyphRect(w, h, stroke);
  }

  if (glyphVariant === "heat-pipeline") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="-5" x2={w / 2 - 8} y2="-5" />
        <line x1={-w / 2 + 8} y1="5" x2={w / 2 - 8} y2="5" />
        <path d="M -24 0 C -18 -8 -12 8 -6 0 C 0 -8 6 8 12 0 C 18 -8 24 8 30 0" strokeWidth="1.6" />
      </g>
    );
  }

  if (glyphVariant === "heat-pump") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 15 : 20} fill={fill} />
        <path d="M -24 0 H -10 M 10 0 H 24" />
        <path d="M -5 -11 L 12 0 L -5 11 Z" fill={fill} />
        <path d="M -3 -15 C 5 -20 15 -13 15 -4" />
      </g>
    );
  }

  if (glyphVariant === "heat-valve") {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -28 0 H -12 M 12 0 H 28" />
        <path d="M -12 -12 L 0 0 L -12 12 Z M 12 -12 L 0 0 L 12 12 Z" fill={fill} />
        <path d="M 0 -18 V -3 M -8 -18 H 8" />
      </g>
    );
  }

  if (node.kind.includes("wind-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 4 : 6} />
        <path d="M 0 0 L 0 -18 M 0 0 L 16 10 M 0 0 L -16 10" />
        <path d="M 0 6 V 22" />
      </g>
    );
  }

  if (node.kind.includes("pv-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M -22 -12 H 22 V 14 H -22 Z" />
        <path d="M -7 -12 V 14 M 8 -12 V 14 M -22 1 H 22" />
        <path d="M 0 -22 V -17 M -18 -20 L -14 -16 M 18 -20 L 14 -16" />
      </g>
    );
  }

  if (node.kind.includes("thermal-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -20 18 H 20 V -4 L 8 4 V -4 L -4 4 V -4 L -20 8 Z" />
        <path d="M -6 -12 C -12 -22 6 -22 0 -32 M 10 -12 C 4 -22 22 -22 16 -32" fill="none" />
      </g>
    );
  }

  if (node.kind.includes("hydro-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -20 -12 C -8 -24 8 -24 20 -12 C 12 10 4 20 0 22 C -4 20 -12 10 -20 -12 Z" fill={fill} />
        <path d="M -16 6 C -8 0 -2 12 6 6 C 12 1 15 5 18 8" />
      </g>
    );
  }

  if (node.kind.includes("nuclear-source")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.2">
        <circle cx="0" cy="0" r={miniature ? 16 : 22} />
        <ellipse cx="0" cy="0" rx="6" ry="20" fill="none" transform="rotate(0)" />
        <ellipse cx="0" cy="0" rx="6" ry="20" fill="none" transform="rotate(60)" />
        <ellipse cx="0" cy="0" rx="6" ry="20" fill="none" transform="rotate(120)" />
        <circle cx="0" cy="0" r="3" fill={stroke} />
      </g>
    );
  }

  if (node.kind.includes("bus")) {
    if (mode === "text") {
      return null;
    }
    return renderBusGlyphRect(w, h, stroke);
  }

  if (glyphVariant === "ac-line") {
    if (mode === "text") {
      return null;
    }
    const left = -w / 2 + 8;
    const right = w / 2 - 8;
    const symbolWidth = Math.min(Math.max(w - 24, 34), miniature ? 36 : 54);
    const symbolLeft = -symbolWidth / 2;
    const resistorWidth = symbolWidth * 0.34;
    const resistorLeft = symbolLeft;
    const resistorRight = resistorLeft + resistorWidth;
    const coilGap = 4;
    const coilStart = resistorRight + coilGap;
    const coilEnd = symbolLeft + symbolWidth;
    const loopWidth = (coilEnd - coilStart) / 3;
    const resistorHeight = miniature ? 9 : 12;
    const coilHeight = miniature ? 8 : 11;
    return (
      <g fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1={left} y1="0" x2={resistorLeft} y2="0" />
        <rect x={resistorLeft} y={-resistorHeight / 2} width={resistorWidth} height={resistorHeight} rx="1.5" />
        <line x1={resistorRight} y1="0" x2={coilStart} y2="0" />
        <path
          d={[
            `M ${coilStart} 0`,
            `C ${coilStart + loopWidth * 0.25} ${-coilHeight} ${coilStart + loopWidth * 0.75} ${-coilHeight} ${coilStart + loopWidth} 0`,
            `C ${coilStart + loopWidth * 1.25} ${-coilHeight} ${coilStart + loopWidth * 1.75} ${-coilHeight} ${coilStart + loopWidth * 2} 0`,
            `C ${coilStart + loopWidth * 2.25} ${-coilHeight} ${coilStart + loopWidth * 2.75} ${-coilHeight} ${coilEnd} 0`
          ].join(" ")}
        />
        <line x1={coilEnd} y1="0" x2={right} y2="0" />
      </g>
    );
  }

  if (glyphVariant === "dc-line") {
    if (mode === "text") {
      return null;
    }
    const left = -w / 2 + 8;
    const right = w / 2 - 8;
    const resistorWidth = Math.min(Math.max(w * 0.32, 20), miniature ? 22 : 34);
    const resistorLeft = -resistorWidth / 2;
    const resistorHeight = miniature ? 9 : 12;
    return (
      <g fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1={left} y1="0" x2={resistorLeft} y2="0" />
        <rect x={resistorLeft} y={-resistorHeight / 2} width={resistorWidth} height={resistorHeight} rx="1.5" />
        <line x1={resistorWidth / 2} y1="0" x2={right} y2="0" />
      </g>
    );
  }

  if (glyphVariant === "line") {
    if (mode === "text") {
      return null;
    }
    return (
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round">
        <line x1={-w / 2 + 8} y1="0" x2={w / 2 - 8} y2="0" />
        <line x1={-w / 4} y1="-10" x2={w / 4} y2="10" />
      </g>
    );
  }

  if (node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral") {
    if (mode === "text") {
      return null;
    }
    const hasNeutralTerminal = node.kind === "ac-three-winding-transformer-neutral";
    const windingRadius = miniature ? 9 : hasNeutralTerminal ? 14 : 15;
    const topY = miniature ? -5 : -8;
    const bottomY = miniature ? 10 : hasNeutralTerminal ? 16 : 14;
    const sideX = miniature ? 10 : hasNeutralTerminal ? 17 : 16;
    const neutralLeadTop = topY - windingRadius - (miniature ? 6 : 20);
    return (
      <g className={`three-winding-transformer-glyph${hasNeutralTerminal ? " three-winding-transformer-neutral-glyph" : ""}`} fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle className="transformer-winding" cx={-sideX} cy={topY} r={windingRadius} />
        <circle className="transformer-winding" cx={sideX} cy={topY} r={windingRadius} />
        <circle className="transformer-winding" cx="0" cy={bottomY} r={windingRadius} />
        <path d={`M ${-sideX - windingRadius - 8} ${topY} H ${-sideX - windingRadius} M ${sideX + windingRadius} ${topY} H ${sideX + windingRadius + 8} M 0 ${bottomY + windingRadius} V ${bottomY + windingRadius + 10}`} />
        <path d={`M ${-sideX + windingRadius * 0.55} ${topY + windingRadius * 0.55} L ${-windingRadius * 0.28} ${bottomY - windingRadius * 0.72} M ${sideX - windingRadius * 0.55} ${topY + windingRadius * 0.55} L ${windingRadius * 0.28} ${bottomY - windingRadius * 0.72}`} strokeWidth="1.6" />
        {hasNeutralTerminal && (
          <>
            <path d={`M 0 ${neutralLeadTop} V ${topY - windingRadius}`} />
            <circle cx="0" cy={topY - windingRadius} r={miniature ? 2.2 : 3.2} fill={stroke} stroke="none" />
          </>
        )}
      </g>
    );
  }

  if (glyphVariant === "terminal-transformer-load") {
    if (mode === "text") {
      return null;
    }
    const windingRadius = miniature ? 11 : 18;
    const leftCoilX = miniature ? -11 : -14;
    const rightCoilX = miniature ? 11 : 14;
    const loadTop = miniature ? 1 : 5;
    const loadWidth = miniature ? 11 : 15;
    const loadHeight = miniature ? 10 : 13;
    return (
      <g className="terminal-transformer-load-glyph" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={leftCoilX} cy="0" r={windingRadius} />
        <circle cx={rightCoilX} cy="0" r={windingRadius} />
        <path
          d={`M ${-loadWidth / 2} ${loadTop} H ${loadWidth / 2} L 0 ${loadTop + loadHeight} Z`}
          fill="#ffffff"
        />
      </g>
    );
  }

  if (node.kind.includes("transformer")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5">
        <circle cx="-14" cy="0" r={miniature ? 11 : 18} />
        <circle cx="14" cy="0" r={miniature ? 11 : 18} />
      </g>
    );
  }

  if (glyphVariant === "switch" || glyphVariant === "disconnector") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2="-13" y2="0" />
        <line x1="13" y1="0" x2={w / 2 - 8} y2="0" />
        <circle cx="-13" cy="0" r="3.2" fill="#ffffff" />
        <circle cx="13" cy="0" r="3.2" fill="#ffffff" />
        <line x1="-13" y1="0" x2={closed ? "13" : "10"} y2={closed ? "0" : "-15"} />
        {!closed && <line x1="8" y1="-15" x2="16" y2="-15" />}
      </g>
    );
  }

  if (glyphVariant === "ground-disconnector") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g className="ground-disconnector-glyph" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2="-18" y2="0" />
        <circle cx="-18" cy="0" r="3.2" fill="#ffffff" />
        <circle cx="8" cy="0" r="3.2" fill="#ffffff" />
        <line x1="-18" y1="0" x2={closed ? "8" : "2"} y2={closed ? "0" : "-15"} />
        {!closed && <line x1="0" y1="-15" x2="12" y2="-15" />}
        <path d="M 8 0 H 18 V 15 M 18 15 V 20 M 8 20 H 28 M 11 24 H 25 M 14 28 H 22" />
      </g>
    );
  }

  if (glyphVariant === "ground-disconnector-vertical") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g className="ground-disconnector-vertical-glyph" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="0" y1={-h / 2 + 8} x2="0" y2="-18" />
        <circle cx="0" cy="-18" r="3.2" fill="#ffffff" />
        <circle cx="0" cy="8" r="3.2" fill="#ffffff" />
        <line x1="0" y1="-18" x2={closed ? "0" : "14"} y2={closed ? "8" : "-6"} />
        {!closed && <line x1="14" y1="-8" x2="14" y2="0" />}
        <path d="M 0 8 V 18 M 0 18 V 24 M -10 24 H 10 M -7 28 H 7 M -4 32 H 4" />
      </g>
    );
  }

  if (glyphVariant === "breaker") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2="-20" y2="0" />
        <line x1="20" y1="0" x2={w / 2 - 8} y2="0" />
        <rect x="-20" y="-15" width="40" height="30" rx="5" fill={fill} />
        <path d="M -10 -8 V 8 M 10 -8 V 8" />
        {closed ? <path d="M -10 0 H 10" /> : <path d="M -8 8 L 8 -8" />}
      </g>
    );
  }

  if (glyphVariant === "box-breaker") {
    if (mode === "text") {
      return null;
    }
    const closed = getSwitchVisualState(node) === "closed";
    const boxWidth = Math.min(Math.max(w * 0.42, 34), miniature ? 36 : 48);
    const boxHeight = miniature ? 16 : 20;
    const leftWireEnd = -boxWidth / 2;
    const rightWireStart = boxWidth / 2;
    return (
      <g className="box-breaker-glyph" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 8} y1="0" x2={leftWireEnd} y2="0" />
        <line x1={rightWireStart} y1="0" x2={w / 2 - 8} y2="0" />
        <rect
          x={-boxWidth / 2}
          y={-boxHeight / 2}
          width={boxWidth}
          height={boxHeight}
          rx="2"
          fill={closed ? stroke : "#ffffff"}
        />
      </g>
    );
  }

  if (node.kind.includes("load")) {
    if (mode === "text") {
      return null;
    }
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round">
        <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} />
      </g>
    );
  }

  if (glyphVariant === "dcdc-converter" || glyphVariant === "acdc-converter" || glyphVariant === "acac-converter") {
    if (mode === "text") {
      return null;
    }
    const leftX = -w / 2 + 10;
    const rightX = w / 2 - 24;
    const symbolY = 0;
    const dcSymbol = (x: number) => (
      <g>
        <path d={`M ${x} ${symbolY - 7} H ${x + 14} M ${x + 3} ${symbolY + 7} H ${x + 11}`} />
        <path d={`M ${x + 7} ${symbolY - 7} V ${symbolY + 7}`} strokeWidth="1.4" />
      </g>
    );
    const acSymbol = (x: number) => (
      <path d={`M ${x} ${symbolY} C ${x + 3} ${symbolY - 9}, ${x + 8} ${symbolY - 9}, ${x + 11} ${symbolY} C ${x + 14} ${symbolY + 9}, ${x + 19} ${symbolY + 9}, ${x + 22} ${symbolY}`} />
    );
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={fill} />
        {glyphVariant === "dcdc-converter" ? dcSymbol(leftX) : acSymbol(leftX - 1)}
        {glyphVariant === "acdc-converter" ? dcSymbol(rightX + 4) : glyphVariant === "acac-converter" ? acSymbol(rightX) : dcSymbol(rightX + 4)}
        <path d={glyphVariant === "acac-converter" ? "M -5 -8 L 0 0 L -5 8 M 5 -8 L 0 0 L 5 8" : "M -7 0 H 7 M 2 -5 L 7 0 L 2 5"} />
      </g>
    );
  }

  if (glyphVariant === "custom-device" || node.params[CUSTOM_DEVICE_TEMPLATE_KEY] === "1") {
    const label = node.name || node.kind;
    const abbreviation = label.slice(0, 4).toUpperCase();
    if (mode === "text") {
      return uprightText(node, 0, -2, { fill: stroke, fontSize: miniature ? 10 : 15, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, abbreviation);
    }
    if (!renderGeometry) {
      return null;
    }
    return (
      <g fill="none" stroke="none">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={node.params.fillColor || "#f8fafc"} />
        {renderText && uprightText(node, 0, -2, { fill: stroke, fontSize: miniature ? 10 : 15, fontWeight: "800", textAnchor: "middle", dominantBaseline: "middle" }, abbreviation)}
      </g>
    );
  }

  if (mode === "text") {
    return null;
  }
  return (
    <g>
      <circle cx="0" cy="0" r={miniature ? 16 : 24} fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M -10 0 H 10 M 0 -10 V 10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function buildSvgNodeLabelTextMarkup(node: ModelNode) {
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

function buildSvgNodeLabelMarkup(node: ModelNode) {
  const text = nodeLabelText(node);
  if (!nodeLabelShouldRender(node, true) || !text) {
    return "";
  }
  return `<g class="export-node-label ${nodeLabelVertical(node) ? "vertical" : "horizontal"}" transform="${nodeLabelTransform(node)}">${buildSvgNodeLabelTextMarkup(node)}</g>`;
}

export function buildSvgDocument(nodes: ModelNode[], edges: Edge[], canvasSize: CanvasRenderOptions = { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }) {
  const imageAssets = readImageAssets();
  const backgroundColor = canvasSize.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND;
  const backgroundImage = canvasSize.backgroundImage ?? "";
  const colorDisplayMode = canvasSize.colorDisplayMode ?? "energy";
  const colorPalette = normalizeColorPalette(canvasSize.colorPalette ?? DEFAULT_COLOR_PALETTE);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
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
  const edgeMarkup = routeEdgesForStoredRendering(nodes, edges, canvasSize)
    .map((route) => {
      const edge = edgeById.get(route.edgeId);
      const stroke = edge ? getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette) : "#334155";
      const internalConnectors = edge
        ? [buildBoundaryBusInternalConnectorMarkup(edge, "source", stroke), buildBoundaryBusInternalConnectorMarkup(edge, "target", stroke)]
            .filter(Boolean)
            .join("\n")
        : "";
      return `<path d="${route.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${internalConnectors ? `\n${internalConnectors}` : ""}`;
    })
    .join("\n");
  const nodeMarkup = nodes
    .map((node) => {
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
      return `<g class="export-node" transform="translate(${node.position.x} ${node.position.y})">
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.width}" height="${canvasSize.height}" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}">
<rect width="100%" height="100%" fill="${backgroundColor}"/>
${backgroundImage ? `<image href="${backgroundImage}" x="0" y="0" width="${canvasSize.width}" height="${canvasSize.height}" preserveAspectRatio="xMidYMid slice"/>` : ""}
${edgeMarkup}
${nodeMarkup}
</svg>`;
}

export function App() {
  const initialDraft = useMemo(() => readDraftProject(), []);
  const initialLayeredProject = useMemo(() => normalizeProjectLayers({
    version: 1,
    name: initialDraft?.projectName ?? "电力能源系统图上模型",
    layers: initialDraft?.layers,
    activeLayerId: initialDraft?.activeLayerId,
    groups: initialDraft?.groups,
    nodes: initialDraft?.nodes ?? SAMPLE_NODES,
    edges: initialDraft?.edges ?? SAMPLE_EDGES
  }), [initialDraft]);
  const initialIndexedNodes = useMemo(
    () => assignMissingDeviceIndexes(initialLayeredProject.nodes, initialDraft?.deviceIndexCounters),
    [initialDraft?.deviceIndexCounters, initialLayeredProject.nodes]
  );
  const initialSavedSchemes = useMemo(() => readSavedSchemes(), []);
  const initialDeviceLibrary = useMemo(() => readLocalDeviceLibraryPersistencePayload(), []);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const customDeviceImageInputRef = useRef<HTMLInputElement | null>(null);
  const modelImportInputRef = useRef<HTMLInputElement | null>(null);
  const modelImportTargetSchemeIdRef = useRef<string>("");
  const schemeImportInputRef = useRef<HTMLInputElement | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const canvasInteractionRef = useRef(false);
  const lastCanvasPointerRef = useRef<Point | null>(null);
  const lastRawCanvasPointerRef = useRef<Point | null>(null);
  const projectListPointerInsideRef = useRef(false);
  const backendSchemesLoadedRef = useRef(false);
  const suppressNextBackendSchemeSyncRef = useRef(false);
  const lastPersistedSchemesPayloadRef = useRef<string | null>(null);
  const pendingBackendSchemesPayloadRef = useRef<string | null>(null);
  const schemeBackendSyncSequenceRef = useRef(0);
  const backendSchemesLoadTokenRef = useRef(0);
  const schemesChangedBeforeBackendLoadRef = useRef(false);
  const latestSchemesRef = useRef<SavedSchemeRecord[]>(initialSavedSchemes);
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
  const pendingRewirePreviewRef = useRef<{ point: Point; rewiring: Exclude<RewiringState, null> } | null>(null);
  const rewirePreviewFrameRef = useRef<number | null>(null);
  const draggingRef = useRef<DraggingState | null>(null);
  const multiNodeDragOverlayRef = useRef<SVGGElement | null>(null);
  const multiNodeDragOverlayDeltaRef = useRef<Point>({ x: 0, y: 0 });
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
  const cachedRoutedEdgesRef = useRef<RoutedEdge[]>([]);
  const cachedRouteStoreRef = useRef<RouteStore | null>(null);
  const pendingRouteEdgeIdsRef = useRef<Set<string>>(new Set());
  const pendingStoredRouteEdgeIdsRef = useRef<Set<string>>(new Set());
  const canvasVisibleViewBoxFrameRef = useRef<number | null>(null);
  const elementTreeCacheRef = useRef<{ signature: string; tree: ElementTreeGroup[] }>({ signature: "", tree: [] });
  const graphDirtyBaselineRef = useRef<GraphDirtyBaseline | null>(null);
  const suppressNextGraphDirtyRef = useRef(false);
  const latestNodesRef = useRef<ModelNode[]>([]);
  const latestEdgesRef = useRef<Edge[]>([]);
  const latestGraphStoreRef = useRef<GraphStore | null>(null);
  const deferredMoveOptimizationCancelRef = useRef<(() => void) | null>(null);
  const deferredMoveRepairFrameRef = useRef<number | null>(null);
  const lastBusTerminalSyncEndpointRevisionRef = useRef(-1);
  const pendingBusTerminalSyncNodeIdsRef = useRef<Set<string>>(new Set());
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
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() => initialDraft?.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
  const [canvasBackgroundImage, setCanvasBackgroundImage] = useState(() => initialDraft?.canvasBackgroundImage ?? "");
  const [canvasBackgroundImageAssetId, setCanvasBackgroundImageAssetId] = useState(() => initialDraft?.canvasBackgroundImageAssetId ?? "");
  const [powerUnit, setPowerUnit] = useState(() => initialDraft?.powerUnit ?? DEFAULT_POWER_UNIT);
  const [voltageUnit, setVoltageUnit] = useState(() => initialDraft?.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
  const [currentUnit, setCurrentUnit] = useState(() => initialDraft?.currentUnit ?? DEFAULT_CURRENT_UNIT);
  const [powerBaseValue, setPowerBaseValue] = useState(() => initialDraft?.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
  const [schemes, setSchemesState] = useState<SavedSchemeRecord[]>(initialSavedSchemes);
  latestSchemesRef.current = schemes;
  const setSchemes = (value: SetStateAction<SavedSchemeRecord[]>) => {
    if (!backendSchemesLoadedRef.current) {
      schemesChangedBeforeBackendLoadRef.current = true;
    }
    setSchemesState(value);
  };
  const [activeProjectId, setActiveProjectId] = useState<string>(() => initialDraft?.activeProjectId ?? "");
  const [activeSchemeId, setActiveSchemeId] = useState<string>(() => initialDraft?.activeSchemeId ?? "");
  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(nodes[0] ? [nodes[0].id] : []);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [canvasSelectionScope, setCanvasSelectionScope] = useState<CanvasSelectionScope>("group");
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string; point?: Point } | null>(null);
  const [staticDrawing, setStaticDrawing] = useState<StaticDrawingState | null>(null);
  const [connectDropReady, setConnectDropReady] = useState(false);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [rewiring, setRewiring] = useState<RewiringState>(null);
  const [terminalPress, setTerminalPress] = useState<TerminalPressState>(null);
  const [nodeLabelDrag, setNodeLabelDrag] = useState<NodeLabelDragState>(null);
  const [nodeLabelRotateDrag, setNodeLabelRotateDrag] = useState<NodeLabelRotateDragState>(null);
  const [manualPathDrag, setManualPathDrag] = useState<ManualPathDrag>(null);
  const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
  const [deviceLabelsVisible, setDeviceLabelsVisible] = useState(true);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
  const [canvasVisibleViewBox, setCanvasVisibleViewBox] = useState<CanvasViewBox>(() =>
    initialVisibleCanvasViewBox({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }, null)
  );
  const viewBoxRef = useRef<CanvasViewBox>(viewBox);
  viewBoxRef.current = viewBox;
  const [canvasCenterRequest, setCanvasCenterRequest] = useState(0);
  const [panning, setPanning] = useState<{ clientX: number; clientY: number; viewBox: typeof viewBox } | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [canvasClipboard, setCanvasClipboard] = useState<CanvasClipboard>(EMPTY_CANVAS_CLIPBOARD);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [inspectorTab, setInspectorTab] = useState<"model" | "graph" | "device">("graph");
  const [graphInfoView, setGraphInfoView] = useState<"tree" | "selected">("tree");
  const [leftPanelTab, setLeftPanelTab] = useState<"projects" | "library" | "templates">("projects");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
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
  const [containerParamViewId, setContainerParamViewId] = useState("container");
  const [expandedAttributeLibraries, setExpandedAttributeLibraries] = useState<AttributeLibrary[]>([...DEFAULT_ATTRIBUTE_LIBRARIES]);
  const [expandedAttributeLibraryComponentTypes, setExpandedAttributeLibraryComponentTypes] = useState<string[]>([]);
  const [collapsedElementTreeGroups, setCollapsedElementTreeGroups] = useState<string[]>([]);
  const [elementTreeItemLimits, setElementTreeItemLimits] = useState<Record<string, number>>({});
  const [customAttributeLibraries, setCustomAttributeLibraries] = useState<AttributeLibrary[]>(() => initialDeviceLibrary.customAttributeLibraries);
  const [customComponentTypes, setCustomComponentTypes] = useState<CustomComponentTypeDefinition[]>(() => initialDeviceLibrary.customComponentTypes);
  const [customDeviceTemplates, setCustomDeviceTemplates] = useState<DeviceTemplate[]>(() => initialDeviceLibrary.customDeviceTemplates);
  const [customGraphTemplateTypes, setCustomGraphTemplateTypes] = useState<string[]>(() => initialDeviceLibrary.customGraphTemplateTypes);
  const [customGraphTemplates, setCustomGraphTemplates] = useState<GraphTemplate[]>(() => initialDeviceLibrary.customGraphTemplates);
  const [expandedGraphTemplateTypes, setExpandedGraphTemplateTypes] = useState<string[]>([...DEFAULT_GRAPH_TEMPLATE_TYPES]);
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
  const [colorDisplayMode, setColorDisplayMode] = useState<ColorDisplayMode>(() => readColorDisplayMode());
  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => readColorPalette());
  const [colorPaletteDraft, setColorPaletteDraft] = useState<ColorPalette>(() => readColorPalette());
  const [colorPaletteDialogOpen, setColorPaletteDialogOpen] = useState(false);
  const [colorPaletteTab, setColorPaletteTab] = useState<ColorDisplayMode>(() => readColorDisplayMode());
  const [voltageColorVisibility, setVoltageColorVisibility] = useState<VoltageColorVisibility>("all");
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<UnsavedChangeAction | null>(null);
  const [pendingModelImportConflict, setPendingModelImportConflict] = useState<PendingModelImportConflict>(null);
  const [pendingSchemeImportConflict, setPendingSchemeImportConflict] = useState<PendingSchemeImportConflict>(null);
  const [pendingRecordPasteConflict, setPendingRecordPasteConflict] = useState<PendingRecordPasteConflict>(null);
  const mousePositionTextRef = useRef<HTMLSpanElement | null>(null);
  const [operationLog, setOperationLog] = useState("就绪");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedSchemeIds, setSelectedSchemeIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedSchemeIds, setExpandedSchemeIds] = useState<string[]>(() => {
    const preferredSchemeId = initialDraft?.activeSchemeId || schemes[0]?.id;
    return preferredSchemeId ? [preferredSchemeId] : [];
  });
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);
  const [projectPanelHeight, setProjectPanelHeight] = useState(PROJECT_PANEL_DEFAULT_HEIGHT);
  const [projectPanelResize, setProjectPanelResize] = useState<{ startY: number; startHeight: number } | null>(null);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  latestNodesRef.current = nodes;
  latestEdgesRef.current = edges;
  const [recordClipboard, setRecordClipboard] = useState<ClipboardRecord | null>(null);
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
  const orderedNodeFromList = (sourceNodes: ModelNode[], nodeId: string) => {
    const index = graphStore.nodeIndexById.get(nodeId);
    const indexedNode = index === undefined ? undefined : sourceNodes[index];
    if (indexedNode?.id === nodeId) {
      return indexedNode;
    }
    const currentNode = sourceNodes === nodes ? nodeById.get(nodeId) : undefined;
    return currentNode?.id === nodeId ? currentNode : undefined;
  };
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
    if (allModelLayersVisible) {
      return { nodes, edges, nodeSpatialIndex: graphStore.nodeSpatialIndex };
    }
    const filtered = filterProjectByVisibleLayers(nodes, edges, layers);
    const visibleProjectNodesMatchGraphStoreOrder =
      filtered.nodes === nodes ||
      (filtered.nodes.length === nodes.length &&
        filtered.nodes.every((node, index) => node === nodes[index]));
    return {
      ...filtered,
      nodeSpatialIndex: visibleProjectNodesMatchGraphStoreOrder
        ? graphStore.nodeSpatialIndex
        : buildNodeSpatialIndex(filtered.nodes)
    };
  }, [allModelLayersVisible, edges, graphStore.nodeSpatialIndex, layers, nodes]);
  const visibleNodes = visibleProject.nodes;
  const visibleEdges = visibleProject.edges;
  const visibleNodeById = useMemo(
    () => (visibleNodes === nodes ? graphStore.nodeMap : new Map(visibleNodes.map((node) => [node.id, node]))),
    [graphStore.nodeMap, nodes, visibleNodes]
  );
  const visibleNodeIdSet = useMemo(
    () => (visibleNodes === nodes ? graphStore.nodeIdSet : new Set(visibleNodes.map((node) => node.id))),
    [graphStore.nodeIdSet, nodes, visibleNodes]
  );
  const visibleNodeSpatialIndex = visibleProject.nodeSpatialIndex;
  const visibleEdgeIdSet = useMemo(
    () => (visibleEdges === edges ? graphStore.edgeIdSet : new Set(visibleEdges.map((edge) => edge.id))),
    [edges, graphStore.edgeIdSet, visibleEdges]
  );
  const nodeForRoutingList = (sourceNodes: ModelNode[], nodeId: string) =>
    sourceNodes === visibleNodes
      ? visibleNodeById.get(nodeId) ?? nodeById.get(nodeId)
      : orderedNodeFromList(sourceNodes, nodeId) ?? nodeById.get(nodeId);
  const addRoutingNodesForConnectionEdge = (
    edge: Edge,
    sourceNodes: ModelNode[],
    scopedNodes: Map<string, ModelNode>
  ) => {
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
  const routingNodesForConnectionEdge = (edge: Edge, sourceNodes: ModelNode[] = visibleNodes) => {
    const scopedNodes = new Map<string, ModelNode>();
    addRoutingNodesForConnectionEdge(edge, sourceNodes, scopedNodes);
    return scopedNodes.size > 0 ? Array.from(scopedNodes.values()) : sourceNodes;
  };
  const routingNodesForConnectionEdges = (
    candidateEdges: Edge[],
    sourceNodes: ModelNode[],
    extraNodeIds: Iterable<string> = []
  ) => {
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
    () => normalizeModelGroups(groups, activeLayerNodes, activeLayerEdges),
    [activeLayerEdges, activeLayerNodes, groups]
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
    () => resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, canvasSelectionScope),
    [activeLayerGroups, canvasSelectionScope, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds]
  );
  const groupExpandedCanvasSelection = useMemo(
    () => resolveCanvasSelection(activeLayerGroups, rawActiveSelectedNodeIds, rawActiveSelectedEdgeIds, "group"),
    [activeLayerGroups, rawActiveSelectedEdgeIds, rawActiveSelectedNodeIds]
  );
  const activeSelectedNodeIds = activeCanvasSelection.nodeIds;
  const selectedNodeId = activeSelectedNodeIds[0] ?? "";
  const displaySelectedNodeIds = canvasSelectionScope === "direct" ? groupExpandedCanvasSelection.nodeIds : activeSelectedNodeIds;
  const displaySelectedEdgeIds = canvasSelectionScope === "direct" ? groupExpandedCanvasSelection.edgeIds : activeCanvasSelection.edgeIds;
  const selectedNodeIdSet = useMemo(() => new Set(displaySelectedNodeIds), [displaySelectedNodeIds]);
  const selectedNode = visibleNodeById.get(selectedNodeId);
  const activeSelectedEdgeIds = activeCanvasSelection.edgeIds;
  const activeSelectedEdgeSet = useMemo(() => new Set(displaySelectedEdgeIds), [displaySelectedEdgeIds]);
  const selectedEdge = activeLayerEdgeIdSet.has(selectedEdgeId) ? edgeById.get(selectedEdgeId) : undefined;
  const deferredSelectedNode = useDeferredValue(selectedNode);
  const inspectorSelectedNode = selectedNode && deferredSelectedNode?.id === selectedNode.id ? deferredSelectedNode : selectedNode;
  const deferredSelectedEdge = useDeferredValue(selectedEdge);
  const inspectorSelectedEdge = selectedEdge && deferredSelectedEdge?.id === selectedEdge.id ? deferredSelectedEdge : selectedEdge;
  const inspectorTopologyErrors = useDeferredValue(topologyErrors);
  const connectionLineStyle = (edgeId: string) => {
    const edge = edgeById.get(edgeId);
    return edge ? ({ "--connection-color": getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette) } as CSSProperties) : undefined;
  };
  const buildMultiNodeDragOverlayPreview = (
    dragNodeIds: string[],
    affectedEdgesForDrag: Edge[],
    originalPositionsForDrag: Record<string, Point>,
    originalRoutePointsForDrag: Record<string, Point[]>,
    movingEdgeIds: Iterable<string> = []
  ): MultiNodeDragOverlayPreview => {
    const movingNodeIdSet = new Set(dragNodeIds);
    const movingEdgeIdSet = new Set(movingEdgeIds);
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
      const halfExtents = nodeTransformedHalfExtents(node, includeUprightContentInBounds);
      includeBox({
        left: originalPosition.x - halfExtents.halfWidth,
        right: originalPosition.x + halfExtents.halfWidth,
        top: originalPosition.y - halfExtents.halfHeight,
        bottom: originalPosition.y + halfExtents.halfHeight
      });
    }
    const edgeRoutes: MultiNodeDragOverlayPreview["edgeRoutes"] = [];
    for (const edge of affectedEdgesForDrag) {
      if (!visibleEdgeIdSet.has(edge.id)) {
        continue;
      }
      const edgeMovesWithDraggedGraphics =
        movingEdgeIdSet.has(edge.id) || (movingNodeIdSet.has(edge.sourceId) && movingNodeIdSet.has(edge.targetId));
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
      edgeRoutes.push({ edgeId: edge.id, path: pointsToPreviewPath(points) });
    }
    const previewBounds = bounds as RenderViewportBounds | null;
    return {
      bounds: previewBounds
        ? {
            left: previewBounds.left - 4,
            right: previewBounds.right + 4,
            top: previewBounds.top - 4,
            bottom: previewBounds.bottom + 4
          }
        : null,
      edgeRoutes
    };
  };
  const renderMultiNodeDragOverlay = () => {
    if (!dragging || !isMultiNodeMoveState(dragging)) {
      return null;
    }
    const overlay = dragging.overlayPreview ?? { bounds: null, edgeRoutes: [] };
    return (
      <g
        ref={(element) => {
          multiNodeDragOverlayRef.current = element;
          if (element) {
            updateMultiNodeDragOverlayTransform(draggingRef.current?.currentDelta ?? multiNodeDragOverlayDeltaRef.current);
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
                <DeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                <DeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
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
              {!nodeIsBus && !isStaticNode(node) && (
                <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                  {node.terminals.map((terminal) => {
                    const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                    const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind);
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
  const renderGroupTransformPhotoPreview = () => {
    if (!transformDrag || !isGroupTransformDrag(transformDrag) || !groupTransformPreviewTransform) {
      return null;
    }
    const bounds = transformDrag.bounds;
    return (
      <g className="group-transform-photo-preview">
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
                  <DeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                  <DeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
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
                {!nodeIsBus && !isStaticNode(node) && (
                  <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                    {node.terminals.map((terminal) => {
                      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind);
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
  const renderBoundaryBusInternalConnector = (node: ModelNode | undefined, point: Point | undefined, key: string) => {
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
  const projects = useMemo(() => schemes.flatMap((scheme) => scheme.projects), [schemes]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
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
  const toggleAttributeLibraryComponentType = (attributeLibraryName: string, sectionName: string) => {
    const key = attributeLibraryComponentTypeKey(attributeLibraryName, sectionName);
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
  const activeProjectRecord = projectById.get(activeProjectId);
  const saveRequired = hasUnsavedChanges;
  const canExportCurrentModel = !saveRequired;
  const activeModelName = projectName || activeProjectRecord?.name || "未命名模型";
  const activeSchemeRecord =
    schemes.find((scheme) => scheme.id === activeSchemeId) ??
    schemes.find((scheme) => scheme.projects.some((project) => project.id === activeProjectId));
  const activeModelPathName = `${activeSchemeRecord?.name ?? "未选择方案"} / ${activeModelName}`;
  const currentModelRecord: SavedProjectRecord = selectedProjectRecord ?? activeProjectRecord ?? {
    id: activeProjectId || "current-project",
    name: projectName,
    updatedAt: new Date().toISOString(),
    project: {
      version: 1,
      name: projectName,
      canvasWidth,
      canvasHeight,
      canvasBackgroundColor,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      deviceIndexCounters,
      layers,
      activeLayerId,
      groups,
      nodes,
      edges
    }
  };
  const selectedSchemeRecord = schemes.find((scheme) => scheme.id === selectedSchemeId);
  const selectedNodeCount = activeSelectedNodeIds.length;
  const selectedCount = selectedNodeCount + activeSelectedEdgeIds.length;
  const contextSelectionCount = activeSelectedNodeIds.length + activeSelectedEdgeIds.length;
  const activeSelectedGroupIds = useMemo(
    () => selectedCanvasGroupIds(activeLayerGroups, groupExpandedCanvasSelection.nodeIds, groupExpandedCanvasSelection.edgeIds),
    [activeLayerGroups, groupExpandedCanvasSelection]
  );
  const activeGroupById = useMemo(() => new Map(activeLayerGroups.map((group) => [group.id, group])), [activeLayerGroups]);
  const canAddTemplateFromSelection = activeSelectedGroupIds.length === 1;
  const selectedGroupMemberNodeIds = useMemo(
    () => canvasGroupMemberNodeIds(activeLayerGroups, activeSelectedGroupIds),
    [activeLayerGroups, activeSelectedGroupIds]
  );
  const selectedGroupMemberNodeIdSet = useMemo(() => new Set(selectedGroupMemberNodeIds), [selectedGroupMemberNodeIds]);
  const focusedGroupedNodeMovesGroup =
    canvasSelectionScope === "direct" &&
    activeSelectedNodeIds.length === 1 &&
    activeSelectedEdgeIds.length === 0 &&
    selectedGroupMemberNodeIdSet.has(activeSelectedNodeIds[0]);
  const canUngroupSelectedGraphics = useMemo(
    () => canDissolveSingleCanvasGroupSelection(activeLayerGroups, activeSelectedNodeIds, activeSelectedEdgeIds),
    [activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds]
  );
  const canGroupSelectedGraphics = useMemo(
    () => canGroupCanvasSelection(activeLayerGroups, activeSelectedNodeIds, activeSelectedEdgeIds),
    [activeLayerGroups, activeSelectedEdgeIds, activeSelectedNodeIds]
  );
  const topologyWarningPageCount = Math.max(1, Math.ceil(inspectorTopologyErrors.length / TOPOLOGY_WARNING_PAGE_SIZE));
  const normalizedTopologyWarningPage = Math.min(topologyWarningPage, topologyWarningPageCount - 1);
  const visibleTopologyErrors = inspectorTopologyErrors.slice(
    normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE,
    normalizedTopologyWarningPage * TOPOLOGY_WARNING_PAGE_SIZE + TOPOLOGY_WARNING_PAGE_SIZE
  );
  const hiddenTopologyErrorCount = Math.max(0, inspectorTopologyErrors.length - visibleTopologyErrors.length);
  const draggingNodeIdSet = useMemo(() => new Set(dragging?.nodeIds ?? []), [dragging?.nodeIds]);
  const deferredElementTreeNodes = useDeferredValue(visibleNodes);
  const deferredElementTreeEdges = useDeferredValue(visibleEdges);
  const deferredElementTreeRevision = useDeferredValue(graphStore.elementTreeRevision);
  const graphTreePanelActive = inspectorTab === "graph" && graphInfoView === "tree";
  const elementTreeLayerSignature = useMemo(
    () => layers.map((layer) => `${layer.id}:${layer.visible !== false ? "1" : "0"}`).join("|"),
    [layers]
  );
  const elementTreeSignature = useMemo(
    () => graphTreePanelActive
      ? elementTreeCacheSignature(deferredElementTreeRevision, elementTreeLayerSignature, libraryTemplates)
      : "",
    [deferredElementTreeRevision, elementTreeLayerSignature, graphTreePanelActive, libraryTemplates]
  );
  const elementTree = useMemo(() => {
    if (!graphTreePanelActive) {
      return [];
    }
    if (elementTreeCacheRef.current.signature === elementTreeSignature) {
      return elementTreeCacheRef.current.tree;
    }
    const tree = buildElementTree(deferredElementTreeNodes, deferredElementTreeEdges, libraryTemplates, { includeContainerChildren: false });
    elementTreeCacheRef.current = { signature: elementTreeSignature, tree };
    return tree;
  }, [deferredElementTreeEdges, deferredElementTreeNodes, elementTreeSignature, graphTreePanelActive, libraryTemplates]);
  const elementTreeItemChildren = (item: ElementTreeItem): ElementTreeChildItem[] => {
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
  const busTerminalSyncNodeIdsForGraphPatch = (
    movedNodeIds: Iterable<string>,
    previousCandidateEdges: Edge[],
    edgeUpserts: Edge[],
    edgeDeleteIds: string[]
  ) => {
    const ids = new Set<string>();
    for (const nodeId of movedNodeIds) {
      if (busNodeIdSet.has(nodeId)) {
        ids.add(nodeId);
      }
    }
    for (const busId of busNodeIdsFromEdges(edgeUpserts)) {
      ids.add(busId);
    }
    if (edgeDeleteIds.length > 0) {
      const deleted = new Set(edgeDeleteIds);
      for (const busId of busNodeIdsFromEdges(previousCandidateEdges.filter((edge) => deleted.has(edge.id)))) {
        ids.add(busId);
      }
    }
    return ids;
  };

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
    } else {
      pendingBusTerminalSyncNodeIdsRef.current = new Set();
    }
    let busSyncCompleted = false;
    const cancelBusSync = scheduleIdleWork(() => {
      busSyncCompleted = true;
      const syncNodes = latestNodesRef.current;
      const syncEdges = latestEdgesRef.current;
      const synchronized = scheduledBusSyncNodeIds.size > 0
        ? synchronizeBusTerminalsWithEdges(syncNodes, syncEdges, scheduledBusSyncNodeIds)
        : synchronizeBusTerminalsWithEdges(syncNodes, syncEdges, undefined);
      lastBusTerminalSyncEndpointRevisionRef.current = latestGraphStoreRef.current?.edgeEndpointRevision ?? graphStore.edgeEndpointRevision;
      if (synchronized.nodes !== syncNodes || synchronized.edges !== syncEdges) {
        const synchronizedNodeById = new Map(synchronized.nodes.map((node) => [node.id, node]));
        const changedNodeIds = syncNodes
          .filter((node) => synchronizedNodeById.get(node.id) !== node)
          .map((node) => node.id);
        markRouteEdgesDirty(dirtyEdgeIdsAfterMove(syncEdges, synchronized.edges, changedNodeIds));
        suppressNextGraphDirtyRef.current = true;
      }
      if (synchronized.nodes !== syncNodes || synchronized.edges !== syncEdges) {
        setGraphArrays(synchronized.nodes, synchronized.edges);
      }
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
  }, [busNodeIdSet, connectSource, dragging, edges, graphStore.edgeEndpointRevision, manualPathDrag, nodes, rewiring, terminalPress?.moved]);

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
  const clampCanvasBounds = (bounds: CanvasBounds): CanvasBounds => ({
    width: clampCanvasDimension(bounds.width, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth),
    height: clampCanvasDimension(bounds.height, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight)
  });
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
  const applyCanvasBounds = (bounds: CanvasBounds, originShift: Point = { x: 0, y: 0 }) => {
    const nextBounds = clampCanvasBounds(bounds);
    const hasOriginShift = originShift.x !== 0 || originShift.y !== 0;
    if (nextBounds.width === canvasWidth && nextBounds.height === canvasHeight && !hasOriginShift) {
      return false;
    }
    setCanvasWidth(nextBounds.width);
    setCanvasHeight(nextBounds.height);
    setCanvasSizeDraft({ width: String(nextBounds.width), height: String(nextBounds.height) });
    setViewBox((current) =>
      normalizeViewBoxToCanvas({
        ...current,
        x: current.x + originShift.x,
        y: current.y + originShift.y,
        ...clampViewBoxDimensionsForZoom(current, nextBounds)
      }, nextBounds)
    );
    return true;
  };
  const expandCanvasToFitGraph = (
    contentNodes: ModelNode[] = nodes,
    contentEdges: Edge[] = edges,
    contentRoutes: RoutedEdge[] = routedEdges,
    padding = CANVAS_AUTO_EXPAND_PADDING,
    baseBounds = canvasBounds
  ) => applyCanvasBounds(canvasBoundsForGraphContent(baseBounds, contentNodes, contentEdges, contentRoutes, padding));
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
          manualPoints: edge.manualPoints?.map((point) => translatePointBy(point, shift))
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
  const edgeRoutesForGeometryBounds = (edgeList: Edge[]): Pick<RoutedEdge, "points">[] =>
    edgeList.flatMap((edge) => {
      const points = [
        edge.sourcePoint,
        ...(edge.manualPoints ?? []),
        edge.targetPoint
      ].filter((point): point is Point => Boolean(point));
      return points.length > 0 ? [{ points }] : [];
    });
  const leftTopCanvasOriginShiftForContent = (
    contentNodes: ModelNode[],
    contentEdges: Edge[] = [],
    contentRoutes: Pick<RoutedEdge, "points">[] = []
  ): Point => {
    const geometryBounds = calculateModelGeometryBounds(
      contentNodes,
      [...contentRoutes, ...edgeRoutesForGeometryBounds(contentEdges)],
      0
    );
    return {
      x: geometryBounds && geometryBounds.left < 0 ? Math.ceil(-geometryBounds.left) : 0,
      y: geometryBounds && geometryBounds.top < 0 ? Math.ceil(-geometryBounds.top) : 0
    };
  };
  const canvasBoundsWithOriginShift = (baseBounds: CanvasBounds, originShift: Point): CanvasBounds => ({
    width: baseBounds.width + originShift.x,
    height: baseBounds.height + originShift.y
  });
  const clampNodePositionToExpandableBounds = (node: ModelNode, bounds: CanvasBounds, position = node.position): Point => {
    const clamped = clampNodePositionToBounds(node, bounds, position);
    return {
      x: position.x < clamped.x ? Math.round(position.x) : clamped.x,
      y: position.y < clamped.y ? Math.round(position.y) : clamped.y
    };
  };
  const clampPointToExpandableBounds = (point: Point, bounds: CanvasBounds): Point => {
    const clamped = clampPointToBounds(point, bounds);
    return {
      x: point.x < clamped.x ? Math.round(point.x) : clamped.x,
      y: point.y < clamped.y ? Math.round(point.y) : clamped.y
    };
  };
  const clampEdgeGeometryToExpandableBounds = (edge: Edge, bounds: CanvasBounds): Edge => {
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
  const scheduleCanvasVisibleViewBoxUpdate = () => {
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
      const next = visibleCanvasViewBoxFromRects(frame.getBoundingClientRect(), svg.getBoundingClientRect(), viewBoxRef.current);
      setCanvasVisibleViewBox((current) => (sameCanvasViewBox(current, next) ? current : next));
    });
  };
  const leftPanelVisible = isSidePanelVisible(leftPanelMode, leftPanelAutoVisible);
  const rightPanelVisible = isSidePanelVisible(rightPanelMode, rightPanelAutoVisible);
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
    scheduleCanvasVisibleViewBoxUpdate();
  }, [canvasHeight, canvasWidth, viewBox]);

  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    frame.addEventListener("scroll", scheduleCanvasVisibleViewBoxUpdate, { passive: true });
    window.addEventListener("resize", scheduleCanvasVisibleViewBoxUpdate);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleCanvasVisibleViewBoxUpdate);
    observer?.observe(frame);
    if (svgRef.current) {
      observer?.observe(svgRef.current);
    }
    scheduleCanvasVisibleViewBoxUpdate();
    return () => {
      frame.removeEventListener("scroll", scheduleCanvasVisibleViewBoxUpdate);
      window.removeEventListener("resize", scheduleCanvasVisibleViewBoxUpdate);
      observer?.disconnect();
    };
    // 事件处理函数只读取 ref 中的最新 viewBox；监听器不需要随每次渲染重建。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  }, [canvasHeight, canvasWidth]);

  const buildConnectPreviewPath = (
    source: typeof connectSource,
    point: Point | null,
    targetPoint: Point | null = null,
    target: ConnectTarget | null = null
  ) => {
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
  useEffect(() => {
    if (routeRenderingReady) {
      return;
    }
    if (hasUnsavedChanges || manualPathDrag || rewiring || terminalPress?.moved || dragging || connectSource) {
      setRouteRenderingReady(true);
    }
  }, [connectSource, dragging, hasUnsavedChanges, manualPathDrag, rewiring, routeRenderingReady, terminalPress?.moved]);

  const deferredRoutingNodes = useDeferredValue(visibleNodes);
  const deferredRoutingEdges = useDeferredValue(visibleEdges);
  const deferredRoutingIsCurrent = deferredRoutingNodes === visibleNodes && deferredRoutingEdges === visibleEdges;
  const requiresLiveRouting = Boolean(!deferredRoutingIsCurrent);
  const routingNodes = requiresLiveRouting ? visibleNodes : deferredRoutingNodes;
  const routingEdges = requiresLiveRouting ? visibleEdges : deferredRoutingEdges;
  const affectedRoutingEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    return ids;
  }, []);
  const routeRenderingEnabled = routeRenderingReady;
  const routedEdges = useMemo(() => {
    if (!routeRenderingEnabled) {
      return routeEdgesForStoredRendering(routingNodes, routingEdges, canvasBounds);
    }
    const committedStoredEdgeIds = pendingStoredRouteEdgeIdsRef.current;
    if (committedStoredEdgeIds.size > 0) {
      return routeEdgesForCachedStoredRendering(
        routingNodes,
        routingEdges,
        committedStoredEdgeIds,
        canvasBounds,
        cachedRoutedEdgesRef.current
      );
    }
    const committedAffectedEdgeIds = pendingRouteEdgeIdsRef.current;
    const affectedEdgeIds = committedAffectedEdgeIds.size > 0
      ? new Set([...affectedRoutingEdgeIds, ...committedAffectedEdgeIds])
      : affectedRoutingEdgeIds;
    return routeEdgesForIncrementalRendering(
      routingNodes,
      routingEdges,
      affectedEdgeIds,
      canvasBounds,
      cachedRoutedEdgesRef.current
    );
  }, [affectedRoutingEdgeIds, canvasBounds, routeRenderingEnabled, routingEdges, routingNodes]);
  const routedEdgeStore = useMemo(() => routeStoreSetRoutes(cachedRouteStoreRef.current, routedEdges), [routedEdges]);
  const routedEdgeSpatialIndex = routedEdgeStore.routeSpatialIndex;
  const routedEdgeById = routedEdgeStore.routeMap;
  const routedEdgeIndexById = routedEdgeStore.routeIndexById;
  useEffect(() => {
    cachedRoutedEdgesRef.current = routedEdges;
    cachedRouteStoreRef.current = routedEdgeStore;
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
  }, [routedEdgeStore, routedEdges]);
  const renderViewportBounds = useMemo(() => expandViewBoxForRendering(canvasVisibleViewBox), [canvasVisibleViewBox]);
  const routeRenderOrder = (first: RoutedEdge, second: RoutedEdge) =>
    (routedEdgeIndexById.get(first.edgeId) ?? Number.MAX_SAFE_INTEGER) -
    (routedEdgeIndexById.get(second.edgeId) ?? Number.MAX_SAFE_INTEGER);
  const viewportRoutedEdges = useMemo(() => {
    if (activeSelectedEdgeSet.size === 0) {
      return queryRouteSpatialIndex(routedEdgeSpatialIndex, renderViewportBounds).sort(routeRenderOrder);
    }
    const regularRoutes: RoutedEdge[] = [];
    const selectedRoutes: RoutedEdge[] = [];
    const selectedRouteIds = new Set<string>();
    for (const route of queryRouteSpatialIndex(routedEdgeSpatialIndex, renderViewportBounds)) {
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
    return selectedRoutes.length > 0 ? [...regularRoutes, ...selectedRoutes] : regularRoutes;
  }, [activeSelectedEdgeSet, renderViewportBounds, routedEdgeById, routedEdgeIndexById, routedEdgeSpatialIndex]);
  const viewportNodes = useMemo(() => {
    const viewportNodeById = new Map<string, ModelNode>();
    const addVisibleNode = (node: ModelNode | undefined) => {
      if (node && visibleNodeIdSet.has(node.id)) {
        viewportNodeById.set(node.id, node);
      }
    };
    const addVisibleNodeId = (nodeId: string | undefined) => {
      addVisibleNode(nodeId ? visibleNodeById.get(nodeId) : undefined);
    };
    for (const node of queryNodeSpatialIndex(visibleNodeSpatialIndex, renderViewportBounds)) {
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
    return Array.from(viewportNodeById.values()).sort(
      (first, second) =>
        (graphStore.nodeIndexById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (graphStore.nodeIndexById.get(second.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [connectSource?.nodeId, draggingNodeIdSet, edgeById, graphStore.nodeIndexById, renderViewportBounds, selectedNodeIdSet, viewportRoutedEdges, visibleNodeById, visibleNodeIdSet, visibleNodeSpatialIndex]);
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
    () => buildCanvasLayoutUnits(activeLayerGroups, activeLayerNodes, activeSelectedNodeIds, activeSelectedEdgeIds, activeLayerEdges, routedEdges),
    [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, routedEdges]
  );
  const selectedGroupLayoutUnits = useMemo(
    () => selectedLayoutUnits.filter((unit) => unit.kind === "group"),
    [selectedLayoutUnits]
  );
  const selectedTransformGroupUnit =
    canvasSelectionScope === "group" && selectedLayoutUnits.length === 1 && selectedGroupLayoutUnits.length === 1
      ? selectedGroupLayoutUnits[0]
      : null;
  const selectedLayoutUnitCount = selectedLayoutUnits.length;
  const markRouteEdgesDirty = (edgeIds: Iterable<string | undefined>) => {
    const next = new Set(pendingRouteEdgeIdsRef.current);
    for (const edgeId of edgeIds) {
      if (edgeId) {
        next.add(edgeId);
      }
    }
    pendingRouteEdgeIdsRef.current = next;
  };
  const markStoredRouteEdgesDirty = (edgeIds: Iterable<string | undefined>) => {
    const next = new Set(pendingStoredRouteEdgeIdsRef.current);
    for (const edgeId of edgeIds) {
      if (edgeId) {
        next.add(edgeId);
      }
    }
    pendingStoredRouteEdgeIdsRef.current = next;
  };
  const edgeReferenceDiffIds = (previousEdges: Edge[], nextEdges: Edge[]) => {
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
  const dirtyEdgeIdsAfterMove = (
    previousEdges: Edge[],
    nextEdges: Edge[],
    movedNodeIds: Iterable<string>,
    extraEdgeIds: Iterable<string> = []
  ) => {
    const movedIds = new Set(movedNodeIds);
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
  const buildMovedNodeUpdates = (
    nodeIds: Iterable<string>,
    originalPositions: Record<string, Point>,
    delta: Point,
    bounds: CanvasBounds = canvasBounds
  ) => {
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
  const edgePatchFromCandidateEdges = (previousCandidateEdges: Edge[], nextCandidateEdges: Edge[]) => {
    const previousById = new Map(previousCandidateEdges.map((edge) => [edge.id, edge]));
    const nextIds = new Set(nextCandidateEdges.map((edge) => edge.id));
    const edgeUpserts = nextCandidateEdges.filter((edge) => previousById.get(edge.id) !== edge);
    const edgeDeleteIds = previousCandidateEdges
      .filter((edge) => !nextIds.has(edge.id))
      .map((edge) => edge.id);
    return { edgeUpserts, edgeDeleteIds };
  };
  const overlayEdgesForPatch = (edgeUpserts: Edge[], edgeDeleteIds: string[], sourceEdges: Edge[] = edges) => {
    if (edgeUpserts.length === 0 && edgeDeleteIds.length === 0) {
      return sourceEdges;
    }
    const deleteIds = new Set(edgeDeleteIds);
    const upsertById = new Map(edgeUpserts.map((edge) => [edge.id, edge]));
    const nextEdges = sourceEdges
      .filter((edge) => !deleteIds.has(edge.id))
      .map((edge) => upsertById.get(edge.id) ?? edge);
    const existingIds = new Set(nextEdges.map((edge) => edge.id));
    for (const edge of edgeUpserts) {
      if (!existingIds.has(edge.id)) {
        nextEdges.push(edge);
      }
    }
    return nextEdges;
  };
  const graphStorePatchStillCurrent = (
    store: GraphStore,
    nodeUpdates: readonly ModelNode[],
    edgeUpserts: readonly Edge[],
    edgeDeleteIds: readonly string[]
  ) => {
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
  const rebuildEdgesAfterNodeGeometryChange = (
    nextNodes: ModelNode[],
    changedNodeIds: Iterable<string>,
    currentEdges: Edge[] = edges,
    preservedEdgeIds = new Set<string>()
  ) => {
    const changedIds = Array.from(new Set(changedNodeIds));
    if (changedIds.length === 0) {
      return currentEdges;
    }
    const localEdges = currentEdges === edges
      ? edgeListForNodeIds(changedIds)
      : currentEdges.filter((edge) => changedIds.includes(edge.sourceId) || changedIds.includes(edge.targetId));
    const rerouteEdges = preservedEdgeIds.size > 0
      ? localEdges.filter((edge) => !preservedEdgeIds.has(edge.id))
      : localEdges;
    if (rerouteEdges.length === 0) {
      return currentEdges;
    }
    const routingNodes = routingNodesForConnectionEdges(rerouteEdges, nextNodes, changedIds);
    const nextLocalEdges = rebuildConnectionRoutesForNodes(routingNodes, rerouteEdges, changedIds, canvasBounds, rerouteEdges);
    const dirtyEdgeIds = dirtyEdgeIdsAfterMove(rerouteEdges, nextLocalEdges, changedIds);
    markRouteEdgesDirty(dirtyEdgeIds);
    markStoredRouteEdgesDirty(dirtyEdgeIds);
    if (dirtyEdgeIds.size === 0) {
      return currentEdges;
    }
    const nextLocalEdgeById = new Map(nextLocalEdges.map((edge) => [edge.id, edge]));
    let changed = false;
    const nextEdges = currentEdges.map((edge) => {
      const nextEdge = nextLocalEdgeById.get(edge.id);
      if (!nextEdge || nextEdge === edge) {
        return edge;
      }
      changed = true;
      return nextEdge;
    });
    return changed ? nextEdges : currentEdges;
  };
  const selectedRoutedEdge = selectedEdge ? routedEdgeById.get(selectedEdge.id) : undefined;
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
  const draggingDelta = dragging?.currentDelta;
  const multiNodeDragging = Boolean(dragging && isMultiNodeMoveState(dragging));
  const dragAffectedEdgeIdSet = useMemo(
    () => new Set((dragging?.affectedEdges ?? []).map((edge) => edge.id)),
    [dragging?.affectedEdges]
  );
  const dragOverlayEdgeIdSet = useMemo(
    () => new Set((dragging?.overlayPreview?.edgeRoutes ?? []).map((route) => route.edgeId)),
    [dragging?.overlayPreview]
  );
  const draggedBusIds = useMemo(
    () => new Set((dragging?.nodeIds ?? []).filter((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && visibleNodeIdSet.has(node.id) && isBusNode(node);
    })),
    [dragging?.nodeIds, nodeById, visibleNodeIdSet]
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
        position: clampNodePositionToExpandableBounds(node, canvasBounds, {
          x: originalPosition.x + draggingDelta.x,
          y: originalPosition.y + draggingDelta.y
        })
      });
    }
    return preview;
  }, [canvasBounds, dragging, draggingDelta, nodeById]);
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
  const terminalOverlapNodes = dragging && draggingDelta && !suppressDragTerminalInteraction ? dragInteractionNodes : viewportNodes;
  const terminalOverlapAffectedNodeIds = dragging && draggingDelta && !suppressDragTerminalInteraction ? draggingNodeIdSet : undefined;
  const overlappedTerminalKeys = useMemo(
    () => {
      if (suppressDragTerminalInteraction) {
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
    [suppressDragTerminalInteraction, terminalOverlapAffectedNodeIds, terminalOverlapNodes]
  );
  const nodeTerminalSnapTarget = useMemo(
    () => (
      dragging && draggingDelta && !isMultiNodeMoveState(dragging)
        ? findNodeTerminalSnapTarget(dragInteractionNodes, draggingNodeIdSet) ??
          findNodeBusSnapTarget(dragInteractionNodes, draggingNodeIdSet)
        : null
    ),
    [dragInteractionNodes, dragging, draggingDelta, draggingNodeIdSet]
  );
  nodeTerminalSnapTargetRef.current = nodeTerminalSnapTarget;
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
  const activeDropHintPoint = rewiring?.dropTargetPoint ?? nodeTerminalSnapTarget?.point ?? null;
  const activeDropReady = connectDropReady || Boolean(rewiring?.dropTargetPoint) || Boolean(nodeTerminalSnapTarget);
  const activeDropHintStyle = rewiring?.dropTargetPoint
    ? connectionLineStyle(rewiring.edgeId)
    : nodeTerminalSnapHintStyle;
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
    if (isMultiNodeMoveState(dragging)) {
      return [];
    }
    const draggedEdgeIds = new Set(dragging.edgeIds);
    const straightPath = (points: Point[]) =>
      points.map((point, index) => `${index === 0 ? "M" : "L"} ${Math.round(point.x)} ${Math.round(point.y)}`).join(" ");
    const orthogonalPoints = (start: Point, end: Point) => {
      if (start.x === end.x || start.y === end.y) {
        return [start, end];
      }
      const midX = Math.round((start.x + end.x) / 2);
      return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
    };
    return dragging.affectedEdges.flatMap((edge) => {
      if (!visibleEdgeIdSet.has(edge.id)) {
        return [];
      }
      const affected = draggingNodeIdSet.has(edge.sourceId) || draggingNodeIdSet.has(edge.targetId) || draggedEdgeIds.has(edge.id);
      if (!affected) {
        return [];
      }
      const originalPoints = dragging.originalEdgePoints[edge.id];
      const previewEdge = {
        ...edge,
        sourcePoint: draggedBusIds.has(edge.sourceId) && originalPoints?.sourcePoint
          ? { x: originalPoints.sourcePoint.x + draggingDelta.x, y: originalPoints.sourcePoint.y + draggingDelta.y }
          : edge.sourcePoint,
        targetPoint: draggedBusIds.has(edge.targetId) && originalPoints?.targetPoint
          ? { x: originalPoints.targetPoint.x + draggingDelta.x, y: originalPoints.targetPoint.y + draggingDelta.y }
          : edge.targetPoint,
        manualPoints: originalPoints?.manualPoints
          ? originalPoints.manualPoints.map((point) => ({ x: point.x + draggingDelta.x, y: point.y + draggingDelta.y }))
          : edge.manualPoints
      };
      const sourceMoved = draggingNodeIdSet.has(edge.sourceId);
      const targetMoved = draggingNodeIdSet.has(edge.targetId);
      const source = dragPreviewNodeFor(previewEdge.sourceId);
      const target = dragPreviewNodeFor(previewEdge.targetId);
      const originalSource = nodeById.get(edge.sourceId);
      const originalTarget = nodeById.get(edge.targetId);
      if (!source || !target || !originalSource || !originalTarget) {
        return [];
      }
      const slidePatch = sourceMoved !== targetMoved
        ? resolveStraightBusSlideEndpoint({
            edge: previewEdge,
            sourceNode: originalSource,
            targetNode: originalTarget,
            nextSourceNode: source,
            nextTargetNode: target,
            movingEndpoint: sourceMoved ? "source" : "target",
            nodes,
            nextNodes: dragInteractionNodes
          })
        : null;
      const slidablePreviewEdge = slidePatch ? { ...previewEdge, ...slidePatch } : previewEdge;
      const end = getModelEdgeEndpointPoint(target, slidablePreviewEdge.targetPoint, slidablePreviewEdge.targetTerminalId);
      const adjustedStart = getModelEdgeEndpointPoint(source, slidablePreviewEdge.sourcePoint, slidablePreviewEdge.sourceTerminalId);
      const sourceNormal = getRouteEndpointNormal(source, adjustedStart, end, slidablePreviewEdge.sourceTerminalId);
      const targetNormal = getRouteEndpointNormal(target, end, adjustedStart, slidablePreviewEdge.targetTerminalId);
      const originalRoutePoints = dragging.originalRoutePoints[edge.id];
      const originalStart = originalRoutePoints?.[0];
      const originalEnd = originalRoutePoints?.[originalRoutePoints.length - 1];
      const points = originalRoutePoints?.length && originalStart && originalEnd
        ? preserveDraggedRouteShape({
            routePoints: originalRoutePoints,
            nextStart: adjustedStart,
            nextEnd: end,
            sourceDelta: { x: adjustedStart.x - originalStart.x, y: adjustedStart.y - originalStart.y },
            targetDelta: { x: end.x - originalEnd.x, y: end.y - originalEnd.y },
            routeDelta: draggedEdgeIds.has(edge.id) ? draggingDelta : undefined,
            sourceNormal,
            targetNormal
          })
        : slidablePreviewEdge.manualPoints && slidablePreviewEdge.manualPoints.length > 0
          ? [adjustedStart, ...slidablePreviewEdge.manualPoints, end]
          : orthogonalPoints(adjustedStart, end);
      return [{ edgeId: edge.id, path: straightPath(points) }];
    });
  }, [dragInteractionNodes, dragPreviewMovedNodeById, draggedBusIds, dragging, draggingDelta, draggingNodeIdSet, nodeById, visibleEdgeIdSet]);
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

  const persistBackendSchemesPayload = (normalizedSchemesPayload: string) => {
    pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload;
    const syncSequence = ++schemeBackendSyncSequenceRef.current;
    void saveBackendSchemesPayload(normalizedSchemesPayload)
      .then(() => {
        if (syncSequence !== schemeBackendSyncSequenceRef.current) {
          return;
        }
        lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;
        if (pendingBackendSchemesPayloadRef.current === normalizedSchemesPayload) {
          pendingBackendSchemesPayloadRef.current = null;
        }
        writeOperationLog("方案/模型目录已自动保存到后台");
      })
      .catch(() => {
        if (syncSequence !== schemeBackendSyncSequenceRef.current) {
          return;
        }
        pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload;
        writeOperationLog("方案/模型目录自动保存到后台失败");
      });
  };

  useEffect(() => {
    const loadToken = ++backendSchemesLoadTokenRef.current;
    fetchBackendSchemes()
      .then((backendSchemes) => {
        if (loadToken !== backendSchemesLoadTokenRef.current) {
          return;
        }
        backendSchemesLoadedRef.current = true;
        const localChangedBeforeBackendLoad = schemesChangedBeforeBackendLoadRef.current;
        const currentSchemesPayload = serializeSchemesForStorage(latestSchemesRef.current);
        if (backendSchemes.length > 0) {
          const backendPayload = serializeSchemesForStorage(backendSchemes);
          lastPersistedSchemesPayloadRef.current = backendPayload;
          if (localChangedBeforeBackendLoad) {
            suppressNextBackendSchemeSyncRef.current = false;
            schemesChangedBeforeBackendLoadRef.current = false;
            const pendingPayload = pendingBackendSchemesPayloadRef.current ?? currentSchemesPayload;
            if (pendingPayload !== backendPayload) {
              persistBackendSchemesPayload(pendingPayload);
            } else {
              pendingBackendSchemesPayloadRef.current = null;
            }
            return;
          }
          pendingBackendSchemesPayloadRef.current = null;
          suppressNextBackendSchemeSyncRef.current = true;
          setSchemesState(backendSchemes);
          setExpandedSchemeIds((current) => {
            const backendSchemeIds = new Set(backendSchemes.map((scheme) => scheme.id));
            const retained = current.filter((schemeId) => backendSchemeIds.has(schemeId));
            if (retained.length > 0) {
              return retained;
            }
            const preferredSchemeId =
              (activeSchemeId && backendSchemeIds.has(activeSchemeId) ? activeSchemeId : "") ||
              backendSchemes[0]?.id ||
              "";
            return preferredSchemeId ? [preferredSchemeId] : [];
          });
          return;
        }
        const payloadToPersist = pendingBackendSchemesPayloadRef.current ?? currentSchemesPayload;
        if (payloadToPersist) {
          suppressNextBackendSchemeSyncRef.current = false;
          schemesChangedBeforeBackendLoadRef.current = false;
          persistBackendSchemesPayload(payloadToPersist);
        }
      })
      .catch(() => {
        if (loadToken !== backendSchemesLoadTokenRef.current) {
          return;
        }
        backendSchemesLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地保存。
      });
    // 仅在启动时从后台拉取一次，避免后台数据刷新打断当前画布。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const normalizedSchemesPayload = serializeSchemesForStorage(schemes);
      if (suppressNextBackendSchemeSyncRef.current && normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current) {
        suppressNextBackendSchemeSyncRef.current = false;
        return;
      }
      if (normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current) {
        return;
      }
      try {
        window.localStorage.setItem(SCHEME_STORAGE_KEY, normalizedSchemesPayload);
      } catch {
        // 浏览器缓存不可写时不阻断当前编辑，后台同步仍会继续尝试。
      }
      if (!backendSchemesLoadedRef.current) {
        pendingBackendSchemesPayloadRef.current = normalizedSchemesPayload;
        return;
      }
      if (suppressNextBackendSchemeSyncRef.current) {
        suppressNextBackendSchemeSyncRef.current = false;
      }
      persistBackendSchemesPayload(normalizedSchemesPayload);
    }, 150);
    return () => window.clearTimeout(timeoutId);
  }, [schemes]);

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
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify({ activeProjectId, activeSchemeId }));
    } catch {
      // 忽略浏览器缓存写入失败，避免影响画布编辑。
    }
  }, [activeProjectId, activeSchemeId]);

  useEffect(() => {
    setExpandedSchemeIds((current) => {
      const schemeIds = new Set(schemes.map((scheme) => scheme.id));
      const retained = current.filter((id) => schemeIds.has(id));
      if (retained.length > 0) {
        return retained;
      }
      const preferredSchemeId =
        (activeSchemeId && schemeIds.has(activeSchemeId) ? activeSchemeId : "") ||
        (selectedSchemeId && schemeIds.has(selectedSchemeId) ? selectedSchemeId : "") ||
        schemes[0]?.id ||
        "";
      return preferredSchemeId ? [preferredSchemeId] : [];
    });
  }, [activeSchemeId, schemes, selectedSchemeId]);

  useEffect(() => {
    const preventPageWheelZoom = (event: WheelEvent) => {
      if ((event.target as Element | null)?.closest(".diagram-canvas")) {
        event.preventDefault();
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
      const target = event.target as HTMLElement | null;
      if (target?.closest(".context-menu")) {
        return;
      }
      setContextMenu(null);
      setProjectMenu(null);
    };
    window.addEventListener("pointerdown", closeContextMenus);
    return () => window.removeEventListener("pointerdown", closeContextMenus);
  }, []);

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
      keyboardMoveActiveKeyDeltasRef.current.clear();
      keyboardMoveLastFrameTimeRef.current = null;
      keyboardMoveFrameElapsedMsRef.current = 0;
      pendingKeyboardMoveDeltaRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saveRequired) {
        return;
      }
      event.preventDefault();
      event.returnValue = "当前模型尚未保存，关闭网页会丢失未保存修改。";
      return event.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveRequired]);

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
    draggingRef.current = dragging;
    if (!dragging) {
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

  const clearRecordSelection = () => {
    setSelectedProjectId("");
    setSelectedSchemeId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds([]);
  };

  const selectSingleScheme = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setSelectedSchemeIds([schemeId]);
    setSelectedProjectId("");
    setSelectedProjectIds([]);
  };

  const selectSingleProject = (schemeId: string, projectId: string) => {
    setSelectedSchemeId(schemeId);
    setSelectedProjectId(projectId);
    setSelectedProjectIds([projectId]);
    setSelectedSchemeIds([]);
  };

  const toggleSchemeSelection = (schemeId: string) => {
    setSelectedProjectId("");
    setSelectedProjectIds([]);
    setSelectedSchemeIds((current) => {
      const next = current.includes(schemeId) ? current.filter((id) => id !== schemeId) : [...current, schemeId];
      setSelectedSchemeId(next[0] ?? "");
      return next;
    });
  };

  const toggleProjectSelection = (schemeId: string, projectId: string) => {
    setSelectedSchemeIds([]);
    setSelectedProjectIds((current) => {
      const next = current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId];
      setSelectedProjectId(next[0] ?? "");
      setSelectedSchemeId(next.length > 0 ? schemeId : "");
      return next;
    });
  };

  const cloneProjectState = (deepModelSnapshot = true): UndoSnapshot => ({
    projectName,
    layers: layers.map((layer) => ({ ...layer })),
    activeLayerId,
    canvasWidth,
    canvasHeight,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
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

  const pushUndoSnapshot = (markDirty = true, deepModelSnapshot = true) => {
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    const snapshot = cloneProjectState(deepModelSnapshot);
    setUndoStack((current) => [...current.slice(-49), snapshot]);
    if (markDirty) {
      setHasUnsavedChanges(true);
    }
  };

  const ensureDraggingUndoSnapshot = () => {
    if (dragUndoCapturedRef.current) {
      return;
    }
    pushUndoSnapshot(true, false);
    dragUndoCapturedRef.current = true;
  };

  const requestCanvasFrameCenter = () => {
    setCanvasCenterRequest((current) => current + 1);
  };

  const undoLastOperation = () => {
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    pendingStoredRouteEdgeIdsRef.current = new Set();
    pendingBusTerminalSyncNodeIdsRef.current = new Set();
    setUndoStack((current) => {
      const snapshot = current.at(-1);
      if (!snapshot) {
        return current;
      }
      markRouteEdgesDirty(new Set([
        ...edges.map((edge) => edge.id),
        ...snapshot.edges.map((edge) => edge.id)
      ]));
      setProjectName(snapshot.projectName);
      setLayers(snapshot.layers.map((layer) => ({ ...layer })));
      setActiveLayerId(snapshot.activeLayerId);
      setCanvasWidth(snapshot.canvasWidth);
      setCanvasHeight(snapshot.canvasHeight);
      setCanvasBackgroundColor(snapshot.canvasBackgroundColor);
      setCanvasBackgroundImage(snapshot.canvasBackgroundImage);
      setCanvasBackgroundImageAssetId(snapshot.canvasBackgroundImageAssetId);
      setPowerUnit(snapshot.powerUnit);
      setVoltageUnit(snapshot.voltageUnit);
      setCurrentUnit(snapshot.currentUnit);
      setPowerBaseValue(snapshot.powerBaseValue);
      setDeviceIndexCounters(snapshot.deviceIndexCounters);
      skipNextTopologyStaleRef.current = true;
      setGraphArrays(snapshot.nodes, snapshot.edges);
      setGroups(snapshot.groups);
      setTopologyErrors(snapshot.topologyErrors);
      setTopology(snapshot.topology);
      setTopologyStatus(snapshot.topologyStatus);
      setCanvasSelectionScope("group");
      setSelectedNodeIds(snapshot.nodes[0] ? [snapshot.nodes[0].id] : []);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      setContextMenu(null);
      setProjectMenu(null);
      setHasUnsavedChanges(true);
      setOperationLog("撤销上一步操作");
      return current.slice(0, -1);
    });
  };

  useEffect(() => {
    setViewBox((current) => normalizeViewBoxToCanvas(current, canvasBounds));
  }, [canvasBounds]);

  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      frame.scrollLeft = Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2);
      frame.scrollTop = Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2);
      scheduleCanvasVisibleViewBoxUpdate();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [canvasCenterRequest, canvasHeight, canvasWidth]);

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
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      const nextBounds = canvasResizeBoundsFromPointerDrag(canvasResizeDrag, event, canvasResizeDrag.minBounds);
      const clampedBounds = clampCanvasBounds(nextBounds);
      const changed = clampedBounds.width !== canvasWidth || clampedBounds.height !== canvasHeight;
      if (changed && !canvasResizeUndoCapturedRef.current) {
        pushUndoSnapshot();
        canvasResizeUndoCapturedRef.current = true;
      }
      applyCanvasBounds(clampedBounds);
    };
    const handlePointerUp = () => {
      if (canvasResizeUndoCapturedRef.current) {
        writeOperationLog(`调整画布尺寸为 ${canvasWidth} x ${canvasHeight}`);
      }
      canvasResizeUndoCapturedRef.current = false;
      setCanvasResizeDrag(null);
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
        if (saveRequired) {
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
        undoLastOperation();
        return;
      }
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
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
            const scheme = schemes.find((item) => item.id === selectedSchemeId);
            if (scheme) deleteSchemeRecord(scheme);
          }
        }
      } else if (isCanvasShortcutTarget && event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6), 0, event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6), 0, event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, 0, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6), event.repeat);
      } else if (isCanvasShortcutTarget && event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelectionByKeyboard(event.key, 0, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6), event.repeat);
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
  }, [activeLayerEdges, activeLayerGroups, activeLayerNodes, activeSelectedEdgeIds, activeSelectedNodeIds, canvasBounds, canvasClipboard, canvasSelectionScope, deviceIndexCounters, displaySelectedEdgeIds, displaySelectedNodeIds, edges, hasUnsavedChanges, nodes, projectById, projectName, recordClipboard, routedEdgeById, saveRequired, schemes, selectedEdgeId, selectedEdgeIds, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, staticDrawing, topologyErrors, viewBox]);

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
    return scheduleIdleWork(() => {
      setTopologyStatus((current) =>
        current.state === "idle" ? current : { state: "idle", message: "拓扑结果已过期" }
      );
    }, 200, 500);
  }, [edges, nodes]);

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

  const currentProject = (): ProjectFile => normalizeProjectLayers(lockProjectEdgeTerminals({
      version: 1,
      name: projectName,
      layers,
      activeLayerId,
      canvasWidth,
      canvasHeight,
      canvasBackgroundColor,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      powerUnit,
      voltageUnit,
      currentUnit,
      powerBaseValue,
      deviceIndexCounters,
      groups: normalizeModelGroups(groups, nodes, edges),
      nodes,
      edges
    }));

  const currentGraphDirtyBaseline = (): GraphDirtyBaseline => ({
    projectName,
    layers,
    activeLayerId,
    canvasWidth,
    canvasHeight,
    canvasBackgroundColor,
    canvasBackgroundImage,
    canvasBackgroundImageAssetId,
    powerUnit,
    voltageUnit,
    currentUnit,
    powerBaseValue,
    deviceIndexCounters,
    nodes,
    edges,
    groups
  });

  const graphDirtyBaselineChanged = (previous: GraphDirtyBaseline, next: GraphDirtyBaseline) =>
    previous.projectName !== next.projectName ||
    previous.layers !== next.layers ||
    previous.activeLayerId !== next.activeLayerId ||
    previous.canvasWidth !== next.canvasWidth ||
    previous.canvasHeight !== next.canvasHeight ||
    previous.canvasBackgroundColor !== next.canvasBackgroundColor ||
    previous.canvasBackgroundImage !== next.canvasBackgroundImage ||
    previous.canvasBackgroundImageAssetId !== next.canvasBackgroundImageAssetId ||
    previous.powerUnit !== next.powerUnit ||
    previous.voltageUnit !== next.voltageUnit ||
    previous.currentUnit !== next.currentUnit ||
    previous.powerBaseValue !== next.powerBaseValue ||
    previous.deviceIndexCounters !== next.deviceIndexCounters ||
    previous.nodes !== next.nodes ||
    previous.edges !== next.edges ||
    previous.groups !== next.groups;

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
  }, [activeLayerId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, groups, layers, nodes, powerBaseValue, powerUnit, projectName, voltageUnit]);

  const clearTransientSelectionState = () => {
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
  };

  const writeOperationLog = (message: string) => {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setOperationLog(`${time} ${message}`);
  };

  const persistDeviceLibraryChange = (
    overrides: Partial<DeviceLibraryPersistencePayload>,
    messages: { success?: string; failure?: string } = {}
  ) => {
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
    setCanvasSelectionScope(scope);
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    return selection;
  };

  const startNodeLabelDrag = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
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

  const startNodeLabelRotateDrag = (event: PointerEvent<SVGCircleElement>, node: ModelNode) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setInspectorTab("graph");
    setGraphInfoView("selected");
    activateInspectorFromCanvas();
    setNodeLabelRotateDrag({
      nodeId: node.id,
      pointerId: event.pointerId,
      center: nodeLabelCanvasCenter(node)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishNodeLabelDrag = () => {
    setNodeLabelDrag(null);
  };

  const finishNodeLabelRotateDrag = () => {
    setNodeLabelRotateDrag(null);
  };

  const setSelectedNodeLabelDisplayMode = (mode: NodeLabelDisplayMode) => {
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
    patchGraphNodes(updates);
    writeOperationLog(`设置 ${updates.length} 个图元标识显示方式：${label}`);
  };

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

  const cutSelection = () => {
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
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`剪切 ${clipboard.nodes.length} 个图元、${clipboard.edges.length} 条联络线`);
  };

  const pasteSelection = () => {
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
    const pastedCanvasBounds = canvasBoundsForGraphContent(
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
      manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, pastedCanvasBounds))
    }));
    const nextNodes = [...pasteSourceNodes, ...pasted];
    const nextEdges = [...pasteSourceEdges, ...pastedEdges];
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

  const createGraphTemplateType = () => {
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

  const openAddTemplateDialog = () => {
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

  const cancelTemplateDialog = () => {
    setTemplateDialog(null);
    setTemplateDraftName("");
  };

  const confirmAddGraphTemplate = () => {
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

  const dropGraphTemplate = (template: GraphTemplate, pointerPosition: Point) => {
    const targetTopLeft = {
      x: Math.round(pointerPosition.x - template.sourceSize.width / 2),
      y: Math.round(pointerPosition.y - template.sourceSize.height / 2)
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
    const dropCanvasBounds = canvasBoundsForGraphContent(
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
      manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, dropCanvasBounds))
    }));
    const nextNodes = [...dropSourceNodes, ...pasted];
    const nextEdges = [...dropSourceEdges, ...pastedEdges];
    pushUndoSnapshot();
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

  const finishMarqueeSelection = () => {
    if (!marquee) {
      return;
    }
    const left = Math.min(marquee.start.x, marquee.current.x);
    const right = Math.max(marquee.start.x, marquee.current.x);
    const top = Math.min(marquee.start.y, marquee.current.y);
    const bottom = Math.max(marquee.start.y, marquee.current.y);
    if (right - left < 8 || bottom - top < 8) {
      setMarquee(null);
      return;
    }
    const selection = selectGraphicsInRect(activeLayerNodes, activeLayerRoutedEdges, { left, right, top, bottom });
    selectCanvasGraphics(selection.nodeIds, selection.edgeIds);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMarquee(null);
  };

  const deleteSelection = () => {
    if (activeSelectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0) {
      return;
    }
    const selectedEdges = new Set(activeSelectedEdgeIds);
    if (activeSelectedNodeIds.length === 0) {
      pushUndoSnapshot();
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

  const groupSelectedGraphics = () => {
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

  const ungroupSelectedGraphics = () => {
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
    const movedIds = new Set(movedNodeIds);
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

  const snapshotEdgePoints = (sourceEdges = edges) =>
    Object.fromEntries(
      sourceEdges.map((edge) => [
        edge.id,
        {
          sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
          targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
          manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
        }
      ])
    );

  const routePointSnapshotToRoutes = (routePoints: Record<string, Point[]>): { edgeId: string; points: Point[]; path: string }[] =>
    Object.entries(routePoints).map(([edgeId, points]) => ({
      edgeId,
      points: points.map((point) => ({ ...point })),
      path: ""
    }));

  const routePointBounds = (points: Point[], padding = 0) => {
    let left = points[0]?.x ?? 0;
    let right = left;
    let top = points[0]?.y ?? 0;
    let bottom = top;
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      left = Math.min(left, point.x);
      right = Math.max(right, point.x);
      top = Math.min(top, point.y);
      bottom = Math.max(bottom, point.y);
    }
    return {
      left: left - padding,
      right: right + padding,
      top: top - padding,
      bottom: bottom + padding
    };
  };

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

  const routeTouchesExpandedBoxes = (
    points: Point[],
    boxes: Array<{ left: number; right: number; top: number; bottom: number }>
  ) => {
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

  const boundsForNodeSet = (
    sourceNodes: ModelNode[],
    movedIds: Set<string>,
    positions?: Record<string, Point>,
    padding = 0
  ) => {
    let bounds: { left: number; right: number; top: number; bottom: number } | null = null;
    for (const node of orderedNodesForIds(sourceNodes, movedIds)) {
      const position = positions?.[node.id] ?? node.position;
      const halfWidth = Math.abs(node.size.width * getNodeScaleX(node)) / 2;
      const halfHeight = Math.abs(node.size.height * getNodeScaleY(node)) / 2;
      const nodeBounds = expandRouteBox(
        {
          left: position.x - halfWidth,
          right: position.x + halfWidth,
          top: position.y - halfHeight,
          bottom: position.y + halfHeight
        },
        padding
      );
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

  const localRouteOptimizationEdges = (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalPositions?: Record<string, Point>
  ) => {
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
      const routeBounds = routePointBounds(route.points, 8);
      return Boolean(
        (currentBounds && boxesOverlap(routeBounds, currentBounds)) ||
        (originalBounds && boxesOverlap(routeBounds, originalBounds))
      );
    });
  };

  const localRouteOptimizationCandidateEdges = (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    originalPositions: Record<string, Point> | undefined,
    directCandidateEdges: Edge[]
  ) => {
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

  const routePointsForMovedNodeBlockers = (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    baseRoutePoints: DraggingState["originalRoutePoints"]
  ): DraggingState["originalRoutePoints"] => {
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
      if (!route || !boxesOverlap(routePointBounds(route.points, 8), movedCandidateBounds)) {
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

  const routePointsForMovedEdgesBlockedByStationaryNodes = (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    baseRoutePoints: DraggingState["originalRoutePoints"],
    bounds: CanvasBounds = canvasBounds
  ): DraggingState["originalRoutePoints"] => {
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

  const routePointsNearOriginalMovedNodes = (
    previousNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    originalPositions: Record<string, Point> | undefined,
    baseRoutePoints: DraggingState["originalRoutePoints"]
  ): DraggingState["originalRoutePoints"] => {
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
      if (!route || !boxesOverlap(routePointBounds(route.points, 8), originalBounds)) {
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

  const adjustEdgesAfterNodeMove = (
    currentEdges: Edge[],
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    deltasByNode: Record<string, Point>,
    originalRoutePoints: DraggingState["originalRoutePoints"] = {},
    preserveRouteEdgeIds = new Set<string>(),
    bounds: CanvasBounds = canvasBounds
  ) => {
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
    const preserveAffectedRoutesForCanvasOriginShift = hasCanvasOriginShift(leftTopCanvasOriginShiftForContent(nextNodes));
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
      const slidePatch =
        sourceMoved !== targetMoved && originalSource && originalTarget && nextSource && nextTarget
          ? resolveStraightBusSlideEndpoint({
              edge: baseEdge,
              sourceNode: originalSource,
              targetNode: originalTarget,
              nextSourceNode: nextSource,
              nextTargetNode: nextTarget,
              movingEndpoint: sourceMoved ? "source" : "target",
              nodes,
              nextNodes
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

  const rebuildSingleAffectedConnectionRoute = (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: Iterable<string>,
    selectedEdgeIds = new Set<string>(),
    searchEdges: Edge[] = candidateEdges
  ) => {
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

  const terminalReconcileNodeScope = (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    movedNodeIds: Set<string>
  ) => {
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

  const finalizeMovedNodeEdgesFast = (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    localCandidateEdges: Edge[] = candidateEdges
  ) => {
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

  const optimizeMovedNodeEdgeRoutes = (
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    precomputedBlockedRoutePoints: DraggingState["originalRoutePoints"] = {},
    forcedRerouteEdgeIds = new Set<string>(),
    routeSearchEdges: Edge[] = candidateEdges
  ) => {
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

  const shouldRunDeferredMoveOptimization = (
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>,
    blockedEdgeIds = new Set<string>()
  ) => {
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

  const scheduleMovedEdgeOptimization = (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    fastEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    originalPositions?: Record<string, Point>,
    moveCandidateEdges: Edge[] = [],
    expectedPatch?: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] }
  ) => {
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length > MAX_ORIGINAL_POSITION_REROUTE_MOVED_NODES) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const routeCandidateEdges = localRouteOptimizationCandidateEdges(
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
    if (optimizationEdges.length === 0) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
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
      const expectedEdges = latestStore.edges;
      const blockedRoutePoints = routePointsForMovedNodeBlockers(expectedNodes, optimizationEdges, movedNodeIds, {});
      const blockedEdgeIds = new Set(Object.keys(blockedRoutePoints));
      const routePointsForOptimization = routePointsNearOriginalMovedNodes(
        previousNodes,
        optimizationEdges,
        movedNodeIds,
        originalPositions,
        blockedRoutePoints
      );
      const releasedEdgeIds = Object.keys(routePointsForOptimization).filter((edgeId) => !blockedRoutePoints[edgeId]);
      const forcedRerouteEdgeIds = new Set(releasedEdgeIds);
      for (const edgeId of releasedEdgeIds) {
        blockedEdgeIds.add(edgeId);
      }
      if (!shouldRunDeferredMoveOptimization(optimizationEdges, movedNodeIds, selectedEdgeIds, blockedEdgeIds)) {
        return;
      }
      const optimized = optimizeMovedNodeEdgeRoutes(
        expectedNodes,
        expectedEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds,
        routePointsForOptimization,
        forcedRerouteEdgeIds,
        optimizationEdges
      );
      if (optimized.edges === expectedEdges) {
        return;
      }
      const dirtyOptimizedEdgeIds = new Set<string>([...blockedEdgeIds, ...forcedRerouteEdgeIds]);
      for (const edgeId of Object.keys(optimized.routePoints)) {
        dirtyOptimizedEdgeIds.add(edgeId);
      }
      const optimizedEdgeUpdates: Edge[] = [];
      for (const edgeId of dirtyOptimizedEdgeIds) {
        const edgeIndex = latestStore.edgeIndexById.get(edgeId);
        if (edgeIndex === undefined) {
          continue;
        }
        const optimizedEdge = optimized.edges[edgeIndex];
        if (optimizedEdge && expectedEdges[edgeIndex] !== optimizedEdge) {
          optimizedEdgeUpdates.push(optimizedEdge);
        }
      }
      if (optimizedEdgeUpdates.length === 0) {
        return;
      }
      markRouteEdgesDirty(dirtyOptimizedEdgeIds);
      markBusTerminalSyncDirtyForEdges(optimizedEdgeUpdates);
      setGraphStore((current) => graphStorePatchEdges(current, optimizedEdgeUpdates));
    }, 180, 1500);
  };

  const scheduleDeferredMovedConnectionRepair = (
    movedNodeIds: string[],
    candidateEdges: Edge[],
    expectedPatch: { nodeUpdates: ModelNode[]; edgeUpserts: Edge[]; edgeDeleteIds: string[] },
    effectiveCanvasBounds: CanvasBounds = canvasBounds
  ) => {
    deferredMoveOptimizationCancelRef.current?.();
    if (movedNodeIds.length <= 1 || candidateEdges.length === 0) {
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
      const repairCanvasBounds = canvasBoundsForGraphContent(
        effectiveCanvasBounds,
        latestNodes,
        latestStore.edges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      const movedBlockerRoutePoints = routePointsForMovedNodeBlockers(latestNodes, latestCandidateEdges, movedNodeIds, {});
      const stationaryBlockerRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        latestNodes,
        latestCandidateEdges,
        movedNodeIds,
        movedBlockerRoutePoints,
        repairCanvasBounds
      );
      const repairRoutePoints = { ...movedBlockerRoutePoints, ...stationaryBlockerRoutePoints };
      const repairEdgeIds = new Set(Object.keys(repairRoutePoints));
      if (repairEdgeIds.size === 0) {
        return;
      }
      const repairCandidateEdges = latestCandidateEdges.filter((edge) => repairEdgeIds.has(edge.id));
      const optimized = optimizeMovedNodeEdgeRoutes(
        latestNodes,
        latestStore.edges,
        movedNodeIds,
        {},
        new Set<string>(),
        repairRoutePoints,
        repairEdgeIds,
        repairCandidateEdges
      );
      if (optimized.edges === latestStore.edges) {
        return;
      }
      const edgeUpdates = Array.from(repairEdgeIds).flatMap((edgeId) => {
        const edgeIndex = latestStore.edgeIndexById.get(edgeId);
        const edge = edgeIndex === undefined ? undefined : optimized.edges[edgeIndex];
        if (edgeIndex !== undefined && latestStore.edges[edgeIndex] === edge) {
          return [];
        }
        return edge ? [edge] : [];
      });
      if (edgeUpdates.length === 0) {
        return;
      }
      markRouteEdgesDirty(repairEdgeIds);
      markStoredRouteEdgesDirty(repairEdgeIds);
      markBusTerminalSyncDirtyForEdges(edgeUpdates);
      setGraphStore((current) => graphStorePatchEdges(current, edgeUpdates));
    }, 60, 1500);
  };

  const commitFastMovedGraphPatches = (
    movedNodeUpdates: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    previousCandidateEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>(),
    originalPositions?: Record<string, Point>,
    previousNodes: ModelNode[] = nodes,
    effectiveCanvasBounds: CanvasBounds = canvasBounds
  ) => {
    markStoredRouteEdgesDirty(dirtyEdgeIdsForMovedLocalRoutes(selectedEdgeIds, originalRoutePoints));
    let committedCandidateEdges = candidateEdges;
    const deferMovedRouteRepair = movedNodeIds.length > 1;
    const originShift = leftTopCanvasOriginShiftForContent(nextNodes, committedCandidateEdges);
    if (hasCanvasOriginShift(originShift)) {
      const candidateEdgeById = new Map(committedCandidateEdges.map((edge) => [edge.id, edge]));
      const rawNextEdges = edges.map((edge) => candidateEdgeById.get(edge.id) ?? edge);
      const shiftedNextNodes = nextNodes.map((node) => translateNodeBy(node, originShift));
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
      markBusTerminalSyncDirtyForEdges(shiftedNextEdges);
      setGraphStore((current) => graphStoreSetGraph(current, shiftedNextNodes, shiftedNextEdges));
      return;
    }
    const commitCanvasBounds = canvasBoundsForGraphContent(effectiveCanvasBounds, nextNodes, committedCandidateEdges, [], CANVAS_AUTO_EXPAND_PADDING);
    if (deferMovedRouteRepair) {
      const edgePatch = edgePatchFromCandidateEdges(previousCandidateEdges, committedCandidateEdges);
      const expectedPatch = { nodeUpdates: movedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
      const edgePatchDirtyIds = [
        ...edgePatch.edgeUpserts.map((edge) => edge.id),
        ...edgePatch.edgeDeleteIds
      ];
      markRouteEdgesDirty(edgePatchDirtyIds);
      markStoredRouteEdgesDirty(edgePatchDirtyIds);
      markBusTerminalSyncDirty(
        busTerminalSyncNodeIdsForGraphPatch(
          movedNodeIds,
          previousCandidateEdges,
          edgePatch.edgeUpserts,
          edgePatch.edgeDeleteIds
        )
      );
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
      if (candidateEdges.length > 0) {
        deferredMoveRepairFrameRef.current = window.requestAnimationFrame(() => {
          deferredMoveRepairFrameRef.current = null;
          scheduleDeferredMovedConnectionRepair(movedNodeIds, committedCandidateEdges, expectedPatch, commitCanvasBounds);
        });
      }
      return;
    }
    if (movedNodeIds.length > 0) {
      const blockedConnectedRoutePoints = routePointsForMovedEdgesBlockedByStationaryNodes(
        nextNodes,
        committedCandidateEdges,
        movedNodeIds,
        {},
        commitCanvasBounds
      );
      const blockedConnectedEdgeIds = new Set(Object.keys(blockedConnectedRoutePoints));
      if (blockedConnectedEdgeIds.size > 0) {
        let blockedCandidateEdges = committedCandidateEdges.filter((edge) => blockedConnectedEdgeIds.has(edge.id));
        let routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, nextNodes, movedNodeIds);
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
        routingNodes = routingNodesForConnectionEdges(blockedCandidateEdges, nextNodes, movedNodeIds);
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
    const nextEdgesForBounds = overlayEdgesForPatch(edgePatch.edgeUpserts, edgePatch.edgeDeleteIds);
    expandCanvasToFitGraph(nextNodes, nextEdgesForBounds, [], CANVAS_AUTO_EXPAND_PADDING, commitCanvasBounds);
    const edgePatchDirtyIds = [
      ...edgePatch.edgeUpserts.map((edge) => edge.id),
      ...edgePatch.edgeDeleteIds
    ];
    const expectedPatch = { nodeUpdates: movedNodeUpdates, edgeUpserts: edgePatch.edgeUpserts, edgeDeleteIds: edgePatch.edgeDeleteIds };
    markRouteEdgesDirty(edgePatchDirtyIds);
    markBusTerminalSyncDirty(
      busTerminalSyncNodeIdsForGraphPatch(
        movedNodeIds,
        previousCandidateEdges,
        edgePatch.edgeUpserts,
        edgePatch.edgeDeleteIds
      )
    );
    setGraphStore((current) =>
      graphStoreApplyPatch(current, {
        nodeUpdates: expectedPatch.nodeUpdates,
        edgeUpserts: expectedPatch.edgeUpserts,
        edgeDeleteIds: expectedPatch.edgeDeleteIds
      })
    );
    scheduleMovedEdgeOptimization(
      previousNodes,
      nextNodes,
      committedCandidateEdges,
      movedNodeIds,
      originalRoutePoints,
      selectedEdgeIds,
      originalPositions,
      committedCandidateEdges,
      expectedPatch
    );
  };

  const clampPointToCanvas = (point: Point) => clampPointToBounds(point, canvasBounds);
  const clampNodeToCanvas = (node: ModelNode, position = node.position) => clampNodePositionToBounds(node, canvasBounds, position);
  const clampViewBoxToCanvas = (box: typeof viewBox) => normalizeViewBoxToCanvas(box, canvasBounds);
  const updateMouseStatus = (point: Point) => {
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
  const updateMultiNodeDragOverlayTransform = (delta: Point | null) => {
    const nextDelta = delta ?? { x: 0, y: 0 };
    multiNodeDragOverlayDeltaRef.current = nextDelta;
    if (!multiNodeDragOverlayRef.current) {
      return;
    }
    multiNodeDragOverlayRef.current.setAttribute("transform", `translate(${Math.round(nextDelta.x)} ${Math.round(nextDelta.y)})`);
  };
  const resetMultiNodeDragOverlayTransform = () => {
    updateMultiNodeDragOverlayTransform({ x: 0, y: 0 });
  };
  const flushConnectPreviewDom = () => {
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
  const setConnectPreviewDom = (path: string, targetPoint: Point | null) => {
    const previous = connectPreviewDomRef.current;
    if (previous.path === path && sameOptionalPoint(previous.targetPoint ?? undefined, targetPoint ?? undefined)) {
      return;
    }
    connectPreviewDomRef.current = { path, targetPoint };
    flushConnectPreviewDom();
  };
  const applyConnectPreviewState = (
    point: Point | null,
    ready: boolean,
    targetPoint: Point | null = null,
    target: ConnectTarget | null = null,
    sourceOverride: typeof connectSource = connectSource
  ) => {
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
  const scheduleConnectPreviewPoint = (point: Point | null) => {
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
  const scheduleRewirePreviewPoint = (point: Point, rewiring: Exclude<RewiringState, null>) => {
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
  const boundedDeltaForNodes = (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number,
    bounds: CanvasBounds = canvasBounds
  ) => {
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

  const nodeMoveGeometryInsideCanvas = (
    nodeIds: string[],
    edgeIds: string[],
    affectedEdgesForMove: Edge[],
    originalPositions: Record<string, Point>,
    originalEdgePoints: DraggingState["originalEdgePoints"],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    delta: Point,
    bounds: CanvasBounds = canvasBounds
  ) => {
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
    const originShift = leftTopCanvasOriginShiftForContent(movedNodes, [], affectedRoutes);
    const shiftedBounds = canvasBoundsWithOriginShift(bounds, originShift);
    const shiftedMovedNodes = hasCanvasOriginShift(originShift)
      ? movedNodes.map((node) => translateNodeBy(node, originShift))
      : movedNodes;
    const shiftedAffectedRoutes = hasCanvasOriginShift(originShift)
      ? affectedRoutes.map((route) => translateRouteBy(route, originShift))
      : affectedRoutes;
    return modelGeometryInsideCanvasBounds(shiftedMovedNodes, shiftedAffectedRoutes, shiftedBounds, MOVE_BOUNDARY_GUARD);
  };

  const nearestBoundarySafeDelta = (
    requestedDelta: Point,
    isSafeDelta: (delta: Point) => boolean,
    fallbackDelta: Point = { x: 0, y: 0 }
  ): Point => {
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

  const canvasBoundsForMoveDelta = (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number
  ) => {
    if (nodeIds.length === 0) {
      return canvasBounds;
    }
    const movedNodeIds = new Set(nodeIds);
    const previewNodes = nodes.map((node) => {
      const originalPosition = originalPositions[node.id];
      return movedNodeIds.has(node.id) && originalPosition
        ? {
            ...node,
            position: {
              x: Math.round(originalPosition.x + dx),
              y: Math.round(originalPosition.y + dy)
            }
          }
        : node;
    });
    return canvasBoundsForGraphContent(canvasBounds, previewNodes, edges, [], CANVAS_AUTO_EXPAND_PADDING);
  };

  const canvasBoundsForMovedNodeDelta = (
    nodeIds: string[],
    originalPositions: Record<string, Point>,
    dx: number,
    dy: number
  ) => {
    if (nodeIds.length === 0) {
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

  const computeNodeDragDelta = (
    dragState: DraggingState,
    point: Point,
    ctrlKey: boolean,
    shiftKey: boolean
  ) => {
    const rawDx = point.x - dragState.startPoint.x;
    const rawDy = point.y - dragState.startPoint.y;
    const movementDelta = ctrlKey || shiftKey ? axisLockedDelta(rawDx, rawDy) : { x: rawDx, y: rawDy };
    if (isMultiNodeMoveState(dragState)) {
      const expandedBounds = canvasBoundsForMovedNodeDelta(dragState.nodeIds, dragState.originalPositions, movementDelta.x, movementDelta.y);
      return boundedDeltaForNodes(
        dragState.nodeIds,
        dragState.originalPositions,
        movementDelta.x,
        movementDelta.y,
        expandedBounds
      );
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

  const applyNodeDragMove = (point: Point, ctrlKey: boolean, shiftKey: boolean, renderPreview = true) => {
    const currentDrag = draggingRef.current;
    if (!currentDrag) {
      return;
    }
    if (!isMultiNodeMoveState(currentDrag) && !currentDrag.historyCaptured && !dragUndoCapturedRef.current) {
      ensureDraggingUndoSnapshot();
    }
    const boundedDelta = computeNodeDragDelta(currentDrag, point, ctrlKey, shiftKey);
    if (
      currentDrag.historyCaptured &&
      currentDrag.currentDelta?.x === boundedDelta.x &&
      currentDrag.currentDelta?.y === boundedDelta.y
    ) {
      draggingRef.current = currentDrag;
      return;
    }
    if (isMultiNodeMoveState(currentDrag)) {
      applyCanvasBounds(canvasBoundsForMovedNodeDelta(currentDrag.nodeIds, currentDrag.originalPositions, boundedDelta.x, boundedDelta.y));
      draggingRef.current = {
        ...currentDrag,
        currentDelta: boundedDelta,
        historyCaptured: true
      };
      if (renderPreview) {
        updateMultiNodeDragOverlayTransform(boundedDelta);
      }
      return;
    }
    const nextDragState = {
      ...currentDrag,
      currentDelta: boundedDelta,
      historyCaptured: true
    };
    if (!isMultiNodeMoveState(currentDrag)) {
      applyCanvasBounds(canvasBoundsForMoveDelta(currentDrag.nodeIds, currentDrag.originalPositions, boundedDelta.x, boundedDelta.y));
    }
    draggingRef.current = nextDragState;
    if (!renderPreview) {
      return;
    }
    setDragging((current) => {
      if (!current) {
        draggingRef.current = null;
        return current;
      }
      if (
        current.historyCaptured &&
        current.currentDelta?.x === boundedDelta.x &&
        current.currentDelta?.y === boundedDelta.y
      ) {
        draggingRef.current = current;
        return current;
      }
      const next = {
        ...current,
        currentDelta: boundedDelta,
        historyCaptured: true
      };
      draggingRef.current = next;
      return next;
    });
  };

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
    draggingRef.current = null;
    setDragging(null);
    dragUndoCapturedRef.current = false;
  };

  const finishDraggingMove = (
    activeDragging: DraggingState | null,
    snapTarget: NodeTerminalSnapTarget | null,
    actionLabel: "拖拽" | "移动"
  ) => {
    if (!activeDragging) {
      return false;
    }
    const delta = activeDragging.currentDelta;
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      clearDraggingMoveState();
      return false;
    }
    ensureDraggingUndoSnapshot();
    const dragNodeIds = new Set(activeDragging.nodeIds);
    const effectiveSnapTarget = isMultiNodeMoveState(activeDragging) ? null : snapTarget;
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
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
      clearDraggingMoveState();
      return false;
    }
    const finalBounds = canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta.x, finalDelta.y);
    applyCanvasBounds(finalBounds);
    const movedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
    const nextNodes = overlayGraphStoreNodes(graphStore, movedNodeUpdates);
    const hasAffectedEdges = activeDragging.affectedEdges.some((edge) => dragNodeIds.has(edge.sourceId) || dragNodeIds.has(edge.targetId));
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, activeDragging.nodeIds, activeDragging.edgeIds);
    const adjustedAffectedEdges = hasAffectedEdges
      ? adjustEdgesAfterNodeMove(
          activeDragging.affectedEdges,
          nextNodes,
          dragNodeIds,
          activeDragging.originalEdgePoints,
          Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta])),
          activeDragging.originalRoutePoints,
          preserveRouteEdgeIds,
          finalBounds
        )
      : activeDragging.affectedEdges;
    const finalizedCandidateEdges = multiNodeMove
      ? adjustedAffectedEdges
      : finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          activeDragging.nodeIds,
          adjustedAffectedEdges
        );
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      activeDragging.affectedEdges,
      activeDragging.nodeIds,
      activeDragging.originalRoutePoints,
      new Set(activeDragging.edgeIds),
      activeDragging.originalPositions,
      nodes,
      finalBounds
    );
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

  const finishNodeDrag = () => {
    flushPendingNodeDragMove(false);
    const activeDragging = draggingRef.current ?? dragging;
    if (!activeDragging) {
      return;
    }
    const delta = activeDragging.currentDelta;
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      clearNodeDragMoveSchedule();
      resetMultiNodeDragOverlayTransform();
      draggingRef.current = null;
      setDragging(null);
      return;
    }
    ensureDraggingUndoSnapshot();
    const dragNodeIds = new Set(activeDragging.nodeIds);
    const effectiveSnapTarget = isMultiNodeMoveState(activeDragging) ? null : nodeTerminalSnapTarget;
    const multiNodeMove = isMultiNodeMoveState(activeDragging);
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
      draggingRef.current = null;
      setDragging(null);
      return;
    }
    const finalBounds = canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta.x, finalDelta.y);
    applyCanvasBounds(finalBounds);
    const movedNodeUpdates = buildMovedNodeUpdates(activeDragging.nodeIds, activeDragging.originalPositions, finalDelta, finalBounds);
    const nextNodes = overlayGraphStoreNodes(graphStore, movedNodeUpdates);
    const hasAffectedEdges = activeDragging.affectedEdges.some((edge) => dragNodeIds.has(edge.sourceId) || dragNodeIds.has(edge.targetId));
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(activeDragging.affectedEdges, activeDragging.nodeIds, activeDragging.edgeIds);
    const adjustedAffectedEdges = hasAffectedEdges
      ? adjustEdgesAfterNodeMove(
          activeDragging.affectedEdges,
          nextNodes,
          dragNodeIds,
          activeDragging.originalEdgePoints,
          Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta])),
          activeDragging.originalRoutePoints,
          preserveRouteEdgeIds,
          finalBounds
        )
      : activeDragging.affectedEdges;
    const finalizedCandidateEdges = multiNodeMove
      ? adjustedAffectedEdges
      : finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          activeDragging.nodeIds,
          adjustedAffectedEdges
        );
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      activeDragging.affectedEdges,
      activeDragging.nodeIds,
      activeDragging.originalRoutePoints,
      new Set(activeDragging.edgeIds),
      activeDragging.originalPositions,
      nodes,
      finalBounds
    );
    clearNodeDragMoveSchedule();
    resetMultiNodeDragOverlayTransform();
    draggingRef.current = null;
    setDragging(null);
    dragUndoCapturedRef.current = false;
    const snapText =
      effectiveSnapTarget &&
      finalDelta.x === snappedDelta.x &&
      finalDelta.y === snappedDelta.y
        ? "，端子已吸附"
        : "";
    writeOperationLog(`拖拽 ${activeDragging.nodeIds.length} 个图元 (${Math.round(finalDelta.x)}, ${Math.round(finalDelta.y)})${snapText}`);
  };

  const finishTransformDrag = () => {
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
          let transformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, currentStore);
          const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, currentStore);
          const transformedEdges = overlayEdgeUpdatesForTransform(currentStore.edges, transformedEdgeUpdates);
          const transformBounds = canvasBoundsForGraphContent(
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
            let currentTransformedNodeUpdates = buildGroupTransformNodeUpdates(activeTransform, finalPreviewPoint, current);
            const transformedEdgeUpdates = buildGroupTransformEdgeUpdates(activeTransform, finalPreviewPoint, current);
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
      } else {
        const nextEdges = rebuildEdgesAfterNodeGeometryChange(nodes, transformedNodeIds);
        if (nextEdges !== edges) {
          setGraphStore((current) =>
            graphStorePatchEdgesFromArray(current, nextEdges, edgeListForNodeIds(transformedNodeIds).map((edge) => edge.id))
          );
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

  const applyKeyboardMoveDelta = (requestedDelta: Point, renderPreview = true, logBoundary = true) => {
    const activeDragging = draggingRef.current;
    if (activeDragging?.source !== "keyboard") {
      return false;
    }
    const previousDelta = activeDragging.currentDelta ?? { x: 0, y: 0 };
    const expandedBounds = isMultiNodeMoveState(activeDragging)
      ? canvasBoundsForMovedNodeDelta(activeDragging.nodeIds, activeDragging.originalPositions, requestedDelta.x, requestedDelta.y)
      : canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, requestedDelta.x, requestedDelta.y);
    const boundedDelta = isMultiNodeMoveState(activeDragging)
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
    if (boundedDelta.x === previousDelta.x && boundedDelta.y === previousDelta.y) {
      if (logBoundary) {
        writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      }
      return false;
    }
    if (!isMultiNodeMoveState(activeDragging) && !activeDragging.historyCaptured && !dragUndoCapturedRef.current) {
      ensureDraggingUndoSnapshot();
    }
    const nextDragging = {
      ...activeDragging,
      currentDelta: boundedDelta,
      historyCaptured: true
    };
    if (isMultiNodeMoveState(activeDragging)) {
      applyCanvasBounds(canvasBoundsForMovedNodeDelta(activeDragging.nodeIds, activeDragging.originalPositions, boundedDelta.x, boundedDelta.y));
      draggingRef.current = nextDragging;
      if (renderPreview) {
        updateMultiNodeDragOverlayTransform(boundedDelta);
      }
      return true;
    }
    if (!isMultiNodeMoveState(activeDragging)) {
      applyCanvasBounds(canvasBoundsForMoveDelta(activeDragging.nodeIds, activeDragging.originalPositions, boundedDelta.x, boundedDelta.y));
    }
    draggingRef.current = nextDragging;
    if (renderPreview) {
      setDragging((current) => (current?.source === "keyboard" || current === null ? nextDragging : current));
      if (keyboardMoveActiveKeyDeltasRef.current.size === 0) {
        scheduleKeyboardMoveCommit();
      }
    }
    return true;
  };

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

  const scheduleKeyboardNudgeFrame = () => {
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

  const startKeyboardMoveSession = (renderInitial = true) => {
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
    const originalRoutePointsForMove = Object.fromEntries(
      affectedEdgesForMove.map((edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
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
            manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForMove,
      overlayPreview: isMultiNodeMoveState({ nodeIds: moveNodeIds })
        ? buildMultiNodeDragOverlayPreview(moveNodeIds, affectedEdgesForMove, originalPositionsForMove, originalRoutePointsForMove, moveEdgeIds)
        : undefined
    };
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    draggingRef.current = nextDragging;
    resetMultiNodeDragOverlayTransform();
    if (renderInitial || isMultiNodeMoveState(nextDragging)) {
      setDragging(nextDragging);
    }
    return nextDragging;
  };

  const nudgeSelectionByKeyboard = (key: string, dx: number, dy: number, repeated = false) => {
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

  const moveSelection = (dx: number, dy: number) => {
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
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForMove.map((edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
    const expandedBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, dx, dy);
    const boundedDelta = moveNodeIds.length > 1
      ? boundedDeltaForNodes(
          moveNodeIds,
          originalPositions,
          dx,
          dy,
          expandedBounds
        )
      : boundedDeltaForMoveGeometry(
          moveNodeIds,
          moveEdgeIds,
          affectedEdgesForMove,
          originalPositions,
          originalEdgePoints,
          originalRoutePoints,
          dx,
          dy,
          undefined,
          expandedBounds
        );
    if (boundedDelta.x === 0 && boundedDelta.y === 0) {
      writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      return;
    }
    pushUndoSnapshot();
    const finalBounds = canvasBoundsForMoveDelta(moveNodeIds, originalPositions, boundedDelta.x, boundedDelta.y);
    applyCanvasBounds(finalBounds);
    const deltasByNode = Object.fromEntries(moveNodeIds.map((id) => [id, boundedDelta]));
    const selected = new Set(moveNodeIds);
    const movedNodeUpdates = buildMovedNodeUpdates(moveNodeIds, originalPositions, boundedDelta, finalBounds);
    const nextNodes = overlayGraphStoreNodes(graphStore, movedNodeUpdates);
    const multiNodeMove = moveNodeIds.length > 1;
    const preserveRouteEdgeIds = routePreserveEdgeIdsForMovedNodes(affectedEdgesForMove, moveNodeIds, moveEdgeIds);
    const adjustedAffectedEdges = affectedEdgesForMove.length > 0
      ? adjustEdgesAfterNodeMove(
          affectedEdgesForMove,
          nextNodes,
          selected,
          originalEdgePoints,
          deltasByNode,
          originalRoutePoints,
          preserveRouteEdgeIds,
          finalBounds
        )
      : affectedEdgesForMove;
    const finalizedCandidateEdges = multiNodeMove
      ? adjustedAffectedEdges
      : finalizeMovedNodeEdgesFast(
          nodes,
          nextNodes,
          adjustedAffectedEdges,
          moveNodeIds,
          adjustedAffectedEdges
        );
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      nextNodes,
      finalizedCandidateEdges,
      affectedEdgesForMove,
      moveNodeIds,
      originalRoutePoints,
      new Set(moveEdgeIds),
      originalPositions,
      nodes,
      finalBounds
    );
    writeOperationLog(`移动 ${moveNodeIds.length} 个图元 (${Math.round(boundedDelta.x)}, ${Math.round(boundedDelta.y)})`);
  };

  const updateSelectedNode = (patch: Partial<ModelNode>) => {
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
    pushUndoSnapshot();
    const nextPatch = { ...patch };
    const geometryPatch =
      patch.rotation !== undefined ||
      patch.scale !== undefined ||
      patch.scaleX !== undefined ||
      patch.scaleY !== undefined ||
      patch.size !== undefined;
    let selectedNodeCanvasBounds = canvasBounds;
    if (selectedNode) {
      const changesCanvasFootprint = Boolean(patch.position) || geometryPatch;
      if (changesCanvasFootprint) {
        const requestedPosition = nextPatch.position
          ? { x: nextPatch.position.x, y: nextPatch.position.y }
          : selectedNode.position;
        const candidateNode = { ...selectedNode, ...nextPatch, position: requestedPosition };
        const previewNodes = nodes.map((node) => (node.id === selectedNode.id ? candidateNode : node));
        selectedNodeCanvasBounds = canvasBoundsForGraphContent(
          canvasBounds,
          previewNodes,
          edges,
          [],
          CANVAS_AUTO_EXPAND_PADDING
        );
        applyCanvasBounds(selectedNodeCanvasBounds);
        nextPatch.position = clampNodePositionToExpandableBounds(candidateNode, selectedNodeCanvasBounds, requestedPosition);
      }
    }
    const currentSelectedNode = nodeById.get(selectedNodeId);
    const nextSelectedNode = currentSelectedNode ? { ...currentSelectedNode, ...nextPatch } : undefined;
    const nextNodes = nextSelectedNode ? overlayGraphStoreNodes(graphStore, [nextSelectedNode]) : nodes;
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
      const nextEdges = rebuildEdgesAfterNodeGeometryChange(nextNodes, [selectedNodeId]);
      expandCanvasToFitGraph(nextNodes, nextEdges, [], CANVAS_AUTO_EXPAND_PADDING, selectedNodeCanvasBounds);
      setGraphStore((current) =>
        graphStorePatchGraphFromArrays(current, nextNodes, nextEdges, [selectedNodeId], edgeListForNodeIds([selectedNodeId]).map((edge) => edge.id))
      );
      return;
    }
    if (nextSelectedNode) {
      patchGraphNodes([nextSelectedNode]);
    }
  };

  const assignSelectedNodesToModelLayer = (layerId: string) => {
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

  const openLayerAssignmentDialog = () => {
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

  const rotateSelectedLayoutUnits = (direction: "left" | "right") => {
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    const degrees = direction === "left" ? -90 : 90;
    pushUndoSnapshot();
    setSelectedEdgeId("");
    const nextNodes = rotateLayoutUnitNodes(nodes, selectedLayoutUnits, degrees);
    const transformedNodeIds = Array.from(new Set(selectedLayoutUnits.flatMap((unit) => unit.nodeIds)));
    const rotatedEdgeUpdates = buildRotateLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, degrees);
    const preservedRotateEdgeIds = new Set(rotatedEdgeUpdates.map((edge) => edge.id));
    const rotatedEdges = overlayEdgeUpdatesForTransform(edges, rotatedEdgeUpdates);
    markRouteEdgesDirty(preservedRotateEdgeIds);
    markStoredRouteEdgesDirty(preservedRotateEdgeIds);
    const nextEdges = rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, rotatedEdges, preservedRotateEdgeIds);
    expandCanvasToFitGraph(nextNodes, nextEdges);
    setGraphArrays(nextNodes, nextEdges);
    writeOperationLog(`${direction === "left" ? "向左" : "向右"}旋转90度 ${selectedLayoutUnits.length} 个选中单元`);
  };

  const mirrorSelectedNodes = (axis: "horizontal" | "vertical") => {
    if (selectedLayoutUnits.length === 0) {
      return;
    }
    pushUndoSnapshot();
    setSelectedEdgeId("");
    const nextNodes = mirrorLayoutUnitNodes(nodes, selectedLayoutUnits, axis);
    const transformedNodeIds = Array.from(new Set(selectedLayoutUnits.flatMap((unit) => unit.nodeIds)));
    const mirroredEdgeUpdates = buildMirrorLayoutUnitEdgeUpdates(selectedLayoutUnits, edges, axis);
    const preservedMirrorEdgeIds = new Set(mirroredEdgeUpdates.map((edge) => edge.id));
    const mirroredEdges = overlayEdgeUpdatesForTransform(edges, mirroredEdgeUpdates);
    markRouteEdgesDirty(preservedMirrorEdgeIds);
    markStoredRouteEdgesDirty(preservedMirrorEdgeIds);
    const nextEdges = rebuildEdgesAfterNodeGeometryChange(nextNodes, transformedNodeIds, mirroredEdges, preservedMirrorEdgeIds);
    expandCanvasToFitGraph(nextNodes, nextEdges);
    setGraphArrays(nextNodes, nextEdges);
    writeOperationLog(`${axis === "horizontal" ? "水平" : "垂直"}镜像 ${selectedLayoutUnits.length} 个选中单元`);
  };

  const updateCanvasSize = (nextWidth: number, nextHeight: number) => {
    const width = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    if (width === canvasWidth && height === canvasHeight) {
      return;
    }
    pushUndoSnapshot();
    setCanvasWidth(width);
    setCanvasHeight(height);
    setViewBox((current) =>
      normalizeViewBoxToCanvas({ ...current, ...clampViewBoxDimensionsForZoom(current, { width, height }) }, { width, height })
    );
    setGraphArrays(
      nodes.map((node) => ({ ...node, position: clampNodePositionToBounds(node, { width, height }) })),
      edges.map((edge) => clampEdgeGeometryToBounds(edge, { width, height }))
    );
  };

  const commitCanvasSizeDraft = (draft = canvasSizeDraft) => {
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

  const resetCanvasSizeDraft = () => {
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  };

  const handleCanvasSizeBlur = () => {
    if (skipCanvasSizeBlurCommitRef.current) {
      skipCanvasSizeBlurCommitRef.current = false;
      return;
    }
    commitCanvasSizeDraft();
  };

  const handleCanvasSizeKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      commitCanvasSizeDraft();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      skipCanvasSizeBlurCommitRef.current = true;
      resetCanvasSizeDraft();
      event.currentTarget.blur();
    }
  };

  const updateParam = (key: string, value: string) => {
    if (!selectedNodeId) {
      return;
    }
    pushUndoSnapshot();
    updateGraphNodeById(selectedNodeId, (node) => {
      if (key === "_labelDisplayMode") {
        const mode = normalizeNodeLabelDisplayMode(value);
        return { ...node, params: { ...node.params, _labelDisplayMode: mode, _labelVisible: mode === "hidden" ? "0" : "1" } };
      }
      return { ...node, params: { ...node.params, [key]: value } };
    });
  };

  const updateElementTreeNodeIdentity = (nodeId: string, field: "idx" | "name", value: string) => {
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node) =>
      field === "name" ? { ...node, name: value } : { ...node, params: { ...node.params, idx: value } }
    );
  };

  const updateElementTreeContainerChildParam = (nodeId: string, key: string, value: string) => {
    if (!key) {
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId)) {
      return;
    }
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node) => ({ ...node, params: { ...node.params, [key]: value } }));
  };

  const terminalVbaseFallback = (node: ModelNode, terminalIndex: number) => {
    return terminalVbaseFallbackValue(node, terminalIndex);
  };

  const updateTerminalVbase = (terminalId: string, value: string) => {
    if (!selectedNodeId) {
      return;
    }
    const numericValue = normalizeVoltageBaseInput(value);
    pushUndoSnapshot();
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
        <input type="color" value={colorValue} onChange={(event) => updateParam(key, event.target.value)} />
        <input value={value === "transparent" ? "无颜色" : value || ""} onChange={(event) => updateParam(key, event.target.value === "无颜色" ? "transparent" : event.target.value)} />
        <button type="button" onClick={() => updateParam(key, "transparent")}>无颜色</button>
      </div>
    );
  };

  const renderParamEditor = (key: string, value: string, wrapLabel = true) => {
    const label = PARAM_LABELS[key] ?? key;
    const editorNode = inspectorSelectedNode ?? selectedNode;
    const options = paramOptionsForSection(key, editorNode ? inferESection(editorNode.kind, editorNode.params) : undefined);
    const control = options ? (
      <select value={value} onChange={(event) => updateParam(key, event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : (
      <input value={value} onChange={(event) => updateParam(key, event.target.value)} />
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

  const renderParamHeader = (key: string, displayName = key, title = PARAM_LABELS[key] ?? displayName) => (
    <th title={title}>{displayName}</th>
  );

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
    if (side === "left") {
      setLeftPanelAutoVisible((current) => nextSidePanelAutoVisible("left", leftPanelMode, current, event));
    } else {
      setRightPanelAutoVisible((current) => nextSidePanelAutoVisible("right", rightPanelMode, current, event));
    }
  };

  const activateInspectorFromCanvas = () => {
    updateAutoPanelVisibility("right", "canvas-activate");
  };

  const hideAutoPanelsFromWorkspace = () => {
    if (sidePanelResize || validationPanelResize) {
      return;
    }
    if (leftPanelMode === "auto") {
      setLeftPanelAutoVisible(false);
    }
    if (rightPanelMode === "auto") {
      setRightPanelAutoVisible(false);
    }
  };

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

  const startInteractiveStaticDrawing = (template: DeviceTemplate, startPoint: Point) => {
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

  const cancelInteractiveStaticDrawing = () => {
    if (!staticDrawing) {
      return;
    }
    setStaticDrawing(null);
    setMode("select");
    writeOperationLog("取消绘制图元");
  };

  const finishInteractiveStaticDrawing = (finalPoint?: Point) => {
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
    const node = createInteractiveStaticDrawingNode(staticDrawing.template, points, activeLayerId);
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
    setStaticDrawing((current) => {
      if (!current || sameOptionalPoint(current.previewPoint, point)) {
        return current;
      }
      return { ...current, previewPoint: point };
    });
  };

  const renderInteractiveStaticDrawingPreview = () => {
    if (!staticDrawing) {
      return null;
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

  const startCanvasResize = (event: PointerEvent<SVGRectElement>, edge: CanvasResizeEdge) => {
    event.preventDefault();
    event.stopPropagation();
    if (!svgRef.current) {
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    canvasResizeUndoCapturedRef.current = false;
    setCanvasResizeDrag({
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: canvasWidth,
      startHeight: canvasHeight,
      unitsPerCssX: svgRect.width > 0 ? viewBox.width / svgRect.width : 1,
      unitsPerCssY: svgRect.height > 0 ? viewBox.height / svgRect.height : 1,
      minBounds: minimumCanvasBoundsForContent()
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

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

  const renderSidePanelModeControls = (side: SidePanelSide) => {
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

  const renderSidePanelEdgeTrigger = (side: SidePanelSide) => {
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

  const normalizeScale = (value: number, fallback = 1) => normalizeScaleValue(value, fallback);
  const signedScale = (value: number, signSource: number) => Math.abs(normalizeScale(value)) * (Math.sign(signSource) || 1);

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

  const signedScaleFromScreenHandleDelta = (
    drag: SingleTransformDrag,
    point: Point,
    baseNode: ModelNode,
    localScaleKind: "scale-x" | "scale-y"
  ) => {
    const currentSignedScale = localScaleKind === "scale-x" ? getNodeScaleX(baseNode) : getNodeScaleY(baseNode);
    const dimension = Math.max(1, localScaleKind === "scale-x" ? baseNode.size.width : baseNode.size.height);
    const screenDelta =
      drag.kind === "scale-x"
        ? (point.x - drag.startPoint.x) * (drag.handleXDirection || 1)
        : (point.y - drag.startPoint.y) * (drag.handleYDirection || 1);
    const nextMagnitude = Math.max(0, Math.abs(currentSignedScale) + (screenDelta * 2) / dimension);
    return signedScale(nextMagnitude, currentSignedScale);
  };

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

  const currentStoredRoutePointsForEdge = (edge: Edge | undefined, bounds: CanvasBounds = canvasBounds) => {
    if (!edge) {
      return [];
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

  const buildMirrorLayoutUnitEdgeUpdates = (
    units: CanvasLayoutUnit[],
    currentEdges: Edge[],
    axis: "horizontal" | "vertical"
  ) => {
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

  const buildRotateLayoutUnitEdgeUpdates = (
    units: CanvasLayoutUnit[],
    currentEdges: Edge[],
    degrees: number
  ) => {
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

  const buildGroupTransformEdgeUpdates = (drag: GroupTransformDrag, point: Point, store: GraphStore) => {
    const geometry = groupTransformGeometry(drag, point);
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

  const startGroupTransformDrag = (event: PointerEvent<SVGElement>, unit: CanvasLayoutUnit, kind: "rotate" | ScaleHandleKind) => {
    event.stopPropagation();
    transformDragChangedRef.current = false;
    setTransformDrag({
      kind,
      groupId: unit.id.replace(/^group:/, ""),
      nodeIds: unit.nodeIds,
      bounds: unit.bounds,
      center: selectionRectCenter(unit.bounds),
      originalNodes: snapshotGroupTransformNodes(unit),
      originalEdgeRoutes: snapshotGroupTransformEdgeRoutes(unit)
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startSingleTransformDrag = (
    event: PointerEvent<SVGElement>,
    node: ModelNode,
    kind: "rotate" | ScaleHandleKind,
    handle?: ScaleHandleConfig
  ) => {
    event.stopPropagation();
    transformDragChangedRef.current = false;
    const startPoint = svgRef.current
      ? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY))
      : { ...node.position };
    setTransformDrag({
      kind,
      nodeId: node.id,
      originalNode: snapshotSingleTransformNode(node),
      startPoint,
      handleXDirection: handle?.xDirection,
      handleYDirection: handle?.yDirection
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startGroupMoveDrag = (event: PointerEvent<SVGRectElement>, unit: CanvasLayoutUnit) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || mode === "connect" || connectSource) {
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
    const affectedEdgeIdsForDrag = new Set(affectedEdgesForDrag.map((edge) => edge.id));
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = Object.fromEntries(
      affectedEdgesForDrag.map((edge) => [
        edge.id,
        affectedEdgeIdsForDrag.has(edge.id) ? currentStoredRoutePointsForEdge(edge) : []
      ])
    );
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
            manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined
    };
    draggingRef.current = nextDragging;
    resetMultiNodeDragOverlayTransform();
    setDragging(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const buildGroupTransformNodeUpdates = (drag: GroupTransformDrag, point: Point, store: GraphStore) => {
    const updates: ModelNode[] = [];
    const geometry = groupTransformGeometry(drag, point);
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

  const rotateLayoutUnitNodes = (
    currentNodes: ModelNode[],
    units: CanvasLayoutUnit[],
    degrees: number
  ) => {
    const currentNodeById = new Map(currentNodes.map((node) => [node.id, node]));
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = currentNodeById.get(nodeId);
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
    return currentNodes.map((node) => updates.get(node.id) ?? node);
  };

  const mirrorLayoutUnitNodes = (
    currentNodes: ModelNode[],
    units: CanvasLayoutUnit[],
    axis: "horizontal" | "vertical"
  ) => {
    const currentNodeById = new Map(currentNodes.map((node) => [node.id, node]));
    const updates = new Map<string, ModelNode>();
    for (const unit of units) {
      const center = selectionRectCenter(unit.bounds);
      for (const nodeId of unit.nodeIds) {
        if (updates.has(nodeId)) {
          continue;
        }
        const node = currentNodeById.get(nodeId);
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
    return currentNodes.map((node) => updates.get(node.id) ?? node);
  };

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

  const snapSingleTerminalAnchor = (node: ModelNode, point: Point): Point => {
    const radians = (-node.rotation * Math.PI) / 180;
    const dx = point.x - node.position.x;
    const dy = point.y - node.position.y;
    const local = {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians)
    };
    const halfWidth = Math.max(1, Math.abs(node.size.width * getNodeScaleX(node)) / 2);
    const halfHeight = Math.max(1, Math.abs(node.size.height * getNodeScaleY(node)) / 2);
    const xRatio = Math.abs(local.x) / halfWidth;
    const yRatio = Math.abs(local.y) / halfHeight;
    if (xRatio >= yRatio) {
      return { x: local.x >= 0 ? 0.5 : -0.5, y: 0 };
    }
    return { x: 0, y: local.y >= 0 ? 0.5 : -0.5 };
  };

  const clampSingleTerminalAnchor = (node: ModelNode, point: Point): Point => {
    const local = toLocalNodePoint(node, point);
    const scaleX = Math.max(0.001, Math.abs(getNodeScaleX(node)));
    const scaleY = Math.max(0.001, Math.abs(getNodeScaleY(node)));
    return {
      x: Math.max(-0.5, Math.min(0.5, local.x / (node.size.width * scaleX))),
      y: Math.max(-0.5, Math.min(0.5, local.y / (node.size.height * scaleY)))
    };
  };

  const isPointOnBus = (node: ModelNode, point: Point) => {
    return isPointNearBus(node, point, 0);
  };

  const isPointNearBus = (node: ModelNode, point: Point, tolerance = 0) => {
    return Boolean(pointOnBusForSnap(node, point, tolerance));
  };

  const connectTargetSnapPoint = (target: ConnectTarget): Point =>
    target.point ?? getTerminalPoint(target.node, target.terminalId);

  const findRewireTargetAtPoint = (point: Point, state: Exclude<RewiringState, null>) => {
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

  const findConnectTargetAtPoint = (point: Point): ConnectTarget | null => {
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

  const commitNewConnectionEdge = (newEdge: Edge, sourceName: string, targetName: string) => {
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
    markBusTerminalSyncDirtyForEdges([preparedEdge]);
    setEdges((current) => [...current, preparedEdge]);
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

  const finishConnectToTarget = (target: NonNullable<ReturnType<typeof findConnectTargetAtPoint>>, endpointPoint = connectPreviewPointRef.current) => {
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

  const finishRewiring = (event: PointerEvent<SVGSVGElement>) => {
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
      const prepared = candidateEdge
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
        markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
        patchGraphEdges([preparedEdge]);
        writeOperationLog(`调整联络线端子：${rewiring.edgeId}`);
      } else {
        const message = connectionCommitFailureMessage(prepared?.issues);
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

  const handleDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
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
    if (isInteractiveStaticDrawingKind(kind)) {
      startInteractiveStaticDrawing(template, pointerPosition);
      return;
    }
    const rawNode = { ...createNodeFromTemplate(template, position), layerId: activeLayerId };
    const dropOriginShift = leftTopCanvasOriginShiftForContent([...nodes, rawNode], edges);
    const dropSourceNodes = hasCanvasOriginShift(dropOriginShift)
      ? nodes.map((node) => translateNodeBy(node, dropOriginShift))
      : nodes;
    const dropSourceEdges = hasCanvasOriginShift(dropOriginShift)
      ? edges.map((edge) => translateEdgeBy(edge, dropOriginShift))
      : edges;
    const node = translateNodeBy(rawNode, dropOriginShift);
    const shiftedPointerPosition = translatePointBy(pointerPosition, dropOriginShift);
    const dropCanvasBounds = canvasBoundsForGraphContent(
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
    node.position = clampNodePositionToBounds(node, dropCanvasBounds, shiftedPointerPosition);
    lastRawCanvasPointerRef.current = shiftedPointerPosition;
    lastCanvasPointerRef.current = clampPointToBounds(shiftedPointerPosition, dropCanvasBounds);
    const indexed = assignPermanentDeviceIndex(node, deviceIndexCounters);
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

  const handleNodePointerDown = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
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
    const nodeWasSelected = selectedNodeIdSet.has(node.id);
    const clickedSelectedGroupMember =
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.metaKey &&
      nodeWasSelected &&
      selectedGroupMemberNodeIdSet.has(node.id);
    const keepEdgeSelection = nodeWasSelected && activeSelectedEdgeIds.length > 0;
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
    } else if (!nodeWasSelected) {
      dragSelection = expandActiveGroupSelection([node.id], []);
      setCanvasSelectionScope("group");
      setSelectedNodeIds(dragSelection.nodeIds);
      setSelectedEdgeIds(dragSelection.edgeIds);
      setSelectedEdgeId(dragSelection.edgeIds[0] ?? "");
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
    const affectedEdgeIdsForDrag = new Set(affectedEdgesForDrag.map((edge) => edge.id));
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const originalPositionsForDrag = Object.fromEntries(
      dragNodeIds.flatMap((id) => {
        const item = nodeById.get(id);
        return item ? [[item.id, { ...item.position }]] : [];
      })
    );
    const originalRoutePointsForDrag = Object.fromEntries(
      affectedEdgesForDrag.map((edge) => [
        edge.id,
        affectedEdgeIdsForDrag.has(edge.id) ? currentStoredRoutePointsForEdge(edge) : []
      ])
    );
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
            manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
          }
        ])
      ),
      originalRoutePoints: originalRoutePointsForDrag,
      overlayPreview: isMultiNodeMoveState({ nodeIds: dragNodeIds })
        ? buildMultiNodeDragOverlayPreview(dragNodeIds, affectedEdgesForDrag, originalPositionsForDrag, originalRoutePointsForDrag, edgeIdsForDrag)
        : undefined
    };
    draggingRef.current = nextDragging;
    resetMultiNodeDragOverlayTransform();
    setDragging(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      const pointer = draggingRef.current ? rawPointer : clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
      if (connectSource) {
        const previewPoint = resolveConnectPreviewPoint(pointer, event);
        scheduleConnectPreviewPoint(previewPoint);
      }
      if (staticDrawing && !connectSource) {
        updateInteractiveStaticDrawingPreview(pointer);
      }
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
      setGraphStore((current) => {
        const currentNode = current.nodeMap.get(terminalPress.nodeId);
        if (!currentNode) {
          return current;
        }
        const anchor = clampSingleTerminalAnchor(currentNode, point);
        let changed = false;
        const nextTerminals = currentNode.terminals.map((terminal) => {
          if (terminal.id !== terminalPress.terminalId || sameOptionalPoint(terminal.anchor, anchor)) {
            return terminal;
          }
          changed = true;
          return { ...terminal, anchor };
        });
        return changed ? graphStorePatchNodes(current, [{ ...currentNode, terminals: nextTerminals }]) : current;
      });
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
    if (panning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((event.clientX - panning.clientX) / rect.width) * panning.viewBox.width;
      const dy = ((event.clientY - panning.clientY) / rect.height) * panning.viewBox.height;
      const nextViewBox = clampViewBoxToCanvas({ ...panning.viewBox, x: panning.viewBox.x - dx, y: panning.viewBox.y - dy });
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
      const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
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
        const transformBounds = canvasBoundsForGraphContent(
          canvasBounds,
          overlayGraphStoreNodes(currentStore, nextNodeUpdates),
          currentStore.edges,
          [],
          CANVAS_AUTO_EXPAND_PADDING
        );
        applyCanvasBounds(transformBounds);
        return;
      }
      const node = currentStore.nodeMap.get(transformDrag.nodeId);
      if (!node) {
        return;
      }
      const baseNode = singleTransformBaseNode(transformDrag, node);
      let nextNode: ModelNode;
      if (transformDrag.kind === "rotate") {
        const angle = (Math.atan2(point.y - baseNode.position.y, point.x - baseNode.position.x) * 180) / Math.PI + 90;
        const snapped = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
        nextNode = { ...node, position: baseNode.position, rotation: snapped };
      } else {
        const local = toLocalNodePoint(baseNode, point);
        const nextScaleX = normalizeScale((Math.abs(local.x) * 2) / baseNode.size.width);
        const nextScaleY = normalizeScale((Math.abs(local.y) * 2) / baseNode.size.height);
        const currentSignedScaleX = getNodeScaleX(baseNode);
        const currentSignedScaleY = getNodeScaleY(baseNode);
        const localScaleKind = event.shiftKey || transformDrag.kind === "scale-both"
          ? "scale-both"
          : localScaleKindForScreenHandle(transformDrag.kind, baseNode.rotation);
        const proportionalScale = localScaleKind === "scale-both";
        setTransformDrag((current) =>
          current && !isGroupTransformDrag(current) && current.nodeId === transformDrag.nodeId
            ? current.historyCaptured && current.proportionalScale === proportionalScale
              ? current
              : { ...current, historyCaptured: true, proportionalScale }
            : current
        );
        if (localScaleKind === "scale-x") {
          const nextSignedScaleX = signedScaleFromScreenHandleDelta(transformDrag, point, baseNode, "scale-x");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(nextSignedScaleX), Math.abs(currentSignedScaleY)),
            scaleX: nextSignedScaleX,
            scaleY: currentSignedScaleY
          };
        } else if (localScaleKind === "scale-y") {
          const nextSignedScaleY = signedScaleFromScreenHandleDelta(transformDrag, point, baseNode, "scale-y");
          nextNode = {
            ...node,
            position: baseNode.position,
            rotation: baseNode.rotation,
            scale: Math.max(Math.abs(currentSignedScaleX), Math.abs(nextSignedScaleY)),
            scaleX: currentSignedScaleX,
            scaleY: nextSignedScaleY
          };
        } else {
          const nextScale = normalizeScale(Math.max(nextScaleX, nextScaleY));
          const nextSignedScale = {
            x: signedScale(nextScale, currentSignedScaleX),
            y: signedScale(nextScale, currentSignedScaleY)
          };
          nextNode = { ...node, position: baseNode.position, rotation: baseNode.rotation, scale: nextScale, scaleX: nextSignedScale.x, scaleY: nextSignedScale.y };
        }
      }
      const transformBounds = canvasBoundsForGraphContent(
        canvasBounds,
        overlayGraphStoreNodes(currentStore, [nextNode]),
        currentStore.edges,
        [],
        CANVAS_AUTO_EXPAND_PADDING
      );
      applyCanvasBounds(transformBounds);
      nextNode = { ...nextNode, position: clampNodePositionToBounds(nextNode, transformBounds, nextNode.position) };
      patchGraphNodes([nextNode]);
      return;
    }
    if (!draggingRef.current || !svgRef.current) {
      return;
    }
    const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    scheduleNodeDragMove(point, event.ctrlKey, event.shiftKey);
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!svgRef.current) {
      return;
    }
    const pointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
    const { width: nextWidth, height: nextHeight } = clampViewBoxDimensionsForZoom(
      { width: viewBox.width * zoomFactor, height: viewBox.height * zoomFactor },
      canvasBounds
    );
    const ratioX = (pointer.x - viewBox.x) / viewBox.width;
    const ratioY = (pointer.y - viewBox.y) / viewBox.height;
    setViewBox(clampViewBoxToCanvas({
      x: pointer.x - ratioX * nextWidth,
      y: pointer.y - ratioY * nextHeight,
      width: nextWidth,
      height: nextHeight
    }));
  };

  const deleteSelected = () => {
    deleteSelection();
  };

  const runContextMenuAction = (action: () => void) => {
    action();
    setContextMenu(null);
    setProjectMenu(null);
  };

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
    pushUndoSnapshot();
    const arranged = layoutNodes(nodes, selectedLayoutUnits);
    const layoutCanvasBounds = canvasBoundsForGraphContent(
      canvasBounds,
      arranged,
      edges,
      [],
      CANVAS_AUTO_EXPAND_PADDING
    );
    applyCanvasBounds(layoutCanvasBounds);
    const selected = new Set(layoutNodeIds);
    const originalPositions = Object.fromEntries(
      layoutNodeIds.flatMap((id) => {
        const node = nodeById.get(id);
        return node ? [[id, node.position]] : [];
      })
    );
    const deltas = Object.fromEntries(
      arranged
        .filter((node) => selected.has(node.id))
        .map((node) => {
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
    const affectedEdgesForLayout = edgeListForNodeIds(layoutNodeIds);
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForLayout);
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForLayout.map((edge) => [
        edge.id,
        currentStoredRoutePointsForEdge(edge)
      ])
    );
    const adjustedAffectedEdges = adjustEdgesAfterNodeMove(
      affectedEdgesForLayout,
      arranged,
      selected,
      originalEdgePoints,
      deltas,
      originalRoutePoints,
      new Set<string>(),
      layoutCanvasBounds
    );
    const finalizedCandidateEdges = finalizeMovedNodeEdgesFast(
      nodes,
      arranged,
      adjustedAffectedEdges,
      layoutNodeIds,
      adjustedAffectedEdges
    );
    const movedNodeUpdates = layoutNodeIds.flatMap((nodeId) => {
      const nextNode = orderedNodeFromList(arranged, nodeId);
      return nextNode && nodeById.get(nodeId) !== nextNode ? [nextNode] : [];
    });
    commitFastMovedGraphPatches(
      movedNodeUpdates,
      arranged,
      finalizedCandidateEdges,
      affectedEdgesForLayout,
      layoutNodeIds,
      originalRoutePoints,
      new Set<string>(),
      originalPositions,
      nodes,
      layoutCanvasBounds
    );
  };

  const alignSelected = (direction: AlignMode) => {
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
    applySelectedNodeLayout(3, (currentNodes, currentLayoutUnits) => distributeNodeLayoutUnits(currentNodes, currentLayoutUnits, direction));
    if (selectedLayoutUnitCount >= 3) {
      writeOperationLog(`${direction === "horizontal" ? "横向" : "纵向"}平均 ${selectedLayoutUnitCount} 个单元`);
    }
  };

  const findSchemeForProject = (projectId: string) =>
    schemes.find((scheme) => scheme.projects.some((project) => project.id === projectId));

  const toggleSchemeExpanded = (schemeId: string) => {
    setExpandedSchemeIds((current) =>
      current.includes(schemeId) ? current.filter((id) => id !== schemeId) : [...current, schemeId]
    );
  };

  const updateProjectInSchemes = (projectId: string, updater: (project: SavedProjectRecord) => SavedProjectRecord) => {
    setSchemes((current) =>
      current.map((scheme) => ({
        ...scheme,
        updatedAt: scheme.projects.some((project) => project.id === projectId) ? new Date().toISOString() : scheme.updatedAt,
        projects: scheme.projects.map((project) => (project.id === projectId ? updater(project) : project))
      }))
    );
  };

  const promptUniqueRecordName = (
    promptText: string,
    defaultName: string,
    existingNames: string[],
    emptyMessage: string,
    duplicateMessage: string
  ) => {
    const inputName = window.prompt(promptText, defaultName);
    if (inputName === null) {
      return null;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert(emptyMessage);
      return null;
    }
    if (hasSameName(name, existingNames)) {
      window.alert(duplicateMessage);
      return null;
    }
    return name;
  };

  const cloneProjectRecord = (project: SavedProjectRecord, suffix = "副本", existingNames: string[] = []) =>
    copySavedProjectWithUniqueName(project, existingNames, suffix);

  const cloneProjectRecordWithName = (project: SavedProjectRecord, name: string) =>
    createSavedProject(name, project.project);

  const hasSameName = (name: string, names: string[]) => names.some((item) => item.trim() === name.trim());

  const cloneProjectRecordForPaste = (project: SavedProjectRecord, name = project.name, existingProjectId?: string) => {
    const record = cloneProjectRecordWithName(project, name);
    return existingProjectId
      ? { ...record, id: existingProjectId, name: record.name, project: { ...record.project, name: record.name } }
      : record;
  };

  const cloneSchemeRecord = (scheme: SavedSchemeRecord, existingSchemes = schemes, suffix = "副本"): SavedSchemeRecord => {
    return copySavedSchemeWithUniqueName(scheme, existingSchemes.map((item) => item.name), suffix);
  };

  const cloneSchemeRecordWithName = (scheme: SavedSchemeRecord, name: string): SavedSchemeRecord => {
    const projects = scheme.projects.reduce<SavedProjectRecord[]>(
      (current, project) => upsertSavedProject(current, cloneProjectRecord(project, "副本", current.map((item) => item.name))),
      []
    );
    return createSavedScheme(name, projects);
  };

  const cloneSchemeRecordForPaste = (scheme: SavedSchemeRecord, name = scheme.name, existingScheme?: SavedSchemeRecord): SavedSchemeRecord => {
    const projects = scheme.projects.reduce<SavedProjectRecord[]>((current, project) => {
      const duplicateProject = existingScheme?.projects.find((item) => hasSameName(item.name, [project.name]));
      return upsertSavedProject(current, cloneProjectRecordForPaste(project, project.name, duplicateProject?.id));
    }, []);
    const record = createSavedScheme(name, projects);
    return existingScheme ? { ...record, id: existingScheme.id, name: record.name } : record;
  };

  const loadSavedProject = (project: SavedProjectRecord, schemeId = findSchemeForProject(project.id)?.id ?? "") => {
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
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
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
    setCanvasBackgroundColor(project.project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage(project.project.canvasBackgroundImage ?? "");
    setCanvasBackgroundImageAssetId(project.project.canvasBackgroundImageAssetId ?? "");
    setPowerUnit(project.project.powerUnit ?? DEFAULT_POWER_UNIT);
    setVoltageUnit(project.project.voltageUnit ?? DEFAULT_VOLTAGE_UNIT);
    setCurrentUnit(project.project.currentUnit ?? DEFAULT_CURRENT_UNIT);
    setPowerBaseValue(project.project.powerBaseValue ?? DEFAULT_POWER_BASE_VALUE);
    setViewBox(normalizeViewBoxToCanvas({ x: 0, y: 0, ...nextCanvasBounds }, nextCanvasBounds));
    setCanvasVisibleViewBox(initialVisibleCanvasViewBox(nextCanvasBounds, canvasFrameRef.current));
    setLayers(layeredProject.layers ?? []);
    setActiveLayerId(layeredProject.activeLayerId ?? DEFAULT_MODEL_LAYER_ID);
    setDeviceIndexCounters(indexed.counters);
    setGraphArrays(layeredProject.nodes, layeredProject.edges);
    setGroups(normalizeModelGroups(layeredProject.groups, layeredProject.nodes, layeredProject.edges));
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setActiveProjectId(project.id);
    setActiveSchemeId(schemeId);
    selectSingleProject(schemeId, project.id);
    const firstVisibleNode = filterProjectByVisibleLayers(layeredProject.nodes, layeredProject.edges, layeredProject.layers).nodes[0];
    setCanvasSelectionScope("group");
    setSelectedNodeIds(firstVisibleNode ? [firstVisibleNode.id] : []);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setTerminalPress(null);
    setManualPathDrag(null);
    setTransformDrag(null);
    setDragging(null);
    setMarquee(null);
    setPanning(null);
    setHasUnsavedChanges(false);
    writeOperationLog(`加载模型：${project.name}`);
    requestCanvasFrameCenter();
  };

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

  const createSchemeRecord = () => {
    const inputName = window.prompt("请输入方案名称", "新建方案");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, schemes.map((scheme) => scheme.name))) {
      window.alert("方案名称重复，无法新建方案。");
      return;
    }
    const record = createSavedScheme(name);
    setSchemes((current) => [...current, record]);
    selectSingleScheme(record.id);
    writeOperationLog(`新建方案：${record.name}`);
  };

  const renameSchemeRecord = (scheme: SavedSchemeRecord) => {
    const nextName = window.prompt("请输入新的方案名称", scheme.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    if (!name) {
      window.alert("方案名称不能为空。");
      return;
    }
    if (hasSameName(name, schemes.filter((item) => item.id !== scheme.id).map((item) => item.name))) {
      window.alert("方案名称重复，无法修改。");
      return;
    }
    setSchemes((current) => renameSavedScheme(current, scheme.id, nextName));
  };

  const duplicateSchemeRecord = (scheme: SavedSchemeRecord) => {
    const defaultName = uniqueRecordName(
      `${scheme.name} 副本`,
      schemes.map((item) => item.name),
      "未命名方案"
    );
    const name = promptUniqueRecordName(
      "请输入新方案名称",
      defaultName,
      schemes.map((item) => item.name),
      "方案名称不能为空。",
      "方案名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    setSchemes((current) => [...current, cloneSchemeRecordWithName(scheme, name)]);
  };

  const deleteSchemeRecord = (scheme: SavedSchemeRecord) => {
    if (scheme.id === activeSchemeId) {
      window.alert("当前加载模型所在方案不能删除。");
      return;
    }
    if (!window.confirm(`删除方案“${scheme.name}”及其全部模型？`)) {
      return;
    }
    setSchemes((current) => {
      const next = deleteSavedScheme(current, scheme.id);
      return next.length > 0 ? next : [createSavedScheme("默认方案")];
    });
    if (selectedSchemeId === scheme.id) {
      clearRecordSelection();
    }
  };

  const copySelectedRecord = () => {
    const projectId = selectedProjectIds[0] ?? selectedProjectId;
    if (projectId) {
      const project = projectById.get(projectId);
      if (project) {
        copyProjectRecord(project);
      }
      return;
    }
    const schemeId = selectedSchemeIds[0] ?? selectedSchemeId;
    if (schemeId) {
      const scheme = schemes.find((item) => item.id === schemeId);
      if (scheme) {
        copySchemeRecord(scheme);
      }
    }
  };

  const deleteSelectedRecords = () => {
    if (selectedProjectIds.length > 0) {
      if (activeProjectId && selectedProjectIds.includes(activeProjectId)) {
        window.alert("当前加载模型不能删除。");
        return;
      }
      const names = projects.filter((project) => selectedProjectIds.includes(project.id)).map((project) => project.name);
      if (!window.confirm(`删除选中的 ${names.length} 个模型？`)) {
        return;
      }
      const selected = new Set(selectedProjectIds);
      setSchemes((current) =>
        current.map((scheme) => ({
          ...scheme,
          updatedAt: scheme.projects.some((project) => selected.has(project.id)) ? new Date().toISOString() : scheme.updatedAt,
          projects: scheme.projects.filter((project) => !selected.has(project.id))
        }))
      );
      clearRecordSelection();
      return;
    }
    if (selectedSchemeIds.length > 0) {
      if (activeSchemeId && selectedSchemeIds.includes(activeSchemeId)) {
        window.alert("当前加载模型所在方案不能删除。");
        return;
      }
      if (!window.confirm(`删除选中的 ${selectedSchemeIds.length} 个方案及其全部模型？`)) {
        return;
      }
      const selected = new Set(selectedSchemeIds);
      setSchemes((current) => {
        const next = current.filter((scheme) => !selected.has(scheme.id));
        return next.length > 0 ? next : [createSavedScheme("默认方案")];
      });
      clearRecordSelection();
    }
  };

  const copyProjectRecord = (project: SavedProjectRecord) => {
    setRecordClipboard({ kind: "project", project });
    writeOperationLog(`复制模型记录：${project.name}`);
  };

  const copySchemeRecord = (scheme: SavedSchemeRecord) => {
    setRecordClipboard({ kind: "scheme", scheme });
    writeOperationLog(`复制方案记录：${scheme.name}`);
  };

  const pasteSchemeClipboardRecord = () => {
    if (recordClipboard?.kind !== "scheme") {
      return;
    }
    const sourceScheme = recordClipboard.scheme;
    const duplicateScheme = schemes.find((scheme) => hasSameName(scheme.name, [sourceScheme.name]));
    if (duplicateScheme) {
      setPendingRecordPasteConflict({
        kind: "scheme",
        sourceScheme,
        duplicateSchemeId: duplicateScheme.id,
        duplicateName: duplicateScheme.name
      });
      return;
    }
    setSchemes((current) => [...current, cloneSchemeRecordForPaste(sourceScheme, sourceScheme.name)]);
    writeOperationLog(`粘贴方案记录：${sourceScheme.name}`);
  };

  const pasteProjectClipboardRecord = (targetSchemeId = selectedSchemeId || activeSchemeId || schemes[0]?.id) => {
    if (recordClipboard?.kind !== "project") {
      return;
    }
    const sourceProject = recordClipboard.project;
    const targetScheme = schemes.find((scheme) => scheme.id === targetSchemeId) ?? schemes[0];
    if (!targetScheme) {
      return;
    }
    const duplicateProject = targetScheme.projects.find((project) => hasSameName(project.name, [sourceProject.name]));
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project",
        sourceProject,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    setSchemes((current) =>
      current.map((scheme) =>
        scheme.id === targetScheme.id
          ? {
              ...scheme,
              updatedAt: new Date().toISOString(),
              projects: upsertSavedProject(scheme.projects, cloneProjectRecordForPaste(sourceProject, sourceProject.name))
            }
          : scheme
      )
    );
    writeOperationLog(`粘贴模型记录：${sourceProject.name}`);
  };

  const pasteSelectedRecord = () => {
    if (!recordClipboard) {
      return;
    }
    if (recordClipboard.kind === "scheme") {
      pasteSchemeClipboardRecord();
      return;
    }
    pasteProjectClipboardRecord();
  };

  const commitProjectRecordMove = (
    projectId: string,
    targetSchemeId: string,
    options: { targetName?: string; overwriteProjectId?: string } = {}
  ) => {
    const targetName = options.targetName?.trim();
    const nextProjectId = options.overwriteProjectId ?? projectId;
    setSchemes((current) => {
      const sourceScheme = current.find((scheme) => scheme.projects.some((project) => project.id === projectId));
      const targetScheme = current.find((scheme) => scheme.id === targetSchemeId);
      const project = sourceScheme?.projects.find((item) => item.id === projectId);
      if (!sourceScheme || !targetScheme || !project || sourceScheme.id === targetSchemeId) {
        return current;
      }
      const now = new Date().toISOString();
      const movedName = targetName || project.name;
      const movedProject: SavedProjectRecord = {
        ...project,
        id: nextProjectId,
        name: movedName,
        updatedAt: now,
        project: { ...project.project, name: movedName }
      };
      return current.map((scheme) => {
        if (scheme.id === sourceScheme.id) {
          return { ...scheme, updatedAt: now, projects: scheme.projects.filter((item) => item.id !== projectId) };
        }
        if (scheme.id === targetScheme.id) {
          return { ...scheme, updatedAt: now, projects: upsertSavedProject(scheme.projects, movedProject) };
        }
        return scheme;
      });
    });
    setExpandedSchemeIds((current) => (current.includes(targetSchemeId) ? current : [...current, targetSchemeId]));
    if (
      selectedProjectId === projectId ||
      selectedProjectIds.includes(projectId) ||
      (options.overwriteProjectId && (selectedProjectId === options.overwriteProjectId || selectedProjectIds.includes(options.overwriteProjectId)))
    ) {
      setSelectedSchemeId(targetSchemeId);
      setSelectedProjectIds([nextProjectId]);
      setSelectedProjectId(nextProjectId);
      setSelectedSchemeIds([]);
    }
    if (activeProjectId === projectId || activeProjectId === options.overwriteProjectId) {
      setActiveProjectId(nextProjectId);
      setActiveSchemeId(targetSchemeId);
      if (targetName) {
        setProjectName(targetName);
      }
    }
  };

  const resolveRecordPasteConflict = (action: "overwrite" | "rename" | "cancel") => {
    const conflict = pendingRecordPasteConflict;
    if (!conflict || action === "cancel") {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (conflict.kind === "scheme") {
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入粘贴后的方案名称",
          uniqueRecordName(conflict.sourceScheme.name, schemes.map((scheme) => scheme.name), "未命名方案"),
          schemes.map((scheme) => scheme.name),
          "方案名称不能为空。",
          "方案名称重复，无法粘贴。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        setSchemes((current) => [...current, cloneSchemeRecordForPaste(conflict.sourceScheme, renamed)]);
        writeOperationLog(`新命名粘贴方案记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      setSchemes((current) => {
        const duplicateScheme = current.find((scheme) => scheme.id === conflict.duplicateSchemeId);
        if (!duplicateScheme) {
          return [...current, cloneSchemeRecordForPaste(conflict.sourceScheme, conflict.duplicateName)];
        }
        return current.map((scheme) =>
          scheme.id === conflict.duplicateSchemeId
            ? cloneSchemeRecordForPaste(conflict.sourceScheme, scheme.name, scheme)
            : scheme
        );
      });
      writeOperationLog(`覆盖粘贴方案记录：${conflict.duplicateName}`);
      return;
    }
    if (conflict.kind === "project-drag") {
      const sourceScheme = schemes.find((scheme) => scheme.id === conflict.sourceSchemeId);
      const sourceProject = sourceScheme?.projects.find((project) => project.id === conflict.projectId);
      const targetScheme = schemes.find((scheme) => scheme.id === conflict.targetSchemeId);
      if (!sourceProject || !targetScheme) {
        setPendingRecordPasteConflict(null);
        return;
      }
      if (action === "rename") {
        const renamed = promptUniqueRecordName(
          "请输入拖拽后的模型名称",
          uniqueRecordName(sourceProject.name, targetScheme.projects.map((project) => project.name), "未命名模型"),
          targetScheme.projects.map((project) => project.name),
          "模型名称不能为空。",
          "模型名称重复，无法拖拽。"
        );
        if (!renamed) {
          return;
        }
        setPendingRecordPasteConflict(null);
        commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, { targetName: renamed });
        writeOperationLog(`新命名拖拽模型记录：${renamed}`);
        return;
      }
      setPendingRecordPasteConflict(null);
      commitProjectRecordMove(conflict.projectId, conflict.targetSchemeId, {
        targetName: conflict.duplicateName,
        overwriteProjectId: conflict.duplicateProjectId
      });
      writeOperationLog(`覆盖拖拽模型记录：${conflict.duplicateName}`);
      return;
    }
    const targetScheme =
      schemes.find((scheme) => scheme.id === conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0];
    if (!targetScheme) {
      setPendingRecordPasteConflict(null);
      return;
    }
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入粘贴后的模型名称",
        uniqueRecordName(conflict.sourceProject.name, targetScheme.projects.map((project) => project.name), "未命名模型"),
        targetScheme.projects.map((project) => project.name),
        "模型名称不能为空。",
        "模型名称重复，无法粘贴。"
      );
      if (!renamed) {
        return;
      }
      setPendingRecordPasteConflict(null);
      setSchemes((current) =>
        current.map((scheme) =>
          scheme.id === targetScheme.id
            ? {
                ...scheme,
                updatedAt: new Date().toISOString(),
                projects: upsertSavedProject(scheme.projects, cloneProjectRecordForPaste(conflict.sourceProject, renamed))
              }
            : scheme
        )
      );
      writeOperationLog(`新命名粘贴模型记录：${renamed}`);
      return;
    }
    setPendingRecordPasteConflict(null);
    setSchemes((current) =>
      current.map((scheme) => {
        if (scheme.id !== targetScheme.id) {
          return scheme;
        }
        const duplicateProject = scheme.projects.find((project) => project.id === conflict.duplicateProjectId);
        const targetName = duplicateProject?.name ?? conflict.duplicateName;
        return {
          ...scheme,
          updatedAt: new Date().toISOString(),
          projects: upsertSavedProject(
            scheme.projects,
            cloneProjectRecordForPaste(conflict.sourceProject, targetName, conflict.duplicateProjectId)
          )
        };
      })
    );
    writeOperationLog(`覆盖粘贴模型记录：${conflict.duplicateName}`);
  };

  const moveProjectRecordToScheme = (projectId: string, schemeId: string) => {
    const sourceScheme = findSchemeForProject(projectId);
    const sourceProject = sourceScheme?.projects.find((project) => project.id === projectId);
    const targetScheme = schemes.find((scheme) => scheme.id === schemeId);
    if (!sourceScheme || !sourceProject || !targetScheme || sourceScheme.id === targetScheme.id) {
      return;
    }
    const duplicateProject = targetScheme.projects.find(
      (project) => project.id !== sourceProject.id && hasSameName(project.name, [sourceProject.name])
    );
    if (duplicateProject) {
      setPendingRecordPasteConflict({
        kind: "project-drag",
        projectId,
        sourceSchemeId: sourceScheme.id,
        targetSchemeId: targetScheme.id,
        duplicateProjectId: duplicateProject.id,
        duplicateName: duplicateProject.name
      });
      return;
    }
    commitProjectRecordMove(projectId, schemeId);
  };

  const saveDraftProject = (draftProjectId: string, draftSchemeId: string) => {
    try {
      window.localStorage.setItem(
        DRAFT_PROJECT_STORAGE_KEY,
        JSON.stringify({
          projectName,
          activeProjectId: draftProjectId,
          activeSchemeId: draftSchemeId,
          canvasWidth,
          canvasHeight,
          canvasBackgroundColor,
          canvasBackgroundImage,
          canvasBackgroundImageAssetId,
          powerUnit,
          voltageUnit,
          currentUnit,
          powerBaseValue,
          deviceIndexCounters,
          layers,
          activeLayerId,
          groups,
          nodes,
          edges
        })
      );
    } catch {
      // 草稿缓存过大或不可写时不打断手动保存。
    }
  };

  const setActiveLayer = (layerId: string) => {
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
    pushUndoSnapshot();
    const layer = createModelLayer(nextDefaultModelLayerName(), layers);
    setLayers((current) => [...current, layer]);
    setActiveLayerId(layer.id);
    writeOperationLog(`新增图层：${layer.name}`);
  };

  const toggleModelLayerVisibility = (layerId: string) => {
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

  const deleteModelLayer = (layerId: string) => {
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

  const renderLayerManager = () => (
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

  const saveCurrentProject = (targetId = activeProjectId) => {
    deferredMoveOptimizationCancelRef.current?.();
    deferredMoveOptimizationCancelRef.current = null;
    if (targetId) {
      const existing = projectById.get(targetId);
      if (existing) {
        const record: SavedProjectRecord = {
          ...existing,
          name: projectName,
          project: currentProject()
        };
        updateProjectInSchemes(targetId, () => ({ ...record, updatedAt: new Date().toISOString() }));
        setActiveProjectId(targetId);
        graphDirtyBaselineRef.current = currentGraphDirtyBaseline();
        setHasUnsavedChanges(false);
        saveDraftProject(targetId, activeSchemeId || findSchemeForProject(targetId)?.id || selectedSchemeId);
        writeOperationLog(`保存模型：${projectName}`);
        return;
      }
    }
    const record = createSavedProject(projectName, currentProject());
    const targetSchemeId = activeSchemeId || selectedSchemeId || schemes[0]?.id || createSavedScheme("默认方案").id;
    setSchemes((current) => {
      const fallback = current.length > 0 ? current : [createSavedScheme("默认方案")];
      const schemeId = fallback.some((scheme) => scheme.id === targetSchemeId) ? targetSchemeId : fallback[0].id;
      return fallback.map((scheme) =>
        scheme.id === schemeId
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: upsertSavedProject(scheme.projects, record) }
          : scheme
      );
    });
    setActiveProjectId(record.id);
    setActiveSchemeId(targetSchemeId);
    graphDirtyBaselineRef.current = currentGraphDirtyBaseline();
    setHasUnsavedChanges(false);
    saveDraftProject(record.id, targetSchemeId);
    writeOperationLog(`保存模型：${projectName}`);
  };

  const renameProjectRecord = (project: SavedProjectRecord) => {
    const nextName = window.prompt("请输入新的模型名称", project.name);
    if (!nextName) {
      return;
    }
    const name = nextName.trim();
    const ownerScheme = findSchemeForProject(project.id);
    if (!name) {
      window.alert("模型名称不能为空。");
      return;
    }
    if (ownerScheme && hasSameName(name, ownerScheme.projects.filter((item) => item.id !== project.id).map((item) => item.name))) {
      window.alert("模型名称重复，无法修改。");
      return;
    }
    setSchemes((current) =>
      current.map((scheme) => ({
        ...scheme,
        updatedAt: scheme.projects.some((item) => item.id === project.id) ? new Date().toISOString() : scheme.updatedAt,
        projects: renameSavedProject(scheme.projects, project.id, nextName)
      }))
    );
    if (activeProjectId === project.id) {
      setProjectName(nextName.trim() || "未命名模型");
    }
  };

  const duplicateProjectRecord = (project: SavedProjectRecord) => {
    const ownerScheme = findSchemeForProject(project.id);
    const existingNames = ownerScheme?.projects.map((item) => item.name) ?? [];
    const defaultName = uniqueRecordName(`${project.name} 副本`, existingNames, "未命名模型");
    const name = promptUniqueRecordName(
      "请输入新模型名称",
      defaultName,
      existingNames,
      "模型名称不能为空。",
      "模型名称重复，无法复制。"
    );
    if (!name) {
      return;
    }
    setSchemes((current) =>
      current.map((scheme) =>
        scheme.projects.some((item) => item.id === project.id)
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: upsertSavedProject(scheme.projects, cloneProjectRecordWithName(project, name)) }
          : scheme
      )
    );
  };

  const duplicateSelectedProjectRecords = () => {
    if (selectedProjectIds.length <= 1) {
      const project = projectById.get(selectedProjectIds[0] ?? selectedProjectId);
      if (project) {
        duplicateProjectRecord(project);
      }
      return;
    }
    const selected = new Set(selectedProjectIds);
    setSchemes((current) =>
      current.map((scheme) => {
        const selectedProjects = scheme.projects.filter((project) => selected.has(project.id));
        if (selectedProjects.length === 0) {
          return scheme;
        }
        let nextProjects = scheme.projects;
        for (const project of selectedProjects) {
          nextProjects = upsertSavedProject(nextProjects, cloneProjectRecord(project, "副本", nextProjects.map((item) => item.name)));
        }
        return { ...scheme, updatedAt: new Date().toISOString(), projects: nextProjects };
      })
    );
  };

  const duplicateSelectedSchemeRecords = () => {
    if (selectedSchemeIds.length <= 1) {
      const scheme = schemes.find((item) => item.id === (selectedSchemeIds[0] ?? selectedSchemeId));
      if (scheme) {
        duplicateSchemeRecord(scheme);
      }
      return;
    }
    setSchemes((current) => {
      let nextSchemes = current;
      for (const scheme of current.filter((item) => selectedSchemeIds.includes(item.id))) {
        nextSchemes = [...nextSchemes, cloneSchemeRecord(scheme, nextSchemes)];
      }
      return nextSchemes;
    });
  };

  const deleteProjectRecord = (project: SavedProjectRecord) => {
    if (project.id === activeProjectId) {
      window.alert("当前加载模型不能删除。");
      return;
    }
    if (!window.confirm(`删除模型“${project.name}”？`)) {
      return;
    }
    setSchemes((current) =>
      current.map((scheme) =>
        scheme.projects.some((item) => item.id === project.id)
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: deleteSavedProject(scheme.projects, project.id) }
          : scheme
      )
    );
    if (selectedProjectId === project.id) {
      clearRecordSelection();
    }
  };

  const createBlankProject = () => {
    const targetSchemeId = selectedSchemeId || activeSchemeId || schemes[0]?.id;
    const targetScheme = schemes.find((scheme) => scheme.id === targetSchemeId) ?? schemes[0];
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
      canvasWidth,
      canvasHeight,
      canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND,
      powerUnit: DEFAULT_POWER_UNIT,
      voltageUnit: DEFAULT_VOLTAGE_UNIT,
      currentUnit: DEFAULT_CURRENT_UNIT,
      powerBaseValue: DEFAULT_POWER_BASE_VALUE,
      deviceIndexCounters: {},
      nodes: [],
      edges: []
    });
    setSchemes((current) =>
      current.map((scheme, index) =>
        scheme.id === targetSchemeId || (!targetSchemeId && index === 0)
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: upsertSavedProject(scheme.projects, record) }
          : scheme
      )
    );
    selectSingleProject(targetSchemeId ?? schemes[0]?.id ?? "", record.id);
    requestLoadSavedProject(record, targetSchemeId ?? schemes[0]?.id ?? "");
    writeOperationLog(`新建模型：${record.name}`);
  };

  const locateTopologyError = (error: TopologyValidationError) => {
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

  const runTopologyCalculation = () => {
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
    setViewBox(clampViewBoxToCanvas({
      x: point.x - viewBox.width / 2,
      y: point.y - viewBox.height / 2,
      width: viewBox.width,
      height: viewBox.height
    }));
  };

  const centerViewBoxOnPoint = (point: Point) => {
    setViewBox((current) =>
      clampViewBoxToCanvas({
        x: point.x - current.width / 2,
        y: point.y - current.height / 2,
        width: current.width,
        height: current.height
      })
    );
  };

  const zoomViewportAtCenter = (zoomFactor: number) => {
    setViewBox((current) => {
      const center = {
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

  const resetViewport = () => {
    setViewBox(normalizeViewBoxToCanvas({ x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height }, canvasBounds));
  };

  const fitViewToBounds = (bounds: GeometryBounds | SelectionRect | null, padding = 96) => {
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

  const fitViewToContent = () => {
    fitViewToBounds(calculateModelGeometryBounds(visibleNodes, routedEdges, 0), 120);
  };

  const focusElementTreeItem = (item: ElementTreeItem, openDeviceTab = false) => {
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

  const setEdgeManualPoints = (edgeId: string, manualPoints: Point[]) => {
    const normalizedManualPoints = manualPoints.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    const edge = edgeById.get(edgeId);
    if (!edge || sameOptionalPointList(edge.manualPoints, normalizedManualPoints)) {
      return;
    }
    markRouteEdgesDirty([edgeId]);
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
    if (!selectedEdge || !selectedRoutedEdge) {
      return;
    }
    const midpoint = routeMidpoint(selectedRoutedEdge.points);
    if (!midpoint) {
      return;
    }
    insertManualBendFromPointer(selectedEdge.id, selectedRoutedEdge.points, midpoint);
  };

  const openEdgeContextMenu = (event: MouseEvent<SVGPathElement>, edgeId: string, routePoints?: Point[]) => {
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
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "edge",
      canvasPoint: pointer,
      edgeId,
      routePoints: routePoints?.map((point) => ({ ...point }))
    });
  };

  const captureCanvasPointer = (pointerId: number) => {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
  };

  const startManualSegmentDrag = (
    event: PointerEvent<SVGPathElement>,
    edgeId: string,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
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

  const startManualPointDrag = (event: PointerEvent<SVGCircleElement>, edgeId: string, pointIndex: number, routePoints: Point[]) => {
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
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
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return 16;
    }
    const xTolerance = (viewBox.width / rect.width) * 18;
    const yTolerance = (viewBox.height / rect.height) * 18;
    return Math.max(12, Math.max(xTolerance, yTolerance));
  };

  const findConnectionRouteHitAtPoint = (point: Point) => {
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

  const insertManualBendAtPoint = (edgeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
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

  const insertManualBendFromEdgePath = (event: MouseEvent<SVGElement>, edgeId: string, routePoints: Point[]) => {
    event.preventDefault();
    event.stopPropagation();
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

  const handleEdgePathPointerDown = (event: PointerEvent<SVGPathElement>, edgeId: string, routePoints: Point[]) => {
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

  const deleteManualBendPoint = (edgeId: string, routePointIndex: number, routePoints: Point[]) => {
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
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const sourcePoint = point ?? getModelEdgeEndpointPoint(node, undefined, terminalId);
    const nextConnectSource: NonNullable<typeof connectSource> = point ? { nodeId: node.id, terminalId, point } : { nodeId: node.id, terminalId };
    setConnectSource(nextConnectSource);
    applyConnectPreviewState(sourcePoint, false, null, null, nextConnectSource);
    setMode("connect");
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
  };

  const finishTerminalPress = () => {
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
      const anchor = snapSingleTerminalAnchor(node, terminalPress.currentPoint);
      const nextNode = {
        ...node,
        terminals: node.terminals.map((terminal) =>
          terminal.id === terminalPress.terminalId ? { ...terminal, anchor } : terminal
        )
      };
      const nodeIndex = graphStore.nodeIndexById.get(terminalPress.nodeId);
      const nextNodes = nodeIndex === undefined ? nodes : nodes.slice();
      if (nodeIndex !== undefined) {
        nextNodes[nodeIndex] = nextNode;
      }
      const dirtyEdges = edgeListForNodeIds([terminalPress.nodeId]).filter((edge) =>
        (edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId) ||
        (edge.targetId === terminalPress.nodeId && edge.targetTerminalId === terminalPress.terminalId)
      );
      const dirtyEdgeIds = dirtyEdges.map((edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      const nextEdges = dirtyEdges.map((edge) => {
        const sourceAffected = edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId;
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const nextSourceNode = edge.sourceId === terminalPress.nodeId ? nextNode : sourceNode;
        const nextTargetNode = edge.targetId === terminalPress.nodeId ? nextNode : targetNode;
        const slidePatch = sourceNode && targetNode && nextSourceNode && nextTargetNode
          ? resolveStraightBusSlideEndpoint({
              edge,
              sourceNode,
              targetNode,
              nextSourceNode,
              nextTargetNode,
              movingEndpoint: sourceAffected ? "source" : "target",
              nodes,
              nextNodes,
              originalMovingPoint: terminalPress.startPoint
            })
          : null;
        return slidePatch ? { ...edge, ...slidePatch } : edge;
      });
      setGraphStore((current) => graphStorePatchGraph(current, [nextNode], nextEdges));
    }
    setTerminalPress(null);
  };

  const handleTerminalPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
    event.stopPropagation();
    if (staticDrawing && event.button === 0 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
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
        const prepared = prepareConnectionEdgeForCommit(
          routingNodesForConnectionEdge(candidateEdge, nodes),
          [candidateEdge],
          edge.id,
          canvasBounds,
          routedEdges
        );
        if (prepared.ok && prepared.edge) {
          const preparedEdge = prepared.edge;
          pushUndoSnapshot();
          markRouteEdgesDirty([edge.id]);
          markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
          patchGraphEdges([preparedEdge]);
        } else {
          const message = connectionCommitFailureMessage(prepared.issues);
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

  const ensureSavedBeforeExport = () => {
    if (canExportCurrentModel) {
      return true;
    }
    window.alert("当前模型存在未保存修改，请先保存后再导出文件。");
    return false;
  };

  const exportSvg = async () => {
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
        colorPalette
      }),
      mime: "image/svg+xml",
      description: "SVG 图形文件",
      extensions: [".svg"]
    });
    writeOperationLog(`导出图形文件：${projectName}.svg`);
  };

  const exportEFile = async () => {
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

  const safeFilePart = (name: string) => name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";

  const serializeSchemeRecordForFile = (scheme: SavedSchemeRecord) =>
    JSON.stringify(
      {
        version: 1,
        name: scheme.name,
        projects: scheme.projects.map((project) => ({
          name: project.name,
          project: normalizeProjectLayers(lockProjectEdgeTerminals(project.project))
        }))
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

  const createImportedSchemeRecord = (text: string, fileName: string) => {
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
    return createSavedScheme(
      importedName,
      importedProjects
    );
  };

  const exportProjectRecordFile = async (project: SavedProjectRecord) => {
    const projectFile = project.id === activeProjectId ? currentProject() : project.project;
    const exportName = project.id === activeProjectId ? projectName : project.name;
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
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    modelImportInputRef.current?.click();
  };

  const openSchemeImportFilePicker = () => {
    schemeImportInputRef.current?.click();
  };

  const mergeImportedSchemeIntoExisting = (existingScheme: SavedSchemeRecord, importedScheme: SavedSchemeRecord): SavedSchemeRecord => {
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
    return { ...existingScheme, updatedAt: now, projects: nextProjects };
  };

  const commitImportedSchemeRecord = (importedScheme: SavedSchemeRecord) => {
    setSchemes((current) => [...current, importedScheme]);
    setExpandedSchemeIds((current) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
    selectSingleScheme(importedScheme.id);
    writeOperationLog(`导入方案：${importedScheme.name}`);
  };

  const importSchemeFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedScheme = createImportedSchemeRecord(text, file.name);
      const duplicateScheme = schemes.find((scheme) => hasSameName(importedScheme.name, [scheme.name]));
      if (duplicateScheme) {
        setPendingSchemeImportConflict({
          importedScheme,
          importedName: importedScheme.name,
          duplicateSchemeId: duplicateScheme.id,
          duplicateSchemeName: duplicateScheme.name
        });
        return;
      }
      commitImportedSchemeRecord(importedScheme);
    } catch (error) {
      window.alert(error instanceof Error ? `导入方案失败：${error.message}` : "导入方案失败。");
    } finally {
      input.value = "";
    }
  };

  const commitImportedModelRecord = (targetScheme: SavedSchemeRecord, importedRecord: SavedProjectRecord) => {
    setSchemes((current) => {
      const fallback = current.length > 0 ? current : [targetScheme];
      const nextSchemes = fallback.some((scheme) => scheme.id === targetScheme.id) ? fallback : [...fallback, targetScheme];
      return nextSchemes.map((scheme) =>
        scheme.id === targetScheme.id
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: upsertSavedProject(scheme.projects, importedRecord) }
          : scheme
      );
    });
    setExpandedSchemeIds((current) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    loadSavedProject(importedRecord, targetScheme.id);
    writeOperationLog(`导入模型文件：${importedRecord.name}`);
  };

  const importModelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedProject = deserializeProject(text);
      const importTargetSchemeId = modelImportTargetSchemeIdRef.current;
      const targetScheme =
        schemes.find((scheme) => scheme.id === importTargetSchemeId) ??
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

  const resolveDuplicateSchemeImport = (action: "merge" | "rename" | "cancel") => {
    const conflict = pendingSchemeImportConflict;
    if (!conflict || action === "cancel") {
      setPendingSchemeImportConflict(null);
      return;
    }
    const duplicateScheme = schemes.find((scheme) => scheme.id === conflict.duplicateSchemeId);
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的方案名称",
        uniqueRecordName(conflict.importedName, schemes.map((scheme) => scheme.name), "导入方案"),
        schemes.map((scheme) => scheme.name),
        "方案名称不能为空。",
        "方案名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord({ ...conflict.importedScheme, name: renamed, updatedAt: new Date().toISOString() });
      return;
    }
    if (!duplicateScheme) {
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord(conflict.importedScheme);
      return;
    }
    setPendingSchemeImportConflict(null);
    const mergedScheme = mergeImportedSchemeIntoExisting(duplicateScheme, conflict.importedScheme);
    setSchemes((current) => current.map((scheme) => (scheme.id === duplicateScheme.id ? mergedScheme : scheme)));
    setExpandedSchemeIds((current) => (current.includes(duplicateScheme.id) ? current : [...current, duplicateScheme.id]));
    selectSingleScheme(duplicateScheme.id);
    writeOperationLog(`合并覆盖导入方案：${duplicateScheme.name}`);
  };

  const resolveDuplicateModelImport = (action: "overwrite" | "rename" | "cancel") => {
    const conflict = pendingModelImportConflict;
    if (!conflict || action === "cancel") {
      setPendingModelImportConflict(null);
      return;
    }
    const targetScheme =
      schemes.find((scheme) => scheme.id === conflict.targetSchemeId) ??
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

  const exportSchemeRecord = async (scheme: SavedSchemeRecord) => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    const writeSchemeFiles = async (writer: (filename: string, text: string, mime: string) => Promise<void> | void) => {
      await writer(`${safeFilePart(scheme.name)}.scheme.json`, serializeSchemeRecordForFile(scheme), "application/json");
      for (const project of scheme.projects) {
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
            colorPalette
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
      window.alert(`已导出方案“${scheme.name}”，共 ${scheme.projects.length} 个模型。`);
    } catch (error) {
      if (isPickerAbort(error)) {
        return;
      }
      window.alert(error instanceof Error ? `导出方案失败：${error.message}` : "导出方案失败。");
    }
  };

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
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

  const applyExistingImage = (assetId: string) => {
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

  const clearSelectedImage = () => {
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

  const clearSelectedImageForNode = (nodeId: string, target: "background" | "foreground") => {
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node) => ({
      ...node,
      params:
        target === "foreground"
          ? { ...node.params, foregroundImage: "", foregroundImageAssetId: "" }
          : { ...node.params, backgroundImage: "", backgroundImageAssetId: "" }
    }));
  };

  const createImageFolder = async () => {
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

  const renameImageFolder = async () => {
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

  const deleteImageFolder = async () => {
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

  const renderProjectPanel = () => (
    <section className="project-panel">
      <div
        className="project-list listbox"
        role="listbox"
        aria-label="绘图模型列表"
        onPointerEnter={() => {
          projectListPointerInsideRef.current = true;
        }}
        onPointerLeave={() => {
          projectListPointerInsideRef.current = false;
        }}
        onContextMenu={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest(".scheme-option, .project-option")) {
            return;
          }
          event.preventDefault();
          setProjectMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        {schemes.length === 0 ? (
          <p className="project-empty">暂无方案</p>
        ) : (
          schemes.map((scheme) => {
            const isExpanded = expandedSchemeIds.includes(scheme.id);
            return (
            <div className="scheme-group" key={scheme.id}>
              <div
                role="option"
                aria-selected={false}
                aria-expanded={isExpanded}
                tabIndex={0}
                className="scheme-option"
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    toggleSchemeSelection(scheme.id);
                  } else {
                    selectSingleScheme(scheme.id);
                  }
                  toggleSchemeExpanded(scheme.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                    event.preventDefault();
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                      toggleSchemeSelection(scheme.id);
                    } else {
                      selectSingleScheme(scheme.id);
                    }
                    toggleSchemeExpanded(scheme.id);
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const projectId = event.dataTransfer.getData("application/project-id");
                  if (projectId) {
                    moveProjectRecordToScheme(projectId, scheme.id);
                  }
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!selectedSchemeIds.includes(scheme.id)) {
                    selectSingleScheme(scheme.id);
                  }
                  setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id });
                }}
              >
                {isExpanded ? <ChevronDown className="scheme-toggle-icon" size={14} /> : <ChevronRight className="scheme-toggle-icon" size={14} />}
                <FolderOpen size={14} />
                <span>{scheme.name}</span>
              </div>
              {isExpanded && <div className="scheme-projects">
                {scheme.projects.length === 0 ? (
                  <p className="project-empty">暂无模型</p>
                ) : (
                  scheme.projects.map((project) => {
                    const isProjectSelected = selectedProjectIds.includes(project.id) || project.id === selectedProjectId;
                    return (
                    <div
                      role="option"
                      aria-selected={isProjectSelected}
                      tabIndex={0}
                      draggable
                      className={`project-option ${isProjectSelected ? "selected" : ""} ${project.id === activeProjectId ? "active" : ""}`}
                      key={project.id}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey) {
                          toggleProjectSelection(scheme.id, project.id);
                        } else {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setInspectorTab("model");
                      }}
                      onDoubleClick={() => requestLoadSavedProject(project, scheme.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/project-id", project.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          requestLoadSavedProject(project, scheme.id);
                        } else if (event.key === " " || event.key === "Spacebar") {
                          event.preventDefault();
                          if (event.ctrlKey || event.metaKey || event.shiftKey) {
                            toggleProjectSelection(scheme.id, project.id);
                          } else {
                            selectSingleProject(scheme.id, project.id);
                          }
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!selectedProjectIds.includes(project.id)) {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id, projectId: project.id });
                      }}
                    >
                      <FileJson className="project-item-icon" size={14} />
                      <span>{project.name}</span>
                    </div>
                    );
                  })
                )}
              </div>}
            </div>
            );
          })
        )}
      </div>
    </section>
  );

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
    setDefinitionDraftRows((current) => current.filter((row) => row.id !== rowId || row.readonly));
    setDefinitionDraftError("");
  };

  const saveDeviceDefinitionDraft = () => {
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

  const resetDeviceDefinitionDraft = () => {
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

  const updateCustomDraftTerminalCount = (value: number) => {
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

  const chooseCustomDeviceBackground = (event: ChangeEvent<HTMLInputElement>) => {
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

  const selectCustomComponentTemplate = (template: DeviceTemplate, sectionName = resolveTemplateComponentType(template)) => {
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

  const startCustomComponentCreate = () => {
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

  const createCustomAttributeLibrary = () => {
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

  const deleteCustomAttributeLibrary = (targetAttributeLibraryName = customDeviceDraft.attributeLibraryName) => {
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

  const createCustomComponentType = () => {
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

  const deleteCustomComponentType = (targetSection = customDeviceDraft.componentType) => {
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

  const renameSelectedCustomDeviceTreeItem = () => {
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

  const deleteSelectedCustomDeviceTreeItem = () => {
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

  const saveCustomDeviceTemplate = () => {
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

  const renderCustomComponentManagerTree = () => (
    <aside className="custom-component-manager-panel" aria-label="属性库元件类型元件管理">
      <div className="custom-component-manager-title">
        <strong>元件结构</strong>
        <span>属性库 / 元件类型 / 元件</span>
      </div>
      <div className="custom-component-manager-actions">
        <button type="button" onClick={createCustomAttributeLibrary}>新建属性库</button>
        <button type="button" onClick={createCustomComponentType}>新建元件类型</button>
        <button type="button" onClick={startCustomComponentCreate}>新建元件</button>
        <button type="button" onClick={renameSelectedCustomDeviceTreeItem}>重命名</button>
        <button type="button" onClick={deleteSelectedCustomDeviceTreeItem}>删除</button>
      </div>
      <div className="custom-component-manager-tree" role="tree">
        {attributeLibraries.map((group) => {
          const typeGroups = groupedAttributeLibraryByComponentType[group] ?? [];
          const librarySelected = customComponentTreeSelection.kind === "attributeLibrary" && customComponentTreeSelection.attributeLibraryName === group;
          const libraryCollapsed = collapsedCustomComponentTreeLibraries.some((item) => normalizeAttributeLibraryName(item) === group);
          return (
            <section className="custom-component-tree-library" key={group}>
              <button
                type="button"
                className={`custom-component-tree-row library ${librarySelected ? "active" : ""}`}
                role="treeitem"
                aria-selected={librarySelected}
                aria-expanded={!libraryCollapsed}
                onClick={() => {
                  selectCustomAttributeLibrary(group, { expand: false });
                  toggleCustomComponentTreeLibrary(group);
                }}
              >
                {libraryCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span>{group}</span>
                <strong>{typeGroups.reduce((sum, typeGroup) => sum + typeGroup.templates.length, 0)}</strong>
              </button>
              {!libraryCollapsed && <div className="custom-component-tree-type-list" role="group">
                {typeGroups.map((typeGroup) => {
                  const typeKey = customComponentTreeTypeKey(group, typeGroup.section);
                  const typeCollapsed = collapsedCustomComponentTreeTypes.includes(typeKey);
                  const typeSelected =
                    customComponentTreeSelection.kind === "componentType" &&
                    customComponentTreeSelection.attributeLibraryName === group &&
                    customComponentTreeSelection.section === typeGroup.section;
                  return (
                    <section className="custom-component-tree-type" key={`${group}-${typeGroup.section}`}>
                      <button
                        type="button"
                        className={`custom-component-tree-row type ${typeSelected ? "active" : ""}`}
                        role="treeitem"
                        aria-selected={typeSelected}
                        aria-expanded={!typeCollapsed}
                        onClick={() => {
                          selectCustomComponentType(group, typeGroup.section, { expand: false });
                          toggleCustomComponentTreeType(group, typeGroup.section);
                        }}
                      >
                        {typeCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        <span>{typeGroup.section}</span>
                        <strong>{typeGroup.templates.length}</strong>
                      </button>
                      {!typeCollapsed && <div className="custom-component-tree-components" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                        {typeGroup.templates.map((template) => {
                          const componentSelected =
                            customComponentTreeSelection.kind === "component" &&
                            customComponentTreeSelection.templateKind === template.kind;
                          return (
                            <button
                              type="button"
                              key={template.kind}
                              className={`custom-component-tree-row component ${componentSelected ? "active" : ""}`}
                              role="treeitem"
                              aria-selected={componentSelected}
                              title={`${template.label} / ${typeGroup.section} / ${template.custom ? "自定义" : "系统内置"}`}
                              onClick={() => selectCustomComponentTemplate(template, typeGroup.section)}
                            >
                              <span>{template.label}</span>
                              <small>{template.custom ? "自定义" : "内置"}</small>
                            </button>
                          );
                        })}
                      </div>}
                    </section>
                  );
                })}
              </div>}
            </section>
          );
        })}
      </div>
    </aside>
  );

  const renderLibraryDefinitionActions = () => (
    <div className="library-definition-actions">
      <button
        type="button"
        className="custom-device-create-button"
        onClick={() => {
          setCustomDeviceDraft(createEmptyCustomDeviceDraft("交流设备"));
          setCustomDeviceDialogOpen(true);
        }}
      >
        新建元件
      </button>
      <button type="button" className="custom-device-create-button" onClick={openDeviceDefinitionDialog}>
        修改元件
      </button>
    </div>
  );

  const renderGraphTemplatePreview = (template: GraphTemplate) => {
    const bounds = canvasClipboardBounds(template.clipboard);
    if (!bounds) {
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true" className="template-preview-svg">
          <rect x="8" y="10" width="64" height="36" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
        </svg>
      );
    }
    const padding = 8;
    const width = Math.max(1, bounds.right - bounds.left + padding * 2);
    const height = Math.max(1, bounds.bottom - bounds.top + padding * 2);
    return (
      <svg
        viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width} ${height}`}
        aria-hidden="true"
        className="template-preview-svg"
      >
        {template.clipboard.edges.map((item) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {template.clipboard.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
            <g transform={nodeGeometryTransform(node)}>
              <DeviceGlyph node={node} miniature colorPalette={colorPalette} />
            </g>
          </g>
        ))}
      </svg>
    );
  };

  const renderTemplateLibraryPanel = () => (
    <div className="template-library-panel library-panel-stack">
      <div className="library-scroll">
        {graphTemplateTypes.map((typeName) => {
          const expanded = expandedGraphTemplateTypes.includes(typeName);
          const templates = groupedGraphTemplates[typeName] ?? [];
          return (
            <section className="library-group-section" key={typeName}>
              <button
                className={`library-group-toggle ${expanded ? "active" : ""}`}
                onClick={() =>
                  setExpandedGraphTemplateTypes((current) =>
                    current.includes(typeName) ? current.filter((item) => item !== typeName) : [...current, typeName]
                  )
                }
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {typeName}
                <strong>{templates.length}</strong>
              </button>
              {expanded && (
                templates.length > 0 ? (
                  <div className="template-library-grid">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="template-library-item"
                        draggable
                        title={`${template.typeName} / ${template.name} / ${template.sourceSize.width}×${template.sourceSize.height}`}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/graph-template-id", template.id);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                      >
                        <span className="template-library-icon">
                          {renderGraphTemplatePreview(template)}
                        </span>
                        <span className="template-library-name">{template.name}</span>
                        <small>{template.sourceSize.width}×{template.sourceSize.height}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="template-library-empty">暂无模板</div>
                )
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  const renderLibraryPanel = () => (
    <div className="library-panel-stack">
      <div className="library-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={librarySearchQuery}
          onChange={(event) => setLibrarySearchQuery(event.target.value)}
          placeholder="搜索图元/类型"
          aria-label="搜索图元库"
        />
        {librarySearchQuery && (
          <button type="button" aria-label="清空图元库搜索" title="清空" onClick={() => setLibrarySearchQuery("")}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="library-scroll">
        {displayedAttributeLibraries.length > 0 ? displayedAttributeLibraries.map((group) => {
          const expanded = librarySearchNeedle ? true : expandedAttributeLibraries.includes(group);
          const typeGroups = filteredAttributeLibraryByComponentType[group] ?? [];
          return (
            <section className="library-group-section" key={group}>
              <button
                className={`library-group-toggle ${expanded ? "active" : ""}`}
                onClick={() =>
                  setExpandedAttributeLibraries((current) =>
                    current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
                  )
                }
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {group}
              </button>
              {expanded && (
                <div className="attribute-library-component-type-list">
                  {typeGroups.map((typeGroup) => {
                    const componentTypeKey = attributeLibraryComponentTypeKey(group, typeGroup.section);
                    const componentTypeExpanded = librarySearchNeedle ? true : expandedAttributeLibraryComponentTypes.includes(componentTypeKey);
                    return (
                      <section className="attribute-library-component-type-section" key={`${group}-${typeGroup.section}`}>
                        <button
                          type="button"
                          className={`attribute-library-component-type-header ${componentTypeExpanded ? "active" : ""}`}
                          aria-expanded={componentTypeExpanded}
                          onClick={() => toggleAttributeLibraryComponentType(group, typeGroup.section)}
                        >
                          <span>
                            {componentTypeExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            <span>{typeGroup.section}</span>
                          </span>
                          <strong>{typeGroup.templates.length}</strong>
                        </button>
                        {componentTypeExpanded && (
                          <div className="library-group">
                            {typeGroup.templates.map((item) => {
                              const preview = libraryPreviewByKind.get(item.kind) ?? createNodeFromTemplate(item, { x: 0, y: 0 });
                              const previewRotation = ((Math.round(preview.rotation) % 360) + 360) % 360;
                              const previewViewBox = previewRotation === 90 || previewRotation === 270 ? "-48 -48 96 96" : "-40 -28 80 56";
                              return (
                                <button
                                  key={item.kind}
                                  className="library-item"
                                  draggable
                                  title={`${item.label} / ${typeGroup.section}`}
                                  onDragStart={(event) => event.dataTransfer.setData("application/device-kind", item.kind)}
                                >
                                  <svg viewBox={previewViewBox} aria-hidden="true">
                                    <g transform={nodeGeometryTransform(preview)}>
                                      <DeviceGlyph node={preview} miniature colorPalette={colorPalette} />
                                    </g>
                                  </svg>
                                </button>
                              );
                            })}
                          </div>
                        )}
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

  const renderElementTreePanel = () => (
    <div className="element-tree" role="tree" aria-label="图元树">
      {elementTree.length === 0 ? (
        <div className="empty-state compact">
          <Grid2X2 size={24} />
          <p>当前画布暂无图元。</p>
        </div>
      ) : (
        elementTree.map((group) => {
          const expanded = !collapsedElementTreeGroups.includes(group.typeKey);
          const visibleLimit = elementTreeItemLimits[group.typeKey] ?? ELEMENT_TREE_INITIAL_ITEM_LIMIT;
          const visibleItems = group.items.slice(0, visibleLimit);
          const hiddenItemCount = Math.max(0, group.items.length - visibleItems.length);
          return (
            <section className="element-tree-group" key={group.typeKey}>
              <button
                type="button"
                className="element-tree-type"
                role="treeitem"
                aria-expanded={expanded}
                onClick={() => toggleElementTreeGroup(group.typeKey)}
              >
                <span className="element-tree-type-label">
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{group.typeLabel}</span>
                </span>
                <strong>{group.items.length}</strong>
              </button>
              {expanded && (
                <div className="element-tree-items" role="group">
                  {visibleItems.map((item) => {
                    const editable = item.kind === "node" ? activeLayerNodeIdSet.has(item.id) : activeLayerEdgeIdSet.has(item.id);
                    const selected = editable && (item.kind === "node" ? selectedNodeIdSet.has(item.id) : activeSelectedEdgeSet.has(item.id));
                    const itemChildren = elementTreeItemChildren(item);
                    const selectTreeItem = () => {
                      if (!editable) {
                        return;
                      }
                      if (item.kind === "node") {
                        selectCanvasGraphics([item.id], []);
                        clearRecordSelection();
                      } else {
                        selectCanvasGraphics([], [item.id]);
                      }
                    };
                    return (
                      <div
                        role="treeitem"
                        aria-level={2}
                        aria-selected={selected}
                        className={`element-tree-item ${selected ? "selected" : ""}`}
                        key={`${item.kind}:${item.id}`}
                        title="双击定位并选中图元"
                        tabIndex={0}
                        onClick={selectTreeItem}
                        onDoubleClick={() => focusElementTreeItem(item, true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            focusElementTreeItem(item);
                          }
                        }}
                      >
                        <div className="element-tree-item-main">
                          {item.kind === "node" && item.editableDevice ? (
                            <div className="element-tree-device-fields">
                              <label>
                                <span>idx</span>
                                <input
                                  value={item.idx ?? ""}
                                  inputMode="numeric"
                                  onClick={(event) => event.stopPropagation()}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  disabled={!editable}
                                  onChange={(event) => updateElementTreeNodeIdentity(item.id, "idx", event.target.value)}
                                />
                              </label>
                              <label>
                                <span>name</span>
                                <input
                                  value={item.name}
                                  onClick={(event) => event.stopPropagation()}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  disabled={!editable}
                                  onChange={(event) => updateElementTreeNodeIdentity(item.id, "name", event.target.value)}
                                />
                              </label>
                            </div>
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </div>
                        {itemChildren.length ? (
                          <div className="element-tree-child-list" role="group" aria-label={`${item.name}关联子设备`}>
                            {itemChildren.map((child) => (
                              <div className="element-tree-child-item" key={child.id}>
                                <span className="element-tree-child-type" title={child.componentType}>
                                  {child.componentType}
                                </span>
                                <label>
                                  <span>idx</span>
                                  <input
                                    value={child.idx}
                                    inputMode="numeric"
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    disabled={!editable}
                                    onChange={(event) => updateElementTreeContainerChildParam(item.id, child.relationKeys[0] ?? "", event.target.value)}
                                  />
                                </label>
                                <label className="element-tree-child-name-field">
                                  <span>name</span>
                                  <input
                                    value={child.name}
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    disabled={!editable}
                                    onChange={(event) => updateElementTreeContainerChildParam(item.id, child.nameKey, event.target.value)}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {hiddenItemCount > 0 && (
                    <button
                      type="button"
                      className="element-tree-more"
                      onClick={() =>
                        setElementTreeItemLimits((current) => ({
                          ...current,
                          [group.typeKey]: visibleLimit + ELEMENT_TREE_ITEM_LIMIT_STEP
                        }))
                      }
                    >
                      显示更多（还有 {hiddenItemCount} 个）
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );

  const topologyWarningDisplayMessage = (message: string) =>
    message.replace(/^(?:图上拓扑失败|拓扑失败)\s*[:：]\s*/, "");

  const warningStatusText = topologyErrors.length > 0
    ? `告警 ${topologyErrors.length} 条：${topologyWarningDisplayMessage(topologyErrors[0]?.message ?? "请查看拓扑告警")}`
    : "告警 无";
  const warningStatusTitle = topologyErrors.length > 0
    ? topologyErrors.slice(0, 5).map((error, index) => `${index + 1}. ${topologyWarningDisplayMessage(error.message)}`).join("\n")
    : "当前没有拓扑告警。";
  const currentZoomPercent = viewBoxZoomPercent(viewBox, canvasBounds);
  const connectPreviewDom = connectPreviewDomRef.current;
  const layerAssignmentUnchanged = activeSelectedNodeIds.length > 0 && activeSelectedNodeIds.every(
    (nodeId) => (nodeById.get(nodeId)?.layerId ?? DEFAULT_MODEL_LAYER_ID) === layerAssignmentTargetId
  );
  const selectedCanvasBounds = combineSelectionRects(selectedLayoutUnits.map((unit) => unit.bounds)) ??
    calculateModelGeometryBounds(
      [],
      activeSelectedEdgeIds.flatMap((edgeId) => {
        const route = routedEdgeById.get(edgeId);
        return route ? [{ points: route.points }] : [];
      }),
      24
    );
  const selectedToolbarHidden = Boolean(
    dragging ||
    transformDrag ||
    panning ||
    marquee ||
    connectSource ||
    staticDrawing ||
    rewiring ||
    terminalPress ||
    manualPathDrag ||
    nodeLabelDrag ||
    nodeLabelRotateDrag
  );
  const contextMenuTarget = contextMenu?.target ?? (contextMenu?.edgeId ? "edge" : "blank");
  const contextMenuForSelection = contextMenuTarget !== "blank";
  const contextMenuForNode = contextMenuTarget === "node";
  const contextMenuForEdge = contextMenuTarget === "edge";
  const nodeFloatingToolbarActionCount =
    6 +
    (canGroupSelectedGraphics ? 1 : 0) +
    (canUngroupSelectedGraphics ? 1 : 0) +
    (canAddTemplateFromSelection ? 1 : 0);
  const nodeFloatingToolbarWidth = Math.max(NODE_FLOATING_TOOLBAR_WIDTH, nodeFloatingToolbarActionCount * 34 + 16);
  const svgUiUnitX = viewBox.width / Math.max(1, canvasWidth);
  const svgUiUnitY = viewBox.height / Math.max(1, canvasHeight);
  const toolbarPaddingX = 8 * svgUiUnitX;
  const toolbarPaddingY = 8 * svgUiUnitY;
  const nodeFloatingToolbar =
    !selectedToolbarHidden && activeSelectedNodeIds.length > 0 && selectedCanvasBounds
      ? (() => {
          const width = nodeFloatingToolbarWidth * svgUiUnitX;
          const height = NODE_FLOATING_TOOLBAR_HEIGHT * svgUiUnitY;
          const centerX = (selectedCanvasBounds.left + selectedCanvasBounds.right) / 2;
          const preferredY = selectedCanvasBounds.top - height - CANVAS_FLOATING_TOOLBAR_GAP * svgUiUnitY;
          return {
            x: clampNumber(centerX - width / 2, viewBox.x + toolbarPaddingX, viewBox.x + viewBox.width - width - toolbarPaddingX),
            y: clampNumber(
              preferredY,
              viewBox.y + toolbarPaddingY,
              viewBox.y + viewBox.height - height - toolbarPaddingY
            ),
            width: nodeFloatingToolbarWidth,
            height: NODE_FLOATING_TOOLBAR_HEIGHT,
            scaleX: svgUiUnitX,
            scaleY: svgUiUnitY
          };
        })()
      : null;
  const selectedEdgeMidpoint = selectedRoutedEdge ? routeMidpoint(selectedRoutedEdge.points) : null;
  const edgeFloatingToolbar =
    !selectedToolbarHidden && selectedEdge && selectedRoutedEdge && selectedEdgeMidpoint
      ? (() => {
          const width = EDGE_FLOATING_TOOLBAR_WIDTH * svgUiUnitX;
          const height = EDGE_FLOATING_TOOLBAR_HEIGHT * svgUiUnitY;
          return {
            x: clampNumber(selectedEdgeMidpoint.x - width / 2, viewBox.x + toolbarPaddingX, viewBox.x + viewBox.width - width - toolbarPaddingX),
            y: clampNumber(
              selectedEdgeMidpoint.y - height - 14 * svgUiUnitY,
              viewBox.y + toolbarPaddingY,
              viewBox.y + viewBox.height - height - toolbarPaddingY
            ),
            width: EDGE_FLOATING_TOOLBAR_WIDTH,
            height: EDGE_FLOATING_TOOLBAR_HEIGHT,
            scaleX: svgUiUnitX,
            scaleY: svgUiUnitY
          };
        })()
      : null;
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
  const minimapScale = Math.min(
    (CANVAS_MINIMAP_WIDTH - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasWidth),
    (CANVAS_MINIMAP_HEIGHT - CANVAS_MINIMAP_PADDING * 2) / Math.max(1, canvasHeight)
  );
  const minimapContentWidth = canvasWidth * minimapScale;
  const minimapContentHeight = canvasHeight * minimapScale;
  const minimapOffsetX = (CANVAS_MINIMAP_WIDTH - minimapContentWidth) / 2;
  const minimapOffsetY = (CANVAS_MINIMAP_HEIGHT - minimapContentHeight) / 2;
  const minimapNodeStep = Math.max(1, Math.ceil(visibleNodes.length / CANVAS_MINIMAP_MAX_NODE_MARKS));
  const minimapRouteStep = Math.max(1, Math.ceil(routedEdges.length / CANVAS_MINIMAP_MAX_ROUTE_MARKS));
  const minimapNodes = useMemo(
    () => visibleNodes.filter((_, index) => index % minimapNodeStep === 0),
    [minimapNodeStep, visibleNodes]
  );
  const minimapRoutes = useMemo(
    () => routedEdges.filter((_, index) => index % minimapRouteStep === 0),
    [minimapRouteStep, routedEdges]
  );
  const mapPointToMinimap = (point: Point) => ({
    x: minimapOffsetX + point.x * minimapScale,
    y: minimapOffsetY + point.y * minimapScale
  });
  const minimapViewportLeft = clampNumber(minimapOffsetX + viewBox.x * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth);
  const minimapViewportTop = clampNumber(minimapOffsetY + viewBox.y * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight);
  const minimapViewportRight = clampNumber(minimapOffsetX + (viewBox.x + viewBox.width) * minimapScale, minimapOffsetX, minimapOffsetX + minimapContentWidth);
  const minimapViewportBottom = clampNumber(minimapOffsetY + (viewBox.y + viewBox.height) * minimapScale, minimapOffsetY, minimapOffsetY + minimapContentHeight);
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

  return (
    <div
      className={`app-shell left-panel-${leftPanelMode} right-panel-${rightPanelMode} ${sidePanelResize ? "side-panel-resizing" : ""} ${statusbarResize ? "statusbar-resizing" : ""} ${validationPanelResize ? "validation-panel-resizing" : ""} ${canvasResizeDrag ? "canvas-resizing" : ""}`}
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
          <button className={leftPanelTab === "projects" ? "active" : ""} onClick={() => setLeftPanelTab("projects")} role="tab" aria-selected={leftPanelTab === "projects"}>
            模型库
          </button>
          <button className={leftPanelTab === "library" ? "active" : ""} onClick={() => setLeftPanelTab("library")} role="tab" aria-selected={leftPanelTab === "library"}>
            图元库
          </button>
          <button className={leftPanelTab === "templates" ? "active" : ""} onClick={() => setLeftPanelTab("templates")} role="tab" aria-selected={leftPanelTab === "templates"}>
            模板库
          </button>
        </div>
        <div className="left-panel-content">
          {leftPanelTab === "projects" ? renderProjectPanel() : leftPanelTab === "templates" ? renderTemplateLibraryPanel() : renderLibraryPanel()}
        </div>
      </aside>

      <main className="workspace" onPointerEnter={hideAutoPanelsFromWorkspace}>
        <header className="topbar">
          <div className="brand topbar-brand">
            <div className="brand-mark">PS</div>
            <div>
              <h1>电力能源系统图上建模平台</h1>
              <p>拖拽建模、拓扑关联、参数维护</p>
            </div>
          </div>
          <div className="topbar-model" title={`当前模型：${activeModelPathName}`}>
            <span>当前模型</span>
            <strong>{activeModelPathName}</strong>
          </div>
          <div className="active-layer-indicator" title={`激活图层：${activeLayer?.name ?? "默认图层"}`}>
            <Layers size={15} />
            <span>{activeLayer?.name ?? "默认图层"}</span>
          </div>
          <button
            className="topbar-primary-button"
            onClick={() => setLayerDialogOpen(true)}
            title="图层管理"
            aria-label="图层管理"
          >
            <Layers2 size={16} />
          </button>
          <button className="topbar-primary-button" onClick={runTopologyCalculation} title="图上拓扑" aria-label="图上拓扑">
            <Grid2X2 size={16} />
          </button>
          <button
            className="topbar-primary-button"
            onClick={() => saveCurrentProject()}
            disabled={!saveRequired}
            title={saveRequired ? "保存当前模型" : "当前模型没有新的修改"}
            aria-label="保存"
          >
            <Save size={16} />
          </button>
          <button
            className={`topbar-primary-button ${colorDisplayMode === "voltage" ? "active" : ""}`}
            onClick={() => toggleColorDisplayMode()}
            title={colorDisplayMode === "voltage" ? "当前交流/直流按电压等级显示，点击切换为按能源类型显示；氢能、热能始终按能源类型显示" : "当前交流/直流按能源类型显示，点击切换为按电压等级显示；氢能、热能始终按能源类型显示"}
            aria-label="颜色切换"
          >
            <Paintbrush size={16} />
          </button>
          <button
            className="topbar-primary-button"
            onClick={openColorPaletteDialog}
            title="配色设置"
            aria-label="配色设置"
          >
            <Palette size={16} />
          </button>
          <button
            className={`topbar-primary-button ${deviceLabelsVisible ? "active" : ""}`}
            onClick={() => setDeviceLabelsVisible((current) => !current)}
            title={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"}
            aria-label={deviceLabelsVisible ? "隐藏设备标识" : "显示设备标识"}
          >
            <Type size={16} />
          </button>
          {ENABLE_REACT_FLOW_PREVIEW && (
            <button
              className="topbar-primary-button react-flow-preview-button"
              onClick={() => setReactFlowPreviewOpen(true)}
              title="React Flow 预览"
              aria-label="React Flow 预览"
            >
              <Route size={16} />
            </button>
          )}
          <div className="action-cluster">
            <button onClick={groupSelectedGraphics} disabled={!canGroupSelectedGraphics} title="组合" aria-label="组合">
              <Group size={16} />
            </button>
            <button onClick={ungroupSelectedGraphics} disabled={!canUngroupSelectedGraphics} title="解散" aria-label="解散">
              <Ungroup size={16} />
            </button>
            <div className="topbar-dropdown align-dropdown">
              <button type="button" className="topbar-dropdown-trigger" title="对齐操作" aria-label="对齐操作">
                <AlignCenterHorizontal size={16} />
                <ChevronDown size={13} />
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="对齐操作">
                <button onClick={() => alignSelected("left")} disabled={selectedLayoutUnitCount < 2} title="左对齐" aria-label="左对齐">
                  <AlignStartVertical size={16} />
                  <span>左对齐</span>
                </button>
                <button onClick={() => alignSelected("right")} disabled={selectedLayoutUnitCount < 2} title="右对齐" aria-label="右对齐">
                  <AlignEndVertical size={16} />
                  <span>右对齐</span>
                </button>
                <button onClick={() => alignSelected("horizontal")} disabled={selectedLayoutUnitCount < 2} title="横向居中" aria-label="横向居中">
                  <AlignCenterHorizontal size={16} />
                  <span>横向居中</span>
                </button>
                <button onClick={() => alignSelected("vertical")} disabled={selectedLayoutUnitCount < 2} title="纵向居中" aria-label="纵向居中">
                  <AlignCenterVertical size={16} />
                  <span>纵向居中</span>
                </button>
                <button onClick={() => alignSelected("top")} disabled={selectedLayoutUnitCount < 2} title="上对齐" aria-label="上对齐">
                  <AlignStartHorizontal size={16} />
                  <span>上对齐</span>
                </button>
                <button onClick={() => alignSelected("bottom")} disabled={selectedLayoutUnitCount < 2} title="下对齐" aria-label="下对齐">
                  <AlignEndHorizontal size={16} />
                  <span>下对齐</span>
                </button>
                <button onClick={() => distributeSelected("horizontal")} disabled={selectedLayoutUnitCount < 3} title="横向分布" aria-label="横向分布">
                  <AlignHorizontalDistributeCenter size={16} />
                  <span>横向分布</span>
                </button>
                <button onClick={() => distributeSelected("vertical")} disabled={selectedLayoutUnitCount < 3} title="纵向分布" aria-label="纵向分布">
                  <AlignVerticalDistributeCenter size={16} />
                  <span>纵向分布</span>
                </button>
              </div>
            </div>
            <div className="topbar-dropdown rotate-dropdown">
              <button type="button" className="topbar-dropdown-trigger" title="旋转操作" aria-label="旋转操作">
                <RotateCw size={16} />
                <ChevronDown size={13} />
              </button>
              <div className="topbar-dropdown-menu" role="menu" aria-label="旋转操作">
                <button onClick={() => rotateSelectedLayoutUnits("left")} disabled={selectedLayoutUnitCount < 1} title="向左旋转90度" aria-label="向左旋转90度">
                  <RotateCcw size={16} />
                  <span>左转90度</span>
                </button>
                <button onClick={() => rotateSelectedLayoutUnits("right")} disabled={selectedLayoutUnitCount < 1} title="向右旋转90度" aria-label="向右旋转90度">
                  <RotateCw size={16} />
                  <span>右转90度</span>
                </button>
                <button onClick={() => mirrorSelectedNodes("horizontal")} disabled={selectedLayoutUnitCount < 1} title="水平镜像" aria-label="水平镜像">
                  <FlipHorizontal size={16} />
                  <span>水平镜像</span>
                </button>
                <button onClick={() => mirrorSelectedNodes("vertical")} disabled={selectedLayoutUnitCount < 1} title="垂直镜像" aria-label="垂直镜像">
                  <FlipVertical size={16} />
                  <span>垂直镜像</span>
                </button>
              </div>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={chooseImage} />
            <input ref={customDeviceImageInputRef} type="file" accept="image/*" hidden onChange={chooseCustomDeviceBackground} />
            <input ref={modelImportInputRef} type="file" accept=".json,application/json" hidden onChange={importModelFile} />
            <input ref={schemeImportInputRef} type="file" accept=".json,application/json" hidden onChange={importSchemeFile} />
            <button
              onClick={exportSvg}
              disabled={!canExportCurrentModel}
              title={canExportCurrentModel ? "导出 SVG 图形文件" : "请先保存当前模型后再导出图形文件"}
              aria-label="导出图形文件"
            >
              <Download size={16} />
            </button>
            <button
              onClick={exportEFile}
              disabled={!canExportCurrentModel}
              title={canExportCurrentModel ? "导出 E 模型文件" : "请先保存当前模型后再导出模型文件"}
              aria-label="导出模型文件"
            >
              <FileJson size={16} />
            </button>
          </div>
        </header>

        <section className="canvas-frame" ref={canvasFrameRef}>
          <svg
            ref={svgRef}
            className={`diagram-canvas ${connectSource ? "connect-mode" : ""} ${staticDrawing ? "static-draw-mode" : ""} ${activeDropReady ? "connect-drop-ready" : ""} ${panning ? "panning" : ""} ${multiNodeDragging ? "multi-node-dragging" : ""}`}
            style={{ width: canvasWidth, height: canvasHeight }}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onWheel={handleWheel}
            onPointerMove={handlePointerMove}
            onPointerEnter={() => {
              canvasInteractionRef.current = true;
              projectListPointerInsideRef.current = false;
            }}
            onPointerUp={(event) => {
              finishRewiring(event);
              finishTerminalPress();
              finishNodeLabelDrag();
              finishNodeLabelRotateDrag();
              finishMarqueeSelection();
              finishNodeDrag();
              finishManualPathDrag();
              finishTransformDrag();
              setPanning(null);
            }}
            onPointerLeave={() => {
              canvasInteractionRef.current = false;
              if (manualPathDrag) {
                return;
              }
              finishNodeLabelDrag();
              finishNodeLabelRotateDrag();
              finishNodeDrag();
              setTerminalPress(null);
              finishManualPathDrag();
              finishTransformDrag();
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onPointerCancel={() => {
              finishNodeLabelDrag();
              finishNodeLabelRotateDrag();
              finishNodeDrag();
              setTerminalPress(null);
              finishManualPathDrag();
              finishTransformDrag();
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onLostPointerCapture={() => {
              finishNodeLabelDrag();
              finishNodeLabelRotateDrag();
              finishNodeDrag();
              setTerminalPress(null);
              finishManualPathDrag();
              finishTransformDrag();
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              activateInspectorFromCanvas();
              canvasInteractionRef.current = true;
              projectListPointerInsideRef.current = false;
              const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
              const pointer = clampPointToCanvas(rawPointer);
              lastRawCanvasPointerRef.current = rawPointer;
              lastCanvasPointerRef.current = pointer;
              updateMouseStatus(pointer);
              if (staticDrawing) {
                appendStaticDrawingPoint(pointer, event.detail >= 2);
                return;
              }
              if (connectSource) {
                const previewPoint = resolveConnectPreviewPoint(pointer, event);
                const target = findConnectTargetAtPoint(previewPoint);
                applyConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
                if (target) {
                  finishConnectToTarget(target, previewPoint);
                } else {
                  applyConnectPreviewState(previewPoint, false);
                }
                return;
              }
              if (event.ctrlKey || event.shiftKey) {
                setConnectSource(null);
                resetConnectPreviewState();
                setRewiring(null);
                setPanning({ clientX: event.clientX, clientY: event.clientY, viewBox });
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
              }
              const routeHit = findConnectionRouteHitAtPoint(pointer);
              if (routeHit) {
                const edgeClick = {
                  edgeId: routeHit.edgeId,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  at: Date.now()
                };
                const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
                lastEdgePointerClickRef.current = edgeClick;
                selectCanvasGraphics([], [routeHit.edgeId]);
                setConnectSource(null);
                resetConnectPreviewState();
                setRewiring(null);
                clearRecordSelection();
                if (event.detail >= 2 || repeatedClick) {
                  insertManualBendFromPointer(routeHit.edgeId, routeHit.routePoints, pointer);
                  lastEdgePointerClickRef.current = null;
                }
                return;
              }
              lastEdgePointerClickRef.current = null;
              setCanvasSelectionScope("group");
              setSelectedNodeIds([]);
              setSelectedEdgeId("");
              setSelectedEdgeIds([]);
              setConnectSource(null);
              resetConnectPreviewState();
              setRewiring(null);
              setInspectorTab("model");
              if (activeProjectId) {
                setSelectedProjectId(activeProjectId);
                setSelectedProjectIds([activeProjectId]);
                setSelectedSchemeId(activeSchemeId);
                setSelectedSchemeIds([]);
              }
              const point = lastCanvasPointerRef.current;
              setMarquee({ start: point, current: point });
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              const rawPointer = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
              const pointer = clampPointToCanvas(rawPointer);
              lastRawCanvasPointerRef.current = rawPointer;
              lastCanvasPointerRef.current = pointer;
              updateMouseStatus(pointer);
              if (staticDrawing) {
                finishInteractiveStaticDrawing(pointer);
                return;
              }
              if (connectSource) {
                setConnectSource(null);
                resetConnectPreviewState();
                setMode("select");
                return;
              }
              const routeHit = findConnectionRouteHitAtPoint(pointer);
              if (routeHit) {
                selectCanvasGraphics([], [routeHit.edgeId]);
                setConnectSource(null);
                resetConnectPreviewState();
                setRewiring(null);
                clearRecordSelection();
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  target: "edge",
                  canvasPoint: pointer,
                  edgeId: routeHit.edgeId,
                  routePoints: routeHit.routePoints.map((point) => ({ ...point }))
                });
                return;
              }
              setContextMenu({ x: event.clientX, y: event.clientY, target: "blank", canvasPoint: pointer });
            }}
          >
            <defs>
              <pattern id="small-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
              <pattern id="large-grid" width="120" height="120" patternUnits="userSpaceOnUse">
                <rect width="120" height="120" fill="url(#small-grid)" />
                <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
              </pattern>
            </defs>
            <rect width={canvasWidth} height={canvasHeight} fill={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND} />
            {canvasBackgroundImageUrl && (
              <image
                href={canvasBackgroundImageUrl}
                x="0"
                y="0"
                width={canvasWidth}
                height={canvasHeight}
                preserveAspectRatio="xMidYMid slice"
                pointerEvents="none"
              />
            )}
            <rect width={canvasWidth} height={canvasHeight} fill="url(#large-grid)" />
            <rect className="canvas-boundary" x="0" y="0" width={canvasWidth} height={canvasHeight} />
            <g className="canvas-content">
            {marquee && (
              <rect
                className="marquee-box"
                x={Math.min(marquee.start.x, marquee.current.x)}
                y={Math.min(marquee.start.y, marquee.current.y)}
                width={Math.abs(marquee.current.x - marquee.start.x)}
                height={Math.abs(marquee.current.y - marquee.start.y)}
              />
            )}
            {renderInteractiveStaticDrawingPreview()}
            {dragGhostEdgeRoutes.map((route) => (
              <path key={`drag-ghost-edge-${route.edgeId}`} d={route.path} className="connection-line drag-ghost" style={connectionLineStyle(route.edgeId)} />
            ))}
            {dragging?.historyCaptured && !multiNodeDragging && dragging.nodeIds.map((nodeId) => {
              const node = nodeById.get(nodeId);
              const originalPosition = dragging.originalPositions[nodeId];
              if (!node || !originalPosition) {
                return null;
              }
              const ghostNode = { ...node, position: originalPosition };
              const ghostNodeIsBus = isBusNode(ghostNode);
              return (
                <g
                  key={`drag-ghost-${node.id}`}
                  className={`node-drag-ghost ${ghostNodeIsBus ? "bus-node" : ""}`}
                  transform={`translate(${ghostNode.position.x} ${ghostNode.position.y})`}
                >
                  <g transform={nodeGeometryTransform(ghostNode)}>
                    <rect
                      x={-ghostNode.size.width / 2}
                      y={-ghostNode.size.height / 2}
                      width={ghostNode.size.width}
                      height={ghostNode.size.height}
                      rx="8"
                      className="node-drag-ghost-box"
                    />
                    <DeviceGlyph node={ghostNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                    <DeviceGlyph node={ghostNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                  </g>
                </g>
              );
            })}
            {viewportRoutedEdges.map((route) => {
              const edge = edgeById.get(route.edgeId);
              if (!edge) return null;
              if (
                (draggingDelta && dragPreviewEdgeIdSet.has(edge.id)) ||
                (multiNodeDragging && dragOverlayEdgeIdSet.has(edge.id)) ||
                groupTransformPreviewEdgeIdSet.has(edge.id) ||
                terminalPressPreviewEdgeIdSet.has(edge.id) ||
                rewiring?.edgeId === edge.id
              ) {
                return null;
              }
              const selected = activeSelectedEdgeSet.has(edge.id);
              const sourcePoint = getEdgeEndpointPoint(edge, "source");
              const targetPoint = getEdgeEndpointPoint(edge, "target");
              const sourceNode = nodeById.get(edge.sourceId);
              const targetNode = nodeById.get(edge.targetId);
              const editable = activeLayerEdgeIdSet.has(edge.id);
              const rewiringSource = rewiring?.edgeId === edge.id && rewiring.endpoint === "source";
              const rewiringTarget = rewiring?.edgeId === edge.id && rewiring.endpoint === "target";
              const rewireTarget = rewiring?.edgeId === edge.id ? findRewireTargetAtPoint(rewiring.previewPoint, rewiring) : null;
              const sourceBusDotPoint = rewiringSource
                ? rewireTarget?.node && isBusNode(rewireTarget.node)
                  ? rewireTarget.point
                  : undefined
                : sourcePoint && sourceNode && isBusNode(sourceNode)
                  ? sourcePoint
                  : undefined;
              const targetBusDotPoint = rewiringTarget
                ? rewireTarget?.node && isBusNode(rewireTarget.node)
                  ? rewireTarget.point
                  : undefined
                : targetPoint && targetNode && isBusNode(targetNode)
                  ? targetPoint
                  : undefined;
              return (
                <g key={edge.id} className={`connection-group ${selected ? "selected" : ""}`} style={connectionLineStyle(edge.id)}>
                  <path
                    d={route.path}
                    className="connection-hitline"
                    onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined}
                    onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined}
                    onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}
                  />
                  <path
                    d={route.path}
                    className="connection-line"
                    onContextMenu={editable ? (event) => openEdgeContextMenu(event, edge.id, route.points) : undefined}
                    onDoubleClick={editable ? (event) => insertManualBendFromEdgePath(event, edge.id, route.points) : undefined}
                    onPointerDown={editable ? (event) => handleEdgePathPointerDown(event, edge.id, route.points) : undefined}
                  />
                  {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-source-internal-connector`)}
                  {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-target-internal-connector`)}
                  {sourceBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={sourceBusDotPoint.x}
                      cy={sourceBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringSource ? rewireTarget?.node : sourceNode) ?? sourceNode!, colorPalette)}
                      onPointerDown={editable ? (event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        selectCanvasGraphics([], [edge.id]);
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } : undefined}
                    />
                  )}
                  {targetBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={targetBusDotPoint.x}
                      cy={targetBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringTarget ? rewireTarget?.node : targetNode) ?? targetNode!, colorPalette)}
                      onPointerDown={editable ? (event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        selectCanvasGraphics([], [edge.id]);
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } : undefined}
                    />
                  )}
                  {selected && sourcePoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                  {selected && targetPoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                </g>
              );
            })}
            {rewiringPreviewRoute && (
              <path
                key={`rewiring-preview-edge-${rewiringPreviewRoute.edgeId}`}
                d={rewiringPreviewRoute.path}
                className="connection-line drag-preview"
                style={connectionLineStyle(rewiringPreviewRoute.edgeId)}
              />
            )}
            {selectedGroupLayoutUnits.map((unit) => {
              const transforming = groupTransformPreviewGroupId === unit.id;
              const focused = selectedTransformGroupUnit?.id === unit.id;
              const bounds = unit.bounds;
              const width = Math.max(1, bounds.right - bounds.left);
              const height = Math.max(1, bounds.bottom - bounds.top);
              const center = selectionRectCenter(bounds);
              const handleGapX = 14;
              const handleGapY = 14;
              const rotateStemStart = 12;
              const rotateStemEnd = 36;
              const rotateHandleGap = 42;
              return (
                <g key={`group-selection-${unit.id}`} className={`group-selection-overlay ${focused ? "focused" : ""} ${transforming ? "transforming" : ""}`}>
                  <rect
                    className="group-selection-hitbox"
                    x={bounds.left}
                    y={bounds.top}
                    width={width}
                    height={height}
                    onPointerDown={(event) => startGroupMoveDrag(event, unit)}
                  />
                  <rect
                    className="group-selection-outline"
                    x={bounds.left}
                    y={bounds.top}
                    width={width}
                    height={height}
                  />
                  {focused && (
                    <g className={`transform-handles group-transform-handles ${transformDrag && isGroupTransformDrag(transformDrag) && transformDrag.groupId === unit.id.replace(/^group:/, "") && transformDrag.kind !== "rotate" ? "resizing" : ""}`}>
                      <line x1={center.x} y1={bounds.top - rotateStemStart} x2={center.x} y2={bounds.top - rotateStemEnd} />
                      <g transform={`translate(${center.x} ${bounds.top - rotateHandleGap})`}>
                        <circle
                          className="rotate-handle"
                          cx="0"
                          cy="0"
                          r="8"
                          onPointerDown={(event) => startGroupTransformDrag(event, unit, "rotate")}
                        />
                      </g>
                      {SCALE_HANDLE_CONFIGS.map((handle) => {
                        const x =
                          handle.xDirection === 0
                            ? center.x
                            : handle.xDirection < 0
                              ? bounds.left - handleGapX
                              : bounds.right + handleGapX;
                        const y =
                          handle.yDirection === 0
                            ? center.y
                            : handle.yDirection < 0
                              ? bounds.top - handleGapY
                              : bounds.bottom + handleGapY;
                        return (
                          <g key={handle.id} transform={`translate(${x} ${y})`}>
                            <rect
                              className={`scale-handle ${handle.className}`}
                              x="-8"
                              y="-8"
                              width="16"
                              height="16"
                              rx="3"
                              onPointerDown={(event) => startGroupTransformDrag(event, unit, handle.kind)}
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              );
            })}
            {viewportNodes.map((node) => {
              if (groupTransformPreviewNodeIdSet.has(node.id)) {
                return null;
              }
              const selected = selectedNodeIdSet.has(node.id);
              const focused = node.id === selectedNodeId;
              const editable = activeLayerNodeIdSet.has(node.id);
              const isStorageBus = node.kind === "hydrogen-tank" || node.kind === "thermal-storage-tank";
              const isConnectSource = node.id === connectSource?.nodeId;
              const originalDragPosition = dragging?.originalPositions[node.id];
              const renderPosition = draggingDelta && originalDragPosition
                ? clampNodeToCanvas(node, {
                    x: originalDragPosition.x + draggingDelta.x,
                    y: originalDragPosition.y + draggingDelta.y
                  })
                : node.position;
              const imageHref = nodeImage(node);
              const foregroundImageHref = nodeForegroundImage(node);
              const nodeScaleX = getNodeScaleX(node);
              const nodeScaleY = getNodeScaleY(node);
              const nodeIsBus = isBusNode(node);
              const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
              const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
              const terminalStubDashArray = svgStrokeDashArray(node.params.strokeStyle);
              const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
              const handleTransform = (x: number, y: number) => `translate(${x} ${y})`;
              const includeUprightContentInHandles = nodeHasUprightBoundsContent(node, imageHref, foregroundImageHref);
              const transformedHalfExtents = nodeTransformedHalfExtents(node, includeUprightContentInHandles);
              const handleGapX = 14;
              const handleGapY = 14;
              const visibleHalfWidth = transformedHalfExtents.halfWidth;
              const visibleHalfHeight = transformedHalfExtents.halfHeight;
              const rotateStemStart = 12;
              const rotateStemEnd = 36;
              const rotateHandleGap = 42;
              return (
                <g
                  key={node.id}
                  className={`diagram-node ${nodeIsBus ? "bus-node" : ""} ${isStorageBus ? "storage-node" : ""} ${multiNodeDragging && draggingNodeIdSet.has(node.id) ? "multi-drag-origin" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${isConnectSource ? "connect-source" : ""}`}
                  transform={`translate(${renderPosition.x} ${renderPosition.y})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!editable) {
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
                    if (!selectedNodeIdSet.has(node.id)) {
                      selectCanvasGraphics([node.id], []);
                    }
                    setContextMenu({ x: event.clientX, y: event.clientY, target: "node", nodeId: node.id });
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (!editable) {
                      return;
                    }
                    if (isBusNode(node)) {
                      return;
                    }
                    selectCanvasGraphics([node.id], []);
                    setImageTarget({ kind: "node", nodeId: node.id });
                  }}
                >
                  <title>{node.name}</title>
                  {imageHref && !nodeIsBus && (
                    <clipPath id={`clip-${node.id}`}>
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
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                      className={`node-hitbox ${nodeIsBus ? "bus-hitbox" : ""} ${isStaticNode(node) ? "static-hitbox" : ""}`}
                    />
                    <DeviceGlyph node={node} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
                    <DeviceGlyph node={node} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} />
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
                          clipPath={`url(#clip-${node.id})`}
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
                          clipPath={`url(#clip-${node.id})`}
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
                          clipPath={`url(#clip-${node.id})`}
                          className="node-foreground-image"
                        />
                      )}
                    </g>
                  )}
                  {nodeLabelShouldRender(node, deviceLabelsVisible) && (
                    <g
                      className={`node-device-label ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${nodeLabelVertical(node) ? "vertical" : "horizontal"}`}
                      data-node-id={node.id}
                      data-label-owner="device"
                      transform={nodeLabelTransform(node)}
                      onPointerDown={(event) => startNodeLabelDrag(event, node)}
                    >
                      {nodeLabelVertical(node) ? (
                        nodeLabelVerticalSegments(nodeLabelText(node)).map((segment, index) => (
                          <text
                            key={`${segment.text}-${index}`}
                            className={`node-label-vertical-token ${segment.numeric ? "numeric" : ""}`}
                            x="0"
                            y={nodeLabelVerticalTokenY(index, nodeLabelVerticalSegments(nodeLabelText(node)).length, node)}
                            dominantBaseline="middle"
                            textAnchor="middle"
                            style={nodeLabelVerticalTokenStyle(node)}
                          >
                            {segment.text}
                          </text>
                        ))
                      ) : (
                        <text
                          x="0"
                          y="0"
                          dominantBaseline="middle"
                          textAnchor={nodeLabelTextAnchor(node)}
                          style={nodeLabelTextStyle(node)}
                        >
                          {nodeLabelText(node)}
                        </text>
                      )}
                      {selected && focused && selectedNodeCount === 1 && (
                        <g className="node-label-rotate-control" transform={`translate(0 ${formatSvgNumber(-nodeLabelFontSize(node) - 18)})`}>
                          <line x1="0" y1="8" x2="0" y2="0" />
                          <circle
                            cx="0"
                            cy="0"
                            r="6"
                            onPointerDown={(event) => startNodeLabelRotateDrag(event, node)}
                          >
                            <title>旋转标识</title>
                          </circle>
                        </g>
                      )}
                    </g>
                  )}
                  <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                    {node.terminals.map((terminal) => {
                      const sourceNode = connectSource ? visibleNodeById.get(connectSource.nodeId) : undefined;
                      const hideFixedTerminal = nodeIsBus || isStaticNode(node);
                      const disabled =
                        !hideFixedTerminal &&
                        mode === "connect" &&
                        Boolean(sourceNode) &&
                        !canConnectTerminals(sourceNode!, connectSource!.terminalId, node, terminal.id);
                      const overlapped = overlappedTerminalKeys.has(`${node.id}:${terminal.id}`);
                      const renderPoint = terminalRenderLocalPoint(terminal, node.size, nodeScaleX, nodeScaleY, node.kind);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY, 24, node.kind);
                      const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                      return hideFixedTerminal ? null : (
                        <g
                          key={terminal.id}
                          transform={terminalControlTransform(renderPoint.x, renderPoint.y)}
                        >
                          <line
                            className={`terminal-stub ${terminal.type} ${disabled ? "disabled" : ""}`}
                            strokeDasharray={terminalStubDashArray}
                            style={{
                              stroke: disabled ? "#cbd5e1" : terminalDisplayColor,
                              strokeWidth: terminalStubStrokeWidth(node, terminal)
                            }}
                            x1={stub.from.x}
                            y1={stub.from.y}
                            x2={stub.to.x}
                            y2={stub.to.y}
                          />
                          <circle
                            className={`terminal-dot ${terminal.type} ${overlapped ? "overlapped" : ""} ${disabled ? "disabled" : ""}`}
                            style={{ "--terminal-color": terminalDisplayColor } as CSSProperties}
                            cx="0"
                            cy="0"
                            r={overlapped ? 7.2 : 6}
                            onPointerDown={(event) => handleTerminalPointerDown(event, node, terminal.id)}
                          >
                            <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                          </circle>
                        </g>
                      );
                    })}
                  </g>
                  {selected && focused && selectedNodeCount === 1 && (
                    <g className={`transform-handles ${transformDrag && !isGroupTransformDrag(transformDrag) && transformDrag.nodeId === node.id && transformDrag.kind !== "rotate" ? "resizing" : ""}`}>
                      <line x1="0" y1={-visibleHalfHeight - rotateStemStart} x2="0" y2={-visibleHalfHeight - rotateStemEnd} />
                      <g transform={handleTransform(0, -visibleHalfHeight - rotateHandleGap)}>
                        <circle
                          className="rotate-handle"
                          cx="0"
                          cy="0"
                          r="8"
                          onPointerDown={(event) => startSingleTransformDrag(event, node, "rotate")}
                        />
                      </g>
                      {SCALE_HANDLE_CONFIGS.map((handle) => {
                        const x =
                          handle.xDirection === 0
                            ? 0
                            : handle.xDirection * (visibleHalfWidth + handleGapX);
                        const y =
                          handle.yDirection === 0
                            ? 0
                            : handle.yDirection * (visibleHalfHeight + handleGapY);
                        return (
                          <g key={handle.id} transform={handleTransform(x, y)}>
                            <rect
                              className={`scale-handle ${handle.className}`}
                              x="-8"
                              y="-8"
                              width="16"
                              height="16"
                              rx="3"
                              onPointerDown={(event) => startSingleTransformDrag(event, node, handle.kind, handle)}
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              );
            })}
            {renderGroupTransformPhotoPreview()}
            </g>
            {renderMultiNodeDragOverlay()}
            {dragPreviewEdgeRoutes.map((route) => (
              <path key={`drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
            ))}
            {terminalPressPreviewEdgeRoutes.map((route) => (
              <path key={`terminal-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
            ))}
            {connectSource && (
              <path
                ref={(element) => {
                  connectPreviewPathElementRef.current = element;
                  if (element) {
                    flushConnectPreviewDom();
                  }
                }}
                d={connectPreviewDom.path}
                className="connection-preview-line"
                style={connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined}
              />
            )}
            {connectSource && (
              <g
                ref={(element) => {
                  connectDropHintElementRef.current = element;
                  if (element) {
                    flushConnectPreviewDom();
                  }
                }}
                className="connect-drop-hint"
                transform={
                  connectPreviewDom.targetPoint
                    ? `translate(${Math.round(connectPreviewDom.targetPoint.x)} ${Math.round(connectPreviewDom.targetPoint.y)})`
                    : undefined
                }
                style={{
                  ...(connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : {}),
                  display: connectPreviewDom.targetPoint ? undefined : "none"
                }}
              >
                <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24" />
                <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16" />
                <circle className="connect-drop-hint-core" cx="0" cy="0" r="5" />
              </g>
            )}
            {activeDropHintPoint && (
              <g
                className="connect-drop-hint"
                transform={`translate(${activeDropHintPoint.x} ${activeDropHintPoint.y})`}
                style={activeDropHintStyle}
              >
                <circle className="connect-drop-hint-halo" cx="0" cy="0" r="24" />
                <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16" />
                <circle className="connect-drop-hint-core" cx="0" cy="0" r="5" />
              </g>
            )}
            {selectedRoutedEdge &&
              selectedEdge &&
              !(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id)) &&
              !(multiNodeDragging && dragOverlayEdgeIdSet.has(selectedEdge.id)) &&
              !groupTransformPreviewEdgeIdSet.has(selectedEdge.id) &&
              !terminalPressPreviewEdgeIdSet.has(selectedEdge.id) &&
              (() => {
              const edge = selectedEdge;
              const route = selectedRoutedEdge;
              const isRewiringSelectedEdge = rewiring?.edgeId === edge.id;
              const isManualPathSelectedEdge = manualPathPreviewRoute?.edgeId === edge.id;
              const routePoints = isManualPathSelectedEdge ? manualPathPreviewRoute.points : route.points;
              const displayPath = isRewiringSelectedEdge && rewiringPreviewRoute
                ? rewiringPreviewRoute.path
                : isManualPathSelectedEdge
                  ? manualPathPreviewRoute.path
                  : route.path;
              const sourcePoint = getEdgeEndpointPoint(edge, "source");
              const targetPoint = getEdgeEndpointPoint(edge, "target");
              const sourceNode = nodeById.get(edge.sourceId);
              const targetNode = nodeById.get(edge.targetId);
              const sourceBusDotPoint = sourcePoint && sourceNode && isBusNode(sourceNode) ? sourcePoint : undefined;
              const targetBusDotPoint = targetPoint && targetNode && isBusNode(targetNode) ? targetPoint : undefined;
              const movableSegmentIndexes = new Set(getMovableRouteSegmentIndexes(routePoints));
              return (
                <g className="connection-group selected topmost" style={connectionLineStyle(edge.id)}>
                  <path
                    d={displayPath}
                    className="connection-hitline"
                    onContextMenu={(event) => openEdgeContextMenu(event, edge.id, routePoints)}
                    onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)}
                    onPointerDown={(event) => handleEdgePathPointerDown(event, edge.id, routePoints)}
                  />
                  <path
                    d={displayPath}
                    className="connection-line"
                    onContextMenu={(event) => openEdgeContextMenu(event, edge.id, routePoints)}
                    onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)}
                    onPointerDown={(event) => handleEdgePathPointerDown(event, edge.id, routePoints)}
                  />
                  {!isRewiringSelectedEdge && routePoints.slice(1).map((point, index) => {
                    const from = routePoints[index];
                    const segmentIndex = index;
                    if (!movableSegmentIndexes.has(segmentIndex)) {
                      return null;
                    }
                    const orientation = from.y === point.y ? "horizontal" : "vertical";
                    return (
                      <path
                        key={`segment-${segmentIndex}`}
                        d={`M ${from.x} ${from.y} L ${point.x} ${point.y}`}
                        className={`manual-segment-handle ${orientation}`}
                        onPointerDown={(event) => startManualSegmentDrag(event, edge.id, segmentIndex, orientation, routePoints)}
                        onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)}
                        onContextMenu={(event) => openEdgeContextMenu(event, edge.id, routePoints)}
                      />
                    );
                  })}
                  {!isRewiringSelectedEdge && routePoints.slice(2, -2).map((point, index) => {
                    const routePointIndex = index + 2;
                    return (
                      <circle
                        key={`bend-${routePointIndex}`}
                        className="manual-bend-handle"
                        cx={point.x}
                        cy={point.y}
                        r={5.5}
                        onPointerDown={(event) => startManualPointDrag(event, edge.id, routePointIndex, routePoints)}
                        onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, routePoints)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteManualBendPoint(edge.id, routePointIndex, routePoints);
                        }}
                      />
                    );
                  })}
                  {renderBoundaryBusInternalConnector(sourceNode, sourceBusDotPoint, `${edge.id}-topmost-source-internal-connector`)}
                  {renderBoundaryBusInternalConnector(targetNode, targetBusDotPoint, `${edge.id}-topmost-target-internal-connector`)}
                  {sourcePoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.x : sourcePoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "source" ? rewiring.previewPoint.y : sourcePoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                  {targetPoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.x : targetPoint.x}
                      cy={rewiring?.edgeId === edge.id && rewiring.endpoint === "target" ? rewiring.previewPoint.y : targetPoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                </g>
              );
            })()}
            {nodeFloatingToolbar && (
              <g
                className="canvas-floating-toolbar-wrapper"
                transform={`matrix(${nodeFloatingToolbar.scaleX} 0 0 ${nodeFloatingToolbar.scaleY} ${nodeFloatingToolbar.x} ${nodeFloatingToolbar.y})`}
              >
                <foreignObject
                  className="canvas-floating-toolbar-object"
                  x={0}
                  y={0}
                  width={nodeFloatingToolbar.width}
                  height={nodeFloatingToolbar.height}
                >
                  <div
                    className="canvas-floating-toolbar node-toolbar"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button type="button" title="复制" aria-label="复制" onClick={copySelection}>
                      <Copy size={15} />
                    </button>
                    <button type="button" title="剪切" aria-label="剪切" onClick={cutSelection}>
                      <Scissors size={15} />
                    </button>
                    <button type="button" title="删除" aria-label="删除" onClick={deleteSelection}>
                      <Trash2 size={15} />
                    </button>
                    <button type="button" title="图层修改" aria-label="图层修改" onClick={openLayerAssignmentDialog}>
                      <Layers size={15} />
                    </button>
                    <button type="button" title="置于当前图层" aria-label="置于当前图层" onClick={() => assignSelectedNodesToModelLayer(activeLayerId)}>
                      <Layers2 size={15} />
                    </button>
                    {canGroupSelectedGraphics && (
                      <button type="button" title="组合" aria-label="组合" onClick={groupSelectedGraphics}>
                        <Group size={15} />
                      </button>
                    )}
                    {canUngroupSelectedGraphics && (
                      <button type="button" title="解散" aria-label="解散" onClick={ungroupSelectedGraphics}>
                        <Ungroup size={15} />
                      </button>
                    )}
                    {canAddTemplateFromSelection && (
                      <button type="button" title="添加模板" aria-label="添加模板" onClick={openAddTemplateDialog}>
                        <Grid2X2 size={15} />
                      </button>
                    )}
                    <button type="button" title="标识显示" aria-label="标识显示" onClick={toggleSelectedNodeLabelDisplay}>
                      <Type size={15} />
                    </button>
                  </div>
                </foreignObject>
              </g>
            )}
            {edgeFloatingToolbar && (
              <g
                className="canvas-floating-toolbar-wrapper"
                transform={`matrix(${edgeFloatingToolbar.scaleX} 0 0 ${edgeFloatingToolbar.scaleY} ${edgeFloatingToolbar.x} ${edgeFloatingToolbar.y})`}
              >
                <foreignObject
                  className="canvas-floating-toolbar-object"
                  x={0}
                  y={0}
                  width={edgeFloatingToolbar.width}
                  height={edgeFloatingToolbar.height}
                >
                  <div
                    className="canvas-floating-toolbar edge-toolbar"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button type="button" title="复制连接线" aria-label="复制连接线" onClick={copySelection}>
                      <Copy size={15} />
                    </button>
                    <button type="button" title="添加拐点" aria-label="添加拐点" onClick={addManualBendToSelectedEdgeCenter}>
                      <CircleDot size={15} />
                    </button>
                    <button type="button" title="整理连接线" aria-label="整理连接线" onClick={tidySelectedEdgeRoute}>
                      <Route size={15} />
                    </button>
                    <button type="button" title="删除连接线" aria-label="删除连接线" onClick={deleteSelection}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </foreignObject>
              </g>
            )}
            {resizeSizeHint && (
              <g className="resize-size-badge" transform={`translate(${resizeSizeHint.x} ${resizeSizeHint.y})`}>
                <rect x="-48" y="-13" width="96" height="26" rx="6" />
                <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">{resizeSizeHint.text}</text>
              </g>
            )}
            <g className="canvas-resize-handles" aria-hidden="true">
              <rect
                className="canvas-resize-handle canvas-resize-handle-right"
                x={canvasWidth - CANVAS_RESIZE_HANDLE_SIZE / 2}
                y={0}
                width={CANVAS_RESIZE_HANDLE_SIZE}
                height={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasHeight - CANVAS_RESIZE_HANDLE_SIZE)}
                onPointerDown={(event) => startCanvasResize(event, "right")}
              />
              <rect
                className="canvas-resize-handle canvas-resize-handle-bottom"
                x={0}
                y={canvasHeight - CANVAS_RESIZE_HANDLE_SIZE / 2}
                width={Math.max(CANVAS_RESIZE_HANDLE_SIZE, canvasWidth - CANVAS_RESIZE_HANDLE_SIZE)}
                height={CANVAS_RESIZE_HANDLE_SIZE}
                onPointerDown={(event) => startCanvasResize(event, "bottom")}
              />
              <rect
                className="canvas-resize-handle canvas-resize-handle-corner"
                x={canvasWidth - CANVAS_RESIZE_HANDLE_SIZE}
                y={canvasHeight - CANVAS_RESIZE_HANDLE_SIZE}
                width={CANVAS_RESIZE_HANDLE_SIZE}
                height={CANVAS_RESIZE_HANDLE_SIZE}
                onPointerDown={(event) => startCanvasResize(event, "corner")}
              />
            </g>
          </svg>
        </section>
        <div
          className="viewport-overlay"
          style={viewportOverlayStyle}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="viewport-controls" role="group" aria-label="视口控制">
            <button type="button" title="适配视图" aria-label="适配视图" onClick={fitViewToContent}>
              <Maximize2 size={16} />
            </button>
            <button type="button" title="居中选中" aria-label="居中选中" disabled={!selectedCanvasBounds} onClick={centerSelectedInView}>
              <LocateFixed size={16} />
            </button>
            <button type="button" title="缩放到选中区域" aria-label="缩放到选中区域" disabled={!selectedCanvasBounds} onClick={fitViewToSelection}>
              <ScanSearch size={16} />
            </button>
            <button type="button" title="放大" aria-label="放大" onClick={() => zoomViewportAtCenter(0.82)}>
              <Plus size={16} />
            </button>
            <button type="button" title="缩小" aria-label="缩小" onClick={() => zoomViewportAtCenter(1.18)}>
              <Minus size={16} />
            </button>
            <button type="button" title="重置缩放" aria-label="重置缩放" onClick={resetViewport}>
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className={minimapVisible ? "active" : ""}
              title={minimapVisible ? "隐藏小地图" : "显示小地图"}
              aria-label={minimapVisible ? "隐藏小地图" : "显示小地图"}
              onClick={() => setMinimapVisible((current) => !current)}
            >
              <MapIcon size={16} />
            </button>
          </div>
          {minimapVisible && (
            <div className="canvas-minimap" aria-label="鸟瞰导航">
              <svg
                viewBox={`0 0 ${CANVAS_MINIMAP_WIDTH} ${CANVAS_MINIMAP_HEIGHT}`}
                onPointerDown={(event) => {
                  handleMinimapNavigate(event);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (event.buttons & 1) {
                    handleMinimapNavigate(event);
                  }
                }}
              >
                <rect
                  className="minimap-canvas"
                  x={minimapOffsetX}
                  y={minimapOffsetY}
                  width={minimapContentWidth}
                  height={minimapContentHeight}
                />
                {minimapRoutes.map((route) => (
                  <polyline
                    key={`minimap-route-${route.edgeId}`}
                    className="minimap-route"
                    points={route.points.map(mapPointToMinimap).map((point) => `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`).join(" ")}
                  />
                ))}
                {minimapNodes.map((node) => {
                  const center = mapPointToMinimap(node.position);
                  const width = Math.max(1.8, Math.abs(getNodeScaleX(node)) * node.size.width * minimapScale);
                  const height = Math.max(1.8, Math.abs(getNodeScaleY(node)) * node.size.height * minimapScale);
                  return (
                    <rect
                      key={`minimap-node-${node.id}`}
                      className={`minimap-node ${selectedNodeIdSet.has(node.id) ? "selected" : ""}`}
                      x={center.x - width / 2}
                      y={center.y - height / 2}
                      width={width}
                      height={height}
                      rx="1"
                    />
                  );
                })}
                <rect
                  className="minimap-viewport"
                  x={minimapViewportLeft}
                  y={minimapViewportTop}
                  width={Math.max(4, minimapViewportRight - minimapViewportLeft)}
                  height={Math.max(4, minimapViewportBottom - minimapViewportTop)}
                />
              </svg>
            </div>
          )}
        </div>
        <footer className="bottom-statusbar" aria-label="运行状态">
          <div
            className="statusbar-resize-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整提示信息栏高度"
            title="拖拽调整提示信息栏高度"
            onPointerDown={startStatusbarResize}
          />
          <span className="status-pill">
            坐标 <span ref={mousePositionTextRef}>X:- Y:-</span>
          </span>
          <span className="status-pill" title={`当前视图缩放比 ${currentZoomPercent}%`}>
            缩放 {currentZoomPercent}%
          </span>
          <span className={`status-pill topology-${topologyStatus.state}`} title={topologyStatus.message}>
            拓扑 {topologyStatus.message}
          </span>
          <span className={`status-pill warning-${topologyErrors.length > 0 ? "active" : "idle"}`} title={warningStatusTitle}>
            {warningStatusText}
          </span>
          <span className="status-pill status-log" title={operationLog}>
            日志 {operationLog}
          </span>
          <span className="status-pill">
            <Grid2X2 size={15} />
            元件 {nodes.length}
          </span>
          <span className="status-pill">联络线 {edges.length}</span>
          <span className="status-pill">选中 {selectedCount}</span>
          {saveRequired && <strong>未保存</strong>}
          {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
          {mode === "static-draw" && <strong>点击落点，双击或 Enter 完成，Esc 取消</strong>}
        </footer>
      </main>

      <aside
        className={`inspector-panel floating-side-panel ${rightPanelVisible ? "visible" : "hidden"}`}
        onPointerEnter={() => updateAutoPanelVisibility("right", "panel-enter")}
        onPointerLeave={() => updateAutoPanelVisibility("right", "panel-leave")}
      >
        <div
          className="side-panel-resize-handle left-edge"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整右侧栏宽度"
          title="拖拽调整右侧栏宽度"
          onPointerDown={(event) => startSidePanelResize(event, "right")}
        />
        <div className="inspector-title">
          <div className="inspector-title-actions">
            {renderSidePanelModeControls("right")}
          </div>
        </div>
        {inspectorSelectedNode || currentModelRecord ? (
          <div className={`form-stack ${inspectorTab === "graph" ? "graph-form-stack" : ""}`}>
            <div className="inspector-tabs">
              <button className={inspectorTab === "model" ? "active" : ""} onClick={() => setInspectorTab("model")} disabled={!currentModelRecord}>
                基础
              </button>
              <button className={inspectorTab === "graph" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图元
              </button>
              <button className={inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("device")}>
                设备
              </button>
            </div>
            {inspectorTab === "model" && currentModelRecord ? (
              <table className="param-table">
                <tbody>
                  <tr>
                    {renderChineseParamHeader("name", "模型名称")}
                    <td><input value={currentModelRecord.name} readOnly /></td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("schemeName")}
                    <td><input value={selectedSchemeRecord?.name ?? "未选择方案"} readOnly /></td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("updatedAt", "模型更新时间")}
                    <td><input value={new Date(currentModelRecord.updatedAt).toLocaleString()} readOnly /></td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasWidth")}
                    <td>
                      <input
                        type="number"
                        min={MIN_CANVAS_WIDTH}
                        max={MAX_CANVAS_WIDTH}
                        step="10"
                        value={canvasSizeDraft.width}
                        onChange={(event) => setCanvasSizeDraft((current) => ({ ...current, width: event.target.value }))}
                        onBlur={handleCanvasSizeBlur}
                        onKeyDown={handleCanvasSizeKeyDown}
                      />
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasHeight")}
                    <td>
                      <input
                        type="number"
                        min={MIN_CANVAS_HEIGHT}
                        max={MAX_CANVAS_HEIGHT}
                        step="10"
                        value={canvasSizeDraft.height}
                        onChange={(event) => setCanvasSizeDraft((current) => ({ ...current, height: event.target.value }))}
                        onBlur={handleCanvasSizeBlur}
                        onKeyDown={handleCanvasSizeKeyDown}
                      />
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasBackgroundColor")}
                    <td>
                      <div className="color-field with-clear">
                        <input
                          type="color"
                          value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            setCanvasBackgroundColor(event.target.value);
                          }}
                        />
                        <input
                          value={canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            setCanvasBackgroundColor(event.target.value || DEFAULT_CANVAS_BACKGROUND);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            pushUndoSnapshot();
                            setCanvasBackgroundColor("");
                          }}
                          disabled={!canvasBackgroundColor || canvasBackgroundColor === DEFAULT_CANVAS_BACKGROUND}
                        >
                          删除背景色
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("canvasBackgroundImage")}
                    <td>
                      <div className="image-field-actions">
                        <input value={canvasBackgroundImage ? "已设置" : "未设置"} readOnly />
                        <button type="button" onClick={() => setImageTarget({ kind: "canvas" })}>选择</button>
                        <button
                          type="button"
                          onClick={() => {
                            pushUndoSnapshot();
                            setCanvasBackgroundImage("");
                            setCanvasBackgroundImageAssetId("");
                          }}
                          disabled={!canvasBackgroundImage}
                        >
                          清除
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("powerUnit")}
                    <td>
                      <select
                        value={powerUnit}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setPowerUnit(event.target.value);
                        }}
                      >
                        {POWER_UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("voltageUnit")}
                    <td>
                      <select
                        value={voltageUnit}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setVoltageUnit(event.target.value);
                        }}
                      >
                        {VOLTAGE_UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("currentUnit")}
                    <td>
                      <select
                        value={currentUnit}
                        onChange={(event) => {
                          pushUndoSnapshot();
                          setCurrentUnit(event.target.value);
                        }}
                      >
                        {CURRENT_UNIT_OPTIONS.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    {renderChineseParamHeader("powerBaseValue")}
                    <td>
                      <div className="unit-value-field">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={powerBaseValue}
                          onChange={(event) => {
                            pushUndoSnapshot();
                            const nextValue = Number(event.target.value);
                            setPowerBaseValue(Number.isFinite(nextValue) ? nextValue : DEFAULT_POWER_BASE_VALUE);
                          }}
                        />
                        <span>{powerUnit}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : inspectorTab === "graph" ? (
              <div className="graph-info-panel">
                <div className="graph-info-toolbar" role="tablist" aria-label="图元信息子页面">
                  <button
                    type="button"
                    className={graphInfoView === "selected" ? "active" : ""}
                    onClick={() => setGraphInfoView("selected")}
                    role="tab"
                    aria-selected={graphInfoView === "selected"}
                    disabled={!inspectorSelectedNode}
                  >
                    选中图元
                  </button>
                  <button
                    type="button"
                    className={graphInfoView === "tree" ? "active" : ""}
                    onClick={() => setGraphInfoView("tree")}
                    role="tab"
                    aria-selected={graphInfoView === "tree"}
                  >
                    图元树
                  </button>
                </div>
                {graphInfoView === "tree" ? (
                  renderElementTreePanel()
                ) : inspectorSelectedNode ? (
                  <div className="graph-param-table-wrap">
                  <table className="param-table">
                  <tbody>
                    <tr>
                      {renderChineseParamHeader("graph_x", "X坐标")}
                      <td><input type="number" value={Math.round(inspectorSelectedNode.position.x)} onChange={(event) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, x: Number(event.target.value) } })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("graph_y", "Y坐标")}
                      <td><input type="number" value={Math.round(inspectorSelectedNode.position.y)} onChange={(event) => updateSelectedNode({ position: { ...inspectorSelectedNode.position, y: Number(event.target.value) } })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("rotation")}
                      <td><input type="number" value={inspectorSelectedNode.rotation} onChange={(event) => updateSelectedNode({ rotation: Number(event.target.value) })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("scaleX")}
                      <td><input type="number" step="0.1" value={getNodeScaleX(inspectorSelectedNode)} onChange={(event) => {
                        const scaleX = normalizeScale(Number(event.target.value), getNodeScaleX(inspectorSelectedNode));
                        const scaleY = getNodeScaleY(inspectorSelectedNode);
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(scaleY)), scaleX, scaleY });
                      }} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("scaleY")}
                      <td><input type="number" step="0.1" value={getNodeScaleY(inspectorSelectedNode)} onChange={(event) => {
                        const scaleY = normalizeScale(Number(event.target.value), getNodeScaleY(inspectorSelectedNode));
                        const scaleX = getNodeScaleX(inspectorSelectedNode);
                        updateSelectedNode({ scale: Math.max(Math.abs(scaleX), Math.abs(scaleY)), scaleX, scaleY });
                      }} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("layerId", "所属图层")}
                      <td>
                        <select
                          value={inspectorSelectedNode.layerId ?? DEFAULT_MODEL_LAYER_ID}
                          onChange={(event) => updateSelectedNode({ layerId: event.target.value })}
                        >
                          {layers.map((layer) => (
                            <option key={layer.id} value={layer.id}>{layer.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {!isStaticNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("_labelDisplayMode")}
                          <td>
                            <select
                              value={nodeLabelDisplayMode(inspectorSelectedNode)}
                              onChange={(event) => updateParam("_labelDisplayMode", event.target.value)}
                            >
                              <option value="always">始终显示</option>
                              <option value="hidden">始终隐藏</option>
                              <option value="follow">跟随显示</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelText")}
                          <td>
                            <input
                              value={inspectorSelectedNode.params._labelText ?? inspectorSelectedNode.name}
                              onChange={(event) => updateParam("_labelText", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelColor")}
                          <td>{renderColorEditor("_labelColor", inspectorSelectedNode.params._labelColor || "#334155", "#334155")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelFontFamily")}
                          <td>{renderParamEditor("_labelFontFamily", inspectorSelectedNode.params._labelFontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelFontSize")}
                          <td>
                            <input
                              type="number"
                              min="6"
                              max="96"
                              value={inspectorSelectedNode.params._labelFontSize || "14"}
                              onChange={(event) => updateParam("_labelFontSize", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelRotation")}
                          <td>
                            <select
                              value={String(normalizeNodeLabelRotation(inspectorSelectedNode.params._labelRotation))}
                              onChange={(event) => updateParam("_labelRotation", String(normalizeNodeLabelRotation(event.target.value)))}
                            >
                              <option value="0">0° 横排</option>
                              <option value="90">90° 纵排</option>
                              <option value="180">180° 横排</option>
                              <option value="270">270° 纵排</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>标识样式</th>
                          <td>
                            <div className="device-label-style-actions">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={(inspectorSelectedNode.params._labelFontWeight || "500") !== "400"}
                                  onChange={(event) => updateParam("_labelFontWeight", event.target.checked ? "700" : "400")}
                                />
                                加粗
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={(inspectorSelectedNode.params._labelFontStyle || "normal") === "italic"}
                                  onChange={(event) => updateParam("_labelFontStyle", event.target.checked ? "italic" : "normal")}
                                />
                                斜体
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={(inspectorSelectedNode.params._labelTextDecoration || "none") === "underline"}
                                  onChange={(event) => updateParam("_labelTextDecoration", event.target.checked ? "underline" : "none")}
                                />
                                下划线
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelTextAnchor")}
                          <td>
                            <select
                              value={nodeLabelTextAnchor(inspectorSelectedNode)}
                              onChange={(event) => updateParam("_labelTextAnchor", event.target.value)}
                            >
                              <option value="start">左对齐</option>
                              <option value="middle">居中</option>
                              <option value="end">右对齐</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelX")}
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={nodeLabelOffset(inspectorSelectedNode).x}
                              onChange={(event) => updateParam("_labelX", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("_labelY")}
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={nodeLabelOffset(inspectorSelectedNode).y}
                              onChange={(event) => updateParam("_labelY", event.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("terminalCount")}
                          <td>
                            <span
                              className="graph-readonly-value"
                              title={isBusNode(inspectorSelectedNode) ? "母线端子数量由已连接联络线端点数自动生成" : "端子数量由元件定义决定"}
                            >
                              {inspectorSelectedNode.terminals.length}
                            </span>
                          </td>
                        </tr>
                        {inspectorSelectedNode.terminals.map((terminal, terminalIndex) => (
                          <Fragment key={terminal.id}>
                            <tr>
                              <th title={terminal.id}>{terminal.label}</th>
                              <td>{`${terminal.type.toUpperCase()} / ${terminal.nodeNumber}`}</td>
                            </tr>
                            {(terminal.type === "ac" || terminal.type === "dc") && (
                              <tr>
                                <th title={`${terminal.id}:vbase`}>{`${terminal.label}电压基值`}</th>
                                <td>
                                  <div className="unit-value-field">
                                    <input
                                      inputMode="decimal"
                                      value={terminalVoltageBaseNumber(terminal.vbase ?? terminalVbaseFallback(inspectorSelectedNode, terminalIndex))}
                                      onChange={(event) => updateTerminalVbase(terminal.id, event.target.value)}
                                    />
                                    <span>{voltageUnit}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </>
                    )}
                    {isStaticNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("text")}
                          <td><textarea rows={4} value={inspectorSelectedNode.params.text || ""} onChange={(event) => updateParam("text", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("fontFamily")}
                          <td>{renderParamEditor("fontFamily", inspectorSelectedNode.params.fontFamily || "Arial", false)}</td>
                        </tr>
                        <tr>
                          <th>文字样式</th>
                          <td>
                            <div className="text-style-actions">
                              <label>
                                <input type="checkbox" checked={(inspectorSelectedNode.params.fontWeight || "400") !== "400"} onChange={(event) => updateParam("fontWeight", event.target.checked ? "700" : "400")} />
                                加粗
                              </label>
                              <label>
                                <input type="checkbox" checked={(inspectorSelectedNode.params.fontStyle || "normal") === "italic"} onChange={(event) => updateParam("fontStyle", event.target.checked ? "italic" : "normal")} />
                                斜体
                              </label>
                              <label>
                                <input type="checkbox" checked={(inspectorSelectedNode.params.textDecoration || "none") === "underline"} onChange={(event) => updateParam("textDecoration", event.target.checked ? "underline" : "none")} />
                                下划线
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("fillColor")}
                          <td>{renderColorEditor("fillColor", inspectorSelectedNode.params.fillColor || "transparent", "#ffffff")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("strokeColor")}
                          <td>{renderColorEditor("strokeColor", inspectorSelectedNode.params.strokeColor || "transparent", "#334155")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("textColor")}
                          <td>{renderColorEditor("textColor", inspectorSelectedNode.params.textColor || "#111827", "#111827")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("lineWidth")}
                          <td><input type="number" min="0" max="20" value={inspectorSelectedNode.params.lineWidth || "2"} onChange={(event) => updateParam("lineWidth", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("strokeStyle")}
                          <td>{renderParamEditor("strokeStyle", inspectorSelectedNode.params.strokeStyle || "solid", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("cornerRadius")}
                          <td><input type="number" min="0" max="999" value={inspectorSelectedNode.params.cornerRadius || "8"} onChange={(event) => updateParam("cornerRadius", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("accentColor")}
                          <td>{renderColorEditor("accentColor", inspectorSelectedNode.params.accentColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("shadowEnabled")}
                          <td>{renderParamEditor("shadowEnabled", inspectorSelectedNode.params.shadowEnabled || "0", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("padding")}
                          <td><input type="number" min="0" max="120" value={inspectorSelectedNode.params.padding || "12"} onChange={(event) => updateParam("padding", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("textAlign")}
                          <td>{renderParamEditor("textAlign", inspectorSelectedNode.params.textAlign || "center", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("verticalAlign")}
                          <td>{renderParamEditor("verticalAlign", inspectorSelectedNode.params.verticalAlign || "middle", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("markerStart")}
                          <td>{renderParamEditor("markerStart", inspectorSelectedNode.params.markerStart || "none", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("markerEnd")}
                          <td>{renderParamEditor("markerEnd", inspectorSelectedNode.params.markerEnd || "none", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("arrowSize")}
                          <td><input type="number" min="4" max="80" value={inspectorSelectedNode.params.arrowSize || "10"} onChange={(event) => updateParam("arrowSize", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("handleColor")}
                          <td>{renderColorEditor("handleColor", inspectorSelectedNode.params.handleColor || "#2563eb", "#2563eb")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("handleSize")}
                          <td><input type="number" min="3" max="40" value={inspectorSelectedNode.params.handleSize || "8"} onChange={(event) => updateParam("handleSize", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("fontSize")}
                          <td><input type="number" min="8" max="160" value={inspectorSelectedNode.params.fontSize || "24"} onChange={(event) => updateParam("fontSize", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("backgroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={inspectorSelectedNode.params.backgroundImage ? "已设置" : "未设置"} readOnly />
                              <button type="button" onClick={() => setImageTarget({ kind: "node", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "background")} disabled={!inspectorSelectedNode.params.backgroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                    {!isStaticNode(inspectorSelectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("foregroundColor")}
                          <td>{renderColorEditor("foregroundColor", inspectorSelectedNode.params.foregroundColor || "", terminalColor(inspectorSelectedNode.terminals[0]?.type, colorPalette))}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("foregroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={inspectorSelectedNode.params.foregroundImage ? "已设置" : "未设置"} readOnly />
                              <button type="button" onClick={() => setImageTarget({ kind: "nodeForeground", nodeId: inspectorSelectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(inspectorSelectedNode.id, "foreground")} disabled={!inspectorSelectedNode.params.foregroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                    </tbody>
                  </table>
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <FileJson size={24} />
                    <p>当前没有被选中图元。</p>
                  </div>
                )}
              </div>
            ) : inspectorSelectedNode ? (
              <div className="device-param-stack">
                {selectedContainerParameterViews.length > 0 && (
                  <div className="container-param-tabs" role="tablist" aria-label="容器设备参数切换">
                    {selectedContainerParameterViews.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        className={selectedContainerParameterView?.id === view.id ? "active" : ""}
                        onClick={() => setContainerParamViewId(view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                )}
                {selectedContainerParameterView ? (
                  <table className="param-table">
                    <tbody>
                      {selectedContainerParameterView.rows.map((row) => {
                        const options = paramOptionsForSection(row.key, selectedContainerParameterView.componentType);
                        return (
                          <tr key={row.key}>
                            {renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}
                            <td>
                              {row.key === "name" && selectedContainerParameterView.kind === "container" ? (
                                <input value={inspectorSelectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
                              ) : row.readonly || !row.paramKey ? (
                                <input value={row.value} readOnly />
                              ) : options ? (
                                <select value={row.value} onChange={(event) => updateParam(row.paramKey!, event.target.value)}>
                                  {options.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input value={row.value} onChange={(event) => updateParam(row.paramKey!, event.target.value)} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="param-table">
                    <tbody>
                      {(() => {
                        const eKeys = getEParameterKeys(inspectorSelectedNode.kind, inspectorSelectedNode.params);
                        const customDefinitions = parseCustomDefinitions(inspectorSelectedNode.params);
                        const customKeys = customDefinitions.map((definition) => definition.enName);
                        const customExtraKeys = customKeys.filter((key) => !eKeys.includes(key));
                        const keys =
                          eKeys.length > 0
                            ? [...eKeys, ...customExtraKeys]
                            : customKeys.length > 0
                              ? customKeys
                              : Object.keys(inspectorSelectedNode.params).filter((key) => !key.startsWith("_") && key !== "is_container");
                        const readonlyKeys = new Set(customDefinitions.filter((definition) => definition.readonly).map((definition) => definition.enName));
                        return keys.map((key) => {
                          const value = eKeys.length > 0 ? getEParamValue(key, inspectorSelectedNode) : key === "name" ? inspectorSelectedNode.name : inspectorSelectedNode.params[key] ?? "";
                          const definition = customDefinitions.find((item) => item.enName === key);
                          return (
                            <tr key={key}>
                              {renderParamHeader(key, key, definition?.cnName ?? PARAM_LABELS[key] ?? key)}
                              <td>
                                {key === "name" ? (
                                  <input value={inspectorSelectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
                                ) : READONLY_E_PARAM_KEYS.has(key) || readonlyKeys.has(key) ? (
                                  <input value={value} readOnly />
                                ) : (
                                  renderParamEditor(key, value, false)
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <FileJson size={28} />
                <p>选择画布设备后，可切换查看图元和设备。</p>
              </div>
            )}
            {inspectorSelectedNode && inspectorTab === "graph" && graphInfoView === "selected" && (
              <div className="topology-card">
                <span>连接度</span>
                <strong>{topology.nodes[inspectorSelectedNode.id]?.degree ?? 0}</strong>
                <small>
                  {(topology.nodes[inspectorSelectedNode.id]?.neighbors ?? [])
                    .map((id) => nodeById.get(id)?.name)
                    .filter(Boolean)
                    .join("、") || "暂无相邻元件"}
                </small>
              </div>
            )}
          </div>
        ) : inspectorSelectedEdge ? (
          <div className="form-stack">
            <div className="topology-card">
              <span>联络线</span>
              <strong>{inspectorSelectedEdge.id}</strong>
              <small>
                {(nodeById.get(inspectorSelectedEdge.sourceId)?.name ?? "未知设备") +
                  " -> " +
                  (nodeById.get(inspectorSelectedEdge.targetId)?.name ?? "未知设备")}
              </small>
            </div>
            <div className="empty-state">
              <Cable size={28} />
              <p>拖拽线两端的圆形控制点到其他同类型端子，可调整联络线首端或末端。</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Save size={28} />
            <p>从左侧拖入元件，或使用联络线模式点击两个元件建立拓扑关系。</p>
          </div>
        )}
        {inspectorTopologyErrors.length > 0 && (
          <section className="validation-panel">
            <div
              className="validation-panel-resize-handle"
              role="separator"
              aria-orientation="horizontal"
              title="拖拽调整拓扑告警栏高度"
              onPointerDown={startValidationPanelResize}
            />
            <div className="validation-panel-title">
              <h2>拓扑告警</h2>
              <span>{inspectorTopologyErrors.length} 条</span>
            </div>
            <div className="validation-list">
              {visibleTopologyErrors.map((error) => (
                <button key={error.id} onClick={() => locateTopologyError(error)} onDoubleClick={() => locateTopologyError(error)}>
                  <span>{topologyWarningDisplayMessage(error.message)}</span>
                </button>
              ))}
            </div>
            {inspectorTopologyErrors.length > TOPOLOGY_WARNING_PAGE_SIZE && (
              <div className="validation-pagination">
                <button
                  type="button"
                  onClick={() => setTopologyWarningPage((current) => Math.max(0, current - 1))}
                  disabled={normalizedTopologyWarningPage === 0}
                >
                  上一页
                </button>
                <span>
                  {normalizedTopologyWarningPage + 1} / {topologyWarningPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setTopologyWarningPage((current) => Math.min(topologyWarningPageCount - 1, current + 1))}
                  disabled={normalizedTopologyWarningPage >= topologyWarningPageCount - 1}
                >
                  下一页
                </button>
              </div>
            )}
            {hiddenTopologyErrorCount > 0 && (
              <p className="validation-more">每页显示 {TOPOLOGY_WARNING_PAGE_SIZE} 条告警，请分页处理或重新拓扑。</p>
            )}
          </section>
        )}
      </aside>
      {contextMenu && (
        <div className="context-menu" style={contextMenuStyle(contextMenu)}>
          {undoStack.length > 0 && (
            <button onClick={() => runContextMenuAction(undoLastOperation)}>
              <Undo2 size={14} />
              撤销
            </button>
          )}
          {contextMenuForSelection && contextSelectionCount > 0 && (
            <button onClick={() => runContextMenuAction(copySelection)}>
              <Copy size={14} />
              复制
            </button>
          )}
          {contextMenuForSelection && contextSelectionCount > 0 && (
            <button onClick={() => runContextMenuAction(cutSelection)}>
              <Scissors size={14} />
              剪切
            </button>
          )}
          {saveRequired && (
            <button onClick={() => runContextMenuAction(() => saveCurrentProject())}>
              <Save size={14} />
              保存
            </button>
          )}
          {(canvasClipboard.nodes.length > 0 || canvasClipboard.edges.length > 0) && (
            <button onClick={() => runContextMenuAction(pasteSelection)}>
              <FileInput size={14} />
              粘贴
            </button>
          )}
          {contextMenuForEdge && selectedEdge && (
            <button onClick={() => runContextMenuAction(tidySelectedEdgeRoute)}>
              <Route size={14} />
              整理连接线
            </button>
          )}
          {contextMenuForEdge && contextMenu.edgeId && (
            <button onClick={() => runContextMenuAction(addManualBendFromContextMenu)}>
              <Pencil size={14} />
              添加拐点
            </button>
          )}
          {contextMenuForNode && canGroupSelectedGraphics && (
            <button onClick={() => runContextMenuAction(groupSelectedGraphics)}>
              <Group size={14} />
              组合
            </button>
          )}
          {contextMenuForNode && canUngroupSelectedGraphics && (
            <button onClick={() => runContextMenuAction(ungroupSelectedGraphics)}>
              <Ungroup size={14} />
              解散
            </button>
          )}
          {contextMenuForNode && canAddTemplateFromSelection && (
            <button onClick={() => runContextMenuAction(openAddTemplateDialog)}>
              <Grid2X2 size={14} />
              添加模板
            </button>
          )}
          {contextMenuForNode && activeSelectedNodeIds.length > 0 && (
            <button onClick={() => runContextMenuAction(openLayerAssignmentDialog)}>
              <Layers size={14} />
              图层修改
            </button>
          )}
          {contextMenuForNode && activeSelectedNodeIds.length > 0 && (
            <div className="context-menu-submenu">
              <button type="button" className="context-menu-submenu-trigger">
                <Type size={14} />
                标识显示
                <ChevronRight size={14} />
              </button>
              <div className="context-menu-submenu-panel">
                <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("always"))}>
                  <Type size={14} />
                  标识始终显示
                </button>
                <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("hidden"))}>
                  <Type size={14} />
                  标识始终隐藏
                </button>
                <button onClick={() => runContextMenuAction(() => setSelectedNodeLabelDisplayMode("follow"))}>
                  <Type size={14} />
                  标识跟随显示
                </button>
              </div>
            </div>
          )}
          {contextMenuForSelection && contextSelectionCount > 0 && (
            <button onClick={() => runContextMenuAction(deleteSelection)}>
              <Trash2 size={14} />
              删除
            </button>
          )}
        </div>
      )}
      {projectMenu && (
        <div className="context-menu" style={contextMenuStyle(projectMenu)}>
          {projectMenu.projectId && (
            <>
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) deleteProjectRecord(project);
                })}
              >
                <Trash2 size={14} />
                模型删除
              </button>
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) void exportProjectRecordFile(project);
                })}
              >
                <Download size={14} />
                模型导出
              </button>
              <button
                onClick={() => runContextMenuAction(() => openModelImportFilePicker(projectMenu.schemeId))}
              >
                <FileInput size={14} />
                模型导入
              </button>
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) renameProjectRecord(project);
                })}
              >
                <Pencil size={14} />
                模型重命名
              </button>
              <button
                onClick={() => runContextMenuAction(() => {
                  const project = projectById.get(projectMenu.projectId ?? "");
                  if (project) copyProjectRecord(project);
                })}
              >
                <Copy size={14} />
                模型复制
              </button>
              {recordClipboard?.kind === "project" && projectMenu.projectId && (
                <button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId))}>
                  <FileInput size={14} />
                  模型粘贴
                </button>
              )}
            </>
          )}
          {!projectMenu.projectId && projectMenu.schemeId && (
            <>
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
                  if (scheme) deleteSchemeRecord(scheme);
                })}
              >
                <Trash2 size={14} />
                方案删除
              </button>
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
                  if (scheme) void exportSchemeRecord(scheme);
                })}
              >
                <Download size={14} />
                方案导出
              </button>
              <button onClick={() => runContextMenuAction(openSchemeImportFilePicker)}>
                <FileInput size={14} />
                方案导入
              </button>
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
                  if (scheme) renameSchemeRecord(scheme);
                })}
              >
                <Pencil size={14} />
                方案重命名
              </button>
              <button
                onClick={() => runContextMenuAction(() => {
                  const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
                  if (scheme) copySchemeRecord(scheme);
                })}
              >
                <Copy size={14} />
                方案复制
              </button>
              {recordClipboard?.kind === "project" && projectMenu.schemeId && (
                <button onClick={() => runContextMenuAction(() => pasteProjectClipboardRecord(projectMenu.schemeId))}>
                  <FileInput size={14} />
                  模型粘贴
                </button>
              )}
              {recordClipboard?.kind === "scheme" && (
                <button onClick={() => runContextMenuAction(pasteSchemeClipboardRecord)}>
                  <FileInput size={14} />
                  方案粘贴
                </button>
              )}
            </>
          )}
          {!projectMenu.projectId && !projectMenu.schemeId && (
            <>
              <button onClick={() => runContextMenuAction(createSchemeRecord)}>
                <FolderOpen size={14} />
                方案新增
              </button>
              {recordClipboard?.kind === "scheme" && (
                <button onClick={() => runContextMenuAction(pasteSchemeClipboardRecord)}>
                  <FileInput size={14} />
                  方案粘贴
                </button>
              )}
              <button onClick={() => runContextMenuAction(openSchemeImportFilePicker)}>
                <FileInput size={14} />
                方案导入
              </button>
            </>
          )}
        </div>
      )}
      {pendingRecordPasteConflict && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveRecordPasteConflict("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="record-paste-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="record-paste-conflict-title">名称重复</h2>
                <p>
                  当前{pendingRecordPasteConflict.kind === "scheme" ? "模型库" : "方案"}中已存在“{pendingRecordPasteConflict.duplicateName}”。请选择{pendingRecordPasteConflict.kind === "project-drag" ? "拖拽" : "粘贴"}处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveRecordPasteConflict("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("rename")}>新命名</button>
              <button type="button" onClick={() => resolveRecordPasteConflict("cancel")}>{pendingRecordPasteConflict.kind === "project-drag" ? "取消拖拽" : "取消粘贴"}</button>
            </div>
          </section>
        </div>
      )}
      {pendingModelImportConflict && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateModelImport("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="model-import-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="model-import-conflict-title">模型名称重复</h2>
                <p>
                  当前方案中已存在模型“{pendingModelImportConflict.duplicateProjectName}”。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateModelImport("overwrite")}>覆盖</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("rename")}>重命名</button>
              <button type="button" onClick={() => resolveDuplicateModelImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>
      )}
      {pendingSchemeImportConflict && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveDuplicateSchemeImport("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="scheme-import-conflict-title">
            <div className="image-picker-title">
              <div>
                <h2 id="scheme-import-conflict-title">方案名称重复</h2>
                <p>
                  当前模型库中已存在方案“{pendingSchemeImportConflict.duplicateSchemeName}”。请选择导入处理方式。
                </p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveDuplicateSchemeImport("merge")}>合并覆盖</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("rename")}>重新命名</button>
              <button type="button" onClick={() => resolveDuplicateSchemeImport("cancel")}>不导入</button>
            </div>
          </section>
        </div>
      )}
      {pendingUnsavedAction && (
        <div className="image-picker-backdrop" onPointerDown={() => resolveUnsavedChangeAction("cancel")}>
          <section className="unsaved-change-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unsaved-change-title">
            <div className="image-picker-title">
              <div>
                <h2 id="unsaved-change-title">当前模型尚未保存</h2>
                <p>当前模型“{projectName}”存在未保存修改。{pendingUnsavedAction.label}之前，请选择如何处理这些修改。</p>
              </div>
            </div>
            <div className="unsaved-change-actions">
              <button type="button" onClick={() => resolveUnsavedChangeAction("discard")}>不保存继续切换/关闭</button>
              <button type="button" onClick={() => resolveUnsavedChangeAction("save")}>保存后切换/关闭</button>
              <button type="button" onClick={() => resolveUnsavedChangeAction("cancel")}>退出操作</button>
            </div>
            <p className="unsaved-change-note">关闭网页时，浏览器也会在离开前提示当前模型未保存。</p>
          </section>
        </div>
      )}
      {templateDialog && (
        <div className="image-picker-backdrop" onPointerDown={cancelTemplateDialog}>
          <section className="template-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
            <div className="image-picker-title">
              <div>
                <h2 id="template-dialog-title">添加模板</h2>
                <p>将当前选中的图元组合保存到模板库，后续可按原始尺寸拖拽生成。</p>
              </div>
              <button type="button" onClick={cancelTemplateDialog}>关闭</button>
            </div>
            <div className="template-dialog-grid">
              <div className="template-dialog-preview">
                {renderGraphTemplatePreview({
                  id: "template-dialog-preview",
                  typeName: templateDraftType,
                  name: templateDraftName || "新模板",
                  sourceSize: templateDialog.sourceSize,
                  clipboard: templateDialog.clipboard,
                  createdAt: "",
                  updatedAt: ""
                })}
                <small>真实尺寸：{templateDialog.sourceSize.width}×{templateDialog.sourceSize.height}</small>
              </div>
              <div className="template-dialog-fields">
                <label>
                  <span>模板类型</span>
                  <div className="template-type-row">
                    <select value={templateDraftType} onChange={(event) => setTemplateDraftType(event.target.value)}>
                      {graphTemplateTypes.map((typeName) => (
                        <option key={typeName} value={typeName}>{typeName}</option>
                      ))}
                    </select>
                    <button type="button" onClick={createGraphTemplateType}>新增模板类型</button>
                  </div>
                </label>
                <label>
                  <span>模板名字</span>
                  <input
                    value={templateDraftName}
                    onChange={(event) => setTemplateDraftName(event.target.value)}
                    placeholder="请输入模板名字"
                    autoFocus
                  />
                </label>
              </div>
            </div>
            <div className="template-dialog-actions">
              <button type="button" onClick={cancelTemplateDialog}>取消</button>
              <button type="button" onClick={confirmAddGraphTemplate}>确认</button>
            </div>
          </section>
        </div>
      )}
      {layerDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setLayerDialogOpen(false)}>
          <section className="layer-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layer-dialog-title">
            <div className="image-picker-title">
              <div>
                <h2 id="layer-dialog-title">图层管理</h2>
                <p>管理模型图层的显示、顺序和激活状态。新建或拖入的图元默认进入当前激活图层。</p>
              </div>
              <button type="button" onClick={() => setLayerDialogOpen(false)}>关闭</button>
            </div>
            <div className="layer-dialog-status">
              <span>激活图层</span>
              <strong>{activeLayer?.name ?? "默认图层"}</strong>
            </div>
            {renderLayerManager()}
          </section>
        </div>
      )}
      {layerAssignmentDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setLayerAssignmentDialogOpen(false)}>
          <section className="layer-assignment-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layer-assignment-title">
            <div className="image-picker-title">
              <div>
                <h2 id="layer-assignment-title">图层修改</h2>
                <p>当前选中 {activeSelectedNodeIds.length} 个图元。选择目标图层后，确认应用到这些图元。</p>
              </div>
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>关闭</button>
            </div>
            <label className="layer-assignment-field">
              <span>目标图层</span>
              <select
                value={layerAssignmentTargetId}
                onChange={(event) => setLayerAssignmentTargetId(event.target.value)}
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.visible ? layer.name : `${layer.name}（隐藏）`}
                  </option>
                ))}
              </select>
            </label>
            <p className="layer-assignment-note">如果目标图层处于隐藏状态，应用后这些图元会按图层显示规则从画布上隐藏。</p>
            <div className="image-picker-actions layer-assignment-actions">
              <button type="button" onClick={() => setLayerAssignmentDialogOpen(false)}>取消</button>
              <button
                type="button"
                onClick={applyLayerAssignmentDialog}
                disabled={activeSelectedNodeIds.length === 0 || !layers.some((layer) => layer.id === layerAssignmentTargetId) || layerAssignmentUnchanged}
              >
                应用
              </button>
            </div>
          </section>
        </div>
      )}
      {ENABLE_REACT_FLOW_PREVIEW && ReactFlowPreview && reactFlowPreviewOpen && (
        <div className="image-picker-backdrop react-flow-preview-backdrop" onPointerDown={() => setReactFlowPreviewOpen(false)}>
          <section className="react-flow-preview-dialog" onPointerDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="react-flow-preview-title">
            <div className="image-picker-title">
              <div>
                <h2 id="react-flow-preview-title">React Flow 预览</h2>
                <p>开发态验证入口：仅展示当前可见模型，主画布、拓扑、布线和导出逻辑保持不变。</p>
              </div>
              <button type="button" onClick={() => setReactFlowPreviewOpen(false)}>关闭</button>
            </div>
            <div className="react-flow-preview-stage">
              <Suspense fallback={<div className="react-flow-preview-loading">正在加载 React Flow 预览...</div>}>
                <ReactFlowPreview nodes={visibleNodes} edges={visibleEdges} />
              </Suspense>
            </div>
          </section>
        </div>
      )}
      {colorPaletteDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setColorPaletteDialogOpen(false)}>
          <section className="color-palette-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>配色设置</h2>
                <p>配置能流类型和电压等级颜色，保存后用于图元、端子、联络线和导出图形。</p>
              </div>
              <button onClick={() => setColorPaletteDialogOpen(false)}>关闭</button>
            </div>
            <div className="color-palette-tabs" role="tablist" aria-label="配色方式">
              <button
                className={colorPaletteTab === "energy" ? "active" : ""}
                onClick={() => {
                  setColorPaletteTab("energy");
                  toggleColorDisplayMode("energy");
                }}
                type="button"
              >
                按能流类型
              </button>
              <button
                className={colorPaletteTab === "voltage" ? "active" : ""}
                onClick={() => {
                  setColorPaletteTab("voltage");
                  toggleColorDisplayMode("voltage");
                }}
                type="button"
              >
                按电压等级
              </button>
            </div>
            {colorPaletteTab === "energy" ? (
              <div className="color-palette-table" aria-label="能流类型配色">
                {ENERGY_COLOR_ROWS.map((row) => {
                  const color = colorPaletteDraft.energy[row.type] ?? DEFAULT_COLOR_PALETTE.energy[row.type];
                  return (
                    <label className="color-palette-row" key={row.type}>
                      <span>{row.label}</span>
                      <input
                        type="color"
                        value={color.startsWith("#") ? color : DEFAULT_COLOR_PALETTE.energy[row.type]}
                        onChange={(event) => updateEnergyColor(row.type, event.target.value)}
                        aria-label={`${row.label}颜色`}
                      />
                      <input
                        value={color}
                        onChange={(event) => updateEnergyColor(row.type, event.target.value)}
                        aria-label={`${row.label}颜色值`}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="voltage-color-panel">
                <div className="voltage-color-toolbar" role="group" aria-label="电压等级显示范围">
                  <button
                    type="button"
                    className={voltageColorVisibility === "all" ? "active" : ""}
                    onClick={() => setVoltageColorVisibility("all")}
                  >
                    全部电压等级
                  </button>
                  <button
                    type="button"
                    className={voltageColorVisibility === "current" ? "active" : ""}
                    onClick={() => setVoltageColorVisibility("current")}
                  >
                    当前模型电压等级
                  </button>
                  <span>{`当前模型 ${currentModelVoltageColorKeys.size} 项`}</span>
                </div>
                <div className="voltage-color-header">
                  <span>AC/DC</span>
                  <span>电压基值</span>
                  <span>颜色</span>
                  <span>操作</span>
                </div>
                <div className="voltage-color-list">
                  {visibleVoltageColorRows.length > 0 ? (
                    visibleVoltageColorRows.map((row) => (
                      <div className="voltage-color-row" key={row.key}>
                        <select
                          value={row.type}
                          onChange={(event) => updateVoltageColorRow(row.key, { type: event.target.value as "ac" | "dc" })}
                          aria-label="AC/DC"
                        >
                          {ELECTRIC_COLOR_TYPES.map((type) => (
                            <option key={type} value={type}>{ELECTRIC_COLOR_TYPE_LABELS[type]}</option>
                          ))}
                        </select>
                        <input
                          value={row.voltage}
                          onChange={(event) => updateVoltageColorRow(row.key, { voltage: event.target.value })}
                          aria-label="电压基值"
                        />
                        <div className="color-field">
                          <input
                            type="color"
                            value={row.color.startsWith("#") ? row.color : "#64748b"}
                            onChange={(event) => updateVoltageColorRow(row.key, { color: event.target.value })}
                            aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色`}
                          />
                          <input
                            value={row.color}
                            onChange={(event) => updateVoltageColorRow(row.key, { color: event.target.value })}
                            aria-label={`${row.type.toUpperCase()} ${row.voltage}颜色值`}
                          />
                        </div>
                        <button type="button" onClick={() => deleteVoltageColorRow(row.key)}>删除</button>
                      </div>
                    ))
                  ) : (
                    <div className="voltage-color-empty">当前模型暂无交流/直流电压等级。</div>
                  )}
                </div>
                {voltageColorVisibility === "all" && (
                  <button type="button" className="secondary-action" onClick={addVoltageColorRow}>新增电压等级</button>
                )}
              </div>
            )}
            <div className="image-picker-actions color-palette-actions">
              <button type="button" onClick={colorPaletteTab === "energy" ? resetEnergyColors : resetVoltageColors}>
                {colorPaletteTab === "energy" ? "恢复默认能流配色" : "恢复默认电压配色"}
              </button>
              <button type="button" onClick={saveColorPalette}>保存</button>
            </div>
          </section>
        </div>
      )}
      {deviceDefinitionDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setDeviceDefinitionDialogOpen(false)}>
          <section className="device-definition-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>修改元件</h2>
                <p>查看内置和自定义元件定义，维护新建图元时使用的设备属性。</p>
              </div>
              <button onClick={() => setDeviceDefinitionDialogOpen(false)}>关闭</button>
            </div>
            <div className="device-definition-layout">
              <aside className="device-definition-list" aria-label="元件定义列表">
                {attributeLibraries.map((group) => {
                  const templates = groupedAttributeLibrary[group] ?? [];
                  if (templates.length === 0) {
                    return null;
                  }
                  const expanded = expandedDefinitionGroups.includes(group);
                  return (
                    <section className="device-definition-group" key={group}>
                      <button
                        type="button"
                        className="device-definition-group-toggle"
                        aria-expanded={expanded}
                        onClick={() => toggleDefinitionGroup(group)}
                      >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>{group}</span>
                        <strong>{templates.length}</strong>
                      </button>
                      {expanded && (
                        <div className="component-definition-type-list" role="group" aria-label={`${group}元件类型列表`}>
                          {(groupedAttributeLibraryByComponentType[group] ?? []).map((typeGroup) => (
                            <section className="component-definition-type-group" key={`${group}-${typeGroup.section}`}>
                              <div className="component-definition-type-header">
                                <span>{typeGroup.section}</span>
                                <strong>{typeGroup.templates.length}</strong>
                              </div>
                              <div className="device-definition-items" role="group" aria-label={`${group}/${typeGroup.section}元件列表`}>
                                {typeGroup.templates.map((template) => (
                                  <button
                                    type="button"
                                    key={template.kind}
                                    className={`device-definition-item ${selectedDefinitionTemplate?.kind === template.kind ? "active" : ""}`}
                                    onClick={() => loadDefinitionTemplateDraft(template)}
                                  >
                                    <span>{template.label}</span>
                                    <small>{template.kind}</small>
                                  </button>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </aside>
              <section className="device-definition-detail">
                {selectedDefinitionTemplate ? (
                  <>
                    <div className="device-definition-summary">
                      <div>
                        <span>元件名称</span>
                        <strong>{selectedDefinitionTemplate.label}</strong>
                      </div>
                      <div>
                        <span>图元类型</span>
                        <strong>{selectedDefinitionTemplate.kind}</strong>
                      </div>
                      <div>
                        <span>属性库</span>
                        <strong>{normalizeAttributeLibraryName(selectedDefinitionTemplate.attributeLibrary)}</strong>
                      </div>
                      <div>
                        <span>来源</span>
                        <strong>{selectedDefinitionTemplate.custom ? "自定义" : "内置"}</strong>
                      </div>
                      <div>
                        <span>端子数量</span>
                        <strong>{selectedDefinitionTemplate.terminalCount}</strong>
                      </div>
                      <div>
                        <span>是否容器</span>
                        <strong>{selectedDefinitionTemplate.isContainer ? "是" : "否"}</strong>
                      </div>
                      <div>
                        <span>能源属性</span>
                        <strong>
                          {(selectedDefinitionTemplate.terminalTypes ?? Array.from({ length: selectedDefinitionTemplate.terminalCount }, () => selectedDefinitionTemplate.terminalType))
                            .map((type) => TERMINAL_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type)
                            .join(" / ") || "无端子"}
                        </strong>
                      </div>
                      <div>
                        <span>默认尺寸</span>
                        <strong>{selectedDefinitionTemplate.size.width} x {selectedDefinitionTemplate.size.height}</strong>
                      </div>
                      <div>
                        <span>定义状态</span>
                        <strong>{deviceDefinitionOverrides[selectedDefinitionTemplate.kind]?.updatedAt ? "已自定义" : "默认"}</strong>
                      </div>
                      <div>
                        <span>元件类型</span>
                        <select
                          className={sourceSelectClassName(isBuiltInComponentType(definitionDraftSection))}
                          value={definitionDraftSection}
                          onChange={(event) => {
                            setDefinitionDraftSection(event.target.value);
                            setDefinitionDraftError("");
                          }}
                        >
                          {definitionAttributeLibraryComponentTypeOptions.map((section) => (
                            <option
                              key={section}
                              value={section}
                              className={componentTypeOptionClass(section)}
                              title={isBuiltInComponentType(section) ? "系统内置元件类型，无法删除" : "用户自定义元件类型，可以删除"}
                            >
                              {section}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selectedDefinitionTemplate.isContainer && selectedDefinitionTerminalAssociations.length > 0 && (
                      <section className="device-definition-associations">
                        <div className="device-definition-section-title">
                          <h3>端子关联信息</h3>
                          <span>{selectedDefinitionTerminalAssociations.length} 个端子</span>
                        </div>
                        <div className="custom-param-table-wrap compact-table-wrap">
                          <table className="custom-param-table">
                            <thead>
                              <tr>
                                <th>端子</th>
                                <th>能源属性</th>
                                <th>关联对象</th>
                                <th>关联字段</th>
                                <th>说明</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDefinitionTerminalAssociations.map((association) => (
                                <tr key={`${selectedDefinitionTemplate.kind}-terminal-${association.terminalIndex}`}>
                                  <td>{association.terminalLabel}</td>
                                  <td>{TERMINAL_TYPE_OPTIONS.find((option) => option.value === association.terminalType)?.label ?? association.terminalType}</td>
                                  <td>{association.deviceModel ? `${association.roleLabel} / ${association.deviceModel}` : association.roleLabel}</td>
                                  <td><code>{association.relationKey || "-"}</code></td>
                                  <td>
                                    {association.dependent
                                      ? `随端子${association.sourceTerminalIndex + 1}分配到同一个关联设备`
                                      : association.relationName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                    {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
                    <div className="custom-param-table-wrap device-definition-table-wrap">
                      <table className="custom-param-table">
                        <thead>
                          <tr>
                            <th>中文名称</th>
                            <th>英文名称</th>
                            <th>取值类型</th>
                            <th>典型取值</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {definitionDraftRows.map((row) => (
                            <tr key={row.id} className={row.readonly ? "readonly-row" : ""}>
                              <td>
                                <input
                                  value={row.cnName}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { cnName: event.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  value={row.enName}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { enName: event.target.value })}
                                />
                              </td>
                              <td>
                                <select
                                  value={row.valueType}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { valueType: event.target.value as DeviceParameterValueType })}
                                >
                                  {PARAM_VALUE_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  value={row.typicalValue}
                                  disabled={row.readonly}
                                  onChange={(event) => updateDefinitionDraftRow(row.id, { typicalValue: event.target.value })}
                                />
                              </td>
                              <td>
                                <div className="custom-param-actions">
                                  <button type="button" onClick={() => deleteDefinitionDraftRow(row.id)} disabled={row.readonly}>
                                    删除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="custom-device-actions">
                      <button type="button" onClick={addDefinitionDraftRow}>新增参数</button>
                      <button type="button" onClick={saveDeviceDefinitionDraft}>保存定义</button>
                      <button type="button" onClick={resetDeviceDefinitionDraft} disabled={!selectedDefinitionBaseTemplate}>
                        恢复默认
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state compact">
                    <Grid2X2 size={24} />
                    <p>当前属性库暂无元件。</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
      {customDeviceDialogOpen && (
        <div className="image-picker-backdrop" onPointerDown={() => setCustomDeviceDialogOpen(false)}>
          <section className="custom-device-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>新建元件</h2>
                <p>定义后会出现在左侧图元库，可拖拽到画布建模。</p>
              </div>
              <button onClick={() => setCustomDeviceDialogOpen(false)}>关闭</button>
            </div>
            {customDeviceDraft.error && <p className="custom-device-error">{customDeviceDraft.error}</p>}
            <div className="custom-device-dialog-layout">
              {renderCustomComponentManagerTree()}
              <div className="custom-device-editor-panel">
            <div className="custom-device-form-grid">
              <label className="custom-attribute-library-field">
                <span>属性库类型</span>
                <div className="custom-attribute-library-select-row single-control">
                  <select
                    className={sourceSelectClassName(isBuiltInAttributeLibrary(customDeviceDraft.attributeLibraryName))}
                    value={customDeviceDraft.attributeLibraryName}
                    onChange={(event) => selectCustomAttributeLibrary(event.target.value)}
                  >
                    {selectableAttributeLibraries.map((group) => (
                      <option
                        key={group}
                        value={group}
                        className={attributeLibraryOptionClass(group)}
                        title={isBuiltInAttributeLibrary(group) ? "系统内置属性库，无法删除" : "用户自定义属性库，可以删除"}
                      >
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="custom-component-type-field">
                <span>元件类型</span>
                <div className="custom-attribute-library-select-row single-control">
                  <select
                    className={sourceSelectClassName(isBuiltInComponentType(customDeviceDraft.componentType))}
                    value={customDeviceDraft.componentType}
                    onChange={(event) => selectCustomComponentType(customDeviceDraft.attributeLibraryName, event.target.value)}
                  >
                    {currentAttributeLibraryComponentTypeOptions.map((section) => (
                      <option
                        key={section}
                        value={section}
                        className={componentTypeOptionClass(section)}
                        title={isBuiltInComponentType(section) ? "系统内置元件类型，无法删除" : "用户自定义元件类型，可以删除"}
                      >
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                元件名称
                <input
                  value={customDeviceDraft.componentName}
                  placeholder="例如 水电、核电、风电、光伏"
                  onChange={(event) => setCustomDeviceDraft((current) => ({ ...current, componentName: event.target.value, error: "" }))}
                />
              </label>
              <label>
                是否容器
                <select
                  value={customDeviceDraft.isContainer ? "1" : "0"}
                  onChange={(event) =>
                    setCustomDeviceDraft((current) => ({
                      ...current,
                      isContainer: event.target.value === "1",
                      error: ""
                    }))
                  }
                >
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              <label>
                端子数量
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={customDeviceDraft.terminalCount}
                  onChange={(event) => updateCustomDraftTerminalCount(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="custom-device-image-row">
              <span>背景照片</span>
              <button type="button" onClick={() => customDeviceImageInputRef.current?.click()}>选择本地图片</button>
              <button
                type="button"
                onClick={() =>
                  setCustomDeviceDraft((current) => ({
                    ...current,
                    backgroundImage: generateCustomDeviceImage(
                      current.componentName.trim() || current.componentType || "Unit",
                      current.terminalTypes.slice(0, current.terminalCount)
                    ),
                    error: ""
                  }))
                }
              >
                程序自动生成
              </button>
              <button type="button" onClick={() => setCustomDeviceDraft((current) => ({ ...current, backgroundImage: "", error: "" }))}>清除</button>
              <strong>{customDeviceDraft.backgroundImage ? "已设置" : "未设置"}</strong>
            </div>
            <div className="custom-device-preview">
              <span>背景预览</span>
              <div>
                <img src={customDevicePreviewImage} alt="自定义元件背景图片预览" />
              </div>
              <small>{customDeviceDraft.backgroundImage ? "当前显示本地图片预览" : "当前显示默认样例预览"}</small>
            </div>
            <div className="custom-terminal-grid">
              {Array.from({ length: customDeviceDraft.terminalCount }).map((_, index) => {
                const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
                const terminalAssociations = normalizeContainerTerminalAssociations(
                  terminalTypes,
                  customDeviceDraft.terminalAssociations,
                  customDeviceDraft.terminalCount
                );
                const associationSourceIndex = getContainerTerminalAssociationSourceIndex(terminalAssociations, index);
                const associationDependent = customDeviceDraft.isContainer && isContainerTerminalAssociationDependent(terminalAssociations, index);
                const terminalType = customDeviceDraft.terminalTypes[index] ?? "ac";
                const associationOptions = CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[terminalType];
                return (
                  <label key={index} className={associationDependent ? "custom-terminal-dependent" : ""}>
                    {`端子${index + 1}能源属性`}
                    <select
                      value={terminalType}
                      disabled={associationDependent}
                      onChange={(event) =>
                        setCustomDeviceDraft((current) => {
                          const terminalTypes = [...current.terminalTypes];
                          terminalTypes[index] = event.target.value as TerminalType;
                          const terminalAssociations = [...current.terminalAssociations];
                          if (current.isContainer) {
                            if (isDoubleContainerTerminalAssociation(terminalAssociations[index]) && index + 1 < current.terminalCount) {
                              terminalAssociations[index + 1] = defaultContainerAssociationForTerminalType(terminalTypes[index + 1] ?? "ac");
                            }
                            terminalAssociations[index] = defaultContainerAssociationForTerminalType(terminalTypes[index]);
                          }
                          return {
                            ...current,
                            terminalTypes,
                            terminalAssociations: normalizeContainerTerminalAssociations(
                              terminalTypes.slice(0, current.terminalCount),
                              terminalAssociations,
                              current.terminalCount
                            ),
                            error: ""
                          };
                        })
                      }
                    >
                      {TERMINAL_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {customDeviceDraft.isContainer && (
                      <>
                        <span>关联设备</span>
                        <select
                          value={associationDependent ? "" : terminalAssociations[index] || defaultContainerAssociationForTerminalType(terminalType)}
                          disabled={associationDependent}
                          onChange={(event) =>
                            setCustomDeviceDraft((current) => {
                              const selectedAssociation = event.target.value as ContainerTerminalAssociationType;
                              if (isDoubleContainerTerminalAssociation(selectedAssociation) && index + 1 >= current.terminalCount) {
                                const message = `端子${index + 1}是最后一个端子，不能设置为双端热源/热荷。`;
                                window.alert(message);
                                return { ...current, error: message };
                              }
                              const terminalTypes = [...current.terminalTypes];
                              const terminalAssociations = [...current.terminalAssociations];
                              const previousAssociation = terminalAssociations[index];
                              terminalAssociations[index] = selectedAssociation;
                              if (isDoubleContainerTerminalAssociation(selectedAssociation) && index + 1 < current.terminalCount) {
                                terminalTypes[index + 1] = terminalTypes[index] ?? "heat";
                                terminalAssociations[index + 1] = "";
                              } else if (isDoubleContainerTerminalAssociation(previousAssociation) && index + 1 < current.terminalCount) {
                                terminalAssociations[index + 1] = defaultContainerAssociationForTerminalType(terminalTypes[index + 1] ?? "ac");
                              }
                              return {
                                ...current,
                                terminalTypes,
                                terminalAssociations: normalizeContainerTerminalAssociations(
                                  terminalTypes.slice(0, current.terminalCount),
                                  terminalAssociations,
                                  current.terminalCount
                                ),
                                error: ""
                              };
                            })
                          }
                        >
                          {associationDependent && <option value="">随上一个端子关联同一个双端元件</option>}
                          {associationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {associationDependent && <small>{`随端子${associationSourceIndex + 1}分配到同一个双端元件，关联属性为空。`}</small>}
                      </>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="custom-param-table-wrap">
              <table className="custom-param-table">
                <thead>
                  <tr>
                    <th>中文名称</th>
                    <th>英文名称</th>
                    <th>取值类型</th>
                    <th>典型取值</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customDraftDefaultParams.map((row) => (
                    <tr key={`default-${row.enName}`} className="readonly-row">
                      <td>{row.cnName}</td>
                      <td>{row.enName}</td>
                      <td>{PARAM_VALUE_TYPE_OPTIONS.find((option) => option.value === row.valueType)?.label ?? row.valueType}</td>
                      <td>{row.typicalValue}</td>
                      <td>默认</td>
                    </tr>
                  ))}
                  {customDeviceDraft.params.map((row, index) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          value={row.cnName}
                          onChange={(event) =>
                            setCustomDeviceDraft((current) => ({
                              ...current,
                              params: current.params.map((item) => (item.id === row.id ? { ...item, cnName: event.target.value } : item)),
                              error: ""
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={row.enName}
                          onChange={(event) =>
                            setCustomDeviceDraft((current) => ({
                              ...current,
                              params: current.params.map((item) => (item.id === row.id ? { ...item, enName: event.target.value } : item)),
                              error: ""
                            }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={row.valueType}
                          onChange={(event) =>
                            setCustomDeviceDraft((current) => ({
                              ...current,
                              params: current.params.map((item) => (item.id === row.id ? { ...item, valueType: event.target.value as DeviceParameterValueType } : item)),
                              error: ""
                            }))
                          }
                        >
                          {PARAM_VALUE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={row.typicalValue}
                          onChange={(event) =>
                            setCustomDeviceDraft((current) => ({
                              ...current,
                              params: current.params.map((item) => (item.id === row.id ? { ...item, typicalValue: event.target.value } : item)),
                              error: ""
                            }))
                          }
                        />
                      </td>
                      <td>
                        <div className="custom-param-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomDeviceDraft((current) => {
                                if (index === 0) return current;
                                const params = [...current.params];
                                [params[index - 1], params[index]] = [params[index], params[index - 1]];
                                return { ...current, params };
                              })
                            }
                            disabled={index === 0}
                          >
                            上移
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomDeviceDraft((current) => {
                                if (index >= current.params.length - 1) return current;
                                const params = [...current.params];
                                [params[index + 1], params[index]] = [params[index], params[index + 1]];
                                return { ...current, params };
                              })
                            }
                            disabled={index >= customDeviceDraft.params.length - 1}
                          >
                            下移
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomDeviceDraft((current) => ({ ...current, params: current.params.filter((item) => item.id !== row.id) }))}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="custom-device-actions">
              <button
                type="button"
                onClick={() =>
                  setCustomDeviceDraft((current) => ({
                    ...current,
                    params: [
                      ...current.params,
                      { id: customParamId(), cnName: "", enName: "", valueType: "string", typicalValue: "" }
                    ]
                  }))
                }
              >
                新增参数
              </button>
              <button type="button" onClick={saveCustomDeviceTemplate}>保存自定义设备</button>
            </div>
              </div>
            </div>
          </section>
        </div>
      )}
      {imageTarget && (
        <div className="image-picker-backdrop" onPointerDown={() => setImageTarget(null)}>
          <section className="image-picker-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <div className="image-picker-title">
              <div>
                <h2>{imageTarget.kind === "canvas" ? "选择模型背景图片" : imageTarget.kind === "nodeForeground" ? "选择设备前景图片" : "选择设备图片"}</h2>
                <p>本地图片会先上传到后台图片库；请再从后台可用图片列表中选择应用。</p>
              </div>
              <button onClick={() => setImageTarget(null)}>关闭</button>
            </div>
            <div className="image-picker-actions">
              <select value={activeImageFolderId} onChange={(event) => setActiveImageFolderId(event.target.value)}>
                {imageFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}{typeof folder.imageCount === "number" ? ` (${folder.imageCount})` : ""}
                  </option>
                ))}
              </select>
              <button onClick={createImageFolder}>新建文件夹</button>
              <button onClick={renameImageFolder} disabled={activeImageFolderId === "root"}>重命名</button>
              <button onClick={deleteImageFolder} disabled={activeImageFolderId === "root"}>删除文件夹</button>
              <button onClick={() => imageInputRef.current?.click()}>上传本地图片到后台</button>
              <button onClick={clearSelectedImage}>取消当前图片</button>
            </div>
            <div className="image-asset-list">
              {imageAssetList.length === 0 ? (
                <p className="image-empty">后台暂无图片，请先加载本地图片。</p>
              ) : (
                imageAssetList.map((asset, index) => (
                  <button key={asset.id} className="image-asset-option" onClick={() => applyExistingImage(asset.id)}>
                    <img src={imageAssets[asset.id] ?? asset.url} alt={asset.name || `后台图片 ${index + 1}`} />
                    <span>{asset.name || `后台图片 ${index + 1}`}</span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


